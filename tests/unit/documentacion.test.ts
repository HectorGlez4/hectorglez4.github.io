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
import { TEMA_VALIDO, citaValida } from './ayuda/construir.js';

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

/** Cómo declara la Fuente a quien firma, que es el lado del documento en el cotejo. */
const AUTOR_DECLARADO = 'Teresa de Jesús';

/**
 * Un documento como el que deja `tools/recuperar.ts`: cabecera, declaración y cuerpo.
 *
 * La declaración trae **también** la línea de autor, que es de donde sale el lado de la
 * Fuente en la puerta del Autor. Sin ella, las fixturas medían un documento que ningún
 * Wikisource produce: los 59 documentos versionados declaran quién firma.
 */
function documentoDePrueba(
  cuerpo: string,
  campos: { obra?: string; año?: number; autor?: string | null } = {},
): string {
  const obra = campos.obra ?? OBRA;
  const año = 'año' in campos ? campos.año : AÑO;
  // `null` es «este documento no declara autor», que es un caso de la matriz.
  const autor = 'autor' in campos ? campos.autor : AUTOR_DECLARADO;
  return componerDocumento(
    {
      fuente: 'wikisource-es',
      obra,
      ...(año !== undefined ? { año } : {}),
      url: 'https://es.wikisource.org/wiki/Nada_te_turbe',
      recuperado: '2026-08-21',
    },
    [
      obra,
      ...(año !== undefined ? [`Año de publicación: ${año}`] : []),
      ...(autor === null || autor === undefined ? [] : [`|autor=${autor}`]),
    ].join('\n'),
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

/**
 * La ficha de la Autora de la Cita, con **su** nombre.
 *
 * `AUTOR_VALIDO` declara «Séneca», y usarlo aquí ataba el slug `teresa-de-jesus` a un
 * nombre que no es el suyo. Daba igual mientras nada leyera el `nombre`; desde que la
 * puerta del Autor lo pone en el cotejo, una ficha que miente hace fallar al documento
 * correcto.
 */
const FICHA_DE_TERESA = [
  `nombre: ${AUTOR_DECLARADO}`,
  'añoFallecimiento: 1582',
  'semblanza: Monja y escritora castellana, fundadora de las Descalzas.',
  '',
].join('\n');

const CORPUS_BASE = {
  'autores/teresa-de-jesus.yml': FICHA_DE_TERESA,
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

/**
 * FR-23, Historia 11.6 — documentar tampoco ata una Cita a un documento de otro.
 *
 * Es la misma puerta que `extraer` ya tenía, en la orden hermana, y con la misma
 * comparación pura. Lo que difiere es de dónde sale el lado del Corpus: allí lo escribe
 * quien invoca, en `--autor`; aquí lo trae la Cita ya publicada, de cuya ficha se lee el
 * `nombre`.
 *
 * Lo que la hace grave, y lo que estas pruebas fijan: documentar **saca la Cita del censo
 * de pendientes de cotejo**. Sin la puerta, una Cita atada al documento de otro no solo
 * quedaba mal atribuida: dejaba de estar marcada como no verificada y quedaba registrada
 * como cotejada. Por eso cada rechazo comprueba el censo byte a byte, además de la Cita.
 */
describe('FR-23 — el documento tiene que ser de la Autora de la Cita', () => {
  const documento = (rutas: ReturnType<typeof rutasDelCorpus>) =>
    join(rutas.fuentes, 'wikisource-es--nada-te-turbe.txt');

  it('el mismo Autor documenta, y el parte dice que se cotejó', async () => {
    const rutas = await corpusDocumentable();

    const resultado = await documentarCita(rutas, SLUG, documento(rutas));

    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join('\n')).toBe(true);
    expect(resultado.ok && resultado.mensaje).toMatch(/Autor:\s+cotejado/);
    expect(resultado.ok && resultado.mensaje).toContain(AUTOR_DECLARADO);
    expect((await leerCensoDeCotejo(rutas)).includes(SLUG)).toBe(false);
  });

  it('la Fuente puede añadir un tratamiento: «Santa Teresa de Jesús» concuerda', async () => {
    // La dirección de la comparación es Corpus ⊆ declarado: la Fuente añade y no quita.
    const rutas = await enDisco({
      ...CORPUS_BASE,
      [FICHERO]: citaSinFuente(),
      [DOCUMENTO]: documentoDePrueba(CUERPO, { autor: 'Santa Teresa de Jesús' }),
    });

    const resultado = await documentarCita(rutas, SLUG, documento(rutas));

    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join('\n')).toBe(true);
  });

  it('otro Autor se rechaza, nombra las dos partes, y no toca ni la Cita ni el censo', async () => {
    const rutas = await enDisco({
      ...CORPUS_BASE,
      [FICHERO]: citaSinFuente(),
      [DOCUMENTO]: documentoDePrueba(CUERPO, { autor: 'Manuel González Prada' }),
    });
    const antes = await corpusEnDisco(rutas);

    const resultado = await documentarCita(rutas, SLUG, documento(rutas));

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.motivos[0]).toContain('Manuel González Prada');
    expect(!resultado.ok && resultado.motivos[0]).toContain(AUTOR_DECLARADO);
    expect(!resultado.ok && resultado.motivos.join('\n')).toMatch(/No son el mismo Autor/);

    // Ni la Cita ni el censo: la Cita sigue sin Fuente y sigue censada, byte a byte.
    expect(await corpusEnDisco(rutas)).toEqual(antes);
    expect((await leerCensoDeCotejo(rutas)).includes(SLUG)).toBe(true);
  });

  it('un autor declarado que no se sabe interpretar se rechaza, y el censo queda intacto', async () => {
    const rutas = await enDisco({
      ...CORPUS_BASE,
      [FICHERO]: citaSinFuente(),
      [DOCUMENTO]: documentoDePrueba(CUERPO, { autor: 'Teresa de Jesús<ref>o no</ref>' }),
    });
    const antes = await corpusEnDisco(rutas);

    const resultado = await documentarCita(rutas, SLUG, documento(rutas));

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.motivos[0]).toMatch(/no se sabe interpretar/);
    expect(!resultado.ok && resultado.motivos.join('\n')).not.toMatch(/no declara autor/);
    expect(await corpusEnDisco(rutas)).toEqual(antes);
  });

  it('un documento que no declara autor documenta igual, y el parte lo dice', async () => {
    // Un metadato que falta no es un fallo, igual que el año. Pero conviene que se vea
    // que la puerta no actuó: una puerta muda se parece a una que aprueba.
    const rutas = await enDisco({
      ...CORPUS_BASE,
      [FICHERO]: citaSinFuente(),
      [DOCUMENTO]: documentoDePrueba(CUERPO, { autor: null }),
    });

    const resultado = await documentarCita(rutas, SLUG, documento(rutas));

    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join('\n')).toBe(true);
    expect(resultado.ok && resultado.mensaje).toMatch(/Autor:\s+sin cotejar/);
  });

  it('un documento firmado «Anónimo» tampoco declara a nadie: documenta sin cotejar', async () => {
    const rutas = await enDisco({
      ...CORPUS_BASE,
      [FICHERO]: citaSinFuente(),
      [DOCUMENTO]: documentoDePrueba(CUERPO, { autor: 'Anónimo' }),
    });

    const resultado = await documentarCita(rutas, SLUG, documento(rutas));

    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join('\n')).toBe(true);
    expect(resultado.ok && resultado.mensaje).toMatch(/Autor:\s+sin cotejar/);
  });

  it('con dos Autores declarados basta con que la Cita concuerde con uno', async () => {
    const rutas = await enDisco({
      ...CORPUS_BASE,
      [FICHERO]: citaSinFuente(),
      [DOCUMENTO]: documentoDePrueba(CUERPO, {
        autor: '[[Autor:Teresa de Jesús|Teresa de Jesús]] y [[Autor:Juan de la Cruz|Juan de la Cruz]]',
      }),
    });

    const resultado = await documentarCita(rutas, SLUG, documento(rutas));

    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join('\n')).toBe(true);
    expect(resultado.ok && resultado.mensaje).toContain('Juan de la Cruz');
  });

  it('y si no concuerda con ninguno de los dos, se rechaza', async () => {
    const rutas = await enDisco({
      ...CORPUS_BASE,
      [FICHERO]: citaSinFuente(),
      [DOCUMENTO]: documentoDePrueba(CUERPO, {
        autor: '[[Manuel Machado]] y [[Antonio Machado]]',
      }),
    });
    const antes = await corpusEnDisco(rutas);

    const resultado = await documentarCita(rutas, SLUG, documento(rutas));

    expect(resultado.ok).toBe(false);
    expect(await corpusEnDisco(rutas)).toEqual(antes);
  });

  it('una ficha de Autora sin nombre se rechaza por su motivo, no por una traza', async () => {
    const rutas = await enDisco({
      ...CORPUS_BASE,
      'autores/teresa-de-jesus.yml': 'añoFallecimiento: 1582\nsemblanza: Sin nombre, a propósito.\n',
      [FICHERO]: citaSinFuente(),
      [DOCUMENTO]: documentoDePrueba(CUERPO),
    });
    const antes = await corpusEnDisco(rutas);

    const resultado = await documentarCita(rutas, SLUG, documento(rutas));

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.motivos[0]).toMatch(/no declara ningún nombre/);
    expect(await corpusEnDisco(rutas)).toEqual(antes);
  });

  it('una Cita cuyo Autor no está en el corpus se rechaza sin tocar nada', async () => {
    const rutas = await enDisco({
      'temas/el-tiempo.yml': TEMA_VALIDO,
      'pendientes-de-cotejo.yml': CENSO,
      [FICHERO]: citaSinFuente(),
      [DOCUMENTO]: documentoDePrueba(CUERPO),
    });
    const antes = await corpusEnDisco(rutas);

    const resultado = await documentarCita(rutas, SLUG, documento(rutas));

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.motivos[0]).toContain('teresa-de-jesus');
    expect(await corpusEnDisco(rutas)).toEqual(antes);
  });
});

/**
 * La demostración del revisor, como prueba de regresión.
 *
 * Una Cita de Montalvo, el documento de «El sable» —que declara «Manuel González Prada»— y
 * el texto de González Prada literal en el cuerpo. Las tres puertas de procedencia lo
 * dejan pasar, el cotejo literal también —el texto **está** ahí—, y antes de esto la orden
 * devolvía `ok: true`: la Cita quedaba atribuida a Montalvo, con Fuente, y **fuera** del
 * censo de pendientes de cotejo.
 */
describe('FR-23 — regresión: «El sable» no documenta una Cita de Montalvo', () => {
  const SLUG_DE_MONTALVO = 'juan-montalvo-el-habito-no-hace-al-monje-pero-la';
  const TEXTO_DE_PRADA =
    'El hábito no hace al monje; pero la casaca influye mucho en la formación del tigre.';
  const EL_SABLE = 'fuentes/wikisource-es--el-sable.txt';

  const CENSO_DE_MONTALVO = `# Pendientes de cotejo — Historia 11.2
#
# Es un CENSO CERRADO: no admite altas y solo mengua.

citas:
  - ${SLUG_DE_MONTALVO}
`;

  async function corpusDelHallazgo() {
    return enDisco({
      'autores/juan-montalvo.yml': [
        'nombre: Juan Montalvo',
        'añoFallecimiento: 1889',
        'semblanza: Ensayista ecuatoriano, desterrado por escribir contra los tiranos.',
        '',
      ].join('\n'),
      'temas/el-tiempo.yml': TEMA_VALIDO,
      'pendientes-de-cotejo.yml': CENSO_DE_MONTALVO,
      'citas/juan-montalvo--el-habito-no-hace-al-monje-pero-la.md': citaValida({
        autor: 'juan-montalvo',
        temas: ['el-tiempo'],
        slug: SLUG_DE_MONTALVO,
        texto: TEXTO_DE_PRADA,
        procedencia: { obra: 'Capítulos que se le olvidaron a Cervantes' },
        fuente: undefined,
      }),
      [EL_SABLE]: componerDocumento(
        {
          fuente: 'wikisource-es',
          obra: 'El sable',
          año: 1904,
          url: 'https://es.wikisource.org/wiki/El_sable',
          recuperado: '2026-08-21',
        },
        ['El sable', '|título=El sable', '|autor=Manuel González Prada', '|año=1904'].join('\n'),
        `Un general, un tonel vacío. ${TEXTO_DE_PRADA} Y sin embargo, muchos sociólogos.`,
      ),
    });
  }

  it('el texto sí aparece literal en el documento: no es el cotejo lo que lo para', async () => {
    // Si esto fallara, la prueba de abajo pasaría por el motivo equivocado.
    const rutas = await corpusDelHallazgo();
    const bruto = await readFile(join(rutas.fuentes, 'wikisource-es--el-sable.txt'), 'utf8');
    expect(bruto).toContain(TEXTO_DE_PRADA);
  });

  it('se rechaza, y la Cita sigue censada como no verificada', async () => {
    const rutas = await corpusDelHallazgo();
    const antes = await corpusEnDisco(rutas);

    const resultado = await documentarCita(
      rutas,
      SLUG_DE_MONTALVO,
      join(rutas.fuentes, 'wikisource-es--el-sable.txt'),
    );

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.motivos[0]).toContain('Manuel González Prada');
    expect(!resultado.ok && resultado.motivos[0]).toContain('Juan Montalvo');

    /*
     * Lo que de verdad estaba en juego: sin la puerta, la Cita salía del censo. Una Cita
     * mal atribuida es mala; una Cita mal atribuida y **registrada como cotejada** borra
     * la única señal de que nadie la ha verificado.
     */
    expect(await corpusEnDisco(rutas)).toEqual(antes);
    expect(await leerCensoDeCotejo(rutas)).toContain(SLUG_DE_MONTALVO);
    expect(await frontmatterDe(join(rutas.citas, 'juan-montalvo--el-habito-no-hace-al-monje-pero-la.md')))
      .not.toHaveProperty('fuente');
  });
});
