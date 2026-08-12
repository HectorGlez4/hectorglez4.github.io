/**
 * La Tarjeta Social de una Cita — FR-19.
 *
 * Es lo que ve quien recibe el enlace por WhatsApp antes de decidir si lo abre. No es la
 * Imagen de Cita, aunque se le parezca: la Imagen la compone el visitante en el navegador
 * para publicarla (AD-7), y la Tarjeta la compone el build porque una previsualización
 * necesita una URL que exista antes de que nadie la pida.
 *
 * Existe para **toda** Cita publicada, incluidas las que pasan del corte de FR-10. Ahí
 * está la decisión que más importa de esta historia: por encima del corte la Tarjeta
 * lleva Autor y marca, y **no** un fragmento del texto. Recortar la Cita para que quepa
 * es exactamente lo que FR-2 y NFR-12 prohíben, y una frase cortada por la mitad en una
 * previsualización de WhatsApp es una cita mal atribuida circulando.
 *
 * AD-8 — el tamaño sale de `tramos.ts`, el mismo módulo que compone la página y la
 * Imagen. AD-5 — puro: devuelve una cadena SVG, no toca disco ni rasteriza.
 */

import { MARCA } from './marca.ts';
import { tramoDe } from './tramos.ts';

/** 1200×630 es la proporción que piden los validadores de previsualización. */
export const ANCHO = 1200;
export const ALTO = 630;
const MARGEN = 80;

/** Los colores de la plantilla «papel» de DESIGN.md, que es la de la marca. */
const PAPEL = '#faf7f0';
const TINTA = '#1f1b16';
const APAGADA = '#5a5147';
const FILETE = '#ddd5c7';

export interface DatosDeTarjeta {
  texto: string;
  autor: string;
  /** Obra y año, ya compuestos, cuando constan. */
  procedencia?: string;
}

/** `&`, `<` y `>` dentro de una Cita romperían el SVG. Se escapan, no se quitan. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Reparte el texto en líneas que quepan en el ancho dado.
 *
 * El ancho de cada carácter se estima con un factor sobre el cuerpo, porque aquí no hay
 * lienzo que mida como en el navegador. Es una aproximación deliberadamente conservadora:
 * pasarse por corto deja una línea de más, y pasarse por largo saca el texto de la
 * tarjeta. Se prefiere la línea de más.
 */
export function repartirEnLineas(texto: string, cuerpo: number, anchoUtil: number): string[] {
  const anchoPorCaracter = cuerpo * 0.52;
  const maximo = Math.max(1, Math.floor(anchoUtil / anchoPorCaracter));

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
 * El SVG de la Tarjeta.
 *
 * Las familias son las de DESIGN.md con sus reservas. El rasterizador del build no tiene
 * instaladas las de la Fonts API, así que compone con la reserva —Georgia y la sans del
 * sistema—, que es el mismo camino que sigue cualquier navegador sin la fuente. La
 * Tarjeta se lee a tamaño de previsualización y la diferencia no es perceptible ahí.
 */
export function svgDeTarjeta(datos: DatosDeTarjeta): string {
  const tramo = tramoDe(datos.texto);
  const anchoUtil = ANCHO - MARGEN * 2;

  const marca =
    `<text x="${MARGEN}" y="${ALTO - MARGEN + 8}" font-family="Inter, system-ui, sans-serif" ` +
    `font-size="24" font-weight="600" fill="${APAGADA}" letter-spacing="1.5">` +
    `${escapar(MARCA.toLocaleUpperCase('es'))}</text>`;

  const fondo =
    `<rect width="${ANCHO}" height="${ALTO}" fill="${PAPEL}"/>` +
    `<rect x="0" y="0" width="${ANCHO}" height="8" fill="#8c4a2f"/>`;

  if (!tramo.admiteImagen) {
    /*
     * Por encima del corte: Autor y marca, sin una sola palabra de la Cita. Ni recortada
     * ni con puntos suspensivos. La previsualización dice de quién es y de dónde viene,
     * y el texto se lee al abrir el enlace, que es lo que la Tarjeta existe para provocar.
     */
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">`,
      fondo,
      `<text x="${MARGEN}" y="${ALTO / 2 - 10}" font-family="Georgia, 'Source Serif 4', serif" ` +
        `font-size="64" fill="${TINTA}">${escapar(datos.autor)}</text>`,
      datos.procedencia
        ? `<text x="${MARGEN}" y="${ALTO / 2 + 40}" font-family="Inter, system-ui, sans-serif" ` +
          `font-size="28" fill="${APAGADA}">${escapar(datos.procedencia)}</text>`
        : '',
      marca,
      '</svg>',
    ].join('');
  }

  const cuerpo = tramo.pixelesEnTarjeta;
  const lineas = repartirEnLineas(`«${datos.texto}»`, cuerpo, anchoUtil);
  const alturaLinea = Math.round(cuerpo * 1.3);
  const altoTexto = lineas.length * alturaLinea;

  const altoAtribucion = 24 + 34 + (datos.procedencia ? 30 : 0);
  const inicio = Math.max(MARGEN, (ALTO - altoTexto - altoAtribucion - 40) / 2) + cuerpo;
  const trasTexto = inicio + altoTexto - alturaLinea + 44;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">`,
    fondo,
    ...lineas.map(
      (linea, i) =>
        `<text x="${MARGEN}" y="${inicio + i * alturaLinea}" ` +
        `font-family="Georgia, 'Source Serif 4', serif" font-size="${cuerpo}" fill="${TINTA}">` +
        `${escapar(linea)}</text>`,
    ),
    `<rect x="${MARGEN}" y="${trasTexto}" width="96" height="2" fill="${FILETE}"/>`,
    `<text x="${MARGEN}" y="${trasTexto + 40}" font-family="Inter, system-ui, sans-serif" ` +
      `font-size="26" font-weight="600" fill="${TINTA}" letter-spacing="1">` +
      `${escapar(datos.autor.toLocaleUpperCase('es'))}</text>`,
    datos.procedencia
      ? `<text x="${MARGEN}" y="${trasTexto + 76}" font-family="Inter, system-ui, sans-serif" ` +
        `font-size="24" fill="${APAGADA}">${escapar(datos.procedencia)}</text>`
      : '',
    marca,
    '</svg>',
  ].join('');
}
