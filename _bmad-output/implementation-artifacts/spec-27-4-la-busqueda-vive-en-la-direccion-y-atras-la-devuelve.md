---
title: 'Historia 27.4 — La búsqueda vive en la dirección, y «atrás» la devuelve'
type: 'feature'
created: '2026-10-29'
status: 'done'
baseline_revision: 'de5230938c38d2a4a5e75626288ddd37a35d01b8'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-27-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred:
  - summary: >-
      A cero resultados con aviso de la dirección, la sugerencia se ve dos veces: en la región del recuento, que no se aparta para que el aviso se vea, y en la salida.
    evidence: |-
      `pintar` en `src/components/Busqueda.astro` deja la región visible con «aviso + sugerencia» cuando hay aviso, y `salida` se enseña con la misma `.sugerencia`. El propio pase lo anotó en Riesgos; la épica asigna las frases a cero a la Historia 27.6, que las rehace, y la decisión de cómo enseñar el aviso a cero es de esa historia.
    location: >-
      src/components/Busqueda.astro (pintar)
    severity: low
---

<intent-contract>

## Intent

**Problem:** Desde la 27.3 `/buscar/` acota por Autor, Obra y Tema, pero el estado vive solo en la isla: la dirección solo lee `?q=` al llegar, nada se escribe en el historial salvo la marca de asentada, «atrás» no devuelve la búsqueda anterior y una búsqueda filtrada no se puede compartir copiando la dirección (FR-7, NFR-4, UX-DR87, UX-DR93, AD-13).

**Approach:** Funciones puras nuevas en `src/lib/busqueda.ts` leen, componen, comparan y resuelven el estado `?q=&autor=&obra=&tema=` y deciden cada escritura del historial; la isla de `Busqueda.astro` escribe la dirección compuesta desde su estado tras la pausa (`pushState`/`replaceState`, siempre en `try`), resuelve la llegada y `popstate` con el orden fijo, dice los filtros que no se pueden usar y conserva las reglas de asentamiento de la 23.8 entre entradas, caché de atrás y adelante y recarga.

## Boundaries & Constraints

**Always:**
- **Dirección = estado, con identificadores.** `?q=&autor=&obra=&tema=` en ese orden, solo los no vacíos: `q` = texto recortado (solo espacios = sin `q`), `autor` = slug, `obra` = nombre de ficha y **solo con `autor`**, `tema` = slug; ruta de `rutaDeLaBusqueda()`; sin estado, `/buscar/` a secas. Se compone **siempre desde el estado de la isla** (`direccionDeLaBusqueda`), nunca copiando ni editando `location.search`: lo que la dirección traiga de más (otro parámetro, `de`, `via`) no vuelve. La búsqueda no lee ni escribe `de`/`via`.
- **Cuándo se escribe.** Lo tecleado, al cumplirse `PAUSA_DE_TECLEO_MS` desde la última tecla (un temporizador propio, nunca por tecla); un selector, al cumplirse `PAUSA_DE_LOS_SELECTORES_MS` (cuando lanza su búsqueda); enviar (Enter) y «Quitar los filtros», al momento. Una pausa cancela la escritura pendiente de la otra. Un estado igual (`mismoEstado`) al que dice la dirección actual no se escribe.
- **`pushState` o `replaceState`** lo decide una función pura (`escrituraDelHistorial`): `replaceState` solo si la entrada actual la abrió **el mismo control** (campo —teclear y Enter—, Autor, Obra, Tema) y no está asentada; si no, `pushState`. «Quitar los filtros» es control propio. Tras una llegada, un `popstate` o un asentamiento, la entrada no tiene control: el cambio siguiente abre entrada. Cada entrada escrita lleva el estado en su objeto (`CLAVE_DEL_ESTADO_EN_LA_ENTRADA`, valores con los nombres de los parámetros), copiando las demás claves del objeto que hubiera.
- **Todo `pushState`/`replaceState` va en `try`.** Si lanza, la búsqueda, el asentamiento y la emisión siguen; la dirección queda como estaba; el control de la entrada no cambia (un `pushState` fallido no abre entrada), así que la escritura siguiente lo vuelve a intentar.
- **Asentar no abre entrada: marca la suya.** Si al asentar el estado que se ve no es el que dice la dirección (su escritura aún esperaba la pausa), primero se escribe ese estado con la regla de arriba y se cancela la escritura pendiente —el gesto termina la pausa, como Enter—; después la marca (`A.marcada`, `replaceState` sin dirección, como hoy) y la entrada queda sin control: un estado asentado no se reescribe nunca.
- **Llegada y `popstate` son la misma función** (`llegar`): la carga lee la dirección (`estadoDeLaDireccion(location.search)`); `popstate` lee el objeto de estado de la entrada (`estadoDeLaEntrada`) y, sin él, la dirección. Se cancelan las pausas pendientes, se resuelve, se pintan campo (y se relee su `value`), selectores, «Quitar los filtros» (visible con algún filtro), recuento y resultados, sin recargar, con el ritmo `ahora`. La llegada de la carga corre tras una microtarea: al evaluarse el guion no hay escritura del historial ni `__medir`. Un `popstate` a una entrada sin estado (`/buscar/` a secas) vacía campo, selectores, recuento y lista, como vaciar el campo sin filtros.
- **Ya registrado.** En la carga, como en la 23.8 (`A.yaRegistrada(history.state, tipo de Navigation Timing)`), con la clave del estado **resuelto** con sus filtros (`A.clave(texto, combinacionDeFiltros, valoresDeFiltros)`). En `popstate`, solo la marca del objeto de la entrada (Navigation Timing describe la carga del documento, no la entrada). La memoria de claves emitidas (`hechos`) sigue valiendo en toda la carga, también tras `pageshow` con `persisted`, que no toca la búsqueda (sigue siendo carga nueva solo para la salida, 23.7).
- **Con estado en la dirección** (algún parámetro no vacío de los cuatro) la carga pide Pagefind, `filters()` y el mapa al cargar (`cargar` y `pedirDatosDeObra`). Con `obra`, la resolución espera a mapa y `filters()`; sin `obra`, la búsqueda no los espera y el selector de Obra aparece cuando lleguen (Autor vigente, 27.3).
- **Resolución, orden fijo** (`resolverEstado`, pura): 1) se descarta, contando uno por cada uno, el `autor` que no es opción del selector de Autor, el `tema` que no es opción del de Tema y la `obra` que no es ofrecible (`autorDeLaObra(mapa, recuentos, nombre)`: el Autor en cuya lista del mapa está y que `opcionesDeObra` ofrece; nunca partiendo el nombre); 2) `obra` sin `autor` toma ese Autor; 3) `autor` y `obra` que no casan → se descarta `obra` (uno más). Nunca se cambia el Autor por el de la Obra ni se traduce una Obra absorbida. Si lo resuelto difiere de lo leído, `replaceState(entradaConEstado(history.state, estado), '', direccionDeLaBusqueda(estado))` en `try`, sin entrada nueva.
- **Frases fijas** (`avisoDeLaDireccion`, pura), en la región del recuento **delante** del recuento (o de la sugerencia a cero), con un espacio; la sombra lleva el mismo texto: 1 → «Uno de los filtros de esta dirección no se puede usar, y la búsqueda va sin él.»; 2 → «Dos de los filtros de esta dirección no se pueden usar, y la búsqueda va sin ellos.»; 3 → «Tres de los filtros de esta dirección no se pueden usar, y la búsqueda va sin ellos.». Sin texto ni filtro que se pueda usar: 1 → «El filtro de esta dirección ya no existe.», ≥ 2 → «Los filtros de esta dirección ya no existen.», sin recuento, sin salida, sin búsqueda (`visto` nulo); quedan campo y selectores. La búsqueda siguiente ya no lleva aviso.
- **Mapa o `filters()` que no llegan con `obra` en la dirección:** no se sabe si la Obra existe (27.7): ni búsqueda, ni frase, ni escritura de la dirección, ni `busqueda` asentable; campo y selectores de Autor y Tema que se puedan juzgar quedan pintados, lista vacía. El gesto siguiente busca con lo que se vea.
- Lo tecleado vuelve solo por `value`/`textContent` (campo, recuento, frases). `src/lib/ingreso.ts`, `MAX_BYTES_DE_GUION` y `MAX_BYTES_GUION_DE_PAGEFIND` no cambian; `MAX_BYTES_GUION_DE_LA_BUSQUEDA` (y el del filtro, si cambia el trozo compartido) se rederiva con la regla de la 27.2 (medido sobre `dist/` + ~400, con fecha en su docblock).

**Block If:**
- Hace falta subir `MAX_BYTES_DE_GUION` o `MAX_BYTES_GUION_DE_PAGEFIND`, tocar `src/lib/ingreso.ts`, o que alguna combinación de parámetros cree una ruta o una página indexable.
- Chromium de Playwright no restaura `/buscar/` de la caché de atrás y adelante con ninguna configuración (la prueba con caché se salta siempre): anotar el motivo de CDP y parar.

**Never:** leer o escribir `de`/`via` en la isla; asentar o emitir al apilar; reescribir una entrada asentada; partir el nombre de una ficha; ordenar en el cliente; «Mostrar 30 más» (27.5), frases a cero con filtros y destacados (27.6), `<noscript>`/aviso de índice que no carga (27.7), «Buscar en…» (27.8); `localStorage`/cookies; dependencias nuevas; editar artefactos de planificación.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Componer | Autor `jose-marti`, Tema `la-prudencia`, texto «  escuela » | `/buscar/?q=escuela&autor=jose-marti&tema=la-prudencia` | — |
| Teclear | «v», «vi», «vie» seguidas | nada hasta 700 ms tras «vie»; entonces `pushState` (`?q=vie`); seguir tecleando → `replaceState` | — |
| Selectores | Autor (pausa), luego Tema (pausa) | dos `pushState`; flechas sobre Autor → un `pushState` y `replaceState` mientras siga Autor | — |
| Enter tras teclear | entrada del campo sin asentar, Enter | `replaceState` si el estado cambió (o nada si es igual), luego la marca sin dirección; teclear después → `pushState` | — |
| Clic en resultado dentro de la pausa | estado visto ≠ dirección | primero se escribe el estado visto, después la marca; la escritura pendiente no vuelve a escribir | — |
| Igual a la dirección | estado == lo que dice `location` | ninguna escritura | — |
| Historial que lanza | `pushState`/`replaceState` lanzan una vez | búsqueda y emisión siguen; dirección igual; la escritura siguiente reintenta | sin rechazos sin manejar |
| `popstate` | atrás a `?autor=a` (objeto con estado) | repinta campo, selectores, recuento, resultados sin recargar; sin escribir; no emite por estado ya emitido ni marcado | — |
| Llegada | `?q=vida&autor=jose-marti` | pide Pagefind, `filters()` y mapa; selectores elegidos, «Quitar» visible, «N citas de José Martí con «vida».» | — |
| `obra` sin `autor` | `?obra=jose-marti--maestros-ambulantes` | tras mapa: Autor y Obra elegidos; `replaceState` a `?autor=jose-marti&obra=…` | — |
| `obra` de otro | `?autor=seneca&obra=jose-marti--…` | busca con Séneca; «Uno de los filtros… va sin él.» + recuento; `?autor=seneca` | — |
| Autor muerto + Obra viva | `?autor=x&obra=jose-marti--…` | Obra con su Autor; aviso «Uno…» | — |
| Dos o tres muertos con texto | `?q=vida&autor=x&tema=y` | «Dos de los filtros…» + «N resultados.»; `?q=vida` | — |
| Nada con que buscar | `?autor=x` / `?autor=x&tema=y` | «El filtro de esta dirección ya no existe.» / «Los filtros… ya no existen.»; sin recuento ni salida; dirección `/buscar/` | — |
| Datos que fallan | `?autor=a&obra=b`, mapa 404 | ni búsqueda, ni frase, ni escritura | sin rechazos |
| Registrada | recarga o atrás sin caché con la marca | repinta, no asienta otra `busqueda` ni `busqueda-sin-resultados` | — |
| Caché de atrás y adelante | resultado, atrás (`persisted`) | estado intacto; nada se reemite; otro resultado = salida nueva | — |
| Hostil | `?q=<img src=x onerror=…>&autor=a` | campo y recuento («… con «<img…>».») como texto | — |

</intent-contract>

## Code Map

- `src/components/Busqueda.astro` -- isla: docblock (reglas 27.2/27.3; la línea 140-141 «los filtros no se leen de la dirección (27.4)» cambia; 110-116 sobre la marca y «nada al evaluarse»); `iniciar` (365-); `elegidos` (423); `pedirDatosDeObra` (453); `quitarObra`/`componerObra` (490-512); `pintar` (514: gana el prefijo del aviso para región y sombra); `buscar` (581; clave `ultima`); `asentar` (640: escritura pendiente antes de la marca); escuchas de input/selectores/quitar/submit (651-721); llegada con `?q=` (734-744: se sustituye por `llegar`).
- `src/lib/busqueda.ts` -- puras existentes (`FiltrosElegidos`, `hayFiltros`, `filtrosDePagefind`, `combinacionDeFiltros`, `valoresDeFiltros`, `fraseDelRecuento`, `MapaDeObras`, `opcionesDeObra`); añadir aquí las nuevas. Apta para el cliente (grafo fijado en `busqueda-con-filtros.test.ts`).
- `src/lib/medicion.ts:300-420` -- `MARCA_DE_BUSQUEDA_ASENTADA`, `asentamientoDeBusqueda` (`clave`, `emisiones`, `yaRegistrada`, `marcada`): no cambia su lógica. Docblock del fichero (466-481) dice que la búsqueda solo escribe `replaceState` sin dirección: actualizar. La quita de `de`/`via` (675) ya conserva `history.state`.
- `src/lib/superficies.ts:440` -- `rutaDeLaBusqueda()`.
- `src/pages/buscar.astro` -- región `[data-estado]`, lista, salida; docblock de la cabecera si cambia lo que dice.
- `src/lib/umbrales.ts:551-587` -- `MAX_BYTES_GUION_DE_LA_BUSQUEDA` (11.434; mide 11.034) y su docblock; 546 del filtro; 598/610 las dos pausas.
- `tests/unit/ayuda/busqueda.ts` -- entorno simulado: hoy `location` fija (643-), `pushState` violación (492), `replaceState` con dirección violación (488). Pasar a historial con entradas: `location` que refleja las escrituras (misma origen y ruta `/buscar/`, otra ruta = violación; escribir `location` sigue siendo violación), `pushState`/`replaceState` con dirección admitidos y apuntados, opciones para que lancen (siempre o N veces), `atras()`/`adelante()` que cambian de entrada y despachan `popstate` con su objeto, y helpers `direcciones()`/`marcas()` (las llamadas de dos argumentos). La marca sin dirección sigue siendo de dos argumentos.
- `tests/unit/medicion.test.ts` -- describe «Historia 23.6 … en `dist/`» (2717-2861): `ESCRIBE_EL_ESTADO` admite `history.pushState(` y `history.replaceState(` en el fichero de entrada de la búsqueda (y nada más escribe dirección); describe «Historia 23.8» (3350-) e «Historia 27.2/27.3» con aserciones `historial()` que daban por hecho que no había escrituras de dirección: pasar a `marcas()` donde la intención es la marca; la fila «Sin Autor | `?q=x` | ni mapa ni `filters()`» de la 27.3 cambia a la regla de la 27.4.
- `tests/unit/busqueda-con-filtros.test.ts` -- puras (59-283) y «lo construido» (432-) con su fixture: sitio de `/buscar/`.
- `tests/e2e/busqueda.spec.ts` -- describes 27.2 (1064-) y 27.3 (1356-); el de 1385 empieza en `/buscar/?q=vida` y exige que no se pida el mapa: empieza ya en `/buscar/` y teclea. Helpers `conjunto()`, `elAutorConMasObras()`, `temaBajoUmbral` (`./ayuda/corpus.ts`), `espiarMedicion` (`./ayuda/espia.ts`).
- `tests/e2e/receptor.spec.ts` -- `conLaCacheDeVerdad` (1092-1140) y los 23.8 de historial (1480-1535, 1700-1800) que exigían «la dirección y el historial no cambian» al teclear y Enter: ajustar al contrato nuevo conservando su intención 23.8. Su sitio de prueba solo tiene a Séneca y ningún Tema publicado (`MIN_CITAS_POR_TEMA` = 15).
- `tests/servidor.mjs` -- `SERVIDOR_CACHE_CONTROL` (por omisión `no-store`, que deja fuera la caché de atrás y adelante), `DIST`, `PUERTO`.
- `tests/e2e/filtro-del-directorio.spec.ts:214` -- lo hostil en las frases del filtro de Directorios (26.6), ya cubierto.

## Tasks & Acceptance

**Execution:**
- `src/lib/busqueda.ts` -- añadir `EstadoDeLaBusqueda` (`texto`, `autor`, `obra`, `tema`; vacío = ausente), `PARAMETROS_DE_LA_BUSQUEDA`, `estadoDeLaDireccion(search)` (primera aparición de cada uno), `direccionDeLaBusqueda(estado)`, `mismoEstado`, `CLAVE_DEL_ESTADO_EN_LA_ENTRADA`, `estadoDeLaEntrada(state)` (valida forma; si no, `null`), `entradaConEstado(state, estado)` (copia sin mutar), `autorDeLaObra(mapa, recuentos, nombre)`, `resolverEstado(leido, { autores, temas, autorDeLaObra })` → `{ estado, noSeUsan }`, `avisoDeLaDireccion(noSeUsan, quedaAlgo)` y `escrituraDelHistorial({ igual, control, controlDeLaEntrada })` → `'ninguna' | 'pushState' | 'replaceState'` -- decisión pura (AD-5), probada sin DOM.
- `src/components/Busqueda.astro` -- `llegar` para carga y `popstate`; temporizador de escritura del campo; escritura al cumplirse la pausa de selectores, al enviar y al quitar; control de la entrada; escritura pendiente antes de la marca; aviso delante del recuento; selector de Obra elegido desde la dirección; docblock al día -- FR-7, NFR-4, UX-DR87, UX-DR93, AD-13.
- `src/lib/medicion.ts` -- solo el docblock del fichero: la búsqueda escribe también la dirección desde la 27.4 (después del fichero, que ya quitó `de`/`via` conservando `history.state`).
- `src/lib/umbrales.ts` -- rederivar `MAX_BYTES_GUION_DE_LA_BUSQUEDA` (y el del filtro si cambia el trozo) con cifras y fecha.
- `tests/unit/busqueda-con-filtros.test.ts` -- puras: cada fila de la matriz que no necesita DOM (componer, orden fijo, `obra` sin `autor`, recortado, `obra` sin `autor` no se compone, parámetros ajenos fuera, `de`/`via` nunca, lectura con duplicados y vacíos, ida y vuelta lectura↔composición, resolución con 0-3 descartes y los dos «ya no existe», nunca se cambia el Autor, Obra absorbida no se traduce, frases literales, decisión push/replace/ninguna, `entradaConEstado` conserva la marca). Construidas: `dist/` tiene un solo HTML bajo `buscar/` (`index.html`; `obras.json` el único otro fichero), ningún directorio de ruta bajo `/buscar/`, ninguna URL de `/buscar/` en el sitemap, `noindex` y canónica `/buscar/`.
- `tests/unit/ayuda/busqueda.ts` -- historial con entradas (ver Code Map).
- `tests/unit/medicion.test.ts` -- describe «Historia 27.4» con la matriz entera en el entorno simulado sobre el guion de `dist/` (incluido: nada al evaluarse con `?autor=muerto` y el `replaceState` tras la microtarea; retitulado: el mismo `?obra=` con otro título en el mapa nombra el nuevo en opción y recuento; Navigation Timing no se usa en `popstate`); ajustar 23.6, 23.8, 27.2 y 27.3 como dice el Code Map.
- `tests/e2e/busqueda.spec.ts` -- describe «Historia 27.4» sobre el sitio construido con el Corpus: dirección compuesta (slugs y nombre de ficha, nunca rótulos; `history.length` crece una vez por pausa, no por tecla); llegada con `?q=&autor=&tema=` y con `?autor=&obra=` que pide Pagefind, `filters()` y el mapa al cargar y pinta selectores elegidos, «Quitar los filtros» visible, campo y recuento de lo filtrado; «atrás» entre dos estados sin recargar (un marcador en `window` sobrevive) con campo, selectores, recuento y resultados; filtro que no se puede usar en singular, plural de dos y tres, y los dos «ya no existe» (Autor inventado, `temaBajoUmbral()`, ficha inventada), con la dirección reemplazada y `history.length` igual; `obra` sin `autor`; `obra` de otro Autor; `replaceState`/`pushState` que lanzan una vez (`addInitScript`); «teclear, Intro, seguir tecleando, atrás» vuelve a lo enviado; `?q=` hostil con un filtro (campo y recuento como texto, `window.__hostil` sin definir) y la llegada desde «Buscar «x» en las citas» de un Directorio. Ajustar la prueba de 1385.
- `tests/e2e/ayuda/cache.ts` (nuevo) y `tests/e2e/receptor.spec.ts` -- mudar `conLaCacheDeVerdad` a la ayuda, parametrizada (preparación de la página como argumento), y que `receptor.spec.ts` la importe; ajustar sus 23.8 de historial.
- `tests/e2e/busqueda-historial.spec.ts` (nuevo, solo `escritorio`) -- sirve el `dist/` ya construido con `tests/servidor.mjs` en el puerto 4403 y `SERVIDOR_CACHE_CONTROL=max-age=600` (comprobando antes que el puerto está libre y que contesta su `/buscar/`); espía de `__medir` acumulado por pestaña (`sessionStorage` en el `addInitScript`); «Autor, Tema, resultado, atrás, atrás» con la caché (`pageshow.persisted` comprobado, no supuesto) y sin ella (contexto de Playwright por omisión), y la recarga: una sola `busqueda` por estado asentado, ninguna al volver ni al recargar, el estado repintado en cada vuelta y la salida tras la caché contada aparte.
- `_bmad-output/implementation-artifacts/spec-27-4-…md` -- Auto Run Result con cifras y fechas.

**Acceptance Criteria:**
- Given el sitio construido, when se carga `/buscar/` sin parámetros y sin interactuar, then no se pide Pagefind, ni `filters()`, ni el mapa, ni se escribe el historial.
- Given la rama implementada, when corre `npx vitest run` uno a uno de `busqueda-con-filtros`, `medicion`, `filtros-de-busqueda`, `peso`, `andamiaje`, `ingreso-construido`, `publicable-y-alcanzable`, `filtro-del-directorio` y `espinas-de-ux`, then pasan.
- Given el sitio construido, when corren `tests/e2e/busqueda.spec.ts --project=escritorio`, `-g "27.4"` en `movil`, `tests/e2e/busqueda-historial.spec.ts`, `tests/e2e/receptor.spec.ts -g "busca"`, `tests/e2e/filtro-del-directorio.spec.ts` y `tests/e2e/accesibilidad.spec.ts -g "buscar"`, then pasan, y la prueba con caché no se ha saltado.
- Given la rama, when corren `npm run check` y `npm test` entero con `correr.sh`, then 0 errores y verde.
- Given el diff contra `baseline_revision`, when se listan los ficheros y se leen los dos topes, then ni `src/lib/ingreso.ts`, ni `MAX_BYTES_DE_GUION`/`MAX_BYTES_GUION_DE_PAGEFIND`, ni nada de `_bmad-output/planning-artifacts/` o `_bmad-output/specs/` cambia.

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
- patch: 14: (high 1, medium 2, low 11)
- defer: 1: (low 1)
- reject: 23: (medium 2, low 21)
- addressed_findings:
  - `[high]` `[patch]` Una entrada con objeto cuyo estado ya se había emitido en la carga quedaba sin marca al asentarse («Autor, Enter, Tema, Todos los temas, Enter, recargar» emitía otra `busqueda`; blind-hunter, edge-case-hunter, ac-auditor). `asentar` marca ahora toda entrada con objeto que diga lo que se ve y no la lleve; la entrada sin objeto solo al emitir (la cubre Navigation Timing), y nunca dos veces. Pruebas: simulada en `medicion.test.ts` y en el navegador en `busqueda-historial.spec.ts`; la de la 23.8 «repetir…» pasa de 2 a 3 marcas, la tercera es justo la entrada que faltaba.
  - `[medium]` `[patch]` Un `popstate` de salto de ancla («Saltar al contenido») se trataba como llegada: repintaba, reanunciaba y cancelaba lo tecleado. La isla recuerda la búsqueda de la dirección de su entrada y no llega si `popstate` no la cambia (deja la entrada sin control). Prueba simulada con `saltarAlAncla` nuevo en `tests/unit/ayuda/busqueda.ts`.
  - `[medium]` `[patch]` Ocultarse entre un `popstate` y su pintado asentaba en la entrada nueva lo de la entrada que se dejó (y con `pushState` truncaba el historial). `llegar` deja `visto`, `estadoVisto` y `controlDelVisto` en nulo hasta que la llegada pinte. Prueba simulada.
  - `[low]` `[patch]` Al asentar lo que pintó una llegada cuyo `replaceState` lanzó, se abría entrada con el control de respaldo `'campo'`. Ahora reemplaza su entrada (`reemplazar`). Prueba simulada.
  - `[low]` `[patch]` Si la escritura de lo que se ve lanzaba, la marca caía en una entrada que dice otra búsqueda. Ahora no se marca una entrada cuya dirección tiene otra búsqueda no vacía. Prueba simulada.
  - `[low]` `[patch]` `hechos` crecía con claves repetidas en cada `popstate` a una entrada registrada: se añade solo si no está.
  - `[low]` `[patch]` `resolverEstado` aceptaba una Obra cuyo Autor del mapa no es opción del selector de Autor (datos de otra construcción): ahora se descarta y se cuenta. Prueba pura.
  - `[low]` `[patch]` La prueba de lo construido no fijaba `autocomplete="off"` en los tres selectores: añadida en `busqueda-con-filtros.test.ts`.
  - `[low]` `[patch]` La prueba de `dist/` de la 27.4 no afirmaba que `/buscar/` queda fuera de Pagefind: afirma que no lleva `data-pagefind-body`.
  - `[low]` `[patch]` Faltaba la prueba de un gesto o de «atrás»/«adelante» mientras una llegada con Obra espera sus datos: dos pruebas simuladas con `mapaManual`.
  - `[low]` `[patch]` El docblock de la isla no decía que el respaldo de Navigation Timing ya solo cubre la entrada de llegada: dicho, con la regla de la marca, el salto de ancla y la llegada que deja sin asentar lo anterior.
  - `[low]` `[patch]` El docblock de `src/lib/medicion.ts` atribuía el orden a la microtarea: lo garantiza el orden del documento (`defer` antes que el módulo), que ya fija la prueba de la 23.6.
  - `[low]` `[patch]` `busqueda-historial.spec.ts` suponía un `dist/` sin comprobarlo y no esperaba a que el servidor saliera: error claro si no hay `dist/buscar/index.html`, y `afterAll` espera la salida.
  - `[low]` `[patch]` `busqueda-historial.spec.ts` componía la raíz con `URL.pathname` (codificado): `fileURLToPath`.
  - Nota: tras los parches, `MAX_BYTES_GUION_DE_LA_BUSQUEDA` se rederiva con la regla de la 27.2 (15.425 medidos, tope 15.825).
  - Rechazados (por qué, en breve): pedir mapa y `filters()` con cualquier estado y con filtros que no existen (el contrato lo pide así y la épica pide el mapa con todo estado usable); la regla «no asentada» fuera de la función pura; coste de `autorDeLaObra`; la prueba con caché que puede saltarse (no se saltó; el Block-If lo vigila); `fileURLToPath` en `busqueda.spec.ts` (preexistente); datos de prueba sacados del Corpus; el parámetro ajeno que sobrevive a la llegada (el contrato reemplaza solo si lo resuelto difiere); Enter tras cambiar un selector dentro de su pausa (conforme al contrato: Enter es el campo); el registro de revisión vacío y el crecimiento del tope (procedimiento); `estadoDeLaEntrada` estricta (decisión del contrato); llegada que nunca se resuelve si la red cuelga (27.7); `pushState` durante `pagehide` (especulativo, en `try`); y las lecturas de intent-alignment (asentar que escribe antes de marcar —Design Notes—, límite real del navegador, hostil, retitulado, filtros muertos y caché del alojamiento probados por representación, dist sin servidor) y del ac-auditor (retitulado de punta a punta, dos comportamientos solo simulados).

## Design Notes

**Por qué la escritura pendiente se adelanta al asentar.** La dirección de lo tecleado espera 700 ms y un clic en un resultado puede llegar antes. Marcar entonces la entrada vieja la daría por asentada con un estado que no se asentó, y «atrás» desde la Cita devolvería la búsqueda anterior a la pulsada. El gesto que asienta termina la pausa, como ya lo hace Enter (27.2): el estado entra en el historial por su regla de siempre y después se marca. Asentar sigue sin abrir entradas por sí mismo.

**Por qué `popstate` no usa Navigation Timing.** El tipo `back_forward` o `reload` describe la carga del documento, no la entrada a la que se vuelve. Sin caché, el documento rehecho se carga como `back_forward`. Si el respaldo valiera también en sus `popstate`, la entrada de llegada sin objeto contaría como asentada sin haberlo sido. Las entradas que escribe la isla llevan siempre objeto.

**Ejemplo de entradas** («teclear, Intro, seguir, atrás»):
```
/buscar/            (llegada, sin control)
?q=vie   push campo → ?q=viento  replace campo → Enter: igual, marca → sin control
?q=viento+fav  push campo        ← atrás vuelve a ?q=viento (marcada)
```

## Verification

**Commands:**
- `npx vitest run tests/unit/busqueda-con-filtros.test.ts` y el resto de la lista, uno por llamada (`medicion` con `correr.sh` si pasa de 8 min) -- verdes.
- `npm run check` -- 0 errores. `npm run build` -- sale con 0; anotar el tamaño del guion de la búsqueda.
- Playwright de la lista del AC, por fichero y proyecto, con `correr.sh`/`esperar.pl` si pasan de 8 min -- verdes; puertos 4321, 4400, 4403 y 8787 libres al terminar.
- `npm test` entero con `correr.sh` -- verde.

## Auto Run Result

Status: done

Planificada el 2026-10-29 sobre `de5230938c38d2a4a5e75626288ddd37a35d01b8` y detenida tras planificar. Implementada el 2026-10-29 en la rama `v8/epica-27` (bucle v8-ralph, implementación en línea). Sin condición de bloqueo.

**Qué se hizo.** `src/lib/busqueda.ts` gana la parte pura de la dirección: `EstadoDeLaBusqueda` (con identificadores), `PARAMETROS_DE_LA_BUSQUEDA` (`q`, `autor`, `obra`, `tema`, en ese orden), `ESTADO_VACIO`, `estadoDeLaDireccion` (primera aparición, vacío = ausente, nada más se lee), `direccionDeLaBusqueda` (solo los no vacíos, texto recortado, Obra solo con Autor, sobre la ruta que recibe), `estadoSinNada`, `mismoEstado` (texto recortado, filtros tal cual: una `obra` sin `autor` sí es distinta), `CLAVE_DEL_ESTADO_EN_LA_ENTRADA` (`busqueda`), `estadoDeLaEntrada` (valida forma), `entradaConEstado` (copia sin mutar, conserva la marca), `autorDeLaObra` (por la lista del mapa y `opcionesDeObra`, nunca partiendo el nombre), `resolverEstado` (orden fijo, cuenta descartes), `avisoDeLaDireccion` (las cinco frases) y `escrituraDelHistorial` (`ninguna`/`pushState`/`replaceState`, con controles `campo`, `selector-de-autor`, `selector-de-obra`, `selector-de-tema` y `quitar`: los selectores no se llaman `autor`/`tema` porque esas son combinaciones del vocabulario y el guion no escribe ninguna). La isla de `Busqueda.astro` escribe la dirección desde su estado: lo tecleado con un temporizador propio a `PAUSA_DE_TECLEO_MS` de la última tecla, cada selector al lanzar su búsqueda, Enter y «Quitar los filtros» al momento; una pausa cancela la escritura de la otra; todo `pushState`/`replaceState` en `try` y el control de la entrada solo cambia si la escritura entra. Asentar adelanta la escritura de lo que se ve cuando la dirección aún no lo dice (con el control que lanzó esa búsqueda), cancela la pendiente si era la suya, y marca. La carga (tras una microtarea) y `popstate` van por `llegar`: cancelan pausas, dejan la entrada sin control, piden índice, mapa y `filters()` si hay estado, resuelven (con Obra, esperando a los datos; si no llegan, `sinDatos`: ni búsqueda, ni frase, ni escritura), pintan controles, recuento y resultados con `ahora`, reemplazan la entrada si lo resuelto difiere de lo leído (lo ya registrado se mira antes, y en `popstate` solo por la marca), y ponen el aviso delante del recuento o, sin nada con que buscar, solo. Una entrada nueva empieza con su propio objeto (la marca de la anterior no pasa a ella); un reemplazo copia el objeto de la entrada. Los tres selectores llevan `autocomplete="off"`, como el campo: sin él, al volver atrás sin la caché Chrome restauraba su estado de formulario por posición después de pintar la llegada, y el valor del selector de Obra caía en el de Tema (lo encontró `busqueda-historial.spec.ts`).

**Cifras (2026-10-29, `npm run build` sobre el Corpus de la rama).** Guion de la búsqueda **15.087 bytes** (14.535 del fichero de entrada + 552 del trozo compartido, que no cambia) → `MAX_BYTES_GUION_DE_LA_BUSQUEDA` = 15.487 (antes 11.434). El filtro de los Directorios no cambia (3.515; su tope sigue en 3.915). `MAX_BYTES_DE_GUION`, `MAX_BYTES_GUION_DE_PAGEFIND` y `src/lib/ingreso.ts` no cambian. `dist/buscar/` tiene solo `index.html` y `obras.json`.

**Ficheros.**
- `src/lib/busqueda.ts` — la parte pura de la dirección y el historial (arriba); docblock al día.
- `src/components/Busqueda.astro` — `llegar`, `resolverYBuscar`, `sinDatos`, `ponerEstado`, `escribir`, el temporizador de la dirección, el control de la entrada, la escritura adelantada al asentar, el aviso en `pintar`, `popstate`, `autocomplete="off"` en los selectores y el docblock de la 27.4.
- `src/lib/medicion.ts` — solo el docblock del fichero: la búsqueda escribe también la dirección desde la 27.4.
- `src/lib/umbrales.ts` — `MAX_BYTES_GUION_DE_LA_BUSQUEDA` rederivado, con cifras y fecha.
- `src/pages/buscar.astro` — docblock: ninguna combinación de parámetros crea ruta.
- `tests/unit/ayuda/busqueda.ts` — historial con entradas: `location` refleja la entrada actual, `pushState`/`replaceState` con dirección admitidos (otra ruta u origen, violación; `pushState` sin dirección, violación), lanzar siempre o N veces, `atras()`/`adelante()` con `popstate`, `marcas()`, `direcciones()`, `direccion()`, `longitud()`, `consultasDeNavegacion()`; `action` del formulario.
- `tests/unit/medicion.test.ts` — describe «Historia 27.4» (24 pruebas, la matriz entera); 23.6 admite `history.pushState(` y `history.replaceState(` en la entrada de la búsqueda; 23.8 y 27.2 miran `marcas()` donde la intención es la marca; la fila `?q=` sin Autor de la 27.3 pide ahora mapa y `filters()`.
- `tests/unit/busqueda-con-filtros.test.ts` — 11 puras de la 27.4 y la construida: un solo HTML bajo `buscar/` (más `obras.json`), fuera del sitemap, `noindex`, canónica `/buscar/`, `action` del formulario.
- `tests/e2e/busqueda.spec.ts` — describe «Historia 27.4» (11 pruebas); la de la 27.3 que llegaba con `?q=vida` llega a `/buscar/` y teclea.
- `tests/e2e/ayuda/cache.ts` (nuevo) — `conLaCacheDeVerdad` parametrizada (preparar, al restaurar) y con la restauración contada por documento.
- `tests/e2e/receptor.spec.ts` — usa la ayuda; sus 23.8 de historial al contrato nuevo (la entrada de lo enviado lleva `?q=` y su estado, la vuelta repinta, atrás en el mismo documento).
- `tests/e2e/busqueda-historial.spec.ts` (nuevo, solo `escritorio`, en serie) — `dist/` servido en 4403 con `max-age=600`, espía de `__medir` y `sendBeacon` en `sessionStorage`, «Autor, Tema, resultado, atrás, atrás, adelante, recargar, otro resultado» con la caché comprobada y sin ella.

**Revisión.** Este pase no traía hallazgos externos (las capas externas corren después): 0 parches, 0 aplazados, 0 rechazados. `followup_review_recommended: false` (parches altos 0, medios 0, bajos 0; puntuación 0).

**Verificación.**
- `npm run check` — 0 errores, 0 avisos (398 ficheros).
- `npm run build` — sale con 0; filtros + mapa 96.920 bytes bajo el aviso de 120 KiB.
- `npx vitest run tests/unit/busqueda-con-filtros.test.ts` — 48 verdes; `npx vitest run tests/unit/medicion.test.ts -t "23.6|23.8|27.4|isla"` — 208 verdes.
- `npm test` entero con `correr.sh` — **150/150 ficheros, 6.912 pruebas verdes** (876 s), entre ellos `busqueda-con-filtros`, `medicion`, `filtros-de-busqueda`, `peso`, `andamiaje`, `ingreso-construido`, `publicable-y-alcanzable`, `filtro-del-directorio` y `espinas-de-ux`.
- Playwright sobre lo construido: `busqueda.spec.ts busqueda-historial.spec.ts filtro-del-directorio.spec.ts --project=escritorio` (86 verdes; 4 omitidas preexistentes —3.1 «el índice no contiene nada no publicado», las dos de 360 px solo para `movil` y el Autor sin Obras que el Corpus no tiene—; la de la caché en rojo por un `goBack` que esperaba `load` en una navegación del mismo documento restaurado; corregida con `waitUntil: 'commit'`), `busqueda-historial.spec.ts --project=escritorio` (2 verdes, **la de la caché no se saltó**: `pageshow.persisted` comprobado), `busqueda.spec.ts -g "27.4" --project=movil` (11 verdes), `receptor.spec.ts accesibilidad.spec.ts -g "busca" --project=escritorio` (19 verdes) y `receptor.spec.ts -g "23\.7|23\.8" --project=escritorio` (24 verdes: el filtro `busca` no casa con los títulos de la 23.8, que dicen «búsqueda»). Puertos 4321, 4399, 4400, 4403 y 8787 libres al terminar.

**Auditoría de la matriz.** Componer, lectura, ida y vuelta, frases y decisión push/replace: puras de `busqueda-con-filtros`. Teclear, selectores, Enter tras teclear, clic dentro de la pausa, igual a la dirección, historial que lanza, `popstate`, llegada, `obra` sin `autor`, `obra` de otro, Autor muerto + Obra viva, dos y tres muertos, nada con que buscar, datos que fallan (mapa y `filters()`), registrada, caché de atrás y adelante y hostil: «Historia 27.4» de `medicion.test.ts`; y en el navegador, `busqueda.spec.ts` (dirección, llegadas, atrás/adelante, frases, lanzar una vez, Intro y atrás, hostil, Directorio) y `busqueda-historial.spec.ts` (caché, sin caché, recarga). Todas corrieron y pasaron.

**Riesgos y notas.**
- A cero con aviso la región no se aparta de la vista (si no, nadie vería el aviso), y dice el aviso y la sugerencia; la sugerencia se ve también en la salida. La 27.6 rehace las frases a cero.
- Con el índice de verdad lo hostil no encuentra nada, así que el recuento con lo hostil dentro solo lo prueba el entorno simulado; en el navegador se prueba el campo y la región sin elementos.
- El guion de la búsqueda crece ~4 KB (11.034 → 15.087) y su tope se rederiva con la regla de la 27.2; no toca ningún tope de página.
- Escribir en la dirección al ocultarse la página (asentar por `visibilitychange`) adelanta la escritura pendiente de lo que se ve, como pide el contrato; cambiar de pestaña con una búsqueda tecleada deja su entrada escrita y marcada.

### Pase de revisión 1 (2026-10-29, hallazgos externos)

**Qué cambió.** La isla de `Busqueda.astro` marca ahora toda entrada con objeto que diga lo que se ve y no lleve la marca, también si ese estado ya se emitió en la carga (la entrada sin objeto, solo al emitir: la cubre Navigation Timing); no marca una entrada cuya dirección dice otra búsqueda cuando el historial lanzó; al asentar lo que pintó una llegada cuyo reemplazo lanzó, reemplaza su entrada (`reemplazar`) en vez de abrir otra; un `popstate` que no cambia la búsqueda de la dirección (un salto de ancla) no es llegada; `llegar` deja sin nada asentable lo de la entrada que se dejó hasta pintar; `hechos` no repite claves. `resolverEstado` descarta la Obra cuyo Autor del mapa no es opción del selector de Autor.

**Ficheros.**
- `src/components/Busqueda.astro` — `asentar` (regla de la marca, `reemplazar`), `busquedaDeLaEntrada` y la guarda de `popstate`, `llegar` sin estado visto, `hechos` sin repetidos, docblock.
- `src/lib/busqueda.ts` — `resolverEstado`: la Obra cuyo Autor no es opción se descarta.
- `src/lib/medicion.ts` — docblock: el orden lo da el documento, no la microtarea.
- `src/lib/umbrales.ts` — `MAX_BYTES_GUION_DE_LA_BUSQUEDA` = 15.825 (medido 15.425: 14.873 + 552, 2026-10-29).
- `tests/unit/ayuda/busqueda.ts` — `saltarAlAncla`.
- `tests/unit/medicion.test.ts` — siete pruebas nuevas en «Historia 27.4»; «repetir…» de la 23.8 espera 3 marcas.
- `tests/unit/busqueda-con-filtros.test.ts` — la Obra de un Autor que no es opción; `autocomplete="off"` en los tres selectores; sin `data-pagefind-body`.
- `tests/e2e/busqueda-historial.spec.ts` — prueba nueva en el navegador del estado repetido en otra entrada y la recarga; `fileURLToPath`, `dist/` comprobado, `afterAll` que espera.

**Hallazgos.** 14 parches (1 alto, 2 medios, 11 bajos), 1 aplazado (la sugerencia doble a cero con aviso, a la 27.6), 23 rechazados. `followup_review_recommended: true` (un parche alto; puntuación 3×2 + 11 = 17).

**Verificación.**
- `npx vitest run tests/unit/busqueda-con-filtros.test.ts` — 49 verdes.
- `npx vitest run tests/unit/medicion.test.ts -t "23\.6|23\.8|27\.2|27\.3|27\.4|isla"` — 216 verdes.
- `npm run check` — 0 errores, 0 avisos. `npm run build` — 0; guion de la búsqueda 15.425 bytes.
- Playwright (escritorio): `busqueda.spec.ts busqueda-historial.spec.ts filtro-del-directorio.spec.ts` 89 verdes, 4 omitidas preexistentes; `busqueda-historial.spec.ts` solo, 3 verdes con la de la caché **pasada, no saltada**; `busqueda.spec.ts -g "27.4" --project=movil` 11 verdes; `receptor.spec.ts accesibilidad.spec.ts -g "busca|buscar|23.7|23.8"` 38 verdes.
- `npm test` entero con `correr.sh` — 150/150 ficheros, 6.920 pruebas verdes (878 s).
- Puertos 4321, 4399, 4400, 4402, 4403 y 8787 libres al terminar.

**Riesgos.** La guarda del salto de ancla compara `location.search`: dos entradas seguidas con la misma búsqueda y objetos distintos no se repintan al pasar entre ellas (la isla no escribe dos iguales seguidas, así que solo las crea un ancla). El tope del guion se rederiva otra vez (+338 bytes sobre el de la implementación).

