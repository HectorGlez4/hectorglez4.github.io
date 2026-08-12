import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);

export const RAIZ = resolve(import.meta.dirname, '../../..');

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
  } = {},
): Promise<ResultadoBuild> {
  const proyecto = await mkdtemp(join(tmpdir(), 'sabiduria-build-'));

  await symlink(join(RAIZ, 'node_modules'), join(proyecto, 'node_modules'), 'dir');
  for (const fichero of ['package.json', 'astro.config.mjs', 'tsconfig.json']) {
    await cp(join(RAIZ, fichero), join(proyecto, fichero));
  }
  await cp(join(RAIZ, 'src'), join(proyecto, 'src'), { recursive: true });
  await cp(join(RAIZ, 'public'), join(proyecto, 'public'), { recursive: true });

  // Las cuatro carpetas siempre existen: una colección cuya base no existe emite un
  // aviso que enturbiaría la lectura del fallo que sí importa.
  for (const dir of ['citas', 'autores', 'temas', '_revision']) {
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

  for (const [ruta, contenido] of Object.entries(opciones.paginas ?? {})) {
    const destino = join(proyecto, 'src', 'pages', ruta);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, contenido, 'utf8');
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

export function citaValida(campos: Partial<Record<string, unknown>> = {}): string {
  const base: Record<string, unknown> = {
    texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
    autor: 'seneca',
    temas: ['el-tiempo'],
    slug: 'seneca-no-es-que-tengamos-poco-tiempo',
    procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
    estadoDerechos: 'dominio-público',
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
