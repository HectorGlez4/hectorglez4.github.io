/**
 * El dominio definitivo — LC-1.
 *
 * Se lee de `public/CNAME`, que no es un fichero cualquiera: es el que GitHub Pages
 * exige encontrar en lo desplegado para seguir sirviendo el dominio propio. Derivarlo de
 * ahí en vez de escribirlo otra vez aquí quita el único fallo de esta historia que no
 * avisa — un CNAME y una canónica que dejan de coincidir producen un sitio que responde
 * en un dominio y se declara en otro, y eso el despliegue no lo detecta.
 *
 * Vive en `public/` por la misma razón por la que sobrevive a la reconstrucción diaria:
 * Astro copia ese directorio a `dist/` en cada build, sin que nadie tenga que acordarse.
 */
import { readFileSync } from 'node:fs';

/** El dominio desnudo, tal y como lo exige el hospedaje: sin esquema y sin barra. */
export const DOMINIO = readFileSync(new URL('../../public/CNAME', import.meta.url), 'utf8').trim();

/**
 * El origen con el que se construyen canónicas y sitemap.
 *
 * `SITE_URL` manda cuando trae algo: es lo que permite construir una previsualización en
 * otro origen sin tocar el repositorio. Se comprueba **con contenido**, no con `??`: una
 * variable de repositorio sin definir llega a la orden como cadena vacía, y `?? ` la
 * daría por buena. El sitio se publicaría con `site: ''` y todas las canónicas saldrían
 * relativas, sin que nada fallara.
 */
export const SITIO = process.env.SITE_URL?.trim() || `https://${DOMINIO}`;
