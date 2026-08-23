---
title: 'Extraer coteja el Autor contra lo que el documento declara'
type: 'bugfix'
created: '2026-08-23'
status: 'done'
baseline_commit: '270d3bb95e5e024136111a9155c4d4ff3e733568'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/deferred-work.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `tools/extraer.ts` se fía de la bandera `--autor` y no la coteja con nada. Pasarle `--autor juan-montalvo` a «El sable» —que declara `|autor=Manuel González Prada` en la declaración que el propio documento conserva— produjo 32 candidatas atribuidas al Autor equivocado, y el cotejo literal de la 11.2 las habría dado por buenas porque el texto **está** en ese documento. Un `--autor` que no nombra a ningún Autor del Corpus tampoco se rechaza: sale con código 0.

**Approach:** Derivar también el autor de la declaración literal, con los mismos lectores por Fuente de los que ya salen la obra y el año, y negarse a extraer cuando no concuerde con el `--autor` recibido. La puerta no inventa nada: compara lo que la Fuente declara con lo que el Corpus declara.

## Boundaries & Constraints

**Always:**
- El autor se deriva de la **declaración literal** que el documento conserva, nunca de la cabecera de `recuperar`, que es registro de auditoría (misma regla que obra y año).
- La comparación va contra el `nombre` del Autor en `corpus/autores/`, que es su único dueño.
- Un `--autor` que no existe en el Corpus se rechaza antes de leer el documento.
- Los rechazos salen con **código 1** —lo que la invocación dice—, no 2, que es la forma de la invocación.
- Todo mensaje de rechazo pone delante las dos partes: qué declara el documento y qué declara el Corpus.

**Ask First:**
- Cualquier bandera que permita saltarse el cotejo. Hoy no hay caso real —ningún documento del Corpus tiene dos Autores— y abrirla reabre el agujero.
- Endurecer la regla más allá de lo que los 13 documentos versionados admiten hoy.

**Never:**
- Tocar la derivación de obra, año o página, ni la puerta que comprueba que el documento lo produjo `recuperar`.
- Rechazar cuando el documento **no declara** autor: un metadato que falta no es un fallo, igual que con el año.
- Deducir el Autor por el documento cuando falte `--autor`: la orden sigue exigiéndolo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Concuerdan | `--autor juan-montalvo` sobre un documento que declara «Juan Montalvo» | Extrae como hoy | N/A |
| La Fuente añade apellido o tratamiento | «Miguel de Cervantes Saavedra», «Santa Teresa de Jesús», `[[Autor:Antonio Machado]]` | Extrae: los tokens del nombre del Corpus están todos | N/A |
| No concuerdan | `--autor juan-montalvo` sobre «El sable» (González Prada) | Se niega, nombra las dos partes, no escribe nada | Código 1 |
| Autor inexistente | `--autor autor-que-no-existe` | Se niega antes de leer el documento | Código 1 |
| El documento no declara autor | Documento sin `|autor=` ni `Author:` | Extrae, y lo dice en el informe | N/A |

</frozen-after-approval>

## Code Map

- `tools/lib/documento.ts:581` -- `interface LectorDeFuente`; aquí entra `autor(declaracion)`, junto a `obra` y `pagina`.
- `tools/lib/documento.ts:682` -- `LECTORES_POR_FUENTE`: implementar para `wikisource-es` y `gutenberg`. Formas reales vistas en los 13 documentos: `Juan Montalvo`, `[[José Martí]]`, `[[Autor:Antonio Machado`, `[[Santa Teresa de Jesús`, y `Author: Miguel de Cervantes Saavedra`.
- `tools/lib/documento.ts:864` -- `derivarDeLaDeclaracion`: devolver también `autor`, con la misma forma opcional que `obra`/`pagina`/`año`.
- `tools/extraer.ts:60-65` -- donde se leen `--autor` y la ruta; la puerta va aquí, antes de `extraerCandidatas`.
- `tools/extraer.ts:183` -- `extraerCandidatas(documento, autor)`, que no debe llegar a ejecutarse si el cotejo falla.
- `tools/lib/corpus.ts` -- `rutasDelCorpus` y los lectores del Corpus; de aquí sale el `nombre` del Autor.
- `corpus/autores/*.yml` -- cada uno declara `nombre`, que es el lado del Corpus en la comparación.
- `tools/pieza.ts:23` -- el convenio de códigos de salida: 2 para la forma de la invocación, 1 para lo que dice.
- `src/lib/normalizar.ts` -- normalización ya existente del proyecto; comprobar si sirve antes de escribir otra.

## Tasks & Acceptance

**Execution:**
- [x] `tools/lib/documento.ts` -- añadir `autor(declaracion)` a `LectorDeFuente` e implementarlo en las dos Fuentes, retirando `[[`, `]]` y el prefijo `Autor:` -- el autor sale de donde ya salen la obra y el año, y no de la cabecera de auditoría.
- [x] `tools/lib/documento.ts` -- `derivarDeLaDeclaracion` devuelve `autor` cuando lo haya -- misma forma opcional que el resto, para que un metadato ausente siga sin ser un fallo.
- [x] `tools/lib/documento.ts` -- función pura que decide si un nombre declarado y un nombre del Corpus son el mismo Autor: normaliza acentos y caja, descarta partículas y tratamientos, y exige que **todos** los tokens del nombre del Corpus estén en el declarado -- ver Design Notes para por qué la dirección importa.
- [x] `tools/extraer.ts` -- rechazar con código 1 el `--autor` que no existe en `corpus/autores/`, antes de leer el documento -- hoy produce candidatas con un Autor inventado y sale con 0.
- [x] `tools/extraer.ts` -- rechazar con código 1 cuando el documento declare un autor que no concuerda, nombrando las dos partes -- es la puerta de esta historia.
- [x] `tools/extraer.ts` -- cuando el documento no declare autor, extraer e informarlo en la salida -- la ausencia no es fallo, pero conviene que se vea que la puerta no actuó.
- [x] `tests/unit/` -- cubrir la matriz entera, incluida la fila de la excepción real: «El sable» con `--autor juan-montalvo` se rechaza, y con `manuel-gonzalez-prada` se acepta.
- [x] `tests/unit/` -- prueba que recorre **todos** los documentos de `corpus/fuentes/` y exige que el autor derivado concuerde con el del Corpus de alguna Cita que salga de ese documento -- convierte los 13 casos reales en la red que impide endurecer la regla de más.
- [x] `AGENTS.md` -- en la sección de la sesión de sembrado, anotar que `extraer` ya no acepta un `--autor` que el documento contradiga.

**Acceptance Criteria:**
- Given `corpus/fuentes/wikisource-es--el-sable.txt`, when se extrae con `--autor juan-montalvo`, then sale con código 1, el mensaje nombra «Manuel González Prada» y «Juan Montalvo», y `corpus/_revision/` no cambia.
- Given el mismo documento, when se extrae con `--autor manuel-gonzalez-prada`, then extrae como antes de este cambio.
- Given los 13 documentos versionados hoy, when se derivan sus autores, then ninguno se rechaza contra el Autor con el que ya se sembró.
- Given `npm test`, `npm run check` y `npm run build`, then pasan sin regresión sobre las 1768 pruebas de la línea base.

## Spec Change Log

- **2026-08-23 — la puerta se extendió a `documentar`, por decisión de Héctor.**
  Disparador: la capa de revisión demostró, ejecutándolo, que `tools/documentar.ts` ataba una
  Cita de Montalvo al documento de González Prada con `ok: true` — y la sacaba de
  `pendientes-de-cotejo.yml` en el mismo gesto, o sea que la mal-atribuía *y* la daba por
  cotejada. Es la misma puerta en la orden hermana, y el camino por el que se documentaron las
  Citas anteriores a la v3, que son las más expuestas a estarlo mal.
  Enmienda: cotejo añadido en `tools/lib/documentacion.ts` con las mismas cuatro decisiones que
  en `extraer` —sin autor declarado documenta, ilegible se niega, varios declarados basta uno,
  ficha sin `nombre` se niega—. El lado del Corpus no sale de una bandera sino del `autor` de
  la Cita que se documenta.
  Estado malo evitado: cerrar una puerta y dejar la hermana abierta, con `documentacion.ts`
  afirmando en su cabecera que hace «las mismas comprobaciones que `extraer`».
  KEEP: el bloque `<frozen-after-approval>` **no** se reescribió, a propósito. De las tres vías
  ofrecidas, Héctor eligió cerrar la puerta sin retitular la especificación, así que su Intent,
  sus Boundaries y su matriz siguen describiendo `extraer` y es esta entrada la que dice el
  resto. KEEP también la razón de que el cotejo vaya **antes** del cotejo literal: con un
  documento de otro Autor, «tu texto no aparece» es el síntoma y no la causa, y mandaría a
  quien lo lea a tocar `--texto` cuando lo que sobra es el documento.

## Design Notes

**Por qué la dirección de la comparación es Corpus ⊆ declarado.** Medido sobre los 13 documentos versionados, la Fuente **añade** y no quita: «Miguel de Cervantes Saavedra» por «Miguel de Cervantes», «Santa Teresa de Jesús» por «Teresa de Jesús». Exigir igualdad rechazaría los dos. Exigir que los tokens del declarado estén en el del Corpus rechazaría los mismos dos, al revés. Exigir que los del **Corpus** estén en el **declarado** los admite y sigue rechazando el caso real: «Juan Montalvo» contra «Manuel González Prada» comparte cero tokens.

**Partículas y tratamientos que se descartan** antes de comparar: `de`, `del`, `la`, `las`, `los`, `el`, `y`, `san`, `santa`, `santo`, `sor`, `fray`, `don`. Sin descartar `santa`, Teresa de Jesús se rechaza; sin descartar las partículas, la comparación se vuelve sensible a cómo escribe cada Fuente el mismo nombre. `sor` se descarta aunque el Corpus lo lleve en «Sor Juana Inés de la Cruz», y por eso la regla sigue funcionando en los dos sentidos.

**Lo que esta puerta no cierra, y conviene no prometer.** No dice que la Cita sea del Autor: dice que el documento y el Corpus llaman igual a quien firma el documento. Una copla ajena citada dentro de la obra —el caso de Palma en «Predestinación»— sigue pasando, porque el documento la conserva literal y su autor declarado sigue siendo Palma. Eso es otra puerta y otra historia.

## Verification

**Commands:**
- `npx tsx tools/extraer.ts corpus/fuentes/wikisource-es--el-sable.txt --autor juan-montalvo --seco` -- expected: código 1 y mensaje con los dos nombres
- `npx tsx tools/extraer.ts corpus/fuentes/wikisource-es--el-sable.txt --autor manuel-gonzalez-prada --seco` -- expected: código 0, extrae como hoy
- `npm test` -- expected: 1768+ en verde, sin regresión
- `npm run check` -- expected: 0 errores
- `npm run build` -- expected: build limpio, 231 Citas cotejadas
