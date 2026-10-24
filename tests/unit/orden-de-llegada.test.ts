import { describe, expect, it } from 'vitest';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { EVENTOS } from '../../src/lib/medicion.ts';
import { jornadaDe } from '../../medicion/receptor.ts';
import worker from '../../medicion/worker.ts';
import { d1QueApunta, listaTras, peticionAlReceptor } from './ayuda/d1.js';

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
 * comprueba a mano contra un SQLite real (los comandos están en el spec de la historia); en
 * vivo lo comprueba la baliza de la 23.3. Estas pruebas fijan el SQL que el adaptador envía
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
 * Las cadenas del código de `fuente`, en orden, con los `+` entre literales plegados en una
 * sola: lo que llega a SQLite. Un hueco de plantilla o un operando que no es un literal sale
 * como `${…}`, y las cadenas que haya dentro de él se recogen también. Los comentarios no
 * existen para el compilador, así que tampoco aquí: un `// INSERT OR IGNORE` al final de una
 * línea, o uno en prosa que escriba la regla, no es código.
 */
function cadenasDelCodigo(fuente: string, nombre: string): string[] {
  const archivo = ts.createSourceFile(
    nombre,
    fuente,
    ts.ScriptTarget.Latest,
    true,
    tipoDeGuion(nombre) ?? ts.ScriptKind.TS,
  );
  const cadenas: string[] = [];

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
    if (plegada !== undefined) cadenas.push(plegada);
    else ts.forEachChild(nodo, visitar);
  };
  visitar(archivo);
  return cadenas;
}

// Las cadenas que ve el compilador en el adaptador, y entre ellas las que escriben en una
// tabla: no cualquier cadena con «insert» o «replace», que un registro o una cabecera
// podrían llevar.
const cadenasDelWorker = cadenasDelCodigo(
  readFileSync(resolve(raiz, 'medicion/worker.ts'), 'utf8'),
  'worker.ts',
);
const escrituras = cadenasDelWorker.filter((cadena) =>
  /\b(?:INSERT(?:\s+OR\s+\w+)?|REPLACE)\s+INTO\b/i.test(cadena),
);
const [escritura = ''] = escrituras;

describe('Historia 23.12 — el INSERT del Worker da un rowid aleatorio', () => {
  it('hay una sola escritura, un INSERT INTO eventos sin OR …, ON CONFLICT ni RETURNING', () => {
    expect(escrituras).toHaveLength(1);
    // `OR REPLACE` o `REPLACE INTO` pisarían otro evento, y `OR IGNORE` o un `ON CONFLICT
    // DO NOTHING` se saltarían el `catch`: la colisión tiene que ser un error, como el
    // almacén caído.
    expect(escritura).toMatch(/^INSERT INTO eventos\b/);
    expect(escritura).not.toMatch(/\bON\s+CONFLICT\b/i);
    // `RETURNING` devolvería a JavaScript el `rowid` de 64 bits, que lo redondea.
    expect(escritura).not.toMatch(/\bRETURNING\b/i);
  });

  it('la primera columna es rowid, su valor lo genera SQLite y el resto son marcadores', () => {
    const columnas = listaTras(escritura, /^INSERT INTO eventos\s*\(/);
    const valores = listaTras(escritura, /\bVALUES\s*\(/);
    expect(columnas?.[0], escritura).toBe('rowid');
    expect(valores?.[0], escritura).toBe('abs(random())');
    // El `rowid` no viaja por `bind`: después del suyo, un `?` por columna.
    expect(valores?.slice(1), escritura).toEqual(columnas?.slice(1).map(() => '?'));
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
  it('una baliza válida envía el INSERT declarado y enlaza los seis campos', async () => {
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
    expect(respuesta.status).toBe(204);
    expect(respuesta.body).toBeNull();
  });

  it.each([
    ['un GET', peticionAlReceptor(undefined, 'GET')],
    ['un evento fuera del vocabulario', peticionAlReceptor({ evento: 'pageview', ruta: '/cita/una' })],
  ])('%s no escribe y contesta 204', async (_caso, peticion) => {
    const { entorno, llamadas } = d1QueApunta();
    const respuesta = await worker.fetch(peticion, entorno);

    expect(llamadas.sql).toEqual([]);
    expect(respuesta.status).toBe(204);
    expect(respuesta.body).toBeNull();
  });
});

/**
 * Los textos SQL de un fichero. Del código, las cadenas que ve el compilador; de un `.sql`,
 * el fichero entero; de cualquier otra extensión, cada línea, uniendo las que acaban en `\`
 * como las órdenes de terminal.
 */
function textosSql(ruta: string, fuente: string): { texto: string; esSql: boolean }[] {
  if (tipoDeGuion(ruta) !== undefined) {
    return cadenasDelCodigo(fuente, ruta).map((texto) => ({ texto, esSql: true }));
  }
  if (extname(ruta) === '.sql') return [{ texto: fuente, esSql: true }];
  return fuente
    .replace(/\\\r?\n/g, ' ')
    .split(/\r?\n/)
    .map((texto) => ({ texto, esSql: false }));
}

/**
 * Para SQLite, `'…'` es un literal —y un `ORDER BY rowid` dentro no ordena nada—; `"rowid"`,
 * `` `rowid` `` y `[rowid]` son el identificador `rowid`; y `--` y `/* *\/` son comentarios.
 * Los literales quedan vacíos, los identificadores sin sus comillas y los comentarios fuera.
 */
const PIEZAS_DE_SQL =
  /'(?:[^']|'')*'|"((?:[^"]|"")*)"|`((?:[^`]|``)*)`|\[([^\]]*)\]|--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/g;

const sqlNeutralizado = (sql: string) =>
  sql.replace(PIEZAS_DE_SQL, (pieza, doble?: string, grave?: string, corchete?: string) => {
    if (pieza.startsWith("'")) return "''";
    const identificador = doble ?? grave ?? corchete;
    return identificador === undefined ? ' ' : ` ${identificador} `;
  });

const NOMBRA_ROWID = /(?<!\w)(?:_rowid_|rowid|oid)(?!\w)/i;

/**
 * El nivel de paréntesis de cada posición de `texto`. Un paréntesis tiene el nivel de fuera:
 * el `(` y el `)` de `lower(ruta)` están en el nivel de la cláusula que los contiene.
 */
function nivelesDe(texto: string): number[] {
  const niveles: number[] = [];
  let nivel = 0;
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] === ')') nivel--;
    niveles.push(nivel);
    if (texto[i] === '(') nivel++;
  }
  return niveles;
}

/** ¿Empieza en `i` la palabra clave `clave`, sin letras pegadas delante? */
const empiezaPalabra = (texto: string, i: number, clave: RegExp) => {
  if (/\w/.test(texto[i - 1] ?? '')) return false;
  clave.lastIndex = i;
  return clave.test(texto);
};

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

/** `(fila)` es `fila`: se quitan los paréntesis que envuelven el término entero. */
function sinParentesisQueEnvuelven(termino: string): string {
  let texto = termino.trim();
  while (texto.startsWith('(') && texto.endsWith(')')) {
    let nivel = 0;
    for (let i = 0; i < texto.length - 1; i++) {
      if (texto[i] === '(') nivel++;
      else if (texto[i] === ')') nivel--;
      if (nivel === 0) return texto;
    }
    texto = texto.slice(1, -1).trim();
  }
  return texto;
}

/**
 * Las posiciones (desde 1) y los alias con que el `SELECT` del mismo nivel que el `ORDER BY`
 * de `orden` saca algo que nombra el `rowid` —solo o en una expresión, `CAST(rowid AS TEXT)
 * AS fila`—: `ORDER BY 1` u `ORDER BY fila` ordenan por él igual que nombrándolo. El `SELECT`
 * de una subconsulta no cuenta, y fuera del paréntesis que contiene el `ORDER BY` no se busca.
 */
function referenciasAlRowid(sql: string, niveles: number[], orden: number): string[] {
  const nivel = niveles[orden];
  let select: number | undefined;
  for (let i = orden - 1; i >= 0 && niveles[i] >= nivel; i--) {
    if (niveles[i] === nivel && empiezaPalabra(sql, i, /SELECT\b/iy)) {
      select = i;
      break;
    }
  }
  if (select === undefined) return [];

  const desde = select + 'SELECT'.length;
  let hasta = orden;
  for (let i = desde; i < orden; i++) {
    if (niveles[i] === nivel && empiezaPalabra(sql, i, /FROM\b/iy)) {
      hasta = i;
      break;
    }
  }
  const lista = sql.slice(desde, hasta).replace(/^\s*(?:DISTINCT|ALL)\b/i, '');

  return trozosDeNivelCero(lista).flatMap((elemento, indice) => {
    if (!NOMBRA_ROWID.test(elemento)) return [];
    const alias = /([A-Za-z_]\w*)\s*$/.exec(elemento)?.[1]?.toLowerCase();
    return alias === undefined ? [String(indice + 1)] : [String(indice + 1), alias];
  });
}

/**
 * ¿Ordena por `rowid` este texto SQL? Cada `ORDER BY` abarca hasta el `;`, el paréntesis que
 * cierra su nivel, un `LIMIT` u `OFFSET` de su nivel o el final, y ordena por `rowid` si la
 * cláusula nombra `rowid`, `_rowid_` u `oid`; si lleva un `${…}`, porque no se sabe por qué
 * ordena; o si un término es la posición o el alias de un `rowid` de su `SELECT`. Nombrar
 * `rowid` fuera de un `ORDER BY` no cuenta: la 23.2 lo leerá con `CAST(rowid AS TEXT)` y lo
 * barajará con `UPDATE … SET rowid`, y estrecharlo a solo esos es de la 23.10.
 */
function ordenaPorRowid({ texto, esSql }: { texto: string; esSql: boolean }): boolean {
  const sql = esSql ? sqlNeutralizado(texto) : texto;
  const niveles = nivelesDe(sql);
  return [...sql.matchAll(/\bORDER\s+BY\b/gi)].some((orden) => {
    const nivel = niveles[orden.index];
    const desde = orden.index + orden[0].length;
    let hasta = sql.length;
    for (let i = desde; i < sql.length; i++) {
      const fin =
        niveles[i] < nivel ||
        (niveles[i] === nivel && (sql[i] === ';' || empiezaPalabra(sql, i, /(?:LIMIT|OFFSET)\b/iy)));
      if (fin) {
        hasta = i;
        break;
      }
    }
    const clausula = sql.slice(desde, hasta);
    if (NOMBRA_ROWID.test(clausula) || clausula.includes(HUECO)) return true;

    const referencias = referenciasAlRowid(sql, niveles, orden.index);
    return trozosDeNivelCero(clausula).some((termino) =>
      referencias.includes(sinParentesisQueEnvuelven(termino).split(/\s+/)[0].toLowerCase()),
    );
  });
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
    // Posición y alias: del `SELECT` de su nivel, y de cualquier expresión con el `rowid`.
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
    // Lo que no está en la cadena no se puede juzgar, y cuenta como que ordena por él.
    ['consulta.ts', 'const sql = `SELECT ruta FROM eventos ORDER BY ${columna}`;'],
    ['consulta.ts', "const sql = 'SELECT ruta FROM eventos ORDER BY ' + orden;"],
    ['consulta.ts', "const sql = 'SELECT ruta FROM eventos ' + f('ORDER BY rowid');"],
    // Un comentario `--` con `)` o `;` no corta la cláusula.
    ['consulta.sql', "SELECT ruta FROM eventos ORDER BY jornada -- (sigue); no es el fin\n  , rowid"],
    ['consulta.sql', 'SELECT ruta\nFROM eventos\nORDER BY jornada,\n  rowid;'],
    [
      'consulta.sh',
      'npx wrangler d1 execute medicion --remote --command \\\n  "SELECT ruta FROM eventos ORDER BY jornada, \\\n  rowid"',
    ],
  ])('el detector marca %s: %j', (ruta, texto) => {
    expect(ficheroOrdenaPorRowid(ruta, texto)).toBe(true);
  });

  it.each([
    ['consulta.sql', 'SELECT CAST(rowid AS TEXT) AS fila FROM eventos'],
    ['consulta.sql', 'UPDATE eventos SET rowid = abs(random())'],
    ['consulta.sql', 'SELECT ruta FROM eventos ORDER BY jornada'],
    ['consulta.ts', "const sql = 'SELECT CAST(rowid AS TEXT) FROM eventos ORDER BY jornada';"],
    ['consulta.sql', 'SELECT ruta FROM eventos ORDER BY jornada LIMIT 1 -- rowid no'],
    ['consulta.sql', 'SELECT ruta FROM eventos ORDER BY jornada -- no por rowid'],
    ['consulta.sql', 'SELECT ruta FROM eventos ORDER BY jornada /* no por rowid */'],
    ['consulta.sql', 'SELECT CAST(rowid AS TEXT) AS fila, ruta FROM eventos ORDER BY 2'],
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
    // La posición es del `SELECT` de su nivel, no del de la subconsulta.
    ['consulta.sql', 'SELECT jornada, ruta FROM (SELECT rowid, jornada, ruta FROM eventos) ORDER BY 1'],
    // Un `ORDER BY rowid` dentro de un literal de SQL no ordena nada.
    ['consulta.sql', "SELECT ruta FROM eventos WHERE ruta <> 'ORDER BY rowid' ORDER BY jornada"],
    [
      'consulta.ts',
      "const sql = `SELECT ruta FROM eventos WHERE ruta = '${ruta}' ORDER BY jornada`;",
    ],
  ])('el detector no marca %s: %j', (ruta, texto) => {
    expect(ficheroOrdenaPorRowid(ruta, texto)).toBe(false);
  });

  it('se barren los ficheros de tools/, y ninguna de sus consultas ordena por rowid', () => {
    const barridos = ficherosDe(resolve(raiz, 'tools')).map((ruta) => relative(raiz, ruta));
    const fuentes = new Map(barridos.map((ruta) => [ruta, readFileSync(resolve(raiz, ruta), 'utf8')]));

    // Un barrido vacío pasaría siempre: se exige que vea lo que hoy habla del receptor, y
    // que la extracción llegue a la cadena que remite a D1.
    expect(barridos).toEqual(expect.arrayContaining(['tools/ingreso.ts', 'tools/lib/ingresos.ts']));
    const deIngresos = textosSql('tools/lib/ingresos.ts', fuentes.get('tools/lib/ingresos.ts') ?? '');
    expect(deIngresos.some(({ texto }) => /\bd1 execute\b/.test(texto))).toBe(true);

    const ordenan = barridos.filter((ruta) => ficheroOrdenaPorRowid(ruta, fuentes.get(ruta) ?? ''));
    expect(ordenan, `ordenan por rowid: ${ordenan.join(', ')}`).toEqual([]);
  });
});
