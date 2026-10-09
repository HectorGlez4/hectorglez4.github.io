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
}

/** Lo que de una Cita importa para resolver su Obra. */
export interface CitaConObra {
  slug: string;
  autor: string;
  procedencia?: { obra?: string } | null;
}

/** La forma de la obra de una Cita, o `undefined` si no declara obra. */
function formaDeCita(cita: CitaConObra): string | undefined {
  const obra = cita.procedencia?.obra;
  if (typeof obra !== 'string') return undefined;
  const forma = formaDeObra(obra);
  return forma === '' ? undefined : forma;
}

/** Clave del par (Autor, forma). */
function clave(autor: string, forma: string): string {
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
 *   · una ficha cuyo `autor` no existe en el Corpus.
 *
 * Una ficha sin Citas publicadas no está aquí: avisa y no rompe (`avisosDeObras`), porque
 * retirar una Cita no puede tumbar el sitio (AD-18).
 */
export function fallosDeObras(
  fichas: readonly FichaDeObra[],
  citas: readonly CitaConObra[],
  autores: Iterable<string>,
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

  return fallos;
}

/** Las fichas que no resuelve ninguna Cita publicada: avisan y no rompen. */
export function avisosDeObras(
  fichas: readonly FichaDeObra[],
  citas: readonly CitaConObra[],
): string[] {
  const reclamadas = new Set(
    obrasDeCitas(citas).map((o) => clave(o.autor, o.forma)),
  );
  return [...fichas]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .filter((ficha) => !ficha.formas.some((forma) => reclamadas.has(clave(ficha.autor, forma))))
    .map(
      (ficha) =>
        `  · ${ficha.ruta} → ninguna Cita publicada resuelve esta ficha. Si la Obra salió del ` +
          'Corpus, retírela con «npm run obra -- retirar».',
    );
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
  return ['Fichas de Obra sin ninguna Cita publicada (avisa, no rompe):', ...avisos, ''].join(
    '\n',
  );
}
