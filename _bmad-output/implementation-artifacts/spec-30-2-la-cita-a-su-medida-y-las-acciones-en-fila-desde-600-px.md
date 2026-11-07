---
title: 'Historia 30.2 — La Cita a su medida y las acciones en fila desde 600 px'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: '74341bdb78670af7cd9ed61986e46418f9f65c0a'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-30-context.md'
warnings: [oversized]
deferred:
  - summary: 'Al fundir la Épica 29 en la rama: repetir a 1280 × 800 la medida de 34ch con la Cita en verso más larga (sus saltos de `versosDe`) y comprobar que la fila de acciones no cambia con ella; anotarlo en este spec.'
    evidence: 'La Épica 29 (src/lib/verso.ts) no está en v9/epica-30; ninguna pieza de la 30.2 parte ni une versos (AD-29). Hoy se mide con `citaDeTramo` (xl, lg, md).'
    severity: low
  - summary: 'Pendiente de Héctor (bmad-create-epics-and-stories / bmad-ux): el AC dice «una Cita de tramo xl a 36 px, unos 610 px», pero desde 600 px el tramo xl se compone a `--cita-xl` (44 px) y 36 px es el tramo lg; en el ch de la Cita, xl resuelve unos 745 px, más que la columna de 720, que es la que lo limita. Lo construido sigue el contrato literal (34ch en el cuerpo de su tramo, sin valor nuevo, sin desbordar la columna); la cifra de cada tramo queda anotada.'
    evidence: 'src/components/BloqueDeCita.astro (media ≥600: xl→--cita-xl); src/styles/tokens.css:37-38; DESIGN.md § Layout «Medida de la Cita» («a 36px son unos 610px»).'
    severity: low
  - summary: 'Pendiente de Héctor (bmad-create-epics-and-stories): el AC pide que las instantáneas de móvil de tests/e2e/tipografia-calculada.spec.ts no cambien, pero su clave es la ruta de clases desde <body>, y el contenedor de la fila (pedido por el mismo AC) añade un segmento a la ruta de Copiar e Imagen en móvil y escritorio. Se regraban las de las páginas de Cita con los mismos valores (peso | interlineado) y solo esa reclave; las claves de la Cita no cambian.'
    evidence: 'tests/e2e/tipografia-calculada.spec.ts:100-140 (ruta de clases); epics.md Story 30.2, tercer y cuarto Given.'
    severity: low
---

<intent-contract>

## Intent

**Problem:** El `max-width: var(--medida-cita)` está en `.bloque` (`BloqueDeCita.astro:55`), así que los 34ch se resuelven con el cuerpo del contenedor (17 px): unos 365 px, tres palabras por línea a 1280 × 800. Y Copiar e Imagen van siempre apilados, también en escritorio (FR-64, UX-DR115, UX-DR114).

**Approach:** Llevar el `max-width: var(--medida-cita)` al elemento del texto (`.texto`), cuyo `font-size` es el del tramo, y limitar Atribución y Línea de la Fuente a `--medida-prosa`; y envolver Copiar e Imagen de la Página de Cita en un componente nuevo sin zona, `src/components/FilaDeAcciones.astro`, que desde 600 px los pone en fila (cada uno a su ancho, 2 × unidad) y por debajo los apila como hoy, con el campo de copia manual siempre bajo la fila.

## Boundaries & Constraints

**Always:**
- La medida: `.texto` (el `h1`/`p` dentro de `blockquote.cita`) lleva `max-width: var(--medida-cita)`; `.bloque` deja de llevarlo. `figcaption` lleva `max-width: var(--medida-prosa)` y `.fuente` (`Fuente.astro`) también. Ningún valor nuevo ni token nuevo; ni la columna entera. Vale en la Página de Cita, la portada y el 404 (es el mismo Bloque). El filete de 48 px del `figcaption` no cambia.
- La fila: `FilaDeAcciones.astro` es un `<div class="fila-de-acciones">` con `<slot />`, sin `data-zona` ni `data-sin-zona` (no tiene enlaces) y sin guion. En `[slug].astro` envuelve exactamente `<CopiarCita …/>` y `<ImagenDeCita …/>`, en ese orden; `CompartirEnlace` queda fuera, detrás. Es la que usará la 28.2 en la Cita del Día (la portada no se toca ahora).
- Geometría con tokens, sin literales salvo el punto de ruptura `600px` de las `@media` ya existentes: la fila a `calc(var(--unidad) * 4)` de lo de arriba; `display: flex; flex-wrap: wrap; align-items: flex-start; gap: calc(var(--unidad) * 2)`. Por debajo de 600 px la isla de Imagen ocupa su línea (`flex-basis: 100%`, su botón a su ancho) → Imagen a 2 × bajo Copiar, como hoy; desde 600 px `flex-basis: auto` → en fila, Copiar primero, 2 × entre los dos; con el texto al 200 % `flex-wrap` baja Imagen sin solapes. «Compartir en» sigue a 3 × bajo la fila (su `.isla` ya lo lleva desde la 30.1).
- El campo de copia manual (`p.respaldo` dentro de la isla de Copiar) aparece bajo la fila a cualquier ancho, a su `--medida-prosa`, nunca entre los dos botones: dentro de la fila la `.isla` de Copiar es `display: contents` y su `.respaldo` lleva `order: 1; flex-basis: 100%; margin-top: 0`. Esas reglas viven en la propia isla con contexto (`:global(.fila-de-acciones) > .isla …`), igual que el `margin-top: 0` de la isla de Imagen dentro de la fila: el Kit (`MaterialParaPublicar.astro`), que usa `CopiarCita` sin fila, no cambia.
- El marcado de las dos islas y sus guiones no cambia ni un byte: cada `<script>` sigue justo tras su `.isla` (`currentScript.previousElementSibling`), mismos `aria-label`, mismo nombre accesible, mismas regiones `role="status"`. Sin Imagen (`tramo.admiteImagen` falso) la fila lleva solo Copiar, sin hueco ni celda vacía. El orden de tabulación es el del marcado.
- Ninguna zona ni exención nueva; `COLOCACION` de `tests/unit/medicion.test.ts` no cambia. Ningún guion nuevo; `GUIONES_EXTERNOS` y `MAX_BYTES_DE_GUION` sin tocar.
- Se anota el peso que añade la historia (`npm run build`).

**Block If:**
- El paso del peso de `npm run build` avisa o se para: lo decide Héctor (no se tocan sus umbrales).
- A 1280 × 800, el texto de alguna Cita desborda la columna (su caja pasa del borde derecho de `article`), o el barrido axe falla por la fila de forma que pida una decisión de UX.
- Alguna Cita de tramo lg o md a 1280 × 800 da un `max-width` resuelto que no es 34 × el «0» de su familia y cuerpo (±1 px).

**Never:**
- Tocar la portada, `CitaDelDia.astro`, el 404 (más allá de lo que el Bloque compartido cambia), el Kit, `CompartirEnlace.astro` ni el orden del `<article>` de la 30.1.
- Escribir un separador o unión de versos (AD-29).
- Cambiar el marcado o el guion de `CopiarCita.astro` o `ImagenDeCita.astro`; meter «Compartir en» en la fila; hacer la fila desde 1024 px.
- Editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Escritorio, tramo lg | Cita 81–160 caracteres, 1280 × 800 | `max-width` de `.texto` = 34 × «0» a 36 px (~610 px); caja ≤ 720 | — |
| Escritorio, tramo xl | ≤ 80 caracteres, 44 px | `max-width` = 34 × «0» a 44 px (~745); la caja la limita la columna (≤ 720), sin desbordar | anotar la cifra |
| Móvil | 360 × 640, cada tramo | el `max-width` resuelto (nuevo, y el de antes en el cuerpo de `.bloque`) es mayor que la columna: la medida no ata, el reparto de líneas es el de la columna, como en la principal | — |
| Fila desde 600 px | 600, 768, 1280 | Copiar e Imagen con la misma `top`; Imagen.left − Copiar.right = 16 ±1 | — |
| Por debajo de 600 px | 360, 599 | Imagen.top − Copiar.bottom = 16 ±1, cada uno a su ancho | — |
| Texto al 200 % | `zoom: 2` a 600 y 768 | sin solape de cajas, Imagen en la misma línea dentro de la columna o bajo Copiar; sin desplazamiento horizontal | — |
| Portapapeles falla | `clipboard.writeText` rechaza | `.respaldo` visible bajo la fila (top ≥ fondo de los dos botones), ancho ≤ medida de prosa | — |
| Sin Imagen | texto > `MAX_CARACTERES_IMAGEN` (fixture unitario) | la fila solo trae la isla de Copiar | — |

</intent-contract>

## Code Map

- `src/components/BloqueDeCita.astro:51-56` -- `.bloque { max-width: var(--medida-cita) }`: quitar; `.texto` (l.65-74) recibe el `max-width`; los tramos (l.76-111) ya cambian el `font-size` en `.texto`, así que el `ch` sale de su cuerpo. `figcaption` (l.114) recibe `max-width: var(--medida-prosa)`. Lo usan `[slug].astro` y `CitaDelDia.astro` (portada y 404).
- `src/components/Fuente.astro` (`<style>`, `.fuente`) -- añadir `max-width: var(--medida-prosa)`.
- `src/styles/tokens.css:37-40,94-95,108,112-123` -- `--cita-*` (44/36/28/23), `--medida-cita: 34ch`, `--medida-prosa: 68ch`, `--ancho-pagina: 45rem` (720 px); `.contenedor` l.189-195. Solo lectura.
- `src/pages/cita/[slug].astro:117-127` -- `<CopiarCita/>` + `<ImagenDeCita/>` → envolver en `<FilaDeAcciones>`; actualizar el comentario de la 30.1 nombrando la fila (UX-DR114/UX-DR123).
- `src/islands/CopiarCita.astro:122-144` (marcado), `146-149` (`.isla` 4 ×), `172-175` (`.respaldo`) -- añadir las reglas con contexto de la fila; no tocar marcado ni guion (l.83-118).
- `src/islands/ImagenDeCita.astro:255-310` (raíz `div.isla[data-imagen]`, guion tras ella), `316-318` (`.isla` 2 ×) -- añadir la regla con contexto (`margin-top: 0`, `flex-basis` 100 % / auto ≥ 600).
- `src/components/FilaDeBloque.astro` -- modelo de componente pequeño compartido (cabecera, estilo con tokens).
- `tests/unit/tarjeta-de-obra.test.ts:678-715` (`hijosDelArticle`), `774-790` («nada se intercala…»), `747-772` (sin Obra), `792-804` (portada), `806+` -- el hijo del `article` pasa a ser la fila: clasificarlo `acciones` y exponer sus hijos (`copiar`, `imagen`). Fixture con `SIN_IMAGEN` (l.471) ya existe.
- `tests/unit/medicion.test.ts:2635-2655` -- «Copiar va justo detrás de su isla»: debe seguir verde sin cambios.
- `tests/unit/tipografia-en-tokens.test.ts` -- guardia de literales: debe seguir verde.
- `tests/e2e/pagina-de-cita.spec.ts:875-934` -- las dos pruebas de distancias de la 30.1 miden `copiar.previousElementSibling` y la caja de la `.isla` de Copiar: con `display: contents` esa caja es 0 × 0 y su hermano anterior es nulo; medir desde la fila (su hermano anterior es `p.fuente`/`figure`) y desde `button.copiar`.
- `tests/e2e/ayuda/corpus.ts:461` -- `citaDeTramo('xl'|'lg'|'md')`; `citaConTarjetaCompleta` (l.228) para la cara con Fuente e Imagen; `citaSinObra` (l.362).
- `tests/e2e/tipografia-calculada.spec.ts` + `-snapshots/tipografia-cita*-{movil,escritorio}.json` -- clave = ruta de clases; regrabar las cinco páginas de Cita con `--update-snapshots`.
- `tests/e2e/accesibilidad.spec.ts:777-830` (`cargarEn320`, `zoom = '2'`), `938-975` (reflujo 26.9) -- patrón para el 200 % y el desbordamiento.
- `AGENTS.md` § «La Tarjeta de Obra (Historia 24.4)» -- donde se describe el orden de la 30.1.

## Tasks & Acceptance

**Execution:**
- `src/components/BloqueDeCita.astro` -- mover el `max-width` a `.texto`, `figcaption` a `--medida-prosa`, comentario con la razón (UX-DR115: el ch del cuerpo de la Cita; con el del contenedor eran ~365 px) -- FR-64.
- `src/components/Fuente.astro` -- `max-width: var(--medida-prosa)` -- AC de la Atribución y la Fuente.
- `src/components/FilaDeAcciones.astro` -- crear: cabecera (UX-DR114/UX-DR123, sin zona porque no hay enlaces, la usará la 28.2), `div.fila-de-acciones` + `<slot />`, estilos de la fila con tokens.
- `src/islands/CopiarCita.astro` -- reglas con contexto: `.isla` `display: contents`; `.respaldo` `order: 1; flex-basis: 100%; margin-top: 0` -- respaldo bajo la fila.
- `src/islands/ImagenDeCita.astro` -- reglas con contexto: `.isla` `margin-top: 0; flex-basis: 100%`, y `flex-basis: auto` desde 600 px.
- `src/pages/cita/[slug].astro` -- importar y usar `FilaDeAcciones` alrededor de las dos islas; comentario.
- `tests/unit/tarjeta-de-obra.test.ts` -- `hijosDelArticle` reconoce la fila; el orden pasa a bloque, (fuente), acciones [copiar, imagen | copiar], compartir, tarjeta…; la fila no lleva `data-zona` ni `data-sin-zona`, solo contiene esas islas con su guion detrás, y cada `.isla` conserva sus atributos de hoy (la de Copiar, `class` y `data-pagefind-ignore`; la de Imagen, además sus `data-*`), sin ninguno añadido por la fila.
- `tests/e2e/pagina-de-cita.spec.ts` -- reescribir las dos pruebas de distancias de la 30.1 (fila a 4 × de lo de arriba, compartir a 3 × de la fila) y añadir un `describe('Historia 30.2 …')`: (a) a 1280 × 800, por tramo xl/lg/md, `max-width` resuelto de `.texto` = 34 × ancho de una sonda «0» (`span` con la fuente heredada y `letter-spacing: 0`) ±1, caja de `.texto` dentro de `article`; anotación «30.2 a 1280 × 800» con el tramo, el cuerpo, el `max-width` y el ancho de la caja; (b) a 360 × 640, por tramo, el `max-width` nuevo y 34 × la sonda «0» en el cuerpo de `.bloque` superan el ancho de la columna; (c) geometría de la fila a 360, 599, 600, 768 y 1280 según la matriz; (d) 200 % a 600 y 768 sin solape ni desbordamiento; (e) portapapeles denegado (`page.addInitScript` que rechaza `writeText`): el respaldo bajo los dos botones; (f) Atribución y Fuente con ancho ≤ 68 × su «0»; (g) orden de tabulación Copiar → Imagen y nombres accesibles sin cambio.
- `tests/e2e/accesibilidad.spec.ts` -- sin desplazamiento horizontal en una Página de Cita (cara completa y una de cada tramo) y en la portada a 320, 600, 768 y 1280 px; el barrido axe existente sigue verde.
- `tests/e2e/tipografia-calculada.spec.ts-snapshots/` -- regrabar `tipografia-cita*-movil.json` y `-escritorio.json`; comprobar que el diff solo reclava Copiar e Imagen bajo `div.fila-de-acciones` con los mismos valores y que portada y 404 no cambian.
- `AGENTS.md` -- en el apartado de la Tarjeta de Obra/30.1: la fila de acciones (`FilaDeAcciones.astro`, sin zona, solo los dos botones, la de la 28.2), que dentro de ella la `.isla` de Copiar es `display: contents` (una prueba mide el botón, no la isla) y que la medida de la Cita se resuelve en el cuerpo de `.texto`.

**Acceptance Criteria:**
- Given la Página de Cita, la portada y el 404 construidos, when se leen sus estilos, then el `max-width: var(--medida-cita)` está en el texto de la Cita y no en `.bloque`, y `figcaption` y `.fuente` llevan `--medida-prosa`.
- Given una Página de Cita a 1280 × 800, when se mide en cada tramo, then el `max-width` del texto es 34 veces el «0» de su familia y cuerpo (±1 px), su caja cabe en la columna de 720 px, y las cifras quedan anotadas en Design Notes.
- Given la Página de Cita a 360 × 640, when se mide en cada tramo, then la medida no ata (ni la nueva ni la de antes), así que la Cita parte sus líneas igual que en la principal.
- Given la Página de Cita, when se recorre con el teclado o un lector, then Copiar va antes que Imagen, con el mismo nombre accesible y las mismas regiones de estado que antes.
- Given el Corpus de prueba con una Cita sin Imagen, when se construye, then su fila lleva solo Copiar y compartir sigue tras la fila.
- Given `tests/unit/medicion.test.ts`, `tipografia-en-tokens.test.ts` y el barrido axe, when corren, then pasan sin zonas, exenciones ni literales nuevos.

## Spec Change Log

## Review Triage Log

### 2026-11-07 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

## Design Notes

**Por qué `display: contents` en la isla de Copiar:** el respaldo vive dentro de su `.isla` porque el guion lo busca con `isla.querySelector('[data-respaldo]')`. Sacarlo cambiaría el guion de toda Página de Cita (y su tope de bytes). Con la isla `display: contents` dentro de la fila, el botón y el respaldo son elementos flexibles de la fila y el respaldo puede ir detrás de Imagen con `order`, sin tocar ni el marcado ni el guion. La región `.solo-para-lectores` es `position: absolute`, así que no ocupa sitio en la fila. Un `div` sin rol con `display: contents` no pierde nada en el árbol de accesibilidad.

**Medidas:** la implementación anota aquí la tabla de la prueba (a): slug, tramo, cuerpo, `max-width` resuelto y ancho de la caja de `.texto` a 1280 × 800 (se espera ~610 px en lg a 36 px y ~745 px de `max-width` en xl a 44 px, con la caja limitada a 720), y el peso de `dist/` antes y después.

**Medidas tomadas (2026-11-07, `tests/e2e/pagina-de-cita.spec.ts`, anotación «30.2 a 1280 × 800»):**

| Cita | Tramo | Cuerpo | `max-width` de `.texto` | Caja de `.texto` | Columna |
|---|---|---|---|---|---|
| `agustin-alvarez-conocer-la-verdad-es-ya-por-cierto` | xl | 44 px | 791,4 px | 720,0 px | 720 px |
| `agustin-alvarez-ahora-empieza-a-haber-quienes-piensen-en` | lg | 36 px | 647,5 px | 647,5 px | 720 px |
| `agustin-alvarez-la-credulidad-natural-basta-para-aceptar-a` | md | 28 px | 503,6 px | 503,6 px | 720 px |

Las tres casan con 34 × el «0» de Source Serif 4 en su cuerpo (±1 px). Las cifras quedan por encima de las estimadas en el spec (~610 en lg, ~745 en xl) porque el «0» de Source Serif mide unos 0,53 em y no los 0,5 de la estimación; no es un valor nuevo, es el mismo token resuelto. En xl la caja la limita la columna de 720 px, sin desbordar. A 360 × 640 la medida no ata en ningún tramo (ni la nueva ni 34 «0» en el cuerpo de `.bloque`), y la caja de `.texto` ocupa la columna entera, como antes.

**Peso (`FECHA_JORNADA=2026-11-07 npm run build`):** juzgado sin lo que rota, 508.745.041 bytes en la base (HEAD 74341bdb78, mismo árbol sin los cambios de `src/`) y 509.970.790 bytes con la historia: +1.225.749 bytes (+1,2 MiB), unos 277 bytes por Página de Cita (el `div` de la fila y las reglas de la fila y de las islas en la hoja en línea). `dist/index.html` +30 bytes (las dos declaraciones `max-width` del Bloque). Sin aviso: quedan 276.461.210 bytes (263,7 MiB) hasta el aviso de 750 MiB.

**Instantáneas de tipografía:** regrabadas las ocho de Página de Cita (cara y tramos xl, lg, md, móvil y escritorio). Cotejadas por programa: quitando el segmento ` > div.fila-de-acciones` de las claves nuevas, cada fichero es idéntico al de HEAD (mismas claves, mismos pares peso | interlineado). Portada y 404 sin cambio. La regrabación tocó además `tipografia-buscar-con-resultados-escritorio.json` (una clave `div.recuento > p.estado` de más, ajena a la historia, por la carga de la máquina): se descartó, y la pasada sin `--update-snapshots` sale verde con el fichero de HEAD.

**Plazo del `webServer`:** con otras ramas construyendo a la vez (carga ~30), `npm run build` pasó de los 180 s del `webServer` en tres intentos. Las pasadas de tipografía se corrieron con una copia de la configuración en el directorio temporal de la sesión que solo sube ese plazo; el árbol no cambia.

## Verification

**Commands:**
- `npx vitest run tests/unit/tarjeta-de-obra.test.ts` -- verde.
- `npx vitest run tests/unit/medicion.test.ts tests/unit/tipografia-en-tokens.test.ts` -- verde.
- `npx astro check` -- 0 errores.
- `FECHA_JORNADA=2026-11-07 npm run build` (detached con `correr.sh`) -- termina sin aviso de peso; anotar las cifras.
- `npx playwright test tests/e2e/pagina-de-cita.spec.ts tests/e2e/accesibilidad.spec.ts tests/e2e/copiar.spec.ts tests/e2e/imagen.spec.ts --project=movil --project=escritorio` -- verde; copiar las anotaciones a Design Notes.
- `npx playwright test tests/e2e/tipografia-calculada.spec.ts --update-snapshots` y después sin la bandera -- verde; `git diff --stat` de los JSON limitado a las páginas de Cita.

**Manual checks:**
- `git diff` de los JSON de tipografía: solo claves bajo `div.fila-de-acciones`, mismos pares de valores.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen:** la medida de 34ch pasa de `.bloque` a `.texto` de `BloqueDeCita.astro`, así que se resuelve en el cuerpo del tramo (xl 791 px —la caja la limita la columna de 720—, lg 648, md 504 a 1280 × 800; en móvil no ata). `figcaption` y `.fuente` llevan `--medida-prosa`. Copiar e Imagen van en `FilaDeAcciones.astro` (sin zona ni guion): apilados por debajo de 600 px, en fila a 2 × desde 600 px; el respaldo de Copiar baja bajo la fila por `display: contents` y `order: 1`, sin tocar el marcado ni los guiones de las islas. «Compartir en» sigue fuera, a 3 ×.

**Ficheros:**
- `src/components/BloqueDeCita.astro` — `max-width: var(--medida-cita)` en `.texto`, fuera de `.bloque`; `figcaption` a `--medida-prosa`.
- `src/components/Fuente.astro` — `.fuente` a `--medida-prosa`.
- `src/components/FilaDeAcciones.astro` — nuevo: `div.fila-de-acciones` con `<slot />`, flex con tokens.
- `src/islands/CopiarCita.astro` — reglas con contexto de la fila: isla `display: contents`, respaldo `order: 1; flex-basis: 100%; margin-top: 0`.
- `src/islands/ImagenDeCita.astro` — reglas con contexto: `margin-top: 0`, `flex-basis` 100 % y `auto` desde 600 px.
- `src/pages/cita/[slug].astro` — la fila envuelve Copiar e Imagen; comentario de la 30.1 al día.
- `tests/unit/tarjeta-de-obra.test.ts` — la fila como hijo del `article` (`acciones`), su contenido y atributos, sus reglas y la medida.
- `tests/e2e/pagina-de-cita.spec.ts` — las dos pruebas de distancias de la 30.1 miden la fila y los botones; `describe` de la 30.2 (medida por tramo a 1280 × 800 y 360 × 640, geometría a 360/599/600/768/1280, 200 %, respaldo, prosa, tabulación).
- `tests/e2e/accesibilidad.spec.ts` — sin desplazamiento horizontal a 320/600/768/1280 en portada, cara completa y un tramo de cada.
- `tests/e2e/tipografia-calculada.spec.ts-snapshots/tipografia-cita*.json` — reclave bajo `div.fila-de-acciones`, mismos valores.
- `AGENTS.md` — la Fila de acciones y la medida en el texto, en el apartado de la Tarjeta de Obra.

**Revisión:** las capas externas no traen hallazgos en esta pasada: 0 parches, 0 diferidos, 0 rechazados. Recomendación de segunda revisión: `false` (0 parches; puntuación 0).

**Verificación:** `npx vitest run tests/unit/tarjeta-de-obra.test.ts` (36 verdes); `tests/unit/medicion.test.ts` y `tipografia-en-tokens.test.ts` (695 verdes); `npx astro check` (0 errores); `FECHA_JORNADA=2026-11-07 npm run build` (EXIT 0, sin aviso de peso; +1.225.749 bytes juzgados); `npx playwright test tests/e2e/pagina-de-cita.spec.ts tests/e2e/accesibilidad.spec.ts tests/e2e/copiar.spec.ts tests/e2e/imagen.spec.ts --project=movil --project=escritorio` (469 verdes, 27 omitidas por proyecto); `tests/e2e/tipografia-calculada.spec.ts` con `--update-snapshots` y después sin ella (28 verdes), con el diff cotejado por programa; `npm test` (155 ficheros, 7187 verdes).

**Riesgos:** la medida de la Cita en verso más larga queda para cuando la Épica 29 llegue a la rama (diferido). Las cifras de xl y lg superan las estimadas en el spec por el ancho real del «0» de Source Serif; el AC de la épica sigue con la cifra de 36 px pendiente de Héctor (diferido). La suite e2e completa no se corrió (acto de Héctor).
