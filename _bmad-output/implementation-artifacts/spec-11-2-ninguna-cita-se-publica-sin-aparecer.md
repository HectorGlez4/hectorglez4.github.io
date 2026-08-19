---
title: 'Story 11.2 — Ninguna Cita se publica sin aparecer en su documento'
type: 'feature'
created: '2026-08-19'
status: 'in-review'
baseline_revision: '8784d379de5deddf9efa4e9aec190b7ce5da1ce5'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-11-1-la-fuente-se-recupera.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** La 11.1 hace que el metadato salga del documento, pero nada comprueba que el **texto** de la Cita esté de verdad en él. Una Cita puede publicarse citando una obra en la que esa frase no aparece, y el sitio la presenta como procedencia comprobada. Esa comprobación es la promesa entera del producto.

**Approach:** El build coteja el texto de cada Cita contra el cuerpo del documento de su Fuente y **rompe** si no aparece literalmente. Las 38 Citas anteriores a la v3, que no tienen documento, entran en una lista versionada y visible de pendientes de verificar que solo puede menguar; ninguna Cita nueva puede entrar en ella.

## Boundaries & Constraints

**Always:**
- El cotejo corre **en el build** y rompe la construcción. No se degrada a aviso.
- Vive **fuera de `src/lib/`**, que por AD-5 es puro y no lee disco.
- **Ningún camino de publicación lo esquiva**: una Cita escrita a mano directamente en `corpus/citas/` pasa por él igual que una sembrada.
- La comparación **colapsa espacios y nada más**. No pasa por `normalizar.ts`: un acento o un signo de puntuación que difieran hacen fallar.
- El fallo nombra la **ruta del fichero** y la **regla incumplida**.
- La lista de pendientes es versionada, legible, y el build informa de cuántas quedan.

**Block If:**
- Cumplir un criterio exigiera que `src/lib/` leyera disco, o que el build hiciera red.

**Never:**
- No añadir Citas a la lista de pendientes: es un censo cerrado de lo anterior a la v3, no un vertedero. Una Cita nueva sin documento **rompe el build**.
- No usar `normalizar.ts` ni ninguna comparación laxa en el cotejo.
- No tocar el texto de ninguna Cita para que cuadre. NFR-12 lo prohíbe.
- No recuperar documentos durante el build (AD-22).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cita con documento, texto presente | Cita referencia su Fuente; su texto está en el cuerpo | El build pasa | Sin error |
| Cita con documento, texto ausente | El texto no aparece en el cuerpo | El build **falla** nombrando ruta y regla | Construcción abortada |
| Diferencia de un acento o un signo | «el» vs «él», o coma de más | El build **falla**: solo se colapsan espacios | Construcción abortada |
| Solo difieren espacios o saltos | Mismo texto con espaciado distinto | El build pasa | Sin error |
| Cita nueva sin documento | Cita en `corpus/citas/` sin referencia y fuera de la lista | El build **falla** pidiendo recuperar su Fuente | Construcción abortada |
| Cita anterior a la v3 | Slug presente en la lista de pendientes | El build pasa y cuenta la deuda | Sin error |
| Entrada rancia en la lista | Slug que ya no existe en `corpus/citas/` | El build **falla**: la lista solo mengua | Construcción abortada |
| Documento referenciado ausente | La Cita nombra un documento que no está en `corpus/fuentes/` | El build **falla** nombrando el documento que falta | Construcción abortada |
| Cita escrita a mano | Fichero creado a mano en `corpus/citas/` | Pasa por el cotejo igual que una sembrada | Igual que arriba |

</intent-contract>

## Code Map

- `src/content.config.ts` -- cablea las reglas a las colecciones; aquí es donde un fichero que las incumpla rompe el build (AD-1). El esquema de `citas` **no declara hoy** ningún campo de Fuente, aunque `tools/extraer.ts` lo escribe en las candidatas. Hay que declararlo.
- `src/lib/admision.ts` -- las reglas de admisión, puras, **sin lecturas de disco** (AD-5). Aquí van las formas del campo nuevo, no el cotejo.
- `astro.config.mjs` -- ya importa de `src/lib/dominio.ts` y declara `integrations: [sitemap(...)]`. Es el punto donde enganchar una integración que sí lee disco.
- `tools/lib/documento.ts` -- de la 11.1: `analizarDocumento(contenido)` devuelve `{ cabecera, declaracion, cuerpo }`, y `nombreDeDocumento(idFuente, obra)` da el nombre del fichero. **El cotejo va contra el `cuerpo`**, nunca contra la cabecera ni la declaración.
- `tools/lib/corpus.ts` -- `rutasDelCorpus()` incluye ya `fuentes`.
- `tools/extraer.ts` -- escribe `fuente: { id, nombre, licencia, url }` en cada candidata; ese es el campo que el esquema debe reconocer al publicarse.
- `tools/lib/revision.ts`, `tools/revisar.ts` -- la ruta de aprobación de la 9.2. **No mencionan `fuente`**: hay que comprobar que el campo sobrevive al pasar de `_revision/` a `citas/`.
- `tools/auditoria.ts`, `src/lib/salud.ts` -- la auditoría de la 1.8 que mide SM-C1; la deuda de cotejo debería poder verse desde ahí.
- `tests/unit/puerta-de-admision.test.ts` -- el patrón de pruebas de «fallo de build»: invocan `astro build` sobre un corpus de prueba y exigen que rompa.
- `tests/unit/andamiaje.test.ts` -- estructura del repositorio y guardián de AD-22.

## Tasks & Acceptance

**Execution:**
- `src/lib/admision.ts` -- declarar la forma del campo de Fuente de una Cita (identificador de Fuente y dirección), puro y sin tocar disco -- las reglas tienen un solo dueño y las herramientas importan estas mismas.
- `src/content.config.ts` -- cablear ese campo al esquema de `citas` -- sin declararlo, el dato que escribe la extracción se pierde al publicar y el cotejo no tiene de dónde agarrarse.
- `corpus/pendientes-de-cotejo.yml` (nuevo) -- censo versionado de las Citas anteriores a la v3 que todavía no tienen documento, con el motivo escrito arriba. Se coloca junto a `corpus/portada.json`, que ya es metadato del Corpus y no colección.
- `tools/lib/cotejo.ts` (nuevo, puro, sin disco) -- la comparación: colapsar espacios en ambos lados y comprobar aparición literal; y la decisión de qué documento le toca a cada Cita. Puro para poder probarlo entero sin construir.
- `integraciones/cotejo.ts` (nuevo) -- integración de Astro que en `astro:build:start` lee `corpus/citas/`, `corpus/fuentes/` y el censo, aplica `tools/lib/cotejo.ts` y aborta la construcción con el detalle. Vive fuera de `src/lib/` porque lee disco.
- `astro.config.mjs` -- añadir la integración a `integrations` -- es el único sitio por el que pasan todas las construcciones, así que ningún camino de publicación la esquiva.
- `tools/auditoria.ts` -- informar de cuántas Citas quedan pendientes de cotejo, junto a SM-C1 -- la deuda se cuenta donde ya se cuenta la salud del Corpus.
- `tests/unit/cotejo.test.ts` (nuevo) -- lo puro: colapso de espacios, diferencia por acento, por signo, texto presente y ausente, y elección del documento.
- `tests/unit/cotejo-build.test.ts` (nuevo) -- las pruebas de **fallo de build** con el patrón de `puerta-de-admision.test.ts`, cubriendo la matriz: texto ausente, acento distinto, Cita nueva sin documento, entrada rancia en el censo, documento ausente, y una Cita escrita a mano.
- `tests/unit/andamiaje.test.ts` -- el censo se fija por **identidad, no por recuento**: una constante con los 38 slugs de partida, y toda entrada del censo tiene que pertenecer a ese conjunto. Un tope por cardinalidad no cierra nada — en cuanto la 11.4 libere una entrada queda un hueco donde meter una Cita nueva sin que falle nada.

**Acceptance Criteria:**
- Given una Cita que referencia su documento, when se construye el sitio, then el cotejo comprueba que su texto aparezca literalmente en el cuerpo de ese documento.
- Given una Cita cuyo texto no se localiza en su documento, when se construye, then el build falla nombrando la ruta del fichero y la regla incumplida, y no se degrada a aviso.
- Given una Cita que difiere de su edición en un acento o en un signo, when corre el cotejo, then falla: la comparación colapsa espacios y nada más, y no pasa por `normalizar.ts`.
- Given una Cita escrita a mano en `corpus/citas/` sin pasar por el sembrado, when se construye, then pasa por el cotejo igual que una sembrada.
- Given una Cita nueva sin documento y fuera del censo, when se construye, then el build falla y le dice que recupere su Fuente.
- Given un slug del censo que ya no existe entre las Citas, when se construye, then el build falla: el censo solo mengua.
- Given el repositorio, when se busca dónde vive el cotejo, then no está en `src/lib/`, y `src/lib/` sigue sin leer disco.

## Spec Change Log

## Review Triage Log

## Design Notes

**Por qué un censo y no un cotejo opcional.** El título de la historia dice que ninguna Cita se publica sin aparecer en su documento, pero las 38 Citas anteriores a la v3 no tienen documento y quien se lo da es la 11.4, que es trabajo de Héctor y no del bucle. Hacer el cotejo opcional cuando falta la referencia dejaría el agujero que la historia existe para cerrar: bastaría no poner referencia. El censo invierte eso — la referencia es obligatoria, y la excepción es una lista **cerrada, contada y a la vista**, con un tope que solo se puede bajar. Decidido con Héctor el 19/08.

**El cotejo va contra el cuerpo.** El documento de la 11.1 tiene tres zonas separadas por `---`: cabecera, declaración y cuerpo. `analizarDocumento` las separa. Cotejar contra el fichero entero dejaría pasar una Cita cuyo texto coincidiera con una línea de la ficha.

**Colapsar espacios y nada más.** Una edición digital reparte los saltos de línea donde le conviene, así que el espaciado no puede decidir. Todo lo demás sí: un acento cambiado es otra palabra, y una coma de más es otra puntuación. `normalizar.ts` está para los slugs y ahí quitaría justo lo que aquí tiene que decidir.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run` -- expected: todo en verde; ninguna de las 703 de la línea base perdida.
- `npm run build` -- expected: construye, con las 38 pendientes contadas y sin romper.
- `grep -rn "cotejo" src/lib/` -- expected: ninguna aparición; el cotejo no vive ahí.
