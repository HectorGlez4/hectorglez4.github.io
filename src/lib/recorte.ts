/**
 * El recorte por palabra del texto de Cita — Historia 34.1 (UX-DR131, UX-DR132, FR-64).
 *
 * **Único dueño** de cómo se acorta un texto de Cita para una superficie que no lo pinta entero:
 * la Tarjeta de Cita de los listados (`MAX_CARACTERES_DE_TARJETA_DE_CITA`) y el título de pestaña
 * y la meta descripción de la Página de Cita (`MAX_CARACTERES_DE_TITULO_Y_META`), los dos topes
 * de `src/lib/umbrales.ts`. Ningún otro fichero de `src/` ni de `public/islas/` recorta texto
 * de Cita con `slice`, `substring` o `substr` (lo vigila `tests/unit/recorte.test.ts`). Recortar no
 * es publicar la Cita recortada: su página, el JSON-LD, lo copiado, la Imagen y `/buscar/`
 * conservan el texto íntegro (NFR-12).
 *
 * La regla:
 *
 * - Se cuenta por puntos de código, y ningún salto de verso (U+000A) cuenta.
 * - Si el texto cabe, sale idéntico, sin «…».
 * - Si no, sale el prefijo más largo que acaba justo antes de un blanco del texto —el salto
 *   también lo es—, sin los blancos ni las `,` `;` `:` que le cuelguen por la derecha, y cuya
 *   cuenta más la de «…» no pasa del tope; detrás, «…». Nunca se corta dentro de una palabra
 *   (una racha sin blancos, con su puntuación y sus «¿»/«¡» pegados), y los saltos que quedan
 *   dentro del prefijo se conservan: quien lo quiera en una línea le pasa después `enUnaLinea`.
 * - Si ni la primera palabra cabe, sale entera, limpia igual, seguida de «…»; si esa palabra es
 *   todo el texto, sale tal cual. Son los dos únicos casos en que la salida pasa del tope.
 * - El tope cuenta lo que devuelve esta función. Quien pase después el verso a una línea
 *   (`enUnaLinea`, el título y la meta de la Página de Cita) suma « / » por cada salto que quede
 *   dentro: es a propósito (el criterio de la 34.1 recorta sin contar los saltos y después une).
 *
 * Esto cambia el punto de corte de la Épica 29, a propósito: la 29.1/29.3 contaban cada salto
 * como un carácter y cortaban en el índice de siempre, a media palabra. Ahora en verso el corte
 * se adelanta los caracteres que antes ocupaban los saltos.
 *
 * El módulo no parte ni sustituye el salto (`tests/unit/verso.test.ts`): compara carácter a
 * carácter, solo para no contarlo y para cortar delante de él.
 */

const PUNTOS = '…';
const SALTO = '\n';
const BLANCO = /^\s$/u;
const COLGANTE = /^[\s,;:]$/u;

/** Cuántos puntos de código cuentan en los caracteres dados: todos menos el salto. */
function cuenta(caracteres: readonly string[], hasta = caracteres.length): number {
  let n = 0;
  for (let i = 0; i < hasta; i++) if (caracteres[i] !== SALTO) n++;
  return n;
}

/** El final del prefijo `[0, fin)` una vez quitados los blancos y `,` `;` `:` que le cuelgan. */
function finLimpio(caracteres: readonly string[], fin: number): number {
  let f = fin;
  while (f > 0 && COLGANTE.test(caracteres[f - 1])) f--;
  return f;
}

/** El texto recortado por palabra a `tope` puntos de código sin contar los saltos. */
export function recortarPorPalabra(texto: string, tope: number): string {
  // Un tope sin sentido —`NaN`, fraccionario o sin sitio para una letra y «…»— no recorta nada
  // bien: se rompe aquí, en el build, en vez de devolver el texto casi entero.
  if (!Number.isInteger(tope) || tope < 2) throw new Error(`recortarPorPalabra: tope inválido (${tope})`);
  const caracteres = [...texto];
  if (cuenta(caracteres) <= tope) return texto;

  const cabe = tope - 1;
  let mejor = 0;
  for (let i = 1; i < caracteres.length; i++) {
    if (!BLANCO.test(caracteres[i])) continue;
    const fin = finLimpio(caracteres, i);
    if (fin === 0) continue;
    if (cuenta(caracteres, fin) > cabe) break;
    mejor = Math.max(mejor, fin);
  }
  if (mejor > 0) return caracteres.slice(0, mejor).join('') + PUNTOS;

  // La primera palabra: lo que va desde el primer carácter que no cuelga hasta el blanco siguiente;
  // un texto que empieza por blancos o por `,` `;` `:` no la deja en cero.
  const inicio = caracteres.findIndex((c) => !COLGANTE.test(c));
  const blanco = caracteres.findIndex((c, i) => i > inicio && BLANCO.test(c));
  if (inicio === -1 || blanco === -1) return texto;
  return caracteres.slice(0, finLimpio(caracteres, blanco)).join('') + PUNTOS;
}
