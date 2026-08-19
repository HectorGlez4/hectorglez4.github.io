---
title: 'Story 11.3 — El objetivo de cada sesión sale del hueco, no del criterio'
type: 'feature'
created: '2026-08-19'
status: 'done'
baseline_revision: '8e9b6c8dd00232c74cf048c1de7b07b0b9f41530'
review_loop_iteration: 1
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-2-ninguna-cita-se-publica-sin-aparecer.md'
warnings: []
deferred:
  - summary: >-
      El registro es autodeclarado: nada acopla una entrada a que se haya sembrado de
      verdad, porque `tools/alta.ts` y `tools/sembrar.ts` no escriben en él.
    evidence: |-
      `--registrar` lo ejecuta quien quiera cuando quiera. El resultado medido que ahora
      lleva cada entrada mitiga mucho —dos entradas con el mismo recuento de Citas delatan
      una sesión que no sembró—, pero la disciplina sigue siendo del operador. Acoplarlo
      sería que el alta registrase la sesión, y eso es trabajo de la 11.4.
    location: >-
      tools/objetivo.ts
    severity: medium
  - summary: >-
      El desempate entre Temas depende de `localeCompare(…, 'es')`, que es dependiente de
      ICU y podría variar en un Node compilado con small-icu.
    evidence: |-
      Todos los slugs de las pruebas son ASCII, así que la suite no puede detectarlo. La
      decisión de no reordenar en la política es correcta —el orden tiene un solo dueño en
      `huecos.ts`—, pero la garantía de determinación no es más fuerte que esa llamada.
    location: >-
      src/lib/huecos.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** `tools/huecos.ts` enseña qué falta, pero la elección de a qué dedicar la sesión es de quien lee. Un agente que siembra sin supervisión no tiene criterio, así que deriva hacia lo que resulta más fácil de encontrar — que es exactamente el sesgo que el Corpus arrastra: hoy 16,7 % de tradición latinoamericana frente a un suelo del 40 %, y seis Temas por debajo del umbral.

**Approach:** Una política determinista que, dado un estado del Corpus, devuelve siempre el mismo objetivo de sesión y **declara de qué hueco sale**. El editor puede anularla, y la anulación queda registrada. La política dice **qué hueco cerrar**; nunca a qué persona admitir.

## Boundaries & Constraints

**Always:**
- **Determinista**: el mismo estado del Corpus da el mismo objetivo. Sin azar, sin fecha, sin nada que no salga del Corpus.
- El objetivo **declara de qué hueco sale**, en texto legible.
- Con la tradición latinoamericana por debajo de su suelo, cerrar ese hueco tiene **prioridad**.
- La anulación del editor queda **registrada** y versionada.
- La política es **derivación pura** (AD-5): recibe lo leído, no lee disco.
- Los umbrales salen de `src/lib/umbrales.ts` y de ningún otro sitio (AD-9).

**Block If:**
- Cumplir un criterio exigiera que la política eligiera **una persona concreta** para admitir en el Corpus.

**Never:**
- **No nombrar Autores.** La política caracteriza al Autor buscado por su **tradición**, nunca por su nombre. Quién entra en el Corpus es la única decisión que este producto no delega, y un proponedor de nombres la delegaría por la puerta de atrás.
- No inventar un segundo cómputo de huecos: la política consume `verHuecos`, no lo reimplementa.
- No tocar el umbral de Tema ni el suelo de tradición.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tradición bajo el suelo | 16,7 % frente a suelo del 40 % | El objetivo es cerrar el hueco de tradición, y lo declara | Sin error |
| Tradición cumplida, Temas cortos | Suelo alcanzado; seis Temas por debajo | El objetivo es el Tema al que **menos** le falta, y dice cuántas | Sin error |
| Empate entre Temas | Dos Temas a los que les falta lo mismo | Gana el mismo siempre: desempate por slug, alfabético en español | Sin error |
| Mismo estado, dos llamadas | Corpus sin cambios | Objetivo idéntico, palabra por palabra | Sin error |
| Sin huecos | Suelo alcanzado y ningún Tema corto | Lo dice: no hay hueco que cerrar | Sin error |
| Corpus vacío | Sin Citas, sin Temas, sin Autores | No revienta; declara que no hay estado del que derivar objetivo | Sin error |
| Anulación del editor | El editor dedica la sesión a otra cosa | Queda registrada, con lo propuesto, lo elegido y el motivo | Sin error |
| Anulación sin motivo | Se anula y no se da razón | Se rechaza: una anulación sin motivo no es un registro | Código ≠ 0 |
| Autores sin tradición declarada | Varios sin el campo | Se cuentan aparte y no se imputan a ninguna tradición | Sin error |

</intent-contract>

## Code Map

- `src/lib/huecos.ts` -- **ya existe y es la entrada de la política.** `verHuecos(citas, temas, autores, anunciados)` devuelve `temas: HuecoDeTema[]` (con `faltan`, ya ordenados de menos a más y desempatados por slug) y `tradicion: EquilibrioDeTradicion` (con `porcentaje`, `suelo`, `alcanzaElSuelo`, `sinDeclarar`). El cuarto criterio de esta historia —«veo cuántas Citas le faltan a cada uno»— **ya está cubierto** por `faltan`. Puro, AD-5.
  **Su cabecera declara el criterio que esta historia matiza**: «no propone Autores… es la única decisión que este producto no delega». Hay que actualizar ese comentario para que no contradiga a la política, sin renunciar a lo que protege.
- `src/lib/umbrales.ts` -- `MIN_CITAS_POR_TEMA = 15`, `SUELO_TRADICION_LATINOAMERICANA = 40`. Dueño único (AD-9).
- `tools/huecos.ts` -- la orden que ya enseña los huecos, con `--json`. Es el patrón de CLI a seguir: lee el corpus, llama a la derivación pura, imprime.
- `tools/lib/corpus.ts` -- `leerCitas`, `leerTemas`, `leerAutores`, `rutasDelCorpus`. **Ojo:** la Historia 11.2 está tocando este fichero; parte de lo que haya cuando empieces.
- `src/lib/publicado.ts` -- `temasPublicados`, el dueño único del conjunto publicable (AD-11). El objetivo debe derivarse de lo **publicado**, igual que los huecos.
- `tests/unit/huecos.test.ts` -- las pruebas de la vista de huecos; el patrón para las de la política.

## Tasks & Acceptance

**Execution:**
- `src/lib/objetivo.ts` (nuevo, puro, sin disco) -- la política: recibe el resultado de `verHuecos` y devuelve el objetivo de la sesión, con el hueco del que sale declarado en texto. Prioridad: primero el suelo de tradición si no se alcanza, después el Tema al que menos le falta, y el desempate por slug que `verHuecos` ya aplica. Puro, para poder probar la determinación entera sin corpus.
- `src/lib/huecos.ts` -- actualizar la cabecera para que el criterio quede bien dicho: la vista **sigue sin nombrar Autores**, y la política que se apoya en ella tampoco lo hace — propone **qué hueco cerrar** y caracteriza al Autor por tradición. Quién entra en el Corpus se sigue sin delegar.
- `corpus/sesiones-de-sembrado.yml` (nuevo) -- registro de sesiones, versionado y solo de añadir. Por sesión: el objetivo propuesto, el elegido y el motivo cuando difieren, **y el resultado medido** — el recuento de Citas del Corpus, el porcentaje de Procedencia completa (SM-C1) y el de tradición latinoamericana en el momento de registrarla. Sin resultado, la 11.4 no puede cerrar «cuántas Citas por sesión» ni juzgar una sesión fallida, y su criterio dice literalmente «registro su **resultado**». Los tres los deriva la propia orden del Corpus, no se teclean. Se coloca junto a `corpus/portada.json` y `corpus/pendientes-de-cotejo.yml`, que ya son metadato del Corpus y no colección. La Historia 11.4 lo consume para declarar la cadencia de sembrado.
- `tools/objetivo.ts` (nuevo) -- la orden: `npx tsx tools/objetivo.ts [--corpus corpus] [--json] [--anular <motivo>]`. Sin `--anular`, propone y declara el hueco. Con `--anular`, registra la anulación con su motivo; sin motivo, sale con código ≠ 0.
- `tools/huecos.ts` -- mostrar el objetivo propuesto al final del informe, para que quien ya mira los huecos no tenga que ejecutar dos órdenes.
- `tests/unit/objetivo.test.ts` (nuevo) -- la matriz de E/S sobre lo puro: prioridad de la tradición, Tema al que menos le falta, desempate, determinación palabra por palabra en dos llamadas, sin huecos, corpus vacío, y Autores sin tradición declarada.
- `tests/unit/objetivo-cli.test.ts` (nuevo) -- sobre disco con corpus temporal: propone; `--json`; `--anular` con motivo registra en el fichero y `--anular` sin motivo sale con código ≠ 0; y el registro solo añade, nunca reescribe lo anterior.

**Acceptance Criteria:**
- Given un estado del Corpus, when pido el objetivo de la sesión, then la política devuelve el mismo objetivo para el mismo estado, y declara de qué hueco sale.
- Given una proporción de Autores de tradición latinoamericana por debajo del suelo, when la política elige objetivo, then prioriza cerrar ese hueco por encima de cualquier Tema corto.
- Given que el editor quiere dedicar la sesión a otro objetivo, when anula la propuesta con su motivo, then la anulación queda registrada con lo propuesto, lo elegido y el motivo.
- Given los Temas por debajo del umbral de publicación, when consulto la vista de huecos, then veo cuántas Citas le faltan a cada uno.
- Given la política entera, when se busca en su salida el nombre de un Autor concreto, then no aparece ninguno: el Autor se caracteriza por tradición.

## Spec Change Log

## Review Triage Log

## Design Notes

**El conflicto que esta historia resuelve, y cómo.** La cabecera de `src/lib/huecos.ts` dice, desde la v1, que la vista «no propone Autores… acabaría eligiendo por su cuenta a quién entra en el Corpus, que es la única decisión que este producto no delega». La 11.3 pide «una política determinista que diga a qué Tema y a qué Autor dedicar la sesión». Se resuelve por el lado conservador: la política dice **qué hueco** cerrar y caracteriza al Autor buscado por **tradición** —«hace falta un Autor de tradición latinoamericana»—, nunca por nombre. Un agente desatendido obtiene así un objetivo determinista, y la admisión de una persona concreta sigue siendo de Héctor. Decidido el 19/08 bajo el mandato de elegir lo conservador y dejarlo escrito.

**Por qué la prioridad es la tradición y no el Tema más corto.** Un Tema corto se cierra sembrando cualquier Autor que ya esté; el hueco de tradición solo se cierra admitiendo Autores nuevos, que es más lento y más fácil de posponer indefinidamente. Si el Tema fácil ganase, el hueco caro no se cerraría nunca — que es justo el sesgo que la historia nombra.

**Determinismo significa sin fecha.** El objetivo no puede depender de cuándo se pregunta: dos llamadas el mismo día y en días distintos, con el mismo Corpus, dan lo mismo. La fecha entra solo en el **registro** de la sesión, que es otra cosa.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run` -- expected: todo en verde; ninguna prueba de la línea base perdida.
- `npm run build` -- expected: construye.
- `npx tsx tools/objetivo.ts --json` dos veces seguidas -- expected: salida idéntica.

### 2026-08-19 — Review pass
- intent_gap: 0
- bad_spec: 2: (high 2)
- patch: 15: (medium 10, low 5)
- defer: 2: (medium 1, low 1)
- reject: 4: (low 4)
- addressed_findings:
  - `[high]` `[bad_spec]` La rama de tradición no devolvía Tema, y es la rama en la que el Corpus está hoy y estará durante toda la 11.4: al agente se le decía qué clase de Autor admitir y nada sobre dónde van las Citas, con seis Temas cortos. Mi matriz de E/S lo había estrechado a un solo eje. Ahora el objetivo lleva los dos, con la prioridad decidiendo el titular y no lo que se dice.
  - `[high]` `[bad_spec]` El registro no podía sostener el criterio de la 11.4 —«registro su **resultado**»— porque no tenía dónde ponerlo. Cada entrada lleva ahora el resultado medido, derivado del Corpus por la orden: Citas publicadas, SM-C1 y porcentaje de tradición. Con eso la 11.4 saca «cuántas Citas por sesión» de la diferencia entre entradas y puede juzgar la sesión fallida que define.
  - `[medium]` `[patch]` La fecha era UTC: una sesión posterior a las 22:00 peninsulares se fechaba al día siguiente, sesgo sistemático en lo único que el fichero mide. Fecha y hora locales.
  - `[medium]` `[patch]` Una bandera mal escrita consultaba en silencio y salía con 0, así que un guion creía que la sesión había quedado anotada. Toda bandera desconocida sale con código ≠ 0, y hay `--ayuda`.
  - `[medium]` `[patch]` Un registro vacío o sin la clave `sesiones:` producía una lista huérfana y todo lector veía cero sesiones. Ahora se valida antes de escribir, la cabecera se crea con `wx`, y solo se añade si la lista crece en exactamente una entrada.
  - `[medium]` `[patch]` La cabecera del registro estaba escrita dos veces y ya divergía; un solo dueño.
  - `[medium]` `[patch]` Se guardaban solo frases: ahora también los ejes estructurados, para que la 11.4 no tenga que analizar prosa en español.
  - `[medium]` `[patch]` `--registrar` sin hueco que cerrar entraba en la serie de cadencia como sesión real; y un reintento de la misma jornada la inflaba. Ambos rechazados.
  - `[medium]` `[patch]` `--elegido "   "` daba tres representaciones distintas; un solo colapso a `undefined`.
  - `[medium]` `[patch]` `huecos.test.ts` seguía afirmando «informa, no elige», que ya era falso del código que vigilaba.
  - `[medium]` `[patch]` Nada fijaba la coma decimal —quitarle el `.replace` dejaba la suite en verde— ni ejercitaba `--anular --json`. Y `tools/auditoria.ts` imprimía con punto mientras su hermana imprimía con coma.
  - `[low]` `[patch]` `clase` tipada a la unión y sin el doble `as unknown as`; `rechazar()` sustituido por `terminar()`; prueba de nombres reformulada para que cace al peligro real; guiones en `package.json` y sección en `AGENTS.md`.

## Auto Run Result

Status: done

**Cambio implementado.** Una política determinista, pura y sin disco (`src/lib/objetivo.ts`) que consume `verHuecos` y devuelve el objetivo de la sesión declarando de qué hueco sale. Prioriza el suelo de tradición sobre los Temas cortos, y devuelve **los dos ejes** cuando ambos huecos existen. Caracteriza al Autor por tradición y **nunca por nombre**, que era el criterio que `huecos.ts` protegía desde la v1. `tools/objetivo.ts` la sirve en tres modos —consultar, registrar y anular— y `corpus/sesiones-de-sembrado.yml` guarda la serie de sesiones con su resultado medido, que es de donde la 11.4 sacará la cadencia.

**Verificación.** `npx astro check` 0 errores sobre 132 ficheros. `npx vitest run` **882/882** en 37, frente a 794/35 de la línea base. `npm run build` construye con la puerta de la 11.2 intacta. Dos llamadas seguidas a `--json` dan salida idéntica. Y a mano: la salida real lleva los dos ejes, una bandera con errata sale con código 1, y consultar no toca el fichero.

**Recomendación de nueva revisión: true.** Dos hallazgos de severidad alta, ambos de especificación.

**Riesgos residuales.** Los dos diferidos están en el frontmatter: el registro es autodeclarado —mitigado, no cerrado, por el resultado medido— y el desempate entre Temas depende de ICU.
