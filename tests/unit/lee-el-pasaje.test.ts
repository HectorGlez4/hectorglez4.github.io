import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  fuenteConModeloEncendido,
  fuenteConTiendaDePrueba,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.ts';
import { decodificar } from './ayuda/listado.ts';
import { indiceDe } from './ayuda/pagefind.ts';
import { componerDocumento } from '../../tools/lib/documento.ts';
import { colapsarEspacios } from '../../tools/lib/cotejo.ts';
import { textoConSaltos } from '../../tools/lib/lineas.ts';
import { partesDelPasaje } from '../../src/lib/pasaje.ts';
import { MODELOS } from '../../src/lib/ingreso.ts';

/**
 * Historia 31.2 — «Lee el pasaje», plegado en la Página de Cita (FR-59, AD-28, AD-29, AD-30).
 *
 * Dos partes. La pura: `partesDelPasaje` reparte el pasaje en párrafos, líneas y segmentos con
 * los tramos que trae, sin interpretar ningún salto. La construida: un Corpus con Citas en verso
 * (dos del mismo poema y una que cruza dos estrofas), en `prosa-ajustada` y en
 * `prosa-por-lineas`, una que «no dice más» y una sin documento, con `MAX_CARACTERES_DEL_PASAJE`
 * parcheado en la copia —nunca en el árbol, cuyo valor no se fija aquí—. El comportamiento en el
 * navegador lo mira `tests/e2e/lee-el-pasaje.spec.ts`.
 *
 * La Cita sin Obra con pasaje de la matriz no se construye: un documento de Fuente solo casa con
 * una Cita que declara obra (`documentoDeCita`), y toda obra con forma tiene ficha —el build
 * rompe sin ella—, así que en una construcción toda Cita con pasaje tiene Obra. Su regla
 * (`pasajesDeCitas` con una Cita sin Obra) la prueba `tests/unit/orden-del-libro.test.ts`, y su
 * filete, la regla de `.desplegables`, que no depende de la Tarjeta de Obra.
 */

// ─────────────────────────────────────────────────────────────────────────────
// La parte pura
// ─────────────────────────────────────────────────────────────────────────────

/** El HTML que pintaría el componente, para leer la matriz de un vistazo. */
const enHtml = (pasaje: Parameters<typeof partesDelPasaje>[0]) =>
  partesDelPasaje(pasaje)
    .map(
      (lineas) =>
        `<p>${lineas.map((segmentos) => segmentos.map((s) => (s.deLaCita ? `<mark>${s.texto}</mark>` : s.texto)).join('')).join('<br>')}</p>`,
    )
    .join('');

/** El invariante: lo marcado, unido por espacio, colapsa al texto de la Cita. */
const marcado = (pasaje: Parameters<typeof partesDelPasaje>[0]) =>
  colapsarEspacios(
    partesDelPasaje(pasaje)
      .flat(2)
      .filter((s) => s.deLaCita)
      .map((s) => s.texto)
      .join(' '),
  );

describe('31.2 — partesDelPasaje: el reparto, sin interpretar saltos', () => {
  it('el ejemplo del spec: dos estrofas, la Cita en la última de la primera y la primera de la segunda', () => {
    const pasaje = { texto: 'A\nB\n\nC\nD', inicio: 2, fin: 6, parrafos: [[[0, 1], [2, 3]], [[5, 6], [7, 8]]] as [number, number][][] };
    expect(enHtml(pasaje)).toBe('<p>A<br><mark>B</mark></p><p><mark>C</mark><br>D</p>');
    expect(marcado(pasaje)).toBe('B C');
  });

  it('verso, Cita de 2 de 4 versos: un párrafo con tres saltos y la marca en las dos líneas de la Cita', () => {
    const texto = 'uno,\ndos,\ntres,\ncuatro.';
    const pasaje = { texto, inicio: 5, fin: 15, parrafos: [[[0, 4], [5, 9], [10, 15], [16, 23]]] as [number, number][][] };
    expect(enHtml(pasaje)).toBe('<p>uno,<br><mark>dos,</mark><br><mark>tres,</mark><br>cuatro.</p>');
  });

  it('prosa-ajustada: un párrafo sin saltos, con el `\\n` interior literal dentro de la marca', () => {
    const texto = 'Antes de la frase\nque se busca, y después.';
    const inicio = texto.indexOf('la frase');
    const fin = texto.indexOf(', y');
    const pasaje = { texto, inicio, fin, parrafos: [[[0, texto.length]]] as [number, number][][] };
    expect(enHtml(pasaje)).toBe('<p>Antes de <mark>la frase\nque se busca</mark>, y después.</p>');
    expect(marcado(pasaje)).toBe('la frase que se busca');
  });

  it('prosa-por-lineas, Cita en dos líneas: dos párrafos, una marca en cada uno', () => {
    const texto = 'Primera con el principio\nque sigue aquí, y acaba.';
    const pasaje = {
      texto,
      inicio: texto.indexOf('el principio'),
      fin: texto.indexOf(', y'),
      parrafos: [[[0, 24]], [[25, texto.length]]] as [number, number][][],
    };
    expect(enHtml(pasaje)).toBe('<p>Primera con <mark>el principio</mark></p><p><mark>que sigue aquí</mark>, y acaba.</p>');
  });

  it('la Cita que abre o cierra el pasaje no deja segmentos vacíos', () => {
    const texto = 'Toda la línea es la Cita y algo.';
    const partes = partesDelPasaje({ texto, inicio: 0, fin: texto.length, parrafos: [[[0, texto.length]]] });
    expect(partes).toEqual([[[{ texto, deLaCita: true }]]]);
  });

  it('src/lib/pasaje.ts no interpreta saltos ni nombra ninguna forma de las líneas', async () => {
    const codigo = (await readFile(join(RAIZ, 'src/lib/pasaje.ts'), 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gmu, '');
    expect(codigo).not.toMatch(/\\n|verso|prosa|indexOf|split\(/u);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// La parte construida
// ─────────────────────────────────────────────────────────────────────────────

const WS = 'https://es.wikisource.org/wiki/';
const AUTOR_POETA = `nombre: Juan Poeta
añoNacimiento: 1801
añoFallecimiento: 1870
semblanza: Poeta de prueba.
ordenAlfabetico: Poeta
`;

const COPLAS = 'Coplas del viento';
const ESTROFA_1 = ['Sopla el viento por la sierra,', 'y la sierra no responde;', 'baja el agua por la tierra,', 'y la tierra no se esconde.'];
const ESTROFA_2 = ['Canta el gallo en la mañana,', 'y la mañana se aleja;', 'llora el niño en la ventana,', 'y la ventana se queja.'];
const CUERPO_COPLAS = `${ESTROFA_1.join('\n')}\n\n${ESTROFA_2.join('\n')}`;

const BREVEDAD = 'Sobre la brevedad de la vida';
const BLOQUE_AJUSTADO =
  'Dice el filósofo que de nada sirve quejarse del tiempo\nque se escapa, porque no es que tengamos poco tiempo, es\nque perdemos mucho, y lo dice con toda la razón del mundo.';
const NO_DICE_MAS = 'La vida es larga si se sabe usar';

const CARTAS = 'Cartas a Lucilio';
const LINEAS_DE_CARTAS = [
  'Carta primera, que empieza así y acaba con el principio de una idea que',
  'sigue en la línea siguiente sin mirar atrás, y termina en esta.',
  'Otra línea que no toca a nadie.',
];

/** Las Citas, por slug: su texto en una línea, el autor, la obra y el documento de la Fuente. */
const V1 = 'poeta-sopla-el-viento-por-la-sierra';
const V2 = 'poeta-baja-el-agua-por-la-tierra';
const V3 = 'poeta-y-la-tierra-no-se-esconde-canta';
const AJUSTADA = 'seneca-no-es-que-tengamos-poco-tiempo-es';
const POR_LINEAS = 'seneca-el-principio-de-una-idea';
const SIN_PASAJE = 'seneca-la-vida-es-larga-si-se-sabe-usar';
// Del censo cerrado de lo anterior a la v3: es el único modo de que una Cita no tenga documento.
const SIN_DOCUMENTO = 'seneca-mientras-esperamos-vivir-la-vida-pasa';

const verso = (lineas: string[]) =>
  textoConSaltos(lineas.join(' '), { cuerpo: CUERPO_COPLAS, forma: 'verso' }).texto;

const TEXTO_DE: Record<string, string> = {
  [V1]: verso(ESTROFA_1.slice(0, 2)),
  [V2]: verso(ESTROFA_1.slice(2, 4)),
  [V3]: verso([ESTROFA_1[3], ESTROFA_2[0]]),
  [AJUSTADA]: 'no es que tengamos poco tiempo, es que perdemos mucho',
  [POR_LINEAS]: 'el principio de una idea que sigue en la línea siguiente',
  [SIN_PASAJE]: NO_DICE_MAS,
  [SIN_DOCUMENTO]: 'Mientras esperamos vivir, la vida pasa.',
};
const CON_PASAJE = [V1, V2, V3, AJUSTADA, POR_LINEAS];

/** Palabras que solo están en un pasaje: ninguna Cita, título ni Autor las dice, ni su raíz (Pagefind busca por raíz: «quejarse» casaba «que», «escapa», «es», y «atrás», «a»). */
const SOLO_EN_EL_PASAJE = ['ventana', 'razón', 'mirar'];

function corpus(): Record<string, string> {
  const documento = (obra: string, url: string, lineas: 'verso' | 'prosa-ajustada' | 'prosa-por-lineas', cuerpo: string) =>
    componerDocumento({ fuente: 'wikisource-es', obra, url, recuperado: '2026-11-08', lineas }, obra, cuerpo);
  const urlCoplas = `${WS}Coplas_del_viento`;
  const urlBrevedad = `${WS}Sobre_la_brevedad_de_la_vida`;
  const urlCartas = `${WS}Cartas_a_Lucilio`;
  const cita = (slug: string, autor: string, obra: string, url: string) =>
    citaValida({ slug, texto: TEXTO_DE[slug], autor, procedencia: { obra }, fuente: { id: 'wikisource-es', url } });
  return {
    'autores/seneca.yml': AUTOR_VALIDO,
    'autores/poeta.yml': AUTOR_POETA,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'pendientes-de-cotejo.yml': `citas:\n  - ${SIN_DOCUMENTO}\n`,
    'fuentes/wikisource-es--coplas-del-viento.txt': documento(COPLAS, urlCoplas, 'verso', CUERPO_COPLAS),
    'fuentes/wikisource-es--sobre-la-brevedad-de-la-vida.txt': documento(
      BREVEDAD,
      urlBrevedad,
      'prosa-ajustada',
      `${BLOQUE_AJUSTADO}\n\n${NO_DICE_MAS}.\n\nOtro párrafo que no toca.`,
    ),
    'fuentes/wikisource-es--cartas-a-lucilio.txt': documento(CARTAS, urlCartas, 'prosa-por-lineas', LINEAS_DE_CARTAS.join('\n')),
    'citas/poeta--sopla-el-viento-por-la-sierra.md': cita(V1, 'poeta', COPLAS, urlCoplas),
    'citas/poeta--baja-el-agua-por-la-tierra.md': cita(V2, 'poeta', COPLAS, urlCoplas),
    'citas/poeta--y-la-tierra-no-se-esconde-canta.md': cita(V3, 'poeta', COPLAS, urlCoplas),
    'citas/seneca--no-es-que-tengamos-poco-tiempo-es.md': cita(AJUSTADA, 'seneca', BREVEDAD, urlBrevedad),
    'citas/seneca--la-vida-es-larga-si-se-sabe-usar.md': cita(SIN_PASAJE, 'seneca', BREVEDAD, urlBrevedad),
    'citas/seneca--el-principio-de-una-idea.md': cita(POR_LINEAS, 'seneca', CARTAS, urlCartas),
    'citas/seneca--sin-documento.md': citaValida({
      slug: SIN_DOCUMENTO,
      texto: TEXTO_DE[SIN_DOCUMENTO],
      procedencia: { referencia: 'Carta 1' },
      fuente: undefined,
    }),
  };
}

/** La declaración del tope, con el valor que tenga en el árbol: se reemplaza en la copia. */
const DECLARACION_DEL_TOPE = /^export const MAX_CARACTERES_DEL_PASAJE: number \| undefined = [^;\n]+;$/mu;
const conElTope = (umbrales: string, valor: string) =>
  umbrales.replace(DECLARACION_DEL_TOPE, `export const MAX_CARACTERES_DEL_PASAJE: number | undefined = ${valor};`);

/** El bloque de desplegables, de su apertura al cierre del `article`. */
function regionDeDesplegables(html: string): string {
  const inicio = html.indexOf('<div class="desplegables');
  expect(inicio, 'sin bloque de desplegables').toBeGreaterThan(-1);
  return html.slice(inicio, html.indexOf('</article>', inicio));
}

const detallesDe = (region: string) => [...region.matchAll(/<details\b[\s\S]*?<\/details>/g)].map((m) => m[0]);
const rotuloDe = (detalle: string) => /<summary\b[^>]*>\s*<span\b[^>]*>([^<]*)</.exec(detalle)?.[1];
const sinEtiquetas = (html: string) => colapsarEspacios(decodificar(html.replace(/<[^>]*>/g, ' ')));

/** El «Lee el pasaje» de una página, o `undefined` si no lo hay. */
const pasajeDe = (html: string) => detallesDe(regionDeDesplegables(html)).find((d) => rotuloDe(d) === 'Lee el pasaje');
const parrafosDe = (detalle: string) => [...detalle.matchAll(/<p class="parrafo[^"]*"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1]);
const marcasDe = (html: string) => [...html.matchAll(/<mark\b[^>]*>([\s\S]*?)<\/mark>/g)].map((m) => decodificar(m[1]));
/** Sin las etiquetas de marca, con sus atributos de ámbito. */
const sinMarcas = (html: string) => html.replace(/<\/?mark\b[^>]*>/g, '');

describe('Historia 31.2 — «Lee el pasaje» en la Página de Cita construida', () => {
  const aLimpiar: string[] = [];
  let proyecto = '';
  let encendido = '';
  const html = (ruta: string, de = proyecto) => readFile(paginaConstruida(de, ruta), 'utf8');

  beforeAll(async () => {
    const umbrales = conElTope(await readFile(join(RAIZ, 'src/lib/umbrales.ts'), 'utf8'), '400');
    expect(umbrales).toContain('MAX_CARACTERES_DEL_PASAJE: number | undefined = 400;');
    const con = await construirConCorpus(corpus(), { conBusqueda: true, ficheros: { 'src/lib/umbrales.ts': umbrales } });
    aLimpiar.push(con.proyecto);
    expect(con.codigo, con.salida).toBe(0);
    proyecto = con.proyecto;

    // Todos los Modelos que alguna superficie admite, encendidos en otra copia con el mismo tope.
    let ingreso = fuenteConTiendaDePrueba(await readFile(resolve(RAIZ, 'src/lib/ingreso.ts'), 'utf8'));
    for (const modelo of MODELOS.filter((m) => m.admitidoEn.length > 0)) {
      if (!modelo.encendido) ingreso = fuenteConModeloEncendido(ingreso, modelo.id);
    }
    const otra = await construirConCorpus(corpus(), {
      ficheros: { 'src/lib/umbrales.ts': umbrales, 'src/lib/ingreso.ts': ingreso },
    });
    aLimpiar.push(otra.proyecto);
    expect(otra.codigo, otra.salida).toBe(0);
    encendido = otra.proyecto;
  }, 600_000);

  afterAll(async () => {
    for (const p of aLimpiar) await limpiar(p);
  });

  it('con pasaje, «Lee el pasaje» es el primer `<details>` del bloque, cerrado, antes de «Cómo citar» e «Inserta esta cita»', async () => {
    const rutas = (await readdir(join(proyecto, 'dist', 'cita'), { withFileTypes: true })).filter((d) => d.isDirectory());
    expect(rutas.map((d) => d.name).sort()).toEqual(Object.keys(TEXTO_DE).sort());
    for (const slug of CON_PASAJE) {
      const detalles = detallesDe(regionDeDesplegables(await html(`/cita/${slug}/`)));
      const rotulos = detalles.map(rotuloDe);
      expect(rotulos[0], slug).toBe('Lee el pasaje');
      expect(rotulos.at(-1), slug).toBe('Inserta esta cita');
      expect(rotulos.filter((r) => r === 'Lee el pasaje'), slug).toHaveLength(1);
      expect(detalles[0], slug).not.toMatch(/<details\b[^>]*\bopen\b/);
    }
  });

  it('sin pasaje —no dice más, sin documento—, ningún «Lee el pasaje» ni hueco: el bloque empieza por el siguiente', async () => {
    for (const slug of [SIN_PASAJE, SIN_DOCUMENTO]) {
      const pagina = await html(`/cita/${slug}/`);
      expect(pagina, slug).not.toContain('Lee el pasaje');
      expect(pagina, slug).not.toMatch(/class="[^"]*\b(pasaje|parrafo|fuente-del-pasaje)\b/);
      const region = regionDeDesplegables(pagina);
      expect(region, slug).toMatch(/^<div class="desplegables[^"]*"[^>]*>\s*<details\b/);
      // Ni su presentación: la hoja del pasaje solo va donde se pinta.
      expect(pagina, slug).not.toContain('.pasaje .parrafo');
    }
  });

  it('la presentación del pasaje va en la cabeza, una vez, solo en la página que lo pinta', async () => {
    for (const slug of CON_PASAJE) {
      const pagina = await html(`/cita/${slug}/`);
      const cabeza = pagina.slice(0, pagina.indexOf('</head>'));
      expect(cabeza.match(/<style>[^<]*\.pasaje \.parrafo/g), slug).toHaveLength(1);
      expect(pagina.slice(pagina.indexOf('</head>')), slug).not.toContain('.pasaje .parrafo');
    }
  });

  it('verso: un `<p>` por estrofa y un `<br>` entre versos, con la marca en cada verso de la Cita', async () => {
    const [v1] = parrafosDe(pasajeDe(await html(`/cita/${V1}/`))!);
    expect(parrafosDe(pasajeDe(await html(`/cita/${V1}/`))!)).toHaveLength(1);
    expect(v1.match(/<br\b[^>]*>/g)).toHaveLength(3);
    expect(marcasDe(v1)).toEqual(ESTROFA_1.slice(0, 2));
    // Cruza dos estrofas: la marca al final del primero y al principio del segundo.
    const v3 = parrafosDe(pasajeDe(await html(`/cita/${V3}/`))!);
    expect(v3).toHaveLength(2);
    expect(v3[0]).toMatch(/<mark\b[^>]*>[^<]*<\/mark>$/);
    expect(v3[1]).toMatch(/^<mark\b/);
    expect([...marcasDe(v3[0]), ...marcasDe(v3[1])]).toEqual([ESTROFA_1[3], ESTROFA_2[0]]);
    expect(v3.map((p) => p.match(/<br\b[^>]*>/g)?.length)).toEqual([3, 3]);
  });

  it('dos Citas del mismo poema: el mismo pasaje, cada una con su marca', async () => {
    const uno = pasajeDe(await html(`/cita/${V1}/`))!;
    const dos = pasajeDe(await html(`/cita/${V2}/`))!;
    const sinMarca = (d: string) => d.replace(/<\/?mark\b[^>]*>/g, '');
    expect(sinMarca(uno)).toBe(sinMarca(dos));
    expect(marcasDe(uno)).not.toEqual(marcasDe(dos));
    expect(marcasDe(dos)).toEqual(ESTROFA_1.slice(2, 4));
  });

  it('prosa-ajustada: un `<p>` sin `<br>`, con los saltos interiores literales', async () => {
    const parrafos = parrafosDe(pasajeDe(await html(`/cita/${AJUSTADA}/`))!);
    expect(parrafos).toHaveLength(1);
    expect(parrafos[0]).not.toContain('<br');
    expect(decodificar(sinMarcas(parrafos[0]))).toBe(BLOQUE_AJUSTADO);
    expect(marcasDe(parrafos[0])).toHaveLength(1);
    expect(marcasDe(parrafos[0])[0]).toContain('\n');
  });

  it('prosa-por-lineas, Cita en dos líneas: dos `<p>`, sin `<br>`', async () => {
    const parrafos = parrafosDe(pasajeDe(await html(`/cita/${POR_LINEAS}/`))!);
    expect(parrafos.map((p) => decodificar(sinMarcas(p)))).toEqual(LINEAS_DE_CARTAS.slice(0, 2));
    expect(parrafos.join('')).not.toContain('<br');
  });

  it('el invariante: lo marcado, unido por espacio y colapsado, es el texto de la Cita', async () => {
    for (const slug of CON_PASAJE) {
      expect(colapsarEspacios(marcasDe(pasajeDe(await html(`/cita/${slug}/`))!).join(' ')), slug).toBe(
        colapsarEspacios(TEXTO_DE[slug]),
      );
    }
  });

  it('debajo, la línea de la Fuente, igual a la de la Atribución, con su único enlace de salida y nada más', async () => {
    for (const slug of CON_PASAJE) {
      const pagina = await html(`/cita/${slug}/`);
      const detalle = pasajeDe(pagina)!;
      const linea = /<p class="fuente-del-pasaje[^"]*"[^>]*>([\s\S]*?)<\/p>/.exec(detalle)?.[1];
      const deLaAtribucion = /<p class="fuente[^"-]*"[^>]*>([\s\S]*?)<\/p>/.exec(pagina)?.[1];
      expect(linea, slug).toBeDefined();
      expect(sinEtiquetas(linea!), slug).toBe(sinEtiquetas(deLaAtribucion!));
      expect(sinEtiquetas(linea!), slug).toMatch(/^Texto tomado de .+\.$/);
      const enlaces = [...detalle.matchAll(/<a\b([^>]*)>/g)].map((m) => m[1]);
      expect(enlaces, slug).toHaveLength(1);
      expect(enlaces[0], slug).toMatch(/href="https:\/\/es\.wikisource\.org\//);
      expect(enlaces[0], slug).toMatch(/rel="noopener nofollow"/);
      expect(enlaces[0], slug).not.toMatch(/target=/);
      expect(detalle, slug).not.toMatch(/<script\b|data-zona|data-sin-zona|data-ingreso|href="\//);
    }
  });

  it('lo que solo dice el pasaje no está fuera del desplegable —JSON-LD, Copiar, Imagen, Fragmento— ni en Pagefind', async () => {
    for (const slug of CON_PASAJE) {
      const pagina = await html(`/cita/${slug}/`);
      const fuera = pagina.replace(pasajeDe(pagina)!, '');
      for (const palabra of SOLO_EN_EL_PASAJE) expect(fuera.toLowerCase(), `${slug}: ${palabra}`).not.toContain(palabra);
    }
    // Y alguna página sí lo trae dentro: si no, la comprobación de arriba no diría nada.
    expect(pasajeDe(await html(`/cita/${V3}/`))).toContain('ventana');
    expect(pasajeDe(await html(`/cita/${AJUSTADA}/`))).toContain('razón');
    expect(pasajeDe(await html(`/cita/${POR_LINEAS}/`))).toContain('mirar');
    const indice = await indiceDe(proyecto);
    try {
      for (const palabra of SOLO_EN_EL_PASAJE) {
        const datos = await Promise.all((await indice.search(palabra)).results.map((r) => r.data()));
        expect(
          datos.map((d) => d.url),
          `${palabra}: ${datos.map((d) => `${d.url} «${(d as unknown as { excerpt?: string }).excerpt}»`).join(' | ')}`,
        ).toEqual([]);
      }
      // El índice sí encuentra las Citas por su texto: la búsqueda funciona.
      expect((await indice.search('sierra')).results.length).toBeGreaterThan(0);
    } finally {
      indice.soltar();
    }
  });

  it('con todos los Modelos admitidos encendidos, el desplegable sale byte a byte igual', async () => {
    for (const slug of CON_PASAJE) {
      expect(pasajeDe(await html(`/cita/${slug}/`, encendido)), slug).toBe(pasajeDe(await html(`/cita/${slug}/`)));
    }
  });
});

describe('Historia 31.2 — el pasaje solo lo lee la Página de Cita', () => {
  async function ficheros(dir: string): Promise<string[]> {
    const entradas = await readdir(join(RAIZ, dir), { recursive: true, withFileTypes: true });
    return entradas
      .filter((d) => d.isFile() && /\.(ts|mts|js|mjs|astro)$/u.test(d.name))
      .map((d) => join(d.parentPath, d.name).slice(RAIZ.length + 1));
  }
  const sinComentarios = (codigo: string) => codigo.replace(/\/\*[\s\S]*?\*\/|\/\/.*$|\{\/\*[\s\S]*?\*\/\}/gmu, '');

  it('`pasajesDeLasCitas` solo la llaman `src/pages/cita/[slug].astro` (y la define `src/lib/publicado.ts`)', async () => {
    const todos = (await Promise.all(['src', 'tools', 'integraciones', 'public/islas'].map(ficheros))).flat();
    const llaman: string[] = [];
    for (const f of todos) {
      if (/\bpasajesDeLasCitas\b/u.test(sinComentarios(await readFile(join(RAIZ, f), 'utf8')))) llaman.push(f);
    }
    expect(llaman.sort()).toEqual(['src/lib/publicado.ts', 'src/pages/cita/[slug].astro']);
  });

  it('ni la Tarjeta Social, ni el lienzo, ni la Imagen, ni el JSON-LD nombran el pasaje', async () => {
    const vigilados = [
      'src/lib/tarjeta.ts',
      'src/lib/lienzo.ts',
      'public/islas/imagen.js',
      'src/components/DatosEstructurados.astro',
      ...(await ficheros('src/pages/tarjeta')),
    ];
    for (const f of vigilados) {
      expect(sinComentarios(await readFile(join(RAIZ, f), 'utf8')), f).not.toMatch(/pasaje|LeeElPasaje/iu);
    }
  });
});
