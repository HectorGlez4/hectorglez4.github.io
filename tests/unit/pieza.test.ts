import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  LADO,
  MARGEN,
  MINIMO_DE_CITAS,
  cabenEnPieza,
  desbordanALoAncho,
  svgDePieza,
  type CitaEnPieza,
} from '../../src/lib/pieza.ts';
import { MARCA } from '../../src/lib/marca.ts';
import { tramoDe } from '../../src/lib/tramos.ts';
import { MAX_CARACTERES_IMAGEN } from '../../src/lib/umbrales.ts';

const raiz = resolve(import.meta.dirname, '../..');

/**
 * Historia 13.2 — la Pieza de Canal que reúne varias Citas, sobre lo puro.
 *
 * Lo que se mide aquí es el SVG: que el lienzo sea el que la historia decidió, que **el
 * texto de cada Cita vaya entero**, que cada una lleve su Autor, y que los cuerpos salgan de
 * `tramos.ts` y no de números escritos en la plantilla. Lo que se mide ejecutando la orden
 * está en `pieza-cli.test.ts`.
 */

const BREVE: CitaEnPieza = {
  texto: 'La vida, si sabes usarla, es larga.',
  autor: 'Séneca',
  procedencia: 'Sobre la brevedad de la vida, 49',
};

const MEDIANA: CitaEnPieza = {
  texto:
    'La libertad, Sancho, es uno de los más preciosos dones que a los hombres dieron los ' +
    'cielos; con ella no pueden igualarse los tesoros que encierra la tierra.',
  autor: 'Miguel de Cervantes',
  procedencia: 'Don Quijote de la Mancha, 1615',
};

const SIN_PROCEDENCIA: CitaEnPieza = {
  texto: 'Nada hay más parecido a un hombre que otro hombre.',
  autor: 'Sor Juana Inés de la Cruz',
};

/** Una frase de la longitud pedida, en palabras de verdad para poder buscarlas. */
function frase(caracteres: number): string {
  const base =
    'La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para ' +
    'contarla, y por eso quien escribe su memoria escribe también su olvido. ';
  return base.repeat(Math.ceil(caracteres / base.length)).slice(0, caracteres).trim();
}

/** Todo lo que la Pieza escribe como texto, recompuesto en una sola cadena. */
function textoDelSvg(svg: string): string {
  return [...svg.matchAll(/>([^<]*)<\/text>/g)].map((m) => m[1]).join(' ');
}

describe('Historia 13.2 — el lienzo de la Pieza', () => {
  const svg = svgDePieza([BREVE, MEDIANA]);

  it('es cuadrado de 1080, el mismo de la Imagen de Cita', () => {
    // No es un formato inventado: es la proporción con la que este producto ya publica en
    // una cuenta propia. Elegir un vertical nuevo sería una decisión de producto.
    expect(LADO).toBe(1080);
    expect(MARGEN).toBe(96);
    expect(svg).toContain('width="1080" height="1080"');
    expect(svg).toContain('viewBox="0 0 1080 1080"');
  });

  it('lleva la marca, la misma que la Imagen y la Tarjeta', () => {
    expect(svg).toContain(MARCA.toLocaleUpperCase('es'));
  });
});

describe('Historia 13.2 — el texto de cada Cita va entero', () => {
  const citas = [BREVE, MEDIANA, SIN_PROCEDENCIA];
  const svg = svgDePieza(citas);
  const escrito = textoDelSvg(svg);

  it('no falta ni una palabra de ninguna de las Citas', () => {
    /*
     * Es el criterio que atraviesa la historia. Una Pieza que recorta publica una cita mal
     * atribuida, y NFR-12 prohíbe que el sistema altere lo que el editor guardó. Se
     * recomponen todos los `<text>` y se exige cada palabra: si la plantilla partiera una
     * línea por la mitad, la palabra partida no aparecería.
     */
    for (const cita of citas) {
      for (const palabra of cita.texto.split(/\s+/)) {
        expect(escrito, `falta «${palabra}»`).toContain(palabra);
      }
    }
  });

  it('no abrevia con puntos suspensivos de ninguna de las dos formas', () => {
    expect(svg).not.toContain('…');
    expect(svg).not.toContain('...');
  });

  it('cada Cita lleva su Autor, una sola vez y en versalitas', () => {
    for (const cita of citas) {
      const enVersalitas = cita.autor.toLocaleUpperCase('es');
      const veces = escrito.split(enVersalitas).length - 1;
      expect(veces, `«${cita.autor}» aparece ${veces} veces`).toBe(1);
    }
  });

  it('ninguna Cita aparece sin Autor: hay tantos filetes de atribución como Citas', () => {
    expect([...svg.matchAll(/<rect x="96" y="\d+" width="96"/g)]).toHaveLength(citas.length);
  });

  it('la procedencia se escribe cuando consta y no deja «undefined» cuando no', () => {
    expect(escrito).toContain('Sobre la brevedad de la vida, 49');
    expect(svg).not.toContain('undefined');
  });
});

describe('Historia 13.2 — los cuerpos salen de la tabla de tramos', () => {
  it('cada Cita se compone con el «pixelesEnPieza» de su tramo', () => {
    const svg = svgDePieza([BREVE, MEDIANA]);
    for (const cita of [BREVE, MEDIANA]) {
      expect(svg).toContain(`font-size="${tramoDe(cita.texto).pixelesEnPieza}"`);
    }
  });

  it('dos Citas de tramos distintos se componen con cuerpos distintos', () => {
    expect(tramoDe(BREVE.texto).nombre).not.toBe(tramoDe(MEDIANA.texto).nombre);
    expect(tramoDe(BREVE.texto).pixelesEnPieza).not.toBe(tramoDe(MEDIANA.texto).pixelesEnPieza);
  });

  it('el módulo no lleva ninguna tabla de tamaños propia', () => {
    /*
     * AD-8. Si la llevara, la Pieza podría bajar el cuerpo para que algo quepa, y entonces
     * «no cabe» dejaría de ser una respuesta: NFR-12 se negociaría sola, sin que ningún
     * criterio lo autorizara.
     */
    const fuente = readFileSync(resolve(raiz, 'src/lib/pieza.ts'), 'utf8');
    expect(fuente).toContain("from './tramos.ts'");
    expect(fuente).not.toMatch(/hasta:\s*\d+/);
  });
});

describe('Historia 13.2 — el SVG no se rompe con el texto de una Cita', () => {
  it('escapa lo que rompería el marcado', () => {
    const svg = svgDePieza([
      { texto: 'Más vale <esto> & aquello que "lo otro".', autor: 'Anónimo & Cía.' },
      BREVE,
    ]);
    expect(svg).toContain('&lt;esto&gt;');
    expect(svg).toContain('&amp;');
    expect(svg).toContain('&quot;');
    expect(svg).not.toMatch(/<esto>/);
  });
});

describe('Historia 13.2 — lo que no cabe no se encoge', () => {
  it('dos Citas breves caben de sobra', () => {
    expect(cabenEnPieza([BREVE, SIN_PROCEDENCIA])).toEqual({ cabe: true });
  });

  it('un apilado que se pasa no cabe, y dice cuántas de las pedidas entran', () => {
    const larga = (i: number): CitaEnPieza => ({
      texto: `${i}. ${frase(MAX_CARACTERES_IMAGEN - 4)}`,
      autor: `Autor ${i}`,
    });
    const cabida = cabenEnPieza([1, 2, 3, 4, 5, 6].map(larga));
    expect(cabida.cabe).toBe(false);
    if (cabida.cabe) return;
    expect(cabida.maximo).toBeGreaterThan(0);
    expect(cabida.maximo).toBeLessThan(6);
    // Y lo que dice que cabe, cabe de verdad: no es una cuenta aparte de la del apilado.
    expect(cabenEnPieza([1, 2, 3, 4, 5, 6].slice(0, cabida.maximo).map(larga))).toEqual({
      cabe: true,
    });
  });

  it('componer lo que no cabe lanza en vez de recortar', () => {
    const larga = (i: number): CitaEnPieza => ({
      texto: `${i}. ${frase(MAX_CARACTERES_IMAGEN - 4)}`,
      autor: `Autor ${i}`,
    });
    expect(() => svgDePieza([1, 2, 3, 4, 5, 6].map(larga))).toThrow(/no caben/);
  });

  it('una Cita que no admite Imagen no entra, ni siquiera compuesta a la fuerza', () => {
    const pasada = { texto: frase(MAX_CARACTERES_IMAGEN + 40), autor: 'Séneca' };
    expect(tramoDe(pasada.texto).admiteImagen).toBe(false);
    expect(() => svgDePieza([pasada, BREVE])).toThrow(/FR-10/);
  });
});

describe('Historia 13.2 — la marca del pie tiene su sitio reservado', () => {
  it('no se pisa con la última atribución ni en la Pieza más llena', () => {
    /*
     * El apilado ocupa el alto útil menos la banda de la marca, y sin esa banda el defecto
     * solo aparece en la Pieza **más llena**: la última procedencia queda a diez píxeles de
     * la marca y las dos líneas se solapan. Es exactamente la que nadie compone mientras
     * prueba, así que se comprueba aquí llenándola hasta el tope que la propia función dice.
     */
    const larga = (i: number): CitaEnPieza => ({
      texto: `${i}. ${frase(MAX_CARACTERES_IMAGEN - 8)}`,
      autor: `Autor número ${i}`,
      procedencia: 'Una obra cualquiera, 1912',
    });
    const todas = [1, 2, 3, 4, 5, 6].map(larga);
    const cabida = cabenEnPieza(todas);
    expect(cabida.cabe).toBe(false);
    if (cabida.cabe) return;

    const svg = svgDePieza(todas.slice(0, cabida.maximo));

    /*
     * La marca se identifica por su **contenido**, no por ser la `y` mayor. Deducirla con
     * `Math.max` haría que la prueba se autoengañara justo en el fallo que vigila: si el
     * apilado se desbordara por debajo de la marca, la mayor pasaría a ser la última
     * procedencia y la comparación seguiría saliendo verde.
     */
    const textos = [...svg.matchAll(/<text[^>]*y="(\d+)"[^>]*>([^<]*)<\/text>/g)].map((m) => ({
      y: Number(m[1]),
      contenido: m[2],
    }));
    const marca = textos.find((t) => t.contenido === MARCA.toLocaleUpperCase('es'))!;
    expect(marca).toBeDefined();
    const ultimaAtribucion = Math.max(...textos.filter((t) => t !== marca).map((t) => t.y));
    expect(marca.y - ultimaAtribucion).toBeGreaterThanOrEqual(24);
  });
});

describe('Historia 13.2 — una Cita sola no es una Pieza', () => {
  it('el mínimo lo aplica el módulo puro, no solo la orden', () => {
    /*
     * La guarda vive aquí por lo mismo que la de FR-10: la 13.3 es el consumidor futuro que
     * puede llamar a este módulo sin pasar por `tools/pieza.ts`, y un mínimo que solo aplica
     * el interruptor no es un mínimo.
     */
    expect(MINIMO_DE_CITAS).toBe(2);
    expect(() => svgDePieza([BREVE])).toThrow(/Imagen de Cita/);
    expect(() => cabenEnPieza([BREVE])).toThrow(/Imagen de Cita/);
    expect(() => cabenEnPieza([])).toThrow(/al menos/);
  });
});

describe('Historia 13.2 — lo que se sale por el lado tampoco se compone', () => {
  /*
   * El alto se puede apilar; el ancho no lo miraba nadie. `repartirEnLineas` no parte
   * palabras —su contrato es no perder texto—, así que una palabra indivisible más ancha que
   * el lienzo ocupa su línea y **se sale**: el rasterizado no falla, produce un PNG con la
   * palabra cortada. Es la mutilación de NFR-12 ocurriendo sin que nada avise.
   */
  const INDIVISIBLE = 'a'.repeat(120);

  it('una palabra más ancha que el lienzo se denuncia con su Cita', () => {
    const desbordadas = desbordanALoAncho([{ ...BREVE, texto: `Nada ${INDIVISIBLE}` }, MEDIANA]);
    expect(desbordadas).toHaveLength(1);
    expect(desbordadas[0].indice).toBe(0);
    // Se denuncia la palabra tal y como se compondría, con las comillas angulares que la
    // plantilla añade alrededor de la Cita: es lo que de verdad se saldría del lienzo.
    expect(desbordadas[0].palabras[0]).toContain(INDIVISIBLE);
  });

  it('el Autor y la procedencia también se miran: no van en un solo texto sin medir', () => {
    const conAutorImposible = { texto: BREVE.texto, autor: INDIVISIBLE };
    expect(desbordanALoAncho([conAutorImposible, MEDIANA])[0]?.indice).toBe(0);

    const conProcedenciaImposible = { ...BREVE, procedencia: INDIVISIBLE };
    expect(desbordanALoAncho([conProcedenciaImposible, MEDIANA])[0]?.indice).toBe(0);
  });

  it('un Autor largo de verdad se reparte en líneas en vez de salirse', () => {
    // El caso real no es una palabra imposible sino un nombre o una obra largos, y ésos sí
    // caben: se reparten, como el texto de la Cita.
    const conObraLarga = {
      texto: BREVE.texto,
      autor: 'Bernal Díaz del Castillo',
      procedencia: 'Historia verdadera de la conquista de la Nueva España, 1632',
    };
    expect(desbordanALoAncho([conObraLarga, MEDIANA])).toEqual([]);
    const escrito = textoDelSvg(svgDePieza([conObraLarga, MEDIANA]));
    for (const palabra of conObraLarga.procedencia.split(' ')) {
      expect(escrito, `falta «${palabra}»`).toContain(palabra);
    }
  });

  it('nada que se salga se compone: se lanza en vez de publicar una palabra cortada', () => {
    expect(() => svgDePieza([{ ...BREVE, texto: `Nada ${INDIVISIBLE}` }, MEDIANA])).toThrow(
      /no cabe a lo ancho/,
    );
  });
});

describe('Historia 13.2 — la misma selección compone lo mismo', () => {
  it('dos composiciones seguidas dan la misma cadena', () => {
    expect(svgDePieza([BREVE, MEDIANA, SIN_PROCEDENCIA])).toBe(
      svgDePieza([BREVE, MEDIANA, SIN_PROCEDENCIA]),
    );
  });
});
