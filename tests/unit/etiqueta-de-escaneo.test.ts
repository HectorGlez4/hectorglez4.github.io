import { describe, expect, it } from 'vitest';
import {
  derivarDeLaDeclaracion,
  lineasDeEtiquetaDeEscaneo,
  lineasDeEncabezadoDeWikitexto,
} from '../../tools/lib/documento.ts';

/**
 * Historia 19.7 — el lector entiende la obra escaneada.
 *
 * La etiqueta es literal de Wikisource-es, del 07/09/2026: es la forma con la que la Fuente
 * sirve **18.040 páginas** —las transcritas de un escaneo—, frente a 40.923 con la plantilla.
 */
const ETIQUETA_REAL = `<pages index="Obras de los moralistas griegos. Marco Aurelio-Teofrasto-Epicteto-Cebes (1888).pdf" include=139-162 header=1
titulo="[[Soliloquios]]" autor="Marco Aurelio" traductor="Jacinto Díaz de Miranda" />

{{línea|4em|align=left}}
{{listaref}}`;

describe('Historia 19.7 — la etiqueta declara lo mismo que la plantilla', () => {
  it('la obra escaneada declara a quien firma', () => {
    expect(lineasDeEtiquetaDeEscaneo(ETIQUETA_REAL)).toContain('|autor=Marco Aurelio');
  });

  it('el traductor se conserva, que es lo que FR-48 pedía y no había', () => {
    expect(lineasDeEtiquetaDeEscaneo(ETIQUETA_REAL)).toContain(
      '|traductor=Jacinto Díaz de Miranda',
    );
  });

  it('el título con enlace sale como lo escribió la Fuente', () => {
    expect(lineasDeEtiquetaDeEscaneo(ETIQUETA_REAL)).toContain('|titulo=[[Soliloquios]]');
  });

  it('del nombre del índice NO sale año, aunque lleve uno dentro', () => {
    /*
     * «… (1888).pdf» es el nombre del fichero que alguien subió, no una declaración de la
     * obra. Derivar de ahí sería la Procedencia inferida que FR-2 prohíbe, y es la
     * tentación más fácil de esta historia porque el año está ahí, a la vista.
     */
    const lineas = lineasDeEtiquetaDeEscaneo(ETIQUETA_REAL);
    expect(lineas.join('\n')).not.toMatch(/1888/);
    expect(lineas.join('\n')).not.toMatch(/index/i);
  });

  it('una etiqueta sin autor no declara autor, como hasta hoy', () => {
    expect(lineasDeEtiquetaDeEscaneo('<pages index="X (1888).pdf" include=1-2 />')).toEqual([]);
  });

  it('un atributo vacío no declara nada', () => {
    expect(lineasDeEtiquetaDeEscaneo('<pages index="X.pdf" autor="" traductor="  " />')).toEqual([]);
  });

  it('la comilla simple vale igual que la doble', () => {
    expect(lineasDeEtiquetaDeEscaneo("<pages index='X.pdf' autor='Séneca' />")).toEqual([
      '|autor=Séneca',
    ]);
  });

  it('la etiqueta partida en dos líneas se lee entera', () => {
    // Los atributos de la página real viven en la segunda línea; una lectura por líneas
    // los habría perdido, que es exactamente lo que le pasaba al lector de plantillas.
    expect(lineasDeEtiquetaDeEscaneo(ETIQUETA_REAL).length).toBe(3);
  });

  it('no le quita nada a la plantilla: son dos lecturas, no una sustitución', () => {
    const conPlantilla = '{{Encabezado|título=Ariel|autor=José Enrique Rodó}}';
    expect(lineasDeEncabezadoDeWikitexto(conPlantilla)).toContain('|autor=José Enrique Rodó');
    expect(lineasDeEtiquetaDeEscaneo(conPlantilla)).toEqual([]);
  });
});

describe('Historia 19.7 — y el documento versionado lo hereda', () => {
  it('la declaración de una obra escaneada nombra a su Autor', () => {
    const derivado = derivarDeLaDeclaracion(
      'wikisource-es',
      ['Soliloquios/Libro V', ...lineasDeEtiquetaDeEscaneo(ETIQUETA_REAL)].join('\n'),
    );
    expect(derivado.autor?.nombres).toEqual(['Marco Aurelio']);
    expect(derivado.obra).toBe('Soliloquios');
    expect(derivado.año).toBeUndefined();
  });
});
