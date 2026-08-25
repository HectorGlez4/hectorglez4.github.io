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
import { CITAS_POR_PAGINA, MIN_CITAS_POR_TEMA } from '../../../src/lib/umbrales.ts';

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

/** El texto literal de una Cita del Corpus, por su slug. */
export function textoDe(slug: string): string {
  for (const fichero of readdirSync(join(raiz, 'citas')).filter((f) => f.endsWith('.md'))) {
    const contenido = readFileSync(join(raiz, 'citas', fichero), 'utf8');
    if (campo(contenido, 'slug') !== slug) continue;
    return campo(contenido, 'texto')!;
  }
  throw new Error(`No hay ninguna Cita con el slug «${slug}» en el Corpus.`);
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
  const cuenta = new Map<string, number>();
  for (const fichero of readdirSync(join(raiz, 'citas')).filter((f) => f.endsWith('.md'))) {
    const contenido = readFileSync(join(raiz, 'citas', fichero), 'utf8');
    const autor = campo(contenido, 'autor');
    if (autor !== undefined) cuenta.set(autor, (cuenta.get(autor) ?? 0) + 1);
  }

  const caben = [...cuenta.entries()]
    .filter(([, n]) => n > 0 && n <= CITAS_POR_PAGINA)
    .sort((a, b) => b[1] - a[1]);
  const elegido = caben[0];
  return elegido === undefined ? undefined : { slug: elegido[0], citas: elegido[1] };
}
