import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { parse as parsearYaml } from 'yaml';
import { ATESTIGUADA, AUTOR_VALIDO, RAIZ, TEMA_VALIDO, citaValida, enlazarDependencias } from './ayuda/construir.js';
import { sembrarTemaPublicado, TEMA_PUBLICADO } from './ayuda/relleno.ts';
import { rutasDelCorpus, separarFrontmatter, type Rutas } from '../../tools/lib/corpus.ts';
import { registrarFormasVedadas, entradaVedada } from '../../tools/lib/formasVedadas.ts';
import { aprobar } from '../../tools/lib/revision.ts';
import { leerAprobaciones } from '../../tools/lib/aprobaciones.ts';
import {
  frasesDeLaPagina,
  problemasDeLaSemilla,
  proponerAtribuidas,
  formatearPropuesta,
} from '../../tools/lib/siembraAtribuida.ts';
import { MIN_ATESTIGUACIONES_DE_ATRIBUIDA, SEMILLA_DE_ATRIBUIDAS, type EntradaDeSemilla } from '../../src/lib/umbrales.ts';
import type { ValoresDeLaPuerta } from '../../tools/lib/atribuidas.ts';

const ejecutar = promisify(execFile);
const DOBLE = pathToFileURL(join(RAIZ, 'tests/unit/ayuda/doble-de-red.mjs')).href;

/**
 * Historia 35.10, FR-68 — la siembra acotada desde BrainyQuote.
 *
 * Lo puro —la lista de la semilla, el lector de la página y la propuesta— con la semilla y el mínimo
 * por parámetro sobre un corpus temporal; por proceso, con el árbol (la lista vacía: todo se niega
 * con 1 sin pedir nada) y en una **copia del proyecto** con la lista llena, con el doble de red.
 * Ninguna prueba pide nada a la red ni escribe en el Corpus real.
 */

const PAGINA_DE_BUZZ = 'https://www.brainyquote.com/authors/buzz-lightyear-quotes';
const SEMILLA: EntradaDeSemilla[] = [
  { slug: 'buzz', pagina: PAGINA_DE_BUZZ },
  { slug: 'vivo', pagina: 'https://www.brainyquote.com/authors/autora-viva-quotes' },
  { slug: 'seneca', pagina: 'https://www.brainyquote.com/authors/seneca-quotes' },
];
const PUERTA: ValoresDeLaPuerta = {
  maxCaracteres: 1000,
  maxPorObra: 1000,
  maxPorDueño: 1000,
  minAtestiguaciones: 2,
  buzon: 'peticiones@ejemplo.org',
};

const AUTOR_VIVO = 'nombre: "Autora Viva"\nvivo: true\nsemblanza: "Escritora de hoy."\nordenAlfabetico: "Viva"\n';
const BUZZ = 'nombre: "Buzz Lightyear"\nuniverso: "Toy Story"\nordenAlfabetico: "Lightyear"\n';
const WOODY = 'nombre: "Woody"\nuniverso: "Toy Story"\nordenAlfabetico: "Woody"\n';

const PUBLICADA_DE_BUZZ = 'Hasta el infinito y más allá, guardián del cosmos.';
const EN_REVISION = 'Hay una serpiente en mi bota, vaquero de juguete.';
const VEDADA = 'Lo que se rechazó una vez no vuelve por la otra puerta.';

const HTML = `<!doctype html><html><body>
<div class="grid-item qb clearfix bqQt">
  <a href="/quotes/buzz_1" class="b-qt" title="view quote"><div>To infinity &amp; beyond!</div></a>
  <a href="/authors/buzz" class="bq-aut" title="view author">Buzz Lightyear</a>
</div>
<div class="grid-item qb clearfix bqQt">
  <a href="/quotes/buzz_2" class="b-qt" title="view quote"><div>The   Star Command&#39;s pride.</div></a>
  <a href="/authors/buzz" class="bq-aut" title="view author">Buzz Lightyear</a>
</div>
<a href="/topics" title="view topic">Topics</a>
</body></html>`;

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function temporal(prefijo: string): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), prefijo));
  temporales.push(raiz);
  return raiz;
}

/** Un corpus temporal con Séneca, una Autora viva, Buzz y Woody, una publicada de cada clase y una candidata. */
async function corpusDePrueba(): Promise<Rutas> {
  const raiz = join(await temporal('sabiduria-siembra-'), 'corpus');
  const ficheros: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'autores/vivo.yml': AUTOR_VIVO,
    'personajes/buzz.yml': BUZZ,
    'personajes/woody.yml': WOODY,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'obras/vivo--obras-de-la-autora.yml': 'autor: "vivo"\ntitulo: "Obras de la autora"\nformas:\n  - "obras de la autora"\n',
    'obras/seneca--la-patrulla.yml': 'autor: "seneca"\ntitulo: "La patrulla"\nformas:\n  - "la patrulla"\n',
    // Ocupa el nombre que tomaría la ficha de «La patrulla» de la Autora viva: esa no se resuelve sin decidir.
    'obras/vivo--la-patrulla.yml': 'autor: "vivo"\ntitulo: "La patrulla, otra"\nformas:\n  - "la patrulla otra"\n',
    'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
    'citas/buzz--hasta-el-infinito-y-mas-alla.md': citaValida({
      clase: 'atribuida',
      estadoDerechos: undefined,
      fuente: undefined,
      ...ATESTIGUADA,
      slug: 'buzz-hasta-el-infinito-y-mas-alla',
      texto: PUBLICADA_DE_BUZZ,
      autor: undefined,
      personaje: 'buzz',
      procedencia: { año: 1995 },
    }),
    '_revision/woody--hay-una-serpiente-en-mi-bota.md': citaValida({
      clase: 'atribuida',
      estadoDerechos: undefined,
      fuente: undefined,
      temas: undefined,
      ...ATESTIGUADA,
      slug: 'woody-hay-una-serpiente-en-mi-bota',
      texto: EN_REVISION,
      autor: undefined,
      personaje: 'woody',
      procedencia: { año: 1995 },
    }),
  };
  for (const dir of ['citas', 'autores', 'personajes', 'temas', 'obras', '_revision', 'fuentes']) {
    await mkdir(join(raiz, dir), { recursive: true });
  }
  for (const [ruta, contenido] of Object.entries(ficheros)) {
    await mkdir(dirname(join(raiz, ruta)), { recursive: true });
    await writeFile(join(raiz, ruta), contenido, 'utf8');
  }
  const rutas = rutasDelCorpus(raiz);
  await sembrarTemaPublicado(rutas);
  await registrarFormasVedadas(rutas, [entradaVedada(VEDADA, 'cotejo-fallido', '2026-11-01')!]);
  return rutas;
}

/** Una candidata en español de Buzz que pasa: dos dominios, origen y Tema publicado. */
const deBuzz = (campos: Record<string, unknown> = {}) => ({
  texto: 'Al rescate, que la galaxia no se defiende sola.',
  personaje: 'buzz',
  temas: [TEMA_PUBLICADO],
  año: 1995,
  origen: 'doblaje',
  atestiguaciones: [...ATESTIGUADA.atestiguaciones],
  ...campos,
});

async function revision(rutas: Rutas): Promise<string[]> {
  return (await readdir(rutas.revision)).sort();
}

describe('Historia 35.10 — la lista de la semilla de prueba', () => {
  // La llena Héctor: la prueba no fija su valor, solo que lo que haya en el árbol se sostiene.
  it('la del árbol, la llene Héctor como la llene, se sostiene y nombra Autores o Personajes que existen', () => {
    expect(problemasDeLaSemilla(SEMILLA_DE_ATRIBUIDAS)).toEqual([]);
    for (const { slug } of SEMILLA_DE_ATRIBUIDAS) {
      expect(
        existsSync(join(RAIZ, 'corpus/autores', `${slug}.yml`)) || existsSync(join(RAIZ, 'corpus/personajes', `${slug}.yml`)),
        slug,
      ).toBe(true);
    }
  });

  it('admite slugs con forma y páginas https:// de BrainyQuote, y nombra lo que no', () => {
    expect(problemasDeLaSemilla(SEMILLA)).toEqual([]);
    const problemas = problemasDeLaSemilla([
      { slug: 'Buzz Lightyear', pagina: PAGINA_DE_BUZZ },
      { slug: 'buzz', pagina: 'http://www.brainyquote.com/x' },
      { slug: 'buzz', pagina: 'https://quotes.example.org/buzz' },
    ]);
    expect(problemas).toHaveLength(4);
    expect(problemas.join('\n')).toMatch(/no tiene forma de slug/u);
    expect(problemas.join('\n')).toMatch(/está repetido/u);
    expect(problemas.join('\n')).toMatch(/no es una dirección https:\/\/ de brainyquote\.com/u);
  });

  it('solo brainyquote.com o www., sin puerto, consulta ni fragmento', () => {
    expect(problemasDeLaSemilla([{ slug: 'a', pagina: 'https://brainyquote.com/authors/a-quotes' }])).toEqual([]);
    for (const pagina of [
      'https://www.brainyquote.com:8443/authors/a-quotes',
      'https://www.brainyquote.com/authors/a-quotes?pg=2',
      'https://www.brainyquote.com/authors/a-quotes#arriba',
      'https://espejo.brainyquote.com/authors/a-quotes',
    ]) {
      expect(problemasDeLaSemilla([{ slug: 'a', pagina }]), pagina).toHaveLength(1);
    }
  });
});

describe('Historia 35.10 — el lector de la página (sin red)', () => {
  it('da cada frase en inglés con quién la dice, en orden y con las entidades leídas', () => {
    expect(frasesDeLaPagina(HTML)).toEqual([
      { frase: 'To infinity & beyond!', quien: 'Buzz Lightyear' },
      { frase: "The Star Command's pride.", quien: 'Buzz Lightyear' },
    ]);
  });

  it('lee las entidades tipográficas y deja tal cual una numérica fuera de Unicode, sin romper', () => {
    const pagina =
      '<a title="view quote">It&rsquo;s &ldquo;time&rdquo; &mdash; now&hellip; &#x110000; &#99999999;</a>' +
      '<a title="view author">Buzz</a>';
    expect(frasesDeLaPagina(pagina)).toEqual([
      { frase: 'It\u2019s \u201ctime\u201d \u2014 now\u2026 &#x110000; &#99999999;', quien: 'Buzz' },
    ]);
  });

  it('una página que no reconoce no da ninguna, y un par repetido sale una vez', () => {
    expect(frasesDeLaPagina('<html><body><p>Nada</p></body></html>')).toEqual([]);
    const doble = HTML.replace('</body>', `${HTML.split('<body>')[1].split('<a href="/topics"')[0]}</body>`);
    expect(frasesDeLaPagina(doble)).toHaveLength(2);
  });
});

describe('Historia 35.10 — proponer: a corpus/_revision/, nunca a corpus/citas/', () => {
  it('la que pasa se escribe en revisión como atribuida, con sus campos, y no se publica nada', async () => {
    const rutas = await corpusDePrueba();
    const citasAntes = (await readdir(rutas.citas)).sort();
    const resultado = await proponerAtribuidas(rutas, [deBuzz({ obra: 'La patrulla' })], {
      semilla: SEMILLA,
      minAtestiguaciones: 2,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.rechazadas).toEqual([]);
    expect(resultado.escritas).toEqual([
      expect.objectContaining({
        slug: 'buzz-al-rescate-que-la-galaxia-no-se',
        dominios: ['wikiquote.org', 'elpais.com'],
        sinJuzgarMinimo: false,
      }),
    ]);
    expect(await revision(rutas)).toContain('buzz--al-rescate-que-la-galaxia-no-se.md');
    const datos = separarFrontmatter(await readFile(join(rutas.revision, 'buzz--al-rescate-que-la-galaxia-no-se.md'), 'utf8'))!;
    expect(datos).toMatchObject({
      clase: 'atribuida',
      personaje: 'buzz',
      origen: 'doblaje',
      procedencia: { obra: 'La patrulla', año: 1995 },
      temas: [TEMA_PUBLICADO],
    });
    expect(datos).not.toHaveProperty('estadoDerechos');
    expect((await readdir(rutas.citas)).sort()).toEqual(citasAntes);
    // Ninguna ficha nueva, ningún registro tocado: proponer solo escribe la candidata.
    expect((await readdir(rutas.obras)).sort()).toEqual([
      'seneca--la-patrulla.yml',
      'vivo--la-patrulla.yml',
      'vivo--obras-de-la-autora.yml',
    ]);
    expect(existsSync(rutas.clasesDeCita)).toBe(false);
  });

  it('la traducción del sitio —origen traduccion-propia— se escribe en revisión con su origen y su partida (FR-68 v9.2)', async () => {
    const rutas = await corpusDePrueba();
    const PARTIDA = { texto: 'To the rescue, the galaxy will not defend itself.', lengua: 'en' };
    const resultado = await proponerAtribuidas(rutas, [deBuzz({ origen: 'traduccion-propia', partida: PARTIDA })], {
      semilla: SEMILLA,
      minAtestiguaciones: 2,
    });
    expect(resultado.ok && resultado.rechazadas).toEqual([]);
    const datos = separarFrontmatter(await readFile(join(rutas.revision, 'buzz--al-rescate-que-la-galaxia-no-se.md'), 'utf8'))!;
    // La frase de partida se guarda con la candidata (35.11): la traducción se puede auditar.
    expect(datos).toMatchObject({ clase: 'atribuida', personaje: 'buzz', origen: 'traduccion-propia', partida: PARTIDA });
    expect((await readdir(rutas.citas)).sort()).not.toContain('buzz--al-rescate-que-la-galaxia-no-se.md');
  });

  // El esquema aplica el mínimo del árbol aunque la orden lo anule por parámetro: solo se prueba sin él.
  it.skipIf(MIN_ATESTIGUACIONES_DE_ATRIBUIDA !== undefined)('sin MIN_ATESTIGUACIONES_DE_ATRIBUIDA informa sus dominios sin juzgar el mínimo, y la deja en revisión', async () => {
    const rutas = await corpusDePrueba();
    const una = deBuzz({ atestiguaciones: [ATESTIGUADA.atestiguaciones[0]] });
    const resultado = await proponerAtribuidas(rutas, [una], { semilla: SEMILLA, minAtestiguaciones: null });
    expect(resultado.ok && resultado.escritas.map((e) => [e.dominios, e.sinJuzgarMinimo])).toEqual([[['wikiquote.org'], true]]);
    if (!resultado.ok) return;
    expect(formatearPropuesta(resultado)).toMatch(/sin juzgar el mínimo: MIN_ATESTIGUACIONES_DE_ATRIBUIDA sin valor/u);
  });

  it('con el mínimo, la que no lo alcanza se rechaza con el motivo del esquema', async () => {
    const rutas = await corpusDePrueba();
    const una = deBuzz({ atestiguaciones: [ATESTIGUADA.atestiguaciones[0]] });
    const resultado = await proponerAtribuidas(rutas, [una], { semilla: SEMILLA, minAtestiguaciones: 2 });
    expect(resultado.ok && resultado.rechazadas[0].motivos.join(' ')).toMatch(/hacen falta 2 \(MIN_ATESTIGUACIONES_DE_ATRIBUIDA\)/u);
    expect(await revision(rutas)).toEqual(['woody--hay-una-serpiente-en-mi-bota.md']);
  });

  it.each([
    ['sin texto en español', { texto: undefined }, /falta «texto».*traduccion-propia/u],
    ['sin Personaje ni Autor', { personaje: undefined }, /sin Personaje ni Autor/u],
    ['un Personaje que no existe', { personaje: 'jessie' }, /«jessie» no existe en corpus\/personajes/u],
    ['un Autor que no existe', { personaje: undefined, autor: 'nadie' }, /«nadie» no existe en corpus\/autores/u],
    ['fuera de la semilla', { personaje: 'woody' }, /«woody» no está en la semilla de prueba.*pregunta 18/u],
    ['de la clase de siempre', { personaje: undefined, autor: 'seneca' }, /clase de siempre/u],
    ['con la clase tecleada', { clase: 'atribuida' }, /la clase no se teclea/u],
    ['sin origen', { origen: undefined }, /origen/u],
    ['con un origen ajeno', { origen: 'traduccion-automatica' }, /origen/u],
    ['con aptaParaPortada', { aptaParaPortada: true }, /aptaParaPortada|portada/u],
    // Historia 35.11 — la traducción propia guarda su partida, y no convive con una Variante.
    ['la traducción propia sin partida', { origen: 'traduccion-propia' }, /declara su «partida»/u],
    ['una partida con otro origen', { partida: { texto: 'To the rescue!', lengua: 'en' } }, /solo una atribuida con «origen: traduccion-propia» declara «partida»/u],
    ['una partida en una lengua ajena', { origen: 'traduccion-propia', partida: { texto: 'To the rescue!', lengua: 'xx' } }, /«lengua» de la «partida»/u],
    ['el campo viejo textoOriginal', { textoOriginal: 'To the rescue!' }, /«textoOriginal»/u],
    [
      'la traducción propia con Variante',
      {
        origen: 'traduccion-propia',
        partida: { texto: 'To the rescue!', lengua: 'en' },
        variante: { texto: 'Al rescate, que la galaxia no se defiende solita.', region: 'espana', origen: 'doblaje' },
      },
      /no declara Variante/u,
    ],
    ['un Personaje que no es un slug', { personaje: 3, autor: 'vivo' }, /«personaje» tiene que ser un slug/u],
    [
      'sin ninguna atestiguación que cuente',
      { atestiguaciones: [{ url: 'https://www.brainyquote.com/quotes/buzz_1', consultadaEl: '2026-11-01' }] },
      // Sin mínimo en el árbol lo dice la orden; con él, el esquema antes que ella.
      /ninguna de sus atestiguaciones cuenta|MIN_ATESTIGUACIONES_DE_ATRIBUIDA/u,
    ],
    ['un Tema desconocido', { temas: ['no-existe'] }, /Tema desconocido/u],
    ['una Obra que no se resuelve sin decidir', { personaje: undefined, autor: 'vivo', obra: 'La patrulla' }, /patrulla/iu],
    ['duplicada de una publicada de la otra clase', { texto: 'No es que tengamos poco tiempo, es que perdemos mucho.' }, /de la clase siempre/u],
    ['duplicada de una publicada atribuida', { texto: PUBLICADA_DE_BUZZ }, /coincide con «buzz-hasta-el-infinito-y-mas-alla»/u],
    ['duplicada de una candidata de revisión', { texto: EN_REVISION }, /coincide con «woody-hay-una-serpiente-en-mi-bota»/u],
    ['una forma vedada', { texto: VEDADA }, /forma vedada/u],
  ])('rechaza %s, la nombra con su motivo y no escribe nada', async (_, campos, motivo) => {
    const rutas = await corpusDePrueba();
    const entrada = Object.fromEntries(Object.entries(deBuzz(campos)).filter(([, v]) => v !== undefined));
    const resultado = await proponerAtribuidas(rutas, [entrada], { semilla: SEMILLA, minAtestiguaciones: 2 });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.escritas).toEqual([]);
    expect(resultado.rechazadas).toHaveLength(1);
    expect(resultado.rechazadas[0].motivos.join(' ')).toMatch(motivo);
    expect(await revision(rutas)).toEqual(['woody--hay-una-serpiente-en-mi-bota.md']);
    expect(formatearPropuesta(resultado)).toMatch(/No se ha escrito nada\./u);
  });

  it.each([
    ['un campo que no es del lote', { atestiguacion: [] }, /«atestiguacion» no es un campo del lote/u],
    ['un slug tecleado', { slug: 'buzz-a-mano' }, /«slug» no es un campo del lote/u],
    ['unos temas que no son lista', { temas: TEMA_PUBLICADO }, /«temas» tiene que ser una lista/u],
  ])('rechaza %s nombrándolo, sin escribir nada', async (_, campos, motivo) => {
    const rutas = await corpusDePrueba();
    const resultado = await proponerAtribuidas(rutas, [deBuzz(campos)], { semilla: SEMILLA, minAtestiguaciones: 2 });
    expect(resultado.ok && resultado.escritas).toEqual([]);
    expect(resultado.ok && resultado.rechazadas[0].motivos.join(' ')).toMatch(motivo);
    expect(await revision(rutas)).toEqual(['woody--hay-una-serpiente-en-mi-bota.md']);
  });

  it('una entrada rechazada no bloquea su corrección más abajo en el mismo lote', async () => {
    const rutas = await corpusDePrueba();
    const resultado = await proponerAtribuidas(rutas, [deBuzz({ origen: undefined }), deBuzz()], {
      semilla: SEMILLA,
      minAtestiguaciones: 2,
    });
    expect(resultado.ok && resultado.rechazadas.map((r) => r.indice)).toEqual([0]);
    expect(resultado.ok && resultado.escritas.map((e) => e.indice)).toEqual([1]);
    expect(resultado.ok && formatearPropuesta(resultado)).toMatch(/el lote corregido lleva solo las rechazadas/u);
  });

  it('un slug ya ocupado —en revisión, en el lote o con la otra clase— toma -2, -3…, y la candidata de antes no se toca', async () => {
    const rutas = await corpusDePrueba();
    const ocupada = join(rutas.revision, 'buzz--al-rescate-que-la-galaxia-no-se.md');
    await writeFile(
      ocupada,
      citaValida({
        clase: 'atribuida',
        estadoDerechos: undefined,
        fuente: undefined,
        temas: undefined,
        ...ATESTIGUADA,
        slug: 'buzz-al-rescate-que-la-galaxia-no-se',
        texto: 'Al rescate, que la galaxia no se olvida de los suyos ni de noche.',
        autor: undefined,
        personaje: 'buzz',
        procedencia: { año: 1995 },
      }),
      'utf8',
    );
    await writeFile(
      rutas.clasesDeCita,
      'clases:\n  - { slug: "buzz-al-rescate-que-la-galaxia-no-se-2", clase: siempre, fecha: "2026-11-01" }\n',
      'utf8',
    );
    const antes = await readFile(ocupada, 'utf8');
    const resultado = await proponerAtribuidas(
      rutas,
      [deBuzz(), deBuzz({ texto: 'Al rescate, que la galaxia no se rinde jamás ante nadie del espacio.' })],
      { semilla: SEMILLA, minAtestiguaciones: 2 },
    );
    expect(resultado.ok && resultado.rechazadas).toEqual([]);
    expect(resultado.ok && resultado.escritas.map((e) => e.slug)).toEqual([
      'buzz-al-rescate-que-la-galaxia-no-se-3',
      'buzz-al-rescate-que-la-galaxia-no-se-4',
    ]);
    expect(await readFile(ocupada, 'utf8')).toBe(antes);
  });

  it('una Autora viva sin Personaje con Ficha de Obra pasa; dentro del lote, la segunda igual se rechaza', async () => {
    const rutas = await corpusDePrueba();
    const deVivo = {
      texto: 'El tiempo cabe en una taza si se bebe despacio.',
      autor: 'vivo',
      obra: 'Obras de la autora',
      origen: 'original',
      atestiguaciones: [...ATESTIGUADA.atestiguaciones],
    };
    const resultado = await proponerAtribuidas(rutas, [deVivo, { ...deVivo }], { semilla: SEMILLA, minAtestiguaciones: 2 });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.escritas.map((e) => e.slug)).toEqual(['vivo-el-tiempo-cabe-en-una-taza-si']);
    expect(resultado.rechazadas.map((r) => [r.indice, r.motivos.join(' ')])).toEqual([
      [1, expect.stringMatching(/coincide con «entrada 1 del lote»/u)],
    ]);
  });

  it('con la semilla vacía o rota no lee el lote ni escribe nada', async () => {
    const rutas = await corpusDePrueba();
    const vacia = await proponerAtribuidas(rutas, [deBuzz()], { semilla: [] });
    expect(vacia.ok).toBe(false);
    expect(!vacia.ok && vacia.motivos.join(' ')).toMatch(/vacía: SEMILLA_DE_ATRIBUIDAS[\s\S]*pregunta 18/u);
    const rota = await proponerAtribuidas(rutas, [deBuzz()], { semilla: [{ slug: 'buzz', pagina: 'https://otra.org/' }] });
    expect(rota.ok).toBe(false);
    expect(await revision(rutas)).toEqual(['woody--hay-una-serpiente-en-mi-bota.md']);
  });

  it('con el registro de formas vedadas ilegible no escribe nada', async () => {
    const rutas = await corpusDePrueba();
    await writeFile(rutas.formasVedadas, 'formas: 3\n', 'utf8');
    const resultado = await proponerAtribuidas(rutas, [deBuzz()], { semilla: SEMILLA, minAtestiguaciones: 2 });
    expect(resultado.ok).toBe(false);
    expect(await revision(rutas)).toEqual(['woody--hay-una-serpiente-en-mi-bota.md']);
  });

  it('lo propuesto es aprobable tal cual: con la puerta abierta por parámetro, aprobar lo publica', async () => {
    const rutas = await corpusDePrueba();
    const resultado = await proponerAtribuidas(rutas, [deBuzz()], { semilla: SEMILLA, minAtestiguaciones: 2 });
    expect(resultado.ok && resultado.escritas).toHaveLength(1);
    const aprobada = await aprobar(rutas, ['buzz-al-rescate-que-la-galaxia-no-se'], [], { puerta: PUERTA });
    expect(aprobada.rechazadasPorAdmision).toEqual([]);
    expect(aprobada.publicadas).toEqual(['buzz-al-rescate-que-la-galaxia-no-se']);
    expect(existsSync(join(rutas.citas, 'buzz--al-rescate-que-la-galaxia-no-se.md'))).toBe(true);
    expect(await revision(rutas)).toEqual(['woody--hay-una-serpiente-en-mi-bota.md']);
  });

  it('la traducción propia también es aprobable tal cual, con dos agentes, y se publica con su origen y su partida', async () => {
    const rutas = await corpusDePrueba();
    const PARTIDA = { texto: 'To the rescue, the galaxy will not defend itself.', lengua: 'en' };
    const resultado = await proponerAtribuidas(rutas, [deBuzz({ origen: 'traduccion-propia', partida: PARTIDA })], {
      semilla: SEMILLA,
      minAtestiguaciones: 2,
    });
    expect(resultado.ok && resultado.escritas).toHaveLength(1);
    const aprobada = await aprobar(rutas, ['buzz-al-rescate-que-la-galaxia-no-se'], [], {
      puerta: PUERTA,
      agentes: { propone: 'agente-a', aprueba: 'agente-b' },
    });
    expect(aprobada.rechazadasPorAdmision).toEqual([]);
    expect(aprobada.publicadas).toEqual(['buzz-al-rescate-que-la-galaxia-no-se']);
    const publicada = separarFrontmatter(await readFile(join(rutas.citas, 'buzz--al-rescate-que-la-galaxia-no-se.md'), 'utf8'))!;
    expect(publicada).toMatchObject({ origen: 'traduccion-propia', partida: PARTIDA });
    expect(publicada).not.toHaveProperty('textoOriginal');
    expect(await leerAprobaciones(rutas)).toEqual([
      { slug: 'buzz-al-rescate-que-la-galaxia-no-se', propone: 'agente-a', aprueba: 'agente-b', fecha: aprobada.aprobaciones![0]!.fecha },
    ]);
  });
});

/** La orden por proceso, con el doble de red precargado y su registro de peticiones. */
async function correr(
  guion: unknown,
  argumentos: string[],
  orden = join(RAIZ, 'tools/atribuida.ts'),
  cwd = RAIZ,
): Promise<{ codigo: number; salida: string; error: string; peticiones: { url: string }[] }> {
  const taller = await temporal('sabiduria-siembra-red-');
  const ficheroDeGuion = join(taller, 'guion.json');
  const registro = join(taller, 'registro.jsonl');
  await writeFile(ficheroDeGuion, JSON.stringify(guion), 'utf8');
  let codigo = 0;
  let salida = '';
  let error = '';
  try {
    const r = await ejecutar(process.execPath, ['--import', 'tsx', '--import', DOBLE, orden, ...argumentos], {
      cwd,
      env: { ...process.env, DOBLE_GUION: ficheroDeGuion, DOBLE_REGISTRO: registro },
    });
    salida = r.stdout;
    error = r.stderr;
  } catch (e) {
    const fallo = e as { code?: number; stdout?: string; stderr?: string };
    codigo = fallo.code ?? 1;
    salida = fallo.stdout ?? '';
    error = fallo.stderr ?? '';
  }
  const peticiones = existsSync(registro)
    ? (await readFile(registro, 'utf8'))
        .split('\n')
        .filter((l) => l !== '')
        .map((l) => JSON.parse(l) as { url: string })
    : [];
  return { codigo, salida, error, peticiones };
}

const GUION_DE_BUZZ = { [PAGINA_DE_BUZZ]: { estado: 200, cuerpo: HTML } };

describe('Historia 35.10 — por proceso, con el árbol: la semilla vacía lo niega todo', () => {
  it('semilla: 1, nombrando la lista y la pregunta 18, sin pedir nada', async () => {
    const taller = await temporal('sabiduria-siembra-salida-');
    const r = await correr(GUION_DE_BUZZ, ['semilla', 'buzz', '--salida', join(taller, 'buzz.json')]);
    expect(r.codigo).toBe(1);
    expect(r.error).toMatch(/SEMILLA_DE_ATRIBUIDAS[\s\S]*pregunta 18/u);
    expect(r.peticiones).toEqual([]);
    expect(existsSync(join(taller, 'buzz.json'))).toBe(false);
  });

  it('proponer: 1 sin escribir nada', async () => {
    const rutas = await corpusDePrueba();
    const lote = join(dirname(rutas.raiz), 'lote.yaml');
    await writeFile(lote, `- texto: "Al rescate, que la galaxia no se defiende sola."\n  personaje: "buzz"\n`, 'utf8');
    const r = await correr({}, ['proponer', lote, '--corpus', rutas.raiz]);
    expect(r.codigo).toBe(1);
    expect(r.error).toMatch(/SEMILLA_DE_ATRIBUIDAS[\s\S]*pregunta 18/u);
    expect(await revision(rutas)).toEqual(['woody--hay-una-serpiente-en-mi-bota.md']);
  });

  it.each([
    ['semilla sin slug', ['semilla']],
    ['semilla con dos slugs', ['semilla', 'buzz', 'woody']],
    ['semilla con una bandera desconocida', ['semilla', 'buzz', '--prisa']],
    ['semilla con --salida vacía', ['semilla', 'buzz', '--salida', '']],
    ['semilla con --salida repetida', ['semilla', 'buzz', '--salida', 'a.json', '--salida', 'b.json']],
    ['proponer sin lote', ['proponer']],
    ['proponer con un lote que no existe', ['proponer', '/no/existe/lote.yaml']],
    ['proponer con una bandera desconocida', ['proponer', '/no/existe/lote.yaml', '--seco']],
  ])('%s es la forma: 2, sin pedir nada', async (_, argumentos) => {
    const r = await correr(GUION_DE_BUZZ, argumentos);
    expect(r.codigo).toBe(2);
    expect(r.peticiones).toEqual([]);
  });

  it('proponer con un lote que no es una lista: 2', async () => {
    const rutas = await corpusDePrueba();
    const lote = join(dirname(rutas.raiz), 'lote.yaml');
    await writeFile(lote, 'texto: "suelto"\n', 'utf8');
    expect((await correr({}, ['proponer', lote, '--corpus', rutas.raiz])).codigo).toBe(2);
  });
});

describe('Historia 35.10 — por proceso, en una copia del proyecto con la semilla llena', () => {
  /** Una copia de lo que la orden importa, con `SEMILLA_DE_ATRIBUIDAS` llena solo en la copia. */
  async function proyectoConSemilla(opciones: { sinMinimo?: boolean } = {}): Promise<string> {
    const proyecto = await temporal('sabiduria-siembra-proyecto-');
    for (const dir of ['src', 'tools', 'integraciones']) await cp(join(RAIZ, dir), join(proyecto, dir), { recursive: true });
    await mkdir(join(proyecto, 'public'), { recursive: true });
    await cp(join(RAIZ, 'public/CNAME'), join(proyecto, 'public/CNAME'));
    for (const f of ['package.json', 'tsconfig.json']) await cp(join(RAIZ, f), join(proyecto, f));
    await enlazarDependencias(proyecto);
    const umbrales = join(proyecto, 'src/lib/umbrales.ts');
    const original = await readFile(umbrales, 'utf8');
    // La semilla del árbol se sustituye tenga el valor que tenga (la llena Héctor).
    const declaracion = /export const SEMILLA_DE_ATRIBUIDAS: readonly EntradaDeSemilla\[\] = \[[\s\S]*?\];/u;
    expect(original).toMatch(declaracion);
    let copia = original.replace(declaracion, `export const SEMILLA_DE_ATRIBUIDAS: readonly EntradaDeSemilla[] = ${JSON.stringify(SEMILLA)};`);
    if (opciones.sinMinimo) {
      const minimo = /export const MIN_ATESTIGUACIONES_DE_ATRIBUIDA: number \| undefined = [^;]+;/u;
      expect(copia).toMatch(minimo);
      copia = copia.replace(minimo, 'export const MIN_ATESTIGUACIONES_DE_ATRIBUIDA: number | undefined = undefined;');
    }
    await writeFile(umbrales, copia, 'utf8');
    return proyecto;
  }

  it('semilla: una sola petición, el JSON fuera de corpus/, y repetirla no vuelve a pedir', async () => {
    const proyecto = await proyectoConSemilla();
    const orden = join(proyecto, 'tools/atribuida.ts');
    const salida = join(proyecto, 'semillas', 'buzz.json');
    const primera = await correr(GUION_DE_BUZZ, ['semilla', 'buzz'], orden, proyecto);
    expect(primera.codigo, primera.error).toBe(0);
    expect(primera.peticiones.map((p) => p.url)).toEqual([PAGINA_DE_BUZZ]);
    const escrita = JSON.parse(await readFile(salida, 'utf8')) as { slug: string; pagina: string; frases: unknown[] };
    expect(escrita).toMatchObject({ slug: 'buzz', pagina: PAGINA_DE_BUZZ });
    // El aviso del fichero con el que trabaja el editor dice las dos salidas (pasada de revisión 2).
    const conAviso = escrita as unknown as { aviso: string; descargadaEl: string };
    expect(conAviso.descargadaEl).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    expect(conAviso.aviso).toMatch(/traduccion-propia/u);
    expect(conAviso.aviso).toMatch(/«partida»/u);
    expect(conAviso.aviso).not.toMatch(/textoOriginal/u);
    expect(conAviso.aviso).not.toMatch(/sale de una versión que ya circula/u);
    expect(escrita.frases).toEqual([
      { frase: 'To infinity & beyond!', quien: 'Buzz Lightyear' },
      { frase: "The Star Command's pride.", quien: 'Buzz Lightyear' },
    ]);
    const segunda = await correr(GUION_DE_BUZZ, ['semilla', 'buzz'], orden, proyecto);
    expect(segunda.codigo).toBe(1);
    expect(segunda.error).toMatch(/una sola vez/u);
    expect(segunda.peticiones).toEqual([]);
    // Con otro nombre en semillas/, la página ya está descargada: tampoco se vuelve a pedir.
    const otra = await correr(GUION_DE_BUZZ, ['semilla', 'buzz', '--salida', 'semillas/otra.json'], orden, proyecto);
    expect(otra.codigo).toBe(1);
    expect(otra.error).toMatch(/una sola vez/u);
    expect(otra.peticiones).toEqual([]);
    expect(existsSync(join(proyecto, 'semillas', 'otra.json'))).toBe(false);
    // Desde otro directorio de trabajo, la salida por omisión sigue siendo la de semillas/ del proyecto.
    await mkdir(join(proyecto, 'tools', 'sub'), { recursive: true });
    const desdeDentro = await correr(GUION_DE_BUZZ, ['semilla', 'buzz'], orden, join(proyecto, 'tools', 'sub'));
    expect(desdeDentro.codigo).toBe(1);
    expect(desdeDentro.peticiones).toEqual([]);
    // Y una --salida relativa se lee contra la raíz del proyecto, no contra el directorio de trabajo:
    // cae en semillas/ del proyecto, donde la página ya está, y no «fuera de semillas/».
    const relativaDesdeDentro = await correr(
      GUION_DE_BUZZ,
      ['semilla', 'buzz', '--salida', 'semillas/otra.json'],
      orden,
      join(proyecto, 'tools', 'sub'),
    );
    expect(relativaDesdeDentro.codigo).toBe(1);
    expect(relativaDesdeDentro.error).toMatch(/una sola vez/u);
    expect(relativaDesdeDentro.error).not.toMatch(/fuera de semillas/u);
    expect(relativaDesdeDentro.peticiones).toEqual([]);
  });

  it.each([
    ['un 404', { [PAGINA_DE_BUZZ]: { estado: 404, cuerpo: '' } }, /respondió 404/u],
    ['una redirección', { [PAGINA_DE_BUZZ]: { estado: 301, cabeceras: { location: 'https://otra.org/' } } }, /respondió 301/u],
    ['algo que no es HTML', { [PAGINA_DE_BUZZ]: { estado: 200, cabeceras: { 'content-type': 'application/json' }, cuerpo: '{}' } }, /no devolvió HTML/u],
    ['una página sin frases', { [PAGINA_DE_BUZZ]: { estado: 200, cuerpo: '<p>nada</p>' } }, /no se reconoce ninguna frase/u],
    ['la red caída', { [PAGINA_DE_BUZZ]: { lanza: 'getaddrinfo ENOTFOUND' } }, /No se pudo pedir/u],
  ])('semilla con %s: 1 y no escribe nada', async (_, guion, motivo) => {
    const proyecto = await proyectoConSemilla();
    const r = await correr(guion, ['semilla', 'buzz'], join(proyecto, 'tools/atribuida.ts'), proyecto);
    expect(r.codigo).toBe(1);
    expect(r.error).toMatch(motivo);
    expect(existsSync(join(proyecto, 'semillas'))).toBe(false);
  });

  it('semilla: un slug fuera de la lista, una salida en corpus/ o que no es .json, 1 sin pedir nada', async () => {
    const proyecto = await proyectoConSemilla();
    const orden = join(proyecto, 'tools/atribuida.ts');
    for (const argumentos of [
      ['semilla', 'woody'],
      ['semilla', 'buzz', '--salida', 'corpus/semilla.json'],
      ['semilla', 'buzz', '--salida', 'corpus/..semilla.json'],
      ['semilla', 'buzz', '--salida', 'src/semilla.json'],
      ['semilla', 'buzz', '--salida', 'semillas/buzz.txt'],
    ]) {
      const r = await correr(GUION_DE_BUZZ, argumentos, orden, proyecto);
      expect(r.codigo, argumentos.join(' ')).toBe(1);
      expect(r.peticiones).toEqual([]);
    }
    expect(existsSync(join(proyecto, 'corpus'))).toBe(false);
  });

  it('proponer: escribe las que pasan en revisión y sale con 1 nombrando las rechazadas', async () => {
    const proyecto = await proyectoConSemilla({ sinMinimo: true });
    const rutas = await corpusDePrueba();
    const lote = join(dirname(rutas.raiz), 'lote.yaml');
    await writeFile(
      lote,
      [
        `- texto: "Al rescate, que la galaxia no se defiende sola."`,
        `  personaje: "buzz"`,
        `  año: 1995`,
        `  origen: "doblaje"`,
        `  atestiguaciones:`,
        ...ATESTIGUADA.atestiguaciones.flatMap((a) => [`    - url: "${a.url}"`, `      consultadaEl: "${a.consultadaEl}"`]),
        `- texto: "Una frase de Woody."`,
        `  personaje: "woody"`,
        '',
      ].join('\n'),
      'utf8',
    );
    const r = await correr({}, ['proponer', lote, '--corpus', rutas.raiz], join(proyecto, 'tools/atribuida.ts'), proyecto);
    expect(r.codigo, r.error).toBe(1);
    expect(r.error).toMatch(/entrada 2 «Una frase de Woody\.»/u);
    expect(r.error).toMatch(/MIN_ATESTIGUACIONES_DE_ATRIBUIDA sin valor/u);
    expect(r.peticiones).toEqual([]);
    expect(await revision(rutas)).toEqual(['buzz--al-rescate-que-la-galaxia-no-se.md', 'woody--hay-una-serpiente-en-mi-bota.md']);
    const candidata = parsearYaml(
      (await readFile(join(rutas.revision, 'buzz--al-rescate-que-la-galaxia-no-se.md'), 'utf8')).split('---')[1],
    ) as Record<string, unknown>;
    expect(candidata.clase).toBe('atribuida');
  });
});
