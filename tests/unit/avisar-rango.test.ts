import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { AUTOR_VALIDO, RAIZ, TEMA_VALIDO, citaValida } from './ayuda/construir.js';
import { formaDeObra } from '../../src/lib/obras.ts';
import { SITIO } from '../../src/lib/dominio.ts';
import { ensayoDelRango, informeDelEnsayo, obrasDelSitemap, rutasTocadas } from '../../tools/avisar.ts';
import { fechasDeLasSuperficies, historialDeLosFicheros } from '../../integraciones/historial.ts';

const ejecutar = promisify(execFile);

/*
 * Historia 24.8 — `git cat-file` roto a voluntad. Solo se sustituye la importación que hace
 * `tools/avisar.ts`: el historial de `integraciones/historial.ts` sigue leyendo con la suya.
 */
const rotura = vi.hoisted(() => ({ catFile: false }));
vi.mock('../../integraciones/historial.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../integraciones/historial.ts')>();
  return {
    ...original,
    versionesDeBlobs: (...argumentos: Parameters<typeof original.versionesDeBlobs>) =>
      rotura.catFile ? Promise.reject(new Error('cat-file roto a propósito')) : original.versionesDeBlobs(...argumentos),
  };
});

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

  // Historia 24.8 — un commit que solo marca una Cita apta para portada.
  await escribir('corpus/citas/seneca--brevedad-0.md', citaValida({
    slug: 'seneca-brevedad-0',
    texto: 'Brevedad 0: la vida es larga si se sabe usar.',
    procedencia: { obra: 'Brevedad', año: 49 },
    aptaParaPortada: true,
  }));
  await commit('apta');

  // Historia 24.8 — un documento nuevo de Cartas: una página más de su Fuente.
  await escribir('corpus/fuentes/wikisource-es--cartas--ii.txt', 'Una página más de las Cartas.\n');
  await commit('documento');

  // Historia 24.8 — una siembra: una Cita nueva de Brevedad y nada más.
  await escribir('corpus/citas/seneca--brevedad-5.md', citaValida({
    slug: 'seneca-brevedad-5',
    texto: 'Brevedad 5: la vida es larga si se sabe usar.',
    procedencia: { obra: 'Brevedad', año: 49 },
  }));
  await commit('cita-nueva');

  // Historia 24.8 — un commit que solo cambia el modo de un documento y de una Cita.
  await chmod(join(raiz, 'corpus/fuentes/wikisource-es--cartas--ii.txt'), 0o755);
  await chmod(join(raiz, 'corpus/citas/seneca--brevedad-0.md'), 0o755);
  await commit('modo');

  // Historia 24.8 — retitular la ficha de Brevedad, con git de verdad.
  await escribir('corpus/obras/seneca--brevedad.yml', ficha('Brevedad').replace('titulo: Brevedad', 'titulo: Sobre la brevedad'));
  await commit('titulada');

  // Historia 24.8 — la baja de un documento.
  await unlink(join(raiz, 'corpus/fuentes/wikisource-es--cartas--ii.txt'));
  await commit('documento-borrado');

  // Historia 24.8 — un renombrado dentro de `corpus/citas/`: mismo slug, otro fichero.
  await git(['mv', 'corpus/citas/seneca--ira-0.md', 'corpus/citas/seneca--ira-cero.md']);
  await commit('renombrada');

  // Historia 24.8 — una nota puesta y quitada: los extremos del rango no difieren.
  await escribir('corpus/obras/seneca--cartas.yml', `${ficha('Cartas')}nota: "Una nota pasajera."\n`);
  await commit('nota-puesta');
  await escribir('corpus/obras/seneca--cartas.yml', ficha('Cartas'));
  await commit('nota-quitada');
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

describe('Historia 24.8 — el aviso de un rango, por campos', () => {
  it('un rango que solo toca `aptaParaPortada` avisa la portada y nada más', async () => {
    const { rutas, avisos } = await rango('tope-restituido', 'apta', [CARTAS, BREVEDAD]);
    expect(rutas).toEqual(['/']);
    expect(avisos).toEqual([]);
  });

  it('un rango que añade un documento avisa solo su Obra', async () => {
    const { rutas, avisos } = await rango('apta', 'documento', [CARTAS, BREVEDAD]);
    expect(rutas).toEqual([CARTAS]);
    expect(avisos).toEqual([]);
  });

  it('un rango que solo añade una Cita avisa su Cita, su Autor, su Tema y su Obra; ninguna otra', async () => {
    const { rutas, avisos } = await rango('documento', 'cita-nueva', [CARTAS, BREVEDAD]);
    expect(rutas.sort()).toEqual(['/', '/autor/seneca/', '/cita/seneca-brevedad-5/', '/tema/el-tiempo/', BREVEDAD].sort());
    expect(avisos).toEqual([]);
  });

  it('con una siembra a medias en el árbol, el Corpus de después es el de `hasta`, no el del disco', async () => {
    await git(['checkout', '-q', sha['cita-modificada']]);
    // El árbol está en `hasta`, pero la Cita que el rango modificó se ha quitado sin commit: leído
    // del disco, el Corpus de después no la tendría y su página no cambiaría de fecha.
    await unlink(join(raiz, 'corpus/citas/seneca--cartas-0.md'));
    try {
      const ensayo = await ensayoDelRango(raiz, sha['con-obras'], sha['cita-modificada'], { rutas: [CARTAS, BREVEDAD] });
      expect(ensayo.reparto.cita).toEqual({ cambianDeFecha: 1, seAvisarian: 1 });
    } finally {
      await git(['checkout', '-q', '--', 'corpus/citas/seneca--cartas-0.md']);
    }
  });

  it('el Corpus de después es el de `hasta` aunque el árbol esté en otra revisión', async () => {
    await git(['checkout', '-q', sha['sin-obras']]);
    const antes = await copiasDeAviso();
    const { rutas } = await rutasTocadas(raiz, sha['con-obras'], sha['cita-modificada'], { rutas: [CARTAS, BREVEDAD] });
    expect(rutas.sort()).toEqual(['/', '/autor/seneca/', '/cita/seneca-cartas-0/', '/tema/el-tiempo/', CARTAS].sort());
    expect(await copiasDeAviso()).toBe(antes);
  });

  it('el ensayo reparte por familia lo que cambia de fecha y lo que se avisaría', async () => {
    await git(['checkout', '-q', sha['cita-modificada']]);
    const ensayo = await ensayoDelRango(raiz, sha['con-obras'], sha['cita-modificada'], { rutas: [CARTAS, BREVEDAD] });
    expect(ensayo.portada).toBe(true);
    expect(ensayo.reparto).toEqual({
      cita: { cambianDeFecha: 1, seAvisarian: 1 },
      autor: { cambianDeFecha: 1, seAvisarian: 1 },
      tema: { cambianDeFecha: 1, seAvisarian: 1 },
      coleccion: { cambianDeFecha: 0, seAvisarian: 0 },
      obra: { cambianDeFecha: 1, seAvisarian: 1 },
    });
    const informe = informeDelEnsayo('a', 'b', ensayo).join('\n');
    expect(informe).toMatch(/Reparto por familia, a\.\.b/);
    expect(informe).toMatch(/portada\s+—\s+1/);
  });

  it('el ensayo de un documento: solo la Obra cambia de fecha y se avisa, sin portada', async () => {
    await git(['checkout', '-q', sha['documento']]);
    const ensayo = await ensayoDelRango(raiz, sha['apta'], sha['documento'], { rutas: [CARTAS, BREVEDAD] });
    expect(ensayo.portada).toBe(false);
    expect(ensayo.reparto.obra).toEqual({ cambianDeFecha: 1, seAvisarian: 1 });
    expect(ensayo.reparto.cita).toEqual({ cambianDeFecha: 0, seAvisarian: 0 });
  });

  it('el ensayo de una baja: lo que componía cambia de fecha, y la Cita borrada se avisa', async () => {
    await git(['checkout', '-q', sha['cita-borrada']]);
    const ensayo = await ensayoDelRango(raiz, sha['cita-modificada'], sha['cita-borrada'], { rutas: [CARTAS, BREVEDAD] });
    expect(ensayo.reparto.autor.cambianDeFecha).toBe(1);
    expect(ensayo.reparto.tema.cambianDeFecha).toBe(1);
    expect(ensayo.reparto.obra.cambianDeFecha).toBe(1);
    expect(ensayo.reparto.cita).toEqual({ cambianDeFecha: 0, seAvisarian: 1 });
    expect(ensayo.aviso.rutas).toContain('/cita/seneca-cartas-1/');
  });
});

describe('Historia 24.8 — lo que la revisión arregló, con git de verdad', () => {
  it('un cambio solo de modo —un documento y una Cita— no avisa nada ni cambia ninguna fecha', async () => {
    expect(await rango('cita-nueva', 'modo', [CARTAS, BREVEDAD])).toEqual({ rutas: [], avisos: [] });
    const ensayo = await ensayoDelRango(raiz, sha['cita-nueva'], sha['modo'], { rutas: [CARTAS, BREVEDAD] });
    expect(ensayo.portada).toBe(false);
    for (const familia of ['cita', 'autor', 'tema', 'coleccion', 'obra'] as const) {
      expect(ensayo.reparto[familia], familia).toEqual({ cambianDeFecha: 0, seAvisarian: 0 });
    }
  });

  it('si `git cat-file` falla, el aviso no se pierde: cada versión es opaca y se avisa de más', async () => {
    rotura.catFile = true;
    try {
      const { rutas, avisos } = await rango('tope-restituido', 'apta', [CARTAS, BREVEDAD]);
      // Sin roturas, este rango avisa solo la portada; con ellas, todo lo que compone la Cita.
      expect(rutas.sort()).toEqual(['/', '/autor/seneca/', '/cita/seneca-brevedad-0/', '/tema/el-tiempo/', BREVEDAD].sort());
      expect(avisos.join('\n')).toMatch(/no se pudieron leer las versiones del rango/);
    } finally {
      rotura.catFile = false;
    }
  });

  it('retitular una ficha avisa su Obra, sus Páginas de Cita y los listados de esas Citas', async () => {
    const { rutas, avisos } = await rango('modo', 'titulada', [CARTAS, BREVEDAD]);
    expect(rutas.sort()).toEqual(
      [
        '/',
        '/autor/seneca/',
        '/tema/el-tiempo/',
        BREVEDAD,
        ...[0, 1, 2, 3, 4, 5].map((i) => `/cita/seneca-brevedad-${i}/`),
      ].sort(),
    );
    expect(avisos).toEqual([]);
  });

  it('la baja de un documento avisa su Obra, por la relación de antes, y no la portada', async () => {
    const { rutas, avisos } = await rango('titulada', 'documento-borrado', [CARTAS, BREVEDAD]);
    expect(rutas).toEqual([CARTAS]);
    expect(avisos).toEqual([]);
  });

  it('un renombrado dentro de un ámbito es la baja del nombre viejo y el alta del nuevo', async () => {
    const historial = await historialDeLosFicheros(raiz, [join(raiz, 'corpus/citas')], {
      rango: `${sha['documento-borrado']}..${sha['renombrada']}`,
    });
    const vieja = historial.get(resolve(raiz, 'corpus/citas/seneca--ira-0.md'));
    const nueva = historial.get(resolve(raiz, 'corpus/citas/seneca--ira-cero.md'));
    expect(vieja).toHaveLength(1);
    expect(vieja?.[0]?.despues).toBeNull();
    expect(vieja?.[0]?.antes).toMatchObject({ slug: 'seneca-ira-0' });
    expect(nueva).toHaveLength(1);
    expect(nueva?.[0]?.antes).toBeNull();
    expect(nueva?.[0]?.despues).toMatchObject({ slug: 'seneca-ira-0' });
    // Y el aviso da la misma página, que sigue existiendo con el fichero nuevo.
    const { rutas } = await rango('documento-borrado', 'renombrada', [CARTAS, BREVEDAD]);
    expect(rutas).toContain('/cita/seneca-ira-0/');
  });

  it('el ensayo de un rango cuyos extremos no difieren cuenta lo que cambió de fecha en medio', async () => {
    await git(['checkout', '-q', sha['nota-quitada']]);
    const ensayo = await ensayoDelRango(raiz, sha['renombrada'], sha['nota-quitada'], { rutas: [CARTAS, BREVEDAD] });
    expect(ensayo.aviso.rutas).toEqual([]);
    expect(ensayo.portada).toBe(false);
    expect(ensayo.reparto.obra).toEqual({ cambianDeFecha: 1, seAvisarian: 0 });
    expect(ensayo.reparto.cita).toEqual({ cambianDeFecha: 0, seAvisarian: 0 });
  });
});

describe('Historia 24.8 — la orden del ensayo, de punta a punta', () => {
  const TSX = join(RAIZ, 'node_modules', '.bin', 'tsx');
  const ORDEN = join(RAIZ, 'tools', 'avisar.ts');
  let sitemap = '';

  beforeAll(async () => {
    const directorio = await mkdtemp(join(tmpdir(), 'sabiduria-ensayo-sitemap-'));
    sitemap = join(directorio, 'sitemap-0.xml');
    await writeFile(
      sitemap,
      `<urlset><url><loc>${new URL(CARTAS, SITIO).href}</loc></url><url><loc>${new URL(BREVEDAD, SITIO).href}</loc></url></urlset>`,
      'utf8',
    );
  });

  afterAll(async () => {
    if (sitemap) await rm(join(sitemap, '..'), { recursive: true, force: true });
  });

  async function orden(argumentos: string[]): Promise<{ codigo: number; stdout: string; stderr: string }> {
    try {
      const { stdout, stderr } = await ejecutar(TSX, [ORDEN, ...argumentos], { cwd: raiz, env: ENTORNO });
      return { codigo: 0, stdout, stderr };
    } catch (fallo) {
      const { code, stdout, stderr } = fallo as { code?: number; stdout?: string; stderr?: string };
      return { codigo: typeof code === 'number' ? code : -1, stdout: stdout ?? '', stderr: stderr ?? '' };
    }
  }

  it('imprime el reparto por familia y no envía nada', async () => {
    await git(['checkout', '-q', sha['cita-modificada']]);
    const { codigo, stdout, stderr } = await orden([
      '--ensayo', '--desde', sha['con-obras'], '--hasta', sha['cita-modificada'], '--sitemap', sitemap,
    ]);
    expect(codigo, stderr).toBe(0);
    expect(stdout).toMatch(/Reparto por familia/);
    expect(stdout).toMatch(/\/cita\/seneca-cartas-0\//);
    expect(stdout).toMatch(/Ensayo: no se ha enviado nada\./);
  }, 60_000);

  it('un rango que no se puede leer sale con 1 y no se hace pasar por «ningún cambio»', async () => {
    const { codigo, stdout, stderr } = await orden(['--ensayo', '--desde', 'no-existe-esta-revision', '--sitemap', sitemap]);
    expect(codigo).toBe(1);
    expect(stdout).not.toMatch(/ningún cambio publicable/);
    expect(stderr).toMatch(/no hay reparto/);
  }, 60_000);
});

describe('Historia 22.8 — el `lastmod` de una Obra se mueve con su ficha', () => {
  it('la nota de la ficha fecha la Página de Obra y no las de sus Citas, que no la pintan (24.8)', async () => {
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
      // Historia 24.8 — la Página de Cita pinta el título de la ficha y no su nota: no cambia.
      expect(fechas.get('/cita/seneca-cartas-0')).toBe('2024-01-02T09:00:00.000Z');
      expect(fechas.get('/obra/seneca/brevedad')).toBe('2024-01-02T09:00:00.000Z');
      expect(fechas.get('/cita/seneca-ira-0')).toBe('2024-01-02T09:00:00.000Z');

      // Historia 24.8 — en el camino del sitemap, un documento de Cartas fecha solo su Obra…
      await mkdir(join(proyecto, 'corpus', 'fuentes'), { recursive: true });
      await writeFile(join(proyecto, 'corpus', 'fuentes', 'wikisource-es--cartas--ii.txt'), 'Otra página.\n', 'utf8');
      await enProyecto(['add', '-A']);
      await enProyecto(['commit', '-q', '-m', 'un documento'], '2024-05-06T09:00:00+0000');
      const conDocumento = await fechasDeLasSuperficies(proyecto, (m) => avisos.push(m));
      expect(conDocumento.get('/obra/seneca/cartas')).toBe('2024-05-06T09:00:00.000Z');
      expect(conDocumento.get('/cita/seneca-cartas-0')).toBe('2024-01-02T09:00:00.000Z');
      expect(conDocumento.get('/autor/seneca')).toBe(fechas.get('/autor/seneca'));
      // …y la baja de una Cita —movida a `corpus/_revision/`— fecha lo vivo que componía.
      await mkdir(join(proyecto, 'corpus', '_revision'), { recursive: true });
      await enProyecto(['mv', 'corpus/citas/seneca--cartas-1.md', 'corpus/_revision/seneca--cartas-1.md']);
      await enProyecto(['commit', '-q', '-m', 'una baja'], '2024-07-08T09:00:00+0000');

      const despues = await fechasDeLasSuperficies(proyecto, (m) => avisos.push(m));
      expect(avisos).toEqual([]);
      expect(despues.get('/obra/seneca/cartas')).toBe('2024-07-08T09:00:00.000Z');
      expect(despues.get('/autor/seneca')).toBe('2024-07-08T09:00:00.000Z');
      expect(despues.get('/tema/el-tiempo')).toBe('2024-07-08T09:00:00.000Z');
      expect(despues.has('/cita/seneca-cartas-1')).toBe(false);
      // Ni el documento ni la baja tocan las Páginas de Cita que quedan ni otra Obra.
      expect(despues.get('/cita/seneca-cartas-0')).toBe('2024-01-02T09:00:00.000Z');
      expect(despues.get('/obra/seneca/brevedad')).toBe('2024-01-02T09:00:00.000Z');
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
