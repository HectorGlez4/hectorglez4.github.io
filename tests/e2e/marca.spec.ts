import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { MARCA } from '../../src/lib/marca.ts';

/** Historia 6.1 — el nombre correcto en toda superficie, y en ninguna el retirado. */

const RETIRADO = new RegExp(['Sabidur', '[ií]a[\\s-]?Diaria'].join(''), 'i');
const raiz = new URL('../..', import.meta.url).pathname;

const SUPERFICIES = [
  { ruta: '/', nombre: 'portada' },
  { ruta: '/buscar', nombre: 'búsqueda' },
  { ruta: '/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los', nombre: 'Página de Cita' },
  { ruta: '/autor/miguel-de-cervantes', nombre: 'Página de Autor' },
  { ruta: '/no-existe-esta-ruta', nombre: '404' },
];

test.describe('Historia 6.1 — la marca dice el nombre nuevo', () => {
  for (const { ruta, nombre } of SUPERFICIES) {
    test(`${nombre} lleva la marca en cabecera y en el título`, async ({ page }) => {
      await page.goto(ruta);
      await expect(page.locator('header .marca')).toHaveText(MARCA);
      expect(await page.title()).toContain(MARCA);
    });
  }

  test('ninguna superficie menciona el nombre retirado', async ({ request }) => {
    for (const { ruta, nombre } of SUPERFICIES) {
      const cuerpo = await (await request.get(ruta)).text();
      expect(RETIRADO.test(cuerpo), `lo menciona ${nombre}`).toBe(false);
    }
  });
});

test.describe('Historia 6.1 — el sitio construido', () => {
  test('no contiene el nombre retirado en ningún fichero de dist/', () => {
    const sospechosos: string[] = [];

    function recorrer(dir: string) {
      for (const entrada of readdirSync(dir)) {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) {
          recorrer(ruta);
          continue;
        }
        // Los binarios —tipografías, imágenes— no llevan texto que revisar.
        if (/\.(woff2?|ttf|png|jpe?g|webp|ico|pf_meta|pf_fragment|pf_index)$/.test(entrada)) continue;
        if (RETIRADO.test(readFileSync(ruta, 'utf8'))) sospechosos.push(ruta.slice(raiz.length));
      }
    }

    recorrer(join(raiz, 'dist'));
    expect(sospechosos, 'ficheros de dist/ con el nombre retirado').toEqual([]);
  });
});

test.describe('Historia 6.1 — la marca de agua de la Imagen de Cita', () => {
  test('se dibuja con el nombre nuevo, en su sitio y con su peso de siempre', async ({ page }) => {
    await page.goto('/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los');

    /*
     * Se intercepta `fillText` antes de abrir el diálogo: comparar píxeles diría que la
     * imagen cambió, pero no qué se escribió ni con qué tipografía. Lo que el criterio
     * pide comprobar es el texto, la posición y el peso, y eso está aquí.
     */
    await page.evaluate(() => {
      (window as unknown as { __trazos: unknown[] }).__trazos = [];
      const original = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (texto, x, y, ...resto) {
        (window as unknown as { __trazos: unknown[] }).__trazos.push({ texto, x, y, font: this.font });
        return original.call(this, texto, x, y, ...(resto as []));
      };
    });

    await page.getByRole('button', { name: 'Descargar como imagen' }).click();
    await page.waitForFunction(() => {
      const l = document.querySelector('[data-lienzo]') as HTMLCanvasElement | null;
      return !!l && l.getContext('2d')!.getImageData(0, 0, 1, 1).data[3] === 255;
    });

    const trazos = (await page.evaluate(
      () => (window as unknown as { __trazos: { texto: string; x: number; y: number; font: string }[] }).__trazos,
    )) as { texto: string; x: number; y: number; font: string }[];

    const marcaDeAgua = trazos.find((t) => t.texto === MARCA.toLocaleUpperCase('es'));
    expect(marcaDeAgua, 'no se dibujó la marca de agua con el nombre nuevo').toBeTruthy();

    // Posición y peso anteriores: margen 96, línea de base a 1080 − 96 + 8, seminegrita 20px.
    expect(marcaDeAgua!.x).toBe(96);
    expect(marcaDeAgua!.y).toBe(1080 - 96 + 8);
    expect(marcaDeAgua!.font).toBe('600 20px Inter, system-ui, sans-serif');

    // Y ninguna aparición del nombre retirado entre lo dibujado.
    expect(trazos.some((t) => RETIRADO.test(t.texto))).toBe(false);
  });
});
