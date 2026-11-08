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

import type { Cita, Autor, SiguienteCita } from './publicado.ts';
import { rotuloDeFuente, type ObraResuelta } from './obras.ts';
import { MARCA } from './marca.ts';
import { escapar } from './lienzo.ts';
import { enUnaLinea } from './verso.ts';
import { recuentoDeAutores, recuentoDeCitas, recuentoDeObras, temaEnFrase } from './recuentos.ts';
import {
  TARJETA_DEL_DIRECTORIO_DE_AUTORES,
  TARJETA_DEL_DIRECTORIO_DE_OBRAS,
  rutaDelDirectorioDeAutores,
  rutaDelDirectorioDeObras,
} from './superficies.ts';

/*
 * Los recuentos de Autores y de Obras viven en `src/lib/recuentos.ts` desde la Historia 26.6, sin
 * importaciones, porque el guion del filtro del Directorio los lleva al navegador; aquí se
 * reexportan para la meta, la Tarjeta Social y las pruebas, que los siguen pidiendo a este módulo.
 * `temaEnFrase` se mudó con ellos en la Historia 27.2: el recuento de `/buscar/` la lleva al
 * navegador, y la «Siguiente cita sobre…» de la 24.5 la sigue usando desde aquí. Una sola regla.
 * `recuentoDeCitas` se mudó en la Historia 27.3: el rótulo de cada Obra del selector de `/buscar/`
 * —«Maestros ambulantes (23 citas)»— la lleva al navegador, y la Tarjeta de Obra, la Tarjeta Social
 * y la Lista de Obras la siguen pidiendo aquí. Una sola concordancia.
 */
export { recuentoDeAutores, recuentoDeCitas, recuentoDeObras, temaEnFrase };

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
 * `description` del JSON-LD y el índice de Pagefind. Desde la Historia 17.4 el **cuerpo** de las
 * páginas 2+ no tiene ficha y no lleva la semblanza, propia o ajena, así que ya no consulta; su
 * `<meta description>` y su JSON-LD siguen su propia regla, la de esas dos superficies.
 * Con una semblanza propia —la breve que escribe el editor— da igual; con una ajena (CC BY-SA,
 * de una biografía) cada una tiene que poder llevar su atribución, y solo una puede.
 *
 * La Tarjeta Social no está en la lista porque no pregunta: no la lleva **nunca**, sea propia o
 * ajena, y se compone con hechos (`datosDeTarjetaDeAutor` en `tarjeta.ts`). Un PNG no lleva
 * enlace ni licencia, y una bajada escrita por el sistema sería prosa nueva sobre una persona.
 */
export const SUPERFICIES_DE_LA_SEMBLANZA = [
  'ficha-de-autor',
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

/**
 * Las superficies que **no reproducen** ninguna semblanza, ni propia ni ajena — Historia 26.3,
 * AD-19, AD-28.
 *
 * Es la lista contraria a `SUPERFICIES_DE_LA_SEMBLANZA`, y por eso va aparte: aquellas son las de
 * la Página de Autor que **consultan** si pueden llevarla (`semblanzaEn`); éstas no preguntan, no
 * la llevan nunca. Un Directorio lista entidades y dice hechos del Corpus —nombre, años, recuento—,
 * y no compone prosa sobre ninguna persona. Se nombran por su ruta y por la de su Tarjeta Social, y
 * una prueba exige sobre `dist/` que ninguna contenga la `semblanza` de ningún Autor. La 26.4 añade
 * `/obras/` y la suya, que tampoco llevan la `nota` de ninguna Ficha de Obra.
 */
export const SUPERFICIES_SIN_SEMBLANZA: readonly string[] = [
  rutaDelDirectorioDeAutores(),
  TARJETA_DEL_DIRECTORIO_DE_AUTORES,
  rutaDelDirectorioDeObras(),
  TARJETA_DEL_DIRECTORIO_DE_OBRAS,
];

/**
 * Los hechos de una Fila de Autor del Directorio — Historia 26.3, FR-55, UX-DR84: sus años, si
 * constan, y el recuento de sus Citas **publicadas** —las que lista su página, no las documentadas
 * de la Tarjeta Social de Autor—. Las partes van sin separador: la fila pone el punto medio para la
 * vista y la coma para el lector.
 *
 * Los años salen de `añosDeAutor` («1547–1616», «Fallecido en 65») y solo si consta el año de
 * fallecimiento. El esquema lo hace obligatorio, así que la rama sin años no se alcanza con el
 * Corpus; la función la admite para que la convención de ausencia —sin punto medio ni hueco— se
 * pueda probar sin relajar el tipo de `Autor`.
 */
export function hechosDeFilaDeAutor(
  autor: { añoNacimiento?: number; añoFallecimiento?: number },
  citas: number,
): { años?: string; recuento: string } {
  const recuento = recuentoDeCitas(citas);
  if (autor.añoFallecimiento === undefined) return { recuento };
  const años = añosDeAutor({ ...autor, añoFallecimiento: autor.añoFallecimiento });
  return { años, recuento };
}

/**
 * El `<meta description>` del Directorio de Autores — Historia 26.3, UX-DR80, UX-DR107:
 * «{m} autores, de la A a la Z, con {n} citas publicadas.», en singular cuando la cifra es una
 * —«1 autor», «1 cita publicada»—, con la redacción que aprobó Héctor el 2026-10-19.
 *
 * Solo hechos del Corpus, y **sin contarlos aquí** (AD-11): recibe las dos cifras de
 * `directorioDeAutores` —{m}, los Autores que lista la página; {n}, las Citas publicadas que
 * suman—, las mismas que pinta la página y que dice su Tarjeta Social. Contarlas otra vez sería
 * un segundo dueño del mismo hecho. Nunca «frases».
 */
export function descripcionDelDirectorioDeAutores(directorio: { autores: number; citas: number }): string {
  return `${recuentoDeAutores(directorio.autores)}, de la A a la Z, con ${recuentoDeCitasPublicadas(directorio.citas)}.`;
}

/**
 * «1 cita publicada», «54 citas publicadas»: la concordancia que comparten las metas de los dos
 * Directorios (26.3, 26.4), que dicen la misma unidad y no pueden escribirla de dos maneras.
 */
function recuentoDeCitasPublicadas(n: number): string {
  return n === 1 ? '1 cita publicada' : `${n} citas publicadas`;
}

/**
 * El `<meta description>` del Directorio de Obras — Historia 26.4, UX-DR80, UX-DR107:
 * «{k} obras de {m} autores, con {n} citas publicadas.», con los singulares obligatorios —«1
 * obra», «1 autor», «1 cita publicada»—.
 *
 * Como la de Autores, **sin contar aquí** (AD-11): las tres cifras salen de `directorioDeObras`,
 * la misma derivación que pinta la página. {k} son las Obras listadas; {m}, los Autores que tienen
 * grupo; {n}, la suma de los recuentos que la página pinta —las Citas de esas Obras, no todas las
 * publicadas: las que no declaran obra no figuran en `/obras/`—. Nunca «frases».
 */
export function descripcionDelDirectorioDeObras(directorio: { obras: number; autores: number; citas: number }): string {
  return (
    `${recuentoDeObras(directorio.obras)} de ${recuentoDeAutores(directorio.autores)}, ` +
    `con ${recuentoDeCitasPublicadas(directorio.citas)}.`
  );
}

/** Un año como lo lee una persona: los negativos, sin signo y «a. C.». */
export function añoLegible(año: number, era: '' | ' d. C.' = ''): string {
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
 * El texto de la Fila de bloque de la Tarjeta de Obra cuando alguna Cita de la Obra está
 * cotejada: la Página de Obra tiene entonces «Dónde leer esta obra», y la fila lo promete
 * (UX-DR104, Historia 24.4).
 */
export const FILA_VER_LA_OBRA_Y_DONDE_LEERLA = 'Ver la obra y dónde leerla';

/**
 * El de una Obra sin ninguna Cita cotejada: no hay edición que enseñar, y prometer «dónde
 * leerla» llevaría a una página que no lo dice. Las `ediciones` de la ficha no cuentan: la
 * edición en venta nunca va sola (FR-54).
 */
export const FILA_VER_LA_OBRA = 'Ver la obra';

/**
 * Lo que dice la Tarjeta de Obra bajo la Cita — FR-12, UX-DR104, Historia 24.4.
 *
 * `hechos` son las partes de la línea «{Autor} · {año} · {n} citas», en su orden, sin
 * separadores: el componente pone el punto medio para la vista y la coma para el lector. El año
 * es el de la Obra resuelta —omitido si sus Citas discrepan o no lo dicen, nunca el de una
 * traducción—, como lo lee una persona (`añoLegible`: «350 a. C.»), y cuando falta no deja
 * hueco: la parte no está. El recuento es `obra.recuento`, el de la Obra resuelta: el
 * componente no cuenta nada (AD-11).
 *
 * `fila` es el texto de su Fila de bloque, sin el glifo de avance «›», que pone `FilaDeBloque.astro`.
 *
 * Un solo dueño junto a `descripcionDeObra` y `añoLegible`, porque la portada pintará la misma
 * tarjeta (28.2) y dos redacciones dirían la misma Obra de dos maneras.
 */
export function contenidoDeTarjetaDeObra(
  autor: Pick<Autor, 'nombre'>,
  obra: Pick<ObraResuelta, 'año' | 'recuento' | 'edicionCotejada'>,
): { hechos: string[]; fila: string } {
  const hechos = [autor.nombre];
  if (obra.año !== undefined) hechos.push(añoLegible(obra.año));
  hechos.push(recuentoDeCitas(obra.recuento));
  return { hechos, fila: obra.edicionCotejada ? FILA_VER_LA_OBRA_Y_DONDE_LEERLA : FILA_VER_LA_OBRA };
}

/**
 * El texto de «Siguiente…» cuando sigue el orden de la Obra (UX-DR65, Historia 24.5).
 */
export const FILA_SIGUIENTE_DE_ESTA_OBRA = 'Siguiente cita de esta obra';

/**
 * El texto de la Fila de bloque «Siguiente…» de la Tarjeta de Obra — FR-12, UX-DR65, UX-DR107,
 * Historia 24.5.
 *
 * Por la Obra, «Siguiente cita de esta obra»; por el Tema, «Siguiente cita sobre {tema}», con
 * el Tema en minúscula (`temaEnFrase`). Sin el glifo de avance «›», que pone `FilaDeBloque.astro`:
 * lo compone `src/lib/`, no la plantilla. A dónde lleva lo decide `siguienteCita`.
 */
export function textoDeSiguiente(siguiente: SiguienteCita): string {
  return siguiente.por === 'obra'
    ? FILA_SIGUIENTE_DE_ESTA_OBRA
    : `Siguiente cita sobre ${temaEnFrase(siguiente.tema.nombre)}`;
}

/**
 * El recuento de un cierre de las Rutas de salida, que nunca es singular. El bloque del Autor
 * enseña al menos otra Cita suya, así que cuenta dos o más; el de la Obra, también, y en la
 * práctica tres o más: en una Obra de dos la otra es siempre la de «Siguiente» y el bloque no
 * existe (lo explica `rutasDeSalidaDeCita`, no es una regla de tamaño). Un recuento menor de dos
 * es un uso roto, no un caso que redactar.
 */
function recuentoDeCierre(quien: string, recuento: number): number {
  if (!Number.isInteger(recuento) || recuento < 2) {
    throw new Error(
      `${quien}: un cierre de las Rutas de salida cuenta dos Citas o más, y este cuenta ${recuento}. ` +
        'El bloque no existe con menos: el uso está roto (Historia 24.6).',
    );
  }
  return recuento;
}

/**
 * El cierre de «De la misma obra» — «Las {n} citas de {título}», FR-12, UX-DR68, UX-DR108,
 * Historia 24.6.
 *
 * Sin el glifo de avance «›», que pone `FilaDeBloque.astro`. El recuento es `obra.recuento` y el
 * título el de la Obra resuelta, que nunca se recorta (NFR-12): lleva a la página 1 de la Obra.
 */
export function cierreDeLaMismaObra(obra: Pick<ObraResuelta, 'recuento' | 'titulo'>): string {
  return `Las ${recuentoDeCierre('cierreDeLaMismaObra', obra.recuento)} citas de ${obra.titulo}`;
}

/**
 * El cierre de «Más de {Autor}» — «Las {n} citas de {Autor}», FR-12, UX-DR69, UX-DR108,
 * Historia 24.6.
 *
 * `recuento` son las Citas publicadas del Autor, todas: las que lista su Página de Autor, a la
 * que lleva. Lo cuenta `rutasDeSalidaDeCita`, no el componente (AD-11). Sin glifo, como el otro.
 */
export function cierreDeMasDelAutor(autor: Pick<Autor, 'nombre'>, recuento: number): string {
  return `Las ${recuentoDeCierre('cierreDeMasDelAutor', recuento)} citas de ${autor.nombre}`;
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

// ─────────────────────────────────────────────────────────────────────────────
// «Cómo citar» — Historia 30.3, FR-58, AD-28
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Los estilos de la Referencia, en el orden en que se apilan: APA, MLA y Chicago (la entrada de
 * bibliografía de notas y bibliografía, decisión de Héctor). Sin pestañas: una composición.
 */
export const ESTILOS_DE_REFERENCIA = ['apa', 'mla', 'chicago'] as const;

export type EstiloDeReferencia = (typeof ESTILOS_DE_REFERENCIA)[number];

/** El rótulo de cada estilo, y la segunda palabra de su botón: «Copiar APA». */
export const ROTULOS_DE_ESTILO: Readonly<Record<EstiloDeReferencia, string>> = {
  apa: 'APA',
  mla: 'MLA',
  chicago: 'Chicago',
};

/**
 * El atributo del marcador vacío donde va la fecha de consulta, con el estilo por valor:
 * `<span data-fecha-de-consulta="apa"></span>`. El build lo deja vacío —la fecha es la del
 * visitante, nunca la jornada del build— y la isla de Copiar lo rellena con `fechaDeConsulta`.
 */
export const MARCADOR_DE_FECHA_DE_CONSULTA = 'data-fecha-de-consulta';

/** Un trozo de la Referencia: texto, en cursiva si el estilo la pide, o el sitio de la fecha. */
export type SegmentoDeReferencia = { texto: string; cursiva?: true } | { fecha: EstiloDeReferencia };

/** Una Referencia ya compuesta, como la recibe `ComoCitar.astro`, que no compone nada. */
export interface ReferenciaCompuesta {
  estilo: EstiloDeReferencia;
  rotulo: string;
  segmentos: readonly SegmentoDeReferencia[];
}

/**
 * Si la Cita lleva «Cómo citar». Hoy, toda Cita; la Historia 35.4 añadirá aquí la Cita atribuida
 * (FR-65), y la página solo pregunta.
 */
export function citaTieneComoCitar(cita: Pick<Cita, 'slug'>): boolean {
  void cita;
  return true;
}

/** Lo que del Autor decide su nombre en una Referencia. */
export type AutorParaReferencia = Pick<Autor, 'nombre'> & { ordenAlfabetico?: unknown; ordenRevisado?: unknown };

/**
 * El nombre partido en apellidos y nombre de pila, **solo** si una persona revisó la clave de
 * orden (`ordenRevisado`) y la clave es, tal cual, una palabra del `nombre` partido por espacios
 * (la primera vez que aparece): los apellidos van desde esa palabra hasta el final; el nombre de
 * pila, lo de antes, y sin nada antes no hay nombre de pila. Si no, `undefined`: el nombre se
 * escribe tal cual. Una clave sin revisar es una propuesta de la regla fija, no un dato.
 *
 * La comparten `nombreEnReferencia` y la relación de `tools/lib/cambios.ts` (AD-27), que fecha
 * las Páginas de Cita de un Autor cuando cambia lo que esto devuelve.
 */
export function partesDelNombre(autor: AutorParaReferencia): { apellidos: string; pila?: string } | undefined {
  const { nombre, ordenAlfabetico: clave, ordenRevisado } = autor;
  if (typeof nombre !== 'string' || typeof clave !== 'string' || typeof ordenRevisado !== 'string') return undefined;
  const palabras = nombre.split(' ');
  const desde = palabras.indexOf(clave);
  if (desde === -1) return undefined;
  const apellidos = palabras.slice(desde).join(' ');
  return desde === 0 ? { apellidos } : { apellidos, pila: palabras.slice(0, desde).join(' ') };
}

/**
 * El nombre del Autor como lo escribe cada estilo: APA «Apellidos, I.» —inicial solo de las
 * palabras del nombre de pila que empiezan por mayúscula: «Zayas y Sotomayor, M.», y una por trozo
 * en un nombre compuesto con guion: «Rousseau, J.-J.»—, MLA y Chicago
 * «Apellidos, Nombre de pila». Sin nombre de pila, solo los apellidos («Horacio»); sin clave
 * revisada, el `nombre` tal cual en los tres.
 */
export function nombreEnReferencia(autor: AutorParaReferencia, estilo: EstiloDeReferencia): string {
  const partes = partesDelNombre(autor);
  if (partes === undefined) return autor.nombre;
  if (partes.pila === undefined) return partes.apellidos;
  if (estilo !== 'apa') return `${partes.apellidos}, ${partes.pila}`;
  const iniciales = partes.pila
    .split(' ')
    .filter((palabra) => /^\p{Lu}/u.test(palabra))
    .map((palabra) =>
      palabra
        .split('-')
        .filter((trozo) => trozo !== '')
        .map((trozo) => `${[...trozo][0]}.`)
        .join('-'),
    );
  return iniciales.length === 0 ? partes.apellidos : `${partes.apellidos}, ${iniciales.join(' ')}`;
}

/**
 * El punto que cierra una frase de la Referencia o del Fragmento: tras lo que ya acaba en
 * puntuación final —un título «¿…?», un año «23 a. C.», un «…»— no va otro. Una sola regla para
 * «Cómo citar» (30.3) e «Inserta esta cita» (30.4).
 */
function punto(frase: string): string {
  return /[.?!…]$/u.test(frase) ? '' : '.';
}

/** La frase con su punto final, por la regla de `punto`. */
function conPunto(frase: string): string {
  return `${frase}${punto(frase)}`;
}

/**
 * La Referencia de una Cita en un estilo, en segmentos — FR-58, AD-28.
 *
 * Sale solo de lo que consta de **esa** Cita: el nombre del Autor, el título de su Obra resuelta
 * (`cita.obra.titulo`, nunca la grafía que declara), el año de su Procedencia, su traducción
 * —solo con Obra—, el rótulo de su edición cotejada si tiene Fuente, la marca y la canónica sin
 * marcas de llegada. Lo que no consta se omite: sin «s. f.», sin «Sin obra documentada», sin un
 * dato de otra Cita ni de la ficha. El texto de la Cita entra entero y literal; en verso, en una
 * línea con « / » entre versos por `enUnaLinea` de `src/lib/verso.ts` (AD-29). La fecha de
 * consulta es un segmento propio, vacío en el build; las formas literales (supuesto que revisa
 * Héctor) las fija la tabla de `tests/unit/atribucion.test.ts`:
 *
 *   · APA: `N (año). «X». En *Obra* (T, Trad., añoT). Edición. Sabiduría de Bolsillo. Recuperado el {fecha} de U`
 *   · MLA: `N. «X». *Obra*, traducido por T, añoT, año. Edición. *Sabiduría de Bolsillo*, U. Consultado el {fecha}.`
 *   · Chicago: `N. *Obra*. año. Traducido por T, añoT. Edición. «X». Sabiduría de Bolsillo. Consultado el {fecha}. U.`
 */
export function referenciaDeCita(
  cita: Cita,
  autor: AutorParaReferencia,
  canonica: string,
  estilo: EstiloDeReferencia,
): SegmentoDeReferencia[] {
  const nombre = nombreEnReferencia(autor, estilo);
  const titulo = cita.obra?.titulo;
  const año = cita.procedencia?.año === undefined ? undefined : añoLegible(cita.procedencia.año);
  const traduccion = titulo === undefined ? undefined : cita.procedencia?.traduccion;
  const añoDeTraduccion = traduccion?.año === undefined ? '' : `, ${añoLegible(traduccion.año)}`;
  const traductor = traduccion === undefined ? undefined : `${traduccion.traductor}${añoDeTraduccion}`;
  const edicion = cita.fuente === undefined ? undefined : rotuloDeFuente(cita.fuente);
  // En verso, en una línea con « / » entre versos (AD-29, UX-DR116): la Referencia es la única
  // salida en línea de «Cómo citar», y la forma la da solo `enUnaLinea`.
  const texto = `«${enUnaLinea(cita.texto)}».`;

  const s: SegmentoDeReferencia[] = [];
  const t = (texto: string) => s.push({ texto });
  const i = (texto: string) => s.push({ texto, cursiva: true });

  if (estilo === 'apa') {
    t(año !== undefined ? `${nombre} (${año}). ` : `${conPunto(nombre)} `);
    t(`${texto} `);
    if (titulo !== undefined) {
      t('En ');
      i(titulo);
      t(traduccion !== undefined ? ` (${traduccion.traductor}, Trad.${añoDeTraduccion}). ` : `${punto(titulo)} `);
    }
    if (edicion !== undefined) t(`${conPunto(edicion)} `);
    t(`${MARCA}. `);
    s.push({ fecha: 'apa' });
    t(canonica);
  } else if (estilo === 'mla') {
    t(`${conPunto(nombre)} ${texto} `);
    const contenedor: { texto: string; cursiva?: true }[] = [];
    if (titulo !== undefined) contenedor.push({ texto: titulo, cursiva: true });
    if (traductor !== undefined) contenedor.push({ texto: `traducido por ${traductor}` });
    if (año !== undefined) contenedor.push({ texto: año });
    contenedor.forEach((parte, n) => {
      if (n > 0) t(', ');
      s.push(parte);
    });
    const ultimo = contenedor.at(-1);
    if (ultimo !== undefined) t(`${punto(ultimo.texto)} `);
    if (edicion !== undefined) t(`${conPunto(edicion)} `);
    i(MARCA);
    t(`, ${canonica}.`);
    s.push({ fecha: 'mla' });
  } else {
    t(`${conPunto(nombre)} `);
    if (titulo !== undefined) {
      i(titulo);
      t(`${punto(titulo)} `);
    }
    if (año !== undefined) t(`${conPunto(año)} `);
    if (traductor !== undefined) t(`Traducido por ${traductor}. `);
    if (edicion !== undefined) t(`${conPunto(edicion)} `);
    t(`${texto} ${MARCA}. `);
    s.push({ fecha: 'chicago' });
    t(`${canonica}.`);
  }
  return s;
}

/** Las tres Referencias de una Cita, en su orden y con su rótulo, para `ComoCitar.astro`. */
export function referenciasDeCita(cita: Cita, autor: AutorParaReferencia, canonica: string): ReferenciaCompuesta[] {
  return ESTILOS_DE_REFERENCIA.map((estilo) => ({
    estilo,
    rotulo: ROTULOS_DE_ESTILO[estilo],
    segmentos: referenciaDeCita(cita, autor, canonica, estilo),
  }));
}

/**
 * La frase de la fecha de consulta de cada estilo, con el calendario local del `Date` que recibe:
 * APA «Recuperado el 8 de noviembre de 2026 de », MLA « Consultado el 8 nov. 2026.», Chicago
 * «Consultado el 8 de noviembre de 2026. ». Lleva sus espacios para que la Referencia sin fecha
 * —la del build, sin guion— no deje ninguno doble.
 *
 * Viaja a la isla de Copiar **por su texto** (`String(fechaDeConsulta)`), como `anunciar` por
 * `guionQueAnuncia`: sin importar nada, sin cierres sobre este módulo y sin comentarios dentro.
 * Las abreviaturas de MLA salen del nombre del mes: hasta cuatro letras, entero («mayo»); si no,
 * tres letras y punto, salvo septiembre, cuatro («sept.»). Está escrita corta —nombres de una letra,
 * sin plantillas anidadas— porque cuenta en `MAX_BYTES_DE_GUION` de cada Página de Cita.
 */
export function fechaDeConsulta(estilo: string, fecha: Date): string {
  const m = fecha.getMonth(), d = fecha.getDate(), a = fecha.getFullYear();
  const mes = 'enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(' ')[m];
  const larga = d + ' de ' + mes + ' de ' + a;
  return estilo === 'mla'
    ? ' Consultado el ' + d + ' ' + (mes.length < 5 ? mes : mes.slice(0, m === 8 ? 4 : 3) + '.') + ' ' + a + '.'
    : estilo === 'apa' ? 'Recuperado el ' + larga + ' de ' : 'Consultado el ' + larga + '. ';
}

/** La Referencia en texto plano —lo que copia el botón—, con la fecha dada o sin ella. */
export function referenciaEnTexto(segmentos: readonly SegmentoDeReferencia[], fecha?: Date): string {
  return segmentos
    .map((s) => ('fecha' in s ? (fecha === undefined ? '' : fechaDeConsulta(s.fecha, fecha)) : s.texto))
    .join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// «Inserta esta cita» — Historia 30.4, FR-57, AD-28
// ─────────────────────────────────────────────────────────────────────────────

/**
 * El nombre del Autor tal como lo pinta la Atribución y lo lleva el Fragmento (UX-DR137). Hoy es
 * el `nombre`; existe para que las dos superficies nombren por una sola función, donde la
 * Historia 35.4 añadirá el Personaje sin tocar los componentes.
 */
export function nombreEnAtribucion(autor: Pick<Autor, 'nombre'>): string {
  return autor.nombre;
}

/**
 * El Fragmento para insertar de una Cita — FR-57, AD-28. HTML estático, en cuatro líneas unidas
 * por `\n` (supuesto que revisa Héctor; lo fija la tabla de `tests/unit/atribucion.test.ts`):
 *
 *   <blockquote>
 *   <p>{texto}</p>
 *   <p>— {Autor}, <cite>{Obra}</cite>. <a href="{canónica}">Sabiduría de Bolsillo</a></p>
 *   </blockquote>
 *
 * Sin Obra, sin `<cite>`: «— {Autor}. ». El texto va entero y literal, sin comillas —el
 * `blockquote` ya dice que es cita— y a cualquier longitud. Tras el nombre o el título va «.»
 * salvo que ya acaben en «.», «?», «!» o «…»: la misma `punto` de la Referencia. Nada más: ni año, ni
 * traductor, ni edición, ni Fuente, ni la grafía que declara la Cita. Todo texto y el `href` salen escapados
 * con `escapar` de `src/lib/lienzo.ts`; sin guion, imagen, estilo, clase ni recurso del sitio, y su
 * único enlace es la canónica. Una canónica que no sea `http(s)` absoluta y ya normalizada (la que
 * escribe el parser es la que se pega), o lleve credenciales, `?…` o `#…`
 * —una Marca de llegada pegada en blogs ajenos atribuiría sus visitas a otra cosa— detiene la
 * construcción.
 */
export function fragmentoParaInsertar(cita: Pick<Cita, 'texto' | 'obra'>, autor: Pick<Autor, 'nombre'>, canonica: string): string {
  let url: URL | undefined;
  try {
    url = new URL(canonica);
  } catch {
    url = undefined;
  }
  if (
    url === undefined ||
    !/^https?:$/.test(url.protocol) ||
    url.href !== canonica ||
    url.username !== '' ||
    url.password !== '' ||
    canonica.includes('?') ||
    canonica.includes('#')
  ) {
    throw new Error(
      `fragmentoParaInsertar: la canónica «${canonica}» no es una URL http(s) absoluta, en su forma normalizada, sin credenciales, «?» ni «#»`,
    );
  }
  const titulo = cita.obra?.titulo;
  const firma =
    titulo === undefined
      ? escapar(conPunto(nombreEnAtribucion(autor)))
      : `${escapar(nombreEnAtribucion(autor))}, <cite>${escapar(titulo)}</cite>${punto(titulo)}`;
  return [
    '<blockquote>',
    `<p>${escapar(cita.texto)}</p>`,
    `<p>— ${firma} <a href="${escapar(canonica)}">${escapar(MARCA)}</a></p>`,
    '</blockquote>',
  ].join('\n');
}
