---
title: 'Historia 19.11 — La numeración de verso del escaneo no se versiona'
type: 'bugfix'
created: '2026-09-14'
status: 'done'
baseline_commit: '30a76c991f813dadc6fadac44f1524cf42944bca'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/LOOP-PROTOCOL-V5.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** la recuperación de Wikisource-es versiona como texto de la obra los números de verso del escaneo: en la Eneida de Ochoa, libro I, son `<sup>5</sup>` sin atributos pegados a la palabra siguiente («1Canto», «5Mucho»), porque solo se retira el `<sup class="reference">`. Es aparato guardado como si fuera de Virgilio, y seguirá entrando en cada obra numerada que se recupere. No mejora el margen de la canaria: el peor documento es hoy una fábula de Fedro.

**Approach:** la recuperación retira los `<sup>` sin atributos cuyo único texto son cifras, sustituyéndolos por un espacio, y se miden y regeneran con `recuperar` los once documentos con cifras pegadas, comparando con lo versionado.

## Boundaries & Constraints

**Always:**
- La regla mira el contenido: `<sup>` sin atributos (en mayúsculas o minúsculas) cuyo texto, quitados blancos y `&#160;`, son 1 a 4 cifras.
- Se sustituye por un espacio, nunca por nada: una palabra pegada no la detecta ningún cotejo.
- Los once documentos se miden en la Fuente; los que traen `<sup>` de solo cifras se regeneran con `tools/recuperar.ts` y el nuevo solo vale si la declaración es idéntica y al cuerpo solo le faltan esas cifras. Los que no lo traen se anotan y no se tocan.
- La canaria y `MAX_PROPORCION_ILEGIBLE` no se tocan.

**Ask First:**
- Un documento regenerado que cambie en algo más que las cifras.
- Extender la regla a `<sup>` con atributos, con letras, con marcado dentro o a superíndices Unicode.

**Never:**
- Editar a mano un documento de `corpus/fuentes/`.
- Quitar cifras del texto plano: la regla vive en el marcado, antes de `aTextoPlano`.
- Tocar el lector de Gutenberg.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Numeración con espacio antes | `Juno. <sup>5</sup>Mucho padeció` | «Juno. Mucho padeció» | N/A |
| Numeración sin espacio | `palabra<sup>10</sup>siguiente` | «palabra siguiente», nunca «palabrasiguiente» | N/A |
| Mayúsculas y blancos | `<SUP> 15&#160;</SUP>Es` | «Es», sin cifras | N/A |
| Marcado dentro | `<sup><span>5</span></sup>` | Se conserva | Ask First |
| Ordinal con letra | `1<sup>o</sup>` | Se conserva | N/A |
| Llamada de nota | `<sup class="reference">[1]</sup>` | Se retira, como hoy | N/A |
| Atributos y cifras | `<sup style="x">7</sup>` | Se conserva | N/A |
| Exponente sin atributos | `10<sup>6</sup>` | Se retira: riesgo aceptado, el Corpus es literario | N/A |
| Documento sin `<sup>` de cifras | Soliloquios con OCR («8ólo») | Se anota; no se regenera | N/A |
| Cambio ajeno | La Fuente cambió otra frase | Se restituye el viejo | Ask First |

</frozen-after-approval>

## Code Map

- `tools/lib/documento.ts:1152` -- `region(bruto)` del lector `'wikisource-es'` (:1134). La regla va tras el bucle de `CROMO_MEDIAWIKI`: `quitarElementos` (:154) retira por la apertura y no ve el contenido.
- `tools/lib/documento.ts:1069-1085` -- `CROMO_MEDIAWIKI`, con `sup.reference` (:1077) y `div#conv-idiomas` (:1084). Estilo del comentario.
- `tools/lib/documento.ts:92` -- `aTextoPlano`. No se toca.
- `tests/unit/documento.test.ts:126` -- describe del conversor; la prueba nueva va detrás, sobre el fixture `WIKISOURCE` (:36).
- `tests/unit/legibilidad.test.ts:234` -- la canaria. Solo se lee.
- `tools/peor-legible.ts` -- la medida de la historia: cifra-en-palabra por documento.
- Medido el 14/09: libro I trae 86 `<sup>` sin atributos de solo cifras; libro II y «El ciervo y la oveja», 0. Once documentos con cifras pegadas a inicio de palabra: libro I; los Soliloquios I, II, III, IV, VI, X, XI y XII (con OCR de griego, «8ólo», «6eodixala»); Guerra de Jugurta («9leptitanos»); La ciudad de Dios XV; El banquete de Jenofonte. Cero Citas publicadas llevan cifra pegada a letra.
- Medido en la Fuente el 14/09, en la implementación (`<sup>` sin atributos de solo cifras en el HTML de la página). La lista de arriba nombra doce documentos, no once; se midieron esos doce y, además, los que añadió una sonda más amplia de cifra pegada a inicio de palabra, y el libro II de la Eneida. Resultado por documento:
  - La Eneida (Ochoa), libro I: **86**. Regenerado.
  - La Eneida (Ochoa), libro II: 0.
  - Soliloquios, libros I, II, III, IV, V, VI, VII, VIII, IX, X, XI y XII: 0 cada uno (VII y VIII salieron de la sonda amplia; V y IX se midieron porque se recorrieron los doce libros).
  - Guerra de Jugurta: 0.
  - La ciudad de Dios XV: 0.
  - El banquete (Jenofonte): 0.
  - Sonda amplia: Ética a Nicómaco, libro 8: 0; Las traquinias (Alemany y Bolufer): 0; Antígona (Alemany y Bolufer): 0; Odas (Horacio, Salinas), I: 0; Odas (Horacio, Salinas), III: 0; Discurso en defensa del talento de las mugeres: 0.
  - Todos los de 0 se anotan y no se regeneran: sus cifras pegadas son OCR del texto, no numeración.

## Tasks & Acceptance

**Execution:**
- [x] `tests/unit/documento.test.ts` -- prueba de la matriz sobre el fixture, que falla antes del cambio -- TDD de la casa.
- [x] `tools/lib/documento.ts` -- la regla en `region()` de `'wikisource-es'`, con comentario: qué es, la cifra medida, por qué un espacio y por qué no va en `CROMO_MEDIAWIKI`.
- [x] Medición -- HTML de la Fuente de los once documentos: cuántos `<sup>` de solo cifras trae cada uno.
- [x] `corpus/fuentes/` -- regenerar con `recuperar` los que los traen, apartando el viejo y comparando; anotar los que no.
- [x] `_bmad-output/specs/spec-brainlySabiduria/.memlog.md` -- hallazgo, decisión y resultado por documento.

**Acceptance Criteria:**
- Given la Eneida libro I regenerada, when se mide con `tools/peor-legible.ts`, then su cifra-en-palabra es 0.
- Given los documentos regenerados, when corre el cotejo del build, then toda Cita publicada sigue literal en su documento.

## Design Notes

Por contenido y no por marcador: la numeración no trae clase ni id, así que ninguna apertura la distingue. La distingue no llevar atributos y contener solo cifras. Por un espacio: el número va a veces entre dos palabras sin blanco, y borrarlo las pegaría; un espacio de más lo absorbe la normalización. El exponente sin atributos es el precio aceptado: ninguna Cita publicada lleva cifra pegada a letra.

## Verification

**Commands:**
- `npx vitest run tests/unit/documento.test.ts` -- expected: la prueba nueva falla antes y todo pasa después.
- `npx tsx tools/peor-legible.ts` -- expected: la Eneida libro I sin cifra-en-palabra.
- `npx astro check` -- expected: 0 errores.
- `npm test` -- expected: sin regresión, salida en fichero y código de salida 0.

## Suggested Review Order

**La regla**

- Qué se retira y por qué por contenido: la apertura sin atributos no distingue nada.
  [`documento.ts:1104`](../../tools/lib/documento.ts#L1104)

- Dónde: tras el cromo y antes de `aTextoPlano`, sustituido por un espacio.
  [`documento.ts:1179`](../../tools/lib/documento.ts#L1179)

**El documento regenerado**

- La Eneida, libro I: 86 cifras menos, declaración y 8.589 palabras idénticas.
  [`la-eneida-ochoa-libro-i.txt:23`](../../corpus/fuentes/wikisource-es--la-eneida--la-eneida-ochoa-libro-i.txt#L23)

**Pruebas**

- La matriz sobre el fixture, con guarda de que el reemplazo casó.
  [`documento.test.ts:157`](../../tests/unit/documento.test.ts#L157)

- Lo que se conserva: marcado dentro, letras, atributos y cinco cifras.
  [`documento.test.ts:205`](../../tests/unit/documento.test.ts#L205)
