import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { darDeAltaLote, type EntradaDeLote } from '../../tools/alta.ts';
import { rutasDelCorpus, type Rutas } from '../../tools/lib/corpus.ts';

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

const COMPLETA: EntradaDeLote = {
  texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
  autor: 'Séneca',
  temas: ['El tiempo'],
  procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
};

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
    const informe = await darDeAltaLote([COMPLETA, { ...COMPLETA, procedencia: {} }], rutas, {
      seco: true,
    });

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
