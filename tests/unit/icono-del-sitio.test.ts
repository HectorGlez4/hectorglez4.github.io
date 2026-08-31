import { afterAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import {
  AUTOR_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { PALETA } from '../../src/lib/lienzo.ts';
import { LADO_DE_IOS, TAMANOS_DEL_ICONO, svgDelIcono } from '../../src/lib/marca.ts';

const raiz = resolve(import.meta.dirname, '../..');

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

/**
 * El icono del sitio es del sitio.
 *
 * Lo publicado hasta aquí era `public/favicon.svg` tal y como lo deja `npm create astro`:
 * el logotipo de Astro. Nadie lo eligió y nadie lo miró, porque un favicon no se ve al
 * revisar una página — se ve en la pestaña, y sobre todo en el resultado de búsqueda, que
 * es donde alguien decide si un sitio de citas con procedencia documentada merece un clic.
 *
 * La marca es tipográfica porque DESIGN.md dice que la identidad del sitio «no está en un
 * logotipo»: son las comillas angulares con las que empieza cada Cita publicada, que es lo
 * único que un lector ya asocia con esto.
 */
describe('la marca del sitio', () => {
  it('no es el logotipo de Astro', () => {
    /*
     * Se busca la firma del trazado que trae la plantilla, y no el nombre del fichero: lo
     * que hay que impedir que vuelva es **ese dibujo**, se llame como se llame el fichero
     * y esté donde esté. La `public/favicon.svg` ya no existe, y es a propósito: el icono
     * se genera, y un fichero estático al lado sería una segunda respuesta a la misma URL.
     */
    const FIRMA_DE_ASTRO = 'M50.4 78.5a75.1';
    expect(svgDelIcono()).not.toContain(FIRMA_DE_ASTRO);
    expect(existsSync(join(raiz, 'public/favicon.svg'))).toBe(false);
  });

  it('se dibuja con la paleta declarada, sin literales de color', () => {
    const svg = svgDelIcono();
    expect(svg).toContain(PALETA.siena);
    expect(svg).toContain(PALETA.papel);

    // Ningún color escrito a mano: los únicos que aparecen son los de la paleta.
    const usados = new Set([...svg.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]));
    const declarados = new Set<string>(Object.values(PALETA));
    expect([...usados].filter((c) => !declarados.has(c))).toEqual([]);
  });

  it('es cuadrado, que es lo que un buscador exige del icono', () => {
    expect(svgDelIcono()).toMatch(/viewBox="0 0 (\d+) \1"/);
  });

  it('declara un tamaño por consumidor, y ninguno de adorno', () => {
    /*
     * Cada lado tiene quien lo pida: 48 y 96 son los múltiplos de 48 que documenta Google
     * para el icono del resultado de búsqueda —lo que faltaba, porque el sitio publicaba
     * un SVG y nada más—, y 180 es el que pide iOS al añadir a la pantalla de inicio.
     *
     * Hubo un 512 y se retiró antes de publicarse: existía para ser el `logo` de una
     * `Organization` en los datos estructurados, y `DatosDelSitio.astro` declara —con su
     * motivo— que aquí no se emite ninguna `Organization`, porque detrás no hay entidad que
     * nombrar e inventarla sería la procedencia inferida que FR-2 prohíbe. Sin ese
     * consumidor, 512 era un fichero que nadie pide.
     */
    expect([...TAMANOS_DEL_ICONO]).toEqual([48, 96, 180]);
  });
});

describe('el icono, sobre un sitio construido de verdad', () => {
  /*
   * Esto reemplaza a tres aserciones que hacían `grep` sobre el texto de `Armazon.astro`.
   * Aquello no ejecutaba nada: bastaba con que las cadenas estuvieran escritas en el
   * fichero. Renombrar `src/pages/icono/[tamano].png.ts` —o romper su `GET`, o que
   * `getStaticPaths` emitiera otro parámetro— dejaba los cuatro `<link rel="icon">` del
   * sitio dando 404 con la suite entera en verde, que es exactamente el defecto que este
   * cambio existe para arreglar. Y desde que `public/favicon.svg` ya no está, tampoco hay
   * un fichero estático que salve la papeleta.
   *
   * Se construye un sitio y se mira lo que sale.
   */
  let proyecto = '';

  it('construye', async () => {
    const resultado = await construirConCorpus({
      'autores/seneca.yml': AUTOR_VALIDO,
      'citas/seneca--a.md': citaValida({ slug: 'seneca-a', temas: [] }),
    });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  });

  it('publica el vector, y es la marca que devuelve la función', async () => {
    const publicado = await readFile(join(proyecto, 'dist', 'favicon.svg'), 'utf8');
    expect(publicado).toBe(svgDelIcono());
  });

  it('publica un PNG cuadrado por cada lado declarado', async () => {
    for (const lado of TAMANOS_DEL_ICONO) {
      const png = await readFile(join(proyecto, 'dist', 'icono', `${lado}.png`));

      // La cabecera de un PNG dice su tamaño: firma, y el ancho y el alto en el IHDR.
      expect([...png.subarray(0, 8)], `${lado}: no es un PNG`).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]);
      expect(png.readUInt32BE(16), `${lado}: ancho`).toBe(lado);
      expect(png.readUInt32BE(20), `${lado}: alto`).toBe(lado);
    }
  });

  it('el ráster de iOS es opaco hasta las esquinas', async () => {
    /*
     * El caso que costó encontrarlo: el `rx` de la marca deja las esquinas fuera del
     * rectángulo, así que el PNG salía con alfa 0 ahí. iOS compone el `apple-touch-icon`
     * sobre negro, de modo que el icono de la pantalla de inicio aparecía con las esquinas
     * negras. Se mira el canal alfa del píxel (0,0), que es donde se ve.
     */
    const png = await readFile(join(proyecto, 'dist', 'icono', `${LADO_DE_IOS}.png`));
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    expect(data[info.channels - 1], 'la esquina superior izquierda es transparente').toBe(255);
  });

  it('cada página declara los iconos que el sitio publica, y ninguno más', async () => {
    // La otra mitad: que lo declarado y lo publicado sean el mismo conjunto. Escritos a
    // mano en el armazón, quitar un lado de la tupla dejaba un `<link>` colgando.
    const html = await readFile(paginaConstruida(proyecto, '/'), 'utf8');
    const declarados = [...html.matchAll(/href="\/icono\/(\d+)\.png"/g)].map((m) =>
      Number(m[1]),
    );

    expect(declarados.sort((a, b) => a - b)).toEqual([...TAMANOS_DEL_ICONO]);
    expect(html).toContain(`rel="apple-touch-icon" href="/icono/${LADO_DE_IOS}.png"`);
    expect(html).toContain('href="/favicon.svg"');
    expect(html).toContain(`name="theme-color" content="${PALETA.papel}"`);
  });
});
