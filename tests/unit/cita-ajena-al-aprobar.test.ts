import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { aprobar } from '../../tools/lib/revision.ts';
import { rutasDelCorpus, type Rutas } from '../../tools/lib/corpus.ts';

/**
 * Historia 9.2 — la comilla sin pareja también se mira al aprobar, no sólo al extraer.
 *
 * Es la lección de la 128.ª, y ya costó una vez: una puerta puesta sólo en la extracción
 * cubre lo que entra a partir de hoy y **no cubre lo que ya está en revisión**. Cuando esta
 * puerta se escribió había 19.036 candidatas versionadas, y **351** llevan comillas
 * descompensadas. Sin esta comprobación, cualquiera de esas 351 se publica leyendo mal una
 * vez, y el cotejo de la 11.2 la da por buena porque está literal en el documento.
 */

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

function ficheroDeCita(campos: Record<string, unknown>): string {
  const yaml = Object.entries(campos)
    .map(([clave, valor]) =>
      typeof valor === 'object' && valor !== null && !Array.isArray(valor)
        ? `${clave}:\n${Object.entries(valor as Record<string, unknown>)
            .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
            .join('\n')}`
        : `${clave}: ${JSON.stringify(valor)}`,
    )
    .join('\n');
  return `---\n${yaml}\n---\n`;
}

function candidataCon(texto: string, slug: string): Record<string, unknown> {
  return {
    texto,
    autor: 'concepcion-arenal',
    temas: [],
    slug,
    procedencia: { obra: 'La mujer del porvenir', año: 1869 },
    estadoDerechos: 'dominio-público',
    fuente: {
      id: 'wikisource-es',
      nombre: 'Wikisource en español',
      licencia: 'CC BY-SA 4.0',
      url: 'https://es.wikisource.org/wiki/La_mujer_del_porvenir',
    },
  };
}

async function corpusCon(candidatas: Record<string, unknown>[]): Promise<Rutas> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-cita-ajena-'));
  temporales.push(raiz);
  const rutas = rutasDelCorpus(join(raiz, 'corpus'));
  for (const dir of [rutas.citas, rutas.autores, rutas.temas, rutas.revision]) {
    await mkdir(dir, { recursive: true });
  }
  for (const candidata of candidatas) {
    await writeFile(join(rutas.revision, `${candidata.slug}.md`), ficheroDeCita(candidata), 'utf8');
  }
  return rutas;
}

describe('aprobar vuelve a pasar la puerta de la comilla sin pareja', () => {
  it('la que abre comilla y no la cierra no se publica aunque se apruebe', async () => {
    const candidata = candidataCon(
      '“Las pasiones envejecen y cambian, los partidos se debilitan, la verdad no perece jamás.',
      'una-que-abre-y-no-cierra',
    );
    const rutas = await corpusCon([candidata]);

    const resultado = await aprobar(rutas, [candidata.slug as string]);

    expect(resultado.publicadas).toEqual([]);
    expect(resultado.rechazadasPorAdmision).toHaveLength(1);
    // Y sigue donde estaba: aprobarla por error no la pierde.
    expect(await readdir(rutas.citas)).toHaveLength(0);
    expect(await readdir(rutas.revision)).toHaveLength(1);
  });

  it('el motivo dice que son palabras de otro, no otra cosa', async () => {
    const candidata = candidataCon(
      'basta asirse de una palabra ambigua, para contrariar las miras del legislador.»',
      'una-que-cierra-y-no-abre',
    );
    const rutas = await corpusCon([candidata]);

    const resultado = await aprobar(rutas, [candidata.slug as string]);

    expect(resultado.rechazadasPorAdmision[0]?.motivos.join(' ')).toMatch(/cita ajena/i);
  });

  it('y una Cita entrecomillada de verdad sigue publicándose', async () => {
    // La puerta no puede morder lo bueno: aquí las comillas están equilibradas, así que lo
    // citado va dentro de la frase del Autor y la frase es suya.
    const candidata = candidataCon(
      'Entre «lo justo» y «lo útil» hay toda la distancia que separa un carácter de un cálculo.',
      'una-con-las-comillas-en-su-sitio',
    );
    const rutas = await corpusCon([candidata]);

    const resultado = await aprobar(rutas, [candidata.slug as string]);

    expect(resultado.rechazadasPorAdmision).toEqual([]);
    expect(resultado.publicadas).toEqual([candidata.slug]);
  });
});
