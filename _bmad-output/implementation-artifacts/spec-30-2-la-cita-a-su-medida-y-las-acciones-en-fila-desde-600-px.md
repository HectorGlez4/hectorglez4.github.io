---
title: 'Historia 30.2 — La Cita a su medida y las acciones en fila desde 600 px'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: '74341bdb78670af7cd9ed61986e46418f9f65c0a'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-30-context.md'
warnings: [oversized]
deferred:
  - summary: 'Al fundir la Épica 29 en la rama: repetir a 1280 × 800 la medida de 34ch con la Cita en verso más larga (sus saltos de `versosDe`) y comprobar que la fila de acciones no cambia con ella; anotarlo en este spec.'
    evidence: 'La Épica 29 (src/lib/verso.ts) no está en v9/epica-30; ninguna pieza de la 30.2 parte ni une versos (AD-29). Hoy se mide con `citaDeTramo` (xl, lg, md).'
    severity: low
  - summary: 'Resuelto por Héctor (2026-11-08): la medida queda como está construida. Antes, pendiente de Héctor (bmad-create-epics-and-stories / bmad-ux): el AC dice «una Cita de tramo xl a 36 px, unos 610 px», pero desde 600 px el tramo xl se compone a `--cita-xl` (44 px) y 36 px es el tramo lg; en el ch de la Cita, xl resuelve unos 745 px, más que la columna de 720, que es la que lo limita. Lo construido sigue el contrato literal (34ch en el cuerpo de su tramo, sin valor nuevo, sin desbordar la columna); la cifra de cada tramo queda anotada.'
    evidence: 'src/components/BloqueDeCita.astro (media ≥600: xl→--cita-xl); src/styles/tokens.css:37-38; DESIGN.md § Layout «Medida de la Cita» («a 36px son unos 610px»).'
    severity: low
  - summary: 'Aceptado por Héctor (2026-11-08): la regrabación de las instantáneas de móvil (solo claves, mismos valores). Antes, pendiente de Héctor (bmad-create-epics-and-stories): el AC pide que las instantáneas de móvil de tests/e2e/tipografia-calculada.spec.ts no cambien, pero su clave es la ruta de clases desde <body>, y el contenedor de la fila (pedido por el mismo AC) añade un segmento a la ruta de Copiar e Imagen en móvil y escritorio. Se regraban las de las páginas de Cita con los mismos valores (peso | interlineado) y solo esa reclave; las claves de la Cita no cambian.'
    evidence: 'tests/e2e/tipografia-calculada.spec.ts:100-140 (ruta de clases); epics.md Story 30.2, tercer y cuarto Given.'
    severity: low
  - summary: >-
      Resuelto por decisión de Héctor (2026-11-08): la medida queda como está construida, 34ch en el cuerpo de su tramo, y la columna de 720 px limita xl; la cifra del AC («xl a 36 px, unos 610 px») mezcla tramos y no pide cambio. Era la pregunta de qué medida quería el AC, incoherente con tokens.css (xl se compone a 44 px desde 600 px; 36 px es lg).
    evidence: |-
      Revisión 1 (blind-hunter, intent-alignment, ac-auditor). Medido a 1280 × 800 con la sonda «0» de Source Serif 4: xl 44 px → max-width 791,4 px (la caja la limita la columna, 720 px); lg 36 px → 647,5 px; md 28 px → 503,6 px. Ningún tramo da ~610 px: con el «0» real (~0,53 em) 610 px corresponden a ~34 px de cuerpo. Si se quiere ~610 px en algún tramo, cambia la medida o el cuerpo, y eso es de Héctor (DESIGN.md § Layout «Medida de la Cita»).
    location: >-
      src/components/BloqueDeCita.astro (.texto); src/styles/tokens.css (--cita-*, --medida-cita)
    severity: medium
  - summary: >-
      Aceptado por Héctor (2026-11-08): las instantáneas de móvil de tipografia-calculada se regrabaron en esta historia aunque el AC dice que «no cambian»; cambian solo las claves (la ruta de clases gana « > div.fila-de-acciones» en Copiar e Imagen), y ningún valor, como consecuencia del contenedor que el mismo AC pide.
    evidence: |-
      Revisión 1 (blind-hunter, intent-alignment, ac-auditor). Cotejado por programa: quitando ese segmento de las claves nuevas, cada tipografia-cita*-movil.json es idéntico al de 74341bdb78 (mismas claves, mismos pares peso | interlineado); la Cita, la portada y el 404 no cambian. Si Héctor prefiere que la clave no dependa del contenedor o que el AC lo diga, es bmad-create-epics-and-stories; la regrabación no se deshace sin quitar la fila.
    location: >-
      tests/e2e/tipografia-calculada.spec.ts-snapshots/tipografia-cita*-movil.json
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

### 2026-11-07 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 13: (high 0, medium 5, low 8)
- defer: 2: (high 0, medium 1, low 1)
- reject: 9: (high 0, medium 0, low 9)
- addressed_findings:
  - `[medium]` `[patch]` La medida en el texto solo se leía del fuente en la portada y el 404 (blind-hunter, intent-alignment, ac-auditor): pruebas nuevas de `pagina-de-cita.spec.ts` sobre `/` y un 404 construidos a 1280 × 800 (`max-width` de `.texto` = 34 «0», `.bloque` sin él, `figcaption` = 68 «0»).
  - `[medium]` `[patch]` El respaldo no se medía donde los botones van en fila (blind-hunter, edge-case-hunter, intent-alignment, ac-auditor): prueba a 600 y 768 px con el portapapeles rechazado, bajo los dos botones, en la medida de prosa y sin desplazamiento.
  - `[medium]` `[patch]` El barrido WCAG 2.2 AA no corría a 320/600/768/1280 (intent-alignment): la prueba de reflujo de `accesibilidad.spec.ts` pasa axe a cada ancho, en la portada y en cada Página de Cita que mide.
  - `[medium]` `[patch]` La prueba de reflujo perdía en silencio una ruta sin Cita y fallaba en falso las de tramo sin cara completa (blind-hunter, edge-case-hunter): cada cara va con su nombre y su motivo; la que falta falla diciéndolo, y la que el Corpus de hoy no puede traer se salta diciéndolo.
  - `[medium]` `[patch]` «Compartir en… dentro de la medida de prosa» no se mostraba (ac-auditor): prueba que el alcance de sus controles visibles no pasa de 68 «0» a 1280 × 800; verde sin tocar `CompartirEnlace.astro`.
  - `[low]` `[patch]` El tramo sm y la Cita sin Imagen no se medían en el navegador (edge-case-hunter, intent-alignment): entran en las pruebas de medida, de fila y de reflujo con `citaSinImagen` (`tests/e2e/ayuda/corpus.ts`); el Corpus real no trae hoy ninguna Cita de más de 240 caracteres, así que se saltan con ese motivo y las cubre el fixture `SIN_IMAGEN` de la unitaria.
  - `[low]` `[patch]` La prueba de tabulación daba por Imagen cualquier foco de la fila (blind-hunter, edge-case-hunter): lo que no es `button.copiar` ni el botón de Imagen cuenta como «otro» y la hace fallar.
  - `[low]` `[patch]` La prueba del 200 % casi nunca podía fallar (blind-hunter, intent-alignment): a 600 px Imagen tiene que bajar bajo Copiar; a 768, en línea o debajo, anotado.
  - `[low]` `[patch]` La sonda «0» del respaldo no anulaba el espaciado (blind-hunter): `letter-spacing: 0`, como las demás.
  - `[low]` `[patch]` La unitaria tomaba las islas por posición y por `class === 'isla'` (blind-hunter): las toma por lo que son y por la lista de clases, y exige cuántas hay.
  - `[low]` `[patch]` `hijosDelArticle` decía «en la Fila de acciones» de lo que recoge para todos, y `siguiente?.copiar` no decía que es la fila (blind-hunter): comentario al día y la fila exigida por su clase.
  - `[low]` `[patch]` El párrafo de la fila partía el apartado de la Tarjeta de Obra en `AGENTS.md` (blind-hunter): va en su propio apartado, «La Fila de acciones y la medida de la Cita (Historia 30.2)», antes de «Al pie de la Página de Cita».
  - `[low]` `[patch]` Con el respaldo a la vista el foco va Copiar → campo → Imagen, aunque el campo se pinte bajo la fila (blind-hunter): es el orden del marcado, que la historia no puede cambiar, y el guion enfoca el campo al revelarlo; queda dicho en `AGENTS.md` y en Design Notes.

## Design Notes

**Orden del foco con el respaldo (revisión 1):** el respaldo vive dentro de la isla de Copiar, así que con él a la vista el Tabulador va de Copiar al campo y de ahí a Imagen, aunque el campo se pinte bajo la fila. Es el orden del marcado —que la historia no cambia— y conserva el sentido: el campo es la respuesta a Copiar, y el guion lo enfoca y lo selecciona al revelarlo. Ponerlo detrás de Imagen en el marcado exigiría cambiar el guion de Copiar en toda Página de Cita.

**Tramo sm y Cita sin Imagen en el navegador (revisión 1):** el Corpus real no trae hoy ninguna Cita de más de 240 caracteres, así que las pruebas e2e de esos dos casos se saltan con ese motivo y empiezan a correr solas el día que llegue una; hasta entonces los cubren la regla única de `.texto` y el fixture `SIN_IMAGEN` de `tests/unit/tarjeta-de-obra.test.ts`.

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

**Resumen:** la medida de 34ch pasa de `.bloque` a `.texto` de `BloqueDeCita.astro`, así que se resuelve en el cuerpo del tramo (xl 791 px —la caja la limita la columna de 720—, lg 648, md 504 a 1280 × 800; en móvil no ata). `figcaption` y `.fuente` llevan `--medida-prosa`. Copiar e Imagen van en `FilaDeAcciones.astro` (sin zona ni guion): apilados por debajo de 600 px, en fila a 2 × desde 600 px; el respaldo de Copiar baja bajo la fila por `display: contents` y `order: 1`, sin tocar el marcado ni los guiones de las islas. «Compartir en» sigue fuera, a 3 ×. La revisión 1 endurece las pruebas: portada y 404 construidos, respaldo a 600/768, axe a 320/600/768/1280, tramo sm y Cita sin Imagen (se saltan diciéndolo mientras el Corpus no las traiga), tabulación estricta, 200 % a 600 px exigiendo que Imagen baje, y Compartir en la medida de prosa.

**Ficheros:**
- `src/components/BloqueDeCita.astro` — `max-width: var(--medida-cita)` en `.texto`, fuera de `.bloque`; `figcaption` a `--medida-prosa`.
- `src/components/Fuente.astro` — `.fuente` a `--medida-prosa`.
- `src/components/FilaDeAcciones.astro` — nuevo: `div.fila-de-acciones` con `<slot />`, flex con tokens.
- `src/islands/CopiarCita.astro` — reglas con contexto de la fila: isla `display: contents`, respaldo `order: 1; flex-basis: 100%; margin-top: 0`.
- `src/islands/ImagenDeCita.astro` — reglas con contexto: `margin-top: 0`, `flex-basis` 100 % y `auto` desde 600 px.
- `src/pages/cita/[slug].astro` — la fila envuelve Copiar e Imagen; comentario de la 30.1 al día.
- `tests/unit/tarjeta-de-obra.test.ts` — la fila como hijo del `article` (`acciones`), su contenido y atributos (islas por lo que son, no por posición), sus reglas y la medida.
- `tests/e2e/pagina-de-cita.spec.ts` — distancias de la 30.1 desde la fila y los botones; `describe` de la 30.2 (medida por tramo xl/lg/md/sm, portada y 404, geometría, 200 %, respaldo a cada ancho, Cita sin Imagen, Compartir y Atribución en la medida de prosa, tabulación).
- `tests/e2e/accesibilidad.spec.ts` — sin desplazamiento horizontal y barrido axe a 320/600/768/1280 en portada, cara completa, cada tramo y la Cita sin Imagen, cada cara con su nombre y su motivo.
- `tests/e2e/ayuda/corpus.ts` — `citaSinImagen`.
- `tests/e2e/tipografia-calculada.spec.ts-snapshots/tipografia-cita*.json` — reclave bajo `div.fila-de-acciones`, mismos valores (aceptado por Héctor, 2026-11-08).
- `AGENTS.md` — apartado propio «La Fila de acciones y la medida de la Cita (Historia 30.2)», con el orden del foco con el respaldo.

**Revisión 1:** 13 parches (medium 5, low 8), 2 diferidos (los dos, resueltos por decisión de Héctor del 2026-11-08: la medida queda como está construida —34ch en el cuerpo del tramo; la columna de 720 px limita xl; la cifra «xl a 36 px, unos 610 px» del AC mezcla tramos— y la regrabación de las instantáneas de móvil, solo claves, queda aceptada), 9 rechazados. Recomendación de segunda revisión: `true` (puntuación 3 × 5 + 1 × 8 = 23; ningún parche high).

**Verificación:** sobre el mismo árbol de código: `npx vitest run tests/unit/tarjeta-de-obra.test.ts` (36 verdes, repetida el 2026-11-08); `npx astro check` (0 errores, repetida); `npx playwright test tests/e2e/pagina-de-cita.spec.ts tests/e2e/accesibilidad.spec.ts --project=movil --project=escritorio` (475 verdes; las 6 rojas eran las caras sm y sin Imagen, que el Corpus no trae, y pasaron a saltarse con su motivo; la repetición de las pruebas de la 30.2, 28 verdes y 36 omitidas); `npm test` (155 ficheros, 7187 verdes, EXIT 0). Tras eso solo cambió este spec.

**Riesgos:** la medida de la Cita en verso más larga queda para cuando la Épica 29 llegue a la rama (diferido). El tramo sm y la Cita sin Imagen no se ejercen en el navegador hasta que el Corpus traiga una Cita de más de 240 caracteres; los cubre el fixture `SIN_IMAGEN`. La suite e2e completa no se corrió.
