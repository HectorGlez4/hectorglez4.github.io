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
  - `[low]` `[patch]` El `## Auto Run Result` daba por revisada la historia con «0 hallazgos» cuando la primera pasada no tenía revisión (blind-hunter): reescrito con esta pasada; la entrada anterior queda como lo que fue, una pasada sin capas.
  - `[low]` `[patch]` La prueba «las Citas del censo no tienen apariciones» podía pasar sin mirar ninguna (blind-hunter): exige haber mirado al menos una.
  - `[low]` `[patch]` Las pruebas de «nada se escribe en `corpus/`» eran más débiles que la afirmación (blind-hunter): la del lector compara el árbol entero, con contenido, antes y después; la estructural exige que `tools/lib/posiciones.ts` importe de `corpus.ts` solo sus tres lectores y nada fuera de `./` y `src/lib/`.
  - `[low]` `[patch]` Los guardianes de dependencias dejaban pasar `lastIndexOf`, `startsWith`, `RegExp#test`/`exec` y las importaciones de `tools/` desde `src/pages/` o `src/components/` (blind-hunter): la lista prohibida crece y la regla mira todo `src/`, con `content.config.ts` y su único `posiciones.ts` como excepción.
  - `[low]` `[patch]` «Formas ya colapsadas» de `localizar` era solo un comentario (blind-hunter, intent-alignment): `colapsarEspacios` devuelve el tipo marcado `Colapsado` y `localizar` solo lo acepta, así que el compilador impide un segundo camino sin colapsar.
  - `[low]` `[patch]` El límite aceptado de «mi»/«di» no tenía prueba (blind-hunter): `compararDocumentos('x-mi', 'x-ii') > 0` fijado con los demás límites.
  - `[low]` `[patch]` La prueba del orden natural usaba un documento que no existe, `wikisource-es--ariel` (ac-auditor, intent-alignment): Ariel pasa a sus capítulos reales y el «corto antes que sus páginas» se fija con *Novelas ejemplares*, cuyo corto existe.
  - `[low]` `[patch]` Ninguna prueba leía la colección `posiciones` tras construir (ac-auditor, intent-alignment): la sonda de la construcción 22.4 la vuelca, y una prueba nueva exige las 65 claves por slug del frontmatter, solo `apariciones` con `{documento, posicion}`, el orden de Cartas y ningún texto.
  - `[low]` `[patch]` «Ninguna línea dice el orden» solo se comprobaba en la Obra `noindex` (ac-auditor): también en Cartas, indexable.
  - `[low]` `[patch]` Ninguna aserción de la 24.1 decía que las Tarjetas del listado no llevan el título de la Obra (ac-auditor, intent-alignment): Cartas y Sobre la brevedad lo comprueban.

Diferido (1): las páginas con nombre de capítulo —*Novelas ejemplares*, *Vidas paralelas*, *Recuerdos de provincia*, *Novelas y cuadros*— ya salen por orden alfabético y no por el del libro, que es la condición con que la épica aplaza el índice de subpáginas; decide Héctor (blind-hunter, «no hay forma de corregir una página desordenada»). Rechazados (20), por la intención o por no ser reales hoy: el corto frente a las páginas (la matriz pone el corto delante; los dos casos del Corpus son de Fuentes distintas), las Fuentes concatenadas (regla de la épica), el `lastmod` y el aviso por documentos (Historia 24.8, por la épica), la memoria de desarrollo (la misma que la de `conjuntoPublicable`), `sprint-status.yaml` (lo lleva el bucle), los registros fuera del repositorio (convención del bucle), la primera aparición (la épica dice `indexOf`), el lector que falla antes que la puerta (mismo lector que el cotejo, nombra el fichero), la migración de `z` (criterio de la historia), el slug repetido (defecto previo, no visto en el Corpus), preferir el documento de la URL de la Fuente (contradice «el primero en ese orden»), ignorar el corto, partir «10a» (ningún documento hoy), y las observaciones de verificación ya cubiertas (orden real comprobado por el auditor, paginación por el mismo camino, nombre de fichero igual al slug de página hoy, permutación, fixtures, recuento de Fuentes igual bajo la puerta del cotejo, Playwright).

### 2026-10-25 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 13: (high 0, medium 2, low 11)
- defer: 0
- reject: 20: (high 0, medium 1, low 19)
- addressed_findings:
  - `[medium]` `[patch]` El spec quedó truncado al cerrar la primera revisión: el reemplazo del `## Auto Run Result` casó con la mención de ese encabezado dentro del registro de triaje y se llevó el resto de la entrada (10 parches, el diferido y los 20 rechazados), `## Design Notes`, `## Medidas` —con la medida aislada que se afirmaba añadida— y `## Verification`, y dejó el criterio de las cifras sin cumplir en `HEAD` (blind-hunter ×3, intent-alignment, ac-auditor). Restituido sin reescribir nada: las secciones de `3bfc908bf8` y el texto que la primera pasada había escrito, recuperado tal cual de su registro de ejecución.
  - `[medium]` `[patch]` Ninguna prueba ejercía la relectura de `astro dev` que arregló la primera revisión: quitar el `catch`, volver a vaciar antes de analizar, invertir el filtro o releer en cada evento dejaba todo en verde (verification-gap, blind-hunter). La lógica sale de `content.config.ts` a `tools/lib/posiciones.ts` —`releerAlCambiar` (qué cambio cuenta, la espera, la cadena, el aviso) y `guardarPosiciones` (analizar todo antes de vaciar)—, que el cargador solo cablea, y `orden-del-libro.test.ts` las prueba con un vigilante de mentira y el reloj de Vitest. Las seis mutaciones (sin `catch`, filtro invertido, sin agrupar, vaciar antes, sin cadena, prefijo sin separador) y la del fallo memorizado ponen la suite en rojo.
  - `[low]` `[patch]` Lo verificado tras la primera revisión afirmaba que ningún parche tocaba lo que se construye, cuando `cargar()` corre en cada `astro build`, y no repitió las construcciones ni `npm test` tras el último cambio (blind-hunter, intent-alignment): esta pasada repite las dos construcciones del Corpus real, el `diff -rq`, una comprobación del `dist/` entero y `npm test`, y el resultado ya no lo afirma.
  - `[low]` `[patch]` `citasDeLasObras` memorizaba también una promesa rechazada (edge-case-hunter, blind-hunter): la borra al fallar, como `conjuntoPublicable`, que solo guarda lo que terminó bien; prueba nueva.
  - `[low]` `[patch]` El filtro de la relectura casaba por prefijo sin separador, `corpus/citas-borrador` como `corpus/citas` (edge-case-hunter, blind-hunter): exige el separador; prueba nueva.
  - `[low]` `[patch]` La prueba del censo exigía que no estuviera vacío y se pondría en rojo al cumplirse la meta de la 11.4 (blind-hunter): ahora exige que **todo** slug del censo tenga entrada y lista vacía, que con el censo vacío se cumple sin mirar nada.
  - `[low]` `[patch]` La prueba sobre el Corpus real usaba `ordenDelLibro` de oráculo y solo pedía que algo cambiara, y la del orden total no miraba la transitividad (blind-hunter): prueba nueva que, en cada Obra real, comprueba sin `ordenDelLibro` que las situadas van delante, cada Fuente junta y por recuento, el documento y la posición nunca retroceden y las sueltas van por slug (una vuelta al orden por slug la pone en rojo); y transitividad sobre 20 nombres.
  - `[low]` `[patch]` El guardián de importaciones se dejaba engañar por cadenas (`'**/*.md'` abría un comentario; un `//` en una cadena cortaba la línea) y no veía `import.meta.glob` ni `require` (blind-hunter): quita los comentarios respetando cadenas y expresiones regulares, ve las cinco formas y tiene casos para cada trampa; sobre `src/` encuentra los 322 imports que encuentra una búsqueda ingenua.
  - `[low]` `[patch]` AGENTS.md no decía que la Página de Obra depende ya de `corpus/fuentes/` (blind-hunter): el párrafo de la 24.1 lo dice, y que recuperar o retirar un documento puede reordenar una Obra —y pasar Citas a la `/2/`— sin `lastmod` ni aviso hasta la 24.8.
  - `[low]` `[patch]` «Construir no escribe nada» miraba solo `corpus/citas/` y la prueba de la sonda fijaba 65 a mano (blind-hunter): mira además cada fichero del fixture y que ningún fichero de `corpus/` sea posterior a la sonda, que el andamio escribe tras todo el corpus y antes de construir; el 65 sale del fixture.
  - `[low]` `[patch]` El `ItemList` solo se comprobaba en «Sobre la brevedad» (intent-alignment): también en Cartas indexable y en Cartas congelada.
  - `[low]` `[patch]` Los nombres «reales» del orden natural estaban escritos a mano, y dos no existían (intent-alignment, ac-auditor): pasan por `real()` y una prueba exige que existan en `corpus/fuentes/`; los construidos («plenitud-epilogo», «jornada-cuarta», «10a») lo dicen, y el corto inexistente del *Oráculo* sale de la prueba.
  - `[low]` `[patch]` Nada ataba `apareceEnDocumento` a `localizar` fuera de la prueba lenta (ac-auditor): prueba estructural de que el único `indexOf` de `cotejo.ts` está en `localizar` y de que `apareceEnDocumento` devuelve `localizar(…) !== -1`.

Rechazados (20), por la intención de la historia o por no ser reales: la contabilidad del spec (`review_loop_iteration` solo cuenta las vueltas por `bad_spec`, dos entradas son dos pasadas, y `done` con seguimiento recomendado es la forma del flujo); `sprint-status.yaml` (lo lleva el bucle); la espera de 250 ms (no es una regla de negocio, y la guarda de AD-9 mira solo las tres cifras de regla); la memoria de `citasDeLasObras` frente a la colección en desarrollo (vive y muere con la de `conjuntoPublicable`); los oyentes acumulados (Astro quita los suyos antes de cada resincronización, `removeAllTrackedListeners`) y la ventana de una Cita nueva al final en desarrollo (pasajera); la generación entre resincronizaciones (cada relectura lee el disco de ese momento y el siguiente cambio la corrige); el corto frente a sus páginas y la primera aparición (la épica: orden natural, el primero en ese orden, `indexOf`); las Fuentes una tras otra (criterio de la épica); la lista de prohibidos de `posiciones.ts` (guardián a propósito); una guarda de «solo `ordenDelLibro` ordena» (cualquier reordenación pone en rojo las construcciones y la prueba nueva del Corpus); el detector o la lista de Obras desordenadas (la épica lo excluye, y la decisión ya está diferida a Héctor desde la primera pasada); el párrafo de AGENTS.md en vez de subsección (sigue la tarea del spec y el precedente de la 22.7); el casado y la URL (`documentosDeCita` solo recibe `{id}` y la equivalencia sobre el Corpus real lo vigila); la migración de `z` y la extensión `.ts` (criterio de la historia; cosmético); la Cita sin clave al final (la matriz: «ausentes, al final»); la cadena entera sobre el Corpus real como prueba duradera, «ninguna línea» fuera de la Cabecera, las varias apariciones solo sintéticas y el recuento de Fuentes (cubiertos por la comprobación del `dist/` real, sin caso real o iguales en el Corpus).

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

**Medida aislada del cargador (revisión, 2026-10-25).** Las dos construcciones de arriba no se
comparan bien —una fría tras `npm ci`, otra templada, una vez cada una—, así que el coste de la
historia se mide también solo: `leerPosicionesDelCorpus` sobre el Corpus del worktree, cinco veces
en el mismo proceso (`process.hrtime`, `process.cpuUsage`): **2,36 / 1,99 / 2,00 / 2,00 / 1,97 s
reales**, 1,84–2,21 s de `user` y **0,42–0,60 s de `sys`**, 4.420 Citas cada vez. Es el ~+2 s de la
sincronización de contenido, y descarta que los +12,74 s de `sys` de la tabla vengan del cargador:
son ruido de la pareja fría/templada.

Los 270 grupos del plan frente a las 269 páginas 1 distintas son de agrupado, no de orden: el plan
contó grupos (Autor, `procedencia.obra`) crudos —335 de varias Citas, 270 distintos del orden por
slug— y la página agrupa por Obra resuelta —333 y 269—, porque dos fichas reúnen dos grafías cada
una (*Del sentimiento trágico de la vida* con «…/I», y *De la brevedad de la vida* con «Sobre la
brevedad de la vida»).

`diff -rq "$ANTES" dist` (824 líneas): **299 ficheros distintos en `dist/obra/`**, todos `index.html` (269 páginas 1 y 30 páginas 2+); **525 en `dist/pagefind/`** (`pagefind-entry.json` distinto y 524 fragmentos y metadatos con nombre por contenido presentes en un solo lado); **0 fuera de `dist/obra/` y `dist/pagefind/`**. Comprobación a ojo: *La ciudad de Dios* (46 Citas) sale por libro ii, iv, iv, iv, v, vii… y posición; *El Zarco*, capítulos iv, vii, xvi, xx. `$ANTES` y `dist/` borrados tras comparar.

**Segunda revisión (2026-10-25): las dos templadas, tras sus parches.** La pareja de arriba es
anterior a las dos revisiones, y una era fría. Se repite en el mismo worktree, con
`FECHA_JORNADA=2026-10-25` en las dos: antes, con `src/` y `tools/` de `7886273b8f` sacados con
`git checkout` y devueltos después; después, con los parches de esta pasada. Las dos siguen a otras
construcciones del día. Logs: `24-1-r2-build-antes.log` y `24-1-r2-build-despues.log`.

| | antes | después | diferencia |
|---|---|---|---|
| `real` de `npm run build` | 97,51 s | 90,31 s | −7,20 s |
| `user` / `sys` | 100,04 s / 36,85 s | 101,71 s / 18,10 s | +1,67 s / −18,75 s |
| `[content] Syncing` → `Synced` | ~1 s (21:21:52 → 21:21:53) | ~2 s (21:30:41 → 21:30:43) | ~+1 s |

Otra vez el `real` y el `sys` de una pasada a otra son ruido —ahora a favor de «después»—, y el coste
propio del cargador es el segundo o dos de la sincronización de contenido, como en la medida aislada.
La cifra que motiva el criterio es la del CI (15 min 24 s); esta es local, y lo que se puede afirmar
de ella es que el cargador añade segundos, no minutos.

`diff -rq` de la pareja (824 líneas): **299 `index.html` distintos en `dist/obra/`**, **525 en
`dist/pagefind/`** y **0 fuera**; las 299 páginas son idénticas fuera del listado y del JSON-LD. Sobre
el `dist/` de «después», con un guion de comprobación fuera del repositorio: en las **517 Obras y
sus 547 páginas**, el listado leído de página en página es `ordenDelLibro` sobre el Corpus, el
`ItemList` de cada página es su listado con las posiciones seguidas de una página a la siguiente,
toda página 2 empieza por la Cita 51 del libro, no hay nada entre la Cabecera y el listado ni una
Tarjeta con Autor, y **269 Obras** difieren del orden por slug. `corpus/` sin cambios tras las dos
construcciones; los dos `dist/` borrados tras comparar.

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
- Sobre el `dist/` de «después»: el listado y el `ItemList` de cada Página de Obra frente a `ordenDelLibro` del Corpus, y `git status` sin cambios en `corpus/` -- sin fallos.

## Auto Run Result

Status: done
Blocking condition: ninguna. Planificación cerrada el 2026-10-25 en `v8/epicas-24-26`; implementada, verificada, revisada dos veces con las cinco capas externas y cerrada el mismo día en la misma rama, sin push.

**Lo implementado.** La Página de Obra lista sus Citas en el orden del libro en todas sus páginas y en su `ItemList`, sin ninguna línea que lo diga. Un cargador de contenido `posiciones` en `src/content.config.ts` (al patrón del de biografías) solo cablea `tools/lib/posiciones.ts`, que lee Citas y documentos con los lectores del cotejo, los casa con `documentosDeCita` y los localiza con `localizar`, el único localizador, del que también sale `apareceEnDocumento`, y que solo acepta formas marcadas `Colapsado` por `colapsarEspacios`. Entrega, por el `slug` del frontmatter, `{documento, posicion}` por documento en que aparece el texto, sin texto, sin elegir y sin escribir nada en `corpus/`; el mismo módulo lleva el volcado al almacén (`guardarPosiciones`) y la relectura de `astro dev` (`releerAlCambiar`). `src/lib/obras.ts` es el único que ordena (`ordenDelLibro`, `compararDocumentos`), con las posiciones por parámetro; `src/lib/publicado.ts` agrupa (`citasPorObra`) y da la fachada memorizada (`citasDeLasObras`), y la página la usa en lugar de su `sort` por slug. `content.config.ts` toma `z` de `astro/zod`.

**Ficheros:**
- `tools/lib/cotejo.ts` — `localizar(buscado, cuerpo)` sobre formas `Colapsado` (vacío → -1); `colapsarEspacios` devuelve ese tipo marcado; `apareceEnDocumento` usa `localizar`.
- `tools/lib/posiciones.ts` (nuevo) — `posicionesDeCitas` pura, agrupando por documento corto y colapsando cada cuerpo una vez por grupo; `leerPosicionesDelCorpus`, su lector de disco; `guardarPosiciones`, que analiza todo antes de vaciar el almacén; `releerAlCambiar`, la relectura de desarrollo (carpetas con separador, ráfaga en una, en cadena, fallo dicho).
- `src/lib/obras.ts` — `AparicionDeCita`, `PosicionesDeCitas`, `compararDocumentos` (orden natural con romanos canónicos, palabra antes que número, corto antes que sus páginas, y sus límites aceptados escritos) y `ordenDelLibro`.
- `src/lib/publicado.ts` — `citasPorObra` (puro) y `citasDeLasObras` (fachada memorizada por conjunto que no memoriza un fallo, `import('astro:content')` dinámico, sin consultar la colección si ninguna Cita tiene Obra).
- `src/content.config.ts` — `z` de `astro/zod`; `cargadorDePosiciones` y colección `posiciones`, que solo cablean `guardarPosiciones` y `releerAlCambiar`.
- `src/pages/obra/[autor]/[slug]/[...page].astro` — toma el agrupado y el orden de `citasDeLasObras`.
- `tests/unit/orden-del-libro.test.ts` (nuevo, sin construir) — la matriz, el orden natural con nombres de `corpus/fuentes/` que una prueba exige que existan, los límites aceptados fijados tal y como son hoy, orden total con transitividad, la permutación, el lector de disco, el volcado al almacén, la relectura de desarrollo con reloj falso, la fachada que no memoriza un fallo, el Corpus real (con la propiedad «documento y posición nunca retroceden» sin `ordenDelLibro` de oráculo) y los estructurales (todo `src/` salvo el cargador con un detector que respeta cadenas y regex, el único `indexOf` del cotejo, lista de localizadores prohibidos, solo los lectores de `corpus.ts`).
- `tests/unit/obra-pagina.test.ts` — el orden del libro y el `ItemList` en Cartas (indexable y congelada), en Sobre la brevedad paginada y `noindex` y en la 22.6; la sonda vuelca la colección `posiciones`; construir no escribe nada en `corpus/`.
- `AGENTS.md` — el párrafo «El orden del libro (Historia 24.1)», con los límites del orden natural y la dependencia de `corpus/fuentes/` que la 24.8 dará a conocer al `lastmod` y al aviso.

**Revisiones.** Primera (cinco capas externas): 16 parches (1 medio, 15 bajos), 1 diferido —la primera Obra desordenada ya existe; decide Héctor— y 20 rechazados. Segunda (esta, cinco capas externas): 13 parches (0 altos, 2 medios, 11 bajos), 0 diferidos y 20 rechazados; detalle de las dos en `## Review Triage Log`. La pasada sin capas de antes de la primera no fue una revisión. Seguimiento, solo con los parches de esta pasada: 0 altos, 2 medios, 11 bajos; puntuación 3 × 2 + 11 = 17 → `followup_review_recommended: true`.

**Verificación** (logs en `/Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-24-26/`):
- Implementación y primera revisión: ver la versión del spec en `01ae08a7fb` (`orden-del-libro` 36/36, `obra-pagina` 57/57, `npm run check` 0 errores; su `npm test` dejó una en rojo, `gestion.test.ts`, que se corrigió y no se repitió entero).
- Segunda revisión: `orden-del-libro` 47/47 (~17 s), y cada regresión de la relectura, del volcado y de la fachada —siete mutaciones a mano, devueltas después— la pone en rojo, igual que volver al orden por slug; `npm run check` (`24-1-r2-check.log`) 0 errores, 0 avisos, 8 sugerencias; `npm test` (`24-1-r2-npm-test.log`) 133 ficheros, **6.101 pruebas, `FINISHED EXIT=0`** (733 s), con `obra-pagina`, `gestion`, `cotejo`, `documentacion`, `obras`, `publicado`, `andamiaje`, `puerta-de-admision`, `aislamiento-de-revision` y todos los que construyen Páginas de Obra.
- Las dos construcciones del Corpus real con `FECHA_JORNADA=2026-10-25`, después ya con estos parches: 97,51 s antes y 90,31 s después; `diff -rq` con 299 ficheros en `dist/obra/`, 525 en `dist/pagefind/` y 0 fuera, idénticos fuera del listado y del JSON-LD; el `dist/` de después comprobado Obra por Obra (517 Obras, 547 páginas, 0 fallos, 269 distintas del orden por slug); `corpus/` intacto. Ver `## Medidas`.
- La relectura de `astro dev` ya no se comprueba a mano: la cubren las pruebas de `releerAlCambiar` y `guardarPosiciones`.

**Riesgos que quedan:**
- El orden natural no sabe el orden de las páginas con nombre de capítulo: hoy *Novelas ejemplares* lista *El coloquio de los perros* antes que *La gitanilla*, y *Vidas paralelas*, *Recuerdos de provincia* y *Novelas y cuadros de la vida sur-americana* van por título. Es el límite aceptado; el índice de subpáginas queda diferido para Héctor (frontmatter `deferred`). Los demás límites —«mi», el final del libro, los ordinales escritos, cifra con letra— no afectan hoy a ninguna Obra con Citas en varias páginas y están fijados por prueba.
- La Página de Obra depende ahora de `corpus/fuentes/`, y ni el `lastmod` del sitemap ni el aviso lo saben todavía: es la Historia 24.8 (AGENTS.md lo advierte).
- El cargador lee el Corpus y los documentos una segunda vez por construcción: uno o dos segundos medidos, locales; el CI no se ha medido.
- El cargador de biografías conserva su relectura de desarrollo sin `catch` ni agrupado; lee pocos ficheros pequeños y no se tocó.
