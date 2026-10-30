---
title: 'Historia 27.9 — La búsqueda con filtros llega al sitio en vivo'
type: 'operativa'
created: '2026-10-30'
status: 'in-review'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-26-11-la-obra-y-los-directorios-llegan-juntos-al-sitio-en-vivo.md'
---

# Historia 27.9 — La búsqueda con filtros llega al sitio en vivo

Historia operativa que cierra la Épica 27 (rama `v8/epica-27`), que entra en la principal en un
solo merge. Este registro empieza por la parte previa al merge; lo que viene después (build,
`astro check`, Vitest, `npm run test:e2e` entero contra un receptor local, NFR-7 con Lighthouse en
`/buscar/` y en una Página de Cita frente a la principal del mismo día, merge, despliegue y el valor
de `DESPLIEGUE_DE_LA_BUSQUEDA_CON_FILTROS`) se anota aquí a medida que se haga. Tras el merge no se
comprueba nada en el sitio en vivo: abrir `/buscar/` o una página escribiría en el D1 de producción,
y siguen siendo dos las pasadas que escriben allí, la 25.3 y la 25.7.

## Registro operativo

### 2026-10-30 05:35 UTC — preparación previa al merge (bucle v8-ralph)

**(a) La jornada de llegada de la 27, declarada sin valor.** `src/lib/umbrales.ts` no la tenía.
Se declara `DESPLIEGUE_DE_LA_BUSQUEDA_CON_FILTROS: string | undefined = undefined`, con la forma de
`DESPLIEGUE_DE_LA_LECTURA` y `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS`, en su propio commit. Le da valor
Héctor —en este bucle, con su autorización del 2026-10-24— en un commit aparte del día en que
termine el «Desplegar» de Actions que lleve la 27 al sitio en vivo, nunca la del merge (AD-9).

- **No entra en `CORTES_DE_SERIE_DECLARADOS` ni en `CORTES_DE_SM8`**: la combinación de filtros de
  `busqueda` ya era del vocabulario de la 23 y `/buscar/` no emite vista, así que la 27 no cambia el
  instrumento de SM-8 ni parte la serie de la búsqueda (si la partiera, la línea base de las
  búsquedas volvería a empezar, en vez de juzgarse SM-6 y SM-13 contra su propia serie).
- **No entra en la línea SM-11 del informe de indexación** (`tools/lib/indexacion.ts`): la búsqueda
  no cambia lo que SM-11 compara.

**La orden de la 23.10 la lee.** `juiciosPorVentanas` de `tools/lib/lineaBase.ts` tenía SM-6 y
SM-13 con `llegada: undefined` («sin constante todavía: la da la 27.9»); ahora leen la constante,
importada y no copiada. El cálculo de ventanas ya era genérico: con la llegada dentro de la línea
base de las búsquedas y antes de su cierre, la primera ventana empieza la jornada siguiente a la
llegada, frente a la serie de antes; la jornada de llegada se salta en la línea base y en las
ventanas, y el informe la da aparte («No cuentan, porque cambiaron: …»). Tres pruebas nuevas en
`tests/unit/linea-base.test.ts` («Historia 27.9 — SM-6 y SM-13, contadas desde la llegada de la
búsqueda con filtros»), con respuestas fijas y sin fijar el valor de la constante: la tabla lee la
constante; con valor, las ventanas cuentan desde la jornada siguiente y la de llegada no entra en
ninguna y se informa como «cambió»; sin valor, no se salta ninguna jornada y las ventanas cuentan
desde el cierre de la línea base. `npx vitest run tests/unit/linea-base.test.ts`: 79 de 79.
`DESPLIEGUE.md` §3 lo dice en el párrafo de las ventanas.

**(b) La rama al día con la principal.** `git fetch origin` y `git merge origin/main`: «Already up
to date». La punta de `origin/main` es bbcc43b7d0 («docs(epicas): «Buscar en esta obra» bajo el
listado, por la puerta de la 27.8»), que ya es la base de la rama, y el `main` local del checkout
principal está en la misma punta: no hubo commit de merge que hacer. La rama lleva 38 commits sobre
la base antes de este registro.

**Pendiente antes del merge:** `npm run build`, `astro check`, `npm test` entero y
`npm run test:e2e` entero sobre la rama construida con la medición contra un receptor local; NFR-7
con Lighthouse en perfil móvil 4G en `/buscar/` con un Autor y una Obra en la dirección y en una
Página de Cita, frente a la principal del mismo día construida y servida igual.

## Verificación previa a la fusión — 2026-10-30

Bucle v8-ralph, etapa s-27, intento 1, sobre `af61d21b6e`. `df -g /`: 105 GB libres. Puertos 4321,
4399, 4400, 4402 y 8787 libres al empezar y al terminar.

- **Sincronía.** `git fetch origin`: `origin/main` (bbcc43b7d0) ya es antepasado de la rama; no hubo
  merge.
- **`npm ci`**: no hizo falta; `package-lock.json` y `node_modules/.package-lock.json` coinciden.
- **`npm run build`** (con `MEDICION_ENDPOINT=http://localhost:8787/`): **pasa**. 5290 páginas,
  4875 rutas indexables, NFR-5 con 5115 superficies a 3 saltos o menos, Directorio de Obras de
  235.068 bytes, `dist/` juzgado en 480,3 MiB (aviso en 750 MiB), filtros y mapa de `/buscar/` en
  94,7 KiB (aviso en 120 KiB).
- **`npx astro check`**: **pasa**, 402 ficheros, 0 errores, 0 avisos, 8 sugerencias.
- **`npm test`**: **pasa**, 152 ficheros y 7027 pruebas, en 891 s.
- **`npm run test:e2e`** (los dos proyectos, receptor local con `wrangler dev` y D1 local):
  **falla**. 1011 pasan, 101 se saltan, 1 falla y 49 no corren (el resto de
  `tests/e2e/receptor.spec.ts` en escritorio, que va en serie tras el fallo).
  - Falla `[escritorio] tests/e2e/receptor.spec.ts:443` «Historia 23.1 — cada superficie descarga
    exactamente el guion de medición › la búsqueda descarga el guion de medición, una vez, y nada
    más»: `/buscar/ pidió /medicion/9e2382e9.js,
    /_astro/Busqueda.astro_astro_type_script_index_0_lang.DEmCydXO.js, /_astro/recuentos.B_30A4jF.js`,
    frente al esperado `["/medicion/9e2382e9.js"]`. La prueba exige para `/buscar/` exactamente el
    fichero de medición, y desde la 27.2 la página carga además el `<script>` procesado de
    `Busqueda.astro` (ya en `GUIONES_EXTERNOS`) y su trozo `recuentos`.
  - Repetida sola (`npx playwright test tests/e2e/receptor.spec.ts --project=escritorio`): **falla
    igual** —no es intermitente—, 15 pasan y 49 no corren.
  - El resto del fichero, sin ella (`--grep-invert "la búsqueda descarga el guion de medición"`):
    63 pasan y 1 se salta. No hay ningún otro fallo.
- **NFR-7 (Lighthouse)**: **no se midió**, porque la puerta de las pruebas de punta a punta no pasó.

**Veredicto: no se fusiona.** Queda para el arreglo la prueba de `receptor.spec.ts` (o la carga de
`/buscar/`): decidir si la búsqueda declara sus guiones propios en esa lista de la 23.1 o si la
página no debe pedirlos al cargar.

## Verificación previa a la fusión — 2026-10-30 (intento 2)

Bucle v8-ralph, etapa s-27, intento 2, sobre `e687cf3a8e` (el arreglo de la fila de `/buscar/` en
`receptor.spec.ts`). `df -g /`: 105 GB libres. Puertos 4321, 4399, 4400, 4402 y 8787 libres al
empezar y al terminar.

- **Sincronía.** `git fetch origin`: `origin/main` (bbcc43b7d0) ya es antepasado de la rama; no hubo
  merge.
- **`npm ci`**: no hizo falta; `package-lock.json` no cambia desde el 2026-10-24 y `node_modules`
  se instaló con él.
- **`npm run build`** (con `MEDICION_ENDPOINT=http://localhost:8787/`): **pasa**. 5290 páginas,
  4875 rutas indexables, NFR-5 con 5115 superficies a 3 saltos o menos y las 37398 aristas del
  modelo en `dist/`, Directorio de Obras de 235.068 bytes, `dist/` juzgado en 480,3 MiB (aviso en
  750 MiB), filtros y mapa de `/buscar/` en 94,7 KiB (aviso en 120 KiB).
- **`npx astro check`**: **pasa**, 402 ficheros, 0 errores, 0 avisos, 8 sugerencias.
- **`npm test`**: **pasa**, 152 ficheros y 7027 pruebas, en 881 s.
- **`npm run test:e2e`** (los dos proyectos, receptor local con `wrangler dev` y D1 local):
  1059 pasan, 102 se saltan y 1 falla: `[movil] tests/e2e/busqueda.spec.ts:841` «Historia 27.1 —
  … › filtrar por una Obra y ordenar por la clave da sus Citas en el orden de su Página de Obra, que
  no es el de slug», con `apiRequestContext.get: socket hang up` al pedir
  `/obra/jose-ingenieros/el-hombre-mediocre-ensayo-de-psicologia-y-moral/` al servidor local.
  Repetido el fichero entero (`npx playwright test tests/e2e/busqueda.spec.ts`, los dos
  proyectos): **pasa**, 176 pasan y 6 se saltan. Es intermitente (la conexión, no la aserción):
  **la puerta de punta a punta pasa**.
- **NFR-7 (Lighthouse 13.5.0, `npx --yes lighthouse@13.5.0`, perfil móvil por omisión, 4G
  simulado, Google Chrome por `CHROME_PATH`)**. Las dos construcciones de hoy con
  `MEDICION_ENDPOINT=http://localhost:8787/` y un receptor de pega que contesta 204 en :8787;
  `origin/main` (bbcc43b7d0) en :4399 y la rama en :4400, las dos con `node tests/servidor.mjs` y
  `SERVIDOR_CACHE_CONTROL=max-age=600`. 10 corridas por página y construcción, alternando principal
  y rama corrida a corrida. Cada woff2 (2 distintos) se pide una sola vez en todos los informes.

  | Página | Construcción | LCP media | LCP mediana | FCP media | FCP mediana |
  |---|---|---|---|---|---|
  | `/cita/seneca-a-cuantos-son-molestas-sus-mismas-riquezas/` | principal | 1758 | 1802 | 1034 | 1066 |
  | ídem | rama | 1772 | 1802 | 1033 | 1064 |
  | `/buscar/` | principal | 1622 | 1652 | 918 | 918 |
  | `/buscar/` | rama | 1877 | 1877 | 1278 | 1278 |

  LCP de cada corrida (ms): Cita principal 1804, 1653, 1802, 1804, 1802, 1802, 1802, 1653, 1653,
  1802; Cita rama 1804, 1802, 1802, 1801, 1802, 1802, 1652, 1803, 1651, 1801; `/buscar/` principal
  1654, 1652, 1502, 1651, 1653, 1652, 1651, 1652, 1652, 1502; `/buscar/` rama 1803, 1802, 1953,
  1802, 1802, 1952, 1802, 1953, 1952, 1951.

  La Página de Cita no se mueve (LCP +14 ms de media, FCP −1 ms). **`/buscar/` empeora**: FCP
  +360 ms de media (918 → 1278, +39 %) y LCP +255 ms (1622 → 1877), todo bajo 2,5 s. La causa que
  da el informe: la rama sirve `/_astro/buscar.BY9-jnIV.css` (4956 bytes) como `<link
  rel="stylesheet">` que bloquea el pintado (`render-blocking-insight`: 152 ms simulados), cuando la
  principal no carga ninguna hoja externa en `/buscar/`; además el HTML pasa de 26.960 a 36.873
  bytes transferidos y la página pide `Busqueda.astro_astro_type_script_index_0_lang.DEmCydXO.js`
  (17.571 bytes) y `recuentos.B_30A4jF.js` (769 bytes).

**Veredicto: no se fusiona.** Las pruebas pasan (build, `astro check`, `npm test` y
`npm run test:e2e` con una intermitencia que se repite en verde), pero la FCP media de `/buscar/` en
la rama supera la de la principal en más de max(100 ms, 5 %). Queda para el arreglo la hoja
`buscar.*.css` que bloquea el pintado (pasa por poco del límite con que Astro incrusta las hojas en
la página) y, si hace falta, el peso del HTML de `/buscar/`.
