---
title: '17.4 — La ficha abre la página, y solo la primera'
type: 'feature'
created: '2026-10-10'
status: 'done'
baseline_revision: '5483ef72b0bdf7742ddaf0e4f5395c1c82b06088'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-17-context.md'
  - '{project-root}/AGENTS.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** La Ficha de Autor (nombre, años, semblanza, atribución y, desde la 17.3, la Lista de Obras) abre la página 1, pero las páginas 2+ repiten años y semblanza: según `EXPERIENCE.md:130` la ficha vive **solo en la primera página** y las 2+ son otra superficie.

**Approach:** La ficha entera —años, semblanza, su atribución y la Lista de Obras— solo en la página 1, delante del catálogo; las 2+ conservan únicamente el `h1` con el nombre (como las 2+ de Colección y de Obra repiten su título) y el listado, con `noindex` por forma como ya llevan. Pruebas de orden, de 360 px y del tope de guion.

## Boundaries & Constraints

**Always:**
- Página 1: `h1` (nombre), años, semblanza (con su atribución si es ajena) y Lista de Obras, en ese orden y **antes** del rótulo «Citas documentadas» y del listado. Es la excepción declarada de la regla de agregación (Tema y Colección siguen sin preámbulo).
- Páginas 2+: `h1` con el nombre del Autor y el listado con su Paginación; ni años, ni semblanza, ni atribución, ni Lista de Obras. `noindex` (ya por forma, `superficies.ts`). Un solo `h1` en cada página.
- `src/lib/atribucion.ts` sigue siendo el dueño de qué superficie reproduce la semblanza: si `paginas-siguientes` deja de pintarla, quítala de `SUPERFICIES_DE_LA_SEMBLANZA`/`PORTAN_LA_ATRIBUCION` o deja de consultarla, y ajusta sus pruebas (`tests/unit/semblanza.test.ts`, `tests/unit/biografia-build.test.ts`) a la regla nueva: la semblanza, propia o ajena, solo en la página 1. Meta, JSON-LD y Tarjeta no cambian.
- A 360 × 640 (proyecto `movil`), el nombre y la semblanza de un Autor con semblanza son visibles sin desplazar; sin muro, modal ni aviso previo.
- La Página de Autor sigue bajo `MAX_BYTES_DE_GUION` y sin guion de tercero (lo mide `tests/unit/medicion.test.ts`).

**Block If:** Nada exige a Héctor.

**Never:** No tocar Tema ni Colección. No mover la semblanza a la meta o al JSON-LD. No admitir Modelos en la Página de Autor.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Página 1 | `/autor/seneca/` | h1, años, semblanza, Lista de Obras, luego «Citas documentadas» | — |
| Página 2 | `/autor/seneca/2/` | solo h1 y listado; `noindex` | — |
| Semblanza ajena | Autor con `biografia` | página 1 con atribución; página 2 sin semblanza ni atribución | — |
| 360 px | Autor con semblanza | h1 y semblanza dentro del primer viewport | — |

</intent-contract>

## Code Map

- `src/pages/autor/[slug]/[...page].astro` -- `semblanzaEn(autor, pagina.currentPage === 1 ? 'ficha-de-autor' : 'paginas-siguientes')` (l.~70), `<header class="ficha">` (h1, `p.años`, semblanza y `AtribucionDeSemblanza`), `<ListaDeObras>` ya condicionada a la página 1, rótulo «Citas documentadas», `<Paginacion>`.
- `src/lib/atribucion.ts:~100-130` -- `SUPERFICIES_DE_LA_SEMBLANZA` (incluye `'paginas-siguientes'`), `PORTAN_LA_ATRIBUCION`, `semblanzaEn`.
- Pruebas: `tests/unit/biografia-build.test.ts` (lee `/autor/seneca/` y `/autor/seneca/2/`), `tests/unit/semblanza.test.ts`, `tests/unit/lista-de-obras.test.ts`, `tests/unit/medicion.test.ts` (tope sobre `/autor/seneca/`), `tests/e2e/pagina-de-autor.spec.ts` (un solo h1, etc.).

## Tasks & Acceptance

**Execution:**
- La página de Autor -- la ficha solo en la 1; las 2+ con h1 y listado.
- `src/lib/atribucion.ts` -- la regla de la semblanza en las 2+ al día, con sus pruebas.
- `tests/unit/` -- orden en la 1 y ausencia de la ficha en la 2 (build).
- `tests/e2e/pagina-de-autor.spec.ts` -- 360 px: h1 y semblanza en el primer viewport; página 2 sin ficha.

**Acceptance Criteria:**
- Given `npx vitest run` de los ficheros tocados, `npx astro check` y `npm run build`, when corren, then pasan.
- Given `npx playwright test tests/e2e/pagina-de-autor.spec.ts`, when corre en escritorio y móvil, then pasa.

## Verification

**Commands:**
- `npx vitest run tests/unit/biografia-build.test.ts tests/unit/semblanza.test.ts tests/unit/lista-de-obras.test.ts tests/unit/medicion.test.ts` -- expected: verde.
- `npx astro check` -- expected: 0 errores.
- `npm run build` -- expected: termina.
- `npx playwright test tests/e2e/pagina-de-autor.spec.ts` -- expected: verde.

## Auto Run Result

**Resumen:** la ficha entera de la Página de Autor (años, semblanza, su atribución y la Lista de Obras) va solo en la página 1, delante del catálogo; las 2+ llevan el `h1` y el listado, con `noindex`. `paginas-siguientes` deja de ser superficie de la semblanza en `src/lib/atribucion.ts`.

**Ficheros:** `src/pages/autor/[slug]/[...page].astro`, `src/lib/atribucion.ts`, `tests/unit/semblanza.test.ts`, `tests/unit/biografia-build.test.ts`, `tests/unit/lista-de-obras.test.ts`, `tests/e2e/pagina-de-autor.spec.ts`, `tests/e2e/ayuda/corpus.ts`, `AGENTS.md`.

**Revisión:** 7 patches bajos, 0 deferidos, 14 rechazados (la semblanza propia en meta y JSON-LD de las 2+ la fija el contrato).

**Revisión de seguimiento:** `true` — parcheados bajo 7; puntuación 7 ≥ 5.

**Verificación:** 196/196 en los cuatro unitarios; `npx astro check` 0 errores; `npm run build` termina; `pagina-de-autor.spec.ts` 30 pasan y 2 omitidas (el caso con biografía: ningún Autor la declara hoy) en escritorio y móvil.

