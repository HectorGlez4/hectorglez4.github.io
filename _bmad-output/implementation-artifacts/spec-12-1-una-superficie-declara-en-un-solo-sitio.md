---
title: 'Story 12.1 — Una superficie declara en un solo sitio si es publicable'
type: 'refactor'
created: '2026-08-19'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-3-el-objetivo-sale-del-hueco.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Si una superficie es publicable se declara hoy en **tres sitios**: `noIndexar` y `fueraDeLaBusqueda` en `Armazon.astro`, más el filtro de `astro.config.mjs`. Hay que acordarse de los tres, y ya se ha fallado: `/404` y `/buscar` declaran `noIndexar` y **aparecen en el índice interno de Pagefind**, porque nadie puso el segundo. El Kit se salvó solo porque allí sí se acordaron. Y el barrido automatizado de accesibilidad tiene una cuarta lista, escrita a mano.

**Approach:** Una superficie declara en **un solo sitio** si es publicable, y de esa declaración derivan la inclusión en el sitemap, el `noindex`, la exclusión del índice interno y la entrada en el barrido automatizado. Añadir una superficie deja de exigir que nadie se acuerde de nada.

## Boundaries & Constraints

**Always:**
- Una sola declaración por superficie, y de ella derivan **las cuatro** consecuencias.
- Declarar una superficie nueva **no publicable** no obliga a tocar `astro.config.mjs` ni a recordar un segundo fichero.
- Una superficie nueva **pública** entra en el barrido de accesibilidad y móvil **sin añadirse a ninguna lista**.
- Publicable y alcanzable son el mismo conjunto: ninguna superficie publicada queda huérfana (AD-11 extendido, cuyo dueño es `src/lib/publicado.ts`).
- La declaración es **pura** y vive fuera de la configuración: `src/lib/` no lee disco (AD-5).
- El cotejo de la Historia 11.2 y su censo siguen intactos.

**Block If:**
- Cumplir un criterio exigiera que `src/lib/` leyera disco o que la declaración viviera en `astro.config.mjs`.

**Never:**
- No dejar ningún camino por el que una superficie pueda ser `noindex` para el buscador de fuera y visible para el de dentro. Esa incoherencia es el defecto que la historia cierra.
- No introducir la Colección todavía: esta historia solo construye el dueño único. La Página de Colección es la 12.3.
- No cambiar qué superficies son públicas hoy, salvo el defecto declarado: `/404` y `/buscar` salen del índice interno.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Búsqueda por término de una Cita | El término aparece en una Cita y también en la 404 | Los resultados son Citas, Autores y Temas; ni la 404 ni la página de búsqueda | Sin error |
| Superficie nueva no publicable | Se declara no publicable en un solo sitio | Queda fuera del sitemap, con `noindex` y fuera del índice interno, sin tocar `astro.config.mjs` | Sin error |
| Superficie nueva pública | Se declara publicable | Entra en el barrido de accesibilidad y móvil sin añadirse a ninguna lista | Sin error |
| Superficie publicada huérfana | Una superficie publicable a la que no llega ningún enlace interno | Se detecta: publicable y alcanzable son el mismo conjunto | Falla la comprobación |
| Página 2+ de un listado | `/autor/{slug}/2` | Sigue siendo `noindex, follow` y fuera del sitemap, como hoy | Sin error |
| Superficie sin declaración | Se añade una página y nadie la declara | No pasa desapercibida: se detecta que falta su declaración | Falla la comprobación |

</intent-contract>

## Code Map

- `src/components/Armazon.astro` -- el armazón compartido. `noIndexar` (props en :26, valor en :51, etiqueta `robots` en :72) y `fueraDeLaBusqueda` (:30-36, :52, y `data-pagefind-body` / `data-pagefind-ignore` en :114-115). **Son dos de los tres sitios.** Debe pasar a derivar ambas de la declaración única en vez de recibirlas sueltas.
- `astro.config.mjs` -- **el tercer sitio**: `integrations: [sitemap({ filter })]` en :38-41, con tres expresiones regulares (paginación, `/buscar`, `/kit`). Debe consumir la declaración, no tener la suya.
- `src/pages/404.astro:35` y `src/pages/buscar.astro:34` -- declaran `noIndexar` y **no** `fueraDeLaBusqueda`: **este es el defecto vivo**. Comprobado en el `dist/` construido: ambas llevan `noindex, follow` y `data-pagefind-body`.
- `src/pages/kit.astro:42-43` -- declara las dos. Es la prueba de que hoy hay que acordarse.
- `src/pages/autor/[slug]/[...page].astro:56` y `src/pages/tema/[slug]/[...page].astro:53` -- `noIndexar={pagina.currentPage > 1}`: publicabilidad **condicional**, que la declaración única tiene que admitir.
- `src/lib/publicado.ts` -- dueño del conjunto publicable (AD-11). Ya exporta `rutasPublicadas(conjunto)` y `verificarIntegridad(conjunto)`. Es donde encaja «publicable y alcanzable son el mismo conjunto».
- `tests/e2e/accesibilidad.spec.ts:7-14` -- **la cuarta lista**, escrita a mano: seis rutas. Debe derivarse.
- `integraciones/cotejo.ts` -- la integración de la 11.2, enganchada en `astro.config.mjs`. Es el precedente de código que el build ejecuta viviendo fuera de `src/`; no la rompas.
- `tests/unit/publicado.test.ts`, `tests/unit/andamiaje.test.ts` -- donde viven las comprobaciones estructurales.

## Tasks & Acceptance

**Execution:**
- `src/lib/superficies.ts` (nuevo, puro, sin disco) -- la declaración única: qué superficies tiene el sitio y cuál es publicable, incluida la publicabilidad **condicional** de las páginas 2+ de un listado. De aquí derivan las cuatro consecuencias. Vive en `src/lib/` porque es derivación pura y la consume tanto el sitio como la configuración.
- `src/components/Armazon.astro` -- derivar `noindex` y la exclusión del índice interno **de la declaración**, en vez de recibir dos banderas sueltas que hay que acordarse de poner juntas. Que sea imposible declarar una y olvidar la otra.
- `astro.config.mjs` -- el filtro del sitemap consume la declaración; se retiran las tres expresiones regulares.
- `src/pages/404.astro`, `src/pages/buscar.astro`, `src/pages/kit.astro` -- pasan a la declaración única. **Con esto `/404` y `/buscar` salen del índice interno**, que es el defecto que la historia nombra.
- `src/lib/publicado.ts` -- que el conjunto publicable y el alcanzable sean el mismo: una superficie publicable a la que no llegue ningún enlace interno se detecta.
- `tests/e2e/accesibilidad.spec.ts` -- derivar las superficies del barrido de la declaración, y retirar la lista escrita a mano. Una superficie pública nueva tiene que entrar sola.
- `tests/unit/superficies.test.ts` (nuevo) -- la matriz de E/S sobre lo puro: coherencia entre las cuatro consecuencias, publicabilidad condicional, y que ninguna superficie pueda quedar `noindex` fuera y visible dentro.
- `tests/unit/publicable-y-alcanzable.test.ts` (nuevo, o dentro de `publicado.test.ts`) -- prueba de build: una superficie publicable y huérfana se detecta; y toda página de `src/pages/` tiene declaración, para que añadir una sin declararla no pase desapercibido.
- `tests/unit/publicacion.test.ts` -- comprobar sobre el `dist/` construido que ninguna página con `noindex` lleva `data-pagefind-body`. Es la aserción que habría cazado el defecto de origen.

**Acceptance Criteria:**
- Given un término contenido en una Cita, when se busca en el sitio, then los resultados no incluyen ni la 404 ni la página de búsqueda.
- Given una superficie que no es del producto, when se declara no publicable en un solo sitio, then de ahí derivan su exclusión del sitemap, su `noindex` y su exclusión del índice interno, sin tocar `astro.config.mjs` ni recordar un segundo fichero.
- Given una superficie nueva declarada pública, when corre el barrido automatizado de accesibilidad y móvil, then entra en él sin haberse añadido a ninguna lista.
- Given el conjunto publicable, when se enumeran las superficies, then publicable y alcanzable son el mismo conjunto y ninguna superficie publicada queda huérfana.
- Given el sitio construido, when se busca una página que declare `noindex`, then ninguna lleva `data-pagefind-body`.

## Spec Change Log

## Review Triage Log

## Design Notes

**El defecto no es teórico, está en producción.** Comprobado en el `dist/` construido antes de empezar: `dist/404.html` y `dist/buscar.html` llevan a la vez `<meta name="robots" content="noindex, follow">` y `data-pagefind-body`. Pagefind indexa 55 páginas mientras el sitemap declara 53. `dist/kit.html` no, porque en `kit.astro` sí se pusieron las dos banderas. Tres sitios y hay que acordarse de los tres: eso es lo que la historia cierra, y el Kit es la prueba de que acordarse no basta.

**Por qué una sola declaración y no «acordarse mejor».** El pitfall ya está escrito en `AGENTS.md` —«al añadir una superficie que no es del producto, sácala de los dos índices y no solo del buscador»— y aun así volvió a ocurrir. Una nota que hay que leer no es una puerta.

**La publicabilidad condicional es parte del contrato.** Las páginas 2+ de un listado son `noindex` y las primeras no. La declaración tiene que admitir eso sin volver a partirse en dos sitios.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run` -- expected: todo en verde; ninguna de las 882 de la línea base perdida.
- `npm run build` -- expected: construye, con la puerta de la 11.2 intacta.
- `npx playwright test` -- expected: 392 en verde; el barrido de accesibilidad ahora deriva sus superficies.
- `grep -l "data-pagefind-body" dist/404.html dist/buscar.html` -- expected: ninguna coincidencia.
