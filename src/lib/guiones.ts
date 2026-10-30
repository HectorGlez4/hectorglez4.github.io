/**
 * La lista cerrada de guiones externos — AD-6, AD-9, Historia 23.1.
 *
 * El sitio no descarga JavaScript al cargar salvo lo que esta lista nombra, y cada cosa que
 * nombra tiene un tope con nombre en `src/lib/umbrales.ts`. Es la otra mitad de
 * `MAX_BYTES_DE_GUION`: aquel tope mide lo que va **en línea**, y sacar el guion de medición a un
 * fichero (23.1) abrió la puerta contraria —un `<script src>` nuevo, o un `import()` más, no
 * pesaba en ninguna cuenta y pasaba sin que nada lo viera—. Ahora pasa por aquí o no pasa.
 *
 * La lista nombra **entradas, no ficheros**: la de medición cambia de nombre con cada versión
 * del guion, y la de la Imagen se pide con un sufijo de reintento. Cada entrada reconoce la
 * ruta —del mismo origen, sin la consulta— de lo que se pide, y su tope cuenta los bytes UTF-8
 * sin comprimir del fichero, de lo que importa de forma estática **y** de lo que arranca por su
 * cuenta al ejecutarse (`arranca`: el worker de Pagefind).
 *
 * `tests/unit/medicion.test.ts` recorre el `dist/` de un sitio construido con punto final y
 * falla por un `<script src>`, un `<link rel="modulepreload">`, un `import()`, un `new Worker` o
 * un `importScripts` que no case con ninguna entrada o que no esté declarado en la suya, que sea
 * de otro origen, o cuyos ficheros no quepan en su tope; y por una entrada sin tope.
 *
 * Ampliarla —las Épicas 26 y 27— es un diff visible en cuatro sitios, y ninguno sobra: la entrada
 * aquí, con su `id` en el tipo; su tope con nombre en `umbrales.ts`; la lista de `id` que fija
 * `tests/unit/medicion.test.ts` («cada entrada tiene un tope…»); y que el sitio de esa prueba
 * (`CORPUS_MEDIDO`) llegue a pedirla, porque la prueba de `dist/` exige ver cada entrada para
 * medir su tope y falla con una que nadie pide.
 */

import {
  MAX_BYTES_GUION_DE_IMAGEN,
  MAX_BYTES_GUION_DE_LA_BUSQUEDA,
  MAX_BYTES_GUION_DE_MEDICION,
  MAX_BYTES_GUION_DE_PAGEFIND,
  MAX_BYTES_GUION_DEL_FILTRO,
} from './umbrales.ts';

/** Cómo pide un guion, al ejecutarse, otro fichero de guion. */
export type FormaDeArrancar = 'import()' | 'new Worker' | 'new SharedWorker' | 'importScripts';

/** Un fichero que una entrada pide por su cuenta al ejecutarse, y cómo lo pide. */
export interface Arranque {
  como: FormaDeArrancar;
  /** La ruta del mismo origen, sin consulta. */
  ruta: string;
}

/** El nombre de una entrada de la lista. */
export type IdDeGuion = 'medicion' | 'imagen' | 'pagefind' | 'filtro' | 'busqueda';

export interface GuionExterno {
  /** Cómo se la nombra en los mensajes de las comprobaciones. */
  id: IdDeGuion;
  /** Cuándo lo pide la página: es lo que justifica que esté en la lista. */
  cuando: string;
  /** La ruta —del mismo origen y sin consulta— de lo que se pide. Sin `g`: guarda estado. */
  reconoce: RegExp;
  /**
   * Lo que el fichero de la entrada pide por su cuenta al ejecutarse —un worker, otro módulo—.
   * Cuenta en el tope como una importación estática, y la prueba de `dist/` exige que cada
   * `import()`, `new Worker` o `importScripts` de los ficheros de la entrada esté aquí, ni uno
   * más ni uno menos: una declaración que ya no se ve también falla.
   */
  arranca?: readonly Arranque[];
  /**
   * Las **otras entradas** de la lista que el fichero pide por `import()` al ejecutarse —la
   * búsqueda pide Pagefind (Historia 27.2)—. No cuentan en el tope de esta entrada: son una
   * entrada aparte, con el suyo, y la prueba de `dist/` las sigue hasta allí para medirlas. Como
   * con `arranca`, cada `import()` de los ficheros de la entrada tiene que casar con un arranque
   * o con una entrada pedida, y una entrada pedida que los ficheros ya no piden también falla.
   */
  pide?: readonly IdDeGuion[];
  /**
   * Los **trozos** que el fichero de la entrada importa de forma estática: lo que dos guiones
   * empaquetados comparten —desde la Historia 27.2, la búsqueda y el filtro de los Directorios
   * comparten los ritmos de `anuncio.ts` y los recuentos— el empaquetado lo saca a un fichero de
   * `/_astro/` que importan los dos, nombrado por su primer módulo y su resumen. Cuenta en el tope
   * de cada entrada que lo importa, como toda importación estática; ninguna página lo pide, y la
   * prueba de `dist/` exige que cada importación estática de la entrada case con esto.
   */
  trozos?: RegExp;
  /** Bytes UTF-8 sin comprimir del fichero, de sus importaciones estáticas y de lo que arranca. */
  tope: number;
}

/**
 * Un trozo compartido de los guiones empaquetados: `/_astro/{módulo}.{resumen}.js`, con un nombre de
 * módulo de una sola palabra —los ficheros de entrada llevan el del componente con su sufijo de
 * Astro, `….astro_astro_type_script_index_0_lang`, y no casan—. Sin `g`: guarda estado.
 */
const TROZO_COMPARTIDO = /^\/_astro\/[A-Za-z][A-Za-z0-9]*\.[A-Za-z0-9_-]+\.js$/;

export const GUIONES_EXTERNOS: readonly GuionExterno[] = [
  {
    id: 'medicion',
    cuando:
      'al cargar toda superficie `producto` o `servicio`, con `<script src defer>` en el ' +
      '`<head>`, y solo si el sitio se construyó con punto final',
    reconoce: /^\/medicion\/[0-9a-f]+\.js$/,
    tope: MAX_BYTES_GUION_DE_MEDICION,
  },
  {
    id: 'imagen',
    cuando:
      'con `import()` al pulsar «Descargar como imagen» —o «Compartir como imagen», donde el ' +
      'navegador comparte ficheros— en una Página de Cita, y al cargar `/kit` y `/lote`, que ' +
      'dibujan la Imagen sin pulsar nada',
    reconoce: /^\/islas\/imagen\.js$/,
    tope: MAX_BYTES_GUION_DE_IMAGEN,
  },
  {
    id: 'pagefind',
    cuando:
      'con `import()` desde el guion de la búsqueda (la entrada `busqueda`) al enfocar el campo ' +
      'de `/buscar/`, al elegir un filtro, al buscar o al llegar con la consulta en la ' +
      'dirección; al iniciarse arranca su worker',
    reconoce: /^\/pagefind\/pagefind\.js$/,
    // La dirección del worker la compone Pagefind en tiempo de ejecución con su `basePath`, así
    // que no se puede leer del fichero: se declara aquí y la prueba cuenta los `new Worker`.
    arranca: [{ como: 'new Worker', ruta: '/pagefind/pagefind-worker.js' }],
    tope: MAX_BYTES_GUION_DE_PAGEFIND,
  },
  {
    id: 'filtro',
    cuando:
      'al cargar `/autores/` y `/obras/`, con `<script type="module" src>`: es el `<script>` ' +
      'procesado de `FiltroDelDirectorio.astro` (Historia 26.6), el primer guion empaquetado de ' +
      'la v8, que inserta el campo de filtro y filtra la lista al teclear',
    // Astro lo emite en `/_astro/` con el nombre del componente y un resumen del contenido, que
    // cambia con cada versión del guion: se reconoce el nombre y se deja libre el resumen.
    reconoce: /^\/_astro\/FiltroDelDirectorio\.astro_astro_type_script_index_0_lang\.[A-Za-z0-9_-]+\.js$/,
    trozos: TROZO_COMPARTIDO,
    tope: MAX_BYTES_GUION_DEL_FILTRO,
  },
  {
    id: 'busqueda',
    cuando:
      'al cargar `/buscar/`, con `<script type="module" src>` detrás del de medición: es el ' +
      '`<script>` procesado de `Busqueda.astro` (Historia 27.2), que inserta el campo y los ' +
      'selectores de Autor y de Tema, busca al teclear o al elegir y asienta la búsqueda; pide ' +
      'Pagefind (`pagefind`) con `import()` solo cuando hace falta',
    // Como el filtro: el nombre del componente fijo y el resumen del contenido libre.
    reconoce: /^\/_astro\/Busqueda\.astro_astro_type_script_index_0_lang\.[A-Za-z0-9_-]+\.js$/,
    pide: ['pagefind'],
    trozos: TROZO_COMPARTIDO,
    tope: MAX_BYTES_GUION_DE_LA_BUSQUEDA,
  },
];

/** La ruta del mismo origen de un especificador, sin consulta ni fragmento, o `undefined`. */
function rutaDelMismoOrigen(especificador: string): string | undefined {
  if (!especificador.startsWith('/') || especificador.startsWith('//')) return undefined;
  return especificador.replace(/[?#].*$/, '');
}

/**
 * La entrada que reconoce lo que pide una página, o `undefined` si no está en la lista o no es
 * del mismo origen. La consulta y el fragmento se quitan antes de reconocer: el reintento de la
 * Imagen pide `/islas/imagen.js?1`, y es el mismo fichero.
 */
export function guionExternoDe(especificador: string): GuionExterno | undefined {
  const ruta = rutaDelMismoOrigen(especificador);
  if (ruta === undefined) return undefined;
  return GUIONES_EXTERNOS.find((guion) => guion.reconoce.test(ruta));
}

/**
 * La entrada a la que pertenece un guion **descargado**, lo pida la página, lo arranque el
 * fichero de una entrada —el worker de Pagefind— o lo importe —un trozo compartido de los guiones
 * empaquetados (Historia 27.2)—. Es la pregunta de las pruebas que miran la red; la de lo que una
 * página pide es `guionExternoDe`, que no reconoce ningún trozo: una página no los pide.
 */
export function entradaDeLoDescargado(especificador: string): GuionExterno | undefined {
  const directa = guionExternoDe(especificador);
  if (directa !== undefined) return directa;
  const ruta = rutaDelMismoOrigen(especificador);
  if (ruta === undefined) return undefined;
  return GUIONES_EXTERNOS.find(
    (guion) => guion.arranca?.some((arranque) => arranque.ruta === ruta) || guion.trozos?.test(ruta),
  );
}
