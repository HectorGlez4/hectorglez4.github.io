/**
 * La clase de cada Cita, puesta como puerta del build — Historia 35.1, AD-1, AD-32.
 *
 * El esquema juzga cada Cita sola. Esta integración juzga las relaciones con
 * `fallosDeClases` (`tools/lib/clases.ts`): que toda Cita publicada esté en
 * `corpus/clases-de-cita.yml` con su clase, que ningún slug tenga dos, que la de siempre sea de
 * un Autor de dominio público y la atribuida de un dueño con derechos vigentes. Desde la 35.7
 * compara además cada atribuida con `corpus/formas-vedadas.yml`. Lee los dos registros solo para
 * romper: ningún byte de `dist/` sale de ellos. Desde la 35.11 lee también
 * `corpus/aprobaciones-de-atribuidas.yml`, solo para romper: toda traducción propia publicada
 * tiene su aprobación de dos agentes, posterior al último cambio de su texto (`fallosDeAprobaciones`
 * de `tools/lib/aprobaciones.ts`). Solo si hay alguna traducción propia publicada le pregunta a git
 * (`integraciones/historial.ts`); sin historial fiable comprueba solo la existencia y los dos
 * agentes, y avisa con el motivo.
 *
 * Como las claves de orden (`integraciones/claves.ts`): rompe en `astro:build:start` y solo
 * avisa en `astro dev`.
 */

import { fileURLToPath } from 'node:url';
import { basename, dirname, join } from 'node:path';
import { realpath } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AstroIntegration } from 'astro';
import {
  leerAutores,
  leerCitas,
  leerFichasDeObra,
  leerRegistroDeClases,
  rutasDelCorpus,
} from '../tools/lib/corpus.ts';
import { fallosDeClases } from '../tools/lib/clases.ts';
import { fallosDeAtribuidas, lineaDelBuild, textoDeVariante } from '../tools/lib/atribuidas.ts';
import { claseDe, esAtribuida, ORIGEN_TRADUCCION_PROPIA } from '../src/lib/clase.ts';
import { leerFormasVedadas } from '../tools/lib/formasVedadas.ts';
import {
  fallosDeAprobaciones,
  leerAprobaciones,
  type AprobacionConInstante,
  type AprobacionRegistrada,
  type Instante,
  type TraduccionPublicada,
} from '../tools/lib/aprobaciones.ts';
import { cambiaronLosCampos, VERSION_OPACA, type TransicionFechada } from '../tools/lib/cambios.ts';
import { estadoDelRepositorio, historialDeLosFicheros } from './historial.ts';

/** La ruta relativa a la raíz, con barras `/`, que es como se teclea. */
function relativaALaRaiz(raiz: string, ruta: string): string {
  const conBarras = (texto: string) => texto.split('\\').join('/');
  const prefijo = conBarras(raiz).replace(/\/$/, '');
  const normalizada = conBarras(ruta);
  return normalizada.startsWith(`${prefijo}/`) ? normalizada.slice(prefijo.length + 1) : normalizada;
}

const ejecutarGit = (cwd: string, args: string[]) => promisify(execFile)('git', args, { cwd });

/** Una traducción propia publicada, leída del disco. */
interface PropiaEnDisco {
  slug: string;
  ruta: string;
  texto: string;
}

const instanteDe = (t: TransicionFechada): number => Date.parse(t.fecha);

/**
 * Los instantes de la puerta del registro de aprobaciones — Historia 35.11. El del texto de cada
 * traducción propia: la última transición de su fichero que cambió `texto` (el alta cuenta), o «sin
 * commitear» si el `texto` del disco no es el de `HEAD` o el fichero no está en `HEAD`. El de cada
 * entrada *i* del registro: la primera versión del registro con más de *i* entradas (solo añade), o
 * «sin commitear» si `HEAD` no la tiene. Sin historial fiable, `motivo` y ningún instante.
 */
export async function instantesDeLasAprobaciones(
  raiz: string,
  registro: string,
  propias: readonly PropiaEnDisco[],
  entradas: readonly AprobacionRegistrada[],
): Promise<{ textos: Map<string, Instante>; entradas: (Instante | undefined)[] } | { motivo: string }> {
  const estado = await estadoDelRepositorio(raiz);
  if (estado.tope === undefined) return { motivo: estado.motivo ?? 'git no contestó' };
  const fisica = async (ruta: string) => {
    try {
      return await realpath(ruta);
    } catch {
      // Un registro que aún no existe en disco: su ruta física es la de su directorio.
      return join(await realpath(dirname(ruta)), basename(ruta));
    }
  };
  const rutaDelRegistro = await fisica(registro);
  const rutasDeLasPropias = await Promise.all(propias.map((p) => fisica(p.ruta)));
  let historial: Map<string, TransicionFechada[]>;
  try {
    historial = await historialDeLosFicheros(estado.tope, [...rutasDeLasPropias, rutaDelRegistro]);
  } catch (fallo) {
    // Un repositorio sin ningún commit no tiene historial que leer: todo está sin commitear.
    const sinCommits = await ejecutarGit(estado.tope, ['rev-parse', '--verify', '-q', 'HEAD']).then(
      () => false,
      () => true,
    );
    if (!sinCommits) {
      return { motivo: `no se pudo leer el historial de git — ${fallo instanceof Error ? fallo.message : String(fallo)}` };
    }
    historial = new Map();
  }
  const recientes = (ruta: string) => [...(historial.get(ruta) ?? [])].sort((a, b) => instanteDe(b) - instanteDe(a));

  const textos = new Map<string, Instante>();
  propias.forEach((propia, i) => {
    const transiciones = recientes(rutasDeLasPropias[i] as string);
    const enHead = transiciones[0]?.despues;
    if (enHead === undefined || enHead === null || enHead === VERSION_OPACA || enHead.texto !== propia.texto) {
      textos.set(propia.slug, 'sin-commitear');
      return;
    }
    const ultimo = transiciones.find((t) => cambiaronLosCampos(t, ['texto']));
    textos.set(propia.slug, ultimo === undefined ? 'sin-commitear' : instanteDe(ultimo));
  });

  const cuantas = (t: TransicionFechada) => {
    const v = t.despues;
    if (v === null || v === VERSION_OPACA) return 0;
    const lista = (v as Record<string, unknown>).aprobaciones;
    return Array.isArray(lista) ? lista.length : 0;
  };
  const delRegistro = recientes(rutaDelRegistro).reverse();
  const enHead = delRegistro.length === 0 ? 0 : cuantas(delRegistro[delRegistro.length - 1] as TransicionFechada);
  const instantes = entradas.map((_, i): Instante | undefined => {
    if (i >= enHead) return 'sin-commitear';
    const primera = delRegistro.find((t) => cuantas(t) > i);
    return primera === undefined ? 'sin-commitear' : instanteDe(primera);
  });
  return { textos, entradas: instantes };
}

export default function clasesDeCita(): AstroIntegration {
  let raiz = process.cwd();

  async function revisar(): Promise<{ fallos: string[]; avisos: string[] }> {
    const rutas = rutasDelCorpus(join(raiz, 'corpus'));
    // Historia 35.7 — `corpus/formas-vedadas.yml` se lee solo para romper: ilegible, rompe; y desde
    // la 35.11, `corpus/aprobaciones-de-atribuidas.yml`, igual.
    const [autores, citas, registro, fichas, vedadas, aprobaciones] = await Promise.all([
      leerAutores(rutas),
      leerCitas(rutas.citas),
      leerRegistroDeClases(rutas),
      leerFichasDeObra(rutas),
      leerFormasVedadas(rutas),
      leerAprobaciones(rutas),
    ]);
    const deClases = fallosDeClases(
      citas.map((c) => ({
        slug: c.slug,
        ruta: relativaALaRaiz(raiz, c.ruta),
        autor: c.autor,
        // La clase la lee `esAtribuida`, su único lector; la de siempre no lleva el campo.
        ...(esAtribuida(c) ? { clase: claseDe(c) } : {}),
        ...(c.personaje !== undefined ? { personaje: c.personaje } : {}),
      })),
      autores.map((a) => ({
        slug: a.slug,
        ruta: relativaALaRaiz(raiz, a.ruta),
        vivo: a.vivo,
        añoFallecimiento: a.añoFallecimiento,
      })),
      registro,
    );
    /*
     * Historia 35.1b — la puerta de la atribuida: con alguna de sus cinco constantes sin valor,
     * cada atribuida de corpus/citas/ rompe nombrándolas; con todas, sus topes, la figura sin
     * Obra y los duplicados entre clases, contra lo versionado (`tools/lib/atribuidas.ts`).
     */
    const deAtribuidas = fallosDeAtribuidas({
      citas: citas.map((c) => ({
        slug: c.slug,
        ruta: relativaALaRaiz(raiz, c.ruta),
        texto: c.texto,
        ...(c.autor !== undefined ? { autor: c.autor } : {}),
        ...(c.personaje !== undefined ? { personaje: c.personaje } : {}),
        ...(esAtribuida(c) ? { clase: claseDe(c) } : {}),
        ...(c.procedencia !== undefined ? { procedencia: c.procedencia } : {}),
        // Historia 35.6 — la Variante cuenta para el tope y para los duplicados entre clases.
        ...(textoDeVariante(c) !== undefined ? { variante: textoDeVariante(c) } : {}),
      })),
      autores,
      // Con su ruta relativa a la raíz: el fallo de un tope por Obra nombra el fichero de la ficha.
      fichas: fichas.map((f) => ({ ...f, ruta: relativaALaRaiz(raiz, f.ruta) })),
      // Historia 35.7 — la comparación con las formas vedadas, contra lo versionado (AD-32).
      vedadas,
    }).map(lineaDelBuild);

    /*
     * Historia 35.11 — la doble aprobación de la traducción propia. Sin ninguna publicada, no se
     * pregunta a git: con el Corpus real (sin atribuidas) el build no gasta ni un proceso.
     */
    const propias: PropiaEnDisco[] = citas
      .filter((c) => esAtribuida(c) && c.origen === ORIGEN_TRADUCCION_PROPIA)
      .map((c) => ({ slug: c.slug, ruta: c.ruta, texto: c.texto }));
    const avisos: string[] = [];
    let deAprobaciones: string[] = [];
    if (propias.length > 0) {
      const instantes = await instantesDeLasAprobaciones(raiz, rutas.aprobacionesDeAtribuidas, propias, aprobaciones);
      const conHistorial = !('motivo' in instantes);
      if (!conHistorial) {
        avisos.push(
          `Aprobaciones de la traducción propia: solo se comprueba que cada una tenga su aprobación de dos ` +
            `agentes, no que sea posterior a su último cambio de texto — ${instantes.motivo}.`,
        );
      }
      const traducciones: TraduccionPublicada[] = propias.map((p) => ({
        slug: p.slug,
        ruta: relativaALaRaiz(raiz, p.ruta),
        ...(conHistorial ? { texto: instantes.textos.get(p.slug) as Instante } : {}),
      }));
      const entradas: AprobacionConInstante[] = aprobaciones.map((entrada, i) => {
        const instante = conHistorial ? instantes.entradas[i] : undefined;
        return { entrada, ...(instante !== undefined ? { instante } : {}) };
      });
      deAprobaciones = fallosDeAprobaciones(traducciones, entradas);
    }
    return { fallos: [...deClases, ...deAtribuidas, ...deAprobaciones], avisos };
  }

  const titular = (n: number) =>
    `Clases de Cita: ${n} ${n === 1 ? 'desacuerdo' : 'desacuerdos'} entre las Citas, sus Autores, ` +
    'corpus/clases-de-cita.yml y la puerta de la atribuida (sus constantes, sus topes, sus Fichas de Obra, corpus/formas-vedadas.yml, corpus/aprobaciones-de-atribuidas.yml). Toda Cita publicada está registrada con su clase, la de siempre es de ' +
    'dominio público y la atribuida de un dueño con derechos vigentes, por su puerta y dentro de sus topes.';

  return {
    name: 'clases-de-cita',
    hooks: {
      'astro:config:setup': ({ config }) => {
        raiz = fileURLToPath(config.root);
      },

      'astro:build:start': async ({ logger }) => {
        const { fallos, avisos } = await revisar();
        for (const aviso of avisos) logger.warn(aviso);
        if (fallos.length === 0) return;
        logger.error(`\n${fallos.join('\n')}\n`);
        throw new Error(titular(fallos.length));
      },

      'astro:server:setup': async ({ logger }) => {
        let fallos: string[];
        try {
          const revisado = await revisar();
          for (const aviso of revisado.avisos) logger.warn(aviso);
          fallos = revisado.fallos;
        } catch (error) {
          logger.warn(`Clases de Cita: no se pudo leer el Corpus (${error instanceof Error ? error.message : String(error)}).`);
          return;
        }
        if (fallos.length === 0) return;
        logger.warn(`\n${fallos.join('\n')}\nEl build no dejará publicar esto: ${titular(fallos.length)}\n`);
      },
    },
  };
}
