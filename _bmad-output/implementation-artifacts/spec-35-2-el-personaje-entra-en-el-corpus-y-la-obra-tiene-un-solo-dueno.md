---
title: 'Historia 35.2 — El Personaje entra en el Corpus, y la Obra tiene un solo dueño'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_revision: '4bdf6dff7db0151bae8d17bcb212280f599c154c'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-35-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-35-1-la-clase-se-fija-al-dar-de-alta-y-queda-registrada.md'
warnings: [oversized]
deferred:
  - summary: 'El build sigue exigiendo Autor a toda Cita de corpus/citas/ (regla propia del build, mensaje que nombra la 35.4) y rompe ante una Obra de Personaje con Citas publicadas: la Cita de un Personaje sin Autor y la Cabecera de la Obra de un Personaje las pinta la 35.4. La 35.3 (fixture «un Personaje dueño de una Obra») tendrá que levantar la segunda guarda o esperar a la 35.4: pendiente de quien planifique la 35.3.'
    evidence: 'epics.md Story 35.4 («Página de Obra de un Personaje… Cabecera dice «de {Personaje}»», «Cita de Personaje solo»); Story 35.3, último Given de pruebas.'
    severity: medium
  - summary: 'La demanda pasa a `dueñoPorPrefijo` con los Autores activos (como hoy) más los Personajes; no suma los Autores retirados para no reatribuir en silencio filas que la serie ya guarda como `sinAutor`. Si deben sumarse lo decide Héctor.'
    evidence: 'tools/demanda.ts:102 (`opciones.conjunto.autores`); AGENTS.md «Leer la demanda por página».'
    severity: low
  - summary: >-
      `tools/personaje.ts biografia` toma además `--semblanza "<texto>"`: sin ella la orden no
      podría escribir nunca la biografía de un Personaje, porque el esquema exige semblanza y
      biografía juntas y ninguna otra orden escribe la semblanza de AD-26. Si la forma de la
      orden debe ser otra, lo decide Héctor.
    evidence: |-
      Code Map del spec («biografia <slug> <documento>») frente a la regla de Boundaries
      («`semblanza` + `biografia`, juntas»); sin la bandera, las dos se excluyen.
    location: >-
      tools/personaje.ts
    severity: low
  - summary: >-
      «Dos fichas de Personaje con la misma forma» se aplica al pie de la letra: rompe aunque
      sus Personajes no se toquen (dos Obras homónimas de Personajes distintos). Relajarlo a las
      que comparten algún Personaje lo decide Héctor.
    evidence: |-
      Boundaries del spec; src/lib/obras.ts `fallosDeObras`, bloque «fichas de Personaje».
    location: >-
      src/lib/obras.ts
    severity: low
  - summary: >-
      Con `corpus/personajes/` vacío, cada construcción imprime el aviso del cargador de globs
      («No files found matching … corpus/personajes»), como hacían las Colecciones; desaparece con
      el primer Personaje.
    evidence: |-
      src/content.config.ts, colección `personajes`; ningún byte de `dist/` cambia por ello.
    severity: low
---

<intent-contract>

## Intent

**Problem:** Un Personaje (Batman) solo puede modelarse hoy como Autor —con año de fallecimiento y tradición—, la Ficha de Obra solo conoce un `autor`, y la lectura por prefijo (`autorPorPrefijo`) atribuiría a un Autor el slug de un Personaje que empiece igual.

**Approach:** Entidad `corpus/personajes/{slug}.yml` con su esquema, su colección, su orden `tools/personaje.ts` y sus puertas de build; un solo espacio de slugs; `dueñoPorPrefijo` sobre la unión; el prefijo de la Cita y de la ficha es el de su dueño; la Ficha de Obra declara un dueño (Autor o Personaje) que no cambia; la relación de AD-27 conoce la familia. Todo con la puerta cerrada y sin pintar aún nada de Personajes: con el Corpus real `dist/` no cambia.

## Boundaries & Constraints

**Always:**
- Identidad de Obra = (dueño, forma). Dueño de ficha = `personaje` si lo declara, si no `autor`; dueño de Cita = `autor` si lo declara, si no `personaje`. Una sola función de cada uno (`dueñoDeFicha`, `dueñoDeCita`) en `src/lib/obras.ts`.
- Ficha de Personaje: `personaje` (slug) + `personajes` (lista no vacía, sin repetidos, que **incluye** al dueño) + `autor` opcional informativo. Ficha de Autor: `autor` obligatorio y sin `personaje`/`personajes`. El nombre lleva el prefijo del dueño; `rutaDeObra` no cambia.
- Resolver (build y `tools/lib/obras.ts`): primero las fichas que nombran al Autor de la Cita (dueño o `autor` informativo) y reclaman su forma; si ninguna, las de Personaje cuyo `personajes` incluye el de la Cita. Dos candidatas en el mismo paso → el build rompe nombrando la Cita y las dos fichas; dos fichas de Personaje con la misma forma → rompe nombrándolas.
- `esObraIndexable` recibe el recuento del dueño: Citas del Autor, o del Personaje (las que declaran `personaje` igual).
- Personaje: `nombre`, `universo` obligatorios; `ordenAlfabetico`/`ordenRevisado` con los validadores del Autor; semblanza por AD-26 (`semblanza` + `biografia`, juntas, cotejada literal como la del Autor) **o** `semblanzaPropia: {texto, responde}`, nunca las dos; `añoNacimiento`, `añoFallecimiento` o `vivo` → mensaje propio (AD-33); objeto `.strict()`.
- Códigos de `tools/personaje.ts`: 2 forma de invocación, 1 lo que dice, sin escribir nada en ninguno. Ninguna orden escribe un campo tecleado como tal; `clave` es la única que escribe `ordenRevisado`.
- Claves nuevas de esquema (Personaje entero; `personaje`/`personajes` de la ficha) clasificadas en `CAMPOS_QUE_PINTA` o `CAMPOS_QUE_NO_FECHAN` en el mismo commit.
- `corpus/personajes/.gitkeep` y nada más en esa carpeta.

**Block If:**
- Con el Corpus real, `dist/` difiere en cualquier fichero frente a la construcción de antes (misma `FECHA_JORNADA`).
- Hace falta tocar `src/lib/vocabulario.ts`, `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.

**Never:**
- Crear Personajes, claves, semblanzas ni Fichas de Personaje en el Corpus real (solo en fixtures); correr `tools/personaje.ts clave|semblanza` o `tools/autor.ts clave` sobre él.
- Pintar nada de Personajes en páginas (35.3/35.4), declarar la familia `personaje` en `superficies.ts` (35.3), ni abrir la puerta de la atribuida (35.1b).
- Dejar ningún `autorPorPrefijo` en el árbol.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Prefijos solapados | Autor `bruce`, Personaje `bruce-wayne`; slug `bruce-wayne-la-noche` | `dueñoPorPrefijo` → `{tipo:'personaje', slug:'bruce-wayne'}`; `bruce-la-noche` → Autor `bruce` | Empate de longitud imposible (build lo rompe); si llega, gana el Personaje |
| Alta de Personaje solo | lote con `personaje: batman`, sin `autor` | candidata en `_revision/batman--…md`, sin `autor`, `clase: atribuida`, motivo de la puerta cerrada | `personaje` que no existe → motivo, nada escrito |
| Slug compartido | `crear "Séneca"` con Autor `seneca` (activo o en `_autores-retirados/`) | `tools/personaje.ts` sale con 1, nada escrito | Build con los dos ficheros → rompe nombrando ambos |
| Cita→Personaje roto | Cita con `personaje: joker` sin `corpus/personajes/joker.yml` | Build rompe nombrando el fichero de la Cita y `joker` | — |
| Clave ausente | Personaje con Cita publicada sin `ordenAlfabetico` | Build rompe nombrando su fichero y `npx tsx tools/personaje.ts proponer-claves` | — |
| Ficha ambigua | Cita (autor A, personaje P) y dos fichas de A (dueño A, y dueño P con `autor: A`) con la forma | Build rompe nombrando la Cita y las dos fichas | — |
| Atribuida en Obra con documento | Obra de dominio público con una atribuida | Cargador de posiciones no la sitúa; `ordenDelLibro` la pone al final, por slug | — |

</intent-contract>

## Code Map

- `tools/lib/autoria.ts` -- `autorPorPrefijo` → `dueñoPorPrefijo(slugCita, {autores, personajes}) → {tipo, slug} | undefined`; misma regla estricta (`${slug}-`) y prefijo más largo de la unión.
- `tools/lib/gestion.ts:840-850` `esDelAutor` (miembros de Colección y fijaciones de portada) y `:933` `retirarAutor` (pasa `personajes` de `rutas.personajes`); `:102` `crearAutor` se niega si existe `corpus/personajes/{slug}.yml`; `:240,:344,:399` `proponerClaves`/`fijarClave`/`declararBiografia`: extraer el núcleo para reutilizarlo con Personajes (no copiar).
- `tools/lib/demanda.ts:220-280` -- `agregarDemanda` con `dueñoPorPrefijo`; agregado gana `personajes` (por Personaje, omitido si vacío al escribir la serie); invariante Σ citas+resto = Σ autores + Σ personajes; informe «Por Personaje». `tools/demanda.ts:102` pasa también los slugs de `corpus/personajes/`.
- `tests/unit/demanda.test.ts:167-178` -- reescribir sobre `dueñoPorPrefijo`; la prueba que exige la importación en `gestion.ts` pasa a `dueñoPorPrefijo`.
- `src/lib/admision.ts:168-233` `personaje`/`reglasDeClase` -- quitar la regla «Personaje sin Autor» de `reglasDeClase`; `citaAdmisible:487` → `autor` opcional con regla «Autor o Personaje, al menos uno». Nueva `reglaDeAutorPublicado` (solo la colección `citas`): sin `autor` → «una Cita publicada lleva Autor hasta la Historia 35.4…; se queda en corpus/_revision/». Nuevo `personajeAdmisible` (+ `semblanzaPropia`, `universo`). `esquemaDeObra:716` → `autor` opcional, `personaje`, `personajes`, `superRefine` del dueño.
- `src/content.config.ts:68-125,222` -- colección `personajes` (`corpus/personajes`, `personajeAdmisible`); en `citas`, `reglaDeAutorPublicado`; añadir a `collections`.
- `src/lib/slug.ts:96` `slugDeCita(prefijo, texto)` (renombrar el parámetro a dueño); `slugDePersonaje` = la regla de `slugDeAutor`.
- `tools/lib/corpus.ts:177,372,417,712,1065` -- `rutas.personajes`, `PersonajeEnCorpus`, `leerPersonajes`, `escribirPersonaje`; `CitaEnCorpus.autor?`; `nombreDeFicheroDeCita(dueño, slug)`.
- `tools/alta.ts:314-410` -- dueño = Autor o, sin él, Personaje (que debe existir); `slugDeCita(dueño…)`, `nombreDeFicheroDeCita(dueño…)`; «falta el Autor o el Personaje». `tools/lib/revision.ts:459,539` -- fichero por el dueño de la candidata.
- Errores de tipo al relajar `autor` (medidos con `tsc`: 36): `tools/lib/obras.ts` (9), `tests/unit/orden-del-libro.test.ts` (7), `tools/lib/documentacion.ts` (4), `integraciones/obras.ts` (4), `revision.ts`, `gestion.ts`, `extraer.ts`, `integraciones/historial.ts` (2 c/u), `alta.ts`, `obras.test.ts`, `integraciones/indexables.ts`, `integraciones/clases.ts` (1 c/u). Resolver con `dueñoDeCita`, nunca con `!`.
- `src/lib/obras.ts:95-125,204-330,356-460,751-900` -- `FichaDeObra` (`autor?`, `personaje?`, `personajes?`), `CitaConObra.personaje?`, `dueñoDeFicha`, `dueñoDeCita`, `clave(dueño…)`, `fichasDeCita` (regla de dos pasos) / `fichaDeCita`, `obrasDeCitas` por dueño de la Cita, `fallosDeObras` (prefijo «… su dueño», `autor`/`personaje`/`personajes` que existen, ambigüedad, misma forma entre fichas de Personaje, guarda «Obra de un Personaje con Citas publicadas: la pinta la 35.4»), `ObraResuelta.dueño` + `autor?`; `:183` `esObraIndexable` intacta.
- `src/lib/publicado.ts:68,176,1079-1096` -- `Cita.personaje?` (`aplanarCita` lo pasa); `personajesPublicados(personajes, citas)`; `obrasIndexables` cuenta por dueño.
- `tools/lib/obras.ts:81-240,346,491,534,690,761` -- `resolverFichaDeObra({autor?, personaje?, obra, citasPublicadas})` con la regla de dos pasos; crear fija el dueño de la Cita (`personaje`+`personajes:[p]` si no hay Autor); `datosDeFicha` conserva `personaje`/`personajes`; `reunirFichas` se niega entre dueños distintos.
- `tools/lib/posiciones.ts:34-110` -- `posicionesDeCitas` omite toda Cita con `esAtribuida` (`src/lib/clase.ts`).
- `tools/lib/claves.ts:30-106` -- `fallosDeClaves(…, ordenes = {proponer, fijar})`; constantes de Personaje (`npx tsx tools/personaje.ts proponer-claves`, `… clave <slug> "<clave>"`). `integraciones/claves.ts:36-60` -- también sobre `personajesPublicados`.
- `integraciones/personajes.ts` (nuevo) + `astro.config.mjs:9-16,115-140` -- calcar `integraciones/claves.ts`: slug de Personaje = de Autor activo o retirado (nombra los dos ficheros); `personaje` de Cita sin ficha. La biografía del Personaje entra en `integraciones/cotejo.ts:95-105` (`cotejarBiografias` con las fichas de los dos).
- `tools/personaje.ts` (nuevo) + `tools/lib/personajes.ts` (nuevo) + `package.json` si las demás órdenes tienen alias -- `crear "<nombre>" --universo "<u>"`, `clave`, `proponer-claves`, `listar`, `semblanza <slug> "<texto>" --responde "<quién>"`, `biografia <slug> <documento>`; calcar el análisis de argumentos de `tools/autor.ts` (`motivosDeArgumentosNoReconocidos`, `terminar`).
- `tools/lib/avisar.ts:38-47` -- `['corpus/personajes','personaje']` en `FAMILIAS_DE_FICHERO` (el tipo admite `'personaje'` aunque no sea aún familia de ruta). `tools/lib/cambios.ts:217-318` y la relación -- `CAMPOS_QUE_PINTA.personaje` = `nombre` en `cita`, `autor`, `tema`, `coleccion`, `obra`; `ordenAlfabetico` en `directorioDeAutores` y `directorioDeObras`; `CAMPOS_QUE_NO_FECHAN.personaje` = `universo`, `semblanza`, `semblanzaPropia`, `biografia`, `ordenRevisado` (comentario: hasta la Página de Personaje, 35.3); `obra.obra` y `directorioDeObras` + `personaje`, `personajes`. Componer: Página de Cita ← su Personaje; listados ← Personajes de sus Citas; Obra ← su dueño Personaje; Directorios ← todo Personaje publicado.
- `tests/unit/fecha-de-cambio.test.ts:~344` -- la clasificación incluye `personajeAdmisible.shape`.
- `tests/unit/ayuda/construir.ts:105-231` -- `CorpusDePrueba.personajes?` escrito en `corpus/personajes/`.

## Tasks & Acceptance

**Execution:**
- `tools/lib/autoria.ts`, `tools/lib/gestion.ts`, `tools/lib/demanda.ts`, `tools/demanda.ts` -- `dueñoPorPrefijo` y sus lectores -- AD-4 v9.1.
- `src/lib/admision.ts`, `src/content.config.ts`, `src/lib/slug.ts` -- esquemas de Personaje, Cita y ficha, colección `personajes`, regla del build -- AD-1, AD-33.
- `tools/lib/corpus.ts`, `tools/alta.ts`, `tools/lib/revision.ts` y los demás lectores del tipo -- `autor` opcional, prefijo del dueño -- FR-1.
- `src/lib/obras.ts`, `src/lib/publicado.ts`, `integraciones/obras.ts`, `integraciones/indexables.ts`, `tools/lib/obras.ts` -- dueño, resolución, indexabilidad, órdenes que conservan -- AD-25 v9.1, FR-52 v9.1.
- `tools/lib/posiciones.ts` -- sin posición para la atribuida.
- `tools/lib/claves.ts`, `integraciones/claves.ts`, `integraciones/personajes.ts`, `integraciones/cotejo.ts`, `astro.config.mjs` -- puertas del build.
- `tools/lib/personajes.ts`, `tools/personaje.ts` -- la orden.
- `tools/lib/avisar.ts`, `tools/lib/cambios.ts` -- familia y campos -- AD-27 v9.1.
- `corpus/personajes/.gitkeep` -- carpeta vacía versionada.
- Pruebas: `tests/unit/autoria.test.ts` (nuevo: solapados en los dos sentidos, `seneca-el-viejo`, estricto, sin `autorPorPrefijo` en `src/ tools/ integraciones/ tests/`); `demanda.test.ts` (Cita de Personaje a su Personaje); `personaje.test.ts` (nuevo: esquema —años, dos semblanzas, `.strict()`—, cada subcomando y sus códigos, sin escribir en los rechazos, colisión con Autor activo/retirado, `autor.ts crear` contra Personaje); `obras.test.ts` (dueño, dos pasos, ambigüedad, misma forma entre Personajes, prefijo del dueño, `reunir` entre dueños, conservación en `titular/separar/reunir/retirar`, indexable por dueño, `rutaDeLaObra` de una ficha de Personaje); `orden-del-libro.test.ts` (atribuida al final con documento); `alta.test.ts`/`revision.test.ts` (prefijo del Personaje sin Autor); una construcción `tests/unit/personajes-build.test.ts` con todos los fallos de build en una pasada y una feliz (Personaje sin Citas, Cita (Autor+Personaje) en ficha de Autor, ficha de Personaje sin Citas publicadas); `fecha-de-cambio.test.ts` sin exenciones nuevas.
- `AGENTS.md` -- «Retirar un Autor» y «Leer la demanda por página» con `dueñoPorPrefijo`; «Las fichas de Obra» con el dueño; sección «Los Personajes» (ficha, orden, un solo espacio de slugs, que `clave` y `semblanza` sobre el Corpus real son de Héctor y nunca de un agente, las dos guardas hasta la 35.4).

**Acceptance Criteria:**
- Given el Corpus real y `FECHA_JORNADA` fija, when se construye antes y después y se comparan los `dist/` con `diff -r`, then no difiere ningún fichero.
- Given `grep -rn autorPorPrefijo src tools integraciones tests`, when corre, then no sale nada.
- Given `npx tsx tools/personaje.ts crear "Batman" --universo "DC Comics" --corpus <copia>`, when corre, then escribe `personajes/batman.yml` con `nombre`, `universo` y `ordenAlfabetico: Batman` y sale con 0; con una bandera desconocida sale con 2 y con un slug de Autor sale con 1, sin escribir.
- Given una ficha de Personaje sin Citas publicadas y una Cita `batman--…` con `personaje: batman` y `autor` en ficha de su Autor (el Autor se supo después: el slug no cambia), when se construye la copia, then el build pasa y el aviso de ficha sin Citas sale como hoy.
- Given `npx astro check` y `npm test` en local, when corren, then pasan.

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

## Design Notes

**Por qué dos guardas temporales en el build.** La puerta de la atribuida está cerrada (35.1b): ninguna orden publica una Cita de Personaje, y las de Personaje solo existen en `_revision/` o en fixtures. Las páginas que nombran a un Personaje llegan en la 35.3/35.4; mientras, un fichero escrito a mano rompe el build con un mensaje que nombra la historia, en vez de pintar una página que no nombra a nadie (la misma técnica que la 35.1 usó con «Toda Cita lleva Autor hasta la 35.2»). Por eso la resolución, la ruta y la indexabilidad de la Obra de Personaje se prueban puras.

**Regla de dos pasos (ejemplo):**

```ts
fichasDeCita(c, fichas):
  paso1 = fichas.filter(f => c.autor && (f.autor === c.autor) && f.formas.includes(forma))
  if (paso1.length) return paso1          // dueño Autor o autor informativo
  return fichas.filter(f => f.personaje && c.personaje && f.personajes.includes(c.personaje) && f.formas.includes(forma))
```

## Verification

**Commands:**
- `npx vitest run tests/unit/autoria.test.ts tests/unit/personaje.test.ts tests/unit/demanda.test.ts tests/unit/obras.test.ts tests/unit/orden-del-libro.test.ts` -- expected: verde.
- `npx vitest run tests/unit/personajes-build.test.ts tests/unit/fecha-de-cambio.test.ts tests/unit/alta.test.ts tests/unit/revision.test.ts` -- expected: verde.
- `npx astro check` -- expected: 0 errores.
- `npm run build` dos veces (base en `git worktree add --detach` bajo `/Users/hec/brainlySabiduria/.claude/v9-ralph/tmp-wt/`, y la rama) con la misma `FECHA_JORNADA`, luego `diff -r` -- expected: sin diferencias.
- `npm test` con `correr.sh`/`esperar.pl` -- expected: `FINISHED EXIT=0`.

## Auto Run Result

Status: done
Blocking condition: ninguna

**Resumen.** El Personaje entra en el Corpus con la puerta cerrada y sin pintarse en ninguna página. `corpus/personajes/{slug}.yml` tiene esquema propio (`personajeAdmisible`: `nombre`, `universo`, clave de orden con los validadores del Autor, semblanza por AD-26 o `semblanzaPropia`, nunca las dos; años y `vivo` rechazados con el mensaje de AD-33; estricto), colección, orden (`tools/personaje.ts`: `crear`, `listar`, `proponer-claves`, `clave`, `semblanza`, `biografia`; 2 la forma, 1 lo que dice, sin escribir en ningún rechazo) y puertas de build (`integraciones/personajes.ts`: slug de Autor activo o retirado, Cita con Personaje inexistente; `integraciones/claves.ts`: clave del Personaje publicado; `integraciones/cotejo.ts`: su semblanza literal). Autores y Personajes comparten un solo espacio de slugs: `autorPorPrefijo` pasa a `dueñoPorPrefijo` (unión, tipo, prefijo más largo; a igual longitud gana el Personaje), que usan retirar un Autor y la demanda (que gana `personajes`, omitido vacío). La Cita y la ficha llevan el prefijo de su dueño (`dueñoDeCita`, `dueñoDeFicha` en `src/lib/obras.ts`); la ficha declara su dueño (Autor, o Personaje con `personajes` que lo incluye y `autor` informativo), la resolución va en dos pasos (`fichasDeCita`), el build rompe ante la ambigüedad y ante dos fichas de Personaje con la misma forma, la indexabilidad usa el recuento del dueño, y las órdenes que reescriben fichas conservan `personaje`/`personajes` (`reunir` se niega entre dueños distintos). La atribuida no tiene posición en el orden del libro. Dos guardas esperan a la 35.4: Cita publicada sin Autor (esquema) y Obra de Personaje con Citas publicadas (fichas). Con el Corpus real, `dist/` no cambia.

**Ficheros.**
- `tools/lib/autoria.ts` — `dueñoPorPrefijo` sustituye a la regla del prefijo solo de Autores.
- `tools/lib/gestion.ts` — `esDelAutor` sobre la unión; `crearAutor` se niega ante un Personaje; núcleos `proponerClavesDe`, `fijarClaveDe` (`CLAVES_DE_AUTOR`, `CLAVES_DE_PERSONAJE`) y `biografiaDeclarable`, compartidos con la orden de Personajes.
- `tools/lib/demanda.ts`, `tools/demanda.ts`, `tools/lib/corpus.ts` (serie) — demanda por Personaje, invariante con los Personajes, «Por Personaje» en el informe.
- `src/lib/admision.ts` — `personajeAdmisible`, `semblanzaPropia`, `universo`, `MENSAJE_AÑOS_DE_PERSONAJE`; Cita con `autor` opcional y «Autor o Personaje, al menos uno»; `reglaDeAutorPublicado`; ficha con `personaje`/`personajes` y `reglasDeDueñoDeObra`.
- `src/content.config.ts` — colección `personajes`; `autor` opcional y regla de la publicada en `citas`.
- `src/lib/slug.ts` — `slugDeCita(dueño, …)`, `slugDePersonaje`.
- `src/lib/obras.ts` — `Dueño`, `dueñoDeFicha`, `dueñoDeCita`, índice y resolución en dos pasos, `fallosDeObras` por dueño (prefijo, Personajes que existen, ambigüedad, misma forma, guarda 35.4), `ObraResuelta.dueño`.
- `src/lib/publicado.ts` — `Cita.personaje?`, `Personaje`, `personajesPublicados`, `obrasIndexables` por dueño, `aplanarFichaDeObra` con el dueño.
- `src/pages/obra/…`, `src/pages/tarjeta/obra/…` — `autor` opcional de la Obra resuelta.
- `tools/lib/obras.ts` — `resolverFichaDeObra` en dos pasos y con el dueño al crear; `datosDeFicha`, `reunir`, `separar`, `retirar`, `citasConObra` por dueño.
- `tools/lib/corpus.ts` — `rutas.personajes`, `PersonajeEnCorpus`, `leerPersonajes`, `escribirPersonaje`, YAML de la ficha con su dueño, `nombreDeFicheroDeCita(dueño, …)`.
- `tools/alta.ts`, `tools/lib/revision.ts`, `tools/extraer.ts`, `tools/lib/documentacion.ts`, `tools/lib/clases.ts` — `autor` opcional: dueño por `dueñoDeCita`; el alta admite la entrada de un Personaje sin Autor (a revisión con su prefijo) y no escribe la de un Personaje inexistente.
- `tools/lib/posiciones.ts` — sin posición para la atribuida.
- `tools/lib/claves.ts`, `integraciones/claves.ts` — `OrdenesDeClave`; la clave del Personaje publicado.
- `integraciones/personajes.ts`, `tools/lib/personajes.ts`, `tools/personaje.ts` (nuevos), `astro.config.mjs` — la puerta y la orden.
- `tools/lib/cotejo.ts`, `integraciones/cotejo.ts` — la semblanza del Personaje, cotejada como la del Autor.
- `tools/lib/avisar.ts`, `tools/lib/cambios.ts`, `integraciones/historial.ts`, `integraciones/obras.ts` — familia de fichero `personaje`, `CAMPOS_QUE_PINTA`/`CAMPOS_QUE_NO_FECHAN`, composición por dueño.
- `corpus/personajes/.gitkeep` — carpeta vacía versionada.
- Pruebas: `autoria.test.ts`, `personaje.test.ts`, `personajes-build.test.ts` (nuevas: cinco construcciones, una feliz y una por puerta, porque Astro se para en la primera que rompe y el esquema va antes que ninguna); `obras.test.ts`, `orden-del-libro.test.ts`, `alta.test.ts`, `revision.test.ts`, `demanda.test.ts`, `fecha-de-cambio.test.ts` ampliadas; `clase.test.ts`, `indexnow.test.ts`, `aislamiento-de-revision.test.ts` siguen el contrato nuevo; fixtures de `ObraResuelta` con `dueño` en ocho pruebas; `ayuda/construir.ts` crea `corpus/personajes/`; `dos-jornadas.test.ts` compara los avisos como conjunto.
- `AGENTS.md` — «Los Personajes» (nueva), «La Cita atribuida», «Las fichas de Obra», «Retirar un Autor» y «Leer la demanda por página».

**Revisión.** Pasada sin hallazgos externos: 0 parches, 0 diferidos, 0 rechazados. `followup_review_recommended: false` (0 high, 0 medium, 0 low; puntuación 0). Se anotan tres diferidos de la implementación (frontmatter): la bandera `--semblanza` de `biografia`, la lectura literal de «misma forma entre fichas de Personaje» y el aviso del cargador con la carpeta vacía.

**Verificación.**
- `npx vitest run tests/unit/autoria.test.ts tests/unit/personaje.test.ts tests/unit/demanda.test.ts tests/unit/obras.test.ts tests/unit/orden-del-libro.test.ts` — verde.
- `npx vitest run tests/unit/personajes-build.test.ts tests/unit/fecha-de-cambio.test.ts tests/unit/alta.test.ts tests/unit/revision.test.ts` — verde (las cinco construcciones en ~25 s).
- `npx astro check` — 0 errores, 0 avisos (428 ficheros).
- `FECHA_JORNADA=2026-11-08 npm run build` antes (sobre la línea base, sin cambios en el árbol) y después; `diff -rq`: solo difieren los nombres de `pagefind/filter/*.pf_filter`, `pagefind.es_*.pf_meta` y `pagefind-entry.json`. Dos pasadas de Pagefind sobre el mismo `dist/` dan también nombres distintos (comprobado aquí): no es de esta historia. Ningún otro fichero difiere.
- `grep -rn autorPorPrefijo src tools integraciones tests` — nada.
- `npm test` (`npm-test-35.2.log`): 159/163 ficheros; tres fallos eran pruebas del contrato viejo (la Cita de Personaje sin Autor, las familias de fichero, las bases de colección), puestas al día; el cuarto, el agotamiento conocido de 120 s de `extraer-cli` con carga ~16. Las cuatro, juntas (`reintento-35.2.log`): 114/114, EXIT=0. La segunda pasada entera (`npm-test-35.2-b.log`) dio 162/163: `dos-jornadas.test.ts` comparaba los avisos del build en orden, y con dos colecciones vacías en el fixture (`colecciones` y `personajes`) los dos «No files found» salen en cualquier orden; ahora los compara como conjunto. La tercera (`npm-test-35.2-c.log`): FINISHED EXIT=0, 163/163 ficheros, 7.301 pruebas.

**Riesgos residuales.** `extraer-cli` y `objetivo-cli` siguen rozando su plazo de 120 s con varios worktrees construyendo. La 35.3 tendrá que levantar la guarda de la Obra de Personaje o esperar a la 35.4 (diferido del plan).
