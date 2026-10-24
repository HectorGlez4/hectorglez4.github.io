---
title: 'Historia 24.2 — El build avisa antes de que dist/ llegue al techo del alojamiento'
type: 'feature'
created: '2026-10-24'
status: 'done'
baseline_revision: 'e51daf84b76342c2befb17d0c5148a058289dda6'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-24-context.md'
warnings: [oversized]
deferred:
  - summary: >-
      Hasta la 26.2 la Cita del Día de la portada entra en el índice de Pagefind, así que
      dist/pagefind/ varía unos cientos de bytes de una jornada a otra y la medida juzgada
      no es idéntica byte a byte entre jornadas.
    evidence: |-
      src/pages/index.astro:70 (`<section class="del-dia">`) está dentro del
      `data-pagefind-body` del armazón (superficies.ts: la portada es `producto`). AD-9 nombra
      solo la portada, el 404, /kit, /lote y rss.xml como lo que rota; el fragmento de Pagefind
      de la portada no está en la lista. La 26.2 (epics.md:6961) mete la Cita del Día en
      `data-pagefind-ignore="all"`. Arreglarlo aquí cambiaría dist/, que esta historia prohíbe.
      El veredicto solo puede cambiar con el peso a esa distancia de un umbral.
    location: 'src/pages/index.astro:70; tools/lib/peso.ts (FICHEROS_QUE_ROTAN_CON_LA_JORNADA)'
    severity: low
  - summary: >-
      La rama v8/24-2-peso-de-dist trae debajo de la historia el commit
      e51daf84b76342c2befb17d0c5148a058289dda6 (epic-24-context.md), así que fusionada tal
      cual no entra «sola» en la principal.
    evidence: |-
      Mismo caso que el diferido de la 23.12 con el contexto de la Épica 23. Es un artefacto
      del bucle, no código de la historia; decide el orquestador al fusionar.
    location: 'historia de la rama'
    severity: low
  - summary: >-
      Medido sobre el Corpus real: entre las jornadas 2026-10-24 y 2026-10-25 cambian, además
      de los cinco que rotan, 39 ficheros de dist/pagefind/, y lo juzgado pasa de 466.839.655 a
      466.839.661 bytes (+6). Cuando la 26.2 saque la Cita del Día del índice, sus criterios
      deberían pedir una prueba construida de dos jornadas con la misma medida juzgada byte a
      byte; pendiente de Héctor (bmad-create-epics-and-stories).
    evidence: |-
      Dos construcciones de la revisión 8e19c36bae con FECHA_JORNADA=2026-10-24 y 2026-10-25
      (auditoría de aceptación de la primera pasada de revisión). Hoy esa prueba fallaría por
      la deriva ya diferida de Pagefind, así que no puede entrar en esta historia; la prueba de
      dos jornadas de tests/unit/peso.test.ts es pura, sobre listados sintéticos.
    location: >-
      _bmad-output/planning-artifacts/epics.md (Historia 26.2); tests/unit/peso-construido.test.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** Nada mide lo que se despliega: GitHub Pages admite 1 GB por sitio y `dist/` crece unos 95 KB por Cita nueva, así que una sesión de siembra puede tumbar la publicación sin aviso (el fallo se ve al publicar, no al construir).

**Approach:** Un paso final de `npm run build`, tras Pagefind, mide `dist/` en bytes y ficheros, informa aparte lo que rota con la jornada, las Tarjetas Sociales y los PNG, y decide con funciones puras contra un aviso y un tope con nombre en `umbrales.ts`: entre los dos avisa sin romper; por encima del tope la construcción sale con error.

## Boundaries & Constraints

**Always:**
- Valores de Héctor (2026-10-24, autorizados al bucle): `AVISO_DE_PESO_DE_DIST = 750 MiB` (786.432.000 bytes) y `TOPE_DE_PESO_DE_DIST = 900 MiB` (943.718.400 bytes); `TOPE_DE_PNG_DE_DIST: number | undefined = undefined`. Van en `src/lib/umbrales.ts` en un commit propio, antes del de la maquinaria, para que el diff de los valores se vea solo. Aviso y tope son `number`, nunca opcionales ni con valor por omisión.
- El veredicto del peso y el del PNG reciben la medida **ya sin** `index.html`, `404.html`, `kit/index.html`, `lote/index.html` y `rss.xml` (rutas exactas relativas a `dist/`); esos cinco se miden e informan aparte.
- Se mide en bytes (suma de tamaños de fichero), no en bloques de `du`. `dist/pagefind/` cuenta. Los ficheros se cuentan sobre todo `dist/`.
- Bordes estrictos: igualar el aviso no avisa; igualar el tope avisa y no rompe; pasar el tope rompe. Igual con el PNG: igualar su tope no avisa, pasarlo avisa y no rompe.
- La línea de cifras no es un aviso: sale siempre por stdout y sin prefijo de aviso. Solo lo que cruza un umbral sale por stderr; con `GITHUB_ACTIONS=true`, además con `::warning::` / `::error::` delante para que se vea en el resumen del flujo.
- El paso no escribe nada y no usa red. Decisiones puras en `tools/lib/peso.ts` (AD-5); la lectura de disco y el código de salida en `integraciones/peso.ts`.

**Block If:**
- El `dist/` de la rama, construido, pasa `TOPE_DE_PESO_DE_DIST`: el paso congelaría el despliegue diario el mismo día.
- La construcción de verificación difiere del manifiesto de base por algo que esta historia causa (ver Verification).

**Never:**
- Medir en `astro:build:done`, ni valor por omisión, ni umbral por entorno o bandera.
- Cambiar un fichero de `dist/`: nada de `data-pagefind-ignore` en la portada (es de la 26.2), ni el tope de HTML de la Página de Cita (aplazado), ni caché de PNG (deuda de AD-16), ni tamaños de filtros de Pagefind o del mapa de rótulos, ni aviso o tope del número de ficheros.
- Tocar `_bmad-output/planning-artifacts/`, `_bmad-output/specs/` ni `sprint-status.yaml` (lo lleva el orquestador). Fusionar es del orquestador.
- Nombrar en `src/` o `integraciones/` las palabras que barren `indexacion.test.ts:1165`, `trafico.test.ts:740` y `demanda.test.ts:695` (`indexacion`, `googleapis`, `trafico`, `demanda.ts`…), ni siquiera en comentarios.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Por debajo | juzgado ≤ aviso | Cifras por stdout; ningún aviso; código 0 | — |
| Entre aviso y tope | aviso < juzgado ≤ tope | Cifras + aviso por stderr con peso, aviso y tope (bytes y MiB) y que no decide nada; código 0 | — |
| Por encima | juzgado > tope | Cifras + error con peso, tope, `TOPE_DE_PESO_DE_DIST` y `src/lib/umbrales.ts`; `npm run build` falla | código 1, sin traza |
| Dos jornadas | solo cambian los cinco que rotan (aunque pesen más que el tope) | Misma medida juzgada, mismo veredicto | — |
| PNG sin tope | `TOPE_DE_PNG_DE_DIST` undefined | Informa el número y que no tiene tope; no avisa | — |
| PNG con tope | n ≤ tope / n > tope | No avisa / avisa sin romper, nombrando la constante | código 0 |
| Sin `dist/` | no existe o no se deja leer | Lo dice | código 1 |

</intent-contract>

## Code Map

- `package.json:14` -- `"build": "astro build && pagefind --site dist --force-language es"`; se le encadena `&& tsx integraciones/peso.ts`. CI (`.github/workflows/publicar.yml:82`) y Playwright (`playwright.config.ts:31`) construyen con esta orden; si rompe, `upload-pages-artifact` (`publicar.yml:142`) no llega y queda servido el sitio anterior.
- `src/lib/umbrales.ts:183` -- `MAX_BYTES_DE_GUION`, precedente de tope en bytes con su porqué; los nuevos van detrás. `:162` `META_AUTORES_DE_OTRA_TRADICION` es el precedente de `number | undefined = undefined` («lo pone Héctor»). Añadir también `TECHO_DE_PESO_DEL_ALOJAMIENTO = 1_000_000_000` (GitHub Pages, 1 GB leído en decimal, la lectura estricta) para que la relación se diga con nombres.
- `tools/lib/indexables.ts:1-13` + `integraciones/indexables.ts:44` -- reparto puro/E-S que se copia; `ficherosBajo` (readdir recursivo) es el patrón de recorrido. La espina (Structural Seed, `ARCHITECTURE-SPINE.md:515-523`) pone el paso en `integraciones/`.
- `src/lib/formato.ts:20,38` -- `porcentajeEnEspañol`, `milesEnEspañol`: el formato de cifras; no traer otro.
- `tests/unit/ayuda/construir.ts:99` -- `construirConCorpus` corre `astro build` (`:271`) y Pagefind aparte (`:250`); no corre `npm run build`. `node_modules/.bin` llega enlazado (`:58`), así que `npm run build` funciona en la copia. `ficheros` parchea la copia, nunca el árbol; `:455` `limpiar`; `:637-676` fixtures.
- `tests/unit/obra-pagina.test.ts:796` -- precedente de parchear `src/lib/umbrales.ts` en la copia con `replace` sobre la línea exacta.
- `tests/unit/andamiaje.test.ts:276` -- barrido de red sobre `src/`, `tools/`, `integraciones/`: el paso no puede tener llamadas de red.
- `DESPLIEGUE.md:123` -- «El techo de caché del hospedaje»; la sección hermana va detrás.
- Medida de base, 2026-10-24, `e51daf84b7`, 4.421 Citas, jornada 2026-10-24 sin `MEDICION_ENDPOINT` ni `SITE_URL`: desplegado 466.937.424 bytes (445,3 MiB; `du` 484,7 MiB) en 15.339 ficheros; juzgado 466.839.655 bytes (445,2 MiB) en 15.334; rotan 97.769 bytes en 5; `/tarjeta/` 312.472.917 bytes (298,0 MiB, 66,9 % de lo juzgado) en 5.113; PNG 5.116; Páginas de Cita 123,6 MiB; Pagefind 3,2 MiB en 4.924 ficheros. Manifiesto: `/Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-24-2/dist-base-2026-10-24.sha256` (`shasum -a 256` desde `dist/`, ordenado). **Re-medido al empezar la implementación** (2026-10-24, misma revisión, `FECHA_JORNADA=2026-10-24 npm run build`): el manifiesto sale idéntico (15.339 ficheros, `diff` vacío) y las cifras, las mismas —desplegado 466.937.424 bytes (445,3 MiB) en 15.339; juzgado 466.839.655 (445,2 MiB) en 15.334; rotan 97.769 en 5; `/tarjeta/` 312.472.917 (298,0 MiB, 66,9 %) en 5.113; PNG 5.116; `du -sm` 485—. Son 4.420 Citas: los 4.421 ficheros versionados de `corpus/citas/` incluyen el `.gitkeep`.
- Proyección (≈95 KB por Cita nueva: 29,3 KB de página + 64,3 KB de Tarjeta + ~1 KB de Pagefind y listados): aviso tras ~3.360 Citas más (~7.790), tope tras ~5.020 (~9.440), 1 GB decimal hacia ~10.030. La Épica 24 engorda la Página de Cita: la 24.6 vuelve a medir y Héctor revisa los valores.

## Tasks & Acceptance

**Execution:**
- `src/lib/umbrales.ts` -- (commit propio) `TECHO_DE_PESO_DEL_ALOJAMIENTO`, `AVISO_DE_PESO_DE_DIST`, `TOPE_DE_PESO_DE_DIST`, `TOPE_DE_PNG_DE_DIST` con comentario: qué mide (bytes tras Pagefind, sin lo que rota), quién fija y cuándo, la cifra de base, y que el aviso no decide nada -- AD-9, AD-16.
- `tools/lib/peso.ts` -- puro: `FICHEROS_QUE_ROTAN_CON_LA_JORNADA`; `medirDist(ficheros: {ruta, bytes}[])` → desplegado, rotan (y `rotanQueFaltan`), juzgado (bytes y ficheros, tipo marcado `Juzgado` que solo ella produce), tarjetas (`tarjeta/…`, dentro de lo juzgado) y PNG (dentro de lo juzgado); `veredictoDePeso(juzgado: Juzgado, {aviso, tope})`; `veredictoDePng(juzgado: Juzgado, tope | undefined)`; el parte (líneas de cifras con el margen hasta el umbral siguiente, avisos, error —también con un `dist/` sin ficheros—, con o sin anotación de Actions) y `errorDeLectura` -- decisiones probables sin disco. El escapado de las anotaciones lo comparte con `tools/lib/ingresos.ts` desde `tools/lib/anotacion.ts`.
- `integraciones/peso.ts` -- recorre `dist/` siguiendo los enlaces simbólicos como `tar --dereference` (salta un enlace a un antepasado; uno roto falla la lectura nombrándolo como enlace roto), llama a lo puro, escribe cifras por stdout y avisos/error por stderr —el de lectura también anotado en Actions—, sale 1 sobre el tope, sin `dist/`, con uno vacío o con uno que solo trae lo que rota (entonces sin cifras ni veredicto) -- la cáscara.
- `package.json` -- encadenar el paso tras Pagefind.
- `tests/unit/ayuda/construir.ts` -- opción de `construirConCorpus` para construir con `npm run build` (prebuild, Astro, Pagefind y el paso) en vez de `astro build`.
- `tests/unit/peso.test.ts` -- relación `0 < AVISO < TOPE < TECHO` (enteros) y `TOPE_DE_PNG` indefinido o entero > 0; los tres casos y los dos bordes del peso; los casos del PNG; dos listados que solo difieren en los cinco que rotan (también con la portada por encima del tope) dan la misma medida juzgada y el mismo veredicto; las anotaciones con `GITHUB_ACTIONS`; el error nombra `TOPE_DE_PESO_DE_DIST`.
- `tests/unit/peso-construido.test.ts` -- en una copia: `npm run build` con aviso y tope rebajados bajo el peso del fixture sale ≠ 0 con peso, tope y constante en la salida; los cinco que rotan existen en su `dist/`; el número de ficheros informado es el de `dist/` con `pagefind/`. En la misma copia, volviendo a parchear su `umbrales.ts` y corriendo solo el paso: aviso bajo y tope alto → 0 y aviso; valores reales → 0 y sin aviso; `TOPE_DE_PNG` = 1 → 0 y aviso del PNG; y el paso no altera `dist/` (mismo listado y tamaños antes y después).
- `DESPLIEGUE.md` -- sección «El techo de peso del hospedaje» tras la de caché: qué mide el paso, constantes, qué pasa al cruzar cada una, la cifra de base, los 20.000 ficheros de Cloudflare Pages como dato para mudarse, revisión tras la 24.6. `AGENTS.md` -- una viñeta en «Running and verifying».

**Acceptance Criteria:**
- Given `npm run build` sobre el Corpus real, when termina, then sale 0 y escribe la línea de cifras (bytes y ficheros de `dist/` con `pagefind/`), lo que rota aparte, la parte de `/tarjeta/` y el número de PNG sin tope, y ningún aviso.
- Given esa construcción con `FECHA_JORNADA=2026-10-24`, when se compara con el manifiesto de base, then no cambia ningún fichero de `dist/`.
- Given `npx astro check` y los ficheros de prueba tocados y los barridos (`andamiaje`, `barra-final`, `indexacion`, `trafico`, `demanda`), when corren, then pasan.

## Design Notes

El paso vive en `integraciones/` sin ser una integración de Astro porque la espina lo pone ahí y porque corre después de Pagefind, que es cuando `dist/` es lo que se despliega. La medida juzgada la produce solo `medirDist`; los veredictos la reciben y nunca vuelven a mirar rutas, así que «sin lo que rota» no se recuerda en dos sitios. Más adelante otras historias (27.x) añaden a este mismo paso los tamaños de filtros y mapa; ahora no.

## Verification

**Commands:**
- `npx vitest run tests/unit/peso.test.ts` -- verde.
- `npx vitest run tests/unit/peso-construido.test.ts` -- verde.
- `npx vitest run tests/unit/andamiaje.test.ts tests/unit/barra-final.test.ts tests/unit/indexacion.test.ts tests/unit/trafico.test.ts tests/unit/demanda.test.ts` -- verde.
- `npx astro check` -- 0 errores.
- `FECHA_JORNADA=2026-10-24 npm run build` (sin `MEDICION_ENDPOINT` ni `SITE_URL`), luego `(cd dist && find . -type f -print0 | sort -z | xargs -0 shasum -a 256) | diff - /Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-24-2/dist-base-2026-10-24.sha256` -- sale 0 sin aviso y el diff está vacío. Si difiere, reconstruir la base en `e51daf84b7` antes de culpar al cambio; borrar `dist/` al terminar. Sin ese fichero —fuera del repositorio, en los registros del bucle—, el manifiesto de base se regenera en un worktree de `e51daf84b76342c2befb17d0c5148a058289dda6` con el mismo Corpus: `FECHA_JORNADA=2026-10-24 npm run build` (en la base no hay paso del peso) y la misma orden `(cd dist && find . -type f -print0 | sort -z | xargs -0 shasum -a 256) > <manifiesto>`. Las rutas del manifiesto son relativas a `dist/`, así que dos manifiestos de construcciones distintas se comparan con `diff` sin más.
- `npm test` entero con `correr.sh` -- verde.

## Review Triage Log

### 2026-10-24 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las cinco capas (blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor) son externas en este bucle y la invocación no traía ninguna sección «Hallazgos externos»: esta pasada no clasifica nada. Sigue una revisión independiente.

### 2026-10-24 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 19: (high 0, medium 1, low 18)
- defer: 1: (high 0, medium 0, low 1)
- reject: 13: (high 0, medium 0, low 13)
- addressed_findings:
  - `[medium]` `[patch]` El cableado `GITHUB_ACTIONS=true` → anotación del paso no lo ejercitaba ninguna prueba (verification-gap; blind-hunter; intent-alignment): `correrElPaso` recibe el entorno y dos pruebas construidas corren el paso con `GITHUB_ACTIONS=true` (`::warning::Aviso de peso:` con 0, `::error::dist/ pesa` con 1). Comprobado por mutación: con `anotar = false` fallan.
  - `[low]` `[patch]` Los enlaces simbólicos no se contaban, y `upload-pages-artifact` los sigue con `tar --dereference` (blind-hunter; edge-case-hunter): `integraciones/peso.ts` recorre a mano siguiendo enlaces, salta el que vuelve a un antepasado y falla con uno roto; prueba con enlaces a fichero, a directorio, en bucle y roto.
  - `[low]` `[patch]` El recorrido dependía de `readdir({ recursive })` y `parentPath`, y la prueba lo cotejaba con la misma API (ac-auditor): el paso ya no la usa y `huellaDe` lista con `find -L`.
  - `[low]` `[patch]` Un `dist/` sin ficheros medía 0 bytes y salía con 0 (edge-case-hunter): ahora es un error con código 1 que lo dice.
  - `[low]` `[patch]` No poder leer `dist/` salía sin `::error::` en Actions (blind-hunter): `errorDeLectura` en lo puro, anotado como el del tope, con prueba pura y construida.
  - `[low]` `[patch]` Las cifras, el aviso y el error no decían cuánto queda ni cuánto sobra (blind-hunter): la línea de lo juzgado da el margen hasta el umbral siguiente o el exceso sobre el tope; el aviso, lo que queda hasta el tope; el error, en cuánto lo pasa.
  - `[low]` `[patch]` Un fichero de los cinco que rotan que faltase pasaba en silencio (blind-hunter): `medirDist` devuelve `rotanQueFaltan` y la segunda línea de cifras los nombra.
  - `[low]` `[patch]` Nada vigilaba que una superficie nueva que dependa de la jornada entre en la lista (edge-case-hunter): prueba que cierra, por importaciones, qué ficheros de `src/` fuera de `src/lib/` leen la jornada y exige que sean las cinco páginas de la lista.
  - `[low]` `[patch]` El aviso prescribía qué hacer en vez de decir que lo decide Héctor (ac-auditor): el aviso, `umbrales.ts` y `DESPLIEGUE.md` dicen que qué hacer lo decide Héctor.
  - `[low]` `[patch]` Nada fijaba el techo en 1 GB (ac-auditor): prueba `TECHO_DE_PESO_DEL_ALOJAMIENTO === 1_000_000_000`.
  - `[low]` `[patch]` `tools/lib/peso.ts` importaba el escapado del módulo de ingreso y la prueba de pureza solo miraba su texto (blind-hunter): `escaparAnotacion` pasa a `tools/lib/anotacion.ts` (lo importan peso e ingresos) y la prueba sigue las importaciones relativas y fija el cierre.
  - `[low]` `[patch]` Las pruebas construidas dependían del orden (blind-hunter): cada una escribe sus umbrales antes de correr el paso, y «no altera dist/» toma su propia huella antes y después con los dos desenlaces; comprobado con `-t`.
  - `[low]` `[patch]` Un fallo al lanzar la orden devolvía `'ENOENT'` como código (blind-hunter; edge-case-hunter): `correrElPaso` y `construirProyecto` lanzan el error en vez de tomarlo por un código.
  - `[low]` `[patch]` La documentación prometía un veredicto independiente del día sin la deriva de Pagefind (blind-hunter): `DESPLIEGUE.md` y `umbrales.ts` dicen la excepción, con su medida.
  - `[low]` `[patch]` La cifra de base es local y el CI construye con `MEDICION_ENDPOINT` (blind-hunter; edge-case-hunter; intent-alignment): `DESPLIEGUE.md` lo dice, con el orden de magnitud del guion en línea.
  - `[low]` `[patch]` No se decía qué pasa con el relleno del tar del despliegue (blind-hunter): `DESPLIEGUE.md` lo estima (≈15 MB hoy, ≈29 MB en el tope) frente a los 56 MB entre tope y techo, y dice que qué compara GitHub no está comprobado.
  - `[low]` `[patch]` La salida sugería la mudanza a Cloudflare Pages cuando a la altura del aviso ya pasa de sus 20.000 ficheros (blind-hunter): `DESPLIEGUE.md` lo dice.
  - `[low]` `[patch]` Pasar el tope para toda construcción, no solo el despliegue (blind-hunter): `DESPLIEGUE.md` nombra la diaria, Playwright en local y los arreglos urgentes, y que no hay bandera a propósito.
  - `[low]` `[patch]` «La línea de cifras» son cinco líneas, y el spec describía `veredictoDePng(n, …)` (blind-hunter; intent-alignment): `AGENTS.md` y `DESPLIEGUE.md` dicen cinco líneas; las Tasks del spec describen las firmas con `Juzgado`.

Diferido: la medida de la deriva de Pagefind entre dos jornadas reales y la prueba construida de dos jornadas para la 26.2 (ac-auditor; blind-hunter; intent-alignment), en el frontmatter. Rechazados: contar solo los PNG de `tarjeta/` (el criterio dice «PNG de `dist/`»; hoy difiere en 3 iconos); contarlos dentro de lo juzgado y no en todo `dist/` (ninguno de los cinco que rotan es PNG: hoy coinciden); serie o `$GITHUB_STEP_SUMMARY` de las cifras (el paso no escribe nada); cifras de base copiadas a mano (van fechadas); manifiesto de `dist/` fuera del repositorio (comprobación única de la historia); el triaje anterior sin hallazgos (lo resuelve esta pasada); fusión, CI en la principal y `sprint-status.yaml` (del orquestador); procedencia de los valores (los dio Héctor al bucle); porcentaje de las Tarjetas sobre lo juzgado y el corte de 10 minutos del despliegue sin medir (el contrato no lo pide); prueba de `npm run build` entero entre aviso y tope (el paso es el último eslabón fijado por prueba); `npm.cmd` en Windows (el proyecto no construye ahí); aviso o tope del número de ficheros (el contrato lo prohíbe).

### 2026-10-24 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 20: (high 0, medium 0, low 20)
- defer: 0
- reject: 23: (high 0, medium 0, low 23)
- addressed_findings:
  - `[low]` `[patch]` La guarda de qué superficies leen la jornada no seguía un especificador `.js` que nombra un `.ts`, uno sin extensión, las reexportaciones, los `import '…'` de efecto ni los `import('…')`, y solo miraba `src/` (verification-gap; blind-hunter): `tests/unit/peso.test.ts` resuelve como Vite (`.js`→`.ts`, sin extensión, `index`), sigue `import`/`export … from`, efecto, dinámico y `require`, barre también `integraciones/` y `astro.config.mjs`, y una prueba sintética fija el resolutor. Mutación: una página sonda con `'../lib/citaDelDia.js'`, y otra a través de un módulo que solo reexporta, hacen fallar la guarda.
  - `[low]` `[patch]` La prueba de pureza solo rechazaba `node:` y `process.` (blind-hunter): quita comentarios, exige que toda importación sea relativa (un `'fs'` a secas o un paquete no se inspeccionan) y rechaza `process`, `globalThis`, `fetch(`, `XMLHttpRequest` y `WebSocket`. Mutación: un `import … from 'fs'` en `tools/lib/peso.ts` la hace fallar.
  - `[low]` `[patch]` Con un `dist/` vacío las cifras decían «0 bytes» y «quedan 750 MiB hasta el aviso» junto al error (blind-hunter; edge-case-hunter): sin nada que juzgar el parte no trae cifras —ausencia antes que cero— y el paso no escribe nada por stdout.
  - `[low]` `[patch]` Un `dist/` que solo trae los ficheros que rotan pasaba como una medida de 0 bytes (edge-case-hunter): es un error con código 1 que nombra los presentes, sin cifras.
  - `[low]` `[patch]` La primera línea decía «pagefind/ incluido» aunque no hubiera `pagefind/` (blind-hunter): `medirDist` cuenta `pagefind/` y la línea dice «sin pagefind/» cuando falta.
  - `[low]` `[patch]` `enMiB` escribía «0 MiB» para cantidades no nulas, y el error decía «pasa del tope en 1 byte (0 MiB)» (blind-hunter): por debajo de una décima sin ser cero escribe «<0,1 MiB».
  - `[low]` `[patch]` El aviso y el error afirmaban que se despliega o que sigue servido el sitio anterior también en local y en Playwright (blind-hunter): lo dicen del flujo de publicación (`tools/lib/peso.ts`, comentarios de `umbrales.ts`, tabla de `DESPLIEGUE.md`).
  - `[low]` `[patch]` Ninguna prueba fijaba que el flujo de publicación construye con `npm run build` antes de `upload-pages-artifact` (blind-hunter): prueba que lee `publicar.yml`, exige el paso `npm run build` antes de la subida de `dist`, sin `continue-on-error`, y que ningún paso anterior llame a `astro build` o a Pagefind a pelo.
  - `[low]` `[patch]` El paso no aplica las exclusiones por nombre del empaquetado (blind-hunter): `integraciones/peso.ts` y `DESPLIEGUE.md` dicen que `.git`/`.github` se cuentan, que eso mide de más y nunca de menos, y que hoy `dist/` no trae entradas con punto (comprobado sobre el manifiesto de base).
  - `[low]` `[patch]` Lo que no es fichero ni directorio (tubería, socket, dispositivo) se saltaba en silencio (edge-case-hunter): hace fallar la lectura con su nombre; prueba construida con `mkfifo`.
  - `[low]` `[patch]` Un hijo muerto por una señal contaba como código 1 (blind-hunter): `construirProyecto` y `correrElPaso` lanzan si hay señal, igual que con un código de texto.
  - `[low]` `[patch]` Una salida de más de 1 MiB habría matado la construcción por `maxBuffer` y se habría tomado por «no arrancó» (edge-case-hunter): `construirProyecto` da 64 MiB y `correrElPaso` 16 MiB.
  - `[low]` `[patch]` `construirConCorpus` dejaba la copia huérfana si `construirProyecto` o Pagefind lanzaban (edge-case-hunter): limpia la copia y relanza.
  - `[low]` `[patch]` Dos pruebas construidas exigían el stderr entero vacío o anclado al principio, y un aviso de Node o de `tsx` las tumbaría (blind-hunter): se juzga por línea (bandera `m` y `LINEA_DEL_PASO`).
  - `[low]` `[patch]` La prueba construida del aviso no comprobaba el tope ni quién decide (ac-auditor): exige `TOPE_DE_PESO_DE_DIST`, el tope en bytes y «lo decide Héctor».
  - `[low]` `[patch]` Las proyecciones de crecimiento contaban solo lo que añade una Cita (blind-hunter): `DESPLIEGUE.md` y `umbrales.ts` las dan como cotas —un Autor o una Obra nuevos suman su página y su Tarjeta, así que los umbrales pueden llegar con menos Citas, nunca con más—.
  - `[low]` `[patch]` `AGENTS.md` no decía que una página nueva que dependa de la jornada va en `FICHEROS_QUE_ROTAN_CON_LA_JORNADA` (blind-hunter): lo dice, con la prueba que lo exige.
  - `[low]` `[patch]` `AGENTS.md` y `DESPLIEGUE.md` decían que el paso escribe siempre sus cinco líneas (blind-hunter): las escribe cuando hay algo que juzgar; sin `dist/`, vacío o solo con lo que rota, no.
  - `[low]` `[patch]` `DESPLIEGUE.md` decía 39 ficheros de Pagefind entre dos jornadas (ac-auditor): son 40, 39 con nombre nuevo y `pagefind-entry.json`. El diferido del frontmatter conserva su texto.
  - `[low]` `[patch]` La primera sección del Auto Run Result contradecía las pasadas posteriores (blind-hunter): lleva una nota de lectura y la marca «[superado en la pasada N]» en lo que quedó atrás.

Rechazados, con la autoridad del contrato o por ruido: el aviso de los ficheros que rotan y faltan sale por stdout (el contrato: solo lo que cruza un umbral va a stderr; y en el CI `npm test` corre antes de la subida, donde la prueba construida exige los cinco); el aviso no tiene más canal que la anotación (el contrato fija el canal y que el paso no escribe nada); el aviso no pone el número de ficheros frente a los 20.000 de Cloudflare (el contrato: ficheros sin aviso ni tope; lo dice `DESPLIEGUE.md`); nada juzga lo desplegado entero contra el techo (la matriz del contrato bendice dos jornadas aunque lo que rota pase del tope); tope y fallo de lectura comparten el código 1 (la matriz los da los dos con 1); anotaciones sin `title=` (el contrato nombra `::warning::`/`::error::`; cosmético); orden aparte para volver a medir (nadie la pide, y tras la 24.6 hay que construir igual); de intent-alignment, la deriva de Pagefind y la rama con el contexto de la épica (ya diferidas), el tar frente a los bytes (el criterio acepta los bytes), el corte de 10 minutos, la construcción del CI, el aviso probado sobre el paso solo, el manifiesto único, la traza de la decisión de Héctor (está en el contrato y en el mensaje del commit de los valores), los PNG dentro de lo juzgado, las cinco líneas y el alcance añadido; de ac-auditor, la deriva y la rama (diferidas), la traza de la propuesta de valores, los criterios de fusión y `sprint-status.yaml` (del orquestador).

### 2026-10-24 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 13: (high 0, medium 0, low 13)
- defer: 0
- reject: 28: (high 0, medium 0, low 28)
- addressed_findings:
  - `[low]` `[patch]` La guarda de la jornada comparaba con la lista todo lo que no fuera de `src/lib/`, así que llevar la Cita del Día a un componente la haría pedir un componente en una lista de rutas de `dist/` (blind-hunter): sigue las importaciones a través de componentes y plantillas, pero compara solo lo que escribe en `dist/` —`src/pages/`, `integraciones/` y `astro.config.mjs`—. Mutación: un componente que importa `citaDelDia` y una página sonda que lo usa hacen fallar la guarda nombrando la página y no el componente.
  - `[low]` `[patch]` La guarda descartaba todo especificador no relativo, y un alias (`~/lib/…`, `@/lib/…`) o un `import.meta.glob` pasaban sin verse (blind-hunter): `claseDe` sigue lo relativo y lo absoluto desde la raíz que nombra un fichero, deja fuera Node, lo virtual de Astro, los paquetes de `node_modules/` y las URL de ejecución (`/islas/…`, `/pagefind/…`), y una prueba nueva falla con cualquier especificador desconocido o glob. Mutación: una página sonda con `'~/lib/citaDelDia'` e `import.meta.glob` la hace fallar con los dos.
  - `[low]` `[patch]` La guarda de `publicar.yml` no miraba los pasos entre la medida y la subida (blind-hunter): entre `npm run build` y `upload-pages-artifact` no puede haber acciones de terceros ni un paso que nombre `dist`. Mutación: un `cp public/CNAME dist/CNAME` ahí la hace fallar.
  - `[low]` `[patch]` Sin nada que juzgar, el parte devolvía `veredictos: { peso: 'por-debajo', … }` sobre cero bytes junto al error (blind-hunter; edge-case-hunter): `veredictos` es opcional y se omite en ese caso, como las cifras; se calcula después de la comprobación.
  - `[low]` `[patch]` Un enlace simbólico roto salía como un `ENOENT … stat` a secas, aunque el fichero siga en `ls` (blind-hunter): el error dice «<ruta> es un enlace simbólico roto: apunta a «<destino>»…»; la prueba construida lo exige.
  - `[low]` `[patch]` El error del tope prescribía el remedio («Se adelgaza dist/ o se cambia de alojamiento») cuando el aviso y `DESPLIEGUE.md` dicen que lo decide Héctor (blind-hunter): «Qué hacer —adelgazar dist/, mudar el alojamiento o mover el tope— lo decide Héctor»; prueba pura.
  - `[low]` `[patch]` La cabecera de `integraciones/peso.ts` decía que las cifras salen «siempre» (blind-hunter): salen por stdout cuando hay algo que juzgar; las Tasks del spec nombran también el `dist/` que solo trae lo que rota.
  - `[low]` `[patch]` La viñeta de `AGENTS.md` omitía el caso «solo trae lo que rota» y enterraba en «Running and verifying» la regla de la página nueva que depende de la jornada (blind-hunter): la viñeta nombra los tres casos sin cifras, y la regla pasa a «Known pitfalls», junto a la de `superficies.ts`, con lo que la guarda sigue y lo que rechaza.
  - `[low]` `[patch]` La Verification compara con un manifiesto fuera del repositorio y no decía cómo rehacerlo (blind-hunter; ac-auditor): dice cómo regenerarlo en un worktree de la base con la misma orden.
  - `[low]` `[patch]` Una prueba declaraba su propio `sinComentarios`, sin la salvaguarda de `https://` (blind-hunter): usa el de la cabecera del fichero.
  - `[low]` `[patch]` El recorrido hacía dos `stat` por enlace a fichero (blind-hunter): un solo `stat` por entrada da el tipo y el tamaño. No se acota la concurrencia: `readdir` y `stat` corren en el grupo de hilos de libuv, que ya las acota, y no retienen descriptores.
  - `[low]` `[patch]` `DESPLIEGUE.md` explicaba la diferencia con el CI solo por `MEDICION_ENDPOINT` (blind-hunter): dice que `SITE_URL` no cambia nada mientras el sitio corra en su dominio —no se define (§1)— y qué cambiaría si se definiera.
  - `[low]` `[patch]` «No escribe nada» solo se comprobaba dentro de `dist/` (blind-hunter): una prueba fija que el paso solo importa de Node `node:fs/promises` —y de él solo `readdir`, `readlink`, `realpath`, `stat` o `lstat`— y `node:path`, además de lo puro y los umbrales, que no importan nada. Mutación: añadir `writeFile` a la importación la hace fallar.

Rechazados, con su autoridad: un margen mínimo obligatorio entre tope y techo (los valores y su holgura los fija Héctor; el contrato pide solo `0 < aviso < tope` por debajo de 1 GB); medir lo desplegado entero contra `TECHO_DE_PESO_DEL_ALOJAMIENTO`, como línea o como error (el contrato: el veredicto sale de lo juzgado y dos jornadas dan el mismo «aunque [lo que rota pese] más que el tope»; hoy rota 0,1 MiB); «dos números llamados peso de dist/» (el aviso y el error dicen «sin lo que rota con la jornada», y la línea de cifras «Juzgado sin lo que rota»); el «sale siempre por stdout» del contrato y la matriz sin filas para un `dist/` vacío o solo con lo que rota (el contrato no se toca en la revisión; se lee como el canal, y los dos casos son la fila «Sin `dist/`… no se deja leer → 1»; las Tasks ya los nombran); `review_loop_iteration: 0` y `status: done` con `followup_review_recommended: true` (semántica del flujo: el primero cuenta vueltas por `bad_spec` dentro de una pasada y se repone al abrir otra; el segundo es la recomendación para el orquestador); los 4.421 del Code Map (el mismo renglón lo corrige: registro de la planificación); el «39» y los «unos cientos de bytes» del frontmatter (los diferidos se conservan tal cual; el triaje de la pasada 2 ya dice 40 = 39 con nombre nuevo + `pagefind-entry.json`); las líneas largas de `DESPLIEGUE.md` (se ven igual al renderizar) y su título con «hospedaje» (es el de la sección hermana «El techo de caché del hospedaje», y lo citan `AGENTS.md` y las Tasks); de edge-case-hunter, lo que rota llevando lo desplegado sobre el techo (mismo motivo que arriba); de intent-alignment, la deriva de Pagefind y la rama con el contexto de la épica (diferidas), la identidad de `dist/` comprobada a mano (comprobación de aceptación de la historia, repetida en cada pasada y ahora repetible por cualquiera), quién fijó los valores (Héctor, en el chat del 2026-10-24, autorizados al bucle; consta en el contrato y en el commit de los valores), las otras salidas con 1 (son la fila «no existe o no se deja leer» de la matriz), las cinco líneas, los bytes frente al tar, las anotaciones en Actions, los cambios fuera de la superficie (parches de revisión con su porqué), el corte de 10 minutos y los PNG dentro de lo juzgado (el contrato: el veredicto del PNG recibe la medida sin los cinco); de ac-auditor, la traza de la decisión de Héctor, la rama, la deriva entre jornadas, los PNG y el aviso probado sobre el paso solo (ya rechazados o diferidos con su motivo).

## Auto Run Result

> Registro por pasadas, de la más antigua a la más reciente: lo que dice una pasada lo corrige o
> lo amplía la siguiente, y lo vigente es lo de la última. Las afirmaciones de esta primera
> sección que una pasada posterior dejó atrás llevan la marca «[superado en la pasada N]».

Status: done
Blocking condition: ninguna.

Planificación cerrada (halt after planning) sobre `e51daf84b76342c2befb17d0c5148a058289dda6`; implementación en línea en el worktree `v8-24-2`, rama `v8/24-2-peso-de-dist`, sin fusionar ni empujar.

**Qué se hizo.** `npm run build` termina, tras Pagefind, con `tsx integraciones/peso.ts`: suma los bytes de los ficheros regulares de `dist/` (`pagefind/` incluido) [superado en la pasada 1: sigue los enlaces simbólicos como `tar --dereference`], reparte con `medirDist` lo desplegado, lo que rota con la jornada (los cinco ficheros exactos), lo juzgado, las Tarjetas (`tarjeta/…`) y los PNG, y juzga lo juzgado contra `AVISO_DE_PESO_DE_DIST` (750 MiB) y `TOPE_DE_PESO_DE_DIST` (900 MiB) con bordes estrictos. Las cifras salen siempre por stdout [superado en la pasada 2: sin nada que juzgar no hay cifras]; el aviso y el error, por stderr, con `::warning::`/`::error::` delante cuando `GITHUB_ACTIONS=true`. Sobre el tope sale con 1 sin traza; sin `dist/` (o con uno que no se deja leer) lo dice y sale con 1. `TOPE_DE_PNG_DE_DIST` queda `undefined`: se informa el número y no avisa. Lo juzgado es un tipo marcado que solo produce `medirDist`, así que los veredictos no pueden recibir lo desplegado entero (lo fija un `@ts-expect-error` que `astro check` verifica).

**Commits** (sobre la base, en orden): `52a3a47cae` spec; `1794230264` constantes en `umbrales.ts`, solas; `244d18b95a` la maquinaria y sus pruebas; `e827930497` documentación; y el de cierre de este spec.

**Ficheros:**
- `src/lib/umbrales.ts` — `TECHO_DE_PESO_DEL_ALOJAMIENTO` (1e9), `AVISO_DE_PESO_DE_DIST`, `TOPE_DE_PESO_DE_DIST`, `TOPE_DE_PNG_DE_DIST` (`undefined`), con qué miden, quién las fijó y la cifra de base.
- `tools/lib/peso.ts` — puro: `FICHEROS_QUE_ROTAN_CON_LA_JORNADA`, `medirDist`, `veredictoDePeso`, `veredictoDePng`, `parteDePeso`, `enMiB`; reutiliza `milesEnEspañol`, `porcentajeEnEspañol` y `escaparAnotacion`.
- `integraciones/peso.ts` — la cáscara: recorre `dist/`, escribe el parte, fija el código de salida. Sin red, sin escritura.
- `package.json` — el paso encadenado tras Pagefind.
- `tests/unit/ayuda/construir.ts` — opción `conNpmRunBuild` de `construirConCorpus` (y de `construirProyecto`).
- `tests/unit/peso.test.ts` — 38 pruebas puras: relación de umbrales, reparto, bordes, dos jornadas con la portada sobre el tope, PNG, parte, anotaciones, formato, posición del paso.
- `tests/unit/peso-construido.test.ts` — 9 pruebas sobre una copia construida con `npm run build` y los umbrales rebajados en la copia.
- `DESPLIEGUE.md` — sección «El techo de peso del hospedaje» tras la de caché. `AGENTS.md` — viñeta en «Running and verifying».

**Hallazgos de revisión:** 0 parches, 0 diferidos nuevos, 0 rechazados (sin hallazgos externos en esta pasada). [Superado: la pasada 1 aplicó 19 parches y la 2, 20.]

**Revisión de seguimiento recomendada:** `false` — parches de esta pasada: high 0, medium 0, low 0; puntuación 3×0 + 0 = 0. [Superado: lo vigente es el `followup_review_recommended` del frontmatter.]

**Verificación:**
- Re-medida previa en la base: `FECHA_JORNADA=2026-10-24 npm run build` → manifiesto idéntico al de la planificación y las mismas cifras (anotadas en el Code Map).
- `npx vitest run tests/unit/peso.test.ts` → 38/38 verde.
- `npx vitest run tests/unit/peso-construido.test.ts` → 9/9 verde.
- `npx vitest run tests/unit/peso.test.ts tests/unit/peso-construido.test.ts tests/unit/andamiaje.test.ts tests/unit/barra-final.test.ts tests/unit/indexacion.test.ts tests/unit/trafico.test.ts tests/unit/demanda.test.ts tests/unit/colecciones.test.ts` → 8 ficheros, 313 pruebas, verde.
- `npx astro check` → 0 errores, 0 avisos (22 pistas, ninguna en ficheros tocados).
- `FECHA_JORNADA=2026-10-24 npm run build` con el cambio, sin `MEDICION_ENDPOINT` ni `SITE_URL` → sale 0, sin aviso, con la línea de cifras: desplegado 466.937.424 bytes (445,3 MiB) en 15.339 ficheros; rotan 97.769 en 5; juzgado 466.839.655 (445,2 MiB) en 15.334; Tarjetas 312.472.917 (298 MiB, 66,9 %) en 5.113; PNG 5.116 sin tope. `diff` contra `dist-base-2026-10-24.sha256` vacío: `dist/` no cambia. `dist/` borrado después.
- `npm test` entero con `correr.sh` → 126 ficheros, 5.234 pruebas, verde (663 s).
- Auditoría de la matriz: cada fila tiene prueba que corrió y pasó — por debajo, entre aviso y tope y por encima (pura y construida, con `npm run build` ≠ 0 y el paso solo = 1 sin traza), dos jornadas (pura, con la portada sobre el tope), PNG sin tope y con tope (pura y construida), sin `dist/` y `dist` que no es directorio (construida).

**Riesgos residuales:**
- La medida juzgada incluye `dist/pagefind/`, donde la Cita del Día de la portada deja unos cientos de bytes que varían por jornada hasta la 26.2 (diferido ya anotado): el veredicto solo podría cambiar con el peso a esa distancia de un umbral.
- Un enlace simbólico dentro de `dist/` no se cuenta (solo ficheros regulares); hoy Astro y Pagefind no los producen. [Superado en la pasada 1: el paso los sigue.]
- `GITHUB_ACTIONS` cambia la forma del aviso y del error (anotación), no su contenido ni el código de salida; el flujo de publicación lo pone solo.
- Los valores se revisan tras la 24.6, que engorda la Página de Cita (pendiente de Héctor).

### Pasada de revisión 1 (hallazgos externos), 2026-10-24

Status: done. Blocking condition: ninguna. Sin vuelta atrás por `bad_spec` ni `intent_gap`: todo se resolvía desde el contrato.

**Qué cambió.** El paso recorre `dist/` a mano siguiendo los enlaces simbólicos, como `tar --dereference` del despliegue (salta el que vuelve a un antepasado; uno roto falla la lectura), sin `readdir({ recursive })`. El parte dice el margen hasta el umbral siguiente o el exceso sobre el tope, nombra los ficheros que rotan y faltan, trata un `dist/` sin ficheros como error y anota en Actions también el fallo de lectura (`errorDeLectura`). El aviso dice que qué hacer lo decide Héctor. `escaparAnotacion` pasa a `tools/lib/anotacion.ts`, compartido con `tools/lib/ingresos.ts`. La documentación dice la deriva de Pagefind, la diferencia con la construcción del CI, el relleno del tar, el límite de ficheros de Cloudflare a la altura del aviso y qué deja de construir el tope.

**Ficheros:**
- `integraciones/peso.ts` — recorrido propio que sigue enlaces y salta bucles; `anotar` leído una vez; el fallo de lectura por `errorDeLectura`.
- `tools/lib/peso.ts` — `rotanQueFaltan`, margen en cifras, aviso y error, error con `dist/` vacío, `errorDeLectura`, aviso que remite a Héctor; importa el escapado de `anotacion.ts`.
- `tools/lib/anotacion.ts` — nuevo: `escaparAnotacion`, sin cambios de comportamiento.
- `tools/lib/ingresos.ts` — importa `escaparAnotacion` de `anotacion.ts` en vez de declararlo.
- `tests/unit/peso.test.ts` — 45 pruebas (+7): techo fijado en 1e9, márgenes, faltantes, `dist/` vacío, `errorDeLectura`, pureza transitiva y la guarda de qué superficies leen la jornada.
- `tests/unit/peso-construido.test.ts` — 12 pruebas (+3): cada una escribe sus umbrales; `GITHUB_ACTIONS=true` con aviso y con tope; enlaces simbólicos; `dist/` vacío y anotado; huella con `find -L`; «no altera dist/» con su propio antes y después.
- `tests/unit/ayuda/construir.ts` — `construirProyecto` lanza si la orden ni arranca.
- `tests/unit/ingreso-cli.test.ts` — importa `escaparAnotacion` de su nuevo sitio.
- `src/lib/umbrales.ts` — solo comentarios: la excepción de Pagefind y que qué hacer con el aviso lo decide Héctor.
- `DESPLIEGUE.md`, `AGENTS.md` — lo dicho arriba; «cinco líneas de cifras».

**Hallazgos de revisión:** 19 parches aplicados (1 medium, 18 low), 1 diferido (low), 13 rechazados. Detalle en el Review Triage Log.

**Revisión de seguimiento recomendada:** `true` — parches de esta pasada: high 0, medium 1, low 18; puntuación 3×1 + 18 = 21 (≥ 5).

**Verificación:**
- `npx vitest run tests/unit/peso.test.ts` → 45/45 verde.
- `npx vitest run tests/unit/peso-construido.test.ts` → 12/12 verde; solas con `-t` («solo el paso», «no altera», «enlaces») → verde. Mutación: con `anotar = false` en el paso fallan las tres pruebas anotadas; restaurado.
- `npx vitest run` de `peso`, `peso-construido`, `andamiaje`, `barra-final`, `indexacion`, `trafico`, `demanda` e `ingreso-cli` → 8 ficheros, 300 pruebas, verde.
- `npx astro check` → 0 errores, 0 avisos (22 pistas).
- `FECHA_JORNADA=2026-10-24 npm run build` sin `MEDICION_ENDPOINT`, `SITE_URL` ni `GITHUB_ACTIONS` → sale 0, sin aviso; cifras iguales a la base (desplegado 466.937.424 bytes en 15.339; juzgado 466.839.655, «quedan 319.592.345 bytes (304,8 MiB) hasta el aviso»; Tarjetas 66,9 %; 5.116 PNG). `diff` contra `dist-base-2026-10-24.sha256` vacío; ningún enlace simbólico en `dist/`. `dist/` borrado después.
- `npm test` entero con `correr.sh` → 126 ficheros, 5.245 pruebas, verde (660 s).

**Riesgos residuales:**
- La deriva de unos bytes de `dist/pagefind/` entre jornadas sigue hasta la 26.2 (diferido, ahora con su medida).
- Qué compara GitHub con su 1 GB no está comprobado; la estimación del relleno del tar (≈29 MB en el tope) cabe en los 56 MB entre tope y techo.
- La guarda de la jornada mira `FECHA_JORNADA`, `corpus/portada.json` y sus importadores; una superficie que leyera el reloj de otro modo no la vería.


### Pasada de revisión 2 (hallazgos externos), 2026-10-24

Status: done. Blocking condition: ninguna. Sin vuelta atrás por `bad_spec` ni `intent_gap`: los hallazgos se resolvían dentro del contrato, y los que pedían salirse de él se rechazan con su autoridad.

**Qué cambió.** Sin nada que juzgar —`dist/` vacío o solo con los cinco que rotan— el paso no escribe cifras y sale con 1 diciéndolo. La primera línea dice si `pagefind/` está; `enMiB` escribe «<0,1 MiB» en vez de «0 MiB» para lo que no es cero; el aviso y el error hablan del despliegue solo en el flujo de publicación. Lo que en `dist/` no es fichero ni directorio hace fallar la lectura. Las guardas de prueba se endurecen: la de la jornada resuelve como Vite y barre `integraciones/` y la configuración; la de pureza exige importaciones relativas y sin proceso ni red; una nueva fija que `publicar.yml` construye con `npm run build` antes de subir `dist/`. La ayuda de construcción lanza ante una señal, da `maxBuffer` holgado y limpia la copia si lanza. La documentación da las proyecciones como cotas, el número exacto de ficheros de Pagefind que cambian, cuándo no hay cifras, qué pasa con las exclusiones del empaquetado y que una página nueva que dependa de la jornada va en la lista.

**Ficheros:**
- `tools/lib/peso.ts` — `pagefind` en `MedidaDeDist`; sin cifras ni avisos cuando no hay nada que juzgar (vacío o solo lo que rota); «sin pagefind/»; `enMiB` con «<0,1 MiB»; aviso y error condicionados al flujo de publicación.
- `integraciones/peso.ts` — falla ante lo que no es fichero ni directorio; no escribe cifras vacías; dice que cuenta lo que el empaquetado excluiría.
- `tests/unit/peso.test.ts` — 53 pruebas (+8): `pagefind`, `<0,1 MiB`, solo lo que rota, sin cifras, mensajes del flujo, `publicar.yml`, resolutor sintético; guardas de pureza y de jornada endurecidas.
- `tests/unit/peso-construido.test.ts` — 13 pruebas (+1): `mkfifo`, `dist/` solo con la portada, aviso con tope y «lo decide Héctor», stderr por línea, señal y `maxBuffer` en `correrElPaso`.
- `tests/unit/ayuda/construir.ts` — `construirConCorpus` limpia la copia si la construcción o Pagefind lanzan; `construirProyecto` con `maxBuffer` de 64 MiB y que lanza ante una señal.
- `src/lib/umbrales.ts` — solo comentarios: cotas de las proyecciones y el despliegue dicho del flujo de publicación.
- `AGENTS.md` — cuándo hay cinco líneas; la lista de lo que rota para páginas nuevas.
- `DESPLIEGUE.md` — cotas, 40 ficheros de Pagefind, sin cifras sin nada que juzgar, exclusiones del empaquetado, tabla con el flujo de publicación.

**Hallazgos de revisión:** 20 parches aplicados (20 low), 0 diferidos, 23 rechazados. Detalle en el Review Triage Log.

**Revisión de seguimiento recomendada:** `true` — parches de esta pasada: high 0, medium 0, low 20; puntuación 3×0 + 20 = 20 (≥ 5).

**Verificación:**
- `npx vitest run tests/unit/peso.test.ts` → 53/53 verde. Mutaciones: una página sonda que importa `'../lib/citaDelDia.js'`, y otra a través de un módulo que solo reexporta, hacen fallar la guarda de la jornada; un `import … from 'fs'` en `tools/lib/peso.ts` hace fallar la de pureza. Restaurado.
- `npx vitest run tests/unit/peso-construido.test.ts` (con `correr.sh`) → 13/13 verde.
- `npx vitest run` de `andamiaje`, `barra-final`, `indexacion`, `trafico`, `demanda` e `ingreso-cli` → 6 ficheros, 243 pruebas, verde.
- `npx astro check` → 0 errores, 0 avisos (22 pistas).
- `FECHA_JORNADA=2026-10-24 npm run build` sin `MEDICION_ENDPOINT`, `SITE_URL` ni `GITHUB_ACTIONS` → sale 0, sin aviso; cifras iguales a la base («pagefind/ incluido», juzgado 466.839.655 bytes, «quedan 319.592.345 bytes (304,8 MiB) hasta el aviso», Tarjetas 66,9 %, 5.116 PNG). `diff` contra `dist-base-2026-10-24.sha256` vacío; ningún enlace simbólico. `dist/` borrado después.
- `npm test` entero con `correr.sh` → 126 ficheros, 5.254 pruebas, verde (656 s).

**Riesgos residuales:**
- La deriva de unos bytes de `dist/pagefind/` entre jornadas sigue hasta la 26.2 (diferido).
- Qué compara GitHub con su 1 GB, y qué excluye por nombre la versión de `upload-pages-artifact` en uso, no está comprobado; el paso cuenta de más, nunca de menos.
- La guarda de la jornada es textual: sigue las importaciones relativas en sus formas habituales, pero no un `import.meta.glob` ni una superficie que leyera el reloj sin `FECHA_JORNADA` ni la portada.


### Pasada de revisión 3 (hallazgos externos), 2026-10-24

Status: done. Blocking condition: ninguna. Sin vuelta atrás por `bad_spec` ni `intent_gap`: los hallazgos se resolvían dentro del contrato, y los que pedían salirse de él —un margen fijo bajo el techo, juzgar lo desplegado entero— se rechazan con su autoridad.

**Qué cambió.** Sin nada que juzgar el parte omite también los veredictos, no solo las cifras. Un enlace simbólico roto se nombra como tal, con su destino; el recorrido hace un solo `stat` por entrada. El error del tope ya no prescribe el remedio: lo decide Héctor, como en el aviso. Las guardas de prueba se endurecen: la de la jornada compara solo lo que escribe en `dist/` (páginas, integraciones y configuración) y falla ante un alias o un `import.meta.glob` que no sabe seguir; la de `publicar.yml` exige que entre la medida y la subida no haya acciones de terceros ni pasos que nombren `dist`; una nueva fija que el paso solo importa de Node lectura de disco y rutas. `AGENTS.md` lleva la regla de la página nueva que depende de la jornada a «Known pitfalls»; `DESPLIEGUE.md` dice que `SITE_URL` no cambia la medida mientras no se defina; la Verification del spec dice cómo regenerar el manifiesto de base.

**Ficheros:**
- `integraciones/peso.ts` — un `stat` por entrada; enlace roto con nombre y destino; cabecera sin «siempre».
- `tools/lib/peso.ts` — `veredictos` opcional y omitido sin nada que juzgar; error del tope que remite a Héctor.
- `tests/unit/peso.test.ts` — 56 pruebas (+3): `claseDe` y la prueba de que ninguna importación se escapa; guarda de la jornada sobre lo que escribe en `dist/`; pasos entre la medida y la subida; «no escribe nada» por sus importaciones; veredictos ausentes; error que remite a Héctor; `sinComentarios` compartido.
- `tests/unit/peso-construido.test.ts` — el enlace roto se nombra con su destino.
- `AGENTS.md` — la viñeta nombra los tres casos sin cifras; la regla de la jornada, en «Known pitfalls».
- `DESPLIEGUE.md` — `SITE_URL` y la medida.
- Este spec — Tasks de `integraciones/peso.ts` y receta del manifiesto de base en la Verification.

**Hallazgos de revisión:** 13 parches aplicados (13 low), 0 diferidos, 28 rechazados. Detalle en el Review Triage Log.

**Revisión de seguimiento recomendada:** `true` — parches de esta pasada: high 0, medium 0, low 13; puntuación 3×0 + 13 = 13 (≥ 5).

**Verificación:**
- `npx vitest run tests/unit/peso.test.ts` → 56/56 verde. Mutaciones, restauradas después: un componente que importa `citaDelDia` usado por una página sonda hace fallar la guarda de la jornada nombrando la página y no el componente; una página sonda con `'~/lib/citaDelDia'` e `import.meta.glob` hace fallar la de las importaciones con los dos; un `cp public/CNAME dist/CNAME` entre la medida y la subida hace fallar la de `publicar.yml`; `writeFile` en la importación del paso hace fallar la de «no escribe nada».
- `npx vitest run tests/unit/peso-construido.test.ts` (con `correr.sh`) → 13/13 verde.
- `npx vitest run` de `peso`, `andamiaje`, `barra-final`, `indexacion`, `trafico`, `demanda` e `ingreso-cli` → 7 ficheros, 299 pruebas, verde.
- `npx astro check` → 0 errores, 0 avisos (22 pistas).
- `FECHA_JORNADA=2026-10-24 npm run build` sin `MEDICION_ENDPOINT`, `SITE_URL` ni `GITHUB_ACTIONS` → sale 0, sin aviso; cifras iguales a la base (desplegado 466.937.424 bytes en 15.339, «pagefind/ incluido»; juzgado 466.839.655, «quedan 319.592.345 bytes (304,8 MiB) hasta el aviso»; Tarjetas 66,9 %; 5.116 PNG). `diff` contra `dist-base-2026-10-24.sha256` vacío; ningún enlace simbólico. `dist/` borrado después.
- `npm test` entero con `correr.sh` → 126 ficheros, 5.257 pruebas, verde (657 s).

**Riesgos residuales:**
- La deriva de unos bytes de `dist/pagefind/` entre jornadas sigue hasta la 26.2 (diferido).
- Qué compara GitHub con su 1 GB no está comprobado; el paso cuenta de más, nunca de menos, y la holgura entre tope y techo la decide Héctor con los valores.
- La guarda de la jornada es textual: sigue y clasifica todas las importaciones, pero no ve una superficie que leyera el reloj sin `FECHA_JORNADA` ni la portada; lo que hace `npm test` por dentro entre la medida y la subida tampoco se ve desde `publicar.yml`.

