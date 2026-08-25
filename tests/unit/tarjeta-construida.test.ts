import { afterAll, describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { AUTOR_VALIDO, citaValida, construirConCorpus, limpiar } from './ayuda/construir.js';
import { MAX_CARACTERES_IMAGEN } from '../../src/lib/umbrales.ts';
import { tramoDe } from '../../src/lib/tramos.ts';

/**
 * Historia 10.1 — el caso que el corpus real no tiene: una Cita por encima del corte.
 *
 * La Tarjeta existe para **toda** Cita publicada, y las que no admiten Imagen son
 * justamente las que se quedarían sin previsualización si la Tarjeta se derivara de la
 * Imagen en vez de ser pieza propia.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

function frase(caracteres: number): string {
  const base =
    'La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para ' +
    'contarla, y por eso quien escribe su memoria escribe también su olvido. ';
  return base.repeat(Math.ceil(caracteres / base.length)).slice(0, caracteres).trim();
}

describe('Historia 10.1 — la Cita larga también tiene Tarjeta', () => {
  let proyecto = '';

  const larga = frase(MAX_CARACTERES_IMAGEN + 40);
  const corta = 'La vida, si sabes usarla, es larga.';

  it('construye un sitio con una Cita larga y otra corta', async () => {
    expect(tramoDe(larga).admiteImagen).toBe(false);

    const resultado = await construirConCorpus({
      'autores/seneca.yml': AUTOR_VALIDO,
      'citas/seneca--larga.md': citaValida({ texto: larga, slug: 'seneca-larga', temas: [] }),
      'citas/seneca--corta.md': citaValida({ texto: corta, slug: 'seneca-corta', temas: [] }),
    });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  });

  it('las dos Citas tienen su Tarjeta, aunque solo una admita Imagen', async () => {
    /*
     * Se filtran los `.png` a propósito. La comprobación es «cada Cita tiene la suya», y
     * comparar el directorio entero decía además «y aquí no hay nada más», que no es lo que
     * esta prueba mira: desde la 53.ª sesión `dist/tarjeta/` tiene también los subdirectorios
     * `tema/`, `coleccion/` y `autor/`, con la Tarjeta de cada página de listado. Que esas
     * existan es asunto de sus propias pruebas, no de ésta.
     */
    const tarjetas = (await readdir(join(proyecto, 'dist', 'tarjeta'))).filter((f) =>
      f.endsWith('.png'),
    );
    expect(tarjetas.sort()).toEqual(['seneca-corta.png', 'seneca-larga.png']);
  });

  it('la Página de la Cita larga la declara igual', async () => {
    const html = await readFile(join(proyecto, 'dist', 'cita', 'seneca-larga.html'), 'utf8');
    expect(html).toContain('/tarjeta/seneca-larga.png');
    // Y sigue sin ofrecer Imagen de Cita, que es otra cosa (FR-10).
    expect(html).not.toContain('data-imagen');
  });

  it('las dos Tarjetas son PNG de 1200×630 con contenido de verdad', async () => {
    for (const fichero of ['seneca-corta.png', 'seneca-larga.png']) {
      const bytes = await readFile(join(proyecto, 'dist', 'tarjeta', fichero));
      expect(bytes.subarray(1, 4).toString()).toBe('PNG');
      expect(bytes.readUInt32BE(16)).toBe(1200);
      expect(bytes.readUInt32BE(20)).toBe(630);
      expect(bytes.length).toBeGreaterThan(5000);
    }
  });

  it('la Tarjeta de la larga pesa menos que la de la corta: no lleva el texto', async () => {
    /*
     * Comprobación indirecta pero real: la que sí lleva texto tiene muchos más glifos y
     * por tanto más entropía. Si un día alguien «arreglara» la larga metiéndole el texto
     * recortado, esta prueba lo vería sin necesidad de leer píxeles.
     */
    const larga = await readFile(join(proyecto, 'dist', 'tarjeta', 'seneca-larga.png'));
    const corta = await readFile(join(proyecto, 'dist', 'tarjeta', 'seneca-corta.png'));
    expect(larga.length).toBeLessThan(corta.length);
  });
});
