import { expect, test, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaEnDist,
} from '../unit/ayuda/construir.js';
import { abrirLosDesplegables, auditar, recorrerElFoco } from './ayuda/desplegables.ts';

/**
 * Historia 34.0 — el Desplegable en un navegador, sobre una sonda de una copia (AD-21).
 *
 * Ninguna superficie del sitio pinta todavía un `<details>`, así que en
 * `tests/e2e/accesibilidad.spec.ts` la pasada con lo plegado abierto no corre nunca: este fichero
 * es el que la hace correr, con las mismas funciones (`tests/e2e/ayuda/desplegables.ts`), sobre
 * una página construida que pinta varios desplegables seguidos, uno de ellos con un enlace dentro.
 * Y mira lo que solo un navegador ve: cerrado al cargar, Intro y Espacio abren y cierran sin mover
 * el foco, lo de dentro de uno cerrado no se tabula, la fila mide al menos `--zona-de-toque`, el
 * glifo gira sin saltar, abrir no mueve lo de encima y dos seguidos comparten un solo filete.
 *
 * El contrato del marcado y de la hoja, sin navegador, está en `tests/unit/desplegable.test.ts`.
 */

/* En serie y en un perfil: el `beforeAll` levanta un servidor en un puerto fijo. */
test.describe.configure({ mode: 'serial' });

/* Escritorio: `--zona-de-toque`, los colores y el anillo de foco no dependen del dispositivo. */
const PERFIL = 'escritorio';

/*
 * Puerto propio: 4321 es el sitio del repositorio, 4399 y 4400 los de `receptor.spec.ts`, 4402
 * el de `ingreso-accesible.spec.ts`, 4403 el de `busqueda-historial.spec.ts` y 4405 el de `lee-el-pasaje.spec.ts`.
 */
const PUERTO_SITIO = 4404;
const SITIO = `http://localhost:${PUERTO_SITIO}`;
const SONDA = '/sonda-del-desplegable-zzz/';

/** Lo que solo esta sonda pinta: con él, un 200 dice que el servidor del puerto es este. */
const MARCA_DE_LA_SONDA = 'sonda-del-desplegable-en-el-navegador';

/** Los rótulos, en orden: el primero lleva texto, el segundo un enlace y el resto solo texto. */
const ROTULOS = ['Cómo citar', 'Ediciones', 'Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco'];

const PAGINA = `---
import '../styles/tokens.css';
import Desplegable from '../components/Desplegable.astro';
---
<!doctype html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Sonda del desplegable</title></head>
<body>
<main id="${MARCA_DE_LA_SONDA}">
<h1 id="encima">Sonda del desplegable</h1>
<Desplegable rotulo="${ROTULOS[0]}"><p id="dentro">Séneca, «Sobre la brevedad de la vida».</p></Desplegable>
<Desplegable rotulo="${ROTULOS[1]}"><p>Se lee en <a id="enlace-dentro" href="/">una edición cotejada</a> de la Fuente.</p></Desplegable>
${ROTULOS.slice(2)
  .map((r) => `<Desplegable rotulo="${r}"><p>${r}.</p></Desplegable>`)
  .join('\n')}
</main>
</body>
</html>
`;

const CORPUS = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
};

let servidor: ChildProcess | undefined;
let proyecto: string | undefined;

async function irA(page: Page): Promise<void> {
  // URL absoluta: el `baseURL` de la configuración apunta a 4321, que es el otro sitio.
  await page.goto(`${SITIO}${SONDA}`);
}

/** Lo que tiene el foco, en una línea: etiqueta, id y texto. */
const foco = (page: Page) =>
  page.evaluate(() => {
    const n = document.activeElement;
    return n === null ? '' : `${n.tagName}#${n.id}:${(n.textContent ?? '').replace(/\s+/g, ' ').trim()}`;
  });

/** El giro del glifo, en grados redondeados: 0 sin `transform`, 90 girado. */
const giroDelGlifo = (page: Page, i: number) =>
  page.evaluate((i) => {
    const t = getComputedStyle(document.querySelectorAll('.desplegable .giro')[i]).transform;
    if (t === 'none') return 0;
    const [a, b] = t.slice(t.indexOf('(') + 1, -1).split(',').map(Number);
    return Math.round((Math.atan2(b, a) * 180) / Math.PI);
  }, i);

test.beforeAll(async () => {
  if (test.info().project.name !== PERFIL) return;
  // `astro build` no cabe en el plazo de una prueba corriente, y el gancho lo hereda.
  test.setTimeout(300_000);

  const construido = await construirConCorpus(CORPUS, {
    paginas: { 'sonda-del-desplegable-zzz.astro': PAGINA },
  });
  proyecto = construido.proyecto;
  expect(construido.codigo, construido.salida).toBe(0);

  // Antes del navegador: que la sonda pinte lo que se va a barrer, y sin guion.
  const dist = join(construido.proyecto, 'dist');
  const html = await readFile(paginaEnDist(dist, SONDA), 'utf8');
  expect(html.match(/<details\b/g)?.length, 'la sonda no pinta los desplegables').toBe(ROTULOS.length);
  expect(html).not.toMatch(/<script\b/i);

  servidor = spawn('node', [join(new URL('..', import.meta.url).pathname, 'servidor.mjs')], {
    env: { ...process.env, DIST: dist, PUERTO: String(PUERTO_SITIO) },
    stdio: 'ignore',
  });
  let muerto: number | null = null;
  let falloAlArrancar: Error | undefined;
  servidor.on('exit', (codigo) => (muerto = codigo ?? 1));
  servidor.on('error', (fallo) => (falloAlArrancar = fallo as Error));

  for (let intento = 0; intento < 100; intento += 1) {
    if (muerto !== null || falloAlArrancar !== undefined) break;
    try {
      const respuesta = await fetch(`${SITIO}${SONDA}`, { signal: AbortSignal.timeout(2000) });
      if (respuesta.ok && (await respuesta.text()).includes(MARCA_DE_LA_SONDA)) return;
    } catch {
      // Todavía no ha levantado; se reintenta.
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `La sonda del desplegable no llegó a servirse en ${PUERTO_SITIO}` +
      (falloAlArrancar !== undefined
        ? `: ${falloAlArrancar.message}.`
        : muerto !== null
          ? ` (el servidor murió con ${muerto}; casi siempre es el puerto ocupado).`
          : '.') +
      ` Comprueba quién lo ocupa con \`lsof -nP -iTCP:${PUERTO_SITIO} -sTCP:LISTEN\`.`,
  );
});

test.afterAll(async () => {
  if (servidor && servidor.exitCode === null && servidor.signalCode === null) {
    const cerrado = new Promise<void>((r) => servidor!.once('close', () => r()));
    servidor.kill();
    await Promise.race([cerrado, new Promise((r) => setTimeout(r, 5000))]);
  }
  if (proyecto) await limpiar(proyecto);
});

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== PERFIL, 'lo que se mide no depende del dispositivo');
});

test('la sonda pasa axe con los desplegables cerrados y abiertos', async ({ page }) => {
  await irA(page);
  await auditar(page, SONDA, 'con los desplegables cerrados');
  // Aunque fueran un acordeón exclusivo, quedan todos abiertos y se cuentan los abiertos.
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => d.setAttribute('name', 'grupo')));
  expect(await abrirLosDesplegables(page)).toBe(ROTULOS.length);
  expect(await page.locator('details[open]').count()).toBe(ROTULOS.length);
  await auditar(page, SONDA, 'con los desplegables abiertos');
});

test('la sonda da la vuelta al tabulador con los desplegables cerrados y abiertos, con el anillo puesto', async ({
  page,
}) => {
  await irA(page);
  await recorrerElFoco(page, SONDA, 'con los desplegables cerrados');
  expect(await abrirLosDesplegables(page)).toBe(ROTULOS.length);
  await recorrerElFoco(page, SONDA, 'con los desplegables abiertos');
});

test('cerrado, el tabulador para en cada `<summary>` y no en lo de dentro', async ({ page }) => {
  await irA(page);
  const paradas: string[] = [];
  for (let i = 0; i < ROTULOS.length; i += 1) {
    await page.keyboard.press('Tab');
    paradas.push(await foco(page));
  }
  expect(paradas).toEqual(ROTULOS.map((r) => `SUMMARY#:${r} ›`));
});

test('Intro y Espacio abren y cierran sin mover el foco; el glifo gira sin saltar y lo de encima no se mueve', async ({
  page,
}) => {
  await irA(page);
  const desplegable = page.locator('details.desplegable').first();
  const dentro = page.locator('#dentro');
  const encima = page.locator('#encima');
  const glifo = desplegable.locator('.giro');

  await expect(desplegable).not.toHaveAttribute('open');
  await expect(dentro).toBeHidden();
  expect(await giroDelGlifo(page, 0)).toBe(0);
  const encimaAntes = await encima.boundingBox();
  const glifoAntes = await glifo.boundingBox();

  await page.keyboard.press('Tab');
  const enElResumen = await foco(page);
  expect(enElResumen).toBe(`SUMMARY#:${ROTULOS[0]} ›`);

  await page.keyboard.press('Enter');
  await expect(desplegable).toHaveAttribute('open');
  await expect(dentro).toBeVisible();
  expect(await foco(page)).toBe(enElResumen);
  expect(await giroDelGlifo(page, 0)).toBe(90);
  expect(await encima.boundingBox()).toEqual(encimaAntes);
  // Gira sobre su propio centro: el glifo abierto no salta a un lado ni fuera de la línea.
  const glifoDespues = await glifo.boundingBox();
  const centro = (c: { x: number; y: number; width: number; height: number }) => [c.x + c.width / 2, c.y + c.height / 2];
  const [xAntes, yAntes] = centro(glifoAntes!);
  const [xDespues, yDespues] = centro(glifoDespues!);
  expect(Math.abs(xDespues - xAntes)).toBeLessThan(0.5);
  expect(Math.abs(yDespues - yAntes)).toBeLessThan(0.5);

  await page.keyboard.press('Space');
  await expect(desplegable).not.toHaveAttribute('open');
  await expect(dentro).toBeHidden();
  expect(await foco(page)).toBe(enElResumen);
  expect(await giroDelGlifo(page, 0)).toBe(0);

  // Y al revés: Espacio abre sin desplazar la página e Intro cierra.
  const desplazamiento = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('Space');
  await expect(desplegable).toHaveAttribute('open');
  await expect(dentro).toBeVisible();
  expect(await foco(page)).toBe(enElResumen);
  expect(await page.evaluate(() => window.scrollY)).toBe(desplazamiento);
  await page.keyboard.press('Enter');
  await expect(desplegable).not.toHaveAttribute('open');
  expect(await foco(page)).toBe(enElResumen);
});

test('la fila del `<summary>` mide al menos `--zona-de-toque`, y dos seguidos comparten un filete', async ({ page }) => {
  await irA(page);
  const medidas = await page.evaluate(() => {
    const regla = document.createElement('div');
    regla.style.blockSize = 'var(--zona-de-toque)';
    document.body.append(regla);
    const zona = regla.getBoundingClientRect().height;
    regla.remove();
    const muestra = document.createElement('div');
    muestra.style.color = 'var(--tinta-apagada)';
    document.body.append(muestra);
    const tinta = getComputedStyle(muestra).color;
    muestra.remove();
    const desplegables = [...document.querySelectorAll('details.desplegable')];
    return {
      zona,
      alturas: desplegables.map((d) => d.querySelector('summary')!.getBoundingClientRect().height),
      filetes: desplegables.map((d) => {
        const s = getComputedStyle(d);
        return [s.borderTopWidth, s.borderBottomWidth];
      }),
      marcador: getComputedStyle(desplegables[0].querySelector('summary')!).display,
      // El trato del Rótulo de sección y toda la fila como zona de toque.
      resumen: desplegables.map((d) => {
        const s = d.querySelector('summary')!;
        const e = getComputedStyle(s);
        return {
          ancho: Math.round(s.getBoundingClientRect().width) === Math.round(d.getBoundingClientRect().width),
          mayusculas: e.textTransform,
          subrayado: e.textDecorationLine,
          tinta: e.color === tinta,
        };
      }),
    };
  });
  expect(medidas.zona).toBeGreaterThan(0);
  for (const altura of medidas.alturas) expect(altura).toBeGreaterThanOrEqual(medidas.zona);
  // Sin el triángulo del navegador: un `<summary>` en `flex` deja de ser `list-item`.
  expect(medidas.marcador).toBe('flex');
  const [primero, ...resto] = medidas.filetes;
  expect(primero[0]).not.toBe('0px');
  for (const [encima] of resto) expect(encima).toBe('0px');
  for (const [, debajo] of medidas.filetes) expect(debajo).not.toBe('0px');
  for (const r of medidas.resumen) {
    expect(r).toEqual({ ancho: true, mayusculas: 'uppercase', subrayado: 'none', tinta: true });
  }
});

test('abierto, el contenido lleva 2× y 3× `--unidad` y el desplegable no pasa de `--medida-prosa`', async ({ page }) => {
  await irA(page);
  await abrirLosDesplegables(page);
  const medidas = await page.evaluate(() => {
    const medir = (valor: string) => {
      const regla = document.createElement('div');
      regla.style.inlineSize = valor;
      document.body.append(regla);
      const ancho = regla.getBoundingClientRect().width;
      regla.remove();
      return ancho;
    };
    const unidad = medir('var(--unidad)');
    const medida = medir('var(--medida-prosa)');
    return {
      unidad,
      medida,
      desplegables: [...document.querySelectorAll('details.desplegable')].map((d) => {
        const c = getComputedStyle(d.querySelector('.contenido')!);
        return { arriba: parseFloat(c.paddingTop), abajo: parseFloat(c.paddingBottom), ancho: d.getBoundingClientRect().width };
      }),
    };
  });
  expect(medidas.unidad).toBeGreaterThan(0);
  for (const d of medidas.desplegables) {
    expect(d.arriba).toBeCloseTo(medidas.unidad * 2, 1);
    expect(d.abajo).toBeCloseTo(medidas.unidad * 3, 1);
    expect(d.ancho).toBeLessThanOrEqual(medidas.medida + 0.5);
  }
});
