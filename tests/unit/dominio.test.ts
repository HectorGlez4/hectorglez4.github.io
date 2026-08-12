import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DOMINIO, SITIO } from '../../src/lib/dominio.ts';

const raiz = resolve(import.meta.dirname, '../..');
const leer = (ruta: string) => readFileSync(resolve(raiz, ruta), 'utf8');

/** Historia 7.1 — el dominio definitivo, en un solo sitio y sin intervención manual. */

describe('Historia 7.1 — el dominio tiene un dueño', () => {
  it('el fichero que exige el hospedaje lo declara', () => {
    // GitHub Pages pierde el dominio propio si el artefacto desplegado no trae CNAME.
    // Está en `public/`, así que Astro lo copia a `dist/` en cada build — incluida la
    // reconstrucción diaria de AD-12, que es lo que el último criterio comprueba.
    expect(leer('public/CNAME').trim()).toBe('sabiduriadebolsillo.com');
  });

  it('el módulo lo lee de ese mismo fichero, no de una copia', () => {
    expect(DOMINIO).toBe(leer('public/CNAME').trim());
    expect(SITIO).toBe(`https://${DOMINIO}`);
  });

  it('una variable de entorno vacía no deja el sitio sin dominio', () => {
    /*
     * `${{ vars.SITE_URL }}` sin definir llega como cadena vacía, no como ausente: con
     * `??` el sitio se construiría con `site: ''` y todas las canónicas saldrían
     * relativas. El despliegue no fallaría; solo publicaría mal.
     */
    const config = leer('astro.config.mjs');
    expect(config).not.toMatch(/process\.env\.SITE_URL\s*\?\?/);
    expect(config).toContain("from './src/lib/dominio.ts'");
  });

  it('ninguna página ni componente lo lleva escrito a mano', () => {
    function ficheros(dir: string): string[] {
      return readdirSync(dir).flatMap((e) => {
        const ruta = join(dir, e);
        return statSync(ruta).isDirectory() ? ficheros(ruta) : [ruta];
      });
    }

    const escritoAMano = ficheros(resolve(raiz, 'src'))
      .filter((f) => f !== resolve(raiz, 'src/lib/dominio.ts'))
      .filter((f) => /sabiduriadebolsillo/i.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(raiz.length + 1));

    expect(escritoAMano, 'llevan el dominio escrito a mano').toEqual([]);
  });
});

describe('Historia 7.1 — el despliegue lo conserva solo', () => {
  const flujo = leer('.github/workflows/publicar.yml');

  it('el build recibe el dominio por variable de entorno', () => {
    expect(flujo).toContain('SITE_URL: ${{ vars.SITE_URL }}');
  });

  it('la reconstrucción diaria usa el mismo build, sin paso propio de dominio', () => {
    // Un paso aparte que reescribiera el CNAME sería justo lo que el criterio prohíbe:
    // algo que hay que acordarse de mantener.
    expect(flujo).toMatch(/schedule:\s*\n\s*- cron:/);
    expect(flujo).not.toMatch(/CNAME/);
  });
});
