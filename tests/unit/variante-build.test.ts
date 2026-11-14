import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ATESTIGUADA,
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  conLaPuertaAbierta,
  construirConCorpus,
  limpiar,
  paginaConstruida,
  type CorpusDePrueba,
} from './ayuda/construir.js';
import { indiceDe } from './ayuda/pagefind.ts';

/**
 * Historia 35.6 — la Variante de España, sobre un sitio construido de verdad con la puerta de la
 * atribuida abierta en la copia (nunca en el árbol) y con el índice de Pagefind:
 *
 *   · **CV** — de Buzz, con Variante: la línea «En España: «…»» tras la Atribución y antes de
 *     Copiar, dentro de `data-pagefind-body` y fuera de todo `data-pagefind-ignore`, sin `lang`,
 *     sin `tabindex` y sin enlace; su texto no sale en ningún otro sitio de la página —ni lo
 *     copiado, ni la Imagen, ni el Fragmento, ni el JSON-LD, ni la meta, ni el `<title>`—, y la
 *     búsqueda la encuentra por tres palabras suyas en la misma `/cita/{slug}/`;
 *   · **SV** — de Buzz, sin Variante: ni línea ni hueco. Desde la 35.10 es además la traducción
 *     del sitio (`origen: traduccion-propia`), y su página lo dice; la de CV, de doblaje, no.
 *
 * Y dos construcciones que rompen: una Cita de siempre con `variante`, nombrando su fichero, y dos
 * atribuidas cuya Variante se repite. Lo puro está en `variante.test.ts`.
 */

const AUTOR_VIVO = `nombre: "Autora Viva"
vivo: true
semblanza: "Escritora de hoy."
ordenAlfabetico: "Viva"
`;

const BUZZ = `nombre: "Buzz Lightyear"
universo: "Toy Story"
ordenAlfabetico: "Lightyear"
`;

const CV = 'buzz-hasta-el-infinito-y-mas-alla';
const SV = 'buzz-al-rescate-guardian-espacial';
const VARIANTE = 'Hasta el infinito y aún más allá astronauta valiente';

const atribuida = (campos: Record<string, unknown>) =>
  citaValida({
    clase: 'atribuida',
    estadoDerechos: undefined,
    fuente: undefined,
    ...ATESTIGUADA,
    ...campos,
  });

/** Seis palabras por un xorshift sembrado con n: ningún relleno casa con otro por `parecidoEntre`. */
const PALABRAS = ['río', 'piedra', 'luz', 'sombra', 'camino', 'viento', 'mar', 'fuego', 'nube', 'árbol', 'pan',
  'sal', 'hierro', 'vidrio', 'lluvia', 'nieve', 'campo', 'puerta', 'casa', 'libro', 'sueño', 'voz', 'mano'];
const textoPropio = (n: number) => {
  let x = (n * 2654435761) >>> 0;
  const palabras: string[] = [];
  for (let k = 0; k < 6; k += 1) {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    palabras.push(PALABRAS[x % PALABRAS.length]);
  }
  return `Relleno ${n}: ${palabras.join(' y ')}.`;
};

function corpusBase(): CorpusDePrueba {
  const corpus: CorpusDePrueba = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'autores/vivo.yml': AUTOR_VIVO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'personajes/buzz.yml': BUZZ,
    'citas/buzz--hasta-el-infinito-y-mas-alla.md': atribuida({
      slug: CV,
      texto: 'Hasta el infinito y más allá, guardián del cosmos.',
      autor: undefined,
      personaje: 'buzz',
      procedencia: { año: 1995 },
      origen: 'doblaje',
      variante: { texto: VARIANTE, region: 'espana', origen: 'doblaje' },
    }),
    'citas/buzz--al-rescate-guardian-espacial.md': atribuida({
      slug: SV,
      texto: 'Al rescate, que la galaxia no se defiende sola.',
      autor: undefined,
      personaje: 'buzz',
      procedencia: { año: 1995 },
      // Historia 35.10 — la traducción del sitio: su Página de Cita lo dice.
      origen: 'traduccion-propia',
    }),
    'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
  };
  // Hasta `MIN_CITAS_POR_TEMA` (15), con atribuidas de la Autora Viva.
  for (let i = 1; i <= 12; i += 1) {
    const n = String(i).padStart(2, '0');
    corpus[`citas/vivo--relleno-${n}.md`] = atribuida({
      slug: `vivo-relleno-${n}`,
      texto: textoPropio(i),
      autor: 'vivo',
      procedencia: { obra: 'Relleno de la autora', año: 2011 },
    });
  }
  return corpus;
}

let proyecto = '';
let codigo = -1;
let salida = '';

beforeAll(async () => {
  const r = await construirConCorpus(corpusBase(), {
    jornada: '2026-11-12',
    ficheros: conLaPuertaAbierta(),
    conBusqueda: true,
  });
  proyecto = r.proyecto;
  codigo = r.codigo;
  salida = r.salida;
}, 600_000);

afterAll(async () => {
  if (proyecto !== '') await limpiar(proyecto);
});

const cita = (slug: string) => readFileSync(paginaConstruida(proyecto, `/cita/${slug}/`), 'utf8');

/** La etiqueta de apertura de cada antepasado del índice `en`, con los guiones y estilos fuera. */
function antepasados(html: string, en: number): string[] {
  const VACIOS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const pila: { nombre: string; etiqueta: string }[] = [];
  const delante = html.slice(0, en).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gu, '').replace(/<!--[\s\S]*?-->/gu, '');
  for (const m of delante.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/gu)) {
    const nombre = m[2].toLowerCase();
    if (m[1] === '/') {
      const i = pila.map((p) => p.nombre).lastIndexOf(nombre);
      if (i !== -1) pila.length = i;
    } else if (!VACIOS.has(nombre) && m[3] !== '/' && nombre !== '!doctype') {
      pila.push({ nombre, etiqueta: m[0] });
    }
  }
  return pila.map((p) => p.etiqueta);
}

describe('Historia 35.6 — la Página de Cita atribuida con Variante', () => {
  it('construye', () => {
    expect(codigo, salida).toBe(0);
  });

  it('pinta «En España: «…»» entre la Atribución y Copiar, sin nada entre la línea y la Fila de acciones', () => {
    const pagina = cita(CV);
    const linea = /<p class="variante"[^>]*>\s*En España: «([^<]*)»\s*<\/p>\s*(<[^>]*>)/u.exec(pagina);
    expect(linea, 'la línea de la Variante').not.toBeNull();
    expect(linea![1]).toBe(VARIANTE);
    expect(linea![2]).toMatch(/^<div class="fila-de-acciones/u);
    expect(pagina.indexOf('class="variante"')).toBeGreaterThan(pagina.indexOf('</figcaption>'));
  });

  it('la línea es texto: sin lang, sin tabindex, sin enlace, con los tokens en su style', () => {
    const p = /<p class="variante"[^>]*>[\s\S]*?<\/p>/u.exec(cita(CV))![0];
    expect(p).not.toMatch(/\blang=|tabindex|<a\b/u);
    expect(p).toMatch(/font-family: var\(--sans\)/u);
    expect(p).toMatch(/font-size: var\(--pie\)/u);
    expect(p).toMatch(/color: var\(--tinta-apagada\)/u);
    expect(p).toMatch(/margin: var\(--unidad\) 0 0/u);
  });

  it('va dentro de data-pagefind-body y fuera de todo data-pagefind-ignore', () => {
    const pagina = cita(CV);
    const ancestros = antepasados(pagina, pagina.indexOf('<p class="variante"'));
    expect(ancestros.some((e) => /data-pagefind-body/u.test(e)), ancestros.join('\n')).toBe(true);
    expect(ancestros.filter((e) => /data-pagefind-ignore/u.test(e))).toEqual([]);
    expect(pagina).not.toMatch(/data-pagefind-meta="[^"]*(infinito y aún|astronauta)/u);
  });

  it('su texto sale solo en la línea: ni lo copiado, ni la Imagen, ni el Fragmento, ni el JSON-LD, ni la meta, ni el título', () => {
    const pagina = cita(CV);
    expect(pagina.split(VARIANTE).length - 1).toBe(1);
    expect(pagina.split('astronauta').length - 1).toBe(1);
    const copiado = /data-texto-plano="([^"]*)"/u.exec(pagina)?.[1];
    expect(copiado).toBeDefined();
    expect(copiado).not.toContain('astronauta');
    expect(/<title>([^<]*)<\/title>/u.exec(pagina)?.[1]).not.toContain('astronauta');
    expect(/<meta name="description" content="([^"]*)"/u.exec(pagina)?.[1]).not.toContain('astronauta');
  });

  it('la atribuida sin Variante no pinta línea ni hueco', () => {
    const pagina = cita(SV);
    expect(pagina).not.toContain('class="variante"');
    expect(pagina).not.toContain('En España');
  });

  it('la Variante no crea slug: las dos Citas de Buzz tienen su página, y ninguna más', async () => {
    const { readdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const citas = readdirSync(join(proyecto, 'dist', 'cita')).filter((n) => n.startsWith('buzz-'));
    expect(citas.sort()).toEqual([SV, CV].sort());
  });

  it('la búsqueda propia la encuentra por tres palabras de la Variante, en la misma Página de Cita', async () => {
    const indice = await indiceDe(proyecto);
    try {
      const resultados = await indice.search('aún astronauta valiente');
      const urls = await Promise.all(resultados.results.map(async (r) => (await r.data()).url));
      expect(urls).toEqual([`/cita/${CV}/`]);
    } finally {
      indice.soltar();
    }
  });
});

describe('Historia 35.10 — la atribuida que es traducción del sitio lo dice', () => {
  const LINEA = 'Traducción de Sabiduría de Bolsillo: no circula ninguna versión en español.';

  it('pinta la línea tras la Atribución y antes de Copiar, como texto con los tokens', () => {
    const pagina = cita(SV);
    const p = /<p class="traduccion-propia"[^>]*>\s*([^<]*?)\s*<\/p>/u.exec(pagina);
    expect(p, 'la línea de la traducción propia').not.toBeNull();
    expect(p![1]).toBe(LINEA);
    expect(pagina.indexOf('class="traduccion-propia"')).toBeGreaterThan(pagina.indexOf('</figcaption>'));
    expect(p![0]).not.toMatch(/\blang=|tabindex|<a\b/u);
    expect(p![0]).toMatch(/style="[^"]*var\(--pie\)/u);
    const ancestros = antepasados(pagina, pagina.indexOf('<p class="traduccion-propia"'));
    expect(ancestros.some((a) => a.includes('data-pagefind-body'))).toBe(true);
  });

  it('una atribuida de otro origen no la lleva, ni hueco', () => {
    expect(cita(CV)).not.toContain('class="traduccion-propia"');
    expect(cita(CV)).not.toContain(LINEA);
  });
});

describe('Historia 35.6 — lo que la Variante no puede ser', () => {
  it('una Cita de siempre con Variante rompe el build nombrando su fichero', async () => {
    const corpus = corpusBase();
    corpus['citas/seneca--no-es-que-tengamos-poco-tiempo.md'] = citaValida({
      variante: { texto: 'Una letra que no es la del documento', region: 'espana', origen: 'original' },
    });
    const r = await construirConCorpus(corpus, { jornada: '2026-11-12', ficheros: conLaPuertaAbierta(), conservar: false });
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toMatch(/seneca--no-es-que-tengamos-poco-tiempo/u);
    expect(r.salida).toMatch(/solo una Cita atribuida declara «variante»/u);
  }, 600_000);

  it('dos atribuidas cuya Variante se repite rompen el build', async () => {
    const corpus = corpusBase();
    corpus['citas/buzz--al-rescate-guardian-espacial.md'] = atribuida({
      slug: SV,
      texto: 'Al rescate, que la galaxia no se defiende sola.',
      autor: undefined,
      personaje: 'buzz',
      procedencia: { año: 1995 },
      variante: { texto: VARIANTE, region: 'espana', origen: 'doblaje' },
    });
    const r = await construirConCorpus(corpus, { jornada: '2026-11-12', ficheros: conLaPuertaAbierta(), conservar: false });
    expect(r.codigo).not.toBe(0);
    // Los dos textos son distintos: lo que coincide es la Variante, y el fallo nombra a la otra Cita.
    expect(r.salida).toMatch(new RegExp(`atribuida «(${SV}|${CV})»[^\\n]*coincide con «(${CV}|${SV})»`, 'u'));
  }, 600_000);
});
