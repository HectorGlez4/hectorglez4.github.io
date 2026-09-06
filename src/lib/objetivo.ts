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
import type { EquilibrioDeTradicion, HuecoDeEpoca, HuecoDeTema, Huecos } from './huecos.ts';
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
  /**
   * Agotar la época a la que menos le falta — Historia 19.5.
   *
   * Va después del Tema porque un Tema corto es una página que no se publica, y una época
   * sin agotar es cobertura que falta: lo primero rompe algo vivo y lo segundo no. Va antes
   * de `ninguno` porque **existir es todo el punto**: sin esta rama, el informe decía «82
   * pendientes» en el bloque de cobertura y «No hay hueco que cerrar» cuatro líneas más
   * abajo, que son dos respuestas contradictorias a la misma pregunta en el mismo informe.
   */
  | 'epoca'
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
  /**
   * Su peso **sobre la base del suelo** — v6, no sobre el Corpus entero: todos los Autores
   * menos los de tradición `otra`, con los que no la declaran dentro.
   *
   * Ausente cuando esa base está vacía: ahí no hay reparto que medir, y una cifra sería
   * inventada. Ver `EquilibrioDeTradicion.hispanicos` y `.porcentaje`.
   */
  porcentaje?: number;
  suelo: number;
  /**
   * Autores de esa tradición que hay que admitir para alcanzar el suelo.
   *
   * Ausente cuando el suelo no se puede alcanzar admitiendo Autores, que solo ocurre con
   * un suelo del 100 %. Prometer una cifra ahí sería prometer que basta con sembrar.
   */
  autoresQueFaltan?: number;
}

/**
 * La época de la que sale el trabajo de la sesión — Historia 19.5.
 *
 * Son cifras y el nombre de una **categoría de la Fuente**, jamás el de un Autor. Quién de
 * los que faltan entra sigue siendo del editor, y la lista de candidatos vive versionada en
 * `corpus/candidatos-por-epoca.yml`, que es donde se mira.
 */
export interface ObjetivoDeEpoca {
  id: string;
  nombre: string;
  candidatos: number;
  sembrados: number;
  descartados: number;
  faltan: number;
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
  /** La época que hay que agotar, cuando no hay Tema corto y queda cobertura — 19.5. */
  epoca?: ObjetivoDeEpoca;
}

/** «1 Cita» / «7 Citas», sin dejar el plural al azar de la interpolación. */
function citas(cuantas: number): string {
  return `${cuantas} ${cuantas === 1 ? 'Cita' : 'Citas'}`;
}

/**
 * Cuántos Autores de tradición latinoamericana hay que admitir para alcanzar el suelo.
 *
 * Cada alta sube el numerador y el denominador a la vez, así que no basta con la
 * diferencia contra el suelo: se busca el menor `k` con `(lat + k) / (hisp + k) ≥ suelo`,
 * que despejado es `k ≥ (suelo · hisp − 100 · lat) / (100 − suelo)`.
 *
 * **El denominador es la base del suelo, no el Corpus entero** — v6. Es la misma corrección
 * que la del suelo, y tiene que ser la misma o la cifra prometería un alta que no bastaría:
 * admitir a un latinoamericano mueve el reparto de la base, no el censo de clásicos.
 *
 * Con la base vacía el despeje da 0, y 0 sería mentira: el reparto `0/0` no alcanza ningún
 * suelo, y hace falta al menos un alta para que haya reparto. De ahí el mínimo de 1.
 *
 * No es un segundo cómputo de huecos: los tres números salen tal cual de `verHuecos`, y
 * quien decide si el suelo se alcanza sigue siendo su `alcanzaElSuelo`.
 */
function autoresQueFaltanParaElSuelo(
  hispanicos: number,
  latinoamericana: number,
  suelo: number,
): number | undefined {
  const margen = 100 - suelo;
  if (margen <= 0) return undefined;
  return Math.max(
    hispanicos === 0 ? 1 : 0,
    Math.ceil((suelo * hispanicos - 100 * latinoamericana) / margen),
  );
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

/**
 * De qué hueco sale la rama de tradición, con el denominador que de verdad se mide.
 *
 * Dice «que cuentan para el suelo» y no «del Corpus» porque desde la v6 el suelo se mide
 * sobre todos los Autores menos los de tradición `otra`: escribir el total del Corpus aquí
 * haría creer que un clásico universal cuenta contra el compromiso, que es justo lo que la v6
 * corrige. Los que no declaran tradición sí cuentan, que es la lectura conservadora.
 *
 * Con la base vacía no se publica cifra. El reparto no existe todavía, y un porcentaje
 * inventado en la frase de la que sale el trabajo de la sesión es peor que no tenerlo.
 */
function huecoDeTradicion(tradicion: EquilibrioDeTradicion, suelo: string): string {
  if (tradicion.porcentaje === undefined) {
    return (
      'El Corpus no tiene ningún Autor que cuente para el suelo panhispánico, así que no hay ' +
      `reparto que medir frente al suelo comprometido del ${suelo} %.`
    );
  }

  return (
    `De los ${tradicion.hispanicos} Autores que cuentan para el suelo —todos menos los de ` +
    `tradición otra—, ${tradicion.latinoamericana} son de tradición latinoamericana: un ` +
    `${porcentajeEnEspañol(tradicion.porcentaje)} %, por debajo del suelo comprometido del ` +
    `${suelo} %.`
  );
}

function huecoDeTema(tema: HuecoDeTema): string {
  return (
    `«${tema.nombre}» tiene ${citas(tema.publicadas)} ` +
    `${tema.publicadas === 1 ? 'publicada' : 'publicadas'} y el umbral de publicación son ` +
    `${MIN_CITAS_POR_TEMA}.`
  );
}

/**
 * El eje de época: qué cobertura falta, en candidatos de la Fuente — Historia 19.5.
 *
 * **Sin guillemets y sin nombres.** Lo único que este informe entrecomilla son nombres de
 * Tema —hay una prueba de la 9.3 que lo vigila entero—, y el nombre de una época es una
 * categoría de la Fuente, no un Tema del Corpus. Y de los candidatos no se nombra a ninguno:
 * quién entra sigue siendo la decisión que este producto no delega.
 */
function agotarEpoca(epoca: HuecoDeEpoca): string {
  return (
    `Agotar la época ${epoca.nombre}: le ${epoca.faltan === 1 ? 'queda 1 candidato' : `quedan ${epoca.faltan} candidatos`} ` +
    'por sembrar o por descartar con motivo escrito. Admitir sigue siendo del editor.'
  );
}

function huecoDeEpocaEnTexto(epoca: HuecoDeEpoca): string {
  return (
    `La Fuente clasifica ${epoca.candidatos} candidatos en la época ${epoca.nombre}: ` +
    `${epoca.sembrados} ya sembrados y ${epoca.descartados} descartados con motivo. La lista ` +
    'está en corpus/candidatos-por-epoca.yml y se regenera con: npm run epocas:registrar'
  );
}

function ejeDeEpoca(epoca: HuecoDeEpoca): ObjetivoDeEpoca {
  return {
    id: epoca.id,
    nombre: epoca.nombre,
    candidatos: epoca.candidatos,
    sembrados: epoca.sembrados,
    descartados: epoca.descartados,
    faltan: epoca.faltan,
  };
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
 *   4. Si tampoco hay Temas cortos, la época a la que menos le falta por agotar — 19.5.
 *   5. Y solo si tampoco queda ninguna, decirlo: no hay hueco que cerrar.
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
      tradicion.hispanicos,
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
        ...(tradicion.porcentaje === undefined ? {} : { porcentaje: tradicion.porcentaje }),
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

  /*
   * Y si no hay Tema corto, la cobertura por época — Historia 19.5.
   *
   * `verHuecos` ya deja las épocas con lo que queda primero y de menos a más les falta, así
   * que la primera con pendientes es la que menos trabajo pide. Se busca la primera con
   * `faltan > 0` y no se coge la primera a secas: con todas terminadas, la lista sigue
   * completa a propósito —una época agotada tiene que poder leerse— y `epocas[0]` sería una
   * época sin nada que hacer.
   *
   * Sin esta rama, el mismo informe decía «82 pendientes» arriba y «No hay hueco que cerrar»
   * abajo. Dos respuestas a la misma pregunta es la divergencia de dueño único que AD-11
   * existe para impedir, y aquí la respuesta buena es la que cuenta candidatos.
   */
  const epoca = huecos.epocas.find((e) => e.faltan > 0);
  if (epoca !== undefined) {
    return {
      clase: 'epoca',
      objetivo: agotarEpoca(epoca),
      hueco: huecoDeEpocaEnTexto(epoca),
      epoca: ejeDeEpoca(epoca),
    };
  }

  return {
    clase: 'ninguno',
    objetivo: 'No hay hueco que cerrar.',
    hueco:
      `Ningún Tema por debajo del umbral de ${MIN_CITAS_POR_TEMA} Citas, la tradición ` +
      `latinoamericana alcanza el suelo del ${suelo} % sobre los Autores que cuentan para ` +
      'él —todos menos los de tradición otra—, y ninguna época versionada tiene candidatos ' +
      'pendientes. Una época sin recuperar no cuenta como agotada: npm run epocas:registrar',
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
