import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  type CorpusDePrueba,
} from './ayuda/construir.js';
import { componerBiografia, componerDocumento } from '../../tools/lib/documento.ts';
import { CENSO_DE_PARTIDA, FICHERO_DEL_CENSO, colapsarEspacios } from '../../tools/lib/cotejo.ts';
import { rutasDelCorpus, separarFrontmatter } from '../../tools/lib/corpus.ts';
import { DE_EPICTETO, EN_LA_IRA, instantaneaDe, sembrarCorpusAlLimite } from './ayuda/al-limite.ts';

const ejecutar = promisify(execFile);

/**
 * Historia 11.6 — la orden, y la razón de que documentar y descensar sean un solo gesto.
 *
 * Lo puro está en `documentacion.test.ts`. Aquí se mide lo que solo se ve ejecutando la
 * orden de verdad —que lea el corpus que se le indica, y que los códigos de salida
 * distingan **2 la forma de la invocación de 1 lo que la invocación dice**— y lo que solo
 * se ve construyendo: que lo que la orden deja **construye**, y que el estado intermedio
 * que la orden hace imposible —Cita documentada y todavía censada— rompería la
 * construcción si alguien lo compusiera a mano.
 *
 * Nada de esto toca `corpus/`: todo ocurre en corpus temporales.
 */

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.splice(0).map(limpiar));
});

/*
 * El slug y el texto son los de una de las 38 anteriores a la v3, tal cual.
 *
 * No es decorativo: el censo de partida de `tools/lib/cotejo.ts` ata cada exención a la
 * huella del texto, y el build usa ese conjunto de verdad. Una Cita inventada no se puede
 * censar, así que no serviría para medir lo que estas pruebas miden.
 */
const SLUG = 'seneca-no-es-que-tengamos-poco-tiempo-es';
const TEXTO = 'No es que tengamos poco tiempo, es que perdemos mucho.';
const FICHERO = 'citas/seneca--no-es-que-tengamos-poco-tiempo-es.md';
const OBRA = 'Sobre la brevedad de la vida';
const AÑO = 49;
const DOCUMENTO = 'fuentes/wikisource-es--sobre-la-brevedad-de-la-vida.txt';

/**
 * Otra de las 38, que se queda en el censo: es la que prueba que documentar una borra su
 * línea y **solo** la suya. Va con su texto exacto porque el censo ata cada exención a la
 * huella de su texto, y uno inventado no se eximiría.
 */
const OTRA_CENSADA = 'seneca-la-vida-si-sabes-usarla-es-larga';
const OTRO_TEXTO = 'La vida, si sabes usarla, es larga.';

/** El censo, con su cabecera de comentarios: la orden tiene que dejarla intacta. */
const CENSO = `# Pendientes de cotejo — Historia 11.2
#
# Las Citas de esta lista se publican sin que el build compruebe su texto.
#
# Es un CENSO CERRADO: no admite altas, y solo mengua.

citas:
  - ${SLUG}
  - ${OTRA_CENSADA}
`;

/** Un documento como el que deja `tools/recuperar.ts`. */
const CUERPO = [
  'No todos padecemos la misma escasez.',
  '',
  'No es que tengamos poco tiempo, es que perdemos mucho.',
  '',
  'La paciencia todo lo alcanza, decía otra.',
].join('\n');

/**
 * Cómo declara la Fuente a quien firma. Coincide con el `nombre` de `AUTOR_VALIDO`, que
 * es la ficha de `autores/seneca.yml` de este corpus: es el lado del Corpus en la puerta
 * del Autor, y sin la línea de autor en la declaración no habría nada que cotejar —cosa
 * que ningún documento real de Wikisource hace—.
 */
const AUTOR_DECLARADO = 'Séneca';

function documentoDe(autor: string | null = AUTOR_DECLARADO): string {
  return componerDocumento(
    {
      fuente: 'wikisource-es',
      obra: OBRA,
      año: AÑO,
      url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
      recuperado: '2026-08-21',
    },
    [
      OBRA,
      `Año de publicación: ${AÑO}`,
      ...(autor === null ? [] : [`|autor=${autor}`]),
    ].join('\n'),
    CUERPO,
  );
}

const documento = documentoDe();

/** La Cita tal y como está publicada desde la v1: con Procedencia tecleada y sin Fuente. */
const CITA_CENSADA = citaValida({
  slug: SLUG,
  texto: TEXTO,
  procedencia: { obra: 'De brevitate vitae' },
  fuente: undefined,
});

const CORPUS: CorpusDePrueba = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  [FICHERO]: CITA_CENSADA,
  'citas/seneca--la-vida-si-sabes-usarla-es-larga.md': citaValida({
    slug: OTRA_CENSADA,
    texto: OTRO_TEXTO,
    procedencia: { obra: 'Sobre la brevedad de la vida' },
    fuente: undefined,
  }),
  [DOCUMENTO]: documento,
  [FICHERO_DEL_CENSO]: CENSO,
};

async function enDisco(corpus: CorpusDePrueba): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-documentar-cli-'));
  temporales.push(raiz);
  const directorio = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', '_revision', 'fuentes']) {
    await mkdir(join(directorio, dir), { recursive: true });
  }
  for (const [ruta, contenido] of Object.entries(corpus)) {
    const destino = join(directorio, ruta);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, contenido, 'utf8');
  }
  return directorio;
}

async function correr(corpus: string, argumentos: string[]) {
  try {
    const { stdout, stderr } = await ejecutar(
      'npx',
      ['tsx', join(RAIZ, 'tools/documentar.ts'), ...argumentos, '--corpus', corpus],
      { cwd: RAIZ },
    );
    return { codigo: 0, salida: stdout, error: stderr };
  } catch (e) {
    const fallo = e as { code?: number; stdout?: string; stderr?: string };
    return { codigo: fallo.code ?? 1, salida: fallo.stdout ?? '', error: fallo.stderr ?? '' };
  }
}

/** El corpus de un directorio temporal, tal cual, para dárselo al build. */
async function leerCorpus(directorio: string): Promise<CorpusDePrueba> {
  const entradas = await readdir(directorio, { recursive: true, withFileTypes: true });
  const corpus: CorpusDePrueba = {};
  for (const entrada of entradas) {
    if (!entrada.isFile()) continue;
    const ruta = join(entrada.parentPath, entrada.name);
    corpus[ruta.slice(directorio.length + 1)] = await readFile(ruta, 'utf8');
  }
  return corpus;
}

async function construir(corpus: CorpusDePrueba) {
  const resultado = await construirConCorpus(corpus);
  aLimpiar.push(resultado.proyecto);
  return resultado;
}

const rutaDelDocumento = (corpus: string) => join(corpus, DOCUMENTO);

describe('Historia 11.6 — la orden', () => {
  it('documenta, saca del censo y deja la cabecera del censo intacta', async () => {
    const corpus = await enDisco(CORPUS);

    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(hecho.salida).toContain('queda documentada');
    expect(hecho.salida).toContain('quedan 1 pendientes');

    const cita = await readFile(join(corpus, FICHERO), 'utf8');
    expect(cita).toContain('id: "wikisource-es"');
    expect(cita).toContain(`obra: "${OBRA}"`);
    expect(cita).toContain(`año: ${AÑO}`);

    const censo = await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8');
    expect(censo).not.toContain(SLUG);
    // Se borra una línea, no se vuelca el fichero: los comentarios son la única
    // explicación escrita de por qué existe un censo cerrado.
    expect(censo).toContain('# Pendientes de cotejo — Historia 11.2');
    expect(censo).toContain('# Es un CENSO CERRADO: no admite altas, y solo mengua.');
    expect(censo).toContain(`  - ${OTRA_CENSADA}`);
    // Y el diff que produce es de una sola línea.
    expect(censo).toBe(CENSO.replace(`  - ${SLUG}\n`, ''));
  });

  it('dice el cambio de obra por el error estándar, antes de escribir', async () => {
    const corpus = await enDisco(CORPUS);
    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(hecho.error).toContain('La obra cambia');
    expect(hecho.error).toContain('De brevitate vitae');
  });

  it('rechaza con código 1 lo que la invocación dice', async () => {
    const corpus = await enDisco({
      ...CORPUS,
      [FICHERO]: citaValida({
        slug: SLUG,
        texto: TEXTO,
        procedencia: { obra: 'De brevitate vitae' },
        fuente: undefined,
      }),
      [DOCUMENTO]: componerDocumento(
        {
          fuente: 'wikisource-es',
          obra: OBRA,
          año: AÑO,
          url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
          recuperado: '2026-08-21',
        },
        [OBRA, `Año de publicación: ${AÑO}`].join('\n'),
        'Un cuerpo que no dice nada de lo que la Cita dice.',
      ),
    });

    const noAparece = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);
    expect(noAparece.codigo).toBe(1);
    expect(noAparece.error).toContain('no aparece en');

    const conErrata = await correr(corpus, ['seneca-una-que-no-existe', rutaDelDocumento(corpus)]);
    expect(conErrata.codigo).toBe(1);
    expect(conErrata.error).toContain('seneca-una-que-no-existe');

    // Nada de esto ha tocado el corpus.
    expect(await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8')).toBe(CENSO);
  });

  it('rechaza con código 2 lo que está mal invocado', async () => {
    const corpus = await enDisco(CORPUS);

    // Sin motivo no es una retirada: es una desaparición.
    const sinMotivo = await correr(corpus, ['--retirar', SLUG]);
    expect(sinMotivo.codigo).toBe(2);
    expect(sinMotivo.error).toContain('es una desaparición');

    // Una bandera con errata nunca es «lo mismo pero sin ella».
    const conErrata = await correr(corpus, [SLUG, rutaDelDocumento(corpus), '--txto', 'Otra cosa.']);
    expect(conErrata.codigo).toBe(2);
    expect(conErrata.error).toContain('«--txto» no es una opción de esta orden.');

    // Y una orden sin argumentos escribe el uso.
    const desnuda = await correr(corpus, []);
    expect(desnuda.codigo).toBe(2);
    expect(desnuda.error).toContain('Uso:');

    expect(await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8')).toBe(CENSO);
    expect(await readFile(join(corpus, FICHERO), 'utf8')).toBe(CITA_CENSADA);
  });

  it('retira con su motivo: mueve a revisión y sale del censo', async () => {
    const corpus = await enDisco(CORPUS);

    const retirada = await correr(corpus, [
      '--retirar',
      SLUG,
      'No aparece en la edición: es una paráfrasis que circula por internet.',
    ]);
    expect(retirada.codigo, retirada.error).toBe(0);
    expect(retirada.salida).toContain('paráfrasis que circula por internet');

    expect(await readdir(join(corpus, 'citas'))).toEqual([
      'seneca--la-vida-si-sabes-usarla-es-larga.md',
    ]);
    expect(await readdir(join(corpus, '_revision'))).toEqual([
      'seneca--no-es-que-tengamos-poco-tiempo-es.md',
    ]);
    expect(await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8')).not.toContain(SLUG);
  });
});

describe('Historia 11.6 — documentar y salir del censo van juntos', () => {
  it('lo que la orden deja construye, y reponer la línea del censo rompe el build', async () => {
    const corpus = await enDisco(CORPUS);
    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);
    expect(hecho.codigo, hecho.error).toBe(0);

    // Lo que la orden dejó, tal cual, construye: la Cita se coteja de verdad contra su
    // documento y el censo ya no la ampara.
    const documentado = await leerCorpus(corpus);
    const verde = await construir(documentado);
    expect(verde.codigo, verde.salida).toBe(0);
    expect(verde.salida).toContain('1 Cita cotejada');

    /*
     * Y el estado intermedio que la orden hace imposible —Cita documentada y todavía
     * censada— rompe la construcción. Es lo que fija que las dos mitades del gesto no se
     * puedan separar: una orden que dejara solo la primera dejaría el corpus en un estado
     * que no puede existir, y quien la usara se enteraría en el build siguiente.
     */
    const aMedias = await construir({ ...documentado, [FICHERO_DEL_CENSO]: CENSO });
    expect(aMedias.codigo).not.toBe(0);
    expect(aMedias.salida).toMatch(/Quítela del censo/);
  });

  it('el slug de la prueba es de verdad una de las 38, o esto no mide nada', () => {
    expect(CENSO_DE_PARTIDA[SLUG]).toBeDefined();
  });
});

/**
 * FR-23, Historia 11.6 — por la orden: el documento tiene que ser del Autor de la Cita.
 *
 * Lo puro está en `documentacion.test.ts`. Aquí se mide lo que solo se ve ejecutando: el
 * código de salida —**1**, lo que la invocación dice, no 2, que es su forma— y que el
 * censo del corpus real en disco queda byte a byte como estaba.
 */
describe('FR-23 — documentar no ata una Cita a un documento firmado por otro', () => {
  it('el mismo Autor documenta y el parte dice que se cotejó', async () => {
    const corpus = await enDisco(CORPUS);

    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);

    expect(hecho.codigo, hecho.error).toBe(0);
    expect(hecho.salida).toMatch(/Autor:\s+cotejado/);
    expect(hecho.salida).toContain(AUTOR_DECLARADO);
  });

  it('otro Autor sale con código 1, y el censo queda byte a byte como estaba', async () => {
    const corpus = await enDisco({ ...CORPUS, [DOCUMENTO]: documentoDe('Manuel González Prada') });
    const censoAntes = await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8');
    const citaAntes = await readFile(join(corpus, FICHERO), 'utf8');

    const rechazo = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);

    // 1, no 2: la invocación está bien escrita y lo que dice es lo que no cuadra.
    expect(rechazo.codigo).toBe(1);
    expect(rechazo.error).toContain('Manuel González Prada');
    expect(rechazo.error).toContain('Séneca');

    /*
     * Documentar saca la Cita del censo. Sin la puerta, esta Cita quedaba mal atribuida
     * **y** registrada como cotejada, que borra la única señal de que nadie la verificó.
     */
    expect(await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8')).toBe(censoAntes);
    expect(await readFile(join(corpus, FICHERO), 'utf8')).toBe(citaAntes);
    expect(censoAntes).toContain(SLUG);
  });

  it('un autor ilegible sale con código 1 y tampoco toca el censo', async () => {
    const corpus = await enDisco({
      ...CORPUS,
      [DOCUMENTO]: documentoDe('Séneca<ref>el Joven</ref>'),
    });
    const censoAntes = await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8');

    const rechazo = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);

    expect(rechazo.codigo).toBe(1);
    expect(rechazo.error).toMatch(/no se sabe interpretar/);
    expect(await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8')).toBe(censoAntes);
  });

  it('un documento sin línea de autor documenta igual, y el parte lo dice', async () => {
    // Un metadato que falta no es un fallo, igual que el año: la puerta no actúa y se ve.
    const corpus = await enDisco({ ...CORPUS, [DOCUMENTO]: documentoDe(null) });

    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);

    expect(hecho.codigo, hecho.error).toBe(0);
    expect(hecho.salida).toMatch(/Autor:\s+sin cotejar/);
  });

  it('con dos Autores declarados basta con que la Cita concuerde con uno', async () => {
    const corpus = await enDisco({
      ...CORPUS,
      [DOCUMENTO]: documentoDe('[[Autor:Séneca|Séneca]] y [[Autor:Lucilio|Lucilio]]'),
    });

    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);

    expect(hecho.codigo, hecho.error).toBe(0);
    expect(hecho.salida).toContain('Lucilio');
  });

  it('y lo que la orden deja tras cotejar el Autor sigue construyendo', async () => {
    // La puerta nueva no puede dejar un corpus que el build rechace: es la comprobación
    // que ata esta historia con la 11.2, igual que la de más arriba.
    const corpus = await enDisco(CORPUS);
    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);
    expect(hecho.codigo, hecho.error).toBe(0);

    const verde = await construir(await leerCorpus(corpus));
    expect(verde.codigo, verde.salida).toBe(0);
    expect(verde.salida).toContain('1 Cita cotejada');
  });
});

describe('Historia 19.1 — --restituir-traduccion', () => {
  it('sin nada que restituir sale con 0 y no toca el corpus', async () => {
    const corpus = await enDisco(CORPUS);
    const hecho = await correr(corpus, ['--restituir-traduccion']);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(hecho.salida).toContain('Traducción restituida en 0 Citas publicadas.');
    expect(await readFile(join(corpus, FICHERO), 'utf8')).toBe(CITA_CENSADA);
  });

  it('con argumentos de más, o junto a --retirar, sale con código 2', async () => {
    const corpus = await enDisco(CORPUS);
    const conSobra = await correr(corpus, ['--restituir-traduccion', SLUG]);
    expect(conSobra.codigo).toBe(2);
    const conRetirar = await correr(corpus, ['--restituir-traduccion', '--retirar', SLUG, 'motivo']);
    expect(conRetirar.codigo).toBe(2);
    expect(await readFile(join(corpus, FICHERO), 'utf8')).toBe(CITA_CENSADA);
  });
});

describe('Historia 17.1 — una Cita no se documenta con una biografía, aunque esté en fuentes/', () => {
  it.each([
    ['wikipedia-es', 'https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=123'],
    ['wikisource-es', 'https://es.wikisource.org/wiki/S%C3%A9neca'],
  ])('con fuente: %s sale con 1, dice por qué y no toca la Cita ni el censo', async (fuente, url) => {
    const nombre = `fuentes/${fuente}--seneca--r123.txt`;
    const corpus = await enDisco({
      ...CORPUS,
      [nombre]: componerBiografia(
        {
          fuente,
          titulo: 'Séneca',
          revision: 123,
          fechaDeRevision: '2024-05-01',
          licencia: 'CC BY-SA 4.0',
          url,
          recuperado: '2026-10-10',
        },
        'Séneca',
        CUERPO,
      ),
    });
    const antes = await leerCorpus(corpus);

    const resultado = await correr(corpus, [SLUG, join(corpus, nombre)]);
    expect(resultado.codigo).toBe(1);
    expect(resultado.error).toMatch(/documento de biografía \(clase: biografia\)/);
    expect(await leerCorpus(corpus)).toEqual(antes);
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
  });
});

/** Historia 26.8 — un Corpus al límite en un directorio temporal propio (`ayuda/al-limite.ts`). */
const alLimite: string[] = [];
afterEach(async () => {
  await Promise.all(alLimite.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});
async function corpusAlLimite() {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-al-limite-'));
  alLimite.push(raiz);
  const rutas = rutasDelCorpus(join(raiz, 'corpus'));
  await sembrarCorpusAlLimite(rutas);
  return rutas;
}

describe('Historia 26.8 — documentar --retirar no deja una Cita fuera de alcance', () => {
  it('sale con 1, nombra la Cita y su Tema con el recuento, y no mueve nada', async () => {
    const rutas = await corpusAlLimite();
    const antes = await instantaneaDe(rutas.raiz);

    const resultado = await correr(rutas.raiz, ['--retirar', DE_EPICTETO[1]!, 'No aparece en la edición.']);

    expect(resultado.codigo).toBe(1);
    expect(resultado.error).toContain(`/cita/${EN_LA_IRA}/ — su Tema «La ira» (la-ira) tiene 14 Citas`);
    expect(await instantaneaDe(rutas.raiz)).toEqual(antes);
  });

  it('sin efecto sobre el alcance, retira como siempre', async () => {
    const rutas = await corpusAlLimite();
    const resultado = await correr(rutas.raiz, ['--retirar', 'seneca-a-001', 'No aparece en la edición.']);
    expect(resultado.codigo, resultado.error).toBe(0);
  });
});

describe('Historia 29.1 — documentar escribe el verso del documento, no el tecleado (AD-29)', () => {
  const EN_VERSO = 'No es que tengamos poco tiempo,\nes que perdemos mucho.';
  const documentoDeVerso = componerDocumento(
    {
      fuente: 'wikisource-es',
      obra: OBRA,
      año: AÑO,
      lineas: 'verso',
      url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
      recuperado: '2026-08-21',
    },
    [OBRA, `Año de publicación: ${AÑO}`, `|autor=${AUTOR_DECLARADO}`].join('\n'),
    CUERPO.replace(TEXTO, EN_VERSO),
  );
  const textoEscrito = async (corpus: string) =>
    separarFrontmatter(await readFile(join(corpus, FICHERO), 'utf8'))?.texto;

  it('de un documento de verso, la Cita toma sus saltos; el slug no cambia', async () => {
    const corpus = await enDisco({ ...CORPUS, [DOCUMENTO]: documentoDeVerso });
    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(await textoEscrito(corpus)).toBe(EN_VERSO);
    expect(`${hecho.salida}${hecho.error}`).toMatch(/toma 1 salto de verso/);
    expect(separarFrontmatter(await readFile(join(corpus, FICHERO), 'utf8'))?.slug).toBe(SLUG);
  });

  it('con --texto, los saltos salen del documento y el tecleado sin respaldo se descarta', async () => {
    const corpus = await enDisco({ ...CORPUS, [DOCUMENTO]: documentoDeVerso });
    const hecho = await correr(corpus, [
      SLUG,
      rutaDelDocumento(corpus),
      '--texto',
      'No es que tengamos\npoco tiempo, es que perdemos mucho.',
    ]);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(await textoEscrito(corpus)).toBe(EN_VERSO);
    expect(`${hecho.salida}${hecho.error}`).toMatch(/salto tecleado no sobrevive/);
  });

  it('de un documento de prosa, en una línea, también con un \\n tecleado', async () => {
    const corpus = await enDisco(CORPUS);
    const hecho = await correr(corpus, [
      SLUG,
      rutaDelDocumento(corpus),
      '--texto',
      'No es que tengamos poco tiempo,\nes que perdemos mucho.',
    ]);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(await textoEscrito(corpus)).toBe(TEXTO);
    expect(`${hecho.salida}${hecho.error}`).toMatch(/salto tecleado no sobrevive/);
  });

  // Revisión 2: el parte dice que la Cita publicada pierde un salto que su documento no respalda.
  it('una Cita publicada con un salto, documentada contra prosa, lo pierde y el parte lo dice', async () => {
    const conSalto = citaValida({
      slug: SLUG,
      texto: EN_VERSO,
      procedencia: { obra: 'De brevitate vitae' },
      fuente: undefined,
    });
    const corpus = await enDisco({ ...CORPUS, [FICHERO]: conSalto });
    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(await textoEscrito(corpus)).toBe(TEXTO);
    expect(`${hecho.salida}${hecho.error}`).toMatch(/pierde 1 salto de verso que su documento no respalda/);
  });

  // Revisión 2: sin poder leer corpus/fuentes/ no se sabe de qué documento salen los saltos.
  it('si corpus/fuentes/ no se deja leer, sale con 1 y no escribe ni la Cita ni el censo', async () => {
    const corpus = await enDisco(CORPUS);
    await mkdir(join(corpus, 'fuentes', 'wikisource-es--ilegible.txt'));
    const antes = instantaneaDeDocumentar(corpus);
    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);
    expect(hecho.codigo).toBe(1);
    expect(`${hecho.salida}${hecho.error}`).toMatch(/corpus\/fuentes\/ no se deja leer/);
    expect(await instantaneaDeDocumentar(corpus)).toEqual(await antes);
  });
});

async function instantaneaDeDocumentar(corpus: string) {
  return {
    cita: await readFile(join(corpus, FICHERO), 'utf8'),
    censo: await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8'),
  };
}

describe('Historia 29.2 — --restituir-saltos', () => {
  const FIXTURES = join(RAIZ, 'tests/unit/ayuda/lineas');
  const MARTI_DOC = 'fuentes/wikisource-es--versos-sencillos--versos-sencillos-i.txt';
  const OTRA_DE_MARTI = 'fuentes/wikisource-es--versos-sencillos--otra.txt';
  const AVARIENTO_DOC = 'fuentes/wikisource-es--a-un-avariento.txt';
  const MARTI = 'citas/jose-marti--yo-vengo-de-todas-partes.md';
  const AVARIENTO = 'citas/francisco-de-quevedo--un-hombre-rico-avariento.md';
  const PROSA = 'citas/seneca--no-es-que-tengamos-poco-tiempo-es-prosa.md';
  const TRAMO = 'citas/jose-marti--yo-vengo-de-todas-partes-solo.md';
  const CONFLICTO = 'citas/jose-marti--yo-se-los-nombres.md';
  const RARO = 'citas/jose-marti--y-de-mortales-enganos.md';
  const AJENA = '_revision/jose-marti--esto-no-esta-en-el-poema.md';
  /** Una candidata de antes de la 29.1, en una línea, que su documento de verso restituye. */
  const CANDIDATA = '_revision/jose-marti--yo-vengo-candidata.md';
  const ROOT = process.getuid?.() === 0;

  const EN_UNA_LINEA =
    'Yo vengo de todas partes, Y hacia todas partes voy: Arte soy entre las artes, En los montes, monte soy.';
  const EN_VERSO =
    'Yo vengo de todas partes,\nY hacia todas partes voy:\nArte soy entre las artes,\nEn los montes, monte soy.';

  const deMarti = (slug: string, texto: string, obra = 'Versos sencillos') =>
    citaValida({
      slug,
      texto,
      autor: 'jose-marti',
      procedencia: { obra },
      fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Versos_sencillos/I' },
    });

  async function corpusDeVerso(): Promise<CorpusDePrueba> {
    return {
      ...CORPUS,
      [MARTI_DOC]: await readFile(join(FIXTURES, 'wikisource-es--versos-sencillos--versos-sencillos-i.txt'), 'utf8'),
      [AVARIENTO_DOC]: await readFile(join(FIXTURES, 'wikisource-es--a-un-avariento.txt'), 'utf8'),
      [OTRA_DE_MARTI]: componerDocumento(
        {
          fuente: 'wikisource-es',
          obra: 'Versos sencillos',
          lineas: 'verso',
          url: 'https://es.wikisource.org/wiki/Versos_sencillos/Otra',
          recuperado: '2026-11-08',
        },
        'Versos sencillos/Otra',
        'Yo sé los nombres extraños De las yerbas y las flores,\nUno\nDos\nTres\nCuatro',
      ),
      [MARTI]: deMarti('jose-marti-yo-vengo-de-todas-partes', EN_UNA_LINEA),
      [AVARIENTO]: citaValida({
        slug: 'francisco-de-quevedo-un-hombre-rico-avariento',
        texto: 'Un hombre rico avariento. Murió con cien mil dolores',
        autor: 'francisco-de-quevedo',
        procedencia: { obra: 'A un avariento' },
        fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/A_un_avariento' },
      }),
      // Documento en prosa: el de Séneca, que no es de verso.
      [PROSA]: citaValida({
        slug: 'seneca-no-es-que-tengamos-poco-tiempo-es-prosa',
        texto: TEXTO,
        procedencia: { obra: OBRA },
        fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida' },
      }),
      [TRAMO]: deMarti('jose-marti-yo-vengo-solo', 'Yo vengo de todas partes,'),
      [CONFLICTO]: deMarti('jose-marti-yo-se-los-nombres', 'Yo sé los nombres extraños De las yerbas y las flores,'),
      // Un fichero escrito a mano, con el texto entre comillas simples: no es la línea de `aYaml`.
      [RARO]:
        "---\ntexto: 'Y de mortales engaños, Y de sublimes dolores.'\nautor: jose-marti\n" +
        'slug: jose-marti-y-de-mortales-enganos\nprocedencia:\n  obra: Versos sencillos\n' +
        'fuente:\n  id: wikisource-es\n  url: https://es.wikisource.org/wiki/Versos_sencillos/I\n---\n',
      [AJENA]: deMarti('jose-marti-esto-no-esta-en-el-poema', 'Esto no está en el poema.'),
      [CANDIDATA]: deMarti('jose-marti-yo-vengo-candidata', EN_UNA_LINEA),
    };
  }

  async function instantanea(corpus: string) {
    const todo = await leerCorpus(corpus);
    return todo;
  }

  it('en seco: el parte entero y nada escrito', async () => {
    const corpus = await enDisco(await corpusDeVerso());
    const antes = await instantanea(corpus);
    const hecho = await correr(corpus, ['--restituir-saltos', '--seco']);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(await instantanea(corpus)).toEqual(antes);
    const parte = hecho.salida;
    expect(parte).toMatch(/Ganarían saltos: 2, de 2 documentos \(verso: 1, verso-espaciado: 1\)/);
    expect(parte).toContain('jose-marti-yo-vengo-de-todas-partes — corpus/fuentes/wikisource-es--versos-sencillos--versos-sencillos-i.txt, 4 versos');
    expect(parte).toMatch(/sin documento: 2/); // las dos censadas
    expect(parte).toMatch(/documento en prosa: 1 \(indeterminada: 1\)/);
    expect(parte).toMatch(/documento sin saltos en su tramo: 1/);
    expect(parte).toMatch(/no se localiza en su documento: 1/); // la candidata ajena
    // Las candidatas, en su bloque: la que su documento de verso restituye, contada aparte.
    const candidatas = parte.slice(parte.indexOf('Candidatas de revisión:'));
    expect(candidatas).toMatch(/^Candidatas de revisión:\n {2}Ganarían saltos: 1, de 1 documento \(verso: 1\)\./u);
    expect(parte).toContain('jose-marti-yo-se-los-nombres: sus documentos de verso le dan saltos distintos');
    expect(parte).toContain('corpus/fuentes/wikisource-es--versos-sencillos--otra.txt');
    expect(parte).toContain('jose-marti-y-de-mortales-enganos');
    expect(parte).toMatch(/no tiene una sola línea «texto:»/);
    // Solo las publicadas fechan: la candidata no mueve ninguna superficie.
    expect(parte).toContain('Cambian de fecha 2 Páginas de Cita y 1 listado (tema: 1).');
    expect(parte).toContain('npx tsx tools/avisar.ts --ensayo --desde <A> --hasta <B>');
    expect(parte).toContain('No se ha escrito nada.');
  });

  it('restituye solo la línea texto:, colapsa a lo mismo, y la segunda pasada no escribe nada', async () => {
    const corpus = await enDisco(await corpusDeVerso());
    const antes = await instantanea(corpus);
    const hecho = await correr(corpus, ['--restituir-saltos']);
    expect(hecho.codigo, hecho.error).toBe(0);
    const despues = await instantanea(corpus);

    expect(separarFrontmatter(despues[MARTI])?.texto).toBe(EN_VERSO);
    expect(separarFrontmatter(despues[AVARIENTO])?.texto).toBe('Un hombre rico avariento.\nMurió con cien mil dolores');
    expect(separarFrontmatter(despues[CANDIDATA])?.texto).toBe(EN_VERSO);
    expect(hecho.salida).toMatch(/Candidatas de revisión:\n {2}Restituidas: 1,/u);
    expect(hecho.salida).toMatch(/Cambian de fecha 2 Páginas de Cita/);
    for (const fichero of [MARTI, AVARIENTO, CANDIDATA]) {
      const viejas = antes[fichero].split('\n');
      const nuevas = despues[fichero].split('\n');
      expect(nuevas).toHaveLength(viejas.length);
      const distintas = nuevas.map((l, i) => i).filter((i) => nuevas[i] !== viejas[i]);
      expect(distintas).toHaveLength(1);
      expect(nuevas[distintas[0]]).toMatch(/^texto: "/u);
      const viejo = separarFrontmatter(antes[fichero])!;
      const nuevo = separarFrontmatter(despues[fichero])!;
      expect(colapsarEspacios(String(nuevo.texto))).toBe(colapsarEspacios(String(viejo.texto)));
      expect(nuevo.slug).toBe(viejo.slug);
    }
    // Lo demás, byte a byte.
    for (const fichero of Object.keys(antes).filter((f) => ![MARTI, AVARIENTO, CANDIDATA].includes(f))) {
      expect(despues[fichero], fichero).toBe(antes[fichero]);
    }
    expect(Object.keys(despues).sort()).toEqual(Object.keys(antes).sort());

    const otra = await correr(corpus, ['--restituir-saltos']);
    expect(otra.codigo, otra.error).toBe(0);
    expect(otra.salida).toMatch(/Ya restituidas, sin cambios: 2/);
    expect(otra.salida).toMatch(/Candidatas de revisión:\n {2}Restituidas: 0\.\n {2}Ya restituidas, sin cambios: 1\./u);
    expect(otra.salida).toContain('No se ha escrito nada.');
    expect(await instantanea(corpus)).toEqual(despues);
  });

  it('con slugs: solo esos; uno en prosa sale con 0 y dice por qué', async () => {
    const corpus = await enDisco(await corpusDeVerso());
    const hecho = await correr(corpus, ['--restituir-saltos', 'seneca-no-es-que-tengamos-poco-tiempo-es-prosa']);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(hecho.salida).toMatch(/seneca-no-es-que-tengamos-poco-tiempo-es-prosa: se queda en una línea, documento en prosa \(indeterminada/);
    const marti = await correr(corpus, ['--restituir-saltos', 'jose-marti-yo-vengo-de-todas-partes']);
    expect(marti.codigo, marti.error).toBe(0);
    expect(separarFrontmatter(await readFile(join(corpus, MARTI), 'utf8'))?.texto).toBe(EN_VERSO);
    expect(separarFrontmatter(await readFile(join(corpus, AVARIENTO), 'utf8'))?.texto).not.toContain('\n');
  });

  it('un slug que no es de ninguna Cita, o una nombrada sin documento: 1 y nada escrito', async () => {
    const corpus = await enDisco(await corpusDeVerso());
    const antes = await instantanea(corpus);
    const inexistente = await correr(corpus, ['--restituir-saltos', 'no-existe']);
    expect(inexistente.codigo).toBe(1);
    expect(inexistente.error).toContain('«no-existe»');
    const sinDocumento = await correr(corpus, ['--restituir-saltos', SLUG, 'jose-marti-yo-vengo-de-todas-partes']);
    expect(sinDocumento.codigo).toBe(1);
    expect(sinDocumento.error).toMatch(/no tiene documento/);
    expect(await instantanea(corpus)).toEqual(antes);
  });

  it('la forma de la invocación: 2 y nada escrito', async () => {
    const corpus = await enDisco(await corpusDeVerso());
    const antes = await instantanea(corpus);
    for (const argumentos of [
      ['--restituir-saltos', '--seco', '--seco'],
      ['--restituir-saltos', '--restituir-saltos'],
      ['--restituir-saltos', '--restituir-traduccion'],
      ['--restituir-saltos', '--retirar', SLUG, 'motivo'],
      ['--restituir-saltos', '--texto', 'algo'],
      ['--restituir-saltos', '--frobnicar'],
      ['--restituir-saltos', '--corpus', corpus],
      ['--seco', SLUG, rutaDelDocumento(corpus)],
    ]) {
      const hecho = await correr(corpus, argumentos);
      expect(hecho.codigo, argumentos.join(' ')).toBe(2);
    }
    expect(await instantanea(corpus)).toEqual(antes);
  });

  // Como root, `chmod` no impide escribir y la prueba no ejercitaría nada.
  it.skipIf(ROOT)('si una escritura falla, lo ya escrito vuelve a su contenido original y sale con 1', async () => {
    const corpus = await enDisco(await corpusDeVerso());
    const antes = await instantanea(corpus);
    // Las publicadas se escriben antes que las candidatas: la que falla es la candidata, así que
    // las dos publicadas ya están escritas y tienen que volver atrás.
    await chmod(join(corpus, CANDIDATA), 0o444);
    try {
      const hecho = await correr(corpus, ['--restituir-saltos']);
      expect(hecho.codigo).toBe(1);
      expect(hecho.error).toContain(`No se pudo escribir ${join(corpus, CANDIDATA)}`);
      expect(hecho.error).toMatch(/Las 2 Citas ya escritas en esta pasada han vuelto a su contenido original: no queda nada escrito/);
    } finally {
      await chmod(join(corpus, CANDIDATA), 0o644);
    }
    expect(await instantanea(corpus)).toEqual(antes);
  });

  it.skipIf(ROOT)('un Corpus que no se deja leer: 1 y nada escrito', async () => {
    const corpus = await enDisco(await corpusDeVerso());
    const antes = await instantanea(corpus);
    await chmod(join(corpus, MARTI), 0o000);
    try {
      const hecho = await correr(corpus, ['--restituir-saltos']);
      expect(hecho.codigo).toBe(1);
      expect(hecho.error).toMatch(/El Corpus no se deja leer/);
      expect(hecho.error).toContain('No se ha escrito nada.');
    } finally {
      await chmod(join(corpus, MARTI), 0o644);
    }
    expect(await instantanea(corpus)).toEqual(antes);
  });

  it.skipIf(ROOT)('si las fechas no se pueden contar: 1 y nada escrito, porque se cuentan antes de escribir', async () => {
    // Las Citas y los documentos se leen; solo falla lo que lee el recuento de AD-27 (los Autores).
    const corpus = await enDisco(await corpusDeVerso());
    const antes = await instantanea(corpus);
    await chmod(join(corpus, 'autores/seneca.yml'), 0o000);
    try {
      const hecho = await correr(corpus, ['--restituir-saltos']);
      expect(hecho.codigo).toBe(1);
      expect(hecho.error).toMatch(/No se pueden contar las superficies/);
      expect(hecho.error).toContain('No se ha escrito nada.');
    } finally {
      await chmod(join(corpus, 'autores/seneca.yml'), 0o644);
    }
    expect(await instantanea(corpus)).toEqual(antes);
  });

  it('el Corpus restituido construye: la regla 4 la decide la misma función que la orden', async () => {
    const DOC_DE_VERSO = componerDocumento(
      {
        fuente: 'wikisource-es',
        obra: OBRA,
        año: AÑO,
        lineas: 'verso',
        url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
        recuperado: '2026-08-21',
      },
      [OBRA, `Año de publicación: ${AÑO}`, `|autor=${AUTOR_DECLARADO}`].join('\n'),
      CUERPO.replace(TEXTO, 'No es que tengamos poco tiempo,\nes que perdemos mucho.'),
    );
    const corpus = await enDisco({
      ...CORPUS,
      [FICHERO]: citaValida({
        slug: SLUG,
        texto: TEXTO,
        procedencia: { obra: OBRA, año: AÑO },
        fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida' },
      }),
      [DOCUMENTO]: DOC_DE_VERSO,
      [FICHERO_DEL_CENSO]: `citas:\n  - ${OTRA_CENSADA}\n`,
    });
    const rojo = await construir(await leerCorpus(corpus));
    expect(rojo.codigo).not.toBe(0);
    expect(rojo.salida).toContain(`npm run documentar -- --restituir-saltos ${SLUG}`);

    const hecho = await correr(corpus, ['--restituir-saltos']);
    expect(hecho.codigo, hecho.error).toBe(0);
    const verde = await construir(await leerCorpus(corpus));
    expect(verde.salida).not.toMatch(/Regla incumplida/);
    expect(verde.codigo, verde.salida).toBe(0);
  });
});
