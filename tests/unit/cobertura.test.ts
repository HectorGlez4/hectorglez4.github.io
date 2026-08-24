import { describe, expect, it } from 'vitest';
import {
  formatearFallos,
  rangosPorFamilia,
  resumenDelBuild,
  revisarCobertura,
  textoCompuesto,
  titularDeFallos,
  type PaginaConstruida,
} from '../../tools/lib/cobertura.ts';

/**
 * La cobertura tipográfica — lo decidible sin construir.
 *
 * Aquí se prueba el criterio: qué rangos declara cada familia, qué texto de una página
 * llega a componerse y cuándo un carácter se queda sin fuente. Que la puerta esté de
 * verdad puesta en el build lo prueba `cobertura-build.test.ts`, que construye de verdad.
 */

/** El subconjunto `latin` tal y como lo emite la Fonts API, recortado a lo que se juzga. */
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122';
const LATIN_EXT = 'U+0100-02BA,U+1E00-1E9F,U+2C60-2C7F';

function cara(familia: string, rango: string): string {
  return `@font-face{font-family:"${familia}";src:url("/x.woff2") format("woff2");unicode-range:${rango};}`;
}

/** La cara de reserva que la Fonts API sintetiza: `src: local(...)` y sin `unicode-range`. */
function reserva(familia: string): string {
  return `@font-face{font-family:"${familia} fallback: Arial";src:local("Arial");font-display:swap;}`;
}

const CSS_LATIN = [cara('Serif', LATIN), reserva('Serif'), cara('Sans', LATIN), reserva('Sans')].join('');

function pagina(html: string, ruta = 'index.html'): PaginaConstruida {
  return { ruta, html };
}

describe('los rangos que declara cada familia', () => {
  it('agrupa por familia y acumula las caras de una misma familia', () => {
    const css = cara('Serif', LATIN) + cara('Serif', LATIN_EXT) + cara('Sans', LATIN);
    const porFamilia = rangosPorFamilia(css);

    expect([...porFamilia.keys()]).toEqual(['Serif', 'Sans']);
    expect(porFamilia.get('Serif')).toHaveLength(9);
    expect(porFamilia.get('Sans')).toHaveLength(6);
  });

  it('ignora las caras de reserva, que no declaran rango', () => {
    // Contarlas daría por bueno cualquier carácter: una cara sin `unicode-range` cubre
    // todo Unicode, y la reserva es lo que la puerta existe para no usar.
    expect([...rangosPorFamilia(CSS_LATIN).keys()]).toEqual(['Serif', 'Sans']);
  });

  it('lee un punto suelto como un rango de uno', () => {
    expect(rangosPorFamilia(cara('Serif', 'U+0131')).get('Serif')).toEqual([
      { desde: 0x0131, hasta: 0x0131 },
    ]);
  });

  it('interpreta la forma con comodín ensanchando, no estrechando', () => {
    expect(rangosPorFamilia(cara('Serif', 'U+04??')).get('Serif')).toEqual([
      { desde: 0x0400, hasta: 0x04ff },
    ]);
  });
});

describe('el texto que llega a componerse', () => {
  it('se deja el contenido de `<style>`, que trae los rangos en hexadecimal', () => {
    // Sin esto la puerta se juzgaría a sí misma: `unicode-range:U+0100-02BA` es texto.
    expect(textoCompuesto('<style>@font-face{unicode-range:U+0100-02BA}</style><p>Hola</p>'))
      .not.toContain('U+0100');
  });

  it('se deja el `ld+json`, que no se pinta', () => {
    const html = '<script type="application/ld+json">{"text":"ζῷον"}</script><p>Hola</p>';
    expect(textoCompuesto(html)).not.toContain('ζ');
  });

  it('desescapa las entidades, porque en pantalla son un carácter', () => {
    expect(textoCompuesto('<p>&laquo;Caminante&raquo; &#241; &#x151;</p>')).toContain('«');
    expect(textoCompuesto('<p>&#241;</p>')).toContain('ñ');
    expect(textoCompuesto('<p>&#x151;</p>')).toContain('ő');
  });

  it('deja una entidad que no conoce como estaba, sin inventarse un carácter', () => {
    expect(textoCompuesto('<p>&noexiste;</p>')).toContain('&noexiste;');
  });
});

describe('el juicio', () => {
  it('da verde a lo español, que vive entero en `latin`', () => {
    // El motivo de la historia: el comentario de `astro.config.mjs` afirmaba que sin
    // `latin-ext` «la eñe y las vocales acentuadas caerían al tipo de reserva».
    const html = '<p>«Caminante, no hay camino» — ¿Señor? ¡Sí! áéíóú ü ñ Gracián</p>';
    expect(revisarCobertura([pagina(html)], CSS_LATIN).ok).toBe(true);
  });

  it('rompe ante un carácter que ninguna cara declarada cubre', () => {
    const resultado = revisarCobertura([pagina('<p>Sándor Petőfi</p>')], CSS_LATIN);

    expect(resultado.ok).toBe(false);
    expect(resultado.fallos).toHaveLength(1);
    expect(resultado.fallos[0]).toMatchObject({ caracter: 'ő', punto: 'U+0151' });
    expect(resultado.fallos[0]?.familias).toEqual(['Serif', 'Sans']);
  });

  it('exige que **todas** las familias lo cubran, no que lo cubra alguna', () => {
    // Aquí no se sabe si esa `ő` cae en un texto de Cita —serif— o en un rótulo —sans—.
    // Con la unión daría verde y se compondría en Georgia dentro de la Cita.
    const css = cara('Serif', LATIN) + cara('Sans', `${LATIN},${LATIN_EXT}`);
    const resultado = revisarCobertura([pagina('<p>Petőfi</p>')], css);

    expect(resultado.ok).toBe(false);
    expect(resultado.fallos[0]?.familias).toEqual(['Serif']);
  });

  it('junta un mismo carácter de varias páginas en un solo fallo', () => {
    const resultado = revisarCobertura(
      [pagina('<p>ő ő</p>', 'a.html'), pagina('<p>ő</p>', 'b.html')],
      CSS_LATIN,
    );

    expect(resultado.fallos).toHaveLength(1);
    expect(resultado.fallos[0]?.apariciones).toBe(3);
    expect(resultado.fallos[0]?.paginas).toEqual(['a.html', 'b.html']);
  });

  it('nombra unas pocas páginas y cuenta el resto, para que el fallo se pueda leer', () => {
    const paginas = Array.from({ length: 20 }, (_, i) => pagina('<p>ő</p>', `p${i}.html`));
    const fallo = revisarCobertura(paginas, CSS_LATIN).fallos[0];

    expect(fallo?.paginas).toHaveLength(3);
    expect(fallo?.apariciones).toBe(20);
    expect(formatearFallos([fallo!])).toContain('+17 más');
  });

  it('sin fuentes propias no hay nada que garantizar', () => {
    // Un sitio que compone entero con la reserva del sistema no es asunto de esta puerta.
    expect(revisarCobertura([pagina('<p>ő</p>')], reserva('Serif')).ok).toBe(true);
  });

  it('ordena los fallos por cuántas veces aparecen', () => {
    const resultado = revisarCobertura([pagina('<p>ő ő ş</p>')], CSS_LATIN);
    expect(resultado.fallos.map((f) => f.caracter)).toEqual(['ő', 'ş']);
  });
});

describe('cómo se cuenta', () => {
  it('el fallo nombra las dos salidas, porque las dos son legítimas', () => {
    const texto = formatearFallos(revisarCobertura([pagina('<p>ő</p>')], CSS_LATIN).fallos);

    expect(texto).toContain('«ő» U+0151');
    expect(texto).toContain('corpus/');
    expect(texto).toContain('subsets');
  });

  it('el titular concuerda en número', () => {
    expect(titularDeFallos(1)).toContain('Un carácter');
    expect(titularDeFallos(3)).toContain('3 caracteres');
  });

  it('el resumen dice qué se ha revisado', () => {
    const resultado = revisarCobertura([pagina('<p>Hola</p>')], CSS_LATIN);
    expect(resumenDelBuild(resultado.paginasRevisadas, resultado.familias)).toBe(
      'Cobertura tipográfica: 1 páginas, 2 familias, sin caídas al tipo de reserva.',
    );
  });
});
