import { describe, expect, it } from 'vitest';
import {
  ESTILOS_DE_REFERENCIA,
  fechaDeConsulta,
  citaTieneComoCitar,
  nombreEnReferencia,
  partesDelNombre,
  referenciaDeCita,
  referenciaEnTexto,
  referenciasDeCita,
  type EstiloDeReferencia,
  type SegmentoDeReferencia,
} from '../../src/lib/atribucion.ts';
import type { Autor, Cita } from '../../src/lib/publicado.ts';
import type { ObraResuelta } from '../../src/lib/obras.ts';

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
