/**
 * Corregir o retirar una Cita atribuida, y que conste — Historia 35.8, FR-69, SM-C6, AD-32, AD-35.
 *
 * Dos registros que **solo añaden**, por `appendFile` con relectura (`añadirAlRegistro` de
 * `corpus.ts`), y la lógica pura que los lee:
 *
 *   · `corpus/peticiones-de-retirada.yml` — dos clases de entrada en una lista, `peticion`
 *     `{id, fecha, cita, solicitante, peticion, motivo?}` y `resolucion` `{peticion, fecha,
 *     resolucion}`. Ningún campo admite contacto: el `motivo` con forma de correo o de teléfono se
 *     rechaza (`tieneContacto`).
 *   · `corpus/auditorias-de-atribuidas.yml` — `{mes, muestra, resultados, auditadoEl}`, la
 *     auditoría de SM-C6 que decide una persona sobre la muestra que elige `muestraDeAuditoria`.
 *
 * Retirar por petición (`retirarPorPeticion`) mueve la Cita a `corpus/_revision/` (AD-2), anota
 * su forma en `formas-vedadas.yml` con `retirada` y **no se niega por NFR-5**: informa de lo que
 * quedaría fuera de alcance, que se resuelve en el mismo commit porque el build sigue rompiendo
 * (AD-11 v9.1). Su texto sigue en el historial de git (AD-10, pregunta 25).
 *
 * Lo leen solo `tools/peticion.ts` y sus pruebas: ningún módulo de `src/` nombra estos registros
 * (AD-24), ningún byte de `dist/` sale de ellos, y no fechan ni avisan (no son familia de fichero).
 * Las constantes que gobiernan el plazo, la muestra y el juicio de SM-C6 son de `umbrales.ts` y las
 * fija Héctor; aquí llegan por parámetro, con ellas por omisión.
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import { esJornada } from '../../src/lib/citaDelDia.ts';
import { esAtribuida } from '../../src/lib/clase.ts';
import { formaDeObra } from '../../src/lib/obras.ts';
import { rutaDeCita } from '../../src/lib/superficies.ts';
import {
  FICHERO_DE_AUDITORIAS,
  FICHERO_DE_PETICIONES_DE_RETIRADA,
  añadirAlRegistro,
  leerCitas,
  mover,
  type ClaseRegistrada,
  type Rutas,
} from './corpus.ts';
import { entradaVedada, leerFormasVedadas, registrarFormasVedadas, type FormaVedada } from './formasVedadas.ts';
import { fueraDeAlcanceTras, lineaDeTemas } from './alcance.ts';
import { ajustarTitulosDeObra } from './obras.ts';

// ─── Conjuntos cerrados ──────────────────────────────────────────────────────

/** Quién pide: un conjunto cerrado (AD-35). */
export const SOLICITANTES = ['persona-afectada', 'titular-de-derechos', 'otro'] as const;
export type Solicitante = (typeof SOLICITANTES)[number];

/** Qué se pide. */
export const PETICIONES = ['corregir', 'retirar'] as const;
export type TipoDePeticion = (typeof PETICIONES)[number];

/** Cómo se resolvió. */
export const RESOLUCIONES = ['corregida', 'retirada', 'rechazada'] as const;
export type TipoDeResolucion = (typeof RESOLUCIONES)[number];

/** El resultado de auditar una atribuida de la muestra de SM-C6, que decide una persona. */
export const RESULTADOS_DE_AUDITORIA = ['bien', 'mal-atribuida', 'sin-fuente'] as const;
export type ResultadoDeAuditoria = (typeof RESULTADOS_DE_AUDITORIA)[number];

const enConjunto =
  <T extends string>(conjunto: readonly T[]) =>
  (valor: unknown): valor is T =>
    (conjunto as readonly unknown[]).includes(valor);

export const esSolicitante = enConjunto(SOLICITANTES);
export const esTipoDePeticion = enConjunto(PETICIONES);
export const esTipoDeResolucion = enConjunto(RESOLUCIONES);
export const esResultadoDeAuditoria = enConjunto(RESULTADOS_DE_AUDITORIA);

/** Quién retira primero: el titular de derechos que pide retirar se atiende retirando (FR-69). */
export const SOLICITANTE_QUE_RETIRA_PRIMERO: Solicitante = 'titular-de-derechos';

// ─── Las entradas ────────────────────────────────────────────────────────────

export interface Peticion {
  id: number;
  fecha: string;
  cita: string;
  solicitante: Solicitante;
  peticion: TipoDePeticion;
  motivo?: string;
}

export interface Resolucion {
  peticion: number;
  fecha: string;
  resolucion: TipoDeResolucion;
}

export type EntradaDePeticiones = { peticion: Peticion } | { resolucion: Resolucion };

export interface Auditoria {
  mes: string;
  muestra: string[];
  resultados: Record<string, ResultadoDeAuditoria>;
  auditadoEl: string;
}

const FORMA_DE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const CLAVE_DE_PETICIONES = 'entradas';
const CLAVE_DE_AUDITORIAS = 'auditorias';
const NOMBRE_DE_PETICIONES = `corpus/${FICHERO_DE_PETICIONES_DE_RETIRADA}`;
const NOMBRE_DE_AUDITORIAS = `corpus/${FICHERO_DE_AUDITORIAS}`;

/** Si una cadena es un mes `AAAA-MM`. */
export function esMes(valor: string): boolean {
  return /^\d{4}-(?:0[1-9]|1[0-2])$/u.test(valor);
}

// ─── Contacto ────────────────────────────────────────────────────────────────

const CORREO = /[^\s@]+@[^\s@]+\.[^\s@]+/u;
/** Un usuario de red social («@ana_perez») o un correo dicho con palabras («ana arroba …»). */
const USUARIO_DE_RED = /(?:^|[\s(«"'])@[\p{L}\p{N}_.]{2,}/u;
const ARROBA_ESCRITA = /\barroba\b/iu;
/** Un tramo de cifras con los separadores que lleva un teléfono. */
const TRAMO_DE_CIFRAS = /\+?\(?\d[\d\s().-]*\d/gu;
/**
 * Tramos de siete cifras o más que no son un teléfono: años sueltos o unidos («1984-1990»,
 * «1984 1990») y fechas («2026-11-14», «14.11.2026»).
 */
const NO_ES_TELEFONO = [/^\d{4}(?:\s*[-–.]\s*|\s+)\d{4}(?:(?:\s*[-–.]\s*|\s+)\d{4})*$/u, /^\d{4}-\d{2}-\d{2}$/u, /^\d{1,2}[.-]\d{1,2}[.-]\d{4}$/u];

/**
 * Si un texto lleva un dato de contacto: algo con forma de correo, o un tramo de al menos siete
 * cifras con los separadores de un teléfono (espacios, puntos, guiones, paréntesis, `+`), un
 * usuario de red social («@ana») o la palabra «arroba». Un año, unos años, una fecha o un número de
 * capítulo no lo son. Ningún campo del registro admite contacto (AD-35): el
 * repositorio es público.
 */
export function tieneContacto(texto: string): boolean {
  if (CORREO.test(texto) || USUARIO_DE_RED.test(texto) || ARROBA_ESCRITA.test(texto)) return true;
  for (const [tramo] of texto.matchAll(TRAMO_DE_CIFRAS)) {
    const cifras = tramo.replace(/\D/gu, '').length;
    const limpio = tramo.trim();
    if (cifras >= 7 && !NO_ES_TELEFONO.some((forma) => forma.test(limpio))) return true;
  }
  return false;
}

// ─── Leer y escribir el registro de peticiones ──────────────────────────────

export const CABECERA_DE_PETICIONES_DE_RETIRADA = [
  '# Peticiones de corrección y retirada de una Cita atribuida — Historia 35.8, Épica 35, AD-35',
  '#',
  '# QUÉ REGISTRA. Lo que alguien pidió, por el correo de la línea de retirada, sobre una Cita',
  '# atribuida, y cómo se resolvió. Dos clases de entrada en la misma lista:',
  '#   - peticion: {id, fecha, cita, solicitante, peticion, motivo?}',
  '#       solicitante: persona-afectada, titular-de-derechos u otro; peticion: corregir o retirar.',
  '#   - resolucion: {peticion, fecha, resolucion}',
  '#       peticion: el id de la petición; resolucion: corregida, retirada o rechazada.',
  '#',
  '# NINGÚN CAMPO ADMITE CONTACTO. El repositorio es público: ni el correo ni el teléfono de quien',
  '# pide se anotan, y la orden rechaza un motivo que los lleve.',
  '#',
  '# SOLO AÑADE. Ninguna entrada se reescribe ni se borra. `npm test` comprueba que el fichero',
  '# del commit empieza, byte a byte, por el del commit padre.',
  '#',
  '# NO SE EDITA A MANO. Lo escribe `npm run peticion -- anotar` y `npm run peticion -- resolver`.',
  '# Ningún agente anota una petición que no ha recibido una persona. La petición de retirar de un',
  '# titular de derechos retira la Cita en el mismo gesto; las demás, al resolverlas `retirada`.',
  '#',
  '# Lo lee `npm run peticion`, por mes y con su plazo, y de aquí sale SM-C6. No es una colección:',
  '# ningún módulo de src/ lo lee (AD-24), ningún byte de dist/ sale de él y no fecha ni avisa.',
  '',
  `${CLAVE_DE_PETICIONES}:`,
  '',
].join('\n');

/**
 * Las entradas de un registro de peticiones ya leído; lanza nombrando lo que falla. Juzga cada
 * entrada y también sus relaciones (una resolución sigue a su petición y no la antecede en fecha);
 * `sueltas` juzga solo cada entrada, para validar una que se va a añadir antes de leer el resto.
 */
export function analizarPeticiones(nombre: string, contenido: string, sueltas = false): EntradaDePeticiones[] {
  let leido: unknown;
  try {
    leido = parsearYaml(contenido);
  } catch (fallo) {
    throw new Error(
      `${nombre} no es YAML válido: ${fallo instanceof Error ? fallo.message : String(fallo)}. ` +
        'De este registro sale SM-C6, así que no se lee a medias.',
    );
  }
  if (leido === null || typeof leido !== 'object' || Array.isArray(leido) || !(CLAVE_DE_PETICIONES in leido)) {
    throw new Error(
      `${nombre}: falta la clave «${CLAVE_DE_PETICIONES}:» en la raíz del fichero. Restaure la cabecera del registro.`,
    );
  }
  const lista = (leido as Record<string, unknown>)[CLAVE_DE_PETICIONES];
  if (lista === null || lista === undefined) return [];
  if (!Array.isArray(lista)) {
    throw new Error(`${nombre}: «${CLAVE_DE_PETICIONES}» tiene que ser una lista de entradas, y es ${typeof lista}.`);
  }
  const ids = new Map<number, string>();
  const resueltas = new Set<number>();
  for (const [i, bruta] of lista.entries()) {
    const problema = problemaDeEntrada(bruta, ids, resueltas, sueltas);
    if (problema !== undefined) {
      throw new Error(`${nombre}: la entrada ${i + 1} ${problema} (${JSON.stringify(bruta)}).`);
    }
  }
  return lista as EntradaDePeticiones[];
}

const esObjeto = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Lo que falla en una entrada, también en su relación con las anteriores: el id de una petición no
 * se repite, y una resolución nombra una petición que la precede en la lista, con una fecha que no
 * es anterior a la suya. `ids` lleva la fecha de cada petición ya vista.
 */
function problemaDeEntrada(
  bruta: unknown,
  ids: Map<number, string>,
  resueltas: Set<number>,
  sueltas: boolean,
): string | undefined {
  if (!esObjeto(bruta) || Object.keys(bruta).length !== 1) return 'no es ni una «peticion» ni una «resolucion»';
  if ('peticion' in bruta) {
    const p = bruta.peticion;
    if (!esObjeto(p)) return 'tiene una «peticion» que no es un mapa';
    const ajenas = Object.keys(p).filter((k) => !['id', 'fecha', 'cita', 'solicitante', 'peticion', 'motivo'].includes(k));
    if (ajenas.length > 0) return `declara campos que la petición no tiene (${ajenas.join(', ')})`;
    if (typeof p.id !== 'number' || !Number.isInteger(p.id) || p.id < 1) return 'no declara un id entero positivo';
    if (ids.has(p.id)) return `repite el id ${p.id}`;
    if (typeof p.fecha !== 'string' || !esJornada(p.fecha)) return 'no declara una fecha AAAA-MM-DD que exista';
    if (typeof p.cita !== 'string' || !FORMA_DE_SLUG.test(p.cita)) return 'no declara una cita con forma de slug';
    if (!esSolicitante(p.solicitante)) return `declara el solicitante ${JSON.stringify(p.solicitante)}, y son ${SOLICITANTES.join(', ')}`;
    if (!esTipoDePeticion(p.peticion)) return `declara la petición ${JSON.stringify(p.peticion)}, y son ${PETICIONES.join(' o ')}`;
    if (p.motivo !== undefined && (typeof p.motivo !== 'string' || p.motivo.trim() === '')) return 'declara un motivo vacío o que no es texto';
    if (typeof p.motivo === 'string' && tieneContacto(p.motivo)) return 'lleva un dato de contacto en el motivo, que ningún campo admite';
    ids.set(p.id, p.fecha);
    return undefined;
  }
  if ('resolucion' in bruta) {
    const r = bruta.resolucion;
    if (!esObjeto(r)) return 'tiene una «resolucion» que no es un mapa';
    const ajenas = Object.keys(r).filter((k) => !['peticion', 'fecha', 'resolucion'].includes(k));
    if (ajenas.length > 0) return `declara campos que la resolución no tiene (${ajenas.join(', ')})`;
    if (typeof r.peticion !== 'number' || !Number.isInteger(r.peticion) || r.peticion < 1) return 'no nombra el id entero de su petición';
    if (resueltas.has(r.peticion)) return `resuelve otra vez la petición ${r.peticion}`;
    if (typeof r.fecha !== 'string' || !esJornada(r.fecha)) return 'no declara una fecha AAAA-MM-DD que exista';
    if (!esTipoDeResolucion(r.resolucion)) return `declara la resolución ${JSON.stringify(r.resolucion)}, y son ${RESOLUCIONES.join(', ')}`;
    const deLaPeticion = ids.get(r.peticion);
    if (sueltas) {
      resueltas.add(r.peticion);
      return undefined;
    }
    if (deLaPeticion === undefined) return `resuelve la petición ${r.peticion}, que no está anotada antes en la lista`;
    if (r.fecha < deLaPeticion) return `resuelve la petición ${r.peticion} el ${r.fecha}, antes de su fecha (${deLaPeticion})`;
    resueltas.add(r.peticion);
    return undefined;
  }
  return 'no es ni una «peticion» ni una «resolucion»';
}

/** Las entradas del registro. Uno que no existe se lee vacío; uno ilegible lanza. */
export async function leerPeticiones(rutas: Pick<Rutas, 'peticionesDeRetirada'>): Promise<EntradaDePeticiones[]> {
  if (!existsSync(rutas.peticionesDeRetirada)) return [];
  const contenido = await readFile(rutas.peticionesDeRetirada, 'utf8');
  if (contenido.trim() === '') return [];
  return analizarPeticiones(NOMBRE_DE_PETICIONES, contenido);
}

/** Añade una entrada al registro de peticiones. **Solo añade** (`añadirAlRegistro`). */
export async function registrarEntradaDePeticiones(rutas: Rutas, entrada: EntradaDePeticiones): Promise<string> {
  const bloque =
    'peticion' in entrada
      ? `  - peticion: ${JSON.stringify(entrada.peticion)}\n`
      : `  - resolucion: ${JSON.stringify(entrada.resolucion)}\n`;
  // La entrada sola se juzga sin sus relaciones —su petición está en el fichero, no en el bloque—;
  // el fichero entero que quedaría, con ellas.
  const sola = `${CLAVE_DE_PETICIONES}:\n${bloque}`;
  return añadirAlRegistro({
    ruta: rutas.peticionesDeRetirada,
    raiz: rutas.raiz,
    nombre: NOMBRE_DE_PETICIONES,
    clave: CLAVE_DE_PETICIONES,
    cabecera: CABECERA_DE_PETICIONES_DE_RETIRADA,
    laEntrada: 'peticion' in entrada ? 'la petición' : 'la resolución',
    bloque,
    analizar: (nombre, contenido) => analizarPeticiones(nombre, contenido, contenido === sola),
  });
}

/** Las peticiones y sus resoluciones, separadas. */
export function separarEntradas(entradas: readonly EntradaDePeticiones[]): {
  peticiones: Peticion[];
  resoluciones: Map<number, Resolucion>;
} {
  const peticiones: Peticion[] = [];
  const resoluciones = new Map<number, Resolucion>();
  for (const e of entradas) {
    if ('peticion' in e) peticiones.push(e.peticion);
    else resoluciones.set(e.resolucion.peticion, e.resolucion);
  }
  return { peticiones, resoluciones };
}

/** El id de la siguiente petición: el mayor del registro más uno. */
export function siguienteId(entradas: readonly EntradaDePeticiones[]): number {
  return separarEntradas(entradas).peticiones.reduce((max, p) => Math.max(max, p.id), 0) + 1;
}

// ─── Leer y escribir el registro de auditorías ──────────────────────────────

export const CABECERA_DE_AUDITORIAS = [
  '# Auditorías de SM-C6 — Historia 35.8, Épica 35, AD-32',
  '#',
  '# QUÉ REGISTRA. Cada mes de siembra, una muestra con nombre de Citas atribuidas publicadas al',
  '# cierre del mes se coteja contra una fuente que las documente, y una persona decide cada',
  '# resultado: bien, mal-atribuida o sin-fuente. Una línea por auditoría: mes, muestra,',
  '# resultados y la jornada en que se auditó (auditadoEl).',
  '#',
  '# LA MUESTRA NO SE ELIGE A MANO. Son las MUESTRA_DE_AUDITORIA_SM_C6 atribuidas publicadas al',
  '# cierre del mes con menor SHA-256 de «{slug}|{mes}» (src/lib/umbrales.ts, la fija Héctor).',
  '#',
  '# SOLO AÑADE. Ninguna entrada se reescribe ni se borra; una segunda auditoría del mismo mes se',
  '# añade y la consulta lee la última. `npm test` comprueba que el fichero del commit empieza,',
  '# byte a byte, por el del commit padre.',
  '#',
  '# NO SE EDITA A MANO. Lo escribe `npm run peticion -- auditar <AAAA-MM> --resultado <slug>=…`.',
  '# Ningún agente anota una auditoría que no ha hecho una persona.',
  '#',
  '# Lo lee `npm run peticion` para la proporción mal atribuida de SM-C6. No es una colección:',
  '# ningún módulo de src/ lo lee (AD-24), ningún byte de dist/ sale de él y no fecha ni avisa.',
  '',
  `${CLAVE_DE_AUDITORIAS}:`,
  '',
].join('\n');

/** Las auditorías de un registro ya leído; lanza nombrando lo que falla. */
export function analizarAuditorias(nombre: string, contenido: string): Auditoria[] {
  let leido: unknown;
  try {
    leido = parsearYaml(contenido);
  } catch (fallo) {
    throw new Error(`${nombre} no es YAML válido: ${fallo instanceof Error ? fallo.message : String(fallo)}.`);
  }
  if (!esObjeto(leido) || !(CLAVE_DE_AUDITORIAS in leido)) {
    throw new Error(`${nombre}: falta la clave «${CLAVE_DE_AUDITORIAS}:» en la raíz del fichero. Restaure la cabecera del registro.`);
  }
  const lista = leido[CLAVE_DE_AUDITORIAS];
  if (lista === null || lista === undefined) return [];
  if (!Array.isArray(lista)) {
    throw new Error(`${nombre}: «${CLAVE_DE_AUDITORIAS}» tiene que ser una lista de entradas, y es ${typeof lista}.`);
  }
  for (const [i, a] of lista.entries()) {
    const problema = !esObjeto(a)
      ? 'no es una entrada'
      : Object.keys(a).some((k) => !['mes', 'muestra', 'resultados', 'auditadoEl'].includes(k))
        ? 'declara campos que la auditoría no tiene'
        : typeof a.mes !== 'string' || !esMes(a.mes)
          ? 'no declara un mes AAAA-MM'
          : !Array.isArray(a.muestra) || a.muestra.length === 0 || a.muestra.some((s) => typeof s !== 'string' || !FORMA_DE_SLUG.test(s))
            ? 'no declara una muestra de slugs'
            : new Set(a.muestra).size !== a.muestra.length
              ? 'repite un slug en la muestra'
              : !esObjeto(a.resultados) ||
                  Object.keys(a.resultados).length !== a.muestra.length ||
                  (a.muestra as string[]).some((s) => !esResultadoDeAuditoria((a.resultados as Record<string, unknown>)[s]))
                ? `no declara un resultado (${RESULTADOS_DE_AUDITORIA.join(', ')}) para cada slug de la muestra, y solo para ellos`
                : typeof a.auditadoEl !== 'string' || !esJornada(a.auditadoEl)
                  ? 'no declara auditadoEl AAAA-MM-DD'
                  : undefined;
    if (problema !== undefined) throw new Error(`${nombre}: la entrada ${i + 1} ${problema} (${JSON.stringify(a)}).`);
  }
  return lista as Auditoria[];
}

export async function leerAuditorias(rutas: Pick<Rutas, 'auditoriasDeAtribuidas'>): Promise<Auditoria[]> {
  if (!existsSync(rutas.auditoriasDeAtribuidas)) return [];
  const contenido = await readFile(rutas.auditoriasDeAtribuidas, 'utf8');
  if (contenido.trim() === '') return [];
  return analizarAuditorias(NOMBRE_DE_AUDITORIAS, contenido);
}

/** Añade una auditoría. **Solo añade** (`añadirAlRegistro`). */
export async function registrarAuditoria(rutas: Rutas, auditoria: Auditoria): Promise<string> {
  return añadirAlRegistro({
    ruta: rutas.auditoriasDeAtribuidas,
    raiz: rutas.raiz,
    nombre: NOMBRE_DE_AUDITORIAS,
    clave: CLAVE_DE_AUDITORIAS,
    cabecera: CABECERA_DE_AUDITORIAS,
    laEntrada: 'la auditoría',
    bloque: `  - ${JSON.stringify(auditoria)}\n`,
    analizar: analizarAuditorias,
  });
}

// ─── La Cita de una petición ─────────────────────────────────────────────────

/**
 * Si se puede pedir sobre esta Cita: la valida contra lo publicado o contra el registro de clases
 * (AD-35), así que una atribuida ya retirada se resuelve. `undefined` si vale; si no, por qué.
 */
export function problemaDeLaCita(
  slug: string,
  publicadas: readonly { slug: string; clase?: unknown }[],
  clases: readonly ClaseRegistrada[],
): string | undefined {
  const publicada = publicadas.find((c) => c.slug === slug);
  if (publicada !== undefined && esAtribuida(publicada)) return undefined;
  if (clases.some((e) => e.slug === slug && esAtribuida(e))) return undefined;
  if (publicada !== undefined || clases.some((e) => e.slug === slug)) {
    return `«${slug}» no es una Cita atribuida: el canal de corrección y retirada es de la atribuida (FR-69). Una Cita de siempre se retira con «npm run documentar -- --retirar».`;
  }
  return `No hay ninguna Cita «${slug}», ni publicada ni en el registro de clases. Compruebe el slug: es el del frontmatter.`;
}

// ─── Retirar por petición ────────────────────────────────────────────────────

export type RetiradaPorPeticion =
  | {
      ok: true;
      destino: string;
      origen: string;
      lineas: string[];
      /**
       * Deshace lo que se puede deshacer si después no se anota la petición: la Cita vuelve a su
       * sitio y las Fichas de Obra cuyo título cambió recuperan el de antes. La forma vedada se
       * queda (el registro solo añade), y con su slug no veda a esa misma Cita. Devuelve qué hizo.
       */
      devolver: () => Promise<string[]>;
    }
  | { ok: false; motivos: string[] };

/** El contenido de cada Ficha de Obra activa, para devolverla tal cual. */
async function instantaneaDeFichas(directorio: string): Promise<Map<string, string>> {
  if (!existsSync(directorio)) return new Map();
  const nombres = (await readdir(directorio)).filter((n) => /\.ya?ml$/u.test(n));
  return new Map(
    await Promise.all(nombres.map(async (n) => [join(directorio, n), await readFile(join(directorio, n), 'utf8')] as const)),
  );
}

/**
 * Lo que la retirada por petición dice de NFR-5 — AD-11 v9.1: **informa y no se niega**. Las Citas
 * que quedarían fuera de alcance, con su Tema y su recuento; o que no se pudo comprobar, y que el
 * build lo dirá.
 */
export function informeDeAlcanceDeLaRetirada(alcance: Awaited<ReturnType<typeof fueraDeAlcanceTras>>): string[] {
  if (!alcance.ok) {
    return [
      'No se ha podido comprobar qué quedaría fuera de alcance (NFR-5); el build lo dirá:',
      ...alcance.motivos.filter((m) => m !== 'No se ha escrito nada.').map((m) => `  ${m}`),
    ];
  }
  if (alcance.fuera.length === 0) return ['Ninguna otra Cita queda fuera de alcance (NFR-5).'];
  return [
    `La retirada deja ${alcance.fuera.length === 1 ? '1 Cita' : `${alcance.fuera.length} Citas`} fuera de alcance de la portada (NFR-5):`,
    ...alcance.fuera.map((f) => `  · ${f.ruta} — ${lineaDeTemas(f.temas, f.declarados)}`),
    'No se niega por ello —la retirada por petición no espera—, pero el build rompe: deles otro camino en el mismo commit, antes de fusionar.',
  ];
}

/**
 * Retira por petición una atribuida publicada — AD-35. **No se niega por NFR-5**: informa de lo
 * que dejaría fuera de alcance. Mueve el fichero a `corpus/_revision/`, anota su forma vedada
 * (`retirada`, con su slug) y pone al día el título de su Ficha de Obra. Si la forma no se puede
 * anotar, la Cita vuelve. Quien la llama anota después la petición o la resolución; si eso
 * falla, devuelve la Cita con `mover(destino, origen)`.
 */
export async function retirarPorPeticion(rutas: Rutas, slug: string, fecha: string): Promise<RetiradaPorPeticion> {
  const cita = (await leerCitas(rutas.citas)).find((c) => c.slug === slug);
  if (cita === undefined) return { ok: false, motivos: [`«${slug}» no está publicada: no hay nada que retirar.`] };
  if (!esAtribuida(cita)) return { ok: false, motivos: [`«${slug}» no es una Cita atribuida.`] };
  try {
    await leerFormasVedadas(rutas);
  } catch (fallo) {
    return { ok: false, motivos: [`${fallo instanceof Error ? fallo.message : String(fallo)} No se ha retirado nada.`] };
  }

  // Lo que quedaría fuera de alcance: se informa, no se niega (AD-11 v9.1).
  const alcance = await fueraDeAlcanceTras(rutas, (datos) => ({
    ...datos,
    citas: datos.citas.filter((c) => c.slug !== slug),
  }));
  const informeDeAlcance = informeDeAlcanceDeLaRetirada(alcance);

  const origen = dirname(cita.ruta);
  let destino: string;
  try {
    destino = await mover(cita.ruta, rutas.revision);
  } catch (fallo) {
    return { ok: false, motivos: [`No se pudo retirar ${cita.ruta}: ${fallo instanceof Error ? fallo.message : String(fallo)}`] };
  }

  const vedada: FormaVedada | undefined = entradaVedada(cita.texto, 'retirada', fecha, slug);
  if (vedada !== undefined) {
    try {
      await registrarFormasVedadas(rutas, [vedada]);
    } catch (fallo) {
      let devuelta = true;
      try {
        await mover(destino, origen);
      } catch {
        devuelta = false;
      }
      return {
        ok: false,
        motivos: [
          `No se pudo anotar la forma en corpus/formas-vedadas.yml: ${fallo instanceof Error ? fallo.message : String(fallo)}`,
          devuelta
            ? 'La Cita ha vuelto a corpus/citas/: no se ha retirado nada.'
            : `Y la Cita no pudo volver: está en ${destino}. Devuélvala a ${origen} a mano.`,
        ],
      };
    }
  }

  const obra = cita.procedencia?.obra;
  const conObra = typeof obra === 'string' && formaDeObra(obra) !== '';
  let fichasDeAntes = new Map<string, string>();
  try {
    if (conObra) fichasDeAntes = await instantaneaDeFichas(rutas.obras);
  } catch {
    // Sin instantánea no se podría devolver el título: se ajusta igual y devolver lo dice.
  }
  // `ajustarTitulosDeObra` no lanza: lo que no pudo hacer lo devuelve como línea.
  const titulos = conObra ? await ajustarTitulosDeObra(rutas, cita, [formaDeObra(obra as string)]) : [];
  const cambiadas: [string, string][] = [];
  for (const [ruta, antes] of fichasDeAntes) {
    const ahora = existsSync(ruta) ? await readFile(ruta, 'utf8') : undefined;
    if (ahora !== antes) cambiadas.push([ruta, antes]);
  }

  const devolver = async (): Promise<string[]> => {
    await mover(destino, origen);
    const lineas = ['La Cita ha vuelto a corpus/citas/.'];
    for (const [ruta, antes] of cambiadas) {
      try {
        await writeFile(ruta, antes);
        lineas.push(`  ${ruta} recupera el título que tenía.`);
      } catch (fallo) {
        lineas.push(`  ${ruta} no pudo recuperar su título (${fallo instanceof Error ? fallo.message : String(fallo)}): elíjalo con «npm run obra -- titular».`);
      }
    }
    if (conObra && titulos.length > 0 && cambiadas.length === 0) {
      lineas.push('  Revise el título de su Ficha de Obra: el build avisará si no lo declara ninguna Cita publicada.');
    }
    return lineas;
  };

  return {
    ok: true,
    destino,
    origen,
    devolver,
    lineas: [
      `«${slug}» retirada a ${destino} (${rutaDeCita(slug)} deja de publicarse).`,
      ...(vedada !== undefined ? ['  Su forma queda vedada a la atribuida en corpus/formas-vedadas.yml (retirada).'] : []),
      ...titulos,
      ...informeDeAlcance,
      'corpus/_revision/ no se versiona y git es su única copia: añada el fichero a mano,',
      `  git add ${destino}`,
      'y el texto retirado sigue en el historial de git: sacarlo de ahí es la pregunta 25, y la decide Héctor.',
    ],
  };
}

// ─── Meses y SM-C6 ───────────────────────────────────────────────────────────

/** El mes de una jornada. */
export const mesDe = (fecha: string) => fecha.slice(0, 7);

/** El mes siguiente a uno. */
export function mesSiguiente(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`;
}

/** Días entre dos jornadas (b − a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/**
 * Las atribuidas publicadas al cierre de un mes, sin leer el historial de git: las entradas
 * de la clase atribuida en el registro de clases con fecha ≤ fin de mes, menos las que tienen en
 * `formas-vedadas.yml` una entrada con su slug (`retirada` o `cambio-de-clase`) con fecha ≤ fin de
 * mes y no están publicadas hoy como atribuidas. `publicadasHoy` son, por eso, las **atribuidas**
 * publicadas hoy: una que pasó a ser de siempre (`cambio-de-clase`) deja de contar desde ese mes
 * aunque siga publicada. Una Cita devuelta a mano cuenta como publicada en los meses de en medio.
 * Ordenadas por slug.
 */
export function atribuidasAlCierre(
  mes: string,
  clases: readonly ClaseRegistrada[],
  vedadas: readonly FormaVedada[],
  /** Los slugs de las atribuidas publicadas hoy (`esAtribuida`), no de todas las Citas. */
  publicadasHoy: ReadonlySet<string>,
): string[] {
  const fin = `${mes}-31`;
  const retiradas = new Set(
    vedadas
      .filter((v) => v.slug !== undefined && (v.motivo === 'retirada' || v.motivo === 'cambio-de-clase') && v.fecha <= fin)
      .map((v) => v.slug as string),
  );
  const slugs = new Set(
    clases
      .filter((e) => esAtribuida(e) && e.fecha <= fin)
      .map((e) => e.slug)
      .filter((s) => publicadasHoy.has(s) || !retiradas.has(s)),
  );
  return [...slugs].sort();
}

/** El SHA-256 hex de `{slug}|{mes}`, la clave de la muestra. */
export const claveDeMuestra = (slug: string, mes: string) => createHash('sha256').update(`${slug}|${mes}`).digest('hex');

/**
 * La muestra de la auditoría de SM-C6 de un mes — AD-32: las `n` atribuidas con menor SHA-256 de
 * `{slug}|{mes}` (todas si hay menos). Sin mano: la misma en dos ejecuciones, y otra con otro mes.
 */
export function muestraDeAuditoria(slugs: readonly string[], mes: string, n: number): string[] {
  return [...new Set(slugs)]
    .map((slug) => ({ slug, clave: claveDeMuestra(slug, mes) }))
    .sort((a, b) => (a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : a.slug < b.slug ? -1 : 1))
    .slice(0, Math.max(0, n))
    .map((x) => x.slug);
}

/** Lo que la consulta dice de un mes. */
export interface MesDeSmC6 {
  mes: string;
  cerrado: boolean;
  atribuidas: number;
  peticiones: number;
  retiradas: number;
  /** Por cada cien atribuidas publicadas; ausente sin atribuidas (nunca 0 % por falta de ellas). */
  peticionesPorCien?: number;
  retiradasPorCien?: number;
  auditoria?: { muestra: number; malAtribuidas: number; sinFuente: number; proporcion: number };
}

/**
 * El mes en que cada petición cuenta como retirada (SM-C6), por su id. El gesto que retira es el de
 * la petición de retirar de un titular —se retira al anotarla— o el de una resolución `retirada`,
 * y cuenta **solo si movió la Cita**: la retirada por petición anota la forma vedada con su slug,
 * `retirada` y la fecha del gesto, así que sin esa entrada no se retiró nada (la Cita ya no estaba
 * publicada, o ya no era atribuida). Una Cita cuenta una vez: la primera petición que la retira.
 */
export function mesesDeLasRetiradas(
  peticiones: readonly Peticion[],
  resoluciones: ReadonlyMap<number, Resolucion>,
  vedadas: readonly FormaVedada[],
): Map<number, string> {
  const gestos = peticiones
    .map((p) => {
      const resolucion = resoluciones.get(p.id);
      const fecha =
        p.solicitante === SOLICITANTE_QUE_RETIRA_PRIMERO && p.peticion === 'retirar'
          ? p.fecha
          : resolucion?.resolucion === 'retirada'
            ? resolucion.fecha
            : undefined;
      return { p, fecha };
    })
    .filter((g): g is { p: Peticion; fecha: string } => g.fecha !== undefined)
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.p.id - b.p.id));
  const meses = new Map<number, string>();
  const yaRetiradas = new Set<string>();
  for (const { p, fecha } of gestos) {
    if (yaRetiradas.has(p.cita)) continue;
    if (!vedadas.some((v) => v.slug === p.cita && v.motivo === 'retirada' && v.fecha === fecha)) continue;
    yaRetiradas.add(p.cita);
    meses.set(p.id, mesDe(fecha));
  }
  return meses;
}

/**
 * Los meses de SM-C6, del primero con una atribuida, una petición o una auditoría hasta el de hoy.
 */
export function mesesDeSmC6(contexto: {
  entradas: readonly EntradaDePeticiones[];
  auditorias: readonly Auditoria[];
  clases: readonly ClaseRegistrada[];
  vedadas: readonly FormaVedada[];
  publicadasHoy: ReadonlySet<string>;
  hoy: string;
}): MesDeSmC6[] {
  const { entradas, auditorias, clases, vedadas, publicadasHoy, hoy } = contexto;
  const { peticiones, resoluciones } = separarEntradas(entradas);
  const mesDeHoy = mesDe(hoy);
  const candidatos = [
    ...clases.filter((e) => esAtribuida(e)).map((e) => mesDe(e.fecha)),
    ...peticiones.map((p) => mesDe(p.fecha)),
    ...auditorias.map((a) => a.mes),
  ].filter((m) => m <= mesDeHoy);
  if (candidatos.length === 0) return [];
  const meses: MesDeSmC6[] = [];
  const ultimaAuditoria = new Map<string, Auditoria>();
  for (const a of auditorias) ultimaAuditoria.set(a.mes, a);
  const retiradasPorMes = mesesDeLasRetiradas(peticiones, resoluciones, vedadas);
  for (let mes = candidatos.sort()[0]; mes <= mesDeHoy; mes = mesSiguiente(mes)) {
    const atribuidas = atribuidasAlCierre(mes, clases, vedadas, publicadasHoy).length;
    const deMes = peticiones.filter((p) => mesDe(p.fecha) === mes).length;
    const retiradas = [...retiradasPorMes.values()].filter((m) => m === mes).length;
    const a = ultimaAuditoria.get(mes);
    const malAtribuidas = a === undefined ? 0 : Object.values(a.resultados).filter((r) => r === 'mal-atribuida').length;
    meses.push({
      mes,
      cerrado: mes < mesDeHoy,
      atribuidas,
      peticiones: deMes,
      retiradas,
      ...(atribuidas > 0 ? { peticionesPorCien: (deMes * 100) / atribuidas, retiradasPorCien: (retiradas * 100) / atribuidas } : {}),
      ...(a !== undefined
        ? {
            auditoria: {
              muestra: a.muestra.length,
              malAtribuidas,
              sinFuente: Object.values(a.resultados).filter((r) => r === 'sin-fuente').length,
              proporcion: malAtribuidas / a.muestra.length,
            },
          }
        : {}),
    });
  }
  return meses;
}

export type JuicioDeSmC6 =
  | { estado: 'sin-valores'; faltan: string[] }
  | { estado: 'sin-pareja' }
  | { estado: 'bajo-minimo'; minimo: number }
  | { estado: 'juzgado'; minimo: number; maximo: number; saltos: { mes: string; motivos: string[] }[] };

/**
 * El juicio de SM-C6 — Historia 35.8 [ASSUMPTION del PRD]. Salta en el segundo de dos meses
 * cerrados y seguidos, los dos con al menos `minimo` atribuidas publicadas al cierre, si (a) las
 * peticiones por cada cien del segundo superan las del primero, o (b) la proporción mal atribuida
 * de la auditoría pasa de `maximo` en los dos. Sin las dos constantes no juzga; sin dos meses
 * cerrados seguidos (`sin-pareja`), o si ninguna pareja llega al mínimo, tampoco, y dice cuál. No propone ningún freno: eso lo decide Héctor.
 */
export function juicioDeSmC6(
  meses: readonly MesDeSmC6[],
  constantes: { minimo: number | undefined; maximo: number | undefined },
): JuicioDeSmC6 {
  const { minimo, maximo } = constantes;
  const faltan = [
    ...(minimo === undefined ? ['MIN_ATRIBUIDAS_PARA_JUZGAR_SM_C6'] : []),
    ...(maximo === undefined ? ['MAX_PROPORCION_MAL_ATRIBUIDA_SM_C6'] : []),
  ];
  if (minimo === undefined || maximo === undefined) return { estado: 'sin-valores', faltan };
  const cerrados = meses.filter((m) => m.cerrado);
  const saltos: { mes: string; motivos: string[] }[] = [];
  let juzgadas = 0;
  let parejas = 0;
  for (let i = 1; i < cerrados.length; i += 1) {
    const a = cerrados[i - 1];
    const b = cerrados[i];
    if (mesSiguiente(a.mes) !== b.mes) continue;
    parejas += 1;
    if (a.atribuidas < minimo || b.atribuidas < minimo) continue;
    juzgadas += 1;
    const motivos: string[] = [];
    if (a.peticionesPorCien !== undefined && b.peticionesPorCien !== undefined && b.peticionesPorCien > a.peticionesPorCien) {
      motivos.push(
        `las peticiones por cada cien suben de ${a.peticionesPorCien.toFixed(2)} (${a.mes}) a ${b.peticionesPorCien.toFixed(2)} (${b.mes})`,
      );
    }
    if (a.auditoria !== undefined && b.auditoria !== undefined && a.auditoria.proporcion > maximo && b.auditoria.proporcion > maximo) {
      motivos.push(
        `la proporción mal atribuida pasa de ${maximo} en ${a.mes} (${a.auditoria.proporcion.toFixed(2)}) y en ${b.mes} (${b.auditoria.proporcion.toFixed(2)})`,
      );
    }
    if (motivos.length > 0) saltos.push({ mes: b.mes, motivos });
  }
  if (parejas === 0) return { estado: 'sin-pareja' };
  if (juzgadas === 0) return { estado: 'bajo-minimo', minimo };
  return { estado: 'juzgado', minimo, maximo, saltos };
}

/** Las peticiones sin resolver pasado el plazo; sin plazo, `undefined` (no se juzga). */
export function peticionesVencidas(
  entradas: readonly EntradaDePeticiones[],
  plazo: number | undefined,
  hoy: string,
): Peticion[] | undefined {
  if (plazo === undefined) return undefined;
  const { peticiones, resoluciones } = separarEntradas(entradas);
  return peticiones.filter((p) => !resoluciones.has(p.id) && diasEntre(p.fecha, hoy) > plazo);
}
