import { describe, expect, it } from 'vitest';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { EVENTOS } from '../../src/lib/medicion.ts';
import { jornadaDe } from '../../medicion/receptor.ts';
import worker from '../../medicion/worker.ts';

const raiz = resolve(import.meta.dirname, '../..');

/**
 * Historia 23.12 — el orden de llegada no reconstruye a nadie.
 *
 * Sin `rowid` explícito SQLite numera `max(rowid)+1`, y el orden físico de `eventos` es el
 * de llegada: en una ruta poco visitada, la vista, el copiado y la salida de una misma
 * persona quedan seguidos. Con el `rowid` aleatorio esa secuencia no está en la tabla, y
 * ninguna consulta de `tools/` puede devolverla ordenando por él.
 *
 * Que SQLite acepte el `rowid` explícito, desordene las filas y lance ante uno repetido se
 * comprobó a mano contra un SQLite real; en vivo lo comprueba la baliza de la 23.3. Estas
 * pruebas fijan el SQL que el adaptador envía y lo que hace con la respuesta.
 */

type Entorno = Parameters<typeof worker.fetch>[1];
type Sentencia = ReturnType<Entorno['MEDICION']['prepare']>;

/** Un D1 que apunta lo que se le pide; `fallo` hace que `run()` rechace. */
function d1QueApunta(fallo?: Error) {
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

const baliza = (carga: unknown, metodo = 'POST') =>
  new Request('https://medicion.invalid/', {
    method: metodo,
    ...(metodo === 'POST' ? { body: JSON.stringify(carga) } : {}),
  });

/**
 * Las cadenas del código TypeScript de `fuente`, en orden, con los `+` entre literales
 * plegados en una sola: lo que llega a SQLite. Los comentarios no existen para el
 * compilador, así que tampoco aquí —un `// INSERT OR IGNORE` al final de una línea no es
 * código—. Una plantilla con huecos sale con `${…}` en cada hueco.
 */
function cadenasDelCodigo(fuente: string): string[] {
  const archivo = ts.createSourceFile('fuente.ts', fuente, ts.ScriptTarget.Latest, true);
  const cadenas: string[] = [];

  const plegar = (nodo: ts.Node): string | undefined => {
    if (ts.isStringLiteralLike(nodo)) return nodo.text;
    if (ts.isParenthesizedExpression(nodo)) return plegar(nodo.expression);
    if (ts.isTemplateExpression(nodo)) {
      return nodo.head.text + nodo.templateSpans.map((tramo) => `\${…}${tramo.literal.text}`).join('');
    }
    if (ts.isBinaryExpression(nodo) && nodo.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const izquierda = plegar(nodo.left);
      const derecha = plegar(nodo.right);
      if (izquierda !== undefined && derecha !== undefined) return izquierda + derecha;
    }
    return undefined;
  };

  const visitar = (nodo: ts.Node): void => {
    const plegada = plegar(nodo);
    if (plegada !== undefined) cadenas.push(plegada);
    else ts.forEachChild(nodo, visitar);
  };
  visitar(archivo);
  return cadenas;
}

describe('Historia 23.12 — el INSERT del Worker da un rowid aleatorio', () => {
  // Las cadenas que ve el compilador: sin comentarios y con los `+` ya plegados.
  const cadenas = cadenasDelCodigo(readFileSync(resolve(raiz, 'medicion/worker.ts'), 'utf8'));
  const escrituras = cadenas.filter((cadena) => /\b(?:INSERT|REPLACE|UPSERT)\b/i.test(cadena));

  it('hay una sola escritura, un INSERT INTO eventos sin OR … ni ON CONFLICT', () => {
    expect(escrituras).toHaveLength(1);
    // `OR REPLACE` o `REPLACE INTO` pisarían otro evento, y `OR IGNORE` o un `ON CONFLICT
    // DO NOTHING` se saltarían el `catch`: la colisión tiene que ser un error, como el
    // almacén caído.
    expect(escrituras[0]).toMatch(/^INSERT INTO eventos\b/);
    expect(escrituras[0]).not.toMatch(/\bON\s+CONFLICT\b/i);
  });

  it('la primera columna es rowid y su valor lo genera SQLite, abs(random())', () => {
    expect(escrituras[0]).toMatch(/^INSERT INTO eventos \(rowid,/);
    expect(escrituras[0]).toMatch(/\bVALUES \(abs\(random\(\)\), \?/);
  });

  it('el SQL que el código declara es el que el adaptador envía al D1', async () => {
    const { entorno, llamadas } = d1QueApunta();
    await worker.fetch(baliza({ evento: EVENTOS.copiado, ruta: '/cita/una' }), entorno);
    expect(llamadas.sql).toEqual(escrituras);
  });

  it('la tabla eventos tiene rowid: sin él, cada INSERT fallaría y el catch lo callaría', () => {
    // Un `WITHOUT ROWID` no tiene columna `rowid`: todo `INSERT` nombrándola lanza, el
    // `catch` lo traga, el receptor sigue contestando 204 y la medición cae a cero sin aviso.
    const esquema = readFileSync(resolve(raiz, 'medicion/esquema.sql'), 'utf8').replace(
      /--[^\n]*/g,
      '',
    );
    expect(esquema).toMatch(/\bCREATE TABLE IF NOT EXISTS eventos\b/);
    expect(esquema).not.toMatch(/\bWITHOUT\s+ROWID\b/i);
  });
});

describe('Historia 23.12 — el adaptador, con un D1 falso', () => {
  it('una baliza válida prepara el INSERT con rowid aleatorio y enlaza seis campos', async () => {
    const { entorno, llamadas } = d1QueApunta();
    const antes = jornadaDe(new Date());
    const respuesta = await worker.fetch(
      baliza({ evento: EVENTOS.copiado, ruta: '/cita/una' }),
      entorno,
    );
    const despues = jornadaDe(new Date());

    expect(llamadas.sql).toEqual([
      'INSERT INTO eventos (rowid, jornada, evento, ruta, origen, destino, consulta) ' +
        'VALUES (abs(random()), ?, ?, ?, ?, ?, ?)',
    ]);
    // El `rowid` no viaja por `bind`: seis valores, los del `Registro`, en el orden de
    // las columnas del esquema.
    expect(llamadas.valores).toHaveLength(1);
    const [jornada, ...resto] = llamadas.valores[0];
    expect(jornada).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Sin depender de la medianoche UTC: la jornada es la de antes o la de después.
    expect([antes, despues]).toContain(jornada);
    expect(resto).toEqual(['copiado', '/cita/una', null, null, null]);

    expect(respuesta.status).toBe(204);
    expect(respuesta.body).toBeNull();
  });

  // El D1 falso rechaza con el error que da SQLite ante un `rowid` repetido; que SQLite lo
  // lance de verdad —y no lo pise ni lo ignore— lo fija la prueba de arriba al prohibir
  // `OR …` y `ON CONFLICT`. Aquí se fija lo que hace el adaptador con ese rechazo.
  it('un run() que rechaza, como ante un rowid repetido, pierde el evento y contesta 204', async () => {
    const { entorno, llamadas } = d1QueApunta(
      new Error('D1_ERROR: UNIQUE constraint failed: eventos.rowid'),
    );
    const respuesta = await worker.fetch(
      baliza({ evento: EVENTOS.copiado, ruta: '/cita/una' }),
      entorno,
    );

    expect(llamadas.sql).toHaveLength(1);
    expect(respuesta.status).toBe(204);
    expect(respuesta.body).toBeNull();
  });

  it.each([
    ['un GET', baliza(undefined, 'GET')],
    ['un evento fuera del vocabulario', baliza({ evento: 'pageview', ruta: '/cita/una' })],
  ])('%s no escribe y contesta 204', async (_caso, peticion) => {
    const { entorno, llamadas } = d1QueApunta();
    const respuesta = await worker.fetch(peticion, entorno);

    expect(llamadas.sql).toEqual([]);
    expect(respuesta.status).toBe(204);
    expect(respuesta.body).toBeNull();
  });
});

/** Lo que va entre `+` y la cadena siguiente sin cambiar el valor: blancos y comentarios. */
const ENTRE_LITERALES = String.raw`(?:\s|\/\/[^\n]*|\/\*[\s\S]*?\*\/)*`;

/** Un literal partido con `+` —aunque medie un comentario— es una sola cadena para SQLite. */
const literalesUnidos = (fuente: string) =>
  fuente.replace(new RegExp(`['"\`]${ENTRE_LITERALES}\\+${ENTRE_LITERALES}['"\`]`, 'g'), '');

/**
 * Para SQLite, `"rowid"`, `` `rowid` `` y `[rowid]` son el mismo identificador que `rowid`;
 * aquí también, y `"e"."rowid"` es `e.rowid`.
 */
const identificadoresSinComillas = (texto: string) =>
  texto.replace(/(["`])(\w+)\1/g, '$2').replace(/\[(_rowid_|rowid|oid)\]/gi, ' $1 ');

const NOMBRA_ROWID = /(?<!\w)(?:_rowid_|rowid|oid)(?!\w)/i;

/** Los trozos de `texto` separados por las comas de su nivel de paréntesis. */
function trozosDeNivelCero(texto: string): string[] {
  const trozos: string[] = [];
  let nivel = 0;
  let actual = '';
  for (const caracter of texto) {
    if (caracter === ',' && nivel === 0) {
      trozos.push(actual);
      actual = '';
      continue;
    }
    if (caracter === '(') nivel++;
    if (caracter === ')') nivel--;
    actual += caracter;
  }
  return [...trozos, actual];
}

/**
 * La cláusula que empieza en `desde`. Acaba en `;`, en el paréntesis que cierra su nivel
 * —los de `lower(ruta)` o `CAST(…)` son parte de ella—, en `LIMIT` u `OFFSET` de su nivel o
 * en una comilla que cierra el literal de JavaScript que la contiene: la que sigue un `)`,
 * `,`, `;`, `+`, `.`, `:`, `]`, `}` o el final. Las demás comillas —un `'copiado'` de un
 * `CASE`— son SQL y no la acaban. Los comentarios `--` de SQL no cuentan.
 */
function clausulaDesde(texto: string, desde: number): string {
  const cierraElLiteral = /[ \t]*(?:[),;+.:\]}]|$)/y;
  const limite = /(?:LIMIT|OFFSET)\b/iy;
  let nivel = 0;
  let fin = texto.length;
  for (let i = desde; i < texto.length; i++) {
    const caracter = texto[i];
    if (caracter === ';') {
      fin = i;
      break;
    }
    if (caracter === '(') nivel++;
    else if (caracter === ')') {
      if (nivel === 0) {
        fin = i;
        break;
      }
      nivel--;
    } else if (`'"\``.includes(caracter)) {
      cierraElLiteral.lastIndex = i + 1;
      if (cierraElLiteral.test(texto)) {
        fin = i;
        break;
      }
    } else if (nivel === 0 && !/\w/.test(texto[i - 1] ?? '')) {
      limite.lastIndex = i;
      if (limite.test(texto)) {
        fin = i;
        break;
      }
    }
  }
  return texto.slice(desde, fin).replace(/--[^\n]*/g, '');
}

/**
 * Las posiciones (desde 1) y los alias con que el `SELECT` que precede a `hasta` saca el
 * `rowid` sin `CAST`: `ORDER BY 1` u `ORDER BY fila` ordenan por él igual que nombrándolo.
 */
function referenciasAlRowid(texto: string, hasta: number): string[] {
  const select = [...texto.slice(0, hasta).matchAll(/\bSELECT\b/gi)].at(-1);
  if (select === undefined) return [];
  const tramo = texto.slice(select.index + select[0].length, hasta);
  const from = /\bFROM\b/i.exec(tramo);
  const lista = from === null ? tramo : tramo.slice(0, from.index);

  return trozosDeNivelCero(lista).flatMap((elemento, indice) => {
    const rowid = /^(?:(?:DISTINCT|ALL)\s+)?(?:\w+\.)?(?:_rowid_|rowid|oid)(?:\s+(?:AS\s+)?(\w+))?$/i.exec(
      elemento.trim(),
    );
    if (rowid === null) return [];
    return rowid[1] === undefined ? [String(indice + 1)] : [String(indice + 1), rowid[1].toLowerCase()];
  });
}

/**
 * ¿Ordena `texto` por `rowid`? Busca cada cláusula `ORDER BY` —sin distinguir mayúsculas,
 * con los literales concatenados ya unidos y los identificadores sin comillas— y mira si
 * nombra `rowid`, `_rowid_` u `oid`, solos, cualificados o dentro de una expresión, o si
 * ordena por la posición o el alias con que su `SELECT` los saca. Nombrar `rowid` fuera de
 * un `ORDER BY` no cuenta: la 23.2 lo leerá con `CAST(rowid AS TEXT)` y lo barajará con
 * `UPDATE … SET rowid`, y estrecharlo a solo esos es de la 23.10.
 */
function ordenaPorRowid(texto: string): boolean {
  const sql = identificadoresSinComillas(literalesUnidos(texto));
  return [...sql.matchAll(/\bORDER\s+BY\b/gi)].some((orden) => {
    const clausula = clausulaDesde(sql, orden.index + orden[0].length);
    if (NOMBRA_ROWID.test(clausula)) return true;
    const referencias = referenciasAlRowid(sql, orden.index);
    return trozosDeNivelCero(clausula).some((termino) =>
      referencias.includes(termino.trim().split(/\s+/)[0].toLowerCase()),
    );
  });
}

/** Todo fichero de `dir`, sea cual sea su extensión; los enlaces simbólicos no se siguen. */
function ficherosDe(dir: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(dir)) {
    if (entrada === 'node_modules') continue;
    const ruta = join(dir, entrada);
    const estado = lstatSync(ruta);
    if (estado.isDirectory()) encontrados.push(...ficherosDe(ruta));
    else if (estado.isFile()) encontrados.push(ruta);
  }
  return encontrados;
}

describe('Historia 23.12 — ninguna consulta de tools/ ordena por rowid', () => {
  it.each([
    'SELECT ruta FROM eventos ORDER BY rowid',
    'select * from eventos order by jornada, rowid DESC',
    'SELECT e.ruta FROM eventos e ORDER BY e.rowid LIMIT 10',
    'SELECT ruta FROM eventos ORDER BY _rowid_',
    'SELECT ruta FROM eventos ORDER BY oid;',
    "const sql = 'SELECT ruta FROM eventos ORDER BY ' + 'rowid';",
    "const sql =\n  'SELECT ruta FROM eventos ORDER BY jornada, ' +\n  \"rowid\";",
    "const sql =\n  'SELECT ruta FROM eventos ORDER BY ' + // por llegada\n  'rowid';",
    `const sql = 'SELECT ruta FROM eventos ORDER BY "rowid"';`,
    "const sql = 'SELECT ruta FROM eventos ORDER BY `rowid`';",
    'SELECT ruta FROM eventos ORDER BY [rowid]',
    `const sql = 'SELECT e.ruta FROM eventos e ORDER BY "e"."rowid"';`,
    'SELECT ruta FROM eventos ORDER BY lower(ruta), rowid',
    "SELECT ruta FROM eventos ORDER BY CASE evento WHEN 'copiado' THEN 0 ELSE 1 END, rowid",
    'SELECT rowid, ruta FROM eventos ORDER BY 1',
    "const sql = 'SELECT rowid AS fila, ruta FROM eventos ORDER BY fila DESC';",
  ])('el detector marca %j', (texto) => {
    expect(ordenaPorRowid(texto)).toBe(true);
  });

  it.each([
    'SELECT CAST(rowid AS TEXT) AS fila FROM eventos',
    'UPDATE eventos SET rowid = abs(random())',
    'SELECT ruta FROM eventos ORDER BY jornada',
    "const sql = 'SELECT CAST(rowid AS TEXT) FROM eventos ORDER BY jornada';",
    'SELECT ruta FROM eventos ORDER BY jornada LIMIT 1 -- rowid no',
    'SELECT ruta FROM eventos ORDER BY jornada -- no por rowid',
    'SELECT CAST(rowid AS TEXT) AS fila, ruta FROM eventos ORDER BY 2',
    "const a = 'SELECT ruta FROM eventos ORDER BY jornada';\nconst b = 'UPDATE eventos SET rowid = abs(random())';",
    "const consultas = [\n  'SELECT ruta FROM eventos ORDER BY jornada',\n  'SELECT CAST(rowid AS TEXT) FROM eventos',\n];",
  ])('el detector no marca %j', (texto) => {
    expect(ordenaPorRowid(texto)).toBe(false);
  });

  it('se barren los ficheros de tools/, comentarios incluidos, y ninguno ordena por rowid', () => {
    const barridos = ficherosDe(resolve(raiz, 'tools')).map((ruta) => relative(raiz, ruta));
    // Un barrido vacío pasaría siempre: se exige que vea lo que hoy habla con el receptor.
    expect(barridos).toEqual(expect.arrayContaining(['tools/ingreso.ts', 'tools/lib/ingresos.ts']));

    const ordenan = barridos.filter((ruta) =>
      ordenaPorRowid(readFileSync(resolve(raiz, ruta), 'utf8')),
    );
    expect(ordenan, `ordenan por rowid: ${ordenan.join(', ')}`).toEqual([]);
  });
});
