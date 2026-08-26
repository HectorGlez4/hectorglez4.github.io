/**
 * El aviso a los buscadores por IndexNow — lo que el sitemap no puede hacer.
 *
 *   npx tsx tools/avisar.ts                          # solo la portada
 *   npx tsx tools/avisar.ts --desde <sha> --hasta <sha>
 *   npx tsx tools/avisar.ts --todo                   # el sitemap entero
 *   npx tsx tools/avisar.ts --ensayo                 # compone y no envía
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
 * La portada **siempre**: la Cita del Día rota cada jornada, así que cambia en todas las
 * reconstrucciones, incluidas las programadas donde no se toca ni un fichero.
 *
 * Y lo que este empujón haya cambiado, deducido del propio repositorio con `git diff` y
 * sin salir a la red: por cada fichero tocado de `corpus/citas/`, su Página de Cita, la
 * de su Autor y las de sus Temas, que son las tres superficies donde esa Cita aparece.
 * El slug se lee del frontmatter y **no** se deriva del nombre del fichero: no coinciden
 * —el fichero separa autor y texto con dos guiones y el slug lleva uno—, y confundirlos
 * anuncia 404 con cara de éxito. De una Cita retirada en este mismo rango se lee la
 * versión anterior con `git show`, que sigue sin ser salir a la red.
 *
 * Avisar de las 688 cada día sería más fácil y peor: el protocolo pide avisar de lo que
 * cambia, y quien avisa de todo a diario enseña a los buscadores a no hacerle caso. Para
 * el caso legítimo en que sí toca —un cambio de plantilla que afecta a todas— está
 * `--todo`, que se pide a mano.
 */
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, resolve } from 'node:path';
import {
  PUNTO_DE_INDEXNOW,
  avisoDeIndexNow,
  type AvisoDeIndexNow,
} from '../src/lib/buscadores.ts';
import { SITIO } from '../src/lib/dominio.ts';
import { opcion } from './lib/cli.ts';
import { leerCitas, rutasDelCorpus, separarFrontmatter } from './lib/corpus.ts';

const ejecutar = promisify(execFile);

/**
 * Las rutas que toca avisar por un rango de commits.
 *
 * Se pregunta a git y no al disco: lo que interesa es qué cambió en **este** empujón, y
 * el disco solo sabe cómo están las cosas ahora. `--diff-filter` no descarta borrados a
 * propósito —una Cita retirada también hay que anunciarla, para que el buscador deje de
 * ofrecer una página que ya da 404—.
 */
export async function rutasTocadas(
  raiz: string,
  desde: string,
  hasta: string,
): Promise<string[]> {
  const { stdout } = await ejecutar(
    'git',
    ['diff', '--name-only', `${desde}..${hasta}`, '--', 'corpus/citas'],
    { cwd: raiz },
  );

  const ficheros = stdout.split('\n').map((l) => l.trim()).filter(Boolean);
  if (ficheros.length === 0) return [];

  /*
   * El slug de una Cita **no** es el nombre de su fichero, y confundirlos compone URLs
   * que no existen.
   *
   * `slugDeFichero` dice en su propio comentario que sirve para Autores y Temas; el
   * fichero de una Cita separa autor y texto con dos guiones —`manuel-gonzalez-prada--los-
   * que-vengan-manana…`— mientras que el slug publicado lleva uno solo, porque es un campo
   * explícito del frontmatter. Derivarlo del nombre daba `/cita/…prada--los-que…`, que es
   * un 404: el aviso habría salido verde todos los días anunciando páginas inexistentes.
   *
   * Así que se lee el campo. Para lo que sigue en el corpus, del disco; para lo que este
   * rango borró —que es justo lo que más falta hace avisar, para que el buscador deje de
   * ofrecer una página que ya da 404—, del propio git, con `git show`. Sigue sin salir a
   * la red: git es historia versionada, no un servicio.
   */
  const rutas = new Set<string>();
  const publicadas = await leerCitas(rutasDelCorpus(join(raiz, 'corpus')).citas);
  const porRuta = new Map(publicadas.map((c) => [resolve(c.ruta), c]));

  for (const fichero of ficheros) {
    const cita = porRuta.get(resolve(join(raiz, fichero)));

    if (cita !== undefined) {
      rutas.add(`/cita/${cita.slug}`);
      if (cita.autor) rutas.add(`/autor/${cita.autor}`);
      for (const tema of cita.temas ?? []) rutas.add(`/tema/${tema}`);
      continue;
    }

    const retirada = await slugDeCitaRetirada(raiz, desde, fichero);
    if (retirada !== undefined) rutas.add(`/cita/${retirada}`);
  }

  return [...rutas];
}

/**
 * El slug de una Cita que este rango retiró, leído de la versión anterior en git.
 *
 * Se le pregunta al commit de partida porque en el de llegada el fichero ya no está. Si
 * tampoco estaba antes —un fichero que nació y murió dentro del rango, o una ruta que
 * nunca fue una Cita— no hay nada que avisar y se devuelve `undefined` en vez de romper:
 * esto corre después de desplegar y no puede tumbar una publicación que ya está en línea.
 */
async function slugDeCitaRetirada(
  raiz: string,
  desde: string,
  fichero: string,
): Promise<string | undefined> {
  try {
    const { stdout } = await ejecutar('git', ['show', `${desde}:${fichero}`], {
      cwd: raiz,
      maxBuffer: 8 * 1024 * 1024,
    });
    const datos = separarFrontmatter(stdout);
    const slug = datos?.['slug'];
    return typeof slug === 'string' && slug !== '' ? slug : undefined;
  } catch {
    return undefined;
  }
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

  // La portada siempre: la Cita del Día rota en cada reconstrucción, tocara o no un fichero.
  const rutas = new Set<string>(['/']);

  if (todo) {
    for (const url of await rutasDelSitemapConstruido(raiz)) rutas.add(url);
  } else if (desde !== undefined && desde !== '' && !/^0+$/.test(desde)) {
    /*
     * `0000000…` es lo que GitHub manda en `github.event.before` cuando la rama es nueva,
     * y no es un commit: pedirle a git ese rango falla. Se trata como «sin rango», que es
     * lo que de verdad significa.
     */
    try {
      for (const ruta of await rutasTocadas(raiz, desde, hasta)) rutas.add(ruta);
    } catch (error) {
      console.warn(`Aviso: no se pudo leer el rango ${desde}..${hasta} — ${String(error)}`);
    }
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
