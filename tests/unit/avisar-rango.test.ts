import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { AUTOR_VALIDO, RAIZ, TEMA_VALIDO, citaValida } from './ayuda/construir.js';
import { formaDeObra } from '../../src/lib/obras.ts';
import { obrasDelSitemap, rutasTocadas } from '../../tools/avisar.ts';
import { fechasDeLasSuperficies } from '../../integraciones/historial.ts';

const ejecutar = promisify(execFile);

/**
 * Historia 22.8 — el aviso de un rango, de extremo a extremo, contra un git de verdad.
 *
 * `componerAviso` se prueba puro en `indexnow.test.ts`; aquí se prueba lo que solo se ve con un
 * repositorio: qué ficheros devuelve `git diff`, que el Corpus de antes se extrae entero de
 * `desde` —también sin `corpus/obras`—, que la congelación de antes se lee del `umbrales.ts`
 * de `desde`, y que la lista de después llega inyectada (aquí no hay sitemap desplegado).
 *
 * El disco es el de `hasta`: la orden lee la relación de después del árbol, así que cada caso
 * hace `git checkout` del commit de llegada.
 */

const ENTORNO = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
  GIT_TERMINAL_PROMPT: '0',
  GIT_AUTHOR_NAME: 'Prueba',
  GIT_AUTHOR_EMAIL: 'prueba@example.com',
  GIT_COMMITTER_NAME: 'Prueba',
  GIT_COMMITTER_EMAIL: 'prueba@example.com',
};

const CARTAS = '/obra/seneca/cartas/';
const BREVEDAD = '/obra/seneca/brevedad/';
const IRA = '/obra/seneca/ira/';

const UMBRALES = await readFile(join(RAIZ, 'src/lib/umbrales.ts'), 'utf8');
const SIN_CONGELAR = 'export const CONGELACION_DE_OBRAS: CongelacionDeObras | undefined = undefined;';
const congelado = (nombres: string[]) =>
  UMBRALES.replace(
    SIN_CONGELAR,
    `export const CONGELACION_DE_OBRAS: CongelacionDeObras | undefined = {\n  desde: '2026-12-06',\n  indexables: [\n${nombres.map((n) => `    '${n}',`).join('\n')}\n  ],\n};`,
  );

/** Séneca: Cartas 3, Brevedad 5, Ira 1 — Cartas y Brevedad se indexan, Ira no. */
function ficherosDelCorpus(): Record<string, string> {
  const corpus: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
  };
  const obra = (titulo: string, slug: string, n: number) => {
    for (let i = 0; i < n; i += 1) {
      corpus[`citas/seneca--${slug}-${i}.md`] = citaValida({
        slug: `seneca-${slug}-${i}`,
        texto: `${titulo} ${i}: la vida es larga si se sabe usar.`,
        procedencia: { obra: titulo, año: 49 },
      });
    }
  };
  obra('Cartas', 'cartas', 3);
  obra('Brevedad', 'brevedad', 5);
  obra('Ira', 'ira', 1);
  return corpus;
}

const ficha = (titulo: string) => `autor: seneca\ntitulo: ${titulo}\nformas:\n  - ${formaDeObra(titulo)}\n`;

let raiz = '';
const sha: Record<string, string> = {};

async function git(argumentos: string[], momento?: string): Promise<string> {
  const { stdout } = await ejecutar('git', argumentos, {
    cwd: raiz,
    env: { ...ENTORNO, ...(momento ? { GIT_AUTHOR_DATE: momento, GIT_COMMITTER_DATE: momento } : {}) },
  });
  return stdout.trim();
}

async function escribir(relativa: string, contenido: string): Promise<void> {
  const ruta = join(raiz, relativa);
  await mkdir(join(ruta, '..'), { recursive: true });
  await writeFile(ruta, contenido, 'utf8');
}

async function commit(nombre: string, momento?: string): Promise<void> {
  await git(['add', '-A']);
  await git(['commit', '-q', '-m', nombre], momento);
  sha[nombre] = await git(['rev-parse', 'HEAD']);
}

beforeAll(async () => {
  raiz = await mkdtemp(join(tmpdir(), 'sabiduria-avisar-rango-'));
  await git(['init', '-q', '--initial-branch=principal']);

  // Sin Corpus: solo la regla.
  await escribir('src/lib/umbrales.ts', UMBRALES);
  await commit('sin-corpus');

  // El Corpus, todavía sin fichas de Obra (antes de la 22.1).
  for (const [ruta, contenido] of Object.entries(ficherosDelCorpus())) await escribir(`corpus/${ruta}`, contenido);
  await commit('sin-obras');

  for (const [nombre, titulo] of [['cartas', 'Cartas'], ['brevedad', 'Brevedad'], ['ira', 'Ira']]) {
    await escribir(`corpus/obras/seneca--${nombre}.yml`, ficha(titulo));
  }
  await commit('con-obras');

  await escribir('corpus/citas/seneca--cartas-0.md', citaValida({
    slug: 'seneca-cartas-0',
    texto: 'Cartas 0: la vida es larga si se sabe usar, corregida.',
    procedencia: { obra: 'Cartas', año: 49 },
  }));
  await commit('cita-modificada');

  await unlink(join(raiz, 'corpus/citas/seneca--cartas-1.md'));
  await commit('cita-borrada');

  await escribir('src/lib/umbrales.ts', congelado(['seneca--cartas']));
  await commit('congelada');

  await escribir('src/lib/umbrales.ts', UMBRALES);
  await commit('levantada');

  await escribir('src/lib/umbrales.ts', UMBRALES.replace('MAX_PROPORCION_OBRA_DEL_AUTOR = 0.9;', 'MAX_PROPORCION_OBRA_DEL_AUTOR = 0.8;'));
  await commit('tope-bajado');

  await escribir('src/lib/umbrales.ts', UMBRALES);
  await commit('tope-restituido');
}, 60_000);

afterAll(async () => {
  if (raiz) await rm(raiz, { recursive: true, force: true });
});

/** El rango `desde..hasta`, con el árbol en `hasta` y la lista de después dada. */
async function rango(desde: string, hasta: string, despues: string[] | { motivo: string }) {
  await git(['checkout', '-q', sha[hasta]]);
  const avisos: string[] = [];
  const aviso = await rutasTocadas(
    raiz,
    sha[desde],
    sha[hasta],
    Array.isArray(despues) ? { rutas: despues } : despues,
    (linea) => avisos.push(linea),
  );
  return { ...aviso, avisos: [...aviso.avisos, ...avisos] };
}

async function copiasDeAviso(): Promise<number> {
  return (await readdir(tmpdir())).filter((n) => n.startsWith('sabiduria-aviso-')).length;
}

describe('Historia 22.8 — rutasTocadas contra un git de verdad', () => {
  it('una Cita modificada avisa la Cita, su Autor, sus Temas y su Obra; ninguna hermana', async () => {
    const { rutas, avisos } = await rango('con-obras', 'cita-modificada', [CARTAS, BREVEDAD]);
    expect(rutas.sort()).toEqual(['/', '/autor/seneca/', '/cita/seneca-cartas-0/', '/tema/el-tiempo/', CARTAS].sort());
    expect(avisos).toEqual([]);
  });

  it('una Cita borrada se avisa por la relación de antes, que es la única que la conoce', async () => {
    const { rutas } = await rango('cita-modificada', 'cita-borrada', [CARTAS, BREVEDAD]);
    expect(rutas).toContain('/cita/seneca-cartas-1/');
    expect(rutas).toContain(CARTAS);
    expect(rutas).not.toContain(BREVEDAD);
  });

  it('un rango anterior a `corpus/obras` se lee igual: las Obras que entran se avisan', async () => {
    const antes = await copiasDeAviso();
    const { rutas, avisos } = await rango('sin-obras', 'con-obras', [CARTAS, BREVEDAD]);
    // Las tres nacen —de ausentes a indexables, o a `noindex` en Ira—: cambiaron de estado.
    expect(rutas).toEqual(expect.arrayContaining(['/', CARTAS, BREVEDAD, IRA]));
    expect(avisos).toEqual([]);
    // La copia temporal del Corpus de antes no se queda en el disco.
    expect(await copiasDeAviso()).toBe(antes);
  });

  it('sin Corpus en `desde`: ni hermanas ni páginas de lo borrado, y se dice; la copia no se filtra', async () => {
    const antes = await copiasDeAviso();
    const { rutas, avisos } = await rango('sin-corpus', 'con-obras', [CARTAS, BREVEDAD]);
    expect(avisos.join('\n')).toMatch(/Sin el Corpus de/);
    expect(avisos.join('\n')).toMatch(/ninguna Obra hermana/);
    expect(rutas).toContain('/cita/seneca-cartas-0/');
    expect(await copiasDeAviso()).toBe(antes);
  });

  it('un commit que solo congela compara las listas: la que sale se avisa, la portada no', async () => {
    const { rutas } = await rango('cita-borrada', 'congelada', [CARTAS]);
    expect(rutas).toEqual([BREVEDAD]);
  });

  it('la lista de antes lleva la congelación que regía en `desde`', async () => {
    // En «congelada» solo Cartas se indexaba; al levantar entra Brevedad.
    const { rutas } = await rango('congelada', 'levantada', [CARTAS, BREVEDAD]);
    expect(rutas).toEqual([BREVEDAD]);
  });

  it('si el rango cambió un umbral de FR-52, se dice que la lista de antes usa los de hoy', async () => {
    const { avisos } = await rango('tope-bajado', 'tope-restituido', [CARTAS, BREVEDAD]);
    expect(avisos.join('\n')).toMatch(/MAX_PROPORCION_OBRA_DEL_AUTOR cambió en el rango \(0\.8 → 0\.9\)/);
  });

  it('un rango que no toca ni el Corpus ni la regla no avisa nada', async () => {
    await git(['checkout', '-q', sha['tope-restituido']]);
    expect(await rutasTocadas(raiz, sha['tope-restituido'], sha['tope-restituido'], { rutas: [] })).toEqual({
      rutas: [],
      avisos: [],
    });
  });
});

describe('Historia 22.8 — el `lastmod` de una Obra se mueve con su ficha', () => {
  it('editar la ficha fecha la Página de Obra y las de sus Citas, no las demás', async () => {
    const proyecto = await mkdtemp(join(tmpdir(), 'sabiduria-lastmod-obra-'));
    try {
      const enProyecto = (argumentos: string[], momento?: string) =>
        ejecutar('git', argumentos, {
          cwd: proyecto,
          env: { ...ENTORNO, ...(momento ? { GIT_AUTHOR_DATE: momento, GIT_COMMITTER_DATE: momento } : {}) },
        });
      for (const [ruta, contenido] of Object.entries(ficherosDelCorpus())) {
        await mkdir(join(proyecto, 'corpus', ruta, '..'), { recursive: true });
        await writeFile(join(proyecto, 'corpus', ruta), contenido, 'utf8');
      }
      await mkdir(join(proyecto, 'corpus', 'obras'), { recursive: true });
      for (const [nombre, titulo] of [['cartas', 'Cartas'], ['brevedad', 'Brevedad'], ['ira', 'Ira']]) {
        await writeFile(join(proyecto, 'corpus', 'obras', `seneca--${nombre}.yml`), ficha(titulo), 'utf8');
      }
      await enProyecto(['init', '-q', '--initial-branch=principal']);
      await enProyecto(['add', '-A']);
      await enProyecto(['commit', '-q', '-m', 'el Corpus'], '2024-01-02T09:00:00+0000');
      await writeFile(
        join(proyecto, 'corpus', 'obras', 'seneca--cartas.yml'),
        `${ficha('Cartas')}nota: "Una nota de prueba."\n`,
        'utf8',
      );
      await enProyecto(['add', '-A']);
      await enProyecto(['commit', '-q', '-m', 'la ficha'], '2024-03-04T09:00:00+0000');

      const avisos: string[] = [];
      const fechas = await fechasDeLasSuperficies(proyecto, (m) => avisos.push(m));
      expect(avisos).toEqual([]);
      expect(fechas.get('/obra/seneca/cartas')).toBe('2024-03-04T09:00:00.000Z');
      expect(fechas.get('/cita/seneca-cartas-0')).toBe('2024-03-04T09:00:00.000Z');
      expect(fechas.get('/obra/seneca/brevedad')).toBe('2024-01-02T09:00:00.000Z');
      expect(fechas.get('/cita/seneca-ira-0')).toBe('2024-01-02T09:00:00.000Z');
    } finally {
      await rm(proyecto, { recursive: true, force: true });
    }
  });
});

describe('Historia 22.8 — el sitemap de después', () => {
  const respuesta = (cuerpo: string, estado = 200) =>
    (async () => new Response(cuerpo, { status: estado })) as unknown as typeof fetch;

  it.each([
    ['un 404', respuesta('no está', 404), /respondió 404/],
    ['un 200 que es HTML y no sitemap', respuesta('<!doctype html><html></html>'), /no es un sitemap/],
    ['una red que falla', (async () => { throw new Error('fetch failed'); }) as unknown as typeof fetch, /fetch failed/],
  ])('%s da un motivo, nunca una lista vacía', async (_caso, pedir, motivo) => {
    const lista = await obrasDelSitemap(undefined, pedir);
    expect('motivo' in lista ? lista.motivo : '').toMatch(motivo);
  });

  it('un fichero local inexistente da un motivo', async () => {
    const lista = await obrasDelSitemap(join(tmpdir(), 'no-existe-sitemap-0.xml'));
    expect('motivo' in lista ? lista.motivo : '').toMatch(/sitemap ilegible/);
  });

  it('pide con tiempo límite, y descarta las `<loc>` de otro origen (también `www.`)', async () => {
    let conLimite = false;
    const pedir = (async (_url: URL, opciones?: RequestInit) => {
      conLimite = opciones?.signal instanceof AbortSignal;
      return new Response(
        '<urlset><url><loc>https://sabiduriadebolsillo.net/obra/a/b/</loc></url>' +
          '<url><loc>https://www.sabiduriadebolsillo.net/obra/a/c/</loc></url>' +
          '<url><loc>https://otro.example/obra/a/d/</loc></url></urlset>',
      );
    }) as unknown as typeof fetch;
    expect(await obrasDelSitemap(undefined, pedir)).toEqual({ rutas: ['/obra/a/b/'] });
    expect(conLimite).toBe(true);
  });
});
