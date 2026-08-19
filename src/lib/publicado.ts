/**
 * AD-11 — El conjunto publicable tiene un solo dueño.
 *
 * **Toda** superficie que enumere contenido —rutas, sitemap, índice de Pagefind, chips,
 * listados, descubrimiento— deriva de aquí. Ningún módulo aplica un umbral por su cuenta
 * ni filtra colecciones directamente.
 *
 * Lo que esto impide y AD-9 **no** cierra: que el umbral tenga nombre no dice quién lo
 * aplica. Quien genera las rutas de Tema y quien genera el sitemap pueden leer el mismo
 * `MIN_CITAS_POR_TEMA` y aun así discrepar sobre un Tema de 14 Citas — página sin
 * sitemap, o chip que enlaza a un 404.
 *
 * Sobre AD-5: el núcleo de este módulo son funciones puras sobre listas ya validadas, y
 * es lo que se prueba. `astro:content` entra solo como `import type`, que TypeScript
 * borra al compilar, así que el núcleo no depende de Astro en tiempo de ejecución. La
 * fachada del final es la única parte que consulta las colecciones.
 */

import type { CollectionEntry } from 'astro:content';
import { MAX_SALTOS_DESDE_LA_PORTADA, MIN_CITAS_POR_TEMA } from './umbrales.ts';
import type { Procedencia } from './admision.ts';

// ─── Formas planas, independientes de Astro ──────────────────────────────────

export interface Cita {
  slug: string;
  texto: string;
  autor: string;
  temas: string[];
  procedencia: Procedencia;
  aptaParaPortada: boolean;
}

export interface Autor {
  slug: string;
  nombre: string;
  semblanza: string;
  añoNacimiento?: number;
  añoFallecimiento: number;
}

export interface Tema {
  slug: string;
  nombre: string;
}

export interface ConjuntoPublicable {
  citas: Cita[];
  autores: Autor[];
  temas: Tema[];
}

// ─── Núcleo puro ─────────────────────────────────────────────────────────────

/**
 * Un Autor se publica si tiene al menos una Cita publicada — FR-4.
 *
 * No hay umbral que aplicar: la Cita existe o no existe. Un Autor sin Citas publicadas
 * no tiene página accesible ni indexable, y esta función es la que lo decide para todas
 * las superficies a la vez.
 */
export function autoresPublicados(autores: Autor[], citas: Cita[]): Autor[] {
  const conCitas = new Set(citas.map((c) => c.autor));
  return autores
    .filter((a) => conCitas.has(a.slug))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Un Tema se publica al alcanzar `MIN_CITAS_POR_TEMA` Citas publicadas — FR-6. */
export function temasPublicados(temas: Tema[], citas: Cita[]): Tema[] {
  const cuenta = new Map<string, number>();
  for (const cita of citas) {
    for (const tema of cita.temas) cuenta.set(tema, (cuenta.get(tema) ?? 0) + 1);
  }
  return temas
    .filter((t) => (cuenta.get(t.slug) ?? 0) >= MIN_CITAS_POR_TEMA)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Las Citas de un Autor, en orden estable para que el build sea reproducible. */
export function citasDeAutor(citas: Cita[], slugAutor: string): Cita[] {
  return citas.filter((c) => c.autor === slugAutor).sort((a, b) => a.slug.localeCompare(b.slug, 'es'));
}

export function citasDeTema(citas: Cita[], slugTema: string): Cita[] {
  return citas.filter((c) => c.temas.includes(slugTema)).sort((a, b) => a.slug.localeCompare(b.slug, 'es'));
}

/**
 * Los Temas de una Cita que además están publicados.
 *
 * Es la función que impide el chip que enlaza a un 404: una Cita puede pertenecer a un
 * Tema de cuatro Citas, y ese Tema no tiene página. El chip no debe renderizarse.
 */
export function temasDeLaCita(cita: Cita, publicados: Tema[]): Tema[] {
  const porSlug = new Map(publicados.map((t) => [t.slug, t]));
  return cita.temas.map((s) => porSlug.get(s)).filter((t): t is Tema => t !== undefined);
}

/**
 * Otras Citas del mismo Autor — FR-12, UX-DR17.
 *
 * Se deriva de Autor y de Tema, sin motor de recomendación: primero las del mismo Autor
 * que además comparten algún Tema con esta, y después el resto de las suyas. Ordenar así
 * no es «recomendar»; es preferir la vecindad más estrecha de las dos que ya existen.
 */
export function citasRelacionadas(citas: Cita[], cita: Cita, maximo: number): Cita[] {
  const suyas = citasDeAutor(citas, cita.autor).filter((c) => c.slug !== cita.slug);
  const temas = new Set(cita.temas);
  const comparteTema = (c: Cita) => c.temas.some((t) => temas.has(t));

  return [...suyas.filter(comparteTema), ...suyas.filter((c) => !comparteTema(c))].slice(0, maximo);
}

/** Todas las rutas publicadas del sitio. El sitemap y la comprobación de enlaces la usan. */
export function rutasPublicadas(conjunto: ConjuntoPublicable): string[] {
  return [
    '/',
    ...conjunto.citas.map((c) => `/cita/${c.slug}`),
    ...autoresPublicados(conjunto.autores, conjunto.citas).map((a) => `/autor/${a.slug}`),
    ...temasPublicados(conjunto.temas, conjunto.citas).map((t) => `/tema/${t.slug}`),
  ];
}

/**
 * Las superficies publicadas a las que no llega ningún enlace interno — NFR-5.
 *
 * AD-11 extendido: publicable y alcanzable son **el mismo conjunto**. Este módulo ya era
 * el dueño de qué se publica, así que es también el sitio donde se comprueba que lo
 * publicado se alcanza; tenerlo en otro lado permitiría que las dos respuestas
 * divergieran, que es exactamente lo que AD-11 existe para impedir.
 *
 * Puro y sin disco (AD-5): recibe el grafo ya leído —qué enlaces salen de cada ruta— y
 * recorre a lo ancho desde la portada. Quien lo llama es quien sabe leer el sitio
 * construido o el navegador.
 */
export function superficiesInalcanzables(
  publicadas: readonly string[],
  enlaces: ReadonlyMap<string, readonly string[]>,
  opciones: { desde?: string; maximoDeSaltos?: number } = {},
): string[] {
  const desde = opciones.desde ?? '/';
  const maximoDeSaltos = opciones.maximoDeSaltos ?? MAX_SALTOS_DESDE_LA_PORTADA;

  const visitadas = new Set<string>();
  let frontera = [desde];

  for (let salto = 0; salto <= maximoDeSaltos && frontera.length > 0; salto += 1) {
    const siguiente: string[] = [];
    for (const ruta of frontera) {
      if (visitadas.has(ruta)) continue;
      visitadas.add(ruta);
      for (const enlace of enlaces.get(ruta) ?? []) {
        if (!visitadas.has(enlace)) siguiente.push(enlace);
      }
    }
    frontera = [...new Set(siguiente)];
  }

  return publicadas.filter((ruta) => !visitadas.has(ruta));
}

/**
 * Integridad referencial — se comprueba en el build y **rompe** si falla.
 *
 * Astro valida las referencias de forma perezosa: una Cita que apunta a un Autor
 * inexistente no rompe nada hasta que alguien la consulta, y para entonces el fallo
 * aparece como una página rota en producción en lugar de como un build en rojo. Como
 * este módulo es el dueño del conjunto publicable (AD-11), es también el sitio donde
 * tiene sentido exigir que lo enumerado exista.
 */
export function verificarIntegridad(conjunto: ConjuntoPublicable): void {
  const autores = new Set(conjunto.autores.map((a) => a.slug));
  const temas = new Set(conjunto.temas.map((t) => t.slug));
  const fallos: string[] = [];

  for (const cita of conjunto.citas) {
    if (!autores.has(cita.autor)) {
      fallos.push(`  · ${cita.slug} → el Autor «${cita.autor}» no existe en el corpus.`);
    }
    for (const tema of cita.temas) {
      if (!temas.has(tema)) {
        fallos.push(`  · ${cita.slug} → el Tema «${tema}» no existe en el corpus.`);
      }
    }
  }

  if (fallos.length > 0) {
    throw new Error(
      [
        'Integridad del corpus: hay Citas que apuntan a entidades inexistentes.',
        ...fallos,
        'Cree las entidades que faltan o corrija las referencias antes de construir.',
      ].join('\n'),
    );
  }
}

// ─── Fachada: la única parte que consulta las colecciones ────────────────────

type EntradaCita = CollectionEntry<'citas'>;
type EntradaAutor = CollectionEntry<'autores'>;
type EntradaTema = CollectionEntry<'temas'>;

export function aplanarCita(entrada: EntradaCita): Cita {
  return {
    slug: entrada.data.slug,
    texto: entrada.data.texto,
    autor: entrada.data.autor.id,
    temas: entrada.data.temas.map((t) => t.id),
    procedencia: entrada.data.procedencia,
    aptaParaPortada: entrada.data.aptaParaPortada,
  };
}

export function aplanarAutor(entrada: EntradaAutor): Autor {
  return { slug: entrada.id, ...entrada.data };
}

export function aplanarTema(entrada: EntradaTema): Tema {
  return { slug: entrada.id, nombre: entrada.data.nombre };
}

let memoria: ConjuntoPublicable | undefined;

/**
 * El conjunto publicable, leído una sola vez por build.
 *
 * Se memoriza porque cada página lo pide y el build genera cientos: sin memoria, cada
 * ruta releería las tres colecciones enteras.
 */
export async function conjuntoPublicable(): Promise<ConjuntoPublicable> {
  if (memoria) return memoria;

  const { getCollection } = await import('astro:content');
  const conjunto: ConjuntoPublicable = {
    citas: (await getCollection('citas')).map(aplanarCita),
    autores: (await getCollection('autores')).map(aplanarAutor),
    temas: (await getCollection('temas')).map(aplanarTema),
  };

  verificarIntegridad(conjunto);
  memoria = conjunto;
  return conjunto;
}
