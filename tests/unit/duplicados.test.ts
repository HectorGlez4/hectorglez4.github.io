import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { darDeAltaLote, type EntradaDeLote } from '../../tools/alta.ts';
import { rutasDelCorpus, type Rutas } from '../../tools/lib/corpus.ts';

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function corpusDePrueba(): Promise<Rutas> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-dup-'));
  temporales.push(raiz);
  const rutas = rutasDelCorpus(join(raiz, 'corpus'));
  for (const dir of [rutas.citas, rutas.autores, rutas.temas, rutas.revision]) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(
    join(rutas.autores, 'seneca.yml'),
    'nombre: "Séneca"\nañoFallecimiento: 65\nsemblanza: "Filósofo estoico."\n',
    'utf8',
  );
  return rutas;
}

const ORIGINAL: EntradaDeLote = {
  texto: 'La vida, si sabes usarla, es larga.',
  autor: 'Séneca',
  procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
};

/** El mismo texto con otra puntuación, otros acentos y otras mayúsculas. */
const VARIANTE: EntradaDeLote = {
  ...ORIGINAL,
  texto: '«LA VIDÁ SI SABES USARLA ES LARGA»',
};

describe('Historia 1.6 — detección de duplicados', () => {
  it('señala una Cita equivalente a otra ya publicada, antes de escribirla', async () => {
    const rutas = await corpusDePrueba();
    await darDeAltaLote([ORIGINAL], rutas);

    const antes = await readdir(rutas.citas);
    const informe = await darDeAltaLote([VARIANTE], rutas);

    expect(informe.posiblesDuplicados).toHaveLength(1);
    expect(informe.posiblesDuplicados[0].coincideCon).toBe('seneca-la-vida-si-sabes-usarla-es-larga');
    expect(informe.posiblesDuplicados[0].donde).toBe('publicadas');
    expect(informe.publicadas).toHaveLength(0);
    // «antes de escribirla»: el corpus no ha cambiado, ni en citas/ ni en _revision/.
    expect(await readdir(rutas.citas)).toEqual(antes);
    expect(await readdir(rutas.revision)).toHaveLength(0);
  });

  it('la comparación tolera puntuación, acentuación y mayúsculas por separado', async () => {
    const rutas = await corpusDePrueba();
    await darDeAltaLote([ORIGINAL], rutas);

    for (const texto of [
      'la vida si sabes usarla es larga',
      'La vida; si sabes usarla... ¡es larga!',
      'LA VIDA, SI SABES USARLA, ES LARGA.',
      'La vidá, si sabés usarla, es larga.',
    ]) {
      const informe = await darDeAltaLote([{ ...ORIGINAL, texto }], rutas);
      expect(informe.posiblesDuplicados, texto).toHaveLength(1);
    }
  });

  it('un texto distinto no se confunde con uno existente', async () => {
    const rutas = await corpusDePrueba();
    await darDeAltaLote([ORIGINAL], rutas);

    const informe = await darDeAltaLote(
      [{ ...ORIGINAL, texto: 'La vida, si sabes usarla, es corta.' }],
      rutas,
    );
    expect(informe.posiblesDuplicados).toHaveLength(0);
    expect(informe.publicadas).toHaveLength(1);
  });

  it('confirmado por el editor, se incorpora igualmente', async () => {
    const rutas = await corpusDePrueba();
    await darDeAltaLote([ORIGINAL], rutas);

    const informe = await darDeAltaLote([VARIANTE], rutas, { conDuplicados: true });

    expect(informe.posiblesDuplicados).toHaveLength(0);
    expect(informe.publicadas).toHaveLength(1);
    expect(await readdir(rutas.citas)).toHaveLength(2);
  });

  it('el sistema no descarta nada por su cuenta', async () => {
    const rutas = await corpusDePrueba();
    await darDeAltaLote([ORIGINAL], rutas);
    const informe = await darDeAltaLote([VARIANTE], rutas);

    // La Cita señalada sigue disponible en el informe con su texto íntegro: no se ha
    // perdido, solo no se ha escrito. La decisión es del editor.
    expect(informe.posiblesDuplicados[0].texto).toBe(VARIANTE.texto);
    // Y la que ya estaba no se ha tocado.
    expect(await readdir(rutas.citas)).toHaveLength(1);
  });

  it('también detecta una repetición dentro del propio lote', async () => {
    const rutas = await corpusDePrueba();
    const informe = await darDeAltaLote([ORIGINAL, VARIANTE], rutas);

    expect(informe.publicadas).toHaveLength(1);
    expect(informe.posiblesDuplicados).toHaveLength(1);
    expect(informe.posiblesDuplicados[0].donde).toBe('el propio lote');
  });

  it('señala también coincidencias con lo que está en revisión', async () => {
    const rutas = await corpusDePrueba();
    // Sin procedencia, así que va a _revision/.
    await darDeAltaLote([{ ...ORIGINAL, procedencia: undefined }], rutas);

    const informe = await darDeAltaLote([VARIANTE], rutas);
    expect(informe.posiblesDuplicados).toHaveLength(1);
    expect(informe.posiblesDuplicados[0].donde).toBe('en revisión');
  });

  it('usa la función canónica y no una comparación propia', async () => {
    const { readFileSync } = await import('node:fs');
    const codigo = readFileSync(new URL('../../tools/alta.ts', import.meta.url), 'utf8');
    expect(codigo).toMatch(/from '\.\.\/src\/lib\/normalizar\.ts'/);
    expect(codigo).toMatch(/normalizar\(/);
    // Ninguna comparación artesanal de textos que esquive la forma canónica.
    expect(codigo).not.toMatch(/toLowerCase\(\)/);
  });
});
