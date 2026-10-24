/**
 * El receptor de la medición, desplegado en su orden — AD-13, AD-14, Historia 23.2.
 *
 *   npm run medicion -- desplegar   # migra en remoto, despliega el receptor, lo comprueba,
 *                                   # baraja el rowid y escribe la huella. Acto de Héctor.
 *   npm run medicion -- comprobar   # que el receptor en vivo guarda lo que dice la huella,
 *                                   # descarta lo ajeno y numera al azar. Acto de Héctor.
 *   npm run medicion -- local       # el receptor en local: migra el D1 local y arranca
 *                                   # `wrangler dev` en el puerto 8787, en primer plano.
 *   npm run medicion -- ensayo      # la comprobación de `desplegar`, contra el receptor local.
 *
 * ── Por qué es una orden ─────────────────────────────────────────────────────────────────
 *
 * Cuando cambian el vocabulario o las columnas, el orden es migración, receptor, sitio, y se
 * cumple por construcción (AD-14): un receptor que escribe una columna que no existe pierde cada
 * evento, y un sitio que envía un campo que el receptor no coteja lo ve llegar a nulo,
 * indistinguible de un cero. Esta orden aplica la migración, despliega el receptor, lo comprueba
 * con balizas de prueba, baraja lo ya escrito (Historia 23.12) y, solo si todo eso salió,
 * escribe la huella del vocabulario desplegado en `medicion/huella-del-vocabulario.json`, que
 * `npm test` coteja contra `src/lib/vocabulario.ts`. No hace commit: la huella la commitea quien
 * corre la orden.
 *
 * ── Códigos ──────────────────────────────────────────────────────────────────────────────
 *
 * 2 si la invocación no vale —subcomando o bandera desconocidos—, si falta `MEDICION_ENDPOINT`,
 * no es una dirección http(s) o apunta a la máquina propia, o si `wrangler` no tiene sesión: en
 * todos, antes de tocar nada. 1 para todo lo demás, con el parte de lo que quedó aplicado. Se
 * para en el primer fallo y no reintenta migraciones ni despliegues.
 *
 * ── Red ──────────────────────────────────────────────────────────────────────────────────
 *
 * Es la cáscara (AD-22): `wrangler`, `git`, el disco y el `fetch` de las balizas viven aquí, y
 * nada más. El orden de cada subcomando, sus paradas y lo que dice están en
 * `tools/lib/medicion.ts`, que recibe estos efectos y se prueba con otros de mentira. El build no
 * la invoca y ningún paso de CI la ejecuta.
 */
import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { interpretar } from '../medicion/receptor.ts';
import {
  ARGUMENTOS_DEL_RECEPTOR_LOCAL,
  DIRECTORIO_DE_MIGRACIONES,
  DIRECTORIO_DEL_RECEPTOR,
  Parada,
  RUTA_DE_LA_HUELLA,
  WRANGLER,
  argumentosDeMedicion,
  argumentosDeMigracion,
  argumentosDeNpx,
  avisoDeInterrupcion,
  comprobar,
  desplegar,
  ensayo,
  puntoFinalDeComprobacion,
  vocabularioDeLaPrincipal,
  type Efectos,
  type ModulosDeLaPrincipal,
  type Salida,
  type VocabularioDeOrigin,
} from './lib/medicion.ts';

const RAIZ = resolve(import.meta.dirname, '..');
const RECEPTOR = join(RAIZ, DIRECTORIO_DEL_RECEPTOR);

/**
 * Lo que puede tardar un programa que no está a la vista. Generoso: la primera vez `npx` baja
 * `wrangler` antes de contestar. Sin tope, un `wrangler` colgado de la red dejaría la orden
 * parada a mitad de la secuencia sin decir qué quedó aplicado.
 */
const TOPE_DE_UN_PROGRAMA_MS = 300_000;

/** Lo que se espera a que el receptor conteste una baliza. */
const TOPE_DE_UNA_BALIZA_MS = 10_000;

const ENTORNO = { ...process.env, WRANGLER_SEND_METRICS: 'false' };

/**
 * Corre un programa y recoge lo que dice, sin lanzar por un código distinto de 0: quien llama
 * decide. Lanza solo si no arranca, si se pasa de su tope o si dice más de lo que cabe. La
 * entrada va cerrada, así que `wrangler` no pregunta nada (sin terminal, `migrations apply`
 * confirma solo).
 */
function correr(programa: string, argumentos: readonly string[], cwd: string): Promise<Salida> {
  return new Promise((listo, fallo) => {
    const hijo = execFile(
      programa,
      [...argumentos],
      { cwd, maxBuffer: 64 * 1024 * 1024, env: ENTORNO, timeout: TOPE_DE_UN_PROGRAMA_MS, killSignal: 'SIGTERM' },
      (error, stdout, stderr) => {
        const datos = error as (NodeJS.ErrnoException & { killed?: boolean; code?: unknown }) | null;
        if (datos?.killed) {
          fallo(new Parada(1, `${programa} no contestó en ${TOPE_DE_UN_PROGRAMA_MS / 1000} s y se cortó.`));
          return;
        }
        if (datos?.code === 'ENOENT' || datos?.code === 'EACCES') {
          fallo(new Parada(1, `${programa} no arranca (${datos.code}).`));
          return;
        }
        if (typeof datos?.code === 'string') {
          fallo(new Parada(1, `${programa} falló (${datos.code}): ${datos.message}`));
          return;
        }
        listo({ codigo: error ? Number(datos?.code ?? 1) || 1 : 0, stdout: String(stdout), stderr: String(stderr) });
      },
    );
    hijo.stdin?.end();
  });
}

/**
 * Corre `wrangler` a la vista de quien lo invoca —migrar y desplegar dicen lo que hacen—, con el
 * mismo tope que `correr`: un `migrations apply --remote` o un `deploy` colgados de la red dejarían
 * la orden parada a mitad sin parte. Al cortarse, la parada lo dice y la secuencia anota que lo que
 * hiciera, entero o a medias, no se sabe.
 */
function wranglerALaVista(argumentos: readonly string[]): Promise<number> {
  return new Promise((listo, fallo) => {
    const hijo = spawn('npx', argumentosDeNpx(argumentos), {
      cwd: RECEPTOR,
      stdio: ['ignore', 'inherit', 'inherit'],
      env: ENTORNO,
    });
    const tope = setTimeout(() => {
      hijo.kill('SIGTERM');
      fallo(
        new Parada(
          1,
          `npx ${WRANGLER} ${argumentos.slice(0, 3).join(' ')} no terminó en ${TOPE_DE_UN_PROGRAMA_MS / 1000} s y se cortó.`,
        ),
      );
    }, TOPE_DE_UN_PROGRAMA_MS);
    hijo.on('error', () => {
      clearTimeout(tope);
      fallo(new Parada(1, `npx ${WRANGLER} no arranca.`));
    });
    hijo.on('close', (codigo) => {
      clearTimeout(tope);
      listo(codigo ?? 1);
    });
  });
}

async function git(argumentos: readonly string[]): Promise<string> {
  const { codigo, stdout, stderr } = await correr('git', argumentos, RAIZ);
  if (codigo !== 0) throw new Parada(1, `git ${argumentos.join(' ')} falló: ${stderr.trim()}`);
  return stdout;
}

/**
 * El vocabulario de `origin/main`: los módulos se sacan con `git show` a una copia temporal
 * **fuera del árbol**, se importan y se borran. Git es historia versionada, no la red: no se hace
 * `fetch`, y vale el `origin/main` que tenga este clon, cuyo commit y fecha se dicen.
 */
async function vocabularioDeOrigin(): Promise<VocabularioDeOrigin> {
  const copia = await mkdtemp(join(tmpdir(), 'sabiduria-medicion-'));
  try {
    const [commit, fecha] = (await git(['log', '-1', '--format=%H %cI', 'origin/main'])).trim().split(' ');
    await writeFile(join(copia, 'package.json'), '{ "type": "module" }\n');
    const presentes = new Set<string>();
    for (const modulo of ['vocabulario', 'medicion', 'destinos', 'redes']) {
      const { codigo, stdout } = await correr('git', ['show', `${commit}:src/lib/${modulo}.ts`], RAIZ);
      if (codigo !== 0) continue;
      await writeFile(join(copia, `${modulo}.ts`), stdout);
      presentes.add(modulo);
    }
    const importar = async (modulo: string) =>
      presentes.has(modulo) ? ((await import(pathToFileURL(join(copia, `${modulo}.ts`)).href)) as never) : undefined;
    // Con `vocabulario.ts` basta él, con sus dos hojas —una prueba fija que no importa nada más—.
    // `medicion.ts` es solo la vuelta atrás a la v7.1: importado siempre, pararía la orden en cuanto
    // la principal le diera otra importación —`umbrales.ts`, `guiones.ts`—, que no se copia aquí.
    const delVocabulario: ModulosDeLaPrincipal['vocabulario'] = await importar('vocabulario');
    const modulos: ModulosDeLaPrincipal = delVocabulario
      ? { vocabulario: delVocabulario }
      : { medicion: await importar('medicion'), destinos: await importar('destinos'), redes: await importar('redes') };
    const vocabulario = vocabularioDeLaPrincipal(modulos);
    if (vocabulario === null) {
      throw new Parada(1, 'origin/main no tiene src/lib/vocabulario.ts ni src/lib/medicion.ts con sus hojas.');
    }
    return { vocabulario, commit, fecha };
  } catch (error) {
    if (error instanceof Parada) throw new Parada(1, `No se pudo leer el vocabulario de origin/main: ${error.message}`);
    throw new Parada(1, `No se pudo leer el vocabulario de origin/main: ${(error as Error).message}`);
  } finally {
    await rm(copia, { recursive: true, force: true });
  }
}

/** Los efectos de verdad que reciben las secuencias de `tools/lib/medicion.ts`. */
const efectos: Efectos = {
  wrangler: (argumentos) => correr('npx', argumentosDeNpx(argumentos), RECEPTOR),
  wranglerALaVista,
  git,
  async enviar(url, cuerpo) {
    try {
      // Sin seguir redirecciones: un POST redirigido con 301 o 302 llega como GET, que el receptor
      // contesta con 204 sin escribir nada, y la baliza parecería aceptada.
      const respuesta = await fetch(url, {
        method: 'POST',
        body: cuerpo,
        redirect: 'manual',
        signal: AbortSignal.timeout(TOPE_DE_UNA_BALIZA_MS),
      });
      return respuesta.status;
    } catch {
      return null;
    }
  },
  async sondear(url) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(TOPE_DE_UNA_BALIZA_MS) });
      return true;
    } catch {
      return false;
    }
  },
  async leerHuella() {
    const ruta = join(RAIZ, RUTA_DE_LA_HUELLA);
    return existsSync(ruta) ? readFile(ruta, 'utf8') : undefined;
  },
  async escribirHuella(texto) {
    await writeFile(join(RAIZ, RUTA_DE_LA_HUELLA), texto);
  },
  async migraciones() {
    const directorio = join(RAIZ, DIRECTORIO_DE_MIGRACIONES);
    const nombres = (await readdir(directorio)).filter((n) => n.endsWith('.sql')).sort();
    return Promise.all(nombres.map(async (nombre) => ({ nombre, sql: await readFile(join(directorio, nombre), 'utf8') })));
  },
  vocabularioDeOrigin,
  receptor: interpretar,
  esperar: (ms) => new Promise((listo) => setTimeout(listo, ms)),
  decir: (texto) => {
    process.stdout.write(`${texto}\n`);
  },
  ahora: () => new Date(),
};

/**
 * El receptor local: aplica las migraciones al D1 local y arranca `wrangler dev` en primer plano,
 * reenviándole las señales, hasta que termine. Ninguno toca nada remoto.
 */
async function local(): Promise<number> {
  if ((await wranglerALaVista(argumentosDeMigracion('local'))) !== 0) {
    throw new Parada(
      1,
      'No se pudieron aplicar las migraciones al D1 local. Si quedó en un estado que no esperan —por ejemplo, ' +
        `creado a mano desde esquema.sql—, bórralo (${DIRECTORIO_DEL_RECEPTOR}/.wrangler/, que no se versiona) y repite.`,
    );
  }
  return new Promise((listo, fallo) => {
    const hijo = spawn('npx', argumentosDeNpx(ARGUMENTOS_DEL_RECEPTOR_LOCAL), {
      cwd: RECEPTOR,
      stdio: 'inherit',
      env: ENTORNO,
    });
    const reenviar = (senal: NodeJS.Signals) => () => hijo.kill(senal);
    for (const senal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(senal, reenviar(senal));
    hijo.on('error', () => fallo(new Parada(1, `npx ${WRANGLER} dev no arranca.`)));
    // Terminar por una de las señales que se le reenvían es pararlo, y sale con 0; morir por otra
    // —un SIGKILL, falta de memoria— es un fallo, y no se calla.
    hijo.on('close', (codigo, senal) =>
      listo(codigo ?? (senal === 'SIGINT' || senal === 'SIGTERM' || senal === 'SIGHUP' ? 0 : 1)),
    );
  });
}

async function principal(): Promise<number> {
  const invocacion = argumentosDeMedicion(process.argv.slice(2));
  if (!invocacion.ok) throw new Parada(2, invocacion.motivo);
  const { subcomando } = invocacion;

  if (subcomando === 'local') return local();
  if (subcomando === 'ensayo') {
    await ensayo(efectos);
    return 0;
  }

  const punto = puntoFinalDeComprobacion(process.env);
  if (!punto.ok) throw new Parada(2, punto.motivo);
  // Cortada a mitad, la secuencia no llega a dar su parte: se dice dónde mirar y cómo se borran
  // las balizas, y sale con 1, como cualquier otra parada.
  for (const senal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(senal, () => {
      process.stderr.write(`\n${avisoDeInterrupcion(senal)}\n`);
      process.exit(1);
    });
  }
  if (subcomando === 'desplegar') await desplegar(efectos, punto.url);
  else await comprobar(efectos, punto.url);
  return 0;
}

principal().then(
  (codigo) => process.exit(codigo),
  (error: unknown) => {
    if (error instanceof Parada) {
      process.stderr.write(`${error.message}\n`);
      process.exit(error.codigo);
    }
    process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
    process.exit(1);
  },
);
