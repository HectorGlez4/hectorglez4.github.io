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
 * La clave de IndexNow — el aviso inmediato a Bing, Yandex, Naver y Seznam.
 *
 * El sitemap es una invitación: el buscador pasa cuando le viene bien, y a un dominio
 * nuevo le viene bien tarde. IndexNow es lo contrario —el sitio avisa al publicar— y para
 * este producto importa más que para casi cualquier otro, porque AD-12 reconstruye **una
 * vez al día** y la Cita del Día cambia en cada reconstrucción. Sin aviso, la portada que
 * el buscador enseña es la de hace días.
 *
 * **No es un secreto, y por eso está aquí y no en un `secret` del repositorio.** El
 * protocolo verifica la propiedad justo al revés que una contraseña: la clave se publica
 * en la raíz del sitio —`/{clave}.txt`— y quien la sirva demuestra que manda en el
 * dominio. Esconderla rompería la comprobación. Guardarla como secreto de CI daría además
 * la falsa impresión de que filtrarla es un incidente.
 *
 * Se declara una sola vez porque el fichero que la sirve **deriva su nombre de aquí**
 * —`src/pages/[clave].txt.ts`—. Escrita dos veces, renombrarla dejaría servido el fichero
 * viejo y el aviso se rechazaría sin que nada fallara en el build.
 */
export const CLAVE_DE_INDEXNOW = 'e4fd0fca8ec64be2ab18f840b5cfb740';

/** Dónde se sirve la clave. El protocolo la busca en la raíz del origen. */
export const RUTA_DE_LA_CLAVE = `/${CLAVE_DE_INDEXNOW}.txt`;

/**
 * El punto de entrada común del protocolo.
 *
 * `api.indexnow.org` reparte el aviso entre todos los buscadores adheridos, así que no
 * hace falta avisar a cada uno. Avisar a `bing.com/indexnow` directamente funcionaría y
 * dejaría fuera a los demás sin que se notara.
 */
export const PUNTO_DE_INDEXNOW = 'https://api.indexnow.org/indexnow';

/** El protocolo no acepta más de 10 000 URLs en un aviso. */
export const TOPE_POR_AVISO = 10_000;

export interface AvisoDeIndexNow {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

/**
 * El cuerpo del aviso, para un origen y una lista de rutas o URLs.
 *
 * Puro y sin red: esto compone, y quien lo envía es `tools/avisar.ts`. La separación es la
 * de siempre —el criterio se prueba sin salir a internet—, y aquí hace falta por una razón
 * de más: **AD-22 prohíbe que la construcción pida nada por la red**, así que el envío no
 * puede vivir en una integración de Astro. Vive en el flujo de trabajo, después de
 * desplegar, que es además el único momento en que la URL avisada ya responde.
 *
 * Se descarta lo que no sea de este origen. El protocolo rechaza el aviso entero si una
 * sola URL es de otro dominio, así que colar una relativa mal compuesta perdería también
 * las buenas.
 */
export function avisoDeIndexNow(
  sitio: string,
  rutasOUrls: readonly string[],
): AvisoDeIndexNow {
  const origen = new URL(sitio);

  const urls: string[] = [];
  for (const entrada of rutasOUrls) {
    let url: URL;
    try {
      url = new URL(entrada, origen);
    } catch {
      continue;
    }
    if (url.host !== origen.host) continue;
    if (!urls.includes(url.href)) urls.push(url.href);
  }

  return {
    host: origen.host,
    key: CLAVE_DE_INDEXNOW,
    keyLocation: new URL(RUTA_DE_LA_CLAVE, origen).href,
    urlList: urls.slice(0, TOPE_POR_AVISO),
  };
}

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
