import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { formaDeObra } from '../../src/lib/obras.ts';
import { rutaNormalizada } from '../../src/lib/superficies.ts';
import {
  CAMPOS_QUE_NO_FECHAN,
  type Campo,
  CAMPOS_QUE_PINTA,
  CUALQUIER_CAMBIO,
  FICHERO_DE_LOS_UMBRALES,
  NOMBRE_EN_REFERENCIA,
  derechosEnLosUmbrales,
  versionDeUmbrales,
  VERSION_OPACA,
  bajasDelHistorial,
  relacionDeSuperficies,
  cambiaronLosCampos,
  coberturaInsuficiente,
  componentesPorSuperficie,
  fechaDeLaEntrada,
  fechaDeLosComponentes,
  fechasPorSuperficie,
  type CorpusParaFechar,
  type Historial,
  type TransicionFechada,
  type Version,
} from '../../tools/lib/cambios.ts';
import { componerAviso, familiaDeFichero, rutasAvisadasPor } from '../../tools/lib/avisar.ts';
import {
  autorAdmisible,
  citaAdmisible,
  coleccionAdmisible,
  esquemaDeObra,
  personajeAdmisible,
} from '../../src/lib/admision.ts';
import {
  corpusParaFechar,
  estadoDelRepositorio,
  fechasDeLasSuperficies,
  historialDeLosFicheros,
} from '../../integraciones/historial.ts';
import { componerVigentes, nombreDeDocumentoDeWikidata } from '../../tools/lib/wikidata.ts';
import { aEntidad, documento, entidad, sembrarWikidata } from './ayuda/wikidata.ts';

const ejecutar = promisify(execFile);

/** Los ficheros que componen cada superficie, por ruta normalizada: la relación sin sus campos. */
function ficherosPorSuperficie(corpus: CorpusParaFechar): Map<string, string[]> {
  return new Map(
    [...componentesPorSuperficie(corpus)].map(([ruta, componentes]) => [
      ruta,
      componentes.map((componente) => componente.fichero),
    ]),
  );
}

/**
 * Un historial en que cada fichero solo tiene su alta, en la fecha dada. Un alta cambia todos
 * los campos, así que con él la fecha de una superficie es la más reciente de sus ficheros: la
 * regla de la 18.4, que la 24.8 conserva para todo lo que no sea un cambio de campos.
 */
function historialDeAltas(fechas: Iterable<readonly [string, string]>): Historial {
  return new Map([...fechas].map(([fichero, fecha]) => [fichero, [{ fecha, antes: null, despues: {} }]]));
}

/** `fechasPorSuperficie` con un historial de altas: la forma de las pruebas de la 18.4. */
function fechasConAltas(corpus: CorpusParaFechar, fechas: Iterable<readonly [string, string]>) {
  return fechasPorSuperficie(corpus, historialDeAltas(fechas));
}

/** La fecha más reciente de las transiciones de un fichero, como la lee el sitemap. */
function ultimaFecha(historial: Historial, fichero: string): string | undefined {
  return (historial.get(fichero) ?? []).reduce<string | undefined>(
    (max, t) => (max === undefined || t.fecha > max ? t.fecha : max),
    undefined,
  );
}

/**
 * Historia 18.4 — el sitemap dice qué cambió y cuándo.
 *
 * Dos planos, y el segundo es el que de verdad falla. Arriba, la composición: de qué
 * ficheros depende cada superficie y qué pasa cuando no se sabe la fecha de alguno; es
 * puro, así que se prueba sin repositorio. Abajo, la lectura del historial contra un git de
 * verdad, porque los dos modos de fallo de esta historia —el checkout superficial que
 * devuelve el árbol entero fechado hoy, y el `git log` que sale con código 0 y sin una sola
 * línea— no se pueden fingir con un doble: hay que montar el repositorio y mirar qué
 * contesta.
 */

const CORPUS: CorpusParaFechar = {
  citas: [
    { slug: 'seneca-el-tiempo', autor: 'seneca', temas: ['el-tiempo'], ruta: 'citas/a.md' },
    { slug: 'seneca-la-vida', autor: 'seneca', temas: ['el-tiempo', 'la-vida'], ruta: 'citas/b.md' },
    { slug: 'marco-aurelio-el-deber', autor: 'marco-aurelio', temas: [], ruta: 'citas/c.md' },
  ],
  autores: [
    { slug: 'seneca', ruta: 'autores/seneca.yml' },
    { slug: 'marco-aurelio', ruta: 'autores/marco-aurelio.yml' },
  ],
  temas: [
    { slug: 'el-tiempo', ruta: 'temas/el-tiempo.yml' },
    { slug: 'la-vida', ruta: 'temas/la-vida.yml' },
  ],
  colecciones: [
    {
      slug: 'breves',
      // El tercer miembro no resuelve: es el caso normal de una Cita retirada a revisión.
      miembros: ['seneca-el-tiempo', 'marco-aurelio-el-deber', 'no-existe'],
      ruta: 'colecciones/breves.yml',
    },
  ],
};

describe('Historia 18.4 — de qué ficheros depende cada superficie', () => {
  it('una Página de Cita depende de su fichero, **del de su Autor y de los de sus Temas**', () => {
    // La plantilla recibe `autor` de su `getStaticPaths` y compone con `autor.nombre` el
    // título, la meta descripción y el `application/ld+json`. Sin el fichero del Autor,
    // corregir una semblanza reconstruye ciento y pico páginas con HTML distinto y todas
    // declaran una fecha de hace meses: la misma quema de señal, en la dirección rancia.
    // Historia 22.8: los chips de `RutasDeSalida` pintan el nombre de cada Tema, así que su
    // fichero también es parte de la página — el aviso ya lo sabía, la fecha no.
    const ficheros = ficherosPorSuperficie(CORPUS);
    expect(ficheros.get('/cita/seneca-el-tiempo')?.sort()).toEqual(
      ['citas/a.md', 'autores/seneca.yml', 'temas/el-tiempo.yml'].sort(),
    );
    // Sin Temas, solo los dos.
    expect(ficheros.get('/cita/marco-aurelio-el-deber')?.sort()).toEqual(
      ['citas/c.md', 'autores/marco-aurelio.yml'].sort(),
    );
  });

  it('una Página de Autor agrega su fichero y el de sus Citas', () => {
    const ficheros = ficherosPorSuperficie(CORPUS);
    expect(ficheros.get('/autor/seneca')?.sort()).toEqual(
      ['autores/seneca.yml', 'citas/a.md', 'citas/b.md'].sort(),
    );
  });

  it('una Página de Tema agrega las Citas que lo declaran **y los Autores que renderiza**', () => {
    // Cada tarjeta del listado lleva el nombre del Autor —`TarjetaDeCita`, con
    // `autores.get(cita.autor)`—, así que renombrar un Autor cambia el HTML del listado.
    const ficheros = ficherosPorSuperficie(CORPUS);
    expect(ficheros.get('/tema/la-vida')?.sort()).toEqual(
      ['temas/la-vida.yml', 'citas/b.md', 'autores/seneca.yml'].sort(),
    );
  });

  it('una Página de Colección agrega los miembros que resuelven y sus Autores, y el que no resuelve no rompe', () => {
    const ficheros = ficherosPorSuperficie(CORPUS);
    expect(ficheros.get('/coleccion/breves')?.sort()).toEqual(
      [
        'colecciones/breves.yml',
        'citas/a.md',
        'citas/c.md',
        'autores/seneca.yml',
        'autores/marco-aurelio.yml',
      ].sort(),
    );
  });

  it('la portada **no se declara**: es la única URL que cambia a diario sin commit', () => {
    // No es un olvido, es la regla de la historia aplicada a la superficie más incómoda.
    // AD-12 rota la Cita del Día sin que nadie commitee nada, así que cualquier fecha que
    // el historial sepa dar es vieja el día que se publica, y lo sería justo en la URL a la
    // que el buscador entra a diario. Ausencia antes que centinela, y antes que dato rancio.
    // Y no vale el descargo de `tools/avisar.ts`: ese canal es IndexNow, no Google.
    expect(ficherosPorSuperficie(CORPUS).has('/')).toBe(false);
    expect(fechasConAltas(CORPUS, new Map([['citas/a.md', '2026-02-02T00:00:00.000Z']])).has('/')).toBe(
      false,
    );
  });

  it('las rutas salen de los constructores, con la forma que el sitemap reconoce', () => {
    // Escritas a mano ya se desviaron una vez —`tools/avisar.ts` lo cuenta— y el fallo no
    // rompe nada: la fecha simplemente no casa con ninguna entrada y desaparece.
    const rutas = [...ficherosPorSuperficie(CORPUS).keys()];
    expect(rutas).toContain('/cita/seneca-la-vida');
    expect(rutas).toContain('/autor/marco-aurelio');
    expect(rutas).toContain('/tema/el-tiempo');
    expect(rutas).toContain('/coleccion/breves');
  });
});

describe('Historia 18.4 — la fecha de una superficie es la más reciente de lo que agrega', () => {
  it('la de un listado es la del cambio más nuevo, venga del fichero o de una Cita', () => {
    const fechas = fechasConAltas(
      CORPUS,
      new Map([
        ['autores/seneca.yml', '2026-01-01T00:00:00.000Z'],
        ['citas/a.md', '2026-03-15T00:00:00.000Z'],
        ['citas/b.md', '2026-02-02T00:00:00.000Z'],
      ]),
    );
    expect(fechas.get('/autor/seneca')).toBe('2026-03-15T00:00:00.000Z');
  });

  it('el fichero propio gana cuando es el más nuevo', () => {
    const fechas = fechasConAltas(
      CORPUS,
      new Map([
        ['temas/el-tiempo.yml', '2026-04-01T00:00:00.000Z'],
        ['citas/a.md', '2026-03-15T00:00:00.000Z'],
        ['citas/b.md', '2026-02-02T00:00:00.000Z'],
      ]),
    );
    expect(fechas.get('/tema/el-tiempo')).toBe('2026-04-01T00:00:00.000Z');
  });

  it('retocar un Autor mueve la fecha de sus Páginas de Cita, que es lo que el HTML hace', () => {
    const fechas = fechasConAltas(
      CORPUS,
      new Map([
        ['citas/a.md', '2026-01-01T00:00:00.000Z'],
        ['autores/seneca.yml', '2026-05-05T00:00:00.000Z'],
      ]),
    );
    expect(fechas.get('/cita/seneca-el-tiempo')).toBe('2026-05-05T00:00:00.000Z');
    // Y la inflación queda acotada: la Cita del otro Autor no se entera de nada.
    expect(fechas.has('/cita/marco-aurelio-el-deber')).toBe(false);
  });

  it('un fichero sin fecha no arrastra a los que sí la tienen', () => {
    // Una Cita recién escrita y todavía sin commit no puede borrar la fecha del Tema que la
    // agrega: lo único que no hace es adelantarla.
    const fechas = fechasConAltas(
      CORPUS,
      new Map([
        ['temas/el-tiempo.yml', '2026-01-01T00:00:00.000Z'],
        ['citas/a.md', '2026-02-02T00:00:00.000Z'],
      ]),
    );
    expect(fechas.get('/tema/el-tiempo')).toBe('2026-02-02T00:00:00.000Z');
  });

  it('una superficie sin ninguna fecha conocida se omite, y las demás conservan la suya', () => {
    // La fila «Fecha indeterminable» de la matriz: se omite el campo, jamás un centinela.
    const fechas = fechasConAltas(CORPUS, new Map([['citas/c.md', '2026-02-02T00:00:00.000Z']]));
    expect(fechas.has('/cita/seneca-el-tiempo')).toBe(false);
    expect(fechas.has('/autor/seneca')).toBe(false);
    expect(fechas.get('/cita/marco-aurelio-el-deber')).toBe('2026-02-02T00:00:00.000Z');
  });

  it('sin ninguna fecha no se inventa ninguna: el mapa sale vacío', () => {
    expect(fechasPorSuperficie(CORPUS, new Map()).size).toBe(0);
  });

  it('la más reciente de una lista vacía es la ausencia, no una época ni una cadena', () => {
    expect(fechaDeLosComponentes([], new Map())).toBeUndefined();
    expect(fechaDeLosComponentes([{ fichero: 'citas/a.md', campos: ['texto'] }], new Map())).toBeUndefined();
  });

  it('el mismo corpus y las mismas fechas dan el mismo mapa: la derivación es pura', () => {
    // «Dos construcciones del mismo commit dan las mismas fechas» se apoya en esto, y esta
    // mitad se puede fijar sin construir nada.
    const fechas = new Map([
      ['citas/a.md', '2026-03-15T00:00:00.000Z'],
      ['autores/seneca.yml', '2026-01-01T00:00:00.000Z'],
    ]);
    expect([...fechasConAltas(CORPUS, fechas)]).toEqual([...fechasConAltas(CORPUS, fechas)]);
  });
});

// ─── Historia 24.8 — la relación por campos ──────────────────────────────────────────

describe('Historia 24.8 — el comparador de una transición', () => {
  it('un campo ausente es `undefined`, y el orden de las claves no cuenta', () => {
    expect(cambiaronLosCampos({ antes: { a: 1 }, despues: { a: 1, b: undefined } }, ['a', 'b'])).toBe(false);
    expect(
      cambiaronLosCampos(
        { antes: { procedencia: { obra: 'O', año: 1 } }, despues: { procedencia: { año: 1, obra: 'O' } } },
        ['procedencia'],
      ),
    ).toBe(false);
    expect(
      cambiaronLosCampos(
        { antes: { procedencia: { obra: 'O' } }, despues: { procedencia: { obra: 'O', año: 2 } } },
        ['procedencia'],
      ),
    ).toBe(true);
  });

  it('un campo que no está en la lista no cuenta', () => {
    expect(cambiaronLosCampos({ antes: { texto: 'a', aptaParaPortada: false }, despues: { texto: 'a', aptaParaPortada: true } }, ['texto'])).toBe(false);
  });

  it('un alta, una baja, una versión opaca y «cualquier cambio» cuentan siempre', () => {
    expect(cambiaronLosCampos({ antes: null, despues: { texto: 'a' } }, ['texto'])).toBe(true);
    expect(cambiaronLosCampos({ antes: { texto: 'a' }, despues: null }, ['texto'])).toBe(true);
    expect(cambiaronLosCampos({ antes: VERSION_OPACA, despues: { texto: 'a' } }, ['texto'])).toBe(true);
    expect(cambiaronLosCampos({ antes: { texto: 'a' }, despues: VERSION_OPACA }, [])).toBe(true);
    expect(cambiaronLosCampos({ antes: VERSION_OPACA, despues: VERSION_OPACA }, CUALQUIER_CAMBIO)).toBe(true);
  });
});

/**
 * La prueba de clasificación: cada clave de los esquemas está en alguna lista de la tabla o en la
 * de los que no fechan, y ninguna lista nombra una clave que no exista. Así un campo nuevo —el
 * `ordenAlfabetico` de la 26.1— no puede quedar fuera en silencio, y un nombre mal escrito en la
 * tabla, que nunca fecharía nada, tampoco.
 */
/**
 * Las claves del `z.object({…})` literal con que `src/content.config.ts` declara el esquema de una
 * colección — el que el build aplica de verdad. `citas`, `autores` y `temas` no reusan un objeto
 * de `admision.ts` (las referencias de Astro no caben en un módulo puro, y el de Tema nunca se
 * escribió), así que una clave añadida solo ahí escaparía a la clasificación si se leyera solo
 * `admision.ts`. Se lee el árbol sintáctico, no el módulo: `astro:content` no se carga fuera de
 * Astro. Una colección cuyo esquema no es un literal devuelve `undefined`.
 */
function clavesDeLaColeccion(coleccion: string): string[] | undefined {
  const ruta = resolve(import.meta.dirname, '../../src/content.config.ts');
  const fuente = ts.createSourceFile(ruta, readFileSync(ruta, 'utf8'), ts.ScriptTarget.Latest, true);
  let claves: string[] | undefined;
  const visitar = (nodo: ts.Node): void => {
    if (
      ts.isVariableDeclaration(nodo) &&
      ts.isIdentifier(nodo.name) &&
      nodo.name.text === coleccion &&
      nodo.initializer !== undefined &&
      ts.isCallExpression(nodo.initializer)
    ) {
      const [argumento] = nodo.initializer.arguments;
      if (argumento === undefined || !ts.isObjectLiteralExpression(argumento)) return;
      for (const propiedad of argumento.properties) {
        if (!ts.isPropertyAssignment(propiedad) || propiedad.name.getText(fuente) !== 'schema') continue;
        let valor = propiedad.initializer;
        // Historia 35.1 — `z.object({…}).superRefine(…)`: las claves son las del objeto de dentro.
        while (
          ts.isCallExpression(valor) &&
          ts.isPropertyAccessExpression(valor.expression) &&
          valor.expression.name.text === 'superRefine'
        ) {
          valor = valor.expression.expression;
        }
        if (!ts.isCallExpression(valor) || valor.expression.getText(fuente) !== 'z.object') continue;
        const [objeto] = valor.arguments;
        if (objeto === undefined || !ts.isObjectLiteralExpression(objeto)) continue;
        claves = objeto.properties.flatMap((p) =>
          (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && p.name !== undefined
            ? [p.name.getText(fuente)]
            : [],
        );
      }
      return;
    }
    ts.forEachChild(nodo, visitar);
  };
  visitar(fuente);
  return claves;
}

/** Las claves del esquema que nombra una lista de campos: la de un subcampo y las de un derivado. */
const clavesDeLosCampos = (campos: readonly Campo[]): string[] =>
  campos.flatMap((campo) => (typeof campo === 'string' ? [campo.split('.')[0]] : [...campo.de]));

describe('Historia 24.8 — todo campo de los esquemas está clasificado', () => {
  const unidas = (...listas: (readonly string[] | undefined)[]) => [...new Set(listas.flatMap((l) => l ?? []))];
  const ESQUEMAS = {
    cita: unidas(Object.keys(citaAdmisible.shape), clavesDeLaColeccion('citas')),
    autor: unidas(Object.keys(autorAdmisible.shape), clavesDeLaColeccion('autores')),
    tema: unidas(clavesDeLaColeccion('temas')),
    coleccion: Object.keys(coleccionAdmisible.shape),
    obra: Object.keys(esquemaDeObra([]).shape),
    // Historia 35.2 — el Personaje: la colección `personajes` usa este mismo esquema, sin envolver.
    personaje: Object.keys(personajeAdmisible.shape),
  } as const;

  it('lee las claves de los esquemas que el build aplica, también el de Tema', () => {
    // Si `content.config.ts` cambiara de forma y el lector dejara de encontrarlas, la
    // clasificación quedaría ciega en silencio para lo que solo se declara ahí.
    expect(clavesDeLaColeccion('citas')).toEqual(expect.arrayContaining(['texto', 'aptaParaPortada']));
    expect(clavesDeLaColeccion('autores')).toEqual(expect.arrayContaining(['nombre', 'semblanza']));
    expect(clavesDeLaColeccion('temas')).toEqual(expect.arrayContaining(['nombre']));
  });

  const clasificados = (familia: keyof typeof ESQUEMAS): Set<string> => {
    // Un subcampo —`procedencia.obra`, 26.4— clasifica la clave del esquema que lo contiene, y un
    // campo derivado —el nombre de «Cómo citar», 30.3— las claves de las que sale.
    const enLaTabla = Object.values(CAMPOS_QUE_PINTA[familia]).flatMap((campos) =>
      campos === CUALQUIER_CAMBIO ? [] : clavesDeLosCampos(campos as readonly Campo[]),
    );
    const queNoFechan = (CAMPOS_QUE_NO_FECHAN as Partial<Record<string, readonly string[]>>)[familia] ?? [];
    return new Set([...enLaTabla, ...queNoFechan]);
  };

  for (const familia of Object.keys(ESQUEMAS) as (keyof typeof ESQUEMAS)[]) {
    it(`${familia}: cada clave del esquema está clasificada, y no hay ninguna de más`, () => {
      const claves: readonly string[] = ESQUEMAS[familia];
      expect(claves.length).toBeGreaterThan(0);
      const sinClasificar = claves.filter((clave) => !clasificados(familia).has(clave));
      expect(sinClasificar, `${familia}: claves sin clasificar`).toEqual([]);
      const inexistentes = [...clasificados(familia)].filter((clave) => !claves.includes(clave));
      expect(inexistentes, `${familia}: la tabla nombra claves que el esquema no tiene`).toEqual([]);
    });
  }

  it('ninguna clave fecha y a la vez está entre las que no fechan', () => {
    for (const [familia, lista] of Object.entries(CAMPOS_QUE_NO_FECHAN)) {
      const enLaTabla = Object.values(CAMPOS_QUE_PINTA[familia as keyof typeof CAMPOS_QUE_PINTA]).flatMap(
        (campos) => (campos === CUALQUIER_CAMBIO ? [] : clavesDeLosCampos(campos as readonly Campo[])),
      );
      expect(lista.filter((clave) => enLaTabla.includes(clave)), familia).toEqual([]);
    }
  });
});

describe('Historia 24.8 — la matriz: qué cambia de fecha', () => {
  const T0 = '2026-01-01T00:00:00.000Z';
  const T1 = '2026-02-01T00:00:00.000Z';
  const DOCUMENTO = 'corpus/fuentes/fuente--obra-o.txt';

  const cita = (slug: string, autor: string, temas: string[], obraDeclarada: string, extra: Record<string, unknown> = {}) => ({
    slug,
    autor,
    temas,
    procedencia: { obra: obraDeclarada },
    texto: `Texto de ${slug}.`,
    estadoDerechos: 'dominio-público',
    fuente: { id: 'fuente', url: 'https://ejemplo.org/' },
    ...extra,
  });

  /** Las versiones de hoy de cada fichero del ejemplo, por su ruta. */
  const VERSIONES: Record<string, Record<string, unknown>> = {
    'corpus/citas/x--a.md': cita('x-a', 'x', ['t'], 'Obra O'),
    'corpus/citas/x--b.md': cita('x-b', 'x', ['t'], 'Obra O'),
    'corpus/citas/x--c.md': cita('x-c', 'x', ['u'], 'Obra O'),
    'corpus/citas/y--b.md': cita('y-b', 'y', ['t'], 'Obra P'),
    'corpus/autores/x.yml': { nombre: 'Equis', añoFallecimiento: 1900, semblanza: 'Una.', tradicion: 'otra' },
    'corpus/autores/y.yml': { nombre: 'Ye', añoFallecimiento: 1900, semblanza: 'Otra.' },
    'corpus/temas/t.yml': { nombre: 'Te' },
    'corpus/temas/u.yml': { nombre: 'U' },
    'corpus/colecciones/c.yml': { nombre: 'Ce', criterio: 'Breves.', miembros: ['x-b', 'y-b'] },
    'corpus/obras/x--o.yml': { autor: 'x', titulo: 'Obra O', formas: ['obra o'] },
    'corpus/obras/y--p.yml': { autor: 'y', titulo: 'Obra P', formas: ['obra p'] },
  };

  const citaParaFechar = (ruta: string, obra: string) => {
    const v = VERSIONES[ruta] as ReturnType<typeof cita>;
    return { slug: v.slug, autor: v.autor, temas: v.temas, obra, obraDeclarada: v.procedencia.obra, fuente: 'fuente', ruta };
  };

  const corpusDeEjemplo = (sin: string[] = [], documentos: string[] = [DOCUMENTO]): CorpusParaFechar => ({
    citas: [
      citaParaFechar('corpus/citas/x--a.md', 'x--o'),
      citaParaFechar('corpus/citas/x--b.md', 'x--o'),
      citaParaFechar('corpus/citas/x--c.md', 'x--o'),
      citaParaFechar('corpus/citas/y--b.md', 'y--p'),
    ].filter((c) => !sin.includes(c.ruta)),
    autores: [
      { slug: 'x', ruta: 'corpus/autores/x.yml' },
      { slug: 'y', ruta: 'corpus/autores/y.yml' },
    ],
    temas: [
      { slug: 't', ruta: 'corpus/temas/t.yml' },
      { slug: 'u', ruta: 'corpus/temas/u.yml' },
    ],
    colecciones: [{ slug: 'c', miembros: ['x-b', 'y-b'], ruta: 'corpus/colecciones/c.yml' }],
    obras: [
      { nombre: 'x--o', autor: 'x', formas: ['obra o'], ruta: 'corpus/obras/x--o.yml' },
      { nombre: 'y--p', autor: 'y', formas: ['obra p'], ruta: 'corpus/obras/y--p.yml' },
    ],
    documentos,
  });

  /** Todo nace en T0; luego, las transiciones del commit de T1. */
  const historial = (
    enT1: Record<string, { antes: Version | null; despues: Version | null }>,
    nacenEnT1: string[] = [],
  ): Map<string, TransicionFechada[]> => {
    const resultado = new Map<string, TransicionFechada[]>();
    for (const [ruta, version] of Object.entries(VERSIONES)) {
      if (!nacenEnT1.includes(ruta)) resultado.set(ruta, [{ fecha: T0, antes: null, despues: version }]);
    }
    if (!nacenEnT1.includes(DOCUMENTO)) resultado.set(DOCUMENTO, [{ fecha: T0, antes: null, despues: VERSION_OPACA }]);
    for (const [ruta, transicion] of Object.entries(enT1)) {
      resultado.set(ruta, [{ fecha: T1, ...transicion }, ...(resultado.get(ruta) ?? [])]);
    }
    return resultado;
  };

  /** Las rutas normalizadas que el commit de T1 refecha. */
  const refechadas = (corpus: CorpusParaFechar, h: Historial) =>
    [...fechasPorSuperficie(corpus, h)].filter(([, fecha]) => fecha === T1).map(([ruta]) => ruta).sort();

  const conBajas = (corpus: CorpusParaFechar, h: Historial): CorpusParaFechar => ({
    ...corpus,
    bajas: bajasDelHistorial(h, familiaDeFichero, new Set([
      ...corpus.citas.map((c) => c.ruta),
      ...corpus.autores.map((a) => a.ruta),
      ...corpus.temas.map((t) => t.ruta),
      ...corpus.colecciones.map((c) => c.ruta),
      ...(corpus.obras ?? []).map((o) => o.ruta),
      ...(corpus.documentos ?? []),
    ])),
  });

  /**
   * Lo que avisaría el mismo commit: la lectura inversa de la relación de después y, para lo que
   * se borró, la de antes restringida a lo que sigue vivo. Normalizado, para compararlo con la
   * fecha: «fecha y aviso coinciden».
   */
  const avisadas = (
    enT1: Record<string, { antes: Version | null; despues: Version | null }>,
    despues: CorpusParaFechar,
    antes: CorpusParaFechar = despues,
  ) => {
    const cambios = Object.entries(enT1).map(([fichero, t]) => ({ fichero, ...t }));
    const relacionDespues = relacionDeSuperficies(despues);
    return [
      ...new Set([
        ...rutasAvisadasPor(cambios, relacionDespues),
        ...[...rutasAvisadasPor(cambios, relacionDeSuperficies(antes))].filter((r) => relacionDespues.has(r)),
      ]),
    ]
      .map(rutaNormalizada)
      .sort();
  };

  const editado = (ruta: string, cambios: Record<string, unknown>) => ({
    antes: VERSIONES[ruta] as Version,
    despues: { ...VERSIONES[ruta], ...cambios } as Version,
  });

  it('sin cambios en T1, todo lleva T0: el ejemplo de partida', () => {
    const fechas = fechasPorSuperficie(corpusDeEjemplo(), historial({}));
    expect(fechas.size).toBeGreaterThan(10);
    expect([...fechas.values()].every((fecha) => fecha === T0)).toBe(true);
  });

  it('Cita nueva: su página, su Autor, su Tema, su Colección, su Obra y los Directorios; ninguna otra Página de Cita', () => {
    const enT1 = { 'corpus/citas/x--b.md': { antes: null, despues: VERSIONES['corpus/citas/x--b.md'] as Version } };
    const h = historial(enT1, ['corpus/citas/x--b.md']);
    // Historias 26.3 y 26.4 — los Directorios cuentan Citas por Autor y por Obra: un alta los mueve.
    const esperadas = ['/cita/x-b', '/autor/x', '/tema/t', '/coleccion/c', '/obra/x/o', '/autores', '/obras'].sort();
    expect(refechadas(corpusDeEjemplo(), h)).toEqual(esperadas);
    expect(avisadas(enT1, corpusDeEjemplo(), corpusDeEjemplo(['corpus/citas/x--b.md']))).toEqual(esperadas);
  });

  it('cruce de Autores: la Cita de otro Autor en el mismo Tema no cambia de fecha', () => {
    /*
     * `y-b` es la única Cita de su Obra y su primer Tema es `t`: su «Siguiente» sigue por `t` y
     * la entrada de `x-b`, de otro Autor, puede cambiarlo. Que esa navegación cambie de verdad el
     * HTML sin cambiar la fecha se comprueba sobre un sitio construido en
     * `fecha-de-cambio-build.test.ts`; aquí, que la relación no compone hermanas.
     */
    const enT1 = { 'corpus/citas/x--b.md': { antes: null, despues: VERSIONES['corpus/citas/x--b.md'] as Version } };
    const h = historial(enT1, ['corpus/citas/x--b.md']);
    const fechas = fechasPorSuperficie(corpusDeEjemplo(), h);
    expect(fechas.get('/cita/y-b')).toBe(T0);
    // El aviso, con el Corpus de antes de verdad: sin `x-b`.
    expect(avisadas(enT1, corpusDeEjemplo(), corpusDeEjemplo(['corpus/citas/x--b.md']))).not.toContain('/cita/y-b');
    // Ni la hermana de la misma Obra, aunque su «Siguiente» y su recuento cambien.
    expect(fechas.get('/cita/x-a')).toBe(T0);
  });

  it('solo `aptaParaPortada`, `estadoDerechos`, `tradicion` o `distintaDe`: nada cambia de fecha', () => {
    const enT1 = {
      'corpus/citas/x--a.md': editado('corpus/citas/x--a.md', { aptaParaPortada: true }),
      'corpus/citas/x--c.md': editado('corpus/citas/x--c.md', { estadoDerechos: 'otro' }),
      'corpus/autores/x.yml': editado('corpus/autores/x.yml', { tradicion: 'latinoamericana' }),
      'corpus/obras/x--o.yml': editado('corpus/obras/x--o.yml', { distintaDe: ['obra p'] }),
    };
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).toEqual([]);
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual([]);
  });

  /*
   * Historias 26.1 y 26.3 — el lote de `proponer-claves` escribe `ordenAlfabetico` en todos los
   * Autores a la vez, y la confirmación de una persona, `ordenRevisado`. Desde la 26.3 la clave la
   * pinta el Directorio de Autores, que ordena y agrupa por ella: el lote mueve `/autores/` y nada
   * más, ni las Páginas de Autor ni las de Cita. Desde la 30.3 la revisión sí pinta: con una clave
   * que sea palabra del nombre invierte el nombre de «Cómo citar» y fecha las Páginas de Cita del
   * Autor (las pruebas de la 30.3, más abajo); una clave sin revisar no invierte nada.
   * Desde la 26.4 la clave ordena y agrupa también `/obras/`, que el lote mueve igual.
   */
  it('solo claves de orden, en todos los Autores: cambian solo `/autores/` y `/obras/`', () => {
    const enT1 = {
      'corpus/autores/x.yml': editado('corpus/autores/x.yml', { ordenAlfabetico: 'Equis' }),
      'corpus/autores/y.yml': editado('corpus/autores/y.yml', { ordenAlfabetico: 'Ye' }),
    };
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).toEqual(['/autores', '/obras']);
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual(['/autores', '/obras']);
  });

  /*
   * Historia 30.3 — la revisión ya no es invisible: «Cómo citar» invierte el nombre del Autor
   * («Equis, J.») solo con la clave revisada y siendo palabra del nombre, y lo pinta la Página de
   * Cita. Revisarla fecha y avisa sus Páginas de Cita y, desde la 32.5, sus Páginas de Obra, cuya
   * página 1 lleva las Referencias de la Obra; si además corrige la clave, también los
   * Directorios, que ordenan por ella. Una revisión que no cambia ninguna Referencia —un nombre de
   * una palabra, o una clave que no es palabra del nombre— no mueve nada.
   */
  const conNombre = (nombre: string, extra: Record<string, unknown>): Readonly<Record<string, unknown>> => ({
    ...VERSIONES['corpus/autores/x.yml'],
    nombre,
    ...extra,
  });

  it('solo la revisión de una clave que es palabra del nombre: cambian las Páginas de Cita y de Obra del Autor', () => {
    const enT1 = {
      'corpus/autores/x.yml': {
        antes: conNombre('Juan Equis', { ordenAlfabetico: 'Equis' }),
        despues: conNombre('Juan Equis', { ordenAlfabetico: 'Equis', ordenRevisado: '2026-10-28' }),
      },
    };
    const esperadas = ['/cita/x-a', '/cita/x-b', '/cita/x-c', '/obra/x/o'];
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).toEqual(esperadas);
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual(esperadas);
  });

  it('revisar corrigiendo la clave: cambian sus Páginas de Cita y de Obra y los Directorios', () => {
    const enT1 = {
      'corpus/autores/x.yml': {
        antes: conNombre('Juan Equis', { ordenAlfabetico: 'Juan' }),
        despues: conNombre('Juan Equis', { ordenAlfabetico: 'Equis', ordenRevisado: '2026-10-28' }),
      },
    };
    const esperadas = ['/autores', '/cita/x-a', '/cita/x-b', '/cita/x-c', '/obra/x/o', '/obras'];
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).toEqual(esperadas);
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual(esperadas);
  });

  it('una revisión que no cambia ninguna Referencia —nombre de una palabra, o clave ajena al nombre—: nada', () => {
    const enT1 = {
      'corpus/autores/x.yml': editado('corpus/autores/x.yml', { ordenRevisado: '2026-10-28' }),
      'corpus/autores/y.yml': {
        antes: { ...VERSIONES['corpus/autores/y.yml'], nombre: 'Ye Zeta', ordenAlfabetico: 'Zed' },
        despues: { ...VERSIONES['corpus/autores/y.yml'], nombre: 'Ye Zeta', ordenAlfabetico: 'Zed', ordenRevisado: '2026-10-28' },
      },
    };
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).toEqual([]);
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual([]);
  });

  it('el nombre derivado lo da `nombreEnReferencia`, la función de la Página de Cita', () => {
    const version = conNombre('Juan Equis', { ordenAlfabetico: 'Equis', ordenRevisado: '2026-10-28' });
    expect(NOMBRE_EN_REFERENCIA.valor(version)).toEqual(['Equis, J.', 'Equis, Juan', 'Equis, Juan']);
    expect(NOMBRE_EN_REFERENCIA.valor(conNombre('Juan Equis', { ordenAlfabetico: 'Equis' }))).toEqual([
      'Juan Equis',
      'Juan Equis',
      'Juan Equis',
    ]);
  });

  it('el texto de una Cita no mueve los Directorios; cambiarle el Autor, sí', () => {
    const texto = { 'corpus/citas/x--a.md': editado('corpus/citas/x--a.md', { texto: 'Otro texto.' }) };
    for (const directorio of ['/autores', '/obras']) {
      expect(refechadas(corpusDeEjemplo(), historial(texto)), directorio).not.toContain(directorio);
      expect(avisadas(texto, corpusDeEjemplo()), directorio).not.toContain(directorio);
    }

    const deAutor = { 'corpus/citas/x--a.md': editado('corpus/citas/x--a.md', { autor: 'y' }) };
    for (const directorio of ['/autores', '/obras']) {
      expect(refechadas(corpusDeEjemplo(), historial(deAutor)), directorio).toContain(directorio);
      expect(avisadas(deAutor, corpusDeEjemplo()), directorio).toContain(directorio);
    }
  });

  /*
   * Historia 26.4 — `/obras/` pinta de una Cita su Procedencia (su Obra y el año de la Obra) y de
   * su ficha el título y las formas; de un Autor, el nombre y la clave, y solo si tiene Obras.
   */
  it('la Procedencia de una Cita mueve `/obras/` y no `/autores/`', () => {
    const enT1 = {
      'corpus/citas/x--a.md': editado('corpus/citas/x--a.md', { procedencia: { obra: 'Obra O', año: 1880 } }),
    };
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).toContain('/obras');
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).not.toContain('/autores');
    expect(avisadas(enT1, corpusDeEjemplo())).toContain('/obras');
  });

  it('de la Procedencia, solo la Obra y el año mueven `/obras/`: la referencia y la traducción, no', () => {
    const ruta = 'corpus/citas/x--a.md';
    for (const procedencia of [
      { obra: 'Obra O', referencia: 'cap. 3' },
      { obra: 'Obra O', traduccion: { traductor: 'Fulano', año: 1900 } },
    ]) {
      const enT1 = { [ruta]: editado(ruta, { procedencia }) };
      const motivo = JSON.stringify(procedencia);
      expect(refechadas(corpusDeEjemplo(), historial(enT1)), motivo).not.toContain('/obras');
      expect(avisadas(enT1, corpusDeEjemplo()), motivo).not.toContain('/obras');
      // La Página de Cita sí la pinta entera.
      expect(refechadas(corpusDeEjemplo(), historial(enT1)), motivo).toContain('/cita/x-a');
    }
    const otraObra = { [ruta]: editado(ruta, { procedencia: { obra: 'Obra Q' } }) };
    expect(refechadas(corpusDeEjemplo(), historial(otraObra))).toContain('/obras');
    expect(avisadas(otraObra, corpusDeEjemplo())).toContain('/obras');
  });

  it('una Cita sin Obra no figura en `/obras/`: su texto y su Autor no lo mueven; su alta y su baja sí', () => {
    // `y-b` sin Obra: no figura en `/obras/`, y sí cuenta en `/autores/`.
    const ruta = 'corpus/citas/y--b.md';
    const sinSuObra: Readonly<Record<string, unknown>> = { ...VERSIONES[ruta], procedencia: undefined };
    const base = corpusDeEjemplo();
    const conYbSinObra: CorpusParaFechar = {
      ...base,
      citas: base.citas.map((c) => {
        if (c.slug !== 'y-b') return c;
        const { obra: _obra, obraDeclarada: _declarada, ...sinObra } = c;
        return sinObra;
      }),
    };
    /*
     * El alta y la baja sí lo fechan: la Cita sin Obra compone `/obras/` por su `procedencia.obra`,
     * viva o de baja, para que perder la Obra lo feche, y un alta o una baja cambian todos los
     * campos. Antes fechar de más que mentir de menos (cabecera de `tools/lib/cambios.ts`).
     */
    const alta = { [ruta]: { antes: null, despues: sinSuObra } };
    const altaH = historial(alta, [ruta]);
    expect(refechadas(conYbSinObra, altaH)).toContain('/autores');
    expect(refechadas(conYbSinObra, altaH)).toContain('/obras');
    expect(avisadas(alta, conYbSinObra, corpusDeEjemplo([ruta]))).toContain('/obras');

    const deTexto = { [ruta]: { antes: sinSuObra, despues: { ...sinSuObra, texto: 'Otro.' } } };
    expect(refechadas(conYbSinObra, historial(deTexto))).not.toContain('/obras');
    expect(avisadas(deTexto, conYbSinObra)).not.toContain('/obras');

    const deAutor = { [ruta]: { antes: sinSuObra, despues: { ...sinSuObra, autor: 'x' } } };
    expect(refechadas(conYbSinObra, historial(deAutor))).toContain('/autores');
    expect(refechadas(conYbSinObra, historial(deAutor))).not.toContain('/obras');
    expect(avisadas(deAutor, conYbSinObra)).not.toContain('/obras');

    const baja = { [ruta]: { antes: sinSuObra, despues: null } };
    const bajaH = new Map(historial({}));
    bajaH.set(ruta, [{ fecha: T1, ...baja[ruta] }, { fecha: T0, antes: null, despues: sinSuObra }]);
    const sinYb = conBajas(corpusDeEjemplo([ruta]), bajaH);
    expect(sinYb.bajas?.citas?.map((c) => c.slug)).toEqual(['y-b']);
    expect(refechadas(sinYb, bajaH)).toContain('/autores');
    expect(refechadas(sinYb, bajaH)).toContain('/obras');
    expect(avisadas(baja, corpusDeEjemplo([ruta]), conYbSinObra)).toContain('/obras');
  });

  it('una Cita viva que pierde su Obra mueve `/obras/`: borrada o cambiada a una forma vacía', () => {
    // `y-b` es la única Cita de «Obra P»: al perderla, la Obra y el grupo de «Ye» desaparecen.
    const ruta = 'corpus/citas/y--b.md';
    const base = corpusDeEjemplo();
    for (const procedencia of [undefined, { obra: '…' }]) {
      const despues: Version = { ...VERSIONES[ruta], procedencia };
      const sinObra: CorpusParaFechar = {
        ...base,
        citas: base.citas.map((c) => {
          if (c.slug !== 'y-b') return c;
          const { obra: _obra, obraDeclarada: _declarada, ...resto } = c;
          return procedencia === undefined ? resto : { ...resto, obraDeclarada: procedencia.obra };
        }),
      };
      const enT1 = { [ruta]: { antes: VERSIONES[ruta] as Version, despues } };
      const motivo = JSON.stringify(procedencia ?? null);
      expect(refechadas(sinObra, historial(enT1)), motivo).toContain('/obras');
      expect(refechadas(sinObra, historial(enT1)), motivo).not.toContain('/autores');
      expect(avisadas(enT1, sinObra, base), motivo).toContain('/obras');
    }
  });

  it('las formas de una ficha mueven su Obra, sus Páginas de Cita (31.2) y `/obras/`, y su `distintaDe` nada', () => {
    const formas = { 'corpus/obras/x--o.yml': editado('corpus/obras/x--o.yml', { formas: ['obra o', 'la obra o'] }) };
    const esperadas = ['/cita/x-a', '/cita/x-b', '/cita/x-c', '/obra/x/o', '/obras'];
    expect(refechadas(corpusDeEjemplo(), historial(formas))).toEqual(esperadas);
    expect(avisadas(formas, corpusDeEjemplo())).toEqual(esperadas);
  });

  it('un Autor cuyas Citas no tienen Obra no mueve `/obras/`: no figura en él, aunque sí en `/autores/`', () => {
    // `y-b` deja de resolver Obra: «Ye» sigue publicado en `/autores/` y no tiene grupo en `/obras/`.
    const base = corpusDeEjemplo();
    const sinObra: CorpusParaFechar = {
      ...base,
      citas: base.citas.map((c) => {
        if (c.slug !== 'y-b') return c;
        const { obra: _obra, obraDeclarada: _declarada, ...sinSuObra } = c;
        return sinSuObra;
      }),
    };
    for (const cambios of [{ nombre: 'Ye Zeta' }, { ordenAlfabetico: 'Ye' }]) {
      const enT1 = { 'corpus/autores/y.yml': editado('corpus/autores/y.yml', cambios) };
      const motivo = JSON.stringify(cambios);
      expect(refechadas(sinObra, historial(enT1)), motivo).not.toContain('/obras');
      expect(refechadas(sinObra, historial(enT1)), motivo).toContain('/autores');
      expect(avisadas(enT1, sinObra), motivo).not.toContain('/obras');
    }
  });

  it('la clave, el nombre o los años de un Autor sin Citas publicadas no mueven los Directorios: no figura en ellos', () => {
    // Sin `y--b`, «Ye» no tiene ninguna Cita publicada y los Directorios no lo listan (26.3, 26.4).
    const sinCitas = corpusDeEjemplo(['corpus/citas/y--b.md']);
    for (const cambios of [{ ordenAlfabetico: 'Ye' }, { nombre: 'Ye Zeta' }, { añoNacimiento: 1830 }]) {
      const enT1 = { 'corpus/autores/y.yml': editado('corpus/autores/y.yml', cambios) };
      const motivo = JSON.stringify(cambios);
      for (const directorio of ['/autores', '/obras']) {
        expect(refechadas(sinCitas, historial(enT1)), motivo).not.toContain(directorio);
        expect(avisadas(enT1, sinCitas), motivo).not.toContain(directorio);
      }
    }
  });

  it('solo la biografía: la Página del Autor, nunca el Directorio', () => {
    const enT1 = {
      'corpus/autores/x.yml': editado('corpus/autores/x.yml', {
        biografia: { documento: 'wikipedia-es--equis--r1.txt', revision: 1 },
      }),
    };
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).toEqual(['/autor/x']);
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual(['/autor/x']);
  });

  // La semblanza, la tradición y la biografía no las pinta ningún Directorio (26.3, 26.4).
  it('solo la semblanza: solo la Página del Autor', () => {
    const enT1 = { 'corpus/autores/x.yml': editado('corpus/autores/x.yml', { semblanza: 'Otra semblanza.' }) };
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).toEqual(['/autor/x']);
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual(['/autor/x']);
  });

  it('el nombre o los años del Autor: el Autor, sus Páginas de Cita, los listados que lo pintan, sus Obras y los Directorios', () => {
    const esperadas = [
      '/autores',
      '/autor/x',
      '/cita/x-a',
      '/cita/x-b',
      '/cita/x-c',
      '/tema/t',
      '/tema/u',
      '/coleccion/c',
      '/obra/x/o',
    ].sort();
    // El nombre lo pintan los dos Directorios; los años, solo `/autores/` (26.4).
    const conObras = [...esperadas, '/obras'].sort();
    const enT1 = { 'corpus/autores/x.yml': editado('corpus/autores/x.yml', { nombre: 'Equis Zeta' }) };
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).toEqual(conObras);
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual(conObras);
    const años = { 'corpus/autores/x.yml': editado('corpus/autores/x.yml', { añoNacimiento: 1830 }) };
    expect(refechadas(corpusDeEjemplo(), historial(años))).toEqual(esperadas);
    expect(avisadas(años, corpusDeEjemplo())).toEqual(esperadas);
  });

  it('`nota` o `ediciones` de la ficha: solo la Página de Obra, nunca `/obras/`', () => {
    const enT1 = { 'corpus/obras/x--o.yml': editado('corpus/obras/x--o.yml', { nota: 'Una nota.' }) };
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).toEqual(['/obra/x/o']);
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual(['/obra/x/o']);
    expect(
      refechadas(
        corpusDeEjemplo(),
        historial({ 'corpus/obras/x--o.yml': editado('corpus/obras/x--o.yml', { ediciones: [{ tienda: 'a', formato: 'impresa', url: 'https://a.example/' }] }) }),
      ),
    ).toEqual(['/obra/x/o']);
  });

  it('retitular la ficha: su Obra, sus Páginas de Cita, los listados de Autor, Tema y Colección de esas Citas y `/obras/`', () => {
    const enT1 = { 'corpus/obras/x--o.yml': editado('corpus/obras/x--o.yml', { titulo: 'La obra O' }) };
    const esperadas = ['/obra/x/o', '/cita/x-a', '/cita/x-b', '/cita/x-c', '/autor/x', '/tema/t', '/tema/u', '/coleccion/c', '/obras'].sort();
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).toEqual(esperadas);
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual(esperadas);
  });

  it('un documento nuevo de una Obra paginada: esa Obra y sus Páginas de Cita (31.2), que pueden ganar pasaje', () => {
    const pagina = 'corpus/fuentes/fuente--obra-o--iii.txt';
    const enT1 = { [pagina]: { antes: null, despues: VERSION_OPACA as Version } };
    expect(refechadas(corpusDeEjemplo([], [DOCUMENTO, pagina]), historial(enT1))).toEqual(['/cita/x-a', '/cita/x-b', '/cita/x-c', '/obra/x/o']);
    expect(avisadas(enT1, corpusDeEjemplo([], [DOCUMENTO, pagina]), corpusDeEjemplo())).toEqual(['/cita/x-a', '/cita/x-b', '/cita/x-c', '/obra/x/o']);
    // Y un documento de otra obra no compone esta.
    const ajeno = 'corpus/fuentes/fuente--otra-cosa.txt';
    expect(refechadas(corpusDeEjemplo([], [DOCUMENTO, ajeno]), historial({ [ajeno]: { antes: null, despues: VERSION_OPACA } }))).toEqual([]);
  });

  it('la baja de una Cita fecha su Autor, los Directorios, sus Temas, sus Colecciones y su Obra, y no declara su página', () => {
    const ruta = 'corpus/citas/x--b.md';
    const enT1 = { [ruta]: { antes: VERSIONES[ruta] as Version, despues: null } };
    const h = historial(enT1);
    const corpus = conBajas(corpusDeEjemplo([ruta]), h);
    expect(corpus.bajas?.citas?.map((c) => c.slug)).toEqual(['x-b']);
    const esperadas = ['/autor/x', '/autores', '/obras', '/tema/t', '/coleccion/c', '/obra/x/o'].sort();
    expect(refechadas(corpus, h)).toEqual(esperadas);
    // Fecha y aviso coinciden: el aviso lo encuentra en la relación de antes.
    expect(avisadas(enT1, corpusDeEjemplo([ruta]), corpusDeEjemplo())).toEqual(esperadas);
    expect(fechasPorSuperficie(corpus, h).has('/cita/x-b')).toBe(false);
  });

  it('24.9 — capturar o cambiar el índice de una Obra: esa Obra y, desde la 31.2, sus Páginas de Cita, como un documento suyo', () => {
    const indice = 'corpus/fuentes/fuente--obra-o.indice.yml';
    const nuevo = { [indice]: { antes: null, despues: VERSION_OPACA as Version } };
    expect(refechadas(corpusDeEjemplo([], [DOCUMENTO, indice]), historial(nuevo))).toEqual(['/cita/x-a', '/cita/x-b', '/cita/x-c', '/obra/x/o']);
    expect(avisadas(nuevo, corpusDeEjemplo([], [DOCUMENTO, indice]), corpusDeEjemplo())).toEqual(['/cita/x-a', '/cita/x-b', '/cita/x-c', '/obra/x/o']);
    const cambiado = { [indice]: { antes: VERSION_OPACA as Version, despues: VERSION_OPACA as Version } };
    expect(avisadas(cambiado, corpusDeEjemplo([], [DOCUMENTO, indice]))).toEqual(['/cita/x-a', '/cita/x-b', '/cita/x-c', '/obra/x/o']);
    // El índice que sale fecha la Obra que ordenaba.
    const h = historial({ [indice]: { antes: VERSION_OPACA, despues: null } });
    const corpus = conBajas(corpusDeEjemplo([], [DOCUMENTO]), h);
    expect(corpus.bajas?.documentos).toEqual([indice]);
    expect(refechadas(corpus, h)).toEqual(['/cita/x-a', '/cita/x-b', '/cita/x-c', '/obra/x/o']);
    // Y el índice de otra Obra no compone esta, ni ninguna de sus Páginas de Cita.
    const ajeno = 'corpus/fuentes/fuente--otra-cosa.indice.yml';
    expect(refechadas(corpusDeEjemplo([], [DOCUMENTO, ajeno]), historial({ [ajeno]: { antes: null, despues: VERSION_OPACA } }))).toEqual([]);
  });

  describe('Historia 32.3 — el incipit fecha y avisa solo su Página de Obra', () => {
    it('`incipit` de la ficha está en la tabla de la Página de Obra, y en ninguna otra', () => {
      expect(CAMPOS_QUE_PINTA.obra.obra).toContain('incipit');
      expect(CAMPOS_QUE_NO_FECHAN.obra).not.toContain('incipit');
      for (const [columna, campos] of Object.entries(CAMPOS_QUE_PINTA.obra)) {
        if (columna !== 'obra') expect(campos, columna).not.toContain('incipit');
      }
    });

    it('declarar un incipit en una ficha fecha y avisa solo esa Obra: ni su Página de Cita, ni otra Obra, ni los listados', () => {
      const ficha = 'corpus/obras/x--o.yml';
      const enT1 = { [ficha]: editado(ficha, { incipit: { documento: 'fuente--obra-o', desde: 'Érase' } }) };
      expect(refechadas(corpusDeEjemplo(), historial(enT1))).toEqual(['/obra/x/o']);
      expect(avisadas(enT1, corpusDeEjemplo())).toEqual(['/obra/x/o']);
      // La portada no tiene fecha (no es ninguna superficie de la relación).
      expect(fechasPorSuperficie(corpusDeEjemplo(), historial(enT1)).has('/')).toBe(false);
      // Cambiar el «desde» también; y quitarlo.
      const cambiado = {
        [ficha]: {
          antes: { ...(VERSIONES[ficha] as object), incipit: { documento: 'fuente--obra-o', desde: 'Érase' } } as Version,
          despues: { ...(VERSIONES[ficha] as object), incipit: { documento: 'fuente--obra-o', desde: 'Había' } } as Version,
        },
      };
      expect(refechadas(corpusDeEjemplo(), historial(cambiado))).toEqual(['/obra/x/o']);
      expect(avisadas(cambiado, corpusDeEjemplo())).toEqual(['/obra/x/o']);
    });
  });

  it('Historia 32.3 — el documento del incipit compone su Página de Obra aunque no sea de ninguna de sus Citas', () => {
    const ajeno = 'corpus/fuentes/fuente--otra-cosa.txt';
    const conIncipit = (): CorpusParaFechar => {
      const base = corpusDeEjemplo([], [DOCUMENTO, ajeno]);
      return { ...base, obras: base.obras!.map((o) => (o.nombre === 'x--o' ? { ...o, incipit: 'fuente--otra-cosa' } : o)) };
    };
    const enT1 = { [ajeno]: { antes: VERSION_OPACA as Version, despues: VERSION_OPACA as Version } };
    expect(refechadas(conIncipit(), historial(enT1))).toEqual(['/obra/x/o']);
    expect(avisadas(enT1, conIncipit(), conIncipit())).toEqual(['/obra/x/o']);
    // Sin el incipit, ese documento no compone nada.
    expect(refechadas(corpusDeEjemplo([], [DOCUMENTO, ajeno]), historial(enT1))).toEqual([]);
  });

  describe('Historia 32.2 — la Ficha técnica fecha y avisa su Página de Obra', () => {
    const DOC_X = 'corpus/wikidata/Q1--r10.json';
    const DOC_Y = 'corpus/wikidata/Q2--r20.json';
    const VIGENTES = 'corpus/wikidata/vigentes.yml';
    /** x--o pinta Q5 (género) y Q6 (lengua); y--p, solo Q5. Q9 es el autor: se coteja y no se pinta. */
    const VIGENTES_HOY = { Q1: 10, Q2: 20, Q5: 3, Q6: 4, Q9: 7 };
    const atadas = (pintaX: readonly string[] | 'ilegible' = ['Q5', 'Q6']): CorpusParaFechar => {
      const corpus = corpusDeEjemplo();
      return {
        ...corpus,
        obras: (corpus.obras ?? []).map((o) =>
          o.nombre === 'x--o'
            ? { ...o, wikidata: { documento: DOC_X, ...(pintaX === 'ilegible' ? {} : { pinta: pintaX }) } }
            : { ...o, wikidata: { documento: DOC_Y, pinta: ['Q5'] } },
        ),
        vigentesDeWikidata: VIGENTES,
      };
    };
    const conVigente = (cambio: Record<string, number>) => ({
      [VIGENTES]: { antes: VIGENTES_HOY as Version, despues: { ...VIGENTES_HOY, ...cambio } as Version },
    });

    it('`wikidata` de la ficha está en la tabla de la Página de Obra, y ya no entre lo que no fecha', () => {
      expect(CAMPOS_QUE_PINTA.obra.obra).toContain('wikidata');
      expect(CAMPOS_QUE_NO_FECHAN.obra).not.toContain('wikidata');
      expect(CAMPOS_QUE_PINTA.wikidata).toEqual({ obra: CUALQUIER_CAMBIO });
      expect(familiaDeFichero(DOC_X)).toBe('wikidata');
      expect(familiaDeFichero(VIGENTES)).toBe('wikidata');
    });

    it('atar una entidad (ficha y documentos nuevos) fecha y avisa solo esa Obra, y no la portada si solo cambia `corpus/wikidata/`', () => {
      const ficha = 'corpus/obras/x--o.yml';
      const sinAtar = corpusDeEjemplo();
      const despues: CorpusParaFechar = {
        ...sinAtar,
        obras: (sinAtar.obras ?? []).map((o) => (o.nombre === 'x--o' ? { ...o, wikidata: { documento: DOC_X, pinta: ['Q5', 'Q6'] } } : o)),
        vigentesDeWikidata: VIGENTES,
      };
      const enT1 = {
        [ficha]: editado(ficha, { wikidata: { entidad: 'Q1', revision: 10 } }),
        [DOC_X]: { antes: null, despues: VERSION_OPACA as Version },
        [VIGENTES]: { antes: { Q2: 20 } as Version, despues: { Q1: 10, Q2: 20, Q5: 3, Q6: 4, Q9: 7 } as Version },
      };
      expect(refechadas(despues, historial(enT1))).toEqual(['/obra/x/o']);
      expect(avisadas(enT1, despues, sinAtar)).toEqual(['/obra/x/o']);

      // Solo los ficheros de `corpus/wikidata/`: la portada no se avisa (no pinta nada de Wikidata).
      const soloWikidata = [
        { fichero: DOC_X, antes: null, despues: VERSION_OPACA as Version },
        { fichero: VIGENTES, ...enT1[VIGENTES] },
      ];
      const relacion = relacionDeSuperficies(despues);
      const indexables = { rutas: [...relacion.keys()].filter((r) => r.startsWith('/obra/')) };
      const { rutas } = componerAviso({
        cambios: soloWikidata,
        relacionAntes: relacion,
        relacionDespues: relacion,
        indexablesAntes: indexables,
        indexablesDespues: indexables,
      });
      expect(rutas.map(rutaNormalizada)).toEqual(['/obra/x/o']);
    });

    it('cambiar en `vigentes.yml` la revisión de un género fecha y avisa toda Obra que lo pinta y nada más', () => {
      const corpus = atadas();
      // Q5 lo pintan las dos Obras; ninguna Página de Cita, ningún listado, ningún Directorio.
      expect(refechadas(corpus, historial(conVigente({ Q5: 8 })))).toEqual(['/obra/x/o', '/obra/y/p']);
      expect(avisadas(conVigente({ Q5: 8 }), corpus)).toEqual(['/obra/x/o', '/obra/y/p']);
      // Q6 (lengua) solo la pinta x--o.
      expect(refechadas(corpus, historial(conVigente({ Q6: 9 })))).toEqual(['/obra/x/o']);
      expect(avisadas(conVigente({ Q6: 9 }), corpus)).toEqual(['/obra/x/o']);
    });

    it('cambiar la vigente de su autor (P50), que no se pinta, no fecha ni avisa nada', () => {
      const corpus = atadas();
      expect(refechadas(corpus, historial(conVigente({ Q9: 11 })))).toEqual([]);
      expect(avisadas(conVigente({ Q9: 11 }), corpus)).toEqual([]);
    });

    it('un documento ilegible compone `vigentes.yml` con cualquier cambio: fechar de más antes que de menos', () => {
      const corpus = atadas('ilegible');
      expect(refechadas(corpus, historial(conVigente({ Q9: 11 })))).toEqual(['/obra/x/o']);
      expect(avisadas(conVigente({ Q9: 11 }), corpus)).toEqual(['/obra/x/o']);
    });

    it('un cambio del documento de su revisión fecha solo esa Obra', () => {
      const enT1 = { [DOC_X]: { antes: VERSION_OPACA as Version, despues: VERSION_OPACA as Version } };
      expect(refechadas(atadas(), historial(enT1))).toEqual(['/obra/x/o']);
      expect(avisadas(enT1, atadas())).toEqual(['/obra/x/o']);
    });
  });

  it('el documento que sale fecha la Obra cuyas Citas lo casaban', () => {
    const h = historial({ [DOCUMENTO]: { antes: VERSION_OPACA, despues: null } });
    const corpus = conBajas(corpusDeEjemplo([], []), h);
    expect(corpus.bajas?.documentos).toEqual([DOCUMENTO]);
    // Y, desde la 31.2, las Páginas de Cita de esa Obra, cuyo pasaje salía de él.
    expect(refechadas(corpus, h)).toEqual(['/cita/x-a', '/cita/x-b', '/cita/x-c', '/obra/x/o']);
  });

  it('31.2 — una Cita sin Obra compone solo sus documentos, y la de otra Obra, ninguno de esta', () => {
    const base = corpusDeEjemplo();
    const sinObra: CorpusParaFechar = {
      ...base,
      citas: base.citas.map((c) => {
        if (c.slug !== 'x-c') return c;
        const { obra: _obra, ...sinSuObra } = c;
        return sinSuObra;
      }),
    };
    // `x-c` sin Obra sigue casando el documento de su obra declarada: lo compone ella sola.
    const relacion = relacionDeSuperficies(sinObra);
    const documentosDe = (ruta: string) =>
      [...(relacion.get(ruta)?.componentes ?? [])].map((c) => c.fichero).filter((f) => f.startsWith('corpus/fuentes/'));
    expect(documentosDe('/cita/x-c/')).toEqual([DOCUMENTO]);
    const pagina = 'corpus/fuentes/fuente--obra-o--iii.txt';
    const enT1 = { [pagina]: { antes: null, despues: VERSION_OPACA as Version } };
    expect(refechadas({ ...sinObra, documentos: [DOCUMENTO, pagina] }, historial(enT1))).toEqual(['/cita/x-a', '/cita/x-b', '/cita/x-c', '/obra/x/o']);
    // La Cita de otra Obra no compone el documento de esta.
    expect(relacion.has('/cita/y-b/')).toBe(true);
    expect(documentosDe('/cita/y-b/')).toEqual([]);
  });

  it('reunir: la Obra destino y las Páginas de Cita y listados de las Citas que la absorbida reclamaba', () => {
    const absorbida = 'corpus/obras/x--q.yml';
    const nueva = 'corpus/citas/x--d.md';
    const versionAbsorbida = { autor: 'x', titulo: 'Otra obra', formas: [formaDeObra('Otra obra')] };
    const versionNueva = cita('x-d', 'x', ['u'], 'Otra obra');
    const h = historial({
      'corpus/obras/x--o.yml': editado('corpus/obras/x--o.yml', { formas: ['obra o', formaDeObra('Otra obra')] }),
      [absorbida]: { antes: versionAbsorbida, despues: null },
    });
    h.set(absorbida, [...(h.get(absorbida) ?? []), { fecha: T0, antes: null, despues: versionAbsorbida }]);
    h.set(nueva, [{ fecha: T0, antes: null, despues: versionNueva }]);
    const base = corpusDeEjemplo();
    const corpus = conBajas(
      {
        ...base,
        citas: [...base.citas, { slug: 'x-d', autor: 'x', temas: ['u'], obra: 'x--o', obraDeclarada: 'Otra obra', ruta: nueva }],
        obras: (base.obras ?? []).map((o) => (o.nombre === 'x--o' ? { ...o, formas: ['obra o', formaDeObra('Otra obra')] } : o)),
      },
      h,
    );
    expect(corpus.bajas?.obras?.map((o) => o.ruta)).toEqual([absorbida]);
    // Y `/obras/`, por las formas de la destino y la absorbida que sale (26.4).
    // Y, desde la 31.2, las demás Páginas de Cita de la destino, por sus `formas`.
    const esperadas = ['/obra/x/o', '/cita/x-a', '/cita/x-b', '/cita/x-c', '/cita/x-d', '/autor/x', '/tema/u', '/obras'].sort();
    expect(refechadas(corpus, h)).toEqual(esperadas);
    // Fecha y aviso coinciden: la absorbida la encuentra el aviso en la relación de antes.
    const enT1 = {
      'corpus/obras/x--o.yml': editado('corpus/obras/x--o.yml', { formas: ['obra o', formaDeObra('Otra obra')] }),
      [absorbida]: { antes: versionAbsorbida as Version, despues: null },
    };
    const antes: CorpusParaFechar = {
      ...base,
      citas: [...base.citas, { slug: 'x-d', autor: 'x', temas: ['u'], obra: 'x--q', obraDeclarada: 'Otra obra', ruta: nueva }],
      obras: [...(base.obras ?? []), { nombre: 'x--q', autor: 'x', formas: [formaDeObra('Otra obra')], ruta: absorbida }],
    };
    const despues: CorpusParaFechar = { ...base, citas: corpus.citas, ...(corpus.obras ? { obras: corpus.obras } : {}) };
    expect(avisadas(enT1, despues, antes)).toEqual(esperadas);
  });

  it('la baja de un Autor, un Tema o una Colección no compone nada vivo, y no lanza', () => {
    const salen = ['corpus/autores/y.yml', 'corpus/temas/u.yml', 'corpus/colecciones/c.yml'];
    const h = historial(Object.fromEntries(salen.map((ruta) => [ruta, { antes: VERSIONES[ruta] as Version, despues: null }])));
    const vivos = new Set(Object.keys(VERSIONES).filter((ruta) => !salen.includes(ruta)));
    expect(bajasDelHistorial(h, familiaDeFichero, vivos)).toEqual({ citas: [], obras: [], documentos: [] });
  });

  it('una versión ilegible cuenta como cambio de todos los campos, sin lanzar', () => {
    const enT1 = { 'corpus/citas/x--a.md': { antes: VERSION_OPACA as Version, despues: VERSIONES['corpus/citas/x--a.md'] as Version } };
    const h = historial(enT1);
    expect(() => fechasPorSuperficie(corpusDeEjemplo(), h)).not.toThrow();
    expect(refechadas(corpusDeEjemplo(), h)).toEqual(['/cita/x-a', '/autor/x', '/autores', '/obras', '/tema/t', '/obra/x/o'].sort());
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual(['/cita/x-a', '/autor/x', '/autores', '/obras', '/tema/t', '/obra/x/o'].sort());
  });

  it('sin historial no se declara ninguna fecha', () => {
    expect(fechasPorSuperficie(corpusDeEjemplo(), new Map()).size).toBe(0);
  });

  it('la fecha es la más reciente **por instante**, no la primera del historial', () => {
    const ruta = 'corpus/citas/x--a.md';
    const h = historial({});
    // Un historial cuyo orden no es el del tiempo: el primero que aparece es el más viejo.
    h.set(ruta, [
      { fecha: '2025-01-01T00:00:00.000Z', antes: null, despues: VERSIONES[ruta] as Version },
      { fecha: T1, ...editado(ruta, { texto: 'Otro texto.' }) },
    ]);
    expect(fechasPorSuperficie(corpusDeEjemplo(), h).get('/cita/x-a')).toBe(T1);
  });
});

describe('Historia 24.8 — qué es una baja', () => {
  it('lo vivo no es baja aunque su historial termine en un borrado, y lo opaco no dice a qué componía', () => {
    const h: Historial = new Map([
      ['corpus/citas/viva.md', [{ fecha: '2026-01-02T00:00:00.000Z', antes: { slug: 'a', autor: 'x' }, despues: null }]],
      ['corpus/citas/opaca.md', [{ fecha: '2026-01-02T00:00:00.000Z', antes: VERSION_OPACA, despues: null }]],
      ['corpus/citas/sigue.md', [{ fecha: '2026-01-02T00:00:00.000Z', antes: null, despues: { slug: 'b', autor: 'x' } }]],
      [
        'corpus/citas/ida.md',
        [
          { fecha: '2026-01-01T00:00:00.000Z', antes: null, despues: { slug: 'c', autor: 'x' } },
          { fecha: '2026-01-03T00:00:00.000Z', antes: { slug: 'c', autor: 'x', temas: ['t'], procedencia: { obra: 'O' } }, despues: null },
        ],
      ],
      ['corpus/obras/x--o.yml', [{ fecha: '2026-01-02T00:00:00.000Z', antes: { autor: 'x', titulo: 'O', formas: ['o'] }, despues: null }]],
    ]);
    const bajas = bajasDelHistorial(h, familiaDeFichero, new Set(['corpus/citas/viva.md']));
    expect(bajas.citas).toEqual([{ slug: 'c', autor: 'x', temas: ['t'], obraDeclarada: 'O', ruta: 'corpus/citas/ida.md' }]);
    expect(bajas.obras).toEqual([{ nombre: 'x--o', autor: 'x', formas: ['o'], ruta: 'corpus/obras/x--o.yml' }]);
    expect(bajas.documentos).toEqual([]);
  });
});

/**
 * El fallo mudo, en el plano puro: qué se considera «esto no ha fechado nada».
 *
 * `git log -- <ámbito que no casa>` sale con código 0 y sin salida, y con eso las mil
 * setecientas fechas se omiten una a una como si cada superficie fuera un caso legítimo de
 * «fecha indeterminable». Sin este juicio, la historia entera puede quedarse en nada con
 * todas las pruebas en verde.
 */
describe('Historia 22.4 — la Página de Obra lleva `lastmod`, como las demás agregaciones', () => {
  const CON_OBRAS: CorpusParaFechar = {
    ...CORPUS,
    citas: CORPUS.citas.map((cita) =>
      cita.autor === 'seneca' ? { ...cita, obra: 'seneca--cartas-a-lucilio' } : cita,
    ),
    obras: [
      { nombre: 'seneca--cartas-a-lucilio', autor: 'seneca', ruta: 'obras/seneca--cartas.yml' },
      // Sin Citas: no tiene página y no se declara.
      { nombre: 'seneca--de-la-ira', autor: 'seneca', ruta: 'obras/seneca--ira.yml' },
    ],
  };

  it('agrega su ficha, sus Citas y el fichero de su Autor', () => {
    expect(ficherosPorSuperficie(CON_OBRAS).get('/obra/seneca/cartas-a-lucilio')?.sort()).toEqual(
      ['obras/seneca--cartas.yml', 'citas/a.md', 'citas/b.md', 'autores/seneca.yml'].sort(),
    );
    expect(ficherosPorSuperficie(CON_OBRAS).has('/obra/seneca/de-la-ira')).toBe(false);
  });

  it('su fecha es la más reciente de sus Citas, y la de la entrada del sitemap', () => {
    const fechas = new Map([
      ['obras/seneca--cartas.yml', '2026-01-01T00:00:00.000Z'],
      ['citas/a.md', '2026-02-01T00:00:00.000Z'],
      ['citas/b.md', '2026-03-01T00:00:00.000Z'],
      ['citas/c.md', '2026-09-01T00:00:00.000Z'],
    ]);
    const porSuperficie = fechasConAltas(CON_OBRAS, fechas);
    expect(porSuperficie.get('/obra/seneca/cartas-a-lucilio')).toBe('2026-03-01T00:00:00.000Z');
    expect(
      fechaDeLaEntrada(porSuperficie, 'https://sabiduriadebolsillo.net/obra/seneca/cartas-a-lucilio/'),
    ).toBe('2026-03-01T00:00:00.000Z');
  });
});

describe('Historia 18.4 — cuándo el historial no fechó lo que debía', () => {
  const TODAS = new Map(
    [
      'citas/a.md',
      'citas/b.md',
      'citas/c.md',
      'autores/seneca.yml',
      'autores/marco-aurelio.yml',
      'temas/el-tiempo.yml',
      'temas/la-vida.yml',
      'colecciones/breves.yml',
    ].map((ruta) => [ruta, '2026-01-01T00:00:00.000Z'] as const),
  );

  it('un mapa vacío con un Corpus que sí tiene ficheros es motivo de aviso', () => {
    expect(coberturaInsuficiente(CORPUS, new Map())).toMatch(/ni uno solo/);
  });

  it('fechar casi nada también avisa: es el cruce roto, no el historial menguado', () => {
    expect(coberturaInsuficiente(CORPUS, new Map([['citas/a.md', '2026-01-01T00:00:00.000Z']]))).toMatch(
      /solo fechó 1 de los 8/,
    );
  });

  it('que falten unas pocas es normal y no avisa: es la fila «fecha indeterminable»', () => {
    const casiTodas = new Map(TODAS);
    casiTodas.delete('citas/a.md');
    casiTodas.delete('temas/la-vida.yml');
    expect(coberturaInsuficiente(CORPUS, casiTodas)).toBeUndefined();
  });

  it('un Corpus vacío no avisa: no hay nada que fechar y el silencio es la respuesta', () => {
    const vacio: CorpusParaFechar = { citas: [], autores: [], temas: [], colecciones: [] };
    expect(coberturaInsuficiente(vacio, new Map())).toBeUndefined();
  });
});

describe('Historia 18.4 — de la entrada del sitemap a su fecha', () => {
  const FECHAS = new Map([['/cita/seneca-el-tiempo', '2026-03-15T00:00:00.000Z']]);

  it('la dirección completa del sitemap encuentra su superficie, con barra final y todo', () => {
    expect(fechaDeLaEntrada(FECHAS, 'https://sabiduriadebolsillo.net/cita/seneca-el-tiempo/')).toBe(
      '2026-03-15T00:00:00.000Z',
    );
  });

  it('la portada se reconoce por su dirección desnuda', () => {
    expect(fechaDeLaEntrada(new Map([['/', 'ayer']]), 'https://sabiduriadebolsillo.net/')).toBe(
      'ayer',
    );
  });

  it('una superficie sin fecha devuelve la ausencia, que es lo que omite el campo', () => {
    expect(fechaDeLaEntrada(FECHAS, 'https://sabiduriadebolsillo.net/buscar/')).toBeUndefined();
  });

  it('una dirección que no se deja leer devuelve la ausencia y **no lanza**', () => {
    // `@astrojs/sitemap` descarta el sitemap entero si su `serialize` falla, así que el
    // precio de lanzar aquí no es una entrada sin fecha: es un sitio sin sitemap.
    expect(() => fechaDeLaEntrada(FECHAS, '')).not.toThrow();
    expect(fechaDeLaEntrada(FECHAS, '')).toBeUndefined();
    expect(fechaDeLaEntrada(FECHAS, 'cita/sin-barra-inicial')).toBeUndefined();
  });
});

/**
 * El plano que de verdad falla: la lectura del historial.
 *
 * Estas pruebas montan repositorios de verdad porque los fallos que hay que cazar no se
 * pueden fingir. Un checkout superficial **no** devuelve el vacío: git trata el commit
 * injertado como raíz y `--name-only` lista el árbol entero, así que todos los ficheros
 * saldrían con la misma fecha —la del último commit— y el sitemap publicaría mil
 * setecientas fechas falsas con cara de éxito. Y el fallo contrario tampoco: `git log` sale
 * con código 0 y salida vacía cuando el ámbito no casa, y ahí no hay nada que capturar.
 *
 * ── Por qué el entorno de git se desinfecta ──────────────────────────────────────────
 *
 * `GIT_CONFIG_GLOBAL` y `GIT_CONFIG_SYSTEM` apuntan a `/dev/null` para que estas pruebas no
 * hereden la configuración de quien las corre. Con un `commit.gpgsign = true` global fallan
 * al commitear y con un `core.hooksPath` global pueden colgarse en un gancho ajeno, y en
 * los dos casos el fallo no tiene nada que ver con lo que se mide.
 *
 * El código de producción **no** hace esto, y es deliberado: `actions/checkout` escribe
 * `safe.directory` en la configuración global del corredor, así que neutralizarla allí
 * rompería git justo en el CI. Aquí los repositorios son del propio usuario y no hace falta.
 */
const ENTORNO_LIMPIO = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
  GIT_TERMINAL_PROMPT: '0',
  GIT_AUTHOR_NAME: 'Prueba',
  GIT_AUTHOR_EMAIL: 'prueba@example.com',
  GIT_COMMITTER_NAME: 'Prueba',
  GIT_COMMITTER_EMAIL: 'prueba@example.com',
};

/** `git` en un directorio, con el entorno desinfectado y, si se pide, un instante fijado. */
function gitEn(directorio: string) {
  return (argumentos: string[], momento?: string) =>
    ejecutar('git', argumentos, {
      cwd: directorio,
      env: {
        ...ENTORNO_LIMPIO,
        ...(momento ? { GIT_AUTHOR_DATE: momento, GIT_COMMITTER_DATE: momento } : {}),
      },
    });
}

/**
 * Un directorio temporal ya canonizado.
 *
 * En macOS `/tmp` es un enlace a `/private/tmp` y git contesta siempre con la forma física:
 * sin canonizar aquí, la prueba compararía `/var/folders/…` contra `/private/var/folders/…`
 * y estaría midiendo el enlace en vez del cruce.
 */
async function temporal(prefijo: string): Promise<string> {
  return realpath(await mkdtemp(join(tmpdir(), prefijo)));
}

describe('Historia 18.4 — el historial, contra git de verdad', () => {
  /** Un repositorio con dos commits fechados a mano, para no depender del día de ejecución. */
  async function repositorio(): Promise<string> {
    const raiz = await temporal('sabiduria-historial-');
    const git = gitEn(raiz);

    await git(['init', '--initial-branch=principal']);
    await mkdir(join(raiz, 'corpus', 'citas'), { recursive: true });
    await writeFile(join(raiz, 'corpus', 'citas', 'a.md'), 'primera\n', 'utf8');
    await writeFile(join(raiz, 'corpus', 'citas', 'b.md'), 'primera\n', 'utf8');
    await git(['add', 'corpus']);
    await git(['commit', '-m', 'las dos'], '2024-01-02T09:00:00+0000');

    await writeFile(join(raiz, 'corpus', 'citas', 'b.md'), 'segunda\n', 'utf8');
    await git(['add', 'corpus']);
    await git(['commit', '-m', 'solo la segunda'], '2024-03-04T09:00:00+0000');

    return raiz;
  }

  it('cada fichero lleva la fecha de su último cambio, no la del último commit', async () => {
    const raiz = await repositorio();
    try {
      const historial = await historialDeLosFicheros(raiz, [join(raiz, 'corpus')]);
      expect(ultimaFecha(historial, resolve(raiz, 'corpus/citas/a.md'))).toBe('2024-01-02T09:00:00.000Z');
      expect(ultimaFecha(historial, resolve(raiz, 'corpus/citas/b.md'))).toBe('2024-03-04T09:00:00.000Z');
      // Historia 24.8 — cada transición trae sus dos versiones, analizadas: b.md tiene alta y edición.
      expect(historial.get(resolve(raiz, 'corpus/citas/b.md'))?.map((t) => [t.antes === null, t.despues === null])).toEqual([
        [false, false],
        [true, false],
      ]);
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it('un nombre con acento y con espacio conserva su fecha, sin comillas de git', async () => {
    // Git entrecomilla en C cualquier ruta que considere rara —`"corpus/citas/caf\303\251
    // con leche.md"`— y resolver ese literal perdería la fecha en silencio. Hoy los slugs
    // son `^[a-z0-9-]+$`, pero nada obliga a que lo sean los **nombres de fichero**: el día
    // que entre uno con acento, sin `-z` el sitemap se quedaría sin esa fecha sin avisar.
    const raiz = await temporal('sabiduria-nombre-raro-');
    const git = gitEn(raiz);
    try {
      await git(['init', '--initial-branch=principal']);
      await mkdir(join(raiz, 'corpus', 'citas'), { recursive: true });
      await writeFile(join(raiz, 'corpus', 'citas', 'café con leche.md'), 'x\n', 'utf8');
      await git(['add', 'corpus']);
      await git(['commit', '-m', 'el raro'], '2024-07-08T09:00:00+0000');

      // El nombre se relee del disco: macOS normaliza los acentos al escribirlos, así que
      // la forma que hay que buscar es la que el sistema de ficheros guardó.
      const [nombre] = await readdir(join(raiz, 'corpus', 'citas'));
      const historial = await historialDeLosFicheros(raiz, [join(raiz, 'corpus')]);

      expect(historial.size).toBe(1);
      expect(ultimaFecha(historial, resolve(raiz, 'corpus/citas', nombre ?? ''))).toBe(
        '2024-07-08T09:00:00.000Z',
      );
      expect([...historial.keys()].some((ruta) => ruta.includes('"') || ruta.includes('\\3'))).toBe(
        false,
      );
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it('el instante se declara en UTC, y no en el huso de quien construye', async () => {
    // Un commit de las 23:30 en Madrid son las 21:30 en UTC, y del día anterior. Si la
    // cadena saliera con el desfase de origen, el mismo commit se anunciaría de dos formas
    // distintas según quién construyera, y el criterio «dos construcciones del mismo commit
    // dan las mismas fechas» se rompería sin que nadie viera por qué.
    const raiz = await temporal('sabiduria-historial-');
    const git = gitEn(raiz);
    try {
      await git(['init', '--initial-branch=principal']);
      await mkdir(join(raiz, 'corpus'), { recursive: true });
      await writeFile(join(raiz, 'corpus', 'x.md'), 'x\n', 'utf8');
      await git(['add', 'corpus']);
      await git(['commit', '-m', 'x'], '2024-05-10T23:30:00+0200');

      const historial = await historialDeLosFicheros(raiz, [join(raiz, 'corpus')]);
      expect(ultimaFecha(historial, resolve(raiz, 'corpus/x.md'))).toBe('2024-05-10T21:30:00.000Z');
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it('un repositorio completo dice dónde empieza, y se declara fiable', async () => {
    const raiz = await repositorio();
    try {
      const estado = await estadoDelRepositorio(raiz);
      expect(estado.motivo).toBeUndefined();
      expect(estado.tope).toBe(raiz);
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it('una copia superficial se rechaza, que es el fallo que la historia teme', async () => {
    const origen = await repositorio();
    const copia = await temporal('sabiduria-superficial-');
    try {
      await ejecutar('git', ['clone', '--depth', '1', `file://${origen}`, copia], {
        env: ENTORNO_LIMPIO,
      });

      // La premisa, y es el corazón del asunto: la copia superficial **no** devuelve el
      // vacío. Git trata el commit injertado como raíz y fecha el árbol entero con él, así
      // que sin la comprobación el sitemap publicaría todas las entradas con la misma fecha.
      const historial = await historialDeLosFicheros(copia, [join(copia, 'corpus')]);
      expect(ultimaFecha(historial, resolve(copia, 'corpus/citas/a.md'))).toBe('2024-03-04T09:00:00.000Z');

      const estado = await estadoDelRepositorio(copia);
      expect(estado.motivo).toMatch(/superficial/);
      expect(estado.tope).toBeUndefined();
    } finally {
      await rm(origen, { recursive: true, force: true });
      await rm(copia, { recursive: true, force: true });
    }
  });

  it('donde no hay repositorio tampoco hay historial fiable', async () => {
    const raiz = await temporal('sabiduria-sin-git-');
    try {
      const estado = await estadoDelRepositorio(raiz);
      expect(estado.motivo).toBeDefined();
      expect(estado.tope).toBeUndefined();
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });
});

/**
 * El cruce completo, que es donde vivían los dos fallos graves de la revisión.
 *
 * Aquí no se llama a `historialDeLosFicheros` con la raíz ya sabida: se llama a
 * `fechasDeLasSuperficies` como lo hace el sitemap, y se le da un proyecto que **no** es el
 * directorio de trabajo. Si el módulo volviera a suponer `process.cwd()`, o volviera a
 * resolver las rutas de git contra algo que no es la raíz del repositorio, estas dos
 * pruebas se apagan.
 */
describe('Historia 18.4 — el cruce entre lo que git dice y lo que el Corpus tiene', () => {
  /** Un Corpus mínimo pero de verdad: lo que leen `leerCitas`, `leerAutores` y compañía. */
  async function escribirCorpus(base: string): Promise<void> {
    for (const dir of ['citas', 'autores', 'temas', 'colecciones']) {
      await mkdir(join(base, 'corpus', dir), { recursive: true });
    }
    await writeFile(
      join(base, 'corpus', 'citas', 'seneca--el-tiempo.md'),
      '---\nslug: seneca-el-tiempo\nautor: seneca\ntemas:\n  - el-tiempo\n---\n\nTexto.\n',
      'utf8',
    );
    await writeFile(join(base, 'corpus', 'autores', 'seneca.yml'), 'nombre: Séneca\n', 'utf8');
    await writeFile(join(base, 'corpus', 'temas', 'el-tiempo.yml'), 'nombre: El tiempo\n', 'utf8');
    await writeFile(
      join(base, 'corpus', 'colecciones', 'breves.yml'),
      'nombre: Breves\nmiembros:\n  - seneca-el-tiempo\n',
      'utf8',
    );
  }

  it('el proyecto en un subdirectorio del repositorio se fecha igual, sin tocar el cwd', async () => {
    /*
     * `git log` imprime rutas relativas a la **raíz del repositorio**, no al directorio
     * desde el que se le pregunta. Aquí la raíz del repositorio y la del proyecto son
     * distintas a propósito, y ninguna de las dos es el directorio de trabajo del proceso
     * que corre la prueba. Cuando esto suponía `process.cwd()`, el cruce no casaba ni una
     * ruta y el sitemap salía sin fechas sin que nada fallara.
     */
    const raiz = await temporal('sabiduria-subdirectorio-');
    const proyecto = join(raiz, 'sitio');
    const git = gitEn(raiz);
    try {
      await git(['init', '--initial-branch=principal']);
      await escribirCorpus(proyecto);
      await git(['add', 'sitio']);
      await git(['commit', '-m', 'el Corpus'], '2024-01-02T09:00:00+0000');

      const avisos: string[] = [];
      const fechas = await fechasDeLasSuperficies(proyecto, (mensaje) => avisos.push(mensaje));

      expect(avisos).toEqual([]);
      expect(fechas.get('/cita/seneca-el-tiempo')).toBe('2024-01-02T09:00:00.000Z');
      expect(fechas.get('/autor/seneca')).toBe('2024-01-02T09:00:00.000Z');
      expect(fechas.get('/tema/el-tiempo')).toBe('2024-01-02T09:00:00.000Z');
      expect(fechas.get('/coleccion/breves')).toBe('2024-01-02T09:00:00.000Z');
      // Y la portada sigue sin fecha aunque el historial esté completo: es la regla.
      expect(fechas.has('/')).toBe(false);
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it('un `git log` que sale con código 0 y sin nada **avisa**, y no se omite en silencio', async () => {
    /*
     * El fallo mudo, de extremo a extremo. El repositorio existe, no es superficial y git
     * no revienta: simplemente no conoce ninguno de los ficheros del Corpus, así que
     * contesta con éxito y sin una sola línea. Sin este aviso, las 1.715 fechas se omiten
     * una a una como si cada superficie fuera un caso legítimo de «fecha indeterminable» y
     * la historia entera se queda en nada con todas las pruebas en verde.
     *
     * Si esta prueba se cae, el aviso ha desaparecido; no la relajes.
     */
    const raiz = await temporal('sabiduria-cero-mudo-');
    const git = gitEn(raiz);
    try {
      await git(['init', '--initial-branch=principal']);
      // Un commit de verdad, para que `git log` funcione, y el Corpus **sin versionar**.
      await git(['commit', '--allow-empty', '-m', 'la raíz'], '2024-01-02T09:00:00+0000');
      await escribirCorpus(raiz);

      const avisos: string[] = [];
      const fechas = await fechasDeLasSuperficies(raiz, (mensaje) => avisos.push(mensaje));

      expect(fechas.size).toBe(0);
      expect(avisos).toHaveLength(1);
      expect(avisos[0]).toMatch(/lastmod/);
      expect(avisos[0]).toMatch(/ni uno solo/);
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it('sin repositorio se avisa con el mismo énfasis y no se declara ninguna fecha', async () => {
    const raiz = await temporal('sabiduria-sin-repo-');
    try {
      await escribirCorpus(raiz);
      const avisos: string[] = [];
      const fechas = await fechasDeLasSuperficies(raiz, (mensaje) => avisos.push(mensaje));

      expect(fechas.size).toBe(0);
      expect(avisos).toHaveLength(1);
      expect(avisos[0]).toMatch(/lastmod/);
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });
});

describe('Historia 35.2 — la relación de AD-27 conoce al Personaje', () => {
  const PERSONAJE = 'personajes/batman.yml';
  const CON_PERSONAJES: CorpusParaFechar = {
    citas: [
      // Con Autor y Personaje, en la ficha de su Autor.
      { slug: 'seneca-la-noche', autor: 'seneca', personaje: 'batman', temas: ['el-tiempo'], obra: 'seneca--la-noche', obraDeclarada: 'La noche', ruta: 'citas/c1.md' },
      // De un Personaje sin Autor, en la ficha del Personaje.
      { slug: 'batman-el-alba', personaje: 'batman', temas: [], obra: 'batman--el-alba', obraDeclarada: 'El alba', ruta: 'citas/c2.md' },
      // Resuelve, en el segundo paso, una ficha de Personaje que se fue.
      { slug: 'robin-la-cueva', personaje: 'robin', temas: [], obraDeclarada: 'La cueva', ruta: 'citas/c3.md' },
      // Un Personaje cuyas Citas no tienen Obra no figura en `/obras/`.
      { slug: 'joker-sin-obra', personaje: 'joker', temas: [], ruta: 'citas/c4.md' },
    ],
    autores: [{ slug: 'seneca', ruta: 'autores/seneca.yml' }],
    personajes: [
      { slug: 'batman', ruta: PERSONAJE },
      { slug: 'robin', ruta: 'personajes/robin.yml' },
      { slug: 'joker', ruta: 'personajes/joker.yml' },
    ],
    temas: [{ slug: 'el-tiempo', ruta: 'temas/el-tiempo.yml' }],
    colecciones: [],
    obras: [
      { nombre: 'seneca--la-noche', autor: 'seneca', formas: ['la noche'], ruta: 'obras/s.yml' },
      // De Batman, con Séneca informativo: una Cita solo de Séneca la resuelve en el primer paso.
      { nombre: 'batman--el-alba', personaje: 'batman', personajes: ['batman'], autor: 'seneca', formas: ['el alba'], ruta: 'obras/b.yml' },
    ],
    bajas: {
      citas: [{ slug: 'seneca-el-alba-se-fue', autor: 'seneca', temas: [], obraDeclarada: 'El alba', ruta: 'citas/baja.md' }],
      obras: [{ nombre: 'batman--la-cueva', personaje: 'batman', personajes: ['batman', 'robin'], formas: ['la cueva'], ruta: 'obras/cueva.yml' }],
      documentos: [],
    },
  };
  const componentes = componentesPorSuperficie(CON_PERSONAJES);
  const camposDe = (ruta: string, fichero: string) =>
    componentes.get(rutaNormalizada(ruta))?.find((c) => c.fichero === fichero)?.campos;

  it('su `nombre` compone la Página de Cita, los listados y la Obra de que es dueño', () => {
    expect(camposDe('/cita/seneca-la-noche/', PERSONAJE)).toEqual(['nombre']);
    expect(camposDe('/autor/seneca/', PERSONAJE)).toEqual(['nombre']);
    expect(camposDe('/tema/el-tiempo/', PERSONAJE)).toEqual(['nombre']);
    expect(camposDe('/obra/batman/el-alba/', PERSONAJE)).toEqual(['nombre']);
  });

  it('su `ordenAlfabetico` fecha los Directorios, y `universo` solo su página y `/autores/` (Historias 35.3 y 35.5)', () => {
    expect(camposDe('/autores/', PERSONAJE)).toContain('ordenAlfabetico');
    expect(camposDe('/obras/', PERSONAJE)).toContain('ordenAlfabetico');
    // Historia 35.5 — la sección «Personajes» de los Directorios pinta el nombre, y la Fila de `/autores/`
    // dice «personaje de {universo}».
    expect(camposDe('/autores/', PERSONAJE)).toEqual(['nombre', 'universo', 'ordenAlfabetico']);
    expect(camposDe('/obras/', PERSONAJE)).toEqual(['nombre', 'ordenAlfabetico']);
    for (const [ruta, lista] of componentes) {
      for (const { fichero, campos } of lista) {
        if (fichero.startsWith('personajes/') && !ruta.startsWith('/personaje/') && ruta !== '/autores') {
          expect(campos).not.toContain('universo');
        }
      }
    }
    // Sin Obra, el Personaje no compone `/obras/`, aunque sí `/autores/`.
    expect(camposDe('/obras/', 'personajes/joker.yml')).toBeUndefined();
    expect(camposDe('/autores/', 'personajes/joker.yml')).toBeDefined();
  });

  it('Historia 35.3 — la Página de Personaje: su fichero, sus Citas, sus Autores y los títulos de sus Obras', () => {
    expect(camposDe('/personaje/batman/', PERSONAJE)).toEqual(['nombre', 'universo', 'semblanza', 'semblanzaPropia', 'biografia']);
    expect(camposDe('/personaje/batman/', 'citas/c1.md')).toEqual(['texto', 'autor', 'temas', 'procedencia', 'fuente', 'slug', 'personaje']);
    expect(camposDe('/personaje/batman/', 'citas/c2.md')).toBeDefined();
    expect(camposDe('/personaje/batman/', 'obras/s.yml')).toEqual(['titulo']);
    expect(camposDe('/personaje/batman/', 'obras/b.yml')).toEqual(['titulo']);
    // El Autor de sus Citas no lo pinta la página (la Tarjeta de Cita lleva solo la Obra).
    expect(camposDe('/personaje/batman/', 'autores/seneca.yml')).toBeUndefined();
    // Una Cita de otro Personaje no la compone; uno sin Citas vivas no tiene página.
    expect(camposDe('/personaje/batman/', 'citas/c4.md')).toBeUndefined();
    expect(componentes.has('/personaje/joker')).toBe(true);
  });

  it('Historia 35.3 — la baja de una Cita que declaraba un Personaje fecha su página, si sigue viva', () => {
    const conBaja = componentesPorSuperficie({
      ...CON_PERSONAJES,
      bajas: {
        ...CON_PERSONAJES.bajas,
        citas: [{ slug: 'seneca-se-fue', autor: 'seneca', personaje: 'batman', temas: [], ruta: 'citas/baja-de-batman.md' }],
      },
    });
    expect(conBaja.get('/personaje/batman')?.find((c) => c.fichero === 'citas/baja-de-batman.md')).toBeDefined();
    expect(conBaja.has('/personaje/seneca-se-fue')).toBe(false);
  });

  it('las bajas se resuelven con la regla de dos pasos, también por el `autor` informativo', () => {
    // La Cita de Séneca que se fue resolvía la ficha de Batman que lo nombra: fecha esa Obra.
    expect(camposDe('/obra/batman/el-alba/', 'citas/baja.md')).toBeDefined();
    // La ficha de Personaje que se fue la reclamaba la Cita de Robin, por `personajes`.
    expect(camposDe('/cita/robin-la-cueva/', 'obras/cueva.yml')).toBeDefined();
  });

  it('el lector del disco (`corpusParaFechar`) lleva los Personajes y sus campos a la relación', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-fechar-personajes-'));
    try {
      const corpus = join(raiz, 'corpus');
      for (const dir of ['citas', 'autores', 'personajes', 'temas', 'colecciones', 'obras', 'fuentes']) {
        await mkdir(join(corpus, dir), { recursive: true });
      }
      await writeFile(join(corpus, 'autores', 'seneca.yml'), 'nombre: Séneca\n', 'utf8');
      await writeFile(join(corpus, 'personajes', 'batman.yml'), 'nombre: Batman\nuniverso: DC Comics\n', 'utf8');
      await writeFile(
        join(corpus, 'citas', 'seneca--la-noche.md'),
        '---\nslug: seneca-la-noche\ntexto: "La noche."\nautor: seneca\npersonaje: batman\nprocedencia:\n  obra: "La noche"\n---\n',
        'utf8',
      );
      await writeFile(
        join(corpus, 'obras', 'batman--la-noche.yml'),
        'autor: "seneca"\npersonaje: "batman"\npersonajes:\n  - "batman"\ntitulo: "La noche"\nformas:\n  - "la noche"\n',
        'utf8',
      );
      const leido = await corpusParaFechar(raiz, { documentos: [] });
      expect(leido.personajes).toEqual([{ slug: 'batman', ruta: resolve(join(corpus, 'personajes', 'batman.yml')) }]);
      expect(leido.citas[0]).toMatchObject({ autor: 'seneca', personaje: 'batman', obra: 'batman--la-noche' });
      expect(leido.obras?.[0]).toMatchObject({ personaje: 'batman', personajes: ['batman'], autor: 'seneca' });
      const relacion = componentesPorSuperficie({ ...leido, bajas: { citas: [], obras: [], documentos: [] } });
      const ficheroDelPersonaje = resolve(join(corpus, 'personajes', 'batman.yml'));
      const de = (ruta: string) =>
        relacion.get(rutaNormalizada(ruta))?.find((c) => c.fichero === ficheroDelPersonaje)?.campos;
      expect(de('/cita/seneca-la-noche/')).toEqual(['nombre']);
      expect(de('/obra/batman/la-noche/')).toEqual(['nombre']);
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it('una baja sin Autor ni Personaje no se lee, y la relación no lanza', () => {
    const historial: Historial = new Map([
      ['citas/rota.md', [{ fecha: '2026-11-01T00:00:00Z', antes: { slug: 'rota', temas: [] }, despues: null }]],
      ['obras/rota.yml', [{ fecha: '2026-11-01T00:00:00Z', antes: { formas: ['x'] }, despues: null }]],
    ]);
    const bajas = bajasDelHistorial(historial, familiaDeFichero, new Set());
    expect(bajas.citas).toEqual([]);
    expect(bajas.obras).toEqual([]);
    expect(() => relacionDeSuperficies({ ...CON_PERSONAJES, bajas })).not.toThrow();
  });
});

describe('Historia 35.6 — la Variante fecha solo la Página de Cita', () => {
  it('un cambio que solo toca `variante` cambia los campos de la Página de Cita y de ningún listado', () => {
    const antes = { texto: 'Hasta el infinito y más allá.', personaje: 'buzz', clase: 'atribuida' };
    const despues = { ...antes, variante: { texto: 'Hasta el infinito y aún más allá.', region: 'espana', origen: 'doblaje' } };
    const queCambian = Object.entries(CAMPOS_QUE_PINTA.cita)
      .filter(([, campos]) => cambiaronLosCampos({ antes, despues }, campos as Parameters<typeof cambiaronLosCampos>[1]))
      .map(([superficie]) => superficie);
    expect(queCambian).toEqual(['cita']);
  });

  it('Historia 35.11 — un cambio que solo toca `origen` no fecha nada: ninguna superficie lo pinta (AD-27 v9.2)', () => {
    const antes = { texto: 'Hasta el infinito y más allá.', personaje: 'buzz', clase: 'atribuida', origen: 'doblaje' };
    const despues = { ...antes, origen: 'traduccion-propia' };
    const queCambian = Object.entries(CAMPOS_QUE_PINTA.cita)
      .filter(([, campos]) => cambiaronLosCampos({ antes, despues }, campos as Parameters<typeof cambiaronLosCampos>[1]))
      .map(([superficie]) => superficie);
    expect(queCambian).toEqual([]);
    expect(CAMPOS_QUE_NO_FECHAN.cita).toContain('origen');
  });

  it('Historia 35.11 — un cambio que solo toca `partida` no fecha nada: no se pinta', () => {
    const antes = {
      texto: 'Hasta el infinito y más allá.',
      personaje: 'buzz',
      clase: 'atribuida',
      origen: 'traduccion-propia',
      partida: { texto: 'To infinity and beyond!', lengua: 'en' },
    };
    const despues = { ...antes, partida: { texto: 'To infinity, and beyond!', lengua: 'en' } };
    const queCambian = Object.entries(CAMPOS_QUE_PINTA.cita)
      .filter(([, campos]) => cambiaronLosCampos({ antes, despues }, campos as Parameters<typeof cambiaronLosCampos>[1]))
      .map(([superficie]) => superficie);
    expect(queCambian).toEqual([]);
    expect(CAMPOS_QUE_NO_FECHAN.cita).toContain('partida');
  });
});

/**
 * Historia 32.2, revisión — el cableado de la Ficha técnica, de punta a punta desde el disco y git.
 *
 * Las pruebas de arriba escriben `CorpusParaFechar` a mano, con `pinta` ya calculado. Aquí lo
 * produce `corpusParaFechar` leyendo un Corpus de verdad —la ficha atada, sus documentos de
 * `corpus/wikidata/` y `vigentes.yml`— y lo fecha `fechasDeLasSuperficies`, como el sitemap: si se
 * perdiera el reparto de `wikidata` o de `vigentesDeWikidata` en `obras[]`, si `entidadesQuePinta`
 * devolviera también el autor (P50) o si la ruta del documento no casara con la de git, esto se cae.
 */
describe('Historia 32.2 — la Ficha técnica fecha su Página de Obra desde el disco', () => {
  const OBRA = entidad('Q480', 100, {
    es: 'Sobre la brevedad de la vida',
    claims: { P50: [aEntidad('Q2054')], P136: [aEntidad('Q8261')], P407: [aEntidad('Q1321')] },
  });
  const AUTOR = entidad('Q2054', 30, { es: 'Séneca' });
  const GENERO = entidad('Q8261', 40, { es: 'ensayo' });
  const LENGUA = entidad('Q1321', 41, { es: 'latín' });
  const RUTA_DE_OBRA = '/obra/seneca/sobre-la-brevedad-de-la-vida';

  async function escribirCorpus(base: string): Promise<void> {
    const corpus = join(base, 'corpus');
    for (const dir of ['citas', 'autores', 'temas', 'colecciones', 'obras']) await mkdir(join(corpus, dir), { recursive: true });
    await writeFile(
      join(corpus, 'citas', 'seneca--el-tiempo.md'),
      '---\nslug: seneca-el-tiempo\nautor: seneca\ntemas:\n  - el-tiempo\nprocedencia:\n  obra: Sobre la brevedad de la vida\n---\n\nTexto.\n',
      'utf8',
    );
    await writeFile(join(corpus, 'autores', 'seneca.yml'), 'nombre: Séneca\n', 'utf8');
    await writeFile(join(corpus, 'temas', 'el-tiempo.yml'), 'nombre: El tiempo\n', 'utf8');
    await writeFile(
      join(corpus, 'obras', 'seneca--sobre-la-brevedad-de-la-vida.yml'),
      `autor: seneca\ntitulo: Sobre la brevedad de la vida\nformas:\n  - "${formaDeObra('Sobre la brevedad de la vida')}"\n` +
        'wikidata:\n  entidad: Q480\n  revision: 100\n',
      'utf8',
    );
    await sembrarWikidata(corpus, [OBRA, AUTOR, GENERO, LENGUA], { Q480: 100, Q2054: 30, Q8261: 40, Q1321: 41 });
  }

  it('la vigente de un género que pinta refecha la Obra; la de su autor (P50), no; ninguna refecha la Cita', async () => {
    const raiz = await temporal('sabiduria-ficha-tecnica-');
    const git = gitEn(raiz);
    const vigentes = (mapa: Record<string, number>) =>
      writeFile(join(raiz, 'corpus', 'wikidata', 'vigentes.yml'), componerVigentes(new Map(Object.entries(mapa))), 'utf8');
    try {
      await git(['init', '--initial-branch=principal']);
      await escribirCorpus(raiz);
      await git(['add', 'corpus']);
      await git(['commit', '-m', 'atada'], '2024-01-02T09:00:00+0000');

      await vigentes({ Q480: 100, Q2054: 30, Q8261: 42, Q1321: 41 });
      await git(['add', 'corpus']);
      await git(['commit', '-m', 'el género'], '2024-03-04T09:00:00+0000');

      await vigentes({ Q480: 100, Q2054: 31, Q8261: 42, Q1321: 41 });
      await git(['add', 'corpus']);
      await git(['commit', '-m', 'el autor'], '2024-05-06T09:00:00+0000');

      const avisos: string[] = [];
      const fechas = await fechasDeLasSuperficies(raiz, (mensaje) => avisos.push(mensaje));
      expect(avisos).toEqual([]);
      expect(fechas.get(RUTA_DE_OBRA)).toBe('2024-03-04T09:00:00.000Z');
      expect(fechas.get('/cita/seneca-el-tiempo')).toBe('2024-01-02T09:00:00.000Z');
      expect(fechas.get('/autor/seneca')).toBe('2024-01-02T09:00:00.000Z');
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it('con su documento ilegible, cualquier cambio de vigentes.yml refecha la Obra (también el de su autor)', async () => {
    const raiz = await temporal('sabiduria-ficha-tecnica-ilegible-');
    const git = gitEn(raiz);
    try {
      await git(['init', '--initial-branch=principal']);
      await escribirCorpus(raiz);
      await writeFile(join(raiz, 'corpus', 'wikidata', nombreDeDocumentoDeWikidata('Q480', 100)), '{ roto', 'utf8');
      await git(['add', 'corpus']);
      await git(['commit', '-m', 'atada, con el documento roto'], '2024-01-02T09:00:00+0000');

      // Solo cambia la vigente del autor (P50), que la línea no pinta: fechar de más antes que de menos.
      await writeFile(
        join(raiz, 'corpus', 'wikidata', 'vigentes.yml'),
        componerVigentes(new Map(Object.entries({ Q480: 100, Q2054: 31, Q8261: 40, Q1321: 41 }))),
        'utf8',
      );
      await git(['add', 'corpus']);
      await git(['commit', '-m', 'el autor'], '2024-05-06T09:00:00+0000');

      const fechas = await fechasDeLasSuperficies(raiz, () => {});
      expect(fechas.get(RUTA_DE_OBRA)).toBe('2024-05-06T09:00:00.000Z');
      expect(fechas.get('/cita/seneca-el-tiempo')).toBe('2024-01-02T09:00:00.000Z');
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it('un cambio del documento de su revisión refecha la Obra', async () => {
    const raiz = await temporal('sabiduria-ficha-tecnica-doc-');
    const git = gitEn(raiz);
    try {
      await git(['init', '--initial-branch=principal']);
      await escribirCorpus(raiz);
      await git(['add', 'corpus']);
      await git(['commit', '-m', 'atada'], '2024-01-02T09:00:00+0000');

      const documentoDeLaObra = join(raiz, 'corpus', 'wikidata', nombreDeDocumentoDeWikidata('Q480', 100));
      await writeFile(documentoDeLaObra, documento(OBRA, '2024-06-01'), 'utf8');
      await git(['add', 'corpus']);
      await git(['commit', '-m', 'el documento'], '2024-03-04T09:00:00+0000');

      const fechas = await fechasDeLasSuperficies(raiz, () => {});
      expect(fechas.get(RUTA_DE_OBRA)).toBe('2024-03-04T09:00:00.000Z');
      expect(fechas.get('/cita/seneca-el-tiempo')).toBe('2024-01-02T09:00:00.000Z');
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });
});

/**
 * Historia 32.3, revisión — el documento del incipit fecha su Página de Obra desde el disco y git.
 *
 * Las pruebas del incipit de arriba escriben `CorpusParaFechar` a mano; aquí lo produce
 * `corpusParaFechar` desde una ficha que declara `incipit` sobre un documento que no es de ninguna
 * de sus Citas: si se perdiera el reparto de `incipit` en `obras[]`, un cambio de ese documento no
 * movería el `lastmod` de la Obra, y esto se cae.
 */
describe('Historia 32.3 — el documento del incipit fecha su Página de Obra desde el disco', () => {
  const RUTA_DE_OBRA = '/obra/seneca/sobre-la-brevedad-de-la-vida';
  const DOC = 'wikisource-es--otra-cosa';

  it('un cambio solo en el documento del incipit refecha la Obra, y no la Cita', async () => {
    const raiz = await temporal('sabiduria-incipit-fecha-');
    const git = gitEn(raiz);
    const corpus = join(raiz, 'corpus');
    try {
      await git(['init', '--initial-branch=principal']);
      for (const dir of ['citas', 'autores', 'temas', 'colecciones', 'obras', 'fuentes']) await mkdir(join(corpus, dir), { recursive: true });
      await writeFile(
        join(corpus, 'citas', 'seneca--el-tiempo.md'),
        '---\nslug: seneca-el-tiempo\nautor: seneca\ntemas:\n  - el-tiempo\nprocedencia:\n  obra: Sobre la brevedad de la vida\n---\n\nTexto.\n',
        'utf8',
      );
      await writeFile(join(corpus, 'autores', 'seneca.yml'), 'nombre: Séneca\n', 'utf8');
      await writeFile(join(corpus, 'temas', 'el-tiempo.yml'), 'nombre: El tiempo\n', 'utf8');
      await writeFile(
        join(corpus, 'obras', 'seneca--sobre-la-brevedad-de-la-vida.yml'),
        `autor: seneca\ntitulo: Sobre la brevedad de la vida\nformas:\n  - "${formaDeObra('Sobre la brevedad de la vida')}"\n` +
          `incipit:\n  documento: "${DOC}"\n  desde: "La mayor parte"\n`,
        'utf8',
      );
      await writeFile(join(corpus, 'fuentes', `${DOC}.txt`), 'La mayor parte de los mortales.\n', 'utf8');
      await git(['add', 'corpus']);
      await git(['commit', '-m', 'declarada'], '2024-01-02T09:00:00+0000');

      await writeFile(join(corpus, 'fuentes', `${DOC}.txt`), 'La mayor parte de los mortales se queja.\n', 'utf8');
      await git(['add', 'corpus']);
      await git(['commit', '-m', 'el documento'], '2024-03-04T09:00:00+0000');

      const fechas = await fechasDeLasSuperficies(raiz, () => {});
      expect(fechas.get(RUTA_DE_OBRA)).toBe('2024-03-04T09:00:00.000Z');
      expect(fechas.get('/cita/seneca-el-tiempo')).toBe('2024-01-02T09:00:00.000Z');
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });
});

/**
 * Historia 35.9 — AD-27 v9.1: el plazo de protección y el año de referencia de `umbrales.ts` fechan y
 * avisan solo las Obras cuyo veredicto de derechos cambia con el Corpus de hoy, y las Páginas de Cita
 * de sus atribuidas. Ni la portada, ni ninguna otra superficie.
 */
describe('Historia 35.9 — el plazo de los derechos fecha y avisa lo que mueve', () => {
  const UMBRALES = 'src/lib/umbrales.ts';
  const CORPUS: CorpusParaFechar = {
    citas: [
      { slug: 'reciente-de-siempre', autor: 'reciente', obra: 'reciente--la-obra', ruta: 'corpus/citas/reciente--a.md' },
      { slug: 'reciente-atribuida', autor: 'reciente', obra: 'reciente--la-obra', atribuida: true, ruta: 'corpus/citas/reciente--b.md' },
      { slug: 'larra-a', autor: 'larra', obra: 'larra--articulos', atribuida: true, ruta: 'corpus/citas/larra--a.md' },
      { slug: 'viva-a', autor: 'viva', obra: 'viva--la-obra', atribuida: true, ruta: 'corpus/citas/viva--a.md' },
    ],
    autores: [
      { slug: 'reciente', añoFallecimiento: 1980, ruta: 'corpus/autores/reciente.yml' },
      { slug: 'larra', añoFallecimiento: 1837, ruta: 'corpus/autores/larra.yml' },
      { slug: 'viva', vivo: true, ruta: 'corpus/autores/viva.yml' },
    ],
    temas: [],
    colecciones: [],
    obras: [
      { nombre: 'reciente--la-obra', autor: 'reciente', formas: ['la obra'], ruta: 'corpus/obras/reciente--la-obra.yml' },
      { nombre: 'larra--articulos', autor: 'larra', formas: ['articulos'], ruta: 'corpus/obras/larra--articulos.yml' },
      { nombre: 'viva--la-obra', autor: 'viva', formas: ['la obra'], ruta: 'corpus/obras/viva--la-obra.yml' },
    ],
    umbrales: UMBRALES,
  };
  const SIN_PLAZO = versionDeUmbrales(
    'export const PLAZO_DE_PROTECCION_AÑOS: number | undefined = undefined;\nexport const AÑO_DE_REFERENCIA: number | undefined = undefined;\n',
  );
  const CON_PLAZO = versionDeUmbrales(
    'export const PLAZO_DE_PROTECCION_AÑOS: number | undefined = 70;\nexport const AÑO_DE_REFERENCIA: number | undefined = 2026;\n',
  );
  const SIN_AÑO = versionDeUmbrales('export const PLAZO_DE_PROTECCION_AÑOS: number | undefined = 70;\n');

  it('`versionDeUmbrales` lee las dos constantes, con su tipo o sin él, y omite las que no tienen valor', () => {
    expect(SIN_PLAZO).toEqual({});
    expect(CON_PLAZO).toEqual({ PLAZO_DE_PROTECCION_AÑOS: 70, AÑO_DE_REFERENCIA: 2026 });
    expect(versionDeUmbrales('export const AÑO_DE_REFERENCIA = 2030;\nexport const PLAZO_DE_PROTECCION_AÑOS = 80;')).toEqual({
      AÑO_DE_REFERENCIA: 2030,
      PLAZO_DE_PROTECCION_AÑOS: 80,
    });
    // El fichero del árbol se lee sin lanzar, tengan las dos el valor que tengan (las fija Héctor).
    const delArbol = versionDeUmbrales(readFileSync(resolve(import.meta.dirname, '../../src/lib/umbrales.ts'), 'utf8'));
    for (const valor of Object.values(delArbol)) expect(typeof valor).toBe('number');
  });

  it('`versionDeUmbrales` reconoce las declaraciones del fichero del árbol cuando tienen valor', () => {
    const plazo = 'export const PLAZO_DE_PROTECCION_AÑOS: number | undefined = undefined;';
    const año = 'export const AÑO_DE_REFERENCIA: number | undefined = undefined;';
    // El árbol, con las dos sin valor sea cual sea el que les dio Héctor.
    const arbol = readFileSync(resolve(import.meta.dirname, '../../src/lib/umbrales.ts'), 'utf8')
      .replace(/export const PLAZO_DE_PROTECCION_AÑOS: number \| undefined = [^;]+;/u, plazo)
      .replace(/export const AÑO_DE_REFERENCIA: number \| undefined = [^;]+;/u, año);
    expect(arbol).toContain(plazo);
    expect(arbol).toContain(año);
    // Sin valor, se omiten: el árbol no da un veredicto que no sea el de «sin plazo».
    expect(versionDeUmbrales(arbol)).toEqual({});
    const conValor = arbol
      .replace(plazo, plazo.replace('= undefined;', '= 70;'))
      .replace(año, año.replace('= undefined;', '= 2026;'));
    expect(versionDeUmbrales(conValor)).toEqual({ PLAZO_DE_PROTECCION_AÑOS: 70, AÑO_DE_REFERENCIA: 2026 });
  });

  it('`versionDeUmbrales` no lee una declaración comentada ni calla una que no reconoce', () => {
    // Comentada: no cuenta.
    expect(versionDeUmbrales('// export const PLAZO_DE_PROTECCION_AÑOS = 70;\n')).toEqual({});
    // Sin punto y coma, con comentario detrás o con separadores: se lee.
    expect(versionDeUmbrales('export const PLAZO_DE_PROTECCION_AÑOS = 70\nexport const AÑO_DE_REFERENCIA = 2_026; // el año\n')).toEqual({
      PLAZO_DE_PROTECCION_AÑOS: 70,
      AÑO_DE_REFERENCIA: 2026,
    });
    // Un decimal, un negativo o un `as`: indeterminables, nunca un plazo.
    for (const valor of ['70.5', '-1', '70 as number']) {
      const version = versionDeUmbrales(`export const PLAZO_DE_PROTECCION_AÑOS = ${valor};\nexport const AÑO_DE_REFERENCIA = 2026;\n`);
      expect(typeof version.PLAZO_DE_PROTECCION_AÑOS, valor).toBe('string');
      expect(derechosEnLosUmbrales({ tipo: 'autor', añoFallecimiento: 1980 }).valor(version), valor).toMatch(/^¿\?/u);
    }
    // Dos versiones indeterminables distintas son un cambio entre sí; la misma, no.
    const reciente = derechosEnLosUmbrales({ tipo: 'autor', añoFallecimiento: 1980 });
    const con = (plazo: string) =>
      versionDeUmbrales(`export const PLAZO_DE_PROTECCION_AÑOS = ${plazo};\nexport const AÑO_DE_REFERENCIA = 2026;\n`);
    expect(cambiaronLosCampos({ antes: con('70 as number'), despues: con('80 as number') }, [reciente])).toBe(true);
    expect(cambiaronLosCampos({ antes: con('70 as number'), despues: con('70 as number') }, [reciente])).toBe(false);
    expect(cambiaronLosCampos({ antes: SIN_AÑO, despues: versionDeUmbrales('export const PLAZO_DE_PROTECCION_AÑOS = 80;\n') }, [reciente])).toBe(true);
    // Repartida en varias líneas: no se lee como «sin valor», sino como indeterminable.
    const repartida = versionDeUmbrales('export const PLAZO_DE_PROTECCION_AÑOS:\n  number | undefined =\n  70;\n');
    expect(typeof repartida.PLAZO_DE_PROTECCION_AÑOS).toBe('string');
  });

  it('el veredicto es el de `derechosVigentes`, y plazo sin año cuenta como cambio sin lanzar', () => {
    const reciente = derechosEnLosUmbrales({ tipo: 'autor', añoFallecimiento: 1980 });
    const larra = derechosEnLosUmbrales({ tipo: 'autor', añoFallecimiento: 1837 });
    expect(reciente.valor(SIN_PLAZO)).toBe(false);
    expect(reciente.valor(CON_PLAZO)).toBe(true);
    expect(larra.valor(CON_PLAZO)).toBe(false);
    expect(() => reciente.valor(SIN_AÑO)).not.toThrow();
    expect(cambiaronLosCampos({ antes: SIN_PLAZO, despues: CON_PLAZO }, [reciente])).toBe(true);
    expect(cambiaronLosCampos({ antes: SIN_PLAZO, despues: CON_PLAZO }, [larra])).toBe(false);
    expect(cambiaronLosCampos({ antes: SIN_PLAZO, despues: SIN_AÑO }, [larra])).toBe(true);
    expect(reciente.derivado).not.toBe(larra.derivado);
  });

  it('`umbrales.ts` compone la Obra de un Autor fallecido y las Páginas de Cita de sus atribuidas, y nada más', () => {
    const conUmbrales = [...relacionDeSuperficies(CORPUS)]
      .filter(([, { componentes }]) => componentes.some((c) => c.fichero === UMBRALES))
      .map(([ruta]) => ruta)
      .sort();
    expect(conUmbrales).toEqual([
      '/cita/larra-a/',
      '/cita/reciente-atribuida/',
      '/obra/larra/articulos/',
      '/obra/reciente/la-obra/',
    ]);
  });

  it('mover el plazo fecha y avisa solo la Obra cuyo veredicto cambia y sus atribuidas, sin portada', () => {
    const historial: Historial = new Map([
      [UMBRALES, [{ fecha: '2026-12-01T09:00:00.000Z', antes: SIN_PLAZO, despues: CON_PLAZO }]],
    ]);
    const fechadas = [...fechasPorSuperficie(CORPUS, historial).keys()].sort();
    expect(fechadas).toEqual(['/cita/reciente-atribuida', '/obra/reciente/la-obra']);

    const cambios = [{ fichero: UMBRALES, antes: SIN_PLAZO, despues: CON_PLAZO }];
    const relacion = relacionDeSuperficies(CORPUS);
    expect([...rutasAvisadasPor(cambios, relacion)].sort()).toEqual(['/cita/reciente-atribuida/', '/obra/reciente/la-obra/']);
    const aviso = componerAviso({
      cambios,
      reglaCambiada: true,
      relacionDespues: relacion,
      relacionAntes: relacion,
      indexablesAntes: { rutas: ['/obra/reciente/la-obra/'] },
      indexablesDespues: { rutas: ['/obra/reciente/la-obra/'] },
    });
    expect(aviso.rutas.sort()).toEqual(['/cita/reciente-atribuida/', '/obra/reciente/la-obra/']);
    expect(aviso.rutas).not.toContain('/');
  });

  it('un plazo sin año en un commit fecha toda Obra de Autor fallecido, sin lanzar', () => {
    const historial: Historial = new Map([
      [UMBRALES, [{ fecha: '2026-12-01T09:00:00.000Z', antes: SIN_PLAZO, despues: SIN_AÑO }]],
    ]);
    expect([...fechasPorSuperficie(CORPUS, historial).keys()].sort()).toEqual([
      '/cita/larra-a',
      '/cita/reciente-atribuida',
      '/obra/larra/articulos',
      '/obra/reciente/la-obra',
    ]);
  });

  it('desde el disco y git: un commit que solo mueve las constantes fecha la Obra que cambia, y nada más', async () => {
    const raiz = await temporal('sabiduria-plazo-');
    const git = gitEn(raiz);
    const corpus = join(raiz, 'corpus');
    const umbrales = (plazo: string, año: string) =>
      writeFile(
        join(raiz, FICHERO_DE_LOS_UMBRALES),
        `export const PLAZO_DE_PROTECCION_AÑOS: number | undefined = ${plazo};\nexport const AÑO_DE_REFERENCIA: number | undefined = ${año};\n`,
        'utf8',
      );
    try {
      await git(['init', '--initial-branch=principal']);
      for (const dir of ['citas', 'autores', 'temas', 'colecciones', 'obras']) await mkdir(join(corpus, dir), { recursive: true });
      await mkdir(join(raiz, 'src', 'lib'), { recursive: true });
      await writeFile(join(corpus, 'autores', 'reciente.yml'), 'nombre: Reciente\nañoFallecimiento: 1980\n', 'utf8');
      await writeFile(join(corpus, 'autores', 'larra.yml'), 'nombre: Larra\nañoFallecimiento: 1837\n', 'utf8');
      await writeFile(join(corpus, 'temas', 'el-tiempo.yml'), 'nombre: El tiempo\n', 'utf8');
      const citaMd = (slug: string, autor: string, obra: string, atribuida: boolean) =>
        `---\nslug: ${slug}\nautor: ${autor}\n${atribuida ? 'clase: atribuida\n' : ''}temas:\n  - el-tiempo\nprocedencia:\n  obra: ${obra}\n---\n\nTexto.\n`;
      await writeFile(join(corpus, 'citas', 'reciente--a.md'), citaMd('reciente-de-siempre', 'reciente', 'La obra', false), 'utf8');
      await writeFile(join(corpus, 'citas', 'reciente--b.md'), citaMd('reciente-atribuida', 'reciente', 'La obra', true), 'utf8');
      await writeFile(join(corpus, 'citas', 'larra--a.md'), citaMd('larra-a', 'larra', 'Artículos', false), 'utf8');
      await writeFile(
        join(corpus, 'obras', 'reciente--la-obra.yml'),
        `autor: reciente\ntitulo: La obra\nformas:\n  - "${formaDeObra('La obra')}"\n`,
        'utf8',
      );
      await writeFile(
        join(corpus, 'obras', 'larra--articulos.yml'),
        `autor: larra\ntitulo: Artículos\nformas:\n  - "${formaDeObra('Artículos')}"\n`,
        'utf8',
      );
      await umbrales('undefined', 'undefined');
      await git(['add', 'corpus', 'src']);
      await git(['commit', '-m', 'el Corpus'], '2024-01-02T09:00:00+0000');

      await umbrales('70', '2026');
      await git(['add', 'src']);
      await git(['commit', '-m', 'el plazo'], '2024-03-04T09:00:00+0000');

      const avisos: string[] = [];
      const fechas = await fechasDeLasSuperficies(raiz, (mensaje) => avisos.push(mensaje));
      expect(avisos).toEqual([]);
      expect(fechas.get('/obra/reciente/la-obra')).toBe('2024-03-04T09:00:00.000Z');
      expect(fechas.get('/cita/reciente-atribuida')).toBe('2024-03-04T09:00:00.000Z');
      expect(fechas.get('/cita/reciente-de-siempre')).toBe('2024-01-02T09:00:00.000Z');
      expect(fechas.get('/obra/larra/articulos')).toBe('2024-01-02T09:00:00.000Z');
      expect(fechas.get('/autor/reciente')).toBe('2024-01-02T09:00:00.000Z');
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it('desde el disco y git: crear o borrar `umbrales.ts` con las constantes sin valor no fecha nada', async () => {
    const raiz = await temporal('sabiduria-plazo-alta-');
    const git = gitEn(raiz);
    const corpus = join(raiz, 'corpus');
    try {
      await git(['init', '--initial-branch=principal']);
      for (const dir of ['citas', 'autores', 'temas', 'colecciones', 'obras']) await mkdir(join(corpus, dir), { recursive: true });
      await writeFile(join(corpus, 'autores', 'reciente.yml'), 'nombre: Reciente\nañoFallecimiento: 1980\n', 'utf8');
      await writeFile(join(corpus, 'temas', 'el-tiempo.yml'), 'nombre: El tiempo\n', 'utf8');
      await writeFile(
        join(corpus, 'citas', 'reciente--b.md'),
        '---\nslug: reciente-atribuida\nautor: reciente\nclase: atribuida\ntemas:\n  - el-tiempo\nprocedencia:\n  obra: La obra\n---\n\nTexto.\n',
        'utf8',
      );
      await writeFile(
        join(corpus, 'obras', 'reciente--la-obra.yml'),
        `autor: reciente\ntitulo: La obra\nformas:\n  - "${formaDeObra('La obra')}"\n`,
        'utf8',
      );
      await git(['add', 'corpus']);
      await git(['commit', '-m', 'el Corpus'], '2024-01-02T09:00:00+0000');

      await mkdir(join(raiz, 'src', 'lib'), { recursive: true });
      await writeFile(
        join(raiz, FICHERO_DE_LOS_UMBRALES),
        'export const PLAZO_DE_PROTECCION_AÑOS: number | undefined = undefined;\nexport const AÑO_DE_REFERENCIA: number | undefined = undefined;\n',
        'utf8',
      );
      await git(['add', 'src']);
      await git(['commit', '-m', 'alta de los umbrales'], '2024-03-04T09:00:00+0000');
      await git(['rm', '-q', FICHERO_DE_LOS_UMBRALES]);
      await git(['commit', '-m', 'baja de los umbrales'], '2024-05-06T09:00:00+0000');

      const fechas = await fechasDeLasSuperficies(raiz, () => {});
      expect(fechas.get('/obra/reciente/la-obra')).toBe('2024-01-02T09:00:00.000Z');
      expect(fechas.get('/cita/reciente-atribuida')).toBe('2024-01-02T09:00:00.000Z');
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it('el lector del disco lleva a la relación los años del Autor, la clase de la Cita y la ruta de `umbrales.ts`', async () => {
    const raiz = await temporal('sabiduria-plazo-lector-');
    const corpus = join(raiz, 'corpus');
    try {
      for (const dir of ['citas', 'autores', 'temas', 'colecciones', 'obras']) await mkdir(join(corpus, dir), { recursive: true });
      await writeFile(join(corpus, 'autores', 'viva.yml'), 'nombre: Viva\nvivo: true\n', 'utf8');
      await writeFile(
        join(corpus, 'citas', 'viva--a.md'),
        '---\nslug: viva-a\nautor: viva\nclase: atribuida\nprocedencia:\n  obra: La obra\n---\n\nTexto.\n',
        'utf8',
      );
      const leido = await corpusParaFechar(raiz);
      expect(leido.autores).toEqual([{ slug: 'viva', vivo: true, ruta: resolve(corpus, 'autores', 'viva.yml') }]);
      expect(leido.citas[0]).toMatchObject({ slug: 'viva-a', atribuida: true });
      expect(leido.umbrales).toBe(resolve(raiz, FICHERO_DE_LOS_UMBRALES));
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });
});

