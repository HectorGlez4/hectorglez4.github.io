/**
 * La parte pura de `npm run medicion` — AD-13, AD-14, AD-22, Historia 23.2.
 *
 * Aquí se decide todo lo que la orden hace y nada se hace: qué argumentos lleva cada orden de
 * `wrangler`, qué SQL se envía, qué balizas de prueba cubren el vocabulario, cómo se lee lo que
 * contesta D1, si el `rowid` es aleatorio, si el barajado cabe en la cuota del día, si los
 * recuentos de antes y de después casan y cómo se escribe y se lee la huella. También el orden
 * de cada subcomando —`desplegar`, `comprobar`, `ensayo`— y dónde se para, como secuencias que
 * reciben sus efectos (`Efectos`). La red, los procesos y el disco son de la cáscara,
 * `tools/medicion.ts`, y esto se prueba con respuestas fijas en
 * `tests/unit/medicion-orden.test.ts` y con un D1 en memoria en
 * `tests/unit/medicion-secuencias.test.ts`, sin tocar ningún D1.
 *
 * Desde la Historia 23.10 también la lectura de la línea base, `npm run medicion` sin
 * subcomando: la invocación, sus cinco consultas (`consultasDeLaLectura`) y su secuencia (`leer`).
 * Lo que se hace con lo leído —descuentos, censo, tramos, tasas, líneas base y el informe— es de
 * `tools/lib/lineaBase.ts`, puro.
 *
 * Desde la Historia 23.13, el juez de las dos cuotas de D1 que muerden a estas órdenes —la de
 * escritura del barajado y la de lectura de las tres que recorren `eventos`— (`juzgarCuota`), y la
 * lista declarada de lo que cada una recorre (`recorridosDeLaLectura`, `recorridosDeDesplegar`,
 * `recorridosDeComprobar`), de la que sale su coste: ninguna orden escribe su propio juicio.
 *
 * Ningún SQL de aquí ordena: el `rowid` es aleatorio (Historia 23.12) y solo lo nombran dos
 * sentencias, la lectura de las balizas de prueba, como texto, y el barajado. Ninguna otra lo
 * nombra, tampoco las de la lectura, y `tests/unit/orden-de-llegada.test.ts` lo vigila en todo
 * `tools/`.
 */

import * as vocabularioDeLaRama from '../../src/lib/vocabulario.ts';
import type { DeclaracionDeCampo } from '../../src/lib/vocabulario.ts';
import { CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1, CUOTA_DE_FILAS_LEIDAS_POR_DIA_EN_D1 } from '../../src/lib/umbrales.ts';
import { EVENTOS_DE_LA_V71, type Registro } from '../../medicion/receptor.ts';
import { motivosDeArgumentosNoReconocidos } from './cli.ts';

/** La versión de `wrangler`, fijada: nunca `latest`, nunca la de `package.json` (que no la tiene). */
export const WRANGLER = 'wrangler@4.151.1';

/** El directorio del receptor, donde vive `wrangler.toml`: toda orden de `wrangler` corre ahí. */
export const DIRECTORIO_DEL_RECEPTOR = 'medicion';

/** El nombre de la base en `wrangler.toml`. */
export const BASE_DE_DATOS = 'medicion';

/** Las migraciones, relativas a la raíz del repositorio (`migrations_dir` de `wrangler.toml`). */
export const DIRECTORIO_DE_MIGRACIONES = 'medicion/migrations';

/**
 * La ruta de las balizas de prueba: ninguna página la publica, así que sus filas no se
 * confunden con una visita, y las lecturas la descuentan.
 */
export const RUTA_DE_COMPROBACION = '/__comprobacion/';

/** La huella del vocabulario desplegado, relativa a la raíz. Solo la escribe `desplegar`. */
export const RUTA_DE_LA_HUELLA = 'medicion/huella-del-vocabulario.json';

/** El puerto de `wrangler dev` en `npm run medicion -- local`, y el de `playwright.config.ts`. */
export const PUERTO_DEL_RECEPTOR_LOCAL = 8787;

/** El receptor local, tal como lo pide un sitio construido para las pruebas. */
export const PUNTO_FINAL_LOCAL = `http://localhost:${PUERTO_DEL_RECEPTOR_LOCAL}/`;

/**
 * Lo que cuesta barajar una fila: la fila y sus entradas en los dos índices, que D1 cuenta
 * contra la cuota de escritura del día (AD-13).
 */
export const FILAS_ESCRITAS_POR_FILA_BARAJADA = 3;

/** Cuántas veces se envían y se buscan las balizas antes de dar la comprobación por fallida. */
export const INTENTOS_DE_COMPROBACION = 3;

/**
 * Cuánto se espera entre intentos contra el receptor en vivo: lo que tarda un despliegue en
 * llegar a todas partes. Contra el local basta un instante.
 */
export const ESPERA_ENTRE_INTENTOS_EN_VIVO_MS = 10_000;
export const ESPERA_ENTRE_INTENTOS_EN_LOCAL_MS = 1_000;

/** El texto que llevan las balizas de prueba en un campo de texto libre. */
export const TEXTO_DE_PRUEBA = 'comprobacion';

/**
 * Los subcomandos, y nada más: ni banderas ni argumentos sueltos. Sin subcomando, la orden es la
 * lectura de la línea base (Historia 23.10).
 */
export const SUBCOMANDOS = ['desplegar', 'comprobar', 'local', 'ensayo'] as const;
export type Subcomando = (typeof SUBCOMANDOS)[number];

/** Contra qué base corre una orden de `d1`: siempre explícito, nunca por omisión. */
export type Base = 'remota' | 'local';

const BANDERA_DE_BASE: { readonly [B in Base]: string } = { remota: '--remote', local: '--local' };

// ── Las órdenes de `wrangler` ─────────────────────────────────────────────────────────────

/** Lo que se pasa a `npx`: la versión fijada delante, y `--yes` para que no pregunte. */
export function argumentosDeNpx(argumentos: readonly string[]): string[] {
  return ['--yes', WRANGLER, ...argumentos];
}

/** ¿Hay sesión? Sin `--json` contesta en prosa; con él, sale distinto de 0 si no la hay. */
export const ARGUMENTOS_DE_SESION: readonly string[] = ['whoami', '--json'];

/** Despliega el receptor de `wrangler.toml`. */
export const ARGUMENTOS_DE_DESPLIEGUE: readonly string[] = ['deploy'];

/** Una sola sentencia contra la base, con `--remote` o `--local` siempre explícito. */
export function argumentosDeConsulta(sql: string, base: Base): string[] {
  return ['d1', 'execute', BASE_DE_DATOS, BANDERA_DE_BASE[base], '--json', '--command', sql];
}

/** Aplica las migraciones que falten, con `--remote` o `--local` siempre explícito. */
export function argumentosDeMigracion(base: Base): string[] {
  return ['d1', 'migrations', 'apply', BASE_DE_DATOS, BANDERA_DE_BASE[base]];
}

/** El estado de la base remota: tamaño y filas escritas en 24 h. Solo existe en remoto. */
export const ARGUMENTOS_DE_INFORMACION: readonly string[] = ['d1', 'info', BASE_DE_DATOS, '--json'];

/** El receptor local: `wrangler dev` en el puerto fijo y sin ningún enlace remoto. */
export const ARGUMENTOS_DEL_RECEPTOR_LOCAL: readonly string[] = [
  'dev',
  '--port',
  String(PUERTO_DEL_RECEPTOR_LOCAL),
  '--local',
];

// ── El SQL ────────────────────────────────────────────────────────────────────────────────

/** Las columnas de la tabla, con su tipo y si admiten nulo. */
export const SQL_DE_COLUMNAS = 'PRAGMA table_info(eventos)';

/** Si la base tiene tabla de migraciones: una base de antes de la 23.2 no la tiene. */
export const SQL_DE_TABLA_DE_MIGRACIONES =
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'd1_migrations'";

/** Las migraciones que `wrangler` anotó como aplicadas. */
export const SQL_DE_MIGRACIONES_ANOTADAS = 'SELECT name FROM d1_migrations';

/**
 * Los recuentos por jornada y evento, sin las balizas de prueba. Solo se cuenta: no se copia ni
 * se guarda ninguna fila (AD-13).
 */
export const SQL_DE_RECUENTOS =
  `SELECT jornada, evento, COUNT(*) AS n FROM eventos WHERE ruta <> '${RUTA_DE_COMPROBACION}' ` +
  'GROUP BY jornada, evento';

/** Las filas de la tabla, para el coste del barajado. */
export const SQL_DE_FILAS = 'SELECT COUNT(*) AS n FROM eventos';

/** Borra las balizas de prueba, las de este intento y las que quedaran de otro. */
export const SQL_DE_BORRADO = `DELETE FROM eventos WHERE ruta = '${RUTA_DE_COMPROBACION}'`;

/**
 * Baraja el `rowid` de lo ya escrito (Historia 23.12): reescribe cada fila con uno aleatorio,
 * así que el orden físico deja de ser el de llegada. Es idempotente y no es una migración.
 */
export const SQL_DE_BARAJADO = 'UPDATE eventos SET rowid = abs(random())';

/** Lo que puede ser el nombre de una columna en el SQL que compone esta orden. */
export const IDENTIFICADOR_DE_COLUMNA = /^[a-z][a-z0-9_]*$/;

/**
 * Las balizas de prueba tal como quedaron, con el `rowid` leído como texto —un entero de 64
 * bits se redondea en JavaScript— y las columnas de los campos que se comprueban. Los campos
 * salen de un vocabulario —el de la rama o el de la huella versionada—, y solo un
 * identificador entra en el SQL: otra cosa lanza.
 */
export function sqlDeLasBalizas(campos: readonly string[]): string {
  const ajeno = campos.find((campo) => !IDENTIFICADOR_DE_COLUMNA.test(campo));
  if (ajeno !== undefined) throw new Error(`«${ajeno}» no es un nombre de columna.`);
  const columnas = ['evento', 'ruta', ...campos].join(', ');
  return (
    `SELECT CAST(rowid AS TEXT) AS fila, ${columnas} FROM eventos ` +
    `WHERE ruta = '${RUTA_DE_COMPROBACION}'`
  );
}

// ── El SQL de la lectura de la línea base (Historia 23.10) ───────────────────────────────

/** Las cinco consultas de la lectura: una por grupo de eventos, para que un fallo no las vacíe todas. */
export const CONSULTAS_DE_LA_LECTURA = ['vistasYLecturas', 'salidas', 'acciones', 'busquedas', 'sinResultados'] as const;
export type ConsultaDeLaLectura = (typeof CONSULTAS_DE_LA_LECTURA)[number];

/** Lo que lee cada consulta, como lo nombra el informe cuando falta. */
export const QUE_LEE: { readonly [C in ConsultaDeLaLectura]: string } = {
  vistasYLecturas: 'las vistas y las lecturas',
  salidas: 'las salidas internas',
  acciones: 'las acciones',
  busquedas: 'las búsquedas asentadas',
  sinResultados: 'las búsquedas sin resultados',
};

const { EVENTOS } = vocabularioDeLaRama;

/**
 * Los eventos y las columnas de cada consulta — AD-13, NFR-11. Solo recuentos por jornada, ruta,
 * evento y campo: ni sesiones ni recorridos. Los eventos salen del vocabulario, nunca escritos.
 */
const FORMA_DE_LA_CONSULTA: {
  readonly [C in ConsultaDeLaLectura]: { eventos: readonly string[]; columnas: readonly string[] };
} = {
  vistasYLecturas: {
    eventos: [EVENTOS.vistaDeCita, EVENTOS.vistaDeSuperficie, EVENTOS.vistaDeObra, EVENTOS.lectura],
    columnas: ['jornada', 'ruta', 'evento', 'origen', 'via', 'indexable'],
  },
  salidas: { eventos: [EVENTOS.salidaInterna], columnas: ['jornada', 'ruta', 'zona'] },
  acciones: {
    eventos: [EVENTOS.copiado, EVENTOS.descargaDeImagen, EVENTOS.comparticionDeImagen, EVENTOS.comparticionDeEnlace],
    columnas: ['jornada', 'ruta', 'evento', 'destino', 'primera'],
  },
  busquedas: { eventos: [EVENTOS.busqueda], columnas: ['jornada', 'ruta', 'tramo', 'filtros'] },
  // La ruta va también aquí, aunque la consulta sin resultados salga siempre de `/buscar/`: sin
  // ella no se podrían descontar las pasadas en producción, que se descuentan por ruta.
  sinResultados: { eventos: [EVENTOS.busquedaSinResultados], columnas: ['jornada', 'ruta', 'consulta'] },
};

/** Lo que tiene forma de jornada: lo único que entra en el SQL de la lectura además de constantes. */
export const FORMA_DE_JORNADA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Las cinco sentencias de la lectura, todas de solo lectura y con la misma forma: los recuentos
 * agrupados de las jornadas **cerradas** —anteriores a `hoy`, en UTC— sin las balizas de prueba,
 * sin `ORDER BY` —se ordena en JavaScript— y sin nombrar el `rowid`. Cada una recorre la tabla una
 * vez, y D1 cuenta lo leído contra su cuota de lectura: con el `COUNT(*)` que da N, son los
 * recorridos que declara `recorridosDeLaLectura` (Historia 23.13).
 *
 * `hoy` se juzga antes de entrar en el SQL: otra cosa que una jornada lanza.
 */
export function consultasDeLaLectura(hoy: string): { readonly [C in ConsultaDeLaLectura]: string } {
  if (!FORMA_DE_JORNADA.test(hoy)) throw new Error(`«${hoy}» no es una jornada AAAA-MM-DD.`);
  const sentencia = ({ eventos, columnas }: { eventos: readonly string[]; columnas: readonly string[] }) => {
    const dimensiones = columnas.join(', ');
    const lista = eventos.map((evento) => `'${evento}'`).join(', ');
    return (
      `SELECT ${dimensiones}, COUNT(*) AS n FROM eventos WHERE jornada < '${hoy}' ` +
      `AND ruta <> '${RUTA_DE_COMPROBACION}' AND evento IN (${lista}) GROUP BY ${dimensiones}`
    );
  };
  return {
    vistasYLecturas: sentencia(FORMA_DE_LA_CONSULTA.vistasYLecturas),
    salidas: sentencia(FORMA_DE_LA_CONSULTA.salidas),
    acciones: sentencia(FORMA_DE_LA_CONSULTA.acciones),
    busquedas: sentencia(FORMA_DE_LA_CONSULTA.busquedas),
    sinResultados: sentencia(FORMA_DE_LA_CONSULTA.sinResultados),
  };
}

// ── La invocación ─────────────────────────────────────────────────────────────────────────

/** `subcomando: null` es la lectura de la línea base: la orden sin nada detrás (Historia 23.10). */
export type Invocacion = { ok: true; subcomando: Subcomando | null } | { ok: false; motivo: string };

/** Cómo se usa la orden: la lectura a secas, o uno de los subcomandos. */
export const USO_DE_MEDICION = `Uso: npm run medicion [-- ${SUBCOMANDOS.join(' | ')}]`;

/**
 * El subcomando —`null` para la lectura—, o por qué la invocación no vale (código 2, sin tocar
 * nada). La lectura no lleva opciones: una bandera o un argumento suelto, solos o detrás de un
 * subcomando, no son «lo mismo pero sin ellos».
 */
export function argumentosDeMedicion(argumentos: readonly string[]): Invocacion {
  const [primero, ...resto] = argumentos;
  if (primero === undefined) return { ok: true, subcomando: null };
  if (!(SUBCOMANDOS as readonly string[]).includes(primero)) {
    if (primero.startsWith('-')) {
      // Una bandera delante de un subcomando no es la lectura con opciones: es el subcomando mal
      // escrito, y se dice así.
      const subcomando = resto.find((argumento) => (SUBCOMANDOS as readonly string[]).includes(argumento));
      const motivos = motivosDeArgumentosNoReconocidos(
        subcomando === undefined ? [...argumentos] : argumentos.filter((a) => a !== subcomando),
        { solas: [], conValor: [] },
      );
      const despues =
        subcomando === undefined
          ? 'La lectura no lleva opciones.'
          : `El subcomando va primero, y sin opciones: npm run medicion -- ${subcomando}.`;
      return { ok: false, motivo: `${motivos.join(' ')} ${despues} ${USO_DE_MEDICION}` };
    }
    return { ok: false, motivo: `«${primero}» no es un subcomando de esta orden. ${USO_DE_MEDICION}` };
  }
  const motivos = motivosDeArgumentosNoReconocidos([...resto], { solas: [], conValor: [] });
  if (motivos.length > 0) return { ok: false, motivo: `${motivos.join(' ')} ${USO_DE_MEDICION}` };
  return { ok: true, subcomando: primero as Subcomando };
}

export type PuntoFinal = { ok: true; url: string } | { ok: false; motivo: string };

/**
 * La dirección del receptor en vivo, de `MEDICION_ENDPOINT`. Sin ella, o sin `http(s)://`, la
 * orden se para antes de cualquier red (código 2), y el motivo **no repite el valor**: es un
 * secreto del repositorio.
 */
export function puntoFinalDeComprobacion(entorno: Record<string, string | undefined>): PuntoFinal {
  const url = entorno.MEDICION_ENDPOINT?.trim();
  if (!url) {
    return {
      ok: false,
      motivo:
        'Falta MEDICION_ENDPOINT: la dirección del receptor en vivo, la misma que el secreto del ' +
        'repositorio (DESPLIEGUE.md §3). Sin ella no se puede enviar la baliza de prueba.',
    };
  }
  let direccion: URL;
  try {
    direccion = new URL(url);
  } catch {
    return { ok: false, motivo: 'MEDICION_ENDPOINT no es una dirección http(s).' };
  }
  if (direccion.protocol !== 'http:' && direccion.protocol !== 'https:') {
    return { ok: false, motivo: 'MEDICION_ENDPOINT no es una dirección http(s).' };
  }
  // `desplegar` y `comprobar` leen el D1 remoto: con las balizas enviadas a un receptor local,
  // migraría y desplegaría en remoto para pararse después sin haber visto ninguna.
  if (esHostLocal(direccion.hostname)) {
    return {
      ok: false,
      motivo:
        'MEDICION_ENDPOINT apunta a un receptor local, y desplegar y comprobar leen el D1 remoto. ' +
        'Contra el local está npm run medicion -- ensayo.',
    };
  }
  return { ok: true, url };
}

/**
 * Si un nombre de máquina es la propia, que nunca es el receptor en vivo: `localhost` y sus
 * subdominios (también con el punto final), todo `127.0.0.0/8` —`URL` ya escribe `127.1` como
 * `127.0.0.1`—, `0.0.0.0`, y en IPv6 `::1`, `::` y la IPv4 de bucle escrita como IPv6.
 */
export function esHostLocal(nombre: string): boolean {
  const h = nombre.toLowerCase().replace(/\.$/, '');
  return (
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    /^127\.\d+\.\d+\.\d+$/.test(h) ||
    h === '0.0.0.0' ||
    h === '[::1]' ||
    h === '[::]' ||
    /^\[::ffff:(7f[0-9a-f]{2}:[0-9a-f]{1,4}|127\.\d+\.\d+\.\d+)\]$/.test(h)
  );
}

// ── Lo que contesta `wrangler` ────────────────────────────────────────────────────────────

export type Sesion = 'con-sesion' | 'sin-sesion' | 'ilegible';

/** `whoami --json`: `{ loggedIn: true, … }` con sesión, `{ loggedIn: false }` sin ella. */
export function leerSesion(salida: string): Sesion {
  try {
    const dato = JSON.parse(salida) as unknown;
    if (typeof dato !== 'object' || dato === null) return 'ilegible';
    const { loggedIn } = dato as { loggedIn?: unknown };
    if (loggedIn === true) return 'con-sesion';
    if (loggedIn === false) return 'sin-sesion';
    return 'ilegible';
  } catch {
    return 'ilegible';
  }
}

/**
 * Las filas de una consulta y, si D1 lo dice, las que leyó para darlas (`meta.rows_read`, Historia
 * 23.13): la medida de lo gastado, que la estimación de la cuota de lectura no sustituye.
 */
export type Filas = { ok: true; filas: Record<string, unknown>[]; leidas?: number } | { ok: false; motivo: string };

/** Las filas leídas que dice `meta.rows_read`, sumadas; `undefined` si alguna respuesta no lo trae. */
function filasLeidasDe(respuestas: readonly unknown[]): number | undefined {
  let suma = 0;
  for (const respuesta of respuestas) {
    const leidas = (respuesta as { meta?: { rows_read?: unknown } } | null)?.meta?.rows_read;
    if (typeof leidas !== 'number' || !Number.isFinite(leidas) || leidas < 0) return undefined;
    suma += leidas;
  }
  return respuestas.length === 0 ? undefined : suma;
}

/**
 * `d1 execute --json` de una sola sentencia: `[{ results: [...], success: true, meta }]`; si falla,
 * `{ error: { text } }`. De `meta.rows_read` salen las filas leídas, cuando D1 lo trae.
 */
export function leerConsulta(salida: string): Filas {
  let dato: unknown;
  try {
    dato = JSON.parse(salida);
  } catch {
    return { ok: false, motivo: 'wrangler no contestó JSON.' };
  }
  if (!Array.isArray(dato)) {
    const error = (dato as { error?: { text?: unknown } } | null)?.error?.text;
    return { ok: false, motivo: typeof error === 'string' ? error : 'wrangler contestó algo que no es una consulta.' };
  }
  const ultimo = dato[dato.length - 1] as { results?: unknown; success?: unknown } | undefined;
  if (ultimo === undefined || ultimo.success !== true || !Array.isArray(ultimo.results)) {
    return { ok: false, motivo: 'la consulta no salió bien.' };
  }
  const filas = ultimo.results as Record<string, unknown>[];
  const leidas = filasLeidasDe(dato);
  return leidas === undefined ? { ok: true, filas } : { ok: true, filas, leidas };
}

export type Informacion = { ok: true; escritas24h: number; tamaño?: number } | { ok: false; motivo: string };

/**
 * `d1 info --json`: de ahí salen las filas escritas en las últimas 24 horas, por horas. Cubren
 * lo escrito desde las 00:00 UTC y algo más, así que la estimación de la cuota del día peca por
 * exceso, nunca por defecto. Sin el dato no se baraja.
 */
export function leerInformacion(salida: string): Informacion {
  let dato: unknown;
  try {
    dato = JSON.parse(salida);
  } catch {
    return { ok: false, motivo: 'wrangler no contestó JSON.' };
  }
  const { rows_written_24h: escritas, database_size: tamaño } = (dato ?? {}) as Record<string, unknown>;
  if (typeof escritas !== 'number' || !Number.isFinite(escritas) || escritas < 0) {
    return { ok: false, motivo: 'd1 info no trae rows_written_24h: sin él no se sabe si el barajado cabe.' };
  }
  return typeof tamaño === 'number' ? { ok: true, escritas24h: escritas, tamaño } : { ok: true, escritas24h: escritas };
}

/** Un dato leído, o por qué no se pudo leer: nunca un cero en su lugar. */
export type Leido<T> = { ok: true; valor: T } | { ok: false; motivo: string };

/** Las dos cifras de la cuota que da `d1 info`, cada una por su lado (Historia 23.10). */
export interface CuotaLeida {
  /** `rows_written_24h`: lo escrito en las últimas 24 horas, que peca por exceso frente al día. */
  escritas: Leido<number>;
  /** `database_size`, en bytes. */
  tamaño: Leido<number>;
}

const cifraDe = (valor: unknown, nombre: string): Leido<number> =>
  typeof valor === 'number' && Number.isFinite(valor) && valor >= 0
    ? { ok: true, valor }
    : { ok: false, motivo: `d1 info no trae ${nombre}.` };

/**
 * `rows_read_24h` de `d1 info --json`: las filas leídas en las últimas 24 horas, por horas y solo
 * de esta base (Historia 23.13). Es la precondición del juicio de la cuota de lectura: sin ella,
 * ninguna orden lee una fila de la tabla. `causa` es lo que dijo `wrangler`, para el motivo.
 */
export function leerFilasLeidas24h(salida: string, causa = ''): Leido<number> {
  let dato: unknown;
  try {
    dato = JSON.parse(salida);
  } catch {
    return { ok: false, motivo: `wrangler no contestó JSON${causa}.` };
  }
  const objeto = (typeof dato === 'object' && dato !== null && !Array.isArray(dato) ? dato : {}) as Record<string, unknown>;
  const leido = cifraDe(objeto.rows_read_24h, 'rows_read_24h');
  return leido.ok ? leido : { ok: false, motivo: `${leido.motivo.replace(/\.$/, '')}${causa}.` };
}

/**
 * `d1 info --json` para la lectura: las filas escritas en 24 h y el tamaño, **por separado** —la
 * falta de una no se lleva la otra—. `causa` es lo que dijo `wrangler`, para el motivo.
 */
export function leerInformacionDeLaCuota(salida: string, causa = ''): CuotaLeida {
  let dato: unknown;
  try {
    dato = JSON.parse(salida);
  } catch {
    const motivo = `wrangler no contestó JSON${causa}.`;
    return { escritas: { ok: false, motivo }, tamaño: { ok: false, motivo } };
  }
  const objeto = (typeof dato === 'object' && dato !== null && !Array.isArray(dato) ? dato : {}) as Record<string, unknown>;
  const conCausa = (leido: Leido<number>): Leido<number> =>
    leido.ok ? leido : { ok: false, motivo: `${leido.motivo.replace(/\.$/, '')}${causa}.` };
  return {
    escritas: conCausa(cifraDe(objeto.rows_written_24h, 'rows_written_24h')),
    tamaño: conCausa(cifraDe(objeto.database_size, 'database_size')),
  };
}

// ── El estado de la tabla ─────────────────────────────────────────────────────────────────

/** Una columna, como la da `PRAGMA table_info` o como la declara una migración. */
export interface Columna {
  nombre: string;
  tipo: string;
  noNula: boolean;
}

/** Una migración versionada: su nombre de fichero y su SQL. */
export interface Migracion {
  nombre: string;
  sql: string;
}

/**
 * El SQL sin comentarios. Las migraciones no llevan literales —ni con `--` ni con `/*` ni sin
 * ellos—: `columnasDeLaMigracion` se niega ante una comilla, así que esto no puede cortar uno.
 */
function sinComentarios(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

/** Lo que este lector no sabe leer, y por eso rechaza en vez de leerlo mal. */
const FORMA_QUE_NO_SE_LEE = /['"`[\]()]/;

/**
 * Las columnas que una migración crea o añade, en su orden.
 *
 * Lee solo tres sentencias —`CREATE TABLE eventos`, `CREATE INDEX` y `ALTER TABLE eventos ADD
 * COLUMN`—, cada definición de columna como nombre, tipo y, si acaso, `NOT NULL`. **Lanza ante
 * cualquier otra cosa**: otra sentencia, un `DEFAULT (…)`, un nombre entre comillas, un
 * literal. Leerla mal haría que `estadoDeLaTabla` diera por «otra» una tabla buena —o por buena
 * una que no lo es—, así que una migración que este lector no entiende para la orden con su
 * motivo, y quien la escriba amplía el lector y su prueba antes.
 */
export function columnasDeLaMigracion(sql: string): Columna[] {
  const columnas: Columna[] = [];
  for (const sentencia of sinComentarios(sql).split(';').map((s) => s.trim().replace(/\s+/g, ' '))) {
    if (sentencia === '') continue;
    const creacion = /^CREATE TABLE (?:IF NOT EXISTS )?eventos ?\((.*)\)$/i.exec(sentencia);
    if (creacion) {
      if (FORMA_QUE_NO_SE_LEE.test(creacion[1])) throw new Error(`no sé leer las columnas de «${sentencia}».`);
      columnas.push(...creacion[1].split(',').map(columnaDe));
      continue;
    }
    if (/^CREATE (?:UNIQUE )?INDEX /i.test(sentencia)) continue;
    const alta = /^ALTER TABLE eventos ADD (?:COLUMN )?(.*)$/i.exec(sentencia);
    if (alta) {
      if (FORMA_QUE_NO_SE_LEE.test(alta[1])) throw new Error(`no sé leer la columna de «${sentencia}».`);
      columnas.push(columnaDe(alta[1]));
      continue;
    }
    throw new Error(`no sé leer la sentencia «${sentencia}»: solo CREATE TABLE eventos, CREATE INDEX y ADD COLUMN.`);
  }
  return columnas;
}

function columnaDe(definicion: string): Columna {
  const partes = /^\s*([a-z_][a-z0-9_]*)\s+([a-z]+)((?:\s+NOT\s+NULL)?)\s*$/i.exec(definicion);
  if (!partes) throw new Error(`no sé leer la definición de columna «${definicion.trim()}».`);
  return { nombre: partes[1], tipo: partes[2].toUpperCase(), noNula: partes[3].trim() !== '' };
}

/** Las columnas de `PRAGMA table_info(eventos)`. */
export function columnasDelPragma(filas: readonly Record<string, unknown>[]): Columna[] {
  return [...filas]
    .sort((a, b) => Number(a.cid) - Number(b.cid))
    .map((fila) => ({
      nombre: String(fila.name),
      tipo: String(fila.type).toUpperCase(),
      noNula: Number(fila.notnull) === 1,
    }));
}

const describir = (columnas: readonly Columna[]) =>
  columnas.length === 0
    ? '(ninguna: no hay tabla eventos)'
    : columnas.map((c) => `${c.nombre} ${c.tipo}${c.noNula ? ' NOT NULL' : ''}`).join(', ');

const mismasColumnas = (a: readonly Columna[], b: readonly Columna[]) =>
  a.length === b.length &&
  a.every((c, i) => c.nombre === b[i].nombre && c.tipo === b[i].tipo && c.noNula === b[i].noNula);

export type EstadoDeLaTabla =
  | { estado: 'de-partida' | 'a-medias' | 'migrada'; pendientes: string[] }
  | { estado: 'otra'; motivo: string };

/**
 * En qué punto de las migraciones está la tabla, antes de aplicar nada.
 *
 * «De partida» es la tabla con exactamente las columnas de la `0000` y ninguna migración
 * posterior anotada en `d1_migrations` (o sin esa tabla: la base de producción de antes de la
 * 23.2). «Migrada», las de todas las migraciones con todas anotadas. Cualquier otra cosa —una
 * columna de más o de menos, una anotada sin su columna, una columna sin su anotación— se nombra
 * y para la orden antes de migrar, porque `ADD COLUMN` no es idempotente: aplicar sobre una tabla
 * que no es la que la migración espera la deja a medias o falla a mitad.
 *
 * La `0000` no cuenta como anotada ni como pendiente: sobre la tabla de producción no hace nada.
 */
export function estadoDeLaTabla(
  columnas: readonly Columna[],
  anotadas: readonly string[],
  migraciones: readonly Migracion[],
): EstadoDeLaTabla {
  const ordenadas = [...migraciones].sort((a, b) => a.nombre.localeCompare(b.nombre));
  if (ordenadas.length === 0) return { estado: 'otra', motivo: 'no hay ninguna migración en medicion/migrations/.' };
  const nombres = ordenadas.map((m) => m.nombre);
  const ajenas = anotadas.filter((a) => !nombres.includes(a));
  if (ajenas.length > 0) {
    return {
      estado: 'otra',
      motivo: `d1_migrations anota migraciones que el repositorio no tiene: ${ajenas.join(', ')}.`,
    };
  }

  const porMigracion: Columna[][] = [];
  for (const migracion of ordenadas) {
    try {
      porMigracion.push(columnasDeLaMigracion(migracion.sql));
    } catch (error) {
      return { estado: 'otra', motivo: `${migracion.nombre}: ${(error as Error).message} No se aplica nada.` };
    }
  }

  const acumuladas: Columna[] = [];
  for (let i = 0; i < ordenadas.length; i++) {
    acumuladas.push(...porMigracion[i]);
    const anotadasHastaAqui = nombres.slice(1, i + 1);
    const posteriores = anotadas.filter((a) => a !== nombres[0]);
    const coinciden =
      posteriores.length === anotadasHastaAqui.length && anotadasHastaAqui.every((n) => posteriores.includes(n));
    if (coinciden && mismasColumnas(columnas, acumuladas)) {
      const estado = i === 0 ? 'de-partida' : i === ordenadas.length - 1 ? 'migrada' : 'a-medias';
      return { estado, pendientes: nombres.slice(i + 1) };
    }
  }

  return {
    estado: 'otra',
    motivo:
      'la tabla eventos no es la de partida ni la migrada: tiene ' +
      `${describir(columnas)}, y d1_migrations anota ${anotadas.length === 0 ? 'ninguna' : anotadas.join(', ')}. ` +
      `La de partida es ${describir(porMigracion[0])}; ` +
      `la migrada, ${describir(acumuladas)}. No se aplica nada: ADD COLUMN no es idempotente.`,
  };
}

// ── La huella del vocabulario ─────────────────────────────────────────────────────────────

/** Un campo en la huella: sus valores, ordenados, o `'texto'`; y si admite nulo. */
export interface CampoDeHuella {
  valores: string[] | 'texto';
  nulo: boolean;
}

/** El vocabulario tal como se versiona: lo único que `npm test` compara. */
export interface VocabularioDeHuella {
  eventos: Record<string, Record<string, CampoDeHuella>>;
  claveEnLaBaliza: Record<string, string>;
  tramos: { desde: number; rotulo: string }[];
}

export interface Huella {
  /** La jornada UTC en que la escribió `desplegar`. */
  escritaEl: string;
  /** El commit desplegado, los 40 caracteres de `git rev-parse HEAD`. */
  commit: string;
  vocabulario: VocabularioDeHuella;
}

/** Lo que hace falta de un módulo de vocabulario para sacar su huella. */
export interface ModuloDeVocabulario {
  CAMPOS_DE_EVENTO: Readonly<Record<string, Readonly<Partial<Record<string, DeclaracionDeCampo>>>>>;
  CLAVE_EN_LA_BALIZA: Readonly<Partial<Record<string, string>>>;
  TRAMOS: readonly { readonly desde: number; readonly rotulo: string }[];
}

const ordenarClaves = <T>(objeto: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(objeto).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

const campoDeHuella = (declaracion: DeclaracionDeCampo): CampoDeHuella => ({
  valores: declaracion.valores === 'texto' ? 'texto' : [...declaracion.valores].sort(),
  nulo: declaracion.nulo,
});

/**
 * La huella de un vocabulario: eventos y campos en orden, valores ordenados. El mismo
 * vocabulario da siempre el mismo texto, y uno con un valor, un campo, un tramo o una clave de
 * baliza distintos da otro.
 */
export function huellaDelVocabulario(modulo: ModuloDeVocabulario = vocabularioDeLaRama): VocabularioDeHuella {
  const eventos: Record<string, Record<string, CampoDeHuella>> = {};
  for (const [evento, campos] of Object.entries(modulo.CAMPOS_DE_EVENTO)) {
    const declarados: Record<string, CampoDeHuella> = {};
    for (const [campo, declaracion] of Object.entries(campos)) {
      if (declaracion !== undefined) declarados[campo] = campoDeHuella(declaracion);
    }
    eventos[evento] = ordenarClaves(declarados);
  }
  const claves: Record<string, string> = {};
  for (const [campo, clave] of Object.entries(modulo.CLAVE_EN_LA_BALIZA)) {
    if (clave !== undefined) claves[campo] = clave;
  }
  return {
    eventos: ordenarClaves(eventos),
    claveEnLaBaliza: ordenarClaves(claves),
    tramos: modulo.TRAMOS.map(({ desde, rotulo }) => ({ desde, rotulo })),
  };
}

/** El texto del fichero: JSON con dos espacios, en un orden fijo y con salto final. */
export function componerHuella(huella: Huella): string {
  const { escritaEl, commit, vocabulario } = huella;
  const canonico = {
    escritaEl,
    commit,
    vocabulario: {
      eventos: ordenarClaves(
        Object.fromEntries(
          Object.entries(vocabulario.eventos).map(([evento, campos]) => [
            evento,
            ordenarClaves(
              Object.fromEntries(
                Object.entries(campos).map(([campo, { valores, nulo }]) => [
                  campo,
                  { valores: valores === 'texto' ? 'texto' : [...valores].sort(), nulo },
                ]),
              ),
            ),
          ]),
        ),
      ),
      claveEnLaBaliza: ordenarClaves(vocabulario.claveEnLaBaliza),
      tramos: vocabulario.tramos.map(({ desde, rotulo }) => ({ desde, rotulo })),
    },
  };
  return `${JSON.stringify(canonico, null, 2)}\n`;
}

export type HuellaLeida = { ok: true; huella: Huella } | { ok: false; motivos: string[] };

const esObjeto = (dato: unknown): dato is Record<string, unknown> =>
  typeof dato === 'object' && dato !== null && !Array.isArray(dato);

/** Lee y juzga la forma de una huella: cada fallo, nombrado. */
export function leerHuella(texto: string): HuellaLeida {
  let dato: unknown;
  try {
    dato = JSON.parse(texto);
  } catch {
    return { ok: false, motivos: ['no es JSON.'] };
  }
  if (!esObjeto(dato)) return { ok: false, motivos: ['no es un objeto.'] };
  const motivos: string[] = [];
  const { escritaEl, commit, vocabulario } = dato;
  if (typeof escritaEl !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(escritaEl)) {
    motivos.push('escritaEl no es una jornada AAAA-MM-DD.');
  }
  if (typeof commit !== 'string' || !/^[0-9a-f]{40}$/.test(commit)) {
    motivos.push('commit no son los 40 caracteres hexadecimales de un commit.');
  }
  if (!esObjeto(vocabulario)) {
    motivos.push('falta vocabulario, o no es un objeto.');
    return { ok: false, motivos };
  }
  const { eventos, claveEnLaBaliza, tramos } = vocabulario;
  if (!esObjeto(eventos) || Object.keys(eventos).length === 0) {
    motivos.push('vocabulario.eventos no es un objeto con eventos.');
  } else {
    for (const [evento, campos] of Object.entries(eventos)) {
      if (!esObjeto(campos)) {
        motivos.push(`vocabulario.eventos.${evento} no es un objeto de campos.`);
        continue;
      }
      for (const [campo, declaracion] of Object.entries(campos)) {
        const lugar = `vocabulario.eventos.${evento}.${campo}`;
        // El nombre de un campo es el de una columna, y `comprobar` lo pone en el SQL que lee
        // las balizas en remoto: solo un identificador entra.
        if (!IDENTIFICADOR_DE_COLUMNA.test(campo)) {
          motivos.push(`${lugar}: «${campo}» no es un nombre de columna (${IDENTIFICADOR_DE_COLUMNA.source}).`);
          continue;
        }
        if (!esObjeto(declaracion)) {
          motivos.push(`${lugar} no es un objeto.`);
          continue;
        }
        const { valores, nulo } = declaracion;
        const lista = Array.isArray(valores) && valores.length > 0 && valores.every((v) => typeof v === 'string');
        if (valores !== 'texto' && !lista) motivos.push(`${lugar}.valores no es una lista de textos ni «texto».`);
        if (typeof nulo !== 'boolean') motivos.push(`${lugar}.nulo no es verdadero ni falso.`);
      }
    }
  }
  if (!esObjeto(claveEnLaBaliza) || !Object.values(claveEnLaBaliza).every((v) => typeof v === 'string')) {
    motivos.push('vocabulario.claveEnLaBaliza no es un objeto de textos.');
  }
  if (
    !Array.isArray(tramos) ||
    !tramos.every((t) => esObjeto(t) && Number.isInteger(t.desde) && typeof t.rotulo === 'string')
  ) {
    motivos.push('vocabulario.tramos no es una lista de { desde, rotulo }.');
  }
  if (motivos.length > 0) return { ok: false, motivos };
  return { ok: true, huella: dato as unknown as Huella };
}

/** Cómo se nombran los dos lados de una comparación de huellas en los mensajes. */
export interface LadosDeLaComparacion {
  a: string;
  b: string;
}

const LADOS_POR_OMISION: LadosDeLaComparacion = { a: 'la huella', b: 'src/lib/vocabulario.ts' };

const textoDeValores = (valores: string[] | 'texto') => (valores === 'texto' ? 'texto' : valores.join(', '));

/** Cada diferencia entre dos vocabularios, nombrada. Vacía si son el mismo. */
export function diferenciasDeHuella(
  a: VocabularioDeHuella,
  b: VocabularioDeHuella,
  lados: LadosDeLaComparacion = LADOS_POR_OMISION,
): string[] {
  const diferencias: string[] = [];
  const eventos = [...new Set([...Object.keys(a.eventos), ...Object.keys(b.eventos)])].sort();
  for (const evento of eventos) {
    const enA = a.eventos[evento];
    const enB = b.eventos[evento];
    if (enA === undefined) {
      diferencias.push(`el evento ${evento} está en ${lados.b} y no en ${lados.a}.`);
      continue;
    }
    if (enB === undefined) {
      diferencias.push(`el evento ${evento} está en ${lados.a} y no en ${lados.b}.`);
      continue;
    }
    const campos = [...new Set([...Object.keys(enA), ...Object.keys(enB)])].sort();
    for (const campo of campos) {
      const ca = enA[campo];
      const cb = enB[campo];
      if (ca === undefined) {
        diferencias.push(`${evento}.${campo} está en ${lados.b} y no en ${lados.a}.`);
      } else if (cb === undefined) {
        diferencias.push(`${evento}.${campo} está en ${lados.a} y no en ${lados.b}.`);
      } else {
        const va = textoDeValores(ca.valores === 'texto' ? 'texto' : [...ca.valores].sort());
        const vb = textoDeValores(cb.valores === 'texto' ? 'texto' : [...cb.valores].sort());
        if (va !== vb) diferencias.push(`${evento}.${campo}: ${lados.a} dice [${va}] y ${lados.b} [${vb}].`);
        if (ca.nulo !== cb.nulo) {
          diferencias.push(`${evento}.${campo}: ${lados.a} dice nulo ${ca.nulo} y ${lados.b} nulo ${cb.nulo}.`);
        }
      }
    }
  }
  const claves = [...new Set([...Object.keys(a.claveEnLaBaliza), ...Object.keys(b.claveEnLaBaliza)])].sort();
  for (const campo of claves) {
    if (a.claveEnLaBaliza[campo] !== b.claveEnLaBaliza[campo]) {
      diferencias.push(
        `la clave de ${campo} en la baliza: ${lados.a} dice ${a.claveEnLaBaliza[campo] ?? '(su nombre)'} y ` +
          `${lados.b} ${b.claveEnLaBaliza[campo] ?? '(su nombre)'}.`,
      );
    }
  }
  const tramos = (v: VocabularioDeHuella) => v.tramos.map((t) => `${t.desde}:${t.rotulo}`).join(', ');
  if (tramos(a) !== tramos(b)) {
    // Otros cortes parten la serie: lo de antes no se compara con lo de después (AD-13).
    diferencias.push(
      `los tramos: ${lados.a} dice [${tramos(a)}] y ${lados.b} [${tramos(b)}]. Cambiar los cortes abre un ` +
        'corte de serie: anótalo, con su constante de despliegue, en CORTES_DE_SERIE_DECLARADOS de ' +
        'src/lib/umbrales.ts (Historia 23.10).',
    );
  }
  return diferencias;
}

/**
 * Lo que `tests/unit/huella.test.ts` exige de la huella versionada, como lista de fallos —vacía
 * si casa—: que esté, que tenga forma de huella y que su vocabulario sea el de `src/lib/`, con
 * la orden que cierra cada caso. Vive aquí, y no en la prueba, para que sus tres ramas se
 * prueben con huellas de mentira (`medicion-orden.test.ts`): la prueba de verdad solo puede ver
 * el fichero que haya en el repositorio, y hasta la 23.3 no hay ninguno.
 */
export function juicioDeLaHuella(
  texto: string | undefined,
  vocabulario: VocabularioDeHuella = huellaDelVocabulario(),
): string[] {
  if (texto === undefined) {
    return [
      `Sin huella versionada en ${RUTA_DE_LA_HUELLA}: el receptor en vivo no se ha desplegado con el ` +
        'vocabulario de src/lib/vocabulario.ts. La escribe `npm run medicion -- desplegar` (Historia 23.3), ' +
        'que corre Héctor desde la rama; nunca se escribe a mano.',
    ];
  }
  const leida = leerHuella(texto);
  if (!leida.ok) {
    return [`${RUTA_DE_LA_HUELLA} no tiene forma de huella; la reescribe npm run medicion -- desplegar.`, ...leida.motivos];
  }
  const diferencias = diferenciasDeHuella(leida.huella.vocabulario, vocabulario);
  if (diferencias.length === 0) return [];
  return [
    `El vocabulario de src/lib/ no es el desplegado (huella del commit ${leida.huella.commit}, ` +
      `${leida.huella.escritaEl}). Lo cierra repetir npm run medicion -- desplegar desde esta rama (23.3).`,
    ...diferencias,
  ];
}

/**
 * Lo que hace falta de los módulos de la principal para saber qué envía el sitio en vivo cuando
 * no hay huella: el vocabulario, si ya existe, o el módulo de medición de la v7.1 con sus dos
 * hojas.
 */
export interface ModulosDeLaPrincipal {
  vocabulario?: ModuloDeVocabulario;
  medicion?: {
    EVENTOS_VALIDOS: readonly string[];
    EVENTOS: Readonly<Record<string, string>>;
  };
  destinos?: { DESTINOS_VALIDOS: readonly string[] };
  redes?: { REDES_VALIDAS: readonly string[] };
}

/**
 * El vocabulario de referencia cuando no hay huella versionada: el de `origin/main`.
 *
 * Con `vocabulario.ts`, su huella. Sin él, la regla de la v7.1, que es lo que su receptor
 * guarda: la Marca de origen en todo evento, el destino en las dos comparticiones y la consulta
 * en la búsqueda sin resultados. `null` si los módulos no alcanzan para decirlo.
 */
export function vocabularioDeLaPrincipal(modulos: ModulosDeLaPrincipal): VocabularioDeHuella | null {
  if (modulos.vocabulario) return huellaDelVocabulario(modulos.vocabulario);
  const { medicion, destinos, redes } = modulos;
  if (!medicion || !destinos || !redes) return null;
  const { comparticionDeImagen, comparticionDeEnlace, busquedaSinResultados } = medicion.EVENTOS;
  const eventos: Record<string, Record<string, CampoDeHuella>> = {};
  for (const evento of medicion.EVENTOS_VALIDOS) {
    const campos: Record<string, CampoDeHuella> = {
      origen: { valores: [...redes.REDES_VALIDAS].sort(), nulo: true },
    };
    if (evento === comparticionDeImagen || evento === comparticionDeEnlace) {
      campos.destino = { valores: [...destinos.DESTINOS_VALIDOS].sort(), nulo: true };
    }
    if (evento === busquedaSinResultados) campos.consulta = { valores: 'texto', nulo: true };
    eventos[evento] = ordenarClaves(campos);
  }
  const claveEnLaBaliza: Record<string, string> = {};
  for (const [campo, clave] of Object.entries(vocabularioDeLaRama.CLAVE_EN_LA_BALIZA)) {
    if (clave !== undefined) claveEnLaBaliza[campo] = clave;
  }
  return { eventos: ordenarClaves(eventos), claveEnLaBaliza, tramos: [] };
}

// ── Lo que el receptor de la rama sabe guardar ────────────────────────────────────────────

const claveDe = (vocabulario: VocabularioDeHuella, campo: string) => vocabulario.claveEnLaBaliza[campo] ?? campo;

/**
 * Lo que un vocabulario de referencia envía y el receptor de la rama no guarda, nombrado.
 *
 * Se le da a `interpretar` cada evento solo y cada valor de cada campo, y se mira que el
 * registro lo traiga en su columna. Vacío si el receptor cubre la referencia: nunca se despliega
 * uno que pierda algo de lo que el sitio en vivo envía (AD-14).
 */
export function coberturaDelReceptor(
  interpretar: (cuerpo: string, instante: Date) => Registro | null,
  vocabulario: VocabularioDeHuella,
): string[] {
  const instante = new Date('2026-01-01T12:00:00Z');
  const faltas: string[] = [];
  for (const [evento, campos] of Object.entries(vocabulario.eventos)) {
    if (interpretar(JSON.stringify({ evento, ruta: RUTA_DE_COMPROBACION }), instante) === null) {
      faltas.push(`el receptor descarta el evento ${evento}.`);
      continue;
    }
    for (const [campo, { valores }] of Object.entries(campos)) {
      for (const valor of valores === 'texto' ? [TEXTO_DE_PRUEBA] : valores) {
        const registro = interpretar(
          JSON.stringify({ evento, ruta: RUTA_DE_COMPROBACION, [claveDe(vocabulario, campo)]: valor }),
          instante,
        ) as Record<string, unknown> | null;
        if (registro?.[campo] !== valor) faltas.push(`el receptor no guarda ${evento}.${campo} = ${valor}.`);
      }
    }
  }
  return faltas;
}

// ── Las balizas de prueba ─────────────────────────────────────────────────────────────────

/** Los campos de un vocabulario, todos los que declara algún evento, en orden alfabético. */
export function camposDe(vocabulario: VocabularioDeHuella): string[] {
  return [...new Set(Object.values(vocabulario.eventos).flatMap((campos) => Object.keys(campos)))].sort();
}

/** El valor que ningún conjunto admite, en las balizas que comprueban lo que se descarta. */
export const VALOR_AJENO = 'fuera-del-conjunto';

/** Un evento que ningún vocabulario declara: el receptor no lo guarda. */
export const EVENTO_AJENO = 'evento-de-comprobacion';

export interface BalizasDePrueba {
  /** Lo que se envía al receptor, una carga por baliza. */
  balizas: Record<string, string>[];
  /**
   * La fila que cada baliza tiene que dejar —evento, ruta y cada campo, nulo si no lo lleva—, en
   * su mismo orden; `null` para la que no debe dejar ninguna.
   */
  esperadas: (Record<string, string | null> | null)[];
  /** Las columnas que se leen para cotejarlas. */
  campos: string[];
}

/**
 * Las balizas de prueba, todas a `/__comprobacion/`: las que el receptor tiene que guardar y las
 * que tiene que descartar.
 *
 * **Lo que guarda.** Cubren todo par evento–campo–valor del vocabulario: por evento, tantas
 * como valores tenga su campo más largo; la i-ésima lleva el valor i de cada campo, y los campos
 * más cortos vuelven a empezar. Así cada valor de cada campo sale al menos una vez sin una
 * baliza por combinación.
 *
 * **Lo que descarta**, que es la propiedad que el receptor existe para guardar (NFR-10, NFR-11):
 * por evento, una baliza que tiene que dejar la fila con todos sus campos nulos —`VALOR_AJENO` en
 * cada campo de conjunto cerrado que el evento declara, y en cada uno que **no** declara un valor
 * **válido** de su conjunto, el que lleva en otro evento, y texto en el campo de texto que no
 * declara—; y una baliza de `EVENTO_AJENO`, que no tiene que dejar ninguna. Un receptor que
 * guardara todo lo que le llega no pasaría lo primero, y uno que cotejara los conjuntos pero no
 * qué evento declara cada campo —que guardara `zona=cabecera` en un copiado— tampoco.
 *
 * La excepción es lo que el receptor guarda fuera de su evento **a propósito**: la Marca de
 * origen en los siete eventos de la v7.1 (`EVENTOS_DE_LA_V71` de `medicion/receptor.ts`), que
 * la huella no declara porque no es vocabulario sino compatibilidad. Ahí va `VALOR_AJENO`, que
 * todo receptor descarta lo guarde fuera de su evento o no.
 */
export function balizasDePrueba(
  vocabulario: VocabularioDeHuella,
  compatibilidad: Readonly<Record<string, readonly string[]>> = { origen: EVENTOS_DE_LA_V71 },
): BalizasDePrueba {
  const campos = camposDe(vocabulario);
  const balizas: Record<string, string>[] = [];
  const esperadas: (Record<string, string | null> | null)[] = [];
  const filaVacia = (evento: string) => {
    const fila: Record<string, string | null> = { evento, ruta: RUTA_DE_COMPROBACION };
    for (const campo of campos) fila[campo] = null;
    return fila;
  };
  const esTexto = (campo: string) =>
    Object.values(vocabulario.eventos).some((declarados) => declarados[campo]?.valores === 'texto');
  /** Un valor de su conjunto: el primero, en orden, de los que lleva en algún evento. */
  const valorValido = (campo: string) =>
    Object.values(vocabulario.eventos)
      .flatMap((declarados) => {
        const valores = declarados[campo]?.valores;
        return valores === undefined || valores === 'texto' ? [] : valores;
      })
      .sort()[0];

  for (const [evento, declarados] of Object.entries(vocabulario.eventos)) {
    const listas = Object.entries(declarados).map(
      ([campo, { valores }]) => [campo, valores === 'texto' ? [TEXTO_DE_PRUEBA] : valores] as const,
    );
    const cuantas = Math.max(1, ...listas.map(([, valores]) => valores.length));
    for (let i = 0; i < cuantas; i++) {
      const baliza: Record<string, string> = { evento, ruta: RUTA_DE_COMPROBACION };
      const esperada = filaVacia(evento);
      for (const [campo, valores] of listas) {
        const valor = valores[i % valores.length];
        baliza[claveDe(vocabulario, campo)] = valor;
        esperada[campo] = valor;
      }
      balizas.push(baliza);
      esperadas.push(esperada);
    }

    const descartable: Record<string, string> = { evento, ruta: RUTA_DE_COMPROBACION };
    for (const campo of campos) {
      const clave = claveDe(vocabulario, campo);
      const declaracion = declarados[campo];
      if (declaracion !== undefined) {
        // Del evento: un valor fuera de su conjunto. El texto no tiene valor ajeno.
        if (declaracion.valores !== 'texto') descartable[clave] = VALOR_AJENO;
      } else if (esTexto(campo)) {
        descartable[clave] = TEXTO_DE_PRUEBA;
      } else if (compatibilidad[campo]?.includes(evento)) {
        descartable[clave] = VALOR_AJENO;
      } else {
        // Fuera de su evento: un valor que su conjunto sí admite.
        descartable[clave] = valorValido(campo) ?? VALOR_AJENO;
      }
    }
    balizas.push(descartable);
    esperadas.push(filaVacia(evento));
  }

  balizas.push({ evento: EVENTO_AJENO, ruta: RUTA_DE_COMPROBACION });
  esperadas.push(null);
  return { balizas, esperadas, campos };
}

const firmaDe = (fila: Record<string, unknown>, columnas: readonly string[]) =>
  columnas.map((c) => `${c}=${fila[c] === null || fila[c] === undefined ? '∅' : String(fila[c])}`).join(' ');

/**
 * Lo esperado frente a lo leído, como multiconjuntos de filas sin el `rowid`. Cada fila que
 * falta y cada una que sobra, nombradas; vacío si casan. Una esperada `null` es una baliza que
 * no debe dejar fila: si la deja, sobra.
 */
export function cotejarFilas(
  esperadas: readonly (Record<string, string | null> | null)[],
  leidas: readonly Record<string, unknown>[],
  campos: readonly string[],
): string[] {
  const columnas = ['evento', 'ruta', ...campos];
  const pendientes = new Map<string, number>();
  for (const fila of esperadas) {
    if (fila === null) continue;
    const firma = firmaDe(fila, columnas);
    pendientes.set(firma, (pendientes.get(firma) ?? 0) + 1);
  }
  const sobran: string[] = [];
  for (const fila of leidas) {
    const firma = firmaDe(fila, columnas);
    const quedan = pendientes.get(firma) ?? 0;
    if (quedan > 0) pendientes.set(firma, quedan - 1);
    else sobran.push(firma);
  }
  const faltan = [...pendientes].flatMap(([firma, n]) => Array.from({ length: n }, () => firma));
  return [...faltan.map((f) => `falta: ${f}`), ...sobran.map((f) => `sobra: ${f}`)];
}

export type Orden = 'aleatorio' | 'contiguo' | 'insuficiente';

/**
 * Si el receptor numera al azar, por los `rowid` de las balizas de prueba, leídos como texto.
 *
 * Con `rowid` aleatorio entre 0 y 2^63, un centenar de filas quedan separadas, **cada una de su
 * vecina**, por mucho más de 2^32: que dos caigan más cerca tiene una probabilidad de unas
 * cuatro entre un millón. Numerando en orden de llegada quedan contiguas, o casi si entretanto llegó
 * tráfico —también con 19 cifras, cuando un receptor viejo numera `max(rowid)+1` sobre los
 * aleatorios—. Se mira cada hueco entre vecinas y no solo el extremo: con dos versiones del
 * receptor a la vez mientras el despliegue se propaga, una sola fila aleatoria entre las
 * contiguas daría un extremo enorme. Con menos de dos no se puede decir.
 */
export function rowidAleatorio(filas: readonly string[]): Orden {
  const numeros: bigint[] = [];
  for (const fila of filas) {
    if (!/^-?\d+$/.test(fila.trim())) continue;
    numeros.push(BigInt(fila.trim()));
  }
  if (numeros.length < 2) return 'insuficiente';
  numeros.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (let i = 1; i < numeros.length; i++) {
    if (numeros[i] - numeros[i - 1] < 2n ** 32n) return 'contiguo';
  }
  return 'aleatorio';
}

// ── Las cuotas de D1: un solo juez (Historia 23.13) ───────────────────────────────────────

/** Las dos cuotas diarias de D1 que gastan las órdenes de aquí: la de filas escritas y la de leídas. */
export type ClaseDeCuota = 'escritura' | 'lectura';

/** Lo que se juzga de una cuota: lo usado en 24 h, lo que la orden va a gastar y la cuota. */
export interface CuotaAJuzgar {
  /**
   * Lo gastado en las últimas 24 h, de `d1 info` —o lo que se sabe que va, si es más—, o por qué no
   * se sabe. Sin ello no se juzga, y no cabe.
   */
  usado: Leido<number>;
  /**
   * Lo que la orden va a gastar. Sin él, el juicio previo al `COUNT(*)` que da las filas de la
   * tabla: solo se mira que lo usado esté **bajo** la cuota.
   */
  coste?: number;
  cuota: number;
  /** De dónde sale el coste, delante de las cifras: `barajar N filas escribe unas C…`. */
  detalle?: string;
  /** Lo que lleva sumado lo usado, tras su cifra: `(contadas unas N de las balizas…)`. */
  nota?: string;
}

/** Lo que dice el juez de una cuota. */
export interface JuicioDeCuota {
  clase: ClaseDeCuota;
  cabe: boolean;
  cuota: number;
  usado?: number;
  coste?: number;
  /** Lo que se deja para el resto del día: otro tanto de lo usado. */
  reserva?: number;
  /** Lo que queda tras lo usado y la reserva. */
  disponible?: number;
  /** Las cifras del juicio, o por qué no se pudo juzgar. */
  cifras: string;
  /** Por qué no se juzgó: lo usado no se sabe. */
  falta?: string;
}

const NOMBRE_DE_LA_CUOTA: {
  readonly [C in ClaseDeCuota]: { filas: string; resto: string; verbo: string };
} = {
  escritura: { filas: 'escritas', resto: 'lo que el sitio escriba hasta las 00:00 UTC', verbo: 'escriba' },
  lectura: { filas: 'leídas', resto: 'el resto del día, hasta las 00:00 UTC', verbo: 'lea' },
};

/**
 * **El juez de las cuotas de D1** — AD-13, AD-14, AD-22, Historia 23.13. El único: la escritura del
 * barajado y la lectura de las tres órdenes que recorren `eventos` pasan por aquí, y ninguna orden
 * escribe su propio juicio. Puro: no lee nada, recibe las cifras.
 *
 * Cabe si lo usado en 24 h, **otro tanto de reserva** para el resto del día y el coste caben en la
 * cuota. La reserva existe porque pasada la cuota D1 rechaza lo que venga hasta las 00:00 UTC: la
 * de escritura, cada `INSERT` del receptor, que el Worker calla; la de lectura, las consultas, y
 * quizá también los `INSERT` (sin confirmar). Las dos son **de la cuenta**: lo que gaste hoy otra
 * base D1 de la cuenta no se ve en `d1 info`, y las cifras lo dicen.
 *
 * Sin `coste`, es el juicio previo al `COUNT(*)` que da las filas de la tabla: cabe si lo usado está
 * por debajo de la cuota. Sin lo usado no cabe: no se sabe.
 */
export function juzgarCuota(clase: ClaseDeCuota, datos: CuotaAJuzgar): JuicioDeCuota {
  const { cuota } = datos;
  const nombre = NOMBRE_DE_LA_CUOTA[clase];
  const deLaCuenta = `la cuota es de la cuenta: lo que ${nombre.verbo} hoy otra base D1 suya no está contado`;
  if (!datos.usado.ok) {
    return { clase, cabe: false, cuota, falta: datos.usado.motivo, cifras: datos.usado.motivo };
  }
  const usado = datos.usado.valor;
  const nota = datos.nota ?? '';
  if (datos.coste === undefined) {
    return {
      clase,
      cabe: usado < cuota,
      cuota,
      usado,
      cifras: `de la cuota de ${cuota} filas ${nombre.filas} al día van ${usado} en las últimas 24 h${nota} (${deLaCuenta})`,
    };
  }
  const { coste } = datos;
  const reserva = usado;
  const disponible = Math.max(0, cuota - usado - reserva);
  const detalle = datos.detalle === undefined ? `cuesta unas ${coste}` : datos.detalle;
  return {
    clase,
    cabe: usado + reserva + coste <= cuota,
    cuota,
    usado,
    coste,
    reserva,
    disponible,
    cifras:
      `${detalle}; de la cuota de ${cuota} filas ${nombre.filas} al día van ${usado} en las últimas 24 h${nota}, ` +
      `y otras ${reserva} se dejan para ${nombre.resto} (${deLaCuenta})`,
  };
}

/**
 * Lo que una orden dice de un juicio: si cabe, o por qué no y que se repite otro día, sin trocear.
 * `repetir` es la orden que se repite.
 */
export function textoDeCuota(juicio: JuicioDeCuota, repetir: string): string {
  const otroDia = `repite \`${repetir}\` otro día.`;
  if (juicio.falta !== undefined) {
    return juicio.clase === 'lectura'
      ? `No se juzga la cuota de lectura: ${juicio.falta.replace(/\.$/, '')}. Sin esa cifra no se sabe si cabe, así ` +
          'que no se lee ninguna fila de la tabla.'
      : `No se juzga la cuota de escritura: ${juicio.falta.replace(/\.$/, '')}. Sin esa cifra no se sabe si cabe.`;
  }
  if (juicio.coste === undefined) {
    return juicio.cabe
      ? `Las filas ${NOMBRE_DE_LA_CUOTA[juicio.clase].filas} en 24 h están bajo la cuota: ${juicio.cifras}.`
      : `La cuota de ${juicio.clase} está agotada hoy: ${juicio.cifras}. ` +
          `${juicio.clase === 'lectura' ? 'No se lee ninguna fila de la tabla' : 'No se escribe nada'}: ${otroDia}`;
  }
  if (juicio.clase === 'escritura') {
    return juicio.cabe
      ? `El barajado cabe: ${juicio.cifras}.`
      : `El barajado no cabe hoy: ${juicio.cifras}, así que quedan ${juicio.disponible}. No se baraja ni se trocea: ${otroDia}`;
  }
  return juicio.cabe
    ? `La lectura de la tabla cabe: ${juicio.cifras}.`
    : `La lectura de la tabla no cabe hoy: ${juicio.cifras}, así que quedan ${juicio.disponible}. No se lee más ni se ` +
        `trocea: ${otroDia}`;
}

export interface Barajado {
  cabe: boolean;
  coste: number;
  /** Lo que se deja para lo que el sitio escriba hasta las 00:00 UTC. */
  reserva: number;
  disponible: number;
  mensaje: string;
}

/**
 * Lo que se juzga de la cuota de escritura antes de barajar (AD-13): unas tres filas escritas por
 * fila. `escritas24h` ya trae contadas las escrituras de las balizas de esta orden —`balizas`, que
 * solo dice cuántas son—: `d1 info` puede no verlas todavía, y `desplegar` las suma antes de llamar
 * (`escriturasDeLasBalizas`).
 */
export function cuotaDelBarajado(datos: { filas: number; escritas24h: number; cuota: number; balizas?: number }): CuotaAJuzgar {
  const coste = datos.filas * FILAS_ESCRITAS_POR_FILA_BARAJADA;
  return {
    usado: { ok: true, valor: datos.escritas24h },
    coste,
    cuota: datos.cuota,
    detalle: `barajar ${datos.filas} filas escribe unas ${coste} (${FILAS_ESCRITAS_POR_FILA_BARAJADA} por fila)`,
    nota:
      datos.balizas !== undefined && datos.balizas > 0 ? ` (contadas unas ${datos.balizas} de las balizas de esta orden)` : '',
  };
}

/**
 * Si barajar cabe en lo que queda de la cuota de escritura del día, con la reserva del resto de la
 * jornada (AD-13), por el juez (`juzgarCuota`). Si no cabe, no se baraja ni se trocea: se repite
 * otro día.
 */
export function cabeElBarajado(datos: { filas: number; escritas24h: number; cuota: number; balizas?: number }): Barajado {
  const juicio = juzgarCuota('escritura', cuotaDelBarajado(datos));
  return {
    cabe: juicio.cabe,
    coste: juicio.coste ?? 0,
    reserva: juicio.reserva ?? 0,
    disponible: juicio.disponible ?? 0,
    mensaje: textoDeCuota(juicio, 'npm run medicion -- desplegar'),
  };
}

// ── Lo que cada orden recorre (Historia 23.13) ────────────────────────────────────────────

/**
 * Una sentencia que recorre la tabla `eventos` entera, y cuántas veces la envía la orden como
 * mucho. `eventos` no tiene índice por `ruta`, así que también la recorren las de las balizas.
 */
export interface Recorrido {
  que: string;
  sql: string;
  veces: number;
}

/** El `COUNT(*)` que da N, las filas de la tabla: el primero, y el único antes del juicio. */
export const RECORRIDO_DEL_RECUENTO_DE_FILAS: Recorrido = { que: 'el recuento de filas', sql: SQL_DE_FILAS, veces: 1 };

/** Lo que recorre una comprobación con balizas: el borrado de cada intento y el del final, y su lectura. */
export function recorridosDeLasBalizas(vocabulario: VocabularioDeHuella): Recorrido[] {
  return [
    { que: 'el borrado de las balizas', sql: SQL_DE_BORRADO, veces: INTENTOS_DE_COMPROBACION + 1 },
    { que: 'la lectura de las balizas', sql: sqlDeLasBalizas(camposDe(vocabulario)), veces: INTENTOS_DE_COMPROBACION },
  ];
}

/** Lo que `desplegar` recorre desde el segundo juicio: el barajado y los recuentos de después. */
export const RECORRIDOS_DEL_BARAJADO: readonly Recorrido[] = [
  { que: 'el barajado', sql: SQL_DE_BARAJADO, veces: 1 },
  { que: 'los recuentos de después', sql: SQL_DE_RECUENTOS, veces: 1 },
];

/** Lo que recorre la lectura de la línea base: el recuento de filas y sus cinco consultas. */
export function recorridosDeLaLectura(hoy: string): Recorrido[] {
  const sentencias = consultasDeLaLectura(hoy);
  return [
    RECORRIDO_DEL_RECUENTO_DE_FILAS,
    ...CONSULTAS_DE_LA_LECTURA.map((nombre) => ({ que: QUE_LEE[nombre], sql: sentencias[nombre], veces: 1 })),
  ];
}

/** Lo que recorre `desplegar`, en su orden: recuento, recuentos de antes, balizas, barajado y recuentos de después. */
export function recorridosDeDesplegar(vocabulario: VocabularioDeHuella): Recorrido[] {
  return [
    RECORRIDO_DEL_RECUENTO_DE_FILAS,
    { que: 'los recuentos de antes', sql: SQL_DE_RECUENTOS, veces: 1 },
    ...recorridosDeLasBalizas(vocabulario),
    ...RECORRIDOS_DEL_BARAJADO,
  ];
}

/** Lo que recorre `comprobar`: el recuento de filas y las balizas. */
export function recorridosDeComprobar(vocabulario: VocabularioDeHuella): Recorrido[] {
  return [RECORRIDO_DEL_RECUENTO_DE_FILAS, ...recorridosDeLasBalizas(vocabulario)];
}

/** Cuántas veces recorre la tabla una lista. */
export function vecesQueRecorre(recorridos: readonly Recorrido[]): number {
  return recorridos.reduce((suma, recorrido) => suma + recorrido.veces, 0);
}

/** Cómo se nombra una lista de recorridos en un mensaje. */
export function textoDeRecorridos(recorridos: readonly Recorrido[]): string {
  return recorridos.map((r) => (r.veces > 1 ? `${r.que} ×${r.veces}` : r.que)).join(', ');
}

/**
 * Lo que se juzga de la cuota de lectura: **N × la lista declarada**, nunca un literal (AD-14). Es
 * una estimación y una **cota inferior**: `rows_read` cuenta también las filas de índice que una
 * consulta recorre, y mientras las balizas están en la tabla cada recorrido suyo lee también las
 * suyas.
 */
export function cuotaDeLectura(datos: {
  recorridos: readonly Recorrido[];
  filas: number;
  usado: Leido<number>;
  nota?: string;
}): CuotaAJuzgar {
  const veces = vecesQueRecorre(datos.recorridos);
  const coste = datos.filas * veces;
  return {
    usado: datos.usado,
    coste,
    cuota: CUOTA_DE_FILAS_LEIDAS_POR_DIA_EN_D1,
    detalle:
      `leer la tabla cuesta unas ${coste} filas (estimación y cota inferior: ${datos.filas} filas × ${veces} ` +
      `recorridos —${textoDeRecorridos(datos.recorridos)}—; rows_read cuenta también los índices)`,
    ...(datos.nota === undefined ? {} : { nota: datos.nota }),
  };
}

// ── La cuota y los recuentos ──────────────────────────────────────────────────────────────

/**
 * Lo que escriben como mucho las balizas de prueba de una comprobación: cada una se inserta y se
 * borra —la fila y sus dos índices cada vez— en cada uno de sus intentos. Peca por exceso.
 */
export function escriturasDeLasBalizas(vocabulario: VocabularioDeHuella): number {
  return (
    balizasDePrueba(vocabulario).balizas.length * FILAS_ESCRITAS_POR_FILA_BARAJADA * 2 * INTENTOS_DE_COMPROBACION
  );
}

/** Los recuentos por jornada y evento: `«jornada» «evento»` → filas. */
export type Recuentos = ReadonlyMap<string, number>;

export function recuentos(filas: readonly Record<string, unknown>[]): Recuentos {
  const mapa = new Map<string, number>();
  for (const fila of filas) mapa.set(`${String(fila.jornada)} ${String(fila.evento)}`, Number(fila.n));
  return mapa;
}

/** La jornada UTC de un instante. */
export function jornadaUtc(instante: Date): string {
  return instante.toISOString().slice(0, 10);
}

/** La jornada UTC anterior a otra. */
export function jornadaAnterior(jornada: string): string {
  const instante = new Date(`${jornada}T00:00:00Z`);
  instante.setUTCDate(instante.getUTCDate() - 1);
  return jornadaUtc(instante);
}

/**
 * Lo que cambió de un recuento a otro y no debía. Las jornadas cerradas tienen que ser
 * idénticas: migrar y barajar no pierden ni inventan filas. Las abiertas solo pueden crecer: el
 * tráfico sigue llegando. Ninguna puede menguar.
 *
 * Abiertas son `hoy` —en UTC, del reloj de quien corre la orden—, las posteriores si la orden
 * cruzó la medianoche **y la víspera**: el reloj del Worker puede ir unos segundos por detrás
 * del de este equipo, y justo tras la medianoche seguiría escribiendo en la jornada que aquí ya
 * se ha cerrado. Juzgarla cerrada pararía la orden después de barajar por una fila legítima.
 */
export function compararRecuentos(antes: Recuentos, despues: Recuentos, hoy: string): string[] {
  const abiertaDesde = jornadaAnterior(hoy);
  const diferencias: string[] = [];
  const claves = [...new Set([...antes.keys(), ...despues.keys()])].sort();
  for (const clave of claves) {
    const [jornada] = clave.split(' ');
    const a = antes.get(clave) ?? 0;
    const d = despues.get(clave) ?? 0;
    if (jornada < abiertaDesde && a !== d) {
      diferencias.push(`la jornada cerrada ${clave} tenía ${a} filas y ahora tiene ${d}.`);
    } else if (jornada >= abiertaDesde && d < a) {
      diferencias.push(`la jornada ${clave}, que sigue abierta, tenía ${a} filas y ahora tiene ${d}: solo puede crecer.`);
    }
  }
  return diferencias;
}

/**
 * Los recuentos de antes y de después como los da la orden al barajar —los `COUNT` por (jornada,
 * evento), sin las balizas—, que la 23.3 anota con fecha en su spec: una línea por jornada.
 */
export function informeDeRecuentos(antes: Recuentos, despues: Recuentos): string {
  const porJornada = new Map<string, string[]>();
  for (const clave of [...new Set([...antes.keys(), ...despues.keys()])].sort()) {
    const [jornada, evento] = clave.split(' ');
    porJornada.set(jornada, [...(porJornada.get(jornada) ?? []), `${evento} ${antes.get(clave) ?? 0} → ${despues.get(clave) ?? 0}`]);
  }
  const titulo = 'Recuentos por (jornada, evento), antes → después, sin las balizas de prueba';
  if (porJornada.size === 0) return `${titulo}: la tabla no tiene ninguna fila.`;
  return [`${titulo}:`, ...[...porJornada].map(([jornada, lineas]) => `  ${jornada}: ${lineas.join(', ')}`)].join('\n');
}

// ── El parte ──────────────────────────────────────────────────────────────────────────────

/** Los instantes que `desplegar` deja anotados por si hay que volver atrás con Time Travel. */
export interface Instantes {
  antesDeMigrar?: Date;
  antesDeBarajar?: Date;
}

/**
 * La orden de Time Travel que devuelve D1 a un instante. **Nadie la corre más que Héctor**:
 * sobrescribe todo lo escrito después, y ninguna orden de `tools/` restaura producción.
 */
export function ordenDeTimeTravel(instante: Date): string {
  return (
    `cd ${DIRECTORIO_DEL_RECEPTOR} && npx --yes ${WRANGLER} d1 time-travel restore ${BASE_DE_DATOS} ` +
    `--timestamp=${instante.toISOString()}`
  );
}

/** La orden que borra a mano las balizas de prueba, si una comprobación las dejó en la tabla. */
export function ordenDeBorradoDeLasBalizas(base: Base): string {
  return (
    `cd ${DIRECTORIO_DEL_RECEPTOR} && npx --yes ${WRANGLER} d1 execute ${BASE_DE_DATOS} ` +
    `${BANDERA_DE_BASE[base]} --command "${SQL_DE_BORRADO}"`
  );
}

/**
 * Lo que dice la cáscara si se interrumpe `desplegar` o `comprobar` a mitad —Ctrl-C, un SIGTERM—:
 * la secuencia no llega a dar su parte, así que se dice dónde mirar lo que quedó hecho y cómo se
 * borran las balizas si se cortó con ellas en la tabla.
 */
export function avisoDeInterrupcion(senal: string): string {
  return (
    `La orden se cortó a mitad (${senal}) y no dio su parte. Lo hecho en remoto lo dicen las líneas de ` +
    'arriba —los instantes anteriores a la migración y al barajado se escriben al pasar, para Time ' +
    `Travel—, d1_migrations y npx --yes ${WRANGLER} deployments list, en ${DIRECTORIO_DEL_RECEPTOR}/. ` +
    `Si se cortó con las balizas de prueba en la tabla, se borran con: ${ordenDeBorradoDeLasBalizas('remota')}`
  );
}

/**
 * Lo que quedó hecho en remoto cuando la orden se para, para que nadie tenga que adivinarlo, y
 * —si algo se aplicó— desde qué instante se puede volver con Time Travel (DESPLIEGUE.md §3).
 *
 * Volver a antes del barajado conserva las columnas nuevas, y el receptor desplegado sigue
 * escribiendo. Volver a antes de migrar devuelve **también la tabla de antes**: hecho con el
 * receptor nuevo en vivo, cada `INSERT` nombraría columnas que ya no existen y el Worker lo
 * callaría, así que antes va el receptor anterior.
 */
export function parteDeLoAplicado(aplicado: readonly string[], instantes: Instantes = {}): string {
  if (aplicado.length === 0) return 'No se aplicó nada en remoto.';
  const lineas = [`Quedó aplicado, en este orden: ${aplicado.join('; ')}.`];
  if (instantes.antesDeBarajar) {
    lineas.push(
      `Instante anterior al barajado: ${instantes.antesDeBarajar.toISOString()}. Volver ahí conserva las ` +
        'columnas nuevas y sobrescribe lo escrito después (acto de Héctor, DESPLIEGUE.md §3): ' +
        ordenDeTimeTravel(instantes.antesDeBarajar),
    );
  }
  if (instantes.antesDeMigrar) {
    lineas.push(
      `Instante anterior a la migración: ${instantes.antesDeMigrar.toISOString()}. Volver ahí devuelve ` +
        'también la tabla de antes: primero el receptor anterior (versions list y rollback), o cada evento ' +
        `se perdería; sobrescribe lo escrito después (acto de Héctor, DESPLIEGUE.md §3): ${ordenDeTimeTravel(instantes.antesDeMigrar)}`,
    );
  }
  return lineas.join('\n');
}

// ── Las secuencias de la orden ────────────────────────────────────────────────────────────

/** Una parada de la orden: el código con el que sale y lo que dice. */
export class Parada extends Error {
  constructor(
    readonly codigo: 1 | 2,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/** Lo que dice un programa al terminar. */
export interface Salida {
  codigo: number;
  stdout: string;
  stderr: string;
}

/** El vocabulario de `origin/main`, con el commit del que salió y su fecha. */
export interface VocabularioDeOrigin {
  vocabulario: VocabularioDeHuella;
  commit: string;
  fecha: string;
}

/**
 * Lo que la cáscara hace por las secuencias: la red, los procesos y el disco (AD-22).
 *
 * Las secuencias de aquí deciden el orden, las paradas y lo que se dice, y no tocan nada:
 * `tools/medicion.ts` les da los efectos de verdad, y `tests/unit/medicion-secuencias.test.ts`
 * unos de mentira, con un D1 en memoria, que apuntan cada llamada. Así el orden de lo que se
 * aplica en producción —migrar, desplegar, comprobar, barajar, escribir la huella— y cada
 * parada que lo corta se prueban antes de la primera vez que se corren de verdad.
 */
export interface Efectos {
  /** `npx --yes wrangler@… <argumentos>` en `medicion/`, recogiendo lo que dice. */
  wrangler(argumentos: readonly string[]): Promise<Salida>;
  /** Lo mismo, a la vista de quien corre la orden —migrar y desplegar dicen lo que hacen—. */
  wranglerALaVista(argumentos: readonly string[]): Promise<number>;
  /** `git <argumentos>` en la raíz: lo que dice, o una parada si sale distinto de 0. */
  git(argumentos: readonly string[]): Promise<string>;
  /** Envía una baliza por `POST`: el código HTTP, o `null` si no hubo respuesta a tiempo. */
  enviar(url: string, cuerpo: string): Promise<number | null>;
  /** Si algo contesta en esa dirección. */
  sondear(url: string): Promise<boolean>;
  /** El texto de la huella versionada, o `undefined` si no está. */
  leerHuella(): Promise<string | undefined>;
  escribirHuella(texto: string): Promise<void>;
  /** Las migraciones de `medicion/migrations/`. */
  migraciones(): Promise<Migracion[]>;
  /** El vocabulario de `origin/main`, o una parada si no se deja leer. */
  vocabularioDeOrigin(): Promise<VocabularioDeOrigin>;
  /** El receptor de la rama: lo que hará con cada baliza el Worker que se despliega. */
  receptor(cuerpo: string, instante: Date): Registro | null;
  esperar(ms: number): Promise<void>;
  decir(texto: string): void;
  ahora(): Date;
}

/** Lo último que dijo `wrangler` por su salida de error, para que una parada nombre la causa. */
function causaDe(salida: Salida): string {
  const cola = salida.stderr
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea !== '')
    .slice(-6)
    .join(' | ');
  const recorte = cola.length > 600 ? `…${cola.slice(-600)}` : cola;
  return ` (wrangler salió con ${salida.codigo}${recorte === '' ? '' : `: ${recorte}`})`;
}

/**
 * Lo que una orden lleva leído de la tabla (Historia 23.13): sus recorridos declarados, las filas
 * del `COUNT(*)` y, por cada sentencia de la lista que envía, la estimación —N— y la medida
 * —`meta.rows_read`, si D1 lo trae—.
 */
interface Gasto {
  recorridos: readonly Recorrido[];
  filas: number;
  enviadas: number;
  estimado: number;
  medido: number;
  /** Las enviadas que no trajeron `rows_read`: la medida se queda corta por ellas. */
  sinMedir: number;
}

/** Apunta una sentencia enviada, si recorre la tabla según la lista de la orden. */
function apuntar(gasto: Gasto | undefined, sql: string, leidas: number | undefined): void {
  if (gasto === undefined || !gasto.recorridos.some((recorrido) => recorrido.sql === sql)) return;
  gasto.enviadas += 1;
  gasto.estimado += gasto.filas;
  if (leidas === undefined) gasto.sinMedir += 1;
  else gasto.medido += leidas;
}

/** Lo que la orden ya gastó: el mayor de lo medido y lo estimado de lo enviado. */
const gastado = (gasto: Gasto) => Math.max(gasto.medido, gasto.estimado);

/**
 * Una sentencia contra la base: sus filas, o una parada con lo que dijo D1 y `wrangler`. Con
 * `gasto`, la apunta, también si falla: lo que leyó antes de fallar ya está gastado.
 */
async function consultar(
  efectos: Efectos,
  sql: string,
  base: Base,
  que: string,
  gasto?: Gasto,
): Promise<Record<string, unknown>[]> {
  const salida = await efectos.wrangler(argumentosDeConsulta(sql, base));
  const leido = leerConsulta(salida.stdout);
  apuntar(gasto, sql, leido.ok ? leido.leidas : undefined);
  if (!leido.ok) throw new Parada(1, `No se pudo ${que}: ${leido.motivo}${causaDe(salida)}`);
  return leido.filas;
}

/** Que `wrangler` tenga sesión, sin la cual nada remoto responde: 2 si no la tiene. */
async function exigirSesion(efectos: Efectos): Promise<void> {
  const salida = await efectos.wrangler(ARGUMENTOS_DE_SESION);
  const sesion = leerSesion(salida.stdout);
  if (sesion === 'sin-sesion') {
    throw new Parada(
      2,
      `wrangler no tiene sesión. En ${DIRECTORIO_DEL_RECEPTOR}/: npx --yes ${WRANGLER} login, y repite.`,
    );
  }
  if (sesion === 'ilegible') {
    throw new Parada(1, `npx ${WRANGLER} whoami --json no contestó lo esperado${causaDe(salida)}.`);
  }
}

/** La huella versionada, si la hay; una parada si está y no se deja leer. */
async function huellaVersionada(efectos: Efectos): Promise<Huella | undefined> {
  const texto = await efectos.leerHuella();
  if (texto === undefined) return undefined;
  const leida = leerHuella(texto);
  if (!leida.ok) throw new Parada(1, `${RUTA_DE_LA_HUELLA} no se deja leer: ${leida.motivos.join(' ')}`);
  return leida.huella;
}

/** Por qué no llegó ninguna baliza a la tabla: las dos causas que el Worker calla. */
const PISTA_SIN_FILAS =
  'No llegó ninguna baliza a la tabla. O el receptor que contesta no es el de esta rama —mira ' +
  `npx --yes ${WRANGLER} deployments list, en ${DIRECTORIO_DEL_RECEPTOR}/—, o D1 rechaza su INSERT —una ` +
  'columna que la tabla no tiene, de una migración sin aplicar— y el Worker lo calla. Lo distingue la ' +
  'versión desplegada; la vuelta atrás, en DESPLIEGUE.md §3.';

/**
 * La comprobación con balizas: borra los restos de otra, envía las balizas de prueba —lo que el
 * receptor tiene que guardar y lo que tiene que descartar—, las lee con su `rowid` como texto y
 * las coteja con lo esperado. Hasta tres intentos, porque un receptor recién desplegado tarda en
 * llegar a todas partes. Devuelve los `rowid` leídos; si no casan, una parada con cada
 * diferencia.
 *
 * **Las balizas se borran siempre**, casen o no y aunque la comprobación se pare a mitad —una
 * lectura que falla, un intento cortado—: en la tabla serían visitas a una ruta que no existe.
 * Si no se pueden borrar, la parada lo dice con la orden que las borra.
 */
export async function comprobarConBalizas(
  efectos: Efectos,
  url: string,
  base: Base,
  vocabulario: VocabularioDeHuella,
  espera: number,
  gasto?: Gasto,
): Promise<string[]> {
  const { balizas, esperadas, campos } = balizasDePrueba(vocabulario);

  const intentar = async (): Promise<string[]> => {
    let diferencias: string[] = [];
    let ningunaFila = false;
    for (let intento = 1; intento <= INTENTOS_DE_COMPROBACION; intento++) {
      if (intento > 1) await efectos.esperar(espera);
      await consultar(efectos, SQL_DE_BORRADO, base, 'borrar las balizas de un intento anterior', gasto);
      // Lo que contestó el receptor a las que no recibieron un 204: un 301 o un 302 dice que la
      // dirección redirige —la baliza no la sigue, porque un POST redirigido llega como GET, que
      // el receptor contesta con 204 sin escribir nada—; `sin respuesta`, que no contestó a tiempo.
      const rechazos = new Map<string, number>();
      for (const baliza of balizas) {
        const codigo = await efectos.enviar(url, JSON.stringify(baliza));
        if (codigo === 204) continue;
        const clave = codigo === null ? 'sin respuesta' : String(codigo);
        rechazos.set(clave, (rechazos.get(clave) ?? 0) + 1);
      }
      const rechazadas = [...rechazos.values()].reduce((suma, n) => suma + n, 0);
      const leidas = await consultar(efectos, sqlDeLasBalizas(campos), base, 'leer las balizas de prueba', gasto);
      ningunaFila = leidas.length === 0;
      const cuales = [...rechazos].map(([clave, n]) => `${clave} ×${n}`).join(', ');
      diferencias = [
        ...(rechazadas > 0
          ? [
              `${rechazadas} de ${balizas.length} balizas no recibieron un 204 (${cuales})` +
                ([...rechazos.keys()].some((clave) => /^3\d\d$/.test(clave))
                  ? ': MEDICION_ENDPOINT redirige; pon la dirección final.'
                  : '.'),
            ]
          : []),
        ...cotejarFilas(esperadas, leidas, campos),
      ];
      efectos.decir(
        `Intento ${intento} de ${INTENTOS_DE_COMPROBACION}: ${balizas.length} balizas enviadas, ` +
          `${leidas.length} filas leídas${diferencias.length === 0 ? ', y casan.' : `, ${diferencias.length} diferencias.`}`,
      );
      if (diferencias.length === 0) return leidas.map((fila) => String(fila.fila));
    }
    throw new Parada(
      1,
      `Las balizas no se vieron como se esperaba tras ${INTENTOS_DE_COMPROBACION} intentos:\n  ` +
        diferencias.slice(0, 40).join('\n  ') +
        (diferencias.length > 40 ? `\n  … y ${diferencias.length - 40} más.` : '') +
        (ningunaFila ? `\n${PISTA_SIN_FILAS}` : ''),
    );
  };

  let resultado: { filas: string[] } | { error: unknown };
  try {
    resultado = { filas: await intentar() };
  } catch (error) {
    resultado = { error };
  }

  let sinBorrar: string | undefined;
  try {
    await consultar(efectos, SQL_DE_BORRADO, base, 'borrar las balizas de prueba', gasto);
  } catch (error) {
    sinBorrar = (error as Error).message;
  }
  const avisoDeBorrado =
    sinBorrar === undefined
      ? ''
      : `\nLas balizas de prueba se quedaron en la tabla (${sinBorrar}). Se borran con: ${ordenDeBorradoDeLasBalizas(base)}`;

  if ('error' in resultado) {
    if (resultado.error instanceof Parada) {
      throw new Parada(resultado.error.codigo, `${resultado.error.message}${avisoDeBorrado}`);
    }
    throw resultado.error;
  }
  if (sinBorrar !== undefined) throw new Parada(1, `Las balizas casaron, pero no se borraron.${avisoDeBorrado}`);
  return resultado.filas;
}

/** Que el `rowid` de las balizas sea aleatorio; si no, una parada que lo dice con `cierre`. */
function exigirRowidAleatorio(filas: readonly string[], cierre: string): void {
  const orden = rowidAleatorio(filas);
  if (orden === 'contiguo') {
    throw new Parada(
      1,
      'El receptor numera las filas en orden de llegada: hay rowid de las balizas contiguos ' +
        `(${filas.join(', ')}). Es un receptor anterior a la 23.12, también tras una vuelta atrás, o ` +
        `dos versiones a la vez mientras el despliegue se propaga. No se baraja. ${cierre}`,
    );
  }
  if (orden === 'insuficiente') {
    throw new Parada(1, `No hay dos balizas con rowid legible para juzgar el orden. ${cierre}`);
  }
}

/** Que `medicion/` y `src/lib/` estén commiteados: la huella nombra el commit que se despliega. */
async function exigirArbolLimpio(efectos: Efectos): Promise<void> {
  const cambios = (await efectos.git(['status', '--porcelain', '--', DIRECTORIO_DEL_RECEPTOR, 'src/lib'])).trimEnd();
  if (cambios.trim() === '') return;
  if (cambios.split('\n').every((linea) => linea.trim().endsWith(RUTA_DE_LA_HUELLA))) {
    throw new Parada(
      1,
      `La huella que escribió un desplegar anterior está sin commitear: ${RUTA_DE_LA_HUELLA}. Commitéala ` +
        `—git add ${RUTA_DE_LA_HUELLA} && git commit— antes de repetir, o descártala si ese despliegue no ` +
        'vale: la referencia de esta orden es la huella del commit.',
    );
  }
  throw new Parada(
    1,
    `Hay cambios sin commitear en ${DIRECTORIO_DEL_RECEPTOR}/ o src/lib/:\n${cambios}\n` +
      'La huella nombra un commit, y el commit tiene que contener lo que se despliega.',
  );
}

/**
 * Que el receptor de la rama guarde todo lo que envía el sitio en vivo, o una parada que nombra
 * cada falta. Se coteja **siempre** contra el vocabulario de `origin/main` —el que emite el sitio
 * en vivo hasta que la rama entra en la principal: entre la 23.3 y el merge sigue siendo el de la
 * v7.1, con la Marca de origen en las acciones— y, si la hay, también contra la huella
 * versionada, que es lo que guarda el receptor en vivo. Así un receptor que soltara la
 * compatibilidad con la v7.1 no se despliega aunque la huella, que ya es de la v8, no la pida.
 */
async function exigirCobertura(efectos: Efectos): Promise<void> {
  const principal = await efectos.vocabularioDeOrigin();
  efectos.decir(
    `El sitio en vivo envía el vocabulario de origin/main: ${principal.commit} (${principal.fecha}), el que ` +
      'tenga este clon —la orden no hace fetch—.',
  );
  const versionada = await huellaVersionada(efectos);
  efectos.decir(
    versionada
      ? `El receptor en vivo es el de la huella versionada: ${versionada.commit} (${versionada.escritaEl}).`
      : `Sin huella versionada en ${RUTA_DE_LA_HUELLA}: la referencia es solo el vocabulario de origin/main.`,
  );
  const faltas = [
    ...coberturaDelReceptor(efectos.receptor, principal.vocabulario).map((falta) => `origin/main: ${falta}`),
    ...(versionada
      ? coberturaDelReceptor(efectos.receptor, versionada.vocabulario).map((falta) => `la huella: ${falta}`)
      : []),
  ];
  if (faltas.length > 0) {
    throw new Parada(1, `El receptor de esta rama no guarda todo lo que envía el sitio en vivo:\n  ${faltas.join('\n  ')}`);
  }
}

/** El estado de la tabla de una base: la remota antes de migrar, o la local en el ensayo. */
async function estadoDeLaBase(efectos: Efectos, base: Base): Promise<EstadoDeLaTabla> {
  const columnas = columnasDelPragma(await consultar(efectos, SQL_DE_COLUMNAS, base, 'leer las columnas'));
  const conTabla = (await consultar(efectos, SQL_DE_TABLA_DE_MIGRACIONES, base, 'buscar d1_migrations')).length > 0;
  const anotadas = conTabla
    ? (await consultar(efectos, SQL_DE_MIGRACIONES_ANOTADAS, base, 'leer d1_migrations')).map((f) => String(f.name))
    : [];
  return estadoDeLaTabla(columnas, anotadas, await efectos.migraciones());
}

/**
 * Las filas de la tabla —N, el coste del barajado y de cada recorrido— y las que leyó D1 para
 * darlas: un entero, o una parada que dice qué llegó.
 */
async function contarFilasConMedida(efectos: Efectos, base: Base): Promise<{ filas: number; leidas?: number }> {
  const salida = await efectos.wrangler(argumentosDeConsulta(SQL_DE_FILAS, base));
  const leido = leerConsulta(salida.stdout);
  if (!leido.ok) throw new Parada(1, `No se pudo contar las filas: ${leido.motivo}${causaDe(salida)}`);
  const [fila] = leido.filas;
  const filas = Number(fila?.n);
  if (fila === undefined || fila.n === null || !Number.isSafeInteger(filas) || filas < 0) {
    throw new Parada(
      1,
      `No se juzga ninguna cuota: el recuento de filas no es un número (${JSON.stringify(fila ?? null)}).`,
    );
  }
  return leido.leidas === undefined ? { filas } : { filas, leidas: leido.leidas };
}

async function contarFilas(efectos: Efectos, base: Base): Promise<number> {
  return (await contarFilasConMedida(efectos, base)).filas;
}

/** `d1 info --json`: lo que contesta `wrangler`, y la causa si salió distinto de 0. */
async function pedirInformacion(efectos: Efectos): Promise<{ salida: Salida; causa: string }> {
  const salida = await efectos.wrangler(ARGUMENTOS_DE_INFORMACION);
  return { salida, causa: salida.codigo === 0 ? '' : causaDe(salida) };
}

/**
 * Lo escrito y lo leído en 24 h, de `d1 info --json`, para los juicios de `desplegar`. Sin lo
 * escrito se para (no se sabe si el barajado cabe); lo leído va como venga, y lo juzga el juez.
 */
async function leerCuotasDeDesplegar(efectos: Efectos): Promise<{ escritas24h: number; leidas24h: Leido<number> }> {
  const { salida, causa } = await pedirInformacion(efectos);
  const informacion = leerInformacion(salida.stdout);
  if (!informacion.ok) throw new Parada(1, `No se baraja: ${informacion.motivo}${causaDe(salida)}`);
  return { escritas24h: informacion.escritas24h, leidas24h: leerFilasLeidas24h(salida.stdout, causa) };
}

/**
 * **El juicio de la cuota de lectura antes de leer** (AD-14, Historia 23.13), el mismo para las
 * tres órdenes que recorren la tabla: con lo leído en 24 h —precondición: sin ello, ninguna fila—,
 * el `COUNT(*)` que da N solo si está **bajo** la cuota, y el coste entero de la orden, N × su
 * lista, con la reserva de otro tanto. Con `escritura`, juzga también la cuota de escritura, junta.
 * Si algo no cabe, una parada con `prefijo` y cada juicio que no cabe: no se trocea, y se repite.
 * El coste del `COUNT(*)` entra en la cuenta, porque es el primero de la lista.
 */
async function contarYJuzgar(
  efectos: Efectos,
  datos: {
    leidas24h: Leido<number>;
    recorridos: readonly Recorrido[];
    repetir: string;
    prefijo: string;
    sufijo?: string;
    escritura?: (filas: number) => CuotaAJuzgar;
  },
): Promise<{ filas: number; gasto: Gasto; juicios: JuicioDeCuota[] }> {
  const parar = (juicios: readonly JuicioDeCuota[]) =>
    new Parada(1, `${datos.prefijo}${juicios.map((j) => textoDeCuota(j, datos.repetir)).join('\n')}${datos.sufijo ?? ''}`);
  const previo = juzgarCuota('lectura', { usado: datos.leidas24h, cuota: CUOTA_DE_FILAS_LEIDAS_POR_DIA_EN_D1 });
  if (!previo.cabe) throw parar([previo]);

  let contadas: { filas: number; leidas?: number };
  try {
    contadas = await contarFilasConMedida(efectos, 'remota');
  } catch (error) {
    if (error instanceof Parada) throw new Parada(error.codigo, `${datos.prefijo}${error.message}${datos.sufijo ?? ''}`);
    throw error;
  }
  const { filas, leidas } = contadas;
  const gasto: Gasto = {
    recorridos: datos.recorridos,
    filas,
    enviadas: 1,
    estimado: filas,
    medido: leidas ?? 0,
    sinMedir: leidas === undefined ? 1 : 0,
  };
  const juicios = [
    ...(datos.escritura === undefined ? [] : [juzgarCuota('escritura', datos.escritura(filas))]),
    juzgarCuota('lectura', cuotaDeLectura({ recorridos: datos.recorridos, filas, usado: datos.leidas24h })),
  ];
  const noCaben = juicios.filter((juicio) => !juicio.cabe);
  if (noCaben.length > 0) throw parar(noCaben);
  return { filas, gasto, juicios };
}

/** Lo que una orden dice, al terminar, de lo que leyó: la medida, aparte de la estimación. */
function textoDelGasto(gasto: Gasto): string {
  const sinMedir =
    gasto.sinMedir > 0 ? `; ${gasto.sinMedir} no trajeron rows_read, y la medida se queda corta por ellas` : '';
  return (
    `Filas leídas por esta orden: ${gasto.medido} medidas (suma de los rows_read de ${gasto.enviadas} sentencias` +
    `${sinMedir}), frente a una estimación de ${gasto.estimado} (${gasto.filas} filas por recorrido).`
  );
}

/**
 * Corre un paso de `wrangler` que aplica algo en remoto. Si sale distinto de 0, la parada dice
 * `fallo`; si ni siquiera termina —se cortó por su tope, no arrancó—, el parte anota `quiza`,
 * porque lo que hiciera, entero o a medias, no se sabe.
 */
async function aplicar(
  efectos: Efectos,
  argumentos: readonly string[],
  aplicado: string[],
  pasos: { hecho: string; quiza: string; fallo: string; quizaAlFallar?: boolean },
): Promise<void> {
  let codigo: number;
  try {
    codigo = await efectos.wranglerALaVista(argumentos);
  } catch (error) {
    aplicado.push(pasos.quiza);
    throw error;
  }
  if (codigo !== 0) {
    if (pasos.quizaAlFallar) aplicado.push(pasos.quiza);
    throw new Parada(1, pasos.fallo);
  }
  aplicado.push(pasos.hecho);
}

/**
 * `npm run medicion -- desplegar`, en su orden, parando en el primer fallo con 1 y el parte de
 * lo aplicado (AD-14): sesión, árbol limpio, cobertura, estado de la tabla, `d1 info`, el
 * `COUNT(*)` que da N y **el primer juicio** —escritura del barajado y lectura de toda la orden,
 * juntas—, recuentos, migrar, desplegar, comprobar con balizas, `rowid`, **el segundo juicio**,
 * barajar, recuentos otra vez y, solo si todo eso salió, la huella. No reintenta migraciones ni
 * despliegues, y no hace commit.
 *
 * El primer juicio va antes de migrar y de la primera sentencia que recorre la tabla salvo el
 * `COUNT(*)`: si hoy no cabe, migrar y desplegar para pararse después no sirve de nada, y se repite
 * otro día igual (AD-13, AD-14). El segundo, antes de barajar, juzga lo que falta con el mayor de
 * dos valores —lo que diga `d1 info` y lo del primer juicio más lo que la orden ya gastó—, porque
 * `d1 info` llega con retraso. El N es el del primero: no se vuelve a contar.
 */
export async function desplegar(efectos: Efectos, url: string): Promise<void> {
  const aplicado: string[] = [];
  const instantes: Instantes = {};
  const repetir = 'npm run medicion -- desplegar';
  try {
    await exigirSesion(efectos);
    await exigirArbolLimpio(efectos);
    const commit = (await efectos.git(['rev-parse', 'HEAD'])).trim();
    await exigirCobertura(efectos);

    const hoy = jornadaUtc(efectos.ahora());
    // El estado de la tabla no la recorre: lee su esquema y `d1_migrations`.
    const estado = await estadoDeLaBase(efectos, 'remota');
    if (estado.estado === 'otra') throw new Parada(1, `No se migra: ${estado.motivo}`);
    efectos.decir(
      `La tabla está ${estado.estado}` +
        (estado.pendientes.length > 0 ? `; faltan ${estado.pendientes.join(', ')}.` : '; no falta ninguna migración.'),
    );

    // Las cuotas, antes de tocar nada. La de escritura cuenta ya las balizas que se van a escribir.
    const vocabulario = huellaDelVocabulario();
    const balizas = escriturasDeLasBalizas(vocabulario);
    const previa = await leerCuotasDeDesplegar(efectos);
    const { filas, gasto, juicios } = await contarYJuzgar(efectos, {
      leidas24h: previa.leidas24h,
      recorridos: recorridosDeDesplegar(vocabulario),
      repetir,
      prefijo: 'No se migra ni se despliega: ',
      escritura: (n) =>
        cuotaDelBarajado({ filas: n, escritas24h: previa.escritas24h + balizas, cuota: CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1, balizas }),
    });
    for (const juicio of juicios) efectos.decir(textoDeCuota(juicio, repetir));
    // Tras el juicio, lo leído en 24 h es un número: si no lo fuera, no habría cabido.
    const leidasAntes = previa.leidas24h.ok ? previa.leidas24h.valor : 0;

    const antes = recuentos(await consultar(efectos, SQL_DE_RECUENTOS, 'remota', 'contar las filas de antes', gasto));

    instantes.antesDeMigrar = efectos.ahora();
    efectos.decir(`Instante anterior a la migración: ${instantes.antesDeMigrar.toISOString()}.`);
    await aplicar(efectos, argumentosDeMigracion('remota'), aplicado, {
      hecho: 'las migraciones en remoto',
      quiza: 'quizá parte de las migraciones: lo aplicado lo dice d1_migrations',
      fallo: 'La migración en remoto falló; no se reintenta.',
      quizaAlFallar: true,
    });
    await aplicar(efectos, ARGUMENTOS_DE_DESPLIEGUE, aplicado, {
      hecho: 'el receptor desplegado',
      quiza: `quizá el receptor desplegado: lo dice npx --yes ${WRANGLER} deployments list`,
      fallo:
        'El despliegue del receptor falló; no se reintenta. Cuál está en vivo lo dice ' +
        `npx --yes ${WRANGLER} deployments list, en ${DIRECTORIO_DEL_RECEPTOR}/.`,
    });

    const filasDePrueba = await comprobarConBalizas(efectos, url, 'remota', vocabulario, ESPERA_ENTRE_INTENTOS_EN_VIVO_MS, gasto);
    aplicado.push('la comprobación con balizas, ya borradas');
    exigirRowidAleatorio(filasDePrueba, 'Lo cierra el siguiente despliegue que pase la comprobación.');

    // El segundo juicio. Lo escrito en 24 h, al menos lo de antes más las balizas, y lo leído, al
    // menos lo de antes más lo que esta orden ya leyó: `d1 info` puede no verlo aún.
    const actual = await leerCuotasDeDesplegar(efectos);
    const yaLeido = gastado(gasto);
    const conLoLeido = leidasAntes + yaLeido;
    const segundos = [
      juzgarCuota(
        'escritura',
        cuotaDelBarajado({
          filas,
          escritas24h: Math.max(actual.escritas24h, previa.escritas24h + balizas),
          cuota: CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1,
          balizas,
        }),
      ),
      juzgarCuota(
        'lectura',
        cuotaDeLectura({
          recorridos: RECORRIDOS_DEL_BARAJADO,
          filas,
          usado: actual.leidas24h.ok ? { ok: true, valor: Math.max(actual.leidas24h.valor, conLoLeido) } : actual.leidas24h,
          // La nota, solo cuando lo leído por la orden es lo que manda: si d1 info dice más, ya lo ve.
          nota:
            actual.leidas24h.ok && actual.leidas24h.valor >= conLoLeido
              ? ''
              : ` (contadas unas ${yaLeido} que esta orden ya leyó, que d1 info puede no ver todavía)`,
        }),
      ),
    ];
    const noCaben = segundos.filter((juicio) => !juicio.cabe);
    if (noCaben.length > 0) {
      throw new Parada(
        1,
        [...noCaben.map((juicio) => textoDeCuota(juicio, repetir)), 'No se baraja ni se escribe la huella.'].join('\n'),
      );
    }
    for (const juicio of segundos) efectos.decir(textoDeCuota(juicio, repetir));

    instantes.antesDeBarajar = efectos.ahora();
    efectos.decir(`Instante anterior al barajado: ${instantes.antesDeBarajar.toISOString()}.`);
    try {
      await consultar(efectos, SQL_DE_BARAJADO, 'remota', 'barajar el rowid', gasto);
    } catch (error) {
      aplicado.push('quizá el barajado: wrangler no dijo que saliera bien, ni que no');
      throw error;
    }
    aplicado.push('el rowid barajado');

    const despues = recuentos(await consultar(efectos, SQL_DE_RECUENTOS, 'remota', 'contar las filas de después', gasto));
    efectos.decir(informeDeRecuentos(antes, despues));
    const diferencias = compararRecuentos(antes, despues, hoy);
    if (diferencias.length > 0) {
      throw new Parada(1, `Los recuentos de antes y de después no casan:\n  ${diferencias.join('\n  ')}`);
    }

    await efectos.escribirHuella(
      componerHuella({ escritaEl: jornadaUtc(efectos.ahora()), commit, vocabulario: huellaDelVocabulario() }),
    );
    aplicado.push(`la huella escrita en ${RUTA_DE_LA_HUELLA}`);
    efectos.decir(
      `${textoDelGasto(gasto)}\n${parteDeLoAplicado(aplicado)}\n` +
        `Commitea ${RUTA_DE_LA_HUELLA}: es lo que devuelve npm test a verde. El sitio se despliega después.`,
    );
  } catch (error) {
    // Toda parada lleva el parte, también la de un fallo que no es una parada —escribir la huella
    // tras barajar, un efecto que lanza—: sin él, nadie sabría qué quedó aplicado en producción.
    const parada = error instanceof Parada ? error : new Parada(1, error instanceof Error ? error.message : String(error));
    throw new Parada(parada.codigo, `${parada.message}\n${parteDeLoAplicado(aplicado, instantes)}`);
  }
}

/**
 * `npm run medicion -- comprobar`: que el receptor en vivo guarda lo que dice la huella
 * versionada, descarta lo ajeno y numera al azar. No migra, no despliega, no baraja ni escribe
 * la huella; sí escribe y borra sus balizas en el D1 de producción.
 *
 * Antes de la primera baliza juzga su cuota de lectura (Historia 23.13): con `d1 info` y el
 * `COUNT(*)` que da N, el coste de sus recorridos —cada intento de baliza recorre la tabla dos
 * veces, y el borrado final una más—. Si no cabe, sale con 1 sin enviar ninguna.
 */
export async function comprobar(efectos: Efectos, url: string): Promise<void> {
  await exigirSesion(efectos);
  const huella = await huellaVersionada(efectos);
  if (!huella) {
    throw new Parada(
      1,
      `No hay huella en ${RUTA_DE_LA_HUELLA}: la escribe npm run medicion -- desplegar (Historia 23.3).`,
    );
  }
  const repetir = 'npm run medicion -- comprobar';
  const { salida, causa } = await pedirInformacion(efectos);
  const { gasto, juicios } = await contarYJuzgar(efectos, {
    leidas24h: leerFilasLeidas24h(salida.stdout, causa),
    recorridos: recorridosDeComprobar(huella.vocabulario),
    repetir,
    prefijo: 'No se envía ninguna baliza: ',
  });
  for (const juicio of juicios) efectos.decir(textoDeCuota(juicio, repetir));
  const cierre = 'La cierra repetir la 23.3: npm run medicion -- desplegar.';
  try {
    const filas = await comprobarConBalizas(
      efectos,
      url,
      'remota',
      huella.vocabulario,
      ESPERA_ENTRE_INTENTOS_EN_VIVO_MS,
      gasto,
    );
    exigirRowidAleatorio(filas, cierre);
  } catch (error) {
    if (error instanceof Parada && !error.message.includes(cierre)) {
      throw new Parada(error.codigo, `${error.message}\n${cierre}`);
    }
    throw error;
  }
  efectos.decir(
    `El receptor en vivo guarda cada evento y cada valor de la huella (${huella.commit}), descarta lo ajeno, ` +
      `numera al azar y las balizas se borraron.\n${textoDelGasto(gasto)}`,
  );
}

/**
 * Lo que la lectura gastó de la cuota de lectura, para el informe (Historia 23.13): lo leído en 24 h
 * antes de leer, la estimación —N × los recorridos declarados— y la medida —la suma de los
 * `rows_read` de lo enviado—, cada una por su lado.
 */
export interface GastoDeLaLectura {
  /** `rows_read_24h` de `d1 info`, antes de leer. */
  leidas24h: number;
  /** N, las filas de la tabla, del `COUNT(*)`. */
  filas: number;
  recorridos: readonly Recorrido[];
  /** N × los recorridos: una cota inferior. */
  estimacion: number;
  /** Lo que se dejó para el resto del día: otro tanto de lo leído en 24 h. */
  reserva: number;
  cuota: number;
  /** La suma de los `rows_read` de las sentencias enviadas que lo trajeron. */
  medida: number;
  /** Cuántas sentencias de la lista se enviaron. */
  enviadas: number;
  /** Cuántas de ellas no trajeron `rows_read`. */
  sinMedir: number;
}

/** Lo que trae la lectura de D1, sin tocar todavía: el informe lo compone `tools/lib/lineaBase.ts`. */
export interface LecturaCruda<C> {
  /** La jornada UTC de hoy, que no entra: solo se leen jornadas cerradas. */
  hoy: string;
  /** Lo que devolvió `leerCorpus`: el Corpus de este equipo, del que sale el censo. */
  corpus: C;
  /** Cada consulta, con sus filas o con por qué no se leyó. */
  consultas: { readonly [Q in ConsultaDeLaLectura]: Filas };
  cuota: CuotaLeida;
  gasto: GastoDeLaLectura;
}

/** El encabezado de la parada y del informe cuando ninguna consulta trae recuentos con forma. */
export const NINGUNA_CONSULTA_CON_FORMA = 'Ninguna consulta con forma —ninguna trajo recuentos que se puedan leer—:';

/**
 * `npm run medicion` sin subcomando: la lectura de la línea base (Historias 23.10 y 23.13, AD-14,
 * AD-22).
 *
 * Sesión de `wrangler` —sin ella, 2; ilegible, 1—, el Corpus —sin él no se sabe qué publica el
 * sitio, y sale con 1—, **todo lo local antes de lo remoto que lee filas** (los umbrales los juzga
 * la cáscara antes de llamar); después `d1 info`, cuyo `rows_read_24h` es precondición, el `COUNT(*)`
 * que da N y el juicio de la cuota de lectura —N × sus recorridos declarados, con la reserva—, y solo si
 * cabe las cinco consultas con `--remote`. **Solo lee**: no despliega, no migra, no envía balizas ni
 * toca git, la huella o el disco. Una consulta que falla no para: va con su motivo, y el informe
 * omite y nombra lo que dependía de ella. Si ninguna trae filas, sale con 1 nombrando cada una.
 */
export async function leer<C>(efectos: Efectos, leerCorpus: () => Promise<C>): Promise<LecturaCruda<C>> {
  await exigirSesion(efectos);
  let corpus: C;
  try {
    corpus = await leerCorpus();
  } catch (error) {
    throw new Parada(
      1,
      `No se pudo leer el Corpus: ${error instanceof Error ? error.message : String(error)}. Sin él no se sabe ` +
        'qué publica el sitio, así que no se lee ni se reparte nada.',
    );
  }
  const hoy = jornadaUtc(efectos.ahora());
  const sentencias = consultasDeLaLectura(hoy);
  const recorridos = recorridosDeLaLectura(hoy);
  // Un `wrangler` que se corta —su tope de tiempo, más salida de la que cabe, un `npx` que no
  // arranca— es una consulta que falla, y no se lleva lo ya leído: va a «Sin leer» con su motivo.
  const mensajeDe = (error: unknown) => (error instanceof Error ? error.message : String(error));

  let cuota: CuotaLeida;
  let leidas24h: Leido<number>;
  try {
    const { salida, causa } = await pedirInformacion(efectos);
    cuota = leerInformacionDeLaCuota(salida.stdout, causa);
    leidas24h = leerFilasLeidas24h(salida.stdout, causa);
  } catch (error) {
    const motivo = mensajeDe(error);
    cuota = { escritas: { ok: false, motivo }, tamaño: { ok: false, motivo } };
    leidas24h = { ok: false, motivo };
  }
  const { filas, gasto } = await contarYJuzgar(efectos, {
    leidas24h,
    recorridos,
    repetir: 'npm run medicion',
    prefijo: 'No se lee: ',
    sufijo: '\nConsulta: no se ha escrito nada.',
  });

  const consultas = {} as Record<ConsultaDeLaLectura, Filas>;
  for (const nombre of CONSULTAS_DE_LA_LECTURA) {
    let salida: Salida;
    try {
      salida = await efectos.wrangler(argumentosDeConsulta(sentencias[nombre], 'remota'));
    } catch (error) {
      apuntar(gasto, sentencias[nombre], undefined);
      consultas[nombre] = { ok: false, motivo: mensajeDe(error) };
      continue;
    }
    const leido = leerConsulta(salida.stdout);
    apuntar(gasto, sentencias[nombre], leido.ok ? leido.leidas : undefined);
    consultas[nombre] = leido.ok ? leido : { ok: false, motivo: `${leido.motivo}${causaDe(salida)}` };
  }

  if (CONSULTAS_DE_LA_LECTURA.every((nombre) => !consultas[nombre].ok)) {
    const motivo = (leido: Filas) => (leido.ok ? '' : leido.motivo);
    throw new Parada(
      1,
      [
        NINGUNA_CONSULTA_CON_FORMA,
        ...CONSULTAS_DE_LA_LECTURA.map((nombre) => `  ${QUE_LEE[nombre]}: ${motivo(consultas[nombre])}`),
        'Consulta: no se ha escrito nada.',
      ].join('\n'),
    );
  }
  const usadas = leidas24h.ok ? leidas24h.valor : 0;
  return {
    hoy,
    corpus,
    consultas,
    cuota,
    gasto: {
      leidas24h: usadas,
      filas,
      recorridos,
      estimacion: filas * vecesQueRecorre(recorridos),
      reserva: usadas,
      cuota: CUOTA_DE_FILAS_LEIDAS_POR_DIA_EN_D1,
      medida: gasto.medido,
      enviadas: gasto.enviadas,
      sinMedir: gasto.sinMedir,
    },
  };
}

/**
 * `npm run medicion -- ensayo`: la secuencia de `desplegar` contra el receptor local, salvo lo que
 * solo existe en remoto —migrar, que ya hizo `local`, desplegar y `d1 info`— y la huella.
 *
 * Así todo el SQL de `desplegar` —el estado de la tabla con `PRAGMA table_info`, `sqlite_master` y
 * `d1_migrations`, los recuentos, el de filas, las balizas y el barajado— corre contra un D1 de
 * verdad y con las respuestas de verdad de `wrangler`, antes de la primera vez que se corre en
 * producción (23.3). Escribe y baraja solo el D1 local.
 */
export async function ensayo(efectos: Efectos): Promise<void> {
  if (!(await efectos.sondear(PUNTO_FINAL_LOCAL))) {
    throw new Parada(1, `El receptor local no responde en ${PUNTO_FINAL_LOCAL}: arráncalo con npm run medicion -- local.`);
  }
  const hoy = jornadaUtc(efectos.ahora());
  const antes = recuentos(await consultar(efectos, SQL_DE_RECUENTOS, 'local', 'contar las filas de antes'));
  const estado = await estadoDeLaBase(efectos, 'local');
  if (estado.estado !== 'migrada') {
    throw new Parada(
      1,
      `El D1 local no es la tabla migrada: ${estado.estado === 'otra' ? estado.motivo : `está ${estado.estado}.`} ` +
        `npm run medicion -- local la migra al arrancar; si no puede, borra ${DIRECTORIO_DEL_RECEPTOR}/.wrangler/ y repite.`,
    );
  }
  const filasDePrueba = await comprobarConBalizas(
    efectos,
    PUNTO_FINAL_LOCAL,
    'local',
    huellaDelVocabulario(),
    ESPERA_ENTRE_INTENTOS_EN_LOCAL_MS,
  );
  exigirRowidAleatorio(filasDePrueba, 'El receptor local es el de esta rama: mira medicion/worker.ts.');

  const filas = await contarFilas(efectos, 'local');
  await consultar(efectos, SQL_DE_BARAJADO, 'local', 'barajar el rowid');
  const despues = recuentos(await consultar(efectos, SQL_DE_RECUENTOS, 'local', 'contar las filas de después'));
  efectos.decir(informeDeRecuentos(antes, despues));
  const diferencias = compararRecuentos(antes, despues, hoy);
  if (diferencias.length > 0) {
    throw new Parada(1, `Los recuentos del D1 local de antes y de después no casan:\n  ${diferencias.join('\n  ')}`);
  }
  efectos.decir(
    'Cada evento y cada valor del vocabulario llegó al D1 local, lo ajeno se descartó, el rowid es aleatorio ' +
      `y las balizas se borraron; la tabla es la migrada, y barajar sus ${filas} filas dejó los recuentos iguales.`,
  );
}
