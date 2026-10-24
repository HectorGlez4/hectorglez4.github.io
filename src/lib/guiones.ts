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
 * sin comprimir del fichero **y** de lo que importa de forma estática.
 *
 * `tests/unit/medicion.test.ts` recorre el `dist/` de un sitio construido con punto final y
 * falla por un `<script src>` o un `import()` que no case con ninguna entrada, que sea de otro
 * origen, o cuyo fichero no quepa en su tope; y por una entrada sin tope. Las Épicas 26 y 27
 * la amplían con una línea aquí y un tope allí, en un diff visible.
 */

import {
  MAX_BYTES_GUION_DE_IMAGEN,
  MAX_BYTES_GUION_DE_MEDICION,
  MAX_BYTES_GUION_DE_PAGEFIND,
} from './umbrales.ts';

export interface GuionExterno {
  /** Cómo se la nombra en los mensajes de las comprobaciones. */
  id: 'medicion' | 'imagen' | 'pagefind';
  /** Cuándo lo pide la página: es lo que justifica que esté en la lista. */
  cuando: string;
  /** La ruta —del mismo origen y sin consulta— de lo que se pide. Sin `g`: guarda estado. */
  reconoce: RegExp;
  /** Bytes UTF-8 sin comprimir del fichero y de sus importaciones estáticas. */
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
      'con `import()` al pulsar «Descargar como imagen» en una Página de Cita, y al cargar ' +
      '`/kit` y `/lote`, que dibujan la Imagen sin pulsar nada',
    reconoce: /^\/islas\/imagen\.js$/,
    tope: MAX_BYTES_GUION_DE_IMAGEN,
  },
  {
    id: 'pagefind',
    cuando:
      'con `import()` al enfocar el campo de `/buscar/`, al buscar, o al llegar con la ' +
      'consulta en la dirección',
    reconoce: /^\/pagefind\/pagefind\.js$/,
    tope: MAX_BYTES_GUION_DE_PAGEFIND,
  },
];

/**
 * La entrada que reconoce lo que pide una página, o `undefined` si no está en la lista o no es
 * del mismo origen. La consulta y el fragmento se quitan antes de reconocer: el reintento de la
 * Imagen pide `/islas/imagen.js?1`, y es el mismo fichero.
 */
export function guionExternoDe(especificador: string): GuionExterno | undefined {
  if (!especificador.startsWith('/') || especificador.startsWith('//')) return undefined;
  const ruta = especificador.replace(/[?#].*$/, '');
  return GUIONES_EXTERNOS.find((guion) => guion.reconoce.test(ruta));
}
