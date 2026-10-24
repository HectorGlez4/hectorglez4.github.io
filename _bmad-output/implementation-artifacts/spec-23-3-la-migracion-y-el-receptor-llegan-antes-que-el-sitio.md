---
title: 'Historia 23.3 — La migración y el receptor llegan antes que el sitio'
type: 'operativa'
created: '2026-10-24'
status: 'done'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-23-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-23-2-el-receptor-sabe-guardar-lo-que-la-v8-va-a-medir.md'
pending:
  - summary: >-
      Leer la primera jornada cerrada tras el despliegue y comprobar que sus eventos siguen
      llegando como antes: el receptor nuevo no pierde nada de lo que envía el sitio de la v7.1.
    owner: 'orquestador del bucle v8-ralph, antes del merge de la 23.11'
---

# Historia 23.3 — La migración y el receptor llegan antes que el sitio

Historia operativa: no cambia código. Su orden la construyó la 23.2 (`npm run medicion --
desplegar`, en `tools/medicion.ts` con su parte pura en `tools/lib/medicion.ts`), y lo que pide la
historia es correrla una vez desde la rama de la Épica 23, commitear la huella y dejar anotado lo
que quedó aplicado. La regla de dónde se anota es la del Entorno operativo de `epics.md`: los
recuentos de la orden van aquí, con fecha; lo del vivo, en `DESPLIEGUE.md` §3.

## Registro operativo

### Quién la corrió, y con qué autorización

- **2026-10-24, 23:13 UTC**, desde la rama `v8/epica-23` en el worktree
  `.claude/worktrees/v8-epica-23`, con el árbol limpio en `HEAD` `b4303b0e7c` («chore(sprint): la
  23.2 en revisión»).
- La corrió **el orquestador del bucle v8-ralph** en la sesión principal, no Héctor a mano: Héctor
  autorizó en el chat, el 2026-10-24, que ese bucle corriera `npm run medicion -- desplegar` (23.3)
  y `npm run medicion -- comprobar` (23.11), fiándose de las comprobaciones de la propia orden, sin
  reintento ni troceado si salía con un código distinto de 0. Esa autorización sustituye, solo para
  ese bucle, el «ningún agente corre la orden» de la historia.
- Antes, `npm run medicion -- ensayo` contra el D1 local (`npm run medicion -- local`), en verde:
  87 balizas enviadas, 86 filas leídas y casan; rowid aleatorio; balizas borradas; tabla migrada;
  barajar sus 0 filas dejó los recuentos iguales. Salida entera en
  `.claude/v8-ralph/logs/s-23/orq-ensayo.log`.
- La salida entera de `desplegar` está en `.claude/v8-ralph/logs/s-23/orq-desplegar.log`. Salió
  con **código 0**.

### Precondiciones que dio por buenas la orden

- **La 23.12 en la principal y la rama al día con ella**: el merge `6d376ec1a1` («merge: la 23.12,
  el orden de llegada no reconstruye a nadie, entra sola en la principal») es antecesor de la rama,
  y también `origin/main` en `ed5a3f47e2` (2026-10-24T15:49:50+02:00).
- **Primer `desplegar`, sin huella versionada**: la orden lo dijo («Sin huella versionada en
  medicion/huella-del-vocabulario.json: la referencia es solo el vocabulario de origin/main») y
  cotejó el registro del receptor de la rama contra el vocabulario que envía el sitio en vivo, el
  de `origin/main` `ed5a3f47e2`. Lo cubría: no se negó.
- **La tabla de producción era la de partida**: «La tabla está de-partida; faltan
  0001_vocabulario_de_la_v8.sql». Es el estado que `estadoDeLaTabla` reconoce por `PRAGMA
  table_info(eventos)`, `sqlite_master` y `d1_migrations` —las seis columnas y los dos índices de
  la v7.1, sin ninguna migración anotada—.
- **La cuota, mirada antes de tocar nada** (paso 4 de la orden), con las escrituras de las balizas
  ya sumadas: cabía, y siguió.

### Qué quedó aplicado, y en qué orden

La orden lo resume así al terminar: «Quedó aplicado, en este orden: las migraciones en remoto; el
receptor desplegado; la comprobación con balizas, ya borradas; el rowid barajado; la huella
escrita en medicion/huella-del-vocabulario.json.»

1. **Instante anterior a la migración: `2026-10-24T23:13:16.949Z`** (reloj de este equipo; es el
   que sirve para Time Travel, hasta el 2026-10-31 en el plan gratuito).
2. **Migraciones en remoto**, `wrangler@4.151.1 d1 migrations apply medicion --remote`, sobre la
   base `medicion` (`3a60afb4-1285-4191-b467-8c3768de4545`):
   - `0000_tabla_de_partida.sql` — ✅ («Executed 4 commands»): su `CREATE TABLE IF NOT EXISTS` y
     sus dos `CREATE INDEX IF NOT EXISTS`, sobre una tabla y unos índices que ya existían. No
     cambió nada; solo dejó anotada en `d1_migrations` la línea de partida.
   - `0001_vocabulario_de_la_v8.sql` — ✅ («Executed 7 commands»): sus seis `ALTER TABLE eventos
     ADD COLUMN` (`via`, `zona`, `tramo`, `filtros`, `indexable`, `primera`, todas `TEXT` sin
     `DEFAULT`).
   - Las dos en una sola invocación, en ese orden, y ninguna se reintentó.
3. **El receptor desplegado**, `wrangler@4.151.1 deploy`: Worker
   `medicion-sabiduria-de-bolsillo`, 8,60 KiB (3,08 KiB con gzip), con el binding `env.MEDICION`
   a la base `medicion`, en
   `https://medicion-sabiduria-de-bolsillo.sabiduriadebolsillo.workers.dev`.
   **Versión: `23386626-a2b0-4c59-8d69-f78ab906ba10`.** Es el receptor de la rama, con el
   vocabulario de la v8 y el `INSERT` con `rowid` aleatorio de la 23.12.
4. **La baliza de prueba**, a `/__comprobacion/`: «Intento 1 de 3: 87 balizas enviadas, 86 filas
   leídas, y casan.» Las 87 son una por cada valor de cada campo de cada evento del vocabulario,
   una por evento que tiene que dejar la fila vacía, y una de un evento inventado que no tiene que
   dejar ninguna: de ahí las 86 filas. Casaron a la primera: el receptor en vivo guarda cada valor
   de la v8, descarta lo ajeno —también un campo válido fuera de su evento— y conserva la Marca de
   origen de los siete eventos de la v7.1. El `rowid` de sus filas, leído con `CAST(rowid AS TEXT)`,
   no es contiguo: **el receptor en vivo inserta con `rowid` aleatorio**. Las balizas se borraron
   (los recuentos de después, sin `/__comprobacion/`, no las traen y la orden no avisó de restos).
5. **La cuota, contada antes de barajar**: «barajar 4201 filas escribe unas 12603 (3 por fila); de
   la cuota de 100000 filas escritas al día van 1797 en las últimas 24 h (contadas unas 1566 de las
   balizas de esta orden), y otras 1797 se dejan para lo que el sitio escriba hasta las 00:00 UTC».
   Es decir, 12.603 + 1.797 + 1.797 = **16.197 de 100.000** (`CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1`,
   la del plan gratuito). La cuota es de la cuenta: lo que escriba otra base D1 suya no está
   contado.
6. **Instante anterior al barajado: `2026-10-24T23:13:45.352Z`.**
7. **El barajado**, `UPDATE eventos SET rowid = abs(random())`, sobre las 4.201 filas.
8. **Los recuentos de antes y de después**, abajo: iguales en todas.
9. **La huella escrita** en `medicion/huella-del-vocabulario.json` (`escritaEl: 2026-10-24`,
   `commit: b4303b0e7c809ab1862a63ca8737008f1b66e802`). La orden no hizo commit; se commiteó en la
   rama, nunca en la principal, en `6aece9a77f` («chore(medicion): la huella del receptor
   desplegado (23.3)»).

No hubo ningún fallo a mitad de la orden: no queda nada aplicado a medias que anotar ni ningún
diagnóstico pendiente por él.

### La tabla antes y después de migrar

- **Conserva todas sus filas**: 4.201 antes y 4.201 después (sin las balizas), en 50 jornadas y 68
  pares (jornada, evento).
- **La `0000` no cambió nada**: era toda `IF NOT EXISTS` sobre la tabla de partida que la orden
  acababa de reconocer, y los recuentos no se movieron.
- **Las columnas nuevas, a nulo en las filas de antes**: es lo que hace `ALTER TABLE … ADD COLUMN`
  sin `DEFAULT` en SQLite, y ningún paso posterior escribió en ellas salvo las balizas, ya
  borradas. Esta historia no lo leyó aparte del D1 de producción —ningún agente del bucle corre
  nada con `--remote` fuera de la orden—; si se quiere verlo, la lectura de solo lectura es
  `SELECT COUNT(*) FROM eventos WHERE ruta <> '/__comprobacion/' AND (via IS NOT NULL OR zona IS NOT
  NULL OR tramo IS NOT NULL OR filtros IS NOT NULL OR indexable IS NOT NULL OR primera IS NOT
  NULL)`, que tiene que dar 0 mientras el sitio en vivo siga en la v7.1, porque su guion no emite
  ninguno de esos campos.

### Recuentos por (jornada, evento), antes → después — 2026-10-24, 23:13 UTC

Copiados de la salida de la orden, sin las balizas de prueba. **Coinciden en toda jornada
cerrada.** La del día —la 2026-10-24 UTC, que el sitio en vivo seguía escribiendo mientras corría
la orden y que cerraba 47 minutos después— solo podía crecer, y la orden lo exige así (también para
la víspera, por el reloj del Worker al cruzar la medianoche); aquí no creció: no llegó ninguna
vista entre las dos lecturas, separadas por menos de un minuto (de antes de migrar a después de
barajar).

| Jornada | Evento | Antes | Después |
|---|---|---:|---:|
| 2026-09-04 | vista-de-cita | 197 | 197 |
| 2026-09-05 | comparticion-de-imagen | 1 | 1 |
| 2026-09-05 | vista-de-cita | 570 | 570 |
| 2026-09-06 | comparticion-de-imagen | 1 | 1 |
| 2026-09-06 | vista-de-cita | 172 | 172 |
| 2026-09-07 | vista-de-cita | 30 | 30 |
| 2026-09-08 | vista-de-cita | 1 | 1 |
| 2026-09-09 | vista-de-cita | 2 | 2 |
| 2026-09-10 | vista-de-cita | 1 | 1 |
| 2026-09-11 | vista-de-cita | 1 | 1 |
| 2026-09-13 | vista-de-cita | 21 | 21 |
| 2026-09-14 | vista-de-cita | 70 | 70 |
| 2026-09-15 | vista-de-cita | 68 | 68 |
| 2026-09-16 | vista-de-cita | 55 | 55 |
| 2026-09-17 | vista-de-cita | 44 | 44 |
| 2026-09-18 | vista-de-cita | 101 | 101 |
| 2026-09-19 | vista-de-cita | 178 | 178 |
| 2026-09-20 | copiado | 4 | 4 |
| 2026-09-20 | vista-de-cita | 60 | 60 |
| 2026-09-21 | vista-de-cita | 50 | 50 |
| 2026-09-22 | vista-de-cita | 60 | 60 |
| 2026-09-23 | vista-de-cita | 74 | 74 |
| 2026-09-24 | descarga-de-imagen | 2 | 2 |
| 2026-09-24 | vista-de-cita | 80 | 80 |
| 2026-09-25 | vista-de-cita | 76 | 76 |
| 2026-09-26 | vista-de-cita | 63 | 63 |
| 2026-09-27 | vista-de-cita | 85 | 85 |
| 2026-09-28 | vista-de-cita | 68 | 68 |
| 2026-09-29 | vista-de-cita | 488 | 488 |
| 2026-09-30 | vista-de-cita | 62 | 62 |
| 2026-10-01 | vista-de-cita | 90 | 90 |
| 2026-10-02 | vista-de-cita | 59 | 59 |
| 2026-10-03 | vista-de-cita | 72 | 72 |
| 2026-10-04 | vista-de-cita | 87 | 87 |
| 2026-10-05 | vista-de-cita | 69 | 69 |
| 2026-10-06 | vista-de-cita | 70 | 70 |
| 2026-10-07 | vista-de-cita | 85 | 85 |
| 2026-10-08 | vista-de-cita | 76 | 76 |
| 2026-10-09 | vista-de-cita | 76 | 76 |
| 2026-10-10 | vista-de-cita | 68 | 68 |
| 2026-10-11 | vista-de-cita | 58 | 58 |
| 2026-10-11 | vista-de-superficie | 1 | 1 |
| 2026-10-12 | vista-de-cita | 43 | 43 |
| 2026-10-12 | vista-de-superficie | 16 | 16 |
| 2026-10-13 | vista-de-cita | 45 | 45 |
| 2026-10-13 | vista-de-superficie | 4 | 4 |
| 2026-10-14 | vista-de-cita | 38 | 38 |
| 2026-10-14 | vista-de-superficie | 2 | 2 |
| 2026-10-15 | vista-de-cita | 61 | 61 |
| 2026-10-15 | vista-de-superficie | 7 | 7 |
| 2026-10-16 | vista-de-cita | 28 | 28 |
| 2026-10-16 | vista-de-superficie | 4 | 4 |
| 2026-10-17 | vista-de-cita | 26 | 26 |
| 2026-10-17 | vista-de-superficie | 10 | 10 |
| 2026-10-18 | vista-de-cita | 30 | 30 |
| 2026-10-18 | vista-de-superficie | 2 | 2 |
| 2026-10-19 | vista-de-cita | 44 | 44 |
| 2026-10-19 | vista-de-superficie | 3 | 3 |
| 2026-10-20 | vista-de-cita | 54 | 54 |
| 2026-10-20 | vista-de-superficie | 3 | 3 |
| 2026-10-21 | vista-de-cita | 56 | 56 |
| 2026-10-21 | vista-de-superficie | 2 | 2 |
| 2026-10-22 | vista-de-cita | 65 | 65 |
| 2026-10-22 | vista-de-superficie | 1 | 1 |
| 2026-10-23 | vista-de-cita | 82 | 82 |
| 2026-10-23 | vista-de-superficie | 2 | 2 |
| 2026-10-24 (en curso) | vista-de-cita | 71 | 71 |
| 2026-10-24 (en curso) | vista-de-superficie | 6 | 6 |

Totales por evento, antes y después: `vista-de-cita` 4.130, `vista-de-superficie` 63, `copiado` 4,
`comparticion-de-imagen` 2, `descarga-de-imagen` 2; en total, **4.201 → 4.201**. Ninguna jornada
del 2026-09-12: no tenía filas antes y tampoco después.

### Pendiente: la primera jornada cerrada tras el despliegue

El criterio «se lee la primera jornada cerrada tras el despliegue: sus eventos siguen llegando como
antes» **no se puede cumplir todavía** y queda pendiente: lo hace **el orquestador del bucle
v8-ralph antes del merge de la 23.11**. La primera jornada que cierra después del despliegue es la
2026-10-24 UTC (a las 00:00 UTC del 2026-10-25, con sus últimos 47 minutos ya bajo el receptor
nuevo); la primera **entera** bajo el receptor nuevo es la 2026-10-25 UTC, que cierra a las 00:00
UTC del 2026-10-26. Lo que se mira es que sus `vista-de-cita` y `vista-de-superficie` sigan en el
orden de las jornadas de antes —de 26 a 90 vistas de Cita y de 1 a 16 de superficie por día en
octubre—, y no a cero.

Si dejan de llegar: se vuelve a desplegar desde la principal el receptor de la principal (el de la
v7.1, ya con el `rowid` aleatorio de la 23.12); las migraciones no se revierten, porque sus
columnas nuevas admiten nulo; la rama no sigue hasta saber por qué, y esa vuelta atrás deja
rancia la huella, así que la 23.3 se repite desde la rama antes de seguir (`DESPLIEGUE.md` §3).

### Lo que no es de esta historia

- **El plan contratado de Cloudflare.** La orden contó el barajado contra la cuota del plan
  gratuito (100.000 filas escritas al día); revisar qué plan tiene la cuenta y anotarlo en
  `DESPLIEGUE.md` §3 es de la 23.11, acto de Héctor.
- **`comprobar`** lo corre la 23.11 el día del merge, desde la rama, contra esta misma huella.
- **Mientras viva la rama de la Épica 23, el receptor no se despliega desde la principal**, salvo la
  vuelta atrás de arriba: si se hace, la huella de la rama queda rancia y la 23.3 se repite.

## Verificación

- `npm test` en la rama, antes de commitear la huella: 130 ficheros en verde y uno en rojo,
  `tests/unit/huella.test.ts`, que es el rojo a propósito de la 23.2 (`.claude/v8-ralph/logs/s-23/
  s23-3-npm-test-pre.log`).
- `npm test` en la rama con la huella y este registro commiteados: se anota en el resultado del
  bucle; tiene que salir entero en verde, la prueba de la huella incluida.
