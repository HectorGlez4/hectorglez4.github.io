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
deferred: []
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
- Given `npx vitest run tests/unit/medicion.test.ts` y las pruebas del filtro, when se corren sin tocarlas, then pasan.
- Given la página 1 de `/tema/la-vida/` a 360 × 640, when carga, then «Buscar en este tema» sigue bajo el título y sobre el listado, y la primera Cita empieza en la primera pantalla.

## Spec Change Log

### 2026-11-08 — Implementación: la prueba de reposo del filtro fijaba el trato anterior
- Hallazgo: `tests/e2e/filtro-del-directorio.spec.ts:472` («a 3 × --unidad del h1…») afirmaba en reposo el trato de la 26.6 —solo el filete inferior, los otros tres lados a `0px`, radio `0px` y fondo transparente—, que es exactamente lo que UX-DR133 reemplaza; el Code Map solo había revisado la prueba de foco (l. 553), que sigue verde sin tocarla. El «Never» de no tocar las pruebas del filtro y el primer criterio de aceptación no se podían cumplir a la vez.
- Qué se hizo: solo se reescribieron las cuatro aserciones de reposo de esa prueba al contrato nuevo (cuatro lados iguales al inferior, radio `--radio`, fondo `--papel`, resueltos por sondas), que es más exigente, no menos; el resto de la prueba —posición, etiqueta, recuento, foco— queda igual. Se dice en el mensaje del commit para que Héctor lo vea.
- KEEP: el componente con relleno compensado al foco; la prueba de `dist/` en `buscar-en.test.ts`; las sondas de tokens de `campo-de-busqueda.spec.ts`.

## Review Triage Log

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
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
- `npx astro check` -- expected: 0 errores.
- `npx playwright test tests/e2e/campo-de-busqueda.spec.ts tests/e2e/filtro-del-directorio.spec.ts tests/e2e/tipografia-calculada.spec.ts --project=escritorio` (y `--project=movil`) -- expected: verde; instantáneas sin cambios o regrabadas y nombradas.

## Auto Run Result

Status: done
Blocking condition: ninguna

**Resumen.** El Campo de búsqueda (`src/components/CampoDeBusqueda.astro`) pasa de filete inferior a contorno completo: `--grosor-filete` en `--contorno`, radio `--radio`, fondo `--papel`, relleno `--unidad` en los cuatro lados; al foco, los cuatro lados a 2 × `--grosor-filete` en siena, sumados al anillo global, con el relleno rebajado en un `--grosor-filete` para que ni la caja ni lo tecleado se muevan. Todos los usos lo heredan; ningún uso, guion, `GUIONES_EXTERNOS` ni vocabulario cambia.

**Ficheros.**
- `src/components/CampoDeBusqueda.astro` — el trato nuevo y su comentario de cabecera y de foco.
- `tests/unit/contraste-del-contorno.test.ts` (nuevo) — `--contorno` sobre `--papel` ≥ 3:1 desde `tokens.css`, y rechazo de tokens ausentes o no hex.
- `tests/unit/buscar-en.test.ts` — todo `input[type="search"]` de `dist/` está dentro de `.campo-de-busqueda` y sin `style`, y las nueve superficies lo llevan.
- `tests/e2e/campo-de-busqueda.spec.ts` (nuevo) — Tema, Autor, Obra, `/buscar/`, 404, `/autores/`, `/obras/`: reposo y foco por sondas, caja, contenido y lo siguiente quietos.
- `tests/e2e/pagina-de-tema.spec.ts` — a 360 × 640, «Buscar en este tema» entre el `h1` y la primera Tarjeta, que empieza en la primera pantalla.
- `tests/e2e/filtro-del-directorio.spec.ts` — solo las aserciones de reposo, al contrato nuevo (ver Spec Change Log).

**Revisión.** Capas externas sin hallazgos en esta pasada: 0 parches, 0 diferidos, 0 rechazados. Recomendación de revisión de seguimiento: `false` (0 parches; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/buscar-en.test.ts tests/unit/contraste-del-contorno.test.ts tests/unit/tipografia-en-tokens.test.ts tests/unit/medicion.test.ts` — 4 ficheros, 706 pruebas en verde (la nueva de `buscar-en` confirmada en modo detallado).
- `npx astro check` — 0 errores, 0 avisos.
- `npx playwright test tests/e2e/campo-de-busqueda.spec.ts tests/e2e/filtro-del-directorio.spec.ts tests/e2e/tipografia-calculada.spec.ts tests/e2e/pagina-de-tema.spec.ts` (móvil y escritorio) — 112 en verde, 4 saltadas (las de «Tema bajo el umbral», que ya se saltaban); instantáneas de `tipografia-calculada` sin cambios.
- `npx playwright test tests/e2e/accesibilidad.spec.ts -g "campo de búsqueda"` — 4 en verde.

**Riesgos residuales.** El barrido completo de `accesibilidad.spec.ts` (axe y reflujo a 320 px) no se corrió entero aquí; lo corre Héctor en local. La portada de la Épica 28 integrará el campo cuando se funda, y la prueba de `dist/` la cubrirá.
