/**
 * `/buscar/obras.json` — el mapa de rótulos de las Obras de la búsqueda — Historia 27.3, FR-7,
 * AD-11, AD-25.
 *
 * Por slug de Autor, sus Obras como pares `[nombre de ficha, título]` en el orden de su Lista de
 * Obras: lo compone `filtrosDeLaBusqueda`, la misma función que escribe el filtro `obra` de cada
 * Página de Cita (27.1), así que un nombre de este mapa y un valor de `filters()` no pueden salir
 * de dos cálculos. La isla de `/buscar/` (`src/components/Busqueda.astro`) lo pide **al elegir un
 * Autor**, junto a `filters()` de Pagefind, y nunca va en el HTML: lo que el HTML lleva lo
 * descarga todo el que abre la página, y el mapa solo lo necesita quien acota por Autor.
 *
 * Lleva el tipo en el nombre —`.json.ts`, como `robots.txt.ts`—, así que no es una superficie y
 * `tests/unit/publicable-y-alcanzable.test.ts` no exige declararlo en `src/lib/superficies.ts`.
 * La ruta la da `RUTA_DEL_MAPA_DE_OBRAS` de `src/lib/busqueda.ts`, que es lo que pide el guion; una
 * prueba sobre `dist/` fija que las dos coinciden. Su tamaño, sumado a los filtros de Pagefind, lo
 * mide el paso final de `npm run build` contra `AVISO_DE_BYTES_DE_FILTROS_Y_MAPA` (avisa, no rompe).
 */
import type { APIRoute } from 'astro';
import { conjuntoPublicable, filtrosDeLaBusqueda } from '../../lib/publicado.ts';

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(filtrosDeLaBusqueda(await conjuntoPublicable()).mapaDeObras), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
