---
title: '22.10 — Lo construido cumple las espinas de UX'
type: 'bugfix'
created: '2026-10-10'
status: 'done'
baseline_revision: 'ed17a77eb666bb90f40781236b6c033da8a10778'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/EXPERIENCE.md'
  - '{project-root}/AGENTS.md'
warnings: ['multiple-goals', 'oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** `EXPERIENCE.md § Defectos anotados` (l.345-357) lista nueve defectos de lo ya publicado; la 22.5 corrigió los dos de la Atribución (6 y 9). Quedan siete, más UX-DR52 fuera de la Atribución y la Cabecera de Obra: un sitio que excluye a quien navega con teclado, lector de pantalla o el pulgar en superficies que ya existen.

**Approach:** Corregir los siete en el código con su prueba, y aplicar la regla de subrayado de UX-DR52 a los enlaces en línea de texto que aún solo se subrayan al pasar el cursor. Vaciar la sección «Defectos anotados» es de una pasada de `bmad-ux` y no se hace aquí.

## Boundaries & Constraints

**Always:**
- **1. Foco del campo de búsqueda** (`/buscar/` y 404): nada suprime el anillo global de `src/styles/tokens.css` (`:focus-visible`, 2px siena, 2px de separación). Se quitan los `outline: none` de `src/pages/buscar.astro` (input `:focus` y `:focus-visible`) y de `src/pages/404.astro`; el filete inferior de 2px siena del campo puede quedarse. Se corrige el comentario falso de `tokens.css` («no existe una sola regla `outline: none`») solo si sigue siendo falso tras el cambio.
- **2. Paginación** (`src/components/Paginacion.astro`): los números quedan separados al menos `var(--unidad)` (8px) entre zonas de toque, en horizontal y entre filas, a 360 px; el selector de los números no alcanza al `<span>` oculto de dentro del enlace.
- **3. Diálogo de Imagen** (`src/islands/ImagenDeCita.astro`): su nombre accesible sigue al rótulo de su acción: «Compartir…» donde el navegador comparte ficheros (`compartible`), «Descargar…» donde descarga.
- **4. Compartir la cita** (`src/islands/CompartirEnlace.astro`, `src/lib/compartir.ts`): cada destino dice «Compartir en {destino}» y lleva «(se abre en una pestaña nueva)» oculto dentro de su nombre accesible, con el patrón de `src/components/Sostener.astro`; mantiene `target="_blank"`.
- **5. Generador que no carga**: si el `import('/islas/imagen.js')` falla, el Diálogo lo dice en una frase en la previsualización y ofrece copiar el texto de la Cita (`EXPERIENCE.md § State Patterns`, l.219); el fallo se anuncia por la región de estado; no queda promesa sin tratar; un clic posterior reintenta.
- **6. Pie** (`src/components/DondeSeguirnos.astro`): las cuentas sociales abren en la misma pestaña (sin `target`; `rel="me"` se conserva). Pestaña nueva solo para donar, compartir y comprar.
- **7. Mensajes de estado** (WCAG 4.1.3): una región `role="status"` presente desde la carga, vacía y no oculta, anuncia «Copiado.» (`src/islands/CopiarCita.astro`), el recuento y la búsqueda sin resultados de `/buscar/`, la imagen lista y el fallo del generador. Cada superficie con esas confirmaciones la lleva; el 404 no carga guiones y no la necesita.
- **8. Subrayado (UX-DR52)**: todo enlace en una línea de texto se subraya siempre, tinta o siena; los enlaces de bloque no (Tarjeta, Citas hermanas, chips, resultados, Paginación, Lista de Obras, marca). Hoy solo subrayan al pasar el cursor el «Buscar» de la cabecera (`src/components/Armazon.astro`) y los enlaces del pie (`DondeSeguirnos.astro`): se juzga cada uno contra la lista de bloques de `EXPERIENCE.md:267`; lo que sea línea de texto se subraya siempre.
- Tokens de `DESIGN.md`, sin literales de color o tipografía. Las pruebas e2e afectadas se ponen al día (p. ej. `tests/e2e/copiar.spec.ts` hoy exige cero `role="status"`).

**Block If:** Nada exige a Héctor en el código. Vaciar «Defectos anotados» exige una pasada de `bmad-ux`: no se edita a mano (AGENTS.md); se deja anotado como pendiente.

**Never:** No tocar la Atribución ni la Cabecera de Obra (22.5). No editar `EXPERIENCE.md` ni nada de `planning-artifacts/`. No añadir JavaScript al 404. No suprimir ningún anillo de foco.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Foco por teclado en el campo | Tab hasta el campo de `/buscar/` y del 404 | `outline` 2px siena con separación | — |
| Paginación a 360 px | Página de Autor con muchas páginas | distancia ≥ 8px entre cajas de 44px vecinas | — |
| Diálogo, navegador que comparte | `navigator.canShare({files})` cierto | nombre accesible «Compartir…» | — |
| Diálogo, navegador que no comparte | sin `canShare` | nombre «Descargar…» | — |
| Destino de compartir | lista sin `navigator.share` | nombre «Compartir en WhatsApp (se abre en una pestaña nueva)» | — |
| Generador caído | `/islas/imagen.js` aborta | frase de fallo + copiar el texto; anuncio en `role="status"` | sin promesa rechazada sin tratar |
| Cuenta del pie | clic | misma pestaña | — |
| Copiar | clic en Copiar | «Copiado.» anunciado por `role="status"` | respaldo del `textarea` intacto |
| Buscar | consulta con y sin resultados | recuento y «sin resultados» anunciados | — |

</intent-contract>

## Code Map

- `src/styles/tokens.css:121-127` (anillo global; comentario falso l.121), `:159` (`a` global), `:174-178` (`.enlace-en-tinta`).
- `src/pages/buscar.astro:316-326` (`outline: none` en `input:focus`/`:focus-visible`), `:64` (`p.estado[data-estado] hidden`, l.178/187/188/244), `[data-salida]`.
- `src/pages/404.astro:148-152` (`outline: none`); sin guiones (`tests/e2e/pagina-404.spec.ts:89`).
- `src/components/Paginacion.astro:~119-126` (`.numeros { gap: calc(var(--unidad) * 0.5) }`), `.numeros a, .numeros span` alcanza el `span.oculto`.
- `src/islands/ImagenDeCita.astro:~83` (`aria-label` fijo «Descargar la cita como imagen»), guion en línea: `cargar()` sin try/catch, `compartible`, `[data-abrir]`, `[data-descargar]`, `<canvas data-lienzo>`, `TEXTO_PARA_COPIAR` por `define:vars`.
- `src/islands/CompartirEnlace.astro:~45-58`, `src/lib/compartir.ts:44+` (`DESTINOS`).
- `src/components/DondeSeguirnos.astro:36` (`target="_blank"`), `:68-79` (subrayado solo en `:hover`); `src/components/Armazon.astro:244-254` («Buscar»).
- `src/islands/CopiarCita.astro:82-86` («Copiado.»).
- Patrón de pestaña nueva: `src/components/Sostener.astro:174-176`.
- Pruebas: `tests/e2e/accesibilidad.spec.ts:180-193` (la prueba de foco usa `getComputedStyle(n, ':focus-visible')`, que no detecta nada: reescribirla enfocando con teclado como `tests/e2e/ingreso-accesible.spec.ts:~420-440`), `:282-325` (zonas de toque sin medir los 8px), `tests/e2e/copiar.spec.ts:56-71` (exige 0 `role="status"`: cambia), `tests/e2e/imagen.spec.ts`, `tests/e2e/compartir-imagen.spec.ts`, `tests/e2e/compartir-enlace.spec.ts:212`, `tests/e2e/busqueda.spec.ts`, `tests/unit/compartir.test.ts`.

## Tasks & Acceptance

**Execution:**
- Cada defecto 1-8 en su fichero, con su prueba (unitaria sobre `dist/` donde baste el marcado o el CSS; e2e donde haga falta el navegador: foco real, medidas a 360 px, fallo del generador con `page.route(...).abort()`, anuncios de estado).
- `tests/e2e/accesibilidad.spec.ts` -- la prueba de foco deja de ser vacía; la de zonas de toque mide los 8px.
- `AGENTS.md` -- una línea: la región `role="status"` y la regla de pestaña nueva.

**Acceptance Criteria:**
- Given `npx vitest run` de los ficheros tocados, `npx astro check` y `npm run build`, when corren, then pasan.
- Given `npx playwright test tests/e2e/accesibilidad.spec.ts tests/e2e/copiar.spec.ts tests/e2e/imagen.spec.ts tests/e2e/compartir-enlace.spec.ts tests/e2e/compartir-imagen.spec.ts tests/e2e/busqueda.spec.ts tests/e2e/pagina-404.spec.ts`, when corre, then pasa.
- Given `grep -rn "outline: none" src`, when se ejecuta, then no hay ninguna regla que suprima el anillo.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npm run build` -- expected: termina.
- `npx playwright test <los e2e de arriba> --project=escritorio` y `--project=movil` donde aplique -- expected: verde.

## Auto Run Result

**Resumen:** los siete defectos de `EXPERIENCE.md § Defectos anotados` que no eran de la 22.5 quedan corregidos, con UX-DR52 en el resto del sitio:
1. Ya no hay ningún `outline: none` en el código, y el campo de búsqueda conserva el anillo global.
2. La Paginación separa los números 8 px, también entre filas.
3. El Diálogo de Imagen se nombra por su botón: «Compartir…» o «Descargar…».
4. Cada destino dice «Compartir en {destino}» y avisa de la pestaña nueva, con un único dueño del aviso (`src/lib/accesibilidad.ts`).
5. Si el generador no carga, el diálogo lo dice, ofrece copiar el texto y reintenta.
6. Las cuentas del pie abren en la misma pestaña.
7. Hay regiones `role="status"` que vuelven a anunciar el mismo texto.
8. «Buscar» y los enlaces del pie se subrayan siempre.

**Ficheros:** `src/styles/tokens.css`, `src/pages/buscar.astro`, `src/pages/404.astro`, `src/components/Paginacion.astro`, `src/islands/ImagenDeCita.astro`, `src/islands/CompartirEnlace.astro`, `src/islands/CopiarCita.astro`, `src/lib/compartir.ts`, `src/lib/accesibilidad.ts` (nuevo), `src/components/DondeSeguirnos.astro`, `src/components/Armazon.astro`, `src/components/Sostener.astro`, `src/components/EdicionesEnVenta.astro`, `tests/unit/espinas-de-ux.test.ts` (nuevo), e2e (`accesibilidad`, `copiar`, `imagen`, `compartir-imagen`, `compartir-enlace`, `busqueda`) y `AGENTS.md`.

**Revisión:**
- 14 patches aplicados: 5 medios y 9 bajos.
- Nada deferido.
- 6 hallazgos rechazados.

**Revisión de seguimiento:** `true`. Se parchearon 5 hallazgos medios y 9 bajos, y la puntuación es 3 × 5 + 9 = 24, por encima de 5.

**Verificación:**
- `npx astro check`: 0 errores.
- `npm run build`: termina.
- Vitest: 954 pruebas en 21 ficheros según el implementador, y 103/103 en mi repaso de cuatro ficheros.
- Playwright en escritorio y móvil: 344 pasan y 26 se omiten (omisiones previas, en specs que no se tocaron).
- El peor guion en línea pesa 5934 bytes, por debajo del tope de 6656.
- `grep` de `outline: none|0` en `src` y `public/islas`: 0 coincidencias.

**Pendiente y riesgos:**
- Vaciar «Defectos anotados» requiere una pasada de `bmad-ux` y no se ha editado a mano.
- Durante 2 s el rótulo visible del botón («Copiado.») no coincide con su nombre accesible fijo («Copiar la cita»). Se eligió así para no anunciar dos veces; el razonamiento está en el componente.
- Se quitó la envoltura interior de las islas para recuperar bytes de guion, y con ella sus guardas de `return`.
- Ningún anuncio se ha comprobado con un lector de pantalla real.

