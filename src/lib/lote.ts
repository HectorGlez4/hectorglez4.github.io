/**
 * El material de varias jornadas — Historia 13.1, FR-21.
 *
 * El Kit compone la jornada de hoy; el lote compone las que están fijadas por delante. Y
 * las compone **llamando al Kit**, no reimplementándolo: `materialDelKit` recibe la jornada
 * y las mismas fijaciones, así que lo que este módulo devuelve para el martes es, byte a
 * byte, lo que el Kit compondrá el martes. Esa igualdad no es una coincidencia que haya que
 * vigilar: es la única forma en que este fichero sabe componer nada.
 *
 * **No hay un segundo calendario.** Las jornadas salen de `corpus/portada.json`, que es
 * donde `citaDelDia` ya busca antes de rotar desde la v1, y por eso «lo anticipado sustituye
 * a lo de la jornada» no se implementa aquí: no hay dos orígenes entre los que desempatar.
 * Si este módulo tuviera una lista propia de jornadas, el martes tendría dos respuestas.
 *
 * **Y no se guarda nada.** El material se deriva en cada construcción, así que cambiar la
 * Cita de una jornada ya compuesta la recompone sola: no existe material viejo que pudiera
 * sobrevivir al cambio. Lo versionado es la fijación.
 *
 * AD-5 — Derivación pura: recibe las jornadas y el conjunto, no los averigua.
 */

import { esJornada, type Jornada } from './citaDelDia.ts';
import { materialDelKit, type MaterialDelKit } from './kit.ts';
import type { Cita } from './publicado.ts';

export interface JornadaDelLote {
  jornada: Jornada;
  /** El slug que la fijación declara para esa jornada. */
  fijadaA: string;
  /**
   * El material de esa jornada, el mismo que compondrá el Kit ese día. `null` si no hay
   * ninguna Cita apta para portada, exactamente igual que en el Kit.
   */
  material: MaterialDelKit | null;
  /**
   * Si la fijación se va a honrar de verdad.
   *
   * Falso cuando la Cita fijada ya no está entre las aptas para portada: `citaDelDia` la
   * ignora y rota, para no dejar la portada muda. Es la decisión correcta y también la más
   * silenciosa que hay, así que el lote la enseña en vez de dejar que se descubra el día
   * que toque. Sale de `material.delDia.fijada`, no de una comprobación propia.
   */
  honrada: boolean;
}

/**
 * Las jornadas fijadas que quedan por delante, con su material ya compuesto.
 *
 * `desde` es la jornada del build. Lo pasado se deja fuera: su Cita del Día no la vuelve a
 * componer ninguna construcción, y ofrecer material de ayer para publicar hoy es justo la
 * confusión que el lote existe para evitar.
 *
 * **Lo que no tiene forma de jornada se descarta antes de comparar nada**, y no es una
 * precaución de más: la comparación de abajo es entre cadenas, así que una clave como
 * `manana` es «mayor» que cualquier fecha y entraría en el lote. Su slug no casaría con
 * ninguna Cita apta, la selección caería a la rotación, `Date.parse` daría `NaN` y el build
 * entero moriría por una clave que antes de que nadie enumerara este fichero era inerte.
 * Quien decide qué es una jornada es `esJornada`, el mismo que consulta la orden que las
 * escribe: dos lectores del mismo fichero con reglas distintas es la divergencia que esto
 * evita. Descartar y seguir —en vez de rechazar— es lo que hace el sitio con todo lo que no
 * entiende de este fichero; ver `src/lib/portada.ts`.
 *
 * Las jornadas van ordenadas por fecha, que es el orden en que se van a publicar. Las claves
 * de un objeto JSON conservan el orden en que se escribieron, y ese es el orden en que se
 * compuso el lote: aquí no vale, porque lo que se lee es un calendario.
 */
export function materialDelLote(
  aptas: Cita[],
  fijaciones: Record<string, string>,
  desde: Jornada,
): JornadaDelLote[] {
  return Object.entries(fijaciones)
    .filter(([jornada]) => esJornada(jornada) && jornada >= desde)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([jornada, fijadaA]) => {
      // Las **mismas** fijaciones, no solo la de esta jornada: es literalmente la llamada
      // que hará `kit.astro` ese día, y cualquier recorte la volvería una llamada parecida.
      const material = materialDelKit(aptas, jornada, fijaciones);
      return {
        jornada,
        fijadaA,
        material,
        honrada: material?.delDia.fijada === true,
      };
    });
}
