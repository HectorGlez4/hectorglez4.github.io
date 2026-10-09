---
title: 'Historia 20.1 — La vista de una superficie de agregación deja fila'
type: 'feature'
created: '2026-10-09'
status: 'in-review'
baseline_revision: 'c029cb046d6eb7085fa7ad2b4fc4713dcbdc846f'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-20-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Las Piezas del Canal aterrizan en la portada y en las Páginas de Autor, Tema y Colección, pero solo la Página de Cita emite evento: SM-8 no cuenta lo que el canal trae a las superficies de agregación, y el proxy de profundidad `vista-de-cita / vista-de-superficie` no existe.

**Approach:** Se añade `vista-de-superficie` al vocabulario cerrado de `src/lib/medicion.ts` (AD-13). `Medicion.astro` y `Armazon.astro` cambian el booleano `vistaDeCita` por una sola prop `vista?: 'cita' | 'superficie'`, de modo que las dos vistas a la vez sean imposibles por tipo. La piden la portada y la página 1 de Autor, Tema y Colección. El receptor la acepta porque importa el vocabulario, y descarta `destino` y `datos` con la lógica que ya tiene.

## Boundaries & Constraints

**Always:** el evento sale del vocabulario (`EVENTOS.vistaDeSuperficie`) y nunca de una cadena suelta. Lo emite **solo una ruta cuyo `caracterDe` sea `producto`**: las páginas 2+ de un listado son `servicio` por `src/lib/superficies.ts`, como `/buscar` y `/404`, y no lo emiten. Sin `MEDICION_ENDPOINT` no se renderiza nada, y `dist/` no cambia. El guion en línea sigue por debajo de `MAX_BYTES_DE_GUION`. `DESPLIEGUE.md` §3 documenta las consultas nuevas y la baliza manual de comprobación.

**Block If:** el guion no cabe en `MAX_BYTES_DE_GUION` ni siquiera abreviándolo.

**Never:** subir `MAX_BYTES_DE_GUION`. Migrar `medicion/esquema.sql`. Emitir el evento en `/buscar`, `/404`, `/kit`, `/lote` o la Página de Cita. Añadir identificador, cookie, sesión o referente. Redesplegar el Worker desde el agente (eso es de Héctor y va como nota en el tablero).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Portada con endpoint | build con `MEDICION_ENDPOINT` | `/` lleva el instalador y una sola llamada `__medir("vista-de-superficie")` | — |
| Página 1 de Autor, Tema y Colección | ídem | una sola llamada `vista-de-superficie`, ninguna `vista-de-cita` | — |
| Página 2+ de un listado | ídem | instalador sin llamada de vista | — |
| Página de Cita | ídem | `vista-de-cita` y ningún `vista-de-superficie` | — |
| `/buscar`, `/404`, `/kit`, `/lote` | ídem | ninguna llamada de vista | — |
| Receptor: superficie con origen válido | `{evento:'vista-de-superficie',ruta:'/',origen:'facebook',destino:'whatsapp',datos:'x',extra:1}` | registro con jornada, ruta y origen; `destino` y `consulta` a null | los campos de más se ignoran |
| Sin endpoint | build sin variable | ningún guion de medición en ninguna página | — |

</intent-contract>

## Code Map

- `src/lib/medicion.ts` -- `EVENTOS` (l.~27): añadir `vistaDeSuperficie: 'vista-de-superficie'` con su comentario de SM-8 y FR-22. `guionDeMedicion` serializa `EVENTOS_VALIDOS`, así que el guion crece unos 22 bytes.
- `src/components/Medicion.astro` -- hoy recibe la prop `vistaDeCita?: boolean`. Pasa a `vista?: 'cita' | 'superficie'`, que se traduce a `EVENTOS.vistaDeCita` o `EVENTOS.vistaDeSuperficie`.
- `src/components/Armazon.astro` -- la prop `vistaDeCita` (l.33, l.56) y `<Medicion vistaDeCita>` (l.144). Pasa a `vista`.
- `src/pages/cita/[slug].astro:66` -- `vistaDeCita` pasa a `vista="cita"`.
- `src/pages/index.astro:56` -- añadir `vista="superficie"`.
- `src/pages/{autor,tema,coleccion}/[slug]/[...page].astro` -- `<Armazon>` con `vista={pagina.currentPage === 1 ? 'superficie' : undefined}`. Equivale a `caracterDe(ruta) === 'producto'`, y es más barato que la consulta a superficies, que lo confirmaría igual.
- `medicion/receptor.ts` -- `interpretar` ya descarta `datos` fuera de la búsqueda y `destino` fuera de la compartición, y los campos de más se ignoran por desestructuración. No cambia.
- `tests/unit/medicion.test.ts` -- la prueba de vocabulario (l.29) enumera los eventos; el presupuesto (l.173) construye con endpoint. Se le añade una construcción con endpoint que cubra portada, Autor, Tema, página 2 y Cita.
- `tests/unit/receptor.test.ts` -- se añade el caso del receptor.
- `tests/unit/ayuda/construir.js` -- `construirConCorpus(ficheros, {entorno})`, `paginaConstruida(proyecto, ruta)`, `AUTOR_VALIDO` y `citaValida`.
- `DESPLIEGUE.md` §3 (l.247–370) -- «Consultar el canal propio — SM-8» se amplía con las consultas por evento y la razón por jornada, y se añade la baliza manual.

## Tasks & Acceptance

**Execution:**
- `src/lib/medicion.ts` -- añadir el evento -- vocabulario cerrado (AD-13).
- `src/components/Medicion.astro`, `src/components/Armazon.astro` -- prop `vista` -- una sola vista por página, garantizada por tipo.
- `src/pages/index.astro`, `src/pages/cita/[slug].astro`, `src/pages/{autor,tema,coleccion}/[slug]/[...page].astro` -- pedir la vista -- solo la página 1 de cada listado.
- `tests/unit/medicion.test.ts` -- vocabulario actualizado y una construcción con endpoint que verifique la matriz. Se reutiliza la misma construcción para el presupuesto de la portada.
- `tests/unit/receptor.test.ts` -- la fila de receptor de la matriz.
- `DESPLIEGUE.md` §3 -- SM-8 por origen y evento; la razón `vista-de-cita / vista-de-superficie` **por jornada**, declarada como agregado por jornada y no como sesión; la baliza manual de comprobación con `ruta:'/__comprobacion/'` y **sin origen**, para que no cuente en SM-8, y su consulta en el recuento por evento; nota de que no hay migración y de que el Worker se redespliega el mismo día.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- 20.1 a `review`, con el comentario «falta redesplegar el Worker y la baliza en D1 (Héctor)».

**Acceptance Criteria:**
- Given la suite, when corren `npx vitest run tests/unit/medicion.test.ts tests/unit/receptor.test.ts`, then pasan e incluyen la matriz.
- Given el build con endpoint, when se mide el guion en línea de la portada y de la Página de Cita, then queda por debajo de `MAX_BYTES_DE_GUION`.
- Given `npx astro check` y `npm run build`, when corren, then terminan sin errores.

## Spec Change Log

## Review Triage Log

## Design Notes

Páginas 2+: la readiness lo dejó abierto (arq-5, pm-3). Se resuelve con el criterio que ya existe: `superficies.ts` declara las 2+ como `servicio`, y el AC excluye del evento las superficies de servicio (`/buscar`, `/404`). Las Piezas enlazan a la página 1. La prop única `vista` cierra además la otra pregunta: con ella no pueden llegar `vistaDeCita` y `vistaDeSuperficie` a la vez.

## Verification

**Commands:**
- `npx vitest run tests/unit/medicion.test.ts tests/unit/receptor.test.ts tests/unit/comparticion.test.ts` -- expected: verde
- `npx astro check` -- expected: 0 errores
- `npm run build` -- expected: código 0
