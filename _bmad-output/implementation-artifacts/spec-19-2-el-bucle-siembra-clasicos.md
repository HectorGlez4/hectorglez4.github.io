---
title: 'Historia 19.2 — El bucle siembra clásicos con meta propia'
type: 'feature'
created: '2026-09-05'
status: 'done'
baseline_commit: '20ab8498afd07126f6c680a5ef7d084d979a7e36'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/LOOP-PROTOCOL-V5.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `npm run huecos` cierra con «Meta de Corpus alcanzada. El listón siguiente lo pone Héctor»: el bucle se quedó sin hueco del que derivar trabajo. Y la primera medición de demanda enseñó que el Corpus está **invertido respecto a lo que se busca** —González Prada 154 Citas, García Lorca 1—. Además, el suelo panhispánico se mide hoy sobre el Corpus entero, así que cada clásico que entrase lo diluiría: con cuarenta nuevos caería del 51,4 % al 24 % **sin que un solo Autor hispánico cambiara de sitio**.

**Approach:** el informe de huecos aprende tres cosas — a medir el suelo sobre hispánicos, a contar los clásicos aparte con meta propia, y a priorizar por demanda. Con eso el bucle vuelve a tener de dónde derivar trabajo, y lo deriva hacia donde hay búsqueda.

## Boundaries & Constraints

**Always:**
- El suelo panhispánico se mide sobre **`latinoamericana` + `peninsular`**. Su valor **no cambia**: sigue siendo 40 %. Cambia el denominador, y §6.1 del PRD lo dice con lo que medía antes y lo que mide ahora.
- Los Autores de tradición `otra` se cuentan **aparte**, con meta propia.
- El techo de concentración por Autor rige sin excepción, y el informe dice **cuántas Citas más caben** de un Autor antes de rozarlo.
- Toda sesión se registra donde ya se registran, sin mecanismo nuevo.

**Ask First:**
- Cambiar el **valor** del suelo, o el del techo de concentración. Aquí solo cambia un denominador.
- Fijar la meta de clásicos en un número concreto: es el listón, y el listón lo pone Héctor.

**Never:**
- Abrir ninguna puerta de admisión. Dominio público, año de fallecimiento, Procedencia y cotejo siguen exactamente igual para un clásico que para cualquiera.
- Que el informe **decida**. Informa la decisión del editor, como `salud` y como `ingreso`: es la regla de la casa desde la v1.
- Tratar `otra` como sinónimo de traducido: Rizal y Pardo de Tavera son `otra` y escribieron en español.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Suelo panhispánico | 18 lat, 14 pen, 3 otra | **56,2 %** sobre hispánicos, por encima del suelo | N/A |
| Entran clásicos | +40 de tradición `otra` | El suelo **no se mueve**: sigue en 56,2 % | N/A |
| Meta de clásicos | Sin listón puesto | Dice cuántos hay y que el listón lo pone Héctor | N/A |
| Profundidad por Autor | Autor cerca del techo | Dice cuántas Citas más caben antes de rozarlo | N/A |
| Sin Autores hispánicos | Denominador cero | No divide por cero ni informa un porcentaje falso | Lo dice y no publica cifra |
| Autor sin tradición declarada | `tradicion` ausente | Se enseña aparte y **cuenta en el denominador del suelo**: un dato que falta no puede mejorar el indicador | N/A |

</frozen-after-approval>

## Code Map

- `src/lib/huecos.ts:179-197` -- `cuenta()` y el bloque `tradicion`. `porcentaje` se calcula sobre `total`; ahí está el cambio de denominador.
- `src/lib/huecos.ts:116,138` -- `EquilibrioDeTradicion`, con `otra` ya presente. La meta de clásicos entra junto a ella.
- `src/lib/umbrales.ts:52` -- `SUELO_TRADICION_LATINOAMERICANA = 40`. **No se toca su valor**; su comentario sí, porque explica qué mide.
- `src/lib/umbrales.ts:252-256` -- `TECHO_CONCENTRACION_POR_AUTOR` y su razonamiento. De ahí sale «cuántas Citas más caben».
- `tools/huecos.ts:137-145` -- las líneas del informe. Aquí se ve el cambio.
- `tools/lib/corpus.ts:801,837` -- `tradicion` en la salida del objetivo de sesión; el bucle lee de aquí.
- Medido el 2026-09-05: 35 Autores — 18 latinoamericanos, 14 peninsulares, 3 `otra`. Sobre todos, 51,4 %; sobre hispánicos, **56,2 %**.
- Sonda de la misma fecha: Aristóteles tiene ~41 obras en Wikisource-es traducidas por Azcárate († 1886); Platón ~12. Hay material para la meta.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/huecos.ts` -- el suelo se mide sobre hispánicos; `otra` sale del denominador y gana su recuento propio.
- [x] `src/lib/umbrales.ts` -- el comentario del suelo dice qué mide y por qué cambió. El valor no.
- [x] `src/lib/huecos.ts` -- cuántas Citas más caben de cada Autor antes del techo.
- [x] `tools/huecos.ts` -- el informe enseña las dos cuentas por separado y no las mezcla.
- [x] Pruebas de la matriz, incluido el denominador cero.

**Acceptance Criteria:**
- Given 18 latinoamericanos de 32 hispánicos, when se informa el suelo, then dice 56,2 % y no 51,4 %.
- Given cuarenta Autores nuevos de tradición `otra`, when se recalcula, then el suelo panhispánico no se mueve.
- Given un Autor con 181 Citas y un techo del 15 %, when se informa, then dice cuántas más caben antes de rozarlo.

## Design Notes

**Por qué el denominador y no el umbral.** El compromiso del brief es «no escorar hacia España» — una afirmación sobre el reparto **entre hispánicos**, nunca sobre cuántos griegos hay. Medirlo sobre el Corpus entero hacía que admitir a Séneca contase como escorarse hacia España, que es lo contrario de lo que la regla quiere decir. Bajar el umbral habría soltado el diferenciador que el brief llama la ventaja competitiva; cambiar el denominador lo deja intacto y además lo hace más fiel a lo que se prometió.

## Verification

**Commands:**
- `npx vitest run <las pruebas nuevas>` -- expected: la matriz en verde.
- `npm run huecos` -- expected: 56,2 % sobre hispánicos, clásicos contados aparte, y el margen del techo por Autor.
- `npx astro check` -- expected: 0 errores.
- `npm test` -- expected: sin regresión.
