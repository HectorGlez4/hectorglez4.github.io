import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  ATESTIGUADA,
  citaValida,
  conLaPuertaAbierta,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { recorrerElementos, type Elemento } from './ayuda/enlaces.js';
import { componerDocumento, nombreDeDocumento } from '../../tools/lib/documento.ts';
import { CITAS_POR_PAGINA, MAX_OBRAS_ANTES_DE_LAS_CITAS, MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';

/**
 * Historia 36.1 — los paneles de la Página de Cita y de la de Autor (DESIGN.md v9.3, «Fichas»).
 *
 * Dos partes:
 *
 *   · **Los tokens**: `tokens.css` declara cada token nuevo una vez y con el valor del frontmatter
 *     de DESIGN.md, leído con `yaml`, no copiado aquí.
 *   · **Una construcción**: un Corpus con una Cita completa (Obra de 8 con pasaje, «Cómo citar»,
 *     «Más de», Temas publicados), una sin Obra, una atribuida y un Autor de más de una página,
 *     con Lista de Obras plegada y Citas sin obra. De `dist/` se lee qué bloque cae en qué
 *     `div.panel.{familia}`, en qué orden, que ningún panel es región ni lleva zona, y que fuera
 *     de la Página de Cita y de la de Autor no hay ninguno.
 */

const DESIGN = '_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md';

/** El nombre CSS de cada token nuevo de la v9.3, por su nombre en el frontmatter. */
const COLORES: Record<string, string> = {
  'primary-container': '--contenedor-obra',
  'on-primary-container': '--sobre-contenedor-obra',
  'obra-outline-variant': '--filete-obra',
  'autor-container': '--contenedor-autor',
  'on-autor-container': '--sobre-contenedor-autor',
  'autor-outline-variant': '--filete-autor',
  'tema-container': '--contenedor-tema',
  'on-tema-container': '--sobre-contenedor-tema',
  'tema-outline': '--contorno-tema',
  'ficha-outline-variant': '--filete-ficha',
};
const RADIOS: Record<string, string> = { ficha: '--radio-ficha', panel: '--radio-panel' };

describe('Historia 36.1 — los tokens de la v9.3 en `tokens.css`', () => {
  it('cada token nuevo, una sola vez y con el valor del frontmatter de DESIGN.md', async () => {
    const design = await readFile(join(RAIZ, DESIGN), 'utf8');
    const frontmatter = parse(/^---\n([\s\S]*?)\n---/u.exec(design)![1]) as {
      colors: Record<string, string>;
      rounded: Record<string, string>;
    };
    const css = (await readFile(join(RAIZ, 'src/styles/tokens.css'), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
    const declaraciones = (nombre: string) => [...css.matchAll(new RegExp(`(?<![\\w-])${nombre}\\s*:\\s*([^;]+);`, 'g'))].map((m) => m[1].trim());
    for (const [clave, nombre] of Object.entries(COLORES)) {
      expect(declaraciones(nombre), nombre).toEqual([frontmatter.colors[clave].toLowerCase()]);
    }
    for (const [clave, nombre] of Object.entries(RADIOS)) {
      expect(declaraciones(nombre), nombre).toEqual([frontmatter.rounded[clave]]);
    }
    // `quote-xs` ya estaba: 17px, con su interlineado.
    expect(declaraciones('--cita-xs')).toEqual(['17px']);
    expect(declaraciones('--interlineado-cita-xs')).toEqual(['1.45']);
  });

  it('ni el panel ni lo que la historia viste nombran `secondary`, un hexadecimal ni una sombra', async () => {
    for (const fichero of [
      'src/components/PanelDeBloque.astro',
      'src/components/TarjetaDeCita.astro',
      'src/components/TarjetaDeObra.astro',
      'src/components/RutasDeSalida.astro',
      'src/pages/cita/[slug].astro',
      'src/pages/autor/[slug]/[...page].astro',
    ]) {
      const fuente = await readFile(join(RAIZ, fichero), 'utf8');
      expect(fuente, fichero).not.toMatch(/secondary|#[0-9a-f]{3,8}\b|box-shadow/i);
    }
  });
});

// ─── La construcción ─────────────────────────────────────────────────────────

const WS = 'https://es.wikisource.org/wiki/';
const BREVEDAD = 'Sobre la brevedad de la vida';
const OTRAS_OBRAS = ['Cartas a Lucilio', 'Sobre la vida feliz', 'De la ira', 'De la clemencia'];
const SIN_OBRA = 'seneca-mientras-esperamos-vivir-la-vida-pasa';
const COMPLETA = 'seneca-brevedad-0';

const AUTOR_VIVO = `nombre: "Autora Viva"
vivo: true
semblanza: "Escritora de hoy."
ordenAlfabetico: "Viva"
`;
const PERSONAJE = `nombre: "Personaje Uno"
universo: "Universo de prueba"
ordenAlfabetico: "Personaje Uno"
`;
const ATRIBUIDA = 'vivo-personaje-uno-dice-del-rio';
/** Una Cita sin ninguna Ruta de salida: Autor de una sola Cita, de una Obra de una, sin Temas. */
const SIN_RUTAS = 'antonio-machado-soledades-0';
const MACHADO =
  'nombre: Antonio Machado\nañoNacimiento: 1875\nañoFallecimiento: 1939\nsemblanza: Poeta sevillano de la generación del 98.\nordenAlfabetico: Machado\n';

function corpus(): Record<string, string> {
  const c: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'autores/vivo.yml': AUTOR_VIVO,
    'autores/antonio-machado.yml': MACHADO,
    'personajes/uno.yml': PERSONAJE,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'pendientes-de-cotejo.yml': `citas:\n  - ${SIN_OBRA}\n`,
  };
  /** `n` Citas cotejadas de una Obra de Séneca, cada una en un párrafo con algo antes y después: tienen pasaje. */
  const sembrar = (clave: string, titulo: string, n: number) => {
    const url = `${WS}${titulo.replaceAll(' ', '_')}`;
    const parrafos: string[] = [];
    for (let i = 0; i < n; i += 1) {
      const texto = `${clave} ${i}: una sentencia distinta para cada número, la ${i}`;
      parrafos.push(`Antes dice otra cosa. ${texto}, y luego sigue el párrafo hasta acabar.`);
      c[`citas/seneca--${clave}-${i}.md`] = citaValida({
        slug: `seneca-${clave}-${i}`,
        texto,
        temas: ['el-tiempo'],
        procedencia: { obra: titulo, año: 50 },
        fuente: { id: 'wikisource-es', url },
      });
    }
    c[`fuentes/${nombreDeDocumento('wikisource-es', titulo)}.txt`] = componerDocumento(
      { fuente: 'wikisource-es', obra: titulo, url, recuperado: '2026-11-15', lineas: 'prosa-ajustada' },
      titulo,
      parrafos.join('\n\n'),
    );
  };
  sembrar('brevedad', BREVEDAD, 8);
  // Más de una página de Autor, y más Obras de las que caben antes del pliegue.
  const resto = CITAS_POR_PAGINA + 1 - 8;
  OTRAS_OBRAS.forEach((titulo, i) => {
    const clave = ['cartas', 'feliz', 'ira', 'clemencia'][i];
    sembrar(clave, titulo, i === 0 ? resto - (OTRAS_OBRAS.length - 1) : 1);
  });
  c['citas/seneca--sin-obra.md'] = citaValida({
    slug: SIN_OBRA,
    texto: 'Mientras esperamos vivir, la vida pasa.',
    procedencia: { referencia: 'Carta 1' },
    fuente: undefined,
  });
  {
    const url = `${WS}Soledades`;
    const texto = 'Caminante, no hay camino, se hace camino al andar con cada paso';
    c['citas/antonio-machado--soledades-0.md'] = citaValida({
      slug: SIN_RUTAS,
      autor: 'antonio-machado',
      texto,
      temas: [],
      procedencia: { obra: 'Soledades', año: 1903 },
      fuente: { id: 'wikisource-es', url },
    });
    c[`fuentes/${nombreDeDocumento('wikisource-es', 'Soledades')}.txt`] = componerDocumento(
      { fuente: 'wikisource-es', obra: 'Soledades', url, recuperado: '2026-11-15' },
      'Soledades',
      texto,
    );
  }
  // Con el censo en el fixture el andamio no siembra documentos: las dos atribuidas llevan el suyo.
  const atribuida = (slug: string, texto: string, obra: string, año: number) => {
    const url = `${WS}${obra.replaceAll(' ', '_')}`;
    c[`citas/${slug.replace(/^vivo-/u, 'vivo--')}.md`] = citaValida({
      texto,
      slug,
      autor: 'vivo',
      personaje: 'uno',
      clase: 'atribuida',
      temas: ['el-tiempo'],
      estadoDerechos: undefined,
      ...ATESTIGUADA,
      procedencia: { obra, año },
      fuente: { id: 'wikisource-es', url },
    });
    c[`fuentes/${nombreDeDocumento('wikisource-es', obra)}.txt`] = componerDocumento(
      { fuente: 'wikisource-es', obra, url, recuperado: '2026-11-15' },
      obra,
      texto,
    );
  };
  atribuida(ATRIBUIDA, 'El río no vuelve a pasar por la misma piedra dos veces seguidas.', 'Obras de la autora', 2000);
  atribuida('vivo-personaje-uno-otra-del-fuego', 'Quien enciende un fuego en la nieve aprende a esperar sin prisa.', 'Otra obra de la autora', 2001);
  return c;
}

/** Lo que interesa de una página, en el orden del marcado, con el panel en que cae. */
interface Bloque {
  que: string;
  panel: string | undefined;
}

const FAMILIAS = ['obra', 'autor', 'tema', 'herramientas'];

/** Los paneles de una página: sus atributos y los bloques que contienen. */
function leer(html: string): { bloques: Bloque[]; paneles: { atributos: ReadonlyMap<string, string>; hijos: number; anidado: boolean }[] } {
  /*
   * El rótulo de cada `<details>`, en el orden del marcado: el texto de su `<summary>` sin
   * etiquetas ni el glifo, sea cual sea el orden de sus atributos. El recorrido cuenta los mismos
   * `<details>` en el mismo orden, y al final se exige que sean tantos como rótulos.
   */
  const rotulos = [...html.matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>/g)].map((m) =>
    m[1]
      .replace(/<span[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>\s*<\/span>/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;|\u00a0/g, ' ')
      .trim(),
  );
  let detalles = 0;
  const bloques: Bloque[] = [];
  const paneles = new Map<Elemento, { atributos: ReadonlyMap<string, string>; hijos: number; anidado: boolean }>();
  const clases = (e: Elemento) => (e.atributos.get('class') ?? '').split(/\s+/);
  const esPanel = (e: Elemento) => e.etiqueta === 'div' && clases(e).includes('panel');
  recorrerElementos(html, (elemento, antepasados) => {
    const enPaneles = antepasados.filter(esPanel);
    const panel = enPaneles.at(-1);
    if (panel !== undefined && antepasados.at(-1) === panel) paneles.get(panel)!.hijos += 1;
    if (esPanel(elemento)) {
      paneles.set(elemento, { atributos: elemento.atributos, hijos: 0, anidado: enPaneles.length > 0 });
      return;
    }
    const familia = panel === undefined ? undefined : FAMILIAS.find((f) => clases(panel).includes(`panel-${f}`));
    const c = clases(elemento);
    let que: string | undefined;
    if (elemento.etiqueta === 'details') que = `desplegable:${rotulos[detalles++]}`;
    else if (elemento.etiqueta === 'figure' && c.includes('bloque')) que = 'cita';
    else if (elemento.etiqueta === 'header' && c.includes('ficha')) que = 'ficha-de-autor';
    else if (elemento.etiqueta === 'section') que = c.find((x) => !x.startsWith('astro-')) ?? 'section';
    else if (elemento.etiqueta === 'ul' && c.includes('listado')) que = 'listado';
    else if (elemento.etiqueta === 'nav' && c.includes('salidas')) que = 'salidas';
    else if (elemento.etiqueta === 'li' && c.includes('tarjeta')) que = 'ficha-de-cita';
    if (que !== undefined) bloques.push({ que, panel: familia });
  });
  expect(detalles, 'cada `<details>` con su rótulo').toBe(rotulos.length);
  return { bloques, paneles: [...paneles.values()] };
}

/** Los bloques sin las Fichas de Cita sueltas: el orden de la página. */
const orden = (bloques: Bloque[]) => bloques.filter((b) => b.que !== 'ficha-de-cita').map((b) => `${b.que}@${b.panel ?? 'papel'}`);

/** Que ningún panel sea región, lleve zona o exención, esté vacío o dentro de otro. */
function panelesSanos(html: string, ruta: string) {
  for (const panel of leer(html).paneles) {
    const nombres = [...panel.atributos.keys()].filter((a) => !a.startsWith('data-astro-cid-'));
    expect(nombres, ruta).toEqual(['class']);
    expect(panel.hijos, `${ruta}: un panel vacío`).toBeGreaterThan(0);
    expect(panel.anidado, `${ruta}: un panel dentro de otro`).toBe(false);
  }
}

describe('Historia 36.1 — qué bloque cae en qué panel, en `dist/`', () => {
  let proyecto = '';
  const html = (ruta: string) => readFile(paginaConstruida(proyecto, ruta), 'utf8');

  beforeAll(async () => {
    expect(MIN_CITAS_POR_TEMA).toBeLessThanOrEqual(CITAS_POR_PAGINA + 3);
    expect(OTRAS_OBRAS.length + 1).toBeGreaterThan(MAX_OBRAS_ANTES_DE_LAS_CITAS);
    const umbrales = (await readFile(join(RAIZ, 'src/lib/umbrales.ts'), 'utf8')).replace(
      /^export const MAX_CARACTERES_DEL_PASAJE: number \| undefined = [^;\n]+;$/mu,
      'export const MAX_CARACTERES_DEL_PASAJE: number | undefined = 400;',
    );
    const r = await construirConCorpus(corpus(), {
      jornada: '2026-11-15',
      ficheros: conLaPuertaAbierta({}, { 'src/lib/umbrales.ts': umbrales }),
    });
    proyecto = r.proyecto;
    expect(r.codigo, r.salida).toBe(0);
  }, 600_000);

  afterAll(async () => {
    if (proyecto !== '') await limpiar(proyecto);
  });

  it('la Cita completa: la Cita y lo suyo sobre el papel, y cada bloque secundario en su panel, en el orden de hoy', async () => {
    const pagina = await html(`/cita/${COMPLETA}/`);
    expect(orden(leer(pagina).bloques)).toEqual([
      'cita@papel',
      'tarjeta-de-obra@obra',
      'desplegable:Lee el pasaje@papel',
      'desplegable:Cómo citar@herramientas',
      'desplegable:Inserta esta cita@herramientas',
      'salidas@papel',
      'de-la-misma-obra@obra',
      'mas-del-autor@autor',
      'temas-de-la-cita@tema',
    ]);
    // Las Fichas de las Rutas, dentro de sus paneles, ninguna sobre el papel.
    const fichas = leer(pagina).bloques.filter((b) => b.que === 'ficha-de-cita');
    expect(fichas.length).toBeGreaterThan(0);
    expect(new Set(fichas.map((b) => b.panel))).toEqual(new Set(['obra', 'autor']));
    panelesSanos(pagina, COMPLETA);
    // El panel no toca la zona: sigue en cada `<li>` y en el `ul` de los chips.
    expect(pagina).toMatch(/<li class="tarjeta"[^>]*data-zona="misma-obra"/);
    expect(pagina).toMatch(/<ul class="chips"[^>]*data-zona="chip-de-tema"/);
    // Las `section` de siempre, con su elemento, su clase y sus atributos.
    expect(pagina).toContain('<section class="tarjeta-de-obra" aria-labelledby="de-la-obra" data-pagefind-ignore="all"');
    expect(pagina).toMatch(/<section class="de-la-misma-obra"/);
  });

  it('la Cita sin Obra: ni panel de la Obra arriba ni «De la misma obra»; lo demás, igual', async () => {
    const pagina = await html(`/cita/${SIN_OBRA}/`);
    const bloques = orden(leer(pagina).bloques);
    expect(bloques.some((b) => b.endsWith('@obra'))).toBe(false);
    expect(bloques).toContain('desplegable:Inserta esta cita@herramientas');
    expect(bloques).toContain('mas-del-autor@autor');
    panelesSanos(pagina, SIN_OBRA);
  });

  it('sin ninguna Ruta de salida: ni `nav` ni panel de las Rutas; la Obra y las herramientas, en los suyos', async () => {
    const pagina = await html(`/cita/${SIN_RUTAS}/`);
    const bloques = orden(leer(pagina).bloques);
    expect(bloques).not.toContain('salidas@papel');
    expect(bloques.filter((b) => b.startsWith('de-la-misma-obra') || b.startsWith('mas-del-autor') || b.startsWith('temas-de-la-cita'))).toEqual([]);
    expect(bloques).toEqual(['cita@papel', 'tarjeta-de-obra@obra', 'desplegable:Cómo citar@herramientas', 'desplegable:Inserta esta cita@herramientas']);
    panelesSanos(pagina, SIN_RUTAS);
  });

  it('la atribuida: el panel de las herramientas solo con «Inserta esta cita», y la línea de retirada sobre el papel', async () => {
    const pagina = await html(`/cita/${ATRIBUIDA}/`);
    const bloques = orden(leer(pagina).bloques);
    expect(bloques.filter((b) => b.endsWith('@herramientas'))).toEqual(['desplegable:Inserta esta cita@herramientas']);
    expect(bloques).not.toContain('desplegable:Cómo citar@herramientas');
    panelesSanos(pagina, ATRIBUIDA);
    // La línea de retirada, fuera de todo panel y tras el pie.
    const retirada = pagina.indexOf('class="linea-de-retirada');
    expect(retirada).toBeGreaterThan(-1);
    const ultimoPanel = pagina.lastIndexOf('class="panel ');
    expect(retirada).toBeGreaterThan(ultimoPanel);
  });

  it('la Página de Autor, página 1: la Ficha en el del Autor y la Lista de Obras, con su pliegue y su pie, en el de la Obra; el listado sobre el papel', async () => {
    const pagina = await html('/autor/seneca/');
    const bloques = leer(pagina).bloques;
    expect(orden(bloques)).toEqual([
      'ficha-de-autor@autor',
      'obras-del-autor@obra',
      expect.stringMatching(/^desplegable:Y \d+ obras? más@obra$/u),
      'listado@papel',
    ]);
    expect(bloques.filter((b) => b.que === 'ficha-de-cita').every((b) => b.panel === undefined)).toBe(true);
    expect(pagina).toMatch(/<div class="panel panel-obra cierre-texto"/);
    expect(pagina).toMatch(/<div class="panel panel-autor cierre-texto"/);
    expect(pagina).toContain('sin obra documentada.');
    panelesSanos(pagina, '/autor/seneca/');
  });

  it('la Página de Autor, página 2: el `h1` sobre el papel y ningún panel', async () => {
    const pagina = await html('/autor/seneca/2/');
    expect(orden(leer(pagina).bloques)).toEqual(['ficha-de-autor@papel', 'listado@papel']);
    expect(pagina).not.toContain('class="panel ');
  });

  it('ninguna otra superficie toma paneles en esta historia: portada, 404, Directorios, Obra, Tema, Personaje…', async () => {
    const dist = join(proyecto, 'dist');
    const paginas: string[] = [];
    const recorrer = async (dir: string) => {
      for (const e of await readdir(dir, { withFileTypes: true })) {
        const ruta = join(dir, e.name);
        if (e.isDirectory()) await recorrer(ruta);
        else if (e.name.endsWith('.html')) paginas.push(relative(dist, ruta));
      }
    };
    await recorrer(dist);
    const ajenas = paginas.filter((p) => !p.startsWith('cita/') && !p.startsWith('autor/'));
    for (const necesaria of ['index.html', '404.html', 'autores/index.html', 'obras/index.html', 'tema/el-tiempo/index.html']) {
      expect(ajenas, necesaria).toContain(necesaria);
    }
    expect(ajenas.some((p) => p.startsWith('obra/'))).toBe(true);
    expect(ajenas.some((p) => p.startsWith('personaje/'))).toBe(true);
    for (const p of ajenas) {
      expect(await readFile(join(dist, p), 'utf8'), p).not.toContain('class="panel ');
    }
  });
});
