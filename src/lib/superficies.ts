/**
 * AD-11 extendido — Una superficie declara en **un solo sitio** si es publicable.
 *
 * Hasta la Historia 12.1 esa declaración vivía repartida en tres: `noIndexar` y
 * `fueraDeLaBusqueda` como banderas sueltas del armazón, más un filtro de expresiones
 * regulares en `astro.config.mjs`. Había que acordarse de los tres y se falló: `/404` y
 * `/buscar` se declaraban `noindex` y **aparecían en el índice interno de Pagefind**,
 * porque nadie puso la segunda bandera. El Kit se salvó solo porque allí sí se acordaron.
 * Una nota en AGENTS.md que hay que leer no es una puerta; esto sí lo es.
 *
 * De la declaración de abajo derivan las **cuatro** consecuencias, y las tres primeras
 * salen literalmente del mismo booleano, así que es imposible tener una sin las otras:
 *
 *   · la entrada en el sitemap,
 *   · la etiqueta `noindex` para el buscador de fuera,
 *   · la entrada en el índice de la búsqueda propia, el buscador de dentro,
 *   · la entrada en el barrido automatizado de accesibilidad y móvil.
 *
 * Vive en `src/lib/` y no en la configuración porque es derivación pura: no lee disco
 * (AD-5) y la consumen tanto el sitio —`Armazon.astro`— como `astro.config.mjs` y las
 * pruebas. Si viviera en la configuración, el armazón no podría leerla sin arrastrar
 * Astro al núcleo.
 */

/**
 * Qué es una superficie. No hay más valores, y añadir uno es una decisión visible:
 *
 *   · `producto` — parte de lo que el sitio publica. Se anuncia, se indexa fuera, se
 *     indexa dentro y se barre.
 *   · `servicio` — superficie del sitio que no es contenido: la búsqueda, la 404 y las
 *     páginas 2+ de un listado. Se visita y se barre, pero no se anuncia ni se indexa en
 *     ninguno de los dos buscadores.
 *   · `ajena` — vive en el dominio sin formar parte del producto, como el Kit Diario. Ni
 *     se anuncia, ni se indexa, ni se barre: no es una superficie que nadie lea.
 */
export type Caracter = 'producto' | 'servicio' | 'ajena';

export interface Superficie {
  /** Nombre legible; sale en los mensajes de las comprobaciones. */
  nombre: string;
  /** El fichero que la genera, relativo a `src/pages/`. Es lo que ata la declaración a la página. */
  pagina: string;
  /** Qué rutas construidas le pertenecen. Sin `g`: un `RegExp` global guarda estado entre llamadas. */
  reconoce: RegExp;
  /** Su carácter, del que salen las cuatro consecuencias. */
  caracter: Caracter;
  /**
   * Publicabilidad **condicional** — FR-5.
   *
   * Las rutas de esta superficie que casen con esto valen como `servicio` aunque la
   * superficie sea de producto: son las páginas 2+ de un listado, rastreables y no
   * indexables. Es la única condicionalidad que existe y vive aquí, para que no vuelva a
   * partirse en dos sitios.
   *
   * Se escribe **anclada a la ruta entera** y no como sufijo. «Acaba en dígitos» parece
   * bastar y no basta: el esquema de slugs de `src/lib/admision.ts` admite un slug
   * enteramente numérico, así que `/autor/1984` casaba con `/\d+$/` y se degradaba a
   * servicio —fuera del sitemap, con `noindex` y fuera del índice interno— sin que nadie
   * lo hubiera decidido.
   */
  noPublicableEn?: RegExp;
}

/**
 * El censo de superficies del sitio. Añadir una página a `src/pages/` obliga a añadirla
 * aquí: `tests/unit/publicable-y-alcanzable.test.ts` compara las dos listas, y
 * `Armazon.astro` rompe el build si compone una ruta que nadie ha declarado.
 */
export const SUPERFICIES: readonly Superficie[] = [
  {
    nombre: 'la portada',
    pagina: 'index.astro',
    reconoce: /^\/$/,
    caracter: 'producto',
  },
  {
    nombre: 'la Página de Cita',
    pagina: 'cita/[slug].astro',
    reconoce: /^\/cita\/[^/]+$/,
    caracter: 'producto',
  },
  {
    nombre: 'la Página de Autor',
    pagina: 'autor/[slug]/[...page].astro',
    reconoce: /^\/autor\/[^/]+(?:\/\d+)?$/,
    caracter: 'producto',
    // La forma completa, y no «acaba en dígitos»: el esquema de slugs de
    // `src/lib/admision.ts` admite un slug enteramente numérico, así que `/autor/1984` es
    // una Página de Autor y no la página 1984 de nada.
    noPublicableEn: /^\/autor\/[^/]+\/\d+$/,
  },
  {
    nombre: 'la Página de Tema',
    pagina: 'tema/[slug]/[...page].astro',
    reconoce: /^\/tema\/[^/]+(?:\/\d+)?$/,
    caracter: 'producto',
    // Anclada igual que la de Autor, y por el mismo motivo: `/tema/1984` es un Tema.
    noPublicableEn: /^\/tema\/[^/]+\/\d+$/,
  },
  {
    nombre: 'la Página de Colección',
    pagina: 'coleccion/[slug]/[...page].astro',
    reconoce: /^\/coleccion\/[^/]+(?:\/\d+)?$/,
    // Historia 12.3 — el estreno del dueño único. Esta línea es **todo** lo que hace falta
    // para que la Colección entre en el sitemap, se indexe en los dos buscadores y entre en
    // el barrido de accesibilidad y móvil. No hay una segunda lista que tocar; si alguien
    // se ve añadiéndola en otro sitio, la Historia 12.1 no habría servido de nada.
    caracter: 'producto',
    // Anclada a la ruta entera igual que Autor y Tema, y por el mismo motivo: el esquema de
    // slugs admite uno enteramente numérico, así que `/coleccion/1984` es una Colección y no
    // la página 1984 de nada.
    noPublicableEn: /^\/coleccion\/[^/]+\/\d+$/,
  },
  {
    nombre: 'la búsqueda',
    pagina: 'buscar.astro',
    reconoce: /^\/buscar$/,
    // Es una herramienta y no contenido: se visita, pero no se anuncia ni se indexa. Que
    // el buscador de dentro devolviera la propia página de buscar es el defecto que la
    // Historia 12.1 cierra.
    caracter: 'servicio',
  },
  {
    nombre: 'la página 404',
    pagina: '404.astro',
    reconoce: /^\/404$/,
    // Es una puerta de entrada de verdad —UX-DR20—, así que entra en el barrido; pero no
    // es una página que buscar ni anunciar.
    caracter: 'servicio',
  },
  {
    nombre: 'el Kit Diario',
    pagina: 'kit.astro',
    reconoce: /^\/kit$/,
    // FR-21 — material de publicación de Héctor. No es una superficie del sitio y no debe
    // llegar a serlo: anunciarla o indexarla la convertiría en una página del producto sin
    // que nadie lo hubiera decidido.
    caracter: 'ajena',
  },
  {
    nombre: 'el lote de jornadas',
    pagina: 'lote.astro',
    reconoce: /^\/lote$/,
    // Historia 13.1 — el Kit de las jornadas que vienen, y de la misma clase que el Kit:
    // material de publicación y no contenido. Esta línea es **todo** lo que hace falta para
    // que quede fuera del sitemap, fuera de los dos buscadores y fuera del barrido. Si
    // alguien se ve declarándolo en un segundo sitio, la Historia 12.1 no habría servido.
    caracter: 'ajena',
  },
];

/*
 * Los constructores de ruta — uno por familia, todos aquí.
 *
 * Viven junto a las declaraciones que las reconocen, unas líneas más arriba, y tenerlas
 * juntas es lo que impide que se separen. Empezó siendo solo el de Colección (Historia
 * 13.3), que ya entonces escribían a mano cinco sitios; las otras tres las escribían a
 * mano quince plantillas.
 *
 * **Y ninguna fallaría al divergir**, que es el motivo real de que esto exista. Astro no
 * comprueba que un `href` interno case con ningún `getStaticPaths`, así que renombrar
 * `src/pages/coleccion/` dejaría los cinco apuntando a un 404 con el build entero en
 * verde; el de la Pieza es además el que más tarda en verse, porque se publica en una
 * cuenta y el 404 lo encuentra un visitante semanas después.
 *
 * La **barra final** es la segunda razón, y la que los generalizó a las cuatro familias.
 * El hospedaje sirve `foo/index.html`: `/foo/` responde directa y `/foo` llega con un
 * 301. Mientras las rutas se escribieran a mano sin barra, el sitio se anunciaba entero
 * en la forma que no sirve directa —canónica, sitemap y cada enlace interno pagando un
 * salto—, y ni el build ni las pruebas decían nada porque la página, al final del
 * redirección, existía.
 *
 * Que sigan pegados a su declaración lo ata `tests/unit/barra-final.test.ts`, que además
 * niega el `href` compuesto a mano en cualquier plantilla, y
 * `tests/unit/coleccion-en-pieza.test.ts` para el caso de la Pieza.
 */
export function rutaDeCita(slug: string): string {
  return `/cita/${slug}/`;
}

/**
 * La ruta de un listado paginado — Autor, Tema y Colección comparten forma.
 *
 * La primera página **no** lleva número, y no es cosmética: `/tema/la-vida/1/` sería una
 * segunda URL para lo que ya publica `/tema/la-vida/`, con el mismo contenido y sin nadie
 * que lo declarase. Astro lo hace igual al paginar, y esto es lo que hace que los enlaces
 * escritos desde fuera de la paginación digan lo mismo que ella.
 *
 * `rutaDePagina` se exporta aparte porque `Paginacion.astro` no sabe de qué familia es el
 * listado que está numerando —solo tiene la base que le da Astro—, y aun así la numeración
 * tiene que salir de aquí: componía `${base}/${n}` y, con la base ya acabada en barra, eso
 * da `/tema/la-vida//2`.
 */
export function rutaDePagina(base: string, pagina: number): string {
  /*
   * La base se normaliza en vez de suponerse. Hoy siempre llega con barra —Astro la compone
   * así con `trailingSlash: 'always'`—, pero es el único valor de toda la familia que **no**
   * sale de estos constructores: `Paginacion.astro` lo toma de `pagina.url`. Sin esto, una
   * base sin barra componía `/tema/la-vida2/` en silencio, que no es un 404 llamativo sino
   * un enlace a una ruta que nadie declara.
   */
  const raiz = base.endsWith('/') ? base : `${base}/`;
  return pagina === 1 ? raiz : `${raiz}${pagina}/`;
}

function rutaDeListado(familia: string, slug: string, pagina: number): string {
  return rutaDePagina(`/${familia}/${slug}/`, pagina);
}

export function rutaDeAutor(slug: string, pagina = 1): string {
  return rutaDeListado('autor', slug, pagina);
}

export function rutaDeTema(slug: string, pagina = 1): string {
  return rutaDeListado('tema', slug, pagina);
}

export function rutaDeColeccion(slug: string, pagina = 1): string {
  return rutaDeListado('coleccion', slug, pagina);
}

/** Las cuatro consecuencias de declarar una superficie. */
export interface Consecuencias {
  /** Se anuncia en el sitemap. */
  enElSitemap: boolean;
  /** Lleva `<meta name="robots" content="noindex, follow">`. */
  noIndexar: boolean;
  /** Entra en el índice de la búsqueda propia — el `data-pagefind-body` del armazón. */
  enLaBusquedaPropia: boolean;
  /** Entra en el barrido automatizado de accesibilidad y móvil. */
  enElBarrido: boolean;
}

/**
 * La tabla que deriva las cuatro consecuencias del carácter.
 *
 * Las tres primeras salen del **mismo** booleano a propósito. Es lo que impide el defecto
 * que la historia cierra: no hay forma de escribir una superficie `noindex` para el
 * buscador de fuera y visible para el de dentro, porque no hay dos valores que ajustar.
 */
export function consecuenciasDelCaracter(caracter: Caracter): Consecuencias {
  const publicable = caracter === 'producto';
  return {
    enElSitemap: publicable,
    noIndexar: !publicable,
    enLaBusquedaPropia: publicable,
    enElBarrido: caracter !== 'ajena',
  };
}

/**
 * La ruta de una página, tal como la reconoce este módulo.
 *
 * Admite una ruta suelta —`/buscar/`— o una dirección completa, que es lo que recibe el
 * filtro del sitemap. La barra final se quita, y por eso las expresiones de `reconoce` se
 * escriben sin ella: una ruta con barra y otra sin ella son la misma superficie.
 *
 * Que se quite aquí es lo que dejó la migración a `trailingSlash: 'always'` en un cambio de
 * configuración y no en una reescritura del censo: las diez declaraciones de arriba siguen
 * valiendo palabra por palabra, porque nunca vieron la barra.
 *
 * Lo que llega mal dicho se rechaza aquí y con nombre. Una página que se olvida de pasar
 * `ruta` al armazón llegaba como `undefined` y reventaba con un
 * «Cannot read properties of undefined (reading 'replace')» a cuatro marcos de
 * profundidad: quien añade la superficie tenía que deducir por ingeniería inversa qué le
 * faltaba, que es justo la carga que la Historia 12.1 viene a quitar.
 */
export function rutaNormalizada(rutaOUrl: string): string {
  if (typeof rutaOUrl !== 'string' || rutaOUrl.trim() === '') {
    throw new Error(
      [
        'Una superficie sin `ruta` no se puede declarar.',
        '`Armazon.astro` compone con ella la canónica y de ella derivan la entrada en el',
        'sitemap, el `noindex`, la entrada en el índice de la búsqueda propia y la entrada',
        'en el barrido de accesibilidad.',
        'Pásale `ruta` al `<Armazon>` de la página que se está construyendo y declara esa',
        'ruta en src/lib/superficies.ts.',
      ].join(' '),
    );
  }

  const camino = /^[a-z][a-z0-9+.-]*:\/\//i.test(rutaOUrl)
    ? new URL(rutaOUrl).pathname
    : rutaOUrl;

  if (!camino.startsWith('/')) {
    throw new Error(
      [
        `La ruta «${rutaOUrl}» no empieza por «/».`,
        'Las superficies se declaran por su ruta absoluta, sin dominio —`/buscar`, no',
        '`buscar`—, porque es la forma en la que el sitemap, la canónica y el barrido',
        'hablan de ellas. Corrígela en la página y declárala en src/lib/superficies.ts.',
      ].join(' '),
    );
  }

  const sinBarraFinal = camino.replace(/\/+$/, '');
  return sinBarraFinal === '' ? '/' : sinBarraFinal;
}

/** La superficie a la que pertenece una ruta, o `undefined` si nadie la ha declarado. */
export function superficieDeclaradaDe(rutaOUrl: string): Superficie | undefined {
  const ruta = rutaNormalizada(rutaOUrl);
  return SUPERFICIES.find((superficie) => superficie.reconoce.test(ruta));
}

/**
 * El carácter de una ruta concreta, con la publicabilidad condicional ya aplicada.
 *
 * **Rompe** si la ruta no está declarada, y es deliberado: una superficie sin declaración
 * no puede pasar desapercibida. Como el armazón llama a esto para toda página, añadir una
 * a `src/pages/` sin declararla aquí detiene la construcción con el fichero que hay que
 * tocar escrito en el mensaje.
 */
export function caracterDe(rutaOUrl: string): Caracter {
  const ruta = rutaNormalizada(rutaOUrl);
  const superficie = superficieDeclaradaDe(ruta);

  if (superficie === undefined) {
    throw new Error(
      [
        `La superficie «${ruta}» no está declarada en src/lib/superficies.ts.`,
        'Una superficie declara en un solo sitio si es publicable, y de esa declaración',
        'salen su entrada en el sitemap, su `noindex`, su entrada en el índice de la',
        'búsqueda propia y su entrada en el barrido de accesibilidad.',
        'Declárala allí antes de publicarla.',
      ].join(' '),
    );
  }

  return superficie.noPublicableEn?.test(ruta) ? 'servicio' : superficie.caracter;
}

/** Las cuatro consecuencias de una ruta concreta. Es lo que consume `Armazon.astro`. */
export function consecuenciasDe(rutaOUrl: string): Consecuencias {
  return consecuenciasDelCaracter(caracterDe(rutaOUrl));
}

/**
 * Si el sitemap anuncia una dirección — lo que consume el filtro de `astro.config.mjs`.
 *
 * Lo que no se puede reconocer no se anuncia, en vez de romper: el filtro ve también las
 * páginas sonda que alguna prueba de build añade al proyecto temporal, y no son
 * superficies del sitio. El silencio nunca publica de más, y quien sí tiene que gritar por
 * una superficie sin declarar es el armazón, que la construye.
 *
 * Eso vale igual para una dirección **mal dicha** —vacía, no cadena o relativa—, ante la
 * que `rutaNormalizada` rompe con nombre. Romper es lo correcto donde llama el armazón,
 * que está construyendo una página y puede corregirla; aquí no hay nada que corregir y lo
 * único sensato que puede hacer un filtro con una dirección que no sabe leer es no
 * anunciarla. La promesa de este comentario se cumple entera, y no a medias.
 */
export function anunciableEnElSitemap(rutaOUrl: string): boolean {
  let ruta: string;
  try {
    ruta = rutaNormalizada(rutaOUrl);
  } catch {
    return false;
  }

  const superficie = superficieDeclaradaDe(ruta);
  if (superficie === undefined) return false;
  return consecuenciasDelCaracter(caracterDe(ruta)).enElSitemap;
}

/**
 * Las superficies del barrido automatizado de accesibilidad y móvil, una por familia.
 *
 * Recibe las rutas que el sitio construyó de verdad y devuelve una muestra de cada
 * superficie que entra en el barrido, en el orden en que están declaradas. Así una
 * superficie pública nueva entra en el barrido **sin añadirse a ninguna lista**: basta con
 * que exista su declaración y que el build genere alguna de sus rutas.
 *
 * Una por familia y no todas: barrer las cincuenta y tantas páginas construidas mediría
 * cincuenta veces la misma plantilla. La muestra es la primera en orden alfabético para
 * que dos ejecuciones con el mismo corpus barran exactamente lo mismo.
 */
export function superficiesDelBarrido(rutasConstruidas: readonly string[]): string[] {
  const ordenadas = [...rutasConstruidas].map(rutaNormalizada).sort((a, b) => a.localeCompare(b, 'es'));

  const muestras: string[] = [];
  for (const superficie of SUPERFICIES) {
    if (!consecuenciasDelCaracter(superficie.caracter).enElBarrido) continue;
    const muestra = ordenadas.find((ruta) => superficie.reconoce.test(ruta));
    if (muestra !== undefined) muestras.push(muestra);
  }
  return muestras;
}
