/**
 * La **Meta de Corpus** y el tramo al que se dedica la sesión — v4, 24/08/2026.
 *
 * `objetivo.ts` responde a «qué falta para que esto se pueda publicar»; este módulo
 * responde a «cuánto le falta al Corpus para ser lo que queremos que sea». Son dos
 * preguntas distintas y por eso son dos módulos. El suelo de publicación es una regla del
 * producto: moverlo rompe páginas vivas. La meta es una ambición: moverla solo cambia a qué
 * se dedica la próxima sesión.
 *
 * De dónde sale este módulo. El 24/08/2026 el Corpus cumplía **todos** los criterios de la
 * Historia 11.4 —ningún Tema por debajo del umbral, tradición latinoamericana en el 41,2 %—
 * y `objetivoDeSesion` devolvía, con razón, «no hay hueco que cerrar». Un bucle autónomo
 * que deriva su trabajo del hueco se quedaba entonces sin trabajo que derivar, con 59
 * documentos de Fuente versionados y 489.690 palabras sin exprimir. La meta es lo que le
 * vuelve a dar de qué tirar.
 *
 * El escalonado —Colecciones, fondo, anchura— no es un orden de importancia sino de
 * **coste**: primero lo que no siembra nada, luego lo que corrige el reparto de lo que ya
 * se siembra, y al final lo que abre superficie nueva.
 *
 * Sobre nombrar Autores, que es donde este módulo estuvo a punto de romper una regla. El
 * informe de `tools/huecos.ts` no escribe **ningún** nombre de Autor, y hay una prueba de la
 * Historia 9.3 que lo vigila entera: lo único que el informe entrecomilla son nombres de
 * Tema. La concentración tenía una excusa buena para saltársela —nombrar al que ya está no
 * es elegir a quién admitir— y aun así no se la salta: el texto dice «el Autor más
 * representado», que es todo lo que hace falta para actuar, y el slug viaja solo en la
 * estructura, que es dato para una máquina y no una propuesta a una persona. Una regla que
 * se rompe la primera vez que hay una excusa buena no era una regla.
 *
 * AD-5 — Derivación pura: recibe lo que `verHuecos` ya calculó y lo ya leído, no toca disco
 * ni vuelve a aplicar ningún umbral que tenga otro dueño. AD-9 — las cifras salen de
 * `umbrales.ts` y de ningún otro sitio.
 */

import { milesEnEspañol, porcentajeEnEspañol } from './formato.ts';
import type { CitaParaHuecos, ColeccionParaHuecos, Huecos, TemaParaHuecos } from './huecos.ts';
import {
  META_AUTORES,
  META_CITAS_PUBLICADAS,
  META_COLECCIONES_PUBLICADAS,
  META_TEMAS_PUBLICADOS,
  TECHO_CONCENTRACION_POR_AUTOR,
} from './umbrales.ts';

/**
 * El tramo que manda en esta sesión. Es lo que hace la salida legible por una máquina sin
 * analizar la frase: el bucle autónomo decide con esto a qué orden llama.
 */
export type ClaseDeMeta =
  /** Faltan Colecciones. Se cierran curando lo ya publicado: no siembra nada. */
  | 'coleccion'
  /** Un Autor pasa del techo. Se cierra sembrando **a los demás**, nunca quitando. */
  | 'concentracion'
  /** Falta censo de Autores para la meta. */
  | 'autores'
  /** Faltan Temas publicados: la anchura, que va después del fondo. */
  | 'temas'
  /** Todo lo demás está y falta volumen: seguir sembrando. */
  | 'volumen'
  /** Los cuatro tramos puestos y el reparto sano. */
  | 'alcanzada';

/** Un tramo de la meta: dónde está, adónde va y cuánto le falta. */
export interface TramoDeMeta {
  alcanzado: number;
  meta: number;
  /** Nunca negativo: pasarse de la meta no es un hueco de signo contrario. */
  faltan: number;
}

/** El reparto por Autor, que es lo que impide alcanzar el volumen por el camino fácil. */
export interface Concentracion {
  /**
   * El Autor más representado, por slug.
   *
   * Viaja en la estructura y **no** en el texto que el informe escribe: el informe dice «el
   * Autor más representado» y nunca su nombre, porque la regla de la Historia 9.3 es que no
   * nombra a ninguno. Aquí es dato para quien consume el `--json`, no una propuesta.
   */
  autor: string;
  citas: number;
  /** Su peso sobre el Corpus, a una décima, como el equilibrio de tradición. */
  porcentaje: number;
  techo: number;
  excede: boolean;
  /**
   * Citas de **otros** Autores que hacen falta para bajarlo al techo.
   *
   * Se dice en Citas de otros y no en Citas suyas de menos porque una Cita publicada no se
   * despublica: el techo se cierra diluyendo. Es el menor `k` con
   * `suyas / (total + k) ≤ techo/100`, que despejado es `k ≥ 100·suyas/techo − total`.
   */
  citasDeOtrosQueFaltan: number;
  /**
   * Cuántos Autores pasan del techo, no solo si alguno pasa.
   *
   * Existe porque el campo de arriba miraba **solo al primero**, y eso resultó ser un agujero
   * de verdad: once sesiones diluyendo al Autor más representado llevaron al segundo a seis
   * Citas del techo sin que la política dijera una palabra. Un tramo que se cierra creando
   * una concentración nueva no ha cerrado nada, y quien lee el informe tiene que poder verlo
   * antes de sembrar el lote siguiente, no después.
   */
  porEncimaDelTecho: number;
}

export interface Meta {
  citas: TramoDeMeta;
  temas: TramoDeMeta;
  autores: TramoDeMeta;
  colecciones: TramoDeMeta;
  /** Ausente en un Corpus sin Citas: no hay reparto del que hablar. */
  concentracion?: Concentracion;
  /** Los cuatro tramos cerrados **y** el reparto por debajo del techo. */
  alcanzada: boolean;
}

export interface ObjetivoDeMeta {
  clase: ClaseDeMeta;
  /** Qué hacer en esta sesión, en texto legible. */
  objetivo: string;
  /** De qué tramo sale, con la cifra alcanzada y la meta delante. */
  hueco: string;
  meta: Meta;
}

function tramo(alcanzado: number, objetivo: number): TramoDeMeta {
  return { alcanzado, meta: objetivo, faltan: Math.max(0, objetivo - alcanzado) };
}

/**
 * El Autor más representado del Corpus, y cuánto habría que sembrar de los demás.
 *
 * El desempate es por slug en español, como el de los huecos: sin él, dos Autores empatados
 * darían un titular distinto según el orden en que se leyeron los ficheros, y el objetivo
 * dejaría de ser el mismo para el mismo estado.
 */
function concentracionDe(citas: CitaParaHuecos[]): Concentracion | undefined {
  if (citas.length === 0) return undefined;

  const porAutor = new Map<string, number>();
  for (const cita of citas) porAutor.set(cita.autor, (porAutor.get(cita.autor) ?? 0) + 1);

  const ordenados = [...porAutor.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'),
  );
  const [autor, suyas] = ordenados[0]!;

  const total = citas.length;
  const pesa = (n: number) => Math.round((n / total) * 1000) / 10;
  const porcentaje = pesa(suyas);

  /*
   * La dilución se mide sobre **todos** los que exceden y se queda con la mayor, no con la del
   * primero. Hoy dan lo mismo —el que más pesa es el que más dilución pide— y aun así se
   * escribe así a propósito: la equivalencia es una casualidad de que `k` crezca con `suyas`,
   * no una propiedad de la que quiera depender el día que el techo se calcule de otro modo.
   */
  const excedentes = ordenados.filter(([, n]) => pesa(n) > TECHO_CONCENTRACION_POR_AUTOR);
  const faltanPara = (n: number) =>
    Math.max(0, Math.ceil((100 * n) / TECHO_CONCENTRACION_POR_AUTOR) - total);

  return {
    autor,
    citas: suyas,
    porcentaje,
    techo: TECHO_CONCENTRACION_POR_AUTOR,
    excede: excedentes.length > 0,
    citasDeOtrosQueFaltan: Math.max(0, ...excedentes.map(([, n]) => faltanPara(n))),
    porEncimaDelTecho: excedentes.length,
  };
}

/**
 * El estado de la meta, derivado de lo leído y de los huecos ya calculados.
 *
 * Los Temas y las Colecciones **publicados** se cuentan restando los que `verHuecos` dejó
 * por debajo de su umbral, y no volviendo a aplicar el umbral aquí. Es deliberado: quien
 * decide qué está por debajo tiene un solo dueño, y una segunda cuenta podría discrepar de
 * la primera el día que el umbral se mueva.
 */
/**
 * Cuántas Citas más cabe sembrar de un Autor sin que rompa el techo de concentración.
 *
 * La aritmética contraria —cuántas Citas **de otros** faltan para diluir a quien ya excede— vive
 * dentro de `verMeta`, y es la que el informe enseña. Ésta es la que decide **dónde invertir una
 * sesión de sembrado**, y el protocolo apoya en ella una regla: «el margen está donde el Autor
 * tiene pocas Citas, no donde tiene mucha obra».
 *
 * Sale de despejar `(citas + n) / (total + n) ≤ techo`:
 *
 *     n ≤ (techo · total − citas) / (1 − techo)
 *
 * Lo que importa de la fórmula, y lo que una regla de tres ingenua se pierde, es que **el Corpus
 * crece con lo que se siembra**: cada Cita sembrada sube el numerador de ese Autor y también el
 * denominador de todos. Por eso de un Autor a cero caben unas 176 en un Corpus de 1000, no 150.
 *
 * Devuelve 0 —nunca un negativo— para quien ya está en el techo o lo excede: un margen negativo
 * se sumaría mal en cualquier cuenta que lo use.
 */
export function citasQueCabenDe(citasDelAutor: number, totalDelCorpus: number): number {
  const techo = TECHO_CONCENTRACION_POR_AUTOR / 100;
  const caben = (techo * totalDelCorpus - citasDelAutor) / (1 - techo);

  return Math.max(0, Math.floor(caben));
}

export function verMeta(
  citas: CitaParaHuecos[],
  temas: TemaParaHuecos[],
  colecciones: ColeccionParaHuecos[],
  huecos: Huecos,
): Meta {
  const estado = {
    citas: tramo(citas.length, META_CITAS_PUBLICADAS),
    temas: tramo(temas.length - huecos.temas.length, META_TEMAS_PUBLICADOS),
    /*
     * Los Autores **que publican**, no los declarados, por el mismo motivo que los Temas: un
     * fichero en `corpus/autores/` sin ninguna Cita detrás no es una página que exista para
     * nadie, y contarlo dejaría la meta alcanzable creando ficheros vacíos. Lo destapó un número
     * que no cuadraba —el sitemap traía 16 Páginas de Autor y el Corpus declaraba 17— y la
     * respuesta estaba escrita desde el principio en el comentario de `META_TEMAS_PUBLICADOS`;
     * simplemente no se había aplicado aquí.
     *
     * `huecos.tradicion.total` sigue contándolos a todos y está bien que así sea: el suelo del
     * 40 % mide **a quién se ha admitido**, que es un compromiso tomado en el momento del alta,
     * no a quién se ha sembrado. Son dos censos distintos y hay una prueba que lo fija.
     */
    autores: tramo(new Set(citas.map((c) => c.autor)).size, META_AUTORES),
    colecciones: tramo(colecciones.length - huecos.colecciones.length, META_COLECCIONES_PUBLICADAS),
    concentracion: concentracionDe(citas),
  };

  return {
    ...estado,
    alcanzada:
      estado.citas.faltan === 0 &&
      estado.temas.faltan === 0 &&
      estado.autores.faltan === 0 &&
      estado.colecciones.faltan === 0 &&
      estado.concentracion?.excede !== true,
  };
}

/** «1 Cita» / «7 Citas», sin dejar el plural al azar de la interpolación. */
function citas(cuantas: number): string {
  return `${milesEnEspañol(cuantas)} ${cuantas === 1 ? 'Cita' : 'Citas'}`;
}

/**
 * El tramo al que se dedica la sesión.
 *
 * El escalonado es por **coste**, no por importancia, y ese es el criterio que la v4 fija:
 *
 *   1. **Colecciones** — no siembra nada: cura sobre lo ya publicado. Es superficie
 *      indexable nueva a coste de curación, y dejarla para el final sería pagar sembrado
 *      por páginas que ya se podían tener.
 *   2. **Concentración** — antes de sembrar más, que lo que se siembre corrija el reparto.
 *      Puesta después del volumen, mil Citas se alcanzarían minando al Autor que ya sobra.
 *   3. **Autores** — el censo, que es lo que hace sostenible el techo de arriba.
 *   4. **Temas** — la anchura. Va después del fondo porque un Tema nuevo nace pidiendo
 *      `MIN_CITAS_POR_TEMA` Citas, y abrirlos con el censo corto los deja a todos cortos.
 *   5. **Volumen** — lo que queda cuando la forma del Corpus ya es la buena.
 *
 * Lo que no dice, igual que sus hermanos: **a quién** admitir. Ni siquiera en el tramo de
 * concentración, donde el nombre que aparece es el del que ya está.
 */
export function objetivoDeMeta(meta: Meta): ObjetivoDeMeta {
  const { colecciones, concentracion, autores, temas, citas: volumen } = meta;

  if (colecciones.faltan > 0) {
    return {
      clase: 'coleccion',
      objetivo:
        `Curar ${colecciones.faltan} ${colecciones.faltan === 1 ? 'Colección' : 'Colecciones'} ` +
        'sobre las Citas ya publicadas, sin sembrar ni una Cita nueva.',
      hueco:
        `El Corpus publica ${colecciones.alcanzado} de las ${colecciones.meta} Colecciones ` +
        'de la meta, y una Colección no siembra: sale de lo que ya está.',
      meta,
    };
  }

  if (concentracion?.excede === true) {
    return {
      clase: 'concentracion',
      objetivo:
        `Sembrar ${citas(concentracion.citasDeOtrosQueFaltan)} de otros Autores: ningún Autor ` +
        `puede pasar del ${porcentajeEnEspañol(concentracion.techo)} % del Corpus.`,
      hueco:
        `El Autor más representado aporta ${citas(concentracion.citas)} de ` +
        `${citas(volumen.alcanzado)}: un ${porcentajeEnEspañol(concentracion.porcentaje)} %, por ` +
        `encima del techo del ${porcentajeEnEspañol(concentracion.techo)} %` +
        (concentracion.porEncimaDelTecho > 1
          ? `, y no es el único: son ${concentracion.porEncimaDelTecho} Autores los que lo pasan`
          : '') +
        '. Se cierra diluyendo, nunca despublicando.',
      meta,
    };
  }

  if (autores.faltan > 0) {
    return {
      clase: 'autores',
      objetivo:
        `Admitir ${autores.faltan} ${autores.faltan === 1 ? 'Autor' : 'Autores'} más, respetando ` +
        'el suelo de tradición latinoamericana.',
      hueco:
        `El Corpus tiene ${autores.alcanzado} Autores de los ${autores.meta} de la meta.`,
      meta,
    };
  }

  if (temas.faltan > 0) {
    return {
      clase: 'temas',
      objetivo:
        `Abrir y publicar ${temas.faltan} ${temas.faltan === 1 ? 'Tema' : 'Temas'} más: cada uno ` +
        'es una superficie con forma de consulta.',
      hueco: `El Corpus publica ${temas.alcanzado} de los ${temas.meta} Temas de la meta.`,
      meta,
    };
  }

  if (volumen.faltan > 0) {
    return {
      clase: 'volumen',
      objetivo: `Sembrar ${citas(volumen.faltan)} más, repartidas entre los Temas más cortos.`,
      hueco:
        `El Corpus publica ${citas(volumen.alcanzado)} de las ${citas(volumen.meta)} de la meta, ` +
        'y la forma del Corpus ya es la buena: falta tamaño.',
      meta,
    };
  }

  return {
    clase: 'alcanzada',
    objetivo: 'Meta de Corpus alcanzada. El listón siguiente lo pone Héctor.',
    hueco:
      `${citas(volumen.alcanzado)}, ${temas.alcanzado} Temas, ${autores.alcanzado} Autores y ` +
      `${colecciones.alcanzado} Colecciones publicadas, y ningún Autor por encima del ` +
      `${porcentajeEnEspañol(TECHO_CONCENTRACION_POR_AUTOR)} %.`,
    meta,
  };
}

/**
 * La meta escrita para la terminal, con su tramo debajo.
 *
 * Vive aquí y no en cada orden por lo mismo que `lineasDeObjetivo`: `tools/huecos.ts` y
 * `tools/objetivo.ts` la enseñan las dos, y con una copia en cada sitio «el mismo objetivo
 * palabra por palabra» dejaría de ser cierto en cuanto una de las dos se retocara.
 */
export function lineasDeMeta(objetivo: ObjetivoDeMeta): string[] {
  const { meta } = objetivo;
  const fila = (nombre: string, t: TramoDeMeta) =>
    `${nombre.padEnd(14)} ${String(t.alcanzado).padStart(5)} de ${String(t.meta).padStart(5)}` +
    (t.faltan === 0 ? '  ·  puesto' : `  ·  faltan ${t.faltan}`);

  return [
    'Meta de Corpus',
    '──────────────',
    fila('Citas', meta.citas),
    fila('Temas', meta.temas),
    fila('Autores', meta.autores),
    fila('Colecciones', meta.colecciones),
    ...(meta.concentracion === undefined
      ? []
      : [
          `El Autor más representado aporta ` +
            `${meta.concentracion.citas} Citas, un ` +
            `${porcentajeEnEspañol(meta.concentracion.porcentaje)} %` +
            (meta.concentracion.excede
              ? ` — por encima del techo del ${porcentajeEnEspañol(meta.concentracion.techo)} %` +
                (meta.concentracion.porEncimaDelTecho > 1
                  ? ` (lo pasan ${meta.concentracion.porEncimaDelTecho} Autores)`
                  : '')
              : ` — dentro del techo del ${porcentajeEnEspañol(meta.concentracion.techo)} %` +
                /*
                 * Y cuánto sitio queda, que es el número con el que se decide dónde sembrar.
                 *
                 * La línea decía cuánto se ha usado y no cuánto cabe, así que el bucle calculaba
                 * esto a mano en un guion de usar y tirar cada vez que iba a elegir Autor. Sin
                 * nombres, como el resto de la línea: la regla de la 9.3 vale igual para esta
                 * cifra. Cuando ya excede no se dice, porque ahí lo que hace falta saber es
                 * cuánto falta para diluirlo, no un sitio que no hay.
                 */
                ` · caben ${citasQueCabenDe(meta.concentracion.citas, meta.citas.alcanzado)} ` +
                  `Citas más suyas`),
        ]),
    '',
    'Tramo de esta sesión',
    '────────────────────',
    objetivo.objetivo,
    `Sale del tramo: ${objetivo.hueco}`,
  ];
}
