---
title: 'Historia 27.7 — Sin JavaScript, la búsqueda lleva a los Directorios'
type: 'feature'
created: '2026-10-29'
status: 'done'
baseline_revision: 'c7df3b9f1d4157980e8d774f613fd5272581880e'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-27-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred:
  - summary: >-
      EXPERIENCE.md § Zonas aún dice `resultado` para «también el de tipo Directorio», y los Directorios de los avisos de `/buscar/` van exentos (`directorios-del-aviso`): pendiente de Héctor (bmad-ux).
    evidence: |-
      El AC v8.2 de la 27.7 (decisión de Héctor del 2026-10-22) los exime de zona y el código lo cumple; la
      tabla de zonas de EXPERIENCE.md no se edita a mano (AGENTS.md) y queda desalineada hasta la próxima pasada de bmad-ux.
    location: >-
      _bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/EXPERIENCE.md
    severity: low
  - summary: >-
      La fila de resultado que pinta la isla (`filaDeResultado`) junta rótulo y título sin espacio, con un `aria-label` propio en Obra, Directorio, portada y Cita con Autor; la del aviso lleva el espacio para pasar `label-content-name-mismatch` de axe.
    evidence: |-
      Al barrer los avisos de la 27.7, axe marcó `label-content-name-mismatch` en la fila sin el espacio
      («DirectorioAutores» no está en «Directorio: Autores»), y la fila de la isla tiene esa misma forma
      desde la 26.x. Ningún barrido axe de `/buscar/` alcanza hoy una fila de la isla con `aria-label`.
      No lo causa la 27.7: el aviso se apartó del marcado de la isla en un nodo de texto para no heredarlo.
    location: >-
      src/components/Busqueda.astro filaDeResultado (a.append(clase, titulo))
    severity: low
  - summary: >-
      Una llegada con filtros de la dirección que no se pueden usar (frase de la 27.4) cuya búsqueda luego falla pinta el aviso del fallo y la frase de la 27.4 no se ve ni se anuncia, aunque la dirección ya se reescribió sin esos filtros.
    evidence: |-
      `resolverYBuscar` reemplaza la entrada y pasa `aviso` a `buscar`; si la búsqueda falla, el `catch`
      llama a `mostrarFallo()` sin él. Antes de la 27.7 el fallo no pintaba nada y la frase se perdía
      igual: es de la 27.4, solo que ahora el estado del fallo sí se ve. Decidir si la frase precede al
      anuncio del fallo cambia la frase literal que fija el intent-contract de la 27.7.
    location: >-
      src/components/Busqueda.astro resolverYBuscar / catch de buscar
    severity: low
---

<intent-contract>

## Intent

**Problem:** Sin guion, `/buscar/` es un `h1` y nada debajo (el formulario vive en un `<template>`); con guion, mientras el paquete no arranca —o si no llega a ejecutar— tampoco hay nada; y cuando el índice no carga (`pagefind.js`, su `init`, `search`, los datos, o el mapa y `filters()` que pide una `obra` de la dirección) la isla calla: no pinta, deja a la vista la búsqueda anterior como si fuera la de lo tecleado y la sigue asentando (FR-7, NFR-2, UX-DR92, AD-6, AD-13).

**Approach:** Un solo componente de aviso, con los dos Directorios como Resultados de tipo «Directorio», pintado tres veces en `/buscar/`: en `<noscript>`, en el HTML inicial como aviso previo (oculto sin guion, retirado por la isla al arrancar) y en un `<template>` que la isla inserta, en lugar de los resultados, cuando la búsqueda no puede correr; exento de zona por escrito y fuera del contenedor `resultado`.

## Boundaries & Constraints

**Always:**
- Frases literales (constantes en `src/lib/busqueda.ts`, que el componente pinta y la isla anuncia; nunca escritas dos veces): sin guion, p1 «Buscar y filtrar necesitan JavaScript, y este navegador no lo está ejecutando.» y p2 «Sin él, todos los autores y todas las obras se leen en sus directorios. Si llegaste desde la página de un autor, de una obra o de un tema, vuelve atrás: allí están sus citas.»; aviso previo, p1 «Si la búsqueda no aparece, todos los autores y todas las obras se leen en sus directorios.» y p2 «Si llegaste desde la página de un autor, de una obra o de un tema, vuelve atrás: allí están sus citas.»; fallo, p1 «No se ha podido cargar la búsqueda.» y p2 «Todos los autores y todas las obras se leen en sus directorios. Si llegaste desde la página de un autor, de una obra o de un tema, vuelve atrás: allí están sus citas.». La frase de volver atrás es una constante compartida.
- Composición (DESIGN.md § `/buscar/` sin JavaScript): los dos párrafos en `--cuerpo-lg`, p1 a 3 × `--unidad` de lo de encima y p2 a 2 ×; debajo, a 2 ×, una `ul role="list"` con dos `li.resultado > a > span.clase + span.titulo.en-sans`, igual que la fila que pinta la isla: rótulo `ETIQUETAS_DE_RESULTADO.directorio`, títulos `NOMBRE_DEL_DIRECTORIO_DE_AUTORES` y `NOMBRE_DEL_DIRECTORIO_DE_OBRAS` (los que da Pagefind, del `h1`), `href` de `rutaDelDirectorioDeAutores()` y `rutaDelDirectorioDeObras()`, `aria-label` «Directorio: Autores» / «Directorio: Obras», misma pestaña. Solo tokens; la fila de resultado tiene un solo juego de reglas, compartido con la lista de resultados (sin copiar valores).
- Cada instancia lleva en su raíz `data-sin-zona="directorios-del-aviso"`, motivo nuevo de `EXENCIONES_DE_ZONA` (decisión de Héctor del 2026-10-22, epics § 27.7 y § Épica 23), y ninguna cuelga de `[data-zona="resultado"]`.
- El aviso previo se oculta sin guion por CSS del propio componente (`@media (scripting: none)`), sin guion en línea ni clase puesta por guion; la isla lo quita del DOM (`remove()`) en cuanto encuentra todo lo que necesita y antes de insertar el formulario. Si `iniciar` sale antes, el aviso se queda.
- Fallo = cualquier rechazo del `try` de `buscar` cuya búsqueda sigue siendo la última lanzada (`mio === turno`), y `sinDatos` (una `obra` en la dirección sin mapa o sin `filters()`). Al pintarlo: lista vacía, «Mostrar 30 más» fuera (`quitarMas`), salida sin resultados oculta, sombra vacía, aviso insertado justo antes de la lista (bajo el formulario y el recuento), región `[data-estado]` apartada (`solo-para-lectores`) que anuncia p1 + « » + p2 con el primer ritmo (`anunciar`, guardado por `pintadas`), y `visto`/`estadoVisto`/`controlDelVisto` a `null`: nada asentable. La plantilla se clona una vez y el nodo se reutiliza.
- El aviso de fallo sale al pintar cualquier búsqueda (con resultados o a cero) y al vaciarse la búsqueda (sin texto ni filtros); al salir de él la región se vacía antes del recuento, como al salir de cero. El reintento sigue siendo el de hoy (`?{n}` tras importación fallida, `destroy()` tras un fallo de Pagefind; el mapa, con otro `fetch` al siguiente Autor elegido).

**Block If:**
- El motor de los proyectos de Playwright no evalúa `@media (scripting: none)` con `javaScriptEnabled: false` y la única alternativa que queda es un guion en línea o tocar `Armazon.astro`.
- Añadir `directorios-del-aviso` exige cambiar la huella de AD-14 o el receptor (`tools/lib/medicion.ts`, `medicion/`).

**Never:**
- No editar `_bmad-output/planning-artifacts/` ni `_bmad-output/specs/` (EXPERIENCE.md § Zonas aún dice `resultado` para «también el de tipo Directorio»: lo manda el AC v8.2; si hay que alinearlo, diferido «pendiente de Héctor (bmad-ux)»).
- Ni guion en línea nuevo ni entrada nueva en `src/lib/guiones.ts`; nada en `Armazon.astro`; ninguna página ni superficie nueva.
- No decir «no se puede usar» ni «ya no existe» de una `obra` cuyo mapa no llegó; no escribir la dirección en ese caso (27.4).
- No emitir `busqueda` ni `busqueda-sin-resultados` por una búsqueda que no corrió; el fallo no es tramo 0.
- No tocar el fallo de una tanda (27.5): sigue con su frase bajo el botón.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sin guion | `/buscar/` con JS desactivado | Se ve el aviso de `<noscript>` con los dos Directorios; ni campo, ni selectores, ni aviso previo | — |
| Paquete cortado | JS activo, el fichero `Busqueda.astro_astro_type_script…js` abortado | Se ve el aviso previo con los dos Directorios; ni campo ni texto de `<noscript>` | — |
| Arranque normal | JS activo, paquete llega | Ningún `[data-aviso-previo]` en el DOM; formulario en su sitio | — |
| Índice que no carga | `pagefind.js` abortado; se teclea | Aviso de fallo antes de la lista; lista vacía; región apartada con la frase; ocultar la página o pulsar un Directorio no emite `busqueda` ni salida | Sin rechazos sin manejar |
| Reintento | tras el fallo, la ruta devuelta y se teclea otra vez | Nueva importación (`?1`); resultados; el aviso sale | — |
| Búsqueda superada | falla una búsqueda ya superada por otra | No se pinta el aviso | — |
| Lo visto y luego fallo | «viento» pintada, «zzz» falla | Aviso en lugar de los resultados; ocultar no emite nada | — |
| Obra sin mapa | `?autor=a&obra=b`, `/buscar/obras.json` falla | Aviso de fallo; ninguna frase de `avisoDeLaDireccion`; dirección intacta | — |
| Vaciar tras fallo | campo vacío, sin filtros | Aviso fuera, región vacía, nada pintado | — |

</intent-contract>

## Code Map

- `src/components/Busqueda.astro` -- la isla. Cabecera: «Sin guion la página queda en el `h1` (hasta la 27.7)» y el párrafo de «La búsqueda que no corre» (l. ~240) cambian. Marcado: `<div data-busqueda>` con la `<template>` del formulario (l. 245); `iniciar` (l. 513) toma `raiz.querySelector('template')`, `[data-resultados]`, `[data-estado]`, `[data-salida]`, retira `cajaDeObra` y `mas` y hace `raiz.append(formulario)` (l. 541). `pintar` (l. 764; `estado.classList.toggle('solo-para-lectores', vacio)`, `aCero`, `ritmo.vaciar()`), `buscar` (l. 832; rama sin texto ni filtros l. 845; `catch` l. 882 con `averiada` de la 27.5), `sinDatos` (l. 1192), `llegar` (l. 1216), `resolverYBuscar` (l. 1158).
- `src/pages/buscar.astro` -- marco: `h1`, `<Busqueda>`, `.recuento > p[data-estado]`, `ul[data-resultados][data-zona="resultado"]`, `.salida[data-sin-zona]`. Estilos de la fila de resultado bajo `.resultados :global(...)` (l. 205–255): punto de reuso para la fila del aviso.
- `src/lib/busqueda.ts` -- frases fijas (`SUGERENCIA_SIN_FILTROS` l. 172, `FALLO_DE_LA_TANDA` l. 547): poner aquí las del aviso. Sin importaciones nuevas (lo fija `busqueda-con-filtros.test.ts:116`).
- `src/lib/tipoDeResultado.ts:40,75` -- `ETIQUETAS_DE_RESULTADO.directorio`, `TIPOS_CON_TITULO_EN_SANS`. `src/lib/marca.ts:44,57` -- `NOMBRE_DEL_DIRECTORIO_DE_*`. `src/lib/superficies.ts:405,419` -- rutas de los Directorios.
- `src/lib/medicion.ts:277–297` -- `EXENCIONES_DE_ZONA` y su docblock; en ejecución cualquier `data-sin-zona` exime (l. 508), así que solo cambian la lista y el docblock.
- `src/lib/anuncio.ts:22` -- `anunciar` (primer ritmo). `src/lib/guiones.ts:141` -- `reconoce` del paquete de la búsqueda (para cortarlo en Playwright).
- `src/lib/umbrales.ts:600–618` -- `MAX_BYTES_GUION_DE_LA_BUSQUEDA` = 17293 con su historial de medidas.
- `tools/lib/alcance.ts:18–20,63` -- el grafo de NFR-5 ya salta `<template>` y `<noscript>`; `tools/lib/html.ts:145` `recorrerElementos` **no** los salta (las pruebas de zona ven las tres instancias).
- `tests/unit/ayuda/busqueda.ts` -- DOM simulado de la isla: la raíz y su `template` (l. 483–499), `porSelector` (l. 500) que lanza con un selector desconocido, accesores (l. ~880). Añadir el aviso previo en la raíz y la plantilla del fallo.
- `tests/unit/medicion.test.ts` -- l. 1278 (lista de exenciones), 2896–2903 (`SITIO_DE_LA_EXENCION`), 3086–3119 (`COLOCACION`), 3177–3192 («están las dos y cada una en su sitio», `toHaveLength`), 4019–4045 (fallos de la isla: «se sigue asentando el anterior» pasa a no emitir), 4664 (fallo al elegir), 6052 (`sinDatos` y el bloque).
- `tests/unit/busqueda-con-filtros.test.ts` -- «lo construido» (l. ~674): sitio de comprobación de `/buscar/` en `dist/`.
- `tests/unit/alcance.test.ts:210` -- caso que ya salta `<template>`/`<noscript>`.
- `tests/e2e/busqueda.spec.ts` -- `resultados(page)` (l. 54) lee las filas; 26.3 (l. 691) fija que Pagefind da `/autores/` con título «Autores»; espía de medición `tests/e2e/ayuda/espia.ts`; patrones de `page.route('**/pagefind/pagefind.js')` (l. 436). `tests/e2e/accesibilidad.spec.ts` -- `cargarEn320` (l. 798), `ESTADOS_DE_BUSQUEDA` (l. 1014) y el barrido axe del fichero.

## Tasks & Acceptance

**Execution:**
- `src/lib/busqueda.ts` -- exportar `VOLVER_ATRAS_A_LAS_CITAS`, los pares p1/p2 de los tres casos (`AVISO_SIN_GUION`, `AVISO_PREVIO`, `AVISO_DEL_FALLO`, como `{ lema, sigue }` o equivalente) y `ANUNCIO_DEL_FALLO_DE_LA_BUSQUEDA` (p1 + « » + p2), con docblock (UX-DR92) -- un solo dueño de las frases.
- `src/components/AvisoDeLaBusqueda.astro` (nuevo) -- `Props { caso: 'sin-guion' | 'antes-de-arrancar' | 'fallo' }`; raíz `div.aviso-de-la-busqueda[data-sin-zona="directorios-del-aviso"]` (+ `data-aviso-previo` en el previo), dos párrafos y la lista de dos Directorios; estilos con tokens y `@media (scripting: none) { [data-aviso-previo] { display: none } }`; docblock -- el componente único de AD-6/ARCHITECTURE-SPINE l. 117.
- `src/components/Busqueda.astro` -- en `[data-busqueda]`, antes de la `<template>` del formulario: `<noscript><AvisoDeLaBusqueda caso="sin-guion"/></noscript>` y el aviso previo; tras la raíz, `<template data-plantilla-del-fallo>` con el caso `fallo`. Isla: retirar el previo al arrancar; clonar la plantilla del fallo una vez; `mostrarFallo()` y `quitarFallo()` según Always; llamarlas desde el `catch` de `buscar` (solo `mio === turno`; la `averiada` de la 27.5 se conserva para el caso superado), `sinDatos`, `pintar` y la rama vacía de `buscar`; actualizar el docblock -- FR-7, AD-13.
- `src/pages/buscar.astro` -- reglas de la fila de resultado compartidas con la lista del aviso (un juego de reglas); docblock -- reuso sin copia.
- `src/lib/medicion.ts` -- `EXENCIONES_DE_ZONA` = `['chips-del-404', 'salidas-sin-resultados', 'directorios-del-aviso']`, docblock con la decisión de Héctor del 2026-10-22 -- exención por escrito.
- `src/lib/umbrales.ts` -- rederivar `MAX_BYTES_GUION_DE_LA_BUSQUEDA` (medida + ~400, con su entrada de historial) solo si el guion pasa del tope -- AD-6.
- `tests/unit/ayuda/busqueda.ts` -- `[data-aviso-previo]` en la raíz y `[data-plantilla-del-fallo]` en el documento (un clon), accesores `avisoPrevio()` (si está conectado) y `avisoDeFallo()` (conectado y justo antes de la lista); docblock -- observar la isla.
- `tests/unit/medicion.test.ts` -- exenciones (lista; sitio de `directorios-del-aviso`: `/buscar/`, `div`, clase `aviso-de-la-busqueda`; recuento por motivo 1/1/3); `COLOCACION` de `/autores/` y `/obras/` en `/buscar/` → `[{ sinZona: 'directorios-del-aviso' }]`; isla: el arranque retira el previo; fallo en importación, `init`, `search` y datos pinta el aviso con la región apartada y el anuncio, sin emitir al enviar ni al ocultar; «se sigue asentando el anterior» pasa a «no emite nada»; reintento que llega quita el aviso y pinta; fallo superado no pinta; `?autor=&obra=` con mapa fallido pinta el aviso sin frase de la 27.4 ni escritura; vaciar quita el aviso; sin rechazos sin manejar -- la isla.
- `tests/unit/busqueda-con-filtros.test.ts` -- en «lo construido»: `/buscar/` lleva exactamente tres `.aviso-de-la-busqueda` (en `<noscript>`, el previo con `data-aviso-previo` y el de `template[data-plantilla-del-fallo]`), con sus frases, los dos Directorios (rótulo, título, `href`, sin `target`) y ninguno dentro de `[data-zona="resultado"]`; ninguna otra página los lleva -- marcado construido.
- `tests/unit/alcance.test.ts` -- caso 27.7: con las tres formas del aviso, solo los enlaces del previo entran en el grafo -- NFR-5.
- `tests/e2e/busqueda.spec.ts` -- describe «Historia 27.7»: (a) sin JS: texto de `<noscript>` visible, previo oculto, 0 `[data-consulta]` y 0 `select`, dos filas «Directorio» con rótulo y título iguales a los que da Pagefind para `/autores/` y `/obras/`; (b) paquete abortado (`reconoce` de `guiones.ts`): previo visible con sus filas, sin campo, sin texto de `<noscript>`; (c) normal: 0 `[data-aviso-previo]` tras arrancar; (d) `pagefind.js` abortado: aviso de fallo bajo el formulario, fuera de `[data-zona="resultado"]`, región con la frase; con el espía, ocultar y pulsar «Autores» no emiten `busqueda` ni salida; `unroute` y teclear otra vez: resultados y el aviso fuera; (e) `?autor=&obra=` con `/buscar/obras.json` abortado: aviso de fallo y ninguna frase de `avisoDeLaDireccion` -- superficie real.
- `tests/e2e/accesibilidad.spec.ts` -- axe (las reglas WCAG 2.2 AA del fichero) y reflujo a 320 px en las tres condiciones sobre `/buscar/` sin JS, con el paquete cortado y con el índice que no carga -- NFR-8, NFR-9.

**Acceptance Criteria:**
- Given `/buscar/` construido, when se lee `dist/buscar/index.html`, then el aviso sale tres veces del mismo componente y sus Directorios no cuelgan de la zona `resultado`, y la prueba de la 23.7 nombra `directorios-del-aviso` entre sus exenciones.
- Given el build, when corre la puerta de NFR-5 (26.8), then pasa con el mismo veredicto que en la base.
- Given cualquier estado de la isla, when se pinta el aviso de fallo, then la región `[data-estado]` lo dice una vez y la página lo muestra una sola vez.
- Given el paquete de la búsqueda, when se mide, then cabe en `MAX_BYTES_GUION_DE_LA_BUSQUEDA`.

## Spec Change Log

## Review Triage Log

### 2026-10-29 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

### 2026-10-29 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 0, medium 0, low 4)
- defer: 2: (high 0, medium 0, low 2)
- reject: 22: (high 0, medium 1, low 21)
- addressed_findings:
  - `[low]` `[patch]` verification-gap (+ blind-hunter «especificidad de las reglas compartidas», intent-alignment h, ac-auditor 5): nada miraba que las filas del aviso tomen de verdad las reglas de `.filas-de-resultado`. `busqueda.spec.ts` compara ahora, por estilo calculado, filete, enlace, rótulo y título de cada fila del aviso de `<noscript>` con los tokens (`--grosor-filete`, `--filete`, `--unidad`, `--sans`, `--pie`, `--titular-sm`…), y las del aviso del fallo con una fila «Directorio» pintada por la isla; y mide la composición (`--cuerpo-lg`, 3×/2×/2× `--unidad`) también en el aviso del fallo.
  - `[low]` `[patch]` ac-auditor 2 (+ intent-alignment c, ac-auditor 4): «lo visto y luego el fallo» solo se probaba en el DOM simulado. Caso nuevo en `busqueda.spec.ts`: «autores» pintada, los fragmentos de Pagefind cortados, «viento» falla (`data()`), aviso en lugar de los resultados con la región diciendo la frase; ni ocultar ni pulsar «Autores» emiten `busqueda`, `busqueda-sin-resultados` ni salida.
  - `[low]` `[patch]` edge-case-hunter 1: tras un fallo de `search`/`data()` sin bloque «Mostrar 30 más», el reintento buscaba en el índice mientras `destroy()` seguía en curso (Pagefind suelta la instancia solo al acabar). El `catch` de `buscar` deja ahora la destrucción en `averiada` también cuando pinta el aviso (`mio === turno`), y la búsqueda siguiente la espera.
  - `[low]` `[patch]` blind-hunter «dos campos fijados a mano»: el `en-sans` del título del aviso y el `enSans` esperado del e2e salen ahora de `TIPOS_CON_TITULO_EN_SANS`, la tabla de la fila de la isla, en vez de escribirse a mano.

## Design Notes

- **Por qué `@media (scripting: none)`:** es CSS del componente, sin guion en línea (AD-6, tope de `MAX_BYTES_DE_GUION`) y sin tocar el armazón. Los dos proyectos de Playwright son Chromium (≥ 120 lo evalúa). Un navegador sin la característica y sin guion vería los dos avisos: coste aceptado y escrito en el docblock.
- **Por qué la plantilla del fallo va fuera de `[data-busqueda]`:** la isla sigue tomando el formulario con `raiz.querySelector('template')` y el `<noscript>` de la raíz, con guion, es texto y no lleva `<template>`; así ningún selector depende del orden de dos plantillas hermanas.
- **Por qué el fallo vacía lo que se veía:** el AC lo pone «en lugar de los resultados», y lo asentable es lo que se ve (23.8): con el aviso a la vista no hay búsqueda que asentar. Ejemplo: «viento» (3) a la vista → «zzz» falla → aviso; ocultar no emite.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run tests/unit/busqueda-con-filtros.test.ts` y `npx vitest run tests/unit/alcance.test.ts` -- expected: verdes.
- `tests/unit/medicion.test.ts` (largo: con `correr.sh` y `esperar.pl`) -- expected: verde, guion bajo su tope.
- `npx playwright test tests/e2e/busqueda.spec.ts -g "27.7" --project=escritorio` y `--project=movil`, y `tests/e2e/accesibilidad.spec.ts -g "27.7"` -- expected: verdes sobre el sitio construido (`tests/servidor.mjs`).

## Auto Run Result

Status: done

**Resumen.** `/buscar/` ya no se queda en el `h1`. Un solo componente, `AvisoDeLaBusqueda.astro`, pinta
el aviso tres veces en `/buscar/`: en `<noscript>` (sin guion), en el HTML inicial como aviso previo
(`data-aviso-previo`, oculto sin guion por `@media (scripting: none)` y quitado por la isla al arrancar)
y en `<template data-plantilla-del-fallo>`, que la isla clona una vez e inserta justo antes de la lista
cuando la búsqueda no puede correr (`mostrarFallo`: lista vacía, sin «Mostrar 30 más», sin salida ni
sombra, región apartada que anuncia `ANUNCIO_DEL_FALLO_DE_LA_BUSQUEDA` con el primer ritmo, nada
asentable). Sale al pintar cualquier búsqueda y al vaciarla (`quitarFallo`), y la región se vacía antes
del recuento. `sinDatos` (una `obra` sin mapa ni `filters()`) pinta el mismo aviso. Las frases viven en
`src/lib/busqueda.ts`; la exención `directorios-del-aviso` entra en `EXENCIONES_DE_ZONA`; la fila de
resultado tiene un solo juego de reglas (`.filas-de-resultado`) compartido por la lista y los avisos.

**Ficheros.**
- `src/components/AvisoDeLaBusqueda.astro` (nuevo) — el componente de los tres casos, con sus dos Directorios.
- `src/components/Busqueda.astro` — los tres avisos en el marcado; la isla retira el previo y pinta/quita el del fallo.
- `src/lib/busqueda.ts` — `VOLVER_ATRAS_A_LAS_CITAS`, `AVISO_SIN_GUION`, `AVISO_PREVIO`, `AVISO_DEL_FALLO`, `ANUNCIO_DEL_FALLO_DE_LA_BUSQUEDA`.
- `src/lib/medicion.ts` — `directorios-del-aviso` en `EXENCIONES_DE_ZONA`, con su docblock.
- `src/lib/umbrales.ts` — `MAX_BYTES_GUION_DE_LA_BUSQUEDA` rederivado: 17.896 medidos + ~400 = 18.296.
- `src/pages/buscar.astro` — las reglas de la fila, globales bajo `.filas-de-resultado`, para la lista y los avisos.
- `tests/unit/ayuda/busqueda.ts` — el aviso previo y la plantilla del fallo en el DOM simulado; `avisoPrevio()`, `avisoDeFallo()`.
- `tests/unit/medicion.test.ts` — exenciones (1/1/3), `COLOCACION` de `/autores/` y `/obras/`, y la isla: arranque, fallos, reintento, superada, vaciar, Obra sin mapa.
- `tests/unit/busqueda-con-filtros.test.ts` — los tres avisos en `dist/`, solo en `/buscar/`, y los Directorios en Pagefind.
- `tests/unit/alcance.test.ts` — solo los enlaces del previo entran en el grafo de NFR-5.
- `tests/e2e/busqueda.spec.ts` — sin guion, paquete cortado, arranque, índice que no carga (con espía), reintento, Obra sin mapa.
- `tests/e2e/accesibilidad.spec.ts` — axe WCAG 2.2 AA y reflujo a 320 px de los tres avisos.

**Revisión.** Esta pasada no trae hallazgos externos: 0 parches, 0 diferidos por revisión, 0 rechazados.
`followup_review_recommended: false` (parches: high 0, medium 0, low 0; puntuación 0). Diferido por la
propia historia: la alineación de EXPERIENCE.md § Zonas, pendiente de Héctor (bmad-ux).

**Verificación.**
- `npx astro check` — 0 errores, 0 avisos.
- `npx vitest run tests/unit/busqueda-con-filtros.test.ts tests/unit/alcance.test.ts` — 89 verdes.
- `npx vitest run tests/unit/medicion.test.ts` — 681 verdes (la primera pasada midió el guion en 17.896 > 17.293; rederivado el tope).
- `npm test` entero (con `correr.sh`) — 151 ficheros, 7.009 pruebas verdes.
- `npx playwright test tests/e2e/busqueda.spec.ts tests/e2e/accesibilidad.spec.ts -g "27.7" --project=escritorio --project=movil` — 18 verdes.
- Regresión: `busqueda.spec.ts`, `accesibilidad.spec.ts` y `busqueda-historial.spec.ts` enteros en `escritorio` — 223 verdes, 4 saltadas y 1 fallo de red (`socket hang up` en una prueba de la 27.1), verde al repetirla sola.
- Chromium evalúa `@media (scripting: none)` con `javaScriptEnabled: false`: la condición de bloqueo no se da.

**Riesgos residuales.**
- axe no corre sin JavaScript (sus promesas no se resuelven): el barrido «sin guion» reconstruye en una página con guion y sin ficheros de guion el DOM sin guion (el `<noscript>` analizado como marcado y el previo fuera). Lo que se ve de verdad sin guion lo prueba `busqueda.spec.ts` en un contexto sin JavaScript.
- La fila del aviso lleva un espacio entre rótulo y título (`label-content-name-mismatch` de axe); la que pinta la isla (`filaDeResultado`) no lo lleva, y una fila de tipo con nombre accesible propio podría dar el mismo aviso de axe si un barrido la alcanza. No se ha tocado la isla.

### Segunda pasada de revisión (2026-10-29, hallazgos externos)

**Cambio.** Cuatro parches, todos bajos:
- `src/components/Busqueda.astro` — el `catch` de `buscar` guarda la destrucción del índice en `averiada` también cuando pinta el aviso del fallo: el reintento espera a que `destroy()` acabe en vez de buscar en un índice a medio destruir.
- `src/components/AvisoDeLaBusqueda.astro` — el `en-sans` del título sale de `TIPOS_CON_TITULO_EN_SANS`, la tabla de `filaDeResultado`.
- `tests/e2e/busqueda.spec.ts` — `presentacionDe` y `presentacionDeLosTokens`: las filas del aviso de `<noscript>` se comparan, por estilo calculado, con los tokens de la fila; caso nuevo «lo visto y luego el fallo» (fragmentos cortados tras «autores»): aviso en lugar de los resultados, filas iguales a una fila «Directorio» de la isla, composición medida, y ni ocultar ni pulsar «Autores» miden; `enSans` esperado derivado de la tabla.

**Hallazgos.** 4 parches (high 0, medium 0, low 4), 2 diferidos (la fila de la isla sin espacio ante axe; la frase de la 27.4 perdida cuando la búsqueda de la llegada falla), 22 rechazados (entre ellos: el desplazamiento del previo y el mensaje de `sinDatos`, que manda el intent-contract; la puerta de NFR-5, que corre en cada build y solo gana aristas; el barrido axe reconstruido, porque axe no corre sin JavaScript; el estado de `sprint-status.yaml`, que lleva el orquestador).

**Recomendación de revisión posterior:** `false` — parches high 0, medium 0, low 4; puntuación 3 × 0 + 4 = 4 < 5.

**Verificación.**
- `npx astro check` — 0 errores, 0 avisos.
- `npx vitest run tests/unit/busqueda-con-filtros.test.ts tests/unit/alcance.test.ts` — 89 verdes.
- `npx vitest run tests/unit/medicion.test.ts` — 681 verdes, guion bajo `MAX_BYTES_GUION_DE_LA_BUSQUEDA`.
- `npx playwright test tests/e2e/busqueda.spec.ts tests/e2e/accesibilidad.spec.ts -g "27\.7" --project=escritorio --project=movil` — 20 verdes (2,1 min).

**Riesgos residuales.** Los de la primera pasada siguen; además, la búsqueda que sigue a un vaciado tras el fallo ya no espera la destrucción (`quitarMas` olvida `averiada`), lo que solo importa si se vacía y se vuelve a buscar dentro de lo que tarda `destroy()`.
