import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { EVENTOS } from '../../src/lib/medicion.ts';
import { combinacionDeFiltros, fraseDelRecuento } from '../../src/lib/busqueda.ts';
import { filtrosDeLaBusqueda } from '../../src/lib/publicado.ts';
import { rutaDeLaBusqueda } from '../../src/lib/superficies.ts';
import { conjuntoDeLosDatos, leerDatosDelCorpus } from '../../tools/lib/alcance.ts';
import { rutasDelCorpus } from '../../tools/lib/corpus.ts';
import { conLaCacheDeVerdad } from './ayuda/cache.ts';

/*
 * Historia 27.4 (FR-7, NFR-4, AD-13) — la búsqueda vive en la dirección, y «atrás» la devuelve,
 * con la caché de atrás y adelante de verdad y sin ella, y con la recarga.
 *
 * El servidor de la suite (4321) sirve `no-store`, que deja la página fuera de esa caché; y el sitio
 * de `receptor.spec.ts` no tiene ningún Tema publicado. Así que esta prueba sirve el `dist/` que ya
 * construyó la suite —el del Corpus, con su punto final de medición— con `tests/servidor.mjs` en
 * otro puerto y `max-age=600`, como el alojamiento. Lo que se cuenta lo apunta un espía en
 * `__medir` y en `sendBeacon` **acumulado por pestaña** (`sessionStorage`): cada vuelta sin la caché
 * es otro documento, y la cuenta tiene que sobrevivirle.
 */

const PERFIL = 'escritorio';
const PUERTO = 4403;
const SITIO = `http://localhost:${PUERTO}`;
const RUTA = rutaDeLaBusqueda();
const RAIZ = new URL('../..', import.meta.url).pathname;
const RESULTADOS = '[data-resultados] .resultado a';
const ESTADO = '[data-estado]';

// Un solo servidor en un solo puerto: las pruebas de este fichero van en serie, en un trabajador.
test.describe.configure({ mode: 'serial' });

let servidor: ChildProcess | undefined;

test.beforeAll(async ({}, info) => {
  if (info.project.name !== PERFIL) return;
  // El puerto tiene que estar libre: un servidor ajeno serviría otro sitio sin decirlo.
  const ocupado = await fetch(`${SITIO}/`).then(
    () => true,
    () => false,
  );
  if (ocupado) {
    throw new Error(`Alguien responde ya en ${PUERTO}. Comprueba quién con \`lsof -nP -iTCP:${PUERTO} -sTCP:LISTEN\`.`);
  }
  servidor = spawn('node', [join(RAIZ, 'tests', 'servidor.mjs')], {
    env: { ...process.env, DIST: join(RAIZ, 'dist'), PUERTO: String(PUERTO), SERVIDOR_CACHE_CONTROL: 'max-age=600' },
    stdio: 'ignore',
  });
  let muerto: number | null = null;
  servidor.on('exit', (codigo) => (muerto = codigo ?? 1));
  for (let intento = 0; intento < 100 && muerto === null; intento++) {
    try {
      const respuesta = await fetch(`${SITIO}${RUTA}`);
      // Su propio `/buscar/`, con la isla: no basta con que el puerto conteste.
      if (respuesta.ok && (await respuesta.text()).includes('data-busqueda')) return;
    } catch {
      // Todavía no ha levantado.
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`El \`dist/\` no llegó a servir ${RUTA} en ${PUERTO}${muerto !== null ? ` (el servidor salió con ${muerto})` : ''}.`);
});

test.afterAll(() => {
  servidor?.kill();
});

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== PERFIL, 'el historial y la caché no dependen del dispositivo');
});

/** Lo que una pestaña pasó a `__medir` y lo que salió por `sendBeacon`, acumulado en `sessionStorage`. */
async function espiar(objetivo: Page | BrowserContext) {
  await objetivo.addInitScript(() => {
    const leer = (clave: string): unknown[] => {
      try {
        return JSON.parse(sessionStorage.getItem(clave) ?? '[]') as unknown[];
      } catch {
        return [];
      }
    };
    const apuntar = (clave: string, valor: unknown) => {
      try {
        sessionStorage.setItem(clave, JSON.stringify([...leer(clave), valor]));
      } catch {
        // Sin almacenamiento la prueba lo dirá: no habrá nada que contar.
      }
    };
    // Un accesor, como `espiarMedicion`: el arranque y el fichero asignan, el espía reenvía.
    let real: ((...argumentos: unknown[]) => void) | undefined;
    const espia = function (...argumentos: unknown[]) {
      apuntar('__medidos', argumentos.map((a) => a ?? null));
      if (real) real(...argumentos);
    };
    Object.defineProperty(window, '__medir', {
      configurable: true,
      get: () => espia,
      set: (funcion) => {
        real = funcion;
      },
    });
    const original = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, datos?: BodyInit | null) => {
      try {
        apuntar('__balizas', JSON.parse(String(datos)));
      } catch {
        apuntar('__balizas', { sinInterpretar: String(datos) });
      }
      return original(url, datos);
    };
  });
}

const medidos = (page: Page) =>
  page.evaluate(() => JSON.parse(sessionStorage.getItem('__medidos') ?? '[]') as unknown[][]);
const balizas = (page: Page) =>
  page.evaluate(() => JSON.parse(sessionStorage.getItem('__balizas') ?? '[]') as Record<string, unknown>[]);
/** Las `busqueda` que pidió la isla, por su combinación de filtros. */
const busquedas = async (page: Page) => (await medidos(page)).filter((m) => m[0] === EVENTOS.busqueda).map((m) => m[2]);
const salidas = async (page: Page) => (await balizas(page)).filter((b) => b.evento === EVENTOS.salidaInterna);

/** El Autor y el Tema de su cruce con más Citas que quepan en una tanda, con sus nombres y recuentos. */
async function elCruce() {
  const conjunto = conjuntoDeLosDatos(await leerDatosDelCorpus(rutasDelCorpus(join(RAIZ, 'corpus'))));
  const filtros = filtrosDeLaBusqueda(conjunto);
  const cruces = new Map<string, number>();
  for (const [, deCita] of filtros.porCita) {
    for (const tema of deCita.temas) cruces.set(`${deCita.autor}|${tema}`, (cruces.get(`${deCita.autor}|${tema}`) ?? 0) + 1);
  }
  const [clave, cuantas] = [...cruces.entries()]
    .filter(([, n]) => n <= 30)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
  const [autor, tema] = clave.split('|');
  const deAutor = filtros.autores.find((a) => a.valor === autor)!;
  const deTema = filtros.temas.find((t) => t.valor === tema)!;
  return {
    autor,
    tema,
    soloAutor: fraseDelRecuento({ total: deAutor.recuento, texto: '', autor: deAutor.rotulo }),
    conTema: fraseDelRecuento({ total: cuantas, texto: '', autor: deAutor.rotulo, tema: deTema.rotulo }),
  };
}

const COMBINACION = {
  autor: combinacionDeFiltros({ autor: 'a', tema: '' }),
  autorTema: combinacionDeFiltros({ autor: 'a', tema: 't' }),
};

/** Espera a que la dirección diga esa consulta. */
const direccion = (page: Page, consulta: string) =>
  expect.poll(() => new URL(page.url()).search, { timeout: 10_000 }).toBe(consulta);

/** Lo que se ve: campo, selectores y recuento. */
async function seVe(page: Page, autor: string, tema: string, recuento: string) {
  await expect(page.locator('#filtro-de-autor')).toHaveValue(autor);
  await expect(page.locator('#filtro-de-tema')).toHaveValue(tema);
  await expect(page.locator(ESTADO)).toHaveText(recuento, { timeout: 10_000 });
  await expect(page.locator(RESULTADOS).first()).toBeVisible();
}

/**
 * El recorrido común: Autor, Tema, un resultado, atrás (por la caché o sin ella), atrás otra vez
 * (por `popstate`, en el mismo documento), adelante, y recargar. `volver` es el primer «atrás»:
 * la restauración comprobada, o un `goBack` que vuelve a cargar la página.
 */
async function recorrer(page: Page, volver: () => Promise<void>) {
  const cruce = await elCruce();
  const ambos = `?autor=${cruce.autor}&tema=${cruce.tema}`;
  await page.goto(`${SITIO}/`);
  await page.goto(`${SITIO}${RUTA}`);
  await page.locator('#filtro-de-autor').selectOption(cruce.autor);
  await direccion(page, `?autor=${cruce.autor}`);
  await page.locator('#filtro-de-tema').selectOption(cruce.tema);
  await direccion(page, ambos);
  await seVe(page, cruce.autor, cruce.tema, cruce.conTema);

  // Un resultado: asienta lo que se ve —una `busqueda`— y sale.
  await page.locator(RESULTADOS).first().click();
  await page.waitForURL((url) => url.pathname !== RUTA);
  await expect.poll(() => busquedas(page)).toEqual([COMBINACION.autorTema]);
  await expect.poll(async () => (await salidas(page)).length).toBe(1);

  // Atrás: el estado asentado, intacto o repintado; nada se reemite, ni con Enter.
  await volver();
  await direccion(page, ambos);
  await seVe(page, cruce.autor, cruce.tema, cruce.conTema);
  await page.locator('[data-consulta]').press('Enter');
  await page.waitForTimeout(400);
  expect(await busquedas(page)).toEqual([COMBINACION.autorTema]);

  // Atrás otra vez, en el mismo documento: el estado de solo el Autor, repintado sin recargar.
  await page.evaluate(() => ((window as unknown as { __mismo: boolean }).__mismo = true));
  // `commit`: es una navegación en el mismo documento, y una página restaurada de la caché no
  // vuelve a dar `load`.
  await page.goBack({ waitUntil: 'commit' });
  await direccion(page, `?autor=${cruce.autor}`);
  await seVe(page, cruce.autor, '', cruce.soloAutor);
  expect(await page.evaluate(() => (window as unknown as { __mismo?: boolean }).__mismo)).toBe(true);
  expect(await busquedas(page)).toEqual([COMBINACION.autorTema]);
  // Ese estado no se había asentado nunca: Enter lo asienta, una vez.
  await page.locator('[data-consulta]').press('Enter');
  await expect.poll(() => busquedas(page)).toEqual([COMBINACION.autorTema, COMBINACION.autor]);
  await page.locator('[data-consulta]').press('Enter');

  // Adelante, al estado del resultado: repintado, y ya contaba.
  await page.goForward({ waitUntil: 'commit' });
  await direccion(page, ambos);
  await seVe(page, cruce.autor, cruce.tema, cruce.conTema);
  await page.locator('[data-consulta]').press('Enter');

  // Recargar: la entrada llega marcada, se repinta y no asienta otra.
  await page.reload();
  await direccion(page, ambos);
  await seVe(page, cruce.autor, cruce.tema, cruce.conTema);
  await page.locator('[data-consulta]').press('Enter');
  await page.waitForTimeout(400);
  expect(await busquedas(page)).toEqual([COMBINACION.autorTema, COMBINACION.autor]);

  // Otro resultado tras volver: otra salida, contada aparte, y ninguna `busqueda` más.
  await page.locator(RESULTADOS).last().click();
  await page.waitForURL((url) => url.pathname !== RUTA);
  await expect.poll(async () => (await salidas(page)).length).toBe(2);
  expect(await busquedas(page)).toEqual([COMBINACION.autorTema, COMBINACION.autor]);
}

test.describe('Historia 27.4 — «atrás» devuelve la búsqueda, con la caché y sin ella', () => {
  test('Autor, Tema, resultado, atrás, atrás —con la caché de atrás y adelante comprobada—: una `busqueda` por estado asentado', async ({
    playwright,
  }) => {
    test.setTimeout(120_000);
    await conLaCacheDeVerdad(playwright, { preparar: (pagina) => espiar(pagina) }, async (pagina, restaurada) => {
      await recorrer(pagina, async () => {
        await restaurada();
        // Restaurada: la misma carga, que conserva su memoria de lo emitido.
        expect(await pagina.evaluate(() => (window as unknown as { __restaurada?: boolean }).__restaurada)).toBe(true);
      });
    });
  });

  test('Autor, Tema, resultado, atrás, atrás —sin la caché—: la vuelta es otra carga, `back_forward`, y no asienta otra', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await espiar(page);
    await recorrer(page, async () => {
      await page.goBack();
      expect(
        await page.evaluate(() => (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).type),
      ).toBe('back_forward');
      expect(await page.evaluate(() => (window as unknown as { __restaurada?: boolean }).__restaurada)).toBeUndefined();
    });
  });
});
