---
title: 'Historia 27.8 — Buscar en esta obra, en un Autor o en un tema'
type: 'feature'
created: '2026-10-29'
status: 'draft'
baseline_revision: 'ca87245df10c2143b5b33957841d454196f456e9'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-27-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Quien lee la página 1 de una Obra, de un Autor o de un Tema solo puede encontrar una Cita concreta pasando sus páginas (el Tema mayor tiene 12); y el campo del 404 se envía solo con Intro, sin control visible, con lo tecleado en la serif (FR-4, FR-6, FR-7, FR-51, UX-DR58, UX-DR94, UX-DR104–UX-DR109).

**Approach:** Un componente nuevo, «Buscar en…»: formulario GET sin guion a `/buscar/` con el Campo de búsqueda de la 26.6 (etiqueta = rótulo, sin ejemplo), el botón secundario «Buscar» y el filtro en campos ocultos, solo en la página 1 de Obra, Autor y Tema, justo encima del listado. El Campo gana el botón como opción, y el 404 pasa a usar ese Campo con botón.

## Boundaries & Constraints

**Always:**
- Rótulos literales, constantes en `src/lib/busqueda.ts` (sin importaciones nuevas): «Buscar en esta obra», «Buscar en {nombre del Autor}» (función), «Buscar en este tema» (en minúscula, EXPERIENCE.md § Voice and Tone); botón «Buscar».
- Formulario: `<form role="search" method="get" action={rutaDeLaBusqueda()}>` con `data-pagefind-ignore`, sin `target`; dentro, el Campo con `nombre="q"`, **sin** `ejemplo` ni `consulta`, `enterkeyhint="search"`, y debajo `<button type="submit">Buscar</button>`; después del campo, los ocultos en el orden y con los nombres de `PARAMETROS_DE_LA_BUSQUEDA`: Obra → `autor` = `autor.slug` y `obra` = `obra.nombre` (nombre de la ficha, nunca el título); Autor → `autor` = `autor.slug`; Tema → `tema` = `tema.slug`. Un `id` de campo único en la página.
- Presentación (DESIGN.md § Campo de búsqueda y § Buscar en…): dentro de `--medida-prosa`; etiqueta y campo los del Campo (lo tecleado en `--sans` a `--cuerpo-lg`); botón secundario siena a su ancho a 2 × `--unidad` bajo el campo, como `.quitar` de `Busqueda.astro` (UX-DR9: texto `--siena`, filete `--grosor-filete` siena, `--radio`, alto `--zona-de-toque`, `padding-inline` 3 × `--unidad`, `--sans` `--cuerpo-md`, hover a `--siena`/`--sobre-siena`, sin `nowrap`). Solo tokens.
- Colocación, solo en la página 1 (`currentPage === 1`), también en Obras `noindex` o con la familia congelada: Obra, 4 × `--unidad` bajo `p.salto` y `ul.listado` 4 × más abajo; Autor, 2 × bajo `h2.rotulo` «Citas documentadas» y `ul.listado` 3 × más abajo, sin tocar la Ficha; Tema, 4 × bajo el `h1` y `ul.listado` 4 × más abajo. Las páginas 2+ conservan sus distancias de hoy (Obra 4 × bajo `p.de`, Autor 2 × bajo el rótulo, Tema 4 × bajo el `h1`).
- Sin zona: ni el formulario ni sus antepasados llevan `data-zona` ni `data-sin-zona`; `EXENCIONES_DE_ZONA` no cambia (su docblock ya nombra «Buscar en…»).
- El 404: `<form class="formulario" role="search" action={rutaDeLaBusqueda()} method="get">` con `CampoDeBusqueda` (`id="consulta"`, `ETIQUETA_DE_LA_BUSQUEDA`, `nombre="q"`, `ejemplo={TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA}`, con botón); se quitan sus reglas propias de `label`/`input` (serif, `--titular-sm`); la Cita del Día, los Temas y la invitación no cambian.

**Block If:**
- A 360 × 640 sobre lo construido, con el formulario, la primera Cita de alguna página 1 de Obra o de Tema deja de empezar en la primera pantalla (fin de su primera línea > 640 px): compactar es decisión de UX. HALT con las medidas.
- Cumplir algo exige un guion (en línea o empaquetado) en la Página de Obra, Autor, Tema o el 404, o tocar `Armazon.astro`.

**Never:**
- No editar `_bmad-output/planning-artifacts/` ni `_bmad-output/specs/`; la Historia 4.3 no se enmienda.
- Ni ruta, ni página, ni superficie nueva; nada en `src/lib/superficies.ts`, `src/lib/ingreso.ts`, `src/lib/guiones.ts` ni `src/lib/medicion.ts`.
- No tocar la isla de `/buscar/` (`Busqueda.astro`): la llegada con filtros es de la 27.4.
- Sin texto de ejemplo en «Buscar en…»; sin botón en `/buscar/` ni en el filtro de los Directorios.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Obra, vacío | «Buscar» sin texto en la p. 1 de una Obra de N Citas | `/buscar/?q=&autor={slug}&obra={ficha}`; Autor y Obra elegidos, «Quitar los filtros» visible, recuento `fraseDelRecuento` = «N citas de {Autor} en {título}.» con N el del listado | — |
| Autor / Tema, vacío | «Buscar» en la p. 1 | `?q=&autor=` o `?q=&tema=`; recuento «N citas de {Autor}.» / el del Tema, N el de su listado | — |
| Con texto e Intro | «tiempo» + Intro (o tecla de buscar) | Misma pestaña, `q=tiempo`; el campo de `/buscar/` dice «tiempo» | — |
| Atrás | tras llegar a `/buscar/` | `page.goBack()` vuelve a la página de origen | — |
| Página 2+ | `/autor/x/2/`, `/tema/x/2/`, `/obra/a/b/2/` | Sin el formulario, distancias de hoy | — |
| Obra `noindex` o congelada | p. 1 | Lleva el formulario igual | — |
| 404 | ruta inexistente | Campo con «Por ejemplo: no hay camino», lo tecleado en Inter, botón «Buscar»; enviar → `/buscar/?q=…` | — |

</intent-contract>

## Code Map

- `src/components/CampoDeBusqueda.astro` -- el Campo de la 26.6 (`Props { id, etiqueta, nombre?, ejemplo?, consulta? }`); su docblock ya anuncia el botón de la 27/28. Añadir `boton?: boolean` (botón submit debajo + `enterkeyhint="search"`).
- `src/components/Busqueda.astro:380–410` -- `.quitar, .mas button`: el tratamiento del secundario siena a replicar (patrón del repo: cada componente declara su botón, p. ej. `src/islands/CopiarCita.astro:153`). No se toca.
- `src/lib/busqueda.ts:29–35` -- `ETIQUETA_DE_LA_BUSQUEDA`, `TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA`; l. 287 `PARAMETROS_DE_LA_BUSQUEDA`. Sin importaciones nuevas (lo fija `tests/unit/busqueda-con-filtros.test.ts:116`).
- `src/lib/superficies.ts:440` -- `rutaDeLaBusqueda()`.
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- `primera`, `p.salto` (siempre en la p. 1: `conDondeLeer`), `ul.listado` con `margin-top` 4 ×; `obra.nombre`, `autor.slug`.
- `src/pages/autor/[slug]/[...page].astro` -- `primera`, `h2.rotulo` «Citas documentadas», `.listado` 2 ×.
- `src/pages/tema/[slug]/[...page].astro` -- sin `primera` todavía (`pagina.currentPage`), `h1`, `.listado` 4 ×.
- `src/pages/404.astro` -- formulario a mano (`#consulta`, serif `--titular-sm`) a sustituir; `.formulario` 4 × y `--medida-prosa` se conservan.
- `tests/unit/ayuda/construir.ts` -- `construirConCorpus`, `paginaConstruida`, `citaValida`, `AUTOR_VALIDO`, `TEMA_VALIDO`, `limpiar`, `RAIZ`; `tests/unit/obra-pagina.test.ts:1–60, 1182–1205` -- corpus con Obra paginada/`noindex`/indexable y la copia con `CONGELACION_DE_OBRAS` parcheada en `umbrales.ts`; `tests/unit/ayuda/guion.ts:48,217` -- `guionesEnLinea`, `guionesExternosDe`; `tools/lib/html.ts:145` -- `recorrerElementos` (antepasados).
- `tests/unit/espinas-de-ux.test.ts:331` -- el 404 sin isla ni región de estado (debe seguir en verde).
- `tests/e2e/accesibilidad.spec.ts` -- `SUPERFICIES` (l. 177, barrido axe l. 320 y reflujo 26.9 ~l. 960) ya incluye muestras de `/autor/`, `/tema/`, `/obra/` y `/404`; 24.7: «el listado a 32 px del salto» (l. ~2143, cambia), «primera Cita en la primera pantalla de toda página 1» (l. 2095), `hueco`/`cerca`; foco del campo del 404 (l. 590).
- `tests/e2e/busqueda.spec.ts` -- `conjunto()` y `filtrosDeLaBusqueda` para lo esperado (l. ~1380–1430), `fraseDelRecuento`, `[data-estado]`, `[data-quitar]`, `#filtro-de-autor/-obra/-tema`. `tests/e2e/receptor.spec.ts:1581` usa `form[role="search"] input[name="q"]` del 404 (debe seguir en verde). `tests/e2e/pagina-404.spec.ts:17` (`input[type="search"]` único).

## Tasks & Acceptance

**Execution:**
- `src/lib/busqueda.ts` -- exportar `ROTULO_BUSCAR_EN_ESTA_OBRA`, `rotuloBuscarEnAutor(nombre)`, `ROTULO_BUSCAR_EN_ESTE_TEMA` y `BOTON_DE_BUSCAR`, con docblock (27.8, UX-DR94) -- un dueño de los textos.
- `src/components/CampoDeBusqueda.astro` -- `boton?: boolean`: `enterkeyhint="search"` en el `input` y `<button type="submit" class="buscar">{BOTON_DE_BUSCAR}</button>` tras él, con su regla de secundario siena a 2 × `--unidad`; docblock -- el botón de la decisión de Héctor del 18/10.
- `src/components/BuscarEn.astro` (nuevo) -- `Props { id: string; rotulo: string; filtros: { autor?: string; obra?: string; tema?: string } }`; `form.buscar-en` según Always (Campo con botón, ocultos tras él en orden de `PARAMETROS_DE_LA_BUSQUEDA`, `data-pagefind-ignore`, `max-width: var(--medida-prosa)`), sin `<script>` ni `<style>` que dependa de la página; docblock (sin zona, sin guion, GET) -- el componente único.
- `src/pages/obra/[autor]/[slug]/[...page].astro`, `src/pages/autor/[slug]/[...page].astro`, `src/pages/tema/[slug]/[...page].astro` -- pintar `BuscarEn` solo en la página 1 donde dice Always, con las distancias de la página 1 y sin cambiar las de las 2+; docblocks -- colocación.
- `src/pages/404.astro` -- el Campo con botón según Always; quitar las reglas de `label`/`input`; docblock -- UX-DR108.
- `tests/unit/buscar-en.test.ts` (nuevo) -- una construcción con Séneca, 55 Citas (Obra de 51 que pagina y no se indexa, Obra de 3 indexable, Obra de 1) y todas con un Tema de `TEMA_VALIDO` (pagina), más una segunda con `CONGELACION_DE_OBRAS` parcheada como en `obra-pagina.test.ts:1182`: en `dist/`, la p. 1 de Autor, Tema y de cada Obra (también `noindex` y congelada) lleva exactamente un `form[role="search"][method="get"][action="/buscar/"]`, con `data-pagefind-ignore`, sin `target`, su etiqueta = rótulo y `for` = `id` del campo `name="q"` sin `placeholder` y con `enterkeyhint="search"`, botón `type="submit"` «Buscar», y los ocultos exactos (nombres, valores, orden) de cada familia; ningún antepasado del formulario con `data-zona`/`data-sin-zona`; las p. 2 no lo llevan; las p. 1 y 2 de cada familia llevan los mismos `guionesEnLinea` y `guionesExternosDe`; `/404` lleva el Campo con «Por ejemplo: no hay camino» y el botón, y sigue sin guion propio -- Vitest sobre `dist/`.
- `tests/e2e/busqueda.spec.ts` -- describe «Historia 27.8» sobre el Corpus real (lo esperado de `conjunto()`/`filtrosDeLaBusqueda`, como la 27.3): desde la p. 1 de una Obra indexable, una `noindex`, un Autor y un Tema, «Buscar» vacío → dirección con los ocultos, selectores elegidos (Autor y Obra en la Obra), «Quitar los filtros» visible, recuento `fraseDelRecuento` con N = Citas del listado de origen; con texto e Intro → misma pestaña, `[data-consulta]` con el texto; `goBack` → la página de origen; el 404 con el botón → `/buscar/?q=…` -- superficie real.
- `tests/e2e/accesibilidad.spec.ts` -- guarda: las muestras `/autor/`, `/tema/` y `/obra/` de `SUPERFICIES` son páginas 1 con el formulario y `/404` lleva el botón (si la derivación no da páginas 1, añadirlas); 24.7: salto → formulario 32 px y formulario → listado 32 px (p. 1), 2 sin cambios; Autor: rótulo → formulario 16, formulario → listado 24; Tema: `h1` → formulario 32, formulario → listado 32; campo → botón 16; estilo calculado del texto del campo (`--sans`, `--cuerpo-lg`) y del botón (siena, filete, 44 px) en los tres y en el 404; nueva «a 360 × 640, la primera Cita sigue empezando en la primera pantalla de toda página 1 de Tema» (como la de Obra, l. 2095), y las dos anotan la peor medida en `test.info().annotations` -- UX-DR94, NFR-8, NFR-9.
- `_bmad-output/implementation-artifacts/spec-27-8-buscar-en-esta-obra-en-un-autor-o-en-un-tema.md` -- sección `## Medidas` con fecha: peor fin de la primera línea de la primera Cita a 360 × 640 en las páginas 1 de Obra y de Tema, con el formulario (y su ruta) -- AC «la medida se anota».

**Acceptance Criteria:**
- Given el sitio construido, when se lee `dist/`, then solo la página 1 de cada Obra (indexable, `noindex` o congelada), Autor y Tema lleva «Buscar en…», ninguna ruta nueva aparece en el sitemap ni en Pagefind, y ninguna de esas páginas carga un guion más que su página 2.
- Given Playwright local sobre la rama, when corre el barrido WCAG 2.2 AA y el reflujo a 320 px de la 26.9, then incluye la página 1 de una Obra, de un Autor y de un Tema con el formulario y el 404 con su botón, y pasan.
- Given la página con «Buscar en…», when se lee su nombre accesible, then hay dos «Buscar» (enlace de la cabecera y botón) y se acepta.

## Spec Change Log

- **2026-10-30 — la Obra lleva el formulario bajo el listado (decisión de Héctor).** El Block If de la primera
  pantalla saltó en 6 de 517 páginas 1 de Obra (`## Medidas`). Héctor decidió moverlo: en la Obra, «Buscar en esta
  obra» va tras el listado y su paginación y antes de «Compartir en», a 5 × `--unidad` de la paginación —o de la
  última tarjeta— [ASSUMPTION de la UX], y el listado vuelve a 4 × bajo `p.salto`, como sin formulario. El Autor y
  el Tema no cambian. Fuentes: UX v8.4 (`e12e6417fd`) y `sprint-change-proposal-2026-10-30.md` (`bbcc43b7d0`), que
  enmiendan UX-DR94, UX-DR95 y los criterios de la 27.8 en `epics.md`. Hay que volver a planificar la colocación de la
  Obra en Always, en el Code Map y en las pruebas de distancias de la 24.7 (salto → listado 32 px; listado →
  formulario 40 px), y conservar la medida de la primera pantalla en Obra y en Tema. El trabajo hecho sigue en
  `27-8-buscar-en-wip.patch`.

## Review Triage Log

## Design Notes

- **Por qué el botón vive en el Campo:** el docblock de la 26.6 ya lo reserva («la 27 y la 28 le añaden… el botón “Buscar” y el `name`»): el 404, «Buscar en…» y la portada de la 28 comparten un solo marcado de campo + botón; el formulario lo pone quien lo usa.
- **Por qué los ocultos van tras el campo:** el GET compone la dirección en orden de documento, y así sale `?q=&autor=&obra=` en el orden de `direccionDeLaBusqueda`. La isla lee por nombre y no reescribe una llegada ya resuelta (`q=` vacío = sin texto).
- **Por qué `data-pagefind-ignore`:** «Buscar en José Martí Buscar» no es texto buscable de la página 1 indexable; mismo criterio que el salto de la 24.7.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run tests/unit/buscar-en.test.ts`, `tests/unit/espinas-de-ux.test.ts`, `tests/unit/obra-pagina.test.ts`, `tests/unit/busqueda-con-filtros.test.ts` -- expected: verdes.
- `npx playwright test tests/e2e/busqueda.spec.ts tests/e2e/accesibilidad.spec.ts tests/e2e/pagina-404.spec.ts tests/e2e/pagina-de-autor.spec.ts tests/e2e/pagina-de-tema.spec.ts --project=escritorio --project=movil` (largo: `correr.sh`/`esperar.pl`) -- expected: verde sobre el sitio construido por `tests/servidor.mjs`; si la primera pantalla falla, Block If.
- `npx playwright test tests/e2e/receptor.spec.ts -g "404" --project=escritorio` -- expected: verde.

## Medidas

**2026-10-29**, sobre lo construido en la rama `v8/epica-27` (Corpus del día, 517 páginas 1 de Obra), con el
formulario puesto y a 360 × 640 (proyectos `escritorio` y `movil`, mismas cifras): fin de la primera línea
de la primera Cita del listado.

- **Página 1 de Tema:** la peor, `/tema/el-amor/`, **430,74 px**. Todas en la primera pantalla.
- **Página 1 de Obra:** **6 de 517 pasan de 640 px** —Block If—:
  - `/obra/jose-victorino-lastarria/discurso-de-incorporacion-de-don-jose-victorino-lastarria-a-una-sociedad-de-literatura-de-santiago-en-la-sesion-del-tres-de-mayo-de-1842/` — 722,24 px
  - `/obra/mariano-jose-de-larra/primera-representacion-del-drama-episodico-nuevo-original-en-tres-actos-titulado-don-quijote-de-la-mancha-en-sierra-morena-escrito-por-don-ventura-de-la-vega/` — 722,24 px
  - `/obra/mariano-jose-de-larra/buenas-noches-segunda-carta-de-figaro-a-su-corresponsal-en-paris-acerca-de-la-disolucion-de-las-cortes-y-de-otras-varias-cosas-del-dia/` — 689,74 px
  - `/obra/jaime-balmes/el-protestantismo-comparado-con-el-catolicismo-en-sus-relaciones-con-la-civilizacion-europea-vols-1-2/` — 657,24 px
  - `/obra/mariano-jose-de-larra/carta-de-figaro-a-don-pedro-pascual-de-oliver-gobernador-civil-interino-de-la-provincia-de-zamora/` — 657,24 px
  - `/obra/francois-de-salignac-de-la-mothe-fenelon/las-aventuras-de-telemaco-seguidas-de-las-de-aristonoo/` — 640,24 px
  - La peor de las que caben: `/obra/agustin-de-arguelles/propuesta-y-defensa-de-la-abolicion-de-la-tortura-y-el-comercio-de-esclavos/`, 624,74 px.
- El formulario, a las distancias de `DESIGN.md` (salto → formulario 32, etiqueta + 8 + campo 44 + 16 + botón 44,
  formulario → listado 32), baja el listado unos 164 px en la página 1 de Obra; las seis son las de título más largo,
  que parte en cuatro o cinco líneas a 360 px. Compactar (quitar el botón, acercar las distancias, mover el
  formulario) es decisión de UX: no se ha tocado nada para que pasen.

## Auto Run Result

Status: blocked
Blocking condition: Block If de la intención — a 360 × 640, con «Buscar en esta obra», la primera Cita de 6 de las 517 páginas 1 de Obra deja de empezar en la primera pantalla (peor: 722,24 px; medidas en `## Medidas`). Compactar es decisión de UX (Héctor, `bmad-ux`).

Implementado y sin commitear en el árbol de trabajo: `src/lib/busqueda.ts` (rótulos y botón), `src/components/CampoDeBusqueda.astro` (`boton`), `src/components/BuscarEn.astro` (nuevo), las páginas de Obra, Autor y Tema (página 1), `src/pages/404.astro` (Campo con botón), `tests/unit/buscar-en.test.ts` (nuevo), `tests/unit/obra-pagina.test.ts` (la 24.1 admite el formulario entre la Cabecera y el listado de la página 1), `tests/e2e/busqueda.spec.ts` y `tests/e2e/accesibilidad.spec.ts` (describe 27.8, distancias de la 24.7, primera pantalla del Tema y anotación de la peor medida).

Verificación: `npx astro check` 0 errores; `npx vitest run` de `buscar-en`, `espinas-de-ux`, `obra-pagina`, `busqueda-con-filtros` y `superficies` en verde (260 pruebas; `obra-pagina` se repitió, 66, tras ajustar su aserción de la 24.1); Playwright de `busqueda`, `accesibilidad`, `pagina-404`, `pagina-de-autor` y `pagina-de-tema` en `escritorio` y `movil`: 532 pasan, 12 se saltan, 2 fallan —la primera pantalla de la página 1 de Obra de la 24.7, en los dos proyectos, que es el Block If—; `receptor.spec.ts -g 404` en verde (4).
