---
title: 'Historia 31.1 — El pasaje se localiza con el localizador del orden del libro, y tiene su tope'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: '88629adbca6ff7174e6cc40232d0ace80e19ab8a'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-31-context.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** La Página de Cita no puede enseñar el párrafo del que sale una Cita sin un segundo localizador o una segunda definición de «párrafo», que la situarían en un trozo distinto del que la coteja y la ordena (AD-30). El cargador de `posiciones` entrega hoy solo `{documento, posicion}`.

**Approach:** El cargador entrega por aparición, además, `pasaje: {texto, inicio, fin}` (omitido si no hay), calculado por una sola función de `tools/lib/pasaje.ts` con el mismo `localizar`, `tramoEnCrudo` y `formaDeLasLineas` de la 29.1 y una sola decisión con nombre (`ofrecePasaje`) contra `MAX_CARACTERES_DEL_PASAJE`, que nace en `undefined`. `src/lib/obras.ts` elige la aparición que cuenta con la misma función para el orden y para el pasaje, y `src/lib/publicado.ts` cuelga de cada Cita su pasaje. Ninguna página lo pinta todavía (31.2): `dist/` no cambia.

## Boundaries & Constraints

**Always:**
- Un solo localizador (`localizar` sobre `colapsarEspacios` del crudo, el mismo conjunto `documentosDeCita`), un solo paso colapsado→crudo (`tramoEnCrudo`), una sola forma (`formaDeLasLineas`, con la `lineas:` de la cabecera mandando): se importan, no se reescriben (AD-23, AD-29).
- El trozo: en `verso` y `prosa-ajustada`, el bloque entre líneas en blanco (línea en blanco = solo espacio); en `prosa-por-lineas`, la línea; en `verso-espaciado` e `indeterminada`, ninguno. Una Cita que cruza bloques toma desde el inicio del primero que la contiene hasta el fin del último, enteros y seguidos (con lo que haya entre ellos tal cual). `texto` es `crudo.slice(a, b)` con `a`/`b` en el primer y último carácter no blanco de esos bloques: literal, sin recortar dentro, sin corregir ni completar. `inicio`/`fin` son UTF-16 sobre `texto`.
- `ofrecePasaje` decide, en este orden: tope `undefined` → no; `equivalentes(trozo, textoDeCita)` (forma canónica de `normalizar`, AD-3) → no («no dice más»); `[...texto].length > tope` → no (puntos de código, como `MAX_CARACTERES_IMAGEN`). Borde: igual al tope sí se ofrece. Recibe un objeto (`{ trozo, textoDeCita, tope }`) para que la 35.4 lo amplíe.
- El campo `pasaje` se omite de la aparición sin pasaje: nunca `null`, ni objeto vacío.
- `MAX_CARACTERES_DEL_PASAJE: number | undefined = undefined` en `src/lib/umbrales.ts`, con comentario (regla, que el valor es de Héctor en un diff visible, propuesta 1.200). Ninguna prueba fija su valor: pasan el tope por parámetro o lo parchean en una copia (`construirConCorpus({ ficheros })`).
- La aparición que cuenta la da `aparicionQueCuenta` (exportada de `src/lib/obras.ts`, sustituye a `primeraAparicion`): la usan `ordenDelLibro` y el pasaje. Si esa aparición no trae pasaje, la Cita no tiene pasaje (no se busca en otra). Una Cita sin Obra usa la misma función sobre sus apariciones.
- Sin red, sin escribir en `corpus/` (AD-22). Las mediciones sobre el Corpus real se hacen en el árbol (tope `undefined`) y en una copia temporal en el scratchpad (tope 1.200), nunca con el tope cambiado en el árbol.

**Block If:**
- `dist/` del árbol después difiere del de antes (misma jornada, `FECHA_JORNADA` fija) en algún `.html` o en algo fuera de `pagefind/`: HALT, decide Héctor.
- Hacer pasar algo exigiría dar valor a `MAX_CARACTERES_DEL_PASAJE` en el árbol o escribir en `corpus/`.

**Never:**
- Pintar el pasaje, tocar páginas o componentes, `atribucion.ts`, `tools/lib/cambios.ts`, Pagefind o JSON-LD (31.2). `DESPLIEGUE_DEL_PASAJE` y el corte de serie son de la 31.2: no se declaran aquí.
- Recortar, resumir o buscar el pasaje en otra aparición; otro `indexOf` del texto de la Cita fuera de `localizar`; escribir los literales de las formas fuera de `tools/lib/lineas.ts` (lo prohíbe `tests/unit/lineas.test.ts`: en `pasaje.ts` se toman de `FORMAS_DE_LINEAS`).
- Editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Verso, Cita dentro de una estrofa | doc `verso`, Cita = 2 de 4 versos | `texto` = la estrofa con sus `\n`; `inicio`/`fin` sobre ella | — |
| Cita que cruza dos estrofas | Cita del último verso de una y el primero de otra | `texto` = las dos estrofas y la línea en blanco entre ellas | — |
| `prosa-ajustada`, Cita que cruza dos bloques | dos párrafos ajustados | los dos bloques, saltos interiores tal cual | — |
| `prosa-por-lineas` | una línea por párrafo | la línea | — |
| `verso-espaciado` / `indeterminada` | — | sin `pasaje` | — |
| No dice más | el bloque es la Cita + «.» | sin `pasaje` | — |
| Tope en el borde / uno por encima | `[...texto].length` = tope / tope+1 | con / sin `pasaje` | — |
| Tope `undefined` | cualquier doc | ninguna aparición con `pasaje` | — |
| Dos Citas del mismo párrafo | — | mismo `texto`, distinto `inicio`/`fin` | — |
| Cita sin documento o sin localizar | censo, o texto que no aparece | apariciones vacías (como hoy) | — |
| Invariante | toda aparición con pasaje | `colapsarEspacios(texto.slice(inicio, fin)) === colapsarEspacios(cita.texto)`, también con `\n` de verso (29.1) | — |

</intent-contract>

## Code Map

- `tools/lib/posiciones.ts` -- `posicionesDeCitas(citas, documentos)` y `leerPosicionesDelCorpus(raiz)`: hoy agrupa por `documentoDeCita`, colapsa cada cuerpo y localiza Cita a Cita (bucle Cita→documento). Cambia a documento→Cita dentro del grupo (mismas apariciones y en el mismo orden) para que la memoria de un solo crudo de `mapaDelCrudo` (`cotejo.ts:146`) acierte; conserva el crudo junto al colapsado. Lee con `leerDocumentosParaElCotejo` (`tools/lib/corpus.ts:1075`, da `lineasDeclaradas`) en vez de `leerDocumentosDeFuente`. Su comentario de cabecera y el de `content.config.ts` dicen hoy «sin el texto» (AD-2): se ponen al día con AD-30.
- `tools/lib/cotejo.ts` -- `colapsarEspacios` (:59), `tramoEnCrudo` (:75, exige `fin > inicio`), `localizar` (:189), `documentosDeCita` (:353). Solo lectura.
- `tools/lib/lineas.ts` -- `FORMAS_DE_LINEAS` (:24), `formaDeLasLineas({cuerpo, lineas?})` (:102). Solo lectura.
- `src/lib/normalizar.ts` -- `equivalentes(a, b)` (:57): la comparación canónica de «no dice más».
- `src/lib/obras.ts` -- `AparicionDeCita` (:950) gana `pasaje?: PasajeDeAparicion` (tipo nuevo `{texto, inicio, fin}` aquí, porque `src/` no importa de `tools/`); `primeraAparicion` (:1087) pasa a `export function aparicionQueCuenta`, usada por `ordenDelLibro` (:1126).
- `src/lib/publicado.ts` -- `citasPorObra` (:860) y la fachada `citasDeLasObras` (:1516, lee `getCollection('posiciones')` e `indices`, memoria por conjunto y fallo no memorizado). Se añade la pura `pasajesDeCitas(citas, posiciones, indices): Map<slug, PasajeDeAparicion>` (todas las Citas, con Obra o sin ella, vía `aparicionQueCuenta`) y su fachada memorizada `pasajesDeLasCitas(conjunto)`, con la misma lectura de colecciones (factorizada en un ayudante privado común). Ninguna página la llama en esta historia.
- `src/content.config.ts` -- esquema de `posiciones` (:334): cada aparición admite `pasaje` opcional `{texto: string min 1, inicio int ≥ 0, fin int}` con `inicio < fin ≤ texto.length` (refine). El cargador (:305) pasa el tope a `leerPosicionesDelCorpus`.
- `src/lib/umbrales.ts` -- se declara `MAX_CARACTERES_DEL_PASAJE` junto a `MAX_CARACTERES_IMAGEN` (:26). Lo importa el guion del filtro de los Directorios: una constante literal no lo engorda.
- `tests/unit/orden-del-libro.test.ts` -- `posicionesDeCitas` (:319), `leerPosicionesDelCorpus` (:417), permutación (:294), dependencias (:955: la lista de lectores de `corpus.ts` y la prohibición de `indexOf`/`includes(`/… en `posiciones.ts`).
- `tests/unit/lineas.test.ts` -- dueños del salto (:275): importadores de `lineas.ts` (:311, «la 31.1 la amplía») y de `tramoEnCrudo` (:332), y literales de formas (:306).
- `tests/unit/ayuda/construir.ts` -- `construirConCorpus(corpus, { ficheros, paginas, jornada })`, `enlazarDependencias` (copia con `node_modules` enlazado y caché `.astro` propia; sin git, el historial no falla).

## Tasks & Acceptance

**Execution:**
- `src/lib/umbrales.ts` -- declarar `MAX_CARACTERES_DEL_PASAJE: number | undefined = undefined` con su comentario -- la puerta nace cerrada (AD-9).
- `src/lib/obras.ts` -- `PasajeDeAparicion`, `pasaje?` en `AparicionDeCita`, `aparicionQueCuenta` exportada y usada por `ordenDelLibro` -- una sola elección para orden y pasaje.
- `tools/lib/pasaje.ts` (nuevo) -- `pasajeDeAparicion({ crudo, forma, posicion, buscado, textoDeCita, tope })` → `{ pasaje } | { motivo }` (motivos: `forma-sin-parrafo`, `no-dice-mas`, `sin-tope`, `pasa-del-tope`), que llama a `tramoEnCrudo(crudo, posicion, posicion + buscado.length)`, delimita los bloques según la forma y delega la decisión en `ofrecePasaje` (exportada) -- dueño único del trozo (AD-30).
- `tools/lib/posiciones.ts` -- leer con `leerDocumentosParaElCotejo`; `posicionesDeCitas(citas, documentos, opciones?: { tope?, lineasDeclaradas? })` añade `pasaje` cuando `pasajeDeAparicion` lo da; `leerPosicionesDelCorpus(raiz, opciones?: { tope? })` con tope por omisión `MAX_CARACTERES_DEL_PASAJE`; bucle documento→Cita; comentarios al día.
- `src/content.config.ts` -- esquema con `pasaje` opcional y comentario del cargador al día.
- `src/lib/publicado.ts` -- `pasajesDeCitas` y `pasajesDeLasCitas`.
- `tests/unit/pasaje.test.ts` (nuevo, puro) -- la matriz entera con documentos de prueba compuestos con `componerDocumento` o cuerpos con `lineas:` declarada; invariante del tramo con `\n` de verso; tope en el borde y +1; `undefined`; dos Citas del mismo párrafo; y que `pasajeDeAparicion`/`ofrecePasaje` se definen solo en `tools/lib/pasaje.ts`.
- `tests/unit/orden-del-libro.test.ts` -- `posicionesDeCitas` con tope por parámetro entrega/omite `pasaje` (clave ausente); `leerPosicionesDelCorpus` de disco con tope; permutación de Citas, mapa y apariciones: `pasajesDeCitas` da el pasaje de la misma aparición que ordena `ordenDelLibro` (con apariciones de pasajes distintos); Cita sin Obra; lista de lectores y de importaciones al día.
- `tests/unit/lineas.test.ts` -- añadir `tools/lib/pasaje.ts` a los importadores de `lineas.ts` y de `tramoEnCrudo`.
- `tests/unit/pasaje-build.test.ts` (nuevo) -- dos construcciones con `construirConCorpus`: con `umbrales.ts` parcheado (tope pequeño, p. ej. 200) y una página sonda que vuelca `getCollection('posiciones')`, la aparición con pasaje lo trae y la que no, sin clave; sin parche, ninguna aparición trae `pasaje`.
- Mediciones (scratchpad, sin commitear el guion) -- anotar en este spec la sección «Cifras sobre el Corpus real» (ver Verification).

**Acceptance Criteria:**
- Given el cargador de `posiciones` en una construcción, when carga con un tope con valor, then cada aparición con pasaje lo trae como `{texto, inicio, fin}` validado por el esquema, la que no lo omite, y con el tope del árbol (`undefined`) ninguna lo trae (`pasaje-build.test.ts`).
- Given el pasaje de una Cita, when se elige, then sale de `aparicionQueCuenta`, la misma aparición que ordena `ordenDelLibro`, para cualquier permutación de la entrada; y si esa aparición no tiene pasaje, la Cita tampoco.
- Given el Corpus real, when se corren las mediciones, then el spec anota cuántas Citas tendrían pasaje con 800, 1.200 y 2.000 y cuántas se quedan sin él por motivo (sin documento, sin localizar, forma sin párrafo, no dice más, pasa del tope), los tiempos de `npm run build` y el peso del almacén de datos antes y después, y que `dist/` no cambia.
- Given `git diff --stat corpus/`, when se cierra, then sale vacío.

## Spec Change Log

## Review Triage Log

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Sin hallazgos externos en esta pasada: el orquestador no pasó secciones «## Hallazgos externos — …».

## Design Notes

Delimitar bloques sin un segundo localizador: con el tramo crudo `[a, b)` de `tramoEnCrudo`, el inicio del bloque es lo que sigue a la última línea en blanco antes de `a` (o al último `\n` en `prosa-por-lineas`), y el fin, lo anterior a la primera línea en blanco desde `b` (o el primer `\n`); se recorta solo el blanco de los extremos. Buscar `\n` en el crudo es interpretar el salto, que es justo lo que AD-29 asigna a este módulo; buscar el texto de la Cita, no.

`no-dice-mas` va antes que `pasa-del-tope` en `ofrecePasaje` para que los recuentos por motivo de la medición no dependan del tope; con el tope en `undefined` el trozo se calcula igual y se descarta (no hay atajo fuera de `ofrecePasaje`, que es el único punto de decisión).

## Verification

**Commands:**
- `npx vitest run tests/unit/pasaje.test.ts`, `tests/unit/orden-del-libro.test.ts`, `tests/unit/lineas.test.ts`, `tests/unit/pasaje-build.test.ts` -- en verde.
- `npx astro check` -- 0 errores.
- `npm test` entero por `correr.sh` -- en verde.
- Recuentos: guion en el scratchpad que lee el Corpus real con los lectores de `tools/lib/corpus.ts`, llama a `posicionesDeCitas` con tope 800, 1.200 y 2.000, elige con `aparicionQueCuenta` y clasifica cada Cita publicada (sin documento: `documentosDeCita` vacío; sin localizar: documentos y ninguna aparición; los demás, el `motivo` de `pasajeDeAparicion` sobre la aparición que cuenta) -- tabla en el spec.
- Construcciones con `FECHA_JORNADA=2026-11-07` por `correr.sh`, alternas (antes = código de `baseline_revision` puesto con `git checkout` y restaurado; después = la historia), al menos dos de cada lado -- tiempos en el spec; `diff -rq` de `dist/` antes/después sin diferencias en `.html` ni fuera de `pagefind/`.
- Copia temporal en el scratchpad (package.json, astro.config.mjs, tsconfig.json, src, public, integraciones, tools y `corpus/` sin `_revision/`; `node_modules` enlazado como `enlazarDependencias`), construida con el tope del árbol y con `MAX_CARACTERES_DEL_PASAJE = 1200` parcheado -- tiempos, peso del almacén de datos de Astro de cada una (`data-store.json` en la caché `.astro` propia de la copia; en el árbol, el de `node_modules/.astro/`) y `diff -rq` de sus dos `dist/` sin diferencias; se borra al terminar.
- `git diff --stat 88629adbca6ff7174e6cc40232d0ace80e19ab8a -- corpus/` -- vacío.

## Cifras sobre el Corpus real

Medido el 2026-11-07 sobre el Corpus de la rama (4.424 Citas publicadas, 1.422 documentos de `corpus/fuentes/`), con un guion fuera del repositorio que lee con `leerCitas` y `leerDocumentosParaElCotejo`, sitúa con `posicionesDeCitas`, elige con `aparicionQueCuenta` (con los índices de `leerOrdenDeLosIndices`) y clasifica con el `motivo` de `pasajeDeAparicion` sobre la aparición que cuenta. En cada tope, el pasaje de `posicionesDeCitas` y el del guion coinciden Cita a Cita.

| Tope | Con pasaje | Sin documento | Sin localizar | Forma sin párrafo | No dice más | Pasa del tope |
|------|-----------:|--------------:|--------------:|------------------:|------------:|--------------:|
| 800 | 1.472 | 21 | 0 | 1.288 | 252 | 1.391 |
| 1.200 | 2.104 | 21 | 0 | 1.288 | 252 | 759 |
| 2.000 | 2.584 | 21 | 0 | 1.288 | 252 | 279 |

Largo de los pasajes ofrecidos con el tope en 2.000: mediana 723, p90 1.471 y máximo 1.994 puntos de código.

**`npm run build` en el árbol** (`FECHA_JORNADA=2026-11-07`, alternas, antes = el código de `baseline_revision` en `src/content.config.ts`, `src/lib/{obras,publicado,umbrales}.ts` y `tools/lib/posiciones.ts`; dos tandas, con otras construcciones de la v9 corriendo a la vez en la máquina, así que el ruido es de decenas de segundos):

| | Corrida 1 | Corrida 2 | Corrida 3 | Corrida 4 | Media |
|-|----------:|----------:|----------:|----------:|------:|
| Antes | 159 s | 147 s | 186 s | 221 s | 178 s |
| Después | 170 s | 174 s | 165 s | 209 s | 180 s |

Sin red y sin almacén, `posicionesDeCitas` pasa de ~1 s a ~5–8 s sobre el Corpus entero: el tramo crudo exige la correspondencia colapsado→crudo de `mapaDelCrudo` (29.1) de cada documento con alguna Cita localizada en forma con párrafo, y se calcula también con el tope en `undefined`, porque `ofrecePasaje` es el único punto de decisión. En la construcción entera queda dentro del ruido.

**Almacén de datos de Astro** (`data-store.json`): árbol antes y después, 5.133.649 bytes en las cuatro construcciones (solo cambia el `content-config-digest`, por el esquema nuevo); en la copia temporal, 5.133.649 bytes con el tope del árbol y 6.318.079 con `MAX_CARACTERES_DEL_PASAJE = 1200` (+1.184.430 bytes, +23 %, con 2.104 apariciones con `pasaje`). Construcción de la copia: 155 s con el tope del árbol y 171 s con 1.200.

**`dist/` no cambia.** Por manifiesto SHA-256 de los 15.370 ficheros: antes frente a después, en las dos tandas, difieren 11 ficheros, todos bajo `pagefind/`, ningún `.html`; entre dos construcciones de antes difieren los mismos 11 (el índice de Pagefind no es determinista byte a byte). En la copia, el `dist/` con el tope del árbol y con 1.200 difieren igual: 11 ficheros de `pagefind/`, ningún `.html` —ninguna página pinta el pasaje todavía—. `git diff --stat 88629adbca6ff7174e6cc40232d0ace80e19ab8a -- corpus/` sale vacío.

## Auto Run Result

Status: done
Blocking condition: none

**Resumen.** El cargador de `posiciones` entrega por aparición, además de `{documento, posicion}`, un `pasaje: {texto, inicio, fin}` opcional que calcula solo `tools/lib/pasaje.ts` (`pasajeDeAparicion`, con la decisión única `ofrecePasaje`) desde la misma posición de `localizar`, con `tramoEnCrudo` y `formaDeLasLineas` de la 29.1 (AD-29, AD-30). `src/lib/obras.ts` exporta `aparicionQueCuenta` (antes `primeraAparicion`), que eligen el orden del libro y el pasaje; `src/lib/publicado.ts` añade `pasajesDeCitas` y su fachada memorizada `pasajesDeLasCitas`. `MAX_CARACTERES_DEL_PASAJE` nace en `undefined`: ningún pasaje se ofrece en el árbol, ninguna página lo pinta y `dist/` no cambia.

**Ficheros.**
- `tools/lib/pasaje.ts` (nuevo) — el trozo por forma y `ofrecePasaje`.
- `tools/lib/posiciones.ts` — lee con `leerDocumentosParaElCotejo`, recorre documento→Cita y cuelga el pasaje; tope por opciones.
- `src/content.config.ts` — esquema de `pasaje` opcional con su refinamiento; el cargador pasa el tope.
- `src/lib/umbrales.ts` — `MAX_CARACTERES_DEL_PASAJE = undefined`, con su comentario.
- `src/lib/obras.ts` — `PasajeDeAparicion`, `pasaje?` y `aparicionQueCuenta`.
- `src/lib/publicado.ts` — `pasajesDeCitas`, `pasajesDeLasCitas` y la lectura común de colecciones.
- `tests/unit/pasaje.test.ts`, `tests/unit/pasaje-build.test.ts` (nuevos); `tests/unit/orden-del-libro.test.ts` y `tests/unit/lineas.test.ts` al día.

**Revisión.** Sin hallazgos externos: 0 parches, 0 diferidos, 0 rechazados. `followup_review_recommended: false` (parches: 0 high, 0 medium, 0 low; puntuación 0).

**Verificación.** `npm test` entero por `correr.sh` (`logs/s-31/impl-31.1-npm-test.log`): 159 ficheros, 7.314 pruebas en verde, EXIT 0, con el código ya en su estado final. `npx astro check`: 0 errores. `npx vitest run tests/unit/pasaje.test.ts tests/unit/lineas.test.ts` en verde de nuevo al reanudar. Construcciones alternas, copia temporal con tope 1.200 y manifiestos de `dist/`: en «Cifras sobre el Corpus real»; solo difieren 11 ficheros de `pagefind/`, igual que entre dos construcciones del mismo código. `git diff --stat 88629adbca6ff7174e6cc40232d0ace80e19ab8a -- corpus/` vacío.

**Riesgos residuales.** Con tope, el almacén de datos crece ~23 % (1.200: +1,18 MB); el valor del tope y `DESPLIEGUE_DEL_PASAJE` son de Héctor y de la 31.2. `posicionesDeCitas` tarda ~5–8 s más sobre el Corpus entero porque el tramo crudo se calcula también con el tope en `undefined` (dentro del ruido de la construcción).
