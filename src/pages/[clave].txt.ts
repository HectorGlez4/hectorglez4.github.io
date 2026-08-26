/**
 * La clave de IndexNow, servida en la raíz del sitio.
 *
 * El protocolo comprueba la propiedad del dominio al revés que una contraseña: pide que
 * la clave esté publicada en `https://{dominio}/{clave}.txt`, y quien pueda servirla
 * manda en el dominio. Por eso este fichero existe y por eso su contenido es la clave
 * desnuda, sin salto de línea que sobre.
 *
 * **El nombre sale de la clave y no al revés.** La ruta es dinámica —`[clave]`— y su
 * único valor lo da `getStaticPaths` desde `src/lib/buscadores.ts`. Escrito como fichero
 * suelto en `public/`, cambiar la clave dejaría servido el fichero anterior y el aviso se
 * rechazaría en silencio: el build seguiría verde y las publicaciones dejarían de
 * anunciarse sin que nadie se enterase. Así no hay dos sitios que puedan discrepar.
 *
 * Lleva el tipo en el nombre —`.txt.ts`, como `robots.txt.ts` y `tarjeta/[slug].png.ts`—
 * y eso no es estético: es lo que hace que `tests/unit/publicable-y-alcanzable.test.ts`
 * lo reconozca como punto final que emite otra cosa, y no exija declararlo en
 * `src/lib/superficies.ts` como si fuera una superficie indexable.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { CLAVE_DE_INDEXNOW } from '../lib/buscadores.ts';

export const getStaticPaths = (() => [
  { params: { clave: CLAVE_DE_INDEXNOW } },
]) satisfies GetStaticPaths;

export const GET: APIRoute = () =>
  new Response(CLAVE_DE_INDEXNOW, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
