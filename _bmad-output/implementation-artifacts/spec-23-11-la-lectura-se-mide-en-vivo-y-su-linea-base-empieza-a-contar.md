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
      Confirmar en el panel de Cloudflare el plan contratado, que wrangler 4.151.1 no expone (se
      conservan las cuotas del plan gratuito, las conservadoras); si no es el gratuito, poner al
      día en un diff visible las cuotas con nombre de la 23.10
      (CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1 y CUOTA_DE_BYTES_POR_BASE_EN_D1) y anotarlo en
      DESPLIEGUE.md §3.
    owner: 'Héctor'
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

### Paso de fusión — 2026-10-25

Lo de arriba lo hizo el orquestador del bucle v8-ralph en la sesión principal el **2026-10-25,
entre las 17:20 y las 17:22 UTC**, con la autorización de Héctor del 2026-10-24, y el paso de
fusión de la etapa s-23 lo anota aquí y en `DESPLIEGUE.md` §3 («El día de la fusión de la 23»)
antes de crear el merge. El paso de fusión no corrió nada contra el D1 de producción, el Worker ni
el sitio en vivo.

- **El plan contratado de Cloudflare: sin verificar.** `wrangler` 4.151.1 no lo expone. `d1 info
  medicion` a las 17:21 UTC: 905 kB, 13.294 filas escritas en 24 h (casi todas del barajado de la
  23.3) y 50.818 leídas. Se conservan las cuotas del plan gratuito, que son las conservadoras, así
  que `CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1` y `CUOTA_DE_BYTES_POR_BASE_EN_D1` no cambian. Lo
  confirma Héctor en el panel de Cloudflare (queda en `pending`).
- **Los eventos del sitio en vivo siguen llegando.** La jornada UTC 2026-10-25 no ha cerrado,
  pero a las 17:20 UTC ya llevaba 72 `vista-de-cita` y 10 `vista-de-superficie`, el nivel de una
  jornada entera (2026-10-24: 74 y 6; 2026-10-23: 82 y 2); la 2026-10-24 pasó de 71
  `vista-de-cita` al correr `desplegar` a 74. Los eventos de la v7.1 llegan con las columnas nuevas
  a nulo, como se espera. Si este merge llega al sitio en vivo hoy, la 2026-10-25 será mixta (v7.1
  y v8): la jornada de llegada lo es siempre, y la primera entera de la v8 es la siguiente.
- **`npm run medicion -- comprobar`, desde la rama, a las 17:22 UTC**: código 0 al primer intento
  de tres; 87 balizas enviadas y 86 filas leídas, que casan con la huella de la rama
  (`b4303b0e7c`); descarta lo ajeno, numera al azar y las balizas se borraron. No hace falta repetir
  la 23.3. Salida en `.claude/v8-ralph/logs/s-23/orq-comprobar.log`.
- **La puerta** pasó en el intento 2 («Verificación previa a la fusión — 2026-10-25 (intento 2)»,
  abajo), sobre `a98156f7f2`; `origin/main` (`ed5a3f47e2`) sigue siendo antecesor de la rama, así
  que no hubo que fusionarla ni repetir la puerta.

### Tras el despliegue

Ninguno es condición para fusionar. Con el merge desplegado y en vivo: dar valor a
`DESPLIEGUE_DE_LA_LECTURA` —la jornada UTC en que termina el trabajo «Desplegar» de Actions, no la
del merge (AD-9)— en un commit aparte del día en que llega, del que sale la primera entrada de
`CORTES_DE_SM8` (nadie escribe una fecha en la lista); y, cerrada la primera jornada UTC completa
tras la llegada, correr `npm run medicion` y anotar con fecha en `DESPLIEGUE.md` §3 las filas
escritas frente a la cuota, el tamaño de la base y cada evento nuevo con sus filas o nombrado sin
ellas. La línea base de cada métrica empieza a contar desde esa jornada.

## Verificación previa a la fusión — 2026-10-25

Puerta previa a la fusión de la etapa s-23 (rama `v8/epica-23`, intento 1), en el worktree
`.claude/worktrees/v8-epica-23`, sobre `fa1c4a125b`, entre las 15:20 y las 15:55 UTC. Node v24.3.0,
npm 11.4.2. 107 GB libres. Los puertos 4321, 4399, 4400, 4402 y 8787 estaban libres al empezar y
quedan libres al terminar. No se corrió nada con `--remote` ni contra el D1 de producción, el
Worker o el sitio en vivo. **Resultado: la puerta no pasa** —una prueba de punta a punta falla dos
veces— y por eso NFR-7 no se midió.

- **Sincronía.** `git fetch origin`: `origin/main` (`ed5a3f47e2`) ya es antecesor de `HEAD`, así
  que no hubo fusión ni conflictos.
- **`npm ci`** — no se corrió: `package-lock.json` cambió por última vez el 2026-10-24 a las
  21:27 (+02:00) y `node_modules` se instaló después, el 2026-10-25 a las 01:11.
- **`npm run build`** (`logs/s-23/gate-build.log`) — en verde, `EXIT:0`: 5.288 páginas en 1 min
  24 s; el sitemap, los `noindex`, Pagefind y la marca de Obra coinciden (4.873 rutas indexables);
  Pagefind indexa 4.873 páginas. Un solo aviso, `[fichas-de-obra]`, el de siempre. El peso:
  467.049.898 bytes (445,4 MiB) en 15.339 ficheros; juzgado 466.951.408 bytes (445,3 MiB), quedan
  304,7 MiB hasta el aviso de 750 MiB; 5.116 PNG, sin tope.
- **`npx astro check`** (`logs/s-23/gate-astro-check.log`) — en verde, `EXIT:0`: 335 ficheros,
  0 errores, 0 avisos, 20 sugerencias.
- **`npm test`** (desprendido, `logs/s-23/gate-npm-test.log`) — en verde, `EXIT:0`: 132 ficheros
  y 6.048 pruebas pasadas, 0 fallidas, en 703,1 s.
- **`npm run test:e2e`** entero, los dos proyectos (desprendido, `logs/s-23/gate-e2e.log`), con
  los dos `webServer` de `playwright.config.ts`: el receptor local (`npm run medicion -- local`,
  `wrangler dev` con el D1 local) y el sitio construido con
  `MEDICION_ENDPOINT=http://localhost:8787/` — en rojo, `EXIT:1`: de 674 pruebas, **574 pasadas,
  11 fallidas y 89 omitidas**, en 7,9 min con 5 trabajadores. Las once son pruebas de barrido del
  sitemap entero que se paran por tiempo (ninguna llega a su aserción):
  `seo.spec.ts:48`, `:59`, `:68` y `:126`, `tarjeta.spec.ts:79` y `:154`, y `dominio.spec.ts:34`,
  entre los dos proyectos.
- **Repetición de los ficheros que fallaron**, una vez, con un solo trabajador para quitar la
  competencia (`npx playwright test tests/e2e/seo.spec.ts tests/e2e/tarjeta.spec.ts
  tests/e2e/dominio.spec.ts --workers=1`, `logs/s-23/gate-e2e-repeticion.log`) — `EXIT:1`: 39
  pasadas y **1 fallida**: `[escritorio] › tests/e2e/seo.spec.ts:126:3 › Historia 2.7 — nada
  huérfano › toda página publicada se alcanza desde la portada en pocos saltos`, otra vez por
  tiempo («Test timeout of 90000ms exceeded», 1,8 min; la de `[movil]` pasó en 1,5 min). Falla dos
  veces, así que cuenta como fallo de la puerta. Las otras diez fueron inestabilidad por carga.
  Para quien la arregle: no llega a la aserción —recorre en el navegador, con seis pestañas,
  cada página alcanzable desde la portada, y se queda sin los 90 s de `test.slow()`—. No es
  nueva de hoy: en los registros de la rama (`.claude/v8-ralph/logs/s-23/`), las ocho pasadas del
  2026-10-24 hasta las 17:26 (+02:00; `e2e-1.log` a `e2e-3.log`, `e2e-seo-solo.log`,
  `e2e-seo-movil-solo.log`) tardaron 1,1–1,8 min y fallaron una vez; las trece desde las 18:24
  (`rev1-seo*.log`, `rev2-seo*.log`, `rev2-e2e.log` y las dos de hoy) tardaron 1,5–2,9 min y
  fallaron diez. No se buscó la causa.
- **NFR-7** — no se midió: la puerta lo pide solo con los pasos de build, comprobación y pruebas
  en verde. Lighthouse 13.5.0 quedó preparado por `npx` para la siguiente puerta.

## Verificación previa a la fusión — 2026-10-25 (intento 2)

Puerta previa a la fusión de la etapa s-23 (rama `v8/epica-23`, intento 2), en el worktree
`.claude/worktrees/v8-epica-23`, sobre `a98156f7f2` —el arreglo del recorrido de «nada huérfano»
que pidió el intento 1—, entre las 16:40 y las 17:20 UTC. Node v24.3.0, npm 11.4.2. 103 GB
libres. Los puertos 4321, 4399, 4400, 4402 y 8787 estaban libres al empezar y quedan libres al
terminar. No se corrió nada con `--remote` ni contra el D1 de producción, el Worker o el sitio en
vivo. **Resultado: la puerta pasa** —construcción, comprobación, pruebas de unidad y de punta a
punta en verde, con ocho fallos de punta a punta por carga que pasan a la repetición— y NFR-7 no
empeora.

- **Sincronía.** `git fetch origin`: `origin/main` (`ed5a3f47e2`) ya es antecesor de `HEAD`, así
  que no hubo fusión ni conflictos.
- **`npm ci`** — no se corrió: `package-lock.json` cambió por última vez el 2026-10-24 a las
  21:27 (+02:00) y `node_modules` se instaló después, el 2026-10-25 a las 01:11.
- **`npm run build`** (`logs/s-23/gate2-build.log`) — en verde, `EXIT:0`: 5.288 páginas en 1 min
  25 s; el sitemap, los `noindex`, Pagefind y la marca de Obra coinciden (4.873 rutas
  indexables); Pagefind indexa 4.873 páginas. Un solo aviso, `[fichas-de-obra]`, el de siempre.
  El peso: 467.049.898 bytes (445,4 MiB) en 15.339 ficheros; juzgado 466.951.408 bytes
  (445,3 MiB), quedan 304,7 MiB hasta el aviso de 750 MiB; 5.116 PNG, sin tope.
- **`npx astro check`** (`logs/s-23/gate2-astro-check.log`) — en verde, `EXIT:0`: 335 ficheros,
  0 errores, 0 avisos, 20 sugerencias.
- **`npm test`** (desprendido, `logs/s-23/gate2-npm-test.log`) — en verde, `EXIT:0`: 132 ficheros
  y 6.048 pruebas pasadas, 0 fallidas, en 706,8 s.
- **`npm run test:e2e`** entero, los dos proyectos (desprendido, `logs/s-23/gate2-e2e.log`), con
  los dos `webServer` de `playwright.config.ts`: el receptor local (`npm run medicion -- local`,
  `wrangler dev` con el D1 local) y el sitio construido con
  `MEDICION_ENDPOINT=http://localhost:8787/` — `EXIT:1`: de 674 pruebas, **577 pasadas,
  8 fallidas y 89 omitidas**, en 6,4 min con 5 trabajadores y la máquina a carga media 17–22. Las
  ocho son barridos del sitemap entero que se paran por tiempo sin llegar a su aserción
  («Test timeout of 30000ms exceeded» o, en la de Tarjetas, de 90000 ms): `[movil]`
  `rutas-de-salida.spec.ts:98`, `seo.spec.ts:59` y `:68`, `tarjeta.spec.ts:79` y `:154`;
  `[escritorio]` `seo.spec.ts:59` y `:68` y `tarjeta.spec.ts:154`. La de «nada huérfano»
  (`seo.spec.ts:126`), que falló dos veces en el intento 1, **pasó en los dos proyectos**: 1,5 min
  en móvil y 1,4 min en escritorio.
- **Repetición de los ficheros que fallaron**, una vez, con un solo trabajador para quitar la
  competencia (`npx playwright test tests/e2e/rutas-de-salida.spec.ts tests/e2e/seo.spec.ts
  tests/e2e/tarjeta.spec.ts --workers=1`, `logs/s-23/gate2-e2e-repeticion.log`) — en verde,
  `EXIT:0`: **46 pasadas**, 0 fallidas, en 6,9 min (`seo.spec.ts:126` en escritorio, 1,0 min).
  Ninguna prueba falla dos veces: las ocho fueron inestabilidad por carga.
- **NFR-7** (`logs/s-23/gate2-nfr7-*.log`) — **no empeora**. Lighthouse **13.5.0** por
  `npx -y lighthouse@13.5.0`, con Google Chrome 155.0.8059.85 (`CHROME_PATH`, `--headless=new`),
  solo la categoría de rendimiento y el preajuste móvil por omisión: `formFactor: mobile`,
  limitación simulada (`simulate`), 4G lento —150 ms de RTT, 1.638,4 kbps— y CPU ×4. La página:
  la Página de Cita `/cita/antonio-machado-caminante-no-hay-camino-se-hace-camino/`, que admite
  Imagen (`data-imagen` en el marcado) y es idéntica en el Corpus de las dos ramas. Las dos
  construcciones, de hoy, con `MEDICION_ENDPOINT=http://localhost:8787/ npm run build` y un
  receptor ficticio en 8787 que contesta 204 a todo con CORS abierto —el mismo para las dos,
  recibió las balizas de cada pasada—, servidas con `node tests/servidor.mjs` (`DIST`,
  `PUERTO=4400`). Primero `git switch --detach origin/main` (`ed5a3f47e2`), construcción y cinco
  pasadas; después `git switch v8/epica-23`, reconstrucción y cinco pasadas. Carga media de la
  máquina durante las pasadas: 9–10 (principal) y 7–9 (rama).

  | Construcción | LCP (ms) por pasada | Mediana LCP | FCP mediana | TBT | CLS |
  |---|---|---|---|---|---|
  | `origin/main` `ed5a3f47e2` | 1952, 1953, 1803, 1802, 1953 | **1952** | 1353 | 0 | 0 |
  | `v8/epica-23` `a98156f7f2` | 1952, 1952, 1952, 1952, 1951 | **1952** | 1352 | 0 | 0 |

  La rama queda por debajo de 2.500 ms y de la mediana de la principal más 100 ms: veredicto
  **ok**. La página de la rama pesa 27.670 bytes de HTML frente a 28.346 y pide además el fichero
  de medición (`/medicion/514e7587.js`, 3.813 bytes transferidos): 185.763 bytes en total frente a
  182.626, con el mismo LCP.
