/**
 * El receptor de la medición, desplegado en su orden — AD-13, AD-14, Historia 23.2.
 *
 *   npm run medicion -- desplegar   # migra en remoto, despliega el receptor, lo comprueba,
 *                                   # baraja el rowid y escribe la huella. Acto de Héctor.
 *   npm run medicion -- comprobar   # que el receptor en vivo guarda lo que dice la huella y
 *                                   # numera al azar. Acto de Héctor.
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
 * 2 si la invocación no vale —subcomando o bandera desconocidos—, si falta `MEDICION_ENDPOINT` o
 * no es una dirección http(s), o si `wrangler` no tiene sesión: en los tres casos, antes de tocar
 * nada. 1 para todo lo demás, con el parte de lo que quedó aplicado. Se para en el primer fallo y
 * no reintenta migraciones ni despliegues.
 *
 * ── Red ──────────────────────────────────────────────────────────────────────────────────
 *
 * Es la cáscara (AD-22): `wrangler`, `git`, el disco y el `fetch` de las balizas viven aquí. Lo
 * que decide —argumentos, SQL, balizas, lecturas, cotejos— está en `tools/lib/medicion.ts`, que
 * no pide nada y se prueba con respuestas fijas. El build no la invoca y ningún paso de CI la
 * ejecuta.
 */
import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { interpretar } from '../medicion/receptor.ts';
import { CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1 } from '../src/lib/umbrales.ts';
import {
  ARGUMENTOS_DE_DESPLIEGUE,
  ARGUMENTOS_DE_INFORMACION,
  ARGUMENTOS_DE_SESION,
  ARGUMENTOS_DEL_RECEPTOR_LOCAL,
  DIRECTORIO_DE_MIGRACIONES,
  DIRECTORIO_DEL_RECEPTOR,
  ESPERA_ENTRE_INTENTOS_EN_LOCAL_MS,
  ESPERA_ENTRE_INTENTOS_EN_VIVO_MS,
  INTENTOS_DE_COMPROBACION,
  PUNTO_FINAL_LOCAL,
  RUTA_DE_LA_HUELLA,
  SQL_DE_BARAJADO,
  SQL_DE_BORRADO,
  SQL_DE_COLUMNAS,
  SQL_DE_FILAS,
  SQL_DE_MIGRACIONES_ANOTADAS,
  SQL_DE_RECUENTOS,
  SQL_DE_TABLA_DE_MIGRACIONES,
  WRANGLER,
  argumentosDeConsulta,
  argumentosDeMedicion,
  argumentosDeMigracion,
  argumentosDeNpx,
  balizasDePrueba,
  cabeElBarajado,
  coberturaDelReceptor,
  columnasDelPragma,
  compararRecuentos,
  componerHuella,
  cotejarFilas,
  estadoDeLaTabla,
  huellaDelVocabulario,
  jornadaUtc,
  leerConsulta,
  leerHuella,
  leerInformacion,
  leerSesion,
  parteDeLoAplicado,
  puntoFinalDeComprobacion,
  recuentos,
  rowidAleatorio,
  sqlDeLasBalizas,
  vocabularioDeLaPrincipal,
  type Base,
  type ModulosDeLaPrincipal,
  type VocabularioDeHuella,
} from './lib/medicion.ts';

const RAIZ = resolve(import.meta.dirname, '..');
const RECEPTOR = join(RAIZ, DIRECTORIO_DEL_RECEPTOR);

/** Una parada de la orden: el código con el que sale y lo que dice. */
class Parada extends Error {
  constructor(
    readonly codigo: 1 | 2,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

interface Salida {
  codigo: number;
  stdout: string;
  stderr: string;
}

/**
 * Corre un programa y recoge lo que dice, sin lanzar por un código distinto de 0: quien llama
 * decide. Lanza solo si el programa no arranca. La entrada va cerrada, así que `wrangler` no
 * pregunta nada (sin terminal, `migrations apply` confirma solo).
 */
function correr(programa: string, argumentos: readonly string[], cwd: string): Promise<Salida> {
  return new Promise((listo, fallo) => {
    const hijo = execFile(
      programa,
      [...argumentos],
      { cwd, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } },
      (error, stdout, stderr) => {
        const codigo = (error as (NodeJS.ErrnoException & { code?: unknown }) | null)?.code;
        if (typeof codigo === 'string') {
          fallo(new Parada(1, `${programa} no arranca (${codigo}).`));
          return;
        }
        listo({ codigo: error ? Number(codigo ?? 1) || 1 : 0, stdout: String(stdout), stderr: String(stderr) });
      },
    );
    hijo.stdin?.end();
  });
}

const wrangler = (argumentos: readonly string[]) => correr('npx', argumentosDeNpx(argumentos), RECEPTOR);

/** Corre `wrangler` a la vista de quien lo invoca —migrar y desplegar dicen lo que hacen—. */
function wranglerALaVista(argumentos: readonly string[]): Promise<number> {
  return new Promise((listo, fallo) => {
    const hijo = spawn('npx', argumentosDeNpx(argumentos), {
      cwd: RECEPTOR,
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    });
    hijo.on('error', () => fallo(new Parada(1, `npx ${WRANGLER} no arranca.`)));
    hijo.on('close', (codigo) => listo(codigo ?? 1));
  });
}

/** Una sentencia contra la base: sus filas, o una parada con lo que dijo D1. */
async function consultar(sql: string, base: Base, que: string): Promise<Record<string, unknown>[]> {
  const { stdout } = await wrangler(argumentosDeConsulta(sql, base));
  const leido = leerConsulta(stdout);
  if (!leido.ok) throw new Parada(1, `No se pudo ${que}: ${leido.motivo}`);
  return leido.filas;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const decir = (texto: string) => process.stdout.write(`${texto}\n`);

async function git(argumentos: readonly string[]): Promise<string> {
  const { codigo, stdout, stderr } = await correr('git', argumentos, RAIZ);
  if (codigo !== 0) throw new Parada(1, `git ${argumentos.join(' ')} falló: ${stderr.trim()}`);
  return stdout;
}

/** Que `wrangler` tenga sesión, sin la cual nada remoto responde: 2 si no la tiene. */
async function exigirSesion(): Promise<void> {
  const { stdout } = await wrangler(ARGUMENTOS_DE_SESION);
  const sesion = leerSesion(stdout);
  if (sesion === 'sin-sesion') {
    throw new Parada(
      2,
      `wrangler no tiene sesión. En ${DIRECTORIO_DEL_RECEPTOR}/: npx --yes ${WRANGLER} login, y repite.`,
    );
  }
  if (sesion === 'ilegible') throw new Parada(1, `npx ${WRANGLER} whoami --json no contestó lo esperado.`);
}

/** La huella versionada, si la hay; una parada si está y no se deja leer. */
async function huellaVersionada() {
  const ruta = join(RAIZ, RUTA_DE_LA_HUELLA);
  if (!existsSync(ruta)) return undefined;
  const leida = leerHuella(await readFile(ruta, 'utf8'));
  if (!leida.ok) throw new Parada(1, `${RUTA_DE_LA_HUELLA} no se deja leer: ${leida.motivos.join(' ')}`);
  return leida.huella;
}

/**
 * El vocabulario de `origin/main`, cuando no hay huella: los módulos se sacan con `git show` a
 * una copia temporal **fuera del árbol**, se importan y se borran. Git es historia versionada,
 * no la red: no se hace `fetch`, y vale el `origin/main` que tenga este clon.
 */
async function vocabularioDeOrigin(): Promise<VocabularioDeHuella> {
  const copia = await mkdtemp(join(tmpdir(), 'sabiduria-medicion-'));
  try {
    await writeFile(join(copia, 'package.json'), '{ "type": "module" }\n');
    const presentes = new Set<string>();
    for (const modulo of ['vocabulario', 'medicion', 'destinos', 'redes']) {
      const { codigo, stdout } = await correr('git', ['show', `origin/main:src/lib/${modulo}.ts`], RAIZ);
      if (codigo !== 0) continue;
      await writeFile(join(copia, `${modulo}.ts`), stdout);
      presentes.add(modulo);
    }
    const importar = async (modulo: string) =>
      presentes.has(modulo) ? ((await import(pathToFileURL(join(copia, `${modulo}.ts`)).href)) as never) : undefined;
    const modulos: ModulosDeLaPrincipal = {
      vocabulario: await importar('vocabulario'),
      medicion: await importar('medicion'),
      destinos: await importar('destinos'),
      redes: await importar('redes'),
    };
    const vocabulario = vocabularioDeLaPrincipal(modulos);
    if (vocabulario === null) {
      throw new Parada(1, 'origin/main no tiene src/lib/vocabulario.ts ni src/lib/medicion.ts con sus hojas.');
    }
    return vocabulario;
  } catch (error) {
    if (error instanceof Parada) throw error;
    throw new Parada(1, `No se pudo leer el vocabulario de origin/main: ${(error as Error).message}`);
  } finally {
    await rm(copia, { recursive: true, force: true });
  }
}

async function migraciones() {
  const directorio = join(RAIZ, DIRECTORIO_DE_MIGRACIONES);
  const nombres = (await readdir(directorio)).filter((n) => n.endsWith('.sql')).sort();
  return Promise.all(nombres.map(async (nombre) => ({ nombre, sql: await readFile(join(directorio, nombre), 'utf8') })));
}

/**
 * La comprobación con balizas: borra los restos de otra, envía una baliza por cada valor del
 * vocabulario, las lee con su `rowid` como texto y las coteja con lo esperado. Hasta tres
 * intentos, porque un receptor recién desplegado tarda en llegar a todas partes. Devuelve los
 * `rowid` leídos; si no casan, una parada con cada diferencia.
 */
async function comprobarConBalizas(
  url: string,
  base: Base,
  vocabulario: VocabularioDeHuella,
  espera: number,
): Promise<string[]> {
  const { balizas, esperadas, campos } = balizasDePrueba(vocabulario);
  let diferencias: string[] = [];
  for (let intento = 1; intento <= INTENTOS_DE_COMPROBACION; intento++) {
    if (intento > 1) await esperar(espera);
    await consultar(SQL_DE_BORRADO, base, 'borrar las balizas de un intento anterior');
    let rechazadas = 0;
    for (const baliza of balizas) {
      try {
        const respuesta = await fetch(url, { method: 'POST', body: JSON.stringify(baliza) });
        if (respuesta.status !== 204) rechazadas++;
      } catch {
        rechazadas++;
      }
    }
    const leidas = await consultar(sqlDeLasBalizas(campos), base, 'leer las balizas de prueba');
    diferencias = [
      ...(rechazadas > 0 ? [`${rechazadas} de ${balizas.length} balizas no recibieron un 204.`] : []),
      ...cotejarFilas(esperadas, leidas, campos),
    ];
    decir(
      `Intento ${intento} de ${INTENTOS_DE_COMPROBACION}: ${balizas.length} balizas enviadas, ` +
        `${leidas.length} filas leídas${diferencias.length === 0 ? ', y casan.' : `, ${diferencias.length} diferencias.`}`,
    );
    if (diferencias.length === 0) return leidas.map((fila) => String(fila.fila));
  }
  // Lo que quedó de las balizas no se deja en la tabla: sería una visita a una ruta que no existe.
  try {
    await consultar(SQL_DE_BORRADO, base, 'borrar las balizas de prueba');
  } catch {
    // Si tampoco se pudo borrar, el recuento por evento de DESPLIEGUE.md §3 las enseña.
  }
  throw new Parada(
    1,
    `Las balizas no se vieron como se esperaba tras ${INTENTOS_DE_COMPROBACION} intentos:\n  ` +
      diferencias.slice(0, 40).join('\n  ') +
      (diferencias.length > 40 ? `\n  … y ${diferencias.length - 40} más.` : ''),
  );
}

/** Que el `rowid` de las balizas sea aleatorio; si no, una parada que lo dice. */
function exigirRowidAleatorio(filas: readonly string[], cierre: string): void {
  const orden = rowidAleatorio(filas);
  if (orden === 'contiguo') {
    throw new Parada(
      1,
      `El receptor numera las filas en orden de llegada: los rowid de las balizas son contiguos (${filas.join(', ')}). ` +
        `Es un receptor anterior a la 23.12, también tras una vuelta atrás. No se baraja. ${cierre}`,
    );
  }
  if (orden === 'insuficiente') {
    throw new Parada(1, `No hay dos balizas con rowid legible para juzgar el orden. ${cierre}`);
  }
}

async function desplegar(url: string): Promise<void> {
  const aplicado: string[] = [];
  try {
    await exigirSesion();

    const cambios = await git(['status', '--porcelain', '--', 'medicion', 'src/lib']);
    if (cambios.trim() !== '') {
      throw new Parada(
        1,
        `Hay cambios sin commitear en medicion/ o src/lib/:\n${cambios.trimEnd()}\n` +
          'La huella nombra un commit, y el commit tiene que contener lo que se despliega.',
      );
    }
    const commit = (await git(['rev-parse', 'HEAD'])).trim();

    const versionada = await huellaVersionada();
    let referencia: VocabularioDeHuella;
    if (versionada) {
      decir(`Referencia: la huella versionada (${versionada.commit}, ${versionada.escritaEl}).`);
      referencia = versionada.vocabulario;
    } else {
      decir(`Sin huella versionada en ${RUTA_DE_LA_HUELLA}: la referencia es el vocabulario de origin/main.`);
      referencia = await vocabularioDeOrigin();
    }
    const faltas = coberturaDelReceptor(interpretar, referencia);
    if (faltas.length > 0) {
      throw new Parada(
        1,
        `El receptor de esta rama no guarda todo lo que envía el sitio en vivo:\n  ${faltas.join('\n  ')}`,
      );
    }

    const hoy = jornadaUtc(new Date());
    const antes = recuentos(await consultar(SQL_DE_RECUENTOS, 'remota', 'contar las filas de antes'));
    const columnas = columnasDelPragma(await consultar(SQL_DE_COLUMNAS, 'remota', 'leer las columnas'));
    const conTabla = (await consultar(SQL_DE_TABLA_DE_MIGRACIONES, 'remota', 'buscar d1_migrations')).length > 0;
    const anotadas = conTabla
      ? (await consultar(SQL_DE_MIGRACIONES_ANOTADAS, 'remota', 'leer d1_migrations')).map((f) => String(f.name))
      : [];
    const estado = estadoDeLaTabla(columnas, anotadas, await migraciones());
    if (estado.estado === 'otra') throw new Parada(1, `No se migra: ${estado.motivo}`);
    decir(
      `La tabla está ${estado.estado}` +
        (estado.pendientes.length > 0 ? `; faltan ${estado.pendientes.join(', ')}.` : '; no falta ninguna migración.'),
    );

    if ((await wranglerALaVista(argumentosDeMigracion('remota'))) !== 0) {
      throw new Parada(1, 'La migración en remoto falló. Lo aplicado lo dice d1_migrations; no se reintenta.');
    }
    aplicado.push('las migraciones en remoto');

    if ((await wranglerALaVista(ARGUMENTOS_DE_DESPLIEGUE)) !== 0) {
      throw new Parada(1, 'El despliegue del receptor falló; no se reintenta.');
    }
    aplicado.push('el receptor desplegado');

    const filasDePrueba = await comprobarConBalizas(url, 'remota', huellaDelVocabulario(), ESPERA_ENTRE_INTENTOS_EN_VIVO_MS);
    aplicado.push('la comprobación con balizas');
    // Se borran antes de juzgar el orden: con un receptor que numera en orden de llegada, la
    // orden se para ahí y las balizas no deben quedarse en la tabla como visitas.
    await consultar(SQL_DE_BORRADO, 'remota', 'borrar las balizas de prueba');
    aplicado.push('las balizas borradas');
    exigirRowidAleatorio(filasDePrueba, 'Lo cierra el siguiente despliegue que pase la comprobación.');

    const { stdout } = await wrangler(ARGUMENTOS_DE_INFORMACION);
    const informacion = leerInformacion(stdout);
    if (!informacion.ok) throw new Parada(1, `No se baraja: ${informacion.motivo}`);
    const [{ n: filas } = { n: 0 }] = await consultar(SQL_DE_FILAS, 'remota', 'contar las filas');
    const barajado = cabeElBarajado({
      filas: Number(filas),
      escritas24h: informacion.escritas24h,
      cuota: CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1,
    });
    if (!barajado.cabe) throw new Parada(1, barajado.mensaje);
    decir(barajado.mensaje);

    await consultar(SQL_DE_BARAJADO, 'remota', 'barajar el rowid');
    aplicado.push('el rowid barajado');

    const despues = recuentos(await consultar(SQL_DE_RECUENTOS, 'remota', 'contar las filas de después'));
    const diferencias = compararRecuentos(antes, despues, hoy);
    if (diferencias.length > 0) {
      throw new Parada(1, `Los recuentos de antes y de después no casan:\n  ${diferencias.join('\n  ')}`);
    }

    const texto = componerHuella({ escritaEl: jornadaUtc(new Date()), commit, vocabulario: huellaDelVocabulario() });
    await writeFile(join(RAIZ, RUTA_DE_LA_HUELLA), texto);
    aplicado.push(`la huella escrita en ${RUTA_DE_LA_HUELLA}`);
    decir(
      `${parteDeLoAplicado(aplicado)}\n` +
        `Commitea ${RUTA_DE_LA_HUELLA}: es lo que devuelve npm test a verde. El sitio se despliega después.`,
    );
  } catch (error) {
    if (error instanceof Parada) {
      throw new Parada(error.codigo, `${error.message}\n${parteDeLoAplicado(aplicado)}`);
    }
    throw error;
  }
}

async function comprobar(url: string): Promise<void> {
  await exigirSesion();
  const huella = await huellaVersionada();
  if (!huella) {
    throw new Parada(
      1,
      `No hay huella en ${RUTA_DE_LA_HUELLA}: la escribe npm run medicion -- desplegar (Historia 23.3).`,
    );
  }
  const cierre = 'La cierra repetir la 23.3: npm run medicion -- desplegar.';
  let filas: string[];
  try {
    filas = await comprobarConBalizas(url, 'remota', huella.vocabulario, ESPERA_ENTRE_INTENTOS_EN_VIVO_MS);
  } catch (error) {
    if (error instanceof Parada) throw new Parada(error.codigo, `${error.message}\n${cierre}`);
    throw error;
  }
  await consultar(SQL_DE_BORRADO, 'remota', 'borrar las balizas de prueba');
  exigirRowidAleatorio(filas, cierre);
  decir(
    `El receptor en vivo guarda cada evento y cada valor de la huella (${huella.commit}), numera al azar ` +
      'y las balizas se borraron.',
  );
}

async function ensayo(): Promise<void> {
  try {
    await fetch(PUNTO_FINAL_LOCAL);
  } catch {
    throw new Parada(1, `El receptor local no responde en ${PUNTO_FINAL_LOCAL}: arráncalo con npm run medicion -- local.`);
  }
  const filas = await comprobarConBalizas(PUNTO_FINAL_LOCAL, 'local', huellaDelVocabulario(), ESPERA_ENTRE_INTENTOS_EN_LOCAL_MS);
  await consultar(SQL_DE_BORRADO, 'local', 'borrar las balizas de prueba');
  exigirRowidAleatorio(filas, 'El receptor local es el de esta rama: mira medicion/worker.ts.');
  decir(
    'Cada evento y cada valor del vocabulario llegó al D1 local, el rowid es aleatorio y las balizas se borraron.',
  );
}

/**
 * El receptor local: aplica las migraciones al D1 local y arranca `wrangler dev` en primer plano,
 * reenviándole las señales, hasta que termine. Ninguno toca nada remoto.
 */
async function local(): Promise<number> {
  if ((await wranglerALaVista(argumentosDeMigracion('local'))) !== 0) {
    throw new Parada(1, 'No se pudieron aplicar las migraciones al D1 local.');
  }
  return new Promise((listo, fallo) => {
    const hijo = spawn('npx', argumentosDeNpx(ARGUMENTOS_DEL_RECEPTOR_LOCAL), {
      cwd: RECEPTOR,
      stdio: 'inherit',
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    });
    const reenviar = (senal: NodeJS.Signals) => () => hijo.kill(senal);
    for (const senal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(senal, reenviar(senal));
    hijo.on('error', () => fallo(new Parada(1, `npx ${WRANGLER} dev no arranca.`)));
    hijo.on('close', (codigo, senal) => listo(codigo ?? (senal ? 0 : 1)));
  });
}

async function principal(): Promise<number> {
  const invocacion = argumentosDeMedicion(process.argv.slice(2));
  if (!invocacion.ok) throw new Parada(2, invocacion.motivo);
  const { subcomando } = invocacion;

  if (subcomando === 'local') return local();
  if (subcomando === 'ensayo') {
    await ensayo();
    return 0;
  }

  const punto = puntoFinalDeComprobacion(process.env);
  if (!punto.ok) throw new Parada(2, punto.motivo);
  if (subcomando === 'desplegar') await desplegar(punto.url);
  else await comprobar(punto.url);
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
