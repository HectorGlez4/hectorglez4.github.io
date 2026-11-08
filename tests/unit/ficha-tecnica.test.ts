import { describe, expect, it } from 'vitest';
import { partesDeFichaTecnica, TEXTO_DATOS_DE_WIKIDATA } from '../../src/lib/atribucion.ts';
import {
  avisosDeAñoDeFichaTecnica,
  colgarObras,
  dondeLeer,
  resolverObras,
  traductorDeLaEdicionQueEncabeza,
  type CitaParaDondeLeer,
  type FichaDeObra,
  type FichaTecnicaDeObra,
} from '../../src/lib/obras.ts';

/**
 * Historia 32.2 — la línea de Ficha técnica, pura: qué partes dice, de quién es el traductor, cuándo
 * avisa del año y cómo se cuelga de la Obra resuelta. Lo que pinta el build lo mira
 * `tests/unit/ficha-tecnica-build.test.ts`.
 */

const ficha = (extra: Partial<FichaTecnicaDeObra> = {}): FichaTecnicaDeObra => ({
  entidad: 'Q1',
  revision: 10,
  generos: [],
  lenguas: [],
  enlace: 'https://www.wikidata.org/w/index.php?title=Q1&oldid=10',
  ...extra,
});

describe('partesDeFichaTecnica — el texto de la línea (UX-DR126)', () => {
  it('completa: género con mayúscula, año y lengua, en ese orden', () => {
    expect(partesDeFichaTecnica(ficha({ generos: ['novela'], año: 1605, lenguas: ['español'] }))).toEqual([
      'Novela',
      '1605',
      'Escrita en español',
    ]);
  });

  it('varios géneros por «, » con mayúscula solo en el primero; dos lenguas por «y», tres con comas', () => {
    expect(partesDeFichaTecnica(ficha({ generos: ['novela', 'sátira'], lenguas: ['latín', 'griego antiguo'] }))).toEqual([
      'Novela, sátira',
      'Escrita en latín y griego antiguo',
    ]);
    expect(partesDeFichaTecnica(ficha({ lenguas: ['latín', 'griego antiguo', 'español'] }))).toEqual([
      'Escrita en latín, griego antiguo y español',
    ]);
    // La mayúscula es la del español, y el resto de la etiqueta va tal cual.
    expect(partesDeFichaTecnica(ficha({ generos: ['ópera bufa de Rossini'] }))).toEqual(['Ópera bufa de Rossini']);
  });

  it('parcial: solo lo que consta', () => {
    expect(partesDeFichaTecnica(ficha({ lenguas: ['español'] }))).toEqual(['Escrita en español']);
    expect(partesDeFichaTecnica(ficha({ año: 1605 }))).toEqual(['1605']);
  });

  it('antes de Cristo: «49 a. C.»', () => {
    expect(partesDeFichaTecnica(ficha({ año: -49 }))).toEqual(['49 a. C.']);
  });

  it('vacía: sin género, año ni lengua no hay línea, tampoco con traductor', () => {
    expect(partesDeFichaTecnica(ficha())).toBeUndefined();
    expect(partesDeFichaTecnica(ficha(), 'Juan Pérez')).toBeUndefined();
  });

  it('traducida: «Traducción de {traductor}» tras las demás partes', () => {
    expect(partesDeFichaTecnica(ficha({ generos: ['novela'], año: 1605 }), 'Juan Pérez')).toEqual([
      'Novela',
      '1605',
      'Traducción de Juan Pérez',
    ]);
  });

  it('dos entidades con la misma etiqueta no la repiten: ni «Novela, novela» ni «español y español»', () => {
    expect(
      partesDeFichaTecnica(ficha({ generos: ['novela', 'Novela', 'sátira'], lenguas: ['español', 'español'] })),
    ).toEqual(['Novela, sátira', 'Escrita en español']);
  });

  it('el enlace no es una parte: lo pone el componente, con su texto fijo', () => {
    expect(TEXTO_DATOS_DE_WIKIDATA).toBe('Datos: Wikidata, CC0');
  });
});

describe('traductorDeLaEdicionQueEncabeza — FR-48', () => {
  const de = (id: string, traductor?: string, nombre?: string): CitaParaDondeLeer => ({
    fuente: { id, url: `https://${id}.example.org/obra`, ...(nombre === undefined ? {} : { nombre }) },
    ...(traductor === undefined ? {} : { procedencia: { traduccion: { traductor } } }),
  });

  it('la Fuente que encabeza con todas sus Citas del mismo traductor: ese traductor', () => {
    expect(traductorDeLaEdicionQueEncabeza([de('a', 'Juan Pérez'), de('a', 'Juan Pérez'), de('b')])).toBe('Juan Pérez');
  });

  it('dos traductores en la Fuente que encabeza: ninguno', () => {
    expect(traductorDeLaEdicionQueEncabeza([de('a', 'Juan Pérez'), de('a', 'Ana Ruiz')])).toBeUndefined();
  });

  it('alguna Cita de esa Fuente sin traductor: ninguno', () => {
    expect(traductorDeLaEdicionQueEncabeza([de('a', 'Juan Pérez'), de('a')])).toBeUndefined();
  });

  it('dos Fuentes empatadas: gana la de rótulo menor en español', () => {
    const citas = [de('z', 'De Zeta', 'Biblioteca Zeta'), de('y', 'De Alfa', 'Ábaco')];
    expect(traductorDeLaEdicionQueEncabeza(citas)).toBe('De Alfa');
    expect(traductorDeLaEdicionQueEncabeza([...citas].reverse())).toBe('De Alfa');
  });

  it('la Fuente que encabeza no es una traducción: ninguno', () => {
    expect(traductorDeLaEdicionQueEncabeza([de('a'), de('a'), de('b', 'Juan Pérez')])).toBeUndefined();
  });

  it('sin ninguna Cita cotejada: `undefined`', () => {
    expect(traductorDeLaEdicionQueEncabeza([{}, { fuente: null }])).toBeUndefined();
    expect(traductorDeLaEdicionQueEncabeza([])).toBeUndefined();
  });

  it('agrupa por Fuente sumando sus traductores, no por grupo de «Dónde leer»', () => {
    // La Fuente «a» tiene 3 Citas en tres traducciones (1 + 1 + 1); la «b», 2 de un solo
    // traductor. «Dónde leer» encabeza con el grupo de «b» (2), pero la edición que encabeza es
    // «a» (3), y como mezcla traductores no hay «Traducción de»: nunca «Tres».
    const citas = [de('a', 'Uno'), de('a', 'Dos'), de('a', 'Cuatro'), de('b', 'Tres'), de('b', 'Tres')];
    expect(dondeLeer(citas).lineas[0]).toMatchObject({ citas: 2, traduccion: { traductor: 'Tres' } });
    expect(traductorDeLaEdicionQueEncabeza(citas)).toBeUndefined();
  });
});

describe('avisosDeAñoDeFichaTecnica — FR-60', () => {
  const fichas: FichaDeObra[] = [
    { nombre: 'x--o', ruta: 'corpus/obras/x--o.yml', autor: 'x', titulo: 'Obra O', formas: ['obra o'] },
  ];
  const cita = (año?: number) => ({
    slug: `x-${año ?? 'sin'}`,
    autor: 'x',
    procedencia: { obra: 'Obra O', ...(año === undefined ? {} : { año }) },
  });
  const ruta = (nombre: string) => `corpus/obras/${nombre}.yml`;

  it('discrepa: avisa nombrando la ficha y los dos años', () => {
    const tecnicas = new Map([['x--o', ficha({ año: 1605 })]]);
    const avisos = avisosDeAñoDeFichaTecnica(resolverObras([cita(1604)], fichas, tecnicas), tecnicas, ruta);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('Ficha técnica con año discrepante');
    expect(avisos[0]).toContain('corpus/obras/x--o.yml');
    expect(avisos[0]).toContain('1605');
    expect(avisos[0]).toContain('1604');
  });

  it('antes de Cristo: el aviso escribe el año como lo pinta la línea, «49 a. C.», nunca «-49»', () => {
    const tecnicas = new Map([['x--o', ficha({ año: -49 })]]);
    const [aviso] = avisosDeAñoDeFichaTecnica(resolverObras([cita(-50)], fichas, tecnicas), tecnicas, ruta);
    expect(aviso).toContain('Wikidata dice 49 a. C.; sus Citas, 50 a. C.');
    expect(aviso).not.toContain('-49');
  });

  it('coincide: no avisa', () => {
    const tecnicas = new Map([['x--o', ficha({ año: 1605 })]]);
    expect(avisosDeAñoDeFichaTecnica(resolverObras([cita(1605)], fichas, tecnicas), tecnicas, ruta)).toEqual([]);
  });

  it('falta uno de los dos: no hay nada que comparar', () => {
    const sinAñoDeWikidata = new Map([['x--o', ficha()]]);
    expect(
      avisosDeAñoDeFichaTecnica(resolverObras([cita(1604)], fichas, sinAñoDeWikidata), sinAñoDeWikidata, ruta),
    ).toEqual([]);
    const conAño = new Map([['x--o', ficha({ año: 1605 })]]);
    expect(avisosDeAñoDeFichaTecnica(resolverObras([cita()], fichas, conAño), conAño, ruta)).toEqual([]);
  });
});

describe('colgarObras — la Ficha técnica viaja por parámetro', () => {
  const fichas: FichaDeObra[] = [
    { nombre: 'x--o', ruta: 'corpus/obras/x--o.yml', autor: 'x', titulo: 'Obra O', formas: ['obra o'] },
    { nombre: 'x--p', ruta: 'corpus/obras/x--p.yml', autor: 'x', titulo: 'Obra P', formas: ['obra p'] },
  ];
  const citas = [
    { slug: 'x-a', autor: 'x', procedencia: { obra: 'Obra O' } },
    { slug: 'x-b', autor: 'x', procedencia: { obra: 'Obra P' } },
  ];

  it('con el mapa, la Obra atada lleva su Ficha técnica y la otra no lleva el campo', () => {
    const tecnica = ficha({ generos: ['novela'] });
    const [a, b] = colgarObras(citas, fichas, new Map([['x--o', tecnica]]));
    expect(a.obra?.fichaTecnica).toEqual(tecnica);
    expect(b.obra !== undefined && 'fichaTecnica' in b.obra).toBe(false);
  });

  it('sin el mapa, ninguna Obra lleva el campo', () => {
    for (const cita of colgarObras(citas, fichas)) {
      expect(cita.obra !== undefined && 'fichaTecnica' in cita.obra).toBe(false);
    }
  });
});
