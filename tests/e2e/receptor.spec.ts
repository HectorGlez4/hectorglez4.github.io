import { expect, test, type BrowserContext, type Page, type PlaywrightWorkerArgs } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import {
  ASENTAMIENTO_DE_BUSQUEDA,
  ATRIBUTO_DE_ZONA,
  ATRIBUTO_SIN_ZONA,
  EVENTOS,
  EVENTOS_DEL_GUION,
  EXENCIONES_DE_ZONA,
  MARCA_DE_BUSQUEDA_ASENTADA,
  camposQueEmite,
  rutaDelGuionDeMedicion,
} from '../../src/lib/medicion.ts';
import { CAMPOS, MARCAS_DE_OBRA, claveEnLaBaliza, tramoDe } from '../../src/lib/vocabulario.ts';
import { MIN_MS_VISIBLES_PARA_LA_LECTURA } from '../../src/lib/umbrales.ts';
import { entradaDeLoDescargado } from '../../src/lib/guiones.ts';
import { apuntarGuiones } from './ayuda/guiones.ts';
import { interpretar, type Registro } from '../../medicion/receptor.ts';
import { rutaDeAutor, rutaDeCita, rutaDeObra } from '../../src/lib/superficies.ts';
import { AUTOR_VALIDO, TEMA_VALIDO, citaValida, construirConCorpus, limpiar } from '../unit/ayuda/construir.js';

/**
 * Historia 7.3 — los cuatro eventos de la v1 recorridos desde sus superficies de verdad.
 *
 * Se construye un sitio aparte **con la medición configurada** en vez de espiar
 * `window.__medir` en el sitio de siempre: el espía demuestra que la superficie llama al
 * módulo, que es lo que ya comprobaba la Historia 2.9. Lo que esta historia añade es que
 * la baliza sale, viaja y llega — y eso solo se ve con el guion de verdad instalado y un
 * receptor al otro lado ejecutando el código que se va a desplegar.
 */

/*
 * En serie y en un solo trabajador: el fichero levanta un receptor y un servidor en
 * puertos fijos desde `beforeAll`, y con la ejecución en paralelo del resto de la suite
 * ese `beforeAll` corre una vez por trabajador y los puertos chocan entre sí.
 */
test.describe.configure({ mode: 'serial' });

/*
 * Solo en un perfil: la baliza es idéntica en móvil y en escritorio —el mismo guion, el
 * mismo `sendBeacon`—, así que repetirlo duplicaría un build de Astro completo sin
 * añadir ni una señal. Lo que sí depende del dispositivo lo cubren las historias de la v1.
 */
const PERFIL = 'escritorio';

const PUERTO_RECEPTOR = 4399;
const PUERTO_SITIO = 4400;
const SITIO = `http://localhost:${PUERTO_SITIO}`;

const CITA = 'seneca-no-es-que-tengamos-poco-tiempo';

/*
 * Historia 23.1 — un Kit con dos copias de `CopiarCita`. La alternativa solo sale cuando la Cita
 * del Día no admite Imagen, así que se fija para la jornada del build una Cita de más de
 * `MAX_CARACTERES_IMAGEN` y se marca apta otra corta, que es la alternativa.
 */
const JORNADA = '2026-10-24';
const CITA_LARGA = 'seneca-larga-del-kit';
const TEXTO_LARGO =
  'Mientras se aplaza la vida, la vida pasa: todo lo demás nos es ajeno y solo el tiempo es ' +
  'nuestro, y esa sola posesión, fugaz y resbaladiza, nos la arrebata cualquiera que quiere, ' +
  'sin que nos demos cuenta de lo que hemos perdido hasta que ya no queda nada que perder ni ' +
  'tiempo en que lamentarlo, que es la forma más cara de aprender lo que valía.';

/*
 * La ruta sale del constructor, y no de `/cita/${CITA}` escrito aquí. Lo que la baliza
 * manda es `location.pathname`, así que la forma que se pide y la que se espera tienen que
 * ser la misma que el sitio publica: escritas a mano se quedaron sin barra al migrar, y la
 * prueba pedía una URL que redirige para luego comparar contra la forma que ya no llega.
 */
const RUTA_CITA = rutaDeCita(CITA);
const RUTA_BUSCAR = '/buscar/';
const SIN_RESULTADOS = 'zzzzqqqxxx';
const PUNTO_FINAL = `http://localhost:${PUERTO_RECEPTOR}/e`;
/** Historia 23.1 — el fichero de medición que este sitio sirve, con su versión. */
const RUTA_DEL_FICHERO = rutaDelGuionDeMedicion(PUNTO_FINAL);
/** Historia 23.9 — la Fuente de las dos Citas de «Cartas a Lucilio», coherente con su obra. */
const FUENTE_DE_CARTAS = { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Cartas_a_Lucilio' };

let recibidos: (Registro | null)[] = [];
let receptor: Server;
let servidor: ChildProcess;
let proyecto: string;

/** Espera a que llegue un evento con ese nombre, sin encadenarse a una carrera. */
async function esperarEvento(nombre: string, milisegundos = 5000) {
  const hasta = Date.now() + milisegundos;
  while (Date.now() < hasta) {
    const encontrado = recibidos.find((r) => r?.evento === nombre);
    if (encontrado) return encontrado;
    await new Promise((r) => setTimeout(r, 50));
  }
  return undefined;
}

/** Espera a que el fichero de medición se haya ejecutado: ha sustituido a la cola del arranque. */
async function esperarAlFichero(page: Page) {
  await page.waitForFunction(() => {
    const medir = (window as unknown as { __medir?: { q?: unknown } }).__medir;
    return typeof medir === 'function' && !('q' in medir);
  });
}

/** Una espera de verdad, en el reloj de la prueba: el de la página puede estar fingido. */
const esperar = (milisegundos: number) => new Promise((r) => setTimeout(r, milisegundos));

/**
 * Apunta, en la página, cada baliza en el orden en que sale por `sendBeacon`: el receptor las
 * recibe por varias conexiones y no garantiza ese orden. Se instala antes de navegar.
 *
 * Apuntar nunca impide enviar: una carga que no sea JSON —si el transporte cambiara— se apunta
 * como `{ sinInterpretar }` y la baliza sale igual, así que el fallo lo dice la prueba que la
 * esperaba y no una baliza que desaparece.
 */
async function apuntarBalizas(page: Page) {
  await page.addInitScript(() => {
    const ventana = window as unknown as { __balizas: Record<string, unknown>[] };
    ventana.__balizas = [];
    const original = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, datos?: BodyInit | null) => {
      try {
        ventana.__balizas.push(JSON.parse(String(datos)));
      } catch {
        ventana.__balizas.push({ sinInterpretar: String(datos) });
      }
      return original(url, datos);
    };
  });
}

/** Lo que `apuntarBalizas` ha visto salir hasta ahora, en su orden. */
function balizasDe(page: Page): Promise<Record<string, unknown>[]> {
  return page.evaluate(() => (window as unknown as { __balizas?: Record<string, unknown>[] }).__balizas ?? []);
}

test.beforeAll(async () => {
  // El montaje también se salta fuera del perfil: si no, el trabajador del otro perfil
  // levantaría los mismos puertos en paralelo aunque no llegara a ejecutar nada.
  if (test.info().project.name !== PERFIL) return;

  // El receptor de la prueba ejecuta `interpretar`, el mismo código que el Worker.
  receptor = createServer((peticion, respuesta) => {
    let cuerpo = '';
    peticion.on('data', (trozo) => (cuerpo += trozo));
    peticion.on('end', () => {
      recibidos.push(interpretar(cuerpo, new Date()));
      respuesta.writeHead(204).end();
    });
  });
  await new Promise<void>((r) => receptor.listen(PUERTO_RECEPTOR, r));

  const resultado = await construirConCorpus(
    {
      'autores/seneca.yml': AUTOR_VALIDO,
      'temas/el-tiempo.yml': TEMA_VALIDO,
      'citas/seneca--una.md': citaValida(),
      /*
       * Historia 23.9 — dos de las tres Citas son de «Cartas a Lucilio», que así se indexa (2 de 3,
       * por debajo del tope de FR-52), y «Sobre la brevedad de la vida» queda con una, que no se
       * indexa por `MIN_CITAS_OBRA_INDEXABLE`: una Obra de cada clase, sin añadir Citas.
       */
      'citas/seneca--dos.md': citaValida({
        texto: 'No hay viento favorable para el que no sabe adónde va.',
        slug: 'seneca-no-hay-viento-favorable',
        aptaParaPortada: true,
        procedencia: { obra: 'Cartas a Lucilio', año: 64 },
        fuente: FUENTE_DE_CARTAS,
      }),
      'citas/seneca--larga.md': citaValida({
        texto: TEXTO_LARGO,
        slug: CITA_LARGA,
        temas: [],
        aptaParaPortada: true,
        procedencia: { obra: 'Cartas a Lucilio', año: 64 },
        fuente: FUENTE_DE_CARTAS,
      }),
      'portada.json': JSON.stringify({ fijaciones: { [JORNADA]: CITA_LARGA } }, null, 2),
    },
    {
      entorno: { MEDICION_ENDPOINT: PUNTO_FINAL },
      conBusqueda: true,
      jornada: JORNADA,
    },
  );
  expect(resultado.codigo, resultado.salida).toBe(0);
  proyecto = resultado.proyecto;

  /*
   * Historia 23.5 — este sitio se sirve como el alojamiento, `max-age=600`, y no `no-store`: una
   * respuesta `no-store` deja la página fuera de la caché de atrás y adelante, y la prueba de la
   * lectura tras volver por esa caché no podría ocurrir. Cada prueba abre su propio contexto, con
   * su caché vacía, así que ninguna otra se entera.
   */
  servidor = spawn('node', [join(new URL('..', import.meta.url).pathname, 'servidor.mjs')], {
    env: {
      ...process.env,
      DIST: join(proyecto, 'dist'),
      PUERTO: String(PUERTO_SITIO),
      SERVIDOR_CACHE_CONTROL: 'max-age=600',
    },
    stdio: 'ignore',
  });

  // Que muera al arrancar —el puerto ocupado -- deja de ser mudo. Con `stdio: 'ignore'`
  // no hay salida que leer, así que el código de salida es lo único que queda.
  let muerto: number | null = null;
  servidor.on('exit', (codigo) => (muerto = codigo ?? 1));

  /*
   * Se espera a que responda **su propio sitio**, y no a que el puerto conteste algo.
   *
   * Preguntando solo «¿contesta alguien en 4400?», un servidor ajeno que se hubiera
   * quedado ocupando el puerto daba la espera por buena: el `spawn` de arriba moría con
   * EADDRINUSE sin decir nada y las pruebas navegaban contra el sitio de otro, que
   * devolvía 404 a todo. El síntoma era «no llegó la vista de cita» —la baliza no sale de
   * una página que no existe—, y no se parece en nada a su causa.
   *
   * No es hipotético: un `servidor.mjs` de un árbol de trabajo ya borrado se quedó cinco
   * días escuchando en 4400, y con él estas cuatro pruebas en rojo por un motivo que no
   * era el suyo.
   *
   * La sonda es una Cita que solo existe en el corpus de esta prueba. Si responde 200, el
   * servidor es el nuestro; si responde otra cosa, hay alguien más en el puerto.
   */
  let ajeno: number | undefined;
  for (let intento = 0; intento < 100; intento++) {
    if (muerto !== null) break;
    try {
      const respuesta = await fetch(`${SITIO}${RUTA_CITA}`);
      if (respuesta.ok) return;
      ajeno = respuesta.status;
    } catch {
      // Todavía no ha levantado; se reintenta.
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  throw new Error(
    [
      `El sitio de prueba no llegó a servir ${RUTA_CITA} en el puerto ${PUERTO_SITIO}.`,
      muerto !== null
        ? `El servidor murió al arrancar (código ${muerto}); casi siempre es el puerto ocupado.`
        : ajeno !== undefined
          ? `Alguien responde en ${PUERTO_SITIO}, pero con ${ajeno}: no es este sitio.`
          : 'Nadie respondió en el puerto.',
      `Comprueba quién lo ocupa con \`lsof -nP -iTCP:${PUERTO_SITIO} -sTCP:LISTEN\`.`,
    ].join(' '),
  );
});

test.afterAll(async () => {
  servidor?.kill();
  if (receptor) await new Promise<void>((r) => receptor.close(() => r()));
  if (proyecto) await limpiar(proyecto);
});

test.beforeEach(({ }, info) => {
  test.skip(info.project.name !== PERFIL, 'la baliza no depende del dispositivo');
  recibidos = [];
});

test.describe('Historia 7.3 — los cuatro eventos llegan', () => {
  test('la Página de Cita emite su vista', async ({ page }) => {
    await page.goto(`${SITIO}${RUTA_CITA}`);
    const registro = await esperarEvento(EVENTOS.vistaDeCita);
    expect(registro, 'no llegó la vista de cita').toBeTruthy();
    expect(registro!.ruta).toBe(RUTA_CITA);
  });

  test('copiar la Cita emite el copiado', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`${SITIO}${RUTA_CITA}`);
    await page.getByRole('button', { name: 'Copiar la cita' }).click();

    const registro = await esperarEvento(EVENTOS.copiado);
    expect(registro, 'no llegó el copiado').toBeTruthy();
    expect(registro!.ruta).toBe(RUTA_CITA);
  });

  test('descargar la imagen emite la descarga', async ({ page }) => {
    await page.goto(`${SITIO}${RUTA_CITA}`);
    await page.getByRole('button', { name: 'Descargar como imagen' }).click();
    await page.waitForFunction(() => {
      const l = document.querySelector('[data-lienzo]') as HTMLCanvasElement | null;
      return !!l && l.getContext('2d')!.getImageData(0, 0, 1, 1).data[3] === 255;
    });

    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar', exact: true }).click();
    await descarga;

    const registro = await esperarEvento(EVENTOS.descargaDeImagen);
    expect(registro, 'no llegó la descarga de imagen').toBeTruthy();
  });

  test('la búsqueda sin resultados emite la consulta que no encontró nada', async ({ page }) => {
    await page.goto(`${SITIO}${RUTA_BUSCAR}`);
    await page.locator('[data-consulta]').fill(SIN_RESULTADOS);
    await page.waitForFunction(
      () => !document.querySelector('[data-salida]')!.hasAttribute('hidden'),
    );
    // Desde la Historia 23.8 cuenta al asentarse, no al teclear: se envía.
    await page.locator('[data-consulta]').press('Enter');

    const registro = await esperarEvento(EVENTOS.busquedaSinResultados);
    expect(registro, 'no llegó la búsqueda sin resultados').toBeTruthy();
    expect(registro!.consulta).toBe(SIN_RESULTADOS);
    expect(registro!.ruta).toBe(RUTA_BUSCAR);
  });
});

test.describe('Historia 8.2 — la visita llega con su cuenta de origen', () => {
  test('una visita marcada se puede agrupar por red y por jornada', async ({ page }) => {
    await page.goto(`${SITIO}${RUTA_CITA}?de=tiktok`);
    const registro = await esperarEvento(EVENTOS.vistaDeCita);

    expect(registro, 'no llegó la vista marcada').toBeTruthy();
    expect(registro!.origen).toBe('tiktok');
    // Las dos claves de SM-8: de qué red y de qué jornada.
    expect(registro!.jornada).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Y la ruta llega sin la marca, así que agrupar por página no la parte en cinco.
    expect(registro!.ruta).toBe(RUTA_CITA);
  });

  test('una marca inventada no se registra, pero la visita sí se cuenta', async ({ page }) => {
    await page.goto(`${SITIO}${RUTA_CITA}?de=lo-que-sea-que-me-invente`);
    const registro = await esperarEvento(EVENTOS.vistaDeCita);

    expect(registro, 'se perdió la visita por una marca inválida').toBeTruthy();
    expect(registro!.origen).toBeNull();
  });
});

test.describe('Historia 10.4 — la compartición llega con su destino', () => {
  test('un destino elegido en el sitio llega con su nombre', async ({ page }) => {
    await page.goto(`${SITIO}${RUTA_CITA}`);
    // Se anula la navegación: lo que se comprueba es lo que llega al receptor.
    await page.route('**/t.me/**', (ruta) => ruta.abort());
    await page.locator('[data-destino="telegram"]').click();

    const registro = await esperarEvento(EVENTOS.comparticionDeEnlace);
    expect(registro, 'no llegó la compartición de enlace').toBeTruthy();
    expect(registro!.destino).toBe('telegram');
    expect(registro!.ruta).toBe(RUTA_CITA);
  });

  test('lo que llega no trae identificador de ninguna clase', async ({ page }) => {
    await page.goto(`${SITIO}${RUTA_CITA}`);
    await page.route('**/wa.me/**', (ruta) => ruta.abort());
    await page.locator('[data-destino="whatsapp"]').click();

    const registro = await esperarEvento(EVENTOS.comparticionDeEnlace);
    expect(registro).toBeTruthy();
    // Las columnas de `esquema.sql`, en su orden, desde la Historia 23.2: ninguna de visitante.
    expect(Object.keys(registro!)).toEqual(['jornada', 'evento', 'ruta', ...CAMPOS]);
    expect(await page.context().cookies()).toEqual([]);
  });
});

test.describe('Historia 7.3 — lo que llega no identifica a nadie', () => {
  test('ninguna baliza trae cookie ni nada que pueda convertirse en identificador', async ({ page }) => {
    const cargas: string[] = [];
    page.on('request', (peticion) => {
      if (peticion.url().includes(`:${PUERTO_RECEPTOR}`)) cargas.push(peticion.postData() ?? '');
    });

    await page.goto(`${SITIO}${RUTA_CITA}`);
    await esperarEvento(EVENTOS.vistaDeCita);

    expect(cargas.length).toBeGreaterThan(0);
    for (const carga of cargas) {
      const objeto = JSON.parse(carga);
      // Crece solo cuando una historia lo decide: `origen` lo añadió la 8.2 y `destino`
      // la 10.4. Desde la 23.2 cada evento lleva exactamente las claves que el vocabulario le
      // declara y el guion sabe producir —la vista, su Marca de origen—, y ninguna más.
      // Que el evento sea uno de los que el guion emite es lo que hace que esto no pase en vacío:
      // `camposQueEmite` de un evento que no emite está vacío.
      expect(EVENTOS_DEL_GUION).toContain(objeto.evento);
      expect(Object.keys(objeto).sort()).toEqual(
        ['evento', 'ruta', ...camposQueEmite(objeto.evento).map(claveEnLaBaliza)].sort(),
      );
      expect(carga).not.toMatch(/uuid|visitante|referrer|userAgent|screen|timeZone/i);
    }

    // Y el sitio no ha escrito ninguna cookie por el camino.
    expect(await page.context().cookies()).toEqual([]);
  });
});

test.describe('Historia 7.3 — el receptor caído no rompe el sitio', () => {
  test('la página funciona con normalidad y el evento se pierde en silencio', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const errores: string[] = [];
    page.on('pageerror', (e) => errores.push(e.message));

    // Se corta la baliza en seco, como si el punto final no existiera.
    await page.route(`**/*:${PUERTO_RECEPTOR}/**`, (ruta) => ruta.abort());
    await page.route('**/e', (ruta) => ruta.abort());

    await page.goto(`${SITIO}${RUTA_CITA}`);
    await expect(page.locator('blockquote .texto')).toBeVisible();

    // Copiar sigue funcionando aunque el evento no llegue a ninguna parte.
    await page.getByRole('button', { name: 'Copiar la cita' }).click();
    await expect(page.locator('[data-copiar]')).toHaveAttribute('data-estado', 'copiado');

    expect(errores, 'la medición rompió la página').toEqual([]);
  });
});

/*
 * Historia 23.1 — la medición sale a un fichero, y lo que se descarga es la lista cerrada de
 * `src/lib/guiones.ts`.
 *
 * Las cinco pruebas de «la página no descarga ningún fichero de script» —Página de Cita,
 * portada, Autor, 404 y datos estructurados— pasaron en su sitio a «solo los guiones externos
 * declarados» (`tests/e2e/ayuda/guiones.ts`), y siguen corriendo contra el `webServer`, con el
 * Corpus de verdad y en los dos perfiles. Desde la Historia 23.2 ese servidor se construye con el
 * punto final del receptor local, así que allí también se pide el fichero; aquí se juzgan
 * **además** contra un sitio construido por esta prueba, con su receptor en memoria, y con la
 * exigencia entera: exactamente el fichero de medición, una vez.
 */
const OBRA_NO_INDEXABLE = rutaDeObra('seneca', 'sobre-la-brevedad-de-la-vida');
/** Historia 23.9 — la Obra que se indexa: dos de las tres Citas del sitio. */
const OBRA_INDEXABLE = rutaDeObra('seneca', 'cartas-a-lucilio');

test.describe('Historia 23.1 — cada superficie descarga exactamente el guion de medición', () => {
  const SUPERFICIES: [string, string][] = [
    ['la Página de Cita', RUTA_CITA],
    ['la portada', '/'],
    ['la Página de Autor', rutaDeAutor('seneca')],
    ['la Obra que se indexa', OBRA_INDEXABLE],
    ['la Obra que no se indexa', OBRA_NO_INDEXABLE],
    ['la búsqueda', RUTA_BUSCAR],
    ['una ruta que no existe (404)', '/no-existe-esta-ruta/'],
  ];

  for (const [nombre, ruta] of SUPERFICIES) {
    test(`${nombre} descarga el guion de medición, una vez, y nada más`, async ({ page }) => {
      const pedidos = apuntarGuiones(page, SITIO);
      await page.goto(`${SITIO}${ruta}`, { waitUntil: 'networkidle' });
      // Sin otro guion: ni el `ld+json` de los datos estructurados, que no es ejecutable, ni
      // el generador de la Imagen ni Pagefind, que solo se piden al usarlos.
      expect(pedidos, `${ruta} pidió ${pedidos.join(', ')}`).toEqual([RUTA_DEL_FICHERO]);
    });
  }

  for (const ajena of ['/kit/', '/lote/']) {
    test(`\`${ajena}\` no descarga el guion de medición`, async ({ page }) => {
      const pedidos = apuntarGuiones(page, SITIO);
      await page.goto(`${SITIO}${ajena}`, { waitUntil: 'networkidle' });
      expect(pedidos).not.toContain(RUTA_DEL_FICHERO);
      // Lo que sí pide —el generador, para dibujar la Imagen sin pulsar— está en la lista.
      for (const pedido of pedidos) expect(entradaDeLoDescargado(pedido), pedido).toBeDefined();
    });
  }

  test('buscar pide Pagefind y el worker que arranca, y solo entradas de la lista', async ({ page }) => {
    /*
     * Revisión de la 23.1: la primera versión enfocaba el campo y afirmaba en cuanto llegaba
     * `pagefind.js`, antes de que Pagefind arrancara su worker —un guion de 41 KB fuera de la
     * lista— unos instantes después. Se busca de verdad y se espera al worker y al recuento.
     */
    const pedidos = apuntarGuiones(page, SITIO);
    await page.goto(`${SITIO}${RUTA_BUSCAR}`, { waitUntil: 'networkidle' });
    const worker = page.waitForRequest((p) => new URL(p.url()).pathname === '/pagefind/pagefind-worker.js');
    await page.locator('[data-consulta]').fill('tiempo');
    await worker;
    await expect(page.locator('[data-estado]')).toHaveText(/resultado/);
    expect(pedidos).toContain('/pagefind/pagefind.js');
    expect(pedidos).toContain('/pagefind/pagefind-worker.js');
    for (const pedido of pedidos) expect(entradaDeLoDescargado(pedido), pedido).toBeDefined();
  });

  test('abrir la Imagen pide el generador, y solo entradas de la lista', async ({ page }) => {
    const pedidos = apuntarGuiones(page, SITIO);
    await page.goto(`${SITIO}${RUTA_CITA}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Descargar como imagen' }).click();
    await page.waitForFunction(() => {
      const l = document.querySelector('[data-lienzo]') as HTMLCanvasElement | null;
      return !!l && l.getContext('2d')!.getImageData(0, 0, 1, 1).data[3] === 255;
    });
    expect(pedidos).toContain('/islas/imagen.js');
    for (const pedido of pedidos) expect(entradaDeLoDescargado(pedido), pedido).toBeDefined();
  });
});

test.describe('Historia 23.1 — las vistas que llegan son las que declara cada superficie', () => {
  /*
   * Revisión de la 23.1 (segunda pasada): en un navegador solo se veía llegar `vista-de-cita`. La
   * vista de superficie y su ausencia en lo que es `servicio` salían de `data-vistas`, pero nada
   * miraba que el fichero las emitiera de verdad desde ahí.
   */
  const llegadas = (nombre: string) => recibidos.filter((r) => r?.evento === nombre);

  for (const [nombre, ruta] of [
    ['la portada', '/'],
    ['la página 1 de Autor', rutaDeAutor('seneca')],
    // Historia 23.9 — y la Obra que se indexa, que emite además la de Obra (abajo, en la 23.9).
    ['la página 1 de la Obra que se indexa', OBRA_INDEXABLE],
  ] as const) {
    test(`${nombre} emite una vista de superficie, con su ruta, y ninguna de Cita`, async ({ page }) => {
      await page.goto(`${SITIO}${ruta}`, { waitUntil: 'networkidle' });
      await esperarAlFichero(page);
      const registro = await esperarEvento(EVENTOS.vistaDeSuperficie);
      expect(registro, `no llegó la vista de ${ruta}`).toBeTruthy();
      expect(registro!.ruta).toBe(ruta);
      await page.waitForTimeout(500);
      expect(llegadas(EVENTOS.vistaDeSuperficie)).toHaveLength(1);
      expect(llegadas(EVENTOS.vistaDeCita)).toEqual([]);
    });
  }

  // La Obra que no se indexa salió de esta lista con la Historia 23.9: emite su vista de Obra.
  for (const [nombre, ruta] of [
    ['la búsqueda', RUTA_BUSCAR],
    ['el 404', '/no-existe-esta-ruta/'],
  ] as const) {
    test(`${nombre} carga el fichero y no emite ninguna vista`, async ({ page }) => {
      await page.goto(`${SITIO}${ruta}`, { waitUntil: 'networkidle' });
      await esperarAlFichero(page);
      await page.waitForTimeout(500);
      expect(recibidos.filter((r) => r?.evento.startsWith('vista-')), ruta).toEqual([]);
    });
  }
});

test.describe('Historia 23.1 — la cola del arranque y la espera al prerender', () => {
  /** Cuántas veces ha llegado un evento al receptor. */
  const llegadas = (nombre: string) => recibidos.filter((r) => r?.evento === nombre).length;

  test('lo que se hace antes de que llegue el fichero sale después de la vista, en orden y una vez', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    // La página apunta el orden en que salen sus balizas: el receptor las recibe por dos
    // conexiones y no garantiza ese orden.
    await apuntarBalizas(page);

    // El fichero se retiene hasta después de copiar: la isla llama `__medir` con la cola sola.
    let soltar!: () => void;
    const retenido = new Promise<void>((listo) => (soltar = listo));
    await page.route('**/medicion/*.js', async (ruta) => {
      await retenido;
      await ruta.continue();
    });

    // `load` y `DOMContentLoaded` esperan al guion diferido, que está retenido: se espera a que
    // el cuerpo entero esté analizado, y con él el guion de la isla de copiar.
    await page.goto(`${SITIO}${RUTA_CITA}`, { waitUntil: 'commit' });
    await page.locator('footer').waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Copiar la cita' }).click();
    await expect(page.locator('[data-copiar]')).toHaveAttribute('data-estado', 'copiado');
    expect(await balizasDe(page)).toEqual([]);

    soltar();
    const copiado = await esperarEvento(EVENTOS.copiado);
    expect(copiado, 'no llegó el copiado encolado').toBeTruthy();
    expect(await esperarEvento(EVENTOS.vistaDeCita), 'no llegó la vista').toBeTruthy();
    expect(await esperarEvento(EVENTOS.lectura), 'no llegó la lectura').toBeTruthy();
    await page.waitForTimeout(500);

    // Historia 23.5: el clic se hizo antes de que el fichero escuchara, así que la lectura sale
    // del propio copiado, delante de él, y el copiado es el primero de su métrica.
    expect((await balizasDe(page)).map((b) => b.evento)).toEqual([
      EVENTOS.vistaDeCita,
      EVENTOS.lectura,
      EVENTOS.copiado,
    ]);
    expect(copiado!.primera).toBe('si');
    expect(llegadas(EVENTOS.vistaDeCita)).toBe(1);
    expect(llegadas(EVENTOS.lectura)).toBe(1);
    expect(llegadas(EVENTOS.copiado)).toBe(1);
  });

  test('una página prerenderizada no emite su vista hasta activarse, y entonces una', async ({ page }) => {
    /*
     * Cada baliza apunta si salió con la página todavía prerenderizándose. Así lo que se afirma
     * no depende de cuánto tarde el prerender: la primera versión leía las llegadas tras una
     * espera fija, y una vista emitida durante un prerender más lento que la espera pasaba.
     */
    await page.addInitScript(() => {
      const ventana = window as unknown as { __balizas: { evento: string; prerenderizando: boolean }[] };
      ventana.__balizas = [];
      const original = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = (url: string | URL, datos?: BodyInit | null) => {
        ventana.__balizas.push({
          evento: JSON.parse(String(datos)).evento,
          prerenderizando: (document as Document & { prerendering?: boolean }).prerendering === true,
        });
        return original(url, datos);
      };
    });
    await page.goto(`${SITIO}/`, { waitUntil: 'networkidle' });
    expect(await esperarEvento(EVENTOS.vistaDeSuperficie), 'no llegó la vista de la portada').toBeTruthy();

    // Reglas de especulación hacia la Página de Cita, y un enlace para activarla.
    await page.evaluate((destino) => {
      const reglas = document.createElement('script');
      reglas.type = 'speculationrules';
      reglas.textContent = JSON.stringify({ prerender: [{ source: 'list', urls: [destino] }] });
      document.head.append(reglas);
      const enlace = document.createElement('a');
      enlace.href = destino;
      enlace.id = 'ir-a-la-prerenderizada';
      enlace.textContent = 'Ir';
      document.body.prepend(enlace);
    }, RUTA_CITA);
    // Tiempo para que el navegador prerenderice; lo que se afirma después no depende de él.
    await page.waitForTimeout(2000);

    await page.locator('#ir-a-la-prerenderizada').click();
    await page.waitForURL(`**${RUTA_CITA}`);
    const activacion = await page.evaluate(
      () =>
        (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming & {
          activationStart?: number;
        }).activationStart ?? 0,
    );
    /*
     * Chromium no prerenderiza una página con DevTools conectado, y Playwright lo conecta
     * siempre: el estado del intento es `PrerenderingDisabledByDevTools` (comprobado con
     * `Preload.prerenderStatusUpdated` el 2026-10-24, con Chromium de cabeza y sin ella). Hasta
     * que eso cambie, esto lo cubre el entorno simulado de `tests/unit/medicion.test.ts`, y lo
     * confirmó a mano el 2026-10-24 un Chrome 155 sin DevTools (`--headless=new`, sin
     * `--remote-debugging-*`) contra este mismo corpus: la Cita se prerenderizó
     * (`Sec-Purpose: prefetch;prerender`, también el fichero de medición), no salió ninguna baliza
     * en los 4 s de prerender y salió una sola `vista-de-cita` al activarse; con el fichero sin la
     * espera, la vista salía durante el prerender. El parte está en el spec de la 23.1.
     */
    test.skip(activacion <= 0, 'Chromium no prerenderiza con DevTools conectado (PrerenderingDisabledByDevTools)');

    expect(await esperarEvento(EVENTOS.vistaDeCita), 'no llegó la vista al activarse').toBeTruthy();
    await page.waitForTimeout(500);
    const balizas = await page.evaluate(
      () => (window as unknown as { __balizas?: { evento: string; prerenderizando: boolean }[] }).__balizas ?? [],
    );
    expect(balizas.filter((b) => b.prerenderizando), 'salió una baliza antes de verse la página').toEqual([]);
    expect(balizas.filter((b) => b.evento === EVENTOS.vistaDeCita)).toHaveLength(1);
    expect(llegadas(EVENTOS.vistaDeCita)).toBe(1);
  });
});

test.describe('Historia 23.1 — el guion de copiar no lleva el slug', () => {
  test('en el Kit, el segundo botón copia lo suyo y el primero no se entera', async ({ page, context }) => {
    /*
     * Hasta la 23.1 cada copia de `CopiarCita` buscaba su botón por el slug, que llevaba en el
     * guion. Ahora el guion es idéntico en las dos y cada una se encuentra por
     * `document.currentScript`: si las dos dieran con el mismo botón, el segundo quedaría
     * muerto y el primero escucharía dos veces.
     */
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`${SITIO}/kit/`);

    const botones = page.locator('[data-copiar]');
    await expect(botones).toHaveCount(2);
    const [primero, segundo] = [botones.nth(0), botones.nth(1)];
    const carga = await segundo.getAttribute('data-carga');
    expect(carga).toMatch(/^«.+» — .+\.$/);
    expect(carga).not.toBe(await primero.getAttribute('data-carga'));

    await segundo.click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(carga);
    await expect(segundo.locator('[data-etiqueta]')).toHaveText('Copiado.');
    await expect(segundo).toHaveAttribute('data-estado', 'copiado');
    await expect(primero.locator('[data-etiqueta]')).toHaveText('Copiar la cita');
    await expect(primero).not.toHaveAttribute('data-estado', /.*/);

    // Y el primero también vive.
    await primero.click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      await primero.getAttribute('data-carga'),
    );
    await expect(primero.locator('[data-etiqueta]')).toHaveText('Copiado.');
  });
});

/*
 * Historia 23.5 — una carga que se lee deja una lectura, en un navegador de verdad y contra el
 * receptor de la prueba. La lógica entera —cada fila de su matriz— la recorre el entorno simulado
 * de `tests/unit/medicion.test.ts`; aquí se mira que el fichero servido la cumple con el reloj, la
 * visibilidad, los eventos y la caché de un Chromium.
 *
 * El reloj de la página se finge con `page.clock` y se **pausa antes de navegar**: así ningún
 * tiempo de carga cuenta por su cuenta y lo que se afirma a 7,9 s y a 8 s no depende de lo que
 * tarde el sitio. Las esperas de las pruebas son del reloj de la prueba (`esperar`).
 */
test.describe('Historia 23.5 — una carga que se lee deja una lectura', () => {
  const llegadas = (nombre: string) => recibidos.filter((r) => r?.evento === nombre);
  const INICIO = new Date('2026-10-25T10:00:00Z');

  /** Instala el reloj fingido y lo para: el tiempo de la página solo corre con `runFor`. */
  async function relojParado(page: Page) {
    await page.clock.install({ time: INICIO });
    await page.clock.pauseAt(new Date(INICIO.getTime() + 1_000));
  }

  test('una Página de Cita visible 8 s deja una lectura, detrás de la vista, y ninguna más', async ({ page }) => {
    await relojParado(page);
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_CITA}?de=instagram`);
    await esperarAlFichero(page);
    expect(await esperarEvento(EVENTOS.vistaDeCita), 'no llegó la vista').toBeTruthy();

    await page.clock.runFor(MIN_MS_VISIBLES_PARA_LA_LECTURA - 100);
    await esperar(500);
    // Lo que sale se apunta al llamar a `sendBeacon`: una ausencia no depende de lo que tarde en
    // llegar al receptor.
    expect((await balizasDe(page)).map((b) => b.evento), 'salió una lectura antes de los 8 s').toEqual([
      EVENTOS.vistaDeCita,
    ]);
    expect(llegadas(EVENTOS.lectura), 'llegó una lectura antes de los 8 s').toEqual([]);

    await page.clock.runFor(100);
    const lectura = await esperarEvento(EVENTOS.lectura);
    expect(lectura, 'no llegó la lectura a los 8 s').toBeTruthy();
    expect(lectura).toMatchObject({ evento: EVENTOS.lectura, ruta: RUTA_CITA, origen: 'instagram' });

    await page.clock.runFor(20_000);
    await esperar(500);
    expect(llegadas(EVENTOS.lectura)).toHaveLength(1);
    expect((await balizasDe(page)).map((b) => b.evento)).toEqual([EVENTOS.vistaDeCita, EVENTOS.lectura]);
    // Exactamente la ruta y las dos Marcas de llegada (`via`, desde la 23.6), y nada más.
    expect(Object.keys((await balizasDe(page))[1]).sort()).toEqual(['evento', 'origen', 'ruta', 'via']);
  });

  test('un `pointerdown` antes de los 8 s emite la lectura en el momento, y nada emite otra', async ({ page }) => {
    await relojParado(page);
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_CITA}`);
    await esperarAlFichero(page);
    expect(await esperarEvento(EVENTOS.vistaDeCita), 'no llegó la vista').toBeTruthy();
    await page.clock.runFor(1_000);

    // Sobre el texto de la Cita, donde pulsar no hace nada más.
    const caja = (await page.locator('blockquote .texto').boundingBox())!;
    await page.mouse.move(caja.x + 5, caja.y + 5);
    await page.mouse.down();
    await page.mouse.up();
    const lectura = await esperarEvento(EVENTOS.lectura);
    expect(lectura, 'el pointerdown no emitió la lectura').toBeTruthy();
    expect(lectura).toMatchObject({ ruta: RUTA_CITA, origen: null });

    await page.keyboard.press('Shift');
    await page.mouse.wheel(0, 200);
    await page.clock.runFor(20_000);
    await esperar(500);
    expect(llegadas(EVENTOS.lectura)).toHaveLength(1);
    expect((await balizasDe(page)).map((b) => b.evento)).toEqual([EVENTOS.vistaDeCita, EVENTOS.lectura]);
  });

  test('una tecla antes de los 8 s también la emite, una sola vez', async ({ page }) => {
    await relojParado(page);
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_CITA}`);
    await esperarAlFichero(page);
    expect(await esperarEvento(EVENTOS.vistaDeCita), 'no llegó la vista').toBeTruthy();
    await page.clock.runFor(2_000);
    expect((await balizasDe(page)).map((b) => b.evento), 'salió una lectura antes de la tecla').toEqual([
      EVENTOS.vistaDeCita,
    ]);

    await page.keyboard.press('Shift');
    expect(await esperarEvento(EVENTOS.lectura), 'la tecla no emitió la lectura').toBeTruthy();
    await page.keyboard.press('Shift');
    await page.clock.runFor(20_000);
    await esperar(500);
    expect(llegadas(EVENTOS.lectura)).toHaveLength(1);
    expect((await balizasDe(page)).map((b) => b.evento)).toEqual([EVENTOS.vistaDeCita, EVENTOS.lectura]);
  });

  test('`/buscar/` no emite lectura, ni con interacción ni con el tiempo', async ({ page }) => {
    await relojParado(page);
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_BUSCAR}`);
    await esperarAlFichero(page);

    const caja = (await page.locator('h1').first().boundingBox())!;
    await page.mouse.move(caja.x + 5, caja.y + 5);
    await page.mouse.down();
    await page.mouse.up();
    await page.keyboard.press('Shift');
    await page.clock.runFor(20_000);
    await esperar(500);
    expect(llegadas(EVENTOS.lectura)).toEqual([]);
    expect(await balizasDe(page)).toEqual([]);
  });

  test('copiar con `element.click()`, sin `pointerdown` ni `keydown`: la lectura sale antes del copiado, que es «si»', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await relojParado(page);
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_CITA}`);
    await esperarAlFichero(page);
    expect(await esperarEvento(EVENTOS.vistaDeCita), 'no llegó la vista').toBeTruthy();

    // `click()` del elemento despacha el clic a secas: ningún `pointerdown` ni `keydown` antes.
    await page.locator('[data-copiar]').evaluate((boton) => (boton as HTMLButtonElement).click());
    await expect(page.locator('[data-copiar]')).toHaveAttribute('data-estado', 'copiado');
    const copiado = await esperarEvento(EVENTOS.copiado);
    expect(copiado, 'no llegó el copiado').toBeTruthy();
    expect(await esperarEvento(EVENTOS.lectura), 'no llegó la lectura').toBeTruthy();

    expect((await balizasDe(page)).map((b) => [b.evento, b.primera])).toEqual([
      [EVENTOS.vistaDeCita, undefined],
      [EVENTOS.lectura, undefined],
      [EVENTOS.copiado, 'si'],
    ]);
    expect(copiado!.primera).toBe('si');
  });

  test('`primera` por métrica: copiar dos veces da «si» y «no»; compartir el enlace dos veces, también', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    // El enlace abre otra pestaña: se anula ahí, en todo el contexto, sin salir a la red.
    await context.route('**/t.me/**', (ruta) => ruta.abort());
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_CITA}`);
    await esperarAlFichero(page);

    const copiar = page.getByRole('button', { name: 'Copiar la cita' });
    await copiar.click();
    await expect(page.locator('[data-copiar]')).toHaveAttribute('data-estado', 'copiado');
    await copiar.click();
    await expect.poll(async () => (await balizasDe(page)).filter((b) => b.evento === EVENTOS.copiado).length).toBe(2);

    const telegram = page.locator('[data-destino="telegram"]');
    await telegram.click();
    await telegram.click();
    await expect
      .poll(async () => (await balizasDe(page)).filter((b) => b.evento === EVENTOS.comparticionDeEnlace).length)
      .toBe(2);

    const acciones = (await balizasDe(page)).filter((b) => b.evento !== EVENTOS.vistaDeCita && b.evento !== EVENTOS.lectura);
    expect(acciones.map((b) => [b.evento, b.primera])).toEqual([
      [EVENTOS.copiado, 'si'],
      [EVENTOS.copiado, 'no'],
      [EVENTOS.comparticionDeEnlace, 'si'],
      [EVENTOS.comparticionDeEnlace, 'no'],
    ]);
    // Y al receptor llegan con su `primera`, tal como la interpreta (`interpretar`). Las balizas
    // llegan por varias conexiones y sin orden: cada recuento se espera por su cuenta.
    await expect.poll(() => llegadas(EVENTOS.comparticionDeEnlace).length).toBe(2);
    await expect.poll(() => llegadas(EVENTOS.copiado).length).toBe(2);
    await expect.poll(() => llegadas(EVENTOS.lectura).length).toBe(1);
    expect(llegadas(EVENTOS.copiado).map((r) => r!.primera).sort()).toEqual(['no', 'si']);
    expect(llegadas(EVENTOS.comparticionDeEnlace).map((r) => r!.primera).sort()).toEqual(['no', 'si']);
    await esperar(300);
    expect(llegadas(EVENTOS.lectura)).toHaveLength(1);
  });

  test('un `pageshow` con `persisted` es una carga nueva: sin vista, con otra lectura sin marca y `primera` otra vez «si»', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await relojParado(page);
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_CITA}?de=instagram`);
    await esperarAlFichero(page);
    await page.getByRole('button', { name: 'Copiar la cita' }).click();
    await expect.poll(async () => (await balizasDe(page)).length).toBe(3);

    // Sin `persisted`, nada.
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false })));
    await page.clock.runFor(MIN_MS_VISIBLES_PARA_LA_LECTURA);
    await esperar(300);
    expect(await balizasDe(page)).toHaveLength(3);

    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await page.clock.runFor(MIN_MS_VISIBLES_PARA_LA_LECTURA);
    await page.locator('[data-copiar]').evaluate((boton) => (boton as HTMLButtonElement).click());
    await expect.poll(async () => (await balizasDe(page)).length).toBe(5);

    expect((await balizasDe(page)).map((b) => [b.evento, b.origen ?? null, b.primera ?? null])).toEqual([
      [EVENTOS.vistaDeCita, 'instagram', null],
      [EVENTOS.lectura, 'instagram', null],
      [EVENTOS.copiado, null, 'si'],
      [EVENTOS.lectura, null, null],
      [EVENTOS.copiado, null, 'si'],
    ]);
    await expect.poll(() => llegadas(EVENTOS.lectura).length).toBe(2);
    expect(llegadas(EVENTOS.vistaDeCita)).toHaveLength(1);
  });

  test('volver por la caché de atrás y adelante de verdad: ninguna vista nueva y otra lectura, sin marca', async ({
    playwright,
  }) => {
    /*
     * Playwright lanza Chromium con `--disable-back-forward-cache`; aquí se lanza uno propio sin
     * ese argumento, y el sitio de esta prueba se sirve `max-age=600`, como el alojamiento: con
     * `no-store` la página no entraría en esa caché. Y con el Chromium completo en su modo sin
     * cabeza nuevo (`channel: 'chromium'`): el `chromium-headless-shell` de por omisión no
     * restaura nunca —su delegado la desactiva, `BackForwardCacheDisabledForDelegate`, comprobado
     * con `Page.backForwardCacheNotUsed` el 2026-10-25 con Chromium 151—. Una página restaurada no
     * dispara `load`, así que volver atrás espera solo a `commit`.
     */
    let navegador: Awaited<ReturnType<typeof playwright.chromium.launch>>;
    try {
      navegador = await playwright.chromium.launch({
        channel: 'chromium',
        ignoreDefaultArgs: ['--disable-back-forward-cache'],
      });
    } catch (error) {
      test.skip(true, `no se pudo lanzar el Chromium completo sin cabeza: ${String(error).split('\n')[0]}`);
      return;
    }
    try {
      const contexto = await navegador.newContext();
      const pagina = await contexto.newPage();
      const cdp = await contexto.newCDPSession(pagina);
      await cdp.send('Page.enable');
      const sinCache: string[] = [];
      cdp.on('Page.backForwardCacheNotUsed', (evento) => {
        for (const explicacion of evento.notRestoredExplanations) sinCache.push(explicacion.reason);
      });
      await apuntarBalizas(pagina);
      await pagina.addInitScript(() => {
        const ventana = window as unknown as { __restaurada: boolean };
        ventana.__restaurada = false;
        addEventListener('pageshow', (evento) => {
          if ((evento as PageTransitionEvent).persisted) ventana.__restaurada = true;
        });
      });

      // Historia 23.6: con las dos Marcas de llegada, que la barra pierde al llegar.
      await pagina.goto(`${SITIO}${RUTA_CITA}?de=instagram&via=whatsapp`);
      await esperarAlFichero(pagina);
      await pagina.keyboard.press('Shift');
      await expect.poll(() => llegadas(EVENTOS.lectura).length).toBe(1);
      expect(llegadas(EVENTOS.lectura)[0]).toMatchObject({ ruta: RUTA_CITA, origen: 'instagram', via: 'whatsapp' });
      expect(new URL(pagina.url()).search).toBe('');

      await pagina.goto(`${SITIO}${rutaDeAutor('seneca')}`);
      await esperarAlFichero(pagina);
      await pagina.goBack({ waitUntil: 'commit' });
      // La entrada del historial es la que dejó `replaceState`: sin marcas.
      expect(new URL(pagina.url()).pathname).toBe(RUTA_CITA);
      expect(new URL(pagina.url()).search).toBe('');

      const restaurada = async () =>
        pagina.evaluate(() => (window as unknown as { __restaurada?: boolean }).__restaurada === true).catch(() => false);
      const hasta = Date.now() + 3_000;
      while (!(await restaurada()) && Date.now() < hasta) await esperar(100);
      test.skip(
        !(await restaurada()),
        `Chromium no restauró la página de la caché de atrás y adelante: ${sinCache.join(', ') || 'sin motivo'}`,
      );

      const deLaCita = (nombre: string) => llegadas(nombre).filter((r) => r!.ruta === RUTA_CITA);
      await pagina.keyboard.press('Shift');
      await expect.poll(() => deLaCita(EVENTOS.lectura).length).toBe(2);
      await esperar(500);
      expect(deLaCita(EVENTOS.vistaDeCita), 'volver por la caché emitió otra vista').toHaveLength(1);
      expect(deLaCita(EVENTOS.lectura).map((r) => [r!.origen, r!.via])).toEqual([
        ['instagram', 'whatsapp'],
        [null, null],
      ]);
      // La vista de la Página de Autor sí llegó: fue una carga de verdad.
      expect(llegadas(EVENTOS.vistaDeSuperficie)).toHaveLength(1);
    } finally {
      await navegador.close();
    }
  });
});

/*
 * Historia 23.6 — las Marcas de llegada cuentan una vez y salen de la dirección, en un navegador de
 * verdad: la barra, el historial, la canónica y lo que llega al receptor. Cada fila de guion de su
 * matriz la recorre el entorno simulado de `tests/unit/medicion.test.ts`.
 */
test.describe('Historia 23.6 — las marcas de llegada cuentan una vez y salen de la dirección', () => {
  const llegadas = (nombre: string) => recibidos.filter((r) => r?.evento === nombre);
  /** La canónica y el `og:url` de un HTML servido. */
  const direccionesDe = (html: string) => ({
    canonica: /<link\b[^>]*\brel="canonical"[^>]*\bhref="([^"]*)"/.exec(html)?.[1],
    ogUrl: /<meta\b[^>]*\bproperty="og:url"[^>]*\bcontent="([^"]*)"/.exec(html)?.[1],
  });

  test('llegar con `?de=` y `?via=`: la barra las pierde sin recargar, la vista y la lectura las llevan, y recargar no las cuenta otra vez', async ({
    page,
  }) => {
    const documentos: string[] = [];
    page.on('request', (peticion) => {
      if (peticion.resourceType() === 'document') documentos.push(peticion.url());
    });
    // Un `history.state` previo, puesto antes de que corra ningún guion de la página.
    await page.addInitScript(() => history.replaceState({ previo: 'de antes' }, ''));
    await apuntarBalizas(page);

    await page.goto(`${SITIO}${RUTA_CITA}?x=1&de=instagram&via=whatsapp#cita`);
    await esperarAlFichero(page);
    await expect.poll(() => page.url()).toBe(`${SITIO}${RUTA_CITA}?x=1#cita`);
    expect(documentos, 'quitar las marcas no recarga').toHaveLength(1);
    expect(await page.evaluate(() => history.state)).toEqual({ previo: 'de antes' });

    // La canónica y el `og:url`, los de la página sin marcas, y sin consulta.
    const limpias = direccionesDe(await (await fetch(`${SITIO}${RUTA_CITA}`)).text());
    expect(limpias.canonica).toBeTruthy();
    expect(limpias.ogUrl).toBeTruthy();
    expect(`${limpias.canonica}${limpias.ogUrl}`).not.toContain('?');
    expect(direccionesDe(await page.content())).toEqual(limpias);

    const vista = await esperarEvento(EVENTOS.vistaDeCita);
    expect(vista, 'no llegó la vista').toBeTruthy();
    expect(vista).toMatchObject({ ruta: RUTA_CITA, origen: 'instagram', via: 'whatsapp' });
    await page.keyboard.press('Shift');
    const lectura = await esperarEvento(EVENTOS.lectura);
    expect(lectura, 'no llegó la lectura').toBeTruthy();
    expect(lectura).toMatchObject({ ruta: RUTA_CITA, origen: 'instagram', via: 'whatsapp' });
    expect((await balizasDe(page)).map((b) => [b.evento, b.origen, b.via])).toEqual([
      [EVENTOS.vistaDeCita, 'instagram', 'whatsapp'],
      [EVENTOS.lectura, 'instagram', 'whatsapp'],
    ]);

    // Recargar es otra carga, con la dirección que quedó: su vista ya no lleva marcas.
    await page.reload();
    await esperarAlFichero(page);
    await expect.poll(() => llegadas(EVENTOS.vistaDeCita).length).toBe(2);
    expect(llegadas(EVENTOS.vistaDeCita).map((r) => [r!.origen, r!.via])).toEqual(
      expect.arrayContaining([
        ['instagram', 'whatsapp'],
        [null, null],
      ]),
    );
    expect((await balizasDe(page)).map((b) => [b.evento, b.origen, b.via])).toEqual([[EVENTOS.vistaDeCita, null, null]]);
    expect(page.url()).toBe(`${SITIO}${RUTA_CITA}?x=1#cita`);
    expect(documentos).toHaveLength(2);
  });

  test('`/buscar/?q=…&de=instagram` queda en `/buscar/?q=…`, la búsqueda inicial corre y ningún evento lleva marca', async ({
    page,
  }) => {
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_BUSCAR}?q=${SIN_RESULTADOS}&de=instagram`);
    await esperarAlFichero(page);
    await expect.poll(() => page.url()).toBe(`${SITIO}${RUTA_BUSCAR}?q=${SIN_RESULTADOS}`);
    await expect(page.locator('[data-consulta]')).toHaveValue(SIN_RESULTADOS);
    // La búsqueda inicial corrió: se ve la salida sin resultados. Llegar no la asienta (Historia 23.8).
    await expect(page.locator('[data-salida]')).toBeVisible();
    await esperar(300);
    expect(await balizasDe(page)).toEqual([]);

    // Se asienta enviándola: con la dirección ya sin marcas, que no cambia al marcar la entrada.
    await page.locator('[data-consulta]').press('Enter');
    const registro = await esperarEvento(EVENTOS.busquedaSinResultados);
    expect(registro, 'la búsqueda no se asentó').toBeTruthy();
    expect(registro).toMatchObject({ ruta: RUTA_BUSCAR, consulta: SIN_RESULTADOS, origen: null, via: null });
    expect(page.url()).toBe(`${SITIO}${RUTA_BUSCAR}?q=${SIN_RESULTADOS}`);
    const balizas = await balizasDe(page);
    expect(balizas.map((b) => b.evento)).toEqual([EVENTOS.busqueda, EVENTOS.busquedaSinResultados]);
    for (const baliza of balizas) {
      expect(baliza).not.toHaveProperty('origen');
      expect(baliza).not.toHaveProperty('via');
    }
  });
});

/*
 * Historias 23.7 y 23.8 — dos ayudas de las pruebas de un navegador de verdad, a nivel de fichero porque
 * las usan las dos: quedarse en una página cuyos enlaces se pulsan, y la caché de atrás y adelante.
 */

/**
 * Anula toda navegación del documento que salga de `ruta`, también la de una pestaña nueva: con
 * un 204 el navegador se queda donde está, así que la carga sigue y lo que salió por
 * `sendBeacon` se puede leer. Lo demás —el fichero, Pagefind— pasa sin tocar.
 */
async function quedarseEn(contexto: BrowserContext, ruta: string) {
  await contexto.route(`${SITIO}/**`, (peticion) => {
    const pedida = peticion.request();
    if (pedida.isNavigationRequest() && new URL(pedida.url()).pathname !== ruta) {
      return peticion.fulfill({ status: 204 });
    }
    return peticion.fallback();
  });
}

/**
 * Con la caché de atrás y adelante de verdad, como la prueba de la 23.5: un Chromium completo,
 * lanzado sin `--disable-back-forward-cache`, y el sitio servido `max-age=600`. Si no restaura,
 * se salta diciendo por qué.
 */
async function conLaCacheDeVerdad(
  playwright: PlaywrightWorkerArgs['playwright'],
  recorrido: (pagina: Page, restaurada: () => Promise<void>) => Promise<void>,
) {
  let navegador: Awaited<ReturnType<typeof playwright.chromium.launch>>;
  try {
    navegador = await playwright.chromium.launch({
      channel: 'chromium',
      ignoreDefaultArgs: ['--disable-back-forward-cache'],
    });
  } catch (error) {
    test.skip(true, `no se pudo lanzar el Chromium completo sin cabeza: ${String(error).split('\n')[0]}`);
    return;
  }
  try {
    const contexto = await navegador.newContext();
    const pagina = await contexto.newPage();
    const cdp = await contexto.newCDPSession(pagina);
    await cdp.send('Page.enable');
    const sinCache: string[] = [];
    cdp.on('Page.backForwardCacheNotUsed', (evento) => {
      for (const explicacion of evento.notRestoredExplanations) sinCache.push(explicacion.reason);
    });
    await apuntarBalizas(pagina);
    await pagina.addInitScript(() => {
      const ventana = window as unknown as { __restaurada: boolean };
      ventana.__restaurada = false;
      addEventListener('pageshow', (evento) => {
        if ((evento as PageTransitionEvent).persisted) ventana.__restaurada = true;
      });
    });
    /** Vuelve atrás y espera a la restauración; si no la hubo, salta la prueba. */
    const restaurada = async () => {
      await pagina.goBack({ waitUntil: 'commit' });
      const lo = async () =>
        pagina.evaluate(() => (window as unknown as { __restaurada?: boolean }).__restaurada === true).catch(() => false);
      const hasta = Date.now() + 3_000;
      while (!(await lo()) && Date.now() < hasta) await esperar(100);
      test.skip(
        !(await lo()),
        `Chromium no restauró la página de la caché de atrás y adelante: ${sinCache.join(', ') || 'sin motivo'}`,
      );
      // Desde aquí, salir ya no navega: la página restaurada se queda y sus balizas se leen.
      await quedarseEn(contexto, new URL(pagina.url()).pathname);
    };
    await recorrido(pagina, restaurada);
  } finally {
    await navegador.close();
  }
}

/*
 * Historia 23.7 — la Salida interna en un navegador de verdad: los gestos que no son salida, la
 * zona que llega desde el contenedor que pinta el build, la que heredan los resultados que mete la
 * isla de `/buscar/`, y la carga nueva de la caché de atrás y adelante. Cada fila de guion de su
 * matriz la recorre el entorno simulado de `tests/unit/medicion.test.ts`.
 */
test.describe('Historia 23.7 — cada salida interna dice desde qué zona', () => {
  const llegadas = (nombre: string) => recibidos.filter((r) => r?.evento === nombre);
  const salidas = () => llegadas(EVENTOS.salidaInterna);
  /**
   * Las tarjetas de «Más de {Autor}» en las Rutas de salida (Historia 24.6). Las pruebas usan la
   * primera y la última, así que la Cita que se lee necesita al menos dos (en este sitio, las dos
   * Cartas de Séneca).
   */
  const MAS_DEL_AUTOR = 'nav[aria-label="Seguir leyendo"] .mas-del-autor li.tarjeta a';
  const RESULTADOS = '[data-resultados] .resultado a';
  /** Una consulta que encuentra algo en este sitio: la Cita del viento favorable. */
  const CON_RESULTADOS = 'viento';

  /**
   * Apunta en la página cada `click` que llega a la ventana, con su botón y sus modificadores, y el
   * `href` de su enlace. Se pone después del fichero, así que lo que ve esta escucha lo vio antes la
   * del fichero: un gesto que no llega como `click` —el botón central, o Control en macOS— no
   * prueba su filtro, y la lista lo deja a la vista.
   */
  async function apuntarClics(page: Page) {
    await page.evaluate(() => {
      const ventana = window as unknown as { __clics: Record<string, unknown>[] };
      ventana.__clics = [];
      addEventListener('click', (evento) => {
        const enlace = (evento.target as Element | null)?.closest?.('a[href]');
        ventana.__clics.push({
          button: evento.button,
          ctrlKey: evento.ctrlKey,
          metaKey: evento.metaKey,
          shiftKey: evento.shiftKey,
          altKey: evento.altKey,
          href: enlace?.getAttribute('href') ?? null,
        });
      });
    });
  }
  const clicsDe = (page: Page) =>
    page.evaluate(() => (window as unknown as { __clics: Record<string, unknown>[] }).__clics);

  test('en la Cita, dentro de una zona, ni un modificador, ni el botón central, ni un ancla, ni la propia ruta salen; el primer clic de ratón sí, y solo ese', async ({
    page,
    context,
  }) => {
    await quedarseEn(context, RUTA_CITA);
    // La propia ruta con otra búsqueda también pide al servidor: se anula igual, para seguir en la carga.
    await page.route(
      (url) => url.pathname === RUTA_CITA && url.search !== '',
      (peticion) => (peticion.request().isNavigationRequest() ? peticion.fulfill({ status: 204 }) : peticion.fallback()),
    );
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_CITA}`);
    await esperarAlFichero(page);
    expect(await esperarEvento(EVENTOS.vistaDeCita), 'no llegó la vista').toBeTruthy();
    await apuntarClics(page);

    // Un ancla y la propia ruta, dentro de la zona de las Rutas de salida: sin su regla, saldrían.
    const PROPIA = `${RUTA_CITA}?q=otra`;
    await page.evaluate(
      ([ancla, propia]) => {
        const lista = document.querySelector('nav[aria-label="Seguir leyendo"] .mas-del-autor ul.tarjetas')!;
        for (const [href, texto] of [
          [ancla, 'Ancla de la propia página'],
          [propia, 'La propia ruta, con otra búsqueda'],
        ]) {
          const elemento = document.createElement('li');
          const enlace = document.createElement('a');
          enlace.setAttribute('href', href);
          enlace.textContent = texto;
          elemento.append(enlace);
          lista.append(elemento);
        }
      },
      ['#contenido', PROPIA],
    );

    const delAutor = page.locator(MAS_DEL_AUTOR).first();
    // Meta y Mayúsculas llegan como `click` en todas partes: abren otra pestaña u otra ventana.
    await delAutor.click({ modifiers: ['Meta'] });
    await delAutor.click({ modifiers: ['Shift'] });
    // Control y el botón central, no siempre —en macOS Control es el menú contextual, y Chromium da
    // `auxclick` al central—: se despachan como `click` en el enlace, para que su filtro se pruebe.
    await delAutor.dispatchEvent('click', { button: 0, ctrlKey: true });
    await delAutor.dispatchEvent('click', { button: 1 });
    await page.locator('a[href="#contenido"]').last().click();
    await expect.poll(() => new URL(page.url()).hash).toBe('#contenido');
    await page.locator(`a[href="${PROPIA}"]`).click();
    await esperar(500);

    // Cada gesto llegó como `click`, con lo suyo, a la escucha de la ventana.
    const destino = await delAutor.getAttribute('href');
    expect(await clicsDe(page)).toEqual([
      { button: 0, ctrlKey: false, metaKey: true, shiftKey: false, altKey: false, href: destino },
      { button: 0, ctrlKey: false, metaKey: false, shiftKey: true, altKey: false, href: destino },
      { button: 0, ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, href: destino },
      { button: 1, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, href: destino },
      { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, href: '#contenido' },
      { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, href: PROPIA },
    ]);
    // La lectura sí: la trajo el primer `pointerdown`. La salida, no.
    expect((await balizasDe(page)).map((b) => b.evento)).toEqual([EVENTOS.vistaDeCita, EVENTOS.lectura]);
    expect(salidas(), 'salió una salida sin serlo').toEqual([]);
    expect(new URL(page.url()).pathname).toBe(RUTA_CITA);

    await delAutor.click();
    const salida = await esperarEvento(EVENTOS.salidaInterna);
    expect(salida, 'no llegó la salida').toBeTruthy();
    expect(salida).toMatchObject({ ruta: RUTA_CITA, zona: 'rutas-de-salida' });
    const balizas = await balizasDe(page);
    expect(balizas.map((b) => b.evento)).toEqual([EVENTOS.vistaDeCita, EVENTOS.lectura, EVENTOS.salidaInterna]);
    expect(balizas[2]).toEqual({ evento: EVENTOS.salidaInterna, ruta: RUTA_CITA, zona: 'rutas-de-salida' });
    // Seguimos en la Cita: el destino contestó 204.
    expect(new URL(page.url()).pathname).toBe(RUTA_CITA);

    // Un segundo clic, en otra zona: nada más.
    await page.locator('header a.buscar').click();
    await esperar(500);
    expect((await balizasDe(page)).map((b) => b.evento)).toHaveLength(3);
    expect(salidas()).toHaveLength(1);
  });

  test('con el teclado: Enter en un enlace con zona da la lectura, por la tecla, y la salida', async ({ page, context }) => {
    await quedarseEn(context, RUTA_CITA);
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_CITA}`);
    await esperarAlFichero(page);
    expect(await esperarEvento(EVENTOS.vistaDeCita), 'no llegó la vista').toBeTruthy();

    await page.locator(MAS_DEL_AUTOR).first().focus();
    await page.keyboard.press('Enter');
    const salida = await esperarEvento(EVENTOS.salidaInterna);
    expect(salida, 'no llegó la salida').toBeTruthy();
    expect((await balizasDe(page)).map((b) => [b.evento, b.ruta, b.zona])).toEqual([
      [EVENTOS.vistaDeCita, RUTA_CITA, undefined],
      [EVENTOS.lectura, RUTA_CITA, undefined],
      [EVENTOS.salidaInterna, RUTA_CITA, 'rutas-de-salida'],
    ]);
  });

  test('en el 404, servido en la ruta que se pidió, un chip exento no sale ni gasta, y «Ver esta cita» sale con `cita-del-dia`, esa ruta y sin lectura', async ({
    page,
    context,
  }) => {
    // Una Cita que no existe: el servidor contesta 404 con la página del 404, en esta misma ruta.
    const PEDIDA = '/cita/una-retirada-que-no-existe/';
    await quedarseEn(context, PEDIDA);
    await apuntarBalizas(page);
    const respuesta = await page.goto(`${SITIO}${PEDIDA}`);
    expect(respuesta?.status()).toBe(404);
    await esperarAlFichero(page);

    /*
     * Los chips de Temas del 404 son la exención `chips-del-404`, pero este sitio no publica ningún
     * Tema (no llega a `MIN_CITAS_POR_TEMA`) y no los pinta: se pone en `main` la misma lista, con la
     * misma exención, y se pulsa. Va dentro de un contenedor con zona, para que sin la regla de la
     * exención el clic saliera con ella. Su navegación se anula con 204, así que la carga sigue.
     */
    const [exencion] = EXENCIONES_DE_ZONA;
    await page.evaluate(
      ([atributoDeZona, atributo, valor]) => {
        const zona = document.createElement('div');
        zona.setAttribute(atributoDeZona, 'cita-del-dia');
        const lista = document.createElement('ul');
        lista.className = 'chips';
        lista.setAttribute(atributo, valor);
        const elemento = document.createElement('li');
        const enlace = document.createElement('a');
        enlace.className = 'chip';
        enlace.setAttribute('href', '/tema/el-tiempo/');
        enlace.textContent = 'El tiempo';
        elemento.append(enlace);
        lista.append(elemento);
        zona.append(lista);
        document.querySelector('main')!.append(zona);
      },
      [ATRIBUTO_DE_ZONA, ATRIBUTO_SIN_ZONA, exencion],
    );
    await page.locator(`main ul.chips[${ATRIBUTO_SIN_ZONA}="${exencion}"] a`).click();
    await esperar(500);
    expect(await balizasDe(page), 'el chip exento emitió algo').toEqual([]);
    expect(new URL(page.url()).pathname).toBe(PEDIDA);

    // La salida de la carga sigue sin gastar: «Ver esta cita» sale.
    await page.locator('main p.ir a').click();
    const salida = await esperarEvento(EVENTOS.salidaInterna);
    expect(salida, 'no llegó la salida').toBeTruthy();
    expect(salida).toMatchObject({ ruta: PEDIDA, zona: 'cita-del-dia' });
    await esperar(500);
    // Ni vista ni lectura: el 404 no declara ninguna.
    expect((await balizasDe(page)).map((b) => [b.evento, b.ruta, b.zona])).toEqual([
      [EVENTOS.salidaInterna, PEDIDA, 'cita-del-dia'],
    ]);
    expect(new URL(page.url()).pathname).toBe(PEDIDA);
  });

  test('en `/buscar/`, pulsar un resultado llega con `resultado`, la ruta de la búsqueda y sin lectura', async ({
    page,
    context,
  }) => {
    await quedarseEn(context, RUTA_BUSCAR);
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_BUSCAR}?q=${CON_RESULTADOS}`);
    await esperarAlFichero(page);
    const resultado = page.locator(RESULTADOS).first();
    await expect(resultado).toBeVisible();

    await resultado.click();
    const salida = await esperarEvento(EVENTOS.salidaInterna);
    expect(salida, 'no llegó la salida').toBeTruthy();
    expect(salida).toMatchObject({ ruta: RUTA_BUSCAR, zona: 'resultado' });
    await esperar(500);
    // Historia 23.8: pulsar un resultado asienta antes la búsqueda que se ve.
    expect((await balizasDe(page)).map((b) => b.evento)).toEqual([EVENTOS.busqueda, EVENTOS.salidaInterna]);
    expect(llegadas(EVENTOS.lectura), '`/buscar/` no emite lectura').toEqual([]);
  });

  test('caché de atrás y adelante en la Cita: salir, volver y salir otra vez da dos salidas, la segunda tras la lectura nueva', async ({
    playwright,
  }) => {
    await conLaCacheDeVerdad(playwright, async (pagina, restaurada) => {
      await pagina.goto(`${SITIO}${RUTA_CITA}`);
      await esperarAlFichero(pagina);
      await pagina.locator(MAS_DEL_AUTOR).first().click();
      await pagina.waitForURL((url) => url.pathname !== RUTA_CITA);
      await esperarAlFichero(pagina);
      await restaurada();
      expect(new URL(pagina.url()).pathname).toBe(RUTA_CITA);

      await pagina.locator(MAS_DEL_AUTOR).last().click();
      await expect.poll(() => salidas().filter((r) => r!.ruta === RUTA_CITA).length).toBe(2);
      // La misma página, restaurada: lleva en memoria lo de las dos cargas, en su orden.
      expect((await balizasDe(pagina)).map((b) => [b.evento, b.zona])).toEqual([
        [EVENTOS.vistaDeCita, undefined],
        [EVENTOS.lectura, undefined],
        [EVENTOS.salidaInterna, 'rutas-de-salida'],
        [EVENTOS.lectura, undefined],
        [EVENTOS.salidaInterna, 'rutas-de-salida'],
      ]);
    });
  });

  test('caché de atrás y adelante en `/buscar/`: un resultado, atrás y otro resultado dan dos salidas `resultado`', async ({
    playwright,
  }) => {
    await conLaCacheDeVerdad(playwright, async (pagina, restaurada) => {
      await pagina.goto(`${SITIO}${RUTA_BUSCAR}?q=${CON_RESULTADOS}`);
      await esperarAlFichero(pagina);
      await expect(pagina.locator(RESULTADOS).first()).toBeVisible();
      await pagina.locator(RESULTADOS).first().click();
      await pagina.waitForURL((url) => url.pathname !== RUTA_BUSCAR);
      await esperarAlFichero(pagina);
      await restaurada();
      expect(new URL(pagina.url()).pathname).toBe(RUTA_BUSCAR);

      await expect(pagina.locator(RESULTADOS).last()).toBeVisible();
      await pagina.locator(RESULTADOS).last().click();
      await expect.poll(() => salidas().filter((r) => r!.ruta === RUTA_BUSCAR).length).toBe(2);
      // Historia 23.8: la búsqueda se asentó con el primer resultado; tras la caché, solo la salida.
      expect((await balizasDe(pagina)).map((b) => [b.evento, b.ruta, b.zona])).toEqual([
        [EVENTOS.busqueda, RUTA_BUSCAR, undefined],
        [EVENTOS.salidaInterna, RUTA_BUSCAR, 'resultado'],
        [EVENTOS.salidaInterna, RUTA_BUSCAR, 'resultado'],
      ]);
      expect(llegadas(EVENTOS.lectura).filter((r) => r!.ruta === RUTA_BUSCAR)).toEqual([]);
    });
  });
});

/*
 * Historia 23.8 — una búsqueda cuenta una vez, cuando se asienta, contra el Pagefind de verdad de este
 * sitio. Cada fila de guion de su matriz la recorre el entorno simulado de `tests/unit/medicion.test.ts`
 * con la isla de `dist/`; aquí, lo que solo dice un navegador: la baliza que llega, el orden con la
 * salida, la que sale al irse, el índice que no carga, el historial, Navigation Timing y la caché de
 * atrás y adelante.
 */
test.describe('Historia 23.8 — una búsqueda cuenta una vez, cuando se asienta', () => {
  const llegadas = (nombre: string) => recibidos.filter((r) => r?.evento === nombre);
  const busquedas = () => llegadas(EVENTOS.busqueda);
  const RESULTADOS = '[data-resultados] .resultado a';
  /** Una consulta que encuentra algo en este sitio: la Cita del viento favorable. */
  const CON_RESULTADOS = 'viento';
  const MARCA = MARCA_DE_BUSQUEDA_ASENTADA;
  const NINGUNO = ASENTAMIENTO_DE_BUSQUEDA.sinFiltros;
  const campo = (page: Page) => page.locator('[data-consulta]');

  /** Escribe en el campo y espera a que se pinte su búsqueda: los resultados, o la salida sin ellos. */
  async function buscarEn(page: Page, texto: string, conResultados: boolean) {
    await campo(page).fill(texto);
    if (conResultados) {
      await expect(page.locator('[data-salida]')).toBeHidden();
      await expect(page.locator(RESULTADOS).first()).toBeVisible();
    } else {
      await expect(page.locator('[data-salida]')).toBeVisible();
      await expect(page.locator(RESULTADOS)).toHaveCount(0);
    }
  }
  /** El tramo de lo que se ve: el total, que con menos de 30 es lo pintado. */
  const tramoDeLoQueSeVe = async (page: Page) => {
    const pintados = await page.locator(RESULTADOS).count();
    expect(pintados).toBeLessThan(30);
    return tramoDe(pintados);
  };
  const tipoDeNavegacion = (page: Page) =>
    page.evaluate(() => (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).type);

  test('teclear sin enviar no emite nada: ni por tecla, ni por el repintado, ni al borrar', async ({ page }) => {
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_BUSCAR}`);
    await esperarAlFichero(page);
    await campo(page).pressSequentially('vien', { delay: 40 });
    await buscarEn(page, CON_RESULTADOS, true);
    await buscarEn(page, SIN_RESULTADOS, false);
    await campo(page).fill('');
    await esperar(500);
    expect(await balizasDe(page)).toEqual([]);
    expect(await page.evaluate(() => history.state)).toBeNull();
  });

  test('Enter da una `busqueda` con sus claves exactas, marca la entrada sin tocar la dirección, y repetir —también A, B, A— no la repite', async ({
    page,
  }) => {
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_BUSCAR}`);
    await esperarAlFichero(page);
    const entradas = await page.evaluate(() => history.length);

    await buscarEn(page, CON_RESULTADOS, true);
    const tramo = await tramoDeLoQueSeVe(page);
    expect(tramo).not.toBe(tramoDe(0));
    await campo(page).press('Enter');
    await expect.poll(async () => (await balizasDe(page)).length).toBe(1);
    expect((await balizasDe(page))[0]).toEqual({ evento: EVENTOS.busqueda, ruta: RUTA_BUSCAR, tramo, filtros: NINGUNO });
    const registro = await esperarEvento(EVENTOS.busqueda);
    expect(registro, 'no llegó la búsqueda').toBeTruthy();
    expect(registro).toMatchObject({ ruta: RUTA_BUSCAR, tramo, filtros: NINGUNO, consulta: null });
    // La entrada lleva la marca, y nada más; la dirección y el historial no cambian.
    expect(await page.evaluate(() => history.state)).toEqual({ [MARCA]: true });
    expect(page.url()).toBe(`${SITIO}${RUTA_BUSCAR}`);
    expect(await page.evaluate(() => history.length)).toBe(entradas);

    // Enter otra vez; B; A otra vez; A con un espacio de más.
    await campo(page).press('Enter');
    await buscarEn(page, SIN_RESULTADOS, false);
    await campo(page).press('Enter');
    await buscarEn(page, CON_RESULTADOS, true);
    await campo(page).press('Enter');
    await campo(page).fill(`${CON_RESULTADOS} `);
    await esperar(400);
    await campo(page).press('Enter');
    await esperar(500);
    expect((await balizasDe(page)).map((b) => [b.evento, b.tramo ?? b.datos])).toEqual([
      [EVENTOS.busqueda, tramo],
      [EVENTOS.busqueda, tramoDe(0)],
      [EVENTOS.busquedaSinResultados, SIN_RESULTADOS],
    ]);
    expect(busquedas()).toHaveLength(2);
    expect(page.url()).toBe(`${SITIO}${RUTA_BUSCAR}`);
  });

  test('sin resultados: la `busqueda` en el tramo 0 y después la `busqueda-sin-resultados` con el texto, una vez', async ({
    page,
  }) => {
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_BUSCAR}`);
    await esperarAlFichero(page);
    await buscarEn(page, SIN_RESULTADOS, false);
    await campo(page).press('Enter');
    await campo(page).press('Enter');
    await expect.poll(() => llegadas(EVENTOS.busquedaSinResultados).length).toBe(1);
    await esperar(500);
    expect(await balizasDe(page)).toEqual([
      { evento: EVENTOS.busqueda, ruta: RUTA_BUSCAR, tramo: tramoDe(0), filtros: NINGUNO },
      { evento: EVENTOS.busquedaSinResultados, ruta: RUTA_BUSCAR, datos: SIN_RESULTADOS },
    ]);
    expect(busquedas()).toHaveLength(1);
    expect(llegadas(EVENTOS.busquedaSinResultados)[0]).toMatchObject({ consulta: SIN_RESULTADOS, tramo: null });
  });

  test('pulsar un resultado da la `busqueda` de lo que se ve y después la salida', async ({ page, context }) => {
    await quedarseEn(context, RUTA_BUSCAR);
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_BUSCAR}`);
    await esperarAlFichero(page);
    await buscarEn(page, CON_RESULTADOS, true);
    const tramo = await tramoDeLoQueSeVe(page);
    await page.locator(RESULTADOS).first().click();
    await expect.poll(() => llegadas(EVENTOS.salidaInterna).length).toBe(1);
    await esperar(300);
    expect(await balizasDe(page)).toEqual([
      { evento: EVENTOS.busqueda, ruta: RUTA_BUSCAR, tramo, filtros: NINGUNO },
      { evento: EVENTOS.salidaInterna, ruta: RUTA_BUSCAR, zona: 'resultado' },
    ]);
  });

  test('el botón central —abrir en otra pestaña— da `auxclick` y no `click`: asienta la búsqueda y no hay salida; el secundario no asienta', async ({
    page,
    context,
  }) => {
    await quedarseEn(context, RUTA_BUSCAR);
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_BUSCAR}`);
    await esperarAlFichero(page);
    await buscarEn(page, CON_RESULTADOS, true);
    const tramo = await tramoDeLoQueSeVe(page);
    // El secundario abre el menú contextual —copiar el enlace—, que no es pulsar: no asienta.
    await page.locator(RESULTADOS).first().click({ button: 'right' });
    await page.keyboard.press('Escape');
    await esperar(300);
    expect(await balizasDe(page), 'el botón secundario asentó la búsqueda').toEqual([]);
    await page.locator(RESULTADOS).first().click({ button: 'middle' });
    await expect.poll(async () => (await balizasDe(page)).length).toBe(1);
    await esperar(300);
    // La pestaña nueva no es una salida de esta carga (23.7); la búsqueda sí quedó asentada.
    expect(await balizasDe(page)).toEqual([{ evento: EVENTOS.busqueda, ruta: RUTA_BUSCAR, tramo, filtros: NINGUNO }]);
    expect(new URL(page.url()).pathname).toBe(RUTA_BUSCAR);
  });

  test('con el teclado: Enter en un resultado da la `busqueda` de lo que se ve y después la salida', async ({
    page,
    context,
  }) => {
    await quedarseEn(context, RUTA_BUSCAR);
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_BUSCAR}`);
    await esperarAlFichero(page);
    await buscarEn(page, CON_RESULTADOS, true);
    const tramo = await tramoDeLoQueSeVe(page);
    await page.locator(RESULTADOS).first().focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => llegadas(EVENTOS.salidaInterna).length).toBe(1);
    await esperar(300);
    expect(await balizasDe(page)).toEqual([
      { evento: EVENTOS.busqueda, ruta: RUTA_BUSCAR, tramo, filtros: NINGUNO },
      { evento: EVENTOS.salidaInterna, ruta: RUTA_BUSCAR, zona: 'resultado' },
    ]);
  });

  test('desde el campo del 404: llegar a `/buscar/?q=…` busca y no asienta; Enter, sí, una vez', async ({ page }) => {
    await apuntarBalizas(page);
    await page.goto(`${SITIO}/una-ruta-que-no-existe/`);
    await esperarAlFichero(page);
    await page.locator('form[role="search"] input[name="q"]').fill(CON_RESULTADOS);
    await page.locator('form[role="search"] input[name="q"]').press('Enter');
    await page.waitForURL((url) => url.pathname === RUTA_BUSCAR);
    expect(new URL(page.url()).searchParams.get('q')).toBe(CON_RESULTADOS);
    await esperarAlFichero(page);
    await expect(page.locator(RESULTADOS).first()).toBeVisible();
    const tramo = await tramoDeLoQueSeVe(page);
    await esperar(300);
    expect(await balizasDe(page), 'llegar desde el 404 la asentó').toEqual([]);
    expect(await tipoDeNavegacion(page)).toBe('navigate');
    await campo(page).press('Enter');
    await campo(page).press('Enter');
    await expect.poll(async () => (await balizasDe(page)).length).toBe(1);
    await esperar(300);
    expect(await balizasDe(page)).toEqual([{ evento: EVENTOS.busqueda, ruta: RUTA_BUSCAR, tramo, filtros: NINGUNO }]);
  });

  test('ocultarse yéndose a otra página: la `busqueda` de lo que se ve llega por el receptor', async ({ page }) => {
    await page.goto(`${SITIO}${RUTA_BUSCAR}`);
    await esperarAlFichero(page);
    await buscarEn(page, CON_RESULTADOS, true);
    const tramo = await tramoDeLoQueSeVe(page);
    await esperar(300);
    expect(busquedas(), 'se asentó sin que nadie se fuera').toEqual([]);
    await page.goto(`${SITIO}${RUTA_CITA}`);
    await expect.poll(() => busquedas().length).toBe(1);
    expect(busquedas()[0]).toMatchObject({ ruta: RUTA_BUSCAR, tramo, filtros: NINGUNO, consulta: null });
  });

  /** Las peticiones del índice, con el `?{n}` de cada reintento de la isla. */
  const esPagefind = (url: URL) => url.pathname === '/pagefind/pagefind.js';

  test('con `pagefind.js` abortado no llega nada: ni al enviar ni al irse, y la página no da error', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', (error) => errores.push(error.message));
    // Abortado siempre, también los reintentos, que piden otra dirección.
    await page.route(esPagefind, (ruta) => ruta.abort());
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_BUSCAR}`);
    await esperarAlFichero(page);
    for (const texto of [CON_RESULTADOS, SIN_RESULTADOS]) {
      await campo(page).fill(texto);
      await esperar(400);
      await campo(page).press('Enter');
      await esperar(400);
    }
    await expect(page.locator(RESULTADOS)).toHaveCount(0);
    await expect(page.locator('[data-salida]')).toBeHidden();
    expect(await balizasDe(page)).toEqual([]);
    await page.goto(`${SITIO}${RUTA_CITA}`);
    await esperarAlFichero(page);
    await esperar(500);
    expect(busquedas()).toEqual([]);
    expect(llegadas(EVENTOS.busquedaSinResultados)).toEqual([]);
    expect(errores, 'la búsqueda que no corre dejó un error en la página').toEqual([]);
  });

  test('con `pagefind.js` caído un rato, Enter con el mismo texto lo vuelve a pedir con otra dirección, pinta y asienta', async ({
    page,
  }) => {
    const errores: string[] = [];
    page.on('pageerror', (error) => errores.push(error.message));
    const pedidas: string[] = [];
    let caido = true;
    await page.route(esPagefind, (ruta) => {
      const url = new URL(ruta.request().url());
      pedidas.push(url.pathname + url.search);
      return caido ? ruta.abort() : ruta.continue();
    });
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${RUTA_BUSCAR}`);
    await esperarAlFichero(page);
    // Enfocar y la pausa del tecleo lo piden, y fallan: nada pintado, nada asentado.
    await campo(page).fill(CON_RESULTADOS);
    await expect.poll(() => pedidas.length).toBeGreaterThan(0);
    await esperar(400);
    await expect(page.locator(RESULTADOS)).toHaveCount(0);
    const fallidas = pedidas.length;
    caido = false;
    // El navegador recuerda el fallo de un módulo por su dirección: el reintento pide otra.
    await campo(page).press('Enter');
    await expect(page.locator(RESULTADOS).first()).toBeVisible();
    const tramo = await tramoDeLoQueSeVe(page);
    await expect.poll(async () => (await balizasDe(page)).length).toBe(1);
    expect(await balizasDe(page)).toEqual([{ evento: EVENTOS.busqueda, ruta: RUTA_BUSCAR, tramo, filtros: NINGUNO }]);
    expect(pedidas[0]).toBe('/pagefind/pagefind.js');
    expect(pedidas).toHaveLength(fallidas + 1);
    expect(new Set(pedidas).size, pedidas.join(', ')).toBe(pedidas.length);
    expect(pedidas.at(-1)).toBe(`/pagefind/pagefind.js?${fallidas}`);
    expect(errores).toEqual([]);
  });

  test('texto, resultado, atrás, atrás —sin la caché—: una sola `busqueda`, y la vuelta llega marcada como `back_forward`', async ({
    page,
  }) => {
    await page.goto(`${SITIO}/`);
    await esperarAlFichero(page);
    await page.goto(`${SITIO}${RUTA_BUSCAR}`);
    await esperarAlFichero(page);
    await buscarEn(page, CON_RESULTADOS, true);
    await page.locator(RESULTADOS).first().click();
    await page.waitForURL((url) => url.pathname !== RUTA_BUSCAR);
    await expect.poll(() => busquedas().length).toBe(1);

    await page.goBack();
    expect(new URL(page.url()).pathname).toBe(RUTA_BUSCAR);
    await esperarAlFichero(page);
    // Sin la caché, la vuelta es una carga nueva: lo dice Navigation Timing, y la entrada trae la marca.
    // Lo que esta vuelta prueba es eso: que la marca se escribió y el tipo de la carga. La entrada no
    // lleva `?q=` —la isla no lo escribe hasta la Épica 27— y el campo vuelve vacío
    // (`autocomplete="off"`), así que no se llega a ningún estado y nada lee la marca: que una
    // llegada marcada no asiente otra vez lo prueban las dos de abajo, con `?q=` (atrás y recarga).
    expect(await tipoDeNavegacion(page)).toBe('back_forward');
    expect(await page.evaluate(() => history.state)).toEqual({ [MARCA]: true });
    await expect(campo(page)).toHaveValue('');

    await page.goBack();
    expect(new URL(page.url()).pathname).toBe('/');
    await esperarAlFichero(page);
    await esperar(500);
    expect(busquedas()).toHaveLength(1);
  });

  test('texto, resultado, atrás, atrás —con la caché—: una sola `busqueda`; la página vuelve con su memoria', async ({
    playwright,
  }) => {
    await conLaCacheDeVerdad(playwright, async (pagina, restaurada) => {
      await pagina.goto(`${SITIO}/`);
      await esperarAlFichero(pagina);
      await pagina.goto(`${SITIO}${RUTA_BUSCAR}`);
      await esperarAlFichero(pagina);
      await buscarEn(pagina, CON_RESULTADOS, true);
      await pagina.locator(RESULTADOS).first().click();
      await pagina.waitForURL((url) => url.pathname !== RUTA_BUSCAR);
      await esperarAlFichero(pagina);
      await expect.poll(() => busquedas().length).toBe(1);

      await restaurada();
      expect(new URL(pagina.url()).pathname).toBe(RUTA_BUSCAR);
      // La misma carga, restaurada: lo pintado sigue ahí, y su búsqueda ya contó.
      await expect(pagina.locator(RESULTADOS).first()).toBeVisible();
      await campo(pagina).press('Enter');
      await esperar(300);

      // Y atrás otra vez: la página se oculta sin asentar nada más.
      await pagina.context().unrouteAll({ behavior: 'ignoreErrors' });
      await pagina.goBack({ waitUntil: 'commit' });
      await expect.poll(() => new URL(pagina.url()).pathname).toBe('/');
      await esperar(500);
      expect(busquedas()).toHaveLength(1);
    });
  });

  test('`/buscar/?q=…`, un resultado y atrás sin la caché: la entrada vuelve marcada, como `back_forward`, y no asienta otra', async ({
    page,
  }) => {
    await page.goto(`${SITIO}${RUTA_BUSCAR}?q=${CON_RESULTADOS}`);
    await esperarAlFichero(page);
    await expect(page.locator(RESULTADOS).first()).toBeVisible();
    await esperar(300);
    expect(busquedas(), 'llegar con la consulta la asentó').toEqual([]);
    await page.locator(RESULTADOS).first().click();
    await page.waitForURL((url) => url.pathname !== RUTA_BUSCAR);
    await expect.poll(() => busquedas().length).toBe(1);

    await page.goBack();
    await esperarAlFichero(page);
    expect(page.url()).toBe(`${SITIO}${RUTA_BUSCAR}?q=${CON_RESULTADOS}`);
    expect(await tipoDeNavegacion(page)).toBe('back_forward');
    expect(await page.evaluate(() => history.state)).toEqual({ [MARCA]: true });
    await expect(page.locator(RESULTADOS).first()).toBeVisible();
    await campo(page).press('Enter');
    await page.goto(`${SITIO}${RUTA_CITA}`);
    await esperarAlFichero(page);
    await esperar(500);
    expect(busquedas()).toHaveLength(1);
  });

  test('recargar tras asentar no asienta otra: la recarga llega con la entrada marcada', async ({ page }) => {
    await page.goto(`${SITIO}${RUTA_BUSCAR}?q=${CON_RESULTADOS}`);
    await esperarAlFichero(page);
    await expect(page.locator(RESULTADOS).first()).toBeVisible();
    await campo(page).press('Enter');
    await expect.poll(() => busquedas().length).toBe(1);

    await page.reload();
    await esperarAlFichero(page);
    expect(await tipoDeNavegacion(page)).toBe('reload');
    expect(await page.evaluate(() => history.state)).toEqual({ [MARCA]: true });
    await expect(page.locator(RESULTADOS).first()).toBeVisible();
    await campo(page).press('Enter');
    await page.goto(`${SITIO}${RUTA_CITA}`);
    await esperarAlFichero(page);
    await esperar(500);
    expect(busquedas()).toHaveLength(1);
  });
});

/*
 * Historia 23.9 — toda Obra cuenta sus vistas, se indexe o no, en un navegador de verdad y contra
 * el receptor de la prueba. Cada fila de la matriz la recorre el entorno simulado de
 * `tests/unit/medicion.test.ts`; aquí se mira que el fichero servido lee la marca del `<html>` que
 * escribió el build y la envía, y que la Obra que no se indexa gana su lectura y su salida.
 *
 * El reloj de la página se finge y se **pausa antes de navegar**, como en la 23.5: lo que se afirma
 * antes del gesto —solo las vistas, sin lectura— no depende de que el sitio tarde menos de 8 s en
 * llegar ahí, y la lectura sale solo del `pointerdown`.
 */
test.describe('Historia 23.9 — toda Obra cuenta sus vistas, se indexe o no', () => {
  const llegadas = (nombre: string) => recibidos.filter((r) => r?.evento === nombre);
  const [INDEXABLE, NO_INDEXABLE] = MARCAS_DE_OBRA;
  /** El Autor de la Cabecera de Obra, en la zona de la Atribución. */
  const AUTOR_DE_LA_CABECERA = `.cabecera-de-obra [${ATRIBUTO_DE_ZONA}="atribucion"] a`;
  /** El `noindex` de la página: la premisa de cada prueba, que depende de los umbrales de FR-52. */
  const NOINDEX = 'meta[name="robots"][content^="noindex"]';
  const INICIO = new Date('2026-10-25T10:00:00Z');

  /** Instala el reloj fingido y lo para: el tiempo de la página solo corre con `runFor`. */
  async function relojParado(page: Page) {
    await page.clock.install({ time: INICIO });
    await page.clock.pauseAt(new Date(INICIO.getTime() + 1_000));
  }

  /** Un `pointerdown` sobre el título de la Obra, donde pulsar no hace nada más. */
  async function pulsarElTitulo(page: Page) {
    const caja = (await page.locator('h1').first().boundingBox())!;
    await page.mouse.move(caja.x + 5, caja.y + 5);
    await page.mouse.down();
    await page.mouse.up();
  }

  test('la Obra indexable con `?de=instagram&via=whatsapp`: la vista de superficie y la de Obra, en ese orden, con las dos marcas de llegada y la de Obra; la barra las pierde; después, una sola lectura', async ({
    page,
  }) => {
    await relojParado(page);
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${OBRA_INDEXABLE}?de=instagram&via=whatsapp`);
    await esperarAlFichero(page);
    // La premisa: con los umbrales de hoy, «Cartas a Lucilio» (2 de 3 Citas) se indexa.
    await expect(page.locator(NOINDEX), 'la Obra indexable salió con `noindex`: ¿cambiaron los umbrales de FR-52?').toHaveCount(0);
    await expect.poll(() => page.url()).toBe(`${SITIO}${OBRA_INDEXABLE}`);

    const vistaDeObra = await esperarEvento(EVENTOS.vistaDeObra);
    expect(vistaDeObra, 'no llegó la vista de Obra').toBeTruthy();
    expect(vistaDeObra).toMatchObject({ ruta: OBRA_INDEXABLE, origen: 'instagram', via: 'whatsapp', indexable: INDEXABLE });
    expect(await esperarEvento(EVENTOS.vistaDeSuperficie), 'no llegó la vista de superficie').toBeTruthy();
    // En el orden en que salen por `sendBeacon`: el receptor no lo garantiza. Sin lectura todavía.
    expect((await balizasDe(page)).map((b) => [b.evento, b.origen, b.via, b.indexable])).toEqual([
      [EVENTOS.vistaDeSuperficie, 'instagram', 'whatsapp', undefined],
      [EVENTOS.vistaDeObra, 'instagram', 'whatsapp', INDEXABLE],
    ]);

    // Después de las dos, una sola lectura: con las marcas de llegada y sin la de Obra.
    await pulsarElTitulo(page);
    const lectura = await esperarEvento(EVENTOS.lectura);
    expect(lectura, 'el pointerdown no emitió la lectura').toBeTruthy();
    expect(lectura).toMatchObject({ ruta: OBRA_INDEXABLE, origen: 'instagram', via: 'whatsapp', indexable: null });
    await page.clock.runFor(20_000);
    await esperar(500);
    expect((await balizasDe(page)).map((b) => b.evento)).toEqual([
      EVENTOS.vistaDeSuperficie,
      EVENTOS.vistaDeObra,
      EVENTOS.lectura,
    ]);
    expect(llegadas(EVENTOS.lectura)).toHaveLength(1);
    // SM-8 como hoy: una sola vista de superficie, con su origen, y sin columna de marca.
    expect(llegadas(EVENTOS.vistaDeSuperficie)).toHaveLength(1);
    expect(llegadas(EVENTOS.vistaDeSuperficie)[0]).toMatchObject({ origen: 'instagram', via: 'whatsapp', indexable: null });
    expect(llegadas(EVENTOS.vistaDeObra)).toHaveLength(1);
  });

  test('la Obra que no se indexa: solo la vista de Obra; un `pointerdown` da su lectura detrás, y el Autor de la Cabecera, la salida detrás de ella', async ({
    page,
    context,
  }) => {
    await quedarseEn(context, OBRA_NO_INDEXABLE);
    await relojParado(page);
    await apuntarBalizas(page);
    await page.goto(`${SITIO}${OBRA_NO_INDEXABLE}`);
    await esperarAlFichero(page);
    // La premisa: con los umbrales de hoy, «Sobre la brevedad de la vida» (1 Cita) no se indexa.
    await expect(page.locator(NOINDEX), 'la Obra no indexable salió sin `noindex`: ¿cambiaron los umbrales de FR-52?').toHaveCount(1);
    const vista = await esperarEvento(EVENTOS.vistaDeObra);
    expect(vista, 'no llegó la vista de Obra').toBeTruthy();
    expect(vista).toMatchObject({ ruta: OBRA_NO_INDEXABLE, origen: null, indexable: NO_INDEXABLE });
    expect((await balizasDe(page)).map((b) => b.evento)).toEqual([EVENTOS.vistaDeObra]);

    await pulsarElTitulo(page);
    const lectura = await esperarEvento(EVENTOS.lectura);
    expect(lectura, 'el pointerdown no emitió la lectura').toBeTruthy();
    expect(lectura).toMatchObject({ ruta: OBRA_NO_INDEXABLE, indexable: null });

    await page.locator(AUTOR_DE_LA_CABECERA).click();
    const salida = await esperarEvento(EVENTOS.salidaInterna);
    expect(salida, 'no llegó la salida').toBeTruthy();
    const balizas = await balizasDe(page);
    expect(balizas.map((b) => b.evento)).toEqual([EVENTOS.vistaDeObra, EVENTOS.lectura, EVENTOS.salidaInterna]);
    expect(balizas[2]).toEqual({ evento: EVENTOS.salidaInterna, ruta: OBRA_NO_INDEXABLE, zona: 'atribucion' });
    await esperar(500);
    expect(llegadas(EVENTOS.vistaDeSuperficie)).toEqual([]);
  });
});
