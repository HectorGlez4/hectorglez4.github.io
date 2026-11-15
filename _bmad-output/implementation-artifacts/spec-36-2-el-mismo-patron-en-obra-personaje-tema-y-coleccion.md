---
title: 'Historia 36.2 — El mismo patrón en Obra, Personaje, Tema y Colección'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_revision: '4eb36621d99466e35da8b7d2282e8ae13f17f6c6'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-36-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-36-1-los-paneles-de-la-pagina-de-cita-y-de-la-de-autor.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/EXPERIENCE.md'
warnings: [oversized]
deferred:
  - 'pendiente de Héctor (bmad-ux): asentar en DESIGN.md que la página 1 de Obra no lleva panel encima del listado, solo al pie (decisión 3 de la 36.2, delegada el 2026-11-14); y recoger en la espina la decisión 1b de la 32.5 («Cómo citar» al pie, no junto a los otros dos desplegables).'
---

<intent-contract>

## Intent

**Problem:** Tras la 36.1, la Página de Cita y la de Autor distinguen sus bloques con Paneles de bloque, pero la de Obra y la de Personaje siguen con todos sus bloques sobre el papel; Tema y Colección ya llevan Fichas (AD-19, 36.1) y no tienen bloques secundarios.

**Approach:** Reutilizar sin redefinir `PanelDeBloque.astro`, los tokens y la Ficha de Cita de la 36.1. Personaje calca Autor en su página 1 (Ficha en panel Autor, Lista de Obras en panel Obra); sus 2+ sin panel. Obra, por la **decisión 3** (abajo): en la página 1 **ningún panel por encima del listado** —Cabecera, línea de Ficha técnica y los desplegables «Dónde leer esta obra» y «Cómo empieza» siguen sobre el papel exactamente como los dejó la 32.4—; al pie, los Temas en un panel Tema y «Cómo citar» (al pie desde la decisión 1b de la 32.5) en un panel de herramientas; las 2+ de Obra sin panel. Tema y Colección ya pintan Fichas desde la 36.1 (AD-19) y no tienen bloque secundario que encerrar: se aplica lo demás que pida la historia que no mueva ninguna puerta de primera pantalla.

**Decisión delegada por Héctor (chat, 2026-11-14)** — decisión 3, opción 2 del bloqueo anterior de este spec: la Página de Obra «en paneles» de la espina v9.3 (Cabecera + Ficha técnica en panel Obra y desplegables en panel de herramientas, por encima del listado) añadía ~79 px y sacaba la primera Tarjeta de la primera pantalla de 360 × 640 (incipit ~717 px, ficha técnica ~672 px; tope 640). Se resuelve sin panel encima del listado en la página 1 y con paneles solo al pie. Queda pendiente de Héctor (`bmad-ux`) asentarlo en DESIGN.md.

## Boundaries & Constraints

**Always:**
- Los invariantes de la 36.1 (solo aspecto; sin cambio de orden, textos, `data-zona`, `COLOCACION`, `vocabulario.ts`, rutas, metas, JSON-LD ni `data-pagefind-*`; panel `<div>` sin rol, `aria-*` ni zona; ningún literal fuera de `tokens.css`; AA, foco, 44 px, axe).
- SM-C4: a 360 × 640 la primera Tarjeta del listado de toda página 1 de Obra sigue en la primera pantalla; son puertas `tests/e2e/incipit.spec.ts:232`, `tests/e2e/ficha-tecnica.spec.ts:167` y `tests/e2e/accesibilidad.spec.ts:1923`.

**Block If:**
- Tras la decisión 3, algo de la historia mueve la primera Tarjeta de una página 1 de Obra fuera de la primera pantalla de 360 × 640 (SM-C4): `tests/e2e/incipit.spec.ts` y `tests/e2e/ficha-tecnica.spec.ts` siguen siendo puerta y tienen que pasar.

**Never:**
- Paneles en portada, 404, Directorios ni `/buscar/`; ningún panel por encima del listado en una página de Obra (decisión 3) ni en sus 2+; tocar `EdicionesEnVenta.astro` o lo que va en un `data-ingreso`; editar planificación o specs; mover un bloque de sitio.

</intent-contract>

## Code Map

- `src/components/PanelDeBloque.astro` -- primitiva de la 36.1, **de solo lectura**: `familia` y `cierre` obligatorios; relleno 3u arriba, 2u a los lados, abajo 1u (`fila`) o 3u (`texto`); `.panel + .panel` 2u; posee el trato de dentro (Rótulo de panel en la tinta de su familia y su contenido a 1u, Desplegables planos con el `<summary>` como Rótulo de panel en tinta y sin divisoria sobre el primero, Lista de Obras con `--filete-obra`, Chip de Tema sobre blanco con `--contorno-tema`).
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- `header.cabecera-de-obra` (l. 213-240) y el `div` de «Dónde leer» + «Cómo empieza» (l. 254-260) **no se tocan** (decisión 3). Al pie: `section.temas` (l. 295-302, `.temas { margin-top: 5u }` l. 412-414) → dentro de `<PanelDeBloque familia="tema" cierre="texto">`; el `div data-pagefind-ignore="all" style="margin-top: 5u"` de «Cómo citar» (l. 315-320) → su `Desplegable` dentro de `<PanelDeBloque familia="herramientas" cierre="fila">`, conservando el `data-pagefind-ignore="all"` en un contenedor dentro del panel (el panel solo lleva `class`); `<CopiarReferencia />` (l. 321) sigue fuera de todo panel; `p.nota-de-la-ficha` (l. 328-330) sobre el papel con su filete y sus 4u.
- `src/pages/personaje/[slug]/[...page].astro` -- calcar `src/pages/autor/[slug]/[...page].astro:119-166` y su hoja (`.obras-del-autor` sin margen propio, lista a 1u del rótulo, `:global(.panel-autor) h1 { color: var(--sobre-contenedor-autor) }`): en p. 1 `header.ficha` (h1, `.universo`, semblanza + `AtribucionDeSemblanza`) dentro de `PanelDeBloque familia="autor" cierre="texto"`; en 2+ `header.ficha` solo con el `h1`, sobre el papel; `section.obras-del-personaje` dentro de `PanelDeBloque familia="obra"` con `cierre={pieDeObras !== undefined ? 'texto' : 'fila'}`, y su `margin-top: 5u` y el `margin-top: 2u` de la lista pasan a 0 / 1u.
- `src/components/RutasDeSalida.astro:121-129` -- «Más de {Personaje}» ya va en panel Autor desde la 36.1 (se pinta en la Página de Cita): sin cambio, solo se comprueba.
- `src/pages/tema/[slug]/[...page].astro`, `src/pages/coleccion/[slug]/[...page].astro` -- `h1`, criterio y `BuscarEn` sobre el papel, listado ya en Fichas (36.1, AD-19): **sin cambio**.
- `tests/unit/paneles.test.ts` -- `leer()`/`orden()`/`panelesSanos()` (l. 195-257) reutilizables; el fixture `corpus()` ya trae el Personaje `uno` (l. 103-114, 176-191) con Citas atribuidas en Obras con Tema `el-tiempo`, y Obras de Séneca; l. 361-380, «ninguna otra superficie toma paneles», excluye hoy `obra/` y `personaje/` de las comprobadas.
- `tests/e2e/paneles.spec.ts` -- helpers `contraste`, `token`, `estilo`, `anillo` (l. 18-80) y el patrón de la Página de Autor (l. 225-262); el Corpus real no tiene Personajes, así que la Página de Personaje solo se prueba en la unitaria.
- `tests/e2e/incipit.spec.ts:232`, `tests/e2e/ficha-tecnica.spec.ts:167`, `tests/e2e/accesibilidad.spec.ts:1923` -- puertas de primera pantalla de la Obra; no se tocan.

## Tasks & Acceptance

**Execution:**
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- envolver los Temas en panel Tema y «Cómo citar» en panel de herramientas al pie; trasladar el aire: el primer panel del pie a 5u de lo que lo precede («Buscar en esta obra»), «Cómo citar» a 2u tras el panel de Temas (regla `.panel + .panel`) o a 5u sin él; la sección de Temas sin margen propio dentro del panel. Comentarios con la decisión 3. Nada por encima del listado cambia -- decisión 3 y SM-C4.
- `src/pages/personaje/[slug]/[...page].astro` -- Ficha en panel Autor (p. 1) y Lista de Obras en panel Obra, calcando la de Autor; 2+ sin panel -- AC de Personaje, «calca Autor» (35.3).
- `tests/unit/paneles.test.ts` -- nuevo `describe('Historia 36.2 …')` (o casos en el de la 36.1 compartiendo la construcción): Página de Obra p. 1 con Temas y «Cómo citar» → orden con todo lo de encima del listado `@papel`, el listado `@papel`, `temas@tema`, `desplegable:Cómo citar@herramientas`, y ninguna `nota-de-la-ficha` dentro de un panel (añadir al fixture una `nota` en la ficha de una Obra si no la hay, y lo mínimo para que una Obra tenga Temas y «Cómo citar»); Página de Personaje p. 1 → `ficha-de-autor@autor`, `obras-del-personaje@obra`, `listado@papel`, con `h1` dentro de `.panel-autor`; toda página 2+ de Obra o Personaje presente en `dist/` sin `class="panel "`; `panelesSanos` en cada página tocada; acotar el caso de l. 361 a todo lo que no es `cita/`, `autor/`, `obra/` ni `personaje/` y renombrarlo (portada, 404, Directorios, Tema, Colección, `/buscar/`).
- `tests/e2e/paneles.spec.ts` -- `describe('Historia 36.2 — la Página de Obra con los paneles al pie')` sobre una Obra real con Temas y «Cómo citar» (elegirla con un ayudante de `tests/e2e/ayuda/corpus.ts`; `test.skip` si no la hay): ningún `.panel` antes del `ul.listado`; AA (≥ 4,5:1) de `--tinta`, `--tinta-apagada` y `--siena` sobre el fondo de `.panel-tema` y `.panel-herramientas`; el `<summary>` de «Cómo citar» con 44 px y anillo de foco en siena; chip de Tema con foco visible.

**Acceptance Criteria:**
- Given una página 1 de Obra con Ficha técnica, «Dónde leer», «Cómo empieza», Temas, «Cómo citar» y nota, when se construye, then Cabecera, Ficha técnica, desplegables de arriba, listado, paginación, «Buscar en esta obra» y nota quedan fuera de todo panel, los Temas en `div.panel.panel-tema` y «Cómo citar» en `div.panel.panel-herramientas`, en el orden de hoy y con los mismos textos, zonas y `data-pagefind-*`.
- Given la Obra de Larra con incipit (`incipit.spec.ts`) y la de Ficha técnica (`ficha-tecnica.spec.ts`), when se miden a 360 × 640, then la primera Tarjeta sigue en la primera pantalla (< 640 px; 637,5 y 592,5 px tras la 36.1, y nada de encima del listado cambia).
- Given una página 2+ de Obra o de Personaje, when se construye, then no lleva ningún panel.
- Given una página 1 de Personaje con semblanza y Lista de Obras, when se construye, then la Ficha (nombre en `--sobre-contenedor-autor`, universo, semblanza y su atribución) va en panel Autor, la Lista de Obras con su pliegue y su pie en panel Obra, y el listado en Fichas sobre el papel.
- Given una Página de Cita atribuida a un Personaje, when se construye, then «Más de {Personaje}» sigue en panel Autor (36.1).
- Given las páginas de Tema y de Colección, la portada, el 404, los Directorios y `/buscar/`, when se construye, then ninguna lleva `class="panel "` y su marcado no cambia.
- Given toda página tocada, when se barre con axe y se mide contraste, foco y área táctil, then cumple lo mismo que la 36.1; NFR-7 queda para la puerta de la Épica 36 (aquí, delta de bytes de CSS de Obra y Personaje anotado en el Auto Run Result).

## Spec Change Log

## Review Triage Log

### 2026-11-15 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

(Las cinco capas son externas y la invocación no trajo hallazgos suyos: esta pasada no recibió ninguno, así que no es una revisión limpia sino una vacía; la primera revisión con hallazgos es la siguiente.)

### 2026-11-15 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 10: (high 0, medium 4, low 6)
- defer: 0
- reject: 23: (high 0, medium 3, low 20)
- addressed_findings:
  - `[medium]` `[patch]` El aire del primer panel del pie dependía del vecino (`.pagina > .buscar-en + .panel`): lo que llegue entre el formulario y los paneles («Compartir en», 25.6) se lo quitaba. Pasa a `.pagina > :global(:not(.panel) + .panel)` —todo panel hijo de `.pagina` que no sigue a otro; por encima del listado no hay ninguno—, y `obra-pagina.test.ts` busca la regla nueva.
  - `[medium]` `[patch]` Las 2+ de Personaje sin panel no se ejercitaban (el fixture de `paneles.test.ts` no construye ninguna): `pagina-de-personaje.test.ts` exige en `/personaje/a/2/` ningún `class="panel "` y la Ficha con solo el `h1` sobre el papel.
  - `[medium]` `[patch]` La semblanza del Personaje en el panel del Autor no se probaba (el Personaje del fixture de `paneles.test.ts` no la trae): `pagina-de-personaje.test.ts` exige, para la semblanza propia (`/personaje/b/`) y la de biografía (`/personaje/c/`), que el párrafo y su atribución caigan dentro de `div.panel.panel-autor`.
  - `[medium]` `[patch]` La hoja de la Página de Personaje no la miraba nadie: `pagina-de-personaje.test.ts` lee la hoja emitida de `/personaje/a/` y exige `.panel-autor h1 { color: var(--sobre-contenedor-autor) }`, la lista a `var(--unidad)` de su rótulo y `.obras-del-personaje` sin `margin-top`.
  - `[low]` `[patch]` El `cierre` de la Lista de Obras del Personaje se aceptaba de las dos maneras: `paneles.test.ts` exige `cierre-fila` (sin Citas sin obra, sin pie).
  - `[low]` `[patch]` El recorrido de las 2+ en `paneles.test.ts` se tragaba cualquier error de lectura: solo calla `ENOENT`.
  - `[low]` `[patch]` `obraConLosPanelesDelPie` (`tests/e2e/ayuda/corpus.ts`) componía una ruta rota con un nombre de ficha sin `--`: esos no se eligen.
  - `[low]` `[patch]` `paneles.spec.ts` mide además el contraste ≥ 4,5:1 del Rótulo del Tema sobre `.panel-tema` y del `<summary>` de «Cómo citar» sobre `.panel-herramientas`.
  - `[low]` `[patch]` La constante `COMO_CITAR` de `accesibilidad.spec.ts` quedó muerta tras `PANEL_DE_COMO_CITAR`: retirada.
  - `[low]` `[patch]` El caso «ninguna otra superficie» nombra Colección sin construir ninguna: comprueba además que las páginas de Tema y de Colección no importan `PanelDeBloque`.

Rechazados, con su porqué: el registro de la pasada anterior es cierto (no traía hallazgos); la adyacencia formulario→panel de `buscar-en.test.ts` es el sitio sin hueco de «Compartir en» que fija la 25.6, a propósito; la semblanza de las 2+ ya era `undefined` (`semblanza = primera ? … : undefined`), sin cambio de conducta; la regla del `h1` en el panel del Autor calca la de la Página de Autor, como pide el spec, y ahora la vigila la prueba de la hoja; el ayudante e2e solo elige Obras de un Autor sin derechos vigentes, cuya referencia existe, y la suite pasa; que el e2e no corra en CI es regla del proyecto; el anillo de foco en siena del chip ya supera 4,5:1 sobre el tinte del Tema (medido); la ficha escrita en el fixture es dato de prueba, no Corpus; el cambio de recuentos del fixture deja verdes los casos de la 36.1; la decisión 3 fuera de DESIGN.md ya está en `deferred`, y su divergencia con epics.md la delegó Héctor (va a `bmad-ux`); NFR-7 se mide en la puerta de la épica; las instantáneas tipográficas se regrabaron con comprobación de recuentos y la inestabilidad de `/buscar/` ya está diferida desde la 36.1; `cierre="texto"` en el panel de Temas es el mismo que el de los Temas de la Página de Cita (`RutasDeSalida.astro`); quitar las aserciones de existencia de Obra y Personaje no esconde nada, porque sus casos leen la página y fallan si no está; la Página de Personaje sin e2e es el riesgo residual declarado (el Corpus real no tiene Personajes).

### 2026-11-15 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 0, medium 0, low 5)
- defer: 0
- reject: 33: (high 0, medium 3, low 30)
- addressed_findings:
  - `[low]` `[patch]` La rama `cierre="texto"` de la Lista de Obras del Personaje (Citas sin obra, con pie) no la construía ninguna prueba (verification-gap, blind-hunter): el Personaje D de `pagina-de-personaje.test.ts` gana una atribuida sin obra y se exige `div.panel.panel-obra.cierre-texto` con `section.obras-del-personaje` y «Y una cita sin obra documentada.»; `/personaje/a/` sigue en `cierre-fila`.
  - `[low]` `[patch]` `not.toMatch(/margin-top/)` sobre `.obras-del-personaje` pasaba en vacío si la regla faltaba (edge-case-hunter): se exige antes que la regla exista.
  - `[low]` `[patch]` La adyacencia formulario → panel de `buscar-en.test.ts` aceptaba cualquier familia de panel (blind-hunter): nombra `panel-tema` con los Temas y `panel-herramientas` con «Cómo citar».
  - `[low]` `[patch]` El comentario de `APERTURA` en `como-citar-obra-build.test.ts` y el Resumen del spec citaban el selector retirado `.pagina > .buscar-en + .panel` (blind-hunter): al día con `:not(.panel) + .panel`.
  - `[low]` `[patch]` El párrafo «Revisión» del Auto Run Result decía `followup_review_recommended: false` contra el frontmatter, y la primera entrada del registro se leía como revisión limpia (blind-hunter): el párrafo se rotula como primera pasada y remite al valor vigente; la entrada se aclara como pasada vacía.

Rechazados, con su porqué: la fragilidad de `:not(.panel) + .panel` ante un elemento futuro entre los dos paneles es especulativa (hoy no hay ninguno, y la regla existe precisamente para no depender del vecino); el camino «Cómo citar» sin Temas lo cubre la misma regla genérica, que vigila `obra-pagina.test.ts`, y `buscar-en.test.ts` ya acepta ese primer vecino; la comprobación de la nota del e2e y el ayudante que copia la regla de elegibilidad están cubiertos por la unitaria sobre `dist/` y la suite pasa con el Corpus real (si derivara, falla en rojo, no en verde); `APERTURA` dependiente del orden de clases, el `split(',')` de `de()`, el `.temas` fusionado en una lista, las hojas externas y los recuentos del fixture de 36.1 no esconden ningún defecto alcanzable; el aire tras el último panel del Personaje calca la Página de Autor, como pide el spec; el contraste y el foco del Personaje en navegador, Colección sin construir, «marcado sin cambio» inferido de las fuentes intactas y la ficha escrita en el fixture son los riesgos residuales ya declarados; NFR-7 se mide en la puerta de la Épica 36; la decisión 3 fuera de DESIGN.md y epics.md la delegó Héctor y ya está en `deferred` (`bmad-ux`); `data-pagefind-ignore` en el contenedor de dentro es lo que pide el spec (el panel solo lleva `class`) y los Temas ya se indexaban antes de la 36.2; los barridos de 2+ del Personaje en `paneles.test.ts` los cubre `pagina-de-personaje.test.ts` (`/personaje/a/2/`), y las Obras de dueño Personaje no llevan «Cómo citar» ni cambian con esta historia.

## Design Notes

Por qué la decisión 3 no mueve la primera pantalla: todo lo que se envuelve queda **bajo** el listado (Temas y «Cómo citar» van tras «Buscar en esta obra», que ya va tras la paginación desde la 27.8). El aire al pie: el ritmo de bloques del pie era 5u; al pasar a paneles se conserva el 5u hacia el primer panel y entre los dos paneles manda el 2u de la primitiva, como entre los paneles del pie de la Página de Cita. La nota (4u + filete + 3u) sigue igual, ahora medida desde el borde del último panel.

Personaje: misma pieza que Autor, sin variar nada; el universo (`.universo`, en `--tinta-apagada`) cae sobre `--contenedor-autor`, cuyo AA con la tinta apagada ya fija la 36.1.

### Historia del bloqueo (plan anterior, resuelto por la decisión 3)

Status: blocked
Blocking condition: intent gap — la Página de Obra «en paneles» de la espina v9.3 rompe la puerta de primera pantalla SM-C4, y la espina no tiene otra lectura que la evite.

**La evidencia.** La espina (DESIGN.md § Página de Obra «En paneles»; EXPERIENCE.md v9.3, misma página) pone la Cabecera de Obra con la Ficha técnica en un panel Obra **en todas sus páginas** y los desplegables en el panel de las herramientas, los dos por encima del listado. Con el relleno que fija § Primitivas → Panel de bloque, eso añade unos 79 px por encima de la primera Tarjeta. Las medidas tras la 36.1 dejan 2,5 px de margen en el caso más alto: `tests/e2e/incipit.spec.ts` (Obra de Larra con incipit, «Dónde leer» y Ficha técnica) pone la primera Tarjeta a 637,5 px, y `tests/e2e/ficha-tecnica.spec.ts` a 592,5 px; con los paneles quedarían en unos 717 px y 672 px, fuera de los 640 px, y las dos pruebas son puerta. En el Corpus real la peor Obra (Lastarria, sin incipit) pasaría de 550,8 a unos 630 px, con 10 px de margen, y la saca el primer incipit que se declare en una Obra de título largo. Ningún relleno menor cabe en la espina, y no hay forma de ahorrar 77 px sin cambiar el orden o la composición.

**Una segunda contradicción, menor.** La espina pide «los tres Desplegables juntos en el panel de las herramientas», pero «Cómo citar» va al pie desde la decisión 1b (delegada por Héctor el 2026-11-14, precisamente para la primera pantalla) y la épica prohíbe mover bloques. La espina no recoge la 1b.

**Qué tiene que decidir Héctor (`bmad-ux`)**, con lecturas que dan resultados distintos a la vista:
1. Cabecera y Ficha técnica **sobre el papel** en la página 1 (el panel Obra solo en las 2+, o en ninguna), y los desplegables de arriba en el panel de las herramientas: unos +32 px; la puerta del incipit seguiría fuera (~670 px).
2. **Sin paneles por encima del listado** en la página 1 (Cabecera y desplegables sobre el papel, como hoy); paneles solo al pie: Temas en panel Tema y «Cómo citar» en un panel de herramientas propio. No mueve la primera pantalla.
3. Mantener la espina y **rebajar o retirar la puerta** de primera pantalla de la Obra (SM-C4), o llevar los desplegables de arriba bajo el listado (otra decisión como la 1b).
4. Un relleno menor para los paneles de la Página de Obra (cambia § Primitivas).

Además: si «Cómo citar» al pie va en un panel de herramientas propio o sobre el papel, y si el `h1` de la Obra en el panel sigue en tinta (DESIGN.md § Colors dice que lo que va sobre el tinte de la Obra va en tinta; el nombre del Autor sí toma `--sobre-contenedor-autor`).

**Lo que no está bloqueado** y se podría construir sin esa decisión: la Página de Personaje (calca la de Autor: Ficha en panel Autor y Lista de Obras en panel Obra en la página 1, listado en Fichas) y los Temas de la Obra en panel Tema al pie. Tema y Colección no cambian. Partir la historia también es decisión de Héctor (`bmad-create-epics-and-stories`).

## Verification

**Commands:**
- `npx vitest run tests/unit/paneles.test.ts` (y uno a uno: `tipografia-en-tokens`, `superficies`, `medicion`, `espinas-de-ux`, `obras` si toca su prueba de la Página de Obra) -- verde.
- `npx astro check` -- 0 errores.
- `npm run build` -- termina; el paso del peso no se para.
- `npx playwright test tests/e2e/{paneles,incipit,ficha-tecnica,accesibilidad,desplegable}.spec.ts` -- verde contra `tests/servidor.mjs` (puertos según RULES); incipit y ficha técnica son puerta.
- `npm test` completo, desacoplado con `correr.sh` -- verde.

**Manual checks (if no CLI):**
- Captura a 360 × 640 y a 1280 de una página 1 de Obra con Temas y «Cómo citar»: encima del listado idéntico a la 36.1; al pie, los dos paneles con su tinte y ningún panel vacío.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** Decisión 3 aplicada: en la página 1 de Obra nada cambia por encima del listado (Cabecera, Ficha técnica, «Dónde leer» y «Cómo empieza» sobre el papel, como en la 32.4); al pie, los Temas en `PanelDeBloque familia="tema" cierre="texto"` y «Cómo citar» en `familia="herramientas" cierre="fila"`, con su `data-pagefind-ignore="all"` en el contenedor de dentro (el panel solo lleva `class`); `CopiarReferencia` y la nota, fuera de todo panel. El primer panel del pie a 5 × `--unidad` de «Buscar en esta obra» (`.pagina > :global(:not(.panel) + .panel)` desde la segunda pasada; en la primera, `.pagina > .buscar-en + .panel`), el segundo a 2 × por la regla de la primitiva; `.temas` pierde su margen propio. La Página de Personaje calca la de Autor: en la página 1 la Ficha (nombre en `--sobre-contenedor-autor`, universo, semblanza y su atribución) en el panel del Autor y la Lista de Obras en el de la Obra (lista a 1 × del rótulo, sin margen propio); las 2+, solo el `h1` sobre el papel. Tema, Colección, portada, 404, Directorios y `/buscar/` no cambian; `PanelDeBloque.astro` no se toca. Ni textos, ni orden, ni `data-zona`, ni rutas, metas, JSON-LD ni `data-pagefind-*`.

**Ficheros.**
- `src/pages/obra/[autor]/[slug]/[...page].astro` — Temas y «Cómo citar» en sus paneles al pie; aire del primer panel; comentarios con la decisión 3.
- `src/pages/personaje/[slug]/[...page].astro` — Ficha en panel Autor (p. 1), Lista de Obras en panel Obra; 2+ sin panel.
- `tests/unit/paneles.test.ts` — casos de la 36.2 sobre `dist/` (orden y panel de cada bloque de Obra p. 1 con nota, Personaje p. 1, «Más de {Personaje}», toda página 2+ de Obra y Personaje sin panel; el caso «ninguna otra superficie» acotado a lo que no es Cita, Autor, Obra ni Personaje e incluye `/buscar/`); el fixture gana una ficha con `nota` y una Obra de más de una página; la guardia de hexadecimales/sombra alcanza las dos páginas.
- `tests/unit/como-citar-obra-build.test.ts`, `tests/unit/buscar-en.test.ts`, `tests/unit/obra-pagina.test.ts` — al día con «Cómo citar» y los Temas dentro de sus paneles y con el margen del primer panel.
- `tests/e2e/paneles.spec.ts`, `tests/e2e/ayuda/corpus.ts` — `describe` de la 36.2 sobre una Obra real con Temas y «Cómo citar» (`obraConLosPanelesDelPie`): ningún panel antes del listado, AA de tinta/apagada/siena sobre los dos tintes, rótulo en `--sobre-contenedor-tema`, 3:1 del contorno del chip, `<summary>` de 44 px con anillo siena, chip con foco visible, nota fuera de panel.
- `tests/e2e/accesibilidad.spec.ts` — el pie de la 32.4 medido entre paneles: formulario → panel de Temas 40 px, panel de Temas → panel de «Cómo citar» 16 px, panel → nota 32 px y la nota fuera de todo panel.
- `tests/e2e/tipografia-calculada.spec.ts-snapshots/tipografia-obra-{escritorio,movil}.json` — regrabadas (solo la Obra cambia): comprobado que, quitando el segmento `div.panel…` de las rutas, los recuentos por «peso | interlineado» son idénticos a los de la base.

**Revisión (primera pasada).** Pasada sin hallazgos externos: 0 patch, 0 defer, 0 reject; puntuación 0 en esa pasada. El valor vigente de `followup_review_recommended` es el de la última pasada (abajo).

**Verificación.**
- `npx vitest run` por fichero: `paneles` (13), `como-citar-obra-build` (6), `buscar-en` (10), `obra-pagina` (69), `pagina-de-personaje` (20), `personajes-build` (5), `tipografia-en-tokens` (6), `superficies` (120), `espinas-de-ux` (14), `obras` (158), `medicion` (755): verde.
- `npx astro check`: 0 errores.
- `npm run build`: termina con EXIT 0; el paso del peso no se para (543,9 MiB juzgados, por debajo del aviso).
- `npx playwright test tests/e2e/{paneles,incipit,ficha-tecnica,accesibilidad,desplegable}.spec.ts`: 358 verdes y 2 rojos del pie de la 32.4, que medían los márgenes de antes; puestos al día y verdes en la repetición (bloque «Historia 32.4» entero, móvil y escritorio). Las puertas de primera pantalla `incipit.spec.ts:232` y `ficha-tecnica.spec.ts:167` (proyecto de escritorio a 360 × 640, por diseño) en verde; la de `accesibilidad.spec.ts` da la peor página 1 de Obra del Corpus a 548,15 px (< 640).
- `tests/e2e/tipografia-calculada.spec.ts`: verde salvo `buscar-con-resultados` (escritorio), la inestabilidad de `p.estado` ya diferida en la 36.1; `/buscar/` no cambia con esta historia y su instantánea no se regrabó.
- `npm test` completo (desacoplado): 209 ficheros, 9.056 pruebas, verde.

**NFR-7.** Queda para la puerta de la Épica 36. Delta de CSS: la Página de Obra carga ahora la hoja de `PanelDeBloque` — las reglas con `.panel` suman 2.367 bytes sin comprimir en una hoja en línea de 19.080 (p. ej. `/obra/agustin-alvarez/la-transformacion-de-las-razas-en-america/`), menos la regla retirada de `.temas`; ningún guion nuevo. La Página de Personaje gana lo mismo, pero el Corpus de hoy no construye ninguna.

**Segunda pasada de revisión (2026-11-15).** 33 hallazgos externos: 10 parches (4 medios, 6 bajos), 0 diferidos, 23 rechazados (detalle en el Review Triage Log). Ficheros: `src/pages/obra/[autor]/[slug]/[...page].astro` (selector del primer panel del pie sin nombrar al vecino), `tests/unit/obra-pagina.test.ts`, `tests/unit/paneles.test.ts`, `tests/unit/pagina-de-personaje.test.ts` (2+ sin panel, semblanza en el panel, hoja emitida), `tests/e2e/paneles.spec.ts` (contraste del rótulo y del `<summary>`), `tests/e2e/accesibilidad.spec.ts` (constante muerta), `tests/e2e/ayuda/corpus.ts`. `followup_review_recommended: true` (parches: 4 medios y 6 bajos; puntuación 3 × 4 + 6 = 18). Verificación: `npx vitest run` de `pagina-de-personaje`, `paneles`, `obra-pagina`, `buscar-en` y `como-citar-obra-build`, 120 verdes (y `paneles` de nuevo tras el último parche); `npx astro check`, 0 errores; `npx playwright test` de `paneles`, `incipit`, `ficha-tecnica`, `accesibilidad` y `desplegable`, 360 verdes y 24 omitidos por diseño, con las puertas de primera pantalla en verde; `npm test` completo, desacoplado: 209 ficheros, 9.058 pruebas, verde.

**Tercera pasada de revisión (2026-11-15, última ronda).** 40 hallazgos externos (19 + 8 + 1 + 6 + 6), que deduplicados dan 5 parches (todos bajos, sobre 7 hallazgos), 0 diferidos nuevos y 33 rechazados (detalle en el Review Triage Log). Ficheros: `tests/unit/pagina-de-personaje.test.ts` (el Personaje D gana una Cita sin obra y se exige el panel Obra en `cierre-texto` con el pie; la regla `.obras-del-personaje` tiene que existir antes de negar su margen), `tests/unit/buscar-en.test.ts` (tras el formulario, el panel nombra su familia: Tema con los Temas, herramientas con «Cómo citar»), `tests/unit/como-citar-obra-build.test.ts` (comentario de `APERTURA` con el selector vigente) y este spec (selector del Resumen y el párrafo de la primera pasada, que contradecía al frontmatter). `followup_review_recommended: true` (parches: 0 altos, 0 medios, 5 bajos; puntuación 3 × 0 + 5 = 5). Verificación: `npx vitest run` de `pagina-de-personaje` (23), `buscar-en` y `como-citar-obra-build`, verde; `npx astro check`, 0 errores; `npm test` completo, desacoplado: 209 ficheros, 9.059 pruebas, verde. Sin cambios en `src/` ni en `tests/e2e/`, así que Playwright no se repitió.

**Riesgos residuales.** La Página de Personaje solo se prueba en la unitaria (el Corpus real no tiene Personajes): el contraste y el foco sobre su panel los cubren los de la Página de Autor, que usa los mismos tokens y la misma primitiva. Asentar la decisión 3 en DESIGN.md sigue pendiente de Héctor (`bmad-ux`, en `deferred`).
