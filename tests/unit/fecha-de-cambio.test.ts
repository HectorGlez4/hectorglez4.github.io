import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  coberturaInsuficiente,
  fechaDeLaEntrada,
  fechaMasReciente,
  fechasPorSuperficie,
  ficherosPorSuperficie,
  type CorpusParaFechar,
} from '../../tools/lib/cambios.ts';
import {
  estadoDelRepositorio,
  fechasDeLasSuperficies,
  fechasDeLosFicheros,
} from '../../integraciones/historial.ts';

const ejecutar = promisify(execFile);

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
  it('una Página de Cita depende de su fichero **y del de su Autor**', () => {
    // La plantilla recibe `autor` de su `getStaticPaths` y compone con `autor.nombre` el
    // título, la meta descripción y el `application/ld+json`. Sin el fichero del Autor,
    // corregir una semblanza reconstruye ciento y pico páginas con HTML distinto y todas
    // declaran una fecha de hace meses: la misma quema de señal, en la dirección rancia.
    const ficheros = ficherosPorSuperficie(CORPUS);
    expect(ficheros.get('/cita/seneca-el-tiempo')?.sort()).toEqual(
      ['citas/a.md', 'autores/seneca.yml'].sort(),
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
    expect(fechasPorSuperficie(CORPUS, new Map([['citas/a.md', '2026-02-02T00:00:00.000Z']])).has('/')).toBe(
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
    const fechas = fechasPorSuperficie(
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
    const fechas = fechasPorSuperficie(
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
    const fechas = fechasPorSuperficie(
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
    const fechas = fechasPorSuperficie(
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
    const fechas = fechasPorSuperficie(CORPUS, new Map([['citas/c.md', '2026-02-02T00:00:00.000Z']]));
    expect(fechas.has('/cita/seneca-el-tiempo')).toBe(false);
    expect(fechas.has('/autor/seneca')).toBe(false);
    expect(fechas.get('/cita/marco-aurelio-el-deber')).toBe('2026-02-02T00:00:00.000Z');
  });

  it('sin ninguna fecha no se inventa ninguna: el mapa sale vacío', () => {
    expect(fechasPorSuperficie(CORPUS, new Map()).size).toBe(0);
  });

  it('la más reciente de una lista vacía es la ausencia, no una época ni una cadena', () => {
    expect(fechaMasReciente([], new Map())).toBeUndefined();
    expect(fechaMasReciente(['citas/a.md'], new Map())).toBeUndefined();
  });

  it('el mismo corpus y las mismas fechas dan el mismo mapa: la derivación es pura', () => {
    // «Dos construcciones del mismo commit dan las mismas fechas» se apoya en esto, y esta
    // mitad se puede fijar sin construir nada.
    const fechas = new Map([
      ['citas/a.md', '2026-03-15T00:00:00.000Z'],
      ['autores/seneca.yml', '2026-01-01T00:00:00.000Z'],
    ]);
    expect([...fechasPorSuperficie(CORPUS, fechas)]).toEqual([
      ...fechasPorSuperficie(CORPUS, fechas),
    ]);
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
      const fechas = await fechasDeLosFicheros(raiz, [join(raiz, 'corpus')]);
      expect(fechas.get(resolve(raiz, 'corpus/citas/a.md'))).toBe('2024-01-02T09:00:00.000Z');
      expect(fechas.get(resolve(raiz, 'corpus/citas/b.md'))).toBe('2024-03-04T09:00:00.000Z');
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
      const fechas = await fechasDeLosFicheros(raiz, [join(raiz, 'corpus')]);

      expect(fechas.size).toBe(1);
      expect(fechas.get(resolve(raiz, 'corpus/citas', nombre ?? ''))).toBe(
        '2024-07-08T09:00:00.000Z',
      );
      expect([...fechas.keys()].some((ruta) => ruta.includes('"') || ruta.includes('\\3'))).toBe(
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

      const fechas = await fechasDeLosFicheros(raiz, [join(raiz, 'corpus')]);
      expect(fechas.get(resolve(raiz, 'corpus/x.md'))).toBe('2024-05-10T21:30:00.000Z');
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
      const fechas = await fechasDeLosFicheros(copia, [join(copia, 'corpus')]);
      expect(fechas.get(resolve(copia, 'corpus/citas/a.md'))).toBe('2024-03-04T09:00:00.000Z');

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
 * Aquí no se llama a `fechasDeLosFicheros` con la raíz ya sabida: se llama a
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
