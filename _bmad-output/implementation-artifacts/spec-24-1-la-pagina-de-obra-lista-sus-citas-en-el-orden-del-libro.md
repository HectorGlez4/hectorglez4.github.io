---
title: 'Historia 24.1 — La Página de Obra lista sus Citas en el orden del libro'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_revision: '7886273b8fb051ac47f3932e684b122268f819f4'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-24-context.md'
warnings:
  - oversized
deferred: []
---

<intent-contract>

## Intent

**Problem:** La Página de Obra ordena sus Citas por slug en su propio `getStaticPaths`, así que recorrerla es leer un índice alfabético y no hojear la obra; y no existe ningún dato de dónde cae cada Cita en su documento del que pudieran colgar el listado, «Siguiente» (24.5) ni «De la misma obra» (24.6).

**Approach:** Un cargador de contenido `posiciones` en `src/content.config.ts` (patrón del de biografías) que solo cablea una composición pura de `tools/lib/` —mismo lector de Citas y de documentos que el cotejo, mismo casado (`documentosDeCita`) y **el mismo** localizador— y entrega `{slug → [{documento, posicion}]}`; `src/lib/obras.ts` recibe esas posiciones por parámetro y es el único que ordena; la página toma ese orden. De paso, `content.config.ts` pasa a tomar `z` de `astro/zod`.

## Boundaries & Constraints

**Always:**
- `content.config.ts` importa `z` de `astro/zod` y `defineCollection`/`reference` siguen de `astro:content`; las colecciones admiten y rechazan exactamente lo mismo.
- Un único localizador en `tools/lib/cotejo.ts`: `localizar(buscado, cuerpo)` = `indexOf` sobre formas ya pasadas por `colapsarEspacios` (texto vacío → -1); `apareceEnDocumento` pasa a ser `localizar(colapsarEspacios(texto), colapsarEspacios(cuerpo)) !== -1`.
- La composición (`tools/lib/posiciones.ts`) lee con `leerCitas` y `leerDocumentosDeFuente` de `tools/lib/corpus.ts`, casa con `documentosDeCita` (prefijo, sin biografías, solo cuerpos legibles) y localiza con `localizar`. Guarda una aparición por documento del conjunto en que aparece el texto (la primera posición en ese documento), sin ordenar, sin elegir y sin texto. Clave: el `slug` del frontmatter. Una Cita sin apariciones (censo, sin Fuente) queda con lista vacía.
- `content.config.ts` solo cablea: lee `config.root`, llama a la composición y hace `store.set` por Cita publicada (también las de lista vacía, para que la colección no quede vacía con Citas); vigila `corpus/citas` y `corpus/fuentes` en desarrollo como el de biografías. Sin `base: './corpus/…'` y sin red.
- `src/lib/obras.ts` es el único que ordena (AD-5, AD-25): Fuente = `cita.fuente.id`; primero la Fuente con más Citas con alguna aparición, a igualdad el id menor (comparación de unidades de código); dentro, documento por `compararDocumentos` (orden natural, romanos leídos); la Cita toma su aparición del primer documento en ese orden; luego posición; a igual documento y posición, slug (`localeCompare(…, 'es')`); al final, por slug, las Citas sin Fuente o sin apariciones. Mismo orden para Obra indexable, con `noindex` o congelada (no recibe indexabilidad).
- Ningún módulo de `src/lib/` importa de `tools/lib/`; las páginas no llaman a `getCollection` (lo hace la fachada de `publicado.ts`).
- Medidas sobre el Corpus real del worktree con `FECHA_JORNADA` fija e igual en las dos construcciones; se anotan en la sección `## Medidas` de este spec.

**Block If:**
- Astro se niega a cargar `tools/lib/corpus.ts` desde `content.config.ts` y cumplir el AC exigiría otro lector o mover la composición a `src/` → HALT `blocked` (decide Héctor).
- La comparación de `dist/` antes/después muestra diferencias de HTML fuera de `dist/obra/` (o de ficheros fuera de `dist/obra/` y `dist/pagefind/`) que no se expliquen por no-determinismo ajeno a esta historia → HALT `blocked` con la lista.
- Cumplir un criterio exigiría editar `_bmad-output/planning-artifacts/`, `_bmad-output/specs/` o el contenido de `corpus/`.

**Never:**
- Guardar la posición en ningún fichero de Cita ni escribir nada en `corpus/`; segundo localizador (`indexOf`, `includes`, `search`, `match` sobre cuerpos fuera de `localizar`); ordenar Citas de una Obra fuera de `obras.ts`.
- Leer `procedencia.obra` en `src/` fuera de `obras.ts`/`admision.ts` (la prueba de la 22.3 pasa sin añadir permitidos).
- Capturar el índice de subpáginas de la Fuente o escribir un detector de desorden (aplazado por la historia).
- Cambiar el orden que devuelve `documentosDeCita` (es el de los mensajes del cotejo) o cualquier semántica del cotejo.
- Pintar ninguna línea, subrótulo o rótulo que diga cuál es el orden; tocar las Tarjetas (siguen sin Autor ni título de Obra).
- Fuera de alcance: `lastmod`/`relacionDeSuperficies` por documentos (24.8), «Siguiente» y «De la misma obra» (24.5, 24.6), búsqueda (27.x).

## I/O & Edge-Case Matrix

| Escenario | Entrada / estado | Resultado esperado |
|---|---|---|
| Un documento | a (pos 30), b (pos 10), mismo doc | `[b, a]` |
| Varias Fuentes | `wikisource-es` 3 Citas, `gutenberg` 2 | las 3 de `wikisource-es` primero; con 2–2, `gutenberg` primero |
| Paginada | `…--la-ciudad-de-dios--la-ciudad-de-dios-{proemio,i,ii,ix,x}`, `…-libro-2` / `-10`, doc corto y sus páginas | proemio, i, ii, ix, x; 2 antes que 10; el corto antes que sus páginas |
| Varias apariciones | c en `…-ii` (pos 500) y en `…-x` (pos 3) | c toma `…-ii`, pos 500 |
| Empate | mismo doc y pos | decide el slug |
| Sin documento | sin `fuente`, o posiciones vacías/ausentes | al final, por slug |
| Permutación | apariciones, entradas del mapa y Citas en otro orden | mismo resultado |
| Cargador | censo (sin Fuente); texto vacío; doc `null` o biografía mal colocada; texto en dos docs; fichero `x.md` con `slug: y` | `[]`; `[]`; no entra; dos apariciones; clave `y` |

</intent-contract>

## Code Map

- `src/content.config.ts:5` -- `z` desde `astro:content` → `astro/zod` (como `src/lib/admision.ts:16`). Patrón a copiar: `cargadorDeBiografias` 215-257 (`store.clear`, `parseData`, `store.set`, `watcher`); `export const collections` 270.
- `tools/lib/cotejo.ts:52-66` -- `colapsarEspacios`, `apareceEnDocumento` (hoy `includes`); 222-246 `documentosDeCita` (no tocar su orden); 307 `DocumentosDeFuente`; 313 `BIOGRAFIA_MAL_COLOCADA`. Otros usuarios de `apareceEnDocumento`: `cotejar` 512, `cotejarBiografias` 824, `tools/lib/documentacion.ts:522,962`.
- `tools/lib/corpus.ts:342` `rutasDelCorpus`, `:695` `leerCitas` (frontmatter crudo, lanza nombrando el fichero), `:1011` `leerDocumentosDeFuente` (valor = cuerpo, `null` o marca de biografía). Su grafo de importación ya lo carga la configuración vía `integraciones/cotejo.ts`.
- `tools/lib/posiciones.ts` (nuevo) -- `posicionesDeCitas(citas, documentos)` pura y `leerPosicionesDelCorpus(raizDelCorpus)`; importa el tipo de la aparición de `src/lib/obras.ts` (dirección permitida).
- `src/lib/obras.ts` -- puro (AD-5); añadir `AparicionDeCita {documento; posicion}`, `PosicionesDeCitas = ReadonlyMap<string, readonly AparicionDeCita[]>`, `compararDocumentos`, `ordenDelLibro<C extends {slug; fuente?: {id} | null}>(citas, posiciones)`.
- `src/lib/publicado.ts` -- añadir `citasPorObra(citas, posiciones)` puro (agrupa por `cita.obra.nombre` y ordena con `ordenDelLibro`) y la fachada `citasDeLasObras(conjunto)`, memorizada por conjunto (como `rutasIndexablesPorConjunto` ~597) y con `import('astro:content')` dinámico (como `conjuntoPublicable` 862); sin Citas con Obra no consulta la colección. No añadir campos a `ConjuntoPublicable` (pruebas y `tools/indexacion.ts` lo construyen a mano).
- `src/pages/obra/[autor]/[slug]/[...page].astro:50-55,68` -- quitar el `sort` por slug y el agrupado en línea; usar `citasDeLasObras`. `DatosDeObra.astro` sigue el orden de `pagina.data` sin cambios.
- `tests/unit/ayuda/construir.ts:360-420` -- `documentosDeFuenteDe`: documento automático por (Fuente, obra) con los textos en el orden de inserción de las claves del fixture; se apaga si el fixture trae `pendientes-de-cotejo.yml`; una ruta `fuentes/…` explícita no se pisa.
- `tests/unit/obra-pagina.test.ts` -- 71-80 Cartas (inserción 0,1,2); 340-345 prueba de listado «en el orden de la Página de Autor»; 698-766 construcción 22.6 (censo, documentos explícitos); 845-890 construcción con congelación.
- Guardianes que deben seguir verdes sin tocarlos: `tests/unit/obras.test.ts:1053` (22.3), `tests/unit/aislamiento-de-revision.test.ts:119-133` (bases exactas), `tests/unit/andamiaje.test.ts` (sin red), `tests/unit/publicado.test.ts:233-252` (sin `getCollection` en `.astro`; núcleo sin Astro en ejecución), `tests/unit/puerta-de-admision.test.ts`.

## Tasks & Acceptance

**Execution:**
- Medida «antes», con el árbol limpio y antes de tocar código: fijar la jornada de hoy (`date +%F`) y escribirla literal en las dos órdenes; `/Users/hec/brainlySabiduria/.claude/v8-ralph/correr.sh /Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-24-26/24-1-build-antes.log /Users/hec/brainlySabiduria/.claude/worktrees/v8-epicas-24-26 env FECHA_JORNADA=<jornada de hoy> /usr/bin/time -p npm run build`, esperar con llamadas sucesivas a `/Users/hec/brainlySabiduria/.claude/v8-ralph/esperar.pl <ese log> 540`; mover `dist/` a un directorio de `mktemp -d` (en adelante `$ANTES`) -- la cifra de la historia.
- `tools/lib/cotejo.ts` -- añadir `localizar` y reescribir `apareceEnDocumento` sobre él -- un solo localizador (AD-23).
- `src/lib/obras.ts` -- tipos, `compararDocumentos` y `ordenDelLibro` según Always y Design Notes -- dueño único del orden.
- `tools/lib/posiciones.ts` -- composición pura agrupando las Citas por `documentoDeCita(fuente, obra)` y colapsando cada cuerpo una sola vez por grupo; lector que la alimenta desde disco -- la lógica fuera de `content.config.ts`.
- `src/content.config.ts` -- `z` de `astro/zod`; `cargadorDePosiciones` y colección `posiciones` con esquema `{ apariciones: [{ documento: string min 1, posicion: entero ≥ 0 }] }` y comentario de cabecera como el de biografías -- solo cablea.
- `src/lib/publicado.ts` -- `citasPorObra` y `citasDeLasObras` -- lo enumerado sale del dueño (AD-11).
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- toma el orden de la fachada; comentario de la línea 50 al orden del libro.
- `tests/unit/orden-del-libro.test.ts` (nuevo, sin construir) -- la matriz entera sobre `ordenDelLibro` y `posicionesDeCitas`; orden natural con nombres reales de `corpus/fuentes/` escritos en la prueba (la-ciudad-de-dios proemio/i/…/xi, el-zarco capítulo i…xx, conde-lucanor ejemplo 1/2/10/19, oráculo aforismos 1-25/26-50/101-125, plenitud iii/iv/ix/l/li/lv, ariel corto y paginado); permutación (AD-23 primera); Corpus real sin construir: alguna Obra resuelta (`colgarObras` con `leerFichasDeObra`) de varias Citas documentadas sale distinta del orden por slug, las del censo no tienen apariciones y ningún frontmatter de Cita trae `posicion`/`posiciones`/`apariciones` (AD-23 segunda); equivalencia aparición ⇔ `apareceEnDocumento` y `posicion` = `indexOf` colapsado; estructurales: ningún fichero de `src/lib/` importa (estático, `export … from` o `import()`) de `tools/lib/`, `content.config.ts` no toma `z` de `astro:content` e importa de `tools/lib/` solo `posiciones.ts`, y `tools/lib/posiciones.ts` (sin comentarios) no contiene `indexOf`, `includes(`, `search(` ni `match(` e importa `leerCitas`, `leerDocumentosDeFuente`, `documentosDeCita` y `localizar`.
- `tests/unit/obra-pagina.test.ts` -- sin construcciones nuevas: Cartas se inserta 2,1,0 y la prueba de listado pasa a «en el orden del libro» con `[cartas-2, cartas-1, cartas-0]` (indexable); nueva prueba en la construcción 22.4: «Sobre la brevedad» (noindex) página 1 = `brevedad-0…49` en orden numérico, página 2 = `[brevedad-50]`, `itemListElement` de cada página con las mismas URL en el mismo orden y `position` 1…50 / 51, nada entre `</header>` y `<ul class="listado"`, sin `class="autor"`, y los `citas/*.md` del proyecto idénticos al fixture tras construir; en la de congelación, Cartas (congelada fuera) `[cartas-2, cartas-1, cartas-0]`; en la 22.6: el documento de «Sobre la brevedad» lleva `[B2, B1]`, «Epístolas morales» pasa a dos documentos `…--epistolas-morales--epistolas-morales-carta-x` (E1) y `…-carta-ii` (E2), y la Cita cotejada de Cartas se renombra `seneca-sabio-por-casualidad`; nueva prueba: `[brevedad-2, brevedad-1, la-vida-si-sabes-usarla-es-larga]`, `[epistolas-2, epistolas-1]`, `[sabio-por-casualidad, mientras-esperamos-vivir-la-vida-pasa, ninguna-cosa-se-parece-tanto-a-la]`; las aserciones 22.6 existentes no cambian.
- `AGENTS.md` -- bajo «La Página de Obra (Historia 22.4)», un párrafo «El orden del libro (Historia 24.1)»: cargador `posiciones`, dueño `obras.ts`, regla natural con romanos, índice de subpáginas aplazado sin detector.
- Medida «después», igual que la de antes y con la misma jornada, en `/Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-24-26/24-1-build-despues.log`; `diff -rq "$ANTES" dist`; anotar en `## Medidas` los dos `real`, la diferencia, y el resultado del diff (número de ficheros distintos en `obra/`, en `pagefind/` y fuera); borrar `$ANTES`.

**Acceptance Criteria:**
- Given el repositorio tras la migración de `z`, when corren `npx vitest run tests/unit/puerta-de-admision.test.ts` y `npm run check`, then pasan sin haberlos tocado.
- Given el sitio construido, when se abre la Página de Obra de cualquier Obra (indexable, `noindex` o congelada), then su listado y su `ItemList` siguen el orden del libro en todas sus páginas, la página 2 empieza por la Cita 51 del libro, y no aparece ninguna línea que nombre el orden.
- Given la colección `posiciones` cargada, when se lee, then cada Cita publicada tiene su `slug` del frontmatter como clave y una aparición por documento en que aparece su texto, sin texto guardado, y ningún fichero de `corpus/` cambia.
- Given la suite de Vitest, when corren `orden-del-libro.test.ts`, `obras.test.ts` y `cotejo.test.ts`, then la permutación no cambia el orden, alguna Obra real sale distinta del orden por slug, ningún `src/lib/` importa de `tools/lib/` y la prueba de la 22.3 pasa sin permitidos nuevos.
- Given las dos construcciones de `npm run build` sobre el Corpus real en la misma jornada, when se comparan, then el spec anota las dos duraciones y el HTML solo cambia bajo `dist/obra/`, además de `dist/pagefind/`.

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

Las cinco capas de revisión (blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor) son externas en el bucle v8-ralph y la invocación de esta pasada no trae ninguna sección «## Hallazgos externos»: ninguna tiene hallazgos en esta pasada. La revisión independiente viene después.

## Design Notes

**Medido al planificar (2026-10-25, Corpus del worktree):** 4.420 Citas y 1.421 documentos (155 MB); 19.676 pares Cita–documento candidato (1,15 GB de cuerpo). Localizar colapsando el cuerpo en cada par: 12,3 s; colapsando cada cuerpo una vez: 1,3 s, más ~0,7 s de `leerCitas` y ~0,9 s de `leerDocumentosDeFuente`. Hoy ninguna Cita aparece en más de un documento, y 270 de 335 grupos (Autor, obra) de varias Citas difieren del orden por slug. Por eso `localizar` recibe formas ya colapsadas: es el mismo `indexOf` para el cotejo y para el cargador, y la composición puede colapsar cada cuerpo una sola vez.

**Orden natural (`compararDocumentos`):** se trocea el nombre del documento por `-` (los segmentos vacíos de `--` cuentan como palabra vacía). Un trozo es número si es `^\d+$` o un romano en forma canónica minúscula (`^m{0,3}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$`, no vacío). Número con número: por valor y, a igual valor, por cadena; palabra con palabra: por unidades de código; **palabra antes que número** —en el Corpus es «proemio» antes de «i» en *La ciudad de Dios* y en *Dafnis y Cloe*—; si una lista es prefijo de la otra, la corta primero. Como los documentos de una Obra comparten `{fuente}--{obra}`, equivale al orden del slug de página. Límite aceptado: «mi» se lee 1001 (solo en *Recuerdos de provincia*, sin efecto); lo corrige el índice de subpáginas cuando se capture.

```ts
// clave de una Cita documentada (las demás van detrás, por slug)
[rangoDeFuente(cita.fuente.id), primerDocumento /* por compararDocumentos */, posicion, cita.slug]
```

## Medidas

Corpus real del worktree, `FECHA_JORNADA=2026-10-25` en las dos construcciones, `env FECHA_JORNADA=2026-10-25 /usr/bin/time -p npm run build` desde el árbol limpio (antes, en `7886273b8f`) y con la historia aplicada (después). Logs: `/Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-24-26/24-1-build-antes.log` y `24-1-build-despues.log`.

| | antes | después | diferencia |
|---|---|---|---|
| `real` de `npm run build` | 122,29 s | 93,95 s | −28,34 s |
| `user` / `sys` | 101,75 s / 20,88 s | 102,06 s / 33,62 s | +0,31 s / +12,74 s |
| `[content] Syncing` → `Synced` | ~2 s (19:41:19 → 19:41:21) | ~4 s (19:55:24 → 19:55:28) | ~+2 s |

La diferencia de `real` es ruido de caché, no ganancia: la de antes fue la primera construcción del worktree tras `npm ci`. El coste propio del cargador `posiciones` se ve en la sincronización de contenido, ~2 s más (lectura de Citas y documentos y localización con cada cuerpo colapsado una vez por grupo), coherente con los ~2,9 s medidos al planificar. `npm run check` sincroniza el contenido con el cargador en 3 s.

`diff -rq "$ANTES" dist` (824 líneas): **299 ficheros distintos en `dist/obra/`**, todos `index.html` (269 páginas 1 y 30 páginas 2+); **525 en `dist/pagefind/`** (`pagefind-entry.json` distinto y 524 fragmentos y metadatos con nombre por contenido presentes en un solo lado); **0 fuera de `dist/obra/` y `dist/pagefind/`**. Comprobación a ojo: *La ciudad de Dios* (46 Citas) sale por libro ii, iv, iv, iv, v, vii… y posición; *El Zarco*, capítulos iv, vii, xvi, xx. `$ANTES` y `dist/` borrados tras comparar.

## Verification

**Commands:**
Desde `/Users/hec/brainlySabiduria/.claude/worktrees/v8-epicas-24-26`, un fichero por orden; lo que pueda pasar de ~8 min, con `/Users/hec/brainlySabiduria/.claude/v8-ralph/correr.sh /Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-24-26/24-1-<nombre>.log /Users/hec/brainlySabiduria/.claude/worktrees/v8-epicas-24-26 <orden>` y `esperar.pl`.
- `npx vitest run tests/unit/orden-del-libro.test.ts` -- verde.
- `npx vitest run tests/unit/<f>.test.ts` para cada uno de `cotejo`, `documentacion`, `puerta-de-admision`, `obras`, `publicado`, `aislamiento-de-revision`, `andamiaje` -- verdes.
- `npx vitest run tests/unit/obra-pagina.test.ts`, en segundo plano (varias construcciones) -- `FINISHED EXIT=0`.
- Igual, uno a uno, los que construyen Páginas de Obra: `obra-construida`, `lista-de-obras`, `ediciones-en-venta`, `ingreso-construido`, `publicable-y-alcanzable`, `congelacion-de-obras`, `traduccion-construida`, `cotejo-build`, `espinas-de-ux` -- verdes.
- `npm run check` -- 0 errores.
- `npm test` en segundo plano (≈16 min), log `24-1-npm-test.log` -- `FINISHED EXIT=0`.
- Las dos construcciones de la medida y `diff -rq` -- según el último criterio de aceptación.

## Auto Run Result

Status: done
Blocking condition: ninguna. Planificación cerrada el 2026-10-25 en `v8/epicas-24-26`; implementada, verificada y cerrada el mismo día en la misma rama, sin push.

**Lo implementado.** La Página de Obra lista sus Citas en el orden del libro en todas sus páginas y en su `ItemList`, sin ninguna línea que lo diga. Un cargador de contenido `posiciones` en `src/content.config.ts` (al patrón del de biografías) solo cablea `tools/lib/posiciones.ts`, que lee Citas y documentos con los lectores del cotejo, los casa con `documentosDeCita` y los localiza con `localizar`, el único localizador, del que ahora sale también `apareceEnDocumento`. Entrega, por el `slug` del frontmatter, `{documento, posicion}` por documento en que aparece el texto, sin texto, sin elegir y sin escribir nada en `corpus/`. `src/lib/obras.ts` es el único que ordena (`ordenDelLibro`, `compararDocumentos`), con las posiciones por parámetro; `src/lib/publicado.ts` agrupa (`citasPorObra`) y da la fachada memorizada (`citasDeLasObras`), y la página la usa en lugar de su `sort` por slug. `content.config.ts` toma `z` de `astro/zod`.

**Ficheros:**
- `tools/lib/cotejo.ts` — `localizar(buscado, cuerpo)` sobre formas colapsadas (vacío → -1); `apareceEnDocumento` pasa a usarlo.
- `tools/lib/posiciones.ts` (nuevo) — `posicionesDeCitas` pura, agrupando por documento corto y colapsando cada cuerpo una vez por grupo; `leerPosicionesDelCorpus`, su lector de disco.
- `src/lib/obras.ts` — `AparicionDeCita`, `PosicionesDeCitas`, `compararDocumentos` (orden natural con romanos canónicos, palabra antes que número, corto antes que sus páginas) y `ordenDelLibro`.
- `src/lib/publicado.ts` — `citasPorObra` (puro) y `citasDeLasObras` (fachada memorizada por conjunto, `import('astro:content')` dinámico, sin consultar la colección si ninguna Cita tiene Obra).
- `src/content.config.ts` — `z` de `astro/zod`; `cargadorDePosiciones` y colección `posiciones` con su esquema, vigilando `corpus/citas` y `corpus/fuentes` en desarrollo.
- `src/pages/obra/[autor]/[slug]/[...page].astro` — toma el agrupado y el orden de `citasDeLasObras`.
- `tests/unit/orden-del-libro.test.ts` (nuevo, sin construir) — la matriz entera, el orden natural con nombres reales de `corpus/fuentes/`, la permutación, el lector de disco (clave `y` para `x.md`, documento ilegible fuera, ningún fichero tocado), el Corpus real (entrada por Cita, censo sin apariciones, equivalencia con `apareceEnDocumento` y la posición, alguna Obra distinta del orden por slug, ningún frontmatter con posición) y los estructurales.
- `tests/unit/obra-pagina.test.ts` — Cartas insertadas 2, 1, 0 y el listado «en el orden del libro»; «Sobre la brevedad» paginada y `noindex` con su `ItemList`; construir no toca los ficheros de Cita; la congelación con el mismo orden; en la 22.6, `[B2, B1]`, Epístolas en dos páginas (carta-ii y carta-x) y la cotejada de Cartas renombrada, con la prueba nueva del orden.
- `AGENTS.md` — el párrafo «El orden del libro (Historia 24.1)» bajo la Página de Obra.

**Revisión:** 0 parches, 0 diferidos, 0 rechazados (capas externas sin hallazgos en esta pasada). Revisión de seguimiento: 0 parches altos, 0 medios, 0 bajos; puntuación 0 → `followup_review_recommended: false`.

**Verificación** (logs en `/Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-24-26/`):
- `npx vitest run tests/unit/orden-del-libro.test.ts` — 34/34 verde (~16 s; la equivalencia sobre el Corpus real, ~12,5 s).
- `cotejo`, `documentacion`, `obras`, `publicado`, `andamiaje` — verdes (la guarda «ningún fichero de src/lib/ nombra el cotejo» cazó un comentario de `obras.ts`, reescrito); `puerta-de-admision` 12/12 y `aislamiento-de-revision` 6/6 sin tocarlas.
- `obra-pagina.test.ts` — 56/56, `FINISHED EXIT=0`.
- Uno a uno (`24-1-construyen.log`): `obra-construida` 16, `lista-de-obras` 18, `ediciones-en-venta` 44, `ingreso-construido` 38, `publicable-y-alcanzable` 30, `congelacion-de-obras` 4, `traduccion-construida` 6, `cotejo-build` 20, `espinas-de-ux` 10 — todas verdes.
- `npm run check` — 0 errores, 0 avisos (dos veces; la última tras los cambios finales).
- `npm test` (`24-1-npm-test.log`) — 133 ficheros, 6.087 pruebas, `FINISHED EXIT=0` (705 s).
- Medidas antes/después y `diff -rq`: ver `## Medidas` — HTML distinto solo en `dist/obra/` (299) y `dist/pagefind/` (525), 0 fuera.
- Auditoría de la matriz: cada fila tiene prueba que corrió y pasó en `orden-del-libro.test.ts` (un documento, varias Fuentes 3–2 y 2–2, paginada con proemio/romanos/2 y 10/corto, varias apariciones, empate, sin documento, permutación, y el cargador: censo, texto vacío, `null` y biografía, dos documentos, `x.md` con `slug: y`).

**Riesgos que quedan:**
- El orden natural lee como romano toda palabra que sea romano canónico («mi», «di»): aceptado por la historia hasta que se capture el índice de subpáginas de la Fuente; no hay detector de desorden.
- El cargador lee el Corpus y los documentos una segunda vez por construcción (el cotejo los lee en `astro:build:start`): ~2 s medidos en la sincronización de contenido, y la memoria de los cuerpos colapsados de un grupo a la vez.
- En desarrollo, dos cambios seguidos pueden lanzar dos recargas del cargador a la vez, igual que el de biografías.
