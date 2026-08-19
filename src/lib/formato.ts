/**
 * Cómo se escriben los números del proyecto cuando los lee una persona.
 *
 * No decide nada: da forma a lo que otros ya decidieron. Existe porque las órdenes de
 * `tools/` empezaron a discrepar entre ellas —`tools/auditoria.ts` escribía «33.3 %» y
 * `tools/huecos.ts` «16,7 %», dos informes hermanos con dos convenciones— y porque un
 * formateador dentro del módulo de política habría hecho creer que la coma decimal es una
 * decisión de la política, que no lo es.
 *
 * AD-5 — puro: recibe números y devuelve texto.
 */

/**
 * Un porcentaje escrito en español: coma decimal, y sin decimal cuando es entero.
 *
 * `toLocaleString` daría esto mismo con la configuración regional adecuada y otra cosa
 * con cualquier otra, y el texto que la política escribe tiene que ser idéntico palabra
 * por palabra en cualquier máquina que lo pida.
 */
export function porcentajeEnEspañol(valor: number): string {
  return String(valor).replace('.', ',');
}
