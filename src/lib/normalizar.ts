/**
 * AD-3 — Una sola normalización canónica de texto.
 *
 * La búsqueda, la detección de duplicados y la generación de slugs consumen esta
 * función y ninguna implementa la suya. La divergencia que eso impide es concreta: que
 * la búsqueda considere iguales «café» y «cafe» mientras la detección de duplicados los
 * considere distintos, y que el desacuerdo solo aparezca en producción.
 *
 * AD-5 — Derivación pura: sin lecturas de disco, sin Astro, sin componentes.
 */

/**
 * Signos que se eliminan. Incluye los que el español usa y el inglés no —comillas
 * angulares, apertura de interrogación y exclamación—, porque el corpus está en
 * español y una expresión pensada para el inglés los dejaría pasar.
 */
const PUNTUACION = /[¡!¿?"'“”‘’«»(){}\[\]<>.,;:…—–\-_/\\|@#$%^&*+=~`]/gu;

/** Marcas diacríticas combinantes que deja al descubierto la descomposición NFD. */
const DIACRITICOS = /\p{M}+/gu;

/**
 * Forma canónica de un texto: minúsculas, sin diacríticos, sin puntuación y con los
 * espacios colapsados.
 *
 * Sobre la eñe: descomponer en NFD convierte «ñ» en «n». En español la eñe es una letra
 * propia y no una ene acentuada, así que lingüísticamente es una pérdida. Se acepta a
 * propósito, porque el propósito de esta función lo exige: FR-7 promete que el visitante
 * encuentre «escribiendo como se escribe de verdad, sin acentos», y quien busca «español»
 * teclea «espanol». Conservar la eñe rompería esa búsqueda. Lo que AD-3 prohíbe no es
 * tomar esta decisión, sino tomarla dos veces y distinta en cada sitio.
 */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .replace(PUNTUACION, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

/**
 * Las palabras de un texto en forma canónica. La búsqueda por fragmento de FR-7 y la
 * derivación de slugs de AD-4 trabajan sobre palabras, no sobre la cadena entera.
 */
export function palabras(texto: string): string[] {
  const canonico = normalizar(texto);
  return canonico === '' ? [] : canonico.split(' ');
}

/**
 * Dos textos son el mismo a efectos del corpus cuando su forma canónica coincide.
 * Es la comparación que usa la detección de duplicados de FR-14: distinta puntuación,
 * distinta acentuación y distintas mayúsculas describen la misma Cita.
 */
export function equivalentes(a: string, b: string): boolean {
  return normalizar(a) === normalizar(b);
}

/*
 * ─── La función hermana: inicial y orden de una clave de Autor — Historia 26.1 ─────────
 *
 * `normalizar` pliega la eñe a la ene, y para buscar es lo correcto. Para **ordenar** no lo
 * es: el Directorio de Autores pone a Núñez entre Nuño y Nuza y a Ñandú después de toda la
 * N, porque en español la eñe es una letra con su sitio en el alfabeto. Por eso hay una
 * hermana y no una variante con bandera: las dos comparten el resto de la forma canónica
 * —minúsculas, sin tildes, sin signos— y difieren solo en esa letra.
 *
 * AD-3 — es la única dueña de las iniciales y del orden de los Autores. El Directorio, sus
 * letras de salto y los destacados de la 27 la consumen; ningún otro módulo calcula una
 * inicial ni ordena Autores por su cuenta.
 */

/** Las iniciales que puede tener una clave: las 26 de la A a la Z y la Ñ. */
const INICIAL_LATINA = /^[A-Za-z]$/u;

/**
 * Lo que sustituye a la eñe antes de normalizar: una ene seguida de un carácter de uso
 * privado. Ese carácter no es una marca combinante ni un signo —`normalizar` no lo toca— y
 * su código es mayor que el de cualquier letra latina, así que «n» + él ordena tras toda
 * «n» seguida de letra y antes de la «o», también dentro de la palabra.
 */
const TRAS_LA_ENE = '\uE000';

/**
 * La inicial de una clave de orden: una letra de la A a la Z sin tilde, o la Ñ.
 *
 * Devuelve `undefined` cuando la clave no tiene inicial que repartir: en blanco, con un
 * espacio delante, o empezando por cifra o signo. **No se recorta**: una clave con un
 * espacio delante está mal escrita, y aceptarla recortando escondería la errata (NFR-12).
 */
export function inicialDeClave(clave: string): string | undefined {
  const primera = clave.normalize('NFC').codePointAt(0);
  if (primera === undefined) return undefined;
  const letra = String.fromCodePoint(primera);
  if (letra === 'ñ' || letra === 'Ñ') return 'Ñ';
  /*
   * Se mira la letra **antes** de pasarla a mayúscula: «ı» (i sin punto) y «ſ» (s larga) dan
   * I y S con `toUpperCase`, pero `claveDeComparacion` no las pliega y ordenarían tras la Z.
   * Una inicial que el orden no respeta no es inicial.
   */
  const base = letra.normalize('NFD').replace(DIACRITICOS, '');
  return INICIAL_LATINA.test(base) ? base.toUpperCase() : undefined;
}

/**
 * La forma con la que se comparan dos claves: la canónica de `normalizar`, salvo la eñe, que
 * conserva su sitio entre la ene y la o. Se compara por unidades de código y nunca con
 * `localeCompare`, cuyo resultado depende de los datos de idioma de quien construye.
 */
export function claveDeComparacion(clave: string): string {
  return normalizar(clave.normalize('NFC').replace(/[ñÑ]/gu, `n${TRAS_LA_ENE}`));
}

/** Lo que hace falta para ordenar un Autor: su clave y, para desempatar, su slug. */
export interface OrdenablePor {
  clave: string;
  slug: string;
}

const porUnidades = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * El orden de los Autores: por la clave de comparación y, si empatan —«Séneca» y «Séneca»—,
 * por el slug, que es único. El resultado no depende del orden de entrada.
 */
export function compararPorClave(a: OrdenablePor, b: OrdenablePor): number {
  return porUnidades(claveDeComparacion(a.clave), claveDeComparacion(b.clave)) || porUnidades(a.slug, b.slug);
}

/** Una opción de un selector de `/buscar/`: el valor que se filtra y el nombre que se lee. */
export interface OpcionPorNombre {
  valor: string;
  rotulo: string;
}

/** Copia ordenada por la clave de comparación del rótulo y, si empatan, por el valor, que es único. */
function ordenarPorRotulo<T extends OpcionPorNombre>(opciones: readonly T[]): T[] {
  return [...opciones].sort((a, b) => compararPorClave({ clave: a.rotulo, slug: a.valor }, { clave: b.rotulo, slug: b.valor }));
}

/**
 * El orden del selector de Autor de `/buscar/` — Historia 27.2, AD-3, UX-DR87.
 *
 * Por el nombre **tal como se lee** («José Martí», con la J), y no por la clave del Directorio
 * de Autores (`ordenAlfabetico`, «Martí»): en un selector nativo se salta tecleando la primera
 * letra de lo que se ve, y una lista ordenada por otra cosa no se dejaría recorrer así. Con la
 * comparación canónica de `claveDeComparacion` —sin tildes, la eñe en su sitio, por unidades de
 * código y nunca con `localeCompare`—, y desempate por el valor (el slug). Pura, devuelve una
 * copia y no depende del orden de entrada. El selector no ordena por su cuenta.
 */
export function ordenDeAutoresPorNombre<T extends OpcionPorNombre>(opciones: readonly T[]): T[] {
  return ordenarPorRotulo(opciones);
}

/**
 * El orden del selector de Tema de `/buscar/` — Historia 27.2, AD-3, UX-DR87.
 *
 * Por el nombre **con su artículo**, como se lee («El tiempo» con la E, «La vida» con la L), con
 * la misma comparación canónica y el mismo desempate por el valor que el de Autores. Es otra
 * función, y no la misma con otro nombre, porque dice otra regla: el día que los Temas se ordenen
 * sin el artículo, cambia esta y no la de los Autores.
 */
export function ordenDeTemasPorNombre<T extends OpcionPorNombre>(opciones: readonly T[]): T[] {
  return ordenarPorRotulo(opciones);
}
