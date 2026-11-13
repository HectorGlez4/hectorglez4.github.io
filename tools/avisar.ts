/**
 * El aviso a los buscadores por IndexNow — lo que el sitemap no puede hacer.
 *
 *   npx tsx tools/avisar.ts                          # solo la portada
 *   npx tsx tools/avisar.ts --desde <sha> --hasta <sha>
 *   npx tsx tools/avisar.ts --todo                   # el sitemap entero
 *   npx tsx tools/avisar.ts --ensayo                 # compone y no envía
 *   npx tsx tools/avisar.ts --ensayo --desde <sha> --hasta <sha>   # y el reparto por familia
 *   npx tsx tools/avisar.ts --desde <sha> --sitemap dist/sitemap-0.xml   # Obras de un fichero local
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────────────
 *
 * El sitemap es una invitación: el buscador pasa cuando le viene bien. A un dominio de
 * seis días le viene bien tarde —Search Console lo dice con todas las letras, «Détectée,
 * actuellement non indexée»—, y mientras tanto AD-12 reconstruye el sitio una vez al día
 * y la Cita del Día cambia en cada reconstrucción. Sin aviso, lo que un buscador enseña
 * de la portada es lo de hace días.
 *
 * ── Por qué es una orden y no una integración ────────────────────────────────────────
 *
 * AD-22 prohíbe que la construcción pida nada por la red. Una integración de Astro que
 * avisara rompería esa garantía y ataría `npm run build` a que internet responda. Además
 * avisaría **antes** de desplegar: el buscador acudiría a una URL que todavía sirve la
 * versión anterior, que es peor que no avisar. Esto corre en el flujo de trabajo, después
 * de `desplegar`, que es el único momento en que lo avisado ya responde.
 *
 * ── Qué se avisa ─────────────────────────────────────────────────────────────────────
 *
 * La portada en cada reconstrucción programada: la Cita del Día rota aunque no se toque
 * ningún fichero. En un empujón con rango Git solo se incluye cuando cambia algo que la
 * portada publica; un commit de la serie de indexación no modifica el sitio ni merece un
 * aviso vacío.
 *
 * Y lo que este empujón haya cambiado, deducido del propio repositorio con `git diff --raw` y
 * sin salir a la red. Se observan las familias publicables —Cita, Autor, Tema, Colección, Ficha
 * de Obra y documento de Fuente— y se avisa cada superficie **cuyos campos pintados** cambiaron,
 * con la misma relación y el mismo comparador que fechan el sitemap (AD-27, Historia 24.8): un
 * commit que solo toca `aptaParaPortada` avisa la portada y nada más, y un documento nuevo, solo
 * su Obra.
 * Las Obras, solo si se indexan después o si su estado anunciable cambió; para saberlo se
 * lee el sitemap desplegado —la única salida a la red, y no tumba nada si falla—.
 * En una Cita el slug se lee del frontmatter y **no** se deriva del nombre del fichero:
 * no coinciden —el fichero separa autor y texto con dos guiones y el slug lleva uno—, y
 * confundirlos anuncia 404 con cara de éxito. Las dos versiones de cada fichero cambiado se leen
 * con un solo `git cat-file --batch`, que sigue sin salir a la red; los documentos no se leen.
 *
 * Avisar del sitemap entero cada día sería más fácil y peor: el protocolo pide avisar de lo que
 * cambia, y quien avisa de todo a diario enseña a los buscadores a no hacerle caso. Para
 * el caso legítimo en que sí toca —un cambio de plantilla que afecta a todas— está
 * `--todo`, que se pide a mano.
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import {
  PUNTO_DE_INDEXNOW,
  avisoDeIndexNow,
  type AvisoDeIndexNow,
} from '../src/lib/buscadores.ts';
import { SITIO } from '../src/lib/dominio.ts';
import { rutaDeLaObra } from '../src/lib/obras.ts';
import {
  MAX_PROPORCION_OBRA_DEL_AUTOR,
  MIN_CITAS_OBRA_INDEXABLE,
  type CongelacionDeObras,
} from '../src/lib/umbrales.ts';
import { constanteNumerica, leerCongelacionDeclarada } from './lib/obras.ts';
import {
  corpusParaFechar,
  entradasCrudas,
  historialDeLosFicheros,
  soloDeModo,
  versionesDeBlobs,
} from '../integraciones/historial.ts';
import { obrasDelCorpusEnDisco } from '../integraciones/indexables.ts';
import {
  VERSION_OPACA,
  bajasDelHistorial,
  conRutas,
  ficherosDelCorpus,
  relacionDeSuperficies,
  superficiesFechadas,
  type CambioDeFichero,
  type CorpusParaFechar,
  type Version,
} from './lib/cambios.ts';
import { esRutaDeObra } from '../src/lib/superficies.ts';
/*
 * Las rutas se componen con los constructores y no a mano, por lo mismo que en el sitio:
 * lo que se anuncia aquí tiene que ser la canónica. Escritas a mano se quedaron sin barra
 * final al migrar, y este aviso —que corre tras cada despliegue— pasó a entregar al
 * buscador la forma que redirige, que es justo lo que la migración venía a quitar. Hoy las
 * da la relación de `tools/lib/cambios.ts`, que las compone con esos constructores.
 */
import { opcion } from './lib/cli.ts';
import { obraDeIndice } from './lib/indice.ts';
import {
  FAMILIAS_DE_FICHERO,
  FAMILIAS_DE_RUTA,
  componerAviso,
  familiaDeFichero,
  rutasDeObraDelSitemap,
  type AvisoCompuesto,
  type FamiliaDeRuta,
  type ListaDeObras,
  type Relacion,
} from './lib/avisar.ts';

const ejecutar = promisify(execFile);

/**
 * El directorio de los documentos de Fuente: se lista con git, nunca se extrae (155 MB). Sale de
 * `FAMILIAS_DE_FICHERO` y de ningún literal: si la familia cambiara de nombre o de directorio,
 * un respaldo escrito aquí seguiría listando el viejo mientras el diff y el historial miran el
 * nuevo, que es justo la divergencia que esa tabla única impide. Sin la familia, la orden no arranca.
 */
const DIRECTORIO_DE_DOCUMENTOS: string = (() => {
  const familia = FAMILIAS_DE_FICHERO.find(([, nombre]) => nombre === 'documento');
  if (familia === undefined) throw new Error('FAMILIAS_DE_FICHERO no declara la familia «documento»');
  return familia[0];
})();

/** Los directorios del Corpus que se extraen de una revisión: todos menos los documentos. */
const DIRECTORIOS_QUE_SE_EXTRAEN = FAMILIAS_DE_FICHERO.filter(([, familia]) => familia !== 'documento').map(
  ([directorio]) => directorio,
);

/**
 * El Corpus de un disco con los ficheros escritos **relativos a la raíz** —`corpus/citas/…`—,
 * que es como los nombra git, y su relación. Así la de antes, leída de una copia temporal, y la
 * de después hablan de los mismos ficheros. Los documentos los da `git ls-tree` de la revisión.
 */
async function corpusEnDisco(
  raiz: string,
  documentos: readonly string[],
): Promise<{ corpus: CorpusParaFechar; relacion: Relacion }> {
  const absoluto = await corpusParaFechar(raiz, { documentos: documentos.map((d) => resolve(raiz, d)) });
  const corpus = conRutas(absoluto, (ruta) => relative(raiz, ruta).split('\\').join('/'));
  return { corpus, relacion: relacionDeSuperficies(corpus) };
}

/** Los documentos de Fuente de una revisión, por `git ls-tree`: solo los nombres. */
async function documentosDeRevision(raiz: string, revision: string): Promise<string[]> {
  const { stdout } = await ejecutar(
    'git',
    ['ls-tree', '-r', '-z', '--name-only', revision, '--', DIRECTORIO_DE_DOCUMENTOS],
    { cwd: raiz, maxBuffer: 64 * 1024 * 1024 },
  );
  // Los documentos y, desde la 24.9, los índices de subpáginas que los ordenan.
  return stdout.split('\0').filter((ruta) => ruta.endsWith('.txt') || obraDeIndice(ruta) !== undefined);
}

/**
 * El Corpus de una revisión, extraído a una copia temporal **fuera del árbol** (AD-21).
 *
 * Solo los directorios publicables —menos `corpus/fuentes`, que se lista y no se extrae—, y solo
 * los que existían en esa revisión: `git archive` se niega ante una ruta que no casa, y un rango
 * anterior a la 22.1 no tiene `corpus/obras`.
 * Git es historia versionada, no la red.
 *
 * Se comprueban **los dos** procesos: si `git archive` falla y `tar` sale con 0 sobre una
 * entrada vacía, la copia vacía parecería un Corpus sin Obras y todas las de hoy pasarían por
 * nuevas. Cualquier fallo lanza, y la copia se borra también entonces.
 */
async function corpusDeRevision(raiz: string, revision: string): Promise<string> {
  const { stdout } = await ejecutar('git', ['ls-tree', '--name-only', revision, 'corpus/'], {
    cwd: raiz,
  });
  const presentes = new Set(stdout.split('\n').map((l) => l.trim()).filter(Boolean));
  const directorios = DIRECTORIOS_QUE_SE_EXTRAEN.filter((d) => presentes.has(d));
  if (!directorios.includes('corpus/citas')) {
    throw new Error(`${revision} no tiene corpus/citas`);
  }
  const copia = await mkdtemp(join(tmpdir(), 'sabiduria-aviso-'));
  try {
    await new Promise<void>((listo, fallo) => {
      const archivo = spawn('git', ['archive', '--format=tar', revision, '--', ...directorios], {
        cwd: raiz,
      });
      const tar = spawn('tar', ['-x', '-C', copia]);
      archivo.stdout.pipe(tar.stdin);
      let error = '';
      archivo.stderr.on('data', (d) => (error += String(d)));
      let codigoArchivo: number | null | undefined;
      let codigoTar: number | null | undefined;
      const terminar = () => {
        if (codigoArchivo === undefined || codigoTar === undefined) return;
        if (codigoArchivo === 0 && codigoTar === 0) listo();
        else {
          fallo(
            new Error(
              `no se pudo extraer ${revision}: git archive salió con ${codigoArchivo}, tar con ` +
                `${codigoTar}${error.trim() === '' ? '' : ` (${error.trim()})`}`,
            ),
          );
        }
      };
      archivo.on('error', fallo);
      tar.on('error', fallo);
      archivo.on('close', (codigo) => {
        codigoArchivo = codigo;
        terminar();
      });
      tar.on('close', (codigo) => {
        codigoTar = codigo;
        terminar();
      });
    });
  } catch (fallo) {
    await rm(copia, { recursive: true, force: true });
    throw fallo;
  }
  return copia;
}

/** Lo que el rango tiene que mirar fuera del Corpus: la regla de indexabilidad. */
const FICHERO_DE_LA_REGLA = 'src/lib/umbrales.ts';

/**
 * La congelación que regía en una revisión, leída de su `umbrales.ts` con el mismo analizador
 * que `congelar` y `levantar`. Un fichero sin el bloque es de antes de la 22.8: sin congelación.
 */
async function congelacionEnRevision(
  raiz: string,
  revision: string,
): Promise<{ congelacion: CongelacionDeObras | null; texto: string }> {
  const { stdout } = await ejecutar('git', ['show', `${revision}:${FICHERO_DE_LA_REGLA}`], {
    cwd: raiz,
    maxBuffer: 8 * 1024 * 1024,
  });
  const leida = leerCongelacionDeclarada(stdout);
  if (leida.estado === 'ilegible') throw new Error(`${FICHERO_DE_LA_REGLA} en ${revision}: ${leida.motivo}`);
  return {
    congelacion: leida.estado === 'declarada' ? (leida.congelacion ?? null) : null,
    texto: stdout,
  };
}

/** El tiempo que se espera al sitemap publicado antes de darlo por ilegible. */
export const ESPERA_DEL_SITEMAP_MS = 30_000;

/**
 * Las rutas de Obra indexables **después**, del sitemap construido y desplegado.
 *
 * El trabajo `avisar` corre tras desplegar y sin `dist/`, así que por omisión se pide
 * `{SITIO}/sitemap-0.xml`, con tiempo límite; con `--sitemap <fichero>` se lee un fichero
 * local. Si no se puede leer, se devuelve el motivo y no una lista vacía: una lista vacía
 * diría que todas las Obras dejaron de indexarse.
 */
export async function obrasDelSitemap(
  local: string | undefined,
  pedir: typeof fetch = fetch,
): Promise<ListaDeObras> {
  try {
    const xml = local !== undefined
      ? await readFile(local, 'utf8')
      : await (async () => {
          const respuesta = await pedir(new URL('/sitemap-0.xml', SITIO), {
            signal: AbortSignal.timeout(ESPERA_DEL_SITEMAP_MS),
          });
          if (!respuesta.ok) throw new Error(`el sitemap respondió ${respuesta.status}`);
          return respuesta.text();
        })();
    if (!/<urlset[\s>]/.test(xml)) throw new Error('lo leído no es un sitemap');
    return { rutas: rutasDeObraDelSitemap(xml) };
  } catch (fallo) {
    return { motivo: `sitemap ilegible: ${fallo instanceof Error ? fallo.message : String(fallo)}` };
  }
}

/** Lo que se lee de un rango para avisarlo y para el ensayo. */
interface LecturaDelRango {
  cambios: CambioDeFichero[];
  reglaCambiada: boolean;
  corpusDespues: CorpusParaFechar;
  relacionDespues: Relacion;
  relacionAntes?: Relacion;
  indexablesAntes: ListaDeObras;
  avisos: string[];
}

/**
 * Si el Corpus de una revisión es el del árbol de trabajo: es su commit **y** los directorios que
 * se leen están limpios. Con una siembra a medias —una Cita sin commit, una ficha a medio
 * escribir— el árbol ya no es `hasta`, y leerlo mezclaría dos estados en una misma lectura: se
 * extrae una copia de `hasta`, como para cualquier otra revisión.
 */
async function esLaDelArbol(raiz: string, revision: string): Promise<boolean> {
  const { stdout } = await ejecutar('git', ['rev-parse', `${revision}^{commit}`, 'HEAD^{commit}'], {
    cwd: raiz,
  });
  const [una, otra] = stdout.split('\n').map((linea) => linea.trim());
  if (una === undefined || una === '' || una !== otra) return false;
  const { stdout: estado } = await ejecutar(
    'git',
    ['status', '--porcelain', '--untracked-files=all', '--', ...DIRECTORIOS_QUE_SE_EXTRAEN],
    { cwd: raiz, maxBuffer: 64 * 1024 * 1024 },
  );
  return estado.trim() === '';
}

/**
 * Los cambios de un rango, con sus dos versiones, y lo que hace falta para avisarlos.
 *
 * Se pregunta a git y no al disco: lo que interesa es qué cambió en **este** empujón. `git diff
 * --raw` da, por fichero, el blob de antes y el de después —un borrado también, para que el
 * buscador deje de ofrecer una página que ya da 404—, y un solo `git cat-file --batch` trae y
 * analiza los dos, salvo los documentos, que solo cuentan como «cambió».
 *
 * Qué rutas componen cada fichero, y con qué campos, lo dice la relación de `tools/lib/cambios.ts`
 * (AD-27), leída sobre el Corpus de después —el árbol si `hasta` es su commit, o una copia de
 * `hasta`— y sobre el de antes —una copia de `desde`—. De la de antes sale a qué páginas
 * pertenecía lo que este rango borró. El slug de una Cita se lee de su frontmatter y no del
 * nombre del fichero, que no coinciden.
 *
 * El rango mira también `src/lib/umbrales.ts`: un commit que solo congela, levanta o mueve un
 * umbral de FR-52 no toca el Corpus y sí cambia qué Obras se indexan. La lista de antes se
 * calcula con la congelación que regía en `desde`; los umbrales, en cambio, son los de hoy, y si
 * el rango los cambió se dice.
 */
async function leerRango(
  raiz: string,
  desde: string,
  hasta: string,
  avisar: (linea: string) => void,
  opciones: { aunSinCambios?: boolean } = {},
): Promise<LecturaDelRango | undefined> {
  const { stdout } = await ejecutar(
    'git',
    [
      'diff',
      '--raw',
      '-z',
      '--no-abbrev',
      '--no-renames',
      `${desde}..${hasta}`,
      '--',
      ...FAMILIAS_DE_FICHERO.map(([directorio]) => directorio),
      FICHERO_DE_LA_REGLA,
    ],
    { cwd: raiz, maxBuffer: 64 * 1024 * 1024 },
  );

  // Un cambio solo de modo no cambió nada que se pinte, tampoco en un documento.
  const entradas = entradasCrudas(stdout)
    .map(({ entrada }) => entrada)
    .filter((entrada) => !soloDeModo(entrada));
  const reglaCambiada = entradas.some((e) => e.fichero === FICHERO_DE_LA_REGLA);
  const delCorpus = entradas.filter((e) => e.fichero !== FICHERO_DE_LA_REGLA);
  // Sin nada que avisar entre los extremos, el aviso no lee nada más. El ensayo sí: el historial
  // del rango puede haber cambiado de fecha algo que el propio rango deshizo.
  if (delCorpus.length === 0 && !reglaCambiada && opciones.aunSinCambios !== true) return undefined;

  const pedidos = new Map<string, string>();
  for (const e of delCorpus) {
    if (familiaDeFichero(e.fichero) === 'documento') continue;
    for (const blob of [e.antes, e.despues]) if (blob !== null) pedidos.set(blob, e.fichero);
  }
  /*
   * Si `cat-file` falla, el aviso no se pierde entero —la portada incluida—: cada versión queda
   * opaca, cuenta como cambio de todo y se avisa de más, que es el lado bueno de equivocarse.
   */
  let versiones: Map<string, Version>;
  try {
    versiones = await versionesDeBlobs(raiz, pedidos);
  } catch (fallo) {
    versiones = new Map();
    avisar(
      `no se pudieron leer las versiones del rango (${fallo instanceof Error ? fallo.message : String(fallo)}): ` +
        'cada fichero cambiado cuenta como cambio de todos sus campos.',
    );
  }
  const version = (blob: string | null, opaca: boolean): Version | null =>
    blob === null ? null : opaca ? VERSION_OPACA : (versiones.get(blob) ?? VERSION_OPACA);
  const cambios: CambioDeFichero[] = delCorpus.map((e) => {
    const opaca = familiaDeFichero(e.fichero) === 'documento';
    return { fichero: e.fichero, antes: version(e.antes, opaca), despues: version(e.despues, opaca) };
  });

  const copias: string[] = [];
  try {
    const raizDespues = (await esLaDelArbol(raiz, hasta))
      ? raiz
      : await corpusDeRevision(raiz, hasta).then((copia) => (copias.push(copia), copia));
    const despues = await corpusEnDisco(raizDespues, await documentosDeRevision(raiz, hasta));

    let relacionAntes: Relacion | undefined;
    let antes: ListaDeObras;
    const avisos: string[] = [];
    let copia: string | undefined;
    try {
      copia = await corpusDeRevision(raiz, desde);
      copias.push(copia);
      relacionAntes = (await corpusEnDisco(copia, await documentosDeRevision(raiz, desde))).relacion;
    } catch (fallo) {
      avisos.push(
        `Sin el Corpus de ${desde} no se avisan las páginas de lo que este rango borró ` +
          `(${fallo instanceof Error ? fallo.message : String(fallo)}).`,
      );
    }
    try {
      if (copia === undefined || relacionAntes === undefined) throw new Error(`Corpus de ${desde} ilegible`);
      const { congelacion, texto } = await congelacionEnRevision(raiz, desde);
      for (const nombre of ['MIN_CITAS_OBRA_INDEXABLE', 'MAX_PROPORCION_OBRA_DEL_AUTOR'] as const) {
        const entonces = constanteNumerica(texto, nombre);
        const hoy = nombre === 'MIN_CITAS_OBRA_INDEXABLE' ? MIN_CITAS_OBRA_INDEXABLE : MAX_PROPORCION_OBRA_DEL_AUTOR;
        if (entonces !== undefined && entonces !== hoy) {
          avisar(
            `${nombre} cambió en el rango (${entonces} → ${hoy}): la lista de Obras indexables ` +
              'de antes se calcula con los umbrales de hoy.',
          );
        }
      }
      /*
       * La lista de antes sale de la **misma función** que usa la construcción, sobre el Corpus
       * y la congelación de `desde`: reimplementar la regla aquí sería el segundo cómputo que
       * AD-11 prohíbe.
       */
      const { indexables } = await obrasDelCorpusEnDisco(copia, congelacion);
      antes = { rutas: indexables.map((obra) => rutaDeLaObra(obra)) };
    } catch (fallo) {
      antes = { motivo: fallo instanceof Error ? fallo.message : String(fallo) };
    }

    return {
      cambios,
      reglaCambiada,
      corpusDespues: despues.corpus,
      relacionDespues: despues.relacion,
      ...(relacionAntes === undefined ? {} : { relacionAntes }),
      indexablesAntes: antes,
      avisos,
    };
  } finally {
    for (const copia of copias) await rm(copia, { recursive: true, force: true });
  }
}

/** El aviso de un rango, con lo leído: lo comparten la orden y el ensayo. */
function avisoDelRango(lectura: LecturaDelRango, despues: ListaDeObras): AvisoCompuesto {
  const aviso = componerAviso({
    cambios: lectura.cambios,
    reglaCambiada: lectura.reglaCambiada,
    relacionDespues: lectura.relacionDespues,
    ...(lectura.relacionAntes === undefined ? {} : { relacionAntes: lectura.relacionAntes }),
    indexablesAntes: lectura.indexablesAntes,
    indexablesDespues: despues,
  });
  return { rutas: aviso.rutas, avisos: [...lectura.avisos, ...aviso.avisos] };
}

/** Las rutas que toca avisar por un rango de commits — `leerRango` y `componerAviso`. */
export async function rutasTocadas(
  raiz: string,
  desde: string,
  hasta: string,
  despues: ListaDeObras,
  avisar: (linea: string) => void = (linea) => console.warn(`Aviso: ${linea}`),
): Promise<AvisoCompuesto> {
  const lectura = await leerRango(raiz, desde, hasta, avisar);
  return lectura === undefined ? { rutas: [], avisos: [] } : avisoDelRango(lectura, despues);
}

/** Por familia de ruta: cuántas superficies cambian de fecha y cuántas se avisarían. */
export type RepartoPorFamilia = Record<FamiliaDeRuta, { cambianDeFecha: number; seAvisarian: number }>;

export interface EnsayoDelRango {
  aviso: AvisoCompuesto;
  reparto: RepartoPorFamilia;
  /** Si el aviso lleva la portada, que no tiene familia ni fecha. */
  portada: boolean;
  /** Lo que tardó la lectura del historial del rango, en milisegundos. */
  msDelHistorial: number;
}

/**
 * El ensayo de un rango — Historia 24.8: el aviso y, por familia de ruta, **cuántas superficies
 * cambian de fecha** y **cuántas se avisarían**. No escribe ni envía nada.
 *
 * «Cambian de fecha» es la lectura de fechas de la relación sobre el historial **del rango**
 * (`git log --raw desde..hasta`), el Corpus de después y las bajas del rango: una superficie
 * cambia de fecha si y solo si alguna transición del rango cambió los campos que pinta. Es la
 * misma función que fecha el sitemap, con dos diferencias que conviene leer junto a la cifra:
 * cuenta **toda** superficie de la relación —también las Obras `noindex`, que el sitemap no
 * publica—, y el historial ve cada commit intermedio, así que un cambio que el propio rango
 * deshace cambia de fecha y, como el aviso compara solo los extremos, no se avisa.
 */
export async function ensayoDelRango(
  raiz: string,
  desde: string,
  hasta: string,
  despues: ListaDeObras,
  avisar: (linea: string) => void = (linea) => console.warn(`Aviso: ${linea}`),
): Promise<EnsayoDelRango> {
  const reparto = Object.fromEntries(
    FAMILIAS_DE_RUTA.map((familia) => [familia, { cambianDeFecha: 0, seAvisarian: 0 }]),
  ) as RepartoPorFamilia;
  /*
   * Se lee el rango **aunque sus extremos no difieran**: un cambio que el rango hace y deshace no
   * se avisa, pero sí cambia de fecha, y la cifra tiene que decirlo y no salir a cero.
   */
  const lectura = await leerRango(raiz, desde, hasta, avisar, { aunSinCambios: true });
  if (lectura === undefined) throw new Error(`el rango ${desde}..${hasta} no se leyó`);
  const aviso = avisoDelRango(lectura, despues);

  const inicio = performance.now();
  const absoluto = await historialDeLosFicheros(
    raiz,
    FAMILIAS_DE_FICHERO.map(([directorio]) => resolve(raiz, directorio)),
    { rango: `${desde}..${hasta}`, opacos: [resolve(raiz, DIRECTORIO_DE_DOCUMENTOS)] },
  );
  const msDelHistorial = performance.now() - inicio;
  const historial = new Map(
    [...absoluto].map(([fichero, transiciones]) => [relative(raiz, fichero).split('\\').join('/'), transiciones]),
  );
  const corpus: CorpusParaFechar = {
    ...lectura.corpusDespues,
    bajas: bajasDelHistorial(historial, familiaDeFichero, new Set(ficherosDelCorpus(lectura.corpusDespues))),
  };
  for (const { familia } of superficiesFechadas(corpus, historial).values()) reparto[familia].cambianDeFecha += 1;

  let portada = false;
  for (const ruta of aviso.rutas) {
    if (ruta === '/') {
      portada = true;
      continue;
    }
    const familia =
      lectura.relacionDespues.get(ruta)?.familia ??
      lectura.relacionAntes?.get(ruta)?.familia ??
      (esRutaDeObra(ruta) ? 'obra' : undefined);
    if (familia !== undefined) reparto[familia].seAvisarian += 1;
  }
  return { aviso, reparto, portada, msDelHistorial };
}

/** El reparto del ensayo, en una tabla que se lee de un vistazo. */
export function informeDelEnsayo(desde: string, hasta: string, ensayo: EnsayoDelRango): string[] {
  const columna = (texto: string | number, ancho: number) => String(texto).padStart(ancho);
  return [
    `Reparto por familia, ${desde}..${hasta}:`,
    `  ${'familia'.padEnd(10)}${columna('cambian de fecha', 18)}${columna('se avisarían', 14)}`,
    ...FAMILIAS_DE_RUTA.map(
      (familia) =>
        `  ${familia.padEnd(10)}${columna(ensayo.reparto[familia].cambianDeFecha, 18)}` +
        `${columna(ensayo.reparto[familia].seAvisarian, 14)}`,
    ),
    `  ${'portada'.padEnd(10)}${columna('—', 18)}${columna(ensayo.portada ? 1 : 0, 14)}`,
    `Lectura del historial del rango: ${(ensayo.msDelHistorial / 1000).toFixed(2)} s.`,
  ];
}

/** Todas las URLs que el sitio publica, leídas del sitemap recién construido. */
export async function rutasDelSitemapConstruido(raiz: string): Promise<string[]> {
  const xml = await readFile(join(raiz, 'dist', 'sitemap-0.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? '').filter(Boolean);
}

/**
 * El envío.
 *
 * Un `202` es el éxito normal del protocolo: «aceptado, ya lo miraré». Un `200` también
 * vale. Cualquier otra cosa se cuenta y **no** rompe: avisar es una mejora, no una
 * garantía del producto, y un buscador caído no puede tumbar una publicación que ya está
 * en línea. Eso sí, se dice en voz alta, porque un aviso que falla todos los días en
 * silencio es exactamente el fallo que este repositorio persigue.
 */
export async function enviar(aviso: AvisoDeIndexNow): Promise<{ ok: boolean; estado: number; cuerpo: string }> {
  const respuesta = await fetch(PUNTO_DE_INDEXNOW, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(aviso),
  });

  const cuerpo = await respuesta.text().catch(() => '');
  return { ok: respuesta.ok, estado: respuesta.status, cuerpo: cuerpo.slice(0, 400) };
}

async function principal(argumentos: string[]): Promise<number> {
  const raiz = process.cwd();
  const ensayo = argumentos.includes('--ensayo');
  const todo = argumentos.includes('--todo');
  const desde = opcion(argumentos, '--desde');
  const hasta = opcion(argumentos, '--hasta') ?? 'HEAD';
  const sitemap = opcion(argumentos, '--sitemap');

  const rutas = new Set<string>();

  if (todo) {
    for (const url of await rutasDelSitemapConstruido(raiz)) rutas.add(url);
  } else if (desde !== undefined && desde !== '' && !/^0+$/.test(desde)) {
    /*
     * `0000000…` es lo que GitHub manda en `github.event.before` cuando la rama es nueva,
     * y no es un commit: pedirle a git ese rango falla. Se trata como «sin rango», que es
     * lo que de verdad significa.
     */
    try {
      const despues = await obrasDelSitemap(sitemap);
      if (ensayo) {
        // Historia 24.8 — el ensayo de un rango dice además qué movería, por familia.
        const resultado = await ensayoDelRango(raiz, desde, hasta, despues);
        for (const ruta of resultado.aviso.rutas) rutas.add(ruta);
        for (const linea of resultado.aviso.avisos) console.warn(`Aviso: ${linea}`);
        for (const linea of informeDelEnsayo(desde, hasta, resultado)) console.log(linea);
      } else {
        const aviso = await rutasTocadas(raiz, desde, hasta, despues);
        for (const ruta of aviso.rutas) rutas.add(ruta);
        for (const linea of aviso.avisos) console.warn(`Aviso: ${linea}`);
      }
    } catch (error) {
      if (ensayo) {
        /*
         * El ensayo existe para dar las cifras: sin ellas no puede salir con 0 ni decir «ningún
         * cambio publicable», que es lo que diría un rango que de verdad no cambió nada.
         */
        console.error(`Ensayo: no se pudo leer el rango ${desde}..${hasta}, y no hay reparto — ${String(error)}`);
        return 1;
      }
      /*
       * El aviso, en cambio, no tumba el despliegue que lo llama. Pero tampoco calla: no se sabe
       * qué cambió, y la portada —que la reconstrucción programada avisa siempre— va igual.
       */
      console.warn(`Aviso: no se pudo leer el rango ${desde}..${hasta}; se avisa solo la portada — ${String(error)}`);
      rutas.add('/');
    }
  } else {
    // Reconstrucción programada: aunque git no cambie, la Cita del Día sí cambia.
    rutas.add('/');
  }

  if (rutas.size === 0) {
    console.log('IndexNow — ningún cambio publicable que avisar.');
    return 0;
  }

  const aviso = avisoDeIndexNow(SITIO, [...rutas]);

  console.log(`IndexNow — ${aviso.urlList.length} URL(s) para ${aviso.host}:`);
  for (const url of aviso.urlList.slice(0, 12)) console.log(`  ${url}`);
  if (aviso.urlList.length > 12) console.log(`  … y ${aviso.urlList.length - 12} más`);

  if (ensayo) {
    console.log('Ensayo: no se ha enviado nada.');
    return 0;
  }

  const { ok, estado, cuerpo } = await enviar(aviso);
  if (ok) {
    console.log(`Aceptado (${estado}).`);
    return 0;
  }

  // No rompe la publicación: el sitio ya está en línea y el aviso es una mejora.
  console.warn(`El aviso no se aceptó (${estado}). ${cuerpo}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  principal(process.argv.slice(2)).then((codigo) => {
    process.exitCode = codigo;
  });
}
