---
title: 'Historia 23.8 — Una búsqueda cuenta una vez, cuando se asienta'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_revision: '42f082115b4d39f3a4f3384c2c9293b318758541'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-23-context.md'
warnings: [oversized]
deferred:
  - summary: 'Marcar en epics.md el criterio de emisión de la Historia 3.2 («se emite el evento de búsqueda sin resultados con el texto de la consulta») como «(sustituido en la v8 por la Historia 23.8)».'
    evidence: 'Lo pide el criterio «Given la Historia 3.2» de la 23.8 en _bmad-output/planning-artifacts/epics.md; AGENTS.md prohíbe editar a mano _bmad-output/planning-artifacts/.'
    owner: 'pendiente de Héctor (bmad-create-epics-and-stories)'
    severity: low
---

<intent-contract>

## Intent

**Problem:** el vocabulario (23.2) y el receptor desplegado (23.3) ya saben guardar `busqueda` con `tramo` y `filtros`, pero nadie la emite (`PENDIENTES` de la 23.8 en `tests/unit/vocabulario.test.ts`), y la isla de `/buscar/` emite `busqueda-sin-resultados` en cada repintado sin resultados —una por pausa del tecleo—: SM-6 y SM-13 no tienen denominador, y FR-8 registra fragmentos a medio escribir.

**Approach:** la isla de `/buscar/` **asienta** el estado que se ve —texto y filtros, con su total— al enviar el formulario, al pulsar un resultado o al ocultarse la página, y emite `busqueda` (con el tramo del total y `filtros` «ninguno») y, con texto y cero resultados, `busqueda-sin-resultados`, como mucho una vez por estado en la carga; da por registrado el estado con que llega si su entrada del historial lo marca o, sin objeto de estado, si la carga es `back_forward` o `reload`, y al asentar marca su entrada con un booleano por `replaceState`. La decisión es una parte pura de `src/lib/medicion.ts` que viaja a la isla por su texto; el fichero aprende a enviar `busqueda` y nunca la descarta.

## Boundaries & Constraints

**Always:**
- **Estado** = (texto, filtros) de los resultados que **se ven**: el de la última búsqueda que se pintó, con `total = respuesta.results.length` (el total, nunca los pintados). Se limpia al vaciar el campo. Su clave: texto recortado en los extremos (sin cambiar mayúsculas) y filtros. En la 23.8 `filtros` es siempre `filtrosUsados({ autor: false, obra: false, tema: false })` del vocabulario («ninguno»).
- **Disparadores**, los tres asientan el estado que se ve: `submit` del formulario —espera a que la búsqueda del texto enviado se pinte y asienta solo si ese sigue siendo el que se ve—; un `click` sobre un `a` dentro de `[data-resultados]`, escuchado **en la lista** (nunca en la ventana, sin `preventDefault` ni `stopPropagation`), que corre antes que la escucha de salida del fichero; y `visibilitychange` a `hidden`, con `pagehide` de respaldo. Ni `input`, ni el temporizador, ni el repintado, ni `focus`, ni llegar con `?q=` asientan.
- **Parte pura** en `src/lib/medicion.ts`, autocontenida (su texto, evaluado sin el ámbito del módulo, funciona) y con sus constantes compuestas desde el vocabulario —`TRAMOS`, la combinación «ninguno», `EVENTOS.busqueda`, `EVENTOS.busquedaSinResultados` y la clave de la marca—, nunca copiadas en la isla ni en `buscar.astro`. Decide: (a) **qué emitir** ante un estado: nada si no hay estado, si el total no es un entero ≥ 0 (la búsqueda no corrió), si no hay texto y filtros es «ninguno», o si su clave ya está registrada; si no, `[busqueda, tramo del total, filtros]` y, solo con texto y total 0, después `[busqueda-sin-resultados, texto tal como se buscó]`; un filtrado sin texto y sin resultados da solo `busqueda` en el tramo 0; (b) **si una llegada ya está registrada**: con objeto de estado (no nulo), si lleva la marca a `true`; sin él, si el tipo es `back_forward` o `reload` (cualquier otro, o ninguno, no); (c) **el objeto marcado**: copia del objeto de estado con la marca a `true` —sin mutarlo y conservando sus otras claves—, o uno nuevo con solo la marca si no era objeto.
- **Marca:** la clave `asentada`, una constante con nombre de `src/lib/medicion.ts`, con el valor `true` y nada más. Al emitir, la isla escribe con `history.replaceState(objetoMarcado, '')` —sin argumento de dirección, así que la dirección no cambia—, dentro de un `try` (un rechazo se acepta y la emisión ya salió). Nunca `pushState`, nunca escribe ni copia la dirección, nunca al analizarse.
- **Llegada:** al analizarse, la isla lee una vez `performance.getEntriesByType('navigation')[0].type` (sin la API o sin entrada: `navigate`) y `history.state`; si llega con `?q=` y la parte pura dice que está registrada, mete su clave en la memoria de la carga. La memoria es una lista en el cierre de la isla —ni almacenamiento, ni cookie—, sobrevive a la caché de atrás y adelante y no se vacía con `pageshow`.
- **Índice o búsqueda que fallan** (la importación, `init` o `search` rechazan): no se pinta, el estado que se ve no cambia, y no queda ninguna promesa rechazada sin manejar. Una respuesta de una búsqueda ya superada por otra no se pinta ni pasa a ser el estado que se ve.
- **Fichero:** `busqueda` entra en `EVENTOS_DEL_GUION`, con `tramo` del segundo argumento de `__medir` y `filtros` del tercero (`FUENTE_EN_EL_GUION`: `tramo: 1`, `filtros: 2`), cotejados con su conjunto como todo campo; no entra en `EVENTOS_SOLO_DEL_FICHERO` ni en `METRICA_DE_ACCION`, y el fichero emite cada `busqueda` que recibe. Se mide con el punto final de producción y se anota en el comentario de `MAX_BYTES_GUION_DE_MEDICION`; si no cabe, se sube a lo medido más unos 400 bytes, con la medida y el porqué (precedente 23.5–23.7).
- El anuncio y la salida de la búsqueda vacía siguen en el repintado, como hoy: solo se mueve la medición.

**Block If:**
- Cumplir algo exige cambiar `src/lib/vocabulario.ts` o `medicion/` (movería la huella y pediría otro `desplegar`), tocar `ARRANQUE_DE_MEDICION` o subir `MAX_BYTES_DE_GUION` (si `/buscar/` no cabe en línea).

**Never:**
- Escribir `?q=` en la dirección, abrir entradas, repintar en `popstate`, filtros, «Mostrar 30 más» o el aviso del índice que no carga (Épica 27); una zona o exención nueva.
- Que el texto viaje en `busqueda`, que viaje el número del total, o que el fichero lea `history.state` o descarte una `busqueda`.
- Guardar en la marca algo que no sea el booleano, o cualquier identificador (NFR-11).
- Editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/` (la marca de la 3.2 queda en `deferred`); tocar `sprint-status.yaml`; correr `npm run medicion -- desplegar|comprobar`, `wrangler … --remote`, push o fusión.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tecleo | `input`, temporizador, repintados, borrar | ningún `__medir`, ninguna escritura del historial | — |
| Enviar con resultados | «viento», 3 resultados, Enter | `__medir('busqueda','1-9','ninguno')`; baliza `{evento, ruta:'/buscar/', tramo, filtros}` exactas; `replaceState({asentada:true},'')` | `replaceState` lanza → se emite igual, nada sale de la escucha |
| Sin resultados | texto, total 0, Enter | `busqueda` tramo `0` y después `busqueda-sin-resultados` con el texto, una vez | — |
| Repetir | Enter otra vez; A, B, A; «viento » | nada más por un estado ya emitido | — |
| Sin texto | Enter con el campo vacío o con espacios | nada | — |
| Pulsar un resultado | clic (también con modificador o por teclado) | `busqueda` del estado que se ve, antes de la `salida-interna` | — |
| Ocultarse | `visibilitychange` `hidden` o `pagehide` | `busqueda` del estado que se ve —no del texto cuya búsqueda aún no se pintó—; nada si no hay | — |
| Total ≠ pintados | `results` de 12 cuyo `slice` da 3 | tramo `10-29` | — |
| Índice sin cargar | importación o `init` rechazan; `search` lanza | ni `busqueda` ni `busqueda-sin-resultados` al enviar ni al ocultarse | sin rechazo sin manejar |
| Llegada `?q=` | `navigate`, estado `null` | busca al cargar, no emite hasta asentarse | — |
| Llegada registrada | marca a `true` (cualquier tipo); o `null` con `back_forward`/`reload` | asentar ese estado no emite; otro estado sí | — |
| Llegada no registrada | `null` con `navigate`/`prerender`/sin API; objeto sin marca con `reload` | asentar emite | — |
| Caché atrás/adelante | `pageshow` con `persisted`, ocultarse o pulsar otro resultado | nada repetido | — |
| Respuesta vieja | la búsqueda de A responde después de la de B | A no se pinta ni se asienta | — |
| Filtrado sin texto (pura) | texto `''`, filtros `autor`, total 0 | solo `[busqueda,'0','autor']` | — |
| Al analizarse | la isla se evalúa | ni `__medir` ni escritura del historial | — |

</intent-contract>

## Code Map

- `src/pages/buscar.astro:68-181` -- la isla: `guionQueAnuncia({ EVENTO_SIN_RESULTADOS, ETIQUETA, TIPO_POR_OMISION }, …)`; `pintar` emite hoy `__medir(EVENTO_SIN_RESULTADOS, consulta)` en el repintado vacío (se va); `buscar` deduplica por `ultimaConsulta` sin guardar la promesa ni descartar respuestas viejas; `submit` con `preventDefault`; `inicial` de `?q=`. Docblock 1-39 (AD-13) al día. `ul[data-resultados]` lleva `data-zona="resultado"` (23.7).
- `src/lib/anuncio.ts:50-68` -- `guionQueAnuncia(constantes, cuerpo)`: constantes por JSON (una función lanza); `String(anunciar)` es el precedente de una función de `src/lib/` que viaja por su texto. No hay `keepNames` en Astro ni en Vitest: el texto es el que transpila esbuild.
- `src/lib/medicion.ts:62-82` (`EVENTOS_DEL_GUION` y su docblock, que anuncia la 23.8), `97-120` (`FUENTE_EN_EL_GUION`: 1 = segundo argumento, 2 = tercero), `127-138` (`CAMPOS_DEL_GUION`, `camposQueEmite`), `262-385` (docblock de `guionDeMedicion`: 311-312 «la única que escribirá además en el historial es ella… (23.8)», 355-364 lo que viaja), `386-505` (`e(v,t,z)` → `b`, `m=[D&&o,t,z,y,D&&w,j]`; la tabla sale de `CAMPOS_DE_EVENTO`, así que `busqueda` entra sola al añadirla a la lista).
- `src/lib/vocabulario.ts:67-77,124-174,267-271` -- solo lectura: `EVENTOS.busqueda`, `TRAMOS`, `tramoDe`, `FILTROS`, `filtrosUsados`, campos de `busqueda` y de `busqueda-sin-resultados`. No se toca (huella).
- `src/lib/umbrales.ts:198-245` -- `MAX_BYTES_GUION_DE_MEDICION = 3730`, hoy 3.339 bytes medidos (391 libres; `busqueda` añade ~160). `MAX_BYTES_DE_GUION = 6656`: `/buscar/` lleva hoy 3.535 bytes en línea (65 del arranque, 3.470 de la isla).
- `tests/unit/vocabulario.test.ts:232-241` (`PENDIENTES`, entrada 23.8), `263-300` (`PRODUCIR_DEL_FICHERO`, `Entrada`, `producir`: `emitir(evento, datos, destino)`), `318-411` (`escenariosDe`; las zonas solo en los eventos que las declaran, mismo patrón para `tramo`/`filtros`), `426-441` («nueve eventos de hoy»).
- `tests/unit/medicion.test.ts:127-172` (vocabulario cerrado; `EVENTOS_DEL_GUION.length < EVENTOS_VALIDOS.length` sigue cierto por `vista-de-obra`), `1235-1284` (ninguna isla escucha `click` en la ventana ni para la propagación), `1692-1800` (`CORPUS_MEDIDO`, `sitioMedido` —con Pagefind—, `leerMedida`, `paginasDe`), `1971-2000` (`/buscar/` en `MAX_BYTES_DE_GUION`), `2070-2105` (`isla(guiones, "'[data-consulta]'")`, `__medir(` sin guarda, `anunciar` sobre `estado`), `2190-2330` (23.6: `ESCRIBE_DIRECCION`, `esDeLaBusqueda`; las pruebas «el fichero corre antes que todo guion que escriba» y «ningún guion en línea escribe… —tampoco la búsqueda, todavía—» se ponen en rojo a propósito con esta historia).
- `tests/unit/ayuda/medicion.ts` -- el entorno simulado del fichero (`node:vm`, reloj, historial, `pulsar`): precedente de forma para el de la isla. `tests/unit/ayuda/guion.ts` -- `guionesEnLinea`, `bytesDeGuionEnLinea`.
- `tests/e2e/receptor.spec.ts:72,251-297` (7.3: «la búsqueda sin resultados emite la consulta» —hoy por tecleo—), `1019-1036` (23.6: `/buscar/?q=…&de=instagram` espera `busqueda-sin-resultados` al llegar), `1046-1375` (23.7: `RESULTADOS`, `CON_RESULTADOS = 'viento'`, `quedarseEn`, `conLaCacheDeVerdad` —en el ámbito del `describe`—; dos pruebas de `/buscar/` esperan solo `[salida-interna]`), `apuntarBalizas`/`balizasDe`/`llegadas`. El sitio: tres Citas de Séneca, Tema `el-tiempo`, Pagefind real, `max-age=600`.
- `tests/e2e/busqueda.spec.ts:279-301` -- 3.2: el espía espera `busqueda-sin-resultados` tras `fill`, sin enviar.
- `DESPLIEGUE.md:480-655` -- §3: párrafos de Lectura, Marcas y Salida; consultas de SM-13 (numerador, «el denominador llega con la 23.8») y de FR-8.
- `AGENTS.md:37` -- la convención de la medición («la única que escribe además en el historial es la de la búsqueda (desde la 23.8)… hoy no le admite ninguna escritura»).

## Tasks & Acceptance

**Execution:**
- `src/lib/medicion.ts` -- la clave de la marca, las constantes del asentamiento compuestas desde el vocabulario y la parte pura (Always), con docblocks; `busqueda` en `EVENTOS_DEL_GUION`; `tramo: 1` y `filtros: 2` en `FUENTE_EN_EL_GUION`; docblocks de la lista, de las fuentes y de `guionDeMedicion` al día (la búsqueda escribe en el historial desde sus escuchas; qué viaja con `busqueda`) -- FR-56, AD-13.
- `src/lib/umbrales.ts` -- medir el fichero y anotarlo en el comentario de `MAX_BYTES_GUION_DE_MEDICION` (subirlo solo si no cabe) -- tope visible en el diff.
- `src/pages/buscar.astro` -- la isla según Always: constantes del asentamiento por `guionQueAnuncia`, la parte pura por su texto, el estado que se ve, la memoria, la llegada, los tres disparadores, la marca, la promesa por consulta, el descarte de respuestas viejas y los fallos manejados; fuera `EVENTO_SIN_RESULTADOS` del repintado; docblock al día -- la isla de la historia.
- `tests/unit/ayuda/busqueda.ts` -- entorno simulado de la isla: ejecuta en `node:vm` el guion en línea de `/buscar/` del `dist/` medido, con su único `import(` sustituido por un doble (sustitución comprobada) que da un Pagefind de mentira —resultados con total y `slice` configurables, respuestas que se resuelven en el orden que pida la prueba, o rechazo en la importación, `init` o `search`—; elementos de mentira para campo, lista, estado, salida, sugerencia y formulario (lo que la isla pide; un selector desconocido lanza); reloj (`setTimeout`, `requestAnimationFrame`); `location`; `history` con `state` inicial, `replaceState` que apunta (y puede lanzar) y `pushState` que falla la prueba; `performance.getEntriesByType` configurable o ausente; visibilidad, `pagehide` y `pageshow`; `__medir` espía; y `teclear`, `enviar`, `pulsarResultado(modificadores)`, `ocultar`, `restaurar`, `emitidos()`, `historial()` y `analizado()` (lo hecho al evaluarse) -- el «ejecutándola» que pide la prueba de la 23.6.
- `tests/unit/medicion.test.ts` -- `describe('Historia 23.8 — …')`: la parte pura llamada directa y por su texto evaluado en un contexto vacío (mismos resultados), con cada fila de la matriz que le toca (tramos en 0, 1, 9, 10, 29, 30 y 45; total no entero o negativo; claves con espacios y con mayúsculas; filtrado sin texto; las tres ramas de la llegada; el objeto marcado sin mutar); la isla en el entorno simulado, una prueba por fila de la matriz; la isla del `dist/` lleva las constantes con el JSON de `TRAMOS` y `buscar.astro` no escribe ningún rótulo de tramo ni `ninguno`; y las dos pruebas de la 23.6 pasan a admitir a la búsqueda solo `history.replaceState` (ni `pushState` ni escribir `location`), con el «nunca al analizarse» probado en el entorno simulado -- Vitest, que corre el CI.
- `tests/unit/vocabulario.test.ts` -- fuera la entrada 23.8 de `PENDIENTES`; escenarios de `tramo` (cada rótulo) y de `filtros` (cada combinación), solo en los eventos que los declaran, con una prueba que lo exige; «diez eventos de hoy»; dos `busqueda` iguales dan dos balizas (el fichero no descarta) -- correspondencia de la 23.2.
- `tests/e2e/receptor.spec.ts` -- `describe('Historia 23.8 — …')` contra el Pagefind real (subiendo a nivel de fichero `quedarseEn` y `conLaCacheDeVerdad` si hace falta): teclear sin enviar no emite; Enter da `busqueda` con sus claves exactas; repetir y A, B, A no repiten; sin resultados, `busqueda` `0` y `busqueda-sin-resultados`; pulsar un resultado da `[busqueda, salida-interna]`; ocultarse yéndose a otra página llega por el receptor; con `pagefind.js` abortado no llega nada; «texto, resultado, atrás, atrás» con la caché (restaurada) y sin ella: una sola `busqueda`; `/buscar/?q=viento`, resultado y atrás sin caché: `history.state` marcado, el tipo `back_forward` y ninguna `busqueda` más; y la recarga tras asentar: ninguna más. Ajustar la 7.3 (enviar), la 23.6 (`/buscar/?q=…&de=instagram`: se asienta enviando y ningún evento lleva marca) y las dos de `/buscar/` de la 23.7 (`busqueda` delante; tras la caché, solo la salida) -- Playwright local.
- `tests/e2e/busqueda.spec.ts` -- 3.2: tras `fill`, nada; tras Enter, `busqueda` (`0`, `ninguno`) y `busqueda-sin-resultados` con la consulta.
- `DESPLIEGUE.md` -- §3: párrafo de la búsqueda asentada (disparadores, una por estado y carga, tramo del total, ningún texto salvo FR-8, el índice que no carga, la marca y su respaldo, sin firma ni lectura: SM-6 y SM-13 se leen sabiéndolo); corte de serie de FR-8 en la llegada de la 23; consultas de SM-6 (tramo 0 entre asentadas) y de SM-13 (salidas `resultado` entre asentadas), por jornada desde la primera completa y sin la de hoy, y el comentario de la de FR-8 al día.
- `AGENTS.md` -- la convención: `busqueda` y `busqueda-sin-resultados` las emite solo la isla al asentar, la decisión en la parte pura de `medicion.ts`, el fichero no descarta, y la isla escribe en el historial solo `replaceState` con la marca, desde sus escuchas.

**Acceptance Criteria:**
- Given la rama terminada, when corren `npx astro check` y por fichero `medicion`, `vocabulario`, `huella`, `receptor`, `redes`, `superficies`, `espinas-de-ux`, `ingreso-construido` y `medicion-orden`, then 0 errores y todo en verde, con `git diff 42f082115b4d39f3a4f3384c2c9293b318758541..HEAD -- src/lib/vocabulario.ts medicion/` vacío.
- Given `npm test` en segundo plano, when termina, then todo en verde.
- Given `npx playwright test tests/e2e/receptor.spec.ts --project=escritorio`, when corre, then pasa (las de la caché, saltadas solo si no restaura, diciendo por qué); y `busqueda`, `pagina-404`, `origen` y `receptor-local` siguen en verde con el `webServer`.
- Given el fichero con el punto final de producción y `/buscar/` construida, when se miden, then caben en `MAX_BYTES_GUION_DE_MEDICION` y en `MAX_BYTES_DE_GUION`, y el comentario del primero dice la medida.

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

Las cinco capas de revisión son externas en este bucle (v8-ralph) y la invocación no traía ninguna sección «Hallazgos externos»: esta pasada no tiene hallazgos que clasificar. La revisión independiente llega después.

### 2026-10-25 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 17: (high 0, medium 4, low 13)
- defer: 0
- reject: 15: (high 0, medium 0, low 15)
- addressed_findings:
  - `[medium]` `[patch]` SM-13 se llamaba «cota inferior» en `DESPLIEGUE.md` §3 y en el comentario de su consulta, y puede pasar de 1: tras la caché de atrás y adelante (carga nueva para la salida, no para la búsqueda) o al volver a una entrada marcada, una salida cuenta sin `busqueda` nueva (blind-hunter, edge-case-hunter, intent-alignment §7). Reescrito: no es una proporción, se desvía en los dos sentidos y se compara consigo misma en el tiempo.
  - `[medium]` `[patch]` El botón central abre el resultado en otra pestaña con `auxclick`, sin `click`, y no asentaba al pulsarlo, contra «al pulsar un resultado» y contra lo que decía `DESPLIEGUE.md` (blind-hunter, ac-auditor). La lista escucha también `auxclick` con el mismo manejador; docblock de `buscar.astro` y §3 al día (el menú contextual puede no asentar hasta ocultarse); prueba en el entorno simulado (botones 1 y 2, escuchas `['click', 'auxclick']`) y en Playwright (botón central: `busqueda` y ninguna salida).
  - `[medium]` `[patch]` El `try` de la búsqueda envolvía también `pintar`: un error al pintar se tragaba en silencio —sin `pageerror` ni rechazo— y dejaba asentar el estado anterior sobre una lista ya cambiada (blind-hunter, edge-case-hunter). El `try` cubre solo las llamadas al índice (importación, `init`, `search`, `data`); `visto` se fija antes de `pintar`.
  - `[medium]` `[patch]` Nada probaba que el índice se recupere tras un fallo de importación o de `init` (verification-gap: `.catch(() => null)` sobrevivía a toda la suite). Dos pruebas nuevas en el entorno simulado: fallo pasajero y otro texto (vuelve a importar, pinta y asienta) y Enter con el mismo texto tras el fallo (importación, `init` y `search`).
  - `[low]` `[patch]` Tras un fallo, Enter con el mismo texto no volvía a buscar (`consulta === ultima`) (blind-hunter, edge-case-hunter). El fallo de la búsqueda vigente pone `ultima = null`.
  - `[low]` `[patch]` El corte de serie de FR-8 decía que el registro nuevo no trae fragmentos; los trae, menos, si la página se oculta a mitad de escribir (blind-hunter). Párrafo corregido.
  - `[low]` `[patch]` La lista de laxitudes solo nombraba la recarga de una búsqueda nunca asentada; volver con `back_forward` sin objeto de estado da lo mismo (blind-hunter). «Volver o recargar».
  - `[low]` `[patch]` La equivalencia del tramo con `tramoDe` solo miraba siete totales y daba por supuesto el orden de `TRAMOS` (blind-hunter). Prueba de 0 a 200 y totales grandes, y de que `TRAMOS` sube y empieza en 0.
  - `[low]` `[patch]` El entorno simulado no tenía por violación un `replaceState` con dirección, en el que descansa la exención de la 23.6 (blind-hunter). Ahora sí, en `history.replaceState` mismo.
  - `[low]` `[patch]` Nada vigilaba que solo la isla de `/buscar/` pida la `busqueda`, y la consulta de SM-6 no filtraba la ruta (blind-hunter). Prueba sobre todo el `dist/` medido y `ruta='/buscar/'` en la consulta.
  - `[low]` `[patch]` Fugas de escuchas de `unhandledRejection` en el entorno simulado: un `expect` que falla en el `afterEach` dejaba entornos abiertos, y un `runInContext` que lanza no los cerraba (edge-case-hunter). Se cierran todos antes de afirmar, y el entorno deja de escuchar si la evaluación lanza.
  - `[low]` `[patch]` Un `?q=` con salto de línea daba una clave de llegada distinta del texto que Enter busca, porque el campo de búsqueda los quita (edge-case-hunter). La isla lee la consulta del campo después de escribirla; el campo simulado sanea como el del navegador, con su prueba.
  - `[low]` `[patch]` Ninguna prueba cubría una llegada registrada a un estado sin resultados (ac-auditor). Prueba con `?q=zzz` marcada, `back_forward` y `reload`: ni otra `busqueda` en el tramo 0 ni otra `busqueda-sin-resultados`.
  - `[low]` `[patch]` La llegada desde el campo del 404 no se ejercía (ac-auditor, intent-alignment §8). Prueba de Playwright: enviar el formulario del 404 lleva a `/buscar/?q=…`, busca, no asienta, y Enter asienta una vez.
  - `[low]` `[patch]` Huecos de navegador de verdad (blind-hunter, intent-alignment §9): se añaden en Playwright la activación por teclado (`[busqueda, salida-interna]`) y el botón central; cambiar de pestaña y cerrarla no se reproducen en Chromium sin cabeza y siguen en el entorno simulado.
  - `[low]` `[patch]` «Texto, resultado, atrás, atrás —sin la caché—» daba a entender que probaba la lectura de la marca, y no llega a ningún estado (blind-hunter, intent-alignment §2, ac-auditor). Comentario de lo que prueba y de dónde se prueba la lectura (las dos con `?q=`), y aserción de que el campo vuelve vacío (`autocomplete="off"`, sin restauración del formulario).
  - `[low]` `[patch]` Una línea de §3 pasaba del ancho (blind-hunter). Párrafo reajustado; la línea larga de `AGENTS.md` es el formato del bloque de convenciones entero y no se parte aquí.
- rejected (sin acción): el texto de FR-8 sin recortar (el receptor ya lo recorta, `medicion/receptor.ts:161`); el presupuesto en línea de `/buscar/` (cabe, y el riesgo ya estaba escrito); la incoherencia del cierre (la resuelve esta pasada; `sprint-status.yaml` es del orquestador y la 3.2 ya está en `deferred`); los tipos sueltos de la parte pura (sus constantes salen del vocabulario); el espacio de nombres de `asentada` (la clave la fija la spec y tiene un solo dueño); las esperas fijas, `buscarEn` y la pausa del tecleo del entorno (cada prueba lleva su control positivo y un cambio de la pausa falla en rojo); la escucha global de rechazos compartida (los dos entornos tienen que salir limpios); la llegada por `popstate` (en la 23.8 ninguna lleva a un estado: repintar en `popstate` es de la 27); la marca por entrada, los cortes en la isla entregada, el total frente a lo pintado solo en el entorno simulado, el índice que falla con un estado anterior solo en Vitest, la exención de la prueba estática, el reparto CI/local y la correspondencia que admite más combinaciones (decisiones de la spec o del criterio).

## Design Notes

**`popstate` en la 23.8.** La isla no escribe entradas ni repinta al volver por el historial (es de la 27), así que el único `popstate` posible en `/buscar/` es el de un ancla, que no cambia el estado: no hay llegada que juzgar. La parte pura de la llegada ya recibe (objeto de estado, tipo de la carga) y la 27 la llamará desde su `popstate`.

**Lo que se acepta.** Sin `?q=` en la dirección, una entrada se marca con el estado que se asentó en ella aunque su dirección diga otro (llegar con `?q=A`, escribir B y asentarlo); al volver, A cuenta como registrado. Es la misma laxitud que el respaldo de la espina («da por ya registrado el estado con que llega») y la de la recarga. Asentar al ocultarse por navegación puede no dejar la marca (el documento ya se va): entonces responde el tipo de navegación.

**Total frente a pintados.** Con los cortes de hoy y 30 pintados, el tramo de los pintados y el del total coinciden siempre; solo el entorno simulado (un `slice` que da menos) prueba que viaja el del total, que es lo que la 27 necesita.

Orientativo (nombres y forma los fija el código):

```js
// Cuerpo de la isla, compuesto en `buscar.astro` con `${String(asentamientoDeBusqueda)}`:
const A = (function asentamientoDeBusqueda(c) { /* … */ })(ASENTAMIENTO), hechos = [];
if (inicial && A.yaRegistrada(history.state, tipo)) hechos.push(A.clave(inicial, NINGUNO));
function asentar(v) { const r = A.emisiones(v, hechos); if (!r) return;
  hechos.push(r.clave); r.emisiones.forEach((x) => __medir(...x));
  try { history.replaceState(A.marcada(history.state), ''); } catch (e) {} }
```

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run tests/unit/medicion.test.ts` y `npx vitest run tests/unit/vocabulario.test.ts`, y por fichero los del primer criterio -- expected: verde.
- `npm test` con `correr.sh` -- expected: verde.
- `npx playwright test tests/e2e/receptor.spec.ts --project=escritorio` y, con el `webServer`, `busqueda`, `pagina-404`, `origen` y `receptor-local` en `escritorio` -- expected: verde; puertos 4321, 4399, 4400, 4402 y 8787 libres al terminar.
- `npx tsx -e` que mida en bytes UTF-8 `guionDeMedicion('https://medicion-sabiduria-de-bolsillo.sabiduriadebolsillo.workers.dev')` -- expected: ≤ el tope.

**Manual checks (if no CLI):**
- `ARRANQUE_DE_MEDICION`, `MAX_BYTES_DE_GUION`, `src/lib/vocabulario.ts` y `medicion/` sin cambios; ningún fichero de `corpus/` tocado.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Qué se hizo.** La isla de `/buscar/` deja de emitir `busqueda-sin-resultados` en cada repintado y emite, al **asentarse** el estado que se ve —enviar el formulario (espera a que se pinte lo enviado y asienta solo si sigue siendo lo que se ve), pulsar un enlace de la lista de resultados (`click`, también con modificador o con el teclado, y `auxclick`, el botón central que abre otra pestaña sin dar `click`; escucha en la lista, sin `preventDefault` ni parar la propagación) u ocultarse (`visibilitychange` a `hidden`, `pagehide` de respaldo)—, la `busqueda` con el tramo del total (`respuesta.results.length`) y `filtros` «ninguno», y, con texto y total 0, detrás, la `busqueda-sin-resultados` con el texto tal como se buscó; como mucho una por estado (texto recortado + filtros) en la carga, con la memoria en el cierre de la isla. Al emitir marca su entrada con `history.replaceState({asentada: true}, '')` dentro de un `try`; al analizarse lee una vez Navigation Timing y `history.state` y, si llega con `?q=` ya registrada (marca a `true`, o sin objeto de estado `back_forward`/`reload`), mete en la memoria la clave del texto que queda en el campo. La decisión es `asentamientoDeBusqueda` (`clave`, `emisiones`, `yaRegistrada`, `marcada`), parte pura de `src/lib/medicion.ts` que viaja por su texto con `ASENTAMIENTO_DE_BUSQUEDA` (eventos, `TRAMOS`, la combinación sin filtros y `MARCA_DE_BUSQUEDA_ASENTADA`, todo compuesto del vocabulario). Promesa por consulta, turno que descarta respuestas superadas, y un `try` que cubre solo las llamadas al índice: un índice que falla no pinta ni asienta, no deja rechazos sueltos y la búsqueda siguiente —también Enter con el mismo texto— vuelve a pedirlo; un fallo al pintar se ve. El fichero emite cada `busqueda` (`tramo: 1`, `filtros: 2` en `FUENTE_EN_EL_GUION`).

**Ficheros.**
- `src/lib/medicion.ts` — `busqueda` en `EVENTOS_DEL_GUION`; `tramo`/`filtros` en `FUENTE_EN_EL_GUION`; `MARCA_DE_BUSQUEDA_ASENTADA`, `EstadoDeBusqueda`, `ConstantesDelAsentamiento`, `ASENTAMIENTO_DE_BUSQUEDA` y `asentamientoDeBusqueda`; docblocks al día.
- `src/lib/umbrales.ts` — medida del fichero en el comentario de `MAX_BYTES_GUION_DE_MEDICION` (3.487 bytes, tope 3.730 sin mover) y de `/buscar/` en el de `MAX_BYTES_DE_GUION` (6.222 de 6.656, sin mover).
- `src/pages/buscar.astro` — la isla nueva (sin `EVENTO_SIN_RESULTADOS` en el repintado; `auxclick`; `try` estrecho y reintento; la consulta de la dirección leída del campo) y su docblock.
- `tests/unit/ayuda/busqueda.ts` — entorno simulado de la isla de `dist/` en `node:vm`: Pagefind de mentira en lugar del único `import(`, campo de búsqueda que quita saltos de línea, `replaceState` con dirección y `pushState` como violaciones, `auxclick`, Navigation Timing configurable, visibilidad, rechazos sin manejar sin fugas de escuchas.
- `tests/unit/medicion.test.ts` — `describe` de la 23.8: la parte pura (directa y por su texto; tramo igual a `tramoDe` de 0 a 200 y en totales grandes); la isla, una prueba por fila de la matriz más las de la revisión (botón central, recuperación del índice, reintento con el mismo texto, llegada registrada sin resultados, salto de línea en `?q=`); solo `/buscar/` lleva los nombres de la búsqueda en línea en todo el `dist/`; la 23.6 admite a la búsqueda solo `history.replaceState`.
- `tests/unit/vocabulario.test.ts` — fuera la 23.8 de `PENDIENTES`; escenarios de cada tramo y combinación de filtros solo en `busqueda`; «diez eventos»; dos `busqueda` iguales dan dos balizas.
- `tests/e2e/receptor.spec.ts` — `describe` de la 23.8 (trece pruebas, con botón central, teclado y llegada desde el 404); ajustes de la 7.3, la 23.6 y las dos de `/buscar/` de la 23.7.
- `tests/e2e/busqueda.spec.ts` — la 3.2: tras `fill` nada; tras Enter, `busqueda` (`0`, «ninguno») y `busqueda-sin-resultados`.
- `DESPLIEGUE.md` §3 — la búsqueda asentada (gestos, laxitudes, SM-13 que se desvía en los dos sentidos y puede pasar de 1), el corte de serie de FR-8, las consultas de SM-13 y SM-6 (esta con `ruta='/buscar/'`) y el comentario de la de FR-8.
- `AGENTS.md` — la convención de la medición al día.

**Revisión (pasada 1, capas externas).** 17 parches aplicados (4 medios, 13 bajos), 0 diferidos nuevos, 15 rechazados; detalle en el Review Triage Log. Recomendación de revisión de seguimiento: `true` (parches: 0 altos, 4 medios, 13 bajos; puntuación 3 × 4 + 13 = 25).

**Verificación.**
- `npx astro check` — 0 errores, 0 avisos (20 sugerencias ajenas a la historia).
- `npx vitest run` de `medicion`, `vocabulario`, `huella`, `receptor`, `redes`, `superficies`, `espinas-de-ux`, `ingreso-construido` y `medicion-orden` — 9 ficheros, 801 pruebas en verde; `git diff 42f082115b4d39f3a4f3384c2c9293b318758541 -- src/lib/vocabulario.ts medicion/` vacío.
- `npm test` (con `correr.sh`) — 131 ficheros, 5.875 pruebas en verde.
- `npx playwright test tests/e2e/receptor.spec.ts tests/e2e/busqueda.spec.ts tests/e2e/pagina-404.spec.ts --project=escritorio` — 84 en verde y 2 saltadas ajenas (la del prerender de la 23.1 y la 3.1 del índice); las de la caché de atrás y adelante restauraron de verdad. `origen` y `receptor-local` — 6 en verde. Puertos 4321, 4399, 4400, 4402 y 8787 libres al terminar.
- `npx tsx -e` con `guionDeMedicion` y el punto final de producción — 3.487 bytes ≤ 3.730; `/buscar/` del `dist/` completo con la medición puesta, 6.222 bytes < 6.656.
- Comprobación a mano: `ARRANQUE_DE_MEDICION`, `MAX_BYTES_DE_GUION`, `MAX_BYTES_GUION_DE_MEDICION`, `src/lib/vocabulario.ts`, `medicion/` y `corpus/` sin cambios.

**Riesgos que quedan.**
- `/buscar/` es la superficie más justa en línea: 434 bytes libres. Lo que la Épica 27 le añada entra en ese hueco, compacta el texto de la parte pura al construir o sube el tope en su diff.
- La parte pura viaja por su texto: su texto en Vitest y en `dist/` coinciden solo mientras no use constantes locales de un solo uso; lo vigila la prueba que compara los dos.
- Que el navegador vuelva a descargar `pagefind.js` tras una importación fallida depende de si guarda el fallo en su mapa de módulos; la isla lo vuelve a pedir, y un `init` que falló sí se reintenta.
- Las laxidades aceptadas (la marca es de la entrada y no del texto; volver o recargar a una búsqueda nunca asentada la da por registrada; ocultarse por navegación puede no dejar la marca) y los sesgos de SM-13 y de FR-8 quedan escritos en `DESPLIEGUE.md` §3.
- Cambiar de pestaña y cerrarla solo se prueban en el entorno simulado: Chromium sin cabeza no los reproduce.

**Diferido para Héctor.** Marcar en `epics.md` el criterio de emisión de la Historia 3.2 como «(sustituido en la v8 por la Historia 23.8)» — pendiente de Héctor (bmad-create-epics-and-stories); está en el `deferred` del frontmatter.
