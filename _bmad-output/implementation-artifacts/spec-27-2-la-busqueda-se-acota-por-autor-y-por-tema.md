---
title: 'Historia 27.2 — La búsqueda se acota por Autor y por Tema'
type: 'feature'
created: '2026-10-29'
status: 'done'
baseline_revision: '5b37b9e042d28bd4f94df060582d82d65f7c868f'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-27-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** `/buscar/` es un guion en línea (`guionQueAnuncia` + `set:html`) a 34 bytes de `MAX_BYTES_DE_GUION`, sin selectores: quien busca no puede acotar por Autor ni por Tema, ni buscar sin texto, aunque la 27.1 ya escribe en cada Página de Cita los filtros `autor`/`tema` y la clave `orden`.

**Approach:** La búsqueda pasa a un `<script>` empaquetado por Astro —entrada nueva de la lista cerrada de AD-6 con su tope— que inserta desde un `<template>` del build el Campo de la 26.6 y un `fieldset` con los selectores de Autor y de Tema (opciones de `filtrosDeLaBusqueda`, ordenadas por dos funciones nuevas de `normalizar.ts`); con filtro busca con `filters` (sin texto, `search(null, …)` ordenado por `orden`), el recuento nombra lo filtrado con el segundo ritmo, «Quitar los filtros» los quita, y la `busqueda` asentada lleva su combinación de filtros.

## Boundaries & Constraints

**Always:**
- Un solo guion de búsqueda, empaquetado (`<script>` procesado de un componente nuevo; nunca en línea, nunca `define:vars` ni `guionQueAnuncia` en `/buscar/`). Importa de `src/lib/` sin copiar: `tipoDeResultado.ts` (`ETIQUETAS_DE_RESULTADO`, `FILTRO_DE_TIPO`, `TIPO_POR_OMISION`, `TIPOS_CON_TITULO_EN_SANS`, `TIPOS_CON_LINEA_DE_AUTOR`, `FILTROS_DE_CITA`, `ORDEN_DE_CITA`, `OPCIONES_DE_PAGEFIND` sin cambiar), `umbrales.ts`, `medicion.ts`/`vocabulario.ts` (`asentamientoDeBusqueda`, `ASENTAMIENTO_DE_BUSQUEDA`, `filtrosUsados`) y `anuncio.ts` (`anunciar`, `ritmoDeTecleo`). Emite solo con `__medir(…)` a secas.
- Pagefind solo por `import('/pagefind/pagefind.js' …)` con el literal delante (el `?{n}` del reintento se concatena detrás, como hoy), sin que Vite lo resuelva (`/* @vite-ignore */`, o `external` en `astro.config.mjs` si el comentario no basta), y solo al enfocar el campo, al elegir un filtro o al llegar con `?q=`. `options(OPCIONES_DE_PAGEFIND)` antes de cada `search` y el reintento por `destroy()`/`?{n}` siguen como hoy.
- Con algún filtro: `filters` con `autor` y/o `tema` (valores de la 27.1); sin texto (vacío o solo espacios) `search(null, { filters, sort: { [ORDEN_DE_CITA]: 'asc' } })`; con texto `search(texto, { filters })`, sin `sort`. Solo salen Citas porque solo la Página de Cita declara esos filtros (27.1). Sin texto ni filtros: ni búsqueda, ni recuento, ni salida.
- Opciones solo del build y de `filtrosDeLaBusqueda(conjunto)`: Autor por `ordenDeAutoresPorNombre`, Tema por `ordenDeTemasPorNombre` (nuevas en `normalizar.ts`, por `claveDeComparacion` del nombre tal como se lee, desempate por valor); primeras «Todos los autores» / «Todos los temas» con valor vacío. El rótulo de cada opción es el nombre, sin recuento. El guion no ordena ni lleva ningún dato del Corpus: lee los nombres de la opción elegida.
- Recuento (en la región `role="status"` que ya existe, encima de la lista): sin filtros «N resultados.» / «Un resultado.»; con filtros «N citas» / «Una cita» + « de {Autor}» + « sobre {temaEnFrase(Tema)}» + « con «{texto recortado}»» + «.». `temaEnFrase` se muda a `src/lib/recuentos.ts` (sin importaciones) y `atribucion.ts` la reexporta: una sola regla. Segundo ritmo (`ritmoDeTecleo`, `PAUSA_DE_TECLEO_MS`): al teclear se escribe y anuncia tras la pausa y solo si cambió; tras un selector, al llegar la búsqueda que lanzó la pausa de los selectores, sin otra espera. La salida a cero sigue la construida y se anuncia con `anunciar`, como hoy.
- Pausa de los selectores `PAUSA_DE_LOS_SELECTORES_MS = 400` en `umbrales.ts` junto a `PAUSA_DE_TECLEO_MS`: cada `change`/`input` de un selector la reinicia y la búsqueda se rehace una vez al cumplirse. Enviar (Enter) cancela las dos pausas y busca el estado actual.
- «Quitar los filtros»: botón secundario siena (estilo de `.copiar`), a su ancho, a 2 × `--unidad` bajo los selectores, con `hidden` sin filtros; al pulsarlo pone los dos a «Todos…», rehace la búsqueda con el texto al momento (o la vacía si no hay texto) y lleva el foco al campo.
- Resultados pintados como hoy (fila-enlace, rótulo, serif salvo `TIPOS_CON_TITULO_EN_SANS`, línea `.r-autor`), salvo el nombre accesible de Obra: «Obra: {título}, {Autor}», sin «de». `ul.resultados` lleva `role="list"` y sigue con `data-zona="resultado"` en el HTML; la isla no intercepta el clic. Tabulación por el orden del DOM: campo, Autor, Tema, «Quitar los filtros», resultados.
- Asentamiento de la 23.8 sin cambiar su regla: el estado visto lleva `filtros = filtrosUsados({ autor, obra: false, tema })` y una vez por estado distinto de texto **y valores** de filtro (la clave de `asentamientoDeBusqueda` incluye los valores; sin valores, la clave es la de hoy). Marca en `history.state` solo por `replaceState(…, '')`; nunca `pushState` ni escribir la dirección.
- Marcado y estilo por tokens: campo de la 26.6 (`CampoDeBusqueda.astro` con `name="q"`, `data-consulta` y el texto de ejemplo, en Inter a `--cuerpo-lg`), etiqueta «Escribe un fragmento, un autor o un tema.», ejemplo «Por ejemplo: no hay camino» desde una constante; `fieldset` sin borde ni relleno con `legend.solo-para-lectores` «Filtrar las citas», a 3 × `--unidad` bajo el campo y 2 × entre selectores; cada `select` nativo con `label` visible encima («Autor», «Tema»), `width: 100%`, `min-height: var(--zona-de-toque)`, filete `--grosor-filete` `--contorno`, `--radio`, fondo `--papel`, `--sans` a `--cuerpo-lg`, flecha nativa; nada con `white-space: nowrap`.
- `src/lib/ingreso.ts` no cambia; la invitación de donación sigue al final, fuera de `.salida`, y la isla no la mueve.

**Block If:**
- Para que la entrada quepa o funcione hace falta subir `MAX_BYTES_DE_GUION` o `MAX_BYTES_GUION_DE_PAGEFIND`, o tocar `src/lib/ingreso.ts`.
- Pagefind 1.5.2 no devuelve, con `filters` y `search(null, …)`, las Citas del filtro en el orden de `orden` (la 27.1 lo probó: si deja de hacerlo, es otra versión).
- El literal de `import('/pagefind/pagefind.js')` no sobrevive al empaquetado ni con `/* @vite-ignore */` ni con `external`.

**Never:** selector de Obra, mapa de rótulos, opción «Todas sus obras» (27.3); filtros en la dirección, `pushState` o leer `autor`/`tema` de `location` (27.4); «Mostrar 30 más» (la tanda sigue en 30, 27.5); frases a cero con filtros o destacados (27.6); `<noscript>`, aviso previo o fallo del índice (27.7); «Buscar en…» (27.8); un `<script>` en línea en `/buscar/`; `window.__medir && …`; dependencias nuevas; editar artefactos de planificación.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Solo Autor | Autor `jose-marti`, campo vacío | `search(null, {filters:{autor}, sort:{orden:'asc'}})`; «222 citas de José Martí.» | — |
| Autor + Tema | + Tema `la-prudencia` | «8 citas de José Martí sobre la prudencia.» | — |
| Tema + texto | Tema `el-saber`, «escuela» | `search('escuela', {filters:{tema}})`, sin sort; «6 citas sobre el saber con «escuela».» | — |
| Singular | un resultado con filtro / sin | «Una cita de …» / «Un resultado.» | — |
| Solo espacios | «   » y sin filtros | nada: lista y región vacías, salida oculta, sin `__medir` | — |
| Flechas en el selector | 5 cambios en < 400 ms | una sola búsqueda, 400 ms tras el último | — |
| Quitar los filtros | Autor + texto «vida» | selectores a «Todos…», botón oculto, foco al campo, búsqueda de «vida» sin filtros | sin texto: página sin búsqueda |
| Asentar con filtros | enviar con Autor y Tema | una `busqueda` `[tramo, 'autor-tema']`; mismo estado otra vez: nada; otro Autor: otra | sin texto y total 0: sin `busqueda-sin-resultados` |
| Filtro a cero | Autor + Tema que no se cruzan | la salida construida, anunciada con `anunciar` | — |
| Llegada `?q=x` | como hoy | carga Pagefind y busca sin filtros; `yaRegistrada` como hoy | — |
| Índice que falla | importación/`init`/`search`/`data` rechazan | no pinta, no asienta, reintento real | sin promesas rechazadas sin manejar |

</intent-contract>

## Code Map

- `src/pages/buscar.astro` -- hoy: docblock con todas las reglas del guion (1-89), `guionQueAnuncia({...}, cuerpo)` (110-277), formulario en el HTML (286-296), `p.estado[role=status][data-estado]` (304), `ul.resultados[data-resultados][data-zona=resultado]` (310), `.salida[data-salida][hidden]` con Temas/Colecciones/Autores (319-372), `Sostener` (374-389), `<script is:inline set:html>` (393), estilos (395-576; `.chip` con `overflow-wrap: anywhere` lo exige `espinas-de-ux.test.ts:196`). Queda: h1, el componente nuevo, región, lista, salida, Sostener y estilos de resultados/salida; el docblock se muda con el guion.
- `src/components/FiltroDelDirectorio.astro` -- el precedente que copiar: `<template>` con el Campo, región `role=status` en el HTML, `<script>` empaquetado que clona e inserta, `ritmoDeTecleo`, `isComposing`/`compositionend`, la «sombra» que reserva el alto del recuento (`.recuento` absoluta sobre `.sombra`).
- `src/components/CampoDeBusqueda.astro` -- Props `id`, `etiqueta`; añadir opcionales `nombre` (→ `name`), `ejemplo` (→ `placeholder`, con `::placeholder` en `--tinta-apagada`) y una marca `data-consulta` opcional; sin ellas sale igual que hoy.
- `src/lib/anuncio.ts` -- `anunciar` (primer ritmo, ya usa `requestAnimationFrame`), `ritmoDeTecleo(region, pausa)` (segundo). Añadir una escritura inmediata «si cambió» al ritmo (p. ej. `ahora(texto)`) para el recuento tras un selector, sin `requestAnimationFrame`.
- `src/lib/medicion.ts:300-417` -- `EstadoDeBusqueda`, `ASENTAMIENTO_DE_BUSQUEDA`, `asentamientoDeBusqueda` (docblock «viaja por su texto»: actualizar, ahora se importa). `clave(texto, filtros)` gana los valores opcionales.
- `src/lib/vocabulario.ts:155-174` -- `FILTROS`, `filtrosUsados`.
- `src/lib/guiones.ts` -- `GUIONES_EXTERNOS` (ids `medicion|imagen|pagefind|filtro`); añadir `busqueda` (reconoce el fichero de `/_astro/` del componente, deja libre el resumen) y una forma de declarar que su fichero pide **otra entrada** (`pagefind`) por `import()` sin contarla en su tope (p. ej. `pide: ['pagefind']`); ampliar `guionExternoDe`/`entradaDeLoDescargado` si hace falta. Si Astro emitiera `modulepreload` de un trozo compartido, también lo reconoce la entrada.
- `src/lib/umbrales.ts:378-399` (`MAX_BYTES_DE_GUION`, medidas de `/buscar/`), `504` (`MAX_BYTES_GUION_DE_PAGEFIND`), `506-527` (`MAX_BYTES_GUION_DEL_FILTRO`: medida + ~400, llamadas de nivel superior `@__PURE__`), `538` (`PAUSA_DE_TECLEO_MS`).
- `src/lib/normalizar.ts:112-130` -- `claveDeComparacion`, `compararPorClave` (sin importaciones; base de las dos funciones nuevas).
- `src/lib/publicado.ts:848-900` -- `filtrosDeLaBusqueda` → `{ porCita, autores, obras, temas }`, opciones `{ valor, rotulo, recuento }` ordenadas por valor.
- `src/lib/atribucion.ts:380-391` -- `temaEnFrase` (pruebas en `tests/unit/siguiente.test.ts:212`); atribucion importa `superficies.ts` y `marca.ts`: no viaja al cliente. `src/lib/recuentos.ts` -- módulo sin importaciones apto para el cliente (precedente 26.6).
- `src/styles/tokens.css` -- `.solo-para-lectores` (197), `--papel`, `--contorno`, `--radio`, `--cuerpo-lg`, `--pie`, `--tinta-apagada`, `--zona-de-toque`, `--siena`, `--sobre-siena`. `src/islands/CopiarCita.astro:147-170` -- estilo del botón secundario.
- `astro.config.mjs` -- `assetsInlineLimit` ya manda todo `.js` a fichero; sitio para `external` si hace falta.
- `tests/unit/ayuda/busqueda.ts` -- entorno simulado de la isla (DOM de mentira que lanza ante selectores desconocidos, reloj fingido, historial, Navigation Timing, `__medir` espía, Pagefind de mentira sustituyendo el único `import('/pagefind/pagefind.js'` con comilla simple): hay que darle el `<template>`/`content.cloneNode`, `select`/`option`/`fieldset`/`button`, `focus`, `change`, la forma minificada del `import(` (comillas dobles) y ejecutar un fichero que puede importar trozos.
- `tests/unit/ayuda/filtroEjecutado.ts:362-404` -- ejecuta el fichero del filtro en `node:vm` y exige que no importe (376): si la búsqueda y el filtro comparten un trozo, las dos ayudas usan un aplanador común (nuevo, p. ej. `tests/unit/ayuda/aplanar.ts`, con el `rolldown` o el `esbuild` ya instalados, a un guion clásico, dejando fuera `/pagefind/pagefind.js`).
- `tests/unit/ayuda/guion.ts` -- `guionesExternosDe` (lee `import()` de guiones **en línea**), `peticionesDe`, `descargaDeLaEntrada` (tope por entrada; `import()` no declarado → `sinDeclarar`).
- `tests/unit/medicion.test.ts` -- lo que asume una isla en línea en `/buscar/`: 1767-1790 (ids de la lista), 2242-2290 (cada entrada pedida y bajo su tope: Pagefind ahora lo pide un fichero), 2295-2357 (filtro: contenido de sus ficheros, `requestAnimationFrame`; con trozo compartido, mirar el fichero de entrada para lo de contenido y contar el trozo en el tope), 2466-2550 y 3141-3200 (islas que anuncian / `__medir` a secas, `REGION.buscar`), 2612-2764 (23.6: exenciones de «la isla de la búsqueda» en línea → la entrada `busqueda` descargada), 3369-3460 (isla de `dist/`: `guionesEnLinea` + `"'[data-consulta]'"`, texto de `asentamientoDeBusqueda`, `guionQueAnuncia` en `buscar.astro`), 3460-4101 (matriz 23.8 y 26.2 ejecutada; tabla «se pinta» 3987: `'Obra: Cartas, de Séneca'` → `'Obra: Cartas, Séneca'`).
- `tests/unit/tipo-de-resultado.test.ts:93-177` -- exige cadenas en `buscar.astro` (`FILTRO: FILTRO_DE_TIPO`, `pf.options(PAGEFIND)`, `CON_AUTOR: …`): pasan al componente/guion nuevo.
- `tests/unit/espinas-de-ux.test.ts:308-313` -- región de `/buscar/` vacía desde la carga (se conserva).
- `tests/unit/ingreso-construido.test.ts:867-915` -- `/buscar/` bajo `MAX_BYTES_DE_GUION` y todo lo pedido en la lista cerrada, con los Modelos encendidos.
- `tests/unit/ayuda/pagefind.ts:68` -- `indiceDe(proyecto)`: el `pagefind.js` generado, en Node; `tests/unit/filtros-de-cita.test.ts:218-250` lo usa sobre un fixture con dos Autores y Temas.
- `tests/e2e/busqueda.spec.ts` -- `buscar()`/`resultados()` (24-48), 3.1 carga diferida (244-270), Obra «, de» (165-204 y 1014-1046), «sin selectores» de la 27.1 (966-967), 22.10 recuento (387-460). `tests/e2e/receptor.spec.ts:298-310, 460-480` y `tests/e2e/accesibilidad.spec.ts:584, 1000-1025` usan `[data-consulta]`.
- `tools/lib/alcance.ts:116` -- `conjuntoDelCorpus(rutas)` para la prueba de «no hay camino» sobre el Corpus en disco.

## Tasks & Acceptance

**Execution:**
- `src/lib/umbrales.ts` -- `PAUSA_DE_LOS_SELECTORES_MS = 400` junto a `PAUSA_DE_TECLEO_MS`; `MAX_BYTES_GUION_DE_LA_BUSQUEDA` = lo medido (fichero + importaciones estáticas, trozos compartidos incluidos) + ~400, documentado con fecha; anotar en `MAX_BYTES_DE_GUION` que `/buscar/` ya no lleva guion propio en línea (sin mover el tope); si un trozo compartido mueve el filtro, rederivar `MAX_BYTES_GUION_DEL_FILTRO` con la misma regla y decirlo -- AD-6, NFR-7.
- `src/lib/guiones.ts` -- entrada `busqueda` con `cuando`, `reconoce`, tope y la declaración de que pide la entrada `pagefind`; la de `pagefind` dice que la pide el guion de la búsqueda -- lista cerrada.
- `src/lib/normalizar.ts` -- `ordenDeAutoresPorNombre` y `ordenDeTemasPorNombre` (puras, copia ordenada, deterministas ante el orden de entrada, comparación canónica, desempate por valor) -- AD-3.
- `src/lib/recuentos.ts` / `src/lib/atribucion.ts` -- mudar `temaEnFrase` (atribucion la reexporta; `siguiente.test.ts` sigue verde).
- `src/lib/busqueda.ts` (nuevo, apto para el cliente) -- `EJEMPLO_DE_LA_BUSQUEDA = 'no hay camino'` y el texto de ejemplo; `fraseDelRecuento({ total, texto, autor?, tema? })` según Always; el estado de filtros → `filters` de Pagefind y combinación de `filtrosUsados`. Sin DOM -- decisión pura como `filtroDelDirectorio.ts`.
- `src/lib/medicion.ts` -- `clave`/`EstadoDeBusqueda` con valores de filtro opcionales; docblock al día (se importa en el guion empaquetado) -- 23.8 sin cambiar la regla.
- `src/lib/anuncio.ts` -- escritura inmediata «si cambió» del segundo ritmo; docblocks al día (`/buscar/` ya no lleva `anunciar` por texto).
- `src/components/CampoDeBusqueda.astro` -- props opcionales `nombre`, `ejemplo`, marca `data-consulta`.
- `src/components/Busqueda.astro` (nuevo; si se nombra distinto, `reconoce` lo sigue) -- `<template>` con `form.formulario[role=search][action=/buscar/][method=get]` + Campo, `fieldset` con los dos selectores y «Quitar los filtros»; la «sombra» del recuento si se adopta (Design Notes); el `<script>` con el guion entero (docblock con las reglas que hoy viven en `buscar.astro`) -- AD-6, FR-7, UX-DR87/88/89/91/99/100/101.
- `src/pages/buscar.astro` -- quitar guion en línea, `guionQueAnuncia` y formulario; montar el componente con las opciones ordenadas; `role="list"`; estilos de `select`, `fieldset`, `legend`, botón por tokens.
- `tests/unit/ayuda/aplanar.ts` (nuevo), `tests/unit/ayuda/busqueda.ts`, `tests/unit/ayuda/filtroEjecutado.ts` -- ejecutar el fichero empaquetado (y sus trozos) en el entorno simulado; ampliar el DOM de mentira a lo que la isla nueva usa, sin dejar de lanzar ante lo desconocido.
- `tests/unit/ayuda/guion.ts` -- seguir los `import()` de los ficheros descargados hacia otras entradas declaradas (Pagefind) para que «cada entrada se pide» y los topes sigan midiendo.
- `tests/unit/medicion.test.ts` -- migrar cada prueba de la isla en línea a la entrada `busqueda` (lista, topes, `__medir` a secas, `anunciar`, 23.6 sin otra exención que el `replaceState`, ninguna página con `<script type="module">` con cuerpo ni guion en línea de búsqueda); matriz 23.8 ejecutada sobre el fichero; filas nuevas: búsqueda por filtro sin texto, combinaciones `autor`/`tema`/`autor-tema`, una vez por valores, «Quitar los filtros», pausa de los selectores (una búsqueda por ráfaga), Pagefind al elegir un filtro, recuento con el segundo ritmo; nombre de Obra sin «de».
- `tests/unit/tipo-de-resultado.test.ts` -- las comprobaciones de fuente apuntan al guion nuevo; solo él configura Pagefind.
- `tests/unit/busqueda-con-filtros.test.ts` (nuevo) -- puras: frases del recuento (matriz y singulares, Tema por `temaEnFrase`, texto recortado), órdenes de `normalizar.ts` (Directorio ≠ nombre leído: «José Martí» con la J; tildes; permutación), traducción de filtros; sobre el Corpus en disco, que alguna Cita publicada contiene `normalizar(EJEMPLO_DE_LA_BUSQUEDA)`; construida con `conBusqueda` (fixture de la 27.1 o propio): `/buscar/` sin guion en línea propio, un `<script type="module" src>` de la entrada `busqueda` detrás del de medición, el `<template>` con los dos selectores y sus opciones (solo publicadas, en su orden, primeras «Todos…»), y con `indiceDe`: `search(null, { filters: { autor } , sort })` da todas las Citas del Autor en el orden de la clave, `autor`+`tema` su cruce, con texto y filtro solo Citas, y cada URL devuelta está en el listado de su Autor (NFR-2).
- `tests/e2e/busqueda.spec.ts` -- describe «Historia 27.2»: selector de Autor sin texto da el recuento «N citas de {Autor}.» y solo Citas; Autor+Tema; Tema+texto sin orden de clave; «Quitar los filtros» (foco al campo, botón fuera, texto conservado); una sola petición de búsqueda por ráfaga de flechas; tabulación; Pagefind no se descarga hasta enfocar o elegir; «no hay camino» da resultados; nombre «Obra: {título}, {Autor}»; a 360 px, medir el alto del `fieldset` con el valor a 17 px y escribirlo; ajustar 22.7/27.1 (sin «de», ya hay selectores).
- `_bmad-output/implementation-artifacts/spec-27-2-la-busqueda-se-acota-por-autor-y-por-tema.md` -- anotar en el Auto Run Result, con fecha, lo que ocupan los dos selectores a 360 px.

**Acceptance Criteria:**
- Given el sitio construido con medición, when se mira `dist/buscar/index.html`, then no hay guion en línea de búsqueda ni `define:vars`, hay un `<script type="module" src>` de la entrada `busqueda` después del de medición, y la entrada (con sus trozos) cabe en `MAX_BYTES_GUION_DE_LA_BUSQUEDA`, sin haber subido `MAX_BYTES_DE_GUION` ni `MAX_BYTES_GUION_DE_PAGEFIND`.
- Given `npx vitest run` de `medicion`, `busqueda-con-filtros`, `tipo-de-resultado`, `filtros-de-cita`, `filtro-del-directorio`, `ingreso-construido`, `espinas-de-ux`, `siguiente` y `publicable-y-alcanzable`, when corren uno a uno, then pasan.
- Given el sitio construido, when corre `tests/e2e/busqueda.spec.ts` (escritorio; las de 360 px y Autor con `--project=movil`), `tests/e2e/receptor.spec.ts -g "busca"` y `tests/e2e/accesibilidad.spec.ts -g "buscar"`, then pasan, incluida la 26.2 del tipo y la 3.1 de carga diferida.
- Given la rama con la historia, when corren `npm run check` y, al final, `npm test` entero con `correr.sh`, then salen 0 errores y todo verde.
- Given el diff de la historia contra `baseline_revision`, when se listan los ficheros cambiados, then ni `src/lib/ingreso.ts` ni nada de `_bmad-output/planning-artifacts/` ni de `_bmad-output/specs/` está entre ellos.

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

Las capas de revisión son externas en este bucle y la revisión independiente viene después: esta pasada no tenía hallazgos que clasificar.

### 2026-10-29 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 9 (high 0, medium 2, low 7)
- defer: 0
- reject: 18 (high 0, medium 3, low 15)
- addressed_findings:
  - `[medium]` `[patch]` Los ganchos que el fichero de la búsqueda busca (`[data-busqueda]`, la plantilla con `form`, `[data-consulta]`, los dos selectores, `[data-quitar]` y `.sombra`; la región dentro de `.recuento`, la lista, la salida y su `.sugerencia`) solo los miraba el Playwright local: `busqueda-con-filtros.test.ts` cruza ahora los selectores que lleva el fichero construido con el HTML construido, y dónde los busca (comprobado en rojo renombrando `data-quitar` en la plantilla). Cubre también el arranque mudo y el acoplamiento página–componente (blind-hunter, verification-gap).
  - `[medium]` `[patch]` El recuento de lo tecleado se escribía `PAUSA_DE_TECLEO_MS` después de **pintarse** la búsqueda (~850 ms + latencia tras la tecla), no «unos 700 ms sin teclear»: `ritmoDeTecleo().anunciar(texto, espera?)` admite la espera que falta y la búsqueda cuenta la pausa desde la última tecla (`performance.now()`); si la búsqueda llega más tarde, se escribe al llegar. Prueba del entorno simulado ajustada y ampliada con la búsqueda lenta (intent-alignment R3, ac-auditor).
  - `[low]` `[patch]` Teclear y elegir dentro de la pausa del otro dejaba los dos temporizadores vivos: el del tecleo buscaba la elección con el ritmo equivocado. Ahora una pausa cancela la otra y busca el último gesto, con su ritmo; prueba nueva (blind-hunter, edge-case-hunter).
  - `[low]` `[patch]` La sugerencia a cero, escrita por `anunciar` en el fotograma siguiente, podía pisar un recuento pintado antes de ese fotograma o caer en una página ya sin búsqueda: la escritura solo cae si nada se pintó ni se vació entretanto; prueba nueva con «Quitar los filtros» (otros hallazgos, blind-hunter).
  - `[low]` `[patch]` Las comprobaciones de que el filtro no toca dirección, historial, ventana, `click` ni HTML miraban solo su fichero de entrada: ahora miran también el trozo compartido; `requestAnimationFrame` sigue mirándose solo en el suyo (blind-hunter).
  - `[low]` `[patch]` Faltaba la prueba de texto con filtro a cero: `busqueda` `'0'` con su combinación y `busqueda-sin-resultados` solo con el texto (ac-auditor).
  - `[low]` `[patch]` `ingreso-construido.test.ts` no decía que `/buscar/`, con los Modelos encendidos, pide la entrada `busqueda`: ya lo afirma (ac-auditor).
  - `[low]` `[patch]` La prueba de los órdenes permutaba con `Math.random`: recorre ahora las 120 permutaciones (blind-hunter).
  - `[low]` `[patch]` `AGENTS.md` ponía «el recuento de `/buscar/`» entre los mensajes del primer ritmo: ya dice que la búsqueda sin resultados va por `anunciar` y el recuento por el segundo ritmo, que solo anuncia si la frase cambió —lo que pide la historia; el mismo recuento con otra búsqueda no se vuelve a anunciar a propósito— (blind-hunter).

Rechazados (18), con su motivo: la frase visible anterior durante la pausa y su solape con la sombra (el diseño de la 26.6 que el spec adopta: la sombra reserva el alto de la frase nueva); sin JavaScript la página queda en el `h1` (la historia pone el campo en el guion; `<noscript>` y el aviso son de la 27.7); el filtro paga el trozo compartido y su tope se rederivó (la historia cuenta los trozos compartidos en el tope); la guarda textual de la región de `/buscar/` (el entorno simulado ejecuta el fichero y prueba qué se escribe y cuándo); `TROZO_COMPARTIDO` y su atribución (un trozo de una palabra solo sale de partir entradas declaradas, uno con otro nombre falla en rojo, y la atribución en las pruebas de red es de rótulo); los literales 150 y 30 (ya estaban; la tanda es de la 27.5); la e2e de Tema y texto (el entorno simulado lo comprueba sobre el fichero construido); `ficherosDescargados` sin `trozos` (lo juzga la prueba de los topes); la llegada con filtros y la caché de atrás y adelante (la clave con valores ya distingue el estado; la caché conserva el DOM); el `select` cerrado que no parte (control nativo, que la historia exige); `aria-controls` y la etiqueta del campo (la etiqueta la fija la historia); el registro de la pasada anterior (esta es la revisión); `vite:preloadError` (nada lo escucha en `dist/`); 30 pintadas de 222 (la tanda sigue en 30 hasta la 27.5, y el recuento dice el total); «Quitar los filtros» con `hidden` (fuera del árbol y sin pintarse); NFR-2 sobre un fixture de una página (lo garantiza el listado del Autor, que prueba `publicable-y-alcanzable`); los estilos por tokens sin prueba de estilo calculado (están en el componente, por tokens, y los barre axe); los comportamientos de plataforma (no hay lector de pantalla ni iOS en el CI).

## Design Notes

**Por qué un `<template>`.** Como en el filtro de los Directorios: el marcado, las opciones del build y sus estilos de ámbito salen en el HTML, inertes, y el guion no lleva contenido (`medicion.test.ts` «ningún guion lleva contenido»). Sin guion la página queda en el `h1` hasta la 27.7, que la rama no fusiona antes.

**El recuento no mueve la lista.** La región se escribe tras 700 ms; pintada encima de la lista, empujaría los resultados bajo el dedo. Se reserva el alto con la «sombra» de la 26.6 (texto invisible y `aria-hidden` escrito al pintar; la región, absoluta sobre ella). A cero, la región sigue diciendo la sugerencia con `anunciar` y se aparta de la vista, como hoy.

**Clave del asentamiento.**
```ts
A.clave(texto, filtros)                 // hoy: JSON.stringify([texto.trim(), filtros])
A.clave(texto, filtros, 'jose-marti|')  // con valores: un tercer elemento; sin él, la de hoy
```

**Trozos compartidos.** La búsqueda y el filtro importan `anuncio.ts` y `umbrales.ts`: Rolldown puede sacarlos a un trozo que importan los dos. Cuenta en los dos topes (AD-6 lo pide), las pruebas de contenido del filtro miran su fichero de entrada, y los entornos simulados ejecutan el aplanado.

## Verification

**Commands:**
- `npx vitest run tests/unit/busqueda-con-filtros.test.ts` -- verde.
- `npx vitest run tests/unit/<f>.test.ts`, uno por llamada: `medicion`, `tipo-de-resultado`, `filtros-de-cita`, `filtro-del-directorio`, `ingreso-construido`, `espinas-de-ux`, `siguiente`, `publicable-y-alcanzable` -- verdes (`medicion` con `correr.sh` si pasa de 8 min).
- `npm run check` -- 0 errores.
- `npm run build` y `npx playwright test tests/e2e/busqueda.spec.ts --project=escritorio` (y `--project=movil -g "27.2"`), `tests/e2e/receptor.spec.ts -g "busca"`, `tests/e2e/accesibilidad.spec.ts -g "buscar"` -- verdes; con `correr.sh`/`esperar.pl` si pasan de 8 min.
- `npm test` entero con `correr.sh` -- verde.

## Auto Run Result

Status: done

**Qué se hizo (2026-10-29).** `/buscar/` deja de llevar guion propio en línea: la búsqueda entera es el `<script>` empaquetado de `src/components/Busqueda.astro`, entrada nueva `busqueda` de la lista cerrada de AD-6 con su tope `MAX_BYTES_GUION_DE_LA_BUSQUEDA` y la declaración `pide: ['pagefind']`. El componente inserta desde un `<template>` del build el Campo de la 26.6 (con `name="q"`, el ejemplo «Por ejemplo: no hay camino» y `data-consulta`), un `fieldset` con los selectores de Autor y de Tema —opciones de `filtrosDeLaBusqueda`, ordenadas por `ordenDeAutoresPorNombre`/`ordenDeTemasPorNombre`— y «Quitar los filtros», más la sombra del recuento. Con filtro busca con `filters` (sin texto, `search(null, …)` ordenado por `orden`; con texto, sin `sort`), el recuento nombra lo filtrado con el segundo ritmo (`ahora` tras un selector), la pausa de los selectores es `PAUSA_DE_LOS_SELECTORES_MS = 400`, y la `busqueda` asentada lleva su combinación; la clave del asentamiento lleva los valores. El nombre accesible de Obra pasa a «Obra: {título}, {Autor}».

**Ficheros.**
- `src/components/Busqueda.astro` (nuevo) — plantilla, estilos por tokens y el guion empaquetado, con el docblock de reglas que vivía en `buscar.astro`.
- `src/pages/buscar.astro` — sin guion en línea ni `guionQueAnuncia`; monta el componente con las opciones ordenadas; región dentro de `.recuento` (con la sombra) y `ul.resultados[role=list]`.
- `src/components/CampoDeBusqueda.astro` — props opcionales `nombre`, `ejemplo` (con `::placeholder` en `--tinta-apagada`) y `consulta`.
- `src/lib/busqueda.ts` (nuevo) — textos fijos del campo, `fraseDelRecuento`, `filtrosDePagefind`, `combinacionDeFiltros`, `valoresDeFiltros`, `hayFiltros`.
- `src/lib/normalizar.ts` — `ordenDeAutoresPorNombre`, `ordenDeTemasPorNombre`.
- `src/lib/recuentos.ts` / `src/lib/atribucion.ts` — `temaEnFrase` se muda a `recuentos.ts`; `atribucion.ts` la reexporta.
- `src/lib/medicion.ts` — `EstadoDeBusqueda.valores` y `clave(texto, filtros, valores?)`; docblocks al día; `CAMPOS_DEL_GUION` marcada `@__PURE__`.
- `src/lib/anuncio.ts` — `ritmoDeTecleo().ahora(texto)`; docblocks al día.
- `src/lib/guiones.ts` — entrada `busqueda`, `IdDeGuion`, `pide`, `trozos` (el trozo compartido con el filtro) y `entradaDeLoDescargado` que lo reconoce.
- `src/lib/umbrales.ts` — `PAUSA_DE_LOS_SELECTORES_MS`, `MAX_BYTES_GUION_DE_LA_BUSQUEDA` (9.112 = 8.712 medidos + ~400), `MAX_BYTES_GUION_DEL_FILTRO` rederivado (3.860 = 3.460 + ~400) y la nota en `MAX_BYTES_DE_GUION` (sin moverlo).
- `src/lib/redes.ts`, `src/lib/vocabulario.ts` — llamadas de nivel superior marcadas `@__PURE__` para que el guion no las arrastre.
- `tests/unit/ayuda/aplanar.ts` (nuevo) — aplana un fichero de `/_astro/` y sus trozos a guion clásico con `esbuild`, dejando el `import()` de Pagefind.
- `tests/unit/ayuda/busqueda.ts` — entorno simulado de la isla empaquetada: plantilla, selectores, botón, foco, sombra, `Event`/`dispatchEvent`, `search` con opciones.
- `tests/unit/ayuda/filtroEjecutado.ts` — ejecuta el filtro aplanado.
- `tests/unit/ayuda/guion.ts` — `descargaDeLaEntrada` sigue `pide` (sin contarlo) y juzga `trozos`.
- `tests/unit/medicion.test.ts` — lista cerrada, topes, 23.6, `__medir`/`anunciar` y la matriz 23.8 sobre el fichero; describe nuevo «Historia 27.2» con la matriz de la historia; clave con valores.
- `tests/unit/busqueda-con-filtros.test.ts` (nuevo) — frases, filtros, órdenes, el ejemplo sobre el Corpus en disco y lo construido con `indiceDe` (NFR-2).
- `tests/unit/tipo-de-resultado.test.ts`, `tests/unit/coleccion-pagina.test.ts` — las comprobaciones de fuente apuntan a `Busqueda.astro` y al fichero empaquetado.
- `tests/e2e/busqueda.spec.ts` — describe «Historia 27.2»; Obra sin «de»; recuento con el total; la 27.1 ya con selectores; la 3.2 deja fuera las opciones de los selectores.

**Lo que ocupan los dos selectores a 360 px (2026-10-29, `--project=movil`).** El `fieldset` mide **222,875 px** de alto con «Quitar los filtros» a la vista y el valor a 17 px: cada selector 320 × 44 px, el botón 44 px de alto, sin desplazamiento lateral.

**Hallazgos de revisión.** Ninguno en esta pasada (capas externas): 0 parches, 0 diferidos, 0 rechazados.

**Revisión de seguimiento recomendada:** no — 0 parches (0 altos, 0 medios, 0 bajos), puntuación 0.

**Verificación.**
- `npx vitest run tests/unit/busqueda-con-filtros.test.ts` — 20/20.
- Uno por llamada: `medicion` 571/571, `tipo-de-resultado` 11/11, `filtros-de-cita` 9/9, `filtro-del-directorio` 22/22, `ingreso-construido` 41/41, `espinas-de-ux` 14/14, `siguiente` 20/20, `publicable-y-alcanzable` 39/39; además `directorio-de-autores` 28/28, `directorio-de-obras` 35/35 y `coleccion-pagina` 35/35.
- `npm run check` — 0 errores, 0 avisos.
- `npx playwright test tests/e2e/busqueda.spec.ts --project=escritorio` — 42 pasan, 2 saltadas (las de 360 px); `--project=movil -g "27.2"` — 10 pasan; `tests/e2e/receptor.spec.ts -g "busca"` — 8 pasan; `tests/e2e/accesibilidad.spec.ts -g "buscar"` — 16 pasan (tras dar `white-space: normal` al `select`, que traía `pre` del navegador). Cada orden construyó el sitio con `npm run build` desde su `webServer`.
- `npm test` entero con `correr.sh` — 150 ficheros, 6.808 pruebas, verde.

**Riesgos que quedan.**
- Vite rodea todo `import()` dinámico del cliente con `__vitePreload` (~1.100 bytes, lista de dependencias vacía); no hay opción que lo quite. Ante una importación fallida emite `vite:preloadError` en la ventana y vuelve a lanzar: el `catch` de `cargar` sigue manejándolo y el reintento con `?{n}` funciona (lo prueba el entorno simulado).
- Quedan ~400 bytes de lecturas de propiedades de las tablas del vocabulario que el empaquetado conserva por si tuvieran efectos; están medidos en el tope.
- El trozo compartido se reconoce por forma de nombre (`/_astro/{módulo}.{resumen}.js`, módulo de una palabra): un trozo con otro nombre haría fallar en rojo la prueba de `dist/`, no pasar en silencio.
- ~~El recuento de lo tecleado llega `PAUSA_DE_TECLEO_MS` después de pintarse la búsqueda~~ — corregido en la pasada de revisión: cuenta desde la última tecla.
- Sin JavaScript `/buscar/` queda en el `h1` (el formulario va en la plantilla) hasta la 27.7, como dice la historia.

### Pasada de revisión 1 (2026-10-29)

**Qué cambió.** Nueve parches, ninguno sobre el contrato:
- `src/components/Busqueda.astro` — el recuento de lo tecleado cuenta `PAUSA_DE_TECLEO_MS` desde la última tecla (`performance.now()`), y si la búsqueda llega después se escribe al llegar; la pausa del tecleo y la de los selectores se cancelan entre sí (busca el último gesto, con su ritmo); la sugerencia a cero que `anunciar` escribe en el fotograma siguiente solo cae si nada se pintó ni se vació entretanto. Docblock al día.
- `src/lib/anuncio.ts` — `ritmoDeTecleo().anunciar(texto, espera?)`: la espera que falta, por omisión la pausa entera (el filtro no cambia).
- `tests/unit/busqueda-con-filtros.test.ts` — prueba nueva que cruza los selectores del fichero construido con el HTML construido y dónde se buscan; las 120 permutaciones en vez de `Math.random`.
- `tests/unit/medicion.test.ts` — tres pruebas nuevas en «Historia 27.2» (una pausa cancela la otra; la sugerencia no pisa un recuento; texto y filtro a cero), la del recuento de lo tecleado cuenta desde la tecla y añade la búsqueda lenta; las guardas del filtro (dirección, historial, ventana, `click`, HTML) miran también el trozo compartido.
- `tests/unit/ayuda/busqueda.ts` — `performance.now()` del reloj fingido.
- `tests/unit/ingreso-construido.test.ts` — `/buscar/` pide la entrada `busqueda` con los Modelos encendidos.
- `AGENTS.md` — la convención de las regiones de estado dice ya qué va por cada ritmo en `/buscar/`.

**Hallazgos.** 9 parches (0 altos, 2 medios, 7 bajos), 0 diferidos, 18 rechazados; el detalle, en el Review Triage Log.

**Revisión de seguimiento recomendada:** sí — parches 0 altos, 2 medios, 7 bajos; puntuación 3 × 2 + 7 = 13 (≥ 5).

**Verificación.**
- `npm run check` — 0 errores, 0 avisos.
- `npx vitest run tests/unit/busqueda-con-filtros.test.ts` — 21/21; con `data-quitar` renombrado en la plantilla, la prueba nueva sale en rojo.
- `npx vitest run tests/unit/medicion.test.ts` — 574/574; `ingreso-construido` 41/41; `tipo-de-resultado` 11/11.
- `npm test` entero con `correr.sh` — 150 ficheros, 6.812 pruebas, verde.
- `npx playwright test tests/e2e/busqueda.spec.ts --project=escritorio` — 42 pasan, 2 saltadas (360 px); `--project=movil -g "27.2"` — 10; `tests/e2e/receptor.spec.ts -g "busca"` — 8; `tests/e2e/accesibilidad.spec.ts -g "buscar"` — 16.
- Bytes tras los parches: búsqueda 8.366 + trozo 501 = 8.867 (tope 9.112); filtro 2.963 + 501 = 3.464 (tope 3.860).

**Riesgos que quedan.** Los de arriba, salvo el del ritmo del recuento. La frase visible anterior sigue a la vista durante la pausa, sobre la sombra de la nueva (el diseño de la 26.6).
