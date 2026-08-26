import { describe, expect, it } from 'vitest';
import { estadoDeLaCantera, urlDeLaPagina, ES_INDICE_POR_DEBAJO_DE } from '../../tools/lib/cantera.ts';

/**
 * Qué obra de un Autor ya admitido queda sin recuperar — Historia 11.1.
 *
 * Esto existe porque **la misma cuenta ha salido mal tres veces**, cada una con otro disfraz, y
 * cada una costó sesiones:
 *
 *   · en la 62.ª se cruzaba **por el nombre de la obra**: inventaba obras ya recuperadas y se
 *     perdía las que la Fuente titula de otro modo;
 *   · en la 96.ª se contaba una obra como intacta porque su **página raíz de 1 KB** no está
 *     versionada, aunque ya se hubieran sembrado ocho de sus catorce capítulos;
 *   · y las tres veces la cuenta vivía en un guion de usar y tirar, sin una sola prueba.
 *
 * La red **no** vive aquí, y no por descuido: AD-22 la deja solo en la cáscara exterior de
 * `tools/`, con excepciones escritas, y ampliarla es una decisión que no hace falta tomar para
 * arreglar esto. Lo que ha fallado siempre es la cuenta, no la descarga. Así que aquí está la
 * cuenta, y quien tenga las páginas —de donde sea— se las pasa.
 */
describe('Cantera — qué queda sin recuperar de un Autor', () => {
  const versionadas = new Set([
    'https://es.wikisource.org/wiki/Obra_entera',
    'https://es.wikisource.org/wiki/Obra_con_partes/2',
    'https://es.wikisource.org/wiki/Obra_con_partes/3',
  ]);

  it('el título se convierte en dirección como lo hace la Fuente: el espacio es un guion bajo', () => {
    expect(urlDeLaPagina('La mujer del porvenir')).toBe(
      'https://es.wikisource.org/wiki/La_mujer_del_porvenir',
    );
  });

  it('cruza por dirección, no por el nombre de la obra', () => {
    /*
     * El defecto de la 62.ª: dos páginas pueden llamarse casi igual y ser obras distintas, y una
     * misma obra puede estar titulada de otro modo del que uno espera. La dirección no opina.
     */
    const estado = estadoDeLaCantera(
      [{ titulo: 'Obra entera', bytes: 40_000 }],
      versionadas,
      new Map(),
    );

    expect(estado).toEqual([]);
  });

  it('una página con texto y sin versionar sale con su tamaño, para poder priorizar', () => {
    const estado = estadoDeLaCantera(
      [{ titulo: 'Otra obra', bytes: 31_500 }],
      versionadas,
      new Map(),
    );

    expect(estado).toEqual([{ clase: 'suelta', titulo: 'Otra obra', bytes: 31_500 }]);
  });

  it('una obra con capítulos se cuenta POR SUS CAPÍTULOS, no por su índice', () => {
    // El defecto de la 96.ª: el índice pesa 1 KB y nunca se versiona, así que la obra parecía
    // intacta cuando ya se le habían sacado dos de cuatro capítulos.
    const estado = estadoDeLaCantera(
      [{ titulo: 'Obra con partes', bytes: 1_000 }],
      versionadas,
      new Map([
        [
          'Obra con partes',
          ['Obra con partes/1', 'Obra con partes/2', 'Obra con partes/3', 'Obra con partes/4'],
        ],
      ]),
    );

    expect(estado).toEqual([
      {
        clase: 'índice',
        titulo: 'Obra con partes',
        capitulos: 4,
        versionados: 2,
        agotada: false,
      },
    ]);
  });

  it('y cuando ya están todos sus capítulos, lo dice: agotada', () => {
    const estado = estadoDeLaCantera(
      [{ titulo: 'Obra con partes', bytes: 1_000 }],
      versionadas,
      new Map([['Obra con partes', ['Obra con partes/2', 'Obra con partes/3']]]),
    );

    expect(estado[0]).toMatchObject({ agotada: true, capitulos: 2, versionados: 2 });
  });

  it('un índice del que no se sabe qué capítulos tiene se trata como página suelta', () => {
    /*
     * Callar aquí sería lo peor de los dos mundos: ni dice que está sin recuperar ni dice cuántos
     * capítulos le faltan. Si no hay dato de capítulos, se dice lo único que se sabe.
     */
    const estado = estadoDeLaCantera(
      [{ titulo: 'Índice sin partes conocidas', bytes: 900 }],
      versionadas,
      new Map(),
    );

    expect(estado).toEqual([
      { clase: 'suelta', titulo: 'Índice sin partes conocidas', bytes: 900 },
    ]);
  });

  it('el umbral de «esto es un índice» tiene nombre, no es un número suelto', () => {
    expect(ES_INDICE_POR_DEBAJO_DE).toBeGreaterThan(0);

    const justoDebajo = estadoDeLaCantera(
      [{ titulo: 'Obra con partes', bytes: ES_INDICE_POR_DEBAJO_DE - 1 }],
      versionadas,
      new Map([['Obra con partes', ['Obra con partes/1']]]),
    );
    const justoEncima = estadoDeLaCantera(
      [{ titulo: 'Obra con partes', bytes: ES_INDICE_POR_DEBAJO_DE }],
      versionadas,
      new Map([['Obra con partes', ['Obra con partes/1']]]),
    );

    expect(justoDebajo[0]!.clase).toBe('índice');
    expect(justoEncima[0]!.clase).toBe('suelta');
  });

  it('ordena lo que queda por tamaño, porque es el orden en que conviene mirarlo', () => {
    const estado = estadoDeLaCantera(
      [
        { titulo: 'Pequeña', bytes: 5_000 },
        { titulo: 'Grande', bytes: 40_000 },
        { titulo: 'Mediana', bytes: 20_000 },
      ],
      versionadas,
      new Map(),
    );

    expect(estado.map((e) => e.titulo)).toEqual(['Grande', 'Mediana', 'Pequeña']);
  });
  /**
   * Y no se cuenta como capítulo lo que no cuelga de la obra — 102.ª sesión.
   *
   * La cáscara que pide los capítulos usaba la búsqueda por prefijo de la Fuente, que es
   * **difusa e ignora la barra**: preguntando por «Ariel/» devolvía «Abel Sánchez», «Abril»,
   * «Árboles» y «Arena». La sonda anunció **50 capítulos sin recuperar** de una obra que tiene
   * seis partes, y con títulos largos el defecto no se veía porque no hay nada que se les parezca.
   *
   * El arreglo de la cáscara es pedir las páginas por prefijo literal. Pero la guarda vive aquí
   * a propósito: **quien llene el mapa puede volver a equivocarse**, y entonces lo que se
   * anuncia como cantera son títulos ajenos. Contar de más es peor que contar de menos, porque
   * manda a recuperar obra que no existe.
   */
  it('un título que no cuelga de la obra no es capítulo suyo, aunque se lo pasen', () => {
    const estado = estadoDeLaCantera(
      [{ titulo: 'Obra con partes', bytes: 1_000 }],
      versionadas,
      new Map([
        [
          'Obra con partes',
          ['Obra con partes/1', 'Obra completamente ajena', 'Obra con partes/2', 'Obrita'],
        ],
      ]),
    );

    expect(estado[0]).toMatchObject({ clase: 'índice', capitulos: 2, versionados: 1 });
  });

  it('y si NINGUNO cuelga de la obra, se trata como página suelta y no como índice vacío', () => {
    // Decir «índice, 0 capítulos» sugeriría una obra sin partes; lo cierto es que no se sabe.
    const estado = estadoDeLaCantera(
      [{ titulo: 'Obra con partes', bytes: 1_000 }],
      versionadas,
      new Map([['Obra con partes', ['Otra cosa', 'Y otra']]]),
    );

    expect(estado[0]).toEqual({ clase: 'suelta', titulo: 'Obra con partes', bytes: 1_000 });
  });
});
