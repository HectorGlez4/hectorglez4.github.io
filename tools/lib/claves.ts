/**
 * La clave de orden de un Autor — Historia 26.1, FR-15.
 *
 * Dos piezas puras, probadas sin construir:
 *
 *   · `proponerClave` es **la** regla que propone la clave —la última palabra del nombre—, la
 *     única. La usan `crear` (y por él `tools/sembrar.ts`) y `proponer-claves`. Con dos
 *     reglas, el alta y el lote acabarían proponiendo claves distintas al mismo Autor.
 *   · `fallosDeClaves` es el núcleo de la puerta del build (`integraciones/claves.ts`): la
 *     forma se exige a todo Autor, la presencia solo al publicado.
 *
 * La regla es deliberadamente tonta. Acierta con «José Martí» y con «Séneca», y se equivoca
 * con «Manuel González Prada» (que va en la G) o con «Sor Juana Inés de la Cruz»: por eso el
 * parte marca aparte los nombres de tres palabras o más, que son los que merecen que Héctor
 * los mire primero (26.10). Lo que no hace es adivinar partículas ni apellidos compuestos:
 * una heurística lista se equivocaría en silencio, y esta se equivoca donde se la espera.
 */

import { inicialDeClave } from '../../src/lib/normalizar.ts';
import { ordenAlfabetico, REGLA_DE_CLAVE_DE_ORDEN } from '../../src/lib/admision.ts';

/** A partir de cuántas palabras del nombre la propuesta se marca para revisarla antes. */
export const PALABRAS_PARA_MARCAR = 3;

/** La orden que propone las claves que faltan, tal como se teclea. */
export const ORDEN_PROPONER_CLAVES = 'npx tsx tools/autor.ts proponer-claves';

/** La orden con la que una persona fija la clave de un Autor, tal como se teclea. */
export const ordenFijarClave = (slug: string, clave = '<clave>'): string =>
  `npx tsx tools/autor.ts clave ${slug} "${clave}"`;

export interface PropuestaDeClave {
  /** La clave propuesta. Ausente si la regla no da una con forma (p. ej. «Pío 2»). */
  clave?: string;
  /** Si el nombre tiene tres palabras o más: la propuesta merece mirarse antes. */
  marcada: boolean;
}

/**
 * La clave que propone la regla fija: la última palabra —separada por espacios— del nombre
 * recortado, **tal cual**, con sus tildes y sus mayúsculas. Si esa palabra no da inicial
 * (una cifra, un signo), no hay propuesta: la clave la fija una persona con `clave`.
 */
export function proponerClave(nombre: string): PropuestaDeClave {
  const palabras = nombre.trim().split(/\s+/u).filter((p) => p !== '');
  const marcada = palabras.length >= PALABRAS_PARA_MARCAR;
  const ultima = palabras.at(-1);
  if (ultima === undefined || inicialDeClave(ultima) === undefined) return { marcada };
  return { clave: ultima, marcada };
}

/** Lo que la puerta necesita saber de cada Autor. */
export interface AutorParaClaves {
  slug: string;
  /** La ruta de su fichero, como se nombra en el fallo (relativa a la raíz). */
  ruta: string;
  nombre?: unknown;
  ordenAlfabetico?: unknown;
  ordenRevisado?: unknown;
}

/**
 * Las líneas de fallo de las claves de orden: una por Autor que incumple.
 *
 *   · **forma** — a todo Autor que declara `ordenAlfabetico`, publicado o no; la línea nombra
 *     `clave`, la única orden con que se corrige;
 *   · **presencia** — solo al Autor de `publicados` (los slugs de `autoresPublicados`). La
 *     línea nombra la orden que la arregla: `proponer-claves` si la regla da clave para su
 *     nombre, y si no `clave`, que es la de una persona;
 *   · **revisión huérfana** — a todo Autor con `ordenRevisado` y sin `ordenAlfabetico`: la
 *     revisión no apunta a ninguna clave, y `proponer-claves` daría por revisada la que
 *     escribiera después. `clave` nunca deja ese estado; solo sale de teclear el fichero.
 */
export function fallosDeClaves(
  autores: readonly AutorParaClaves[],
  publicados: ReadonlySet<string>,
): string[] {
  const fallos: string[] = [];
  for (const autor of [...autores].sort((a, b) => (a.ruta < b.ruta ? -1 : a.ruta > b.ruta ? 1 : 0))) {
    if (autor.ordenAlfabetico !== undefined) {
      if (!ordenAlfabetico.safeParse(autor.ordenAlfabetico).success) {
        fallos.push(
          `${autor.ruta}: ordenAlfabetico ${JSON.stringify(autor.ordenAlfabetico)}. ${REGLA_DE_CLAVE_DE_ORDEN} ` +
            `Corríjala con ${ordenFijarClave(autor.slug)}, no a mano.`,
        );
      }
      continue;
    }
    if (autor.ordenRevisado !== undefined) {
      fallos.push(
        `${autor.ruta}: ordenRevisado sin ordenAlfabetico: la revisión no apunta a ninguna clave. ` +
          `Quite ordenRevisado y fije la clave con ${ordenFijarClave(autor.slug)}`,
      );
      continue;
    }
    if (!publicados.has(autor.slug)) continue;
    const propuesta = typeof autor.nombre === 'string' ? proponerClave(autor.nombre) : { marcada: false };
    fallos.push(
      `${autor.ruta}: el Autor tiene Citas publicadas y no tiene clave de orden (ordenAlfabetico). ` +
        (propuesta.clave !== undefined
          ? `Propóngala con: ${ORDEN_PROPONER_CLAVES}`
          : `La regla no da clave para su nombre: la fija una persona con ${ordenFijarClave(autor.slug)}`),
    );
  }
  return fallos;
}
