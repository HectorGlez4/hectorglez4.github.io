/**
 * La Obra — Historia 22.1, AD-25.
 *
 * La Obra no se da de alta a mano: se deriva del campo `obra` de las Procedencias
 * publicadas, y lo que no se puede derivar —su identidad estable y su URL futura— lo ancla
 * una **Ficha de Obra** en `corpus/obras/`, que crea el sistema.
 *
 * - **Identidad:** el par (Autor, forma canónica), con `normalizar` (AD-3). El título no
 *   interviene: corregir una tilde no mueve ninguna página.
 * - **Nombre de la ficha:** `{autor}--{slugDeObra(titulo)}`, derivado **una sola vez** al
 *   crearla y nunca recalculado (AD-4). Sin la truncación del documento de Fuente.
 * - **Título por omisión:** la grafía literal más usada (ver `grafiaPorOmision`).
 *
 * Este módulo es puro (AD-5): recibe las fichas ya leídas —y ya admitidas por
 * `obraAdmisible`— y las Citas, y devuelve resoluciones, fallos y avisos. Quien lee disco y
 * detiene la construcción es `integraciones/obras.ts`; quien escribe fichas es
 * `tools/lib/obras.ts`.
 */

import type { FormatoDeEdicion } from './ediciones.ts';
import { compararPorClave, normalizar } from './normalizar.ts';
import { slugDeObra } from './slug.ts';
import { rutaDeObra } from './superficies.ts';
import {
  AVISO_DE_RANGO_DE_LA_CLAVE_DE_ORDEN,
  CONGELACION_DE_OBRAS,
  MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN,
  MAX_PROPORCION_OBRA_DEL_AUTOR,
  MIN_CITAS_OBRA_INDEXABLE,
  type CongelacionDeObras,
} from './umbrales.ts';

/** La orden que crea las fichas que faltan. Se nombra una vez y la citan los mensajes. */
export const ORDEN_DE_SEMBRAR_OBRAS = 'npm run obra -- sembrar';

/** El separador entre el slug de Autor y el de la obra en el nombre de la ficha. */
const SEPARADOR = '--';

/** La forma que tiene que tener el nombre de una ficha: `{slug-autor}--{slug-obra}`. */
const FORMA_DE_NOMBRE = /^[a-z0-9]+(?:-[a-z0-9]+)*--[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/** La forma canónica de una obra: la mitad de su identidad (AD-3). */
export function formaDeObra(obra: string): string {
  return normalizar(obra);
}

/** Una grafía literal de `procedencia.obra` y cuántas Citas publicadas la usan. */
export interface GrafiaDeObra {
  literal: string;
  citas: number;
}

/**
 * La regla de grafía por omisión, con un solo dueño.
 *
 * Entre las grafías literales de la Obra, gana la que más Citas publicadas usan; en caso
 * de empate, la primera por `localeCompare(…, 'es')`. Es siempre una grafía **literal** de
 * alguna Procedencia y nunca se inventa. La usa quien crea la ficha y la usará la 22.2
 * cuando el título deje de ser literal.
 */
export function grafiaPorOmision(grafias: readonly GrafiaDeObra[]): string {
  if (grafias.length === 0) {
    throw new Error('Una Obra sin ninguna grafía no tiene título que proponer.');
  }
  const ordenadas = [...grafias].sort(
    (a, b) => b.citas - a.citas || a.literal.localeCompare(b.literal, 'es'),
  );
  return ordenadas[0].literal;
}

/**
 * El slug de obra con el que se nombra una ficha, o `undefined` si el título no deja ni una
 * letra o cifra.
 *
 * `normalizar` no retira todos los símbolos —un `·` sobrevive—, así que lo que no sea
 * minúscula, cifra o guion se trata como separador, igual que hace el nombre del documento.
 * **No se trunca**: el nombre de la ficha es la URL futura, y cortarlo haría que dos títulos
 * largos con el mismo arranque compitieran por ella.
 */
export function slugDeFichaDeObra(titulo: string): string | undefined {
  const limpio = slugDeObra(titulo)
    .replace(/[^a-z0-9-]+/gu, '-')
    .replace(/-{2,}/gu, '-')
    .replace(/^-|-$/gu, '');
  return /[a-z0-9]/u.test(limpio) ? limpio : undefined;
}

/**
 * El nombre del fichero de una ficha, sin extensión: `{autor}--{slug-de-obra}`.
 *
 * Se llama **una sola vez**, al crear la ficha. Después el nombre es la URL y no se
 * recalcula aunque el título cambie (AD-4).
 */
export function nombreDeFichaDeObra(autor: string, titulo: string): string | undefined {
  const slug = slugDeFichaDeObra(titulo);
  return slug === undefined ? undefined : `${autor}${SEPARADOR}${slug}`;
}

/**
 * Los dos segmentos de la URL de una Obra, sacados del nombre de su ficha partido por el
 * **primer** `--`: el slug de Autor y el de la obra (Historia 22.4).
 *
 * El primero y no el último porque el slug de Autor no puede llevar `--` (su esquema solo
 * admite guiones sueltos) y el de la obra tampoco, así que en un nombre bien formado hay uno
 * solo; partir por el primero es lo que no depende de esa segunda garantía.
 */
export function segmentosDeObra(nombre: string): { autor: string; obra: string } {
  const corte = nombre.indexOf(SEPARADOR);
  if (corte <= 0 || corte + SEPARADOR.length >= nombre.length) {
    throw new Error(
      `«${nombre}» no tiene forma de nombre de Ficha de Obra («{slug-autor}--{slug-obra}»): ` +
        'no se le puede dar URL.',
    );
  }
  return { autor: nombre.slice(0, corte), obra: nombre.slice(corte + SEPARADOR.length) };
}

/**
 * La ruta de la Página de Obra de una Obra resuelta. El constructor es `rutaDeObra`, en
 * `src/lib/superficies.ts`; esto solo le da los dos segmentos que salen del nombre de la ficha.
 */
export function rutaDeLaObra(obra: Pick<ObraResuelta, 'nombre'>, pagina = 1): string {
  const { autor, obra: slug } = segmentosDeObra(obra.nombre);
  return rutaDeObra(autor, slug, pagina);
}

/**
 * El orden de la Lista de Obras — Historias 17.3 y 26.4, AD-25.
 *
 * Es el **único** dueño del orden en que se listan las Obras de un Autor, y lo usan las dos
 * superficies que pintan esa lista —su Página de Autor y su grupo de `/obras/`— por la misma
 * llamada (`obrasDelAutor` en `src/lib/publicado.ts`, que lo reexporta): un grupo de `/obras/`
 * repite la secuencia de la Página de su Autor porque no hay un segundo orden que pueda
 * divergir. De más a menos Citas publicadas, por título a igualdad y, al final, por nombre de
 * ficha, para que no dependa del orden de entrada. Devuelve una copia: no toca la que recibe.
 */
export function ordenDeLaListaDeObras<O extends Pick<ObraResuelta, 'nombre' | 'titulo' | 'recuento'>>(
  obras: readonly O[],
): O[] {
  return [...obras].sort(
    (a, b) =>
      b.recuento - a.recuento ||
      a.titulo.localeCompare(b.titulo, 'es') ||
      a.nombre.localeCompare(b.nombre, 'es'),
  );
}

/**
 * Si la página de una Obra se indexa — FR-52, Historia 22.4.
 *
 * Al menos `MIN_CITAS_OBRA_INDEXABLE` Citas publicadas y **menos** de
 * `MAX_PROPORCION_OBRA_DEL_AUTOR` de las Citas publicadas de su Autor. Una Obra de una sola
 * Cita repite esa Cita; una que reúne casi todo su Autor repite la Página de Autor.
 *
 * Es la única regla, y pura: la consultan el armazón (por la lista de rutas indexables), el
 * filtro del sitemap y la comprobación del build. No se declara en ninguna ficha: se recalcula
 * en cada construcción y por eso se corrige sola en los dos sentidos.
 */
export function esObraIndexable(recuento: number, citasDelAutor: number): boolean {
  if (recuento < MIN_CITAS_OBRA_INDEXABLE) return false;
  if (citasDelAutor <= 0) return false;
  return recuento / citasDelAutor < MAX_PROPORCION_OBRA_DEL_AUTOR;
}

/**
 * La congelación de la familia Obra, si está declarada — Historia 22.8, AD-25.
 *
 * Es la **única** consulta de la declaración de `src/lib/umbrales.ts`: la usa `obrasIndexables`
 * como dato de la regla, `npm run rastreo -- --registrar` para negarse a anotar una Obra, y la
 * usarán las ediciones en venta (22.9) y las Piezas que enlacen a una Obra. Se lee del código
 * versionado y nunca de la serie de indexación (AD-24). El parámetro existe para las pruebas.
 */
export function congelacionVigente(
  declarada: CongelacionDeObras | undefined = CONGELACION_DE_OBRAS,
): CongelacionDeObras | undefined {
  return declarada;
}

/** Una ficha ya admitida, vista con el nombre de su fichero. */
export interface FichaDeObra {
  /**
   * Nombre del fichero sin extensión, relativo a `corpus/obras/` —una ficha anidada lleva
   * su barra—: la identidad de URL de la ficha.
   */
  nombre: string;
  /** Ruta legible del fichero, para los mensajes. */
  ruta: string;
  autor: string;
  titulo: string;
  formas: readonly string[];
  /** Formas de otras Obras del mismo Autor de las que esta se declara distinta (22.2). */
  distintaDe?: readonly string[];
  /** La nota de la ficha (22.6): la escribe Héctor a mano y ninguna orden la toca. */
  nota?: string;
  /**
   * Las ediciones en venta (22.9), en el orden de la ficha. Las declara Héctor con
   * `npm run obra -- edicion`; las órdenes que reescriben una ficha las conservan.
   */
  ediciones?: readonly EdicionDeObra[];
}

/** Una edición en venta de una ficha, ya admitida por el esquema (22.9). */
export interface EdicionDeObra {
  /** La clave de una tienda de `TIENDAS` (`src/lib/ingreso.ts`). */
  tienda: string;
  formato: FormatoDeEdicion;
  /** La dirección **sin** marca: la marca la añade `urlDeEdicion` al construir. */
  url: string;
  descripcion?: string;
}

/** Lo que de una Cita importa para resolver su Obra. */
export interface CitaConObra {
  slug: string;
  autor: string;
  procedencia?: { obra?: string } | null;
  /** Ruta legible del fichero, para que la puerta ortográfica lo nombre (22.2). */
  ruta?: string;
}

/** La forma de la obra de una Cita, o `undefined` si no declara obra. */
function formaDeCita(cita: CitaConObra): string | undefined {
  const obra = cita.procedencia?.obra;
  if (typeof obra !== 'string') return undefined;
  const forma = formaDeObra(obra);
  return forma === '' ? undefined : forma;
}

/** Clave del par (Autor, forma): la identidad de una Obra. */
export function clave(autor: string, forma: string): string {
  return `${autor}\u0000${forma}`;
}

/**
 * Índice de fichas por identidad. Si dos fichas reclaman la misma forma, gana la primera
 * por nombre: es un estado que `fallosDeObras` rompe, así que aquí solo hace falta que la
 * resolución sea determinista.
 */
export function indiceDeFichas(fichas: readonly FichaDeObra[]): Map<string, FichaDeObra> {
  const indice = new Map<string, FichaDeObra>();
  for (const ficha of [...fichas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
    for (const forma of ficha.formas) {
      const k = clave(ficha.autor, forma);
      if (!indice.has(k)) indice.set(k, ficha);
    }
  }
  return indice;
}

/**
 * La ficha que resuelve una Cita: la de su Autor cuyas formas contienen la de su obra.
 * `undefined` si la Cita no declara obra o si ninguna ficha la reclama.
 */
export function fichaDeCita(
  cita: CitaConObra,
  fichas: readonly FichaDeObra[] | Map<string, FichaDeObra>,
): FichaDeObra | undefined {
  const forma = formaDeCita(cita);
  if (forma === undefined) return undefined;
  const indice = fichas instanceof Map ? fichas : indiceDeFichas(fichas);
  return indice.get(clave(cita.autor, forma));
}

/**
 * Las Obras de un conjunto de Citas, agrupadas por identidad, con sus grafías literales y
 * cuántas Citas usa cada una. Ordenadas por Autor y forma.
 */
export function obrasDeCitas(
  citas: readonly CitaConObra[],
): { autor: string; forma: string; grafias: GrafiaDeObra[]; citas: string[] }[] {
  const grupos = new Map<
    string,
    { autor: string; forma: string; grafias: Map<string, number>; citas: string[] }
  >();
  for (const cita of citas) {
    const forma = formaDeCita(cita);
    if (forma === undefined) continue;
    const obra = cita.procedencia?.obra as string;
    const k = clave(cita.autor, forma);
    const grupo = grupos.get(k) ?? {
      autor: cita.autor,
      forma,
      grafias: new Map<string, number>(),
      citas: [] as string[],
    };
    grupo.grafias.set(obra, (grupo.grafias.get(obra) ?? 0) + 1);
    grupo.citas.push(cita.slug);
    grupos.set(k, grupo);
  }
  return [...grupos.values()]
    .map((g) => ({
      autor: g.autor,
      forma: g.forma,
      grafias: [...g.grafias]
        .map(([literal, n]) => ({ literal, citas: n }))
        .sort((a, b) => b.citas - a.citas || a.literal.localeCompare(b.literal, 'es')),
      citas: g.citas,
    }))
    .sort((a, b) => a.autor.localeCompare(b.autor, 'es') || a.forma.localeCompare(b.forma, 'es'));
}

/**
 * Los pares de formas del mismo Autor en que una es prefijo de otra, por palabras enteras
 * —«del sentimiento tragico de la vida» y «… i»—. No es un fallo: es la lista que la 22.2
 * necesita para decidir reuniones, y que hoy solo se informa.
 */
export function prefijosDeFormas(
  pares: readonly { autor: string; forma: string }[],
): { autor: string; corta: string; larga: string }[] {
  const porAutor = new Map<string, Set<string>>();
  for (const { autor, forma } of pares) {
    porAutor.set(autor, (porAutor.get(autor) ?? new Set()).add(forma));
  }
  const salida: { autor: string; corta: string; larga: string }[] = [];
  for (const [autor, formas] of [...porAutor].sort((a, b) => a[0].localeCompare(b[0], 'es'))) {
    const lista = [...formas].sort((a, b) => a.localeCompare(b, 'es'));
    for (const corta of lista) {
      for (const larga of lista) {
        if (larga !== corta && larga.startsWith(`${corta} `)) salida.push({ autor, corta, larga });
      }
    }
  }
  return salida;
}

/**
 * Los incumplimientos del conjunto de fichas, ya redactados. Lista vacía es «todo en orden».
 *
 * Rompen el build:
 *   · una Cita publicada cuya obra no reclama ninguna ficha de su Autor;
 *   · una forma reclamada por dos fichas del mismo Autor;
 *   · un nombre de fichero cuyo prefijo de Autor no es su campo `autor`;
 *   · una ficha cuyo `autor` no existe en el Corpus;
 *   · una Obra publicada con dos o más grafías de la misma forma, si alguna no es literal de
 *     su Fuente (la puerta ortográfica de la Historia 22.2, `fallosOrtograficos`).
 *
 * Una ficha sin Citas publicadas no está aquí: avisa y no rompe (`avisosDeObras`), porque
 * retirar una Cita no puede tumbar el sitio (AD-18).
 */
export function fallosDeObras(
  fichas: readonly FichaDeObra[],
  citas: readonly CitaConObra[],
  autores: Iterable<string>,
  documentos: DocumentosDeObras = SIN_DOCUMENTOS,
): string[] {
  const fallos: string[] = [];
  const conocidos = new Set(autores);
  const ordenadas = [...fichas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  for (const ficha of ordenadas) {
    if (!FORMA_DE_NOMBRE.test(ficha.nombre)) {
      fallos.push(
        `  · ${ficha.ruta} → el nombre «${ficha.nombre}» no tiene forma de nombre de ficha: ` +
          '«{slug-autor}--{slug-obra}», en minúsculas, cifras y guiones, directamente en ' +
          'corpus/obras/ y sin subdirectorios. Es la URL futura de la Obra.',
      );
    }
  }

  const porNombre = new Map<string, FichaDeObra[]>();
  for (const ficha of ordenadas) {
    const nombre = ficha.nombre.split('/').pop() ?? ficha.nombre;
    porNombre.set(nombre, [...(porNombre.get(nombre) ?? []), ficha]);
  }
  for (const [nombre, repetidas] of porNombre) {
    if (repetidas.length < 2) continue;
    fallos.push(
      `  · «${nombre}» lo declaran ${repetidas.length} ficheros: ` +
        `${repetidas.map((f) => f.ruta).join(', ')}. Dos fichas con el mismo nombre serían la ` +
        'misma URL; el sitio se quedaría con una y la otra se perdería sin aviso.',
    );
  }

  for (const ficha of ordenadas) {
    /*
     * Historia 22.4 — un slug de obra enteramente numérico chocaría con «la página N» de
     * otra Obra del mismo Autor: `/obra/orwell/1984/` sería a la vez una Obra y la página
     * 1984 de nada. La URL no se recalcula, así que se para aquí y no se adivina.
     */
    const slugDeLaObra = ficha.nombre.split('/').pop()?.split(SEPARADOR).slice(1).join(SEPARADOR);
    if (slugDeLaObra !== undefined && /^\d+$/u.test(slugDeLaObra)) {
      fallos.push(
        `  · ${ficha.ruta} → el slug de obra «${slugDeLaObra}» es solo un número, y en la URL ` +
          'de la Obra se confundiría con una página del listado. Renombre la ficha con un slug ' +
          'que lleve alguna letra.',
      );
    }
    const prefijo = `${ficha.autor}${SEPARADOR}`;
    if (!ficha.nombre.startsWith(prefijo) || ficha.nombre.length === prefijo.length) {
      fallos.push(
        `  · ${ficha.ruta} → declara «autor: ${ficha.autor}», y el nombre de una Ficha de ` +
          `Obra empieza por el slug de su Autor seguido de «${SEPARADOR}». El nombre es la URL ` +
          'futura de la Obra y no se recalcula: la ficha está mal atribuida o mal nombrada.',
      );
    }
    if (!conocidos.has(ficha.autor)) {
      fallos.push(
        `  · ${ficha.ruta} → su Autor «${ficha.autor}» no existe en corpus/autores/.`,
      );
    }
  }

  const reclamantes = new Map<string, { forma: string; fichas: FichaDeObra[] }>();
  for (const ficha of ordenadas) {
    for (const forma of ficha.formas) {
      const k = clave(ficha.autor, forma);
      const previo = reclamantes.get(k) ?? { forma, fichas: [] };
      previo.fichas.push(ficha);
      reclamantes.set(k, previo);
    }
  }
  for (const { forma, fichas: repetidas } of reclamantes.values()) {
    if (repetidas.length < 2) continue;
    fallos.push(
      `  · La forma «${forma}» de ${repetidas[0].autor} la reclaman ${repetidas.length} fichas: ` +
        `${repetidas.map((f) => f.ruta).join(', ')}. Una forma la reclama a lo sumo una ficha.`,
    );
  }

  const indice = indiceDeFichas(fichas);
  for (const obra of obrasDeCitas(citas)) {
    if (indice.has(clave(obra.autor, obra.forma))) continue;
    const n = obra.citas.length;
    fallos.push(
      `  · La Obra «${obra.grafias[0].literal}» de ${obra.autor} no tiene Ficha de Obra ` +
        `(${n} ${n === 1 ? 'Cita publicada' : 'Citas publicadas'}). Créela con ` +
        `«${ORDEN_DE_SEMBRAR_OBRAS}»; las fichas no se escriben a mano.`,
    );
  }

  fallos.push(...fallosOrtograficos(citas, documentos));

  return fallos;
}

/**
 * Lo que avisa y no rompe, ya redactado:
 *
 *   · una ficha que no resuelve ninguna Cita publicada (22.1);
 *   · dos formas del mismo Autor en fichas distintas, una prefijo de palabra de la otra,
 *     salvo que alguna de las dos declare a la otra en `distintaDe` (22.2);
 *   · un `distintaDe` que nombra una forma que no reclama ninguna ficha activa del mismo
 *     Autor: una declaración rancia, que ya no separa nada (22.2);
 *   · un título que ya no es una grafía declarada por ninguna Cita publicada de la Obra: la
 *     grafía efectiva pasa a ser la de `grafiaPorOmision` (22.2, `tituloEfectivo`).
 */
export function avisosDeObras(
  fichas: readonly FichaDeObra[],
  citas: readonly CitaConObra[],
): string[] {
  const ordenadas = [...fichas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const reclamadas = new Set(obrasDeCitas(citas).map((o) => clave(o.autor, o.forma)));
  const avisos: string[] = [];

  for (const ficha of ordenadas) {
    if (ficha.formas.some((forma) => reclamadas.has(clave(ficha.autor, forma)))) continue;
    avisos.push(
      `  · ${ficha.ruta} → ninguna Cita publicada resuelve esta ficha. Si la Obra salió del ` +
        'Corpus, retírela con «npm run obra -- retirar».',
    );
  }

  avisos.push(...avisosDePrefijo(ordenadas));
  avisos.push(...avisosDeDistintaRancia(ordenadas));

  const grafias = grafiasPorFicha(ordenadas, citas);
  for (const ficha of ordenadas) {
    const suyas = grafias.get(ficha.nombre) ?? [];
    if (suyas.length === 0 || suyas.some((g) => mismaGrafia(g.literal, ficha.titulo))) continue;
    avisos.push(
      `  · ${ficha.ruta} → su título «${ficha.titulo}» ya no lo declara ninguna Cita ` +
        `publicada de la Obra; la grafía efectiva es «${grafiaPorOmision(suyas)}». ` +
        'Elíjalo con «npm run obra -- titular <ficha> "<grafía>"».',
    );
  }

  return avisos;
}

/** El texto que detiene la construcción. El detalle va aparte, por el registro. */
export function titularDeFallosDeObras(cuantos: number): string {
  return cuantos === 1
    ? 'Obras: 1 incumplimiento en las Fichas de Obra.'
    : `Obras: ${cuantos} incumplimientos en las Fichas de Obra.`;
}

export function formatearFallosDeObras(fallos: readonly string[]): string {
  return ['Las Fichas de Obra no sostienen las Obras publicadas:', ...fallos, ''].join('\n');
}

export function formatearAvisosDeObras(avisos: readonly string[]): string {
  return ['Fichas de Obra (avisa, no rompe):', ...avisos, ''].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Una obra, un nombre — Historia 22.2
// ─────────────────────────────────────────────────────────────────────────────

/** La orden que restituye la grafía de una Cita del censo a la cabecera de su documento. */
export const ORDEN_DE_RESTITUIR_GRAFIA = 'npm run obra -- restituir-grafia';

/** La orden que da documento a una Cita ya publicada. */
export const ORDEN_DE_DOCUMENTAR = 'npm run documentar';

/**
 * Lo que la puerta ortográfica sabe de los documentos de `corpus/fuentes/`, ya leído.
 *
 * Lo compone quien lee disco —`integraciones/obras.ts`— para que esto siga siendo puro: la
 * regla de qué documento es de qué Cita (`documentosDeCita`) vive en `tools/lib/` y
 * aquí solo llega su resultado.
 */
export interface DocumentosDeObras {
  /**
   * Por slug de Cita, la `obra:` de la cabecera de **cada** documento suyo: uno por página
   * si la Obra está paginada. Una Cita sin documento no está, o está con la lista vacía.
   */
  cabecerasDeCita: ReadonlyMap<string, readonly string[]>;
  /**
   * Los pares (Autor, forma) —con `clave`— de los documentos versionados: la forma de su
   * `obra:` de cabecera y cada Autor del Corpus que concuerda con quien firma el documento.
   * Un documento que no declara autor, o que declara uno que no concuerda con ninguno, no
   * entra: no se puede afirmar de quién es.
   */
  formasConDocumento: ReadonlySet<string>;
  /** Los slugs del censo de Citas sin documento: solo a ellos se aplica `restituir-grafia`. */
  censo: ReadonlySet<string>;
}

const SIN_DOCUMENTOS: DocumentosDeObras = {
  cabecerasDeCita: new Map(),
  formasConDocumento: new Set(),
  censo: new Set(),
};

/** Colapsa espacios y nada más: es toda la holgura que admite «literal». */
export function colapsar(texto: string): string {
  return texto.replace(/\s+/gu, ' ').trim();
}

/** Si dos grafías son la misma, colapsando espacios y nada más. */
export function mismaGrafia(a: string, b: string): boolean {
  return colapsar(a) === colapsar(b);
}

/**
 * Si una grafía es **literal de su Fuente**: igual, colapsando espacios y nada más, a la
 * `obra:` de la cabecera de alguno de sus documentos. Sin documentos no es literal: una
 * grafía tecleada no la respalda nadie.
 */
export function esGrafiaLiteral(obra: string, cabeceras: readonly string[]): boolean {
  const buscada = colapsar(obra);
  return buscada !== '' && cabeceras.some((cabecera) => colapsar(cabecera) === buscada);
}

/**
 * La puerta ortográfica. Para cada (Autor, forma) con dos o más grafías distintas entre sus
 * Citas publicadas, si alguna de esas Citas no tiene una grafía literal de su Fuente, rompe:
 * dos nombres para la misma Obra solo se admiten cuando los dos los escribe una Fuente.
 *
 * Cada línea nombra la forma, las grafías con su recuento, y cada fichero no literal con la
 * orden que lo arregla, y solo una que vaya a funcionar: `restituir-grafia` si la Cita está
 * en el censo y hay un documento versionado de su mismo Autor con esa forma —exactamente lo
 * que esa orden exige—, y `documentar` en cualquier otro caso.
 */
export function fallosOrtograficos(
  citas: readonly CitaConObra[],
  documentos: DocumentosDeObras = SIN_DOCUMENTOS,
): string[] {
  const fallos: string[] = [];
  const porSlug = new Map(citas.map((c) => [c.slug, c]));

  for (const obra of obrasDeCitas(citas)) {
    if (obra.grafias.length < 2) continue;
    const noLiterales = obra.citas
      .map((slug) => porSlug.get(slug))
      .filter((c): c is CitaConObra => c !== undefined)
      .filter(
        (c) =>
          !esGrafiaLiteral(
            c.procedencia?.obra as string,
            documentos.cabecerasDeCita.get(c.slug) ?? [],
          ),
      )
      .sort((a, b) => a.slug.localeCompare(b.slug, 'es'));
    if (noLiterales.length === 0) continue;

    const hayDocumento = documentos.formasConDocumento.has(clave(obra.autor, obra.forma));
    const lineas = noLiterales.map((c) => {
      const orden =
        hayDocumento && documentos.censo.has(c.slug)
          ? `${ORDEN_DE_RESTITUIR_GRAFIA} ${c.slug}`
          : `${ORDEN_DE_DOCUMENTAR} -- ${c.slug} corpus/fuentes/<documento>.txt`;
      return (
        `      ${c.ruta ?? c.slug} declara «${c.procedencia?.obra}», que no es literal de su ` +
        `Fuente → «${orden}»`
      );
    });
    fallos.push(
      `  · La Obra de forma «${obra.forma}» de ${obra.autor} se publica con ` +
        `${obra.grafias.length} grafías: ` +
        obra.grafias.map((g) => `«${g.literal}» ×${g.citas}`).join(', ') +
        '. Dos grafías solo se admiten si las dos son literales de su Fuente, y estas no:\n' +
        lineas.join('\n') +
        (hayDocumento
          ? ''
          : '\n      No hay ningún documento versionado de esta Obra de este Autor: recupérelo con ' +
            '«npx tsx tools/recuperar.ts <url>» antes de documentar.'),
    );
  }

  return fallos;
}

/** Las grafías declaradas por las Citas publicadas que resuelven cada ficha, por nombre. */
function grafiasPorFicha(
  fichas: readonly FichaDeObra[],
  citas: readonly CitaConObra[],
): Map<string, GrafiaDeObra[]> {
  // Historia 22.3 — las grafías salen de las Citas que resuelve cada ficha, con la misma
  // resolución que `resolverObras`: el título que se publica y el que se comprueba no pueden
  // contar Citas distintas.
  return new Map(
    [...citasPorFicha(fichas, citas)].map(([nombre, suyas]) => [nombre, grafiasDeCitas(suyas)]),
  );
}

/** Las grafías literales de unas Citas y cuántas usa cada una, por orden de aparición. */
function grafiasDeCitas(citas: readonly CitaConObra[]): GrafiaDeObra[] {
  const cuenta = new Map<string, number>();
  for (const cita of citas) {
    const obra = cita.procedencia?.obra as string;
    cuenta.set(obra, (cuenta.get(obra) ?? 0) + 1);
  }
  return [...cuenta].map(([literal, n]) => ({ literal, citas: n }));
}

/** Las grafías que declaran las Citas publicadas que resuelven una ficha. */
export function grafiasDeFicha(
  ficha: FichaDeObra,
  fichas: readonly FichaDeObra[],
  citas: readonly CitaConObra[],
): GrafiaDeObra[] {
  return grafiasPorFicha(fichas, citas).get(ficha.nombre) ?? [];
}

/**
 * El título que la Obra publica: el de su ficha mientras alguna Cita publicada lo declare, y
 * si no, el de `grafiaPorOmision`. `undefined` si ninguna Cita resuelve la ficha. Lo publica
 * la 22.3 por `resolverObras`, con la misma regla (`tituloDe`).
 */
export function tituloEfectivo(
  ficha: FichaDeObra,
  fichas: readonly FichaDeObra[],
  citas: readonly CitaConObra[],
): string | undefined {
  return tituloDe(ficha, grafiasDeFicha(ficha, fichas, citas));
}

/** Si una de las dos fichas declara a la otra distinta. */
export function declaradasDistintas(a: FichaDeObra, b: FichaDeObra): boolean {
  const declara = (x: FichaDeObra, y: FichaDeObra) =>
    (x.distintaDe ?? []).some((forma) => y.formas.includes(forma));
  return declara(a, b) || declara(b, a);
}

/**
 * Los pares de formas del mismo Autor, en fichas distintas, en que una es prefijo de palabra
 * de la otra —«proverbios y cantares» y «proverbios y cantares nuevas canciones»—. Pueden ser
 * la misma Obra o dos; decidirlo es de una persona, con `reunir` o `separar`, y el aviso se
 * calla en cuanto se decide.
 */
export function avisosDePrefijo(fichas: readonly FichaDeObra[]): string[] {
  const avisos: string[] = [];
  const ordenadas = [...fichas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  for (const corta of ordenadas) {
    for (const larga of ordenadas) {
      if (corta === larga || corta.autor !== larga.autor) continue;
      if (declaradasDistintas(corta, larga)) continue;
      for (const fc of corta.formas) {
        const fl = larga.formas.find((f) => f.startsWith(`${fc} `));
        if (fl === undefined) continue;
        avisos.push(
          `  · ${corta.autor}: «${fc}» (${corta.ruta}) es prefijo de «${fl}» (${larga.ruta}). ` +
            `Si son la misma Obra: «npm run obra -- reunir ${corta.nombre} ${larga.nombre}» ` +
            '(la primera es la que queda; al revés si debe quedar la otra); si no: ' +
            `«npm run obra -- separar ${corta.nombre} ${larga.nombre}».`,
        );
        break;
      }
    }
  }
  return avisos;
}

/**
 * Los `distintaDe` rancios: formas que ninguna ficha activa del mismo Autor reclama. La
 * declaración ya no separa nada —la otra ficha se retiró o se reunió en otra— y conviene
 * saberlo antes de que una forma nueva la herede sin que nadie la haya decidido.
 */
export function avisosDeDistintaRancia(fichas: readonly FichaDeObra[]): string[] {
  const reclamadas = new Set(fichas.flatMap((f) => f.formas.map((forma) => clave(f.autor, forma))));
  const avisos: string[] = [];
  for (const ficha of [...fichas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
    for (const forma of ficha.distintaDe ?? []) {
      if (reclamadas.has(clave(ficha.autor, forma))) continue;
      avisos.push(
        `  · ${ficha.ruta} → se declara distinta de «${forma}», y ninguna ficha activa de ` +
          `${ficha.autor} reclama esa forma: es una declaración rancia, que ya no separa nada.`,
      );
    }
  }
  return avisos;
}

// ─────────────────────────────────────────────────────────────────────────────
// La obra se llama igual en todas partes — Historia 22.3
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Una Obra ya resuelta: su ficha y lo que se deriva de sus Citas publicadas.
 *
 * Es lo **único** que las superficies leen de la Obra. Antes cada una nombraba la obra con el
 * `procedencia.obra` de la Cita que tenía delante, y en cuanto una ficha reúne dos grafías la
 * misma Obra habría salido con dos nombres según por dónde se mirara. Fuera de este módulo y
 * de la admisión, nadie lee `procedencia.obra` (lo fija `tests/unit/obras.test.ts`).
 */
export interface ObraResuelta {
  /** Nombre de la ficha: la identidad de URL de la Obra. */
  nombre: string;
  autor: string;
  /** El título que se publica: el `tituloEfectivo` de la 22.2. */
  titulo: string;
  /**
   * El año de la Obra, **solo** si todas las Citas que declaran `procedencia.año` coinciden.
   * Si discrepan se omite —nunca se infiere ni se elige— y el build avisa
   * (`avisosDeAñosDeObras`). El de una traducción no cuenta: es de la edición (19.1).
   *
   * No es el año que acompaña al título en la Atribución ni en lo copiado: ahí va el de la
   * Procedencia de **esa** Cita.
   */
  año?: number;
  /** Los identificadores de Fuente distintos de sus Citas, ordenados. */
  fuentes: string[];
  /** Si alguna de sus Citas tiene Fuente: hay edición cotejada que enseñar. */
  edicionCotejada: boolean;
  /** La unión de los Temas de sus Citas, ordenada. */
  temas: string[];
  /** Cuántas Citas publicadas la resuelven. */
  recuento: number;
  /**
   * La nota de la ficha, tal como la escribió Héctor (22.6, UX-DR44). Solo la pinta la página
   * 1 de la Página de Obra, al pie: nunca la meta ni la Tarjeta.
   */
  nota?: string;
  /**
   * Las ediciones en venta de la ficha (22.9). Solo las pinta la página 1 de la Página de Obra,
   * con la afiliación encendida y alguna edición cotejada (FR-54): nunca van solas.
   */
  ediciones?: readonly EdicionDeObra[];
}

/** Lo que de una Cita importa para derivar los atributos de su Obra. */
export interface CitaParaObra extends CitaConObra {
  procedencia?: { obra?: string; año?: number } | null;
  temas?: readonly string[];
  fuente?: { id: string } | null;
}

/** El título publicado, con la regla de `tituloEfectivo`, sobre grafías ya contadas. */
function tituloDe(ficha: FichaDeObra, grafias: readonly GrafiaDeObra[]): string | undefined {
  if (grafias.length === 0) return undefined;
  return grafias.some((g) => mismaGrafia(g.literal, ficha.titulo))
    ? ficha.titulo
    : grafiaPorOmision(grafias);
}

/** Las Citas que resuelve cada ficha, por nombre de ficha. */
function citasPorFicha<C extends CitaConObra>(
  fichas: readonly FichaDeObra[],
  citas: readonly C[],
): Map<string, C[]> {
  const indice = indiceDeFichas(fichas);
  const porFicha = new Map<string, C[]>();
  for (const cita of citas) {
    const ficha = fichaDeCita(cita, indice);
    if (ficha === undefined) continue;
    porFicha.set(ficha.nombre, [...(porFicha.get(ficha.nombre) ?? []), cita]);
  }
  return porFicha;
}

/**
 * Si una Cita tiene Fuente: un único criterio para `fuentes` y `edicionCotejada`, que si no
 * podrían decir a la vez «hay edición cotejada» y «ninguna Fuente».
 */
function tieneFuente<C extends CitaParaObra>(cita: C): cita is C & { fuente: { id: string } } {
  return typeof cita.fuente?.id === 'string' && cita.fuente.id !== '';
}

/** Los años distintos que declaran las Procedencias de unas Citas, ordenados. */
function añosDeclarados(citas: readonly CitaParaObra[]): number[] {
  const años = new Set<number>();
  for (const cita of citas) {
    // Solo `procedencia.año`: `procedencia.traduccion.año` es de la edición (19.1).
    const año = cita.procedencia?.año;
    if (typeof año === 'number') años.add(año);
  }
  return [...años].sort((a, b) => a - b);
}

/**
 * Los atributos derivados de cada Obra, por nombre de ficha.
 *
 * Recibe las Citas publicadas y las fichas **ya admitidas**. Devuelve una entrada por ficha,
 * también para la que no resuelve ninguna Cita —con `recuento` 0 y su `titulo` declarado—,
 * porque esa avisa y no rompe (22.1).
 */
export function resolverObras(
  citas: readonly CitaParaObra[],
  fichas: readonly FichaDeObra[],
): Map<string, ObraResuelta> {
  // Un único origen de grafías por ficha: `citasPorFicha`, el mismo del que tira
  // `grafiasPorFicha` y, por ella, `tituloEfectivo`.
  const porFicha = citasPorFicha(fichas, citas);
  const resueltas = new Map<string, ObraResuelta>();

  for (const ficha of [...fichas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
    const suyas = porFicha.get(ficha.nombre) ?? [];
    const años = añosDeclarados(suyas);
    const cotejadas = suyas.filter(tieneFuente);
    const fuentes = [...new Set(cotejadas.map((c) => c.fuente.id))].sort((a, b) =>
      a.localeCompare(b, 'es'),
    );
    const temas = [...new Set(suyas.flatMap((c) => c.temas ?? []))].sort((a, b) =>
      a.localeCompare(b, 'es'),
    );

    resueltas.set(ficha.nombre, {
      nombre: ficha.nombre,
      autor: ficha.autor,
      titulo: tituloDe(ficha, grafiasDeCitas(suyas)) ?? ficha.titulo,
      ...(años.length === 1 ? { año: años[0] } : {}),
      fuentes,
      edicionCotejada: cotejadas.length > 0,
      temas,
      recuento: suyas.length,
      ...(ficha.nota !== undefined ? { nota: ficha.nota } : {}),
      ...(ficha.ediciones !== undefined ? { ediciones: ficha.ediciones } : {}),
    });
  }

  return resueltas;
}

/**
 * La Obra resuelta de una Cita, o `undefined` si no declara obra o ninguna ficha la reclama.
 * Es la consulta que usan quien cuelga la Obra en cada Cita y quien la necesite suelta.
 */
export function obraDeCita(
  cita: CitaConObra,
  fichas: readonly FichaDeObra[] | Map<string, FichaDeObra>,
  obras: ReadonlyMap<string, ObraResuelta>,
): ObraResuelta | undefined {
  const ficha = fichaDeCita(cita, fichas);
  return ficha === undefined ? undefined : obras.get(ficha.nombre);
}

/**
 * Las Citas con su Obra resuelta colgada en `obra`. Una Cita sin Obra no lleva el campo
 * —se omite, nunca `undefined` escrito—, como cualquier opcional del corpus.
 */
export function colgarObras<C extends CitaParaObra>(
  citas: readonly C[],
  fichas: readonly FichaDeObra[],
): (C & { obra?: ObraResuelta })[] {
  const obras = resolverObras(citas, fichas);
  const indice = indiceDeFichas(fichas);
  return citas.map((cita) => {
    const obra = obraDeCita(cita, indice, obras);
    if (obra !== undefined) return { ...cita, obra };
    // Una Obra colgada antes que ninguna ficha resuelve ya se quita: nunca se arrastra.
    if (!('obra' in cita)) return cita;
    const { obra: _anterior, ...sinObra } = cita as C & { obra?: ObraResuelta };
    return sinObra as C;
  });
}

/**
 * «Obra con años discrepantes»: las Citas de una misma Obra declaran años distintos, así que
 * la Obra no publica año. Avisa y no rompe: cada Cita sigue mostrando el suyo, y decidir cuál
 * es el de la Obra —o si alguna Cita está mal fechada— es de una persona.
 */
export function avisosDeAñosDeObras(
  fichas: readonly FichaDeObra[],
  citas: readonly CitaParaObra[],
): string[] {
  const porFicha = citasPorFicha(fichas, citas);
  const avisos: string[] = [];
  for (const ficha of [...fichas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
    const años = añosDeclarados(porFicha.get(ficha.nombre) ?? []);
    if (años.length < 2) continue;
    avisos.push(
      `  · Obra con años discrepantes: ${ficha.ruta} → sus Citas declaran ${años.join(', ')}. ` +
        'La Obra no publica año; cada Cita sigue mostrando el de su Procedencia.',
    );
  }
  return avisos;
}

/**
 * «Ediciones sin edición cotejada» — Historia 22.9, FR-54.
 *
 * Una ficha que declara ediciones en venta y ninguna de cuyas Citas publicadas tiene Fuente:
 * la página no las pinta —la edición en venta nunca va sola ni en lugar de la cotejada—, con
 * la afiliación encendida o apagada. Avisa y no rompe: documentar una Cita lo corrige, y
 * retirar el documento de la última no puede tumbar el sitio.
 */
export function avisosDeEdicionesSinCotejada(
  fichas: readonly FichaDeObra[],
  citas: readonly CitaParaObra[],
): string[] {
  const porFicha = citasPorFicha(fichas, citas);
  const avisos: string[] = [];
  for (const ficha of [...fichas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
    const ediciones = ficha.ediciones ?? [];
    if (ediciones.length === 0) continue;
    if ((porFicha.get(ficha.nombre) ?? []).some(tieneFuente)) continue;
    avisos.push(
      `  · Ediciones sin edición cotejada: ${ficha.ruta} → declara ${ediciones.length} ` +
        `${ediciones.length === 1 ? 'edición' : 'ediciones'} en venta y ninguna de sus Citas ` +
        'publicadas tiene documento cotejado. No se pintan: la edición en venta nunca va sola (FR-54).',
    );
  }
  return avisos;
}

// ─────────────────────────────────────────────────────────────────────────────
// El orden del libro — Historia 24.1, AD-23, AD-25
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dónde cae el texto de una Cita en uno de sus documentos de Fuente: el nombre del documento
 * (sin extensión) y la posición de su primera aparición en el cuerpo colapsado.
 *
 * Lo calcula la composición de `tools/lib/posiciones.ts` con el mismo localizador que comprueba
 * que el texto aparece en su documento, y lo entrega la colección `posiciones` de
 * `src/content.config.ts`. Nunca se escribe en el fichero de la Cita: se recalcula en cada
 * construcción.
 */
export interface AparicionDeCita {
  documento: string;
  posicion: number;
}

/** Las apariciones de cada Cita, por el `slug` de su frontmatter; sin ordenar ni elegir. */
export type PosicionesDeCitas = ReadonlyMap<string, readonly AparicionDeCita[]>;

/** Un trozo de nombre de documento que se lee como número: arábigo, o romano canónico. */
const ARABIGO = /^\d+$/u;
const ROMANO = /^m{0,3}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/u;
const VALOR_ROMANO: Readonly<Record<string, number>> = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };

/** Comparación por unidades de código, la que no depende de la configuración regional. */
function porUnidades(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** El valor de un romano ya validado por `ROMANO`. */
function valorRomano(romano: string): number {
  let valor = 0;
  for (let i = 0; i < romano.length; i += 1) {
    const actual = VALOR_ROMANO[romano[i]];
    const siguiente = i + 1 < romano.length ? VALOR_ROMANO[romano[i + 1]] : 0;
    valor += actual < siguiente ? -actual : actual;
  }
  return valor;
}

/**
 * El valor de un trozo que se lee como número, en decimal y sin ceros a la izquierda, o
 * `undefined` si es palabra. En cadena y no en `number` para que un arábigo de muchas cifras
 * se compare exacto.
 */
function valorDeTrozo(trozo: string): string | undefined {
  if (ARABIGO.test(trozo)) return trozo.replace(/^0+(?=\d)/u, '');
  if (trozo !== '' && ROMANO.test(trozo)) return String(valorRomano(trozo));
  return undefined;
}

/** Dos valores decimales sin ceros a la izquierda: el más corto es el menor. */
function porValor(a: string, b: string): number {
  return a.length - b.length || porUnidades(a, b);
}

/**
 * El orden natural de dos documentos de Fuente — Historia 24.1.
 *
 * Se trocea el nombre por `-` (los segmentos vacíos de `--` cuentan como palabra vacía). Un
 * trozo es número si es arábigo o un romano en forma canónica minúscula; dos números se
 * comparan por valor y, a igual valor, por la cadena; dos palabras, por unidades de código; y
 * **la palabra va antes que el número**, que es «proemio» antes de «i». Si un nombre es prefijo
 * del otro, el corto va primero: el documento de la obra entera antes que sus páginas.
 *
 * Mientras los documentos de una Obra compartan `{fuente}--{obra}` —en el Corpus de hoy, todos
 * los de una misma Fuente—, equivale al orden del slug de la página en su Fuente. Una Obra
 * reunida con varias formas (`npm run obra -- reunir`) ordena sus documentos de una Fuente
 * forma a forma, por el slug de cada una.
 *
 * Límites aceptados hasta que se capture el índice de subpáginas de la Fuente, que es lo que
 * los corregirá (no hay detector de desorden):
 *   · una palabra que es romano canónico («mi», «di») se lee como número;
 *   · la palabra va antes que el número también al final del libro: «epilogo», «notas» o
 *     «apendice» van antes que «i»;
 *   · los ordinales escritos («jornada-primera», «libro-segundo») y los trozos de cifra y
 *     letra («10a», «1o») son palabras, por unidades de código: «cuarta» antes que «primera»,
 *     «10a» antes que «1o», y los dos antes que cualquier número;
 *   · las páginas con nombre de capítulo («la-gitanilla», «el-coloquio-de-los-perros») van
 *     por orden alfabético, no por el del libro.
 */
export function compararDocumentos(a: string, b: string): number {
  const trozosA = a.split('-');
  const trozosB = b.split('-');
  for (let i = 0; i < Math.min(trozosA.length, trozosB.length); i += 1) {
    const ta = trozosA[i];
    const tb = trozosB[i];
    if (ta === tb) continue;
    const va = valorDeTrozo(ta);
    const vb = valorDeTrozo(tb);
    if (va !== undefined && vb !== undefined) {
      const orden = porValor(va, vb) || porUnidades(ta, tb);
      if (orden !== 0) return orden;
      continue;
    }
    if (va !== undefined) return 1;
    if (vb !== undefined) return -1;
    return porUnidades(ta, tb);
  }
  return trozosA.length - trozosB.length;
}

/** De las apariciones de una Cita, la del primer documento en orden natural. */
function primeraAparicion(apariciones: readonly AparicionDeCita[]): AparicionDeCita | undefined {
  let primera: AparicionDeCita | undefined;
  for (const aparicion of apariciones) {
    if (
      primera === undefined ||
      (compararDocumentos(aparicion.documento, primera.documento) || aparicion.posicion - primera.posicion) < 0
    ) {
      primera = aparicion;
    }
  }
  return primera;
}

/** Por slug, en español y, si la colación los iguala, por unidades de código. */
function porSlug(a: { slug: string }, b: { slug: string }): number {
  return a.slug.localeCompare(b.slug, 'es') || porUnidades(a.slug, b.slug);
}

/**
 * Las Citas de una Obra en el orden del libro — Historia 24.1, AD-25.
 *
 * Es el **único** sitio que ordena las Citas de una Obra, y recibe las posiciones por parámetro
 * (AD-5): no lee disco ni colecciones. Primero la Fuente que más Citas situadas aporta —a
 * igualdad, el identificador menor—; dentro, el documento en orden natural
 * (`compararDocumentos`), tomando cada Cita su aparición del primero; luego la posición en ese
 * documento y, a igual documento y posición, el slug. Al final, por slug, las Citas sin Fuente
 * o sin ninguna aparición: las del censo, que no tienen documento del que tomar un sitio.
 *
 * No depende del orden de la entrada, ni del de las apariciones, ni de la indexabilidad de la
 * Obra: una Obra indexable, con `noindex` o congelada se lee igual.
 */
export function ordenDelLibro<C extends { slug: string; fuente?: { id: string } | null }>(
  citas: readonly C[],
  posiciones: PosicionesDeCitas,
): C[] {
  const situadas: { cita: C; fuente: string; aparicion: AparicionDeCita }[] = [];
  const sueltas: C[] = [];
  for (const cita of citas) {
    const fuente = cita.fuente?.id;
    const aparicion = primeraAparicion(posiciones.get(cita.slug) ?? []);
    if (typeof fuente !== 'string' || fuente === '' || aparicion === undefined) sueltas.push(cita);
    else situadas.push({ cita, fuente, aparicion });
  }

  const porFuente = new Map<string, number>();
  for (const { fuente } of situadas) porFuente.set(fuente, (porFuente.get(fuente) ?? 0) + 1);
  const rango = new Map(
    [...porFuente.entries()]
      .sort((a, b) => b[1] - a[1] || porUnidades(a[0], b[0]))
      .map(([fuente], i) => [fuente, i] as const),
  );

  situadas.sort(
    (a, b) =>
      (rango.get(a.fuente) ?? 0) - (rango.get(b.fuente) ?? 0) ||
      compararDocumentos(a.aparicion.documento, b.aparicion.documento) ||
      a.aparicion.posicion - b.aparicion.posicion ||
      porSlug(a.cita, b.cita),
  );
  return [...situadas.map((s) => s.cita), ...[...sueltas].sort(porSlug)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Dónde leer esta obra — Historia 22.6, UX-DR42 y UX-DR50 (c, d)
// ─────────────────────────────────────────────────────────────────────────────

/** Lo que de la Fuente de una Cita importa para nombrarla y enlazarla. */
export interface FuenteParaLeer {
  id: string;
  url: string;
  nombre?: string;
  licencia?: string;
}

/**
 * El anfitrión de una dirección, sin `www.`, o `undefined` si no es una URL. Es el rótulo de
 * reserva de una Fuente que no declara nombre: nunca la URL desnuda (UX-DR21).
 */
export function anfitrionDe(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

/**
 * Cómo se nombra una Fuente: su `nombre` si consta; si no, su anfitrión; si la dirección no se
 * deja leer, su identificador. Es la regla de la Línea de la Fuente (`Fuente.astro`) y la de
 * «Dónde leer esta obra»: una sola, para que la misma Fuente no se llame de dos maneras según la
 * página.
 */
export function rotuloDeFuente(
  fuente: Pick<FuenteParaLeer, 'url' | 'nombre'> & { id?: string },
): string | undefined {
  return fuente.nombre ?? anfitrionDe(fuente.url) ?? (fuente.id !== '' ? fuente.id : undefined);
}

/** El rótulo de una Fuente de la que no se sabe ni nombre, ni anfitrión, ni identificador. */
export const ROTULO_DE_FUENTE_SIN_NOMBRE = 'Fuente sin nombre';

/** Lo que de una Cita importa para decir dónde leer su Obra. */
export interface CitaParaDondeLeer {
  fuente?: FuenteParaLeer | null;
  procedencia?: { traduccion?: { traductor: string; año?: number } } | null;
}

/** Una línea de «Edición cotejada, gratuita»: una Fuente, o una traducción en una Fuente. */
export interface LineaDondeLeer {
  /** El nombre de la Fuente (`rotuloDeFuente`). Es el texto del enlace. */
  nombre: string;
  /** La licencia, solo si **todas** las Citas del grupo la declaran y dicen la misma. */
  licencia?: string;
  /** Cuántas páginas distintas de la Fuente reúne el grupo, ya normalizadas. */
  paginas: number;
  /**
   * Con una página, esa dirección; con varias, la entrada de la obra (`entradaComun`), solo
   * donde la estructura de la Fuente la garantiza. Si no, no hay enlace: nunca se inventa uno.
   */
  enlace?: string;
  /** El traductor y, si **todas** sus Citas lo declaran igual, el año de la traducción. */
  traduccion?: { traductor: string; año?: number };
  /** Cuántas Citas de la Obra salen de este grupo: decide el orden. */
  citas: number;
}

export interface ResumenDondeLeer {
  lineas: LineaDondeLeer[];
  /** Cuántas Citas de la Obra no declaran Fuente: el estado (c) o (d) de UX-DR50. */
  citasSinDocumento: number;
  total: number;
}

/**
 * El valor si **todas** lo declaran y coinciden; si alguna lo omite o discrepa, `undefined`.
 * Una licencia o un año que solo dicen algunas Citas no es de la edición entera.
 */
function valorComun<T>(valores: readonly (T | undefined)[]): T | undefined {
  if (valores.length === 0 || valores.some((v) => v === undefined)) return undefined;
  return new Set(valores).size === 1 ? valores[0] : undefined;
}

/** Un tramo de ruta sin escapes, o tal cual si sus escapes no se dejan leer. */
function sinEscapes(tramo: string): string {
  try {
    return decodeURIComponent(tramo);
  } catch {
    return tramo;
  }
}

/**
 * Una dirección en forma canónica, para no contar dos veces la misma página: sin fragmento ni
 * barra final, con cada tramo de la ruta escapado de una sola manera (los `%xx` en mayúsculas)
 * y la versión móvil de Wikisource (`es.m.wikisource.org`) como la de escritorio. Una dirección
 * ilegible se devuelve tal cual.
 */
export function paginaNormalizada(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  u.hash = '';
  u.hostname = u.hostname.replace(/\.m\.wikisource\.org$/u, '.wikisource.org');
  const tramos = u.pathname.split('/').filter((t) => t !== '');
  u.pathname = `/${tramos.map((t) => encodeURIComponent(sinEscapes(t))).join('/')}`;
  return u.href.replace(/%[0-9a-f]{2}/giu, (escape) => escape.toUpperCase());
}

/**
 * La entrada de una obra repartida en varias páginas, **solo** donde la estructura de la Fuente
 * la garantiza: las subpáginas de Wikisource. `…/wiki/Padre/Sub…` es, por construcción de
 * Wikisource, una subpágina de `…/wiki/Padre`, así que con todas las direcciones bajo el mismo
 * `Padre` la entrada es `…/wiki/Padre`.
 *
 * En cualquier otro caso —otra Fuente, como Gutenberg (`/cache/epub/N/…`), páginas de primer
 * nivel distintas, otro anfitrión, una consulta— devuelve `undefined` y la línea va sin enlace:
 * un prefijo común no es una página, y enlazarlo sería inventar una dirección.
 */
export function entradaComun(urls: readonly string[]): string | undefined {
  let partes: URL[];
  try {
    partes = urls.map((u) => new URL(paginaNormalizada(u)));
  } catch {
    return undefined;
  }
  if (partes.length === 0) return undefined;
  const origen = partes[0].origin;
  if (!/^https?:\/\/[a-z]+\.wikisource\.org$/u.test(origen)) return undefined;
  if (partes.some((u) => u.origin !== origen || u.search !== '')) return undefined;

  const padres = new Set<string>();
  let algunaSubpagina = false;
  for (const u of partes) {
    const [espacio, padre, ...sub] = u.pathname.split('/').filter((t) => t !== '');
    if (espacio !== 'wiki' || padre === undefined) return undefined;
    padres.add(padre);
    if (sub.length > 0) algunaSubpagina = true;
  }
  if (padres.size !== 1 || !algunaSubpagina) return undefined;
  return `${origen}/wiki/${[...padres][0]}`;
}

/**
 * El `id` de «Dónde leer esta obra» — Historia 24.7, UX-DR96.
 *
 * Un solo dueño para las tres lecturas del identificador: el `href` del salto de la Cabecera de
 * Obra, el `id` del rótulo de la sección y su `aria-labelledby`. Escrito en tres sitios, cambiar
 * uno dejaría el salto apuntando a nada sin que el build lo notara. El valor no cambia: es el
 * fragmento que ya llevaba la sección desde la 22.6.
 */
export const ANCLA_DE_DONDE_LEER = 'donde-leer-esta-obra';

/**
 * El nombre de «Dónde leer esta obra» — Historia 24.7, UX-DR96.
 *
 * El texto del rótulo de la sección y el del salto que va a ella son el mismo a propósito: quien
 * activa «Dónde leer esta obra ↓» tiene que llegar a un encabezado que se llame igual. Escrito
 * dos veces, renombrar la sección dejaría al salto anunciando el nombre viejo.
 */
export const ROTULO_DE_DONDE_LEER = 'Dónde leer esta obra';

/**
 * Dónde leer una Obra — Historia 22.6, UX-DR42.
 *
 * Agrupa las Citas **con Fuente** por (Fuente, traductor): una traducción es otra edición, así
 * que dos traductores en la misma Fuente son dos líneas. Las ordena de más a menos Citas y, a
 * igualdad, por nombre de Fuente. Todo sale de datos ya publicados en cada Cita; nada se
 * consulta ni se compone.
 *
 * Ninguna Cita con Fuente se cae del recuento: un grupo que no se deja rotular ni enlazar va
 * sin enlace y con el rótulo de reserva, y sus Citas cuentan como cotejadas. Así el estado (c)
 * sale solo cuando de verdad ninguna Cita tiene `fuente`.
 */
export function dondeLeer(citas: readonly CitaParaDondeLeer[]): ResumenDondeLeer {
  const grupos = new Map<
    string,
    { id: string; fuentes: FuenteParaLeer[]; traducciones: ({ traductor: string; año?: number } | undefined)[] }
  >();
  let citasSinDocumento = 0;

  for (const cita of citas) {
    const fuente = cita.fuente;
    if (fuente === undefined || fuente === null) {
      citasSinDocumento += 1;
      continue;
    }
    const traduccion = cita.procedencia?.traduccion;
    const llave = `${fuente.id}\u0000${traduccion?.traductor ?? ''}`;
    const grupo = grupos.get(llave) ?? { id: fuente.id, fuentes: [], traducciones: [] };
    grupo.fuentes.push(fuente);
    grupo.traducciones.push(traduccion);
    grupos.set(llave, grupo);
  }

  const lineas: LineaDondeLeer[] = [];
  for (const { id, fuentes, traducciones } of grupos.values()) {
    const urls = [...new Set(fuentes.map((f) => paginaNormalizada(f.url)))].sort();
    // Con nombres que discrepan no se elige el primero que llegue: se rotula como sin nombre.
    const nombre =
      rotuloDeFuente({ id, url: urls[0], nombre: valorComun(fuentes.map((f) => f.nombre)) }) ??
      ROTULO_DE_FUENTE_SIN_NOMBRE;
    const licencia = valorComun(fuentes.map((f) => f.licencia));
    const traductor = traducciones[0]?.traductor;
    const año = valorComun(traducciones.map((t) => t?.año));
    const enlace =
      urls.length === 1 ? (anfitrionDe(urls[0]) !== undefined ? urls[0] : undefined) : entradaComun(urls);
    lineas.push({
      nombre,
      ...(licencia !== undefined ? { licencia } : {}),
      paginas: urls.length,
      ...(enlace !== undefined ? { enlace } : {}),
      ...(traductor !== undefined ? { traduccion: { traductor, ...(año !== undefined ? { año } : {}) } } : {}),
      citas: fuentes.length,
    });
  }

  lineas.sort(
    (a, b) =>
      b.citas - a.citas ||
      a.nombre.localeCompare(b.nombre, 'es') ||
      (a.traduccion?.traductor ?? '').localeCompare(b.traduccion?.traductor ?? '', 'es'),
  );

  return { lineas, citasSinDocumento, total: citas.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// La clave de orden de la búsqueda — Historia 27.1, AD-25
// ─────────────────────────────────────────────────────────────────────────────

/** El entero mayor que `f32` representa exacto: 2^24. Pagefind 1.5.2 ordena las claves así. */
const MAYOR_EXACTO_EN_F32 = 2 ** 24;

/** Las cifras de la clave: las de `MAYOR_EXACTO_EN_F32 − 1` (16.777.215), siempre las mismas. */
const CIFRAS_DE_LA_CLAVE = String(MAYOR_EXACTO_EN_F32 - 1).length;

/** El tope y el aviso de cada rango de la clave, por parámetro para las pruebas. */
export interface LimitesDeLaClaveDeOrden {
  /** El ancho de cada rango: un rango con tantas posiciones o más rompe. */
  tope: number;
  /** El recuento a partir del cual se avisa sin romper; `undefined`, no se avisa. */
  aviso: number | undefined;
}

/** Lo que de un Autor hace falta para su rango: su slug y su clave del Directorio. */
export interface AutorParaLaClave {
  slug: string;
  ordenAlfabetico?: string;
}

/** Lo que de una Cita hace falta para su clave: su Autor y, si la tiene, su Obra resuelta. */
export interface CitaParaLaClave {
  slug: string;
  autor: string;
  obra?: Pick<ObraResuelta, 'nombre' | 'titulo' | 'recuento'>;
}

/**
 * La clave de orden de cada Cita para `data-pagefind-sort` — Historia 27.1, AD-25.
 *
 * Es la **única** dueña de la clave: la escribe `src/components/FiltrosDeLaCita.astro` en toda
 * Página de Cita y nada más la compone. Filtrar por una Obra y ordenar por ella devuelve sus
 * Citas en el orden de su Página de Obra; filtrar por un Autor, en el de su lista de obras.
 *
 * Dos rangos de `B = limites.tope`: `clave = a·B + p`.
 *
 * - `a`, la posición del Autor en el orden del Directorio: `compararPorClave` de
 *   `src/lib/normalizar.ts` sobre su `ordenAlfabetico`, la función hermana de AD-3. Solo cuentan
 *   los Autores con alguna Cita en `citas`.
 * - `p`, la posición de la Cita dentro de su Autor: sus Obras en `ordenDeLaListaDeObras`, cada
 *   una en el orden que trae su lista de `porObra` —el del libro, con las Citas sin documento
 *   detrás por slug, que es la cola que ya da `ordenDelLibro`—, y al final el hueco «sin Obra»:
 *   las Citas sin Obra resuelta (también las de obra «…»), por slug.
 *
 * Se escribe en decimal con ceros hasta ocho cifras (`'00012345'`): Pagefind lee el entero, y
 * con un valor que no fuera numérico ordenaría como texto. Como un rango que alcanza `B` rompe,
 * caben `B − 1` posiciones por rango y la mayor clave que sale es `(B − 2)·B + (B − 2)`, por
 * debajo de `B² − 1`; con `B ≤ 4096` es exacta en `f32` (ver `MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN`).
 *
 * Pura y determinista ante el orden de la entrada. **Lanza**:
 *
 * - si el recuento de un rango alcanza su tope —como el aviso, «≥»—, nombrando el rango
 *   («Autor» o «posición dentro de {slug}»), el recuento y el tope: el build se para;
 * - si la lista de una Obra no casa con sus Citas —una Cita con Obra que falta en la lista de su
 *   Obra, o una lista que trae una Cita ajena—, nombrando la Obra y el slug;
 * - si `porObra` trae una lista no vacía de una Obra que ninguna Cita de la entrada resuelve
 *   —una lista huérfana o ajena—, nombrando la Obra;
 * - si un mismo slug de Cita viene dos veces en `citas`, nombrándolo: tendría dos posiciones;
 * - si un Autor con Citas no tiene clave de orden, o una Cita nombra un Autor que no está, como
 *   `agruparPorClave` del Directorio;
 * - si el tope no deja la clave mayor dentro de lo exacto en `f32`, o el aviso definido no es un
 *   entero entre 1 y `tope − 1` —por encima no avisaría nunca antes de romper—.
 *
 * Con `limites.aviso` definido, cada rango cuyo recuento lo alcanza avisa por `console.warn`
 * nombrando el rango y el recuento, y el build sigue.
 */
export function clavesDeOrden(
  autores: readonly AutorParaLaClave[],
  citas: readonly CitaParaLaClave[],
  porObra: ReadonlyMap<string, readonly { slug: string }[]>,
  limites: LimitesDeLaClaveDeOrden = {
    tope: MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN,
    aviso: AVISO_DE_RANGO_DE_LA_CLAVE_DE_ORDEN,
  },
): Map<string, string> {
  const { tope, aviso } = limites;
  if (!Number.isInteger(tope) || tope < 1 || tope * tope > MAYOR_EXACTO_EN_F32) {
    throw new Error(
      `El tope de la clave de orden (${tope}) tiene que ser un entero entre 1 y ` +
        `${Math.sqrt(MAYOR_EXACTO_EN_F32)}: con dos rangos, la clave mayor es tope² − 1, y por ` +
        `encima de ${MAYOR_EXACTO_EN_F32} Pagefind, que ordena como f32, empataría claves vecinas.`,
    );
  }
  if (aviso !== undefined && (!Number.isInteger(aviso) || aviso < 1 || aviso >= tope)) {
    throw new Error(
      `El aviso de la clave de orden (${aviso}, AVISO_DE_RANGO_DE_LA_CLAVE_DE_ORDEN) tiene que ser ` +
        `un entero entre 1 y ${tope - 1}: el tope (${tope}) rompe en ese recuento, y un aviso en él ` +
        'o por encima no avisaría nunca antes de romper.',
    );
  }

  /** Comprueba un rango: rompe si su recuento alcanza el tope, avisa si alcanza el aviso. */
  const medir = (rango: string, recuento: number): void => {
    if (recuento >= tope) {
      throw new Error(
        `La clave de orden de la búsqueda no cabe: el rango «${rango}» tiene ${recuento} ` +
          `posiciones y el tope es ${tope} (MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN, ` +
          'src/lib/umbrales.ts). Con dos rangos ya está en el techo de f32: hay que trocear la clave.',
      );
    }
    if (aviso !== undefined && recuento >= aviso) {
      console.warn(
        `Aviso: el rango «${rango}» de la clave de orden de la búsqueda tiene ${recuento} ` +
          `posiciones (aviso en ${aviso}, tope en ${tope}; AVISO_DE_RANGO_DE_LA_CLAVE_DE_ORDEN).`,
      );
    }
  };

  const delAutor = new Map<string, CitaParaLaClave[]>();
  const vistasDeCita = new Set<string>();
  const obrasDeLaEntrada = new Set<string>();
  for (const cita of citas) {
    if (vistasDeCita.has(cita.slug)) {
      throw new Error(
        `La Cita «${cita.slug}» viene dos veces en la entrada: la clave de orden de la búsqueda ` +
          'le daría dos posiciones.',
      );
    }
    vistasDeCita.add(cita.slug);
    if (cita.obra !== undefined) obrasDeLaEntrada.add(cita.obra.nombre);
    const suyas = delAutor.get(cita.autor);
    if (suyas === undefined) delAutor.set(cita.autor, [cita]);
    else suyas.push(cita);
  }
  for (const [nombre, lista] of porObra) {
    if (lista.length > 0 && !obrasDeLaEntrada.has(nombre)) {
      throw new Error(
        `La lista de la Obra «${nombre}» trae ${lista.length} Citas y ninguna Cita de la entrada ` +
          'resuelve esa Obra: la clave de orden de la búsqueda no sabe a quién pertenece.',
      );
    }
  }

  const porSlugDeAutor = new Map(autores.map((autor) => [autor.slug, autor]));
  const ordenables = [...delAutor.keys()].map((slug) => {
    const autor = porSlugDeAutor.get(slug);
    const clave = autor?.ordenAlfabetico;
    if (autor === undefined || clave === undefined) {
      throw new Error(
        [
          autor === undefined
            ? `Hay Citas del Autor «${slug}», que no está entre los Autores,`
            : `El Autor «${slug}» tiene Citas publicadas y no tiene clave de orden (ordenAlfabetico),`,
          'así que la clave de orden de la búsqueda no sabe dónde ponerlo.',
          'Lo para antes `integraciones/claves.ts`; si se llega aquí, esa puerta no corrió.',
          'La clave la propone `npx tsx tools/autor.ts proponer-claves`.',
        ].join(' '),
      );
    }
    return { clave, slug };
  });
  ordenables.sort(compararPorClave);
  medir('Autor', ordenables.length);

  const claves = new Map<string, string>();
  ordenables.forEach(({ slug: slugDeAutor }, a) => {
    const suyas = delAutor.get(slugDeAutor) ?? [];
    const conObra = new Map<string, CitaParaLaClave[]>();
    const sinObra: CitaParaLaClave[] = [];
    const obras = new Map<string, Pick<ObraResuelta, 'nombre' | 'titulo' | 'recuento'>>();
    for (const cita of suyas) {
      if (cita.obra === undefined) {
        sinObra.push(cita);
        continue;
      }
      obras.set(cita.obra.nombre, cita.obra);
      const deLaObra = conObra.get(cita.obra.nombre);
      if (deLaObra === undefined) conObra.set(cita.obra.nombre, [cita]);
      else deLaObra.push(cita);
    }

    const enOrden: string[] = [];
    for (const obra of ordenDeLaListaDeObras([...obras.values()])) {
      const propias = new Set((conObra.get(obra.nombre) ?? []).map((cita) => cita.slug));
      const lista = porObra.get(obra.nombre) ?? [];
      const vistas = new Set<string>();
      for (const { slug } of lista) {
        if (!propias.has(slug) || vistas.has(slug)) {
          throw new Error(
            `La lista de la Obra «${obra.nombre}» trae «${slug}», que ${
              vistas.has(slug) ? 'ya estaba en ella' : `no es una Cita de esa Obra de ${slugDeAutor}`
            }: la clave de orden de la búsqueda no sabe dónde ponerla.`,
          );
        }
        vistas.add(slug);
        enOrden.push(slug);
      }
      for (const slug of [...propias].sort()) {
        if (!vistas.has(slug)) {
          throw new Error(
            `La Cita «${slug}» es de la Obra «${obra.nombre}» y falta en su lista (citasDeLasObras): ` +
              'la clave de orden de la búsqueda no sabe dónde ponerla.',
          );
        }
      }
    }
    for (const cita of [...sinObra].sort(porSlug)) enOrden.push(cita.slug);

    medir(`posición dentro de ${slugDeAutor}`, enOrden.length);
    enOrden.forEach((slug, p) => {
      claves.set(slug, String(a * tope + p).padStart(CIFRAS_DE_LA_CLAVE, '0'));
    });
  });
  return claves;
}
