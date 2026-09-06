---
title: 'Historia 19.5 — La época se declara desde la Fuente, y el hueco sale de ella'
type: 'feature'
created: '2026-09-06'
status: 'in-review'
baseline_commit: '4ca6e199404275b631ed8c235595bd54ba077c6d'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/LOOP-PROTOCOL-V5.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** el bucle no tiene de dónde derivar trabajo —`npm run huecos` cierra con «Meta de Corpus alcanzada»— y el listón que falta no es un número: es cobertura por época, de forma extensiva y hasta agotarla. Una lista de autores escrita a mano se queda vieja en cuanto la Fuente crece, y además nadie la mantiene.

**Approach:** la época **se deriva de las categorías de la Fuente**, no se escribe. Wikisource-es clasifica a sus autores por «Autores de la Antigua Grecia», «de la Antigua Roma», «de la Antigüedad» y «católicos», y marca con `DP-Autores-100` a los muertos hace más de cien años. De ahí salen la lista, el criterio de admisión y la condición de término.

## Boundaries & Constraints

**Always:**
- La lista de candidatos **se recupera de la Fuente**; no vive escrita en el repositorio como catálogo a mantener.
- La red vive solo en la cáscara de `tools/` (AD-22). El build no descarga nada.
- Lo recuperado **se versiona**, como todo lo que el bucle consume: una lista que solo existe en memoria no deja rastro de qué se decidió con qué.
- El informe **informa**; el editor decide. Regla de la casa desde la v1.
- Una época está **terminada** cuando todos sus candidatos admisibles están sembrados o descartados con motivo. No es opinión: es una cuenta.

**Ask First:**
- Tratar `DP-Autores-100` como suficiente para admitir sin mirar. Es la clasificación de la Fuente y es buena señal, pero admitir sigue siendo del editor.
- Añadir categorías que no sean de la Fuente, o inventar épocas que la Fuente no declare.

**Never:**
- Sembrar sin pasar por la puerta de admisión: dominio público, año de fallecimiento, Procedencia y cotejo siguen exactamente igual.
- Dar por terminada una época por cansancio. Un candidato que no da Citas **se descarta con su motivo escrito**, que es distinto de saltárselo.
- Escribir en el repositorio una lista de autores que haya que mantener a mano.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Recuperar una época | Categoría de la Fuente | Lista de candidatos versionada, con quién lleva `DP-Autores-100` | N/A |
| Cruce con lo sembrado | Candidatos y Corpus | Dice cuántos sembrados, cuántos faltan y cuántos descartados | N/A |
| Época terminada | Todos sembrados o descartados | Lo declara y pasa a la siguiente | N/A |
| Candidato sin obra en español | Solo figura en la categoría | Se descarta **con motivo**, no se ignora | Queda en el registro |
| La Fuente no responde | Red caída | No se actualiza la lista; se trabaja con la versionada | Lo dice, no falla el bucle |
| Autor sin `DP-Autores-100` | Fuera de la clasificación | Se marca para mirar a mano; no se admite solo | N/A |

</frozen-after-approval>

## Code Map

- `tools/lib/fuentes.ts` -- el conjunto cerrado de Fuentes, con su licencia. Wikisource-es ya está admitida.
- `tools/recuperar.ts:529` -- cómo se hace red hoy: `fetch` a pelo desde la cáscara. Mismo patrón.
- `tools/lib/corpus.ts:857` -- `registrarSesionDeSembrado`: el escritor versionado, con `wx` y lectura previa. La lista de candidatos sigue ese patrón.
- `src/lib/huecos.ts` -- de aquí sale el hueco de la sesión; la cobertura por época entra junto a la de Tema.
- `tools/huecos.ts:137` -- el informe. La época se enseña como se enseñan los Temas bajo umbral.
- Medido el 2026-09-06 contra la API de Wikisource-es: **Antigüedad 83 autores, Antigua Roma 63, Antigua Grecia 35, católicos 8**. Las categorías existen y son enumerables por `list=categorymembers`. Platón, Séneca y Agustín llevan `DP-Autores-100`.
- Advertencia medida: la categoría trae matemáticos (Euclides, Diofanto), geógrafos (Estrabón) y mitógrafos (Apolodoro). Su prosa no da sentencia suelta — es el defecto que la bitácora ya catalogó con Palma y con Fígaro.

## Tasks & Acceptance

**Execution:**
- [x] `tools/` -- recuperar los miembros de una categoría de la Fuente y quién lleva la marca de dominio público. Red solo aquí.
- [x] `corpus/` -- la lista versionada, con su cabecera diciendo de dónde sale y que **se regenera, no se edita**.
- [x] `tools/lib/` -- el cruce puro: candidatos contra Corpus, con sembrados, pendientes y descartados.
- [x] `src/lib/huecos.ts` y `tools/huecos.ts` -- la cobertura por época en el hueco y en el informe.
- [x] El registro de descarte con motivo, para que «no da Citas» quede escrito y no se reintente en bucle.
- [x] Pruebas de la matriz, con la red simulada.

**Acceptance Criteria:**
- Given una época recuperada, when se cruza con el Corpus, then dice cuántos candidatos hay, cuántos sembrados y cuántos descartados con motivo.
- Given todos los candidatos de una época sembrados o descartados, when se consulta el hueco, then esa época se declara terminada.
- Given la Fuente sin responder, when se consulta, then se trabaja con la lista versionada y se dice que no se actualizó.

## Design Notes

**Por qué la lista se deriva y no se escribe.** Una lista de noventa autores escrita a mano se queda vieja en cuanto la Fuente crece, y nadie la mantiene: es la cuarta lista del proyecto, y la Historia 12.1 ya enseñó lo que pasa cuando una superficie se declara en más de un sitio. Derivarla de la categoría hace que crecer la Fuente crezca el plan.

**`DP-Autores-100` es señal, no permiso.** Es la clasificación de la propia Fuente para muertos hace más de cien años, y es exactamente la comprobación en la que se apoya la regla suave de FR-48. Pero admitir sigue siendo del editor: la marca entra en el informe, no en una puerta automática.

## Verification

**Commands:**
- `npx vitest run <las pruebas nuevas>` -- expected: la matriz en verde, sin red.
- `npm run huecos` -- expected: la cobertura por época, con sembrados y pendientes.
- `npx astro check` -- expected: 0 errores.
- `npm test` -- expected: sin regresión.
