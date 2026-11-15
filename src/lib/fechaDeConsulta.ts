/**
 * La fecha de consulta de «Cómo citar» — Historias 30.3 y 32.5, FR-58, AD-28.
 *
 * Una hoja **sin importaciones**, a propósito: la importa el `<script>` empaquetado de
 * `src/islands/CopiarReferencia.astro`, y lo que importa un guion empaquetado viaja con él. Desde
 * `src/lib/atribucion.ts` —que la reexporta y sigue siendo por donde la nombra todo lo demás— el
 * guion arrastraría el grafo entero de ese módulo (las Obras, las superficies y la tabla de eventos
 * del vocabulario, que el empaquetado no sabe quitar). Lo que aquí se declara es la única
 * composición de la fecha: la isla en línea de la Página de Cita (`CopiarCita.astro`) la lleva por
 * su texto y la empaquetada la importa.
 */

/**
 * El atributo del marcador vacío donde va la fecha de consulta, con el estilo por valor:
 * `<span data-fecha-de-consulta="apa"></span>`. El build lo deja vacío —la fecha es la del
 * visitante, nunca la jornada del build— y la isla de Copiar lo rellena con `fechaDeConsulta`.
 */
export const MARCADOR_DE_FECHA_DE_CONSULTA = 'data-fecha-de-consulta';

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
