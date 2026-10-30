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

import type { Autor, Cita } from './publicado.ts';
import { ordenDeLaListaDeObras, type ObraResuelta } from './obras.ts';
import { compararPorClave } from './normalizar.ts';
import { OBRAS_DE_LA_PORTADA } from './umbrales.ts';

/** Una jornada en ISO 8601, `AAAA-MM-DD`. */
export type Jornada = string;

const UN_DIA = 86_400_000;

/*
 * `esJornada` —qué tiene forma de jornada— vive en `./jornada.ts` y se reexporta aquí, donde la
 * consultaban todos. Está aparte desde la Historia 26.1 porque `admision.ts` la necesita para
 * `ordenRevisado` y este módulo lee `FECHA_JORNADA`: importarlo desde la admisión metía a toda
 * página que admite contenido en el grafo de las que rotan con la jornada (`tests/unit/peso.test.ts`).
 */
export { esJornada } from './jornada.ts';
import { esJornada } from './jornada.ts';

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
 * El orden de la rotación: un recorrido **en rondas por Autor** (Historia 21.1).
 *
 * Por qué no basta ordenar por slug: el slug de una Cita empieza por el de su Autor, así
 * que el orden alfabético agrupa a cada Autor y un Autor con k Citas aptas ocupa k
 * jornadas seguidas de portada.
 *
 * El recorrido: se agrupa por Autor, se ordenan los Autores y, dentro de cada uno, sus
 * Citas por slug; luego se toma la 1.ª de cada Autor, la 2.ª de cada uno, y así hasta
 * agotarlas. Con A(a1, a2, a3), B(b1) y C(c1, c2) sale a1, b1, c1, a2, c2, a3.
 *
 * Sigue siendo una **permutación** de las aptas —cada una exactamente una vez—, así que la
 * rotación de abajo las recorre todas antes de repetir (FR-9) sin recordar nada (AD-10,
 * AD-12). Y es determinista: los dos órdenes son `localeCompare(…, 'es')` sobre slugs, de
 * modo que no depende de en qué orden leyó el disco el build.
 *
 * La regla que garantiza: **ningún Autor ocupa más de dos jornadas seguidas**, salvo el que
 * sea el único con Citas en dos o más rondas finales consecutivas —y entonces no hay otro
 * Autor con quien alternarlo—. Dentro de una ronda con al menos dos Autores, dos jornadas
 * seguidas nunca comparten Autor. La repetición solo ocurre en una frontera, y con una
 * condición precisa:
 *
 * - de la ronda r a la r+1, cuando la r+1 tiene **un solo** Autor y ese Autor es el último
 *   alfabéticamente de la r, que es el que la cerró;
 * - en la vuelta del final al principio, cuando la última ronda tiene un solo Autor y ese
 *   Autor es el primero alfabéticamente del conjunto.
 *
 * Como cada ronda tiene un subconjunto de los Autores de la anterior, una ronda de un solo
 * Autor deja solas a todas las siguientes: las rondas solitarias son siempre las finales.
 * Con A(2) y B(1) sale a1, b1, a2, y de a2 se vuelve a a1: dos jornadas, no tres.
 */
export function ordenEnRondas(aptas: Cita[]): Cita[] {
  const porAutor = new Map<string, Cita[]>();
  for (const cita of aptas) {
    const suyas = porAutor.get(cita.autor);
    if (suyas) suyas.push(cita);
    else porAutor.set(cita.autor, [cita]);
  }

  const grupos = [...porAutor.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([, citas]) => citas.sort((a, b) => a.slug.localeCompare(b.slug, 'es')));

  const orden: Cita[] = [];
  const rondas = grupos.reduce((mayor, grupo) => Math.max(mayor, grupo.length), 0);
  for (let ronda = 0; ronda < rondas; ronda += 1) {
    for (const grupo of grupos) {
      if (ronda < grupo.length) orden.push(grupo[ronda]);
    }
  }
  return orden;
}

/**
 * La Cita del Día.
 *
 * Rota por el conjunto de Citas aptas para portada en el orden de `ordenEnRondas`. El
 * índice es el número de días desde la época módulo el tamaño del conjunto: recorre
 * **todas** antes de repetir ninguna, que es lo que FR-9 pide, y no necesita recordar
 * cuáles ya salieron —lo cual exigiría un estado que AD-10 no permite tener.
 *
 * Una fijación manual para esa fecha tiene prioridad sobre la rotación.
 */
export function citaDelDia(
  aptas: Cita[],
  jornada: Jornada,
  fijaciones: Record<string, string> = {},
): SeleccionDeCitaDelDia | null {
  if (aptas.length === 0) return null;

  const orden = ordenEnRondas(aptas);

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

/** El resto de dividir por `divisor` (> 0), siempre entre 0 y `divisor` − 1, también con `n` negativo. */
function modulo(n: number, divisor: number): number {
  return ((n % divisor) + divisor) % divisor;
}

/**
 * Las Obras de la portada de una jornada — AD-12, AD-25, FR-55, UX-DR56, Historia 28.3.
 *
 * Quien vuelve a la portada ve hasta `OBRAS_DE_LA_PORTADA` libros, y otros al día siguiente, sin
 * que nadie publique nada y sin que nadie elija: la selección es, como la Cita del Día, función
 * pura de la jornada del build y del conjunto que recibe.
 *
 * La regla, en rondas sobre la lista circular de Autores:
 *
 *   · L son los Autores con alguna Obra en el conjunto, en el **orden del Directorio** (su clave
 *     `ordenAlfabetico`, por `compararPorClave`, y el slug si empatan); A = |L|.
 *   · Salen k = min(`OBRAS_DE_LA_PORTADA`, A) Obras: la ventana de la jornada d —días desde la
 *     época, el mismo origen que `citaDelDia`— ocupa las posiciones p = d·k + j, j = 0…k−1, de la
 *     sucesión infinita que recorre L una vuelta tras otra. Cada jornada la ventana avanza k
 *     puestos, así que con A ≥ k las k Obras son de k Autores distintos.
 *   · En la posición p el Autor es L[p mod A], y esa es su aparición n = ⌊p / A⌋: da su n-ésima
 *     Obra, módulo cuántas tiene, en el orden de su Lista de Obras (`ordenDeLaListaDeObras`, el de
 *     su Página de Autor y de `/obras/`). Un Autor de una sola Obra la repite; uno de varias las
 *     va enseñando todas.
 *
 * Con A = 8: la jornada d = 0 da los Autores 0–5 con su primera Obra; la d = 1, los 6, 7, 0, 1, 2
 * y 3, los cuatro últimos con su segunda. Con A < k salen A, una por Autor, y cada jornada cada
 * uno da la siguiente.
 *
 * **No recibe la Cita del Día ni las fijaciones de `corpus/portada.json`:** las Obras no dependen
 * de qué Cita salga hoy, y la Obra de esa Cita puede estar entre ellas. El conjunto lo decide
 * quien llama —las indexables, para que ninguna fila lleve a una página `noindex`—, y esta función
 * no consulta ninguna regla de Obra.
 *
 * Devuelve las Obras en el orden de la ventana; con A = 0, ninguna. **Lanza** si una Obra es de un
 * Autor que no está en `autores` o si ese Autor no tiene clave de orden, como `autoresDestacados`:
 * el build lo para antes, en `integraciones/claves.ts`, y adivinarle un sitio escondería el fallo.
 * Lanza también si la jornada no es una jornada (`esJornada`), en vez de devolver una ventana rota.
 */
export function obrasDelDia<O extends Pick<ObraResuelta, 'nombre' | 'autor' | 'titulo' | 'recuento'>>(
  obras: readonly O[],
  autores: readonly Pick<Autor, 'slug' | 'ordenAlfabetico'>[],
  jornada: Jornada,
): O[] {
  const porAutor = new Map<string, O[]>();
  for (const obra of obras) {
    const suyas = porAutor.get(obra.autor);
    if (suyas === undefined) porAutor.set(obra.autor, [obra]);
    else suyas.push(obra);
  }

  const delCorpus = new Map(autores.map((autor) => [autor.slug, autor]));
  const lista = [...porAutor.keys()]
    .map((slug) => {
      const autor = delCorpus.get(slug);
      if (autor === undefined) {
        throw new Error(
          `obrasDelDia: la Obra «${porAutor.get(slug)![0].nombre}» es del Autor «${slug}», que no está ` +
            'entre los Autores recibidos: las Obras de la portada no saben dónde ponerla.',
        );
      }
      if (autor.ordenAlfabetico === undefined) {
        throw new Error(
          [
            `El Autor «${slug}» tiene Obras en la portada y no tiene clave de orden (ordenAlfabetico),`,
            'así que las Obras de la portada no saben dónde ponerlo.',
            'Lo para antes `integraciones/claves.ts`; si se llega aquí, esa puerta no corrió.',
            'La clave la propone `npx tsx tools/autor.ts proponer-claves`.',
          ].join(' '),
        );
      }
      return { slug, clave: autor.ordenAlfabetico, suyas: ordenDeLaListaDeObras(porAutor.get(slug)!) };
    })
    .sort(compararPorClave);

  const total = lista.length;
  if (total === 0) return [];
  // Una jornada sin forma, o que no está en el calendario, daría un día `NaN` y una ventana vacía:
  // se nombra aquí y no cuatro marcos más abajo (como `esJornada` explica).
  if (!esJornada(jornada)) {
    throw new Error(`obrasDelDia: «${jornada}» no es una jornada AAAA-MM-DD del calendario.`);
  }
  const cuantas = Math.min(OBRAS_DE_LA_PORTADA, total);
  const dia = diasDesdeLaEpoca(jornada);

  const elegidas: O[] = [];
  for (let j = 0; j < cuantas; j += 1) {
    const posicion = dia * cuantas + j;
    const { suyas } = lista[modulo(posicion, total)];
    const aparicion = Math.floor(posicion / total);
    elegidas.push(suyas[modulo(aparicion, suyas.length)]);
  }
  return elegidas;
}
