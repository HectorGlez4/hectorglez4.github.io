---
title: 'Historia 23.12 — El orden de llegada no reconstruye a nadie'
type: 'feature'
created: '2026-10-24'
status: 'done'
baseline_revision: 'a50b3e5c881d4ffa0ddc8003d09ce8da95549caf'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: [oversized]
deferred: []
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

Planificación (pasada anterior): detenida tras la puerta «Ready for Development», como pedía
aquella invocación («Halt after planning.»).

**Cambio implementado.** El `INSERT` del adaptador del receptor da el `rowid` aleatorio:
`INSERT INTO eventos (rowid, jornada, evento, ruta, origen, destino, consulta) VALUES
(abs(random()), ?, ?, ?, ?, ?, ?)`. El `rowid` lo genera SQLite y no viaja por `bind`, que
sigue recibiendo los seis campos del `Registro`; un `rowid` repetido es un error de SQLite que
traga el `catch` existente (204, evento perdido). Sin migración, sin columnas, sin vocabulario
ni huella; nada desplegado.

**Ficheros.**
- `medicion/worker.ts` — el `INSERT` con `rowid` primero y `abs(random())` como valor, y un
  comentario con el porqué (NFR-11/AD-13), la colisión en el `catch`, `CAST(rowid AS TEXT)` y
  el barajado de lo ya escrito en `desplegar` (23.2).
- `tests/unit/comparticion.test.ts` — la prueba de correspondencia exige `['rowid',
  ...columnasDelEsquema]` y lee la lista de `VALUES` con un lector de paréntesis anidados
  (`listaEntreParentesis`): primer valor `abs(random())`, tantos valores como columnas del
  `INSERT`, tantos `?` como columnas del esquema.
- `tests/unit/orden-de-llegada.test.ts` (nuevo) — estructural sobre el código sin comentarios
  (un solo `INSERT`, sin `OR …`, primera columna `rowid`, primer valor `abs(random())`); las
  tres primeras filas de la matriz con `worker.fetch` y un D1 falso tipado como
  `Parameters<typeof worker.fetch>[1]` (jornada por forma y acotada entre la de antes y la de
  después, sin `setSystemTime`); y el detector `ordenaPorRowid` con los casos de control de
  las dos últimas filas más el barrido recursivo de `tools/` (`.ts .mts .mjs .js .cjs .sql`,
  comentarios incluidos), que exige ver `tools/ingreso.ts` y `tools/lib/ingresos.ts`.
- `DESPLIEGUE.md` — §3, viñeta de `medicion/worker.ts`: `rowid` aleatorio, ninguna consulta
  ordena por él ni lo lee sin `CAST(rowid AS TEXT)`, y lo ya escrito sigue en orden de llegada
  hasta `npm run medicion -- desplegar` (23.2), que corre Héctor en la 23.3.

**Revisión.** Parches aplicados: 0. Diferidos: 0. Rechazados: 0 (las capas son externas y
no traían hallazgos en esta pasada). `followup_review_recommended: false` — parcheados: 0
altos, 0 medios, 0 bajos; puntuación 3×0 + 1×0 = 0.

**Verificación.**
- `npx vitest run tests/unit/orden-de-llegada.test.ts tests/unit/comparticion.test.ts
  tests/unit/receptor.test.ts` — 3 ficheros, 64 pruebas en verde. Contra el `worker.ts` de
  `baseline_revision` fallan las tres que deben (la de correspondencia, la estructural del
  `rowid` y la de la baliza válida).
- `npx astro check` — 310 ficheros, 0 errores, 0 avisos, 22 sugerencias previas (ninguna en
  los ficheros tocados).
- `npm test` (desprendido) — 124 ficheros, 5.105 pruebas, `FINISHED EXIT=0`.
- `git diff --exit-code <baseline_revision> -- medicion/receptor.ts medicion/esquema.sql
  medicion/wrangler.toml src public` — sin salida, código 0.
- Comprobación manual con `node:sqlite` en memoria (guion en el directorio temporal de la
  sesión, borrado al terminar): con `esquema.sql` y el SQL exacto leído de `worker.ts`, 20
  filas `/cita/1`…`/cita/20` se leen en otro orden; dos `INSERT` con el mismo `rowid` literal
  lanzan `UNIQUE constraint failed: eventos.rowid`.
- Auditoría de la matriz: las cinco filas tienen prueba y corrieron en verde.

**Riesgos residuales.** Lo ya escrito en el D1 de producción sigue en orden de llegada hasta
que `desplegar` (23.2) lo baraje en la 23.3, y el receptor en vivo sigue insertando sin
`rowid` hasta ese despliegue. El detector de `tools/` es textual: una consulta construida por
piezas no literales (una variable con `'rowid'`) se le escaparía; la 23.10 lo estrecha.
`sprint-status.yaml` no se toca aquí: lo lleva el orquestador.
