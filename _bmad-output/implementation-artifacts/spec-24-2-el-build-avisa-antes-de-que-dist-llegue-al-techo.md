---
title: 'Historia 24.2 — El build avisa antes de que dist/ llegue al techo del alojamiento'
type: 'feature'
created: '2026-10-24'
status: 'in-progress'
baseline_revision: 'e51daf84b76342c2befb17d0c5148a058289dda6'
review_loop_iteration: 0
followup_review_recommended: false
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
- `tools/lib/peso.ts` -- puro: `FICHEROS_QUE_ROTAN_CON_LA_JORNADA`; `medirDist(ficheros: {ruta, bytes}[])` → desplegado, rotan, juzgado (bytes y ficheros), tarjetas (`tarjeta/…`, dentro de lo juzgado) y PNG (dentro de lo juzgado); `veredictoDePeso(juzgado, {aviso, tope})`; `veredictoDePng(n, tope | undefined)`; y el parte (líneas de cifras, avisos, error, con o sin anotación de Actions) -- decisiones probables sin disco.
- `integraciones/peso.ts` -- recorre `dist/` (regulares, `lstat`/`stat`), llama a lo puro, escribe cifras por stdout y avisos/error por stderr, sale 1 sobre el tope o sin `dist/` -- la cáscara.
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
- `FECHA_JORNADA=2026-10-24 npm run build` (sin `MEDICION_ENDPOINT` ni `SITE_URL`), luego `(cd dist && find . -type f -print0 | sort -z | xargs -0 shasum -a 256) | diff - /Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-24-2/dist-base-2026-10-24.sha256` -- sale 0 sin aviso y el diff está vacío. Si difiere, reconstruir la base en `e51daf84b7` antes de culpar al cambio; borrar `dist/` al terminar.
- `npm test` entero con `correr.sh` -- verde.

## Auto Run Result

Status: ready-for-dev
Blocking condition: ninguna. Planificación cerrada (halt after planning) sobre `e51daf84b76342c2befb17d0c5148a058289dda6`; `dist/` medido el 2026-10-24 y borrado tras guardar su manifiesto.
