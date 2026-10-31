# Revisión v8.5 — lente de verificación (hechos comprobados frente a afirmados)

- **Objeto:** el `git diff` de `ARCHITECTURE-SPINE.md` de la v8.5 (2026-10-31), solo los pasajes cambiados.
- **Método:** documentación de Cloudflare leída el 2026-10-31, el código fuente de `wrangler` **en la etiqueta fijada** `wrangler@4.151.1` (`cloudflare/workers-sdk`), el código del repositorio (`tools/lib/medicion.ts`, `medicion/migrations/`) y `EXPLAIN QUERY PLAN` sobre una base SQLite en blanco creada en el scratchpad con las dos migraciones (sin datos; nada remoto, nada de Cloudflare).
- **Veredicto:** **CONCERNS.** Los hechos de cuota son ciertos (5 M filas leídas al día, por cuenta, consultas que fallan desde el 2026-09-01 hasta las 00:00 UTC; `rows_read_24h` en `d1 info --json`; `meta.rows_read` en `d1 execute --json`). Pero la regla que la v8.5 construye sobre ellos **compara una cifra por base con una cuota por cuenta**, **subestima el coste de `desplegar`** (cuenta solo el barajado) y **deja fuera `comprobar`**, que también recorre la tabla. El «unas cinco veces» de la lectura es una estimación por lo bajo que nadie ha medido.

## Lo confirmado

| Afirmación de la v8.5 | Estado | Fuente |
|---|---|---|
| 5 millones de filas leídas al día en el plan gratuito | Confirmado | https://developers.cloudflare.com/d1/platform/pricing/ («Rows read: 5 million / day») |
| «por cuenta y no por base» | Confirmado | Changelog del 2026-09-01: el límite se aplica cuando *la cuenta* lo pasa — https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/ ; la página de precios dice «Once an account hits the daily read and/or write limit». |
| «Desde el 2026-09-01, al pasarla las consultas fallan hasta las 00:00 UTC» | Confirmado | Mismo changelog: por la API de Workers y por la REST, error distinto para lectura y escritura, reinicio a medianoche UTC. Nota: las *release notes* de D1 (https://developers.cloudflare.com/d1/platform/release-notes/) conservan un aviso del 2025-01-13 que anunciaba la aplicación para el 2025-02-10; el changelog de 2026 es el posterior y el que vale. |
| `d1 info` da las filas leídas en 24 h | Confirmado para 4.151.1 | `packages/wrangler/src/d1/info.ts` en `wrangler@4.151.1`: suma `rowsRead` de `d1AnalyticsAdaptiveGroups` y lo escribe como `output.rows_read_24h`, junto a `rows_written_24h`, `read_queries_24h`, `write_queries_24h`. Si la consulta GraphQL no devuelve nada, **los cuatro campos se omiten** (el «si el dato no se deja leer, no lee» de la v8.5 tiene ya dónde engancharse). https://github.com/cloudflare/workers-sdk/blob/wrangler%404.151.1/packages/wrangler/src/d1/info.ts |
| La suma de los `rows_read` de las consultas | Confirmado (en remoto) | API REST `query`: `result[].meta.rows_read` («rows read, including index rows») — https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/ . En `execute.ts` de 4.151.1, la rama remota con `--command` devuelve la respuesta de la API tal cual y `--json` la vuelca con `JSON.stringify`, así que `meta` llega entero aunque el tipo `QueryResult` solo declare `duration`. **En local no**: `executeLocally` reduce `meta` a `{ duration }`, así que el `ensayo` y las pruebas con D1 local no podrán ver `rows_read`. https://github.com/cloudflare/workers-sdk/blob/wrangler%404.151.1/packages/wrangler/src/d1/execute.ts |
| Las cinco consultas no tienen cota inferior de jornada | Confirmado | `consultasDeLaLectura` (`tools/lib/medicion.ts`, l. 224–239): solo `jornada < '${hoy}'`, más `ruta <>` y `evento IN (…)`. Como casi toda fila es de antes de hoy, el rango cubre la tabla salvo la jornada en curso. |
| El `UPDATE` del barajado recorre la tabla entera | Confirmado | `SQL_DE_BARAJADO = 'UPDATE eventos SET rowid = abs(random())'`, sin `WHERE`; el plan es `SCAN eventos`. |
| Resto del diff (cifras, «Portada», tokens, 23.11) | Confirmado en el repositorio | `EXPERIENCE.md` l. 301 («cada una cotejada con el texto de su fuente»); `DESIGN.md` l. 186 y 193 (peso e interlineado como tokens, única excepción las letras de salto); `src/lib/tipoDeResultado.ts` l. 41 (`portada: 'Portada'`); `src/lib/umbrales.ts` l. 290 (`MIN_LECTURAS_DE_LINEA_BASE = 300`). |

## Hallazgos

### H1 — Cuota por cuenta, dato por base (alta)

La v8.5 dice, con razón, que la cuota es **por cuenta**, y en la misma regla manda compararla con «las filas leídas en 24 h según `d1 info`». Pero `d1 info` filtra la consulta GraphQL por `databaseId: db.uuid`: da las lecturas **de la base `medicion`**, no las de la cuenta. Cualquier otra base D1 de la misma cuenta —u otro proyecto de Héctor en ella— consume cuota que la orden no ve, y la comprobación da «cabe» cuando no cabe. El repositorio solo declara una base (`medicion/wrangler.toml`), pero **no consta** cuántas tiene la cuenta.

Además, el conjunto se llama `d1AnalyticsAdaptiveGroups`: es analítica adaptativa, que puede ir muestreada y con retraso. Lo leído por la propia orden minutos antes (los recuentos de antes, las balizas) puede no aparecer todavía en la segunda lectura de `desplegar`, igual que pasa con las escrituras, para las que el código ya toma `Math.max(actual, previa + balizas)`.

**Propuesta:** decirlo en la espina —«`d1 info` da la base, no la cuenta; la regla vale mientras `medicion` sea la única base D1 de la cuenta»— y dejar que Héctor lo confirme en el panel; o leer el agregado de la cuenta (GraphQL sin filtro de base), que exige credencial y queda fuera de `wrangler`. Y aplicar a las lecturas el mismo `max` con lo que la orden sabe que ha leído.

### H2 — `desplegar` lee mucho más que el barajado (alta)

La v8.5 estima el coste de lectura de `desplegar` como el del barajado: «unas tantas filas leídas como filas tiene». Pero la secuencia de `desplegar` (`tools/lib/medicion.ts`, l. 1625–1710 y `comprobarConBalizas`, l. 1428–1480) recorre la tabla muchas más veces, y el plan de SQLite sobre el esquema de las migraciones lo confirma:

| Paso | SQL | Plan | Recorridos |
|---|---|---|---|
| Recuentos de antes | `SQL_DE_RECUENTOS` | `SCAN … USING INDEX eventos_por_jornada` (no cubre `ruta`) | 1 |
| Cuota previa y cuota actual | `SQL_DE_FILAS` (`COUNT(*)`) ×2 | `SCAN … USING COVERING INDEX eventos_por_origen` | 2 |
| Borrar balizas de un intento anterior | `DELETE … WHERE ruta = …` ×hasta 3 | `SCAN eventos` (no hay índice por `ruta`) | hasta 3 |
| Leer balizas | `SELECT … WHERE ruta = …` ×hasta 3 | `SCAN eventos` | hasta 3 |
| Borrar balizas | `DELETE … WHERE ruta = …` | `SCAN eventos` | 1 |
| Barajado | `UPDATE eventos SET rowid = …` | `SCAN eventos` (+ mantenimiento de dos índices) | 1+ |
| Recuentos de después | `SQL_DE_RECUENTOS` | como arriba | 1 |

Son de **6 a 12 recorridos**, no uno. Si la regla reserva solo el barajado, se queda corta en un orden de magnitud. **Propuesta:** que la espina estime el coste de `desplegar` como el de la orden entera (o que nombre la constante con que se cuenta) y no el de un paso.

### H3 — `comprobar` también recorre la tabla y queda fuera (media)

«Las dos órdenes que recorren la tabla entera la juzgan antes de correr» no es exacto: `comprobar` (acto de Héctor, en remoto) corre la misma `comprobarConBalizas`, con hasta siete recorridos completos por `WHERE ruta = …` sin índice. La v8.5 no la nombra. O la juzga también, o la espina dice por qué no (hoy es barata frente a 5 M; deja de serlo con la tabla).

### H4 — «Unas cinco veces» es una cota por abajo, sin medir (media)

Las cinco consultas usan `SEARCH eventos USING INDEX eventos_por_jornada (jornada<?)`, un índice que **no cubre** sus columnas, así que cada fila se visita en el índice y en la tabla. La API dice que `rows_read` incluye las filas de índice. No he podido confirmar si D1 cuenta la búsqueda por `rowid` en la tabla como otra fila leída (no hay D1 local con `meta.rows_read`: `wrangler d1 execute --local` lo descarta), así que el coste real está **entre 5 y unas 10 veces** las filas. Lo mismo para el barajado, que además reescribe dos índices. **Propuesta:** escribir «al menos cinco veces» y que la primera lectura, que ya informará de la suma de `rows_read`, fije el multiplicador con nombre en `umbrales.ts`, en vez de darlo por sabido.

### H5 — Pasar la cuota de lectura también deja ciego al receptor (baja, sin confirmar)

La página de precios dice que, con la cuenta en el límite de lectura **o** de escritura, «you will not be able to run queries against D1». Si eso incluye los `INSERT` del Worker, una lectura o un `desplegar` que agote la cuota de lectura pierde, en silencio (`worker.ts` traga el error), todas las vistas del resto del día UTC. La v8.5 dice «las consultas fallan», que lo implica, pero no nombra esta consecuencia, que es justo la razón de juzgar antes. **Sin confirmar** si un `INSERT` sin lecturas queda bloqueado por la cuota de lectura: el changelog da errores distintos para cada límite y no lo aclara.

## Lo que no se ha verificado

- El número de bases D1 y de otros consumidores de la cuenta (exige el panel o `--remote`; no se ha tocado).
- El `rows_read` real de las cinco consultas y del barajado (exige `--remote`).
- El retraso de `d1AnalyticsAdaptiveGroups` frente a una consulta recién hecha.
