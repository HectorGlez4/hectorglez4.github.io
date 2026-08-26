import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { aprobar } from '../../tools/lib/revision.ts';
import { rutasDelCorpus, type Rutas } from '../../tools/lib/corpus.ts';

/**
 * La puerta de aparato de la Fuente también se aplica **al aprobar**, no solo al extraer.
 *
 * Las trece formas de `esAparatoDeLaFuente` se fueron añadiendo a lo largo de treinta sesiones, y
 * cada una se aplicaba **en la extracción**. Pero `corpus/_revision/` guarda más de siete mil
 * candidatas, casi todas extraídas **antes** de que existiera la mayoría de esas reglas. Una
 * candidata vieja no vuelve a pasar por la puerta: se aprueba y se publica.
 *
 * No es hipotético. La 128.ª tuvo delante, entre las candidatas de una sesión de siembra normal:
 *
 *     Urbano).--Estudio sobre los principios de la moral con relación á la doctrina
 *     positivista.--1,50 pesetas.
 *
 * Es la ficha bibliográfica que la 123.ª ya había cerrado —precio en pesetas, pie de imprenta— y
 * que sigue en el conjunto porque se extrajo antes. La cazó la lectura, y ese es justo el problema:
 * **el bucle está construido sobre que leer falla y la puerta es el respaldo.** Un respaldo que solo
 * cubre lo que entra a partir de hoy no cubre las siete mil que ya están dentro.
 *
 * Así que se aplica en los dos sitios. Cuesta una comprobación por candidata aprobada y cierra una
 * rendija que se abre sola cada vez que se añade una forma nueva.
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

/** Todo en regla salvo el texto, que decide cada prueba. */
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
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-aparato-'));
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

describe('aprobar vuelve a pasar la puerta de aparato de la Fuente', () => {
  it('la ficha bibliográfica no se publica aunque se apruebe', async () => {
    const candidata = candidataCon(
      'Urbano).--Estudio sobre los principios de la moral con relación á la doctrina positivista.--1,50 pesetas.',
      'concepcion-arenal-urbano-estudio-sobre-los-principios-de-la',
    );
    const rutas = await corpusCon([candidata]);

    const resultado = await aprobar(rutas, [candidata.slug as string]);

    expect(resultado.publicadas).toEqual([]);
    expect(resultado.rechazadasPorAdmision).toHaveLength(1);
    // Y sigue donde estaba: aprobarla por error no la pierde.
    expect(await readdir(rutas.citas)).toHaveLength(0);
    expect(await readdir(rutas.revision)).toHaveLength(1);
  });

  it('el motivo dice que es aparato, no otra cosa', async () => {
    // Quien revisa tiene que poder distinguir «le falta la Procedencia» de «esto no lo
    // escribió el Autor». Son dos arreglos distintos: uno se completa, el otro se descarta.
    const candidata = candidataCon(
      'Nota del transcriptor: se han corregido los errores evidentes de imprenta.',
      'una-nota-del-transcriptor',
    );
    const rutas = await corpusCon([candidata]);

    const resultado = await aprobar(rutas, [candidata.slug as string]);

    expect(resultado.rechazadasPorAdmision[0]?.motivos.join(' ')).toMatch(/aparato/i);
  });

  it('y una Cita de verdad sigue publicándose', async () => {
    // La comprobación nueva no puede convertirse en una puerta que muerda lo bueno: el
    // texto de abajo es una Cita publicada de verdad en el Corpus.
    const candidata = candidataCon(
      '¿Qué diferencia existe entre el que no halla qué comprar y el que no tiene medios de comprar lo que halla?',
      'concepcion-arenal-que-diferencia-existe-entre-el-que-no',
    );
    const rutas = await corpusCon([candidata]);

    const resultado = await aprobar(rutas, [candidata.slug as string]);

    expect(resultado.rechazadasPorAdmision).toEqual([]);
    expect(resultado.publicadas).toEqual([candidata.slug]);
  });
});
