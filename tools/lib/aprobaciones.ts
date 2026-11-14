/**
 * Las aprobaciones de la traducción propia — Historia 35.11, AD-32 v9.2, FR-68 v9.2.
 *
 * Una atribuida con `origen: traduccion-propia` es el último recurso: no circula ninguna versión
 * en español y el texto es la traducción del sitio. No la publica una sola mano: la **propone** un
 * agente y la **aprueba** otro distinto (`--propone`/`--aprueba`, comparados recortados y en
 * minúsculas), y queda anotado en `corpus/aprobaciones-de-atribuidas.yml`, que **solo añade**
 * `{slug, propone, aprueba, fecha}`.
 *
 *   · Lo escriben solo el alta y `revisar --aprobar` que publican una traducción propia, y
 *     `npm run atribuida -- texto` que la retraduce conservando el origen; siempre **después** de
 *     escribir la Cita, y si el añadido falla la Cita vuelve atrás (lo dice quien llama).
 *   · Lo lee el build (`integraciones/clases.ts`) **solo para romper**: toda traducción propia
 *     publicada tiene una entrada suya con dos agentes distintos que apareció en el registro en el
 *     mismo commit que el último cambio de su `texto`, en uno posterior o sin commitear
 *     (`fallosDeAprobaciones`). Un solo sentido: una entrada de una Cita retirada o sustituida no
 *     rompe nada.
 *
 * Que solo añada lo comprueba `npm test` contra el primer padre del commit, como los demás
 * registros. No es familia de AD-27: no fecha ni avisa, y ningún byte de `dist/` sale de él.
 * Ningún módulo de `src/` lo nombra (AD-24).
 */

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { parse as parsearYaml } from 'yaml';
import { esJornada } from '../../src/lib/citaDelDia.ts';
import { FICHERO_DE_APROBACIONES, type Rutas } from './corpus.ts';

/** Una entrada del registro, tal y como se relee. */
export interface AprobacionRegistrada {
  slug: string;
  propone: string;
  aprueba: string;
  fecha: string;
}

/** Los dos agentes de una traducción propia, como llegan de las banderas. */
export interface Agentes {
  propone: string;
  aprueba: string;
}

export const NOMBRE_DEL_REGISTRO_DE_APROBACIONES = `corpus/${FICHERO_DE_APROBACIONES}`;
const NOMBRE = NOMBRE_DEL_REGISTRO_DE_APROBACIONES;
const CLAVE = 'aprobaciones';
const FORMA_DE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SALTO = /[\n\r\u2028\u2029\u0085\v\f]/u;

/** La cabecera con que se versiona y se crea el registro. */
export const CABECERA_DE_APROBACIONES = [
  '# Aprobaciones de la traducción propia — Historia 35.11, Épica 35, AD-32, FR-68',
  '#',
  '# QUÉ REGISTRA. Quién propuso y quién aprobó cada Cita atribuida cuyo texto es la traducción',
  '# del sitio (origen: traduccion-propia), el último recurso cuando no circula ninguna versión en',
  '# español. Una línea por aprobación: slug, propone, aprueba y la jornada en que se anotó. Los dos',
  '# agentes son distintos (se comparan recortados y en minúsculas).',
  '#',
  '# SOLO AÑADE. Ninguna entrada se reescribe ni se borra; retraducir una Cita añade otra.',
  '# `npm test` comprueba que el fichero del commit empieza, byte a byte, por el del commit padre.',
  '#',
  '# NO SE EDITA A MANO. Lo escriben el alta (tools/alta.ts) y `npx tsx tools/revisar.ts --aprobar`',
  '# que publican una traducción propia, y `npm run atribuida -- texto` que la retraduce, siempre con',
  '# --propone y --aprueba. Ningún agente anota una aprobación que no ha pasado por esas órdenes.',
  '#',
  '# El build (integraciones/clases.ts) lo lee solo para romper: una traducción propia publicada sin',
  '# entrada suya, con una entrada de un solo agente o cuyo texto cambió después de su última',
  '# entrada. No es una colección: ningún módulo de src/ lo lee (AD-24), ningún byte de dist/ sale',
  '# de él y no fecha ni avisa ninguna superficie.',
  '',
  `${CLAVE}:`,
  '',
].join('\n');

/** Si dos agentes son el mismo: recortados y en minúsculas. */
export function mismoAgente(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Por qué un agente no vale, o `undefined`. */
function problemaDelAgente(bandera: string, valor: string | undefined): string | undefined {
  if (valor === undefined) return `falta ${bandera}`;
  if (valor.trim() === '') return `${bandera} está en blanco`;
  if (SALTO.test(valor)) return `${bandera} va en una sola línea`;
  return undefined;
}

/**
 * Por qué los agentes de una traducción propia no valen, o `undefined`: los dos dados, no vacíos
 * tras recortar, en una línea y distintos.
 */
export function problemaDeLosAgentes(propone: string | undefined, aprueba: string | undefined): string | undefined {
  const faltas = [problemaDelAgente('--propone', propone), problemaDelAgente('--aprueba', aprueba)].filter(
    (p): p is string => p !== undefined,
  );
  if (faltas.length > 0) {
    return (
      `una traducción propia la proponen y la aprueban dos agentes distintos (--propone y --aprueba), ` +
      `y ${faltas.join(' y ')}.`
    );
  }
  if (mismoAgente(propone as string, aprueba as string)) {
    return (
      `una traducción propia la proponen y la aprueban dos agentes distintos, y --propone y --aprueba ` +
      `dicen el mismo («${(propone as string).trim()}»).`
    );
  }
  return undefined;
}

/** El motivo con que se niega una orden que trae agentes sin ninguna traducción propia en la pasada. */
export const MOTIVO_AGENTES_SIN_TRADUCCION =
  'solo la traducción propia lleva dos agentes: --propone y --aprueba se dan cuando la pasada publica ' +
  'una atribuida con «origen: traduccion-propia», y esta no publica ninguna.';

/** Los agentes ya comprobados, recortados, o el problema. */
export function agentesDe(
  propone: string | undefined,
  aprueba: string | undefined,
): { ok: true; agentes: Agentes } | { ok: false; motivo: string } {
  const problema = problemaDeLosAgentes(propone, aprueba);
  if (problema !== undefined) return { ok: false, motivo: problema };
  return { ok: true, agentes: { propone: (propone as string).trim(), aprueba: (aprueba as string).trim() } };
}

/** Las entradas de un registro ya leído, comprobando su forma; lanza nombrando lo que falla. */
export function analizarAprobaciones(contenido: string): AprobacionRegistrada[] {
  let leido: unknown;
  try {
    leido = parsearYaml(contenido);
  } catch (fallo) {
    throw new Error(
      `${NOMBRE} no es YAML válido: ${fallo instanceof Error ? fallo.message : String(fallo)}. ` +
        'De este registro sale quién aprobó cada traducción propia, así que no se lee a medias.',
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
        ? Object.keys(e).filter((k) => !['slug', 'propone', 'aprueba', 'fecha'].includes(k))
        : [];
    const agente = (v: unknown) => typeof v === 'string' && v.trim() !== '' && !SALTO.test(v);
    const problema =
      e === null || typeof e !== 'object' || Array.isArray(e)
        ? 'no es una entrada'
        : typeof e.slug !== 'string' || !FORMA_DE_SLUG.test(e.slug)
          ? 'no declara un slug con forma de slug'
          : !agente(e.propone)
            ? 'no declara quién propone (una cadena de una línea, no vacía)'
            : !agente(e.aprueba)
              ? 'no declara quién aprueba (una cadena de una línea, no vacía)'
              : typeof e.fecha !== 'string' || !esJornada(e.fecha)
                ? 'no declara una fecha AAAA-MM-DD que exista'
                : ajenas.length > 0
                  ? `declara campos que el registro no tiene (${ajenas.join(', ')})`
                  : undefined;
    if (problema !== undefined) {
      throw new Error(`${NOMBRE}: la entrada ${i + 1} de «${CLAVE}» ${problema} (${JSON.stringify(entrada)}).`);
    }
  }
  return entradas as AprobacionRegistrada[];
}

/**
 * Las entradas del registro. Uno que no existe, o que existe sin contenido —una primera escritura
 * cortada—, se lee vacío; uno ilegible lanza.
 */
export async function leerAprobaciones(rutas: Pick<Rutas, 'aprobacionesDeAtribuidas'>): Promise<AprobacionRegistrada[]> {
  if (!existsSync(rutas.aprobacionesDeAtribuidas)) return [];
  const contenido = await readFile(rutas.aprobacionesDeAtribuidas, 'utf8');
  if (contenido.trim() === '') return [];
  return analizarAprobaciones(contenido);
}

/** Una entrada como se escribe: una línea, con las cadenas entre comillas. */
function lineaDe(e: AprobacionRegistrada): string {
  return (
    `  - { slug: ${JSON.stringify(e.slug)}, propone: ${JSON.stringify(e.propone)}, ` +
    `aprueba: ${JSON.stringify(e.aprueba)}, fecha: ${JSON.stringify(e.fecha)} }\n`
  );
}

/**
 * Añade entradas al registro. **Solo añade**, con un único `appendFile`: se juzga el añadido en
 * memoria antes de tocar el disco (forma y dos agentes distintos), se crea con `wx` si no existe, se
 * compone el fichero que quedaría, se analiza y, solo si la lista crece exactamente en lo añadido,
 * se escriben esos bytes al final; después se relee. Un lote vacío no escribe nada.
 */
export async function registrarAprobaciones(
  rutas: Pick<Rutas, 'aprobacionesDeAtribuidas' | 'raiz'>,
  entradas: readonly AprobacionRegistrada[],
): Promise<string> {
  const ruta = rutas.aprobacionesDeAtribuidas;
  if (entradas.length === 0) return ruta;
  for (const e of entradas) {
    const problema = problemaDeLosAgentes(e.propone, e.aprueba);
    if (problema !== undefined) throw new Error(`${NOMBRE}: la aprobación de ${e.slug} no se anota: ${problema}`);
  }
  const añadido = entradas.map(lineaDe).join('');
  // Se juzga antes de tocar el disco: una entrada sin forma no crea ni el fichero.
  analizarAprobaciones(`${CABECERA_DE_APROBACIONES}${añadido}`);

  const anterior = existsSync(ruta) ? await readFile(ruta, 'utf8') : '';
  const vacio = anterior.trim() === '';
  const habia = vacio ? 0 : analizarAprobaciones(anterior).length;
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
  const escribir = `${vacio ? CABECERA_DE_APROBACIONES : anterior.endsWith('\n') ? '' : '\n'}${añadido}`;
  const quedaria = analizarAprobaciones(`${anterior}${escribir}`);
  if (quedaria.length !== habia + entradas.length) {
    throw new Error(
      `${NOMBRE}: añadir al final no deja las entradas colgando de «${CLAVE}:» (había ${habia}, ` +
        `se añaden ${entradas.length} y quedarían ${quedaria.length}). El registro se escribe solo por ` +
        'añadido, así que la lista tiene que ser lo último del fichero. No se ha escrito nada.',
    );
  }
  await appendFile(ruta, escribir, 'utf8');
  const releido = analizarAprobaciones(await readFile(ruta, 'utf8'));
  if (releido.length !== habia + entradas.length) {
    throw new Error(`${NOMBRE}: tras escribir no se relee lo escrito (${releido.length} entradas). Revíselo.`);
  }
  return ruta;
}

/**
 * Cuándo ocurrió algo en el historial: el instante de un commit (milisegundos, se compara por
 * orden) o «sin commitear», que va después de todo commit.
 */
export type Instante = number | 'sin-commitear';

const valorDe = (i: Instante) => (i === 'sin-commitear' ? Number.POSITIVE_INFINITY : i);

/** Una traducción propia publicada, como la juzga el build. */
export interface TraduccionPublicada {
  slug: string;
  /** Su fichero, relativo a la raíz: lo nombra el fallo. */
  ruta: string;
  /** El instante del último cambio de su `texto`; sin historial fiable, ausente. */
  texto?: Instante;
}

/** Una entrada del registro con, si se sabe, el instante en que apareció en él. */
export interface AprobacionConInstante {
  entrada: AprobacionRegistrada;
  instante?: Instante;
}

/**
 * Los fallos de la puerta del registro — pura. Toda traducción propia publicada tiene al menos una
 * entrada suya; ninguna entrada suya dice el mismo agente dos veces; y, si se conoce el instante de
 * su texto, alguna entrada suya apareció en el registro en ese mismo instante o después (un texto
 * sin commitear exige una entrada sin commitear). Un solo sentido: las entradas de slugs que no son
 * traducción propia publicada no se miran.
 */
export function fallosDeAprobaciones(
  traducciones: readonly TraduccionPublicada[],
  entradas: readonly AprobacionConInstante[],
): string[] {
  const porSlug = new Map<string, AprobacionConInstante[]>();
  for (const e of entradas) {
    const lista = porSlug.get(e.entrada.slug);
    if (lista === undefined) porSlug.set(e.entrada.slug, [e]);
    else lista.push(e);
  }
  const fallos: string[] = [];
  for (const t of [...traducciones].sort((a, b) => a.ruta.localeCompare(b.ruta))) {
    const suyas = porSlug.get(t.slug) ?? [];
    if (suyas.length === 0) {
      fallos.push(
        `${t.ruta}: es una traducción propia publicada y ${NOMBRE} no anota su aprobación. La proponen y ` +
          'la aprueban dos agentes con el alta o `npx tsx tools/revisar.ts --aprobar … --propone … --aprueba …`.',
      );
      continue;
    }
    const iguales = suyas.filter((e) => mismoAgente(e.entrada.propone, e.entrada.aprueba));
    for (const e of iguales) {
      fallos.push(
        `${t.ruta}: ${NOMBRE} anota su aprobación del ${e.entrada.fecha} con el mismo agente para proponer ` +
          `y aprobar («${e.entrada.propone.trim()}»): una traducción propia la aprueban dos agentes distintos.`,
      );
    }
    if (t.texto === undefined) continue;
    const texto = valorDe(t.texto);
    const posteriores = suyas.filter((e) => e.instante !== undefined && valorDe(e.instante) >= texto);
    if (posteriores.length === 0) {
      fallos.push(
        `${t.ruta}: su texto cambió ${t.texto === 'sin-commitear' ? 'sin commitear' : 'en un commit posterior'} ` +
          `a la última aprobación que anota ${NOMBRE}: el texto publicado no es el que aprobaron. Una ` +
          'retraducción se aprueba con `npm run atribuida -- texto <slug> "<texto>" --propone … --aprueba …`.',
      );
    }
  }
  return fallos;
}
