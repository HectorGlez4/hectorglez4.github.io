/**
 * Una pasada del alta que se interrumpe tras publicar — Historia 35.1.
 *
 * Lo escrito no se deshace: si la segunda Cita del lote no se deja escribir, la primera ya está en
 * `corpus/citas/`. Sin anotarla, el siguiente build rompe con un «Anótela» genérico y la orden
 * habría dicho «No se ha escrito nada». Aquí: que se anota en `corpus/clases-de-cita.yml` y que el
 * error que sube (`PublicacionInterrumpida`) la nombra.
 *
 * Va en su propio fichero porque sustituye `escribirCita` del módulo del Corpus para provocar el
 * fallo a media pasada, y ese reemplazo vale para el fichero entero.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const fallo = vi.hoisted(() => ({ enLaEscritura: 0, escritas: 0 }));

vi.mock('../../tools/lib/corpus.ts', async (original) => {
  const modulo = await original<typeof import('../../tools/lib/corpus.ts')>();
  return {
    ...modulo,
    escribirCita: async (...args: Parameters<typeof modulo.escribirCita>) => {
      fallo.escritas += 1;
      if (fallo.escritas === fallo.enLaEscritura) throw new Error('disco lleno');
      return modulo.escribirCita(...args);
    },
  };
});

const { darDeAltaLote, mensajeDeAltaFallida } = await import('../../tools/alta.ts');
const { leerRegistroDeClases, rutasDelCorpus } = await import('../../tools/lib/corpus.ts');
const { PublicacionInterrumpida } = await import('../../tools/lib/clases.ts');
const { NOMBRE_DEL_TEMA_PUBLICADO, ficherosPublicados, sembrarTemaPublicado } = await import('./ayuda/relleno.ts');

const temporales: string[] = [];
afterEach(async () => {
  fallo.enLaEscritura = 0;
  fallo.escritas = 0;
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const ENTRADA = {
  texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
  autor: 'Séneca',
  temas: ['El tiempo', NOMBRE_DEL_TEMA_PUBLICADO],
  procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
  fuente: {
    id: 'wikisource-es',
    nombre: 'Wikisource en español',
    licencia: 'CC BY-SA 4.0',
    url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
  },
};

describe('Historia 35.1 — el alta interrumpida anota lo que ya publicó', () => {
  it('la primera Cita queda publicada y anotada; el error la nombra y no dice «nada escrito»', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-alta-interrumpida-'));
    temporales.push(raiz);
    const rutas = rutasDelCorpus(join(raiz, 'corpus'));
    for (const dir of [rutas.citas, rutas.autores, rutas.temas, rutas.revision]) await mkdir(dir, { recursive: true });
    await writeFile(
      join(rutas.autores, 'seneca.yml'),
      'nombre: "Séneca"\nañoFallecimiento: 65\nsemblanza: "Filósofo estoico."\nordenAlfabetico: "Séneca"\n',
      'utf8',
    );
    await writeFile(join(rutas.temas, 'el-tiempo.yml'), 'nombre: "El tiempo"\n', 'utf8');
    await sembrarTemaPublicado(rutas);
    const yaEscritas = fallo.escritas;
    fallo.enLaEscritura = yaEscritas + 2;

    const lanzado = await darDeAltaLote([ENTRADA, { ...ENTRADA, texto: 'Otra sentencia distinta del Autor.' }], rutas).then(
      () => undefined,
      (error: unknown) => error,
    );

    expect(lanzado).toBeInstanceOf(PublicacionInterrumpida);
    const interrumpida = lanzado as InstanceType<typeof PublicacionInterrumpida>;
    expect(interrumpida.publicadas).toHaveLength(1);
    expect(interrumpida.registroSinAnotar).toBeUndefined();
    expect(await ficherosPublicados(rutas)).toHaveLength(1);
    expect((await leerRegistroDeClases(rutas)).map((e) => [e.slug, e.clase])).toEqual([[interrumpida.publicadas[0], 'siempre']]);
    expect(mensajeDeAltaFallida(lanzado)).toMatch(/tras publicar 1 Cita .*disco lleno/su);
    expect(mensajeDeAltaFallida(lanzado)).not.toMatch(/No se ha escrito nada/u);
  });
});
