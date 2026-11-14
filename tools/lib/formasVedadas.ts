/**
 * Las formas vedadas a la atribuida — Historia 35.7, AD-32, AD-24.
 *
 * Una candidata de la clase de siempre que no pasó el cotejo, o que no traía Procedencia, no
 * puede volver a entrar como atribuida: subiría SM-C1 sacando del denominador lo que no se pudo
 * cotejar. Mientras sigue en `corpus/_revision/`, el alta y la aprobación de una atribuida la ven
 * (FR-14); pero `_revision/` no se versiona, y el día que la candidata ya no está, nadie lo
 * recordaría. Este registro lo recuerda: `corpus/formas-vedadas.yml`, que **solo añade**
 * `{forma, slug?, motivo, fecha}`, con `forma` la canónica de `normalizar` (AD-3).
 *
 *   · Lo escriben solo las órdenes que rechazan una candidata de siempre —`revisar --rechazar` y
 *     la aprobación que la deja en revisión por el cotejo o por la Procedencia— y las que retiran
 *     (`documentar --retirar`, y la retirada por petición de la 35.8).
 *   · Lo leen la puerta de la atribuida en el alta, la aprobación, `npm run atribuida` y el build
 *     (`integraciones/clases.ts`), que lo lee solo para romper: ningún byte de `dist/` sale de él.
 *   · Una entrada `cambio-de-clase` no veda nunca: es la forma de una Cita que vuelve como
 *     atribuida con otro slug. Una entrada con `slug` no veda a la Cita de ese mismo slug, para que
 *     devolver una retirada sea moverla de vuelta.
 *
 * Que solo añada lo comprueba `npm test` contra el primer padre del commit, como el registro de
 * clases. No es familia de ningún fichero: no fecha ni avisa.
 */

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { parse as parsearYaml } from 'yaml';
import { esJornada } from '../../src/lib/citaDelDia.ts';
import { normalizar } from '../../src/lib/normalizar.ts';
import { FICHERO_DE_FORMAS_VEDADAS, type Rutas } from './corpus.ts';

/** Por qué una forma queda vedada a la atribuida: un conjunto cerrado. */
export const MOTIVOS_DE_FORMA_VEDADA = ['cotejo-fallido', 'sin-procedencia', 'retirada', 'cambio-de-clase'] as const;

export type MotivoDeFormaVedada = (typeof MOTIVOS_DE_FORMA_VEDADA)[number];

/** El motivo que no veda: la forma vuelve como atribuida con otro slug. */
export const MOTIVO_CAMBIO_DE_CLASE: MotivoDeFormaVedada = 'cambio-de-clase';

/** Una entrada del registro, tal y como se relee. */
export interface FormaVedada {
  forma: string;
  slug?: string;
  motivo: MotivoDeFormaVedada;
  fecha: string;
}

const NOMBRE = `corpus/${FICHERO_DE_FORMAS_VEDADAS}`;
const CLAVE = 'formas';
const FORMA_DE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/** La cabecera con que se crea el registro. */
export const CABECERA_DE_FORMAS_VEDADAS = [
  '# Formas vedadas a la Cita atribuida — Historia 35.7, Épica 35, AD-32',
  '#',
  '# QUÉ REGISTRA. La forma canónica (AD-3) de cada texto que no puede volver a entrar como',
  '# Cita atribuida: una candidata de la clase de siempre que no pasó el cotejo o no traía',
  '# Procedencia, y toda Cita retirada. Una línea por forma: forma, slug si lo hay, motivo',
  '# (cotejo-fallido, sin-procedencia, retirada o cambio-de-clase) y la jornada en que se anotó.',
  '#',
  '# SOLO AÑADE. Ninguna entrada se reescribe ni se borra. `npm test` comprueba que el fichero',
  '# del commit empieza, byte a byte, por el del commit padre.',
  '#',
  '# NO SE EDITA A MANO. Lo escriben `npx tsx tools/revisar.ts --rechazar`, la aprobación que',
  '# deja una candidata de siempre en revisión por el cotejo o por la Procedencia, y',
  '# `npm run documentar -- --retirar`. Una entrada cambio-de-clase no veda nada, y una entrada',
  '# con slug no veda la Cita de ese mismo slug.',
  '#',
  '# Lo leen el alta, la aprobación y `npm run atribuida`, que se niegan ante una atribuida',
  '# cuyo texto o Variante coincide con una forma de aquí, y el build (integraciones/clases.ts),',
  '# que rompe por lo mismo. No es una colección: ningún byte de dist/ sale de él y no fecha ni',
  '# avisa ninguna superficie.',
  '',
  `${CLAVE}:`,
  '',
].join('\n');

/** Si un valor es uno de los motivos. */
export function esMotivoDeFormaVedada(valor: unknown): valor is MotivoDeFormaVedada {
  return (MOTIVOS_DE_FORMA_VEDADA as readonly unknown[]).includes(valor);
}

/** Las entradas de un registro ya leído, comprobando su forma; lanza nombrando lo que falla. */
function analizar(contenido: string): FormaVedada[] {
  let leido: unknown;
  try {
    leido = parsearYaml(contenido);
  } catch (fallo) {
    throw new Error(
      `${NOMBRE} no es YAML válido: ${fallo instanceof Error ? fallo.message : String(fallo)}. ` +
        'De este registro sale qué no puede entrar como atribuida, así que no se lee a medias.',
    );
  }
  if (leido === null || typeof leido !== 'object' || Array.isArray(leido) || !(CLAVE in leido)) {
    throw new Error(
      `${NOMBRE}: falta la clave «${CLAVE}:» en la raíz del fichero. Las entradas cuelgan de ella; ` +
        'sin la clave, lo que se añada no lo cuenta nadie. Restaure la cabecera del registro.',
    );
  }
  const entradas = (leido as Record<string, unknown>)[CLAVE];
  if (entradas === null || entradas === undefined) return [];
  if (!Array.isArray(entradas)) {
    throw new Error(`${NOMBRE}: «${CLAVE}» tiene que ser una lista de entradas, y es ${typeof entradas}.`);
  }
  for (const [i, entrada] of entradas.entries()) {
    const e = entrada as Record<string, unknown> | null;
    const ajenas =
      e !== null && typeof e === 'object' && !Array.isArray(e)
        ? Object.keys(e).filter((k) => !['forma', 'slug', 'motivo', 'fecha'].includes(k))
        : [];
    const problema =
      e === null || typeof e !== 'object' || Array.isArray(e)
        ? 'no es una entrada'
        : typeof e.forma !== 'string' || e.forma === '' || normalizar(e.forma) !== e.forma
          ? 'no declara una forma canónica (la de normalizar, no vacía)'
          : e.slug !== undefined && (typeof e.slug !== 'string' || !FORMA_DE_SLUG.test(e.slug))
            ? 'declara un slug sin forma de slug'
            : !esMotivoDeFormaVedada(e.motivo)
              ? `declara el motivo ${JSON.stringify(e.motivo)}, y los motivos son ${MOTIVOS_DE_FORMA_VEDADA.join(', ')}`
              : typeof e.fecha !== 'string' || !esJornada(e.fecha)
                ? 'no declara una fecha AAAA-MM-DD que exista'
                : ajenas.length > 0
                  ? `declara campos que el registro no tiene (${ajenas.join(', ')})`
                  : undefined;
    if (problema !== undefined) {
      throw new Error(`${NOMBRE}: la entrada ${i + 1} de «${CLAVE}» ${problema} (${JSON.stringify(entrada)}).`);
    }
  }
  return entradas as FormaVedada[];
}

/**
 * Las entradas del registro. Uno que no existe, o que existe sin contenido —una primera escritura
 * cortada—, se lee vacío; uno ilegible lanza.
 */
export async function leerFormasVedadas(rutas: Pick<Rutas, 'formasVedadas'>): Promise<FormaVedada[]> {
  if (!existsSync(rutas.formasVedadas)) return [];
  const contenido = await readFile(rutas.formasVedadas, 'utf8');
  if (contenido.trim() === '') return [];
  return analizar(contenido);
}

/** Una entrada como se escribe: una línea, con las cadenas entre comillas. */
function lineaDe(e: FormaVedada): string {
  const slug = e.slug !== undefined ? `, slug: ${JSON.stringify(e.slug)}` : '';
  return `  - { forma: ${JSON.stringify(e.forma)}${slug}, motivo: ${e.motivo}, fecha: ${JSON.stringify(e.fecha)} }\n`;
}

/** La clave de una entrada para no repetirla: forma, motivo y slug. */
const claveDe = (e: Pick<FormaVedada, 'forma' | 'motivo' | 'slug'>) => `${e.forma}\u0000${e.motivo}\u0000${e.slug ?? ''}`;

/**
 * La entrada de un texto: su forma canónica, con su motivo, su jornada y, si lo hay, su slug.
 * `undefined` si el texto no tiene forma (solo signos): no hay nada que vedar.
 */
export function entradaVedada(
  texto: string,
  motivo: MotivoDeFormaVedada,
  fecha: string,
  slug?: string,
): FormaVedada | undefined {
  const forma = normalizar(texto);
  if (forma === '') return undefined;
  return { forma, ...(slug !== undefined ? { slug } : {}), motivo, fecha };
}

/**
 * Añade entradas al registro. **Solo añade**, con un único `appendFile`: se crea con `wx` si no
 * existe, se compone en memoria el fichero que quedaría, se analiza y, solo si la lista crece
 * exactamente en lo añadido, se escriben esos bytes al final; después se relee. Una entrada igual
 * a una que ya está (forma, motivo y slug) no se repite. Devuelve las que añadió.
 */
export async function registrarFormasVedadas(
  rutas: Pick<Rutas, 'formasVedadas' | 'raiz'>,
  entradas: readonly FormaVedada[],
): Promise<FormaVedada[]> {
  const ruta = rutas.formasVedadas;
  // Se juzga antes de tocar el disco: una entrada sin forma no crea ni el fichero.
  analizar(`${CABECERA_DE_FORMAS_VEDADAS}${entradas.map(lineaDe).join('')}`);
  const anterior = existsSync(ruta) ? await readFile(ruta, 'utf8') : '';
  const vacio = anterior.trim() === '';
  const habia = vacio ? [] : analizar(anterior);
  const vistas = new Set(habia.map(claveDe));
  const nuevas: FormaVedada[] = [];
  for (const e of entradas) {
    if (vistas.has(claveDe(e))) continue;
    vistas.add(claveDe(e));
    nuevas.push(e);
  }
  if (nuevas.length === 0) return [];

  if (!existsSync(ruta)) {
    await mkdir(rutas.raiz, { recursive: true });
    try {
      await writeFile(ruta, '', { encoding: 'utf8', flag: 'wx' });
    } catch (fallo) {
      if ((fallo as NodeJS.ErrnoException).code !== 'EEXIST') throw fallo;
    }
  }
  const actual = await readFile(ruta, 'utf8');
  if (actual !== anterior) {
    throw new Error(`${NOMBRE} cambió mientras se leía. No se ha escrito nada: repita la orden.`);
  }
  // Un fichero sin contenido recibe la cabecera en el mismo añadido: sigue siendo solo añadir.
  const escribir = `${vacio ? CABECERA_DE_FORMAS_VEDADAS : anterior.endsWith('\n') ? '' : '\n'}${nuevas.map(lineaDe).join('')}`;
  const quedaria = analizar(`${anterior}${escribir}`);
  if (quedaria.length !== habia.length + nuevas.length) {
    throw new Error(
      `${NOMBRE}: añadir al final no deja las entradas colgando de «${CLAVE}:» (había ${habia.length}, ` +
        `se añaden ${nuevas.length} y quedarían ${quedaria.length}). El registro se escribe solo por ` +
        'añadido, así que la lista tiene que ser lo último del fichero. No se ha escrito nada.',
    );
  }
  await appendFile(ruta, escribir, 'utf8');
  const releido = analizar(await readFile(ruta, 'utf8'));
  if (releido.length !== habia.length + nuevas.length) {
    throw new Error(`${NOMBRE}: tras escribir no se relee lo escrito (${releido.length} entradas). Revíselo.`);
  }
  return nuevas;
}

/** Las entradas que vedan a la atribuida de este slug: ni `cambio-de-clase` ni las de su slug. */
export function vedanALaAtribuida(vedadas: readonly FormaVedada[], slug: string): FormaVedada[] {
  return vedadas.filter((e) => e.motivo !== MOTIVO_CAMBIO_DE_CLASE && e.slug !== slug);
}

/** Cuántas bajas por cambio de clase hay en el registro (FR-16 v9.1). */
export function bajasPorCambioDeClase(vedadas: readonly FormaVedada[]): number {
  return vedadas.filter((e) => e.motivo === MOTIVO_CAMBIO_DE_CLASE).length;
}

/** Una entrada como la nombra un rechazo. */
export function describirFormaVedada(e: FormaVedada): string {
  return `«${e.forma}» (${e.motivo}, ${e.fecha}${e.slug !== undefined ? `, ${e.slug}` : ''})`;
}
