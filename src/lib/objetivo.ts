/**
 * El objetivo de cada sesión de sembrado — Historia 11.3, FR-25.
 *
 * `huecos.ts` enseña qué falta; elegir a qué se dedica la sesión seguía siendo de quien
 * lee. Un agente que siembra sin supervisión no tiene criterio, así que deriva hacia lo
 * que es más fácil de encontrar — que es exactamente el sesgo que el Corpus arrastra.
 * Esta política cierra ese hueco: dado un estado del Corpus devuelve siempre el mismo
 * objetivo, y **declara de qué hueco sale**.
 *
 * El objetivo tiene **dos ejes**, y devuelve los dos siempre que existan: a qué Tema van
 * las Citas de la sesión y de qué tradición hace falta el Autor. La prioridad decide cuál
 * es el titular —la tradición primero—, no cuál se dice: una sesión que solo supiera qué
 * clase de Autor admitir, con seis Temas por debajo del umbral, tendría que volver a
 * elegir por su cuenta dónde colocar sus Citas, que es justo lo que esto evita.
 *
 * Lo que la política nunca dice es **a quién** admitir. Al Autor que falta lo caracteriza
 * por su **tradición** —«hacen falta Autores de tradición latinoamericana»— y jamás por
 * su nombre. Quién entra en el Corpus es la única decisión que este producto no delega, y
 * una lista de nombres la delegaría por la puerta de atrás.
 *
 * Determinismo significa **sin fecha y sin azar**: el mismo estado da la misma frase,
 * palabra por palabra, se pregunte cuando se pregunte. La fecha entra solo en el registro
 * de la sesión, que es otra cosa y vive en `tools/objetivo.ts`.
 *
 * AD-5 — Derivación pura: recibe lo que `verHuecos` ya calculó, no lee disco ni vuelve a
 * contar los huecos. AD-9 — los umbrales salen de `umbrales.ts` y de ningún otro sitio.
 */

import { porcentajeEnEspañol } from './formato.ts';
import type { EquilibrioDeTradicion, HuecoDeTema, Huecos } from './huecos.ts';
import { MIN_CITAS_POR_TEMA } from './umbrales.ts';

/**
 * De dónde sale el **titular** del objetivo. Es lo que hace la salida legible por una
 * máquina sin analizar la frase: la Historia 11.4 cuenta sesiones por clase de hueco.
 *
 * Nombra el eje que manda, no el único que se informa: una sesión de clase `tradicion`
 * lleva además su Tema cuando lo hay.
 */
export type ClaseDeObjetivo =
  /** Cerrar el déficit de tradición, que tiene prioridad sobre cualquier Tema corto. */
  | 'tradicion'
  /** Sembrar el Tema al que menos le falta para llegar al umbral. */
  | 'tema'
  /** Ni déficit de tradición ni Temas cortos: no hay hueco que cerrar. */
  | 'ninguno'
  /** Un Corpus sin Autores: no hay estado del que derivar objetivo. */
  | 'sin-estado';

export interface ObjetivoDeTema {
  slug: string;
  nombre: string;
  publicadas: number;
  faltan: number;
}

export interface ObjetivoDeTradicion {
  /** La tradición que hay que reforzar. Nunca un Autor: la caracterización es esta. */
  nombre: 'latinoamericana';
  porcentaje: number;
  suelo: number;
  /**
   * Autores de esa tradición que hay que admitir para alcanzar el suelo.
   *
   * Ausente cuando el suelo no se puede alcanzar admitiendo Autores, que solo ocurre con
   * un suelo del 100 %. Prometer una cifra ahí sería prometer que basta con sembrar.
   */
  autoresQueFaltan?: number;
}

export interface ObjetivoDeSesion {
  clase: ClaseDeObjetivo;
  /** Qué hacer en esta sesión, en texto legible, con los dos ejes cuando los hay. */
  objetivo: string;
  /** De qué hueco sale, en texto legible. Es el criterio que la historia exige declarar. */
  hueco: string;
  /** El Tema al que van las Citas de la sesión, siempre que haya alguno corto. */
  tema?: ObjetivoDeTema;
  /** La tradición que hay que reforzar, cuando está por debajo de su suelo. */
  tradicion?: ObjetivoDeTradicion;
}

/** «1 Cita» / «7 Citas», sin dejar el plural al azar de la interpolación. */
function citas(cuantas: number): string {
  return `${cuantas} ${cuantas === 1 ? 'Cita' : 'Citas'}`;
}

/**
 * Cuántos Autores de tradición latinoamericana hay que admitir para alcanzar el suelo.
 *
 * Cada alta sube el numerador y el denominador a la vez, así que no basta con la
 * diferencia contra el suelo: se busca el menor `k` con `(lat + k) / (total + k) ≥ suelo`,
 * que despejado es `k ≥ (suelo · total − 100 · lat) / (100 − suelo)`.
 *
 * No es un segundo cómputo de huecos: los tres números salen tal cual de `verHuecos`, y
 * quien decide si el suelo se alcanza sigue siendo su `alcanzaElSuelo`.
 */
function autoresQueFaltanParaElSuelo(
  total: number,
  latinoamericana: number,
  suelo: number,
): number | undefined {
  const margen = 100 - suelo;
  if (margen <= 0) return undefined;
  return Math.max(0, Math.ceil((suelo * total - 100 * latinoamericana) / margen));
}

/** El eje de Autor, cuando es el titular: qué tradición hay que admitir, y cuánta. */
function admitirTradicion(faltan: number | undefined, suelo: string): string {
  return (
    'Admitir Autores de tradición latinoamericana' +
    (faltan === undefined
      ? `, hasta alcanzar el suelo del ${suelo} %.`
      : `: ${faltan === 1 ? 'falta 1' : `faltan ${faltan}`} para alcanzar el suelo del ${suelo} %.`)
  );
}

/** El eje de Tema, cuando es el titular: la sesión entera se dedica a ese Tema. */
function sembrarTema(tema: HuecoDeTema): string {
  return (
    `Sembrar ${citas(tema.faltan)} del Tema «${tema.nombre}»: es el Tema al que menos le ` +
    'falta para publicarse.'
  );
}

/**
 * El eje de Tema cuando el titular es la tradición: dónde van las Citas del Autor nuevo.
 *
 * Sin esta frase, la rama de tradición —que es la rama en la que el Corpus está hoy y en
 * la que estará durante toda la Historia 11.4— dejaba a la sesión sabiendo a quién
 * admitir y sin saber dónde colocar lo que se siembre.
 */
function dondeVanLasCitas(tema: HuecoDeTema): string {
  return (
    `Sus Citas van al Tema «${tema.nombre}», al que menos le falta para publicarse: ` +
    `${citas(tema.faltan)}.`
  );
}

function huecoDeTradicion(tradicion: EquilibrioDeTradicion, suelo: string): string {
  return (
    `De los ${tradicion.total} Autores del Corpus, ${tradicion.latinoamericana} son de ` +
    `tradición latinoamericana: un ${porcentajeEnEspañol(tradicion.porcentaje)} %, por ` +
    `debajo del suelo comprometido del ${suelo} %.`
  );
}

function huecoDeTema(tema: HuecoDeTema): string {
  return (
    `«${tema.nombre}» tiene ${citas(tema.publicadas)} ` +
    `${tema.publicadas === 1 ? 'publicada' : 'publicadas'} y el umbral de publicación son ` +
    `${MIN_CITAS_POR_TEMA}.`
  );
}

function ejeDeTema(tema: HuecoDeTema): ObjetivoDeTema {
  return {
    slug: tema.slug,
    nombre: tema.nombre,
    publicadas: tema.publicadas,
    faltan: tema.faltan,
  };
}

/**
 * El objetivo de la sesión, derivado del estado del Corpus que `verHuecos` describe.
 *
 * El orden de prioridad no es negociable y es el corazón de la historia:
 *
 *   1. Sin Autores no hay estado del que derivar nada.
 *   2. Si la tradición latinoamericana está por debajo de su suelo, el titular es cerrar
 *      ese hueco — y el Tema al que menos le falta va también, como segundo eje.
 *   3. Si no, el titular es el Tema al que **menos** le falta.
 *   4. Si tampoco hay Temas cortos, decirlo: no hay hueco que cerrar.
 *
 * La tradición va antes que el Tema más corto porque un Tema corto se cierra sembrando
 * cualquier Autor de los que ya están, y el hueco de tradición solo se cierra admitiendo
 * Autores nuevos: es más lento y más fácil de posponer indefinidamente. Si el Tema fácil
 * ganase, el hueco caro no se cerraría nunca, que es justo el sesgo que hay que corregir.
 */
export function objetivoDeSesion(huecos: Huecos): ObjetivoDeSesion {
  const { tradicion } = huecos;
  const suelo = porcentajeEnEspañol(tradicion.suelo);

  if (tradicion.total === 0) {
    /*
     * Un Corpus sin Autores no tiene proporción de tradición que medir —el 0 % que
     * devuelve `verHuecos` es el artefacto de no dividir por cero— y tampoco tiene a
     * quién atribuir una Cita. Derivar de ahí «faltan Autores latinoamericanos» sería
     * derivar de la nada, y además pisaría la única decisión que no se delega: la
     * primera admisión es del editor.
     */
    return {
      clase: 'sin-estado',
      objetivo: 'No hay estado del que derivar objetivo: el Corpus no tiene Autores.',
      hueco:
        'Sin Autores no hay proporción de tradición que medir ni Citas que sembrar. ' +
        'La primera admisión es del editor, no de esta política.',
    };
  }

  /*
   * `verHuecos` ya deja los Temas de menos a más les falta, desempatados por slug en
   * español. Volver a ordenarlos aquí duplicaría el criterio de desempate en dos módulos,
   * que es justo lo que AD-9 evita con los umbrales: el primero de la lista es el Tema al
   * que menos le falta, y su orden tiene un solo dueño.
   */
  const tema = huecos.temas[0];

  if (!tradicion.alcanzaElSuelo) {
    const faltan = autoresQueFaltanParaElSuelo(
      tradicion.total,
      tradicion.latinoamericana,
      tradicion.suelo,
    );
    return {
      clase: 'tradicion',
      objetivo: [
        admitirTradicion(faltan, suelo),
        ...(tema === undefined ? [] : [dondeVanLasCitas(tema)]),
      ].join(' '),
      hueco: [
        huecoDeTradicion(tradicion, suelo),
        ...(tema === undefined ? [] : [huecoDeTema(tema)]),
      ].join(' '),
      tradicion: {
        nombre: 'latinoamericana',
        porcentaje: tradicion.porcentaje,
        suelo: tradicion.suelo,
        ...(faltan === undefined ? {} : { autoresQueFaltan: faltan }),
      },
      ...(tema === undefined ? {} : { tema: ejeDeTema(tema) }),
    };
  }

  if (tema !== undefined) {
    return {
      clase: 'tema',
      objetivo: sembrarTema(tema),
      hueco: huecoDeTema(tema),
      tema: ejeDeTema(tema),
    };
  }

  return {
    clase: 'ninguno',
    objetivo: 'No hay hueco que cerrar.',
    hueco:
      `Ningún Tema por debajo del umbral de ${MIN_CITAS_POR_TEMA} Citas, y la tradición ` +
      `latinoamericana alcanza el suelo del ${suelo} %.`,
  };
}

/**
 * El objetivo escrito para la terminal, con su hueco declarado debajo.
 *
 * Vive aquí y no en cada orden porque `tools/objetivo.ts` y `tools/huecos.ts` lo enseñan
 * los dos: con una copia en cada sitio, «el mismo objetivo palabra por palabra» dejaría
 * de ser cierto en cuanto una de las dos se retocara.
 */
export function lineasDeObjetivo(objetivo: ObjetivoDeSesion): string[] {
  return [
    'Objetivo de la sesión',
    '─────────────────────',
    objetivo.objetivo,
    `Sale del hueco: ${objetivo.hueco}`,
  ];
}
