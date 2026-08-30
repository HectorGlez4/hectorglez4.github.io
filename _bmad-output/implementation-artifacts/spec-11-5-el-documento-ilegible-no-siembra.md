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


### Review Findings

Revisión de código del 28/08/2026 sobre el rango `6dc0b8dd..a15c6e5d` (12 ficheros, 653+/14−),
cuatro capas: Blind Hunter, Edge Case Hunter, Verification Gap y Acceptance Auditor.

**Aviso de alcance.** Esta historia está `done` y es anterior al código revisado. Sólo los
hallazgos marcados `[11.5]` le pertenecen; los demás se anotan aquí porque entraron en el mismo
rango, con su historia real entre corchetes.

- [ ] [Review][Decision] [11.5] La señal de edición rota no llega al veredicto del documento — AC-1 pide que un documento con el OCR roto salga con código ≠ 0 y ninguna candidata; `tienePuntuacionRota` se aplica sólo por candidata, y el recuento es informativo. ¿Debe una proporción alta de puntuación rota tumbar el documento entero?
- [ ] [Review][Decision] [11.5] El literal `{4,}` de `PUNTO_INTRUSO` vive fuera de `umbrales.ts` — AD-9 dice que un umbral de negocio vive en `src/lib/umbrales.ts` y en ningún otro sitio. Precedente en contra: `MIN_CARACTERES_CANDIDATA` y `MAX_CARACTERES_CANDIDATA` ya viven en `tools/lib/extraccion.ts`. ¿Se mueve o se declara la excepción?
- [ ] [Review][Decision] [11.5] `... ;` se aparta y `... .` se perdona — la excepción de puntos suspensivos cubre el punto pero no la coma ni el punto y coma, y una prueba nueva afirma que `consuelo... ;pero` está roto. ¿Es tipografía legítima del XIX o defecto?

- [ ] [Review][Patch] [11.1] La comilla baja `„` no está en ningún conjunto y `“` se asume siempre de apertura: el par alemán `„…“`, equilibrado, se lee descompensado y la candidata se descarta [tools/lib/extraccion.ts:394]
- [ ] [Review][Patch] [11.1] Las dos familias de comillas no se emparejan: `«texto”` cuenta como equilibrado [tools/lib/extraccion.ts:394]
- [ ] [Review][Patch] [11.5] Ninguna prueba fija la puerta de puntuación al aprobar: borrar `!puntuacion` de `admisible` deja la suite entera en verde [tools/lib/revision.ts:124]
- [ ] [Review][Patch] [11.1+11.5] Ninguna de las dos puertas nuevas está probada donde se conecta, dentro de `extraerCandidatas`; la del aparato lo está cuatro veces [tools/lib/extraccion.ts:685,695]
- [ ] [Review][Patch] [11.1] La docstring de `esTrozoDeCitaAjena` quedó huérfana 70 líneas por encima de su función, y `MINUSCULA` hereda un ensayo sobre comillas [tools/lib/extraccion.ts:323]
- [ ] [Review][Patch] [10.1] El comentario de la prueba del sitemap afirma que `/buscar` «llevaba desde siempre en el sitemap sin imagen ninguna», y es falso: no está en el sitemap. El fichero se contradice dos párrafos más abajo [tests/e2e/tarjeta.spec.ts:151]
- [ ] [Review][Patch] [11.1+11.5] Las dos líneas nuevas del informe de `extraer` no se comprueban en ninguna prueba [tools/extraer.ts:484,487]
- [ ] [Review][Patch] [10.1] Las rutas del sitemap con estado ≠ 200 se saltan en silencio: una página anunciada y rota pasa la prueba [tests/e2e/tarjeta.spec.ts:89]
- [ ] [Review][Patch] [10.1] `sitemap-0.xml` está fijo: el censo muere el día que el sitemap se parta en varios [tests/e2e/tarjeta.spec.ts:80]
- [ ] [Review][Patch] [11.5] El razonamiento de las abreviaturas no describe lo que mide el regex: cuenta la racha antes del punto, no la longitud de la abreviatura, y `Excmo.` y `págs.` la pasan [tools/lib/extraccion.ts:610]
- [ ] [Review][Patch] [3.2+4.3] `textContent` incluye el texto de elementos ocultos, que `innerText` no veía; `/buscar` tiene `.estado` y `.salida` con `hidden` [tests/e2e/busqueda.spec.ts:215]
- [ ] [Review][Patch] [4.3] La Cita del Día sigue dentro del alcance del 404: una Cita cuyo texto lleve «error» o «¡» reabre el mismo falso rojo [tests/e2e/pagina-404.spec.ts:46]
- [ ] [Review][Patch] [10.1] El barrido del sitemap pide 1708 rutas en serie sin `test.slow()`, en dos proyectos; el barrido hermano del mismo fichero documenta haber muerto por tiempo dos veces [tests/e2e/tarjeta.spec.ts:160]
- [ ] [Review][Patch] [11.5] Falta el caso de verso en las pruebas nuevas: `\s` incluye el salto de línea, y el spec nombra la poesía como el lado sano que más pesa [tests/unit/puntuacion-rota.test.ts]
- [ ] [Review][Patch] [11.5] `MINUSCULA` no lleva `à è ì ò ù ç`, presentes en ediciones de época [tools/lib/extraccion.ts:346]
- [ ] [Review][Patch] [varias] La misma puerta lleva tres números de historia: 9.2, 11.1 y 10.1 [tests/unit/cita-ajena-al-aprobar.test.ts]
- [ ] [Review][Patch] [varias] Tres líneas base distintas —1595, 1632, 1639— presentadas como la misma medida, sin fecha ni sesión [tools/lib/extraccion.ts]

- [x] [Review][Defer] [11.5] `PUNTO_INTRUSO` exige espacio tras el punto, así que se le escapa «leerlo.hay» [tools/lib/extraccion.ts:610] — deferred, pide su propia medición antes de aflojar el patrón
- [x] [Review][Defer] [11.1] `recuperar`: el nombre se recorta a 60 caracteres, así que dos obras largas distintas pueden colisionar y negarse una nueva como «ya retirada» [tools/recuperar.ts] — deferred, pre-existente
- [x] [Review][Defer] [11.1] `yaVersionado` se comprueba antes que `yaRetirado`: un documento en ambas carpetas se reutiliza sin nombrar la retirada [tools/recuperar.ts] — deferred, pre-existente
- [x] [Review][Defer] [11.1] Las 351 candidatas ya versionadas con comillas descompensadas siguen en la cola, sin informe ni purga [corpus/_revision] — deferred, pre-existente
- [x] [Review][Defer] [—] CI no ejecuta el E2E, así que la garantía del `og:image` sólo vale en local [.github/workflows/publicar.yml] — deferred, pre-existente y documentado en AGENTS.md
- [x] [Review][Defer] [11.5] Las señales de la 11.5 viven en dos módulos y `legibilidad.ts` sigue diciendo «seis señales» [src/lib/legibilidad.ts] — deferred, pre-existente
