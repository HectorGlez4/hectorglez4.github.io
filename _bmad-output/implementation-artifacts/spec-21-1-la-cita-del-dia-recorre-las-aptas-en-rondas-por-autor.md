---
title: 'Historia 21.1 — La Cita del Día recorre las aptas en rondas por Autor'
type: 'feature'
created: '2026-10-10'
status: 'done'
baseline_revision: '32e4597461f7bc97eff527ac3d1127463aca7d50'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** `citaDelDia` ordena las aptas por slug. Como el slug empieza por el del Autor, las Citas de un mismo Autor salen en días seguidos: con 16 aptas, Séneca sale tres días seguidos.

**Approach:** El orden pasa a ser un recorrido en rondas: se agrupa por Autor, se ordenan Autores y Citas por slug, y se toma la 1.ª de cada Autor, luego la 2.ª de cada uno, y así hasta agotarlas. El índice sigue siendo los días desde la época módulo el tamaño del conjunto.

## Boundaries & Constraints

**Always:**
- Es una permutación de las aptas: FR-9 y AD-12 se conservan y no hay estado.
- El orden es determinista, independiente del orden de lectura del disco: `localeCompare(…, 'es')` por slug de Autor y por slug de Cita.
- Una fijación manda; una fijación a una Cita no apta se ignora y rota.
- El RSS y el Kit no se tocan y lo heredan.
- La función de orden se exporta (`ordenEnRondas`) para que la prueben directamente.
- **Lectura de «la ronda en curso»** (readiness §5): dos jornadas consecutivas cuyas dos Citas caen **en la misma ronda** no comparten Autor si esa ronda tiene al menos dos Autores. En la frontera entre rondas puede repetirse Autor (con A(2), B(1): A-1, B-1, A-2, y la vuelta A-2 → A-1). La prueba lo escribe así.
- El commit dice que la Cita del día de despliegue cambia. Hoy `corpus/portada.json` no tiene fijaciones, y fijar jornadas no es de un agente.

**Block If:** nada.

**Never:**
- Cambiar qué Citas son aptas.
- Fijar jornadas.
- Tocar `corpus/portada.json`.
- Guardar estado.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rondas | A: a1, a2, a3; B: b1; C: c1, c2 | a1, b1, c1, a2, c2, a3 | — |
| Un Autor | solo A: a1, a2 | a1, a2 (como hoy) | — |
| Permutación | cualquier conjunto | cada apta exactamente una vez | — |
| Orden del disco | el mismo conjunto barajado | el mismo recorrido | — |
| Consecutivas | todo par de índices i, i+1 de la misma ronda con ≥2 Autores | Autores distintos | — |
| Fijación | jornada fijada a una apta | esa Cita | — |
| Fijación no apta | fijada a un slug no apto | rotación | — |
| Vacío | sin aptas | `null` | — |

</intent-contract>

## Code Map

- `src/lib/citaDelDia.ts:60-110` -- `diasDesdeLaEpoca`, `citaDelDia` (el orden por slug está en l.~92) y `aptasParaPortada`. El Autor de una Cita es `cita.autor`.
- `tests/unit/cita-del-dia.test.ts` -- las pruebas existentes de rotación y fijación, que pueden suponer el orden por slug: ajústalas al nuevo orden **sin** debilitar lo que comprueban.
- `tests/unit/sindicacion.test.ts` y `tests/unit/kit.test.ts` -- tienen que seguir en verde sin cambios de fondo.

## Tasks & Acceptance

**Execution:**
- `src/lib/citaDelDia.ts` -- `ordenEnRondas(aptas)` y su uso en `citaDelDia`, con el comentario de la cabecera actualizado (por qué en rondas, y que sigue siendo permutación).
- `tests/unit/cita-del-dia.test.ts` -- cada fila de la matriz.

**Acceptance Criteria:**
- Given `npx vitest run tests/unit/cita-del-dia.test.ts tests/unit/sindicacion.test.ts tests/unit/kit.test.ts`, when corre, then pasa.
- Given `npx astro check` y `npm run build`, when corren, then pasan.

## Spec Change Log

## Review Triage Log

### 2026-10-10 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 6 (high 0, medium 1, low 5)
- defer: 0
- reject: 6
- addressed_findings:
  - `[medium]` `[patch]` Faltaba probar el caso que motiva la historia → distribución como la real: racha máxima de 2 frente a 3 del orden por slug.
  - `[low]` `[patch]` Regla de repetición precisa en el docstring, sin la cifra que caduca; la frontera enseña la repetición; índice de partida explícito; `reduce`; ayuda con opciones.

## Verification

**Commands:**
- `npx vitest run tests/unit/cita-del-dia.test.ts tests/unit/sindicacion.test.ts tests/unit/kit.test.ts tests/unit/lote.test.ts` -- expected: verde
- `npx astro check` -- expected: 0 errores
- `npm run build` -- expected: código 0

## Auto Run Result

Status: done

**Resumen:** `ordenEnRondas` recorre las aptas en rondas por Autor (1.ª de cada uno, luego la 2.ª…), es una permutación determinista y `citaDelDia` la usa. La fijación manda y el RSS, el Kit y el lote la heredan. Ningún Autor ocupa más de dos jornadas seguidas, salvo la frontera documentada.

**Revisión:** 6 parches aplicados y 6 rechazados (espaciar por fracción del ciclo, que contradice el algoritmo del AC; slugs duplicados, que la colección no admite; dependencia de ICU de `localeCompare`, que es convención del repo; la reordenación al cambiar el conjunto y al desplegar, que se acepta y se dice en el commit; el homónimo, que es otro Autor; la exportación solo para pruebas). Seguimiento: false.

**Verificación:** 7 ficheros de prueba que tocan `citaDelDia`, 147 pruebas; astro check, 0 errores; build en verde.
