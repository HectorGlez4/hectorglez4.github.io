import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import {
  ESTILOS_DE_REFERENCIA,
  fechaDeConsulta,
  fragmentoParaInsertar,
  citaTieneComoCitar,
  nombreEnAtribucion,
  nombreEnReferencia,
  partesDelNombre,
  referenciaDeCita,
  referenciaEnTexto,
  referenciasDeCita,
  type EstiloDeReferencia,
  type SegmentoDeReferencia,
} from '../../src/lib/atribucion.ts';
import { aplanarAutor, type Autor, type Cita } from '../../src/lib/publicado.ts';
import type { ObraResuelta } from '../../src/lib/obras.ts';
import { MAX_CARACTERES_IMAGEN } from '../../src/lib/umbrales.ts';

/**
 * Historia 30.3 — «Cómo citar»: las formas literales de APA, MLA y Chicago (FR-58, AD-28).
 *
 * Las formas son un supuesto del spec que **revisa Héctor**: esta tabla es el sitio donde se fijan,
 * y cambiarlas es cambiar la tabla y `src/lib/atribucion.ts`, nada más. `*…*` marca lo que va en
 * `<i>` (en el texto que se copia, sin marca); la fecha de consulta, el 8 de noviembre de 2026.
 */

const U = 'https://ejemplo.org/cita/x/';
const X = 'Yo soy un hombre sincero de donde crece la palma.';
const HOY = new Date(2026, 10, 8, 12, 0, 0);

const obra = (titulo: string) => ({ titulo }) as ObraResuelta;

function citaDe(campos: Partial<Cita> = {}): Cita {
  return {
    slug: 'x',
    texto: X,
    autor: 'jose-marti',
    temas: [],
    procedencia: { año: 1891 },
    obra: obra('Versos sencillos'),
    fuente: { id: 'wikisource-es', nombre: 'Wikisource', url: 'https://es.wikisource.org/wiki/Versos_sencillos' },
    aptaParaPortada: false,
    ...campos,
  } as Cita;
}

const autorDe = (nombre: string, clave?: string, revisada = true): Autor =>
  ({
    slug: 'a',
    nombre,
    semblanza: '',
    añoFallecimiento: 1900,
    ...(clave !== undefined ? { ordenAlfabetico: clave } : {}),
    ...(revisada && clave !== undefined ? { ordenRevisado: '2026-10-28' } : {}),
  }) as Autor;

const MARTI = autorDe('José Martí', 'Martí');
const MARTI_SIN_REVISAR = autorDe('José Martí', 'Martí', false);

/** La Referencia con `*…*` alrededor de lo que va en cursiva y la fecha dada (o sin ella). */
function conMarcas(segmentos: readonly SegmentoDeReferencia[], fecha?: Date): string {
  return segmentos
    .map((s) => ('fecha' in s ? (fecha ? fechaDeConsulta(s.fecha, fecha) : '') : s.cursiva ? `*${s.texto}*` : s.texto))
    .join('');
}

const casos: { caso: string; cita: Cita; autor: Autor; apa: string; mla: string; chicago: string }[] = [
  {
    caso: 'con todo y la clave revisada',
    cita: citaDe(),
    autor: MARTI,
    apa: `Martí, J. (1891). «${X}». En *Versos sencillos*. Wikisource. Sabiduría de Bolsillo. Recuperado el 8 de noviembre de 2026 de ${U}`,
    mla: `Martí, José. «${X}». *Versos sencillos*, 1891. Wikisource. *Sabiduría de Bolsillo*, ${U}. Consultado el 8 nov. 2026.`,
    chicago: `Martí, José. *Versos sencillos*. 1891. Wikisource. «${X}». Sabiduría de Bolsillo. Consultado el 8 de noviembre de 2026. ${U}.`,
  },
  {
    caso: 'con la clave sin revisar: el nombre tal cual',
    cita: citaDe(),
    autor: MARTI_SIN_REVISAR,
    apa: `José Martí (1891). «${X}». En *Versos sencillos*. Wikisource. Sabiduría de Bolsillo. Recuperado el 8 de noviembre de 2026 de ${U}`,
    mla: `José Martí. «${X}». *Versos sencillos*, 1891. Wikisource. *Sabiduría de Bolsillo*, ${U}. Consultado el 8 nov. 2026.`,
    chicago: `José Martí. *Versos sencillos*. 1891. Wikisource. «${X}». Sabiduría de Bolsillo. Consultado el 8 de noviembre de 2026. ${U}.`,
  },
  {
    caso: 'sin Obra: sin título ni traducción',
    cita: citaDe({ obra: undefined, procedencia: { año: 1891, traduccion: { traductor: 'Nadie' } } }),
    autor: MARTI,
    apa: `Martí, J. (1891). «${X}». Wikisource. Sabiduría de Bolsillo. Recuperado el 8 de noviembre de 2026 de ${U}`,
    mla: `Martí, José. «${X}». 1891. Wikisource. *Sabiduría de Bolsillo*, ${U}. Consultado el 8 nov. 2026.`,
    chicago: `Martí, José. 1891. Wikisource. «${X}». Sabiduría de Bolsillo. Consultado el 8 de noviembre de 2026. ${U}.`,
  },
  {
    caso: 'sin año ni Fuente',
    cita: citaDe({ procedencia: {}, fuente: undefined }),
    autor: MARTI,
    apa: `Martí, J. «${X}». En *Versos sencillos*. Sabiduría de Bolsillo. Recuperado el 8 de noviembre de 2026 de ${U}`,
    mla: `Martí, José. «${X}». *Versos sencillos*. *Sabiduría de Bolsillo*, ${U}. Consultado el 8 nov. 2026.`,
    chicago: `Martí, José. *Versos sencillos*. «${X}». Sabiduría de Bolsillo. Consultado el 8 de noviembre de 2026. ${U}.`,
  },
  {
    caso: 'sin Obra, año ni Fuente, con un nombre sin revisar',
    cita: citaDe({ obra: undefined, procedencia: {}, fuente: undefined }),
    autor: MARTI_SIN_REVISAR,
    apa: `José Martí. «${X}». Sabiduría de Bolsillo. Recuperado el 8 de noviembre de 2026 de ${U}`,
    mla: `José Martí. «${X}». *Sabiduría de Bolsillo*, ${U}. Consultado el 8 nov. 2026.`,
    chicago: `José Martí. «${X}». Sabiduría de Bolsillo. Consultado el 8 de noviembre de 2026. ${U}.`,
  },
  {
    caso: 'traducida, con el año de la traducción; un solo nombre',
    cita: citaDe({
      texto: 'Aprovecha el día.',
      obra: obra('Odas'),
      procedencia: { año: -23, traduccion: { traductor: 'Germán Salinas', año: 1909 } },
    }),
    autor: autorDe('Horacio', 'Horacio'),
    apa: `Horacio (23 a. C.). «Aprovecha el día.». En *Odas* (Germán Salinas, Trad., 1909). Wikisource. Sabiduría de Bolsillo. Recuperado el 8 de noviembre de 2026 de ${U}`,
    mla: `Horacio. «Aprovecha el día.». *Odas*, traducido por Germán Salinas, 1909, 23 a. C. Wikisource. *Sabiduría de Bolsillo*, ${U}. Consultado el 8 nov. 2026.`,
    chicago: `Horacio. *Odas*. 23 a. C. Traducido por Germán Salinas, 1909. Wikisource. «Aprovecha el día.». Sabiduría de Bolsillo. Consultado el 8 de noviembre de 2026. ${U}.`,
  },
  {
    caso: 'traducida, sin año de traducción ni de la Cita',
    cita: citaDe({ texto: 'Aprovecha el día.', obra: obra('Odas'), procedencia: { traduccion: { traductor: 'Germán Salinas' } } }),
    autor: autorDe('Horacio', 'Horacio'),
    apa: `Horacio. «Aprovecha el día.». En *Odas* (Germán Salinas, Trad.). Wikisource. Sabiduría de Bolsillo. Recuperado el 8 de noviembre de 2026 de ${U}`,
    mla: `Horacio. «Aprovecha el día.». *Odas*, traducido por Germán Salinas. Wikisource. *Sabiduría de Bolsillo*, ${U}. Consultado el 8 nov. 2026.`,
    chicago: `Horacio. *Odas*. Traducido por Germán Salinas. Wikisource. «Aprovecha el día.». Sabiduría de Bolsillo. Consultado el 8 de noviembre de 2026. ${U}.`,
  },
  {
    caso: 'un título que acaba en interrogación: sin punto detrás',
    cita: citaDe({ obra: obra('¿Qué es la vida?'), fuente: undefined }),
    autor: MARTI,
    apa: `Martí, J. (1891). «${X}». En *¿Qué es la vida?* Sabiduría de Bolsillo. Recuperado el 8 de noviembre de 2026 de ${U}`,
    mla: `Martí, José. «${X}». *¿Qué es la vida?*, 1891. *Sabiduría de Bolsillo*, ${U}. Consultado el 8 nov. 2026.`,
    chicago: `Martí, José. *¿Qué es la vida?* 1891. «${X}». Sabiduría de Bolsillo. Consultado el 8 de noviembre de 2026. ${U}.`,
  },
  {
    caso: 'un título que acaba en puntos suspensivos: sin punto detrás',
    cita: citaDe({ obra: obra('Y sin embargo…'), fuente: undefined }),
    autor: MARTI,
    apa: `Martí, J. (1891). «${X}». En *Y sin embargo…* Sabiduría de Bolsillo. Recuperado el 8 de noviembre de 2026 de ${U}`,
    mla: `Martí, José. «${X}». *Y sin embargo…*, 1891. *Sabiduría de Bolsillo*, ${U}. Consultado el 8 nov. 2026.`,
    chicago: `Martí, José. *Y sin embargo…* 1891. «${X}». Sabiduría de Bolsillo. Consultado el 8 de noviembre de 2026. ${U}.`,
  },
  {
    caso: 'en MLA, un título con exclamación que cierra el contenedor',
    cita: citaDe({ obra: obra('¡Viva la vida!'), procedencia: {}, fuente: undefined }),
    autor: MARTI,
    apa: `Martí, J. «${X}». En *¡Viva la vida!* Sabiduría de Bolsillo. Recuperado el 8 de noviembre de 2026 de ${U}`,
    mla: `Martí, José. «${X}». *¡Viva la vida!* *Sabiduría de Bolsillo*, ${U}. Consultado el 8 nov. 2026.`,
    chicago: `Martí, José. *¡Viva la vida!* «${X}». Sabiduría de Bolsillo. Consultado el 8 de noviembre de 2026. ${U}.`,
  },
];

describe('Historia 30.3 — las Referencias de la tabla, literales', () => {
  for (const { caso, cita, autor, ...esperadas } of casos) {
    for (const estilo of ESTILOS_DE_REFERENCIA) {
      it(`${caso}: ${estilo}`, () => {
        expect(conMarcas(referenciaDeCita(cita, autor, U, estilo), HOY)).toBe(esperadas[estilo]);
      });
    }
  }

  it('el texto que se copia es el mismo sin las marcas de cursiva', () => {
    for (const estilo of ESTILOS_DE_REFERENCIA) {
      const segmentos = referenciaDeCita(citaDe(), MARTI, U, estilo);
      expect(referenciaEnTexto(segmentos, HOY)).toBe(casos[0][estilo].replace(/\*/g, ''));
    }
  });

  it('sin fecha —la del build, sin guion— no deja la frase ni espacios dobles', () => {
    const sinFecha: Record<EstiloDeReferencia, string> = {
      apa: `Martí, J. (1891). «${X}». En Versos sencillos. Wikisource. Sabiduría de Bolsillo. ${U}`,
      mla: `Martí, José. «${X}». Versos sencillos, 1891. Wikisource. Sabiduría de Bolsillo, ${U}.`,
      chicago: `Martí, José. Versos sencillos. 1891. Wikisource. «${X}». Sabiduría de Bolsillo. ${U}.`,
    };
    for (const estilo of ESTILOS_DE_REFERENCIA) {
      const texto = referenciaEnTexto(referenciaDeCita(citaDe(), MARTI, U, estilo));
      expect(texto).toBe(sinFecha[estilo]);
      expect(texto).not.toMatch(/ {2}/);
      expect(texto).not.toMatch(/2026/);
    }
  });

  it('una sola fecha por Referencia, y en el sitio del estilo', () => {
    for (const estilo of ESTILOS_DE_REFERENCIA) {
      const fechas = referenciaDeCita(citaDe(), MARTI, U, estilo).filter((s) => 'fecha' in s);
      expect(fechas).toEqual([{ fecha: estilo }]);
    }
  });

  it('revisar la clave cambia solo el nombre', () => {
    for (const estilo of ESTILOS_DE_REFERENCIA) {
      const revisada = referenciaEnTexto(referenciaDeCita(citaDe(), MARTI, U, estilo), HOY);
      const sinRevisar = referenciaEnTexto(referenciaDeCita(citaDe(), MARTI_SIN_REVISAR, U, estilo), HOY);
      const nombre = nombreEnReferencia(MARTI, estilo);
      expect(revisada.replace(nombre, 'José Martí')).toBe(sinRevisar);
    }
  });

  it('`referenciasDeCita` da los tres estilos en orden, con su rótulo', () => {
    expect(referenciasDeCita(citaDe(), MARTI, U).map((r) => [r.estilo, r.rotulo])).toEqual([
      ['apa', 'APA'],
      ['mla', 'MLA'],
      ['chicago', 'Chicago'],
    ]);
  });

  it('toda Cita lleva «Cómo citar» (la 35.4 añadirá la Cita atribuida)', () => {
    expect(citaTieneComoCitar(citaDe())).toBe(true);
  });
});

describe('Historia 30.3 — el nombre en la Referencia', () => {
  it.each([
    ['José Martí', 'Martí', true, ['Martí, J.', 'Martí, José', 'Martí, José']],
    ['Horacio', 'Horacio', true, ['Horacio', 'Horacio', 'Horacio']],
    [
      'María de Zayas y Sotomayor',
      'Zayas',
      true,
      ['Zayas y Sotomayor, M.', 'Zayas y Sotomayor, María de', 'Zayas y Sotomayor, María de'],
    ],
    ['José Martí', 'Martí', false, ['José Martí', 'José Martí', 'José Martí']],
    ['José Martí', 'Marti', true, ['José Martí', 'José Martí', 'José Martí']],
  ] as const)('%s, clave «%s», revisada: %s', (nombre, clave, revisada, esperados) => {
    const autor = autorDe(nombre, clave, revisada);
    expect(ESTILOS_DE_REFERENCIA.map((estilo) => nombreEnReferencia(autor, estilo))).toEqual(esperados);
  });

  it('sin clave, el nombre tal cual', () => {
    expect(partesDelNombre(autorDe('José Martí'))).toBeUndefined();
    expect(nombreEnReferencia(autorDe('José Martí'), 'apa')).toBe('José Martí');
  });

  it('un nombre de pila compuesto con guion da una inicial por trozo en APA', () => {
    expect(ESTILOS_DE_REFERENCIA.map((estilo) => nombreEnReferencia(autorDe('Jean-Jacques Rousseau', 'Rousseau'), estilo))).toEqual([
      'Rousseau, J.-J.',
      'Rousseau, Jean-Jacques',
      'Rousseau, Jean-Jacques',
    ]);
  });

  it('la clave es la primera aparición de la palabra', () => {
    expect(partesDelNombre(autorDe('Juan Juan Pérez', 'Juan'))).toEqual({ apellidos: 'Juan Juan Pérez' });
  });
});

describe('Historia 30.3 — la fecha de consulta', () => {
  const MESES_MLA = ['ene.', 'feb.', 'mar.', 'abr.', 'mayo', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'];

  it.each(MESES_MLA.map((mes, m) => [m, mes]))('MLA, mes %i: «%s»', (m, mes) => {
    expect(fechaDeConsulta('mla', new Date(2026, m, 1))).toBe(` Consultado el 1 ${mes} 2026.`);
  });

  it('APA y Chicago, con el mes entero y el día sin cero', () => {
    expect(fechaDeConsulta('apa', new Date(2026, 0, 5))).toBe('Recuperado el 5 de enero de 2026 de ');
    expect(fechaDeConsulta('chicago', new Date(2026, 8, 30))).toBe('Consultado el 30 de septiembre de 2026. ');
  });

  it('usa el calendario local del `Date` que recibe', () => {
    // Las 23:30 del 31 de diciembre, hora local: el día es el 31, sea cual sea el huso.
    expect(fechaDeConsulta('apa', new Date(2026, 11, 31, 23, 30))).toBe('Recuperado el 31 de diciembre de 2026 de ');
  });

  it('su texto, evaluado aparte —como viaja a la isla—, da lo mismo', () => {
    const fuente = String(fechaDeConsulta);
    expect(fuente).not.toMatch(/\/\*|\/\/|import|require/);
    const evaluada = new Function(`return (${fuente});`)() as typeof fechaDeConsulta;
    for (const estilo of ESTILOS_DE_REFERENCIA) {
      for (let m = 0; m < 12; m++) {
        const fecha = new Date(2026, m, 8);
        expect(evaluada(estilo, fecha)).toBe(fechaDeConsulta(estilo, fecha));
      }
    }
  });
});

describe('Historia 30.3 — el nombre de Autores reales del Corpus, por `aplanarAutor`', () => {
  /*
   * En el build el Autor llega a la Página de Cita por `aplanarAutor`: si el aplanado perdiera
   * `ordenRevisado`, toda Referencia llevaría el nombre sin invertir y ninguna prueba con Autores
   * escritos a mano lo vería. Aquí se leen las fichas reales de `corpus/autores/` y la revisión se
   * pone o se quita en memoria: revisar las claves del Corpus es de Héctor, y la prueba no depende
   * de si ya lo hizo.
   */
  const RAIZ = resolve(import.meta.dirname, '../..');
  const ficha = (slug: string) =>
    parsearYaml(readFileSync(join(RAIZ, 'corpus/autores', `${slug}.yml`), 'utf8')) as Record<string, unknown>;
  const aplanado = (slug: string, data: Record<string, unknown>) =>
    aplanarAutor({ id: slug, collection: 'autores', data } as unknown as Parameters<typeof aplanarAutor>[0]);

  it.each([
    ['jose-marti', ['Martí, J.', 'Martí, José', 'Martí, José']],
    ['jean-jacques-rousseau', ['Rousseau, J.-J.', 'Rousseau, Jean-Jacques', 'Rousseau, Jean-Jacques']],
  ] as const)('%s con la clave revisada: invertido', (slug, esperados) => {
    const autor = aplanado(slug, { ...ficha(slug), ordenRevisado: '2026-11-08' });
    expect(autor.ordenRevisado).toBe('2026-11-08');
    expect(ESTILOS_DE_REFERENCIA.map((estilo) => nombreEnReferencia(autor, estilo))).toEqual(esperados);
    expect(referenciaEnTexto(referenciaDeCita(citaDe(), autor, U, 'apa')).startsWith(`${esperados[0]} (1891). `)).toBe(true);
  });

  it.each([
    // Un Autor de una sola palabra: revisado, sin coma ni iniciales en los tres estilos.
    ['horacio', undefined, ['Horacio', 'Horacio', 'Horacio']],
    // Con partícula: la ficha propone «Sotomayor» (la regla fija); aquí se corrige en memoria a
    // «Zayas», como lo haría Héctor con `tools/autor.ts clave`, y la partícula queda sin inicial.
    ['maria-de-zayas-y-sotomayor', 'Zayas', ['Zayas y Sotomayor, M.', 'Zayas y Sotomayor, María de', 'Zayas y Sotomayor, María de']],
  ] as const)('%s, ficha real, con la clave revisada', (slug, clave, esperados) => {
    const autor = aplanado(slug, {
      ...ficha(slug),
      ...(clave === undefined ? {} : { ordenAlfabetico: clave }),
      ordenRevisado: '2026-11-08',
    });
    expect(ESTILOS_DE_REFERENCIA.map((estilo) => nombreEnReferencia(autor, estilo))).toEqual(esperados);
  });

  it.each(['jose-marti', 'jean-jacques-rousseau'])('%s sin la clave revisada: el nombre tal cual', (slug) => {
    const { ordenRevisado, ...datos } = ficha(slug);
    void ordenRevisado;
    const autor = aplanado(slug, datos);
    expect(autor).not.toHaveProperty('ordenRevisado');
    expect(ESTILOS_DE_REFERENCIA.map((estilo) => nombreEnReferencia(autor, estilo))).toEqual([
      datos.nombre,
      datos.nombre,
      datos.nombre,
    ]);
  });
});

/**
 * Historia 30.4 — «Inserta esta cita»: el Fragmento literal (FR-57, AD-28). Como las Referencias,
 * es un supuesto del spec que **revisa Héctor**: esta tabla lo fija, y cambiarlo es cambiar la
 * tabla y `fragmentoParaInsertar`, nada más.
 */
describe('Historia 30.4 — el Fragmento para insertar', () => {
  const pie = (firma: string) => `<p>— ${firma} <a href="${U}">Sabiduría de Bolsillo</a></p>`;
  const fragmento = (texto: string, firma: string) => ['<blockquote>', `<p>${texto}</p>`, pie(firma), '</blockquote>'].join('\n');
  const largo = `${'Palabra larga sin fin '.repeat(18)}fin.`;

  const tabla: { caso: string; cita: Cita; autor: Autor; esperado: string }[] = [
    {
      caso: 'con Obra',
      cita: citaDe(),
      autor: MARTI,
      esperado:
        '<blockquote>\n<p>Yo soy un hombre sincero de donde crece la palma.</p>\n<p>— José Martí, <cite>Versos sencillos</cite>. <a href="https://ejemplo.org/cita/x/">Sabiduría de Bolsillo</a></p>\n</blockquote>',
    },
    {
      caso: 'sin Obra',
      cita: citaDe({ obra: undefined, procedencia: undefined, fuente: undefined }),
      autor: MARTI,
      esperado: fragmento(X, 'José Martí.'),
    },
    {
      caso: 'título en «?»',
      cita: citaDe({ obra: obra('¿Qué es la vida?') }),
      autor: MARTI,
      esperado: fragmento(X, 'José Martí, <cite>¿Qué es la vida?</cite>'),
    },
    {
      caso: 'texto con & < > "',
      cita: citaDe({ texto: 'A & B <c> "d"' }),
      autor: MARTI,
      esperado: fragmento('A &amp; B &lt;c&gt; &quot;d&quot;', 'José Martí, <cite>Versos sencillos</cite>.'),
    },
    {
      caso: 'título con <',
      cita: citaDe({ obra: obra('Uno < dos') }),
      autor: MARTI,
      esperado: fragmento(X, 'José Martí, <cite>Uno &lt; dos</cite>.'),
    },
    {
      caso: 'Cita de 400 caracteres',
      cita: citaDe({ texto: largo }),
      autor: MARTI,
      esperado: fragmento(largo, 'José Martí, <cite>Versos sencillos</cite>.'),
    },
    {
      caso: 'nombre sin invertir aunque la clave esté revisada, y sin año, traductor ni edición',
      cita: citaDe({ procedencia: { año: 1891, traduccion: { traductor: 'Nadie', año: 1900 } } as Cita['procedencia'] }),
      autor: autorDe('María de Zayas y Sotomayor', 'Zayas'),
      esperado: fragmento(X, 'María de Zayas y Sotomayor, <cite>Versos sencillos</cite>.'),
    },
  ];

  it.each(tabla)('$caso', ({ cita, autor, esperado }) => {
    expect(fragmentoParaInsertar(cita, autor, U)).toBe(esperado);
  });

  it('la Cita de prueba larga pasa de `MAX_CARACTERES_IMAGEN` y va entera', () => {
    expect(largo.length).toBeGreaterThanOrEqual(400);
    expect(largo.length).toBeGreaterThan(MAX_CARACTERES_IMAGEN);
    expect(fragmentoParaInsertar(citaDe({ texto: largo }), MARTI, U)).toContain(`<p>${largo}</p>`);
  });

  it('el `href` también sale escapado', () => {
    // Una comilla no llega: el parser la escribe `%22` y la canónica no normalizada se rechaza.
    expect(fragmentoParaInsertar(citaDe(), MARTI, 'https://ejemplo.org/cita/a&b/')).toContain('href="https://ejemplo.org/cita/a&amp;b/"');
  });

  it.each([
    `${U}?de=instagram`,
    `${U}?via=whatsapp`,
    `${U}#a`,
    `${U}?`,
    '/cita/x/',
    'ftp://ejemplo.org/cita/x/',
    'javascript:alert(1)',
    '',
    'https:ejemplo.org/cita/x/',
    'HTTPS://Ejemplo.org/cita/x/',
    ' https://ejemplo.org/cita/x/',
    'https://ejemplo.org/cita/x/\n',
    'https://usuario:clave@ejemplo.org/cita/x/',
  ])('una canónica «%s» detiene la construcción', (canonica) => {
    expect(() => fragmentoParaInsertar(citaDe(), MARTI, canonica)).toThrow(/canónica/);
  });

  it('`nombreEnAtribucion` da el `nombre`, revisada la clave o no', () => {
    expect(nombreEnAtribucion(MARTI)).toBe('José Martí');
    expect(nombreEnAtribucion(MARTI_SIN_REVISAR)).toBe('José Martí');
    expect(nombreEnAtribucion(autorDe('Horacio', 'Horacio'))).toBe('Horacio');
  });
});
