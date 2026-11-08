---
title: 'Historia 29.2 — Una orden restituye los saltos de las Citas publicadas desde su documento'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_revision: 'ae2c803b97f967f4ec28ba6767b4295685e21773'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-29-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-29-1-el-salto-de-verso-sobrevive-en-el-corpus-el-cotejo-y-el-slug.md'
warnings: [oversized]
deferred:
  - summary: >-
      En la rama v9/epica-29 `corpus/_revision/` está versionado (288.595 ficheros) contra la decisión del 2026-10-16, y el commit de restitución 3906b28d50 lleva 1.259 candidatas; hay que dejarlo sin versionar antes de fusionar con la principal.
    evidence: |-
      `git ls-files corpus/_revision | wc -l` en la rama da 288.595; AGENTS.md § Policy dice que las candidatas sin aprobar no se versionan. No lo causa la 29.2 (el versionado viene de antes en la rama), pero su commit de restitución lo amplía y nada lo anota para la fusión.
    location: >-
      corpus/_revision/ (rama v9/epica-29)
    severity: medium
---

<intent-contract>

## Intent

**Problem:** La 29.1 dejó el escritor único (`textoConSaltos`) y la puerta que rechaza un salto sin respaldo, pero las Citas publicadas siguen de corrido: unas 75 de documento de verso ganarían saltos (cifra de la 29.1) y nada las restituye, ni nada impide que lo sembrado en la principal llegue sin ellos tras cada puesta al día. Sin restitución, la 29.3 no tiene verso que pintar ni su puerta de cabida corre sobre lo real.

**Approach:** Una suborden de `documentar`, `--restituir-saltos [<slug>...] [--seco] [--corpus <raíz>]`, hermana de `--restituir-traduccion`, que decide por Cita —publicadas y, aparte, candidatas— con **una sola** función de decisión nueva de `tools/lib/lineas.ts` (`saltosDeLaCita`) y reescribe solo la línea `texto:` del fichero; y una regla 4 en la puerta del cotejo del build que usa esa misma función y rompe ante una Cita de documento de verso sin sus saltos, con la orden exacta.

## Boundaries & Constraints

**Always:**
- Restituir nunca cambia una letra ni un signo (NFR-12): se escribe solo si `colapsarEspacios(nuevo) === colapsarEspacios(publicado)`; si no, conflicto listado y la Cita no se toca.
- Solo cambia la línea `texto: "<…>"` que produce `aYaml` (`texto: ${JSON.stringify(viejo)}`), sustituida por la de `aYaml` con el texto nuevo; el resto del fichero queda byte a byte (claves, orden, otros campos). Comprobado al planificar: las 4.424 publicadas y las 288.594 candidatas del worktree tienen exactamente esa línea. Si un fichero no la tiene, conflicto con motivo, sin tocarlo.
- Slug, nombre de fichero y URL no cambian (AD-4, NFR-4).
- La orden y la puerta deciden con la misma `saltosDeLaCita`, que llama a `textoConSaltos` por cada documento de verso donde el texto se localiza; tras correr la orden, el build pasa; una Cita que ya tiene sus saltos ni se reescribe ni rompe.
- Primero se decide todo, después se escribe; si una escritura falla se restituye el contenido original de lo ya escrito en esa pasada y se sale con 1: no queda nada escrito. Con `--seco`, el mismo parte y nada escrito.
- Códigos: 2 por la forma (bandera desconocida o repetida —`--seco`, `--corpus`, `--restituir-saltos`—, `--restituir-saltos` junto a `--restituir-traduccion`, `--retirar` o `--texto`); 1 si un slug nombrado no es de publicada ni de candidata, o la Cita nombrada no tiene documento, si el Corpus no se deja leer o si falla una escritura; 0 en lo demás, también si una nombrada no es de verso.
- El parte separa publicadas y candidatas y da: restituidas (con cuántos documentos y su forma), ya restituidas, conservan por motivo, conflictos con slug y documentos; cuántas Páginas de Cita y cuántos listados (por familia) cambian de fecha por la relación de AD-27, y recuerda `npx tsx tools/avisar.ts --ensayo --desde <A> --hasta <B>`.

**Block If:**
- El `--seco` sobre el Corpus real da conflictos de colapso (`colapsarEspacios` distinto) en alguna publicada: contradiría NFR-12 en el escritor de la 29.1; anotar las cifras y bloquear.
- La regla 4 hace fallar fixtures de pruebas ajenas a la épica de una forma que solo se arregla cambiando lo que esas pruebas afirman (no basta con dar sus saltos a la Cita del fixture o cambiar su documento).

**Never:**
- Correr la orden sin `--seco` sobre el Corpus real de `W` (ni sobre el de la principal): es acto de Héctor/orquestador, en commit propio de `corpus/`. Tampoco «arreglar» el build en rojo sobre el Corpus real escribiendo en `corpus/`.
- Un segundo escritor del `texto`, un segundo localizador, ni que otro módulo interprete un salto de documento.
- Pintar el verso (29.3), tocar `src/lib/tramos.ts`, la Tarjeta Social, `vocabulario.ts` o `superficies.ts`.
- Reescribir el `.md` entero con `escribirCita` (cambiaría bytes fuera de `texto` en un fichero escrito a mano).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Verso | `jose-marti-yo-vengo…` en una línea + *Versos sencillos* I (`verso`) | `"Yo vengo de todas partes,\nY hacia todas partes voy:\nArte soy entre las artes,\nEn los montes, monte soy."`; parte: restituida | — |
| Verso espaciado | Cita de dos versos + documento `verso-espaciado` | un `\n` entre los dos | — |
| Ya restituida | segunda pasada | nada escrito; «ya restituida»; «No se ha escrito nada» | — |
| Sin documento | Cita del censo / sin `fuente` u `obra` / sin documentos | conserva; motivo «sin documento» | con slug nombrado: 1, nada escrito |
| No se localiza | candidata con documento donde su texto no aparece | conserva; motivo «no se localiza en su documento» | — |
| Prosa | documento `prosa-por-lineas` / `prosa-ajustada` / `indeterminada` | conserva; motivo «documento en prosa» por forma (la del primer documento donde se localiza) | con slug nombrado: 0 y el parte dice por qué |
| Sin saltos en el tramo | verso, tramo dentro de una línea | conserva; motivo «documento sin saltos en su tramo» | — |
| Conflicto | dos documentos de verso que dan textos distintos | no se toca; listada con los dos documentos; el build avisa y no rompe | — |
| Colapso distinto / sin línea `texto:` de `aYaml` | fichero raro | no se toca; conflicto con motivo | — |
| Slug inexistente | `--restituir-saltos no-existe` | nada escrito | 1 |
| Forma | `--seco --seco`, `--restituir-saltos --restituir-traduccion`, `--frobnicar` | nada escrito | 2 |
| Escritura falla | segunda de dos escrituras falla | la primera se restituye a su contenido original | 1, con lo que pasó |

</intent-contract>

## Code Map

- `tools/lib/lineas.ts:250` `textoConSaltos`, `:296` `DocumentoCandidato`, `:307` `documentoParaLosSaltos`, `esFormaDeVerso`, `formaDeLasLineas` — aquí entra `saltosDeLaCita(texto, candidatos: readonly { nombre; cuerpo; forma }[])` (la forma la da quien llama, para que el cotejo use su memo `formaDe`). Resultado discriminado: `sin-documento` (lista vacía), `no-se-localiza`, `prosa` (con `forma` del primer localizado), `sin-saltos` (`documento`), `conflicto` (`documentos`: los de verso localizados, cuando sus `textoConSaltos(…).texto` difieren), `saltos` (`texto`, `documento`, `forma`; el primero de verso en orden). Una sola función de decisión; `documentoParaLosSaltos` sigue para el alta/documentar.
- `tools/lib/cotejo.ts:544` `cotejar`: el bucle por Cita termina en `cotejadas += 1` (`:750`); la regla del salto actual en `:742`; `formaDe` memoizada en `:574`; `legibles`/`donde` en `:722-737`. La regla 4 va tras la regla del salto y antes de `cotejadas += 1`: `saltosDeLaCita(cita.texto, legibles con forma)`; `saltos` con `texto !== cita.texto` → pendiente de restituir; `conflicto` → aviso. `ResultadoDeCotejo` (`:529`) gana `avisos: string[]`. Cuidado de coste: hoy la forma solo se calcula para Citas con salto; ahora para todo documento localizado de toda Cita (memo por nombre, ≤ 1.422).
- `integraciones/cotejo.ts:72-148` — `cotejarElCorpus` y `astro:build:start`: `logger.warn` de cada aviso (también en `astro:server:setup`).
- `tools/lib/documentacion.ts:1112` `restituirTraducciones` — patrón a seguir (leer publicadas y `_revision` con `leerCitas`, decidir todo, escribir, parte); `restituirSaltos(rutas, { slugs, seco })` nuevo, con `leerDocumentosParaElCotejo` (`tools/lib/corpus.ts:1076`, la misma lectura que el build: cuerpos + `lineas:`) y `documentosDeCita` (`tools/lib/cotejo.ts:353`). Censo: `leerCensoDeCotejo`. Memoizar `formaDeLasLineas` por documento. Con 288.594 candidatas en el `_revision` del worktree, `documentosDeCita` (lineal en documentos) por Cita cuesta: indexar o medir; la pasada real va por `correr.sh` si pasa de 8 min.
- `tools/documentar.ts:66-88` — argumentos: añadir `--restituir-saltos` y `--seco` a `solas`, las repeticiones (no las detecta `motivosDeArgumentosNoReconocidos` de `tools/lib/cli.ts:56`), la incompatibilidad con las demás subórdenes y el `USO`. Los posicionales con `--restituir-saltos` son slugs.
- Fechas: `relacionDeSuperficies` (`tools/lib/cambios.ts:424`; `texto` está en `CAMPOS_DE_CITA`, `:218`), `rutasAvisadasPor` (`tools/lib/avisar.ts:81`, cambios `{ fichero, antes, despues }` con el frontmatter analizado) y `corpusParaFechar` (`integraciones/historial.ts:430`, que hoy lee `join(raiz, 'corpus')`: añadir una opción para pasar la raíz del Corpus y respetar `--corpus`). `tools/avisar.ts:131` ya lo hace así (`conRutas`, rutas relativas); la familia de cada ruta sale de `relacion.get(ruta).familia`.
- `tools/lib/corpus.ts:802` `aYaml`/`escalar` (`JSON.stringify`) — la línea `texto:` que se sustituye; `separarFrontmatter` (`:787`).
- Pruebas: `tests/unit/documentar-cli.test.ts:415` (patrón `--restituir-traduccion`, ayudas `enDisco`, `correr`, `leerCorpus`, `construir`); `tests/unit/cotejo-build.test.ts:102` (la puerta de la 29.1 en el build); `tests/unit/cotejo.test.ts` (puro); `tests/unit/lineas.test.ts:290-330` (guarda de dueños: añadir `saltosDeLaCita` a las definiciones de `tools/lib/lineas.ts`; la lista de importadores no cambia; ningún literal de forma fuera de `lineas.ts` —el parte agrupa por `FORMAS_DE_LINEAS`—); fixtures de verso en `tests/unit/ayuda/lineas/`.
- **Riesgo de fixtures**: toda prueba que construya con un documento clasificado `verso`/`verso-espaciado` y una Cita en una línea romperá por la regla 4 (p. ej. las de la 29.1 en `cotejo-build`, `documentar-cli`, `alta`, `extraer-cli`). `documentosDeFuenteDe` de `tests/unit/ayuda/construir.ts:360` compone documentos desde el texto (una línea, `indeterminada`), así que el grueso no se mueve; el `npm test` entero lo dirá.

## Tasks & Acceptance

**Execution:**
- `tools/lib/lineas.ts` -- `saltosDeLaCita` y su tipo de resultado -- la decisión única que comparten orden y puerta.
- `tools/lib/cotejo.ts` -- regla 4 y `avisos`: por cada Cita restituible, un fallo con su fichero y el documento; con una, la orden `npm run documentar -- --restituir-saltos <slug>` en su fallo; con varias, cada fallo remite al final y un fallo más (ruta `corpus/citas/`) da una sola orden con todos los slugs, en el orden de las Citas; el conflicto, aviso con los dos documentos -- la puerta del build (AD-29, 29.2).
- `integraciones/cotejo.ts` -- registrar los avisos -- que el conflicto se vea sin romper.
- `tools/lib/documentacion.ts` -- `restituirSaltos(rutas, { slugs?, seco })`: decide con `saltosDeLaCita`, comprueba colapso y la línea `texto:`, escribe solo esa línea (con vuelta atrás en fallo), compone el parte (incluidas las fechas) -- la orden.
- `integraciones/historial.ts` -- opción de raíz del Corpus en `corpusParaFechar` -- que el recuento de fechas respete `--corpus`.
- `tools/documentar.ts` -- la suborden, sus códigos y el `USO` -- interruptor fino.
- `tests/unit/documentar-cli.test.ts` -- un `describe('Historia 29.2 — --restituir-saltos')` con la matriz entera (verso, verso espaciado con los fixtures de `ayuda/lineas/`, cada motivo, conflicto, slug inexistente y sin documento → 1, forma → 2, idempotencia, `--seco`, escritura que falla —un fichero de solo lectura— con vuelta atrás), y que el fichero restituido difiere del original solo en la línea `texto:` y colapsa a lo mismo; y que el Corpus restituido construye (`construir`) -- AC de la épica.
- `tests/unit/cotejo-build.test.ts` -- Cita de documento `verso` sin saltos (rompe, mensaje con `--restituir-saltos <slug>`), la misma con saltos (pasa), conflicto entre dos documentos (avisa y pasa) -- AC de la épica.
- `tests/unit/cotejo.test.ts` -- puro: dos Citas sin saltos → una sola orden con los dos slugs; conflicto en `avisos` y no en `fallos`; Cita en prosa, sin saltos en su tramo y ya restituida no fallan -- la regla 4.
- `tests/unit/lineas.test.ts` -- `saltosDeLaCita` con cada resultado; guarda de dueños -- dueño único.
- Fixtures de otras pruebas que rompan por la regla 4 -- darles los saltos o un documento que no sea de verso, sin cambiar lo que afirman -- la suite en verde.
- `AGENTS.md` § Documentar una Cita ya publicada -- `--restituir-saltos`: qué conserva cada Cita y por qué, que la corre Héctor sin `--seco` en commit propio de `corpus/` y se repite tras cada puesta al día con la principal, y que el build rompe con la orden exacta ante una Cita de documento de verso sin sus saltos -- AC de la épica.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- solo la línea de la 29.2: comentario a mano de que desde el commit de la historia el build de la rama sobre el Corpus real está en rojo a propósito hasta el commit de restitución, y que la restitución real es acto de Héctor/orquestador -- AC de la épica.
- Este spec -- rellenar «Parte en seco sobre el Corpus real» y «Estado del árbol al cerrar».

**Acceptance Criteria:**
- Given el Corpus real de `W`, when se corre `npm run documentar -- --restituir-saltos --seco`, then sale con 0, `git status` no cambia, y el spec anota el parte: publicadas que ganarían saltos, de cuántos documentos y por forma, cuántas conservan por cada motivo, conflictos con slug, lo mismo para candidatas, cuántas superficies cambian de fecha y el tiempo que tardó.
- Given una copia desechable (`git worktree add --detach` bajo `/Users/hec/brainlySabiduria/.claude/v9-ralph/tmp-wt/`, con `node_modules` enlazado) del commit de implementación, when se corre allí la orden **sin** `--seco` y luego `npm run build`, then el build pasa, una segunda pasada no escribe nada, `git diff` de la copia solo toca líneas `texto:` de `corpus/citas/`, y la copia se borra al terminar; y en `W`, `npm run build` sobre el Corpus real rompe solo por la regla 4, con tantas Citas como el `--seco` restituiría y una sola orden.
- Given `npx astro check` y `npm test` entero, when corren tras la historia, then los dos en verde (las pruebas no usan el Corpus real).
- Given el build, when se mide antes (`baseline_revision`) y después sobre la copia restituida, then el spec anota los dos tiempos; la regla 4 no puede añadir más de unos segundos.

## Design Notes

**Estado del árbol (elección exigida por la orquestación):** la puerta entra **activa** en el commit de la historia, como manda la épica («desde el commit que la trae, el build de la rama sobre el Corpus real está en rojo hasta el commit de restitución de Héctor; es a propósito»). No se esconde tras una bandera ni se aplaza: escalonarla dejaría pasar en verde las Citas sembradas en la principal tras cada puesta al día, que es justo lo que la regla existe para atrapar. `npm test` queda en verde (sus Corpus son de prueba; el CI solo corre sobre `main`, y la rama no se empuja). Lo que queda en rojo es `npm run build` y `npm run test:e2e` de la rama sobre el Corpus real, hasta que la sesión principal del orquestador corra la orden sin `--seco` en su commit propio de `corpus/`. La 29.3 no se verifica en e2e hasta entonces.

**Por qué la línea y no el fichero:** `escribirCita` rehace el frontmatter entero; una Cita escrita a mano con otra disposición cambiaría en bytes que no son `texto`. Sustituir la línea exacta de `aYaml` garantiza la AC «ningún otro campo ni el orden de las claves» por construcción, y la comprobación del planificador (cero ficheros sin esa línea) dice que no deja a nadie fuera hoy.

**El conflicto** no es «dos documentos de verso», sino «dos documentos de verso donde se localiza cuyos `textoConSaltos` difieren» —también si uno da saltos y el otro ninguno—. Ni la orden la toca ni la puerta rompe por ella.

## Verification

**Commands:**
- `npx vitest run tests/unit/lineas.test.ts`, `tests/unit/cotejo.test.ts`, `tests/unit/cotejo-build.test.ts`, `tests/unit/documentar-cli.test.ts` -- en verde, uno a uno.
- `npx astro check` -- 0 errores.
- `npm run documentar -- --restituir-saltos --seco` en `W` (por `correr.sh` si pasa de 8 min) -- 0, `git status` igual.
- La copia restituida: orden sin `--seco`, segunda pasada, `npm run build` (por `correr.sh`) -- verde; `npm run build` en `W` -- rojo solo por la regla 4.
- `npm test` entero por `correr.sh` -- en verde.

## Parte en seco sobre el Corpus real

`npm run documentar -- --restituir-saltos --seco` en `W`, sobre el Corpus real (registro:
`logs/s-29/impl-29.2-seco.log`). Sale con 0; nada escrito en `corpus/` (`git status corpus` sin
cambios y ningún fichero de `corpus/citas` ni `corpus/_revision` más nuevo que el código). Tardó
99,8 s (100,6 s de reloj, 2,9 GB de memoria residente: lee las 288.594 candidatas de `_revision/`).

- **Publicadas que ganarían saltos: 75**, de 26 documentos (`verso`: 65; `verso-espaciado`: 10) —
  la misma cifra que la 29.1—. Ya restituidas: 0.
- Publicadas que conservan el texto en una línea: 4.349 — sin documento: 21 (el censo); documento
  en prosa: 4.324 (`prosa-por-lineas` 1.592, `prosa-ajustada` 1.454, `indeterminada` 1.278);
  documento sin saltos en su tramo: 4; no se localiza en su documento: 0.
- **Conflictos en publicadas: 0** (ni entre documentos de verso ni de colapso ni de línea `texto:`):
  no se da la condición de bloqueo.
- Candidatas: ganarían saltos 1.259, de 45 documentos (`verso` 1.252, `verso-espaciado` 7); conservan
  287.335 (sin documento 5, no se localiza 8, prosa 286.422 —`prosa-por-lineas` 32.411,
  `prosa-ajustada` 214.479, `indeterminada` 39.532—, sin saltos en su tramo 900); conflictos 0.
- **Cambian de fecha 75 Páginas de Cita y 59 listados** (Autor 11, Colección 8, Obra 24, Tema 16),
  por `rutasAvisadasPor` sobre la relación de AD-27.

**La copia restituida** (`git worktree add --detach` de `8fdb1c998e` bajo `tmp-wt/`, con
`node_modules` enlazado; registro `logs/s-29/impl-29.2-copia.log`, ya borrada): la orden sin
`--seco` escribió 1.334 Citas (75 publicadas y 1.259 candidatas: en esta rama `corpus/_revision/`
**sí está versionado**, 288.595 ficheros), con 0; la segunda pasada, «Ya restituidas, sin cambios:
75» y 1.259, «No se ha escrito nada», con 0. `git diff` de la copia: 1.334 ficheros, una línea
cambiada por fichero, todas `texto: "…"` (75 en `corpus/citas/`, 1.259 en `corpus/_revision/`).
`npm run build` sobre la copia restituida: verde (4.403 Citas cotejadas).

**Tiempos del build.** Medidos en la misma copia, uno tras otro y con `npm test` de esta rama y de
otras tres corriendo a la vez (por eso tan dispares): después 138 s, antes (`baseline_revision`)
233 s — el ruido del equipo cargado tapa la diferencia. Medido aislado, `cotejar` sobre el Corpus
real: 12,1–14,2 s antes y 14,1–14,3 s después (tres pasadas de cada uno): la regla 4 añade unos
2 s.

**En `W`**, `npm run build` sobre el Corpus real rompe, con 1, en el cotejo: 76 incumplimientos, los
76 de la regla 4 (75 Citas y el fallo final de `corpus/citas/`), con una sola orden y 75 slugs.

## Estado del árbol al cerrar

La puerta entra **activa** en `8fdb1c998e3796a5e21d1d0e9bd13ec876c6efa5`. Desde ese commit,
`npm run build` (y `npm run test:e2e`) de `v9/epica-29` sobre el Corpus real están en rojo a
propósito: 75 Citas publicadas de documento de verso sin sus saltos. `npm test` sigue en verde (sus
Corpus son de prueba). Lo cierra la sesión principal del orquestador (o Héctor), en un commit propio
de `corpus/`, desde `W`:

```
cd /Users/hec/brainlySabiduria/.claude/worktrees/v9-29
npm run documentar -- --restituir-saltos --seco     # comprobar: 75 publicadas, 0 conflictos
npm run documentar -- --restituir-saltos            # escribe 75 publicadas y 1.259 candidatas
npm run documentar -- --restituir-saltos --seco     # segunda pasada: «Ya restituidas, sin cambios: 75»
git add -u corpus/citas corpus/_revision            # solo líneas «texto:»; _revision/ está versionado en esta rama
git commit -m "corpus: restituye los saltos de verso de 75 Citas publicadas desde su documento (29.2)"
npm run build                                       # verde
```

Y se repite (`--seco` primero) tras cada puesta al día de la rama con la principal.

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

(Las capas externas no traen hallazgos en esta pasada: el orquestador de v9-ralph las corre aparte.)

### 2026-11-08 — Review pass (primera revisión externa: blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor)
- intent_gap: 0
- bad_spec: 0
- patch: 12 (high 0, medium 3, low 9)
- defer: 0
- reject: 18 (medium 2, low 16)
- addressed_findings:
  - `[medium]` `[patch]` El recuento de fechas (`corpusParaFechar`, relación de AD-27) corría tras escribir y sin guarda: un fallo salía con 1 con todo escrito. Ahora se cuenta **antes** de escribir (solo cambia `texto`, que no mueve aristas de la relación) y un fallo sale con 1 «No se ha escrito nada».
  - `[medium]` `[patch]` La vuelta atrás no cubría el fichero cuya escritura falló a medias (truncado por disco lleno o E/S). Ahora, si el fallo ocurre durante `writeFile`, ese fichero vuelve también a su original, y el mensaje no dice «no queda nada escrito» si algo no se pudo devolver.
  - `[medium]` `[patch]` Ninguna prueba escribía una candidata (la pasada real escribe 1.259). `documentar-cli` gana una candidata en una línea que su documento de verso restituye: se afirma su texto, que cambia una sola línea, «Candidatas de revisión: Restituidas: 1», «Ya restituidas, sin cambios: 1» en la segunda pasada y que no mueve «Cambian de fecha».
  - `[low]` `[patch]` `readFile(cita.ruta)` del bucle de decisión, sin guarda: ahora da «El Corpus no se deja leer … No se ha escrito nada.» con 1.
  - `[low]` `[patch]` Un fichero que cambia en disco entre la decisión y la escritura (checkout compartido) se pisaba con contenido rancio: ahora se comprueba antes de escribir, cuenta como escritura fallida y se deshace lo escrito sin tocarlo.
  - `[low]` `[patch]` La puerta y la orden armaban por separado los candidatos de `saltosDeLaCita`: `documentosLegibles` y `candidatosDeLosSaltos` (forma con `lineas:` declarada y colapsado, memoizados por nombre) en `tools/lib/cotejo.ts`, usados por los dos.
  - `[low]` `[patch]` La regla 4 no se probaba con una Cita que tiene solo parte de sus saltos: caso puro nuevo en `cotejo.test.ts` (primer verso partido, resto de corrido → rompe con la orden).
  - `[low]` `[patch]` El `replace` sin efecto de la prueba de la 29.1 en `cotejo.test.ts` se quita, y el comentario dice lo que la prueba hace de verdad (verso restituido contra el documento de verso; en una línea, contra el mismo declarado en prosa).
  - `[low]` `[patch]` La prueba de la vuelta atrás dependía del orden de `readdir` y no actuaba como root: ahora falla la candidata, que se escribe después de las dos publicadas (orden por lote, no por directorio), se afirman «Las 2 Citas ya escritas … han vuelto», y se salta como root.
  - `[low]` `[patch]` «Corpus ilegible → 1» sin prueba: caso nuevo con una Cita sin permiso de lectura (1, «El Corpus no se deja leer», nada escrito; se salta como root).
  - `[low]` `[patch]` El recuento de listados que cambian de fecha no se afirmaba: se fija «Cambian de fecha 2 Páginas de Cita y 1 listado (tema: 1).».
  - `[low]` `[patch]` `AGENTS.md`: la vuelta atrás incluye el fichero que falla, el fichero cambiado entretanto no se pisa, las fechas se cuentan antes de escribir, y una nombrada en prosa, sin saltos, que no se localiza o en conflicto sale con 0 y el parte dice por qué.

Rechazados, con su razón: `corpusParaFechar(rutas.raiz, { corpus: rutas.raiz })` es correcto —con `corpus` dado, `raiz` no se usa y la función no lee git, solo el disco—; la clave de `porObra` por nombre corto es exacta, porque `documentosDeCita` solo depende de `fuente.id` y la obra; los slugs que no acotan la lectura, el coste de la regla 4 (~2 s medidos) y el recolapso de `textoConSaltos` (solo documentos de verso) son coste aceptado; restringir a publicadas y el versionado de `_revision/` en esta rama no son defectos de la historia (`git add -u corpus/_revision` es la forma documentada); los avisos de conflicto fuera de la integración (las órdenes de alta y revisión cotejan una Cita para dejarla pasar o no); el estado de `sprint-status.yaml` lo escribe el cierre del bucle; las comprobaciones redundantes de argumentos y la repetición de `--corpus` (más estricto, sin pérdida); el 0 de una nombrada en conflicto o que no se localiza (la matriz manda 0 «en lo demás», ahora documentado); las suposiciones de `conLaLineaDeTexto` (comprobadas sobre todos los ficheros al planificar, y el desajuste sale como conflicto nombrando el fichero, que es lo que hay que mirar); la orden única de 75 slugs (la exige la épica); la rama «colapso distinto», inalcanzable con el escritor único; `texto` no cadena (lo rechaza el esquema antes); la forma posicional de documentar junto a `--restituir-saltos` (los posicionales son slugs, por el spec) y el contador `cotejadas` (presentación).

### 2026-11-08 — Review pass (segunda revisión externa, última ronda)
- intent_gap: 0
- bad_spec: 0
- patch: 2 (high 0, medium 1, low 1)
- defer: 1 (medium 1)
- reject: 34 (medium 3, low 31)
- addressed_findings:
  - `[medium]` `[patch]` `revisar --aprobar` publicaba tal cual una candidata en una línea de documento de verso —las del `_revision/` sin versionar de la principal, extraídas antes de la 29.1, o una extraída de un documento en prosa de una obra que también tiene uno de verso—, y la regla 4 rompía el build siguiente. Ahora `aprobar` (`tools/lib/revision.ts`) decide con `saltosDeLaCita` sobre `candidatosDeLosSaltos` —la misma decisión que la regla 4— y publica con sus saltos reescribiendo solo la línea `texto:` (`conLaLineaDeTexto`, que pasa a `tools/lib/corpus.ts` para compartirla con la restitución); si esa línea no es la de `aYaml`, no la publica y da la orden `documentar --restituir-saltos <slug>`; un conflicto se publica como está, como la regla 4 solo avisa. `revisar` lo dice en el parte («↵ … se publicó con los saltos de verso de …»), y AGENTS.md cambia la frase que pedía regenerar antes. Prueba nueva en `tests/unit/revision.test.ts` (en una línea → publicada en verso cambiando solo `texto:`; ya en verso → tal cual), que sin el arreglo falla; la guarda de importadores de `lineas.test.ts` declara `tools/lib/revision.ts`.
  - `[low]` `[patch]` Ninguna prueba hacía fallar solo el recuento de fechas: caso nuevo en `documentar-cli.test.ts` con la ficha de Autor ilegible (citas y documentos legibles) → 1, «No se pueden contar las superficies», «No se ha escrito nada.» e instantánea igual.

Diferido: el versionado de `corpus/_revision/` en la rama (frontmatter). Rechazados, con su razón: las dos funciones de decisión (`documentoParaLosSaltos` y `saltosDeLaCita`) coinciden fuera del conflicto —las dos toman el primer documento de verso donde se localiza, con el mismo escritor— y en el conflicto la regla 4 solo avisa, así que no hay build rojo; quién corre la restitución y la escritura atómica (temporal + `rename`) los aceptó Héctor por delegación; el estado de `sprint-status.yaml` y del épico lo escribe el cierre del bucle; la entrada vacía del log es histórica y no se reescribe; `corpusParaFechar(rutas.raiz, { corpus })`, el `texto` no cadena (lo rechaza el esquema), el slug en los dos sitios (el build ya rompe por duplicado), la cuenta del mensaje de vuelta atrás, la guarda de repetición más estricta, el posicional con forma de ruta, el coste de memoria y de la regla 4, la ruta de directorio del fallo agregado, los conflictos de candidatas en el build, el ruido de ayudas de prueba, los estilos YAML a mano (comprobado al planificar: ningún fichero) y la rama «colapso distinto» inalcanzable; las lagunas de prueba de «ha cambiado desde que se decidió» y del fallo a medias de `writeFile` (exigen una costura inyectable en la orden para una ventana que Héctor aceptó al delegar la escritura atómica) y de las formas `prosa-por-lineas`/`prosa-ajustada` (misma rama de código que `indeterminada`).

## Auto Run Result

Status: done
Blocking condition: ninguna. El build de la rama sobre el Corpus real queda en rojo a propósito
(regla 4, 75 Citas) hasta el commit de restitución del orquestador o de Héctor; la orden exacta
está en «Estado del árbol al cerrar».

**Resumen.** `documentar --restituir-saltos [<slug>...] [--seco]` restituye los saltos de verso de
las Citas publicadas y, aparte, de las candidatas, desde su documento de verso: decide con
`saltosDeLaCita` (nueva, la única decisión, en `tools/lib/lineas.ts`, que llama a `textoConSaltos`
por cada documento de verso donde el texto se localiza), reescribe solo la línea `texto:` cuando lo
nuevo colapsa a lo publicado, decide todo antes de escribir y deshace lo escrito si una escritura
falla. La regla 4 del cotejo usa la misma función: rompe ante una Cita de documento de verso sin sus
saltos con la orden exacta (una sola al final si son varias) y avisa del conflicto entre dos
documentos de verso. Entra activa.

**Ficheros.**
- `tools/lib/lineas.ts` — `saltosDeLaCita`, `SaltosDeLaCita` y `DocumentoConForma` (con colapsado opcional memoizable).
- `tools/lib/cotejo.ts` — regla 4, `avisos` en `ResultadoDeCotejo`, colapsado memoizado por documento.
- `integraciones/cotejo.ts` — registra los avisos en build y en dev.
- `integraciones/historial.ts` — `corpusParaFechar` admite la raíz del Corpus (`corpus`).
- `tools/lib/documentacion.ts` — `restituirSaltos`: lectura del Corpus como el build, decisión, línea `texto:`, vuelta atrás, parte con motivos, conflictos y fechas (AD-27).
- `tools/documentar.ts` — la suborden, `--seco`, repeticiones e incompatibilidades (2), `USO`.
- `tests/unit/lineas.test.ts`, `cotejo.test.ts`, `cotejo-build.test.ts`, `documentar-cli.test.ts` — la matriz entera, la regla 4 pura y en el build, y la guarda de dueños.
- `AGENTS.md` — la orden, la regla 4 y quién corre la restitución.
- `sprint-status.yaml` — solo la línea de la 29.2 (`review`, con el comentario del rojo a propósito).

**Hallazgos de revisión** (primera revisión externa, cinco capas): 12 parches, 0 diferidos, 18
rechazados (el detalle, en el Review Triage Log). Recomendación de revisión de seguimiento:
`true` — parches de esta pasada: high 0, medium 3, low 9; puntuación 3 × 3 + 9 = 18 ≥ 5.

**Ficheros de la pasada de revisión.**
- `tools/lib/cotejo.ts` — `documentosLegibles` y `candidatosDeLosSaltos`, los candidatos de `saltosDeLaCita` que comparten la regla 4 y la orden.
- `tools/lib/documentacion.ts` — `restituirSaltos`: los candidatos compartidos, la lectura de cada Cita con guarda, las fechas contadas antes de escribir y con guarda, la comprobación de que el fichero no cambió y la vuelta atrás que incluye el fichero que falla.
- `tests/unit/documentar-cli.test.ts` — la candidata que se restituye, el recuento de listados, la vuelta atrás con orden determinista y el Corpus ilegible.
- `tests/unit/cotejo.test.ts` — la regla 4 ante saltos parciales, sin el `replace` sin efecto de la 29.1.
- `AGENTS.md` — la vuelta atrás, las fechas y los códigos de una nombrada que se queda como está.

**Verificación de la pasada de revisión.** `npx vitest run` de `lineas` y `cotejo` (116),
`documentar-cli` (32) y `cotejo-build` (27): en verde. `npx astro check`: 0 errores, 0 avisos.
`npm run documentar -- --restituir-saltos --seco` en `W` sobre el Corpus real
(`logs/s-29/triage-29.2-1-seco.log`): 0, las mismas cifras (75 publicadas de 26 documentos, 65 +
10; 1.259 candidatas; 0 conflictos; 75 Páginas de Cita y 59 listados), 100,6 s, nada escrito.
`npm test` entero (`logs/s-29/triage-29.2-1-npm-test.log`): 157 ficheros, 7.304 pruebas, en verde
(1.494 s, con otras suites de otros worktrees a la vez).

**Verificación de la implementación.** `npx vitest run` de `lineas` (46), `cotejo` (69), `cotejo-build` (27) y
`documentar-cli` (31): en verde, uno a uno. `npx astro check`: 0 errores, 0 avisos.
`npm run documentar -- --restituir-saltos --seco` en `W`: 0, nada escrito (parte arriba).
Copia restituida: orden 0 (1.334 escritas), segunda pasada 0 sin escribir, diff solo líneas
`texto:`, `npm run build` verde. `npm run build` en `W`: rojo solo por la regla 4 (76 = 75 + 1).
`npm test` entero (`logs/s-29/impl-29.2-npm-test.log`): 157 ficheros, 7.302 pruebas, en verde
(1.575 s, con otras tres suites de otros worktrees corriendo a la vez).

**Riesgos residuales.**
- En esta rama `corpus/_revision/` está versionado (288.595 ficheros), contra la política de
  `AGENTS.md`: el commit de restitución lleva también 1.259 candidatas (solo su línea `texto:`).
- La orden lee las 288.594 candidatas: ~100 s y ~2,9 GB de memoria residente.
- Lo heredado de la 29.1: `localizar` toma la primera aparición, así que un estribillo repetido
  puede quedarse sin saltos (conservador).
- La fila «colapso distinto» de la matriz no se puede provocar con el escritor único (colapsa por
  construcción); la comprobación queda como cinturón, sin prueba que la dispare.

**Segunda revisión externa (última ronda).** 2 parches, 1 diferido, 34 rechazados (detalle en el
Review Triage Log). Recomendación de revisión de seguimiento: `false` — parches de esta pasada:
high 0, medium 1, low 1; puntuación 3 × 1 + 1 = 4 < 5.

**Ficheros de la segunda pasada.**
- `tools/lib/revision.ts` — `aprobar` publica con sus saltos (`saltosDeLaCita`) la candidata que llega en una línea, o no la publica y da la orden si su línea `texto:` no es la de `aYaml`; `conSaltos` en el resultado.
- `tools/revisar.ts` — el parte nombra las publicadas con saltos y su documento.
- `tools/lib/corpus.ts` — `conLaLineaDeTexto`, movida desde `tools/lib/documentacion.ts`, que la importa.
- `tests/unit/revision.test.ts` — aprobar en una línea → en verso, solo cambia `texto:`; ya en verso → tal cual.
- `tests/unit/documentar-cli.test.ts` — el recuento de fechas que falla solo: 1 y nada escrito.
- `tests/unit/lineas.test.ts` — `tools/lib/revision.ts` en la lista de importadores de `lineas.ts`.
- `AGENTS.md` — aprobar ya no publica en una línea lo que su documento de verso parte.

**Verificación de la segunda pasada.** `npx vitest run` de `revision` (36), `revisar-cli`, `lineas`
y `cotejo`: en verde; el caso nuevo de `documentar-cli`: en verde. `npx astro check`: 0 errores,
0 avisos. `npm test` entero (`logs/s-29/triage-29.2-2-npm-test.log`): 160 ficheros, 7.362 pruebas,
en verde (1.345 s), con la 29.3 encima.

**Riesgo residual nuevo.** Aprobar lee ahora todo `corpus/fuentes/` una vez por pasada cuando
alguna candidata declara Fuente (unos 2–3 s, como el alta).
