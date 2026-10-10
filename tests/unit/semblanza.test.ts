import { describe, expect, it } from 'vitest';
import {
  PORTAN_LA_ATRIBUCION,
  SUPERFICIES_DE_LA_SEMBLANZA,
  añosDeAutor,
  descripcionDeAutor,
  hechosDeAutor,
  recuentoDeDocumentadas,
  semblanzaEn,
} from '../../src/lib/atribucion.ts';
import {
  ENLACES_DE_LICENCIA,
  NOMBRES_DE_FUENTE_DE_BIOGRAFIA,
  atribucionDeBiografia,
  leerBiografia,
} from '../../src/lib/biografia.ts';
import {
  citasDocumentadasDeAutor,
  esCitaDocumentada,
  resolverAtribuciones,
  type Autor,
  type Cita,
} from '../../src/lib/publicado.ts';
import {
  MAX_LINEAS_DE_BAJADA,
  datosDeTarjetaDeAutor,
  svgDeTarjetaDeListado,
} from '../../src/lib/tarjeta.ts';
import { FUENTES } from '../../tools/lib/fuentes.ts';
import { analizarDocumento, componerBiografia } from '../../tools/lib/documento.ts';

/**
 * Historia 17.2 — la semblanza sitúa al Autor, publica su atribución, y sale de la Tarjeta.
 *
 * Lo decidible sin construir: qué superficie puede reproducir una semblanza (AD-28), los
 * hechos que la sustituyen, la lectura de la cabecera en el build y la Tarjeta de Autor. La
 * página construida y la puerta del build están en `biografia-build.test.ts`.
 */

const SENECA: Autor = {
  slug: 'seneca',
  nombre: 'Séneca',
  semblanza: 'Filósofo estoico.',
  añoNacimiento: -4,
  añoFallecimiento: 65,
};

const ATRIBUCION = {
  titulo: 'Séneca',
  fuente: 'Wikipedia en español',
  revision: 123,
  url: 'https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=123',
  licencia: 'CC BY-SA 4.0',
  urlDeLicencia: 'https://creativecommons.org/licenses/by-sa/4.0/deed.es',
};

const BIOGRAFIA = componerBiografia(
  {
    fuente: 'wikipedia-es',
    titulo: 'Séneca',
    revision: 123,
    fechaDeRevision: '2020-05-01',
    licencia: 'CC BY-SA 3.0',
    url: ATRIBUCION.url,
    recuperado: '2026-10-10',
  },
  'Séneca',
  'Lucio Anneo Séneca fue un filósofo.',
);

describe('qué superficie reproduce la semblanza', () => {
  it('solo la ficha de la página 1 porta la atribución', () => {
    expect([...PORTAN_LA_ATRIBUCION]).toEqual(['ficha-de-autor']);
  });

  it('una semblanza ajena solo aparece en la ficha de la página 1', () => {
    const conBiografia = { ...SENECA, atribucion: ATRIBUCION };
    for (const superficie of SUPERFICIES_DE_LA_SEMBLANZA) {
      expect(semblanzaEn(conBiografia, superficie), superficie).toBe(
        superficie === 'ficha-de-autor' ? SENECA.semblanza : undefined,
      );
    }
  });

  it('una semblanza propia sigue en todas', () => {
    for (const superficie of SUPERFICIES_DE_LA_SEMBLANZA) {
      expect(semblanzaEn(SENECA, superficie), superficie).toBe(SENECA.semblanza);
    }
  });
});

describe('los hechos del Corpus', () => {
  it.each([
    [{ añoNacimiento: 1864, añoFallecimiento: 1936 }, '1864–1936'],
    [{ añoNacimiento: -4, añoFallecimiento: 65 }, '4 a. C.–65 d. C.'],
    [{ añoNacimiento: -65, añoFallecimiento: -8 }, '65–8 a. C.'],
    [{ añoFallecimiento: 65 }, 'Fallecido en 65'],
    [{ añoFallecimiento: -8 }, 'Fallecido en 8 a. C.'],
  ])('años %j → %s', (autor, esperado) => {
    expect(añosDeAutor(autor)).toBe(esperado);
  });

  it('en minúscula dentro de una frase', () => {
    expect(añosDeAutor({ añoFallecimiento: 65 }, 'minúscula')).toBe('fallecido en 65');
  });

  it('el recuento concuerda en número, y no dice cero', () => {
    expect(recuentoDeDocumentadas(1)).toBe('1 cita documentada');
    expect(recuentoDeDocumentadas(0)).toBeUndefined();
    expect(recuentoDeDocumentadas(12)).toBe('12 citas documentadas');
  });

  it('los hechos del JSON-LD no llevan la semblanza, ni un recuento de cero', () => {
    expect(hechosDeAutor({ nombre: 'Séneca', añoFallecimiento: 65 }, 12)).toBe(
      'Séneca (fallecido en 65). 12 citas documentadas en Sabiduría de Bolsillo.',
    );
    expect(hechosDeAutor({ nombre: 'Séneca', añoFallecimiento: 65 }, 0)).toBe(
      'Séneca (fallecido en 65).',
    );
  });

  it('la meta con biografía no repite el nombre ni «documentada» tras el prefijo', () => {
    const conBiografia = { ...SENECA, atribucion: ATRIBUCION };
    const prefijo = 'Citas de Séneca con su procedencia documentada.';
    expect(descripcionDeAutor(conBiografia, 12)).toBe(
      `${prefijo} 4 a. C.–65 d. C. 12 cotejadas con su documento.`,
    );
    expect(descripcionDeAutor(conBiografia, 1)).toBe(
      `${prefijo} 4 a. C.–65 d. C. 1 cotejada con su documento.`,
    );
    expect(descripcionDeAutor(conBiografia, 0)).toBe(`${prefijo} 4 a. C.–65 d. C.`);
    expect(
      descripcionDeAutor({ ...conBiografia, añoNacimiento: -65, añoFallecimiento: -8 }, 0),
    ).toBe(`${prefijo} 65–8 a. C.`);
    const resto = descripcionDeAutor(conBiografia, 12).slice(prefijo.length);
    expect(resto).not.toMatch(/Séneca|documentad/);
  });

  it('la meta sin biografía, como siempre', () => {
    expect(descripcionDeAutor(SENECA, 12)).toBe(
      'Citas de Séneca con su procedencia documentada. Filósofo estoico.',
    );
  });

  it('documentada es publicada con Fuente, y se cuenta por Autor', () => {
    const cita = (autor: string, conFuente: boolean): Cita => ({
      slug: `${autor}-${Math.random()}`,
      texto: 'x',
      autor,
      temas: [],
      procedencia: {},
      aptaParaPortada: false,
      ...(conFuente ? { fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/X' } } : {}),
    } as Cita);
    const citas = [cita('seneca', true), cita('seneca', false), cita('seneca', true), cita('horacio', true)];
    expect(esCitaDocumentada(citas[1]!)).toBe(false);
    expect(citasDocumentadasDeAutor(citas, 'seneca')).toBe(2);
    expect(citasDocumentadasDeAutor(citas, 'nadie')).toBe(0);
  });
});

describe('la cabecera de la biografía, leída en el build', () => {
  it('el lector del build y el de tools/ leen la misma cabecera', () => {
    const delBuild = leerBiografia(BIOGRAFIA);
    expect(delBuild?.cabecera).toEqual(analizarDocumento(BIOGRAFIA)?.cabecera);
    expect(delBuild?.cuerpo).toContain('Lucio Anneo Séneca');
  });

  it('un documento de obra o mal formado no es una biografía', () => {
    expect(leerBiografia(BIOGRAFIA.replace('clase: biografia\n', ''))).toBeUndefined();
    expect(leerBiografia(BIOGRAFIA.replace(/licencia: .*\n/u, ''))).toBeUndefined();
    expect(leerBiografia('sin separadores')).toBeUndefined();
  });

  it('la atribución dice la licencia de su revisión, y el nombre visible de la Fuente', () => {
    const { cabecera } = leerBiografia(BIOGRAFIA)!;
    expect(atribucionDeBiografia(cabecera)).toEqual({
      titulo: 'Séneca',
      fuente: 'Wikipedia en español',
      revision: 123,
      url: ATRIBUCION.url,
      licencia: 'CC BY-SA 3.0',
      urlDeLicencia: 'https://creativecommons.org/licenses/by-sa/3.0/deed.es',
    });
    expect(atribucionDeBiografia({ ...cabecera, fuente: 'otra' })).toBeUndefined();
    expect(atribucionDeBiografia({ ...cabecera, licencia: 'GFDL' })).toBeUndefined();
  });

  it('las dos licencias de Wikipedia enlazan a su escritura en español', () => {
    expect(ENLACES_DE_LICENCIA).toEqual({
      'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/deed.es',
      'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/deed.es',
    });
  });

  it('toda Fuente mutable tiene nombre de atribución, y es el mismo que el de tools/', () => {
    for (const fuente of FUENTES.filter((f) => f.mutable === true)) {
      expect(NOMBRES_DE_FUENTE_DE_BIOGRAFIA[fuente.id], fuente.id).toBe(fuente.nombre);
    }
  });
});

describe('resolverAtribuciones', () => {
  const biografia = {
    id: 'wikipedia-es--seneca--r123',
    fuente: 'wikipedia-es',
    titulo: 'Séneca',
    revision: ATRIBUCION.revision,
    url: ATRIBUCION.url,
    licencia: ATRIBUCION.licencia,
  };

  it('cuelga la atribución de quien declara biografía, y deja igual a los demás', () => {
    const horacio: Autor = { slug: 'horacio', nombre: 'Horacio', semblanza: 'Poeta.', añoFallecimiento: -8 };
    const [seneca, otro] = resolverAtribuciones(
      [SENECA, horacio],
      new Map([['seneca', 'wikipedia-es--seneca--r123']]),
      [biografia],
    );
    expect(seneca?.atribucion).toEqual(ATRIBUCION);
    expect(otro).toBe(horacio);
  });

  it('rompe si el documento declarado no está cargado: nunca semblanza ajena sin atribución', () => {
    expect(() =>
      resolverAtribuciones([SENECA], new Map([['seneca', 'wikipedia-es--seneca--r9']]), []),
    ).toThrow(/seneca.*wikipedia-es--seneca--r9/);
  });
});

describe('la Tarjeta Social de Autor, con hechos', () => {
  const cita = (autor: string, conFuente: boolean, i: number): Cita =>
    ({
      slug: `${autor}-${i}`,
      texto: 'x',
      autor,
      temas: [],
      procedencia: {},
      aptaParaPortada: false,
      ...(conFuente
        ? { fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/X' } }
        : {}),
    }) as Cita;

  it('años y «N citas documentadas», contando solo las que tienen fuente', () => {
    const citas = [cita('seneca', true, 1), cita('seneca', false, 2), cita('seneca', true, 3)];
    expect(datosDeTarjetaDeAutor(SENECA, [...citas, cita('horacio', true, 4)])).toEqual({
      titulo: 'Séneca',
      hechos: ['4 a. C.–65 d. C.', '2 citas documentadas'],
    });
  });

  it('nunca lleva la semblanza, con atribución o sin ella', () => {
    const citas = [cita('seneca', true, 1)];
    for (const autor of [SENECA, { ...SENECA, atribucion: ATRIBUCION }]) {
      const datos = datosDeTarjetaDeAutor(autor, citas);
      expect(datos.bajada).toBeUndefined();
      expect(JSON.stringify(datos)).not.toContain(SENECA.semblanza);
      expect(svgDeTarjetaDeListado(datos)).not.toContain(SENECA.semblanza);
    }
  });

  it('con cero documentadas omite la línea del recuento', () => {
    expect(datosDeTarjetaDeAutor(SENECA, [cita('seneca', false, 1)])).toEqual({
      titulo: 'Séneca',
      hechos: ['4 a. C.–65 d. C.'],
    });
  });

  const textos = (svg: string) =>
    [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

  it('cada hecho va en su propia línea <text>', () => {
    const svg = svgDeTarjetaDeListado({
      titulo: 'Séneca',
      hechos: ['4 a. C.–65 d. C.', '12 citas documentadas'],
    });
    expect(textos(svg)).toContain('4 a. C.–65 d. C.');
    expect(textos(svg)).toContain('12 citas documentadas');
  });

  it('un nombre largo crece el título y no recorta los hechos', () => {
    const nombre = 'Juana Inés de Asbaje y Ramírez de Santillana, Sor Juana Inés de la Cruz';
    const svg = svgDeTarjetaDeListado({
      titulo: nombre,
      hechos: ['1648–1695', '12 citas documentadas'],
    });
    const lineas = textos(svg);
    expect(lineas).toContain('1648–1695');
    expect(lineas).toContain('12 citas documentadas');
    // El nombre entero, repartido en varias líneas y sin perder palabras.
    expect(lineas.filter((l) => !/^\d|SABIDUR/.test(l!)).join(' ')).toBe(nombre);
  });

  it(`el tope de ${MAX_LINEAS_DE_BAJADA} líneas vale también para los hechos`, () => {
    const svg = svgDeTarjetaDeListado({
      titulo: 'Séneca',
      hechos: ['h1', 'h2', 'h3', 'h4', 'h5'],
    });
    expect(textos(svg).filter((t) => /^h\d$/.test(t!))).toEqual(['h1', 'h2', 'h3', 'h4']);
  });

  it('bajada y hechos son excluyentes', () => {
    expect(() =>
      svgDeTarjetaDeListado({ titulo: 'Séneca', bajada: 'Una frase.', hechos: ['65'] }),
    ).toThrow(/bajada o hechos/);
  });
});
