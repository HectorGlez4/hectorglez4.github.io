import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { retirarFuente } from '../../tools/lib/gestion.ts';
import { nombreDeFicheroDeCita, rutasDelCorpus, type Rutas } from '../../tools/lib/corpus.ts';

/**
 * AD-2 — retirar un documento de Fuente es una orden, no cinco gestos a mano.
 *
 * Cinco veces en ocho sesiones se ha versionado un documento que no daba ninguna Cita —un
 * entremés, una crónica, dos índices, un ensayo con un término propio— y las cinco veces hubo
 * que **apartar el fichero a mano y rechazar sus candidatas con un guion de usar y tirar**.
 * Dos de esas veces las candidatas se quedaron huérfanas hasta que una prueba las cazó: una
 * candidata cuyo documento ya no está produciría una Cita que el cotejo de la 11.2 no puede
 * comprobar.
 *
 * Un proceso manual que ya ha fallado dos veces de cinco no es un descuido: **es un proceso que
 * fabrica defectos**, y lo que hay que arreglar es el proceso.
 *
 * Tres cosas hace la orden, y las tres importan:
 *
 *   · **se niega** si alguna Cita publicada sale de ese documento, porque retirarlo dejaría esa
 *     Cita sin nada contra lo que cotejarse —y lo dice con el número, para que se vea qué se
 *     perdería—;
 *   · **mueve, no borra** —a `corpus/_fuentes-retiradas/`, como AD-2 hace con las Colecciones—,
 *     así que la dirección se conserva y volver atrás es copiar un fichero;
 *   · **y arrastra las candidatas**, que es justo el paso que se olvidaba.
 */
describe('AD-2 — retirar un documento arrastra sus candidatas', () => {
  const temporales: string[] = [];
  afterEach(async () => {
    await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  });

  const URL = 'https://es.wikisource.org/wiki/El_retablo';
  const OTRA = 'https://es.wikisource.org/wiki/Otra_obra';

  const documento = [
    'fuente: wikisource-es',
    'obra: El retablo',
    `url: ${URL}`,
    'recuperado: 2026-08-26',
    '---',
    'El retablo',
    '---',
    'Dellos es, dellos el señor furrier.',
    '',
  ].join('\n');

  function candidata(slug: string, url: string): string {
    return [
      '---',
      `texto: "Una frase cualquiera con la longitud que hace falta, ${slug}."`,
      'autor: "miguel-de-cervantes"',
      `slug: "${slug}"`,
      'procedencia:',
      '  obra: "El retablo"',
      'estadoDerechos: "dominio-público"',
      'fuente:',
      '  id: "wikisource-es"',
      '  nombre: "Wikisource en español"',
      '  licencia: "CC BY-SA 4.0"',
      `  url: "${url}"`,
      '---',
      '',
    ].join('\n');
  }

  async function corpusCon(citas: { slug: string; url: string }[] = []): Promise<Rutas> {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-retirar-'));
    temporales.push(raiz);
    const rutas = rutasDelCorpus(join(raiz, 'corpus'));
    for (const dir of [rutas.citas, rutas.revision, rutas.fuentes]) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(join(rutas.fuentes, 'wikisource-es--el-retablo.txt'), documento, 'utf8');
    // Con el nombre canónico de la espina, `{slug-autor}--{fragmento}.md`: el corpus real se
    // llama así, y una prueba que use otro nombre no comprueba lo que ocurre de verdad.
    const enRevision = (slug: string) =>
      join(rutas.revision, `${nombreDeFicheroDeCita('miguel-de-cervantes', slug)}.md`);
    await writeFile(enRevision('a'), candidata('a', URL), 'utf8');
    await writeFile(enRevision('b'), candidata('b', URL), 'utf8');
    await writeFile(enRevision('c'), candidata('c', OTRA), 'utf8');
    for (const cita of citas) {
      await writeFile(join(rutas.citas, `${cita.slug}.md`), candidata(cita.slug, cita.url), 'utf8');
    }
    return rutas;
  }

  it('mueve el documento y rechaza solo sus candidatas', async () => {
    const rutas = await corpusCon();
    const r = await retirarFuente(rutas, 'wikisource-es--el-retablo.txt');

    expect(r.ok).toBe(true);
    expect(await readdir(rutas.fuentes)).toEqual([]);
    expect(await readdir(rutas.fuentesRetiradas)).toEqual(['wikisource-es--el-retablo.txt']);
    // La candidata de otra obra no se toca: la orden es de un documento, no de una limpieza.
    expect(await readdir(rutas.revision)).toEqual(['miguel-de-cervantes--c.md']);
  });

  it('el documento retirado conserva su dirección, para poder volver', async () => {
    const rutas = await corpusCon();
    await retirarFuente(rutas, 'wikisource-es--el-retablo.txt');

    const guardado = await readFile(
      join(rutas.fuentesRetiradas, 'wikisource-es--el-retablo.txt'),
      'utf8',
    );
    expect(guardado).toContain(URL);
  });

  it('se niega si alguna Cita publicada sale de ese documento', async () => {
    const rutas = await corpusCon([{ slug: 'publicada', url: URL }]);
    const r = await retirarFuente(rutas, 'wikisource-es--el-retablo.txt');

    expect(r.ok).toBe(false);
    expect(!r.ok && r.motivos.join(' ')).toMatch(/1 Cita/);
    // Y no ha tocado nada: ni el documento ni las candidatas.
    expect(existsSync(join(rutas.fuentes, 'wikisource-es--el-retablo.txt'))).toBe(true);
    expect(await readdir(rutas.revision)).toHaveLength(3);
  });

  it('y si el documento no existe, lo dice en vez de callar', async () => {
    const rutas = await corpusCon();
    const r = await retirarFuente(rutas, 'wikisource-es--no-existe.txt');
    expect(r.ok).toBe(false);
  });
});
