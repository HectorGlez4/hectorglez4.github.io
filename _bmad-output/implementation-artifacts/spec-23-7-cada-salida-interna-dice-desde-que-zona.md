---
title: 'Historia 23.7 — Cada salida interna dice desde qué zona'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_revision: 'ebc9088534cc9a5eae709c2d7e1a8007d7124756'
review_loop_iteration: 0
followup_review_recommended: true
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
- `tests/unit/medicion.test.ts` -- `describe('Historia 23.7 — …')` con una prueba por fila de la matriz y una sola escucha de `click`, en la ventana, sin captura; `CORPUS_MEDIDO` marca una Cita `aptaParaPortada: true` (portada y 404 con Cita del Día; si eso mueve alguna afirmación existente, se ajusta diciendo por qué); sobre `sitioMedido()`: en toda página que carga el fichero de medición —con lectura o sin ella—, todo `<a href>` de `main` del mismo origen que no sea ancla de la propia página tiene zona de `ZONAS` o exención de `EXENCIONES_DE_ZONA` en sí o en un antepasado (las anclas, exención que nombra la prueba), y entre las juzgadas sin lectura están cada página 2+, `/buscar/` y el 404 —nunca la página 1 de la Obra que no se indexa, que la 23.9 pasa a con lectura—; en todo `dist/`, todo `data-zona` ∈ `ZONAS`, todo `data-sin-zona` ∈ `EXENCIONES_DE_ZONA`, **están** las once de hoy (constante con nombre en la prueba, ⊂ `ZONAS`), sin exigir que sean las únicas, y las exenciones, las dos, cada una en su sitio; una tabla de colocación fija qué zona de las once, o qué exención, lleva cada sitio, comparando solo las declaraciones que no son zonas de épicas posteriores (`ZONAS` fuera de las once); la `<header>` de cada página lleva `cabecera`; `ul[data-resultados]` lleva `resultado`; y, con `ts`, las Props de los seis componentes declaran `zona: Zona` sin `?`. **Ninguna afirmación de esta prueba se rompe con lo que planean las historias siguientes**, cuyos criterios dicen que la prueba de la 23.7 «sigue pasando» o las cubre «sin tocarla»: la vista y la lectura de la Obra que no se indexa (23.9), la Tarjeta de Obra con `tarjeta-de-obra` hacia `/obra/…` en la Cita (24.4), las zonas de la 24, `directorio` (26.3) y `obras-de-portada` (28.3) -- Vitest, que corre el CI.
- `tests/unit/ayuda/enlaces.ts` -- tokenizador mínimo con pila de etiquetas (vacías, `<script>`/`<style>` y comentarios saltados, comillas con `>` dentro) que da por cada `<a>` su `href`, si está en `main` y la declaración más cercana; probado en `medicion.test.ts` con fragmentos escritos a mano (anidadas, exención dentro de zona, sin zona) para no pasar en vacío -- `parse5` no es dependencia declarada.
- `tests/unit/vocabulario.test.ts` -- quitar la entrada 23.7 de `PENDIENTES`; `PRODUCIR_DEL_FICHERO[salida-interna]` pulsa un enlace a otra ruta con la zona del escenario (por omisión `ZONAS[0]`); un escenario por cada zona de `ZONAS`, con `zona` esperada en todos; «nueve eventos de hoy» -- correspondencia de la 23.2.
- `tests/unit/ingreso-construido.test.ts` -- el literal de la Paginación, con su zona.
- `tests/e2e/receptor.spec.ts` -- `describe('Historia 23.7 — …')`: en la Cita, con la navegación del destino anulada (`page.route(…, r => r.fulfill({ status: 204 }))`, o `r.abort('aborted')`) para seguir en la carga: Control/Meta-clic, clic central y «Saltar al contenido» no emiten; luego un clic de ratón en «Más de Séneca» da vista, lectura y `salida-interna` `rutas-de-salida` (claves `evento, ruta, zona`), y un segundo clic, nada; en `/buscar/?q=…` pulsar un resultado llega con `zona: 'resultado'`, `ruta: '/buscar/'` y sin lectura; con la caché de atrás y adelante de verdad (patrón de la 23.5, salto si no restaura): en la Cita, salir, volver y salir otra vez da dos salidas, la segunda tras la lectura nueva; en `/buscar/`, resultado, atrás, otro resultado: dos salidas `resultado` -- Playwright local.
- `AGENTS.md` -- convención de la medición: la salida la emite solo el fichero, con qué reglas, y dónde van zona y exención; «Known pitfalls»: un enlace interno nuevo en `main` de una página que carga el fichero necesita zona o exención, o la prueba de `dist/` falla; una zona del vocabulario que la Épica 23 no coloca entra con su épica sin tocar la prueba.
- `DESPLIEGUE.md` -- §3: párrafo de la Salida interna (una por carga, tras la lectura, zona del contenedor, pestaña nueva sin medir: toda continuación es cota inferior; páginas 2+, `/buscar/` y 404 salen sin lectura y ahí no se calcula continuación) y dos consultas a mano desde la primera jornada UTC completa tras la llegada de la 23: salidas por zona frente a lecturas por superficie (SM-4) y salidas `resultado` de `/buscar/` (numerador de SM-13; el denominador llega con la 23.8).

**Acceptance Criteria:**
- Given la rama terminada, when corren `npx astro check` y por fichero `medicion`, `vocabulario`, `redes`, `huella`, `receptor`, `ingreso-construido`, `obra-pagina`, `paginacion`, `coleccion-pagina`, `lista-de-obras` y `superficies`, then 0 errores y todo en verde, con `git diff fe55077e241ba717e4a7cdedfd40ee573ad3abf2..HEAD -- src/lib/vocabulario.ts medicion/` vacío.
- Given una página que omite `zona` en cualquiera de los seis componentes, when corre `npx astro check`, then rompe (comprobado a mano y revertido).
- Given `npm test` en segundo plano, when termina, then todo en verde.
- Given `npx playwright test tests/e2e/receptor.spec.ts --project=escritorio`, when corre, then pasa; y `busqueda`, `pagina-de-cita`, `rutas-de-salida`, `portada`, `pagina-404`, `origen` y `receptor-local` siguen en verde con el `webServer`.
- Given el fichero con el punto final de producción, when se mide, then cabe en el tope nuevo, cuyo comentario dice la medida.

## Spec Change Log

### 2026-10-25 — Vuelta desde la revisión (review_loop_iteration 1)

- **Hallazgos que la disparan** (bad_spec, los dos medios): la prueba de `dist/` exige que las
  zonas presentes sean **exactamente** las once y que cada fila de `COLOCACION` lleve exactamente
  sus declaraciones, así que la 24.4 (`tarjeta-de-obra`, también hacia `/obra/…` en la Cita), la
  26.3 (`directorio`) y la 28.3 (`obras-de-portada`) la pondrían en rojo, cuando sus criterios
  dicen que «sigue pasando» o que las cubre «sin tocarla» (intent-alignment); y su suelo de
  páginas sin lectura cuenta la página 1 de la Obra que no se indexa, que la 23.9 pasa a con
  lectura, cuando la 23.7 dice que esa página entra en la prueba «sin tocarla» (ac-auditor).
- **Qué se enmienda**: en Tasks & Acceptance, la tarea de `tests/unit/medicion.test.ts` —toda
  página que carga el fichero; «están» las once y no «son exactamente»; la tabla de colocación
  compara solo lo que no es zona de una épica posterior; el suelo sin lectura nombra las páginas
  2+, `/buscar/` y el 404, nunca la Obra que no se indexa; y la condición general de que nada de
  la prueba se rompa con la 23.9, la 24, la 26 o la 28— y la de `AGENTS.md` (una zona que la
  Épica 23 no coloca entra con su épica sin tocar la prueba).
- **Estado malo que se evita**: una prueba de la 23.7 que una historia posterior del plan tenga
  que editar para seguir en verde, o que pase a rojo con un cambio que su criterio declara
  compatible.
- **KEEP** (lo commiteado en `ebc9088534cc9a5eae709c2d7e1a8007d7124756` que funciona y se
  conserva tal cual): la escucha `k` y su regla entera, `S` y su rearme en `n()`, la fuente 5 y
  `b(v,t,z,y,j)`; `ATRIBUTO_DE_ZONA`, `ATRIBUTO_SIN_ZONA`, `EXENCIONES_DE_ZONA` y sus docblocks;
  `MAX_BYTES_GUION_DE_MEDICION = 3730`; la prop `zona: Zona` de los seis componentes y cada zona y
  exención colocada; `pulsar` y sus formas; el tokenizador de `tests/unit/ayuda/enlaces.ts`; las
  pruebas de la matriz; el alcance de la prueba de `dist/` (toda página que pide el fichero), la
  constante `ZONAS_DE_HOY`, las 29 filas de `COLOCACION` (cambia solo cómo compara), la prueba de
  las exenciones, la de la cabecera y `resultado`, la de la Cita del Día y la de las Props; el
  `vocabulario.test.ts` de la 23.2; el e2e de la 23.7; el párrafo y las consultas de
  `DESPLIEGUE.md` §3; la convención de `AGENTS.md`.
- **Parches de la misma pasada, que sobreviven a la vuelta** y se aplican en la pasada siguiente
  del paso 4, no aquí:
  1. (medio) La consulta de SM-4 de `DESPLIEGUE.md`: separar las salidas de una ruta sin vista en
     su jornada —páginas 2+, `/buscar/`, el 404 en cualquier ruta, la Obra que no se indexa hasta
     la 23.9—, acotar `jornada < date('now')`, y una consulta que dé salidas, lecturas y
     continuación por superficie; el párrafo de §3, al día.
  2. Una fila con exención y zona en el mismo elemento (`pulsar` lo admite).
  3. El docblock del fichero: una isla que se quede con el clic de un enlace llama a
     `preventDefault` desde el enlace, el documento o un antepasado, nunca desde una escucha de
     `click` en la ventana puesta después.
  4. `vocabulario.test.ts`: los escenarios de zona, solo en los eventos que declaran `zona`.
  5. La detección de literales de zona en `src/lib/medicion.ts`, estrecha como la de las marcas.
  6. Filas de `COLOCACION`: `/coleccion/frases-cortas/2/` y la página 2 de la Obra (`listado`), la
     Paginación de `/autor/seneca/2/` hacia la 1, y la Obra de la Atribución del 404.
  7. Las ramas de respaldo de `RutasDeSalida` («Explorar por tema», `chip-de-tema`; «Sobre
     {Autor}», `rutas-de-salida`) en un `dist/` construido.
  8. `DESPLIEGUE.md`: los chips de respaldo cuentan como `chip-de-tema` y «Sobre {Autor}» como
     `rutas-de-salida`.
  9. `target`: sin distinguir mayúsculas y admitiendo `_self`, `_top` y `_parent` como misma
     pestaña; con sus filas.
  10. Los nombres cortos del fichero que se sombrean (`a` y `k`).
  11. «39 pruebas», rancio en el resultado.
  12. El e2e: la prueba de teclado afirma `ruta`, y una prueba nueva en el 404 servido en la ruta
      pedida.
  13. El tokenizador: un bloque cierra un `<p>` abierto y un `<a>` cierra otro `<a>`, como el
      navegador.
  14. `AGENTS.md`: sin contar «cinco» zonas pendientes.

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

### 2026-10-25 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 12 (high 0, medium 3, low 9)
- defer: 0
- reject: 20 (high 0, medium 0, low 20)
- addressed_findings:
  - `[medium]` `[patch]` La consulta de SM-4 de `DESPLIEGUE.md` decía que el 404 sale «por su propia ruta», y se sirve en la que se pidió: sus salidas caían en la familia de esa ruta o en una fila por errata (blind-hunter, edge-case-hunter, intent-alignment, ac-auditor). La consulta aparta ahora `cita-del-dia` fuera de la portada como «404», nombra `buscar` y manda el resto a «otra»; el comentario y el párrafo de §3 dicen qué salidas del 404 no se pueden apartar hasta la 23.10.
  - `[medium]` `[patch]` La prueba de `dist/` solo exigía zona en las páginas con `data-vistas`, y las páginas 2+, `/buscar/` y el 404 también emiten salida (blind-hunter, edge-case-hunter, intent-alignment). Ahora juzga toda página que pide el fichero de medición, cuenta las que salen sin lectura y comprueba que ninguna página con vista se quede sin fichero; el «Known pitfall» de `AGENTS.md` y el docblock de `ATRIBUTO_DE_ZONA` lo dicen.
  - `[medium]` `[patch]` Nada fijaba qué zona lleva cada sitio: una zona válida en el sitio equivocado —los Chips de Tema de la Cita con `rutas-de-salida`, la Paginación con `listado`, los chips de la portada cruzados— pasaba todo (verification-gap, ac-auditor). Nueva tabla `COLOCACION` en `tests/unit/medicion.test.ts`: 29 filas de página, enlace y declaraciones esperadas, con la Cita, la portada, el 404, `/buscar/`, los tres listados, sus páginas 2+ y las dos Obras. Comprobado a mano que rompe con `zona={zona}` en los Chips de `RutasDeSalida`.
  - `[low]` `[patch]` El ancla de la prueba de punta a punta era «Saltar al contenido», fuera de toda zona: no probaba la regla (ac-auditor, intent-alignment). Ahora la prueba mete en `.hermanas` un ancla `#contenido` y un enlace a la propia ruta con `?q=otra` (cuya navegación se anula con 204) y los pulsa dentro de `rutas-de-salida`.
  - `[low]` `[patch]` En macOS Control-clic es el menú contextual y Chromium da `auxclick` al botón central: dos de los gestos no llegaban como `click` (blind-hunter, ac-auditor). La prueba apunta cada `click` que llega a la ventana, pulsa de verdad con Meta y con Mayúsculas, despacha `click` con Control y con el botón 1 en el enlace, y exige los seis `click` con lo suyo. Comprobado a mano que rompe al quitar del fichero, juntos, los filtros de Control, del botón y de la propia ruta.
  - `[low]` `[patch]` Ninguna prueba activaba un enlace con el teclado (blind-hunter). Nueva prueba de punta a punta: Enter en una hermana da vista, lectura —por la tecla— y la salida `rutas-de-salida`.
  - `[low]` `[patch]` El envío de un formulario no tenía prueba propia (ac-auditor, intent-alignment). `pulsar` admite `{ envio: true, contenedores }` —el `click` en el botón de enviar de un `<form>`— y la tabla de «no es salida» lo prueba dentro de una zona.
  - `[low]` `[patch]` La prueba simulada del 404 usaba `ruta: '/404'`, que en producción no ocurre (blind-hunter, ac-auditor): ahora `/cita/una-retirada/`.
  - `[low]` `[patch]` `String.fromCodePoint` lanzaba con una entidad numérica fuera de Unicode y tumbaba la prueba de `dist/` (edge-case-hunter): `resolverEntidades` la deja tal cual, y el fragmento escrito a mano la lleva.
  - `[low]` `[patch]` Dos cotas sin decir (edge-case-hunter, blind-hunter): un clic anterior a que el fichero se active no se mide, y un clic cuya navegación no llega a ocurrir gasta la salida de la carga. Las dos, en el párrafo de la Salida interna de `DESPLIEGUE.md` §3.
  - `[low]` `[patch]` Las exenciones decían que una zona nueva «exigiría otra migración (AD-14)» sin citar la decisión, y la tabla de D1 no tiene `CHECK`: lo que exige es cambiar el vocabulario, su huella y otro despliegue del receptor (blind-hunter). Corregido en `EXENCIONES_DE_ZONA`, `404.astro` y `buscar.astro`, con la Historia 23.7 y la decisión de Héctor del 2026-10-19 (EXPERIENCE.md § Zonas) como fuente.
  - `[low]` `[patch]` Una isla que parara la propagación del clic sin `preventDefault` escondería la salida, y no constaba (blind-hunter). Ninguna lo hace (`stopPropagation` no aparece en `src/` ni en `public/`); el docblock del fichero lo dice.

Rechazados, con su porqué: exigir `isTrusted` (la historia nombra `element.click()` como camino que emite la lectura antes); el cierre de la pasada anterior sin revisión (esta es la revisión); los riesgos sin `deferred` y `sprint-status.yaml` sin tocar (los riesgos se escriben en el resultado, y el tablero lo lleva el bucle); la exención del 404 frente a los chips de la portada (las dos exenciones las nombra la historia); las zonas de página sin tipo (la prueba de `dist/` coteja cada valor con `ZONAS` y ahora fija su sitio); `atribucion` fija en `BloqueDeCita` (la tabla de EXPERIENCE.md da `atribucion` a toda Atribución, también la de la Cita del Día); la zona en cada `li.tarjeta` (la historia hace de `zona` prop obligatoria de `TarjetaDeCita`); numerador de SM-13 por carga frente a por búsqueda (pulsar un resultado termina la carga); el tokenizador frente al DOM (ningún `<p>` con zona contiene un bloque, y `noscript`/`template` solo harían la prueba más estricta); las tres listas de zonas colocadas (la prueba es la que obliga); `/kit` y `/lote` (no cargan el fichero); la barra final en `pathname` (toda ruta sale de sus constructores, con barra); la segunda línea base (`fe55077e` es el padre del commit que solo añade la spec); el DOM de mentira en CI (reparto de la propia historia); la prueba sobre el corpus de prueba y no el real (convención del proyecto; el `dist/` real se escaneó limpio en la revisión: 4.873 páginas, 39.976 enlaces); `astro check` por las Props (comprobado a mano dos veces); D1 sin ejercer (desplegar queda fuera de esta pasada); el chip «Sobre {Autor}» en `rutas-de-salida` (el PRD da a esa zona «las demás rutas de salida (FR-12)»); la zona ajena sin enviar (EXPERIENCE.md); el tope subido (lo pide la spec).

### 2026-10-25 — Review pass
- intent_gap: 0
- bad_spec: 2 (high 0, medium 2, low 0)
- patch: 14 (high 0, medium 1, low 13)
- defer: 0
- reject: 14 (high 0, medium 0, low 14)
- addressed_findings:
  - `[medium]` `[bad_spec]` La prueba de `dist/` exige que las zonas presentes sean **exactamente** las once de hoy, y `COLOCACION` exige igualdad exacta de las declaraciones de los enlaces que casan: en cuanto la 24.4 ponga la Tarjeta de Obra (`tarjeta-de-obra`, que enlaza a `/obra/…` en la Cita, donde la Atribución ya enlaza con `atribucion`), la 26.3 `directorio` o la 28.3 `obras-de-portada`, la prueba se pone en rojo, y esas historias dicen que la prueba de la 23.7 «sigue pasando» o las cubre «sin tocarla» (intent-alignment). La raíz es la tarea de la spec, «las zonas presentes son exactamente las once»: se enmienda Tasks (Spec Change Log) y se vuelve por el paso 3.
  - `[medium]` `[bad_spec]` El suelo de `sinLectura` cuenta la Obra que no se indexa (`PAGINAS_2.length + OBRAS.length - 1 + 2`, 7 hoy): cuando la 23.9 le dé vista, la cifra baja a 6 y la prueba falla, y la propia historia dice que esa página «entra en la prueba en cuanto la 23.9 le da vista, sin tocarla» (ac-auditor). La tarea de la spec no pedía que la prueba sobreviviera sin cambios a lo que planean la 23.9 y las Épicas 24, 26 y 28, y la revisión anterior metió esa cuenta: se enmienda con esa condición y se vuelve por el paso 3.

Los catorce parches de esta pasada **sobreviven a la vuelta** y se aplican en la pasada siguiente del
paso 4 (la lista, en el Spec Change Log): la consulta de SM-4 de `DESPLIEGUE.md` (medio: separa por
la vista de la ruta en la jornada las salidas sin lectura —páginas 2+, `/buscar/`, el 404 en
cualquier ruta y la Obra que no se indexa—, acota la jornada en curso y calcula la continuación;
blind-hunter, intent-alignment, ac-auditor) y trece bajos: la exención y la zona en el mismo
elemento, sin prueba (blind-hunter); la isla que se queda con el clic desde una escucha de ventana
posterior (blind-hunter, edge-case-hunter); los escenarios de zona de `vocabulario.test.ts` que no
prueban nada fuera de la salida (blind-hunter); la detección de literales de zona demasiado ancha
(blind-hunter); filas de `COLOCACION` que faltan (blind-hunter); las ramas de respaldo de
`RutasDeSalida` sin construir en ninguna prueba (verification-gap, ac-auditor, blind-hunter); los
chips de respaldo sin línea en `DESPLIEGUE.md` (blind-hunter); `target` comparado tal cual
(blind-hunter, edge-case-hunter); nombres cortos que se sombrean en el fichero compacto
(blind-hunter); «39 pruebas» rancio en el resultado (blind-hunter); la prueba de teclado sin
`ruta` y ningún 404 en un navegador de verdad (blind-hunter, ac-auditor); el tokenizador sin los
cierres implícitos de `<p>` y `<a>` (edge-case-hunter); y el «cinco zonas» de `AGENTS.md`, que se
queda rancio con la primera zona de la 24 (blind-hunter).

Rechazados, con su porqué: las zonas de página sin tipo y los nombres de atributo escritos a mano
(blind-hunter, ac-auditor: una errata de valor la coteja con `ZONAS` la prueba de `dist/`, que corre
el CI, y una de nombre deja el enlace sin declaración y la misma prueba lo nombra); nada que guarde
los enlaces de fuera de `main` (blind-hunter: la historia acota la regla a `main`); los enlaces de
un Modelo de Ingreso (blind-hunter: hoy solo añaden enlaces a otro origen —Ko-fi, las tiendas—, que
la escucha no cuenta); el peso del HTML y la zona en el párrafo sin enlace de la Atribución
(blind-hunter: el contrato pone `atribucion` en los dos `<p>`, son unos bytes por tarjeta y el paso
del peso del CI vigila `dist/`); `review_loop_iteration: 0`, la primera entrada del registro y
`done` junto a `followup_review_recommended: true` (blind-hunter: es como el flujo los lleva); lo
diferido solo en prosa y `sprint-status.yaml` sin tocar (blind-hunter: son historias planeadas
—23.8, 23.10, la pasada de métricas—, no trabajo diferido, y el tablero lo lleva el bucle); leer
`defaultPrevented` en un `setTimeout` (edge-case-hunter: la carga puede irse antes de que corra y
perder la salida; el orden de las escuchas se documenta); el alcance más ancho que la intención
(intent-alignment: es un superconjunto); el DOM simulado y el Playwright local (intent-alignment: el
reparto lo fija la historia); `astro check` sin prueba automática que rompa (intent-alignment,
ac-auditor: comprobado a mano tres veces, la última con siete errores por siete mutaciones); el
chip «Sobre {Autor}» en `rutas-de-salida` (intent-alignment: lo fija el contrato, con el PRD, que da
a esa zona «las demás rutas de salida (FR-12)»); D1 sin ejercer (intent-alignment: desplegar es del
cierre de la épica).

### 2026-10-25 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 14 (high 0, medium 1, low 13)
- defer: 0
- reject: 0
- addressed_findings:
  - `[medium]` `[patch]` La consulta de SM-4 de `DESPLIEGUE.md` mezclaba en la continuación salidas sin lectura —la Obra que no se indexa, el 404 en la ruta que se pidió— y contaba la jornada UTC en curso. Ahora `con_vista` separa las salidas de una ruta sin vista esa jornada (páginas 2+, `/buscar/`, el 404, la Obra que no se indexa hasta la 23.9), las tres consultas acotan `jornada < date('now')` y una segunda da salidas, lecturas y continuación por superficie solo con vista; el párrafo de §3 lo dice. Las tres se ejecutaron contra una tabla SQLite con la forma de la de D1.
  - `[low]` `[patch]` La exención y la zona en el mismo elemento no tenían prueba: `pulsar` admite contenedores con las dos y la tabla «sin zona válida» lleva esa fila; quitar `!c.hasAttribute(…)&&` del fichero la pone en rojo (comprobado y revertido).
  - `[low]` `[patch]` Una isla que se quedara con el clic desde una escucha de `click` en la ventana, puesta después, lo cancelaría con la salida ya emitida: lo dice el docblock del fichero y una prueba nueva exige que ninguna fuente de `src/` ni de `public/islas/` escuche `click` en la ventana (con su detector probado).
  - `[low]` `[patch]` Los escenarios de zona de `vocabulario.test.ts` corrían en los nueve eventos sin darle la zona a ninguno salvo la salida: ahora solo en los que declaran `zona`, y una prueba exige que la salida los recorra todos y ningún otro evento lleve ninguno.
  - `[low]` `[patch]` La detección de zonas escritas en `src/lib/medicion.ts` saltaba con cualquier literal que usara una palabra como `siguiente` o `resultado`: ahora busca, como la de las marcas, el literal que es la zona, la lleva entre comillas o la da como valor (`=listado`), con casos de los dos lados.
  - `[low]` `[patch]` `COLOCACION` gana seis filas: `listado` en `/coleccion/frases-cortas/2/` y en la página 2 de la Obra, la Paginación de `/autor/seneca/2/` y de la página 2 de la Obra hacia la 1, y la Obra de la Atribución del 404.
  - `[low]` `[patch]` Las ramas de respaldo de `RutasDeSalida` no se construían en ninguna prueba: un sitio aparte con una Cita sola de su Autor y sin Temas pinta «Sobre Séneca» (`atribucion` y `rutas-de-salida` hacia `/autor/seneca/`, en ese orden) y una sonda pinta «Explorar por tema» con `chip-de-tema`; escribir `zona="chip-de-tema"` en el chip de respaldo la pone en rojo (comprobado y revertido).
  - `[low]` `[patch]` `DESPLIEGUE.md` §3 dice que los chips de respaldo cuentan como `chip-de-tema` y «Sobre {Autor}» como `rutas-de-salida`.
  - `[low]` `[patch]` `target` se comparaba con `_self` tal cual: ahora sin distinguir mayúsculas, como lo lee el navegador (`/^_self$/i`), con filas `_SELF`, `_Self` y `_BLANK`. `_top` y `_parent` siguen sin medirse, porque el contrato admite solo vacío o `_self` y ningún enlace del sitio los usa. El fichero pasa de 3.330 a 3.339 bytes, dentro del tope, con la medida en su comentario.
  - `[low]` `[patch]` En el fichero compacto, el enlace de `k` se llamaba `a`, como la función que activa, y el parámetro del recorrido de `a` se llamaba `k`, como la escucha que se pone justo después: ahora `r` y `v`, y el comentario de variables lo dice.
  - `[low]` `[patch]` «39 pruebas» en el resultado: corregido al reescribirlo.
  - `[low]` `[patch]` La prueba de teclado de punta a punta afirma también la `ruta`, y una prueba nueva carga una Cita que no existe —el servidor contesta 404 en esa ruta—, pulsa «Ver esta cita» y recibe solo la salida, con esa ruta y `cita-del-dia`.
  - `[low]` `[patch]` El tokenizador de la prueba de `dist/` no cerraba lo que cierra el navegador: un bloque cierra el `<p>` abierto y un `<a>` cierra el `<a>` abierto, los dos hasta un límite de ámbito, con su fragmento probado; el `dist/` real (5.286 páginas que cargan el fichero, 49.589 enlaces internos de `main`) sigue sin ningún enlace sin declaración.
  - `[low]` `[patch]` `AGENTS.md` ya no cuenta «cinco» zonas pendientes: las de las Épicas 24, 26 y 28 entran sin tocar la prueba.

Es la pasada repetida tras la vuelta por el paso 3: las capas externas no traen hallazgos nuevos, y
los catorce parches son los de la pasada anterior, que sobreviven a la vuelta.

### 2026-10-25 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 17 (high 0, medium 1, low 16)
- defer: 0
- reject: 14 (high 0, medium 0, low 14)
- addressed_findings:
  - `[medium]` `[patch]` La consulta de la continuación de `DESPLIEGUE.md` §3 filtraba con un `EXISTS` correlacionado (`LIKE 'vista-%'`) que corre una vez por fila, y el índice es `(jornada, evento)`: las filas leídas, que cuenta la cuota de D1, crecían con el cuadrado de las de cada jornada (blind-hunter, edge-case-hunter). Ahora junta las vistas una vez por ruta y jornada (`SELECT DISTINCT … GLOB 'vista-*'`) y las une por `JOIN`, con la misma forma que la consulta por zona.
  - `[low]` `[patch]` El tokenizador decía cerrar «como hace el analizador del navegador» y no clonaba el `<a>` que un bloque deja dentro de un `<p>` cerrado, ni usaba para el `<a>` las marcas de formato (`button` no es una) (blind-hunter, edge-case-hunter). Deja de emular la recuperación del navegador: rechaza, lanzando con el motivo, el marcado que el navegador reordenaría, y su docblock lo dice.
  - `[low]` `[patch]` Tampoco veía los demás cierres implícitos —`<li>`, `<dd>`/`<dt>`, `<button>` dentro de otro, un elemento suelto en una tabla— (edge-case-hunter). Entran en el mismo rechazo, con un encabezado dentro de otro y un cierre que deja algo abierto dentro; el fragmento escrito a mano prueba cada caso y lo que sí pasa (un botón y una marca de formato como límites, una tabla bien formada, listas anidadas). El `dist/` real (5.288 páginas; 5.286 cargan el fichero) pasa sin un solo rechazo y con sus 49.589 enlaces internos de `main` declarados.
  - `[low]` `[patch]` `COLOCACION` no tenía `listado` en `/tema/el-tiempo/2/` ni la Paginación de `/coleccion/frases-cortas/2/` hacia la 1 (blind-hunter): las dos filas, añadidas (36 en total).
  - `[low]` `[patch]` La detección de zonas escritas en `src/lib/medicion.ts` ya no veía una lista (`'cabecera listado'`, `'cabecera,listado'`, `'(cabecera|listado)'`) (blind-hunter, edge-case-hunter): además de la zona sola, entre comillas o como valor, rechaza el literal que enumera dos o más zonas, con casos de los dos lados.
  - `[low]` `[patch]` Esa detección no leía los trozos de las plantillas con sustituciones, de los que se compone casi todo el fichero (edge-case-hunter): los lee, como la de las marcas de la 23.6, y la prueba exige que encuentre más de veinte.
  - `[low]` `[patch]` La prueba de las escuchas de ventana no veía `window?.addEventListener`, un espacio antes del paréntesis, `document.defaultView` ni `window.onclick =`, y el docblock decía que «lo vigila una prueba» sin matiz (blind-hunter, edge-case-hunter, intent-alignment). Los ve, con sus casos, y el docblock dice que mira el texto de las fuentes y qué formas ve, no un nombre de evento en una variable.
  - `[low]` `[patch]` Nada vigilaba `stopPropagation`, que el docblock dice que ninguna isla usa (ac-auditor): la misma prueba lo exige en `src/` y `public/islas/`.
  - `[low]` `[patch]` La consulta por zona perdió los apartados «404» y «paginas-2+»: las páginas 2+ se mezclaban con los 404 de su familia, y el «Ver esta cita» de un 404 en una ruta con vista ese día —una Cita retirada por el despliegue de la jornada— entraba en la continuación (blind-hunter, edge-case-hunter, intent-alignment). Vuelven los dos apartados, y la continuación deja fuera el del 404; las tres consultas se ejecutaron contra una tabla SQLite de `medicion/esquema.sql`.
  - `[low]` `[patch]` La unión por ruta y jornada UTC parte la carga que cruza la medianoche (blind-hunter, edge-case-hunter): el comentario de la consulta lo dice, con la ruta retirada a mitad de jornada, hasta la 23.10.
  - `[low]` `[patch]` Nada impedía un enlace interno con `target="_top"` o `"_parent"`, que la escucha no mide, ni un `<base>` (blind-hunter): la prueba de `dist/` los rechaza (comprobado: `target="_TOP"` en la Paginación la pone en rojo, revertido), y el tokenizador da el `target` de cada enlace.
  - `[low]` `[patch]` Las cifras del resultado no casaban con el diff: la pasada anterior añadió cinco filas, no seis, y dejó 34, no 35 (blind-hunter). Corregidas al reescribir el resultado.
  - `[low]` `[patch]` El comentario de `MAX_BYTES_GUION_DE_MEDICION` mezclaba la medida de antes y la de después (blind-hunter): 782 bytes sobre la 23.6 al subirlo, y 791 y 391 de margen tras la revisión.
  - `[low]` `[patch]` La prueba de punta a punta del 404 solo probaba la salida buena (blind-hunter): antes pulsa un chip con la exención `chips-del-404` —puesto en `main`, porque el sitio de la prueba no publica Temas— y comprueba que no sale nada ni se gasta la salida. La espera fija de 500 ms se queda: es como el fichero prueba que algo no llegó.
  - `[low]` `[patch]` El sitio de las ramas de respaldo no pasaba por la regla de zona o exención (blind-hunter): `juzgarEnlacesDeMain` la aplica a los dos sitios. La tercera construcción se queda: es el precio de construir las dos ramas.
  - `[low]` `[patch]` `AGENTS.md` dejaba la fila de `COLOCACION` como opcional, en una frase de 900 caracteres (blind-hunter): ahora un enlace nuevo **suma su fila**, y la entrada va en cuatro puntos.
  - `[low]` `[patch]` `DESPLIEGUE.md` afirmaba que con el corpus de hoy no se pinta ningún chip de respaldo, sin forma de comprobarlo (blind-hunter): fuera la afirmación.

Rechazados, con su porqué: el elemento con zona y exención a la vez en `dist/` (blind-hunter: `declaracionDe` ya da la exención, como el fichero, y el primer fragmento lo prueba con `/c/`); `esDeOtraEpica` demasiado ancho y la cláusula *Never* sin guarda permanente (blind-hunter, edge-case-hunter, intent-alignment: los criterios de la 24.3, la 24.4, la 26.3 y la 28.3 exigen que la prueba de la 23.7 siga pasando sin tocarla, y una exención por fila dependería de colocaciones que aún no se han diseñado; en esta pasada, ninguna de las cinco zonas aparece en `src/` ni en el `dist/` real); las consultas de SM-4 sin prueba y sus supuestos (blind-hunter, ac-auditor, intent-alignment: la lectura probada es la orden de la 23.10, cuyo criterio pide una prueba de Vitest con respuestas fijas y la superficie resuelta contra el censo; estas son las de a mano hasta entonces, y se ejecutaron en SQLite); medir `_top` y `_parent` (edge-case-hunter: el contrato admite solo vacío o `_self`); el punto 9 del Spec Change Log frente a lo aplicado (blind-hunter: la entrada que lo aplicó dice qué se aplicó y por qué); «las otras cinco» de `DESPLIEGUE.md` y del docblock de la prueba (blind-hunter: siguen siendo ciertas cuando llegue la 24; lo rancio era el «aún no se colocan» de `AGENTS.md`); `target` en mayúsculas solo en el entorno simulado (intent-alignment: el entorno da el atributo tal cual, como el navegador, y el reparto de la historia pone los filtros en Vitest); el alcance más ancho que la intención (intent-alignment: es un superconjunto); los enlaces de respaldo fuera de la tabla de EXPERIENCE.md y la sonda sin medición (intent-alignment: el contrato nombra las dos ramas, y la escucha lee el marcado que la sonda comprueba); las balizas de punta a punta en local (intent-alignment: reparto de la historia; D1 solo lo tocan la 23.3 y la 23.11); el corpus real fuera del CI (ac-auditor: la historia pide la prueba de Vitest sobre `dist/` y el proyecto la corre sobre su corpus de prueba; el real se escaneó en esta pasada sin un solo fallo); `astro check` sin prueba que lo rompa (ac-auditor: comprobado a mano, y el CI corre `astro check` y la prueba de las Props); y los dos puntos informativos del ac-auditor (el reparto entre entornos y la 27.7, que tocará la prueba por su propio criterio).

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
`target` vacío o `_self` (sin distinguir mayúsculas), del mismo origen y a otro `pathname`. La zona
es la declaración más cercana (`closest('[data-zona],[data-sin-zona]')`, compuesto de
`ATRIBUTO_DE_ZONA` y `ATRIBUTO_SIN_ZONA`); si es exención —también si un mismo elemento lleva las
dos—, si no hay o si su valor no está en `ZONAS` (la variable de conjunto que ya compone la tabla),
sale sin gastar nada. Si es salida: `S=1`, `l()` (la lectura, si toca) y
`b('salida-interna',0,0,0,z)`, con la zona como fuente 5 (`m=[D&&o,t,z,y,D&&w,j]`). `n()` rearma
`S`, así que la caché de atrás y adelante permite otra. `salida-interna` entra en
`EVENTOS_DEL_GUION` y en `EVENTOS_SOLO_DEL_FICHERO`. La zona la pinta el build en el contenedor:
prop `zona: Zona` obligatoria en los seis componentes y atributo en los contenedores de las
páginas; exenciones en el `ul.chips` del 404 y el `div[data-salida]` de `/buscar/`.

**Ficheros.**
- `src/lib/medicion.ts` — `ATRIBUTO_DE_ZONA`, `ATRIBUTO_SIN_ZONA`, `EXENCIONES_DE_ZONA` y
  `ExencionDeZona`, documentados; `salida-interna` en las dos listas; fuente `zona: 5`; la escucha
  `k` (con el enlace en `r` y `target` comparado con `/^_self$/i`), `S` en las variables y en
  `n()`; docblocks —también el orden de las escuchas de ventana y qué formas ve la prueba que lo
  vigila— y comentario de variables al día.
- `src/lib/umbrales.ts` — `MAX_BYTES_GUION_DE_MEDICION` de 2.880 a 3.730: medido **3.330 bytes** con
  el punto final de producción, y **3.339** tras la revisión (3.340 con barra final; 3.307 con el de
  las pruebas): 791 bytes sobre la 23.6 y 391 de margen; la medida y el porqué en su comentario.
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
  contenedores (zona, exención o las dos), `closest` para listas `etiqueta[atributo]`/`[atributo]`
  (otra forma lanza), el envío de un formulario, y el `click` al documento y a la ventana con botón,
  modificadores y `defaultPrevented`.
- `tests/unit/ayuda/enlaces.ts` — tokenizador mínimo con pila (vacías, texto crudo, comentarios,
  comillas con `>`, entidades) que **rechaza**, lanzando con el motivo, el marcado que el navegador
  reordenaría: un bloque que cerraría un `<p>`, un `<li>`, `<dd>` o `<dt>` sin cerrar, un `<button>`
  o un encabezado dentro de otro, un `<a>` dentro de otro sin marca de formato entre medias, un
  elemento suelto en una tabla y un cierre que deja algo abierto dentro: `recorrerElementos`,
  `declaracionDe` y `enlacesDe`, que da también el `target` de cada enlace.
- `tests/unit/medicion.test.ts` — `describe('Historia 23.7 — cada salida interna dice desde qué
  zona')`, 45 pruebas: una o más por fila de la matriz (con `target` en mayúsculas y la exención y la
  zona en el mismo elemento), la escucha única en burbuja, ninguna isla que escuche `click` en la
  ventana ni pare la propagación (con sus detectores probados) y ningún literal de zona en el
  fichero —tampoco en los trozos de plantilla ni enumerado en una lista—; `describe('Historia 23.7 —
  toda salida interna de dist/ dice su zona')`: el tokenizador con fragmentos a mano, también los
  que rechaza; todo enlace interno de `main` de toda página que carga el fichero con zona o
  exención, y ninguno con `target` `_top` o `_parent` ni la página con un `<base>`
  (`juzgarEnlacesDeMain`) —y entre las sin lectura, cada página 2+, `/buscar/` y el 404, nunca la
  Obra que no se indexa—; la tabla `COLOCACION` (36 filas, que no compara las zonas de épicas
  posteriores); las ramas de respaldo de `RutasDeSalida` en un sitio aparte, que pasa también por
  la regla de zona o exención; las once zonas presentes (`ZONAS_DE_HOY`, ⊂ `ZONAS`, sin exigir que sean las únicas) y
  ninguna en un `<a>`, las dos exenciones en su sitio, `cabecera` y `resultado`, la Cita del Día de la
  portada y el 404, y las Props leídas con `ts`. `CORPUS_MEDIDO` marca apta para portada su primera
  Cita. La 23.5 espera `[lectura, salida-interna]` como eventos solo del fichero y su detector de
  islas prohíbe también la salida.
- `tests/unit/vocabulario.test.ts` — fuera la entrada 23.7 de `PENDIENTES`; `PRODUCIR_DEL_FICHERO`
  de la salida pulsa un enlace con la zona del escenario (por omisión `ZONAS[0]`); un escenario por
  zona, solo en los eventos que declaran `zona`, con una prueba que lo exige; «nueve eventos de hoy».
- `tests/unit/ingreso-construido.test.ts` — el literal de la Paginación, con su zona.
- `tests/e2e/receptor.spec.ts` — `describe('Historia 23.7 — …')`, seis pruebas: en la Cita, con las
  navegaciones fuera de la página anuladas con 204, Meta y Mayúsculas de verdad, Control y el botón 1
  despachados, un ancla y la propia ruta con `?q=` dentro de `rutas-de-salida` no salen (con los seis
  `click` contados en la ventana); el clic en «Más de Séneca» da vista, lectura y la salida con
  `evento, ruta, zona`, y un segundo clic, nada; Enter en una hermana (con `ruta`); el 404 servido en
  la ruta pedida, donde un chip con la exención `chips-del-404`, dentro de una zona, no sale ni
  gasta, y «Ver esta cita» sale con esa ruta y sin vista ni lectura; un resultado de `/buscar/`; y la caché de atrás y adelante de verdad en la Cita y en `/buscar/`.
- `AGENTS.md` — la convención de la salida interna y un «Known pitfall» del enlace nuevo sin zona,
  en cuatro puntos: que el enlace nuevo suma su fila de `COLOCACION`, que las zonas de las Épicas
  24, 26 y 28 entran sin tocar la prueba y que una zona o exención nueva la decide Héctor.
- `DESPLIEGUE.md` — §3: el párrafo de la Salida interna (cotas, páginas sin lectura —también la Obra
  que no se indexa hasta la 23.9—, el 404 y los chips de respaldo) y tres consultas desde la primera
  jornada UTC completa y sin la de hoy: salidas y lecturas por superficie —con «404» y
  «paginas-2+» aparte—, zona y `con_vista`; la continuación por superficie, solo con vista y sin el
  «Ver esta cita» del 404, con las vistas unidas una vez por ruta y jornada; y el numerador de
  SM-13. El comentario dice lo que la unión por ruta y jornada UTC deja fuera.

**Revisión.** Cinco pasadas del paso 4. La primera, sin hallazgos (las capas externas aún no
habían corrido). La segunda, con los hallazgos de las cinco capas externas: 12 parches (0 altos, 3
medios, 9 bajos), 0 diferidos, 20 rechazados. Esta invocación hizo dos: la primera, con una nueva
ronda de las cinco capas, encontró **2 bad_spec medios** —la prueba de `dist/` se ponía en rojo con
lo que planean la 23.9, la 24.4, la 26.3 y la 28.3, cuyos criterios dicen que «sigue pasando» o que
las cubre «sin tocarla»—, enmendó la tarea de la spec (Spec Change Log) y volvió por el paso 3, que
dejó la prueba en «están las once», `COLOCACION` sin comparar zonas de épicas posteriores y el suelo
sin lectura sin la Obra que no se indexa; 14 parches sobrevivieron a la vuelta y 14 hallazgos se
rechazaron, 0 diferidos. La repetida, sin hallazgos externos nuevos, aplicó esos **14 parches** (0
altos, 1 medio, 13 bajos). Una quinta pasada, con una nueva ronda de las cinco capas externas
sobre ese delta (`verification-gap` sin hallazgos): **17 parches** (0 altos, 1 medio, 16 bajos),
0 diferidos y 14 rechazados, sin bad_spec ni intent_gap. El medio, la consulta de la continuación,
que leía D1 fila a fila; los bajos, sobre todo el tokenizador —que pasa de emular a medias la
recuperación del navegador a rechazar lo que el navegador reordenaría—, guardas que no veían formas
directas (escuchas de ventana, `stopPropagation`, zonas en listas o en trozos de plantilla,
`target` `_top`/`_parent`), dos filas de `COLOCACION`, los apartados «404» y «paginas-2+» de la
consulta por zona, el chip exento del 404 en un navegador de verdad y cifras y frases de la
documentación. Seguimiento recomendado: `true` (parcheados en la última pasada: 0 altos, 1 medio,
16 bajos; puntuación 3 × 1 + 16 = 19).

**Verificación** (sobre el árbol que se commitea, tras los parches de la quinta pasada).
- `npx astro check` — 0 errores, 0 avisos, 20 sugerencias (las de antes). A mano, en pasadas
  anteriores: quitar `zona` de cada uno de los seis componentes y escribir una zona inventada da un
  error ts(2322) por cambio.
- `npm test` (con `correr.sh`, empezado después del último cambio de código) — **131 ficheros y
  5.813 pruebas en verde**; incluye los once ficheros del primer criterio. Antes, por fichero,
  `medicion` y `vocabulario`: 443 en verde.
- `npx playwright test tests/e2e/receptor.spec.ts --project=escritorio` — **43 en verde, 1 saltada**
  (la de prerender, como antes); las seis de la 23.7 pasan, también las dos de la caché de atrás y
  adelante, que restauraron, y la del 404 con el chip exento.
- Con el `webServer`, `busqueda`, `pagina-de-cita`, `rutas-de-salida`, `portada`, `pagina-404`,
  `origen` y `receptor-local` en `escritorio` — **77 en verde, 2 saltadas** (las de antes). Puertos
  4321, 4399, 4400, 4402 y 8787 libres al terminar.
- `guionDeMedicion` medido con `npx tsx`: **3.339 bytes** con
  `https://medicion-sabiduria-de-bolsillo.sabiduriadebolsillo.workers.dev` (≤ 3.730): los parches
  de esta pasada no tocan el fichero, solo su docblock.
- Mutaciones, cada una revertida: `target="_TOP"` en el «Siguiente» de la Paginación pone en rojo la
  prueba de `dist/` (cuatro listados); la escucha con `closest("[data-zona]")`, sin la exención, pone
  en rojo la prueba de punta a punta del 404 («el chip exento emitió algo»). De pasadas anteriores:
  quitar `!c.hasAttribute(…)&&` y `zona="chip-de-tema"` en el chip «Sobre {Autor}».
- Las tres consultas de `DESPLIEGUE.md` §3, contra una tabla SQLite de `medicion/esquema.sql` con
  filas inventadas: la jornada de hoy no entra; la continuación da `cita` 1/2 y `portada` 1/1 y deja
  fuera la página 2+, `/buscar/`, el 404 en una ruta sin vista y el «Ver esta cita» de un 404 en una
  ruta con vista; la salida que cruza la medianoche sale sin vista, como dice su comentario.
- El `dist/` real del árbol (5.288 páginas; 5.286 cargan el fichero) pasado por el tokenizador
  estricto: **ningún rechazo**, 49.589 enlaces internos de `main`, ninguno sin zona ni exención,
  ninguno con `target` `_top` o `_parent` y ningún `<base>`. Ninguna de las cinco zonas de las Épicas
  24, 26 y 28 aparece en `src/` ni en ese `dist/`.
- `git diff fe55077e241ba717e4a7cdedfd40ee573ad3abf2 -- src/lib/vocabulario.ts medicion/` vacío;
  `ARRANQUE_DE_MEDICION` y `MAX_BYTES_DE_GUION` sin cambios; ningún fichero de `corpus/` tocado.

**Riesgos que quedan.**
- Las zonas de los contenedores propios de una página (portada, 404, `/buscar/`, la Cabecera de Obra
  y la cabecera) son atributos escritos, no props tipadas: una errata ahí no la ve `astro check`, la
  ve la prueba de `dist/` (que corre el CI).
- `target="_top"` o `"_parent"` no se miden: el contrato admite solo vacío o `_self`. Ningún enlace
  del sitio los lleva, y la prueba de `dist/` rechaza el primero que llegue a `main` y todo `<base>`.
- Chromium no despacha `click` con el botón central (es `auxclick`): el filtro de `button` es
  defensa, y la prueba de punta a punta lo confirma sin salida.
- Los enlaces internos fuera de `main` sin zona —el RSS del pie— no se miden, a propósito: la tabla
  de zonas no los nombra y la prueba de `dist/` solo exige zona dentro de `main`.
- El tokenizador de la prueba rechaza el marcado que el navegador reordenaría: un componente nuevo
  que lo emita pone en rojo la prueba de `dist/` con el motivo, aunque sus enlaces tuvieran zona. Es
  a propósito —el marcado se corrige—, y hoy ninguna página de `dist/` lo emite.
- Las guardas de las escuchas de ventana, de `stopPropagation` y de las zonas escritas miran el texto
  de las fuentes: no ven un nombre de evento que llegue en una variable ni una zona compuesta en
  tiempo de ejecución.
- Las consultas de SM-4 de `DESPLIEGUE.md` resuelven la superficie por el prefijo de la ruta, a
  mano, y apartan lo que no tiene lectura por la vista de su ruta en la jornada UTC, hasta que la
  23.10 lo haga contra el censo, con su prueba: la salida de una carga que cruza la medianoche cae
  entre las sin vista si su ruta no tuvo otra vista ese día, y las salidas por la cabecera y la
  Atribución del 404 de una ruta retirada a mitad de jornada caen entre las con vista.
- Nada se ha leído aún de D1 de producción: la serie empieza la primera jornada UTC completa tras
  la llegada de la 23.
