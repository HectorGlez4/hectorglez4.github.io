/**
 * Qué tiene forma de jornada — la regla, aparte del módulo que fija la jornada del build.
 *
 * Vive sola porque la consultan módulos que **no** deben depender de la jornada: la admisión
 * (`ordenRevisado`, Historia 26.1) la necesita, y `citaDelDia.ts` lee la jornada del entorno, así que
 * importarla de allí hacía rotar con la jornada a toda superficie que admite contenido.
 * `citaDelDia.ts` la reexporta: sigue habiendo una sola definición.
 *
 * AD-5 — pura.
 */

/**
 * Qué tiene forma de jornada. El **único** sitio donde se dice, y por eso está aquí.
 *
 * Lo consumen `jornadaDelBuild` —que lee la jornada declarada por el entorno— y la orden
 * que fija jornadas de la portada (Historia 13.1). Con dos definiciones, una
 * acabaría admitiendo lo que la otra rechaza y el lote fijaría jornadas que la Cita del
 * Día no sabe leer.
 *
 * No basta con la forma: se exige además que **exista en el calendario**. `2026-02-31`
 * casa con la expresión y no es ningún día, y de ahí salía un `Date.parse` a `NaN` que
 * dejaba el índice de la rotación en `NaN` y la selección en `undefined` — un fallo a
 * cuatro marcos de distancia de la errata que lo causó.
 */
export function esJornada(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}
