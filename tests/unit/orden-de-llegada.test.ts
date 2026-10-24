import { describe, expect, it } from 'vitest';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { EVENTOS } from '../../src/lib/medicion.ts';
import { jornadaDe } from '../../medicion/receptor.ts';
import worker from '../../medicion/worker.ts';
import { d1QueApunta, listaTras, peticionAlReceptor, sqlNeutralizado } from './ayuda/d1.js';

const raiz = resolve(import.meta.dirname, '../..');

/**
 * Historia 23.12 — el orden de llegada no reconstruye a nadie.
 *
 * Sin `rowid` explícito SQLite numera `max(rowid)+1`, y el orden físico de `eventos` es el
 * de llegada: en una ruta poco visitada, la vista, el copiado y la salida de una misma
 * persona quedan seguidos. Con el `rowid` aleatorio esa secuencia no está en la tabla, y
 * aquí se vigila además que ninguna consulta de `tools/` ordene por él.
 *
 * Que SQLite acepte el `rowid` explícito, desordene las filas y lance ante uno repetido se
 * comprueba a mano contra un SQLite real, con los comandos de la sección Verification de
 * `_bmad-output/implementation-artifacts/spec-23-12-el-orden-de-llegada-no-reconstruye-a-nadie.md`;
 * en vivo lo comprueba la baliza de la 23.3. Estas pruebas fijan el SQL que el adaptador envía
 * y lo que hace con la respuesta.
 */

/** Lo que ocupa en una cadena un hueco de plantilla o un operando que no es un literal. */
const HUECO = '${…}';

/** Cómo lee el compilador un fichero, por su extensión; `undefined` si no es código. */
function tipoDeGuion(nombre: string): ts.ScriptKind | undefined {
  switch (extname(nombre)) {
    case '.ts':
    case '.mts':
    case '.cts':
      return ts.ScriptKind.TS;
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.js':
    case '.mjs':
    case '.cjs':
      return ts.ScriptKind.JS;
    case '.jsx':
      return ts.ScriptKind.JSX;
    default:
      return undefined;
  }
}

/**
 * Las cadenas del código de `fuente`, en el orden en que empiezan en el fuente, con los `+`
 * entre literales plegados en una sola: lo que llega a SQLite. Un hueco de plantilla o un
 * operando que no es un literal sale como `${…}`, y las cadenas que haya dentro de él se
 * recogen también, detrás de la que las contiene. Los comentarios no existen para el
 * compilador, así que tampoco aquí: un `// INSERT OR IGNORE` al final de una línea, o uno en
 * prosa que escriba la regla, no es código.
 */
function cadenasDelCodigo(fuente: string, nombre: string): string[] {
  const archivo = ts.createSourceFile(
    nombre,
    fuente,
    ts.ScriptTarget.Latest,
    true,
    tipoDeGuion(nombre) ?? ts.ScriptKind.TS,
  );
  const cadenas: { inicio: number; texto: string }[] = [];

  const plegar = (nodo: ts.Node): string | undefined => {
    if (ts.isStringLiteralLike(nodo)) return nodo.text;
    if (ts.isParenthesizedExpression(nodo)) return plegar(nodo.expression);
    if (ts.isTemplateExpression(nodo)) {
      for (const tramo of nodo.templateSpans) visitar(tramo.expression);
      return nodo.head.text + nodo.templateSpans.map((tramo) => HUECO + tramo.literal.text).join('');
    }
    if (ts.isBinaryExpression(nodo) && nodo.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const izquierda = plegar(nodo.left);
      const derecha = plegar(nodo.right);
      if (izquierda === undefined && derecha === undefined) return undefined;
      if (izquierda === undefined) visitar(nodo.left);
      if (derecha === undefined) visitar(nodo.right);
      return (izquierda ?? HUECO) + (derecha ?? HUECO);
    }
    return undefined;
  };

  const visitar = (nodo: ts.Node): void => {
    const plegada = plegar(nodo);
    if (plegada !== undefined) cadenas.push({ inicio: nodo.getStart(archivo), texto: plegada });
    else ts.forEachChild(nodo, visitar);
  };
  visitar(archivo);
  // `sort` es estable: la cadena que contiene un hueco empieza antes que las de dentro de él.
  return cadenas.sort((a, b) => a.inicio - b.inicio).map(({ texto }) => texto);
}

// Las cadenas que ve el compilador en el adaptador, y entre ellas las que escriben en una
// tabla: no cualquier cadena con «insert» o «replace», que un registro o una cabecera
// podrían llevar, sino las que SQLite ejecutaría como escritura.
const cadenasDelWorker = cadenasDelCodigo(
  readFileSync(resolve(raiz, 'medicion/worker.ts'), 'utf8'),
  'worker.ts',
);
const ESCRITURA =
  /\b(?:(?:INSERT(?:\s+OR\s+\S+)?|REPLACE)\s+INTO|UPDATE\s+(?:OR\s+\S+\s+)?\S+\s+SET|DELETE\s+FROM)\b/i;
const escrituras = cadenasDelWorker.filter((cadena) => ESCRITURA.test(sqlNeutralizado(cadena)));
const [escritura = ''] = escrituras;
const escrituraNeutra = sqlNeutralizado(escritura);

describe('Historia 23.12 — el INSERT del Worker da un rowid aleatorio', () => {
  it('hay una sola escritura —INSERT, REPLACE, UPDATE o DELETE—: un INSERT INTO eventos sin OR …, ON CONFLICT ni RETURNING', () => {
    expect(escrituras).toHaveLength(1);
    // `OR REPLACE` o `REPLACE INTO` pisarían otro evento, y `OR IGNORE` o un `ON CONFLICT
    // DO NOTHING` se saltarían el `catch`: la colisión tiene que ser un error, como el
    // almacén caído. Un `UPDATE … SET rowid` o un `DELETE` en el adaptador serían otra
    // escritura, y la cuenta los ve.
    expect(escrituraNeutra, escritura).toMatch(/^\s*INSERT\s+INTO\s+eventos\b/i);
    expect(escrituraNeutra, escritura).not.toMatch(/\bON\s+CONFLICT\b/i);
    // `RETURNING` devolvería a JavaScript el `rowid` de 64 bits, que lo redondea.
    expect(escrituraNeutra, escritura).not.toMatch(/\bRETURNING\b/i);
  });

  it('la primera columna es rowid, su valor lo genera SQLite y el resto son marcadores', () => {
    const columnas = listaTras(escritura, /^\s*INSERT\s+INTO\s+eventos\s*\(/i);
    const valores = listaTras(escritura, /\bVALUES\s*\(/i);
    expect(columnas?.[0], escritura).toBe('rowid');
    expect(valores?.[0], escritura).toBe('abs(random())');
    // El `rowid` no viaja por `bind`: después del suyo, un `?` por columna.
    expect(valores?.slice(1), escritura).toEqual(columnas?.slice(1).map(() => '?'));
  });

  it('la tabla eventos tiene rowid: sin él, cada INSERT fallaría y el catch lo callaría', () => {
    // Un `WITHOUT ROWID` no tiene columna `rowid`: todo `INSERT` nombrándola lanza, el
    // `catch` lo traga, el receptor sigue contestando 204 y la medición cae a cero sin aviso.
    const esquema = sqlNeutralizado(readFileSync(resolve(raiz, 'medicion/esquema.sql'), 'utf8'));
    expect(esquema).toMatch(/\bCREATE TABLE IF NOT EXISTS eventos\b/);
    expect(esquema).not.toMatch(/\bWITHOUT\s+ROWID\b/i);
  });
});

describe('Historia 23.12 — el adaptador, con un D1 falso', () => {
  it('una baliza válida envía el INSERT declarado, enlaza los seis campos y lo ejecuta una vez', async () => {
    const { entorno, llamadas } = d1QueApunta();
    const antes = jornadaDe(new Date());
    const respuesta = await worker.fetch(
      peticionAlReceptor({ evento: EVENTOS.copiado, ruta: '/cita/una' }),
      entorno,
    );
    const despues = jornadaDe(new Date());

    // El SQL enviado es el que el código declara, y ese ya está fijado arriba: rowid
    // primero y `abs(random())` como su valor.
    expect(escrituras).toHaveLength(1);
    expect(llamadas.sql).toEqual(escrituras);
    // Preparado y enlazado no es escrito: sin `run()` no llega nada a D1.
    expect(llamadas.ejecutadas).toBe(1);
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
      peticionAlReceptor({ evento: EVENTOS.copiado, ruta: '/cita/una' }),
      entorno,
    );

    expect(llamadas.sql).toHaveLength(1);
    expect(llamadas.ejecutadas).toBe(1);
    expect(respuesta.status).toBe(204);
    expect(respuesta.body).toBeNull();
  });

  it.each([
    ['un GET', peticionAlReceptor(undefined, 'GET')],
    // Con cuerpo: si no escribe, es por el método.
    [
      'un PUT con una baliza válida',
      peticionAlReceptor({ evento: EVENTOS.copiado, ruta: '/cita/una' }, 'PUT'),
    ],
    ['un evento fuera del vocabulario', peticionAlReceptor({ evento: 'pageview', ruta: '/cita/una' })],
  ])('%s no escribe y contesta 204', async (_caso, peticion) => {
    const { entorno, llamadas } = d1QueApunta();
    const respuesta = await worker.fetch(peticion, entorno);

    expect(llamadas.sql).toEqual([]);
    expect(llamadas.ejecutadas).toBe(0);
    expect(respuesta.status).toBe(204);
    expect(respuesta.body).toBeNull();
  });
});

/** De dónde sale un texto: una cadena de código, un `.sql` entero o una línea de otro fichero. */
type Origen = 'codigo' | 'sql' | 'linea';

interface TextoSql {
  texto: string;
  origen: Origen;
}

/**
 * Los textos SQL de un fichero. Del código, las cadenas que ve el compilador; de un `.sql`,
 * el fichero entero; de cualquier otra extensión, cada línea, uniendo las que acaban en `\`
 * como las órdenes de terminal.
 */
function textosSql(ruta: string, fuente: string): TextoSql[] {
  if (tipoDeGuion(ruta) !== undefined) {
    return cadenasDelCodigo(fuente, ruta).map((texto) => ({ texto, origen: 'codigo' }));
  }
  if (extname(ruta) === '.sql') return [{ texto: fuente, origen: 'sql' }];
  return fuente
    .replace(/\\\r?\n/g, ' ')
    .split(/\r?\n/)
    .map((texto) => ({ texto, origen: 'linea' }));
}

/** `rowid` y sus dos alias, con límites de palabra que no parten una `ñ` ni una tilde. */
const NOMBRA_ROWID = /(?<![\p{L}\p{N}_])(?:_rowid_|rowid|oid)(?![\p{L}\p{N}_])/iu;
const ORDENA = /\bORDER\s+BY\b/i;
/** Un `ORDER BY` sin término en su sentencia: acaba en él, o en una coma tras él. */
const SIN_TERMINO = /\bORDER\s+BY\b(?:[\s\S]*,)?\s*$/i;
const HUECO_DE_CODIGO = /\$\{…\}/;
/** En una línea de terminal, `$orden` o `${orden}`: lo que valga no está en el fichero. */
const VARIABLE_DE_TERMINAL = /\$(?:\{|\w)/;

/** Una lectura de un texto, y lo que se mira en ella además de que nombre el `rowid`. */
interface Lectura {
  sql: string;
  hueco?: RegExp;
  sinTermino: boolean;
}

/**
 * Cómo se lee cada texto. Una cadena de código puede ser SQL o una orden de terminal con el
 * SQL dentro —`--command 'SELECT …'`, que la lectura como SQL tomaría por un literal y
 * vaciaría—, así que se lee neutralizada y tal cual. Tal cual solo cuenta nombrar el
 * `rowid`: ahí un `${…}` puede ir dentro de un literal (`'${desde}'`), y no es un hueco. Un
 * `.sql` se lee neutralizado, y una línea de otro fichero tal cual, porque sus comillas son
 * del formato; en ella, una variable de terminal es un hueco.
 */
function lecturas({ texto, origen }: TextoSql): Lectura[] {
  switch (origen) {
    case 'codigo':
      return [
        { sql: sqlNeutralizado(texto), hueco: HUECO_DE_CODIGO, sinTermino: true },
        { sql: texto, sinTermino: false },
      ];
    case 'sql':
      return [{ sql: sqlNeutralizado(texto), hueco: HUECO_DE_CODIGO, sinTermino: true }];
    case 'linea':
      return [{ sql: texto, hueco: VARIABLE_DE_TERMINAL, sinTermino: true }];
  }
}

/**
 * ¿Ordena por `rowid` este texto, o no se puede saber? Cada sentencia —los trozos entre `;`—
 * que lleve `ORDER BY` cuenta si nombra `rowid`, `_rowid_` u `oid` en cualquier parte, si
 * lleva un hueco o si deja el `ORDER BY` sin término, porque el término vive en otra cadena.
 *
 * La regla no resuelve alias ni posiciones, y no le hace falta: si ninguna sentencia que
 * ordena nombra el `rowid`, ninguna ordena por él, venga por un alias, un CTE, una tabla
 * derivada o un `UNION`. Es más estricta que el criterio y no le quita nada a la 23.2: la
 * comprobación (`CAST(rowid AS TEXT)`) y el barajado (`UPDATE … SET rowid`) no ordenan, y
 * la 23.10 prohibirá nombrarlo en cualquier otro SQL. Lo que marca de más, a propósito, y
 * su salida están en los casos de control.
 */
function ordenaPorRowid(texto: TextoSql): boolean {
  return lecturas(texto).some(({ sql, hueco, sinTermino }) =>
    sql
      .split(';')
      .some(
        (sentencia) =>
          ORDENA.test(sentencia) &&
          (NOMBRA_ROWID.test(sentencia) ||
            (hueco?.test(sentencia) ?? false) ||
            (sinTermino && SIN_TERMINO.test(sentencia))),
      ),
  );
}

/** ¿Algún texto SQL del fichero `ruta`, con contenido `fuente`, ordena por `rowid`? */
const ficheroOrdenaPorRowid = (ruta: string, fuente: string) =>
  textosSql(ruta, fuente).some(ordenaPorRowid);

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
  it('las cadenas del código salen en el orden del fuente, y la que contiene un hueco antes que las de dentro', () => {
    expect(cadenasDelCodigo('const a = `A ${"B"} C`;\nconst d = "D" + e;', 'orden.ts')).toEqual([
      `A ${HUECO} C`,
      'B',
      `D${HUECO}`,
    ]);
  });

  it.each([
    ['consulta.sql', 'SELECT ruta FROM eventos ORDER BY rowid'],
    ['consulta.sql', 'select * from eventos order by jornada, rowid DESC'],
    ['consulta.sql', 'SELECT e.ruta FROM eventos e ORDER BY e.rowid LIMIT 10'],
    ['consulta.sql', 'SELECT ruta FROM eventos ORDER BY _rowid_'],
    ['consulta.sql', 'SELECT ruta FROM eventos ORDER BY oid;'],
    ['consulta.ts', "const sql = 'SELECT ruta FROM eventos ORDER BY ' + 'rowid';"],
    ['consulta.ts', "const sql =\n  'SELECT ruta FROM eventos ORDER BY jornada, ' +\n  \"rowid\";"],
    ['consulta.ts', "const sql =\n  'SELECT ruta FROM eventos ORDER BY ' + // por llegada\n  'rowid';"],
    ['consulta.ts', `const sql = 'SELECT ruta FROM eventos ORDER BY "rowid"';`],
    ['consulta.ts', "const sql = 'SELECT ruta FROM eventos ORDER BY `rowid`';"],
    ['consulta.sql', 'SELECT ruta FROM eventos ORDER BY [rowid]'],
    ['consulta.ts', `const sql = 'SELECT e.ruta FROM eventos e ORDER BY "e"."rowid"';`],
    ['consulta.sql', 'SELECT ruta FROM eventos ORDER BY lower(ruta), rowid'],
    [
      'consulta.sql',
      "SELECT ruta FROM eventos ORDER BY CASE evento WHEN 'copiado' THEN 0 ELSE 1 END, rowid",
    ],
    ['consulta.sql', 'SELECT rowid, ruta FROM eventos ORDER BY 1'],
    ['consulta.ts', "const sql = 'SELECT rowid AS fila, ruta FROM eventos ORDER BY fila DESC';"],
    // Una comilla de SQL dentro de la cláusula no la acaba.
    ['consulta.ts', `const sql = "SELECT ruta FROM eventos ORDER BY coalesce(origen, ''), rowid";`],
    [
      'consulta.ts',
      `const sql = "SELECT ruta FROM eventos ORDER BY evento IN ('copiado','visto'), rowid";`,
    ],
    ['consulta.ts', "const sql = `SELECT ruta FROM eventos ORDER BY ruta = '/cita/x', rowid`;"],
    // Posición y alias, de cualquier expresión con el `rowid`: la sentencia que ordena lo nombra.
    [
      'consulta.sql',
      'SELECT rowid AS fila, ruta FROM eventos WHERE ruta IN (SELECT ruta FROM otros) ORDER BY fila',
    ],
    ['consulta.sql', 'SELECT CAST(rowid AS TEXT) AS fila, ruta FROM eventos ORDER BY fila'],
    ['consulta.sql', 'SELECT CAST(rowid AS TEXT), ruta FROM eventos ORDER BY 1'],
    ['consulta.sql', 'SELECT rowid + 0 AS r, ruta FROM eventos ORDER BY r'],
    ['consulta.sql', 'SELECT CAST(rowid AS INTEGER) n, ruta FROM eventos ORDER BY n'],
    ['consulta.sql', 'SELECT rowid AS fila, ruta FROM eventos ORDER BY (fila)'],
    ['consulta.sql', 'SELECT ruta, row_number() OVER (ORDER BY rowid) FROM eventos'],
    // Ni un CTE, ni una tabla derivada, ni un `UNION`, ni `*`, ni una expresión, ni una `ñ`
    // sacan el `rowid` de la sentencia que ordena.
    ['consulta.sql', 'WITH t AS (SELECT rowid AS r, ruta FROM eventos) SELECT ruta FROM t ORDER BY r'],
    ['consulta.sql', 'SELECT * FROM (SELECT ruta, rowid r FROM eventos) ORDER BY r'],
    ['consulta.sql', 'SELECT rowid AS r, ruta FROM a UNION ALL SELECT 0, ruta FROM b ORDER BY r'],
    ['consulta.sql', 'SELECT *, rowid FROM eventos ORDER BY 7'],
    ['consulta.sql', 'SELECT rowid AS fila, ruta FROM eventos ORDER BY -fila'],
    ['consulta.sql', 'SELECT rowid AS fila, ruta FROM eventos ORDER BY abs(fila)'],
    ['consulta.sql', 'SELECT rowid AS año, ruta FROM eventos ORDER BY año'],
    // Lo que no está en la cadena no se puede juzgar, y cuenta como que ordena por él.
    ['consulta.ts', 'const sql = `SELECT ruta FROM eventos ORDER BY ${columna}`;'],
    ['consulta.ts', "const sql = 'SELECT ruta FROM eventos ORDER BY ' + orden;"],
    ['consulta.ts', "const sql = 'SELECT ruta FROM eventos ' + f('ORDER BY rowid');"],
    ['consulta.ts', 'const sql = `SELECT ${columnas} FROM eventos ORDER BY 1`;'],
    // El término en otra cadena: el `ORDER BY` se queda sin él, o acaba en coma.
    ['consulta.ts', "let sql = 'SELECT ruta FROM eventos ORDER BY ';\nsql += 'rowid';"],
    [
      'consulta.ts',
      "const base = 'SELECT ruta FROM eventos ORDER BY jornada,';\nconst sql = base + ' rowid';",
    ],
    ['consulta.ts', "const sql = ['SELECT ruta FROM eventos', 'ORDER BY', 'rowid'].join(' ');"],
    // Una orden de terminal en una cadena de código: `--remote` es una bandera, no un
    // comentario, y el SQL entre comillas simples de terminal no es un literal de SQL.
    [
      'consulta.ts',
      'const orden = `npx wrangler d1 execute medicion --remote --command "SELECT ruta FROM eventos ORDER BY rowid"`;',
    ],
    [
      'consulta.ts',
      "const orden = \"npx wrangler d1 execute medicion --remote --command 'SELECT ruta FROM eventos ORDER BY rowid'\";",
    ],
    [
      'consulta.ts',
      'const orden = `npx wrangler d1 execute medicion --remote --command "SELECT CAST(rowid AS TEXT) AS fila FROM eventos WHERE ruta=\'/__comprobacion/\' ORDER BY fila"`;',
    ],
    [
      'consulta.ts',
      'const orden = `npx wrangler d1 execute medicion --remote --command "SELECT ruta FROM eventos ORDER BY ${columna}"`;',
    ],
    // Un comentario `--` con `)` o `;` no corta la cláusula.
    ['consulta.sql', "SELECT ruta FROM eventos ORDER BY jornada -- (sigue); no es el fin\n  , rowid"],
    ['consulta.sql', 'SELECT ruta\nFROM eventos\nORDER BY jornada,\n  rowid;'],
    [
      'consulta.sh',
      'npx wrangler d1 execute medicion --remote --command \\\n  "SELECT ruta FROM eventos ORDER BY jornada, \\\n  rowid"',
    ],
    // En una línea de terminal, una variable es un hueco, y un `ORDER BY` al final de la
    // línea deja el término en la siguiente.
    ['consulta.sh', 'sqlite3 base.db "SELECT ruta FROM eventos ORDER BY $orden"'],
    ['consulta.sh', 'sqlite3 base.db "SELECT ruta FROM eventos ORDER BY ${orden}"'],
    [
      'consulta.sh',
      'npx wrangler d1 execute medicion --remote --command "SELECT ruta FROM eventos ORDER BY\n  rowid"',
    ],
  ])('el detector marca %s: %j', (ruta, texto) => {
    expect(ficheroOrdenaPorRowid(ruta, texto)).toBe(true);
  });

  // Más estricto que el criterio, a propósito: así no hay caminos que seguir. Cada caso
  // lleva su salida, y ninguno le hace falta a la 23.2.
  it.each([
    // Nombra el `rowid` y ordena por otra cosa: se ordena en JavaScript, o se separa en una
    // sentencia que lo lee y otra que ordena.
    ['consulta.ts', "const sql = 'SELECT CAST(rowid AS TEXT) FROM eventos ORDER BY jornada';"],
    ['consulta.sql', 'SELECT CAST(rowid AS TEXT) AS fila, ruta FROM eventos ORDER BY 2'],
    ['consulta.sql', 'SELECT jornada, ruta FROM (SELECT rowid, jornada, ruta FROM eventos) ORDER BY 1'],
    // Se cuenta con `count(*)`, no con `count(rowid)`.
    ['consulta.sql', 'SELECT count(rowid) AS n, ruta FROM eventos GROUP BY ruta ORDER BY n'],
    // Un hueco en una sentencia que ordena: lo que varía va enlazado con `?`, dentro de un
    // literal, o en literales completos, uno por variante.
    ['consulta.ts', 'const sql = `SELECT ruta FROM eventos ORDER BY jornada LIMIT ${n}`;'],
    ['consulta.ts', "const sql = 'SELECT ruta FROM eventos ORDER BY ' + COLUMNA;"],
    [
      'consulta.ts',
      "const sql = 'SELECT ruta FROM eventos ORDER BY jornada ' + (asc ? 'ASC' : 'DESC');",
    ],
    // En una cadena de código, la lectura tal cual no distingue un literal ni un comentario
    // de SQL: el `rowid` no se nombra en una sentencia que ordena, ni ahí.
    ['consulta.ts', `const sql = "SELECT ruta FROM eventos WHERE ruta <> 'rowid' ORDER BY jornada";`],
    ['consulta.ts', "const sql = 'SELECT ruta FROM eventos ORDER BY jornada -- no por rowid';"],
  ])('el detector marca a propósito, sin orden por rowid, %s: %j', (ruta, texto) => {
    expect(ficheroOrdenaPorRowid(ruta, texto)).toBe(true);
  });

  it.each([
    ['consulta.sql', 'SELECT CAST(rowid AS TEXT) AS fila FROM eventos'],
    ['consulta.sql', 'UPDATE eventos SET rowid = abs(random())'],
    ['consulta.sql', 'SELECT ruta FROM eventos ORDER BY jornada'],
    ['consulta.sql', 'SELECT ruta FROM eventos ORDER BY jornada LIMIT 1 -- rowid no'],
    ['consulta.sql', 'SELECT ruta FROM eventos ORDER BY jornada -- no por rowid'],
    ['consulta.sql', 'SELECT ruta FROM eventos ORDER BY jornada /* no por rowid */'],
    [
      'consulta.ts',
      "const a = 'SELECT ruta FROM eventos ORDER BY jornada';\nconst b = 'UPDATE eventos SET rowid = abs(random())';",
    ],
    [
      'consulta.ts',
      "const consultas = [\n  'SELECT ruta FROM eventos ORDER BY jornada',\n  'SELECT CAST(rowid AS TEXT) FROM eventos',\n];",
    ],
    // Cada cadena es un texto: la cláusula no sigue por la sentencia ni por el comentario.
    [
      'consulta.ts',
      "const a = 'SELECT ruta FROM eventos ORDER BY jornada'\nconst b = 'UPDATE eventos SET rowid = abs(random())'",
    ],
    ['consulta.ts', "const a = 'SELECT ruta FROM eventos ORDER BY jornada' // nunca por rowid"],
    ['consulta.ts', "// Sin ORDER BY, porque el rowid es aleatorio.\nconst a = 'SELECT ruta FROM eventos';"],
    [
      'consulta.yml',
      'consulta: SELECT ruta FROM eventos ORDER BY jornada\nbarajado: UPDATE eventos SET rowid = abs(random())',
    ],
    ['consulta.sql', 'SELECT ruta FROM eventos ORDER BY jornada; UPDATE eventos SET rowid = abs(random());'],
    // Un `ORDER BY rowid` dentro de un literal de SQL no ordena nada.
    ['consulta.sql', "SELECT ruta FROM eventos WHERE ruta <> 'ORDER BY rowid' ORDER BY jornada"],
    [
      'consulta.ts',
      "const sql = `SELECT ruta FROM eventos WHERE ruta = '${ruta}' ORDER BY jornada`;",
    ],
    // Lo que traerá la 23.2, en una orden de `wrangler`: la comprobación y el barajado no
    // ordenan, y una orden que lleva el SQL en una variable no ordena en su cadena.
    [
      'consulta.ts',
      'const orden = `npx wrangler d1 execute medicion --remote --command "SELECT CAST(rowid AS TEXT) AS fila FROM eventos WHERE ruta=\'/__comprobacion/\'"`;',
    ],
    [
      'consulta.ts',
      "const orden = 'npx wrangler d1 execute medicion --remote --command \"UPDATE eventos SET rowid = abs(random())\"';",
    ],
    ['consulta.ts', 'const orden = `npx wrangler d1 execute medicion --remote --command "${sql}"`;'],
    // Un hueco dentro de un literal no es un hueco: una lectura por jornada, como la de la 23.10.
    [
      'consulta.ts',
      'const orden = `npx wrangler d1 execute medicion --remote --command "SELECT jornada, evento, COUNT(*) FROM eventos WHERE jornada >= \'${desde}\' GROUP BY jornada, evento ORDER BY jornada"`;',
    ],
    [
      'consulta.sh',
      'npx wrangler d1 execute medicion --remote --command "SELECT ruta FROM eventos ORDER BY jornada"',
    ],
  ])('el detector no marca %s: %j', (ruta, texto) => {
    expect(ficheroOrdenaPorRowid(ruta, texto)).toBe(false);
  });

  // Leída línea a línea, la cadena partida no marcaría y el comentario sí: lo contrario dice
  // que la extensión pasa por el compilador.
  it.each(['.ts', '.mts', '.cts', '.tsx', '.js', '.mjs', '.cjs', '.jsx'])(
    'un %s pasa por el compilador: su cadena partida cuenta y su comentario no',
    (extension) => {
      const ruta = `consulta${extension}`;
      expect(
        ficheroOrdenaPorRowid(
          ruta,
          "const sql =\n  'SELECT ruta FROM eventos ORDER BY jornada, ' +\n  'rowid';",
        ),
      ).toBe(true);
      expect(
        ficheroOrdenaPorRowid(
          ruta,
          "// SELECT ruta FROM eventos ORDER BY rowid\nconst sql = 'SELECT ruta FROM eventos';",
        ),
      ).toBe(false);
    },
  );

  it('se barren los ficheros de tools/, y ninguna de sus consultas ordena por rowid', () => {
    const barridos = ficherosDe(resolve(raiz, 'tools')).map((ruta) => relative(raiz, ruta));
    const fuentes = new Map(barridos.map((ruta) => [ruta, readFileSync(resolve(raiz, ruta), 'utf8')]));

    // Un barrido vacío pasaría siempre: se exige que vea lo que hoy habla del receptor y que
    // saque textos de ahí, sin depender de lo que digan.
    for (const conocido of ['tools/ingreso.ts', 'tools/lib/ingresos.ts']) {
      expect(barridos).toContain(conocido);
      expect(textosSql(conocido, fuentes.get(conocido) ?? '').length, conocido).toBeGreaterThan(0);
    }

    const ordenan = barridos.filter((ruta) => ficheroOrdenaPorRowid(ruta, fuentes.get(ruta) ?? ''));
    expect(ordenan, `ordenan por rowid: ${ordenan.join(', ')}`).toEqual([]);
  });
});
