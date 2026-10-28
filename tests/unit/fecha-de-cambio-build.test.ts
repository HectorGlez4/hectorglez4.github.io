import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { appendFile, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  coleccionValida,
  construirConCorpus,
  construirProyecto,
  enlazarDependencias,
  limpiar,
} from './ayuda/construir.js';
import { CITAS_POR_PAGINA } from '../../src/lib/umbrales.ts';
import {
  anunciableEnElSitemap,
  rutaDeAutor,
  rutaDeCita,
  rutaDeColeccion,
  rutaDeTema,
  rutaNormalizada,
} from '../../src/lib/superficies.ts';
import { obrasDelSitemap, rutasTocadas } from '../../tools/avisar.ts';

const ejecutar = promisify(execFile);

/**
 * Historia 18.4 — el `lastmod` del sitemap, sobre un sitio construido de verdad.
 *
 * El riesgo de esta historia no es el código: es que funcione en local y no en CI. Aquí se
 * fijan los extremos sobre el sitemap que sale del build, que es el único sitio donde el
 * defecto se vería:
 *
 *   · **sin repositorio no se inventa nada** — el proyecto temporal no tiene `.git`, así
 *     que git ni siquiera contesta: el sitemap tiene que salir sin una sola fecha;
 *   · **con un checkout superficial tampoco** — y ésta es la fila que el spec llama el
 *     riesgo principal, así que se ejerce de extremo a extremo: se clona el proyecto con
 *     `--depth 1 file://` y se construye **esa** copia. Es una rama distinta de la
 *     anterior, y no una variante suya: en una copia superficial
 *     `git rev-parse --is-shallow-repository` imprime `true`, mientras que donde no hay
 *     repositorio **lanza**. Sin esta fase, la rama que de verdad corre en CI no la
 *     ejercía nadie;
 *   · **con historial, cada superficie lleva la suya** — y no la del build, cosa que se
 *     demuestra dando a dos superficies del mismo sitio dos fechas distintas y ninguna de
 *     hoy;
 *   · **dos construcciones del mismo commit dan las mismas fechas**, que es el criterio que
 *     separa una fecha de contenido de una fecha de reloj;
 *   · **la fecha es la de los campos que la página pinta** (Historia 24.8): un commit que solo
 *     marca una Cita apta para portada no fecha nada, y uno que solo cambia la semblanza solo
 *     fecha la Página de Autor.
 *
 * Las construcciones son del **mismo** proyecto a propósito —salvo la superficial, que por
 * definición tiene que ser un clon—: comparar dos proyectos distintos compararía dos
 * repositorios, no dos builds.
 */

const SLUGS = Array.from({ length: CITAS_POR_PAGINA + 1 }, (_, i) => `seneca-fragmento-${i + 1}`);

const CORPUS: Record<string, string> = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'colecciones/frases-cortas.yml': coleccionValida({ miembros: SLUGS }),
  ...Object.fromEntries(
    SLUGS.map((slug, i) => [
      `citas/seneca--fragmento-${i + 1}.md`,
      citaValida({
        slug,
        texto: `Fragmento ${i + 1} sobre la brevedad de la vida, que es larga si sabes usarla.`,
      }),
    ]),
  ),
};

/**
 * Lo que este corpus tiene que anunciar, derivado de él y **no** del sitemap construido.
 *
 * Es la mitad independiente de la comprobación «la fecha no cambia lo que se anuncia»:
 * comparar dos sitemaps que han pasado los dos por el mismo `serialize` no contrasta nada.
 * El conjunto sale de los constructores de ruta y del carácter que declara
 * `src/lib/superficies.ts`; la página 2 de Autor no está porque es `servicio`.
 */
const ANUNCIABLES = [
  '/',
  ...SLUGS.map((slug) => rutaDeCita(slug)),
  rutaDeAutor('seneca'),
  rutaDeTema('el-tiempo'),
  rutaDeColeccion('frases-cortas'),
]
  .map(rutaNormalizada)
  .sort();

/** Las rutas que el filtro deja fuera, y que ningún `serialize` puede colar. */
const NO_ANUNCIABLES = ['/buscar', '/kit', '/lote', '/404', rutaNormalizada(rutaDeAutor('seneca', 2))];

/** El día en que se commitea el Corpus entero, y el instante que el sitemap declarará. */
const PRIMER_COMMIT = '2024-01-02';
const PRIMER_INSTANTE = '2024-01-02T09:00:00.000Z';
/** El día en que se toca **solo** el fichero del Tema. */
const SEGUNDO_COMMIT = '2024-03-04';
const SEGUNDO_INSTANTE = '2024-03-04T09:00:00.000Z';
/** Historia 24.8 — el día en que una Cita solo se marca apta para portada: no fecha nada. */
const TERCER_COMMIT = '2024-05-06';
const TERCER_INSTANTE = '2024-05-06T09:00:00.000Z';
/** Historia 24.8 — el día en que solo cambia la semblanza del Autor: solo fecha su página. */
const CUARTO_COMMIT = '2024-07-08';
const CUARTO_INSTANTE = '2024-07-08T09:00:00.000Z';
/** Historia 24.8 — el día en que se siembra una Cita nueva de la misma Obra, Autor y Tema. */
const QUINTO_COMMIT = '2024-09-10';
const QUINTO_INSTANTE = '2024-09-10T09:00:00.000Z';
const SLUG_NUEVO = 'seneca-fragmento-nuevo';

/**
 * El entorno de git de estas pruebas, sin heredar la configuración de quien las corre.
 *
 * Con un `commit.gpgsign = true` global fallan al commitear y con un `core.hooksPath`
 * global pueden colgarse en un gancho ajeno, y en los dos casos el fallo no tendría nada
 * que ver con lo que se mide. El código de producción no hace esto a propósito:
 * `actions/checkout` escribe `safe.directory` en la configuración global del corredor.
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

/** Lo que se versiona del proyecto temporal: todo lo que el andamio copió, y nada más. */
const DEL_PROYECTO = [
  'corpus',
  'src',
  'public',
  'integraciones',
  'tools',
  'package.json',
  'astro.config.mjs',
  'tsconfig.json',
];

/** Las entradas del sitemap construido: ruta normalizada → `lastmod`, si lo lleva. */
async function entradasDelSitemap(proyecto: string): Promise<Map<string, string | undefined>> {
  const xml = await readFile(join(proyecto, 'dist', 'sitemap-0.xml'), 'utf8');
  const entradas = new Map<string, string | undefined>();
  for (const bloque of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const url = /<loc>([^<]+)<\/loc>/.exec(bloque[1] ?? '')?.[1];
    if (url === undefined) continue;
    entradas.set(rutaNormalizada(url), /<lastmod>([^<]+)<\/lastmod>/.exec(bloque[1] ?? '')?.[1]);
  }
  return entradas;
}

describe('Historia 18.4 — el sitemap declara cuándo cambió cada superficie', () => {
  let proyecto: string;
  let clonSuperficial: string | undefined;
  let salidaSinRepositorio: string;
  let salidaSuperficial: string;
  let sinRepositorio: Map<string, string | undefined>;
  let superficial: Map<string, string | undefined>;
  let primera: Map<string, string | undefined>;
  let segunda: Map<string, string | undefined>;
  /** Historia 24.8 — el sitemap tras sembrar una Cita, el HTML de sus hermanas y el aviso del commit. */
  let tercera: Map<string, string | undefined>;
  let hermanasQueEnlazanLaNueva: string[];
  let avisoDeLaSiembra: { rutas: string[]; avisos: string[] };

  beforeAll(async () => {
    // 1) Construcción sin repositorio: el proyecto temporal no tiene `.git`.
    const resultado = await construirConCorpus(CORPUS);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
    salidaSinRepositorio = resultado.salida;
    sinRepositorio = await entradasDelSitemap(proyecto);

    // 2) Se le da historial, con dos commits fechados a mano para no depender del día en
    //    que corra la prueba. El segundo toca **solo** el Tema, que es lo que hace visible
    //    que cada superficie lleva su fecha y no una común.
    const git = (argumentos: string[], momento?: string) =>
      ejecutar('git', argumentos, {
        cwd: proyecto,
        env: {
          ...ENTORNO_LIMPIO,
          ...(momento ? { GIT_AUTHOR_DATE: momento, GIT_COMMITTER_DATE: momento } : {}),
        },
      });

    await git(['init', '--initial-branch=principal']);
    // Se versiona el proyecto entero —no solo el corpus— porque la fase superficial de
    // abajo clona esto y construye el clon: lo que no esté versionado no llega allí.
    await git(['add', ...DEL_PROYECTO]);
    await git(['commit', '-m', 'el Corpus'], `${PRIMER_COMMIT}T09:00:00+0000`);

    await writeFile(join(proyecto, 'corpus', 'temas', 'el-tiempo.yml'), 'nombre: El Tiempo\n', 'utf8');
    await git(['add', 'corpus']);
    await git(['commit', '-m', 'el Tema'], `${SEGUNDO_COMMIT}T09:00:00+0000`);

    // Historia 24.8 — dos commits que solo tocan campos que la Página de Cita no pinta.
    await writeFile(
      join(proyecto, 'corpus', 'citas', 'seneca--fragmento-1.md'),
      citaValida({
        slug: SLUGS[0],
        texto: 'Fragmento 1 sobre la brevedad de la vida, que es larga si sabes usarla.',
        aptaParaPortada: true,
      }),
      'utf8',
    );
    await git(['add', 'corpus']);
    await git(['commit', '-m', 'apta para portada'], `${TERCER_COMMIT}T09:00:00+0000`);

    await writeFile(
      join(proyecto, 'corpus', 'autores', 'seneca.yml'),
      AUTOR_VALIDO.replace(/^semblanza: .*$/mu, 'semblanza: Filósofo estoico nacido en Córdoba, consejero de Nerón.'),
      'utf8',
    );
    await git(['add', 'corpus']);
    await git(['commit', '-m', 'la semblanza'], `${CUARTO_COMMIT}T09:00:00+0000`);

    // 3) Dos construcciones más, del mismo commit y sin tocar nada entre medias.
    const conGit = await construirProyecto(proyecto);
    expect(conGit.codigo, conGit.salida).toBe(0);
    primera = await entradasDelSitemap(proyecto);

    const repetida = await construirProyecto(proyecto);
    expect(repetida.codigo, repetida.salida).toBe(0);
    segunda = await entradasDelSitemap(proyecto);

    /*
     * 4) La copia superficial, que es lo que `actions/checkout` hace por omisión y la fila
     *    que el spec llama el riesgo principal. Se clona con `--depth 1 file://` y se
     *    construye **el clon**: es la única forma de ejercer la rama de verdad, porque en
     *    una copia superficial `--is-shallow-repository` imprime `true` mientras que en un
     *    directorio sin repositorio lanza. Las dependencias se enlazan porque no están
     *    versionadas y el clon no las trae.
     */
    clonSuperficial = await mkdtemp(join(tmpdir(), 'sabiduria-superficial-'));
    await ejecutar('git', ['clone', '--depth', '1', `file://${proyecto}`, clonSuperficial], {
      env: ENTORNO_LIMPIO,
    });
    await enlazarDependencias(clonSuperficial);
    const enSuperficial = await construirProyecto(clonSuperficial);
    expect(enSuperficial.codigo, enSuperficial.salida).toBe(0);
    salidaSuperficial = enSuperficial.salida;
    superficial = await entradasDelSitemap(clonSuperficial);

    /*
     * 5) Historia 24.8 — una siembra: una Cita nueva de la misma Obra, el mismo Autor y el mismo
     *    Tema que todas las demás, con su texto añadido al documento de la Fuente para que cruce
     *    el cotejo. Su «Siguiente», «De la misma obra» y los recuentos cambian el HTML de las
     *    hermanas; su fecha no debe moverse. Y el aviso del mismo commit, leído con git de verdad,
     *    tiene que nombrar exactamente las rutas que el sitemap refecha.
     */
    const desde = (await git(['rev-parse', 'HEAD'])).stdout.trim();
    const textoNuevo = 'Una Cita sembrada después, sobre la brevedad de la vida y lo poco que la usamos.';
    const fuentes = join(proyecto, 'corpus', 'fuentes');
    const documentos = (await readdir(fuentes)).filter((nombre) => nombre.endsWith('.txt'));
    expect(documentos).toHaveLength(1);
    await appendFile(join(fuentes, documentos[0] as string), `\n${textoNuevo}\n`, 'utf8');
    await writeFile(
      join(proyecto, 'corpus', 'citas', 'seneca--fragmento-nuevo.md'),
      citaValida({ slug: SLUG_NUEVO, texto: textoNuevo }),
      'utf8',
    );
    await git(['add', 'corpus']);
    await git(['commit', '-m', 'una Cita nueva'], `${QUINTO_COMMIT}T09:00:00+0000`);
    const hasta = (await git(['rev-parse', 'HEAD'])).stdout.trim();

    const conLaNueva = await construirProyecto(proyecto);
    expect(conLaNueva.codigo, conLaNueva.salida).toBe(0);
    tercera = await entradasDelSitemap(proyecto);
    hermanasQueEnlazanLaNueva = [];
    for (const slug of SLUGS) {
      const html = await readFile(join(proyecto, 'dist', 'cita', slug, 'index.html'), 'utf8');
      if (html.includes(`href="${rutaDeCita(SLUG_NUEVO)}"`)) hermanasQueEnlazanLaNueva.push(slug);
    }
    const avisos: string[] = [];
    avisoDeLaSiembra = await rutasTocadas(
      proyecto,
      desde,
      hasta,
      await obrasDelSitemap(join(proyecto, 'dist', 'sitemap-0.xml')),
      (linea) => avisos.push(linea),
    );
    avisoDeLaSiembra.avisos.push(...avisos);
  });

  afterAll(async () => {
    if (proyecto) await limpiar(proyecto);
    if (clonSuperficial) await rm(clonSuperficial, { recursive: true, force: true });
  });

  it('sin repositorio no se inventa ninguna fecha: el sitemap sale como el de hoy', () => {
    // Sin esto la comprobación sería verde frente a un sitemap vacío.
    expect(sinRepositorio.size).toBeGreaterThan(3);
    expect([...sinRepositorio.values()].filter((f) => f !== undefined)).toEqual([]);
  });

  it('con un checkout superficial tampoco: ni una fecha, y ninguna repetida', () => {
    /*
     * Es la mentira que la historia existe para no cometer, y llega disfrazada de éxito:
     * git trata el commit injertado como raíz y `--name-only` lista el árbol entero, así
     * que sin la comprobación **todas** las entradas saldrían con la misma fecha —la del
     * último commit—, indistinguible de una fecha de build. El sitemap del clon tiene que
     * salir con sus entradas y sin un solo `lastmod`.
     */
    expect(superficial.size).toBe(sinRepositorio.size);
    expect([...superficial.values()].filter((f) => f !== undefined)).toEqual([]);
  });

  it('y la rama que se ejerce es la superficial, no la del error ni la del cero mudo', () => {
    /*
     * Sin esto, la fase de arriba sería verde también si git hubiera reventado por otro
     * motivo: «el sitemap sale sin fechas» es el resultado de las tres ramas. Lo que
     * distingue a ésta es el motivo, y el motivo va escrito en el registro del build.
     * Es exactamente el defecto que tenía la versión anterior de esta prueba, que decía
     * cubrir el checkout superficial y ejercía la rama del error.
     */
    expect(salidaSuperficial).toMatch(/superficial/);
    expect(salidaSuperficial).toMatch(/fetch-depth: 0/);
    // Y la de sin repositorio es la otra: git no contesta, no es que conteste truncado.
    expect(salidaSinRepositorio).toMatch(/no se pudo preguntar a git/);
  });

  it('con historial, cada entrada declara su `lastmod` — salvo la portada', () => {
    expect(primera.size).toBe(sinRepositorio.size);
    const sinFecha = [...primera].filter(([, fecha]) => fecha === undefined).map(([ruta]) => ruta);
    expect(sinFecha).toEqual(['/']);
  });

  it('la portada se anuncia **sin** fecha aunque el historial esté completo', () => {
    // Es la única URL que cambia a diario sin commit —AD-12 rota la Cita del Día—, así que
    // cualquier fecha que el repositorio sepa dar es vieja el día que se publica, y lo sería
    // en la única URL a la que el buscador entra a diario. Se le aplica la regla de la
    // historia: cuando no se sabe la fecha, se omite el campo. Ausencia antes que centinela.
    expect(primera.has('/')).toBe(true);
    expect(primera.get('/')).toBeUndefined();
  });

  it('una Página de Cita lleva la más reciente de su Cita, su Autor y sus Temas', () => {
    /*
     * Historia 22.8 — el chip de cada Tema pinta su nombre, así que renombrar «El tiempo» en
     * el segundo commit cambia el HTML de toda Cita que lo declara —aquí, todas—, y su fecha
     * es la del Tema. Antes la relación del sitemap no lo sabía y la del aviso sí.
     */
    for (const slug of SLUGS) expect(primera.get(`/cita/${slug}`), slug).toBe(SEGUNDO_INSTANTE);
  });

  it('la Página de Tema lleva la de su fichero, que cambió después', () => {
    // Es la prueba de que la fecha es del contenido y no del build: dos superficies del
    // mismo sitio, construidas a la vez, con fechas distintas.
    expect(primera.get('/tema/el-tiempo')).toBe(SEGUNDO_INSTANTE);
    expect(primera.get('/coleccion/frases-cortas')).toBe(PRIMER_INSTANTE);
  });

  it('Historia 24.8 — un commit que solo toca `aptaParaPortada` no fecha ninguna entrada', () => {
    expect([...primera].filter(([, fecha]) => fecha === TERCER_INSTANTE)).toEqual([]);
    expect(primera.get(`/cita/${SLUGS[0]}`)).toBe(SEGUNDO_INSTANTE);
  });

  it('Historia 24.8 — la semblanza solo fecha la Página de Autor, que es la única que la pinta', () => {
    expect([...primera].filter(([, fecha]) => fecha === CUARTO_INSTANTE).map(([ruta]) => ruta)).toEqual([
      '/autor/seneca',
    ]);
  });

  it('Historia 24.8 — una Cita nueva no mueve la fecha de ninguna otra Página de Cita, aunque su HTML cambie', () => {
    // La premisa: la siembra cambió de verdad la navegación de alguna hermana.
    expect(hermanasQueEnlazanLaNueva.length).toBeGreaterThan(0);
    for (const slug of SLUGS) {
      const ruta = rutaNormalizada(rutaDeCita(slug));
      expect(tercera.get(ruta), ruta).toBe(primera.get(ruta));
    }
    expect(tercera.get(rutaNormalizada(rutaDeCita(SLUG_NUEVO)))).toBe(QUINTO_INSTANTE);
    expect(tercera.get('/autor/seneca')).toBe(QUINTO_INSTANTE);
    expect(tercera.get('/tema/el-tiempo')).toBe(QUINTO_INSTANTE);
    // No es miembro de la Colección: su página no cambia.
    expect(tercera.get('/coleccion/frases-cortas')).toBe(primera.get('/coleccion/frases-cortas'));
  });

  it('Historia 24.8 — el aviso del mismo commit nombra exactamente lo que el sitemap refecha, más la portada', () => {
    expect(avisoDeLaSiembra.avisos).toEqual([]);
    expect(avisoDeLaSiembra.rutas).toContain('/');
    const avisadas = avisoDeLaSiembra.rutas.filter((ruta) => ruta !== '/').map(rutaNormalizada).sort();
    const refechadas = [...tercera].filter(([, fecha]) => fecha === QUINTO_INSTANTE).map(([ruta]) => ruta).sort();
    expect(refechadas.length).toBeGreaterThan(2);
    expect(avisadas).toEqual(refechadas);
  });

  it('ninguna fecha es la de hoy: no se ha colado el reloj por ninguna rendija', () => {
    const hoy = new Date().toISOString().slice(0, 10);
    for (const [ruta, fecha] of primera) expect(fecha?.slice(0, 10), ruta).not.toBe(hoy);
  });

  it('dos construcciones del mismo commit dan las mismas fechas', () => {
    expect([...segunda.entries()].sort()).toEqual([...primera.entries()].sort());
  });

  it('la fecha no cambia lo que se anuncia: el conjunto lo sigue decidiendo el filtro', () => {
    /*
     * El `serialize` pone un atributo sobre lo ya anunciado; quien decide qué se anuncia
     * sigue siendo el `filter`. El contraste es contra lo que `src/lib/superficies.ts`
     * declara sobre **este mismo corpus**, y no contra otro sitemap: dos sitemaps que han
     * pasado los dos por el mismo `serialize` no contrastan nada, y menos si además su
     * corpus difiere.
     */
    expect([...primera.keys()].sort()).toEqual(ANUNCIABLES);
    for (const ruta of primera.keys()) expect(anunciableEnElSitemap(ruta), ruta).toBe(true);

    for (const fuera of NO_ANUNCIABLES) {
      expect(anunciableEnElSitemap(fuera), fuera).toBe(false);
      expect(primera.has(fuera), fuera).toBe(false);
    }
  });
});
