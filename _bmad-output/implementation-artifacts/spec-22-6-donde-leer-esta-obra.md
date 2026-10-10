---
title: 'Historia 22.6 — Dónde leer esta obra'
type: 'feature'
created: '2026-10-10'
status: 'done'
baseline_revision: '2a4bb8ba88a3e79111775017f6ebdb3ab695701d'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-22-4-la-obra-tiene-pagina.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/mockups/pagina-de-obra.html'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** La Página de Obra (22.4) no dice de qué edición se tomó el texto, bajo qué licencia ni dónde leer la obra entera. Tampoco admite la nota de la ficha.

**Approach:**
- Al pie de la página 1, la sección «Dónde leer esta obra» (UX-DR42): `h2` y la parte «Edición cotejada, gratuita» con una línea por Fuente (y por traducción), su licencia y el nombre de la Fuente como enlace, al documento o a la entrada de la obra repartida.
- Los estados sin cotejo y con cotejo parcial (UX-DR50 c y d).
- Campo opcional `nota` en la ficha (≤160 caracteres), pintado tras la sección (UX-DR44).

Todo sale de datos ya publicados: la `fuente` de cada Cita y su traducción.

## Boundaries & Constraints

**Always:**
- **Datos:** función pura `dondeLeer(citasDeLaObra)` en `src/lib/obras.ts`. Agrupa las Citas **con `fuente`** por (`fuente.id`, traductor), en orden de más a menos Citas y, a igualdad, por nombre de Fuente. Para cada grupo da:
  - `nombre`: `fuente.nombre` o, si no consta, el dominio, como hace la Línea de la Fuente;
  - `licencia`, si consta;
  - `paginas`: el número de `fuente.url` distintas;
  - `enlace`: con una página, esa URL; con varias, la **entrada de la obra**, es decir, la URL común a todas, que en Wikisource es la ruta hasta el último `/` compartido. Si no hay prefijo común con sentido (ni ruta ni anfitrión comunes), la línea va sin enlace, nunca con uno inventado;
  - `traduccion`: el traductor y el año, si constan.
  
  Además: `citasSinDocumento` y `total`.
- **Marcado** (componente `DondeLeer.astro`, solo en la página 1, después del Listado, la Paginación y los Temas, nunca entre las Citas):
  - `<section aria-labelledby>` con `<h2>` «Dónde leer esta obra» en el estilo de rótulo de la página;
  - si hay al menos un grupo, `<h3>` «Edición cotejada, gratuita» y una línea por grupo;
  - cada línea dice «{Fuente}[, repartida en {n} páginas][, en la traducción de {traductor}[ ({año})]]. Licencia {licencia}.»: el enlace es **el nombre de la Fuente**, la licencia va solo si consta, y los fragmentos opcionales solo si sus datos existen;
  - el ritmo vertical es el de UX-DR42, con tokens: 5 × `--unidad` de la paginación a Temas, 4 × hasta «Dónde leer», 2 × del `h2` al primer rótulo y 1 × del rótulo a sus líneas;
  - el `h3` va en `caption` con el peso de `author` y en `--tinta`;
  - los enlaces en línea, siempre subrayados (la regla de la 22.5 para enlaces en línea; el color, el que corresponda según `DESIGN.md`).
- **Estados:**
  - (c) sin ninguna Cita con `fuente`: bajo el `h2`, solo «Ninguna de sus citas tiene todavía documento cotejado.», sin `h3` ni enlace;
  - (d) con algunas Citas sin `fuente`, tras las líneas: «Una de sus {total} citas no tiene documento cotejado.» o «{n} de sus {total} citas no tienen documento cotejado.»;
  - (e) no hay parte de ediciones en venta, ni hueco, ni contenedor, ni CSS para ella.
- **Nota:**
  - `obraAdmisible` gana `nota` opcional, una cadena de 1 a 160 caracteres (tras recortar). El esquema rechaza una más larga. Si no tiene valor se omite;
  - la nota la escribe Héctor: ninguna orden la rellena, y `asegurarFichaDeObra` y `sembrar` nunca la escriben;
  - con nota, la página 1 la pinta **después** de la sección, fuera de ella, precedida de un filete (`--filete`), sin encabezado, en `caption` y `--tinta-apagada`, dentro de `--medida-prosa`, con 4 × `--unidad` por encima del filete y 3 × por debajo;
  - nunca en la meta ni en la Tarjeta.
- **Páginas 2+:** ni la sección ni la nota.
- Ningún literal de color o tipografía. Ninguna prosa compuesta más allá de la plantilla fija de la línea.

**Block If:** nada.

**Never:**
- Escribir notas en fichas reales.
- Las ediciones en venta (22.9).
- Inventar un enlace de entrada.
- Mostrar la nota en la meta o en la Tarjeta.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Un documento | 3 Citas, misma `fuente.url` de Wikisource | «Wikisource en español. Licencia CC BY-SA 4.0.», con el nombre enlazado a esa URL | — |
| Repartida | Citas en 12 URLs `…/Oráculo_manual…/N` | «Wikisource en español, repartida en 12 páginas. Licencia …», con el enlace a `…/Oráculo_manual…` | — |
| Sin prefijo con sentido | URLs en dos anfitriones de la misma Fuente | línea sin enlace | — |
| Dos Fuentes | 5 Citas de Wikisource y 2 de Gutenberg | Wikisource primero | — |
| Traducción | Citas con `traduccion` de Salinas 1909 | «…, en la traducción de Germán Salinas (1909). Licencia …» | — |
| Dos traducciones | dos traductores | dos líneas | — |
| Sin cotejo (c) | ninguna Cita con `fuente` | solo «Ninguna de sus citas tiene todavía documento cotejado.» | — |
| Parcial (d) | 1 de 27 sin `fuente` | «Una de sus 27 citas no tiene documento cotejado.» | — |
| Parcial plural | 3 de 10 | «3 de sus 10 citas no tienen documento cotejado.» | — |
| Nota | ficha con `nota` | tras la sección, con filete y sin encabezado; no en la meta | — |
| Nota larga | 161 caracteres | el esquema la rechaza | el build rompe |
| Página 2 | — | sin la sección ni la nota | — |

</intent-contract>

## Code Map

- `src/pages/obra/[autor]/[slug]/[...page].astro` (22.4) -- el orden de la página 1 (Cabecera, Listado, Paginación, Temas), los estilos de `.rotulo` y los props de `getStaticPaths`, que llevan las Citas de la Obra.
- `src/lib/obras.ts` -- `ObraResuelta` (con `fuentes` y `edicionCotejada`) y `obrasDelConjunto`. Aquí va `dondeLeer`.
- `src/lib/admision.ts` -- `obraAdmisible`, que ya tiene `distintaDe`, y su mensaje de claves. `src/content.config.ts`.
- `tools/lib/obras.ts` -- `aplicarFichaDeObra` y `sembrarFichasDeObra`, que **no** tocan `nota`. Comprobar que `reescribirFichaDeObra` la conserva al reunir, separar o titular.
- `src/components/` -- la Línea de la Fuente (busca «Texto tomado de»: su componente, y cómo saca el rótulo y el dominio de `cita.fuente`).
- `src/styles/tokens.css` -- `--unidad`, `--filete`, `--tinta-apagada`, `--medida-prosa`, `--pie`, `--autor` y la clase `.enlace-en-tinta` (22.5).
- La maqueta, l.274-345: las secciones `.donde` y `.nota-ficha` y su CSS.
- Pruebas: `tests/unit/obra-pagina.test.ts` (los builds de Obra) y `tests/unit/obras.test.ts` (lo puro).

## Tasks & Acceptance

**Execution:**
- `src/lib/obras.ts` -- `dondeLeer`, con pruebas puras de cada fila de datos.
- `src/components/DondeLeer.astro` y la página -- la sección, la nota y el orden.
- `src/lib/admision.ts` -- `nota`.
- `tools/lib/obras.ts` -- la conservación de `nota` en las reescrituras, con prueba.
- `tests/unit/obra-pagina.test.ts` -- las filas visibles en build: estados c y d, nota, página 2 y meta sin nota.
- `AGENTS.md` -- una línea: la `nota` de la ficha la escribe Héctor a mano, y es el único campo de la ficha que se edita a mano.

**Acceptance Criteria:**
- Given `npx vitest run tests/unit/obras.test.ts tests/unit/obra-pagina.test.ts`, `npx astro check` y `npm run build`, when corren, then pasan.
- Given el corpus real, when se construye, then las Obras sin ninguna Cita cotejada muestran el estado (c), y el número de Obras en (c) y en (d) se informa en el resultado.

## Spec Change Log

## Review Triage Log

### 2026-10-10 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 10 (high 0, medium 3, low 7)
- defer: 0
- reject: 1
- addressed_findings:
  - `[medium]` `[patch]` `entradaComun` podía inventar una entrada (directorios de Gutenberg) → solo subpáginas de Wikisource; las 14 entradas reales comprobadas con 200.
  - `[medium]` `[patch]` Citas que se caían del recuento y valores comunes mal calculados → todo grupo cuenta; licencia y año solo si todas las Citas los declaran.
  - `[medium]` `[patch]` Sin pruebas del render de «repartida» ni de la línea sin enlace → pruebas de build.
  - `[low]` `[patch]` Normalización de páginas; el estado (d) fuera del `h3`; `Rotulo.astro` compartido; `nota` por puntos de código y sin saltos ni controles; `data-pagefind-ignore`; `dondeLeer` una vez por Obra; conservación de la nota al aprobar y al retirar; AGENTS.md.

## Verification

**Commands:**
- `npx vitest run tests/unit/obras.test.ts tests/unit/obra-pagina.test.ts tests/unit/obras-build.test.ts` -- expected: verde
- `npx astro check` -- expected: 0 errores
- `npm run build` -- expected: código 0

## Auto Run Result

Status: done

**Resumen:** la página 1 de cada Obra lleva al pie «Dónde leer esta obra»: una línea por Fuente y traducción, con licencia y el nombre de la Fuente enlazado al documento o a la entrada de la obra repartida («Wikisource en español, repartida en 12 páginas. Licencia CC BY-SA 4.0.»). Estados (c) y (d) en el corpus real: 7 y 6 Obras. Campo `nota` opcional (≤160 puntos de código) que solo escribe Héctor, pintado tras la sección, con filete y sin encabezado; nunca en la meta. Sin ediciones en venta (22.9).

**Revisión:** 10 parches aplicados y 1 rechazado (tokens tipográficos que no existen en el sistema: se conservan los literales, como en los componentes vecinos). Seguimiento: 3×3 = 9 → true.

**Verificación:** suite 118 ficheros y 3800 pruebas; astro check, 0 errores; build en verde (180/81 y 2081 rutas coincidentes); las 14 URLs de entrada responden 200 en Wikisource.
