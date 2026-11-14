/**
 * La clase de una Cita y los derechos de su dueño — Historia 35.1, AD-1, AD-32.
 *
 * El Corpus conoce dos clases de Cita:
 *
 *   · la **de siempre**, de dominio público y cotejada contra su documento, que **no lleva**
 *     el campo `clase` —escribir `clase: siempre` es error del esquema—;
 *   · la **atribuida**, la frase de un Personaje o de un Autor con derechos vigentes, que lleva
 *     `clase: atribuida` y nunca `estadoDerechos`.
 *
 * Este módulo es el **único lector** del campo `clase` de una Cita (`esAtribuida`) y el único
 * que decide si un dueño tiene derechos vigentes (`derechosVigentes`) o es de dominio público
 * (`esDeDominioPublico`, su complemento exacto, escrito en positivo para que la prueba que los
 * compara no sea una tautología). La clase no se teclea: el alta y la aprobación la derivan con
 * `claseQueCorresponde` y la escriben con lo demás, y el registro `corpus/clases-de-cita.yml`
 * anota la de cada Cita publicada con `claseDe`. Lo vigila `tests/unit/clase.test.ts`.
 *
 * Puro (AD-5): no lee el disco ni la fecha. El año de referencia es una constante de
 * `src/lib/umbrales.ts`, nunca la del build (AD-12).
 */

import { AÑO_DE_REFERENCIA, PLAZO_DE_PROTECCION_AÑOS } from './umbrales.ts';

/** La clase de siempre, como se anota en el registro: la Cita no lleva el campo. */
export const CLASE_DE_SIEMPRE = 'siempre';

/** La clase atribuida, como se anota en el registro y se escribe en la Cita. */
export const CLASE_ATRIBUIDA = 'atribuida';

/**
 * El `origen` de una atribuida cuyo texto es la traducción del sitio — Historia 35.10, decisión de
 * Héctor del 2026-11-14 que enmienda FR-68: cuando no circula ninguna versión en español de una
 * frase atribuida, el texto es la nuestra, lo más fiel posible, y la Página de Cita lo dice. Vive
 * aquí, junto a la clase, porque solo la atribuida se traduce —la de siempre, nunca (§4.11)— y
 * porque `src/lib/atribucion.ts`, que viaja a las islas, no puede importar el esquema.
 */
export const ORIGEN_TRADUCCION_PROPIA = 'traduccion-propia';

/**
 * Las dos clases de Cita, como se anotan en el registro. La de siempre, primero. Se recorre,
 * nunca se indexa: cada clase se nombra por su constante, para que el orden de la lista no
 * decida qué es cada una.
 */
export const CLASES = [CLASE_DE_SIEMPRE, CLASE_ATRIBUIDA] as const;

export type Clase = (typeof CLASES)[number];

/** Si un valor es una de las dos clases. */
export function esClase(valor: unknown): valor is Clase {
  return (CLASES as readonly unknown[]).includes(valor);
}

/** El único lector del campo `clase`: si la Cita es atribuida. */
export function esAtribuida(cita: { clase?: unknown }): boolean {
  return cita.clase === CLASE_ATRIBUIDA;
}

/** La clase de una Cita ya escrita: la atribuida lo dice, la de siempre calla. */
export function claseDe(cita: { clase?: unknown }): Clase {
  return esAtribuida(cita) ? CLASE_ATRIBUIDA : CLASE_DE_SIEMPRE;
}

/**
 * El dueño de una Cita, tal como lo juzgan los derechos: un Autor —vivo, o con su año de
 * fallecimiento— o un Personaje, que siempre tiene derechos vigentes.
 */
export type DueñoDeDerechos =
  | { tipo: 'autor'; vivo?: true; añoFallecimiento?: number }
  | { tipo: 'personaje' };

/** El plazo y el año contra los que se juzga. Por omisión, las constantes de `umbrales.ts`. */
export interface ReferenciaDeDerechos {
  plazo?: number;
  año?: number;
}

const REFERENCIA_DEL_ÁRBOL: ReferenciaDeDerechos = {
  ...(PLAZO_DE_PROTECCION_AÑOS !== undefined ? { plazo: PLAZO_DE_PROTECCION_AÑOS } : {}),
  ...(AÑO_DE_REFERENCIA !== undefined ? { año: AÑO_DE_REFERENCIA } : {}),
};

/** El año de referencia, o un error que nombra las dos constantes si hay plazo y no año. */
function añoDe(referencia: ReferenciaDeDerechos): number {
  if (referencia.año === undefined) {
    throw new Error(
      'PLAZO_DE_PROTECCION_AÑOS tiene valor y AÑO_DE_REFERENCIA no (src/lib/umbrales.ts): sin el ' +
        'año de referencia no se puede decir si el plazo de un Autor fallecido sigue corriendo. ' +
        'Las dos las fija Héctor.',
    );
  }
  return referencia.año;
}

/**
 * Si el dueño tiene derechos vigentes: un Personaje, siempre; un Autor vivo, siempre; un Autor
 * fallecido, solo si hay plazo y su año de fallecimiento más el plazo llega al año de referencia.
 */
export function derechosVigentes(
  dueño: DueñoDeDerechos,
  referencia: ReferenciaDeDerechos = REFERENCIA_DEL_ÁRBOL,
): boolean {
  // Plazo sin año lanza para todo dueño, no solo para el fallecido: que lance no depende del Corpus.
  if (referencia.plazo !== undefined) añoDe(referencia);
  if (dueño.tipo === 'personaje') return true;
  if (dueño.vivo === true) return true;
  if (referencia.plazo === undefined) return false;
  const año = añoDe(referencia);
  return dueño.añoFallecimiento !== undefined && dueño.añoFallecimiento + referencia.plazo >= año;
}

/**
 * Si el dueño es de dominio público: un Autor no vivo, con año de fallecimiento y, si hay plazo,
 * con el plazo ya cumplido. Es el complemento exacto de `derechosVigentes` para todo dueño que
 * el esquema admite, escrito en positivo.
 */
export function esDeDominioPublico(
  dueño: DueñoDeDerechos,
  referencia: ReferenciaDeDerechos = REFERENCIA_DEL_ÁRBOL,
): boolean {
  if (referencia.plazo !== undefined) añoDe(referencia);
  if (dueño.tipo !== 'autor' || dueño.vivo === true || dueño.añoFallecimiento === undefined) return false;
  if (referencia.plazo === undefined) return true;
  return dueño.añoFallecimiento + referencia.plazo < añoDe(referencia);
}

/** El Autor de una ficha, como dueño de derechos. */
export function dueñoAutor(autor: { vivo?: unknown; añoFallecimiento?: unknown }): DueñoDeDerechos {
  return {
    tipo: 'autor',
    ...(autor.vivo === true ? { vivo: true as const } : {}),
    ...(typeof autor.añoFallecimiento === 'number' ? { añoFallecimiento: autor.añoFallecimiento } : {}),
  };
}

/**
 * La clase que le corresponde a una Cita nueva, derivada y nunca tecleada: atribuida si declara
 * un Personaje o si su Autor tiene derechos vigentes; de siempre en lo demás.
 */
export function claseQueCorresponde(
  cita: { personaje?: unknown },
  autor: { vivo?: unknown; añoFallecimiento?: unknown },
  referencia: ReferenciaDeDerechos = REFERENCIA_DEL_ÁRBOL,
): Clase {
  if (cita.personaje !== undefined) return CLASE_ATRIBUIDA;
  return derechosVigentes(dueñoAutor(autor), referencia) ? CLASE_ATRIBUIDA : CLASE_DE_SIEMPRE;
}
