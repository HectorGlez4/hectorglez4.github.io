import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { EVENTOS } from '../../src/lib/medicion.ts';
import { jornadaDe } from '../../medicion/receptor.ts';
import worker from '../../medicion/worker.ts';

const raiz = resolve(import.meta.dirname, '../..');

/** El código sin sus comentarios: lo que de verdad se ejecuta. */
const sinComentarios = (fuente: string) =>
  fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Un literal partido en dos con `+` es una sola cadena para SQLite: aquí también. */
const literalesUnidos = (fuente: string) => fuente.replace(/['"`]\s*\+\s*['"`]/g, '');

/**
 * Historia 23.12 — el orden de llegada no reconstruye a nadie.
 *
 * Sin `rowid` explícito SQLite numera `max(rowid)+1`, y el orden físico de `eventos` es el
 * de llegada: en una ruta poco visitada, la vista, el copiado y la salida de una misma
 * persona quedan seguidos. Con el `rowid` aleatorio esa secuencia no está en la tabla, y
 * ninguna consulta de `tools/` puede devolverla ordenando por él.
 */

describe('Historia 23.12 — el INSERT del Worker da un rowid aleatorio', () => {
  const codigo = literalesUnidos(
    sinComentarios(readFileSync(resolve(raiz, 'medicion/worker.ts'), 'utf8')),
  );

  it('hay un solo INSERT, y es un INSERT INTO eventos sin OR …', () => {
    expect(codigo.match(/\bINSERT\b/gi) ?? []).toHaveLength(1);
    // `OR REPLACE` pisaría otro evento y `OR IGNORE` se saltaría el `catch`: la colisión
    // tiene que ser un error, como el almacén caído.
    expect(codigo).toMatch(/\bINSERT INTO eventos\b/);
    expect(codigo).not.toMatch(/\bINSERT\s+OR\b/i);
  });

  it('la primera columna es rowid y su valor lo genera SQLite, abs(random())', () => {
    const sql = codigo.match(/'(INSERT INTO eventos[^']*)'/)![1];
    const columnas = sql
      .match(/^INSERT INTO eventos \(([^)]+)\)/)![1]
      .split(',')
      .map((columna) => columna.trim());
    expect(columnas[0]).toBe('rowid');
    expect(sql).toMatch(/\bVALUES \(abs\(random\(\)\), \?/);
  });
});

/** Un D1 que apunta lo que se le pide; `fallo` hace que `run()` rechace. */
function d1Falso(fallo?: Error) {
  type Entorno = Parameters<typeof worker.fetch>[1];
  type Sentencia = ReturnType<Entorno['MEDICION']['prepare']>;

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

describe('Historia 23.12 — el adaptador, con un D1 falso', () => {
  it('una baliza válida prepara el INSERT con rowid aleatorio y enlaza seis campos', async () => {
    const { entorno, llamadas } = d1Falso();
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

  it('un rowid repetido pierde el evento y contesta 204, sin lanzar', async () => {
    const { entorno, llamadas } = d1Falso(
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
    const { entorno, llamadas } = d1Falso();
    const respuesta = await worker.fetch(peticion, entorno);

    expect(llamadas.sql).toEqual([]);
    expect(respuesta.status).toBe(204);
    expect(respuesta.body).toBeNull();
  });
});

/**
 * ¿Ordena `texto` por `rowid`? Busca cada cláusula `ORDER BY` —sin distinguir mayúsculas y
 * con los literales concatenados ya unidos— y mira si nombra `rowid`, `_rowid_` u `oid`,
 * solos o cualificados. La cláusula acaba en `;`, una comilla, un paréntesis de cierre,
 * `LIMIT` u `OFFSET`. Nombrar `rowid` fuera de un `ORDER BY` no cuenta: la 23.2 lo leerá
 * con `CAST(rowid AS TEXT)` y lo barajará con `UPDATE … SET rowid`.
 */
function ordenaPorRowid(texto: string): boolean {
  const clausulas = literalesUnidos(texto).matchAll(
    /\bORDER\s+BY\b([\s\S]*?)(?=;|['"`)]|\bLIMIT\b|\bOFFSET\b|$)/gi,
  );
  const nombraRowid = /(?<!\w)(?:_rowid_|rowid|oid)(?!\w)/i;
  return [...clausulas].some(([, clausula]) => nombraRowid.test(clausula));
}

const EXTENSIONES = ['.ts', '.mts', '.mjs', '.js', '.cjs', '.sql'];

function ficherosDe(dir: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) encontrados.push(...ficherosDe(ruta));
    else if (EXTENSIONES.some((extension) => entrada.endsWith(extension))) encontrados.push(ruta);
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
  ])('el detector marca %j', (texto) => {
    expect(ordenaPorRowid(texto)).toBe(true);
  });

  it.each([
    'SELECT CAST(rowid AS TEXT) AS fila FROM eventos',
    'UPDATE eventos SET rowid = abs(random())',
    'SELECT ruta FROM eventos ORDER BY jornada',
    "const sql = 'SELECT CAST(rowid AS TEXT) FROM eventos ORDER BY jornada';",
    'SELECT ruta FROM eventos ORDER BY jornada LIMIT 1 -- rowid no',
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
