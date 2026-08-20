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

/**
 * La segunda petición: la **misma página del mismo anfitrión**, en su texto de origen.
 *
 * Wikisource no renderiza el año —vive en `|año = 1905`, dentro del encabezado del
 * wikitexto—, así que la recuperación pide también esta dirección. Cuando el guion no la
 * trae, el doble de red lanza, que es exactamente el caso «wikitexto inalcanzable»: la
 * recuperación tiene que seguir adelante sin año.
 */
const cruda = (pagina: string) => `${pagina}?action=raw`;
const CRUDA_WIKISOURCE = cruda(URL_WIKISOURCE);

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
    expect(await pedidas(t)).toEqual([URL_WIKISOURCE, CRUDA_WIKISOURCE]);
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
    // Las de la primera vez y ninguna más: la página y su texto de origen.
    expect(await pedidas(t)).toEqual([URL_WIKISOURCE, CRUDA_WIKISOURCE]);
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
    // Y el texto de origen se pide de la dirección **final**, no de la que se tecleó.
    expect(await pedidas(t)).toEqual([URL_WIKISOURCE, definitiva, cruda(definitiva)]);
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

/**
 * Fix 11.1b — el año sale del encabezado del wikitexto, por la orden y con la red fingida.
 *
 * El lector de año de Wikisource no podía dispararse nunca: buscaba una línea «Año:» en la
 * página renderizada, y Wikisource no la renderiza. El dato vive en los parámetros de la
 * plantilla de encabezado del wikitexto, que se recupera de la misma página y del mismo
 * anfitrión con `?action=raw`.
 */
describe('Fix 11.1b — el año del wikitexto llega al documento versionado', () => {
  const URL_TRISTE = 'https://es.wikisource.org/wiki/Triste_(Nervo)';
  const CRUDA_TRISTE = cruda(URL_TRISTE);

  const PAGINA_TRISTE = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Triste - Wikisource</title></head><body>
<h1 id="firstHeading">Triste</h1>
<div id="mw-content-text"><div class="mw-parser-output">
<p>Adi&oacute;s, dijo la voz; y el alma m&iacute;a, temblando de dolor, se estremec&iacute;a.</p>
<p>Todo era paz en la arboleda umbr&iacute;a, y la tarde de oto&ntilde;o se mor&iacute;a.</p>
</div></div></body></html>`;

  const WIKITEXTO = `{{encabezado
|título=Triste
|autor=Amado Nervo
|año = 1905
|notas=Del libro «Los jardines interiores».
}}

Adiós, dijo la voz; y el alma mía,`;

  /** El wikitexto llega como `text/x-wiki`, que no es un tipo de documento de obra. */
  const RAW = (cuerpo: string): RespuestaFingida => ({
    estado: 200,
    cabeceras: { 'content-type': 'text/x-wiki; charset=UTF-8' },
    cuerpo,
  });

  const documentoDe = (t: { corpus: string }) =>
    readFile(join(t.corpus, 'fuentes', 'wikisource-es--triste.txt'), 'utf8');

  it('recupera con obra y año, y guarda la línea del encabezado literal', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_TRISTE, t, {
      [URL_TRISTE]: OK(PAGINA_TRISTE),
      [CRUDA_TRISTE]: RAW(WIKITEXTO),
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await pedidas(t)).toEqual([URL_TRISTE, CRUDA_TRISTE]);

    const documento = await documentoDe(t);
    expect(documento).toContain('obra: Triste');
    expect(documento).toContain('año: 1905');
    // Literal, no interpretado: es lo que deja que la extracción derive el mismo año.
    expect(documento).toContain('|año = 1905');
    expect(documento).not.toContain('jardines interiores');
    expect(resultado.salida).toContain('Año: 1905');
  });

  it('el wikitexto se pide al mismo anfitrión y a la misma página', async () => {
    // No a un servicio de datos aparte: eso sería un segundo origen de verdad y un
    // anfitrión que el conjunto cerrado de Fuentes no cubre.
    const t = await taller();
    await recuperar(URL_TRISTE, t, {
      [URL_TRISTE]: OK(PAGINA_TRISTE),
      [CRUDA_TRISTE]: RAW(WIKITEXTO),
    });

    const [pagina, encabezado] = await peticiones(t);
    expect(new URL(encabezado.url).host).toBe(new URL(pagina.url).host);
    expect(new URL(encabezado.url).pathname).toBe(new URL(pagina.url).pathname);
    // Y hereda la identificación de la primera: Wikimedia rechaza a quien no se identifica.
    expect(encabezado.cabeceras['user-agent']).toBe(pagina.cabeceras['user-agent']);
  });

  it('un encabezado sin año deja la obra sin año, sin error', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_TRISTE, t, {
      [URL_TRISTE]: OK(PAGINA_TRISTE),
      [CRUDA_TRISTE]: RAW(`{{encabezado\n|título=Triste\n|autor=Amado Nervo\n}}\n\nAdiós,`),
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await documentoDe(t)).not.toMatch(/^a[ñn]o:/m);
  });

  it('si el wikitexto no se puede recuperar, la recuperación termina bien y lo dice', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_TRISTE, t, {
      [URL_TRISTE]: OK(PAGINA_TRISTE),
      [CRUDA_TRISTE]: { lanza: 'getaddrinfo ENOTFOUND es.wikisource.org' },
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    const documento = await documentoDe(t);
    expect(documento).toContain('obra: Triste');
    expect(documento).not.toMatch(/^a[ñn]o:/m);
    // Callarlo sería peor: quien siembra tiene que poder distinguir «la Fuente no declara
    // año» de «no se pudo leer lo que declara».
    expect(resultado.salida).toMatch(/encabezado de origen/i);
  });

  it('un 404 en el wikitexto tampoco tira la recuperación', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_TRISTE, t, {
      [URL_TRISTE]: OK(PAGINA_TRISTE),
      [CRUDA_TRISTE]: { estado: 404, cabeceras: { 'content-type': 'text/html' }, cuerpo: 'no' },
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await documentoDe(t)).toContain('obra: Triste');
    expect(await documentoDe(t)).not.toMatch(/^a[ñn]o:/m);
  });

  it('el wikitexto hereda la revalidación de anfitrión: si redirige fuera, no se usa', async () => {
    /*
     * La segunda petición vive en la misma cáscara y con las mismas guardas. Un
     * `?action=raw` que redirigiera a otro anfitrión traería metadato no verificado que
     * se versionaría con la licencia de una Fuente admitida escrita al lado.
     */
    const t = await taller();
    const fuera = 'https://metadatos.example.com/triste';
    const resultado = await recuperar(URL_TRISTE, t, {
      [URL_TRISTE]: OK(PAGINA_TRISTE),
      [CRUDA_TRISTE]: { estado: 302, cabeceras: { location: fuera } },
      [fuera]: RAW(WIKITEXTO),
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await documentoDe(t)).not.toMatch(/^a[ñn]o:/m);
    // Y no se llegó a pedir el destino de fuera.
    expect(await pedidas(t)).toEqual([URL_TRISTE, CRUDA_TRISTE]);
  });

  it('Gutenberg no pide ningún encabezado: lee su año del propio texto plano', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_GUTENBERG, t, {
      [URL_GUTENBERG]: {
        estado: 200,
        cabeceras: { 'content-type': 'text/plain; charset=utf-8' },
        cuerpo: LIBRO_GUTENBERG,
      },
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await pedidas(t)).toEqual([URL_GUTENBERG]);
  });
});

describe('Fix 11.1b — la obra versionada es la que declara el encabezado', () => {
  /*
   * El nombre de la página no es el nombre de la obra: «Triste (Nervo)» lleva dentro el
   * desambiguador de Wikisource, y ese paréntesis acababa literal en la atribución que lee
   * el visitante. El encabezado declara «Los jardines interiores», que es el libro que
   * contiene al poema y lo que un lector esperaría ver citado.
   */
  const URL_TRISTE = 'https://es.wikisource.org/wiki/Triste_(Nervo)';

  const PAGINA_TRISTE = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Triste (Nervo) - Wikisource</title></head><body>
<h1 id="firstHeading">Triste (Nervo)</h1>
<div id="mw-content-text"><div class="mw-parser-output">
<p>Adi&oacute;s, dijo la voz; y el alma m&iacute;a, temblando de dolor, se estremec&iacute;a.</p>
</div></div></body></html>`;

  const RAW = (cuerpo: string): RespuestaFingida => ({
    estado: 200,
    cabeceras: { 'content-type': 'text/x-wiki; charset=UTF-8' },
    cuerpo,
  });

  it('el documento se nombra y se declara por la obra, no por la página', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_TRISTE, t, {
      [URL_TRISTE]: OK(PAGINA_TRISTE),
      [cruda(URL_TRISTE)]: RAW(
        `{{encabezado\n|título=[[Los jardines interiores]]\n|autor=Amado Nervo\n|año = 1905\n}}\n\nAdiós,`,
      ),
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    // El nombre lleva la obra **y** la página: el cuerpo versionado es el de esta página.
    expect(await readdir(join(t.corpus, 'fuentes'))).toEqual([
      'wikisource-es--los-jardines-interiores--triste-nervo.txt',
    ]);

    const documento = await readFile(
      join(t.corpus, 'fuentes', 'wikisource-es--los-jardines-interiores--triste-nervo.txt'),
      'utf8',
    );
    expect(documento).toContain('obra: Los jardines interiores');
    expect(documento).not.toContain('obra: Triste (Nervo)');
    // El enlace se guarda literal: la obra se resuelve al derivarla, las dos veces.
    expect(documento).toContain('|título=[[Los jardines interiores]]');
  });

  it('sin `|título` utilizable el documento se sigue nombrando por la página', async () => {
    // «Ariel/Capítulo I» declara `|título = [[../`, que no es el título de nada.
    const url = 'https://es.wikisource.org/wiki/Ariel/Cap%C3%ADtulo_I';
    const t = await taller();
    const resultado = await recuperar(url, t, {
      [url]: OK(PAGINA_TRISTE.replace(/Triste \(Nervo\)/g, 'Ariel-Capítulo I')),
      [cruda(url)]: RAW(`{{encabezado\n|título = [[../\n|autor=José Enrique Rodó\n|año = 1900\n}}`),
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    const documento = await readFile(
      join(t.corpus, 'fuentes', 'wikisource-es--ariel-capitulo-i.txt'),
      'utf8',
    );
    expect(documento).toContain('obra: Ariel-Capítulo I');
    // Y el año de la línea siguiente no se lo comió el enlace sin cerrar.
    expect(documento).toContain('año: 1900');
  });

  it('dos páginas de la misma obra dan dos documentos, cada uno con su cuerpo', async () => {
    /*
     * Es el fallo que esta decisión existe para impedir. Con el documento atado a la obra,
     * la segunda página salía con «Ya versionado» y código 0 sin versionar su texto: el
     * poema no estaba en ninguna parte y cualquier Cita suya reventaría el cotejo literal
     * de la Historia 11.2.
     */
    const t = await taller();

    const encabezado = `{{encabezado\n|título=[[Los jardines interiores]]\n|autor=Amado Nervo\n|año = 1905\n}}`;
    const paginaCon = (h1: string, verso: string) =>
      PAGINA_TRISTE.replace(/Triste \(Nervo\)/g, h1).replace(
        /<p>Adi&oacute;s[\s\S]*?<\/p>/,
        `<p>${verso}</p>`,
      );

    const primera = await recuperar(URL_TRISTE, t, {
      [URL_TRISTE]: OK(
        paginaCon(
          'Triste (Nervo)',
          'Adi&oacute;s, dijo la voz; y el alma m&iacute;a, temblando de dolor, se estremec&iacute;a.',
        ),
      ),
      [cruda(URL_TRISTE)]: RAW(encabezado),
    });
    expect(primera.codigo, primera.error).toBe(0);

    const otra = 'https://es.wikisource.org/wiki/Tibi_Regina';
    const segunda = await recuperar(otra, t, {
      [otra]: OK(
        paginaCon(
          'Tibi Regina',
          'Ella pas&oacute; y su rostro sereno se qued&oacute; para siempre en mi pecho.',
        ),
      ),
      [cruda(otra)]: RAW(encabezado),
    });
    expect(segunda.codigo, segunda.error).toBe(0);

    expect((await readdir(join(t.corpus, 'fuentes'))).sort()).toEqual([
      'wikisource-es--los-jardines-interiores--tibi-regina.txt',
      'wikisource-es--los-jardines-interiores--triste-nervo.txt',
    ]);

    const leer = (nombre: string) => readFile(join(t.corpus, 'fuentes', nombre), 'utf8');
    const triste = await leer('wikisource-es--los-jardines-interiores--triste-nervo.txt');
    const tibi = await leer('wikisource-es--los-jardines-interiores--tibi-regina.txt');

    // Cada documento conserva **su propio cuerpo**, y ninguno lleva el del otro.
    expect(triste).toContain('Adiós, dijo la voz');
    expect(triste).not.toContain('Ella pasó');
    expect(tibi).toContain('Ella pasó');
    expect(tibi).not.toContain('Adiós, dijo la voz');

    // Y los dos declaran la misma obra y el mismo año: la obra es metadato, no identidad.
    for (const documento of [triste, tibi]) {
      expect(documento).toContain('obra: Los jardines interiores');
      expect(documento).toContain('año: 1905');
    }
  });

  it('la misma página por otra dirección sigue reutilizando, y dice de dónde salió', async () => {
    /*
     * Misma obra y misma página, alcanzadas por otra dirección —la variante móvil, un
     * alias que no quedó registrado—. Reutilizar es lo que se quiere, y decir de dónde
     * salió el que ya está es lo que deja comprobarlo.
     */
    const t = await taller();
    const encabezado = `{{encabezado\n|título=[[Los jardines interiores]]\n|autor=Amado Nervo\n|año = 1905\n}}`;

    const primera = await recuperar(URL_TRISTE, t, {
      [URL_TRISTE]: OK(PAGINA_TRISTE),
      [cruda(URL_TRISTE)]: RAW(encabezado),
    });
    expect(primera.codigo, primera.error).toBe(0);

    const movil = 'https://es.m.wikisource.org/wiki/Triste_(Nervo)';
    const segunda = await recuperar(movil, t, {
      [movil]: OK(PAGINA_TRISTE),
      [cruda(movil)]: RAW(encabezado),
    });

    expect(segunda.codigo, segunda.error).toBe(0);
    expect(segunda.salida).toMatch(/Ya versionado/);
    expect(segunda.salida).toContain(URL_TRISTE);
    expect(segunda.salida).toMatch(/misma página de la misma obra/);
    expect(await readdir(join(t.corpus, 'fuentes'))).toHaveLength(1);
  });

  it('una página que es su propia obra no cambia de nombre respecto a hoy', async () => {
    const t = await taller();
    const url = 'https://es.wikisource.org/wiki/El_sable';
    const resultado = await recuperar(url, t, {
      [url]: OK(PAGINA_TRISTE.replace(/Triste \(Nervo\)/g, 'El sable')),
      [cruda(url)]: RAW(`{{encabezado\n|título=El sable\n|autor=Manuel Gutiérrez Nájera\n|año=1904\n}}`),
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await readdir(join(t.corpus, 'fuentes'))).toEqual(['wikisource-es--el-sable.txt']);
  });
});

/**
 * Fix 11.1c — cuando la página no declara el año, lo declara su obra.
 *
 * En Wikisource la obra declara el año y la página declara el texto, y casi nunca son la
 * misma página: el índice de «Capítulos que se le olvidaron a Cervantes» trae `|año = 1895`
 * y su «Capítulo XLIII» trae ocho mil caracteres de prosa y ningún año. Aquí se comprueba
 * por la orden, y con el doble de red contando peticiones, que la tercera solo se hace
 * cuando hace falta y que hereda las guardas de las otras dos.
 */
describe('Fix 11.1c — el año de la obra llega a la subpágina', () => {
  const URL_CAPITULO =
    'https://es.wikisource.org/wiki/Cap%C3%ADtulos_que_se_le_olvidaron_a_Cervantes/Cap%C3%ADtulo_XLIII';
  const URL_OBRA = 'https://es.wikisource.org/wiki/Cap%C3%ADtulos_que_se_le_olvidaron_a_Cervantes';
  const CRUDA_CAPITULO = cruda(URL_CAPITULO);
  const CRUDA_OBRA = cruda(URL_OBRA);

  const PAGINA_CAPITULO = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Capítulos que se le olvidaron a Cervantes/Capítulo XLIII - Wikisource</title></head><body>
<h1 id="firstHeading">Cap&iacute;tulos que se le olvidaron a Cervantes/Cap&iacute;tulo XLIII</h1>
<div id="mw-content-text"><div class="mw-parser-output">
<p>La cordura y la locura se reparten el imperio de la vida humana.</p>
</div></div></body></html>`;

  /** La subpágina declara a qué obra pertenece, con un enlace absoluto. Y no declara año. */
  const WIKITEXTO_CAPITULO = `{{Encabezado
|título = [[Capítulos que se le olvidaron a Cervantes]]
|autor = Juan Montalvo
}}

La cordura y la locura se reparten el imperio de la vida humana.`;

  const WIKITEXTO_OBRA = `{{Encabezado
|título = Capítulos que se le olvidaron a Cervantes
|autor = Juan Montalvo
|año = 1895
}}

* [[/Capítulo I/]]`;

  const RAW = (cuerpo: string): RespuestaFingida => ({
    estado: 200,
    cabeceras: { 'content-type': 'text/x-wiki; charset=UTF-8' },
    cuerpo,
  });

  const elDocumento = async (t: { corpus: string }) => {
    const [nombre, ...otros] = await readdir(join(t.corpus, 'fuentes'));
    expect(otros).toEqual([]);
    return readFile(join(t.corpus, 'fuentes', nombre), 'utf8');
  };

  it('encadena: la obra declarada aporta el año, y el documento guarda las dos literales', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_CAPITULO, t, {
      [URL_CAPITULO]: OK(PAGINA_CAPITULO),
      [CRUDA_CAPITULO]: RAW(WIKITEXTO_CAPITULO),
      [CRUDA_OBRA]: RAW(WIKITEXTO_OBRA),
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await pedidas(t)).toEqual([URL_CAPITULO, CRUDA_CAPITULO, CRUDA_OBRA]);

    const documento = await elDocumento(t);
    expect(documento).toContain('obra: Capítulos que se le olvidaron a Cervantes');
    expect(documento).toContain('año: 1895');
    // Las dos declaraciones, literales y distinguibles: `extraer` re-deriva de aquí.
    expect(documento).toContain('|título = [[Capítulos que se le olvidaron a Cervantes]]');
    expect(documento).toMatch(/^obra> \|año = 1895$/m);
    expect(resultado.salida).toContain('Año: 1895');
  });

  it('la obra se pide al mismo anfitrión, y por el enlace, no por la ruta', async () => {
    const t = await taller();
    await recuperar(URL_CAPITULO, t, {
      [URL_CAPITULO]: OK(PAGINA_CAPITULO),
      [CRUDA_CAPITULO]: RAW(WIKITEXTO_CAPITULO),
      [CRUDA_OBRA]: RAW(WIKITEXTO_OBRA),
    });

    const [pagina, , obra] = await peticiones(t);
    expect(new URL(obra.url).host).toBe(new URL(pagina.url).host);
    expect(new URL(obra.url).pathname).toBe(new URL(URL_OBRA).pathname);
    // Y hereda la identificación: Wikimedia rechaza a quien no se identifica.
    expect(obra.cabeceras['user-agent']).toBe(pagina.cabeceras['user-agent']);
  });

  it('una página que ya declara su año no pide ninguna página más', async () => {
    const t = await taller();
    const conAño = WIKITEXTO_CAPITULO.replace(
      '|autor = Juan Montalvo',
      '|autor = Juan Montalvo\n|año = 1895',
    );
    const resultado = await recuperar(URL_CAPITULO, t, {
      [URL_CAPITULO]: OK(PAGINA_CAPITULO),
      [CRUDA_CAPITULO]: RAW(conAño),
      // Si se pidiera, el doble lo registraría: está en el guion a propósito.
      [CRUDA_OBRA]: RAW(WIKITEXTO_OBRA),
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await pedidas(t)).toEqual([URL_CAPITULO, CRUDA_CAPITULO]);
    expect(await elDocumento(t)).toContain('año: 1895');
  });

  it('un `|título` relativo no encadena: queda sin año y sin error', async () => {
    // «Ariel/Capítulo III» declara `|título = [[../`. Reconstruir «Ariel» de la ruta sería
    // derivar el padre de la URL, que es lo que la Historia 11.1 prohíbe.
    const t = await taller();
    const url = 'https://es.wikisource.org/wiki/Ariel/Cap%C3%ADtulo_III';
    const resultado = await recuperar(url, t, {
      [url]: OK(PAGINA_CAPITULO.replace(/Cap&iacute;tulos[^<]*XLIII/, 'Ariel-Cap&iacute;tulo III')),
      [cruda(url)]: RAW(`{{Encabezado\n|título = [[../\n|autor = José Enrique Rodó\n}}\n\nTexto.`),
      '*': RAW(WIKITEXTO_OBRA),
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    // Solo dos peticiones: no se llegó a componer ninguna dirección de obra.
    expect(await pedidas(t)).toEqual([url, cruda(url)]);
    const documento = await elDocumento(t);
    expect(documento).toContain('obra: Ariel-Capítulo III');
    expect(documento).not.toMatch(/^a[ñn]o:/m);
  });

  it('un enlace a otro anfitrión o a otro espacio tampoco encadena', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_CAPITULO, t, {
      [URL_CAPITULO]: OK(PAGINA_CAPITULO),
      [CRUDA_CAPITULO]: RAW(`{{Encabezado\n|título = [[:en:Chapters]]\n|autor = Juan Montalvo\n}}`),
      '*': RAW(WIKITEXTO_OBRA),
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await pedidas(t)).toEqual([URL_CAPITULO, CRUDA_CAPITULO]);
    expect(await elDocumento(t)).not.toMatch(/^a[ñn]o:/m);
  });

  it('si la obra tampoco declara año, la recuperación termina bien y lo dice', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_CAPITULO, t, {
      [URL_CAPITULO]: OK(PAGINA_CAPITULO),
      [CRUDA_CAPITULO]: RAW(WIKITEXTO_CAPITULO),
      [CRUDA_OBRA]: RAW(`{{Encabezado\n|título = Capítulos\n|autor = Juan Montalvo\n}}`),
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await elDocumento(t)).not.toMatch(/^a[ñn]o:/m);
    expect(resultado.salida).toMatch(/tampoco declara año/i);
    // Un solo salto: la obra no se usa para pedir una tercera página.
    expect(await pedidas(t)).toEqual([URL_CAPITULO, CRUDA_CAPITULO, CRUDA_OBRA]);
  });

  it('si la obra no se puede recuperar, la recuperación termina bien y lo dice', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_CAPITULO, t, {
      [URL_CAPITULO]: OK(PAGINA_CAPITULO),
      [CRUDA_CAPITULO]: RAW(WIKITEXTO_CAPITULO),
      [CRUDA_OBRA]: { lanza: 'getaddrinfo ENOTFOUND es.wikisource.org' },
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    const documento = await elDocumento(t);
    expect(documento).toContain('obra: Capítulos que se le olvidaron a Cervantes');
    expect(documento).not.toMatch(/^a[ñn]o:/m);
    expect(resultado.salida).toMatch(/no se pudo leer el de «Capítulos/i);
  });

  it('un 404 en la obra tampoco tira la recuperación', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_CAPITULO, t, {
      [URL_CAPITULO]: OK(PAGINA_CAPITULO),
      [CRUDA_CAPITULO]: RAW(WIKITEXTO_CAPITULO),
      [CRUDA_OBRA]: { estado: 404, cabeceras: { 'content-type': 'text/html' }, cuerpo: 'no' },
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await elDocumento(t)).not.toMatch(/^a[ñn]o:/m);
  });

  it('la petición de la obra hereda la revalidación de anfitrión', async () => {
    const t = await taller();
    const fuera = 'https://metadatos.example.com/capitulos';
    const resultado = await recuperar(URL_CAPITULO, t, {
      [URL_CAPITULO]: OK(PAGINA_CAPITULO),
      [CRUDA_CAPITULO]: RAW(WIKITEXTO_CAPITULO),
      [CRUDA_OBRA]: { estado: 302, cabeceras: { location: fuera } },
      [fuera]: RAW(WIKITEXTO_OBRA),
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await elDocumento(t)).not.toMatch(/^a[ñn]o:/m);
    // Y no se llegó a pedir el destino de fuera.
    expect(await pedidas(t)).toEqual([URL_CAPITULO, CRUDA_CAPITULO, CRUDA_OBRA]);
  });

  it('la obra que se versiona es la que declara la página, no la que declara su obra', async () => {
    const t = await taller();
    const resultado = await recuperar(URL_CAPITULO, t, {
      [URL_CAPITULO]: OK(PAGINA_CAPITULO),
      [CRUDA_CAPITULO]: RAW(WIKITEXTO_CAPITULO),
      [CRUDA_OBRA]: RAW(
        `{{Encabezado\n|título = [[Siete tratados]]\n|autor = Juan Montalvo\n|año = 1882\n}}`,
      ),
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    const documento = await elDocumento(t);
    expect(documento).toContain('obra: Capítulos que se le olvidaron a Cervantes');
    expect(documento).not.toContain('obra: Siete tratados');
    // El padre aporta el año, y nada más.
    expect(documento).toContain('año: 1882');
  });

  it('una página cuyo `|título` apunta a sí misma no gasta una petición', async () => {
    const t = await taller();
    const url = 'https://es.wikisource.org/wiki/El_sable';
    const resultado = await recuperar(url, t, {
      [url]: OK(PAGINA_CAPITULO.replace(/Cap&iacute;tulos[^<]*XLIII/, 'El sable')),
      [cruda(url)]: RAW(`{{Encabezado\n|título = [[El sable]]\n|autor = Gutiérrez Nájera\n}}`),
      '*': RAW(WIKITEXTO_OBRA),
    });

    expect(resultado.codigo, resultado.error).toBe(0);
    expect(await pedidas(t)).toEqual([url, cruda(url)]);
  });
});
