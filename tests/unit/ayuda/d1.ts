import type worker from '../../../medicion/worker.ts';

/**
 * Lo que comparten las pruebas del adaptador del receptor y del SQL de `tools/` (Historia
 * 23.12): un D1 falso, la petición de una baliza y la lectura del SQL. Juntos para que el SQL
 * se lea de una sola manera —el que el Worker **envía**, no el texto del fichero, y siempre a
 * través de `sqlNeutralizado`— y reformatearlo no obligue a tocar tres pruebas.
 */

type Entorno = Parameters<typeof worker.fetch>[1];
type Sentencia = ReturnType<Entorno['MEDICION']['prepare']>;

/**
 * Un D1 que apunta el SQL de cada `prepare`, los valores de cada `bind` y cuántos `run()` se
 * ejecutaron: un `prepare` con su `bind` sin `run()` no escribe nada. Con `fallo`, `run()`
 * rechaza con él, como D1 ante un `rowid` repetido o con el almacén caído.
 */
export function d1QueApunta(fallo?: Error) {
  const llamadas = { sql: [] as string[], valores: [] as unknown[][], ejecutadas: 0 };
  const entorno: Entorno = {
    MEDICION: {
      prepare(sql: string) {
        llamadas.sql.push(sql);
        const sentencia: Sentencia = {
          bind(...valores: unknown[]) {
            llamadas.valores.push(valores);
            return sentencia;
          },
          async run() {
            llamadas.ejecutadas++;
            if (fallo) throw fallo;
            return { success: true };
          },
        };
        return sentencia;
      },
    },
  };
  return { entorno, llamadas };
}

/**
 * La `Request` de una baliza: `carga` en JSON como cuerpo, sea cual sea el método —que un
 * `PUT` no escriba tiene que ser por el método, no porque le falte el cuerpo—; sin `carga`,
 * sin cuerpo, que es lo único que admite un `GET`.
 */
export const peticionAlReceptor = (carga: unknown, metodo = 'POST') =>
  new Request('https://medicion.invalid/', {
    method: metodo,
    ...(carga === undefined ? {} : { body: JSON.stringify(carga) }),
  });

/**
 * Para SQLite, `'…'` es un literal —y un `ORDER BY rowid` dentro no ordena nada—; `"rowid"`,
 * `` `rowid` `` y `[rowid]` son el identificador `rowid`; y `/* *\/` y `--` son comentarios.
 * Un `--` pegado a una letra no lo es: en una orden de terminal es una bandera (`--remote`,
 * `--command`), y tomarlo por comentario borraría el SQL que la sigue.
 */
const PIEZAS_DE_SQL =
  /'(?:[^']|'')*'|"((?:[^"]|"")*)"|`((?:[^`]|``)*)`|\[([^\]]*)\]|--(?![A-Za-z])[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/g;

/**
 * El SQL tal como lo lee SQLite, y la única lectura de SQL de las pruebas: los literales
 * quedan vacíos, los comentarios fuera, y lo que va entre comillas de identificador pierde
 * las comillas y se neutraliza a su vez, porque entre comillas dobles puede ir el SQL de una
 * orden de terminal (`--command "SELECT … WHERE ruta='/x'"`).
 */
export function sqlNeutralizado(sql: string): string {
  return sql.replace(PIEZAS_DE_SQL, (pieza, doble?: string, grave?: string, corchete?: string) => {
    if (pieza.startsWith("'")) return "''";
    const identificador = doble ?? grave ?? corchete;
    return identificador === undefined ? ' ' : ` ${sqlNeutralizado(identificador)} `;
  });
}

/**
 * Los elementos de la lista que abre el primer paréntesis tras `apertura` en el SQL
 * neutralizado, separados por las comas de su nivel y hasta el paréntesis que la cierra: los
 * anidados —`abs(random())`— son parte de un elemento, no el final de la lista, y un
 * comentario o unas comillas de identificador no cambian lo que se lee. `null` si `apertura`
 * no está o la lista no se cierra.
 */
export function listaTras(sql: string, apertura: RegExp): string[] | null {
  const neutro = sqlNeutralizado(sql);
  const encontrada = apertura.exec(neutro);
  if (encontrada === null) return null;
  const elementos: string[] = [];
  let nivel = 0;
  let actual = '';
  for (const caracter of neutro.slice(encontrada.index + encontrada[0].length)) {
    if (caracter === ')' && nivel === 0) return [...elementos, actual.trim()];
    if (caracter === ',' && nivel === 0) {
      elementos.push(actual.trim());
      actual = '';
      continue;
    }
    if (caracter === '(') nivel++;
    if (caracter === ')') nivel--;
    actual += caracter;
  }
  return null;
}
