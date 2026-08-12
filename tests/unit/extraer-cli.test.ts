import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { parse as parsearYaml } from 'yaml';

const ejecutar = promisify(execFile);
const RAIZ = resolve(import.meta.dirname, '../..');

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

/** Historia 9.1 — la herramienta, de punta a punta y sobre disco. */

const TEXTO = [
  'No es que tengamos poco tiempo para vivir, sino que perdemos una gran parte de él.',
  'La vida es larga si sabes usarla y aprovecharla como es debido cada jornada.',
  'Non est quod credas quemquam fieri aliena infelicitate felicem atque beatum.',
].join(' ');

async function corpusVacio() {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-extraer-'));
  temporales.push(raiz);
  const corpus = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', '_revision']) {
    await mkdir(join(corpus, dir), { recursive: true });
  }
  return { raiz, corpus };
}

async function extraer(campos: Record<string, unknown>, corpus: string) {
  const documento = join(corpus, '..', 'documento.yaml');
  await writeFile(
    documento,
    Object.entries(campos)
      .map(([clave, valor]) => `${clave}: ${JSON.stringify(valor)}`)
      .join('\n'),
    'utf8',
  );

  try {
    const { stdout } = await ejecutar(
      'npx',
      ['tsx', join(RAIZ, 'tools/extraer.ts'), documento, '--autor', 'seneca', '--corpus', corpus],
      { cwd: RAIZ },
    );
    return { codigo: 0, salida: stdout, error: '' };
  } catch (e) {
    const fallo = e as { code?: number; stdout?: string; stderr?: string };
    return { codigo: fallo.code ?? 1, salida: fallo.stdout ?? '', error: fallo.stderr ?? '' };
  }
}

const DOCUMENTO = {
  fuente: 'wikisource-es',
  obra: 'Sobre la brevedad de la vida',
  año: 49,
  url: 'https://es.wikisource.org/wiki/x',
  texto: TEXTO,
};

describe('Historia 9.1 — las candidatas quedan en revisión, no publicadas', () => {
  it('escribe en corpus/_revision/ y no toca corpus/citas/', async () => {
    const { corpus } = await corpusVacio();
    const resultado = await extraer(DOCUMENTO, corpus);

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await readdir(join(corpus, 'citas'))).toEqual([]);
    expect((await readdir(join(corpus, '_revision'))).length).toBeGreaterThan(0);
  });

  it('cada fichero escrito consta de qué Fuente salió y bajo qué licencia', async () => {
    const { corpus } = await corpusVacio();
    await extraer(DOCUMENTO, corpus);

    for (const fichero of await readdir(join(corpus, '_revision'))) {
      const contenido = await readFile(join(corpus, '_revision', fichero), 'utf8');
      const frontmatter = parsearYaml(contenido.split('---')[1]) as Record<string, any>;

      expect(frontmatter.fuente.id).toBe('wikisource-es');
      expect(frontmatter.fuente.licencia).toBe('CC BY-SA 4.0');
      expect(frontmatter.procedencia.obra).toBe('Sobre la brevedad de la vida');
      expect(frontmatter.procedencia.año).toBe(49);
    }
  });

  it('el pasaje en latín no llegó a escribirse', async () => {
    const { corpus } = await corpusVacio();
    await extraer(DOCUMENTO, corpus);

    for (const fichero of await readdir(join(corpus, '_revision'))) {
      const contenido = await readFile(join(corpus, '_revision', fichero), 'utf8');
      expect(contenido).not.toContain('Non est quod credas');
    }
  });

  it('el nombre de fichero es el que fija la espina', async () => {
    const { corpus } = await corpusVacio();
    await extraer(DOCUMENTO, corpus);

    for (const fichero of await readdir(join(corpus, '_revision'))) {
      // `{slug-autor}--{fragmento}.md`, como en corpus/citas/. Sin el ayudante común
      // salía `seneca--seneca-...`, porque el slug ya empieza por el del Autor.
      expect(fichero).toMatch(/^seneca--[a-z0-9-]+\.md$/);
      expect(fichero).not.toContain('seneca--seneca');
    }
  });

  it('dice cuántas propuso y cuántas descartó, y por qué', async () => {
    const { corpus } = await corpusVacio();
    const resultado = await extraer(DOCUMENTO, corpus);
    expect(resultado.salida).toMatch(/Candidatas en revisión: [1-9]/);
    expect(resultado.salida).toMatch(/no estar en español: 1/);
  });
});

describe('Historia 9.1 — una licencia que no permite reutilizar no deja nada', () => {
  it('sale con error, explica por qué y el corpus queda intacto', async () => {
    const { corpus } = await corpusVacio();
    const resultado = await extraer({ ...DOCUMENTO, fuente: 'cervantes-virtual' }, corpus);

    // El código distinto de cero importa: estas herramientas se encadenan en guiones y
    // un rechazo silencioso pasaría por éxito.
    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/no admite extracción/);
    expect(resultado.error).toMatch(/CC BY-NC-SA/);

    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
    expect(await readdir(join(corpus, 'citas'))).toEqual([]);
  });
});
