---
title: 'Historia 19.6 — La cola de revisión se ordena por probabilidad, no por alfabeto'
type: 'feature'
created: '2026-09-07'
status: 'in-review'
baseline_commit: 'e658301c147aa535aff3cf7bc55b32ca8d79d9a6'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/LOOP-PROTOCOL-V5.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** el bucle no rinde porque **no tiene un problema de extracción: tiene uno de revisión**. `corpus/_revision/` guarda 21.021 candidatas y `loteEnRevision` las devuelve **ordenadas por slug**, es decir, por la primera palabra de la frase — que respecto a si la Cita vale es azar. Las sesiones que funcionaron revisaron 176 y 52 candidatas; hoy un solo Autor genera mil. Con el montón plano, agotar una época es leerlo todo, y por eso la siembra sale a cero.

**Approach:** la cola **se ordena**, no se recorta. Las señales que se midieron y se rechazaron como puerta —porque muerden Citas publicadas— sí sirven para ordenar, porque un orden no destruye nada: lo que baja sigue estando. Revisar de arriba abajo encuentra las buenas antes de cansarse.

## Boundaries & Constraints

**Always:**
- El orden **es orden**. Todas las candidatas siguen listadas y contadas; la cola dice cuántas quedan por debajo del corte que se pida.
- Cada señal entra con su cifra medida contra el Corpus publicado, y la cifra se escribe donde vive la señal. Sin medición no hay señal.
- El informe **informa**; el editor decide. Regla de la casa desde la v1.
- Las puertas de admisión siguen mandando: una candidata bien colocada que no pase AD-1 no se publica igual.

**Ask First:**
- Convertir cualquiera de estas señales en puerta. Se midieron para ordenar, y como puerta muerden Citas publicadas.
- Añadir una señal que no se haya medido contra las publicadas.

**Never:**
- **Ocultar candidatas.** Un orden que esconde la cola es una puerta en secreto, y una puerta silenciosa que rechaza Citas buenas es exactamente lo que `deferred-work.md` lleva sesiones advirtiendo.
- Borrar en bloque por posición. Rechazar sigue siendo una decisión con motivo, una a una o por lote declarado.
- Ordenar por longitud. Se midió: publicadas y candidatas tienen la misma distribución, y no discrimina.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cola ordenada | 21.021 pendientes | Las de más señal a favor primero; el total sigue siendo 21.021 | N/A |
| Corte pedido | `--primeras 300` | Enseña 300 y **dice cuántas quedan debajo** | N/A |
| Empate de puntuación | Dos candidatas iguales | Desempata por slug: orden estable entre ejecuciones | N/A |
| Candidata inadmisible | No pasa AD-1 | Baja del todo, pero se lista con sus motivos como hoy | N/A |
| Sin candidatas | Cola vacía | Lo dice como hoy | N/A |
| Filtrar por Autor | `--autor marco-aurelio` | Ordena solo las suyas, con su propio recuento | Autor inexistente: lo dice |

</frozen-after-approval>

## Code Map

- `tools/lib/revision.ts:52` -- `[...pendientes].sort((a, b) => a.slug.localeCompare(...))`. **Aquí está el montón plano.** Es la línea que cambia.
- `tools/lib/revision.ts:340` -- `formatearLote`. Enseña la cola; aquí entra el corte y el «quedan N debajo».
- `tools/revisar.ts:26` -- `slugsTras`, el análisis de argumentos. `--primeras` y `--autor` entran por ahí.
- `tools/lib/extraccion.ts:365-390` -- el método de la casa, escrito: «cada señal se midió contra las 1632 Citas publicadas… y sólo entra la que no muerde ninguna». Ese listón es **el de una puerta**; el de un orden es otro, y la historia lo dice en Design Notes.
- `src/lib/umbrales.ts` -- AD-9: los pesos del orden son regla de negocio y viven aquí, no en el ordenador.

**Medido el 2026-09-07 sobre 1.642 publicadas y 21.021 candidatas** (proporción de cada conjunto que lleva la señal):

| Señal | Publicadas | Candidatas |
|---|---|---|
| lleva cifra | **0,0 %** | 3,3 % |
| abre en conjunción o deíctico | 1,8 % | 8,7 % |
| lleva paréntesis o corchete | 0,6 % | 1,8 % |
| vocal acentuada suelta (`á`, `ó`, `é`) | 5,4 % | 16,0 % |
| nombre propio en interior de frase | 10,5 % | 23,9 % |
| comillas de cualquier clase | 0,6 % | 5,3 % |
| inicial de nombre abreviada (`S.`, `M.`) | **0,0 %** | 0,9 % |
| **longitud** (mediana) | **108** | **122** |

Las siete separan. La longitud **no**, y por eso está prohibida arriba. Tampoco entra **abrir
en minúscula**, que se midió al implementar y apunta al revés de lo que yo suponía: 2,1 % de
las publicadas contra 0,5 % de las candidatas.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/` -- la puntuación de una candidata, pura, con las señales medidas y sus pesos en `umbrales.ts`.
- [x] `tools/lib/revision.ts` -- la cola se ordena por puntuación, con desempate por slug.
- [x] `tools/revisar.ts` y `formatearLote` -- `--primeras N` y `--autor`, y el «quedan N por debajo».
- [x] Cada señal, comentada con la cifra que la justifica, como manda la casa.
- [x] Pruebas de la matriz, incluidas el empate y el corte que no oculta el total.

**Acceptance Criteria:**
- Given 21.021 pendientes, when se pide la cola, then el total sigue siendo 21.021 y el orden no es alfabético.
- Given `--primeras 300`, when se lista, then se enseñan 300 y se dice cuántas quedan debajo.
- Given dos candidatas con la misma puntuación, when se lista dos veces, then salen en el mismo orden.

## Design Notes

**Por qué un orden puede usar señales que una puerta no.** Una puerta destruye: lo que muerde no vuelve, y por eso el listón de la casa es cero falsos positivos. Un orden solo coloca. La vocal suelta muerde 89 Citas publicadas —es ortografía de la época, no basura— y como puerta sería un desastre; como señal de orden esas 89 bajan unos puestos y se siguen leyendo. El listón, aquí, no es «no morder ninguna»: es **separar**, y las cinco señales separan por un factor de tres a cinco.

**Por qué esto y no mejores Fuentes.** También hay que elegir mejor edición —la de Antonio Sancha entrevera comentario del traductor con el texto—, pero eso arregla al Autor siguiente y deja las 21.021 donde están. El orden las arregla todas, incluidas las que se extrajeron hace treinta sesiones.

## Verification

**Commands:**
- `npx vitest run <las pruebas nuevas>` -- expected: la matriz en verde.
- `npx tsx tools/revisar.ts --autor marco-aurelio --primeras 30` -- expected: máximas arriba, aparato abajo.
- `npx astro check` -- expected: 0 errores.
- `npm test` -- expected: sin regresión.
