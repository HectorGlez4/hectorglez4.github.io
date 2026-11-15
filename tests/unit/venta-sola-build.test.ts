import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  ATESTIGUADA,
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  TIENDA_DE_PRUEBA,
  citaValida,
  conLaPuertaAbierta,
  construirConCorpus,
  fuenteConModeloEncendido,
  fuenteConTiendaDePrueba,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { bytesDeGuionEnLinea } from './ayuda/guion.js';
import { tarjetaDeObraDe, textosDelEnlace } from './ayuda/tarjeta-de-obra.js';
import { modelosMarcadosEn } from '../../src/lib/ingreso.ts';
import { MAX_BYTES_DE_GUION } from '../../src/lib/umbrales.ts';

/**
 * Historia 35.9 — la Obra con derechos vigentes se vende sola (FR-70, AD-20 y AD-25 v9.1), sobre un
 * sitio construido de verdad.
 *
 * Tres Obras, una por fila de la matriz del spec:
 *
 *   · **la de la Autora Viva** (`vivo: true`), con dos atribuidas —una con Fuente— y dos ediciones en
 *     venta, una de cada formato: con la afiliación encendida y sin congelar, «Dónde leer esta obra»
 *     lleva solo «Electrónica» e «Impresa», dentro del `data-ingreso`; apagada o congelada, no hay
 *     desplegable ni hueco;
 *   · **la de Batman**, Personaje sin Autor, con una atribuida con Fuente: derechos vigentes siempre,
 *     sin ediciones, así que ni «Dónde leer», ni «Cómo citar», ni «Cómo empieza»;
 *   · **la de Séneca**, de dominio público, con la de siempre cotejada y una atribuida de Batman con
 *     Séneca que trae Fuente: «Gratis» con una línea de una Cita, «se tomó 1 de sus 2 citas», y su
 *     «Cómo citar» de siempre.
 *
 * La puerta de la atribuida se abre en la copia (`conLaPuertaAbierta`), la tienda es la inventada
 * (`TIENDA_DE_PRUEBA`) y la congelación se pone en la `umbrales.ts` de la copia: nunca en el árbol.
 */

const AUTORA_VIVA = `nombre: "Autora Viva"
vivo: true
semblanza: "Escritora de hoy."
ordenAlfabetico: "Viva"
`;

const BATMAN = `nombre: "Batman"
universo: "DC Comics"
ordenAlfabetico: "Batman"
`;

const RUTA_VIVA = '/obra/viva/obra-de-la-autora/';
const RUTA_BATMAN = '/obra/batman/el-caballero/';
const RUTA_SENECA = '/obra/seneca/sobre-la-brevedad-de-la-vida/';

const V1 = 'viva-el-tiempo-cabe-en-una-taza';
const V2 = 'viva-la-tarde-se-dobla-sola';
const B1 = 'batman-soy-la-noche';
const B3 = 'seneca-con-batman-en-la-brevedad';

const EDICIONES = [
  'ediciones:',
  `  - tienda: "${TIENDA_DE_PRUEBA.clave}"`,
  '    formato: "impresa"',
  `    url: "https://www.${TIENDA_DE_PRUEBA.dominio}/dp/IMPRESA"`,
  `  - tienda: "${TIENDA_DE_PRUEBA.clave}"`,
  '    formato: "electronica"',
  `    url: "https://www.${TIENDA_DE_PRUEBA.dominio}/dp/ELECTRONICA"`,
];

const fichaDeViva = (extra: readonly string[] = []) =>
  ['autor: "viva"', 'titulo: "Obra de la autora"', 'formas:', '  - "obra de la autora"', ...extra, ''].join('\n');

const atribuida = (campos: Record<string, unknown>) =>
  citaValida({ clase: 'atribuida', estadoDerechos: undefined, fuente: undefined, ...ATESTIGUADA, ...campos });

const FUENTE_DE_ATRIBUIDA = { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Una_pagina_cualquiera' };

function corpus(opciones: { ediciones?: boolean; incipit?: boolean } = {}): Record<string, string> {
  const extra = [
    ...(opciones.ediciones === false ? [] : EDICIONES),
    ...(opciones.incipit === true ? ['incipit:', '  documento: "wikisource-es--obra-de-la-autora"', '  desde: "Había"'] : []),
  ];
  return {
    'autores/seneca.yml': AUTOR_VALIDO,
    'autores/viva.yml': AUTORA_VIVA,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'personajes/batman.yml': BATMAN,
    'obras/viva--obra-de-la-autora.yml': fichaDeViva(extra),
    'obras/batman--el-caballero.yml': [
      'personaje: "batman"',
      'personajes:',
      '  - "batman"',
      'titulo: "El caballero"',
      'formas:',
      '  - "el caballero"',
      '',
    ].join('\n'),
    'obras/seneca--sobre-la-brevedad-de-la-vida.yml': [
      'autor: "seneca"',
      'titulo: "Sobre la brevedad de la vida"',
      'formas:',
      '  - "sobre la brevedad de la vida"',
      '',
    ].join('\n'),
    'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
    'citas/seneca--con-batman-en-la-brevedad.md': atribuida({
      slug: B3,
      texto: 'Quien guarda silencio en el tejado conoce cada promesa.',
      autor: 'seneca',
      personaje: 'batman',
      procedencia: { obra: 'Sobre la brevedad de la vida', año: 2000 },
      fuente: FUENTE_DE_ATRIBUIDA,
    }),
    'citas/viva--el-tiempo-cabe-en-una-taza.md': atribuida({
      slug: V1,
      texto: 'La autora dice que el tiempo cabe en una taza.',
      autor: 'viva',
      procedencia: { obra: 'Obra de la autora', año: 2010 },
      fuente: FUENTE_DE_ATRIBUIDA,
    }),
    'citas/viva--la-tarde-se-dobla-sola.md': atribuida({
      slug: V2,
      texto: 'La tarde se dobla sola cuando nadie la mira.',
      autor: 'viva',
      procedencia: { obra: 'Obra de la autora', año: 2010 },
    }),
    'citas/batman--soy-la-noche.md': atribuida({
      slug: B1,
      texto: 'Soy la noche que vigila la ciudad dormida.',
      autor: undefined,
      personaje: 'batman',
      procedencia: { obra: 'El caballero', año: 2000 },
      fuente: FUENTE_DE_ATRIBUIDA,
    }),
  };
}

const JORNADA = '2026-11-15';

/** La `ingreso.ts` de la copia: con la tienda inventada y, si se pide, la afiliación encendida. */
async function ingreso(afiliacion: 'encendida' | 'apagada'): Promise<string> {
  const conTienda = fuenteConTiendaDePrueba(await readFile(resolve(RAIZ, 'src/lib/ingreso.ts'), 'utf8'));
  return afiliacion === 'encendida' ? fuenteConModeloEncendido(conTienda, 'afiliacion-de-libros') : conTienda;
}

/** La `umbrales.ts` de la copia con la familia Obra congelada, partiendo de la que traiga `ficheros`. */
function congelada(ficheros: Record<string, string>): Record<string, string> {
  const declaracion = 'export const CONGELACION_DE_OBRAS: CongelacionDeObras | undefined = undefined;';
  const actual = ficheros['src/lib/umbrales.ts'] ?? readFileSync(resolve(RAIZ, 'src/lib/umbrales.ts'), 'utf8');
  if (!actual.includes(declaracion)) throw new Error('la congelación del árbol no está en `undefined`');
  return {
    ...ficheros,
    'src/lib/umbrales.ts': actual.replace(
      declaracion,
      "export const CONGELACION_DE_OBRAS: CongelacionDeObras | undefined = {\n  desde: '2026-12-06',\n  indexables: [],\n};",
    ),
  };
}

/** La huella de cada fichero de un `dist/`, por su ruta relativa. */
async function huellaDe(directorio: string): Promise<Record<string, string>> {
  const huellas: Record<string, string> = {};
  for (const entrada of await readdir(directorio, { recursive: true, withFileTypes: true })) {
    if (!entrada.isFile()) continue;
    const completa = join(entrada.parentPath, entrada.name);
    huellas[completa.slice(directorio.length + 1)] = createHash('sha256').update(await readFile(completa)).digest('hex');
  }
  return huellas;
}

/** El texto de cada `<summary>` de una página, sin el glifo ni el marcado. */
const desplegables = (pagina: string) =>
  [...pagina.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/gu)].map((m) =>
    m[1].replace(/<span class="glifo"[\s\S]*$/u, '').replace(/<[^>]*>/gu, '').trim(),
  );

/** Los rótulos de grupo de una página («Gratis», «Electrónica», «Impresa»). */
const rotulosDeGrupo = (pagina: string) =>
  [...pagina.matchAll(/<p class="rotulo-de-grupo"[^>]*>([\s\S]*?)<\/p>/gu)].map((m) => m[1].trim());

/** El `<main>` de una página: fuera de él están el armazón y sus guiones. */
const principal = (pagina: string) => /<main[\s\S]*<\/main>/u.exec(pagina)?.[0] ?? '';

const construidos: string[] = [];
const construir = async (corpusDePrueba: Record<string, string>, ficheros: Record<string, string>) => {
  const r = await construirConCorpus(corpusDePrueba, { jornada: JORNADA, ficheros });
  construidos.push(r.proyecto);
  return r;
};

afterAll(async () => {
  await Promise.all(construidos.splice(0).map(limpiar));
});

describe('Historia 35.9 — la Obra con derechos vigentes, con la afiliación encendida', () => {
  let proyecto = '';
  let salida = '';
  let codigo = -1;
  let apagado = '';

  beforeAll(async () => {
    const encendida = await construir(corpus(), conLaPuertaAbierta({}, { 'src/lib/ingreso.ts': await ingreso('encendida') }));
    ({ proyecto, salida, codigo } = encendida);
    const sinModelo = await construir(corpus(), conLaPuertaAbierta({}, { 'src/lib/ingreso.ts': await ingreso('apagada') }));
    expect(sinModelo.codigo, sinModelo.salida).toBe(0);
    apagado = sinModelo.proyecto;
  }, 900_000);

  const html = (ruta: string, de = proyecto) => readFileSync(paginaConstruida(de, ruta), 'utf8');

  it('construye', () => {
    expect(codigo, salida).toBe(0);
  });

  it('venta sola: «Dónde leer esta obra» con solo «Electrónica» e «Impresa», dentro de su `data-ingreso`', () => {
    const pagina = principal(html(RUTA_VIVA));
    expect(desplegables(pagina)).toEqual(['Dónde leer esta obra']);
    expect(rotulosDeGrupo(pagina)).toEqual(['Electrónica', 'Impresa']);
    expect(modelosMarcadosEn(pagina)).toEqual(['afiliacion-de-libros']);
    const marcado = /<div data-ingreso="afiliacion-de-libros"[^>]*>/u.exec(pagina)?.[0] ?? '';
    // Va sola: sin el margen que la separaría de «Gratis» (UX-DR127).
    expect(marcado).not.toContain('margin-top');
    expect(pagina).toContain(`https://www.${TIENDA_DE_PRUEBA.dominio}/dp/IMPRESA`);
    expect(pagina).toContain(`https://www.${TIENDA_DE_PRUEBA.dominio}/dp/ELECTRONICA`);
    // Ni «Gratis», ni la frase de lo tomado, ni la del cotejo, aunque una de sus atribuidas traiga Fuente.
    expect(pagina).not.toContain('Gratis');
    expect(pagina).not.toContain('De esta edición');
    expect(pagina).not.toContain('Ninguna de sus citas tiene todavía documento cotejado.');
    expect(pagina).not.toContain('es.wikisource.org');
  });

  it('y el build no avisa «Ediciones sin edición cotejada» de ella: sus ediciones van solas', () => {
    expect(salida).not.toMatch(/Ediciones sin edición cotejada: corpus\/obras\/viva--obra-de-la-autora/u);
  });

  it('sin «Cómo citar» ni «Cómo empieza», y sin donaciones ni publicidad', () => {
    const pagina = html(RUTA_VIVA);
    expect(desplegables(pagina)).not.toContain('Cómo citar');
    expect(desplegables(pagina)).not.toContain('Cómo empieza');
    expect(pagina).not.toMatch(/data-ingreso="(?:donaciones|publicidad-acotada)"/u);
  });

  it('cabe en MAX_BYTES_DE_GUION con el Modelo puesto', () => {
    expect(bytesDeGuionEnLinea(html(RUTA_VIVA))).toBeLessThan(MAX_BYTES_DE_GUION);
  });

  it('Personaje: su Obra tiene derechos vigentes, y sin ediciones no hay desplegable ni hueco', () => {
    const pagina = html(RUTA_BATMAN);
    expect(desplegables(pagina)).toEqual([]);
    expect(pagina).not.toContain('Dónde leer esta obra');
    expect(pagina).not.toContain('Gratis');
    expect(pagina).not.toContain('Ninguna de sus citas tiene todavía documento cotejado.');
    expect(modelosMarcadosEn(pagina)).toEqual([]);
  });

  it('dominio público con una atribuida con Fuente: «Gratis» con una línea de una Cita, y su «Cómo citar»', () => {
    const pagina = principal(html(RUTA_SENECA));
    expect(rotulosDeGrupo(pagina)).toEqual(['Gratis']);
    expect(pagina).toContain('De esta edición se tomó 1 de sus 2 citas.');
    expect(desplegables(pagina)).toEqual(['Dónde leer esta obra', 'Cómo citar']);
    expect(pagina).not.toContain('Una_pagina_cualquiera');
  });

  it('la Tarjeta de Obra de sus atribuidas dice «Ver la obra ›», igual con el Modelo encendido o apagado', () => {
    for (const slug of [V1, V2, B1]) {
      const tarjeta = tarjetaDeObraDe(html(`/cita/${slug}/`));
      expect(tarjeta, slug).toBeDefined();
      const filas = [...(tarjeta ?? '').matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gu)].map((m) => textosDelEnlace(m[1]).vista);
      expect(filas.some((fila) => /^Ver la obra\s*›$/u.test(fila.trim())), `${slug}: ${filas.join(' | ')}`).toBe(true);
      expect(filas.join(' '), slug).not.toContain('dónde leerla');
      expect(tarjeta, slug).toBe(tarjetaDeObraDe(html(`/cita/${slug}/`, apagado)));
    }
  });

  it('y sus Páginas de Cita no llevan «Lee el pasaje»', () => {
    for (const slug of [V1, V2, B1]) expect(desplegables(html(`/cita/${slug}/`)), slug).not.toContain('Lee el pasaje');
  });
});

describe('Historia 35.9 — apagada o congelada, la Obra con derechos vigentes no tiene «Dónde leer esta obra»', () => {
  let apagadaConEdiciones = '';
  let apagadaSinEdiciones = '';
  let congeladaEncendida = '';

  beforeAll(async () => {
    const apagada = await ingreso('apagada');
    const a = await construir(corpus(), conLaPuertaAbierta({}, { 'src/lib/ingreso.ts': apagada }));
    expect(a.codigo, a.salida).toBe(0);
    apagadaConEdiciones = a.proyecto;
    const b = await construir(corpus({ ediciones: false }), conLaPuertaAbierta({}, { 'src/lib/ingreso.ts': apagada }));
    expect(b.codigo, b.salida).toBe(0);
    apagadaSinEdiciones = b.proyecto;
    const c = await construir(
      corpus(),
      congelada(conLaPuertaAbierta({}, { 'src/lib/ingreso.ts': await ingreso('encendida') })),
    );
    expect(c.codigo, c.salida).toBe(0);
    congeladaEncendida = c.proyecto;
  }, 900_000);

  const html = (de: string, ruta: string) => readFileSync(paginaConstruida(de, ruta), 'utf8');

  it('apagada: ni `<summary>`, ni rótulo, ni hueco', () => {
    const pagina = html(apagadaConEdiciones, RUTA_VIVA);
    expect(desplegables(pagina)).toEqual([]);
    expect(pagina).not.toContain('Dónde leer esta obra');
    expect(modelosMarcadosEn(pagina)).toEqual([]);
  });

  it('apagada, `dist/` es el mismo byte a byte con ediciones declaradas o sin ellas', async () => {
    const con = await huellaDe(join(apagadaConEdiciones, 'dist'));
    expect(Object.keys(con).length).toBeGreaterThan(0);
    expect(con).toEqual(await huellaDe(join(apagadaSinEdiciones, 'dist')));
  });

  it('congelada, aunque el Modelo esté encendido: tampoco', () => {
    const pagina = html(congeladaEncendida, RUTA_VIVA);
    expect(desplegables(pagina)).toEqual([]);
    expect(pagina).not.toContain('Dónde leer esta obra');
    expect(modelosMarcadosEn(pagina)).toEqual([]);
  });
});

describe('Historia 35.9 — una Obra con derechos vigentes no declara incipit', () => {
  it('el build se para nombrando la ficha', async () => {
    const r = await construir(corpus({ incipit: true, ediciones: false }), conLaPuertaAbierta());
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain(
      'corpus/obras/viva--obra-de-la-autora.yml → declara «incipit» y la Obra tiene derechos vigentes',
    );
  }, 600_000);
});
