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
