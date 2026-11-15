import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { parse as parsearYaml } from 'yaml';
import { RAIZ } from './ayuda/construir.js';
import { MENSAJE_AÑOS_DE_PERSONAJE, personajeAdmisible } from '../../src/lib/admision.ts';
import { componerBiografia, nombreDeBiografia } from '../../tools/lib/documento.ts';
import { fallosDePersonajes } from '../../tools/lib/personajes.ts';
import { crearAutor } from '../../tools/lib/gestion.ts';
import { rutasDelCorpus } from '../../tools/lib/corpus.ts';

const ejecutar = promisify(execFile);

/**
 * Historia 35.2 — el Personaje entra en el Corpus: su esquema, la puerta pura del build y la
 * orden `tools/personaje.ts`, sobre corpus temporales. Nada de esto toca `corpus/`.
 */

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function corpusVacio(): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-personaje-'));
  temporales.push(raiz);
  const directorio = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'personajes', 'temas', '_revision']) {
    await mkdir(join(directorio, dir), { recursive: true });
  }
  return directorio;
}

async function correr(corpus: string, argumentos: string[]) {
  try {
    const { stdout, stderr } = await ejecutar(
      'npx',
      ['tsx', join(RAIZ, 'tools/personaje.ts'), ...argumentos, '--corpus', corpus],
      { cwd: RAIZ },
    );
    return { codigo: 0, salida: stdout, error: stderr };
  } catch (fallo) {
    const f = fallo as { code?: number; stdout?: string; stderr?: string };
    return { codigo: f.code ?? 1, salida: f.stdout ?? '', error: f.stderr ?? '' };
  }
}

/** Todo lo que hay en el corpus, fichero a fichero: para afirmar que un rechazo no escribe nada. */
async function foto(corpus: string): Promise<Record<string, string>> {
  const salida: Record<string, string> = {};
  for (const entrada of await readdir(corpus, { recursive: true })) {
    const ruta = join(corpus, entrada);
    try {
      salida[entrada] = await readFile(ruta, 'utf8');
    } catch {
      // un directorio
    }
  }
  return salida;
}

const BATMAN = 'nombre: "Batman"\nuniverso: "DC Comics"\nordenAlfabetico: "Batman"\n';

describe('el esquema del Personaje', () => {
  it('admite nombre y universo, y sin universo lo dice', () => {
    expect(personajeAdmisible.safeParse({ nombre: 'Batman', universo: 'DC Comics' }).success).toBe(true);
    const sin = personajeAdmisible.safeParse({ nombre: 'Batman' });
    expect(sin.error?.issues.map((i) => i.message).join()).toMatch(/universo/);
  });

  it('un año o «vivo» se rechaza con el mensaje propio de AD-33', () => {
    for (const año of [{ añoNacimiento: 1939 }, { añoFallecimiento: 2000 }, { vivo: true }]) {
      const r = personajeAdmisible.safeParse({ nombre: 'Batman', universo: 'DC', ...año });
      expect(r.success).toBe(false);
      expect(r.error?.issues.map((i) => i.message)).toContain(MENSAJE_AÑOS_DE_PERSONAJE);
    }
  });

  it('`.strict()`: una clave desconocida se rechaza nombrando los campos', () => {
    const r = personajeAdmisible.safeParse({ nombre: 'Batman', universo: 'DC', tradicion: 'otra' });
    expect(r.error?.issues.map((i) => i.message).join()).toMatch(/no reconoce «tradicion»/);
  });

  it('la semblanza va con su biografía, o es propia; nunca las dos', () => {
    const biografia = { documento: 'wikipedia-es--batman--r123', revision: 123 };
    const propia = { texto: 'Un justiciero.', responde: 'Héctor' };
    expect(personajeAdmisible.safeParse({ nombre: 'B', universo: 'DC', semblanzaPropia: propia }).success).toBe(true);
    expect(personajeAdmisible.safeParse({ nombre: 'B', universo: 'DC', semblanza: 'Texto.', biografia }).success).toBe(true);
    expect(personajeAdmisible.safeParse({ nombre: 'B', universo: 'DC', semblanza: 'Texto.' }).success).toBe(false);
    expect(personajeAdmisible.safeParse({ nombre: 'B', universo: 'DC', biografia }).success).toBe(false);
    const dos = personajeAdmisible.safeParse({ nombre: 'B', universo: 'DC', semblanza: 'T.', biografia, semblanzaPropia: propia });
    expect(dos.error?.issues.map((i) => i.message).join()).toMatch(/nunca las dos/);
    expect(personajeAdmisible.safeParse({ nombre: 'B', universo: 'DC', semblanzaPropia: { texto: 'T.' } }).success).toBe(false);
  });

  it('la clave tiene la forma de la del Autor', () => {
    expect(personajeAdmisible.safeParse({ nombre: 'B', universo: 'DC', ordenAlfabetico: '9' }).success).toBe(false);
    expect(personajeAdmisible.safeParse({ nombre: 'B', universo: 'DC', ordenRevisado: '2026-13-01' }).success).toBe(false);
  });
});

describe('la puerta pura del build', () => {
  it('nombra el Personaje con slug de Autor (activo o retirado) y la Cita con Personaje inexistente', () => {
    const fallos = fallosDePersonajes({
      personajes: [{ slug: 'seneca', ruta: 'corpus/personajes/seneca.yml' }, { slug: 'batman', ruta: 'corpus/personajes/batman.yml' }],
      autores: [{ slug: 'seneca', ruta: 'corpus/_autores-retirados/seneca.yml' }],
      citas: [
        { slug: 'batman-a', ruta: 'corpus/citas/batman--a.md', personaje: 'batman' },
        { slug: 'joker-a', ruta: 'corpus/citas/joker--a.md', personaje: 'joker' },
        { slug: 'seneca-a', ruta: 'corpus/citas/seneca--a.md' },
      ],
    });
    expect(fallos).toHaveLength(2);
    expect(fallos[0]).toContain('corpus/personajes/seneca.yml');
    expect(fallos[0]).toContain('corpus/_autores-retirados/seneca.yml');
    expect(fallos[1]).toContain('corpus/citas/joker--a.md');
    expect(fallos[1]).toContain('«joker»');
  });
});

describe('tools/personaje.ts', () => {
  it('crear escribe nombre, universo y la clave propuesta, y sale con 0', async () => {
    const corpus = await corpusVacio();
    const r = await correr(corpus, ['crear', 'Batman', '--universo', 'DC Comics']);
    expect(r.codigo, r.error).toBe(0);
    expect(r.salida).toContain('Personaje «batman» creado');
    const ficha = parsearYaml(await readFile(join(corpus, 'personajes', 'batman.yml'), 'utf8'));
    expect(ficha).toEqual({ nombre: 'Batman', universo: 'DC Comics', ordenAlfabetico: 'Batman' });
  });

  it('la forma de la invocación sale con 2 y no escribe nada', async () => {
    const corpus = await corpusVacio();
    const antes = await foto(corpus);
    for (const argumentos of [
      ['crear', 'Batman', '--universo', 'DC', '--inventada'],
      ['crear', 'Batman'],
      ['crear', '--universo', 'DC'],
      ['crear', 'Batman', 'Robin', '--universo', 'DC'],
      ['clave'],
      ['semblanza', 'batman', 'Un texto.'],
      ['listar', 'sobra'],
      ['volar'],
    ]) {
      const r = await correr(corpus, argumentos);
      expect(r.codigo, `${argumentos.join(' ')}: ${r.error}`).toBe(2);
    }
    expect(await foto(corpus)).toEqual(antes);
  });

  it('un slug de Autor, activo o retirado, o de otro Personaje sale con 1 y no escribe nada', async () => {
    const corpus = await corpusVacio();
    await writeFile(join(corpus, 'autores', 'seneca.yml'), 'nombre: "Séneca"\nañoFallecimiento: 65\nsemblanza: "F."\n', 'utf8');
    await mkdir(join(corpus, '_autores-retirados'), { recursive: true });
    await writeFile(join(corpus, '_autores-retirados', 'lucrecio.yml'), 'nombre: "Lucrecio"\nañoFallecimiento: -55\nsemblanza: "P."\n', 'utf8');
    await writeFile(join(corpus, 'personajes', 'batman.yml'), BATMAN, 'utf8');
    const antes = await foto(corpus);
    for (const nombre of ['Séneca', 'Lucrecio', 'Batman']) {
      const r = await correr(corpus, ['crear', nombre, '--universo', 'X']);
      expect(r.codigo, r.error).toBe(1);
      expect(r.error).toContain('No se ha escrito nada');
    }
    // Un esquema que no se sostiene, también con 1.
    expect((await correr(corpus, ['crear', 'Robin', '--universo', '   '])).codigo).toBe(1);
    expect(await foto(corpus)).toEqual(antes);
  });

  it('autor.ts crear se niega ante el slug de un Personaje', async () => {
    const corpus = await corpusVacio();
    await writeFile(join(corpus, 'personajes', 'batman.yml'), BATMAN, 'utf8');
    const hecho = await crearAutor(rutasDelCorpus(corpus), { nombre: 'Batman', añoFallecimiento: 1900, semblanza: 'Un hombre.' });
    expect(hecho.ok).toBe(false);
    if (!hecho.ok) expect(hecho.motivos.join('\n')).toMatch(/slug de un Personaje/);
    expect(existsSync(join(corpus, 'autores', 'batman.yml'))).toBe(false);
    // Y la orden sale con 1, no con 2: la invocación es buena, lo que dice choca.
    const r = await ejecutar(
      'npx',
      ['tsx', join(RAIZ, 'tools/autor.ts'), 'crear', '--nombre', 'Batman', '--fallecimiento', '1900', '--semblanza', 'Un hombre.', '--corpus', corpus],
      { cwd: RAIZ },
    ).then(
      () => ({ codigo: 0, error: '' }),
      (fallo: { code?: number; stderr?: string }) => ({ codigo: fallo.code ?? 1, error: fallo.stderr ?? '' }),
    );
    expect(r.codigo, r.error).toBe(1);
    expect(r.error).toMatch(/slug de un Personaje/);
    expect(existsSync(join(corpus, 'autores', 'batman.yml'))).toBe(false);
  });

  it('una bandera con valor vacío es la forma de la invocación: sale con 2', async () => {
    const corpus = await corpusVacio();
    await writeFile(join(corpus, 'personajes', 'batman.yml'), BATMAN, 'utf8');
    const antes = await foto(corpus);
    expect((await correr(corpus, ['semblanza', 'batman', 'Un texto.', '--responde', ''])).codigo).toBe(2);
    expect((await correr(corpus, ['crear', 'Robin', '--universo', ''])).codigo).toBe(2);
    expect(await foto(corpus)).toEqual(antes);
  });

  it('listar, proponer-claves y clave: la clave de un Personaje, con su revisión', async () => {
    const corpus = await corpusVacio();
    await writeFile(join(corpus, 'personajes', 'el-zorro.yml'), 'nombre: "El Zorro"\nuniverso: "Pulp"\n', 'utf8');
    const listado = await correr(corpus, ['listar']);
    expect(listado.codigo).toBe(0);
    expect(listado.salida).toContain('el-zorro\tEl Zorro\tPulp\tsin clave');

    const propuestas = await correr(corpus, ['proponer-claves']);
    expect(propuestas.codigo, propuestas.error).toBe(0);
    expect(await readFile(join(corpus, 'personajes', 'el-zorro.yml'), 'utf8')).toContain('ordenAlfabetico: "Zorro"');
    expect((await correr(corpus, ['proponer-claves'])).salida).toContain('Ninguna clave nueva');

    const fijada = await correr(corpus, ['clave', 'el-zorro', 'Zorro, El']);
    expect(fijada.codigo, fijada.error).toBe(0);
    const ficha = parsearYaml(await readFile(join(corpus, 'personajes', 'el-zorro.yml'), 'utf8'));
    expect(ficha.ordenAlfabetico).toBe('Zorro, El');
    expect(ficha.ordenRevisado).toMatch(/^\d{4}-\d{2}-\d{2}$/u);

    const antes = await foto(corpus);
    expect((await correr(corpus, ['clave', 'el-zorro', '9 mal'])).codigo).toBe(1);
    expect((await correr(corpus, ['clave', 'nadie'])).codigo).toBe(1);
    expect(await foto(corpus)).toEqual(antes);
  });

  it('semblanza escribe la propia con quien responde; ante una biografía se niega con 1', async () => {
    const corpus = await corpusVacio();
    await writeFile(join(corpus, 'personajes', 'batman.yml'), BATMAN, 'utf8');
    const r = await correr(corpus, ['semblanza', 'batman', 'Justiciero de Gotham.', '--responde', 'Héctor']);
    expect(r.codigo, r.error).toBe(0);
    const ficha = parsearYaml(await readFile(join(corpus, 'personajes', 'batman.yml'), 'utf8'));
    expect(ficha.semblanzaPropia).toEqual({ texto: 'Justiciero de Gotham.', responde: 'Héctor' });

    await writeFile(
      join(corpus, 'personajes', 'robin.yml'),
      'nombre: "Robin"\nuniverso: "DC"\nsemblanza: "Texto."\nbiografia:\n  documento: "wikipedia-es--robin--r1"\n  revision: 1\n',
      'utf8',
    );
    const antes = await foto(corpus);
    expect((await correr(corpus, ['semblanza', 'robin', 'Otro.', '--responde', 'Héctor'])).codigo).toBe(1);
    expect((await correr(corpus, ['semblanza', 'nadie', 'Otro.', '--responde', 'Héctor'])).codigo).toBe(1);
    expect(await foto(corpus)).toEqual(antes);
  });

  it('biografia lee la revisión del documento y escribe la semblanza con ella; sin semblanza, 1', async () => {
    const corpus = await corpusVacio();
    await writeFile(join(corpus, 'personajes', 'batman.yml'), BATMAN, 'utf8');
    await mkdir(join(corpus, 'biografias'), { recursive: true });
    const nombre = nombreDeBiografia('wikipedia-es', 'Batman', 123)!;
    await writeFile(
      join(corpus, 'biografias', `${nombre}.txt`),
      componerBiografia(
        {
          fuente: 'wikipedia-es',
          titulo: 'Batman',
          revision: 123,
          fechaDeRevision: '2022-01-01',
          licencia: 'CC BY-SA 3.0',
          url: 'https://es.wikipedia.org/w/index.php?title=Batman&oldid=123',
          recuperado: '2026-10-10',
        },
        'Batman',
        'Batman es un superhéroe de ficción creado por Bob Kane y Bill Finger.',
      ),
      'utf8',
    );
    const antes = await foto(corpus);
    expect((await correr(corpus, ['biografia', 'batman', nombre])).codigo).toBe(1);
    expect((await correr(corpus, ['biografia', 'batman', 'no-existe--x--r1', '--semblanza', 'X.'])).codigo).toBe(1);
    expect(await foto(corpus)).toEqual(antes);

    const semblanza = 'Batman es un superhéroe de ficción creado por Bob Kane y Bill Finger.';
    const r = await correr(corpus, ['biografia', 'batman', nombre, '--semblanza', semblanza]);
    expect(r.codigo, r.error).toBe(0);
    const ficha = parsearYaml(await readFile(join(corpus, 'personajes', 'batman.yml'), 'utf8'));
    expect(ficha).toMatchObject({ semblanza, biografia: { documento: nombre, revision: 123 } });
  });
});
