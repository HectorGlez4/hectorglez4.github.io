import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ETIQUETAS_DEL_BARRIDO, rutaDeCita } from '../../src/lib/superficies.ts';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaEnDist,
} from '../unit/ayuda/construir.js';
import { componerDocumento } from '../../tools/lib/documento.ts';
import { textoConSaltos } from '../../tools/lib/lineas.ts';
import { desviacionDelBarrido, sinDecidir } from './ayuda/barrido.ts';

/**
 * Historia 31.2 — «Lee el pasaje» en el navegador.
 *
 * El sitio del repositorio tiene `MAX_CARACTERES_DEL_PASAJE` en `undefined` y no pinta ningún
 * pasaje: barrerlo sería medir lo que no está. Así que, como `ingreso-accesible.spec.ts`, este
 * fichero construye una copia con el tope parcheado —nunca en el árbol (AD-21)— y la sirve en
 * su propio puerto. Mide lo que la prueba unitaria no ve: que a 360 × 640 Copiar sigue en la
 * primera pantalla y no se mueve por el pasaje, el reflujo a 320 px con el pasaje abierto, el
 * orden de tabulación, que se abre y se cierra sin JavaScript y axe con el desplegable abierto.
 * El marcado lo fija `tests/unit/lee-el-pasaje.test.ts`.
 */

test.describe.configure({ mode: 'serial' });

/*
 * Un solo perfil: el montaje construye un sitio y levanta un puerto fijo, y dos trabajadores
 * chocarían. Las medidas fijan su propia ventana (360 × 640, 320 px), así que no dependen del
 * dispositivo del perfil.
 */
const PERFIL = 'movil';

/** Puerto propio: 4321 es el sitio del repositorio, 4399/4400 el de medición, 4402 el de ingreso. */
const PUERTO_SITIO = 4403;
const SITIO = `http://localhost:${PUERTO_SITIO}`;

/** Una ruta que solo publica este corpus: un 200 en ella dice que el servidor es el nuestro. */
const SONDA_SLUG = 'zzz-sonda-de-arranque-de-lee-el-pasaje';

const WS = 'https://es.wikisource.org/wiki/';
const COPLAS = 'Coplas del viento';
const URL_COPLAS = `${WS}Coplas_del_viento`;
const ESTROFA_1 = ['Sopla el viento por la sierra,', 'y la sierra no responde;', 'baja el agua por la tierra,', 'y la tierra no se esconde.'];
const ESTROFA_2 = ['Canta el gallo en la mañana,', 'y la mañana se aleja;', 'llora el niño en la ventana,', 'y la ventana se queja.'];
const CUERPO = `${ESTROFA_1.join('\n')}\n\n${ESTROFA_2.join('\n')}`;
const verso = (lineas: string[]) => textoConSaltos(lineas.join(' '), { cuerpo: CUERPO, forma: 'verso' }).texto;

const CON_PASAJE = 'poeta-sopla-el-viento-por-la-sierra';
const LA_OTRA = 'poeta-canta-el-gallo-en-la-manana';

const CORPUS = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'autores/poeta.yml': 'nombre: Juan Poeta\nañoNacimiento: 1801\nañoFallecimiento: 1870\nsemblanza: Poeta de prueba.\nordenAlfabetico: Poeta\n',
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'fuentes/wikisource-es--coplas-del-viento.txt': componerDocumento(
    { fuente: 'wikisource-es', obra: COPLAS, url: URL_COPLAS, recuperado: '2026-11-08', lineas: 'verso' },
    COPLAS,
    CUERPO,
  ),
  'citas/poeta--sopla-el-viento-por-la-sierra.md': citaValida({
    slug: CON_PASAJE,
    texto: verso(ESTROFA_1.slice(0, 2)),
    autor: 'poeta',
    procedencia: { obra: COPLAS },
    fuente: { id: 'wikisource-es', url: URL_COPLAS },
    aptaParaPortada: true,
  }),
  'citas/poeta--canta-el-gallo-en-la-manana.md': citaValida({
    slug: LA_OTRA,
    texto: verso(ESTROFA_2.slice(0, 2)),
    autor: 'poeta',
    procedencia: { obra: COPLAS },
    fuente: { id: 'wikisource-es', url: URL_COPLAS },
  }),
  'citas/seneca--a.md': citaValida({ aptaParaPortada: true }),
  'citas/seneca--sonda.md': citaValida({
    slug: SONDA_SLUG,
    texto: 'La vida, si sabes usarla, es larga; nadie te la puede quitar de las manos.',
  }),
};

const DECLARACION_DEL_TOPE = /^export const MAX_CARACTERES_DEL_PASAJE: number \| undefined = [^;\n]+;$/mu;

let servidor: ChildProcess | undefined;
let proyecto: string | undefined;

const irA = async (page: Page, slug: string) => {
  // URL absoluta: el `baseURL` de la configuración apunta a 4321, que es el otro sitio.
  await page.goto(`${SITIO}${rutaDeCita(slug)}`);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
};
const pasaje = (page: Page) => page.locator('.desplegables details', { has: page.locator('summary', { hasText: 'Lee el pasaje' }) });

test.beforeAll(async () => {
  if (test.info().project.name !== PERFIL) return;
  test.setTimeout(300_000);

  // La sonda no puede existir en el Corpus de verdad: si existiera, un intruso respondería 200.
  for (const fichero of (await readdir(resolve(RAIZ, 'corpus', 'citas'))).filter((f) => f.endsWith('.md'))) {
    expect((await readFile(resolve(RAIZ, 'corpus', 'citas', fichero), 'utf8')).includes(SONDA_SLUG), fichero).toBe(false);
  }

  const umbrales = await readFile(resolve(RAIZ, 'src/lib/umbrales.ts'), 'utf8');
  expect(umbrales).toMatch(DECLARACION_DEL_TOPE);
  const construido = await construirConCorpus(CORPUS, {
    jornada: '2026-11-08',
    ficheros: {
      'src/lib/umbrales.ts': umbrales.replace(DECLARACION_DEL_TOPE, 'export const MAX_CARACTERES_DEL_PASAJE: number | undefined = 400;'),
    },
  });
  proyecto = construido.proyecto;
  expect(construido.codigo, construido.salida).toBe(0);

  // La guarda previa: sin pasaje en la página, todo lo de abajo pasaría sobre nada.
  const dist = join(construido.proyecto, 'dist');
  expect(await readFile(paginaEnDist(dist, rutaDeCita(CON_PASAJE)), 'utf8'), 'la copia se construyó sin pasaje').toContain(
    'Lee el pasaje',
  );

  servidor = spawn('node', [join(new URL('..', import.meta.url).pathname, 'servidor.mjs')], {
    env: { ...process.env, DIST: dist, PUERTO: String(PUERTO_SITIO) },
    stdio: 'ignore',
  });
  let muerto: number | null = null;
  servidor.on('exit', (codigo) => (muerto = codigo ?? 1));
  servidor.on('error', () => (muerto = 1));
  for (let intento = 0; intento < 100 && muerto === null; intento += 1) {
    try {
      if ((await fetch(`${SITIO}${rutaDeCita(SONDA_SLUG)}`, { signal: AbortSignal.timeout(2000) })).ok) return;
    } catch {
      // Todavía no ha levantado.
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `El sitio con el pasaje no llegó a servir en ${PUERTO_SITIO}; comprueba quién lo ocupa con \`lsof -nP -iTCP:${PUERTO_SITIO} -sTCP:LISTEN\`.`,
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
  test.skip(info.project.name !== PERFIL, 'las medidas fijan su propia ventana: basta un perfil');
});

test.describe('Historia 31.2 — «Lee el pasaje» en el navegador', () => {
  test('a 360 × 640, Copiar acaba en la primera pantalla y el pasaje no lo mueve', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await irA(page, CON_PASAJE);
    await expect(pasaje(page)).toHaveCount(1);
    const antes = await page.locator('button.copiar').boundingBox();
    expect(antes).not.toBeNull();
    expect(antes!.y + antes!.height).toBeLessThanOrEqual(640);
    await pasaje(page).evaluate((detalle) => detalle.remove());
    const despues = await page.locator('button.copiar').boundingBox();
    expect(despues!.y).toBe(antes!.y);
  });

  test('a 320 px, abierto, sin desplazamiento horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await irA(page, CON_PASAJE);
    await pasaje(page).locator('summary').click();
    await expect(pasaje(page)).toHaveAttribute('open', '');
    const { ancho, visible } = await page.evaluate(() => ({
      ancho: document.documentElement.scrollWidth,
      visible: document.documentElement.clientWidth,
    }));
    expect(ancho).toBeLessThanOrEqual(visible);
  });

  test('tabulación: el `<summary>` va tras el último enfocable de la Tarjeta de Obra y, abierto, le sigue el enlace a la edición', async ({
    page,
  }) => {
    await irA(page, CON_PASAJE);
    await page.locator('.tarjeta-de-obra a').last().focus();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveText(/^Lee el pasaje/);
    await page.keyboard.press('Enter');
    await expect(pasaje(page)).toHaveAttribute('open', '');
    await page.keyboard.press('Tab');
    const enfocado = page.locator(':focus');
    await expect(enfocado).toHaveAttribute('href', URL_COPLAS);
    expect(await enfocado.evaluate((a) => a.closest('.fuente-del-pasaje') !== null)).toBe(true);
  });

  test('sin JavaScript se abre y se cierra', async ({ browser }) => {
    const contexto = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await contexto.newPage();
      await page.goto(`${SITIO}${rutaDeCita(CON_PASAJE)}`);
      const detalle = pasaje(page);
      await expect(detalle).not.toHaveAttribute('open', /.*/);
      await detalle.locator('summary').click();
      await expect(detalle).toHaveAttribute('open', '');
      await expect(detalle.locator('mark').first()).toBeVisible();
      await detalle.locator('summary').click();
      await expect(detalle).not.toHaveAttribute('open', /.*/);
    } finally {
      await contexto.close();
    }
  });

  test('axe sin violaciones con el desplegable abierto', async ({ page }) => {
    await irA(page, CON_PASAJE);
    await pasaje(page).locator('summary').click();
    await expect(pasaje(page)).toHaveAttribute('open', '');
    const resultado = await new AxeBuilder({ page }).withTags([...ETIQUETAS_DEL_BARRIDO]).analyze();
    const resumen = resultado.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${v.help} — ${n.target.join(' ')}`));
    expect(resumen, resumen.join('\n')).toEqual([]);
    expect(await desviacionDelBarrido(page, resultado)).toEqual({ faltan: [], sobran: [] });
    expect(sinDecidir(resultado)).toEqual([]);
  });
});
