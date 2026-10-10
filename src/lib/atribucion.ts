/**
 * El texto plano que se lleva el visitante — FR-3.
 *
 * Vive en `src/lib/` y no dentro del botón porque lo consumen dos superficies: el copiado
 * (Historia 2.2) y la Imagen de Cita (Historia 5.1), que debe mostrar la misma atribución
 * que se copia. Si cada una lo compusiera por su cuenta, una publicaría «Séneca, Cartas a
 * Lucilio» y la otra «Séneca — Cartas a Lucilio, 65», y nadie se enteraría hasta verlas
 * juntas.
 *
 * AD-5 — Derivación pura.
 */

import type { Cita, Autor } from './publicado.ts';
import type { ObraResuelta } from './obras.ts';
import { MARCA } from './marca.ts';

/**
 * La procedencia compuesta —título de la Obra y año de la Cita, en ese orden— o `undefined`
 * si no consta ninguna.
 *
 * Tiene dueño único por lo mismo que el texto de copiar: desde la Historia 13.2 la consumen
 * dos cosas —el texto que se publica y la Pieza de Canal, que la escribe **dentro de la
 * imagen**—, y con dos redacciones la imagen diría «Cartas a Lucilio 65» mientras el pie dice
 * «Cartas a Lucilio, 65». Nadie lo vería hasta tener las dos delante.
 *
 * `procedencia` se lee tolerando su ausencia. En el sitio siempre está —el esquema le pone
 * un valor por omisión— pero `tools/lib/corpus.ts` devuelve el frontmatter **sin validar**, y
 * una Cita escrita a mano sin la clave llegaría aquí a reventar por destructuración: un
 * `TypeError` crudo en una orden que promete rechazos redactados. Lo que no consta no se
 * escribe, que es la regla de siempre (FR-2).
 */
export function procedenciaCompuesta(cita: Cita): string | undefined {
  /*
   * Historia 22.3 — la obra se nombra con el título de su Obra resuelta, nunca con la grafía
   * que declara la Cita: una Obra que reúne dos grafías se llama igual en todas partes. El
   * año, en cambio, es el de la Procedencia de **esta** Cita, nunca el de la Obra.
   */
  const titulo = cita.obra?.titulo;
  const año = cita.procedencia?.año;
  return [titulo, año].filter((x) => x !== undefined).join(', ') || undefined;
}

/**
 * Cita y atribución juntas, en texto plano y sin marcado.
 *
 * El formato es el de una cita bibliográfica corta, que es lo que Lucía va a pegar en una
 * presentación: comillas angulares, raya, Autor, y la procedencia que conste. Lo que no
 * consta no se escribe — nunca una obra inferida (FR-2).
 */
/**
 * La frase de la traducción —traductor y, si consta, su año—, con el arranque que cada
 * superficie pide: «Traducción de» en la Atribución, «trad. de» en lo copiado — Historia
 * 19.1, UX-DR51. Un solo dueño para que las dos digan lo mismo hasta la coma. `undefined`
 * cuando la Cita no declara traducción.
 */
export function fraseDeTraduccion(
  cita: Cita,
  forma: 'Traducción de' | 'trad. de',
): string | undefined {
  const traduccion = cita.procedencia?.traduccion;
  if (traduccion === undefined) return undefined;
  return (
    `${forma} ${traduccion.traductor}` +
    (traduccion.año !== undefined ? `, ${traduccion.año}` : '')
  );
}

export function textoParaCopiar(cita: Cita, autor: Autor): string {
  const partes = [autor.nombre];
  const fuente = procedenciaCompuesta(cita);
  if (fuente !== undefined) partes.push(fuente);

  /*
   * Historia 19.1, UX-DR51 — la traducción va detrás de la obra y con su propio año:
   * «— Horacio, Odas, trad. de Germán Salinas, 1909.» Solo lo copiado y la Atribución la
   * nombran; `procedenciaCompuesta`, que es lo que rasterizan la Imagen y la Pieza, no.
   */
  const traduccion = fraseDeTraduccion(cita, 'trad. de');
  if (traduccion !== undefined) partes.push(traduccion);

  return `«${cita.texto}» — ${partes.join(', ')}.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// La semblanza ajena y su licencia — Historia 17.2, AD-28
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Las superficies de la Página de Autor que **consultan** si pueden reproducir la semblanza.
 *
 * La reproducían todas: el cuerpo de la página 1, las páginas 2+, el `<meta description>`, la
 * `description` del JSON-LD y el índice de Pagefind. Con una semblanza propia —la breve que
 * escribe el editor— da igual; con una ajena (CC BY-SA, de una biografía) cada una tiene que
 * poder llevar su atribución, y solo una puede.
 *
 * La Tarjeta Social no está en la lista porque no pregunta: no la lleva **nunca**, sea propia o
 * ajena, y se compone con hechos (`datosDeTarjetaDeAutor` en `tarjeta.ts`). Un PNG no lleva
 * enlace ni licencia, y una bajada escrita por el sistema sería prosa nueva sobre una persona.
 */
export const SUPERFICIES_DE_LA_SEMBLANZA = [
  'ficha-de-autor',
  'paginas-siguientes',
  'meta-description',
  'datos-estructurados',
  'indice-de-busqueda',
] as const;

export type SuperficieDeLaSemblanza = (typeof SUPERFICIES_DE_LA_SEMBLANZA)[number];

/**
 * Las superficies que **portan** la atribución de un texto ajeno: la Ficha de Autor de la
 * página 1, que la publica visible justo debajo. AD-28 pone aquí el único dueño de esta
 * lista; ninguna página decide por su cuenta dónde se reproduce texto de tercero.
 */
export const PORTAN_LA_ATRIBUCION: ReadonlySet<SuperficieDeLaSemblanza> = new Set([
  'ficha-de-autor',
]);

/**
 * La semblanza que una superficie puede reproducir, o `undefined` si no puede: una semblanza
 * ajena —el Autor declara biografía— solo donde se porta su atribución; una propia, donde
 * estaba.
 */
export function semblanzaEn(
  autor: Pick<Autor, 'semblanza' | 'atribucion'>,
  superficie: SuperficieDeLaSemblanza,
): string | undefined {
  if (autor.atribucion === undefined) return autor.semblanza;
  return PORTAN_LA_ATRIBUCION.has(superficie) ? autor.semblanza : undefined;
}

/** Un año como lo lee una persona: los negativos, sin signo y «a. C.». */
function añoLegible(año: number, era: '' | ' d. C.'): string {
  return año < 0 ? `${-año} a. C.` : `${año}${era}`;
}

/**
 * Los años de un Autor tal y como se escriben — en la ficha, la descripción, el JSON-LD y la
 * Tarjeta Social, que es por lo que tienen un solo dueño.
 *
 *   · «1864–1936»; los dos antes de Cristo, «65–8 a. C.»; solo el primero, «4 a. C.–65 d. C.»;
 *   · sin año de nacimiento en el Corpus, «Fallecido en 65» o «Fallecido en 8 a. C.» —FR-2:
 *     nunca un año aproximado—.
 *
 * Hasta la 17.2 el año negativo salía con su signo —«-4–65»—, que no es como se escribe.
 */
export function añosDeAutor(
  autor: Pick<Autor, 'añoNacimiento' | 'añoFallecimiento'>,
  inicial: 'mayúscula' | 'minúscula' = 'mayúscula',
): string {
  const { añoNacimiento: nace, añoFallecimiento: muere } = autor;
  if (nace === undefined) {
    return `${inicial === 'mayúscula' ? 'Fallecido' : 'fallecido'} en ${añoLegible(muere, '')}`;
  }
  if (nace < 0 && muere < 0) return `${-nace}–${-muere} a. C.`;
  if (nace < 0) return `${añoLegible(nace, '')}–${añoLegible(muere, ' d. C.')}`;
  return `${nace}–${muere}`;
}

/**
 * «1 cita documentada», «12 citas documentadas», o `undefined` con ninguna: un recuento de
 * cero no es un hecho que valga la pena publicar. Ver `esCitaDocumentada` en `publicado.ts`.
 */
export function recuentoDeDocumentadas(documentadas: number): string | undefined {
  if (documentadas <= 0) return undefined;
  return `${documentadas} ${documentadas === 1 ? 'cita documentada' : 'citas documentadas'}`;
}

/**
 * Lo que dice de un Autor el JSON-LD cuando su semblanza ajena no puede ir — Historia 17.2:
 * «Séneca (4 a. C.–65 d. C.). 12 citas documentadas en Sabiduría de Bolsillo.», sin la segunda
 * frase si no tiene ninguna documentada.
 *
 * Solo hechos derivados del Corpus —nombre, años y recuento—, ninguna frase sobre la persona:
 * el sistema no compone prosa sobre una persona real (§5 del PRD).
 */
export function hechosDeAutor(
  autor: Pick<Autor, 'nombre' | 'añoNacimiento' | 'añoFallecimiento'>,
  documentadas: number,
): string {
  const recuento = recuentoDeDocumentadas(documentadas);
  return (
    `${autor.nombre} (${añosDeAutor(autor, 'minúscula')}).` +
    (recuento === undefined ? '' : ` ${recuento} en ${MARCA}.`)
  );
}

/**
 * El `<meta description>` de una Página de Autor — Historia 17.2.
 *
 * Con semblanza propia, como siempre: «Citas de {nombre} con su procedencia documentada.
 * {semblanza}». Con biografía, la semblanza no cabe (no lleva su atribución), y lo que la
 * sustituye son hechos que no repiten lo que el prefijo ya dice —ni el nombre ni
 * «documentada»—: «… 4 a. C.–65 d. C. 12 cotejadas con su documento.»
 */
export function descripcionDeAutor(
  autor: Pick<Autor, 'nombre' | 'semblanza' | 'atribucion' | 'añoNacimiento' | 'añoFallecimiento'>,
  documentadas: number,
): string {
  const prefijo = `Citas de ${autor.nombre} con su procedencia documentada.`;
  const semblanza = semblanzaEn(autor, 'meta-description');
  if (semblanza !== undefined) return `${prefijo} ${semblanza}`;
  const cotejadas =
    documentadas <= 0
      ? ''
      : ` ${documentadas} ${documentadas === 1 ? 'cotejada' : 'cotejadas'} con su documento.`;
  // «65–8 a. C.» ya acaba en punto: otro sería «a. C..».
  const años = añosDeAutor(autor);
  return `${prefijo} ${años}${años.endsWith('.') ? '' : '.'}${cotejadas}`;
}

/**
 * El `<meta description>` de una Página de Obra — UX-DR49, Historia 22.4:
 * «{n} frases de {Autor} en {Título} ({año}), con su procedencia documentada.», con «1 frase»
 * en singular y sin paréntesis si la Obra no tiene año (`obra.año`, que ya se omite si sus
 * Citas discrepan y nunca es el de una traducción).
 *
 * Solo hechos del Corpus —recuento, nombre, título, año—: ni sinopsis ni adjetivos (FR-51).
 * «Frases» solo aquí y en la pestaña; el cuerpo de la página dice «citas».
 */
export function descripcionDeObra(
  autor: Pick<Autor, 'nombre'>,
  obra: Pick<ObraResuelta, 'titulo' | 'año' | 'recuento'>,
  pagina = 1,
): string {
  const cuantas = `${obra.recuento} ${obra.recuento === 1 ? 'frase' : 'frases'}`;
  const año = obra.año === undefined ? '' : ` (${obra.año})`;
  // Las páginas 2+ dicen cuál son, como su título: si no, las descripciones serían idénticas.
  const tramo = pagina > 1 ? ` Página ${pagina}.` : '';
  return `${cuantas} de ${autor.nombre} en ${obra.titulo}${año}, con su procedencia documentada.${tramo}`;
}

/**
 * La línea de procedencia de la Atribución, en piezas — UX-DR8, FR-2, Historia 22.4.
 *
 * `titulo` es el título de la Obra resuelta, si consta, y `resto` todo lo que va detrás en la
 * misma línea —o la línea entera, sin Obra—. Van separados para que la Atribución enlace
 * **siempre** el título, y solo el título, sin tener que buscarlo dentro de un texto ya
 * compuesto. Leídos seguidos, `titulo + resto` es la línea de siempre:
 *
 *   · «{Obra}, {año}.» con año; «{Obra}.» con traducción y sin año (19.1: el año que hay es el
 *     de la traducción, y va con el traductor); «{Obra}. Sin año documentado.» sin ninguno;
 *   · sin Obra, «Sin obra documentada. Año {año}.» o «Sin obra documentada.» —la ausencia se
 *     dice, nunca se omite—;
 *   · detrás, la traducción («Traducción de Germán Salinas, 1909.», UX-DR51) y la referencia.
 *
 * UX-DR21 — frases completas con punto final, que se añade aquí y no se escribe en el corpus.
 */
export function lineaDeProcedencia(cita: Cita): { titulo?: string; resto: string } {
  const { año, referencia, traduccion } = cita.procedencia;
  const titulo = cita.obra?.titulo;
  const conPunto = (frase: string) => (/[.?!]$/.test(frase) ? frase : `${frase}.`);

  const frases: string[] = [];
  let trasElTitulo = '';
  if (titulo !== undefined) {
    // La primera frase es el título con lo que lo acompaña; su punto va detrás de eso.
    const primera = año !== undefined ? `, ${año}` : '';
    trasElTitulo = conPunto(`${titulo}${primera}`).slice(titulo.length);
    if (año === undefined && traduccion === undefined) frases.push('Sin año documentado');
  } else if (año !== undefined) {
    frases.push('Sin obra documentada', `Año ${año}`);
  } else {
    frases.push('Sin obra documentada');
  }

  const deLaTraduccion = fraseDeTraduccion(cita, 'Traducción de');
  if (deLaTraduccion !== undefined) frases.push(deLaTraduccion);
  if (referencia !== undefined) frases.push(referencia);

  const siguientes = frases.map(conPunto).join(' ');
  if (titulo === undefined) return { resto: siguientes };
  return { titulo, resto: siguientes === '' ? trasElTitulo : `${trasElTitulo} ${siguientes}` };
}
