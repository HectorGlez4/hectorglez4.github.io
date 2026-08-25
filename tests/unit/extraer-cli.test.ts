import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { parse as parsearYaml } from 'yaml';
import { componerDocumento, type CabeceraDeDocumento } from '../../tools/lib/documento.ts';
import { autorAdmisible, citaAdmisible } from '../../src/lib/admision.ts';

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

/**
 * Los Autores del Corpus de prueba, con el `nombre` y el año que exige `autorAdmisible`.
 *
 * Desde que `extraer` coteja el `--autor` contra lo que el documento declara, un corpus
 * sin `autores/` no es un corpus vacío: es uno en el que la orden no puede extraer nada,
 * porque ningún slug nombra a nadie. Son los mismos nombres que declaran los documentos
 * de estas pruebas, y las fichas pasan el esquema del proyecto —lo comprueba una prueba
 * de aquí abajo—, porque un corpus de prueba que el propio build rechazaría no prueba
 * nada de lo que pasa en el corpus de verdad.
 */
const AUTORES: Readonly<Record<string, { nombre: string; añoFallecimiento: number }>> = {
  seneca: { nombre: 'Séneca', añoFallecimiento: 65 },
  'amado-nervo': { nombre: 'Amado Nervo', añoFallecimiento: 1919 },
  'ricardo-palma': { nombre: 'Ricardo Palma', añoFallecimiento: 1919 },
  'manuel-gonzalez-prada': { nombre: 'Manuel González Prada', añoFallecimiento: 1918 },
  'juan-montalvo': { nombre: 'Juan Montalvo', añoFallecimiento: 1889 },
  'miguel-de-cervantes': { nombre: 'Miguel de Cervantes', añoFallecimiento: 1616 },
  'teresa-de-jesus': { nombre: 'Teresa de Jesús', añoFallecimiento: 1582 },
};

/** La ficha de un Autor tal y como la escribiría el alta, admisible para el esquema. */
function fichaDeAutor(slug: string): string {
  const { nombre, añoFallecimiento } = AUTORES[slug];
  return [
    `nombre: "${nombre}"`,
    `añoFallecimiento: ${añoFallecimiento}`,
    'semblanza: "Autor del corpus de prueba."',
    '',
  ].join('\n');
}

/**
 * Un corpus con sus directorios y sus Autores, y sin ninguna Cita ni documento.
 *
 * El nombre dice «con Autores» y no «vacío» porque las fichas no son decorado: sin ellas
 * la orden se niega antes de mirar el documento, que es la primera puerta de esta
 * historia.
 */
async function corpusConAutores() {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-extraer-'));
  temporales.push(raiz);
  const corpus = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', '_revision', 'fuentes']) {
    await mkdir(join(corpus, dir), { recursive: true });
  }
  for (const slug of Object.keys(AUTORES)) {
    await writeFile(join(corpus, 'autores', `${slug}.yml`), fichaDeAutor(slug), 'utf8');
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

async function extraer(ruta: string, corpus: string, extra: string[] = [], autor = 'seneca') {
  try {
    const { stdout } = await ejecutar(
      'npx',
      ['tsx', join(RAIZ, 'tools/extraer.ts'), ruta, '--autor', autor, '--corpus', corpus, ...extra],
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
    const { corpus } = await corpusConAutores();
    const resultado = await extraer(await documento(corpus), corpus);

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await readdir(join(corpus, 'citas'))).toEqual([]);
    expect((await readdir(join(corpus, '_revision'))).length).toBeGreaterThan(0);
  });

  it('cada fichero escrito consta de qué Fuente salió y bajo qué licencia', async () => {
    const { corpus } = await corpusConAutores();
    await extraer(await documento(corpus), corpus);

    for (const fichero of await readdir(join(corpus, '_revision'))) {
      const frontmatter = await frontmatterDe(corpus, fichero);

      expect(frontmatter.fuente.id).toBe('wikisource-es');
      expect(frontmatter.fuente.licencia).toBe('CC BY-SA 4.0');
      expect(frontmatter.procedencia.obra).toBe('Sobre la brevedad de la vida');
      expect(frontmatter.procedencia.año).toBe(49);
    }
  });

  it('lo que escribe pasa la puerta de admisión que aplicará el build', async () => {
    /*
     * Historia 11.2 — `fuenteDeCita` exige dirección, y la extracción la tenía opcional.
     * Una candidata inaprobable no se veía hasta el momento de revisarla, lejos de donde
     * se causó. La aserción no lee el código: valida lo escrito contra el esquema.
     */
    const { corpus } = await corpusConAutores();
    await extraer(await documento(corpus), corpus);

    const ficheros = await readdir(join(corpus, '_revision'));
    expect(ficheros.length).toBeGreaterThan(0);

    for (const fichero of ficheros) {
      const comprobacion = citaAdmisible.safeParse(await frontmatterDe(corpus, fichero));
      expect(
        comprobacion.success ? [] : comprobacion.error.issues.map((i) => i.message),
        fichero,
      ).toEqual([]);
    }
  });

  it('el pasaje en latín no llegó a escribirse', async () => {
    const { corpus } = await corpusConAutores();
    await extraer(await documento(corpus), corpus);

    for (const fichero of await readdir(join(corpus, '_revision'))) {
      const contenido = await readFile(join(corpus, '_revision', fichero), 'utf8');
      expect(contenido).not.toContain('Non est quod credas');
    }
  });

  it('el nombre de fichero es el que fija la espina', async () => {
    const { corpus } = await corpusConAutores();
    await extraer(await documento(corpus), corpus);

    for (const fichero of await readdir(join(corpus, '_revision'))) {
      // `{slug-autor}--{fragmento}.md`, como en corpus/citas/. Sin el ayudante común
      // salía `seneca--seneca-...`, porque el slug ya empieza por el del Autor.
      expect(fichero).toMatch(/^seneca--[a-z0-9-]+\.md$/);
      expect(fichero).not.toContain('seneca--seneca');
    }
  });

  it('dice cuántas propuso y cuántas descartó, y por qué', async () => {
    const { corpus } = await corpusConAutores();
    const resultado = await extraer(await documento(corpus), corpus);
    expect(resultado.salida).toMatch(/Candidatas en revisión: [1-9]/);
    expect(resultado.salida).toMatch(/no estar en español: 1/);
  });
});

describe('Retro épica 9 — repetir la extracción no pisa lo anterior', () => {
  it('una segunda extracción de la misma obra no pisa nada y tampoco duplica', async () => {
    /*
     * Esta prueba tuvo dos versiones, y la historia explica la de ahora.
     *
     * Al principio `ocupados` empezaba vacío en cada ejecución: solo evitaba colisiones
     * dentro de la misma. Repetir la extracción —lo natural tras ajustar la ventana de
     * longitud— **sobrescribía** las candidatas anteriores, incluidas las ya revisadas a
     * medias. Se arregló contando como ocupados los slugs de todo el Corpus, y la prueba
     * fijó el resultado de entonces: `segunda.length === primera.length * 2`.
     *
     * Ese arreglo cambiaba una pérdida por una duplicación. Se vio en vivo re-extrayendo
     * una sátira tras añadir una puerta nueva: **332 ficheros para 167 textos**, cada
     * candidata repetida con sufijo `-2`. El gesto que el propio comentario nombraba como
     * natural doblaba el montón por revisar, y las dos copias son indistinguibles salvo
     * por el nombre.
     *
     * Así que se conserva la intención —no pisar lo anterior— y se quita el doblado: una
     * candidata cuyo texto ya está en revisión para ese Autor **no es una candidata
     * nueva**, es la misma. La comparación es por texto y no por slug, porque el slug es
     * justo lo que el arreglo anterior hacía divergir.
     */
    const { corpus } = await corpusConAutores();
    const ruta = await documento(corpus);

    await extraer(ruta, corpus);
    const primera = await readdir(join(corpus, '_revision'));
    expect(primera.length).toBeGreaterThan(0);

    await extraer(ruta, corpus);
    const segunda = await readdir(join(corpus, '_revision'));

    // Ninguna de las primeras desapareció —esa es la parte que no cambia—…
    for (const fichero of primera) expect(segunda).toContain(fichero);
    // …y no hay una segunda copia de cada una.
    expect(segunda.length).toBe(primera.length);
  });

  it('no reutiliza el slug de una Cita ya publicada', async () => {
    const { corpus } = await corpusConAutores();
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
    const { corpus } = await corpusConAutores();
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
    const { raiz, corpus } = await corpusConAutores();
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
    const { corpus } = await corpusConAutores();
    const ruta = await documento(corpus, CABECERA, {
      nombre: 'wikisource-es--otra-obra-cualquiera.txt',
    });

    const resultado = await extraer(ruta, corpus);

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/no es el que implica la obra que declara el documento/);
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
  });

  it('una url de fuera del conjunto cerrado no produce candidatas', async () => {
    const { corpus } = await corpusConAutores();
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
    const { corpus } = await corpusConAutores();
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
    const { corpus } = await corpusConAutores();
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
    const { corpus } = await corpusConAutores();
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
    const { corpus } = await corpusConAutores();
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
    const { corpus } = await corpusConAutores();
    const ruta = await documento(corpus, CABECERA, { declaracion: 'Año de publicación: 49' });

    const resultado = await extraer(ruta, corpus);
    expect(resultado.codigo).not.toBe(0);
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
  });

  it('pasar --obra, --año o --licencia no cambia lo que se escribe', async () => {
    const { corpus } = await corpusConAutores();
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

/**
 * Fix 11.1b — la declaración lleva ahora también el encabezado del wikitexto.
 *
 * La extracción no se ha tocado, y ese es el punto: si la declaración incluye las líneas
 * del encabezado, los mismos lectores puros vuelven a derivar de ellas el mismo año. Y lo
 * ya versionado, que declara el año con la etiqueta de la página renderizada, se sigue
 * analizando y extrayendo igual.
 */
describe('Fix 11.1b — el año del encabezado del wikitexto llega a la candidata', () => {
  const CABECERA_TRISTE: CabeceraDeDocumento = {
    fuente: 'wikisource-es',
    obra: 'Triste',
    año: 1905,
    url: 'https://es.wikisource.org/wiki/Triste_(Nervo)',
    recuperado: '2026-08-20',
  };

  it('la candidata sale con Procedencia completa, y el año lo dice el wikitexto', async () => {
    const { corpus } = await corpusConAutores();
    const ruta = await documento(corpus, CABECERA_TRISTE, {
      nombre: 'wikisource-es--triste.txt',
      declaracion: ['Triste', '|título=Triste', '|autor=Amado Nervo', '|año = 1905'].join('\n'),
    });

    const resultado = await extraer(ruta, corpus, [], 'amado-nervo');
    expect(resultado.codigo, resultado.error).toBe(0);

    const ficheros = await readdir(join(corpus, '_revision'));
    expect(ficheros.length).toBeGreaterThan(0);
    for (const fichero of ficheros) {
      const frontmatter = await frontmatterDe(corpus, fichero);
      expect(frontmatter.procedencia.obra).toBe('Triste');
      expect(frontmatter.procedencia.año).toBe(1905);
    }
  });

  it('editar el año de la cabecera sigue sin colar: manda la línea del encabezado', async () => {
    const { corpus } = await corpusConAutores();
    const ruta = await documento(corpus, { ...CABECERA_TRISTE, año: 1492 }, {
      nombre: 'wikisource-es--triste.txt',
      declaracion: ['Triste', '|año = 1905'].join('\n'),
    });

    const resultado = await extraer(ruta, corpus);
    expect(resultado.codigo, resultado.error).toBe(0);
    for (const fichero of await readdir(join(corpus, '_revision'))) {
      expect((await frontmatterDe(corpus, fichero)).procedencia.año).toBe(1905);
    }
  });
});

describe('Fix 11.1b — un documento versionado antes del cambio se sigue extrayendo', () => {
  /*
   * El formato no cambia: la declaración solo gana líneas. Un `.txt` que la Historia 11.1
   * dejó en `corpus/fuentes/` tiene que seguir produciendo las mismas candidatas, con la
   * misma obra y el mismo año. El texto de aquí está congelado a propósito —no se compone
   * con `componerDocumento`— para que un cambio en el compositor no lo siga.
   */
  const ANTIGUO = [
    'fuente: wikisource-es',
    'obra: Sobre la brevedad de la vida',
    'año: 49',
    'url: https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
    'recuperado: 2026-08-19',
    '---',
    'Sobre la brevedad de la vida',
    'Año de publicación: 49',
    '---',
    TEXTO,
    '',
  ].join('\n');

  it('produce candidatas con la misma obra y el mismo año', async () => {
    const { corpus } = await corpusConAutores();
    const ruta = join(corpus, 'fuentes', NOMBRE);
    await writeFile(ruta, ANTIGUO, 'utf8');

    const resultado = await extraer(ruta, corpus);
    expect(resultado.codigo, resultado.error).toBe(0);

    const ficheros = await readdir(join(corpus, '_revision'));
    expect(ficheros.length).toBeGreaterThan(0);
    for (const fichero of ficheros) {
      const frontmatter = await frontmatterDe(corpus, fichero);
      expect(frontmatter.procedencia.obra).toBe('Sobre la brevedad de la vida');
      expect(frontmatter.procedencia.año).toBe(49);
    }
  });
});

describe('Fix 11.1b — la obra de la candidata es la que declara el encabezado', () => {
  /*
   * «— Amado Nervo, Triste (Nervo), 1905» llevaba el desambiguador de Wikisource dentro de
   * la atribución. La obra que contiene al poema es «Los jardines interiores», y la
   * extracción la deriva de la misma declaración literal de la que salió al recuperar.
   */
  const CABECERA_JARDINES: CabeceraDeDocumento = {
    fuente: 'wikisource-es',
    obra: 'Los jardines interiores',
    año: 1905,
    url: 'https://es.wikisource.org/wiki/Triste_(Nervo)',
    recuperado: '2026-08-20',
  };

  const DECLARACION_JARDINES = [
    'Triste (Nervo)',
    '|título=[[Los jardines interiores]]',
    '|autor=Amado Nervo',
    '|año = 1905',
  ].join('\n');

  it('la candidata cita la obra, no el nombre de la página', async () => {
    const { corpus } = await corpusConAutores();
    const ruta = await documento(corpus, CABECERA_JARDINES, {
      nombre: 'wikisource-es--los-jardines-interiores--triste-nervo.txt',
      declaracion: DECLARACION_JARDINES,
    });

    const resultado = await extraer(ruta, corpus, [], 'amado-nervo');
    expect(resultado.codigo, resultado.error).toBe(0);

    const ficheros = await readdir(join(corpus, '_revision'));
    expect(ficheros.length).toBeGreaterThan(0);
    for (const fichero of ficheros) {
      const frontmatter = await frontmatterDe(corpus, fichero);
      expect(frontmatter.procedencia.obra).toBe('Los jardines interiores');
      expect(frontmatter.procedencia.año).toBe(1905);
    }
  });

  it('un documento nombrado por la página ya no cuadra con la obra que declara', async () => {
    /*
     * La puerta de procedencia ata el nombre del fichero a la obra **derivada**. Un
     * documento nombrado por el título de la página no lo produjo esta recuperación, y no
     * produce candidatas: el mensaje dice qué orden hay que ejecutar en su lugar.
     */
    const { corpus } = await corpusConAutores();
    const ruta = await documento(corpus, CABECERA_JARDINES, {
      // Le falta el segmento de obra: la recuperación nunca produce un nombre así.
      nombre: 'wikisource-es--triste-nervo.txt',
      declaracion: DECLARACION_JARDINES,
    });

    const resultado = await extraer(ruta, corpus, [], 'amado-nervo');
    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/no es el que implica la obra/);
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
  });
});

/**
 * Fix 11.1b — un documento por página, y cada Cita dentro del suyo.
 *
 * Es la comprobación que ata esta decisión con la Historia 11.2: el cotejo literal busca
 * el texto de cada Cita en el documento de su Fuente, y con un solo documento por obra el
 * texto de la segunda página no estaba en ninguna parte.
 */
describe('Fix 11.1b — dos páginas hermanas, dos documentos, cada Cita en el suyo', () => {
  const OBRA = 'Los jardines interiores';

  const TRISTE = [
    'Adiós, dijo la voz; y el alma mía, temblando de dolor, se estremecía.',
    'Todo era paz en la arboleda umbría, y la tarde de otoño se moría.',
  ].join(' ');

  const TIBI_REGINA = [
    'Ella pasó y su rostro sereno se quedó para siempre en mi pecho.',
    'Nadie supo decirme quién había puesto tanta luz en aquel día deshecho.',
  ].join(' ');

  const cabecera = (url: string): CabeceraDeDocumento => ({
    fuente: 'wikisource-es',
    obra: OBRA,
    año: 1905,
    url,
    recuperado: '2026-08-20',
  });

  const declaracion = (pagina: string) =>
    [pagina, `|título=[[${OBRA}]]`, '|autor=Amado Nervo', '|año = 1905'].join('\n');

  /** Los dos documentos hermanos, tal y como los dejaría la recuperación. */
  async function hermanos(corpus: string) {
    const triste = await documento(corpus, cabecera('https://es.wikisource.org/wiki/Triste_(Nervo)'), {
      nombre: 'wikisource-es--los-jardines-interiores--triste-nervo.txt',
      declaracion: declaracion('Triste (Nervo)'),
      texto: TRISTE,
    });
    const tibi = await documento(corpus, cabecera('https://es.wikisource.org/wiki/Tibi_Regina'), {
      nombre: 'wikisource-es--los-jardines-interiores--tibi-regina.txt',
      declaracion: declaracion('Tibi Regina'),
      texto: TIBI_REGINA,
    });
    return { triste, tibi };
  }

  it('los dos derivan la misma obra y el mismo año, y dan candidatas distintas', async () => {
    const { corpus } = await corpusConAutores();
    const { triste, tibi } = await hermanos(corpus);

    const primera = await extraer(triste, corpus, [], 'amado-nervo');
    expect(primera.codigo, primera.error).toBe(0);
    const deTriste = await readdir(join(corpus, '_revision'));

    const segunda = await extraer(tibi, corpus, [], 'amado-nervo');
    expect(segunda.codigo, segunda.error).toBe(0);
    const todas = await readdir(join(corpus, '_revision'));

    expect(deTriste.length).toBeGreaterThan(0);
    expect(todas.length).toBeGreaterThan(deTriste.length);

    for (const fichero of todas) {
      const frontmatter = await frontmatterDe(corpus, fichero);
      expect(frontmatter.procedencia.obra).toBe(OBRA);
      expect(frontmatter.procedencia.año).toBe(1905);
    }

    // Y ninguna candidata de una página se repite en la otra.
    const deTibi = todas.filter((f) => !deTriste.includes(f));
    expect(deTibi.length).toBeGreaterThan(0);
    expect(deTibi.some((f) => deTriste.includes(f))).toBe(false);
  });

  it('cada candidata aparece literal en el documento del que salió', async () => {
    /*
     * El cotejo de la Historia 11.2 en pequeño, y el fallo que esta decisión existe para
     * impedir: con un solo documento por obra, el texto de la segunda página no estaba en
     * ninguna parte y su Cita no se podía cotejar contra nada.
     */
    const { corpus } = await corpusConAutores();
    const { triste, tibi } = await hermanos(corpus);

    const cuerpos = new Map<string, string>();
    for (const ruta of [triste, tibi]) {
      const contenido = await readFile(ruta, 'utf8');
      cuerpos.set(ruta, contenido.split('\n---\n').slice(2).join('\n---\n'));
    }

    // Se extrae de uno, se comprueba, y solo después del otro: así cada candidata se
    // atribuye sin ambigüedad al documento del que salió.
    for (const ruta of [triste, tibi]) {
      const vistas = new Set(await readdir(join(corpus, '_revision')));
      const resultado = await extraer(ruta, corpus, [], 'amado-nervo');
      expect(resultado.codigo, resultado.error).toBe(0);

      const nuevas = (await readdir(join(corpus, '_revision'))).filter((f) => !vistas.has(f));
      expect(nuevas.length, ruta).toBeGreaterThan(0);

      for (const fichero of nuevas) {
        const texto = (await frontmatterDe(corpus, fichero)).texto as string;
        expect(cuerpos.get(ruta), `${fichero} no aparece literal en su documento`).toContain(texto);
        // Y no está en el del hermano: son textos distintos, no la misma página dos veces.
        const hermano = ruta === triste ? tibi : triste;
        expect(cuerpos.get(hermano)).not.toContain(texto);
      }
    }
  });
});

/**
 * Historia 11.5 — un documento ilegible no siembra.
 *
 * Por la orden, que es donde se ve lo que de verdad importaba: que las candidatas **no
 * lleguen a `corpus/_revision/`**. Una candidata que nadie propone no se puede aprobar por
 * descuido, y las 61 de Palma solo las paró que una persona las leyera una por una.
 *
 * Las frases del documento roto son las reales del *Apéndice a Mis últimas tradiciones
 * peruanas*; las sanas están escritas para la prueba.
 */
describe('Historia 11.5 — el OCR roto no llega a revisión', () => {
  const OBRA = 'Apéndice a Mis últimas tradiciones peruanas';
  const NOMBRE_DE_PALMA = 'wikisource-es--apendice-a-mis-ultimas-tradiciones-peruanas.txt';

  const CABECERA_DE_PALMA: CabeceraDeDocumento = {
    fuente: 'wikisource-es',
    obra: OBRA,
    año: 1906,
    url: 'https://es.wikisource.org/wiki/Ap%C3%A9ndice_a_Mis_%C3%BAltimas_tradiciones_peruanas',
    recuperado: '2026-08-20',
  };

  const DECLARACION_DE_PALMA = [OBRA, '|autor=Ricardo Palma', '|año = 1906'].join('\n');

  /** Con el OCR roto. Literales del documento que la primera sesión de sembrado recuperó. */
  const ROTAS = [
    'For- mabalo un pliego, en folio menor, con las armas de la casa y el escudo de sus mayores.',
    'El que enseiia con el ejemplo no necesita levantar la voz para que lo escuchen los suyos.',
    'Era el patio un Ileno de gente que aguardaba la salida del virrey, sin qus nadie se atreviese a moverse.',
    'Sus tata* rabuelos vinieron de España, y de ellos heredó la casa, el nombre y la pobreza.',
    'Hablaba el italianoTonti con mucha gracia, y a nadie le importaba si era italiano 6 español.',
  ];

  /** Bien transcritas, y con largo de candidata: estas sí tienen que llegar a revisión. */
  const SANAS = [
    'La memoria de los pueblos es más terca que la de los hombres, y ninguna injusticia se olvida del todo.',
    'No hay tirano que no haya empezado por hacerse necesario, ni pueblo que no lo haya consentido.',
    'Quien escribe la historia de los vencidos escribe también la conciencia de los vencedores.',
    'Nada envejece tanto a un hombre como el empeño de que nadie note que ha envejecido.',
    'El que perdona por cansancio no perdona, y el que olvida por comodidad tampoco olvida.',
  ];

  const dePalma = (corpus: string, frases: string[]) =>
    documento(corpus, CABECERA_DE_PALMA, {
      nombre: NOMBRE_DE_PALMA,
      declaracion: DECLARACION_DE_PALMA,
      texto: frases.join(' '),
    });

  it('un documento con el OCR roto no propone ni una candidata, y lo dice con su medida', async () => {
    const { corpus } = await corpusConAutores();
    const resultado = await extraer(await dePalma(corpus, ROTAS), corpus, ['--seco'], 'ricardo-palma');

    expect(resultado.codigo).not.toBe(0);
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
    expect(resultado.error).toMatch(/no se puede leer/);
    // La medida, para que quien siembra sepa si el documento está roto o le faltó un pelo.
    expect(resultado.error).toMatch(/\d+ de sus \d+ palabras/);
    expect(resultado.error).toMatch(/%/);
    // Y qué se vio, con palabras del propio documento.
    expect(resultado.error).toMatch(/enseiia|qus|italianoTonti|For/);
  });

  it('el rechazo no toca el documento: sigue versionado, carácter por carácter', async () => {
    const { corpus } = await corpusConAutores();
    const ruta = await dePalma(corpus, ROTAS);
    const antes = await readFile(ruta, 'utf8');

    await extraer(ruta, corpus, [], 'ricardo-palma');

    expect(await readFile(ruta, 'utf8')).toBe(antes);
  });

  it('un documento sano con párrafos rotos propone solo lo sano, y cuenta lo demás', async () => {
    const { corpus } = await corpusConAutores();
    // Sano de sobra en conjunto —la medida global no lo condena— y roto a trozos.
    const salpicado = [...SANAS, ...SANAS, ...SANAS, ROTAS[0], ROTAS[4]];
    const resultado = await extraer(await dePalma(corpus, salpicado), corpus, [], 'ricardo-palma');

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(resultado.salida).toMatch(/Descartadas por ilegibles \(OCR roto\): 2/);

    const textos = [];
    for (const fichero of await readdir(join(corpus, '_revision'))) {
      textos.push((await frontmatterDe(corpus, fichero)).texto as string);
    }

    expect(textos.length).toBe(SANAS.length);
    for (const sana of SANAS) expect(textos).toContain(sana);
    for (const rota of [ROTAS[0], ROTAS[4]]) expect(textos).not.toContain(rota);
  });

  it('un documento sano entero no pierde ninguna candidata por legibilidad', async () => {
    const { corpus } = await corpusConAutores();
    const resultado = await extraer(await dePalma(corpus, SANAS), corpus, [], 'ricardo-palma');

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(resultado.salida).toMatch(/Descartadas por ilegibles \(OCR roto\): 0/);
    expect((await readdir(join(corpus, '_revision'))).length).toBe(SANAS.length);
  });

  it('la línea del recuento sale siempre, aunque no se descarte nada', async () => {
    // Un descarte mudo es el mismo problema con otro disfraz: la línea acompaña a las que
    // ya existían por longitud, por idioma y por repetición.
    const { corpus } = await corpusConAutores();
    const resultado = await extraer(await documento(corpus), corpus, ['--seco']);

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(resultado.salida).toMatch(/Descartadas por longitud: \d+/);
    expect(resultado.salida).toMatch(/Descartadas por ilegibles \(OCR roto\): \d+/);
    expect(resultado.salida).toMatch(/Descartadas por repetidas: \d+/);
  });
});

/**
 * FR-23, Historia 11.1 — el Autor también sale del documento, no de quien teclea.
 *
 * El hallazgo está registrado en `_bmad-output/implementation-artifacts/deferred-work.md`:
 * `--autor juan-montalvo` sobre «El sable» —que declara «Manuel González Prada»— produjo
 * 32 candidatas atribuidas al Autor equivocado, y el cotejo literal de la 11.2 las habría
 * dado por buenas, porque el texto **está** en ese documento. El error se cazó por fuera:
 * el texto habla de Dreyfus y de Kuropatkin, y Montalvo murió en 1889.
 *
 * Por la orden, que es donde importa: lo que la puerta tiene que impedir es que las
 * candidatas **lleguen a `corpus/_revision/`** con el Autor equivocado.
 */
describe('FR-23 — el Autor de la orden se coteja con el que declara el documento', () => {
  const OBRA_DE_PRADA = 'El sable';

  const CABECERA_DE_PRADA: CabeceraDeDocumento = {
    fuente: 'wikisource-es',
    obra: OBRA_DE_PRADA,
    año: 1904,
    url: 'https://es.wikisource.org/wiki/El_sable',
    recuperado: '2026-08-20',
  };

  /** Como la declara el documento versionado de verdad, línea por línea. */
  const DECLARACION_DE_PRADA = [
    OBRA_DE_PRADA,
    '|título=El sable',
    '|autor=Manuel González Prada',
    '|año=1904',
  ].join('\n');

  const elSable = (corpus: string) =>
    documento(corpus, CABECERA_DE_PRADA, {
      nombre: 'wikisource-es--el-sable.txt',
      declaracion: DECLARACION_DE_PRADA,
    });

  it('concuerdan: extrae como antes de este cambio', async () => {
    const { corpus } = await corpusConAutores();
    const resultado = await extraer(await elSable(corpus), corpus, [], 'manuel-gonzalez-prada');

    expect(resultado.codigo, resultado.error).toBe(0);
    expect((await readdir(join(corpus, '_revision'))).length).toBeGreaterThan(0);
  });

  it('no concuerdan: se niega, nombra las dos partes y no escribe nada', async () => {
    const { corpus } = await corpusConAutores();
    const resultado = await extraer(await elSable(corpus), corpus, [], 'juan-montalvo');

    // Código 1 —lo que la invocación dice—, no 2, que es la forma de la invocación.
    expect(resultado.codigo).toBe(1);
    expect(resultado.error).toContain('Manuel González Prada');
    expect(resultado.error).toContain('Juan Montalvo');
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
    expect(await readdir(join(corpus, 'citas'))).toEqual([]);
  });

  it('un --autor que no existe en el Corpus se rechaza antes de leer el documento', async () => {
    const { corpus } = await corpusConAutores();
    const resultado = await extraer(await elSable(corpus), corpus, [], 'autor-que-no-existe');

    expect(resultado.codigo).toBe(1);
    expect(resultado.error).toContain('autor-que-no-existe');
    expect(resultado.error).toMatch(/no es ningún Autor del Corpus/);
    // El lector acepta `.yml` y `.yaml`: señalar solo una manda a mirar donde no se lee.
    expect(resultado.error).toContain('autor-que-no-existe.yml');
    expect(resultado.error).toContain('.yaml');
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
  });

  it('y se rechaza aunque el documento ni siquiera exista: primero es el Autor', async () => {
    /*
     * El orden es la prueba de que el rechazo no depende de leer nada. Antes, un
     * `--autor` inventado producía candidatas y salía con código 0, de modo que el guion
     * de ingesta que la llamó creía haber sembrado bien.
     */
    const { corpus } = await corpusConAutores();
    const resultado = await extraer(
      join(corpus, 'fuentes', 'no-existe.txt'),
      corpus,
      [],
      'autor-que-no-existe',
    );

    expect(resultado.codigo).toBe(1);
    expect(resultado.error).toMatch(/no es ningún Autor del Corpus/);
    expect(resultado.error).not.toMatch(/No se pudo leer/);
  });

  it('la Fuente puede añadir un apellido: «Miguel de Cervantes Saavedra» concuerda', async () => {
    const { corpus } = await corpusConAutores();
    const ruta = await documento(
      corpus,
      {
        fuente: 'gutenberg',
        obra: 'Don Quijote',
        url: 'https://www.gutenberg.org/ebooks/2000',
        recuperado: '2026-08-20',
      },
      {
        nombre: 'gutenberg--don-quijote.txt',
        declaracion: ['Title: Don Quijote', 'Author: Miguel de Cervantes Saavedra'].join('\n'),
      },
    );

    const resultado = await extraer(ruta, corpus, [], 'miguel-de-cervantes');

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(resultado.error).not.toMatch(/No son el mismo Autor/);
    expect((await readdir(join(corpus, '_revision'))).length).toBeGreaterThan(0);
  });

  it('y un tratamiento: «Santa Teresa de Jesús» concuerda con «Teresa de Jesús»', async () => {
    const { corpus } = await corpusConAutores();
    const ruta = await documento(
      corpus,
      {
        fuente: 'wikisource-es',
        obra: 'Nada te turbe',
        url: 'https://es.wikisource.org/wiki/Nada_te_turbe',
        recuperado: '2026-08-20',
      },
      {
        nombre: 'wikisource-es--nada-te-turbe.txt',
        declaracion: [
          'Nada te turbe',
          '|título=Nada te turbe',
          '|autor=[[Santa Teresa de Jesús|Santa Teresa de Jesús]]',
        ].join('\n'),
      },
    );

    const resultado = await extraer(ruta, corpus, [], 'teresa-de-jesus');

    expect(resultado.codigo, resultado.error).toBe(0);
    expect((await readdir(join(corpus, '_revision'))).length).toBeGreaterThan(0);
  });

  it('un documento que no declara autor se extrae, y el informe dice que no se cotejó', async () => {
    // Un metadato que falta no es un fallo —igual que con el año—, pero conviene que se
    // vea que la puerta no actuó: una puerta muda se parece a una puerta que aprobó.
    const { corpus } = await corpusConAutores();
    const resultado = await extraer(await documento(corpus), corpus);

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(resultado.salida).toMatch(/Autor sin cotejar/);
    expect(resultado.salida).toContain('Séneca');
    expect((await readdir(join(corpus, '_revision'))).length).toBeGreaterThan(0);
  });

  it('y cuando sí lo declara, el informe nombra las dos partes', async () => {
    const { corpus } = await corpusConAutores();
    const resultado = await extraer(await elSable(corpus), corpus, [], 'manuel-gonzalez-prada');

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(resultado.salida).toMatch(/Autor cotejado/);
    expect(resultado.salida).toContain('Manuel González Prada');
  });

  it('un autor declarado que no se sabe interpretar se rechaza, y no pasa por ausente', async () => {
    /*
     * El fallo que esta rama existe para impedir: leer `<ref>` como «no declara autor»
     * dejaba la puerta sin actuar **y** hacía que el informe dijera que el documento no
     * declaraba autor, que es mentira. Una puerta muda no puede parecer una que aprueba.
     */
    const { corpus } = await corpusConAutores();
    const ruta = await documento(corpus, CABECERA_DE_PRADA, {
      nombre: 'wikisource-es--el-sable.txt',
      declaracion: [
        OBRA_DE_PRADA,
        '|título=El sable',
        '|autor=Manuel González Prada<ref>y no otro</ref>',
      ].join('\n'),
    });

    const resultado = await extraer(ruta, corpus, [], 'manuel-gonzalez-prada');

    expect(resultado.codigo).toBe(1);
    expect(resultado.error).toMatch(/no se sabe interpretar/);
    expect(resultado.error).toContain('<ref>');
    expect(resultado.error).not.toMatch(/no declara autor/);
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
  });

  it('un documento firmado «Anónimo» no declara a nadie: extrae sin cotejar', async () => {
    // Tratarlo como nombre real rechazaba el documento contra cualquier --autor con un
    // «no son el mismo Autor» que era falso: no hay dos partes que comparar.
    const { corpus } = await corpusConAutores();
    const ruta = await documento(corpus, CABECERA_DE_PRADA, {
      nombre: 'wikisource-es--el-sable.txt',
      declaracion: [OBRA_DE_PRADA, '|título=El sable', '|autor=Anónimo'].join('\n'),
    });

    const resultado = await extraer(ruta, corpus, [], 'manuel-gonzalez-prada');

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(resultado.salida).toMatch(/Autor sin cotejar/);
    expect((await readdir(join(corpus, '_revision'))).length).toBeGreaterThan(0);
  });

  it('un desajuste en Gutenberg también sale con 1: es otro lector y otra ficha', async () => {
    // La concordancia de Gutenberg ya estaba probada; el rechazo va por su propia
    // expresión regular y sin esta prueba nadie recorría ese camino.
    const { corpus } = await corpusConAutores();
    const ruta = await documento(
      corpus,
      {
        fuente: 'gutenberg',
        obra: 'Don Quijote',
        url: 'https://www.gutenberg.org/ebooks/2000',
        recuperado: '2026-08-20',
      },
      {
        nombre: 'gutenberg--don-quijote.txt',
        declaracion: ['Title: Don Quijote', 'Author: Miguel de Cervantes Saavedra'].join('\n'),
      },
    );

    const resultado = await extraer(ruta, corpus, [], 'juan-montalvo');

    expect(resultado.codigo).toBe(1);
    expect(resultado.error).toContain('Miguel de Cervantes Saavedra');
    expect(resultado.error).toContain('Juan Montalvo');
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
  });

  it('una ficha de Autor sin nombre se rechaza por su motivo, no por una traza', async () => {
    // El `nombre` es el lado del Corpus en el cotejo, y sin él no hay lado. Antes, la
    // comparación llegaba a normalizar `undefined` y la orden salía por una traza.
    const { corpus } = await corpusConAutores();
    await writeFile(
      join(corpus, 'autores', 'manuel-gonzalez-prada.yml'),
      'añoFallecimiento: 1918\nsemblanza: "Sin nombre, a propósito."\n',
      'utf8',
    );

    const resultado = await extraer(await elSable(corpus), corpus, [], 'manuel-gonzalez-prada');

    expect(resultado.codigo).toBe(1);
    expect(resultado.error).toMatch(/no declara ningún nombre/);
    expect(resultado.error).not.toMatch(/TypeError|at Object|\.ts:\d+/);
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
  });

  it('un corpus sin autores/ lo dice, y no manda a dar de alta a quien ya podría estarlo', async () => {
    /*
     * `leerAutores` no lanza cuando el directorio falta: devuelve lista vacía. Sin la
     * comprobación explícita, el usuario recibía «este Autor no existe», que es el
     * diagnóstico equivocado para un corpus al que le falta el directorio entero.
     */
    const { corpus } = await corpusConAutores();
    const ruta = await elSable(corpus);
    await rm(join(corpus, 'autores'), { recursive: true, force: true });

    const resultado = await extraer(ruta, corpus, [], 'manuel-gonzalez-prada');

    expect(resultado.codigo).toBe(1);
    expect(resultado.error).toMatch(/No existe .*autores/);
    expect(resultado.error).not.toMatch(/no es ningún Autor del Corpus/);
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
  });

  it('las fichas del corpus de prueba pasan el esquema del proyecto', async () => {
    // Un corpus de prueba que el propio build rechazaría no prueba nada de lo que pasa en
    // el corpus de verdad.
    const { corpus } = await corpusConAutores();

    for (const slug of Object.keys(AUTORES)) {
      const ficha = parsearYaml(await readFile(join(corpus, 'autores', `${slug}.yml`), 'utf8'));
      const comprobacion = autorAdmisible.safeParse(ficha);
      expect(
        comprobacion.success ? [] : comprobacion.error.issues.map((i) => i.message),
        slug,
      ).toEqual([]);
    }
  });
});

/**
 * Y la misma puerta sobre el documento real, que es el caso que la abrió.
 *
 * `corpus/fuentes/wikisource-es--el-sable.txt` está versionado con su declaración
 * literal, y `corpus/autores/` tiene a los dos Autores. Se ejecuta en seco para que la
 * ejecución no pueda escribir nada ni en el peor caso, y se comprueba además que
 * `corpus/_revision/` sigue como estaba.
 */
describe('FR-23 — sobre el Corpus real: «El sable» no se extrae como Montalvo', () => {
  const CORPUS = join(RAIZ, 'corpus');
  const EL_SABLE = join(CORPUS, 'fuentes', 'wikisource-es--el-sable.txt');

  it('con --autor juan-montalvo sale con código 1 y nombra a los dos', async () => {
    const antes = await readdir(join(CORPUS, '_revision'));
    const resultado = await extraer(EL_SABLE, CORPUS, ['--seco'], 'juan-montalvo');

    expect(resultado.codigo).toBe(1);
    expect(resultado.error).toContain('Manuel González Prada');
    expect(resultado.error).toContain('Juan Montalvo');
    expect(await readdir(join(CORPUS, '_revision'))).toEqual(antes);
  });

  it('con --autor manuel-gonzalez-prada extrae como antes de este cambio', async () => {
    const antes = await readdir(join(CORPUS, '_revision'));
    const resultado = await extraer(EL_SABLE, CORPUS, ['--seco'], 'manuel-gonzalez-prada');

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(resultado.salida).toMatch(/Candidatas en revisión: \d+ \(en seco/);
    expect(await readdir(join(CORPUS, '_revision'))).toEqual(antes);
  });
});
