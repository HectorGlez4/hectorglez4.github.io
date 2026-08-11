import { afterAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AUTOR_VALIDO, citaValida, construirConCorpus, limpiar } from './ayuda/construir.js';
import { MAX_CARACTERES_IMAGEN } from '../../src/lib/umbrales.ts';
import { tramoDe } from '../../src/lib/tramos.ts';

/**
 * Historia 5.1 — el caso de la Cita de más de 300 caracteres.
 *
 * El corpus real no tiene ninguna que pase de 101 caracteres, y añadir una frase
 * inventada de 300 para poder probar esto metería una atribución sin verificar en
 * `corpus/citas/`. Se construye con un corpus fabricado, como en la paginación.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

/** Una frase real de longitud controlada, no una repetición de letras. */
function frase(caracteres: number): string {
  const base =
    'La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para ' +
    'contarla, y por eso quien escribe su memoria escribe también su olvido, y en ese ' +
    'olvido cabe todo lo que fuimos sin llegar a saberlo nunca del todo, porque la ' +
    'memoria elige y al elegir inventa. ';
  return base.repeat(Math.ceil(caracteres / base.length)).slice(0, caracteres).trim();
}

describe('Historia 5.1 — por encima del corte no se ofrece imagen', () => {
  let proyecto: string;

  const larga = frase(MAX_CARACTERES_IMAGEN + 40);
  const corta = 'La vida, si sabes usarla, es larga.';

  it('la frase de prueba pasa de verdad del corte', () => {
    expect([...larga].length).toBeGreaterThan(MAX_CARACTERES_IMAGEN);
    expect(tramoDe(larga).admiteImagen).toBe(false);
    expect(tramoDe(corta).admiteImagen).toBe(true);
  });

  it('construye un sitio con una Cita larga y otra corta', async () => {
    const resultado = await construirConCorpus({
      'autores/seneca.yml': AUTOR_VALIDO,
      'citas/seneca--larga.md': citaValida({ texto: larga, slug: 'seneca-larga', temas: [] }),
      'citas/seneca--corta.md': citaValida({ texto: corta, slug: 'seneca-corta', temas: [] }),
    });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  });

  it('la acción de imagen no se muestra en la Cita larga', async () => {
    const html = await readFile(join(proyecto, 'dist', 'cita', 'seneca-larga.html'), 'utf8');
    // No se oculta con CSS ni se deshabilita: no existe en el marcado.
    expect(html).not.toContain('data-imagen');
    expect(html).not.toContain('Descargar como imagen');
  });

  it('la acción de copiar sigue disponible en la Cita larga', async () => {
    const html = await readFile(join(proyecto, 'dist', 'cita', 'seneca-larga.html'), 'utf8');
    expect(html).toContain('Copiar la cita');
  });

  it('en la Cita corta sí se ofrece', async () => {
    const html = await readFile(join(proyecto, 'dist', 'cita', 'seneca-corta.html'), 'utf8');
    expect(html).toContain('Descargar como imagen');
  });

  it('el texto de la Cita larga se muestra entero, sin recortar', async () => {
    // NFR-12 — el sistema no abrevia una Cita publicada. Que no quepa en una imagen no
    // es motivo para que no quepa en su página.
    const html = await readFile(join(proyecto, 'dist', 'cita', 'seneca-larga.html'), 'utf8');
    expect(html).toContain(larga.slice(0, 60));
    expect(html).toContain(larga.slice(-40));

    // Se mira el `blockquote`, no el documento entero: el `<title>` sí recorta con
    // puntos suspensivos, y debe hacerlo — una pestaña no admite trescientos caracteres.
    // Lo que NFR-12 protege es la Cita, no el título de la pestaña.
    const cita = /<blockquote[\s\S]*?<\/blockquote>/.exec(html)![0];
    expect(cita).not.toContain('…');
    expect(cita).toContain(larga.slice(-40));
  });

  it('se compone en el suelo legible y no por debajo', async () => {
    const html = await readFile(join(proyecto, 'dist', 'cita', 'seneca-larga.html'), 'utf8');
    expect(html).toMatch(/data-tramo="sm"/);
  });
});
