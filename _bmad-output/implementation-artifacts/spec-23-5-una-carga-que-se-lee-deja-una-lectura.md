---
title: 'Historia 23.5 — Una carga que se lee deja una lectura'
type: 'feature'
created: '2026-10-25'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
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

Status: ready-for-dev
Blocking condition: ninguna.

Planificación cerrada (bmad-build-auto, alto tras planificar). Contexto de la épica en caché
(`epic-23-context.md`, válido); continuidad de la 23.4 (`done`) y, por el mecanismo, de la 23.1 y
la 23.2. La rama está en verde con la huella de la 23.3 (`tests/unit/huella.test.ts` pasa). La
historia no toca `src/lib/vocabulario.ts`, así que no exige otro `desplegar`. Decisiones que el
plan dejaba al bucle: el umbral se llama `MIN_MS_VISIBLES_PARA_LA_LECTURA` (8.000, el valor de
FR-56 y AD-13); el tiempo cuenta desde la activación del fichero (peca por defecto); `__medir`
descarta `lectura`; la descarga «con destino» se juzga con el destino cotejado; la caché de atrás
y adelante se prueba con un Chromium propio y una respuesta sin `no-store`, y se salta con su
motivo si el navegador no restaura. Un prototipo del fichero midió unos 1.970 bytes con el punto
final de producción: el tope de 1.320 se sube en el diff de la historia.
