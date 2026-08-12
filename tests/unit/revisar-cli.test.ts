import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);
const RAIZ = resolve(import.meta.dirname, '../..');

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

/**
 * Historia 9.2 — la sesión completa: extraer y después decidir, con las dos herramientas
 * encadenadas como se usarían de verdad.
 */

const DOCUMENTO = {
  fuente: 'wikisource-es',
  obra: 'Sobre la brevedad de la vida',
  año: 49,
  texto: [
    'No es que tengamos poco tiempo para vivir, sino que perdemos una gran parte de él.',
    'La vida es larga si sabes usarla y aprovecharla como es debido cada jornada.',
    'Ninguna cosa hay que sea más nuestra que el tiempo que pasa por delante de todos.',
  ].join(' '),
};

async function corpus() {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-sesion-'));
  temporales.push(raiz);
  const dir = join(raiz, 'corpus');
  for (const sub of ['citas', 'autores', 'temas', '_revision']) {
    await mkdir(join(dir, sub), { recursive: true });
  }
  await writeFile(
    join(dir, 'autores', 'seneca.yml'),
    'nombre: "Séneca"\nañoFallecimiento: 65\nsemblanza: "Filósofo estoico hispanorromano."\n',
    'utf8',
  );
  return { raiz, dir };
}

async function correr(guion: string, argumentos: string[]) {
  try {
    const { stdout } = await ejecutar('npx', ['tsx', join(RAIZ, guion), ...argumentos], { cwd: RAIZ });
    return { codigo: 0, salida: stdout, error: '' };
  } catch (e) {
    const fallo = e as { code?: number; stdout?: string; stderr?: string };
    return { codigo: fallo.code ?? 1, salida: fallo.stdout ?? '', error: fallo.stderr ?? '' };
  }
}

describe('Historia 9.2 — sembrar es una sesión, no treinta', () => {
  it('extraer deja candidatas y revisar las lista todas de una vez', async () => {
    const { raiz, dir } = await corpus();
    await writeFile(
      join(raiz, 'documento.yaml'),
      Object.entries(DOCUMENTO).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n'),
      'utf8',
    );

    const extraccion = await correr('tools/extraer.ts', [
      join(raiz, 'documento.yaml'), '--autor', 'seneca', '--corpus', dir,
    ]);
    expect(extraccion.codigo, extraccion.error).toBe(0);

    const listado = await correr('tools/revisar.ts', ['--corpus', dir]);
    expect(listado.codigo).toBe(0);
    expect(listado.salida).toMatch(/Pendientes de decisión: 3/);
    expect(listado.salida).toContain('--aprobar');
  });

  it('una sesión a medias se retoma donde se dejó', async () => {
    const { raiz, dir } = await corpus();
    await writeFile(
      join(raiz, 'documento.yaml'),
      Object.entries(DOCUMENTO).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n'),
      'utf8',
    );
    await correr('tools/extraer.ts', [
      join(raiz, 'documento.yaml'), '--autor', 'seneca', '--corpus', dir,
    ]);

    /*
     * Los slugs salen del listado, no del nombre de fichero: el fichero es
     * `{slug-autor}--{fragmento}.md` y el slug es `{slug-autor}-{fragmento}`, que no es
     * lo mismo. Derivarlo del nombre era una suposición, y falsa.
     */
    const listado = await correr('tools/revisar.ts', ['--corpus', dir]);
    const pendientes = listado.salida
      .split('\n')
      .filter((linea) => /^seneca-/.test(linea))
      .map((linea) => linea.trim());
    expect(pendientes).toHaveLength(3);

    const aprobacion = await correr('tools/revisar.ts', ['--corpus', dir, '--aprobar', pendientes[0]]);
    expect(aprobacion.codigo, aprobacion.salida).toBe(0);
    expect(aprobacion.salida).toMatch(/Publicadas: 1/);

    const rechazo = await correr('tools/revisar.ts', ['--corpus', dir, '--rechazar', pendientes[1]]);
    expect(rechazo.codigo, rechazo.salida).toBe(0);

    // Al volver, ni la aprobada ni la rechazada vuelven a proponerse.
    const segundoListado = await correr('tools/revisar.ts', ['--corpus', dir]);
    expect(segundoListado.salida).toMatch(/Pendientes de decisión: 1/);
    expect(segundoListado.salida).toContain(pendientes[2]);
    expect(segundoListado.salida).not.toContain(pendientes[1]);

    expect(await readdir(join(dir, 'citas'))).toHaveLength(1);
    expect(await readdir(join(dir, '_revision'))).toHaveLength(1);
  });

  it('aprobar algo que la admisión rechaza sale con error y lo deja donde estaba', async () => {
    const { dir } = await corpus();
    // Una candidata sin Procedencia, escrita a mano como si se hubiera editado el fichero.
    await writeFile(
      join(dir, '_revision', 'seneca-sin-procedencia.md'),
      '---\ntexto: "La vida es larga si sabes usarla y aprovecharla."\nautor: "seneca"\n' +
        'temas: []\nslug: "seneca-sin-procedencia"\nestadoDerechos: "dominio-público"\n---\n',
      'utf8',
    );

    const resultado = await correr('tools/revisar.ts', [
      '--corpus', dir, '--aprobar', 'seneca-sin-procedencia',
    ]);

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.salida).toMatch(/sigue en revisión/);
    expect(resultado.salida).toMatch(/Procedencia/);
    expect(await readdir(join(dir, 'citas'))).toHaveLength(0);
    expect(await readdir(join(dir, '_revision'))).toHaveLength(1);
  });
});
