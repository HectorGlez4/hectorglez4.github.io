---
title: '22.7 — La obra se encuentra en el buscador del sitio, y se ve al compartirla'
type: 'feature'
created: '2026-10-10'
status: 'done'
baseline_revision: '0e1d7eaceb3ce9397bee9d4d969f231c1f3d4dcd'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-22-context.md'
warnings: []
deferred:
  - summary: >-
      Todas las Tarjetas Sociales se sirven con `immutable` y un año de caché en una URL cuyo contenido cambia con el Corpus.
    evidence: |-
      La de Obra lleva el recuento de Citas y el nombre del Autor; las de Autor, Tema y Colección ya seguían el mismo patrón. Una red o CDN puede seguir enseñando la cifra vieja.
    location: >-
      src/pages/tarjeta/**/*.png.ts
    severity: low
  - summary: >-
      La Cabecera y la meta description de la Página de Obra imprimen `obra.año` en crudo; un año antes de Cristo saldría con signo.
    evidence: |-
      22.4 escribe `{obra.año}` y `descripcionDeObra` `(${obra.año})`; hoy ninguna Obra tiene año negativo. La Tarjeta (22.7) ya usa `añoLegible`.
    location: >-
      src/pages/obra/[autor]/[slug]/[...page].astro, src/lib/atribucion.ts:221
    severity: low
---

<intent-contract>

## Intent

**Problem:** Las Obras indexables ya entran en Pagefind con el tipo «Obra» (22.4), pero el resultado se pinta como cualquier otro —título en serif, sin Autor— y la Página de Obra no declara imagen social: su enlace llega mudo a WhatsApp o a una red.

**Approach:** Un metadato nuevo de Pagefind, `autor`, en la Cabecera de Obra; `/buscar/` pinta el resultado de Obra con el título en la sans, el Autor debajo y nombre accesible «Obra: {título}, de {Autor}». Una Tarjeta Social de Obra en `/tarjeta/obra/{autor}/{obra}.png` —la de listado con título en la sans y la bajada «{n} citas de {Autor}, {año}»— que la Página de Obra declara siempre.

## Boundaries & Constraints

**Always:** Solo hechos del Corpus en la Tarjeta (AD-28): título de la Obra resuelta, recuento de Citas publicadas, nombre del Autor y el año **de la Obra** (`obra.año`, omitido si no consta); nunca la nota, el traductor ni la licencia. «1 cita de…» en singular. Tarjeta función del contenido (AD-16): el mismo Corpus da los mismos bytes, y el fichero del Autor entra en su entrada (el nombre sale de él). La Página de Obra declara su Tarjeta en todas sus páginas, sea indexable o no. Los rótulos de tipo siguen saliendo de `src/lib/tipoDeResultado.ts`. Tokens de `DESIGN.md`, ningún literal de color o tipografía.

**Block If:** Nada: la historia no exige ninguna decisión de Héctor.

**Never:** No cambiar qué se indexa (eso es de `superficies.ts` y 22.4). No tocar la etiqueta del campo de búsqueda («…un autor o un tema»), que las espinas dejan sin decidir. No serif para el título de una Obra en ninguna superficie. No crear otra plantilla de tarjeta: es la de listado con una opción de familia.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Obra con año | 3 Citas, `obra.año` 64, Autor «Séneca» | bajada «3 citas de Séneca, 64» | — |
| Una sola Cita | recuento 1 | «1 cita de Séneca, …» | — |
| Sin año de Obra | años discrepantes o traducción sin año | «9 citas de Epicteto», sin coma ni año | — |
| Nota y traductor | ficha con `nota`, Citas traducidas | ni la nota ni el traductor en el SVG | — |
| Resultado de Obra | `meta.tipo = obra`, `meta.autor` | rótulo «Obra», `.titulo.de-obra`, `.r-autor`, `aria-label` | sin `meta.autor`: sin línea de Autor ni «, de» |
| Resultado de otro tipo | `meta.tipo = cita` | igual que hoy, título en serif | — |

</intent-contract>

## Code Map

- `src/lib/tipoDeResultado.ts` -- ya tiene `obra: 'Obra'`; el comentario remite a la 22.7.
- `src/components/Armazon.astro:33-61,148-182` -- props `tipo` y `tarjeta`; `og:image` y `data-pagefind-meta="tipo:…"` en `<main>`.
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- Cabecera (`p.de` con el enlace al Autor): ahí va `data-pagefind-meta="autor"`; falta `tarjeta=` en `<Armazon>`. Las páginas 2+ ya no entran en Pagefind.
- `src/pages/buscar.astro:173-212,330-345` -- `pintar()` del guion en línea y los estilos `:global(.titulo)`. Maqueta: `mockups/buscar.html:164-167,245` (`.titulo.de-obra`, `.r-autor` con el estilo `author`).
- `src/lib/tarjeta.ts` -- `svgDeTarjetaDeListado`/`DatosDeTarjetaDeListado` (título en `SERIF`, hechos bajo el filete) y `datosDeTarjetaDeAutor` como modelo de `datosDeTarjetaDeObra`.
- `src/pages/tarjeta/autor/[slug].png.ts` -- modelo de la ruta PNG (sharp, cabeceras).
- `src/lib/publicado.ts` -- `conjuntoPublicable`, `obrasPublicadas`, `autoresPublicados`; `src/lib/obras.ts` -- `ObraResuelta` (`titulo`, `año`, `recuento`, `autor`, `nombre`), `segmentosDeObra`.
- Pruebas: `tests/unit/tarjeta.test.ts` (lo puro), `tests/unit/obra-pagina.test.ts` (build con Séneca y Epicteto; `EN_PAGEFIND`, `html()`), `tests/e2e/busqueda.spec.ts`.

## Tasks & Acceptance

**Execution:**
- `src/lib/tarjeta.ts` -- `familiaDelTitulo?: 'serif' | 'sans'` en `DatosDeTarjetaDeListado` (por omisión serif) y `datosDeTarjetaDeObra(obra, autor)` con la bajada como único hecho -- la Tarjeta de Obra es la de listado.
- `src/pages/tarjeta/obra/[autor]/[slug].png.ts` -- una por Obra publicada, con el Autor del Corpus.
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- `tarjeta=` y el metadato `autor` en la Cabecera.
- `src/pages/buscar.astro` -- resultado de Obra: clase `de-obra`, `.r-autor` y `aria-label`; estilos con tokens.
- `src/lib/tipoDeResultado.ts` -- poner al día el comentario.
- `tests/unit/tarjeta.test.ts` -- bajada (plural, singular, sin año), sans en el título, sin nota ni traductor, mismos bytes de PNG dos veces, nombre de Autor distinto ⇒ SVG distinto.
- `tests/unit/obra-pagina.test.ts` -- `og:image` en indexable, no indexable y página 2; el PNG existe; `data-pagefind-meta="autor"` con el nombre en la indexable.
- `tests/e2e/busqueda.spec.ts` -- si tiene un caso por tipo, el de Obra.

**Acceptance Criteria:**
- Given `npx vitest run tests/unit/tarjeta.test.ts tests/unit/obra-pagina.test.ts`, `npx astro check` y `npm run build`, when corren, then pasan y `dist/tarjeta/obra/` tiene una PNG por Obra publicada.
- Given `dist/pagefind`, when se busca el título de una Obra indexable, then el resultado trae `meta.tipo = obra` y `meta.autor` con el nombre de su Autor.

## Verification

**Commands:**
- `npx vitest run tests/unit/tarjeta.test.ts tests/unit/obra-pagina.test.ts` -- expected: verde.
- `npx astro check` -- expected: 0 errores.
- `npm run build` -- expected: termina; `ls dist/tarjeta/obra/*/*.png | wc -l` igual al número de Obras publicadas del registro.

## Auto Run Result

**Resumen:** el resultado de Obra en `/buscar/` lleva el título en la sans, el Autor debajo (metadato nuevo `autor` de Pagefind) y nombre accesible «Obra: {título}, de {Autor}»; cada Obra publicada tiene Tarjeta Social en `/tarjeta/obra/{autor}/{obra}.png` y la Página de Obra la declara siempre.

**Ficheros:**
- `src/lib/tarjeta.ts` — `familiaDelTitulo`, `bajadaDeTarjetaDeObra`, `datosDeTarjetaDeObra`.
- `src/lib/atribucion.ts` — `añoLegible` exportado.
- `src/pages/tarjeta/obra/[autor]/[slug].png.ts` — la ruta nueva.
- `src/pages/obra/[autor]/[slug]/[...page].astro` — `tarjeta=` y `data-pagefind-meta="autor"`.
- `src/pages/buscar.astro` — el resultado de Obra y sus estilos.
- `src/lib/tipoDeResultado.ts` — comentario.
- `tests/unit/tarjeta.test.ts`, `tests/unit/obra-pagina.test.ts`, `tests/e2e/busqueda.spec.ts` — pruebas.
- `AGENTS.md` — la Tarjeta de Obra y el metadato `autor`.

**Revisión:** 5 patches aplicados (1 medio, 4 bajos), 2 deferidos, 14 rechazados.

**Revisión de seguimiento:** `true` — parcheados alto 0, medio 1, bajo 4; puntuación 3 × 1 + 4 = 7 ≥ 5 → `true`.

**Verificación:** `npx vitest run tests/unit/tarjeta.test.ts tests/unit/obra-pagina.test.ts` 76/76; `npx astro check` 0 errores; `npm run build` termina con 180 Obras publicadas, 81 indexables, y 180 PNG en `dist/tarjeta/obra/`; `npx playwright test tests/e2e/busqueda.spec.ts --project=escritorio` 15 pasan, 1 omitida (preexistente).

**Riesgos:** la prueba e2e del resultado de Obra depende de que «Proverbios y cantares» de Machado siga indexable, y el CI no la corre.

