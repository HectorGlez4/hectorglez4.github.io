import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { aprobar, loteEnRevision, rechazar } from '../../tools/lib/revision.ts';
import { nombreDeFicheroDeCita, rutasDelCorpus, type Rutas } from '../../tools/lib/corpus.ts';

/** Historia 9.2 — aprobación por lote. */

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

const CANDIDATA_COMPLETA = {
  texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
  autor: 'seneca',
  temas: [],
  slug: 'seneca-no-es-que-tengamos-poco-tiempo',
  procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
  estadoDerechos: 'dominio-público',
  fuente: { id: 'wikisource-es', nombre: 'Wikisource en español', licencia: 'CC BY-SA 4.0' },
};

/** Sin Procedencia: la puerta de admisión no la deja pasar. */
const CANDIDATA_SIN_PROCEDENCIA = {
  texto: 'La vida es larga si sabes usarla y aprovecharla como es debido.',
  autor: 'seneca',
  temas: [],
  slug: 'seneca-la-vida-es-larga-si-sabes',
  estadoDerechos: 'dominio-público',
};

async function corpusCon(
  candidatas: Record<string, unknown>[],
  publicadas: Record<string, unknown>[] = [],
): Promise<Rutas> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-revision-'));
  temporales.push(raiz);
  const rutas = rutasDelCorpus(join(raiz, 'corpus'));
  for (const dir of [rutas.citas, rutas.autores, rutas.temas, rutas.revision]) {
    await mkdir(dir, { recursive: true });
  }
  for (const candidata of candidatas) {
    await writeFile(join(rutas.revision, `${candidata.slug}.md`), ficheroDeCita(candidata), 'utf8');
  }
  for (const cita of publicadas) {
    // Con el nombre canónico de la espina, `{slug-autor}--{fragmento}.md`: el corpus real
    // se llama así, y una prueba que use otro nombre no comprueba lo que ocurre de verdad.
    const nombre = nombreDeFicheroDeCita(String(cita.autor), String(cita.slug));
    await writeFile(join(rutas.citas, `${nombre}.md`), ficheroDeCita(cita), 'utf8');
  }
  return rutas;
}

describe('Historia 9.2 — aprobar es pedir que se publique, no publicar', () => {
  it('una candidata que cumple pasa a corpus/citas/', async () => {
    const rutas = await corpusCon([CANDIDATA_COMPLETA]);
    const resultado = await aprobar(rutas, [CANDIDATA_COMPLETA.slug as string]);

    expect(resultado.publicadas).toEqual([CANDIDATA_COMPLETA.slug]);
    expect(await readdir(rutas.citas)).toHaveLength(1);
    expect(await readdir(rutas.revision)).toHaveLength(0);
  });

  it('una que incumple no se publica aunque se apruebe', async () => {
    const rutas = await corpusCon([CANDIDATA_SIN_PROCEDENCIA]);
    const resultado = await aprobar(rutas, [CANDIDATA_SIN_PROCEDENCIA.slug as string]);

    expect(resultado.publicadas).toEqual([]);
    expect(resultado.rechazadasPorAdmision).toHaveLength(1);
    // Y sigue donde estaba, no se pierde por haberla aprobado.
    expect(await readdir(rutas.citas)).toHaveLength(0);
    expect(await readdir(rutas.revision)).toHaveLength(1);
  });

  it('dice qué regla incumple, con las palabras de la puerta de admisión', async () => {
    const rutas = await corpusCon([CANDIDATA_SIN_PROCEDENCIA]);
    const resultado = await aprobar(rutas, [CANDIDATA_SIN_PROCEDENCIA.slug as string]);
    expect(resultado.rechazadasPorAdmision[0].motivos.join(' ')).toMatch(/Procedencia/);
  });

  it('las reglas son las mismas que las del alta manual, no una copia', async () => {
    // La comprobación importa un módulo y no reimplementa nada: si `revision.ts` tuviera
    // su propia versión, podría publicar lo que el build rechaza después.
    const { readFileSync } = await import('node:fs');
    const fuente = readFileSync(new URL('../../tools/lib/revision.ts', import.meta.url), 'utf8');
    expect(fuente).toContain("from '../../src/lib/admision.ts'");
  });

  it('un lote se aprueba de una vez', async () => {
    const otra = { ...CANDIDATA_COMPLETA, slug: 'seneca-otra', texto: 'Ninguna cosa hay más nuestra que el tiempo.' };
    const rutas = await corpusCon([CANDIDATA_COMPLETA, otra]);

    const resultado = await aprobar(rutas, [CANDIDATA_COMPLETA.slug as string, 'seneca-otra']);
    expect(resultado.publicadas).toHaveLength(2);
    expect(await readdir(rutas.revision)).toHaveLength(0);
  });
});

describe('Retro épica 9 — aprobar nunca sobrescribe una Cita publicada', () => {
  /*
   * El slug de una Cita sale del Autor y de sus primeras palabras, así que dos Citas
   * distintas del mismo Autor que empiezan igual generan el mismo. La detección de
   * duplicados compara texto normalizado, no slug, y no lo ve. Antes de este arreglo,
   * aprobar la segunda hacía `rename()` sobre la primera y la Cita publicada
   * desaparecía sin decir nada, con su URL sirviendo otro texto.
   */
  const PUBLICADA = {
    ...CANDIDATA_COMPLETA,
    texto: 'No es que tengamos poco tiempo, es que perdemos una parte enorme de él.',
    slug: 'seneca-no-es-que-tengamos-poco-tiempo',
  };
  const CANDIDATA_QUE_COLISIONA = {
    ...CANDIDATA_COMPLETA,
    texto: 'No es que tengamos poco tiempo, es que lo perdemos casi todo sin verlo.',
    slug: 'seneca-no-es-que-tengamos-poco-tiempo',
  };

  it('la Cita publicada sobrevive, con su texto intacto', async () => {
    const rutas = await corpusCon([CANDIDATA_QUE_COLISIONA], [PUBLICADA]);
    await aprobar(rutas, [CANDIDATA_QUE_COLISIONA.slug]);

    const { readFile } = await import('node:fs/promises');
    const publicadas = await readdir(rutas.citas);
    const textos = await Promise.all(
      publicadas.map((f) => readFile(join(rutas.citas, f), 'utf8')),
    );
    expect(textos.some((t) => t.includes(PUBLICADA.texto)), 'la publicada se perdió').toBe(true);
  });

  it('la candidata se publica con un slug libre, no pisando el ocupado', async () => {
    const rutas = await corpusCon([CANDIDATA_QUE_COLISIONA], [PUBLICADA]);
    const resultado = await aprobar(rutas, [CANDIDATA_QUE_COLISIONA.slug]);

    // Las dos quedan publicadas: ninguna se pierde y ninguna se rechaza.
    expect(await readdir(rutas.citas)).toHaveLength(2);
    expect(resultado.publicadas).toHaveLength(1);
    expect(resultado.renombradas).toEqual([
      { de: 'seneca-no-es-que-tengamos-poco-tiempo', a: 'seneca-no-es-que-tengamos-poco-tiempo-2' },
    ]);
  });

  it('el slug del fichero y el del frontmatter no divergen', async () => {
    const rutas = await corpusCon([CANDIDATA_QUE_COLISIONA], [PUBLICADA]);
    await aprobar(rutas, [CANDIDATA_QUE_COLISIONA.slug]);

    const { readFile } = await import('node:fs/promises');
    for (const fichero of await readdir(rutas.citas)) {
      const contenido = await readFile(join(rutas.citas, fichero), 'utf8');
      const slug = contenido.match(/slug: "([^"]+)"/)![1];
      // `{slug-autor}--{fragmento}.md` frente a `{slug-autor}-{fragmento}`.
      expect(fichero).toBe(`${slug.replace('seneca-', 'seneca--')}.md`);
    }
  });

  it('la URL que ya existía no cambia: el sufijo se lo lleva la nueva', async () => {
    // Cambiar la de la Cita publicada rompería enlaces entrantes. Es la misma
    // convención que fijó la Historia 1.5 para el alta por lote.
    const rutas = await corpusCon([CANDIDATA_QUE_COLISIONA], [PUBLICADA]);
    await aprobar(rutas, [CANDIDATA_QUE_COLISIONA.slug]);

    const { readFile } = await import('node:fs/promises');
    const contenido = await readFile(
      join(rutas.citas, 'seneca--no-es-que-tengamos-poco-tiempo.md'),
      'utf8',
    );
    expect(contenido).toContain(PUBLICADA.texto);
  });

  it('sin colisión no se renombra nada', async () => {
    const rutas = await corpusCon([CANDIDATA_COMPLETA]);
    const resultado = await aprobar(rutas, [CANDIDATA_COMPLETA.slug as string]);
    expect(resultado.renombradas).toEqual([]);
  });
});

describe('Retro épica 9 — el punto de escritura no admite sobrescribir', () => {
  it('mover() se niega cuando el destino ya existe', async () => {
    /*
     * Es el cuello de botella de toda escritura en corpus/citas/. Que falle aquí es lo
     * que hace que la próxima puerta nueva herede la salvaguarda sin acordarse de ella.
     */
    const { mover } = await import('../../tools/lib/corpus.ts');
    const rutas = await corpusCon([CANDIDATA_COMPLETA]);
    const origen = join(rutas.revision, `${CANDIDATA_COMPLETA.slug}.md`);

    // La colisión se construye por nombre de fichero, que es lo que `mover` mira.
    await writeFile(join(rutas.citas, `${CANDIDATA_COMPLETA.slug}.md`), 'ya estaba aquí', 'utf8');

    await expect(mover(origen, rutas.citas)).rejects.toThrow(/ya existe/i);
    // Y lo que había en el destino sigue intacto.
    const { readFile } = await import('node:fs/promises');
    expect(await readFile(join(rutas.citas, `${CANDIDATA_COMPLETA.slug}.md`), 'utf8')).toBe(
      'ya estaba aquí',
    );
    // Y el origen sigue donde estaba: un fallo no puede perder el fichero.
    expect(existsSync(origen)).toBe(true);
  });
});

describe('Historia 9.2 — el duplicado se señala antes de decidir', () => {
  it('una candidata que duplica una publicada viene marcada', async () => {
    const publicada = { ...CANDIDATA_COMPLETA, slug: 'seneca-ya-publicada' };
    const rutas = await corpusCon([CANDIDATA_COMPLETA], [publicada]);

    const lote = await loteEnRevision(rutas);
    expect(lote[0].duplicaA).toEqual({ slug: 'seneca-ya-publicada', donde: 'publicadas' });
  });

  it('el duplicado no decide por el editor: la candidata sigue siendo aprobable', async () => {
    /*
     * El sistema no sabe si dos textos equivalentes son la misma Cita o dos ediciones
     * legítimas de la misma frase. Señalar y bloquear no es lo mismo, y el criterio pide
     * lo primero.
     */
    const publicada = { ...CANDIDATA_COMPLETA, slug: 'seneca-ya-publicada' };
    const rutas = await corpusCon([CANDIDATA_COMPLETA], [publicada]);

    const resultado = await aprobar(rutas, [CANDIDATA_COMPLETA.slug as string]);
    expect(resultado.publicadas).toEqual([CANDIDATA_COMPLETA.slug]);
  });

  it('el duplicado se detecta por la forma canónica, no por igualdad literal', async () => {
    const publicada = {
      ...CANDIDATA_COMPLETA,
      slug: 'seneca-ya-publicada',
      texto: '¡No es que tengamos poco tiempo; es que perdemos MUCHO!',
    };
    const rutas = await corpusCon([CANDIDATA_COMPLETA], [publicada]);
    expect((await loteEnRevision(rutas))[0].duplicaA?.slug).toBe('seneca-ya-publicada');
  });

  it('dos candidatas iguales dentro del mismo lote también se señalan', async () => {
    const gemela = { ...CANDIDATA_COMPLETA, slug: 'seneca-zeta-gemela' };
    const rutas = await corpusCon([CANDIDATA_COMPLETA, gemela]);

    const lote = await loteEnRevision(rutas);
    // La primera por orden no duplica a nadie; la segunda duplica a la primera.
    expect(lote[0].duplicaA).toBeUndefined();
    expect(lote[1].duplicaA).toEqual({ slug: lote[0].slug, donde: 'en revisión' });
  });
});

describe('Historia 9.2 — una candidata rechazada no queda en ninguna parte', () => {
  it('desaparece de revisión y no aparece en publicadas', async () => {
    const rutas = await corpusCon([CANDIDATA_COMPLETA]);
    const ruta = join(rutas.revision, `${CANDIDATA_COMPLETA.slug}.md`);
    expect(existsSync(ruta)).toBe(true);

    await rechazar(rutas, [CANDIDATA_COMPLETA.slug as string]);

    expect(existsSync(ruta)).toBe(false);
    expect(await readdir(rutas.revision)).toHaveLength(0);
    expect(await readdir(rutas.citas)).toHaveLength(0);
  });

  it('rechazar una no toca a las demás', async () => {
    const otra = { ...CANDIDATA_COMPLETA, slug: 'seneca-otra', texto: 'Ninguna cosa hay más nuestra que el tiempo.' };
    const rutas = await corpusCon([CANDIDATA_COMPLETA, otra]);

    await rechazar(rutas, ['seneca-otra']);
    expect(await readdir(rutas.revision)).toEqual([`${CANDIDATA_COMPLETA.slug}.md`]);
  });
});

describe('Historia 9.2 — se continúa donde se dejó', () => {
  it('lo ya decidido no vuelve a proponerse', async () => {
    const otra = { ...CANDIDATA_COMPLETA, slug: 'seneca-otra', texto: 'Ninguna cosa hay más nuestra que el tiempo.' };
    const tercera = { ...CANDIDATA_COMPLETA, slug: 'seneca-tercera', texto: 'Vive con tus semejantes como si te viera un dios.' };
    const rutas = await corpusCon([CANDIDATA_COMPLETA, otra, tercera]);

    expect(await loteEnRevision(rutas)).toHaveLength(3);

    await aprobar(rutas, [CANDIDATA_COMPLETA.slug as string]);
    await rechazar(rutas, ['seneca-otra']);

    /*
     * Ni fichero de progreso ni marca en el fichero: lo pendiente es lo que sigue en
     * `corpus/_revision/`. Un registro aparte podría desincronizarse del corpus, y
     * entonces la revisión repetiría decisiones o se saltaría candidatas.
     */
    const pendiente = await loteEnRevision(rutas);
    expect(pendiente.map((c) => c.slug)).toEqual(['seneca-tercera']);
  });

  it('aprobar algo que ya no está pendiente lo dice, y no revienta', async () => {
    const rutas = await corpusCon([CANDIDATA_COMPLETA]);
    await aprobar(rutas, [CANDIDATA_COMPLETA.slug as string]);

    const segunda = await aprobar(rutas, [CANDIDATA_COMPLETA.slug as string]);
    expect(segunda.noEncontradas).toEqual([CANDIDATA_COMPLETA.slug]);
    expect(segunda.publicadas).toEqual([]);
  });
});
