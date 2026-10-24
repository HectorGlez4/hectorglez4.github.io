---
title: 'Historia 23.4 — El sitio se audita contra WCAG 2.2 AA'
type: 'feature'
created: '2026-10-24'
status: 'done'
baseline_revision: '846aac0fffde7583a8f5e3a550602724760c93f1'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-23-context.md'
warnings: [oversized]
deferred:
  - summary: >-
      La invitación de donación y las ediciones en venta solo se barren contra 2.5.8 a 1280 px: `ingreso-accesible.spec.ts` corre solo en `escritorio`, y nunca a 360 px, donde el tamaño del objetivo importa para el pulgar.
    evidence: |-
      El proyecto `movil` salta las 12 pruebas de `ingreso-accesible.spec.ts` por diseño desde antes de la 23.4 (`test.skip(info.project.name !== PERFIL, …)`), y el intent-contract de la 23.4 prohíbe pasarlo a `movil` («Never»). La sonda de la planificación y la del ac-auditor no midieron esos dos bloques a 360 px. Con los Modelos apagados no se publica ninguno de los dos, así que no hay nada roto hoy; el hueco aparece el día que se encienda uno.
    location: >-
      tests/e2e/ingreso-accesible.spec.ts:323-325
    severity: low
  - summary: >-
      El barrido de `accesibilidad.spec.ts` cuenta dos veces la misma Página de Obra: la muestra derivada sin barra final y la Obra indexable con ella, así que cada perfil barre 11 páginas distintas en 12 rutas.
    evidence: |-
      `superficiesDelBarrido` da `/obra/agustin-alvarez/la-transformacion-de-las-razas-en-america` y `obrasDelBarrido` da la misma ruta con `/` final; el `new Set` de `SUPERFICIES` no normaliza la barra y `tests/servidor.mjs` redirige la primera a la segunda con un 301. Viene de la Historia 22.4, no de la 23.4, y la 23.4 tiene prohibido tocar `superficiesDelBarrido`. Normalizar con `rutaNormalizada` al componer `SUPERFICIES`, o elegir otra Obra indexable cuando coincidan, devolvería la cobertura que el registro creía tener.
    location: >-
      tests/e2e/accesibilidad.spec.ts:109
    severity: low
  - summary: >-
      Lo que axe deja en `incomplete` de las reglas que no responden de un criterio de 2.2 —sobre todo `color-contrast` ante fondos con imagen o degradado— pasa en silencio en los barridos de página entera.
    evidence: |-
      `sinDecidir` (`tests/e2e/ayuda/barrido.ts`) solo mira las reglas de los criterios `comprueba: 'axe'` de `CRITERIOS_QUE_AÑADE_WCAG_22`, que hoy es `target-size`; el resto de `resultado.incomplete` no lo lee ninguna aserción de `accesibilidad.spec.ts` ni de `ingreso-accesible.spec.ts`. Es así desde la Historia 2.8, cuyo barrido solo miraba `violations`, y la 23.4 lo cerró solo para la regla que su título dice que axe comprueba. Decidir si toda duda de axe hace fallar el barrido —y qué hacer con las que el sitio dé hoy— es una política del barrido entero, no de lo que añade 2.2.
    location: >-
      tests/e2e/ayuda/barrido.ts:58
    severity: low
  - summary: >-
      El barrido audita cada página tal como carga: ni el `<dialog>` de la Imagen de Cita abierto, ni `/buscar/` con resultados, ni ningún estado al que se llega interactuando pasan por axe contra WCAG 2.2 AA.
    evidence: |-
      Los únicos `new AxeBuilder(…)` del repositorio están en `tests/e2e/accesibilidad.spec.ts` y `tests/e2e/ingreso-accesible.spec.ts`, y todos analizan la página justo después de `page.goto` (o de servirla). `src/islands/ImagenDeCita.astro` abre un `<dialog>` con su propia región de estado y sus controles, y `/buscar/` pinta los resultados después de cargar; ninguno de los dos estados se barre. Viene de la Historia 2.8, y el AC3 de la 23.4 acota el barrido a las superficies de `superficiesDelBarrido`.
    location: >-
      tests/e2e/accesibilidad.spec.ts:166-184
    severity: low
---

<intent-contract>

## Intent

**Problem:** El barrido axe pide hoy solo `wcag2a`, `wcag2aa`, `wcag21a` y `wcag21aa`, con la lista escrita a mano en tres llamadas de dos ficheros de prueba, y con `@axe-core/playwright` 4.12.1, que fija `axe-core ~4.12.1`: esa versión da `target-size` en enlaces solapados con el mismo destino, justo lo que la v8 va a apilar. El suelo declarado (NFR-9, AD-17, UX-DR103) ya es WCAG 2.2 AA.

**Approach:** `src/lib/superficies.ts`, dueño del barrido, declara una vez las etiquetas (las cuatro de 2.1 más `wcag22aa`) y quién responde de cada criterio que añade 2.2. Las dos pruebas de axe las importan. En el mismo commit, `@axe-core/playwright` y `axe-core` (este, directo) suben a 4.14.0. El barrido corre en `movil` y `escritorio` sin violaciones y su resultado se anota en este spec.

## Boundaries & Constraints

**Always:**
- La lista de etiquetas existe una sola vez: `ETIQUETAS_DEL_BARRIDO` en `superficies.ts`. Toda llamada `.withTags(` de `tests/e2e/` pasa `[...ETIQUETAS_DEL_BARRIDO]`, con la expansión porque `withTags` tipa `string | string[]` y la constante es de solo lectura.
- `wcag22aa`, el bump de las dos dependencias y el `package-lock.json` van en el mismo commit. El diff del lock solo toca `node_modules/axe-core`, `node_modules/@axe-core/playwright` y los `devDependencies` de la raíz. Si toca algo más, se rehace.
- Los criterios de 2.2 se reparten así: 2.5.8 lo comprueba axe con `target-size` (etiqueta `wcag22aa`); 2.4.11 y 2.5.7 no los comprueba axe y los da por cumplidos la UX (`EXPERIENCE.md:469`); 3.2.6, 3.3.7 y 3.3.8 no aplican. El reparto se declara como datos y la prueba lo enuncia en sus títulos.
- Toda violación que aparezca en lo construido se corrige en esta historia, en `src/`, ajustándose a `DESIGN.md` y `EXPERIENCE.md`.
- Los criterios de las Historias 2.8 y 12.3 quedan elevados sin enmendar `epics.md`. El reflujo a 320 px sigue siendo de la 26.9.

**Block If:**
- Corregir una violación exige una decisión de diseño que `DESIGN.md` o `EXPERIENCE.md` no dictan (un tamaño, un color o una disposición nuevos). Se para con `blocked` y se nombra la decisión para Héctor.
- El registro no sirve la 4.14.0 de alguno de los dos paquetes, o el lock no consigue resolver una sola `axe-core` 4.14.0.

**Never:**
- Usar `.disableRules(`, `.exclude(` u `.options(` con reglas apagadas en `tests/e2e/`, quitar una superficie del barrido o bajar un umbral para pasar. Los `.include(…).withRules(['color-contrast'])` acotados de `ingreso-accesible.spec.ts` se quedan: estrechan, no desactivan.
- Editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`, ni tocar `AGENTS.md`.
- Añadir la prueba de 320 px, pasar `ingreso-accesible.spec.ts` al perfil `movil` o cambiar `superficiesDelBarrido`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Solape con el mismo destino | dos `<a href="/x/">` de 30×30 px, el segundo desplazado 12 px, servidos bajo `baseURL` | axe 4.14.0 no da `target-size` | Con 4.12.1 la da: la prueba falla si vuelve la versión vieja |
| Solape con otro destino | igual, el segundo con `href="/y/"` | `target-size` da una violación en el primero | Prueba que la regla está encendida y discrimina |
| axe añade una regla para 2.4.11 o 2.5.7 | una regla de `axe.getRules()` con `wcag2411` | Vitest falla y pide reclasificar el criterio | — |
| Una prueba escribe su lista | `.withTags(['wcag2a', …])` o un literal `'wcag2…'` en `tests/e2e/` | Vitest falla y nombra el fichero | — |
| El lock resuelve otra axe | `axe-core` ≠ 4.14.0, o anidada bajo el adaptador | Vitest falla | — |

</intent-contract>

## Code Map

- `src/lib/superficies.ts:560-587` -- `superficiesDelBarrido`, sin importaciones de axe. Junto a ella van las constantes nuevas. El comentario de cabecera (1-25) enumera las consecuencias: hay que añadir que de aquí salen también las etiquetas del barrido.
- `tests/e2e/accesibilidad.spec.ts:5,7,149-161` -- importa `superficiesDelBarrido`. El bloque `describe('Historia 2.8 — WCAG 2.1 AA')` es el barrido por superficie, que corre en los dos proyectos de `playwright.config.ts` (`movil` a 360×640 y `escritorio`).
- `tests/e2e/ingreso-accesible.spec.ts:7,330-331,563-564` -- dos `withTags` escritos a mano. Las líneas 353 y 597 son el contraste acotado, que no cambia. Solo corre en `escritorio`, en el puerto 4402.
- `tests/unit/superficies.test.ts:1-17,298-361` -- prueba pura, sin build. El gemelo de CI va después del `describe` del barrido.
- `package.json:50` (`"@axe-core/playwright": "^4.12.1"`); `package-lock.json:381-395` (el adaptador, con `axe-core ~4.12.1`) y `:2776-2785` (`axe-core` 4.12.1, ahora transitiva).
- `node_modules/@axe-core/playwright/dist/index.d.ts:21-22` -- `withRules`/`withTags(tags: string | string[])`. Los tipos de la 4.14.0 son idénticos.
- `axe-core` 4.14.0 (`axe.d.ts`: `export = axe`; `tsconfig` tiene `esModuleInterop`, así que vale `import axe from 'axe-core'`) -- `axe.getRules()` funciona en Node. En la 4.14.0, `wcag22aa` = `['target-size']` con `wcag258`. Ninguna regla lleva `wcag2411`, `wcag257`, `wcag326`, `wcag337` ni `wcag338`. `label-content-name-mismatch` deja de ser experimental y corre con `wcag21a`.
- `DESPLIEGUE.md:672-676` -- §4 dice que se le pasa axe a la invitación. Ahí falta decir contra qué.
- Solo lectura, como evidencia: `EXPERIENCE.md:454-456,469` (los 44 px, la exención en línea y «de lo que añade 2.2…»); `ux-designs/…/review-accesibilidad.md:132-136` (los motivos: no hay cabecera fija que tape el foco, no hay arrastre, no hay ayuda, entrada repetida ni autenticación). En `src/` no hay `position: fixed|sticky`, `draggable` ni `type="password"`.
- Sonda de planificación (2026-10-24, `dist/` construido a las 19:16, HEAD `846aac0f`, servidor `tests/servidor.mjs`): axe 4.14.0 inyectado con las cinco etiquetas sobre las 12 rutas del barrido (las 8 derivadas más las 4 Obras), en `movil` y `escritorio`, dio **0 violaciones**. `target-size` corrió: 20 nodos pasan en una Cita. Con 4.12.1 también salen 0. El bloque de ediciones en venta, simulado en una Obra, queda fuera de `target-size` por ir en línea, y la invitación mide 44 px. Ninguna corrección prevista.

## Tasks & Acceptance

**Execution:**
- `package.json`, `package-lock.json` -- `npm install --save-dev @axe-core/playwright@4.14.0 axe-core@4.14.0` (queda `^4.14.0` en los dos), y comprobar el diff del lock -- AD-17: la versión que deja de dar `target-size` en solapes con el mismo destino, y `axe-core` directa porque Vitest la importa.
- `src/lib/superficies.ts` -- exportar `ETIQUETAS_DEL_BARRIDO`, `CRITERIOS_QUE_AÑADE_WCAG_22` (seis entradas con `criterio`, `nivel`, `nombre` y una de tres formas: `{ comprueba: 'axe', regla }`, `{ comprueba: 'ux', motivo }`, `{ comprueba: 'no-aplica', motivo }`) y `etiquetaDeAxe(criterio)`, que convierte `'2.4.11'` en `'wcag2411'`. Las tres con comentario: por qué estas etiquetas, de dónde sale cada motivo y por qué 2.4.11 y 2.5.7 no se dan por comprobados. Poner al día la cabecera -- un solo dueño (AD-17).
- `tests/e2e/accesibilidad.spec.ts` -- importar las tres. El barrido pasa a `.withTags([...ETIQUETAS_DEL_BARRIDO])` y su `describe` se renombra a «Historia 2.8, elevada por la 23.4 — WCAG 2.2 AA». Nuevo `describe('Historia 23.4 — lo que añade WCAG 2.2 AA')` con dos partes. Primero, una prueba por criterio, con el título derivado de la declaración (p. ej. «2.5.8 Tamaño del objetivo (mínimo): lo comprueba axe con target-size», «3.3.8 …: no aplica: no hay autenticación»). Corre el barrido sobre la portada y exige que, entre las reglas ejecutadas (`passes`, `violations`, `incomplete` e `inapplicable`), la de un criterio `axe` esté presente y ninguna regla lleve la etiqueta de un criterio `ux` o `no-aplica`. Segundo, las dos filas de solape de la matriz, con `page.route` bajo `baseURL` y el barrido completo filtrado a `target-size`. El comentario de cabecera nombra la 23.4.
- `tests/e2e/ingreso-accesible.spec.ts` -- importar `ETIQUETAS_DEL_BARRIDO` y usarlo en las dos llamadas `withTags` (330, 564) -- ninguna prueba escribe su lista.
- `tests/unit/superficies.test.ts` -- nuevo `describe('Historia 23.4 — el barrido pide WCAG 2.2 AA desde un solo sitio')`, que fija:
  - las cinco etiquetas;
  - los seis criterios y su reparto (con motivo no vacío donde toca);
  - contra `axe.getRules()`: la regla de cada criterio `axe` existe, lleva su etiqueta y una de `ETIQUETAS_DEL_BARRIDO`; ninguna regla lleva la de un criterio `ux` o `no-aplica`; toda regla con `wcag22a` o `wcag22aa` la cubre un criterio `axe`;
  - el lock con `node_modules/axe-core` y `node_modules/@axe-core/playwright` en 4.14.0, sin `node_modules/@axe-core/playwright/node_modules/axe-core`, y los dos en `devDependencies`;
  - sobre todo `.ts` de `tests/e2e/`: un fichero con `new AxeBuilder(` importa `ETIQUETAS_DEL_BARRIDO` de `superficies.ts`; cada `.withTags(` lleva `[...ETIQUETAS_DEL_BARRIDO]`; no hay `.disableRules(`, `.exclude(` ni `.options(`; no hay literales `'wcag2…'` ni `"wcag2…"`.

  Es el gemelo de CI del barrido local, con el patrón de `publicable-y-alcanzable.test.ts`.
- `src/` (solo si el barrido real da algo) -- corregir según `DESIGN.md`/`EXPERIENCE.md`, o parar con Block If.
- `DESPLIEGUE.md` -- en §4, añadir que el barrido es contra WCAG 2.2 AA, con las etiquetas que declara `ETIQUETAS_DEL_BARRIDO` de `src/lib/superficies.ts`.
- Este spec, en «Auto Run Result» -- anotar el resultado del barrido para el merge de la 23.11: la orden, la fecha, el HEAD, las versiones de axe, los perfiles, las rutas, las pruebas pasadas y saltadas, y 0 violaciones.

**Acceptance Criteria:**
- Given el barrido de `accesibilidad.spec.ts` y el de `ingreso-accesible.spec.ts`, when piden sus etiquetas a axe, then piden exactamente `ETIQUETAS_DEL_BARRIDO` de `src/lib/superficies.ts` (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `wcag22aa`) y ningún fichero de `tests/e2e/` escribe su propia lista (Vitest).
- Given `package-lock.json` tras el commit de `wcag22aa`, when se lee, then `@axe-core/playwright` y `axe-core` resuelven a 4.14.0, con una sola `axe-core`, y en el navegador el barrido no da `target-size` en enlaces solapados con el mismo destino y sí con otro destino (Vitest + Playwright).
- Given las superficies de `superficiesDelBarrido` más las cuatro Obras, when corre `npx playwright test tests/e2e/accesibilidad.spec.ts` en `movil` y `escritorio`, y `ingreso-accesible.spec.ts` en `escritorio`, then no hay ninguna violación ni ninguna regla desactivada o nodo excluido.
- Given el informe de Playwright, when se leen los títulos de «Historia 23.4 — lo que añade WCAG 2.2 AA», then dicen que 2.5.8 lo comprueba axe con `target-size`, que 2.4.11 y 2.5.7 no los comprueba axe y los da por cumplidos la UX, y que 3.2.6, 3.3.7 y 3.3.8 no aplican, cada uno con su motivo. Y pasan.
- Given la historia cerrada, when se lee «Auto Run Result» de este spec, then trae el resultado del barrido local con la orden, la fecha, el HEAD y los recuentos.

## Spec Change Log

## Review Triage Log

### 2026-10-24 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las cinco capas de revisión son externas y el orquestador las corre después de esta pasada; en esta no traían hallazgos, así que no se clasificó nada.

### 2026-10-24 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 15 (high 0, medium 5, low 10)
- defer: 2 (high 0, medium 0, low 2)
- reject: 12 (high 0, medium 0, low 12)
- addressed_findings:
  - `[medium]` `[patch]` La guardia de Vitest no veía un barrido acotado: `.withTags([...ETIQUETAS_DEL_BARRIDO])` seguido de `.withRules(` o `.include(`, un `.withRules(` sobre la página entera, un `AxeBuilder` sin etiquetas, `axeSource` ni `axe.configure(` (blind-hunter, edge-case-hunter, verification-gap, ac-auditor). `faltasDelBarrido` lee ahora cada `new AxeBuilder(…)` hasta su `.analyze()` sin cruzar un `;`, rechaza esas formas y el `AxeBuilder` suelto que no se deja leer así, y su prueba de fuentes inventadas cubre cada caso.
  - `[medium]` `[patch]` Los barridos de página entera solo miraban `violations`, así que ninguno observaba qué reglas corrieron (verification-gap). `desviacionDelBarrido` (`tests/e2e/ayuda/barrido.ts`) coteja en cada barrido de superficie y en los dos de `ingreso-accesible.spec.ts` las reglas ejecutadas con las que el barrido pide según la axe de la página; la sonda de esta pasada confirmó que un `.withRules(['region'])` deja una regla y un `.include('main')` pierde `bypass`.
  - `[medium]` `[patch]` Un `target-size` en `incomplete` pasaba en silencio aunque el título diga que 2.5.8 «lo comprueba axe» (blind-hunter, intent-alignment). `sinDecidir` hace fallar esos mismos barridos si axe deja sin decidir un nodo de una regla de criterio `axe`.
  - `[medium]` `[patch]` Las dos gemelas no llamaban «regla de axe» a lo mismo: una regla experimental llevaba a Vitest a pedir reclasificar lo que el navegador, que no la corre, rechazaría, y la prueba del navegador para 3.2.6 y 3.3.7 no podía fallar porque el barrido no pide la etiqueta de 2.2 A (blind-hunter). `superficies.ts` declara `ETIQUETAS_QUE_AXE_NO_CORRE`, `axeLaCorre` y `elBarridoLaCorre`; Vitest descuenta las experimentales y retiradas, y el navegador mira, para `ux` y `no-aplica`, todas las reglas de la axe de la página, no solo las ejecutadas.
  - `[medium]` `[patch]` Los motivos de 2.4.11, 2.5.7 y 3.3.8 —nada fijo, nada que se arrastre, ninguna contraseña— solo los afirmaba un comentario (blind-hunter, edge-case-hunter, intent-alignment). Vitest busca en `src/` y `public/` lo que los desmentiría, con muestras que prueban que las señales encuentran lo que dicen; el comentario de `superficies.ts` deja de afirmarlo a mano y remite a la prueba.
  - `[low]` `[patch]` La guardia solo leía `.ts` (blind-hunter, edge-case-hunter): ahora lee todo guion de `tests/e2e/`, `.js`, `.mjs`, `.cjs`, `.mts`, `.cts`, `.tsx` y `.jsx` incluidos.
  - `[low]` `[patch]` Las prohibiciones de `.exclude(` y `.options(` saltaban en cualquier fichero de `tests/e2e/`, también sin axe (blind-hunter): ahora solo donde aparece `AxeBuilder`; los literales de etiqueta se siguen buscando en todos.
  - `[low]` `[patch]` Una etiqueta entre comillas invertidas escapaba a la guardia (blind-hunter, intent-alignment): las cuenta, y los dos comentarios de `tests/e2e/` que nombraban etiquetas así se reescriben sin ellas.
  - `[low]` `[patch]` La fijación exacta a la 4.14.0 contra el `^4.14.0` de `package.json` ponía el CI en rojo sin explicar por qué (blind-hunter). Se mantiene exacta, como pide la matriz del intent-contract («axe-core ≠ 4.14.0 → Vitest falla»), y el fallo dice ahora que subir axe es un acto, que el adaptador fija `axe-core ~4.14.0` y qué hay que correr para subirla.
  - `[low]` `[patch]` `DESPLIEGUE.md` §4 copiaba las cinco etiquetas y decía que la lista no estaba escrita en ninguna prueba (blind-hunter, ac-auditor): ya no las enumera, dice que `tests/unit/superficies.test.ts` la fija y que cada barrido comprueba que corrió entero.
  - `[low]` `[patch]` La fila «otro destino» del solape no exigía que el segundo enlace pasara (blind-hunter): lo exige, y comprueba que el que pasa es el segundo.
  - `[low]` `[patch]` El comentario de `ingreso-accesible.spec.ts` decía que la única dependencia de axe era el adaptador (verification-gap, ac-auditor): dice ahora para qué es `axe-core` directa.
  - `[low]` `[patch]` La prueba de 2.5.8 sobre la portada aceptaba `target-size` sin aplicar (ac-auditor): exige que haya pasado o fallado en algún nodo.
  - `[low]` `[patch]` El registro del barrido decía 12 rutas, y son 11 páginas distintas (blind-hunter, ac-auditor): el registro lo dice, y la duplicación, que viene de la 22.4, queda diferida.
  - `[low]` `[patch]` El registro daba como orden la del envoltorio del bucle, con rutas de esta máquina (blind-hunter): da la orden reproducible y deja el envoltorio como lo que es.

Diferidos: los Modelos de ingreso no se barren a 360 px, y la Obra que el barrido cuenta dos veces (los dos en el frontmatter). Rechazados: la prueba de `target-size` que repite la genérica, las seis pasadas sobre la portada, `epics.md` sin enmendar (el intent-contract lo decide), el estado `done` previo a la revisión (esta pasada lo rehace), las líneas del Code Map, `sprint-status.yaml` (lo lleva el orquestador), `test.skip` alrededor del barrido, la 4.12.1 no reproducida en la prueba, que el CI no reproduzca el navegador (AC5), que ninguna prueba nombre la 12.3, el solape probado en página sintética (lo pide el intent-contract) y 2.4.11 y 2.5.7 sin medir (lo pide el intent-contract).

### 2026-10-24 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 14 (high 0, medium 0, low 14)
- defer: 2 (high 0, medium 0, low 2)
- reject: 17 (high 0, medium 0, low 17)
- addressed_findings:
  - `[low]` `[patch]` `package.json` pedía `^4.14.0` para las dos mientras el adaptador fija `axe-core ~4.14.0`, así que un `npm update` podía subir la raíz y dejar otra axe anidada (blind-hunter). Las dos quedan exactas, `4.14.0`; el lock solo cambia esas dos líneas de los `devDependencies` de la raíz, y Vitest exige la forma exacta con el mensaje de cómo subirla.
  - `[low]` `[patch]` La guardia de `tests/e2e/` reconocía el adaptador por el nombre local `AxeBuilder`: importado con otro nombre, por `import()`, heredado o con `axe.run(` a pelo, el barrido escapaba (blind-hunter, edge-case-hunter). `faltasDelBarrido` lo reconoce por el módulo, solo admite `import AxeBuilder from '@axe-core/playwright'`, rechaza `extends AxeBuilder` y, en todo fichero, `axe.run(`/`axe.runPartial(` además de `axe.configure(`; la prueba de fuentes inventadas cubre cada forma y una bien importada.
  - `[low]` `[patch]` La guardia solo leía `tests/e2e/`, y las pruebas de Playwright importan ayudas de `tests/unit/ayuda/` (edge-case-hunter). `ficherosDePlaywright` sigue las importaciones relativas dentro de `tests/` y la prueba exige que llegue a `tests/unit/ayuda/construir.ts`.
  - `[low]` `[patch]` Las señales de 2.4.11 y 2.5.7 no veían `-webkit-sticky`, `setProperty('position', 'fixed')`, la capa superior (`popover`, `dialog.show()`), `mousemove` ni los eventos `drag*`/`drop` (blind-hunter, edge-case-hunter). Los patrones los cubren, con muestras que lo prueban y con `drop-shadow` y `showModal()` entre las inocentes. Que una mención en un comentario las encienda se deja así a propósito (piden revisar, no desmienten) y se dice; una posición en una variable de CSS no se puede leer y también se dice.
  - `[low]` `[patch]` 3.2.6 y 3.3.7 descansaban solo en su motivo, «sin señal que buscar» (blind-hunter, ac-auditor). Ahora tienen la suya —un `mailto:` con destinatario o un `tel:`; un formulario que no sea el de búsqueda— y la prueba exige una señal por cada criterio que axe no mide. El `mailto:?` de compartir y los dos `<form role="search">` no la encienden.
  - `[low]` `[patch]` `DESPLIEGUE.md` §4 no decía de dónde puede venir el rojo del barrido con un Modelo encendido (blind-hunter). Nombra las tres fuentes —violación (con `label-content-name-mismatch`, que la 4.14 corre con las etiquetas de 2.1), barrido que no corrió lo que pide y `target-size` sin decidir— y qué hacer con cada una.
  - `[low]` `[patch]` `ETIQUETAS_QUE_AXE_NO_CORRE` copiaba el `tagExclude` de axe y su prueba se repetía a sí misma (blind-hunter). Vitest la coteja con el `tagExclude` de la axe instalada y la línea circular desaparece.
  - `[low]` `[patch]` La 4.14.0 estaba escrita en seis sitios de la prueba (blind-hunter). Una constante, `AXE_COMPROBADA`, la sostiene en `axe.version`, el lock y `package.json`, y `SUBIR_AXE` dice dónde cambiarla.
  - `[low]` `[patch]` El comentario de `ETIQUETAS_DEL_BARRIDO` decía que las etiquetas de axe son acumulativas, y son disjuntas (blind-hunter). Dice que no se acumulan y que quien barre las suma, y añade que lo que 2.2 quita —4.1.1— axe ya lo marca `wcag2a-obsolete` y retirado.
  - `[low]` `[patch]` El Auto Run Result hablaba de «las tres llamadas `withTags`» (blind-hunter): se rehace con las que hay.
  - `[low]` `[patch]` En `ingreso-accesible.spec.ts` una línea de la cabecera pasaba de 150 caracteres y las dos aserciones del barrido de la Obra no tenían mensaje (blind-hunter): se reparte la línea y las dos nombran la ruta, como las de las superficies.
  - `[low]` `[patch]` `ETIQUETAS_DEL_BARRIDO` solo era de solo lectura para el tipo (edge-case-hunter): se congela con `Object.freeze`, igual que `ETIQUETAS_QUE_AXE_NO_CORRE`, y Vitest lo comprueba.
  - `[low]` `[patch]` `sinDecidir` y `desviacionDelBarrido` solo se habían visto en verde (verification-gap). Una prueba nueva del navegador sirve dos enlaces solapados con el segundo fuera del tabulador —axe deja el primero sin decidir— y exige que `sinDecidir` devuelva exactamente `target-size: a[href="/x/"]`; sobre el mismo resultado, recortado a mano sin `target-size` o con una regla inventada, exige `faltan` y `sobran`, sin acotar ningún barrido.
  - `[low]` `[patch]` El navegador no comprobaba qué axe inyecta el adaptador, y un `node_modules` viejo con otra anidada no lo vería el lock (ac-auditor). `versionesDeAxe` (`tests/e2e/ayuda/barrido.ts`) compara la de la página con la de `axe-core` en la raíz en las dos filas del solape.

Diferidos: lo que axe deja en `incomplete` de las reglas que no responden de un criterio de 2.2 (`color-contrast` sobre todo), y los estados a los que se llega interactuando (el `<dialog>` abierto, `/buscar/` con resultados), los dos de la Historia 2.8 y en el frontmatter. Rechazados: el suelo de Node del adaptador (`package.json` ya pide `>=22.12.0` y el CI corre Node 22), los títulos de `ux`/`no-aplica` (el AC4 los pide así), 4.1.1 sin modelar aparte (axe lo marca `wcag2a-obsolete` y retirado: ninguna regla suya corre con `wcag2a`), los predicados de axe en `src/lib/superficies.ts` (el dueño del barrido, AD-17, y las dos gemelas los usan), las demás incoherencias del registro (el contador de vueltas cuenta `bad_spec`, la primera entrada es un hecho, la orden de Verification es la del bucle), el crecimiento sin Spec Change Log (los parches van al Triage Log; el Change Log es de `bad_spec`), el libro de `deferred-work.md` (ninguna historia de la v8 lo usa: los diferidos van en el frontmatter), las seis pasadas sobre la portada (ya rechazado; solo cuesta en local), vigilar dependencias, integraciones o `dist/` (Pagefind se usa por su API sin su interfaz, las integraciones no inyectan guiones, y lo fijo al cargar ya lo mide el navegador), que la prueba del sitio sea solo local (AC5), los Modelos a 360 px y la Obra duplicada (ya diferidos), que 2.4.11 y 2.5.7 se prueben contra el catálogo de axe y que su guardia vigile `src/` (lo pide el intent-contract), la lista fijada en Vitest (es una aserción, no una lista que se le pase a axe), el solape solo en página sintética (lo pide el intent-contract), el criterio de paso más estricto que el AC3 y que la 2.8 y la 12.3 suban solo por las etiquetas (lectura del AC5).

## Design Notes

Fixture del solape, comprobado en la sonda: con la 4.12.1 marca el primer enlace en los dos casos; con la 4.14.0, solo con otro destino. La URL base tiene que ser http: con `about:blank`, axe no resuelve el destino (`getDestination` → `null`) y marca los dos casos. Por eso se usa `page.route` y no `setContent` en blanco.

```html
<!doctype html><html lang="es"><head><title>Solape</title></head><body><main>
<a href="/x/" style="display:block;width:30px;height:30px;position:absolute;top:0;left:0">x</a>
<a href="/x/" style="display:block;width:30px;height:30px;position:absolute;top:12px;left:12px">y</a>
</main></body></html>
```

Los motivos, del informe de la UX:

| Criterio | Motivo |
|---|---|
| 2.4.11 | ninguna superficie lleva nada fijo que tape el foco |
| 2.5.7 | ninguna función se maneja arrastrando |
| 3.2.6 | el sitio no ofrece ningún mecanismo de ayuda |
| 3.3.7 | ningún proceso pide dos veces el mismo dato |
| 3.3.8 | no hay autenticación |

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores (abarca `tests/e2e` y `tests/unit`).
- `npx vitest run tests/unit/superficies.test.ts` -- expected: verde.
- `/Users/hec/brainlySabiduria/.claude/v8-ralph/correr.sh /Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-23/barrido-23-4.log /Users/hec/brainlySabiduria/.claude/worktrees/v8-epica-23 npx playwright test tests/e2e/accesibilidad.spec.ts tests/e2e/ingreso-accesible.spec.ts` -- expected: verde en `movil` y `escritorio`. `ingreso-accesible` se salta en `movil`, como ya hace. Antes, los puertos 4321 y 4402 tienen que estar libres de procesos ajenos; se espera con `esperar.pl`.
- `npm test`, con `correr.sh` -- expected: verde, salvo la prueba de huella, en rojo aceptado entre la 23.2 y la 23.3 si ya ha entrado la 23.2.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** `src/lib/superficies.ts` declara una vez contra qué se barre: `ETIQUETAS_DEL_BARRIDO` (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, congelada), `CRITERIOS_QUE_AÑADE_WCAG_22` (2.5.8 → `axe`/`target-size`; 2.4.11 y 2.5.7 → `ux`; 3.2.6, 3.3.7 y 3.3.8 → `no-aplica`, cada uno con su motivo), `etiquetaDeAxe`, y `ETIQUETAS_QUE_AXE_NO_CORRE` (congelada) con `axeLaCorre` y `elBarridoLaCorre`, que las dos gemelas usan para llamar «regla de axe» a lo mismo. Las seis llamadas `withTags` de `tests/e2e/` —en `accesibilidad.spec.ts`, el barrido por superficie, la prueba por criterio, las filas del solape y la de la duda; en `ingreso-accesible.spec.ts`, la invitación y la Obra— pasan `[...ETIQUETAS_DEL_BARRIDO]`, y cada barrido de página entera coteja en su resultado que corrió entero y que axe decidió `target-size` en cada nodo. `@axe-core/playwright` y `axe-core` (directa) suben a 4.14.0 en el mismo commit que `wcag22aa` (`229132ce091d2d36f55955063f5d9fb09c94ff0f`), y desde la segunda revisión van exactas en `package.json`. El barrido real no dio ninguna violación, así que `src/` no necesitó corrección y no hubo decisión de diseño que elevar.

**Ficheros.**
- `package.json`, `package-lock.json` — `4.14.0` exacta en las dos; el lock solo cambia `node_modules/@axe-core/playwright`, `node_modules/axe-core` y los `devDependencies` de la raíz, con una sola `axe-core`.
- `src/lib/superficies.ts` — las declaraciones del barrido y del reparto, con su porqué (etiquetas disjuntas, 4.1.1 ya retirado por axe); las etiquetas que axe no corre y los dos predicados; la cabecera que dice que de aquí salen también las etiquetas del barrido.
- `tests/e2e/ayuda/barrido.ts` — `reglasEjecutadas`, `reglasDeLaPagina`, `desviacionDelBarrido`, `sinDecidir` y `versionesDeAxe`: lo que un barrido dice de sí mismo, observado en su resultado y en la página.
- `tests/e2e/accesibilidad.spec.ts` — el barrido renombrado a «Historia 2.8, elevada por la 23.4 — WCAG 2.2 AA», con las etiquetas importadas y el cotejo de lo ejecutado; el `describe` «Historia 23.4 — lo que añade WCAG 2.2 AA», con una prueba por criterio titulada desde la declaración, las dos filas de solape bajo `baseURL` (que exigen además que la axe de la página sea la de la raíz) y la prueba que ve fallar `sinDecidir` y `desviacionDelBarrido`.
- `tests/e2e/ingreso-accesible.spec.ts` — las dos llamadas `withTags` importan la lista y cotejan lo ejecutado, con mensaje que nombra la ruta; los dos `.include(…).withRules(['color-contrast'])` acotados no cambian.
- `tests/unit/superficies.test.ts` — «Historia 23.4 — el barrido pide WCAG 2.2 AA desde un solo sitio»: las cinco etiquetas congeladas, los seis criterios, el cotejo contra `axe.getRules()` sin experimentales y contra el `tagExclude` de axe, la versión (`AXE_COMPROBADA`), el lock y `package.json` exactos, la guardia por módulo sobre `tests/e2e/` y lo que importa de `tests/`, y una señal por criterio que axe no mide, buscada en `src/` y `public/`; cada comprobación con entradas inventadas que prueban que encuentra lo que dice.
- `DESPLIEGUE.md` §4 — el barrido de la invitación es contra WCAG 2.2 AA, con las etiquetas de `ETIQUETAS_DEL_BARRIDO` sin copiarlas, y las tres fuentes posibles de un rojo con qué hacer con cada una.

**Barrido local, para el merge de la 23.11.**
- Orden: `npx playwright test tests/e2e/accesibilidad.spec.ts tests/e2e/ingreso-accesible.spec.ts`, desde la raíz del repositorio. Se lanzó desacoplada de la terminal con el envoltorio del bucle (`correr.sh`), que no cambia la orden.
- Fecha: 2026-10-24, de 21:13 a 21:15 (hora local). Árbol: el de `f08d0004cf219ce8f5a87426482110ed43698a56`, que se commiteó después sin tocar nada de lo barrido (`src/`, `tests/` y `package*.json` idénticos al correr).
- Versiones: `@axe-core/playwright` 4.14.0 y `axe-core` 4.14.0, y la axe inyectada en la página es la de la raíz (lo exigen las filas del solape); Playwright `@playwright/test` ^1.62.1, servidor `tests/servidor.mjs` sobre el `dist/` que construye el `webServer`.
- Perfiles: `movil` (Pixel 7 a 360×640) y `escritorio` (1280×900); `ingreso-accesible.spec.ts` en `escritorio`, en el puerto 4402.
- Rutas del barrido, las mismas en los dos perfiles: 12 rutas que son **11 páginas distintas**, porque la muestra derivada de Obra y la Obra indexable son la misma página con y sin barra final (diferido). Son `/`, `/404`, `/autor/agustin-alvarez`, `/buscar`, `/cita/agustin-alvarez-ahora-empieza-a-haber-quienes-piensen-en`, `/coleccion/achaques-de-necedad`, `/obra/agustin-alvarez/la-transformacion-de-las-razas-en-america/` (derivada e indexable), `/tema/el-amor`, `/obra/alberto-masferrer/el-elogio-del-silencio/` (`noindex`), `/obra/amado-nervo/plenitud/2/` (página 2) y la del título más largo, `/obra/mariano-jose-de-larra/primera-representacion-del-drama-episodico-nuevo-original-en-tres-actos-titulado-don-quijote-de-la-mancha-en-sierra-morena-escrito-por-don-ventura-de-la-vega/`. Con la invitación encendida: portada, `/buscar/` y 404; con las ediciones en venta: la Página de Obra de la copia.
- Resultado: 112 pruebas, **100 pasadas y 12 saltadas** (las 12 de `ingreso-accesible.spec.ts` en `movil`, por diseño); 44 pasadas en `movil` y 56 en `escritorio`; salida 0. **0 violaciones**, ninguna regla desactivada, ningún nodo excluido, **ningún barrido acotado** (las 30 auditorías que cotejan lo que corrió ejecutaron las 64 reglas que piden las cinco etiquetas en esta axe, ni una más ni una menos) y **ningún `target-size` sin decidir** en el sitio. Los seis títulos de «Historia 23.4 — lo que añade WCAG 2.2 AA», las dos filas de solape y la de la duda pasan en los dos perfiles: con el mismo destino `target-size` no da violación y los dos enlaces pasan; con otro destino da una, en el primer enlace, y el segundo pasa; con el vecino fuera del tabulador, `sinDecidir` devuelve `target-size: a[href="/x/"]` y el resultado recortado da `faltan` y `sobran`.

**Verificación.**
- `npx astro check` — 0 errores, 0 avisos, 21 sugerencias (ninguna en los ficheros tocados).
- `npx vitest run tests/unit/superficies.test.ts` — 93 de 93.
- El barrido de arriba — salida 0. Corrió dos veces en esta pasada: la primera, antes de un retoque de formato y de un comentario en `superficies.ts`, con el mismo resultado.
- `npm test` con `correr.sh` (`rev3-npm-test-23-4b.log`) — 126 ficheros, 5389 pruebas, todo en verde. La primera pasada de esta revisión (`rev3-npm-test-23-4.log`) dio un rojo propio: un comentario nuevo de `superficies.ts` nombraba la palabra que `tests/unit/cotejo.test.ts` prohíbe en `src/lib/`; se reescribió y esa prueba pasa.
- Sonda de esta pasada, fuera del repositorio y sin servidor (Chromium con `page.route`): un enlace pequeño con `tabindex="-1"` solo, axe lo da por bueno; tapado a medias por un vecino fuera del tabulador, lo deja en `incomplete`, que es la página de la prueba nueva.

**Auditoría de la matriz.** Mismo destino → «dos enlaces solapados con el mismo destino no dan target-size» (Playwright, los dos perfiles; con la 4.12.1 la daba, y el lock, `package.json`, `axe.version` y la axe de la página lo fijan). Otro destino → «… con otro destino dan target-size», que exige además que el segundo pase. Regla nueva para 2.4.11 o 2.5.7 → «si axe trae regla para un criterio que se da por cumplido o no aplica, pide reclasificarlo» (también para una de 2.2 A), «una regla experimental no cuenta…» y «el reparto declarado casa con sus reglas». Lista propia o literal en `tests/e2e/` → «ni tests/e2e/ ni lo que importa escriben su lista, apagan una regla o un nodo, ni acotan el barrido», que nombra el fichero, y «la comprobación de tests/e2e/ encuentra lo que dice buscar», que cubre ahora el adaptador con otro nombre, por `import()`, heredado y `axe.run(`. Otra axe en el lock → «el lock resuelve una sola axe-core, la 4.14.0, y las dos son exactas y de desarrollo». Todas corrieron y pasaron.

**Revisión.** Dos pasadas con las cinco capas externas, sin `intent_gap` ni `bad_spec` y sin vuelta atrás. La primera: 15 parches (0 altos, 5 medios, 10 bajos), 2 diferidos y 12 rechazados. La segunda: 14 parches (0 altos, 0 medios, 14 bajos), 2 diferidos y 17 rechazados. El detalle, en el Review Triage Log. Recomendación de revisión de seguimiento, de esta pasada: `true` (3 × 0 + 14 = 14, por encima de 5), toda de parches bajos.

**Riesgos residuales.** 2.4.11 y 2.5.7 siguen sin medirse: los da por cumplidos la UX, y lo que la prueba vigila en el código es la señal que los desmentiría, no el criterio; las señales leen texto, así que una mención en un comentario las enciende (a propósito) y lo que no se escribe tal cual —una posición en una variable de CSS— se les escapa. 3.2.6 y 3.3.7 tienen ya su señal, igual de textual. La guardia de `tests/e2e/` lee código: una etiqueta compuesta por partes o un barrido construido fuera de las formas que conoce se le escaparía, y por eso el navegador coteja además lo que corrió. Diferidos: los Modelos de ingreso no se barren a 360 px; la Obra que el barrido cuenta dos veces; lo que axe deja en `incomplete` de las reglas que no responden de un criterio de 2.2; y los estados a los que se llega interactuando (el `<dialog>` abierto, `/buscar/` con resultados), que el barrido no audita.
