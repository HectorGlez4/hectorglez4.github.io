import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { RAIZ } from './ayuda/construir.js';
import { TRADICIONES } from '../../tools/lib/gestion.ts';

const ejecutar = promisify(execFile);

/**
 * Historia 11.4 — la orden de Autores sobre disco.
 *
 * Lo puro está en `gestion.test.ts`. Aquí se mide lo que solo se ve ejecutando la orden: que
 * `--tradicion` llegue de verdad al fichero, y que lo que la orden no entiende **se rechace
 * en vez de tragarse**.
 *
 * Ese segundo caso es el que da nombre a este fichero. Durante toda la v2 la orden no tenía
 * guardián de banderas y no aceptaba `--tradicion`, así que teclearla producía exactamente
 * esto: un Autor creado, un «Autor «…» creado.» por salida estándar, código 0, y el campo
 * ausente del fichero. El suelo del 40 % no se movía y no había ni un mensaje que mirar. La
 * prueba de que la bandera funciona vale menos que la prueba de que una bandera inventada
 * ya no pasa de largo.
 *
 * Nada de esto toca `corpus/`: todo ocurre en corpus temporales.
 */

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function corpusVacio(): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-autor-cli-'));
  temporales.push(raiz);
  const directorio = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', '_revision']) {
    await mkdir(join(directorio, dir), { recursive: true });
  }
  return directorio;
}

async function correr(corpus: string, argumentos: string[]) {
  try {
    const { stdout, stderr } = await ejecutar(
      'npx',
      ['tsx', join(RAIZ, 'tools/autor.ts'), ...argumentos, '--corpus', corpus],
      { cwd: RAIZ },
    );
    return { codigo: 0, salida: stdout, error: stderr };
  } catch (fallo) {
    const f = fallo as { code?: number; stdout?: string; stderr?: string };
    return { codigo: f.code ?? 1, salida: f.stdout ?? '', error: f.stderr ?? '' };
  }
}

const RODO = [
  'crear',
  '--nombre',
  'José Enrique Rodó',
  '--nacimiento',
  '1871',
  '--fallecimiento',
  '1917',
  '--semblanza',
  'Ensayista uruguayo.',
];

describe('Historia 11.4 — la tradición se teclea con la orden', () => {
  it('crear con --tradicion la deja escrita en el fichero', async () => {
    const corpus = await corpusVacio();

    const hecho = await correr(corpus, [...RODO, '--tradicion', 'latinoamericana']);

    expect(hecho.codigo, hecho.error).toBe(0);
    const escrito = await readFile(join(corpus, 'autores', 'jose-enrique-rodo.yml'), 'utf8');
    expect(escrito).toContain('tradicion: "latinoamericana"');
  });

  it('sin --tradicion el Autor se crea igual, y sin la clave', async () => {
    const corpus = await corpusVacio();

    const hecho = await correr(corpus, RODO);

    expect(hecho.codigo, hecho.error).toBe(0);
    const escrito = await readFile(join(corpus, 'autores', 'jose-enrique-rodo.yml'), 'utf8');
    expect(escrito).not.toContain('tradicion');
  });

  it('una tradición que no existe se rechaza enumerando las tres, y no crea nada', async () => {
    const corpus = await corpusVacio();

    const fallida = await correr(corpus, [...RODO, '--tradicion', 'latina']);

    expect(fallida.codigo).not.toBe(0);
    for (const valida of TRADICIONES) expect(fallida.error).toContain(valida);
    expect(await readdir(join(corpus, 'autores'))).toEqual([]);
  });

  it('listar enseña la tradición, y distingue «sin declarar» de «otra»', async () => {
    const corpus = await corpusVacio();
    await correr(corpus, [...RODO, '--tradicion', 'latinoamericana']);
    await correr(corpus, [
      'crear',
      '--nombre',
      'Séneca',
      '--fallecimiento',
      '65',
      '--semblanza',
      'Filósofo estoico.',
    ]);

    const listado = await correr(corpus, ['listar']);

    expect(listado.codigo, listado.error).toBe(0);
    expect(listado.salida).toContain('latinoamericana');
    expect(listado.salida).toContain('sin declarar');
  });
});

describe('Historia 11.4 — la orden ya no se traga lo que no entiende', () => {
  /*
   * El caso que explica por qué esta historia empezó arreglando una herramienta. Antes de la
   * 11.4 esta invocación salía con 0 y creaba el Autor: `--pais` no existía y `--tradicion`
   * tampoco, y ninguna de las dos producía un solo carácter por stderr.
   */
  it('una bandera inventada se rechaza con código 2 y no crea el Autor', async () => {
    const corpus = await corpusVacio();

    const fallida = await correr(corpus, [...RODO, '--pais', 'Uruguay']);

    expect(fallida.codigo).toBe(2);
    expect(fallida.error).toContain('--pais');
    expect(await readdir(join(corpus, 'autores'))).toEqual([]);
  });

  it('una opción sin valor se rechaza en vez de tomar la siguiente como su valor', async () => {
    const corpus = await corpusVacio();

    const fallida = await correr(corpus, ['crear', '--nombre', '--fallecimiento', '1917']);

    expect(fallida.codigo).not.toBe(0);
    expect(await readdir(join(corpus, 'autores'))).toEqual([]);
  });

  it('editar sigue admitiendo su slug posicional', async () => {
    const corpus = await corpusVacio();
    await correr(corpus, [...RODO, '--tradicion', 'latinoamericana']);

    const hecho = await correr(corpus, [
      'editar',
      'jose-enrique-rodo',
      '--semblanza',
      'Ensayista y periodista uruguayo.',
    ]);

    expect(hecho.codigo, hecho.error).toBe(0);
    const escrito = await readFile(join(corpus, 'autores', 'jose-enrique-rodo.yml'), 'utf8');
    expect(escrito).toContain('Ensayista y periodista uruguayo.');
    // Y la tradición sobrevive a una edición que no la menciona.
    expect(escrito).toContain('tradicion: "latinoamericana"');
  });
});
