---
title: 'Historia 33.1 — Una tienda se declara sin marca, y el Modelo no se enciende con ella'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: 'd9ddd61e81c4065962d796da4e85beb4e4465c51'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-33-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Hoy `Tienda.marca` es obligatoria, así que Héctor no puede declarar una tienda ni curar sus ediciones sin haber solicitado ya la cuenta de afiliado, y solicitarla arranca el plazo de 180 días de ventas. Además nada impide encender la afiliación con una tienda a medias.

**Approach:** `marca` pasa a ser opcional (se omite sin valor) y se añade `TiendaConMarca`. `urlDeEdicion` solo acepta por su tipo una tienda con marca y lanza en ejecución si le llega una sin ella. `edicionesEnVenta` lanza nombrando la tienda y la ficha. `revisarDeclaracionDeIngreso` para el build si la afiliación está encendida y alguna tienda no tiene marca. El esquema y la orden `edicion` admiten ediciones de una tienda sin marca, y `npm run ingreso` dice qué tiendas no la tienen. Apagado, `dist/` sale idéntico en las cuatro variantes.

## Boundaries & Constraints

**Always:**
- `TIENDAS` sigue siendo `export const TIENDAS: readonly Tienda[] = [];` en el árbol, tal cual. Toda tienda de prueba es inventada, de dominio `.example`, y solo existe en la copia (AD-21) o en el proceso por parámetro.
- Convención de ausencia: sin marca, el campo `marca` se omite. `revisarTiendas` rechaza, con el Modelo encendido o apagado, una marca presente vacía o con espacios, y también una `marca` escrita como `undefined` (`Object.hasOwn`). Una tienda sin el campo no se rechaza. Las reglas de clave, nombre, dominio, `parametro` (que se sigue exigiendo) y unicidad no cambian.
- `urlDeEdicion` nunca escribe `tag=` vacío ni `tag=undefined`.
- La puerta del encendido nombra **cada** tienda sin marca por clave y nombre, y solo esas. El fallo de la 22.9 (encendido sin ninguna tienda) sigue en pie, y con todas las tiendas con marca se construye como hoy.
- El `--json` de `npm run ingreso` lleva `conMarca` por tienda, y nunca la marca ni el parámetro. La orden sigue sin escribir y sale con 0. El Umbral sigue diciendo **solicitar**.
- Las ediciones de una tienda sin marca pasan por las mismas reglas de esquema que las de una con marca: dominio o subdominio, `https://`, sin puerto y sin el `parametro` en ninguna capitalización.
- `edicion` sigue negándose con 1, sin escribir, con `CONGELACION_DE_OBRAS`.

**Block If:**
- Las cuatro variantes apagadas no salen idénticas byte a byte por una causa ajena a esta historia (por ejemplo, el hash de un fichero de `/_astro/` que dependa del texto de `src/lib/ingreso.ts`) y cerrarla exigiría tocar la configuración del empaquetado: HALT con la ruta y el fichero que difieren.

**Never:**
- Escribir una tienda real o una marca en `src/lib/ingreso.ts`, ni encender un Modelo en el árbol.
- Que el comentario de `TIENDAS` siga poniendo una tienda real de ejemplo (hoy pone «Amazon México»): debe usar valores inventados.
- Tocar la agrupación de «Dónde leer esta obra», `edicionesPorFormato` ni la congelación que oculta: son de la 33.2.
- Escribir en ningún sitio que cruzar el Umbral sea encender.
- Editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tienda sin marca, apagada | `[{clave,nombre,dominio,parametro}]` | `revisarTiendas` → `[]`, y `revisarDeclaracionDeIngreso` → `[]` | — |
| Marca en blanco o `undefined` escrito | `marca: ' '` / `marca: undefined` | `revisarTiendas` da un fallo que menciona la marca | — |
| Encendida, una con marca y otra sin | `[conMarca, sinMarca]` | un fallo que nombra `«sinMarca.clave»` y su nombre, y no a la otra | El build se detiene |
| Encendida, sin tiendas | `[]` | el fallo «no declara ninguna tienda» de la 22.9 | El build se detiene |
| `urlDeEdicion` recibe una sin marca por un `as` | tienda sin `marca` | lanza nombrando la tienda | El `@ts-expect-error` fija el tipo |
| `edicionesEnVenta` recibe una edición de una tienda sin marca | ficha `X`, tienda `Y` | lanza nombrando `Y` y `X` | — |
| `edicion` con una tienda sin marca | ficha válida | escribe la edición, y el parte dice que la tienda no tiene marca y que la edición no se pintará hasta que Héctor declare la marca y encienda el Modelo | Congelada: sale con 1 y no escribe |

</intent-contract>

## Code Map

- `src/lib/ingreso.ts` — `interface Tienda` (≈l.243; `marca` obligatoria hoy) y el comentario de `TIENDAS` (≈l.255-270, ejemplo real «amazon-mx» que hay que sustituir). `urlDeEdicion` (≈l.304, `Pick<Tienda,'parametro'|'marca'>`), `edicionesEnVenta` (≈l.323), `revisarTiendas` (≈l.352; la regla de la marca está en l.374). En `revisarDeclaracionDeIngreso`, la rama de la afiliación (≈l.722), que hoy solo mira `tiendas.length === 0`. El `throw` al cargar (final del fichero) es lo que para `astro build`.
- `src/pages/obra/[autor]/[slug]/[...page].astro:116` — el único que llama a `edicionesEnVenta(obra.ediciones)`. `obra.nombre` (ObraResuelta) es el nombre de la ficha.
- `src/lib/admision.ts:684-760` — `edicionAdmisible`. No usa `marca`, así que debería admitir ya una tienda sin marca: solo hay que probarlo.
- `tools/lib/obras.ts:840-935` — `declararEdicion`: el parte de éxito (≈l.925-933) y el texto del rechazo con el conjunto vacío (≈l.869: «con su marca»), que pasa a decir que la tienda se declara sin marca o con ella.
- `tools/lib/ingresos.ts:412-447` — `datosDelInforme` (tiendas → hay que añadir `conMarca`) y `textoDeTiendas` (marcar las que no tienen marca, y decir que con alguna así el Modelo no se enciende).
- `tests/unit/ayuda/construir.ts:631-669` — `TIENDA_DE_PRUEBA` y `fuenteConTiendaDePrueba(fuente)`, que se parte por `TIENDAS_VACIAS` (exactamente una vez).
- `tests/unit/ediciones-en-venta.test.ts` — las pruebas de la 22.9:
  - `const TIENDA: Tienda` (l.54) pasa a `TiendaConMarca`.
  - `urlDeEdicion` en l.98 recibe una tienda parcial.
  - `corpusConstruido(conEdiciones)` (≈l.505) y `ed()` usan siempre `TIENDA`.
  - `construida('encendida'|'apagada')` está memorizada.
  - El describe «apagada, `dist/` igual con y sin ediciones» (≈l.748) compara dos construcciones.
  - Las pruebas de informe (≈l.223-242) esperan `tiendas` sin `conMarca`.
- `tests/unit/ingreso-construido.test.ts:705-753` — «encender sin destino detiene la construcción»: es el patrón del build que falla, con su `CORPUS` mínimo.
- Otros usos de `fuenteConTiendaDePrueba(fuente)` con un solo argumento, que no deben cambiar de comportamiento: `tests/unit/ingreso-construido.test.ts:792,814` y `tests/e2e/ingreso-accesible.spec.ts:222`.
- `AGENTS.md` § «Encender la afiliación de libros», pasos 1 y 3.

## Tasks & Acceptance

**Execution:**
- `src/lib/ingreso.ts` -- Hacer `marca?: string` y exportar `TiendaConMarca = Tienda & { marca: string }` y el guarda `tieneMarca(t): t is TiendaConMarca`. `urlDeEdicion(edicion, tienda: TiendaConMarca)` lanza nombrando clave y nombre si `tienda.marca` no es una cadena no vacía. `edicionesEnVenta` recibe además el nombre de la ficha (firma a elección, con el nombre obligatorio) y lanza nombrando tienda y ficha ante una tienda sin marca. En `revisarTiendas`, la regla de la marca se aplica solo si está presente y además se rechaza `marca` escrita `undefined`. `revisarDeclaracionDeIngreso`, con la afiliación encendida y tiendas declaradas, añade un fallo que nombra cada tienda sin marca («clave» y nombre) y dice que el Modelo no se enciende mientras alguna tienda declarada no tenga marca. El comentario de `TIENDAS` pasa a dar las dos formas con valores inventados (`.example`). -- AD-20, FR-35.
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- Pasar el nombre de la ficha (`obra.nombre`) a `edicionesEnVenta`. -- El error nombra la ficha.
- `tools/lib/obras.ts` -- En el parte de `declararEdicion`: si `!tieneMarca(tienda)`, una línea que diga que la tienda no tiene marca y que la edición no se pintará hasta que Héctor declare la marca y encienda el Modelo. Ajustar el texto del conjunto vacío. -- Que Héctor sepa que la curó, pero no la publicó.
- `tools/lib/ingresos.ts` -- `datosDelInforme`: cada tienda lleva `conMarca: boolean` y nada más nuevo. `textoDeTiendas`: marca «(sin marca)» por tienda y, si hay alguna, añade que con ella el Modelo no se enciende. Revisar el texto del conjunto vacío. -- `npm run ingreso`.
- `tests/unit/ayuda/construir.ts` -- Añadir `TIENDA_SIN_MARCA_DE_PRUEBA`, inventada, de dominio `.example` y sin el campo `marca`. `fuenteConTiendaDePrueba(fuente, tiendas = [TIENDA_DE_PRUEBA])` declara las que se le den (no vacía) y escribe `marca` solo si la hay. El parche sigue rompiendo si la declaración vacía no aparece exactamente una vez. -- Ayudante de las copias.
- `tests/unit/ediciones-en-venta.test.ts` -- Tipar `TIENDA` como `TiendaConMarca`. Añadir unitarias para:
  - `revisarTiendas`: tienda sin marca aceptada; marca en blanco o `undefined` escrito rechazada.
  - La puerta: encendida con `[conMarca, sinMarca]` nombra solo la segunda; con `[]`, el fallo de la 22.9; con todas con marca, `[]`.
  - `urlDeEdicion`: una llamada con `// @ts-expect-error` que pasa una tienda sin marca y se espera que lance nombrándola, y nunca `tag=` vacío.
  - `edicionesEnVenta`: lanza nombrando tienda y ficha.
  - El esquema: admite una edición de la tienda sin marca y la rechaza por dominio, puerto y parámetro.
  - La orden `edicion` con `tiendas: [sinMarca]`: escribe, y el parte lo dice; congelada, sale con 1 y no escribe.
  - El informe: `conMarca`, sin la marca ni el parámetro, y el texto «sin marca».

  Parametrizar `corpusConstruido` por la tienda de las ediciones (ninguna, con marca, sin marca, ambas), sin cambiar lo que construye `construida(...)`. Convertir el describe «apagada» en las cuatro variantes del AC con el mismo `MEDICION_ENDPOINT`:
  - sin tiendas ni ediciones (el `ingreso.ts` del árbol);
  - `construida('apagada')`;
  - la tienda sin marca y sus ediciones;
  - las dos tiendas y ediciones de ambas.

  Las cuatro deben dar huellas iguales, y ningún HTML lleva `data-ingreso="afiliacion-de-libros"` ni los dominios de las dos tiendas. -- AC de los dos estados.
- `tests/unit/ingreso-construido.test.ts` -- Junto a la 14.2, un build que falla: copia con la afiliación encendida (`fuenteConModeloEncendido`) y `[TIENDA_DE_PRUEBA, TIENDA_SIN_MARCA_DE_PRUEBA]`. Sale con un código distinto de 0, la salida nombra la clave y el nombre de la tienda sin marca, y no nombra `«libreria-de-prueba»` en el fallo. -- La puerta para el build.
- `AGENTS.md` -- En § Encender la afiliación de libros: en el paso 1, la tienda se declara sin marca y la marca la añade Héctor el día que solicita la cuenta, nunca un agente. En el paso 3, encender exige que **toda** tienda declarada tenga marca, y si alguna no la tiene, el build se para nombrándola. Decir también que, apagado, `dist/` es idéntico con tiendas con marca o sin ella y con ediciones o sin ellas, y que una prueba lo construye. Retocar lo que hoy diga «con su marca» como requisito para declarar. -- AC de documentación.

**Acceptance Criteria:**
- Given el árbol al cerrar, when se lee `src/lib/ingreso.ts`, then `TIENDAS` sigue vacío, la afiliación apagada y el comentario da las dos formas con valores inventados.
- Given `astro check`, when compila las pruebas, then el `@ts-expect-error` sobre `urlDeEdicion` con una tienda sin marca se cumple, y no aparece ningún error nuevo.
- Given la copia con la afiliación encendida y una tienda con marca y otra sin, when corre `astro build`, then sale con un código distinto de 0 y su mensaje nombra solo la tienda sin marca.
- Given la afiliación apagada, when se construyen las cuatro variantes, then los cuatro `dist/` son idénticos byte a byte, sin `data-ingreso="afiliacion-de-libros"` ni dominio de tienda.
- Given `npm run ingreso -- --json` con tiendas por parámetro, when informa, then cada tienda trae `conMarca` y ninguna trae la marca ni el parámetro. La orden sale con 0.

## Design Notes

Hoy la ruta encendida es inalcanzable con una tienda sin marca: la puerta corta en la carga del módulo, antes de que una página llame a `edicionesEnVenta`. Por eso el `throw` de `edicionesEnVenta` y el de `urlDeEdicion` son la segunda línea, y se prueban por llamada directa, no con un build. La prueba de la puerta en un build es barata porque falla al cargar `src/lib/ingreso.ts`.

## Verification

**Commands:**
- `npx vitest run tests/unit/ediciones-en-venta.test.ts` -- expected: todo verde, incluidas las cuatro variantes.
- `npx vitest run tests/unit/ingreso-construido.test.ts` -- expected: verde, incluido el build que falla.
- `npx vitest run tests/unit/obras.test.ts tests/unit/ingreso-cli.test.ts` -- expected: verde.
- `npx astro check` -- expected: 0 errores.

## Review Triage Log

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

## Auto Run Result

**Resumen.** `Tienda.marca` pasa a ser opcional (se omite sin valor) y se exportan `TiendaConMarca` y `tieneMarca`. `urlDeEdicion` solo acepta por su tipo una `TiendaConMarca` y lanza nombrando la tienda si le llega una sin marca; `edicionesEnVenta` recibe el nombre de la ficha y lanza nombrando tienda y ficha. `revisarTiendas` rechaza una marca presente vacía, con espacios o escrita como `undefined` (`Object.hasOwn`), y acepta una tienda sin el campo. `revisarDeclaracionDeIngreso`, con la afiliación encendida y tiendas declaradas, para el build nombrando cada tienda sin marca por clave y nombre. `TIENDAS` sigue vacío y la afiliación apagada; el comentario da las dos formas con valores inventados (`libreria.example`).

**Ficheros.**
- `src/lib/ingreso.ts` — `marca?`, `TiendaConMarca`, `tieneMarca`, guardas de `urlDeEdicion` y `edicionesEnVenta`, regla de la marca en `revisarTiendas`, puerta del encendido, comentario de `TIENDAS` sin tienda real.
- `src/pages/obra/[autor]/[slug]/[...page].astro` — pasa `obra.nombre` a `edicionesEnVenta`.
- `tools/lib/obras.ts` — el parte de `edicion` avisa de la tienda sin marca; texto del conjunto vacío.
- `tools/lib/ingresos.ts` — `conMarca` por tienda en `--json`; «(sin marca)» y «la afiliación no se enciende» en el texto.
- `tests/unit/ayuda/construir.ts` — `TIENDA_SIN_MARCA_DE_PRUEBA` (`sinmarca.example`) y `fuenteConTiendaDePrueba(fuente, tiendas)`.
- `tests/unit/ediciones-en-venta.test.ts` — unitarias de la 33.1 (tienda sin marca, puerta, `@ts-expect-error`, esquema, orden, informe), `corpusConstruido` parametrizado y las cuatro variantes apagadas.
- `tests/unit/ingreso-construido.test.ts` — build que falla con la afiliación encendida y una tienda sin marca.
- `AGENTS.md` — § Encender la afiliación de libros, pasos 1–3.

**Revisión.** Las capas externas no traen hallazgos en esta pasada: 0 parches, 0 diferidos, 0 rechazados. `followup_review_recommended: false` (parches: 0 high, 0 medium, 0 low; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/ediciones-en-venta.test.ts` — 67/67 verde (dos veces a solas).
- `npx vitest run tests/unit/ingreso-construido.test.ts` — 43/43 verde (dos veces a solas).
- `npx vitest run tests/unit/obras.test.ts tests/unit/ingreso-cli.test.ts` — 158/158 verde; `tests/unit/ingreso.test.ts` 55/55.
- `npx astro check` — 0 errores (el `@ts-expect-error` se cumple).
- `npm run ingreso -- --json` — sale con 0.
- `npm test` completo, dos pasadas con cinco worktrees en paralelo (carga ~43): 7178/7180 y 7177/7180. Los fallos son ajenos a esta historia y pasan al repetirse: un `.woff2` de Google Fonts cuyo hash cambia entre dos construcciones del mismo fuente (rompió también la 14.1 y la 24.7, que no tocan esta historia) y dos plazos de 120 s por carga (`extraer-cli`, `objetivo-cli`). Los tres ficheros, repetidos, pasan.

**Riesgos residuales.** Las cuatro variantes byte a byte suman dos construcciones más a las comparaciones expuestas a la variación de las fuentes de Google al construir; cuando Google sirve otro `.woff2` entre una construcción y otra, fallan igual que la 14.1 y la 24.7.
