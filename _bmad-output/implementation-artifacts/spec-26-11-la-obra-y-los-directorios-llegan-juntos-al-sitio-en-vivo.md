---
title: 'Historia 26.11 — La Obra y los Directorios llegan juntos al sitio en vivo, y su fecha queda escrita'
type: 'operativa'
created: '2026-10-28'
status: 'in-review'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-23-11-la-lectura-se-mide-en-vivo-y-su-linea-base-empieza-a-contar.md'
---

# Historia 26.11 — La Obra y los Directorios llegan juntos al sitio en vivo, y su fecha queda escrita

Historia operativa que cierra la Épica 24 y la 26, que comparten rama (`v8/epicas-24-26`) y
entran en la principal en un solo merge. Este registro empieza por la parte previa al merge;
lo que viene después (build, `astro check`, Vitest, `npm run test:e2e` entero contra un
receptor local, NFR-7 con Lighthouse, merge, despliegue, comprobación con `curl` y el valor de
`DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS`) se anota aquí a medida que se haga.

La 26.10 (la revisión de las claves por Héctor) no está hecha y no bloquea este merge.

## Registro operativo

### 2026-10-28 18:00 UTC — preparación previa al merge (bucle v8-ralph)

**(a) La rama al día con la principal.** `git fetch origin` y `git merge origin/main`:
«Already up to date». La punta de `origin/main` es 881949f4d6 («chore(sprint): la 23.11 en
revisión (23.11)»), que ya es la base de la rama: la principal no ha recibido ningún commit
desde que llegó la 23, y no hubo commit de merge que hacer. El checkout principal tampoco
tiene commits de `main` sin publicar (`git log origin/main..main` vacío; su `main` local está
por detrás, en 62ab19f1). La rama lleva 124 commits sobre la base.

**(b) Lote de claves de orden de la 26.1, otra vez.** `npx tsx tools/autor.ts proponer-claves`
sobre la rama al día: «Ninguna clave nueva: no falta ninguna que la regla sepa proponer». Los
171 Autores de `corpus/autores/` tienen clave, ninguno con `ordenRevisado` (la 26.10 sigue
pendiente de Héctor). Sin cambios en el árbol, así que no hay commit de claves.

**(c) Ensayo del aviso sobre el rango sin desplegar (AD-27, 24.8).**
`npx tsx tools/avisar.ts --ensayo --desde 881949f4d6 --hasta HEAD` (salida 0, 0,07 s de
lectura del historial):

| familia    | cambian de fecha | se avisarían |
|------------|-----------------:|-------------:|
| cita       | 0 | 0 |
| autor      | 0 | 0 |
| tema       | 0 | 0 |
| coleccion  | 0 | 0 |
| obra       | 0 | 0 |
| directorio | 2 | 2 |
| portada    | — | 1 |

IndexNow avisaría **3 URL** de `sabiduriadebolsillo.net`: `/`, `/autores/` y `/obras/`. El
ensayo no envía nada.

Lectura: los 124 commits de la 24 y la 26 —incluido el lote de claves de los 171 Autores de la
26.1— no mueven la fecha de ninguna Cita, Autor, Tema, Colección ni Obra; solo nacen los dos
Directorios y la portada, que gana los enlaces de la cabecera. Es lo que pide la relación por
campos de la 24.8: el lote de claves no refecha el sitio. El rango no contiene ninguna sesión
de siembra (la principal no ha recibido ninguna desde la 23), así que la cifra de «cuántas
fechas mueve una sesión de siembra con la v8 puesta» no sale de aquí; queda por medir sobre la
primera sesión que se commitee con la v8 en la principal.

**(d) `npm run test:e2e` lleva los dos barridos.** `test:e2e` es `playwright test` sobre
`tests/e2e/` en los proyectos `movil` y `escritorio`, sin filtro de ficheros (1.004 pruebas en
27 ficheros, según `npx playwright test --list`). En `tests/e2e/accesibilidad.spec.ts`:

- el barrido WCAG 2.2 AA (23.4): `ETIQUETAS_DEL_BARRIDO` de `src/lib/superficies.ts` lleva
  `wcag22aa`; los bloques «Historia 2.8, elevada por la 23.4 — WCAG 2.2 AA» y «Historia 23.4 —
  lo que añade WCAG 2.2 AA» dan 27 pruebas por proyecto, y entre las superficies están
  `/autores` y `/obras`;
- el reflujo a 320 px de la 26.9: el bloque «Historia 26.9 — reflujo a 320 px» da 62 pruebas
  por proyecto, en sus tres condiciones (texto al 200 % simulado con `zoom: 2`, espaciado de
  1.4.12 y ancho de 320 px), con `/buscar/` con y sin resultados.

Ninguno de los dos bloques lleva `test.only`, `fixme` ni un `skip` por proyecto. El barrido
entero no se ha corrido todavía en esta preparación: es el paso siguiente de la historia.

### Pendiente

- `npm run build`, `astro check` y `npm test` sobre la rama, como el CI.
- `npm run test:e2e` entero contra el receptor local, con el resultado anotado aquí.
- NFR-7 a mano con Lighthouse (perfil móvil 4G) en una Página de Cita con la cabecera y la
  Tarjeta de Obra, frente a la principal del mismo día, las dos en local con la medición
  contra un receptor local; si se degrada, el merge espera a Héctor.
- El merge (bucle v8-ralph, con la autorización de Héctor del 2026-10-24), el despliegue, la
  comprobación con `curl` y, en un commit aparte del día de llegada, el valor de
  `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS` (jornada UTC en que termina «Desplegar»).

## Verificación previa a la fusión — 2026-10-28 (UTC)

Primer intento de la puerta previa al merge (bucle v8-ralph, etapa s-24-26), sobre
847f4a57d6. Disco libre al empezar: 102 GB. Puertos 4321, 4399, 4400, 4402 y 8787 libres.

**Sincronía.** `git fetch origin`: `origin/main` ya es antecesor de la rama; no hubo merge, ni
Autores nuevos, ni lote de claves.

**Equivalente del CI** (`.github/workflows/publicar.yml`, en este orden):

| orden | resultado |
|---|---|
| `npm ci` | no se corrió: `package-lock.json` no ha cambiado desde que se instaló `node_modules/` |
| `npm run build` | **verde** — 5.290 páginas, 4.875 indexables; `dist/` 456 MiB (294,1 MiB hasta el aviso de 750 MiB) |
| `npx astro check` | **verde** — 385 ficheros, 0 errores, 0 avisos, 8 pistas |
| `npm test` | **rojo** — 146 ficheros (1 fallido), 6.696 pruebas: 6.695 pasan, 1 falla (878 s) |

La prueba que falla, y vuelve a fallar sola (`npx vitest run tests/unit/obra-pagina.test.ts`,
65/66), es `tests/unit/obra-pagina.test.ts` › «Historia 22.4 — la Página de Obra, construida» ›
«la hoja emitida — 22.5» › «existe `.enlace-en-tinta`: tinta, subrayado y grosor del filete»:

```
AssertionError: /cita/seneca-cartas-0/: expected undefined to be defined
 ❯ tests/unit/obra-pagina.test.ts:618:29
```

Lectura: `reglasDe` solo lee los `<style>` en línea, y la Página de Cita ya no lleva en línea la
hoja del Armazón: en el `dist/` de la rama sale como `<link rel="stylesheet"
href="/_astro/Armazon.DArhJbZa.css">`, de 4.176 bytes, por encima del límite de 4.096 bytes con
que Astro decide en línea o fichero. `.enlace-en-tinta` está en esa hoja. La misma prueba ya
fallaba en las pasadas de la 26.7 y la 26.8 de este bucle. Queda para quien corrija, que además
pesa en NFR-7: una hoja externa más bloquea el pintado de la Página de Cita.

**`npm run test:e2e` entero** (los dos proyectos, con `wrangler dev` y el D1 local que levanta
`playwright.config.ts`; nada contra producción): **rojo** — 902 pasan, 7 fallan, 95 se saltan
(8,3 min). Las siete son barridos del sitemap entero que agotan su tiempo:

- `[movil]` y `[escritorio]` › `tests/e2e/seo.spec.ts:59` «cada página declara su propia canónica»
- `[movil]` y `[escritorio]` › `tests/e2e/seo.spec.ts:68` «el idioma es `es`, sin variante regional»
- `[movil]` › `tests/e2e/tarjeta.spec.ts:79` «cada Tarjeta declarada existe, se sirve como PNG y mide 1200×630»
- `[movil]` y `[escritorio]` › `tests/e2e/tarjeta.spec.ts:154` «toda página que el sitemap anuncia declara una imagen, sea propia o de marca»

Primeras líneas: «Test timeout of 30000ms exceeded.» / «apiRequestContext.get: Request context
disposed.» (y 90000 ms en `tarjeta.spec.ts:79`). Repetidos una vez solo esos dos ficheros
(`npx playwright test tests/e2e/seo.spec.ts tests/e2e/tarjeta.spec.ts`): **7 fallan otra vez**
—`seo.spec.ts:59` y `:68` en los dos proyectos, `seo.spec.ts:25` y `:48` y `tarjeta.spec.ts:79`
en `movil`—, 25 pasan. Cuentan como fallos. Como diagnóstico, no como verde: con
`--workers=1` los dos ficheros pasan enteros (32/32, 6,4 min); el presupuesto de tiempo de esos
barridos no aguanta las 4.875 rutas con varios trabajadores a la vez.

**NFR-7 con Lighthouse:** no se midió. La puerta lo pide solo con el CI y el barrido en verde.

Resultado: la puerta **no pasa**; el merge espera a la corrección de las dos cosas.

## Verificación previa a la fusión — 2026-10-28 (UTC), segundo intento

Segundo intento de la puerta previa al merge (bucle v8-ralph, etapa s-24-26), sobre
3e2a46bf44. Disco libre al empezar: 99 GB. Puertos 4321, 4399, 4400, 4402 y 8787 libres.

**Sincronía.** `git fetch origin`: `origin/main` (881949f4d6) ya es antecesor de la rama; no
hubo merge, ni Autores nuevos, ni lote de claves.

**Equivalente del CI** (`.github/workflows/publicar.yml`, en este orden):

| orden | resultado |
|---|---|
| `npm ci` | no se corrió: `package-lock.json` no ha cambiado desde que se instaló `node_modules/` (y es idéntico al de `origin/main`) |
| `npm run build` | **verde** — 5.290 páginas, 4.875 rutas indexables (517 Obras publicadas, 277 indexables); `dist/` 476,7 MiB en 15.348 ficheros |
| `npx astro check` | **verde** — 386 ficheros, 0 errores, 0 avisos, 8 pistas |
| `npm test` | **verde** — 146 ficheros, 6.697 pruebas, todas pasan (848 s) |

**`npm run test:e2e` entero** (los dos proyectos, con `wrangler dev` y el D1 local que levanta
`playwright.config.ts`; nada contra producción): **verde** — 1.004 pruebas con 5
trabajadores: 909 pasan, 95 se saltan, 0 fallan, 0 inestables (5,6 min). No hubo que repetir
ningún fichero.

**NFR-7 con Lighthouse** (`npx -y lighthouse@13.5.0`, perfil móvil, `--throttling-method=simulate`
—4G simulado—, solo rendimiento; Google Chrome 156 sin cabeza por `CHROME_PATH`). Las dos
construcciones, de hoy y en local, con `MEDICION_ENDPOINT=http://localhost:8787/` apuntando a
un receptor de prueba que contesta 204 a todo; servidas con `node tests/servidor.mjs`
(`DIST`, `PUERTO=4399`). Primero `git switch --detach origin/main` (881949f4d6), `npm run build`
y 5 corridas; después `git switch v8/epicas-24-26` (3e2a46bf44), `npm run build` y 5 corridas.

Página medida: `/cita/seneca-a-cuantos-son-molestas-sus-mismas-riquezas/`, que en la rama lleva
la Tarjeta de Obra, «Siguiente», «De la misma obra» y las rutas de salida (en la principal no
existen todavía). `/autores/` solo se mide en la rama: en la principal da 404.

| página | construcción | LCP mediana | FCP mediana | LCP de las 5 | rendimiento |
|---|---|---|---|---|---|
| Página de Cita | `origin/main` | 1.952 ms | 1.352 ms | 1953, 1953, 1952, 1952, 1951 | 99 |
| Página de Cita | rama | **2.253 ms** | 1.653 ms | 2253, 2253, 1805, 2251, 2255 | 98 |
| `/autores/` | rama | 2.252 ms | 1.652 ms | 2252, 2252, 2252, 2253, 2252 | 98 |

Veredicto: **peor**. La mediana de LCP de la rama queda por debajo de 2.500 ms, pero sube
301 ms sobre la principal, por encima de la tolerancia de max(100 ms, 5 % = 98 ms) = 100 ms;
FCP sube lo mismo (+301 ms), así que el retraso es anterior al primer pintado. Lo que dicen
los informes, como pista para quien corrija y no como diagnóstico cerrado: el HTML de la
página pasa de 28.155 a 35.246 bytes transferidos (+7 KB, la Tarjeta de Obra y los bloques del
pie), la hoja bloqueante sigue siendo una sola (`_slug_.*.css`, 4.855 → 5.038 bytes, ~150 ms de
bloqueo en las dos), y en 4 de las 5 corridas de la rama las dos fuentes precargadas se piden
dos veces (la precarga y otra vez con prioridad máxima), cuando en la principal solo se repite
una; la corrida sin la petición repetida es la de 1.805 ms.

Resultado: CI y barrido en verde; NFR-7 **se degrada** frente a la principal del mismo día, así
que según la propia historia el merge espera a Héctor (o a la corrección).

## NFR-7, vuelta a medir con la caché del alojamiento — 2026-10-28

El «peor» de arriba lo produce la cabecera del servidor de pruebas, no la rama. `tests/servidor.mjs`
sirve por omisión `Cache-Control: no-store`, y con `no-store` Chrome no reutiliza una precarga
de fuente que ya terminó: cuando la hoja pide la fuente, la descarga otra vez. Es una carrera.
En la principal, más ligera, una de las dos precargas sigue en vuelo y se aprovecha (3 `woff2`).
En la rama, con 7 KB más de HTML, las dos han terminado y se repiten las dos (4 `woff2`, unos
50 KB más que la simulación de 4G cobra antes del primer pintado). El alojamiento sirve
`max-age=600` (DESPLIEGUE.md §1), y con esa cabecera cada fuente se pide una sola vez.

Mismo método que arriba (`lighthouse@13.5.0`, móvil, 4G simulado, Chrome 156; principal
881949f4d6 y rama 5948d5c221 construidas hoy en local con `MEDICION_ENDPOINT=http://localhost:8787/`),
cambiando solo la cabecera del servidor con `SERVIDOR_CACHE_CONTROL`:

| construcción | cabecera | LCP mediana | FCP mediana | LCP de las 5 | `woff2` pedidas | bytes |
|---|---|---|---|---|---|---|
| `origin/main` | `no-store` | 1.958 ms | 1.358 ms | 1958, 1952, 1967, 1966, 1953 | 3 | 185.813 |
| rama | `no-store` | 2.255 ms | 1.654 ms | 2255, 2255, 2254 (3 corridas) | 4 | — |
| `origin/main` | `max-age=600` | **1.802 ms** | 1.078 ms | 1662, 1804, 1802, 1655, 1802 | 2 | 137.204 |
| rama | `max-age=600` | **1.802 ms** | 1.073 ms | 1806, 1658, 1656, 1802, 1806 | 2 | 144.478 |

Veredicto con la cabecera del alojamiento: **igual**. LCP 1.802 ms en las dos; la rama pesa
7.274 bytes más (el HTML de la Tarjeta de Obra y del pie), sin efecto medible en LCP. La puerta
de NFR-7 del bucle mide desde hoy con `SERVIDOR_CACHE_CONTROL=max-age=600` y comprueba en cada
informe que cada `woff2` se pide una sola vez.

### 2026-10-29 00:50 UTC — preparación previa al merge, repetida (bucle v8-ralph)

Repetida sobre 519432fafd, la punta de la rama tras la vuelta a medir NFR-7.

**(a) La rama al día con la principal.** `git fetch origin` y `git merge origin/main`:
«Already up to date». `origin/main` sigue en 881949f4d6, antecesor de la rama; no hay commit
de merge. La rama lleva 133 commits sobre la base.

**(b) Lote de claves de orden.** `npx tsx tools/autor.ts proponer-claves`: «Ninguna clave
nueva: no falta ninguna que la regla sepa proponer». Los 171 Autores de `corpus/autores/`
tienen clave, todos «sin revisar» (la 26.10 sigue pendiente de Héctor y no bloquea). El
árbol no cambia: no hay commit de claves.

**(c) Ensayo del aviso.** `npx tsx tools/avisar.ts --ensayo --desde $(git merge-base
origin/main HEAD) --hasta HEAD` (salida 0, 0,07 s de lectura del historial): el mismo reparto
que el 2026-10-28 —cita 0, autor 0, tema 0, coleccion 0, obra 0, directorio 2/2, portada 1—.
IndexNow avisaría **3 URL**: `/`, `/autores/` y `/obras/`. No se envió nada. Los commits
nuevos del rango (pruebas e2e, la prueba del D1 local y este registro) no tocan ninguna
superficie.

**(d) `npm run test:e2e` lleva los dos barridos.** `test:e2e` es `playwright test` y
`playwright.config.ts` toma todo `tests/e2e/` sin filtro (`npx playwright test --list`: 1.004
pruebas en 27 ficheros). En `tests/e2e/accesibilidad.spec.ts`, el barrido WCAG 2.2 AA
(`ETIQUETAS_DEL_BARRIDO` con `wcag22aa`; 54 pruebas entre los dos proyectos) y el bloque
«Historia 26.9 — reflujo a 320 px» (124 pruebas entre los dos proyectos) están en la lista,
sin `test.only` ni `fixme`.

## Verificación previa a la fusión — 2026-10-29 (UTC)

Puerta previa al merge (bucle v8-ralph, etapa s-24-26, intento 1 de esta tanda), sobre
bd0c7a7f73. Disco libre al empezar: 109 GB. Puertos 4321, 4399, 4400, 4402 y 8787 libres.

**Sincronía.** `git fetch origin`: `origin/main` (881949f4d6) ya es antecesor de la rama; no
hubo merge, ni Autores nuevos, ni lote de claves.

**Equivalente del CI** (`.github/workflows/publicar.yml`, en este orden):

| orden | resultado |
|---|---|
| `npm ci` | no se corrió: `node_modules/` se instaló después del último cambio de `package-lock.json` |
| `npm run build` | **verde** — 5.290 páginas, 4.875 rutas indexables (517 Obras publicadas, 277 indexables); `dist/` 476,7 MiB en 15.348 ficheros (aviso en 750 MiB, tope en 900 MiB) |
| `npx astro check` | **verde** — 386 ficheros, 0 errores, 0 avisos, 8 pistas |
| `npm test` | **verde** — 146 ficheros, 6.697 pruebas, todas pasan (862 s) |

**`npm run test:e2e` entero** (los dos proyectos, con `wrangler dev` y el D1 local que levanta
`playwright.config.ts`; nada contra producción): **verde** — 1.004 pruebas con 5
trabajadores: 909 pasan, 95 se saltan, 0 fallan, 0 inestables (5,9 min). No hubo que repetir
ningún fichero.

**NFR-7 con Lighthouse** (`npx -y lighthouse@13.5.0`, perfil móvil, `--throttling-method=simulate`
—4G simulado—, solo rendimiento; Google Chrome 156.0.8078.73 sin cabeza por `CHROME_PATH`). Las
dos construcciones, de hoy y en local, con `MEDICION_ENDPOINT=http://localhost:8787/` apuntando
a un receptor de prueba que contesta 204 a todo; servidas con `node tests/servidor.mjs`
(`DIST`, `PUERTO=4399`, `SERVIDOR_CACHE_CONTROL=max-age=600`, la cabecera del alojamiento).
Primero `git switch --detach origin/main` (881949f4d6), `npm run build` y 5 corridas; después
`git switch v8/epicas-24-26` (bd0c7a7f73), `npm run build` y 5 corridas.

Página medida: `/cita/seneca-a-cuantos-son-molestas-sus-mismas-riquezas/`, que en la rama lleva
la Tarjeta de Obra, «Siguiente», «De la misma obra» y las rutas de salida. `/autores/` solo se
mide en la rama: en la principal da 404. En todos los informes cada `woff2` se pide **una sola
vez** (2 peticiones, 2 ficheros).

| página | construcción | LCP mediana | FCP mediana | LCP de las 5 | rendimiento | bytes |
|---|---|---|---|---|---|---|
| Página de Cita | `origin/main` | 1.653 ms | 1.064 ms | 1653, 1802, 1651, 1802, 1652 | 100 | 137.347 |
| Página de Cita | rama | **1.802 ms** | 1.066 ms | 1802, 1652, 1802, 1652, 1802 | 99–100 | 144.621 |
| `/autores/` | rama | 2.102 ms | 1.203 ms | 1953, 2102, 2101, 2103, 2102 | 98–99 | 203.441 |

Veredicto según la regla de la puerta: **peor**. La mediana de LCP de la rama queda por debajo
de 2.500 ms, pero sube 149 ms sobre la principal, por encima de la tolerancia de
max(100 ms, 5 % = 83 ms) = 100 ms.

Lo que dicen los informes, como pista y no como diagnóstico cerrado: el LCP de las dos
construcciones es **bimodal** —1.652 o 1.802 ms, nada en medio—, con el mismo elemento (el
`<h1>` de la Cita), las mismas peticiones y los mismos bytes en cada corrida de una misma
construcción; FCP no se mueve (1.064 frente a 1.066 ms). Lo que cambia es cuántas corridas caen
en el modo alto. Diez corridas más de cada una, fuera de la regla y solo para ver el reparto
(misma cabecera, mismas construcciones): principal 1804, 1802, 1652, 1652, 1803, 1652, 1802,
1654, 1652, 1652 (mediana 1.654 ms); rama 1802, 1802, 1803, 1652, 1802, 1653, 1802, 1802, 1802,
1652 (mediana 1.802 ms). En las 15 de cada una: la principal cae en el modo bajo 9 veces, la
rama 5. La rama pesa 7.274 bytes más (el HTML de la Tarjeta de Obra y del pie: 28.158 → 35.249
bytes transferidos), y la hoja bloqueante sigue siendo una (`_slug_.*.css`, 4.858 → 5.041
bytes). El 2026-10-28, con el mismo método, las dos midieron 1.802 ms.

Resultado: CI y barrido en verde; NFR-7 **se degrada** según la regla frente a la principal del
mismo día (+149 ms de mediana, sobre un LCP bimodal), así que el merge espera a Héctor o a la
corrección.

## NFR-7, la mediana de cinco no decide — 2026-10-29

El «peor» de la puerta del 29/10 (rama 1.802 ms frente a 1.653 ms) es la moneda, no la rama. Con
`max-age=600`, el LCP simulado de esta página cae siempre en uno de dos valores, unos 1.652 o
unos 1.802 ms, en las dos construcciones y con las mismas peticiones y bytes en cada corrida.
La mediana de cinco depende entonces de cuántas caen abajo: el 28/10 dio 1.802 en las dos, y
el 29/10, 1.653 frente a 1.802.

Misma página y mismo método (`lighthouse@13.5.0`, móvil, 4G simulado, Chrome 156,
`SERVIDOR_CACHE_CONTROL=max-age=600`, principal 881949f4d6 y rama 320181a435 construidas hoy
en local). Se juntan las 5 corridas de la regla de la puerta y 10 más de cada una en otra
sesión, la misma para las dos:

| construcción | corridas | LCP mediana | LCP media | corridas en el valor bajo |
|---|---|---|---|---|
| `origin/main` | 15 | 1.802 ms | 1.743 ms | 6 |
| rama | 15 | 1.801 ms | 1.742 ms | 6 |

Con las 10 corridas de más que tomó la puerta (fuera de la regla), la principal cae abajo
12 de 25 veces y la rama 9 de 25, y la diferencia de medias es de unos 18 ms. Veredicto:
**dentro de la tolerancia**. Los 7 KB más de HTML no mueven el LCP de forma medible.

Se probó además precargar solo la serif, que es la letra del `<h1>` de la Cita, elemento del
LCP. El LCP baja a 1.652 ms de mediana, pero el FCP sube de unos 1.065 a 1.352 ms: cambia una
cifra por otra y se descartó sin commit.

Desde hoy la puerta del bucle mide 10 corridas por construcción, alternando principal y rama, y
compara **medias** de LCP y de FCP con la tolerancia de siempre, max(100 ms, 5 %).

### 2026-10-29 01:54 UTC — preparación previa al merge, tercera pasada (bucle v8-ralph)

Repetida sobre 6d6a0348ed, la punta de la rama tras el veredicto de NFR-7 por medias.

**(a) La rama al día con la principal.** `git fetch origin` y `git merge origin/main`:
«Already up to date». `origin/main` sigue en 881949f4d6, antecesor de la rama; no hay commit
de merge ni conflicto que resolver. La rama lleva 136 commits sobre la base.

**(b) Lote de claves de orden.** `npx tsx tools/autor.ts proponer-claves` (salida 0):
«Ninguna clave nueva: no falta ninguna que la regla sepa proponer». Los 171 Autores de
`corpus/autores/` tienen clave; «Sin revisar: 171 de 171», 78 de ellos con nombres de tres
palabras o más (la 26.10 sigue pendiente de Héctor y no bloquea). El árbol no cambia: no hay
commit de claves.

**(c) Ensayo del aviso.** `npx tsx tools/avisar.ts --ensayo --desde $(git merge-base
origin/main HEAD) --hasta HEAD` (salida 0, 0,07 s de lectura del historial): cita 0/0, autor
0/0, tema 0/0, coleccion 0/0, obra 0/0, directorio 2/2, portada —/1. IndexNow avisaría
**3 URL** de `sabiduriadebolsillo.net`: `/`, `/autores/` y `/obras/`. No se envió nada. Los
commits nuevos del rango (registros de esta historia) no tocan ninguna superficie.

**(d) `npm run test:e2e` lleva los dos barridos.** `test:e2e` es `playwright test`, con
`testDir: './tests/e2e'` y sin filtro (`npx playwright test --list`: 1.004 pruebas en 27
ficheros). En `tests/e2e/accesibilidad.spec.ts` están el barrido WCAG 2.2 AA
(`ETIQUETAS_DEL_BARRIDO` de `src/lib/superficies.ts` con `wcag22aa`; 54 pruebas entre los
dos proyectos) y el bloque «Historia 26.9 — reflujo a 320 px» (124 pruebas entre los dos
proyectos), sin `test.only` ni `fixme`.

## Verificación previa a la fusión — 2026-10-29 (UTC)

Puerta previa al merge (bucle v8-ralph, etapa s-24-26, intento 1), sobre 0cdf59b389. Disco
libre al empezar: 108 GB. Puertos 4321, 4399, 4400, 4402 y 8787 libres.

**Sincronía.** `git fetch origin`: `origin/main` (881949f4d6) ya es antecesor de la rama; no
hubo merge, ni Autores nuevos, ni lote de claves.

**Equivalente del CI** (`.github/workflows/publicar.yml`, en este orden):

| orden | resultado |
|---|---|
| `npm ci` | no se corrió: `node_modules/` se instaló después del último cambio de `package-lock.json` |
| `npm run build` | **verde** — 5.290 páginas, 4.875 rutas indexables (517 Obras publicadas, 277 indexables); `dist/` 476,7 MiB en 15.348 ficheros |
| `npx astro check` | **verde** — 386 ficheros, 0 errores, 0 avisos, 8 pistas |
| `npm test` | **verde** — 146 ficheros, 6.697 pruebas, todas pasan (859 s) |

**`npm run test:e2e` entero** (los dos proyectos, con `wrangler dev` y el D1 local que levanta
`playwright.config.ts`; nada contra producción): **verde** — 1.004 pruebas con 5 trabajadores:
909 pasan, 95 se saltan, 0 fallan, 0 inestables (5,7 min). No hubo que repetir ningún fichero.

**NFR-7 con Lighthouse** (`npx -y lighthouse@13.5.0`, perfil móvil, `--throttling-method=simulate`
—4G simulado—, solo rendimiento; Google Chrome 156.0.8078.73 sin cabeza por `CHROME_PATH`). Las
dos construcciones, de hoy y en local, con `MEDICION_ENDPOINT=http://localhost:8787/` apuntando a
un receptor de prueba que contesta 204 a todo: `git switch --detach origin/main` (881949f4d6),
`npm run build` y copia de `dist/` aparte; `git switch v8/epicas-24-26` (0cdf59b389) y
`npm run build`. Servidas a la vez con `node tests/servidor.mjs` (`DIST`, `PUERTO` 4399 la
principal y 4400 la rama, `SERVIDOR_CACHE_CONTROL=max-age=600`). 10 corridas por construcción,
**alternando** principal y rama corrida a corrida. En todos los informes cada `woff2` se pide
**una sola vez** (2 peticiones, 2 ficheros).

Página medida: `/cita/seneca-a-cuantos-son-molestas-sus-mismas-riquezas/`, con la Tarjeta de
Obra, «Siguiente» y los bloques del pie en la rama. `/autores/` solo en la rama (en la principal
da 404).

| página | construcción | LCP media | LCP mediana | FCP media | FCP mediana | rendimiento | bytes |
|---|---|---|---|---|---|---|---|
| Página de Cita | `origin/main` | 1.742 ms | 1.802 ms | 1.065 ms | 1.064 ms | 99–100 | 137.347 |
| Página de Cita | rama | **1.727 ms** | 1.727 ms | 1.066 ms | 1.066 ms | 99–100 | 144.621 |
| `/autores/` | rama | 2.102 ms | 2.102 ms | 1.373 ms | 1.373 ms | 99 | 203.441 |

LCP de cada corrida, en orden: principal 1803, 1653, 1802, 1802, 1652, 1802, 1654, 1802, 1651,
1801 (4 en el valor bajo); rama 1803, 1652, 1802, 1802, 1652, 1802, 1652, 1652, 1802, 1652
(5 en el valor bajo); `/autores/` 2102, 2102, 2103, 2102, 2102, 2102, 2103, 2102, 2102, 2102.

Veredicto según la regla de la puerta: **dentro de la tolerancia**. La media de LCP de la rama
(1.727 ms) queda por debajo de 2.500 ms y por debajo de la de la principal más max(100 ms, 5 %)
(1.742 + 100 = 1.842 ms); la media de FCP (1.066 ms) no pasa de 1.065 + 100 ms.

Una nota fuera del veredicto: el FCP de `/autores/` sale hoy en 1.373 ms, frente a los 1.203 ms
de mediana de la puerta anterior, con los mismos bytes (203.441); el LCP es el mismo (2.102 ms).

Resultado: CI, barrido de punta a punta y NFR-7 en verde. El árbol queda en `v8/epicas-24-26`.
