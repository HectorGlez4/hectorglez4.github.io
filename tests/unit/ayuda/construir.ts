import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, sep } from 'node:path';
import { promisify } from 'node:util';
import { separarFrontmatter } from '../../../tools/lib/corpus.ts';
import { FICHERO_DEL_CENSO } from '../../../tools/lib/cotejo.ts';
import { componerDocumento, nombreDeDocumento } from '../../../tools/lib/documento.ts';

const ejecutar = promisify(execFile);

export const RAIZ = resolve(import.meta.dirname, '../../..');

/**
 * Las dependencias del proyecto temporal, compartidas salvo la caché de contenido.
 *
 * Esto era un solo enlace a `node_modules/` de la raíz, y arrastraba un fallo silencioso:
 * Astro guarda el **almacén de contenido** de la capa de colecciones en
 * `node_modules/.astro/data-store.json`, así que todos los proyectos temporales —y el
 * repositorio de verdad— escribían en el mismo. El cargador de globs vacía y repuebla una
 * colección cuando encuentra ficheros, pero cuando no encuentra **ninguno** avisa y
 * **vuelve sin tocar el almacén**: las entradas de la construcción anterior sobreviven.
 *
 * Con eso, una prueba cuyo corpus no trae Colecciones heredaba las de la prueba anterior, y
 * un `npm run build` en la raíz después de correr la suite anunciaba una Colección que no
 * existe en `corpus/`. Se vio nada más versionar `corpus/colecciones/` vacío (Historia
 * 12.2), que es el primer directorio de colección del proyecto que puede estar sin
 * ficheros; con las tres colecciones anteriores el fallo estaba ahí y se tapaba solo.
 *
 * Se enlaza entrada por entrada en vez de la carpeta entera para poder dejar fuera las
 * cachés de estado mutable y darle a cada proyecto la suya: `.astro`, y también `.vite` y
 * `.vite-temp`, que son la misma clase de cosa. Lo que se comparte es lo que solo se lee:
 * los paquetes, y las fuentes ya descargadas —casi dos megas que Astro se baja de la red,
 * y una caché por proyecto ataría estas pruebas a tener conexión—.
 *
 * Aislar `.vite` no vuelve seguro construir dos a la vez, y `vitest.config.ts` sigue
 * serializando por eso: los proyectos temporales comparten los paquetes, y la
 * preoptimización de dependencias de Vite escribe dentro de alguno de ellos.
 */
const CACHES_PROPIAS = ['.astro', '.vite', '.vite-temp'];

async function enlazarDependencias(proyecto: string): Promise<void> {
  const origen = join(RAIZ, 'node_modules');
  const destino = join(proyecto, 'node_modules');
  await mkdir(destino, { recursive: true });

  for (const entrada of await readdir(origen)) {
    if (CACHES_PROPIAS.includes(entrada)) continue;
    await symlink(join(origen, entrada), join(destino, entrada));
  }

  for (const cache of CACHES_PROPIAS) await mkdir(join(destino, cache), { recursive: true });

  const fuentes = join(origen, '.astro', 'fonts');
  if (existsSync(fuentes)) await symlink(fuentes, join(destino, '.astro', 'fonts'), 'dir');
}

/**
 * Un corpus de prueba: rutas relativas a `corpus/` con su contenido literal.
 * Ej. `{ 'citas/seneca--el-tiempo.md': '---\ntexto: ...\n---\n' }`
 */
export type CorpusDePrueba = Record<string, string>;

export interface ResultadoBuild {
  codigo: number;
  salida: string;
  /** Ruta del proyecto temporal, por si la prueba necesita inspeccionar `dist/`. */
  proyecto: string;
}

/**
 * Construye el proyecto en una copia aislada con el corpus indicado.
 *
 * Se copia el proyecto en lugar de mutar `corpus/` porque estas pruebas escriben
 * ficheros inválidos a propósito: hacerlo sobre el corpus real dejaría basura si la
 * prueba se interrumpe, y AGENTS.md es explícito en que git es el único almacén del
 * contenido. `node_modules` se enlaza en vez de copiarse — copiarlo tardaría más que
 * el build que se quiere medir.
 *
 * Quien llama es responsable de limpiar con `limpiar(resultado.proyecto)`, salvo que
 * pase `conservar: false`.
 */
export async function construirConCorpus(
  corpus: CorpusDePrueba,
  opciones: {
    conservar?: boolean;
    /**
     * Páginas añadidas al proyecto temporal, relativas a `src/pages/`. Sirven de
     * sonda: una página que enumera una colección permite comprobar desde el HTML
     * construido qué cargó de verdad, sin esperar a que existan las páginas reales.
     */
    paginas?: Record<string, string>;
    /** Jornada que compone la Cita del Día, para no depender del día de ejecución. */
    jornada?: string;
    /**
     * Variables de entorno añadidas al build. Sirve para construir un sitio **con**
     * medición configurada, que es la única forma de comprobar que los eventos salen
     * de las superficies de verdad y no de un espía puesto en la prueba.
     */
    entorno?: Record<string, string>;
    /**
     * Ejecuta Pagefind sobre el `dist/` resultante. La búsqueda no funciona sin índice,
     * así que sin esto la superficie que emite `busqueda-sin-resultados` no es visitable.
     */
    conBusqueda?: boolean;
    /**
     * Ficheros del proyecto **reescritos en la copia**, por su ruta relativa a la raíz.
     *
     * Sirve para construir un sitio cuyo código difiere del repositorio en un punto exacto,
     * que es la única forma de comprobar lo que pasaría con un Modelo de Ingreso encendido
     * sin encenderlo de verdad (Historia 14.2): el estado es configuración versionada, así
     * que la prueba no puede pedirlo por entorno —eso es justo lo que AD-21 prohíbe— y lo que
     * hace es parchear la copia y construirla.
     *
     * **Es lo último que se escribe**, después de `package.json`, `astro.config.mjs`,
     * `tsconfig.json`, `src/`, `public/`, `integraciones/`, `tools/`, el corpus, los
     * documentos de Fuente sembrados y `paginas`. Puede pisar cualquiera de ellos, y es a
     * propósito: un parche que no gane a lo que copió el andamio no serviría para nada. Quien
     * lo use escribe el fichero **entero**.
     *
     * Dos cosas se comprueban aquí y no en cada prueba, porque las dos fallan en silencio:
     *
     *   · **La ruta no puede salirse del proyecto temporal.** Una clave con `..` o absoluta
     *     escribiría sobre las fuentes de verdad del repositorio, y una prueba que ensucia el
     *     árbol real es peor que una prueba que no existe.
     *   · **El parche tiene que cambiar algo.** Si el contenido nuevo es idéntico al que ya
     *     había, quien lo compuso —casi siempre una sustitución sobre el fichero original—
     *     no encontró su sitio, y la prueba seguiría construyendo el sitio de siempre y
     *     afirmando en verde lo contrario de lo que cree medir.
     */
    ficheros?: Record<string, string>;
  } = {},
): Promise<ResultadoBuild> {
  const proyecto = await mkdtemp(join(tmpdir(), 'sabiduria-build-'));

  await enlazarDependencias(proyecto);
  for (const fichero of ['package.json', 'astro.config.mjs', 'tsconfig.json']) {
    await cp(join(RAIZ, fichero), join(proyecto, fichero));
  }
  await cp(join(RAIZ, 'src'), join(proyecto, 'src'), { recursive: true });
  await cp(join(RAIZ, 'public'), join(proyecto, 'public'), { recursive: true });
  // `astro.config.mjs` engancha el cotejo de la Historia 11.2, que vive en
  // `integraciones/` y se apoya en `tools/lib/`. Sin las dos, el proyecto temporal ni
  // siquiera carga la configuración.
  await cp(join(RAIZ, 'integraciones'), join(proyecto, 'integraciones'), { recursive: true });
  await cp(join(RAIZ, 'tools'), join(proyecto, 'tools'), { recursive: true });

  // Las carpetas siempre existen: una colección cuya base no existe emite un aviso que
  // enturbiaría la lectura del fallo que sí importa. `colecciones/` entra en la lista
  // desde la Historia 12.2, por el mismo motivo y no por comodidad.
  for (const dir of ['citas', 'autores', 'temas', 'colecciones', '_revision', 'fuentes']) {
    await mkdir(join(proyecto, 'corpus', dir), { recursive: true });
  }

  // La portada importa las fijaciones de la Cita del Día. Sin el fichero, el build falla
  // por una razón que no tiene nada que ver con lo que la prueba mide.
  await writeFile(
    join(proyecto, 'corpus', 'portada.json'),
    JSON.stringify({ fijaciones: {} }, null, 2),
    'utf8',
  );

  for (const [ruta, contenido] of Object.entries(corpus)) {
    const destino = join(proyecto, 'corpus', ruta);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, contenido, 'utf8');
  }

  for (const [ruta, contenido] of Object.entries(documentosDeFuenteDe(corpus))) {
    await writeFile(join(proyecto, 'corpus', ruta), contenido, 'utf8');
  }

  for (const [ruta, contenido] of Object.entries(opciones.paginas ?? {})) {
    const destino = join(proyecto, 'src', 'pages', ruta);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, contenido, 'utf8');
  }

  /*
   * Si un parche no se sostiene se rompe **aquí**, y se limpia antes de romper: la copia ya
   * está hecha a estas alturas, y una excepción que la dejara atrás llenaría el directorio
   * temporal de proyectos huérfanos justo en la ejecución que ya ha ido mal.
   */
  try {
    const raizDelProyecto = resolve(proyecto);
    for (const [ruta, contenido] of Object.entries(opciones.ficheros ?? {})) {
      const destino = resolve(proyecto, ruta);
      if (destino !== raizDelProyecto && !destino.startsWith(raizDelProyecto + sep)) {
        throw new Error(
          `«${ruta}» se sale del proyecto temporal y escribiría en ${destino}. Las rutas de ` +
            '`ficheros` son relativas a la raíz de la copia: una con «..» o absoluta pisaría ' +
            'el repositorio de verdad.',
        );
      }

      const previo = existsSync(destino) ? await readFile(destino, 'utf8') : undefined;
      if (previo === contenido) {
        throw new Error(
          `El parche de «${ruta}» es idéntico al fichero que ya había, así que no encontró ` +
            'su sitio. La construcción saldría igual que sin parche y la prueba afirmaría en ' +
            'verde lo contrario de lo que mide.',
        );
      }

      await mkdir(dirname(destino), { recursive: true });
      await writeFile(destino, contenido, 'utf8');
    }
  } catch (fallo) {
    await limpiar(proyecto);
    throw fallo;
  }

  let codigo = 0;
  let salida = '';
  try {
    const { stdout, stderr } = await ejecutar(
      'node',
      [join(RAIZ, 'node_modules', 'astro', 'bin', 'astro.mjs'), 'build'],
      {
        cwd: proyecto,
        env: {
          ...process.env,
          FORCE_COLOR: '0',
          ASTRO_TELEMETRY_DISABLED: '1',
          ...(opciones.jornada ? { FECHA_JORNADA: opciones.jornada } : {}),
          ...(opciones.entorno ?? {}),
        },
      },
    );
    salida = `${stdout}\n${stderr}`;
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    codigo = e.code ?? 1;
    salida = `${e.stdout ?? ''}\n${e.stderr ?? ''}`;
  }

  if (codigo === 0 && opciones.conBusqueda) {
    const { stdout, stderr } = await ejecutar(
      join(RAIZ, 'node_modules', '.bin', 'pagefind'),
      ['--site', 'dist', '--force-language', 'es'],
      { cwd: proyecto },
    );
    salida += `\n${stdout}\n${stderr}`;
  }

  if (opciones.conservar === false) await limpiar(proyecto);
  return { codigo, salida, proyecto };
}

interface DocumentoSembrado {
  idFuente: string;
  obra: string;
  url: string;
  año?: number;
  textos: string[];
}

/**
 * Los documentos de `corpus/fuentes/` que las Citas de un fixture dicen tener — 11.2.
 *
 * El cotejo del build exige que el texto de cada Cita publicada aparezca literalmente en
 * el cuerpo del documento de su Fuente. Un fixture podría esquivarlo censándose, pero eso
 * dejaría a estas pruebas construyendo un mundo donde el cotejo no existe: cualquier
 * prueba futura heredaría la exención sin saberlo. Así que en vez de eximirlas se les
 * **escribe el documento que dicen tener**, con las tres zonas que compone
 * `componerDocumento`, y cruzan la misma puerta que el corpus real.
 *
 * Un documento por par (Fuente, obra), como en AD-23: varias Citas de la misma obra
 * comparten cuerpo. El nombre sale de `nombreDeDocumento`, el mismo ayudante que usan la
 * recuperación y el cotejo, para que no puedan divergir.
 *
 * No se siembra nada cuando el fixture escribe su propio `pendientes-de-cotejo.yml`: esa
 * es la señal de que la prueba mide el cotejo y decide ella qué documentos existen y
 * cuáles faltan, como hace `tests/unit/cotejo-build.test.ts`. Tampoco se pisa un
 * documento que el propio fixture ya trae.
 */
function documentosDeFuenteDe(corpus: CorpusDePrueba): Record<string, string> {
  if (FICHERO_DEL_CENSO in corpus) return {};

  const porDocumento = new Map<string, DocumentoSembrado>();

  for (const [ruta, contenido] of Object.entries(corpus)) {
    if (!ruta.startsWith('citas/') || !ruta.endsWith('.md')) continue;

    let datos: Record<string, unknown> | null = null;
    // Un frontmatter mal escrito es lo que mide alguna prueba de admisión: aquí no es un
    // fallo del andamio, simplemente no hay Cita de la que derivar documento.
    try {
      datos = separarFrontmatter(contenido);
    } catch {
      continue;
    }
    if (datos === null) continue;

    const fuente = datos.fuente as { id?: unknown; url?: unknown } | null | undefined;
    const procedencia = datos.procedencia as { obra?: unknown; año?: unknown } | null | undefined;
    if (!fuente || typeof fuente.id !== 'string' || typeof fuente.url !== 'string') continue;
    if (!procedencia || typeof procedencia.obra !== 'string') continue;

    const nombre = nombreDeDocumento(fuente.id, procedencia.obra);
    if (nombre === undefined) continue;

    const documento = porDocumento.get(nombre) ?? {
      idFuente: fuente.id,
      obra: procedencia.obra,
      url: fuente.url,
      ...(typeof procedencia.año === 'number' ? { año: procedencia.año } : {}),
      textos: [],
    };
    if (typeof datos.texto === 'string') documento.textos.push(datos.texto);
    porDocumento.set(nombre, documento);
  }

  const documentos: Record<string, string> = {};
  for (const [nombre, documento] of porDocumento) {
    const ruta = `fuentes/${nombre}.txt`;
    if (ruta in corpus) continue;

    documentos[ruta] = componerDocumento(
      {
        fuente: documento.idFuente,
        obra: documento.obra,
        ...(documento.año !== undefined ? { año: documento.año } : {}),
        url: documento.url,
        recuperado: '2026-08-19',
      },
      [
        documento.obra,
        ...(documento.año !== undefined ? [`Año de publicación: ${documento.año}`] : []),
      ].join('\n'),
      // El cuerpo tiene que contener el texto de cada Cita que apunte a este documento,
      // que es exactamente lo que el cotejo va a buscar. Los párrafos se separan como en
      // una edición de verdad: el cotejo colapsa espacios y saltos, y nada más.
      documento.textos.join('\n\n'),
    );
  }
  return documentos;
}

export async function limpiar(proyecto: string): Promise<void> {
  await rm(proyecto, { recursive: true, force: true });
}

// ─── Piezas de corpus válidas, para partir de algo que sí construye ──────────

export const AUTOR_VALIDO = `nombre: Séneca
añoNacimiento: -4
añoFallecimiento: 65
semblanza: Filósofo estoico hispanorromano, tutor y después consejero de Nerón.
`;

export const TEMA_VALIDO = `nombre: El tiempo
`;

/**
 * Un fichero de Colección válido — Historia 12.2.
 *
 * `miembros` se escribe siempre, aunque venga vacío, porque una lista vacía es uno de los
 * casos del contrato y `miembros:` a secas se analiza como `null`, que es otro distinto.
 */
export function coleccionValida(
  campos: { nombre?: string; criterio?: string; miembros?: string[] } = {},
): string {
  // Pasar `miembros: undefined` **omite la clave**, que es el único modo de recorrer el
  // `.default([])` del esquema: un fixture que siempre la escribe deja ese camino sin
  // probar, y quitar el valor por omisión no rompería nada.
  // `'nombre' in campos` y no `??`: pasar `undefined` explícito es cómo una prueba pide
  // el fichero **sin** ese campo, que es uno de los casos que rompen el build a propósito.
  const nombre = 'nombre' in campos ? campos.nombre : 'Frases cortas para reflexionar';
  const criterio =
    'criterio' in campos
      ? campos.criterio
      : 'Citas de una sola frase que se sostienen fuera de su obra.';
  const miembros = 'miembros' in campos ? campos.miembros : [];

  return (
    (nombre === undefined ? '' : `nombre: ${JSON.stringify(nombre)}\n`) +
    (criterio === undefined ? '' : `criterio: ${JSON.stringify(criterio)}\n`) +
    (miembros === undefined
      ? ''
      : `miembros:${miembros.length === 0 ? ' []\n' : `\n${miembros.map((m) => `  - ${m}\n`).join('')}`}`)
  );
}

export function citaValida(campos: Partial<Record<string, unknown>> = {}): string {
  const base: Record<string, unknown> = {
    texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
    autor: 'seneca',
    temas: ['el-tiempo'],
    slug: 'seneca-no-es-que-tengamos-poco-tiempo',
    procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
    estadoDerechos: 'dominio-público',
    /*
     * La Fuente de la que salió, coherente con la obra de su Procedencia — Historia 11.2.
     *
     * `wikisource-es` es una de las Fuentes admitidas de `tools/lib/fuentes.ts` que
     * permiten reutilización, y la dirección es de uno de sus anfitriones. Con el
     * identificador y la obra se compone el nombre del documento que `construirConCorpus`
     * siembra en `corpus/fuentes/`, así que estas Citas se cotejan de verdad en vez de
     * esquivar la puerta.
     */
    fuente: {
      id: 'wikisource-es',
      url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
    },
  };
  const fusion = { ...base, ...campos };
  for (const [clave, valor] of Object.entries(fusion)) {
    if (valor === undefined) delete fusion[clave];
  }
  return `---\n${aYaml(fusion)}---\n`;
}

/** Serializador YAML mínimo, suficiente para el frontmatter de estas pruebas. */
function aYaml(objeto: Record<string, unknown>, sangria = ''): string {
  let salida = '';
  for (const [clave, valor] of Object.entries(objeto)) {
    if (Array.isArray(valor)) {
      // Una lista vacía se emite como `[]`. Emitir `clave:` a secas la convierte en
      // `null` al parsear, y el esquema responde «Expected array, received object»
      // —`typeof null` otra vez— por un fallo que solo está en el fixture.
      if (valor.length === 0) {
        salida += `${sangria}${clave}: []\n`;
        continue;
      }
      salida += `${sangria}${clave}:\n`;
      for (const elemento of valor) salida += `${sangria}  - ${JSON.stringify(elemento)}\n`;
    } else if (valor !== null && typeof valor === 'object') {
      const anidado = aYaml(valor as Record<string, unknown>, `${sangria}  `);
      // Un objeto sin claves debe emitirse como `{}`. Emitir `clave:` a secas produce
      // `null` al parsear, que es un caso distinto y se prueba por separado.
      salida += anidado
        ? `${sangria}${clave}:\n${anidado}`
        : `${sangria}${clave}: {}\n`;
    } else {
      salida += `${sangria}${clave}: ${JSON.stringify(valor)}\n`;
    }
  }
  return salida;
}
