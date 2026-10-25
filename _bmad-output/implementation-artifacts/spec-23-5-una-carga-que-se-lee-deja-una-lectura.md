---
title: 'Historia 23.5 — Una carga que se lee deja una lectura'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_revision: '38149b31a157e1d63df6887571020be8e70efc42'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-23-context.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** el fichero de medición solo emite vistas y acciones: no sabe qué carga se leyó de verdad (8 s visibles o una interacción), así que toda tasa del sitio se calcula sobre cargas —también las de máquinas—; y las acciones salen sin `primera`, de modo que SM-5 y SM-7 cuentan acciones y no lecturas con acción, y su numerador puede quedar fuera de su denominador. El vocabulario (23.2) y el receptor desplegado (23.3) ya guardan `lectura` y `primera`; nadie los envía (`PENDIENTES` de la 23.5 en `tests/unit/vocabulario.test.ts`).

**Approach:** enseñar al guion que compone `guionDeMedicion` a emitir, en toda carga que emite vista, una sola `lectura` —a los `MIN_MS_VISIBLES_PARA_LA_LECTURA` (8 s, `umbrales.ts`) de visibilidad acumulada o a la primera `pointerdown`/`keydown`/`wheel`/`touchmove`—, a poner `primera` en cada acción con memoria por carga, a emitir la lectura antes de toda acción que llegue sin ella, y a tratar `pageshow` con `persisted` como carga nueva; sacar la 23.5 de `PENDIENTES` y probarlo en Vitest (entorno simulado con tiempo y visibilidad fingidos) y en Playwright local contra el receptor Node de `receptor.spec.ts`.

## Boundaries & Constraints

**Always:**
- Superficie con lectura ⇔ el fichero emitió al activarse al menos una vista de `data-vistas` (de su tabla). Sin vista —páginas 2+, `/buscar/`, 404, la Obra que no se indexa hasta la 23.9— no hay lectura nunca, y una acción ahí sale sin ella.
- Todo arranca en la activación (`a()`, tras `prerenderingchange` si `document.prerendering`): marcas, temporizador y escuchas. Antes, nada corre ni cuenta.
- Visible = `document.visibilityState !== 'hidden'`; el tiempo se acumula solo mientras lo es, con `visibilitychange` y `performance.now()`; el temporizador se para al ocultarse y se rearma con lo que falta al volver a verse. Ninguna escucha de `scroll`. Ocultarse o descargarse no emite nada.
- Como mucho una `lectura` por carga. Su carga son **exactamente** `evento`, `ruta` y `origen` (la Marca de origen leída **una vez**, al activar, con `new URLSearchParams(location.search)` —la cadena literal la exige `tests/unit/redes.test.ts`—, cotejada como hoy); `via` sigue pendiente (23.6).
- `__medir` (la función pública del fichero) **descarta `lectura`**, igual que un evento inventado: solo la emite el fichero, por dentro, y nunca a través de `window.__medir` (el espía de `tests/e2e/ayuda/espia.ts` no debe verla). Se nombra en una lista exportada de eventos que solo emite el fichero, que la 23.7 ampliará.
- `primera` la calcula solo el fichero, al emitir (también al vaciar la cola, en su orden): `si` en la primera acción de su métrica en la carga, `no` en las demás, con la correspondencia de `METRICA_DE_ACCION` importada (nunca escrita a mano). Una `descarga-de-imagen` cuyo `destino`, cotejado, es de su conjunto lleva siempre `no` y no gasta la primera de su métrica; una con destino ajeno viaja con `destino: null` y cuenta como sin destino.
- En una superficie con lectura, toda acción (evento con métrica) emite antes la lectura si no ha salido: el orden en el transporte es vista(s) → lectura → acción.
- `pageshow` con `persisted: true` es carga nueva: la lectura puede volver a salir, la memoria de `primera` y el tiempo acumulado vuelven a cero, la Marca de origen queda en `null`, y no se emite ninguna vista. Con `persisted: false` no pasa nada.
- Ni identificador, ni cookie, ni almacenamiento, ni hora en la carga; `Math.random`, `referrer`, `userAgent`, `screen.`, `timeZone`, `language` siguen ausentes del texto del fichero. Una excepción del transporte no sale de ninguna escucha.
- El arranque en línea (`ARRANQUE_DE_MEDICION`) y `MAX_BYTES_DE_GUION` no cambian. `MAX_BYTES_GUION_DE_MEDICION` se sube a lo medido con el punto final de producción más unos 400 bytes, redondeado, con la medida y el porqué en su comentario (precedente de la 23.1/23.2).

**Block If:**
- Cumplir algo exige cambiar los datos de `src/lib/vocabulario.ts` (eventos, campos, valores, tramos, `METRICA_DE_ACCION`): movería la huella y exigiría otro `desplegar`.
- Cumplir algo exige subir `MAX_BYTES_DE_GUION`, tocar el arranque en línea o escribir en el D1, el Worker o el sitio en vivo.

**Never:**
- Emitir `via`, quitar `de`/`via` de la dirección o llamar a `history.replaceState` (23.6); `salida-interna`, zonas o escucha de clics (23.7); `busqueda` (23.8); `vista-de-obra` o vistas nuevas en `superficies.ts` (23.9); leer la línea base, la lista de cortes de serie, `MIN_LECTURAS_DE_LINEA_BASE` o la jornada de despliegue de la 23 (23.10/23.11).
- Que una isla emita `lectura`, calcule `primera` o conozca `METRICA_DE_ACCION`; tocar las islas (`CopiarCita`, `ImagenDeCita`, `CompartirEnlace`, `buscar.astro`) más allá de comentarios.
- Contar el tiempo antes de la activación del fichero, emitir la lectura al ocultarse o al descargar, usar `setInterval` por segundos en vez de `visibilitychange`.
- Editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`; correr `npm run medicion -- desplegar|comprobar`, `wrangler … --remote`, push o fusión.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 8 s visibles | vista declarada, visible, sin interacción | a 7.999 ms nada; a 8.000, una `lectura` `{evento, ruta, origen}`; nada más aunque pase el tiempo | — |
| Oculta a ratos | 5 s visible, oculta 60 s, visible 2,9 s → 3 s | nada hasta completar 8 s visibles; entonces una | — |
| Nunca visible / cerrada antes | `visibilityState: hidden` siempre; o 5 s y se oculta | ninguna lectura, tampoco al ocultarse | — |
| Interacción | `pointerdown` (o `keydown`, `wheel`, `touchmove`) a 1 s | lectura en ese momento; ni el tiempo ni otra interacción emiten otra | — |
| Solo `scroll` | eventos `scroll` y 7,9 s visibles | ninguna lectura | — |
| Prerender | `prerendering: true`, 30 s; luego `activar()` | nada antes; al activar, vistas y, 8 s después, la lectura | — |
| Sin vista | sin `data-vistas` (o solo vistas ajenas), interacción y 30 s | ninguna lectura; `copiado` sale sin lectura, con `primera` | — |
| Marca de origen | `?de=instagram` / `?de=ajena` | lectura con `origen: 'instagram'` / `null` | — |
| `__medir('lectura')` | directo o encolado | no sale nada y no gasta la lectura de la carga | descartado como evento ajeno |
| `primera` | copiado, copiado, descarga sin destino, compartición de enlace, de imagen | `si`, `no`, `no`, `si`, `no` | — |
| Descarga con destino | descarga con `opaco` y luego copiado | descarga `no`, copiado `si` | destino ajeno → `destino: null`, cuenta como sin destino |
| Acción sin lectura | vista declarada, sin interacción, `copiado` (directo o en la cola antes de cargar) | vista, `lectura`, `copiado` (`si`), en ese orden; otra acción no repite la lectura | — |
| bfcache | tras lectura y `copiado`, `pageshow` `persisted` | ninguna vista; nueva lectura posible con `origen: null`; el siguiente `copiado` lleva `si` | `persisted: false` → nada |
| Transporte roto | `sendBeacon` lanza en la lectura | ninguna excepción sale de la escucha ni del temporizador | `try` como hoy |

</intent-contract>

## Code Map

- `src/lib/medicion.ts:47-55` -- `EVENTOS_DEL_GUION` (los siete de hoy): entra `lectura`. Nueva exportación hermana con los eventos que solo emite el fichero (`[EVENTOS.lectura]`), que `__medir` descarta.
- `src/lib/medicion.ts:67-71` -- `FUENTE_EN_EL_GUION` (`0` marca, `1` datos, `2` destino): entra `primera` como fuente calculada por el fichero; `camposQueEmite` (80) y `CAMPOS_DEL_GUION` la heredan (los usan `vocabulario.test.ts:322-339` y `receptor.spec.ts:305-307`).
- `src/lib/medicion.ts:155-205` -- `guionDeMedicion`: tabla por evento desde `CAMPOS_DE_EVENTO`, `e(v,t,z)` lee `?de=` en cada emisión (pasa a leerse una vez en `a()`), `a()` emite vistas, se instala, vacía la cola; espera a `prerenderingchange`. Ahí entra todo lo nuevo. Docblock (117-154) y comentarios de cabecera, al día.
- `src/lib/vocabulario.ts` -- solo lectura: `EVENTOS.lectura`, `METRICA_DE_ACCION`, `PRIMERA`, `DESTINOS_DE_DESCARGA`, `CAMPOS_DE_EVENTO[lectura] = {origen, via}`. No se toca (huella).
- `src/lib/umbrales.ts:183,197-211` -- `MAX_BYTES_DE_GUION` (no se toca) y `MAX_BYTES_GUION_DE_MEDICION = 1320` (hoy 1.128 B medidos; un prototipo de esta historia midió ~1.970 con el punto final de producción `https://medicion-sabiduria-de-bolsillo.sabiduriadebolsillo.workers.dev`). `umbrales.ts` no importa nada.
- `src/pages/medicion/[version].js.ts:33-46` -- para el build si el fichero pasa del tope; no cambia.
- `src/components/Armazon.astro:77,85` + `src/lib/superficies.ts:304-310,537` -- `data-vistas` sale de `consecuenciasDe(ruta).vistas` («sí y solo si producto»); `medicion.test.ts:607-660` ya fija que páginas 2+, `/buscar/`, 404 y la Obra no indexable no lo llevan. No cambian.
- Islas que emiten acciones (no cambian): `src/islands/CopiarCita.astro:117`, `src/islands/ImagenDeCita.astro:227,232`, `src/islands/CompartirEnlace.astro:86,97`, `src/pages/buscar.astro:99`.
- `tests/unit/ayuda/medicion.ts` -- sandbox `node:vm` (`emitir`, `cargar`, `activar`, `balizas`); solo guarda escuchas de `document`; no tiene `performance`, temporizadores, `visibilityState`, ni `addEventListener` global.
- `tests/unit/medicion.test.ts:138-152,171-183,260-340` -- pruebas que cambian de forma: el descarte (`EVENTOS_DEL_GUION` emitidos por `__medir`), «lo que viaja es el evento, la ruta y nada más» (el copiado gana `primera`), cola, prerender y marca con la cola (ganan la `lectura` antes de la acción). `1034-1052`: el tope se juzga con el punto final.
- `tests/unit/vocabulario.test.ts:226-250,285-411` -- `PENDIENTES` (entrada 23.5), `escenariosDe`, «lo no pendiente son los siete…», correspondencia por `emitir` y «los campos pendientes no salen» (con `balizas()[0]`).
- `tests/unit/redes.test.ts:38-57` y `tests/unit/comparticion.test.ts:44-51,129-140` -- usan el sandbox sin vistas; deben seguir pasando sin cambios.
- `tests/e2e/receptor.spec.ts` -- sitio propio con receptor Node (`interpretar`) en 4399/4400, serie, solo `escritorio`; `esperarEvento`, `recibidos`; `462-506` (cola retenida, orden por `sendBeacon` envuelto) cambia; `199-223,262-272` copiar, descargar y compartir.
- `tests/servidor.mjs:95-98` -- sirve con `cache-control: no-store`, que deja fuera de la caché de atrás y adelante; Playwright lanza Chromium con `--disable-back-forward-cache` (playwright-core 1.62.1, `chromiumSwitches`). El alojamiento sirve `max-age=600` (`DESPLIEGUE.md:125`).
- `DESPLIEGUE.md:476-500` (§3, el fichero y las consultas a mano; la de SM-5 cuenta acciones) y `AGENTS.md:37` (convención de la medición).

## Tasks & Acceptance

**Execution:**
- `src/lib/umbrales.ts` -- añadir `MIN_MS_VISIBLES_PARA_LA_LECTURA = 8_000` con su comentario (AD-9; el valor lo dan FR-56 y AD-13; cuenta desde la activación del fichero; cambiarlo es una entrada de la lista de cortes de serie de la 23.10 y repite la línea base, y lo decide Héctor tras la comparación por firma); tras implementar, medir el fichero con el punto final de producción y subir `MAX_BYTES_GUION_DE_MEDICION` a medida + ~400 con la medida y el porqué -- un umbral con nombre y un tope visible en el diff.
- `src/lib/medicion.ts` -- `EVENTOS_DEL_GUION` con `lectura`; exportar la lista de eventos que solo emite el fichero; `primera` como fuente calculada; `guionDeMedicion` según Boundaries y Design Notes, componiendo umbral, métrica y conjunto de la descarga desde sus módulos; docblocks al día -- AD-13, FR-56.
- `tests/unit/ayuda/medicion.ts` -- opciones `visible` (por omisión `true`) y vistas; reloj fingido (`performance.now`, `setTimeout`, `clearTimeout`) y escuchas de ventana; devolver `avanzar(ms)`, `interactuar(tipo)` (despacha en la ventana: `pointerdown`, `keydown`, `wheel`, `touchmove`, `scroll`…), `ocultar()`/`mostrar()` (cambian `visibilityState` y despachan `visibilitychange`) y `restaurar(persisted = true)` (despacha `pageshow`) -- el entorno con tiempo y visibilidad fingidos que pide la historia.
- `tests/unit/medicion.test.ts` -- `describe('Historia 23.5 — …')` con una prueba por fila de la matriz; ajustar las cinco del Code Map sin rebajar lo que afirman (la cola, el prerender y la marca afirman ahora vista → lectura → acción; el descarte, que `__medir` emite `EVENTOS_DEL_GUION` menos los propios del fichero); la lectura no sale por `__medir`, ni directa ni encolada -- Vitest, que corre el CI.
- `tests/unit/vocabulario.test.ts` -- quitar la entrada 23.5 de `PENDIENTES`; «lo no pendiente» pasa a los ocho; la correspondencia produce `lectura` en un entorno con vista declarada y una interacción (y la toma de entre las balizas) y espera `primera` = `si` en la primera emisión de cada entorno, `no` en la descarga con destino de su conjunto; «los campos pendientes no salen» produce la lectura igual -- prueba de correspondencia de la 23.2.
- `tests/servidor.mjs` -- `CACHE_CONTROL` opcional en el entorno (por omisión `no-store`, como hoy) -- para servir como el alojamiento solo donde se pide.
- `tests/e2e/receptor.spec.ts` -- servir su sitio con `CACHE_CONTROL: 'max-age=600'`; la prueba de la cola retenida espera `[vista-de-cita, lectura, copiado]` y `primera: 'si'`; nuevo `describe('Historia 23.5 — …')`: lectura a 8 s con `page.clock` (nada a 7,9 s; una a 8 s; una tras 20 s más), interacción (`page.mouse.down`/`keyboard.press` antes de 8 s → una, inmediata), `/buscar/` con interacción y 20 s → ninguna, `pageshow` sintético (`PageTransitionEvent` con `persisted`) y caché de atrás y adelante real (navegador propio con `browserType.launch({ ignoreDefaultArgs: ['--disable-back-forward-cache'] })`, llegada con `?de=instagram`, lectura, ir a otra página y volver: ninguna vista nueva, nueva lectura con `origen` nulo; si `persisted` no llega, `test.skip` con `notRestoredReasons`, como el prerender de la 23.1), primera por métrica (copiar ×2 → `si`,`no`; compartir enlace ×2 → `si`,`no`) y `element.click()` sin `pointerdown` ni `keydown` → lectura antes del copiado, en el orden del `sendBeacon` envuelto -- Playwright local, que el CI no corre.
- `DESPLIEGUE.md` -- en §3, un párrafo de la lectura y `primera` (cuándo sale, que la decide solo el fichero, el umbral con nombre, la descarga con destino) y el corte de serie de SM-5/SM-7 (antes del despliegue de la 23, `primera` nula); consulta de lecturas por jornada y la de SM-5 con `primera` -- lo que se lee a mano hasta la 23.10.
- `AGENTS.md` -- en la convención de la medición (línea 37), una frase: la lectura y `primera` las decide solo el fichero; ninguna isla las emite ni las calcula, y `__medir('lectura')` se descarta.

**Acceptance Criteria:**
- Given el sitio de `receptor.spec.ts` construido con punto final, when una Página de Cita lleva 8 s visible sin interacción —o recibe antes un `pointerdown`—, then el receptor Node recibe exactamente una `lectura` con su `ruta` y `origen`, detrás de la vista; y when se copia la Cita con `element.click()` sin interacción previa, then recibe la `lectura` antes del `copiado`, y este con `primera: 'si'`.
- Given la rama terminada, when corren `npx astro check` y por fichero `medicion`, `vocabulario`, `redes`, `comparticion`, `huella`, `receptor`, `espinas-de-ux` y `kit-construido` de `tests/unit/`, then 0 errores y todo en verde, con la huella intacta (`git diff --stat src/lib/vocabulario.ts medicion/` vacío).
- Given `npm test` en segundo plano, when termina, then todo en verde.
- Given `npx playwright test tests/e2e/receptor.spec.ts --project=escritorio`, when corre, then pasa, con la prueba de la caché real en verde o saltada nombrando su motivo; y `copiar`, `imagen`, `compartir-enlace`, `compartir-imagen`, `busqueda`, `pagina-de-cita` y `receptor-local` siguen en verde con el `webServer`.
- Given el fichero compuesto con el punto final de producción, when se mide, then cabe en el `MAX_BYTES_GUION_DE_MEDICION` nuevo, cuyo comentario dice la medida.

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

Las capas de revisión de esta pasada son externas (blind-hunter, edge-case-hunter, verification-gap,
intent-alignment, ac-auditor) y no traían hallazgos todavía: la revisión independiente viene después.

### 2026-10-25 — Review pass (revisión independiente, pasada 1)
- intent_gap: 0
- bad_spec: 0
- patch: 17: (high 0, medium 3, low 14)
- defer: 0
- reject: 17: (high 0, medium 0, low 17)
- addressed_findings:
  - `[medium]` `[patch]` La lectura se perdía si el temporizador llegaba tarde (una tarea larga) y la página se ocultaba con los 8 s visibles ya cumplidos (blind-hunter, edge-case-hunter). `g()` emite ahora la lectura cuando el rato acumulado ya alcanza `MIN_MS_VISIBLES_PARA_LA_LECTURA`; el sandbox gana `bloquear(ms)` y dos pruebas (con y sin los 8 s cumplidos).
  - `[medium]` `[patch]` Nada comprobaba que ninguna isla conozca `METRICA_DE_ACCION` ni emita `lectura`, ni que el espía de punta a punta no vea la lectura (blind-hunter, ac-auditor). Prueba que recorre `src/` y `public/islas/` (fuera de los dueños) y prueba con `espiar()` en el sandbox.
  - `[medium]` `[patch]` La consulta de SM-5 sobre lecturas de `DESPLIEGUE.md` mezclaba todas las superficies; ahora filtra `ruta LIKE '/cita/%'`, como pide SM-5 enmendada.
  - `[low]` `[patch]` `V` se encendía con cualquier evento de la tabla escrito en `data-vistas`. De ahí solo salen ya los de `EVENTOS_DE_VISTA` (exportado de `medicion.ts`); prueba con acciones en `data-vistas`.
  - `[low]` `[patch]` Ninguna prueba fijaba que las escuchas de interacción sean pasivas y en captura: el sandbox apunta los ajustes y una prueba los exige.
  - `[low]` `[patch]` El JSDoc de `ficherosDelSitio` quedó encima de `REVISADO_SIN_DESMENTIR` en `tests/unit/superficies.test.ts`: devuelto a su función.
  - `[low]` `[patch]` La prueba de la cola de la 23.1 leía `__balizas` con la forma vieja (`string[]`): usa `balizasDe(page)`.
  - `[low]` `[patch]` `apuntarBalizas` podía impedir el envío si la carga no era JSON: apunta `{ sinInterpretar }` y la baliza sale igual.
  - `[low]` `[patch]` Faltaba el caso «descarga con destino y después una sin destino» del criterio de `primera`: prueba por destino del conjunto.
  - `[low]` `[patch]` `DESPLIEGUE.md` no traía consulta de SM-7 sobre lecturas: añadida, también solo de rutas de Cita.
  - `[low]` `[patch]` `DESPLIEGUE.md` no decía que la descarga impuesta no entra ni en SM-5 ni en SM-7: dicho, como decisión de la v8.2.
  - `[low]` `[patch]` `DESPLIEGUE.md` no avisaba de que las lecturas no son subconjunto de las vistas (la vuelta por la caché de atrás y adelante): avisado.
  - `[low]` `[patch]` El corte de serie se describía como un día limpio: ahora empieza la primera jornada UTC completa tras la llegada, con la de llegada (mixta) informada aparte.
  - `[low]` `[patch]` «toda acción con `primera='si'` tiene su lectura» se afirmaba de lo guardado: reescrito como garantía de la emisión (una baliza perdida no se reintenta).
  - `[low]` `[patch]` La lectura y su acción pueden caer en jornadas distintas junto a medianoche: dicho, con la indicación de leer sobre varias jornadas.
  - `[low]` `[patch]` `DESPLIEGUE.md` y el docblock afirmaban que la descarga impuesta llega con destino, y la isla de la Imagen no lo pasa hasta la 25.2 (verification-gap, edge-case-hunter): los dos lo dicen.
  - `[low]` `[patch]` `tests/servidor.mjs` leía una variable genérica `CACHE_CONTROL`: ahora `SERVIDOR_CACHE_CONTROL`.

Rechazados (17 contados; la lista nombra 16 y el que falta no se puede reconstruir —nota de la
pasada 2—), con su motivo: filtrar máquinas (`navigator.webdriver`, renderizadores que adelantan el tiempo) — la intención define la lectura por FR-56 y deja las firmas mecánicas a la comparación del informe de la 23.10; filtrar teclas modificadoras, atajos o botones de salida — la intención nombra `keydown`/`pointerdown` sin excepciones, y la salida interna fuerza la lectura en la 23.7; `isTrusted` — ningún guion del sitio despacha eventos sintéticos; `__medir('vista-…')` directo — superficie de la 23.1 que nadie usa; `URLSearchParams` que lanza — ningún navegador con `sendBeacon` carece de él; escuchas sin quitar — la carga nueva de `pageshow` las necesita y su coste es nulo; `REVISADO_SIN_DESMENTIR` como interruptor — texto exacto con prueba compañera que obliga a revisar; el tope fijado por lo medido — lo manda la intención; el Chromium completo sin documentar — la instalación por omisión lo trae y la prueba se salta nombrando el motivo; cobertura en navegador de visibilidad, `wheel`/`touchmove`, páginas 2+ y 404 — la intención reparte entre Vitest y Playwright y la lista de Playwright se cumple; contar desde `timeOrigin` — la intención lo prohíbe; la continuación — 23.7/23.10; el prerender real — salto preexistente de la 23.1; el 8_000 fijado en una prueba — deliberado; la revisión apuntada antes de hacerse — la corrige esta pasada; `sprint-status.yaml` — lo lleva el orquestador.

### 2026-10-25 — Review pass (revisión independiente, pasada 2)
- intent_gap: 0
- bad_spec: 0
- patch: 13: (high 0, medium 0, low 13)
- defer: 0
- reject: 23: (high 0, medium 0, low 23)
- addressed_findings:
  - `[low]` `[patch]` `DESPLIEGUE.md` §3 decía que la lectura no sale nunca al ocultarse, y el fichero emite al ocultarse la que la carga ya debía cuando el temporizador llega tarde (blind-hunter): lo dice, como única excepción.
  - `[low]` `[patch]` El corte de serie de SM-5 y SM-7 no nombraba la llegada de la 25.2, que baja el numerador de SM-5 al sacar la descarga impuesta (blind-hunter): nombrada como otro corte de SM-5, con su jornada de llegada aparte.
  - `[low]` `[patch]` Las consultas de SM-5 y SM-7 no aplicaban el corte que describen y remitían «aparte» a la portada, la Obra y los listados sin decir cómo (blind-hunter): llevan `jornada >= 'AAAA-MM-DD'`, que sin cambiar no devuelve nada —nunca una jornada mixta—, y dicen que las demás superficies se leen cambiando el filtro de `ruta`.
  - `[low]` `[patch]` Las consultas eligen la Cita por el prefijo `/cita/`, y la 23.10 manda resolverla contra el censo (intent-alignment, ac-auditor): dicho en la consulta —a mano es por prefijo y cuenta Citas retiradas; el informe de la 23.10 resuelve contra el censo—.
  - `[low]` `[patch]` «Nunca cuenta una vista menos», en `MIN_MS_VISIBLES_PARA_LA_LECTURA`, no se entendía (blind-hunter): reescrito —ninguna carga visible menos de 8 s tiene lectura por tiempo; por interacción, sí—.
  - `[low]` `[patch]` La prueba «ninguna isla…» eximía `umbrales.ts` entero por un comentario y no decía por dónde queda fuera `medicion.ts` (blind-hunter): el comentario del tope ya no nombra `METRICA_DE_ACCION`, los dueños son solo `vocabulario.ts` y el comentario explica `fuentesDeSrc`.
  - `[low]` `[patch]` Nada fijaba que una isla no pueda colar `primera` por un argumento de más (blind-hunter): `emitir` del entorno simulado pasa lo que vaya detrás del destino, y una prueba lo intenta directo y encolado.
  - `[low]` `[patch]` En `receptor.spec.ts`, «nada a 7,9 s» y «una tecla…» miraban solo el receptor tras 500 ms (blind-hunter): miran también `balizasDe`, que apunta al llamar a `sendBeacon`.
  - `[low]` `[patch]` Nada fijaba «como mucho una lectura» con dos vistas en `data-vistas`, o la misma dos veces (blind-hunter): dos casos en Vitest.
  - `[low]` `[patch]` El registro de la pasada 1 contaba 17 rechazos y nombraba 16 (blind-hunter): anotado allí, sin reescribir lo que contó.
  - `[low]` `[patch]` La prueba de `primera` por métrica contaba en el receptor el copiado y la lectura sin esperar, y las balizas llegan sin orden (edge-case-hunter): `expect.poll` para cada recuento.
  - `[low]` `[patch]` `EVENTOS_DE_VISTA` y el tipo `EventoDeVista` se escribían por separado, y una vista nueva declarada solo en el tipo (la de la Obra, 23.9) saldría al `data-vistas` y el fichero la descartaría en silencio (verification-gap): el tipo sale ahora de la lista (`as const`), un solo sitio; el fichero no cambia ni un byte.
  - `[low]` `[patch]` El comentario «guardada en su columna» de `receptor.spec.ts` hablaba de una columna que en ese camino no hay (intent-alignment): dice que es la interpretación del receptor.

Rechazados (23), con su motivo: la lectura sin su disparador ni la marca de la caché de atrás y
adelante — añadir campos es tocar `vocabulario.ts` (Block If) y la intención fija la carga en
`evento`, `ruta` y `origen`; filtrar máquinas —`navigator.webdriver`, tiempo virtual— — la
intención define la lectura por FR-56 y la separación por firma es de la 23.10; olvidar la Marca
de origen al volver por la caché — lo manda la intención («queda en `null`») y FR-56 («sin
marcas»); el historial de medidas del comentario del tope, que envejecerá — la intención pide la
medida y el porqué en el comentario, como la 23.1 y la 23.2; la cobertura en navegador de la
visibilidad, `wheel`/`touchmove`, páginas 2+, 404, la descarga con destino y el reinicio de
`primera` tras una restauración real — la intención reparte entre Vitest y Playwright y la lista
de Playwright de la historia se cumple; los demás `spec` de punta a punta sin `primera` y los
ayudantes fuera de `tests/e2e/ayuda/` — fuera de lo pedido; el `max-age=600` para todo
`receptor.spec.ts` y la variable sin validar — cada prueba abre su contexto, el navegador por
omisión no usa la caché de atrás y adelante, la caché HTTP devuelve los mismos bytes y la variable
la pone la propia prueba; la prueba de la caché real que se salta — la intención lo prescribe;
`status: done` con `followup_review_recommended: true` — es la forma del flujo, y por eso existe
esta pasada; la primera entrada a ceros del registro — apunta lo que pasó; `sprint-status.yaml` —
lo lleva el orquestador; teclas modificadoras y atajos — la intención nombra `keydown` sin
excepciones; `isTrusted` — ningún guion del sitio despacha eventos sintéticos; `__medir('vista-…')`
directo — superficie de la 23.1 que nadie usa; `sendBeacon` que devuelve `false` en la vista y
enciende `V` — «emitió» es intentarlo, como en el transporte roto de la matriz, y una baliza
perdida no se reintenta; el resultado en D1 frente al emisor — la intención prohíbe desplegar
(23.11); la descarga impuesta sin destino hasta la 25.2 — orden de la épica, documentado;
contar desde la activación — la intención lo elige; **la lectura debida que sale al ocultarse
frente al «ocultarse no emite nada» del contrato** — la épica acota el «tampoco al ocultarse» a la
carga cerrada **antes** de los 8 s y exige la lectura de la que lleva 8 s visibles; con el
temporizador tardío las dos cláusulas del contrato chocan y la única lectura que cumple las dos de
la épica es emitirla (lo dice ya `DESPLIEGUE.md`); `tests/unit/superficies.test.ts` tocado — lo
exige `touchmove`, que la intención nombra; la continuación — 23.7 y 23.10; el cambio del umbral
como entrada de cortes — la lista y su guarda son de la 23.10, que nombra «un cambio del tiempo
mínimo de la lectura»; la expresión regular que no ve una emisión indirecta — el descarte en
tiempo de ejecución de `__medir('lectura')` lo impide igual y está probado.

## Design Notes

Forma del fichero (orientativa; nombres y compactación los fija el código):

```js
var o,L,V,P,C,S=-1,T;                     // marca, lectura salida, con lectura, memoria, acumulado, inicio, temporizador
function b(v,t,z,y){/* compone desde s[v] con m=[o,t,z,y] y envía, en try */}
function h(){S>=0&&(C+=performance.now()-S);S=-1;clearTimeout(T)}
function g(){h();V&&!L&&document.visibilityState!='hidden'&&(S=performance.now(),T=setTimeout(l,UMBRAL-C))}
function l(){V&&!L&&(L=1,h(),b('lectura'))}
function n(){h();L=C=0;P={};g()}           // carga nueva
function e(v,t,z){/* __medir: descarta ajenos y los propios; si es acción: l(); y=primera; b(v,t,z,y) */}
function a(){o=new URLSearchParams(location.search).get('de');/* vistas por b → V=1 */;n();window.__medir=e;
  /* pointerdown keydown wheel touchmove → l (captura, pasiva); visibilitychange → g;
     pageshow persisted → o=null,n() */;q.splice(0).forEach(function(x){e.apply(null,x)})}
```

`n()` va antes de vaciar la cola, para que una acción encolada encuentre `V` y fuerce la lectura. El orden de `visibilitychange` y `pageshow` al restaurar no importa: `n()` para y rearma. Contar desde la activación y no desde `timeOrigin` deja la lectura a 8 s más lo que tarde en llegar el fichero (con `defer`): peca por defecto, nunca cuenta una carga vista menos de 8 s.

Sandbox: el reloj fingido es un entero `ahora` y una lista de temporizadores; `avanzar(ms)` dispara en orden los que vencen. Los oyentes de ventana y documento se guardan por tipo; `interactuar`, `ocultar`, `mostrar` y `restaurar` los llaman con un objeto de evento mínimo (`{ persisted }` en `pageshow`).

Playwright: con `page.clock.install()` antes de navegar y `pauseAt` tras la vista, `runFor` dispara el temporizador; Playwright no mueve el ratón al navegar, así que no hay interacción espuria. La caché de atrás y adelante necesita el navegador propio y una respuesta sin `no-store`; el resto del fichero no depende de la caché porque cada prueba abre contexto nuevo.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run tests/unit/medicion.test.ts`, y por fichero `vocabulario`, `redes`, `comparticion`, `huella`, `receptor`, `espinas-de-ux`, `kit-construido` -- expected: verde.
- `npm test` en segundo plano con `correr.sh` -- expected: verde.
- `npx playwright test tests/e2e/receptor.spec.ts --project=escritorio`; con el `webServer`, `copiar`, `imagen`, `compartir-enlace`, `compartir-imagen`, `busqueda`, `pagina-de-cita`, `receptor-local` en `escritorio` -- expected: verde (puertos 4321, 4399, 4400 y 8787 libres al terminar).
- `npx tsx -e` que importe `guionDeMedicion` y mida sus bytes UTF-8 con el punto final de producción -- expected: ≤ el tope nuevo, anotado en su comentario.

**Manual checks (if no CLI):**
- `git diff src/lib/vocabulario.ts medicion/` vacío; `ARRANQUE_DE_MEDICION` y `MAX_BYTES_DE_GUION` sin cambios.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Qué se hizo.** El fichero de medición (`guionDeMedicion`) emite, en toda carga que emite al menos
una vista de su `data-vistas` —de ahí solo salen los eventos de `EVENTOS_DE_VISTA`—, como mucho una
`lectura` —`{evento, ruta, origen}`— a los `MIN_MS_VISIBLES_PARA_LA_LECTURA` (8.000, nuevo en
`umbrales.ts`) de visibilidad acumulada o a la primera de `INTERACCIONES_DE_LECTURA` (`pointerdown`,
`keydown`, `wheel`, `touchmove`, en captura y pasivas); si el temporizador llega tarde y la página se
oculta con el tiempo ya cumplido, la lectura sale entonces. Pone `primera` en cada acción con memoria
por métrica y por carga, desde `METRICA_DE_ACCION` importada; la descarga con destino de
`DESTINOS_DE_DESCARGA` lleva siempre `no` y no gasta la primera; emite la lectura antes de toda acción
que llegue sin ella (también al vaciar la cola); trata `pageshow` con `persisted` como carga nueva (sin
vista, marca a `null`, `primera` y reloj a cero), y descarta `__medir('lectura')` por la lista
exportada `EVENTOS_SOLO_DEL_FICHERO`. El reloj se arma en la activación (tras `prerenderingchange` si
hace falta), se para con `visibilitychange` y se rearma con lo que falta; ni `scroll` ni
`setInterval`. La Marca de origen se lee una vez, al activar. El arranque en línea y
`MAX_BYTES_DE_GUION` no cambian; la huella tampoco (`git diff src/lib/vocabulario.ts medicion/`
vacío).

**Ficheros.**
- `src/lib/medicion.ts` — `EVENTOS_DEL_GUION` con `lectura`; `EVENTOS_SOLO_DEL_FICHERO`;
  `EVENTOS_DE_VISTA` (revisión), del que sale el tipo `EventoDeVista` (pasada 2); fuente 3 (`primera`, calculada); `INTERACCIONES_DE_LECTURA`; el
  fichero con reloj, escuchas, memoria de `primera`, carga nueva y lectura debida al ocultarse
  (revisión); docblocks al día, con la nota de la descarga impuesta hasta la 25.2.
- `src/lib/umbrales.ts` — `MIN_MS_VISIBLES_PARA_LA_LECTURA = 8_000`; `MAX_BYTES_GUION_DE_MEDICION`
  de 1.320 a 2.420 (medido 2.024 bytes con el punto final de producción en la implementación; 2.096
  tras la revisión, sin mover el tope); en la pasada 2, dos comentarios más claros y sin nombrar
  `METRICA_DE_ACCION`.
- `tests/unit/ayuda/medicion.ts` — sandbox con reloj fingido (`avanzar`, `bloquear`), visibilidad
  (`visible`, `ocultar`, `mostrar`), escuchas de ventana con sus ajustes (`interactuar`, `escuchas`),
  `restaurar(persisted)`, `pendientes` y `espiar`; `emitir` pasa lo que vaya detrás del destino
  (pasada 2).
- `tests/unit/medicion.test.ts` — `describe('Historia 23.5 — …')`, una prueba (o más) por fila de la
  matriz, y las de la revisión: temporizador tardío, escuchas pasivas y en captura, `data-vistas` con
  acciones, el espía, el recorrido de las islas y la descarga con destino seguida de una elegida; y
  las de la pasada 2: un argumento de más no cuela `primera`, y dos vistas —o la misma dos veces— en
  `data-vistas` dejan una sola lectura.
- `tests/unit/vocabulario.test.ts` — fuera la entrada 23.5 de `PENDIENTES`; ocho vigentes; la
  correspondencia produce la lectura (`PRODUCIR_DEL_FICHERO`) y espera `primera`.
- `tests/unit/superficies.test.ts` — `REVISADO_SIN_DESMENTIR` para la señal de WCAG 2.5.7 que
  enciende `touchmove` en `INTERACCIONES_DE_LECTURA`, con su prueba compañera; el JSDoc de
  `ficherosDelSitio`, de vuelta en su sitio (revisión).
- `tests/servidor.mjs` — `SERVIDOR_CACHE_CONTROL` opcional (por omisión `no-store`; renombrada en la
  revisión desde `CACHE_CONTROL`, que es lo que dicen las Tasks).
- `tests/e2e/receptor.spec.ts` — su sitio se sirve `max-age=600`; la cola retenida espera
  `[vista-de-cita, lectura, copiado]` y `primera: 'si'` (con `balizasDe`, revisión);
  `apuntarBalizas` nunca impide enviar (revisión); `describe('Historia 23.5 — …')` con ocho pruebas;
  las ausencias miran también `balizasDe` y los recuentos del receptor se esperan (pasada 2).
- `DESPLIEGUE.md` §3 — la lectura y `primera`; la descarga impuesta fuera de SM-5 y SM-7 y sin
  destino hasta la 25.2; la garantía de orden como garantía de la emisión; la jornada UTC del
  receptor; lecturas que no son subconjunto de vistas; el corte de serie desde la primera jornada UTC
  completa; consultas de lecturas por jornada y de SM-5 y SM-7 sobre lecturas de Página de Cita; en
  la pasada 2, la lectura debida que sale al ocultarse, la 25.2 como otro corte de SM-5 y las
  consultas con su jornada de partida, el prefijo dicho y cómo leer las demás superficies.
- `AGENTS.md` — en la convención de la medición, que la lectura y `primera` las decide solo el
  fichero y `__medir('lectura')` se descarta.

**Revisión (pasada 1, capas externas: blind-hunter, edge-case-hunter, verification-gap,
intent-alignment, ac-auditor).** 17 parches aplicados (0 altos, 3 medios, 14 bajos), 0 diferidos,
17 rechazados; ningún `intent_gap` ni `bad_spec`. Seguimiento recomendado: `true` (puntuación
3 × 3 + 14 = 23 ≥ 5).

**Revisión (pasada 2, las mismas capas externas).** 13 parches aplicados (0 altos, 0 medios, 13
bajos), 0 diferidos, 23 rechazados; ningún `intent_gap` ni `bad_spec`, así que ningún bucle de
vuelta. Seguimiento recomendado: `true` (puntuación 3 × 0 + 13 = 13 ≥ 5), aunque los trece son de
documentación, comentarios y pruebas: el fichero de medición no cambia ni un byte (2.096 con el punto
final de producción). Lo que pide una decisión de lectura: el contrato dice «ocultarse no emite
nada», y el fichero emite al ocultarse la lectura que la carga ya debía cuando una tarea larga
retrasa el temporizador; se mantiene porque la épica acota el «tampoco al ocultarse» a la carga
cerrada antes de los 8 s y exige la lectura de la que lleva 8 s visibles, y `DESPLIEGUE.md` §3 lo
dice ya.

**Verificación (pasada 2, tras sus parches).**
- `npx astro check` — 0 errores, 0 avisos (331 ficheros).
- `npx vitest run` de `medicion`, `vocabulario`, `redes`, `comparticion`, `huella`, `receptor`,
  `espinas-de-ux`, `kit-construido` y `superficies` — 9 ficheros, 516 pruebas en verde.
- `npm test` (con `correr.sh`, `r2-23-5-npm-test.log`) — 131 ficheros, 5.664 pruebas en verde.
- `npx playwright test` de `receptor`, `copiar`, `imagen`, `compartir-enlace`, `compartir-imagen`,
  `busqueda`, `pagina-de-cita` y `receptor-local` en `escritorio` (`r2-23-5-e2e.log`) — 144 en verde y
  las mismas 3 saltadas que no son de esta historia; la de la caché real, en verde. Puertos 4321,
  4399, 4400, 4402 y 8787 libres al terminar.
- `npx tsx -e` con `guionDeMedicion` — 2.096 bytes con el punto final de producción ≤ 2.420.
- `git diff 38149b31..HEAD -- src/lib/vocabulario.ts medicion/` vacío; `ARRANQUE_DE_MEDICION` y
  `MAX_BYTES_DE_GUION` sin cambios.

**Verificación (pasada 1, tras sus parches).**
- `npx astro check` — 0 errores, 0 avisos (331 ficheros).
- `npx vitest run` de `medicion`, `vocabulario`, `redes`, `comparticion`, `huella`, `receptor`,
  `espinas-de-ux`, `kit-construido` y `superficies` — 9 ficheros, 513 pruebas en verde.
- `npm test` (con `correr.sh`, `r1-23-5-npm-test.log`) — 131 ficheros, 5.661 pruebas en verde.
- `npx playwright test` de `receptor`, `copiar`, `imagen`, `compartir-enlace`, `compartir-imagen`,
  `busqueda`, `pagina-de-cita` y `receptor-local` en `escritorio` (`r1-23-5-e2e.log`) — 144 en verde y
  3 saltadas que no son de esta historia (prerender con DevTools, la de móvil de la Página de Cita y la
  del índice sin Tema bajo umbral); la de la caché real, en verde. Puertos 4321, 4399, 4400, 4402 y
  8787 libres al terminar.
- `npx tsx -e` con `guionDeMedicion` — 2.096 bytes con el punto final de producción (2.051 con el de
  las pruebas) ≤ 2.420.
- `git diff 38149b31..HEAD -- src/lib/vocabulario.ts medicion/` vacío; `ARRANQUE_DE_MEDICION` y
  `MAX_BYTES_DE_GUION` sin cambios.

**Riesgos residuales.**
- La lectura cuenta desde la activación del fichero (con `defer`), así que peca por defecto: una
  carga vista poco más de 8 s puede quedarse sin lectura por tiempo. Es lo que dice la historia.
- Hasta la 25.2 la descarga que impone el navegador tras un rechazo de la compartición llega sin
  destino y cuenta en SM-5 como elegida; `DESPLIEGUE.md` lo dice.
- Un renderizador sin cabeza que adelante el tiempo virtual deja lectura: lo separa la comparación
  por firma de la 23.10, no el fichero.
- La prueba de la caché real depende del Chromium completo; si no restaura, se salta nombrando el
  motivo, y el comportamiento lo siguen cubriendo el `pageshow` sintético y el entorno simulado.
- Cualquier `keydown` cuenta como interacción, también una tecla modificadora o el atajo que cierra
  la pestaña: una carga cerrada así antes de 8 s deja lectura. Es lo que nombra la historia; si la
  comparación por firma de la 23.10 lo señala, se decide entonces.
- Las consultas a mano de `DESPLIEGUE.md` eligen la Cita por el prefijo `/cita/` y cuentan Citas
  retiradas; el informe de la 23.10 la resuelve contra el censo.
- Nada de esto se ha desplegado: la serie de lecturas empieza con el despliegue del sitio de la 23
  (23.11).
