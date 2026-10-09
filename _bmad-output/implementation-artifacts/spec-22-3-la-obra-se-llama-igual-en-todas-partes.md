---
title: 'Historia 22.3 — La obra se llama igual en todas partes'
type: 'feature'
created: '2026-10-10'
status: 'in-progress'
baseline_revision: 'c10f0fa70e24ea7b4aaa22290ed349eca1c262b1'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-22-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-22-2-una-obra-un-nombre-las-grafias-se-deciden-en-la-ficha.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Cada superficie nombra la obra leyendo `procedencia.obra` de la Cita: la Atribución, el JSON-LD, la Tarjeta, la Imagen de Cita, la Imagen del Kit, lo copiado y la Pieza. En cuanto una Obra reúna grafías, la misma Obra saldrá con dos nombres según por dónde se mire.

**Approach:** `src/lib/obras.ts` resuelve cada Cita a su Obra por identidad y es el dueño de sus atributos derivados. El conjunto publicable le cuelga a cada Cita su Obra resuelta. Todas las superficies muestran `titulo` de la Obra, y ningún módulo fuera de `obras.ts` y de la admisión lee `procedencia.obra`.

## Boundaries & Constraints

**Always:**
- **Atributos derivados**, en `src/lib/obras.ts` (puro, AD-5), con la función `resolverObras(citas, fichas)` que recibe las Citas y las fichas ya admitidas. Devuelve por ficha un `ObraResuelta` con:
  - `nombre` de la ficha;
  - `autor`;
  - `titulo`: el `tituloEfectivo` de la 22.2;
  - `año`: solo si **todas** las Citas que declaran `procedencia.año` coinciden. Si discrepan, se omite y se avisa. `traduccion.año` nunca cuenta (19.1);
  - `fuentes`: ids distintos;
  - `edicionCotejada`: si alguna Cita tiene `fuente`;
  - `temas`: unión ordenada;
  - `recuento`: Citas publicadas.
  
  Expone además la consulta de la Obra de una Cita.
- **Conjunto publicable** (`src/lib/publicado.ts`): carga la colección `obras` y cuelga `obra?: ObraResuelta` en cada Cita aplanada. Una Cita sin obra declarada no la lleva.
- **Consumidores:** `Atribucion.astro`, `atribucion.ts` (`procedenciaCompuesta` y `textoParaCopiar`), `DatosEstructurados.astro`, `tarjeta/[slug].png.ts`, `ImagenDeCita.astro`, `ImagenDelKit.astro` y la Pieza nombran la obra con `cita.obra.titulo`.
- **El año que acompaña al título**, en la Atribución, lo copiado y el resto de superficies, sigue siendo el `procedencia.año` **de esa Cita**, nunca el de la Obra.
- `public/islas/imagen.js` sigue recibiendo la procedencia ya compuesta en el marcado (`data-procedencia`).
- **Aviso del build** (desde `integraciones/obras.ts`, con `avisosDeObras` o su par): «Obra con años discrepantes», nombrando la ficha y los años.
- **Prueba de la regla:** fuera de `src/lib/obras.ts`, `src/lib/admision.ts` y las herramientas de `tools/`, ningún fichero de `src/` ni `public/islas/` lee `procedencia.obra`, ni la desestructura con `obra`.
- El título sigue sin enlazar a nada (la página llega en la 22.4).
- Con el corpus actual, en el que cada Obra publicada tiene una sola grafía y su título es esa grafía, `dist/` sale **idéntico** al de la base. Una prueba de build con una ficha que reúne dos grafías demuestra que las dos Citas muestran el mismo título en la Atribución, lo copiado, el JSON-LD y `data-procedencia`.

**Block If:** nada.

**Never:**
- Enlazar el título.
- Crear la ruta `/obra/`.
- Mostrar el año de la Obra en lugar del de la Cita.
- Leer fichas como YAML crudo.
- Inferir un año.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reunida | ficha `formas: [a, b]` y `titulo: "A"`; una Cita con «A» y otra con «B» | las dos dicen «A» en la Atribución, lo copiado, el JSON-LD, `data-procedencia` y la Tarjeta | — |
| Año común | dos Citas con 1898 | `obra.año = 1898` | — |
| Años distintos | 1898 y 1902 | `obra.año` omitido y aviso del build | — |
| Traducción | Cita con solo `traduccion.año` | no aporta año a la Obra | — |
| Copiado sin año | Cita sin año en una Obra con año | lo copiado no lleva año | — |
| Sin obra | Cita sin `procedencia.obra` | se muestra como hoy, sin Obra | — |
| Regla de lectura | `src/` | solo `obras.ts` y `admision.ts` leen `procedencia.obra` | prueba |

</intent-contract>

## Code Map

- `src/lib/obras.ts` -- la 22.1 y la 22.2 ya dejaron aquí `formaDeObra`, `grafiaPorOmision`, `tituloEfectivo`, `grafiasDeFicha`, la resolución Cita → ficha y `avisosDeObras`. Esta historia la completa.
- `src/lib/publicado.ts` -- el tipo `Cita` (l.30), `aplanarCita` (l.465) y `conjuntoPublicable` (l.566), con la integridad y los avisos (l.431, l.530).
- `src/content.config.ts` -- la colección `obras` (22.1).
- Consumidores actuales de `procedencia.obra`:
  - `src/components/Atribucion.astro:23,32`;
  - `src/lib/atribucion.ts:30` (`procedenciaCompuesta`) y `textoParaCopiar` (que también usan la Pieza, `src/lib/pieza.ts`, y `src/lib/compartir.ts`);
  - `src/components/DatosEstructurados.astro:23`;
  - `src/pages/tarjeta/[slug].png.ts:29`;
  - `src/islands/ImagenDeCita.astro:59`;
  - `src/islands/ImagenDelKit.astro:28`.
- `integraciones/obras.ts` -- donde se emiten los avisos del build.
- Pruebas que construyen y miran estas superficies:
  - `tests/unit/traduccion-construida.test.ts` (patrón de build que mira Atribución, copiado, `data-procedencia`, JSON-LD y Tarjeta);
  - `tests/unit/compartir.test.ts` y `tests/unit/obras*.test.ts`;
  - el andamio `construirConCorpus`, que siembra fichas.

## Tasks & Acceptance

**Execution:**
- `src/lib/obras.ts` -- `ObraResuelta` y `resolverObras`, con el año común y su aviso.
- `src/lib/publicado.ts` -- cargar `obras` y colgar `obra` en cada Cita.
- Los seis consumidores y `atribucion.ts` -- usar `cita.obra?.titulo`.
- `integraciones/obras.ts` -- el aviso de años.
- `tests/unit/obras.test.ts` -- lo puro.
- `tests/unit/obra-construida.test.ts` -- la fila «Reunida» de la matriz, sobre las superficies construidas.
- La prueba de la regla de lectura.
- Comparar `dist/` con la base, con la misma `FECHA_JORNADA`.

**Acceptance Criteria:**
- Given el corpus real, when `npm run build`, then termina con 0 y `dist/` es idéntico al de la base.
- Given `npx astro check` y las pruebas tocadas, when corren, then pasan.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npx vitest run tests/unit/obras.test.ts tests/unit/obra-construida.test.ts tests/unit/compartir.test.ts tests/unit/traduccion-construida.test.ts` -- expected: verde
- `npx astro check` -- expected: 0 errores
- `npm run build` -- expected: código 0
