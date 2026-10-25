---
title: 'Historia 23.7 — Cada salida interna dice desde qué zona'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_revision: 'c7b4757cb613309d3245ed5bc4d6826c246f4e1d'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-23-context.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** el vocabulario (23.2) y el receptor desplegado (23.3) ya saben guardar `salida-interna` con su `zona`, pero nadie la emite (`PENDIENTES` de la 23.7 en `tests/unit/vocabulario.test.ts`) y ningún enlace del sitio declara zona: no hay forma de saber por qué enlace siguió quien leía cada superficie (FR-56, instrumento de SM-4 y SM-13).

**Approach:** una sola escucha delegada de `click` en el fichero que compone `guionDeMedicion` emite, como mucho una vez por carga y detrás de la lectura, una `salida-interna` con la zona del contenedor más cercano que la declara (`data-zona`); la zona la pinta el build —prop `zona` obligatoria y tipada en los seis componentes de enlace compartidos, y atributo en los contenedores de las páginas—, lo exento lleva `data-sin-zona` con un motivo de un conjunto cerrado, y una prueba sobre `dist/` exige zona o exención en todo enlace interno de `main` de una superficie con lectura.

## Boundaries & Constraints

**Always:**
- Salida = `click` en un `a[href]` (vía `target.closest`) con `button === 0`, sin `metaKey/ctrlKey/shiftKey/altKey`, sin `defaultPrevented`, sin `download`, sin `target` distinto de vacío o `_self`, con `a.origin === location.origin` y `a.pathname !== location.pathname` (anclas y la propia ruta, con o sin búsqueda, no son salida). Nunca `location.href`. La escucha es **una**, en `window`, en burbuja (sin captura) para ver el `defaultPrevented` de las islas; se instala en la activación (`a()`), no antes.
- Zona: la declaración más cercana, `closest('[data-zona],[data-sin-zona]')`. Si es exención, o no hay ninguna, o su valor no está en `ZONAS`, no sale nada **ni se gasta** la salida de la carga, ni se fuerza la lectura. Selector y nombres de atributo se componen de constantes de `src/lib/medicion.ts`; los valores de zona, de `ZONAS` (vocabulario), nunca escritos en el fichero.
- Si es salida: se marca gastada, se llama a la emisión de la lectura (`l()`: no hace nada si ya salió o la página no es superficie con lectura) y se emite `salida-interna` con `ruta = location.pathname` y `zona`; nada más (ni destino, ni marcas, ni `primera`). `salida-interna` entra en `EVENTOS_DEL_GUION` y en `EVENTOS_SOLO_DEL_FICHERO` (`__medir('salida-interna', …)` se descarta, directo o encolado, sin gastar nada); `zona` es fuente nueva en `FUENTE_EN_EL_GUION`. Una carga nueva (`n()`: activación y `pageshow` con `persisted`) vuelve a permitir una salida.
- Zona en el contenedor que pinta el build, como atributo `data-zona` **después** de los atributos que ya tiene, nunca en el `<a>`; lo que inserte el cliente la hereda. Las once de hoy: `cabecera` (`<header>` de `Armazon`), `atribucion` (los dos `<p>` de `Atribucion`; `<p class="de">` de la Cabecera de Obra), `chip-de-tema`, `colecciones`, `listado`, `paginacion`, `lista-de-obras`, `resultado` (`ul[data-resultados]` de `/buscar/`), `cita-del-dia` (`<p class="ir">` de «Ver esta cita», portada y 404), `rutas-de-salida` (`nav.salidas`; sus Chips de Tema llevan `chip-de-tema`; el chip de respaldo «Sobre {Autor}» hereda `rutas-de-salida`) y `autores-de-portada` (`ul.autores`).
- `zona: Zona` obligatoria (sin `?` ni valor por omisión) en las Props de `TarjetaDeCita` (en su `<li>`), `Chips` (`ul.chips`), `Paginacion` (`nav.paginacion`), `ListaDeObras` (`ul.lista-de-obras`), `RutasDeSalida` (`nav.salidas`) y `Atribucion`; `BloqueDeCita` le pasa `atribucion`. Exenciones de hoy, `EXENCIONES_DE_ZONA = ['chips-del-404', 'salidas-sin-resultados']` en `src/lib/medicion.ts`: `ul.chips` de Temas del 404 y `div[data-salida]` de `/buscar/`. Los formularios quedan fuera por construcción: la escucha solo mira enlaces.
- `MAX_BYTES_GUION_DE_MEDICION` sube a lo medido con el punto final de producción más unos 400 bytes, redondeado, con la medida y el porqué en su comentario (precedente 23.5, 23.6).

**Block If:**
- Cumplir algo exige cambiar `src/lib/vocabulario.ts` o `medicion/` (movería la huella y pediría otro `desplegar`), subir `MAX_BYTES_DE_GUION` o tocar `ARRANQUE_DE_MEDICION`.
- Un enlace interno de `main` de una superficie con lectura no cabe en ninguna de las once zonas ni de las dos exenciones: una zona o exención nueva la decide Héctor (UX-DR111).

**Never:**
- Colocar `tarjeta-de-obra`, `siguiente`, `misma-obra`, `directorio` u `obras-de-portada` (24, 26, 28); la exención de los Directorios del aviso de `/buscar/` (27.7); `busqueda` ni su asentado (23.8); `vista-de-obra` (23.9); que una isla emita la salida o lea zonas.
- Enviar el destino del enlace, el texto pulsado o cualquier cosa que encadene una carga con la siguiente (NFR-11); medir lo que se abre en pestaña nueva.
- Editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`; tocar `sprint-status.yaml`; correr `npm run medicion -- desplegar|comprobar`, `wrangler … --remote`, push o fusión.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Salida tras lectura | Cita (`data-vistas`), `pointerdown`, clic en `/cita/otra/` dentro de `listado` | vista, lectura, `salida-interna {evento, ruta:'/cita/una/', zona:'listado'}`, exactamente esas claves | — |
| Sin `pointerdown`/`keydown` | Cita sin interacción, `element.click()` | vista, lectura, salida, en ese orden | — |
| Una por carga | segundo clic válido en otra zona | nada más | — |
| No es salida | modificador; `button` 1 o 2; `defaultPrevented`; `target="_blank"`; `download`; `#ancla`; misma ruta con `?q=`; otro origen; `mailto:`; objetivo fuera de un enlace | nada, y un clic válido después sí sale | — |
| Sin zona válida | sin contenedor; `data-sin-zona` (también dentro de una zona); zona ajena (`data-zona="inventada"`) | nada, sin gastar ni forzar la lectura | — |
| Zona más concreta | `chip-de-tema` dentro de `rutas-de-salida` | `zona:'chip-de-tema'` | — |
| Sin lectura | página 2+, `/buscar/`, 404 (sin `data-vistas`) | solo la salida; nunca lectura | — |
| Caché de atrás y adelante | salida gastada, `pageshow` `persisted`, clic válido | otra salida; en superficie con lectura, precedida de la lectura nueva | — |
| Prerender | clic antes de `activar()` | nada; tras activar, normal | — |
| Isla que la pide | `__medir('salida-interna', …)` directo o encolado | descartado, sin gastar | — |
| Con marcas | `?de=instagram&via=whatsapp` | la salida no lleva `origen` ni `via` | — |
| Transporte roto | `sendBeacon` lanza | ninguna excepción sale de la escucha | `try` de `b` |

</intent-contract>

## Code Map

- `src/lib/medicion.ts:61-131` -- `EVENTOS_DEL_GUION`, `EVENTOS_SOLO_DEL_FICHERO` (su docblock ya anuncia la 23.7), `FUENTE_EN_EL_GUION` (0–4; `zona` sería 5), `camposQueEmite`/`CAMPOS_DEL_GUION` (los heredan `vocabulario.test.ts` y `receptor.spec.ts`).
- `src/lib/medicion.ts:208-404` -- docblock y `guionDeMedicion`: `b(v,t,z,y)` compone con `m=[D&&o,t,z,y,D&&w]` y la tabla `s` (el conjunto de `ZONAS` sale como variable `A…` vía `nombreDe`, reutilizable por la escucha); `l()` lectura; `n()` carga nueva (ahí se rearma la salida); `a()` instala escuchas (aquí la de `click`). Comentario de variables 344-364 al día.
- `src/lib/vocabulario.ts:98-121,266` -- solo lectura: `ZONAS` (16), `Zona`, `salida-interna: { zona: { valores: ZONAS, nulo: false } }`. No se toca (huella).
- `src/lib/umbrales.ts:198-234` -- `MAX_BYTES_GUION_DE_MEDICION = 2880`; hoy 2.548 bytes con `https://medicion-sabiduria-de-bolsillo.sabiduriadebolsillo.workers.dev`; lo nuevo (~600: conjunto de 16 zonas, tabla, escucha) no cabe. También lo juzgan `src/pages/medicion/[version].js.ts` y `src/lib/guiones.ts:69`.
- `src/components/{TarjetaDeCita,Chips,Paginacion,ListaDeObras,RutasDeSalida,Atribucion,BloqueDeCita}.astro` -- Props y contenedores (ver Always). Usos: `src/pages/{tema,autor,coleccion}/[slug]/[...page].astro`, `src/pages/obra/[autor]/[slug]/[...page].astro:131-157` (`<p class="de">`, Tarjeta, Paginacion, Chips), `src/pages/cita/[slug].astro:70-87`.
- `src/components/Armazon.astro:165-168` -- `<header class="cabecera contenedor">` (fuera de `main`); el salto «Saltar al contenido» es ancla.
- `src/pages/index.astro` -- «Ver esta cita» (`p.ir`), Temas y Colecciones (`ul.chips` en línea, no el componente), Autores (`ul.autores`); `BloqueDeCita`. `src/pages/404.astro` -- `p.ir`, `BloqueDeCita`, `ul.chips` exento, formulario.
- `src/pages/buscar.astro:108-144,213-264` -- la isla compone `li.resultado > a` y lo `append` a `ul[data-resultados]` (hereda `resultado`); `div[data-salida]` con Temas, Colecciones y Autores (exento).
- Enlaces externos, sin zona: `Fuente`, `DondeLeer`, `EdicionesEnVenta`, `AtribucionDeSemblanza`, `CompartirEnlace` (`target="_blank"`), `Sostener`; `public/islas/imagen.js:128-138` crea un `<a download>` en `body` y lo pulsa (lo excluye `download`).
- `tests/unit/ayuda/medicion.ts` -- entorno simulado sin DOM: hace falta `pulsar(enlace, gesto)` (ver Tasks); `escuchas('ventana')` ya apunta tipo/captura.
- `tests/unit/vocabulario.test.ts:226-249,258-283,301-366,370-387` -- `PENDIENTES` (entrada 23.7), `PRODUCIR_DEL_FICHERO`, `producir`, `escenariosDe`, «los ocho eventos de hoy».
- `tests/unit/medicion.test.ts:147-165` (descarte de `__medir`), `1337-1456` (`CORPUS_MEDIDO`, `sitioMedido`, `paginasDe`, `vistasDe`; sin Cita apta: hoy no hay Cita del Día), `ts` ya importado (para leer Props).
- `tests/unit/ingreso-construido.test.ts:918-937` -- parchea la Página de Tema buscando el literal `'<Paginacion pagina={pagina} />'`: cambia con la zona.
- `tests/unit/{obra-pagina,paginacion,coleccion-pagina,lista-de-obras}.test.ts` -- casan `<p class="de"[^>]*>`, `<li class="tarjeta"`, `<a href=… class="enlace-en-tinta"`: por eso la zona va en el contenedor y tras sus atributos.
- `tests/unit/redes.test.ts:38-57` -- prohíbe `location.href` y `document.referrer` en el fichero.
- `tests/e2e/receptor.spec.ts:40-235,663-950` -- sitio propio (Cita del Día fijada, tres Citas de Séneca, sin Tema publicado, Pagefind), `apuntarBalizas`/`balizasDe` (por documento), `llegadas`, la caché de atrás y adelante de verdad con `channel: 'chromium'`.
- `AGENTS.md:37` (convención de la medición) y «Known pitfalls»; `DESPLIEGUE.md:488-596` (§3: Lectura, Marcas, consultas a mano).

## Tasks & Acceptance

**Execution:**
- `src/lib/medicion.ts` -- `ATRIBUTO_DE_ZONA`, `ATRIBUTO_SIN_ZONA`, `EXENCIONES_DE_ZONA` y su tipo, documentados; `salida-interna` en las dos listas; fuente `zona`; en `guionDeMedicion`, la escucha según Always (gastada por carga, rearmada en `n()`); docblocks y comentario de variables al día -- FR-56, AD-13.
- `src/lib/umbrales.ts` -- medir y subir `MAX_BYTES_GUION_DE_MEDICION` con su comentario -- tope visible en el diff.
- `src/components/{TarjetaDeCita,Chips,Paginacion,ListaDeObras,RutasDeSalida,Atribucion}.astro` -- `zona: Zona` obligatoria y `data-zona={zona}` en su contenedor (RutasDeSalida pasa `chip-de-tema` a sus Chips de Tema y su propia zona al de «Sobre {Autor}») -- AC de los componentes compartidos.
- `src/components/{BloqueDeCita,Armazon}.astro`, `src/pages/{index,404,buscar}.astro`, `src/pages/cita/[slug].astro`, `src/pages/{tema,autor,coleccion}/[slug]/[...page].astro`, `src/pages/obra/[autor]/[slug]/[...page].astro` -- pasar la zona a cada componente y poner `data-zona`/`data-sin-zona` en los contenedores que nombra Always -- las once de hoy y las dos exenciones.
- `tests/unit/ayuda/medicion.ts` -- `pulsar(enlace, gesto)`: `enlace` `null` (objetivo fuera de un enlace) o `{ href, contenedores?: ({ zona } | { sinZona })[] (del más cercano al más lejano), target?, descarga? }`; un `a` falso resuelto con `URL` contra la dirección de ahora (`origin`, `pathname`, `target`, `getAttribute`, `hasAttribute`, `closest` para listas de selectores `etiqueta[atributo]`/`[atributo]`), y `click` despachado a ventana y documento con `button` (0), modificadores y `defaultPrevented` -- el entorno que pide la historia.
- `tests/unit/medicion.test.ts` -- `describe('Historia 23.7 — …')` con una prueba por fila de la matriz y una sola escucha de `click`, en la ventana, sin captura; `CORPUS_MEDIDO` marca una Cita `aptaParaPortada: true` (portada y 404 con Cita del Día; si eso mueve alguna afirmación existente, se ajusta diciendo por qué); sobre `sitioMedido()`: en toda página con vista en `data-vistas`, todo `<a href>` de `main` del mismo origen que no sea ancla de la propia página tiene zona de `ZONAS` o exención de `EXENCIONES_DE_ZONA` en sí o en un antepasado (las anclas, exención que nombra la prueba); en todo `dist/`, todo `data-zona` ∈ `ZONAS`, todo `data-sin-zona` ∈ `EXENCIONES_DE_ZONA`, las zonas presentes son exactamente las once (constante con nombre en la prueba, ⊂ `ZONAS`) y las exenciones, las dos, cada una en su sitio; la `<header>` de cada página lleva `cabecera`; `ul[data-resultados]` lleva `resultado`; y, con `ts`, las Props de los seis componentes declaran `zona: Zona` sin `?` -- Vitest, que corre el CI.
- `tests/unit/ayuda/enlaces.ts` -- tokenizador mínimo con pila de etiquetas (vacías, `<script>`/`<style>` y comentarios saltados, comillas con `>` dentro) que da por cada `<a>` su `href`, si está en `main` y la declaración más cercana; probado en `medicion.test.ts` con fragmentos escritos a mano (anidadas, exención dentro de zona, sin zona) para no pasar en vacío -- `parse5` no es dependencia declarada.
- `tests/unit/vocabulario.test.ts` -- quitar la entrada 23.7 de `PENDIENTES`; `PRODUCIR_DEL_FICHERO[salida-interna]` pulsa un enlace a otra ruta con la zona del escenario (por omisión `ZONAS[0]`); un escenario por cada zona de `ZONAS`, con `zona` esperada en todos; «nueve eventos de hoy» -- correspondencia de la 23.2.
- `tests/unit/ingreso-construido.test.ts` -- el literal de la Paginación, con su zona.
- `tests/e2e/receptor.spec.ts` -- `describe('Historia 23.7 — …')`: en la Cita, con la navegación del destino anulada (`page.route(…, r => r.fulfill({ status: 204 }))`, o `r.abort('aborted')`) para seguir en la carga: Control/Meta-clic, clic central y «Saltar al contenido» no emiten; luego un clic de ratón en «Más de Séneca» da vista, lectura y `salida-interna` `rutas-de-salida` (claves `evento, ruta, zona`), y un segundo clic, nada; en `/buscar/?q=…` pulsar un resultado llega con `zona: 'resultado'`, `ruta: '/buscar/'` y sin lectura; con la caché de atrás y adelante de verdad (patrón de la 23.5, salto si no restaura): en la Cita, salir, volver y salir otra vez da dos salidas, la segunda tras la lectura nueva; en `/buscar/`, resultado, atrás, otro resultado: dos salidas `resultado` -- Playwright local.
- `AGENTS.md` -- convención de la medición: la salida la emite solo el fichero, con qué reglas, y dónde van zona y exención; «Known pitfalls»: un enlace interno nuevo en `main` de una superficie con lectura necesita zona o exención, o la prueba de `dist/` falla.
- `DESPLIEGUE.md` -- §3: párrafo de la Salida interna (una por carga, tras la lectura, zona del contenedor, pestaña nueva sin medir: toda continuación es cota inferior; páginas 2+, `/buscar/` y 404 salen sin lectura y ahí no se calcula continuación) y dos consultas a mano desde la primera jornada UTC completa tras la llegada de la 23: salidas por zona frente a lecturas por superficie (SM-4) y salidas `resultado` de `/buscar/` (numerador de SM-13; el denominador llega con la 23.8).

**Acceptance Criteria:**
- Given la rama terminada, when corren `npx astro check` y por fichero `medicion`, `vocabulario`, `redes`, `huella`, `receptor`, `ingreso-construido`, `obra-pagina`, `paginacion`, `coleccion-pagina`, `lista-de-obras` y `superficies`, then 0 errores y todo en verde, con `git diff fe55077e241ba717e4a7cdedfd40ee573ad3abf2..HEAD -- src/lib/vocabulario.ts medicion/` vacío.
- Given una página que omite `zona` en cualquiera de los seis componentes, when corre `npx astro check`, then rompe (comprobado a mano y revertido).
- Given `npm test` en segundo plano, when termina, then todo en verde.
- Given `npx playwright test tests/e2e/receptor.spec.ts --project=escritorio`, when corre, then pasa; y `busqueda`, `pagina-de-cita`, `rutas-de-salida`, `portada`, `pagina-404`, `origen` y `receptor-local` siguen en verde con el `webServer`.
- Given el fichero con el punto final de producción, when se mide, then cabe en el tope nuevo, cuyo comentario dice la medida.

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

Las cinco capas de esta pasada son externas (`blind-hunter`, `edge-case-hunter`,
`verification-gap`, `intent-alignment`, `ac-auditor`) y la invocación no trajo hallazgos suyos: la
revisión independiente llega después.

## Design Notes

**Por qué no se envía una zona ajena.** «Un enlace que no figura en la tabla no pertenece a ninguna zona y no se registra» (EXPERIENCE.md § Zonas): una salida con `zona: null` sumaría continuación sin zona. La tabla de `b` seguiría poniendo a nulo un valor ajeno, pero la escucha no llega a pedirlo. Orientativo (nombres y compactación los fija el código):

```js
function k(x){var a=x.target&&x.target.closest&&x.target.closest("a[href]"),c,z;
if(S||!a||x.button||x.defaultPrevented||x.metaKey||x.ctrlKey||x.shiftKey||x.altKey||a.hasAttribute("download")||a.target&&a.target!="_self"||a.origin!=location.origin||a.pathname==location.pathname)return;
c=a.closest("[data-zona],[data-sin-zona]");z=c&&c.getAttribute("data-zona");
if(A3.indexOf(z)<0)return;S=1;l();b("salida-interna",0,0,0,z)}
// a(): addEventListener("click",k)      n(): …;S=0
```

**Ruta propia.** Se compara `pathname`: un enlace a `/buscar/?q=otra` desde `/buscar/` no sale de la página.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run tests/unit/medicion.test.ts`, y por fichero los del primer criterio -- expected: verde.
- `npm test` con `correr.sh` -- expected: verde.
- `npx playwright test tests/e2e/receptor.spec.ts --project=escritorio` y, con el `webServer`, los del cuarto criterio en `escritorio` -- expected: verde; puertos 4321, 4399, 4400, 4402 y 8787 libres al terminar.
- `npx tsx -e` que mida en bytes UTF-8 `guionDeMedicion('https://medicion-sabiduria-de-bolsillo.sabiduriadebolsillo.workers.dev')` -- expected: ≤ el tope nuevo.

**Manual checks (if no CLI):**
- `ARRANQUE_DE_MEDICION` y `MAX_BYTES_DE_GUION` sin cambios; ningún fichero de `corpus/` tocado.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Qué se hizo.** El fichero de medición pone, en la activación (`a()`), una sola escucha de `click`
en la ventana y en burbuja (`k`). Es salida un clic en el `a[href]` más cercano al objetivo con
`button` 0, sin `metaKey/ctrlKey/shiftKey/altKey`, sin `defaultPrevented`, sin `download`, con un
`target` vacío o `_self`, del mismo origen y a otro `pathname`. La zona es la declaración más
cercana (`closest('[data-zona],[data-sin-zona]')`, compuesto de `ATRIBUTO_DE_ZONA` y
`ATRIBUTO_SIN_ZONA`); si es exención —también si un mismo elemento lleva las dos—, si no hay o si su
valor no está en `ZONAS` (la variable de conjunto que ya compone la tabla), sale sin gastar nada.
Si es salida: `S=1`, `l()` (la lectura, si toca) y `b('salida-interna',0,0,0,z)`, con la zona como
fuente 5 (`m=[D&&o,t,z,y,D&&w,j]`). `n()` rearma `S`, así que la caché de atrás y adelante permite
otra. `salida-interna` entra en `EVENTOS_DEL_GUION` y en `EVENTOS_SOLO_DEL_FICHERO`. La zona la
pinta el build en el contenedor: prop `zona: Zona` obligatoria en los seis componentes y atributo en
los contenedores de las páginas; exenciones en el `ul.chips` del 404 y el `div[data-salida]` de
`/buscar/`.

**Ficheros.**
- `src/lib/medicion.ts` — `ATRIBUTO_DE_ZONA`, `ATRIBUTO_SIN_ZONA`, `EXENCIONES_DE_ZONA` y
  `ExencionDeZona`, documentados; `salida-interna` en las dos listas; fuente `zona: 5`; la escucha
  `k`, `S` en las variables y en `n()`; docblocks y comentario de variables al día.
- `src/lib/umbrales.ts` — `MAX_BYTES_GUION_DE_MEDICION` de 2.880 a 3.730: medido **3.330 bytes** con
  el punto final de producción (3.331 con barra final; 3.298 con el de las pruebas), +782 sobre la
  23.6, más unos 400 de margen; la medida y el porqué en su comentario.
- `src/components/{TarjetaDeCita,Chips,Paginacion,ListaDeObras,RutasDeSalida,Atribucion}.astro` —
  `zona: Zona` obligatoria (tipo del vocabulario) y `data-zona={zona}` tras los atributos de su
  contenedor (`li.tarjeta`, `ul.chips`, `nav.paginacion`, `ul.lista-de-obras`, `nav.salidas`, los dos
  `<p>` de la Atribución); `RutasDeSalida` pasa `chip-de-tema` a sus Chips de Tema y su propia zona
  al chip «Sobre {Autor}».
- `src/components/BloqueDeCita.astro` — pasa `atribucion` a la Atribución.
- `src/components/Armazon.astro` — `cabecera` en `header.cabecera` (el salto al contenido es ancla).
- `src/pages/index.astro` — `cita-del-dia` (`p.ir`), `chip-de-tema` y `colecciones` (`ul.chips`),
  `autores-de-portada` (`ul.autores`).
- `src/pages/404.astro` — `cita-del-dia` y la exención `chips-del-404`.
- `src/pages/buscar.astro` — `resultado` en `ul[data-resultados]` y la exención
  `salidas-sin-resultados` en `div[data-salida]`.
- `src/pages/cita/[slug].astro`, `src/pages/{tema,autor,coleccion}/[slug]/[...page].astro`,
  `src/pages/obra/[autor]/[slug]/[...page].astro` — la zona de cada componente; `atribucion` en
  `<p class="de">` de la Cabecera de Obra.
- `tests/unit/ayuda/medicion.ts` — `pulsar(enlace, gesto)`: `a` de mentira resuelto con `URL`, sus
  contenedores, `closest` para listas `etiqueta[atributo]`/`[atributo]` (otra forma lanza), y el
  `click` al documento y a la ventana con botón, modificadores y `defaultPrevented`.
- `tests/unit/ayuda/enlaces.ts` — tokenizador mínimo con pila (vacías, texto crudo, comentarios,
  comillas con `>`, entidades): `recorrerElementos`, `declaracionDe` y `enlacesDe`.
- `tests/unit/medicion.test.ts` — `describe('Historia 23.7 — cada salida interna dice desde qué
  zona')`, 39 pruebas, una o más por fila de la matriz, y la escucha única en burbuja;
  `describe('Historia 23.7 — toda salida interna de dist/ dice su zona')`: el tokenizador con un
  fragmento a mano, todo enlace interno de `main` de las páginas con vista con zona o exención, las
  once zonas exactas (`ZONAS_DE_HOY`, ⊂ `ZONAS`) y ninguna en un `<a>`, las dos exenciones en su
  sitio, `cabecera` en la cabecera de cada página y `resultado` en `ul[data-resultados]`, la Cita
  del Día de la portada y el 404 y las Props leídas con `ts`. `CORPUS_MEDIDO` marca apta para
  portada su primera Cita: ninguna afirmación existente se movió. La 23.5 pasa a esperar
  `[lectura, salida-interna]` como eventos solo del fichero y su detector de islas prohíbe también
  `EVENTOS.salidaInterna` y `__medir('salida-interna')`.
- `tests/unit/vocabulario.test.ts` — fuera la entrada 23.7 de `PENDIENTES`; `PRODUCIR_DEL_FICHERO`
  de la salida pulsa un enlace con la zona del escenario (por omisión `ZONAS[0]`); un escenario por
  zona; «nueve eventos de hoy».
- `tests/unit/ingreso-construido.test.ts` — el literal de la Paginación, con su zona.
- `tests/e2e/receptor.spec.ts` — `describe('Historia 23.7 — …')`: en la Cita, con las navegaciones
  fuera de la página anuladas con 204 (también las de una pestaña nueva), Control-clic, Meta-clic,
  clic central y el salto al contenido no salen; el clic en «Más de Séneca» da vista, lectura y la
  salida `rutas-de-salida` con `evento, ruta, zona`; un segundo clic, nada. En `/buscar/?q=viento`,
  un resultado llega con `resultado`, `ruta: '/buscar/'` y sin lectura. Con la caché de atrás y
  adelante de verdad, en la Cita (dos salidas, la segunda tras la lectura nueva) y en `/buscar/`
  (dos salidas `resultado`): las dos restauraron y pasaron.
- `AGENTS.md` — la convención de la salida interna y un «Known pitfall» del enlace nuevo sin zona.
- `DESPLIEGUE.md` — §3: el párrafo de la Salida interna y las consultas de SM-4 (salidas por zona y
  lecturas por superficie) y del numerador de SM-13 desde la primera jornada UTC completa.

**Revisión.** Capas externas sin hallazgos en esta pasada: 0 parches, 0 diferidos, 0 rechazados.
Seguimiento recomendado: `false` (parcheados: 0 altos, 0 medios, 0 bajos; puntuación 0).

**Verificación.**
- `npx astro check` — 0 errores, 0 avisos (20 sugerencias previas). A mano: quitar `zona` de
  `<Paginacion>` en el Tema dio 1 error; quitarla de `<TarjetaDeCita>` en el Autor y de
  `<RutasDeSalida>` en la Cita y escribir `chips-de-tema` en la Obra, 3; revertido, 0.
- `npx vitest run` de `medicion`, `vocabulario`, `redes`, `huella`, `receptor`,
  `ingreso-construido`, `obra-pagina`, `paginacion`, `coleccion-pagina`, `lista-de-obras` y
  `superficies` — 11 ficheros, 706 pruebas en verde.
- `npm test` (con `correr.sh`) — 131 ficheros, 5.768 pruebas en verde.
- `npx playwright test tests/e2e/receptor.spec.ts --project=escritorio` — 41 en verde, 1 saltada (la
  de prerender, como antes); las cuatro de la 23.7 pasan.
- Con el `webServer`, `busqueda`, `pagina-de-cita`, `rutas-de-salida`, `portada`, `pagina-404`,
  `origen` y `receptor-local` en `escritorio` — 77 en verde, 2 saltadas (las de antes). Puertos 4321,
  4399, 4400, 4402 y 8787 libres al terminar.
- `guionDeMedicion` medido con `npx tsx`: 3.330 bytes con
  `https://medicion-sabiduria-de-bolsillo.sabiduriadebolsillo.workers.dev` (≤ 3.730).
- `git diff fe55077e241ba717e4a7cdedfd40ee573ad3abf2 -- src/lib/vocabulario.ts medicion/` vacío;
  `ARRANQUE_DE_MEDICION` y `MAX_BYTES_DE_GUION` sin cambios; ningún fichero de `corpus/` tocado.

**Riesgos que quedan.**
- Las zonas de los contenedores propios de una página (portada, 404, `/buscar/`, la Cabecera de Obra
  y la cabecera) son atributos escritos, no props tipadas: una errata ahí no la ve `astro check`, la
  ve la prueba de `dist/` (que corre el CI).
- `target` se compara con `_self` tal cual; un `_SELF` en mayúsculas no se mediría (no hay ninguno).
- Chromium no despacha `click` con el botón central (es `auxclick`): el filtro de `button` es
  defensa, y la prueba de punta a punta lo confirma sin salida.
- Los enlaces internos fuera de `main` sin zona —el RSS del pie— no se miden, a propósito: la tabla
  de zonas no los nombra y la prueba de `dist/` solo exige zona dentro de `main`.
- Las consultas de SM-4 de `DESPLIEGUE.md` resuelven la superficie por el prefijo de la ruta y las
  páginas 2+ con `GLOB`, a mano, hasta que la 23.10 lo haga contra el censo.
