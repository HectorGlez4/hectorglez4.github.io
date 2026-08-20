/**
 * Cómo lee el **sitio** las fijaciones de `corpus/portada.json` — FR-9, Historia 13.1.
 *
 * El fichero es metadato del Corpus y no una colección: ningún esquema de
 * `src/content.config.ts` lo juzga, y `AGENTS.md` dice expresamente que se puede editar a
 * mano. Así que lo que llega aquí es texto de un humano, y el sitio tiene que sobrevivirlo.
 *
 * **Por qué esto no existía antes y ahora sí.** Hasta la Historia 13.1 una clave mal escrita
 * era inerte: `citaDelDia` consultaba **una** clave —la jornada de hoy— y una que sobrara no
 * la miraba nadie. El lote enumera **todas**, y entonces una clave como `manana:` deja de ser
 * inofensiva: la comparación de jornadas es de cadenas, `'manana' >= '2026-08-19'` es cierto,
 * y esa entrada entra en el lote, cae a la rotación, `Date.parse` da `NaN` y la selección
 * sale `undefined`. Lo que se cae no es `/lote`: es `npm run build` entero, incluida la
 * reconstrucción diaria que mueve la Cita del Día del sitio en vivo.
 *
 * **La asimetría con `tools/lib/jornadas.ts` es deliberada, y la regla es la misma.** Las dos
 * partes preguntan a `esJornada`, que es el único dueño de qué tiene forma de jornada; lo que
 * cambia es qué hacen con lo que no la tiene. La orden **rechaza y lo dice**, porque quien la
 * ejecuta está delante y puede arreglarlo. El sitio **descarta y sigue**, porque al build no
 * hay a quién preguntarle y dejar el sitio sin construir por una errata en una jornada que ni
 * siquiera es hoy sería mucho peor que ignorarla. Es el mismo criterio con el que `citaDelDia`
 * ignora una fijación que apunta a una Cita que ya no está apta en lugar de dejar la portada
 * en blanco.
 *
 * AD-5 — Derivación pura: recibe lo importado, no lee disco.
 */

import { esJornada } from './citaDelDia.ts';

/**
 * Las fijaciones que el sitio puede usar, sacadas del JSON tal cual se importó.
 *
 * Nunca lanza y nunca devuelve otra cosa que un objeto de jornada a slug. Lo que no tiene
 * forma de jornada, o no apunta a una cadena, se queda fuera: para el sitio equivale a no
 * estar escrito, que es exactamente lo que era antes de que nadie enumerara este fichero.
 *
 * Tolera también que **falte la clave** `fijaciones`, que es una forma que la propia orden
 * acepta al escribir sobre un fichero que no la traía. Un `Object.entries(undefined)` habría
 * tumbado el build por una clave ausente.
 */
export function fijacionesDeclaradas(bruto: unknown): Record<string, string> {
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return {};

  const declaradas = (bruto as Record<string, unknown>).fijaciones;
  if (typeof declaradas !== 'object' || declaradas === null || Array.isArray(declaradas)) return {};

  const fijaciones: Record<string, string> = {};
  for (const [jornada, cita] of Object.entries(declaradas)) {
    if (esJornada(jornada) && typeof cita === 'string') fijaciones[jornada] = cita;
  }
  return fijaciones;
}
