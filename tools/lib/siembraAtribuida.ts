/**
 * La siembra acotada de la Cita atribuida — Historia 35.10, FR-68 (§5 enmendado), AD-22.
 *
 * Dos pasos, y ninguno publica:
 *
 *   · **La semilla** (`npm run atribuida -- semilla <slug>`): la cáscara (`tools/atribuida.ts`)
 *     pide una sola vez la página de BrainyQuote que `SEMILLA_DE_ATRIBUIDAS` declara para ese
 *     Personaje o Autor, y aquí se lee —sin red— la lista en inglés de frases y quién las dice.
 *     Se escribe fuera de `corpus/` y sin versionar (`semillas/`): es una lista de trabajo, no
 *     se publica y no atestigua nada (`DOMINIOS_QUE_NO_ATESTIGUAN`).
 *   · **La propuesta** (`npm run atribuida -- proponer <lote.yaml>`): un lote de candidatas **en
 *     español** —la versión que ya circula, de un doblaje o de una traducción publicada, con su
 *     `origen`; el sitio no traduce—, cada una con su Personaje o su Autor, su Obra si consta y sus
 *     atestiguaciones. Las que pasan van a `corpus/_revision/`, nunca a `corpus/citas/`: aprobarlas
 *     es siempre de una persona, con `revisar --aprobar`.
 *
 * La semilla es de prueba: solo admite a los de la lista, que llena Héctor; la siembra a escala
 * —una búsqueda abierta— no empieza hasta la pregunta 18. Puro salvo la lectura del Corpus y la
 * escritura en `corpus/_revision/`: la red vive solo en la cáscara.
 */

import { citaAdmisible, motivoDeAtestiguacionesEscasas } from '../../src/lib/admision.ts';
import { dominiosQueAtestiguan } from '../../src/lib/atestiguaciones.ts';
import { CLASE_ATRIBUIDA, claseQueCorresponde, esAtribuida, claseDe } from '../../src/lib/clase.ts';
import { slugDeCita, slugLibre } from '../../src/lib/slug.ts';
import {
  MIN_ATESTIGUACIONES_DE_ATRIBUIDA,
  SEMILLA_DE_ATRIBUIDAS,
  type EntradaDeSemilla,
} from '../../src/lib/umbrales.ts';
import { rm } from 'node:fs/promises';
import { fallosDeDuplicados, textoDeVariante, type CitaParaAtribuidas } from './atribuidas.ts';
import { MOTIVO_CLASE_TECLEADA, slugsConOtraClase } from './clases.ts';
import {
  escribirCita,
  leerAutores,
  leerCitas,
  leerPersonajes,
  leerRegistroDeClases,
  leerTemas,
  nombreDeFicheroDeCita,
  type Rutas,
} from './corpus.ts';
import { leerFormasVedadas } from './formasVedadas.ts';
import { resolverFichaDeObra } from './obras.ts';

/** Por qué no hay siembra a escala: se dice en cada rechazo de la semilla. */
export const MOTIVO_SIN_ESCALA =
  'No hay búsqueda abierta: la siembra a escala de la atribuida no empieza hasta la respuesta de la ' +
  'pregunta 18 (FR-68), y generalizar la semilla es otra decisión de Héctor.';

const FORMA_DE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/** Si un anfitrión es BrainyQuote: `brainyquote.com` o `www.brainyquote.com`, y ningún otro subdominio. */
function esDeBrainyQuote(host: string): boolean {
  return host === 'brainyquote.com' || host === 'www.brainyquote.com';
}

/**
 * Lo que no se sostiene de la lista de la semilla: un slug sin forma de slug o repetido, una página
 * que no es `https://` de BrainyQuote. Vacía si vale.
 */
export function problemasDeLaSemilla(semilla: readonly EntradaDeSemilla[]): string[] {
  const problemas: string[] = [];
  const vistos = new Set<string>();
  for (const [i, entrada] of semilla.entries()) {
    const donde = `SEMILLA_DE_ATRIBUIDAS[${i}]`;
    if (typeof entrada?.slug !== 'string' || !FORMA_DE_SLUG.test(entrada.slug)) {
      problemas.push(`${donde}: «${String(entrada?.slug)}» no tiene forma de slug.`);
    } else if (vistos.has(entrada.slug)) {
      problemas.push(`${donde}: «${entrada.slug}» está repetido.`);
    } else {
      vistos.add(entrada.slug);
    }
    let valida = false;
    try {
      const url = new URL(String(entrada?.pagina));
      // Una página y nada más: sin puerto, sin consulta ni fragmento, sin credenciales.
      valida =
        url.protocol === 'https:' &&
        esDeBrainyQuote(url.hostname) &&
        url.port === '' &&
        url.search === '' &&
        url.hash === '' &&
        url.username === '' &&
        url.password === '';
    } catch {
      valida = false;
    }
    if (!valida) problemas.push(`${donde}: la página «${String(entrada?.pagina)}» no es una dirección https:// de brainyquote.com (o www.), sin puerto, consulta ni fragmento.`);
  }
  return problemas;
}

/** Por qué un Personaje o Autor no se admite: fuera de la semilla de prueba, o la semilla vacía. */
export function motivoFueraDeLaSemilla(slug: string, semilla: readonly EntradaDeSemilla[]): string {
  return (
    (semilla.length === 0
      ? `«${slug}» no está en la semilla de prueba: SEMILLA_DE_ATRIBUIDAS (src/lib/umbrales.ts) está vacía, y la llena Héctor. `
      : `«${slug}» no está en la semilla de prueba (SEMILLA_DE_ATRIBUIDAS, src/lib/umbrales.ts). `) + MOTIVO_SIN_ESCALA
  );
}

/** La entrada de la semilla de un slug, o `undefined`. */
export function entradaDeSemilla(slug: string, semilla: readonly EntradaDeSemilla[]): EntradaDeSemilla | undefined {
  return semilla.find((e) => e.slug === slug);
}

/** Una frase de la semilla: el texto en inglés y quién la dice, tal como lo pinta la página. */
export interface FraseDeLaSemilla {
  frase: string;
  quien: string;
}

const ENTIDADES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '\u2019',
  lsquo: '\u2018',
  rdquo: '\u201d',
  ldquo: '\u201c',
  mdash: '\u2014',
  ndash: '\u2013',
  hellip: '\u2026',
};

/** Un punto de código de una entidad numérica, o la entidad tal cual si no es Unicode (`fromCodePoint` lanzaría). */
function puntoDeCodigo(codigo: number, todo: string): string {
  return Number.isFinite(codigo) && codigo >= 0 && codigo <= 0x10ffff ? String.fromCodePoint(codigo) : todo;
}

/** El texto de un fragmento de HTML: sin etiquetas, con las entidades leídas y los blancos colapsados. */
function textoDe(html: string): string {
  return html
    .replace(/<[^>]*>/gu, ' ')
    .replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+[0-9]*);/giu, (todo, nombre: string) => {
      const n = nombre.toLowerCase();
      if (n.startsWith('#x')) return puntoDeCodigo(Number.parseInt(n.slice(2), 16), todo);
      if (n.startsWith('#')) return puntoDeCodigo(Number.parseInt(n.slice(1), 10), todo);
      return ENTIDADES[n] ?? todo;
    })
    .replace(/\s+/gu, ' ')
    .trim();
}

/**
 * Las frases de una página de BrainyQuote, en el orden de la página — `[ASSUMPTION]`: cada frase es
 * un enlace con `title="view quote"` y quién la dice, el siguiente con `title="view author"`. Una
 * frase sin quién se descarta, y un par repetido sale una vez. Vacía si la página no se reconoce.
 */
export function frasesDeLaPagina(html: string): FraseDeLaSemilla[] {
  const frases: FraseDeLaSemilla[] = [];
  let pendiente: string | undefined;
  const vistos = new Set<string>();
  for (const enlace of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/giu)) {
    const titulo = /\btitle\s*=\s*["']([^"']*)["']/iu.exec(enlace[1])?.[1].trim().toLowerCase();
    const texto = textoDe(enlace[2]);
    if (texto === '') continue;
    if (titulo === 'view quote') {
      pendiente = texto;
    } else if (titulo === 'view author' && pendiente !== undefined) {
      const clave = `${pendiente}\u0000${texto}`;
      if (!vistos.has(clave)) {
        vistos.add(clave);
        frases.push({ frase: pendiente, quien: texto });
      }
      pendiente = undefined;
    }
  }
  return frases;
}

/** Lo que se escribe en `semillas/{slug}.json`. */
export interface SemillaDescargada {
  slug: string;
  pagina: string;
  descargadaEl: string;
  aviso: string;
  frases: FraseDeLaSemilla[];
}

export function componerSemilla(entrada: EntradaDeSemilla, descargadaEl: string, frases: FraseDeLaSemilla[]): SemillaDescargada {
  return {
    slug: entrada.slug,
    pagina: entrada.pagina,
    descargadaEl,
    aviso:
      'Semilla de prueba de la Cita atribuida (FR-68): lista de trabajo en inglés, sin versionar. ' +
      'No se publica ni atestigua nada; el texto en español sale de una versión que ya circula.',
    frases,
  };
}

/** Las opciones de la propuesta: la semilla y el mínimo de dominios; por omisión, los del árbol. */
export interface OpcionesDePropuesta {
  semilla?: readonly EntradaDeSemilla[];
  /** `null` fuerza «sin valor» aunque el árbol lo tenga. */
  minAtestiguaciones?: number | null;
}

export interface CandidataEscrita {
  indice: number;
  slug: string;
  ruta: string;
  dominios: string[];
  /** Sin `MIN_ATESTIGUACIONES_DE_ATRIBUIDA`, sus dominios no se juzgaron contra ningún mínimo. */
  sinJuzgarMinimo: boolean;
}

export interface CandidataRechazada {
  indice: number;
  texto: string;
  motivos: string[];
}

export type ResultadoDePropuesta =
  | { ok: true; escritas: CandidataEscrita[]; rechazadas: CandidataRechazada[] }
  | { ok: false; motivos: string[] };

const MOTIVO_SIN_ESPAÑOL =
  'sin versión en español que circule: falta «texto». La semilla está en inglés y el sitio no traduce; ' +
  'una frase sin doblaje ni traducción publicada no entra (FR-68).';

/**
 * Los campos que admite una entrada del lote. Lo demás se rechaza nombrándolo: una errata
 * (`atestiguacion:`) o un campo que no decide el lote —el `slug`, `estadoDerechos`, `aptaParaPortada`,
 * que es curación— no se descarta en silencio. `clase` tiene su propio motivo.
 */
const CAMPOS_DEL_LOTE = new Set([
  'texto',
  'personaje',
  'autor',
  'temas',
  'obra',
  'año',
  'referencia',
  'atestiguaciones',
  'origen',
  'variante',
]);

const MOTIVO_SIN_DUEÑO = 'sin Personaje ni Autor: lo que llega sin ninguno de los dos no se publica (FR-68).';

/**
 * Propone un lote de candidatas atribuidas: juzga cada una y escribe en `corpus/_revision/` las que
 * pasan. Con alguna constante sin valor la puerta sigue cerrada, y da igual: aquí no se publica nada.
 * Con el lote rechazado entero, no se escribe nada.
 */
export async function proponerAtribuidas(
  rutas: Rutas,
  lote: readonly unknown[],
  opciones: OpcionesDePropuesta = {},
): Promise<ResultadoDePropuesta> {
  const semilla = opciones.semilla ?? SEMILLA_DE_ATRIBUIDAS;
  const minimo =
    opciones.minAtestiguaciones === null ? undefined : (opciones.minAtestiguaciones ?? MIN_ATESTIGUACIONES_DE_ATRIBUIDA);

  const problemas = problemasDeLaSemilla(semilla);
  if (problemas.length > 0) {
    return { ok: false, motivos: ['La semilla de prueba no se sostiene; no se ha escrito nada.', ...problemas] };
  }
  if (semilla.length === 0) {
    return {
      ok: false,
      motivos: [
        'La semilla de prueba está vacía: SEMILLA_DE_ATRIBUIDAS (src/lib/umbrales.ts) la llena Héctor. ' +
          'No se ha escrito nada.',
        MOTIVO_SIN_ESCALA,
      ],
    };
  }
  const enLaSemilla = new Set(semilla.map((e) => e.slug));

  // Todo se lee antes de escribir nada: un registro ilegible niega la pasada entera.
  let autores, personajes, temas, publicadas, enRevision, registro, vedadas;
  try {
    autores = await leerAutores(rutas);
    personajes = await leerPersonajes(rutas);
    temas = await leerTemas(rutas);
    publicadas = await leerCitas(rutas.citas);
    enRevision = await leerCitas(rutas.revision);
    registro = await leerRegistroDeClases(rutas);
    vedadas = await leerFormasVedadas(rutas);
  } catch (fallo) {
    return {
      ok: false,
      motivos: [`No se pudo leer el Corpus: ${fallo instanceof Error ? fallo.message : String(fallo)}`, 'No se ha escrito nada.'],
    };
  }
  const autorPorSlug = new Map(autores.map((a) => [a.slug, a]));
  const slugsDePersonaje = new Set(personajes.map((p) => p.slug));
  const slugsDeTema = new Set(temas.map((t) => t.slug));

  const comoParaAtribuidas = (c: {
    slug: string;
    texto?: unknown;
    clase?: unknown;
    variante?: unknown;
  }): CitaParaAtribuidas => ({
    slug: c.slug,
    texto: typeof c.texto === 'string' ? c.texto : '',
    ...(textoDeVariante(c) !== undefined ? { variante: textoDeVariante(c) } : {}),
    ...(esAtribuida(c) ? { clase: claseDe(c) } : {}),
  });
  const publicadasParaAtribuidas = publicadas.map(comoParaAtribuidas);
  const revisionParaAtribuidas = enRevision.map(comoParaAtribuidas);
  const ocupados = new Set<string>([
    ...publicadas.map((c) => c.slug),
    ...enRevision.map((c) => c.slug),
    ...slugsConOtraClase(registro, CLASE_ATRIBUIDA),
  ]);

  const aEscribir: { indice: number; slug: string; dueño: string; cita: Record<string, unknown>; dominios: string[] }[] = [];
  const rechazadas: CandidataRechazada[] = [];
  const anterioresDelLote: CitaParaAtribuidas[] = [];

  for (const [indice, bruta] of lote.entries()) {
    const motivos: string[] = [];
    if (bruta === null || typeof bruta !== 'object' || Array.isArray(bruta)) {
      rechazadas.push({ indice, texto: '', motivos: ['no es una candidata: cada entrada del lote es un mapa con sus campos.'] });
      continue;
    }
    const entrada = bruta as Record<string, unknown>;
    const texto = typeof entrada.texto === 'string' ? entrada.texto.trim() : '';
    const personaje = typeof entrada.personaje === 'string' && entrada.personaje !== '' ? entrada.personaje : undefined;
    const autor = typeof entrada.autor === 'string' && entrada.autor !== '' ? entrada.autor : undefined;

    if ('clase' in entrada) motivos.push(MOTIVO_CLASE_TECLEADA);
    const ajenos = Object.keys(entrada).filter((k) => k !== 'clase' && !CAMPOS_DEL_LOTE.has(k));
    if (ajenos.length > 0) {
      motivos.push(
        `${ajenos.map((k) => `«${k}»`).join(', ')} no ${ajenos.length === 1 ? 'es un campo' : 'son campos'} del lote: ` +
          `una entrada lleva solo ${[...CAMPOS_DEL_LOTE].map((k) => `«${k}»`).join(', ')}.`,
      );
    }
    if (texto === '') motivos.push(MOTIVO_SIN_ESPAÑOL);
    if (personaje === undefined && autor === undefined) motivos.push(MOTIVO_SIN_DUEÑO);
    if (personaje !== undefined && !slugsDePersonaje.has(personaje)) {
      motivos.push(
        `su Personaje «${personaje}» no existe en corpus/personajes/: se da de alta antes con ` +
          '«npx tsx tools/personaje.ts crear», nunca tecleando el campo.',
      );
    }
    if (autor !== undefined && !autorPorSlug.has(autor)) {
      motivos.push(`su Autor «${autor}» no existe en corpus/autores/: se da de alta antes con «npx tsx tools/autor.ts crear».`);
    }
    for (const dueño of [personaje, autor]) {
      if (dueño !== undefined && !enLaSemilla.has(dueño)) motivos.push(motivoFueraDeLaSemilla(dueño, semilla));
    }
    // La clase se deriva, nunca se teclea: con Personaje es atribuida; sin él, la del Autor.
    const clase =
      personaje !== undefined
        ? claseQueCorresponde({ personaje }, {})
        : autor !== undefined && autorPorSlug.has(autor)
          ? claseQueCorresponde({}, autorPorSlug.get(autor)!)
          : undefined;
    if (clase !== undefined) {
      if (!esAtribuida({ clase })) {
        motivos.push(
          `el Autor «${autor}» es de dominio público y sin Personaje la Cita sería de la clase de siempre, que ` +
            'se siembra desde las obras y se coteja: la semilla es solo de la atribuida.',
        );
      }
    }
    if (entrada.temas !== undefined && !Array.isArray(entrada.temas)) motivos.push('«temas» tiene que ser una lista de slugs de Tema.');
    const temasDeclarados = Array.isArray(entrada.temas) ? entrada.temas : [];
    const desconocidos = temasDeclarados.filter((t) => typeof t !== 'string' || !slugsDeTema.has(t));
    if (desconocidos.length > 0) {
      motivos.push(`Tema desconocido: ${desconocidos.map((t) => `«${String(t)}»`).join(', ')}.`);
    }

    const dueño = autor ?? personaje ?? '';
    const slug = slugLibre(slugDeCita(dueño, texto), ocupados);
    const obra = typeof entrada.obra === 'string' && entrada.obra.trim() !== '' ? entrada.obra.trim() : undefined;
    if (entrada.obra !== undefined && obra === undefined) motivos.push('«obra» tiene que ser el título de la Obra, con contenido.');
    // La Procedencia: la Obra, si consta, y el año o una referencia; la juzga el esquema.
    const procedencia = {
      ...(obra !== undefined ? { obra } : {}),
      ...(entrada.año !== undefined ? { año: entrada.año } : {}),
      ...(entrada.referencia !== undefined ? { referencia: entrada.referencia } : {}),
    };
    const cita: Record<string, unknown> = {
      texto,
      ...(autor !== undefined ? { autor } : {}),
      ...(personaje !== undefined ? { personaje } : {}),
      ...(temasDeclarados.length > 0 ? { temas: temasDeclarados } : {}),
      slug,
      ...(Object.keys(procedencia).length > 0 ? { procedencia } : {}),
      ...(clase !== undefined ? { clase } : {}),
      ...(entrada.atestiguaciones !== undefined ? { atestiguaciones: entrada.atestiguaciones } : {}),
      ...(entrada.origen !== undefined ? { origen: entrada.origen } : {}),
      ...(entrada.variante !== undefined ? { variante: entrada.variante } : {}),
    };

    if (motivos.length === 0) {
      const validada = citaAdmisible.safeParse(cita);
      if (!validada.success) {
        for (const issue of validada.error.issues) {
          const campo = issue.path.join('.');
          motivos.push(campo ? `${campo}: ${issue.message}` : issue.message);
        }
      }
    }

    // Los dominios: solo `dominiosQueAtestiguan` (sin BrainyQuote, sus espejos ni el propio dominio).
    const urls = Array.isArray(entrada.atestiguaciones)
      ? entrada.atestiguaciones
          .map((a) => (a !== null && typeof a === 'object' ? (a as { url?: unknown }).url : undefined))
          .filter((u): u is string => typeof u === 'string')
      : [];
    const dominios = dominiosQueAtestiguan(urls);
    if (motivos.length === 0) {
      if (dominios.length === 0) {
        motivos.push(
          'ninguna de sus atestiguaciones cuenta: BrainyQuote, sus espejos y el propio sitio no atestiguan, y sin ' +
            'ningún dominio registrable no la pasaría ningún mínimo.',
        );
      } else {
        const escasas = motivoDeAtestiguacionesEscasas(urls, minimo);
        if (escasas !== undefined) motivos.push(escasas);
      }
    }

    if (motivos.length === 0 && obra !== undefined) {
      const plan = await resolverFichaDeObra(rutas, {
        ...(autor !== undefined ? { autor } : {}),
        ...(personaje !== undefined ? { personaje } : {}),
        obra,
        citasPublicadas: publicadas,
      });
      if (!plan.ok) motivos.push(...plan.motivos);
    }

    const propia = comoParaAtribuidas({ ...cita, slug });
    if (motivos.length === 0) {
      const fallos = fallosDeDuplicados([propia], {
        citas: [...publicadasParaAtribuidas, propia],
        comparables: [...revisionParaAtribuidas, ...anterioresDelLote],
        vedadas,
      });
      motivos.push(...fallos.map((f) => f.motivo));
    }
    if (motivos.length > 0) {
      rechazadas.push({ indice, texto, motivos });
      continue;
    }
    // Solo cuenta como anterior la que se va a escribir: una rechazada no bloquea su corrección.
    anterioresDelLote.push({ ...propia, slug: `entrada ${indice + 1} del lote` });
    ocupados.add(slug);
    aEscribir.push({ indice, slug, dueño, cita, dominios });
  }

  // Sin vuelta atrás a medias: si una escritura falla, se quitan las ya escritas de esta pasada.
  const escritas: CandidataEscrita[] = [];
  try {
    for (const { indice, slug, dueño, cita, dominios } of aEscribir) {
      const ruta = await escribirCita(rutas.revision, nombreDeFicheroDeCita(dueño, slug), cita);
      escritas.push({ indice, slug, ruta, dominios, sinJuzgarMinimo: minimo === undefined });
    }
  } catch (fallo) {
    await Promise.all(escritas.map((e) => rm(e.ruta, { force: true })));
    return {
      ok: false,
      motivos: [
        `No se pudo escribir en corpus/_revision/: ${fallo instanceof Error ? fallo.message : String(fallo)}`,
        'Se han quitado las candidatas que esta pasada había escrito: no se ha escrito nada.',
      ],
    };
  }
  return { ok: true, escritas, rechazadas };
}

/** El parte de la propuesta. */
export function formatearPropuesta(resultado: Extract<ResultadoDePropuesta, { ok: true }>): string {
  const lineas: string[] = [];
  lineas.push(`Propuestas a corpus/_revision/: ${resultado.escritas.length}. Rechazadas: ${resultado.rechazadas.length}.`);
  for (const e of resultado.escritas) {
    lineas.push(
      `  + entrada ${e.indice + 1} → ${e.ruta}`,
      `      dominios que la atestiguan (${e.dominios.length}): ${e.dominios.join(', ')}` +
        (e.sinJuzgarMinimo ? ' — sin juzgar el mínimo: MIN_ATESTIGUACIONES_DE_ATRIBUIDA sin valor; sigue en revisión.' : ''),
    );
  }
  for (const r of resultado.rechazadas) {
    lineas.push(`  ✗ entrada ${r.indice + 1}${r.texto !== '' ? ` «${r.texto}»` : ''}:`);
    for (const m of r.motivos) lineas.push(`      ${m}`);
  }
  if (resultado.escritas.length === 0) lineas.push('', 'No se ha escrito nada.');
  else {
    lineas.push(
      '',
      'Nada se ha publicado: aprobar es de una persona, con «npx tsx tools/revisar.ts --aprobar <slug> --temas <tema>».',
    );
    if (resultado.rechazadas.length > 0) {
      lineas.push(
        'Las propuestas ya están en corpus/_revision/: el lote corregido lleva solo las rechazadas, porque',
        'volver a proponer las escritas sería un duplicado de su propia candidata.',
      );
    }
  }
  return lineas.join('\n');
}
