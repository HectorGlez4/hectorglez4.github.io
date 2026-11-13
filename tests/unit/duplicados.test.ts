import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { darDeAltaLote, type EntradaDeLote } from '../../tools/alta.ts';
import { rutasDelCorpus, type Rutas } from '../../tools/lib/corpus.ts';
import { NOMBRE_DEL_TEMA_PUBLICADO, ficherosPublicados, sembrarTemaPublicado } from './ayuda/relleno.ts';

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
    'nombre: "Séneca"\nañoFallecimiento: 65\nsemblanza: "Filósofo estoico."\nordenAlfabetico: "Séneca"\n',
    'utf8',
  );
  // Historia 26.8 — un Tema con página: sin él, el alta no publica nada (NFR-5).
  await sembrarTemaPublicado(rutas);
  return rutas;
}

const ORIGINAL: EntradaDeLote = {
  texto: 'La vida, si sabes usarla, es larga.',
  autor: 'Séneca',
  temas: [NOMBRE_DEL_TEMA_PUBLICADO],
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

    const antes = await ficherosPublicados(rutas);
    const informe = await darDeAltaLote([VARIANTE], rutas);

    expect(informe.posiblesDuplicados).toHaveLength(1);
    expect(informe.posiblesDuplicados[0].coincideCon).toBe('seneca-la-vida-si-sabes-usarla-es-larga');
    expect(informe.posiblesDuplicados[0].donde).toBe('publicadas');
    expect(informe.publicadas).toHaveLength(0);
    // «antes de escribirla»: el corpus no ha cambiado, ni en citas/ ni en _revision/.
    expect(await ficherosPublicados(rutas)).toEqual(antes);
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
    expect(await ficherosPublicados(rutas)).toHaveLength(2);
  });

  it('el sistema no descarta nada por su cuenta', async () => {
    const rutas = await corpusDePrueba();
    await darDeAltaLote([ORIGINAL], rutas);
    const informe = await darDeAltaLote([VARIANTE], rutas);

    // La Cita señalada sigue disponible en el informe con su texto íntegro: no se ha
    // perdido, solo no se ha escrito. La decisión es del editor.
    expect(informe.posiblesDuplicados[0].texto).toBe(VARIANTE.texto);
    // Y la que ya estaba no se ha tocado.
    expect(await ficherosPublicados(rutas)).toHaveLength(1);
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

    const ficheros = await ficherosPublicados(rutas);
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

describe('Historia 29.4 — la clase de la coincidencia y la casi igual', () => {
  const LARGA: EntradaDeLote = {
    ...ORIGINAL,
    texto: 'No es que tengamos poco tiempo, sino que perdemos mucho, y la vida es larga si sabes usarla.',
  };

  it('el posible duplicado dice su clase: repetidas o contenida', async () => {
    const rutas = await corpusDePrueba();
    await darDeAltaLote([LARGA], rutas);

    const repetida = await darDeAltaLote([{ ...LARGA, texto: LARGA.texto!.toUpperCase() }], rutas);
    expect(repetida.posiblesDuplicados.map((d) => d.clase)).toEqual(['repetidas']);

    const contenida = await darDeAltaLote(
      [{ ...LARGA, texto: 'No es que tengamos poco tiempo, sino que perdemos mucho' }],
      rutas,
    );
    expect(contenida.posiblesDuplicados.map((d) => d.clase)).toEqual(['contenida']);
  });

  it('la casi igual de una publicada de su Obra se publica y se nombra, en seco y de verdad', async () => {
    const rutas = await corpusDePrueba();
    const primera = await darDeAltaLote([LARGA], rutas);
    expect(primera.publicadas).toHaveLength(1);
    const otra = primera.publicadas[0].slug;

    const casi = { ...LARGA, texto: LARGA.texto!.replace('perdemos', 'gastamos') };
    const seco = await darDeAltaLote([casi], rutas, { seco: true });
    expect(seco.casiIguales).toHaveLength(1);

    const informe = await darDeAltaLote([casi], rutas);
    expect(informe.posiblesDuplicados).toEqual([]);
    expect(informe.publicadas).toHaveLength(1);
    expect(informe.casiIguales).toHaveLength(1);
    expect(informe.casiIguales[0]).toMatchObject({
      coincideCon: otra,
      donde: 'publicadas',
      palabra: { a: 'gastamos', b: 'perdemos' },
    });
    expect(informe.casiIguales[0].parecido).toBeGreaterThanOrEqual(0.85);
    const { formatearInforme } = await import('../../tools/alta.ts');
    expect(formatearInforme(informe)).toContain(`Casi igual a ${otra} (publicadas; casi iguales`);
  });

  it('la casi igual de otra Obra no se señala', async () => {
    const rutas = await corpusDePrueba();
    await darDeAltaLote([LARGA], rutas);
    const informe = await darDeAltaLote(
      [{ ...LARGA, texto: LARGA.texto!.replace('perdemos', 'gastamos'), procedencia: { obra: 'Cartas a Lucilio', año: 64 } }],
      rutas,
    );
    expect(informe.casiIguales).toEqual([]);
  });
  it('una casi igual que se aparta por repetida no sale como escrita; con --con-duplicados, sí', async () => {
    const rutas = await corpusDePrueba();
    const casi = { ...LARGA, texto: LARGA.texto!.replace('perdemos', 'gastamos') };
    await darDeAltaLote([LARGA], rutas);
    await darDeAltaLote([casi], rutas);

    // La misma que `casi`, ya publicada: se aparta por repetida, y su casi igual con LARGA no se anota.
    const apartada = await darDeAltaLote([{ ...casi, texto: casi.texto!.toUpperCase() }], rutas);
    expect(apartada.posiblesDuplicados.map((d) => d.clase)).toEqual(['repetidas']);
    expect(apartada.casiIguales).toEqual([]);

    const forzada = await darDeAltaLote([{ ...casi, texto: casi.texto!.toUpperCase() }], rutas, { conDuplicados: true });
    expect(forzada.publicadas).toHaveLength(1);
    expect(forzada.casiIguales.map((c) => c.donde)).toEqual(['publicadas']);
  });

  it('dos casi iguales de la misma Obra en un mismo lote: la segunda nombra a la primera', async () => {
    const rutas = await corpusDePrueba();
    const informe = await darDeAltaLote([LARGA, { ...LARGA, texto: LARGA.texto!.replace('perdemos', 'gastamos') }], rutas);
    expect(informe.publicadas).toHaveLength(2);
    expect(informe.casiIguales).toEqual([
      expect.objectContaining({ coincideCon: informe.publicadas[0].slug, donde: 'el propio lote' }),
    ]);
  });

  it('el parte nombra la clase del posible duplicado y escribe la cifra con coma', async () => {
    const { formatearInforme } = await import('../../tools/alta.ts');
    const rutas = await corpusDePrueba();
    const primera = await darDeAltaLote([LARGA], rutas);
    const contenida = await darDeAltaLote(
      [{ ...LARGA, texto: 'No es que tengamos poco tiempo, sino que perdemos mucho' }],
      rutas,
    );
    expect(formatearInforme(contenida)).toContain(`Coincide con ${primera.publicadas[0].slug} (publicadas; contenida).`);
    const repetida = await darDeAltaLote([{ ...LARGA, texto: LARGA.texto!.toUpperCase() }], rutas);
    expect(formatearInforme(repetida)).toContain(`Coincide con ${primera.publicadas[0].slug} (publicadas; repetidas).`);
    const casi = await darDeAltaLote([{ ...LARGA, texto: LARGA.texto!.replace('perdemos', 'gastamos') }], rutas, { seco: true });
    expect(formatearInforme(casi)).toMatch(/casi iguales, 0,\d\d; gastamos\/perdemos\)\./);
  });

  it('si la contienen una candidata en revisión y una publicada, nombra la publicada', async () => {
    const rutas = await corpusDePrueba();
    // Primero la que va a revisión (sin Fuente), luego la publicada: la de revisión entra antes en el índice.
    const { fuente: _sinFuente, ...sinFuente } = LARGA;
    await darDeAltaLote([{ ...sinFuente, texto: `${LARGA.texto} Y así se pasa.` }], rutas);
    const publicada = await darDeAltaLote([LARGA], rutas, { conDuplicados: true });
    expect(publicada.publicadas).toHaveLength(1);
    const informe = await darDeAltaLote(
      [{ ...LARGA, texto: 'No es que tengamos poco tiempo, sino que perdemos mucho' }],
      rutas,
    );
    expect(informe.posiblesDuplicados).toEqual([
      expect.objectContaining({ coincideCon: publicada.publicadas[0].slug, donde: 'publicadas', clase: 'contenida' }),
    ]);
  });
});

describe('Historia 35.6 — la Variante cuenta como duplicado', () => {
  const PUERTA = { maxCaracteres: 1000, maxPorObra: 1000, maxPorDueño: 1000, minAtestiguaciones: 2, buzon: 'b@ejemplo.org' };
  const ATESTIGUACIONES = [
    { url: 'https://es.wikiquote.org/wiki/Prueba', consultadaEl: '2026-11-01' },
    { url: 'https://www.elpais.com/cultura/prueba.html', consultadaEl: '2026-11-02' },
  ];
  const VARIANTE_PUBLICADA = 'Hasta el infinito y aún más allá, vigía de las estrellas.';
  const DE_BUZZ = 'buzz-hasta-el-infinito-y-mas-alla';

  /** El corpus de siempre, con Buzz y una atribuida suya publicada con Variante. */
  async function conBuzz(): Promise<Rutas> {
    const rutas = await corpusDePrueba();
    const { escribirCita } = await import('../../tools/lib/corpus.ts');
    await mkdir(rutas.personajes, { recursive: true });
    await writeFile(join(rutas.personajes, 'buzz.yml'), 'nombre: "Buzz Lightyear"\nuniverso: "Toy Story"\n', 'utf8');
    await escribirCita(rutas.citas, 'buzz--hasta-el-infinito-y-mas-alla', {
      texto: 'Hasta el infinito y más allá, guardián del cosmos.',
      personaje: 'buzz',
      slug: DE_BUZZ,
      procedencia: { año: 1995 },
      clase: 'atribuida',
      atestiguaciones: ATESTIGUACIONES,
      origen: 'original',
      variante: { texto: VARIANTE_PUBLICADA, region: 'espana', origen: 'doblaje' },
    });
    return rutas;
  }

  /** Una entrada atribuida de Buzz con Variante. */
  const deBuzz = (texto: string, variante: string): EntradaDeLote => ({
    texto,
    personaje: 'buzz',
    temas: [NOMBRE_DEL_TEMA_PUBLICADO],
    procedencia: { año: 1995 },
    atestiguaciones: ATESTIGUACIONES,
    origen: 'doblaje',
    variante: { texto: variante, region: 'espana', origen: 'doblaje' },
  });

  it('el alta de una de siempre que repite la Variante de una publicada la señala (FR-14) y no escribe nada', async () => {
    const rutas = await conBuzz();
    const antes = await ficherosPublicados(rutas);
    const informe = await darDeAltaLote([{ ...ORIGINAL, texto: VARIANTE_PUBLICADA }], rutas);
    expect(informe.posiblesDuplicados).toEqual([
      expect.objectContaining({ coincideCon: DE_BUZZ, donde: 'publicadas', clase: 'repetidas' }),
    ]);
    expect(informe.publicadas).toEqual([]);
    expect(await ficherosPublicados(rutas)).toEqual(antes);
  });

  it('el alta de una atribuida cuya Variante repite una de siempre: señalada, y con --con-duplicados, en revisión', async () => {
    const rutas = await conBuzz();
    await darDeAltaLote([ORIGINAL], rutas);
    const entrada = deBuzz('Una frase del doblaje latino que nadie más dijo.', ORIGINAL.texto!);

    const señalada = await darDeAltaLote([entrada], rutas, { puerta: PUERTA });
    expect(señalada.posiblesDuplicados).toEqual([
      expect.objectContaining({ coincideCon: 'seneca-la-vida-si-sabes-usarla-es-larga', donde: 'publicadas' }),
    ]);
    expect(señalada.publicadas).toEqual([]);

    const forzada = await darDeAltaLote([entrada], rutas, { puerta: PUERTA, conDuplicados: true });
    expect(forzada.publicadas).toEqual([]);
    expect(forzada.enRevision).toHaveLength(1);
    expect(forzada.enRevision[0].motivos.join('\n')).toMatch(
      /coincide con «seneca-la-vida-si-sabes-usarla-es-larga», de la clase siempre/u,
    );
  });

  it('el alta de una atribuida con Variante sin duplicado se publica con la Variante, y el slug sale solo del texto', async () => {
    const rutas = await conBuzz();
    const informe = await darDeAltaLote(
      [deBuzz('Al rescate, que la galaxia no se defiende sola.', 'Al rescate, que la galaxia no se defiende solita.')],
      rutas,
      { puerta: PUERTA },
    );
    expect(informe.enRevision).toEqual([]);
    const { slugDeCita } = await import('../../src/lib/slug.ts');
    expect(informe.publicadas.map((p) => p.slug)).toEqual([slugDeCita('buzz', 'Al rescate, que la galaxia no se defiende sola.')]);
    const { readFile } = await import('node:fs/promises');
    const escrita = await readFile(informe.publicadas[0].ruta, 'utf8');
    expect(escrita).toContain('variante:\n  texto: "Al rescate, que la galaxia no se defiende solita."\n  region: "espana"\n  origen: "doblaje"\n');
  });

  it('la aprobación de una atribuida cuya Variante repite una publicada la deja en revisión', async () => {
    const rutas = await conBuzz();
    const { escribirCita } = await import('../../tools/lib/corpus.ts');
    const { aprobar } = await import('../../tools/lib/revision.ts');
    await darDeAltaLote([ORIGINAL], rutas);
    await escribirCita(rutas.revision, 'buzz--una-frase-del-doblaje', {
      texto: 'Una frase del doblaje latino que nadie más dijo.',
      personaje: 'buzz',
      temas: ['con-pagina'],
      slug: 'buzz-una-frase-del-doblaje',
      procedencia: { año: 1995 },
      clase: 'atribuida',
      atestiguaciones: ATESTIGUACIONES,
      origen: 'doblaje',
      variante: { texto: ORIGINAL.texto, region: 'espana', origen: 'doblaje' },
    });
    const resultado = await aprobar(rutas, ['buzz-una-frase-del-doblaje'], [], { puerta: PUERTA });
    expect(resultado.publicadas).toEqual([]);
    expect(resultado.rechazadasPorAdmision.map((r) => r.motivos.join(' '))).toEqual([
      expect.stringMatching(/coincide con «seneca-la-vida-si-sabes-usarla-es-larga», de la clase siempre/u),
    ]);
    expect(await readdir(rutas.revision)).toEqual(['buzz--una-frase-del-doblaje.md']);
  });
});
