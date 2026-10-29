---
title: 'El Directorio filtra al teclear, sin pensar en tildes'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_revision: 'f76705484235051b73db2c17247ee4a3e510fd94'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-26-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md'
warnings: ['oversized']
deferred:
  - summary: >-
      En Safari/WebKit, sin anclaje de desplazamiento, una página ya desplazada salta lo que mide el campo al insertarlo.
    evidence: |-
      DESIGN.md y EXPERIENCE.md confían el «no se mueve» al anclaje de desplazamiento del navegador [ASSUMPTION], y la implementación hace exactamente eso (`overflow-anchor` por omisión). WebKit no implementa el anclaje, y los dos proyectos de Playwright son Chromium, así que en iOS Safari —el que importa para la comprobación a 360 px— un visitante desplazado a un grupo antes de que llegue el guion ve la lista bajar lo que mide el campo. Compensarlo en el guion (sumar a `scrollY` lo insertado cuando la página ya está desplazada y el navegador no ancla) es decisión de diseño, porque contradice lo que el diseño declara; pendiente de Héctor (bmad-ux), sin tocar `_bmad-output/planning-artifacts/`.
    location: >-
      src/components/FiltroDelDirectorio.astro (raiz.insertBefore(campo, region))
    severity: medium
---

<intent-contract>

## Intent

**Problem:** `/autores/` (26.3) y `/obras/` (26.4) solo se recorren por letras: quien sabe a quién busca no puede teclear «gonzalez» y ver a González Prada. Historia 26.6, `epics.md` líneas 7233-7300 (autoritativo); UX-DR58, UX-DR81, UX-DR85, UX-DR86; `DESIGN.md § Búsqueda → Campo de búsqueda` (335-339) y `§ Directorios → Campo de filtro` (366-369); `EXPERIENCE.md § Campo de filtro del Directorio` (286-294) y `§ Mensajes de estado` (476-480).

**Approach:** El primer guion empaquetado de la v8: un `<script>` procesado por Astro en un componente `FiltroDelDirectorio.astro`, que solo usan los dos Directorios, inserta al cargar el Campo de búsqueda de la v8 (que nace aquí, `CampoDeBusqueda.astro`) desde un `<template>`, filtra la lista por subcadena de `normalizar` y anuncia el recuento por una región `role="status"` del HTML inicial con un segundo ritmo (tras la pausa de tecleo y solo si la frase cambia). La decisión pura vive en `src/lib/filtroDelDirectorio.ts`; `astro.config.mjs` impide que el guion vaya en línea, y entra en la lista cerrada de `src/lib/guiones.ts` con su tope.

## Boundaries & Constraints

**Always:**
- AD-3: el guion importa `normalizar` de `src/lib/normalizar.ts`; nadie la copia ni pliega tildes por su cuenta. El texto de cada fila y lo tecleado pasan por ella; casa si `normalizar(fila).includes(normalizar(tecleado))`. Un tecleado que normaliza a `''` es el campo vacío.
- AD-6: `vite.build.assetsInlineLimit` es una función que devuelve `false` para `*.js` y `undefined` (regla por omisión) para lo demás, con comentario que dice que se comprobó en Astro 7.2.0 (`shouldInlineScriptChunk` de `astro/dist/core/build/plugins/plugin-scripts.js`) y se reverifica al subir de versión.
- La pausa (`PAUSA_DE_TECLEO_MS = 700`) y el tope (`MAX_BYTES_GUION_DEL_FILTRO`, lo medido más ~400, con la medida en su docblock y en el commit) viven en `src/lib/umbrales.ts`. El segundo ritmo vive en `src/lib/anuncio.ts` junto a `anunciar`, sin importar nada; el guion importa los dos, nunca por `define:vars`.
- Lo tecleado entra en la región y en el enlace solo por `textContent`/`href` (con `encodeURIComponent`), nunca por `innerHTML`/`insertAdjacentHTML`.
- Sin guion (o si el fichero no carga) no hay campo, la región está vacía y sin `hidden`, la lista está entera y las letras funcionan; vacía, la región no ocupa alto ni deja hueco entre el `h1` y las letras (siguen a 3 × `--unidad` del `h1`).
- Tokens de `tokens.css`, nunca literales. Inter en el campo, la región y el enlace; ninguna serif nueva.
- Las pruebas e2e toman sus ejemplos de la página servida y exigen que no estén vacíos; ninguna cifra fija.
- Los Directorios siguen sin Modelo de Ingreso, idénticos con todo encendido o apagado; el guion no lee ni escribe `location`/`history`, no escucha `click` en la ventana y no lleva contenido del Corpus.

**Block If:**
- Astro 7.2 inlinea el guion pese a `assetsInlineLimit`, o no permite emitirlo como fichero sin tocar otra superficie: HALT (AD-6 lo da por comprobado).
- El tope de `MAX_BYTES_DE_GUION` o de otra entrada tendría que subir para que esto quepa.

**Never:** botón en el campo; `placeholder`; formulario o envío; autocompletado; filtrar por principio de palabra; índices de Temas/Colecciones; la familia `directorio` en las series (26.7); `data-jornada`/alcance (26.8); el barrido de reflujo a 320 px de todas las superficies (26.9); destacados o «Buscar en…» (27); editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`; atributos por fila que engorden `/obras/` (tiene tope, `MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Casa sin tildes | `/autores/`, «gonzalez» | Filas cuyo nombre normalizado contiene «gonzalez» (Manuel González Prada entre ellas); grupos sin ninguna, fuera con su letra; letras y todos los «Volver a las letras», fuera | — |
| Mayúsculas y tildes | «MARTÍ» y «marti» | El mismo conjunto, con José Martí | — |
| Eñe plegada | `/obras/`, «espana» | Queda «Historia de la decadencia de España» bajo su Autor | — |
| Autor casa en `/obras/` | Nombre del Autor casa | Su cabecera y todas sus Obras | — |
| Solo una Obra casa | Título casa, nombre no | Cabecera del Autor + esas Obras | — |
| Recuento | Pausa de 700 ms sin teclear | «14 autores.» / «1 autor.» / «13 obras.» / «1 obra.» en la región | — |
| Misma frase | «gonz» → «gonza», misma cifra | La región no se reescribe | — |
| A cero | Nada casa | Sin letras ni filas; tras la pausa «Ningún autor tiene «x» en el nombre.» / «Ninguna obra tiene «x» en el título ni en su autor.»; al momento, debajo, «Buscar «x» en las citas» → `/buscar/?q=<x codificado>`, misma pestaña | — |
| Texto hostil | `<img src=x onerror=…>` | Se ve escrito tal cual en frase y enlace; ningún elemento creado ni código ejecutado | — |
| Solo signos | «  ¿? » | Como vacío: región vacía, todo vuelve | — |
| Vaciar | Campo a `''` | Región vacía al momento (cancela la pausa pendiente); vuelven filas, grupos, letras y «Volver» | — |
| Sin guion / fichero caído | JS apagado o petición abortada | Sin campo; lista entera; región vacía sin alto; letras saltan | — |

</intent-contract>

## Code Map

- `src/pages/autores.astro`, `src/pages/obras.astro` -- `h1` y `div.listado[data-pagefind-ignore="all"]` con `LetrasDeSalto` + `GrupoDeLetra`; el `.listado` tiene `margin-top: 3 × --unidad` («ahí insertará el campo la 26.6»). Docblocks que dicen «sin filtro… lo trae la 26.6»: actualizarlos.
- `src/components/GrupoDeLetra.astro` -- `section.grupo` > `Rotulo h2` + lista + `p.volver`; `.grupo:first-of-type` 4u, resto 5u.
- `src/components/LetrasDeSalto.astro` -- `nav#letras.letras`.
- `src/components/FilaDeAutor.astro` / `FilaDeBloque.astro` -- `li.fila-de-bloque[data-zona]` con `span.nombre` (texto a casar en `/autores/`).
- `src/components/ListaDeObras.astro` -- `ul.lista-de-obras > li > a > span.titulo` (el título es su **primer nodo de texto**; detrás van año y recuento ocultos) ; `li + li` pone el filete. Compartido con la Página de Autor.
- `/obras/`: `section.autor` > `h3[data-zona] a` (nombre del Autor) + `ListaDeObras`; `.autor:first-of-type` 2u, resto 4u.
- `src/lib/normalizar.ts:33` -- `normalizar` (sin imports; pliega ñ→n, que es lo que se quiere aquí).
- `src/lib/anuncio.ts` -- primer ritmo `anunciar`; su docblock ya anuncia que «el segundo ritmo, el del tecleo… vivirá aquí también». `String(anunciar)` viaja en guiones en línea: no tocar su texto.
- `src/lib/umbrales.ts:378-483` -- `MAX_BYTES_DE_GUION` y los topes de la lista cerrada (patrón de docblock con medida); sin imports, apto para el cliente.
- `src/lib/guiones.ts` -- `GUIONES_EXTERNOS` (`id: 'medicion' | 'imagen' | 'pagefind'`); su cabecera lista los cuatro sitios a tocar al ampliarla.
- `src/lib/atribucion.ts:192,222` -- `recuentoDeAutores`, `recuentoDeObras` (importa `superficies.ts`/`marca.ts`: no apto para el cliente).
- `src/lib/superficies.ts:416` -- `rutaDeLaBusqueda()` = `/buscar/`.
- `src/pages/buscar.astro:302-322,426-465` -- campo actual (serif, a cambiar en la 27) y región `.estado:empty { margin: 0 }`: patrón de región vacía sin alto.
- `src/styles/tokens.css` -- `--pie` 13px (caption), `--cuerpo-lg` 17px, `--cuerpo-md`, `--tinta`, `--tinta-apagada`, `--contorno` (outline), `--siena` (primary), `--unidad`, `--zona-de-toque`, `--grosor-filete`; `:focus-visible` global (l.124).
- `astro.config.mjs` -- `defineConfig` sin bloque `vite`.
- `node_modules/astro/dist/core/build/plugins/plugin-scripts.js` -- inlinea un guion procesado si cabe en `assetsInlineLimit`; inlineado sale como `<script type="module">…</script>` con cuerpo.
- `tests/unit/ayuda/guion.ts` -- `guionesEnLineaConTipo` (`modulo`), `guionesExternosDe`, `descargaDeLaEntrada` (sigue imports estáticos).
- `tests/unit/medicion.test.ts` -- 1757 (ids de la lista), 1903 `CORPUS_MEDIDO` (ya construye `/autores/` y `/obras/`), 2221 (todo `<script src>` casa y cabe; «las tres entradas se piden»), 2342 (sin contenido en línea), 2435 (rAF), 3048 (regiones `role=status` ≤ guiones que llaman `anunciar`: fallará en los Directorios).
- `tests/unit/directorio-de-autores.test.ts`, `directorio-de-obras.test.ts` -- construyen un sitio y leen `dist/autores|obras/index.html`.
- `tests/e2e/directorio-de-autores.spec.ts`, `directorio-de-obras.spec.ts` -- patrón de ejemplos leídos de la página servida; `tests/e2e/accesibilidad.spec.ts:313-400` -- barrido axe con `ETIQUETAS_DEL_BARRIDO`.

## Tasks & Acceptance

**Execution:**
- `src/lib/umbrales.ts` -- añadir `PAUSA_DE_TECLEO_MS = 700` (docblock: AD-9, la reutiliza `/buscar/` en la 27) y `MAX_BYTES_GUION_DEL_FILTRO` (medido + ~400). -- nombres únicos.
- `src/lib/anuncio.ts` -- exportar el segundo ritmo, p. ej. `ritmoDeTecleo(region, pausa)` → `{ anunciar(texto), vaciar() }`: `anunciar` reprograma un temporizador y, al vencer, escribe `textContent` solo si difiere del actual; `vaciar` cancela y escribe `''`. Sin imports; docblock con los dos ritmos.
- `src/lib/recuentos.ts` (nuevo, sin imports) -- mover `recuentoDeAutores` y `recuentoDeObras`; `atribucion.ts` los reexporta (la Tarjeta y las pruebas no cambian). -- un solo dueño apto para el cliente.
- `src/lib/filtroDelDirectorio.ts` (nuevo, puro; importa solo `normalizar.ts` y `recuentos.ts`) -- `type DirectorioFiltrable = 'autores' | 'obras'`; `ETIQUETA_DEL_FILTRO` («Escribe parte del nombre.», «Escribe parte del título o del autor.»); una función que, dado un modelo `grupos → bloques { cabecera?: string; filas: string[] }` y lo tecleado, devuelve qué filas, bloques y grupos quedan, cuántas filas y si la consulta es vacía (cabecera que casa ⇒ todas sus filas); `fraseDelFiltro(directorio, n, tecleado)` (recuento con `.` final, o la frase a cero con lo tecleado recortado); `textoDeBuscarEnLasCitas(t)`; `rutaDeBuscarEnLasCitas(base, t)` = `base + '?q=' + encodeURIComponent(t)`.
- `src/components/CampoDeBusqueda.astro` (nuevo) -- `label` visible encima (Inter `--pie`, `--tinta-apagada`, a `--unidad`) + `input type="search"` `autocomplete="off"` sin `placeholder`: Inter `--cuerpo-lg`, `--tinta`, fondo transparente, sin caja ni radio, filete inferior `--grosor-filete` `--contorno`, alto mínimo `--zona-de-toque`; con `:focus` el filete pasa a 2px `--siena` (el anillo global no se toca); sin la cruz nativa de `type="search"`. Props `id`, `etiqueta`. Docblock: nace aquí; la 27 y la 28 le añaden botón y `name`.
- `src/components/FiltroDelDirectorio.astro` (nuevo) -- prop `directorio`; pinta `div.filtro[data-filtro=<directorio>][data-buscar=rutaDeLaBusqueda()][data-pagefind-ignore="all"]` con un `<template>` (el `CampoDeBusqueda` y `p.a-cero[data-zona="directorio"][hidden] > a` sin `href`) y `p.recuento[role="status"]` vacía; estilos: campo a 3 × `--unidad` del `h1`, región a 2 × bajo el campo en Inter `--pie` `--tinta-apagada` y `:empty { margin: 0 }`, `.a-cero` a `--unidad` con el enlace en `--cuerpo-md`, `--siena`, subrayado, `inline-flex` de alto `--zona-de-toque`. Su `<script>` procesado: clona la plantilla delante de la región, lee una vez el modelo del DOM (`/autores/`: `span.nombre` de cada `li` de cada `section.grupo`; `/obras/`: texto del `h3` y primer nodo de texto de cada `span.titulo`), y en `input` repinta con `hidden` (filas, `section.autor`, `section.grupo`, `#letras`, cada `p.volver`), muestra/actualiza el enlace a cero y llama al ritmo con `fraseDelFiltro`; vacío → `vaciar()` y todo de vuelta.
- `src/pages/autores.astro`, `src/pages/obras.astro` -- `<FiltroDelDirectorio>` entre el `h1` y `.listado`; docblocks al día.
- `src/components/GrupoDeLetra.astro`, `src/pages/obras.astro`, `src/components/ListaDeObras.astro` -- que los ritmos aguanten lo oculto: primer grupo/Autor **visible** a 4u/2u (p. ej. todos al ritmo del primero y `:not([hidden]) ~ .grupo` al siguiente), filete de `ListaDeObras` con `li:not([hidden]) ~ li` en vez de `li + li`; sin cambio visible sin filtro; `[hidden]` gana donde un `display` lo pisara.
- `astro.config.mjs` -- `vite.build.assetsInlineLimit` como función (Always).
- `src/lib/guiones.ts` -- entrada `id: 'filtro'` (tipo ampliado), `cuando`, `reconoce` del fichero que emite Astro para el `<script>` de `FiltroDelDirectorio.astro` (comprobar el nombre real en `dist/_astro/`), `tope: MAX_BYTES_GUION_DEL_FILTRO`.
- `tests/unit/medicion.test.ts` -- ids con `'filtro'`; «las cuatro entradas se piden»; nueva: ningún `<script type="module">` con cuerpo en las dos construcciones, y el `<script type="module" src>` del filtro solo en `/autores/` y `/obras/`; el fichero del filtro sin contenido del Corpus de la prueba ni `location`/`history`/`requestAnimationFrame`; la de regiones `role=status` cuenta como anunciante el guion de la entrada `filtro` en la página que lo pide.
- `tests/unit/filtro-del-directorio.test.ts` (nuevo, sin build) -- la matriz I/O sobre la función pura y las frases (singulares, cero, signos, `<img…>` tal cual, `encodeURIComponent`); `ritmoDeTecleo` con temporizadores falsos (nada antes de 700 ms, una escritura, sin reescritura de la misma frase, `vaciar` cancela).
- `tests/unit/directorio-de-autores.test.ts`, `directorio-de-obras.test.ts` -- sobre `dist/`: región `role="status"` vacía y sin `hidden`; ningún `<input>` fuera del `<template>`; la plantilla con su etiqueta y sin `placeholder`; la lista entera (todas las filas, letras y «Volver»).
- `tests/e2e/filtro-del-directorio.spec.ts` (nuevo) -- los dos proyectos; `page.clock` para la pausa; ejemplos y esperados calculados con `normalizar` sobre lo leído de la página antes de teclear (exigiendo no vacío y que estén González Prada, José Martí y la obra de España); además: orden de tabulación campo → letras → lista; sin `placeholder`; anclaje (retener con `page.route` el fichero, desplazar a un grupo, soltarlo: su `top` no cambia ±1 px; sin desplazar, las letras bajan); sin guion y con el fichero abortado; foco con anillo y filete siena; axe con `ETIQUETAS_DEL_BARRIDO` con el campo, con texto y a cero en los dos.
- `AGENTS.md` -- en «Conventions», una frase sobre el segundo ritmo (`src/lib/anuncio.ts`, `PAUSA_DE_TECLEO_MS`).

**Acceptance Criteria:**
- Given `npm run build`, when se mira `dist/`, then `/autores/` y `/obras/` (y ninguna otra página) piden el filtro con `<script type="module" src="/_astro/…">`, no hay ningún `<script type="module">` con cuerpo, y el fichero con sus importaciones estáticas cabe en `MAX_BYTES_GUION_DEL_FILTRO`.
- Given la matriz I/O, when se teclea en el navegador, then cada fila se cumple, el recuento llega a los ~700 ms y no antes, y la región no se reescribe con la misma frase.
- Given el campo insertado, when se mide, then está a 3 × `--unidad` del `h1`, la región (con texto) a 2 × bajo él, sin botón ni `placeholder`, y el enlace a cero mide 44 px, es siena subrayado y su contenedor más cercano con zona es `directorio`.
- Given la página desplazada a un grupo antes de que cargue el guion, when se inserta el campo, then lo que el visitante tenía delante no se mueve.
- Given `/obras/` filtrada, when queda el primer Autor visible tras uno oculto, then está a 2 × `--unidad` de su rótulo y su primera Obra sin filete encima.
- Given el barrido axe 2.2 AA, when corre con el campo, con texto y a cero, then no hay violaciones.

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

Las capas de revisión de esta pasada son externas (blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor) y no traían hallazgos todavía: la revisión independiente viene después.

### 2026-10-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 11 (high 0, medium 3, low 8)
- defer: 1 (high 0, medium 1, low 0)
- reject: 11 (high 0, medium 0, low 11)
- addressed_findings:
  - `[medium]` `[patch]` El enlace a cero y la lista saltaban ~700 ms después de pintarse, cuando la frase llegaba a la región vacía (blind-hunter, intent-alignment f). Un primer arreglo con un renglón reservado (`min-height: 1lh`) no bastaba: en `movil` la frase a cero con lo hostil ocupa varias líneas y el enlace seguía bajando 43 px. Arreglo final: una **sombra** del recuento (`p.sombra[aria-hidden]` en la plantilla, `visibility: hidden`) que comparte fila de rejilla con la región y recibe la frase al teclear; la fila toma su alto con la lista y el enlace, y cuando la frase llega a la región no se mueve nada. Sin guion la rejilla solo tiene la región vacía y no mide nada.
  - `[medium]` `[patch]` El pegamento del guion (modelo leído del DOM, `hidden` por posición, letras y «Volver», enlace a cero, región) solo lo probaba Playwright, que el CI no corre (blind-hunter, verification-gap, intent-alignment d/k). Nuevo `tests/unit/ayuda/filtroEjecutado.ts`: ejecuta en `node:vm` el fichero **construido** de `/_astro/` contra un DOM de mentira con la forma del `dist/` de la prueba (cuya lectura fija además el contrato de marcado: `li.fila-de-bloque` con `.nombre`, `h3` que solo lleva el enlace del Autor, el título como primer nodo de texto de `.titulo`), con reloj fingido y lo esperado calculado con `normalizar` sin `filtroDe`. Corre en `directorio-de-autores.test.ts` y `directorio-de-obras.test.ts`. Comprobado por mutación: cambiar `ritmo.anunciar(...)` por `ritmo.vaciar()` lo pone en rojo.
  - `[medium]` `[patch]` Criterios sin prueba automática (ac-auditor 1-5, intent-alignment a, blind-hunter «el destino del enlace»): nuevas e2e de subcadena dentro de palabra («mar» sobre la lista servida), de `/obras/` con coincidencias (sin letras ni «Volver», cada grupo con su letra, primer Autor visible a 2 × del rótulo y su primera Obra visible sin filete —el criterio del spec que solo se había mirado a mano—), del campo en reposo (filete `--grosor-filete` en `--contorno`, sin caja, sombra, radio ni fondo; etiqueta a `--unidad`), del enlace a cero (a `--unidad` bajo la fila del recuento antes y después de la frase, sin moverse; `--cuerpo-md` en la sans) y del enlace seguido hasta `/buscar/?q=` con lo tecleado en `#consulta`.
  - `[low]` `[patch]` El filete del foco era un `2px` literal: ahora `calc(var(--grosor-filete) * 2)`; el alto lo da `min-height` con `border-box`, así que no mueve nada.
  - `[low]` `[patch]` El modelo se leía con `li` y `h3` a secas: ahora `li.fila-de-bloque`, `h3 a` y `.lista-de-obras > li`, también en los ayudantes de la e2e.
  - `[low]` `[patch]` La prueba «toda isla que anuncia» contaba la etiqueta del filtro como anunciante por estar: ahora exige que el fichero descargado busque `[role="status"]`, programe con `setTimeout` y escriba `textContent`.
  - `[low]` `[patch]` El comentario de la prueba del `700` decía más de lo que la prueba mira: corregido; y la ventana se veda también por `self`/`globalThis` y cualquier escucha `"click"`.
  - `[low]` `[patch]` El campo lleva `autocapitalize="none"` y `autocorrect="off"`, además de `spellcheck="false"`, para que el teclado del móvil no cambie un trozo de nombre por otra palabra. (`enterkeyhint` y un Intro que quite el foco, rechazados: el campo no envía nada y la 27 le pondrá su botón.)
  - `[low]` `[patch]` La e2e de `/obras/` usaba `find(...)!`: ahora exige el ejemplo con un mensaje que dice qué falta.
  - `[low]` `[patch]` `tests/unit/ayuda/filtro.ts` contaba regiones, plantillas e `<input>` en toda la página: ahora dentro de `main` y del contenedor del filtro.
  - `[low]` `[patch]` `AGENTS.md`, «Known pitfalls»: todo `<script>` procesado sale como fichero y entra en `GUIONES_EXTERNOS` con su tope, y una constante calculada en `src/lib/umbrales.ts` lleva `/* @__PURE__ */` porque el filtro la importa.

Rechazados: la frase visible del recuento va por detrás de la lista durante la pausa (es el diseño: «la lista se repinta al teclear, y la frase llega después», y vaciar la región en cada tecla rompería «solo si cambió»); `data-buscar` ausente (lo pone siempre el build); `sprint-status.yaml` y el cierre sin revisión (lo lleva el orquestador del bucle, y esta es la revisión); frases sin tope de longitud o con «» tecleadas (cosmético; el enlace parte línea con `overflow-wrap: anywhere`); el orden de tabulación a cero (lo oculto va con `display: none` y el enlace sigue a la región en el DOM); `:global(.listado [hidden])` (es lo que `hidden` significa en el listado); las pruebas de `dist/` sobre corpus de prueba (el guion no lleva Corpus); el Campo de búsqueda probado solo dentro del filtro (su reutilización es de la 27); `@__PURE__` en `umbrales.ts` (dentro de lo que el contrato permite); la lectura «comparar con la región» frente a «con lo último anunciado» (nada más escribe en la región); `define:vars` y singulares en el navegador (la fuente no lleva `define:vars` y los singulares los fija la prueba pura).

### 2026-10-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 13 (high 0, medium 2, low 11)
- defer: 0
- reject: 22 (high 0, medium 1, low 21)
- addressed_findings:
  - `[medium]` `[patch]` Una letra a medio componer filtraba (blind-hunter, edge-case-hunter): con la tecla muerta de la tilde el valor lleva el signo suelto («gonz´»), que `normalizar` no quita, y la lista se vaciaba y asomaba «Buscar «gonz´» en las citas» a cada vocal con tilde. El guion ignora el `input` con `isComposing` y filtra con `compositionend`; lo fijan el guion ejecutado (`filtroEjecutado.ts`, comprobado por mutación) y una e2e nueva en las dos rutas.
  - `[medium]` `[patch]` Cuando la frase nueva era más corta que la anterior —la frase a cero de dos líneas que pasa a «14 autores.»—, la fila del recuento seguía alta durante la pausa y la lista subía 700 ms después (edge-case-hunter). La región va ahora fuera del flujo, encima de la sombra (`position: absolute` en su área de rejilla), y el alto de la fila lo da solo la sombra, que cambia al teclear; nueva aserción e2e: de la frase a cero a una con coincidencias, el primer grupo no se mueve cuando llega la frase.
  - `[low]` `[patch]` El tope del filtro tenía unos 270 bytes de margen y no los ~400 que pide el contrato (blind-hunter, intent-alignment): rederivado con la medida de hoy, 3.167 + ~400 = **3.570**, con la medida en su docblock.
  - `[low]` `[patch]` Cifras rancias en `AGENTS.md` («3.510 bytes en vez de 2.969»): ahora dice lo que no envejece, «unos 540 bytes más». El Auto Run Result de este spec, al día abajo.
  - `[low]` `[patch]` Una palabra larga sin cortes en la frase a cero ensanchaba la página a 360 px (edge-case-hunter): `overflow-wrap: anywhere` en la región y la sombra, como ya tenía el enlace.
  - `[low]` `[patch]` `tests/unit/ayuda/filtro.ts` llevaba `/buscar/` escrito a mano: ahora pregunta a `rutaDeLaBusqueda()`.
  - `[low]` `[patch]` Nada del `dist/` fijaba que el filtro y el listado fueran hermanos, y sin eso el guion no inserta nada sin decir nada (verification-gap): `comprobarFiltroEnElHtml` exige que el contenedor del filtro se cierre justo antes del listado, sin más que la petición del guion entre los dos.
  - `[low]` `[patch]` El primer grupo **visible** a 4 × y los siguientes a 5 × no lo medía ninguna prueba (verification-gap): e2e nueva en las dos rutas, filtrando por una fila del último grupo (exige el primero oculto) y por un trozo que deja varios.
  - `[low]` `[patch]` Las e2e no exigían los ejemplos de la historia (ac-auditor 2): «espana» exige «Historia de la decadencia de España» y «mar» exige a Josefa Amar y Borbón, sin caer a otro trozo.
  - `[low]` `[patch]` En `/autores/` no se comprobaba que los grupos que quedan conserven su letra (ac-auditor 4): añadido.
  - `[low]` `[patch]` «El guion importa el ritmo y la pausa, nunca por `define:vars` ni copiados» solo tenía un sustituto en `dist/` (ac-auditor 6): prueba nueva sobre la fuente de `FiltroDelDirectorio.astro`, sin build.
  - `[low]` `[patch]` El anclaje solo se probaba en `/autores/` y «las letras y la lista bajan» solo en `/obras/` y midiendo las letras (ac-auditor 7): las dos e2e, en las dos rutas, y la segunda mide también el primer grupo.
  - `[low]` `[patch]` El filete del foco se comparaba con `'2px'`: ahora con una sonda de `calc(var(--grosor-filete) * 2)` (ac-auditor 8).

Rechazados: las contradicciones del spec (el párrafo de la pasada sin hallazgos es histórico y ahora lo dice; `review_loop_iteration: 0` es lo que fija el flujo para una revisión nueva; la tarea con «2px» es el plan); la fila de `COLOCACION` para el enlace a cero (sin `href` en `dist/` no hay enlace que colocar; su `data-zona="directorio"` lo fija la prueba de la plantilla y la zona, la e2e); `firstChild` del título y `iniciar` mudo (el marcado lo fijan `filtro.ts` y el guion ejecutado sobre `dist/`, y ahora también el parentesco); reescribir `hidden` por tecla (sin coste medible, y bytes); el margen colapsado bajo el campo al filtrar (4 ×, coherente, y nada lo especifica); la especificidad de `li:not([hidden]) ~ li` (selecciona lo mismo que `li + li` sin filtro, y la Página de Autor no tiene reglas que compitan); `assetsInlineLimit` para todo `.js` (lo manda el contrato) y lo que no es `.js` (devuelve la regla por omisión); el acoplamiento con `umbrales.ts` (lo vigila el tope); que las e2e no corran en el CI (convención del proyecto); la prueba de cadenas del anunciante (el guion ejecutado es la de verdad); casos de borde puros sin caso real (bloque de `/obras/` sin Obras, «» tecleadas, longitud, la vuelta desde `/buscar/`); `aria-controls`/`aria-describedby` (fuera del contrato; la etiqueta dice qué hace el campo); `sprint-status.yaml` (lo lleva el orquestador); `data-buscar` ausente y Directorio sin grupos (el build los pone siempre); la lectura descriptiva de intent-alignment, con la fila del recuento en blanco durante la pausa (es la sombra: lo que salta, salta al teclear); el anclaje en WebKit (ya diferido); «sin icono» comprobado en el navegador (el pseudoelemento no se deja medir de forma fiable); singulares en el navegador (los fija la prueba pura); el nombre interno del fichero de Astro (informativo).

## Design Notes

- **Plantilla y no `createElement`:** etiqueta y enlace salen del build con los estilos de ámbito del componente, y el guion queda genérico y sin contenido. El `<template>` es inerte (la 26.8 ya prevé ignorarlo en el grafo) y su `<a>` no lleva `href` hasta la frase a cero, así que no es enlace interno para la prueba de zonas.
- **El enlace a cero se pinta con la lista, al momento; la frase, tras la pausa** (DESIGN: «la lista se repinta al teclear, y la frase llega después»).
- **Leer del DOM y no de `data-*` por fila:** `/obras/` está a ~230 KB de un tope de 290 KiB; un atributo por fila se comería el margen.
- **Ritmo:**
  ```ts
  export function ritmoDeTecleo(region: { textContent: string | null }, pausa: number) {
    let espera: ReturnType<typeof setTimeout> | undefined;
    return {
      anunciar(texto: string) { clearTimeout(espera); espera = setTimeout(() => { if (region.textContent !== texto) region.textContent = texto; }, pausa); },
      vaciar() { clearTimeout(espera); region.textContent = ''; },
    };
  }
  ```

## Verification

**Commands:**
- `npx vitest run tests/unit/filtro-del-directorio.test.ts` -- verde.
- `npx vitest run tests/unit/directorio-de-autores.test.ts` y `tests/unit/directorio-de-obras.test.ts` -- verdes.
- `npx vitest run tests/unit/medicion.test.ts` (con `correr.sh`/`esperar.pl` si pasa de 8 min) -- verde, con el parte del tope del filtro.
- `npx astro check` -- 0 errores.
- `npm run build` y luego `npx playwright test tests/e2e/filtro-del-directorio.spec.ts tests/e2e/directorio-de-autores.spec.ts tests/e2e/directorio-de-obras.spec.ts` -- verdes en `movil` y `escritorio`.
- `npx playwright test tests/e2e/accesibilidad.spec.ts --project=escritorio` -- verde.

**Manual checks (if no CLI):**
- Con el sitio construido servido por `tests/servidor.mjs`, teclear «mar» en `/autores/` y «quijote» en `/obras/` a 360 px: lista, recuento y enlace a cero como en `DESIGN.md`.

## Auto Run Result

**Resumen.** `/autores/` y `/obras/` filtran al teclear por subcadena de `normalizar` (AD-3): sin tildes, sin mayúsculas y con la eñe plegada. El filtro es el primer guion empaquetado de la v8: el `<script>` procesado de `FiltroDelDirectorio.astro`, que Astro emite como `/_astro/FiltroDelDirectorio.astro_astro_type_script_index_0_lang.<resumen>.js` y que nunca va en línea (`vite.build.assetsInlineLimit` devuelve `false` para los `.js`). Inserta el Campo de búsqueda de la v8 (`CampoDeBusqueda.astro`, nace aquí) desde un `<template>`, repinta la lista con `hidden`, pone al momento el enlace «Buscar «x» en las citas» a cero y anuncia la frase por la región `role="status"` del HTML inicial con el segundo ritmo (`ritmoDeTecleo`, tras `PAUSA_DE_TECLEO_MS` = 700 y solo si cambia). Sin guion, o con el fichero caído, no hay campo, la región vacía no ocupa alto y la lista está entera.

**Ficheros.**
- `src/lib/filtroDelDirectorio.ts` (nuevo) — la decisión pura: `filtroDe`, `fraseDelFiltro`, `textoDeBuscarEnLasCitas`, `rutaDeBuscarEnLasCitas`, `ETIQUETA_DEL_FILTRO`.
- `src/lib/recuentos.ts` (nuevo) — `recuentoDeAutores` y `recuentoDeObras`, sin importaciones; `atribucion.ts` los reexporta.
- `src/lib/anuncio.ts` — `ritmoDeTecleo`, el segundo ritmo, junto a `anunciar` (sin tocar su texto).
- `src/lib/umbrales.ts` — `PAUSA_DE_TECLEO_MS = 700`, `MAX_BYTES_GUION_DEL_FILTRO` (3.370 al construir, medido 2.969 + ~400; 3.570 tras la revisión 2, medido 3.167 + ~400) y `@__PURE__` en `CORTES_DE_SERIE`/`CORTES_DE_SM8` para que el empaquetado no arrastre la lista de cortes al navegador (sin la marca, 3.510 bytes).
- `src/lib/guiones.ts` — entrada `filtro` de la lista cerrada, con su `reconoce` y su tope.
- `src/components/CampoDeBusqueda.astro` (nuevo) — etiqueta visible, `type="search"` sin `placeholder` ni cruz nativa, Inter `--cuerpo-lg`, filete que pasa a 2px siena con el foco además del anillo.
- `src/components/FiltroDelDirectorio.astro` (nuevo) — plantilla, región, estilos y el guion.
- `src/pages/autores.astro`, `src/pages/obras.astro` — el filtro entre el `h1` y el listado; docblocks al día; en `/obras/`, el primer Autor **visible** a 2 × del rótulo.
- `src/components/GrupoDeLetra.astro` — el primer grupo **visible** a 4 ×, los demás a 5 ×.
- `src/components/ListaDeObras.astro` — el filete con `li:not([hidden]) ~ li` (igual que `li + li` sin filtro).
- `astro.config.mjs` — `vite.build.assetsInlineLimit` como función, comprobada en Astro 7.2.0.
- `AGENTS.md` — la convención del segundo ritmo.
- `tests/unit/filtro-del-directorio.test.ts` (nuevo), `tests/unit/ayuda/filtro.ts` (nuevo), `tests/unit/directorio-de-autores.test.ts`, `tests/unit/directorio-de-obras.test.ts`, `tests/unit/medicion.test.ts`, `tests/e2e/filtro-del-directorio.spec.ts` (nuevo).

**Revisión 0 (pasada sin hallazgos).** Esta pasada no clasificó hallazgos (capas externas sin hallazgos aún): 0 parches, 0 diferidos, 0 rechazados. `followup_review_recommended: false` (puntuación 0: ningún parche).

**Verificación.**
- `npx vitest run tests/unit/filtro-del-directorio.test.ts` — 20/20 verdes.
- `npx vitest run tests/unit/directorio-de-autores.test.ts tests/unit/directorio-de-obras.test.ts` — 61/61 verdes.
- `npx vitest run tests/unit/medicion.test.ts tests/unit/superficies.test.ts tests/unit/ingreso-construido.test.ts tests/unit/filtro-del-directorio.test.ts` — 711/711 verdes, con el tope ya en 3.370.
- `npx astro check` — 0 errores, 0 avisos (8 *hints* ajenos a la historia).
- `npx astro build` — el filtro sale como fichero de 2.969 bytes, pedido solo por `/autores/` y `/obras/`; ningún `<script type="module">` con cuerpo.
- `npx playwright test tests/e2e/filtro-del-directorio.spec.ts tests/e2e/directorio-de-autores.spec.ts tests/e2e/directorio-de-obras.spec.ts` (con el `npm run build` del `webServer`) — 58/58 verdes en `movil` y `escritorio`.
- `npx playwright test tests/e2e/accesibilidad.spec.ts --project=escritorio` — 69/69 verdes.
- Comprobación a mano en el navegador sobre el `dist/` servido por `tests/servidor.mjs`: «gonzalez» deja tres Autores con González Prada y «3 autores.»; el texto `<img …>` sale tal cual en la frase y el enlace, sin crear ningún elemento; «espana» en `/obras/` deja «Historia de la decadencia de España» y «España Contemporánea», con el primer Autor visible a 2 × y su Obra sin filete.

**Matriz.** Cada fila tiene prueba que corrió y pasó: la pura en `filtro-del-directorio.test.ts` (casar, tildes, eñe, Autor y Obra en `/obras/`, recuento y singulares, misma frase, cero, hostil, signos, vaciar con temporizadores falsos) y la de navegador en `filtro-del-directorio.spec.ts` (todas, más sin guion y con el fichero abortado).

**Revisión 1 (2026-10-28).** 11 parches (0 altos, 3 medios, 8 bajos), 1 diferido, 11 rechazados; `followup_review_recommended: true` (puntuación 3 × 3 + 8 = 17). Lo que cambió:
- `src/components/FiltroDelDirectorio.astro` — la sombra del recuento (`p.sombra[aria-hidden]` en la plantilla) en la misma fila de rejilla que la región, que recibe la frase al teclear: nada salta cuando la frase llega; el modelo, por `li.fila-de-bloque`, `h3 a` y `.lista-de-obras > li`.
- `src/components/CampoDeBusqueda.astro` — filete del foco con el token (`calc(var(--grosor-filete) * 2)`); `autocapitalize="none"` y `autocorrect="off"`.
- `src/lib/umbrales.ts` — el docblock del tope con la medida nueva (3.098 bytes; el tope no se movió).
- `tests/unit/ayuda/filtroEjecutado.ts` (nuevo) — el guion construido, ejecutado en `node:vm` sobre el DOM del `dist/`; lo llaman `directorio-de-autores.test.ts` y `directorio-de-obras.test.ts`.
- `tests/unit/ayuda/filtro.ts` — recuentos dentro de `main`/del filtro, la sombra y los atributos nuevos del campo.
- `tests/unit/medicion.test.ts` — el filtro cuenta como anunciante solo si su fichero anuncia; ventana por cualquier nombre y `click`; comentario del `700` corregido.
- `tests/e2e/filtro-del-directorio.spec.ts` — subcadena dentro de palabra, `/obras/` con coincidencias y su ritmo, campo en reposo, enlace a cero quieto y en `--cuerpo-md`, enlace seguido hasta `/buscar/`.
- `AGENTS.md` — el escollo de los guiones procesados y de `umbrales.ts` en el cliente.

Verificación de la revisión: `npx vitest run tests/unit/directorio-de-autores.test.ts tests/unit/directorio-de-obras.test.ts tests/unit/filtro-del-directorio.test.ts` 83/83; `npx vitest run tests/unit/medicion.test.ts` 543/543; `npx vitest run tests/unit/superficies.test.ts tests/unit/ingreso-construido.test.ts` 148/148; `npx astro check` 0 errores, 0 avisos; `npx playwright test tests/e2e/filtro-del-directorio.spec.ts tests/e2e/directorio-de-autores.spec.ts tests/e2e/directorio-de-obras.spec.ts` 64/64 en `movil` y `escritorio` (el primer intento, con el renglón reservado, dio 2 rojos en `movil`, que llevaron a la sombra); `npx playwright test tests/e2e/accesibilidad.spec.ts --project=escritorio` 69/69. El fichero del filtro mide 3.098 bytes, bajo los 3.370.

**Riesgos.** La sombra iguala el alto de la fila al de la frase que vendrá, así que lo que salta, salta al teclear y no después; la frase visible sigue mostrando la cifra anterior durante la pausa, como dice el diseño. El anclaje en Safari queda diferido. El nombre del fichero que emite Astro (`…astro_astro_type_script_index_0_lang…`) es interno de Astro: si cambia al subir de versión, `reconoce` deja de casar y `medicion.test.ts` sale en rojo (lo pide una página y no está en la lista), que es lo que se quiere. Lo mismo `assetsInlineLimit`: si Astro dejara de consultarlo, el guion volvería en línea y lo diría la prueba de `dist/`. El anclaje del desplazamiento es del navegador (`overflow-anchor`), comprobado en Chromium; no en Safari ni Firefox.

**Revisión 2 (2026-10-28).** 13 parches (0 altos, 2 medios, 11 bajos), 0 diferidos, 22 rechazados; `followup_review_recommended: true` (puntuación 3 × 2 + 11 = 17). Lo que cambió:
- `src/components/FiltroDelDirectorio.astro` — el guion espera a la letra compuesta (`isComposing` en `input`, y `compositionend`); la región va fuera del flujo, encima de la sombra, que es la única que da alto a la fila; `overflow-wrap: anywhere` en la región y la sombra.
- `src/lib/umbrales.ts` — `MAX_BYTES_GUION_DEL_FILTRO = 3570` (medido 3.167 + ~400).
- `AGENTS.md` — el escollo de `@__PURE__` sin cifras que envejezcan.
- `tests/unit/ayuda/filtroEjecutado.ts` — eventos con `isComposing`, la escucha de `compositionend` y el caso de la letra a medio componer.
- `tests/unit/ayuda/filtro.ts` — `rutaDeLaBusqueda()`, y el filtro hermano del listado.
- `tests/unit/filtro-del-directorio.test.ts` — la fuente del guion importa el ritmo, la pausa y la decisión pura, sin `define:vars` ni la pausa escrita.
- `tests/e2e/filtro-del-directorio.spec.ts` — ejemplos de la historia exigidos (España, Josefa Amar y Borbón), letras de los grupos que quedan en `/autores/`, el primer grupo visible a 4 × y los demás a 5 ×, la letra a medio componer, la frase que mengua sin mover nada, anclaje y «letras y lista bajan» en las dos rutas, y el filete del foco contra el token.

Verificación de la revisión 2: `npx vitest run tests/unit/filtro-del-directorio.test.ts` 22/22; `npx vitest run tests/unit/medicion.test.ts tests/unit/filtro-del-directorio.test.ts tests/unit/directorio-de-autores.test.ts tests/unit/directorio-de-obras.test.ts` 628/628 (el filtro, 3.167 bytes de 3.570); mutación: quitar la guarda de `isComposing` pone en rojo `directorio-de-autores.test.ts`; `npx astro check` 0 errores, 0 avisos (8 *hints* ajenos); `npx playwright test tests/e2e/filtro-del-directorio.spec.ts tests/e2e/directorio-de-autores.spec.ts tests/e2e/directorio-de-obras.spec.ts tests/e2e/accesibilidad.spec.ts` (con el `npm run build` del `webServer`) 214/214 en `movil` y `escritorio`.

**Riesgos tras la revisión 2.** Con la región fuera del flujo, una frase que mengua se pinta durante la pausa más alta que su fila: su línea de más cae en el hueco de 4 × `--unidad` que hay hasta el primer grupo, y solo una frase a cero de tres líneas o más —un texto hostil o muy largo, en el móvil— llegaría a montarse sobre el rótulo durante esos 700 ms. Los eventos de composición de la e2e son sintéticos: la tecla muerta real de macOS y los IME no se han tecleado en un navegador. El anclaje en Safari sigue diferido.
