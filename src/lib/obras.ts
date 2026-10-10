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

import { normalizar } from './normalizar.ts';
import { slugDeObra } from './slug.ts';

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
