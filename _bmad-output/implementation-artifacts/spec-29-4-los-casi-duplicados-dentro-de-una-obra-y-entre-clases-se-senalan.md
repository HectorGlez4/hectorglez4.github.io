---
title: 'Historia 29.4: los casi duplicados dentro de una Obra y entre clases se señalan al curar'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_revision: '40a78bcf835b95163e806af721e0e2199e1229a8'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-29-context.md'
warnings: [oversized]
deferred:
  - summary: >-
      `aprobar` recalcula las parecidas de todo `_revision/` (contención frente a ~290.000 formas) aunque se apruebe un solo slug.
    evidence: |-
      `aprobar` llama a `loteEnRevision`, que desde la 29.4 corre `parecidasDeLasCandidatas` sobre todas las candidatas; los avisos solo hacen falta para las aprobadas. Es parte del +30 % de CPU medido, por debajo del Block If, y no cambia ningún veredicto: es coste, no defecto.
    location: >-
      tools/lib/revision.ts (aprobar → loteEnRevision → parecidasDeLasCandidatas)
    severity: low
  - summary: >-
      `revisar --aprobar` no compara entre sí, para la casi igual, dos candidatas de la misma Obra aprobadas en la misma pasada; el alta sí lo hace dentro de su lote.
    evidence: |-
      `parecidasDeLasCandidatas` mira la casi igual solo frente a las publicadas de la misma Obra resuelta, como fija el criterio («frente a las publicadas de la misma Obra resuelta»); el alta compara además con «el propio lote» desde la pasada 1. Dos candidatas casi iguales de la misma Obra aprobadas juntas se publican sin aviso entre ellas (la contenida y la repetida sí se avisan). Ampliarlo cambia el criterio y es decisión de Héctor.
    location: >-
      tools/lib/revision.ts (parecidasDeLasCandidatas, bucle de la casi igual)
    severity: low
---

<intent-contract>

## Intent

**Problem:** El Corpus publica en una misma Obra Citas que casi coinciden, se repiten o son fragmento de otra (en *Versos sencillos*: «Cultivo una rosa blanca / En julio como enero» suelta junto a su estrofa XXXIX entera; «Con los pobres de la tierra quiero yo mi suerte echar.» junto a la estrofa III), y nada las señala: `revisar` solo ve la repetida exacta, el alta ve repetida y contenida con una función propia (`contenidaEn`), y `documentar --texto` mide el parecido con otra (`parecidoDeTextos`). Tres medidas para una sola pregunta (AD-3 enmendado v9, FR-14).

**Approach:** Reunir la medida en `tools/lib/parecido.ts` con una sola función, `parecidoEntre`, que clasifica un par (repetidas, contenida, casi iguales o nada) sobre la forma canónica; añadir la orden de parte `npm run obra -- casi-duplicados`, que recorre los pares de cada Obra publicada y no escribe nada; y hacer que `revisar` (al listar y al aprobar) y el alta avisen con esa misma función, sin bloquear nada nuevo.

## Boundaries & Constraints

**Always:**
- `parecidoEntre` es la **única** función que calcula parecido: distancia de edición y contención viven solo en `tools/lib/parecido.ts`. `parecidoDeTextos` se mueve ahí (y su Levenshtein, `distanciaDeEdicion`), y `MIN_PARECIDO_PARA_CORREGIR` se mueve ahí con su nombre, su valor (0,85) y su comentario; `MIN_CARACTERES_PARA_CONTENCION` (40) sigue en `src/lib/umbrales.ts` y solo lo importa `parecido.ts`. Sin reexportaciones desde `documentacion.ts`.
- Todo se juzga sobre `normalizar` (`src/lib/normalizar.ts`): una Cita con sus saltos y la misma de corrido son **repetidas** (AD-29).
- Clases y precedencia, deterministas: **repetidas** (misma forma canónica no vacía) > **contenida** (la canónica de una dentro de la otra, la más corta con al menos `MIN_CARACTERES_PARA_CONTENCION` caracteres canónicos; se dice cuál contiene a cuál) > **casi iguales** (`parecidoDeTextos ≥ MIN_PARECIDO_PARA_CORREGIR`) > nada. Una forma canónica vacía no coincide con nada.
- `parecidoEntre` puede descartar por longitud antes de calcular (si `1 − |la−lb|/max < 0,85` no puede ser casi igual; si la corta < 40 no puede ser contenida): es exacto y no cambia ningún veredicto. Para recorrer conjuntos grandes, `parecido.ts` exporta además una forma precalculada (p. ej. `formaParaComparar(texto)`) que `parecidoEntre` acepta en lugar del texto, para normalizar cada texto una sola vez.
- La comparación no lee ninguna clase de Cita ni filtra por Autor en repetida y contenida (AD-32): la 35.7 solo añadirá `corpus/formas-vedadas.yml` a lo que se compara.
- El sistema no retira, fusiona, corrige ni conserva nada: todo lo nuevo es aviso. `--con-duplicados` del alta y la aprobación de `revisar` se comportan exactamente como hoy (el alta sigue apartando la repetida y la contenida sin `--con-duplicados`; la casi igual del alta es solo aviso y no aparta).
- `tests/unit/duplicados.test.ts` y `tests/unit/revision.test.ts` pasan sin tocar sus casos; `tests/unit/documentacion.test.ts` solo cambia la ruta de importación.

**Block If:**
- Acotado ya a la misma Obra (fallback de la historia), `npx tsx tools/revisar.ts` sin argumentos sigue más de un 50 % por encima de la medida de antes: HALT `blocked` con las cifras; acotar más o cambiar el aviso lo decide Héctor.
- El parte sobre el Corpus real **no** señala los dos casos de *Versos sencillos* del criterio: HALT `blocked` con lo que sale (el Corpus o el criterio no son los de la auditoría del 2026-11-03).

**Never:**
- Retirar, corregir, conservar, reunir ni editar ninguna Cita o ficha del parte (ni con `documentar`, ni a mano).
- Escribir en `corpus/` desde `casi-duplicados`, ni crear fichero de estado o de excepciones.
- Tocar `src/lib/vocabulario.ts`, `src/lib/superficies.ts`, guiones del sitio, `_bmad-output/planning-artifacts/` ni `_bmad-output/specs/`.
- Un segundo cálculo de parecido o de contención fuera de `parecido.ts` (ni en `src/`, ni en pruebas de producción).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Repetidas | «La vida, si sabes usarla, es larga.» / «LA VIDÁ SI SABES USARLA ES LARGA» | `repetidas`, parecido 1 | — |
| Verso frente a corrido | «Cultivo una rosa blanca\nEn julio como enero» / «Cultivo una rosa blanca En julio como enero» | `repetidas` | — |
| Casi iguales por una palabra | «…rosa blanca en julio como enero…» / «…en junio como enero…» (mismo resto, ≥0,85) | `casi-iguales`, parecido, palabra distinta `julio`/`junio` | — |
| Contenida, corta ≥ 40 | estrofa XXXIX entera / «Cultivo una rosa blanca En julio como enero» (43 canónicos) | `contenida`, indica cuál contiene a cuál | — |
| Contenida, corta < 40 | «Yo sé quién soy» dentro de una larga | nada | — |
| Nada | dos Citas distintas de la misma página (≈0,60) | `undefined` | — |
| Orden sin fichas | Corpus con dos Obras con pares | pares solo dentro de cada Obra, Obra con más pares primero; exit 0 | — |
| Ficha inexistente | `casi-duplicados no-existe` | no informa de ninguna | exit 1 |
| Corpus ilegible | Cita con frontmatter roto, o `--corpus` inexistente | no informa | exit 1 |
| Bandera desconocida o repetida | `--jsno`, `--json --json`, `--corpus a --corpus b` | uso | exit 2 |
| Sin pares | Obras sin coincidencias | parte «ningún par», exit 0 | — |

</intent-contract>

## Code Map

- `tools/lib/documentacion.ts:120-187` -- `MIN_PARECIDO_PARA_CORREGIR` (l.150, con su comentario largo), `parecidoDeTextos` (l.161) y `distanciaDeEdicion` (l.170): **se mueven** a `parecido.ts`; el uso en l.571-578 (`documentar --texto`) importa del módulo nuevo y juzga igual.
- `tools/alta.ts:34,84-89,245-282,397,422,506-516,530-556` -- import de `MIN_CARACTERES_PARA_CONTENCION`; `PosibleDuplicado` (ganará `clase`); índice `yaEnCorpus` (Map canónico → {slug, donde}) con revisión, publicadas y «el propio lote»; la comprobación `yaEnCorpus.get(canonico) ?? contenidaEn(...)` (l.275); formateo «Posibles duplicados» (l.506); `contenidaEn` (l.546) **se borra** y su comentario de la 15.2 pasa a `parecido.ts`. El alta ya resuelve la ficha de cada entrada (`resolverFichaDeObra`) para publicarla.
- `tools/lib/revision.ts:43-80,89-200,215-272,273+,641-673` -- `CandidataEnRevision.duplicaA` (repetida; **se conserva tal cual**, lo fija `tests/unit/revision.test.ts:339-372`); `loteEnRevision` (lee `_revision/` y `citas/`, Map de repetidas, recorrido por slug); `ResultadoDeDecision`; `aprobar` (llama a `loteEnRevision`); `formatearLote` (pinta «⚠ Duplica a …»).
- `tools/revisar.ts` -- CLI de listar/aprobar/rechazar; el parte de aprobar se compone aquí (l.104-180).
- `tools/obra.ts:1-60,76-90,125-276` -- CLI de `obra`: cabecera de uso, `USO`, `switch` de subórdenes, helpers `opcion`, `posicionales`, `motivosDeArgumentosNoReconocidos`, `raizDeCorpusDe`, `terminar` de `tools/lib/cli.ts`. `casi-duplicados` entra como suborden nueva.
- `tools/lib/corpus.ts:591` `leerFichasDeObra`, `:703` `leerCitas` (lanza ante frontmatter roto), `:350` `rutasDelCorpus`.
- `src/lib/obras.ts:239` `indiceDeFichas`, `:254` `fichaDeCita`, `:818` `resolverObras`, `:872` `colgarObras` -- la Obra resuelta que pinta la Página de Obra; agrupar por `cita.obra.nombre` (nombre de ficha).
- `src/lib/umbrales.ts:1130-1147` -- `MIN_CARACTERES_PARA_CONTENCION = 40` (se queda).
- `tests/unit/duplicados.test.ts` -- 1.6 y 15.2 sobre `darDeAltaLote`; sin tocar.
- `tests/unit/lineas.test.ts:277-330` -- patrón de la prueba de dueños (recorre `tools`, `src`, `integraciones`, `public/islas` y fija definiciones e importadores): copiarlo.
- `tests/unit/obra-cli.test.ts` -- patrón para probar la CLI de `obra` sobre un Corpus temporal.
- `tests/unit/ayuda/relleno.ts` -- `sembrarTemaPublicado` para Corpus de prueba.
- Corpus real (planificación): `corpus/obras/jose-marti--versos-sencillos.yml`; `corpus/citas/jose-marti--cultivo-una-rosa-blanca-en-junio-como.md` (texto «Cultivo una rosa blanca\nEn julio como enero», slug `jose-marti-cultivo-una-rosa-blanca-en-junio-como`) frente a `…-en-julio-como.md` (estrofa entera); `jose-marti--con-los-pobres-de-la-tierra-quiero.md` («Con los pobres de la tierra quiero yo mi suerte echar.») frente a `…-quiero-2.md` (estrofa entera).
- Cifras medidas al planificar (worktree, 2026-11-08): 4.424 publicadas, 520 Obras con Citas (máx. 231 en una; 135.169 pares internos), **288.594 candidatas** en `_revision/`, todas con obra, en 769 Obras (máx. 14.003 en una); 243.504 caen en una Obra con publicadas (3,4 M pares candidata×publicada de la misma Obra); contención en la misma Obra ≈ 1,04 × 10⁹ comparaciones ordenadas; frente a todo ≈ 8,4 × 10¹⁰. Mediana de longitud canónica 105, p90 195. `npx tsx tools/revisar.ts --primeras 1` tardó **59,1 s**, casi todo leyendo los dos directorios (la lectura sola, 59,5 s).

## Tasks & Acceptance

**Execution:**
- `tools/lib/parecido.ts` (nuevo) -- `MIN_PARECIDO_PARA_CORREGIR`, `parecidoDeTextos`, `distanciaDeEdicion` (privada), `formaParaComparar`, tipo `ClaseDeCoincidencia = 'repetidas' | 'contenida' | 'casi-iguales'` y `parecidoEntre(a, b) → { clase, parecido, contenida?: 'a' | 'b', palabra?: { a, b } } | undefined` con la precedencia y los descartes por longitud de Boundaries. `palabra`: solo si las dos formas canónicas tienen el mismo número de palabras y difieren en exactamente una posición. Cabecera: AD-3, FR-14, por qué contención (15.2) y por qué una sola medida -- único dueño.
- `tools/lib/documentacion.ts` -- quitar las tres definiciones e importar de `./parecido.ts` -- `documentar --texto` juzga igual.
- `tests/unit/documentacion.test.ts` -- solo la ruta de importación de `parecidoDeTextos` y `MIN_PARECIDO_PARA_CORREGIR`.
- `tools/alta.ts` -- borrar `contenidaEn` y su import de umbrales; la repetida/contenida frente a `yaEnCorpus` (todo lo publicado, todo lo de revisión y el propio lote, como hoy) se decide con `parecidoEntre`; `PosibleDuplicado` gana `clase: 'repetidas' | 'contenida'`; nueva lista no bloqueante en `InformeDeAlta`, `casiIguales: { texto, coincideCon, donde: 'publicadas', parecido, palabra? }[]`, frente a las publicadas de la misma Obra resuelta (por ficha, `indiceDeFichas`/`fichaDeCita`) -- se calcula también en `--seco` y con `--con-duplicados`; el formateo nombra la otra Cita, dónde y la clase.
- `tools/lib/revision.ts` -- `CandidataEnRevision` gana `parecidas?: { slug, donde: 'publicadas' | 'en revisión', clase: 'contenida' | 'casi-iguales', parecido }[]` (ordenadas: publicadas antes, luego por slug), `duplicaA` intacto; contenida frente a publicadas y revisión, casi igual frente a publicadas de la misma Obra resuelta, todo con `parecidoEntre` y formas precalculadas; `formatearLote` pinta cada una («⚠ Contenida en/Contiene a …», «⚠ Casi igual a … (0,91; julio/junio)»), y «Duplica a» añade «(repetidas)»; `aprobar` devuelve en `ResultadoDeDecision` los avisos (`avisos: { slug, duplicaA?, parecidas }[]`) de lo que publicó -- revisar gana la contenida y la casi igual sin bloquear.
- `tools/revisar.ts` -- en el parte de `--aprobar`, una línea «⚠» por aviso de cada publicada; sin cambio en códigos de salida.
- Medida de `revisar` -- **antes de tocar código**, `/usr/bin/time npx tsx tools/revisar.ts > /dev/null` dos veces sobre el Corpus del worktree; después, igual. Si el después supera el antes en más de un 50 %, acotar la contenida de `revisar` a la misma Obra resuelta (ficha; candidata sin ficha: `clave(autor, formaDeObra(obra))`) y volver a medir; anotar en este spec, sección «Medidas», las cifras y si se acotó, para Héctor. El alta no se acota (lotes pequeños).
- `tools/lib/obras.ts` (o `tools/lib/casiDuplicados.ts` nuevo) -- `casiDuplicados(rutas, fichas?: string[])`: lee Citas publicadas y fichas activas (ficha nombrada que no está en `corpus/obras/` → `{ ok: false }`; lectura que lanza → `{ ok: false }`), cuelga la Obra con `colgarObras`, agrupa por `obra.nombre` y aplica `parecidoEntre` a cada par no ordenado; cada par: dos slugs (orden por slug), dos textos literales, clase, parecido (2 decimales en texto), `contenida` y `palabra` si los hay; Obras con más pares primero (empate por nombre), pares por clase en orden de precedencia y luego slugs; resumen: Obras con pares y pares por clase. `formatearCasiDuplicados` cierra recordando las tres decisiones en orden —retirar una (`npm run documentar -- --retirar <slug> "<motivo>"`), conservar las dos, restituir el literal (`npm run documentar -- <slug> <documento> --texto "…"`)— y que lo decide una persona.
- `tools/obra.ts` -- suborden `casi-duplicados [<ficha>...] [--corpus <raíz>] [--json]`: cabecera de uso y `USO`; bandera desconocida o repetida → 2; `{ ok: false }` → 1 con el motivo y sin parte; si no, parte (o JSON en stdout) y 0.
- `tests/unit/parecido.test.ts` (nuevo) -- la matriz I/O de la función (repetido, «en julio»/«en junio» con `palabra`, contenida por encima y por debajo de `MIN_CARACTERES_PARA_CONTENCION`, nada, verso frente a corrido, precedencia contenida > casi iguales); la prueba de dueños al estilo de `lineas.test.ts`: `function parecidoEntre|parecidoDeTextos|distanciaDeEdicion` y `MIN_PARECIDO_PARA_CORREGIR =` solo en `tools/lib/parecido.ts`, ningún `contenidaEn` definido, y `MIN_CARACTERES_PARA_CONTENCION` importado solo por `tools/lib/parecido.ts`.
- `tests/unit/casi-duplicados.test.ts` (nuevo) -- Corpus temporal con dos Obras de un Autor (o dos Autores) con pares en cada una y un texto repetido entre Obras distintas: pares solo dentro de cada Obra, orden, una ficha nombrada recorre solo esa, ficha inexistente → 1, bandera desconocida → 2, `--json` parseable con la forma declarada, y el árbol de `corpus/` byte a byte igual antes y después.
- `tests/unit/revision.test.ts` / `tests/unit/duplicados.test.ts` -- añadir (sin tocar los existentes) casos: `loteEnRevision` señala contenida y casi igual de la misma Obra; `aprobar` publica igual y devuelve el aviso; el alta informa `casiIguales` sin apartar y `clase` en `posiblesDuplicados`.
- `AGENTS.md` -- «Las fichas de Obra»: `npm run obra -- casi-duplicados`, qué señala (las tres clases dentro de cada Obra publicada), que no escribe y que decide una persona; «Una sesión de sembrado»: `revisar` avisa también de la contenida y de la casi igual de la misma Obra (y si se acotó, que la contenida es de la misma Obra).
- Este spec, sección «Parte sobre el Corpus real» -- al cerrar, `npm run obra -- casi-duplicados` entero: cuántas Obras con pares y cuántos pares de cada clase (y el JSON resumido), para Héctor; ninguna decisión tomada.

**Acceptance Criteria:**
- Given el árbol `tools/ src/ integraciones/ public/islas/`, when corre `tests/unit/parecido.test.ts`, then la distancia de edición, la contención y las constantes de parecido solo se definen o importan en `tools/lib/parecido.ts`, y `tests/unit/duplicados.test.ts`, `tests/unit/revision.test.ts` y `tests/unit/documentacion.test.ts` pasan sin cambiar ningún caso existente.
- Given el Corpus real, when se corre `npm run obra -- casi-duplicados jose-marti--versos-sencillos`, then el parte señala `jose-marti-cultivo-una-rosa-blanca-en-junio-como` contenida en la Cita de la estrofa XXXIX y «Con los pobres de la tierra quiero yo mi suerte echar.» contenida en la de la estrofa III, recuerda las tres decisiones, sale con 0 y `git status --short corpus` no cambia.
- Given una candidata en `corpus/_revision/` cuyo texto está contenido en una publicada, when se corre `npx tsx tools/revisar.ts`, then su entrada lleva el aviso con la otra Cita, «publicadas» y la clase, y `--aprobar` la publica igual que hoy con el aviso en el parte.
- Given un lote del alta con una entrada casi igual a una publicada de su Obra, when se da de alta sin `--con-duplicados`, then se publica, y el parte nombra la casi igual con la otra Cita y su parecido.
- Given la historia cerrada, when se lee este spec, then trae las medidas de `revisar` antes y después (y si se acotó) y el parte entero del Corpus real.

## Design Notes

Precedencia contenida > casi iguales: un fragmento al que le falta una palabra final puede pasar 0,85; llamarlo «contenida» dice qué hacer con él (es la otra Cita recortada). Decisión del agente, fijada por prueba.

Coste: con 288.594 candidatas, contención frente a todo son ~8 × 10¹⁰ comparaciones y no termina; la historia prevé acotar a la misma Obra si se vuelve lento, y la medida lo decide y se anota. Normalizar una sola vez por texto (`formaParaComparar`) y los descartes por longitud son lo que hace viable incluso el caso acotado (1 × 10⁹ comparaciones baratas de `includes`). Acotar en `revisar` pierde el cruce entre Autores dentro de revisión; el alta lo conserva. Se anota para Héctor (AD-32).

## Verification

**Commands:**
- `npx vitest run tests/unit/parecido.test.ts` -- verde
- `npx vitest run tests/unit/casi-duplicados.test.ts` -- verde
- `npx vitest run tests/unit/duplicados.test.ts tests/unit/revision.test.ts tests/unit/documentacion.test.ts tests/unit/alta.test.ts tests/unit/obra-cli.test.ts tests/unit/lineas.test.ts` -- verdes, sin casos existentes cambiados
- `npx astro check` -- 0 errores
- `npm run obra -- casi-duplicados` y `npm run obra -- casi-duplicados --json` -- exit 0; `git status --short corpus` igual antes y después
- `npm test` completo, desacoplado con `correr.sh`/`esperar.pl` -- verde

## Medidas

`/usr/bin/time -p npx tsx tools/revisar.ts > /dev/null` sobre el Corpus del worktree (4.424 publicadas, 288.594 candidatas), con otras etapas del bucle construyendo en paralelo en la misma máquina (de ahí la dispersión del tiempo real):

| | real (s) | user (s) | sys (s) |
|---|---|---|---|
| Antes (40a78bcf83), 1 | 98,85 | 49,95 | 34,00 |
| Antes, 2 | 130,07 | 51,11 | 35,70 |
| Después, 1 | 136,98 | 69,64 | 38,82 |
| Después, 2 | 103,39 | 63,89 | 34,04 |
| Después, 3 | 87,55 | 63,70 | 33,22 |

Media real: antes 114,5 s, después 109,3 s; la CPU de usuario sube de ~50,5 s a ~65,7 s (+30 %), por debajo del +50 % de Block If. **No se acotó**: la contenida de `revisar` se mira frente a todo lo publicado y todo lo de revisión, en los dos sentidos, gracias a `indiceDeContencion` (la palabra interior más rara de cada forma) y a los descartes exactos de `parecidoEntre`; la casi igual, frente a las publicadas de la misma Obra resuelta. El cruce entre Autores dentro de revisión se conserva. En esa pasada el listado entero dio estas líneas «⚠»: «Duplica a» 5 (publicadas) y 295 (en revisión), como hoy; «Contenida en» 14 (publicadas) y 821 (en revisión); «Contiene a» 13 (publicadas) y 821 (en revisión); «Casi igual a» 12 (publicadas).

## Parte sobre el Corpus real

`npm run obra -- casi-duplicados` (y `--json`) sobre el Corpus del worktree, exit 0 en los dos, `git status --short corpus` igual antes y después (vacío): 518 Obras recorridas, **1 Obra con pares**, 2 pares — 0 repetidas, 2 contenidas, 0 casi iguales. Resumen JSON: `{"recorridas":518,"conPares":1,"pares":{"repetidas":0,"contenida":2,"casi-iguales":0}}`.

```
jose-marti--versos-sencillos («Versos sencillos»): 2 pares
  · contenida (0,51): jose-marti-con-los-pobres-de-la-tierra-quiero dentro de jose-marti-con-los-pobres-de-la-tierra-quiero-2
  · contenida (0,48): jose-marti-cultivo-una-rosa-blanca-en-junio-como dentro de jose-marti-cultivo-una-rosa-blanca-en-julio-como
```

Son los dos casos de la auditoría del 2026-11-03. Ninguna decisión tomada: retirar, conservar o restituir es de Héctor.

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

(Registro de la ejecución inicial: las capas externas aún no habían corrido; sus hallazgos se tratan en las dos pasadas siguientes.)

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 12: (high 0, medium 2, low 10)
- defer: 1: (high 0, medium 0, low 1)
- reject: 11: (high 0, medium 0, low 11)
- addressed_findings:
  - `[medium]` `[patch]` El alta anotaba en `casiIguales` («escritas igual») entradas que luego apartaba por repetida/contenida, mandaba a revisión o rechazaba por Tema: ahora se reúnen por entrada y pasan al informe solo al publicarla.
  - `[medium]` `[patch]` Faltaban pruebas de lo que se lee: el parte de `revisar --aprobar` (nueva prueba de CLI en `revisar-cli.test.ts`), las líneas «Casi igual a …»/«Contiene a …» de `formatearLote`, `duplicaA` en `avisos`, las etiquetas «(publicadas; contenida|repetidas)» y la cifra del parte del alta, la casi igual apartada y la forzada con `--con-duplicados`.
  - `[low]` `[patch]` El alta no comparaba la casi igual dentro del mismo lote: lo que el lote publica entra en las de su Obra (`donde: 'el propio lote'`; por ficha, o por identidad Autor+forma si la Obra aún no tiene ficha), copiadas por pasada para que el ensayo no contamine la pasada real.
  - `[low]` `[patch]` `repetidaOContenida` del alta nombraba la candidata en revisión antes que la publicada que también la contenía: ahora recorre primero las publicadas, como dice el comentario de la repetida.
  - `[low]` `[patch]` La cifra del parecido salía «0.91» en el alta y «0,91» en `revisar` y en el parte: una sola forma, `cifraDeParecido` de `tools/lib/parecido.ts`, en los tres.
  - `[low]` `[patch]` El orden de `parecidas` desempataba la clase por orden alfabético: ahora por `CLASES_DE_COINCIDENCIA`.
  - `[low]` `[patch]` Los `avisos` de `aprobar` iban con el slug de la candidata y no con el que salió (`definitivo`), como `conSaltos`.
  - `[low]` `[patch]` Los `avisos` de `aprobar` decían «en revisión» de una otra Cita que la misma pasada acababa de publicar: se reescriben a «publicadas» con su slug definitivo.
  - `[low]` `[patch]` `revisar.ts` recortaba «⚠ » con `.slice(2)` y arrastraba «Decide tú.» a lo ya publicado, y la repetida tenía otra redacción: `textoDeRepetida`/`textoDeParecida` dan el texto sin signo ni cierre y el listado y el parte lo envuelven.
  - `[low]` `[patch]` `casi-duplicados` exigía `obras/` (un Corpus sin fichas salía con 1) y una ficha nombrada sin Citas daba «Ningún par» sin decirlo: `obras/` ya no hace falta y el parte lleva `sinCitas` («sin Citas publicadas; no se recorre»).
  - `[low]` `[patch]` AGENTS.md no decía los límites de la casi igual (solo frente a publicadas, solo con ficha) ni que `revisar` y el alta leen `corpus/obras/`, ni lo de la ficha sin Citas del parte.
  - `[low]` `[patch]` La prueba «con o sin --con-duplicados» no ejercía `--con-duplicados`: renombrada y cubierto el caso en una prueba nueva.

Diferido: el coste de `aprobar`, que recalcula las parecidas de todo `_revision/` (frontmatter). Rechazados: el barrido lineal del alta y su rama redundante (lotes pequeños; ya era así), el objeto `CitaConObra` del alta (es el contrato del tipo), la forma en tupla de `palabra` en el JSON (coherente con `slugs` y `textos`), la rama sin palabras interiores de `indiceDeContencion` (≥ 40 caracteres en ≤ 2 palabras, exacta), la contención no alineada a palabra y el parecido de la contenida como cociente de longitudes (los define el spec), la prueba de dueños por nombres (la forma que pide el spec), la repetida de `revisar` fuera de `parecidoEntre` («se conserva tal cual»), «entre clases» por construcción y el parte real comprobado a mano (lo que pide la historia), el registro de revisión anterior, 518 frente a 520 Obras (la cifra de planificación es de otro censo; el criterio no la fija) y la medida bajo carga (las dos cifras quedan bajo el +50 %).

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 10: (high 0, medium 0, low 10)
- defer: 1: (high 0, medium 0, low 1)
- reject: 44: (high 0, medium 0, low 44)
- addressed_findings:
  - `[low]` `[patch]` `cifraDeParecido` escribía «1,00» para un par no repetido con parecido ≥ 0,995 (una letra en un texto largo): ahora «0,99»; prueba en `parecido.test.ts`.
  - `[low]` `[patch]` El índice de contención no tenía prueba de la última palabra a medias (`slice(1, -1)`): prueba nueva con «enerote», que falla con `slice(1)`.
  - `[low]` `[patch]` El orden del parte (Obra con más pares primero; clases por precedencia) coincidía en la prueba con el alfabético: prueba nueva con Obras «zzz»/«aaa» y slugs que invierten la clase.
  - `[low]` `[patch]` El orden de `parecidas` (publicadas primero, luego slug) no se probaba con más de una: prueba nueva con dos publicadas y una en revisión.
  - `[low]` `[patch]` «Contiene a <publicada>» no se probaba, ni la contenida entre Autores (AD-32): prueba nueva con la publicada de otro Autor dentro de la candidata.
  - `[low]` `[patch]` El texto «Duplica a … (publicadas; repetidas)» del listado no se probaba: prueba nueva.
  - `[low]` `[patch]` La reescritura de `aDondeVa` al slug definitivo de la otra Cita no se probaba: prueba nueva con la otra renombrada al publicarse, que falla sin el cambio de slug.
  - `[low]` `[patch]` La ficha ilegible que para `revisar` (documentada en AGENTS.md) no se probaba: prueba nueva de `loteEnRevision`, que rechaza nombrando el fichero.
  - `[low]` `[patch]` `formatearInforme` del alta tenía un ternario que devolvía su propia entrada: ahora `d.clase`.
  - `[low]` `[patch]` La contabilidad del spec se leía contradictoria: el primer registro y el primer «Revisión» del Auto Run Result dicen ya que son de la ejecución inicial, antes de las capas.

Diferido: la casi igual entre candidatas de la misma Obra aprobadas juntas en `revisar` (frontmatter). Rechazados: la línea de `sprint-status.yaml` (la escribe el cierre del bucle) y `review_loop_iteration` (no hubo vuelta por bad_spec); la medida bajo carga y sin repetir tras los parches (los parches no tocan el recorrido; las dos cifras quedan bajo el +50 %); la memoria de los trigramas, la rama sin palabras interiores del índice, el barrido del alta y sus formas por pasada, la doble normalización (coste, sin defecto observado; `revisar` terminó en las cinco medidas); la repetida fuera de `parecidoEntre` y la prueba de dueños por nombres (lo que pide el spec); la forma de `palabra` en el JSON, `contenida` opcional en el tipo, «en este orden», `localeCompare`, la Cita de mentira del alta, el análisis de banderas a mano, `--json` tras `--` y la ficha con `.yml`; la contención a mitad de palabra y la cifra 0,00 de una contenida diminuta (definidas por el spec); los casos del alta sin ficha o con ficha recién creada, el slug repetido en `_revision/`, el aviso de una pasada anterior, la coincidencia única del alta, `colgarObras` fuera del `try`, el Corpus sin Citas, los sustitutos astrales y la palabra partida o unida (especulativos); el rechazo sin capturar de `revisar` ante una ficha ilegible (como ante una Cita ilegible, desde antes, y nombra el fichero); la prueba sobre el Corpus real (el Corpus cambia por decisión de Héctor; el parte real queda en el spec), la prueba de coste, la mezcla de la 29.3 en el rango, los números de línea del Code Map y las líneas «Contiene a»/«Contenida en» duplicadas (forma pedida: cada candidata dice la suya).

## Auto Run Result

Status: done
Blocking condition: ninguna (las dos condiciones de Block If no se dieron: `revisar` no sube un 50 % y el parte señala los dos casos de *Versos sencillos*).

**Resumen.** Una sola medida de parecido, `parecidoEntre` en `tools/lib/parecido.ts` (repetidas > contenida > casi iguales, sobre `normalizar`, con descartes exactos por longitud y por trigramas y `indiceDeContencion` para conjuntos grandes), adonde se mueven `parecidoDeTextos`, `distanciaDeEdicion` y `MIN_PARECIDO_PARA_CORREGIR`; `contenidaEn` del alta desaparece. Nueva orden de parte `npm run obra -- casi-duplicados [<ficha>...] [--json]`, que no escribe nada. `revisar` (listado y `--aprobar`) y el alta avisan de la contenida y de la casi igual sin bloquear nada nuevo.

**Ficheros.**
- `tools/lib/parecido.ts` — nuevo: el único dueño del parecido y de la contención.
- `tools/lib/casiDuplicados.ts` — nuevo: `casiDuplicados` y `formatearCasiDuplicados`, pares dentro de cada Obra resuelta.
- `tools/obra.ts` — suborden `casi-duplicados` (2 por bandera desconocida o repetida, 1 por ficha ajena o Corpus ilegible).
- `tools/lib/documentacion.ts` — sin la medida; la importa de `parecido.ts` y juzga igual.
- `tools/alta.ts` — sin `contenidaEn`; `PosibleDuplicado.clase`, lista no bloqueante `casiIguales` frente a las publicadas de su Obra, y su parte.
- `tools/lib/revision.ts` — `CandidataEnRevision.parecidas` (contenida frente a todo, casi igual frente a su Obra), `ResultadoDeDecision.avisos`, `lineaDeParecida` y el listado.
- `tools/revisar.ts` — los avisos de lo publicado en el parte de `--aprobar`.
- `tests/unit/parecido.test.ts`, `tests/unit/casi-duplicados.test.ts` — nuevos; `tests/unit/revision.test.ts`, `tests/unit/duplicados.test.ts` — casos añadidos sin tocar los existentes; `tests/unit/documentacion.test.ts` — solo la ruta de importación.
- `AGENTS.md` — la orden nueva en «Las fichas de Obra» y los avisos de `revisar` en «Una sesión de sembrado».

**Revisión (ejecución inicial, antes de las capas externas).** 0 parches, 0 diferidos, 0 rechazados; las pasadas 1 y 2, abajo, tratan los hallazgos de las capas.

**Verificación.** `npx vitest run` de `parecido`, `casi-duplicados`, `duplicados`, `revision`, `documentacion`, `alta`, `obra-cli` y `lineas`: verdes. `npx astro check`: 0 errores, 0 avisos (10 sugerencias ya existentes). `npm run obra -- casi-duplicados` y `--json`: exit 0, `git status --short corpus` igual antes y después. `npm test` entero (desacoplado): 162 ficheros, 7.402 pruebas, verde. Medidas de `revisar` y parte del Corpus real, en sus secciones. Auditoría de la matriz: cada fila tiene una prueba que corrió y pasó (`parecido.test.ts` para las seis de la función; `casi-duplicados.test.ts` para orden, ficha inexistente, Corpus ilegible o inexistente, banderas y sin pares, también por la orden).

**Riesgos residuales.** Leer `corpus/obras/` es nuevo en `revisar` y en el alta: una ficha ilegible, que ya rompía el build, ahora también las para. El tiempo de `revisar` se midió con otras etapas construyendo en paralelo; la CPU de usuario es la cifra más estable (+30 %). La casi igual de `revisar` y del alta solo mira publicadas de la misma Obra resuelta por ficha (una candidata cuya obra aún no tiene ficha no tiene publicadas con que compararse).

### Pasada de revisión 1 (2026-11-08)

**Resumen.** Doce parches sobre los hallazgos de las cinco capas externas, sin tocar el `<intent-contract>` ni el comportamiento de bloqueo: el alta anota la casi igual solo de lo que publica, la compara también dentro del mismo lote y prefiere la publicada en la contenida; `aprobar` da sus avisos con el slug definitivo y con «publicadas» para lo que la misma pasada publicó; el texto de cada aviso tiene un dueño (`textoDeRepetida`, `textoDeParecida`) y la cifra otro (`cifraDeParecido`); `casi-duplicados` no exige `obras/` y nombra la ficha pedida sin Citas.

**Ficheros de esta pasada.**
- `tools/lib/parecido.ts` — `cifraDeParecido`, la forma única de escribir el parecido.
- `tools/alta.ts` — `casiIguales` por entrada publicada, comparación dentro del lote (`donde: 'el propio lote'`), mapa por pasada, contenida con la publicada primero, cifra con coma.
- `tools/lib/revision.ts` — orden de clases por `CLASES_DE_COINCIDENCIA`, `avisos` con `definitivo` y reescritos tras la pasada, `textoDeRepetida`/`textoDeParecida` en lugar de `lineaDeParecida`.
- `tools/revisar.ts` — el parte de `--aprobar` con esos textos, sin `.slice(2)` ni «Decide tú.».
- `tools/lib/casiDuplicados.ts` — sin exigir `obras/`; `sinCitas` en el parte y en el JSON (omitido si vacío).
- `AGENTS.md` — los límites de la casi igual, la lectura de `corpus/obras/` y la ficha sin Citas del parte.
- `tests/unit/revision.test.ts`, `tests/unit/duplicados.test.ts`, `tests/unit/casi-duplicados.test.ts`, `tests/unit/revisar-cli.test.ts` — casos añadidos (ninguno existente cambiado salvo el título de una prueba de la 29.4 que prometía `--con-duplicados`).

**Revisión.** 12 parches (0 high, 2 medium, 10 low), 1 diferido, 11 rechazados (detalle en el Triage Log). `followup_review_recommended: true`: puntuación 3 × 2 + 10 = 16.

**Verificación.** `npx vitest run` de `parecido`, `casi-duplicados`, `duplicados`, `revision`, `documentacion`, `alta`, `obra-cli`, `lineas` y `revisar-cli`: 9 ficheros, 244 pruebas, verdes. `npx astro check`: 0 errores, 0 avisos. `npm run obra -- casi-duplicados` y `--json` sobre el Corpus real: exit 0, el mismo parte (518 recorridas, 1 con pares, 2 contenidas de *Versos sencillos*), `git status --short corpus` vacío antes y después. `npm test` entero, desacoplado: 162 ficheros, 7.413 pruebas, verde.

**Riesgos residuales.** Los de la pasada anterior siguen: la casi igual solo mira publicadas con ficha, y una ficha ilegible para `revisar` y el alta (ahora dicho en AGENTS.md). `aprobar` sigue pagando el recorrido entero de `_revision/` (diferido). Las medidas de `revisar` no se repitieron: los parches no tocan el recorrido de la contención.

### Pasada de revisión 2 (2026-11-08)

**Resumen.** Un parche de comportamiento —`cifraDeParecido` ya no escribe «1,00» de lo que no es igual—, una limpieza del alta y ocho pruebas que fijan lo que las capas vieron sin probar: el orden del parte y de `parecidas`, «Contiene a» una publicada de otro Autor (AD-32), el texto de la repetida, el slug definitivo de la otra Cita en `aDondeVa`, la última palabra a medias del índice de contención y la ficha ilegible de `revisar`. Sin tocar el `<intent-contract>` ni el bloqueo.

**Ficheros de esta pasada.**
- `tools/lib/parecido.ts` — `cifraDeParecido`: 0,995 ≤ p < 1 se escribe «0,99».
- `tools/alta.ts` — la etiqueta de clase del parte es `d.clase`.
- `tests/unit/parecido.test.ts`, `tests/unit/casi-duplicados.test.ts`, `tests/unit/revision.test.ts` — casos añadidos, ninguno existente cambiado.
- Este spec — contabilidad de la ejecución inicial aclarada, un diferido nuevo, el registro de la pasada.

**Revisión.** 10 parches (0 high, 0 medium, 10 low), 1 diferido, 44 rechazados (detalle en el Triage Log). `followup_review_recommended: true` por la regla (puntuación 3 × 0 + 10 = 10), aunque todos son bajos y ocho son solo pruebas.

**Verificación.** `npx vitest run` de `parecido`, `casi-duplicados`, `duplicados`, `revision`, `documentacion`, `alta`, `obra-cli`, `lineas` y `revisar-cli`: 9 ficheros, 252 pruebas, verdes; la prueba de `aDondeVa` falla con la mutación del slug. `npx astro check`: 0 errores, 0 avisos. `npx tsx tools/obra.ts casi-duplicados --json` sobre el Corpus real: exit 0, el mismo parte, `git status --short corpus` vacío. `npm test` entero, desacoplado: 162 ficheros, 7.421 pruebas, verde.

**Riesgos residuales.** Los de las pasadas anteriores; además, la casi igual entre candidatas aprobadas juntas en `revisar` (diferida, para Héctor).

## Verificación previa a la fusión — 2026-11-08

Puerta de la etapa s-29 (Épica 29, historias 29.1–29.4), intento 1.

- **Sincronía.** `git fetch origin`: `origin/main` (2566e227b4) ya es antepasado de la rama; no hubo fusión. `npx tsx tools/autor.ts proponer-claves`: «Ninguna clave nueva», nada escrito. `npx tsx tools/documentar.ts --restituir-saltos --seco`: Citas publicadas, 0 ganarían saltos y 75 ya restituidas; candidatas, 0 ganarían saltos; 0 conflictos; nada escrito. `tools/clases.ts` no existe en el árbol.
- **Equivalente del CI** (`publicar.yml`; el lock no cambió, sin `npm ci`). `npm run build`: verde (5.295 páginas, NFR-5 a 3 saltos, peso 485,4 MiB juzgados bajo el aviso). `npx astro check`: 0 errores, 0 avisos, 10 sugerencias. `npm test`: 162 ficheros, 7.421 pruebas, verde; repetido tras el arreglo, igual.
- **`npm run test:e2e` completo, primera pasada: 8 rojos**, los mismos en los dos proyectos. Causa: desde la 29.3 un verso se pinta como `span.verso` dentro de `span.fragmento`, y con los 75 saltos restituidos ya hay Citas en verso en los listados de Tema y Colección. `coleccion.spec.ts` («la serif no aparece en nada más que…») tomaba el `span.verso` por serif fuera de sitio, y las instantáneas de la 26.12 (`tipografia-calculada`, tema y coleccion) no tenían la ruta nueva. **Arreglo** (239d883c22): la prueba de la serif nombra el verso con el fragmento que lo contiene —es texto de Cita, UX-DR31— y las cuatro instantáneas se regrabaron: la única diferencia es la ruta `span.fragmento > span.verso`, con el mismo «600 | 1.300» que su fragmento; ningún otro valor se movió. El cuarto rojo, `buscar-con-resultados`, es el parpadeo conocido de `p.estado` y pasó solo.
- **`npm run test:e2e` completo, segunda pasada:** 1.281 superadas, 110 omitidas, 1 roja (`tipografia-calculada` › `buscar-con-resultados`, escritorio: `p.estado` con texto, el mismo parpadeo); el fichero repetido solo: 28 de 28 en verde.
- **NFR-7** (aplica: la 29.3 cambia lo que pintan la Página de Cita, los listados y la portada). Lighthouse 13.5.0, móvil, `--throttling-method=simulate`, 10 corridas por página y construcción, alternando `origin/main` (2566e227b4) y la rama, las dos construidas con `MEDICION_ENDPOINT=http://localhost:8787/` y servidas por el `tests/servidor.mjs` de la rama con `SERVIDOR_CACHE_CONTROL=max-age=600` y `SERVIDOR_GZIP=1`; receptor ficticio en 8787 que contesta 204. Medias (ms):

  | Página | LCP main | LCP rama | Δ | FCP main | FCP rama | Δ |
  |---|---|---|---|---|---|---|
  | `/cita/antonio-machado-caminante-no-hay-camino-sino-estelas-en/` (en verso) | 1610 | 1579 | −31 | 928 | 924 | −4 |
  | `/obra/antonio-machado/proverbios-y-cantares/` | 1654 | 1654 | −1 | 775 | 772 | −3 |
  | `/` | 1504 | 1505 | +1 | 750 | 762 | +13 |
  | `/buscar/` | 1593 | 1549 | −44 | 889 | 848 | −41 |

  Todas dentro de main + máx(100 ms, 5 %), y el LCP de la Cita bajo 2.500 ms: veredicto **ok**, sin desempate con `devtools`.
- **Vocabulario.** La etapa no toca `src/lib/vocabulario.ts` ni añade nada a `medicion/migrations/`.
