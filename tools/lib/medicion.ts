/**
 * La parte pura de `npm run medicion` — AD-13, AD-14, AD-22, Historia 23.2.
 *
 * Aquí se decide todo lo que la orden hace y nada se hace: qué argumentos lleva cada orden de
 * `wrangler`, qué SQL se envía, qué balizas de prueba cubren el vocabulario, cómo se lee lo que
 * contesta D1, si el `rowid` es aleatorio, si el barajado cabe en la cuota del día, si los
 * recuentos de antes y de después casan y cómo se escribe y se lee la huella. La red, los
 * procesos y el disco son de la cáscara, `tools/medicion.ts`, y esto se prueba con respuestas
 * fijas en `tests/unit/medicion-orden.test.ts`, sin tocar ningún D1.
 *
 * Ningún SQL de aquí ordena: el `rowid` es aleatorio (Historia 23.12) y solo lo nombran la
 * lectura de las balizas de prueba, como texto, y el barajado.
 */

import * as vocabularioDeLaRama from '../../src/lib/vocabulario.ts';
import type { DeclaracionDeCampo } from '../../src/lib/vocabulario.ts';
import type { Registro } from '../../medicion/receptor.ts';
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

/** Los subcomandos, y nada más: ni banderas ni argumentos sueltos. */
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

/**
 * Las balizas de prueba tal como quedaron, con el `rowid` leído como texto —un entero de 64
 * bits se redondea en JavaScript— y las columnas de los campos que se comprueban.
 */
export function sqlDeLasBalizas(campos: readonly string[]): string {
  const columnas = ['evento', 'ruta', ...campos].join(', ');
  return (
    `SELECT CAST(rowid AS TEXT) AS fila, ${columnas} FROM eventos ` +
    `WHERE ruta = '${RUTA_DE_COMPROBACION}'`
  );
}

// ── La invocación ─────────────────────────────────────────────────────────────────────────

export type Invocacion = { ok: true; subcomando: Subcomando } | { ok: false; motivo: string };

/** El subcomando, o por qué la invocación no vale (código 2, sin tocar nada). */
export function argumentosDeMedicion(argumentos: readonly string[]): Invocacion {
  const [primero, ...resto] = argumentos;
  const uso = `Uso: npm run medicion -- ${SUBCOMANDOS.join(' | ')}`;
  if (primero === undefined) return { ok: false, motivo: `Falta el subcomando. ${uso}` };
  if (!(SUBCOMANDOS as readonly string[]).includes(primero)) {
    return { ok: false, motivo: `«${primero}» no es un subcomando de esta orden. ${uso}` };
  }
  const motivos = motivosDeArgumentosNoReconocidos([...resto], { solas: [], conValor: [] });
  if (motivos.length > 0) return { ok: false, motivo: `${motivos.join(' ')} ${uso}` };
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
  return { ok: true, url };
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

export type Filas = { ok: true; filas: Record<string, unknown>[] } | { ok: false; motivo: string };

/**
 * `d1 execute --json` de una sola sentencia: `[{ results: [...], success: true }]`; si falla,
 * `{ error: { text } }`.
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
  return { ok: true, filas: ultimo.results as Record<string, unknown>[] };
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

/** El SQL sin comentarios. Las migraciones no llevan literales con `--` ni con `/*`. */
function sinComentarios(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

/** Las columnas que una migración crea o añade, en su orden. */
export function columnasDeLaMigracion(sql: string): Columna[] {
  const limpio = sinComentarios(sql);
  const columnas: Columna[] = [];
  const creacion = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?eventos\s*\(([\s\S]*?)\)\s*;/i.exec(limpio);
  if (creacion) {
    for (const definicion of creacion[1].split(',')) {
      const columna = columnaDe(definicion);
      if (columna) columnas.push(columna);
    }
  }
  for (const alta of limpio.matchAll(/ALTER\s+TABLE\s+eventos\s+ADD\s+(?:COLUMN\s+)?([^;]+);/gi)) {
    const columna = columnaDe(alta[1]);
    if (columna) columnas.push(columna);
  }
  return columnas;
}

function columnaDe(definicion: string): Columna | undefined {
  const partes = /^\s*([a-z_][a-z0-9_]*)\s+([a-z]+)(.*)$/is.exec(definicion);
  if (!partes) return undefined;
  return { nombre: partes[1], tipo: partes[2].toUpperCase(), noNula: /\bNOT\s+NULL\b/i.test(partes[3]) };
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

  const acumuladas: Columna[] = [];
  for (let i = 0; i < ordenadas.length; i++) {
    acumuladas.push(...columnasDeLaMigracion(ordenadas[i].sql));
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
      `La de partida es ${describir(columnasDeLaMigracion(ordenadas[0].sql))}; ` +
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
    diferencias.push(`los tramos: ${lados.a} dice [${tramos(a)}] y ${lados.b} [${tramos(b)}].`);
  }
  return diferencias;
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

export interface BalizasDePrueba {
  /** Lo que se envía al receptor, una carga por baliza. */
  balizas: Record<string, string>[];
  /** La fila que cada una tiene que dejar: evento, ruta y cada campo, nulo si no lo lleva. */
  esperadas: Record<string, string | null>[];
  /** Las columnas que se leen para cotejarlas. */
  campos: string[];
}

/**
 * Las balizas que cubren todo par evento–campo–valor del vocabulario, a `/__comprobacion/`.
 *
 * Por evento, tantas como valores tenga su campo más largo: la i-ésima lleva el valor i de cada
 * campo, y los campos más cortos vuelven a empezar. Así cada valor de cada campo sale al menos
 * una vez sin una baliza por combinación.
 */
export function balizasDePrueba(vocabulario: VocabularioDeHuella): BalizasDePrueba {
  const campos = camposDe(vocabulario);
  const balizas: Record<string, string>[] = [];
  const esperadas: Record<string, string | null>[] = [];
  for (const [evento, declarados] of Object.entries(vocabulario.eventos)) {
    const listas = Object.entries(declarados).map(
      ([campo, { valores }]) => [campo, valores === 'texto' ? [TEXTO_DE_PRUEBA] : valores] as const,
    );
    const cuantas = Math.max(1, ...listas.map(([, valores]) => valores.length));
    for (let i = 0; i < cuantas; i++) {
      const baliza: Record<string, string> = { evento, ruta: RUTA_DE_COMPROBACION };
      const esperada: Record<string, string | null> = { evento, ruta: RUTA_DE_COMPROBACION };
      for (const campo of campos) esperada[campo] = null;
      for (const [campo, valores] of listas) {
        const valor = valores[i % valores.length];
        baliza[claveDe(vocabulario, campo)] = valor;
        esperada[campo] = valor;
      }
      balizas.push(baliza);
      esperadas.push(esperada);
    }
  }
  return { balizas, esperadas, campos };
}

const firmaDe = (fila: Record<string, unknown>, columnas: readonly string[]) =>
  columnas.map((c) => `${c}=${fila[c] === null || fila[c] === undefined ? '∅' : String(fila[c])}`).join(' ');

/**
 * Lo esperado frente a lo leído, como multiconjuntos de filas sin el `rowid`. Cada fila que
 * falta y cada una que sobra, nombradas; vacío si casan.
 */
export function cotejarFilas(
  esperadas: readonly Record<string, string | null>[],
  leidas: readonly Record<string, unknown>[],
  campos: readonly string[],
): string[] {
  const columnas = ['evento', 'ruta', ...campos];
  const pendientes = new Map<string, number>();
  for (const fila of esperadas) {
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
 * Con `rowid` aleatorio entre 0 y 2^63, unas pocas filas quedan separadas por mucho más de 2^32;
 * numerando en orden de llegada quedan contiguas, o casi si entretanto llegó tráfico —también
 * con 19 cifras, cuando un receptor viejo numera `max(rowid)+1` sobre los aleatorios—. Con
 * menos de dos no se puede decir.
 */
export function rowidAleatorio(filas: readonly string[]): Orden {
  const numeros: bigint[] = [];
  for (const fila of filas) {
    if (!/^-?\d+$/.test(fila.trim())) continue;
    numeros.push(BigInt(fila.trim()));
  }
  if (numeros.length < 2) return 'insuficiente';
  let menor = numeros[0];
  let mayor = numeros[0];
  for (const n of numeros) {
    if (n < menor) menor = n;
    if (n > mayor) mayor = n;
  }
  return mayor - menor >= 2n ** 32n ? 'aleatorio' : 'contiguo';
}

// ── La cuota y los recuentos ──────────────────────────────────────────────────────────────

export interface Barajado {
  cabe: boolean;
  coste: number;
  disponible: number;
  mensaje: string;
}

/**
 * Si barajar cabe en lo que queda de la cuota de escritura del día (AD-13): unas tres filas
 * escritas por fila. Si no cabe, no se baraja ni se trocea: se repite otro día.
 */
export function cabeElBarajado(datos: { filas: number; escritas24h: number; cuota: number }): Barajado {
  const coste = datos.filas * FILAS_ESCRITAS_POR_FILA_BARAJADA;
  const disponible = Math.max(0, datos.cuota - datos.escritas24h);
  const cabe = datos.escritas24h + coste <= datos.cuota;
  const cifras =
    `barajar ${datos.filas} filas escribe unas ${coste} (${FILAS_ESCRITAS_POR_FILA_BARAJADA} por fila), ` +
    `y de la cuota de ${datos.cuota} filas escritas al día van ${datos.escritas24h} en las últimas 24 h`;
  return {
    cabe,
    coste,
    disponible,
    mensaje: cabe
      ? `El barajado cabe: ${cifras}.`
      : `El barajado no cabe hoy: ${cifras}, y quedan ${disponible}. No se baraja ni se trocea: ` +
        'repite `npm run medicion -- desplegar` otro día.',
  };
}

/** Los recuentos por jornada y evento: `«jornada» «evento»` → filas. */
export type Recuentos = ReadonlyMap<string, number>;

export function recuentos(filas: readonly Record<string, unknown>[]): Recuentos {
  const mapa = new Map<string, number>();
  for (const fila of filas) mapa.set(`${String(fila.jornada)} ${String(fila.evento)}`, Number(fila.n));
  return mapa;
}

/**
 * Lo que cambió de un recuento a otro y no debía. Las jornadas cerradas —anteriores a `hoy`, en
 * UTC— tienen que ser idénticas: migrar y barajar no pierden ni inventan filas. La de hoy, y las
 * posteriores si la orden cruzó la medianoche, solo pueden crecer: el tráfico sigue llegando.
 */
export function compararRecuentos(antes: Recuentos, despues: Recuentos, hoy: string): string[] {
  const diferencias: string[] = [];
  const claves = [...new Set([...antes.keys(), ...despues.keys()])].sort();
  for (const clave of claves) {
    const [jornada] = clave.split(' ');
    const a = antes.get(clave) ?? 0;
    const d = despues.get(clave) ?? 0;
    if (jornada < hoy && a !== d) {
      diferencias.push(`la jornada cerrada ${clave} tenía ${a} filas y ahora tiene ${d}.`);
    } else if (jornada >= hoy && d < a) {
      diferencias.push(`la jornada ${clave}, que sigue abierta, tenía ${a} filas y ahora tiene ${d}: solo puede crecer.`);
    }
  }
  return diferencias;
}

/** La jornada UTC de un instante. */
export function jornadaUtc(instante: Date): string {
  return instante.toISOString().slice(0, 10);
}

// ── El parte ──────────────────────────────────────────────────────────────────────────────

/** Lo que quedó hecho en remoto cuando la orden se para, para que nadie tenga que adivinarlo. */
export function parteDeLoAplicado(aplicado: readonly string[]): string {
  return aplicado.length === 0
    ? 'No se aplicó nada en remoto.'
    : `Quedó aplicado, en este orden: ${aplicado.join('; ')}.`;
}
