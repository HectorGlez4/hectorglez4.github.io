---
title: 'Historia 24.7 — La Obra salta a dónde leerla'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_revision: '4fc409fec2213297e5df5cabc12e89fe0bd5b49a'
review_loop_iteration: 0
followup_review_recommended: true
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

### 2026-10-25 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las capas de revisión son externas (bucle v8-ralph) y en esta pasada no traen hallazgos: la revisión independiente viene después.

### 2026-10-25 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 9 (high 0, medium 3, low 6)
- defer: 0
- reject: 15
- addressed_findings:
  - `[medium]` `[patch]` La Nota (4 × / 3 ×) no se medía nunca en el navegador: la prueba se saltaba porque ninguna Obra del Corpus trae nota (blind-hunter, ac-auditor, intent-alignment). Ahora, si ninguna la trae, se pone en una página 1 servida con el marcado que emite la plantilla (`p.nota-de-la-ficha` con `data-pagefind-ignore` y el ámbito de la página, copiado de la Cabecera) y se miden 32 px desde «Dónde leer», filete de 1 px `solid` y 24 px de relleno. Ya no se salta.
  - `[medium]` `[patch]` No se medía dónde aterriza el salto, solo el `scroll-margin-top` calculado (blind-hunter, intent-alignment). Prueba nueva: con Intro, con el puntero y abriendo la dirección con `#donde-leer-esta-obra`, el `h2` queda a 16 ± 1 px del borde, en una ventana de 320 px de alto para que la página dé de sí.
  - `[medium]` `[patch]` La primera pantalla y la zona del salto no miraban la Cabecera más alta (edge-case-hunter, ac-auditor: Lastarria sale más alta que el título más largo). `obrasDelPie` deriva del `dist/` las cinco de título más largo y las cinco de «de {Autor} · {año}» más largo, y las dos pruebas las recorren todas.
  - `[low]` `[patch]` La activación con puntero o toque no se probaba (blind-hunter, edge-case-hunter). Prueba nueva: clic (escritorio) o toque (móvil) deja el foco en el `h2` sin `:focus-visible` ni contorno, y un clic sobre el propio `h2` tampoco pinta el anillo.
  - `[low]` `[patch]` `const PIE = obrasDelPie()` al cargar el fichero tumbaba el barrido entero si el Corpus del día dejaba de traer alguna cara (blind-hunter). Ahora es `PIE()`, memorizada y derivada al pedirla: falla, nombrando la cara, solo la prueba de la 24.7 que la pide.
  - `[low]` `[patch]` Los 3 × de «de {Autor}», el siena y el subrayado se juzgaban solo como cadenas de la hoja (ac-auditor, intent-alignment, blind-hunter). En el navegador: `p.de` → `p.salto` = 24 ± 0,5 px a 360 y 320, el color calculado es el de `--siena` resuelto y `text-decoration-line` es `underline`, iguales bajo el puntero.
  - `[low]` `[patch]` La guardia de CI del subrayado era parcial y `reglasDe` saca las reglas de un `@media` como incondicionales (blind-hunter). La guardia exige ahora que los únicos selectores que tocan `.salto` en la hoja emitida sean `.salto` y `.salto a` —cualquier anulación, también la de un `@media (hover: hover)`, la rompe—, y el comentario de `reglasDe` dice su límite.
  - `[low]` `[patch]` El texto visible «Dónde leer esta obra» no tenía dueño: escrito en el salto y en el rótulo (blind-hunter). `ROTULO_DE_DONDE_LEER` en `src/lib/obras.ts`, junto a `ANCLA_DE_DONDE_LEER`, lo usan los dos; `comprobarSaltos` exige en cada página 1 que el nombre del enlace (sin la flecha oculta) sea el texto del `h2` de destino. Salida byte a byte igual.
  - `[low]` `[patch]` El comentario «detrás de hasta 50 Tarjetas» repetía `CITAS_POR_PAGINA` (blind-hunter): ahora nombra la constante.

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

Status: done
Blocking condition: ninguna.

**Qué se construyó.** La Cabecera de la página 1 de toda Obra lleva, en su propia línea tras `p.de`, el enlace «Dónde leer esta obra ↓» a `#donde-leer-esta-obra` (sin `target`, sin `rel`, sin zona propia ni heredada, fuera de Pagefind, con la flecha `aria-hidden`); su destino, el `h2` de `DondeLeer`, lleva `tabindex="-1"` y `scroll-margin-top` de 2 × `--unidad`. Un solo booleano de la página (`conDondeLeer`) decide el salto y la sección; las 2+ no llevan ni uno ni otra. El bloque no se mueve. Sin guion, sin regla de foco propia, sin exención nueva. El `id` y el texto los ponen dos constantes de `src/lib/obras.ts`, así que el salto se llama siempre como el encabezado al que lleva.

**Ficheros.**
- `src/lib/obras.ts` — `ANCLA_DE_DONDE_LEER`, único dueño del `id`, y `ROTULO_DE_DONDE_LEER`, único dueño del texto del rótulo y del salto (junto a `dondeLeer`).
- `src/components/Rotulo.astro` — prop `destino` → `tabindex="-1"`; regla `.rotulo[tabindex='-1']` con `scroll-margin-top`. Sin `destino`, el `h2` sale como antes.
- `src/components/DondeLeer.astro` — `id`, `aria-labelledby` y texto del rótulo desde las constantes; `destino` en su rótulo.
- `src/pages/obra/[autor]/[slug]/[...page].astro` — `conDondeLeer`; el `p.salto` en la Cabecera, con su texto de `ROTULO_DE_DONDE_LEER`; su hoja (3 ×, `--cuerpo-md`, 1,6; el `a` en `inline-flex` de `--zona-de-toque`, siena, subrayado siempre).
- `tests/unit/obra-pagina.test.ts` — `reglasDe`/`declaraciones` a nivel de módulo (con su límite ante `@media` escrito); `comprobarSaltos` sobre todo `dist/obra/**` de las construcciones 22.4, 22.6 y 22.8, que exige además que el nombre del salto sea el texto del `h2`; marcado exacto; `h2` «Temas» y de la Lista de Obras sin `tabindex`; guardia de la hoja emitida (solo `.salto` y `.salto a` tocan el salto, destino, listado a 4 ×, y el pie con nota: 5 ×, 4 ×, 2 ×, 1 ×, nota 4 × / 3 × con filete).
- `tests/unit/ediciones-en-venta.test.ts` — las dos construcciones de `corpusConstruido(true)` memorizadas (`construida('encendida' | 'apagada')`); `describe` 24.7: salto y `h2` iguales byte a byte en `PAGINA_1`, `CARTAS_1` e `IRA_1`; encendida = apagada + `div[data-ingreso]` en `PAGINA_1` y `CARTAS_1`; iguales sin quitar nada en `IRA_1` y `PAGINA_2`.
- `tests/e2e/accesibilidad.spec.ts` — `PIE()`, derivada del `dist/` al pedirla (con Paginación y Temas; sin Paginación, con Temas y edición cotejada; con nota si la hay; y las diez Cabeceras candidatas a la más alta), y `describe` 24.7: foco tras Intro con `:focus-visible`, anillo de 2 px siena separado 2 px y `scroll-margin-top` 16 px; con puntero o toque, foco en el `h2` sin anillo (y un clic en el `h2`, tampoco); llegada a 16 ± 1 px del borde con Intro, puntero y dirección con el fragmento; siena y subrayado, también bajo el puntero; a 360 y 320, el salto a 24 px de `p.de`, zona de 44 px y ≥ 7,5 px de «de {Autor}»; primera Cita en 360 × 640 en las Cabeceras candidatas; listado a 32 px del salto (y de `p.de` en la 2); pie 40 / 32 / 16 / 8; la Nota, medida en el navegador —en la Obra que la traiga o, si ninguna, puesta en una página servida con el marcado de la plantilla—.

**Revisión.** Primera pasada con las cinco capas externas (blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor): 9 parches aplicados (0 high, 3 medium, 6 low), 0 aplazados, 15 rechazados, ni `intent_gap` ni `bad_spec`. El detalle, en el Review Triage Log. `followup_review_recommended: true` (parcheados: 0 high, 3 medium, 6 low; puntuación 3 × 3 + 6 = 15 ≥ 5).

**Verificación.** Desde el worktree, tras los parches:
- `npm run check` — 0 errores, 0 avisos, 8 pistas previas.
- `npm test` — 132 de 133 ficheros y 6112 de 6115 pruebas en verde; las 3 rojas eran de la comprobación nueva de `comprobarSaltos` (su expresión no quitaba el `span` de la flecha, que lleva el ámbito de Astro). Corregida la prueba, `npx vitest run tests/unit/obra-pagina.test.ts` — 64/64 (`FINISHED EXIT=0`). Ningún otro fichero cambió después.
- `npx playwright test tests/e2e/accesibilidad.spec.ts` (móvil y escritorio, sitio construido) — 110 pasan, 0 saltadas.
- `npx playwright test tests/e2e/pagina-de-cita.spec.ts --grep "Cabecera de Obra"` — 2/2; `npx playwright test tests/e2e/ingreso-accesible.spec.ts --project=escritorio` — 12/12.
- Ningún Block If se disparó. Servidores parados y puertos 4321, 4399, 4400, 4402 y 8787 libres al terminar.

**Riesgos residuales.** La Nota se mide sobre el marcado que la prueba pone cuando ninguna Obra del Corpus trae nota: si la plantilla cambiara su marcado, la prueba de la 22.6 que fija ese marcado es la que avisa. El salto se mide solo en Chromium (los dos proyectos de Playwright); Safari y Firefox no se han probado. La primera pantalla se comprueba en las diez Cabeceras candidatas a la más alta, no en todas las páginas 1.
