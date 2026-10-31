---
title: 'Historia 23.13 — La cuota de lectura de D1 se juzga antes de leer, orden por orden'
type: 'feature'
created: '2026-10-31'
status: 'done'
baseline_revision: '3c91b8d67de5c3e753255327e2cee40e690e21d6'
baseline_commit: '3c91b8d67de5c3e753255327e2cee40e690e21d6'
review_loop_iteration: 0
context: []
warnings: [oversized]
deferred:
  - summary: >-
      Cotejar `rows_read_24h` de `d1 info` con la suma de los `rows_read` de una pasada (criterio de
      la 23.13): no lo puede hacer un agente, porque es `--remote`.
    evidence: |-
      La regla del encargo y AD-14 vedan a un agente todo lo que lleve `--remote`. Queda para la
      primera `npm run medicion` que corra Héctor, con el procedimiento de DESPLIEGUE.md §3, «La
      cuota de lectura de D1, orden por orden» («Pendiente de Héctor»), y el resultado se anota
      allí y en este spec.
    location: DESPLIEGUE.md §3
    severity: medium
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** las tres órdenes de `tools/` que recorren `eventos` —la lectura de la línea base (`npm run medicion`), `desplegar` y `comprobar`— gastan cuota de lectura de D1 (5 M filas al día, por cuenta) sin mirarla, y su gasto crece con la tabla: una pasada podría agotarla y dejar las consultas fallando hasta las 00:00 UTC.

**Approach:** cada orden declara la lista de sus sentencias que recorren la tabla; antes de leer más que el `COUNT(*)` que da N —que va primero y solo si `rows_read_24h` de `d1 info` está bajo la cuota— juzga N × esa lista, con una reserva de otro tanto de lo leído en 24 h, con **un solo juez puro** de `tools/lib/medicion.ts` que juzga también la escritura del barajado. Si no cabe, sale con 1 sin trocear. La lectura informa además la suma medida de los `rows_read` de su pasada.

## Boundaries & Constraints

**Always:** el coste se deriva de la lista declarada × N, nunca un literal, y se llama «estimación» (cota inferior: `rows_read` cuenta también índices; sin índice por `ruta`, cada intento de baliza recorre la tabla). `CUOTA_DE_FILAS_LEIDAS_POR_DIA_EN_D1 = 5_000_000` en `src/lib/umbrales.ts`, junto a la de escritura y con la nota «por cuenta»; la orden la importa. Reserva = lo usado en 24 h. Sin `rows_read_24h`, 1 antes de leer ninguna fila de la tabla. Ningún SQL nuevo nombra el `rowid`. Lo local (umbrales, Corpus) antes de lo remoto que lea filas. Identificadores y textos en español.

**Ask First:** cambiar el valor de una cuota, añadir un juicio a `ensayo` o a otra orden, tocar el receptor, el vocabulario, las columnas o la huella.

**Never:** correr nada con `--remote`, `wrangler deploy` ni nada que hable con Cloudflare (el cotejo en vivo es acto de Héctor); trocear por consultas o jornadas; editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`; tocar `src/lib/vocabulario.ts`, `medicion/` o `dist/`; Playwright; push o merge.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cabe | `rows_read_24h` bajo, N pequeño | `COUNT(*)` y después el resto; la lectura informa estimación, medida y cuota | — |
| Falta `rows_read_24h` | `d1 info` sin el campo o sin JSON | ninguna sentencia sobre `eventos` | 1, lo nombra |
| Ya en la cuota | `rows_read_24h ≥ cuota` | ni el `COUNT(*)` | 1, «repite otro día» |
| No cabe por la reserva | `2·U + N·R > cuota` | solo el `COUNT(*)`; nada migrado, desplegado ni enviado | 1, con estimación, U, reserva y cuota |
| `desplegar`, segundo juicio | `d1 info` atrasado o el gasto propio la pasa | sin barajar ni huella | 1, con el parte |
| Lectura sin forma | ninguna consulta con recuentos con forma | — | 1, «ninguna consulta con forma» |

</frozen-after-approval>

## Code Map

- `tools/lib/medicion.ts` -- `leerConsulta` (añade `leidas` de `meta.rows_read`), `leerInformacion`/`leerInformacionDeLaCuota` (`rows_read_24h`), `SQL_DE_FILAS`, `cabeElBarajado` (pasa por el juez, mismo mensaje), `consultar`, `contarFilas`, `leerCuota`, `comprobarConBalizas` (`INTENTOS_DE_COMPROBACION` × borrado+lectura, más el borrado final), `desplegar`, `comprobar`, `leer`, `LecturaCruda`. `ensayo` no se toca (no hay `d1 info` en local).
- `tools/lib/lineaBase.ts:446-454,1416-1422,1498-1517` -- `EntradaDeLaLectura`, `nadaSeLeyo`, bloque «Cuota de D1» con la línea «cinco veces» escrita a mano.
- `tools/medicion.ts:290-360` -- la cáscara de la lectura; cabecera con los códigos.
- `src/lib/umbrales.ts:834-855` -- las dos cuotas con nombre.
- `tests/unit/medicion-secuencias.test.ts` -- `mundo` (D1 en memoria: `d1 info`, `responder`) y `mundoDeLectura`; `tests/unit/medicion-orden.test.ts:288-307,720-760,960-1170` -- lectores, `cabeElBarajado` y la cáscara con un `npx` de mentira; `tests/unit/linea-base.test.ts:102-112,214-240,1392-1401`.
- `tests/unit/orden-de-llegada.test.ts:570-660` -- la prueba estrecha: solo el barajado y las balizas nombran el `rowid` en `tools/`.
- `DESPLIEGUE.md:811-920,1002-1090` -- «Leer la línea base» y «Desplegar el receptor»; `AGENTS.md` «Desplegar el receptor de la medición» y «Leer la línea base».
- wrangler 4.151.1 (`~/.npm/_npx/827da23dfd673aa2`) -- `d1 info --json` da `rows_read_24h` (suma horaria de GraphQL del día anterior a hoy, por base) y lo omite si GraphQL falla; `d1 execute --json` trae `meta.rows_read` por sentencia.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/umbrales.ts` -- `CUOTA_DE_FILAS_LEIDAS_POR_DIA_EN_D1` con doc: plan gratuito, **por cuenta**, una sola base D1 en la cuenta, al día en un diff si cambia el plan.
- [x] `tools/lib/medicion.ts` -- `Recorrido {que, sql, veces}` y las tres listas (`recorridosDeLaLectura(hoy)`, `recorridosDeDesplegar(campos)`, `recorridosDeComprobar(campos)`), más `RECORRIDOS_DEL_BARAJADO`; `juzgarCuota(clase, datos)`, el juez único (con o sin coste: sin él, solo «bajo la cuota»), y `textoDeCuota`; `cabeElBarajado` por el juez. `leer`: sesión, Corpus, `d1 info` (precondición), `COUNT(*)`, juicio, cinco consultas; devuelve `gasto` (estimación, medida, sin medir, U, reserva, cuota) y sale con 1 si ninguna consulta tiene forma. `desplegar`: estado de la tabla, `d1 info`, `COUNT(*)`, primer juicio (escritura y lectura juntas), recuentos de antes, migrar…; segundo juicio antes de barajar con `max(d1 info, U₁ + gastado)`, sin segundo `COUNT(*)`. `comprobar`: `d1 info`, `COUNT(*)`, juicio, balizas.
- [x] `tools/lib/lineaBase.ts` -- `EntradaDeLaLectura.gasto` obligatorio; el informe da filas leídas en 24 h frente a la cuota, la estimación (N × recorridos, derivados) y la medida, cada una aparte; `nadaSeLeyo` → `ningunaConsultaConForma`.
- [x] `tools/medicion.ts` -- pasa el gasto, mensaje «Ninguna consulta con forma», cabecera.
- [x] `tests/unit/medicion-secuencias.test.ts` -- `d1 info` con `rows_read_24h`, `meta.rows_read` en el D1 en memoria; orden de cada secuencia; sin cupo (precondición, reserva, falta) sin leer filas ni escribir; segundo juicio de `desplegar`; la prueba de que toda sentencia enviada sobre `eventos` está en la lista de su orden, con un caso que falla si se quita una.
- [x] `tests/unit/medicion-orden.test.ts` -- juez puro con cifras fijas (cabe, reserva, falta, cada cuota por su lado); lectores; la cáscara con el nuevo `npx`.
- [x] `tests/unit/linea-base.test.ts` -- gasto en la entrada; líneas de la cuota de lectura; `ningunaConsultaConForma`.
- [x] `DESPLIEGUE.md` §3 y `AGENTS.md` -- qué juzga cada orden, contra qué, reserva y qué hace si no cabe; la cuenta aloja una sola base D1; *sin confirmar* que pasar la cuota de lectura pare los `INSERT`; cómo cotejar `rows_read_24h` con la medida.

**Acceptance Criteria:**
- Given cualquiera de las tres órdenes sin cupo, when corre con el D1 en memoria, then no envía ninguna sentencia sobre `eventos` salvo, si `rows_read_24h` está bajo la cuota, el `COUNT(*)`, no migra, despliega, envía balizas ni escribe la huella, y sale con 1.
- Given `npm test`, `npx astro check` y `npm run build`, when corren en la rama, then pasan; la prueba estrecha de `rowid` sigue en verde.
- Given el cotejo de `rows_read_24h` con la suma medida de una pasada, when no puede hacerlo un agente (es `--remote`), then el spec lo anota como pendiente de Héctor y `DESPLIEGUE.md` da el procedimiento.

## Design Notes

El coste usa N del `COUNT(*)`, aunque las balizas sumen ~87 filas a cada recorrido suyo mientras están en la tabla: es la cota inferior que pide el criterio y se dice. El segundo juicio no recuenta N (no está en la lista de la historia); el barajado usa el N del primero, y la reserva de un día cubre lo que el sitio escriba entretanto. «Lo gastado» = el mayor de la suma medida (`meta.rows_read`) y la estimación de lo ya enviado.

## Verification

**Commands:**
- `npx vitest run tests/unit/medicion-secuencias.test.ts tests/unit/medicion-orden.test.ts tests/unit/linea-base.test.ts tests/unit/orden-de-llegada.test.ts` -- en verde.
- `npx astro check` -- 0 errores. `npm run build` -- termina.

## Cotejo de `rows_read_24h` con la medida (2026-10-31)

**No hecho por el agente, y a propósito.** El criterio pide cotejar `rows_read_24h` con la suma de
los `rows_read` de una pasada, porque hay informes de que el contador de 24 h subestima. Ese cotejo
es `--remote` y lo corre Héctor. Lo que sí quedó comprobado sin red: `d1 info --json` de wrangler
4.151.1 da `rows_read_24h` como suma horaria de `d1AnalyticsAdaptiveGroups.rowsRead` desde el mismo
momento del día anterior y filtrada por `databaseId` (solo esta base), y omite el campo si la
consulta a la analítica falla —por eso es precondición—; `d1 execute --json` trae `meta.rows_read`
por sentencia. La lectura informa ahora la medida aparte de la estimación, y `desplegar` y
`comprobar` la dicen al terminar, así que la primera pasada de Héctor da las dos cifras que hay
que comparar (procedimiento en `DESPLIEGUE.md` §3). Resultado: pendiente.

## Review Triage Log

### 2026-10-31 — Revisión en línea (sin subagentes)

Las tres capas —blind-hunter, edge-case-hunter y verification-gap— las corrió el propio agente
sobre el diff, sin subagentes (el encargo no los permitía): es una revisión estrechada, anclada en
la lectura de quien implementó, y conviene una independiente antes de fusionar.

- intent_gap: 0
- bad_spec: 0
- patch: 3 (high 0, medium 0, low 3)
- defer: 0
- reject: 5 (low)
- addressed_findings:
  - `[low]` `[patch]` El segundo juicio de `desplegar` decía «contadas unas N que esta orden ya leyó» también cuando mandaba la cifra de `d1 info`. La nota sale solo cuando manda lo leído por la orden; la prueba de «toma lo que diga d1 info» lo fija.
  - `[low]` `[patch]` Un `COUNT(*)` que fallaba salía sin el prefijo ni el pie de su orden («No se lee: …», «Consulta: no se ha escrito nada.»). `contarYJuzgar` los pone también ahí; prueba ampliada.
  - `[low]` `[patch]` `textoDeCuota` decía «No se lee ninguna fila» también para una cuota de escritura agotada (camino hoy inalcanzable). Dice «No se escribe nada».

Rechazados (5): validar un `coste` no finito en el juez (N ya se valida como entero seguro, y un NaN
no cabe); exigir `usado · 2 < cuota` antes del `COUNT(*)` (el criterio dice «bajo la cuota»); pinar
con una prueba las cifras 6, 8 y 11 escritas en `DESPLIEGUE.md` (prosa; el código las deriva y
`medicion-orden.test.ts` fija la fórmula); que el N del segundo juicio esté rancio (Design Notes);
que una consulta fallida cuente en la estimación (peca por exceso, a propósito).

## Suggested Review Order

**El juez y lo que juzga**

- El juez único, puro: escritura y lectura, con reserva y juicio previo sin coste.
  [`medicion.ts:1196`](../../tools/lib/medicion.ts#L1196)

- El coste de lectura: N × la lista declarada, nunca un literal.
  [`medicion.ts:1373`](../../tools/lib/medicion.ts#L1373)

- Las listas de cada orden; el COUNT(*) siempre primero.
  [`medicion.ts:1343`](../../tools/lib/medicion.ts#L1343)

- El barajado, ahora por el mismo juez y con el mismo mensaje.
  [`medicion.ts:1293`](../../tools/lib/medicion.ts#L1293)

- La constante con nombre, por cuenta.
  [`umbrales.ts:861`](../../src/lib/umbrales.ts#L861)

**Las secuencias**

- Precondición, COUNT(*) y juicio, compartidos por las tres órdenes.
  [`medicion.ts:1904`](../../tools/lib/medicion.ts#L1904)

- desplegar: primer juicio antes de los recuentos y de migrar.
  [`medicion.ts:1994`](../../tools/lib/medicion.ts#L1994)

- desplegar: segundo juicio con el mayor de d1 info y lo ya leído.
  [`medicion.ts:2056`](../../tools/lib/medicion.ts#L2056)

- comprobar: juzga antes de la primera baliza.
  [`medicion.ts:2131`](../../tools/lib/medicion.ts#L2131)

- leer: lo local, d1 info, COUNT(*), juicio y consultas; «ninguna consulta con forma».
  [`medicion.ts:2223`](../../tools/lib/medicion.ts#L2223)

- Lo gastado: estimado y medido por sentencia de la lista.
  [`medicion.ts:1625`](../../tools/lib/medicion.ts#L1625)

**Lectores y el informe**

- rows_read_24h, precondición, con la causa de wrangler.
  [`medicion.ts:445`](../../tools/lib/medicion.ts#L445)

- meta.rows_read de cada consulta: la medida.
  [`medicion.ts:369`](../../tools/lib/medicion.ts#L369)

- El informe: lo leído en 24 h, la estimación y la medida, aparte.
  [`lineaBase.ts:1494`](../../tools/lib/lineaBase.ts#L1494)

- Salir con 1 solo por las consultas, ya no por d1 info.
  [`lineaBase.ts:1424`](../../tools/lib/lineaBase.ts#L1424)

- La cáscara pasa el gasto y usa el nuevo criterio.
  [`medicion.ts:350`](../../tools/medicion.ts#L350)

**Pruebas y documentación**

- Toda sentencia sobre eventos está en la lista de su orden.
  [`medicion-secuencias.test.ts:1030`](../../tests/unit/medicion-secuencias.test.ts#L1030)

- desplegar sin cupo, en el primer y el segundo juicio.
  [`medicion-secuencias.test.ts:578`](../../tests/unit/medicion-secuencias.test.ts#L578)

- El juez con cifras fijas.
  [`medicion-orden.test.ts:791`](../../tests/unit/medicion-orden.test.ts#L791)

- Las líneas del informe.
  [`linea-base.test.ts:262`](../../tests/unit/linea-base.test.ts#L262)

- Qué juzga cada orden, la base única y lo sin confirmar.
  [`DESPLIEGUE.md:811`](../../DESPLIEGUE.md#L811)

- El resumen para agentes.
  [`AGENTS.md:354`](../../AGENTS.md#L354)
