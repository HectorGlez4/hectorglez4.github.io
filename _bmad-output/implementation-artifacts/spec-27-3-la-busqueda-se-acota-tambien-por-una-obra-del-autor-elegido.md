---
title: 'Historia 27.3 — La búsqueda se acota también por una Obra del Autor elegido'
type: 'feature'
created: '2026-10-29'
status: 'done'
baseline_revision: '1a4efabe8999c61d4e777d940058534fa008f740'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-27-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred:
  - summary: >-
      La excepción de red del guion de /buscar/ (AD-22) no figura en el texto de la espina: AD-22 habla de la cáscara de tools/, y el fetch del mapa corre en el navegador.
    evidence: |-
      tests/unit/andamiaje.test.ts declara src/components/Busqueda.astro como novena excepción (estrechada en esta revisión a una sola llamada, fetch(RUTA_DEL_MAPA_DE_OBRAS)), pero ARCHITECTURE-SPINE.md no recoge que un guion del cliente pida al propio sitio un JSON del build. Un agente no edita la espina: pendiente de Héctor (bmad-architecture).
    location: >-
      tests/unit/andamiaje.test.ts; _bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md (AD-22)
    severity: low
---

<intent-contract>

## Intent

**Problem:** Desde la 27.2 `/buscar/` acota por Autor y por Tema, pero no por Obra, aunque la 27.1 ya escribe el filtro `obra` (nombre de ficha) en cada Página de Cita: quien eligió un Autor no puede buscar dentro de uno de sus libros, y no existe el mapa de rótulos (nombre de ficha → título y Autor) que AD-11 pide como JSON del build.

**Approach:** `filtrosDeLaBusqueda` compone también el mapa de Obras por Autor, en el orden de la Lista de Obras, que un endpoint escribe en `/buscar/obras.json`; al elegir un Autor, la isla de `Busqueda.astro` pide ese mapa junto a `filters()` de Pagefind e inserta entre Autor y Tema un selector «Obra» («Todas sus obras» + «Título (n citas)»), que busca con `filters.obra`, nombra la Obra en el recuento y viaja en la combinación `autor-obra`/`autor-obra-tema`; el paso final de `npm run build` mide filtros + mapa contra un aviso con nombre.

## Boundaries & Constraints

**Always:**
- **El mapa, del build y de la misma función.** `filtrosDeLaBusqueda` (`src/lib/publicado.ts`) devuelve además `mapaDeObras: Record<slugAutor, [nombreDeFicha, título][]>`: cada Autor con Obras, sus Obras en `ordenDeLaListaDeObras` (el mismo orden que `obrasDelAutor` da a la Página de Autor y a `/obras/`), **toda** Obra con Citas publicadas —también `noindex` y con la familia congelada—. Autores en orden de slug. Un Autor sin Obras no tiene clave. Lo escribe solo `src/pages/buscar/obras.json.ts` (endpoint `.json.ts`, como `robots.txt.ts`: no es superficie) en `RUTA_DEL_MAPA_DE_OBRAS = '/buscar/obras.json'`, constante de `src/lib/busqueda.ts`. Nunca va en el HTML.
- **Solo con intención.** El mapa y `filters()` se piden **al elegir un Autor** (no al cargar, no al enfocar, no con `?q=` sin Autor), juntos (`Promise.all`); un éxito se guarda para la carga; un fallo de cualquiera de los dos (red, JSON inválido, `filters()` que rechaza) no deja promesa rechazada sin manejar, no pinta selector de Obra, no toca la búsqueda en curso y se reintenta al siguiente Autor elegido (el mapa con `fetch` de nuevo; Pagefind con el reintento de `cargar` que ya existe).
- **Selector de Obra.** No existe en el DOM vivo sin Autor, con un Autor sin Obras ofrecibles, o sin datos: va en el `<template>` entre los `.selector` de Autor y Tema y el guion lo **separa** del clon antes de insertar, y lo reinserta en ese hueco cuando hace falta. Se compone cuando están a la vez el Autor vigente y los datos: opciones = Obras del Autor **en el orden del mapa**, solo las que `filters().obra` cuenta con ≥ 1 (la que falta en uno u otro se omite en silencio); primera «Todas sus obras» (valor vacío); rótulo `«{título} ({recuentoDeCitas(n)})»` por `textContent`/`new Option`, con `n` de `filters()` (total del índice: no cambia con texto ni con otros filtros). Si no queda ninguna, no aparece. Insertarlo o quitarlo no mueve el foco. Label visible «Obra», `id="filtro-de-obra"`, `data-selector-de-obra`, mismo estilo que los otros `select`.
- **Cambiar el Autor quita la Obra.** Al `change`/`input` del selector de Autor: la Obra elegida se vacía y el selector de Obra se quita al momento; se recompone para el Autor nuevo cuando se cumple la pausa de los selectores (y los datos están). Llegadas tardías se pintan solo si el Autor sigue siendo el mismo. Elegir Obra o Tema no recompone el de Obra. «Quitar los filtros» quita los tres y el selector de Obra.
- **Buscar con Obra.** `FiltrosElegidos` gana `obra`; `filtrosDePagefind` añade `obra` (`FILTROS_DE_CITA.obra`); sin texto, `search(null, { filters, sort: { orden: 'asc' } })` —las Citas de la Obra en el orden de su Página de Obra—. `combinacionDeFiltros` pasa `obra` a `filtrosUsados` (`autor-obra`, `autor-obra-tema`); `valoresDeFiltros` sin Obra sigue siendo `autor|tema` y con Obra `autor|tema|obra`. Recuento: `fraseDelRecuento` gana `obra?` (el **título** del mapa, nunca el rótulo con su recuento): «23 citas de José Martí en Maestros ambulantes.», «Una cita de José Martí en Maestros ambulantes sobre la prudencia.», « con «…»» al final. El selector de Obra comparte `alElegir` (pausa de los selectores, segundo ritmo `ahora`).
- **De Obra como resultado, solo las indexables**: ya es así (las `noindex` no están en Pagefind, 22.4); una prueba lo fija.
- `recuentoDeCitas` se muda a `src/lib/recuentos.ts` y `src/lib/atribucion.ts` la reexporta (precedente de `temaEnFrase`).
- **Tamaño con aviso.** `AVISO_DE_BYTES_DE_FILTROS_Y_MAPA` en `src/lib/umbrales.ts` (una sola cifra: lo que la isla descarga junto) = suma de `dist/pagefind/filter/**` + `dist/buscar/obras.json` medida con `npm run build` al implementar, + 25 %, redondeada arriba a 10 KiB (regla de `MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS`), con fecha y la cifra del 2026-10-17 (~41 KB de filtros) en el docblock. `tools/lib/peso.ts` (puro) lo mide desde el listado que ya recibe y `integraciones/peso.ts` lo informa: una cifra (filtros, mapa, suma, aviso); pasarlo **avisa** (`::warning::` en Actions) y nunca cambia el código de salida; si falta una de las dos partes, la cifra lo dice y no escribe cero.
- Tope del guion: `MAX_BYTES_GUION_DE_LA_BUSQUEDA` se rederiva con la regla de la 27.2 (medido sobre `dist/` + ~400, con fecha); si el trozo compartido cambia, también `MAX_BYTES_GUION_DEL_FILTRO` con la misma regla.
- Tabulación por el DOM: campo, Autor, Obra, Tema, «Quitar los filtros», resultados. Nada con `white-space: nowrap`; el `select` sigue con `white-space: normal` y `overflow-wrap: anywhere`.

**Block If:**
- Hace falta subir `MAX_BYTES_DE_GUION` o `MAX_BYTES_GUION_DE_PAGEFIND`, o tocar `src/lib/ingreso.ts`.
- Pagefind 1.5.2 no ofrece `filters()` con recuentos por valor de `obra`, o `search(null, { filters: { autor, obra }, sort })` no devuelve las Citas de la Obra en el orden de `orden`.

**Never:** leer o escribir `autor`/`obra`/`tema` de la dirección, `pushState`, descartar filtros inexistentes de la dirección o tomar el Autor de `obra` sin `autor` (27.4); «Mostrar 30 más» (27.5); frases a cero con filtros o destacados (27.6); `<noscript>`/fallo del índice (27.7); «Buscar en…» (27.8); trocear filtros o mapa; partir el nombre de ficha en el cliente; ordenar Obras en el cliente; el mapa o las opciones de Obra en el HTML; dependencias nuevas; editar artefactos de planificación.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sin Autor | carga, foco, `?q=x` | ni selector de Obra en el DOM ni petición del mapa ni `filters()` | — |
| Autor con Obras | elegir `jose-marti` | tras la pausa y los datos, «Obra» entre Autor y Tema: «Todas sus obras», luego sus Obras en orden del mapa, «Título (23 citas)» / «(1 cita)»; foco sigue en Autor | — |
| Autor sin Obras | todas sus Citas sin Obra | no aparece selector de Obra | — |
| Homónimas | dos Autores con «Cartas» | cada selector ofrece solo su ficha (`seneca--cartas` / `jose-marti--cartas`) | — |
| Obra elegida | Autor + Obra, sin texto | `search(null,{filters:{autor,obra},sort:{orden:'asc'}})`; «N citas de {Autor} en {título}.»; asentada `autor-obra` | — |
| Obra + Tema + texto | | `search(texto,{filters:{autor,obra,tema}})`; «… en {título} sobre {tema} con «texto».»; `autor-obra-tema` | — |
| Cambiar Autor | Obra elegida, otro Autor | Obra vacía y selector quitado al momento; rehecho con las del nuevo tras la pausa | respuesta tardía del Autor viejo: no se pinta |
| Quitar Autor / «Quitar los filtros» | | selector de Obra fuera; búsqueda como en la 27.2 | — |
| Desfase de despliegues | `filters()` trae una Obra que el mapa no nombra (o al revés) | se omite; las demás se ofrecen | — |
| Fallo | `fetch` del mapa o `filters()` rechazan | sin selector de Obra, la búsqueda por Autor sigue; reintento al siguiente Autor | sin promesas sin manejar |
| Obra `noindex` | Obra de 1 Cita | es opción y filtra; nunca sale como resultado de tipo Obra | — |

</intent-contract>

## Code Map

- `src/components/Busqueda.astro` -- isla de la 27.2: `<template>` (fieldset con `.selector` de Autor/Tema, 133-162), `iniciar` (clon e inserción, 310-328), `elegidos`/`nombreDe` (346-348), `cargar` (350-), `buscar` (433-: `nombres`, `filtrosDePagefind`, `visto`), `alElegir` (505-514), «Quitar» (517-525), `submit` (527-). Interfaz `Pagefind` (297-): añadir `filters()`. Docblock de reglas: añadir las de la 27.3.
- `src/pages/buscar.astro` -- monta `<Busqueda autores temas />` (47-51, 61); no recibe Obras (el mapa no va en el HTML).
- `src/lib/busqueda.ts` -- `FiltrosElegidos`, `hayFiltros`, `filtrosDePagefind`, `combinacionDeFiltros` (hoy `obra: false`), `valoresDeFiltros`, `fraseDelRecuento`; añadir `RUTA_DEL_MAPA_DE_OBRAS`, tipo `MapaDeObras` y una función pura `opcionesDeObra(mapa, recuentos, autor)` → `{ valor, titulo, recuento }[]` (orden del mapa, intersección, ≥ 1). Apta para el cliente: su grafo lo fija `busqueda-con-filtros.test.ts:88`.
- `src/lib/publicado.ts:794-891` -- `FiltrosDeLaBusqueda`/`filtrosDeLaBusqueda` (añadir `mapaDeObras`); `obrasDelAutor` (761) y `ordenDeLaListaDeObras` (reexporta de `src/lib/obras.ts:137`), dueño único del orden (AD-25).
- `src/pages/medicion/[version].js.ts` -- precedente de endpoint con tipo en el nombre (no superficie; `publicable-y-alcanzable.test.ts:123-200` solo exige declarar `.astro`).
- `src/lib/recuentos.ts` / `src/lib/atribucion.ts:172` -- `recuentoDeCitas` («1 cita», «23 citas»), que usa `src/components/ListaDeObras.astro:52`.
- `src/lib/vocabulario.ts:155-174` -- `FILTROS` ya incluye `autor-obra`, `autor-obra-tema`; `filtrosUsados`.
- `src/lib/tipoDeResultado.ts:97` -- `FILTROS_DE_CITA.obra`.
- `src/lib/umbrales.ts:510` (`MAX_BYTES_GUION_DE_PAGEFIND`, no se mueve), `:551-572` (`MAX_BYTES_GUION_DE_LA_BUSQUEDA`), `:513-541` (filtro), `:657-670` (`MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS`: la regla del aviso).
- `tools/lib/peso.ts` -- `medirDist` (105) ya recorre todas las rutas con sus bytes; `parteDePeso` (251) compone cifras/avisos y `anotado`. Añadir la medida de filtros (`pagefind/filter/`) y mapa (`buscar/obras.json`) y su veredicto de aviso, sin tocar el de peso. `integraciones/peso.ts` pasa el umbral nuevo; su prueba de importaciones (`tests/unit/peso.test.ts`) sigue.
- `tests/unit/ayuda/busqueda.ts` -- entorno simulado: DOM que lanza ante lo desconocido (`querySelector` 194, `selector()` 224), Pagefind de mentira (~420-460). Darle `[data-selector-de-obra]` y su `.selector` separable/reinsertable (`remove`, `after`/`before`), `new Option`/`createElement('option')`, `filters()` configurable y `fetch` del mapa configurable (éxito, fallo, retardo).
- `tests/unit/medicion.test.ts` -- describe «Historia 27.2» (matriz en el entorno simulado): añadir «Historia 27.3».
- `tests/unit/busqueda-con-filtros.test.ts` -- puras (59-190), fixture construido (200-286), ganchos del fichero frente al HTML (360-417, lista `EN_LA_PLANTILLA` 374), índice real con `indiceDe` (419-475). El andamio siembra las fichas de Obra solo (`tests/unit/ayuda/construir.ts:166`).
- `tests/unit/filtros-de-busqueda.test.ts` -- pruebas puras de `filtrosDeLaBusqueda` (71-130).
- `tests/e2e/busqueda.spec.ts` -- describe «Historia 27.2» (1061-1342, la de 360 px en 1309-1333), «sin selector de Obra» (973), carga diferida 3.1 (245-270). `tests/e2e/accesibilidad.spec.ts` -- `CONDICIONES` del reflujo 26.9 (780-890) y `/buscar/` a 320 px (1000-1110), barridos axe de `/buscar/` con filtros.

## Tasks & Acceptance

**Execution:**
- `src/lib/recuentos.ts`, `src/lib/atribucion.ts` -- mudar `recuentoDeCitas` y reexportar -- una sola concordancia en el cliente.
- `src/lib/busqueda.ts` -- `obra` en `FiltrosElegidos` y en las cuatro funciones; `fraseDelRecuento({ obra? })`; `RUTA_DEL_MAPA_DE_OBRAS`, `MapaDeObras`, `opcionesDeObra` y el rótulo «{título} ({recuentoDeCitas(n)})» -- decisión pura (AD-5).
- `src/lib/publicado.ts` -- `mapaDeObras` en `filtrosDeLaBusqueda` con `ordenDeLaListaDeObras` -- AD-11, AD-25.
- `src/pages/buscar/obras.json.ts` (nuevo) -- `GET` con `JSON.stringify(filtrosDeLaBusqueda(await conjuntoPublicable()).mapaDeObras)` y `Content-Type: application/json` -- mapa del build, fuera del HTML.
- `src/components/Busqueda.astro` -- `.selector` de Obra en la plantilla; separarlo al clonar; pedir mapa + `filters()` al elegir Autor; componer/quitar según Always; `obra` en `elegidos`, `nombres` (título del mapa), «Quitar»; docblock al día -- FR-7, UX-DR87/89/100.
- `src/lib/umbrales.ts` -- `AVISO_DE_BYTES_DE_FILTROS_Y_MAPA` y rederivar `MAX_BYTES_GUION_DE_LA_BUSQUEDA` (y el del filtro si cambia), con cifras y fecha -- AD-9, AD-6.
- `tools/lib/peso.ts`, `integraciones/peso.ts` -- medida y aviso de filtros + mapa en el paso final -- AD-9 v8.2.
- `tests/unit/peso.test.ts` -- cifra con las dos partes, aviso al pasar sin cambiar el código de salida, anotación en Actions, parte ausente sin cero.
- `tests/unit/filtros-de-busqueda.test.ts` -- `mapaDeObras`: por Autor, el orden de `obrasDelAutor`; incluye Obra de 1 Cita y congelada; homónimas en sus Autores; Autor sin Obras sin clave; retitular conserva el nombre.
- `tests/unit/busqueda-con-filtros.test.ts` -- puras: frases con Obra (singular, con Tema y texto), filtros/combinaciones/valores con Obra, `opcionesDeObra` (orden del mapa aunque los recuentos digan otro, intersección en los dos sentidos, sin opciones → vacío, rótulos «(1 cita)»); `recuentoDeCitas` reexportada es la misma función. Construidas (fixture ampliado: un Autor con dos Obras, una de 1 Cita `noindex`; dos Autores con una Obra del mismo título; un Autor sin Obra —las pruebas de la 27.2 siguen verdes—): `dist/buscar/obras.json` igual a `mapaDeObras` y ausente del HTML de `/buscar/`; la plantilla con el `.selector` de Obra entre Autor y Tema y sin opciones de Obra; `[data-selector-de-obra]` en `EN_LA_PLANTILLA`; con `indiceDe`: `filters().obra` cuenta lo mismo que `mapaDeObras`/`filtrosDeLaBusqueda`, `search(null,{filters:{autor,obra},sort})` da las Citas de `citasPorObra` en su orden, la Obra `noindex` filtra y nunca sale como resultado de tipo Obra.
- `tests/unit/ayuda/busqueda.ts`, `tests/unit/medicion.test.ts` -- describe «Historia 27.3» con la matriz entera: sin pedir nada sin Autor; aparición tras pausa y datos sin mover el foco; orden del mapa; omisiones por desfase; Autor sin Obras; cambio y retirada de Autor (respuesta tardía no pinta); fallo de mapa o de `filters()` sin rechazo sin manejar y reintento; búsqueda, recuento y asentamiento `autor-obra`/`autor-obra-tema` con valores `autor|tema|obra`; «Quitar los filtros».
- `tests/e2e/busqueda.spec.ts` -- describe «Historia 27.3»: sin Autor no hay `#filtro-de-obra` y no se pide `/buscar/obras.json`; elegir un Autor del Corpus lo hace aparecer entre Autor y Tema con «Todas sus obras» y las Obras en el orden de `obrasDelAutor`, rótulos con recuento, foco en Autor; elegir Obra da «N citas de {Autor} en {título}.» y solo Citas de esa Obra en el orden de su Página de Obra; cambiar el Autor lo rehace, quitarlo lo quita; tabulación con Obra; a 360 px (`--project=movil`) medir el alto del `fieldset` con los tres selectores y «Quitar los filtros» y escribirlo en anotación y consola; ajustar la línea 973.
- `tests/e2e/accesibilidad.spec.ts` -- `/buscar/` con un Autor elegido, la Obra del título más largo del Corpus elegida (de `filtrosDeLaBusqueda`), «Quitar los filtros» y resultados: a 320 px en las tres `CONDICIONES` sin desbordar ni `nowrap`, y axe 2.2 AA en ese estado.
- `_bmad-output/implementation-artifacts/spec-27-3-…md` -- anotar con fecha, en el Auto Run Result, el alto de los tres selectores a 360 px (UX-DR87 estimó ~252 px) y las cifras de filtros + mapa.

**Acceptance Criteria:**
- Given `dist/` construido con `npm run build`, when corre el paso final, then informa los bytes de los filtros de Pagefind, del mapa y su suma frente a `AVISO_DE_BYTES_DE_FILTROS_Y_MAPA`, y con un aviso por debajo de lo medido (prueba de `peso.test.ts`) avisa y sale con 0.
- Given el sitio construido, when se carga `/buscar/` sin interactuar, then ni el HTML contiene el mapa ni las opciones de Obra, ni hay `#filtro-de-obra` en el DOM, ni se ha pedido `/buscar/obras.json`.
- Given `npx vitest run` de `busqueda-con-filtros`, `filtros-de-busqueda`, `medicion`, `peso`, `filtros-de-cita`, `tipo-de-resultado`, `ingreso-construido`, `espinas-de-ux`, `siguiente`, `publicable-y-alcanzable`, `filtro-del-directorio`, when corren uno a uno, then pasan.
- Given el sitio construido, when corren `tests/e2e/busqueda.spec.ts --project=escritorio`, `--project=movil -g "27.3"`, `tests/e2e/accesibilidad.spec.ts -g "buscar"` y `tests/e2e/receptor.spec.ts -g "busca"`, then pasan.
- Given la rama, when corren `npm run check` y `npm test` entero con `correr.sh`, then 0 errores y verde.
- Given el diff contra `baseline_revision`, when se listan los ficheros, then ni `src/lib/ingreso.ts`, ni `MAX_BYTES_DE_GUION`/`MAX_BYTES_GUION_DE_PAGEFIND`, ni nada de `_bmad-output/planning-artifacts/` o `_bmad-output/specs/` ha cambiado.

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

Las capas de revisión de este pase son externas (bucle v8-ralph) y no traían hallazgos todavía: la revisión independiente viene después.

### 2026-10-29 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 11: (high 0, medium 1, low 10)
- defer: 1: (high 0, medium 0, low 1)
- reject: 23: (high 0, medium 3, low 20)
- addressed_findings:
  - `[medium]` `[patch]` Un `filters()` sin el filtro `obra` se guardaba como éxito (`recuentos = {}`) y bloqueaba el selector de Obra el resto de la carga (blind-hunter, edge-case-hunter, intent-alignment): ahora lanza y cuenta como fallo, sin promesa rechazada, y se reintenta al siguiente Autor. Nueva fila en la tabla de fallos de `medicion.test.ts` (opción `fallanLosFiltros: 'sin-obra'` del entorno simulado).
  - `[low]` `[patch]` Un título ausente daba «… en .»: `buscar` ya no pasa `obra` sin título conocido, `fraseDelRecuento` no nombra una Obra vacía ni una Obra sin su Autor, y `opcionesDeObra` no ofrece un par con nombre o título vacíos. Pruebas puras en `busqueda-con-filtros.test.ts`.
  - `[low]` `[patch]` `pedirDatosDeObra().then(componerObra)` podía dejar un rechazo sin manejar si `componerObra` lanzaba: se le añade `.catch(() => {})`.
  - `[low]` `[patch]` Los dos tipos del mapa (`MapaDeObrasPorAutor` del build y `MapaDeObras` del cliente) no estaban atados: `src/pages/buscar/obras.json.ts` escribe ahora un valor anotado con `MapaDeObras`, y `astro check` falla si se separan.
  - `[low]` `[patch]` El docblock de `AVISO_DE_BYTES_DE_FILTROS_Y_MAPA` hablaba de «lo que la isla descarga» y suma bytes en disco de ficheros comprimidos (`.pf_filter`) y sin comprimir (el mapa): dice ahora que son bytes en disco y una cota por arriba de la transferencia.
  - `[low]` `[patch]` La excepción de AD-22 cubría todo `Busqueda.astro`: una prueba nueva de `andamiaje.test.ts` la estrecha a una sola llamada, `fetch(RUTA_DEL_MAPA_DE_OBRAS)`, y cualquier otra petición en el componente vuelve a dar rojo.
  - `[low]` `[patch]` La prueba de punta a punta «sin Autor» no comprobaba `filters()`: ahora exige que no se haya pedido ningún fichero de `/pagefind/filter/` tras cargar, enfocar y teclear (antes del Tema, que filtra y sí los carga).
  - `[low]` `[patch]` Nada afirmaba Inter ni los 17 px del selector de Obra: la prueba de aparición lee su estilo calculado.
  - `[low]` `[patch]` Nada comprobaba que cambiar el Autor no mueve el foco: la prueba de cambio de Autor lo exige al rehacerse el selector.
  - `[low]` `[patch]` Nada comprobaba que el recuento de cada opción no cambia con el texto: la prueba simulada de Obra, Tema y texto lo mira tras teclear.
  - `[low]` `[patch]` El barrido de `nowrap` a 320 px miraba solo `form *` y la comprobación del borde derecho del selector no podía fallar: ahora barre también `[data-resultados] *` y exige que el selector de Obra no se desplace por dentro (`scrollWidth ≤ clientWidth`).

Rechazados, con su motivo: el valor recortado en el selector cerrado a 320 px (ac-auditor, criterio 12) lo permite `EXPERIENCE.md § Búsqueda` —«El valor elegido puede recortarse en el control cerrado; la lista lo muestra entero»— y la prueba ya exige no desbordar; quitar el selector al momento al recorrer Autores con flechas lo manda el contrato; anunciar la aparición del selector no lo pide ningún artefacto de UX y el selector aparece detrás del foco en el orden de tabulación; el alto de 312,3 px a 360 px está anotado, que es lo que pide la historia; el mapa en caché tras retitular es un desfase de ≤ 600 s que el contrato asume; el mapa ausente en `dist/` ya lo nombra el parte («sin suma ni veredicto») y lo fija la prueba construida; el recálculo de `obrasDelAutor` y el prefijo repetido del mapa son de coste y forma sin defecto observable; la prueba que depende del Corpus, la fila «Autor sin Obras» sin punta a punta y la lectura de la Página de Obra ya están acotadas o anotadas; el estado `done` previo y la línea de verificación se rehacen en este pase; la documentación del aviso vive en su docblock; el disparo solo al elegir Autor, el mapa por Autor, el Autor vigente y el CI sin punta a punta son decisiones del contrato o del proyecto.

## Design Notes

**Por qué el selector vive en la plantilla y se separa.** Así su marcado y su estilo de ámbito salen del build como los de la 27.2, y el guion no lleva contenido; separado del clon, «no existe» es literal (UX-DR87) y reinsertarlo en su hueco lo deja entre Autor y Tema sin calcular posiciones.

**Por qué el mapa agrupa por Autor.** `{ "jose-marti": [["jose-marti--maestros-ambulantes", "Maestros ambulantes"], …] }` dice nombre → título y Autor sin repetir el Autor en cada entrada, y el orden de cada lista es el de la Lista de Obras: la isla solo cruza con `filters()`. La 27.4 sacará el Autor de una `obra` sin `autor` buscando el nombre en las listas, nunca partiéndolo.

**Una sola cifra de aviso.** El spine habla de «los filtros de Pagefind con el mapa de rótulos» como un solo aplazado: la isla los descarga juntos, y trocearlos (por Autor) es la misma decisión. El parte da las dos partes para que se vea cuál crece.

## Verification

**Commands:**
- `npx vitest run tests/unit/busqueda-con-filtros.test.ts` y, uno por llamada, el resto de la lista del AC -- verdes (`medicion` con `correr.sh` si pasa de 8 min).
- `npm run check` -- 0 errores.
- `npm run build` -- termina con 0 e informa filtros + mapa.
- `npx playwright test tests/e2e/busqueda.spec.ts --project=escritorio`, `--project=movil -g "27.3"`, `tests/e2e/accesibilidad.spec.ts -g "buscar"`, `tests/e2e/receptor.spec.ts -g "busca"` -- verdes (con `correr.sh`/`esperar.pl` si pasan de 8 min).
- `npm test` entero con `correr.sh` -- verde.

## Auto Run Result

Status: done

Planificada el 2026-10-29 y detenida tras planificar. Implementada el 2026-10-29 en la rama `v8/epica-27` (bucle v8-ralph, implementación en línea). Sin condición de bloqueo.

**Qué se hizo.** `filtrosDeLaBusqueda` compone también `mapaDeObras` —por slug de Autor, sus Obras como `[nombre de ficha, título]` en el orden de `obrasDelAutor`, toda Obra con Citas publicadas— y `src/pages/buscar/obras.json.ts` lo escribe en `RUTA_DEL_MAPA_DE_OBRAS` (`/buscar/obras.json`), fuera del HTML. La isla de `Busqueda.astro` lleva en su plantilla el `.selector` de Obra entre Autor y Tema, lo separa del clon al insertar y lo reinserta tras el de Autor cuando hay a la vez Autor vigente (el de la última búsqueda lanzada) y datos; pide mapa y `filters()` con `Promise.all` solo al elegir un Autor, guarda cada éxito para la carga y reintenta al siguiente Autor tras un fallo, sin promesas rechazadas. Las opciones salen de `opcionesDeObra` (orden del mapa, intersección con `filters().obra` ≥ 1) y `rotuloDeObra` («Título (23 citas)»); cambiar o quitar el Autor y «Quitar los filtros» quitan la Obra al momento. La Obra viaja en `filtrosDePagefind`, `combinacionDeFiltros` (`autor-obra`, `autor-obra-tema`), `valoresDeFiltros` (`autor|tema|obra`) y `fraseDelRecuento` («… en {título} …»). `recuentoDeCitas` se muda a `recuentos.ts` y `atribucion.ts` la reexporta. El paso final de `npm run build` mide filtros + mapa contra `AVISO_DE_BYTES_DE_FILTROS_Y_MAPA` y avisa sin cambiar el código de salida.

**Cifras (2026-10-29, `npm run build` sobre el Corpus de la rama).** Filtros de Pagefind 52.625 bytes en 4 ficheros (52.511 en la primera construcción: varían ~100 bytes entre construcciones), mapa 44.393 bytes (517 Obras de 135 Autores), suma 97.018 → `AVISO_DE_BYTES_DE_FILTROS_Y_MAPA` = 120 KiB (122.880). Guion de la búsqueda 10.810 bytes (10.258 + 552 del trozo) → `MAX_BYTES_GUION_DE_LA_BUSQUEDA` = 11.210; el trozo compartido pasa de 501 a 552, así que el filtro mide 3.515 → `MAX_BYTES_GUION_DEL_FILTRO` = 3.915. `MAX_BYTES_DE_GUION` y `MAX_BYTES_GUION_DE_PAGEFIND` no se mueven.

**Alto de los tres selectores a 360 px (2026-10-29, `--project=movil`).** El `fieldset` con Autor, Obra, Tema y «Quitar los filtros» mide **312,3 px** (UX-DR87 estimó ~252 px): tres selectores de 44 px a 320 px de ancho, «Quitar los filtros» de 44 px, sin desbordar ni `nowrap`.

**Ficheros.**
- `src/lib/recuentos.ts`, `src/lib/atribucion.ts` — `recuentoDeCitas` mudada y reexportada.
- `src/lib/busqueda.ts` — `obra` en `FiltrosElegidos` y en las cuatro funciones (la Obra nunca cuenta sin Autor), `fraseDelRecuento({ obra })`, `RUTA_DEL_MAPA_DE_OBRAS`, `MapaDeObras`, `opcionesDeObra`, `rotuloDeObra`.
- `src/lib/publicado.ts` — `mapaDeObras` en `filtrosDeLaBusqueda`, desde `obrasDelAutor`.
- `src/pages/buscar/obras.json.ts` — nuevo endpoint del mapa (tipo en el nombre: no es superficie).
- `src/components/Busqueda.astro` — selector de Obra en la plantilla y en el guion; docblock con las reglas de la 27.3.
- `src/lib/umbrales.ts` — `AVISO_DE_BYTES_DE_FILTROS_Y_MAPA` y los dos topes de guion rederivados.
- `tools/lib/peso.ts`, `integraciones/peso.ts` — medida, cifra y aviso de filtros + mapa en el paso final.
- `tests/unit/ayuda/busqueda.ts` — el entorno simulado sabe del `.selector` de Obra, `new Option`, el `fetch` del mapa y `filters()`.
- `tests/unit/medicion.test.ts` — describe «Historia 27.3» con la matriz entera.
- `tests/unit/busqueda-con-filtros.test.ts` — puras de la Obra y fixture ampliado (Obras homónimas, una `noindex`), mapa en `dist/`, plantilla, índice real.
- `tests/unit/filtros-de-busqueda.test.ts` — `mapaDeObras`.
- `tests/unit/peso.test.ts`, `tests/unit/peso-construido.test.ts` — la cifra, el aviso, la anotación y la parte ausente.
- `tests/unit/andamiaje.test.ts` — novena excepción deliberada de AD-22: el `fetch` del guion de `/buscar/`, que corre en el navegador y pide al propio sitio el JSON del build.
- `tests/e2e/busqueda.spec.ts` — describe «Historia 27.3» y la tabulación de la 27.2 con Obra.
- `tests/e2e/accesibilidad.spec.ts` — `/buscar/` con la Obra del título más largo: reflujo a 320 px en las tres condiciones y axe 2.2 AA.

**Revisión.** Pase sin hallazgos (capas externas pendientes): 0 parches, 0 aplazados, 0 rechazados. `followup_review_recommended: false` (0 parches; puntuación 0).

**Verificación.**
- `npm run check` — 0 errores, 0 avisos.
- `npm run build` — sale con 0 e informa «Filtros de Pagefind y mapa de Obras de /buscar/: … suman 97.018 bytes (94,7 KiB); aviso en 122.880 bytes (120 KiB)».
- `npx vitest run` uno a uno: `busqueda-con-filtros` (34), `filtros-de-busqueda` (14), `medicion` (598), `peso` (63), `peso-construido` (14), `filtros-de-cita` (9), `tipo-de-resultado` (11), `ingreso-construido` (41), `espinas-de-ux` (14), `siguiente` (20), `publicable-y-alcanzable` (39), `filtro-del-directorio` (22), `directorio-de-autores` (28), `andamiaje` (40) — todos verdes.
- Playwright: `busqueda.spec.ts --project=escritorio` (primera pasada: 47 verdes y 1 fallo de la prueba nueva; corregida, se volvió a correr solo esa prueba, en verde; el fichero entero se repasó en verde en el pase de revisión, abajo), `busqueda.spec.ts -g "27.3"` en los dos proyectos (11 verdes, 3 omitidas: el Autor sin Obras —el Corpus no tiene ninguno— y la de 360 px en escritorio), `accesibilidad.spec.ts -g "buscar"` (22 verdes), `receptor.spec.ts -g "busca"` (8 verdes, 8 omitidas por proyecto).
- `npm test` entero con `correr.sh`: primera pasada 149/150 ficheros verdes, con `andamiaje.test.ts` en rojo por el `fetch` nuevo (AD-22); con la excepción añadida, segunda pasada **150/150 ficheros, 6.866 pruebas verdes** (875 s).

**Riesgos y notas.**
- El andamio de las pruebas construidas no admite un Autor sin ninguna Obra (sus Citas irían sin documento y el censo de cotejo es cerrado): esa fila de la matriz la cubren `filtros-de-busqueda.test.ts`, el entorno simulado de `medicion.test.ts` y, si el Corpus tuviera uno, `busqueda.spec.ts` (hoy se omite: los 135 Autores tienen Obra).
- El selector de Obra solo aparece cuando la búsqueda del Autor se lanza (pausa de los selectores, tecleo o Enter): es el «Autor vigente». Si se teclea dentro de la pausa, la búsqueda tecleada hace vigente al Autor y el selector aparece con ella.
- La excepción de AD-22 para `Busqueda.astro` es una decisión de esta historia (el `fetch` lo exige AD-11); si Héctor prefiere otra forma de pedir el JSON, se revisa ahí.

### Pase de revisión del 2026-10-29 (capas externas)

**Qué cambió.** Once parches, ninguno de contrato (detalle en el Review Triage Log): un `filters()` sin el filtro `obra` cuenta como fallo y se reintenta, en vez de quedar guardado como «ninguna Obra»; la Obra no se nombra en el recuento sin título ni sin Autor, y `opcionesDeObra` no ofrece pares con nombre o título vacíos; `componerObra` no puede dejar un rechazo sin manejar; el endpoint del mapa escribe un valor tipado con `MapaDeObras`; el docblock del aviso dice que son bytes en disco; la excepción de AD-22 se estrecha a la llamada `fetch(RUTA_DEL_MAPA_DE_OBRAS)`; y las pruebas cubren `filters()` sin pedir antes de un Autor, Inter y 17 px, el foco al cambiar de Autor, el recuento que no cambia con el texto, `nowrap` también en los resultados y el selector de Obra que no se desplaza por dentro a 320 px.

**Ficheros de este pase.** `src/components/Busqueda.astro`, `src/lib/busqueda.ts`, `src/lib/umbrales.ts` (solo docblock), `src/pages/buscar/obras.json.ts`, `tests/unit/andamiaje.test.ts`, `tests/unit/ayuda/busqueda.ts`, `tests/unit/medicion.test.ts`, `tests/unit/busqueda-con-filtros.test.ts`, `tests/e2e/busqueda.spec.ts`, `tests/e2e/accesibilidad.spec.ts`.

**Hallazgos.** 11 parches (1 medio, 10 bajos), 1 aplazado (AD-22 en la espina, pendiente de Héctor), 23 rechazados. `followup_review_recommended: true`: parches medios 1 y bajos 10, puntuación 3 × 1 + 10 = 13 (≥ 5).

**Verificación del pase.**
- `npm run check` — 0 errores, 0 avisos.
- `npx vitest run tests/unit/andamiaje.test.ts` (41) y `tests/unit/busqueda-con-filtros.test.ts` (35) — verdes; `tests/unit/medicion.test.ts -t "27.3"` (19) — verde.
- `npm run build` — sale con 0; «filtros 52.542 bytes en 4 ficheros; mapa 44.393 bytes; suman 96.935 bytes (94,7 KiB); aviso en 122.880 bytes». El guion de la búsqueda mide 10.358 + 552 del trozo = 10.910 bytes, bajo `MAX_BYTES_GUION_DE_LA_BUSQUEDA` (11.210), que no se mueve.
- Playwright sobre lo construido: `busqueda.spec.ts --project=escritorio` (48 verdes, 4 omitidas), `busqueda.spec.ts --project=movil -g "27.3"` (6 verdes, 1 omitida; el `fieldset` vuelve a medir 312,3 px a 360 px), `accesibilidad.spec.ts -g "buscar"` (22 verdes, incluidas las dos de la 27.3 en los dos proyectos), `receptor.spec.ts -g "busca"` (8 verdes, 8 omitidas). Puertos libres al terminar.
- `npm test` entero con `correr.sh` — **150/150 ficheros, 6.869 pruebas verdes** (877 s).

**Riesgos.** El valor elegido del selector de Obra se recorta en el control cerrado con un título largo a 320 px; lo admite `EXPERIENCE.md` y la lista lo muestra entero. La excepción de red del guion queda por escribir en la espina (aplazado).

