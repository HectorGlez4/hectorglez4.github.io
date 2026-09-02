---
title: 'La invitación pasa el barrido de accesibilidad, y hoy no lo pisa nunca'
type: 'feature'
created: '2026-09-02'
status: 'done'
baseline_commit: '871e6264a2bec1a07b825e59538ae901f5b85bff'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-14-2-el-visitante-encuentra-como-sostener.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `tests/e2e/accesibilidad.spec.ts` barre el sitio del repositorio, donde las donaciones están apagadas y la invitación no existe. La zona de toque, el contraste, el anillo de foco y el aviso de pestaña nueva de `Sostener.astro` se comprueban **solo en el estado en que no hay nada que comprobar**. Los cuatro LC quedaron verificados el 2026-09-02, así que encender es inminente.

**Approach:** Construir un sitio con el Modelo encendido por el gancho `ficheros`, servirlo con `tests/servidor.mjs` apuntado por `DIST` en puerto propio, y pasarle axe a las tres superficies de la 14.2 —portada, `/buscar/` y `/404`—.

## Boundaries & Constraints

**Always:**
- El Modelo se enciende **parcheando la copia**, nunca el árbol real ni por entorno (AD-21).
- Servidor con `DIST` y puerto propio: ni 4321 (Playwright) ni 4400 (medición).
- Falla si la invitación **no aparece**: un barrido en verde sobre páginas vacías es el modo de fallo que este spec existe para evitar.

**Ask First:**
- Bajar un umbral de axe o excluir una regla para que pase.
- Tocar `Sostener.astro`. Este spec **mide**; un defecto real se reporta y se decide aparte.

**Never:**
- Encender el Modelo en `src/lib/ingreso.ts`: `encendido` se queda en `false`.
- Ensuciar el árbol del repositorio, ni escribir fuera del proyecto temporal.
- Repetir lo que `ingreso-construido.test.ts` ya afirma sobre dónde sale y a dónde lleva.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Barrido | `dist/` parcheado servido por `DIST` | Las tres superficies pasan axe | Falla nombrando regla, superficie y selector |
| Zona de toque | El enlace de la invitación | Altura rendida ≥ 44px | Falla con la altura medida |
| Anillo de foco | El enlace recibe foco por teclado | Indicador visible, no suprimido | Falla si `outline` es `none` sin sustituto |
| Pestaña nueva | El enlace lleva `target="_blank"` | Su nombre accesible incluye el aviso | Falla si el nombre accesible no lo trae |
| Parche estéril | La sustitución no encendió nada | Falla antes de barrer | Dice que no hay invitación que barrer |

</frozen-after-approval>

## Code Map

- `tests/servidor.mjs:28-29` -- `RAIZ = process.env.DIST ?? …` y `PUERTO`. **Ya admite** otro `dist/`; no se toca. Es lo que hace factible todo esto.
- `tests/unit/ingreso-construido.test.ts:489-497` -- el parche que enciende `donaciones`, anclado a `id: 'donaciones',` y con la afirmación de que hubo exactamente un cambio. Se reutiliza.
- `tests/unit/ayuda/construir.ts:108-131` -- el gancho `ficheros`: ya valida que la ruta no sale del proyecto y que el parche cambia algo.
- `src/components/Sostener.astro:174-175` -- el enlace: `target="_blank"`, `rel="noopener noreferrer"`, y el `<span>` oculto con «(se abre en una pestaña nueva)» **dentro** del enlace, para que entre en el nombre accesible.
- `src/components/Sostener.astro:102-108` -- `DEL_ENLACE`: `min-height: var(--zona-de-toque)`. Sin `<style>` a propósito (UX-DR35); todo va inline.
- `tests/e2e/accesibilidad.spec.ts:1-6,46` -- precedente de `AxeBuilder`. **No se modifica.**
- Reglas con cifra: zona de toque 44px (`EXPERIENCE.md:112`, `DESIGN.md:107`); foco 2px+2px (`EXPERIENCE.md:120`); `--tinta-apagada` 7,4:1 (`DESIGN.md:126`).
- Restricción dura, solo lectura: `vitest.config.ts:6` es `environment: 'node'` y `package.json:39` solo trae `@axe-core/playwright`. **Esto no puede ser prueba unitaria.**

## Tasks & Acceptance

**Execution:**
- [x] `tests/e2e/ingreso-accesible.spec.ts` -- fichero nuevo: construir con `ficheros`, arrancar `servidor.mjs` con `DIST` y puerto propio en `beforeAll`, barrer las tres superficies, cerrar en `afterAll` -- único sitio con invitación y navegador a la vez.
- [x] `tests/e2e/ingreso-accesible.spec.ts` -- guarda previa: las tres páginas traen `data-ingreso="donaciones"` -- sin ella el barrido pasa en verde sobre nada.
- [x] `tests/e2e/ingreso-accesible.spec.ts` -- las cuatro comprobaciones con cifra: altura ≥ 44px, foco visible tras `Tab`, nombre accesible con el aviso, contraste por axe.
- [x] `DESPLIEGUE.md` §4 -- encender exige correr este barrido, no solo cambiar el `false`.

**Acceptance Criteria:**
- Given el repositorio con el Modelo apagado, when corro la prueba, then pasa sin que `src/lib/ingreso.ts` cambie una línea.
- Given el parche, when la sustitución no encuentra su sitio, then falla diciéndolo y no barre.
- Given la tirada terminada, when miro `git status`, then sale limpio.

## Design Notes

La espera de arranque debe sondear **una página que solo existe en este sitio**, no «¿contesta alguien en el puerto?»: un ocupante de un árbol borrado costó cinco días en la 7.3 (`faec4b6e`).

`construirConCorpus` cuesta un `astro build` entero: **una vez** en `beforeAll` para las tres superficies.

## Verification

**Commands:**
- `npx playwright test tests/e2e/ingreso-accesible.spec.ts` -- expected: verde, tres superficies barridas, ninguna omitida.
- `npx playwright test tests/e2e/accesibilidad.spec.ts` -- expected: sigue verde.
- `npx astro check` -- expected: 0 errores.
- `git status --short` -- expected: vacío.

## Suggested Review Order

**El parche acotado — el hallazgo grave de la revisión**

- El ayudante único: recorta al bloque de donaciones y falla con tres mensajes nombrados.
  [`construir.ts`](../../tests/unit/ayuda/construir.ts)

- Los dos sitios que corren en CI y habrían roto el día del encendido.
  [`ingreso-construido.test.ts`](../../tests/unit/ingreso-construido.test.ts)

**El barrido, que es el objetivo del spec**

- Monta el sitio parcheado, lo sirve en puerto propio y sondea una ruta imposible.
  [`ingreso-accesible.spec.ts`](../../tests/e2e/ingreso-accesible.spec.ts)

- La guarda previa: sin `data-ingreso` en las tres, no se barre nada.
  [`ingreso-accesible.spec.ts`](../../tests/e2e/ingreso-accesible.spec.ts)

- Las guardas que la revisión añadió: 44px en ambos ejes, 8px de separación, y nada fijo que tape.
  [`ingreso-accesible.spec.ts`](../../tests/e2e/ingreso-accesible.spec.ts)

**Lo que se lee el día de encender**

- §4: los dos requisitos, los puertos, el protocolo de fallo, y que la cuenta no existe.
  [`DESPLIEGUE.md`](../../DESPLIEGUE.md)

- El documento que leen los agentes: de «un requisito» a dos.
  [`AGENTS.md`](../../AGENTS.md)
