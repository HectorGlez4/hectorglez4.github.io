import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { ATESTIGUADA, AUTOR_VALIDO, RAIZ, TEMA_VALIDO, citaValida, type CorpusDePrueba } from './ayuda/construir.js';
import { cambiarAtribuida, type CambioDeAtribuida } from '../../tools/lib/cambioDeAtribuida.ts';
import { rutasDelCorpus, separarFrontmatter } from '../../tools/lib/corpus.ts';
import type { ValoresDeLaPuerta } from '../../tools/lib/atribuidas.ts';

const ejecutar = promisify(execFile);

/**
 * Historia 35.6, AD-35 — `npm run atribuida`, la única orden que cambia una atribuida publicada.
 *
 * Cada fila de la orden de la matriz del spec, por `cambiarAtribuida` con la puerta abierta por
 * parámetro —nunca en el árbol—, sobre un corpus temporal: el fichero cambia en lo que dice el
 * cambio y en nada más, el slug y el nombre del fichero no cambian, y la ficha de Obra se crea o
 * sigue siendo la misma. Y por proceso, `tsx tools/atribuida.ts --corpus <copia>`: 2 por la forma de
 * la invocación y 1 con la puerta cerrada del árbol, sin escribir en ningún caso.
 */

const PUERTA: ValoresDeLaPuerta = {
  maxCaracteres: 1000,
  maxPorObra: 1000,
  maxPorDueño: 1000,
  minAtestiguaciones: 2,
  buzon: 'peticiones@ejemplo.org',
};

const AUTOR_VIVO = `nombre: "Autora Viva"
vivo: true
semblanza: "Escritora de hoy."
ordenAlfabetico: "Viva"
`;
const BUZZ = `nombre: "Buzz Lightyear"
universo: "Toy Story"
ordenAlfabetico: "Lightyear"
`;
const WOODY = `nombre: "Woody"
universo: "Toy Story"
ordenAlfabetico: "Woody"
`;

const atribuida = (campos: Record<string, unknown>) =>
  citaValida({ clase: 'atribuida', estadoDerechos: undefined, fuente: undefined, temas: undefined, ...ATESTIGUADA, ...campos });

const A1 = 'buzz-hasta-el-infinito-y-mas-alla';
const A2 = 'buzz-la-patrulla-nunca-duerme';
const A3 = 'vivo-el-tiempo-cabe-en-una-taza';
const A4 = 'buzz-al-rescate-que-la-galaxia';
const S1 = 'seneca-no-es-que-tengamos-poco-tiempo';
const CANDIDATA = 'woody-hay-una-serpiente-en-mi-bota';

const TEXTO_A1 = 'Hasta el infinito y más allá, guardián del cosmos.';
const VARIANTE_A1 = 'Hasta el infinito y aún más allá, vigía de las estrellas.';
const TEXTO_A4 = 'Al rescate, que la galaxia no se defiende sola.';
const TEXTO_CANDIDATA = 'Hay una serpiente en mi bota, vaquero de juguete.';

const FICHEROS = {
  A1: 'citas/buzz--hasta-el-infinito-y-mas-alla.md',
  A2: 'citas/buzz--la-patrulla-nunca-duerme.md',
  A3: 'citas/vivo--el-tiempo-cabe-en-una-taza.md',
  A4: 'citas/buzz--al-rescate-que-la-galaxia.md',
  S1: 'citas/seneca--no-es-que-tengamos-poco-tiempo.md',
};

const CORPUS: CorpusDePrueba = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'autores/vivo.yml': AUTOR_VIVO,
  'personajes/buzz.yml': BUZZ,
  'personajes/woody.yml': WOODY,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  // La Obra «La patrulla» es de Buzz; Séneca tiene otra ficha con la misma forma.
  'obras/buzz--la-patrulla.yml': 'personaje: "buzz"\npersonajes:\n  - "buzz"\ntitulo: "La patrulla"\nformas:\n  - "la patrulla"\n',
  'obras/seneca--la-patrulla.yml': 'autor: "seneca"\ntitulo: "La patrulla"\nformas:\n  - "la patrulla"\n',
  'obras/vivo--obras-de-la-autora.yml': 'autor: "vivo"\ntitulo: "Obras de la autora"\nformas:\n  - "obras de la autora"\n',
  'obras/seneca--sobre-la-brevedad-de-la-vida.yml':
    'autor: "seneca"\ntitulo: "Sobre la brevedad de la vida"\nformas:\n  - "sobre la brevedad de la vida"\n',
  [FICHEROS.A1]: atribuida({
    slug: A1,
    texto: TEXTO_A1,
    autor: undefined,
    personaje: 'buzz',
    procedencia: { año: 1995 },
    origen: 'original',
    variante: { texto: VARIANTE_A1, region: 'espana', origen: 'doblaje' },
  }),
  [FICHEROS.A2]: atribuida({
    slug: A2,
    texto: 'La patrulla nunca duerme cuando la ciudad sueña.',
    autor: undefined,
    personaje: 'buzz',
    procedencia: { obra: 'La patrulla', año: 1995 },
  }),
  [FICHEROS.A3]: atribuida({
    slug: A3,
    texto: 'El tiempo cabe en una taza si se bebe despacio.',
    autor: 'vivo',
    procedencia: { obra: 'Obras de la autora', año: 2010 },
  }),
  [FICHEROS.A4]: atribuida({
    slug: A4,
    texto: TEXTO_A4,
    autor: undefined,
    personaje: 'buzz',
    procedencia: { año: 1995 },
  }),
  [FICHEROS.S1]: citaValida(),
  [`_revision/woody--hay-una-serpiente-en-mi-bota.md`]: atribuida({
    slug: CANDIDATA,
    texto: TEXTO_CANDIDATA,
    autor: undefined,
    personaje: 'woody',
    procedencia: { año: 1995 },
  }),
};

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function enDisco(corpus: CorpusDePrueba = CORPUS): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-atribuida-cli-'));
  temporales.push(raiz);
  const directorio = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'personajes', 'temas', 'obras', '_revision', 'fuentes']) {
    await mkdir(join(directorio, dir), { recursive: true });
  }
  for (const [ruta, contenido] of Object.entries(corpus)) {
    const destino = join(directorio, ruta);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, contenido, 'utf8');
  }
  return directorio;
}

/** Cada fichero del corpus, con su contenido: lo que una negativa no puede cambiar. */
async function instantanea(directorio: string): Promise<Record<string, string>> {
  const salida: Record<string, string> = {};
  for (const entrada of await readdir(directorio, { recursive: true, withFileTypes: true })) {
    if (!entrada.isFile()) continue;
    const ruta = join(entrada.parentPath, entrada.name);
    salida[ruta.slice(directorio.length + 1)] = await readFile(ruta, 'utf8');
  }
  return salida;
}

const datosDe = async (directorio: string, fichero: string) =>
  separarFrontmatter(await readFile(join(directorio, fichero), 'utf8'))!;

async function cambiar(directorio: string, cambio: CambioDeAtribuida, puerta: ValoresDeLaPuerta = PUERTA) {
  return cambiarAtribuida(rutasDelCorpus(directorio), cambio, { puerta });
}

/** Que la orden se niega sin tocar ningún fichero, y con qué motivo. */
async function seNiega(cambio: CambioDeAtribuida, motivo: RegExp) {
  const directorio = await enDisco();
  const antes = await instantanea(directorio);
  const r = await cambiar(directorio, cambio);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.motivos.join('\n')).toMatch(motivo);
  expect(await instantanea(directorio)).toEqual(antes);
}

/** Que solo cambió el fichero dado (y los ficheros de Obra nuevos que se digan). */
async function soloCambio(directorio: string, antes: Record<string, string>, ficheros: string[], nuevos: string[] = []) {
  const despues = await instantanea(directorio);
  expect(Object.keys(despues).sort()).toEqual([...Object.keys(antes), ...nuevos].sort());
  for (const [ruta, contenido] of Object.entries(antes)) {
    if (ficheros.includes(ruta)) expect(despues[ruta], ruta).not.toBe(contenido);
    else expect(despues[ruta], ruta).toBe(contenido);
  }
}

describe('Historia 35.6 — `texto` y `variante`', () => {
  it('un texto parecido reescribe el texto; el slug, el fichero y lo demás no cambian', async () => {
    const directorio = await enDisco();
    const antes = await instantanea(directorio);
    const nuevo = 'Hasta el infinito y más allá, ¡guardián del cosmos!';
    const r = await cambiar(directorio, { tipo: 'texto', slug: A1, texto: nuevo });
    expect(r.ok, r.ok ? '' : r.motivos.join('\n')).toBe(true);
    await soloCambio(directorio, antes, [FICHEROS.A1]);
    const datos = await datosDe(directorio, FICHEROS.A1);
    const previos = separarFrontmatter(antes[FICHEROS.A1])!;
    expect(datos).toEqual({ ...previos, texto: nuevo });
  });

  it('un texto parecido a la Variante, y no al texto, también vale', async () => {
    const directorio = await enDisco();
    const nuevo = 'Hasta el infinito y aún más allá, vigía de estrellas.';
    const r = await cambiar(directorio, { tipo: 'texto', slug: A1, texto: nuevo });
    expect(r.ok, r.ok ? '' : r.motivos.join('\n')).toBe(true);
    expect((await datosDe(directorio, FICHEROS.A1)).texto).toBe(nuevo);
  });

  it('un texto distinto se niega con su parecido', async () => {
    await seNiega(
      { tipo: 'texto', slug: A1, texto: 'Una frase completamente diferente que nada tiene que ver con la otra.' },
      /se parece \d,\d\d al texto o a la Variante publicados, y hace falta 0,85/u,
    );
  });

  it('el texto de la Variante intercambia los dos textos y sus dos origen; la región no cambia', async () => {
    const directorio = await enDisco();
    const r = await cambiar(directorio, { tipo: 'texto', slug: A1, texto: VARIANTE_A1 });
    expect(r.ok, r.ok ? '' : r.motivos.join('\n')).toBe(true);
    const datos = await datosDe(directorio, FICHEROS.A1);
    expect(datos.texto).toBe(VARIANTE_A1);
    expect(datos.origen).toBe('doblaje');
    expect(datos.variante).toEqual({ texto: TEXTO_A1, region: 'espana', origen: 'original' });
    expect(datos.slug).toBe(A1);
  });

  it('el intercambio se queda con la letra tecleada, no con la guardada', async () => {
    const directorio = await enDisco();
    const tecleado = `¡${VARIANTE_A1.slice(0, -1)}!`;
    const r = await cambiar(directorio, { tipo: 'texto', slug: A1, texto: tecleado });
    expect(r.ok, r.ok ? '' : r.motivos.join('\n')).toBe(true);
    const datos = await datosDe(directorio, FICHEROS.A1);
    expect(datos.texto).toBe(tecleado);
    expect(datos.variante).toEqual({ texto: TEXTO_A1, region: 'espana', origen: 'original' });
  });

  it('un texto igual al que ya hay no reescribe nada: nada que cambiar', async () => {
    await seNiega({ tipo: 'texto', slug: A1, texto: TEXTO_A1 }, /Nada que cambiar/u);
  });

  it('una Variante igual a la que ya hay, con su región y su origen, no reescribe nada', async () => {
    await seNiega({ tipo: 'variante', slug: A1, texto: VARIANTE_A1, region: 'espana', origen: 'doblaje' }, /Nada que cambiar/u);
  });

  it('una Variante igual a la que ya hay, guardada con sus claves en otro orden, tampoco reescribe nada', async () => {
    const corpus = { ...CORPUS };
    corpus[FICHEROS.A1] = atribuida({
      slug: A1,
      texto: TEXTO_A1,
      autor: undefined,
      personaje: 'buzz',
      procedencia: { año: 1995 },
      origen: 'original',
      variante: { origen: 'doblaje', region: 'espana', texto: VARIANTE_A1 },
    });
    const directorio = await enDisco(corpus);
    const antes = await instantanea(directorio);
    const r = await cambiar(directorio, { tipo: 'variante', slug: A1, texto: VARIANTE_A1, region: 'espana', origen: 'doblaje' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivos.join('\n')).toMatch(/Nada que cambiar/u);
    expect(await instantanea(directorio)).toEqual(antes);
  });

  it('el intercambio por `variante` con el origen de la Variante, y no el del texto, se niega nombrando los valores', async () => {
    await seNiega(
      { tipo: 'variante', slug: A1, texto: TEXTO_A1, region: 'espana', origen: 'doblaje' },
      /\{region: espana, origen: original\}.*Declárela con esos valores/su,
    );
  });

  it('una Variante igual al texto, con la región y el origen que resultan, intercambia igual', async () => {
    const directorio = await enDisco();
    const r = await cambiar(directorio, { tipo: 'variante', slug: A1, texto: TEXTO_A1, region: 'espana', origen: 'original' });
    expect(r.ok, r.ok ? '' : r.motivos.join('\n')).toBe(true);
    const datos = await datosDe(directorio, FICHEROS.A1);
    expect(datos.texto).toBe(VARIANTE_A1);
    expect(datos.variante).toEqual({ texto: TEXTO_A1, region: 'espana', origen: 'original' });
  });

  it('una Variante nueva parecida al texto se declara, sin tocar el slug ni el fichero', async () => {
    const directorio = await enDisco();
    const antes = await instantanea(directorio);
    const variante = 'Al rescate, que la galaxia no se defiende solita.';
    const r = await cambiar(directorio, { tipo: 'variante', slug: A4, texto: variante, region: 'espana', origen: 'doblaje' });
    expect(r.ok, r.ok ? '' : r.motivos.join('\n')).toBe(true);
    await soloCambio(directorio, antes, [FICHEROS.A4]);
    const datos = await datosDe(directorio, FICHEROS.A4);
    expect(datos.variante).toEqual({ texto: variante, region: 'espana', origen: 'doblaje' });
    expect(datos.slug).toBe(A4);
    expect(datos.texto).toBe(TEXTO_A4);
  });

  it('una Variante que no se parece se niega', async () => {
    await seNiega(
      { tipo: 'variante', slug: A4, texto: 'Nada que ver con la frase de la Cita, otra cosa entera.', region: 'espana', origen: 'doblaje' },
      /La Variante nueva se parece/u,
    );
  });

  it('un fichero del Corpus que no se deja leer niega la orden con su motivo, sin escribir ni lanzar', async () => {
    const directorio = await enDisco({ ...CORPUS, 'autores/roto.yml': 'nombre: [sin cerrar\n' });
    const antes = await instantanea(directorio);
    const r = await cambiar(directorio, { tipo: 'texto', slug: A1, texto: 'Hasta el infinito y más allá, ¡guardián del cosmos!' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivos.join('\n')).toMatch(/El Corpus no se deja leer/u);
    expect(await instantanea(directorio)).toEqual(antes);
  });

  it('una Variante de una región ajena se niega', async () => {
    await seNiega({ tipo: 'variante', slug: A4, texto: TEXTO_A4, region: 'mexico', origen: 'doblaje' }, /no es una región de Variante/u);
  });

  it('una Variante que repite una candidata de revisión es un duplicado entre clases, y se niega', async () => {
    const corpus = { ...CORPUS };
    corpus['_revision/woody--hay-una-serpiente-en-mi-bota.md'] = atribuida({
      slug: CANDIDATA,
      texto: 'Al rescate, que la galaxia no se defiende solita.',
      autor: undefined,
      personaje: 'woody',
      procedencia: { año: 1995 },
    });
    const directorio = await enDisco(corpus);
    const antes = await instantanea(directorio);
    const r = await cambiar(directorio, {
      tipo: 'variante',
      slug: A4,
      texto: 'Al rescate, que la galaxia no se defiende solita.',
      region: 'espana',
      origen: 'doblaje',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivos.join('\n')).toMatch(new RegExp(`coincide con «${CANDIDATA}»`, 'u'));
    expect(await instantanea(directorio)).toEqual(antes);
  });

  it('una Variante más larga que el tope de la puerta se niega', async () => {
    const directorio = await enDisco();
    const antes = await instantanea(directorio);
    const r = await cambiar(
      directorio,
      { tipo: 'variante', slug: A4, texto: 'Al rescate, que la galaxia no se defiende solita.', region: 'espana', origen: 'doblaje' },
      { ...PUERTA, maxCaracteres: 47 },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivos.join('\n')).toMatch(/la variante de la atribuida/u);
    expect(await instantanea(directorio)).toEqual(antes);
  });
});

describe('Historia 35.6 — `obra`, `autor` y `personaje` añaden', () => {
  it('añadir un Personaje a la Cita de un Autor vivo: sigue atribuida, mismo slug y fichero', async () => {
    const directorio = await enDisco();
    const antes = await instantanea(directorio);
    const r = await cambiar(directorio, { tipo: 'personaje', slug: A3, personaje: 'woody' });
    expect(r.ok, r.ok ? '' : r.motivos.join('\n')).toBe(true);
    await soloCambio(directorio, antes, [FICHEROS.A3]);
    const datos = await datosDe(directorio, FICHEROS.A3);
    expect(datos).toEqual({ ...separarFrontmatter(antes[FICHEROS.A3])!, personaje: 'woody' });
    expect(datos.clase).toBe('atribuida');
  });

  it('añadir un Autor de dominio público a la Cita de un Personaje: sigue atribuida, mismo slug y fichero', async () => {
    const directorio = await enDisco();
    const antes = await instantanea(directorio);
    const r = await cambiar(directorio, { tipo: 'autor', slug: A4, autor: 'seneca' });
    expect(r.ok, r.ok ? '' : r.motivos.join('\n')).toBe(true);
    await soloCambio(directorio, antes, [FICHEROS.A4]);
    const datos = await datosDe(directorio, FICHEROS.A4);
    expect(datos.autor).toBe('seneca');
    expect(datos.personaje).toBe('buzz');
    expect(datos.clase).toBe('atribuida');
    expect(datos.slug).toBe(A4);
  });

  it('añadir la Obra crea su ficha, del Personaje, en el mismo gesto', async () => {
    const directorio = await enDisco();
    const antes = await instantanea(directorio);
    const r = await cambiar(directorio, { tipo: 'obra', slug: A4, obra: 'Al rescate' });
    expect(r.ok, r.ok ? '' : r.motivos.join('\n')).toBe(true);
    await soloCambio(directorio, antes, [FICHEROS.A4], ['obras/buzz--al-rescate.yml']);
    expect((await datosDe(directorio, FICHEROS.A4)).procedencia).toEqual({ obra: 'Al rescate', año: 1995 });
    expect(await readFile(join(directorio, 'obras/buzz--al-rescate.yml'), 'utf8')).toMatch(/personaje: "buzz"/u);
  });

  it('la Obra se escribe sin los espacios de los bordes', async () => {
    const directorio = await enDisco();
    const r = await cambiar(directorio, { tipo: 'obra', slug: A4, obra: '  Al rescate  ' });
    expect(r.ok, r.ok ? '' : r.motivos.join('\n')).toBe(true);
    expect((await datosDe(directorio, FICHEROS.A4)).procedencia).toEqual({ obra: 'Al rescate', año: 1995 });
  });

  it('si la ficha no se puede escribir, la Cita vuelve byte a byte a como estaba', async () => {
    const directorio = await enDisco();
    const antes = await instantanea(directorio);
    await chmod(join(directorio, 'obras'), 0o555);
    try {
      const r = await cambiar(directorio, { tipo: 'obra', slug: A4, obra: 'Al rescate' });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.motivos.join('\n')).toMatch(/ha vuelto a su contenido original/u);
    } finally {
      await chmod(join(directorio, 'obras'), 0o755);
    }
    expect(await instantanea(directorio)).toEqual(antes);
  });

  it('un cambio con el que la Cita sería de otra clase se niega sin escribir', async () => {
    // El Autor de la Cita, hoy de dominio público en el Corpus: la clase que correspondería es otra.
    const directorio = await enDisco({ ...CORPUS, 'autores/vivo.yml': AUTOR_VALIDO });
    const antes = await instantanea(directorio);
    const r = await cambiar(directorio, { tipo: 'texto', slug: A3, texto: 'El tiempo cabe en una taza si se bebe despacito.' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivos.join('\n')).toMatch(/sería de la clase siempre, y la clase no cambia/u);
    expect(await instantanea(directorio)).toEqual(antes);
  });

  it('un Autor declarado que no está en el Corpus no deja juzgar la clase: se niega', async () => {
    const corpus: CorpusDePrueba = { ...CORPUS };
    delete corpus['autores/vivo.yml'];
    const directorio = await enDisco(corpus);
    const antes = await instantanea(directorio);
    const r = await cambiar(directorio, { tipo: 'texto', slug: A3, texto: 'El tiempo cabe en una taza si se bebe despacito.' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivos.join('\n')).toMatch(/El Autor «vivo» que declara/u);
    expect(await instantanea(directorio)).toEqual(antes);
  });

  it('añadir la Obra de una ficha que ya existe no crea otra', async () => {
    const directorio = await enDisco();
    const antes = await instantanea(directorio);
    const r = await cambiar(directorio, { tipo: 'obra', slug: A4, obra: 'La patrulla' });
    expect(r.ok, r.ok ? '' : r.motivos.join('\n')).toBe(true);
    await soloCambio(directorio, antes, [FICHEROS.A4]);
  });

  it('un Autor cuya ficha reclama la misma forma mudaría la Obra: se niega', async () => {
    await seNiega({ tipo: 'autor', slug: A2, autor: 'seneca' }, /dejaría de ser «buzz--la-patrulla» y pasaría a «seneca--la-patrulla»/u);
  });

  it.each<[string, CambioDeAtribuida, RegExp]>([
    ['la Obra ya declarada', { tipo: 'obra', slug: A2, obra: 'Otra' }, /ya declara la Obra «La patrulla»/u],
    ['el Autor ya declarado', { tipo: 'autor', slug: A3, autor: 'seneca' }, /ya declara el Autor «vivo»/u],
    ['el Personaje ya declarado', { tipo: 'personaje', slug: A1, personaje: 'woody' }, /ya declara el Personaje «buzz»/u],
  ])('%s: solo añade, se niega', async (_, cambio, motivo) => {
    await seNiega(cambio, motivo);
  });
});

describe('Historia 35.6 — lo que la orden no cambia', () => {
  it.each<[string, CambioDeAtribuida, RegExp]>([
    ['una Cita de siempre', { tipo: 'texto', slug: S1, texto: 'No es que tengamos poco tiempo, es que perdemos mucho!' }, /la clase no cambia/u],
    ['una Cita de siempre, otra suborden', { tipo: 'personaje', slug: S1, personaje: 'buzz' }, /la clase no cambia/u],
    ['un slug sin publicar', { tipo: 'texto', slug: 'buzz-no-existe', texto: 'x' }, /No hay ninguna Cita publicada con el slug «buzz-no-existe»/u],
    ['una candidata en revisión', { tipo: 'texto', slug: CANDIDATA, texto: TEXTO_CANDIDATA }, /no está publicada: está en/u],
    ['un Autor que no existe', { tipo: 'autor', slug: A4, autor: 'nadie' }, /El Autor «nadie» no existe/u],
    ['un Personaje que no existe', { tipo: 'personaje', slug: A3, personaje: 'nadie' }, /El Personaje «nadie» no existe/u],
  ])('%s: se niega sin escribir', async (_, cambio, motivo) => {
    await seNiega(cambio, motivo);
  });

  it('con la puerta del árbol, cerrada, toda invocación sale negada sin escribir', async () => {
    const directorio = await enDisco();
    const antes = await instantanea(directorio);
    const r = await cambiarAtribuida(rutasDelCorpus(directorio), { tipo: 'texto', slug: A1, texto: TEXTO_A1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivos.join('\n')).toMatch(/la puerta de la atribuida está cerrada/u);
    expect(await instantanea(directorio)).toEqual(antes);
  });
});

describe('Historia 35.6 — la orden por proceso', () => {
  async function correr(directorio: string, argumentos: string[]) {
    try {
      const { stdout, stderr } = await ejecutar('npx', ['tsx', join(RAIZ, 'tools/atribuida.ts'), ...argumentos, '--corpus', directorio], {
        cwd: RAIZ,
      });
      return { codigo: 0, salida: stdout, error: stderr };
    } catch (e) {
      const fallo = e as { code?: number; stdout?: string; stderr?: string };
      return { codigo: fallo.code ?? 1, salida: fallo.stdout ?? '', error: fallo.stderr ?? '' };
    }
  }

  it.each<[string, string[]]>([
    ['sin suborden', []],
    ['una suborden desconocida', ['cambiar', A1, 'x']],
    ['argumentos de menos', ['texto', A1]],
    ['argumentos de más', ['texto', A1, 'x', 'y']],
    ['una bandera desconocida', ['texto', A1, 'x', '--fuerza']],
    ['una bandera repetida', ['variante', A1, 'x', '--region', 'espana', '--region', 'espana', '--origen', 'doblaje']],
    ['una bandera vacía', ['variante', A1, 'x', '--region', '', '--origen', 'doblaje']],
    ['variante sin --region', ['variante', A1, 'x', '--origen', 'doblaje']],
    ['variante sin --origen', ['variante', A1, 'x', '--region', 'espana']],
    ['una bandera con valor dada sin él', ['variante', A1, 'x', '--origen', 'doblaje', '--region']],
  ])('%s sale con 2 sin escribir', async (_, argumentos) => {
    const directorio = await enDisco();
    const antes = await instantanea(directorio);
    const r = await correr(directorio, argumentos);
    expect(r.codigo, r.error).toBe(2);
    expect(await instantanea(directorio)).toEqual(antes);
  });

  it('una invocación válida, con la puerta cerrada del árbol, sale con 1 sin escribir', async () => {
    const directorio = await enDisco();
    const antes = await instantanea(directorio);
    const r = await correr(directorio, ['texto', A1, 'Hasta el infinito y más allá, ¡guardián del cosmos!']);
    expect(r.codigo, r.error).toBe(1);
    expect(r.error).toMatch(/la puerta de la atribuida está cerrada/u);
    expect(await instantanea(directorio)).toEqual(antes);
  });
});
