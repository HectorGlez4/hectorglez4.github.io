import { expect, test } from '@playwright/test';
import { citaEnVersoMasLargaPorTramo, citaMasLargaPorTramo } from './ayuda/corpus.ts';

/**
 * Historia 29.3 — la prueba de cabida de la Imagen de Cita, con los saltos restituidos.
 *
 * Para la Cita más larga de cada tramo que admite Imagen y las Citas en verso más largas de cada
 * tramo (por caracteres y por versos), en su propia página y con Source Serif cargada, se dibuja
 * la Imagen cuadrada con `public/islas/imagen.js` y los datos que la isla lee de su marcado, y se
 * espía cada `fillText`: todo texto y toda atribución caben a lo ancho en
 * `[MARGEN, 1080 − MARGEN]` y acaban por encima de la marca (`1080 − 96`). Si una Cita de hasta
 * `MAX_CARACTERES_IMAGEN` deja de caber, el reparto de la tabla de tramos lo cambia Héctor, nunca
 * un agente (la 25.2 y la 25.4 añadirán aquí el pie y el 9:16).
 */

const LADO = 1080;
const MARGEN = 96;

interface Escrita {
  texto: string;
  x: number;
  y: number;
  ancho: number;
  cuerpo: number;
}

const casos: { tramo: string; cual: string; slug: string }[] = [];
for (const [tramo, slug] of citaMasLargaPorTramo()) casos.push({ tramo, cual: 'la más larga', slug });
for (const [tramo, { porCaracteres, porVersos }] of citaEnVersoMasLargaPorTramo()) {
  casos.push({ tramo, cual: 'en verso, la más larga', slug: porCaracteres });
  if (porVersos !== porCaracteres) casos.push({ tramo, cual: 'en verso, la de más versos', slug: porVersos });
}

test.describe('Historia 29.3 — cabida de la Imagen de Cita', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'El lienzo se mide en Chromium.');

  test('hay al menos una Cita en verso que medir', () => {
    expect(citaEnVersoMasLargaPorTramo().size, 'ninguna Cita en verso admite Imagen: falta el commit de restitución de la 29.2').toBeGreaterThan(0);
  });

  for (const { tramo, cual, slug } of casos) {
    test(`${tramo}, ${cual}: ${slug}`, async ({ page }) => {
      await page.goto(`/cita/${slug}`);
      const escritas = await page.evaluate(async () => {
        const isla = document.querySelector<HTMLElement>('[data-imagen]');
        if (isla === null) throw new Error('La página no lleva la isla de la Imagen.');
        await document.fonts.load(`400 ${isla.dataset.tamano}px "Source Serif 4"`);
        const { dibujar } = await import(/* @vite-ignore */ '/islas/imagen.js' as string);
        const lienzo = document.createElement('canvas');
        const ctx = lienzo.getContext('2d')!;
        const apuntadas: { texto: string; x: number; y: number; ancho: number; cuerpo: number }[] = [];
        const fillText = ctx.fillText.bind(ctx);
        ctx.fillText = (texto: string, x: number, y: number) => {
          apuntadas.push({ texto, x, y, ancho: ctx.measureText(texto).width, cuerpo: Number(/(\d+)px/.exec(ctx.font)![1]) });
          fillText(texto, x, y);
        };
        // `getContext('2d')` devuelve siempre el mismo contexto: `dibujar` escribe en este.
        dibujar(lienzo, {
          texto: isla.dataset.texto,
          autor: isla.dataset.autor,
          procedencia: isla.dataset.procedencia,
          tamaño: Number(isla.dataset.tamano),
          marca: isla.dataset.marca,
          formato: 'cuadrado',
          plantilla: 'papel',
        });
        return { apuntadas, marca: isla.dataset.marca!.toLocaleUpperCase('es') };
      });

      const { apuntadas, marca } = escritas as { apuntadas: Escrita[]; marca: string };
      const sinMarca = apuntadas.filter((e) => e.texto !== marca);
      expect(sinMarca.length).toBeGreaterThan(0);
      for (const e of sinMarca) {
        expect(e.x, `«${e.texto}»`).toBeGreaterThanOrEqual(MARGEN);
        expect(e.x + e.ancho, `«${e.texto}» se sale a lo ancho`).toBeLessThanOrEqual(LADO - MARGEN);
        expect(e.y + e.cuerpo, `«${e.texto}» acaba debajo de la marca`).toBeLessThanOrEqual(LADO - MARGEN);
      }
    });
  }
});
