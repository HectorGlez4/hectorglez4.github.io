---
title: 'Historia 24.1 — La Página de Obra lista sus Citas en el orden del libro'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_revision: '7886273b8fb051ac47f3932e684b122268f819f4'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-24-context.md'
warnings:
  - oversized
deferred:
  - summary: >-
      La primera Obra desordenada ya existe: Novelas ejemplares (y Vidas paralelas, Recuerdos de provincia y Novelas y cuadros de la vida sur-americana) nombra sus páginas por título, así que el orden natural las lista por orden alfabético y no por el del libro; la 24.1 aplaza el índice de subpáginas de la Fuente «hasta la primera Obra que salga desordenada».
    evidence: |-
      Sobre el Corpus del worktree (2026-10-25), con posicionesDeCitas y compararDocumentos:
      wikisource-es--novelas-ejemplares lista el-coloquio-de-los-perros (4 Citas, la última
      novela de 1613) antes que la-gitanilla (3 Citas, la primera); vidas-paralelas lista
      ciceron antes que pericles; recuerdos-de-provincia y novelas-y-cuadros van por título.
      Es el límite que la historia acepta (no hay detector ni índice), y la condición con la
      que la épica aplaza el índice ya se cumple: decidir si se captura, y en qué historia, es
      de Héctor — pendiente de Héctor (bmad-create-epics-and-stories).
    location: >-
      src/lib/obras.ts compararDocumentos; corpus/fuentes/wikisource-es--novelas-ejemplares--*.txt
    severity: medium
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

### 2026-10-25 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 16: (high 0, medium 1, low 15)
- defer: 1: (high 0, medium 1, low 0)
- reject: 20: (high 0, medium 1, low 19)
- addressed_findings:
  - `[medium]` `[patch]` La relectura de desarrollo del cargador `posiciones` era `void cargar()` sin `catch`: un frontmatter a medio escribir dejaba una promesa rechazada sin tratar en `astro dev` (blind-hunter, edge-case-hunter). Ahora el fallo se dice con `logger.error` y conserva el almacén anterior.
  - `[low]` `[patch]` La relectura vaciaba el almacén antes de esperar a `parseData`, dos recargas podían cruzarse y cada evento releía el Corpus entero (blind-hunter ×2, edge-case-hunter). Ahora se analiza todo antes y se vacía y llena de un golpe, las recargas van en cadena y una ráfaga se resuelve en una sola tras 250 ms (`ESPERA_TRAS_CAMBIO_MS`). Comprobado en `astro dev`: cuatro ficheros tocados, una sola relectura, árbol limpio.
  - `[low]` `[patch]` El final del libro («epilogo», «notas», «apendice») va antes que el capítulo i (blind-hunter): documentado como límite aceptado en `compararDocumentos` y en AGENTS.md, y fijado por prueba con nombres reales (*Recuerdos de provincia*: «notas-del-autor» antes que «mi-educacion»).
  - `[low]` `[patch]` Los ordinales escritos y los trozos de cifra y letra se leen como palabras, y no estaba dicho (blind-hunter): documentado y fijado («cuarta» antes que «primera» en *El alcalde de Zalamea*; «10a», «1o», «1»). También las páginas con nombre de capítulo (*Novelas ejemplares*), por orden alfabético.
  - `[low]` `[patch]` El comentario de `compararDocumentos` afirmaba que los documentos de una Obra comparten `{fuente}--{obra}`, falso tras `reunir` (blind-hunter): corregido, diciendo cómo ordena una Obra de varias formas.
  - `[low]` `[patch]` La medida era una pareja fría/templada sin explicar `sys` ni los 270 frente a 269 (blind-hunter, intent-alignment): `## Medidas` añade la medida aislada del cargador (cinco pasadas, ~2 s, `sys` ≤ 0,6 s) y explica la diferencia de grupos (agrupado crudo frente a Obra resuelta).
  - `[low]` `[patch]` El `## Auto Run Result

Status: done
Blocking condition: ninguna. Planificación cerrada el 2026-10-25 en `v8/epicas-24-26`; implementada, verificada, revisada (primera pasada con las cinco capas externas) y cerrada el mismo día en la misma rama, sin push.

**Lo implementado.** La Página de Obra lista sus Citas en el orden del libro en todas sus páginas y en su `ItemList`, sin ninguna línea que lo diga. Un cargador de contenido `posiciones` en `src/content.config.ts` (al patrón del de biografías) solo cablea `tools/lib/posiciones.ts`, que lee Citas y documentos con los lectores del cotejo, los casa con `documentosDeCita` y los localiza con `localizar`, el único localizador, del que también sale `apareceEnDocumento`, y que solo acepta formas marcadas `Colapsado` por `colapsarEspacios`. Entrega, por el `slug` del frontmatter, `{documento, posicion}` por documento en que aparece el texto, sin texto, sin elegir y sin escribir nada en `corpus/`. `src/lib/obras.ts` es el único que ordena (`ordenDelLibro`, `compararDocumentos`), con las posiciones por parámetro; `src/lib/publicado.ts` agrupa (`citasPorObra`) y da la fachada memorizada (`citasDeLasObras`), y la página la usa en lugar de su `sort` por slug. `content.config.ts` toma `z` de `astro/zod`.

**Ficheros:**
- `tools/lib/cotejo.ts` — `localizar(buscado, cuerpo)` sobre formas `Colapsado` (vacío → -1); `colapsarEspacios` devuelve ese tipo marcado; `apareceEnDocumento` usa `localizar`.
- `tools/lib/posiciones.ts` (nuevo) — `posicionesDeCitas` pura, agrupando por documento corto y colapsando cada cuerpo una vez por grupo; `leerPosicionesDelCorpus`, su lector de disco.
- `src/lib/obras.ts` — `AparicionDeCita`, `PosicionesDeCitas`, `compararDocumentos` (orden natural con romanos canónicos, palabra antes que número, corto antes que sus páginas, y sus límites aceptados escritos) y `ordenDelLibro`.
- `src/lib/publicado.ts` — `citasPorObra` (puro) y `citasDeLasObras` (fachada memorizada por conjunto, `import('astro:content')` dinámico, sin consultar la colección si ninguna Cita tiene Obra).
- `src/content.config.ts` — `z` de `astro/zod`; `cargadorDePosiciones` y colección `posiciones`; en desarrollo, relectura atómica, en cadena, agrupada tras `ESPERA_TRAS_CAMBIO_MS` y con los fallos dichos por `logger.error`.
- `src/pages/obra/[autor]/[slug]/[...page].astro` — toma el agrupado y el orden de `citasDeLasObras`.
- `tests/unit/orden-del-libro.test.ts` (nuevo, sin construir) — la matriz, el orden natural con nombres reales de `corpus/fuentes/` (Ariel por capítulos, el corto de *Novelas ejemplares*), los límites aceptados fijados tal y como son hoy, la permutación, el lector de disco (árbol entero intacto), el Corpus real y los estructurales (todo `src/` salvo el cargador, lista de localizadores prohibidos, solo los lectores de `corpus.ts`).
- `tests/unit/obra-pagina.test.ts` — el orden del libro en Cartas (indexable, también sin línea del orden y sin título de Obra en las Tarjetas), en Sobre la brevedad paginada y `noindex`, en la congelación y en la 22.6; la sonda vuelca la colección `posiciones` y una prueba la lee tras construir.
- `AGENTS.md` — el párrafo «El orden del libro (Historia 24.1)», con los límites del orden natural.

**Revisión (2026-10-25, cinco capas externas):** 16 parches aplicados (1 medio, 15 bajos), 1 diferido (la primera Obra desordenada ya existe; decide Héctor) y 20 rechazados; detalle en `## Review Triage Log`. La pasada anterior de este spec no tuvo capas y no fue una revisión. Seguimiento: parches de esta pasada 0 altos, 1 medio, 15 bajos; puntuación 3 × 1 + 15 = 18 → `followup_review_recommended: true`.

**Verificación** (logs en `/Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-24-26/`):
- Implementación: `orden-del-libro` 34/34; `cotejo`, `documentacion`, `obras`, `publicado`, `andamiaje`, `puerta-de-admision` 12/12 y `aislamiento-de-revision` 6/6 verdes; `obra-pagina` 56/56; los nueve que construyen Páginas de Obra (`24-1-construyen.log`) verdes; `npm run check` 0 errores; `npm test` 6.087 pruebas, `FINISHED EXIT=0`; medidas y `diff -rq` en `## Medidas`.
- Tras los parches de la revisión: `orden-del-libro` 36/36; `cotejo` 58/58, `documentacion` 46/46, `obras` 117/117, `publicado` 56/56, `andamiaje` 39/39; `obra-pagina` 57/57 (`24-1-r1-obra-pagina.log`, `FINISHED EXIT=0`); `npm run check` 0 errores, 0 avisos, 8 sugerencias (como antes). `npm test` (`24-1-r1-npm-test.log`): 133 ficheros, 6.089 de 6.090 en verde; la que falló era `gestion.test.ts` («ningún módulo repite los números de regla de negocio»), que cazó la espera de 300 ms del cargador (el umbral de caracteres de imagen); pasó a 250 ms y `gestion` 48/48, `orden-del-libro` 36/36 y `npm run check` 0 errores tras el cambio.
- `astro dev` (`npx astro dev --port 4321`, parado con `astro dev stop`): con una línea de registro provisional, retirada después, la carga inicial sitúa 4.420 Citas, y cuatro ficheros tocados con `touch -c` (tres Citas y un documento) dan **una sola** relectura; el árbol de git queda limpio.
- Medida aislada del cargador: cinco pasadas de ~2 s reales y ≤ 0,6 s de `sys` (ver `## Medidas`).
- No se repiten las dos construcciones del Corpus real: ningún parche toca lo que se construye (el orden, la composición y la página no cambian; los cambios son de tipos, de la relectura de desarrollo, de comentarios y de pruebas).

**Riesgos que quedan:**
- El orden natural no sabe el orden de las páginas con nombre de capítulo: hoy *Novelas ejemplares* lista *El coloquio de los perros* antes que *La gitanilla*, y *Vidas paralelas*, *Recuerdos de provincia* y *Novelas y cuadros de la vida sur-americana* van por título. Es el límite aceptado; el índice de subpáginas queda diferido para Héctor (frontmatter `deferred`). Los demás límites —«mi», el final del libro, los ordinales escritos, cifra con letra— no afectan hoy a ninguna Obra con Citas en varias páginas y están fijados por prueba.
- La Página de Obra depende ahora de `corpus/fuentes/`, y ni el `lastmod` del sitemap ni el aviso lo saben todavía: es la Historia 24.8.
- El cargador lee el Corpus y los documentos una segunda vez por construcción (~2 s medidos).
- El cargador de biografías conserva la relectura de desarrollo sin `catch` ni agrupado; lee pocos ficheros pequeños y no se tocó.
