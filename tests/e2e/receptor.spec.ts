import { expect, test } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { EVENTOS } from '../../src/lib/medicion.ts';
import { interpretar, type Registro } from '../../medicion/receptor.ts';
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
const SIN_RESULTADOS = 'zzzzqqqxxx';

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
      }),
    },
    {
      entorno: { MEDICION_ENDPOINT: `http://localhost:${PUERTO_RECEPTOR}/e` },
      conBusqueda: true,
    },
  );
  expect(resultado.codigo, resultado.salida).toBe(0);
  proyecto = resultado.proyecto;

  servidor = spawn('node', [join(new URL('..', import.meta.url).pathname, 'servidor.mjs')], {
    env: { ...process.env, DIST: join(proyecto, 'dist'), PUERTO: String(PUERTO_SITIO) },
    stdio: 'ignore',
  });

  // Se espera a que responda en vez de dormir un rato fijo.
  for (let intento = 0; intento < 100; intento++) {
    try {
      await fetch(SITIO);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('el servidor del sitio de prueba no llegó a responder');
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
    await page.goto(`${SITIO}/cita/${CITA}`);
    const registro = await esperarEvento(EVENTOS.vistaDeCita);
    expect(registro, 'no llegó la vista de cita').toBeTruthy();
    expect(registro!.ruta).toBe(`/cita/${CITA}`);
  });

  test('copiar la Cita emite el copiado', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`${SITIO}/cita/${CITA}`);
    await page.getByRole('button', { name: 'Copiar la cita' }).click();

    const registro = await esperarEvento(EVENTOS.copiado);
    expect(registro, 'no llegó el copiado').toBeTruthy();
    expect(registro!.ruta).toBe(`/cita/${CITA}`);
  });

  test('descargar la imagen emite la descarga', async ({ page }) => {
    await page.goto(`${SITIO}/cita/${CITA}`);
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
    await page.goto(`${SITIO}/buscar`);
    await page.locator('[data-consulta]').fill(SIN_RESULTADOS);
    await page.waitForFunction(
      () => !document.querySelector('[data-salida]')!.hasAttribute('hidden'),
    );

    const registro = await esperarEvento(EVENTOS.busquedaSinResultados);
    expect(registro, 'no llegó la búsqueda sin resultados').toBeTruthy();
    expect(registro!.consulta).toBe(SIN_RESULTADOS);
    expect(registro!.ruta).toBe('/buscar');
  });
});

test.describe('Historia 7.3 — lo que llega no identifica a nadie', () => {
  test('ninguna baliza trae cookie ni nada que pueda convertirse en identificador', async ({ page }) => {
    const cargas: string[] = [];
    page.on('request', (peticion) => {
      if (peticion.url().includes(`:${PUERTO_RECEPTOR}`)) cargas.push(peticion.postData() ?? '');
    });

    await page.goto(`${SITIO}/cita/${CITA}`);
    await esperarEvento(EVENTOS.vistaDeCita);

    expect(cargas.length).toBeGreaterThan(0);
    for (const carga of cargas) {
      const objeto = JSON.parse(carga);
      expect(Object.keys(objeto).sort()).toEqual(['datos', 'evento', 'ruta']);
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

    await page.goto(`${SITIO}/cita/${CITA}`);
    await expect(page.locator('blockquote .texto')).toBeVisible();

    // Copiar sigue funcionando aunque el evento no llegue a ninguna parte.
    await page.getByRole('button', { name: 'Copiar la cita' }).click();
    await expect(page.locator('[data-copiar]')).toHaveAttribute('data-estado', 'copiado');

    expect(errores, 'la medición rompió la página').toEqual([]);
  });
});
