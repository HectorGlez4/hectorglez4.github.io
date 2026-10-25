---
title: 'Historia 24.7 — La Obra salta a dónde leerla'
type: 'feature'
created: '2026-10-25'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-24-context.md'
warnings:
  - oversized
deferred: []
---

<intent-contract>

## Intent

**Problem:** En la página 1 de una Obra, «Dónde leer esta obra» está al pie, detrás de hasta 50 Tarjetas, la Paginación y los Temas: quien llega queriendo leer la obra entera tiene que recorrer todas sus Citas para encontrar la edición (FR-51, UX-DR96).

**Approach:** La Cabecera de Obra de la página 1 gana, en su propia línea bajo «de {Autor} · {año}», el enlace «Dónde leer esta obra ↓» hacia `#donde-leer-esta-obra`; el `h2` de destino pasa a ser enfocable (`tabindex="-1"`) con `scroll-margin-top`, para que el salto nativo del navegador le lleve el foco sin guion. El bloque no se mueve.

## Boundaries & Constraints

**Always:**
- El salto existe **sí y solo si** la página pinta `DondeLeer` (hoy: toda página 1, se indexe o no, congelada o no, con o sin Cita cotejada); un solo booleano en la página decide las dos cosas. Las 2+ no llevan ni salto ni destino.
- Marcado del salto: `<p class="salto" data-pagefind-ignore><a href="#donde-leer-esta-obra">Dónde leer esta obra<span aria-hidden="true">&nbsp;↓</span></a></p>`, **dentro** de `<header class="cabecera-de-obra">` y detrás de `p.de`, nunca dentro de él (lleva `data-zona="atribucion"`). Sin `target`, sin `rel`, sin `data-zona` ni `data-sin-zona` propio ni heredado: el ancla de la propia página ya está exenta (AD-13). `data-pagefind-ignore` por lo mismo que `DondeLeer`: «Dónde leer esta obra» no puede ser texto buscable de cada Obra.
- Un solo dueño del identificador: `ANCLA_DE_DONDE_LEER = 'donde-leer-esta-obra'` exportado de `src/lib/obras.ts` (junto a `dondeLeer`); lo usan el `href` del salto, el `id` del `Rotulo` y el `aria-labelledby` de la sección. El valor no cambia.
- Estilo con tokens y sin literales: `p.salto` a `margin-top: calc(var(--unidad) * 3)`, `font-family: var(--sans)`, `font-size: var(--cuerpo-md)`, `line-height: 1.6`; el `a`, `display: inline-flex; align-items: center; min-height: var(--zona-de-toque)`, `color: var(--siena)`, `text-decoration-line: underline` y `text-decoration-thickness: var(--grosor-filete)` siempre, sin regla de `:hover` que lo quite. El listado sigue a `calc(var(--unidad) * 4)` de la Cabecera (sin hueco para «Buscar en esta obra», 27.8).
- Destino: `Rotulo.astro` gana una prop booleana opcional `destino` que, puesta, añade `tabindex="-1"`; su hoja añade `.rotulo[tabindex='-1'] { scroll-margin-top: calc(var(--unidad) * 2); }`. Sin `destino`, el `h2` sale byte a byte como hoy («Temas», Lista de Obras). `DondeLeer.astro` la pone en su rótulo. El anillo es el global de `tokens.css`; no se añade ninguna regla de foco.
- El salto y el `h2` de destino no dependen de `enVenta`: salen idénticos con la afiliación encendida o apagada (FR-35, UX-DR110).

**Block If:**
- En Chromium (Playwright local), Intro sobre el salto no deja el foco en el `h2`, o lo deja sin que case `:focus-visible` → HALT `blocked`: arreglarlo exige guion en la Página de Obra o una regla de foco aparte (decide Héctor).
- Con el salto puesto, la primera Cita del listado deja de empezar en la primera pantalla de 360 × 640 en alguna Obra medida → HALT `blocked` (conflicto de UX-DR95/UX-DR96).
- La página 1 encendida difiere de la apagada fuera del `div[data-ingreso="afiliacion-de-libros"]` por algo que esta historia no construye → HALT `blocked` con la diferencia.
- Cumplir los 8 px entre zonas exigiría tocar la zona de `.de a` o los 3 × `--unidad` → HALT `blocked`.
- Cumplir un criterio exigiría editar `_bmad-output/planning-artifacts/`, `_bmad-output/specs/` o `corpus/`.

**Never:**
- Guion nuevo, isla o escucha; una exención nueva en `EXENCIONES_DE_ZONA`; pestaña nueva.
- Mover «Dónde leer esta obra», cambiar el ritmo del pie ya construido, reservar sitio para «Compartir en» (25.6) o «Buscar en esta obra» (27.8).
- Fuera de alcance: la Tarjeta de Obra y su «Ver la obra y dónde leerla →» (24.4), «Siguiente» (24.5), la tabulación de la Página de Cita, `relacionDeSuperficies` (24.8), la portada (28).

## I/O & Edge-Case Matrix

| Escenario | Estado | Resultado |
|---|---|---|
| Página 1 indexable | Obra que cumple FR-52 | un salto en la Cabecera, `h2#donde-leer-esta-obra[tabindex="-1"]` al pie |
| Página 1 `noindex` | una Cita, o ≥ 90 % de su Autor | igual que la indexable |
| Familia congelada | `CONGELACION_DE_OBRAS` puesta | igual |
| Obra sin cotejo (c) | ninguna Cita con documento | salto; bajo el `h2`, solo la frase de 22.6 |
| Páginas 2+ | Obra de > 50 Citas | ni `p.salto`, ni `href="#donde-leer-esta-obra"`, ni el `id` |
| Afiliación encendida | tienda de prueba y ediciones | salto y `h2` idénticos; la página = la apagada + el `div[data-ingreso]` |
| Activación | Intro sobre el salto | URL con `#donde-leer-esta-obra` y foco en el `h2`, con el anillo; el enlace no declara zona (la escucha ya ignora la propia ruta) |

</intent-contract>

## Code Map

- `src/pages/obra/[autor]/[slug]/[...page].astro:119-141` -- la Cabecera (`header.cabecera-de-obra`, `p.de` con `data-zona="atribucion"` en 132); el salto va tras `p.de`, antes de `</header>` (141). `:160` pinta `DondeLeer` con `primera && resumenDondeLeer !== undefined`: sacar esa condición a una constante y usarla también para el salto. Hoja: `.de` 196 (`--cuerpo-md`, 1,6), `.de a` 212 (zona de 44 px que asoma 10 px bajo la línea), `.listado` 228 (4 × arriba), `.temas` 236 (5 ×), `.nota-de-la-ficha` 244 (4 × / 3 ×).
- `src/components/DondeLeer.astro:61-62` -- `section.donde-leer[aria-labelledby]` y `<Rotulo id="donde-leer-esta-obra">`: pasar a `ANCLA_DE_DONDE_LEER` y `destino`. Su hoja ya da 4 × / 2 × / 1 × (UX-DR42).
- `src/components/Rotulo.astro` -- `h2.rotulo`; lo usan también `ListaDeObras.astro` y «Temas» en la página de Obra, que no deben cambiar.
- `src/lib/obras.ts:1236` -- `dondeLeer`; la constante va a su lado. Puro (AD-5).
- `src/styles/tokens.css:124` -- `:focus-visible` global (2 px siena, 2 px de separación); `:161` `a` en siena con `text-underline-offset`.
- Precedente de marcado y medidas: maqueta `ux-designs/…/mockups/v8-pagina-de-obra.html` (variante 1A, `.salto` y `.salto a`), solo lectura.
- `src/lib/medicion.ts:657` -- la escucha descarta `r.pathname==location.pathname`; `tests/unit/medicion.test.ts:2698` exime `href^="#"`: nada que tocar.
- `tests/unit/ayuda/enlaces.ts:316` -- `enlacesDe(html)`: `{href, target?, enMain, declaracion}` con la declaración de zona más cercana; sirve para «sin zona».
- `tests/unit/obra-pagina.test.ts` -- construcciones: 22.4 (`corpus(1)`, 207: Cartas indexable, Brevedad 51 Citas `noindex` con página 2, Ira de una Cita, Enquiridión, Disertaciones), 22.6 (797: nota en Brevedad, Ira sin cotejo), 22.8 congelada (987). `reglas`/`declaraciones` (506-523) leen la hoja emitida; 396-419 exige `</header>\s*<ul class="listado"` (debe seguir pasando); 651 exige que la página 2 no contenga «Dónde leer esta obra».
- `tests/unit/ediciones-en-venta.test.ts:624` (encendida: `fuenteConModeloEncendido(fuenteConTiendaDePrueba(…))`, `corpusConstruido(true)`) y `:741` (`uno`: tienda, apagada, `corpusConstruido(true)`) -- la pareja «encendida / apagada» de la misma copia; `bloqueDeEdiciones` (611) recorta el `div[data-ingreso]`. Rutas: `PAGINA_1` (cotejada, ediciones, página 2), `CARTAS_1` (`noindex`), `IRA_1` (sin cotejo), `PAGINA_2`.
- `tests/e2e/accesibilidad.spec.ts:26-109` -- `dist`, `rutasConstruidas`, `OBRAS` (`indexable`, `noIndexable`, `segunda`, `tituloLargo`) derivadas del `dist/`; 551-628 medida de zonas por eje con 7,5 px de holgura; 427-461 el anillo resuelto contra `--siena`.

## Tasks & Acceptance

**Execution:**
- `src/lib/obras.ts` -- exportar `ANCLA_DE_DONDE_LEER` con comentario (UX-DR96, un dueño del `id`).
- `src/components/Rotulo.astro` -- prop `destino?: boolean` → `tabindex={destino ? -1 : undefined}`; regla `.rotulo[tabindex='-1']` con `scroll-margin-top`; comentario UX-DR100.
- `src/components/DondeLeer.astro` -- `id`/`aria-labelledby` desde la constante y `destino` en el `Rotulo`.
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- constante `conDondeLeer`; el `p.salto` en la Cabecera según Always; su hoja; comentario de cabecera del fichero (página 1: Cabecera con salto).
- `tests/unit/obra-pagina.test.ts` -- sin construcciones nuevas: (1) en las construcciones 22.4, 22.6 y 22.8, recorrer todo `dist/obra/**/index.html`: en cada página 1, `enlacesDe` da exactamente un `href` que empieza por `#` distinto de `#contenido`; es `#donde-leer-esta-obra`, sin `target`, en `main` y con `declaracion: null`; su `id` aparece una sola vez en la página y en `<h2 class="rotulo" id="donde-leer-esta-obra" tabindex="-1"`; en cada 2+, ninguno, ni `class="salto"`, ni el `id`; con Brevedad (2+), Ira (una Cita, sin cotejo en 22.6) y Cartas congelada cubiertas; (2) en la 22.4, el marcado exacto del salto dentro de la Cabecera tras `p.de` (`&nbsp;` o U+00A0), y que el texto del enlace sin el `span` oculto es «Dónde leer esta obra»; (3) guardia de CI sobre la hoja emitida (subir `reglas`/`declaraciones` a nivel de módulo): la regla del `p.salto` (3 ×, `--cuerpo-md`, 1,6) y la de su `a` (siena, subrayado, grosor, `inline-flex`, `--zona-de-toque`), la de `.rotulo[tabindex='-1']` (2 ×), y en la página 1 con nota de la 22.6 las del pie: `.temas` 5 ×, `.donde-leer` 4 ×, `.tras-el-rotulo` 2 ×, `.linea` 1 ×, `.nota-de-la-ficha` 4 × de margen y 3 × de relleno con su filete; (4) el `h2` «Temas» sigue sin `tabindex`; y las pruebas existentes «va después del Listado, la Paginación y los Temas», «página 2: ni la sección ni la nota» y la de `</header>\s*<ul class="listado"` pasan sin tocarlas (el bloque no se mueve).
- `tests/unit/ediciones-en-venta.test.ts` -- memorizar a nivel de módulo las dos construcciones de `corpusConstruido(true)` (encendida y apagada con tienda) para que sus `describe` y el nuevo las compartan sin construir más; nuevo `describe` 24.7: en `PAGINA_1`, `CARTAS_1` e `IRA_1`, el `p.salto` y el `h2#donde-leer-esta-obra` son iguales en las dos; la página encendida sin `bloqueDeEdiciones` es igual a la apagada (en `IRA_1` y `PAGINA_2`, iguales sin quitar nada).
- `tests/e2e/accesibilidad.spec.ts` -- `describe('Historia 24.7 — el salto «Dónde leer esta obra ↓»')` con `OBRAS` y una derivación aparte, del `dist/`, de una página 1 con Paginación y Temas y otra sin Paginación con Temas y edición cotejada (lanza si no hay): (a) en `indexable` y `noIndexable`, `getByRole('link', { name: 'Dónde leer esta obra', exact: true })` es uno; tabular hasta él, Intro: `activeElement` es el `h2#donde-leer-esta-obra`, `location.hash` lo nombra, contorno `solid` de 2 px, separación 2 px y color de `--siena` resuelto, `scrollMarginTop` 16 px; (b) a 360 y 320 × 640, en `indexable`, `noIndexable` y `tituloLargo`: la caja del enlace mide 44 px (± 0,5) y su hueco vertical con la de `.de a` es ≥ 7,5 px; (c) a 360 × 640, en `tituloLargo` e `indexable`, con `scrollY` 0, el borde superior del primer `.listado .fragmento` más su interlineado no pasa de 640; (d) el pie medido: Paginación o último `ul.listado` → `.temas` 40 px, `.temas` → `.donde-leer` 32, `h2` → primer hermano 16, `h3` → primera `.linea` 8, y la Nota (4 × y 3 ×) solo si alguna Obra del `dist/` la trae; página 1: `ul.listado` 32 px bajo el `p.salto`; `segunda`: sin salto y `ul.listado` 32 px bajo `p.de`. Todas ± 0,5 px.

**Acceptance Criteria:**
- Given cualquier página 1 de Obra (indexable, `noindex`, congelada, sin cotejo), when se sirve, then su Cabecera lleva en su propia línea, a 3 × `--unidad` de «de {Autor} · {año}», el enlace «Dónde leer esta obra ↓» en `--cuerpo-md`, siena y subrayado siempre, a `#donde-leer-esta-obra`, en la misma pestaña, con la flecha `aria-hidden` y sin zona; y las 2+ no lo llevan.
- Given el `dist/` de las construcciones de prueba, when corre Vitest, then toda página 1 de Obra lleva exactamente un salto cuyo destino es un `id` de esa página, un `h2` con `tabindex="-1"`, y ninguna 2+ lo lleva.
- Given la pareja encendida/apagada, when se comparan, then el salto y su `h2` son idénticos byte a byte y lo único que difiere en la página vive dentro del `data-ingreso` de «Ediciones en venta».
- Given el sitio construido (Playwright local), when se activa el salto con Intro, then el foco queda en el `h2` con el anillo global y `scroll-margin-top` de 16 px; su zona mide 44 px a 360 y 320 px sin tocar la de «de {Autor}» (≥ 8 px); la primera Cita sigue empezando en 360 × 640; y el pie mantiene 5 ×, 4 ×, 2 ×, 1 × y la Nota 4 × / 3 ×, sin hueco reservado.
- Given la suite, when corren `npm run check` y `npm test`, then pasan, incluida la prueba de zonas de la 23.7 sin tocarla.

## Spec Change Log

## Review Triage Log

## Design Notes

**Por qué 3 × y no menos.** La zona de «de {Autor}» es el `a` en `inline-block` con 10 px de relleno y −10 de margen: asoma 10 px bajo la línea de `p.de`. El `a` del salto en `inline-flex` de 44 px llena la línea de su párrafo (alineado por la base, la caja ocupa exactamente los 44 px), así que su zona empieza en el borde de `p.salto`. Hueco = 24 − 10 = **14 px** (con 2 × serían 6: por eso 3 × es «lo mínimo», DESIGN.md § Página de Obra). La prueba exige ≥ 7,5, como el resto de medidas de zonas.

**Por qué sin guion.** Al navegar a un fragmento, el navegador ejecuta los pasos de foco sobre el destino si es enfocable: `tabindex="-1"` basta, y tras Intro el último gesto fue de teclado, así que casa `:focus-visible` y sale el anillo global. La escucha de medición ya ignora la propia ruta.

**Byte a byte.** `Rotulo` sin `destino` no emite `tabindex`; solo cambia la hoja que acompaña a `Rotulo` (una regla nueva, también en la Página de Autor), no su marcado.

## Verification

**Commands:** desde `/Users/hec/brainlySabiduria/.claude/worktrees/v8-epicas-24-26`; lo que pase de ~8 min, con `/Users/hec/brainlySabiduria/.claude/v8-ralph/correr.sh /Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-24-26/24-7-<nombre>.log /Users/hec/brainlySabiduria/.claude/worktrees/v8-epicas-24-26 <orden>` y `esperar.pl <log> 540`.
- `npx vitest run tests/unit/obra-pagina.test.ts` y `npx vitest run tests/unit/ediciones-en-venta.test.ts` (en segundo plano) -- `FINISHED EXIT=0`.
- Uno a uno: `lista-de-obras`, `obra-construida`, `congelacion-de-obras`, `espinas-de-ux`, `publicable-y-alcanzable`, `ingreso-construido`, `medicion` -- verdes.
- `npm run check` -- 0 errores. `npm test` en segundo plano (≈16 min) -- `FINISHED EXIT=0`.
- `npx playwright test tests/e2e/accesibilidad.spec.ts` (los dos proyectos; construye el sitio, puertos 4321 y 8787) -- verde; `npx playwright test tests/e2e/pagina-de-cita.spec.ts --grep "Cabecera de Obra"` y `npx playwright test tests/e2e/ingreso-accesible.spec.ts --project=escritorio` -- verdes. Parar todo servidor arrancado.

## Auto Run Result

Status: ready-for-dev
Blocking condition: ninguna. Planificación cerrada el 2026-10-25 en `v8/epicas-24-26` (bmad-build-auto, «Halt after planning»); falta implementar, verificar y revisar.
