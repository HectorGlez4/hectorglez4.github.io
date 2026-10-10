---
title: 'Historia 17.2 — La semblanza sitúa al Autor, publica su atribución, y sale de la Tarjeta'
type: 'feature'
created: '2026-10-10'
status: 'in-progress'
baseline_revision: '1defa706bb65bdd0775a0d2139f5b7588d1f1ce5'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-17-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-17-1-una-fuente-mutable-entra-por-revision.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Un Autor que declara su biografía (17.1) aún no publica su procedencia. La semblanza aparece hoy en seis sitios —cuerpo, `<meta description>`, JSON-LD `description`, Pagefind, páginas 2+ y PNG de la Tarjeta—, y varios de ellos no pueden llevar la atribución que exige un texto ajeno (CC BY-SA).

**Approach:**
- Si el Autor declara `biografia`, su `semblanza` tiene que aparecer **literal** en el cuerpo de ese documento. Lo coteja el build, como las Citas.
- Se publica **solo** en la página 1 de la Página de Autor, con su atribución visible debajo.
- El resto de superficies no la reproducen.
- La Tarjeta Social de Autor de **todos** los Autores se compone solo con hechos del Corpus: nombre, años y recuento de Citas documentadas.
- Un Autor sin biografía conserva su semblanza breve como hoy.

## Boundaries & Constraints

**Always:**
- **Cotejo de la semblanza:** en la puerta de 17.1 (`cotejarBiografias`), si el Autor declara `biografia`, su `semblanza` debe aparecer literal en el cuerpo del documento, con la misma normalización que el cotejo de Citas (`apareceEnDocumento` o su equivalente). Si no, el build rompe nombrando el fichero de Autor. «Una semblanza sin procedencia declarada no se publica» queda así: si el documento declarado no está, ya rompe (17.1). El sistema nunca compone una semblanza: no hay orden que la escriba.
- **Atribución visible:** en la página 1 de `/autor/{slug}/`, justo debajo de la semblanza, una línea «Semblanza de {nombre de la Fuente}, revisión {N} · {licencia}», con estas reglas:
  - el nombre de la Fuente y la revisión enlazan al `url` (enlace permanente) de la cabecera del documento;
  - la licencia sale de la cabecera del documento (17.1: por fecha de revisión);
  - va en la familia de la interfaz (Inter), con tokens de `DESIGN.md` (`caption`, `on-surface-variant`) y el subrayado del enlace siempre visible;
  - la semblanza va en Inter (`body-lg`), no en la serif: no es voz citada.
  
  Ningún valor literal de color o tipografía.
- **Superficies sin la semblanza ajena:** si el Autor declara `biografia`:
  - `<meta name="description">` y JSON-LD `description` se componen con hechos («{nombre} ({años}). {N} citas documentadas en Sabiduría de Bolsillo.» o la forma más cercana que ya use el sitio para otras superficies);
  - el bloque de la semblanza lleva `data-pagefind-ignore`;
  - las páginas 2+ no muestran la semblanza ajena.
  
  Un Autor sin biografía conserva exactamente lo que tiene hoy en esas superficies.
- **Tarjeta Social de Autor** (`src/pages/tarjeta/autor/…` y `src/lib/tarjeta.ts`), para **todos** los Autores: nombre, años y recuento de Citas documentadas (Citas publicadas con `fuente`), sin semblanza y sin bajada escrita por el sistema. «Documentadas» se define en un único sitio y se reutiliza, sin contar dos veces.
- Los datos que la página necesita de la biografía (título, revisión, url y licencia) se leen en el build. `src/` no importa de `tools/`: si hace falta, un lector puro de la cabecera vive en `src/lib/` y `tools/` lo reutiliza, o se usa la lectura que ya exista.
- Accesibilidad: el enlace de la atribución tiene nombre accesible y el contraste del token.

**Block If:** nada.

**Never:**
- Escribir o descargar ninguna semblanza ni biografía real.
- Declarar `biografia` en ningún Autor real.
- Componer prosa sobre una persona.
- Tocar la lista de obras (17.3) o el orden de la ficha (17.4).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Semblanza literal | Autor con `biografia` y una semblanza que está en el cuerpo del documento | página 1: semblanza + «Semblanza de Wikipedia en español, revisión 123 · CC BY-SA 4.0» con enlace al permanente | — |
| Semblanza no literal | la semblanza no aparece en el documento | el build rompe nombrando el fichero de Autor | código ≠ 0 |
| Meta y JSON-LD | Autor con biografía | `description` con hechos, sin la semblanza | — |
| Pagefind | ídem | la semblanza dentro de `data-pagefind-ignore` | — |
| Página 2 | ídem, con más de una página | sin la semblanza ajena | — |
| Autor sin biografía | como hoy | cuerpo, meta y JSON-LD idénticos a hoy | — |
| Tarjeta | cualquier Autor | PNG con nombre, años y «N citas documentadas», sin la semblanza | — |
| Licencia 3.0 | documento con `licencia: CC BY-SA 3.0` | la atribución dice 3.0 | — |

</intent-contract>

## Code Map

- `tools/lib/cotejo.ts` -- `cotejarBiografias` (17.1) y `apareceEnDocumento` (l.~60). `integraciones/cotejo.ts` -- la puerta.
- `tools/lib/documento.ts` -- `CabeceraDeBiografia` y `analizarDocumento` (17.1). `tools/lib/corpus.ts` -- `leerDocumentosDeBiografia`.
- `src/pages/autor/[slug]/[...page].astro` -- la Página de Autor: cuerpo, semblanza, paginación y `<Armazon descripcion>`.
- `src/components/` -- los datos estructurados de Autor (busca `DatosDeAutor` o equivalente) y el bloque de la semblanza.
- `src/pages/tarjeta/autor/` y `src/lib/tarjeta.ts` -- la Tarjeta Social de Autor (la de Cita, en `tarjeta/[slug].png.ts`, es el patrón).
- `src/lib/publicado.ts` -- `Autor`, el conjunto publicable y cómo se cuentan las Citas por Autor.
- `src/lib/admision.ts` -- `autorAdmisible` con `biografia` (17.1).
- `DESIGN.md` -- los tokens `body-lg`, `caption` y `on-surface-variant`, y las propiedades personalizadas que ya usan los componentes.
- Pruebas:
  - `tests/unit/biografia-build.test.ts` (17.1), el patrón de build con biografía;
  - las pruebas de la Tarjeta (`tests/unit/tarjeta*.test.ts`) y de la Página de Autor (`tests/unit/*autor*.test.ts`);
  - `construirConCorpus`.

## Tasks & Acceptance

**Execution:**
- `tools/lib/cotejo.ts` -- el cotejo literal de la semblanza.
- La lectura de la cabecera de la biografía, accesible desde `src/` sin importar de `tools/`.
- La Página de Autor -- la atribución, la meta y el JSON-LD con hechos, `data-pagefind-ignore` y las 2+.
- La Tarjeta de Autor -- solo hechos.
- Pruebas de cada fila de la matriz, con builds para lo que se ve en `dist/`.
- `AGENTS.md` -- una línea en la sección de biografías: la semblanza se coteja literal y su atribución se publica.

**Acceptance Criteria:**
- Given el corpus real, en el que ningún Autor declara biografía, when `npm run build`, then termina con 0 y `dist/` solo cambia en los PNG de la Tarjeta de Autor, y en nada más.
- Given `npx astro check` y las pruebas tocadas, when corren, then pasan.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npx vitest run tests/unit/biografia-build.test.ts tests/unit/biografia.test.ts` (y las pruebas de la Tarjeta y de la Página de Autor tocadas) -- expected: verde
- `npx astro check` -- expected: 0 errores
- `npm run build` -- expected: código 0
