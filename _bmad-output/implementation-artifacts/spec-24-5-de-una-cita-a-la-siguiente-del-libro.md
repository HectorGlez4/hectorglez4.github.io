---
title: 'Historia 24.5 — De una Cita a la siguiente del libro'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_revision: 'f096023b4267b202859c71c97f669d63a4effd94'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-24-context.md'
warnings:
  - oversized
deferred: []
---

<intent-contract>

## Intent

**Problem:** La Tarjeta de Obra (24.4) solo lleva a la Obra entera: quien quiere seguir leyendo ese libro Cita a Cita tiene que volver al listado, y la Obra de una sola Cita no ofrece a dónde seguir (FR-12, UX-DR65).

**Approach:** Una primera Fila de bloque «Siguiente…» en la Tarjeta de Obra, encima de «Ver la obra», compuesta en el build: en una Obra de ≥ 2 Citas, «Siguiente cita de esta obra ›» a la que sigue en el orden del libro de `citasDeLasObras` (de la última a la primera); en una Obra de una Cita, «Siguiente cita sobre {tema} ›» a la primera Cita de otro Autor que le sigue, con vuelta, en el listado de `citasDeTema` de su primer Tema publicado; y sin esa fila cuando no hay a dónde ir. La decisión la toma una función pura de `src/lib/publicado.ts`, y el texto, `src/lib/atribucion.ts`.

## Boundaries & Constraints

**Always:**
- `src/lib/publicado.ts` exporta `type SiguienteCita = { por: 'obra'; cita: Cita } | { por: 'tema'; cita: Cita; tema: Tema }` y la pura `siguienteCita(cita, porObra: ReadonlyMap<string, readonly Cita[]>, publicados: readonly Tema[], listados: ReadonlyMap<string, readonly Cita[]>): SiguienteCita | undefined`. `porObra` es el mapa de `citasDeLasObras` (ya en el orden del libro: la función no ordena, solo busca el índice, AD-25); `listados` es, por slug de Tema publicado, `citasDeTema(conjunto.citas, slug)` (AD-11). Reglas:
  - sin `cita.obra` → `undefined`;
  - grupo `porObra.get(cita.obra.nombre)` de ≥ 2 → `{ por: 'obra', cita: grupo[(i + 1) % n] }`; si el grupo falta o la Cita no está en él (`citasPorObra` agrupa toda Cita con Obra, así que es un uso roto), lanza nombrando la Cita y la ficha;
  - grupo de 1 → `tema = temasDeLaCita(cita, publicados)[0]` (orden declarado por la Cita; un Tema bajo `MIN_CITAS_POR_TEMA` no está en `publicados` y no cuenta); sin él → `undefined`; si no, recorre `listados.get(tema.slug)` desde la posición siguiente a la Cita, con vuelta al principio, y devuelve la primera con `autor !== cita.autor`; si no hay ninguna → `undefined`. Nunca devuelve la propia Cita ni una del mismo Autor por esta rama, y no mira un segundo Tema.
- `src/lib/atribucion.ts`: `FILA_SIGUIENTE_DE_ESTA_OBRA = 'Siguiente cita de esta obra'`; `temaEnFrase(nombre)` —el nombre del Tema con su primera letra en minúscula (`toLocaleLowerCase('es')`), el resto intacto: «La vida» → «la vida»—, exportada como la única regla de la minúscula del Tema tras «sobre» (la reutilizará el recuento de la 27.x); y `textoDeSiguiente(siguiente)` → la constante o `` `Siguiente cita sobre ${temaEnFrase(tema.nombre)}` ``, sin glifo (lo pone `FilaDeBloque`). Solo importa tipos de `publicado.ts`.
- `src/pages/cita/[slug].astro`: en `getStaticPaths`, `await citasDeLasObras(conjunto)` y un mapa de listados por Tema publicado calculado **una vez**, y cada Cita recibe `siguiente: siguienteCita(...)`; se pasa como `<TarjetaDeObra cita={cita} autor={autor} nivel={2} siguiente={siguiente} />`.
- `TarjetaDeObra.astro`: `siguiente: SiguienteCita | undefined` en `Props`, **obligatorio y sin `?`** (cada uso declara si hay «Siguiente»; la portada, 28.2). Dentro de `ul.filas`, y solo si hay Obra, primero `<FilaDeBloque href={rutaDeCita(siguiente.cita.slug)} zona="siguiente" avance>{textoDeSiguiente(siguiente)}</FilaDeBloque>` y después la fila de la Obra sin cambios; las dos en la misma línea que sus etiquetas (docblock de `FilaDeBloque`). Sin `siguiente`, el marcado de la tarjeta es byte a byte el de la 24.4. La sección sigue sin `<a` propio, sin `<script>` ni `data-ingreso`, y `FilaDeBloque.astro` no cambia.
- El orden de tabulación sale del marcado: «Siguiente» antes que «Ver la obra» (UX-DR63); misma pestaña, en tinta, sin subrayado (lo da `FilaDeBloque`).
- Importaciones relativas, sin alias (`tests/unit/peso.test.ts`).

**Block If:**
- Cumplir el contrato exigiera tocar `src/lib/vocabulario.ts`, `src/lib/ingreso.ts`, `src/components/FilaDeBloque.astro` (más allá de su docblock), la configuración de Astro, `tools/lib/cobertura.ts` / `integraciones/cobertura.ts`, o un artefacto de `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.
- El `diff -rq` de las dos construcciones del Corpus real (Verification) cambia algún fichero fuera de `dist/cita/`, `dist/pagefind/` y la hoja `_astro/_slug_.*.css`.

**Never:**
- Ordenar Citas fuera de `src/lib/obras.ts`, agrupar una Obra por su cuenta o leer `procedencia.obra` en `src/` (tampoco en comentarios: `tests/unit/obras.test.ts`).
- Guion, `localStorage`/`sessionStorage`, «seguir donde lo dejaste» o cualquier cosa que dependa del visitante, de la jornada, de la indexabilidad, de la congelación, de `ediciones` o de la afiliación.
- Tocar `RutasDeSalida.astro`, `citasRelacionadas`, las hermanas o sus respaldos (24.6), `BloqueDeCita.astro`, `index.astro`, `404.astro`, ni la relación de `tools/lib/cambios.ts` (24.8; solo un comentario).
- Tocar en `tests/unit/medicion.test.ts` `COLOCACION`, `ZONAS_DE_HOY` ni `esDeOtraEpica`: `siguiente` ya es zona «de otra épica» y la prueba de la 23.7 pasa sin tocarla.
- Pintar «→» (U+2192) o cualquier glifo que no sea el «›» de `FilaDeBloque`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Obra de n ≥ 3 | orden del libro A, B, C (≠ slug) | A→B, B→C, C→A; «Siguiente cita de esta obra ›» | — |
| Obra de 2 | A, B | A→B, B→A | — |
| Obra de 1, sigue otro Autor | listado del Tema: …, X (esta), Y (mismo Autor), Z (otro) | → Z; «Siguiente cita sobre la vida ›» | — |
| Obra de 1, solo del mismo Autor detrás | X, Y (mismo) al final; W (otro) al principio | → W (vuelta) | — |
| Primer Tema declarado sin publicar | `temas: [la-amistad (<15), la-vida]` | usa la-vida | — |
| Primer Tema publicado sin otro Autor | `temas: [el-deber (todo suyo), la-vida]` | sin fila: no mira la-vida | — |
| Obra de 1 sin Tema publicado | `temas: [la-amistad]` | sin fila; la tarjeta, la de la 24.4 | — |
| Cita sin Obra | — | `undefined`; no hay tarjeta | — |
| Obra `noindex` o congelada | — | la misma fila, byte a byte | — |
| Grupo roto | la Cita no está en el grupo de su Obra | — | lanza nombrando Cita y ficha |

</intent-contract>

## Code Map

- `src/lib/publicado.ts:173-186` -- `citasDeTema` (por slug, el listado de la Página de Tema) y `temasDeLaCita` (orden declarado, solo publicados); `:141-149` `temasPublicados`; `:502-514` `citasPorObra`; `:888-905` `citasDeLasObras` (memorizada, async: solo en la página); `:44-71` `Cita`, `:88-91` `Tema`. La función nueva va junto a `citasRelacionadas` (`:383`).
- `src/lib/obras.ts:1050` `ordenDelLibro` (solo lectura: el único que ordena); `:704-737` `ObraResuelta` (`nombre`, `recuento`).
- `src/lib/atribucion.ts:239-271` -- `FILA_VER_LA_OBRA*` y `contenidoDeTarjetaDeObra`, vecinas de lo nuevo; `:13-15` sus importaciones (solo tipos de `publicado.ts`).
- `src/components/TarjetaDeObra.astro:33-80` -- importaciones, `Props`, la guarda del Autor ajeno y `ul.filas`; docblock (`:1-30`) a poner al día con «Siguiente».
- `src/components/FilaDeBloque.astro` -- solo lectura; su docblock ya prevé la 24.5 y la exención por la clase `fila-de-bloque`.
- `src/pages/cita/[slug].astro:21-48,85` -- importaciones, `getStaticPaths` (ya calcula `publicados`) y el uso de la tarjeta; `rutaDeCita` de `../../lib/superficies.ts`.
- `src/pages/tema/[slug]/[...page].astro:35` y `src/pages/obra/[autor]/[slug]/[...page].astro:57-60` -- los dos listados que «Siguiente» debe seguir (solo lectura).
- `tools/lib/cambios.ts:36-40,200-203` -- los comentarios de la 24.4 sobre la Página de Cita; se amplían.
- `tests/unit/tarjeta-de-obra.test.ts:224-233` (Props), `:285-295` (fuente de la tarjeta), `:297-311` (único uso exacto), `:544-555` y `:575-587` (sondas sin `siguiente`), `:681-717` («un único enlace»), `:719-741` (usan `enlacesDe(...)[0]` como la fila de la Obra), `:458-536` fixture (Brevedad 3, Cartas 2, Machado 2 → con «Siguiente»; De la ira 1 con `el-tiempo` sin publicar → sin él).
- `tests/unit/obra-pagina.test.ts:1254` y `tests/unit/ediciones-en-venta.test.ts:848` -- comparaciones byte a byte de la tarjeta (congelada / afiliación) que ya cubren la fila.
- `tests/unit/ayuda/construir.ts` (`construirConCorpus`, `citaValida`, `AUTOR_VALIDO`, `TEMA_VALIDO`, `paginaConstruida`; el andamio siembra un documento por (Fuente, obra) con los textos en orden de inserción y las fichas que falten), `tests/unit/ayuda/enlaces.ts` (`enlacesDe`, declaración más cercana), `tests/unit/ayuda/tarjeta-de-obra.ts` (lector único de la tarjeta).
- `tests/e2e/accesibilidad.spec.ts:127-146` (`CITAS_24_4`), `:565-635` (orden de tabulación con Tab real), `:698-770` (zonas de toque; exención de `.hermanas`); `tests/e2e/pagina-de-cita.spec.ts:584-623` (360 × 640 y anotación), `:625-767` (tokens de `li.fila-de-bloque`, que pasa a ser la de «Siguiente»); `tests/e2e/ayuda/corpus.ts:211-226` `citaConTarjetaCompleta` (Obra ≥ 2: siempre con «Siguiente»).
- `AGENTS.md:788-812` -- subsección «La Tarjeta de Obra (Historia 24.4)».

## Tasks & Acceptance

**Execution:**
- `src/lib/publicado.ts` -- `SiguienteCita` y `siguienteCita` según Always, docblock con FR-12, UX-DR65, UX-DR109, AD-11 y AD-25 -- un solo dueño de la decisión, pura y probada sin construir.
- `src/lib/atribucion.ts` -- `FILA_SIGUIENTE_DE_ESTA_OBRA`, `temaEnFrase`, `textoDeSiguiente` -- lo compone `src/lib/`, no la plantilla (UX-DR107).
- `src/pages/cita/[slug].astro` -- calcular y pasar `siguiente` según Always, con un comentario.
- `src/components/TarjetaDeObra.astro` -- prop `siguiente` y la fila según Always; docblock al día (dos filas, UX-DR65, «Siguiente» antes que «Ver la obra»).
- `tools/lib/cambios.ts` -- solo comentarios: «Siguiente» depende del orden de la Obra y del listado del Tema, es navegación y no fecha ni avisa (excepción de Héctor, 24.8, FR-47).
- `AGENTS.md` -- en «La Tarjeta de Obra (Historia 24.4)», «una sola Fila de bloque» pasa a una o dos, y un punto sobre «Siguiente» (24.5): las dos reglas, `siguienteCita` y `textoDeSiguiente`/`temaEnFrase` como dueños, prop obligatoria, zona `siguiente`, sin guion ni almacenamiento.
- `tests/unit/siguiente.test.ts` (nuevo) -- **sin construir:** cada fila de la matriz contra `siguienteCita` (también el grupo roto que lanza, la cita sin Obra, y que el resultado no depende del orden de `conjunto.citas`); `temaEnFrase` («La vida» → «la vida», «El tiempo» → «el tiempo», cadena de una letra) y `textoDeSiguiente`. **Una construcción** con el fixture de Design Notes: (a) para cada Obra de n ≥ 2, el orden del Listado de Obra leído de sus páginas en `dist/` (enlaces `listado`), y desde cada Cita seguir el `href` de la fila `siguiente` recorre las n en ese orden y vuelve a la de partida en n saltos; (b) en cada Obra de una Cita con fila, el destino es la primera de otro Autor que le sigue, con vuelta, en el listado de `/tema/{slug}/` (todas sus páginas) de su primer Tema publicado, existe en `dist/` y la fila dice «Siguiente cita sobre {tema}»; (c) los casos sin fila no tienen `li[data-zona="siguiente"]` y su tarjeta tiene una sola fila; (d) donde la hay, la fila es el primer `li` de `ul.filas`, con `{ zona: 'siguiente' }` como declaración más cercana, sin `target`, texto seguido del único `span[aria-hidden]` con U+00A0 + «›», y ningún «→»; (e) la portada y el 404 no la llevan.
- `tests/unit/tarjeta-de-obra.test.ts` -- enmendar a la 24.5: Props con `siguiente` obligatorio (`SiguienteCita | undefined`), el uso exacto `<TarjetaDeObra cita={cita} autor={autor} nivel={2} siguiente={siguiente} />`, la fuente con la fila `zona="siguiente"`, sondas con `siguiente={undefined}`; «un único enlace» pasa a «la fila de la Obra es el último enlace y el único con `tarjeta-de-obra`; antes, la de `siguiente` solo en Brevedad, Cartas y Machado»; las pruebas que tomaban `enlacesDe(...)[0]` toman el enlace con zona `tarjeta-de-obra`.
- `tests/unit/obra-pagina.test.ts:1254` y `tests/unit/ediciones-en-venta.test.ts:848` -- sin construir más: exigir que alguna de las tarjetas comparadas lleve `li[data-zona="siguiente"]`, para que la igualdad byte a byte no sea vacía.
- `tests/e2e/accesibilidad.spec.ts` -- orden de tabulación con tarjeta: dos paradas en la tarjeta, «Siguiente cita de esta obra» (`/cita/…`) y después «Ver la obra y dónde leerla» (`/obra/…`); zonas de toque: además de su página, la de `CITAS_24_4.completa`, comprobando que trae dos `.fila-de-bloque` apiladas, y la exención de los 8 px extendida a los enlaces de un mismo `ul` padre de `.fila-de-bloque` (por el componente, no por la ruta), que sigue exigiendo que no se solapen.
- `tests/e2e/pagina-de-cita.spec.ts` -- en la `describe` 24.4: la tarjeta de `completa` tiene dos filas, «Siguiente…» primero; el alto de la tarjeta a 360 px se anota (`24.5 a 360 × 640`) y sigue valiendo la Cita en la primera pantalla y Copiar antes de y = 1.280.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- al cerrar, solo la línea `24-5-de-una-cita-a-la-siguiente-del-libro`; el resto y sus comentarios, intactos.

**Acceptance Criteria:**
- Given el repositorio con la historia, when corre `npm run check`, then 0 errores.
- Given la suite de Vitest, when corren uno a uno `siguiente`, `tarjeta-de-obra`, `ediciones-en-venta`, `obra-pagina`, `medicion`, `obras`, `orden-del-libro`, `publicado`, `ingreso-construido`, `peso`, `superficies`, `espinas-de-ux`, `publicable-y-alcanzable`, `fecha-de-cambio-build` y `cobertura-build`, then pasan, `medicion` y `obras` sin tocar sus tablas.
- Given dos `FECHA_JORNADA=2026-10-27 npm run build` del Corpus real, línea base y con la historia, when se comparan con `diff -rq`, then la segunda sale con 0 (cobertura sin caídas), solo cambian páginas de `dist/cita/` (y quizá `dist/pagefind/` y la hoja de la Página de Cita), y el `<main>` de una Cita sin Obra es idéntico; se anotan en el spec cuántas Páginas de Cita llevan «Siguiente» por obra, por tema y ninguna, y el peso antes y después.
- Given el sitio construido por `tests/servidor.mjs`, when corren en los dos proyectos `accesibilidad`, `pagina-de-cita`, `rutas-de-salida`, `copiar` y `busqueda`, then pasan, y la tarjeta de dos filas mide unos 240 px a 360 (cifra anotada en el spec, UX-DR64).

## Spec Change Log

## Review Triage Log

### 2026-10-27 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las cinco capas son externas y en esta pasada no traen hallazgos: la revisión independiente viene después.

### 2026-10-27 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3: (high 0, medium 1, low 2)
- defer: 0
- reject: 20
- addressed_findings:
  - `[medium]` `[patch]` La rama del Tema de `siguienteCita` caía en silencio ante un mapa roto (blind-hunter, edge-case-hunter, ac-auditor 4): `listados.get(...) ?? []` callaba un Tema ausente y, con la Cita fuera de su listado (`aqui === -1`), el recorrido arrancaba en 0 y daba un destino que no es «la que sigue». Ahora lanza nombrando Cita y Tema, como el grupo roto de la Obra (`citasDeTema` lista toda Cita que declara el Tema), con docblock al día y una prueba pura nueva en `tests/unit/siguiente.test.ts` («listado roto»: Tema ausente de `listados` y Cita ausente de su listado). El build del Corpus real sigue con código 0 y el mismo peso de `dist/`.
  - `[low]` `[patch]` `tests/unit/siguiente.test.ts`: (a) volvía a leer la página en cada salto y tomaba el texto del primer enlace a `/cita/` sin mirar su zona; ahora reutiliza la tarjeta de la primera lectura y lee el texto de la fila `data-zona="siguiente"`. La segunda prueba «(b)» pasa a «(b′)».
  - `[low]` `[patch]` `tests/e2e/pagina-de-cita.spec.ts` (ac-auditor 2, blind-hunter): desde la 24.5 nada medía el filete de debajo de la fila de la Obra, y el destino de «Siguiente» solo se comprobaba con un 200. La prueba de la cara completa compara ahora también el filete inferior de las dos filas (el de la primera lo juzga contra los tokens «los tokens calculados…») y exige que la tarjeta del destino lleve a la misma Página de Obra.

Rechazados (20, tras deduplicar), con su motivo: `temaEnFrase` sobre un Tema que empiece por nombre propio o por espacios —la regla la fija el contrato, los 24 Temas empiezan por artículo y el esquema rechaza el nombre en blanco sin recortarlo por NFR-12—; la zona `siguiente` sin registrar —está en `ZONAS` de `src/lib/vocabulario.ts` y la prueba de la 23.7 la trata como de otra épica, como manda el contrato—; el spec en `done` antes de la revisión —es el diseño del bucle, cuyas capas externas corren después—; riesgos residuales como diferidos —Copiar fuera de la primera pantalla es deuda aceptada (SM-C5) y la caída por tiempo de `rutas-de-salida.spec.ts:98` ya estaba diferida en la 24.4—; tiempo de build y `findIndex` lineal —`citasDeLasObras` está memorizada y la suma de cuadrados de los grupos es despreciable—; la vuelta sin señal y la fila del Tema bajo «De la obra» —las fija el contrato y UX-DR65—; aserciones de fuente frágiles —patrón vigente de la 24.4—; el predicado de zona repetido en las pruebas —cosmético—; el `[12]` de `obra-pagina.test.ts` —el orden exacto lo juzga (a) de `siguiente.test.ts`—; la anotación renombrada a `24.5 a 360 × 640` y la exención de los 8 px por componente —las pide el contrato—; la prop con la Cita entera —el tipo lo fija el contrato—; la variante del Tema y la ausencia de fila sin navegador —mismo componente, mismo marcado, juzgados en `dist/`—; el alto de 240 px sin aserción —el contrato lo pide anotado (UX-DR64), y la Cita «completa» sale del Corpus real, que se siembra a diario—; el clic que no mira la baliza —la declaración más cercana, que es lo que lee la escucha, la juzga (d)—; «sin hueco» sin prueba permanente —(c) exige una sola fila y la zona de la Obra—; 24.1 y 24.4 en `review` —es el estado del bucle—; el Corpus real sin prueba repetible —medido en el spec, como pide la Verification—.

## Design Notes

**El fixture de `siguiente.test.ts`** (todas cotejadas: el andamio escribe los documentos en orden de inserción y las fichas). Autores `seneca` (`AUTOR_VALIDO`), `antonio-machado`, `epicteto`; Temas «La vida» (`la-vida`), «El deber» (`el-deber`), «La amistad» (`la-amistad`, < 15). Séneca: «Sobre la brevedad de la vida» 4 Citas insertadas 3, 2, 1, 0 (orden del libro inverso al de los slugs), «Cartas a Lucilio» 2, «Sobre la vida feliz» 2 (`seneca-vida-feliz-0/1`, `la-vida`), «De la ira» 1 (`seneca-ira-0`, `[la-amistad, la-vida]`), «De la providencia» 1 (`[la-amistad]`). Epicteto: «Manual» 12 (`la-vida`), «Disertaciones» 1 (`epicteto-disertaciones-0`, `la-vida`). Machado: «Campos de Castilla» 15 (`el-deber`), «Soledades» 1 (`antonio-machado-soledades-0`, `[el-deber, la-vida]`). Listado de `la-vida`: soledades-0, disertaciones-0, manual-×12, ira-0, vida-feliz-0/1 (17). Esperado: brevedad 3→2→1→0→3; disertaciones-0 → `seneca-ira-0` (salta las doce del Manual); ira-0 → `antonio-machado-soledades-0` (salta vida-feliz y da la vuelta), «Siguiente cita sobre la vida»; providencia-0 y soledades-0 sin fila. La prueba deriva lo esperado de `dist/` y además lo compara con estas cifras.

**Por qué la decisión no vive en la tarjeta.** `citasDeLasObras` es asíncrona y por conjunto; la tarjeta se reutilizará en la portada (28.2), que dirá su propio `siguiente`. Una prop obligatoria con `undefined` explícito hace que un uso nuevo no la olvide sin que `astro check` lo diga.

**La minúscula.** Solo la primera letra: los 24 Temas empiezan por artículo («La vida», «El deber»), y respetar el resto no rebaja un nombre propio interior el día que lo haya.

## Verification

**Commands:** desde `/Users/hec/brainlySabiduria/.claude/worktrees/v8-epicas-24-26`; lo que pase de ~8 min, con `/Users/hec/brainlySabiduria/.claude/v8-ralph/correr.sh /Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-24-26/24-5-<nombre>.log /Users/hec/brainlySabiduria/.claude/worktrees/v8-epicas-24-26 <orden>` y llamadas sucesivas a `/Users/hec/brainlySabiduria/.claude/v8-ralph/esperar.pl <log> 540`.
- Antes de tocar código: `FECHA_JORNADA=2026-10-27 npm run build`, mover `dist/` al scratchpad (`$ANTES`); tras implementar, la misma orden y `diff -rq "$ANTES" dist` -- solo lo que dice el criterio; anotar recuentos y peso, borrar `$ANTES`.
- `npx vitest run tests/unit/siguiente.test.ts` y uno a uno los del criterio -- verdes.
- `npm run check` -- 0 errores. `npm test` en segundo plano (≈13 min) -- `FINISHED EXIT=0`.
- `npx playwright test tests/e2e/accesibilidad.spec.ts tests/e2e/pagina-de-cita.spec.ts tests/e2e/rutas-de-salida.spec.ts tests/e2e/copiar.spec.ts tests/e2e/busqueda.spec.ts` en segundo plano (puertos 4321 y 8787 solo de este worktree) -- verde (la caída por tiempo de `[movil] rutas-de-salida.spec.ts:98` ya está diferida: repetirla sola); parar todo servidor arrancado.

**Manual checks (if no CLI):**
- Anotar en el spec, de las anotaciones de Playwright, el alto de la tarjeta de dos filas a 360 px y la posición de Copiar.

## Auto Run Result

**Implementación (2026-10-27, bucle v8-ralph).** Status: done. Línea base `f096023b4267b202859c71c97f669d63a4effd94` (el commit del spec); código en `2794cbc3f1`.

Qué cambia:
- `src/lib/publicado.ts` -- `type SiguienteCita` y la pura `siguienteCita(cita, porObra, publicados, listados)`: por la Obra (grupo ≥ 2, `(i + 1) % n`), por el primer Tema publicado (primera de otro Autor tras ella, con vuelta), `undefined` sin Obra / sin Tema / sin otro Autor, y lanza ante un grupo roto nombrando Cita y ficha. `temasDeLaCita` acepta `readonly Tema[]` (solo el tipo).
- `src/lib/atribucion.ts` -- `FILA_SIGUIENTE_DE_ESTA_OBRA`, `temaEnFrase` (primera letra con `toLocaleLowerCase('es')`) y `textoDeSiguiente`, sin glifo; solo importa tipos de `publicado.ts`.
- `src/pages/cita/[slug].astro` -- `await citasDeLasObras(conjunto)` y el mapa de `citasDeTema` por Tema publicado, una vez; cada Cita recibe `siguiente`, que pasa a `<TarjetaDeObra … siguiente={siguiente} />`.
- `src/components/TarjetaDeObra.astro` -- prop `siguiente: SiguienteCita | undefined` obligatoria; la fila `zona="siguiente"` delante de la de la Obra dentro de `ul.filas`, en la misma línea; docblock al día. Sin `<a` propio, sin guion, sin `data-ingreso`; `FilaDeBloque.astro` sin tocar.
- `tools/lib/cambios.ts` -- solo comentarios: «Siguiente…» es navegación y no fecha ni avisa (24.8, FR-47).
- `AGENTS.md` -- «La Tarjeta de Obra (Historia 24.4)»: una o dos filas, y el punto sobre «Siguiente…» (24.5).
- `tests/unit/siguiente.test.ts` (nuevo, 19 pruebas) -- la matriz pura, la independencia del orden de `conjunto.citas`, `temaEnFrase` y `textoDeSiguiente`; y una construcción con el fixture de las Design Notes: recorridos (a) a (e), contra el Listado de Obra y el de Tema leídos de `dist/` y contra las cifras del spec (37 Citas con fila de 39).
- `tests/unit/tarjeta-de-obra.test.ts` -- Props con `siguiente`, el uso exacto, la fuente con la fila `siguiente`, las sondas con `siguiente={undefined}`, «la fila de la Obra es el último enlace y el único con `tarjeta-de-obra`» (con «Siguiente…» en las 7 de Brevedad, Cartas y Machado y no en De la ira) y `filaDeLaObra` donde se tomaba `enlacesDe(...)[0]`.
- `tests/unit/obra-pagina.test.ts` y `tests/unit/ediciones-en-venta.test.ts` -- la igualdad byte a byte (congelada / afiliación) exige que alguna tarjeta comparada lleve `li[data-zona="siguiente"]`; la tarjeta de `seneca-cartas-0` y las filas de la afiliación se leen por zona.
- `tests/e2e/accesibilidad.spec.ts` -- dos paradas de tabulación en la tarjeta («Siguiente cita de esta obra» a `/cita/…`, después «Ver la obra y dónde leerla»); la prueba de zonas de toque pasa a función y mide además la cara completa, con las dos `.fila-de-bloque` apiladas; la exención de los 8 px se extiende al `ul` padre de `li.fila-de-bloque` (por el componente) y sigue exigiendo que no se solapen; a 320 px caben todas las filas.
- `tests/e2e/pagina-de-cita.spec.ts` -- la tarjeta de la cara completa tiene dos filas, «Siguiente…» primero, del mismo trato y a una Página de Cita servida; la anotación pasa a `24.5 a 360 × 640`.

Verificación:
- `FECHA_JORNADA=2026-10-27 npm run build` en la línea base y con la historia: las dos con código 0; la segunda pasa la cobertura («5288 páginas, 2 familias, sin caídas al tipo de reserva») y las rutas indexables (4.873). `diff -rq`: 4.416 diferencias, todas Páginas de `dist/cita/`; ningún fichero de `dist/pagefind/`, ni la hoja `_astro/_slug_.*.css`, ni ninguna otra página. Las 4 Citas sin Obra (p. ej. `concepcion-arenal-abrid-escuelas-y-se-cerraran-carceles`) salen idénticas, `<main>` incluido. Recuento: **4.232** Páginas de Cita con «Siguiente» por la Obra, **184** por el Tema, **0** con Obra y sin fila, 4 sin Obra; ningún «→» en `dist/cita/`. Peso de `dist/`: 474.347.224 → 475.701.816 bytes (452,4 → 453,7 MiB, +1.354.592 bytes, ≈ 307 bytes por Página de Cita con fila), 15.340 ficheros en los dos.
- Vitest uno a uno: `siguiente` 19, `tarjeta-de-obra` 28, `ediciones-en-venta` 55, `obra-pagina` 66, `medicion` 496 (sin tocar `COLOCACION`, `ZONAS_DE_HOY` ni `esDeOtraEpica`), `obras` 117 (sin tocar su tabla), `orden-del-libro` 47, `publicado` 58, `ingreso-construido` 38, `peso` 56, `superficies` 99, `espinas-de-ux` 10, `publicable-y-alcanzable` 30, `fecha-de-cambio-build` 10, `cobertura-build` 2: todo verde.
- `npm run check`: 0 errores, 0 avisos. `npm test`: 136 ficheros, 6.205 pruebas, verde (786 s).
- Playwright `accesibilidad`, `pagina-de-cita`, `rutas-de-salida`, `copiar`, `busqueda` en los dos proyectos: 261 verdes, 6 saltadas, 1 caída por tiempo en `[movil] rutas-de-salida.spec.ts:98` (45,3 s, ya diferida en la 24.4); repetida sola, verde en 14,5 s. Servidores parados y puertos 4321 y 8787 libres al terminar.
- Medido en el navegador (anotaciones de Playwright, `movil`): a 360 × 640 la tarjeta de dos filas de `agustin-alvarez-ahora-empieza-a-haber-quienes-piensen-en` mide **233 px** desde y = 536 (≈ 240 px de UX-DR64) y Copiar queda en y = 801; con el título de Obra más largo (`mariano-jose-de-larra-la-verdad-del-teatro-es-enteramente-convencional`), 305 px desde y = 575 y Copiar en y = 912. La Cita sigue empezando en la primera pantalla y Copiar antes de y = 1.280 (deuda aceptada que vigila SM-C5; la 24.4 medía 756 y 867).
- Auditoría de la matriz: cada fila la cubre al menos una prueba que corrió y pasó — n ≥ 3, 2, una con otro Autor detrás, la vuelta, primer Tema sin publicar, primer Tema publicado sin otro Autor, sin Tema publicado, sin Obra y grupo roto en la parte pura de `siguiente.test.ts`; los mismos casos construidos en (a)–(c) (Brevedad 3→2→1→0→3, Disertaciones → De la ira, De la ira → Soledades con vuelta, Providencia y Soledades sin fila); Obra `noindex` en `siguiente.test.ts` (Disertaciones, De la ira y Campos de Castilla con fila) y congelada en `obra-pagina.test.ts` (igualdad byte a byte con alguna tarjeta con «Siguiente»).

Revisión: 0 parches, 0 diferidos, 0 rechazados en esta pasada (capas externas sin hallazgos todavía). `followup_review_recommended: false` (0 parches; puntuación 0).

Riesgos residuales: «Siguiente…» depende del orden de la Obra y del listado del Tema —otras Citas, sus posiciones y sus Autores— y, como el resto de la tarjeta, no fecha ni avisa (excepción de Héctor; la 24.8 la deja así). Copiar sale de la primera pantalla de 360 × 640 unos 45 px más abajo que con la 24.4 (deuda aceptada, SM-C5). `[movil] rutas-de-salida.spec.ts:98` sigue rozando su límite de 30 s con la máquina cargada.

**Primera pasada de revisión (2026-10-27).** Las cinco capas externas; 3 parches aplicados (1 medio, 2 bajos), 0 diferidos, 20 rechazados tras deduplicar (motivos en el Review Triage Log).

Qué cambia:
- `src/lib/publicado.ts` -- la rama del Tema de `siguienteCita` lanza, nombrando Cita y Tema, si el listado de su Tema falta o no la contiene, igual que el grupo roto de la Obra; antes devolvía en silencio «sin fila» o un destino que no era «la que sigue».
- `tests/unit/siguiente.test.ts` -- prueba pura «listado roto» (20 pruebas); (a) lee el texto de la fila por su zona y sin volver a leer la página; la segunda «(b)» pasa a «(b′)».
- `tests/e2e/pagina-de-cita.spec.ts` -- la prueba de la cara completa compara además el filete inferior de las dos filas y exige que la tarjeta del destino de «Siguiente» lleve a la misma Página de Obra.

Verificación:
- `npx vitest run tests/unit/siguiente.test.ts`: 20 verdes. `npm run check`: 0 errores, 0 avisos. `npm test`: 136 ficheros, 6.206 pruebas, verde (827 s).
- `FECHA_JORNADA=2026-10-27 npm run build` del Corpus real: código 0, sin que ninguna Cita lance; `dist/` pesa lo mismo que antes del parche (475.701.816 bytes en 15.340 ficheros).
- Playwright `pagina-de-cita` y `accesibilidad` en los dos proyectos: 190 verdes, 4 saltadas (las de 360 × 640 en `escritorio`, a propósito); los servidores los para Playwright al terminar.

Seguimiento: `followup_review_recommended: true` — parches de esta pasada: 0 altos, 1 medio, 2 bajos; puntuación 3 × 1 + 1 × 2 = 5 (≥ 5).

Riesgos residuales: los de la implementación, sin cambios. La regla de `temaEnFrase` supone que todo Tema empieza por artículo (hoy los 24); un Tema que empiece por nombre propio lo bajaría a minúscula.
