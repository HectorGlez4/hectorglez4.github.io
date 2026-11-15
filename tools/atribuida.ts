/**
 * La única orden que cambia una Cita atribuida publicada — Historia 35.6, AD-35.
 *
 *   npm run atribuida -- obra <slug> "<obra>"
 *   npm run atribuida -- autor <slug> <slug-de-autor>
 *   npm run atribuida -- personaje <slug> <slug-de-personaje>
 *   npm run atribuida -- variante <slug> "<texto>" --region <región> --origen <origen>
 *   npm run atribuida -- texto <slug> "<texto>" [--propone <agente> --aprueba <agente>]
 *   npm run atribuida -- texto <slug> "<versión>" --origen <origen> --atestiguacion <url> [--atestiguacion <url>...]
 *   npm run atribuida -- semilla <slug> [--salida semillas/<slug>.json]   (Historia 35.10)
 *   npm run atribuida -- proponer <lote.yaml> [--corpus corpus]          (Historia 35.10)
 *
 * Una atribuida publicada **no se edita a mano**: lo que el esquema no ve —su Ficha de Obra, sus
 * topes, los duplicados entre clases, su clase— lo guarda esta orden (`tools/lib/cambioDeAtribuida.ts`).
 * Con la puerta de la atribuida cerrada (las constantes de Héctor sin valor) toda invocación
 * válida sale con 1 sin escribir.
 *
 * `semilla` y `proponer` son la siembra acotada de la Historia 35.10 (`tools/lib/siembraAtribuida.ts`):
 * solo admiten a los Personajes y Autores de `SEMILLA_DE_ATRIBUIDAS`, que llena Héctor. `semilla` es
 * **la única que pide algo a la red** —la página de BrainyQuote de esa entrada, una sola vez— y escribe
 * fuera de `corpus/`, sin versionar; `proponer` escribe solo en `corpus/_revision/` y nunca publica.
 *
 * Códigos: 2 es la forma de la invocación (suborden desconocida, argumentos de menos o de más,
 * bandera desconocida, repetida, vacía o sin valor, `variante` sin `--region` o `--origen`, `--atestiguacion`
 * sin `--origen`), 1 lo que la
 * invocación dice; en ninguno de los dos se escribe nada, salvo en `proponer`, que escribe en
 * `corpus/_revision/` las candidatas que pasan aunque salga con 1 por las que rechaza (el parte lo dice).
 */

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parsearYaml } from 'yaml';
import { cambiarAtribuida, type CambioDeAtribuida } from './lib/cambioDeAtribuida.ts';
import {
  componerSemilla,
  entradaDeSemilla,
  formatearPropuesta,
  frasesDeLaPagina,
  motivoFueraDeLaSemilla,
  problemasDeLaSemilla,
  proponerAtribuidas,
} from './lib/siembraAtribuida.ts';
import { SEMILLA_DE_ATRIBUIDAS } from '../src/lib/umbrales.ts';
import { fechaLocal, rutasDelCorpus } from './lib/corpus.ts';
import { motivosDeArgumentosNoReconocidos, opcion, raizDeCorpusDe, terminar } from './lib/cli.ts';

const USO = [
  'Uso:',
  '  npm run atribuida -- obra <slug> "<obra>" [--corpus corpus]',
  '  npm run atribuida -- autor <slug> <slug-de-autor>',
  '  npm run atribuida -- personaje <slug> <slug-de-personaje>',
  '  npm run atribuida -- variante <slug> "<texto>" --region <región> --origen <origen>',
  '  npm run atribuida -- texto <slug> "<texto>" [--propone <agente> --aprueba <agente>]',
  '  npm run atribuida -- texto <slug> "<versión>" --origen <origen> --atestiguacion <url> [--atestiguacion <url>...]',
  '  npm run atribuida -- semilla <slug> [--salida semillas/<slug>.json] [--html <página guardada>]',
  '  npm run atribuida -- proponer <lote.yaml> [--corpus corpus]',
  '',
].join('\n');

/**
 * Por suborden: cuántos argumentos sueltos toma tras su nombre, sus banderas con valor y, de ellas,
 * las que se pueden repetir (Historia 35.11: `--atestiguacion`).
 */
const FORMA: Record<string, { sueltos: number; conValor: readonly string[]; repetibles?: readonly string[] }> = {
  obra: { sueltos: 2, conValor: ['--corpus'] },
  autor: { sueltos: 2, conValor: ['--corpus'] },
  personaje: { sueltos: 2, conValor: ['--corpus'] },
  variante: { sueltos: 2, conValor: ['--corpus', '--region', '--origen'] },
  texto: {
    sueltos: 2,
    conValor: ['--corpus', '--origen', '--atestiguacion', '--propone', '--aprueba'],
    repetibles: ['--atestiguacion'],
  },
  semilla: { sueltos: 1, conValor: ['--salida', '--html'] },
  proponer: { sueltos: 1, conValor: ['--corpus'] },
};

const argumentos = process.argv.slice(2);
const orden = argumentos[0];
const forma = orden === undefined || !Object.hasOwn(FORMA, orden) ? undefined : FORMA[orden];

function salirPorLaForma(motivos: string[]): never {
  process.stderr.write(`${motivos.join('\n')}\n\n${USO}`);
  process.exit(2);
}

if (forma === undefined) {
  salirPorLaForma([orden === undefined ? 'Falta la suborden.' : `«${orden}» no es una suborden de npm run atribuida.`]);
}

// Los sueltos se cuentan por posición: lo que sigue a una bandera con valor es suyo.
const sueltos: string[] = [];
for (let i = 1; i < argumentos.length; i += 1) {
  const actual = argumentos[i];
  if (forma.conValor.includes(actual)) {
    i += 1;
    continue;
  }
  if (!actual.startsWith('--')) sueltos.push(actual);
}
const noReconocidos = motivosDeArgumentosNoReconocidos(argumentos, {
  solas: [orden, ...sueltos],
  conValor: forma.conValor,
});
if (sueltos.length > forma.sueltos) {
  noReconocidos.push(`«${sueltos[forma.sueltos]}» sobra: ${orden} toma ${forma.sueltos} argumentos sueltos.`);
}
if (sueltos.length < forma.sueltos) noReconocidos.push(`Faltan argumentos: ${orden} toma ${forma.sueltos}.`);
for (const bandera of forma.conValor) {
  if (forma.repetibles?.includes(bandera)) continue;
  if (argumentos.filter((a) => a === bandera).length > 1) noReconocidos.push(`«${bandera}» está repetida.`);
}
// Historia 35.11 — las atestiguaciones son de la versión que sustituye: van con su origen.
if (orden === 'texto' && argumentos.includes('--atestiguacion') && !argumentos.includes('--origen')) {
  noReconocidos.push('«--atestiguacion» va con «--origen»: son las de la versión que sustituye a la traducción propia.');
}
/** Los valores de una bandera repetible, en orden. */
const valoresDe = (bandera: string): string[] =>
  argumentos.flatMap((a, i) => (a === bandera && argumentos[i + 1] !== undefined && !argumentos[i + 1]!.startsWith('--') ? [argumentos[i + 1]!] : []));
for (const bandera of forma.repetibles ?? []) {
  if (valoresDe(bandera).some((v) => v.trim() === '')) noReconocidos.push(`«${bandera}» va vacía.`);
}
if (orden === 'variante') {
  for (const bandera of ['--region', '--origen']) {
    if (!argumentos.includes(bandera)) noReconocidos.push(`Falta «${bandera}»: la Variante declara su región y su origen.`);
  }
}
for (const bandera of forma.conValor) {
  if (opcion(argumentos, bandera) === '') noReconocidos.push(`«${bandera}» va vacía.`);
  // Dada sin valor —la última, o seguida de otra bandera—: es la forma, no lo que dice.
  else if (argumentos.includes(bandera) && opcion(argumentos, bandera) === undefined) {
    noReconocidos.push(`«${bandera}» va sin valor.`);
  }
}
for (const [i, suelto] of sueltos.entries()) {
  if (suelto.trim() === '') noReconocidos.push(`El argumento ${i + 1} va vacío.`);
}
if (noReconocidos.length > 0) salirPorLaForma(noReconocidos);

if (orden === 'semilla') await semilla(sueltos[0]);
if (orden === 'proponer') await proponer(sueltos[0]);

const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));
const [slug, valor] = sueltos;

const cambio: CambioDeAtribuida =
  orden === 'obra'
    ? { tipo: 'obra', slug, obra: valor }
    : orden === 'autor'
      ? { tipo: 'autor', slug, autor: valor }
      : orden === 'personaje'
        ? { tipo: 'personaje', slug, personaje: valor }
        : orden === 'variante'
          ? {
              tipo: 'variante',
              slug,
              texto: valor,
              region: opcion(argumentos, '--region') ?? '',
              origen: opcion(argumentos, '--origen') ?? '',
            }
          : {
              tipo: 'texto',
              slug,
              texto: valor,
              // Historia 35.11 — la sustitución de la traducción propia, o su retraducción.
              ...(opcion(argumentos, '--origen') !== undefined ? { origen: opcion(argumentos, '--origen')! } : {}),
              ...(argumentos.includes('--atestiguacion') ? { atestiguaciones: valoresDe('--atestiguacion') } : {}),
              ...(argumentos.includes('--propone') || argumentos.includes('--aprueba')
                ? {
                    agentes: {
                      ...(opcion(argumentos, '--propone') !== undefined ? { propone: opcion(argumentos, '--propone')! } : {}),
                      ...(opcion(argumentos, '--aprueba') !== undefined ? { aprueba: opcion(argumentos, '--aprueba')! } : {}),
                    },
                  }
                : {}),
            };

terminar(await cambiarAtribuida(rutas, cambio));

/**
 * La semilla de prueba — Historia 35.10, AD-22: pide **una sola vez** la página de BrainyQuote que la
 * lista declara para `slug` y escribe, fuera de `corpus/` y sin versionar, sus frases en inglés y quién
 * las dice. Todo lo que no necesita la red se comprueba antes de pedirla.
 */
async function semilla(slug: string): Promise<never> {
  const problemas = problemasDeLaSemilla(SEMILLA_DE_ATRIBUIDAS);
  if (problemas.length > 0) terminar({ ok: false, motivos: ['La semilla de prueba no se sostiene; no se ha pedido nada.', ...problemas] });
  const entrada = entradaDeSemilla(slug, SEMILLA_DE_ATRIBUIDAS);
  if (entrada === undefined) terminar({ ok: false, motivos: [motivoFueraDeLaSemilla(slug, SEMILLA_DE_ATRIBUIDAS), 'No se ha pedido nada.'] });

  // Las rutas se juzgan contra la raíz del proyecto —la de esta orden—, no contra el directorio de trabajo.
  const proyecto = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const semillas = join(proyecto, 'semillas');
  // Una `--salida` relativa se lee contra la raíz del proyecto, como la de por omisión.
  const salida = resolve(proyecto, opcion(argumentos, '--salida') ?? join(semillas, `${slug}.json`));
  if (extname(salida).toLowerCase() !== '.json') {
    terminar({ ok: false, motivos: [`«${salida}» no es un fichero .json. No se ha pedido nada.`] });
  }
  if (dentroDe(join(proyecto, 'corpus'), salida)) {
    terminar({
      ok: false,
      motivos: [`«${salida}» está dentro de corpus/: la semilla no se versiona ni es contenido. No se ha pedido nada.`],
    });
  }
  // Dentro del repositorio, solo en semillas/, que git ignora: en otro sitio se podría versionar.
  if (dentroDe(proyecto, salida) && !dentroDe(semillas, salida)) {
    terminar({
      ok: false,
      motivos: [
        `«${salida}» está en el repositorio fuera de semillas/: la semilla no se versiona, y solo semillas/ está ` +
          'ignorado. No se ha pedido nada.',
      ],
    });
  }
  const yaDescargada = existsSync(salida) ? salida : await semillaYaDescargada(semillas, entrada.pagina);
  if (yaDescargada !== undefined) {
    terminar({
      ok: false,
      motivos: [
        `La semilla de «${slug}» ya se descargó en ${yaDescargada}: la página se pide una sola vez, y no se ha pedido de nuevo.`,
      ],
    });
  }

  let html: string;
  /*
   * `--html`: la página ya abierta en un navegador y guardada. BrainyQuote responde 403 a una petición
   * que no viene de un navegador, y la orden no se disfraza de uno: lee lo que una persona abrió.
   */
  const guardada = opcion(argumentos, '--html');
  if (guardada !== undefined) {
    try {
      html = await readFile(resolve(guardada), 'utf8');
    } catch (fallo) {
      terminar({
        ok: false,
        motivos: [`No se pudo leer «${guardada}»: ${fallo instanceof Error ? fallo.message : String(fallo)}. No se ha escrito nada.`],
      });
    }
  } else try {
    const respuesta = await fetch(entrada.pagina, {
      redirect: 'manual',
      // Treinta segundos: una página, una vez.
      signal: AbortSignal.timeout(30_000),
      headers: { 'user-agent': 'SabiduriaDeBolsillo/semilla (prueba acotada, FR-68)', accept: 'text/html' },
    });
    if (respuesta.status !== 200) {
      terminar({ ok: false, motivos: [`«${entrada.pagina}» respondió ${respuesta.status}. No se ha escrito nada.`] });
    }
    const tipo = (respuesta.headers.get('content-type') ?? '').toLowerCase();
    if (!tipo.startsWith('text/html') && !tipo.startsWith('application/xhtml+xml')) {
      terminar({ ok: false, motivos: [`«${entrada.pagina}» no devolvió HTML sino «${tipo || 'sin tipo declarado'}». No se ha escrito nada.`] });
    }
    html = await respuesta.text();
  } catch (fallo) {
    terminar({
      ok: false,
      motivos: [`No se pudo pedir «${entrada.pagina}»: ${fallo instanceof Error ? fallo.message : String(fallo)}. No se ha escrito nada.`],
    });
  }

  const frases = frasesDeLaPagina(html);
  if (frases.length === 0) {
    terminar({ ok: false, motivos: [`En «${entrada.pagina}» no se reconoce ninguna frase con quién la dice. No se ha escrito nada.`] });
  }
  // La jornada local, como la del registro de sesiones.
  const hoy = fechaLocal(new Date());
  try {
    await mkdir(dirname(salida), { recursive: true });
    await writeFile(salida, `${JSON.stringify(componerSemilla(entrada, hoy, frases), null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  } catch (fallo) {
    const codigo = (fallo as { code?: unknown }).code;
    terminar({
      ok: false,
      motivos: [
        codigo === 'EEXIST'
          ? `${salida} apareció mientras se pedía la página: no se ha reescrito («una sola vez»).`
          : `No se pudo escribir ${salida}: ${fallo instanceof Error ? fallo.message : String(fallo)}.`,
        'La página ya se pidió; no se ha escrito nada.',
      ],
    });
  }
  terminar({
    ok: true,
    ruta: salida,
    mensaje: [
      `Semilla de «${slug}»: ${frases.length} frases en inglés en ${salida}.`,
      'No se versiona, no se publica y no atestigua nada. El lote de candidatas se escribe en español, con la',
      'versión que circula y su origen —o, como último recurso si no circula ninguna, la traducción del sitio',
      'con «origen: traduccion-propia» y la frase de aquí en «partida» ({texto, lengua: en})—, y se propone con',
      '«npm run atribuida -- proponer <lote.yaml>».',
    ].join('\n'),
  });
}

/** Si `ruta` es `base` o cuelga de ella (segmento a segmento; sin distinguir mayúsculas donde el disco no lo hace). */
function dentroDe(base: string, ruta: string): boolean {
  const plegar = (p: string) => (process.platform === 'darwin' || process.platform === 'win32' ? p.toLowerCase() : p);
  const rel = relative(plegar(base), plegar(ruta));
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

/** El fichero de `semillas/` que ya guarda la página, si lo hay: la página se pide una sola vez, sea cual sea el nombre. */
async function semillaYaDescargada(semillas: string, pagina: string): Promise<string | undefined> {
  let nombres: string[];
  try {
    nombres = await readdir(semillas);
  } catch {
    return undefined;
  }
  for (const nombre of nombres.filter((n) => extname(n).toLowerCase() === '.json')) {
    try {
      const leida = JSON.parse(await readFile(join(semillas, nombre), 'utf8')) as { pagina?: unknown };
      if (leida?.pagina === pagina) return join(semillas, nombre);
    } catch {
      // Un fichero que no se deja leer no dice nada de esta página.
    }
  }
  return undefined;
}

/** La propuesta — Historia 35.10: el lote a `corpus/_revision/`, nunca a `corpus/citas/`. */
async function proponer(fichero: string): Promise<never> {
  let lote: unknown;
  try {
    lote = parsearYaml(await readFile(fichero, 'utf8'));
  } catch (fallo) {
    salirPorLaForma([`No se pudo leer el lote «${fichero}»: ${fallo instanceof Error ? fallo.message : String(fallo)}`]);
  }
  if (!Array.isArray(lote) || lote.length === 0) {
    salirPorLaForma([`El lote «${fichero}» tiene que ser una lista YAML de candidatas, con al menos una.`]);
  }
  const resultado = await proponerAtribuidas(rutasDelCorpus(raizDeCorpusDe(argumentos)), lote);
  if (!resultado.ok) terminar(resultado);
  const parte = formatearPropuesta(resultado);
  if (resultado.rechazadas.length > 0) terminar({ ok: false, motivos: [parte] });
  terminar({ ok: true, ruta: resultado.escritas[0]?.ruta ?? '', mensaje: parte });
}
