import { expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { EVENTOS } from '../../src/lib/vocabulario.ts';
import { rutaDeCita } from '../../src/lib/superficies.ts';
import {
  DIRECTORIO_DEL_RECEPTOR,
  argumentosDeConsulta,
  argumentosDeNpx,
  leerConsulta,
} from '../../tools/lib/medicion.ts';

/**
 * Historia 23.2 — el sitio de las pruebas mide en el D1 local.
 *
 * `playwright.config.ts` levanta el receptor local (`npm run medicion -- local`: `wrangler dev`
 * con D1 local) y construye el sitio con `MEDICION_ENDPOINT` apuntando a él. Las demás pruebas
 * solo admiten el fichero de medición en la lista cerrada de guiones, y eso pasa igual si no se
 * pide; `receptor.spec.ts` construye su propio sitio con su propio receptor en memoria. Esta es la
 * que mira el cableado: que la Página de Cita del sitio de las pruebas pide su fichero de
 * medición y que la vista que emite llega, por el Worker de esta rama, al D1 local.
 */

/*
 * Solo en un perfil: el cableado es el mismo en móvil y en escritorio, y cada lectura del D1
 * local arranca `wrangler`.
 */
const PERFIL = 'escritorio';

const raiz = new URL('../..', import.meta.url).pathname;
const RUTA = rutaDeCita('antonio-machado-hoy-es-siempre-todavia');

/*
 * Lo que no es una lectura, y se repite — puerta de la fusión de las Épicas 24 y 26.
 *
 * `wrangler d1 execute --local` abre el SQLite del D1 local con un workerd propio, el mismo fichero
 * que escribe el `wrangler dev` de `playwright.config.ts`. Mientras ése escribe —las vistas que
 * emiten las páginas de las demás pruebas, a decenas por segundo cuando el recorrido de
 * `seo.spec.ts` abre páginas—, la consulta falla al pedir su marca de sesión
 * (`getCurrentBookmark` del D1 de Miniflare) con «Failed to get session commit token: internal
 * error», sin leer nada: ni cero ni otra cifra. Reproducido a mano con el receptor local y un
 * recorrido de 3.730 páginas en marcha: cuatro consultas seguidas fallan así, y en cuanto el
 * recorrido acaba la misma consulta lee.
 *
 * Así que ese fallo, y solo ése, se vuelve a intentar hasta `ESPERA_POR_CONTENCION`; cualquier
 * otro rechazo sale a la primera, como antes, y lo que se lee y se afirma no cambia.
 */
const CONTENCION = /Failed to get session commit token/;
const ESPERA_POR_CONTENCION = 45_000;

/** Las vistas de Cita de una ruta que guarda el D1 local, leídas con `wrangler d1 execute --local`. */
async function vistasEnElD1Local(ruta: string): Promise<number> {
  const hasta = Date.now() + ESPERA_POR_CONTENCION;
  for (;;) {
    try {
      return await vistasEnElD1LocalUnaVez(ruta);
    } catch (error) {
      if (!CONTENCION.test(String(error)) || Date.now() > hasta) throw error;
      await new Promise((siga) => setTimeout(siga, 2_000));
    }
  }
}

function vistasEnElD1LocalUnaVez(ruta: string): Promise<number> {
  const sql = `SELECT COUNT(*) AS n FROM eventos WHERE evento = '${EVENTOS.vistaDeCita}' AND ruta = '${ruta}'`;
  return new Promise((listo, fallo) => {
    execFile(
      'npx',
      argumentosDeNpx(argumentosDeConsulta(sql, 'local')),
      { cwd: join(raiz, DIRECTORIO_DEL_RECEPTOR), env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } },
      (_error, stdout, stderr) => {
        const leido = leerConsulta(String(stdout));
        if (!leido.ok) {
          fallo(new Error(`No se pudo leer el D1 local: ${leido.motivo} ${String(stderr).trim()}`));
          return;
        }
        listo(Number(leido.filas[0]?.n ?? Number.NaN));
      },
    );
  });
}

test.describe('Historia 23.2 — el sitio de las pruebas mide en el D1 local', () => {
  test('la Página de Cita pide su fichero de medición y su vista llega al D1 local', async ({ page }, info) => {
    test.skip(info.project.name !== PERFIL, 'el cableado es el mismo en los dos perfiles');
    test.setTimeout(120_000);

    const antes = await vistasEnElD1Local(RUTA);
    expect(Number.isInteger(antes)).toBe(true);

    const pedidos: string[] = [];
    page.on('request', (peticion) => pedidos.push(new URL(peticion.url()).pathname));
    await page.goto(RUTA, { waitUntil: 'networkidle' });
    expect(new URL(page.url()).pathname).toBe(RUTA);
    expect(
      pedidos.some((ruta) => /^\/medicion\/[^/]+\.js$/.test(ruta)),
      `la página pidió ${pedidos.join(', ')}`,
    ).toBe(true);

    // Otras pruebas visitan la misma página a la vez: basta con que crezca.
    await expect
      .poll(() => vistasEnElD1Local(RUTA), { timeout: 60_000, intervals: [1_000, 2_000, 4_000] })
      .toBeGreaterThan(antes);
  });
});
