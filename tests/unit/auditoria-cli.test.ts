import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { RAIZ, citaValida } from './ayuda/construir.js';

const ejecutar = promisify(execFile);

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

/** Historia 19.1 — la salud cuenta las traducidas sin traducción, sobre un corpus pequeño. */
describe('Historia 19.1 — tools/auditoria.ts --json', () => {
  it('un Séneca de tradición «otra», con documento y sin traducción, cuenta 1', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-auditoria-'));
    temporales.push(raiz);
    const corpus = join(raiz, 'corpus');
    for (const dir of ['citas', 'autores', 'temas', '_revision', 'fuentes']) {
      await mkdir(join(corpus, dir), { recursive: true });
    }
    await writeFile(
      join(corpus, 'autores', 'seneca.yml'),
      'nombre: Séneca\nañoFallecimiento: 65\nsemblanza: Filósofo estoico.\ntradicion: otra\nordenAlfabetico: Séneca\n',
      'utf8',
    );
    // Con documento y sin traducción: cuenta.
    await writeFile(join(corpus, 'citas', 'seneca--una.md'), citaValida({ temas: [] }), 'utf8');
    // Sin documento: no puede traer traducción, y no cuenta.
    await writeFile(
      join(corpus, 'citas', 'seneca--otra.md'),
      citaValida({
        temas: [],
        slug: 'seneca-la-vida-si-sabes-usarla-es-larga',
        texto: 'La vida, si sabes usarla, es larga.',
        fuente: undefined,
      }),
      'utf8',
    );

    const { stdout } = await ejecutar(
      'npx',
      ['tsx', join(RAIZ, 'tools/auditoria.ts'), '--json', '--corpus', corpus],
      { cwd: RAIZ },
    );
    const informe = JSON.parse(stdout) as {
      traducidasSinTraduccion: { total: number; porAutor: { autor: string; citas: number }[] };
    };
    expect(informe.traducidasSinTraduccion).toEqual({
      total: 1,
      porAutor: [{ autor: 'seneca', citas: 1 }],
    });
  });
});

/**
 * Historia 35.7 — SM-C1 sobre la clase de siempre, y las atribuidas y las bajas por cambio de
 * clase, aparte (FR-16 v9.1): en la terminal y en `--json`.
 */
describe('Historia 35.7 — tools/auditoria.ts, la atribuida aparte', () => {
  it('cuenta la procedencia sin la atribuida y da las dos cifras aparte', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-auditoria-'));
    temporales.push(raiz);
    const corpus = join(raiz, 'corpus');
    for (const dir of ['citas', 'autores', 'temas', '_revision', 'fuentes']) {
      await mkdir(join(corpus, dir), { recursive: true });
    }
    await writeFile(
      join(corpus, 'autores', 'seneca.yml'),
      'nombre: Séneca\nañoFallecimiento: 65\nsemblanza: Filósofo estoico.\nordenAlfabetico: Séneca\n',
      'utf8',
    );
    await writeFile(join(corpus, 'citas', 'seneca--una.md'), citaValida({ temas: [] }), 'utf8');
    await writeFile(
      join(corpus, 'citas', 'seneca--atribuida.md'),
      citaValida({ temas: [], slug: 'seneca-atribuida', texto: 'Una frase que se le atribuye sin más.', clase: 'atribuida', procedencia: { año: 2000 } }),
      'utf8',
    );
    await writeFile(
      join(corpus, 'formas-vedadas.yml'),
      'formas:\n  - { forma: "una frase vieja", slug: "seneca-vieja", motivo: cambio-de-clase, fecha: "2026-11-14" }\n',
      'utf8',
    );
    const correr = (args: string[]) =>
      ejecutar('npx', ['tsx', join(RAIZ, 'tools/auditoria.ts'), ...args, '--corpus', corpus], { cwd: RAIZ });

    const json = JSON.parse((await correr(['--json'])).stdout) as {
      publicadas: { total: number; porcentajeCompleta: number };
      atribuidas: number;
      bajasPorCambioDeClase: number;
      cotejo: { conDocumento: number };
    };
    expect(json.publicadas.total).toBe(1);
    // La atribuida trae Fuente y aun así no cuenta como cotejada con su documento.
    expect(json.cotejo.conDocumento).toBe(1);
    expect(json.atribuidas).toBe(1);
    expect(json.bajasPorCambioDeClase).toBe(1);

    const { stdout } = await correr([]);
    expect(stdout).toMatch(/Atribuidas publicadas: +1 /u);
    expect(stdout).toMatch(/Bajas por cambio de clase: +1 /u);
    expect(stdout).toContain('léase como una bajada de SM-C1');
    expect(stdout).toMatch(/Citas de siempre publicadas: 1 /u);

    // Con el registro ilegible el informe sale sin la cifra de bajas —nunca un cero— y con 1.
    await writeFile(join(corpus, 'formas-vedadas.yml'), 'formas: [roto\n', 'utf8');
    const ilegible = await correr(['--json']).then(
      () => ({ code: 0, stdout: '' }),
      (fallo: { code: number; stdout: string }) => fallo,
    );
    expect(ilegible.code).toBe(1);
    const parcial = JSON.parse(ilegible.stdout) as { bajasPorCambioDeClase?: number; bajasSinLeer?: string };
    expect(parcial.bajasPorCambioDeClase).toBeUndefined();
    expect(parcial.bajasSinLeer).toMatch(/formas-vedadas/u);
  });
});
