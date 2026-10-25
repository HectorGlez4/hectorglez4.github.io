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

/** Las vistas de Cita de una ruta que guarda el D1 local, leídas con `wrangler d1 execute --local`. */
function vistasEnElD1Local(ruta: string): Promise<number> {
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
