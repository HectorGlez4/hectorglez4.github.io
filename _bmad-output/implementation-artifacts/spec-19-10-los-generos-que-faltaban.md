---
title: 'Historia 19.10 — Los géneros que faltaban en la categoría de Autor'
type: 'feature'
created: '2026-09-13'
status: 'in-review'
baseline_commit: '96c484cf'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/LOOP-PROTOCOL-V5.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** las siete tragedias de Sófocles se versionan mudas llevando escrito `[[Categoría:Tragedias de Sófocles]]`. No falla la guarda de la 19.8 —«Sófocles» la pasa— sino la **lista cerrada de géneros**: tiene «obras», «poemas» y «cuentos», y no tiene «tragedias». Con ella se caen también Aristófanes y Esquilo, que Wikisource clasifica bajo «Teatro de …».

**Approach:** cinco géneros más en la misma lista cerrada, cada uno medido. Y, por primera vez, **tres que se miden y se dejan fuera a propósito**, porque nombran a otro: al traductor, al ilustrador o al retratado.

## Boundaries & Constraints

**Always:**
- La lista sigue **cerrada**. Un género entra con su cifra medida contra la Fuente, o no entra.
- La guarda de la 19.8 sigue delante sin tocarse: sea cual sea el género, el nombre tiene que parecer nombre de persona.
- La categoría sigue siendo el **último** eslabón de la cadena de Autor.

**Ask First:**
- Cualquier género que no nombre al Autor de forma inequívoca.
- Abrir la lista a «cualquier palabra seguida de *de*». Es lo contrario de una lista cerrada, y el argumento de la regla original.

**Never:**
- **«Traducciones de …», «Ilustraciones de …» y «Documentos de …».** Los tres son frecuentes —137, 55 y 292 categorías— y los tres nombran a **quien no escribió**: el traductor, el ilustrador, el retratado. Atribuirle la obra a un traductor es exactamente lo que FR-23 existe para impedir.
- Géneros que nombren un lugar o un Estado: «Historia de …», «Leyes de …», «Constituciones de …», «Tratados de …».

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tragedia | `Categoría:Tragedias de Sófocles` | Declara «Sófocles» | N/A |
| Teatro | `Categoría:Teatro de Aristófanes` | Declara «Aristófanes» | N/A |
| Fábula | `Categoría:Fábulas de Esopo` | Declara «Esopo» | N/A |
| Título de libro, no persona | `Categoría:Fábulas de Esopo, filósofo moral, y de otros famosos autores` | **No declara**: la guarda de la 19.8 lo para | N/A |
| Traductor | `Categoría:Traducciones de Alejo García Moreno` | **No declara nada** | N/A |
| Lugar | `Categoría:Historia de Alemania` | No declara nada | N/A |

</frozen-after-approval>

## Code Map

- `tools/lib/documento.ts:788` -- `GENERO_DE_CATEGORIA`. Es la lista, y es lo único que cambia.
- `tools/lib/documento.ts:792` -- `pareceNombreDePersona` (19.8). **No se toca**: sigue siendo la guarda que va detrás.

**Medido el 13/09/2026 contra la API de Wikisource-es.** «Pasan» es lo que además supera la guarda de la 19.8:

| Género | Categorías | Pasan | No son persona |
|---|---|---|---|
| Tragedias de … | 2 | 2 | **0** |
| Comedias de … | 3 | 3 | **0** |
| Fábulas de … | 16 | 14 | **0** *(las 2 que caen son títulos de libro, y las para la guarda)* |
| Epístolas de … | 37 | 37 | **0** |
| Teatro de … | 42 | 42 | **0** |
| Sonetos de … | 164 | 164 | **0** |

**262 categorías, cero falsos positivos.** Es el listón que la casa exige para una puerta, y esta vez sí se alcanza.

Y los tres que se quedan fuera, medidos igual: `Traducciones de …` 137 · `Ilustraciones de …` 55 · `Documentos de …` 292.

## Tasks & Acceptance

**Execution:**
- [x] `tools/lib/documento.ts` -- los cinco géneros en la lista, con la cifra que los justifica.
- [x] El comentario nombra los tres excluidos y **por qué**, que es lo que impide que alguien los añada mañana.
- [x] Pruebas de la matriz, con «Traducciones de …» entre ellas.
- [x] Sembrar a Sófocles, que es lo que la historia desbloquea.

**Acceptance Criteria:**
- Given `[[Categoría:Tragedias de Sófocles]]`, when se deriva, then declara «Sófocles».
- Given `[[Categoría:Traducciones de Alejo García Moreno]]`, when se deriva, then no declara Autor.
- Given las tragedias recuperadas, when corre la prueba de FR-23, then ninguna queda muda.

## Design Notes

**Por qué la lista sigue cerrada aunque crezca.** La tentación es leer «cualquier palabra + de + Nombre». Cubriría todo de golpe y metería «Traducciones de», «Ilustraciones de» y «Documentos de» con ello: 484 categorías que nombran a quien no escribió. La lista cerrada cuesta una medición por género y a cambio no atribuye nunca una obra al que la tradujo.

## Verification

**Commands:**
- `npx vitest run <las pruebas nuevas>` -- expected: la matriz en verde.
- `npx astro check` -- expected: 0 errores.
- `npm test` -- expected: sin regresión.
