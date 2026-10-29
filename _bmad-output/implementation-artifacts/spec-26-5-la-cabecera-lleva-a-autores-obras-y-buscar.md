---
title: 'La cabecera lleva a Autores, Obras y Buscar'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_revision: '58d866a833b95a9f0268946f793279bf21a825ee'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-26-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md'
warnings: ['oversized']
deferred:
  - summary: >-
      A 320 px con el texto al 200 % (zoom 2 sobre `<html>`) la Página de Cita se desplaza en horizontal por su contenido, no por la cabecera.
    evidence: |-
      Medido el 2026-10-28 sobre lo construido: `scrollWidth` 340 frente a 320 en `/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los/`; desbordan `h1.texto`, «Compartir en» y las Rutas de salida, que esta historia no toca. La cabecera no desborda y parte sus enlaces con 8 px entre filas (`tests/e2e/cabecera.spec.ts`). `epics.md` (Historia 26.5) asigna a la 26.9 extender la simulación del 200 % a toda superficie: es su puerta, y hoy fallaría en la Página de Cita.
    location: >-
      Página de Cita (contenido de `main`); Historia 26.9
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Los Directorios `/autores/` (26.3) y `/obras/` (26.4) existen pero ninguna página los enlaza: la cabecera del armazón lleva solo la marca y «Buscar», y las dos pruebas de alcance los eximen por ruta. Historia 26.5, `epics.md` líneas 7163-7231 (autoritativo); `DESIGN.md § Cabecera` (líneas 248-255) y `EXPERIENCE.md § Cabecera` (119-127).

**Approach:** `Armazon.astro` pinta «Sabiduría de Bolsillo · Autores · Obras · Buscar»: la marca y una `<nav aria-label="Principal">` con una lista `role="list"` de tres enlaces compuestos con constructores de `src/lib/superficies.ts`, `aria-current="page"` en su página, dos filas bajo 600 px y una desde 600. Se quitan las exenciones de alcance de los Directorios y una prueba de `dist/` fija los cuatro enlaces y los dos saltos.

## Boundaries & Constraints

**Always:**
- Marcado: `<header class="cabecera contenedor" data-zona="cabecera">` → `<a class="marca" href={rutaDeLaPortada()}>{MARCA}</a>` y `<nav aria-label="Principal"><ul role="list">` con tres `<li>`: «Autores» → `rutaDelDirectorioDeAutores()`, «Obras» → `rutaDelDirectorioDeObras()`, «Buscar» → `rutaDeLaBusqueda()` (nuevo, `'/buscar/'`), en ese orden y sin `target`. Las clases `.marca` y `.buscar` se conservan (las usan `pagina-404`, `marca`, `portada`, `pagina-de-cita` y `receptor` `.spec.ts`).
- Punto medio «·» (U+00B7, en el subconjunto `latin`) dentro del `<li>` de Autores y del de Obras, **después** del enlace, en `<span aria-hidden="true">`, `color: var(--tinta-apagada)`, de ancho `var(--unidad)` y centrado: él es el `{spacing.unit}` entre zonas y nunca abre una fila al partirse. Es glifo tipográfico, no icono. La cabecera no lleva «→» ni «›».
- `aria-current="page"` sale de comparar `rutaNormalizada(ruta)` (la prop del armazón) con `rutaNormalizada` de cada constructor: la marca en `/`, «Autores» en `/autores/`, «Obras» en `/obras/`, «Buscar» en `/buscar/` (estático: vale con cualquier parámetro). En ninguna otra ruta; nunca dos a la vez.
- Estilo (tokens de `tokens.css`, ningún literal de color ni tipografía): marca como hoy (Inter, `--autor`, 600, 0,09em, mayúsculas, `--tinta`, sin subrayado salvo `:hover`), enlace de bloque **a su ancho** (`align-self: flex-start` o equivalente; zona = texto × 44 px de alto). Los tres enlaces: `--cuerpo-md`, `display: flex; align-items: center; min-height` y `min-width: var(--zona-de-toque)`, `padding-inline: var(--unidad)`, subrayados siempre; «Autores» y «Obras» con la clase global `.enlace-en-tinta`, «Buscar» en `--siena`. Ningún elemento de la cabecera con `white-space: nowrap`; la marca puede partirse.
- Bajo 600 px (`@media (min-width: 600px)` literal, como `BloqueDeCita.astro`): columna, `padding-block: var(--unidad)`, `gap: var(--unidad)`; la `ul` en `flex-wrap: wrap` con `row-gap: var(--unidad)` y `margin-inline-start: calc(-1 * var(--unidad))` (el texto de «Autores» alineado con el de la marca). Total 8+44+8+44+8+1 = 113 px. Desde 600 px: una fila, marca a la izquierda y enlaces a la derecha, `padding-block: calc(var(--unidad) * 2)`, sin retranqueo.
- Orden de tabulación: «Saltar al contenido.», marca, Autores, Obras, Buscar, `main`; el anillo global de `:focus-visible` no se toca.
- Las medidas de cabecera (320 y 360 px) y del comienzo de la Cita (360 × 640) se anotan **con fecha** en `## Medidas` de este spec; si difieren de las de `DESIGN.md` (113 y ~153 px), van a `deferred` como «pendiente de Héctor (bmad-ux)».

**Block If:**
- Con la cabecera nueva, alguna página 1 de Obra deja su primera Cita fuera de la primera pantalla a 360 × 640 (`tests/e2e/accesibilidad.spec.ts`, «a 360 × 640, la primera Cita sigue empezando…»), o la Cita de la Página de Cita empieza por debajo de 640 px: compactar cabecera o Cabecera de Obra es decisión de UX. HALT `blocked` con las medidas.
- El barrido axe (`accesibilidad.spec.ts`) falla en la cabecera por una regla cuya corrección contradice `DESIGN.md`/`EXPERIENCE.md`.

**Never:**
- Editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/` (tampoco `DESIGN.md` si las cifras difieren).
- Hacer de la marca un `h1` (28.1), migas de pan, enlazar `/kit` o `/lote`, abrir pestaña nueva, un `<style>`/guion nuevo fuera del armazón, tocar `astro.config.mjs` o las fuentes.
- Relajar `MAX_SALTOS_DESDE_LA_PORTADA` o una prueba existente para que pase; dejar viva cualquier exención de los Directorios.
- Una zona nueva en `ZONAS` o un `data-zona` dentro de la cabecera que tape `cabecera`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Portada | `/` | marca con `aria-current="page"`; los tres sin él | — |
| Directorio | `/autores/`, `/obras/` | solo su enlace con `aria-current` | — |
| Búsqueda | `/buscar/?q=tiempo` | «Buscar» con `aria-current` | — |
| Resto | Cita, Autor p1/p2, Obra p1/p2 (también noindex), Tema, Colección, 404, `/kit`, `/lote` | cuatro enlaces, ninguno con `aria-current` | — |
| 320 px al 200 % | zoom 2 sobre la ventana de 320 | la marca y los enlaces se parten en filas con 8 px, `scrollWidth ≤ clientWidth` | — |

</intent-contract>

## Code Map

- `src/components/Armazon.astro` -- docblock 1-11 (UX-DR29, a poner al día: UX-DR54/55/101/102/105/106/112), props `ruta` (40-50), cabecera 181-187 (`data-zona="cabecera"`, comentario 23.7 a ampliar a los tres enlaces), estilos `.cabecera`/`.marca`/`.buscar` 222-268. Importa ya de `../lib/superficies.ts` y `MARCA` de `../lib/marca.ts`.
- `src/lib/superficies.ts:375-400` -- `rutaDelDirectorioDeAutores`/`rutaDelDirectorioDeObras`; añadir al lado `rutaDeLaPortada()` → `'/'` y `rutaDeLaBusqueda()` → `'/buscar/'` (declarada en 259-273, `reconoce: /^\/buscar$/`). `rutaNormalizada` (474).
- `src/styles/tokens.css` -- `--unidad` 8, `--margen` 20 bajo 600, `--zona-de-toque` 44, `--tinta`, `--tinta-apagada`, `--siena`, `--filete`, `--cuerpo-md`, `--autor`; `.enlace-en-tinta` (175), `:focus-visible` (124), `.contenedor` (155).
- `src/components/DondeSeguirnos.astro:16-17` -- comentario «La cabecera lleva solo marca y búsqueda (UX-DR29)», ya falso.
- `src/components/LetrasDeSalto.astro:27-28` -- patrón `<nav aria-label> <ul role="list">`.
- `tests/unit/publicable-y-alcanzable.test.ts` -- build `CORPUS_COMPLETO` (180-275, Séneca: 51+2 Citas, Tema, Colección, Obra indexable y no indexable con `/2`, kit, lote, 404, buscar, Directorios); `sitioConstruido` (289-316, lee `href` de cada HTML); exención `EXENTAS_DE_ALCANCE`/`alcanzables` y la aserción de caducidad (318-350, la de caducidad en 349) a quitar. `superficiesInalcanzables(publicadas, enlaces, { maximoDeSaltos })` (`src/lib/publicado.ts:903`).
- `tests/unit/ayuda/enlaces.ts` -- `recorrerElementos(html, (elemento, antepasados) => …)` y `enlacesDe(html)` con `declaracion` (zona más cercana); patrón en `tests/unit/medicion.test.ts:3000-3008`.
- `tests/e2e/seo.spec.ts:158-168,241-253` -- `exentas`, filtro de `publicadas` y aserción «la exención de los Directorios ya sobra», a quitar (y sus importaciones si quedan sin uso).
- `tests/e2e/pagina-de-cita.spec.ts:218-225` -- «la cabecera lleva solo marca y búsqueda», a reescribir; 238-250 bordes (`.marca`) no cambia.
- `tests/e2e/receptor.spec.ts:1149-1290` -- describe 23.7 con `quedarseEn`, `apuntarBalizas`, `esperarAlFichero`, `esperarEvento`, `balizasDe`; usa `header a.buscar` (1263).
- `tests/e2e/accesibilidad.spec.ts:1429-1459` -- primera Cita de toda página 1 de Obra a 360 × 640 (puerta del Block If); barrido axe de toda superficie.
- `tests/e2e/directorio-de-autores.spec.ts` -- patrón de sondas de tokens (elemento de prueba que resuelve `var(--…)`) y de `document.fonts.ready`.
- `playwright.config.ts` -- proyectos `movil` (360 × 640) y `escritorio` (1280 × 900); el sitio lo sirve `tests/servidor.mjs`.

## Tasks & Acceptance

**Execution:**
- `src/lib/superficies.ts` -- añadir `rutaDeLaPortada()` y `rutaDeLaBusqueda()` con docblock (Historia 26.5) -- la cabecera compone sus destinos con constructores, no con literales.
- `src/components/Armazon.astro` -- cabecera nueva según Always (marcado, `aria-current`, puntos, estilos, dos filas/una fila); docblock y comentario de zona al día -- UX-DR54/55/101/102/105/106/112.
- `src/components/DondeSeguirnos.astro` -- corregir el comentario de la cabecera -- deja de ser cierto.
- `tests/unit/superficies.test.ts` -- los dos constructores nuevos dan `'/'` y `'/buscar/'` y su `superficieDeclaradaDe` es `index.astro` y `buscar.astro` -- fija el contrato del constructor.
- `tests/unit/publicable-y-alcanzable.test.ts` -- quitar `EXENTAS_DE_ALCANCE`, `alcanzables` y la aserción de caducidad (la principal pasa a `superficiesInalcanzables(publicables, enlaces)` = `[]`, conservando que `/autores` y `/obras` están entre las publicables); añadir en el mismo `describe` (mismo build): (a) toda página HTML de `dist/` lleva un `<header>` fuera de `main` con exactamente cuatro `<a>` — `/`, `/autores/`, `/obras/`, `/buscar/` en ese orden —, los tres últimos dentro de `nav[aria-label="Principal"] > ul[role="list"]`, sin `target`, cada destino con página en `dist/`, y la `declaracion` de los cuatro es `{ zona: 'cabecera' }`; (b) `aria-current="page"` aparece en la cabecera solo en `/`, `/autores`, `/obras`, `/buscar` y en el enlace que toca, y en ninguna otra página; (c) con un grafo que tiene de `/` **solo** los enlaces de su cabecera y de `/autores` y `/obras` todos los suyos, toda Página de Autor p1 y toda página 1 de Obra (las dos de este corpus, también la noindex) cumplen `superficiesInalcanzables(…, { maximoDeSaltos: 2 })` = `[]` -- AC de `dist/`, NFR-5/FR-55 y la retirada de la exención.
- `tests/e2e/seo.spec.ts` -- quitar la exención y su aserción de caducidad; el recorrido juzga todo el sitemap -- la 26.5 la cierra.
- `tests/e2e/pagina-de-cita.spec.ts` -- «la cabecera lleva marca, Autores, Obras y Buscar, sin migas de pan»: cuatro enlaces `/`, `/autores/`, `/obras/`, `/buscar/` -- enmienda UX-DR112 de la 2.1.
- `tests/e2e/cabecera.spec.ts` (nuevo) -- a 320 y 360 px (Página de Cita, tras `document.fonts.ready`): alto 113 ± 1 px, dos filas, marca más estrecha que su fila, texto de «Autores» alineado con el de la marca (± 1 px), 8 px (± 0,5) entre la zona de la marca y las de los enlaces, cada enlace ≥ 44 × 44; a 600 y 1280 px, una sola fila; a 360 × 640, el texto de la Cita empieza (borde superior y fin de su primera línea) dentro de 640 px; las medidas a `test.info().annotations`; a 320 px con `document.documentElement.style.zoom = '2'` (declarado en el comentario: los cuerpos están en px), sin desplazamiento horizontal, enlaces partidos con 8 px entre filas y ningún elemento de la cabecera con `white-space` `nowrap`; colores y subrayados por sondas de tokens (Autores/Obras en `--tinta`, Buscar en `--siena`, los tres `underline`; puntos en `--tinta-apagada` con `aria-hidden`; marca sin subrayado); orden de Tab y anillo de foco; `aria-current` en `/`, `/autores/`, `/obras/`, `/buscar/?q=tiempo` y en ninguno en una Cita -- lo que solo se ve en el navegador.
- `tests/e2e/receptor.spec.ts` -- en el describe 23.7, un clic en «Autores» de la cabecera desde la Cita da `salida-interna` con `zona: 'cabecera'` -- UX-DR111 en la superficie.
- `_bmad-output/implementation-artifacts/spec-26-5-la-cabecera-lleva-a-autores-obras-y-buscar.md` -- tras medir, `## Medidas` con fecha y valores; si difieren de `DESIGN.md`, entrada en `deferred` -- AC v8.2.

**Acceptance Criteria:**
- Given cualquier página construida con el armazón, when se mira su cabecera, then dice «Sabiduría de Bolsillo · Autores · Obras · Buscar» con filete inferior `--filete`, sin migas de pan, y sus enlaces llevan en la misma pestaña a `/`, `/autores/`, `/obras/` y `/buscar/`.
- Given una ventana de menos de 600 px, when se pinta, then va en dos filas de 113 px en total a 320 y a 360 px, y desde 600 px en una fila.
- Given el teclado, when se recorre, then el orden es salto, marca, Autores, Obras, Buscar y `main`, con el anillo global.
- Given un clic en la marca o en un enlace de la cabecera, when la medición está activa, then sale `salida-interna` con zona `cabecera`.
- Given el sitio de prueba, when se recorren los enlaces, then toda Página de Autor y toda página 1 de Obra quedan a dos saltos de la portada por la cabecera y su Directorio, sin exenciones en ninguna prueba de alcance.
- Given el barrido de accesibilidad, when corre, then la cabecera pasa WCAG 2.2 AA en toda superficie.

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

(Primera pasada de este bucle: las capas de revisión son externas y el orquestador no ha traído hallazgos todavía; la revisión independiente viene después.)

### 2026-10-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 8: (high 0, medium 1, low 7)
- defer: 1: (high 0, medium 1, low 0)
- reject: 14: (high 0, medium 0, low 14)
- addressed_findings:
  - `[medium]` `[patch]` La medición de la cabecera solo se probaba con un clic en «Autores» (blind-hunter, intent-alignment R6, ac-auditor 6): `receptor.spec.ts` prueba ahora los cuatro —la marca, «Autores», «Obras» y «Buscar»—, cada uno en una página nueva, con `salida-interna` y zona `cabecera`.
  - `[low]` `[patch]` La tipografía de la marca no se afirmaba (ac-auditor 1): `cabecera.spec.ts` exige familia y cuerpo de `--sans`/`--autor`, peso 600, 0,09em y mayúsculas, por sonda; y que la familia sea Inter.
  - `[low]` `[patch]` El subrayado de la marca al pasar el cursor no se probaba (ac-auditor 2): `hover` y `text-decoration-line: underline`.
  - `[low]` `[patch]` El cuerpo `body-md` de los enlaces no se probaba (ac-auditor 3): los tres al `--cuerpo-md` de la sonda.
  - `[low]` `[patch]` El `{spacing.unit}` horizontal entre zonas y el relleno lateral no se medían (blind-hunter, ac-auditor 4): los dos puntos de ancho `--unidad`, 8 px entre zonas de enlace contiguas y `padding-inline` de `--unidad` en cada enlace.
  - `[low]` `[patch]` Los puntos heredaban el `--cuerpo-lg` del `body` en vez del cuerpo de los enlaces (blind-hunter): `.punto` va a `--cuerpo-md` en `Armazon.astro`, y la prueba lo fija.
  - `[low]` `[patch]` Desde 600 px no se probaba que los enlaces vayan al borde derecho ni el aire de abajo, ni el borde 599 de la media query (blind-hunter, ac-auditor 5): el último enlace pegado al borde derecho del contenido (± 1 px), 2 × `--unidad` abajo, y 599 px entre los anchos de dos filas.
  - `[low]` `[patch]` Faltaban en `dist/` la navegación «Principal» única y los puntos ocultos en toda superficie (blind-hunter); sobraba el alias `publicadas = delSitemap` en `seo.spec.ts`: la prueba de `dist/` exige una sola `nav[aria-label="Principal"]` y dos `.punto` con `aria-hidden="true"` dentro de su `<li>` en cada página; el alias se quita.

Diferido: el desplazamiento horizontal de la **página** de Cita a 320 px con el texto al 200 % (blind-hunter, intent-alignment R3, ac-auditor 8), que causa su contenido y no la cabecera, y que `epics.md` asigna a la 26.9 al extender la simulación a toda superficie.

Rechazados, con su razón: el spec cerrado antes de la revisión (proceso; esta es la revisión); la comprobación del 200 % acotada a la cabecera sin entrada en el Spec Change Log (`epics.md` reserva a la 26.9 el reflujo de toda superficie con la misma simulación, y lo que desborda la página está diferido); el retranqueo cuando la navegación se parte desde 600 px con el texto ampliado (blind-hunter, edge-case-hunter: el contrato dice «sin retranqueo» desde 600 px y el desfase de 8 px solo aparece con el texto ampliado entre 600 px y el ancho en que la fila cabe; cosmético); las comprobaciones pintadas en una sola superficie y sin modo oscuro (la cabecera es el mismo marcado en toda página —lo fija `dist/`— y el barrido axe recorre toda superficie); sin marca visible de `aria-current` (ni `DESIGN.md` ni `EXPERIENCE.md` la piden); `seo.spec.ts` con `--workers=1` (así se corre desde la 26.3, rechazado ya en su revisión); los 153 px solo como «primera pantalla» (el AC dice «hacia los 153 px», el alto de la cabecera va fijado a 113 ± 1 y la cifra se anota); `sprint-status.yaml` y las precondiciones en `review` (lo lleva el orquestador); la prueba de `dist/` sobre todo `.html` (`public/` no trae ninguno y es deliberado: toda página construida lleva el armazón); el recorrido de `dist/` repetido en tres pruebas (coste menor); la Cita fija de `cabecera.spec.ts` (es la que comparten las pruebas del armazón: `pagina-de-cita`, `marca`, `seo`, `accesibilidad`…); un constructor de ruta con `?` o `#` (los cuatro devuelven literales sin ellos); el alcance juzgado en el fixture y a 3 saltos en el sitio real (el AC dice «el sitio de prueba construido»; las páginas 2+ de Autor cuelgan de su página 1); y el barrido axe sin prueba nueva (lo cubre `accesibilidad.spec.ts` en toda superficie).

### 2026-10-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 11: (high 0, medium 0, low 11)
- defer: 0
- reject: 17: (high 0, medium 0, low 17)
- addressed_findings:
  - `[low]` `[patch]` Desde 600 px, si el texto ampliado parte la fila, «Autores» quedaba 8 px a la derecha del texto de la marca (blind-hunter, edge-case-hunter, intent-alignment): `Armazon.astro` conserva el retranqueo de `--unidad` también desde 600 px —en la fila única no mueve nada, porque `space-between` lleva la navegación al borde derecho— y `cabecera.spec.ts` lo prueba a 600 px con zoom 2 (comprobado que falla con el `margin-inline-start: 0` de antes).
  - `[low]` `[patch]` El docblock del armazón decía «todo Autor y toda Obra» a dos saltos (blind-hunter): dice ya «toda Página de Autor y toda página 1 de Obra», con las 2+ colgando de su página 1.
  - `[low]` `[patch]` `cabecera.spec.ts` decía no usar literales y fijaba 44 y 8 (blind-hunter): la zona de toque sale de una sonda de `--zona-de-toque`, y el docblock nombra los dos valores declarados que sí se escriben (el `{spacing.unit}` de 8 px y los 113 px).
  - `[low]` `[patch]` Desde 600 px no se comprobaban las zonas de 44 × 44, el relleno lateral, los 8 px entre zonas ni la ausencia de `nowrap` (blind-hunter): las pruebas de 600 y 1280 px los comprueban con las mismas funciones que las de dos filas.
  - `[low]` `[patch]` Que ninguna fila partida empiece por «·» no se afirmaba (blind-hunter): a 320 px con el texto al 200 % cada punto sigue en la fila de su enlace y a su derecha.
  - `[low]` `[patch]` Las medidas de 320 px de la Cita en `## Medidas` no se volvían a medir (blind-hunter): la prueba de la primera pantalla corre a 320 × 640 y a 360 × 640 y anota las dos.
  - `[low]` `[patch]` Los rótulos de la cabecera solo se miraban en una página (ac-auditor 3): la prueba de `dist/` exige en toda página «Sabiduría de Bolsillo», «Autores», «Obras» y «Buscar», en ese orden.
  - `[low]` `[patch]` Una página sin cabecera daba un `TypeError` y una ruta de Directorio mal normalizada, un «inalcanzable» engañoso (blind-hunter, edge-case-hunter): `cabeceraDe` exige una cabecera única nombrando la ruta, y el grafo de dos saltos exige que los dos Directorios tengan enlaces.
  - `[low]` `[patch]` `x.html` y `x/index.html` se pisaban en silencio en el mapa de páginas (edge-case-hunter): `paginasConstruidas` lanza ante una ruta repetida.
  - `[low]` `[patch]` `not.toHaveAttribute('target', /.*/)` en `pagina-de-cita.spec.ts` (blind-hunter): `not.toHaveAttribute('target')`.
  - `[low]` `[patch]` El spec se contradecía (blind-hunter, también ac-auditor 5): la primera «Revisión» del Auto Run Result queda marcada como sustituida, la línea de `receptor.spec.ts` dice que se amplió a los cuatro enlaces, y la Verificación da `seo.spec.ts` con `--workers=1`, que es como pasa.

Rechazados, con su razón: la primera entrada vacía del Triage Log (es el registro fiel de una pasada sin hallazgos externos; reescribir el historial es peor); `sprint-status.yaml` y las precondiciones en `review` (lo lleva el orquestador, que se mantiene a mano); `DESTINOS` y la lista de `pagina-de-cita.spec.ts` en literal (el criterio fija esas cuatro rutas; derivarlas de los constructores no vería un constructor cambiado); el «·» al final de una fila partida (consecuencia elegida por el contrato: el punto va detrás de su enlace y lo que se prohíbe es que abra fila); sin marca visible de `aria-current` y sin estado de sección en páginas hijas (ni `DESIGN.md` ni `EXPERIENCE.md` lo piden y el contrato dice «en ninguna otra ruta»); que las balizas no digan el destino del clic (`salida-interna` no lleva destino por diseño; el selector fija qué enlace se pulsa); el recorrido de `dist/` repetido (coste menor); una cabecera anidada en otra (la prueba ya exige una sola cabecera fuera de `main`); el desplazamiento de la página a 320 px al 200 % (ya diferido a la 26.9); el alcance en un grafo restringido sobre el sitio de prueba (es lo que dice el criterio, y `seo.spec.ts` juzga el sitio entero); las comprobaciones pintadas en una sola superficie (el marcado es el mismo en toda página y lo fija `dist/`; axe barre toda superficie); los ~153 px solo anotados (el alto de la cabecera va fijado a 113 ± 1 y el criterio manda anotar y llevar a `bmad-ux` si difieren); los receptores solo desde la Cita (la zona se fija en toda página en `dist/`); `/kit` y `/lote` sin enlace entrante desde los Directorios (lo cubren `kit.spec.ts` «ninguna página pública enlaza al Kit» y la prueba de `/lote` sobre todo el sitio); la correspondencia de tokens con los roles de `DESIGN.md` (es la de `tokens.css`); Playwright solo en local (política del proyecto); y el uso de los constructores sin prueba (evidencia de revisión; las rutas las fija `dist/`).

## Design Notes

El punto va **dentro** del `<li>` del enlace anterior para que la lista siga teniendo tres elementos para el lector de pantalla y, al partirse a 320 × 200 %, una fila nunca empiece por «·».

```astro
<nav aria-label="Principal"><ul role="list">
  <li><a class="enlace-en-tinta" href={rutaDelDirectorioDeAutores()} aria-current={…}>Autores</a><span class="punto" aria-hidden="true">·</span></li>
  …<li><a class="buscar" href={rutaDeLaBusqueda()} aria-current={…}>Buscar</a></li>
</ul></nav>
```

El zoom (`style.zoom = '2'` sobre `<html>`) deja la ventana en 320 y el ancho CSS en 160; las media queries siguen viendo 320, que es lo que se quiere (decisión de Héctor del 2026-10-19). El «›» de la v8.3 no aplica: la cabecera no lleva glifo de avance.

## Verification

**Commands:**
- `npx vitest run tests/unit/publicable-y-alcanzable.test.ts` -- expected: verde, sin exenciones.
- `npx vitest run tests/unit/superficies.test.ts` y `npx vitest run tests/unit/medicion.test.ts` -- expected: verde (zona `cabecera` en cada cabecera; todo enlace con zona).
- `npx astro check` -- expected: 0 errores.
- `npm run build` y luego, contra `tests/servidor.mjs`, `npx playwright test tests/e2e/cabecera.spec.ts tests/e2e/pagina-de-cita.spec.ts tests/e2e/receptor.spec.ts tests/e2e/pagina-404.spec.ts tests/e2e/marca.spec.ts tests/e2e/portada.spec.ts` en `movil` y `escritorio` -- expected: verde.
- `npx playwright test tests/e2e/accesibilidad.spec.ts --project=movil --project=escritorio` y `npx playwright test tests/e2e/seo.spec.ts --project=movil --project=escritorio --workers=1` (largas: `correr.sh`/`esperar.pl`; `seo.spec.ts` solo con `--workers=1`, porque con varios trabajadores los recorridos del sitemap agotan su tiempo por contención) -- expected: verde; si la primera Cita de una Obra sale de la primera pantalla, Block If.

## Medidas

Medido el **2026-10-28** sobre lo construido (`npm run build` + `tests/servidor.mjs`, Chromium, tras `document.fonts.ready`), en la Página de Cita `/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los/`:

| Medida | 320 px | 360 × 640 | `DESIGN.md` |
|---|---|---|---|
| Alto de la cabecera | 113 px | 113 px | ~113 px |
| Comienzo del texto de la Cita (borde superior del `h1.texto`) | 153 px | 153 px | ~153 px |
| Fin de la primera línea de la Cita | 190 px | 190 px | — |

Coinciden con `DESIGN.md`: no hay nada que llevar a `bmad-ux`. `tests/e2e/cabecera.spec.ts` las vuelve a medir y las anota en `test.info().annotations`.

Observado de paso, fuera del alcance de esta historia: a 320 px con el texto al 200 % (zoom 2 sobre `<html>`) la **cabecera** no desborda y parte sus enlaces en filas con 8 px, pero la Página de Cita sí se desplaza en horizontal (`scrollWidth` 340 frente a 320) por su contenido —`h1.texto`, «Compartir en», las Rutas de salida—, no por la cabecera. Es la puerta de la 26.9, que extiende esta simulación a toda superficie.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** `Armazon.astro` pinta la cabecera «Sabiduría de Bolsillo · Autores · Obras · Buscar»: la marca (a su ancho, sin ser `h1`) y una `<nav aria-label="Principal">` con `ul[role="list"]` de tres enlaces compuestos con constructores de `src/lib/superficies.ts` (dos nuevos, `rutaDeLaPortada` y `rutaDeLaBusqueda`), un punto medio `aria-hidden` dentro del `<li>` de Autores y del de Obras, `aria-current="page"` por comparación de rutas normalizadas, dos filas de 113 px bajo 600 px y una desde 600, todo con tokens. Se quitan las exenciones de alcance de los Directorios en la prueba unitaria y en `seo.spec.ts`.

**Ficheros.**
- `src/lib/superficies.ts` — `rutaDeLaPortada()` y `rutaDeLaBusqueda()`.
- `src/components/Armazon.astro` — marcado, `aria-current`, estilos de dos filas/una fila y docblock (UX-DR29 → UX-DR54/55/101/102/105/106/112).
- `src/components/DondeSeguirnos.astro` — el comentario de la cabecera deja de decir «solo marca y búsqueda».
- `tests/unit/superficies.test.ts` — los dos constructores y su superficie declarada.
- `tests/unit/publicable-y-alcanzable.test.ts` — sin `EXENTAS_DE_ALCANCE`/`alcanzables`; nuevo `describe` sobre el mismo build: cuatro enlaces en orden con zona `cabecera`, sin `target` y a páginas construidas en toda página de `dist/`; `aria-current` solo donde toca; Autor y Obras p1 (también la noindex) a dos saltos —y no a uno— por la cabecera y su Directorio.
- `tests/e2e/seo.spec.ts` — sin exención: el recorrido juzga el sitemap entero.
- `tests/e2e/pagina-de-cita.spec.ts` — la prueba de la 2.1 pasa a cuatro enlaces (UX-DR112).
- `tests/e2e/receptor.spec.ts` — un clic en «Autores» desde la Cita da `salida-interna` con zona `cabecera` (la primera pasada de revisión lo amplió a los cuatro enlaces).
- `tests/e2e/cabecera.spec.ts` (nuevo) — medidas a 320/360/600/1280, la Cita en la primera pantalla, el 200 % por zoom, colores y subrayados por sonda, Tab y anillo, `aria-current`.

**Revisión.** 0 parches, 0 diferidos, 0 rechazados en esta pasada (capas externas sin hallazgos aún). `followup_review_recommended: false` (parches: high 0, medium 0, low 0; puntuación 0). *Sustituido por las pasadas de revisión con las capas externas, más abajo: el valor vigente es el del frontmatter.*

**Verificación.**
- `npx vitest run tests/unit/publicable-y-alcanzable.test.ts` — 37/37 verde, sin exenciones.
- `npx vitest run tests/unit/superficies.test.ts` — 107/107 verde.
- `npx vitest run tests/unit/medicion.test.ts` — 532/532 verde (zona `cabecera` en cada cabecera; todo enlace con zona).
- `npx astro check` — 0 errores, 0 avisos (8 sugerencias previas, ninguna de esta historia).
- `npx playwright test tests/e2e/cabecera.spec.ts tests/e2e/pagina-de-cita.spec.ts tests/e2e/receptor.spec.ts tests/e2e/pagina-404.spec.ts tests/e2e/marca.spec.ts tests/e2e/portada.spec.ts` en `movil` y `escritorio` (construye con `npm run build` y sirve con `tests/servidor.mjs`) — verde tras acotar la comprobación del 200 % a la cabecera (la primera pasada exigía que la página entera no se desplazara, y lo que desborda es el contenido de la Cita, 26.9); `cabecera.spec.ts` volvió a correr entero: 18/18.
- `npx playwright test tests/e2e/accesibilidad.spec.ts tests/e2e/seo.spec.ts` — accesibilidad entera verde (barrido axe de toda superficie y la primera Cita de toda página 1 de Obra a 360 × 640: el Block If no se dispara); `seo.spec.ts` con 5 trabajadores dio tiempos agotados en los cuatro recorridos del sitemap por petición (contención: 30-57 s frente a 7-10 s), y con `--workers=1`, como se corre por separado desde la 26.3, 20/20 verde, incluido el recorrido de alcance sin exención.
- Además: `directorio-de-autores`, `directorio-de-obras`, `busqueda` y `tarjeta` `.spec.ts` — 90/90 verde.

**Auditoría de la matriz.** Portada, Directorios y Resto: prueba (b) de `publicable-y-alcanzable` sobre toda página de `dist/` y `cabecera.spec.ts` («`aria-current`… solo en su página»). Búsqueda con `?q=tiempo`: `cabecera.spec.ts`. 320 px al 200 %: `cabecera.spec.ts` (filas con 8 px, la cabecera con `scrollWidth ≤ clientWidth` y nada suyo fuera del borde, sin `nowrap`). Todas corrieron y pasaron.

**Riesgos.** La comprobación de reflujo al 200 % juzga la cabecera, no la página: la Página de Cita sí se desplaza 20 px con zoom 2 por su contenido (ver `## Medidas`), que es lo que cierra la 26.9. Las cuatro pruebas de recorrido del sitemap de `seo.spec.ts` dependen de correr solas (`--workers=1`). `sprint-status.yaml` no se ha tocado.

### Pasada de revisión con las capas externas (2026-10-28)

**Resumen.** Se triaron los hallazgos de las cinco capas externas (blind-hunter, edge-case-hunter, verification-gap —sin hallazgos—, intent-alignment y ac-auditor): 0 intent_gap, 0 bad_spec, 8 parches (1 medium, 7 low), 1 diferido y 14 rechazados (razones en el Review Triage Log). Sin vuelta atrás por el spec.

**Ficheros de esta pasada.**
- `src/components/Armazon.astro` — `.punto` al `--cuerpo-md` de los enlaces que separa (heredaba el `--cuerpo-lg` del `body`).
- `tests/e2e/cabecera.spec.ts` — tipografía de la marca (Inter, `--autor`, 600, 0,09em, mayúsculas) y su subrayado al pasar el cursor; `--cuerpo-md` en los tres enlaces y en los puntos; puntos de ancho `--unidad`, 8 px entre zonas de enlace y `padding-inline` de `--unidad`; 599 px entre los anchos de dos filas; desde 600 px, enlaces al borde derecho del contenido y 2 × `--unidad` abajo.
- `tests/e2e/receptor.spec.ts` — la salida `cabecera` se prueba con un clic en la marca, «Autores», «Obras» y «Buscar», una página nueva por enlace.
- `tests/unit/publicable-y-alcanzable.test.ts` — en toda página de `dist/`, una sola `nav[aria-label="Principal"]` y dos `.punto` con `aria-hidden="true"` dentro de su `<li>`.
- `tests/e2e/seo.spec.ts` — sin el alias `publicadas = delSitemap`.

**Revisión.** Parches aplicados: 8 (high 0, medium 1, low 7). Diferidos: 1 (el desplazamiento de la Página de Cita a 320 px con el texto al 200 %, de la 26.9). Rechazados: 14. `followup_review_recommended: true` (puntuación 3 × 1 + 1 × 7 = 10 ≥ 5).

**Verificación.**
- `npx vitest run tests/unit/publicable-y-alcanzable.test.ts` — 37/37; `tests/unit/superficies.test.ts` — 107/107; `tests/unit/medicion.test.ts` — 532/532.
- `npx astro check` — 0 errores, 0 avisos, 8 sugerencias previas.
- `npx playwright test tests/e2e/cabecera.spec.ts tests/e2e/pagina-de-cita.spec.ts tests/e2e/receptor.spec.ts tests/e2e/pagina-404.spec.ts tests/e2e/marca.spec.ts tests/e2e/portada.spec.ts --project=movil --project=escritorio` (construye y sirve con `tests/servidor.mjs`) — 204 verdes, 70 omitidas por diseño (perfil único de `receptor`, `test.skip` por proyecto), 0 rojas; incluye los cuatro clics de cabecera.
- `npx playwright test tests/e2e/accesibilidad.spec.ts --project=movil --project=escritorio` — 138/138 (axe WCAG 2.2 AA en toda superficie; la primera Cita de toda página 1 de Obra sigue en la primera pantalla de 360 × 640: el Block If no se dispara).
- `npx playwright test tests/e2e/seo.spec.ts --project=movil --project=escritorio --workers=1` — 20/20, con el recorrido de alcance del sitemap entero.

**Riesgos residuales.** La Página de Cita se desplaza 20 px a 320 px con el texto al 200 % por su contenido (diferido a la 26.9). Con el texto ampliado entre 600 px y el ancho en que la fila cabe, la navegación puede partirse bajo la marca sin retranqueo (8 px de desfase; el contrato fija «sin retranqueo» desde 600 px). `seo.spec.ts` sigue necesitando `--workers=1` para los recorridos del sitemap. `sprint-status.yaml` no se ha tocado (lo lleva el orquestador).

### Segunda pasada de revisión con las capas externas (2026-10-28)

**Resumen.** Se triaron los hallazgos de las cinco capas (blind-hunter, edge-case-hunter, verification-gap —sin hallazgos—, intent-alignment y ac-auditor): 0 intent_gap, 0 bad_spec, 11 parches (todos low), 0 diferidos y 17 rechazados (razones en el Review Triage Log). Sin vuelta atrás por el spec.

**Ficheros de esta pasada.**
- `src/components/Armazon.astro` — el retranqueo de la navegación sigue desde 600 px (si la fila se parte, «Autores» se alinea con la marca); docblock: «toda Página de Autor y toda página 1 de Obra».
- `tests/e2e/cabecera.spec.ts` — sonda de `--zona-de-toque`; zonas de toque, relleno, puntos y `nowrap` también a 600 y 1280 px; prueba nueva a 600 px con zoom 2; ningún punto abre fila al 200 %; la Cita en la primera pantalla a 320 y a 360 px; docblock fiel.
- `tests/unit/publicable-y-alcanzable.test.ts` — rótulos de la cabecera en toda página de `dist/`; `cabeceraDe` con fallo que nombra la ruta; los Directorios deben tener enlaces en el grafo; ruta repetida en `dist/` lanza.
- `tests/e2e/pagina-de-cita.spec.ts` — `not.toHaveAttribute('target')`.
- Este spec — Verificación con `--workers=1` para `seo.spec.ts`; la primera «Revisión» marcada como sustituida.

**Revisión.** Parches aplicados: 11 (high 0, medium 0, low 11). Diferidos: 0. Rechazados: 17. `followup_review_recommended: true` (puntuación 3 × 0 + 1 × 11 = 11 ≥ 5).

**Verificación.**
- `npx vitest run tests/unit/publicable-y-alcanzable.test.ts` — 37/37; `tests/unit/superficies.test.ts` — 107/107; `tests/unit/medicion.test.ts` — 532/532.
- `npx astro check` — 0 errores, 0 avisos, 8 sugerencias previas.
- `npx playwright test tests/e2e/cabecera.spec.ts tests/e2e/pagina-de-cita.spec.ts tests/e2e/receptor.spec.ts tests/e2e/pagina-404.spec.ts tests/e2e/marca.spec.ts tests/e2e/portada.spec.ts --project=movil --project=escritorio` — 208 verdes, 70 omitidas por diseño, 0 rojas.
- La prueba nueva de 600 px con zoom 2 falla con el `margin-inline-start: 0` anterior (comprobado reponiéndolo) y pasa con el arreglo.
- `npx playwright test tests/e2e/accesibilidad.spec.ts tests/e2e/cabecera.spec.ts --project=movil --project=escritorio` — 162/162 (axe en toda superficie; el Block If no se dispara).
- `npx playwright test tests/e2e/seo.spec.ts --project=movil --project=escritorio --workers=1` — 20/20.

**Riesgos residuales.** La Página de Cita se desplaza 20 px a 320 px con el texto al 200 % por su contenido (diferido a la 26.9). Una fila partida puede acabar en «·» (elegido por el contrato). `seo.spec.ts` sigue necesitando `--workers=1`. `sprint-status.yaml` no se ha tocado (lo lleva el orquestador).
