import { buildSync } from 'esbuild';
import { join } from 'node:path';

/**
 * Un guion empaquetado de `dist/`, aplanado a un guion clásico — Historia 27.2.
 *
 * Los entornos simulados de las islas empaquetadas (`tests/unit/ayuda/busqueda.ts` y
 * `tests/unit/ayuda/filtroEjecutado.ts`) ejecutan el fichero que sale en `dist/` en un `node:vm`,
 * que solo sabe ejecutar guiones clásicos. Mientras cada isla era un solo fichero sin
 * importaciones bastaba con leerlo; desde la 27.2 la búsqueda y el filtro de los Directorios
 * comparten lo que importan los dos (los ritmos de `src/lib/anuncio.ts`, los recuentos), y el
 * empaquetado lo saca a un trozo que los dos importan. Aquí se juntan el fichero y sus trozos en un
 * solo guion clásico, con el mismo `esbuild` del proyecto, **sin tocar nada más**: el `import()`
 * de Pagefind (`/pagefind/pagefind.js`, otra entrada de la lista) se queda como está, para que el
 * entorno lo sustituya y lo compruebe. Un `import()` de otra cosa sigue ahí y el entorno lo juzga.
 *
 * `ruta` es la ruta pública del fichero (`/_astro/…js`), y `dist` el directorio construido.
 */
export function aplanar(dist: string, ruta: string): string {
  const resultado = buildSync({
    entryPoints: [join(dist, ruta)],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    write: false,
    minify: false,
    // Lo que el guion pide al ejecutarse no se empaqueta: es otra entrada de la lista cerrada.
    external: ['/pagefind/*'],
    logLevel: 'silent',
  });
  if (resultado.errors.length > 0) {
    throw new Error(`No se deja aplanar ${ruta}: ${resultado.errors.map((e) => e.text).join('; ')}`);
  }
  return resultado.outputFiles[0].text;
}
