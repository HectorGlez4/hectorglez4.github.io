---
title: 'Historia 28.3 — Seis Obras que cambian con la jornada'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_revision: '9a53e82d34e3a4e8aeb73542a32a950c398466e5'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-28-context.md'
  - '{project-root}/AGENTS.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** La portada tiene comentado el hueco de «Obras» (28.1): quien vuelve no ve ningún libro, y el Directorio de Obras solo se alcanza por la cabecera.

**Approach:** Una función pura junto a `citaDelDia` elige cada jornada hasta `OBRAS_DE_LA_PORTADA` Obras del conjunto indexable (`obrasIndexables` por `obrasDelConjunto`), en rondas sobre la lista circular de Autores en el orden del Directorio; la portada las pinta como Filas de bloque bajo el `h2` «Obras», dentro de un subárbol `data-jornada`, con el cierre «Las {n} obras ›» a `/obras/`; el build comprueba que todo el conjunto del que rotan son rutas sin `noindex`.

## Boundaries & Constraints

**Always:**
- **Conjunto:** `obrasDelConjunto(conjunto.citas, conjunto.autores).indexables` en la página (la misma lista que da `rutasIndexables`; con `CONGELACION_DE_OBRAS` ya la estrecha `obrasIndexables`). Nunca `obrasPublicadas`, nunca `SM11_VIGENTE`, y la portada no consulta la congelación.
- **Regla (AD-12):** L = Autores con alguna Obra en el conjunto, ordenados por `compararPorClave({clave: ordenAlfabetico, slug})` (`src/lib/normalizar.ts`), A = |L|; k = min(`OBRAS_DE_LA_PORTADA`, A); d = `diasDesdeLaEpoca(jornada)` (el origen de `citaDelDia`). Para j = 0…k−1: p = d·k + j, Autor = L[p mod A], n = ⌊p / A⌋, Obra = suyas[n mod |suyas|], con `suyas` en `ordenDeLaListaDeObras`. Salida en orden de j. Módulos y división seguros con d negativo. A = 0 → `[]`.
- La función no recibe fijaciones ni la Cita del Día; lanza si una Obra es de un Autor que no está en la lista recibida o si ese Autor no tiene `ordenAlfabetico` (como `autoresDestacados`).
- `OBRAS_DE_LA_PORTADA = 6` en `src/lib/umbrales.ts`, con comentario; ningún 6 literal en la función, la página ni las pruebas (que importan la constante).
- **Marca única:** un solo componente nuevo, `src/components/LoQueRota.astro`, es el único fichero de `src/` y `public/` que nombra `data-jornada`; envuelve su `slot` en un elemento (`section` o `div`, por prop) con `class` opcional, `data-jornada` y `data-pagefind-ignore="all"`, en ese orden, sin `<style>`. `CitaDelDia.astro` lo usa para su `section.del-dia` y su salida sigue empezando `<section class="del-dia" data-jornada data-pagefind-ignore="all"`.
- **Bloque (solo si el conjunto no está vacío):** tras la Cita del Día (o `.entrada`) y antes de «Temas»: `<section aria-labelledby="obras">` con `<Rotulo id="obras">Obras</Rotulo>`; a 2 × `--unidad`, `<LoQueRota>` con un `ul` (filete arriba) de `FilaDeBloque` sin `avance`, `zona="obras-de-portada"`, `href={rutaDeLaObra(obra)}`; contenido de la fila: título (Inter, `--cuerpo-lg`, 600, `--tinta`, parte palabras), `<span class="solo-para-lectores">, </span>` y los hechos de `contenidoDeTarjetaDeObra(autor, obra).hechos` unidos como en `TarjetaDeObra.astro` (punto medio `aria-hidden` + coma para lectores) en `--pie` y `--tinta-apagada`. Fuera de `LoQueRota`, a 2 × bajo la lista: `<p data-zona="obras-de-portada"><a href={rutaDelDirectorioDeObras()}>{cierreDeLasObras(n)}<span aria-hidden="true">&nbsp;›</span></a></p>`, en `--cuerpo-md`, `--tinta`, subrayado siempre, alto de toque `--zona-de-toque`. n = `directorioDeObras(conjunto.autores, conjunto.citas).obras` (también las no indexables).
- `cierreDeLasObras(n)` en `src/lib/atribucion.ts`: «Las {milesEnEspañol(n)} obras»; con 1, «La 1 obra». Sin glifo.
- **AD-17 en el build:** `integraciones/indexables.ts` guarda en `astro:build:start` las rutas de las indexables (el conjunto del que rotan) y en `astro:build:done` rompe, junto a los demás desajustes, si alguna no tiene página en `dist/` o la tiene con `noindex`, nombrando la ruta. La comprobación es una función pura nueva de `tools/lib/indexables.ts`.
- Tokens de `tokens.css`; ningún `nowrap`; nada se recorta (NFR-12). Ningún guion, ningún `data-ingreso`, ningún enlace comercial en el bloque.

**Block If:**
- `npm run build` con el Corpus real rompe la puerta de NFR-5 o la nueva comprobación de AD-17: el tope no se relaja.
- `astro check` o el build no admiten el elemento dinámico de `LoQueRota.astro` sin cambiar la salida de `CitaDelDia.astro` más allá de perder su `data-astro-cid-*`.

**Never:**
- No tocar la rotación de la Cita del Día (`ordenEnRondas`, `citaDelDia`); `tests/unit/cita-del-dia.test.ts` sin cambios y en verde.
- No construir lo de la 28.2 (Tarjeta, acciones, «Ver esta cita» en tinta) ni de la 28.4 (destacados, criterios, cierre de Autores); no tocar el 404 salvo lo que arrastre `CitaDelDia.astro`.
- No zonas ni exenciones nuevas; no tocar `src/lib/vocabulario.ts`; no añadir filas a `COLOCACION` de `medicion.test.ts` (`obras-de-portada` es de otra épica: AGENTS.md).
- No editar `_bmad-output/planning-artifacts/` ni `_bmad-output/specs/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| ≥ 6 Autores | 8 Autores con Obras, jornada d | 6 Obras de 6 Autores distintos, ventana desde la posición 6d mod 8 | — |
| Jornada siguiente | misma lista, d+1 | ventana avanza 6 puestos; cada Autor que reaparece da su siguiente Obra | — |
| < 6 Autores | 3 Autores (uno de 1 Obra, otro de 3) | 3 Obras, una por Autor; cada jornada el de 3 da la siguiente (n = d) y el de 1 repite | — |
| Conjunto vacío | sin indexables | `[]`; la portada sin rótulo, lista ni cierre | — |
| Fijación | `portada.json` fija la jornada | mismas Obras que sin fijación | — |
| Obra de la Cita del Día | la regla la elige | sigue entre las Obras | — |
| Autor sin clave | Obra de Autor sin `ordenAlfabetico` | — | lanza nombrando el Autor |
| Cierre | n = 1 / n = 1234 | «La 1 obra» / «Las 1.234 obras» | — |

</intent-contract>

## Code Map

- `src/lib/citaDelDia.ts` -- `jornadaDelBuild`, `diasDesdeLaEpoca` (privada, el origen de n), `ordenEnRondas`/`citaDelDia` (no tocar). Aquí va `obrasDelDia(obras, autores, jornada)`; importa `ordenDeLaListaDeObras` (`src/lib/obras.ts`), `compararPorClave` y `OBRAS_DE_LA_PORTADA`. Es un módulo que lee `FECHA_JORNADA`: solo lo importan las cinco páginas de `PAGINA_DE` de `tests/unit/peso.test.ts`; la página que lo use ya está en la lista.
- `src/lib/publicado.ts` -- `obrasDelConjunto` (l. ~1066, `.indexables`), `obrasIndexables` (l. ~1109, con `congelacionVigente`), `rutasIndexables`; `autoresDestacados` (l. 204) como modelo de «lanza sin clave».
- `src/lib/obras.ts` -- `ordenDeLaListaDeObras` (l. 137), `rutaDeLaObra` (l. 122), `ObraResuelta` (l. 727: `año` ya omitido si discrepa o es de traducción).
- `src/lib/directorios.ts` -- `directorioDeObras(...).obras` (l. 187): el n del cierre.
- `src/lib/atribucion.ts` -- `contenidoDeTarjetaDeObra` (l. 360, `hechos`), cierres de 24.6 (l. 396–426) como modelo; aquí `cierreDeLasObras`. `milesEnEspañol` en `src/lib/formato.ts`.
- `src/lib/superficies.ts` -- `rutaDelDirectorioDeObras`.
- `src/lib/umbrales.ts` -- junto a `AUTORES_DESTACADOS` (l. 698), `OBRAS_DE_LA_PORTADA`.
- `src/components/CitaDelDia.astro` -- hoy único emisor de `data-jornada` (`<section class="del-dia" data-jornada data-pagefind-ignore="all">`); pasa a usar `LoQueRota`. Su comentario de cabecera se actualiza.
- `src/components/FilaDeBloque.astro` -- `li.fila-de-bloque[data-zona]`, slot dentro de un único `span`; el texto en la misma línea que las etiquetas.
- `src/components/TarjetaDeObra.astro` -- cómo se unen los `hechos` con punto medio y coma para lectores, y el `ul.filas` con filete arriba.
- `src/pages/index.astro` -- el comentario «Historia 28.3 — aquí entrará «Obras»» marca el sitio; estilos de `section` (6 ×, `--medida-prosa`) ya puestos; `jornada` ya calculada. Comentario de cabecera.
- `integraciones/indexables.ts` -- `build:start` (l. ~90, `obrasDelCorpusEnDisco`) y `build:done` (`desajustesDeIndexables`).
- `tools/lib/indexables.ts` -- `PaginaIndexable` (l. 35), `desajustesDeIndexables` (l. 125); aquí la función pura nueva.
- `tools/lib/alcance.ts` -- `MARCA_DE_JORNADA` (l. 60, comentario «Lo emite solo CitaDelDia.astro»), el salto de subárboles (l. ~185).
- `tests/unit/alcance-construido.test.ts` -- l. 121–151: pins de la marca (portada y 404, una vez; solo `CitaDelDia.astro` la nombra).
- `tests/unit/dos-jornadas.test.ts` -- `sinLoQueRota` quita solo el primer subárbol; fixture de un solo Autor sin Obras indexables.
- `tests/unit/directorio-de-obras.test.ts`, `tests/unit/ediciones-en-venta.test.ts` -- fixtures de varios Autores y Obras, y la afiliación encendida en copia (`fuenteConModeloEncendido(…, 'afiliacion-de-libros')`, `fuenteConTiendaDePrueba`, `TIENDA_DE_PRUEBA`).
- `tests/unit/ayuda/construir.ts` -- `construirConCorpus(corpus, { jornada, ficheros })`.
- `tests/unit/publicable-y-alcanzable.test.ts` -- orden de rótulos de la portada (28.1).
- `tests/e2e/accesibilidad.spec.ts` -- `CONDICIONES` y `cargarEn320` (l. 821–870), privados; `tests/e2e/busqueda-historial.spec.ts` -- patrón de servidor propio en un puerto (usa 4403).
- `AGENTS.md` -- l. 45 (punto de NFR-5): «la marca `data-jornada` la emite **solo** `src/components/CitaDelDia.astro`»; pasa a `LoQueRota.astro`, usado por la Cita del Día y las Obras de la portada.

## Tasks & Acceptance

**Execution:**
- `src/lib/umbrales.ts` -- `OBRAS_DE_LA_PORTADA = 6`, comentado (AD-9, AD-12).
- `src/lib/citaDelDia.ts` -- `obrasDelDia` pura con la regla de Always y su comentario (AD-12, AD-25, ventana que avanza k puestos).
- `src/lib/atribucion.ts` -- `cierreDeLasObras(n)`.
- `src/components/LoQueRota.astro` -- el emisor único, comentado (por qué uno solo; quién lo salta: el grafo de NFR-5 y la prueba de dos jornadas).
- `src/components/CitaDelDia.astro` -- usar `LoQueRota` para la `section.del-dia`; comentario.
- `src/pages/index.astro` -- el bloque «Obras» con sus estilos (lista a 2 ×, cierre a 2 ×, título/hechos, cierre subrayado con alto de toque); comentario de cabecera.
- `tools/lib/indexables.ts` + `integraciones/indexables.ts` -- la comprobación de AD-17 sobre el conjunto del que rotan; comentarios.
- `tools/lib/alcance.ts`, `AGENTS.md` -- el emisor es `LoQueRota.astro`.
- `tests/unit/obras-del-dia.test.ts` (nuevo, puro) -- la matriz: ≥ 6 Autores (6 distintos, ventana), jornada siguiente, < 6 Autores con un Autor de 1 Obra y otro de varias (el segundo enseña la siguiente en cada vuelta), vacío, lanza sin clave, d negativo, orden independiente del de entrada, la Obra de la Cita del Día (`citaDelDia`) que la regla elige sigue entre las Obras, y `cierreDeLasObras`.
- `tests/unit/obras-de-la-portada.test.ts` (nuevo, con builds) -- fixture de ≥ 7 Autores con Obras indexables y alguno con Obras no indexables; construcciones a la misma jornada: base, con fijación en `portada.json`, y con la afiliación encendida + `TIENDA_DE_PRUEBA` + `ediciones` en una ficha del conjunto. Exige: `h2` «Obras» entre «La cita de hoy» y «Temas»; `OBRAS_DE_LA_PORTADA` filas de Autores distintos, iguales y en el orden de `obrasDelDia` sobre el mismo conjunto; cada fila con `data-zona="obras-de-portada"`, `href` de Página de Obra indexable, sin `target`; hechos con punto medio `aria-hidden`; filas dentro de un único `[data-jornada]` y el `h2` y el cierre fuera; cierre con el n del Directorio de Obras y `href` `/obras/`; la sección idéntica en las tres construcciones y sin enlaces fuera del sitio; y una variante sin Obras indexables sin rótulo «Obras» ni cierre.
- `tests/unit/indexables.test.ts` o el que ya prueba `desajustesDeIndexables` (`obra-indexable.test.ts`) -- la función pura de AD-17: ruta ausente y ruta con `noindex` se nombran; todas bien, vacía.
- `tests/unit/alcance-construido.test.ts` -- pins: el único fichero que nombra la marca es `LoQueRota.astro`; `CitaDelDia.astro` no la nombra; en `dist/` la portada y el 404 conservan `<section class="del-dia" data-jornada ` con «Ver esta cita», y la portada puede llevar además el subárbol de las Obras.
- `tests/unit/dos-jornadas.test.ts` -- `sinLoQueRota` quita todos los subárboles marcados (con `recorrerElementos`); el fixture gana un Autor con dos Obras indexables y clave, de modo que las Obras de la portada cambian entre las dos jornadas; aserción de que cambian y de que fuera de los subárboles todo es igual.
- `tests/unit/publicable-y-alcanzable.test.ts` -- incluir «Obras» en el orden de rótulos si su fixture tiene indexables.
- `tests/e2e/obras-de-la-portada.spec.ts` (nuevo) -- copia con fixture (≤ 6 Autores con Obras, uno con una sola Obra indexable de título larguísimo, con una palabra de 30+ letras) y jornada fija, servida con `tests/servidor.mjs` en el puerto 4404 (comprobar libre, cerrar al final); la Obra sale; a 320 px en las tres condiciones de la 26.9 su título parte en varias líneas y no hay desplazamiento horizontal. Mover `CONDICIONES`/`cargarEn320` a `tests/e2e/ayuda/` y reutilizarlos en las dos.
- `tests/e2e/portada.spec.ts` -- con el sitio de siempre: el bloque tras «La cita de hoy» y antes de «Temas», `OBRAS_DE_LA_PORTADA` filas de Autores distintos, tipografías y colores medidos (título Inter body-lg 600 tinta; hechos caption tinta apagada), filas que se tocan, cierre a 2 × con subrayado y 44 px, y el número del cierre igual al de Obras de `/obras/`.

**Acceptance Criteria:**
- Given la portada construida con el Corpus real, when se lee `main`, then entre «La cita de hoy» y «Temas» está «Obras» con seis Filas de bloque de seis Autores distintos y «Las {n} obras ›» a `/obras/`, y el 404 no lo lleva.
- Given dos jornadas del mismo commit, when se construyen, then los veredictos, avisos y el HTML fuera de los subárboles `data-jornada` son idénticos, y las Obras cambian.
- Given una Obra del conjunto del que rotan sin página o con `noindex` en `dist/`, when acaba el build, then rompe nombrando su ruta.
- Given el sitio construido, when se busca en `src/` y `public/` la marca, then solo `src/components/LoQueRota.astro` la nombra.
- Given `npm run build`, `astro check` y `tests/unit/cita-del-dia.test.ts`, when corren, then pasan.

## Design Notes

**Por qué un emisor nuevo.** AD-12 exige una sola marca puesta por un solo componente, y la espina (AD-11) cuenta «las seis Obras» entre los bloques que el grafo salta por esa marca. `CitaDelDia.astro` no puede pintar las Obras (el 404 lleva la Cita sin Obras), así que la marca pasa a un componente sin otro trabajo, que usan los dos bloques. El salto del grafo, la prueba de dos jornadas y Pagefind no cambian: siguen el atributo, no el componente.

**Ventana.** Con A = 8, k = 6: d = 0 → posiciones 0–5 (Autores 0–5, n = 0); d = 1 → 6–11 (Autores 6, 7, 0, 1, 2, 3; los cuatro últimos con n = 1, su segunda Obra módulo las suyas). Con A < 6, k = A y n = d: cada jornada cada Autor suma una aparición.

**El cierre con 1.** Solo se da en pruebas; concuerda como la línea de cifras de la 28.1 («1 cita»).

## Verification

**Commands:**
- `npx vitest run tests/unit/obras-del-dia.test.ts` y `tests/unit/cita-del-dia.test.ts` -- verde.
- `npx vitest run` uno por uno: `obras-de-la-portada`, `dos-jornadas`, `alcance-construido`, `publicable-y-alcanzable`, `obra-indexable` (o donde vaya la de AD-17), `medicion`, `peso` -- verde.
- `npx astro check` -- 0 errores.
- `npm run build` -- termina; NFR-5 y AD-17 pasan con el Corpus real; la portada lleva seis Obras.
- `npx playwright test tests/e2e/obras-de-la-portada.spec.ts tests/e2e/portada.spec.ts` (móvil y escritorio) y `tests/e2e/accesibilidad.spec.ts -g "320|axe"` -- verde, con los puertos 4321, 4404 y 8787 libres.

## Spec Change Log

## Review Triage Log

### 2026-10-30 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las cinco capas de revisión son externas (bucle v8-ralph) y no traían hallazgos en esta pasada; la revisión independiente viene después.

## Auto Run Result

Status: done
Blocking condition: ninguna. Implementada en línea sobre la base `9a53e82d34e3a4e8aeb73542a32a950c398466e5`.

**Resumen.** La portada enseña, entre «La cita de hoy» y «Temas», hasta `OBRAS_DE_LA_PORTADA` (6) Obras indexables de Autores distintos, elegidas por `obrasDelDia` con la regla de AD-12 (rondas sobre la lista circular de Autores en el orden del Directorio, ventana que avanza k puestos por jornada, n-ésima Obra del Autor en su n-ésima aparición), como Filas de bloque dentro del subárbol que rota, y el cierre «Las {n} obras ›» a `/obras/` fuera de él. La marca de lo que rota pasa a un emisor único sin otro trabajo, `LoQueRota.astro`, que usan la Cita del Día y las Obras. El build rompe si una Obra del conjunto del que rotan no tiene página o la tiene con `noindex` (AD-17).

**Ficheros.**
- `src/lib/umbrales.ts` — `OBRAS_DE_LA_PORTADA = 6`, comentada.
- `src/lib/citaDelDia.ts` — `obrasDelDia` pura (y `modulo` seguro con negativos); lanza ante un Autor ausente o sin clave.
- `src/lib/atribucion.ts` — `cierreDeLasObras(n)` («La 1 obra», «Las 1.234 obras»).
- `src/components/LoQueRota.astro` — nuevo, único emisor de la marca (dos ramas estáticas `section`/`div`, sin `<style>`).
- `src/components/CitaDelDia.astro` — usa `LoQueRota`; su salida sigue empezando `<section class="del-dia" data-jornada data-pagefind-ignore="all">`.
- `src/pages/index.astro` — el bloque «Obras» y sus estilos (lista y cierre a 2 ×, título Inter `body-lg` 600, hechos `caption` apagados, cierre subrayado con 44 px).
- `tools/lib/indexables.ts`, `integraciones/indexables.ts` — `desajustesDeLasObrasDeLaPortada` y su uso en `astro:build:done`.
- `tools/lib/alcance.ts`, `AGENTS.md` — el emisor de la marca es `LoQueRota.astro`.
- `tests/unit/obras-del-dia.test.ts` (nuevo), `tests/unit/obras-de-la-portada.test.ts` (nuevo, cuatro construcciones), `tests/unit/obra-indexable.test.ts` y `tests/unit/obra-pagina.test.ts` (AD-17 puro y en build), `tests/unit/alcance-construido.test.ts`, `tests/unit/dos-jornadas.test.ts` (quita todos los subárboles; Epicteto con dos Obras que alternan), `tests/unit/publicable-y-alcanzable.test.ts` y `tests/unit/tarjeta-de-obra.test.ts` (la portada lleva ahora «Obras» y sus Filas de bloque).
- `tests/e2e/ayuda/reflujo.ts` (nuevo, `CONDICIONES`/`cargarEn320`/`anchoDeLaPagina` sacados de `accesibilidad.spec.ts`), `tests/e2e/obras-de-la-portada.spec.ts` (nuevo, puerto 4404), `tests/e2e/portada.spec.ts`.

**Hallazgos.** Ninguno en esta pasada (capas externas sin hallazgos): 0 parches, 0 diferidos, 0 rechazados. `followup_review_recommended: false` (parches: 0 high, 0 medium, 0 low; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/obras-del-dia.test.ts tests/unit/cita-del-dia.test.ts` — verde.
- Por fichero: `obras-de-la-portada`, `dos-jornadas`, `alcance-construido`, `publicable-y-alcanzable`, `obra-indexable`, `obra-pagina`, `tarjeta-de-obra`, `medicion`, `peso` — verdes.
- `npm test` entero — 7.075/7.077 en la primera corrida; los dos fallos (`obra-pagina`: un parche de prueba que dejó de encontrar su literal; `tarjeta-de-obra`: la portada ya lleva Filas de bloque) se corrigieron y sus ficheros pasan.
- `npx astro check` — 0 errores, 0 avisos.
- `npm run build` con el Corpus real — termina; NFR-5 pasa (5.115 superficies a ≤ 3 saltos), los indexables coinciden y AD-17 no objeta; la portada lleva seis Obras de seis Autores y «Las 517 obras ›».
- `npx playwright test tests/e2e/obras-de-la-portada.spec.ts tests/e2e/portada.spec.ts` (móvil y escritorio) — 44 verdes, 2 saltadas por perfil; `tests/e2e/accesibilidad.spec.ts -g "320|axe"` — 148 verdes. Puertos 4321, 4404 y 8787 libres antes y después.
- Matriz: cada fila cubierta por `obras-del-dia.test.ts` (≥ 6 Autores, jornada siguiente, < 6 Autores, vacío, Autor sin clave, Obra de la Cita del Día, cierre) y `obras-de-la-portada.test.ts` (fijación, vacío construido).

**Riesgos residuales.** El cierre no usa exactamente el marcado de la Intent (lleva un `span` que agrupa texto y glifo dentro del enlace, como `FilaDeBloque`, para que el glifo no quede en su propia columna flexible). La 28.4 quitará la lista de Autores de la portada; las Obras no cambian el grafo de NFR-5 porque van en el subárbol que rota.
