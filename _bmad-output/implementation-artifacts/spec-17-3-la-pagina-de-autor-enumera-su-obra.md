---
title: '17.3 — La Página de Autor enumera su obra'
type: 'feature'
created: '2026-10-10'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-17-context.md'
  - '{project-root}/AGENTS.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** La Página de Autor dice quién fue y lista sus Citas, pero no de qué obras salen ni cuántas de cada una; desde la 22.4 cada Obra tiene página y nada en la del Autor lleva a ella.

**Approach:** Bajo la semblanza y su atribución, en la página 1, una Lista de Obras con el rótulo «Su obra en este Corpus»: una entrada por Obra del Autor (derivada en `src/lib/obras.ts`/`publicado.ts`, nunca de la Procedencia), con título, año si consta y recuento, enlazada a su Página de Obra, y al pie cuántas Citas no declaran obra.

## Boundaries & Constraints

**Always:**
- Las Obras salen de las Obras resueltas de las Citas publicadas del Autor (`obrasDeLasCitas(citasDeAutor(...))` o una función nueva en `src/lib/publicado.ts`); ninguna ficha sin Citas publicadas añade una entrada (FR-42). Fuera de `obras.ts`/`admision.ts` nada lee `procedencia.obra` (lo fija `tests/unit/obras.test.ts`).
- Enumera Obras, no Citas: ninguna Cita se repite en la misma URL (AD-19).
- Orden: de más a menos Citas publicadas y, a igualdad, por título (`localeCompare` en `es`) — la regla de `temasDeLaObra` y el orden que dibuja la maqueta.
- Cada entrada (UX-DR46, `mockups/pagina-de-autor-tres-ordenes.html` orden B, l.82-88 y 155-183): un enlace de bloque a `rutaDeLaObra(obra)` —también si la Obra no se indexa—, sin subrayado (EXPERIENCE.md:267), alto mínimo `--zona-de-toque`, filete `--grosor-filete` `--filete` entre entradas; título de la ficha (`obra.titulo`) en `--sans` y `--tinta` a la izquierda; recuento a la derecha en `--tinta-apagada` con `font-variant-numeric: tabular-nums`. Cuerpos con tokens existentes (`--cuerpo-md` el título, `--pie` el recuento); ningún literal.
- Año: solo `obra.año` (ya omitido si discrepa o falta; nunca el de una traducción); tras el título, «Título · 1913», con el punto medio oculto al lector y una coma para él, como la Cabecera de Obra. Sin año, nada.
- Pie: Citas del Autor publicadas sin Obra (`cita.obra === undefined`): «Y una cita sin obra documentada.» / «Y {n} citas sin obra documentada.»; con cero, ninguna línea.
- Rótulo «Su obra en este Corpus» con `src/components/Rotulo.astro` (h2) o el mismo trato que «Citas documentadas»; la sección va entre la ficha (`</header>`) y «Citas documentadas», solo con `pagina.currentPage === 1`. Un Autor sin ninguna Obra (todas sin obra) no lleva rótulo ni lista; solo, si procede, la línea del pie bajo el mismo rótulo: sin Obras y con Citas sin obra, el rótulo y la línea; sin nada, nada.
- Sin enlace comercial: la Página de Autor sigue en `SUPERFICIES_SIN_INGRESO`; la lista es HTML estático (sin guion) y la página se construye igual con cualquier Modelo.
- `data-pagefind-ignore` en la sección: la lista no es contenido propio de la página para el buscador interno.

**Block If:** Nada exige a Héctor.

**Never:** No pintar Citas dentro de la lista. No reescribir ni reunir Procedencias. No mover la ficha antes del catálogo ni quitarla de páginas 2+ (es de la 17.4). No enlaces comerciales.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Varias Obras | Séneca: Brevedad 5, Cartas 3, Ira 3 | orden Brevedad, Cartas, De la ira (empate por título) | — |
| Año coincidente | Cartas, todas 64 | «Cartas a Lucilio · 64» (lector: «, 64») | — |
| Año ausente o discrepante | `obra.año` undefined | solo el título | — |
| Obra no indexable | Ira, 1 Cita | entrada presente y enlazada a su página | — |
| Citas sin obra | 2 Citas sin obra | «Y 2 citas sin obra documentada.» | — |
| Una sin obra | 1 | «Y una cita sin obra documentada.» | — |
| Ninguna sin obra | 0 | sin línea | — |
| Página 2 | `/autor/seneca/2/` | sin lista | — |
| Autor sin Obras ni Citas sin obra | — | sin sección | — |

</intent-contract>

## Code Map

- `src/pages/autor/[slug]/[...page].astro` -- `getStaticPaths` (l.36-46, `paginate(citasDeAutor(...), { props: { autor, documentadas } })`): añadir las Obras del Autor y el recuento sin obra a `props`; ficha `<header class="ficha">` (l.88-108), rótulo «Citas documentadas» (l.118), `.rotulo` local (l.159-167), `.listado` (l.169-174).
- `src/lib/publicado.ts` -- `obrasDeLasCitas` (l.454-460, dedup por `obra.nombre`, orden por nombre), `citasDeAutor` (l.166), `temasDeLaObra` (l.186-192, el orden de referencia).
- `src/lib/obras.ts` -- `ObraResuelta` (`titulo`, `año`, `recuento`, `nombre`), `rutaDeLaObra` (l.120).
- `src/components/Rotulo.astro` -- h2 del rótulo; `src/pages/obra/[autor]/[slug]/[...page].astro` -- el patrón «· año» con `.oculto`.
- Maqueta: `_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/mockups/pagina-de-autor-tres-ordenes.html` (orden B).
- Pruebas: `tests/unit/biografia-build.test.ts` (builds de Página de Autor con `construirConCorpus`), `tests/unit/ayuda/construir.ts` (`citaValida`, `AUTOR_VALIDO`, `paginaConstruida`), `tests/unit/ingreso-construido.test.ts`, `tests/unit/medicion.test.ts` (tope de guion sobre `/autor/seneca/`), `tests/e2e/pagina-de-autor.spec.ts`.

## Tasks & Acceptance

**Execution:**
- `src/lib/publicado.ts` -- `obrasDelAutor(citas, slug)` (o equivalente) con el orden decidido y el recuento de Citas sin obra; pruebas puras.
- `src/components/ListaDeObras.astro` (nuevo) y la Página de Autor -- la sección en la página 1.
- `tests/unit/` -- build: cada fila de la matriz; ninguna Cita repetida en `/autor/x/`; ningún `data-ingreso`; ningún literal de color/tipografía en el componente.
- `tests/e2e/pagina-de-autor.spec.ts` -- entradas ≥ 44 px y enlazadas.
- `src/lib/ingreso.ts` -- solo si el comentario de `SUPERFICIES_SIN_INGRESO` necesita ponerse al día.

**Acceptance Criteria:**
- Given `npx vitest run` de los ficheros tocados, `npx astro check` y `npm run build`, when corren, then pasan, y `/autor/miguel-de-unamuno/` lista sus Obras con enlaces a `/obra/miguel-de-unamuno/…/`.
- Given `npx playwright test tests/e2e/pagina-de-autor.spec.ts --project=escritorio`, when corre, then pasa.

## Design Notes

**Orden y año.** Ninguna espina fija el orden de la lista ni dónde va el año. Se toma el orden que dibuja la maqueta (por recuento, descendente), con el desempate por nombre de `temasDeLaObra`, y el año con la forma de la Cabecera de Obra («· año», punto medio oculto al lector), que es la única forma ya decidida de poner título y año juntos en la familia Obra.

## Verification

**Commands:**
- `npx vitest run <ficheros tocados>` -- expected: verde.
- `npx astro check` -- expected: 0 errores.
- `npm run build` -- expected: termina.
- `npx playwright test tests/e2e/pagina-de-autor.spec.ts --project=escritorio` -- expected: verde.
