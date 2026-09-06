import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import { huecoDeEpoca, huecosDeEpocas, verHuecos } from '../../src/lib/huecos.ts';
import {
  CABECERA_DE_CANDIDATOS,
  CABECERA_DE_DESCARTES,
  FICHERO_DE_CANDIDATOS,
  FICHERO_DE_DESCARTES,
  leerCandidatosPorEpoca,
  leerDescartesDeCandidatos,
  registrarCandidatosPorEpoca,
  registrarDescarteDeCandidato,
  rutasDelCorpus,
} from '../../tools/lib/corpus.ts';
import {
  CATEGORIA_DE_DOMINIO_PUBLICO,
  DIAS_DE_VIGENCIA_DE_LA_LISTA,
  EPOCAS,
  FUENTE_DE_LAS_EPOCAS,
  MAXIMO_DE_PAGINAS,
  candidatosDeRespuesta,
  cruzarEpoca,
  descartesPorCandidato,
  diasDesdeLaRecuperacion,
  direccionDeCategoria,
  epocaDe,
  epocasParaHuecos,
  listaCaducada,
  listaDeEpocaRegistrada,
  ordenarCandidatos,
  paginaDeAutor,
  pendientesSinMarca,
  slugsSembrados,
  type Candidato,
  type CandidatosDeEpoca,
} from '../../tools/lib/epocas.ts';
import { fuenteDeUrl } from '../../tools/lib/fuentes.ts';
import { objetivoDeSesion } from '../../src/lib/objetivo.ts';
import { objetivoDeMeta, verMeta } from '../../src/lib/meta.ts';
import { FalloDeLaFuente, principal, recuperarEpoca, type Pedir } from '../../tools/epocas.ts';

const RAIZ = resolve(import.meta.dirname, '../..');

/**
 * Historia 19.5 — la época se declara desde la Fuente, y el hueco sale de ella.
 *
 * La matriz de la historia son seis situaciones y las seis se recorren aquí, **con la red
 * simulada**: recuperar una época, cruzarla con lo sembrado, declararla terminada, descartar
 * con motivo a quien no da Citas, trabajar con la lista versionada cuando la Fuente no
 * responde, y marcar para mirar a mano a quien no lleva `DP-Autores-100`.
 *
 * Lo que atraviesa todas: **la lista se deriva y no se escribe**. Ninguna prueba de aquí
 * mantiene un catálogo de autores; lo que mantiene es la respuesta simulada de una Fuente.
 */

const temporales: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  const { rm } = await import('node:fs/promises');
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

// ─── Un corpus de verdad en disco, con los Autores que se le digan ───────────────────

async function corpusCon(autores: string[]): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-epocas-'));
  temporales.push(raiz);
  const corpus = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', 'colecciones']) {
    await mkdir(join(corpus, dir), { recursive: true });
  }
  for (const slug of autores) {
    await writeFile(
      join(corpus, 'autores', `${slug}.yml`),
      `nombre: "${slug}"\nañoFallecimiento: 1900\n`,
      'utf8',
    );
  }
  return corpus;
}

/** La respuesta que da la Fuente a una consulta de categoría, en su forma real. */
function respuesta(
  titulos: { titulo: string; dp?: boolean }[],
  continuar?: Record<string, string>,
): unknown {
  return {
    batchcomplete: true,
    ...(continuar === undefined ? {} : { continue: continuar }),
    query: {
      pages: titulos.map(({ titulo, dp }, i) => ({
        pageid: 100 + i,
        ns: 106,
        title: titulo,
        ...(dp === false ? {} : { categories: [{ ns: 14, title: CATEGORIA_DE_DOMINIO_PUBLICO }] }),
      })),
    },
    limits: { categories: 500 },
  };
}

/**
 * Lo que la API contesta a una categoría que **no existe**, copiado de la respuesta real.
 *
 * Medido el 2026-09-06 contra `es.wikisource.org/w/api.php`: 200, sin `error` y **sin
 * `query`**, que es exactamente lo mismo que contesta una categoría vacía. Es la forma que
 * hacía que una categoría renombrada borrase la lista versionada de su época.
 */
const SIN_QUERY = { batchcomplete: true, limits: { categories: 500 } };

const GRECIA = EPOCAS.find((e) => e.id === 'antigua-grecia')!;
const ROMA = EPOCAS.find((e) => e.id === 'antigua-roma')!;

// ─────────────────────────────────────────────────────────────────────────────────────
describe('19.5 — la lista se deriva de la Fuente, no se escribe', () => {
  it('las épocas son categorías de la Fuente, no autores escritos a mano', () => {
    // El día que esto sea una lista de nombres, la historia se habrá deshecho.
    for (const epoca of EPOCAS) {
      expect(epoca.categoria.startsWith('Categoría:')).toBe(true);
      expect(epoca.categoria).toMatch(/Autores/);
    }
    expect(epocaDe('antigua-grecia')?.nombre).toBe('Antigua Grecia');
    expect(epocaDe('la-que-nos-inventemos')).toBeUndefined();
  });

  it('la dirección de consulta apunta a una Fuente admitida y pide las dos cosas a la vez', () => {
    const direccion = direccionDeCategoria(GRECIA);
    // Se revalida contra el conjunto cerrado, como hace `recuperar` desde la 11.1.
    expect(fuenteDeUrl(direccion)?.id).toBe('wikisource-es');
    expect(fuenteDeUrl(direccion)?.permiteReutilizacion).toBe(true);

    const parametros = new URL(direccion).searchParams;
    expect(parametros.get('generator')).toBe('categorymembers');
    expect(parametros.get('gcmtitle')).toBe(GRECIA.categoria);
    // El espacio de autores, explícito: una obra mal categorizada no es un candidato.
    expect(parametros.get('gcmnamespace')).toBe('106');
    // Y la marca en la misma consulta: pedirla aparte doblaría las peticiones a la Fuente.
    expect(parametros.get('clcategories')).toBe(CATEGORIA_DE_DOMINIO_PUBLICO);
  });

  it('la continuación se reenvía tal cual, sin recomponerla', () => {
    const direccion = direccionDeCategoria(GRECIA, { gcmcontinue: 'page|4239' });
    expect(new URL(direccion).searchParams.get('gcmcontinue')).toBe('page|4239');
  });
});

// ── Escenario 1: recuperar una época ─────────────────────────────────────────────────
describe('19.5 — recuperar una época de la Fuente', () => {
  it('devuelve los candidatos con quién lleva DP-Autores-100', async () => {
    const pedir: Pedir = async () =>
      respuesta([
        { titulo: 'Autor:Platón' },
        { titulo: 'Autor:Euclides' },
        { titulo: 'Autor:Alguien Sin Marca', dp: false },
      ]);

    const candidatos = await recuperarEpoca(GRECIA, pedir);

    expect(candidatos.map((c) => c.slug)).toEqual([
      'alguien-sin-marca',
      'euclides',
      'platon',
    ]);
    expect(candidatos.find((c) => c.slug === 'platon')?.dominioPublico).toBe(true);
    expect(candidatos.find((c) => c.slug === 'alguien-sin-marca')?.dominioPublico).toBe(false);
    // La página se compone una vez y viaja con el candidato, para no rederivarla.
    expect(candidatos.find((c) => c.slug === 'platon')?.pagina).toBe(
      'https://es.wikisource.org/wiki/Autor:Plat%C3%B3n',
    );
  });

  it('el slug es el mismo con el que el Corpus nombra a un Autor', () => {
    // Con una canonización propia, Séneca daría un slug aquí y otro en corpus/autores/,
    // y el cruce contaría como pendiente a quien ya está sembrado.
    const [seneca] = candidatosDeRespuesta(respuesta([{ titulo: 'Autor:Séneca' }])).candidatos;
    expect(seneca.slug).toBe('seneca');
    expect(existsSync(resolve(RAIZ, 'corpus/autores/seneca.yml'))).toBe(true);
  });

  it('sigue la continuación hasta agotarla', async () => {
    const pedidas: string[] = [];
    const pedir: Pedir = async (direccion) => {
      pedidas.push(direccion);
      return new URL(direccion).searchParams.get('gcmcontinue') === null
        ? respuesta([{ titulo: 'Autor:Homero' }], { gcmcontinue: 'page|4239' })
        : respuesta([{ titulo: 'Autor:Platón' }]);
    };

    const candidatos = await recuperarEpoca(GRECIA, pedir);
    expect(pedidas).toHaveLength(2);
    expect(candidatos.map((c) => c.slug)).toEqual(['homero', 'platon']);
  });

  it('una época que no termina de servirse NO se da por recuperada', async () => {
    /*
     * Devolver lo que hubiera sería una lista más corta que la real, y una lista más corta
     * se lee después como una época más cerca de estar terminada de lo que está.
     */
    const pedir: Pedir = async () =>
      respuesta([{ titulo: 'Autor:Homero' }], { gcmcontinue: 'siempre' });
    await expect(recuperarEpoca(GRECIA, pedir)).rejects.toThrow(
      new RegExp(String(MAXIMO_DE_PAGINAS)),
    );
  });

  it('una respuesta con error dentro no se toma por buena', () => {
    // La API contesta 200 con el error dentro: quien mire solo el estado la daría por vacía,
    // y una lista vacía tiene cara de época agotada.
    expect(() =>
      candidatosDeRespuesta({ error: { code: 'invalidcategory', info: 'no existe' } }),
    ).toThrow(/no existe/);
  });

  it('una respuesta sin «query» no es una categoría vacía: es que no ha contestado', () => {
    /*
     * Y no se puede saber cuál de las dos es. Medido contra la API: una categoría inexistente
     * contesta lo mismo que una vacía. Por eso `respondio` viaja aparte del recuento — leer
     * las dos como «cero candidatos» es lo que borraba la lista versionada de una época.
     */
    const leida = candidatosDeRespuesta(SIN_QUERY);
    expect(leida.candidatos).toEqual([]);
    expect(leida.respondio).toBe(false);

    // Una categoría que sí existe y está vacía contesta con su `query` y sin páginas.
    const vacia = candidatosDeRespuesta({ batchcomplete: true, query: { pages: [] } });
    expect(vacia.candidatos).toEqual([]);
    expect(vacia.respondio).toBe(true);
  });

  it('lo que no sea una página de Autor no entra en la lista', () => {
    const { candidatos } = candidatosDeRespuesta(
      respuesta([{ titulo: 'La Ilíada' }, { titulo: 'Autor:Homero' }]),
    );
    expect(candidatos.map((c) => c.slug)).toEqual(['homero']);
  });

  it('ordena por slug y funde a los que canonizan igual', () => {
    const repetidos: Candidato[] = [
      { nombre: 'Platón', slug: 'platon', pagina: paginaDeAutor('Autor:Platón'), dominioPublico: false },
      { nombre: 'Homero', slug: 'homero', pagina: paginaDeAutor('Autor:Homero'), dominioPublico: true },
      { nombre: 'Platon', slug: 'platon', pagina: paginaDeAutor('Autor:Platon'), dominioPublico: true },
    ];
    const ordenados = ordenarCandidatos(repetidos);
    expect(ordenados.map((c) => c.slug)).toEqual(['homero', 'platon']);
    // Entre dos que canonizan igual gana el que lleva la marca: es el dato, no el orden.
    expect(ordenados.find((c) => c.slug === 'platon')?.dominioPublico).toBe(true);
  });
});

// ── Escenario 2: el cruce con lo sembrado ────────────────────────────────────────────
describe('19.5 — el cruce contra el Corpus', () => {
  const lista: CandidatosDeEpoca = {
    id: 'antigua-roma',
    nombre: 'Antigua Roma',
    categoria: ROMA.categoria,
    recuperada: '2026-09-06',
    candidatos: [
      { nombre: 'Séneca', slug: 'seneca', pagina: 'x', dominioPublico: true },
      { nombre: 'Cicerón', slug: 'ciceron', pagina: 'x', dominioPublico: true },
      { nombre: 'Columela', slug: 'columela', pagina: 'x', dominioPublico: false },
    ],
  };

  it('dice cuántos candidatos hay, cuántos sembrados y cuántos descartados', () => {
    const { epoca, candidatos } = cruzarEpoca(
      lista,
      new Set(['seneca']),
      descartesPorCandidato([
        { candidato: 'columela', motivo: 'tratado de agricultura: no da sentencia suelta' },
      ]),
    );

    expect(epoca).toMatchObject({ candidatos: 3, sembrados: 1, descartados: 1 });
    expect(huecoDeEpoca(epoca).faltan).toBe(1);
    expect(candidatos.map((c) => c.estado)).toEqual(['sembrado', 'pendiente', 'descartado']);
    // El motivo viaja con el descartado: es lo que lo distingue de un candidato saltado.
    expect(candidatos[2].motivo).toMatch(/agricultura/);
    expect(candidatos[0].motivo).toBeUndefined();
    expect(candidatos[1].motivo).toBeUndefined();
  });

  it('el descarte se lleva por autor y no por época', () => {
    /*
     * Un autor cuya prosa no da sentencia suelta no la da en ninguna de las categorías en
     * las que la Fuente lo clasificó. Con el descarte por época habría que escribir el mismo
     * motivo tres veces para que la Antigüedad dejara de proponerlo.
     */
    const enOtraEpoca: CandidatosDeEpoca = { ...lista, id: 'antiguedad', nombre: 'Antigüedad' };
    const { epoca } = cruzarEpoca(
      enOtraEpoca,
      new Set(),
      descartesPorCandidato([{ candidato: 'columela', motivo: 'tratado de agricultura' }]),
    );
    expect(epoca.descartados).toBe(1);
  });

  it('sembrado gana a descartado: quien está en el Corpus está sembrado', () => {
    // Descartar no es condenar. Si aparece obra suya con sentencia suelta, se siembra.
    const { candidatos } = cruzarEpoca(
      lista,
      new Set(['columela']),
      descartesPorCandidato([{ candidato: 'columela', motivo: 'lo dijimos antes' }]),
    );
    expect(candidatos.find((c) => c.slug === 'columela')?.estado).toBe('sembrado');
  });

  it('el último motivo escrito es el que vale', () => {
    const escritos = descartesPorCandidato([
      { candidato: 'euclides', motivo: 'primero' },
      { candidato: 'euclides', motivo: 'segundo, tras mirarlo mejor' },
    ]);
    expect(escritos.porSlug.get('euclides')).toBe('segundo, tras mirarlo mejor');
  });
});

// ── Escenario 3: la época terminada ──────────────────────────────────────────────────
describe('19.5 — una época terminada es una cuenta, no una opinión', () => {
  it('se declara terminada cuando todos están sembrados o descartados', () => {
    const hueco = huecoDeEpoca({
      id: 'catolicos',
      nombre: 'Autores católicos',
      candidatos: 8,
      sembrados: 5,
      descartados: 3,
    });
    expect(hueco.faltan).toBe(0);
    expect(hueco.terminada).toBe(true);
  });

  it('con uno pendiente NO está terminada', () => {
    const hueco = huecoDeEpoca({
      id: 'catolicos',
      nombre: 'Autores católicos',
      candidatos: 8,
      sembrados: 5,
      descartados: 2,
    });
    expect(hueco.faltan).toBe(1);
    expect(hueco.terminada).toBe(false);
  });

  it('una época sin candidatos no está terminada: está sin recuperar', () => {
    // Cero de cero da cero pendientes, y declararla terminada mandaría al bucle a la
    // siguiente sin haber sembrado nada.
    const hueco = huecoDeEpoca({ id: 'x', nombre: 'X', candidatos: 0, sembrados: 0, descartados: 0 });
    expect(hueco.faltan).toBe(0);
    expect(hueco.terminada).toBe(false);
  });

  it('un candidato sembrado y además descartado no deja `faltan` en negativo', () => {
    const hueco = huecoDeEpoca({ id: 'x', nombre: 'X', candidatos: 2, sembrados: 2, descartados: 1 });
    expect(hueco.faltan).toBe(0);
  });

  it('las terminadas se enseñan al final, y las que quedan de menos a más les falta', () => {
    const ordenadas = huecosDeEpocas([
      { id: 'antiguedad', nombre: 'Antigüedad', candidatos: 83, sembrados: 1, descartados: 0 },
      { id: 'catolicos', nombre: 'Autores católicos', candidatos: 8, sembrados: 8, descartados: 0 },
      { id: 'antigua-roma', nombre: 'Antigua Roma', candidatos: 63, sembrados: 60, descartados: 1 },
    ]);
    expect(ordenadas.map((e) => e.id)).toEqual(['antigua-roma', 'antiguedad', 'catolicos']);
    expect(ordenadas.at(-1)?.terminada).toBe(true);
  });

  it('la cobertura por época entra en el hueco, junto a la de Tema', () => {
    const huecos = verHuecos([], [], [], [], [], [
      { id: 'catolicos', nombre: 'Autores católicos', candidatos: 8, sembrados: 8, descartados: 0 },
    ]);
    expect(huecos.epocas).toHaveLength(1);
    expect(huecos.epocas[0].terminada).toBe(true);
    // Y sin épocas la vista sigue contestando: un corpus sin lista recuperada es normal.
    expect(verHuecos([], [], []).epocas).toEqual([]);
  });

  it('el hueco de época son cifras y un nombre de época, nunca un nombre de Autor', () => {
    // La regla de la 9.3 vale aquí igual: la vista informa la decisión y no la toma.
    const huecos = verHuecos([], [], [], [], [], [
      { id: 'antigua-roma', nombre: 'Antigua Roma', candidatos: 63, sembrados: 1, descartados: 0 },
    ]);
    expect(JSON.stringify(huecos.epocas)).not.toContain('Séneca');
    for (const [clave, valor] of Object.entries(huecos.epocas[0])) {
      /*
       * `recuperada` está exceptuada **nominalmente** y no por descuido: es una jornada en
       * AAAA-MM-DD, y una fecha no es un nombre de Autor. Está aquí porque sin ella
       * «TERMINADA» se imprime igual con una lista de hoy que con una de hace ocho meses.
       */
      if (clave === 'id' || clave === 'nombre' || clave === 'recuperada') continue;
      expect(typeof valor, clave).not.toBe('string');
    }
  });
});

// ── Escenario 6: sin la marca de la Fuente ───────────────────────────────────────────
describe('19.5 — DP-Autores-100 es señal, no permiso', () => {
  it('los pendientes sin la marca se separan para mirarlos a mano', () => {
    const { candidatos } = cruzarEpoca(
      {
        id: 'antigua-roma',
        nombre: 'Antigua Roma',
        categoria: ROMA.categoria,
        recuperada: '2026-09-06',
        candidatos: [
          { nombre: 'Con marca', slug: 'con-marca', pagina: 'x', dominioPublico: true },
          { nombre: 'Sin marca', slug: 'sin-marca', pagina: 'x', dominioPublico: false },
          { nombre: 'Sembrado sin marca', slug: 'sembrado', pagina: 'x', dominioPublico: false },
        ],
      },
      new Set(['sembrado']),
      descartesPorCandidato([]),
    );

    // Solo los pendientes: quien ya está dentro pasó la puerta y no hay nada que mirar.
    expect(pendientesSinMarca(candidatos).map((c) => c.slug)).toEqual(['sin-marca']);
  });

  it('la marca no admite a nadie: el cruce no la mira', () => {
    /*
     * Es lo que la historia llama «señal, no permiso». Si la marca admitiera, el estado de
     * un candidato con marca sería distinto del de uno sin ella, y no lo es: los dos están
     * pendientes hasta que el editor decida.
     */
    const conYSin = (dominioPublico: boolean) =>
      cruzarEpoca(
        {
          id: 'x',
          nombre: 'X',
          categoria: 'Categoría:X',
          recuperada: '2026-09-06',
          candidatos: [{ nombre: 'A', slug: 'a', pagina: 'x', dominioPublico }],
        },
        new Set(),
        descartesPorCandidato([]),
      ).candidatos[0].estado;

    expect(conYSin(true)).toBe('pendiente');
    expect(conYSin(false)).toBe('pendiente');
  });
});

// ── La lista versionada: se regenera, no se edita ────────────────────────────────────
describe('19.5 — la lista versionada', () => {
  it('la cabecera dice de dónde sale y que se regenera, no se edita', () => {
    expect(CABECERA_DE_CANDIDATOS).toMatch(/SE REGENERA, NO SE EDITA/);
    expect(CABECERA_DE_CANDIDATOS).toMatch(/categorías de Wikisource-es/);
    expect(CABECERA_DE_CANDIDATOS).toMatch(/DP-Autores-100/);
    // Y la del registro de descartes dice por qué añade en vez de reemplazar.
    expect(CABECERA_DE_DESCARTES).toMatch(/SOLO AÑADE/);
    expect(CABECERA_DE_DESCARTES).toMatch(/SIN MOTIVO NO HAY DESCARTE/);
  });

  it('la del repositorio es la misma que la constante', async () => {
    // Un corpus de pruebas y el de verdad tienen que decir lo mismo: la constante es la
    // que escribe el fichero cuando no existe.
    const enDisco = await readFile(resolve(RAIZ, 'corpus', FICHERO_DE_CANDIDATOS), 'utf8');
    expect(enDisco.startsWith(CABECERA_DE_CANDIDATOS.split('\nepocas:')[0])).toBe(true);
  });

  it('escribe la época y la relee con sus candidatos y sus marcas', async () => {
    const corpus = await corpusCon([]);
    const rutas = rutasDelCorpus(corpus);

    await registrarCandidatosPorEpoca(rutas, [
      {
        id: 'antigua-grecia',
        nombre: 'Antigua Grecia',
        categoria: GRECIA.categoria,
        recuperada: '2026-09-06',
        candidatos: [
          { nombre: 'Platón', slug: 'platon', pagina: 'https://x/1', dominioPublico: true },
          { nombre: 'Otro', slug: 'otro', pagina: 'https://x/2', dominioPublico: false },
        ],
      },
    ]);

    const releidas = await leerCandidatosPorEpoca(rutas);
    expect(releidas).toHaveLength(1);
    expect(releidas[0].candidatos).toHaveLength(2);
    // `false` se escribe: la ausencia de la marca es un dato, no una casilla sin rellenar.
    expect(releidas[0].candidatos?.find((c) => c.slug === 'otro')?.dominioPublico).toBe(false);
  });

  it('reemplaza la época recuperada y conserva las demás', async () => {
    const corpus = await corpusCon([]);
    const rutas = rutasDelCorpus(corpus);

    await registrarCandidatosPorEpoca(rutas, [
      { id: 'antigua-grecia', nombre: 'Antigua Grecia', categoria: GRECIA.categoria, recuperada: '2026-09-01', candidatos: [{ nombre: 'Platón', slug: 'platon', dominioPublico: true }] },
      { id: 'antigua-roma', nombre: 'Antigua Roma', categoria: ROMA.categoria, recuperada: '2026-09-01', candidatos: [{ nombre: 'Séneca', slug: 'seneca', dominioPublico: true }] },
    ]);

    await registrarCandidatosPorEpoca(rutas, [
      { id: 'antigua-grecia', nombre: 'Antigua Grecia', categoria: GRECIA.categoria, recuperada: '2026-09-06', candidatos: [{ nombre: 'Platón', slug: 'platon', dominioPublico: true }, { nombre: 'Homero', slug: 'homero', dominioPublico: true }] },
    ]);

    const releidas = await leerCandidatosPorEpoca(rutas);
    expect(releidas.map((e) => e.id)).toEqual(['antigua-grecia', 'antigua-roma']);
    expect(releidas.find((e) => e.id === 'antigua-grecia')?.candidatos).toHaveLength(2);
    // La que no se recuperó conserva su día: no se ha vuelto a preguntar por ella.
    expect(releidas.find((e) => e.id === 'antigua-roma')?.recuperada).toBe('2026-09-01');
  });

  it('un fichero sin la clave de raíz no se escribe a ciegas', async () => {
    const corpus = await corpusCon([]);
    const rutas = rutasDelCorpus(corpus);
    await writeFile(rutas.candidatosPorEpoca, '# solo una nota\n', 'utf8');
    await expect(
      registrarCandidatosPorEpoca(rutas, [{ id: 'antigua-grecia', candidatos: [] }]),
    ).rejects.toThrow(/epocas/);
  });

  it('sin épocas recuperadas no crea el fichero: no hay trabajo que enseñar', async () => {
    const corpus = await corpusCon([]);
    const rutas = rutasDelCorpus(corpus);
    await registrarCandidatosPorEpoca(rutas, []);
    expect(existsSync(rutas.candidatosPorEpoca)).toBe(false);
  });
});

// ── Escenario 4: el descarte con motivo ──────────────────────────────────────────────
describe('19.5 — un candidato que no da Citas se descarta con su motivo', () => {
  async function conListaVersionada(): Promise<string> {
    const corpus = await corpusCon([]);
    await registrarCandidatosPorEpoca(rutasDelCorpus(corpus), [
      {
        id: 'antigua-grecia',
        nombre: 'Antigua Grecia',
        categoria: GRECIA.categoria,
        recuperada: '2026-09-06',
        candidatos: [{ nombre: 'Euclides', slug: 'euclides', dominioPublico: true }],
      },
    ]);
    return corpus;
  }

  it('queda escrito en el registro, con fecha y época', async () => {
    const corpus = await conListaVersionada();
    const salida = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const codigo = await principal(
      ['--corpus', corpus, '--descartar', 'euclides', '--motivo', 'matemático: su prosa no da sentencia suelta'],
      async () => {
        throw new Error('descartar no sale a la red');
      },
      new Date(2026, 8, 6, 12, 0),
    );

    expect(codigo).toBe(0);
    expect(salida.mock.calls.join('')).toMatch(/Euclides/);

    const descartes = await leerDescartesDeCandidatos(rutasDelCorpus(corpus));
    expect(descartes).toHaveLength(1);
    expect(descartes[0]).toMatchObject({
      fecha: '2026-09-06',
      epoca: 'antigua-grecia',
      candidato: 'euclides',
      motivo: 'matemático: su prosa no da sentencia suelta',
    });
  });

  it('y entonces la época queda terminada, porque descartar no es saltarse', async () => {
    const corpus = await conListaVersionada();
    const rutas = rutasDelCorpus(corpus);
    await registrarDescarteDeCandidato(rutas, {
      candidato: 'euclides',
      motivo: 'matemático',
      fecha: '2026-09-06',
    });

    const versionadas = await leerCandidatosPorEpoca(rutas);
    const { epoca } = cruzarEpoca(
      {
        id: versionadas[0].id,
        nombre: versionadas[0].nombre ?? '',
        categoria: versionadas[0].categoria ?? '',
        recuperada: versionadas[0].recuperada ?? '',
        candidatos: (versionadas[0].candidatos ?? []).map((c) => ({
          nombre: c.nombre,
          slug: c.slug,
          pagina: c.pagina ?? '',
          dominioPublico: c.dominioPublico === true,
        })),
      },
      new Set(),
      descartesPorCandidato(await leerDescartesDeCandidatos(rutas)),
    );

    expect(huecoDeEpoca(epoca).terminada).toBe(true);
  });

  it('sin motivo no hay descarte, y sale con código de error', async () => {
    const corpus = await conListaVersionada();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const codigo = await principal(['--corpus', corpus, '--descartar', 'euclides'], async () => {
      throw new Error('no debería pedirse nada');
    });

    expect(codigo).toBe(1);
    expect(await leerDescartesDeCandidatos(rutasDelCorpus(corpus))).toEqual([]);
  });

  it('un motivo en blanco tampoco cuenta', async () => {
    const corpus = await corpusCon([]);
    await expect(
      registrarDescarteDeCandidato(rutasDelCorpus(corpus), {
        candidato: 'euclides',
        motivo: '   ',
      }),
    ).rejects.toThrow(/motivo/);
    expect(existsSync(join(corpus, FICHERO_DE_DESCARTES))).toBe(false);
  });

  it('no se descarta a quien no es candidato de ninguna época', async () => {
    const corpus = await conListaVersionada();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const codigo = await principal(
      ['--corpus', corpus, '--descartar', 'no-existe', '--motivo', 'por probar'],
      async () => {
        throw new Error('no debería pedirse nada');
      },
    );

    expect(codigo).toBe(1);
    expect(await leerDescartesDeCandidatos(rutasDelCorpus(corpus))).toEqual([]);
  });

  it('el registro solo añade: dos descartes son dos entradas', async () => {
    const corpus = await conListaVersionada();
    const rutas = rutasDelCorpus(corpus);
    await registrarDescarteDeCandidato(rutas, { candidato: 'euclides', motivo: 'uno' });
    await registrarDescarteDeCandidato(rutas, { candidato: 'euclides', motivo: 'dos' });
    const escrito = parsearYaml(await readFile(rutas.descartesDeCandidatos, 'utf8')) as {
      descartes: unknown[];
    };
    expect(escrito.descartes).toHaveLength(2);
  });
});

// ── Escenario 5: la Fuente no responde ───────────────────────────────────────────────
describe('19.5 — la Fuente caída no detiene el bucle', () => {
  it('trabaja con la lista versionada, lo dice, y no falla', async () => {
    const corpus = await corpusCon(['seneca']);
    const rutas = rutasDelCorpus(corpus);
    await registrarCandidatosPorEpoca(rutas, [
      {
        id: 'antigua-roma',
        nombre: 'Antigua Roma',
        categoria: ROMA.categoria,
        recuperada: '2026-09-01',
        candidatos: [
          { nombre: 'Séneca', slug: 'seneca', dominioPublico: true },
          { nombre: 'Cicerón', slug: 'ciceron', dominioPublico: true },
        ],
      },
    ]);

    const escrito: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((linea) => {
      escrito.push(String(linea));
      return true;
    });

    const codigo = await principal(
      ['--corpus', corpus, '--epoca', 'antigua-roma', '--registrar'],
      async () => {
        throw new Error('fetch failed');
      },
    );

    // No falla el bucle.
    expect(codigo).toBe(0);
    const salida = escrito.join('');
    expect(salida).toMatch(/no se actualizó/);
    expect(salida).toMatch(/lista versionada/);
    // Y la cuenta sale de lo versionado: Séneca está sembrado, Cicerón pendiente.
    expect(salida).toMatch(/ya sembrados en el Corpus:\s+1/);
    expect(salida).toMatch(/pendientes:\s+1/);

    // Lo versionado no se ha tocado: la fecha sigue siendo la de la última recuperación.
    const releidas = await leerCandidatosPorEpoca(rutas);
    expect(releidas[0].recuperada).toBe('2026-09-01');
  });

  it('una época que nunca se recuperó entra vacía y no como terminada', async () => {
    const corpus = await corpusCon([]);
    const escrito: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((linea) => {
      escrito.push(String(linea));
      return true;
    });

    // Un fallo definitivo y no pasajero: reintentar un 404 no cambia la respuesta, y lo que
    // esta prueba mira es la vuelta a lo versionado, no la racha.
    const codigo = await principal(['--corpus', corpus, '--epoca', 'catolicos'], async () => {
      throw new Error('Wikisource en español respondió 404 a la consulta de categoría.');
    });

    expect(codigo).toBe(0);
    const salida = escrito.join('');
    expect(salida).toMatch(/Sin candidatos/);
    expect(salida).not.toMatch(/ÉPOCA TERMINADA/);
    expect(existsSync(join(corpus, FICHERO_DE_CANDIDATOS))).toBe(false);
  });

  it('reintenta lo pasajero y se rinde a tiempo', async () => {
    let intentos = 0;
    const pedir: Pedir = async () => {
      intentos += 1;
      if (intentos < 3) {
        throw new FalloDeLaFuente('Wikisource en español respondió 503 a la consulta.', 503);
      }
      return respuesta([{ titulo: 'Autor:Platón' }]);
    };

    const candidatos = await recuperarEpoca(GRECIA, pedir, { esperar: async () => {} });
    expect(intentos).toBe(3);
    expect(candidatos.map((c) => c.slug)).toEqual(['platon']);
  });

  it('lo que no es pasajero no se reintenta', async () => {
    let intentos = 0;
    const pedir: Pedir = async () => {
      intentos += 1;
      throw new FalloDeLaFuente('Wikisource en español respondió 404 a la consulta.', 404);
    };

    await expect(recuperarEpoca(GRECIA, pedir, { esperar: async () => {} })).rejects.toThrow(/404/);
    expect(intentos).toBe(1);
  });
});

// ── La orden entera, y sus negativas ─────────────────────────────────────────────────
describe('19.5 — la orden', () => {
  it('recupera, cruza, versiona y lo cuenta', async () => {
    const corpus = await corpusCon(['seneca']);
    const escrito: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((linea) => {
      escrito.push(String(linea));
      return true;
    });

    const codigo = await principal(
      ['--corpus', corpus, '--epoca', 'antigua-roma', '--registrar'],
      async () => respuesta([{ titulo: 'Autor:Séneca' }, { titulo: 'Autor:Columela', dp: false }]),
      new Date(2026, 8, 6, 10, 0),
    );

    expect(codigo).toBe(0);
    const salida = escrito.join('');
    expect(salida).toMatch(/Candidatos de la Fuente:\s+2/);
    expect(salida).toMatch(/ya sembrados en el Corpus:\s+1/);
    expect(salida).toMatch(/Pendientes sin esa marca:\s+1/);
    expect(salida).toMatch(/Registrado en/);

    const releidas = await leerCandidatosPorEpoca(rutasDelCorpus(corpus));
    expect(releidas[0].recuperada).toBe('2026-09-06');
    expect(releidas[0].candidatos?.map((c) => c.slug)).toEqual(['columela', 'seneca']);
  });

  it('sin --registrar no escribe nada', async () => {
    const corpus = await corpusCon([]);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const codigo = await principal(['--corpus', corpus, '--epoca', 'catolicos'], async () =>
      respuesta([{ titulo: 'Autor:Tomás de Aquino' }]),
    );
    expect(codigo).toBe(0);
    expect(existsSync(join(corpus, FICHERO_DE_CANDIDATOS))).toBe(false);
  });

  it('no admite épocas que la Fuente no declare', async () => {
    const motivos: string[] = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((linea) => {
      motivos.push(String(linea));
      return true;
    });

    const codigo = await principal(['--epoca', 'el-siglo-de-oro'], async () => {
      throw new Error('no debería pedirse nada');
    });

    expect(codigo).toBe(1);
    expect(motivos.join('')).toMatch(/no es una época que la Fuente declare/);
  });

  it('un argumento con errata no hace lo de por omisión en silencio', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const codigo = await principal(['--registar'], async () => {
      throw new Error('no debería pedirse nada');
    });
    expect(codigo).toBe(1);
  });

  it('--motivo sin --descartar se rechaza en vez de ignorarse', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const codigo = await principal(['--motivo', 'algo'], async () => {
      throw new Error('no debería pedirse nada');
    });
    expect(codigo).toBe(1);
  });

  it('--ayuda no sale a la red', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const codigo = await principal(['--ayuda'], async () => {
      throw new Error('no debería pedirse nada');
    });
    expect(codigo).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────
// La revisión adversarial de la 19.5. Cada bloque de aquí abajo es un fallo medido, y la
// prueba lo reproduce antes de comprobar que ya no ocurre.
// ─────────────────────────────────────────────────────────────────────────────────────

describe('19.5 rev — una categoría renombrada no borra la lista versionada', () => {
  it('la respuesta sin «query» no se da por recuperación correcta', async () => {
    /*
     * Reproducido antes del arreglo: 30 candidatos → 0, código de salida 0, sin aviso. La
     * API contesta a una categoría inexistente igual que a una vacía, así que el lector la
     * tomaba por «cero candidatos, recuperación correcta» y `registrarCandidatosPorEpoca`
     * sustituía la entrada buena por una vacía sellada con la fecha de hoy.
     */
    await expect(recuperarEpoca(GRECIA, async () => SIN_QUERY)).rejects.toThrow(/no ha devuelto/);
  });

  it('y la orden lo cuenta como época no actualizada, sin tocar lo versionado', async () => {
    const corpus = await corpusCon([]);
    const rutas = rutasDelCorpus(corpus);
    await registrarCandidatosPorEpoca(rutas, [
      {
        id: 'antigua-grecia',
        nombre: 'Antigua Grecia',
        categoria: GRECIA.categoria,
        recuperada: '2026-09-06',
        candidatos: [
          { nombre: 'Platón', slug: 'platon', dominioPublico: true },
          { nombre: 'Homero', slug: 'homero', dominioPublico: true },
        ],
      },
    ]);

    const escrito: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((linea) => {
      escrito.push(String(linea));
      return true;
    });

    const codigo = await principal(
      ['--corpus', corpus, '--epoca', 'antigua-grecia', '--registrar'],
      async () => SIN_QUERY,
      new Date(2026, 8, 6, 12, 0),
    );

    expect(codigo).toBe(0);
    expect(escrito.join('')).toMatch(/no se actualizó/);

    // Lo versionado sigue entero: es lo único que impide dar la época por agotada.
    const releidas = await leerCandidatosPorEpoca(rutas);
    expect(releidas[0].candidatos).toHaveLength(2);
  });

  it('el escritor se niega, por su cuenta, a cambiar n candidatos por cero', async () => {
    /*
     * Red **independiente** del lector, y por eso vale: las dos comprobaciones que ya tenía
     * el escritor cotejan lo recuperado contra lo que va a disco —`0 === 0` pasa— y ninguna
     * mira contra lo que había.
     */
    const corpus = await corpusCon([]);
    const rutas = rutasDelCorpus(corpus);
    await registrarCandidatosPorEpoca(rutas, [
      { id: 'catolicos', nombre: 'Autores católicos', recuperada: '2026-09-01', candidatos: [{ nombre: 'Tomás de Aquino', slug: 'tomas-de-aquino', dominioPublico: true }] },
    ]);

    await expect(
      registrarCandidatosPorEpoca(rutas, [
        { id: 'catolicos', nombre: 'Autores católicos', recuperada: '2026-09-06', candidatos: [] },
      ]),
    ).rejects.toThrow(/mengua sola/);

    expect((await leerCandidatosPorEpoca(rutas))[0].candidatos).toHaveLength(1);
  });

  it('y con la bandera explícita sí, porque vaciar a propósito es un acto', async () => {
    const corpus = await corpusCon([]);
    const rutas = rutasDelCorpus(corpus);
    await registrarCandidatosPorEpoca(rutas, [
      { id: 'catolicos', nombre: 'Autores católicos', recuperada: '2026-09-01', candidatos: [{ nombre: 'Tomás de Aquino', slug: 'tomas-de-aquino', dominioPublico: true }] },
    ]);

    await registrarCandidatosPorEpoca(
      rutas,
      [{ id: 'catolicos', nombre: 'Autores católicos', recuperada: '2026-09-06', candidatos: [] }],
      { admitirVaciado: true },
    );
    expect((await leerCandidatosPorEpoca(rutas))[0].candidatos ?? []).toHaveLength(0);
  });
});

describe('19.5 rev — una continuación no se pierde por una salida temprana', () => {
  it('«continue» sin «query» es un error y no un fin de lista', () => {
    /*
     * Reproducido antes del arreglo: 50 de 63 devueltos como completos, sin excepción y sin
     * aviso. Las dos salidas tempranas leían `query` primero y descartaban `continue`, así
     * que quien llamaba veía `continuar === undefined` y daba la época por servida entera.
     */
    expect(() =>
      candidatosDeRespuesta({ batchcomplete: true, continue: { gcmcontinue: 'page|4239' } }),
    ).toThrow(/continuación/);
  });

  it('la continuación se devuelve siempre, venga con páginas o sin ellas', () => {
    const leida = candidatosDeRespuesta(
      respuesta([{ titulo: 'Autor:Homero' }], { gcmcontinue: 'page|4239' }),
    );
    expect(leida.continuar).toEqual({ gcmcontinue: 'page|4239' });
    expect(leida.respondio).toBe(true);
  });

  it('una época servida a medias no se da por completa', async () => {
    let pedidas = 0;
    const pedir: Pedir = async () => {
      pedidas += 1;
      // La segunda página promete continuación y no trae su trozo: la lista queda partida.
      return pedidas === 1
        ? respuesta([{ titulo: 'Autor:Homero' }], { gcmcontinue: 'page|1' })
        : { batchcomplete: true, continue: { gcmcontinue: 'page|2' } };
    };
    await expect(recuperarEpoca(GRECIA, pedir)).rejects.toThrow(/continuación/);
  });
});

describe('19.5 rev — el objetivo de la sesión sale también de la época', () => {
  const CON_TODO_EN_ORDEN = [
    { slug: 'a', nombre: 'A', tradicion: 'latinoamericana' as const },
    { slug: 'b', nombre: 'B', tradicion: 'latinoamericana' as const },
  ];

  it('sin Tema corto y con época pendiente, el objetivo es agotarla', () => {
    const huecos = verHuecos([], [], CON_TODO_EN_ORDEN, [], [], [
      { id: 'antigua-roma', nombre: 'Antigua Roma', candidatos: 63, sembrados: 60, descartados: 1 },
    ]);
    const objetivo = objetivoDeSesion(huecos);
    expect(objetivo.clase).toBe('epoca');
    expect(objetivo.epoca?.faltan).toBe(2);
    expect(objetivo.objetivo).toContain('Antigua Roma');
    // El informe no entrecomilla nada que no sea un nombre de Tema (regla de la 9.3).
    expect(`${objetivo.objetivo} ${objetivo.hueco}`).not.toMatch(/«/u);
  });

  it('con todas las épocas agotadas vuelve a decir que no hay hueco', () => {
    const huecos = verHuecos([], [], CON_TODO_EN_ORDEN, [], [], [
      { id: 'catolicos', nombre: 'Autores católicos', candidatos: 8, sembrados: 8, descartados: 0 },
    ]);
    expect(objetivoDeSesion(huecos).clase).toBe('ninguno');
  });

  it('el informe no puede decir «82 pendientes» y «no hay hueco» a la vez', () => {
    /*
     * Es la contradicción medida: el bloque de cobertura decía 82 pendientes y cuatro líneas
     * más abajo «No hay hueco que cerrar» y «Meta de Corpus alcanzada». Dos respuestas a la
     * misma pregunta en el mismo informe es la divergencia que AD-11 existe para impedir.
     */
    const huecos = verHuecos([], [], CON_TODO_EN_ORDEN, [], [], [
      { id: 'antiguedad', nombre: 'Antigüedad', candidatos: 83, sembrados: 1, descartados: 0 },
    ]);
    const meta = objetivoDeMeta(verMeta([], [], [], huecos));
    expect(objetivoDeSesion(huecos).clase).toBe('epoca');
    expect(meta.clase).not.toBe('alcanzada');
    expect(meta.meta.alcanzada).toBe(false);
    expect(meta.meta.epocas).toEqual({ epocas: 1, terminadas: 0, faltan: 82 });
  });

  it('y sin épocas versionadas la meta no se declara alcanzada a ciegas', () => {
    // Sin lista recuperada no hay cobertura que contar, así que no bloquea; pero lo dice.
    const huecos = verHuecos([], [], CON_TODO_EN_ORDEN);
    const meta = objetivoDeMeta(verMeta([], [], [], huecos));
    expect(meta.meta.epocas).toEqual({ epocas: 0, terminadas: 0, faltan: 0 });
  });
});

describe('19.5 rev — la edad de la lista se ve', () => {
  it('cuenta los días entre dos jornadas, meses de por medio', () => {
    expect(diasDesdeLaRecuperacion('2026-09-06', '2026-09-06')).toBe(0);
    expect(diasDesdeLaRecuperacion('2026-08-31', '2026-09-01')).toBe(1);
    // Diciembre a enero: el mes de `Date.UTC` va de 0 a 11 y la jornada escrita de 1 a 12.
    expect(diasDesdeLaRecuperacion('2025-12-31', '2026-01-01')).toBe(1);
    expect(diasDesdeLaRecuperacion(undefined, '2026-09-06')).toBeUndefined();
    expect(diasDesdeLaRecuperacion('', '2026-09-06')).toBeUndefined();
  });

  it('una lista sin fecha se trata como caducada: no consta de cuándo es', () => {
    expect(listaCaducada(undefined, '2026-09-06')).toBe(true);
    expect(listaCaducada('2026-09-06', '2026-09-06')).toBe(false);
    expect(listaCaducada('2026-01-01', '2026-09-06')).toBe(true);
  });

  it('la fecha de recuperación llega hasta el hueco', () => {
    const [hueco] = huecosDeEpocas([
      { id: 'catolicos', nombre: 'Autores católicos', candidatos: 8, sembrados: 1, descartados: 0, recuperada: '2026-09-06' },
    ]);
    expect(hueco.recuperada).toBe('2026-09-06');
  });

  it('el informe de la orden avisa cuando la lista versionada pasó del plazo', async () => {
    const corpus = await corpusCon([]);
    await registrarCandidatosPorEpoca(rutasDelCorpus(corpus), [
      {
        id: 'catolicos',
        nombre: 'Autores católicos',
        categoria: 'Categoría:Autores católicos',
        recuperada: '2026-01-01',
        candidatos: [{ nombre: 'Tomás de Aquino', slug: 'tomas-de-aquino', dominioPublico: true }],
      },
    ]);

    const escrito: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((linea) => {
      escrito.push(String(linea));
      return true;
    });

    await principal(
      ['--corpus', corpus, '--epoca', 'catolicos'],
      async () => {
        throw new Error('fetch failed');
      },
      new Date(2026, 8, 6, 12, 0),
    );

    const salida = escrito.join('');
    expect(salida).toMatch(/LISTA DE HACE \d+ DÍAS/);
    expect(salida).toMatch(new RegExp(String(DIAS_DE_VIGENCIA_DE_LA_LISTA)));
    expect(salida).toMatch(/epocas:registrar/);
  });
});

describe('19.5 rev — el cruce consulta el alias del fichero de Autor', () => {
  it('un Autor que la Fuente titula de otro modo cuenta como sembrado', () => {
    /*
     * Medido el 2026-09-06 en la API: Wikisource titula «Autor:Santa Teresa de Jesús» y el
     * Corpus tiene `teresa-de-jesus.yml`. Sin el alias se daría por pendiente estando
     * sembrada, y esa época no podría terminarse nunca.
     */
    const sembrados = slugsSembrados([
      { slug: 'teresa-de-jesus', tituloEnFuente: 'Santa Teresa de Jesús' },
    ]);
    expect(sembrados.has('santa-teresa-de-jesus')).toBe(true);
    expect(sembrados.has('teresa-de-jesus')).toBe(true);

    const { epoca } = cruzarEpoca(
      {
        id: 'catolicos',
        nombre: 'Autores católicos',
        categoria: 'Categoría:Autores católicos',
        recuperada: '2026-09-06',
        candidatos: [
          {
            nombre: 'Santa Teresa de Jesús',
            slug: 'santa-teresa-de-jesus',
            pagina: 'x',
            dominioPublico: true,
          },
        ],
      },
      sembrados,
      descartesPorCandidato([]),
    );
    expect(huecoDeEpoca(epoca).terminada).toBe(true);
  });

  it('sin alias, el mismo caso se contaría como pendiente — que es el fallo', () => {
    const sinAlias = slugsSembrados([{ slug: 'teresa-de-jesus' }]);
    expect(sinAlias.has('santa-teresa-de-jesus')).toBe(false);
  });

  it('y el alias está escrito en el fichero del Autor, no adivinado', async () => {
    const teresa = await readFile(resolve(RAIZ, 'corpus/autores/teresa-de-jesus.yml'), 'utf8');
    expect(teresa).toMatch(/tituloEnFuente:\s*"Santa Teresa de Jesús"/u);
  });
});

describe('19.5 rev — el adaptador de la lista versionada tiene un solo dueño', () => {
  it('devuelve la época a la forma con la que se cruza, y completa lo que falte', () => {
    const lista = listaDeEpocaRegistrada({
      id: 'antigua-roma',
      candidatos: [{ nombre: 'Séneca', slug: 'seneca', idDePagina: 42 }],
    });
    // Lo que no está escrito se completa con lo que la Fuente declara.
    expect(lista.nombre).toBe('Antigua Roma');
    expect(lista.categoria).toBe(ROMA.categoria);
    expect(lista.candidatos[0]).toMatchObject({ slug: 'seneca', idDePagina: 42, pagina: '' });
  });

  it('las dos órdenes cuentan lo mismo del mismo fichero', async () => {
    /*
     * `tools/epocas.ts` y `tools/huecos.ts` tenían el adaptador escrito línea a línea cada
     * una. Ahora las dos pasan por `epocasParaHuecos`, y esta prueba fija la propiedad que
     * importaba: mismo fichero, misma cuenta.
     */
    const corpus = await corpusCon(['seneca']);
    const rutas = rutasDelCorpus(corpus);
    await registrarCandidatosPorEpoca(rutas, [
      {
        id: 'antigua-roma',
        nombre: 'Antigua Roma',
        categoria: ROMA.categoria,
        recuperada: '2026-09-06',
        candidatos: [
          { nombre: 'Séneca', slug: 'seneca', dominioPublico: true },
          { nombre: 'Cicerón', slug: 'ciceron', dominioPublico: true },
        ],
      },
    ]);

    const [porLaVista] = epocasParaHuecos(
      await leerCandidatosPorEpoca(rutas),
      [{ slug: 'seneca' }],
      await leerDescartesDeCandidatos(rutas),
    );
    expect(huecoDeEpoca(porLaVista)).toMatchObject({ candidatos: 2, sembrados: 1, faltan: 1 });
  });
});

describe('19.5 rev — el descarte se cruza por la clave que no se mueve', () => {
  it('un candidato renombrado en la Fuente sigue descartado', () => {
    /*
     * El registro guarda el `pageid`, que la consulta ya recibía y el lector tiraba. Con el
     * slug de única clave, mover «Autor:Apolodoro de Atenas» a «Autor:Apolodoro» descasaba el
     * descarte y devolvía el candidato a pendientes — el bucle que el registro corta.
     */
    const escritos = descartesPorCandidato([
      { candidato: 'apolodoro-de-atenas', idDePagina: 4239, motivo: 'mitógrafo: no da sentencia' },
    ]);
    const { candidatos } = cruzarEpoca(
      {
        id: 'antigua-grecia',
        nombre: 'Antigua Grecia',
        categoria: GRECIA.categoria,
        recuperada: '2026-09-06',
        candidatos: [
          { nombre: 'Apolodoro', slug: 'apolodoro', idDePagina: 4239, pagina: 'x', dominioPublico: true },
        ],
      },
      new Set(),
      escritos,
    );
    expect(candidatos[0].estado).toBe('descartado');
  });

  it('y el slug sigue valiendo de reserva para los descartes ya escritos sin él', () => {
    const escritos = descartesPorCandidato([{ candidato: 'euclides', motivo: 'matemático' }]);
    const { candidatos } = cruzarEpoca(
      {
        id: 'antigua-grecia',
        nombre: 'Antigua Grecia',
        categoria: GRECIA.categoria,
        recuperada: '2026-09-06',
        candidatos: [
          { nombre: 'Euclides', slug: 'euclides', idDePagina: 99, pagina: 'x', dominioPublico: true },
        ],
      },
      new Set(),
      escritos,
    );
    expect(candidatos[0].estado).toBe('descartado');
  });

  it('el identificador se recupera de la Fuente y se versiona', async () => {
    const corpus = await corpusCon([]);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await principal(
      ['--corpus', corpus, '--epoca', 'catolicos', '--registrar'],
      async () => respuesta([{ titulo: 'Autor:Tomás de Aquino' }]),
      new Date(2026, 8, 6, 10, 0),
    );
    const releidas = await leerCandidatosPorEpoca(rutasDelCorpus(corpus));
    expect(releidas[0].candidatos?.[0].idDePagina).toBe(100);
  });

  it('y el descarte lo escribe junto al slug', async () => {
    const corpus = await corpusCon([]);
    const rutas = rutasDelCorpus(corpus);
    await registrarCandidatosPorEpoca(rutas, [
      {
        id: 'antigua-grecia',
        nombre: 'Antigua Grecia',
        recuperada: '2026-09-06',
        candidatos: [
          { nombre: 'Euclides', slug: 'euclides', idDePagina: 4321, dominioPublico: true },
        ],
      },
    ]);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await principal(
      ['--corpus', corpus, '--descartar', 'euclides', '--motivo', 'matemático'],
      async () => {
        throw new Error('descartar no sale a la red');
      },
      new Date(2026, 8, 6, 12, 0),
    );

    const [descarte] = await leerDescartesDeCandidatos(rutas);
    expect(descarte).toMatchObject({ candidato: 'euclides', idDePagina: 4321 });
  });
});

describe('19.5 rev — lo pasajero se clasifica por causa, no por el texto del mensaje', () => {
  /** El corte propio de `AbortSignal.timeout`, con su nombre real. */
  function tiempoAgotado(): Error {
    const fallo = new Error('The operation was aborted due to timeout');
    fallo.name = 'TimeoutError';
    return fallo;
  }

  it('un tiempo de espera agotado SÍ se reintenta, que es lo que el comentario prometía', async () => {
    let intentos = 0;
    const pedir: Pedir = async () => {
      intentos += 1;
      if (intentos < 2) throw tiempoAgotado();
      return respuesta([{ titulo: 'Autor:Platón' }]);
    };
    const candidatos = await recuperarEpoca(GRECIA, pedir, { esperar: async () => {} });
    expect(intentos).toBe(2);
    expect(candidatos.map((c) => c.slug)).toEqual(['platon']);
  });

  it('y la capa de red por debajo de fetch, por su código y no por su frase', async () => {
    let intentos = 0;
    const pedir: Pedir = async () => {
      intentos += 1;
      if (intentos < 2) {
        throw new TypeError('fetch failed', { cause: Object.assign(new Error('x'), { code: 'ECONNRESET' }) });
      }
      return respuesta([{ titulo: 'Autor:Platón' }]);
    };
    await recuperarEpoca(GRECIA, pedir, { esperar: async () => {} });
    expect(intentos).toBe(2);
  });

  it('un fallo nuestro, anterior a pedir nada, no se reintenta', async () => {
    let intentos = 0;
    const pedir: Pedir = async () => {
      intentos += 1;
      throw new FalloDeLaFuente('«x» no pertenece a ninguna Fuente admitida.');
    };
    await expect(recuperarEpoca(GRECIA, pedir, { esperar: async () => {} })).rejects.toThrow();
    expect(intentos).toBe(1);
  });
});

describe('19.5 rev — la Fuente de las épocas se revalida contra ella misma', () => {
  it('la dirección de consulta es de la Fuente declarada, y no de otra admitida', () => {
    // La constante existía, estaba documentada y no la usaba nadie: su comentario prometía
    // una revalidación que no ocurría.
    expect(fuenteDeUrl(direccionDeCategoria(GRECIA))?.id).toBe(FUENTE_DE_LAS_EPOCAS);
  });

  it('una dirección de otra Fuente admitida se rechaza antes de pedir nada', async () => {
    const { pedirALaFuente } = await import('../../tools/epocas.ts');
    await expect(pedirALaFuente('https://www.gutenberg.org/ebooks/1')).rejects.toThrow(
      /las épocas salen de/,
    );
  });
});

describe('19.5 rev — las banderas incompatibles no se ignoran en silencio', () => {
  it('--descartar junto a --registrar se rechaza en vez de escribir la mitad', async () => {
    const corpus = await corpusCon([]);
    const motivos: string[] = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((linea) => {
      motivos.push(String(linea));
      return true;
    });

    const codigo = await principal(
      ['--corpus', corpus, '--descartar', 'euclides', '--motivo', 'x', '--registrar'],
      async () => {
        throw new Error('no debería pedirse nada');
      },
    );

    expect(codigo).toBe(1);
    expect(motivos.join('')).toMatch(/no se combina/);
    // Y no se escribe nada de ninguno de los dos registros.
    expect(existsSync(join(corpus, FICHERO_DE_DESCARTES))).toBe(false);
    expect(existsSync(join(corpus, FICHERO_DE_CANDIDATOS))).toBe(false);
  });

  it('--descartar junto a --epoca, lo mismo', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const codigo = await principal(
      ['--descartar', 'euclides', '--motivo', 'x', '--epoca', 'catolicos'],
      async () => {
        throw new Error('no debería pedirse nada');
      },
    );
    expect(codigo).toBe(1);
  });
});
