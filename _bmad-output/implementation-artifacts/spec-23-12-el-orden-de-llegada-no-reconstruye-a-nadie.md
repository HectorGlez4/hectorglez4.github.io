---
title: 'Historia 23.12 — El orden de llegada no reconstruye a nadie'
type: 'feature'
created: '2026-10-24'
status: 'done'
baseline_revision: 'a50b3e5c881d4ffa0ddc8003d09ce8da95549caf'
review_loop_iteration: 0
followup_review_recommended: true
context: []
warnings: [oversized]
deferred:
  - summary: >-
      D1 Time Travel conserva restauraciones al minuto (30 días en el plan de pago, 7 en el
      gratuito): comparar restauraciones sucesivas devuelve qué filas llegaron cuándo, y el
      barajado de la 23.2 sería reversible durante ese plazo.
    evidence: |-
      Hallazgo de blind-hunter en la revisión de la 23.12. DESPLIEGUE.md §3 dice que el orden
      de las filas no encadena los eventos de una misma persona, y eso vale para la tabla; con
      Time Travel la secuencia sigue siendo recuperable por quien tenga acceso a la cuenta.
      Es una propiedad de la plataforma anterior a esta historia y AD-13 no la menciona:
      acotarla en la espina o en DESPLIEGUE.md es de Héctor (bmad-architecture).
    location: >-
      DESPLIEGUE.md §3, viñeta de medicion/worker.ts; AD-13
    severity: low
  - summary: >-
      La rama v8/23-12-rowid-aleatorio trae debajo de la historia el commit
      df4a73417732a51ef9878f19a35e100bf4373918 (epic-23-context.md, el contexto de la Épica 23
      que compila el bucle), así que fusionada tal cual no entra «sola» en la principal.
    evidence: |-
      ac-auditor: el commit está entre la principal (62ab19f1ac29130d59aa6f10d552b02fe1f7bd7d)
      y el del spec (a50b3e5c881d4ffa0ddc8003d09ce8da95549caf). Es un artefacto de
      implementación del bucle, no código de la historia; reconstruir la rama sin él o
      aceptarlo al fusionar lo decide Héctor, que es quien fusiona.
    location: >-
      _bmad-output/implementation-artifacts/epic-23-context.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** `medicion/worker.ts` inserta sin `rowid` explícito y SQLite numera `max(rowid)+1`: el orden físico de las filas de `eventos` es el orden de llegada, y en una ruta poco visitada encadena los registros de una misma persona (vista → copiado → salida), justo lo que NFR-11 y AD-13 prohíben reconstruir. La v8 va a emitir muchos más eventos por carga, así que el cambio tiene que estar en la principal antes de la 23.3.

**Approach:** el `INSERT` del adaptador pasa a `INSERT INTO eventos (rowid, jornada, evento, ruta, origen, destino, consulta) VALUES (abs(random()), ?, ?, ?, ?, ?, ?)`, sin migración, sin columnas, sin vocabulario ni huella; dos pruebas estructurales de Vitest lo fijan (el `INSERT` lleva el `rowid` aleatorio; ningún SQL de `tools/` ordena por `rowid`), y la prueba de correspondencia de columnas existente se adapta en el mismo cambio para que la principal no quede en rojo.

## Boundaries & Constraints

**Always:** el `rowid` lo genera SQLite (`abs(random())` en el SQL), nunca JavaScript, y no viaja por `bind`: `bind` sigue recibiendo exactamente los seis campos del `Registro`, en el orden de columnas. Un `rowid` repetido (o el desbordamiento de `abs(-2^63)`) es un error de SQLite que recoge el `catch` existente: el evento se pierde y el receptor contesta 204, como con el almacén caído. Comentarios e identificadores en español. La principal queda en verde: `npx astro check` y las pruebas que leen `medicion/worker.ts` pasan.

**Block If:** adaptar la prueba de correspondencia exigiera tocar `medicion/esquema.sql`, `medicion/receptor.ts` o el vocabulario; o algún fichero de `tools/` ya ordenara por `rowid` (hoy ninguno lo nombra).

**Never:** tocar `medicion/receptor.ts`, `medicion/esquema.sql`, `medicion/wrangler.toml`, `src/`, `public/` ni el vocabulario; crear `medicion/migrations/`, huella o la orden `npm run medicion` (son de la 23.2); barajar lo ya escrito; `INSERT OR REPLACE` (pisaría otro evento) u `OR IGNORE` (saltaría el `catch`); reintentos o un código distinto de 204; `wrangler deploy`, `--remote` o cualquier escritura en el D1, el Worker o el sitio en vivo (el receptor con esta historia lo despliega Héctor en la 23.3); prueba de Playwright (no cambia `dist/`); `@cloudflare/workers-types`; `node:sqlite` en una prueba versionada (experimental, y `engines` admite Node 22.12, que lo exige con bandera); editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`; fusionar o hacer push desde la historia.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Baliza válida | `POST` con `{evento: 'copiado', ruta: '/cita/una'}` y un D1 falso que registra | `prepare` recibe un único `INSERT INTO eventos (rowid, …) VALUES (abs(random()), ?×6)`; `bind` recibe 6 valores: jornada `AAAA-MM-DD`, `'copiado'`, `'/cita/una'`, `null`, `null`, `null`; respuesta 204 sin cuerpo | — |
| `rowid` repetido | `run()` rechaza con `Error('D1_ERROR: UNIQUE constraint failed: eventos.rowid')` | `fetch` resuelve 204 sin cuerpo y no lanza | el `catch` existente |
| Sin escritura | `GET`, o cuerpo fuera del vocabulario | 204 y `prepare` no se llama | — |
| `tools/` ordena por `rowid` | texto con `ORDER BY rowid`, `order by jornada, rowid DESC`, `ORDER BY e.rowid`, `ORDER BY _rowid_`, `ORDER BY oid`, `'… ORDER BY ' + 'rowid'` | el detector lo marca y la prueba falla nombrando el fichero | — |
| `tools/` nombra `rowid` sin ordenar | `SELECT CAST(rowid AS TEXT) …`, `UPDATE eventos SET rowid = abs(random())`, `ORDER BY jornada` | el detector no lo marca | — |

</intent-contract>

## Code Map

- `medicion/worker.ts:52-69` -- el `prepare(...).bind(...).run()` dentro del `try`/`catch {}`; único `INSERT` del repositorio. Las interfaces `SentenciaD1`/`D1Database`/`Entorno` (`:28-39`) no cambian.
- `tests/unit/comparticion.test.ts:183-209` -- PELIGRO: «las columnas del INSERT del Worker son exactamente las del esquema». `/INSERT INTO eventos \(([^)]+)\)/` captura ya `rowid` (no es columna del esquema) y `/VALUES \(([^)]+)\)/` se corta en el paréntesis de `random(` (1 marcador frente a 7). Sin adaptarla, la principal queda en rojo y `publicar.yml` deja de desplegar.
- `tests/unit/receptor.test.ts:10-12,120-160` -- `sinComentarios` y las pruebas estructurales del adaptador (sin cabeceras, `status: 204`, `catch {`); siguen valiendo sin cambios y sirven de patrón.
- `tests/unit/andamiaje.test.ts:260-269` -- `ficherosDe`, recorrido recursivo de `tools/` con extensiones: patrón para el barrido.
- `medicion/esquema.sql` -- solo lectura: seis columnas, tabla con `rowid` implícito (no `WITHOUT ROWID`, sin `INTEGER PRIMARY KEY`), por eso admite `rowid` explícito.
- `tools/`, `tools/lib/` -- hoy ningún fichero nombra `rowid` ni ejecuta SQL contra D1 (`git grep -i rowid -- tools` vacío); la 23.2 añadirá `CAST(rowid AS TEXT)` y `UPDATE … SET rowid` y la 23.10 estrechará la prueba.
- `DESPLIEGUE.md:264-265` -- §3, viñeta de `medicion/worker.ts` en «Hecho en el repositorio».

## Tasks & Acceptance

**Execution:**
- `medicion/worker.ts` -- `INSERT` con `rowid` primero y `abs(random())` como su valor; `bind` y `catch` intactos; un comentario breve que diga por qué (el orden de llegada encadena registros, NFR-11/AD-13), que un `rowid` repetido cae en el `catch`, que el `rowid` no se genera ni se lee en JavaScript (que lo redondea: si hace falta, `CAST(rowid AS TEXT)`) y que lo ya escrito lo baraja `desplegar` (23.2), no esta historia.
- `tests/unit/comparticion.test.ts` -- adaptar la prueba: columnas del `INSERT` = `['rowid', ...columnasDelEsquema]` (con el porqué: `rowid` es la columna implícita de SQLite, 23.12); la lista de `VALUES` se lee tolerando paréntesis anidados, su primer valor es `abs(random())`, tiene tantos valores como columnas del `INSERT` y tantos `?` como columnas del esquema.
- `tests/unit/orden-de-llegada.test.ts` (nuevo) -- `describe('Historia 23.12 — …')` con: (a) estructural sobre el código sin comentarios de `worker.ts`: un solo `INSERT`, `INSERT INTO eventos` sin `OR …`, primera columna `rowid`, primer valor `abs(random())`; (b) las tres primeras filas de la matriz importando `worker` de `../../medicion/worker.ts` y llamando `worker.fetch(new Request(…), entorno)` con un D1 falso tipado como `Parameters<typeof worker.fetch>[1]` (jornada comprobada por forma o con `vi.setSystemTime`, sin depender de la medianoche UTC); (c) barrido recursivo de `tools/` (`.ts .mts .mjs .js .cjs .sql`) sin ninguna cláusula `ORDER BY` que contenga `rowid`, `_rowid_` u `oid`, sin distinguir mayúsculas y tolerando literales concatenados; no vacío (exige, p. ej., `tools/ingreso.ts` y `tools/lib/ingresos.ts` entre los barridos); con los casos de control de las dos últimas filas de la matriz contra el detector.
- `DESPLIEGUE.md` -- en la viñeta de `medicion/worker.ts` de §3, una o dos frases: inserta con `rowid` aleatorio, el orden de las filas no es el de llegada, ninguna consulta ordena por `rowid` ni lo lee sin `CAST(rowid AS TEXT)`, y lo ya escrito sigue en orden de llegada hasta que lo baraje `npm run medicion -- desplegar` (23.2), que corre Héctor en la 23.3.

**Acceptance Criteria:**
- Given la rama terminada, when se compara con `baseline_revision`, then solo cambian `medicion/worker.ts`, `tests/unit/comparticion.test.ts`, `tests/unit/orden-de-llegada.test.ts`, `DESPLIEGUE.md` y los artefactos de la historia; `medicion/receptor.ts`, `esquema.sql`, `wrangler.toml`, `src/` y `public/` quedan idénticos.
- Given la rama, when corre `npm test` (lo que corre el CI), then pasa entero, con la prueba de correspondencia adaptada y las dos estructurales nuevas.
- Given el SQL del `INSERT` ejecutado contra un SQLite real con `esquema.sql` (comprobación manual), when se insertan varias filas y luego una con un `rowid` ya usado, then los `rowid` no siguen el orden de inserción y la repetida lanza `UNIQUE constraint failed`.

## Spec Change Log

## Review Triage Log

### 2026-10-24 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las cinco capas de revisión (blind-hunter, edge-case-hunter, verification-gap,
intent-alignment, ac-auditor) son externas en el bucle v8-ralph y no traían hallazgos en
esta pasada: la revisión independiente viene después.

### 2026-10-24 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 16 (high 0, medium 2, low 14)
- defer: 2 (high 0, medium 0, low 2)
- reject: 10 (high 0, medium 0, low 10)
- addressed_findings:
  - `[medium]` `[patch]` El detector de `tools/` no veía `ORDER BY "rowid"`, `` `rowid` ``, `[rowid]` ni `"e"."rowid"`, ni el orden por la posición o el alias con que el `SELECT` saca un `rowid` sin `CAST` (`ORDER BY 1`, `ORDER BY fila`) (blind-hunter, edge-case-hunter, verification-gap). Quita las comillas de identificador antes de leer y resuelve posiciones y alias contra la lista del `SELECT`; seis casos de control nuevos.
  - `[medium]` `[patch]` La cláusula acababa en el primer `)` o comilla, así que `ORDER BY lower(ruta), rowid` y un `CASE … 'copiado' … END, rowid` pasaban (edge-case-hunter). `clausulaDesde` lleva la cuenta de paréntesis y solo cierra en la comilla que termina el literal de JavaScript (la seguida de `)`, `,`, `;`, `+`, `.`, `:`, `]`, `}` o el final).
  - `[low]` `[patch]` Un comentario entre el `+` y el literal siguiente rompía la unión de literales (edge-case-hunter). `literalesUnidos` admite blancos y comentarios entre ellos; caso de control nuevo.
  - `[low]` `[patch]` Un comentario `--` de SQL dentro de la cláusula se marcaba (blind-hunter). Se descarta antes de mirar; control `ORDER BY jornada -- no por rowid`.
  - `[low]` `[patch]` El barrido solo miraba seis extensiones (blind-hunter, edge-case-hunter). Barre todo fichero de `tools/`.
  - `[low]` `[patch]` El barrido seguía enlaces simbólicos (un bucle lo tumbaba) y no saltaba `node_modules` (blind-hunter, edge-case-hunter). `lstatSync`, sin seguir enlaces, y sin `node_modules`; comprobado con un enlace en bucle temporal.
  - `[low]` `[patch]` Nada fijaba que `eventos` tenga `rowid`: con `WITHOUT ROWID` cada `INSERT` fallaría y el `catch` lo callaría (blind-hunter). Prueba nueva sobre `esquema.sql` sin comentarios, y una línea en el comentario de `worker.ts`.
  - `[low]` `[patch]` La comprobación de «sin `OR …`» dejaba pasar `ON CONFLICT DO NOTHING` (blind-hunter). Se exige que la escritura empiece por `INSERT INTO eventos` y no lleve `ON CONFLICT`, y se cuentan también `REPLACE` y `UPSERT` como escrituras.
  - `[low]` `[patch]` El comentario de `worker.ts` no nombraba el desbordamiento de `abs()` con `random() = -2^63` (blind-hunter). Lo nombra, con su probabilidad despreciable; se mantiene `abs(random())`, que es lo que pide el criterio.
  - `[low]` `[patch]` `DESPLIEGUE.md` afirmaba que ninguna consulta ordena por `rowid` ni lo lee sin `CAST`, más de lo que vigila ninguna prueba (blind-hunter, edge-case-hunter, verification-gap, intent-alignment). Ahora es la regla para quien consulta, y dice qué vigila la prueba (el orden, en `tools/`), qué no (la lectura, hasta la 23.10) y que las consultas a mano de §3 no las vigila nada.
  - `[low]` `[patch]` `DESPLIEGUE.md` no decía que el Worker en vivo sigue numerando en orden hasta redesplegarse ni que el barajado tiene que ir después (blind-hunter). Lo dice, con el porqué.
  - `[low]` `[patch]` `sinComentarios` dejaba los comentarios de final de línea, y un `// INSERT OR IGNORE` habría tumbado la prueba (blind-hunter). La prueba estructural lee las cadenas que ve el compilador de TypeScript (`cadenasDelCodigo`, con `typescript`, ya dependencia de desarrollo), con los `+` plegados y sin comentarios; comprobado con un comentario así.
  - `[low]` `[patch]` El mismo `INSERT` se leía de tres maneras, y la de `comparticion.test.ts` (`indexOf('VALUES (')` sobre el fichero) leía otra cosa ante un comentario con «VALUES (» o una lista partida con `+` (blind-hunter, edge-case-hunter). Las dos pruebas leen el SQL que el Worker **envía** a un D1 falso, y la estructural exige además que el declarado sea ese; `listaTras` respeta paréntesis anidados y comillas simples.
  - `[low]` `[patch]` Dos `match(...)![1]` lanzaban `TypeError` en vez de fallar diciendo qué (blind-hunter). Sin aserciones no nulas: `listaTras` devuelve `null` y la expectativa falla con el SQL como mensaje.
  - `[low]` `[patch]` La prueba «un rowid repetido…» no probaba un `rowid` repetido (blind-hunter). Se llama «un run() que rechaza, como ante un rowid repetido, …» y un comentario dice qué fija ella y qué la estructural.
  - `[low]` `[patch]` La entrada anterior de este registro anotaba ceros como si hubiera habido revisión (blind-hunter). Esa entrada no fue una revisión: las capas no habían corrido. Esta es la primera, y el resultado se reescribe con ella.

Rechazados (10): una prueba versionada contra un motor SQLite (`node:sqlite` está vedado en el contrato; la prueba en vivo es la baliza de la 23.3); que el `catch` no distinga colisión de avería (el criterio pide el mismo `catch`, en silencio); barrer `medicion/`, `package.json`, flujos y Markdown (el criterio habla de `tools/`); los comentarios en prosa de `tools/` que escriben la cláusula (se barre el texto entero a propósito, Design Notes); vigilar la lectura sin `CAST` (la estrechez es de la 23.10); la fila de `sprint-status.yaml` (la lleva el orquestador); el spec en el commit del código (AGENTS.md solo separa los de planificación); que el barrido pase hoy por vacío (el criterio lo dice: «hoy ninguno lo nombra»); la vinculación por `jornada`+`ruta` (fuera del criterio, que es de orden); y que la mitad «de antes» del propósito no se cumpla hasta la 23.3 (así lo reparte el criterio).

## Design Notes

El `rowid` se queda en SQL porque en JavaScript un entero de 64 bits pierde precisión por encima de 2^53 (`node:sqlite` incluso se niega a devolverlo), y generarlo allí obligaría a enlazarlo y a cambiar el tipo de `bind`. `INSERT` sin `OR …` es lo que pide el criterio: la colisión (probabilidad ≈ N/2^63) es un error que el `catch` ya traga, «como un almacén caído».

La prueba de `tools/` solo prohíbe **ordenar** por `rowid`: la 23.2 traerá la comprobación (`CAST(rowid AS TEXT)`) y el barajado (`UPDATE eventos SET rowid = abs(random())`), y la 23.10 la estrecha a que solo esos lo nombren. Se barre el texto entero, comentarios incluidos: un comentario que escriba la cláusula también falla y se reescribe, más barato que un quitacomentarios que se coma código (las rutas `'**/*.md'` abren `/*`).

Forma orientativa de la adaptación:

```ts
expect(enElInsert).toEqual(['rowid', ...enElEsquema]);
const valores = worker.match(/VALUES \((.+)\)'/)![1].split(',').map((v) => v.trim());
expect(valores[0]).toBe('abs(random())');
expect(valores).toHaveLength(enElInsert.length);
expect(valores.filter((v) => v === '?')).toHaveLength(enElEsquema.length);
```

## Verification

**Commands:**
- `npx vitest run tests/unit/orden-de-llegada.test.ts tests/unit/comparticion.test.ts tests/unit/receptor.test.ts` -- expected: todo en verde.
- `npx astro check` -- expected: 0 errores (abarca `medicion/` y `tests/`).
- `npm test`, desprendido con `/Users/hec/brainlySabiduria/.claude/v8-ralph/correr.sh` y esperado con `esperar.pl` -- expected: `FINISHED EXIT=0`.
- `git diff --exit-code <baseline_revision> -- medicion/receptor.ts medicion/esquema.sql medicion/wrangler.toml src public` -- expected: sin salida, código 0.

**Manual checks (if no CLI):**
- Un guion en el directorio temporal de la sesión (no versionado) con `node:sqlite` en memoria: aplica `medicion/esquema.sql`, ejecuta el SQL exacto del `INSERT` de `worker.ts` con 20 filas de rutas numeradas (`/cita/1` … `/cita/20`), lee `SELECT ruta FROM eventos` —SQLite recorre una tabla con `rowid` en orden de `rowid`— y comprueba que las rutas no salen en orden de inserción; luego dos `INSERT` con el mismo `rowid` literal y comprueba `UNIQUE constraint failed`. Se borra al terminar.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Cambio implementado.** El `INSERT` del adaptador del receptor da el `rowid` aleatorio:
`INSERT INTO eventos (rowid, jornada, evento, ruta, origen, destino, consulta) VALUES
(abs(random()), ?, ?, ?, ?, ?, ?)`. El `rowid` lo genera SQLite y no viaja por `bind`, que
sigue recibiendo los seis campos del `Registro`; un `rowid` repetido —o el desbordamiento de
`abs()`— es un error de SQLite que traga el `catch` existente (204, evento perdido). Sin
migración, sin columnas, sin vocabulario ni huella; nada desplegado. Esta pasada es la primera
revisión de verdad (la entrada anterior del registro de triaje no lo fue) y endurece las
pruebas que fijan el cambio.

**Ficheros.**
- `medicion/worker.ts` — el `INSERT` con `rowid` primero y `abs(random())` como valor, y un
  comentario con el porqué (NFR-11/AD-13), la colisión y el desbordamiento en el `catch`, la
  dependencia de que la tabla tenga `rowid`, `CAST(rowid AS TEXT)` y el barajado de lo ya
  escrito en `desplegar` (23.2).
- `tests/unit/comparticion.test.ts` — la prueba de correspondencia lee el SQL que el Worker
  envía a un D1 falso (no el texto del fichero) y sus dos listas con `listaTras`, que respeta
  paréntesis anidados y comillas simples: columnas `['rowid', ...columnasDelEsquema]`, valores
  `['abs(random())', '?' × columnas del esquema]`.
- `tests/unit/orden-de-llegada.test.ts` (nuevo) — estructural sobre las cadenas que ve el
  compilador de TypeScript (`cadenasDelCodigo`: sin comentarios, con los `+` plegados): una
  sola escritura, `INSERT INTO eventos` sin `OR …` ni `ON CONFLICT`, `rowid` primero,
  `abs(random())` primero, y el SQL declarado es el que se envía; `esquema.sql` sin `WITHOUT
  ROWID`; las tres primeras filas de la matriz con `worker.fetch` y un D1 falso; el detector
  `ordenaPorRowid` (identificadores entre comillas, expresiones con paréntesis, `CASE` con
  literales, posición y alias del `rowid` seleccionado, comentarios `--` y entre literales
  concatenados) con 16 casos que marca y 9 que no; y el barrido de todo fichero de `tools/`,
  sin seguir enlaces simbólicos, que exige ver `tools/ingreso.ts` y `tools/lib/ingresos.ts`.
- `DESPLIEGUE.md` — §3, viñeta de `medicion/worker.ts`: `rowid` aleatorio; la regla para quien
  consulta (no ordenar por `rowid` ni leerlo sin `CAST`) con lo que vigila la prueba y lo que
  no; y el orden del despliegue: el Worker en vivo sigue numerando en orden hasta que Héctor lo
  redespliegue en la 23.3, y `desplegar` (23.2) baraja solo después de comprobarlo con su baliza.

**Revisión.** Parches aplicados: 16 (2 medios, 14 bajos). Diferidos: 2 (Time Travel de D1 y
el commit de contexto de la Épica 23 bajo la rama, los dos para Héctor). Rechazados: 10.
`followup_review_recommended: true` — parcheados: 0 altos, 2 medios, 14 bajos; puntuación
3×2 + 1×14 = 20 (≥ 5).

**Verificación.**
- `npx vitest run tests/unit/orden-de-llegada.test.ts tests/unit/comparticion.test.ts
  tests/unit/receptor.test.ts` — 3 ficheros, 79 pruebas en verde.
- Mutaciones a mano, revertidas: `INSERT OR IGNORE`, `ON CONFLICT DO NOTHING`, el SQL de antes
  de la historia y `WITHOUT ROWID` en el esquema hacen fallar las pruebas que deben; un
  comentario `// INSERT OR IGNORE VALUES (a, b)` al final de una línea y un `// VALUES (x, y)`
  ya no las tumban; un fichero `.sh` temporal en `tools/` con `ORDER BY "rowid"` falla el
  barrido, y un enlace simbólico en bucle no lo cuelga.
- `npx astro check` — 0 errores, 0 avisos, 22 sugerencias previas (ninguna en los ficheros
  tocados).
- `npm test` (desprendido, `logs/s-23-12/npm-test-revision-2.log`) — 124 ficheros, 5.120
  pruebas, `FINISHED EXIT=0`.
- `git diff --exit-code <baseline_revision> -- medicion/receptor.ts medicion/esquema.sql
  medicion/wrangler.toml src public` — sin salida, código 0. Solo cambian `medicion/worker.ts`,
  las dos pruebas, `DESPLIEGUE.md` y este spec.
- Comprobación manual repetida con `sqlite3` en memoria (guion en el directorio temporal de la
  sesión, borrado): con `esquema.sql` y el SQL leído de `worker.ts`, 20 filas `/cita/1`…
  `/cita/20` se leen en otro orden; dos `INSERT` con el mismo `rowid` literal lanzan `UNIQUE
  constraint failed: eventos.rowid (19)`.

**Riesgos residuales.** Lo ya escrito en el D1 de producción sigue en orden de llegada hasta
que `desplegar` (23.2) lo baraje en la 23.3, y el receptor en vivo sigue insertando sin `rowid`
hasta ese despliegue. Que D1 —no SQLite local— acepte el `rowid` explícito y rechace el
repetido solo lo prueba la baliza de la 23.3. El detector de `tools/` sigue siendo textual:
una consulta armada con piezas no literales (una variable con `'rowid'`) se le escapa, y la
lectura del `rowid` sin `CAST` no la vigila ninguna prueba hasta la 23.10. Time Travel de D1
guarda la secuencia de llegada por restauraciones (diferido). La rama trae el commit de
contexto de la Épica 23 bajo la historia (diferido). `sprint-status.yaml` no se toca aquí: lo
lleva el orquestador.
