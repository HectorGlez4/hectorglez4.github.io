/**
 * Lo que las pruebas de punta a punta necesitan saber del Corpus, derivado y no fijado.
 *
 * Nace de un fallo con nombre: cinco pruebas fijaban **a mano** `'/tema/la-amistad'` como «el
 * Tema por debajo del umbral», y el encabezado de una de ellas lo explicaba —«el corpus sembrado
 * deja seis Temas por debajo»—. Aquel corpus tenía 231 Citas. Con 761, **los doce Temas están
 * publicados** y las cinco pruebas empezaron a fallar afirmando que un Tema publicado no debería
 * tener página.
 *
 * El arreglo no es cambiar el nombre fijado por otro: sería el mismo fallo esperando a la
 * siguiente siembra. Es preguntarle al Corpus, y cuando la condición **no existe**, decir que no
 * existe en vez de fingir que se comprobó.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { colgarObras, type FichaDeObra } from '../../../src/lib/obras.ts';
import { CITAS_POR_PAGINA, MIN_CITAS_POR_TEMA } from '../../../src/lib/umbrales.ts';
import { admiteImagen } from '../../../src/lib/tramos.ts';

const raiz = join(new URL('../../..', import.meta.url).pathname, 'corpus');

function campo(contenido: string, nombre: string): string | undefined {
  const linea = contenido.split('\n').find((l) => l.startsWith(`${nombre}:`));
  return linea?.slice(nombre.length + 1).trim().replace(/^"|"$/g, '');
}

/** Cuántas Citas publicadas declara cada Tema, por su slug. */
export function citasPorTema(): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const fichero of readdirSync(join(raiz, 'temas')).filter((f) => f.endsWith('.yml'))) {
    cuenta.set(fichero.replace(/\.yml$/, ''), 0);
  }

  for (const fichero of readdirSync(join(raiz, 'citas')).filter((f) => f.endsWith('.md'))) {
    const contenido = readFileSync(join(raiz, 'citas', fichero), 'utf8');
    for (const [, slug] of contenido.matchAll(/^\s+-\s+"([^"]+)"/gm)) {
      if (cuenta.has(slug)) cuenta.set(slug, cuenta.get(slug)! + 1);
    }
  }
  return cuenta;
}

/**
 * Un Tema declarado que **no** llega al umbral, o `undefined` si no hay ninguno.
 *
 * `undefined` no es un fallo del Corpus: es que hoy todos los Temas se publican. Quien lo use
 * tiene que saltar la prueba diciéndolo, no darla por buena.
 */
export function temaBajoUmbral(): string | undefined {
  for (const [slug, citas] of citasPorTema()) {
    if (citas < MIN_CITAS_POR_TEMA) return slug;
  }
  return undefined;
}

export interface ProcedenciaDeCita {
  obra?: string;
  año?: number;
}

/**
 * La Procedencia que **declara** una Cita del Corpus, por su slug.
 *
 * Existe por el mismo motivo que `temaBajoUmbral`: varias pruebas fijaban a mano el título de
 * una obra —«Don Quijote de la Mancha»— y el Corpus dice hoy «Don Quijote», porque la obra la
 * deriva la Fuente y esa Cita se resembró desde el documento de Gutenberg, que la nombra así.
 * FR-2 no admite escribir el título a mano en ninguna parte; tampoco en una prueba.
 *
 * Lo que estas pruebas quieren comprobar no es que ponga «Don Quijote de la Mancha»: es que la
 * página enseñe **lo que la Cita declara**. Eso es lo que sobrevive a la siguiente siembra.
 */
export function procedenciaDe(slug: string): ProcedenciaDeCita {
  for (const fichero of readdirSync(join(raiz, 'citas')).filter((f) => f.endsWith('.md'))) {
    const contenido = readFileSync(join(raiz, 'citas', fichero), 'utf8');
    if (campo(contenido, 'slug') !== slug) continue;

    const obra = campo(contenido, '  obra');
    const año = campo(contenido, '  año');
    return { obra, año: año === undefined ? undefined : Number(año) };
  }
  throw new Error(`No hay ninguna Cita con el slug «${slug}» en el Corpus.`);
}

/**
 * Una Cita con Procedencia **completa** —obra y año—, o `undefined` si no hay ninguna.
 *
 * La que estaba fijada para este caso tiene hoy obra y no año, porque su documento no lo
 * declara: dejó de servir para comprobar que se enseñan los dos.
 */
export function citaConProcedenciaCompleta():
  | { slug: string; obra: string; año: number }
  | undefined {
  for (const fichero of readdirSync(join(raiz, 'citas')).filter((f) => f.endsWith('.md'))) {
    const contenido = readFileSync(join(raiz, 'citas', fichero), 'utf8');
    const obra = campo(contenido, '  obra');
    const año = campo(contenido, '  año');
    const slug = campo(contenido, 'slug');
    if (obra !== undefined && año !== undefined && slug !== undefined) {
      return { slug, obra, año: Number(año) };
    }
  }
  return undefined;
}

/**
 * La Cita con Fuente cuya Obra declara el título más largo, por su slug —Historia 22.5—, para
 * medir la Atribución con un título que parte en varias líneas a 360 px y con la Línea de la
 * Fuente debajo. Se deriva y no se fija: el título más largo de hoy puede no serlo después de
 * la siguiente siembra. Empate, por slug.
 */
export function citaConObraMasLarga(): { slug: string; obra: string } | undefined {
  let mejor: { slug: string; obra: string } | undefined;
  for (const fichero of readdirSync(join(raiz, 'citas')).filter((f) => f.endsWith('.md'))) {
    const contenido = readFileSync(join(raiz, 'citas', fichero), 'utf8');
    const obra = campo(contenido, '  obra');
    const slug = campo(contenido, 'slug');
    if (obra === undefined || slug === undefined || !/^fuente:/m.test(contenido)) continue;
    if (
      mejor === undefined ||
      obra.length > mejor.obra.length ||
      (obra.length === mejor.obra.length && slug < mejor.slug)
    ) {
      mejor = { slug, obra };
    }
  }
  return mejor;
}

/**
 * Un campo de primer nivel de la Cita del Corpus de ese slug. Lanza, nombrándolo, si no hay
 * Cita con ese slug o si no declara el campo: un `undefined` que pasara por cadena acabaría en
 * una ruta como `/autor/undefined/` y en un fallo que no dice nada.
 */
function campoDeCita(slug: string, nombre: string): string {
  for (const fichero of readdirSync(join(raiz, 'citas')).filter((f) => f.endsWith('.md'))) {
    const contenido = readFileSync(join(raiz, 'citas', fichero), 'utf8');
    if (campo(contenido, 'slug') !== slug) continue;
    const valor = campo(contenido, nombre);
    if (valor === undefined) throw new Error(`La Cita «${slug}» (citas/${fichero}) no declara \`${nombre}\`.`);
    return valor;
  }
  throw new Error(`No hay ninguna Cita con el slug «${slug}» en el Corpus.`);
}

/** El texto literal de una Cita del Corpus, por su slug. */
export function textoDe(slug: string): string {
  return campoDeCita(slug, 'texto');
}

/** El slug del Autor que declara una Cita del Corpus, por el slug de la Cita. */
export function autorDe(slug: string): string {
  return campoDeCita(slug, 'autor');
}

/** Una Cita del Corpus con su Obra resuelta, como la cuelga el build. */
interface CitaResuelta {
  slug: string;
  autor: string;
  texto: string;
  /** El título que pinta la Tarjeta de Cita, o `undefined` si no lleva línea de Obra. */
  obra?: string;
  /** Si la Cita tiene Fuente: su Línea de la Fuente se pinta. */
  conFuente: boolean;
  /** Historia 24.4 — cuántas Citas tiene su Obra, como la cuenta el build. */
  recuento?: number;
  /** Historia 24.4 — si alguna Cita de su Obra está cotejada: la Tarjeta promete «dónde leerla». */
  edicionCotejada?: boolean;
}

/**
 * Las Citas del Corpus con el título de su Obra **resuelto por la misma función que el build**
 * (`colgarObras`, Historia 22.3): el de la Ficha de Obra que reclama su forma, o la grafía por
 * omisión si el título de la ficha ya no lo declara ninguna Cita. Nunca la grafía de la
 * Procedencia, que es lo que una prueba leería si mirara la Cita sola.
 */
function citasResueltas(): CitaResuelta[] {
  const citas = readdirSync(join(raiz, 'citas'))
    .filter((f) => f.endsWith('.md'))
    .map((fichero) => {
      const contenido = readFileSync(join(raiz, 'citas', fichero), 'utf8');
      const frontmatter = /^---\n([\s\S]*?)\n---/.exec(contenido)?.[1];
      if (frontmatter === undefined) throw new Error(`citas/${fichero}: sin frontmatter`);
      const datos = parse(frontmatter) as {
        slug: string;
        autor: string;
        texto: string;
        procedencia?: { obra?: string } | null;
        fuente?: { id: string } | null;
      };
      // La Fuente también: de ella sale si la Obra tiene edición cotejada (Historia 24.4).
      return {
        slug: datos.slug,
        autor: datos.autor,
        texto: datos.texto,
        procedencia: datos.procedencia,
        ...(datos.fuente != null ? { fuente: datos.fuente } : {}),
      };
    });
  const fichas: FichaDeObra[] = readdirSync(join(raiz, 'obras'))
    .filter((f) => /\.ya?ml$/.test(f))
    .map((fichero) => {
      const ficha = parse(readFileSync(join(raiz, 'obras', fichero), 'utf8')) as Omit<FichaDeObra, 'nombre' | 'ruta'>;
      return { ...ficha, nombre: fichero.replace(/\.ya?ml$/, ''), ruta: `corpus/obras/${fichero}` };
    });
  return colgarObras(citas, fichas).map((c) => ({
    slug: c.slug,
    autor: c.autor,
    texto: c.texto,
    conFuente: typeof c.fuente?.id === 'string' && c.fuente.id !== '',
    ...(c.obra !== undefined
      ? { obra: c.obra.titulo, recuento: c.obra.recuento, edicionCotejada: c.obra.edicionCotejada }
      : {}),
  }));
}

const porSlug = (a: { slug: string }, b: { slug: string }) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);

/**
 * Historia 24.4 — una Cita con la Tarjeta de Obra entera: su Obra tiene al menos dos Citas y
 * edición cotejada, y ella misma tiene Fuente y texto que cabe en la Imagen de Cita (así su
 * página lleva Línea de la Fuente, tarjeta, Copiar e Imagen). La primera por slug, o
 * `undefined` si el Corpus de hoy no la tiene: la cara es obligatoria, y la hace fallar cada
 * prueba que la pide —nunca una excepción al cargar el fichero, que tumbaría el barrido entero—.
 */
export function citaConTarjetaCompleta(): { slug: string; autor: string; titulo: string } | undefined {
  const cita = citasResueltas()
    .filter(
      (c) =>
        c.obra !== undefined &&
        (c.recuento ?? 0) >= 2 &&
        c.edicionCotejada === true &&
        c.conFuente &&
        admiteImagen(c.texto),
    )
    .sort(porSlug)[0];
  return cita === undefined ? undefined : { slug: cita.slug, autor: cita.autor, titulo: cita.obra! };
}

/** Por qué falla una prueba de la 24.4 cuando el Corpus no tiene la cara que pide. */
export const SIN_TARJETA_COMPLETA =
  'El Corpus no tiene ninguna Cita con Fuente de una Obra de dos o más Citas: no hay tarjeta completa que probar.';

/**
 * Historia 24.4 — una Cita cuya Obra no tiene ninguna Cita cotejada (su tarjeta dice «Ver la
 * obra ›»), si hoy hay alguna. La primera por slug.
 */
export function citaDeObraSinCotejar(): { slug: string; autor: string; titulo: string } | undefined {
  const cita = citasResueltas()
    .filter((c) => c.obra !== undefined && c.edicionCotejada === false)
    .sort(porSlug)[0];
  return cita === undefined ? undefined : { slug: cita.slug, autor: cita.autor, titulo: cita.obra! };
}

/**
 * La Cita cuya Tarjeta lleva el título de Obra más largo del Corpus, con su Autor y ese título
 * —el de la ficha, resuelto como en el build—. Historia 24.3. Empate, por slug.
 */
export function citaConTituloDeObraMasLargo(): { slug: string; autor: string; titulo: string } | undefined {
  let mejor: { slug: string; autor: string; titulo: string } | undefined;
  for (const cita of citasResueltas()) {
    if (cita.obra === undefined) continue;
    if (
      mejor === undefined ||
      cita.obra.length > mejor.titulo.length ||
      (cita.obra.length === mejor.titulo.length && cita.slug < mejor.slug)
    ) {
      mejor = { slug: cita.slug, autor: cita.autor, titulo: cita.obra };
    }
  }
  return mejor;
}

/**
 * Una Cita del Corpus que no lleva línea de Obra —no declara obra o ninguna ficha la reclama—,
 * con su Autor y su texto, si hoy hay alguna. Historia 24.3. La primera por slug.
 */
export function citaSinObra(): { slug: string; autor: string; texto: string } | undefined {
  const cita = citasResueltas()
    .filter((c) => c.obra === undefined)
    .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))[0];
  return cita === undefined ? undefined : { slug: cita.slug, autor: cita.autor, texto: cita.texto };
}

/** Cuántas páginas tiene el listado de un Autor del Corpus. */
export function paginasDeAutor(autor: string): number {
  return Math.max(1, Math.ceil((citasPorAutor().get(autor) ?? 0) / CITAS_POR_PAGINA));
}

/** Cuántas páginas tiene el listado de un Tema del Corpus. */
export function paginasDeTema(tema: string): number {
  return Math.max(1, Math.ceil((citasPorTema().get(tema) ?? 0) / CITAS_POR_PAGINA));
}

/**
 * Un Autor cuyas Citas **caben en una sola página**, con su recuento.
 *
 * Dos pruebas fijaban un Autor concreto y daban por hecho que cabía: «se ven todas sus Citas» y
 * «con pocas Citas no aparece paginación». Tenía 36 y la página son 50 — hasta que una siembra
 * lo dejó en 51 y las dos se pusieron rojas afirmando algo que ya no era cierto de él.
 *
 * No se cambia un nombre fijado por otro, que sería el mismo fallo esperando a la siguiente
 * siembra: se pregunta al Corpus por uno que hoy quepa. Se elige el de **más** Citas entre los
 * que caben, para que la prueba siga siendo exigente y no pase mirando un Autor de tres.
 */
export function autorEnUnaPagina(): { slug: string; citas: number } | undefined {
  const elegido = [...citasPorAutor().entries()]
    .filter(([, n]) => n > 0 && n <= CITAS_POR_PAGINA)
    .sort((a, b) => b[1] - a[1])[0];
  return elegido === undefined ? undefined : { slug: elegido[0], citas: elegido[1] };
}

/**
 * Un Autor cuyas Citas no caben en una página, si hoy existe alguno: el de **más** Citas, para
 * que su página 2 exista. Historia 17.4 — la ficha solo en la página 1; se pregunta al Corpus en
 * vez de fijar un Autor que una retirada dejaría en una sola página.
 */
export function autorEnVariasPaginas(): { slug: string; citas: number } | undefined {
  const elegido = [...citasPorAutor().entries()]
    .filter(([, n]) => n > CITAS_POR_PAGINA)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return elegido === undefined ? undefined : { slug: elegido[0], citas: elegido[1] };
}

/** Cuántas Citas publicadas tiene cada Autor, por su slug. */
function citasPorAutor(): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const fichero of readdirSync(join(raiz, 'citas')).filter((f) => f.endsWith('.md'))) {
    const autor = campo(readFileSync(join(raiz, 'citas', fichero), 'utf8'), 'autor');
    if (autor !== undefined) cuenta.set(autor, (cuenta.get(autor) ?? 0) + 1);
  }
  return cuenta;
}

/**
 * Un Autor del Corpus que declara biografía —su semblanza lleva atribución debajo—, si hoy hay.
 */
export function autorConBiografia(): string | undefined {
  return readdirSync(join(raiz, 'autores'))
    .filter((f) => f.endsWith('.yml'))
    .sort()
    .find((f) => /^biografia:/m.test(readFileSync(join(raiz, 'autores', f), 'utf8')))
    ?.replace(/\.yml$/, '');
}

/**
 * La ruta de una Cita cuyo Autor **no tiene ninguna otra**, si es que hoy existe alguna.
 *
 * Estaba fijada a mano y era cierta: aquel Autor tenía una sola Cita. Dejó de serlo en cuanto
 * una siembra le dio cinco más, y la prueba pasó a afirmar que un Autor con seis Citas no
 * tiene hermanas. El nombre fijado no se cambia por otro, que caducaría igual: se pregunta.
 *
 * Cuando **ningún** Autor está en esa situación, esto devuelve `undefined` y quien lo use debe
 * saltarse la prueba diciendo por qué. Es preferible a fingir que se comprobó algo que el
 * Corpus ya no contiene.
 */
export function citaDeAutorConUnaSola(): string | undefined {
  const porAutor = new Map<string, string[]>();
  for (const fichero of readdirSync(join(raiz, 'citas')).filter((f) => f.endsWith('.md'))) {
    const contenido = readFileSync(join(raiz, 'citas', fichero), 'utf8');
    const autor = campo(contenido, 'autor');
    const slug = campo(contenido, 'slug');
    if (autor === undefined || slug === undefined) continue;
    porAutor.set(autor, [...(porAutor.get(autor) ?? []), slug]);
  }

  const sola = [...porAutor.values()].find((slugs) => slugs.length === 1);
  return sola === undefined ? undefined : `/cita/${sola[0]}`;
}
