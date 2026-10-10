import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Historia 22.8 — la congelación de la familia Obra, **declarada**: lo que pasa en el código
 * cuando `CONGELACION_DE_OBRAS` de `src/lib/umbrales.ts` tiene valor.
 *
 * El repositorio la tiene en `undefined` y así se queda: aquí se sustituye el módulo para la
 * prueba, que es lo que haría el commit de congelar. La construcción con la congelación
 * declarada —las dos instancias de la regla de acuerdo— está en `obra-pagina.test.ts`.
 */

vi.mock('../../src/lib/umbrales.ts', async (original) => ({
  ...(await original<typeof import('../../src/lib/umbrales.ts')>()),
  CONGELACION_DE_OBRAS: { desde: '2026-12-06', indexables: ['gracian--oraculo', 'gracian--heroe'] },
}));

const { colgarObras, congelacionVigente, formaDeObra } = await import('../../src/lib/obras.ts');
const { obrasIndexables, rutasIndexables } = await import('../../src/lib/publicado.ts');
const { principal } = await import('../../tools/rastreo.ts');
const { olvidarRutasIndexables } = await import('../../src/lib/superficies.ts');

const temporales: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  olvidarRutasIndexables();
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const ficha = (slug: string, titulo: string) => ({
  nombre: `gracian--${slug}`,
  ruta: `corpus/obras/gracian--${slug}.yml`,
  autor: 'gracian',
  titulo,
  formas: [formaDeObra(titulo)],
});
const FICHAS = [ficha('oraculo', 'Oráculo'), ficha('criticon', 'Criticón'), ficha('heroe', 'El héroe')];

function citasDe(titulo: string, n: number) {
  return Array.from({ length: n }, (_, i) => ({
    slug: `gracian-${formaDeObra(titulo).replace(/\W+/gu, '-')}-${i}`,
    texto: `Texto ${i}.`,
    autor: 'gracian',
    temas: [],
    procedencia: { obra: titulo, año: 1647 },
    aptaParaPortada: false,
  }));
}

describe('con la congelación declarada', () => {
  it('la consulta exportada la devuelve, y es la misma declaración', () => {
    expect(congelacionVigente()).toEqual({
      desde: '2026-12-06',
      indexables: ['gracian--oraculo', 'gracian--heroe'],
    });
  });

  it('una Obra nueva que cumple FR-52 no entra: no está en la lista', () => {
    // Criticón, con 3 de 9, cumple la regla, pero no se indexaba al congelar.
    const citas = colgarObras([...citasDe('Oráculo', 3), ...citasDe('Criticón', 3), ...citasDe('El héroe', 3)], FICHAS);
    expect(obrasIndexables(citas).map((o) => o.nombre)).toEqual(['gracian--heroe', 'gracian--oraculo']);
    // Sin congelación, la regla sola la deja entrar.
    expect(obrasIndexables(citas, null).map((o) => o.nombre)).toContain('gracian--criticon');
    const conjunto = { citas, autores: [{ slug: 'gracian', nombre: 'Baltasar Gracián', semblanza: 'S.' }], temas: [], colecciones: [] };
    expect(rutasIndexables(conjunto as never)).not.toContain('/obra/gracian/criticon/');
  });

  it('una Obra de la lista que deja de cumplir la regla sale', () => {
    // El héroe, con una sola Cita, ya no cumple FR-52 aunque esté en la lista.
    const citas = colgarObras([...citasDe('Oráculo', 3), ...citasDe('El héroe', 1), ...citasDe('Criticón', 3)], FICHAS);
    expect(obrasIndexables(citas).map((o) => o.nombre)).toEqual(['gracian--oraculo']);
  });

  it('`npm run rastreo -- --registrar` rechaza una URL de Obra con 1 y nombra la congelación', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-congelacion-'));
    temporales.push(raiz);
    const corpus = join(raiz, 'corpus');
    for (const dir of ['citas', 'autores', 'temas', 'obras']) await mkdir(join(corpus, dir), { recursive: true });
    await writeFile(join(corpus, 'autores', 'gracian.yml'), 'nombre: "Baltasar Gracián"\nañoFallecimiento: 1658\nsemblanza: "S."\n', 'utf8');
    await writeFile(join(corpus, 'obras', 'gracian--oraculo.yml'), `autor: gracian\ntitulo: Oráculo\nformas:\n  - ${formaDeObra('Oráculo')}\n`, 'utf8');
    for (let i = 0; i < 6; i += 1) {
      await writeFile(
        join(corpus, 'citas', `c-${i}.md`),
        ['---', `slug: "gracian-c-${i}"`, `texto: "Texto ${i}."`, 'autor: "gracian"', ...(i < 3 ? ['procedencia:', '  obra: "Oráculo"'] : []), '---', ''].join('\n'),
        'utf8',
      );
    }
    const salida: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((t) => (salida.push(String(t)), true));
    vi.spyOn(process.stderr, 'write').mockImplementation((t) => (salida.push(String(t)), true));

    expect(await principal(['--corpus', corpus, '--registrar', '/obra/gracian/oraculo/'])).toBe(1);
    expect(salida.join('')).toMatch(/congelada desde el 2026-12-06/);
    expect(existsSync(join(corpus, 'peticiones-de-rastreo.yml'))).toBe(false);
    // Lo que no es Obra se sigue anotando.
    expect(await principal(['--corpus', corpus, '--registrar', '/autor/gracian/'])).toBe(0);
  });
});
