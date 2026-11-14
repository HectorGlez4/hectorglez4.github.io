import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { formaDeObra } from '../../src/lib/obras.ts';
import { ETIQUETAS_DEL_BARRIDO } from '../../src/lib/superficies.ts';
import { componerVigentes, nombreDeDocumentoDeWikidata } from '../../tools/lib/wikidata.ts';
import { TEMA_VALIDO, citaValida, construirConCorpus, limpiar, paginaEnDist } from '../unit/ayuda/construir.js';
import { aEntidad, aTiempo, documento, entidad } from '../unit/ayuda/wikidata.ts';
import { desviacionDelBarrido, sinDecidir } from './ayuda/barrido.ts';

/**
 * Historia 32.2 — la línea de Ficha técnica en un navegador.
 *
 * `tests/unit/ficha-tecnica-build.test.ts` mira el marcado; esto mide lo que solo existe rendido:
 * que axe no da infracción en la página 1 de una Obra con la línea más larga que se puede pedir
 * —dos géneros, año, dos lenguas y traductor— y el título más largo del Corpus (el de Larra, 177
 * caracteres), que a 360 × 640 la primera Tarjeta del listado sigue empezando en la primera
 * pantalla, y que a 320 px no hay desplazamiento horizontal.
 *
 * Ninguna entidad del Corpus real se ata: el corpus es de prueba y se construye en una copia.
 */

/* En serie: el montaje levanta un servidor en un puerto fijo. */
test.describe.configure({ mode: 'serial' });

const PERFIL = 'escritorio';

/*
 * Puerto propio: 4321 es el sitio del repositorio, 4399/4400 los de `receptor.spec.ts`, 4402 el de
 * `ingreso-accesible`, 4403 el de `busqueda-historial`, 4404 el de `desplegable`, 4405 el de
 * `lee-el-pasaje`, 4406 el de `obras-de-la-portada` y 4407 el de
 * `temas-colecciones-autores-de-la-portada` (`tests/unit/puertos-e2e.test.ts` vigila que no se repitan).
 */
const PUERTO_SITIO = 4408;
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
      'wikidata:\n  entidad: "Q99001"\n  revision: 100\n',
    ...enCarpeta(ATADA, AUTOR, COMEDIA, ZARZUELA, ESPAÑOL, LATIN),
    'wikidata/vigentes.yml': componerVigentes(
      new Map(Object.entries({ Q2054: 30, Q40831: 40, Q186824: 42, Q1321: 41, Q397: 43 })),
    ),
  };
  for (let i = 0; i < 3; i += 1) {
    c[`citas/mariano-jose-de-larra--drama-${i}.md`] = citaValida({
      texto: `Una frase del drama, la número ${i}, que se puede leer entera.`,
      autor: 'mariano-jose-de-larra',
      temas: [],
      slug: `mariano-jose-de-larra-drama-${i}`,
      procedencia: { obra: TITULO, año: 1841, traduccion: { traductor: 'Francisco Navarro y Calvo' } },
      fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Primera_representacion' },
    });
  }
  return c;
}

let servidor: ChildProcess | undefined;
let proyecto: string | undefined;

test.beforeAll(async () => {
  if (test.info().project.name !== PERFIL) return;
  test.setTimeout(300_000);

  const construido = await construirConCorpus(corpus(), { jornada: '2026-08-20' });
  proyecto = construido.proyecto;
  expect(construido.codigo, construido.salida).toBe(0);

  // La guarda previa: sin la línea no hay nada que medir.
  const dist = join(construido.proyecto, 'dist');
  const html = await readFile(paginaEnDist(dist, OBRA), 'utf8');
  expect(html, 'la Página de Obra se construyó sin la línea de Ficha técnica').toContain('class="ficha-tecnica"');

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

test.describe('la línea de Ficha técnica, rendida', () => {
  test('la página 1 de la Obra pasa la auditoría automática con la línea puesta', async ({ page }) => {
    await page.goto(`${SITIO}${OBRA}`);
    await expect(page.locator('.ficha-tecnica')).toContainText('Traducción de Francisco Navarro y Calvo');
    const resultado = await new AxeBuilder({ page }).withTags([...ETIQUETAS_DEL_BARRIDO]).analyze();
    expect(await desviacionDelBarrido(page, resultado)).toEqual({ faltan: [], sobran: [] });
    expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(sinDecidir(resultado)).toEqual([]);
  });

  /*
   * Historias 32.2 y 32.4 — la puerta de la 32.2, otra vez en pie. La 32.5 la dejó en `test.fixme`
   * con «Cómo citar» entre la Cabecera y el listado (669,5 px el 2026-11-09); con la decisión 1b,
   * delegada por Héctor el 2026-11-14, «Cómo citar» va al pie y arriba solo queda «Dónde leer esta
   * obra» (32.4), a 2 × `--unidad`: esta Obra de prueba —el título de Larra y la línea de Ficha
   * técnica más larga que se puede pedir— vuelve a dejar la primera Tarjeta en la primera pantalla.
   * La aserción no se rebaja. Ninguna Obra del Corpus real está atada a Wikidata, y la puerta de toda
   * página 1 con el Corpus real (`tests/e2e/accesibilidad.spec.ts`) sigue estricta.
   */
  test('a 360 × 640 la primera Tarjeta del listado empieza en la primera pantalla', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(`${SITIO}${OBRA}`);
    const caja = await page.locator('ul.listado > li').first().boundingBox();
    expect(caja).not.toBeNull();
    test.info().annotations.push({ type: 'medida', description: `primera Tarjeta a ${caja!.y} px` });
    console.log(`[ficha-tecnica] primera Tarjeta del listado a ${caja!.y} px de 640`);
    expect(caja!.y).toBeLessThan(640);
  });

  test('a 320 px no hay desplazamiento horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(`${SITIO}${OBRA}`);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
