---
title: 'Historia 18.3 — El registro de lo que se pidió'
type: 'feature'
created: '2026-09-05'
status: 'in-review'
baseline_commit: '5c8f09f66900023df0c6ff5de0ee1797d0623ea2'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-16-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** el 4/09 se pidió rastreo a mano de dos URL —Unamuno y Gracián, las dos únicas con impresiones— y **no quedó registrado en ninguna parte**. Cuando la serie de indexación muestre movimiento, no habrá forma de saber si esas dos entraron porque se pidieron o porque les tocaba. Y eso es justo lo que decide si pedir rastreo sirve para algo o es teatro.

**Approach:** un registro versionado de qué se pidió y cuándo, que la serie pueda cruzar. La petición en sí **la cursa una persona** en Search Console; esto solo la anota.

## Boundaries & Constraints

**Always:**
- Registra **la URL y la fecha**. Nada más hace falta para cruzarlo con la serie.
- Es **append-only**: una petición ocurrió, y una segunda petición de la misma URL otro día es otro hecho. Es lo contrario de la serie de indexación, que reemplaza por fecha porque mide un estado.
- La selección **la escribe una persona**. La orden anota lo que se le dice; no elige.

**Ask First:**
- Automatizar la petición contra la API. Search Console tiene endpoint de inspección pero **no** de solicitud de indexación; la Indexing API es solo para ofertas de empleo y retransmisiones, así que hoy no hay vía legítima. Si algún día la hay, es decisión de producto y no de implementación.

**Never:**
- Pedir rastreo del Corpus entero, ni de un número que no quepa en una decena. §4.17 lo declara ruido.
- Inventar que algo se pidió. Un registro que no corresponde a una petición real es peor que no tenerlo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Anotar una petición | URL publicada del sitio | Entrada con URL y fecha, añadida al final | N/A |
| La misma URL otro día | Ya hay una entrada suya | **Se añade otra**: son dos hechos | N/A |
| URL que el sitio no publica | Ruta inexistente o no publicable | **Se rechaza** nombrando el motivo | No se anota nada |
| Más de una decena de golpe | Lote grande | Se rechaza: §4.17 lo llama ruido | No se anota nada |
| Consultar sin anotar | Orden sin la bandera | Lista lo pedido y no toca el fichero | N/A |
| Cruzar con la serie | Registro y serie presentes | Se puede decir de cada familia cuánto se pidió | N/A |

</frozen-after-approval>

## Code Map

- `corpus/serie-de-indexacion.yml` -- la serie que este registro complementa. **Difiere en algo que hay que escribir en la cabecera:** aquélla reemplaza por fecha porque mide un estado; ésta solo añade porque registra hechos.
- `corpus/sesiones-de-sembrado.yml` -- el precedente de una serie append-only, con su cabecera explicando qué mide y por qué.
- `tools/lib/corpus.ts` -- `registrarSesionDeSembrado`: crea con `wx`, lee antes de escribir. El escritor sigue este patrón.
- `tools/indexacion.ts` -- la orden hermana. `--registrar` como bandera y consultar no registra: misma forma.
- `src/lib/publicado.ts` y `src/lib/superficies.ts` -- de aquí sale si una URL es publicable y de qué familia. La validación se deriva, no se escribe. `publicado.ts` **decide**; `superficies.ts` solo aporta el **motivo** que se le da a quien teclea.
- `src/lib/dominio.ts` -- el dueño del dominio. Una URL de otro host no corresponde a ninguna petición de esta propiedad y se rechaza nombrándolo.
- `DESPLIEGUE.md` §2 y §5 -- los runbooks de lo que se hace a mano en Search Console. El de esta historia va detrás, como §6.
- Hecho el 2026-09-04 y sin registrar: `/autor/miguel-de-unamuno/` y `/autor/baltasar-gracian/`. Son las dos primeras entradas.

## Tasks & Acceptance

**Execution:**
- [x] `tools/lib/rastreo.ts` -- módulo puro que valida una selección contra el conjunto publicable y contra el tope de la decena, y compone la entrada.
- [x] `tools/lib/corpus.ts` -- `registrarPeticionesDeRastreo`, append-only, siguiendo `registrarSesionDeSembrado`.
- [x] `tools/rastreo.ts` -- la orden: lista lo pedido y lo cruza por familia con la serie, y anota **solo** con `--registrar`.
- [x] `corpus/peticiones-de-rastreo.yml` -- con su cabecera, diciendo qué mide y **por qué añade en vez de reemplazar**; y la cabecera de la serie, que ahora nombra a su vecina.
- [x] Las dos peticiones del 2026-09-04 —Unamuno y Gracián—, anotadas con su fecha real.
- [x] Pruebas de la matriz entera: `tests/unit/rastreo.test.ts`, 46 casos.
- [x] `DESPLIEGUE.md` §6 -- el procedimiento manual en Search Console, y **el recordatorio**:
      la utilidad entera depende de que quien pide el rastreo se acuerde después de ejecutar
      la orden, y ese olvido es el modo de fallo más probable de la historia.

**Acceptance Criteria:**
- Given una URL que el sitio no publica, when se intenta anotar, then se rechaza nombrando el motivo y no se escribe nada.
- Given la misma URL anotada dos días distintos, when se lee el registro, then constan las dos.
- Given el registro y la serie, when se cruzan, then se puede decir de cada familia cuántas de sus URL se pidieron.

## Design Notes

**Por qué append-only y no idempotente por fecha.** Su hermana mide un estado —cuántas están indexadas hoy— y por eso una segunda lectura del mismo día reemplaza. Ésta registra actos: pedir rastreo dos veces son dos peticiones, y borrar la primera perdería justo el dato de si repetir sirve. Las dos cabeceras deben decir cuál es cuál, porque están una al lado de la otra y la confusión sería silenciosa.

## Verification

**Commands:**
- `npx vitest run <las pruebas nuevas>` -- expected: la matriz en verde.
- `npx astro check` -- expected: 0 errores.
- `npm test` -- expected: sin regresión.
- `git status --short` -- expected: solo los ficheros de la historia.
