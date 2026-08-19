import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { parse as parsearYaml } from 'yaml';
import { componerDocumento, type CabeceraDeDocumento } from '../../tools/lib/documento.ts';

const ejecutar = promisify(execFile);
const RAIZ = resolve(import.meta.dirname, '../..');

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

/**
 * Historia 9.1 — la herramienta, de punta a punta y sobre disco.
 * Historia 11.1 — la entrada ya no es un YAML escrito a mano, sino el documento que
 * produjo `tools/recuperar.ts`, y la orden comprueba que lo produjo.
 */

const TEXTO = [
  'No es que tengamos poco tiempo para vivir, sino que perdemos una gran parte de él.',
  'La vida es larga si sabes usarla y aprovecharla como es debido cada jornada.',
  'Non est quod credas quemquam fieri aliena infelicitate felicem atque beatum.',
].join(' ');

const CABECERA: CabeceraDeDocumento = {
  fuente: 'wikisource-es',
  obra: 'Sobre la brevedad de la vida',
  año: 49,
  url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
  recuperado: '2026-08-19',
};

const NOMBRE = 'wikisource-es--sobre-la-brevedad-de-la-vida.txt';

/**
 * Las líneas literales en las que la Fuente declara su metadato. De aquí salen la obra y
 * el año de cada candidata; la cabecera es registro de auditoría y no participa.
 */
const DECLARACION = ['Sobre la brevedad de la vida', 'Año de publicación: 49'].join('\n');

async function corpusVacio() {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-extraer-'));
  temporales.push(raiz);
  const corpus = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', '_revision', 'fuentes']) {
    await mkdir(join(corpus, dir), { recursive: true });
  }
  return { raiz, corpus };
}

/** Escribe un documento de Fuente como lo dejaría la recuperación. */
async function documento(
  corpus: string,
  cabecera: CabeceraDeDocumento = CABECERA,
  {
    nombre = NOMBRE,
    directorio = join(corpus, 'fuentes'),
    texto = TEXTO,
    declaracion = DECLARACION,
  } = {},
): Promise<string> {
  await mkdir(directorio, { recursive: true });
  const ruta = join(directorio, nombre);
  await writeFile(ruta, componerDocumento(cabecera, declaracion, texto), 'utf8');
  return ruta;
}

async function extraer(ruta: string, corpus: string, extra: string[] = []) {
  try {
    const { stdout } = await ejecutar(
      'npx',
      ['tsx', join(RAIZ, 'tools/extraer.ts'), ruta, '--autor', 'seneca', '--corpus', corpus, ...extra],
      { cwd: RAIZ },
    );
    return { codigo: 0, salida: stdout, error: '' };
  } catch (e) {
    const fallo = e as { code?: number; stdout?: string; stderr?: string };
    return { codigo: fallo.code ?? 1, salida: fallo.stdout ?? '', error: fallo.stderr ?? '' };
  }
}

async function frontmatterDe(corpus: string, fichero: string) {
  const contenido = await readFile(join(corpus, '_revision', fichero), 'utf8');
  return parsearYaml(contenido.split('---')[1]) as Record<string, any>;
}

describe('Historia 9.1 — las candidatas quedan en revisión, no publicadas', () => {
  it('escribe en corpus/_revision/ y no toca corpus/citas/', async () => {
    const { corpus } = await corpusVacio();
    const resultado = await extraer(await documento(corpus), corpus);

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await readdir(join(corpus, 'citas'))).toEqual([]);
    expect((await readdir(join(corpus, '_revision'))).length).toBeGreaterThan(0);
  });

  it('cada fichero escrito consta de qué Fuente salió y bajo qué licencia', async () => {
    const { corpus } = await corpusVacio();
    await extraer(await documento(corpus), corpus);

    for (const fichero of await readdir(join(corpus, '_revision'))) {
      const frontmatter = await frontmatterDe(corpus, fichero);

      expect(frontmatter.fuente.id).toBe('wikisource-es');
      expect(frontmatter.fuente.licencia).toBe('CC BY-SA 4.0');
      expect(frontmatter.procedencia.obra).toBe('Sobre la brevedad de la vida');
      expect(frontmatter.procedencia.año).toBe(49);
    }
  });

  it('el pasaje en latín no llegó a escribirse', async () => {
    const { corpus } = await corpusVacio();
    await extraer(await documento(corpus), corpus);

    for (const fichero of await readdir(join(corpus, '_revision'))) {
      const contenido = await readFile(join(corpus, '_revision', fichero), 'utf8');
      expect(contenido).not.toContain('Non est quod credas');
    }
  });

  it('el nombre de fichero es el que fija la espina', async () => {
    const { corpus } = await corpusVacio();
    await extraer(await documento(corpus), corpus);

    for (const fichero of await readdir(join(corpus, '_revision'))) {
      // `{slug-autor}--{fragmento}.md`, como en corpus/citas/. Sin el ayudante común
      // salía `seneca--seneca-...`, porque el slug ya empieza por el del Autor.
      expect(fichero).toMatch(/^seneca--[a-z0-9-]+\.md$/);
      expect(fichero).not.toContain('seneca--seneca');
    }
  });

  it('dice cuántas propuso y cuántas descartó, y por qué', async () => {
    const { corpus } = await corpusVacio();
    const resultado = await extraer(await documento(corpus), corpus);
    expect(resultado.salida).toMatch(/Candidatas en revisión: [1-9]/);
    expect(resultado.salida).toMatch(/no estar en español: 1/);
  });
});

describe('Retro épica 9 — repetir la extracción no pisa lo anterior', () => {
  it('una segunda extracción de la misma obra convive con la primera', async () => {
    /*
     * Antes, `ocupados` empezaba vacío en cada ejecución: solo evitaba colisiones dentro
     * de la misma. Repetir la extracción —lo natural tras ajustar la ventana de
     * longitud— sobrescribía las candidatas anteriores, incluidas las ya revisadas.
     */
    const { corpus } = await corpusVacio();
    const ruta = await documento(corpus);

    await extraer(ruta, corpus);
    const primera = await readdir(join(corpus, '_revision'));
    expect(primera.length).toBeGreaterThan(0);

    await extraer(ruta, corpus);
    const segunda = await readdir(join(corpus, '_revision'));

    // Ninguna de las primeras desapareció, y las nuevas llevan su propio nombre.
    for (const fichero of primera) expect(segunda).toContain(fichero);
    expect(segunda.length).toBe(primera.length * 2);
  });

  it('no reutiliza el slug de una Cita ya publicada', async () => {
    const { corpus } = await corpusVacio();
    const ruta = await documento(corpus);
    await extraer(ruta, corpus);

    // Se publica una a mano y se vuelve a extraer: el slug publicado queda ocupado.
    const [primera] = await readdir(join(corpus, '_revision'));
    await rename(join(corpus, '_revision', primera), join(corpus, 'citas', primera));

    await extraer(ruta, corpus);
    const enRevision = await readdir(join(corpus, '_revision'));
    expect(enRevision).not.toContain(primera);
  });
});

describe('Historia 9.1 — una licencia que no permite reutilizar no deja nada', () => {
  it('sale con error, explica por qué y el corpus queda intacto', async () => {
    const { corpus } = await corpusVacio();
    const ruta = await documento(
      corpus,
      {
        ...CABECERA,
        fuente: 'cervantes-virtual',
        url: 'https://www.cervantesvirtual.com/obra/sobre-la-brevedad-de-la-vida/',
      },
      { nombre: 'cervantes-virtual--sobre-la-brevedad-de-la-vida.txt' },
    );
    const resultado = await extraer(ruta, corpus);

    // El código distinto de cero importa: estas herramientas se encadenan en guiones y
    // un rechazo silencioso pasaría por éxito.
    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/no admite extracción/);
    expect(resultado.error).toMatch(/CC BY-NC-SA/);

    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
    expect(await readdir(join(corpus, 'citas'))).toEqual([]);
  });
});

describe('Historia 11.1 — el metadato sale del documento recuperado, no de quien escribe', () => {
  /*
   * Quitar las banderas `--obra`, `--año` y `--licencia` no cerraba nada por sí solo:
   * mientras la orden aceptase cualquier fichero con forma de cabecera, la superficie de
   * tecleo solo se mudaba del `.yaml` al `.txt`. Estas comprobaciones **ejecutan la
   * orden**; leer el código fuente buscando `'--obra'` no vale, porque esa aserción pasa
   * escribiendo la bandera con comillas dobles.
   */

  it('un documento con cabecera creíble fuera de corpus/fuentes/ no produce candidatas', async () => {
    const { raiz, corpus } = await corpusVacio();
    const aMano = await documento(
      corpus,
      {
        fuente: 'gutenberg',
        obra: 'Obra Que Nunca Existió',
        año: 1492,
        url: 'https://www.gutenberg.org/ebooks/1',
        recuperado: '2026-08-19',
      },
      {
        nombre: 'gutenberg--obra-que-nunca-existio.txt',
        directorio: raiz,
        declaracion: 'Title: Obra Que Nunca Existió\nOriginal publication: Madrid, 1492',
      },
    );

    const resultado = await extraer(aMano, corpus);

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/no lo produjo la recuperación|no está en/);
    // Y dice qué hay que hacer en su lugar.
    expect(resultado.error).toMatch(/tools\/recuperar\.ts/);
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
  });

  it('un nombre que no cuadra con su propia cabecera no produce candidatas', async () => {
    const { corpus } = await corpusVacio();
    const ruta = await documento(corpus, CABECERA, {
      nombre: 'wikisource-es--otra-obra-cualquiera.txt',
    });

    const resultado = await extraer(ruta, corpus);

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/no es el que implica la obra que declara el documento/);
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
  });

  it('una url de fuera del conjunto cerrado no produce candidatas', async () => {
    const { corpus } = await corpusVacio();
    const ruta = await documento(corpus, {
      ...CABECERA,
      url: 'https://frases-celebres.example.com/seneca',
    });

    const resultado = await extraer(ruta, corpus);

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/no es de la Fuente/);
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
  });

  it('una cabecera que declara una Fuente que no es la de su url no produce candidatas', async () => {
    // La combinación más golosa: la licencia de dominio público de Gutenberg pegada a un
    // texto de otro sitio.
    const { corpus } = await corpusVacio();
    const ruta = await documento(
      corpus,
      { ...CABECERA, fuente: 'gutenberg' },
      {
        nombre: 'gutenberg--sobre-la-brevedad-de-la-vida.txt',
        declaracion: 'Title: Sobre la brevedad de la vida\nOriginal publication: Roma, 49',
      },
    );

    const resultado = await extraer(ruta, corpus);

    expect(resultado.codigo).not.toBe(0);
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
  });

  it('un fichero que no existe se explica, no sale por una traza de ENOENT', async () => {
    const { corpus } = await corpusVacio();
    const resultado = await extraer(join(corpus, 'fuentes', 'no-existe.txt'), corpus);

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/No se pudo leer/);
    expect(resultado.error).not.toMatch(/ENOENT/);
  });

  it('editar el año de la cabecera no cambia el año de la candidata', async () => {
    /*
     * El nombre del fichero ata la Fuente y la obra, y dejaba el año suelto: un documento
     * **realmente recuperado** al que se le edita a mano `año: 1492` producía candidatas
     * con 1492. La obra y el año se vuelven a derivar de la declaración al extraer.
     */
    const { corpus } = await corpusVacio();
    const ruta = await documento(corpus, { ...CABECERA, año: 1492 });

    // La cabecera dice 1492 y la declaración sigue diciendo 49.
    expect(await readFile(ruta, 'utf8')).toContain('año: 1492');

    const resultado = await extraer(ruta, corpus);
    expect(resultado.codigo, resultado.error).toBe(0);

    const ficheros = await readdir(join(corpus, '_revision'));
    expect(ficheros.length).toBeGreaterThan(0);
    for (const fichero of ficheros) {
      expect((await frontmatterDe(corpus, fichero)).procedencia.año).toBe(49);
    }
  });

  it('editar la obra de la cabecera no cuela: el nombre lo ata a lo derivado', async () => {
    const { corpus } = await corpusVacio();
    const ruta = await documento(corpus, { ...CABECERA, obra: 'Otra Obra Cualquiera' });

    const resultado = await extraer(ruta, corpus);
    expect(resultado.codigo, resultado.error).toBe(0);

    for (const fichero of await readdir(join(corpus, '_revision'))) {
      expect((await frontmatterDe(corpus, fichero)).procedencia.obra).toBe(
        'Sobre la brevedad de la vida',
      );
    }
  });

  it('un documento cuya declaración no dice ninguna obra no produce candidatas', async () => {
    const { corpus } = await corpusVacio();
    const ruta = await documento(corpus, CABECERA, { declaracion: 'Año de publicación: 49' });

    const resultado = await extraer(ruta, corpus);
    expect(resultado.codigo).not.toBe(0);
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
  });

  it('pasar --obra, --año o --licencia no cambia lo que se escribe', async () => {
    const { corpus } = await corpusVacio();
    const ruta = await documento(corpus);

    const resultado = await extraer(ruta, corpus, [
      '--obra', 'Obra Que Nunca Existió',
      '--año', '1492',
      '--licencia', 'lo que yo diga',
    ]);

    // O la orden las rechaza, o las ignora; lo que no puede es hacerles caso.
    if (resultado.codigo === 0) {
      const ficheros = await readdir(join(corpus, '_revision'));
      expect(ficheros.length).toBeGreaterThan(0);
      for (const fichero of ficheros) {
        const frontmatter = await frontmatterDe(corpus, fichero);
        expect(frontmatter.procedencia.obra).toBe('Sobre la brevedad de la vida');
        expect(frontmatter.procedencia.año).toBe(49);
        expect(frontmatter.fuente.licencia).toBe('CC BY-SA 4.0');
      }
    } else {
      expect(await readdir(join(corpus, '_revision'))).toEqual([]);
    }
  });
});
