import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  fuenteConModeloEncendido,
  fuenteConTiendaDePrueba,
  limpiar,
  paginaConstruida as rutaConstruida,
} from './ayuda/construir.js';
import { etiquetasDeGuionExterno } from './ayuda/guion.js';
import { indiceDe } from './ayuda/pagefind.js';
import { MARCADOR_DE_FECHA_DE_CONSULTA } from '../../src/lib/atribucion.ts';
import { guionExternoDe } from '../../src/lib/guiones.ts';
import { CITAS_POR_PAGINA } from '../../src/lib/umbrales.ts';
import { componerDocumento } from '../../tools/lib/documento.ts';

/**
 * Historia 32.5 — «Cómo citar» en la página 1 de la Obra, leído de `dist/` (FR-58, UX-DR129).
 *
 * Las formas literales las fija `tests/unit/atribucion.test.ts`; aquí, lo que solo dice lo
 * construido: que es el último desplegable del contenedor de la página 1 —tras «Cómo empieza» si
 * hay incipit, solo si no— y va antes del listado; que lleva los tres estilos sin fecha, con su
 * marcador vacío y su botón `hidden`; sin enlaces ni zona; fuera del JSON-LD y de Pagefind; sin la
 * jornada del build; que las 2+ no lo llevan ni piden la isla; y que el contenedor sale idéntico
 * byte a byte con la afiliación encendida. Lo que hace con y sin guion lo mira
 * `tests/e2e/como-citar-obra.spec.ts`.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const JORNADA = '2026-11-08';
const DOC = 'wikisource-es--sobre-la-brevedad-de-la-vida';
const URL_BREVEDAD = 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida';
const URL_IRA = 'https://es.wikisource.org/wiki/De_la_ira';
const VERSOS = ['Primer verso del poema de prueba,', 'segundo verso que lo sigue.'];
const TRADUCTOR = 'Juan Pérez';
/** Más de una página, para que haya `/2/`. */
const TOTAL = CITAS_POR_PAGINA + 2;
/** Las de «De la ira»: bastantes para que «Sobre la brevedad» quede por debajo del 90 % del Autor y se indexe. */
const DE_LA_IRA = 8;
const frase = (i: number) => `Frase número ${String(i).padStart(3, '0')} del catálogo de prueba.`;
const fraseDeIra = (i: number) => `Sentencia ${String(i).padStart(2, '0')} sobre la ira y el enojo.`;

const DOCUMENTO = componerDocumento(
  { fuente: 'wikisource-es', obra: 'Sobre la brevedad de la vida', año: 49, url: URL_BREVEDAD, recuperado: '2026-11-08', lineas: 'verso' },
  'Sobre la brevedad de la vida\nAño de publicación: 49',
  [`  ${VERSOS[0]}`, `  ${VERSOS[1]}`, '', ...Array.from({ length: TOTAL }, (_, i) => frase(i))].join('\n'),
);

const fichaDe = (titulo: string, forma: string, incipit?: string) =>
  `autor: "seneca"\ntitulo: "${titulo}"\nformas:\n  - "${forma}"\n` +
  (incipit === undefined ? '' : `incipit:\n  documento: "${DOC}"\n  desde: "${incipit}"\n`);

function corpus(): Record<string, string> {
  const c: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'obras/seneca--sobre-la-brevedad-de-la-vida.yml': fichaDe('Sobre la brevedad de la vida', 'sobre la brevedad de la vida', 'Primer verso'),
    'obras/seneca--de-la-ira.yml': fichaDe('De la ira', 'de la ira'),
    [`fuentes/${DOC}.txt`]: DOCUMENTO,
  };
  for (let i = 0; i < TOTAL; i += 1) {
    const orden = String(i).padStart(3, '0');
    c[`citas/seneca--frase-${orden}.md`] = citaValida({
      texto: frase(i),
      slug: `seneca-frase-${orden}`,
      procedencia: { obra: 'Sobre la brevedad de la vida', año: 49, traduccion: { traductor: TRADUCTOR } },
    });
  }
  for (let i = 0; i < DE_LA_IRA; i += 1) {
    const orden = String(i).padStart(2, '0');
    c[`citas/seneca--ira-${orden}.md`] = citaValida({
      texto: fraseDeIra(i),
      slug: `seneca-ira-${orden}`,
      procedencia: { obra: 'De la ira', año: 41 },
      fuente: { id: 'wikisource-es', url: URL_IRA },
    });
  }
  return c;
}

/** La declaración del tope del incipit, con el valor que tenga el árbol: la prueba no lo fija. */
const DECLARACION_DEL_TOPE = /^export const MAX_CARACTERES_DEL_INCIPIT: number \| undefined = [^;\n]+;$/mu;
const conElTope = (umbrales: string, valor: string) =>
  umbrales.replace(DECLARACION_DEL_TOPE, `export const MAX_CARACTERES_DEL_INCIPIT: number | undefined = ${valor};`);

const paginaConstruida = (proyecto: string, ruta: string) => readFileSync(rutaConstruida(proyecto, ruta), 'utf8');
const BREVEDAD = '/obra/seneca/sobre-la-brevedad-de-la-vida/';
const IRA = '/obra/seneca/de-la-ira/';
/** La apertura del contenedor, sin el `>`: Astro le añade la clase de ámbito de la página. */
const APERTURA = '<div data-pagefind-ignore="all" style="margin-top: calc(var(--unidad) * 3)"';

/** El contenedor de los desplegables de la página 1, entero, o `undefined`. */
function contenedorDe(html: string): string | undefined {
  const inicio = html.indexOf(APERTURA);
  if (inicio === -1) return undefined;
  const listado = html.indexOf('<ul class="listado"', inicio);
  const fin = html.lastIndexOf('</details>', listado);
  const cierre = html.indexOf('</div>', fin);
  return html.slice(inicio, cierre + '</div>'.length);
}

/** Los `<summary>` de un marcado, por su texto sin el glifo. */
const rotulosDe = (marcado: string) =>
  [...marcado.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/gu)].map((m) =>
    m[1].replace(/<span class="glifo"[\s\S]*$/u, '').replace(/<[^>]+>/g, '').trim(),
  );

/** El marcado del Desplegable «Cómo citar». */
function comoCitarDe(html: string): string {
  const contenedor = contenedorDe(html) ?? '';
  const inicio = contenedor.lastIndexOf('<details');
  return contenedor.slice(inicio, contenedor.lastIndexOf('</details>') + '</details>'.length);
}

describe('Historia 32.5 — «Cómo citar» en la Página de Obra construida', () => {
  let umbrales: string;
  let proyecto: string;
  let brevedad: string;
  let ira: string;

  beforeAll(async () => {
    umbrales = await readFile(join(RAIZ, 'src/lib/umbrales.ts'), 'utf8');
    expect(umbrales, 'falta la declaración de `MAX_CARACTERES_DEL_INCIPIT`').toMatch(DECLARACION_DEL_TOPE);
    const resultado = await construirConCorpus(corpus(), {
      jornada: JORNADA,
      conBusqueda: true,
      ficheros: { 'src/lib/umbrales.ts': conElTope(umbrales, '120') },
    });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
    brevedad = paginaConstruida(proyecto, BREVEDAD);
    ira = paginaConstruida(proyecto, IRA);
  }, 600_000);

  it('es el último desplegable del contenedor: tras «Cómo empieza» si hay incipit, solo si no, y antes del listado', () => {
    for (const [pagina, esperados] of [
      [brevedad, ['Cómo empieza', 'Cómo citar']],
      [ira, ['Cómo citar']],
    ] as const) {
      const contenedor = contenedorDe(pagina);
      expect(contenedor).toBeDefined();
      expect(pagina.indexOf(APERTURA)).toBeGreaterThan(pagina.indexOf('</header>'));
      expect(pagina.indexOf('<ul class="listado"')).toBeGreaterThan(pagina.indexOf(APERTURA) + contenedor!.length - 1);
      expect(rotulosDe(contenedor!)).toEqual(esperados);
      // Los desplegables son los hijos directos y el contenedor acaba en el último.
      expect(contenedor!.match(/<details class="desplegable"/gu)).toHaveLength(esperados.length);
      expect(contenedor!).toMatch(/<\/details>\s*<\/div>$/u);
      // Uno solo en toda la página, cerrado.
      expect(rotulosDe(pagina).filter((r) => r === 'Cómo citar')).toHaveLength(1);
      expect(comoCitarDe(pagina)).not.toMatch(/<details\b[^>]*\bopen\b/u);
    }
  });

  it('tres estilos con su Referencia, su línea sin fecha, su marcador vacío y su botón `hidden`, y la región dentro', () => {
    const bloque = comoCitarDe(brevedad);
    expect(bloque).toContain('data-como-citar');
    for (const [estilo, rotulo] of [
      ['apa', 'APA'],
      ['mla', 'MLA'],
      ['chicago', 'Chicago'],
    ]) {
      expect(bloque).toMatch(new RegExp(`<span ${MARCADOR_DE_FECHA_DE_CONSULTA}="${estilo}"[^>]*></span>`));
      expect(bloque).toMatch(new RegExp(`<button\\b[^>]*data-copiar-texto[^>]*aria-label="Copiar ${rotulo}"[^>]*hidden[^>]*>`));
      expect(bloque).toContain(`>${rotulo}</p>`);
    }
    expect(bloque.match(/data-referencia/g)).toHaveLength(3);
    expect(bloque.match(/Sin fecha de consulta: añade la de hoy\./g)).toHaveLength(3);
    const regiones = [...bloque.matchAll(/<p\b([^>]*)role="status"([^>]*)>([\s\S]*?)<\/p>/g)];
    expect(regiones).toHaveLength(1);
    expect(regiones[0][3]).toBe('');
    // El título en cursiva, el traductor de la edición que encabeza y la canónica como texto.
    expect(bloque.match(/<i\b[^>]*>Sobre la brevedad de la vida<\/i>/g)).toHaveLength(3);
    expect(bloque).toContain(`(${TRADUCTOR}, Trad.)`);
    expect(bloque).toContain(`traducido por ${TRADUCTOR}, 49`);
    expect(bloque).toContain(`Traducido por ${TRADUCTOR}.`);
    expect(bloque.match(new RegExp(`https?://[^\\s<]+${BREVEDAD}`, 'g'))).toHaveLength(3);
    // «De la ira», sin traductor: sin «Trad.».
    expect(comoCitarDe(ira)).not.toMatch(/Trad\.|traducido|Traducido/u);
  });

  it('sin enlaces ni zona, ningún «Cómo citar» lleva la jornada del build, y el JSON-LD no lo nombra', () => {
    for (const pagina of [brevedad, ira]) {
      const bloque = comoCitarDe(pagina);
      expect(bloque).not.toMatch(/data-zona|data-sin-zona|<a\b/u);
      expect(bloque).not.toMatch(/[?&](de|via)=/u);
      for (const fecha of ['8 de noviembre de 2026', '8 nov. 2026', JORNADA, 'Recuperado el', 'Consultado el']) {
        expect(bloque, fecha).not.toContain(fecha);
      }
      const ld = [...pagina.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      expect(ld.length).toBeGreaterThan(0);
      for (const cuerpo of ld) expect(cuerpo).not.toMatch(/Cómo citar|APA|MLA|Chicago|Recuperado|Trad\./u);
    }
  });

  it('la página 1 pide la isla una vez; las 2+ no llevan ni el bloque ni la isla', () => {
    const deCopiar = (html: string) => etiquetasDeGuionExterno(html).filter((e) => guionExternoDe(e.src)?.id === 'copiar-referencia');
    expect(deCopiar(brevedad)).toHaveLength(1);
    expect(deCopiar(ira)).toHaveLength(1);
    const pagina2 = paginaConstruida(proyecto, `${BREVEDAD}2/`);
    expect(pagina2).toContain('cabecera-de-obra');
    expect(contenedorDe(pagina2)).toBeUndefined();
    expect(pagina2).not.toContain('data-como-citar');
    expect(deCopiar(pagina2)).toEqual([]);
  });

  it('Pagefind no lo indexa: la Obra se encuentra por su título, y no por una palabra que solo está en el bloque', async () => {
    const indice = await indiceDe(proyecto);
    try {
      const rutas = async (termino: string) =>
        (await Promise.all((await indice.search(termino)).results.map((r) => r.data()))).map((d) => d.url);
      expect(await rutas('brevedad')).toContain(BREVEDAD);
      for (const termino of ['añade', 'Chicago', 'MLA', 'Trad', 'traducido', 'Recuperado']) {
        expect((await rutas(termino)).filter((u) => u.startsWith('/obra/')), termino).toEqual([]);
      }
    } finally {
      indice.soltar();
    }
  });

  it('el contenedor de los desplegables sale byte a byte igual con la afiliación encendida y una tienda declarada', async () => {
    const fuente = await readFile(join(RAIZ, 'src/lib/ingreso.ts'), 'utf8');
    const encendida = fuenteConModeloEncendido(fuenteConTiendaDePrueba(fuente), 'afiliacion-de-libros');
    const otro = await construirConCorpus(corpus(), {
      jornada: JORNADA,
      ficheros: { 'src/lib/ingreso.ts': encendida, 'src/lib/umbrales.ts': conElTope(umbrales, '120') },
    });
    aLimpiar.push(otro.proyecto);
    expect(otro.codigo, otro.salida).toBe(0);
    for (const ruta of [BREVEDAD, IRA]) {
      const contenedor = contenedorDe(paginaConstruida(proyecto, ruta));
      expect(contenedor).toBeDefined();
      expect(contenedorDe(paginaConstruida(otro.proyecto, ruta)), ruta).toBe(contenedor);
    }
  }, 600_000);
});
