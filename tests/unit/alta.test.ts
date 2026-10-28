import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { darDeAltaLote, type EntradaDeLote } from '../../tools/alta.ts';
import { rutasDelCorpus, type Rutas } from '../../tools/lib/corpus.ts';
import { CENSO_DE_PARTIDA } from '../../tools/lib/cotejo.ts';
import { MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';
import {
  NOMBRE_DEL_TEMA_PUBLICADO,
  TEMA_PUBLICADO,
  ficherosPublicados,
  sembrarTemaPublicado,
} from './ayuda/relleno.ts';

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

/** Un corpus en disco con los Autores y Temas indicados y ninguna Cita. */
async function corpusDePrueba(
  autores: Record<string, string> = { seneca: 'Séneca' },
  temas: Record<string, string> = { 'el-tiempo': 'El tiempo' },
  /** Historia 26.8 — el Tema publicado de relleno (`ayuda/relleno.ts`); `false` sin él. */
  conRelleno = true,
): Promise<Rutas> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-corpus-'));
  temporales.push(raiz);
  const rutas = rutasDelCorpus(join(raiz, 'corpus'));

  for (const dir of [rutas.citas, rutas.autores, rutas.temas, rutas.revision]) {
    await mkdir(dir, { recursive: true });
  }
  for (const [slug, nombre] of Object.entries(autores)) {
    await writeFile(
      join(rutas.autores, `${slug}.yml`),
      `nombre: "${nombre}"\nañoFallecimiento: 65\nsemblanza: "Filósofo estoico."\nordenAlfabetico: "${nombre.split(' ').at(-1)}"\n`,
      'utf8',
    );
  }
  for (const [slug, nombre] of Object.entries(temas)) {
    await writeFile(join(rutas.temas, `${slug}.yml`), `nombre: "${nombre}"\n`, 'utf8');
  }
  if (conRelleno) await sembrarTemaPublicado(rutas);
  return rutas;
}

/**
 * La Fuente de la que salió — Historia 11.2.
 *
 * Sin ella el alta manda la Cita a `corpus/_revision/`: publicar en `corpus/citas/` algo
 * que el build no puede cotejar sería fabricar un build roto. Las únicas exentas son las
 * anteriores a la v3 que el censo ampara, y hay una prueba para eso más abajo.
 */
const FUENTE = {
  id: 'wikisource-es',
  nombre: 'Wikisource en español',
  licencia: 'CC BY-SA 4.0',
  url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
};

const COMPLETA: EntradaDeLote = {
  texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
  autor: 'Séneca',
  // Historia 26.8 — con un Tema publicado: sin él, el alta no la publica (NFR-5).
  temas: ['El tiempo', NOMBRE_DEL_TEMA_PUBLICADO],
  procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
  fuente: FUENTE,
};

describe('Historia 11.2 — el alta arrastra la Fuente hasta el fichero', () => {
  /*
   * Desde el cotejo del build, una Cita publicada sin Fuente y fuera del censo rompe la
   * construcción. Si el alta perdiera el campo por el camino, publicaría Citas que el
   * siguiente `npm run build` no deja pasar, y el editor no tendría dónde mirar.
   */
  it('la escribe entera en la Cita publicada', async () => {
    const rutas = await corpusDePrueba();
    await darDeAltaLote([COMPLETA], rutas);

    const escritas = await ficherosPublicados(rutas);
    const contenido = await readFile(join(rutas.citas, escritas[0]), 'utf8');
    expect(contenido).toContain('fuente:');
    expect(contenido).toContain('id: "wikisource-es"');
    expect(contenido).toContain(`url: "${FUENTE.url}"`);
  });

  it('sin Fuente, la Cita nueva se queda en revisión en vez de romper el build', async () => {
    /*
     * Antes se publicaba en `corpus/citas/` y la construcción siguiente moría: la
     * herramienta informaba de éxito y el fallo aparecía después, en otro sitio y en boca
     * de otra puerta. Ahora el alta aplica la misma regla que el build, importada.
     */
    const rutas = await corpusDePrueba();
    const informe = await darDeAltaLote(
      [{ ...COMPLETA, texto: 'Una frase nueva que nadie ha sembrado nunca.', fuente: undefined }],
      rutas,
    );

    expect(informe.publicadas).toHaveLength(0);
    expect(informe.enRevision).toHaveLength(1);
    expect(informe.enRevision[0].motivos.join(' ')).toMatch(/recuperar\.ts/);
    expect(await ficherosPublicados(rutas)).toHaveLength(0);
  });

  it('una de las anteriores a la v3, censada, sí se publica sin Fuente', async () => {
    // El censo de partida es el conjunto cerrado de `tools/lib/cotejo.ts`; esta Cita es
    // una de las 38, con su texto tal cual, así que el alta la deja pasar como el build.
    const [slug] = Object.keys(CENSO_DE_PARTIDA).filter((s) => s.startsWith('seneca-'));
    expect(slug).toBeDefined();

    const rutas = await corpusDePrueba();
    const informe = await darDeAltaLote([{ ...COMPLETA, fuente: undefined }], rutas);
    expect(informe.publicadas).toHaveLength(1);
    expect(informe.publicadas[0].slug).toBe('seneca-no-es-que-tengamos-poco-tiempo-es');
  });

  it('una Fuente a medias manda la Cita a revisión con la regla incumplida', async () => {
    // No es puerta lateral: el alta aplica la misma admisión que el build.
    const rutas = await corpusDePrueba();
    const informe = await darDeAltaLote(
      [{ ...COMPLETA, fuente: { id: 'wikisource-es' } }],
      rutas,
    );

    expect(informe.publicadas).toHaveLength(0);
    expect(informe.enRevision[0].motivos.join(' ')).toMatch(/dirección/);
  });
});

describe('Historia 1.5 — alta por lote', () => {
  it('las Citas completas se escriben en corpus/citas/ con su slug generado', async () => {
    const rutas = await corpusDePrueba();
    const informe = await darDeAltaLote([COMPLETA], rutas);

    expect(informe.publicadas).toHaveLength(1);
    expect(informe.enRevision).toHaveLength(0);
    expect(informe.publicadas[0].slug).toBe('seneca-no-es-que-tengamos-poco-tiempo-es');

    const escritas = await ficherosPublicados(rutas);
    expect(escritas).toEqual(['seneca--no-es-que-tengamos-poco-tiempo-es.md']);

    const contenido = await readFile(join(rutas.citas, escritas[0]), 'utf8');
    expect(contenido).toContain('slug: "seneca-no-es-que-tengamos-poco-tiempo-es"');
    expect(contenido).toContain('estadoDerechos: "dominio-público"');
    expect(contenido).toContain('obra: "Sobre la brevedad de la vida"');
  });

  it('las incompletas se escriben en corpus/_revision/', async () => {
    const rutas = await corpusDePrueba();
    const informe = await darDeAltaLote(
      [COMPLETA, { ...COMPLETA, texto: 'La vida, si sabes usarla, es larga.', procedencia: {} }],
      rutas,
    );

    expect(informe.publicadas).toHaveLength(1);
    expect(informe.enRevision).toHaveLength(1);
    expect(await ficherosPublicados(rutas)).toHaveLength(1);
    expect(await readdir(rutas.revision)).toHaveLength(1);
  });

  it('el informe dice, por cada rechazada, qué regla incumplió', async () => {
    const rutas = await corpusDePrueba();
    const informe = await darDeAltaLote(
      [
        { ...COMPLETA, texto: 'Sin procedencia alguna.', procedencia: undefined },
        { ...COMPLETA, texto: '', procedencia: { obra: 'Cartas a Lucilio' } },
      ],
      rutas,
    );

    expect(informe.enRevision).toHaveLength(2);
    expect(informe.enRevision[0].motivos.join(' ')).toMatch(/procedencia/i);
    expect(informe.enRevision[1].motivos.join(' ')).toMatch(/texto/i);
    // Cada motivo es una frase que dice qué hacer, no un código de error.
    for (const rechazada of informe.enRevision) {
      expect(rechazada.motivos.length).toBeGreaterThan(0);
      for (const motivo of rechazada.motivos) expect(motivo.length).toBeGreaterThan(10);
    }
  });

  it('el fichero en revisión conserva lo ya escrito, para poder completarlo', async () => {
    const rutas = await corpusDePrueba();
    await darDeAltaLote([{ ...COMPLETA, procedencia: undefined }], rutas);

    const [fichero] = await readdir(rutas.revision);
    const contenido = await readFile(join(rutas.revision, fichero), 'utf8');
    expect(contenido).toContain('No es que tengamos poco tiempo');
    expect(contenido).toContain('autor: "seneca"');
  });

  it('un Autor que no existe se señala en lugar de crearlo', async () => {
    const rutas = await corpusDePrueba();
    const informe = await darDeAltaLote(
      [{ ...COMPLETA, autor: 'Marco Aurelio' }],
      rutas,
    );

    expect(informe.autoresDesconocidos).toEqual(['Marco Aurelio']);
    expect(informe.enRevision).toHaveLength(1);
    expect(informe.enRevision[0].motivos.join(' ')).toMatch(/no existe en el corpus/);
    // Lo que no debe haber pasado: crear un Autor sin año de fallecimiento.
    expect(await readdir(rutas.autores)).toEqual(['seneca.yml']);
  });

  it('dos Citas del mismo Autor que empiezan igual no colisionan de slug', async () => {
    const rutas = await corpusDePrueba();
    const informe = await darDeAltaLote(
      [
        { ...COMPLETA, texto: 'La vida es larga si sabes usarla bien.' },
        { ...COMPLETA, texto: 'La vida es larga si sabes usarla mal.' },
      ],
      rutas,
    );

    expect(informe.publicadas).toHaveLength(2);
    const slugs = informe.publicadas.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(2);
    expect(slugs[1]).toMatch(/-2$/);
  });

  it('un campo opcional sin valor se omite del fichero, nunca vacío ni null', async () => {
    const rutas = await corpusDePrueba();
    await darDeAltaLote(
      // Historia 26.8 — con su Tema publicado: una Cita sin ninguno ya no se publica, así que la
      // lista de Temas vacía no llega a `corpus/citas/` por el alta.
      [{ ...COMPLETA, temas: [NOMBRE_DEL_TEMA_PUBLICADO], procedencia: { obra: 'Cartas a Lucilio' } }],
      rutas,
    );

    const [fichero] = await ficherosPublicados(rutas);
    const contenido = await readFile(join(rutas.citas, fichero), 'utf8');

    expect(contenido).not.toMatch(/:\s*""/);
    expect(contenido).not.toMatch(/null/);
    // Los ausentes no aparecen: el año que no se documentó.
    expect(contenido).not.toContain('año:');
    expect(contenido).toContain(`  - "${TEMA_PUBLICADO}"`);
    // Tampoco el marcado de portada cuando es falso: solo se registra el sí (FR-15).
    expect(contenido).not.toContain('aptaParaPortada');

    // Ninguna clave se queda sin valor. `procedencia:` no cuenta: encabeza un bloque,
    // y lo que la sigue está más sangrado.
    const lineas = contenido.split('\n');
    for (const [i, linea] of lineas.entries()) {
      if (!/^\s*[^\s:]+:\s*$/.test(linea)) continue;
      const sangria = linea.length - linea.trimStart().length;
      const siguiente = lineas[i + 1] ?? '';
      const sangriaSiguiente = siguiente.length - siguiente.trimStart().length;
      expect(sangriaSiguiente, `«${linea.trim()}» se queda sin valor`).toBeGreaterThan(sangria);
    }
  });

  it('--seco calcula el informe sin escribir nada', async () => {
    const rutas = await corpusDePrueba();
    const informe = await darDeAltaLote(
      // Textos distintos a propósito: con el mismo, la detección de duplicados de la
      // Historia 1.6 señalaría la segunda y no llegaría a la rama de revisión.
      [COMPLETA, { ...COMPLETA, texto: 'La vida, si sabes usarla, es larga.', procedencia: {} }],
      rutas,
      { seco: true },
    );

    expect(informe.publicadas).toHaveLength(1);
    expect(informe.enRevision).toHaveLength(1);
    expect(await ficherosPublicados(rutas)).toHaveLength(0);
    expect(await readdir(rutas.revision)).toHaveLength(0);
  });

  it('distingue procedencia completa de parcial en el informe', async () => {
    const rutas = await corpusDePrueba();
    const informe = await darDeAltaLote(
      [
        COMPLETA,
        { ...COMPLETA, texto: 'Otra cosa dijo el filósofo.', procedencia: { obra: 'Cartas a Lucilio' } },
      ],
      rutas,
    );

    expect(informe.publicadas.map((c) => c.grado)).toEqual(['completa', 'parcial']);
  });

  it('un Tema desconocido manda la Cita a revisión y lo dice', async () => {
    const rutas = await corpusDePrueba();
    const informe = await darDeAltaLote([{ ...COMPLETA, temas: ['La amistad'] }], rutas);

    expect(informe.enRevision).toHaveLength(1);
    expect(informe.enRevision[0].motivos.join(' ')).toMatch(/Tema desconocido/);
  });
});

describe('Historia 26.8 — el alta no publica una Cita sin Tema publicado', () => {
  /** `n` Citas ya publicadas de «El tiempo», escritas a mano. Sin relleno. */
  async function corpusDelTiempo(n: number): Promise<Rutas> {
    const rutas = await corpusDePrueba(undefined, undefined, false);
    for (let i = 1; i <= n; i += 1) {
      await writeFile(
        join(rutas.citas, `seneca--publicada-${i}.md`),
        `---\ntexto: "Publicada número ${i}: el tiempo es lo único nuestro."\nautor: "seneca"\n` +
          `temas:\n  - "el-tiempo"\nslug: "seneca-publicada-${i}"\nestadoDerechos: "dominio-público"\n---\n`,
        'utf8',
      );
    }
    return rutas;
  }
  const entrada = (n: number, temas: string[]): EntradaDeLote => ({
    ...COMPLETA,
    texto: `Entrada número ${n}: quien deja para mañana lo de hoy pierde los dos días.`,
    temas,
  });

  it('la 15.ª de un Tema se publica, y varias que juntas llegan también', async () => {
    const una = await corpusDelTiempo(MIN_CITAS_POR_TEMA - 1);
    const sola = await darDeAltaLote([entrada(1, ['El tiempo'])], una);
    expect(sola.publicadas).toHaveLength(1);
    expect(sola.rechazadasPorTema).toEqual([]);

    const dos = await corpusDelTiempo(MIN_CITAS_POR_TEMA - 2);
    const juntas = await darDeAltaLote([entrada(1, ['El tiempo']), entrada(2, ['El tiempo'])], dos);
    expect(juntas.publicadas).toHaveLength(2);
  });

  it('sin Tema publicado no se escribe en ningún sitio; las demás del lote siguen', async () => {
    const rutas = await corpusDelTiempo(MIN_CITAS_POR_TEMA - 1);
    const informe = await darDeAltaLote([entrada(1, []), entrada(2, ['El tiempo'])], rutas);

    expect(informe.publicadas).toHaveLength(1);
    expect(informe.enRevision).toEqual([]);
    expect(informe.rechazadasPorTema).toHaveLength(1);
    expect(informe.rechazadasPorTema[0].texto).toMatch(/^Entrada número 1/);
    expect(informe.rechazadasPorTema[0].slug).toMatch(/^seneca-entrada-numero-1/);
    expect(informe.rechazadasPorTema[0].motivos.join(' ')).toMatch(/no declara ningún Tema/);
    expect(await readdir(rutas.citas)).toHaveLength(MIN_CITAS_POR_TEMA);
    expect(await readdir(rutas.revision)).toEqual([]);
  });

  it('con un Tema que no llega ni con el lote, el parte da el Tema y su recuento', async () => {
    const rutas = await corpusDelTiempo(MIN_CITAS_POR_TEMA - 3);
    const informe = await darDeAltaLote([entrada(1, ['El tiempo']), entrada(2, ['El tiempo'])], rutas);

    expect(informe.publicadas).toEqual([]);
    expect(informe.rechazadasPorTema).toHaveLength(2);
    expect(informe.rechazadasPorTema[0].temas).toEqual([
      { slug: 'el-tiempo', nombre: 'El tiempo', citas: MIN_CITAS_POR_TEMA - 1 },
    ]);
    expect(await readdir(rutas.citas)).toHaveLength(MIN_CITAS_POR_TEMA - 3);
    expect(await readdir(rutas.revision)).toEqual([]);
  });

  it('en seco dice lo mismo sin escribir nada', async () => {
    const rutas = await corpusDelTiempo(MIN_CITAS_POR_TEMA - 1);
    const informe = await darDeAltaLote([entrada(1, []), entrada(2, ['El tiempo'])], rutas, { seco: true });
    expect(informe.publicadas).toHaveLength(1);
    expect(informe.rechazadasPorTema).toHaveLength(1);
    expect(await readdir(rutas.citas)).toHaveLength(MIN_CITAS_POR_TEMA - 1);
  });

  it('la orden sale con 1, también en seco, y lo dice', async () => {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const { resolve } = await import('node:path');
    const ejecutar = promisify(execFile);
    const raiz = resolve(import.meta.dirname, '../..');
    const rutas = await corpusDelTiempo(MIN_CITAS_POR_TEMA - 1);
    const lote = join(rutas.raiz, '..', 'lote.yaml');
    await writeFile(
      lote,
      `- texto: "${entrada(1, []).texto}"\n  autor: "Séneca"\n` +
        `  procedencia:\n    obra: "Sobre la brevedad de la vida"\n    año: 49\n` +
        `  fuente:\n    id: "wikisource-es"\n    nombre: "Wikisource en español"\n` +
        `    licencia: "CC BY-SA 4.0"\n    url: "${FUENTE.url}"\n`,
      'utf8',
    );
    for (const seco of [true, false]) {
      let codigo = 0;
      let salida = '';
      try {
        ({ stdout: salida } = await ejecutar(
          'npx',
          ['tsx', join(raiz, 'tools/alta.ts'), lote, '--corpus', rutas.raiz, ...(seco ? ['--seco'] : [])],
          { cwd: raiz },
        ));
      } catch (fallo) {
        codigo = (fallo as { code?: number }).code ?? 1;
        salida = (fallo as { stdout?: string }).stdout ?? '';
      }
      expect(codigo, salida).toBe(1);
      expect(salida).toMatch(/Sin Tema publicado, no escritas: 1/);
    }
    expect(await readdir(rutas.citas)).toHaveLength(MIN_CITAS_POR_TEMA - 1);
    expect(await readdir(rutas.revision)).toEqual([]);
  });
});
