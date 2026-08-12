import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SITIO } from '../../src/lib/dominio.ts';
import { RUTA_DEL_SITEMAP, robots } from '../../src/lib/buscadores.ts';

const raiz = resolve(import.meta.dirname, '../..');

/** Historia 7.2 — el sitio se anuncia, y anuncia lo mismo por sus tres canales. */

describe('Historia 7.2 — robots.txt', () => {
  const texto = robots(SITIO);

  it('declara dónde está el sitemap, con dominio absoluto', () => {
    // La línea `Sitemap:` es la única del formato que exige URL absoluta.
    expect(texto).toContain(`Sitemap: ${SITIO}${RUTA_DEL_SITEMAP}`);
  });

  it('deja rastrear el sitio entero', () => {
    expect(texto).toMatch(/^User-agent: \*$/m);
    expect(texto).toMatch(/^Allow: \/$/m);
  });

  it('no bloquea nada', () => {
    /*
     * Ni siquiera lo que se pide no indexar. Un `Disallow` impide descargar la página, y
     * una página que no se descarga es una página cuyo `noindex` nunca se lee: la URL
     * puede acabar indexada igual, sin descripción y sin poder quitarla. Bloquear el
     * rastreo y pedir que no se indexe son cosas distintas, y aquí hace falta la segunda.
     */
    expect(texto).not.toMatch(/^Disallow: \S/m);
  });

  it('lo sirve una ruta del sitio, no un fichero suelto que copiar', () => {
    const endpoint = readFileSync(resolve(raiz, 'src/pages/robots.txt.ts'), 'utf8');
    expect(endpoint).toContain("from '../lib/buscadores.ts'");
  });
});

describe('Historia 7.2 — el método de verificación queda documentado', () => {
  const despliegue = readFileSync(resolve(raiz, 'DESPLIEGUE.md'), 'utf8');

  it('dice dónde se verifica y con qué tipo de propiedad', () => {
    // Sin esto, LC-3 es irrepetible: quien lo hizo lo recuerda y nadie más.
    expect(despliegue).toContain('Search Console');
    expect(despliegue).toMatch(/propiedad de \*\*dominio\*\*|Agregar propiedad → Dominio/);
  });

  it('dice cómo se prueba la titularidad y qué no hay que tocar después', () => {
    expect(despliegue).toContain('google-site-verification');
    expect(despliegue).toMatch(/no borrar|No borrar/i);
  });

  it('dice que hay que enviar el sitemap, y cuál', () => {
    expect(despliegue).toContain('sitemap-index.xml');
  });
});
