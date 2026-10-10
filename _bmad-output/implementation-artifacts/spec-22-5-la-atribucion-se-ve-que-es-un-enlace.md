---
title: 'Historia 22.5 — La atribución dice de qué obra sale, y se ve que es un enlace'
type: 'feature'
created: '2026-10-10'
status: 'done'
baseline_revision: '9047670655e1dd2aad1ceda13223a78173e51bcc'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-22-4-la-obra-tiene-pagina.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** En la Atribución de la Página de Cita, el nombre del Autor solo se subraya al pasar el cursor, que en móvil no existe. El título de la Obra (enlazado desde la 22.4) va en siena con el estilo genérico, no en tinta subrayada. Y la zona de toque ampliada del nombre (13 px de relleno por abajo) invade la línea de la Procedencia, así que se solaparía con la del título (WCAG 2.5.8).

**Approach:** Un solo criterio para los enlaces en tinta de la Atribución y de la Cabecera de Obra: color `--tinta` y subrayado **siempre**. El título lleva una zona efectiva de al menos 3 × `--unidad` (24 px). El relleno del nombre se reparte para que su zona de 44 px no baje hasta la línea de la Procedencia. Solo cambian la Atribución y la Cabecera de Obra.

## Boundaries & Constraints

**Always:**
- **Atribución** (`src/components/Atribucion.astro`):
  - el nombre del Autor va en `--tinta` y siempre subrayado, con el mismo grosor de subrayado que la Cabecera de Obra (`--grosor-filete`), y conserva su zona de 44 px (UX-DR22);
  - el título de la Obra va en `--tinta`, más oscuro que el resto de la línea (`--tinta-apagada`), y siempre subrayado, con el mismo grosor;
  - detrás del título, sin enlace, va el resto de la línea (año de la Procedencia, traducción, referencia), como ya compone `lineaDeProcedencia`;
  - lo que la Procedencia declare sin nombrar obra va sin enlace.
- **Zonas de toque a 360 px:**
  - la zona efectiva del título mide al menos 24 px de alto (relleno vertical con margen negativo, sin mover el ritmo de la línea);
  - la zona del nombre del Autor no se solapa con la del título ni con la caja de la línea de la Procedencia;
  - si hace falta, se reparte el relleno del nombre de forma asimétrica (más arriba que abajo) o se ajusta el espacio entre las dos líneas **solo** con tokens existentes.
- **Cabecera de Obra:** «de {Autor}» sigue en `--tinta`, subrayado con `--grosor-filete` y con zona de 44 px. Se verifica que sea idéntico al criterio de la Atribución: un solo bloque de reglas o una clase compartida, sin dos copias que puedan divergir.
- **Tokens:** ningún valor literal de color. El grosor y el desplazamiento del subrayado salen de tokens o propiedades existentes. Un `padding` numérico en px está permitido, como ya hace el código, con su cálculo explicado en un comentario.
- **Alcance:** solo cambian la Atribución y la Cabecera de Obra. El resto de enlaces en línea del sitio es de la 22.10.

**Block If:** nada.

**Never:**
- Tocar otros enlaces.
- Cambiar el texto de la Atribución.
- Usar colores literales.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cita con Obra | Página de Cita | título `<a>` con `color` = `--tinta` y `text-decoration-line: underline` sin `:hover`; año sin enlace | — |
| Nombre del Autor | ídem | subrayado sin `:hover`, `color` = `--tinta` | — |
| Zonas a 360 px | ídem, Playwright | alto de la zona del título ≥ 24 px; el rectángulo del nombre no corta al del título ni a la línea de la Procedencia | — |
| Sin obra | Cita sin `procedencia.obra` | «Sin obra documentada» sin enlace | — |
| Cabecera de Obra | `/obra/…/` | «de {Autor}» con el mismo subrayado, la misma tinta y 44 px | — |
| Resto del sitio | cualquier otra página | el CSS de los demás componentes no cambia | — |

</intent-contract>

## Code Map

- `src/components/Atribucion.astro` -- el estilo de `.autor a` (zona de 13 px, subrayado solo en `:hover`) y de `.procedencia`. El título lo pinta `lineaDeProcedencia`; su `<a>` no tiene clase ni estilo propio.
- `src/pages/obra/[autor]/[slug]/[...page].astro:172-192` -- `.de` y `.de a`, con 10 px de relleno y `--grosor-filete`.
- `src/styles/tokens.css` -- `--tinta`, `--tinta-apagada`, `--unidad` (l.56), `--zona-de-toque` (l.82) y `--grosor-filete`. Las reglas globales de `a`, si existen, en el mismo fichero o en otra hoja global.
- `tests/e2e/` -- el patrón de las pruebas a 360 px (`accesibilidad.spec.ts`, `pagina-de-cita.spec.ts`), que ya miden zonas de toque o desplazamiento.
- `tests/unit/obra-pagina.test.ts` y `traduccion-construida.test.ts` -- las aserciones sobre el marcado de la Atribución.

## Tasks & Acceptance

**Execution:**
- `src/components/Atribucion.astro` -- los estilos y, si hace falta, una clase en el `<a>` del título.
- La Cabecera de Obra -- el criterio compartido.
- `tests/e2e/pagina-de-cita.spec.ts` (o uno nuevo) -- a 360 px: estilos calculados del nombre y del título, alto de la zona del título y ausencia de solape. Ídem para «de {Autor}» en una Obra.
- Una prueba unitaria o de build que fija la clase o el marcado del título.

**Acceptance Criteria:**
- Given `npx playwright test <spec tocado> --project=escritorio --project=movil` (o la forma en que el repo selecciona 360 px), when corre, then pasa.
- Given `npx astro check`, `npm run build` y las pruebas unitarias tocadas, when corren, then pasan.

## Spec Change Log

## Review Triage Log

### 2026-10-10 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5 (high 0, medium 1, low 4)
- defer: 0
- reject: 2
- addressed_findings:
  - `[medium]` `[patch]` Todo lo que fija la historia solo lo comprobaban las e2e, que el CI no corre → guardia unitaria sobre la hoja emitida.
  - `[low]` `[patch]` Rellenos con tokens; comentario 24/26; todos los fragmentos del título contra el nombre, la línea y la Fuente; título partido; `/` y `/404`; error claro sin título; foco visible del título con relleno simétrico, `outline-offset` y `box-decoration-break`; `CARTAS` escapado.

## Verification

**Commands:**
- `npx playwright test tests/e2e/pagina-de-cita.spec.ts` (y el spec de la Obra, si se toca) -- expected: verde
- `npx astro check` -- expected: 0 errores
- `npm run build` -- expected: código 0

## Auto Run Result

Status: done

**Resumen:** `.enlace-en-tinta`, una sola regla en `tokens.css` (tinta, subrayado siempre visible y `--grosor-filete`), la llevan el nombre y el título de la Atribución y «de {Autor}» de la Cabecera de Obra. A 360 px: el nombre mide 44 px, el título 26 px y los separan 2 px, sin solape con la Procedencia ni con la Fuente; el foco visible del título no invade la línea siguiente.

**Revisión:** 5 parches aplicados y 2 rechazados (8 px de separación, porque el AC pide no solapar; volver a un `:hover`). Seguimiento: false.

**Verificación:** suite 118 ficheros y 3754 pruebas; e2e de Página de Cita y accesibilidad en los dos proyectos, 116 en verde; astro check, 0 errores; build en verde.
