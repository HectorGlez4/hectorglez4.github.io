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
