/**
 * El aviso a los buscadores por IndexNow — lo que el sitemap no puede hacer.
 *
 *   npx tsx tools/avisar.ts                          # solo la portada
 *   npx tsx tools/avisar.ts --desde <sha> --hasta <sha>
 *   npx tsx tools/avisar.ts --todo                   # el sitemap entero
 *   npx tsx tools/avisar.ts --ensayo                 # compone y no envía
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
 * Y lo que este empujón haya cambiado, deducido del propio repositorio con `git diff` y
 * sin salir a la red. Se observan las familias publicables —Cita, Autor, Tema, Colección y
 * Ficha de Obra— y se avisan también las superficies agregadas cuyo HTML reproduce el dato.
 * Las Obras, solo si se indexan después o si su estado anunciable cambió; para saberlo se
 * lee el sitemap desplegado —la única salida a la red, y no tumba nada si falla—.
 * En una Cita el slug se lee del frontmatter y **no** se deriva del nombre del fichero:
 * no coinciden —el fichero separa autor y texto con dos guiones y el slug lleva uno—, y
 * confundirlos anuncia 404 con cara de éxito. De una Cita retirada o editada en este mismo
 * rango se lee también la versión anterior con `git show`, que sigue sin salir a la red.
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
import { join, relative } from 'node:path';
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
import { corpusParaFechar } from '../integraciones/historial.ts';
import { obrasDelCorpusEnDisco } from '../integraciones/indexables.ts';
import { relacionDeSuperficies } from './lib/cambios.ts';
/*
 * Las rutas se componen con los constructores y no a mano, por lo mismo que en el sitio:
 * lo que se anuncia aquí tiene que ser la canónica. Escritas a mano se quedaron sin barra
 * final al migrar, y este aviso —que corre tras cada despliegue— pasó a entregar al
 * buscador la forma que redirige, que es justo lo que la migración venía a quitar. Hoy las
 * da la relación de `tools/lib/cambios.ts`, que las compone con esos constructores.
 */
import { opcion } from './lib/cli.ts';
import {
  DIRECTORIOS_AVISABLES,
  componerAviso,
  rutasDeObraDelSitemap,
  type AvisoCompuesto,
  type ListaDeObras,
  type Relacion,
} from './lib/avisar.ts';

const ejecutar = promisify(execFile);

/**
 * La relación de un Corpus en disco con los ficheros escritos **relativos a la raíz** de ese
 * Corpus —`corpus/citas/…`—, que es como los nombra `git diff`. Así la de antes, leída de
 * una copia temporal, y la de después, leída del árbol, hablan de los mismos ficheros.
 */
async function relacionEnDisco(raiz: string): Promise<Relacion> {
  const relacion = relacionDeSuperficies(await corpusParaFechar(raiz));
  const relativa = new Map<string, string[]>();
  for (const [ruta, ficheros] of relacion) {
    relativa.set(ruta, ficheros.map((f) => relative(raiz, f).split('\\').join('/')));
  }
  return relativa;
}

/**
 * El Corpus de una revisión, extraído a una copia temporal **fuera del árbol** (AD-21).
 *
 * Solo los directorios publicables, y solo los que existían en esa revisión: `git archive`
 * se niega ante una ruta que no casa, y un rango anterior a la 22.1 no tiene `corpus/obras`.
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
  const directorios = DIRECTORIOS_AVISABLES.map(([d]) => d).filter((d) => presentes.has(d));
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

/**
 * Las rutas que toca avisar por un rango de commits.
 *
 * Se pregunta a git y no al disco: lo que interesa es qué cambió en **este** empujón, y
 * el disco solo sabe cómo están las cosas ahora. `--diff-filter` no descarta borrados a
 * propósito —una Cita retirada también hay que anunciarla, para que el buscador deje de
 * ofrecer una página que ya da 404—.
 *
 * Qué rutas renderizan cada fichero lo dice la relación de `tools/lib/cambios.ts` (AD-27),
 * leída sobre el Corpus de después —el árbol— y sobre el de antes —una copia de `desde`—.
 * De la de antes sale a qué páginas pertenecía lo que este rango borró. El slug de una Cita
 * se lee de su frontmatter y no del nombre del fichero, que no coinciden: el fichero separa
 * autor y texto con dos guiones y el slug lleva uno, y confundirlos anuncia 404.
 *
 * El rango mira también `src/lib/umbrales.ts`: un commit que solo congela, levanta o mueve un
 * umbral de FR-52 no toca el Corpus y sí cambia qué Obras se indexan. La lista de antes se
 * calcula con la congelación que regía en `desde`; los umbrales, en cambio, son los de hoy, y
 * si el rango los cambió se dice.
 */
export async function rutasTocadas(
  raiz: string,
  desde: string,
  hasta: string,
  despues: ListaDeObras,
  avisar: (linea: string) => void = (linea) => console.warn(`Aviso: ${linea}`),
): Promise<AvisoCompuesto> {
  const { stdout } = await ejecutar(
    'git',
    [
      'diff',
      '--name-only',
      `${desde}..${hasta}`,
      '--',
      ...DIRECTORIOS_AVISABLES.map(([directorio]) => directorio),
      FICHERO_DE_LA_REGLA,
    ],
    { cwd: raiz },
  );

  const tocados = stdout.split('\n').map((l) => l.trim()).filter(Boolean);
  const reglaCambiada = tocados.includes(FICHERO_DE_LA_REGLA);
  const cambiados = tocados.filter((f) => f !== FICHERO_DE_LA_REGLA);
  if (cambiados.length === 0 && !reglaCambiada) return { rutas: [], avisos: [] };

  const relacionDespues = await relacionEnDisco(raiz);

  let relacionAntes: Relacion | undefined;
  let antes: ListaDeObras;
  const avisos: string[] = [];
  let copia: string | undefined;
  try {
    copia = await corpusDeRevision(raiz, desde);
    relacionAntes = await relacionEnDisco(copia);
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
  } finally {
    if (copia !== undefined) await rm(copia, { recursive: true, force: true });
  }

  const aviso = componerAviso({
    cambiados,
    reglaCambiada,
    relacionDespues,
    ...(relacionAntes === undefined ? {} : { relacionAntes }),
    indexablesAntes: antes,
    indexablesDespues: despues,
  });
  return { rutas: aviso.rutas, avisos: [...avisos, ...aviso.avisos] };
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
      const aviso = await rutasTocadas(raiz, desde, hasta, await obrasDelSitemap(sitemap));
      for (const ruta of aviso.rutas) rutas.add(ruta);
      for (const linea of aviso.avisos) console.warn(`Aviso: ${linea}`);
    } catch (error) {
      console.warn(`Aviso: no se pudo leer el rango ${desde}..${hasta} — ${String(error)}`);
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
