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

import { PALETA, SANS, SERIF, escapar, repartirEnLineas } from './lienzo.ts';
import { MARCA } from './marca.ts';
import { tramoDe } from './tramos.ts';
import { añosDeAutor, recuentoDeDocumentadas } from './atribucion.ts';
import { citasDocumentadasDeAutor, type Autor, type Cita } from './publicado.ts';

/** 1200×630 es la proporción que piden los validadores de previsualización. */
export const ANCHO = 1200;
export const ALTO = 630;
const MARGEN = 80;

/*
 * La paleta y las familias salen de `lienzo.ts` desde la Historia 13.2, junto con el
 * escapado y el reparto en líneas: los comparte con la Pieza de Canal, que rasteriza por
 * este mismo camino. Retocar el filete aquí y no allí solo se vería con las dos imágenes
 * juntas.
 */
const { papel: PAPEL, tinta: TINTA, apagada: APAGADA, filete: FILETE } = PALETA;

export interface DatosDeTarjeta {
  texto: string;
  autor: string;
  /** Obra y año, ya compuestos, cuando constan. */
  procedencia?: string;
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
    `<text x="${MARGEN}" y="${ALTO - MARGEN + 8}" font-family="${SANS}" ` +
    `font-size="24" font-weight="600" fill="${APAGADA}" letter-spacing="1.5">` +
    `${escapar(MARCA.toLocaleUpperCase('es'))}</text>`;

  const fondo =
    `<rect width="${ANCHO}" height="${ALTO}" fill="${PAPEL}"/>` +
    `<rect x="0" y="0" width="${ANCHO}" height="8" fill="${PALETA.siena}"/>`;

  if (!tramo.admiteImagen) {
    /*
     * Por encima del corte: Autor y marca, sin una sola palabra de la Cita. Ni recortada
     * ni con puntos suspensivos. La previsualización dice de quién es y de dónde viene,
     * y el texto se lee al abrir el enlace, que es lo que la Tarjeta existe para provocar.
     */
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">`,
      fondo,
      `<text x="${MARGEN}" y="${ALTO / 2 - 10}" font-family="${SERIF}" ` +
        `font-size="64" fill="${TINTA}">${escapar(datos.autor)}</text>`,
      datos.procedencia
        ? `<text x="${MARGEN}" y="${ALTO / 2 + 40}" font-family="${SANS}" ` +
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
        `font-family="${SERIF}" font-size="${cuerpo}" fill="${TINTA}">` +
        `${escapar(linea)}</text>`,
    ),
    `<rect x="${MARGEN}" y="${trasTexto}" width="96" height="2" fill="${FILETE}"/>`,
    `<text x="${MARGEN}" y="${trasTexto + 40}" font-family="${SANS}" ` +
      `font-size="26" font-weight="600" fill="${TINTA}" letter-spacing="1">` +
      `${escapar(datos.autor.toLocaleUpperCase('es'))}</text>`,
    datos.procedencia
      ? `<text x="${MARGEN}" y="${trasTexto + 76}" font-family="${SANS}" ` +
        `font-size="24" fill="${APAGADA}">${escapar(datos.procedencia)}</text>`
      : '',
    marca,
    '</svg>',
  ].join('');
}

/** Cuántas líneas caben bajo el filete de una Tarjeta de listado, bajada o hechos. */
export const MAX_LINEAS_DE_BAJADA = 4;

export interface DatosDeTarjetaDeListado {
  /** El nombre de la página: el Tema, la Colección, el Autor. */
  titulo: string;
  /** Por qué existe esa página: la descripción del sitio, el Tema, el criterio. Opcional. */
  bajada?: string;
  /**
   * Hechos derivados del Corpus, uno por línea, **en lugar de** una bajada — Historia 17.2: la
   * Tarjeta de Autor dice años y recuento de Citas documentadas, y no la semblanza, que puede
   * ser texto ajeno sin sitio para su atribución (AD-28). Cada hecho empieza línea, y el tope
   * de líneas de la bajada (`MAX_LINEAS_DE_BAJADA`) vale para todos juntos. Con `bajada` a la
   * vez, `svgDeTarjetaDeListado` lanza: dos textos bajo el filete no los ha decidido nadie.
   */
  hechos?: readonly string[];
  /**
   * Si se dibuja la marca al pie. Cierto salvo en la portada, donde **el título ya es la
   * marca** y repetirla la enseñaría dos veces.
   *
   * Es una opción explícita y no una regla implícita del tipo «si el título coincide con la
   * marca, quítala»: esa funcionaría hasta el día que una Colección se llamara como el sitio,
   * y entonces fallaría sin que nadie supiera por qué.
   */
  conMarca?: boolean;
}

/**
 * El SVG de la Tarjeta de una página de listado — FR-19.
 *
 * Hasta aquí solo la Página de Cita declaraba `og:image`: la portada, el buscador, los Temas,
 * las Colecciones y las Páginas de Autor se compartían **sin previsualización**. Estaba anotado
 * como bloqueado «porque no hay recurso de marca en `public/`», y la premisa era falsa: la
 * Tarjeta de Cita tampoco sale de ningún recurso — se dibuja con la paleta y la marca del
 * propio sitio y se rasteriza en el build. Lo que faltaba no era un activo: era esta variante.
 *
 * **Es otra tarjeta, no la misma con otro texto.** La de Cita enseña una Cita; ésta enseña el
 * nombre de la página y por qué existe. Compartir un Tema y que la previsualización mostrara
 * una de sus Citas prometería la Cita y no el Tema, que es lo que el enlace lleva.
 *
 * Comparte con su hermana el lienzo, la paleta, el filete y el escapado, y por el mismo motivo
 * que ella los comparte con la Pieza de Canal: retocar el filete en un sitio y no en el otro
 * solo se vería con las dos imágenes juntas.
 */
export function svgDeTarjetaDeListado(datos: DatosDeTarjetaDeListado): string {
  const anchoUtil = ANCHO - MARGEN * 2;

  const marca =
    datos.conMarca === false
      ? ''
      : `<text x="${MARGEN}" y="${ALTO - MARGEN + 8}" font-family="${SANS}" ` +
        `font-size="24" font-weight="600" fill="${APAGADA}" letter-spacing="1.5">` +
        `${escapar(MARCA.toLocaleUpperCase('es'))}</text>`;

  const fondo =
    `<rect width="${ANCHO}" height="${ALTO}" fill="${PAPEL}"/>` +
    `<rect x="0" y="0" width="${ANCHO}" height="8" fill="${PALETA.siena}"/>`;

  /*
   * El título se reparte igual que el cuerpo de una Cita: hay Colecciones con nombres largos
   * —«El silencio es sagrado de la cordura»— y una sola línea los sacaría del lienzo.
   */
  const CUERPO_TITULO = 68;
  const lineasDeTitulo = repartirEnLineas(datos.titulo, CUERPO_TITULO, anchoUtil);
  const alturaTitulo = Math.round(CUERPO_TITULO * 1.25);

  const CUERPO_BAJADA = 30;
  if (datos.hechos !== undefined && datos.bajada !== undefined) {
    throw new Error(
      'La Tarjeta de listado lleva bajada o hechos, no las dos cosas: ' +
        `«${datos.titulo}» trae las dos.`,
    );
  }
  const parrafos =
    datos.hechos !== undefined
      ? datos.hechos.filter((hecho) => hecho.trim() !== '')
      : datos.bajada === undefined || datos.bajada.trim() === ''
        ? []
        : [datos.bajada];
  const lineasDeBajada =
    /*
     * Cuatro líneas como mucho: por debajo del filete no cabe más sin comerse la marca, y
     * una bajada que no cabe se corta aquí y se lee entera al abrir el enlace — el mismo
     * criterio que su hermana aplica a la Cita que no admite Imagen. Los hechos de Autor son
     * dos líneas cortas y no llegan al tope; el título, que es lo que crece con un nombre
     * largo, no tiene tope y empuja el bloque, no lo recorta.
     */
    parrafos
      .flatMap((parrafo) => repartirEnLineas(parrafo, CUERPO_BAJADA, anchoUtil))
      .slice(0, MAX_LINEAS_DE_BAJADA);
  const alturaBajada = Math.round(CUERPO_BAJADA * 1.45);

  const altoTitulo = lineasDeTitulo.length * alturaTitulo;
  const altoBajada = lineasDeBajada.length * alturaBajada;
  const inicio =
    Math.max(MARGEN, (ALTO - altoTitulo - altoBajada - 40) / 2) + CUERPO_TITULO;
  const trasTitulo = inicio + altoTitulo - alturaTitulo + 40;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">`,
    fondo,
    ...lineasDeTitulo.map(
      (linea, i) =>
        `<text x="${MARGEN}" y="${inicio + i * alturaTitulo}" ` +
        `font-family="${SERIF}" font-size="${CUERPO_TITULO}" fill="${TINTA}">` +
        `${escapar(linea)}</text>`,
    ),
    `<rect x="${MARGEN}" y="${trasTitulo}" width="96" height="2" fill="${FILETE}"/>`,
    ...lineasDeBajada.map(
      (linea, i) =>
        `<text x="${MARGEN}" y="${trasTitulo + 44 + i * alturaBajada}" ` +
        `font-family="${SANS}" font-size="${CUERPO_BAJADA}" fill="${APAGADA}">` +
        `${escapar(linea)}</text>`,
    ),
    marca,
    '</svg>',
  ].join('');
}

/**
 * Los datos de la Tarjeta Social de un Autor — Historia 17.2, AD-28.
 *
 * **Solo hechos del Corpus**, para todos los Autores: el nombre, los años y, si tiene alguna,
 * cuántas de sus Citas publicadas están documentadas (`esCitaDocumentada`). Nunca la
 * semblanza, sea propia o ajena: esta imagen es la que el Kit Diario publica en las cuentas
 * propias, rasterizada y sin enlace ni licencia, y una bajada escrita por el sistema sería
 * prosa nueva sobre una persona real. Los años y el recuento salen de los mismos dueños que la
 * ficha y la descripción, para que digan lo mismo.
 */
export function datosDeTarjetaDeAutor(
  autor: Pick<Autor, 'slug' | 'nombre' | 'añoNacimiento' | 'añoFallecimiento'>,
  citas: readonly Cita[],
): DatosDeTarjetaDeListado {
  const recuento = recuentoDeDocumentadas(citasDocumentadasDeAutor(citas, autor.slug));
  return {
    titulo: autor.nombre,
    hechos: recuento === undefined ? [añosDeAutor(autor)] : [añosDeAutor(autor), recuento],
  };
}
