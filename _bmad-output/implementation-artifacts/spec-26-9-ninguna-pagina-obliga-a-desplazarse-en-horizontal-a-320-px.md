---
title: 'Ninguna página obliga a desplazarse en horizontal a 320 px'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_revision: '0da4496a1fffa01c5057b1b4eb3676ff3314fd01'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-26-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** NFR-8/UX-DR103 piden que a 320 px ninguna superficie pida desplazamiento horizontal con el texto por omisión, al 200 % y con el espaciado de 1.4.12, y nadie lo mide: solo hay la comprobación de 360 px (2.8) y pruebas sueltas a 320. Medido el 2026-10-28 sobre el `dist/` de la rama: por omisión y con espaciado todo pasa; con zoom 2 desbordan la portada y el 404 (496 frente a 320: palabra de la Cita del Día, chips), la Página de Cita (340: `h1.texto`, «Compartir en», Rutas de salida), Tema (488: la fila de la Paginación no se parte), Autor (395: `h2.rotulo`, fragmentos), Colección (430: `h1`), Obra (395). `/autores/`, `/obras/` y `/buscar/` pasan.

**Approach:** Extender el barrido móvil de `tests/e2e/accesibilidad.spec.ts` a 320 px en las tres condiciones sobre toda la muestra `SUPERFICIES`, más la Paginación con más páginas, los títulos de Obra que comparten fila y la regla de `nowrap`; y corregir lo construido (CSS) hasta que pase. Un ensayo con `body{overflow-wrap:break-word}`, `min-width:0` en los ítems flex que lo necesitan y `flex-wrap` en `.paginacion` dejó las ocho superficies medidas a 320.

## Boundaries & Constraints

**Always:**
- El 200 % se simula con `document.documentElement.style.zoom = '2'` tras cargar: la ventana sigue a 320 (las media queries ven 320) y el ancho CSS queda a 160; la prueba lo declara en un comentario y comprueba la premisa (el ancho CSS de `body` es la mitad del de la ventana). El espaciado de 1.4.12 se inyecta con `addStyleTag`: `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important } p { margin-bottom: 2em !important }`, y la prueba comprueba que se aplicó (`letter-spacing` calculado ≠ `normal`).
- El criterio de desbordar es el de la 2.8: `documentElement.scrollWidth > documentElement.clientWidth`. El mensaje nombra ruta y condición, y se miden todas las superficies antes de fallar (`expect.soft` o lista acumulada), para ver todo lo que desborda de una pasada.
- «Visible», para la regla de `nowrap`: caja de más de 1 × 1 px y fuera de `.solo-para-lectores`/`.oculto` (los únicos `nowrap` del sitio hoy, y son legítimos). Se mira `white-space` y `text-wrap-mode` en `a, button, input, select, textarea, summary, label, h1…h6`.
- Las correcciones van en lo construido —también en componentes de la Épica 24 (`TarjetaDeObra.astro`, `FilaDeBloque.astro`, pie de la Cita)—, con tokens y sin literales de color/tipografía. Partir palabras es `overflow-wrap` (`break-word` en bloque; `anywhere` o `min-width: 0` donde un ítem flex/grid fija su mínimo por contenido, porque `break-word` no baja el min-content). Una fila que no cabe se parte (`flex-wrap`), una rejilla pasa a una columna (DESIGN.md § Layout & Spacing «Reflujo sin desbordar»).
- Con el texto por omisión a 360 y a 320 px, nada cambia de forma: la fila de la Paginación sigue siendo una («Siguiente» en la misma fila que «Página N de M») y siguen en verde las pruebas existentes de zonas de toque, cabecera, Directorios y del pie de la Obra.
- La comprobación de 360 px de la 2.8 se queda tal cual.

**Block If:**
- Una superficie solo deja de desbordar encogiendo un cuerpo de letra, cambiando un tramo de `src/lib/tramos.ts`, ocultando o recortando contenido, o rehaciendo un componente fuera de lo que DESIGN.md permite (partir fila, una columna, partir palabras): HALT `blocked` con la ruta, la condición y la medida — es decisión de `bmad-ux`.

**Never:**
- Relajar la prueba: cambiar el ancho, sacar superficies, añadir exenciones por ruta, tolerancia en píxeles al `scrollWidth`, u `overflow-x: hidden` en `html`/`body`/contenedores para tapar el desborde.
- `hyphens` sobre el texto de una Cita (es texto literal; partir sin guion basta). `white-space: nowrap` en un control o encabezado visible.
- Tocar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`; la rejilla «Compartir en» nueva (Épica 25) y las Obras de la portada (28).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Por omisión | toda ruta de `SUPERFICIES`, 320 × 640 | `scrollWidth ≤ clientWidth` | falla nombrando ruta y «texto por omisión» |
| Texto al 200 % | ídem, zoom 2 sobre `<html>` | ídem; la palabra larga parte línea | falla nombrando ruta y «texto al 200 %» |
| Espaciado 1.4.12 | ídem, hoja inyectada | ídem | falla nombrando ruta y «espaciado de 1.4.12» |
| Premisa vacía | zoom u hoja que no se aplicó | la prueba falla por la premisa, no pasa en verde | mensaje «la simulación no se aplicó» |
| Paginación mayor | listado de Autor/Tema/Colección/Obra con más páginas del `dist/` (hoy `/tema/el-saber/`, 12) | a 360: números 44 × 44, ≥ 7,5 px entre zonas en fila y entre filas, ≥ 2 filas; a 320 en las tres condiciones, sin desbordar | sin listado de 2+ páginas, falla nombrándolo |

</intent-contract>

## Code Map

- `tests/e2e/accesibilidad.spec.ts:75-176` -- `DERIVADAS = superficiesDelBarrido(rutasConstruidas())`, `OBRAS_DEL_BARRIDO` (cuatro caras), `CITAS_DEL_BARRIDO` (24.4/24.6) → `SUPERFICIES`: la muestra del barrido nuevo, sin escribir rutas.
- `tests/e2e/accesibilidad.spec.ts:780-790` -- «en 360px no hay desplazamiento horizontal»: se queda; el de 320 va a su lado, en el mismo `describe`.
- `tests/e2e/accesibilidad.spec.ts:961-1019` -- prueba de la 22.10 que elige el Autor con más páginas (`readdirSync(dist/autor)`): pasa a elegir por número de páginas entre `autor/*`, `tema/*`, `coleccion/*` y `obra/*/*` (subdirectorios numéricos + 1), desempate por ruta.
- `tests/e2e/accesibilidad.spec.ts:229-293` -- títulos de Obra a 320/360 solo por omisión (Tarjeta de Obra, Cabecera de Obra): modelo para medir títulos en las tres condiciones. `citaConTituloDeObraMasLargo` en `tests/e2e/ayuda/corpus.ts`.
- `tests/e2e/cabecera.spec.ts:95-110,274-300` -- patrón de zoom 2 y de la detección de `nowrap`/`textWrapMode`; el comentario de `:274-281` («hoy desborda el contenido de la Página de Cita») se pone al día.
- `tests/e2e/directorio-de-obras.spec.ts:175-230` -- recuento sin encogerse y título largo a 320 por omisión: no deben romperse.
- `src/styles/tokens.css:108-118` -- `body`: sitio de la regla global de partir palabras.
- `src/components/Paginacion.astro` (`.paginacion` flex sin `wrap`; `.numeros` flex-wrap) -- «Siguiente» se sale con zoom 2.
- `src/components/Chips.astro:40-65` -- `.chips` (flex-wrap) / `.chip`: un nombre largo de Tema desborda el chip con zoom 2.
- `src/islands/CompartirEnlace.astro` (`ul.destinos`), `src/islands/ImagenDeCita.astro` (`div.isla`), `src/components/RutasDeSalida.astro:125-140` (`.salidas`) -- desbordan en la Página de Cita con zoom 2.
- `src/components/BloqueDeCita.astro:73`, `src/components/CitaDelDia.astro`, `src/components/TarjetaDeCita.astro:176-198`, `src/components/Rotulo.astro` -- texto de la Cita, `.fragmento`, `h2.rotulo` que no parten palabra.
- `src/components/TarjetaDeObra.astro:146-148`, `src/components/ListaDeObras.astro:96-131`, `src/components/FilaDeAutor.astro:37`, `src/pages/obras.astro:139` -- títulos/nombres que ya parten (`break-word`/`anywhere`); referencia y comprobación.
- `src/components/LetrasDeSalto.astro` -- rejilla `auto-fill` de 44 px: a 160 px CSS da dos columnas, sin contenedor desplazable.
- `tests/unit/tarjeta-de-cita.test.ts:303,328`, `tests/unit/lista-de-obras.test.ts:125-131`, `tests/unit/tarjeta-de-obra.test.ts:361,417` -- fijan `overflow-wrap` y prohíben `nowrap` en el CSS de esos componentes: mantenerlos verdes.

## Tasks & Acceptance

**Execution:**
- `tests/e2e/accesibilidad.spec.ts` -- añadir «Historia 26.9 — reflujo a 320 px»: por cada ruta de `SUPERFICIES`, las tres condiciones con premisa comprobada; regla de `nowrap` en controles y encabezados visibles; títulos de Obra que comparten fila (Tarjeta de Obra de `CITAS_24_4.tituloLargo`, la fila de título más largo de `/obras/` y la Lista de Obras del Autor cuyo título es el más largo) en las tres condiciones: el título queda dentro de su fila (`right ≤ fila.right + 0,5`, `scrollWidth ≤ clientWidth + 0,5`) y la fila lo contiene en alto; las letras de salto de `/autores/` y `/obras/` dentro de la ventana y sin contenedor con `scrollWidth > clientWidth` -- NFR-8, UX-DR103.
- `tests/e2e/accesibilidad.spec.ts` -- reescribir la prueba de la 22.10 para tomar el listado con más páginas entre las cuatro familias, anotar cuál y cuántas, medir a 360 como hoy y añadir a 320 las tres condiciones sin desbordar y, a 360 por omisión, «Siguiente» en la fila de «Página N de M» -- AC de la Paginación.
- `tests/e2e/cabecera.spec.ts` -- poner al día el comentario de la prueba de 200 % (ya no desborda la Cita; la página entera la juzga la 26.9) -- coherencia.
- `src/styles/tokens.css` -- `overflow-wrap: break-word` en `body` con su comentario (NFR-8, 26.9) -- cubre texto de Cita, fragmentos, `h1`, rótulos.
- `src/components/Paginacion.astro` -- que la fila se parta solo cuando no cabe, sin cambiar la forma a 360 por omisión y conservando `{spacing.unit}` entre zonas también en vertical -- DESIGN § Paginación.
- `src/components/Chips.astro`, `src/islands/CompartirEnlace.astro`, `src/islands/ImagenDeCita.astro`, `src/components/RutasDeSalida.astro` y lo que el barrido señale después -- `min-width: 0`/`overflow-wrap: anywhere`/`flex-wrap` donde el ítem fija su mínimo por contenido -- corregir lo construido.
- Correr el barrido y corregir hasta verde; volver a correr las e2e de los ficheros tocados y las unitarias de los componentes tocados -- no romper lo que ya mide.

**Acceptance Criteria:**
- Given el barrido móvil a 320 px, when corre en `movil` y `escritorio`, then ninguna ruta de `SUPERFICIES` (incluidas `/autores/`, `/obras/` y las cuatro caras de Obra) desborda en ninguna de las tres condiciones, y la prueba declara la simulación del 200 %.
- Given cualquier superficie del barrido, when se calcula el estilo de sus enlaces, botones, campos, selectores y encabezados visibles, then ninguno tiene `white-space`/`text-wrap-mode` `nowrap`.
- Given la cabecera a 320 px con zoom 2, when se mide, then sus enlaces se parten en otra fila (la prueba de la 26.5 sigue verde) y las letras de salto se reajustan sin desplazamiento propio.
- Given el título de Obra más largo en la Tarjeta de Obra, en el Directorio de Obras y en la Lista de Obras, when se mide a 320 en las tres condiciones, then parte palabras dentro de su fila y la fila crece con él.
- Given la prueba de 360 px de la 2.8 y las de zonas de toque, when corren tras las correcciones, then siguen en verde sin cambios en sus expectativas.

## Spec Change Log

## Review Triage Log

### 2026-10-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Pasada de implementación del bucle v8-ralph: las capas de revisión son externas y esta pasada no traía hallazgos («## Hallazgos externos — …» ausentes); la revisión independiente viene después.

## Design Notes

Cierra el diferido de la 26.5 (`spec-26-5-…`, desplazamiento de la Página de Cita con el texto al 200 %). La regla global en `body` no altera nada por omisión: `overflow-wrap` solo actúa cuando una palabra no cabe en su línea, y `break-word` no cambia el min-content, así que recuentos y números no se encogen; donde un ítem flex desborda igual, se corrige ese ítem. Con zoom 2 la columna útil es de 120 px CSS y la Cita del Día va a 36 px: partirá palabras en varias líneas, y es lo que pide NFR-8 sin tocar los tramos (AD-8).

**Medido al implementar (2026-10-28).** Con solo `overflow-wrap: break-word` en `body` dejaron de desbordar con el texto al 200 % la portada, el 404, la Página de Cita (también las siete caras de `CITAS_DEL_BARRIDO`), Autor, Colección y las cuatro caras de Obra: el desborde era siempre una palabra que no cabía en un bloque (`p.texto`, `h1.texto`, `span.fragmento`, el `h1` de Colección). Chips, «Compartir en», Imagen y Rutas de salida no necesitaron regla propia: el barrido no señaló ninguno tras la regla global. Lo único que quedaba era la fila de la Paginación (Tema y Obra 2+, «Siguiente» y los números fuera de la ventana).

**La Paginación.** `flex-wrap: wrap` a secas cambiaba la forma por omisión: el salto de línea de un contenedor flex se decide con el ancho natural de cada ítem, y la lista de 12 números mide 616 px, así que iba siempre sola en su fila. Se decide por el mínimo: `.numeros` y `.cuenta` parten de base 0 (su mínimo por contenido: 44 px y la palabra más larga) y crecen hasta `max-content`, la lista primero (`flex-grow` 1000 frente a 1). Medido a 360 px por omisión, antes y después, en `/tema/el-saber/` (12 páginas), su página 5 y las dos de `/obra/amado-nervo/plenitud/`: las cajas de los cuatro ítems salen idénticas al píxel. **Una diferencia a 320 px por omisión**, y es la que DESIGN.md pide: en las páginas 2+ de un listado largo (con «Anterior» y «Siguiente» a la vez) los mínimos suman 281 px en una columna de 280, y antes «Siguiente» sobresalía 1 px de la columna hacia el margen; ahora baja a otra fila. La página 1 (la que mide la prueba) sigue en una sola fila a 320 y a 360.

## Verification

**Commands:**
- `npx playwright test tests/e2e/accesibilidad.spec.ts --project=movil` y `--project=escritorio` -- expected: verde, con el barrido de 320 en las tres condiciones (construye con `npm run build` y sirve `tests/servidor.mjs`; puertos 4321 y 8787 libres).
- `npx playwright test tests/e2e/cabecera.spec.ts tests/e2e/directorio-de-obras.spec.ts tests/e2e/directorio-de-autores.spec.ts tests/e2e/pagina-de-cita.spec.ts tests/e2e/portada.spec.ts` en los dos proyectos -- expected: verde.
- `npx vitest run tests/unit/tarjeta-de-cita.test.ts`, `tests/unit/lista-de-obras.test.ts`, `tests/unit/tarjeta-de-obra.test.ts`, `tests/unit/espinas-de-ux.test.ts` -- expected: verde.
- `npx astro check` -- expected: 0 errores.

## Auto Run Result

Status: done

**Resumen.** El barrido móvil de `tests/e2e/accesibilidad.spec.ts` gana «Historia 26.9 — reflujo a 320 px»: cada ruta de `SUPERFICIES` a 320 × 640 en las tres condiciones (texto por omisión, texto al 200 % simulado con `zoom: 2` sobre `<html>`, espaciado de 1.4.12 inyectado), con la premisa de cada simulación comprobada y `expect.soft` para medirlas todas antes de fallar; la regla de `nowrap` en enlaces, botones, campos, selectores, `summary`, `label` y encabezados visibles; los títulos de Obra que comparten fila (Tarjeta de Obra, `/obras/`, Lista de Obras del Autor) y las letras de salto de los dos Directorios. La prueba de la 22.10 elige ahora el listado con más páginas entre Autor, Tema, Colección y Obra (hoy `/tema/el-saber/`, 12) y añade «Siguiente» en la fila de «Página N de M» a 360 y las tres condiciones a 320 en sus páginas 1 y 2. Lo construido se corrige con `overflow-wrap: break-word` en `body` y la fila de la Paginación que se parte por el mínimo de sus ítems.

**Ficheros.**
- `src/styles/tokens.css` — `overflow-wrap: break-word` en `body`, con su porqué (NFR-8, 26.9).
- `src/components/Paginacion.astro` — `flex-wrap: wrap` en `.paginacion`; `.cuenta` y `.numeros` con base 0, crecimiento 1 y 1000 y tope `max-content`.
- `tests/e2e/accesibilidad.spec.ts` — el barrido de 320 px, la regla de `nowrap`, títulos de Obra, letras de salto y la prueba de la Paginación reescrita.
- `tests/e2e/cabecera.spec.ts` — el comentario de la prueba de 200 % puesto al día.

**Revisión.** Sin hallazgos en esta pasada (capas externas aún sin correr): 0 parches, 0 aplazados, 0 rechazados. Seguimiento recomendado: `false` (0 parches; puntuación 0).

**Verificación.**
- `npx playwright test tests/e2e/accesibilidad.spec.ts --project=movil` — 93 passed.
- `npx playwright test tests/e2e/accesibilidad.spec.ts tests/e2e/cabecera.spec.ts tests/e2e/directorio-de-obras.spec.ts tests/e2e/directorio-de-autores.spec.ts tests/e2e/pagina-de-cita.spec.ts tests/e2e/portada.spec.ts` (los dos proyectos) — 318 passed, 4 skipped (los `test.skip` por proyecto de `pagina-de-cita.spec.ts`).
- `npx vitest run tests/unit/tarjeta-de-cita.test.ts tests/unit/lista-de-obras.test.ts tests/unit/tarjeta-de-obra.test.ts tests/unit/espinas-de-ux.test.ts tests/unit/paginacion.test.ts` — 5 ficheros, 94 passed.
- `npx astro check` — 0 errores, 0 avisos.
- Antes de corregir, un diagnóstico sobre el `dist/` de la base reprodujo los desbordes del problema con el texto al 200 % (portada y 404 a 496, Página de Cita 417, Autor y Obra 395, Colección 430, Tema 488): la prueba nueva habría fallado sobre la base.

**Riesgos.** La regla global de `body` es heredable: un componente futuro que necesite no partir una palabra tendrá que declararlo, y lo vigila la prueba de `nowrap` solo para controles y encabezados. La simulación del 200 % es `zoom` y no el zoom de texto del navegador; es la decisión de la 26.5. El caso de 320 px por omisión en las páginas 2+ de un listado largo cambia de forma (anotado en Design Notes).

