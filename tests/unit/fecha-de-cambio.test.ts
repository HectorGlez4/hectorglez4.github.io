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
  CAMPOS_QUE_PINTA,
  CUALQUIER_CAMBIO,
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
import { familiaDeFichero, rutasAvisadasPor } from '../../tools/lib/avisar.ts';
import {
  autorAdmisible,
  citaAdmisible,
  coleccionAdmisible,
  esquemaDeObra,
} from '../../src/lib/admision.ts';
import {
  estadoDelRepositorio,
  fechasDeLasSuperficies,
  historialDeLosFicheros,
} from '../../integraciones/historial.ts';

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
        const valor = propiedad.initializer;
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

describe('Historia 24.8 — todo campo de los esquemas está clasificado', () => {
  const unidas = (...listas: (readonly string[] | undefined)[]) => [...new Set(listas.flatMap((l) => l ?? []))];
  const ESQUEMAS = {
    cita: unidas(Object.keys(citaAdmisible.shape), clavesDeLaColeccion('citas')),
    autor: unidas(Object.keys(autorAdmisible.shape), clavesDeLaColeccion('autores')),
    tema: unidas(clavesDeLaColeccion('temas')),
    coleccion: Object.keys(coleccionAdmisible.shape),
    obra: Object.keys(esquemaDeObra([]).shape),
  } as const;

  it('lee las claves de los esquemas que el build aplica, también el de Tema', () => {
    // Si `content.config.ts` cambiara de forma y el lector dejara de encontrarlas, la
    // clasificación quedaría ciega en silencio para lo que solo se declara ahí.
    expect(clavesDeLaColeccion('citas')).toEqual(expect.arrayContaining(['texto', 'aptaParaPortada']));
    expect(clavesDeLaColeccion('autores')).toEqual(expect.arrayContaining(['nombre', 'semblanza']));
    expect(clavesDeLaColeccion('temas')).toEqual(expect.arrayContaining(['nombre']));
  });

  const clasificados = (familia: keyof typeof ESQUEMAS): Set<string> => {
    const enLaTabla = Object.values(CAMPOS_QUE_PINTA[familia]).flatMap((campos) =>
      campos === CUALQUIER_CAMBIO ? [] : [...(campos as readonly string[])],
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
        (campos) => (campos === CUALQUIER_CAMBIO ? [] : [...(campos as readonly string[])]),
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

  it('Cita nueva: su página, su Autor, su Tema, su Colección, su Obra y el Directorio; ninguna otra Página de Cita', () => {
    const enT1 = { 'corpus/citas/x--b.md': { antes: null, despues: VERSIONES['corpus/citas/x--b.md'] as Version } };
    const h = historial(enT1, ['corpus/citas/x--b.md']);
    // Historia 26.3 — el Directorio de Autores cuenta Citas por Autor: un alta lo mueve.
    const esperadas = ['/cita/x-b', '/autor/x', '/tema/t', '/coleccion/c', '/obra/x/o', '/autores'].sort();
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
   * más, ni las Páginas de Autor ni las de Cita. La revisión no la pinta nadie: nunca mueve nada.
   * La 26.4 añadirá `/obras/` al primer caso.
   */
  it('solo claves de orden, en todos los Autores: cambia solo `/autores/`', () => {
    const enT1 = {
      'corpus/autores/x.yml': editado('corpus/autores/x.yml', { ordenAlfabetico: 'Equis' }),
      'corpus/autores/y.yml': editado('corpus/autores/y.yml', { ordenAlfabetico: 'Ye' }),
    };
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).toEqual(['/autores']);
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual(['/autores']);
  });

  it('solo la revisión de las claves, en todos los Autores: nada cambia de fecha', () => {
    const enT1 = {
      'corpus/autores/x.yml': editado('corpus/autores/x.yml', { ordenRevisado: '2026-10-28' }),
      'corpus/autores/y.yml': editado('corpus/autores/y.yml', { ordenRevisado: '2026-10-28' }),
    };
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).toEqual([]);
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual([]);
  });

  it('el texto de una Cita no mueve el Directorio de Autores; cambiarle el Autor, sí', () => {
    const texto = { 'corpus/citas/x--a.md': editado('corpus/citas/x--a.md', { texto: 'Otro texto.' }) };
    expect(refechadas(corpusDeEjemplo(), historial(texto))).not.toContain('/autores');
    expect(avisadas(texto, corpusDeEjemplo())).not.toContain('/autores');

    const deAutor = { 'corpus/citas/x--a.md': editado('corpus/citas/x--a.md', { autor: 'y' }) };
    expect(refechadas(corpusDeEjemplo(), historial(deAutor))).toContain('/autores');
    expect(avisadas(deAutor, corpusDeEjemplo())).toContain('/autores');
  });

  // La semblanza, la tradición y la biografía no las pinta el Directorio de Autores (26.3).
  it('solo la semblanza: solo la Página del Autor', () => {
    const enT1 = { 'corpus/autores/x.yml': editado('corpus/autores/x.yml', { semblanza: 'Otra semblanza.' }) };
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).toEqual(['/autor/x']);
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual(['/autor/x']);
  });

  it('el nombre o los años del Autor: el Autor, sus Páginas de Cita, los listados que lo pintan, sus Obras y el Directorio', () => {
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
    const enT1 = { 'corpus/autores/x.yml': editado('corpus/autores/x.yml', { nombre: 'Equis Zeta' }) };
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).toEqual(esperadas);
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual(esperadas);
    expect(refechadas(corpusDeEjemplo(), historial({ 'corpus/autores/x.yml': editado('corpus/autores/x.yml', { añoNacimiento: 1830 }) }))).toEqual(esperadas);
  });

  it('`nota` o `ediciones` de la ficha: solo la Página de Obra', () => {
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

  it('retitular la ficha: su Obra, sus Páginas de Cita y los listados de Autor, Tema y Colección de esas Citas', () => {
    const enT1 = { 'corpus/obras/x--o.yml': editado('corpus/obras/x--o.yml', { titulo: 'La obra O' }) };
    const esperadas = ['/obra/x/o', '/cita/x-a', '/cita/x-b', '/cita/x-c', '/autor/x', '/tema/t', '/tema/u', '/coleccion/c'].sort();
    expect(refechadas(corpusDeEjemplo(), historial(enT1))).toEqual(esperadas);
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual(esperadas);
  });

  it('un documento nuevo de una Obra paginada: solo esa Obra', () => {
    const pagina = 'corpus/fuentes/fuente--obra-o--iii.txt';
    const enT1 = { [pagina]: { antes: null, despues: VERSION_OPACA as Version } };
    expect(refechadas(corpusDeEjemplo([], [DOCUMENTO, pagina]), historial(enT1))).toEqual(['/obra/x/o']);
    expect(avisadas(enT1, corpusDeEjemplo([], [DOCUMENTO, pagina]), corpusDeEjemplo())).toEqual(['/obra/x/o']);
    // Y un documento de otra obra no compone esta.
    const ajeno = 'corpus/fuentes/fuente--otra-cosa.txt';
    expect(refechadas(corpusDeEjemplo([], [DOCUMENTO, ajeno]), historial({ [ajeno]: { antes: null, despues: VERSION_OPACA } }))).toEqual([]);
  });

  it('la baja de una Cita fecha su Autor, el Directorio, sus Temas, sus Colecciones y su Obra, y no declara su página', () => {
    const ruta = 'corpus/citas/x--b.md';
    const enT1 = { [ruta]: { antes: VERSIONES[ruta] as Version, despues: null } };
    const h = historial(enT1);
    const corpus = conBajas(corpusDeEjemplo([ruta]), h);
    expect(corpus.bajas?.citas?.map((c) => c.slug)).toEqual(['x-b']);
    const esperadas = ['/autor/x', '/autores', '/tema/t', '/coleccion/c', '/obra/x/o'].sort();
    expect(refechadas(corpus, h)).toEqual(esperadas);
    // Fecha y aviso coinciden: el aviso lo encuentra en la relación de antes.
    expect(avisadas(enT1, corpusDeEjemplo([ruta]), corpusDeEjemplo())).toEqual(esperadas);
    expect(fechasPorSuperficie(corpus, h).has('/cita/x-b')).toBe(false);
  });

  it('el documento que sale fecha la Obra cuyas Citas lo casaban', () => {
    const h = historial({ [DOCUMENTO]: { antes: VERSION_OPACA, despues: null } });
    const corpus = conBajas(corpusDeEjemplo([], []), h);
    expect(corpus.bajas?.documentos).toEqual([DOCUMENTO]);
    expect(refechadas(corpus, h)).toEqual(['/obra/x/o']);
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
    const esperadas = ['/obra/x/o', '/cita/x-d', '/autor/x', '/tema/u'].sort();
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
    expect(refechadas(corpusDeEjemplo(), h)).toEqual(['/cita/x-a', '/autor/x', '/autores', '/tema/t', '/obra/x/o'].sort());
    expect(avisadas(enT1, corpusDeEjemplo())).toEqual(['/cita/x-a', '/autor/x', '/autores', '/tema/t', '/obra/x/o'].sort());
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
