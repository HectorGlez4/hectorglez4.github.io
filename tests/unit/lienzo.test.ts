import { describe, expect, it } from 'vitest';
import {
  ANCHO_POR_CARACTER,
  ANCHO_POR_CARACTER_EN_VERSALITAS,
  PALETA,
  SANS,
  SERIF,
  anchoAproximado,
  escapar,
  palabrasQueDesbordan,
  repartirEnLineas,
} from '../../src/lib/lienzo.ts';

/**
 * Historias 10.1 y 13.2 — el contrato del lienzo compartido.
 *
 * Estas funciones se extrajeron de `tarjeta.ts` cuando llegó el segundo módulo que
 * rasteriza. Tienen prueba propia porque ahora tienen **dos** consumidores: probarlas a
 * través de uno solo dejaría que un cambio pensado para la Tarjeta rompiera la Pieza sin
 * que ninguna prueba de la Tarjeta lo notara.
 */

describe('escapar — lo que rompería el SVG', () => {
  it('escapa los cuatro caracteres, y solo esos', () => {
    expect(escapar('a & b')).toBe('a &amp; b');
    expect(escapar('<esto>')).toBe('&lt;esto&gt;');
    expect(escapar('dijo "hola"')).toBe('dijo &quot;hola&quot;');
  });

  it('escapa el ampersand antes que el resto: nada se escapa dos veces', () => {
    // Si `<` se sustituyera primero, el `&` de `&lt;` volvería a escaparse y saldría
    // «&amp;lt;» — texto visible en la imagen en lugar de un signo menor.
    expect(escapar('<')).toBe('&lt;');
    expect(escapar('&lt;')).toBe('&amp;lt;');
  });

  it('no quita nada: lo que entra sale, escapado', () => {
    const texto = 'Más vale <esto> & aquello que "lo otro", ¿no?';
    expect(escapar(texto)).toContain('¿no?');
    expect(escapar(texto)).not.toContain('…');
  });

  it('deja intacto un texto sin caracteres de marcado', () => {
    const texto = 'La vida, si sabes usarla, es larga.';
    expect(escapar(texto)).toBe(texto);
  });
});

describe('repartirEnLineas — reparte y nunca pierde texto', () => {
  const TEXTO =
    'La libertad, Sancho, es uno de los más preciosos dones que a los hombres dieron los cielos.';

  it('devuelve el texto íntegro, palabra por palabra y en orden', () => {
    // Es el contrato entero: NFR-12 prohíbe alterar una Cita, y esta es la única función
    // del camino de rasterizado que la toca.
    expect(repartirEnLineas(TEXTO, 46, 1040).join(' ')).toBe(TEXTO);
    expect(repartirEnLineas(TEXTO, 26, 300).join(' ')).toBe(TEXTO);
    expect(repartirEnLineas(TEXTO, 64, 200).join(' ')).toBe(TEXTO);
  });

  it('no parte palabras ni añade guiones', () => {
    for (const linea of repartirEnLineas(TEXTO, 46, 1040)) {
      expect(linea).not.toMatch(/-$/);
    }
  });

  it('una palabra más larga que la línea no se pierde ni bloquea el reparto', () => {
    const lineas = repartirEnLineas('supercalifragilisticoespialidoso y poco más', 56, 200);
    expect(lineas.join(' ')).toBe('supercalifragilisticoespialidoso y poco más');
  });

  it('a menor ancho, más líneas: el reparto responde al lienzo', () => {
    expect(repartirEnLineas(TEXTO, 46, 300).length).toBeGreaterThan(
      repartirEnLineas(TEXTO, 46, 1040).length,
    );
  });

  it('el factor de anchura se puede declarar: las versalitas ocupan más', () => {
    const nombre = 'SOR JUANA INÉS DE LA CRUZ';
    const corrido = repartirEnLineas(nombre, 24, 300);
    const enVersalitas = repartirEnLineas(nombre, 24, 300, ANCHO_POR_CARACTER_EN_VERSALITAS);
    expect(enVersalitas.length).toBeGreaterThanOrEqual(corrido.length);
    expect(enVersalitas.join(' ')).toBe(nombre);
  });
});

describe('palabrasQueDesbordan — la otra mitad de «no cabe»', () => {
  it('no denuncia nada cuando todo cabe', () => {
    expect(palabrasQueDesbordan('La vida es larga', 26, 888)).toEqual([]);
  });

  it('denuncia la palabra indivisible que se saldría del lienzo', () => {
    const palabra = 'a'.repeat(200);
    expect(palabrasQueDesbordan(`corta ${palabra} corta`, 26, 888)).toEqual([palabra]);
  });

  it('lo que denuncia es exactamente lo que el reparto no puede colocar', () => {
    /*
     * Las dos funciones tienen que estar de acuerdo. Si `palabrasQueDesbordan` fuera más
     * laxa, el reparto dejaría texto fuera del lienzo sin que nadie lo rechazara — que es
     * el defecto que esta pareja existe para cerrar.
     */
    const palabra = 'b'.repeat(120);
    const cuerpo = 26;
    const ancho = 888;
    const lineas = repartirEnLineas(palabra, cuerpo, ancho);
    const seSale = anchoAproximado(lineas[0], cuerpo) > ancho;
    expect(palabrasQueDesbordan(palabra, cuerpo, ancho).length > 0).toBe(seSale);
  });

  it('mide las versalitas con su propio factor', () => {
    // 60 mayúsculas caben con el factor del texto corrido y no con el de las versalitas.
    const nombre = 'A'.repeat(60);
    expect(palabrasQueDesbordan(nombre, 24, 888)).toEqual([]);
    expect(palabrasQueDesbordan(nombre, 24, 888, ANCHO_POR_CARACTER_EN_VERSALITAS)).toEqual([
      nombre,
    ]);
  });
});

describe('la paleta y las familias tienen un solo dueño', () => {
  it('la paleta es la de la plantilla «papel» de DESIGN.md', () => {
    expect(PALETA.papel).toBe('#faf7f0');
    expect(PALETA.tinta).toBe('#1f1b16');
    expect(PALETA.apagada).toBe('#5a5147');
    expect(PALETA.filete).toBe('#ddd5c7');
    expect(PALETA.siena).toBe('#8c4a2f');
  });

  it('la serif es para la Cita y la sans para la voz del sistema', () => {
    expect(SERIF).toContain('serif');
    expect(SANS).toContain('sans-serif');
  });

  it('la estimación de anchura es conservadora y tiene nombre', () => {
    expect(ANCHO_POR_CARACTER).toBeLessThan(ANCHO_POR_CARACTER_EN_VERSALITAS);
    expect(anchoAproximado('abcd', 10)).toBe(4 * 10 * ANCHO_POR_CARACTER);
  });
});
