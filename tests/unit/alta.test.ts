import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { darDeAltaLote, type EntradaDeLote } from '../../tools/alta.ts';
import { rutasDelCorpus, type Rutas } from '../../tools/lib/corpus.ts';
import { CENSO_DE_PARTIDA } from '../../tools/lib/cotejo.ts';

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

/** Un corpus en disco con los Autores y Temas indicados y ninguna Cita. */
async function corpusDePrueba(
  autores: Record<string, string> = { seneca: 'Séneca' },
  temas: Record<string, string> = { 'el-tiempo': 'El tiempo' },
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
      `nombre: "${nombre}"\nañoFallecimiento: 65\nsemblanza: "Filósofo estoico."\n`,
      'utf8',
    );
  }
  for (const [slug, nombre] of Object.entries(temas)) {
    await writeFile(join(rutas.temas, `${slug}.yml`), `nombre: "${nombre}"\n`, 'utf8');
  }
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
  temas: ['El tiempo'],
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

    const escritas = await readdir(rutas.citas);
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
    expect(await readdir(rutas.citas)).toHaveLength(0);
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

    const escritas = await readdir(rutas.citas);
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
    expect(await readdir(rutas.citas)).toHaveLength(1);
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
      [{ ...COMPLETA, temas: [], procedencia: { obra: 'Cartas a Lucilio' } }],
      rutas,
    );

    const [fichero] = await readdir(rutas.citas);
    const contenido = await readFile(join(rutas.citas, fichero), 'utf8');

    expect(contenido).not.toMatch(/:\s*""/);
    expect(contenido).not.toMatch(/null/);
    // Los ausentes no aparecen: ni el año que no se documentó ni la lista de Temas vacía.
    expect(contenido).not.toContain('año:');
    expect(contenido).not.toContain('temas:');
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
    expect(await readdir(rutas.citas)).toHaveLength(0);
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
