---
title: 'Historia 27.1 — Cada resultado de Cita lleva su Autor, y la Cita declara sus filtros'
type: 'feature'
created: '2026-10-29'
status: 'done'
baseline_revision: '20203e766d762d2b88f2479757ef860110e632e6'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-27-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred:
  - summary: 'AVISO_DE_RANGO_DE_LA_CLAVE_DE_ORDEN se declara sin valor (undefined): el aviso previo al tope de la clave de orden «al modo de la 24.2» (readiness §11, comp-5) es un listón de Héctor — pendiente de Héctor.'
    location: 'src/lib/umbrales.ts'
    severity: 'low'
  - summary: 'El AC dice «tres rangos» de ancho fijo; tres campos decimales o binarios no caben en los 2^24 exactos de f32 con holgura (hoy 135 Autores, 57 Obras, 231 Citas por Obra), así que la clave usa dos campos de 4096 (Autor; posición dentro del Autor, que compone lista de obras + orden del libro con sus dos huecos). Alinear la redacción del AC — pendiente de Héctor (bmad-create-epics-and-stories).'
    location: '_bmad-output/planning-artifacts/epics.md (27.1)'
    severity: 'low'
---

<intent-contract>

## Intent

**Problem:** La Página de Cita no declara nada a Pagefind salvo su tipo (26.2): sin filtros `autor`/`obra`/`tema`, sin metadato `autor` y sin `data-pagefind-sort`, ninguna prueba de la Épica 27 sobre Pagefind tiene qué medir, y el resultado de Cita en `/buscar/` no dice de quién es.

**Approach:** Una función de `src/lib/publicado.ts` compone los filtros de cada Cita y las opciones de filtro de `/buscar/`; una función de `src/lib/obras.ts` compone una clave de orden numérica, única, de ancho fijo y exacta en f32; un componente nuevo, usado solo por `src/pages/cita/[slug].astro`, los escribe junto al metadato `autor`; y el guion en línea de `/buscar/` pinta el Autor bajo el resultado de Cita con el mismo código que el de Obra.

## Boundaries & Constraints

**Always:**
- `obra` = `cita.obra.nombre` (nombre de ficha), nunca el título; `autor` = slug del Autor; `tema` = uno por Tema **publicado** (`temasPublicados`) de la Cita, sin repetir, en el orden de `cita.temas`. Valores y recuentos de opciones salen de la **misma** función (AD-11).
- Opciones: Autores con Citas publicadas, toda Obra con Citas (también `noindex` y congeladas), Temas publicados; cada opción con `valor`, `rotulo` (nombre del Autor; título de la Obra; nombre del Tema), `recuento` (Citas con ese valor) y, en Obra, el slug de su `autor`. Ordenadas por `valor` (unidades de código): el orden visible es de la 27.2/27.3.
- La clave (`data-pagefind-sort="orden:NNNNNNNN"`) va en **toda** Página de Cita; la escribe el componente, la compone `obras.ts` y nada más la escribe. Orden: Autores por `compararPorClave` de `normalizar.ts` sobre `ordenAlfabetico` (lanza si falta, como `agruparPorClave`); dentro del Autor, sus Obras en `ordenDeLaListaDeObras`, cada una en el orden que trae la lista de `citasDeLasObras` (orden del libro, «sin documento» detrás por slug); al final del Autor, el hueco «sin Obra» (sin Obra resuelta, también la de obra «…»), por slug. Ver Design Notes para la codificación.
- Metadato `autor` = `autor.nombre`, peso 0 ya declarado en `OPCIONES_DE_PAGEFIND` (se documenta que cubre también la Cita; no se añade otra entrada ni se quita).
- Filtros, metadato y clave dentro de `<main data-pagefind-body>`, fuera de `BloqueDeCita`, Atribución, `TarjetaDeObra`, `TarjetaDeCita`, y nunca bajo un `data-pagefind-ignore="all"`. El texto del metadato no puntúa como contenido (contenedor `data-pagefind-ignore` sin `all`) ni se ve.
- Resultado de Cita en `/buscar/`: con `meta.autor` no vacío, línea `.r-autor` con el nombre y `aria-label` «Cita: {título}, {Autor}» (el título del índice ya lleva «…»); sin él, ni línea ni `aria-label`. El de Obra sigue exactamente como hoy (con «, de »: lo cambia la 27.2). `/buscar/` sigue bajo `MAX_BYTES_DE_GUION` (hoy 6.554 de 6.656): si no cabe, se compacta el guion en línea; el tope **no** se sube.
- Nombres en español; ningún literal de color o tipografía nuevo.

**Block If:**
- La prueba de Playwright demuestra que Pagefind 1.5.2 no captura filtros, metadato o clave con ninguna de las dos formas de marcado de Design Notes.
- Un fallo de las pruebas de la 26.2 sobre el tipo que no se arregla sin cambiar `OPCIONES_DE_PAGEFIND` o el filtro de tipo.

**Never:** selectores, «Quitar los filtros», guion empaquetado, `search(null…)` en la isla, mapa de rótulos en JSON (27.2–27.4); tocar `src/lib/ingreso.ts`, `tools/lib/cambios.ts` (la clave es orden de búsqueda, no afirmación: AD-27) o los artefactos de planificación; subir `MAX_BYTES_DE_GUION`; dar valor a `AVISO_DE_RANGO_DE_LA_CLAVE_DE_ORDEN`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cita completa | Autor `seneca`, Obra `seneca--cartas`, Temas `el-tiempo` (publicado) y `la-ira` (bajo umbral) | `autor:seneca`, `obra:seneca--cartas`, `tema:el-tiempo`; clave de 8 cifras | — |
| Retitular | misma ficha, `titulo` distinto | mismos filtros y clave | — |
| Dos Obras homónimas | «Odas» de dos Autores | `obra` distinto (`a--odas` ≠ `b--odas`) | — |
| Sin Obra / obra «…» | sin `cita.obra` | sin filtro `obra`; clave tras todas las Obras del Autor, entre ellas por slug | — |
| Obra sin documento | Cita de la Obra sin aparición | tras las documentadas de su Obra, por slug (la lista de `citasDeLasObras`) | — |
| Rango desbordado | ≥ `MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN` Autores, o Citas de un Autor | — | lanza nombrando el rango («Autor» / «posición dentro de {slug}»), el recuento y el tope: el build se para |
| Lista incoherente | Cita con Obra ausente de la lista de su Obra, o lista con Cita ajena | — | lanza nombrando Obra y slug |
| Aviso | `AVISO_DE_RANGO…` definido y un rango lo alcanza | `console.warn` nombrando rango y recuento; build sigue | `undefined`: no avisa |
| Resultado sin `meta.autor` | Cita de un índice viejo | sin `.r-autor`, sin `aria-label` | — |

</intent-contract>

## Code Map

- `src/pages/cita/[slug].astro` -- `getStaticPaths` ya calcula `conjunto`, `publicados` y `porObra = await citasDeLasObras(conjunto)`; añadir aquí `filtrosDeLaBusqueda(conjunto)` y `clavesDeOrden(...)` una vez, y pasar por props los filtros y la clave de cada Cita al componente, como último hijo de `<article>`.
- `src/components/Armazon.astro:240-252` -- `<main data-pagefind-body data-pagefind-filter="tipo:…">`: el filtro de tipo (26.2) no se toca.
- `src/lib/publicado.ts` -- `temasPublicados` (167), `obrasDeLasCitas` (735), `citasPorObra`/`citasDeLasObras` (775, 1288). Aquí va `filtrosDeLaBusqueda`. `autoresPublicados` ordena con `localeCompare`: no reutilizar su orden.
- `src/lib/obras.ts` -- `ordenDeLaListaDeObras` (135), `ordenDelLibro` (1071), `porSlug` (1054, privado), `ObraResuelta` (725). Aquí va `clavesDeOrden`; importa `compararPorClave` de `normalizar.ts` y el tope/aviso de `umbrales.ts`. No puede importar de `publicado.ts` (ciclo).
- `src/lib/normalizar.ts:118-130` -- `compararPorClave`, la función hermana (26.1). `src/lib/directorios.ts:78-130` -- `agruparPorClave`: mismo orden y mismo mensaje si falta la clave.
- `src/lib/tipoDeResultado.ts` -- `FILTRO_DE_TIPO`, `TIPOS_CON_TITULO_EN_SANS`, `OPCIONES_DE_PAGEFIND = { ranking: { metaWeights: { autor: 0 } } }` (93). Declarar aquí los nombres `FILTROS_DE_CITA` (`autor`, `obra`, `tema`), `ORDEN_DE_CITA = 'orden'` y `TIPOS_CON_LINEA_DE_AUTOR = ['obra', 'cita']`; actualizar comentarios (la línea de Autor ya no es solo de Obra).
- `src/pages/buscar.astro:120-205` -- `guionQueAnuncia({...})` y `pintar()`: hoy la línea `.r-autor` y el `aria-label` viven dentro de `if (EN_SANS.includes(tipo))` y solo para `obra`; sacarlos a un bloque por `TIPOS_CON_LINEA_DE_AUTOR`. CSS `.r-autor` (513) ya es `{typography.author}`/`--tinta-apagada`.
- `src/lib/umbrales.ts:360-394` -- comentario de `MAX_BYTES_DE_GUION` con las medidas de `/buscar/` (6.554 B, 102 libres): añadir la de la 27.1. Patrón de constante sin valor: `META_AUTORES_DE_OTRA_TRADICION: number | undefined = undefined` (357).
- `tests/unit/tipo-de-resultado.test.ts:115-134` -- exige `data-pagefind-filter` solo en `Armazon.astro`: ampliar al componente nuevo.
- `tests/unit/publicable-y-alcanzable.test.ts:766-900` -- describe 26.2 sobre `CORPUS_COMPLETO` (todas las familias): la prueba «toda página con `data-pagefind-body` lleva su tipo una vez…» exige `filtros == [{main, tipo}]`; pasa a mirar solo la clave `tipo`. `recorrerElementos(html, (el, antepasados) => …)` de `tools/lib/html.ts` da antepasados.
- `tests/unit/ayuda/construir.ts` -- `construirConCorpus(corpus, { ficheros, conBusqueda })`; los documentos de Fuente se siembran solos en el orden de inserción del fixture (así el orden del libro puede diferir del de slug); `ficheros` reescribe un fichero entero en la copia.
- `tests/e2e/busqueda.spec.ts` -- `buscar`/`resultados` (12, 24); 153-186 resultado de Obra (sus «otros» exigen sin `.r-autor` ni `aria-label`: excluir Cita); 444-515 pruebas de la 26.2 con `pf.init()`/`pf.options()`.
- `tools/lib/alcance.ts` (`leerDatosDelCorpus`, `conjuntoDeLosDatos`, `conjuntoDelCorpus`), `tools/lib/posiciones.ts:66` (`posicionesDeCitas`), `tools/lib/corpus.ts` (`rutasDelCorpus`, `leerDocumentosDeFuente`) -- para calcular en Playwright lo esperado desde el Corpus en disco.
- Corpus de hoy: 4.420 Citas, 135 Autores publicados, máx. 57 Obras por Autor, máx. 231 Citas por Obra (`jose-ingenieros--el-hombre-mediocre-…`), máx. 308 Citas por Autor, 4 Citas sin Obra; `CITAS_POR_PAGINA` = 50, `MIN_CITAS_POR_TEMA` = 15.

## Tasks & Acceptance

**Execution:**
- `src/lib/umbrales.ts` -- añadir `MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN = 4096` (2^12; dos rangos dan 2^24, el entero mayor exacto en f32 con que Pagefind 1.5.2 ordena) y `AVISO_DE_RANGO_DE_LA_CLAVE_DE_ORDEN: number | undefined = undefined` (listón de Héctor), documentados; anotar la medida de `/buscar/` de la 27.1 en el comentario de `MAX_BYTES_DE_GUION` -- un tope con nombre y un aviso sin valor (readiness §11).
- `src/lib/obras.ts` -- `clavesDeOrden(autores, citas, porObra, limites = { tope: MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN, aviso: AVISO_DE_RANGO_DE_LA_CLAVE_DE_ORDEN }): Map<string, string>` pura (los límites por parámetro con valor por omisión, como la `congelacion` de `obrasIndexables`), determinista ante el orden de entrada, con la codificación de Design Notes, sus dos lanzamientos (rango desbordado; lista incoherente) y el aviso -- AD-25, una sola dueña de la clave.
- `src/lib/publicado.ts` -- `filtrosDeLaBusqueda(conjunto)` → `{ porCita: ReadonlyMap<slug, { autor; obra?; temas }>, autores, obras, temas }` según Always -- AD-11, un solo dueño de valores y opciones.
- `src/lib/tipoDeResultado.ts` -- constantes de nombres y `TIPOS_CON_LINEA_DE_AUTOR`; comentarios de `OPCIONES_DE_PAGEFIND` y `ETIQUETAS_DE_RESULTADO` al día -- un solo sitio para el contrato con Pagefind.
- `src/components/FiltrosDeLaCita.astro` (nuevo) -- escribe, dentro de un contenedor `hidden` con `data-pagefind-ignore` (sin `all`), un elemento vacío por filtro (`data-pagefind-filter="autor:…"`, `obra:…`, uno por `tema:…`), uno vacío con `data-pagefind-sort="orden:…"` y `<span data-pagefind-meta="autor">{nombre}</span>` -- forma B de Design Notes si la A no se captura.
- `src/pages/cita/[slug].astro` -- calcular una vez y pasar al componente -- único usuario.
- `src/pages/buscar.astro` -- pasar `TIPOS_CON_LINEA_DE_AUTOR` y pintar línea y `aria-label` del Autor para Cita y Obra con el mismo código; medir bytes y compactar si hace falta -- FR-7, UX-DR91.
- `tests/unit/clave-de-orden.test.ts` (nuevo, puro) -- matriz: Directorio (clave ≠ slug), lista de obras, orden del libro con «sin documento», «sin Obra» por slug, permutación de la entrada, unicidad, ancho 8, todas < 2^24, desbordamiento de cada rango con un `tope` pequeño pasado por parámetro y también con el real (4.097 Autores sintéticos; 4.097 Citas de un Autor), lista incoherente, Autor sin clave, aviso con un `aviso` de prueba pasado por parámetro (espía sobre `console.warn`) y silencio con `undefined` -- AD-25.
- `tests/unit/filtros-de-busqueda.test.ts` (nuevo, puro) -- obra = nombre y no título (retitular no cambia), homónimas distintas, sin Obra sin `obra`, Tema bajo umbral fuera, temas sin repetir, recuentos = Citas por valor, Obra `noindex` presente -- FR-7, AD-25.
- `tests/unit/filtros-de-cita.test.ts` (nuevo, construye) -- fixture con dos Autores cuyo orden por clave no es el de slug, una Obra documentada insertada en orden distinto del de slug con una Cita sin documento, una Cita sin obra, una con obra «…», un Tema publicado y otro bajo umbral: cada Página de Cita lleva exactamente un `autor`, como mucho una `obra` (la suya), sus Temas publicados en `tema`, el metadato con el nombre, ninguno bajo `data-pagefind-ignore="all"` ni dentro de `figure.bloque` (`BloqueDeCita`, que contiene la Atribución), `.tarjeta-de-obra` ni una Tarjeta de Cita; claves numéricas, ancho 8, distintas, < 2^24 y en el orden esperado; segunda construcción con `ficheros` que fija `MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN = 2` en `umbrales.ts`: el build sale ≠ 0 nombrando el rango -- AC de `dist/` y de «rompe el build».
- `tests/unit/publicable-y-alcanzable.test.ts` -- la prueba de tipo mira solo la clave `tipo`; nueva: fuera de `/cita/…` ningún HTML lleva filtro `autor`/`obra`/`tema` ni `data-pagefind-sort`, y toda Página de Cita lleva su clave -- AD-11, AD-17.
- `tests/unit/tipo-de-resultado.test.ts` -- `data-pagefind-filter` y `data-pagefind-sort` solo en `Armazon.astro` y `FiltrosDeLaCita.astro` (el sort solo en este); `FiltrosDeLaCita` lo importa solo `src/pages/cita/[slug].astro` -- AD-11.
- `tests/e2e/busqueda.spec.ts` -- describe «Historia 27.1»: (a) `pf.filters()` = recuentos de `filtrosDeLaBusqueda` sobre `conjuntoDelCorpus` para `autor`, `obra` (también `noindex`) y `tema`, valor a valor; (b) Obra documentada con más Citas cuyo orden del libro ≠ slug (calculada desde disco con `posicionesDeCitas` + `citasPorObra`) y más de una página: `search(null, { filters: { obra }, sort: { orden: 'asc' } })` da las URL de sus Páginas de Obra 1…n leídas del HTML servido (`ul.listado`), en ese orden, y ese orden ≠ el de slug; (c) resultado de Cita real con `.r-autor` = nombre de su Autor, título serif, `aria-label` «Cita: {título}, {Autor}», y `/buscar/` sin `select`; (d) con `pagefind.js` simulado, Cita sin `meta.autor` sin línea ni `aria-label`; ajustar la prueba de Obra (152-186) para que sus «otros» excluyan Cita -- AC de Playwright.

**Acceptance Criteria:**
- Given el repositorio, when corren los cinco ficheros de Vitest nombrados y `tests/unit/ingreso-construido.test.ts`, then pasan, y `/buscar/` con la medición puesta queda ≤ `MAX_BYTES_DE_GUION` sin haber subido el tope.
- Given el sitio construido con `npm run build`, when corren los tests de busqueda.spec.ts filtrados por «27.1|26.2|22.7|3.1» en Playwright (proyecto escritorio), then pasan, incluida la prueba de la 26.2 de que el tipo no casa como texto.
- Given `npm run check`, when corre, then sale sin errores.

## Design Notes

**Clave f32-exacta.** Pagefind 1.5.2 ordena las claves numéricas como f32, exacto hasta 2^24 = 16.777.216; un 3+2+3 decimal (≈17,1 M) ya empata. Dos campos de `B = 4096`: `clave = a·B + p`, con `a` = posición del Autor en el orden del Directorio y `p` = posición de la Cita dentro de su Autor (sus Obras en el orden de la lista, cada una en el orden del libro —«sin documento» al final, que es la cola que ya da `ordenDelLibro`—, y el hueco «sin Obra» tras la última Obra, por slug). Toda clave queda por debajo de `B²` = 2^24 —con el «≥» del tope, la mayor que sale es `(B−2)·B + (B−2)` = 16.773.118—: exacta por construcción. Se escribe en decimal con ceros a 8 cifras (`'00012345'`; Pagefind lee el entero). Holgura: 30× en Autores, 13× en Citas por Autor. Frente al ordinal global denso, una Cita nueva solo mueve las claves de su Autor, no las ~4.400 páginas; un Autor que entra o sale mueve las de todos los posteriores en el Directorio, que si está cerca del principio son casi todas. Desbordar `a` o `p` lanza con el nombre del rango.

**Marcado.** Forma A (la elegida): contenedor `<div hidden data-pagefind-ignore>` con elementos vacíos para filtros y clave, y el metadato por contenido (`<span data-pagefind-meta="autor">José Martí</span>`), porque la forma en atributo (`autor:José Martí`) se partiría en una coma. Forma B si Playwright muestra que `hidden` o el `ignore` impiden capturarlo: `aria-hidden="true"` y la clase `.solo-para-lectores` de `tokens.css` en lugar de `hidden`. Comprobarlo pronto: construir y correr (a) antes de escribir el resto de pruebas.

## Verification

**Commands:**
- `npx vitest run tests/unit/clave-de-orden.test.ts tests/unit/filtros-de-busqueda.test.ts` -- expected: verdes, sin construir.
- `npx vitest run tests/unit/filtros-de-cita.test.ts`, luego `tests/unit/publicable-y-alcanzable.test.ts`, `tests/unit/tipo-de-resultado.test.ts`, `tests/unit/ingreso-construido.test.ts`, `tests/unit/obra-pagina.test.ts`, `tests/unit/orden-del-libro.test.ts`, `tests/unit/obras.test.ts` (uno por llamada) -- expected: verdes.
- `npm run check` -- expected: 0 errores.
- `npm run build` y Playwright de `tests/e2e/busqueda.spec.ts --project=escritorio` (con `correr.sh`/`esperar.pl` si pasa de 8 min) -- expected: verdes.
- Suite entera `npm test` con `correr.sh` antes de dar la historia por buena -- expected: verde.

## Review Triage Log

### 2026-10-29 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las cinco capas de revisión son externas en el bucle v8-ralph y no traían hallazgos en esta pasada; la revisión independiente viene después.

### 2026-10-29 — Review pass 1 (capas externas: blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor)
- intent_gap: 0
- bad_spec: 0
- patch: 12 (1 medium, 11 low)
- defer: 0
- reject: 14
- addressed_findings:
  - "[medium] Sobre el `dist/` de todas las familias no se miraba qué filtros lleva cada Página de Cita, y la prueba del tipo dejaba pasar filtros de cualquier otra clave (blind-hunter, edge-case-hunter, intent-alignment, ac-auditor): `publicable-y-alcanzable.test.ts` coteja cada Página de Cita con `filtrosDeLaBusqueda` del Corpus de la copia (autor, obra, tema y metadato) y rechaza toda clave de filtro que no sea el tipo o, en la Cita, las suyas."
  - "[low] El comentario de `clavesDeOrden` prometía una clave mayor `B² − 1` que el «≥» de la matriz no deja salir (blind-hunter, intent-alignment): se conserva el «≥» del contrato y se documenta que caben `B − 1` posiciones por rango, con una prueba pura de la mayor clave."
  - "[low] Entradas incoherentes que pasaban en silencio (blind-hunter, edge-case-hunter): un slug de Cita repetido y una lista no vacía de una Obra que ninguna Cita resuelve lanzan; las `!` de `cita/[slug].astro` pasan a un error con nombre."
  - "[low] Un `AVISO_DE_RANGO_DE_LA_CLAVE_DE_ORDEN` fuera de 1…tope − 1 no avisaría nunca o siempre (edge-case-hunter): se rechaza nombrándolo."
  - "[low] La rotura del build solo se probaba para el rango «Autor» y sin comprobar que el parche de `umbrales.ts` aplicaba (blind-hunter, ac-auditor): `filtros-de-cita.test.ts` lo comprueba y construye también con tope 3, que rompe en «posición dentro de seneca»."
  - "[low] Que retitular no mueve el filtro `obra` solo se probaba en la función (ac-auditor): el fixture da a «Cartas a Lucilio» la ficha `seneca--epistolas`, que no es el slug de su título, y el `dist/` lleva ese nombre."
  - "[low] El orden por Autor —bloques del Directorio, lista de obras, «sin Obra» detrás— no se probaba contra Pagefind (blind-hunter, intent-alignment): prueba (e) de Playwright con dos Autores filtrados por `any` y ordenados por la clave. La exactitud cerca de 2^24 sigue siendo de construcción y de la prueba pura: el Corpus no llega ahí."
  - "[low] Que el texto del metadato no puntúa como contenido no tenía prueba (blind-hunter): prueba de Playwright que compara las apariciones del nombre en el `content` indexado con las del cuerpo sin lo ignorado."
  - "[low] El estilo de la línea de Autor bajo una Cita no se medía (intent-alignment, ac-auditor): la prueba (c) compara su estilo computado y el de la serif del título con sondas de los tokens, no con nombres de fuente."
  - "[low] «Todavía no hay selectores» solo miraba `select` (ac-auditor): ahora tampoco casillas, radios ni `fieldset`."
  - "[low] Fragilidad de las e2e (blind-hunter): la (c) deriva la Cita esperada del Corpus en vez de un texto fijo y lee el slug con `URL`; la (b) acepta más clases en `ul.listado` y falla si una página no trae listado."
  - "[low] La suite entera no se volvió a correr tras corregir `medicion.test.ts` (blind-hunter): se corre entera tras los parches."

Rechazados: el tablero lo lleva el orquestador del bucle; el registro de revisión vacío es esta pasada; la incoherencia de objetos de Obra (salen todos de `resolverObras`); el `lastmod` y el aviso (el contrato prohíbe tocar `tools/lib/cambios.ts`); el `'obra'` del `aria-label` y la holgura de 34 bytes (los retira la 27.2, que empaqueta el guion); campos de opción y filtros en la Página de Obra (el orden visible y los selectores son de la 27.2–27.3, y los filtros son solo de la Cita por contrato); «tres rangos» (ya aplazado); el hueco «sin documento» como constante (es la cola de `ordenDelLibro`, como fija el contrato); `medicion.test.ts` fuera del Code Map y la ficha en el mismo commit (no es planificación); la prueba de Tema bajo umbral omitida (depende del Corpus del día).

### 2026-10-29 — Review pass 2 (capas externas: blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor)
- intent_gap: 0
- bad_spec: 0
- patch: 11 (medium 1, low 10)
- defer: 0
- reject: 20
- addressed_findings:
  - "`[medium]` `[patch]` El contrato con el índice de Pagefind —filtros, metadato y clave recogidos dentro del contenedor `hidden` con `data-pagefind-ignore`, y la clave ordenada como número— solo lo miraba Playwright, que el CI no corre (verification-gap): `tests/unit/ayuda/pagefind.ts` carga en Node el `pagefind.js` generado de la copia, y `filtros-de-cita.test.ts` (construida ahora con `conBusqueda`) comprueba `filters()` contra el fixture, el orden de `search(null, { sort: { orden } })` contra `ESPERADO` y el `meta.autor` y el contenido de cada Cita."
  - "`[low]` `[patch]` «Retitular no mueve la clave» no se sostiene con un empate de recuento, porque la lista de obras desempata por título (blind-hunter): el comentario de `clavesDeOrden` lo dice, la prueba pura de retitular se nombra «sin empate» y otra fija que con empate las claves siguen a la lista de obras y nada fuera del Autor se mueve."
  - "`[low]` `[patch]` Tres redacciones de la clave mayor (blind-hunter): `umbrales.ts`, el mensaje del tope y los nombres de las pruebas dicen lo mismo —toda clave bajo `B²`, la mayor que sale `(B − 2)·B + (B − 2)` = 16.773.118—."
  - "`[low]` `[patch]` Dos definiciones de «por slug» en las e2e (blind-hunter, ac-auditor): `porSlug` de `obras.ts` se exporta y las pruebas (b) y (e) lo usan para la cola «sin Obra»."
  - "`[low]` `[patch]` El metadato `autor` se contaba con una expresión regular sobre el HTML crudo (blind-hunter, edge-case-hunter): `metadatosDe` cuenta los elementos con el tokenizador y decodifica el texto, en `filtros-de-cita` y `publicable-y-alcanzable`."
  - "`[low]` `[patch]` La e2e del metadato fuera del contenido podía pasar en vacío, cargaba cientos de fragmentos y daba un TypeError sin Cita (blind-hunter, edge-case-hunter): exige el nombre en cuerpo y contenido, elige el Autor con menos Citas y falla con mensaje."
  - "`[low]` `[patch]` La prueba (c) buscaba una frase fija de Machado (blind-hunter): la consulta sale de una Cita del Corpus y se exige esa Cita entre los resultados."
  - "`[low]` `[patch]` El Auto Run Result mezclaba el estado de la ejecución inicial con el de las pasadas (blind-hunter): queda marcado como histórico, con el estado vigente delante."
  - "`[low]` `[patch]` Dos Autores con la misma `ordenAlfabetico` no tenían prueba (blind-hunter): prueba pura de desempate por slug con la entrada en los dos órdenes."
  - "`[low]` `[patch]` Sobre el `dist/` de todas las familias la clave solo se miraba por forma y unicidad (blind-hunter): se coteja con `clavesDeOrden` sobre el Corpus de la copia y su orden del libro."
  - "`[low]` `[patch]` La línea de Autor no se miraba en el móvil (blind-hunter): la prueba (c) exige que la página no se ensanche y corre también con `--project=movil`."

Rechazados: el alcance del cambio de claves al entrar un Autor y el `lastmod` (ya en riesgos; el contrato prohíbe tocar `tools/lib/cambios.ts`); el Corpus en disco frente al construido (la configuración de Playwright construye antes de correr); el nombre del metadato con otro dueño y la coherencia de los objetos de Obra (salen del mismo conjunto y de `resolverObras`); las opciones aún sin consumidor, los filtros solo en la Cita, el `'obra'` del guion y los 34 bytes (son de la 27.2, y la prueba de `ingreso-construido` ya rompe); el tablero (lo lleva el orquestador); AGENTS.md (la función rompe con mensaje propio); el tipo por omisión en un resultado sin tipo (toda página indexada declara el suyo, y lo prueba la 26.2); el oráculo de (a) (la función se prueba aparte, pura y contra el fixture); la Obra `noindex` (recuento 1 < `MIN_CITAS_OBRA_INDEXABLE`); «sin documento» como constante, homónimas y retitular en `dist/`, la sonda de tokens, el Tema bajo umbral y la exactitud cerca de 2^24 (ya juzgados en la pasada 1 o cubiertos por construcción); «tres rangos» (ya aplazado).

## Auto Run Result

Status: done
Blocking condition: —

**Estado vigente:** el de la última pasada de revisión, al final de esta sección. Lo que sigue hasta ella es el registro de la ejecución inicial, tal como quedó: su «sin hallazgos», su `followup_review_recommended: false` y su `npm test` con un rojo son de entonces.

### Ejecución inicial (histórico)

**Qué se hizo.** Cada Página de Cita declara a Pagefind, desde un solo componente y solo en ella, sus filtros `autor` (slug), `obra` (nombre de ficha, omitido sin Obra) y `tema` (uno por Tema publicado), el metadato `autor` con el nombre (por contenido, peso 0 ya declarado) y la clave `data-pagefind-sort="orden:NNNNNNNN"`. La clave es `a·B + p` con `B = MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN = 4096`: `a` es la posición del Autor en el orden del Directorio (`compararPorClave`), `p` la de la Cita dentro de su Autor (lista de obras → orden del libro con «sin documento» detrás → «sin Obra» por slug). La mayor posible es 4096² − 1 = 16.777.215 < 2^24, exacta en f32. El resultado de Cita en `/buscar/` lleva la línea `.r-autor` y el nombre «Cita: {título}, {Autor}» con el mismo código que el de Obra, que conserva «, de».

**Ficheros.**
- `src/lib/umbrales.ts` — `MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN = 4096` y `AVISO_DE_RANGO_DE_LA_CLAVE_DE_ORDEN = undefined` (listón de Héctor), documentados; medida de `/buscar/` de la 27.1 en el comentario de `MAX_BYTES_DE_GUION`.
- `src/lib/obras.ts` — `clavesDeOrden` (pura, determinista, límites por parámetro), con sus lanzamientos (rango, lista incoherente, Autor sin clave, tope fuera de f32) y su aviso.
- `src/lib/publicado.ts` — `filtrosDeLaBusqueda`: filtros por Cita y opciones de Autor, Obra (también `noindex`/congeladas) y Tema con `valor`, `rotulo`, `recuento` (y `autor` en Obra), por valor.
- `src/lib/tipoDeResultado.ts` — `FILTROS_DE_CITA`, `ORDEN_DE_CITA`, `TIPOS_CON_LINEA_DE_AUTOR`; comentarios al día.
- `src/components/FiltrosDeLaCita.astro` (nuevo) — forma A de Design Notes: `<div hidden data-pagefind-ignore>` con elementos vacíos y el metadato por contenido. Comprobado antes con la API de Node de Pagefind 1.5.2: filtros y metadato se capturan y el texto no entra en el contenido.
- `src/pages/cita/[slug].astro` — calcula filtros y claves una vez en `getStaticPaths` y monta el componente como último hijo de `<article>`.
- `src/pages/buscar.astro` — línea y nombre accesible del Autor por `TIPOS_CON_LINEA_DE_AUTOR`.
- `tests/unit/clave-de-orden.test.ts`, `tests/unit/filtros-de-busqueda.test.ts` (nuevos, puros), `tests/unit/filtros-de-cita.test.ts` (nuevo, construye dos veces).
- `tests/unit/publicable-y-alcanzable.test.ts`, `tests/unit/tipo-de-resultado.test.ts`, `tests/e2e/busqueda.spec.ts` — como pide la lista de tareas.
- `tests/unit/medicion.test.ts` — no estaba en el Code Map: su tabla de «se pinta» fijaba que una Cita con metadato `autor` no pintaba línea; ahora la pinta («Cita: Una, Nadie»), se añade «Cita sin Autor» y que un Autor con el metadato no la lleva, y que `CON_AUTOR` sale de `tipoDeResultado.ts`.

**Lecturas de la matriz.** «Rango desbordado: ≥ tope» se aplica literal: un rango cuyo recuento alcanza el tope rompe (el mismo «≥» del aviso), así que caben 4095 posiciones por rango; 4.097 (las de las pruebas) rompe igual. «Retitular: mismos filtros y clave» se prueba en el caso de la matriz; la lista de obras desempata por título (lo manda la espina), así que retitular puede mover claves solo entre Obras del mismo Autor empatadas en recuento.

**Revisión.** Sin hallazgos en esta pasada (capas externas): 0 parches, 0 aplazados, 0 rechazados. `followup_review_recommended: false` (0 high, 0 medium, 0 low parcheados; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/clave-de-orden.test.ts tests/unit/filtros-de-busqueda.test.ts` — 26 verdes.
- `npx vitest run` por fichero: `filtros-de-cita` (5), `publicable-y-alcanzable` (38), `tipo-de-resultado` (11), `ingreso-construido` (41), `obra-pagina` (66), `orden-del-libro` (47), `obras` (117), `medicion` (548) — verdes.
- `npm run check` — 0 errores, 0 avisos (8 pistas, todas anteriores).
- `npx playwright test tests/e2e/busqueda.spec.ts --project=escritorio -g "27.1|26.2|22.7|3.1"` (con su `npm run build` y el receptor local) — 17 verdes, 1 omitida (la de Tema bajo umbral, que el Corpus de hoy no tiene).
- `/buscar/` medido sobre ese `dist/` con la medición puesta: 6.622 bytes en línea (tope 6.656, sin subirlo).
- `npm test` entero — 148 ficheros verdes y 1 rojo (`medicion.test.ts`, la expectativa vieja de la Cita sin línea de Autor); corregida y vuelto a correr el fichero: 548 verdes.

**Riesgos.** `/buscar/` queda a 34 bytes del tope: la 27.2 tiene que sacar el guion a un fichero antes de añadir nada. La clave cambia en todas las Citas de un Autor cuando entra una Cita suya, y en las de los Autores posteriores cuando entra un Autor: no es afirmación (AD-27) y `tools/lib/cambios.ts` no se toca, pero el `lastmod` del sitemap no lo refleja.

### Pasada de revisión 1 (capas externas)

**Qué cambió.** Doce parches, ningún aplazado nuevo, catorce rechazados (detalle en el registro de triaje).
- `src/lib/obras.ts` — `clavesDeOrden` documenta que caben `B − 1` posiciones por rango (la mayor clave que sale es `(B − 2)·B + (B − 2)`, bajo `B² − 1`; el «≥» de la matriz se conserva) y lanza ante un slug de Cita repetido, una lista no vacía de una Obra que ninguna Cita de la entrada resuelve y un aviso fuera de 1…tope − 1.
- `src/pages/cita/[slug].astro` — sin `!`: una Cita sin filtros o sin clave rompe nombrándola.
- `tests/unit/clave-de-orden.test.ts` — la mayor clave con los rangos llenos, las dos entradas incoherentes, la lista vacía que no estorba y el aviso inválido.
- `tests/unit/filtros-de-cita.test.ts` — la ficha `seneca--epistolas` (nombre que no sale del título) y la rotura del build por los dos rangos, comprobando que el parche aplica.
- `tests/unit/publicable-y-alcanzable.test.ts` — cada Página de Cita del `dist/` de todas las familias contra `filtrosDeLaBusqueda`, y ningún filtro de otra clave.
- `tests/e2e/busqueda.spec.ts` — (e) dos Autores filtrados y ordenados por la clave; el metadato fuera del contenido indexado; estilo de la línea de Autor y serif del título por los tokens; sin controles de filtro; (b) y (c) menos atadas al Corpus y al marcado.

**Seguimiento.** `followup_review_recommended: true`: 0 high, 1 medium y 11 low parcheados; puntuación 3·1 + 11 = 14 ≥ 5.

**Verificación de esta pasada.**
- `npx vitest run tests/unit/clave-de-orden.test.ts` — 28 verdes.
- `npx vitest run tests/unit/filtros-de-cita.test.ts` — 6 verdes (tres construcciones).
- `npx vitest run tests/unit/publicable-y-alcanzable.test.ts` — 39 verdes.
- `npm run check` — 0 errores, 0 avisos, 8 pistas.
- `npx playwright test tests/e2e/busqueda.spec.ts --project=escritorio -g "27.1|26.2|22.7|3.1"` — 19 verdes, 1 omitida (Tema bajo umbral: el Corpus de hoy no tiene ninguno).
- `npm test` entero — 149 ficheros, 6.752 pruebas, verdes.

**Riesgos que quedan.** Los de la pasada anterior: `/buscar/` a 34 bytes de `MAX_BYTES_DE_GUION` hasta que la 27.2 empaquete el guion, y la clave que se mueve en las Citas de un Autor sin que el `lastmod` lo refleje. La exactitud en f32 cerca de 2^24 se sostiene por construcción y por la prueba pura; ninguna prueba contra Pagefind llega ahí, porque el Corpus de hoy tiene claves de ~550.000.


### Pasada de revisión 2 (capas externas) — estado vigente

**Qué cambió.** Once parches (1 medium, 10 low), ningún aplazado nuevo, veinte rechazados (detalle en el registro de triaje). El código de producción solo cambia en redacción: `porSlug` de `src/lib/obras.ts` pasa a exportarse y el comentario de `clavesDeOrden` y el de `MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN` dicen lo mismo de la clave mayor y del empate de la lista de obras.
- `tests/unit/ayuda/pagefind.ts` (nuevo) — `metadatosDe` (metadatos contados con el tokenizador y decodificados) e `indiceDe`, que carga en Node el `pagefind.js` generado de una copia y sirve sus trozos del disco.
- `tests/unit/filtros-de-cita.test.ts` — construye con `conBusqueda` y comprueba sobre el índice de verdad `filters()`, el orden por la clave y el `meta.autor` y el contenido de cada Cita: el contrato con Pagefind entra en el CI.
- `tests/unit/publicable-y-alcanzable.test.ts` — cada clave del `dist/` de todas las familias contra `clavesDeOrden` del Corpus de la copia; el metadato con `metadatosDe`.
- `tests/unit/clave-de-orden.test.ts` — empate de recuento al retitular, Autores con la misma clave del Directorio y nombres de prueba al día.
- `tests/e2e/busqueda.spec.ts` — `porSlug` de `obras.ts` en (b) y (e); (c) con la consulta sacada del Corpus y sin desbordar en el móvil; la prueba del metadato fuera del contenido, no vacía, más barata y con mensaje.
- `src/lib/obras.ts`, `src/lib/umbrales.ts` — redacción y la exportación de `porSlug`.

**Seguimiento.** `followup_review_recommended: true`: 0 high, 1 medium y 10 low parcheados; puntuación 3·1 + 10 = 13 ≥ 5.

**Verificación de esta pasada.**
- `npx vitest run tests/unit/clave-de-orden.test.ts tests/unit/filtros-de-busqueda.test.ts` — 38 verdes.
- `npx vitest run` por fichero: `filtros-de-cita` (9, tres construcciones, una con Pagefind), `publicable-y-alcanzable` (39), `tipo-de-resultado` (11), `ingreso-construido` (41), `obra-pagina` (66), `orden-del-libro` (47), `obras` (117), `medicion` (548) — verdes.
- `npm run check` — 0 errores, 0 avisos, 8 pistas.
- `npx playwright test tests/e2e/busqueda.spec.ts --project=escritorio -g "27.1|26.2|22.7|3.1"` — 19 verdes, 1 omitida (Tema bajo umbral: el Corpus de hoy no tiene ninguno); la prueba (c) con `--project=movil` — verde.
- `npm test` entero — 149 ficheros, 6.758 pruebas, verdes.

**Riesgos que quedan.** `/buscar/` a 34 bytes de `MAX_BYTES_DE_GUION` hasta que la 27.2 empaquete el guion. La clave se mueve en todas las Citas de un Autor cuando entra una suya, y en las de todos los Autores posteriores del Directorio cuando entra o sale un Autor —casi todo el sitio si está cerca del principio—, sin que el `lastmod` ni el aviso lo reflejen (AD-27: no es afirmación, y `tools/lib/cambios.ts` no se toca). La exactitud en f32 cerca de 2^24 se sostiene por construcción y por la prueba pura. `indiceDe` depende de que `pagefind.js` pida sus trozos con `fetch` relativo a sí mismo: si una versión de Pagefind cambia eso, la prueba falla en rojo, no en verde.
