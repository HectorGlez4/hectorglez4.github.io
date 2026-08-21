import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DOMINIO, SITIO } from '../../src/lib/dominio.ts';
import { modeloDe } from '../../src/lib/ingreso.ts';

const raiz = resolve(import.meta.dirname, '../..');
const leer = (ruta: string) => readFileSync(resolve(raiz, ruta), 'utf8');

/** Historia 7.1 — el dominio definitivo, en un solo sitio y sin intervención manual. */

describe('Historia 7.1 — el dominio tiene un dueño', () => {
  it('el fichero que exige el hospedaje lo declara', () => {
    // GitHub Pages pierde el dominio propio si el artefacto desplegado no trae CNAME.
    // Está en `public/`, así que Astro lo copia a `dist/` en cada build — incluida la
    // reconstrucción diaria de AD-12, que es lo que el último criterio comprueba.
    expect(leer('public/CNAME').trim()).toBe('sabiduriadebolsillo.net');
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

    /*
     * Se busca el **dominio**, y no la palabra suelta.
     *
     * Estaba escrito como `/sabiduriadebolsillo/i`, que es el nombre del sitio sin su TLD, y
     * eso cazaba cosas que no son el dominio: la Historia 14.2 declaró en `src/lib/ingreso.ts`
     * el destino de la invitación de donación —`https://ko-fi.com/sabiduriadebolsillo`—, donde
     * esa palabra es el **identificador de una cuenta en Ko-fi** que casualmente coincide con
     * la etiqueta del dominio. Un enlace a un tercero no es el dominio del sitio escrito a
     * mano, y derivarlo de `DOMINIO` sería peor: ataría la cuenta de cobro al nombre del
     * dominio, que son dos cosas que pueden cambiar por separado.
     *
     * Lo que la regla existe para impedir —que una página, un componente o el armazón compongan
     * una canónica sin pasar por `public/CNAME`— lo sigue cazando igual, y ahora contra el
     * dominio de verdad en vez de contra una cadena tecleada aquí.
     */
    const escritoAMano = ficheros(resolve(raiz, 'src'))
      .filter((f) => f !== resolve(raiz, 'src/lib/dominio.ts'))
      .filter((f) => readFileSync(f, 'utf8').toLowerCase().includes(DOMINIO.toLowerCase()))
      .map((f) => f.slice(raiz.length + 1));

    expect(escritoAMano, 'llevan el dominio escrito a mano').toEqual([]);
  });

  it('y esa búsqueda sabe encontrar el dominio cuando está', () => {
    // El control positivo, que hace falta desde que el patrón dejó de ser un literal legible:
    // sin esto, un `DOMINIO` vacío o mal leído dejaría la aserción de arriba pasando siempre.
    expect(DOMINIO).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/i);
    expect(`<link rel="canonical" href="https://${DOMINIO}/buscar">`.toLowerCase()).toContain(
      DOMINIO.toLowerCase(),
    );
    /*
     * Y la palabra suelta, sin TLD, ya no basta para dar positivo: es lo que se acaba de
     * relajar a propósito, y conviene que se vea en una prueba y no solo en un comentario.
     *
     * La dirección se lee del **fichero de verdad** y no se reescribe aquí. Tecleada a mano,
     * este control seguiría afirmando algo cierto sobre una cadena que ya no existiría en
     * ningún sitio el día que el destino de la donación cambiara — que es justo el día en que
     * hay que volver a preguntarse si la relajación sigue estando justificada.
     */
    const destino = modeloDe('donaciones')?.destino;
    expect(destino, 'el Modelo de donaciones ya no declara destino').toBeDefined();
    expect(destino).toContain('sabiduriadebolsillo');
    expect(destino?.includes(DOMINIO)).toBe(false);
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
