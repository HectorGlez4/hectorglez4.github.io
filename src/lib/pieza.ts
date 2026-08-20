/**
 * La Pieza de Canal que reúne varias Citas — Historia 13.2, FR-22.
 *
 * Es **material de salida**, no una superficie: no tiene URL, no se indexa y no compite por
 * la canónica de nada. Por eso reúne Citas **íntegras** a propósito, y por eso AD-19 —que
 * prohíbe a las agregaciones del sitio reproducir el texto entero— no la alcanza: esa regla
 * vincula a las páginas que un buscador puede encontrar, y aquí no hay ninguna.
 *
 * **Cuadrada de 1080 con margen 96, y eso no es inventar un formato.** Ni el PRD ni la
 * espina fijan proporción para las Piezas. Lo que sí está decidido es la proporción con la
 * que este producto publica en una cuenta propia: la de la Imagen de Cita
 * (`public/islas/imagen.js`, que declara las mismas dos medidas y no puede importarlas de
 * aquí, porque vive fuera del empaquetado con URL estable para el `import()` de AD-6).
 * Tomarla es la opción conservadora y reversible; elegir un vertical nuevo sería una decisión
 * de producto que esta historia no tiene por qué tomar. La 13.3 hereda este mismo lienzo en
 * vez de reabrir el debate.
 *
 * **Lo que no cabe no se encoge, y son dos cosas distintas.** El alto se calcula apilando
 * (`cabenEnPieza`); el ancho se comprueba palabra a palabra (`desbordanALoAncho`), porque el
 * reparto en líneas no parte palabras y una sola palabra indivisible más ancha que el lienzo
 * saldría **cortada** en el PNG sin que nada fallara. Las dos se preguntan antes de componer
 * nada. En ningún caso se ajusta el cuerpo: los tamaños son los de `tramos.ts` (AD-8) y
 * bajarlos sería devolverle a la plantilla la decisión que esa regla le quitó. Se rechaza —
 * ausencia antes que mutilación (NFR-12). Aquí no hay ninguna rama que recorte, abrevie ni
 * ponga puntos suspensivos, y no la hay porque componer una Cita a medias es publicarla mal
 * atribuida.
 *
 * **Con título, y solo uno.** Desde la Historia 13.3 la Pieza admite un título opcional: el
 * nombre de la Colección que anuncia. No es una Cita ni voz del sistema, así que su
 * tratamiento no se decide aquí — lo da `DESIGN.md` (la ruta, en las constantes del título),
 * que al Nombre de Colección le asigna `headline-md`. Lo que sí es de este módulo es que el
 * título **entre en la cuenta del apilado**: si su alto y su separación no se restaran del alto
 * útil, el nombre empujaría la última Cita contra la marca del pie, que es exactamente el
 * defecto que la banda de la marca arregló en la 13.2 y que solo se ve en la Pieza más llena.
 *
 * La paleta, las familias y las métricas salen de `lienzo.ts`, compartidas con la Tarjeta.
 *
 * AD-5 — puro: devuelve una cadena SVG, no toca disco ni rasteriza. Quien rasteriza es
 * `tools/lib/piezas.ts`, con el mismo `sharp` que la Tarjeta.
 */

import { procedenciaCompuesta } from './atribucion.ts';
import {
  ANCHO_POR_CARACTER,
  ANCHO_POR_CARACTER_EN_VERSALITAS,
  PALETA,
  SANS,
  SERIF,
  escapar,
  palabrasQueDesbordan,
  repartirEnLineas,
} from './lienzo.ts';
import { MARCA } from './marca.ts';
import type { Autor, Cita } from './publicado.ts';
import { tramoDe } from './tramos.ts';

/** Lienzo cuadrado: la proporción que aceptan todas las redes sin recortar. */
export const LADO = 1080;
export const MARGEN = 96;

/**
 * Citas mínimas de una Pieza.
 *
 * Una sola no es una Pieza: es una Imagen de Cita, que ya existe y que además compone el
 * visitante en su navegador (AD-7). Componerla por aquí sería un segundo camino para el mismo
 * artefacto, con otra plantilla y otro tamaño, y las dos versiones de la misma Cita
 * circularían sin que nadie las viera juntas.
 *
 * Vive en el módulo puro y no solo en la orden por lo mismo que la guarda de FR-10: la 13.3
 * es el consumidor futuro que podría llamar aquí sin pasar por la orden, y un mínimo que solo
 * aplica el interruptor no es un mínimo.
 */
export const MINIMO_DE_CITAS = 2;

/** Lo que queda dentro de los márgenes a lo ancho. */
const ANCHO_UTIL = LADO - MARGEN * 2;

/**
 * El aire que la marca del pie reserva bajo el apilado.
 *
 * La marca se compone fuera de la caja de márgenes, como en la Imagen de Cita y en la
 * Tarjeta. Sin reservarle esta banda, una Pieza llena hasta el borde deja la procedencia de
 * la última Cita a diez píxeles de la marca y las dos líneas se pisan — y eso solo se ve en
 * la Pieza más llena, que es justo la que nadie compone mientras prueba.
 */
const BANDA_DE_LA_MARCA = 48;

/** El alto en el que se apilan las Citas: los márgenes menos la banda de la marca. */
const ALTO_UTIL = LADO - MARGEN * 2 - BANDA_DE_LA_MARCA;

/* El ritmo vertical del apilado. Son medidas del lienzo, no tamaños de Cita: los de la
 * Cita salen de `tramos.ts` y ninguno de estos depende de ellos. */
const SEPARACION_ENTRE_CITAS = 40;
const ANTES_DEL_FILETE = 22;
const ALTO_DEL_FILETE = 2;
const ANCHO_DEL_FILETE = 96;
const DEL_FILETE_AL_AUTOR = 30;
const DEL_AUTOR_A_LA_PROCEDENCIA = 28;
const CUERPO_DEL_AUTOR = 24;
const CUERPO_DE_LA_PROCEDENCIA = 20;
const CUERPO_DE_LA_MARCA = 20;
const ALTURA_DE_LINEA_DEL_AUTOR = 30;
const ALTURA_DE_LINEA_DE_LA_PROCEDENCIA = 25;

/*
 * El título — Historia 13.3.
 *
 * Estos tres números **no se inventan aquí**, y es lo que los distingue del resto del ritmo
 * vertical. `_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md`
 * le da al «Nombre de Colección» el token `headline-md`: Source Serif, peso 600, 30px,
 * interlínea 1,2. Se compone con ese tratamiento tal cual, incluida su consecuencia visual
 * —queda por debajo del cuerpo de una Cita corta—, que allí está dicha como decisión y no como
 * descuido: la superficie «abre por el contenido», y el nombre lo anuncia sin taparlo.
 * Inventarle un cuerpo mayor porque «un título tiene que mandar» sería decidir presentación en
 * la plantilla, que es lo que ni AD-8 ni ese documento permiten.
 *
 * **Lo único de ese token que no se hereda es «una sola línea», y se dice por qué.** Allí la
 * restricción se cumple sola: el nombre vive en una medida de prosa de 68 caracteres a 30px y
 * cabe. Aquí el ancho útil son 888px, así que un nombre largo ocupa dos líneas quiera o no, y
 * las dos únicas formas de forzar la línea única serían recortarlo o encogerlo — las dos
 * prohibidas por NFR-12, y prohibidas con más razón sobre un nombre que sobre una Cita, porque
 * el nombre es el identificador de la Colección que se anuncia. Se reparte, como todo lo demás.
 *
 * La separación bajo el título sí es del lienzo, como las demás: es la que separa el anuncio
 * del apilado, y por eso vale más que la que separa dos Citas entre sí.
 */
const CUERPO_DEL_TITULO = 30;
const ALTURA_DE_LINEA_DEL_TITULO = Math.round(CUERPO_DEL_TITULO * 1.2);
const SEPARACION_BAJO_EL_TITULO = 48;

/**
 * Una Cita tal y como entra en la Pieza: su texto, su Autor y su procedencia si consta.
 *
 * El Autor es obligatorio y no opcional a propósito. La atribución visible es criterio de
 * aceptación de la épica entera, y un campo opcional deja abierta la única forma de
 * incumplirlo: componer una Pieza en la que una Cita aparece sin nombre.
 */
export interface CitaEnPieza {
  texto: string;
  autor: string;
  /** Obra y año, ya compuestos por `atribucion.ts`, cuando constan. */
  procedencia?: string;
}

/**
 * Una Cita del corpus, tal y como entra en el lienzo.
 *
 * Vive junto al tipo que construye, y desde la Historia 13.3 tiene que vivir en `src/lib/`:
 * lo llaman la orden que compone una selección de slugs (`tools/lib/piezas.ts`) y la
 * selección pura de una Colección (`coleccionEnPieza.ts`), y una capa de `src/` no puede
 * importar de `tools/`. Con una copia en cada sitio, la procedencia escrita dentro de la
 * imagen y la del pie divergirían a la primera corrección.
 *
 * La procedencia la compone `atribucion.ts` —el mismo dueño que la del texto que se publica—
 * para que la obra escrita **dentro** de la imagen y la del pie digan lo mismo hasta la coma.
 */
export function citaEnPieza(cita: Cita, autor: Autor): CitaEnPieza {
  return { texto: cita.texto, autor: autor.nombre, procedencia: procedenciaCompuesta(cita) };
}

/**
 * Lo que la Pieza lleva además de sus Citas — Historia 13.3.
 *
 * Un objeto de opciones y no un parámetro suelto para que la firma no cambie de forma cada
 * vez que el lienzo admita algo nuevo, y para que los dos que tienen que estar de acuerdo
 * —quien pregunta si cabe y quien compone— reciban **lo mismo**: preguntar la cabida sin
 * título y componer con él es la forma exacta de que la última Cita acabe contra la marca.
 */
export interface OpcionesDePieza {
  /** El nombre de la Colección que la Pieza anuncia, cuando anuncia una. */
  titulo?: string;
}

/** Lo que ocupa una Cita en el apilado, ya repartida en líneas. */
interface Bloque {
  cuerpo: number;
  lineas: string[];
  alturaLinea: number;
  altoTexto: number;
  autor: string[];
  procedencia: string[];
  alto: number;
}

/** El nombre del Autor tal y como se compone: en versalitas, como el resto de atribuciones. */
function versalitas(autor: string): string {
  return autor.toLocaleUpperCase('es');
}

function bloqueDe(cita: CitaEnPieza): Bloque {
  const tramo = tramoDe(cita.texto);
  if (!tramo.admiteImagen) {
    /*
     * No es una comprobación defensiva: sin ella el cuerpo sería 0 y la Cita se compondría
     * invisible, que es una mutilación silenciosa. Quien selecciona las Citas rechaza antes
     * y nombrando el slug (`tools/lib/piezas.ts`); esto es la red que impide que un
     * consumidor futuro se salte esa puerta sin enterarse.
     */
    throw new Error(
      'Una Cita que no admite Imagen por su longitud (FR-10) no entra en una Pieza: su ' +
        'texto no cabe sin bajar de un cuerpo legible, y recortarlo está prohibido.',
    );
  }

  const cuerpo = tramo.pixelesEnPieza;
  const lineas = repartirEnLineas(`«${cita.texto}»`, cuerpo, ANCHO_UTIL);
  const alturaLinea = Math.round(cuerpo * 1.3);
  const altoTexto = lineas.length * alturaLinea;

  /*
   * El Autor y la procedencia también se reparten. Iban en un solo `<text>` y con eso una
   * obra de título generoso —«Historia verdadera de la conquista de la Nueva España, 1632»—
   * se salía del lienzo sin que nada avisara: el alto cuadraba y el ancho no lo miraba nadie.
   */
  const autor = repartirEnLineas(
    versalitas(cita.autor),
    CUERPO_DEL_AUTOR,
    ANCHO_UTIL,
    ANCHO_POR_CARACTER_EN_VERSALITAS,
  );
  const procedencia = cita.procedencia
    ? repartirEnLineas(cita.procedencia, CUERPO_DE_LA_PROCEDENCIA, ANCHO_UTIL)
    : [];

  const altoAtribucion =
    ANTES_DEL_FILETE +
    ALTO_DEL_FILETE +
    DEL_FILETE_AL_AUTOR +
    (autor.length - 1) * ALTURA_DE_LINEA_DEL_AUTOR +
    (procedencia.length > 0
      ? DEL_AUTOR_A_LA_PROCEDENCIA +
        (procedencia.length - 1) * ALTURA_DE_LINEA_DE_LA_PROCEDENCIA
      : 0);

  return { cuerpo, lineas, alturaLinea, altoTexto, autor, procedencia, alto: altoTexto + altoAtribucion };
}

/** Una Pieza de menos de dos Citas no es una Pieza, y preguntar por ella no significa nada. */
function exigirMinimo(citas: CitaEnPieza[]): void {
  if (citas.length < MINIMO_DE_CITAS) {
    throw new Error(
      `Una Pieza reúne al menos ${MINIMO_DE_CITAS} Citas, y se han dado ${citas.length}. ` +
        'Para una Cita sola ya está la Imagen de Cita, que se compone desde su propia página.',
    );
  }
}

/** El título ya repartido en líneas, y lo que ocupa con su separación. */
interface BloqueDeTitulo {
  lineas: string[];
  alto: number;
}

function bloqueDelTitulo(titulo: string | undefined): BloqueDeTitulo {
  if (titulo === undefined) return { lineas: [], alto: 0 };

  /*
   * Se **normaliza antes de medir y de componer**, no solo para juzgar si está en blanco. Un
   * nombre entrecomillado en el YAML con un espacio de sobra —«  Frases cortas  »— es la misma
   * Colección, y sin este recorte daba un PNG distinto: `repartirEnLineas` parte por espacios,
   * así que el sobrante entra en la primera línea y desplaza el reparto entero. La Pieza promete
   * componer byte a byte lo mismo para la misma Colección, y esa promesa se rompe aquí o no se
   * rompe en ningún sitio.
   */
  const nombre = titulo.trim();

  if (nombre === '') {
    /*
     * La misma clase de red que la de FR-10 en `bloqueDe`: sin ella se compondría un `<text>`
     * vacío y la Pieza reservaría el hueco de un anuncio que no anuncia nada. Quien compone
     * rechaza antes y nombrando la Colección (`tools/lib/piezas.ts`); esto impide que un
     * consumidor futuro se salte esa puerta sin enterarse.
     */
    throw new Error(
      'Un título en blanco no es un título: la Pieza de una Colección lleva su nombre, y sin ' +
        'nombre no hay nada que anunciar.',
    );
  }

  /*
   * Y la red del ancho, aquí y no solo en quien compone. Vive en `bloqueDelTitulo` —y no en
   * una comprobación de `svgDePieza`— para que **`cabenEnPieza` tampoco pueda decir que sí**:
   * mientras estuvo fuera, preguntar la cabida de una selección con un título imposible
   * respondía `cabe: true` y la excepción llegaba después, al componer, a quien se había fiado
   * de la respuesta. Un título que se sale por el lado no es «no cabe»: es una Pieza que no
   * existe, igual que una Cita que no admite Imagen.
   */
  const desbordadas = palabrasDelTituloQueDesbordan(nombre);
  if (desbordadas.length > 0) {
    throw new Error(
      'El título no cabe a lo ancho del lienzo y saldría cortado: ' +
        `${desbordadas.map((p) => `«${p}»`).join(', ')}. ` +
        'No se compone nada — el texto va entero o no va (NFR-12).',
    );
  }

  const lineas = repartirEnLineas(nombre, CUERPO_DEL_TITULO, ANCHO_UTIL);
  return { lineas, alto: lineas.length * ALTURA_DE_LINEA_DEL_TITULO + SEPARACION_BAJO_EL_TITULO };
}

/** Los bloques y el alto del apilado, calculados **una vez** por composición. */
function apilado(
  citas: CitaEnPieza[],
  opciones: OpcionesDePieza,
): { titulo: BloqueDeTitulo; bloques: Bloque[]; alto: number } {
  const titulo = bloqueDelTitulo(opciones.titulo);
  const bloques = citas.map(bloqueDe);
  const suma = bloques.reduce((total, b) => total + b.alto, 0);
  return {
    titulo,
    bloques,
    alto: titulo.alto + suma + SEPARACION_ENTRE_CITAS * Math.max(0, bloques.length - 1),
  };
}

/**
 * El alto de los `cuantas` primeros bloques, con sus separaciones y con el título.
 *
 * El título entra siempre, y no es un detalle: cuando la respuesta es «caben tres», esas tres
 * van a componerse **con** el nombre de la Colección encima. Descontarlo solo del total daría
 * un máximo que no cabe.
 */
function altoDe(bloques: Bloque[], cuantas: number, titulo: BloqueDeTitulo): number {
  const tomados = bloques.slice(0, cuantas);
  const suma = tomados.reduce((total, b) => total + b.alto, 0);
  return titulo.alto + suma + SEPARACION_ENTRE_CITAS * Math.max(0, tomados.length - 1);
}

/** Cuántos de los primeros bloques caben en el alto útil, con el título puesto. */
function cuantosCaben(bloques: Bloque[], titulo: BloqueDeTitulo): number {
  let maximo = 0;
  for (let cuantas = 1; cuantas <= bloques.length; cuantas += 1) {
    if (altoDe(bloques, cuantas, titulo) > ALTO_UTIL) break;
    maximo = cuantas;
  }
  return maximo;
}

/** Una Cita que se sale del lienzo por el lado, con las palabras que no caben. */
export interface Desbordada {
  /** Su posición en la selección, para que quien compone pueda nombrarla. */
  indice: number;
  palabras: string[];
}

/**
 * Las Citas que se salen **a lo ancho**, y por qué.
 *
 * `repartirEnLineas` no parte palabras nunca —su contrato es no perder texto—, así que una
 * palabra indivisible más ancha que el lienzo ocupa su línea y se sale por el lado. El
 * rasterizado no falla: produce un PNG con la palabra cortada, que es la mutilación de NFR-12
 * ocurriendo en silencio. Se mira el texto, el Autor y la procedencia, porque las tres se
 * componen y las tres se pueden salir.
 */
export function desbordanALoAncho(citas: CitaEnPieza[]): Desbordada[] {
  const desbordadas: Desbordada[] = [];

  citas.forEach((cita, indice) => {
    const tramo = tramoDe(cita.texto);
    if (!tramo.admiteImagen) return; // Ya la rechaza `bloqueDe` por otra regla anterior.

    const palabras = [
      ...palabrasQueDesbordan(`«${cita.texto}»`, tramo.pixelesEnPieza, ANCHO_UTIL),
      ...palabrasQueDesbordan(
        versalitas(cita.autor),
        CUERPO_DEL_AUTOR,
        ANCHO_UTIL,
        ANCHO_POR_CARACTER_EN_VERSALITAS,
      ),
      ...palabrasQueDesbordan(
        cita.procedencia ?? '',
        CUERPO_DE_LA_PROCEDENCIA,
        ANCHO_UTIL,
        ANCHO_POR_CARACTER,
      ),
    ];

    if (palabras.length > 0) desbordadas.push({ indice, palabras });
  });

  return desbordadas;
}

/**
 * Las palabras del título que no caben a lo ancho — Historia 13.3.
 *
 * Aparte de `desbordanALoAncho` porque la respuesta se usa distinto: una Cita que se sale se
 * queda fuera y la Pieza se compone con las demás, pero un título que se sale no se puede
 * excluir —es lo que la Pieza anuncia—, así que no hay Pieza. Se pregunta antes, por lo mismo
 * de siempre: el rasterizado no falla, publica la palabra cortada.
 */
export function palabrasDelTituloQueDesbordan(titulo: string): string[] {
  return palabrasQueDesbordan(titulo, CUERPO_DEL_TITULO, ANCHO_UTIL);
}

/**
 * Si las Citas dadas caben apiladas en la Pieza, y cuántas caben si no.
 *
 * Se pregunta **antes** de componer nada, y esa es la mitad importante: cuando la respuesta
 * es que no, no hay pieza a medio componer que alguien pudiera decidir publicar igual. El
 * `maximo` cuenta desde el principio de la lista —cuántas de las que pidió entran, en el
 * orden en que las pidió— porque es la información con la que quien seleccionó puede
 * corregir la selección sin volver a adivinar.
 *
 * Solo responde por el alto. Lo que se sale por el lado lo dice `desbordanALoAncho`, y son
 * dos preguntas distintas: la primera se arregla quitando Citas y la segunda no.
 */
export function cabenEnPieza(
  citas: CitaEnPieza[],
  opciones: OpcionesDePieza = {},
): { cabe: true } | { cabe: false; maximo: number } {
  exigirMinimo(citas);
  const { titulo, bloques, alto } = apilado(citas, opciones);
  if (alto <= ALTO_UTIL) return { cabe: true };

  return { cabe: false, maximo: cuantosCaben(bloques, titulo) };
}

/**
 * El SVG de la Pieza: las Citas apiladas, cada una con su Autor y su filete.
 *
 * El apilado se centra verticalmente en el alto útil, de modo que una Pieza de dos Citas
 * cortas no queda pegada al borde superior con un desierto debajo. Todas las medidas se
 * derivan de la entrada, así que la misma selección compone byte a byte lo mismo.
 */
export function svgDePieza(citas: CitaEnPieza[], opciones: OpcionesDePieza = {}): string {
  exigirMinimo(citas);

  const { titulo, bloques, alto } = apilado(citas, opciones);
  if (alto > ALTO_UTIL) {
    throw new Error(
      `Estas ${citas.length} Citas no caben apiladas en la Pieza: caben ` +
        `${cuantosCaben(bloques, titulo)}. ` +
        'No se compone nada — el texto de una Cita va entero o no va (NFR-12).',
    );
  }

  // El ancho del título ya lo miró `apilado`, que se niega a medir uno que no cabe. Aquí queda
  // lo de las Citas, que sí se pregunta por separado del alto (ver `desbordanALoAncho`).
  const desbordadas = desbordanALoAncho(citas);
  if (desbordadas.length > 0) {
    throw new Error(
      'Hay texto que no cabe a lo ancho del lienzo y saldría cortado: ' +
        `${desbordadas.map((d) => `«${d.palabras.join(' ')}»`).join(', ')}. ` +
        'No se compone nada — el texto va entero o no va (NFR-12).',
    );
  }

  let cursor = MARGEN + Math.round(Math.max(0, (ALTO_UTIL - alto) / 2));

  const partes: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}" viewBox="0 0 ${LADO} ${LADO}">`,
    `<rect width="${LADO}" height="${LADO}" fill="${PALETA.papel}"/>`,
    `<rect x="0" y="0" width="${LADO}" height="8" fill="${PALETA.siena}"/>`,
  ];

  /*
   * El título, en la serif y con el peso de `headline-md`: es el nombre de la Colección, no voz
   * del sistema ni texto citado. Va **encabezando el apilado**, no pegado al borde superior del
   * lienzo: el cursor arranca en el desplazamiento de centrado que se acaba de calcular, así
   * que con dos Citas cortas el nombre baja con ellas hacia el medio en vez de quedarse solo
   * arriba con un desierto debajo. Encabeza y no cierra porque el pie ya lo ocupa la marca.
   */
  const primeraDelTitulo = cursor + CUERPO_DEL_TITULO;
  for (const [i, linea] of titulo.lineas.entries()) {
    partes.push(
      `<text x="${MARGEN}" y="${primeraDelTitulo + i * ALTURA_DE_LINEA_DEL_TITULO}" ` +
        `font-family="${SERIF}" font-size="${CUERPO_DEL_TITULO}" font-weight="600" ` +
        `fill="${PALETA.tinta}">${escapar(linea)}</text>`,
    );
  }
  cursor += titulo.alto;

  for (const bloque of bloques) {
    const primeraLinea = cursor + bloque.cuerpo;

    for (const [i, linea] of bloque.lineas.entries()) {
      partes.push(
        `<text x="${MARGEN}" y="${primeraLinea + i * bloque.alturaLinea}" ` +
          `font-family="${SERIF}" font-size="${bloque.cuerpo}" ` +
          `fill="${PALETA.tinta}">${escapar(linea)}</text>`,
      );
    }

    const filete = cursor + bloque.altoTexto + ANTES_DEL_FILETE;
    partes.push(
      `<rect x="${MARGEN}" y="${filete}" width="${ANCHO_DEL_FILETE}" ` +
        `height="${ALTO_DEL_FILETE}" fill="${PALETA.filete}"/>`,
    );

    /*
     * El Autor, en versalitas y con la sans: es voz del sistema atribuyendo, no texto
     * citado. Va **por Cita** y no una vez al pie, porque una Pieza reúne Citas de Autores
     * distintos y un pie común atribuiría todas a uno.
     */
    const autor = filete + DEL_FILETE_AL_AUTOR;
    for (const [i, linea] of bloque.autor.entries()) {
      partes.push(
        `<text x="${MARGEN}" y="${autor + i * ALTURA_DE_LINEA_DEL_AUTOR}" ` +
          `font-family="${SANS}" font-size="${CUERPO_DEL_AUTOR}" font-weight="600" ` +
          `fill="${PALETA.tinta}" letter-spacing="1">${escapar(linea)}</text>`,
      );
    }

    const procedencia =
      autor + (bloque.autor.length - 1) * ALTURA_DE_LINEA_DEL_AUTOR + DEL_AUTOR_A_LA_PROCEDENCIA;
    for (const [i, linea] of bloque.procedencia.entries()) {
      partes.push(
        `<text x="${MARGEN}" y="${procedencia + i * ALTURA_DE_LINEA_DE_LA_PROCEDENCIA}" ` +
          `font-family="${SANS}" font-size="${CUERPO_DE_LA_PROCEDENCIA}" ` +
          `fill="${PALETA.apagada}">${escapar(linea)}</text>`,
      );
    }

    cursor += bloque.alto + SEPARACION_ENTRE_CITAS;
  }

  partes.push(
    `<text x="${MARGEN}" y="${LADO - MARGEN + 8}" font-family="${SANS}" ` +
      `font-size="${CUERPO_DE_LA_MARCA}" font-weight="600" fill="${PALETA.apagada}" ` +
      `letter-spacing="1.5">${escapar(versalitas(MARCA))}</text>`,
    '</svg>',
  );

  return partes.join('');
}
