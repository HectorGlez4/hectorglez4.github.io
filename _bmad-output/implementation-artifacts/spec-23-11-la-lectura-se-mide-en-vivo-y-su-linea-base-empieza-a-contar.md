---
title: 'Historia 23.11 — La lectura se mide en vivo y su línea base empieza a contar'
type: 'operativa'
created: '2026-10-25'
status: 'in-review'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-23-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-23-3-la-migracion-y-el-receptor-llegan-antes-que-el-sitio.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-23-10-la-linea-base-se-lee-desde-tools-con-la-cuota-de-d1-a-la-vista.md'
pending:
  - summary: >-
      Revisar el plan contratado de Cloudflare y anotarlo en DESPLIEGUE.md §3; si no es el
      gratuito, poner al día en un diff visible las cuotas con nombre de la 23.10
      (CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1 y CUOTA_DE_BYTES_POR_BASE_EN_D1).
    owner: 'orquestador del bucle v8-ralph, en la sesión principal, para el paso de fusión'
  - summary: >-
      Comprobar que los eventos del sitio en vivo (v7.1) siguieron llegando tras la 23.3, en la
      primera jornada UTC cerrada bajo el receptor nuevo (la 2026-10-25, que cierra a las
      00:00 UTC del 2026-10-26), y anotarlo en DESPLIEGUE.md §3 y aquí.
    owner: 'orquestador del bucle v8-ralph, en la sesión principal, para el paso de fusión'
  - summary: >-
      Correr desde la rama, el día de la fusión, «npm run medicion -- comprobar» contra el
      receptor desplegado: tiene que casar con la huella de la rama y seguir insertando con rowid
      aleatorio; si no casa, se repite la 23.3 antes de fusionar.
    owner: 'orquestador del bucle v8-ralph, en la sesión principal, para el paso de fusión'
  - summary: >-
      La puerta previa a la fusión: build, astro check y npm test enteros; npm run test:e2e
      entero contra un receptor local; NFR-7 con Lighthouse frente a la principal del mismo día.
      Se anota aquí, en «Verificación previa a la fusión».
    owner: 'paso de puerta del bucle v8-ralph'
  - summary: >-
      Tras el despliegue que llega al sitio en vivo: dar valor a DESPLIEGUE_DE_LA_LECTURA (la
      jornada UTC en que termina «Desplegar»), en un commit aparte del día en que llega, de la que
      sale la primera entrada de CORTES_DE_SM8; y, cerrada la primera jornada UTC completa tras la
      llegada, anotar con fecha en DESPLIEGUE.md §3 las filas escritas frente a la cuota y el
      tamaño de la base que da «npm run medicion».
    owner: 'Héctor, o el bucle v8-ralph con su autorización del 2026-10-24'
---

# Historia 23.11 — La lectura se mide en vivo y su línea base empieza a contar

Historia operativa: cierra la rama de la Épica 23 y la lleva al sitio en vivo. Casi todo lo que
pide son actos sobre producción o sobre la principal —la revisión del plan de Cloudflare,
`npm run medicion -- comprobar` el día de la fusión, el merge, la jornada de despliegue de la 23 y
la primera lectura en vivo—, que en este bucle hace el orquestador desde la sesión principal con la
autorización que Héctor dio en el chat el 2026-10-24. Esa autorización sustituye, solo para el
bucle v8-ralph, el «un agente nunca fusiona» y el «ningún agente corre `desplegar` ni `comprobar`»
del plan, y trae el valor del mínimo de lecturas: **300**.

Lo que se anota sigue la regla del Entorno operativo de `epics.md`: los resultados de la rama
—pruebas, Lighthouse— van aquí, con fecha; lo del vivo —el plan de Cloudflare, los recuentos de D1
de la primera jornada—, en `DESPLIEGUE.md` §3.

## Registro operativo

### Preparación previa a la fusión — 2026-10-25

Corrida el **2026-10-25, hacia las 15:20 UTC**, en el worktree `.claude/worktrees/v8-epica-23`
(rama `v8/epica-23`), partiendo de `d6c7bab988` («chore(sprint): la 23.10 en revisión»). No se
corrió ninguna orden de `wrangler` contra la cuenta ni con `--remote`, ni nada que escriba en el D1
de producción, el Worker o el sitio en vivo.

**El mínimo de lecturas de la línea base, en un diff visible y en su propio commit.**
`eea2aa9abe` «feat(medicion): el mínimo de lecturas de la línea base, 300, valor de Héctor (23.11)»
cambia solo `src/lib/umbrales.ts`: `MIN_LECTURAS_DE_LINEA_BASE: number | undefined` pasa de
`undefined` a **`300`**, y su docblock dice que es el valor de Héctor del 2026-10-24, que ningún
agente lo elige ni lo cambia y que la constante sigue admitiendo `undefined` («sin mínimo
declarado»). Entra antes de leer la primera línea base, como pide la historia: ninguna se ha leído
todavía, porque la 23 no ha llegado al sitio en vivo y `DESPLIEGUE_DE_LA_LECTURA` sigue sin valor.
El valor no lo eligió el agente: lo dio Héctor, y el agente solo lo escribió.

Con él, la lectura de la 23.10 deja de decir «sin mínimo declarado»: cada línea base se cierra la
jornada en que reúne 300 lecturas de su unidad —300 búsquedas asentadas, la de SM-6 y SM-13— y las
ventanas de las tasas reúnen el mismo mínimo. Ninguna prueba fija el valor: las de
`tests/unit/linea-base.test.ts` pasan el mínimo explícito (el ayudante `leer` lo deja en
`undefined` salvo que se le dé otro) o leen el que tenga, y la que juzga los valores del
repositorio («los valores que el repositorio declara hoy se sostienen») acepta 300 como entero
positivo.

`039f35a81f` «docs(medicion): la documentación de la línea base dice que el mínimo ya vale 300
(23.11)» pone al día las dos frases que se volvieron falsas: `AGENTS.md` («sin valor hasta la
23.11») y `DESPLIEGUE.md` §3, «Leer la línea base» («Sin valor, como hoy, …»).

**La lista `PENDIENTES` de la prueba de correspondencia está vacía.** En
`tests/unit/vocabulario.test.ts` (línea 244) se declara
`const PENDIENTES: readonly { … }[] = [];`. La vació la 23.9, la última historia de la épica que
enseña al guion algo del vocabulario; la prueba «lo no pendiente son los once eventos de hoy, y es
lo que el guion emite» exige que el guion emita los once eventos del vocabulario y exactamente los
campos que necesitan, y «la vista de Obra se recorre con cada marca…» exige que ni `vista-de-obra`
ni `indexable` estén pendientes. La lista llega vacía a la principal, como pide la 23.2.

**`npm test` no tiene fallo de huella.** `medicion/huella-del-vocabulario.json` es la que escribió
el `desplegar` de la 23.3 (`escritaEl: 2026-10-24`, del commit `b4303b0e7c`), commiteada en
`6aece9a77f`; `git log 6aece9a77f..HEAD -- src/lib/vocabulario.ts medicion/` está vacío, así que
desde entonces nada ha movido el vocabulario ni el receptor y la huella sigue casando.

Pruebas corridas por fichero, en la rama con el mínimo puesto:

| Orden | Resultado | Registro |
| --- | --- | --- |
| `npx vitest run tests/unit/huella.test.ts tests/unit/vocabulario.test.ts tests/unit/linea-base.test.ts` | 3 ficheros, 119 pruebas, todas en verde (código 0) | `.claude/v8-ralph/logs/s-23/s23-11-unit-umbral.log` |
| `npx vitest run tests/unit/medicion-orden.test.ts tests/unit/medicion-secuencias.test.ts` | 2 ficheros, 154 pruebas, todas en verde (código 0) | `.claude/v8-ralph/logs/s-23/s23-11-unit-huella.log` |

La suite entera, `astro check`, el build, `npm run test:e2e` contra un receptor local y NFR-7 los
corre la puerta, y van en «Verificación previa a la fusión», debajo.

### Pendiente para el paso de fusión, de la sesión principal

Necesitan la cuenta de Cloudflare y el D1 de producción, así que no se hicieron aquí: los hace el
orquestador desde la sesión principal y se los pasa al paso de fusión, que los anota con fecha en
`DESPLIEGUE.md` §3 y en este spec antes de crear el merge.

- **El plan contratado de Cloudflare**, revisado y anotado en `DESPLIEGUE.md` §3. Si no es el
  gratuito, las cuotas con nombre de la 23.10 —`CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1` (hoy
  100.000) y `CUOTA_DE_BYTES_POR_BASE_EN_D1` (hoy 500 MB decimales)— se ponen al día en un diff
  visible. El barajado de la 23.3 se contó con la del plan gratuito.
- **Que los eventos del sitio en vivo siguieron llegando tras la 23.3.** El receptor nuevo
  (versión `23386626-a2b0-4c59-8d69-f78ab906ba10`) está desplegado desde el 2026-10-24 a las
  23:13 UTC; la primera jornada UTC entera bajo él es la **2026-10-25**, que cierra a las 00:00 UTC
  del 2026-10-26. Sus eventos tienen que llegar como antes, porque el sitio en vivo sigue en la
  v7.1.
- **`npm run medicion -- comprobar` desde la rama, el día de la fusión**: el receptor desplegado
  tiene que casar con la huella de la rama y seguir insertando con `rowid` aleatorio. Si no casa
  —el receptor se volvió a desplegar desde la principal—, se repite la 23.3 antes de fusionar.

### Tras el despliegue

Ninguno es condición para fusionar. Con el merge desplegado y en vivo: dar valor a
`DESPLIEGUE_DE_LA_LECTURA` —la jornada UTC en que termina el trabajo «Desplegar» de Actions, no la
del merge (AD-9)— en un commit aparte del día en que llega, del que sale la primera entrada de
`CORTES_DE_SM8` (nadie escribe una fecha en la lista); y, cerrada la primera jornada UTC completa
tras la llegada, correr `npm run medicion` y anotar con fecha en `DESPLIEGUE.md` §3 las filas
escritas frente a la cuota, el tamaño de la base y cada evento nuevo con sus filas o nombrado sin
ellas. La línea base de cada métrica empieza a contar desde esa jornada.
