import type worker from '../../../medicion/worker.ts';

/**
 * Lo que comparten las pruebas del adaptador del receptor (Historia 23.12): un D1 falso,
 * la petición de una baliza y la lectura de las listas del SQL. Juntos para que el `INSERT`
 * se lea de una sola manera —el SQL que el Worker **envía**, no el texto del fichero— y
 * reformatearlo no obligue a tocar tres pruebas.
 */

type Entorno = Parameters<typeof worker.fetch>[1];
type Sentencia = ReturnType<Entorno['MEDICION']['prepare']>;

/**
 * Un D1 que apunta el SQL de cada `prepare` y los valores de cada `bind`. Con `fallo`,
 * `run()` rechaza con él, como D1 ante un `rowid` repetido o con el almacén caído.
 */
export function d1QueApunta(fallo?: Error) {
  const llamadas = { sql: [] as string[], valores: [] as unknown[][] };
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

/** La `Request` de una baliza: un `POST` con `carga` en JSON, o un `metodo` sin cuerpo. */
export const peticionAlReceptor = (carga: unknown, metodo = 'POST') =>
  new Request('https://medicion.invalid/', {
    method: metodo,
    ...(metodo === 'POST' ? { body: JSON.stringify(carga) } : {}),
  });

/**
 * Los elementos de la lista que abre el primer paréntesis tras `apertura` en `sql`,
 * separados por las comas de su nivel y hasta el paréntesis que la cierra: los anidados
 * —`abs(random())`— y lo que va entre comillas simples son parte de un elemento, no el
 * final de la lista. `null` si `apertura` no está o la lista no se cierra.
 */
export function listaTras(sql: string, apertura: RegExp): string[] | null {
  const encontrada = apertura.exec(sql);
  if (encontrada === null) return null;
  const elementos: string[] = [];
  let nivel = 0;
  let enLiteral = false;
  let actual = '';
  for (const caracter of sql.slice(encontrada.index + encontrada[0].length)) {
    if (caracter === "'") enLiteral = !enLiteral;
    else if (!enLiteral && caracter === ')' && nivel === 0) return [...elementos, actual.trim()];
    else if (!enLiteral && caracter === ',' && nivel === 0) {
      elementos.push(actual.trim());
      actual = '';
      continue;
    } else if (!enLiteral && caracter === '(') nivel++;
    else if (!enLiteral && caracter === ')') nivel--;
    actual += caracter;
  }
  return null;
}
