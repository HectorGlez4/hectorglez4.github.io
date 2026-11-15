import { expect, test } from '@playwright/test';
import { admiteImagen } from '../../src/lib/tramos.ts';
import { citaEnVersoMasLargaPorTramo, citaMasLargaPorTramo, citasEnVerso } from './ayuda/corpus.ts';

/**
 * Historia 29.3 — la prueba de cabida de la Imagen de Cita, con los saltos restituidos.
 *
 * Para la Cita más larga de cada tramo que admite Imagen y para **toda** Cita en verso que la
 * admite —el peor caso es el de más líneas dibujadas (versos × reparto), que no se adivina por
 * caracteres ni por versos, y son pocas—, en su propia página y con Source Serif cargada, se
 * dibuja la Imagen en sus dos formatos con `public/islas/imagen.js` y los datos que la isla lee
 * de su marcado, y se espía cada `fillText`: con la línea base arriba (`textBaseline = 'top'`),
 * todo texto y toda atribución caben a lo ancho en `[MARGEN, MARGEN + ancho útil]` y a lo alto
 * entre el margen de arriba de la franja y el de abajo, que queda por encima de la marca. Si
 * una Cita de hasta `MAX_CARACTERES_IMAGEN` deja de caber, el reparto de la tabla de tramos lo
 * cambia Héctor, nunca un agente (la 25.2 y la 25.4 añadirán aquí el pie y el 9:16).
 */

const LADO = 1080;
const MARGEN = 96;
/** Los formatos de `imagen.js`: su alto, su franja y su ancho útil. */
const FORMATOS = [
  { id: 'cuadrado', franja: [0, LADO], anchoUtil: LADO - MARGEN * 2 },
  { id: 'vertical', franja: [240, 1500], anchoUtil: LADO - MARGEN * 3 },
] as const;

interface Escrita {
  texto: string;
  x: number;
  y: number;
  ancho: number;
  cuerpo: number;
  base: string;
}

const casos: { tramo: string; cual: string; slug: string }[] = [];
for (const [tramo, slug] of citaMasLargaPorTramo()) casos.push({ tramo, cual: 'la más larga', slug });
for (const c of citasEnVerso().filter((c) => admiteImagen(c.texto))) {
  if (!casos.some((caso) => caso.slug === c.slug)) casos.push({ tramo: c.tramo, cual: `en verso, ${c.versos.length} versos`, slug: c.slug });
}

test.describe('Historia 29.3 — cabida de la Imagen de Cita', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'El lienzo se mide en Chromium.');

  test('hay al menos una Cita en verso que medir', () => {
    expect(citaEnVersoMasLargaPorTramo().size, 'ninguna Cita en verso admite Imagen: falta el commit de restitución de la 29.2').toBeGreaterThan(0);
  });

  for (const { tramo, cual, slug } of casos) {
    test(`${tramo}, ${cual}: ${slug}`, async ({ page }) => {
      await page.goto(`/cita/${slug}`);
      const escritas = await page.evaluate(async (formatos) => {
        const isla = document.querySelector<HTMLElement>('[data-imagen]');
        if (isla === null) throw new Error('La página no lleva la isla de la Imagen.');
        await document.fonts.load(`400 ${isla.dataset.tamano}px "Source Serif 4"`);
        const { dibujar } = await import(/* @vite-ignore */ '/islas/imagen.js' as string);
        const porFormato: Record<string, { texto: string; x: number; y: number; ancho: number; cuerpo: number; base: string }[]> = {};
        for (const formato of formatos) {
          const lienzo = document.createElement('canvas');
          const ctx = lienzo.getContext('2d')!;
          const apuntadas: { texto: string; x: number; y: number; ancho: number; cuerpo: number; base: string }[] = [];
          const fillText = ctx.fillText.bind(ctx);
          ctx.fillText = (texto: string, x: number, y: number) => {
            apuntadas.push({
              texto,
              x,
              y,
              ancho: ctx.measureText(texto).width,
              cuerpo: Number(/(\d+)px/.exec(ctx.font)![1]),
              base: ctx.textBaseline,
            });
            fillText(texto, x, y);
          };
          // `getContext('2d')` devuelve siempre el mismo contexto: `dibujar` escribe en este.
          dibujar(lienzo, {
            texto: isla.dataset.texto,
            autor: isla.dataset.autor,
            procedencia: isla.dataset.procedencia,
            tamaño: Number(isla.dataset.tamano),
            marca: isla.dataset.marca,
            formato,
            plantilla: 'papel',
          });
          porFormato[formato] = apuntadas;
        }
        return { porFormato, marca: isla.dataset.marca!.toLocaleUpperCase('es') };
      }, FORMATOS.map((f) => f.id));

      const { porFormato, marca } = escritas as { porFormato: Record<string, Escrita[]>; marca: string };
      for (const { id, franja, anchoUtil } of FORMATOS) {
        const [arriba, abajo] = franja;
        const sinMarca = porFormato[id].filter((e) => e.texto !== marca);
        expect(sinMarca.length, id).toBeGreaterThan(0);
        for (const e of sinMarca) {
          expect(e.base, `${id}: la cuenta de alto supone la línea base arriba`).toBe('top');
          expect(e.x, `${id}: «${e.texto}»`).toBeGreaterThanOrEqual(MARGEN);
          expect(e.x + e.ancho, `${id}: «${e.texto}» se sale a lo ancho`).toBeLessThanOrEqual(MARGEN + anchoUtil);
          expect(e.y, `${id}: «${e.texto}» empieza encima del margen`).toBeGreaterThanOrEqual(arriba + MARGEN);
          expect(e.y + e.cuerpo, `${id}: «${e.texto}» acaba debajo de la marca`).toBeLessThanOrEqual(abajo - MARGEN);
        }
      }
    });
  }
});
