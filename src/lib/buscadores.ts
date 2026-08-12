/**
 * Lo que el sitio le dice a los buscadores — LC-2.
 *
 * `robots.txt` se compone aquí y lo sirve `src/pages/robots.txt.ts`, en vez de estar en
 * `public/` como fichero suelto: la línea `Sitemap:` exige una URL absoluta, y escrita a
 * mano sería la segunda copia del dominio —la primera está en `public/CNAME`— con la
 * garantía de que un día dejarían de coincidir.
 */

/** Lo que publica `@astrojs/sitemap`: un índice que apunta a los mapas de verdad. */
export const RUTA_DEL_SITEMAP = '/sitemap-index.xml';

/**
 * El fichero entero, para un origen dado.
 *
 * No lleva ningún `Disallow`, y eso es deliberado. Lo que no se quiere indexar —las
 * páginas 2+ de un listado, la búsqueda, el 404, el Kit— lo declara cada página en su
 * etiqueta `robots`, y queda fuera del sitemap. Bloquearlo además aquí sería
 * contraproducente: el rastreador que no puede descargar la página tampoco puede leer su
 * `noindex`, así que la URL sigue siendo indexable —sin descripción y sin forma de
 * retirarla—. Se rastrea todo justamente para que la etiqueta se lea.
 */
export function robots(sitio: string): string {
  return [
    '# Sabiduría de Bolsillo',
    '#',
    '# Sin Disallow a propósito: lo que no debe indexarse lo dice cada página en su',
    '# etiqueta robots, y para que un buscador la lea tiene que poder descargarla.',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${sitio}${RUTA_DEL_SITEMAP}`,
    '',
  ].join('\n');
}
