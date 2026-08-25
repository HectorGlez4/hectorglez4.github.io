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
  // Historia 11.2 — sin Fuente el alta manda la Cita a revisión, y estas pruebas miden
  // la detección de duplicados sobre Citas que sí llegan a publicarse.
  fuente: {
    id: 'wikisource-es',
    url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
  },
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

/**
 * Historia 15.2 — una Cita contenida en otra también es un duplicado.
 *
 * El caso salió del Corpus, no de la imaginación. En la 12.ª sesión del bucle v4 se publicó
 * «la diligencia es madre de la buena ventura»; en la 13.ª, «la diligencia es madre de la buena
 * ventura, y la pereza, su contraria, jamás llegó al término que pide un buen deseo». El detector
 * comparaba **formas canónicas iguales**, así que informó de cero duplicados —con razón: no son
 * iguales— y `slugLibre` resolvió la colisión renombrando la segunda a `-2` en silencio. El sitio
 * quedó con la misma sentencia en dos URL que solo se diferencian en un dígito, y el único
 * síntoma era ese sufijo.
 *
 * La guarda que faltaba es la contención: si una está entera dentro de la otra, es la misma
 * sentencia recortada. No se descarta —a veces el recorte es la Cita que uno quiere— sino que se
 * señala, como manda la Historia 1.6: el sistema no tiene criterio para decidirlo, el editor sí.
 */
describe('Historia 15.2 — una Cita contenida en otra también se señala', () => {
  const LARGA: EntradaDeLote = {
    ...ORIGINAL,
    texto: 'la diligencia es madre de la buena ventura, y la pereza, su contraria, jamás llegó al término que pide un buen deseo.',
  };
  const CORTA: EntradaDeLote = {
    ...ORIGINAL,
    texto: 'la diligencia es madre de la buena ventura',
  };

  it('la corta se señala cuando la larga ya está publicada', async () => {
    const rutas = await corpusDePrueba();
    await darDeAltaLote([LARGA], rutas);

    const informe = await darDeAltaLote([CORTA], rutas);

    expect(informe.posiblesDuplicados).toHaveLength(1);
    expect(informe.posiblesDuplicados[0].coincideCon).toMatch(/diligencia/);
    expect(informe.publicadas).toHaveLength(0);
  });

  it('y también al revés: la larga se señala cuando la corta ya está', async () => {
    const rutas = await corpusDePrueba();
    await darDeAltaLote([CORTA], rutas);

    const informe = await darDeAltaLote([LARGA], rutas);

    expect(informe.posiblesDuplicados).toHaveLength(1);
    expect(informe.publicadas).toHaveLength(0);
  });

  it('no deja ninguna Cita con sufijo numérico, que era el único síntoma', async () => {
    const rutas = await corpusDePrueba();
    await darDeAltaLote([LARGA], rutas);
    await darDeAltaLote([CORTA], rutas);

    const ficheros = await readdir(rutas.citas);
    expect(ficheros.filter((f) => /-\d+\.md$/.test(f))).toHaveLength(0);
  });

  it('una frase corta que aparece dentro de otra por casualidad NO se señala', async () => {
    /*
     * El guardián tiene que distinguir «la misma sentencia recortada» de «dos sentencias
     * distintas que comparten un giro». Sin suelo de longitud, «Yo sé quién soy» quedaría
     * atrapada por cualquier Cita larga que contuviese esas palabras, y el aviso se volvería
     * ruido que el editor aprende a ignorar — que es peor que no tenerlo.
     */
    const rutas = await corpusDePrueba();
    await darDeAltaLote(
      [{ ...ORIGINAL, texto: 'Quien no sabe adónde va, ningún viento le es favorable, y así navega toda su vida.' }],
      rutas,
    );

    const informe = await darDeAltaLote([{ ...ORIGINAL, texto: 'ningún viento le es' }], rutas);

    expect(informe.posiblesDuplicados).toHaveLength(0);
  });

  it('con --con-duplicados se publica igual, como con los duplicados exactos', async () => {
    const rutas = await corpusDePrueba();
    await darDeAltaLote([LARGA], rutas);

    const informe = await darDeAltaLote([CORTA], rutas, { conDuplicados: true });

    expect(informe.posiblesDuplicados).toHaveLength(0);
    expect(informe.publicadas).toHaveLength(1);
  });
});
