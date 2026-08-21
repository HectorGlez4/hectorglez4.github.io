---
title: 'Story 11.5 — Un documento ilegible no siembra'
type: 'feature'
created: '2026-08-20'
status: 'done'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-1b-el-ano-sale-del-wikitexto.md'
warnings: []
deferred: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El cotejo literal de la 11.2 comprueba que una Cita **es fiel a su documento**, no que el documento **sea legible**. Un escaneo con el OCR roto pasa la puerta entera: la basura aparece literal en su fichero, así que el build la publica sin una queja.

No es hipotético. La primera sesión de sembrado real recuperó el *Apéndice a Mis últimas tradiciones peruanas* de Ricardo Palma y extrajo **61 candidatas** con texto corrupto: «enseiia», «Ileno», «For- mabalo», «qus», «tata\* rabuelos», «italianoTonti», «6» donde va «ó». Cualquiera de ellas se habría publicado **bajo la firma de Palma**, con la Procedencia correcta y el cotejo en verde. Solo lo paró que una persona las leyera una por una.

**Approach:** Una puerta de legibilidad en la extracción, entre recuperar y proponer. Se mide el documento —y cada candidata— contra señales de OCR roto que se pueden contar sin entender el texto, y lo que no las supera **no llega a `corpus/_revision/`**. Una candidata que nadie propone no se puede aprobar por descuido.

## Boundaries & Constraints

**Always:**
- La puerta vive en la **extracción**, no en el cotejo. El cotejo tiene un trabajo —fidelidad al documento— y hacerle además de juez de calidad lo convertiría en dos cosas distintas con un solo mensaje de error.
- Lo que se rechaza se **dice, y se cuenta**, como ya se cuentan las descartadas por longitud y por idioma. Un descarte mudo es el mismo problema con otro disfraz.
- Las señales se miden sobre el texto, sin diccionario ni servicio externo: la red vive solo en `tools/recuperar.ts` (AD-22) y el build no descarga nada (AD-14).
- El umbral es un literal de negocio: vive en `src/lib/umbrales.ts` y en ningún otro sitio (AD-9).
- **Ausencia antes que mutilación**, como siempre: una candidata sospechosa se descarta entera; jamás se «arregla» el texto para que pase. Corregir un OCR a ojo es inventar lo que la edición decía.

**Ask First:**
- Si la puerta exigiera una dependencia nueva, un diccionario embebido o un servicio.

**Never:**
- No relajes el cotejo de la 11.2 para compensar. Son puertas distintas y las dos tienen que estar.
- No apliques la puerta a las 38 Citas anteriores a la v3: su censo es cerrado y solo baja.
- No conviertas esto en un corrector: no se toca ni un carácter de ningún texto.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Documento sano | Una página de Wikisource bien transcrita | Extrae como hoy | Sin error |
| Documento corrupto | El *Apéndice* de Palma, con su OCR roto | **Ninguna candidata** llega a revisión, y la orden dice por qué y con qué medida | Código ≠ 0 |
| Corrupción salpicada | Documento sano con unos pocos párrafos rotos | Las candidatas afectadas se descartan y se cuentan; las sanas entran | Sin error |
| Palabra rara legítima | Un texto con arcaísmos, latín o nombres propios extranjeros | **No** se descarta: la señal es de OCR, no de vocabulario | Sin error |
| Poesía con guiones y elisiones | «auri-rizada», «¡Oh!», versos cortos | No se descarta | Sin error |
| Documento ya versionado | Uno recuperado antes de esta historia | Se puede volver a extraer y la puerta se aplica igual | Sin error |

</frozen-after-approval>

## Code Map

- `tools/lib/extraccion.ts` -- `extraerCandidatas`, y los descartes que ya existen y son el molde exacto: por longitud y por no estar en español. La puerta nueva es una tercera del mismo tipo, con su recuento.
- `tools/extraer.ts` -- imprime «Descartadas por longitud / por no estar en español / por repetidas». Aquí entra la línea nueva.
- `src/lib/umbrales.ts` -- AD-9. El umbral de legibilidad se declara aquí, con el comentario que explica de dónde sale el número.
- `tools/lib/cotejo.ts` -- **no se toca**. Sirve para entender por qué esta puerta no puede vivir ahí: `apareceEnDocumento` colapsa espacios y compara, y eso es todo lo que tiene que hacer.
- `corpus/fuentes/` -- hoy solo quedan los dos documentos de González Prada; el corrupto se retiró a mano. Para probar hace falta fabricar uno, no recuperarlo.

## Tasks & Acceptance

**Execution:**
- [ ] `src/lib/legibilidad.ts` (nuevo, puro) -- las señales contables de OCR roto y una medida por texto. Candidatas de señal, a decidir con datos del documento real: palabras partidas por guion y salto («For- mabalo»), mayúsculas intercaladas dentro de palabra («italianoTonti»), letras sueltas donde va una vocal acentuada («6» por «ó», «i» por «í»), caracteres que no pertenecen al español ni a la puntuación, y proporción de palabras que no son pronunciables en español.
- [ ] `src/lib/umbrales.ts` -- el umbral, documentado.
- [ ] `tools/lib/extraccion.ts` -- el descarte, con su recuento, y el rechazo del documento entero cuando la medida global lo condena.
- [ ] `tools/extraer.ts` -- la línea de recuento y el motivo redactado.
- [ ] `tests/unit/legibilidad.test.ts` (nuevo) -- la matriz sobre lo puro, **con las frases reales del documento de Palma** como fixture: son la mejor prueba que hay y no se van a volver a conseguir por casualidad. Y el otro lado, que es el que de verdad importa: arcaísmos, latín, nombres extranjeros y la poesía de Nervo **no** se descartan.
- [ ] `tests/unit/extraer-cli.test.ts` -- por la orden: documento corrupto que no propone nada, y documento salpicado que propone solo lo sano.

**Acceptance Criteria:**
- Given un documento con el OCR roto, when lo extraigo, then ninguna candidata llega a `corpus/_revision/` y la orden dice por qué.
- Given un documento sano con algún párrafo roto, when lo extraigo, then las afectadas se descartan y se cuentan, y las sanas entran.
- Given un texto con vocabulario raro pero bien transcrito, when lo extraigo, then no se descarta nada por legibilidad.
- Given cualquier documento, when la puerta actúa, then no se modifica ni un carácter de ningún texto.

## Design Notes

**Por qué no basta con el cotejo, dicho con el caso real.** «For- mabalo un pliego, en folio menor» aparece **literal** en su documento. La 11.2 se cumple perfectamente y el resultado es una Cita mutilada publicada con la firma de Ricardo Palma. Las dos puertas miden cosas distintas: una, que no nos hayamos inventado el texto; otra, que la edición de la que salió se pueda leer.

**Por qué en la extracción y no en la recuperación.** Recuperar es un acto de archivo: versionar lo que la Fuente da, tal cual. Un documento con mal OCR sigue siendo un registro válido de lo que hay ahí, y borrarlo perdería la evidencia. Lo que no puede es **sembrar**.

**El riesgo real de esta historia es el falso positivo.** Una puerta demasiado estricta descarta a Góngora, el latín de Séneca o «auri-rizada» de Nervo, y entonces el Corpus deja de crecer por donde más valor tiene. Por eso las pruebas del lado sano pesan más que las del corrupto, y por eso el umbral se declara **provisional**: sale de un solo documento y habrá que moverlo cuando haya más.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run` -- expected: verde; ninguna de las 1589 de la línea base perdida.
- `npx tsx tools/extraer.ts corpus/fuentes/wikisource-es--el-sable.txt --autor manuel-gonzalez-prada --seco` -- expected: sigue proponiendo lo que proponía; la puerta no toca un documento sano.
