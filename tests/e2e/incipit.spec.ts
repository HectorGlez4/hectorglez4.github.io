import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { formaDeObra } from '../../src/lib/obras.ts';
import { ETIQUETAS_DEL_BARRIDO } from '../../src/lib/superficies.ts';
import { componerDocumento, nombreDeDocumento } from '../../tools/lib/documento.ts';
import { componerVigentes, nombreDeDocumentoDeWikidata } from '../../tools/lib/wikidata.ts';
import { RAIZ, TEMA_VALIDO, citaValida, construirConCorpus, limpiar, paginaEnDist } from '../unit/ayuda/construir.js';
import { aEntidad, aTiempo, documento, entidad } from '../unit/ayuda/wikidata.ts';
import { desviacionDelBarrido, sinDecidir } from './ayuda/barrido.ts';

/**
 * Historia 32.3 — «Cómo empieza» en un navegador.
 *
 * `tests/unit/incipit-build.test.ts` mira el marcado; esto mide lo que solo existe rendido, en la
 * página 1 de la Obra de título más largo del Corpus (el de Larra, 177 caracteres) con la Ficha
 * técnica completa y un incipit declarado, con el tope parcheado en la copia: que axe no da
 * infracción con el desplegable cerrado ni abierto, que Intro sobre su `<summary>` lo abre sin
 * mover el foco, que a 320 px no hay desplazamiento horizontal, y a 360 × 640 dónde empieza la
 * primera Tarjeta del listado —se anota y no es puerta: la 32.4 retira el salto y juzga SM-C4—.
 *
 * Ningún incipit del Corpus real se declara: el corpus es de prueba y se construye en una copia.
 */

/* En serie: el montaje levanta un servidor en un puerto fijo. */
test.describe.configure({ mode: 'serial' });

const PERFIL = 'escritorio';

/*
 * Puerto propio: 4321 es el sitio del repositorio, 4399/4400 los de `receptor.spec.ts`, 4402 el de
 * `ingreso-accesible`, 4403 el de `busqueda-historial`, 4404 el de `desplegable` y 4405 el de
 * `ficha-tecnica`.
 */
const PUERTO_SITIO = 4406;
const SITIO = `http://localhost:${PUERTO_SITIO}`;

/** El título más largo del Corpus real (`corpus/obras/mariano-jose-de-larra--primera-representacion-…`). */
const TITULO =
  'Primera representación del drama episódico, nuevo, original, en tres actos, titulado ' +
  '«Don Quijote de la Mancha en Sierra Morena» escrito por don Ventura de la Vega';
const FICHA = 'mariano-jose-de-larra--primera-representacion-del-drama-episodico';
const OBRA = '/obra/mariano-jose-de-larra/primera-representacion-del-drama-episodico/';

/** El Autor de esa Obra, como lo declara su ficha del Corpus: el nombre también ocupa la Cabecera. */
const LARRA =
  'nombre: "Mariano José de Larra"\nañoNacimiento: 1809\nañoFallecimiento: 1837\n' +
  'semblanza: "Periodista y crítico madrileño."\nordenAlfabetico: "Larra"\n';

const AUTOR = entidad('Q2054', 30, { es: 'Mariano José de Larra' });
const COMEDIA = entidad('Q40831', 40, { es: 'comedia dramática en verso' });
const ZARZUELA = entidad('Q186824', 42, { es: 'zarzuela de costumbres madrileñas' });
const ESPAÑOL = entidad('Q1321', 41, { es: 'español' });
const LATIN = entidad('Q397', 43, { es: 'latín' });
const ATADA = entidad('Q99001', 100, {
  claims: {
    P50: [aEntidad('Q2054')],
    P136: [aEntidad('Q40831'), aEntidad('Q186824')],
    P407: [aEntidad('Q1321'), aEntidad('Q397')],
    P577: [aTiempo('+1841-00-00T00:00:00Z')],
  },
});

const URL_DEL_DOCUMENTO = 'https://es.wikisource.org/wiki/Primera_representacion';
const DOCUMENTO = nombreDeDocumento('wikisource-es', TITULO)!;
const FRASES = [0, 1, 2].map((i) => `Una frase del drama, la número ${i}, que se puede leer entera.`);
/**
 * Dos frases, 148 puntos de código: con el tope de la copia (200) salen las dos, en un párrafo, y la
 * línea siguiente (una Cita, 61 más) ya no cabe.
 */
const INCIPIT =
  'Abre el drama una sala de la venta, con su mesa, su candil y dos arrieros que discuten de caminos. ' +
  'Entra el ventero, que lo oye todo y no dice nada.';

/** El tope del incipit, parcheado en la copia: la prueba no fija el del árbol. */
const UMBRALES = readFileSync(join(RAIZ, 'src/lib/umbrales.ts'), 'utf8').replace(
  /^export const MAX_CARACTERES_DEL_INCIPIT: number \| undefined = [^;\n]+;$/mu,
  'export const MAX_CARACTERES_DEL_INCIPIT: number | undefined = 200;',
);

const enCarpeta = (...entidades: Record<string, unknown>[]) =>
  Object.fromEntries(
    entidades.map((e) => [`wikidata/${nombreDeDocumentoDeWikidata(String(e.id), Number(e.lastrevid))}`, documento(e)]),
  );

function corpus(): Record<string, string> {
  const c: Record<string, string> = {
    'autores/mariano-jose-de-larra.yml': LARRA,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    [`obras/${FICHA}.yml`]:
      `autor: "mariano-jose-de-larra"\ntitulo: "${TITULO.replace(/"/g, '\\"')}"\nformas:\n  - "${formaDeObra(TITULO)}"\n` +
      'wikidata:\n  entidad: "Q99001"\n  revision: 100\n' +
      `incipit:\n  documento: "${DOCUMENTO}"\n  desde: "Abre el drama"\n`,
    [`fuentes/${DOCUMENTO}.txt`]: componerDocumento(
      { fuente: 'wikisource-es', obra: TITULO, año: 1841, url: URL_DEL_DOCUMENTO, recuperado: '2026-11-08', lineas: 'prosa-por-lineas' },
      TITULO,
      [INCIPIT, ...FRASES].join('\n'),
    ),
    ...enCarpeta(ATADA, AUTOR, COMEDIA, ZARZUELA, ESPAÑOL, LATIN),
    'wikidata/vigentes.yml': componerVigentes(
      new Map(Object.entries({ Q2054: 30, Q40831: 40, Q186824: 42, Q1321: 41, Q397: 43 })),
    ),
  };
  for (let i = 0; i < 3; i += 1) {
    c[`citas/mariano-jose-de-larra--drama-${i}.md`] = citaValida({
      texto: FRASES[i],
      autor: 'mariano-jose-de-larra',
      temas: [],
      slug: `mariano-jose-de-larra-drama-${i}`,
      procedencia: { obra: TITULO, año: 1841, traduccion: { traductor: 'Francisco Navarro y Calvo' } },
      fuente: { id: 'wikisource-es', url: URL_DEL_DOCUMENTO },
    });
  }
  return c;
}

let servidor: ChildProcess | undefined;
let proyecto: string | undefined;

test.beforeAll(async () => {
  if (test.info().project.name !== PERFIL) return;
  test.setTimeout(300_000);

  const construido = await construirConCorpus(corpus(), {
    jornada: '2026-08-20',
    ficheros: { 'src/lib/umbrales.ts': UMBRALES },
  });
  proyecto = construido.proyecto;
  expect(construido.codigo, construido.salida).toBe(0);

  // La guarda previa: sin la línea y el desplegable no hay nada que medir.
  const dist = join(construido.proyecto, 'dist');
  const html = await readFile(paginaEnDist(dist, OBRA), 'utf8');
  expect(html, 'la Página de Obra se construyó sin la línea de Ficha técnica').toContain('class="ficha-tecnica"');
  expect(html, 'la Página de Obra se construyó sin «Cómo empieza»').toContain('class="incipit"');

  servidor = spawn('node', [join(new URL('..', import.meta.url).pathname, 'servidor.mjs')], {
    env: { ...process.env, DIST: dist, PUERTO: String(PUERTO_SITIO) },
    stdio: 'ignore',
  });
  let muerto: number | null = null;
  servidor.on('exit', (codigo) => (muerto = codigo ?? 1));
  servidor.on('error', () => (muerto = 1));
  for (let intento = 0; intento < 100; intento += 1) {
    if (muerto !== null) break;
    try {
      // Una ruta que solo este corpus publica: un 200 dice que el servidor es el nuestro.
      const respuesta = await fetch(`${SITIO}${OBRA}`, { signal: AbortSignal.timeout(2000) });
      if (respuesta.ok) return;
    } catch {
      // Todavía no ha levantado.
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `El sitio de prueba no llegó a servir ${OBRA} en ${PUERTO_SITIO}; comprueba quién lo ocupa con ` +
      `\`lsof -nP -iTCP:${PUERTO_SITIO} -sTCP:LISTEN\`.`,
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
  test.skip(info.project.name !== PERFIL, 'la ventana se fija dentro de cada prueba');
});

const SUMMARY = 'details.desplegable > summary';

async function auditar(page: import('@playwright/test').Page) {
  const resultado = await new AxeBuilder({ page }).withTags([...ETIQUETAS_DEL_BARRIDO]).analyze();
  expect(await desviacionDelBarrido(page, resultado)).toEqual({ faltan: [], sobran: [] });
  expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  expect(sinDecidir(resultado)).toEqual([]);
}

test.describe('«Cómo empieza», rendido', () => {
  test('la página 1 pasa la auditoría automática con el desplegable cerrado y abierto', async ({ page }) => {
    await page.goto(`${SITIO}${OBRA}`);
    const desplegable = page.locator('details.desplegable');
    await expect(desplegable).toHaveCount(1);
    await expect(desplegable).not.toHaveAttribute('open', /.*/u);
    await expect(page.locator(SUMMARY)).toHaveText(/^Cómo empieza/u);
    await expect(page.locator('p.incipit')).not.toBeVisible();
    await auditar(page);
    await page.locator(SUMMARY).click();
    await expect(desplegable).toHaveAttribute('open', '');
    await expect(page.locator('p.incipit')).toHaveText(INCIPIT);
    await expect(page.locator('p.fuente-del-incipit')).toHaveText('Wikisource en español. Licencia CC BY-SA 4.0.');
    await auditar(page);
  });

  test('Intro sobre el `<summary>` lo abre sin mover el foco', async ({ page }) => {
    await page.goto(`${SITIO}${OBRA}`);
    const summary = page.locator(SUMMARY);
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('details.desplegable')).toHaveAttribute('open', '');
    // El foco sigue en **ese** `<summary>`, y lo que pliega se ve.
    expect(await summary.evaluate((nodo) => nodo === document.activeElement)).toBe(true);
    await expect(page.locator('details.desplegable p').first()).toBeVisible();
  });

  test('a 360 × 640 se mide dónde empieza la primera Tarjeta del listado, con todo cerrado', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(`${SITIO}${OBRA}`);
    const caja = await page.locator('ul.listado > li').first().boundingBox();
    expect(caja).not.toBeNull();
    test.info().annotations.push({ type: 'medida', description: `primera Tarjeta a ${caja!.y} px` });
    console.log(`[incipit] primera Tarjeta del listado a ${caja!.y} px de 640`);
  });

  test('a 320 px no hay desplazamiento horizontal, cerrado ni abierto', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(`${SITIO}${OBRA}`);
    const medir = () =>
      page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
    const cerrado = await medir();
    expect(cerrado.scrollWidth).toBeLessThanOrEqual(cerrado.clientWidth);
    await page.locator(SUMMARY).click();
    const abierto = await medir();
    expect(abierto.scrollWidth).toBeLessThanOrEqual(abierto.clientWidth);
  });
});
