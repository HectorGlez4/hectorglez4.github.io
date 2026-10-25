import { expect, test, type Page } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { EVENTOS, EVENTOS_DEL_GUION, camposQueEmite, rutaDelGuionDeMedicion } from '../../src/lib/medicion.ts';
import { CAMPOS, claveEnLaBaliza } from '../../src/lib/vocabulario.ts';
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
      'citas/seneca--dos.md': citaValida({
        texto: 'No hay viento favorable para el que no sabe adónde va.',
        slug: 'seneca-no-hay-viento-favorable',
        aptaParaPortada: true,
      }),
      'citas/seneca--larga.md': citaValida({
        texto: TEXTO_LARGO,
        slug: CITA_LARGA,
        temas: [],
        aptaParaPortada: true,
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

test.describe('Historia 23.1 — cada superficie descarga exactamente el guion de medición', () => {
  const SUPERFICIES: [string, string][] = [
    ['la Página de Cita', RUTA_CITA],
    ['la portada', '/'],
    ['la Página de Autor', rutaDeAutor('seneca')],
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

  for (const [nombre, ruta] of [
    ['la búsqueda', RUTA_BUSCAR],
    ['el 404', '/no-existe-esta-ruta/'],
    ['la Obra que no se indexa', OBRA_NO_INDEXABLE],
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
    // Exactamente la ruta y la Marca de origen: ni `via` (23.6) ni nada más.
    expect(Object.keys((await balizasDe(page))[1]).sort()).toEqual(['evento', 'origen', 'ruta']);
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

      await pagina.goto(`${SITIO}${RUTA_CITA}?de=instagram`);
      await esperarAlFichero(pagina);
      await pagina.keyboard.press('Shift');
      await expect.poll(() => llegadas(EVENTOS.lectura).length).toBe(1);
      expect(llegadas(EVENTOS.lectura)[0]).toMatchObject({ ruta: RUTA_CITA, origen: 'instagram' });

      await pagina.goto(`${SITIO}${rutaDeAutor('seneca')}`);
      await esperarAlFichero(pagina);
      await pagina.goBack({ waitUntil: 'commit' });
      expect(new URL(pagina.url()).pathname).toBe(RUTA_CITA);

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
      expect(deLaCita(EVENTOS.lectura).map((r) => r!.origen)).toEqual(['instagram', null]);
      // La vista de la Página de Autor sí llegó: fue una carga de verdad.
      expect(llegadas(EVENTOS.vistaDeSuperficie)).toHaveLength(1);
    } finally {
      await navegador.close();
    }
  });
});
