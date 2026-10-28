/**
 * NFR-5 con puerta — Historia 26.8, AD-11 y AD-12.
 *
 * Ninguna superficie de `rutasPublicadas` puede quedar a más de `MAX_SALTOS_DESDE_LA_PORTADA`
 * saltos de la portada. Hasta esta historia lo miraban solo pruebas sobre un Corpus de juguete
 * y una prueba de Playwright que el CI no corre: ningún build lo rompía y ninguna orden que
 * retira lo miraba. Aquí vive **una sola lógica** para los dos sitios que ahora lo exigen:
 *
 *   · **el build** (`integraciones/alcance.ts`) lee el grafo del `dist/` real
 *     (`grafoDeDist`), exige que contenga el grafo del modelo (`aristasQueFaltan`) y corre
 *     `superficiesInalcanzables` sobre `rutasPublicadas` (`veredictoDeAlcance`);
 *   · **las órdenes que retiran** (`retirarCita`, `quitarCitas`, `despublicarColeccion`,
 *     `quitarTema`) comparan, antes de escribir nada, el modelo del Corpus de hoy con el que
 *     dejaría el cambio (`fueraDeAlcanceTras`), y se niegan si alguna Cita pasa a quedar fuera.
 *     Las que publican (`aprobar`, `darDeAltaLote`) no publican una Cita sin Tema publicado
 *     (`temaPublicadoConLaPasada`).
 *
 * **Lo que rota con la jornada no cuenta.** Un enlace dentro de un elemento con `data-jornada`
 * —la Cita del Día, que pinta solo `src/components/CitaDelDia.astro`—, de un `<template>` o de
 * un `<noscript>` no entra en ningún grafo: lo primero cambia sin commit, y lo otro no es lo que
 * se ve. Así un veredicto no puede cambiar de un día para otro sin que nada lo haya cambiado.
 *
 * El Corpus se lee de disco con los lectores de `tools/lib/corpus.ts`, nunca de `astro:content`.
 */

import { DOMINIO, SITIO } from '../../src/lib/dominio.ts';
import { colgarObras, type FichaDeObra, type PosicionesDeCitas } from '../../src/lib/obras.ts';
import {
  citasPorObra,
  coleccionesPublicadas,
  grafoDelModelo,
  rutasPublicadas,
  superficiesInalcanzables,
  temasBajoUmbralDe,
  temasPublicados,
  type Cita,
  type Coleccion,
  type ConjuntoPublicable,
  type Tema,
  type TemaBajoUmbral,
} from '../../src/lib/publicado.ts';
import { rutaDeCita, rutaNormalizada } from '../../src/lib/superficies.ts';
import { MAX_SALTOS_DESDE_LA_PORTADA, MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';
import {
  leerAutores,
  leerCitas,
  leerColecciones,
  leerDocumentosDeFuente,
  leerFichasDeObra,
  leerTemas,
  type AutorEnCorpus,
  type CitaEnCorpus,
  type ColeccionEnCorpus,
  type Rutas,
} from './corpus.ts';
import { recorrerElementos } from './html.ts';
import { posicionesDeCitas } from './posiciones.ts';

/** El atributo que marca lo que rota con la jornada. Lo emite solo `CitaDelDia.astro`. */
export const MARCA_DE_JORNADA = 'data-jornada';

/** Las etiquetas cuyo contenido no es enlace visible: su subárbol no entra en el grafo. */
const SIN_ENLACES_VISIBLES = new Set(['template', 'noscript']);

// ─── El Corpus leído de disco ────────────────────────────────────────────────

/** Lo que de un Corpus en disco hace falta para componer su conjunto publicable. */
export interface DatosDelCorpus {
  /** Las Citas publicadas, de `corpus/citas/`. */
  citas: CitaEnCorpus[];
  autores: AutorEnCorpus[];
  temas: { slug: string; nombre: string; ruta: string }[];
  /** Las Colecciones **declaradas**, de `corpus/colecciones/`: el umbral lo aplica el conjunto. */
  colecciones: ColeccionEnCorpus[];
  /** Las Fichas de Obra activas, admitidas por su esquema. */
  fichas: FichaDeObra[];
}

/** Lee del disco los datos de `conjuntoDeLosDatos`. Lanza, nombrando el fichero, ante uno ilegible. */
export async function leerDatosDelCorpus(rutas: Rutas): Promise<DatosDelCorpus> {
  return {
    citas: await leerCitas(rutas.citas),
    fichas: await leerFichasDeObra(rutas),
    autores: await leerAutores(rutas),
    temas: await leerTemas(rutas),
    colecciones: await leerColecciones(rutas),
  };
}

/**
 * El conjunto publicable de unos datos leídos de disco, del mismo dueño que lo publica (AD-11).
 *
 * Los `as unknown as` son los de siempre (`tools/huecos.ts`, `tools/objetivo.ts`): lo que sale
 * del disco es la forma admisible y lo que consume el dueño del conjunto es la forma plana, que
 * coinciden en los campos que aquí se miran. Lo que **no** se hace es reimplementar ningún
 * umbral: quién se publica lo decide `src/lib/publicado.ts`.
 */
export function conjuntoDeLosDatos(datos: DatosDelCorpus): ConjuntoPublicable {
  /*
   * Historia 22.4 — con su Obra colgada, como en `conjuntoPublicable`: sin ella,
   * `rutasPublicadas` no enumeraría ninguna Página de Obra.
   */
  const citas = colgarObras(datos.citas as unknown as Cita[], datos.fichas);
  return {
    citas,
    autores: datos.autores as unknown as ConjuntoPublicable['autores'],
    temas: datos.temas,
    colecciones: coleccionesPublicadas(datos.colecciones as unknown as Coleccion[], citas),
  };
}

/**
 * El conjunto publicable leído del Corpus — antes en `tools/indexacion.ts`, que lo reexporta para
 * sus importadores (rastreo, demanda, medición, tráfico y canal).
 */
export async function conjuntoDelCorpus(rutas: Rutas): Promise<ConjuntoPublicable> {
  return conjuntoDeLosDatos(await leerDatosDelCorpus(rutas));
}

/** El conjunto publicable de un Corpus y el grafo de su modelo. */
export interface ModeloDelCorpus {
  conjunto: ConjuntoPublicable;
  grafo: Map<string, string[]>;
}

/** El modelo de unos datos, con las posiciones de sus Citas en sus documentos (el orden del libro). */
export function modeloDeLosDatos(datos: DatosDelCorpus, posiciones: PosicionesDeCitas): ModeloDelCorpus {
  const conjunto = conjuntoDeLosDatos(datos);
  return { conjunto, grafo: grafoDelModelo(conjunto, citasPorObra(conjunto.citas, posiciones)) };
}

/**
 * El modelo del Corpus de `rutas`: su conjunto publicable y el grafo de enlaces que el sitio
 * construido tiene que contener (`grafoDelModelo`). Las posiciones salen de los mismos
 * lectores que el cargador `posiciones` del build (`posicionesDeCitas`).
 */
export async function modeloDelCorpus(rutas: Rutas): Promise<ModeloDelCorpus> {
  const datos = await leerDatosDelCorpus(rutas);
  const posiciones = posicionesDeCitas(datos.citas, await leerDocumentosDeFuente(rutas));
  return modeloDeLosDatos(datos, posiciones);
}

// ─── El grafo del sitio construido ───────────────────────────────────────────

/** Los anfitriones del sitio: el canónico y el de `SITIO` si se declaró otro. */
const ANFITRIONES = new Set([DOMINIO.toLowerCase(), new URL(SITIO).host.toLowerCase()]);

/**
 * La ruta normalizada de un `href` interno, o `undefined` si no lo es: un enlace de raíz
 * relativa (`/cita/x/`) o una dirección absoluta del host del sitio, sin `?…` ni `#…`. Un
 * ancla suelta, otro host, `mailto:` o una ruta relativa no son enlaces a otra superficie.
 */
export function rutaInterna(href: string | undefined): string | undefined {
  if (href === undefined) return undefined;
  const limpio = href.trim();
  let camino: string;
  if (limpio.startsWith('/') && !limpio.startsWith('//')) {
    camino = limpio;
  } else if (/^(?:https?:)?\/\//iu.test(limpio)) {
    let url: URL;
    try {
      url = new URL(limpio, SITIO);
    } catch {
      return undefined;
    }
    if (!ANFITRIONES.has(url.host.toLowerCase())) return undefined;
    camino = url.pathname;
  } else {
    return undefined;
  }
  const sinCola = camino.replace(/[?#].*$/su, '');
  return rutaNormalizada(sinCola === '' ? '/' : sinCola);
}

/**
 * Las rutas internas a las que enlaza una página, una vez cada una. Solo cuentan los `<a href>`;
 * el subárbol de un elemento con `data-jornada`, de un `<template>` o de un `<noscript>` se salta
 * entero, también anidado.
 */
export function enlacesInternos(html: string): string[] {
  const rutas = new Set<string>();
  recorrerElementos(html, (elemento, antepasados) => {
    if (elemento.etiqueta !== 'a') return;
    const fueraDelGrafo = [elemento, ...antepasados].some(
      (e) => e.atributos.has(MARCA_DE_JORNADA) || SIN_ENLACES_VISIBLES.has(e.etiqueta),
    );
    if (fueraDelGrafo) return;
    const ruta = rutaInterna(elemento.atributos.get('href'));
    if (ruta !== undefined) rutas.add(ruta);
  });
  return [...rutas];
}

/**
 * El grafo de enlaces de unas páginas construidas, por su ruta normalizada. Si el tokenizador
 * rechaza el marcado de una página, el error dice cuál: sin eso, el build se cortaría con un
 * fragmento de HTML y ninguna pista de dónde sale.
 */
export function grafoDeDist(paginas: Iterable<{ ruta: string; html: string }>): Map<string, string[]> {
  const grafo = new Map<string, string[]>();
  for (const { ruta, html } of paginas) {
    let enlaces: string[];
    try {
      enlaces = enlacesInternos(html);
    } catch (fallo) {
      throw new Error(
        `NFR-5: no se puede leer el grafo de enlaces de ${ruta}: ` +
          `${fallo instanceof Error ? fallo.message : String(fallo)}`,
      );
    }
    grafo.set(rutaNormalizada(ruta), enlaces);
  }
  return grafo;
}

/** Cuántas aristas tiene un grafo. */
export function aristasDe(grafo: ReadonlyMap<string, readonly string[]>): number {
  let total = 0;
  for (const destinos of grafo.values()) total += destinos.length;
  return total;
}

/** Las aristas del modelo que el grafo construido no tiene, como «origen → destino». */
export function aristasQueFaltan(
  modelo: ReadonlyMap<string, readonly string[]>,
  construido: ReadonlyMap<string, readonly string[]>,
): string[] {
  const faltan: string[] = [];
  for (const [origen, destinos] of modelo) {
    const tiene = new Set(construido.get(origen) ?? []);
    for (const destino of destinos) if (!tiene.has(destino)) faltan.push(`${origen} → ${destino}`);
  }
  return faltan;
}

// ─── El veredicto ────────────────────────────────────────────────────────────

/** Una superficie publicada fuera de alcance; si es una Cita, sus Temas que no se publican. */
export interface SuperficieFuera {
  ruta: string;
  /** Solo en una Cita: los Temas que declara y no se publican, con su recuento. */
  temas?: TemaBajoUmbral[];
  /** Solo en una Cita: cuántos Temas declara, publicados o no. */
  declarados?: number;
}

export interface VeredictoDeAlcance {
  /** Cuántas superficies de `rutasPublicadas` se midieron. */
  publicadas: number;
  /** Cuántas aristas tiene el modelo. */
  aristasDelModelo: number;
  fuera: SuperficieFuera[];
  aristasQueFaltan: string[];
}

/** Las Citas por su ruta normalizada, para poner nombre y Tema a una superficie fuera. */
function citasPorRuta(conjunto: ConjuntoPublicable): Map<string, Cita> {
  return new Map(conjunto.citas.map((c) => [rutaNormalizada(rutaDeCita(c.slug)), c]));
}

/** Una superficie fuera, con sus Temas bajo umbral si es una Cita. */
function superficieFuera(ruta: string, conjunto: ConjuntoPublicable, citas: Map<string, Cita>): SuperficieFuera {
  const cita = citas.get(ruta);
  return cita === undefined
    ? { ruta }
    : { ruta, temas: temasBajoUmbralDe(cita, conjunto.citas, conjunto.temas), declarados: new Set(cita.temas).size };
}

/**
 * El veredicto de NFR-5 sobre un sitio construido: qué superficies de `rutasPublicadas` quedan a
 * más de `MAX_SALTOS_DESDE_LA_PORTADA` saltos en el grafo construido, y qué aristas del modelo le
 * faltan. El tope no se pasa: es el de `superficiesInalcanzables`, que solo las pruebas cambian.
 */
export function veredictoDeAlcance(
  conjunto: ConjuntoPublicable,
  modelo: ReadonlyMap<string, readonly string[]>,
  construido: ReadonlyMap<string, readonly string[]>,
): VeredictoDeAlcance {
  const publicadas = [...new Set(rutasPublicadas(conjunto).map((r) => rutaNormalizada(r)))];
  const citas = citasPorRuta(conjunto);
  return {
    publicadas: publicadas.length,
    aristasDelModelo: aristasDe(modelo),
    fuera: superficiesInalcanzables(publicadas, construido).map((ruta) => superficieFuera(ruta, conjunto, citas)),
    aristasQueFaltan: aristasQueFaltan(modelo, construido),
  };
}

/** «1 Cita», «14 Citas». */
const enNumero = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;

/** Lo que se dice de los Temas de una Cita fuera de alcance: los que no se publican, o por qué ninguno. */
function lineaDeTemas(temas: readonly TemaBajoUmbral[], declarados: number): string {
  if (temas.length === 0) {
    return declarados === 0 ? 'no declara ningún Tema' : 'todos sus Temas se publican';
  }
  return temas
    .map(
      (t) =>
        `su Tema «${t.nombre}» (${t.slug}) tiene ${enNumero(t.citas, 'Cita', 'Citas')}, ` +
        `por debajo de MIN_CITAS_POR_TEMA (${MIN_CITAS_POR_TEMA})`,
    )
    .join('; ');
}

/** Una línea por superficie fuera de alcance. */
export function lineaDeFuera(fuera: SuperficieFuera): string {
  return fuera.temas === undefined
    ? `  · ${fuera.ruta}`
    : `  · ${fuera.ruta} — ${lineaDeTemas(fuera.temas, fuera.declarados ?? fuera.temas.length)}`;
}

/** La línea del registro cuando el build pasa la puerta. No depende de la jornada. */
export function informeDeAlcance(veredicto: VeredictoDeAlcance): string {
  return (
    `NFR-5: ${veredicto.publicadas} superficies publicadas, todas a ${MAX_SALTOS_DESDE_LA_PORTADA} ` +
    `saltos o menos de la portada; las ${veredicto.aristasDelModelo} aristas del modelo están en dist/.`
  );
}

/** Si el veredicto rompe la construcción. */
export function rompeElBuild(veredicto: VeredictoDeAlcance): boolean {
  return veredicto.fuera.length > 0 || veredicto.aristasQueFaltan.length > 0;
}

/** El detalle de un veredicto que rompe, para el registro. */
export function detalleDeAlcance(veredicto: VeredictoDeAlcance): string[] {
  return [
    ...(veredicto.fuera.length > 0
      ? [
          `Superficies publicadas a más de ${MAX_SALTOS_DESDE_LA_PORTADA} saltos de la portada ` +
            `(${veredicto.fuera.length}):`,
          ...veredicto.fuera.map(lineaDeFuera),
        ]
      : []),
    ...(veredicto.aristasQueFaltan.length > 0
      ? [
          `Aristas del modelo que faltan en dist/ (${veredicto.aristasQueFaltan.length}): una ` +
            'enumeración que pintaba la página ya no la pinta.',
          ...veredicto.aristasQueFaltan.map((a) => `  · ${a}`),
        ]
      : []),
  ];
}

/** El titular de la excepción que corta el build, con los dos números. */
export function titularDeAlcance(veredicto: VeredictoDeAlcance): string {
  return (
    `NFR-5: ${enNumero(veredicto.fuera.length, 'superficie publicada', 'superficies publicadas')} a más de ` +
    `${MAX_SALTOS_DESDE_LA_PORTADA} saltos de la portada y ` +
    `${enNumero(veredicto.aristasQueFaltan.length, 'arista', 'aristas')} del modelo que faltan en dist/. ` +
    'El detalle está en el registro.'
  );
}

// ─── Las órdenes que retiran ─────────────────────────────────────────────────

/** Una Cita que un cambio dejaría fuera de alcance, con sus Temas bajo umbral tras el cambio. */
export interface CitaFueraDeAlcance {
  slug: string;
  ruta: string;
  temas: TemaBajoUmbral[];
  /** Cuántos Temas declara tras el cambio, publicados o no. */
  declarados: number;
}

/** Las Citas del conjunto que el modelo deja a más del tope, por ruta normalizada. */
function citasFueraDelModelo(modelo: ModeloDelCorpus): string[] {
  const rutas = modelo.conjunto.citas.map((c) => rutaNormalizada(rutaDeCita(c.slug)));
  return superficiesInalcanzables(rutas, modelo.grafo);
}

/**
 * Las Citas que el cambio dejaría fuera de alcance, comparando el modelo del Corpus de hoy con
 * el que resultaría — Historia 26.8. **No escribe nada**: quien la llama decide, antes de tocar
 * un fichero, si se niega.
 *
 * Solo cuenta lo **nuevo**: una Cita que ya estaba fuera del modelo antes no es efecto de la
 * orden y no la bloquea. Y solo las Citas que siguen publicadas después: la que la orden retira
 * no queda fuera de alcance, sale. El modelo no lleva la lista de Autores de la portada
 * (`grafoDelModelo`), así que esto calcula con el sitio que quedará cuando la Épica 28 la quite.
 *
 * Un Corpus que no se deja leer devuelve `ok: false` con el motivo: de lo que no se puede leer no
 * se puede afirmar que no deje a nadie fuera.
 */
export async function fueraDeAlcanceTras(
  rutas: Rutas,
  cambio: (datos: DatosDelCorpus) => DatosDelCorpus,
): Promise<{ ok: true; fuera: CitaFueraDeAlcance[] } | { ok: false; motivos: string[] }> {
  let datos: DatosDelCorpus;
  let posiciones: PosicionesDeCitas;
  try {
    datos = await leerDatosDelCorpus(rutas);
    posiciones = posicionesDeCitas(datos.citas, await leerDocumentosDeFuente(rutas));
  } catch (fallo) {
    return {
      ok: false,
      motivos: [
        `No se puede leer el Corpus para comprobar que ninguna Cita queda fuera de alcance (NFR-5): ` +
          `${fallo instanceof Error ? fallo.message : String(fallo)}`,
        'No se ha escrito nada.',
      ],
    };
  }
  const antes = new Set(citasFueraDelModelo(modeloDeLosDatos(datos, posiciones)));
  const despues = modeloDeLosDatos(cambio(datos), posiciones);
  const citas = citasPorRuta(despues.conjunto);
  const fuera = citasFueraDelModelo(despues)
    .filter((ruta) => !antes.has(ruta))
    .map((ruta) => {
      const cita = citas.get(ruta)!;
      return {
        slug: cita.slug,
        ruta: rutaDeCita(cita.slug),
        temas: temasBajoUmbralDe(cita, despues.conjunto.citas, despues.conjunto.temas),
        declarados: new Set(cita.temas).size,
      };
    });
  return { ok: true, fuera };
}

/** Los motivos de una orden que se niega porque dejaría Citas fuera de alcance. */
export function motivosDeFueraDeAlcance(fuera: readonly CitaFueraDeAlcance[]): string[] {
  return [
    `La orden dejaría ${enNumero(fuera.length, 'Cita', 'Citas')} a más de ` +
      `${MAX_SALTOS_DESDE_LA_PORTADA} saltos de la portada (NFR-5):`,
    ...fuera.map((f) => `  · ${f.ruta} — ${lineaDeTemas(f.temas, f.declarados)}`),
    'No se ha escrito ni movido nada. Antes hay que darles otro camino: un Tema publicado, una ' +
      'Colección publicada o la página 1 de su Autor o de su Obra.',
  ];
}

/**
 * La comprobación de una orden que retira, lista para devolver: `undefined` si puede seguir, o
 * el `Resultado` de su negativa (`ok: false`, código 1 en las órdenes).
 */
export async function negativaPorAlcance(
  rutas: Rutas,
  cambio: (datos: DatosDelCorpus) => DatosDelCorpus,
): Promise<{ ok: false; motivos: string[] } | undefined> {
  const comprobacion = await fueraDeAlcanceTras(rutas, cambio);
  if (!comprobacion.ok) return comprobacion;
  if (comprobacion.fuera.length === 0) return undefined;
  return { ok: false, motivos: motivosDeFueraDeAlcance(comprobacion.fuera) };
}

// ─── Las órdenes que publican ────────────────────────────────────────────────

/** Una Cita que una pasada no publica porque no tendría ningún Tema publicado. */
export interface SinTemaPublicado<K> {
  clave: K;
  /** Los Temas que declara, con su recuento sobre lo publicado más la pasada entera. */
  temas: TemaBajoUmbral[];
}

/**
 * Qué Citas de una pasada pueden publicarse con algún Tema publicado — Historia 26.8, AD-11.
 *
 * Una Cita sin ningún Tema publicado solo se alcanza por la página 1 de su Autor o de su Obra, y
 * el día que caiga a la 2 queda fuera: `aprobar` y `darDeAltaLote` no la publican. El Tema se
 * cuenta con `temasPublicados` sobre las publicadas **más** las que la misma pasada publicaría,
 * así que aprobar la 15.ª de un Tema —o varias que juntas llegan— se admite. Pura: no lee ni
 * escribe.
 *
 * **Basta una pasada, y no es un punto fijo.** Una Cita se rechaza solo cuando **ninguno** de sus
 * Temas llega al umbral ni contando la pasada entera; quitarla solo baja el recuento de Temas
 * que ya no se publicaban, y `temasPublicados` depende solo del recuento, así que no puede dejar
 * sin página el Tema de otra. Por eso el recuento del parte —lo publicado más la pasada entera,
 * la propia incluida— nombra siempre los Temas de la rechazada: «tendría 14» quiere decir que ni
 * con todo lo que se pidió llega.
 */
export function temaPublicadoConLaPasada<K>(
  publicadas: readonly Pick<Cita, 'temas'>[],
  pasada: readonly { clave: K; temas: readonly string[] }[],
  temas: readonly Tema[],
): { admitidas: Set<K>; rechazadas: SinTemaPublicado<K>[] } {
  const conLaPasada = [...publicadas, ...pasada.map((c) => ({ temas: [...c.temas] }))];
  const conPagina = new Set(temasPublicados([...temas], conLaPasada as unknown as Cita[]).map((t) => t.slug));
  const admitidas = new Set(pasada.filter((c) => c.temas.some((t) => conPagina.has(t))).map((c) => c.clave));
  return {
    admitidas,
    rechazadas: pasada
      .filter((c) => !admitidas.has(c.clave))
      .map((c) => ({ clave: c.clave, temas: temasBajoUmbralDe({ temas: [...c.temas] }, conLaPasada, temas) })),
  };
}

/** Lo que se dice de una Cita que la pasada no publica por no tener Tema publicado. */
export function motivoSinTemaPublicado(temas: readonly TemaBajoUmbral[]): string {
  const cuales =
    temas.length === 0
      ? 'no declara ningún Tema'
      : temas
          .map((t) => `«${t.nombre}» (${t.slug}) tendría ${enNumero(t.citas, 'Cita', 'Citas')}`)
          .join('; ');
  return (
    `No tendría ningún Tema publicado (${cuales}; un Tema se publica desde ${MIN_CITAS_POR_TEMA}): ` +
    `sin Tema, una Cita queda a más de ${MAX_SALTOS_DESDE_LA_PORTADA} saltos de la portada en ` +
    'cuanto deja la página 1 de su Autor (NFR-5).'
  );
}
