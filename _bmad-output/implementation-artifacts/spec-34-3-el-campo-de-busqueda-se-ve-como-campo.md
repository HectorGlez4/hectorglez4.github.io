---
title: 'Historia 34.3 — El Campo de búsqueda se ve como campo'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_revision: '6da8d60787a1798ea3541927f9f93d292d6feed4'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-34-context.md'
warnings: [oversized]
deferred:
  - summary: >-
      El epic de la 34.3 pide a la vez el contorno completo y que la e2e del filtro de los Directorios siga en verde «sin tocarla», y la e2e de la 26.6 afirmaba en reposo el filete inferior; pendiente de Héctor (bmad-create-epics-and-stories) aceptar la reescritura de esas aserciones de reposo o reformular el criterio.
    evidence: |-
      tests/e2e/filtro-del-directorio.spec.ts (prueba «a 3 × --unidad del h1…») fijaba tres lados a 0px, radio 0 y fondo transparente, exactamente el trato que UX-DR133 sustituye; el criterio del epic y el «Never» del contrato no se pueden cumplir a la vez. Señalado por blind-hunter y ac-auditor en la revisión externa.
    location: >-
      _bmad-output/planning-artifacts/epics.md (Historia 34.3); tests/e2e/filtro-del-directorio.spec.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** El Campo de búsqueda (`src/components/CampoDeBusqueda.astro`) se pinta como un filete inferior sin caja, y quien lee un Tema, un Autor o una Obra no reconoce a simple vista que ahí se escribe (UX-DR133, FR-6; decisión de Héctor del 2026-11-05 en `DESIGN.md § Campo de búsqueda`).

**Approach:** Cambiar solo el estilo del componente único: contorno completo de `--grosor-filete` en `--contorno`, radio `--radio`, fondo `--papel`, relleno horizontal `--unidad`; al foco, contorno siena a 2 × `--grosor-filete` sumado al anillo global sin mover lo tecleado ni lo que sigue. Todos los usos lo heredan por ser el mismo componente; una prueba sobre `dist/` lo garantiza y otra de Vitest juzga el contraste 3:1 de los dos tokens.

## Boundaries & Constraints

**Always:**
- Una sola composición: el estilo vive solo en el `<style>` de `CampoDeBusqueda.astro`; ningún uso (`BuscarEn.astro`, `Busqueda.astro`, `404.astro`, `FiltroDelDirectorio.astro`) estiliza el `input`.
- Solo tokens de `src/styles/tokens.css` (color, radio, grosor, unidad, cuerpo, peso, interlineado); `tests/unit/tipografia-en-tokens.test.ts` pasa sin excepción nueva.
- Se conservan: alto mínimo `--zona-de-toque` (`box-sizing: border-box`), etiqueta encima a `--unidad`, Inter a `--cuerpo-lg` en `--tinta`, sin sombra, sin icono, sin la cruz nativa, `appearance: none`, el `placeholder` en tinta apagada, el botón «Buscar» y sus props.
- Al foco el anillo global `:focus-visible` de `tokens.css` sigue (2 px siena, desplazamiento 2 px); el contorno siena doble se suma, nunca lo sustituye.
- El comentario de cabecera del componente deja de decir «sin caja, sin radio» y describe el contorno completo (Historia 34.3).

**Block If:**
- El contraste calculado de `--contorno` sobre `--papel` en `tokens.css` sale por debajo de 3:1 (cambiar un token es de Héctor con `bmad-ux`).
- Cumplir algún criterio exige tocar un guion, `GUIONES_EXTERNOS`, sus topes, `src/lib/vocabulario.ts` o un artefacto de planificación.

**Never:**
- Ningún cambio de guion (ni el del filtro de los Directorios, ni el de `/buscar/`), de marcado de los usos, de los selectores de `/buscar/` ni del botón «Buscar».
- Ningún `box-shadow` como sustituto del contorno, ningún literal de color/medida, ningún `:global`.
- No tocar `tests/unit/medicion.test.ts` ni las pruebas del filtro para ponerlas en verde; deben seguir en verde solas.
- No integrar aquí el campo de la portada de la Historia 28.1: la Épica 28 no está en esta rama (`src/pages/index.astro` no tiene campo); la que llegue después integra a la otra.
- No editar `_bmad-output/planning-artifacts/` ni `_bmad-output/specs/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reposo | Cualquier uso del campo | 4 lados de `--grosor-filete` en `--contorno`, radio `--radio`, fondo `--papel`, `padding-inline` `--unidad`, alto ≥ `--zona-de-toque` | — |
| Foco por teclado | Tab hasta el campo | 4 lados a 2 × `--grosor-filete` en `--siena` + anillo `outline` 2 px siena; caja exterior y posición del texto iguales que en reposo | — |
| Filtro de los Directorios | El campo llega dentro de `<template>` y lo inserta la isla | Mismo trato; recuento y letras no se mueven | — |
| Campo ajeno | Un `input[type="search"]` fuera de `.campo-de-busqueda` en `dist/` | La prueba de `dist/` falla nombrando ruta | Falla de prueba |
| Contraste | `--contorno` / `--papel` de `tokens.css` | ≥ 3:1 (hoy 3,66:1) | Falla de prueba si < 3 |

</intent-contract>

## Code Map

- `src/components/CampoDeBusqueda.astro` -- único dueño. Hoy: comentario de cabecera (l. 10-16, «sin caja, sin sombra, sin radio… un filete inferior»), regla `input` con `padding: var(--unidad) 0`, `background: transparent`, `border: 0`, `border-bottom: … var(--contorno)`, `border-radius: 0`; `input:focus { border-bottom: calc(var(--grosor-filete) * 2) solid var(--siena) }`. El botón `.buscar` no cambia.
- `src/styles/tokens.css` -- solo lectura. `--papel: #faf7f0` (l. 11), `--contorno: #8a7f72` (l. 24), `--unidad: 8px`, `--radio: 3px`, `--grosor-filete: 1px`, `--zona-de-toque: 44px`; `:focus-visible` global (l. 161-165). Sin tema oscuro (un solo `:root`).
- `src/components/Busqueda.astro:358-372` -- referencia del trato pedido: el `select` lleva `background-color: var(--papel); border: var(--grosor-filete) solid var(--contorno); border-radius: var(--radio)`. No se toca.
- Usos (no se tocan): `src/components/BuscarEn.astro:68` (Tema, Autor, Obra, con `boton`), `src/components/Busqueda.astro:266-268` (`/buscar/`, dentro de `<template>`), `src/pages/404.astro:55` (con `boton`), `src/components/FiltroDelDirectorio.astro:45-46` (`/autores/`, `/obras/`, dentro de `<template>`).
- `tests/unit/buscar-en.test.ts` -- ya construye un sitio con Tema, Autor y Obras paginados, `/buscar/`, `/404`, `/autores/`, `/obras/`; tiene `paginasDe(dist)` (l. 169) e importa `recorrerElementos` de `tools/lib/html.ts` (recorre también el contenido de `<template>`, con antepasados). Sitio natural de la prueba de `dist/`.
- `tests/e2e/accesibilidad.spec.ts:591-620` -- prueba del anillo en el campo de `/buscar/` y el 404; reflujo a 320 px (l. 959+). Debe seguir verde sin cambios.
- `tests/e2e/filtro-del-directorio.spec.ts:553-585` -- comprueba al foco `borderBottomWidth` = 2 × filete y color siena; sigue siendo cierto con el contorno completo.
- `tests/e2e/pagina-de-tema.spec.ts` -- no tiene aún la prueba a 360 × 640 del campo sobre la primera Cita; se añade.
- `tests/e2e/tipografia-calculada.spec.ts` -- mide solo `font-weight` y la razón `line-height/font-size`; el contorno no debe cambiar ninguna instantánea.

## Tasks & Acceptance

**Execution:**
- `src/components/CampoDeBusqueda.astro` -- regla `input`: `background: var(--papel)`, `border: var(--grosor-filete) solid var(--contorno)`, `border-radius: var(--radio)`, `padding: var(--unidad)` en los cuatro lados (relleno horizontal `--unidad`); `input:focus`: `border: calc(var(--grosor-filete) * 2) solid var(--siena)` y el relleno rebajado en un `--grosor-filete` (`calc(var(--unidad) - var(--grosor-filete))`) para que lo tecleado no se mueva; reescribir el comentario de cabecera y el del foco -- el contorno completo de UX-DR133 sin desplazar nada.
- `tests/unit/contraste-del-contorno.test.ts` (nuevo) -- leer `src/styles/tokens.css`, extraer `--contorno` y `--papel` del `:root`, calcular la razón WCAG 2.x (luminancia relativa sRGB) y exigir ≥ 3; fallar también si algún token falta o no es hex de 6 cifras. Sin `astro build` -- NFR-9, WCAG 1.4.11.
- `tests/unit/buscar-en.test.ts` -- nuevo `it` en el `describe` principal: por cada HTML de `dist/`, con `recorrerElementos`, todo `input` con `type="search"` tiene un antepasado con clase `campo-de-busqueda`, y al menos `/buscar/`, `/404`, `/autores/`, `/obras/`, el Tema, el Autor y una Obra contienen alguno -- ningún uso pinta un campo propio.
- `tests/e2e/campo-de-busqueda.spec.ts` (nuevo) -- para Tema (página 1 de un Tema con página, del Corpus vía `tests/e2e/ayuda/corpus.ts`), Autor, Obra, `/buscar/`, el 404 y `/autores/` (`/obras/` también): en reposo, los cuatro `border-*-width` = `--grosor-filete`, color = `--contorno`, `border-radius` = `--radio`, `background-color` = `--papel`, `padding-left/right` = `--unidad`, alto ≥ `--zona-de-toque`, resueltos por sondas en el navegador; tras llegar con Tab, los cuatro bordes a 2 × y en siena, `outline-style` solid siena, y la caja (`getBoundingClientRect`) y la caja de contenido (borde + relleno) en la misma posición que en reposo -- la superficie que ve el lector.
- `tests/e2e/pagina-de-tema.spec.ts` -- nueva prueba a 360 × 640 en `/tema/la-vida/` (salta con `test.skip` si el Tema no tiene página en el Corpus): el formulario «Buscar en este tema» queda por encima de la primera Tarjeta de Cita y esa Tarjeta empieza dentro de los 640 px -- FR-6, posición de la v8.
- `tests/e2e/tipografia-calculada.spec.ts-snapshots/` -- correr la prueba; si una instantánea cambia, regrabarla y nombrarla en el mensaje del commit; si no cambia ninguna, el commit lo dice.

**Acceptance Criteria:**
- Given el sitio construido, when se abre cualquier superficie con campo (Tema, Autor, Obra, `/buscar/`, 404, `/autores/`, `/obras/`), then el campo se ve con contorno completo de 1 px en `--contorno`, radio 3 px y fondo `--papel`, y lo tecleado no toca el contorno.
- Given el campo enfocado con el teclado, when se mide, then el contorno es siena a 2 px en los cuatro lados, el anillo global sigue presente, y ni lo tecleado ni lo que sigue al campo se ha movido.
- Given `dist/`, when se recorre, then no hay `input[type="search"]` fuera de `.campo-de-busqueda`, los selectores de `/buscar/` y el botón «Buscar» salen idénticos, y ningún guion de `/_astro/` ni `GUIONES_EXTERNOS` cambia.
- Given `npx vitest run tests/unit/medicion.test.ts` y `tests/unit/filtro-del-directorio.test.ts`, when se corren sin tocarlas, then pasan; y la e2e del filtro (`tests/e2e/filtro-del-directorio.spec.ts`) pasa con sus pruebas de comportamiento, recuento y foco sin tocar, y solo sus aserciones de reposo del trato de la 26.6 reescritas al contrato nuevo (Spec Change Log, 2026-11-08).
- Given la página 1 de `/tema/la-vida/` a 360 × 640, when carga, then «Buscar en este tema» sigue bajo el título y sobre el listado, y la primera Cita empieza en la primera pantalla.

## Spec Change Log

### 2026-11-08 — Implementación: la prueba de reposo del filtro fijaba el trato anterior
- Hallazgo: `tests/e2e/filtro-del-directorio.spec.ts:472` («a 3 × --unidad del h1…») afirmaba en reposo el trato de la 26.6 —solo el filete inferior, los otros tres lados a `0px`, radio `0px` y fondo transparente—, que es exactamente lo que UX-DR133 reemplaza; el Code Map solo había revisado la prueba de foco (l. 553), que sigue verde sin tocarla. El «Never» de no tocar las pruebas del filtro y el primer criterio de aceptación no se podían cumplir a la vez.
- Qué se hizo: solo se reescribieron las cuatro aserciones de reposo de esa prueba al contrato nuevo (cuatro lados iguales al inferior, radio `--radio`, fondo `--papel`, resueltos por sondas), que es más exigente, no menos; el resto de la prueba —posición, etiqueta, recuento, foco— queda igual. Se dice en el mensaje del commit para que Héctor lo vea.
- KEEP: el componente con relleno compensado al foco; la prueba de `dist/` en `buscar-en.test.ts`; las sondas de tokens de `campo-de-busqueda.spec.ts`.

### 2026-11-08 — Revisión externa: el criterio del filtro decía más de lo que la implementación cumple
- Hallazgo (blind-hunter, ac-auditor): el criterio «las pruebas del filtro… sin tocarlas» seguía afirmando lo contrario de lo que el registro anterior recoge —la e2e del filtro sí se tocó, en sus aserciones de reposo—.
- Qué se enmendó: fuera del `<intent-contract>`, el criterio de aceptación distingue la prueba unitaria del filtro (sin tocar) de la e2e (comportamiento, recuento y foco sin tocar; reposo al contrato nuevo), y la Verificación nombra `tests/unit/filtro-del-directorio.test.ts`, `pagina-de-tema.spec.ts` y el barrido completo de `accesibilidad.spec.ts`. La contradicción de fondo —el epic pide a la vez el contorno completo y la e2e del filtro «sin tocarla»— es del artefacto de planificación y queda en `deferred` para Héctor.
- Estado malo evitado: un `status: done` que afirma un criterio que HEAD no cumple.
- KEEP: todo lo del registro anterior; el código no se re-deriva (la enmienda es del texto del criterio, no del contrato).

## Review Triage Log

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

### 2026-11-08 — Review pass (revisión externa, pasada 1)
- intent_gap: 0
- bad_spec: 0
- patch: 8 (high 0, medium 1, low 7)
- defer: 1 (high 0, medium 0, low 1)
- reject: 22
- addressed_findings:
  - `[medium]` `[patch]` `contraste-del-contorno.test.ts` cortaba el `:root` en el primer `}`, que hoy cae en el comentario `{typography.code}` (l. 54 de `tokens.css`), y no miraba otros bloques `:root`: ahora quita comentarios, corta por llaves emparejadas, juzga el `:root` de partida y todo bloque que redefina `--contorno` o `--papel`, con una prueba propia de la lectura.
  - `[low]` `[patch]` e2e `campo-de-busqueda.spec.ts`: el Tema sale del Corpus («La vida» si tiene página, si no el primero que llegue a `MIN_CITAS_POR_TEMA`) y se salta si no hay ninguno, en vez de fijar `/tema/la-vida/`.
  - `[low]` `[patch]` e2e: la Obra se busca con `count()` antes de `getAttribute`, así que una Página de Autor sin Obras salta la superficie en vez de agotar el plazo.
  - `[low]` `[patch]` e2e: el 404 exige estado 404 (antes no comprobaba ninguno).
  - `[low]` `[patch]` e2e: se exige que haya algo pintado tras el campo antes de comparar su posición, para que «lo que sigue no se mueve» no pase en vacío.
  - `[low]` `[patch]` e2e: también el relleno de arriba y de abajo a `--unidad`.
  - `[low]` `[patch]` `CampoDeBusqueda.astro`: el comentario de cabecera ya no dice que `buscar-en.test.ts` impide que un uso estilice el `input`; dice lo que la prueba exige (dentro de `.campo-de-busqueda` y sin `style` en línea) y lo que no vigila (un `<style>` propio del uso), y recupera el salto de línea.
  - `[low]` `[patch]` spec: el criterio «las pruebas del filtro… sin tocarlas» separa la unitaria (sin tocar) de la e2e (solo el reposo reescrito), y la Verificación nombra el barrido completo de accesibilidad, que ya se corre (Spec Change Log).

### 2026-11-08 — Review pass (revisión externa, pasada 2)
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 30 (high 0, medium 0, low 30)
- addressed_findings:
  - none

## Design Notes

- Al foco, engrosar el contorno de 1 a 2 px empujaría el texto 1 px; rebajar el relleno en `--grosor-filete` compensa exacto, y `min-height` con `border-box` mantiene la caja exterior. Ejemplo:
  ```css
  input { padding: var(--unidad); border: var(--grosor-filete) solid var(--contorno); }
  input:focus { padding: calc(var(--unidad) - var(--grosor-filete)); border: calc(var(--grosor-filete) * 2) solid var(--siena); }
  ```
- El relleno horizontal `--unidad` es `[ASSUMPTION]` del criterio; el vertical se conserva en `--unidad` como hoy.
- La portada (28.1) no tiene campo en esta rama; cuando la Épica 28 se funda usará `CampoDeBusqueda` y la prueba de `dist/` la cubrirá sin cambios.
- Las e2e de Corpus real (`pagina-de-tema` a 360 × 640 y el barrido de `accesibilidad.spec.ts`) las corre Héctor en local; el implementador las corre si los puertos están libres y, si no, lo deja anotado en `deferred`.

## Verification

**Commands:**
- `npx vitest run tests/unit/contraste-del-contorno.test.ts` -- expected: verde (3,66:1).
- `npx vitest run tests/unit/buscar-en.test.ts` -- expected: verde, con el `it` nuevo.
- `npx vitest run tests/unit/tipografia-en-tokens.test.ts` -- expected: verde sin excepción nueva.
- `npx vitest run tests/unit/medicion.test.ts` -- expected: verde sin tocarla.
- `npx vitest run tests/unit/filtro-del-directorio.test.ts` -- expected: verde sin tocarla.
- `npx astro check` -- expected: 0 errores.
- `npx playwright test tests/e2e/campo-de-busqueda.spec.ts tests/e2e/filtro-del-directorio.spec.ts tests/e2e/tipografia-calculada.spec.ts --project=escritorio` (y `--project=movil`) -- expected: verde; instantáneas sin cambios o regrabadas y nombradas.
- `npx playwright test tests/e2e/pagina-de-tema.spec.ts tests/e2e/accesibilidad.spec.ts` (los dos proyectos) -- expected: verde; el barrido completo incluye axe 2.2 AA y el reflujo a 320 px con el contorno nuevo.

## Auto Run Result

Status: done
Blocking condition: ninguna

**Resumen.** El Campo de búsqueda (`src/components/CampoDeBusqueda.astro`) pasa de filete inferior a contorno completo: `--grosor-filete` en `--contorno`, radio `--radio`, fondo `--papel`, relleno `--unidad` en los cuatro lados; al foco, los cuatro lados a 2 × `--grosor-filete` en siena, sumados al anillo global, con el relleno rebajado en un `--grosor-filete` para que ni la caja ni lo tecleado se muevan. Todos los usos lo heredan; ningún uso, guion, `GUIONES_EXTERNOS` ni vocabulario cambia (`git diff 6da8d60787 HEAD -- src` solo toca este componente).

**Ficheros.**
- `src/components/CampoDeBusqueda.astro` — el trato nuevo y su comentario de cabecera y de foco (en la revisión: el comentario dice con exactitud qué vigila la prueba de `dist/`).
- `tests/unit/contraste-del-contorno.test.ts` (nuevo) — `--contorno` sobre `--papel` ≥ 3:1 en todo bloque `:root` de `tokens.css` que los declare, leído sin comentarios y por llaves emparejadas; rechazo de tokens ausentes o no hex.
- `tests/unit/buscar-en.test.ts` — todo `input[type="search"]` de `dist/` está dentro de `.campo-de-busqueda` y sin `style`, y las nueve superficies lo llevan.
- `tests/e2e/campo-de-busqueda.spec.ts` (nuevo) — Tema y Autor del Corpus, Obra, `/buscar/`, 404 (con estado 404), `/autores/`, `/obras/`: reposo (bordes, radio, fondo, relleno en los cuatro lados, sombra, alto) y foco por sondas; caja, contenido y lo siguiente (que tiene que existir) quietos.
- `tests/e2e/pagina-de-tema.spec.ts` — a 360 × 640, «Buscar en este tema» entre el `h1` y la primera Tarjeta, que empieza en la primera pantalla.
- `tests/e2e/filtro-del-directorio.spec.ts` — solo las aserciones de reposo, al contrato nuevo (Spec Change Log; diferido para Héctor).

**Revisión (pasada externa 1).** 8 parches aplicados (1 medio, 7 bajos), 1 diferido (pendiente de Héctor, `bmad-create-epics-and-stories`), 22 rechazados (entre ellos: el campo de la portada, que el contrato excluye; el contraste contra otro fondo —todos los usos se pintan sobre el `body` en `--papel`, así que el contorno y el `placeholder` no cambian de fondo—; `forced-colors`, donde el borde se sigue pintando en color del sistema; el foco con ratón, que es el `:focus` de la 26.6; y pruebas de selectores de `/buscar/` idénticos, que el diff deja sin tocar). Recomendación de revisión de seguimiento: `true` — parches por gravedad: 0 altos, 1 medio, 7 bajos; puntuación 3 × 1 + 7 = 10, que llega a 5.

**Verificación.**
- `npx vitest run tests/unit/contraste-del-contorno.test.ts tests/unit/buscar-en.test.ts tests/unit/tipografia-en-tokens.test.ts tests/unit/medicion.test.ts tests/unit/filtro-del-directorio.test.ts` — 5 ficheros, 729 pruebas en verde.
- `npx astro check` — 0 errores, 0 avisos.
- `npx playwright test tests/e2e/campo-de-busqueda.spec.ts tests/e2e/filtro-del-directorio.spec.ts tests/e2e/pagina-de-tema.spec.ts tests/e2e/tipografia-calculada.spec.ts tests/e2e/accesibilidad.spec.ts` (móvil y escritorio, contra `tests/servidor.mjs` con el receptor local) — 412 en verde, 4 saltadas (las de «Tema bajo el umbral», que el Corpus no tiene); las 14 de `campo-de-busqueda` corrieron; instantáneas de `tipografia-calculada` sin cambios. El barrido completo de `accesibilidad.spec.ts` (axe 2.2 AA, anillo, reflujo a 320 px) en verde con el contorno nuevo.
- `npm test` — 156 ficheros, 7.184 pruebas en verde.

**Riesgos residuales.** La portada de la Épica 28 integrará el campo cuando se funda, y la prueba de `dist/` la cubrirá. Que un uso reestilice el `input` desde su propio `<style>` no lo vigila ninguna prueba. Las e2e no corren en CI: una regresión del trato visual solo la ve una pasada local.

### Pasada externa 2 (2026-11-08)

**Resumen.** Última ronda de revisión sobre HEAD 4289553114. No cambia el código: ningún hallazgo describe un defecto que un lector, quien siembra o el build vayan a encontrar.

**Ficheros.** Solo este spec (registro de triaje y resultado).

**Revisión.** 0 parches, 0 diferidos y 30 rechazados, ya agrupados los duplicados entre capas:
- Endurecer más las e2e y la prueba de `dist/`: `fonts.ready`, el botón dentro de `.campo-de-busqueda`, un hermano fuera de flujo, `.first()`, `type`/`role` con otra grafía, el `describe` de la 360 × 640, el selector `.listado li`, la Obra tomada por la Página de Autor y el 404 de `tests/servidor.mjs`. Las pruebas pasan sobre el sitio real y ninguno de estos huecos esconde una regresión del componente. Lo mismo vale para el analizador de `tokens.css` (primera declaración, `{` dentro de cadenas, otros selectores de tema): hoy hay un solo `:root` con una declaración de cada token.
- Lo que el contrato o el epic ya deciden:
  - el campo de la portada: «la que llegue después integra a la otra»;
  - el `:focus` de la 26.6 frente a `:focus-visible`;
  - las capturas de `tipografia-calculada`, que no ven bordes, y el commit lo dice;
  - las e2e fuera del CI, que es la regla de AGENTS.md;
  - la contradicción de la e2e del filtro, ya diferida a Héctor.
- Lo especulativo:
  - fondos distintos de `--papel`: ningún uso los tiene;
  - el autorrelleno: el campo lleva `autocomplete="off"`;
  - un `--grosor-filete` igual o mayor que `--unidad`;
  - un desplazamiento de menos de un píxel a DPR fraccionario;
  - los estados `:hover` y `:disabled`, que el diseño no define.
- El contraste del foco: siena es el anillo global ya en uso.
- La cabecera que nombra pruebas: es la costumbre del repositorio.

**Recomendación de revisión de seguimiento:** `false`. Parches de esta pasada: 0 altos, 0 medios y 0 bajos. Puntuación: 3 × 0 + 0 = 0, por debajo de 5. El `true` de la pasada 1 contaba sus 8 parches, con puntuación 3 × 1 + 7 = 10, que pasa del umbral de 5.

**Verificación.** No hay parches, así que no se vuelve a correr la Verificación. Sigue valiendo la de la pasada 1 sobre este mismo HEAD de código, con `npm test` en verde, más la del ac-auditor: 729 pruebas unitarias y 412 e2e en verde.

**Riesgos residuales.** Los de la pasada 1, sin cambios.

## Verificación previa a la fusión — 2026-11-08

Puerta de la etapa s-34 (34.1, 34.2 y 34.3; la 34.0 ya está en la principal), intento 1.

- **Sincronía.** `origin/main` (504db42621, con las Épicas 29 y 30 y la fase B de la 30.5) entra en
  30ca178a7b. Único conflicto: `last_updated` de `sprint-status.yaml`; se quedan las líneas de la
  principal y los estados de la 34.1 a la 34.3. El recorte de título y meta de la 34.1
  (`recortarPorPalabra`) casa sin cambios con la Página de Cita de la Épica 30. `proponer-claves`
  no escribió nada. El lock no cambia: sin `npm ci`. La etapa no toca `src/lib/vocabulario.ts` ni
  `medicion/migrations/`.
- **CI equivalente.** `npm run build` en verde (dist juzgado 520,7 MiB); `npx astro check` 0 errores,
  0 avisos, 11 sugerencias (también tras el arreglo); `npm test` 167 ficheros, 7.625 pruebas en
  verde, `huella.test.ts` incluido.
- **E2E completa** (los dos proyectos, receptor local en 8787): 1.400 pasan, 156 se saltan, 4 caen.
  - `busqueda.spec.ts:502` (26.2), en los dos proyectos: «colección» sin ningún resultado. Causa: en
    la principal sus seis resultados eran Tarjetas de listado cortadas a media palabra («…no está en
    las co…», Séneca, Quevedo, Balmes), que Pagefind casaba; ninguna Cita del Corpus dice
    «colección». La 34.1 recorta por palabra entera y el resto desaparece. Comprobado con el
    Pagefind real de las dos construcciones: 6 resultados en la principal, 0 en la rama, «obra» 240
    en las dos. Arreglo ae704d6bf6: «colección» deja de exigirse con resultado, como «directorio» y
    «portada»; sigue exigiéndose que ninguna página salga por su tipo, y la guarda contra un índice
    vacío la sostienen «obra», «cita», «autor», «tema» y la marca.
  - `tipografia-calculada.spec.ts:145`, `buscar-con-resultados` (`div.recuento > p.estado`), en los
    dos proyectos: la intermitencia conocida, que cae igual en la principal; no cuenta contra la
    puerta.
  - Repetidos los dos ficheros tras el arreglo, en los dos proyectos: 204 pasan, 6 se saltan, 0 caen.
- **NFR-7** (aplica: la 34.1 cambia título, meta y Tarjetas; la 34.3, el campo de `/buscar/` y de los
  listados). Lighthouse 13.5.0 móvil, `simulate`, 10 corridas alternas por página; las dos
  construcciones con `MEDICION_ENDPOINT=http://localhost:8787/`, servidas por `tests/servidor.mjs`
  de la rama con `max-age=600` y gzip, y un receptor ficticio en 8787. Medias (principal → rama):
  - Cita Machado: LCP 1.640 → 1.614 ms (−26), FCP 924 → 939 (+15).
  - Cita en verso Martí: LCP 1.595 → 1.611 (+16), FCP 918 → 917 (−1).
  - Obra `antonio-machado/campos-de-castilla`: LCP 1.505 → 1.504 (−0), FCP 763 → 774 (+12).
  - `/buscar/`: LCP 1.549 → 1.595 (+46), FCP 830 → 857 (+27).
  Margen 100 ms en todas; la LCP de Cita, bajo 2.500. Veredicto: ok, sin desempate.
- La portada no se mide: no pinta el campo ni la Tarjeta de Cita.
