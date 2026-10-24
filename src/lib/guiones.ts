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
 * de otro origen, o cuyos ficheros no quepan en su tope; y por una entrada sin tope. Las Épicas 26
 * y 27 la amplían con una línea aquí y un tope allí, en un diff visible.
 */

import {
  MAX_BYTES_GUION_DE_IMAGEN,
  MAX_BYTES_GUION_DE_MEDICION,
  MAX_BYTES_GUION_DE_PAGEFIND,
} from './umbrales.ts';

/** Cómo pide un guion, al ejecutarse, otro fichero de guion. */
export type FormaDeArrancar = 'import()' | 'new Worker' | 'new SharedWorker' | 'importScripts';

/** Un fichero que una entrada pide por su cuenta al ejecutarse, y cómo lo pide. */
export interface Arranque {
  como: FormaDeArrancar;
  /** La ruta del mismo origen, sin consulta. */
  ruta: string;
}

export interface GuionExterno {
  /** Cómo se la nombra en los mensajes de las comprobaciones. */
  id: 'medicion' | 'imagen' | 'pagefind';
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
  /** Bytes UTF-8 sin comprimir del fichero, de sus importaciones estáticas y de lo que arranca. */
  tope: number;
}

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
      'con `import()` al enfocar el campo de `/buscar/`, al buscar, o al llegar con la ' +
      'consulta en la dirección; al iniciarse arranca su worker',
    reconoce: /^\/pagefind\/pagefind\.js$/,
    // La dirección del worker la compone Pagefind en tiempo de ejecución con su `basePath`, así
    // que no se puede leer del fichero: se declara aquí y la prueba cuenta los `new Worker`.
    arranca: [{ como: 'new Worker', ruta: '/pagefind/pagefind-worker.js' }],
    tope: MAX_BYTES_GUION_DE_PAGEFIND,
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
 * La entrada a la que pertenece un guion **descargado**, lo pida la página o lo arranque el
 * fichero de una entrada —el worker de Pagefind—. Es la pregunta de las pruebas que miran la
 * red; la de lo que una página pide es `guionExternoDe`.
 */
export function entradaDeLoDescargado(especificador: string): GuionExterno | undefined {
  const directa = guionExternoDe(especificador);
  if (directa !== undefined) return directa;
  const ruta = rutaDelMismoOrigen(especificador);
  if (ruta === undefined) return undefined;
  return GUIONES_EXTERNOS.find((guion) => guion.arranca?.some((arranque) => arranque.ruta === ruta));
}
