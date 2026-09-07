/**
 * El orden de la cola de revisión — Historia 19.6.
 *
 * Aquí no se rechaza nada. Se devuelve **cuánto pesa en contra** una candidata, y quien
 * ordena con ello es `tools/lib/revision.ts`. Ni umbral ni veredicto: como
 * `legibilidad.ts`, sólo números.
 *
 * La distinción que sostiene la historia entera está en `umbrales.ts`, donde viven los
 * pesos y las cifras que los justifican: **un orden coloca, una puerta destruye**. Una
 * candidata con toda la carga en contra sigue en la cola, sigue contada y sigue
 * aprobable — sólo está más abajo.
 *
 * AD-5: esto no lee disco ni red. Recibe el texto y devuelve la cuenta.
 */

import {
  PESO_ABRE_ENCADENADA,
  PESO_COMILLAS_EN_CANDIDATA,
  PESO_INICIAL_ABREVIADA,
  PESO_CIFRA_EN_CANDIDATA,
  PESO_NOMBRE_PROPIO_INTERIOR,
  PESO_PARENTESIS_EN_CANDIDATA,
  PESO_VOCAL_SUELTA,
} from "./umbrales.ts";

export type SeñalDeOrden =
  | "cifra"
  | "abre-encadenada"
  | "paréntesis"
  | "vocal-suelta"
  | "nombre-propio-interior"
  | "comillas"
  | "inicial-abreviada";

/**
 * Las palabras con las que una frase no empieza si se sostiene sola.
 *
 * Todas cuelgan de algo anterior: una conjunción necesita el término que enlaza, un
 * deíctico necesita a qué señala. Es el corte más limpio de los cinco —1,8 % contra
 * 8,7 %— y también el más explicable: no es un defecto de la edición, es que la frase
 * no es una sentencia, es la segunda mitad de un párrafo.
 */
const ENCADENADA =
  /^(y|pero|mas|sin embargo|por eso|por ello|entonces|luego|así|asi|además|ademas|esto|eso|aquello|este|ese|aquel|esta|esa|allí|alli|aquí|aqui)\b/i;

/** Cualquier dígito. Ninguna de las 1.642 Citas publicadas lleva uno. */
const CIFRA = /\d/;

/** Paréntesis y corchetes, que en una edición vieja son casi siempre del editor. */
const PARENTESIS = /[()[\]]/;

/**
 * La vocal acentuada suelta que dejan algunas digitalizaciones: «á», «ó», «é» como palabra.
 *
 * **No es basura sin más**, y conviene dejarlo escrito porque yo mismo lo di por basura
 * antes de medirlo: en el castellano del XVIII y el XIX «á» es la preposición, y **89
 * Citas publicadas la llevan con toda normalidad**. Por eso pesa dos y no cierra ninguna
 * puerta. Lo que dice no es «esto está roto» sino «esto viene de una edición vieja mal
 * digitalizada», que es donde se concentra lo que no vale.
 */
const VOCAL_SUELTA = /(^|\s)[áóé](\s|$)/u;

/**
 * Mayúscula en interior de frase, detrás de minúscula y espacio.
 *
 * No mira detrás de un punto, donde la mayúscula es lo normal: exige minúscula pegada al
 * espacio. Lo que caza es al traductor nombrando a un tercero —«según conjetura DAcier»,
 * «Del mismo parecer es San Ambrosio»—, que es la forma dominante del aparato entreverado.
 *
 * Es la señal más floja de las cinco y por eso pesa uno: también caza a un Autor que
 * nombra a Dios o a España, y ésas son Citas buenas.
 */
const NOMBRE_PROPIO_INTERIOR = /[a-záéíóúñü]\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,}/u;

/** Comillas de cualquier clase, emparejadas o no: lo entrecomillado no lo dijo el Autor. */
const COMILLAS = /[«»"“”]/u;

/**
 * La letra suelta con punto: «escribió S.», «sufrir M.», «Sr.», «cap.».
 *
 * Se exige que la inicial vaya sola —principio de frase o espacio delante, espacio o final
 * detrás— porque sin eso mordería el final de cualquier frase acabada en palabra de una
 * letra. Con la condición puesta, **ninguna de las 1.642 publicadas la lleva**.
 */
const INICIAL_ABREVIADA = /(^|\s)[A-ZÁÉÍÓÚÑ]\.(\s|$)/u;

const SEÑALES: readonly {
  señal: SeñalDeOrden;
  peso: number;
  lleva: (t: string) => boolean;
}[] = [
  {
    señal: "cifra",
    peso: PESO_CIFRA_EN_CANDIDATA,
    lleva: (t) => CIFRA.test(t),
  },
  {
    señal: "abre-encadenada",
    peso: PESO_ABRE_ENCADENADA,
    lleva: (t) => ENCADENADA.test(t.trim()),
  },
  {
    señal: "paréntesis",
    peso: PESO_PARENTESIS_EN_CANDIDATA,
    lleva: (t) => PARENTESIS.test(t),
  },
  {
    señal: "vocal-suelta",
    peso: PESO_VOCAL_SUELTA,
    lleva: (t) => VOCAL_SUELTA.test(t),
  },
  {
    señal: "comillas",
    peso: PESO_COMILLAS_EN_CANDIDATA,
    lleva: (t) => COMILLAS.test(t),
  },
  {
    señal: "inicial-abreviada",
    peso: PESO_INICIAL_ABREVIADA,
    lleva: (t) => INICIAL_ABREVIADA.test(t),
  },
  {
    señal: "nombre-propio-interior",
    peso: PESO_NOMBRE_PROPIO_INTERIOR,
    lleva: (t) => NOMBRE_PROPIO_INTERIOR.test(t),
  },
];

export interface CargaDeCandidata {
  /** Suma de los pesos de las señales presentes. Cuanto más alta, más abajo va. */
  carga: number;
  /** Cuáles pesaron, para que el informe pueda decir por qué está donde está. */
  señales: SeñalDeOrden[];
}

/** Lo que pesa en contra de una candidata. Cero es una candidata sin ninguna señal. */
export function cargaDeCandidata(texto: string): CargaDeCandidata {
  const presentes = SEÑALES.filter(({ lleva }) => lleva(texto));
  return {
    carga: presentes.reduce((suma, { peso }) => suma + peso, 0),
    señales: presentes.map(({ señal }) => señal),
  };
}
