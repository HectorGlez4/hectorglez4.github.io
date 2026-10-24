import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { CAMPOS, CAMPOS_DE_EVENTO, EVENTOS_VALIDOS } from '../../src/lib/vocabulario.ts';
import { listaTras, sqlNeutralizado } from './ayuda/d1.js';

const raiz = resolve(import.meta.dirname, '../..');
const DIRECTORIO = resolve(raiz, 'medicion/migrations');

/**
 * Historia 23.2, AD-14 — el esquema de D1 cambia solo por migraciones aditivas y versionadas.
 *
 * Todo se lee a través de `sqlNeutralizado`, como cualquier SQL de las pruebas: un comentario o
 * un literal no cuentan como columna ni como sentencia. Que la `0000` no cambie la tabla de
 * producción y que la `0001` deje las columnas de `esquema.sql` se comprueba además a mano con
 * `sqlite3` (Verification de la spec de la 23.2), y en local con `npm run medicion -- local`.
 */

const ficheros = readdirSync(DIRECTORIO).sort();
const leer = (nombre: string) => readFileSync(resolve(DIRECTORIO, nombre), 'utf8');

/** Las sentencias de un SQL, neutralizadas y sin vacías. */
const sentencias = (sql: string) =>
  sqlNeutralizado(sql)
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s !== '');

/** Las definiciones de columna del `CREATE TABLE … eventos (…)` de un SQL, normalizadas. */
const definiciones = (sql: string) =>
  (listaTras(sql, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+eventos\s*\(/i) ?? []).map((d) => d.replace(/\s+/g, ' '));

const nombreDe = (definicion: string) => definicion.split(' ')[0];

/** Los índices de un SQL, normalizados. */
const indices = (sql: string) => sentencias(sql).filter((s) => /^CREATE INDEX/i.test(s));

const [PARTIDA, VOCABULARIO_V8] = ficheros;

describe('Historia 23.2 — las migraciones', () => {
  it('son la 0000 y la 0001, con nombre de cuatro cifras, consecutivas', () => {
    expect(ficheros).toEqual(['0000_tabla_de_partida.sql', '0001_vocabulario_de_la_v8.sql']);
    ficheros.forEach((nombre, i) => {
      expect(nombre).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/);
      expect(nombre.slice(0, 4)).toBe(String(i).padStart(4, '0'));
    });
  });

  it('la 0000 es la tabla de producción tal cual: seis columnas y dos índices, con IF NOT EXISTS', () => {
    const sql = leer(PARTIDA);
    expect(definiciones(sql)).toEqual([
      'jornada TEXT NOT NULL',
      'evento TEXT NOT NULL',
      'ruta TEXT NOT NULL',
      'origen TEXT',
      'destino TEXT',
      'consulta TEXT',
    ]);
    expect(indices(sql)).toEqual([
      'CREATE INDEX IF NOT EXISTS eventos_por_jornada ON eventos (jornada, evento)',
      'CREATE INDEX IF NOT EXISTS eventos_por_origen ON eventos (origen, jornada)',
    ]);
    // Tres sentencias y ninguna más: la tabla y sus dos índices, todo con IF NOT EXISTS.
    expect(sentencias(sql)).toHaveLength(3);
    for (const sentencia of sentencias(sql)) expect(sentencia).toMatch(/^CREATE (TABLE|INDEX) IF NOT EXISTS /);
  });

  it('la 0001 son solo ALTER TABLE eventos ADD COLUMN, una por campo nuevo, TEXT y nula', () => {
    const altas = sentencias(leer(VOCABULARIO_V8));
    expect(altas.length).toBeGreaterThan(0);
    for (const alta of altas) expect(alta).toMatch(/^ALTER TABLE eventos ADD COLUMN [a-z_]+ TEXT$/);
    expect(altas.map((alta) => alta.split(' ')[5])).toEqual(['via', 'zona', 'tramo', 'filtros', 'indexable', 'primera']);
  });

  it('ninguna migración borra, renombra, reescribe filas ni se revierte', () => {
    for (const nombre of ficheros) {
      expect(sqlNeutralizado(leer(nombre)), nombre).not.toMatch(/\b(DROP|RENAME|DELETE|UPDATE|INSERT|REPLACE)\b/i);
    }
  });

  it('las columnas de 0000 + 0001, en orden, son las de esquema.sql: jornada, evento, ruta y cada campo del vocabulario', () => {
    const acumuladas = [
      ...definiciones(leer(PARTIDA)).map(nombreDe),
      ...sentencias(leer(VOCABULARIO_V8)).map((alta) => alta.split(' ')[5]),
    ];
    const esquema = readFileSync(resolve(raiz, 'medicion/esquema.sql'), 'utf8');
    expect(definiciones(esquema).map(nombreDe)).toEqual(acumuladas);
    expect(acumuladas).toEqual(['jornada', 'evento', 'ruta', ...CAMPOS]);

    // Y los campos son los que declara algún evento de CAMPOS_DE_EVENTO, ni uno más.
    const declarados = new Set(EVENTOS_VALIDOS.flatMap((e) => Object.keys(CAMPOS_DE_EVENTO[e])));
    expect(acumuladas.slice(3).sort()).toEqual([...declarados].sort());

    // Los tipos y la nulidad, también: las tres primeras NOT NULL, el resto TEXT nulo.
    expect(definiciones(esquema)).toEqual([...definiciones(leer(PARTIDA)), ...acumuladas.slice(6).map((c) => `${c} TEXT`)]);
  });

  it('los índices de esquema.sql son los de la 0000', () => {
    const esquema = readFileSync(resolve(raiz, 'medicion/esquema.sql'), 'utf8');
    expect(indices(esquema)).toEqual(indices(leer(PARTIDA)));
  });

  it('wrangler.toml declara migrations_dir en la base de la medición', () => {
    const configuracion = readFileSync(resolve(raiz, 'medicion/wrangler.toml'), 'utf8');
    const bloque = configuracion.slice(configuracion.indexOf('[[d1_databases]]'));
    expect(bloque).toMatch(/\nbinding = "MEDICION"/);
    expect(bloque).toMatch(/\nmigrations_dir = "migrations"/);
  });
});
