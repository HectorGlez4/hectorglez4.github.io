import { describe, expect, it } from 'vitest';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MAX_BYTES_GUION_DE_IMAGEN } from '../../src/lib/umbrales.ts';

/**
 * Historia 29.3 — el reparto de `public/islas/imagen.js` abre línea en cada salto de verso.
 *
 * Se importa el fichero tal cual se sirve y se dibuja sobre un lienzo simulado: `measureText`
 * mide diez píxeles por carácter y `fillText` apunta cada línea con su fuente, así que la prueba
 * ve exactamente lo que el generador pinta, sin navegador.
 */

const FICHERO = resolve(import.meta.dirname, '../../public/islas/imagen.js');
const { dibujar } = (await import(pathToFileURL(FICHERO).href)) as {
  dibujar: (lienzo: unknown, datos: Record<string, unknown>) => unknown;
};

/** Las líneas de la Cita que pinta `dibujar`: las escritas con la serif. */
function lineasDibujadas(texto: string, tamaño = 52): string[] {
  const escritas: { texto: string; font: string }[] = [];
  const ctx = {
    font: '',
    fillStyle: '',
    textBaseline: '',
    fillRect() {},
    fillText(t: string) {
      escritas.push({ texto: t, font: ctx.font });
    },
    measureText: (t: string) => ({ width: [...t].length * 10 }),
  };
  const lienzo = { width: 0, height: 0, getContext: () => ctx };
  dibujar(lienzo, { texto, tamaño, autor: 'José Martí', procedencia: 'Versos sencillos, 1891', marca: 'Sabiduría de Bolsillo', plantilla: 'papel', formato: 'cuadrado' });
  return escritas.filter((e) => e.font.includes('Source Serif')).map((e) => e.texto);
}

/** El reparto de antes de la 29.3, por palabras, para comparar la prosa. */
function deCorrido(texto: string, ancho: number): string[] {
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of texto.split(/\s+/)) {
    const tentativa = actual === '' ? palabra : `${actual} ${palabra}`;
    if ([...tentativa].length * 10 <= ancho || actual === '') actual = tentativa;
    else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual !== '') lineas.push(actual);
  return lineas;
}

describe('Historia 29.3 — la Imagen de Cita, verso a verso', () => {
  const MARTI =
    'Yo vengo de todas partes,\nY hacia todas partes voy:\nArte soy entre las artes,\nEn los montes, monte soy.';

  it('un verso por línea cuando cabe, con « en el primero y » en el último', () => {
    expect(lineasDibujadas(MARTI)).toEqual([
      '«Yo vengo de todas partes,',
      'Y hacia todas partes voy:',
      'Arte soy entre las artes,',
      'En los montes, monte soy.»',
    ]);
  });

  it('un verso más ancho que la línea sigue en la siguiente, y ninguna línea une dos versos', () => {
    const largo = 'un verso muy largo que no cabe de ninguna manera en una sola línea del lienzo cuadrado ni aunque se empeñe el poeta\ncorto';
    const lineas = lineasDibujadas(largo);
    expect(lineas.length).toBeGreaterThan(2);
    expect(lineas.at(-1)).toBe('corto»');
    for (const linea of lineas) expect(linea.includes('cuadrado') && linea.includes('corto')).toBe(false);
  });

  it('sin saltos, las mismas líneas que antes', () => {
    const prosa =
      'La libertad, Sancho, es uno de los más preciosos dones que a los hombres dieron los cielos; con ella no pueden igualarse los tesoros.';
    expect(lineasDibujadas(prosa)).toEqual(deCorrido(`«${prosa}»`, 1080 - 96 * 2));
  });

  it(`el fichero pesa como mucho ${MAX_BYTES_GUION_DE_IMAGEN} bytes`, () => {
    expect(statSync(FICHERO).size).toBeLessThanOrEqual(MAX_BYTES_GUION_DE_IMAGEN);
  });
});
