/**
 * Lo que comparten los lienzos que se rasterizan en el servidor — Historias 10.1 y 13.2.
 *
 * Aquí viven las decisiones que **no pueden tener dos versiones**: escapar el texto de una
 * Cita para que no rompa el SVG, repartirlo en líneas sin partir palabras, y la paleta y las
 * familias tipográficas con las que se compone. Vivían dentro de `tarjeta.ts` mientras solo
 * había un módulo que rasterizara. Con el segundo —`pieza.ts`— copiarlas habría dejado dos
 * algoritmos de salto de línea y dos paletas que empiezan idénticos y divergen a la primera
 * corrección, sin que nadie lo viera: retocar el filete en la Tarjeta dejaría la Pieza con el
 * anterior, y eso solo se nota mirando las dos imágenes juntas.
 *
 * `public/islas/imagen.js` tiene su propio reparto y su propia paleta, y **no** puede
 * importar de aquí: vive fuera del empaquetado con URL estable para el `import()` diferido de
 * AD-6, y además mide de verdad con el lienzo del navegador en vez de estimar. Esa diferencia
 * es deliberada y está documentada allí.
 *
 * AD-5 — Derivación pura: cadenas de entrada, cadenas de salida, nada de disco.
 */

/**
 * La paleta «papel» de DESIGN.md, que es la de la marca.
 *
 * `imagen.js` ofrece tres plantillas (FR-11) porque las compone el visitante y puede
 * elegirlas; lo que rasteriza el sistema —Tarjeta y Pieza— compone siempre en papel, que es
 * la voz de la marca cuando nadie elige.
 */
export const PALETA = {
  papel: '#faf7f0',
  tinta: '#1f1b16',
  apagada: '#5a5147',
  filete: '#ddd5c7',
  siena: '#8c4a2f',
} as const;

/**
 * Las familias de DESIGN.md con sus reservas.
 *
 * El rasterizador del build no tiene instaladas las de la Fonts API, así que compone con la
 * reserva —Georgia y la sans del sistema—, que es el mismo camino que sigue cualquier
 * navegador sin la fuente. Embeber los `.woff2` afectaría a las dos superficies a la vez y
 * sería una decisión propia, no un detalle de ninguna de ellas.
 *
 * La serif es solo para texto de Cita; la atribución y todo lo que es voz del sistema van en
 * la sans, que es la regla de tipografía del proyecto.
 */
export const SERIF = "Georgia, 'Source Serif 4', serif";
export const SANS = 'Inter, system-ui, sans-serif';

/**
 * Lo que se estima que ocupa un carácter, como fracción del cuerpo.
 *
 * Aquí no hay lienzo que mida como en el navegador. Es una aproximación deliberadamente
 * conservadora: pasarse por corto deja una línea de más, y pasarse por largo saca el texto de
 * la imagen. Se prefiere la línea de más. Vive con nombre y en un solo sitio porque lo
 * consultan el reparto **y** la comprobación de ancho, y con dos copias una diría que cabe
 * mientras la otra reparte para otro ancho.
 */
export const ANCHO_POR_CARACTER = 0.52;

/**
 * Y lo que ocupa en versalitas, que es más.
 *
 * Las mayúsculas de la sans son sensiblemente más anchas que la media de un texto corrido, y
 * la atribución lleva además un punto de espaciado entre letras. Medirla con el factor del
 * texto corrido la daría por más estrecha de lo que es, y un nombre de Autor largo se saldría
 * del lienzo justo en la comprobación que existe para impedirlo.
 */
export const ANCHO_POR_CARACTER_EN_VERSALITAS = 0.72;

/** Lo que se estima que ocupa un texto compuesto a un cuerpo dado, en píxeles. */
export function anchoAproximado(
  texto: string,
  cuerpo: number,
  factor: number = ANCHO_POR_CARACTER,
): number {
  return [...texto].length * cuerpo * factor;
}

/** `&`, `<` y `>` dentro de una Cita romperían el SVG. Se escapan, no se quitan. */
export function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Reparte el texto en líneas que quepan en el ancho dado.
 *
 * Nunca recorta ni abrevia: devuelve siempre el texto entero repartido (NFR-12). Una palabra
 * más larga que la línea ocupa su propia línea **y se sale del lienzo**, que es preferible a
 * partirla o a perderla, pero no es publicable: quien componga tiene que preguntar antes por
 * `palabrasQueDesbordan` y rechazar. Esta función no puede decidirlo porque su contrato es no
 * perder texto, y las dos únicas salidas serían mutilarlo o mentir.
 */
export function repartirEnLineas(
  texto: string,
  cuerpo: number,
  anchoUtil: number,
  factor: number = ANCHO_POR_CARACTER,
): string[] {
  const maximo = Math.max(1, Math.floor(anchoUtil / (cuerpo * factor)));

  const lineas: string[] = [];
  let actual = '';

  for (const palabra of texto.split(/\s+/)) {
    const tentativa = actual === '' ? palabra : `${actual} ${palabra}`;
    if ([...tentativa].length <= maximo || actual === '') actual = tentativa;
    else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual !== '') lineas.push(actual);
  return lineas;
}

/**
 * Las palabras que no caben en una línea ni ocupándola entera.
 *
 * Es la otra mitad de «no cabe»: el alto se puede calcular apilando, pero una sola palabra
 * indivisible más ancha que el lienzo se sale por el lado y el rasterizado la publica
 * **cortada**, que es exactamente la mutilación que NFR-12 prohíbe y que además no falla —
 * sale un PNG con una palabra a medias y nadie se entera hasta publicarlo. Quien compone
 * pregunta esto antes y rechaza nombrando la Cita.
 */
export function palabrasQueDesbordan(
  texto: string,
  cuerpo: number,
  anchoUtil: number,
  factor: number = ANCHO_POR_CARACTER,
): string[] {
  return texto
    .split(/\s+/)
    .filter((palabra) => palabra !== '' && anchoAproximado(palabra, cuerpo, factor) > anchoUtil);
}
