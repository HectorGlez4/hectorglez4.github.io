/**
 * `/rss.xml` — el canal de la Cita del Día.
 *
 * Es una ruta y no un fichero de `public/` por el mismo motivo que `robots.txt`: los
 * enlaces del canal salen del origen que declara la configuración, así que un cambio de
 * dominio los arrastra. Copiados a mano, seguirían apuntando al anterior.
 *
 * No se declara en `SUPERFICIES`: aquello describe las superficies que un visitante lee,
 * y de la declaración salen el sitemap, el `noindex`, el índice de la búsqueda propia y el
 * barrido de accesibilidad — cuatro cosas que no significan nada para un XML. `robots.txt`
 * tampoco está, y por lo mismo.
 */
import type { APIRoute } from 'astro';
import portada from '../../corpus/portada.json';
import { aptasParaPortada, jornadaDelBuild } from '../lib/citaDelDia.ts';
import { DESCRIPCION_DEL_SITIO, MARCA } from '../lib/marca.ts';
import { fijacionesDeclaradas } from '../lib/portada.ts';
import { conjuntoPublicable } from '../lib/publicado.ts';
import { canalRss, entradasDelCanal } from '../lib/sindicacion.ts';

export const GET: APIRoute = async ({ site }) => {
  const conjunto = await conjuntoPublicable();
  const jornada = jornadaDelBuild(process.env, new Date());
  const entradas = entradasDelCanal(
    aptasParaPortada(conjunto.citas),
    conjunto.autores,
    jornada,
    fijacionesDeclaradas(portada),
  );

  return new Response(
    canalRss(entradas, site!.origin, `${MARCA} — la Cita del Día`, DESCRIPCION_DEL_SITIO),
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } },
  );
};
