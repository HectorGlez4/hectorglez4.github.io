---
title: 'Historia 27.5 — Los resultados llegan de 30 en 30'
type: 'feature'
created: '2026-10-29'
status: 'done'
baseline_revision: '41962e767018af4b0ed7e3d0ed5746f7fe18030d'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-27-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** La isla de `/buscar/` pinta los 30 primeros resultados y corta ahí (`respuesta.results.slice(0, 30)` en `src/components/Busqueda.astro`, literal y sin aviso): quien busca a José Martí ve 30 de 222 y no puede llegar al resto (FR-7, UX-DR112).

**Approach:** Tras la primera tanda, un botón secundario «Mostrar 30 más» bajo la lista pide la siguiente del **mismo** `results` de Pagefind, la añade, lleva el foco al primer resultado nuevo y no toca el Recuento; la tanda (`TANDA_DE_RESULTADOS = 30`, en `src/lib/umbrales.ts`) y los rótulos salen de un solo dueño; un fallo se dice en una región `role="status"` propia del botón y pulsar otra vez reintenta de verdad.

## Boundaries & Constraints

**Always:**
- La tanda es `TANDA_DE_RESULTADOS` (30), con docblock en `src/lib/umbrales.ts` junto a las pausas (AD-9). Ningún `30` literal de tanda queda en la isla; la primera tanda es `results.slice(0, TANDA_DE_RESULTADOS)`.
- Rótulo, puro, en `src/lib/busqueda.ts` (`rotuloDeMostrarMas(quedan)`): `quedan ≥ TANDA` → «Mostrar {TANDA} más» (con exactamente 30, también); de 2 a TANDA−1 → «Mostrar las {n} que faltan»; 1 → «Mostrar la que falta»; 0 o menos → `null` (no hay botón). La frase del fallo, constante exportada del mismo módulo: «No se han podido cargar más resultados.». La isla no escribe ninguna de las dos.
- Marcado en la `<template>` de `Busqueda.astro`, fuera del `form`: un bloque `<div class="mas" data-mas>` con `<button type="button" data-mostrar-mas>` (vacío; el guion pone su `textContent`) y `<p class="fallo-de-la-tanda" role="status" data-fallo-de-la-tanda></p>` (vacía, sin `hidden`). La isla lo separa del clon al iniciar (como el `.selector` de Obra) y lo inserta **detrás de la lista** (`lista.after(bloque)`) solo cuando quedan resultados; la región se inserta vacía con el botón. Así el botón queda fuera de la `ul` con `data-zona="resultado"` (no es salida interna, no asienta) y va después de los resultados en el orden de tabulación.
- Estilos en el `<style>` del componente, solo con tokens: el botón con el mismo tratamiento que `.quitar` (secundario siena con filete, a su ancho, `min-height: var(--zona-de-toque)`, transición ≤ 150 ms, sin `nowrap`); el bloque a `calc(var(--unidad) * 3)` bajo la lista; la región en la sans a `var(--pie)` y `var(--tinta)`, a `calc(var(--unidad) * 2)` bajo el botón cuando dice algo (`:empty` sin margen).
- Cada búsqueda pintada (y todo lo que vacía la lista: búsqueda vacía, `sinDatos`, cero resultados) quita el bloque, vacía su región y olvida la tanda en curso; `pintar` lo reinserta con el rótulo de lo que queda (`results.length − pintados`) si queda algo.
- Pulsar: si ya hay una tanda en vuelo, no hace nada (sin `disabled`). Si no, pide `data()` de `results.slice(pintados, pintados + TANDA)` con `Promise.all` (todo o nada). Al llegar, solo si su búsqueda sigue siendo la que se ve (`turno` sin cambiar): añade las filas con **la misma función** que pinta las de la primera tanda (extraer `filaDeResultado(dato)` de `pintar`), vacía la región del botón, enfoca el `<a>` de la primera fila nueva, y luego actualiza el rótulo o quita el bloque si ya no queda nada. Ni el Recuento, ni la sombra, ni `ritmo`, ni la dirección, ni el historial, ni `__medir` cambian.
- Fallo de la tanda: no se pinta nada de ella, el foco no se mueve (se queda en el botón), la frase se escribe en la región del botón con `anunciar` (vaciar y escribir en el fotograma siguiente; la escritura diferida solo cae si el bloque sigue siendo el de esa búsqueda), y si la búsqueda sigue siendo la que se ve se llama `destroy()` de Pagefind, como en el fallo de la 23.8. La pulsación siguiente reintenta **de verdad**: Pagefind guarda en su instancia la promesa rechazada de cada fragmento (`loaded_fragments`), así que reintentar es `cargar()`, `options(OPCIONES_DE_PAGEFIND)` y el mismo `search` con los mismos argumentos de la búsqueda que se ve (texto, `filters`, `sort`), y tomar del `results` nuevo `slice(pintados, pintados + TANDA)`; ese `results` pasa a ser el de las tandas siguientes. Todo en `try`, sin promesas rechazadas sin manejar.
- Lo tecleado y las frases van por `textContent`; nada se pinta como HTML.

**Block If:**
- Cumplir el contrato exige tocar `src/lib/ingreso.ts`, `MAX_BYTES_DE_GUION`, `MAX_BYTES_GUION_DE_PAGEFIND` o cualquier fichero de `_bmad-output/planning-artifacts/` o `_bmad-output/specs/` → HALT `blocked`.
- El Corpus de la rama no tiene ningún Autor con más de 60 Citas y resto (`n % 30`) de al menos 2 para las pruebas de Playwright → HALT `blocked` (hoy hay varios: 308, 259, 222…).

**Never:**
- Desplazamiento infinito, `IntersectionObserver` o cualquier disparo por desplazamiento; un enlace o un cambio de dirección para la tanda; `disabled` o `aria-disabled` en el botón.
- Volver a pedir `search` en una tanda que no falló antes; repintar la lista entera al añadir; reanunciar o reescribir el Recuento.
- Meter el botón o su región dentro de `[data-resultados]` o de `.salida`; ponerlos en el HTML inicial fuera de la `<template>`.
- Tocar la salida sin resultados (es de la 27.6) o el aviso sin guion (27.7).

## I/O & Edge-Case Matrix

| Escenario | Estado / entrada | Comportamiento esperado |
|----------|------------------|-------------------------|
| Una tanda | total ≤ 30 (incluido 30 y 0) | Sin bloque en el DOM, nunca. |
| Muchas | Autor, 222 | 30 filas; bloque tras la lista con «Mostrar 30 más» y región vacía. |
| Segunda tanda | pulsar con 222 | 60 filas en el orden de `results` (30–59), foco en el `<a>` de la fila 31, Recuento y sombra sin escrituras, ningún `search` nuevo, rótulo «Mostrar 30 más». |
| Última nombrada | 42 → pulsar | 12 restantes: «Mostrar las 12 que faltan»; al pulsar, 42 filas, foco en la 31 y el bloque desaparece. 31 → «Mostrar la que falta». 90 → tras la primera pulsación quedan 30: «Mostrar 30 más». |
| Doble pulsación | dos clics con la tanda en vuelo | Un solo lote de `data()`; 60 filas, no 90. |
| Fallo | `data()` de la tanda rechaza | Nada nuevo pintado; región del botón: «No se han podido cargar más resultados.» al fotograma siguiente; foco sin mover; Recuento intacto; `destroy()` llamado. |
| Reintento | pulsar tras el fallo, ya sin fallo | `options` + mismo `search` + `data()` de 30–59; región vaciada; foco en la fila 31; Recuento sin escrituras. |
| Tanda obsoleta | teclear, elegir un filtro, «Quitar los filtros» o `popstate` con la tanda en vuelo | Al llegar, la tanda no se pinta; lo visible es del último estado (con su propio bloque o sin él). |
| Con texto | `search(texto)` por relevancia | Las tandas siguen el orden del mismo `results`; ninguna repite ni salta. |
| Medición | pulsar «Mostrar 30 más» | Ni `__medir`, ni marca, ni escritura del historial. |

</intent-contract>

## Code Map

- `src/components/Busqueda.astro` -- la isla. Docblock 1-201 (añadir la 27.5: tandas, rótulo, foco, fallo y reintento; corregir lo que diga «30»); `<template>` 207-254 (el bloque va tras `.sombra`, fuera del `form`); `<style>` 257-353 (`.quitar` 309-336 es el modelo del botón); `iniciar` 427-: clon y separación (437-455, como `cajaDeObra.remove()`); estado del cierre 456-500 (`turno` 461 es la guarda de obsolescencia); `cargar` 524; `pintar` 613-669 (extraer `filaDeResultado` de 646-668; meter aquí la reinserción del bloque); `buscar` 683-756 (`slice(0, 30)` en 730 → `TANDA_DE_RESULTADOS`; guardar `respuesta.results` y una función que repite el `search` con sus argumentos; el camino vacío al principio de `buscar`); `sinDatos` 993; `llegar` 1012; escuchas 820-975.
- `src/pages/buscar.astro` -- región del Recuento (63-65), `ul[data-resultados][data-zona="resultado"]` (73), `.salida` (82-); docblock de cabecera 1-18 (mencionar las tandas). No cambia el marcado.
- `src/lib/busqueda.ts` -- puras de la búsqueda (frases, filtros, dirección); importa `recuentos.ts`, `tipoDeResultado.ts`, `vocabulario.ts`. Añadir `rotuloDeMostrarMas` y `FALLO_DE_LA_TANDA` importando `TANDA_DE_RESULTADOS` de `./umbrales.ts` (ya en el grafo fijado de la isla: `busqueda-con-filtros.test.ts:114`).
- `src/lib/umbrales.ts` -- `MAX_BYTES_GUION_DE_LA_BUSQUEDA` 549-587 (16.051; regla «medido + ~400», con cifras y fecha); `PAUSA_DE_TECLEO_MS` 598, `PAUSA_DE_LOS_SELECTORES_MS` 610: `TANDA_DE_RESULTADOS` va junto a ellas. `MAX_BYTES_GUION_DEL_FILTRO` 545: solo cambia si cambia el trozo compartido.
- `src/lib/anuncio.ts:22` -- `anunciar(region, texto)`, el primer ritmo.
- `dist/pagefind/pagefind.js` (`loadFragment`) -- prueba de que Pagefind cachea el fragmento rechazado: por eso el reintento rehace `search` tras `destroy()`.
- `tests/unit/ayuda/busqueda.ts` -- entorno simulado. Hoy: `lista` sin padre (387; `after` lanza, 203); solo el campo enfoca (164, 451, 815); el clon conoce una lista cerrada de selectores (418-426) y `document.querySelector` otra (437); `data()` falla solo con `falla: 'data'` en `i === 0` (593); `Respuesta.pintados` recorta `slice` (77-81, 589-602).
- `tests/unit/medicion.test.ts` -- harness `isla()` 3570 con `RESPUESTAS`/`CON_FILTROS` 3524-3557 (José Martí `{ total: 222, pintados: 30 }`: el recorte impediría la segunda tanda; las pruebas de la 27.5 usan respuestas propias o se quita ese `pintados`); describes 27.2 4319, 27.3 4717, 27.4 5023: el de la 27.5 va detrás. Tope del guion vigilado aquí.
- `tests/unit/busqueda-con-filtros.test.ts` -- puras (describes 85-500) y «lo construido» 648- (la plantilla de `/buscar/`).
- `tests/unit/espinas-de-ux.test.ts:312-318` -- «`/buscar/` anuncia por una región…» exige **una sola** `role="status"` en la página: pasa a ser la del Recuento fuera de la `<template>` más la del botón dentro de ella, las dos vacías y sin `hidden`.
- `tests/e2e/busqueda.spec.ts` -- helpers `resultados()` 40, `conjunto()`/`filtrosDeLaBusqueda` (describe 27.2, 1066-); patrón `import('/pagefind/pagefind.js')` en `page.evaluate` (406, 485…); describe 27.4 1587-.
- `tests/e2e/accesibilidad.spec.ts` -- `CONDICIONES`, `cargarEn320`, `anchoDeLaPagina`, `contenedoresQueRecortan` (783-890); el describe de la 27.3 (2240-2312) es el modelo: reflujo + `nowrap` + axe por condición.
- `tests/e2e/busqueda-historial.spec.ts:136-137` -- `const TANDA = 30` local: importar `TANDA_DE_RESULTADOS`.

## Tasks & Acceptance

**Execution:**
- `src/lib/umbrales.ts` -- añadir `TANDA_DE_RESULTADOS = 30` con docblock (AD-9, FR-7, UX-DR90, Historia 27.5) tras `PAUSA_DE_LOS_SELECTORES_MS`; al final, rederivar `MAX_BYTES_GUION_DE_LA_BUSQUEDA` (y `MAX_BYTES_GUION_DEL_FILTRO` solo si el trozo cambia) con la medida de `npm run build`, cifras y fecha, marcando que el tope anterior ya no rige -- un solo dueño de la tanda.
- `src/lib/busqueda.ts` -- `rotuloDeMostrarMas(quedan: number): string | null` y `FALLO_DE_LA_TANDA`, con docblock -- puro y probado sin DOM (AD-5).
- `src/components/Busqueda.astro` -- bloque en la plantilla y estilos; en la isla: separar el bloque del clon; `filaDeResultado`; `pintar` y los caminos que vacían la lista gestionan el bloque; `buscar` guarda `results` y el `search` repetible de la búsqueda que se pinta; escucha `click` del botón con la guarda de vuelo, la de `turno`, el foco, el fallo con `anunciar` y `destroy()`, y el reintento; docblock al día -- FR-7, UX-DR89, UX-DR90, UX-DR99-UX-DR101, UX-DR112.
- `src/pages/buscar.astro` -- solo el docblock: los resultados llegan en tandas con «Mostrar 30 más».
- `tests/unit/ayuda/busqueda.ts` -- `lista` con padre (una columna) para que `after` funcione; el bloque, el botón y su región en el clon (`[data-mas]`, `[data-mostrar-mas]`, `[data-fallo-de-la-tanda]`); `focus` en los `<a>` creados y en el botón, y `foco()` que diga `campo`, `mas`, `resultado:{i}` o `null`; `pulsarMas()` (enfoca el botón y despacha `click`); accesores `mas()` (`{ enElDom, detrasDeLaLista, rotulo, fallo }`) y un contador de escrituras de la región y de la sombra del Recuento; `falla: 'tanda'` (rechaza `data()` de `i ≥ TANDA_DE_RESULTADOS`) cambiable con `fallar`; `tandaManual` con `responderALaTanda()`; docblock al día -- el entorno no sabe hoy ni insertar tras la lista ni enfocar un resultado.
- `tests/unit/medicion.test.ts` -- describe «Historia 27.5 — los resultados llegan de 30 en 30» con la matriz entera sobre el guion de `dist/` (una prueba por fila; las respuestas por total con `datos` que numeran URL y título); quitar el `pintados: 30` de José Martí si estorba; comprobar que el tope del guion sigue vigilado.
- `tests/unit/busqueda-con-filtros.test.ts` -- puras: los rótulos para 0, 1, 2, 12, 29, 30, 31 y 222 (este último con la cifra de `TANDA_DE_RESULTADOS`) y la frase del fallo; construida: en la `<template>` de `dist/buscar/index.html`, fuera del `form`, el bloque con `button type="button"` vacío y la región `role="status"` vacía y sin `hidden`, y ningún `<a>` en él; el script de `Busqueda.astro`, sin comentarios, no lleva un `30` literal.
- `tests/unit/espinas-de-ux.test.ts` -- ajustar «`/buscar/` anuncia por una región…»: la del Recuento, fuera de la plantilla, y la del botón, dentro; ninguna con `hidden`; ninguna más.
- `tests/e2e/busqueda.spec.ts` -- describe «Historia 27.5» sobre el índice real, con el Autor elegido del Corpus por `filtrosDeLaBusqueda` (el de menos Citas por encima de 60 con resto ≥ 2; desempate por slug): rótulo y bloque tras la lista; desplazarse al fondo no pide nada y la dirección y `history.length` no cambian al pulsar; segunda tanda con el foco en el primer resultado nuevo y el Recuento sin mutaciones (`MutationObserver` sobre `[data-estado]`); pulsar hasta el final con «Mostrar las {n} que faltan» y el bloque que desaparece, sin repetidos y con el orden y el conjunto de `pf.search` con los mismos argumentos (también con un texto que dé más de 30); Tab desde el último resultado llega al botón; doble pulsación con los fragmentos retrasados (`page.route('**/pagefind/fragment/**')`) da 60; fallo con los fragmentos abortados: frase bajo el botón en su región, foco en el botón, Recuento igual; reintento sin la ruta: región vacía, foco en el primer nuevo, Recuento igual; cambiar el filtro con una tanda retrasada en vuelo y comprobar que no se pinta.
- `tests/e2e/accesibilidad.spec.ts` -- describe «Historia 27.5» con `cargarEn320` en las tres condiciones y tres estados («Mostrar 30 más», «Mostrar las {n} que faltan», la frase del fallo a la vista): sin desbordar, sin contenedores que recorten, sin `nowrap` en el bloque, y axe 2.2 AA (sin violaciones ni dudas) en cada uno; y un barrido a la anchura del proyecto con el botón puesto.
- `tests/e2e/busqueda-historial.spec.ts` -- `TANDA` sale de `TANDA_DE_RESULTADOS`.
- `_bmad-output/implementation-artifacts/spec-27-5-los-resultados-llegan-de-30-en-30.md` -- Auto Run Result con cifras y fechas.

**Acceptance Criteria:**
- Given el sitio construido, when se elige un Autor con más de 30 Citas en `/buscar/`, then se ven 30 resultados y, detrás de la lista y fuera de ella, un `button` «Mostrar 30 más» a su ancho en siena, con su región de estado vacía debajo; con 30 o menos resultados el botón no existe.
- Given «Mostrar 30 más» en el navegador, when se pulsa, then llegan los 30 siguientes en el orden de la primera tanda, el foco está en el primer resultado nuevo, el Recuento no muta y la dirección y `history.length` no cambian.
- Given la última tanda incompleta, when se pinta el botón, then dice «Mostrar las {n} que faltan» (o «Mostrar la que falta»), y tras pulsarlo el botón y su región ya no están en el DOM.
- Given los fragmentos de Pagefind abortados, when se pulsa, then «No se han podido cargar más resultados.» aparece bajo el botón en su región, el foco sigue en el botón y el Recuento no cambia; when se pulsa otra vez con la red de vuelta, then la región se vacía y llega la tanda con el foco en su primer resultado.
- Given la rama implementada, when corren uno a uno `npx vitest run` de `busqueda-con-filtros`, `medicion` (con `-t "27\.[2-5]|23\.8|isla"` mientras se itera), `espinas-de-ux`, `peso`, `filtros-de-busqueda` y `filtro-del-directorio`, then pasan; y `npm run check` da 0 errores.
- Given el sitio construido, when corren `tests/e2e/busqueda.spec.ts --project=escritorio`, `tests/e2e/busqueda.spec.ts -g "27.5" --project=movil`, `tests/e2e/accesibilidad.spec.ts -g "27\.[2-5]|buscar"`, `tests/e2e/busqueda-historial.spec.ts` y `tests/e2e/receptor.spec.ts -g "busca|23\.8"`, then pasan.
- Given la rama, when corre `npm test` entero con `correr.sh`, then verde.
- Given el diff contra `baseline_revision`, when se listan los ficheros, then ni `src/lib/ingreso.ts`, ni `MAX_BYTES_DE_GUION`, ni `MAX_BYTES_GUION_DE_PAGEFIND`, ni nada de `_bmad-output/planning-artifacts/` o `_bmad-output/specs/` cambia.

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

(Las capas de revisión son externas en el bucle v8-ralph y en esta pasada no traían hallazgos; la revisión independiente viene después.)

## Design Notes

**Por qué el reintento rehace la búsqueda.** `data()` de un resultado llama a `loadFragment`, que guarda la promesa en `loaded_fragments[hash]` antes de esperarla: si el fragmento falló, esa instancia lo seguirá dando por fallido. `destroy()` (ya usado en el fallo de la 23.8) tira la instancia; el módulo crea otra en la llamada siguiente. Los `results` viejos apuntan a la instancia muerta, así que el reintento repite el `search` y sigue con su `results`. Mismo índice y mismos argumentos dan el mismo orden: la tanda no salta ni repite.

**Por qué el bloque va en la plantilla y no en `buscar.astro`.** La v8.2 (EXPERIENCE.md § Búsqueda, UX-DR99) pide que la región del fallo «se inserte vacía con el botón». Como el selector de Obra, vive en la `<template>` (inerte, con sus estilos de ámbito) y el guion lo pone o lo quita. Detrás de la `ul`: queda fuera de la Zona `resultado` (no es una salida interna) y después de los resultados al tabular.

**Ejemplo** (Autor con 42 Citas):
```
pintar   → 30 filas · bloque «Mostrar las 12 que faltan» · región ""
pulsar   → data(30..41) → 42 filas · foco en fila 31 · bloque fuera
fallo    → 30 filas · región "" → (rAF) «No se han podido cargar más resultados.» · foco en el botón
reintento→ destroy (ya hecho) · options · search(null, mismos) · data(30..41) · región "" · foco en fila 31
```

## Verification

**Commands:**
- `npm run build` -- sale con 0; anotar el tamaño del guion de la búsqueda (fichero de entrada + trozo) para el tope.
- `npx vitest run tests/unit/busqueda-con-filtros.test.ts` y el resto de la lista del AC, uno por llamada (`medicion` con `correr.sh` si pasa de 8 min) -- verdes.
- `npm run check` -- 0 errores.
- Playwright de la lista del AC sobre lo construido (`tests/servidor.mjs`), por fichero y proyecto, con `correr.sh`/`esperar.pl` si pasan de 8 min -- verdes; puertos 4321, 4399, 4400, 4402, 4403 y 8787 libres al terminar.
- `npm test` entero con `correr.sh` -- verde.

## Auto Run Result

Status: done

Implementada el 2026-10-29 en la rama `v8/epica-27` sobre `41962e767018af4b0ed7e3d0ed5746f7fe18030d`.

**Qué cambió.** La isla de `/buscar/` deja de cortar en un `30` literal: pinta la primera tanda de `TANDA_DE_RESULTADOS` y, si quedan resultados del mismo `results`, pone detrás de la lista (fuera de ella y de su Zona `resultado`) el bloque de la plantilla `[data-mas]` con «Mostrar 30 más» / «Mostrar las {n} que faltan» / «Mostrar la que falta» (`rotuloDeMostrarMas`) y su región `role="status"` vacía. Pulsar pide los `data()` de la tanda siguiente con `Promise.all`, sin otro `search`; una pulsación con la tanda en vuelo no hace nada (sin `disabled`). La tanda solo se pinta si nada la dejó sin efecto (un gesto, una búsqueda lanzada o pintada ponen `tanda = 0`), con la misma función de fila que la primera (`fila`), el foco al enlace de la primera fila nueva y el rótulo al día o el bloque fuera. Ni recuento, ni sombra, ni dirección, ni historial, ni `__medir` cambian. Un fallo no pinta nada, deja el foco en el botón, escribe `FALLO_DE_LA_TANDA` con `anunciar` en la región del botón (solo si el bloque sigue siendo el de esa búsqueda) y, si la búsqueda sigue siendo la que se ve, destruye el índice; la pulsación siguiente espera esa destrucción, aplica las opciones y repite el `search` con los mismos argumentos (`repetir`), y su `results` pasa a ser el de las tandas siguientes. Las opciones de Pagefind se aplican en un solo sitio (`conOpciones`) para la búsqueda y el reintento: `tipo-de-resultado.test.ts` exige una sola llamada a `.options(`.

**Ficheros.**
- `src/lib/umbrales.ts` — `TANDA_DE_RESULTADOS = 30` con docblock junto a las pausas; `MAX_BYTES_GUION_DE_LA_BUSQUEDA` rederivado (16.051 ya no rige → 17.140).
- `src/lib/busqueda.ts` — `rotuloDeMostrarMas(quedan)` y `FALLO_DE_LA_TANDA`, puros; importa `TANDA_DE_RESULTADOS` (`umbrales.ts` ya estaba en el grafo fijado).
- `src/components/Busqueda.astro` — el bloque en la `<template>` (fuera del `form`), sus estilos con tokens (el botón con el tratamiento de `.quitar`), y en la isla: `fila`, `quitarMas`/`ponerMas`, `conOpciones`, la búsqueda repetible, la escucha del botón con guarda de vuelo, foco, fallo y reintento; docblock al día.
- `src/pages/buscar.astro` — solo el docblock.
- `tests/unit/ayuda/busqueda.ts` — columna de la página (`isConnected`, `after` tras la lista), el bloque en el clon, foco en el botón y en los enlaces, `foco()` con `mas` y `resultado:{i}`, `pulsarMas()`, `mas()`, `escrituras()`, `falla: 'tanda'`, `tandaManual` y `responderALaTanda()`.
- `tests/unit/medicion.test.ts` — describe «Historia 27.5» con la matriz entera (12 pruebas); José Martí sin el recorte `pintados: 30`; la prueba de regiones y anunciantes cuenta la región de la tanda.
- `tests/unit/busqueda-con-filtros.test.ts` — rótulos (0, 1, 2, 12, 29, 30, 31, 222, con la cifra de la constante) y la frase; lo construido: el bloque en la plantilla fuera del `form`, botón `type="button"` vacío, región vacía sin `hidden` ni enlaces; el guion sin un `30` literal; los selectores nuevos en el cruce de lo que busca el guion.
- `tests/unit/espinas-de-ux.test.ts` — dos regiones en `/buscar/`: la del recuento fuera de la plantilla y la del botón dentro.
- `tests/e2e/busqueda.spec.ts` — describe «Historia 27.5» (8 pruebas, índice real, fragmentos retrasados o cortados con `page.route`); la prueba de la 22.10 lee el recuento por `[data-estado]` (con 41 resultados hay dos regiones).
- `tests/e2e/accesibilidad.spec.ts` — describe «Historia 27.5»: tres estados × tres condiciones a 320 px y el barrido a la anchura del proyecto; el puntero se aparta antes del barrido para que axe no mida a medio camino de la transición de 150 ms.
- `tests/e2e/busqueda-historial.spec.ts` — `TANDA` sale de `TANDA_DE_RESULTADOS`.

**Tamaño del guion.** `npm run build` (2026-10-29): fichero de entrada 16.188 bytes + trozo compartido 552 = **16.740**; tope 17.140 (regla «medido + ~400»). El trozo no cambia, así que `MAX_BYTES_GUION_DEL_FILTRO` tampoco.

**Verificación.**
- `npm run build` — 0.
- `npx vitest run tests/unit/busqueda-con-filtros.test.ts` — 54/54; `espinas-de-ux` 14/14; `peso` 63/63; `filtros-de-busqueda` 15/15; `filtro-del-directorio` 22/22; `tipo-de-resultado` 11/11; `medicion -t "27\.[2-5]|23\.[18]|isla"` 252 pasadas (la 27.5 entera, la del tope del guion incluida).
- `npm run check` — 0 errores, 0 avisos.
- Playwright (con `correr.sh`, sobre `tests/servidor.mjs`): `busqueda.spec.ts --project=escritorio` 70 pasadas (4 omitidas de antes); `busqueda.spec.ts -g "27.5" --project=movil` 8/8; `accesibilidad.spec.ts -g "27\.[2-5]|buscar"` 26/26; `busqueda-historial.spec.ts` 3 pasadas (3 omitidas por diseño); `receptor.spec.ts -g "busca|23\.8"` 20 pasadas (20 omitidas). Puertos 4321, 4399, 4400, 4402, 4403 y 8787 libres al terminar.
- `npm test` entero — 150 ficheros, 6.944 pruebas, verde (882 s).
- Auditoría de la matriz: cada fila tiene su prueba en el describe 27.5 de `medicion.test.ts` (una tanda, muchas, segunda tanda, última nombrada, doble pulsación, fallo, reintento, tanda obsoleta, con texto, medición), y corrió en verde.
- El diff no toca `src/lib/ingreso.ts`, `MAX_BYTES_DE_GUION`, `MAX_BYTES_GUION_DE_PAGEFIND` ni nada de `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.

**Revisión.** Parches: 0; diferidos: 0; rechazados: 0. `followup_review_recommended: false` (0 parches; puntuación 0).

**Riesgos residuales.** La guarda de vigencia de la tanda es más estricta que «`turno` sin cambiar»: cualquier gesto (también uno que no cambia la búsqueda) deja sin efecto la tanda en vuelo, y hay que volver a pulsar; así el foco nunca salta a la lista mientras se teclea. El fallo de una tanda que se quedó obsoleta por una búsqueda lanzada y aún no pintada no destruye el índice: si esa búsqueda también falla, la tanda siguiente vuelve a fallar una vez antes de rehacer el `search`.

Planificada el 2026-10-29 sobre `41962e767018af4b0ed7e3d0ed5746f7fe18030d` (rama `v8/epica-27`, bucle v8-ralph) y detenida tras planificar, como pedía la invocación. Sin condición de bloqueo. Contexto: `epic-27-context.md` (válido) y la continuidad de la 27.4 (`done`).
