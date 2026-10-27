---
title: 'Historia 24.6 — Al pie, más de la misma obra y más del Autor'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_revision: '3f369c8aec38c995744e611968dbe762dba9f6b5'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-24-context.md'
warnings:
  - oversized
deferred:
  - summary: >-
      El docblock de src/components/Chips.astro aún dice que la lista lleva, «como último recurso de las Rutas de salida», a un Autor; ese respaldo se retiró en la 24.6.
    evidence: |-
      La 24.6 quita la sección «Seguir leyendo» con el chip «Sobre {Autor}», y Chips ya solo se usa para Temas. El Code Map del spec declara Chips.astro de solo lectura, así que el comentario no se tocó en esta historia; es un comentario, sin efecto en dist/.
    location: >-
      src/components/Chips.astro:5
    severity: low
---

<intent-contract>

## Intent

**Problem:** Al pie de la Página de Cita, `RutasDeSalida.astro` pinta hasta cuatro «Citas hermanas» del Autor con su propio marcado (sin Obra, mezclando las del mismo libro y sin descontar «Siguiente»), un respaldo «Explorar por tema» / «Seguir leyendo» y `data-pagefind-ignore` sin valor; no ofrece seguir por la Obra (FR-12, UX-DR67–69, UX-DR101, UX-DR108, UX-DR112).

**Approach:** Tres grupos tras las acciones —«De la misma obra» (hasta `MAX_CITAS_DE_LA_MISMA_OBRA` = 3, orden del libro, sin la actual ni la siguiente), «Más de {Autor}» (hasta `MAX_CITAS_RELACIONADAS` = 4, sin las de su Obra) y «Temas»—, con la Tarjeta de Cita de los listados y un cierre Fila de bloque «Las {n} citas de… ›»; lo decide una función pura de `src/lib/publicado.ts` con un único reparto compartido, lo redacta `src/lib/atribucion.ts`, y todo va bajo `data-pagefind-ignore="all"`. Se mide y anota NFR-7, el alto a 360 px y el peso de `dist/` con su proyección para que Héctor revise los valores de la 24.2.

## Boundaries & Constraints

**Always:**
- `src/lib/umbrales.ts`: `export const MAX_CITAS_DE_LA_MISMA_OBRA = 3;` justo tras `MAX_CITAS_RELACIONADAS`, con docblock (UX-DR68, AD-9); el docblock de `MAX_CITAS_RELACIONADAS` pasa a UX-DR69 («del Autor, sin las de su Obra»). Valores sin tocar en el resto del fichero (aviso y tope de la 24.2 incluidos).
- `src/lib/publicado.ts` —un solo reparto (AD-11, «sin una segunda función de reparto»)—:
  - `export function repartir<T>(candidatas: readonly T[], maximo: number): T[]`: la aritmética que hoy vive en `citasRelacionadas` movida tal cual —si `length <= maximo`, todas; si no, `paso = (length - 1) / (maximo - 1)` e índices `Math.round(i * paso)`, que conservan el orden de entrada y siempre incluyen la primera y la última—. `maximo` entero < 2 lanza (con 1 el paso divide por cero). `citasRelacionadas` la llama y su salida para las mismas entradas no cambia.
  - `citasRelacionadas(citas, cita, maximo, siguiente: Cita | undefined)` (cuarto parámetro **obligatorio**): candidatas = Citas del Autor (`citasDeAutor`) sin la propia, sin `siguiente`, y sin las de la misma Obra (`c.obra?.nombre === cita.obra.nombre` cuando la Cita tiene Obra; sin Obra no excluye por Obra); conserva el orden «comparten Tema primero, después el resto» y reparte con `repartir`.
  - `citasDeLaMismaObra(cita, porObra: ReadonlyMap<string, readonly Cita[]>, siguiente: Cita | undefined, maximo: number): Cita[]`: sin Obra → `[]`; si el grupo de `porObra` (el de `citasDeLasObras`, ya en orden del libro: aquí no se ordena, AD-25) falta o no contiene la Cita, lanza nombrando Cita y ficha, como `siguienteCita`; si no, el grupo sin la propia ni `siguiente`, repartido con `repartir` (sale en orden del libro).
  - `export interface RutasDeSalidaDeCita { mismaObra: { obra: ObraResuelta; citas: Cita[] } | undefined; delAutor: { recuento: number; citas: Cita[] } | undefined; temas: Tema[] }` y la pura `rutasDeSalidaDeCita(cita, citas: readonly Cita[], porObra, publicados: readonly Tema[], siguiente: SiguienteCita | undefined): RutasDeSalidaDeCita`, con `MAX_CITAS_DE_LA_MISMA_OBRA` y `MAX_CITAS_RELACIONADAS`. Un grupo sin Citas es `undefined` (no lista vacía). `mismaObra.obra` es `cita.obra` (el recuento del cierre es `obra.recuento`); `delAutor.recuento` = Citas publicadas del Autor (todas, la propia incluida: es lo que lista su Página de Autor); `temas` = `temasDeLaCita(cita, publicados)`. Ninguna Cita en los dos grupos a la vez, ninguna la propia ni `siguiente?.cita`.
- `src/lib/atribucion.ts`: `cierreDeLaMismaObra(obra: Pick<ObraResuelta, 'recuento' | 'titulo'>)` → `` `Las ${recuento} citas de ${titulo}` `` y `cierreDeMasDelAutor(autor: Pick<Autor, 'nombre'>, recuento: number)` → `` `Las ${recuento} citas de ${nombre}` ``, sin glifo (lo pone `FilaDeBloque`), título nunca recortado (NFR-12). Recuento < 2 lanza: por construcción el bloque de la Obra existe con ≥ 3 y el del Autor con ≥ 2, así que el singular sería un uso roto. Solo tipos de `publicado.ts`/`obras.ts`.
- `src/pages/cita/[slug].astro`: en `getStaticPaths`, `rutas: rutasDeSalidaDeCita(cita, conjunto.citas, porObra, publicados, siguiente)` reutilizando `porObra`, `publicados` y el `siguiente` ya calculados; fuera `relacionadas`, `chips` y `temasDelSitio`. Uso: `<RutasDeSalida autor={autor} rutas={rutas} zona="rutas-de-salida" />`, tras `CompartirEnlace`.
- `src/components/RutasDeSalida.astro` —Props `autor: Autor`, `rutas: RutasDeSalidaDeCita`, `zona: Zona` (obligatoria: la de «Más de {Autor}» y su cierre)—. Si los tres grupos faltan, no pinta nada (ni `nav`, ni filete, ni hueco). Si no: `<nav class="salidas" aria-label="Seguir leyendo" data-pagefind-ignore="all">` **sin** `data-zona`, y dentro, solo los grupos presentes y en este orden:
  - `section.de-la-misma-obra`: `<Rotulo id="de-la-misma-obra">De la misma obra</Rotulo>`, `ul.tarjetas` con `<TarjetaDeCita cita atribucion="ninguna" zona="misma-obra" />` por Cita y, último, `<FilaDeBloque href={rutaDeLaObra(obra)} zona="misma-obra" avance>{cierreDeLaMismaObra(obra)}</FilaDeBloque>`;
  - `section.mas-del-autor`: `<Rotulo id="mas-del-autor">Más de {autor.nombre}</Rotulo>`, `ul.tarjetas` con `<TarjetaDeCita cita atribucion="obra" zona={zona} />` y, último, `<FilaDeBloque href={rutaDeAutor(autor.slug)} zona={zona} avance>{cierreDeMasDelAutor(autor, recuento)}</FilaDeBloque>`;
  - `section.temas-de-la-cita`: `<Rotulo id="temas-de-la-cita">Temas</Rotulo>` y `<Chips … zona="chip-de-tema" />`.
  Cada `FilaDeBloque` con su texto en la misma línea que sus etiquetas (docblock de `FilaDeBloque`). Si `autor.slug !== cita.autor` de cualquier tarjeta de «Más de», o una tarjeta repite la de otro grupo, lanza (uso roto). Estilos con tokens: `.salidas` `margin-top: calc(var(--unidad) * 8)` y `calc(var(--unidad) * 12)` en `@media (min-width: 600px)` (el corte de `tokens.css`), `padding-top: calc(var(--unidad) * 3)`, `border-top` de filete, `max-width: var(--medida-prosa)`; `section + section` a 4 × `--unidad`; `ul.tarjetas` `list-style: none; padding: 0; margin: calc(var(--unidad) * 2) 0 0;` con `border-top` de filete. Fuera `.hermanas`, `fragmento`, `temasDelSitio`, «Explorar por tema» y «Seguir leyendo» como sección. Docblock nuevo (FR-12, UX-DR67–69, UX-DR101, UX-DR108, UX-DR112, AD-11, AD-19, NFR-13).
- Orden de tabulación = orden del marcado: tarjetas de la misma obra, su cierre, tarjetas del Autor, su cierre, chips.
- Determinista por commit: nada depende de la jornada, el visitante, la indexabilidad, la congelación ni la afiliación. Sin guion ni `data-ingreso`. Importaciones relativas.
- Las mediciones (Verification) se hacen solo contra construcciones locales, con la medición contra un receptor local o ficticio en 8787; nunca el sitio en vivo.

**Block If:**
- Cumplir el contrato exigiera tocar `src/components/TarjetaDeCita.astro` o `FilaDeBloque.astro` más allá de su docblock, `src/lib/vocabulario.ts`, `src/lib/ingreso.ts`, la configuración de Astro, `tools/lib/cobertura.ts`/`integraciones/cobertura.ts`, los valores de `AVISO_DE_PESO_DE_DIST`/`TOPE_DE_PESO_DE_DIST`, o un artefacto de `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.
- El `diff -rq` de las construcciones del Corpus real (Verification) cambia algo fuera de `dist/cita/`, `dist/pagefind/` y `dist/_astro/*.css`, salvo las referencias a hojas de estilo del `<head>` de otras páginas; un `<body>` de otra familia que cambie, o el sitemap o un PNG, bloquea.
- `npm run build` del Corpus real pasa el aviso de 750 MiB o el tope de 900 MiB.

**Never:**
- Ordenar o agrupar Citas fuera de `src/lib/obras.ts`/`citasDeLasObras`, leer `procedencia.obra` en `src/` (tampoco en comentarios), contar en un componente, o escribir una segunda aritmética de reparto.
- Pintar «→» (U+2192) o un glifo que no sea el «›» de `FilaDeBloque`; recortar un título; dejar rótulo, filete o hueco de un grupo vacío; añadir otro respaldo.
- Tocar la Tarjeta de Obra, «Siguiente», `BloqueDeCita.astro`, `index.astro`, `404.astro`, ni la relación de `tools/lib/cambios.ts` (24.8; solo comentarios). En `tests/unit/medicion.test.ts`, no tocar `ZONAS_DE_HOY` ni `esDeOtraEpica`.
- Medir el sitio en vivo, `wrangler … --remote`, o construir/editar en `/Users/hec/brainlySabiduria`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Obra de 8, Autor con otras | orden del libro A…H, se lee C (sig. D) | misma obra: `repartir([A,B,E,F,G,H],3)` = A, F, H (índices 0, 3, 5), en ese orden; cierre «Las 8 citas de {título}» | — |
| Obra de 3 | A, B, C; se lee A (sig. B) | misma obra: C sola | — |
| Obra de 2 / sin Obra | — | sin «De la misma obra» (ni rótulo ni cierre) | — |
| Más de, con Obra | Autor con 15; 8 de su Obra | candidatas = las 7 de otras Obras o sin Obra → 4 repartidas; ninguna de su Obra; cierre «Las 15 citas de Séneca» | — |
| Más de, sin Obra | Cita sin Obra | elige entre todas las demás del Autor | — |
| Autor de una sola Obra | todas sus Citas en ella | sin «Más de {Autor}» | — |
| Sin Tema publicado | `temas: []` o bajo umbral | sin «Temas» | — |
| Ningún grupo | Autor de una Cita, Obra de 1, sin Tema | ningún `nav`, ningún filete; la Atribución sigue enlazando | — |
| Siguiente por Tema | otra Obra y otro Autor | no afecta a los grupos | — |
| Grupo roto | la Cita no está en su grupo de `porObra` | — | lanza nombrando Cita y ficha |
| `repartir` con `maximo` 1 o 0 | — | — | lanza |

</intent-contract>

## Code Map

- `src/components/RutasDeSalida.astro` (entero) -- se reescribe; hoy: hermanas propias (`.hermanas`, `fragmento` a 90), chips, respaldo con `temasDelSitio`, `data-pagefind-ignore` sin valor y `data-zona` en el `nav`; estilos `.salidas` (`--respiracion * 1.5`), `section + section` (4 ×), `h2`.
- `src/pages/cita/[slug].astro:21-58,122-128` -- importaciones, `getStaticPaths` (ya calcula `publicados`, `porObra`, `listados`, `siguiente`) y el uso de `RutasDeSalida`.
- `src/lib/publicado.ts:169-185` `citasDeAutor`, `citasDeTema`, `temasDeLaCita`; `:383-410` `citasRelacionadas` (el reparto a mover, con su comentario); `:416-490` `SiguienteCita` y `siguienteCita` (patrón del lanzamiento por grupo roto); `:958` `citasDeLasObras`.
- `src/lib/atribucion.ts:239-300` -- `FILA_VER_LA_OBRA*`, `contenidoDeTarjetaDeObra`, `textoDeSiguiente`: vecinos de los cierres.
- `src/lib/umbrales.ts:275-276` -- `MAX_CITAS_RELACIONADAS`; `:470-519` constantes del peso (solo lectura, cifras de partida de la proyección).
- `src/components/TarjetaDeCita.astro` -- solo lectura salvo el docblock de `atribucion` («que la Historia 24.6 pasará» → ya lo usan); `li.tarjeta` con `data-zona`, `a` con `margin-inline: calc(var(--unidad) * -1)`.
- `src/components/FilaDeBloque.astro`, `Rotulo.astro`, `Chips.astro` -- solo lectura (Rotulo: docblock, que ya no es solo de la Página de Obra); `rutaDeLaObra` de `src/lib/obras.ts`, `rutaDeAutor` de `src/lib/superficies.ts`.
- `src/pages/autor/[slug]/[...page].astro:137-200` -- patrón del `ul.listado` (filete superior, 2 × de margen).
- `tools/lib/cambios.ts:30-41,200-207` -- comentarios sobre `RutasDeSalida` y «Citas hermanas».
- `tests/unit/citas-relacionadas.test.ts` -- llamadas de 3 argumentos a ampliar con `undefined`.
- `tests/unit/tarjeta-de-cita.test.ts:170-196` -- `ESPERADA` (un uso por fichero) a ampliar con `RutasDeSalida.astro`.
- `tests/unit/medicion.test.ts:2870-2905` (`COLOCACION`: la fila `[CITA, '/autor/seneca/', …]` gana `rutas-de-salida` por el cierre), `:2922-2980` (respaldo y sonda a sustituir), `:3033` (lista de componentes con `zona`; `RutasDeSalida` sigue). Fixture `:1885-1940`: Séneca 52 Brevedad + 2 Cartas, así que «Más de Séneca» de `CITA` son las dos Cartas.
- `tests/unit/ayuda/listado.ts:36-72` (`listadoDe`, `tarjetasDelListado`), `ayuda/enlaces.ts` (`recorrerElementos` con antepasados, `enlacesDe`), `ayuda/tarjeta-de-obra.ts`, `ayuda/construir.ts` (`construirConCorpus` con `jornada`, `citaValida`, `AUTOR_VALIDO`, `TEMA_VALIDO`); `tests/unit/tarjeta-de-obra.test.ts:464-540` (fixture con censo y documentos escritos a mano para una Cita sin Obra); `tests/unit/siguiente.test.ts` (fixture de varios Autores y recorrido de `dist/`).
- `tests/e2e/rutas-de-salida.spec.ts` (entero), `tests/e2e/receptor.spec.ts:1152-1210,1272,1366-1372` (`HERMANAS`), `tests/e2e/pagina-de-cita.spec.ts:270-325` (serif `'.hermanas a'`, microcopia `.hermanas`) y `:575-630` (360 × 640), `tests/e2e/accesibilidad.spec.ts:128-150` (`CITAS_24_4`, barrido), `:583-645` (tabulación), `:706-790` (zonas de toque, exención `.hermanas`), `tests/e2e/busqueda.spec.ts:1-40` (`buscar`, `resultados`), `tests/e2e/ayuda/corpus.ts:177-245` (`citasResueltas`, `citaConTarjetaCompleta`), `:369` `citaDeAutorConUnaSola`.
- `AGENTS.md:675-682` (párrafo de `TarjetaDeCita`) y `:787-830` («La Tarjeta de Obra (Historia 24.4)», tras el que va la subsección nueva).

## Tasks & Acceptance

**Execution:**
- `src/lib/umbrales.ts` -- `MAX_CITAS_DE_LA_MISMA_OBRA` y docblocks según Always.
- `src/lib/publicado.ts` -- `repartir`, `citasRelacionadas` con `siguiente`, `citasDeLaMismaObra`, `RutasDeSalidaDeCita`, `rutasDeSalidaDeCita`, con docblocks (FR-12, UX-DR68/69, AD-11, AD-25).
- `src/lib/atribucion.ts` -- `cierreDeLaMismaObra`, `cierreDeMasDelAutor`.
- `src/pages/cita/[slug].astro` -- `rutas` y el uso nuevo, con comentario.
- `src/components/RutasDeSalida.astro` -- reescritura según Always.
- `src/components/TarjetaDeCita.astro`, `src/components/Rotulo.astro` -- solo docblocks al día.
- `tools/lib/cambios.ts` -- solo comentarios: las Rutas de salida pintan textos, Obras y recuentos de otras Citas; es navegación y no fecha ni avisa (excepción de Héctor, 24.8, FR-47).
- `AGENTS.md` -- el párrafo de `TarjetaDeCita` en presente (los cinco usos) y una subsección «Al pie de la Página de Cita (Historia 24.6)» tras la de la Tarjeta de Obra: los tres grupos y su orden, `rutasDeSalidaDeCita`/`repartir`/los dos cierres como dueños, zonas, `data-pagefind-ignore="all"`, sin respaldo, máximo siete tarjetas, navegación que no fecha.
- `tests/unit/ayuda/listado.ts` -- extraer de `tarjetasDelListado` un `tarjetasDe(contenidoDeUl, ruta)` exportado (misma salida); `tests/unit/ayuda/rutas-de-salida.ts` (nuevo) -- `leerRutasDeSalida(html, ruta)`: si hay `nav.salidas`, sus atributos y, por `section`, clase, nivel y texto del rótulo, `TarjetaLeida[]`, el cierre (`texto` sin el glifo, `href`, `zona`, glifo «›» en `span[aria-hidden]`) y los chips (`href`, `zona`).
- `tests/unit/rutas-de-salida.test.ts` (nuevo) -- **puras:** `repartir` (mismo resultado que el reparto de antes en los casos de `citas-relacionadas.test.ts`, orden conservado, extremos incluidos, lanza con 0 y 1), cada fila de la matriz contra `citasDeLaMismaObra`/`citasRelacionadas`/`rutasDeSalidaDeCita` (también: resultado independiente del orden de `citas`; nunca la propia ni la siguiente; grupos disjuntos), y los dos cierres (texto, lanzan con < 2). **Una construcción** con el fixture de Design Notes, y una segunda con otra `jornada`: (a) toda Página de Cita ≤ `MAX_CITAS_DE_LA_MISMA_OBRA + MAX_CITAS_RELACIONADAS` tarjetas y alguna con 7; (b) ninguna repite la propia, la del `li[data-zona="siguiente"]` ni otra tarjeta; (c) «De la misma obra»: subsecuencia del orden del Listado de Obra leído de `dist/`, sin Autor ni Obra en las tarjetas, `zona` `misma-obra`, cierre con el recuento y la ruta de la página 1 de la Obra; (d) «Más de»: del Autor, ninguna de su Obra, línea de Obra con el título de la ficha o sin ella si no tiene Obra, sin Autor, zona `rutas-de-salida`, cierre a `/autor/{slug}/` con su recuento; (e) chips `chip-de-tema` de los Temas publicados; (f) los casos sin grupo sin `section`, y la Cita sin ninguno sin `nav.salidas` ni «Seguir leyendo»; (g) toda `li.tarjeta` y la `section.tarjeta-de-obra` de una Página de Cita con un antepasado `data-pagefind-ignore="all"`, y ningún «→»; (h) orden de grupos, `h2` de cada rótulo; (i) las dos construcciones dan `nav.salidas` idénticos byte a byte; (j) se comparan además con las cifras de Design Notes.
- `tests/unit/citas-relacionadas.test.ts` -- cuarto argumento `undefined` y dos pruebas: excluye la misma Obra y la `siguiente`.
- `tests/unit/tarjeta-de-cita.test.ts` -- `ESPERADA` a `Record<string, Atribucion[]>`: `RutasDeSalida.astro` → `['ninguna', 'obra']`; comentario al día.
- `tests/unit/medicion.test.ts` -- `COLOCACION`: `[CITA, '/autor/seneca/', [{ zona: 'atribucion' }, { zona: 'rutas-de-salida' }]]`; el respaldo pasa a «una Cita sola de su Autor, de una Obra de una Cita y sin Temas no pinta Rutas de salida» (sin `nav.salidas`, sin «Sobre Séneca» ni «Explorar por tema»; enlaces juzgados igual) y la sonda se quita.
- `tests/e2e/ayuda/corpus.ts` -- `citaConLosDosBloques()` (Obra de ≥ 4 y el Autor con alguna Cita fuera de ella), `citaSinMismaObra()` (Obra de 2 y Autor con Citas fuera), `citaSinMasDelAutor()` (todas las del Autor en una Obra de ≥ 4), primera por slug o `undefined`.
- `tests/e2e/rutas-de-salida.spec.ts` -- sustituir las de `.hermanas`, «Seguir leyendo» y la del motor de recomendación por: en `citaConLosDosBloques`, grupos en orden con `h2`, ≤ 3 y ≤ 4 tarjetas, ninguna la propia ni la de «Siguiente», «Más de» del Autor y sin su Obra, cierres «Las {n} citas de… ›» a una página 200; `citaSinMismaObra` sin `.de-la-misma-obra`; `citaSinMasDelAutor` sin `.mas-del-autor`; la de `citaDeAutorConUnaSola` sin «Más de» y con enlaces en `main`. Quedan «ninguna Página de Cita publicada queda sin enlaces salientes», «ningún enlace saliente apunta a una página que no existe» y la del chip sin página.
- `tests/e2e/receptor.spec.ts` -- `HERMANAS` → `nav[aria-label="Seguir leyendo"] .mas-del-autor li.tarjeta a`, y la inserción, en `.mas-del-autor ul.tarjetas`.
- `tests/e2e/pagina-de-cita.spec.ts` -- serif: `'.hermanas a'` → `'.tarjeta .fragmento'`; microcopia: `.hermanas` → `.salidas li.tarjeta`; `describe` 24.6: tokens calculados (márgenes 64/96 px, 24 px, filetes, 16 px rótulo → lista, 32 px entre grupos, cierre en `--cuerpo-md` y `--tinta`), `nav.salidas` por debajo del final de la última `.isla`, y anotación `24.6 a 360` con `scrollHeight` de la página y alto del `nav`.
- `tests/e2e/accesibilidad.spec.ts` -- barrido: las tres caras nuevas (las dos primeras obligatorias, la tercera si el Corpus la tiene, nombrándola si no); tabulación: en `citaConLosDosBloques`, la secuencia de `salida` es tarjetas de la misma obra, su cierre, tarjetas del Autor, su cierre, chips; zonas de toque: `lista` = `n.closest('li.tarjeta, li.fila-de-bloque')?.parentElement`, índice entre `ul:has(> li.tarjeta), ul:has(> li.fila-de-bloque)`, sin `.hermanas`; dentro de una misma lista basta no solaparse con hasta `--unidad` + 1 px de diferencia de bordes (el margen negativo de la tarjeta); se mide además `citaConLosDosBloques`.
- `tests/e2e/busqueda.spec.ts` -- en `citaConLosDosBloques`, tomar la primera tarjeta de «De la misma obra», buscar sus primeras seis palabras (`textoDe`) y exigir que los resultados de tipo `cita` incluyan su página y no la de `citaConLosDosBloques`.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- al cerrar, solo la línea `24-6-al-pie-más-de-la-misma-obra-y-más-del-autor`.

**Acceptance Criteria:**
- Given el repositorio con la historia, when corre `npm run check`, then 0 errores.
- Given Vitest, when corren uno a uno `rutas-de-salida`, `citas-relacionadas`, `tarjeta-de-cita`, `medicion`, `siguiente`, `tarjeta-de-obra`, `obra-pagina`, `ediciones-en-venta`, `obras`, `publicado`, `ingreso-construido`, `peso`, `superficies`, `espinas-de-ux`, `publicable-y-alcanzable`, `fecha-de-cambio-build` y `cobertura-build`, then pasan (`medicion` sin tocar `ZONAS_DE_HOY` ni `esDeOtraEpica`), y `npm test` entero sale con 0.
- Given dos `FECHA_JORNADA=2026-10-27 npm run build` del Corpus real, línea base y con la historia, when se comparan, then la segunda sale con 0 sin aviso de peso, el `diff -rq` cumple el Block If, la Cita sin Obra y la de un Autor sin grupos no tienen `.de-la-misma-obra`, y se anotan: Páginas de Cita con los dos bloques, solo uno, ninguno; tarjetas máximas por página; peso antes y después (bytes y MiB de la línea de `integraciones/peso.ts`, ficheros, PNG) y la proyección.
- Given el sitio construido por `tests/servidor.mjs`, when corren en los dos proyectos `accesibilidad`, `pagina-de-cita`, `rutas-de-salida`, `busqueda`, `copiar` y `receptor`, then pasan.
- Given `origin/main` y la rama, construidas en local con `MEDICION_ENDPOINT=http://localhost:8787/` y un receptor ficticio, when se pasa Lighthouse móvil cinco veces a la misma Página de Cita con siete tarjetas, then NFR-7 queda anotado (medianas de LCP, FCP, TBT, CLS y bytes, las dos) sin puerta, y el alto a 360 de esa página en las dos.

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

Las capas de revisión son externas en este bucle y no traían hallazgos en esta pasada: la revisión independiente viene después.

### 2026-10-27 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 17: (high 0, medium 2, low 15)
- defer: 0
- reject: 12: (high 0, medium 0, low 12)
- addressed_findings:
  - `[medium]` `[patch]` Las guardas de `RutasDeSalida.astro` no las probaba nada (blind-hunter, verification-gap): tres sondas en `tests/unit/rutas-de-salida.test.ts` («Más de» de otro Autor, «De la misma obra» de otra Obra, tarjeta en los dos grupos) exigen código ≠ 0 y el mensaje con ruta y Cita; quitar una guarda las pone en rojo (comprobado).
  - `[medium]` `[patch]` La prueba de búsqueda podía fallar en falso y miraba una sola página que enlaza (blind-hunter, edge-case-hunter, intent-alignment, ac-auditor): `busqueda.spec.ts` elige, entre las tarjetas de los dos bloques, una cuyas seis palabras no estén en la Cita que se lee, y exige que ninguna página de los resultados que ofrece esa tarjeta al pie salga sin traer la consulta en su propio texto.
  - `[low]` `[patch]` Guardas incompletas (blind-hunter, edge-case-hunter): el componente lanza también si «De la misma obra» trae una Cita de otra Obra; su comentario y `AGENTS.md` dicen que la propia y la de «Siguiente» las garantiza solo `rutasDeSalidaDeCita` (el componente no las recibe).
  - `[low]` `[patch]` El recuento de «Más de» no se ataba a la Página de Autor (blind-hunter): la prueba (d) lee de `dist/` todas las páginas de `/autor/{slug}/` y exige que listen tantas Citas como dice el cierre.
  - `[low]` `[patch]` `repartir` con un umbral de 1 daba un error que no nombra el umbral (blind-hunter): los docblocks de `MAX_CITAS_RELACIONADAS` y `MAX_CITAS_DE_LA_MISMA_OBRA` dicen que son enteros de 2 o más y que `repartir` lanza con menos (el lanzamiento lo exige el intent-contract).
  - `[low]` `[patch]` Las cifras para Héctor solo estaban en el spec (blind-hunter, intent-alignment, ac-auditor): la nota de la 24.6 en `sprint-status.yaml` las nombra y señala el Auto Run Result.
  - `[low]` `[patch]` Docblock rancio de `Chips.astro` (blind-hunter, ac-auditor): corregido; el diferido de la primera pasada queda resuelto.
  - `[low]` `[patch]` `tarjeta-de-obra.test.ts` descartaba todo lo posterior al `nav` (blind-hunter): ahora quita solo el `nav.salidas` (`navDeSalidas`).
  - `[low]` `[patch]` La prueba de orden de `rutas-de-salida.spec.ts` podía pasar en vacío (blind-hunter): exige los dos bloques primero, el orden como subsecuencia y que el total sea 2 más la sección de Temas si está.
  - `[low]` `[patch]` `HERMANAS` en `receptor.spec.ts` (blind-hunter): pasa a `MAS_DEL_AUTOR`, con el comentario sobre el selector y no sobre el fixture.
  - `[low]` `[patch]` El corte de 600 px y el margen del pie sin documentar (blind-hunter): comentario en el `<style>` del componente con UX-DR67 y el corte de `tokens.css`.
  - `[low]` `[patch]` «Como mucho siete» escrito a mano (blind-hunter): `AGENTS.md` y el docblock de `umbrales.ts` lo dicen como suma de las dos constantes.
  - `[low]` `[patch]` (g) aceptaba el atributo en el propio elemento (intent-alignment, ac-auditor): las tarjetas del pie exigen un antepasado estricto; la Tarjeta de Obra, que lo lleva en su `section` desde la 24.4, sigue admitiéndolo en sí misma, y lo dice el comentario.
  - `[low]` `[patch]` El alto a 360 no se conciliaba con «todo lo que crece cae después de las acciones» (intent-alignment): conciliado en el Auto Run Result.
  - `[low]` `[patch]` La holgura de bordes de `--unidad` + 1 px valía para toda lista (intent-alignment, ac-auditor): `accesibilidad.spec.ts` la deja para las listas con Tarjetas de Cita, y las solo de Filas de bloque vuelven a 1 px.
  - `[low]` `[patch]` El hueco del rótulo «Temas» a sus chips no se medía (intent-alignment): `pagina-de-cita.spec.ts` lo mide, 2 × `--unidad`.
  - `[low]` `[patch]` (b) se saltaba en silencio si no leía «Siguiente» (ac-auditor): en una Obra de dos Citas o más, no leerlo falla.

Rechazados: el orden de parámetros de las dos elecciones (lo fija el intent-contract); el coste por página del recuento (≈ 2·10⁷ comparaciones por construcción, sin efecto medible); el respaldo de FR-12 (UX-DR67 y el intent-contract lo retiran, y «nunca sin enlaces internos» lo cumple la Atribución, que la prueba sigue mirando); `aria-labelledby` en las secciones (convertiría tres `section` en regiones dentro del `nav`; la navegación por `h2` ya existe); `status: done` frente a `review` (el spec cierra el bucle de construcción; el tablero dice revisión, como debe); el recuento de la Obra frente al largo de su grupo (salen de la misma resolución, y (c) lo ata al Listado de Obra de `dist/`); `cita`/`siguiente` como props del componente (cambiaría el contrato de Props del spec; lo cubre `rutasDeSalidaDeCita` y (b)); la garantía de ≤ 7 en el Corpus real solo por recuento a mano (el ac-auditor la repitió sobre las 4.420 páginas); el título frente a la identidad de la Obra en e2e (la identidad la mira (d)); `aria-label="Seguir leyendo"` en el `nav` (lo pide el spec); las historias previas en `review` y la caída por tiempo ya diferida de `[movil] rutas-de-salida.spec.ts:159`.

## Design Notes

**Fixture de `rutas-de-salida.test.ts`** (patrón de `tarjeta-de-obra.test.ts:464-540`: con censo, los documentos se escriben a mano, uno por Obra con los textos en orden de inserción). Autores `seneca` (`AUTOR_VALIDO`), `epicteto`, `antonio-machado`; Tema `el-tiempo` (`TEMA_VALIDO`, ≥ 15). Séneca 15: «Sobre la brevedad de la vida» 8 (`seneca-brevedad-0…7`, insertadas 7…0: orden del libro inverso al de los slugs, `el-tiempo`), «Cartas a Lucilio» 3 (`el-tiempo`), «Sobre la vida feliz» 2, «De la ira» 1 (`temas: []`), una sin Obra en el censo. Epicteto: «Manual» 5 (`el-tiempo`). Machado: «Soledades» 1 (`temas: []`). Esperado: brevedad con 3 + 4 tarjetas (7) y chip; cartas 1 + 4; vida feliz 0 + 4; ira 0 + 4 sin Temas; sin Obra sin tarjeta de obra y 4 de las 14; Manual 3 + 0; Soledades sin `nav`. Cierres: «Las 8 citas de Sobre la brevedad de la vida», «Las 3 citas de Cartas a Lucilio», «Las 5 citas de Manual», «Las 15 citas de Séneca»; Epicteto, ninguno.

**Proyección** (para Héctor, que revisa la 24.2 en la principal): Δ = (bytes después − bytes antes) / Páginas de Cita; KB por Cita nueva = 95 KB de la 24.2 (29,3 de página + 64,3 de Tarjeta + ~1) + Δ; Citas hasta el aviso, el tope y 1 GB decimal = (umbral − bytes después) / KB por Cita + Citas de hoy, frente a las ~7.790 / ~9.440 / ~10.030 de la 24.2. Cotas: un Autor u Obra nuevos suman además su página y su Tarjeta.

**Por qué el `nav` pierde su `data-zona`:** cada tarjeta y cada fila declara la suya en su `<li>` y los chips en su `ul`; la declaración más cercana manda, y una del `nav` solo sería una cuarta que no pinta nadie.

## Verification

**Commands:** desde `/Users/hec/brainlySabiduria/.claude/worktrees/v8-epicas-24-26`; lo que pase de ~8 min con `/Users/hec/brainlySabiduria/.claude/v8-ralph/correr.sh /Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-24-26/24-6-<nombre>.log /Users/hec/brainlySabiduria/.claude/worktrees/v8-epicas-24-26 <orden>` y llamadas sucesivas a `/Users/hec/brainlySabiduria/.claude/v8-ralph/esperar.pl <log> 540`. Puertos 4321, 4400 y 8787 solo de procesos de este worktree; parar todo servidor al terminar y borrar las copias del scratchpad.
- Antes de tocar código: `FECHA_JORNADA=2026-10-27 MEDICION_ENDPOINT=http://localhost:8787/ npm run build` -- anotar la línea del peso; `dist/` al scratchpad (`$ANTES`).
- La principal, con el árbol limpio: `git switch --detach origin/main` (SHA completo anotado; `package.json` y `package-lock.json` iguales a los de la rama —si no, parar y anotarlo—), la misma construcción, `dist/` al scratchpad (`$MAIN`), `git switch v8/epicas-24-26`.
- Tras implementar: la misma construcción y `diff -rq "$ANTES" dist` -- según Block If.
- Receptor ficticio en 8787 (204 a todo, CORS abierto) y `DIST=<copia> PUERTO=4400 node tests/servidor.mjs` para cada `dist/`; `CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx -y lighthouse@13.5.0 http://localhost:4400/cita/<slug>/ --only-categories=performance --chrome-flags=--headless=new --output=json` cinco veces por construcción (preajuste móvil por omisión), con la misma Cita de siete tarjetas presente en las dos.
- `npx vitest run tests/unit/<f>.test.ts` uno a uno; `npm run check`; `npm test` en segundo plano -- `FINISHED EXIT=0`.
- `npx playwright test tests/e2e/{accesibilidad,pagina-de-cita,rutas-de-salida,busqueda,copiar,receptor}.spec.ts` en segundo plano -- verde (la caída por tiempo de `[movil] rutas-de-salida.spec.ts` ya diferida: repetirla sola).

**Manual checks (if no CLI):**
- Alto a 360 × 640 (`document.documentElement.scrollHeight`) de la Página de Cita de Lighthouse en `$MAIN` y en la rama, con un guion de Playwright del scratchpad; anotar las dos cifras frente a ~1.500 → ~2.780.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** Al pie de la Página de Cita, `RutasDeSalida.astro` pinta ahora tres grupos —«De la misma obra» (hasta 3, orden del libro, Tarjeta `ninguna`, zona `misma-obra`), «Más de {Autor}» (hasta 4, sin las de su Obra, Tarjeta `obra`, zona `rutas-de-salida`) y «Temas»—, cada uno con su `h2` y, los dos primeros, con su cierre Fila de bloque «Las {n} citas de… ›». Lo decide la pura `rutasDeSalidaDeCita` con el único reparto `repartir`; un grupo vacío no está, sin ninguno no hay `nav`, no hay respaldo, y todo va bajo `data-pagefind-ignore="all"`, sin `data-zona` en el `nav`.

**Ficheros.**
- `src/lib/umbrales.ts` — `MAX_CITAS_DE_LA_MISMA_OBRA = 3` y docblocks (UX-DR68/69).
- `src/lib/publicado.ts` — `repartir`, `citasRelacionadas` con `siguiente`, `citasDeLaMismaObra`, `RutasDeSalidaDeCita`, `rutasDeSalidaDeCita`; `citasDeAutor` admite `readonly`.
- `src/lib/atribucion.ts` — `cierreDeLaMismaObra`, `cierreDeMasDelAutor` (lanzan con recuento < 2).
- `src/pages/cita/[slug].astro` — `rutas` en `getStaticPaths` con el mismo `porObra` y `siguiente`.
- `src/components/RutasDeSalida.astro` — reescrito.
- `src/components/TarjetaDeCita.astro`, `src/components/Rotulo.astro`, `tools/lib/cambios.ts` — solo comentarios.
- `AGENTS.md` — párrafo de `TarjetaDeCita` en presente y subsección «Al pie de la Página de Cita (Historia 24.6)».
- `tests/unit/rutas-de-salida.test.ts` y `tests/unit/ayuda/rutas-de-salida.ts` (nuevos); `tests/unit/ayuda/listado.ts` (`tarjetasDe`); `citas-relacionadas`, `tarjeta-de-cita`, `medicion` según el spec; `tarjeta-de-obra.test.ts` —fuera de la lista del spec— mira el marcado de la Cita sin Obra solo hasta `nav.salidas`, porque los cierres del pie son Filas de bloque que no son de la Tarjeta de Obra.
- `tests/e2e/{rutas-de-salida,receptor,pagina-de-cita,accesibilidad,busqueda}.spec.ts` y `tests/e2e/ayuda/corpus.ts` (`citaConLosDosBloques`, `citaSinMismaObra`, `citaSinMasDelAutor`).

**Revisión.** Ningún parche, nada diferido por revisión, nada rechazado (capas externas sin hallazgos en esta pasada). Diferido aparte: el docblock rancio de `Chips.astro` (solo lectura según el Code Map). `followup_review_recommended: false` (parches: 0 high, 0 medium, 0 low; puntuación 0).

**Verificación.**
- `npm run check` (`astro check`): 0 errores.
- Vitest uno a uno: `rutas-de-salida` (32), `citas-relacionadas` (8), `tarjeta-de-cita` (20), `medicion` (496), `siguiente` (20), `tarjeta-de-obra` (30, tras el ajuste), `obra-pagina` (66), `ediciones-en-venta` (55), `obras` (117), `publicado` (58), `ingreso-construido` (38), `peso` (56), `superficies` (99), `espinas-de-ux` (10), `publicable-y-alcanzable` (30), `fecha-de-cambio-build` (10), `cobertura-build` (2): verdes. `medicion` sin tocar `ZONAS_DE_HOY` ni `esDeOtraEpica`.
- `npm test` entero: 137 ficheros, 6.244 pruebas, `FINISHED EXIT=0`.
- Playwright, `accesibilidad`, `pagina-de-cita`, `rutas-de-salida`, `busqueda`, `copiar` y `receptor` en `movil` y `escritorio`: 337 verdes y 3 rojas en la primera pasada —la prueba nueva de tokens medía `--medida-prosa` (en `ch`) con otra letra en la sonda, corregida, y la caída por tiempo ya diferida de `[movil] … ningún enlace saliente apunta a una página que no existe`—; repetidas solas, 14/14 verdes.
- Construcciones del Corpus real con `FECHA_JORNADA=2026-10-27` y `MEDICION_ENDPOINT=http://localhost:8787/`: línea base (rama en `3f369c8a`), principal (`origin/main` = `881949f4d62a31a308685bc12d2e61d624a6b8fa`, mismo `package.json`/`package-lock.json`) y con la historia; las tres salen con 0 y sin aviso de peso.
- `diff -rq` línea base → historia: 4.420 `cita/`, `pagefind/`, una hoja `_astro/_slug_.*.css` sustituida, y 863 páginas de otras familias (192 `autor`, 547 `obra`, 107 `tema`, 17 `coleccion`) cuyo **`<body>` es idéntico byte a byte** y cuyo `<head>` solo difiere en la hoja en línea (`<style>`) y la referencia a la hoja: lo que admite el Block If. Sitemaps idénticos, ningún PNG cambia.
- Páginas de Cita (4.420): con los dos bloques 3.423; solo «De la misma obra» 635; solo «Más de» 324; ninguno de los dos (solo Temas) 38; sin `nav` 0. Máximo 7 tarjetas, en 3.057 páginas. Ninguna Cita sin Obra lleva «De la misma obra»; ningún «→»; todo `nav.salidas` con `data-pagefind-ignore="all"`.

**Peso de `dist/`** (línea de `integraciones/peso.ts`):
- Principal: 467.323.266 bytes (445,7 MiB) en 15.340 ficheros; juzgado 467.224.460 bytes; PNG 5.116.
- Rama antes: 475.975.001 bytes (453,9 MiB) en 15.341 ficheros; juzgado 475.876.195 bytes; PNG 5.116.
- Rama con la 24.6: 490.817.690 bytes (468,1 MiB) en 15.341 ficheros; juzgado 490.718.884 bytes (468 MiB), quedan 295.713.116 bytes (282 MiB) hasta el aviso de 750 MiB; tarjetas sociales 312.472.917 bytes (298 MiB); PNG 5.116.

**Proyección** (para que Héctor revise los valores de la 24.2): Δ = 14.842.689 bytes / 4.420 Páginas de Cita ≈ 3.358 bytes (≈ 3,4 KB) por Página de Cita. Con 1 KB = 1.000 bytes, KB por Cita nueva ≈ 95 + 3,4 = 98,4 KB, y las Citas hasta el aviso, el tope y 1 GB decimal son ≈ **7.426 / 9.026 / 9.598** (frente a ~7.790 / ~9.440 / ~10.030 de la 24.2); con 1 KB = 1.024 bytes (≈ 100,6 KB por Cita), ≈ 7.358 / 8.921 / 9.481. Cotas: un Autor o una Obra nuevos suman además su página y su Tarjeta.

**NFR-7** (sin puerta; Lighthouse 13.5.0, preajuste móvil, cinco pasadas, receptor ficticio en 8787 y `tests/servidor.mjs` en 4400; misma Cita de siete tarjetas, `/cita/alfonso-x-el-sabio-ca-bien-asi-como-la-manziella-tuelle/`, que en la principal tiene cuatro hermanas). Medianas:
- Principal: LCP 1.953 ms, FCP 1.353 ms, TBT 0 ms, CLS 0, 188.682 bytes, rendimiento 0,99.
- Rama con la 24.6: LCP 2.252 ms, FCP 1.652 ms, TBT 0 ms, CLS 0, 246.104 bytes, rendimiento 0,98. (La diferencia de bytes suma lo de las 24.1–24.5 de la rama, no solo el pie.)

**Alto a 360 × 640** (`document.documentElement.scrollHeight`, misma página): principal 1.805 px (pie de 579 px); rama 3.078 px (pie de 1.583 px), frente a la estimación ~1.500 → ~2.780.

**Riesgos residuales.** La página se alarga ~1.270 px a 360 en la cara de siete tarjetas (la deuda declarada). La prueba `[movil] … ningún enlace saliente apunta a una página que no existe` sigue cayendo por tiempo cuando corre con el resto del fichero (diferida antes de esta historia); sola, pasa.

### Revisión independiente (pasada 1, 2026-10-27)

**Resumen.** Cinco capas externas (blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor). Ningún intent_gap ni bad_spec: 17 parches (2 medium, 15 low), nada diferido, 12 rechazados; el detalle, en el Review Triage Log. El comportamiento publicado no cambia: el único cambio de `src/` que toca la construcción es una guarda más de `RutasDeSalida.astro` («De la misma obra» con una Cita de otra Obra), que la página real nunca dispara; lo demás son comentarios (el del `<style>` no llega a `dist/`).

**Ficheros.**
- `src/components/RutasDeSalida.astro` — guarda de «De la misma obra» y comentarios (qué guarda cada uno; la apertura de UX-DR67 y el corte de 600 px de `tokens.css`).
- `src/components/Chips.astro` — docblock al día (resuelve el diferido de la primera pasada).
- `src/lib/umbrales.ts` — docblocks: enteros de 2 o más; el tope del pie como suma de las dos constantes.
- `AGENTS.md` — el tope como suma de las dos constantes y las tres guardas del componente.
- `tests/unit/rutas-de-salida.test.ts` — tres sondas que rompen la construcción; (b) falla si no lee «Siguiente» en una Obra de dos o más; (d) ata el cierre a la Página de Autor de `dist/`; (g) antepasado estricto para las tarjetas del pie.
- `tests/unit/tarjeta-de-obra.test.ts` — quita solo el `nav.salidas`.
- `tests/e2e/busqueda.spec.ts` — tarjeta que se distingue de la Cita que se lee; ninguna página que la ofrece al pie sale por él.
- `tests/e2e/rutas-de-salida.spec.ts` — orden de grupos sin pasar en vacío.
- `tests/e2e/receptor.spec.ts` — `HERMANAS` → `MAS_DEL_AUTOR`.
- `tests/e2e/accesibilidad.spec.ts` — holgura de `--unidad` + 1 px solo en listas con Tarjetas de Cita.
- `tests/e2e/pagina-de-cita.spec.ts` — hueco de «Temas» a sus chips, 2 × `--unidad`.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — la nota de la 24.6 lleva las cifras para Héctor (proyección, NFR-7, alto a 360) y apunta a este Auto Run Result.

**Alto a 360, conciliado.** UX-DR67 dice que todo lo que crece cae después de las acciones. Entre la principal y la rama la página crece 1.273 px (1.805 → 3.078), de los que el pie pone 1.004 (579 → 1.583); los ~269 px restantes están por encima de las acciones y son de la Tarjeta de Obra y «Siguiente» (24.4 y 24.5), que la rama ya trae y la principal no. Lo que añade la 24.6 cae entero tras las acciones.

**Verificación.**
- `npm run check`: 0 errores.
- `npx vitest run tests/unit/rutas-de-salida.test.ts tests/unit/tarjeta-de-obra.test.ts`: 65 verdes. Con la guarda nueva anulada a mano, su sonda se pone en rojo (comprobado y restituido).
- `npm test`: 137 ficheros, 6.247 pruebas, `FINISHED EXIT=0`.
- Playwright `accesibilidad`, `pagina-de-cita`, `rutas-de-salida`, `busqueda`, `copiar` y `receptor`, los dos proyectos: 339 verdes, 68 saltadas y 1 roja, la caída por tiempo ya diferida de `[movil] rutas-de-salida.spec.ts:162` («ningún enlace saliente apunta a una página que no existe», 30 s); `rutas-de-salida.spec.ts` solo, 14/14 verdes. Puertos libres al terminar.
- No se repitieron Lighthouse, el alto ni el peso: ningún parche cambia lo que se publica.

**Seguimiento.** Parches de esta pasada: 0 high, 2 medium, 15 low; puntuación 3 × 2 + 15 = 21 ≥ 5, así que `followup_review_recommended: true`.

**Riesgos residuales.** La prueba de búsqueda da por buena una página que ofrece la tarjeta si su propia Cita trae todas las palabras de la consulta (también como parte de otra palabra); una coincidencia del buscador por raíz que no cumpla eso la haría fallar en falso. La caída por tiempo de `[movil] rutas-de-salida.spec.ts:162` sigue.
