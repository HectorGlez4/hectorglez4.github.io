---
title: 'Story 13.1 — Componer varias jornadas de una sentada'
type: 'feature'
created: '2026-08-19'
status: 'done'
baseline_revision: '3a5e2433ce97204001cc6a2b8a2bcc4bc7ee7bd5'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-12-4-curar-una-coleccion.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** El Kit hace que publicar un día cueste dos minutos, pero exige estar ahí ese día. Una semana ocupada sigue siendo una semana sin publicar, y olvidar un día es perder ese día.

**Approach:** Dejar preparadas varias jornadas de una sentada. **No hace falta mecanismo nuevo**: `corpus/portada.json` ya tiene fijaciones de jornada y `src/lib/citaDelDia.ts` ya les da prioridad sobre la rotación desde la v1. El lote fija jornadas **ahí**, y una superficie interna muestra el material compuesto de cada una para poder publicarlo desde el móvil.

## Boundaries & Constraints

**Always:**
- Fijar una jornada es escribir en `corpus/portada.json`, el mismo sitio que la Cita del Día ya consulta. **Lo versionado es la fijación**; el material compuesto no.
- Lo compuesto por adelantado es **indistinguible** de lo que compondría el día, porque ambos derivan de la misma fijación.
- Cambiar la Cita de una jornada ya compuesta **la recompone**: no queda material obsoleto.
- El lote es **reanudable**: dejarlo a medias y retomarlo otro día continúa donde se dejó.
- La superficie del lote **no es indexable ni alcanzable** desde la navegación pública, heredando la declaración única de `src/lib/superficies.ts` (AD-17, Historia 12.1).
- El material sale de `src/lib/kit.ts` y los tamaños de `src/lib/tramos.ts`: la misma tabla que la Página de Cita, la Imagen y la Tarjeta.
- La atribución sale de `src/lib/atribucion.ts`. Si el lote compusiera la suya, publicaría una distinta de la que se lleva el visitante.

**Block If:**
- Cumplir un criterio exigiera un segundo calendario, un desempate entre dos orígenes de jornada, o que `src/lib/` escribiera en disco.

**Never:**
- **No construyas un segundo calendario.** Es la trampa que `RECONCILIACION.md` §2 nombra por su nombre. `corpus/portada.json` ya existe y `citaDelDia.ts` ya le da prioridad; el lote fija ahí y la exigencia de que «lo anticipado sustituya a lo de la jornada» se cumple por construcción. Si te ves diseñando qué manda el martes, has creado el problema que esta regla evita.
- **No versiones la salida del lote.** Lo versionado es la decisión, es decir la fijación.
- No compongas piezas de varias Citas: eso es la 13.2.
- No añadas la superficie a ninguna lista de la configuración: se declara en un solo sitio.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fijar varias jornadas | Un rango de jornadas y Citas aptas | Quedan fijadas en `corpus/portada.json` | Sin error |
| Llega la jornada fijada | Se construye ese día | Lo anticipado es lo que sale, sin desempate | Sin error |
| Recomponer | Se cambia la Cita de una jornada ya fijada | El material de esa jornada se recompone | Sin error |
| Reanudar | Lote dejado a medias | Continúa donde se dejó; lo ya fijado no se repite | Sin error |
| Jornada pasada | Se intenta fijar un día ya vencido | Se rechaza: fijar el pasado no publica nada | Código ≠ 0 |
| Cita no apta para portada | Slug de una Cita sin marcar apta | Se rechaza nombrando la regla | Código ≠ 0 |
| Cita inexistente o no publicada | Slug con errata, o en `_revision/` | Se rechaza nombrando el slug | Código ≠ 0 |
| Jornada mal formada | No es `AAAA-MM-DD` | Se rechaza diciendo la forma esperada | Código ≠ 0 |
| Superficie del lote | Se construye el sitio | `noindex`, fuera del sitemap y del índice interno, y sin enlace entrante | Sin error |
| Sin jornadas fijadas | `fijaciones` vacío, como hoy | El sitio construye igual y la superficie lo dice sin quebrarse | Sin error |

</intent-contract>

## Code Map

- `corpus/portada.json` -- **el mecanismo que ya existe**: `{ "_comentario": …, "fijaciones": {} }`, jornada ISO → slug de Cita, y su comentario ya dice que tiene prioridad sobre la rotación (FR-9) y que no lo carga ninguna colección. Aquí escribe el lote. Hoy está vacío.
- `src/lib/citaDelDia.ts` -- `jornadaDelBuild(entorno, ahora)` y la selección, puras (AD-5): reciben la jornada, no la averiguan. Ya priorizan la fijación sobre la rotación. **No lo toques para añadir prioridad: ya la tiene.**
- `src/lib/kit.ts` -- `materialDelKit(...)` compone el material de **una** jornada, tomando la atribución de `atribucion.ts` y el lienzo de `tramos.ts`. El lote compone varias llamando a esto, no reimplementándolo.
- `src/pages/kit.astro` -- la superficie interna existente y el patrón exacto a seguir: `noindex`, fuera del sitemap, sin enlaces entrantes, pensada para el móvil. Desde la 12.1 su publicabilidad la declara `src/lib/superficies.ts`, no dos banderas sueltas.
- `src/lib/superficies.ts` -- el dueño único. La familia del lote se declara **aquí y solo aquí**, con carácter de superficie ajena al producto, como el Kit.
- `tools/portada.ts` + `tools/lib/gestion.ts` -- `marcar` / `desmarcar` / `listar` para las Citas aptas para portada (FR-15). Fijar jornadas encaja como orden hermana; `marcarAptaParaPortada` es el precedente.
- `tools/lib/corpus.ts` -- lectura y escritura del corpus. `escribirColeccion` de la 12.4 es el precedente de escritura segura: escribe en la ruta que devolvió el lector, y valida el YAML crudo antes.
- `tools/lib/cli.ts` -- `terminar`, `posicionales`, `motivosDeArgumentosNoReconocidos`. Úsalo: una bandera mal tecleada no puede acabar escribiendo en el corpus real.
- `tests/unit/cita-del-dia.test.ts`, `tests/unit/kit.test.ts`, `tests/unit/kit-construido.test.ts` -- las pruebas de las piezas que el lote reutiliza.

## Tasks & Acceptance

**Execution:**
- `tools/lib/jornadas.ts` (nuevo, o dentro de `gestion.ts`) -- la lógica de fijar y soltar jornadas: validar la forma de la jornada, que no sea pasada, que la Cita exista, esté publicada y sea apta para portada, y escribir en `corpus/portada.json` preservando lo que ya hubiera. Devuelve `Resultado` como sus hermanas.
- `tools/jornada.ts` (nuevo) -- la orden: `fijar`, `soltar`, `listar`. Patrón de `tools/portada.ts`, rechazos por `terminar` con código ≠ 0, y validación de banderas desconocidas.
- `src/lib/lote.ts` (nuevo, puro, sin disco) -- el material de varias jornadas: recibe las fijaciones y el conjunto publicable y devuelve el material de cada una llamando a `materialDelKit`. Que recomponer sea automático se cumple porque nada se guarda: se deriva en cada construcción.
- `src/lib/superficies.ts` -- declarar la familia del lote, ajena al producto. Una línea; lo demás deriva.
- `src/pages/lote.astro` (nuevo) -- la superficie interna, con el patrón de `kit.astro`: utilizable desde el móvil, sin herramientas ni acceso al repositorio para el gesto de publicar. Y con el estado de hoy resuelto: sin jornadas fijadas, lo dice sin quebrarse.
- `package.json` -- guion para la orden nueva. `AGENTS.md` -- cómo se compone un lote, fuera del bloque gestionado.
- `tests/unit/jornadas.test.ts` (nuevo) -- la matriz sobre lo puro: fijar varias, jornada pasada, jornada mal formada, Cita inexistente, no publicada, no apta, y que fijar preserva lo ya fijado.
- `tests/unit/lote.test.ts` (nuevo) -- que el material de una jornada compuesto por el lote es **idéntico** al que compone el Kit para esa misma jornada. Es la aserción que hace cierto «indistinguible» y la que impide que aparezca un segundo calendario sin que nadie se entere.
- `tests/unit/lote-construido.test.ts` (nuevo) -- sobre un sitio construido: la superficie es `noindex`, no está en el sitemap ni en el índice interno, no tiene enlaces entrantes, y sin fijaciones construye igual.

**Acceptance Criteria:**
- Given el lote, when compongo varias jornadas por adelantado, then quedan fijadas en `corpus/portada.json`, el mismo mecanismo que ya prioriza la Cita del Día desde la v1, y no se construye un segundo calendario ni un desempate entre ambos.
- Given una jornada con material compuesto por adelantado, when llega esa jornada, then lo anticipado es indistinguible de lo que compondría el día, porque ambos derivan de la misma fijación.
- Given una jornada ya compuesta cuya Cita cambio, when vuelvo a componer, then su material se recompone en lugar de quedar obsoleto.
- Given un lote dejado a medias, when lo retomo otro día, then continúa donde lo dejé.
- Given la superficie del lote, when se construye el sitio, then no es indexable ni alcanzable desde la navegación pública, heredando la declaración única de la Historia 12.1.
- Given la salida del lote, when reviso el repositorio, then no está versionada; lo versionado es la fijación de jornada.

## Spec Change Log

## Review Triage Log

## Design Notes

**La trampa que esta historia esquiva, dicha por su nombre.** El addendum del PRD daba por indeciso el mecanismo de composición anticipada, y `RECONCILIACION.md` §2 lo corrige: ya estaba resuelto en la v1. `corpus/portada.json` tiene fijaciones y `citaDelDia.ts` les da prioridad. Construir un calendario propio para el lote crearía dos orígenes de verdad y, con ellos, la pregunta «cuál manda el martes» — que no tiene respuesta buena y que hoy no existe. Fijando en el sitio que ya manda, «lo anticipado sustituye a lo de la jornada» **no se implementa: se cumple**.

**Por qué el lote es orden y superficie a la vez.** Fijar jornadas escribe en el corpus, y una página estática no escribe. Publicar desde el móvil no puede exigir terminal ni repositorio. Así que la orden fija y la superficie muestra, y las dos derivan de la misma fijación. Si alguna de las dos guardase material compuesto, «recomponer» pasaría a ser una operación en vez de una consecuencia.

**Recomponer sale gratis si no se guarda nada.** El material no se persiste: se deriva en cada construcción a partir de la fijación. Cambiar la Cita de una jornada cambia el material sin que nadie recomponga nada. Guardar el material sería crear el problema y luego resolverlo.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run` -- expected: todo en verde; ninguna de las 1158 de la línea base perdida.
- `npm run build` -- expected: construye, con la puerta de la 11.2 intacta y sin fijaciones, como hoy.
- `git status --porcelain corpus/` -- expected: vacío tras la suite; las pruebas no fijan jornadas en el repositorio.
- `grep -rn "fijaciones" src/ tools/ --include="*.ts"` -- expected: un solo origen de jornada fijada; ningún calendario paralelo.

### 2026-08-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 17: (high 5, medium 8, low 4)
- defer: 0
- reject: 6: (low 6)
- addressed_findings:
  - `[high]` `[patch]` Al enumerar todas las fijaciones, el lote convirtió en fatal algo que antes era inofensivo: una clave mal tecleada a mano —`manana`— es lexicográficamente mayor que una fecha ISO, entraba en el lote, caía a la rotación y hacía lanzar el build **entero**, incluida la reconstrucción diaria del sitio en vivo. La orden validaba y el lector del sitio no: dos lectores del mismo fichero con reglas distintas. Ahora ambos preguntan a `esJornada`.
  - `[high]` `[patch]` `lote.astro` importaba `corpus/portada.json` en crudo: la clave `fijaciones` ausente —forma que la propia orden acepta— tumbaba el build. Nuevo lector tolerante, compartido con `kit.astro`, así que el sitio tiene un solo lector.
  - `[high]` `[patch]` La vista del lote reimplementaba a mano el marcado del Kit, así que «indistinguible» era cierto para los datos y falso para lo que Héctor copia y pega. Extraído un componente compartido; la igualdad compara ahora una huella de todo lo publicable y no un solo enlace.
  - `[high]` `[patch]` El aviso de fijación muda —la funcionalidad estrella— no lo renderizaba ninguna prueba: invertir el guardián dejaba la página avisando en las jornadas correctas y callando en la muda, con todo en verde.
  - `[high]` `[patch]` El calendario real de `esJornada` no se fijaba donde importa: el consumidor es la caja de texto libre del `workflow_dispatch`, que escribe una persona.
  - `[medium]` `[patch]` `--corpus` sin valor caía al corpus real; la escritura de `portada.json` no era atómica y una interrupción perdía **todas** las fijaciones; `HOY` en UTC rechazaba jornadas válidas de madrugada en España; `FECHA_JORNADA` olvidada en la shell cambiaba en silencio qué significa «pasada».
  - `[medium]` `[patch]` La prueba del guardián de banderas leía el corpus **real** y habría escrito en él si el guardián regresara.
  - `[medium]` `[patch]` `/lote` no entraba en las listas de regresión de superficies, y sus comprobaciones derivadas se hacían con cinco construcciones propias sobre una suite que serializa a propósito; bajaron a tres, y las demás viven ya en la construcción compartida.
  - `[low]` `[patch]` `soltar` no ordenaba el fichero aunque `fijar` sí, y no se ejercitaba por la orden; aviso al fijar la misma Cita en dos jornadas; `/kit` y `/lote` enlazados entre sí; y el aviso mudo distinguible de un párrafo normal.

## Auto Run Result

Status: done

**Cambio implementado.** `npm run jornada -- fijar` deja varias jornadas preparadas escribiendo en `corpus/portada.json`, el mecanismo que `citaDelDia.ts` ya consultaba antes de rotar desde la v1. La superficie interna `/lote` muestra el material de cada jornada para publicarlo desde el móvil, compartiendo componente con el Kit.

**Lo que la historia no construyó, y es su contenido.** No hay segundo calendario ni desempate. El auditor de intención lo verificó enumerando cada sitio donde el cambio crea la noción de jornada —forma, ventana de visualización, rechazo de pasadas— y ninguno mapea jornada a Cita. `corpus/portada.json` sigue siendo el único mapeo. «Lo anticipado sustituye a lo de la jornada» no se implementa: se cumple.

**Verificación.** `npx astro check` 0 errores. `npx vitest run` **1277/1277** en 47 ficheros, frente a 1158/44 de la línea base. `npm run build` construye con la puerta de la 11.2 intacta. `npx playwright test` 400 pasan. `git status --porcelain corpus/` vacío y `fijaciones` sigue en `{}`. Y a mano: los cinco casos de la orden con el código correcto, incluido el rechazo de una Cita no marcada apta —que sin él dejaría fijar algo que el día señalado se ignoraría en silencio— y el de una fecha que no existe en el calendario.

**Recomendación de nueva revisión: true.** Cinco hallazgos de severidad alta, dos de ellos capaces de tumbar la reconstrucción diaria del sitio en vivo.
