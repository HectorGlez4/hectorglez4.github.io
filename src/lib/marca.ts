/**
 * El nombre del producto, con un solo dueño — LC-5.
 *
 * Estaba repetido en ocho superficies y en la marca de agua del generador de imagen.
 * Repetido, un renombrado es un rastreo que siempre olvida un sitio: la Épica 6 existe
 * precisamente porque olvidar uno después de que haya una URL indexada cuesta una
 * migración. Aquí el nombre se cambia en una línea y cambia en todas partes.
 *
 * `public/islas/imagen.js` no puede importar de aquí —vive fuera del empaquetado, con
 * URL estable, para que el `import()` diferido de AD-6 funcione—. La marca le llega en
 * un atributo de datos, que es el mismo puente que AD-8 usa para el tamaño tipográfico.
 */

import { PALETA } from './lienzo.ts';

export const MARCA = 'Sabiduría de Bolsillo';

/**
 * Lo que el sitio dice ser, en una línea.
 *
 * Se nombra aquí y se usa en tres: la etiqueta `description` de la portada, el `description`
 * del `WebSite` de datos estructurados y la bajada de su Tarjeta Social. Escritas aparte, un
 * retoque a una dejaría a las otras diciendo algo distinto sobre el mismo sitio — y quien lo
 * notaría sería un buscador, o quien pegue el enlace.
 */
export const DESCRIPCION_DEL_SITIO =
  'Citas célebres en español, cada una con su autor y la obra de la que procede, cuando consta.';

/**
 * El título de pestaña de una superficie: su parte propia y la marca detrás.
 *
 * Sin parte devuelve la marca sola. La portada no lleva separador colgando y tampoco
 * necesita un caso especial en la página.
 */
export function tituloDe(parte?: string): string {
  return parte === undefined || parte === '' ? MARCA : `${parte} | ${MARCA}`;
}

/**
 * El icono del sitio — las comillas angulares con las que empieza cada Cita.
 *
 * Aquí y no en `public/` porque un fichero estático no se puede derivar: el vector y los
 * tres rásteres salen de esta única función, así que no hay forma de que se separen. Lo
 * que había en `public/favicon.svg` era el logotipo que deja `npm create astro` — el de
 * Astro, no el de nadie de aquí— y sobrevivió a todo el desarrollo porque un favicon no se
 * mira al revisar una página: se mira en la pestaña y en el resultado de búsqueda.
 *
 * **Es tipográfico a propósito.** DESIGN.md dice que la identidad no está en un logotipo
 * sino en el trato del texto, así que la marca no podía ser un dibujo; el `«` es el signo
 * que abre toda Cita del sitio y lo único que un lector ya asocia con esto. Se dibuja como
 * trazo y no como texto porque un `<text>` dependería de la fuente que tenga instalada
 * quien lo componga —el rasterizador del build no tiene ninguna—, y el icono saldría
 * distinto en cada sitio.
 *
 * Va **solo el signo de apertura**. El par `«»` es más fiel, y a 16 px —el tamaño de una
 * pestaña— sus cuatro galones caen a menos de cuatro píxeles cada uno y se emborronan
 * juntos. Dos galones a ese tamaño todavía se leen.
 *
 * El fondo es opaco y no transparente: el icono se compone sobre el blanco del buscador y
 * sobre el fondo de la pestaña, y solo llevándose el papel puesto es el mismo en los dos.
 */
export function svgDelIcono(): string {
  /*
   * Cada galón es poco profundo —7 de fondo contra 8 de media altura— y no un pico a 45°.
   * Las dos cosas que eso arregla son la misma: un galón cerrado se lee como el botón de
   * retroceder de un reproductor, y las comillas angulares de una tipografía de texto son
   * justamente más abiertas que eso.
   */
  const galon = (x: number) =>
    `<path d="M${x} 16 L${x - 7} 24 L${x} 32" fill="none" stroke="${PALETA.siena}" ` +
    `stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;

  /*
   * El aire entre los dos galones —seis unidades entre la punta del primero y el vértice
   * del segundo— es lo que decide si esto se lee a 16 px, que es el tamaño de una pestaña.
   * Con dos unidades, que es lo que salía de dibujarlos juntos, a 16 px queda menos de un
   * píxel entre medias y los dos galones se funden en una mancha.
   */
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">',
    `<rect width="48" height="48" rx="10" fill="${PALETA.papel}"/>`,
    galon(21),
    galon(34),
    '</svg>',
  ].join('');
}

/**
 * Los lados que se publican como PNG.
 *
 * 48 porque es lo que documenta Google para el icono del resultado de búsqueda —un cuadrado
 * múltiplo de 48—, y era justo lo que faltaba: el sitio publicaba un SVG y nada más. 96 para
 * las pantallas densas y 180 para iOS al añadir a la pantalla de inicio.
 *
 * No hay un 512. Lo hubo mientras se pensaba declarar una `Organization` con su `logo`, y se
 * retiró al releer `DatosDelSitio.astro`: allí está escrito que este sitio **no** emite
 * `Organization`, porque detrás no hay entidad jurídica que nombrar e inventarla sería la
 * procedencia inferida que FR-2 prohíbe. Sin ese consumidor, el 512 era un PNG que nadie
 * pide, y aquí solo se declara lo que consta y lo que sirve.
 */
export const TAMANOS_DEL_ICONO = [48, 96, 180] as const;

/**
 * Cuál de esos lados es el de iOS.
 *
 * Se nombra porque `apple-touch-icon` va en su propia etiqueta —iOS no mira los
 * `rel="icon"`— y el armazón necesita saber cuál de los tres apartar sin escribir el número.
 */
export const LADO_DE_IOS = 180;
