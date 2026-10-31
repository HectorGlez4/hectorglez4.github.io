---
title: 'Historia 24.9 — El orden del libro lo declara la Fuente'
type: 'feature'
created: '2026-10-31'
status: 'done'
baseline_revision: '3c91b8d67de5c3e753255327e2cee40e690e21d6'
baseline_commit: '3c91b8d67de5c3e753255327e2cee40e690e21d6'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-24-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-24-1-la-pagina-de-obra-lista-sus-citas-en-el-orden-del-libro.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El orden natural de `compararDocumentos` (24.1) lee el nombre de la página, y cuatro Obras del Corpus nombran sus páginas por título: *Novelas ejemplares* lista «el-coloquio-de-los-perros» antes que «la-gitanilla», *Vidas paralelas* «ciceron» antes que «pericles», y *Recuerdos de provincia* y *Novelas y cuadros…* van por título, no por el libro.

**Approach:** `tools/recuperar.ts --indice <url>` pide **una vez** la página de la obra en la Fuente, ya pintada (`action=render`, que incluye el índice transcluido del escaneo), guarda en orden los títulos que enlaza en `corpus/fuentes/{fuente}--{obra}.indice.yml` (no `.txt`: ningún lector de documentos lo ve) y un lector de `tools/lib/` lo casa con los documentos por la dirección de su cabecera; un cargador hermano (`indices`) lo lleva a `src/`, y `ordenDelLibro` lo recibe por parámetro.

## Boundaries & Constraints

**Always:**
- La red solo en `tools/recuperar.ts` (AD-22, `andamiaje.test.ts` sin excepción nueva); mismas guardas que un documento. Lo único tecleado es la dirección; la Obra es la de los documentos versionados que el índice enlaza (si son de varias, la que se llama como la página; si ninguna, se niega con 1). Ya versionado → 0 sin pedir; otro índice para la misma Obra → 1; `--ensayo` no escribe.
- El fichero de índice guarda `fuente`, `url`, `recuperado` y `paginas` (títulos canónicos en el orden en que la Fuente los pinta); nunca nombres de documento ni rangos.
- Casado índice↔documento por título de la dirección (`url` o `pedido` de la cabecera). Orden dentro de la Obra con índice: el documento de la propia página del índice, luego los enlazados en su orden, luego los no enlazados por `compararDocumentos`. Sin índice, rige `compararDocumentos` intacto.
- `src/lib/obras.ts` sigue siendo el único que ordena; un solo comparador de documentos (`compararEnElLibro`) que es orden total; lo usan `primeraAparicion` y la ordenación. El resto de la regla de la 24.1 no cambia.
- `content.config.ts` solo cablea `tools/lib/posiciones.ts`; ningún `src/lib/` importa de `tools/lib/`; el build no pide nada a la red.
- El índice compone la Página de Obra en `relacionDeSuperficies` como un documento (familia `documento`), y ninguna Página de Cita.

**Ask First:** cambiar qué Citas se publican, reescribir un documento de `corpus/fuentes/`, o capturar un índice cuyo orden contradiga el libro (se informa, no se corrige a mano).

**Never:** un orden tecleado o escrito a mano en `corpus/`; tocar la semántica del cotejo o el orden de `documentosDeCita`; pintar una línea que diga el orden; Playwright o servidores.

## I/O & Edge-Case Matrix

| Escenario | Entrada / estado | Resultado esperado |
|---|---|---|
| Índice manda | docs `…--b`, `…--a`; índice [b, a] | b antes que a |
| Sin índice | mismos docs, sin índice | `compararDocumentos` (a antes que b) |
| No enlazado | índice [b]; docs a, b, c | b, luego a, c por orden natural |
| Portada del libro | doc cuya `url` es la del índice | primero |
| `pedido` | doc redirigido, el índice enlaza el título pedido | casa |
| Otra Obra | doc de otro `{fuente}--{obra}` enlazado | no entra |
| HTML | enlaces relativos, absolutos, otro anfitrión, `?action=edit`, «Autor:», ancla, repetidos, la propia | solo títulos del espacio principal, en orden, sin repetir |
| Índice ilegible | `.indice.yml` roto o de otra Fuente | el lector lanza nombrando el fichero |
| Lectores | índice presente en `corpus/fuentes/` | ni cotejo, ni `extraer`, ni posiciones lo leen |

</frozen-after-approval>

## Code Map

- `tools/lib/indice.ts` (nuevo, puro) -- `paginasDelIndice(html, url)`, `componerIndice`/`analizarIndice`, `documentosEnElOrdenDelIndice`, `obraDeIndice`, `nombreDeIndice`, `tituloDeDireccion`; usa `mismoTitulo` de `tools/lib/fuentes.ts:142` y el `obraDelDocumento` de `src/lib/obras.ts`.
- `tools/recuperar.ts` -- rama `--indice` (`recuperarIndice`) con `descargar`/`conReintentos`/`esPasajero` existentes y `nombreDeDocumento` de `tools/lib/documento.ts:2387`.
- `tools/lib/corpus.ts:1059` -- junto a `leerDocumentosDeFuente`, `leerOrdenDeLosIndices(rutas)`: lee los `.indice.yml` y solo la cabecera de los documentos de esas Obras.
- `tools/lib/posiciones.ts` -- `leerOrdenDeLosIndicesDelCorpus`, `guardarOrdenDeLosIndices` (patrón de `guardarPosiciones`).
- `src/content.config.ts:284-340` -- colección hermana `indices` `{ documentos: string[] }`, misma relectura de desarrollo.
- `src/lib/obras.ts:958-1110` -- `IndicesDeObras`, `obraDelDocumento`, `compararEnElLibro`; `ordenDelLibro(citas, posiciones, indices)`.
- `src/lib/publicado.ts:858,1512` -- `citasPorObra(…, indices)`; `citasDeLasObras` lee también `indices`.
- `tools/lib/alcance.ts:127,139,419` -- el modelo de NFR-5 ordena con los mismos índices.
- `tools/lib/cambios.ts:441,573` -- el índice compone la Página de Obra; `integraciones/historial.ts:409` y `tools/avisar.ts:144` lo listan con los documentos.
- Pruebas: `tests/unit/orden-del-libro.test.ts` (estructurales de 24.1: lectores de `corpus.ts`), `siguiente.test.ts`, `clave-de-orden.test.ts`, `publicable-y-alcanzable.test.ts` (llamadas a `ordenDelLibro`/`citasPorObra`), `recuperar-cli.test.ts`, `fecha-de-cambio.test.ts`.

## Tasks & Acceptance

**Execution:**
- [x] Medida «antes» con `FECHA_JORNADA` fija sobre `3c91b8d67d` (árbol sin índices) -- `dist/` a un directorio temporal.
- [x] `tools/lib/indice.ts`, `tools/recuperar.ts`, `tools/lib/corpus.ts` -- captura y lector.
- [x] `src/lib/obras.ts`, `src/lib/publicado.ts`, `tools/lib/alcance.ts`, `tools/lib/posiciones.ts`, `src/content.config.ts` -- el índice llega a `ordenDelLibro` por parámetro.
- [x] `tools/lib/cambios.ts`, `integraciones/historial.ts`, `tools/avisar.ts` -- el índice fecha y avisa su Obra.
- [x] Capturar con la orden los índices de las cuatro Obras (Wikisource).
- [x] Pruebas: `tests/unit/indice.test.ts` (nuevo: la matriz, el lector, los lectores que lo ignoran), `orden-del-libro.test.ts` (índice frente a orden natural; Corpus real de las cuatro sin construir), `recuperar-cli.test.ts` (rama `--indice`), `fecha-de-cambio.test.ts` (el índice fecha solo su Obra); llamadas existentes al nuevo parámetro.
- [x] Medida «después» y `diff -rq` -- anotar en `## Medidas`.
- [x] `AGENTS.md` «El orden del libro (Historia 24.1)» -- el índice deja de estar aplazado y dice cómo se recupera.

**Acceptance Criteria:**
- Given las cuatro Obras sobre el Corpus real, when se ordenan, then «la-gitanilla» antes que «el-coloquio-de-los-perros», «pericles» antes que «ciceron», y *Recuerdos de provincia* y *Novelas y cuadros* en el orden de su índice, en todas sus páginas y en su `ItemList`.
- Given la suite, when corren los ficheros tocados, `npx astro check` y `npm run build`, then pasan, y `corpus/` solo gana los cuatro `.indice.yml`.
- Given dos construcciones de la misma jornada, when se comparan, then el HTML solo cambia en las Páginas de las Obras reordenadas, en las Páginas de Cita de sus Citas y en `dist/pagefind/`.

## Design Notes

Clave de documento (orden total): Obra con índice → `[obra, 1, rango]` si está enlazado, `[obra, 2, nombre]` si no; sin índice → `[nombre, 0]`; la primera componente se compara con `compararDocumentos`. La portada del libro tiene rango −1.

## Verification

**Commands:**
- `npx vitest run tests/unit/<fichero>.test.ts` por cada fichero tocado -- verde.
- `npx astro check` -- 0 errores.
- `env FECHA_JORNADA=2026-10-31 npm run build` antes y después, y `diff -rq` -- solo lo del último criterio.

## Medidas

Corpus real del worktree (`3c91b8d67d`), `env FECHA_JORNADA=2026-10-31 /usr/bin/time -p npm run build` en las dos: «antes» con el árbol de `3c91b8d67d` (sin índices; solo los cambios de `tools/` aún inertes), «después» con la historia aplicada y los cuatro `.indice.yml` capturados (sin commitear, así que el `lastmod` del sitemap no se mueve en esta pareja). El worktree tiene su propio `node_modules/.astro` y `.vite` (enlaces por entrada, como `enlazarDependencias`), para no pisar el almacén de contenido compartido.

| | antes | después |
|---|---|---|
| `real` / `user` / `sys` | 308,39 / 214,60 / 63,51 s | 252,57 / 189,37 / 35,29 s |
| `[content] Syncing` → `Synced` | 19:12:53 → 19:13:02 (~9 s) | 19:30:04 → 19:30:14 (~10 s) |

El `real` es ruido de máquina compartida (otras sesiones construían a la vez); el coste propio del cargador `indices` cabe en el segundo de diferencia de la sincronización de contenido: lee cuatro índices y las cabeceras de los 44 documentos de sus Obras.

`diff -rq` (114 líneas): **3 `index.html` en `dist/obra/`** (*Novelas ejemplares*, *Vidas paralelas*, *Recuerdos de provincia*), **20 `index.html` en `dist/cita/`** (las 9 + 2 + 9 Citas de esas Obras: «Siguiente», «De la misma obra» y `data-pagefind-sort`; en las dos de *Vidas paralelas* solo cambia la clave de orden, porque «Siguiente» de una Obra de dos es la otra en los dos sentidos), **91 en `dist/pagefind/`** (`pagefind-entry.json`, 76 índices, 8 filtros, 4 fragmentos y el `.pf_meta`, con nombre por contenido) y **0 fuera**. *Novelas y cuadros* no cambia: su orden alfabético («dolores», «luz-y-sombra-samper») coincide con el de su índice. El sitemap no cambia en esta pareja; tras el commit, las cuatro Obras toman la fecha del commit que añade su índice (es lo que fija `fecha-de-cambio.test.ts`). NFR-5 en verde: 5.115 superficies a 3 saltos o menos y las 37.398 aristas del modelo en `dist/`. Los dos `dist/` se borraron tras comparar.

**Las cuatro Obras, antes → después** (documento de cada Cita, en el orden del listado):
- *Novelas ejemplares* (9): coloquio ×4, licenciado-vidriera, gitanilla ×3, ilustre-fregona → **gitanilla ×3, licenciado-vidriera, ilustre-fregona, coloquio ×4**.
- *Vidas paralelas* (2): ciceron, pericles → **pericles, ciceron**.
- *Recuerdos de provincia* (9): a-mis-compatriotas, casas-de-educacion, chile ×2, domingo-de-oro, la-historia-de-mi-madre, los-albarracines ×2, los-huarpes → **a-mis-compatriotas, los-huarpes, los-albarracines ×2, domingo-de-oro, la-historia-de-mi-madre, chile ×2, casas-de-educacion**.
- *Novelas y cuadros de la vida sur-americana* (6): dolores ×5, luz-y-sombra-samper → **igual**.

## Review Triage Log

### 2026-10-31 — Review pass (inline)

Sin subagentes en esta ejecución: las tres capas (blind-hunter, edge-case-hunter, verification-gap) se corrieron en línea, por el mismo agente, sobre el diff entero desde `3c91b8d67d`; es una revisión más estrecha que la de capas independientes, y así queda dicho.

- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 0, medium 1, low 3)
- defer: 1: (high 0, medium 0, low 1)
- reject: 3
- addressed_findings:
  - `[medium]` `[patch]` Ninguna construcción probaba que el índice llega de `corpus/fuentes/` a la página por la colección `indices` (verification-gap): la construcción 22.6 de `obra-pagina.test.ts` gana un `.indice.yml` para *Epístolas morales* que invierte su orden natural, y la prueba lo exige en el listado.
  - `[low]` `[patch]` `guardarOrdenDeLosIndices` sin prueba (verification-gap): una entrada siempre presente, también sin índices, y el almacén intacto si la lectura o el análisis fallan.
  - `[low]` `[patch]` La prueba de `extraer` sobre un índice aceptaba cualquier fallo (blind-hunter): exige el motivo, «no tiene la forma de un documento de Fuente».
  - `[low]` `[patch]` El comentario de `leerOrdenDeLosIndices` decía que de los documentos lee «solo la cabecera», cuando abre el fichero entero y usa solo la cabecera (blind-hunter): corregido.

Diferido (1): *La señora Cornelia* está versionada de la edición de 1878 y el índice capturado es el de 1825, así que su documento no casa y va detrás de *El coloquio de los perros*, donde el libro la pone antes; hoy no tiene ninguna Cita, y un índice por Obra es la regla. Rechazados (3): `findIndex` por comparación en `compararEnElLibro` (índices de decenas de entradas, Obras de pocas Citas); leer todas las cabeceras de `corpus/fuentes/` en cada captura (~1,4 s, una vez por Obra); el texto fijo de los espacios de nombres (`PREFIJOS_FUERA_DEL_LIBRO`) frente a pedírselos a la Fuente (sería otra petición, y un título fuera de lista que no casa con ningún documento no ordena nada).

## Auto Run Result

Status: done
Blocking condition: ninguna. Sin Ask First disparado: ningún documento de `corpus/fuentes/` reescrito, ninguna Cita publicada ni retirada, y los cuatro índices capturados ordenan como el libro (salvo el diferido de *La señora Cornelia*, sin Citas).

**Verificación** (worktree `v8-24-9`, logs en el directorio temporal de la sesión):
- `npx astro check`: 0 errores, 0 avisos, 8 sugerencias (previas).
- Por fichero: `indice` 15/15, `orden-del-libro`, `fecha-de-cambio`, `recuperar-cli` (236 en los cuatro), `obra-pagina` 66/66 (construye), y `andamiaje`, `cotejo`, `obras`, `publicado`, `alcance`, `aislamiento-de-revision`, `documento`, `legibilidad`, `siguiente`, `clave-de-orden`, `indexnow`, `gestion`, `documentacion`, `puerta-de-admision` en verde.
- `npm test` entero: 153 ficheros, 7.063 pruebas, **1 en rojo ajena a la historia**: `superficies.test.ts` exige axe-core 4.14.0 y el `node_modules` compartido del checkout principal tiene la 4.12.1 instalada (el `package.json` fija la 4.14.0; es el entorno, no el código). Antes de añadir la prueba construida de *Epístolas morales*; `obra-pagina` se repitió después, en verde.
- Las dos construcciones y el `diff -rq`: ver `## Medidas`.
- Playwright no se corre (instrucción de esta ejecución); `tests/e2e/busqueda.spec.ts` solo cambia la llamada a `citasPorObra`.

## Suggested Review Order

**El orden: un solo comparador, con el índice por parámetro**

- Orden total: índice de la Obra si lo hay; si no, el natural de la 24.1.
  [`obras.ts:1070`](../../src/lib/obras.ts#L1070)

- `ordenDelLibro` recibe los índices como las posiciones; el resto de la regla no cambia.
  [`obras.ts:1126`](../../src/lib/obras.ts#L1126)

**La captura: la cáscara de red de siempre**

- `--indice`: pide la página pintada una vez, deduce la Obra y escribe aparte.
  [`recuperar.ts:553`](../../tools/recuperar.ts#L553)

- Títulos del espacio principal en el orden en que la Fuente los pinta.
  [`indice.ts:126`](../../tools/lib/indice.ts#L126)

- Casado título↔documento por la `url`/`pedido` de la cabecera; portada primero.
  [`indice.ts:214`](../../tools/lib/indice.ts#L214)

**Del disco a `src/`**

- Lector: los `.indice.yml` y solo las cabeceras de sus Obras; ilegible lanza.
  [`corpus.ts:1096`](../../tools/lib/corpus.ts#L1096)

- Colección hermana `indices`, una entrada siempre presente; solo cablea.
  [`content.config.ts:359`](../../src/content.config.ts#L359)

- La fachada lee las dos colecciones y pasa los índices a `citasPorObra`.
  [`publicado.ts:1525`](../../src/lib/publicado.ts#L1525)

- El modelo de NFR-5 pagina con el mismo orden que el build.
  [`alcance.ts:132`](../../tools/lib/alcance.ts#L132)

**Fecha y aviso**

- El índice compone su Página de Obra como un documento, y nada más.
  [`cambios.ts:596`](../../tools/lib/cambios.ts#L596)

**Pruebas y datos**

- Las cuatro Obras reales, antes y después, sin construir.
  [`orden-del-libro.test.ts`](../../tests/unit/orden-del-libro.test.ts)

- La matriz del índice y los lectores que no lo ven.
  [`indice.test.ts`](../../tests/unit/indice.test.ts)

- Los cuatro índices capturados.
  [`wikisource-es--novelas-ejemplares.indice.yml`](../../corpus/fuentes/wikisource-es--novelas-ejemplares.indice.yml)
