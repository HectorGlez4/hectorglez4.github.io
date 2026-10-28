import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { agruparPorClave, directorioDeAutores, directorioDeObras } from '../../src/lib/directorios.ts';
import {
  SUPERFICIES_SIN_SEMBLANZA,
  descripcionDelDirectorioDeObras,
  recuentoDeObras,
} from '../../src/lib/atribucion.ts';
import { datosDeTarjetaDelDirectorioDeObras, svgDeTarjetaDeListado } from '../../src/lib/tarjeta.ts';
import { NOMBRE_DEL_DIRECTORIO_DE_OBRAS, tituloDelDirectorioDeObras } from '../../src/lib/marca.ts';
import {
  TARJETA_DEL_DIRECTORIO_DE_OBRAS,
  rutaDelDirectorioDeObras,
} from '../../src/lib/superficies.ts';
import { obrasDelAutor, ordenDeLaListaDeObras, type Autor, type Cita } from '../../src/lib/publicado.ts';
import type { ObraResuelta } from '../../src/lib/obras.ts';
import { MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS } from '../../src/lib/umbrales.ts';
import tamañoDelDirectorioDeObras, {
  FICHERO_DEL_DIRECTORIO_DE_OBRAS,
  avisoDelDirectorioDeObras,
  bytesDe,
} from '../../integraciones/directorios.ts';
import { componerDocumento } from '../../tools/lib/documento.ts';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { comprobarFiltroEnElHtml } from './ayuda/filtro.js';

/**
 * Historia 26.4 — Todas las Obras, bajo su Autor.
 *
 * Lo puro primero: quién tiene grupo y en qué orden (el del Directorio de Autores), qué Obras
 * lleva cada grupo y en qué orden (el de su Página de Autor, por la misma llamada), los textos con
 * sus singulares, la Tarjeta, lo que lanza y el aviso de tamaño. Después, sobre el `dist/` de una
 * construcción real —y de una segunda con `CONGELACION_DE_OBRAS` puesta—: la página, sus letras,
 * grupos y filas, su declaración, su Tarjeta, que la Obra que no se indexa va igual que las demás
 * y que no reproduce Citas, semblanzas ni notas de ficha.
 */

// ─── Lo puro ─────────────────────────────────────────────────────────────────

const autor = (slug: string, nombre: string, clave: string | undefined): Autor => ({
  slug,
  nombre,
  semblanza: `Semblanza de ${nombre}.`,
  añoFallecimiento: 1900,
  ...(clave === undefined ? {} : { ordenAlfabetico: clave }),
});

function obra(nombre: string, titulo: string, recuento: number, año?: number): ObraResuelta {
  return {
    nombre,
    autor: nombre.split('--')[0],
    titulo,
    ...(año === undefined ? {} : { año }),
    fuentes: [],
    edicionCotejada: false,
    temas: [],
    recuento,
  };
}

let numero = 0;
const cita = (deAutor: string, deObra?: ObraResuelta): Cita => {
  numero += 1;
  return {
    slug: `${deAutor}-cita-${numero}`,
    texto: `Texto ${numero}.`,
    autor: deAutor,
    temas: [],
    procedencia: {},
    aptaParaPortada: false,
    ...(deObra === undefined ? {} : { obra: deObra }),
  };
};

/** `n` Citas de una Obra. */
const de = (deObra: ObraResuelta) => Array.from({ length: deObra.recuento }, () => cita(deObra.autor, deObra));

const BREVEDAD = obra('seneca--sobre-la-brevedad-de-la-vida', 'Sobre la brevedad de la vida', 45, 49);
const CARTAS = obra('seneca--cartas-a-lucilio', 'Cartas a Lucilio', 3, 64);
const IRA = obra('seneca--de-la-ira', 'De la ira', 3);
const PROVIDENCIA = obra('seneca--de-la-providencia', 'De la providencia', 2);
const ENQUIRIDION = obra('epicteto--enquiridion', 'Enquiridión', 1, -50);

const SENECA = autor('seneca', 'Séneca', 'Séneca');
const EPICTETO = autor('epicteto', 'Epicteto', 'Epicteto');
const MACHADO = autor('antonio-machado', 'Antonio Machado', 'Machado');

const CITAS: Cita[] = [
  ...de(IRA),
  ...de(PROVIDENCIA),
  ...de(BREVEDAD),
  ...de(CARTAS),
  cita('seneca'),
  cita('seneca'),
  ...de(ENQUIRIDION),
  cita('antonio-machado'),
];

describe('Historia 26.4 — qué lista el Directorio de Obras, y en qué orden', () => {
  it('agrupa por la inicial de la clave del Autor: E y S, y ni letra ni grupo para el Autor sin Obras', () => {
    const directorio = directorioDeObras([MACHADO, SENECA, EPICTETO], CITAS);
    expect(directorio.grupos.map((g) => [g.inicial, g.ancla, g.entradas.map((a) => a.slug)])).toEqual([
      ['E', 'letra-e', ['epicteto']],
      ['S', 'letra-s', ['seneca']],
    ]);
    const [epicteto] = directorio.grupos[0].entradas;
    expect(epicteto).toMatchObject({ slug: 'epicteto', nombre: 'Epicteto', ruta: '/autor/epicteto/' });
  });

  it('los Autores van en el orden del Directorio de Autores, por la clave y no por el nombre', () => {
    // «Miguel de Cervantes» va en la C aunque su nombre empiece por M, como en `/autores/`.
    const cervantes = autor('miguel-de-cervantes', 'Miguel de Cervantes', 'Cervantes');
    const quijote = obra('miguel-de-cervantes--el-quijote', 'El Quijote', 2);
    const autores = [MACHADO, SENECA, EPICTETO, cervantes];
    const citas = [...CITAS, ...de(quijote), cita('antonio-machado')];
    const deObras = directorioDeObras(autores, citas).grupos.flatMap((g) => g.entradas.map((a) => a.slug));
    const deAutores = directorioDeAutores(autores, citas)
      .grupos.flatMap((g) => g.entradas.map((a) => a.slug))
      .filter((slug) => deObras.includes(slug));
    expect(deObras).toEqual(['miguel-de-cervantes', 'epicteto', 'seneca']);
    expect(deObras).toEqual(deAutores);
  });

  it('las Obras de cada grupo, en el orden de su Página de Autor: la misma llamada', () => {
    const [, seneca] = directorioDeObras([SENECA, EPICTETO, MACHADO], CITAS).grupos;
    const obras = seneca.entradas[0].obras;
    expect(obras.map((o) => o.titulo)).toEqual([
      'Sobre la brevedad de la vida',
      'Cartas a Lucilio',
      'De la ira',
      'De la providencia',
    ]);
    expect(obras).toEqual(obrasDelAutor(CITAS, 'seneca').obras);
  });

  it('cada Obra una vez, y las cifras son las que la página pinta', () => {
    const directorio = directorioDeObras([SENECA, EPICTETO, MACHADO], CITAS);
    const todas = directorio.grupos.flatMap((g) => g.entradas.flatMap((a) => a.obras.map((o) => o.nombre)));
    expect(new Set(todas).size).toBe(todas.length);
    expect(todas).toHaveLength(5);
    expect({ obras: directorio.obras, autores: directorio.autores, citas: directorio.citas }).toEqual({
      obras: 5,
      autores: 2,
      // Las Citas de las Obras listadas, no las 57 publicadas: las que no declaran obra no figuran.
      citas: 54,
    });
  });

  it('un Autor con Obras sin clave lanza nombrando el slug y la orden que la propone', () => {
    const sinClave = autor('epicteto', 'Epicteto', undefined);
    expect(() => directorioDeObras([sinClave], de(ENQUIRIDION))).toThrow(/«epicteto».*Directorio de Obras.*proponer-claves/su);
    // Un Autor sin Obras no hace falta que la tenga: no figura.
    expect(directorioDeObras([autor('antonio-machado', 'Antonio Machado', undefined)], [cita('antonio-machado')]).grupos).toEqual([]);
  });

  it('sin ninguna Obra no hay letras ni grupos, y la descripción dice ceros', () => {
    const vacio = directorioDeObras([MACHADO], [cita('antonio-machado')]);
    expect(vacio).toEqual({ grupos: [], obras: 0, autores: 0, citas: 0 });
    expect(descripcionDelDirectorioDeObras(vacio)).toBe('0 obras de 0 autores, con 0 citas publicadas.');
    expect(directorioDeObras([], [])).toEqual({ grupos: [], obras: 0, autores: 0, citas: 0 });
  });

  it('el ayudante común ordena y agrupa sin mirar el nombre: el de los dos Directorios', () => {
    const grupos = agruparPorClave(
      [autor('b', 'Zeta', 'Beta'), autor('a', 'Alfa', 'Ñu'), autor('c', 'Ce', 'Beta')],
      (a) => a.slug,
    );
    expect(grupos.map((g) => [g.inicial, g.entradas])).toEqual([
      ['B', ['b', 'c']],
      ['Ñ', ['a']],
    ]);
  });
});

describe('Historia 26.4 — ordenDeLaListaDeObras, el único orden de la Lista de Obras', () => {
  it('de más a menos Citas, por título a igualdad y por nombre de ficha al final, sin tocar la entrada', () => {
    const a = obra('seneca--dialogos', 'Diálogos', 2);
    const b = obra('seneca--dialogos-2', 'Diálogos', 2);
    const entrada = [IRA, b, BREVEDAD, a, CARTAS];
    const copia = [...entrada];
    expect(ordenDeLaListaDeObras(entrada).map((o) => o.nombre)).toEqual([
      'seneca--sobre-la-brevedad-de-la-vida',
      'seneca--cartas-a-lucilio',
      'seneca--de-la-ira',
      'seneca--dialogos',
      'seneca--dialogos-2',
    ]);
    expect(entrada).toEqual(copia);
  });
});

describe('Historia 26.4 — los textos del Directorio de Obras', () => {
  it('la meta: «{k} obras de {m} autores, con {n} citas publicadas.»', () => {
    expect(descripcionDelDirectorioDeObras({ obras: 5, autores: 2, citas: 54 })).toBe(
      '5 obras de 2 autores, con 54 citas publicadas.',
    );
    expect(descripcionDelDirectorioDeObras(directorioDeObras([SENECA, EPICTETO, MACHADO], CITAS))).toBe(
      '5 obras de 2 autores, con 54 citas publicadas.',
    );
  });

  it('los singulares son obligatorios: «1 obra de 1 autor, con 1 cita publicada.»', () => {
    const directorio = directorioDeObras([EPICTETO], de(ENQUIRIDION));
    expect(descripcionDelDirectorioDeObras(directorio)).toBe('1 obra de 1 autor, con 1 cita publicada.');
    expect(recuentoDeObras(1)).toBe('1 obra');
    expect(recuentoDeObras(0)).toBe('0 obras');
    expect(recuentoDeObras(517)).toBe('517 obras');
  });

  it('el título de pestaña, el nombre y la Tarjeta: «Obras», en la sans, con su singular', () => {
    expect(tituloDelDirectorioDeObras()).toBe('Obras, por autor | Sabiduría de Bolsillo');
    expect(NOMBRE_DEL_DIRECTORIO_DE_OBRAS).toBe('Obras');
    expect(datosDeTarjetaDelDirectorioDeObras(5)).toEqual({ titulo: 'Obras', hechos: ['5 obras'], familiaDelTitulo: 'sans' });
    expect(datosDeTarjetaDelDirectorioDeObras(1).hechos).toEqual(['1 obra']);
  });

  it('`/obras/` y su Tarjeta están entre las superficies sin semblanza', () => {
    expect(SUPERFICIES_SIN_SEMBLANZA).toContain(rutaDelDirectorioDeObras());
    expect(SUPERFICIES_SIN_SEMBLANZA).toContain(TARJETA_DEL_DIRECTORIO_DE_OBRAS);
    expect(rutaDelDirectorioDeObras()).toBe('/obras/');
    expect(TARJETA_DEL_DIRECTORIO_DE_OBRAS).toBe('/tarjeta/directorio/obras.png');
  });
});

describe('Historia 26.4 — el aviso de tamaño de `/obras/`', () => {
  it('por debajo o igual al tope informa; por encima avisa con el tamaño y reabre paginar', () => {
    expect(avisoDelDirectorioDeObras(100, 200)).toEqual({ nivel: 'info', mensaje: expect.stringContaining('100 bytes') });
    expect(avisoDelDirectorioDeObras(200, 200).nivel).toBe('info');
    const aviso = avisoDelDirectorioDeObras(201, 200);
    expect(aviso.nivel).toBe('warn');
    expect(aviso.mensaje).toContain('201 bytes');
    expect(aviso.mensaje).toContain('reabre paginar /obras/');
  });

  it('sin fichero avisa de que no pudo medir, y nunca escribe un cero', () => {
    const aviso = avisoDelDirectorioDeObras({ motivo: 'falta dist/obras/index.html' }, 200);
    expect(aviso.nivel).toBe('warn');
    expect(aviso.mensaje).toContain('No se pudo medir');
    expect(aviso.mensaje).toContain('falta dist/obras/index.html');
    expect(aviso.mensaje).not.toMatch(/\b0 bytes/);
  });

  it('el fichero medido es la página de `rutaDelDirectorioDeObras()`', () => {
    expect(FICHERO_DEL_DIRECTORIO_DE_OBRAS).toBe(`${rutaDelDirectorioDeObras().slice(1)}index.html`);
  });

  it('un fichero que no se deja medir no se da por ausente: el motivo dice cuál de las dos pasó', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sabiduria-obras-'));
    try {
      expect(await bytesDe(join(dir, 'no-esta.html'), 'x')).toEqual({ motivo: 'falta x' });
      expect(await bytesDe(dir, 'x')).toEqual({ motivo: 'x no es un fichero' });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('el tope tiene nombre y valor, y es el que se aplica por omisión', () => {
    expect(MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS).toBeGreaterThan(0);
    expect(avisoDelDirectorioDeObras(MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS).nivel).toBe('info');
    expect(avisoDelDirectorioDeObras(MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS + 1).nivel).toBe('warn');
  });

  it('la integración, sin `dist/obras/`, avisa y no lanza', async () => {
    const vacio = await mkdtemp(join(tmpdir(), 'sabiduria-obras-'));
    const avisos: string[] = [];
    const informes: string[] = [];
    try {
      const gancho = tamañoDelDirectorioDeObras().hooks['astro:build:done'];
      expect(gancho).toBeDefined();
      const logger = { warn: (m: string) => avisos.push(m), info: (m: string) => informes.push(m) };
      // Solo `dir` y `logger`: lo único que la integración lee del gancho.
      await (gancho as unknown as (o: { dir: URL; logger: typeof logger }) => Promise<void>)({
        dir: pathToFileURL(`${vacio}/`),
        logger,
      });
    } finally {
      await rm(vacio, { recursive: true, force: true });
    }
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('No se pudo medir');
    expect(informes).toEqual([]);
  });
});

// ─── Sobre lo construido ─────────────────────────────────────────────────────

const WS = 'https://es.wikisource.org/wiki/';
const documento = (titulo: string, textos: string[]) =>
  componerDocumento(
    { fuente: 'wikisource-es', obra: titulo, url: `${WS}${titulo.replaceAll(' ', '_')}`, recuperado: '2026-10-10' },
    titulo,
    textos.join('\n\n'),
  );

/** Semblanzas y nota que no pueden aparecer en ningún otro sitio por casualidad. */
const SEMBLANZA_DE_EPICTETO = 'Filósofo estoico griego, semblanza zanahoria-obras-uno.';
const SEMBLANZA_DE_MACHADO = 'Poeta sevillano, semblanza zanahoria-obras-dos.';
const SEMBLANZA_DE_SENECA = 'Filósofo estoico hispanorromano, tutor y después consejero de Nerón.';
const NOTA = 'Nota de la ficha de Cartas, zanahoria-obras-tres.';

const EPICTETO_YML = `nombre: Epicteto\nañoNacimiento: 50\nañoFallecimiento: 135\nsemblanza: ${SEMBLANZA_DE_EPICTETO}\nordenAlfabetico: Epicteto\n`;
const MACHADO_YML = `nombre: Antonio Machado\nañoNacimiento: 1875\nañoFallecimiento: 1939\nsemblanza: ${SEMBLANZA_DE_MACHADO}\nordenAlfabetico: Machado\n`;

// El censo es cerrado (11.2): las Citas sin obra —sin Fuente— tienen que ser slugs suyos.
const SIN_OBRA_SENECA = ['seneca-mientras-esperamos-vivir-la-vida-pasa', 'seneca-ninguna-cosa-se-parece-tanto-a-la'];
const SIN_OBRA_MACHADO = 'antonio-machado-caminante-no-hay-camino-se-hace-camino';

const CORPUS: Record<string, string> = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'autores/epicteto.yml': EPICTETO_YML,
  'autores/antonio-machado.yml': MACHADO_YML,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'pendientes-de-cotejo.yml': `citas:\n${[...SIN_OBRA_SENECA, SIN_OBRA_MACHADO].map((s) => `  - ${s}\n`).join('')}`,
  // Una ficha con nota (22.6): la pinta su Página de Obra y nunca `/obras/`.
  'obras/seneca--cartas-a-lucilio.yml': [
    'autor: "seneca"',
    'titulo: "Cartas a Lucilio"',
    'formas:',
    '  - "cartas a lucilio"',
    `nota: "${NOTA}"`,
    '',
  ].join('\n'),
  // Una ficha sin ninguna Cita publicada: el build avisa y no rompe, y `/obras/` no la lista.
  'obras/seneca--de-la-clemencia.yml': ['autor: "seneca"', 'titulo: "De la clemencia"', 'formas:', '  - "de la clemencia"', ''].join(
    '\n',
  ),
};

/** Siembra `n` Citas cotejadas de una Obra, con su documento (como `lista-de-obras.test.ts`). */
function sembrar(deAutor: string, clave: string, titulo: string, n: number, año?: (i: number) => number) {
  const textos: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const texto = `${titulo} ${i}: una sentencia distinta para cada número, la ${i}.`;
    textos.push(texto);
    const a = año?.(i);
    CORPUS[`citas/${deAutor}--${clave}-${i}.md`] = citaValida({
      autor: deAutor,
      slug: `${deAutor}-${clave}-${i}`,
      texto,
      procedencia: a === undefined ? { obra: titulo } : { obra: titulo, año: a },
      fuente: { id: 'wikisource-es', url: `${WS}${titulo.replaceAll(' ', '_')}` },
    });
  }
  CORPUS[`fuentes/wikisource-es--${clave}.txt`] = documento(titulo, textos);
}

// Séneca, 55 Citas: Brevedad 45, Cartas 3 (año 64), De la ira 3 (sin año), De la providencia 2
// (años 62 y 63: discrepan) y 2 sin obra. Epicteto: Enquiridión, 1 Cita, 50 a. C. (no se indexa).
// Machado: ninguna Obra, una Cita sin obra.
sembrar('seneca', 'sobre-la-brevedad-de-la-vida', 'Sobre la brevedad de la vida', 45, () => 49);
sembrar('seneca', 'cartas-a-lucilio', 'Cartas a Lucilio', 3, () => 64);
sembrar('seneca', 'de-la-ira', 'De la ira', 3);
sembrar('seneca', 'de-la-providencia', 'De la providencia', 2, (i) => 62 + i);
['Mientras esperamos vivir, la vida pasa.', 'Ninguna cosa se parece tanto a la injusticia como la justicia tardía.'].forEach(
  (texto, i) => {
    CORPUS[`citas/seneca--sin-obra-${i}.md`] = citaValida({
      slug: SIN_OBRA_SENECA[i],
      texto,
      procedencia: { referencia: `Carta ${i + 1}` },
      fuente: undefined,
    });
  },
);
sembrar('epicteto', 'enquiridion', 'Enquiridión', 1, () => -50);
CORPUS['citas/antonio-machado--sin-obra.md'] = citaValida({
  autor: 'antonio-machado',
  slug: SIN_OBRA_MACHADO,
  texto: 'Caminante, no hay camino, se hace camino al andar.',
  procedencia: { año: 1912 },
  fuente: undefined,
});

/** Las cinco Obras publicadas del corpus, por su ruta. */
const OBRAS = [
  '/obra/epicteto/enquiridion/',
  '/obra/seneca/sobre-la-brevedad-de-la-vida/',
  '/obra/seneca/cartas-a-lucilio/',
  '/obra/seneca/de-la-ira/',
  '/obra/seneca/de-la-providencia/',
];

const NOINDEX = /<meta name="robots" content="noindex, follow"/;

describe('Historia 26.4 — `/obras/` construido', () => {
  let proyecto = '';
  let congelado = '';
  let html = '';
  let salida = '';
  let codigo = 0;
  let htmlCongelado = '';

  beforeAll(async () => {
    const r = await construirConCorpus(CORPUS);
    proyecto = r.proyecto;
    codigo = r.codigo;
    salida = r.salida;
    if (r.codigo === 0) html = readFileSync(paginaConstruida(proyecto, '/obras/'), 'utf8');

    /*
     * La segunda construcción, con `CONGELACION_DE_OBRAS` en la copia —nunca en el árbol
     * (AD-21)—: la lista trae solo Brevedad, así que De la ira, que se indexaría, queda fuera.
     * `/obras/` no consulta ninguna regla de Obra y tiene que salir idéntico.
     */
    const original = await readFile(join(RAIZ, 'src/lib/umbrales.ts'), 'utf8');
    const conCongelacion = original.replace(
      'export const CONGELACION_DE_OBRAS: CongelacionDeObras | undefined = undefined;',
      "export const CONGELACION_DE_OBRAS: CongelacionDeObras | undefined = {\n  desde: '2026-10-28',\n  indexables: [\n    'seneca--sobre-la-brevedad-de-la-vida',\n  ],\n};",
    );
    const c = await construirConCorpus(CORPUS, { ficheros: { 'src/lib/umbrales.ts': conCongelacion } });
    congelado = c.proyecto;
    expect(c.codigo, c.salida).toBe(0);
    htmlCongelado = readFileSync(paginaConstruida(congelado, '/obras/'), 'utf8');
  }, 600_000);

  afterAll(async () => {
    for (const p of [proyecto, congelado]) if (p !== '') await limpiar(p);
  });

  const main = () => {
    const inicio = html.indexOf('<main');
    return html.slice(inicio, html.indexOf('</main>', inicio));
  };
  /** Cada Autor de la página: su `h3` y su lista. */
  const autores = () =>
    main()
      .split('<section class="autor"')
      .slice(1)
      .map((trozo) => trozo.slice(0, trozo.indexOf('</section>')));
  const filasDe = (trozo: string) =>
    [...trozo.matchAll(/<li[^>]*>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/li>/g)].map((m) => ({
      li: m[0],
      href: m[1],
      texto: m[2]
        .replace(/<span class="recuento/, ' $&')
        .replace(/<span class="oculto"[^>]*>[\s\S]*?<\/span>/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
      lector: m[2]
        .replace(/<span aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    }));
  const filas = () => autores().flatMap(filasDe);

  it('construye, e informa del tamaño de `/obras/` sin avisar', () => {
    expect(codigo, salida).toBe(0);
    expect(salida).toContain('El Directorio de Obras pesa');
    expect(salida).not.toContain('reabre paginar');
    expect(salida).not.toContain('No se pudo medir');
  });

  it('todas las Obras publicadas, una vez cada una, y ninguna Cita', () => {
    const hrefs = filas().map((f) => f.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect([...hrefs].sort()).toEqual([...OBRAS].sort());
    expect(main()).not.toMatch(/href="\/cita\//);
    for (const href of hrefs) expect(existsSync(paginaConstruida(proyecto, href)), href).toBe(true);
  });

  it('el conjunto es el de las Páginas de Obra construidas y el que cuenta `integraciones/indexables.ts`', () => {
    // Contra las otras dos derivaciones de `obrasPublicadas`, no contra una lista escrita: las
    // páginas `/obra/{autor}/{obra}/` de `dist/` y el «N Obras publicadas» del build.
    const hrefs = filas().map((f) => f.href);
    const raiz = join(proyecto, 'dist', 'obra');
    const construidas = readdirSync(raiz).flatMap((autor) =>
      readdirSync(join(raiz, autor))
        .filter((obra) => existsSync(join(raiz, autor, obra, 'index.html')))
        .map((obra) => `/obra/${autor}/${obra}/`),
    );
    expect([...hrefs].sort()).toEqual(construidas.sort());
    expect(salida).toContain(`${hrefs.length} Obras publicadas`);
  });

  it('una ficha sin Citas publicadas no figura: ni fila ni página', () => {
    expect(main()).not.toContain('/obra/seneca/de-la-clemencia/');
    expect(main()).not.toContain('De la clemencia');
    expect(existsSync(paginaConstruida(proyecto, '/obra/seneca/de-la-clemencia/'))).toBe(false);
  });

  it('cada Autor con Obras, en el orden del Directorio, con su cabecera enlazada y en la zona `directorio`', () => {
    const cabeceras = autores().map((trozo) => /<h3([^>]*)><a href="([^"]+)"[^>]*>([^<]+)<\/a><\/h3>/.exec(trozo));
    expect(cabeceras.map((m) => [m?.[2], m?.[3]])).toEqual([
      ['/autor/epicteto/', 'Epicteto'],
      ['/autor/seneca/', 'Séneca'],
    ]);
    for (const m of cabeceras) expect(m?.[1]).toContain('data-zona="directorio"');
    // Machado no tiene Obras: ni grupo ni letra.
    expect(html).not.toContain('/autor/antonio-machado/');
    for (const trozo of autores()) expect(trozo).toMatch(/<ul class="lista-de-obras" data-zona="directorio"/);
    for (const { li } of filas()) expect(li).not.toContain('target=');
  });

  it('el grupo de cada Autor repite la secuencia de su Página de Autor', () => {
    for (const [i, slug] of ['epicteto', 'seneca'].entries()) {
      const pagina = readFileSync(paginaConstruida(proyecto, `/autor/${slug}/`), 'utf8');
      const seccion = pagina.slice(pagina.indexOf('<section class="obras-del-autor'));
      const enSuPagina = filasDe(seccion.slice(0, seccion.indexOf('</section>'))).map((f) => f.href);
      expect(enSuPagina.length, slug).toBeGreaterThan(0);
      expect(filasDe(autores()[i]).map((f) => f.href), slug).toEqual(enSuPagina);
    }
  });

  it('las filas: año, «a. C.», discrepancia sin «·», singular, y el lector oye el recuento una vez', () => {
    const porHref = new Map(filas().map((f) => [f.href, f]));
    expect(porHref.get('/obra/seneca/cartas-a-lucilio/')).toMatchObject({
      texto: 'Cartas a Lucilio · 64 3 citas',
      lector: 'Cartas a Lucilio, 64, 3 citas',
    });
    expect(porHref.get('/obra/epicteto/enquiridion/')).toMatchObject({
      texto: 'Enquiridión · 50 a. C. 1 cita',
      lector: 'Enquiridión, 50 a. C., 1 cita',
    });
    expect(porHref.get('/obra/seneca/de-la-providencia/')).toMatchObject({
      texto: 'De la providencia 2 citas',
      lector: 'De la providencia, 2 citas',
    });
    for (const { lector } of filas()) expect(lector.match(/\bcitas?\b/g), lector).toHaveLength(1);
  });

  it('la Obra que no se indexa va con el mismo marcado que las demás, salvo `href` y texto', () => {
    // Las dos llevan año, así que el marcado tiene que ser el mismo hasta el último `span`.
    const [enquiridion] = filasDe(autores()[0]);
    const cartas = filas().find((f) => f.href === '/obra/seneca/cartas-a-lucilio/');
    expect(cartas).toBeDefined();
    // Su página sigue `noindex, follow`; la de Cartas a Lucilio se indexa.
    expect(readFileSync(paginaConstruida(proyecto, enquiridion.href), 'utf8')).toMatch(NOINDEX);
    expect(readFileSync(paginaConstruida(proyecto, '/obra/seneca/cartas-a-lucilio/'), 'utf8')).not.toMatch(NOINDEX);
    const esqueleto = (li: string) => li.replace(/href="[^"]*"/, 'href=""').replace(/>[^<]*</g, '><');
    expect(esqueleto(enquiridion.li)).toBe(esqueleto(cartas?.li ?? ''));
  });

  it('con `CONGELACION_DE_OBRAS` puesta, `/obras/` sale idéntico byte a byte', () => {
    expect(htmlCongelado).not.toBe('');
    expect(htmlCongelado).toBe(html);
    // Y la congelación sí rigió en esa copia: De la ira dejó de indexarse.
    expect(readFileSync(paginaConstruida(congelado, '/obra/seneca/de-la-ira/'), 'utf8')).toMatch(NOINDEX);
  });

  it('las letras: «Obras de autores por la X», cada una a su `h2`, y «Volver a las letras» tras cada grupo', () => {
    const letras = [...html.matchAll(/<a href="#(letra-[^"]+)"[^>]*><span class="solo-para-lectores"[^>]*>Obras de autores por la <\/span>([^<]+)<\/a>/gu)].map(
      (m) => [m[1], m[2]],
    );
    expect(letras).toEqual([
      ['letra-e', 'E'],
      ['letra-s', 'S'],
    ]);
    for (const [ancla, inicial] of letras) {
      expect(html).toMatch(new RegExp(`<h2 class="rotulo" id="${ancla}" tabindex="-1"[^>]*>${inicial}</h2>`, 'u'));
    }
    expect([...html.matchAll(/<a href="#letras"[^>]*>Volver a las letras<\/a>/gu)]).toHaveLength(letras.length);
    expect(html).not.toContain('letra-m');
  });

  it('un único `h1`, «Obras», y el título y la meta exactos', () => {
    expect([...html.matchAll(/<h1[\s>]/gu)]).toHaveLength(1);
    expect(html).toMatch(/<h1[^>]*>Obras<\/h1>/u);
    expect(html).toContain('<title>Obras, por autor | Sabiduría de Bolsillo</title>');
    expect(html).toContain('<meta name="description" content="5 obras de 2 autores, con 54 citas publicadas.">');
  });

  it('es producto: canónica sin `noindex`, en el sitemap, vista de superficie, y sin páginas 2+', () => {
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/[^"]+\/obras\/">/u);
    expect(html).not.toContain('noindex');
    expect(html).toMatch(/<html[^>]*data-vistas="vista-de-superficie"/u);
    const sitemap = readFileSync(join(proyecto, 'dist', 'sitemap-0.xml'), 'utf8');
    expect(sitemap).toMatch(/<loc>https:\/\/[^<]+\/obras\/<\/loc>/u);
    expect(existsSync(paginaConstruida(proyecto, '/obras/2/'))).toBe(false);
  });

  it('en la búsqueda propia responde por su título: el listado entero va fuera del índice, con el filtro `directorio`', () => {
    const cuerpo = main();
    expect(cuerpo).toMatch(/^<main[^>]*data-pagefind-body[^>]*data-pagefind-filter="tipo:directorio"/u);
    const ignorado = /<div class="listado" data-pagefind-ignore="all"[^>]*>(.*)<\/div>/su.exec(cuerpo)?.[1] ?? '';
    expect(ignorado).toContain('id="letras"');
    for (const href of OBRAS) expect(ignorado).toContain(href);
  });

  it('su Tarjeta Social: la de los Directorios, «Obras» y «5 obras», los mismos bytes que su SVG', async () => {
    expect(html).toMatch(/<meta property="og:image" content="https:\/\/[^"]+\/tarjeta\/directorio\/obras\.png">/u);
    const construido = readFileSync(join(proyecto, 'dist', 'tarjeta', 'directorio', 'obras.png'));
    expect(construido.readUInt32BE(16)).toBe(1200);
    expect(construido.readUInt32BE(20)).toBe(630);
    const svg = svgDeTarjetaDeListado(datosDeTarjetaDelDirectorioDeObras(5));
    expect(svg).toContain('5 obras');
    for (const prohibido of [NOTA, SEMBLANZA_DE_EPICTETO, SEMBLANZA_DE_MACHADO, SEMBLANZA_DE_SENECA]) {
      expect(svg).not.toContain(prohibido);
    }
    expect(construido.equals(await sharp(Buffer.from(svg)).png().toBuffer())).toBe(true);
  });

  it('ni Cita, ni semblanza, ni nota de ficha, ni «frases», ni la línea sin obra, ni glifo de avance', () => {
    for (const prohibido of [NOTA, SEMBLANZA_DE_EPICTETO, SEMBLANZA_DE_MACHADO, SEMBLANZA_DE_SENECA]) {
      expect(html).not.toContain(prohibido);
    }
    // Control: la nota sí está en su Página de Obra, así que su ausencia aquí no es casualidad.
    expect(readFileSync(paginaConstruida(proyecto, '/obra/seneca/cartas-a-lucilio/'), 'utf8')).toContain(NOTA);
    expect(html).not.toContain('una sentencia distinta');
    expect(main().toLowerCase()).not.toContain('frase');
    expect(html).not.toContain('sin obra documentada');
    expect(main()).not.toMatch(/[→›]/u);
    expect(html).not.toContain('data-ingreso');
  });

  it('Historia 26.6 — sin guion, ni campo ni hueco: la región del recuento vacía, la plantilla inerte y la lista entera', () => {
    comprobarFiltroEnElHtml(html, 'obras');
  });
});
