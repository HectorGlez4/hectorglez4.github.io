import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { gunzipSync } from 'node:zlib';

/**
 * El índice de `pagefind/`, descodificado y con lo barajado puesto en orden — Historia 26.12.
 *
 * Pagefind 1.5.2 no escribe su índice de forma determinista: en cada construcción —también en
 * dos del mismo commit y la misma jornada— cambia el orden de los filtros de `pf_meta` y el de los
 * valores de cada filtro, y con él el hash del nombre del filtro, el de `pf_meta` y unos bytes de
 * lo comprimido (Spec Change Log de la 26.12, decisión de Héctor). Para saber si la jornada cambia
 * **el contenido** de lo juzgado, los ficheros de índice no se comparan byte a byte sino así: se
 * descomprimen (gzip), se quita la cabecera `pagefind_dcd`, se lee lo que sigue (CBOR o, en los
 * fragmentos, JSON) y se normaliza **solo lo que el experimento del 2026-10-31 vio barajado**, con
 * su nombre:
 *
 *   · en `pf_meta`, la lista de filtros (`[nombre, hash]`), que se ordena por nombre y pierde el
 *     hash del fichero del filtro;
 *   · en cada `pf_filter`, la lista de valores (`[valor, páginas]`), que se ordena por valor;
 *   · en `pagefind-entry.json`, el hash de `pf_meta` de cada idioma, que se borra.
 *
 * Todo lo demás conserva su orden y sus hashes: páginas, posiciones, pesos, trozos del índice,
 * fragmentos y los hashes de fragmentos y trozos, que no se barajan. Si otra lista resultara
 * barajada, se nombra aquí; nunca se ordena todo en general. Lo de `pagefind/` que no es índice
 * —el guion, la interfaz, el wasm— se sigue comparando byte a byte.
 *
 * El descodificador de CBOR es el mínimo que el índice usa (RFC 8949: enteros, cadenas, listas,
 * mapas, etiquetas, simples y flotantes, también de longitud indefinida donde se admite), sin
 * dependencia nueva; lo mal formado lanza.
 */

/** Los ficheros de índice, por su ruta relativa a `dist/`. */
export function esFicheroDeIndice(ruta: string): boolean {
  return (
    ruta === 'pagefind/pagefind-entry.json' ||
    /^pagefind\/[^/]+\.pf_meta$/u.test(ruta) ||
    /^pagefind\/(filter|index|fragment)\/[^/]+\.pf_(filter|index|fragment)$/u.test(ruta)
  );
}

const CABECERA = Buffer.from('pagefind_dcd');
const FIN = Symbol('fin');

/**
 * Un valor CBOR descodificado. Un mapa es la lista de sus pares, para no perder claves no
 * textuales; un valor simple sin nombre es `{ simple: n }`, para no confundirse con un texto.
 */
export type ValorCbor =
  | number
  | bigint
  | string
  | boolean
  | null
  | undefined
  | ValorCbor[]
  | { mapa: [ValorCbor, ValorCbor][] }
  | { etiqueta: number; valor: ValorCbor }
  | { simple: number };

/** Descodifica un único elemento CBOR que ocupa todo `datos`. */
export function descodificarCbor(datos: Uint8Array): ValorCbor {
  const vista = new DataView(datos.buffer, datos.byteOffset, datos.byteLength);
  let pos = 0;
  const exigir = (n: number) => {
    if (pos + n > datos.length) throw new Error(`CBOR truncado en ${pos}`);
  };
  const byte = () => (exigir(1), datos[pos++]);
  const argumento = (mayor: number, adicional: number): number | bigint | null => {
    if (adicional < 24) return adicional;
    if (adicional === 24) return byte();
    if (adicional === 25) return (exigir(2), (pos += 2), vista.getUint16(pos - 2));
    if (adicional === 26) return (exigir(4), (pos += 4), vista.getUint32(pos - 4));
    if (adicional === 27) {
      exigir(8);
      pos += 8;
      const grande = vista.getBigUint64(pos - 8);
      return grande <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(grande) : grande;
    }
    if (adicional === 31) {
      if (mayor === 0 || mayor === 1 || mayor === 6) {
        throw new Error(`CBOR: longitud indefinida en el tipo mayor ${mayor}, que no la admite, en ${pos - 1}`);
      }
      return null;
    }
    throw new Error(`CBOR: información adicional ${adicional} reservada en ${pos - 1}`);
  };
  /** Un elemento completo: un «break» aquí es un error. */
  const elemento = (): ValorCbor => {
    const v = leer();
    if (v === FIN) throw new Error(`CBOR: «break» fuera de un elemento de longitud indefinida, en ${pos - 1}`);
    return v;
  };
  const leer = (): ValorCbor | typeof FIN => {
    const inicial = byte();
    if (inicial === 0xff) return FIN;
    const mayor = inicial >> 5;
    const adicional = inicial & 0x1f;
    if (mayor === 7) {
      if (adicional === 20) return false;
      if (adicional === 21) return true;
      if (adicional === 22) return null;
      if (adicional === 23) return undefined;
      if (adicional === 24) return { simple: byte() };
      if (adicional === 25) {
        const h = (exigir(2), (pos += 2), vista.getUint16(pos - 2));
        const exp = (h >> 10) & 0x1f;
        const mant = h & 0x3ff;
        const v = exp === 0 ? mant * 2 ** -24 : exp === 31 ? (mant === 0 ? Infinity : NaN) : (mant + 1024) * 2 ** (exp - 25);
        return h & 0x8000 ? -v : v;
      }
      if (adicional === 26) return (exigir(4), (pos += 4), vista.getFloat32(pos - 4));
      if (adicional === 27) return (exigir(8), (pos += 8), vista.getFloat64(pos - 8));
      if (adicional < 20) return { simple: adicional };
      throw new Error(`CBOR: simple ${adicional} no admitido en ${pos - 1}`);
    }
    const n = argumento(mayor, adicional);
    if (mayor === 0) return n!;
    if (mayor === 1) return typeof n === 'bigint' ? -1n - n : -1 - (n as number);
    if (mayor === 2 || mayor === 3) {
      const trozos: Uint8Array[] = [];
      const definido = (longitud: number) => {
        exigir(longitud);
        trozos.push(datos.subarray(pos, pos + longitud));
        pos += longitud;
      };
      if (n === null) {
        // Cada trozo de una cadena indefinida es una cadena definida del mismo tipo mayor.
        for (let inicialDelTrozo = byte(); inicialDelTrozo !== 0xff; inicialDelTrozo = byte()) {
          if (inicialDelTrozo >> 5 !== mayor || (inicialDelTrozo & 0x1f) === 31) {
            throw new Error(`CBOR: trozo mal formado en una cadena indefinida, en ${pos - 1}`);
          }
          definido(Number(argumento(mayor, inicialDelTrozo & 0x1f)));
        }
      } else {
        definido(Number(n));
      }
      const junto = Buffer.concat(trozos);
      return mayor === 3 ? junto.toString('utf8') : junto.toString('hex');
    }
    if (mayor === 4) {
      const lista: ValorCbor[] = [];
      if (n === null) for (let v = leer(); v !== FIN; v = leer()) lista.push(v);
      else for (let i = 0; i < Number(n); i++) lista.push(elemento());
      return lista;
    }
    if (mayor === 5) {
      const mapa: [ValorCbor, ValorCbor][] = [];
      if (n === null) for (let k = leer(); k !== FIN; k = leer()) mapa.push([k, elemento()]);
      else for (let i = 0; i < Number(n); i++) mapa.push([elemento(), elemento()]);
      return { mapa };
    }
    return { etiqueta: Number(n), valor: elemento() };
  };
  const valor = elemento();
  if (pos !== datos.length) throw new Error(`CBOR: sobran ${datos.length - pos} bytes tras el elemento`);
  return valor;
}

/** Texto comparable de un valor, en su orden: JSON con los `bigint` como texto. */
const aTexto = (valor: unknown) => JSON.stringify(valor, (_, v: unknown) => (typeof v === 'bigint' ? `${v}n` : v));

const porTexto = (a: unknown, b: unknown) => {
  const [x, y] = [aTexto(a), aTexto(b)];
  return x < y ? -1 : x > y ? 1 : 0;
};

/** Lanza si la estructura no es la que se normaliza: una versión nueva de Pagefind tiene que verse. */
function exigirForma(condicion: boolean, ruta: string, que: string): asserts condicion {
  if (!condicion) throw new Error(`${ruta}: ${que}; ¿cambió el formato del índice de Pagefind?`);
}

/** `pf_meta`: `[versión, páginas, trozos, filtros, órdenes, metadatos]`; los filtros se barajan. */
function normalizarMeta(ruta: string, valor: ValorCbor): ValorCbor {
  exigirForma(Array.isArray(valor) && valor.length >= 4 && Array.isArray(valor[3]), ruta, 'sin la lista de filtros en la posición 3');
  const filtros = (valor[3] as ValorCbor[]).map((filtro) => {
    exigirForma(Array.isArray(filtro) && filtro.length === 2 && typeof filtro[0] === 'string', ruta, 'un filtro no es `[nombre, hash]`');
    return [filtro[0]];
  });
  return [...valor.slice(0, 3), filtros.sort(porTexto), ...valor.slice(4)];
}

/** `pf_filter`: `[nombre, valores]`; los valores (`[valor, páginas]`) se barajan. */
function normalizarFiltro(ruta: string, valor: ValorCbor): ValorCbor {
  exigirForma(Array.isArray(valor) && valor.length === 2 && Array.isArray(valor[1]), ruta, 'no es `[nombre, valores]`');
  return [valor[0], [...(valor[1] as ValorCbor[])].sort(porTexto)];
}

/** El contenido de un fichero de índice, descodificado, normalizado y como texto comparable. */
export function contenidoDeIndice(ruta: string, bytes: Buffer): string {
  if (ruta.endsWith('.json')) {
    const entrada = JSON.parse(bytes.toString('utf8')) as { languages?: Record<string, { hash?: string }> };
    exigirForma(typeof entrada.languages === 'object', ruta, 'sin `languages`');
    for (const idioma of Object.values(entrada.languages!)) delete idioma.hash;
    return aTexto(entrada);
  }
  const crudo = gunzipSync(bytes);
  exigirForma(crudo.subarray(0, CABECERA.length).equals(CABECERA), ruta, 'sin la cabecera pagefind_dcd');
  const cuerpo = crudo.subarray(CABECERA.length);
  if (ruta.endsWith('.pf_fragment')) return aTexto(JSON.parse(cuerpo.toString('utf8')));
  const valor = descodificarCbor(cuerpo);
  if (ruta.endsWith('.pf_meta')) return aTexto(normalizarMeta(ruta, valor));
  if (ruta.endsWith('.pf_filter')) return aTexto(normalizarFiltro(ruta, valor));
  return aTexto(valor);
}

/**
 * El índice de un `dist/`, por clase de fichero (`pagefind-entry.json`, `pf_meta`, `filter`,
 * `index`, `fragment`): la lista ordenada de sus contenidos normalizados con el nombre del fichero
 * del que salen. Los nombres no se comparan —los de filtro y `pf_meta` llevan el hash de lo
 * barajado—; los contenidos, sí, y en ellos van los hashes que no se barajan.
 */
export async function indiceDe(dist: string): Promise<Map<string, { contenido: string; ruta: string }[]>> {
  const ficheros = (await readdir(join(dist, 'pagefind'), { recursive: true, withFileTypes: true }))
    .filter((e) => e.isFile())
    .map((e) => relative(dist, join(e.parentPath, e.name)).split('\\').join('/'))
    .filter(esFicheroDeIndice);
  const porClase = new Map<string, { contenido: string; ruta: string }[]>();
  for (const ruta of ficheros) {
    const clase = ruta.endsWith('.json') ? 'pagefind-entry.json' : ruta.endsWith('.pf_meta') ? 'pf_meta' : ruta.split('/')[1];
    const lista = porClase.get(clase) ?? [];
    lista.push({ contenido: contenidoDeIndice(ruta, await readFile(join(dist, ruta))), ruta });
    porClase.set(clase, lista);
  }
  for (const lista of porClase.values()) lista.sort((a, b) => (a.contenido < b.contenido ? -1 : a.contenido > b.contenido ? 1 : 0));
  return porClase;
}

/**
 * Lo que difiere entre dos índices: por clase, las entradas de uno que no tienen igual en el otro,
 * nombradas por su fichero y el principio de su contenido. Vacío si son el mismo índice.
 */
export function diferenciasDeIndice(
  uno: Map<string, { contenido: string; ruta: string }[]>,
  otro: Map<string, { contenido: string; ruta: string }[]>,
): string[] {
  const diferencias: string[] = [];
  for (const clase of [...new Set([...uno.keys(), ...otro.keys()])].sort()) {
    const restantes = [...(otro.get(clase) ?? [])];
    for (const entrada of uno.get(clase) ?? []) {
      const i = restantes.findIndex((r) => r.contenido === entrada.contenido);
      if (i === -1) diferencias.push(`${clase}: solo en la primera, ${entrada.ruta} (${entrada.contenido.slice(0, 120)}…)`);
      else restantes.splice(i, 1);
    }
    for (const entrada of restantes) diferencias.push(`${clase}: solo en la segunda, ${entrada.ruta} (${entrada.contenido.slice(0, 120)}…)`);
  }
  return diferencias;
}
