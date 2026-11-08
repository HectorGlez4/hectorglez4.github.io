---
title: 'Historia 35.1 — La clase se fija al dar de alta, y queda registrada'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: '752577a43e69e2e86dc8536fc287a43df2ee7dfc'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-35-context.md'
warnings: [oversized]
deferred:
  - summary: 'AÑO_DE_REFERENCIA entra en `undefined` con la propuesta del agente (2026) en su comentario; qué valor queda en el árbol al fundir lo fija Héctor en un diff (Preguntas abiertas de la Épica 35, m6).'
    evidence: 'epics.md Story 35.1, primer Given; Preguntas abiertas de la épica.'
    severity: low
  - summary: 'La atribuida de un Personaje **sin** Autor no se admite todavía: el esquema sigue exigiendo `autor` a toda Cita y el mensaje nombra la Historia 35.2, que trae el dueño (prefijo del Personaje, `dueñoPorPrefijo`). El «personaje o autor, al menos uno» se cumple hoy por el Autor. Pendiente de la 35.2 relajarlo.'
    evidence: 'epics.md Story 35.2 («el prefijo es el del dueño: su Autor o, sin él, su Personaje»); `CitaAdmisible.autor` es `string` en ~85 lectores de tools/ e integraciones/, y una Cita sin Autor no tiene nombre de fichero ni página hasta la 35.2.'
    severity: medium
  - summary: '`tools/autor.ts crear` no admite `--vivo`: un Autor vivo solo puede entrar hoy en una copia de pruebas. Darle bandera a la orden es de la 35.1b o de quien publique la primera atribuida de un Autor vivo.'
    evidence: 'La 35.1 no lo pide; la puerta de la atribuida (35.1b) está cerrada.'
    severity: low
  - summary: 'La forma «n. {año}» de los años de un Autor vivo es [ASSUMPTION]: pendiente de Héctor (bmad-ux).'
    evidence: 'epics.md Story 35.1, segundo Given.'
    severity: low
---

<intent-contract>

## Intent

**Problem:** El Corpus solo conoce una clase de Cita (dominio público, cotejada); la Épica 35 necesita una segunda, la atribuida, y sin una clase fijada al alta, leída por un solo módulo y anotada en un registro que solo añade, la clase de siempre podría perder su puerta o una Cita cambiar de clase sin que conste.

**Approach:** Un módulo puro `src/lib/clase.ts` (`esAtribuida`, `derechosVigentes`, su complemento de dominio público y la derivación de la clase), el campo `clase` y `personaje` en el esquema de la Cita, el Autor como unión `añoFallecimiento` | `vivo: true`, y un registro `corpus/clases-de-cita.yml` que siembra una orden idempotente y que solo escriben el alta y la aprobación; el build rompe ante cualquier desacuerdo. Con el Corpus real, `dist/` no cambia.

## Boundaries & Constraints

**Always:**
- La de siempre **no lleva** `clase`; la atribuida lleva `clase: atribuida`; `clase: siempre` escrito es error del esquema con su mensaje. `estadoDerechos: dominio-público` es obligatorio en la de siempre y prohibido en la atribuida.
- `esAtribuida({clase?})` es el único lector del campo `clase` de una Cita, y la cadena `'atribuida'` solo aparece en `src/lib/clase.ts` y `src/lib/admision.ts` (lo fija una prueba sobre `src/`, `tools/`, `integraciones/`, `public/islas/`).
- `derechosVigentes`: con `PLAZO_DE_PROTECCION_AÑOS` en `undefined`, Autor ⇔ `vivo`; con plazo, también si `añoFallecimiento + plazo ≥ AÑO_DE_REFERENCIA`; un Personaje, siempre. `esDeDominioPublico` es su complemento exacto, escrito en positivo (no como `!derechosVigentes`). Plazo con valor y `AÑO_DE_REFERENCIA` en `undefined` lanza nombrando las dos constantes.
- Las dos constantes nuevas de `src/lib/umbrales.ts` entran en `undefined` (sin `/* @__PURE__ */` necesario: son literales); ninguna prueba fija su valor; las pruebas que les dan valor parchean una copia (`ficheros` de `construirConCorpus`).
- El registro solo añade (`appendFile` tras componer y analizar en memoria, como `registrarPeticionesDeRastreo`); entrada de una línea `  - { slug: "…", clase: siempre|atribuida, fecha: "AAAA-MM-DD" }`; el valor de `clase` lo da `claseDe(cita)` de `clase.ts`. No es familia de AD-27 y ningún byte de `dist/` sale de él.
- La clase no se teclea: alta y aprobación la derivan (`claseQueCorresponde`) y la escriben con lo demás. **Con la puerta cerrada (35.1b), una candidata que deriva atribuida va o se queda en `corpus/_revision/`** con el motivo «la puerta de la atribuida está cerrada (Historia 35.1b)»; nada se publica atribuido por orden en esta historia.
- `autor` sigue obligatorio en toda Cita (también la atribuida), con un mensaje que, si la Cita declara `personaje`, nombra la Historia 35.2; `personaje` solo se admite con forma de slug y sin resolver (lo resuelve la 35.2).
- Códigos de las órdenes: 2 por la forma, 1 por lo que dice; un registro ilegible niega sin escribir nada.

**Block If:**
- La construcción con el Corpus real cambia algún fichero de `dist/` frente a la de antes en la misma jornada y no es atribuible a un error propio corregible.
- Sembrar el registro con el Corpus del worktree encuentra una Cita publicada que `esAtribuida` (no debería existir ninguna).

**Never:**
- Ninguna atribuida en `corpus/citas/` del Corpus real; nada de `atestiguaciones`, `origen`, topes, `BUZON_DE_PETICIONES`, `dominioDeAtestiguacion` ni salto del cotejo (son de la 35.1b).
- No tocar `src/lib/vocabulario.ts`, `_bmad-output/planning-artifacts/`, `_bmad-output/specs/` ni `sprint-status.yaml` (salvo lo que diga el paso de implementación).
- Ninguna puerta lee el historial de git; solo la prueba de «solo añade» lo hace.
- No reescribir nunca una entrada del registro; cambiar de clase es retirar y dar de alta con otro slug (`slugLibre`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Corpus real | Citas de siempre, registro sembrado | Build 0; `dist/` idéntico | — |
| Falta en el registro | Cita publicada sin entrada | Build rompe nombrando el slug y `npx tsx tools/clases.ts sembrar` | Integración en `astro:build:start` |
| Clase distinta | Entrada `atribuida`, Cita sin `clase` | Build rompe nombrando el slug y las dos clases | ídem |
| Dos clases | Dos entradas del mismo slug, clases distintas | Build rompe nombrando el slug | ídem; dos entradas de la misma clase valen |
| Siempre de Autor vivo | Cita sin `clase`, Autor `vivo: true` | Build rompe nombrando la Cita y la ficha del Autor | ídem |
| Atribuida sin derechos | `clase: atribuida`, Autor † 1616, sin `personaje` | Build rompe nombrando el fichero | ídem |
| Atribuida de Autor vivo | `clase: atribuida`, Autor vivo, Fuente cotejada, en registro | Build 0; ficha «n. 1950», sin `deathDate` | — |
| Vivo sin nacimiento | `vivo: true`, sin `añoNacimiento` | Sin línea de años ni hueco (ficha, Fila del Directorio, Tarjeta Social) | — |
| Autor con los dos | `vivo: true` y `añoFallecimiento` | Error del esquema | Mensaje con la regla |
| `clase: siempre` | escrito en el frontmatter | Error del esquema con mensaje propio | — |
| Siempre con `personaje` | sin `clase`, con `personaje` | Error del esquema | — |
| Plazo con valor (copia) | `PLAZO=70`, `AÑO=2026`, Autor † 1980 con Cita de siempre | Build rompe nombrando la Cita | — |
| Alta deriva atribuida | lote con `personaje` o Autor vivo | A `_revision/` con `clase: atribuida`, sin `estadoDerechos`, motivo 35.1b; sin entrada | Sale como hoy |
| Alta con `clase` tecleada | entrada de lote con `clase:` | A revisión: «la clase no se teclea» | — |
| Alta/aprobación de siempre | candidata normal | Publicada + una entrada `siempre` añadida en la misma pasada (un solo `appendFile`) | Registro ilegible: 1 sin escribir nada; fallo tras escribir Citas: parte con `npx tsx tools/clases.ts sembrar`, 1 |
| Slug ya registrado con otra clase | alta | `slugLibre` lo trata como ocupado | — |
| Siembra | `npx tsx tools/clases.ts sembrar` dos veces | Primera añade las que faltan con la fecha local; segunda, 0 añadidas | Atribuida sin registrar: 1 sin escribir; argumento desconocido: 2 |

</intent-contract>

## Code Map

- `src/lib/clase.ts` (nuevo) -- `esAtribuida`, `claseDe`, `CLASES`, `derechosVigentes(dueño, año?, plazo?)`, `esDeDominioPublico`, `claseQueCorresponde({personaje?}, autor)`; puro (AD-5). Dueño: `{tipo:'autor', vivo?, añoFallecimiento?} | {tipo:'personaje'}`.
- `src/lib/umbrales.ts` -- añadir `PLAZO_DE_PROTECCION_AÑOS: number | undefined = undefined` y `AÑO_DE_REFERENCIA: number | undefined = undefined` (comentario: propuesta 2026, la fija Héctor; AD-9/AD-12, nunca la fecha del build). Lo importa el filtro del cliente: solo literales.
- `src/lib/admision.ts:134` `estadoDerechos` (pasa a opcional con regla por clase); `:227` `añoFallecimiento` y `:337` `autorAdmisible` (unión con `vivo: z.literal(true)`, `superRefine`: exactamente uno; sin ninguno, el mensaje de hoy); `:355` `citaAdmisible` (+`clase`, +`personaje` con forma de `slug`, `superRefine` compartido `reglasDeClase` que exporta para `content.config.ts`). Zod 4.4: `.superRefine` conserva `.shape` (la usa `tests/unit/fecha-de-cambio.test.ts:344`).
- `src/content.config.ts:61-114` -- cablear `clase`, `personaje`, `estadoDerechos` opcional y `vivo` con las mismas piezas y `reglasDeClase`.
- `src/lib/publicado.ts:98-103,1350-1362` -- `Autor.añoFallecimiento?`, `vivo?: true`; `aplanarAutor` los pasa.
- `src/lib/atribucion.ts:245-257` `añosDeAutor` → `string | undefined` («n. {año}» si vivo con nacimiento; `undefined` sin nada); `:181` `hechosDeFilaDeAutor` la usa; `:276` `hechosDeAutor` y `:306` `descripcionDeAutor` sin años no escriben paréntesis ni hueco.
- Lectores de años: `src/pages/autor/[slug]/[...page].astro:63,118` (`años !== ''` → definido), `src/lib/tarjeta.ts:263-269` (filtrar `undefined`), `src/components/DatosDeAutor.astro:66` y `DatosEstructurados.astro:43` (`deathDate` solo con año), `src/lib/directorios.ts:32,148`, `tools/autor.ts:198` (`listar`: «vivo» en vez de †).
- `tools/lib/cambios.ts:218,221,314` -- `personaje` en `CAMPOS_DE_CITA`; `vivo` en `CAMPOS_DEL_AUTOR_FUERA`; `clase` en `CAMPOS_QUE_NO_FECHAN.cita`.
- `tools/lib/corpus.ts:131-166,350` -- `FICHERO_DE_CLASES = 'clases-de-cita.yml'`, `rutas.clasesDeCita`, `CABECERA_DE_CLASES`, `leerRegistroDeClases`, `registrarClases(rutas, entradas)`; calcar `analizarPeticiones`/`registrarPeticionesDeRastreo` (`:2468-2620`). Validar `clase ∈ CLASES` y forma de slug y jornada (`esJornada`).
- `tools/lib/clases.ts` (nuevo) -- `fallosDeClases(citas, autores, registro)` puro (formato de `tools/lib/claves.ts:74`) y `sembrarRegistro(rutas, hoy)`.
- `tools/clases.ts` (nuevo) -- CLI `sembrar [--corpus <dir>]`; `fechaLocal` de `corpus.ts:1365`.
- `integraciones/clases.ts` (nuevo) + `astro.config.mjs:115-140` -- calcar `integraciones/claves.ts` (rompe en `astro:build:start`, avisa en dev).
- `tools/alta.ts:48-66,277-300,404-414,523-548` -- `personaje?` en `EntradaDeLote`; derivar clase con el Autor leído (`leerAutores`); `clase` tecleada → motivo; atribuida → revisión con motivo 35.1b; `aRegistroDeCita` escribe `clase`/`personaje`; registro leído antes de escribir y un `appendFile` al final con las publicadas; slugs del registro con otra clase cuentan como ocupados.
- `tools/lib/revision.ts:73,249-420` -- en `loteEnRevision` o `aprobar`: derivar la clase, rechazar desacuerdo o atribuida (motivos) y anotar las publicadas en un solo append al final. `tools/sembrar.ts` hereda del alta.
- `tests/unit/ayuda/construir.ts:99-231` -- opción `sembrarClases?: boolean` (por omisión sembrar `corpus/clases-de-cita.yml` con cada Cita de `citas/` del fixture y su `claseDe`, salvo que el fixture traiga el fichero), como `sembrarObras`.
- `tools/lib/avisar.ts:38-67`, `tools/avisar.ts:330-343`, `integraciones/historial.ts` -- solo lectura: el diff se acota a las carpetas de familia, así que el registro (raíz de `corpus/`) no fecha ni avisa; confirmarlo con una prueba.
- `.github/workflows/publicar.yml:52-69` -- conservar `fetch-depth: 0` del trabajo `construir` (prueba estructural nueva).
- `tests/unit/obras.test.ts:1068-1110` -- modelo de la prueba de «único lector».

## Tasks & Acceptance

**Execution:**
- `src/lib/clase.ts`, `src/lib/umbrales.ts` -- módulo y constantes -- dueño único de la clase y de los derechos.
- `src/lib/admision.ts`, `src/content.config.ts` -- clase, personaje, estadoDerechos por clase, Autor como unión -- la puerta del esquema (AD-1, AD-32).
- `src/lib/publicado.ts`, `src/lib/atribucion.ts`, `src/lib/tarjeta.ts`, `src/lib/directorios.ts`, `src/pages/autor/[slug]/[...page].astro`, `src/components/DatosDeAutor.astro`, `src/components/DatosEstructurados.astro`, `tools/autor.ts` -- años opcionales del Autor vivo -- FR-15, FR-41.
- `tools/lib/cambios.ts` -- clasificar `clase`, `personaje`, `vivo` -- AD-27.
- `tools/lib/corpus.ts`, `tools/lib/clases.ts`, `tools/clases.ts`, `integraciones/clases.ts`, `astro.config.mjs` -- registro, siembra y puerta del build.
- `tools/alta.ts`, `tools/lib/revision.ts` -- derivar, escribir clase y registrar -- FR-13, FR-65.
- `tests/unit/ayuda/construir.ts` -- sembrar el registro del fixture.
- `corpus/clases-de-cita.yml` -- correr `npx tsx tools/clases.ts sembrar` una vez en el worktree y versionarlo (`git add corpus/clases-de-cita.yml`).
- Pruebas: `tests/unit/clase.test.ts` (tabla de verdad, complemento con y sin plazo como parámetro, lanzamiento sin año, «único lector» y literal `'atribuida'` con su prueba de detección; las demás `clase` del código —`meta.ts`, `objetivo.ts`, `TarjetaDeCita.astro`, `biografia.ts`…— se eximen con nombre y motivo), `tests/unit/clases-de-cita.test.ts` (registro, siembra idempotente y códigos, «solo añade» contra `git show HEAD^1:corpus/clases-de-cita.yml` —prefijo byte a byte; sin padre: falla con `CI`, se omite y lo dice en local; sin fichero en el padre: pasa—, `fetch-depth: 0` en `construir`, `familiaDeFichero` del registro es `undefined`), `tests/unit/clase-build.test.ts` (cuatro construcciones: feliz con atribuida de Autor vivo y vivo sin nacimiento; todos los fallos de la integración en una; `clase: siempre`; plazo en copia), y ampliar `tests/unit/puerta-de-admision.test.ts`, `alta.test.ts`, `revision.test.ts`, `atribucion*`/`directorio-de-autores.test.ts` según toque.
- `AGENTS.md` -- sección «La Cita atribuida»: la clase y quién la fija, `src/lib/clase.ts` único lector, el registro, `npx tsx tools/clases.ts sembrar` tras cada puesta al día con la principal, que ningún agente lo edita a mano; la puerta, la 35.1b.

**Acceptance Criteria:**
- Given el sitio construido con el Corpus real en la misma jornada (`FECHA_JORNADA` fija) antes y después, when se comparan los dos `dist/` con `diff -r`, then no difiere ningún fichero.
- Given `tests/unit/fecha-de-cambio.test.ts`, when corre, then pasa sin eximir `clase`, `personaje` ni `vivo`.
- Given un commit que solo toca `corpus/clases-de-cita.yml`, when se compone el aviso o el historial, then no fecha ni avisa nada (ni la portada).
- Given `npx tsx tools/clases.ts sembrar` sobre el Corpus del worktree, when se corre dos veces, then la primera añade una entrada `siempre` por Cita publicada y la segunda informa 0 añadidas y no cambia el fichero.
- Given `npm test` en local, when corre la suite, then pasa entera.

## Spec Change Log

## Review Triage Log

### 2026-11-08 — Review pass (reanudación)
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

## Design Notes

**Puerta cerrada en las órdenes.** El contexto de la épica dice «todo se construye con la puerta cerrada… no se publica ninguna atribuida»; por eso, hasta la 35.1b, alta y aprobación derivan y escriben la clase pero dejan la atribuida en revisión. La 35.1b sustituye el motivo por el de sus constantes. Las atribuidas del build solo existen en copias de prueba, y hasta la 35.1b pasan el cotejo como cualquier Cita (el andamio siembra su documento).

**Complemento escrito en positivo**, para que la prueba no sea tautológica:

```ts
derechosVigentes(a) = a.tipo === 'personaje' || a.vivo === true ||
  (plazo !== undefined && a.añoFallecimiento + plazo >= año())
esDeDominioPublico(a) = a.tipo === 'autor' && a.vivo !== true && a.añoFallecimiento !== undefined &&
  (plazo === undefined || a.añoFallecimiento + plazo < año())
```

**Registro de una línea por entrada**: ~5.000 entradas caben en un solo `parse` por pasada; alta y aprobación hacen un único append al final, nunca uno por Cita.

## Verification

**Commands:**
- `npx vitest run tests/unit/clase.test.ts tests/unit/clases-de-cita.test.ts` -- verde.
- `npx vitest run tests/unit/clase-build.test.ts` -- verde (construye cuatro copias).
- `npx vitest run tests/unit/fecha-de-cambio.test.ts tests/unit/puerta-de-admision.test.ts tests/unit/alta.test.ts tests/unit/revision.test.ts` -- verde.
- `npx astro check` -- 0 errores.
- `FECHA_JORNADA=2026-11-07 npm run build` antes de tocar nada (copiar `dist/` al scratch) y al final; `diff -r` -- sin diferencias.
- `npm test` con `correr.sh` / `esperar.pl` -- FINISHED EXIT=0.

## Auto Run Result

Status: done
Blocking condition: ninguna

**Resumen.** La clase de una Cita tiene dueño único (`src/lib/clase.ts`: `esAtribuida`, `claseDe`, `CLASES`, `derechosVigentes` y su complemento en positivo `esDeDominioPublico`, `claseQueCorresponde`), el esquema la juzga (`clase: atribuida` o nada; `clase: siempre` es error con mensaje propio; `estadoDerechos` obligatorio en la de siempre y prohibido en la atribuida; `personaje` con forma de slug y solo en la atribuida; el Autor lleva `añoFallecimiento` o `vivo: true`, uno de los dos), el alta y la aprobación la derivan y dejan en revisión la que deriva atribuida («la puerta de la atribuida está cerrada (Historia 35.1b)»), y `corpus/clases-de-cita.yml` la registra solo por añadido. El build rompe ante cualquier desacuerdo (`integraciones/clases.ts`). `PLAZO_DE_PROTECCION_AÑOS` y `AÑO_DE_REFERENCIA` entran en `undefined`. El registro se sembró una vez en el worktree: 4.424 entradas `siempre`, ninguna atribuida; la segunda pasada añade 0.

**Ficheros.**
- `src/lib/clase.ts` (nuevo) — dueño único de la clase y de los derechos.
- `src/lib/umbrales.ts` — `PLAZO_DE_PROTECCION_AÑOS` y `AÑO_DE_REFERENCIA`, en `undefined` (propuesta del año: 2026).
- `src/lib/admision.ts`, `src/content.config.ts` — `clase`, `personaje`, `estadoDerechos` por clase (`reglasDeClase`), Autor como `añoFallecimiento` | `vivo` (`reglasDeAutor`), enganchadas con `superRefine(…, { when })`.
- `src/lib/publicado.ts`, `src/lib/atribucion.ts`, `src/lib/tarjeta.ts`, `src/lib/directorios.ts`, `src/pages/autor/[slug]/[...page].astro`, `src/components/DatosDeAutor.astro`, `src/components/DatosEstructurados.astro`, `tools/autor.ts` — años opcionales: «n. {año}» del Autor vivo, sin años ni hueco sin nacimiento, `deathDate` solo con año, «vivo» en `listar`.
- `tools/lib/cambios.ts` — `personaje` en `CAMPOS_DE_CITA`, `vivo` en los años del Autor, `clase` en `CAMPOS_QUE_NO_FECHAN`.
- `tools/lib/corpus.ts` — `FICHERO_DE_CLASES`, `rutas.clasesDeCita`, `CABECERA_DE_CLASES`, `leerRegistroDeClases`, `registrarClases` (un solo `appendFile` tras analizar en memoria).
- `tools/lib/clases.ts`, `tools/clases.ts` (nuevos) — `fallosDeClases`, la siembra idempotente y sus motivos; la orden `sembrar [--corpus]` (2 por la forma, 1 por lo que dice).
- `integraciones/clases.ts` (nuevo), `astro.config.mjs` — la puerta del build, tras las claves de orden.
- `tools/alta.ts`, `tools/lib/revision.ts`, `tools/revisar.ts`, `tools/sembrar.ts` — derivan la clase, rechazan la tecleada, la distinta y la atribuida, tratan como ocupado el slug registrado con la otra clase, leen el registro antes de escribir y lo anotan en un solo añadido al final; parte y salida 1 si no se anota.
- `corpus/clases-de-cita.yml` (nuevo) — sembrado con `npx tsx tools/clases.ts sembrar`.
- `tests/unit/ayuda/construir.ts` — `sembrarClases` (por omisión siembra el registro del fixture con `claseDe`).
- Pruebas: `clase.test.ts`, `clases-de-cita.test.ts`, `clase-build.test.ts` (nuevas); `alta.test.ts`, `revision.test.ts`, `semblanza.test.ts`, `directorio-de-autores.test.ts` ampliadas; `fecha-de-cambio.test.ts` lee las claves a través de `.superRefine`; `fecha-de-cambio-build.test.ts` anota la Cita nueva de su siembra; `orden-de-revision.test.ts` da `clase` a su fixture.
- `AGENTS.md` — sección «La Cita atribuida».

**Revisión.** Las capas externas no traen hallazgos en esta pasada: 0 parches, 0 diferidos, 0 rechazados. `followup_review_recommended: false` (parcheados: 0 high, 0 medium, 0 low; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/clase.test.ts tests/unit/clases-de-cita.test.ts` — verde (18 + 12).
- `npx vitest run tests/unit/clase-build.test.ts` — verde (4 construcciones).
- `npx vitest run tests/unit/fecha-de-cambio.test.ts tests/unit/puerta-de-admision.test.ts tests/unit/alta.test.ts tests/unit/revision.test.ts` — verde.
- `npx astro check` — 0 errores (419 ficheros).
- `FECHA_JORNADA=2026-11-07 npm run build` antes y después (la pasada interrumpida apartó los cambios con `git stash -u`, contra la regla del bucle; se restituyeron enteros y la pila de stash quedó vacía); `diff -rq`: ningún fichero fuera de `pagefind/` difiere. Los de `pagefind/` (nombres de `filter/*.pf_filter`, `pf_meta` y `pagefind-entry.json`) cambian también entre dos pasadas de Pagefind sobre el mismo `dist/`, comprobado aquí: no son de esta historia.
- `npm test` (`correr.sh`/`esperar.pl`): la primera pasada dio 155/158 ficheros; `fecha-de-cambio-build.test.ts` fallaba por la Cita que su siembra añade sin registrar (corregido), y `extraer-cli.test.ts` y `objetivo-cli.test.ts` agotaron 120 s con carga ~35 (la orden de «El sable» tarda 107 s igual sin los cambios). Las tres pasan solas. La segunda pasada (`npm-test-35.1-b.log`) dio 157/158, solo con el agotamiento de `extraer-cli`; la tercera (`npm-test-35.1-c.log`, carga 18–34 por otros worktrees), 156/158 con 7.218/7.220 pruebas: los dos fallos son agotamientos de 120 s —`extraer-cli` «con --autor manuel-gonzalez-prada…» y `objetivo-cli` «las dos órdenes hermanas…»—, y los dos ficheros, corridos juntos y solos (`reintento3-35.1.log`), pasan: 94/94, EXIT=0. Un perfil de CPU de `extraer` sobre «El sable» en este worktree y en uno de la línea base muestra el mismo reparto (YAML de las 288.594 candidatas de `_revision/`) y la diferencia (~22 %) entera en `readdir` recursivo y en `stat` del sistema de ficheros, no en código de esta historia: ningún módulo que esas órdenes cargan cambia de camino.

**Riesgos residuales.** `extraer-cli` y `objetivo-cli` rozan su plazo de 120 s con el `_revision/` real bajo carga: no es de esta historia, pero `npm test` en local puede salir rojo por ellos con varios worktrees construyendo a la vez.

Además: La atribuida de un Personaje sin Autor espera a la 35.2; `tools/autor.ts crear` no admite `--vivo`; la forma «n. {año}» es [ASSUMPTION] pendiente de Héctor (bmad-ux). Tras cada puesta al día con la principal hay que correr `npx tsx tools/clases.ts sembrar`, o el build se para ante las Citas sembradas entretanto.
