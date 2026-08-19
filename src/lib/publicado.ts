/**
 * AD-11 — El conjunto publicable tiene un solo dueño.
 *
 * **Toda** superficie que enumere contenido —rutas, sitemap, índice de Pagefind, chips,
 * listados, descubrimiento— deriva de aquí. Ningún módulo aplica un umbral por su cuenta
 * ni filtra colecciones directamente.
 *
 * Lo que esto impide y AD-9 **no** cierra: que el umbral tenga nombre no dice quién lo
 * aplica. Quien genera las rutas de Tema y quien genera el sitemap pueden leer el mismo
 * `MIN_CITAS_POR_TEMA` y aun así discrepar sobre un Tema de 14 Citas — página sin
 * sitemap, o chip que enlaza a un 404.
 *
 * Sobre AD-5: el núcleo de este módulo son funciones puras sobre listas ya validadas, y
 * es lo que se prueba. `astro:content` entra solo como `import type`, que TypeScript
 * borra al compilar, así que el núcleo no depende de Astro en tiempo de ejecución. La
 * fachada del final es la única parte que consulta las colecciones.
 */

import type { CollectionEntry } from 'astro:content';
import {
  MAX_SALTOS_DESDE_LA_PORTADA,
  MIN_CITAS_POR_COLECCION,
  MIN_CITAS_POR_TEMA,
} from './umbrales.ts';
import type { Procedencia } from './admision.ts';

// ─── Formas planas, independientes de Astro ──────────────────────────────────

export interface Cita {
  slug: string;
  texto: string;
  autor: string;
  temas: string[];
  procedencia: Procedencia;
  aptaParaPortada: boolean;
}

export interface Autor {
  slug: string;
  nombre: string;
  semblanza: string;
  añoNacimiento?: number;
  añoFallecimiento: number;
}

export interface Tema {
  slug: string;
  nombre: string;
}

/**
 * Una Colección tal y como está **declarada** en su fichero — AD-18, Historia 12.2.
 *
 * `miembros` es lo que dice el fichero, sin resolver: puede traer slugs repetidos, slugs
 * de Citas retiradas a revisión y slugs con errata. Nada de eso es un fallo aquí; es el
 * dato de partida. Lo que se puede enseñar sale de `resolverColeccion`.
 */
export interface Coleccion {
  slug: string;
  nombre: string;
  criterio: string;
  miembros: string[];
}

export interface ConjuntoPublicable {
  citas: Cita[];
  autores: Autor[];
  temas: Tema[];
  /**
   * Las Colecciones **ya resueltas y ya filtradas por su umbral**.
   *
   * Deliberadamente **no** es la lista declarada. Antes lo era, y abría un segundo camino
   * al umbral: una página podía tomar `conjunto.colecciones`, llamar a `resolverColeccion`
   * y renderizar sin pasar jamás por `coleccionesPublicadas`. Nada lo impedía, y la propia
   * sonda de las pruebas lo hacía así, que es la forma que la Historia 12.3 habría copiado
   * por ser la que estaba escrita en el repositorio. El contrato dice que el umbral se
   * aplica al recuento resuelto **y a nada más**, y una invariante con puerta trasera no es
   * una invariante: aquí se cierra por construcción, quitando la entrada.
   */
  colecciones: ColeccionPublicada[];
}

// ─── Núcleo puro ─────────────────────────────────────────────────────────────

/**
 * Un Autor se publica si tiene al menos una Cita publicada — FR-4.
 *
 * No hay umbral que aplicar: la Cita existe o no existe. Un Autor sin Citas publicadas
 * no tiene página accesible ni indexable, y esta función es la que lo decide para todas
 * las superficies a la vez.
 */
export function autoresPublicados(autores: Autor[], citas: Cita[]): Autor[] {
  const conCitas = new Set(citas.map((c) => c.autor));
  return autores
    .filter((a) => conCitas.has(a.slug))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Un Tema se publica al alcanzar `MIN_CITAS_POR_TEMA` Citas publicadas — FR-6. */
export function temasPublicados(temas: Tema[], citas: Cita[]): Tema[] {
  const cuenta = new Map<string, number>();
  for (const cita of citas) {
    for (const tema of cita.temas) cuenta.set(tema, (cuenta.get(tema) ?? 0) + 1);
  }
  return temas
    .filter((t) => (cuenta.get(t.slug) ?? 0) >= MIN_CITAS_POR_TEMA)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Las Citas de un Autor, en orden estable para que el build sea reproducible. */
export function citasDeAutor(citas: Cita[], slugAutor: string): Cita[] {
  return citas.filter((c) => c.autor === slugAutor).sort((a, b) => a.slug.localeCompare(b.slug, 'es'));
}

export function citasDeTema(citas: Cita[], slugTema: string): Cita[] {
  return citas.filter((c) => c.temas.includes(slugTema)).sort((a, b) => a.slug.localeCompare(b.slug, 'es'));
}

/**
 * Los Temas de una Cita que además están publicados.
 *
 * Es la función que impide el chip que enlaza a un 404: una Cita puede pertenecer a un
 * Tema de cuatro Citas, y ese Tema no tiene página. El chip no debe renderizarse.
 */
export function temasDeLaCita(cita: Cita, publicados: Tema[]): Tema[] {
  const porSlug = new Map(publicados.map((t) => [t.slug, t]));
  return cita.temas.map((s) => porSlug.get(s)).filter((t): t is Tema => t !== undefined);
}

// ─── La Colección: pertenencia declarada y resolución blanda (Historia 12.2) ─

/**
 * Una Colección con su pertenencia ya resuelta contra el conjunto publicable.
 *
 * `citas` son los miembros que **existen y están publicados**, sin repetir. `declarados`
 * cuenta los slugs distintos que pide el fichero, y `sinResolver` los que pidió y no
 * obtuvo. La diferencia entre los dos números es el desajuste que la Design Note de la
 * historia manda hacer visible: es a la vez lo normal —una Cita retirada a revisión— y lo
 * anómalo —una errata en el slug—, y desde aquí no se distinguen. Por eso se cuenta en vez
 * de romper: romper convertiría retirar una Cita en romper el build, que es exactamente la
 * referencia dura que la historia existe para no tener.
 */
export interface ColeccionResuelta {
  slug: string;
  nombre: string;
  criterio: string;
  /** Los miembros resueltos, en el orden en que el fichero los declara. */
  citas: Cita[];
  /** Slugs distintos declarados en el fichero. `citas.length` es el recuento resuelto. */
  declarados: number;
  /** Los declarados que no son ninguna Cita publicada, en orden de declaración. */
  sinResolver: string[];
}

/**
 * La marca que distingue lo publicable de lo meramente resuelto.
 *
 * `declare const` de un `unique symbol` **sin exportar**: no existe en tiempo de ejecución
 * y ningún módulo de fuera puede nombrar la clave, así que ningún módulo de fuera puede
 * fabricar un `ColeccionPublicada`. La única forma de obtener uno es `coleccionesPublicadas`,
 * que es donde se aplica el umbral. No es decoración de tipos: es la puerta.
 */
declare const umbralAplicado: unique symbol;

/**
 * Una Colección resuelta **que además ha pasado su umbral**, y por tanto se publica.
 *
 * Tiene la misma forma que `ColeccionResuelta` y a propósito **no es el mismo tipo**: pasar
 * una resuelta-sin-filtrar donde se espera una publicada no compila. Es lo que impide que
 * la Página de Colección de la 12.3 —o cualquier superficie futura— enumere Colecciones
 * que no llegan al umbral por el camino corto, en vez de que sea una convención que hay
 * que recordar. La Historia 12.1 ya dejó escrito que una nota que hay que leer no es una
 * puerta.
 */
export interface ColeccionPublicada extends ColeccionResuelta {
  readonly [umbralAplicado]: true;
}

/**
 * Resuelve la pertenencia de una Colección — el corazón de la Épica 12.
 *
 * La pertenencia se declara en la Colección y se resuelve **intersectando** su lista con
 * el conjunto publicable, que es la dirección inversa a la del Tema. Un slug que no está
 * entre las Citas publicadas simplemente no forma parte: no es un fallo, no rompe nada y
 * no deja hueco. Retirar una Cita a `corpus/_revision/` la saca de todas sus Colecciones
 * a la vez sin que nadie edite nada.
 *
 * Puro, sin disco (AD-5), y **no reimplementa el conjunto publicable**: lo recibe. Las
 * Citas que llegan aquí son ya las publicadas, porque `corpus/_revision/` no es la base de
 * ninguna colección de Astro.
 *
 * Dos detalles que parecen menores y no lo son:
 *
 *   · **El orden es el declarado.** Una Colección es una lista curada a mano y el orden
 *     del fichero es parte de la curación, a diferencia de un Tema, cuyo listado se ordena
 *     por slug porque nadie lo eligió. Es igual de reproducible: sale del fichero.
 *   · **Un slug repetido cuenta una vez.** Si no, un copiar y pegar empujaría a una
 *     Colección por encima de su umbral con la misma Cita dos veces, y el visitante vería
 *     un listado con entradas duplicadas.
 *
 * **Esto resuelve, y no publica: aquí no se aplica ningún umbral.** Por eso devuelve
 * `ColeccionResuelta` y no `ColeccionPublicada`, y por eso nada que enumere contenido puede
 * consumir su salida. Sigue siendo pública porque es el núcleo que se prueba y porque de
 * ella salen el recuento de desajustes y el propio filtro, pero llamarla exige tener una
 * `Coleccion` declarada en la mano, y el conjunto publicable ya no reparte ninguna.
 */
export function resolverColeccion(coleccion: Coleccion, citas: Cita[]): ColeccionResuelta {
  const porSlug = new Map(citas.map((c) => [c.slug, c]));
  const declarados = [...new Set(coleccion.miembros)];

  return {
    slug: coleccion.slug,
    nombre: coleccion.nombre,
    criterio: coleccion.criterio,
    citas: declarados.map((s) => porSlug.get(s)).filter((c): c is Cita => c !== undefined),
    declarados: declarados.length,
    sinResolver: declarados.filter((s) => !porSlug.has(s)),
  };
}

/**
 * Las Colecciones que se publican — el **único** sitio donde se aplica su umbral (AD-11).
 *
 * El umbral se mide sobre el recuento **resuelto**, jamás sobre el declarado. Una
 * Colección con veinte miembros declarados y tres publicados tiene tres, y no se publica:
 * si mandara lo declarado, el sitio anunciaría veinte Citas y enseñaría tres. El recuento
 * que importa es el que el visitante ve.
 *
 * Que una Colección caiga por debajo del umbral no es un fallo: la despublica y ya. No
 * borra ni cambia de estado ninguna Cita, y desaparece a la vez de todo lo que derive de
 * aquí —página, sitemap, chips y descubrimiento—, porque todo eso deriva de aquí.
 */
export function coleccionesPublicadas(
  colecciones: Coleccion[],
  citas: Cita[],
): ColeccionPublicada[] {
  return (
    colecciones
      .map((c) => resolverColeccion(c, citas))
      .filter((c) => c.citas.length >= MIN_CITAS_POR_COLECCION)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      /*
       * La única conversión a `ColeccionPublicada` de todo el proyecto, y está pegada al
       * `filter` que la justifica: la marca no existe en tiempo de ejecución, así que esto
       * no añade ni una propiedad al objeto. Que la afirmación «ha pasado el umbral» se
       * escriba exactamente aquí es lo que la hace cierta en todos los demás sitios.
       */
      .map((c) => c as ColeccionPublicada)
  );
}

/**
 * El desajuste entre lo declarado y lo resuelto, Colección a Colección.
 *
 * Lo blando no debe tapar erratas. Un miembro retirado a revisión y un slug mal escrito se
 * comportan igual —los dos desaparecen en silencio— y esa es la contrapartida de que
 * retirar una Cita no rompa el build. La compensación es contarlo, igual que la deuda del
 * censo cerrado de la Historia 11.2: el número se anuncia en cada construcción y quien vea
 * uno que no esperaba va a mirar. Cazar la errata **en el momento de escribirla** es cosa
 * de la herramienta de curación de la Historia 12.4.
 *
 * Se cuentan las de **todas** las Colecciones y no solo las publicadas: una Colección que
 * no llega al umbral porque la mitad de sus slugs tienen errata es justo el caso que hay
 * que ver.
 *
 * **Divergencia con la matriz de la especificación, escrita a propósito.** La matriz pide
 * «Sin error» para el miembro retirado a revisión y reserva «Sin error, pero contado» para
 * el slug con errata. Eso no es implementable en esta capa: por AD-5 es pura y no lee
 * disco, así que no puede saber si un slug que no resuelve corresponde a un fichero que
 * está en `corpus/_revision/` o a uno que no existe en ninguna parte. Las dos formas son
 * indistinguibles desde aquí, y hay que elegir un trato para las dos.
 *
 * Se eligió contarlas: dejar de contar la retirada sería dejar de contar la errata, que es
 * justo lo que la Design Note prohíbe. La consecuencia, dicha sin adornos: retirar una Cita
 * **no es silencioso**. El aviso de desajuste se reimprime en cada construcción hasta que
 * alguien quite ese slug del fichero de la Colección. No rompe nada, no despublica nada y
 * no exige acción; es ruido con fecha de caducidad editorial. La alternativa —distinguir
 * las dos— exigiría leer `corpus/_revision/`, y eso pertenece a `tools/`, que es donde la
 * Historia 12.4 puede hacerlo bien.
 */
export function desajustesDeColecciones(
  colecciones: Coleccion[],
  citas: Cita[],
): { slug: string; declarados: number; resueltos: number; sinResolver: string[] }[] {
  return colecciones
    .map((c) => resolverColeccion(c, citas))
    .filter((c) => c.sinResolver.length > 0)
    .map((c) => ({
      slug: c.slug,
      declarados: c.declarados,
      resueltos: c.citas.length,
      sinResolver: c.sinResolver,
    }));
}

/**
 * Otras Citas del mismo Autor — FR-12, UX-DR17.
 *
 * Se deriva de Autor y de Tema, sin motor de recomendación: primero las del mismo Autor
 * que además comparten algún Tema con esta, y después el resto de las suyas. Ordenar así
 * no es «recomendar»; es preferir la vecindad más estrecha de las dos que ya existen.
 */
export function citasRelacionadas(citas: Cita[], cita: Cita, maximo: number): Cita[] {
  const suyas = citasDeAutor(citas, cita.autor).filter((c) => c.slug !== cita.slug);
  const temas = new Set(cita.temas);
  const comparteTema = (c: Cita) => c.temas.some((t) => temas.has(t));

  return [...suyas.filter(comparteTema), ...suyas.filter((c) => !comparteTema(c))].slice(0, maximo);
}

/**
 * Las rutas que el conjunto publicable dice que deberían existir.
 *
 * **Quién la consume, dicho sin adornos.** El docblock anterior decía «el sitemap y la
 * comprobación de enlaces la usan», y desde la Historia 12.1 eso es falso: el sitemap se
 * arma con las rutas que Astro construyó de verdad, filtradas por `anunciableEnElSitemap`,
 * y la comprobación de enlaces recorre el `dist/`. Los dos parten de lo **construido**, que
 * es lo correcto —un sitemap derivado de una intención no ve el día que la intención y la
 * construcción divergen—. Lo que esta función aporta hoy es el otro lado de esa
 * comparación: la enumeración **esperada**, escrita desde el conjunto publicable, que
 * `tests/unit/publicado.test.ts` fija caso a caso. Es una afirmación probada, no una pieza
 * del camino de ejecución, y conviene que se lea así.
 *
 * Enumera Colecciones desde la Historia 12.3, que es la que construye su página. La línea
 * de Colección no filtra ni cuenta nada, a diferencia de las de Autor y Tema:
 * `conjunto.colecciones` ya viene resuelto y filtrado por su umbral, y aplicarle aquí un
 * segundo criterio sería el segundo cómputo que AD-11 existe para impedir. Solo la primera
 * página de cada listado paginado aparece; las 2+ son `servicio` por la declaración de
 * `src/lib/superficies.ts`.
 */
export function rutasPublicadas(conjunto: ConjuntoPublicable): string[] {
  return [
    '/',
    ...conjunto.citas.map((c) => `/cita/${c.slug}`),
    ...autoresPublicados(conjunto.autores, conjunto.citas).map((a) => `/autor/${a.slug}`),
    ...temasPublicados(conjunto.temas, conjunto.citas).map((t) => `/tema/${t.slug}`),
    ...conjunto.colecciones.map((c) => `/coleccion/${c.slug}`),
  ];
}

/**
 * Las superficies publicadas a las que no llega ningún enlace interno — NFR-5.
 *
 * AD-11 extendido: publicable y alcanzable son **el mismo conjunto**. Este módulo ya era
 * el dueño de qué se publica, así que es también el sitio donde se comprueba que lo
 * publicado se alcanza; tenerlo en otro lado permitiría que las dos respuestas
 * divergieran, que es exactamente lo que AD-11 existe para impedir.
 *
 * Puro y sin disco (AD-5): recibe el grafo ya leído —qué enlaces salen de cada ruta— y
 * recorre a lo ancho desde la portada. Quien lo llama es quien sabe leer el sitio
 * construido o el navegador.
 */
export function superficiesInalcanzables(
  publicadas: readonly string[],
  enlaces: ReadonlyMap<string, readonly string[]>,
  opciones: { desde?: string; maximoDeSaltos?: number } = {},
): string[] {
  const desde = opciones.desde ?? '/';
  const maximoDeSaltos = opciones.maximoDeSaltos ?? MAX_SALTOS_DESDE_LA_PORTADA;

  const visitadas = new Set<string>();
  let frontera = [desde];

  for (let salto = 0; salto <= maximoDeSaltos && frontera.length > 0; salto += 1) {
    const siguiente: string[] = [];
    for (const ruta of frontera) {
      if (visitadas.has(ruta)) continue;
      visitadas.add(ruta);
      for (const enlace of enlaces.get(ruta) ?? []) {
        if (!visitadas.has(enlace)) siguiente.push(enlace);
      }
    }
    frontera = [...new Set(siguiente)];
  }

  return publicadas.filter((ruta) => !visitadas.has(ruta));
}

/**
 * Integridad referencial — se comprueba en el build y **rompe** si falla.
 *
 * Astro valida las referencias de forma perezosa: una Cita que apunta a un Autor
 * inexistente no rompe nada hasta que alguien la consulta, y para entonces el fallo
 * aparece como una página rota en producción en lugar de como un build en rojo. Como
 * este módulo es el dueño del conjunto publicable (AD-11), es también el sitio donde
 * tiene sentido exigir que lo enumerado exista.
 *
 * **Los miembros de una Colección no se comprueban aquí, y no es un olvido.** Este es el
 * sitio natural donde alguien añadiría «y que cada miembro declarado sea una Cita que
 * existe», y hacerlo tiraría abajo la historia entera: sería la referencia dura de la que
 * la lista de miembros huye, y mover una Cita a `corpus/_revision/` rompería el build. La
 * pertenencia es blanda por diseño; lo que se hace con un miembro que no resuelve es
 * contarlo (`desajustesDeColecciones`), no abortar.
 */
export function verificarIntegridad(conjunto: ConjuntoPublicable): void {
  const autores = new Set(conjunto.autores.map((a) => a.slug));
  const temas = new Set(conjunto.temas.map((t) => t.slug));
  const fallos: string[] = [];

  for (const cita of conjunto.citas) {
    if (!autores.has(cita.autor)) {
      fallos.push(`  · ${cita.slug} → el Autor «${cita.autor}» no existe en el corpus.`);
    }
    for (const tema of cita.temas) {
      if (!temas.has(tema)) {
        fallos.push(`  · ${cita.slug} → el Tema «${tema}» no existe en el corpus.`);
      }
    }
  }

  if (fallos.length > 0) {
    throw new Error(
      [
        'Integridad del corpus: hay Citas que apuntan a entidades inexistentes.',
        ...fallos,
        'Cree las entidades que faltan o corrija las referencias antes de construir.',
      ].join('\n'),
    );
  }
}

// ─── Fachada: la única parte que consulta las colecciones ────────────────────

type EntradaCita = CollectionEntry<'citas'>;
type EntradaAutor = CollectionEntry<'autores'>;
type EntradaTema = CollectionEntry<'temas'>;
type EntradaColeccion = CollectionEntry<'colecciones'>;

export function aplanarCita(entrada: EntradaCita): Cita {
  return {
    slug: entrada.data.slug,
    texto: entrada.data.texto,
    autor: entrada.data.autor.id,
    temas: entrada.data.temas.map((t) => t.id),
    procedencia: entrada.data.procedencia,
    aptaParaPortada: entrada.data.aptaParaPortada,
  };
}

export function aplanarAutor(entrada: EntradaAutor): Autor {
  return { slug: entrada.id, ...entrada.data };
}

export function aplanarTema(entrada: EntradaTema): Tema {
  return { slug: entrada.id, nombre: entrada.data.nombre };
}

/**
 * El slug de una Colección es el identificador que le da el cargador: su ruta dentro de
 * `corpus/colecciones/` sin extensión. En la práctica es el nombre del fichero, porque una
 * puerta del build —`integraciones/colecciones.ts`— rechaza los subdirectorios y exige que
 * dos ficheros no deriven el mismo. Sin esa puerta esto sería una media verdad: sería el
 * nombre del fichero solo en la raíz, y `sub/a.yml` llevaría una barra dentro del slug.
 */
export function aplanarColeccion(entrada: EntradaColeccion): Coleccion {
  return {
    slug: entrada.id,
    nombre: entrada.data.nombre,
    criterio: entrada.data.criterio,
    miembros: [...entrada.data.miembros],
  };
}

/** Cuántas Colecciones y cuántos slugs enumera el aviso antes de resumir el resto. */
const COLECCIONES_EN_EL_AVISO = 5;
const SLUGS_EN_EL_AVISO = 5;

/**
 * Unos pocos elementos y, si hay más, cuántos quedan.
 *
 * Un aviso que vuelca doscientas erratas en una línea es un aviso que se deja de leer, que
 * es lo contrario de para lo que existe: el total es lo que dice si pasa algo raro, y la
 * muestra sirve para saber por dónde empezar a mirar.
 */
function unosPocos(lista: readonly string[], cuantos: number): string {
  const primeros = lista.slice(0, cuantos);
  const resto = lista.length - primeros.length;
  const enumerados = `«${primeros.join('», «')}»`;
  return resto > 0 ? `${enumerados} y ${resto} más` : enumerados;
}

/**
 * El aviso de desajuste que la construcción imprime — Design Note de la Historia 12.2.
 *
 * Se compone aparte y en puro para que la prueba pueda leerlo sin construir, y sale por
 * consola desde la fachada, que es la que corre una vez por build. Es un **aviso** y no un
 * fallo: dice cuántos miembros declarados no resolvieron, sin decidir si es una Cita
 * retirada o una errata, porque desde aquí no se sabe.
 *
 * Devuelve `undefined` cuando no hay nada que decir. Una construcción sin desajustes no
 * imprime una línea de que no pasa nada: un aviso que sale siempre deja de leerse.
 */
export function avisoDeDesajustes(
  desajustes: ReturnType<typeof desajustesDeColecciones>,
): string | undefined {
  if (desajustes.length === 0) return undefined;

  const total = desajustes.reduce((suma, d) => suma + d.sinResolver.length, 0);
  const enumeradas = desajustes.slice(0, COLECCIONES_EN_EL_AVISO);
  const restantes = desajustes.length - enumeradas.length;

  return [
    `Colecciones: ${total} miembro${total === 1 ? '' : 's'} declarado${total === 1 ? '' : 's'} ` +
      `sin resolver en ${desajustes.length} Colecci${desajustes.length === 1 ? 'ón' : 'ones'}.`,
    ...enumeradas.map(
      (d) =>
        `  · ${d.slug}: ${d.resueltos} de ${d.declarados} — no resuelven ` +
        `${unosPocos(d.sinResolver, SLUGS_EN_EL_AVISO)}.`,
    ),
    ...(restantes > 0
      ? [
          `  · y ${restantes} Colecci${restantes === 1 ? 'ón' : 'ones'} más con miembros ` +
            'sin resolver.',
        ]
      : []),
    '  Una Cita retirada a corpus/_revision/ sale de sus Colecciones sin romper nada; un',
    '  slug con errata se comporta igual. Si no esperaba este número, revise los slugs.',
  ].join('\n');
}

let memoria: ConjuntoPublicable | undefined;

/**
 * El conjunto publicable, leído una sola vez por build.
 *
 * Se memoriza porque cada página lo pide y el build genera cientos: sin memoria, cada
 * ruta releería las cuatro colecciones enteras.
 */
export async function conjuntoPublicable(): Promise<ConjuntoPublicable> {
  if (memoria) return memoria;

  const { getCollection } = await import('astro:content');

  const citas = (await getCollection('citas')).map(aplanarCita);
  /*
   * Las Colecciones **declaradas** viven en esta variable local y no salen de aquí.
   *
   * Es el cierre de la puerta trasera del umbral: quien tenga una `Coleccion` declarada
   * puede resolverla sin filtrar, así que el conjunto publicable no reparte ninguna. Lo que
   * se guarda es ya lo publicable, y lo declarado se consume aquí mismo, para el recuento
   * de desajustes, que es el único que legítimamente necesita ver también las que no llegan
   * al umbral.
   */
  const declaradas = (await getCollection('colecciones')).map(aplanarColeccion);

  const conjunto: ConjuntoPublicable = {
    citas,
    autores: (await getCollection('autores')).map(aplanarAutor),
    temas: (await getCollection('temas')).map(aplanarTema),
    colecciones: coleccionesPublicadas(declaradas, citas),
  };

  verificarIntegridad(conjunto);

  // El desajuste de las Colecciones se anuncia, no rompe. Va aquí porque es el único punto
  // por el que pasa toda construcción una sola vez, y porque quien sabe qué está publicado
  // es este módulo.
  const aviso = avisoDeDesajustes(desajustesDeColecciones(declaradas, citas));
  if (aviso !== undefined) console.warn(aviso);

  memoria = conjunto;
  return conjunto;
}
