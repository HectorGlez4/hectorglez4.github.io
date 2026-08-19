import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);
const RAIZ = resolve(import.meta.dirname, '../..');
const DOBLE = pathToFileURL(join(RAIZ, 'tests/unit/ayuda/doble-de-red.mjs')).href;

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

/**
 * Historia 11.1 — la recuperación, de punta a punta y sobre disco, con la red sustituida.
 *
 * `tools/recuperar.ts` es la cáscara exterior y el único punto del proyecto con `fetch`
 * (AD-22). Aquí se sustituye antes de invocar la orden, y el sustituto sabe devolver
 * 3xx, 404, un tipo que no es texto y lanzar: los caminos que en producción no se pueden
 * ensayar son justamente los que dejan el corpus en un estado que nadie mira.
 */

const URL_WIKISOURCE = 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida';

const PAGINA = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Sobre la brevedad de la vida - Wikisource</title></head><body>
<div id="mw-navigation"><nav><a href="/wiki/Portada">Portada</a></nav></div>
<h1 id="firstHeading">Sobre la brevedad de la vida</h1>
<div id="mw-content-text"><div class="mw-parser-output">
<p>A&ntilde;o de publicaci&oacute;n: 49</p>
<p>No es que tengamos poco tiempo para vivir, sino que perdemos una gran parte de &eacute;l.</p>
<p>La vida es larga si sabes usarla y aprovecharla como es debido cada jornada.</p>
</div></div>
<div id="catlinks">Categor&iacute;a: S&eacute;neca</div>
</body></html>`;

const URL_GUTENBERG = 'https://www.gutenberg.org/cache/epub/7500/pg7500.txt';

const LIBRO_GUTENBERG = [
  'Title: Del sentimiento trágico de la vida',
  'Author: Miguel de Unamuno',
  'Release date: January 1, 2005 [eBook #7500]',
  'Original publication: Madrid: Renacimiento, 1913',
  '',
  '*** START OF THE PROJECT GUTENBERG EBOOK DEL SENTIMIENTO ***',
  '',
  'El hombre de carne y hueso, el que nace, sufre y muere, es el sujeto y el',
  'supremo objeto de toda filosofía que se precie de serlo con razón.',
  '',
  '*** END OF THE PROJECT GUTENBERG EBOOK DEL SENTIMIENTO ***',
  '',
  'Updated editions will replace the previous one.',
].join('\n');

interface RespuestaFingida {
  estado?: number;
  cabeceras?: Record<string, string>;
  cuerpo?: string;
  cuerpoBase64?: string;
  /** Fabrica un cuerpo de este tamaño en el proceso hijo, sin meterlo en el guion. */
  bytes?: number;
  lanza?: string;
}

async function taller() {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-recuperar-'));
  temporales.push(raiz);
  const corpus = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', '_revision', 'fuentes']) {
    await mkdir(join(corpus, dir), { recursive: true });
  }
  return { raiz, corpus, registro: join(raiz, 'peticiones.log') };
}

async function recuperar(
  url: string,
  taller: { raiz: string; corpus: string; registro: string },
  guion: Record<string, RespuestaFingida>,
  { corpusPrimero = false }: { corpusPrimero?: boolean } = {},
) {
  const fichero = join(taller.raiz, 'guion.json');
  await writeFile(fichero, JSON.stringify(guion), 'utf8');

  // El orden importa: `--corpus corpus <url>` llegó a tomar por dirección la raíz del
  // corpus, porque el primer argumento sin guiones no es siempre el posicional.
  const propios = corpusPrimero
    ? ['--corpus', taller.corpus, url]
    : [url, '--corpus', taller.corpus];

  const argumentos = ['--import', 'tsx', '--import', DOBLE, join(RAIZ, 'tools/recuperar.ts'), ...propios];

  try {
    const { stdout } = await ejecutar('node', argumentos, {
      cwd: RAIZ,
      env: { ...process.env, DOBLE_GUION: fichero, DOBLE_REGISTRO: taller.registro },
    });
    return { codigo: 0, salida: stdout, error: '' };
  } catch (e) {
    const fallo = e as { code?: number; stdout?: string; stderr?: string };
    return { codigo: fallo.code ?? 1, salida: fallo.stdout ?? '', error: fallo.stderr ?? '' };
  }
}

interface Peticion {
  url: string;
  cabeceras: Record<string, string>;
}

async function peticiones(taller: { registro: string }): Promise<Peticion[]> {
  if (!existsSync(taller.registro)) return [];
  return (await readFile(taller.registro, 'utf8'))
    .split('\n')
    .filter((l) => l !== '')
    .map((l) => JSON.parse(l) as Peticion);
}

async function pedidas(taller: { registro: string }): Promise<string[]> {
  return (await peticiones(taller)).map((p) => p.url);
}

const OK = (cuerpo: string): RespuestaFingida => ({
  estado: 200,
  cabeceras: { 'content-type': 'text/html; charset=utf-8' },
  cuerpo,
});

describe('Historia 11.1 — una URL admitida deja el documento versionado', () => {
  it('escribe corpus/fuentes/{id}--{slug-de-obra}.txt con cabecera y cuerpo', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_WIKISOURCE, t, { [URL_WIKISOURCE]: OK(PAGINA) });

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await readdir(join(t.corpus, 'fuentes'))).toEqual([
      'wikisource-es--sobre-la-brevedad-de-la-vida.txt',
    ]);

    const documento = await readFile(
      join(t.corpus, 'fuentes', 'wikisource-es--sobre-la-brevedad-de-la-vida.txt'),
      'utf8',
    );
    expect(documento).toContain('fuente: wikisource-es');
    expect(documento).toContain('obra: Sobre la brevedad de la vida');
    expect(documento).toContain('año: 49');
    expect(documento).toContain(`url: ${URL_WIKISOURCE}`);
    expect(documento).toMatch(/^recuperado: \d{4}-\d{2}-\d{2}$/m);
    expect(documento).toContain('No es que tengamos poco tiempo para vivir');
    // Texto plano sin marcado, y sin el cromo de la página (AD-23).
    expect(documento).not.toMatch(/<[a-z/]/i);
    expect(documento).not.toContain('Portada');
    expect(documento).not.toContain('Categoría');
  });

  it('se identifica al pedir: Wikimedia y Gutenberg rechazan a quien no lo hace', async () => {
    // Se comprueba lo que llegó al servidor, no lo que dice el código fuente.
    const t = await taller();
    await recuperar(URL_WIKISOURCE, t, { [URL_WIKISOURCE]: OK(PAGINA) });

    const [peticion] = await peticiones(t);
    const agente = peticion.cabeceras['user-agent'] ?? peticion.cabeceras['User-Agent'];
    expect(agente).toBeTruthy();
    expect(agente).toMatch(/sabiduria/i);
  });

  it('sin año exacto el documento se escribe sin la línea de año', async () => {
    const t = await taller();
    const sinAño = PAGINA.replace('A&ntilde;o de publicaci&oacute;n: 49', 'A&ntilde;o de publicaci&oacute;n: c. 49');
    const resultado = await recuperar(URL_WIKISOURCE, t, { [URL_WIKISOURCE]: OK(sinAño) });

    expect(resultado.codigo, resultado.error).toBe(0);
    const documento = await readFile(
      join(t.corpus, 'fuentes', 'wikisource-es--sobre-la-brevedad-de-la-vida.txt'),
      'utf8',
    );
    expect(documento).not.toMatch(/^a[ñn]o:/m);
  });

  it('«--corpus» antes de la dirección no se confunde con la dirección', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_WIKISOURCE, t, { [URL_WIKISOURCE]: OK(PAGINA) }, {
      corpusPrimero: true,
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await pedidas(t)).toEqual([URL_WIKISOURCE]);
    expect(await readdir(join(t.corpus, 'fuentes'))).toHaveLength(1);
  });
});

describe('Historia 11.1 — el conjunto de Fuentes es cerrado, y se comprueba antes de pedir', () => {
  it('una URL de fuera no se llega a pedir, no escribe nada y sale con código ≠ 0', async () => {
    const t = await taller();
    const ajena = 'https://frases-celebres.example.com/seneca';
    const resultado = await recuperar(ajena, t, { '*': OK(PAGINA) });

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/no pertenece a ninguna Fuente admitida/);
    expect(await pedidas(t)).toEqual([]);
    expect(await readdir(join(t.corpus, 'fuentes'))).toEqual([]);
  });

  it('un anfitrión que solo se parece tampoco cuela', async () => {
    const t = await taller();
    const resultado = await recuperar('https://gutenberg.org.example.com/x', t, { '*': OK(PAGINA) });

    expect(resultado.codigo).not.toBe(0);
    expect(await pedidas(t)).toEqual([]);
    expect(await readdir(join(t.corpus, 'fuentes'))).toEqual([]);
  });

  it('una Fuente admitida cuya licencia no permite reutilizar no se descarga', async () => {
    const t = await taller();
    const resultado = await recuperar('https://www.cervantesvirtual.com/obra/x/', t, { '*': OK(PAGINA) });

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/no admite reutilización/);
    expect(resultado.error).toMatch(/CC BY-NC-SA/);
    expect(await pedidas(t)).toEqual([]);
    expect(await readdir(join(t.corpus, 'fuentes'))).toEqual([]);
  });
});

describe('Historia 11.1 — la obra ya versionada se reutiliza', () => {
  it('la segunda recuperación no vuelve a pedir ni añade una segunda copia', async () => {
    const t = await taller();
    const primera = await recuperar(URL_WIKISOURCE, t, { [URL_WIKISOURCE]: OK(PAGINA) });
    expect(primera.codigo, primera.error).toBe(0);

    const segunda = await recuperar(URL_WIKISOURCE, t, { [URL_WIKISOURCE]: OK(PAGINA) });
    expect(segunda.codigo, segunda.error).toBe(0);
    expect(segunda.salida).toMatch(/Ya versionado/);

    expect(await readdir(join(t.corpus, 'fuentes'))).toHaveLength(1);
    // Una sola petición en total: la de la primera vez.
    expect(await pedidas(t)).toEqual([URL_WIKISOURCE]);
  });

  it('un fichero que ocupa el sitio pero no se deja analizar no pasa por «ya versionado»', async () => {
    /*
     * Un documento a medio escribir, o tocado a mano, ocupa el nombre sin ser un
     * documento. Salir con éxito lo dejaría ahí para que lo rechazase la extracción,
     * lejos de donde se puede arreglar.
     */
    const t = await taller();
    const primera = await recuperar(URL_WIKISOURCE, t, { [URL_WIKISOURCE]: OK(PAGINA) });
    expect(primera.codigo, primera.error).toBe(0);

    const [documento] = await readdir(join(t.corpus, 'fuentes'));
    const ruta = join(t.corpus, 'fuentes', documento!);
    await writeFile(ruta, 'esto no es un documento de Fuente\n', 'utf8');

    const segunda = await recuperar(URL_WIKISOURCE, t, { [URL_WIKISOURCE]: OK(PAGINA) });
    expect(segunda.codigo).not.toBe(0);
    expect(segunda.error).toMatch(/no tiene la forma de un documento de Fuente/);
    // No se ha sobrescrito: lo que había sigue ahí, para poder mirarlo.
    expect(await readFile(ruta, 'utf8')).toBe('esto no es un documento de Fuente\n');
  });
});

describe('Historia 11.1 — la redirección se revalida contra el conjunto cerrado', () => {
  it('un anfitrión admitido que redirige fuera no versiona nada', async () => {
    /*
     * Con seguimiento automático de redirecciones, el texto de un anfitrión cualquiera
     * quedaría versionado con la licencia de una Fuente admitida escrita al lado, y nadie
     * volvería a mirar de dónde salió.
     */
    const t = await taller();
    const fuera = 'https://frases-celebres.example.com/seneca';
    const resultado = await recuperar(URL_WIKISOURCE, t, {
      [URL_WIKISOURCE]: { estado: 302, cabeceras: { location: fuera } },
      [fuera]: OK(PAGINA),
    });

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/redirección/i);
    expect(await readdir(join(t.corpus, 'fuentes'))).toEqual([]);
    // Y no se llegó a pedir el destino de fuera.
    expect(await pedidas(t)).toEqual([URL_WIKISOURCE]);
  });

  it('recuperar dos veces a través de una redirección no vuelve a descargar', async () => {
    /*
     * La cabecera guardaba solo el destino final, y `documentoConUrl` comparaba con la
     * dirección pedida: la segunda ejecución no encontraba nada y volvía a descargarlo
     * todo. Ahora la cabecera guarda también la pedida.
     */
    const t = await taller();
    const definitiva = 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida_(Riber)';
    const guion = {
      [URL_WIKISOURCE]: { estado: 301, cabeceras: { location: definitiva } },
      [definitiva]: OK(PAGINA),
    };

    const primera = await recuperar(URL_WIKISOURCE, t, guion);
    expect(primera.codigo, primera.error).toBe(0);
    const trasLaPrimera = await pedidas(t);

    const segunda = await recuperar(URL_WIKISOURCE, t, guion);
    expect(segunda.codigo, segunda.error).toBe(0);
    expect(segunda.salida).toMatch(/Ya versionado/);

    // La segunda no pidió nada, y no hay una segunda copia.
    expect(await pedidas(t)).toEqual(trasLaPrimera);
    expect(await readdir(join(t.corpus, 'fuentes'))).toHaveLength(1);

    // Y la cabecera deja constancia de las dos direcciones.
    const [nombre] = await readdir(join(t.corpus, 'fuentes'));
    const documento = await readFile(join(t.corpus, 'fuentes', nombre), 'utf8');
    expect(documento).toContain(`url: ${definitiva}`);
    expect(documento).toContain(`pedido: ${URL_WIKISOURCE}`);
  });

  it('una redirección dentro de la misma Fuente sí se sigue', async () => {
    const t = await taller();
    const definitiva = 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida_(Riber)';
    const resultado = await recuperar(URL_WIKISOURCE, t, {
      [URL_WIKISOURCE]: { estado: 301, cabeceras: { location: definitiva } },
      [definitiva]: OK(PAGINA),
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await readdir(join(t.corpus, 'fuentes'))).toHaveLength(1);
    expect(await pedidas(t)).toEqual([URL_WIKISOURCE, definitiva]);
  });
});

describe('Historia 11.1 — la respuesta que no sirve no deja nada a medias', () => {
  it('un 404 no escribe nada y sale con código ≠ 0', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_WIKISOURCE, t, {
      [URL_WIKISOURCE]: { estado: 404, cabeceras: { 'content-type': 'text/html' }, cuerpo: 'No such page' },
    });

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/404/);
    expect(await readdir(join(t.corpus, 'fuentes'))).toEqual([]);
  });

  it('un fallo de red se explica con un mensaje propio, no con una traza', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_WIKISOURCE, t, {
      [URL_WIKISOURCE]: { lanza: 'getaddrinfo ENOTFOUND es.wikisource.org' },
    });

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/No se pudo pedir/);
    expect(resultado.error).not.toMatch(/at .*\.ts:\d+/);
    expect(await readdir(join(t.corpus, 'fuentes'))).toEqual([]);
  });

  it('una respuesta que no es texto se rechaza sin descargarla entera', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_WIKISOURCE, t, {
      [URL_WIKISOURCE]: {
        estado: 200,
        cabeceras: { 'content-type': 'application/pdf' },
        cuerpoBase64: Buffer.from('%PDF-1.7 binario').toString('base64'),
      },
    });

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/no devolvió texto/);
    expect(await readdir(join(t.corpus, 'fuentes'))).toEqual([]);
  });

  it('una página sin título no se versiona: sin obra habría que inferir la Procedencia', async () => {
    const t = await taller();
    const sinTitulo = PAGINA.replace(/<h1[\s\S]*?<\/h1>/, '').replace(/<title>[\s\S]*?<\/title>/, '');
    const resultado = await recuperar(URL_WIKISOURCE, t, { [URL_WIKISOURCE]: OK(sinTitulo) });

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/no declara título/);
    expect(await readdir(join(t.corpus, 'fuentes'))).toEqual([]);
  });
});

describe('Historia 11.1 — el juego de caracteres es el que declara la respuesta', () => {
  it('una respuesta en Latin-1 no versiona los acentos rotos', async () => {
    /*
     * Gutenberg todavía sirve Latin-1 en parte de su catálogo. Suponer UTF-8 convertiría
     * cada acento en un rombo, y ese rombo se versionaría para siempre: el cotejo literal
     * de la Historia 11.2 no encontraría el texto de ninguna Cita en su propio documento.
     */
    const t = await taller();
    const url = 'https://www.gutenberg.org/cache/epub/7500/pg7500.txt';
    const texto = [
      'Title: Del sentimiento trágico de la vida',
      'Original publication: Madrid: Renacimiento, 1913',
      '',
      '*** START OF THE PROJECT GUTENBERG EBOOK DEL SENTIMIENTO ***',
      '',
      'El hombre de carne y hueso, el que nace, sufre y muere, es el sujeto y el',
      'supremo objeto de toda filosofía que se precie de serlo con razón.',
      '',
      '*** END OF THE PROJECT GUTENBERG EBOOK DEL SENTIMIENTO ***',
    ].join('\n');

    const resultado = await recuperar(url, t, {
      [url]: {
        estado: 200,
        cabeceras: { 'content-type': 'text/plain; charset=iso-8859-1' },
        cuerpoBase64: Buffer.from(texto, 'latin1').toString('base64'),
      },
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    const documento = await readFile(
      join(t.corpus, 'fuentes', 'gutenberg--del-sentimiento-tragico-de-la-vida.txt'),
      'utf8',
    );
    expect(documento).toContain('obra: Del sentimiento trágico de la vida');
    expect(documento).toContain('año: 1913');
    expect(documento).toContain('filosofía que se precie');
    expect(documento).not.toContain('\ufffd');
  });
});

describe('Historia 11.1 — el documento versionado trae la declaración de la Fuente', () => {
  it('la ficha de Gutenberg se versiona literal, entre la cabecera y el cuerpo', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_GUTENBERG, t, {
      [URL_GUTENBERG]: {
        estado: 200,
        cabeceras: { 'content-type': 'text/plain; charset=utf-8' },
        cuerpo: LIBRO_GUTENBERG,
      },
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    const documento = await readFile(
      join(t.corpus, 'fuentes', 'gutenberg--del-sentimiento-tragico-de-la-vida.txt'),
      'utf8',
    );

    // Tres zonas: cabecera de auditoría, declaración literal y cuerpo.
    expect(documento.split('\n').filter((l) => l === '---')).toHaveLength(2);
    expect(documento).toContain('Original publication: Madrid: Renacimiento, 1913');
    expect(documento).toContain('año: 1913');
    expect(documento).toContain('El hombre de carne y hueso');
    expect(documento).not.toContain('Updated editions will replace');
  });

  it('la ficha del catálogo de Gutenberg no se versiona', async () => {
    /*
     * `www.gutenberg.org/ebooks/N` es la dirección que una persona copia del navegador, y
     * está admitida. Sin las marcas de inicio y fin, el cromo del sitio y el preámbulo
     * legal se versionaban como si fueran la obra.
     */
    const t = await taller();
    const url = 'https://www.gutenberg.org/ebooks/7500';
    const resultado = await recuperar(url, t, {
      [url]: OK(`<!DOCTYPE html><html><head><title>Del sentimiento trágico de la vida | Project Gutenberg</title></head>
<body><nav><a href="/">Home</a></nav><h1>Del sentimiento trágico de la vida</h1>
<table class="bibrec"><tr><th>Release Date</th><td>Jan 1, 2005</td></tr></table>
<footer>Project Gutenberg is a registered trademark.</footer></body></html>`),
    });

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/ficha del catálogo/);
    expect(resultado.error).toMatch(/texto plano/);
    expect(await readdir(join(t.corpus, 'fuentes'))).toEqual([]);
  });
});

describe('Historia 11.1 — dos obras que colisionan al recortar el nombre', () => {
  it('la segunda no se pierde en silencio: sale con error y lo explica', async () => {
    /*
     * El nombre se recorta a 60 caracteres. Dos obras largas distintas de la misma Fuente
     * caían en el mismo fichero, y la segunda salía con «Ya versionado» y código 0: quien
     * siembra veía un éxito y pasaba a extraer la obra anterior, y esta no se versionaba
     * nunca sin que nada lo dijera.
     */
    const t = await taller();
    const comun =
      'Historia general de las cosas de Nueva España escrita por Fray Bernardino';

    const pagina = (titulo: string) => `<!DOCTYPE html><html><head>
<title>${titulo} - Wikisource</title></head><body>
<h1 id="firstHeading">${titulo}</h1>
<div class="mw-parser-output">
<p>No es que tengamos poco tiempo para vivir, sino que perdemos una gran parte de él.</p>
</div></body></html>`;

    const primeraUrl = 'https://es.wikisource.org/wiki/A';
    const segundaUrl = 'https://es.wikisource.org/wiki/B';

    const primera = await recuperar(primeraUrl, t, {
      [primeraUrl]: OK(pagina(`${comun} de Sahagún`)),
    });
    expect(primera.codigo, primera.error).toBe(0);
    const [nombre] = await readdir(join(t.corpus, 'fuentes'));

    const segunda = await recuperar(segundaUrl, t, {
      [segundaUrl]: OK(pagina(`${comun} de Sahagún, tomo segundo`)),
    });

    expect(segunda.codigo).not.toBe(0);
    expect(segunda.error).toMatch(/comparten nombre de documento/);
    // Y no ha pisado la primera ni ha añadido una segunda copia.
    expect(await readdir(join(t.corpus, 'fuentes'))).toEqual([nombre]);
    expect(await readFile(join(t.corpus, 'fuentes', nombre), 'utf8')).toContain(
      `obra: ${comun} de Sahagún`,
    );
  });
});

describe('Historia 11.1 — el techo de tamaño acota la memoria, no solo el disco', () => {
  it('un tamaño anunciado por encima del techo no se llega a leer', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_WIKISOURCE, t, {
      [URL_WIKISOURCE]: {
        estado: 200,
        cabeceras: { 'content-type': 'text/html', 'content-length': String(64 * 1024 * 1024) },
        cuerpo: PAGINA,
      },
    });

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/anuncia \d+ bytes/);
    expect(await readdir(join(t.corpus, 'fuentes'))).toEqual([]);
  });

  it('un cuerpo real por encima del techo corta la lectura aunque no se anuncie', async () => {
    // `arrayBuffer()` se tragaba la respuesta entera y solo después la medía: el techo
    // protegía el disco y no la memoria.
    const t = await taller();
    const resultado = await recuperar(URL_WIKISOURCE, t, {
      [URL_WIKISOURCE]: {
        estado: 200,
        cabeceras: { 'content-type': 'text/html' },
        bytes: 13 * 1024 * 1024,
      },
    });

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.error).toMatch(/pasa del techo/);
    expect(await readdir(join(t.corpus, 'fuentes'))).toEqual([]);
  });

  it('un cuerpo por debajo del techo pasa sin ruido', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_WIKISOURCE, t, { [URL_WIKISOURCE]: OK(PAGINA) });
    expect(resultado.codigo, resultado.error).toBe(0);
  });
});
