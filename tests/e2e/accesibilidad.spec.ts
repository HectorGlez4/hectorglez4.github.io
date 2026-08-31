import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { superficiesDelBarrido } from '../../src/lib/superficies.ts';

/** Historia 2.8 — accesibilidad y comportamiento responsive. */

const dist = join(new URL('../..', import.meta.url).pathname, 'dist');

/** Las rutas que el sitio construyó de verdad. */
function rutasConstruidas(): string[] {
  const rutas: string[] = [];

  function recorrer(dir: string, prefijo: string) {
    for (const entrada of readdirSync(dir)) {
      const completa = join(dir, entrada);
      if (statSync(completa).isDirectory()) {
        recorrer(completa, `${prefijo}/${entrada}`);
        continue;
      }
      if (!entrada.endsWith('.html')) continue;
      const sinExtension = entrada.replace(/\.html$/, '');
      rutas.push(sinExtension === 'index' ? `${prefijo}/` : `${prefijo}/${sinExtension}`);
    }
  }

  recorrer(dist, '');
  return rutas;
}

/**
 * Historia 12.1 — las superficies del barrido se **derivan**, no se escriben.
 *
 * Antes eran seis rutas a mano en esta constante: la cuarta lista de sitios donde se
 * declaraba qué es una superficie del sitio, y la que nadie recordaba tocar. Ahora salen
 * de cruzar la declaración única de `src/lib/superficies.ts` con las páginas que el build
 * generó, así que una superficie pública nueva entra en el barrido sola. El Kit queda
 * fuera porque su declaración dice que no es una superficie que nadie lea.
 *
 * Se lee `dist/` al cargar el fichero y no durante la prueba porque el barrido genera una
 * prueba por superficie. Playwright arranca su `webServer` —que construye el sitio— antes
 * de cargar los ficheros de prueba, así que lo que se lee aquí es el `dist/` recién
 * construido.
 */
const SUPERFICIES = superficiesDelBarrido(rutasConstruidas());

test('el barrido cubre las superficies del sitio y no el Kit', () => {
  // Sin esto, una derivación que devolviera la lista vacía dejaría el barrido entero sin
  // ejecutar y la suite seguiría en verde.
  //
  // Esta guarda corre exactamente cuando corre el barrido, que es su virtud, pero el CI
  // no ejecuta `npm run test:e2e`. Su gemela vive en
  // `tests/unit/publicable-y-alcanzable.test.ts`, que pasa por `superficiesDelBarrido` las
  // rutas de un sitio construido de verdad y exige una muestra por familia. Las dos, no
  // una: aquí se comprueba el `dist/` que se va a barrer; allí, que el CI se entere.
  expect(SUPERFICIES).toContain('/');
  expect(SUPERFICIES).toContain('/buscar');
  expect(SUPERFICIES).toContain('/404');
  expect(SUPERFICIES.some((r) => r.startsWith('/cita/'))).toBe(true);
  expect(SUPERFICIES.some((r) => r.startsWith('/autor/'))).toBe(true);
  expect(SUPERFICIES.some((r) => r.startsWith('/tema/'))).toBe(true);
  expect(SUPERFICIES).not.toContain('/kit');
});

test.describe('Historia 2.8 — WCAG 2.1 AA', () => {
  for (const ruta of SUPERFICIES) {
    test(`${ruta} pasa la auditoría automática`, async ({ page }) => {
      await page.goto(ruta);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const resumen = violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
      expect(resumen, `${ruta}\n${resumen.join('\n')}`).toEqual([]);
    });
  }
});

test.describe('Historia 2.8 — foco', () => {
  test('el foco es visible con anillo de 2px separado 2px', async ({ page }) => {
    await page.goto('/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los/');
    await page.getByRole('button', { name: 'Copiar la cita' }).focus();

    const anillo = await page
      .getByRole('button', { name: 'Copiar la cita' })
      .evaluate((n) => {
        const s = getComputedStyle(n);
        return { ancho: s.outlineWidth, estilo: s.outlineStyle, separacion: s.outlineOffset };
      });

    expect(anillo.ancho).toBe('2px');
    expect(anillo.estilo).not.toBe('none');
    expect(anillo.separacion).toBe('2px');
  });

  test('el indicador de foco no está suprimido en ningún elemento', async ({ page }) => {
    for (const ruta of SUPERFICIES) {
      await page.goto(ruta);
      const suprimido = await page.evaluate(() =>
        [...document.querySelectorAll('a, button, input, textarea, select, [tabindex]')].filter(
          (n) => {
            const s = getComputedStyle(n, ':focus-visible');
            return s.outlineStyle === 'none' || s.outlineWidth === '0px';
          },
        ).length,
      );
      expect(suprimido, ruta).toBe(0);
    }
  });

  test('en la Página de Cita el orden es contenido, acciones y después salidas', async ({
    page,
  }) => {
    /*
     * EXPERIENCE.md pide «contenido primero, acciones después, navegación al final».
     * Se comprueba dentro del contenido principal, que es donde la secuencia significa
     * algo. La cabecera queda fuera a propósito: moverla detrás del `main` en el marcado
     * para que se tabule al final desalinearía el orden visual del de foco, y eso es un
     * incumplimiento de WCAG 2.4.3 — arreglaría la letra del criterio rompiendo el
     * criterio de al lado. Para eso está el enlace de salto, que es lo primero que
     * recibe foco en toda la página.
     */
    await page.goto('/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los/');

    const orden = await page.evaluate(() => {
      const enfocables = [...document.querySelectorAll('main a, main button')];
      return enfocables.map((n) =>
        n.closest('nav') ? 'salida' : n.tagName === 'BUTTON' ? 'accion' : 'contenido',
      );
    });

    expect(orden.indexOf('accion')).toBeLessThan(orden.indexOf('salida'));
    // Y el enlace de atribución —contenido— va antes que la acción.
    expect(orden.indexOf('contenido')).toBeLessThan(orden.indexOf('accion'));
  });

  test('el enlace de salto es lo primero que recibe foco', async ({ page }) => {
    await page.goto('/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los/');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.className)).toContain('saltar');
  });

  test('todo el sitio se recorre con teclado', async ({ page }) => {
    await page.goto('/autor/antonio-machado/');
    const alcanzados = new Set<string>();

    for (let i = 0; i < 30; i += 1) {
      await page.keyboard.press('Tab');
      const actual = await page.evaluate(() => {
        const n = document.activeElement as HTMLElement | null;
        return n && n !== document.body ? `${n.tagName}:${n.textContent?.trim().slice(0, 20)}` : '';
      });
      if (actual) alcanzados.add(actual);
    }

    expect(alcanzados.size).toBeGreaterThan(5);
  });
});

test.describe('Historia 2.8 — semántica', () => {
  test('un único h1 en cada superficie', async ({ page }) => {
    for (const ruta of SUPERFICIES) {
      await page.goto(ruta);
      await expect(page.locator('h1'), ruta).toHaveCount(1);
    }
  });

  test('los listados son listas reales', async ({ page }) => {
    for (const ruta of ['/autor/antonio-machado', '/tema/la-vida', '/']) {
      await page.goto(ruta);
      const sueltos = await page.evaluate(
        () => [...document.querySelectorAll('li')].filter((n) => !n.closest('ul, ol')).length,
      );
      expect(sueltos, ruta).toBe(0);
      expect(await page.locator('ul').count(), ruta).toBeGreaterThan(0);
    }
  });

  test('la Cita se marca como cita con su atribución asociada', async ({ page }) => {
    await page.goto('/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los/');
    await expect(page.locator('figure > blockquote')).toHaveCount(1);
    await expect(page.locator('figure > figcaption')).toHaveCount(1);
  });
});

test.describe('Historia 2.8 — responsive', () => {
  test('en 360px no hay desplazamiento horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    for (const ruta of SUPERFICIES) {
      await page.goto(ruta);
      const desborda = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(desborda, ruta).toBe(false);
    }
  });

  test('las zonas de toque miden 44px con 8px de separación', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/cita/antonio-machado-hoy-es-siempre-todavia/');

    const cajas = await page.evaluate(() =>
      [...document.querySelectorAll('main a, main button')]
        .map((n) => n.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({ arriba: r.top, abajo: r.bottom, izq: r.left, der: r.right, alto: r.height })),
    );

    for (const caja of cajas) expect(caja.alto).toBeGreaterThanOrEqual(44);

    // Y ninguna pareja se solapa dejando menos de 8px entre medias.
    for (let i = 0; i < cajas.length; i += 1) {
      for (let j = i + 1; j < cajas.length; j += 1) {
        const a = cajas[i];
        const b = cajas[j];
        const separaVertical = a.abajo <= b.arriba || b.abajo <= a.arriba;
        const separaHorizontal = a.der <= b.izq || b.der <= a.izq;
        // Se solapan solo si no hay separación en ninguno de los dos ejes.
        expect(separaVertical || separaHorizontal).toBe(true);
      }
    }
  });

  test('el ancho extra de escritorio es margen y no contenido nuevo', async ({ page }) => {
    const bloques = async (ancho: number) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto('/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los/');
      return page.evaluate(() => document.querySelectorAll('main *').length);
    };

    const enTablet = await bloques(768);
    const enEscritorio = await bloques(1440);

    // Ni una columna lateral ni un bloque de más: exactamente los mismos elementos.
    expect(enEscritorio).toBe(enTablet);
  });

  test('con zoom al 200 % no se pierde contenido ni aparece desplazamiento horizontal', async ({
    page,
  }) => {
    // Zoom del navegador al 200 % equivale a la mitad de ancho de ventana gráfica.
    await page.setViewportSize({ width: 640, height: 512 });
    await page.goto('/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los/');

    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborda).toBe(false);

    // El contenido sigue estando: no se ha ocultado nada para que quepa.
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.autor')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copiar la cita' })).toBeVisible();
  });
});

test.describe('Historia 2.8 — sin muro de entrada ni movimiento impuesto', () => {
  test('ninguna superficie muestra modal, aviso ni invitación antes del contenido', async ({
    page,
  }) => {
    for (const ruta of SUPERFICIES) {
      await page.goto(ruta);
      expect(await page.locator('dialog[open], [role="dialog"], [role="alertdialog"]').count(), ruta).toBe(0);

      // Ni nada fijo que tape el contenido al cargar.
      const tapando = await page.evaluate(() =>
        [...document.querySelectorAll('body *')].filter((n) => {
          const s = getComputedStyle(n);
          return (
            (s.position === 'fixed' || s.position === 'sticky') &&
            s.display !== 'none' &&
            n.getBoundingClientRect().height > 100
          );
        }).length,
      );
      expect(tapando, ruta).toBe(0);
    }
  });

  test('con movimiento reducido no se ejecuta ninguna transición', async ({ browser }) => {
    const contexto = await browser.newContext({ reducedMotion: 'reduce' });
    const pagina = await contexto.newPage();
    await pagina.goto('http://localhost:4321/cita/antonio-machado-hoy-es-siempre-todavia');

    const conTransicion = await pagina.evaluate(() =>
      [...document.querySelectorAll('body *')].filter((n) => {
        const s = getComputedStyle(n);
        return s.transitionDuration !== '0s' || s.animationDuration !== '0s';
      }).length,
    );
    expect(conTransicion).toBe(0);
    await contexto.close();
  });

  test('sin movimiento reducido, las transiciones no pasan de 150 ms', async ({ page }) => {
    await page.goto('/cita/antonio-machado-hoy-es-siempre-todavia/');
    const duraciones = await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .flatMap((n) => getComputedStyle(n).transitionDuration.split(', '))
        .filter((d) => d !== '0s')
        .map((d) => (d.endsWith('ms') ? Number.parseFloat(d) : Number.parseFloat(d) * 1000)),
    );
    for (const duracion of duraciones) expect(duracion).toBeLessThanOrEqual(150);
  });
});
