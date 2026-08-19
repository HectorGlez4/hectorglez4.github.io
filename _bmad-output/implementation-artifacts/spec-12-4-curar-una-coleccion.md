---
title: 'Story 12.4 — Curar una Colección desde la herramienta'
type: 'feature'
created: '2026-08-19'
status: 'done'
baseline_revision: '4fe10498bb3dfe6a8056db49f45ad4918b760486'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-12-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-12-3-la-pagina-de-coleccion.md'
warnings: []
deferred:
  - summary: >-
      `corpus/_colecciones-retiradas/` no se versiona con `.gitkeep`, a diferencia de sus
      tres hermanos de `corpus/`.
    evidence: |-
      Versionarlo dejaría `git status --porcelain corpus/` no vacío, que es criterio de
      aceptación de esta historia. `mover` lo crea al vuelo y entra en el repositorio con
      la primera Colección que se retire de verdad, con lo que la excepción se cierra sola.
      Queda escrito en `Rutas.coleccionesRetiradas` y en `AGENTS.md`.
    location: >-
      tools/lib/corpus.ts
    severity: low
  - summary: >-
      La regla de que un miembro esté publicado la impone solo la herramienta, y ningún
      esquema puede imponerla.
    evidence: |-
      `miembros` es una lista de slugs y jamás una referencia dura, y esa blandura es
      exactamente lo que hace que retirar una Cita no rompa el build. Así que editar el
      fichero a mano sí se salta esa regla, aunque no se salte ninguna otra. `AGENTS.md`
      afirmaba lo contrario y se corrigió: ahora dice qué impone la herramienta que el
      build no puede imponer.
    location: >-
      tools/lib/curacion.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** La 12.2 dejó el modelo y la 12.3 la página, pero crear una Colección sigue exigiendo escribir YAML a mano y contar de cabeza cuántas Citas faltan para que se publique. Mientras eso siga así, `corpus/colecciones/` seguirá vacío y la feature entera seguirá inerte.

**Approach:** Una herramienta que crea una Colección con su criterio y su nombre, le asigna Citas ya publicadas, y dice cuánto le falta para publicarse — como la vista de huecos dice lo que le falta a un Tema. Es **comodidad, no puerta**: quien edite el fichero a mano se topa con las mismas reglas.

## Boundaries & Constraints

**Always:**
- Solo admite Citas en estado **publicada**, es decir las de `corpus/citas/`. Una Cita en `corpus/_revision/` no se puede asignar.
- Al consultar el estado de una Colección por debajo del umbral, dice **cuántas Citas le faltan**, como hace la vista de huecos con los Temas.
- Despublicar una Colección **no borra ni cambia de estado ninguna Cita**.
- La herramienta es comodidad y no puerta: editar un fichero a mano saltándose la herramienta topa con **el mismo esquema**, que rompe el build si se incumple.
- Los rechazos salen con código distinto de cero, como el resto de las órdenes de `tools/`.
- La red no entra aquí (AD-22): esta herramienta solo lee y escribe ficheros del corpus.

**Block If:**
- Cumplir un criterio exigiera duplicar en la herramienta las reglas que ya viven en el esquema de admisión.

**Never:**
- **No borrar ficheros de `corpus/`.** `AGENTS.md` lo prohíbe expresamente: git es el único almacén del contenido. Despublicar se hace moviendo, como se hace con una Cita.
- No tocar ninguna Cita al curar: ni sus Temas, ni su Autor, ni su estado.
- No sembrar Colecciones reales en el repositorio. La herramienta se prueba con corpus temporales; curar la primera de verdad es de Héctor.
- No reimplementar el umbral ni la resolución: se consumen de donde ya viven.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Crear | Nombre y criterio | Escribe `corpus/colecciones/{slug}.yml` con su slug derivado del nombre | Sin error |
| Crear repetida | Ya existe ese slug | Se rechaza sin tocar la existente | Código ≠ 0 |
| Asignar Cita publicada | Slug de una Cita de `corpus/citas/` | Queda en la lista de miembros, y la Cita no se toca | Sin error |
| Asignar Cita en revisión | Slug de una Cita de `corpus/_revision/` | Se rechaza diciendo que no está publicada | Código ≠ 0 |
| Asignar Cita inexistente | Slug con errata | Se rechaza nombrando el slug | Código ≠ 0 |
| Asignar dos veces la misma | Slug ya en la lista | No se duplica | Sin error |
| Estado bajo el umbral | Resuelve 4, umbral 15 | Dice cuántas faltan para publicarse | Sin error |
| Estado sobre el umbral | Resuelve 18 | Dice que está publicada | Sin error |
| Despublicar | Una Colección publicada | Deja de publicarse y **ninguna Cita se borra ni cambia** | Sin error |
| Edición a mano incumpliendo | Fichero escrito sin criterio | El esquema rompe el build igual | Construcción abortada |

</intent-contract>

## Code Map

- `tools/tema.ts` -- **el patrón**: un interruptor fino sobre `tools/lib/gestion.ts`, con `crear`, `eliminar` y `listar`, `raizDeCorpusDe` y `terminar` de `tools/lib/cli.ts`, y el umbral importado de `src/lib/umbrales.ts`.
- `tools/lib/gestion.ts` -- la lógica de gestión de entidades, devolviendo `Resultado` (`{ok:true, mensaje}` / `{ok:false, motivos}`). `crearTema`, `eliminarTema`, `crearAutor`, `editarAutor`. Aquí encaja la curación, o en un módulo hermano si crece.
- `tools/lib/corpus.ts` -- de la 12.2: `rutas.colecciones`, `leerColecciones`, `leerCitas`, y el lector que **describe** lo que hay aunque esté mal. También `rutas.revision`, que es como se sabe qué Citas **no** están publicadas.
- `src/lib/publicado.ts` -- de la 12.2: `resolverColeccion` y `coleccionesPublicadas`, y el umbral aplicado en un solo sitio. Consúmelos; no reimplementes ni el umbral ni la resolución.
- `src/lib/umbrales.ts` -- `MIN_CITAS_POR_COLECCION`, provisional y declarado como tal (AD-9).
- `src/lib/huecos.ts` y `tools/huecos.ts` -- **el precedente de «cuántas faltan»**: `HuecoDeTema` lleva `publicadas` y `faltan`, y el informe las presenta ordenadas de menos a más. La vista de estado de una Colección debe leerse igual.
- `src/lib/admision.ts` -- `coleccionAdmisible`, con el criterio acotado y los blancos rechazados. Es **la puerta**; la herramienta no la duplica.
- `tools/lib/colecciones.ts` + `integraciones/colecciones.ts` -- de la 12.2: la puerta de forma del conjunto, que rompe el build ante slugs duplicados.
- `src/lib/slug.ts` -- el slug se deriva del nombre con el ayudante compartido; no se inventa aquí.

## Tasks & Acceptance

**Execution:**
- `tools/lib/curacion.ts` (nuevo, o dentro de `gestion.ts` si encaja) -- la lógica: crear, asignar y quitar miembros, estado, y despublicar. Devuelve `Resultado` como sus hermanas. Consume el umbral y la resolución de donde ya viven.
- `tools/coleccion.ts` (nuevo) -- la orden, con el patrón de `tools/tema.ts`: `crear`, `asignar`, `quitar`, `estado`, `listar`, `despublicar`. Rechazos con código ≠ 0 vía `terminar`.
- Despublicar -- **decide y déjalo escrito**: `AGENTS.md` prohíbe borrar ficheros de `corpus/`, y AD-2 marca el precedente de que publicar una Cita es mover el fichero. Sigue ese precedente y explica en un comentario por qué la Colección se despublica igual que se retira una Cita.
- `tools/huecos.ts` -- mostrar también qué Colecciones están por debajo de su umbral y cuánto les falta, junto a los Temas -- es la misma pregunta y quien la hace la hace en el mismo momento.
- `package.json` -- guion para la orden nueva, como los de `objetivo` y `huecos`.
- `AGENTS.md` -- que curar una Colección se hace con esta orden, fuera del bloque gestionado por `bmad-project-context`.
- `tests/unit/curacion.test.ts` (nuevo) -- la matriz de E/S sobre lo puro: crear, repetida, asignar publicada, asignar en revisión, asignar inexistente, asignar dos veces, estado por debajo y por encima, y despublicar sin tocar Citas.
- `tests/unit/coleccion-cli.test.ts` (nuevo) -- sobre disco con corpus temporal: el ciclo completo —crear, asignar hasta pasar el umbral, comprobar estado, despublicar— con el corpus de Citas **intacto byte a byte** al terminar; y que un fichero escrito a mano incumpliendo el esquema rompe el build igual.

**Acceptance Criteria:**
- Given la herramienta, when creo una Colección con su criterio y su nombre y le asigno Citas, then solo admite Citas en estado `publicada`.
- Given una Colección por debajo de su umbral, when consulto su estado, then veo cuántas Citas le faltan para alcanzarlo, como en la vista de huecos.
- Given una Colección publicada, when la despublico, then ninguna Cita se borra ni cambia de estado.
- Given que la herramienta es comodidad y no puerta, when edito un fichero de Colección a mano saltándome la herramienta, then el esquema aplica las mismas reglas y rompe el build si se incumplen.
- Given el corpus de Citas, when termina cualquier operación de curación, then no ha cambiado ni un byte.

## Spec Change Log

## Review Triage Log

## Design Notes

**Esta es la historia que enciende la feature.** Las Épicas 12.2 y 12.3 dejaron el modelo y la superficie, pero `corpus/colecciones/` está vacío y lo seguirá estando mientras crear una Colección exija escribir YAML y contar de cabeza. Al cerrar esta historia, Héctor puede curar la primera y la Página de Colección deja de ser inerte. La herramienta no crea ninguna: solo hace barato crearla.

**Comodidad, no puerta.** La distinción es la misma que la 11.1 hizo con el sembrado: la herramienta evita el error honesto, y la puerta —el esquema de admisión, más la puerta de forma del conjunto— es la que impide el deshonesto. Duplicar las reglas en la herramienta las haría divergir; consúmelas.

**Por qué el estado se lee como la vista de huecos.** Quien cura una Colección y quien mira qué le falta al Corpus son la misma persona en el mismo momento. Si «le faltan 4» se dice de dos formas distintas en dos sitios, una de las dos acabará mintiendo.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run` -- expected: todo en verde; ninguna de las 1107 de la línea base perdida.
- `npm run build` -- expected: construye, con la puerta de la 11.2 intacta y sin Colecciones reales.
- `git status --porcelain corpus/` -- expected: vacío tras correr la suite; la herramienta no siembra nada en el repositorio.

### 2026-08-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 12: (high 4, medium 4, low 4)
- defer: 2: (low 2)
- reject: 9: (low 9)
- addressed_findings:
  - `[high]` `[patch]` `escribirColeccion` componía siempre `{slug}.yml`, pero el lector y el cargador de Astro aceptan `.yml` y `.yaml`: un `asignar` sobre una Colección guardada como `.yaml` creaba un segundo fichero con el mismo slug, informaba de éxito y ponía el build en rojo por la puerta de la 12.2. Ahora escribe en la ruta que devolvió el lector.
  - `[high]` `[patch]` Crear una Colección después de despublicar otra con el mismo slug la dejaba sin poder retirarse, y el fallo salía como traza de Node. Se comprueba también contra las retiradas, y todo movimiento pasa por un envoltorio que convierte la negativa a sobrescribir en un rechazo redactado.
  - `[high]` `[patch]` Un `asignar` sobre un fichero editado a mano borraba en silencio las claves que el lector no reconoce, porque el esquema veía un objeto reconstruido de tres campos y nunca el juego de claves real. Ahora se valida el YAML crudo, así que un `miembos:` mal escrito —que el build rechaza— se rechaza también aquí, sin tocar el fichero.
  - `[high]` `[patch]` `AGENTS.md` afirmaba que editar a mano «no se salta ninguna regla», y sí se salta una: la de que el miembro esté publicado, que ningún esquema puede tener. El documento que lee un humano decía algo que el comentario del código desmentía.
  - `[medium]` `[patch]` Una bandera mal tecleada se ignoraba y la orden escribía en el corpus **real**, justo lo contrario de la restricción de no sembrar Colecciones reales. Verificado: `--corpuss` sale con código 2 y no toca nada.
  - `[medium]` `[patch]` La sección de Colecciones del informe de huecos no la ejercitaba nada, porque todas las llamadas al CLI corren contra el corpus real, que está vacío. Tres pruebas sobre corpus temporales, una de las cuales extrae la línea del informe y exige que `estado` la contenga literalmente, para que las dos lecturas no puedan divergir.
  - `[medium]` `[patch]` `listar` no tenía ninguna aserción y su rama de «se publica» reescribía a mano el formato recién centralizado — una tercera redacción en un cambio cuya tesis es que la segunda acabará mintiendo.
  - `[medium]` `[patch]` Un solo fichero de Colección con YAML ilegible mataba el informe de huecos entero, incluidas las secciones de Temas y tradición.
  - `[low]` `[patch]` Recuento sin deduplicar; falta de `publicar` como espejo de `despublicar` cuando un mensaje de rechazo remitía a `listar` para encontrar las retiradas; y el docblock del umbral que decía «es el único sitio» cuando ya había dos lectores informativos.

## Auto Run Result

Status: done

**Cambio implementado.** `npm run coleccion` crea una Colección con su nombre y criterio, le asigna y le quita Citas —**solo publicadas**—, dice cuánto le falta para publicarse, la despublica moviéndola a `corpus/_colecciones-retiradas/` y la vuelve a publicar. `tools/huecos.ts` enumera además las Colecciones cortas junto a los Temas, con la misma redacción. Es comodidad y no puerta: lo que la herramienta rechaza por forma lo rechaza también el esquema, y lo único que impone ella sola es lo que ningún esquema puede ver.

**Verificación.** `npx astro check` 0 errores sobre 147 ficheros. `npx vitest run` **1158/1158** en 44, frente a 1107/42 de la línea base. `npm run build` construye con la puerta de la 11.2 intacta. `npx playwright test` 398 pasan. `git status --porcelain corpus/` vacío. Y a mano: el ciclo completo sobre un corpus temporal deja las Citas intactas byte a byte, un slug inexistente se rechaza con código 1, una bandera mal tecleada sale con código 2 sin tocar el corpus real, y un `asignar` sobre un fichero `.yaml` escribe en ese mismo fichero sin duplicarlo.

**Recomendación de nueva revisión: true.** Cuatro hallazgos de severidad alta, tres de ellos con pérdida de datos o escritura fuera de sitio.

**Riesgos residuales.** Los dos diferidos están en el frontmatter, ambos de baja severidad y ambos con la decisión escrita.
