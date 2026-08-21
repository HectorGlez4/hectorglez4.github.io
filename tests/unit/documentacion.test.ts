import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  documentarCita,
  parecidoDeTextos,
  retirarCita,
  MIN_PARECIDO_PARA_CORREGIR,
} from '../../tools/lib/documentacion.ts';
import { censoSinLaCita } from '../../tools/lib/cotejo.ts';
import { leerCensoDeCotejo, rutasDelCorpus, separarFrontmatter } from '../../tools/lib/corpus.ts';
import { componerDocumento } from '../../tools/lib/documento.ts';
import { AUTOR_VALIDO, TEMA_VALIDO, citaValida } from './ayuda/construir.js';

/**
 * Historia 11.6 — documentar y retirar una Cita ya publicada, sin construir.
 *
 * Aquí se mide lo que decide: qué se escribe, qué se rechaza y —sobre todo— que un rechazo
 * no deje tocada ni la Cita, ni el censo, ni nada. Que documentar y no salir del censo
 * rompa de verdad la construcción lo prueba `documentar-cli.test.ts`, que construye.
 *
 * Todo ocurre en corpus temporales: estas pruebas escriben en el corpus que se les dice, y
 * `corpus/` no se toca nunca.
 */

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const OBRA = 'Nada te turbe';
const AÑO = 1583;
const SLUG = 'teresa-de-jesus-quien-a-dios-tiene-nada-le-falta';
const TEXTO = 'Quien a Dios tiene, nada le falta.';
const FICHERO = 'citas/teresa-de-jesus--quien-a-dios-tiene-nada-le-falta.md';
const DOCUMENTO = 'fuentes/wikisource-es--nada-te-turbe.txt';

/**
 * El cuerpo del documento, con la Cita repartida en dos versos.
 *
 * Es lo que hace de verdad una edición y lo que el cotejo tiene que atravesar: colapsa
 * espacios y nada más, así que un salto de línea en medio de la Cita no la esconde y una
 * coma de más sí.
 */
const CUERPO = [
  'Nada te turbe;',
  'nada te espante;',
  'todo se pasa;',
  'Dios no se muda,',
  'la paciencia',
  'todo lo alcanza.',
  'Quien a Dios tiene,',
  'nada le falta.',
  'Solo Dios basta.',
].join('\n');

/** Un documento como el que deja `tools/recuperar.ts`: cabecera, declaración y cuerpo. */
function documentoDePrueba(
  cuerpo: string,
  campos: { obra?: string; año?: number } = {},
): string {
  const obra = campos.obra ?? OBRA;
  const año = 'año' in campos ? campos.año : AÑO;
  return componerDocumento(
    {
      fuente: 'wikisource-es',
      obra,
      ...(año !== undefined ? { año } : {}),
      url: 'https://es.wikisource.org/wiki/Nada_te_turbe',
      recuperado: '2026-08-21',
    },
    [obra, ...(año !== undefined ? [`Año de publicación: ${año}`] : [])].join('\n'),
    cuerpo,
  );
}

/**
 * Una Cita publicada **sin Fuente**, que es el estado de las 38 anteriores a la v3: la
 * Procedencia se tecleó y no hay documento contra el que cotejarla.
 */
function citaSinFuente(campos: Record<string, unknown> = {}): string {
  return citaValida({
    autor: 'teresa-de-jesus',
    temas: ['el-tiempo'],
    slug: SLUG,
    texto: TEXTO,
    procedencia: { obra: 'Poesías', referencia: 'Conocido como «Nada te turbe»' },
    fuente: undefined,
    ...campos,
  });
}

const CENSO = `# Pendientes de cotejo — Historia 11.2
#
# Es un CENSO CERRADO: no admite altas y solo mengua.

citas:
  - ${SLUG}
  - teresa-de-jesus-la-paciencia-todo-lo-alcanza
`;

/** Escribe un corpus temporal y devuelve sus rutas. */
async function enDisco(corpus: Record<string, string>) {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-documentacion-'));
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
  return rutasDelCorpus(directorio);
}

const CORPUS_BASE = {
  'autores/teresa-de-jesus.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'pendientes-de-cotejo.yml': CENSO,
};

/** El corpus por omisión: la Cita censada y su documento, que sí la contiene. */
async function corpusDocumentable(campos: Record<string, unknown> = {}) {
  return enDisco({
    ...CORPUS_BASE,
    [FICHERO]: citaSinFuente(campos),
    [DOCUMENTO]: documentoDePrueba(CUERPO),
  });
}

/** El contenido literal de un directorio, para comparar antes y después byte a byte. */
async function instantanea(directorio: string): Promise<Record<string, string>> {
  if (!existsSync(directorio)) return {};
  const entradas = await readdir(directorio, { recursive: true, withFileTypes: true });
  const contenido: Record<string, string> = {};
  for (const entrada of entradas) {
    if (!entrada.isFile()) continue;
    const ruta = join(entrada.parentPath, entrada.name);
    contenido[ruta] = await readFile(ruta, 'utf8');
  }
  return contenido;
}

/** Todo lo que la orden podría tocar: las Citas, la revisión y el censo. */
async function corpusEnDisco(rutas: ReturnType<typeof rutasDelCorpus>) {
  return {
    citas: await instantanea(rutas.citas),
    revision: await instantanea(rutas.revision),
    censo: await readFile(rutas.pendientesDeCotejo, 'utf8'),
  };
}

const frontmatterDe = async (ruta: string) =>
  separarFrontmatter(await readFile(ruta, 'utf8')) ?? {};

describe('Historia 11.6 — documentar una Cita publicada', () => {
  it('escribe la Fuente y la Procedencia derivadas, y la saca del censo', async () => {
    const rutas = await corpusDocumentable();

    const resultado = await documentarCita(rutas, SLUG, join(rutas.fuentes, 'wikisource-es--nada-te-turbe.txt'));
    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join('\n')).toBe(true);

    const datos = await frontmatterDe(join(rutas.citas, 'teresa-de-jesus--quien-a-dios-tiene-nada-le-falta.md'));
    expect(datos.fuente).toEqual({
      id: 'wikisource-es',
      nombre: 'Wikisource en español',
      licencia: 'CC BY-SA 4.0',
      url: 'https://es.wikisource.org/wiki/Nada_te_turbe',
    });
    // La obra y el año salen del documento, nunca de lo que la Cita tuviera tecleado. La
    // referencia sí sobrevive: no es ni obra ni año, y el documento no la declara.
    expect(datos.procedencia).toEqual({
      obra: OBRA,
      año: AÑO,
      referencia: 'Conocido como «Nada te turbe»',
    });
    // El texto no se toca (NFR-12), y el slug tampoco (AD-4).
    expect(datos.texto).toBe(TEXTO);
    expect(datos.slug).toBe(SLUG);

    expect(await leerCensoDeCotejo(rutas)).toEqual(['teresa-de-jesus-la-paciencia-todo-lo-alcanza']);
    // La cabecera del censo sobrevive: se borra una línea, no se vuelca el fichero.
    const censo = await readFile(rutas.pendientesDeCotejo, 'utf8');
    expect(censo).toContain('# Pendientes de cotejo');
    expect(censo).toContain('# Es un CENSO CERRADO');
    expect(censo).not.toContain(SLUG);
  });

  it('se niega cuando el texto no aparece, y no toca ni la Cita ni el censo', async () => {
    const rutas = await enDisco({
      ...CORPUS_BASE,
      [FICHERO]: citaSinFuente(),
      [DOCUMENTO]: documentoDePrueba('Un cuerpo que no dice nada de lo que la Cita dice.'),
    });
    const antes = await corpusEnDisco(rutas);

    const resultado = await documentarCita(rutas, SLUG, join(rutas.fuentes, 'wikisource-es--nada-te-turbe.txt'));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;

    const dicho = resultado.motivos.join('\n');
    expect(dicho).toContain(SLUG);
    expect(dicho).toContain('wikisource-es--nada-te-turbe.txt');
    expect(dicho).toContain('colapsa espacios');
    // Las dos salidas, y ninguna tercera: corregir contra la edición, o retirar.
    expect(dicho).toContain('--texto');
    expect(dicho).toContain('--retirar');

    expect(await corpusEnDisco(rutas)).toEqual(antes);
  });

  it('documenta con la obra del documento y dice el cambio antes de escribir', async () => {
    const rutas = await corpusDocumentable();
    const ruta = join(rutas.citas, 'teresa-de-jesus--quien-a-dios-tiene-nada-le-falta.md');
    const antes = await readFile(ruta, 'utf8');

    const avisos: string[] = [];
    /*
     * El fichero se lee **dentro** del aviso: es la única forma de comprobar que lo que
     * cambia se dice antes de que cambie nada, que es lo que permite parar la orden al leer
     * algo que no se esperaba en vez de enterarse cuando ya está escrito.
     */
    const alAvisar: string[] = [];
    await documentarCita(rutas, SLUG, join(rutas.fuentes, 'wikisource-es--nada-te-turbe.txt'), {
      avisar: (linea) => {
        avisos.push(linea);
        alAvisar.push(readFileSync(ruta, 'utf8'));
      },
    });

    expect(avisos.join('\n')).toContain('La obra cambia');
    expect(avisos.join('\n')).toContain('Poesías');
    expect(avisos.join('\n')).toContain(OBRA);
    for (const visto of alAvisar) expect(visto).toBe(antes);

    expect((await frontmatterDe(ruta)).procedencia).toMatchObject({ obra: OBRA });
  });

  it('rechaza una Cita que ya declara Fuente: para cambiarla, primero se retira', async () => {
    const rutas = await enDisco({
      ...CORPUS_BASE,
      [FICHERO]: citaSinFuente({
        fuente: {
          id: 'wikisource-es',
          url: 'https://es.wikisource.org/wiki/Nada_te_turbe',
        },
      }),
      [DOCUMENTO]: documentoDePrueba(CUERPO),
    });
    const antes = await corpusEnDisco(rutas);

    const resultado = await documentarCita(rutas, SLUG, join(rutas.fuentes, 'wikisource-es--nada-te-turbe.txt'));
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivos.join('\n')).toContain('ya está documentada');
    expect(await corpusEnDisco(rutas)).toEqual(antes);
  });

  it('rechaza un slug con errata, y una Cita que está en revisión', async () => {
    const rutas = await enDisco({
      ...CORPUS_BASE,
      [FICHERO]: citaSinFuente(),
      '_revision/teresa-de-jesus--candidata.md': citaValida({
        autor: 'teresa-de-jesus',
        slug: 'teresa-de-jesus-candidata-en-revision',
        texto: 'Candidata que todavía no ha pasado por la revisión.',
      }),
      [DOCUMENTO]: documentoDePrueba(CUERPO),
    });
    const documento = join(rutas.fuentes, 'wikisource-es--nada-te-turbe.txt');

    const conErrata = await documentarCita(rutas, 'teresa-de-jesus-quien-a-dios-tienee', documento);
    expect(conErrata.ok).toBe(false);
    if (!conErrata.ok) expect(conErrata.motivos.join('\n')).toContain('teresa-de-jesus-quien-a-dios-tienee');

    const enRevision = await documentarCita(rutas, 'teresa-de-jesus-candidata-en-revision', documento);
    expect(enRevision.ok).toBe(false);
    if (!enRevision.ok) {
      expect(enRevision.motivos.join('\n')).toContain('no está publicada');
      expect(enRevision.motivos.join('\n')).toContain('revisar.ts --aprobar');
    }
  });

  it('rechaza un documento que no está, y uno que no tiene la forma de la recuperación', async () => {
    const rutas = await enDisco({
      ...CORPUS_BASE,
      [FICHERO]: citaSinFuente(),
      'fuentes/wikisource-es--a-mano.txt': 'Esto lo ha escrito alguien a mano, sin recuperar nada.\n',
    });
    const antes = await corpusEnDisco(rutas);

    const ausente = await documentarCita(rutas, SLUG, join(rutas.fuentes, 'no-existe.txt'));
    expect(ausente.ok).toBe(false);
    if (!ausente.ok) expect(ausente.motivos.join('\n')).toContain('no-existe.txt');

    const aMano = await documentarCita(rutas, SLUG, join(rutas.fuentes, 'wikisource-es--a-mano.txt'));
    expect(aMano.ok).toBe(false);
    if (!aMano.ok) expect(aMano.motivos.join('\n')).toContain('wikisource-es--a-mano.txt');

    // Y uno fuera de corpus/fuentes/ tampoco vale, aunque tenga la forma exacta.
    const fuera = join(rutas.raiz, 'wikisource-es--nada-te-turbe.txt');
    await writeFile(fuera, documentoDePrueba(CUERPO), 'utf8');
    const deFuera = await documentarCita(rutas, SLUG, fuera);
    expect(deFuera.ok).toBe(false);
    if (!deFuera.ok) expect(deFuera.motivos.join('\n')).toContain('no lo produjo la recuperación');

    expect(await corpusEnDisco(rutas)).toEqual(antes);
  });
});

describe('Historia 11.6 — corregir el texto contra su edición', () => {
  /** El caso real: la misma Cita con la puntuación normalizada al teclearla en la v1. */
  const SLUG_TERESA = 'teresa-de-jesus-nada-te-turbe-nada-te-espante-todo';
  const TECLEADO = 'Nada te turbe, nada te espante, todo se pasa.';
  const EDICION = 'Nada te turbe; nada te espante; todo se pasa;';
  const FICHERO_TERESA = 'citas/teresa-de-jesus--nada-te-turbe.md';

  async function corpusConTecleado() {
    return enDisco({
      ...CORPUS_BASE,
      'pendientes-de-cotejo.yml': CENSO.replace(SLUG, SLUG_TERESA),
      [FICHERO_TERESA]: citaValida({
        autor: 'teresa-de-jesus',
        temas: ['el-tiempo'],
        slug: SLUG_TERESA,
        texto: TECLEADO,
        procedencia: { obra: 'Poesías' },
        fuente: undefined,
      }),
      [DOCUMENTO]: documentoDePrueba(CUERPO),
    });
  }

  it('restituye el texto de la edición y dice el antes y el después', async () => {
    const rutas = await corpusConTecleado();
    const avisos: string[] = [];

    const resultado = await documentarCita(
      rutas,
      SLUG_TERESA,
      join(rutas.fuentes, 'wikisource-es--nada-te-turbe.txt'),
      { texto: EDICION, avisar: (l) => avisos.push(l) },
    );
    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join('\n')).toBe(true);

    const datos = await frontmatterDe(join(rutas.citas, 'teresa-de-jesus--nada-te-turbe.md'));
    expect(datos.texto).toBe(EDICION);
    // El slug es la URL y no se recalcula aunque el texto cambie (AD-4).
    expect(datos.slug).toBe(SLUG_TERESA);
    expect(datos.fuente).toMatchObject({ id: 'wikisource-es' });

    const dicho = avisos.join('\n');
    expect(dicho).toContain('El texto se corrige contra la edición');
    expect(dicho).toContain(TECLEADO);
    expect(dicho).toContain(EDICION);
    expect(dicho).toContain('no se recalcula');

    // Y sale del censo en el mismo gesto: su exención iba atada a la huella del texto
    // publicado, así que corregirlo la invalidaría.
    expect(await leerCensoDeCotejo(rutas)).not.toContain(SLUG_TERESA);
  });

  it('se niega si el texto corregido no aparece en el documento', async () => {
    const rutas = await corpusConTecleado();
    const antes = await corpusEnDisco(rutas);

    const resultado = await documentarCita(
      rutas,
      SLUG_TERESA,
      join(rutas.fuentes, 'wikisource-es--nada-te-turbe.txt'),
      { texto: 'Nada te turbe: nada te espante: todo se pasa.' },
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.motivos.join('\n')).toContain('no aparece en');
      expect(resultado.motivos.join('\n')).toContain('sería inventarlo');
    }
    expect(await corpusEnDisco(rutas)).toEqual(antes);
  });

  it('se niega si lo que se teclea aparece pero es otra Cita de la misma página', async () => {
    const rutas = await corpusConTecleado();
    const antes = await corpusEnDisco(rutas);

    // Está literalmente en el documento, y aun así no es esta Cita.
    const resultado = await documentarCita(
      rutas,
      SLUG_TERESA,
      join(rutas.fuentes, 'wikisource-es--nada-te-turbe.txt'),
      { texto: 'Quien a Dios tiene, nada le falta.' },
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.motivos.join('\n')).toContain('no es la misma Cita');
      expect(resultado.motivos.join('\n')).toContain(TECLEADO);
    }
    expect(await corpusEnDisco(rutas)).toEqual(antes);
  });

  it('el parecido admite la corrección de signos y rechaza la paráfrasis', () => {
    // El caso medido del censo: solo cambian una coma y un punto y coma.
    expect(
      parecidoDeTextos(
        'Hombres necios que acusáis a la mujer sin razón, sin ver que sois la ocasión de lo mismo que culpáis.',
        'Hombres necios que acusáis a la mujer, sin razón, sin ver que sois la ocasión de lo mismo que culpáis;',
      ),
    ).toBe(1);

    // Y el par que descubrió el problema: el Corpus decía una cosa y el aforismo 268 dice otra.
    const paráfrasis = parecidoDeTextos(
      'El sabio hace luego lo que el necio al fin.',
      'Haga al principio el cuerdo lo que el necio al fin.',
    );
    expect(paráfrasis).toBeLessThan(MIN_PARECIDO_PARA_CORREGIR);
    expect(paráfrasis).toBeCloseTo(0.6, 2);

    // Restituir una palabra en una frase de la longitud habitual sí entra.
    expect(
      parecidoDeTextos(
        'No es que tengamos poco tiempo, es que perdemos mucho.',
        'No es que tengamos poco tiempo, sino que perdemos mucho.',
      ),
    ).toBeGreaterThanOrEqual(MIN_PARECIDO_PARA_CORREGIR);
  });
});

describe('Historia 11.6 — retirar una Cita publicada', () => {
  it('la mueve a revisión, la saca del censo y no borra nada', async () => {
    const rutas = await corpusDocumentable();

    const resultado = await retirarCita(rutas, SLUG, 'No aparece en la edición de 1583.');
    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join('\n')).toBe(true);
    if (resultado.ok) {
      expect(resultado.mensaje).toContain('No aparece en la edición de 1583.');
      expect(resultado.mensaje).toContain('No se ha borrado nada');
    }

    expect(await readdir(rutas.citas)).toEqual([]);
    expect(await readdir(rutas.revision)).toEqual([
      'teresa-de-jesus--quien-a-dios-tiene-nada-le-falta.md',
    ]);
    expect(await leerCensoDeCotejo(rutas)).not.toContain(SLUG);
    expect(await readFile(rutas.pendientesDeCotejo, 'utf8')).toContain('# Es un CENSO CERRADO');
  });

  it('sin motivo no retira nada', async () => {
    const rutas = await corpusDocumentable();
    const antes = await corpusEnDisco(rutas);

    const resultado = await retirarCita(rutas, SLUG, '   ');
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivos.join('\n')).toContain('es una desaparición');
    expect(await corpusEnDisco(rutas)).toEqual(antes);
  });

  it('funciona igual con una Cita de después de la v3, que nunca estuvo censada', async () => {
    const rutas = await enDisco({
      ...CORPUS_BASE,
      [FICHERO]: citaSinFuente({
        slug: SLUG,
        fuente: {
          id: 'wikisource-es',
          url: 'https://es.wikisource.org/wiki/Nada_te_turbe',
        },
      }),
      'pendientes-de-cotejo.yml': CENSO.replace(`  - ${SLUG}\n`, ''),
    });

    const resultado = await retirarCita(rutas, SLUG, 'La edición dice otra cosa.');
    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join('\n')).toBe(true);
    if (resultado.ok) expect(resultado.mensaje).toContain('No estaba en el censo');
    expect(await readdir(rutas.revision)).toHaveLength(1);
  });
});

describe('Historia 11.6 — el censo se edita línea a línea, nunca se vuelca', () => {
  it('borra la entrada y deja intacto todo lo demás', () => {
    const resultado = censoSinLaCita(CENSO, SLUG);
    expect(resultado).toBeDefined();
    expect(resultado).toBe(CENSO.replace(`  - ${SLUG}\n`, ''));
  });

  it('admite la entrada entrecomillada, que YAML también admite', () => {
    const conComillas = CENSO.replace(`- ${SLUG}`, `- "${SLUG}"`);
    expect(censoSinLaCita(conComillas, SLUG)).not.toContain(SLUG);
  });

  it('devuelve undefined cuando el slug no está: no hay nada que escribir', () => {
    expect(censoSinLaCita(CENSO, 'seneca-una-que-no-esta')).toBeUndefined();
  });
});
