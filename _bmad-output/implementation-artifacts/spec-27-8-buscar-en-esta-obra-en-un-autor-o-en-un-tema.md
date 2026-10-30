---
title: 'Historia 27.8 — Buscar en esta obra, en un Autor o en un tema'
type: 'feature'
created: '2026-10-29'
status: 'done'
baseline_revision: '3008994d7b1f6337260d7fc62d7295d8edb8046e'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-27-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Al fusionar la Épica 25 con la 27, «Compartir en» (25.6) se coloca tras «Buscar en esta obra» con su propio 5 × `--unidad`, y el pie de la 24.7 pasa a medir formulario → «Compartir en» → Temas.
    evidence: |-
      UX-DR95 (UX v8.4) pone «Compartir en» 5 × bajo el formulario y Temas 5 × más abajo; la 25.6 vive en `v8/epica-25` y no en esta rama, así que ninguna prueba de aquí lo mide. Hoy la obligación solo constaba en «Riesgos» del Auto Run Result.
    location: >-
      src/pages/obra/[autor]/[slug]/[...page].astro (pie de la página 1); tests/e2e/accesibilidad.spec.ts (24.7 «el pie»)
    severity: low
  - summary: >-
      `busqueda.spec.ts:840` (Historia 27.1, proyecto `movil`) cae con «socket hang up» del servidor local en las pasadas largas y pasa aislada; pondría en rojo el `test:e2e` entero que pide la 27.9.
    evidence: |-
      Falló igual en la pasada de implementación de la 27.8 y en la del auditor de criterios (log `audit-27-8.log`), siempre en `movil` y siempre por el servidor de `tests/servidor.mjs`, no por una aserción; no es una prueba de la 27.8.
    location: >-
      tests/e2e/busqueda.spec.ts:840; tests/servidor.mjs
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Quien lee la página 1 de una Obra, de un Autor o de un Tema solo puede encontrar una Cita concreta pasando sus páginas (el Tema mayor tiene 12); y el campo del 404 se envía solo con Intro, sin control visible, con lo tecleado en la serif (FR-4, FR-6, FR-7, FR-51, UX-DR58, UX-DR94, UX-DR95, UX-DR104–UX-DR109).

**Approach:** Un componente nuevo, «Buscar en…»: formulario GET sin guion a `/buscar/` con el Campo de búsqueda de la 26.6 (etiqueta = rótulo, sin ejemplo), el botón secundario «Buscar» y el filtro en campos ocultos, solo en la página 1 de Obra, Autor y Tema: en el Autor y en el Tema justo encima del listado, y en la Obra justo debajo de su listado y su paginación (UX v8.4, decisión de Héctor del 2026-10-30). El Campo gana el botón como opción, y el 404 pasa a usar ese Campo con botón.

## Boundaries & Constraints

**Always:**
- Rótulos literales, constantes en `src/lib/busqueda.ts` (sin importaciones nuevas): «Buscar en esta obra», «Buscar en {nombre del Autor}» (función), «Buscar en este tema» (en minúscula, EXPERIENCE.md § Voice and Tone); botón «Buscar».
- Formulario: `<form role="search" method="get" action={rutaDeLaBusqueda()}>` con `data-pagefind-ignore`, sin `target`; dentro, el Campo con `nombre="q"`, **sin** `ejemplo` ni `consulta`, `enterkeyhint="search"`, y debajo `<button type="submit">Buscar</button>`; después del campo, los ocultos en el orden y con los nombres de `PARAMETROS_DE_LA_BUSQUEDA`: Obra → `autor` = `autor.slug` y `obra` = `obra.nombre` (nombre de la ficha, nunca el título); Autor → `autor` = `autor.slug`; Tema → `tema` = `tema.slug`. Un `id` de campo único en la página.
- Presentación (DESIGN.md § Campo de búsqueda y § Buscar en…): dentro de `--medida-prosa`; etiqueta y campo los del Campo (lo tecleado en `--sans` a `--cuerpo-lg`); botón secundario siena a su ancho a 2 × `--unidad` bajo el campo, como `.quitar` de `Busqueda.astro` (UX-DR9: texto `--siena`, filete `--grosor-filete` siena, `--radio`, alto `--zona-de-toque`, `padding-inline` 3 × `--unidad`, `--sans` `--cuerpo-md`, hover a `--siena`/`--sobre-siena`, sin `nowrap`). Solo tokens.
- Colocación, solo en la página 1 (`currentPage === 1`), también en Obras `noindex` o con la familia congelada:
  - **Obra** *(v8.4)*: tras el `ul.listado` y la `Paginacion` (que solo se pinta con más de una página), antes de `section.temas`, de «Dónde leer esta obra» y de la nota, a 5 × `--unidad` (40 px) de la paginación —o de la última tarjeta, sin paginación—. El listado vuelve a 4 × bajo `p.salto`, como sin formulario, y `section.temas` conserva su 5 ×, que pasa a medirse desde el formulario (UX-DR95: 5 × del formulario a «Compartir en» y 5 × de ahí a Temas; «Compartir en» es de la 25.6 y no está en esta rama).
  - **Autor**: 2 × bajo `h2.rotulo` «Citas documentadas» y `ul.listado` 3 × más abajo, sin tocar la Ficha.
  - **Tema**: 4 × bajo el `h1` y `ul.listado` 4 × más abajo.
  - Las páginas 2+ conservan sus distancias de hoy (Obra 4 × bajo `p.de`, Autor 2 × bajo el rótulo, Tema 4 × bajo el `h1`).
- Sin zona: ni el formulario ni sus antepasados llevan `data-zona` ni `data-sin-zona`; `EXENCIONES_DE_ZONA` no cambia (su docblock ya nombra «Buscar en…»).
- El 404: `<form class="formulario" role="search" action={rutaDeLaBusqueda()} method="get">` con `CampoDeBusqueda` (`id="consulta"`, `ETIQUETA_DE_LA_BUSQUEDA`, `nombre="q"`, `ejemplo={TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA}`, con botón); se quitan sus reglas propias de `label`/`input` (serif, `--titular-sm`); la Cita del Día, los Temas y la invitación no cambian.
- La medida de la primera pantalla (360 × 640, fin de la primera línea de la primera Cita) se toma en toda página 1 de Obra y de Tema y se anota, con fecha, en `## Medidas`.

**Block If:**
- A 360 × 640 sobre lo construido, con el formulario, la primera Cita de alguna página 1 de Obra o de Tema deja de empezar en la primera pantalla (fin de su primera línea > 640 px): compactar es decisión de UX. HALT con las medidas.
- Cumplir algo exige un guion (en línea o empaquetado) en la Página de Obra, Autor, Tema o el 404, o tocar `Armazon.astro`.

**Never:**
- No editar `_bmad-output/planning-artifacts/` ni `_bmad-output/specs/`; la Historia 4.3 no se enmienda.
- Ni ruta, ni página, ni superficie nueva; nada en `src/lib/superficies.ts`, `src/lib/ingreso.ts`, `src/lib/guiones.ts` ni `src/lib/medicion.ts`.
- No tocar la isla de `/buscar/` (`Busqueda.astro`): la llegada con filtros es de la 27.4.
- Sin texto de ejemplo en «Buscar en…»; sin botón en `/buscar/` ni en el filtro de los Directorios.
- No traer «Compartir en» (25.6, rama `v8/epica-25`) ni reservarle hueco.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Obra, vacío | «Buscar» sin texto en la p. 1 de una Obra de N Citas | `/buscar/?q=&autor={slug}&obra={ficha}`; Autor y Obra elegidos, «Quitar los filtros» visible, recuento `fraseDelRecuento` = «N citas de {Autor} en {título}.» con N el del listado | — |
| Autor / Tema, vacío | «Buscar» en la p. 1 | `?q=&autor=` o `?q=&tema=`; recuento «N citas de {Autor}.» / el del Tema, N el de su listado | — |
| Con texto e Intro | «tiempo» + Intro (o tecla de buscar) | Misma pestaña, `q=tiempo`; el campo de `/buscar/` dice «tiempo» | — |
| Atrás | tras llegar a `/buscar/` | `page.goBack()` vuelve a la página de origen | — |
| Página 2+ | `/autor/x/2/`, `/tema/x/2/`, `/obra/a/b/2/` | Sin el formulario, distancias de hoy | — |
| Obra `noindex` o congelada | p. 1 | Lleva el formulario igual, bajo el listado | — |
| Obra de más de 50 Citas | p. 1 con Paginación | Formulario tras `nav.paginacion`, 40 px; Temas 40 px más abajo | — |
| Obra sin paginación | p. 1 de ≤ 50 Citas | Formulario 40 px bajo la última tarjeta | — |
| 404 | ruta inexistente | Campo con «Por ejemplo: no hay camino», lo tecleado en Inter, botón «Buscar»; enviar → `/buscar/?q=…` | — |

</intent-contract>

## Code Map

- `_bmad-output/implementation-artifacts/27-8-buscar-en-wip.patch` -- **aplicado en `1fbd9e1640` y retirado del árbol en la revisión del 2026-10-30** (queda en la historia de git; las «l. N del parche» de abajo se refieren a él). Era el trabajo de la primera pasada (2026-10-29), con el formulario **encima** del listado en la Obra. Se aplica limpio sobre `3008994d7b` (`git apply --check` verificado el 2026-10-30). Todo vale salvo la colocación de la Obra: sus hunks de `src/pages/obra/[autor]/[slug]/[...page].astro`, de `tests/unit/obra-pagina.test.ts`, el test «el formulario va justo encima del listado que filtra» de `tests/unit/buscar-en.test.ts` y los de distancias de Obra de `tests/e2e/accesibilidad.spec.ts`.
- `src/components/CampoDeBusqueda.astro` -- el Campo de la 26.6 (`Props { id, etiqueta, nombre?, ejemplo?, consulta? }`); el parche añade `boton?: boolean` (botón submit debajo + `enterkeyhint="search"`).
- `src/components/BuscarEn.astro` (nuevo, en el parche) -- `form.buscar-en`; su `margin-top` lo pone cada página (`.pagina > :global(.buscar-en)`).
- `src/components/Busqueda.astro:380–410` -- `.quitar, .mas button`: el secundario siena a replicar. No se toca.
- `src/lib/busqueda.ts:29–35, 287` -- `ETIQUETA_DE_LA_BUSQUEDA`, `TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA`, `PARAMETROS_DE_LA_BUSQUEDA`. Sin importaciones nuevas (`tests/unit/busqueda-con-filtros.test.ts:116`).
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- docblock l. 11–13 (orden de la página 1); `</header>` l. 167; `ul.listado` l. 173; `<Paginacion>` l. 177; `section.temas` l. 179–186 (`.temas { margin-top: 5 × }`, l. 292); `DondeLeer` l. 189; nota l. 196. `.listado` (l. 284) conserva `margin: 4 × 0 0`. `Paginacion.astro:50` solo pinta con `lastPage > 1` (`margin-top` 3 ×, l. 114).
- `src/pages/autor/[slug]/[...page].astro`, `src/pages/tema/[slug]/[...page].astro`, `src/pages/404.astro` -- tal como los deja el parche.
- `tests/unit/obra-pagina.test.ts` -- l. 455–465 y 511–523: la 24.1 exige `</header>\s*<ul class="listado"` en toda página (vuelve a valer en la 1); l. 732–739: orden listado < paginación < temas < donde-leer.
- `tests/unit/ayuda/construir.ts`, `tests/unit/ayuda/guion.ts:48,217`, `tools/lib/html.ts:145` -- lo que usa `buscar-en.test.ts`.
- `tests/e2e/accesibilidad.spec.ts` -- 24.7: primera pantalla de toda página 1 de Obra (l. 2096–2124), «la Cabecera: el listado a 32 px del salto» (l. 2143–2152), «el pie no se mueve» (l. 2154–2167: `nav.paginacion → .temas` 40, `ul.listado → .temas` 40); `PIE()` l. 1871 (`conPaginacion`, `sinPaginacion`, `primeras`); `SUPERFICIES` l. 177.
- `tests/e2e/busqueda.spec.ts`, `tests/e2e/receptor.spec.ts:1581`, `tests/e2e/pagina-404.spec.ts:17`, `tests/unit/espinas-de-ux.test.ts:331` -- deben seguir en verde.

## Tasks & Acceptance

**Execution:**
- Árbol de trabajo -- `git apply _bmad-output/implementation-artifacts/27-8-buscar-en-wip.patch` -- punto de partida; lo que no toca la Obra queda como está (rótulos, Campo con botón, `BuscarEn`, Autor, Tema, 404, describe 27.8 de `busqueda.spec.ts`).
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- mover `primera && <BuscarEn …/>` tras `<Paginacion>` y antes de `section.temas`; `.pagina > :global(.buscar-en) { margin-top: calc(var(--unidad) * 5) }`; quitar el comentario del parche sobre `.listado`; docblock de la página y del bloque: orden «Cabecera con salto, Listado, Paginación, “Buscar en esta obra”, Temas, “Dónde leer”, nota», v8.4 y decisión de Héctor del 2026-10-30 -- UX-DR94, UX-DR95.
- `src/components/BuscarEn.astro` (docblock, l. 12 del parche) y `src/lib/busqueda.ts` (docblock de los rótulos, l. 151 del parche) -- decir «encima del listado en el Autor y el Tema, debajo de su listado y su paginación en la Obra (v8.4)» -- que ningún docblock contradiga la colocación.
- `tests/unit/obra-pagina.test.ts` -- deshacer los cambios del parche (la 24.1 vuelve a `</header>\s*<ul class="listado"` en toda página, sin `SIN_NADA_ANTES_DEL_LISTADO_EN_LA_PRIMERA`) y añadir a l. 732 `posicion('class="buscar-en"')` entre `paginacion` y `temas` en la página 1 -- el orden de UX-DR95.
- `tests/unit/buscar-en.test.ts` -- partir «el formulario va justo encima del listado que filtra»: Autor y Tema, `</form>` seguido de `<ul class="listado"`; Obra, `</header>` seguido de `<ul class="listado"` y el formulario después del cierre del listado —y de `class="paginacion"` en «Brevedad», que pagina— y antes de `class="temas"` y `class="donde-leer"` -- la colocación sobre `dist/`.
- `tests/e2e/accesibilidad.spec.ts` -- 24.7 «la Cabecera»: vuelve a `salto → ul.listado` 32 px en la página 1 (sin formulario en medio) y comprueba que el formulario no está entre ellos; «el pie»: `nav.paginacion → form.buscar-en` 40 y `form.buscar-en → .temas` 40 en `conPaginacion`, `ul.listado → form.buscar-en` 40 y `form.buscar-en → .temas` 40 en `sinPaginacion`; describe 27.8 «las distancias»: quitar la Obra de la tabla de encima/debajo (la cubre la 24.7) y conservar campo → botón 16 en los cuatro; conservar la guarda del barrido, los estilos, los rótulos, la primera pantalla del Tema y la anotación de la peor medida de Obra y de Tema (el comentario de la anotación de Obra, l. 504 del parche, ya no dice «encima del listado») -- UX-DR94, UX-DR95, NFR-8, NFR-9.
- `_bmad-output/implementation-artifacts/spec-27-8-buscar-en-esta-obra-en-un-autor-o-en-un-tema.md` -- en `## Medidas`, una entrada **2026-10-30** con la peor medida de las páginas 1 de Obra y de Tema con el formulario en su sitio nuevo (ruta y px), sacada de las anotaciones o del `console.log` de Playwright -- AC «la medida se anota».
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- al cerrar, la línea `27-8-…` sin comentario en línea; nada más.

**Acceptance Criteria:**
- Given el sitio construido, when se lee `dist/`, then solo la página 1 de cada Obra (indexable, `noindex` o congelada), Autor y Tema lleva «Buscar en…», ninguna ruta nueva aparece en el sitemap ni en Pagefind, y ninguna de esas páginas carga un guion más que su página 2.
- Given la página 1 de una Obra, when se lee su marcado, then el orden es Cabecera, listado, paginación (si la hay), «Buscar en esta obra», Temas, «Dónde leer esta obra», nota; y a 360 × 640 hay 32 px del salto al listado, 40 px de la paginación —o de la última tarjeta— al formulario y 40 px del formulario a Temas.
- Given Playwright local sobre la rama, when corre el barrido WCAG 2.2 AA y el reflujo a 320 px de la 26.9, then incluye la página 1 de una Obra, de un Autor y de un Tema con el formulario y el 404 con su botón, y pasan.
- Given toda página 1 de Obra y de Tema a 360 × 640, when se mide la primera línea de la primera Cita, then acaba a 640 px o antes, y la peor de cada familia queda anotada con fecha en `## Medidas`.
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
- **2026-10-30 — replanificado sobre el borrador.** Approach, Always «Colocación» (Obra v8.4) y la matriz recogen la
  decisión; el Code Map parte del parche y nombra los hunks que cambian; las tareas mueven el formulario en la Obra,
  devuelven la 24.1 y la 24.7 «Cabecera» a su forma sin formulario y pasan las distancias del formulario de la Obra
  al test del pie. `baseline_revision` pasa a `3008994d7b` (el parche no está commiteado). KEEP: rótulos, Campo con
  botón, `BuscarEn`, Autor, Tema y 404 tal como los deja el parche; la medida de la primera pantalla en Obra y Tema.

## Review Triage Log

### 2026-10-30 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

### 2026-10-30 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 11: (high 0, medium 1, low 10)
- defer: 2: (high 0, medium 1, low 1)
- reject: 18: (high 0, medium 3, low 15)
- addressed_findings:
  - `[medium]` `[patch]` El caso que motiva la historia (un listado que pagina) no se probaba de punta a punta: nueva prueba en `tests/e2e/busqueda.spec.ts` que, desde la página 1 del Autor, el Tema y la Obra mayores (más de `CITAS_POR_PAGINA`), envía «Buscar» vacío y exige en `/buscar/` el recuento de la entidad entera.
  - `[low]` `[patch]` La prueba «…no entra en Pagefind» solo leía el sitemap: ahora exige que las páginas con `data-pagefind-body` de `dist/` sean exactamente las del sitemap, sin `/buscar/`, y que cada «Buscar en…» lleve `data-pagefind-ignore`.
  - `[low]` `[patch]` `BuscarEn.astro` repetía a mano el orden de los ocultos: ahora lo lee de `PARAMETROS_DE_LA_BUSQUEDA`.
  - `[low]` `[patch]` El tipo de `filtros` admitía `{}`, Obra sin Autor y Autor con Tema, y dejaba pasar un valor vacío: unión de las tres formas válidas y un valor vacío detiene la construcción.
  - `[low]` `[patch]` El rótulo del Autor se miraba con `/^Buscar en \S/`: ahora se compara con `rotuloBuscarEnAutor` del nombre del `h1`.
  - `[low]` `[patch]` La prueba del 404 tenía escrito el ejemplo: usa `TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA`.
  - `[low]` `[patch]` «Sin botón» solo miraba `/buscar/`: ahora también `/autores/` y `/obras/`.
  - `[low]` `[patch]` La prueba de la congelación solo afirmaba `noindex` en «Cartas»: ahora en las tres Obras.
  - `[low]` `[patch]` El formulario del 404 no tenía prueba de zona: comparte con «Buscar en…» la comprobación de antepasados sin `data-zona` ni `data-sin-zona`.
  - `[low]` `[patch]` `27-8-buscar-en-wip.patch`, ya aplicado, seguía en el árbol: retirado (queda en git) y el Code Map lo dice.
  - `[low]` `[patch]` La medida y el resultado del 2026-10-29 se leían como vigentes: marcados como superados por la pasada del 2026-10-30.

## Design Notes

- **Por qué el botón vive en el Campo:** el docblock de la 26.6 ya lo reserva («la 27 y la 28 le añaden… el botón “Buscar” y el `name`»): el 404, «Buscar en…» y la portada de la 28 comparten un solo marcado de campo + botón; el formulario lo pone quien lo usa.
- **Por qué los ocultos van tras el campo:** el GET compone la dirección en orden de documento, y así sale `?q=&autor=&obra=` en el orden de `direccionDeLaBusqueda`. La isla lee por nombre y no reescribe una llegada ya resuelta (`q=` vacío = sin texto).
- **Por qué `data-pagefind-ignore`:** «Buscar en José Martí Buscar» no es texto buscable de la página 1 indexable; mismo criterio que el salto de la 24.7.
- **Por qué el margen del formulario en la Obra es suyo y no de la Paginación:** el formulario sigue a la `Paginacion` o, sin ella, al `ul.listado`; un `margin-top` de 5 × en el propio formulario da los 40 px en los dos casos sin tocar `Paginacion.astro`, que comparten Autor, Tema y Colección. `section.temas` conserva su 5 ×. Cuando llegue la 25.6, «Compartir en» se coloca tras el formulario con su propio 5 × (su criterio ya lo prevé).

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run tests/unit/buscar-en.test.ts`, `tests/unit/espinas-de-ux.test.ts`, `tests/unit/obra-pagina.test.ts`, `tests/unit/busqueda-con-filtros.test.ts`, `tests/unit/superficies.test.ts` -- expected: verdes.
- `npx playwright test tests/e2e/busqueda.spec.ts tests/e2e/accesibilidad.spec.ts tests/e2e/pagina-404.spec.ts tests/e2e/pagina-de-autor.spec.ts tests/e2e/pagina-de-tema.spec.ts --project=escritorio --project=movil` (largo: `correr.sh`/`esperar.pl`) -- expected: verde sobre el sitio construido por `tests/servidor.mjs`; si la primera pantalla falla, Block If.
- `npx playwright test tests/e2e/receptor.spec.ts -g "404" --project=escritorio` -- expected: verde.

## Medidas

**2026-10-29 — superada:** medida con el formulario **encima** del listado de la Obra, antes de la UX v8.4; la vigente
es la del 2026-10-30, más abajo. Sobre lo construido en la rama `v8/epica-27` (Corpus del día, 517 páginas 1 de Obra), con el
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

**2026-10-30**, sobre lo construido en la rama `v8/epica-27` (Corpus del día: 517 páginas 1 de Obra y 24 de
Tema), con «Buscar en esta obra» ya **bajo** el listado (UX v8.4) y a 360 × 640 (proyectos `escritorio` y `movil`,
mismas cifras): fin de la primera línea de la primera Cita del listado.

- **Página 1 de Obra:** las 517 en la primera pantalla. La peor,
  `/obra/jose-victorino-lastarria/discurso-de-incorporacion-de-don-jose-victorino-lastarria-a-una-sociedad-de-literatura-de-santiago-en-la-sesion-del-tres-de-mayo-de-1842/`,
  **556,8 px** (era 722,24 con el formulario encima): vuelve a la medida de la 24.7, sin formulario entre la
  Cabecera y el listado.
- **Página 1 de Tema:** las 24 en la primera pantalla. La peor, `/tema/el-amor/`, **430,74 px** (sin cambio).
- El Block If no salta.

## Auto Run Result

### 2026-10-29 — primera pasada (superada por la replanificación y la implementación del 2026-10-30, más abajo)

Status: blocked
Blocking condition: Block If de la intención — a 360 × 640, con «Buscar en esta obra», la primera Cita de 6 de las 517 páginas 1 de Obra deja de empezar en la primera pantalla (peor: 722,24 px; medidas en `## Medidas`). Compactar es decisión de UX (Héctor, `bmad-ux`).

Implementado y sin commitear en el árbol de trabajo: `src/lib/busqueda.ts` (rótulos y botón), `src/components/CampoDeBusqueda.astro` (`boton`), `src/components/BuscarEn.astro` (nuevo), las páginas de Obra, Autor y Tema (página 1), `src/pages/404.astro` (Campo con botón), `tests/unit/buscar-en.test.ts` (nuevo), `tests/unit/obra-pagina.test.ts` (la 24.1 admite el formulario entre la Cabecera y el listado de la página 1), `tests/e2e/busqueda.spec.ts` y `tests/e2e/accesibilidad.spec.ts` (describe 27.8, distancias de la 24.7, primera pantalla del Tema y anotación de la peor medida).

Verificación: `npx astro check` 0 errores; `npx vitest run` de `buscar-en`, `espinas-de-ux`, `obra-pagina`, `busqueda-con-filtros` y `superficies` en verde (260 pruebas; `obra-pagina` se repitió, 66, tras ajustar su aserción de la 24.1); Playwright de `busqueda`, `accesibilidad`, `pagina-404`, `pagina-de-autor` y `pagina-de-tema` en `escritorio` y `movil`: 532 pasan, 12 se saltan, 2 fallan —la primera pantalla de la página 1 de Obra de la 24.7, en los dos proyectos, que es el Block If—; `receptor.spec.ts -g 404` en verde (4).

### 2026-10-30 — replanificación

Status: ready-for-dev
Blocking condition: ninguna. Replanificado sobre el borrador con la decisión de Héctor del 2026-10-30 (UX v8.4): en la Obra, «Buscar en esta obra» va tras el listado y su paginación, a 5 × `--unidad`; Autor y Tema sin cambios. Parada tras planificar; la implementación parte de `27-8-buscar-en-wip.patch` (aplica limpio sobre `3008994d7b`).

### 2026-10-30 — implementación

Status: done
Blocking condition: ninguna.

**Resumen.** Se aplicó `27-8-buscar-en-wip.patch` (rótulos y botón en `src/lib/busqueda.ts`, `boton` en el Campo,
`BuscarEn.astro`, Autor, Tema y 404) y se movió «Buscar en esta obra» bajo el listado y la paginación de la página 1
de Obra, a 5 × `--unidad`, con Temas 5 × más abajo; el listado vuelve a 4 × bajo el salto.

**Ficheros.**
- `src/lib/busqueda.ts` — rótulos de «Buscar en…» y `BOTON_DE_BUSCAR`; el docblock nombra las dos colocaciones.
- `src/components/CampoDeBusqueda.astro` — `boton`: submit «Buscar» secundario siena bajo el campo y `enterkeyhint`.
- `src/components/BuscarEn.astro` (nuevo) — el formulario GET sin guion con los filtros ocultos.
- `src/pages/obra/[autor]/[slug]/[...page].astro` — el formulario tras `<Paginacion>` y antes de Temas, 5 × (regla
  separada de `.temas` para que el minificador no las funda); docblock con el orden de la página 1.
- `src/pages/autor/[slug]/[...page].astro`, `src/pages/tema/[slug]/[...page].astro` — el formulario encima del listado.
- `src/pages/404.astro` — el Campo con ejemplo y botón; fuera las reglas propias de serif.
- `tests/unit/buscar-en.test.ts` (nuevo) — el formulario sobre `dist/`; la colocación partida en Autor/Tema (encima)
  y Obra (debajo, tras `</nav>` o `</ul>`, antes de Temas y «Dónde leer»).
- `tests/unit/obra-pagina.test.ts` — la 24.1 intacta (`</header>` seguido del listado); el orden del pie suma el
  formulario entre paginación y Temas.
- `tests/e2e/accesibilidad.spec.ts` — guarda del barrido, 24.7 «la Cabecera» (salto → listado 32, formulario bajo el
  listado) y «el pie» (paginación/listado → formulario 40, formulario → Temas 40), describe 27.8 sin la Obra en la tabla
  de encima/debajo, primera pantalla de Obra y Tema anotadas.
- `tests/e2e/busqueda.spec.ts` — describe 27.8 (vacío, texto + Intro, atrás, páginas 2+, 404).

**Revisión.** Capas externas sin hallazgos en esta pasada: 0 parches, 0 diferidos, 0 rechazados.
`followup_review_recommended: false` (0 parches; puntuación 0).

**Verificación.**
- `npx astro check` — 0 errores, 0 avisos.
- `npx vitest run` de `buscar-en`, `espinas-de-ux`, `obra-pagina`, `busqueda-con-filtros` y `superficies` — 261
  pruebas; `obra-pagina` falló una vez («la hoja emitida del pie»: la regla del formulario, junto a `.temas` y con la
  misma declaración, se fundía con ella) y, movida la regla, `obra-pagina` + `buscar-en` pasan (74).
- Playwright `busqueda`, `accesibilidad`, `pagina-404`, `pagina-de-autor`, `pagina-de-tema` en `escritorio` y
  `movil` — 533 pasan, 12 se saltan, 1 falla: `busqueda.spec.ts:840` (27.1) en `movil` por «socket hang up» del
  servidor local; repetido aislado en los dos proyectos, pasa (2).
- `npx playwright test tests/e2e/receptor.spec.ts -g "404" --project=escritorio` — 4 pasan.
- Matriz: cada fila la cubre una prueba que corrió y pasó (describe 27.8 de `busqueda.spec.ts`, `buscar-en.test.ts`
  con la congelación, y el pie de la 24.7 con y sin paginación).

**Riesgos.** «Compartir en» (25.6) no está en esta rama: al fusionar las dos épicas se colocará tras el formulario con
su propio 5 ×, y el pie de la 24.7 tendrá que medir formulario → «Compartir en» → Temas.

### 2026-10-30 — revisión

Status: done
Blocking condition: ninguna.

**Resumen.** Pasada de revisión sobre `1fbd9e1640` con los hallazgos de las cinco capas externas: sin intent_gap ni
bad_spec; 11 parches, 2 diferidos y 18 rechazados. Los parches endurecen `BuscarEn` (los tres juegos de filtros
válidos como unión, el orden leído de `PARAMETROS_DE_LA_BUSQUEDA`, un filtro vacío detiene la construcción) y cierran
huecos de prueba; no cambia nada de lo que se ve.

**Ficheros.**
- `src/components/BuscarEn.astro` — `Filtros` como unión (Obra con Autor, Autor, Tema); ocultos en el orden de
  `PARAMETROS_DE_LA_BUSQUEDA`; un valor vacío lanza.
- `tests/unit/buscar-en.test.ts` — Pagefind (páginas con `data-pagefind-body` = sitemap, sin `/buscar/`), Directorios
  sin botón, las tres Obras `noindex` con la congelación, zona del formulario del 404.
- `tests/e2e/busqueda.spec.ts` — el recuento de `/buscar/` desde la página 1 de un Autor, un Tema y una Obra que
  paginan es el de la entidad entera; el ejemplo del 404 por su constante.
- `tests/e2e/accesibilidad.spec.ts` — el rótulo del Autor comparado con `rotuloBuscarEnAutor` del `h1`.
- `_bmad-output/implementation-artifacts/27-8-buscar-en-wip.patch` — retirado (aplicado; queda en git).
- Este spec — triage, diferidos, y las entradas del 2026-10-29 marcadas como superadas.

**Hallazgos.** 11 parches (1 medium, 10 low), 2 diferidos (la colocación de «Compartir en» al fusionar la 25; el
«socket hang up» de `busqueda.spec.ts:840` en `movil`), 18 rechazados (entre ellos: `sprint-status.yaml`, que el bucle
pone al día en su propio commit `chore(sprint)`; la medida del Autor, que la intención no pide; el envío sin JS en el
navegador, que la intención delega en Vitest sobre `dist/`).
`followup_review_recommended: true` — parches medium 1 y low 10: 3 × 1 + 10 = 13 ≥ 5.

**Verificación.**
- `npx astro check` — 0 errores, 0 avisos.
- `npx vitest run` de `buscar-en`, `espinas-de-ux`, `obra-pagina`, `busqueda-con-filtros` y `superficies` — 261 pasan.
- Playwright `busqueda`, `accesibilidad`, `pagina-404`, `pagina-de-autor`, `pagina-de-tema` en `escritorio` y `movil`
  — 536 pasan, 12 se saltan, 0 fallan (esta vez también `busqueda.spec.ts:840`).
- `npx playwright test tests/e2e/receptor.spec.ts -g "404" --project=escritorio` — 4 pasan.

**Riesgos.** Los de la pasada anterior («Compartir en», ahora diferido) y el «socket hang up» intermitente, diferido
para que no pille por sorpresa el `test:e2e` entero de la 27.9.

