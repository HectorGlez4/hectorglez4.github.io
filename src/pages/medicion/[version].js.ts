/**
 * El fichero de medición — AD-6, AD-13, Historia 23.1.
 *
 * Lo compone `guionDeMedicion` de `src/lib/medicion.ts` con el vocabulario y el punto final
 * importados, nunca copiados: en `public/` sería una segunda copia del vocabulario que se
 * quedaría atrás en cuanto se añadiera un evento, y el receptor descartaría en silencio lo que
 * el sitio ya emite.
 *
 * **Sin punto final no hay fichero**: `getStaticPaths` no devuelve ninguna ruta y la etiqueta
 * que lo pide tampoco se pone (`Medicion.astro`). Quedan el arranque y el `data-vistas`, que no
 * envían nada. Con él, una sola ruta, versionada por el contenido (`versionDelGuion`): otro
 * guion u otro punto final, otra dirección.
 *
 * Lleva el tipo en el nombre —`.js.ts`, como `robots.txt.ts`—, así que no es una superficie y
 * `tests/unit/publicable-y-alcanzable.test.ts` no exige declararlo en `src/lib/superficies.ts`.
 * Se lee de `process.env` y no de `import.meta.env` por lo mismo que en `Medicion.astro`: el
 * punto final no es una variable pública.
 *
 * **El tope se juzga aquí, con el punto final de verdad.** El fichero lleva la dirección dentro y
 * crece con ella, y la prueba de `tests/unit/medicion.test.ts` lo mide con el punto final de las
 * pruebas: sin esta comprobación, una dirección de producción más larga podía pasar de
 * `MAX_BYTES_GUION_DE_MEDICION` en el único build que se despliega sin que nada fallara. Así el
 * build se para nombrando los dos números.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { guionDeMedicion, puntoFinal, versionDelGuion } from '../../lib/medicion.ts';
import { MAX_BYTES_GUION_DE_MEDICION } from '../../lib/umbrales.ts';

export const getStaticPaths = (() => {
  const url = puntoFinal(process.env);
  if (url === null) return [];
  const guion = guionDeMedicion(url);
  const bytes = new TextEncoder().encode(guion).byteLength;
  if (bytes > MAX_BYTES_GUION_DE_MEDICION) {
    throw new Error(
      `El fichero de medición pesa ${bytes} bytes con este punto final y su tope, ` +
        `MAX_BYTES_GUION_DE_MEDICION en src/lib/umbrales.ts, es ${MAX_BYTES_GUION_DE_MEDICION}. ` +
        'El punto final va dentro del fichero: acórtalo o sube el tope en un diff visible.',
    );
  }
  return [{ params: { version: versionDelGuion(guion) }, props: { guion } }];
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(props.guion as string, {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
  });
