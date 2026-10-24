---
title: 'Historia 23.12 — El orden de llegada no reconstruye a nadie'
type: 'feature'
created: '2026-10-24'
status: 'done'
baseline_revision: 'cd4a19572f95a65d5e844048e2624e82ad02195f'
review_loop_iteration: 1
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
      Es una propiedad de la plataforma anterior a esta historia. Corrección de la segunda
      revisión (intent-alignment): AD-13 sí la nombra, como pérdida aceptada
      (ARCHITECTURE-SPINE.md:226, «Pérdida nombrada»), y la 23.2 la documenta en
      DESPLIEGUE.md (epics.md:5214); la viñeta de medicion/worker.ts de §3 ya la dice desde
      esta revisión. No queda acto de Héctor pendiente por ella; se conserva el registro.
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
- `tests/unit/ayuda/` -- ayudantes compartidos de las pruebas (`medicion.ts`, `construir.ts`), importados con `.js`: ahí va el D1 falso que comparten las dos pruebas.
- `typescript` -- dependencia de desarrollo ya presente: su `createSourceFile` da las cadenas que ve el compilador, sin comentarios, para la estructural del Worker y para el barrido de `tools/`.
- `medicion/esquema.sql` -- solo lectura: seis columnas y dos índices, tabla con `rowid` implícito (no `WITHOUT ROWID`, sin `INTEGER PRIMARY KEY`), por eso admite `rowid` explícito.
- `tools/`, `tools/lib/` -- 57 `.ts` y un `.mjs`; hoy ningún fichero nombra `rowid` ni ejecuta SQL contra D1 (`git grep -i rowid -- tools` vacío; `tools/lib/ingresos.ts` solo remite a `npx wrangler d1 execute` en texto). La 23.2 añadirá la comprobación con `CAST(rowid AS TEXT)` de las filas de `/__comprobacion/` (la baliza pasa por el Worker, `epics.md` 5193) y el `UPDATE … SET rowid`; la 23.10 estrechará la prueba.
- `DESPLIEGUE.md:264-265` -- §3, viñeta de `medicion/worker.ts` en «Hecho en el repositorio»; `DESPLIEGUE.md:409-430` -- «Comprobar a mano que el Worker desplegado acepta el evento», la baliza a `/__comprobacion/` que se lee y se borra. Ninguna consulta de §3 depende del orden de las filas: todas agrupan y ordenan por columnas.

## Tasks & Acceptance

**Execution:**
- `medicion/worker.ts` -- `INSERT` con `rowid` primero y `abs(random())` como su valor; `bind` y `catch` intactos; un comentario breve que diga por qué (el orden de llegada encadena registros, NFR-11/AD-13), que un `rowid` repetido cae en el `catch`, que el `rowid` no se genera ni se lee en JavaScript (que lo redondea: si hace falta, `CAST(rowid AS TEXT)`) y que lo ya escrito lo baraja `desplegar` (23.2), no esta historia.
- `tests/unit/ayuda/d1.ts` (nuevo) -- lo que comparten las dos pruebas del adaptador, para que el SQL se lea de una sola manera: `d1QueApunta(fallo?)`, un D1 falso tipado desde `Parameters<typeof worker.fetch>[1]` que apunta el SQL de cada `prepare` y los valores de cada `bind` y, con `fallo`, hace que `run()` rechace; `peticionAlReceptor(carga, metodo = 'POST')`, la `Request` de una baliza; y `listaTras(sql, apertura)`, los elementos de la lista que abre el primer paréntesis tras `apertura`, separados por las comas de su nivel —respetando paréntesis anidados y comillas simples— o `null`.
- `tests/unit/comparticion.test.ts` -- adaptar la prueba y llamarla por lo que fija («las columnas del INSERT del Worker son las del esquema, tras el rowid implícito»): lee el SQL que el Worker **envía** a `d1QueApunta` (no el texto del fichero) y sus dos listas con `listaTras`; columnas = `['rowid', ...columnasDelEsquema]` (con el porqué: `rowid` es la columna implícita de SQLite, 23.12) y valores = `['abs(random())', '?' × columnas del esquema]`.
- `tests/unit/orden-de-llegada.test.ts` (nuevo) -- `describe('Historia 23.12 — …')` con: (a) estructural sobre las cadenas que ve el compilador en `worker.ts` (`cadenasDelCodigo`, Design Notes): las escrituras son las cadenas con `INSERT [OR …] INTO` o `REPLACE INTO` —no cualquier cadena con «insert» o «replace»—; hay una, empieza por `INSERT INTO eventos`, no lleva `ON CONFLICT` ni `RETURNING` (que devolvería a JavaScript el `rowid` de 64 bits), y por `listaTras` su primera columna es `rowid`, su primer valor `abs(random())` y los demás `?`, tantos como columnas; `esquema.sql` sin comentarios no lleva `WITHOUT ROWID`; (b) las tres primeras filas de la matriz con `worker.fetch` y `d1QueApunta`: el SQL enviado es el declarado (sin una tercera copia literal del `INSERT`), seis valores enlazados con la jornada entre la de antes y la de después (sin depender de la medianoche UTC), 204 sin cuerpo; (c) el detector `ordenaPorRowid` y el barrido de `tools/`, tal como los describen las Design Notes, con todos los casos de control de la matriz, los de las dos pasadas de revisión y los de esta.
- `DESPLIEGUE.md` -- en la viñeta de `medicion/worker.ts` de §3: inserta con `rowid` aleatorio y el orden de las filas no es el de llegada; la regla para quien consulta —no ordenar por `rowid` ni leerlo sin `CAST(rowid AS TEXT)`— con su porqué (por encima de 2^53 JavaScript redondea el entero y un `WHERE rowid = ?` da en otra fila o en ninguna), qué vigila `tests/unit/orden-de-llegada.test.ts` (el orden, en `tools/`), qué no (la lectura, hasta la 23.10; las consultas a mano de §3); que sin `ORDER BY` un `LIMIT` da filas cualesquiera, no las primeras ni las últimas —lo reciente se pide por `jornada`— y que ninguna consulta de §3 dependía del orden; lo que cuesta en espacio, medido (Verification); y el orden del despliegue: el Worker en vivo sigue numerando en orden hasta que se redespliegue, lo ya escrito hasta que lo baraje `npm run medicion -- desplegar` (23.2) en la 23.3, que baraja solo tras comprobar con su baliza el Worker nuevo, y una vuelta atrás del Worker vuelve a numerar en orden hasta el siguiente despliegue que pase la comprobación. Tras el bloque «Comprobar a mano que el Worker desplegado acepta el evento», cómo saber a mano si el Worker en vivo es ya el de la 23.12: dos balizas a `/__comprobacion/`, `SELECT CAST(rowid AS TEXT) …` de sus filas —consecutivos, Worker viejo; dispersos, el nuevo— y borrarlas.

**Acceptance Criteria:**
- Given la rama terminada, when se compara con el commit del spec, `a50b3e5c881d4ffa0ddc8003d09ce8da95549caf` (la base de la historia; `baseline_revision` la mueve cada vuelta por el paso 3), then solo cambian `medicion/worker.ts`, `tests/unit/comparticion.test.ts`, `tests/unit/orden-de-llegada.test.ts`, `tests/unit/ayuda/d1.ts`, `DESPLIEGUE.md` y los artefactos de la historia; `medicion/receptor.ts`, `esquema.sql`, `wrangler.toml`, `src/` y `public/` quedan idénticos.
- Given la rama, when corre `npm test` (lo que corre el CI), then pasa entero, con la prueba de correspondencia adaptada y las dos estructurales nuevas.
- Given el SQL del `INSERT` ejecutado contra un SQLite real con `esquema.sql` (comprobación manual), when se insertan varias filas y luego una con un `rowid` ya usado, then los `rowid` no siguen el orden de inserción y la repetida lanza `UNIQUE constraint failed`.

## Spec Change Log

### 2026-10-24 — Vuelta por bad_spec en la segunda revisión
- **Hallazgos que la disparan.** El detector de `tools/` barría el texto entero del fichero y adivinaba dónde acababa el literal de JavaScript que contiene la consulta, como pedían las Design Notes («se barre el texto entero, comentarios incluidos»). Fallaba en los dos sentidos: `ORDER BY coalesce(origen, ''), rowid`, `ORDER BY evento IN ('copiado','visto'), rowid` y `ORDER BY ruta = '/cita/x', rowid` pasaban, porque la comilla de SQL seguida de `,` o `)` cerraba la cláusula (blind-hunter, edge-case-hunter, ac-auditor); una comilla de cierre seguida de un salto de línea o de un `// comentario` alargaba la cláusula hasta la sentencia siguiente y marcaba ficheros sin ningún orden por `rowid` (blind-hunter, edge-case-hunter); un `--` con `)` o `;` dentro de la cláusula la cortaba (edge-case-hunter); y un comentario en prosa que escribe la regla tumbaba la prueba, lo que bloquearía el código de la 23.2 (edge-case-hunter). La primera revisión rechazó este último con la autoridad de las Design Notes, que no la tienen.
- **Qué se enmienda (fuera del contrato).** Design Notes: el detector lee SQL —las cadenas que ve el compilador de TypeScript, un `.sql` entero, o línea a línea en cualquier otra extensión— y cada texto se analiza como SQL, con literales y comentarios neutralizados, la cláusula acotada por niveles de paréntesis, el `SELECT` de su mismo nivel para posiciones y alias de cualquier expresión que nombre `rowid`, y `${…}` como «no se sabe»; y el coste en espacio, medido. Tasks: `tests/unit/ayuda/d1.ts` con el D1 falso, la petición y `listaTras` compartidos; el nombre de la prueba de `comparticion.test.ts`; las escrituras del Worker por `INSERT … INTO`/`REPLACE INTO` y sin `RETURNING`; el contenido de `DESPLIEGUE.md`. Code Map, el primer criterio (la lista de ficheros, con `ayuda/d1.ts`, y la base de la historia escrita, porque el paso 3 mueve `baseline_revision`) y Verification (la base escrita, los comandos exactos de `sqlite3` y la medida del espacio).
- **Estado malo que se evita.** Una prueba de `tools/` que pasa con consultas que sí ordenan por `rowid` y falla con ficheros que no lo hacen, justo cuando la 23.2 escriba ahí sus primeras consultas a D1; y un mismo SQL leído de tres maneras con dos D1 falsos distintos.
- **KEEP.** El `INSERT` de `medicion/worker.ts` tal cual —`'INSERT INTO eventos (rowid, jornada, evento, ruta, origen, destino, consulta) ' + 'VALUES (abs(random()), ?, ?, ?, ?, ?, ?)'`—, con `bind` de los seis campos y el `catch {}` intactos, y su comentario: el porqué (NFR-11/AD-13), que no se genera ni se lee en JavaScript (`CAST(rowid AS TEXT)`), la colisión y el desbordamiento de `abs()` en el `catch`, la dependencia de que la tabla tenga `rowid`, y que lo ya escrito lo baraja `desplegar` (23.2). De `comparticion.test.ts`, leer el SQL **enviado** y `listaTras` con paréntesis anidados y comillas simples, el comentario de por qué `rowid` no es columna del esquema y las dos expectativas completas (`['rowid', ...esquema]`, `['abs(random())', '?'×6]`). De `orden-de-llegada.test.ts`, `cadenasDelCodigo`, la prueba de `WITHOUT ROWID`, las del adaptador (jornada entre la de antes y la de después, seis valores, 204 sin cuerpo, `GET` y evento ajeno sin escritura, la de `run()` que rechaza con su nombre y su comentario), los 25 casos de control (16 que marca, 9 que no), y el barrido sin seguir enlaces ni entrar en `node_modules` que exige `tools/ingreso.ts` y `tools/lib/ingresos.ts`. De `DESPLIEGUE.md`, la viñeta entera de la primera revisión: `rowid` aleatorio, la regla para quien consulta, qué vigila la prueba y qué no, el Worker en vivo numerando en orden hasta redesplegarse, y el barajado solo después de la baliza.

## Review Triage Log

### 2026-10-24 — Review pass (sin capas: las cinco aún no habían corrido, no fue una revisión)
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

### 2026-10-24 — Review pass
- intent_gap: 0
- bad_spec: 4 (high 0, medium 2, low 2)
- patch: 15 (high 0, medium 1, low 14)
- defer: 0
- reject: 11 (high 0, medium 0, low 11)
- addressed_findings:
  - `[medium]` `[bad_spec]` Una comilla de SQL seguida de `,` o `)` dentro del `ORDER BY` —`coalesce(origen, ''), rowid`, `evento IN ('copiado','visto'), rowid`, `ruta = '/cita/x', rowid`— cerraba la cláusula antes del `rowid`, y el barrido pasaba (blind-hunter, edge-case-hunter, ac-auditor). Raíz en las Design Notes (barrer el texto entero y adivinar el literal de JavaScript); enmendadas para que el detector lea SQL ya extraído y neutralice sus literales, y vuelta al paso 3.
  - `[medium]` `[bad_spec]` Una comilla de cierre seguida de un salto de línea o de un `// comentario` no acababa la cláusula, que seguía por la sentencia siguiente: JavaScript sin `;`, un YAML de dos líneas o `'… ORDER BY jornada' // nunca por rowid` se marcaban sin ordenar por `rowid` (blind-hunter, edge-case-hunter). Misma enmienda: cada cadena del compilador es un texto, y fuera de código cada línea.
  - `[low]` `[bad_spec]` Un comentario `--` de SQL con `)`, `;` o una comilla dentro de la cláusula la cortaba antes de un `rowid` de la línea siguiente, porque los comentarios se quitaban después de acotarla (edge-case-hunter). Enmienda: se neutralizan antes de acotar.
  - `[low]` `[bad_spec]` Un comentario en prosa de `tools/` que escribe la cláusula («… ORDER BY, porque el rowid es aleatorio») tumbaba la prueba y bloquearía el código de la 23.2 que documente la regla (edge-case-hunter). La primera revisión lo rechazó por las Design Notes, que no son autoridad de alcance; enmienda: los comentarios del código no se miran, porque el quitacomentarios es el compilador.

Los 15 parches sobreviven a la vuelta: entran en la re-derivación del paso 3 y se registran en la pasada siguiente. Rechazados (11): una `INSERT INTO eventos` sin `rowid` fuera de `worker.ts` y el barrido de `medicion/` y de las consultas a mano (no hay ninguna otra escritura en el repositorio, la baliza de la 23.2 pasa por el Worker —`epics.md` 5193— y el criterio pone la prueba en el adaptador y en `tools/`); las historias futuras nombradas en el comentario y en `DESPLIEGUE.md` (las pide la tarea del spec y es la costumbre del repositorio); el tipo del commit `cd4a19572f` (no se reescribe historia); barrer `medicion/` y `package.json` (el criterio habla de `tools/`); que la prueba de `run()` que rechaza no distinga la colisión (ya renombrada y explicada en la primera revisión); la lectura del `rowid` sin `CAST` en `tools/` (el criterio la deja a la 23.10); la rama que no entra sola (ya diferido); el CI en verde solo en local (el CI corre en la principal, al fusionar Héctor); fijar que ningún flujo despliega el receptor (el criterio enumera las pruebas y no la incluye); `sprint-status.yaml` (lo lleva el orquestador); y los actos pendientes de Héctor (no son de esta historia).

### 2026-10-24 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 15 (high 0, medium 1, low 14)
- defer: 0
- reject: 0
- addressed_findings:
  - `[medium]` `[patch]` El alias o la posición de una expresión que nombra el `rowid` —`CAST(rowid AS TEXT) AS fila … ORDER BY fila`, `CAST(rowid AS TEXT), … ORDER BY 1`, `rowid + 0 AS r`, `CAST(rowid AS INTEGER) n`— no se resolvía, y es la forma de lectura que la regla prescribe (verification-gap, edge-case-hunter). `referenciasAlRowid` toma todo elemento del `SELECT` que nombre `rowid`; cuatro casos de control nuevos, y `… ORDER BY 2` sigue sin marcarse.
  - `[low]` `[patch]` Posiciones y alias se buscaban en el último `SELECT`, a menudo el de una subconsulta (blind-hunter, edge-case-hunter). Ahora, el `SELECT` del mismo nivel de paréntesis que el `ORDER BY`, sin salir del paréntesis que lo contiene; controles en los dos sentidos.
  - `[low]` `[patch]` `ORDER BY (fila)` pasaba (edge-case-hunter). Se quitan los paréntesis que envuelven el término; control nuevo.
  - `[low]` `[patch]` Un `ORDER BY ${columna}` o `'… ORDER BY ' + orden` pasaba (edge-case-hunter). El hueco o el operando no literal sale como `${…}` y la cláusula que lo lleva se marca; las cadenas dentro del operando se recorren también (`f('ORDER BY rowid')`); tres controles.
  - `[low]` `[patch]` La prueba de que el barrido no está vacío solo miraba nombres de fichero (blind-hunter). Exige además que de `tools/lib/ingresos.ts` salga una cadena que nombre `d1 execute`.
  - `[low]` `[patch]` El nombre «las columnas del INSERT del Worker son exactamente las del esquema» ya no decía lo que fija (blind-hunter). Ahora «… son las del esquema, tras el rowid implícito».
  - `[low]` `[patch]` El mismo SQL se leía de tres maneras con dos D1 falsos distintos (blind-hunter). `tests/unit/ayuda/d1.ts` da `d1QueApunta`, `peticionAlReceptor` y `listaTras` a las dos pruebas; la estructural lee las listas con `listaTras`, y la de la baliza válida compara lo enviado con lo declarado en vez de una tercera copia literal.
  - `[low]` `[patch]` La comprobación contra SQLite no era repetible (blind-hunter, intent-alignment). Verification trae los comandos exactos de `sqlite3`, repetidos en esta pasada; contra D1 sigue siendo la baliza de la 23.3 (no hay `wrangler` ni Miniflare entre las dependencias, y `node:sqlite` está vedado).
  - `[low]` `[patch]` `DESPLIEGUE.md` no decía cómo comprobar tras desplegar ni qué hacer si no llega nada (blind-hunter, edge-case-hunter). Bloque nuevo «Comprobar a mano que el Worker desplegado inserta con `rowid` aleatorio»: dos balizas, `CAST(rowid AS TEXT)`, consecutivos = Worker viejo, ninguna fila = `wrangler rollback`; y la vuelta atrás que vuelve a numerar en orden.
  - `[low]` `[patch]` Las consultas que dependieran del orden por omisión no se habían revisado (blind-hunter). Ninguna de §3 dependía; `DESPLIEGUE.md` dice que sin `ORDER BY` un `LIMIT` da filas cualesquiera y que lo reciente se pide por `jornada`.
  - `[low]` `[patch]` `DESPLIEGUE.md` daba la regla sin el porqué ni la prueba (blind-hunter). Dice el redondeo por encima de 2^53 y nombra `tests/unit/orden-de-llegada.test.ts`.
  - `[low]` `[patch]` El coste en espacio no constaba (blind-hunter). Medido con `sqlite3` (300.000 filas: 41,2 MB frente a 49,0 MB, 50,0 MB barajando): en torno a un 20 % más, en Design Notes y en `DESPLIEGUE.md`, junto a los 500 MB de D1.
  - `[low]` `[patch]` La primera entrada de este registro seguía con el mismo título que una revisión (blind-hunter). Su título dice ahora que las capas no habían corrido; `status: done` con `followup_review_recommended: true` y el contador de vueltas no se contradicen (el contador cuenta vueltas por bad_spec, y la de esta revisión es la primera).
  - `[low]` `[patch]` El filtro de escrituras de la estructural aceptaba cualquier cadena con «insert» o «replace», y no prohibía `RETURNING` (blind-hunter). Las escrituras son `INSERT [OR …] INTO` o `REPLACE INTO`, y `RETURNING` falla; comprobado con una cadena inocua y con un `RETURNING rowid` puestos a mano y quitados.
  - `[low]` `[patch]` El diferido de Time Travel decía que AD-13 no lo menciona, y sí lo nombra como pérdida aceptada (intent-alignment). Evidencia corregida, y la viñeta de §3 lo dice.

Las capas externas no traen hallazgos en esta pasada repetida; los 15 parches son los que sobrevivieron a la vuelta por bad_spec, y entraron en la re-derivación del paso 3.

## Design Notes

El `rowid` se queda en SQL porque en JavaScript un entero de 64 bits pierde precisión por encima de 2^53 (`node:sqlite` incluso se niega a devolverlo), y generarlo allí obligaría a enlazarlo y a cambiar el tipo de `bind`. `INSERT` sin `OR …` es lo que pide el criterio: la colisión (probabilidad ≈ N/2^63) es un error que el `catch` ya traga, «como un almacén caído».

La prueba de `tools/` solo prohíbe **ordenar** por `rowid`: la 23.2 traerá la comprobación (`CAST(rowid AS TEXT)`) y el barajado (`UPDATE eventos SET rowid = abs(random())`), y la 23.10 la estrecha a que solo esos lo nombren.

**El detector lee SQL, no el texto del fichero** (vuelta de la segunda revisión). Barrer el texto entero obligaba a adivinar dónde acaba el literal de JavaScript que contiene la consulta, y esa adivinanza fallaba en los dos sentidos: una comilla de SQL seguida de `,` o `)` —`coalesce(origen, ''), rowid`— cortaba la cláusula antes del `rowid`, y una comilla de cierre seguida de un salto de línea o de un comentario la alargaba hasta la sentencia siguiente; los comentarios en prosa que escriben la regla tumbaban la prueba. Por eso hay dos pasos:

1. **Los textos SQL de cada fichero.** De un `.ts`, `.mts`, `.cts`, `.tsx`, `.js`, `.mjs`, `.cjs` o `.jsx`, las cadenas que ve el compilador de TypeScript (`cadenasDelCodigo`, con `ts.createSourceFile` y el `ScriptKind` de la extensión): literales y plantillas, con los `+` plegados en una sola cadena; un hueco de plantilla o un operando que no es literal sale como `${…}`, y lo que haya dentro de él se recorre también. Los comentarios no son cadenas y no se miran: el quitacomentarios es el compilador, que no se come código. De un `.sql`, el fichero entero. De cualquier otra extensión, cada línea —uniendo las que acaban en `\`, como las órdenes de terminal— es un texto, y se mira **sin neutralizar**: sus comillas y sus `--` son del formato (`--command "…"`), no de SQL.
2. **Cada texto, como SQL** (`ordenaPorRowid`). Primero, si sale de código o de un `.sql`, se neutraliza: los literales `'…'` (con `''` dentro) quedan vacíos, los identificadores entre `"…"`, `` `…` `` o `[…]` pierden las comillas, y los comentarios `--` y `/* */` desaparecen. Luego, cada `ORDER BY` abarca hasta el `;`, el paréntesis que cierra su nivel, un `LIMIT` u `OFFSET` de su nivel o el final del texto, y ordena por `rowid` si la cláusula nombra `rowid`, `_rowid_` u `oid`; si lleva un `${…}`, porque no se puede saber por qué ordena; o si alguno de sus términos —sin los paréntesis que lo envuelvan— es la posición (desde 1) o el alias de un elemento de la lista del `SELECT` **de su mismo nivel** que nombre `rowid`, sea solo o dentro de una expresión (`CAST(rowid AS TEXT) AS fila`, `rowid + 0 r`).

El barrido recorre todo fichero de `tools/` sin seguir enlaces simbólicos y sin `node_modules`, y no puede pasar por vacío: exige haber leído `tools/ingreso.ts` y `tools/lib/ingresos.ts`, y que de este último salga alguna cadena que nombre `d1 execute`, para que se vea que la extracción llega a lo que hoy habla con D1. Lo que sigue escapándose, y se acepta: una consulta cuyo `rowid` venga de una variable sin huella en la cadena (`ordenarPor = 'rowid'` y la cláusula escrita con otra variable) y la lectura del `rowid` sin `CAST`, que es de la 23.10.

**El coste en espacio.** Un `rowid` aleatorio ocupa unos 9 bytes en vez de 1–3, en la fila y en cada entrada de los dos índices, y las inserciones dispersas dejan las páginas menos llenas que añadir al final. Medido con `sqlite3` sobre 300.000 filas parecidas a las reales, la base ocupa un 19–21 % más (Verification); D1 admite 500 MB por base en el plan gratuito, y el tamaño lo informa la orden de la 23.10.

## Verification

**Commands:**
- `npx vitest run tests/unit/orden-de-llegada.test.ts tests/unit/comparticion.test.ts tests/unit/receptor.test.ts` -- expected: todo en verde.
- `npx astro check` -- expected: 0 errores (abarca `medicion/` y `tests/`).
- `npm test`, desprendido con `/Users/hec/brainlySabiduria/.claude/v8-ralph/correr.sh` y esperado con `esperar.pl` -- expected: `FINISHED EXIT=0`.
- `git diff --exit-code a50b3e5c881d4ffa0ddc8003d09ce8da95549caf -- medicion/receptor.ts medicion/esquema.sql medicion/wrangler.toml src public` -- expected: sin salida, código 0.
- `git diff --name-only a50b3e5c881d4ffa0ddc8003d09ce8da95549caf -- . ':!corpus' ':!package-lock.json'` -- expected: solo `DESPLIEGUE.md`, `medicion/worker.ts`, las tres de `tests/unit/` y este spec.

**Manual checks (if no CLI):**
- Con `sqlite3` (el del sistema; nada versionado, en el directorio temporal de la sesión, que se borra al terminar). El SQL es el que envía el Worker, con los marcadores ya sustituidos:

  ```bash
  sqlite3 :memory: <<'SQL'
  .read medicion/esquema.sql
  WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 20)
  INSERT INTO eventos (rowid, jornada, evento, ruta, origen, destino, consulta)
    SELECT abs(random()), '2026-10-24', 'copiado', '/cita/' || i, NULL, NULL, NULL FROM n;
  SELECT group_concat(ruta, ' ') FROM (SELECT ruta FROM eventos);
  INSERT INTO eventos (rowid, jornada, evento, ruta) VALUES (7, '2026-10-24', 'copiado', '/a');
  INSERT INTO eventos (rowid, jornada, evento, ruta) VALUES (7, '2026-10-24', 'copiado', '/b');
  SQL
  ```

  Expected: las rutas no salen de `/cita/1` a `/cita/20` (una tabla con `rowid` se recorre en orden de `rowid`), y el último `INSERT` da `UNIQUE constraint failed: eventos.rowid`. Lo prueba contra SQLite, no contra D1: el D1 en vivo lo prueba la baliza de la 23.3.
- El espacio, con `sqlite3` sobre dos ficheros temporales con `esquema.sql`: 300.000 filas (jornada que cambia cada 3.000, tres eventos, rutas `/cita/…` de unos 45 caracteres, `origen` en una de cada diez) insertadas sin `rowid` en uno y con `abs(random())` en el otro, y `PRAGMA page_count`. Expected: en torno a un 20 % más con el `rowid` aleatorio (medido en la revisión: 41,2 MB frente a 49,0 MB, y 50,0 MB barajando el primero con `UPDATE eventos SET rowid = abs(random())`).

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Cambio implementado.** El `INSERT` del adaptador del receptor da el `rowid` aleatorio:
`INSERT INTO eventos (rowid, jornada, evento, ruta, origen, destino, consulta) VALUES
(abs(random()), ?, ?, ?, ?, ?, ?)`. El `rowid` lo genera SQLite y no viaja por `bind`, que
sigue recibiendo los seis campos del `Registro`; un `rowid` repetido —o el desbordamiento de
`abs()`— es un error de SQLite que traga el `catch` existente (204, evento perdido). Sin
migración, sin columnas, sin vocabulario ni huella; nada desplegado. La segunda revisión
devolvió la historia al paso 3 por el diseño del detector de `tools/` (bad_spec): ahora lee
SQL —las cadenas que ve el compilador de TypeScript, un `.sql` entero o, en otra extensión,
cada línea— en vez de adivinar en el texto del fichero dónde acaba un literal de JavaScript.

**Ficheros** (frente a la base de la historia, `a50b3e5c881d4ffa0ddc8003d09ce8da95549caf`).
- `medicion/worker.ts` — el `INSERT` con `rowid` primero y `abs(random())` como valor, y el
  comentario con el porqué, la colisión y el desbordamiento en el `catch`, la dependencia de
  que la tabla tenga `rowid`, `CAST(rowid AS TEXT)` y el barajado en `desplegar` (23.2).
  Idéntico al de la primera revisión.
- `tests/unit/ayuda/d1.ts` (nuevo) — `d1QueApunta`, `peticionAlReceptor` y `listaTras`,
  compartidos por las dos pruebas del adaptador.
- `tests/unit/comparticion.test.ts` — la correspondencia de columnas lee el SQL enviado, con
  `['rowid', ...esquema]` y `['abs(random())', '?'×6]`, y se llama por lo que fija.
- `tests/unit/orden-de-llegada.test.ts` (nuevo) — estructural sobre las cadenas del
  compilador (una escritura `INSERT INTO eventos`, sin `OR …`, `ON CONFLICT` ni `RETURNING`,
  `rowid`/`abs(random())` primeros y el resto `?`), `esquema.sql` sin `WITHOUT ROWID`, el
  adaptador con un D1 falso (lo enviado es lo declarado, seis valores, 204), el detector
  `ordenaPorRowid` con 32 casos que marca y 18 que no, y el barrido de `tools/` que exige ver
  `tools/ingreso.ts`, `tools/lib/ingresos.ts` y su cadena de `d1 execute`.
- `DESPLIEGUE.md` — §3: la viñeta de `medicion/worker.ts` (`rowid` aleatorio; Time Travel
  como pérdida aceptada; la regla con su porqué y la prueba que la vigila; el orden por
  omisión; el coste en espacio, medido; el Worker en vivo, el barajado y la vuelta atrás) y
  el bloque «Comprobar a mano que el Worker desplegado inserta con `rowid` aleatorio».

**Revisión (segunda).** Hallazgos: 4 bad_spec (2 medios, 2 bajos) con vuelta al paso 3 y
el spec enmendado fuera del contrato; 15 parches (1 medio, 14 bajos), aplicados en la
re-derivación; 0 diferidos nuevos (se corrigió la evidencia del de Time Travel); 11
rechazados. `followup_review_recommended: true` — parcheados en la pasada: 0 altos, 1 medio,
14 bajos; puntuación 3×1 + 1×14 = 17 (≥ 5). El detector se reescribió entero y solo lo han
visto las pruebas y las mutaciones de abajo.

**Verificación.**
- `npx vitest run tests/unit/orden-de-llegada.test.ts tests/unit/comparticion.test.ts
  tests/unit/receptor.test.ts tests/unit/buscadores.test.ts` — 4 ficheros, 110 pruebas en verde.
- Mutaciones a mano, revertidas: un `.ts` temporal en `tools/` con
  `` `… ORDER BY coalesce(origen, ''), rowid` `` falla el barrido; otro con un comentario en
  prosa que escribe la cláusula, una cadena sin `;` seguida de un `UPDATE … SET rowid` y un
  `// no por rowid` tras la comilla lo pasa; en `worker.ts`, `INSERT OR IGNORE`, un
  `RETURNING rowid` y el SQL de antes de la historia hacen fallar las pruebas que deben, y una
  cadena inocua «insert or replace failed» no.
- `npx astro check` (`logs/s-23-12/astro-check-revision-3.log`) — 0 errores, 0 avisos, 22
  sugerencias previas, ninguna en los ficheros tocados.
- `npm test` (desprendido, `logs/s-23-12/npm-test-revision-3.log`) — 124 ficheros, 5.145
  pruebas, `FINISHED EXIT=0`.
- `git diff --exit-code a50b3e5c881d4ffa0ddc8003d09ce8da95549caf -- medicion/receptor.ts
  medicion/esquema.sql medicion/wrangler.toml src public` — sin salida, código 0; frente a esa
  base solo cambian `DESPLIEGUE.md`, `medicion/worker.ts`, las tres de `tests/unit/` y este
  spec.
- Los comandos de `sqlite3` de Verification, tal cual: las 20 rutas salen en otro orden
  (`/cita/3 /cita/20 /cita/4 …`) y el `rowid` repetido da `UNIQUE constraint failed:
  eventos.rowid (19)`. La medida del espacio: 41.209.856 bytes sin `rowid`, 48.984.064 con
  `abs(random())`, 49.999.872 barajando con `UPDATE`.
- Auditoría de la matriz: sus cinco filas tienen prueba y corrieron en verde.

**Riesgos residuales.** Lo ya escrito en el D1 de producción sigue en orden de llegada hasta
que `desplegar` (23.2) lo baraje en la 23.3, y el receptor en vivo sigue insertando sin `rowid`
hasta ese despliegue. Que D1 —no SQLite local— acepte el `rowid` explícito y rechace el
repetido solo lo prueba la baliza de la 23.3 (o el bloque nuevo de `DESPLIEGUE.md`). El
detector sigue sin ver un `rowid` que llegue por una variable sin huella en la cadena (una
lista de trozos unida con `join`), y la lectura del `rowid` sin `CAST` no la vigila ninguna
prueba hasta la 23.10. Fuera de código y de `.sql`, cada línea se mira sin neutralizar: un
`ORDER BY` seguido en la misma línea de otra cosa que nombre `rowid` se marcaría. La rama
trae el commit de contexto de la Épica 23 bajo la historia (diferido). `sprint-status.yaml`
no se toca aquí: lo lleva el orquestador.
