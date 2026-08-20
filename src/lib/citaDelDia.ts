/**
 * AD-12 — La jornada de la Cita del Día la fija el build, no el visitante.
 *
 * La tensión real: FR-9 pide que cambie una vez por jornada y sea igual para todos, y el
 * sitio es prerenderizado. Sin una decisión, un builder resuelve la fecha en el cliente
 * —y mete JavaScript en la portada, contra AD-6—, otro la congela en el build, y un
 * tercero reconstruye a cada push y la Cita cambia tres veces en una tarde.
 *
 * La decisión: la selección es determinista a partir de la **fecha** del build, no del
 * instante. Dos builds del mismo día dan la misma Cita, así que un despliegue a media
 * jornada la conserva. Que cambie al día siguiente sin que nadie publique nada depende
 * del disparador programado del CI, que es la Historia 4.2 — y es el fallo más silencioso
 * de toda la arquitectura, porque sin él esto sigue siendo correcto y la portada se
 * congela igual.
 *
 * AD-5 — Derivación pura: recibe la jornada, no la averigua.
 */

import type { Cita } from './publicado.ts';

/** Una jornada en ISO 8601, `AAAA-MM-DD`. */
export type Jornada = string;

const UN_DIA = 86_400_000;

/**
 * Qué tiene forma de jornada. El **único** sitio donde se dice, y por eso está aquí.
 *
 * Lo consumen `jornadaDelBuild` —que lee la jornada declarada por el entorno— y la orden
 * que fija jornadas en `corpus/portada.json` (Historia 13.1). Con dos definiciones, una
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

/**
 * La jornada del build.
 *
 * Se admite fijarla por entorno para que el CI pueda declarar cuál es la jornada en curso
 * y para que las pruebas no dependan de la fecha en que se ejecutan. Sin ella, el día de
 * hoy — que es el mismo a las nueve de la mañana y a las once de la noche, así que un
 * push a media jornada no mueve la Cita.
 */
export function jornadaDelBuild(entorno: Record<string, string | undefined>, ahora: Date): Jornada {
  const declarada = entorno.FECHA_JORNADA?.trim();
  if (declarada !== undefined && esJornada(declarada)) return declarada;
  return ahora.toISOString().slice(0, 10);
}

/** Días transcurridos desde el 1 de enero de 1970, en UTC. */
function diasDesdeLaEpoca(jornada: Jornada): number {
  return Math.floor(Date.parse(`${jornada}T00:00:00Z`) / UN_DIA);
}

export interface SeleccionDeCitaDelDia {
  cita: Cita;
  /** Verdadero si vino de una fijación manual y no de la rotación. */
  fijada: boolean;
}

/**
 * La Cita del Día.
 *
 * Rota por el conjunto de Citas aptas para portada, ordenado por slug para que el orden
 * no dependa de en qué orden leyó el disco el build. El índice es el número de días desde
 * la época módulo el tamaño del conjunto: recorre **todas** antes de repetir ninguna, que
 * es lo que FR-9 pide, y no necesita recordar cuáles ya salieron —lo cual exigiría un
 * estado que AD-10 no permite tener.
 *
 * Una fijación manual para esa fecha tiene prioridad sobre la rotación.
 */
export function citaDelDia(
  aptas: Cita[],
  jornada: Jornada,
  fijaciones: Record<string, string> = {},
): SeleccionDeCitaDelDia | null {
  if (aptas.length === 0) return null;

  const orden = [...aptas].sort((a, b) => a.slug.localeCompare(b.slug, 'es'));

  const fijada = fijaciones[jornada];
  if (fijada !== undefined) {
    const elegida = orden.find((c) => c.slug === fijada);
    // Una fijación que apunta a una Cita que ya no está apta no bloquea la portada: se
    // ignora y rota como cualquier otro día. Dejarla en blanco sería peor.
    if (elegida) return { cita: elegida, fijada: true };
  }

  const indice = ((diasDesdeLaEpoca(jornada) % orden.length) + orden.length) % orden.length;
  return { cita: orden[indice], fijada: false };
}

/** Las Citas marcadas como aptas para portada — FR-15, marcado por `tools/portada.ts`. */
export function aptasParaPortada(citas: Cita[]): Cita[] {
  return citas.filter((c) => c.aptaParaPortada);
}
