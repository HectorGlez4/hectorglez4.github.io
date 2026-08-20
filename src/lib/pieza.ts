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
 * La paleta, las familias y las métricas salen de `lienzo.ts`, compartidas con la Tarjeta.
 *
 * AD-5 — puro: devuelve una cadena SVG, no toca disco ni rasteriza. Quien rasteriza es
 * `tools/lib/piezas.ts`, con el mismo `sharp` que la Tarjeta.
 */

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

/** Los bloques y el alto del apilado, calculados **una vez** por composición. */
function apilado(citas: CitaEnPieza[]): { bloques: Bloque[]; alto: number } {
  const bloques = citas.map(bloqueDe);
  const suma = bloques.reduce((total, b) => total + b.alto, 0);
  return { bloques, alto: suma + SEPARACION_ENTRE_CITAS * Math.max(0, bloques.length - 1) };
}

/** El alto de los `cuantas` primeros bloques, con sus separaciones. */
function altoDe(bloques: Bloque[], cuantas: number): number {
  const tomados = bloques.slice(0, cuantas);
  const suma = tomados.reduce((total, b) => total + b.alto, 0);
  return suma + SEPARACION_ENTRE_CITAS * Math.max(0, tomados.length - 1);
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
): { cabe: true } | { cabe: false; maximo: number } {
  exigirMinimo(citas);
  const { bloques, alto } = apilado(citas);
  if (alto <= ALTO_UTIL) return { cabe: true };

  let maximo = 0;
  for (let cuantas = 1; cuantas <= bloques.length; cuantas += 1) {
    if (altoDe(bloques, cuantas) > ALTO_UTIL) break;
    maximo = cuantas;
  }
  return { cabe: false, maximo };
}

/**
 * El SVG de la Pieza: las Citas apiladas, cada una con su Autor y su filete.
 *
 * El apilado se centra verticalmente en el alto útil, de modo que una Pieza de dos Citas
 * cortas no queda pegada al borde superior con un desierto debajo. Todas las medidas se
 * derivan de la entrada, así que la misma selección compone byte a byte lo mismo.
 */
export function svgDePieza(citas: CitaEnPieza[]): string {
  exigirMinimo(citas);

  const { bloques, alto } = apilado(citas);
  if (alto > ALTO_UTIL) {
    let maximo = 0;
    for (let cuantas = 1; cuantas <= bloques.length; cuantas += 1) {
      if (altoDe(bloques, cuantas) > ALTO_UTIL) break;
      maximo = cuantas;
    }
    throw new Error(
      `Estas ${citas.length} Citas no caben apiladas en la Pieza: caben ${maximo}. ` +
        'No se compone nada — el texto de una Cita va entero o no va (NFR-12).',
    );
  }

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
