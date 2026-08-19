/**
 * Cómo se escriben los números del proyecto cuando los lee una persona.
 *
 * No decide nada: da forma a lo que otros ya decidieron. Existe porque las órdenes de
 * `tools/` empezaron a discrepar entre ellas —`tools/auditoria.ts` escribía «33.3 %» y
 * `tools/huecos.ts` «16,7 %», dos informes hermanos con dos convenciones— y porque un
 * formateador dentro del módulo de política habría hecho creer que la coma decimal es una
 * decisión de la política, que no lo es.
 *
 * AD-5 — puro: recibe números y devuelve texto.
 */

/**
 * Un porcentaje escrito en español: coma decimal, y sin decimal cuando es entero.
 *
 * `toLocaleString` daría esto mismo con la configuración regional adecuada y otra cosa
 * con cualquier otra, y el texto que la política escribe tiene que ser idéntico palabra
 * por palabra en cualquier máquina que lo pida.
 */
export function porcentajeEnEspañol(valor: number): string {
  return String(valor).replace('.', ',');
}

/**
 * La línea con la que el proyecto dice qué le falta a una agregación — Historia 12.4.
 *
 * Estaba escrita dentro del bucle de `tools/huecos.ts` y valía mientras solo hubiera una
 * agregación con umbral. Con la Colección son dos, y quien cura una Colección y quien
 * mira qué le falta al Corpus son la misma persona en el mismo momento: si «le faltan
 * cuatro» se dijera de dos formas distintas en dos órdenes, una de las dos acabaría
 * mintiendo. Sale de aquí una sola vez y la consumen las dos.
 *
 * Recibe la forma, no el tipo: `HuecoDeTema` y `HuecoDeColeccion` la cumplen los dos, y
 * este módulo no depende de `huecos.ts` para no atar el formato a la derivación.
 */
export function lineaDeHueco(hueco: {
  nombre: string;
  publicadas: number;
  faltan: number;
}): string {
  return `${columnas(hueco.nombre, hueco.publicadas)}  ·  faltan ${hueco.faltan}`;
}

/**
 * La línea de una agregación que **sí** llega a su umbral — Historia 12.4.
 *
 * La escribe el inventario de Colecciones, que enumera todas y no solo las que faltan. Va
 * aquí y no en la orden por lo mismo que su hermana: estaba escrita a mano allí, repitiendo
 * el ancho de las columnas que `lineaDeHueco` acababa de centralizar, y una tercera
 * redacción del mismo renglón en el cambio cuya tesis es que la segunda acaba mintiendo se
 * lee sola.
 */
export function lineaDePublicada(
  agregacion: { nombre: string; publicadas: number },
  umbral: number,
): string {
  return `${columnas(agregacion.nombre, agregacion.publicadas)}  ·  se publica (umbral ${umbral})`;
}

/** El tronco común de las dos: nombre y recuento, alineados en columnas. */
function columnas(nombre: string, publicadas: number): string {
  return `${nombre.padEnd(20)} ${String(publicadas).padStart(3)} publicadas`;
}
