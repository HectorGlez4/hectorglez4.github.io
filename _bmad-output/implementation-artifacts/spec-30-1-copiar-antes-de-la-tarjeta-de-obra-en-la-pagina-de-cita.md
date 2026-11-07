---
title: 'Historia 30.1 — Copiar antes de la Tarjeta de Obra en la Página de Cita'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: '7a9de4a9254aedeb726328ecbd7e49bb9c195656'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-30-context.md'
warnings: [oversized]
deferred:
  - summary: 'Al fundir la Épica 29 en la rama: repetir la medida de Copiar a 360 × 640 con la Cita en verso más larga restituida por la Épica 29 y anotarla en este spec.'
    evidence: 'epics.md Story 30.1 («la Cita en verso más larga restituida por la Épica 29»); la Épica 29 (src/lib/verso.ts) no está en v9/epica-30 al abrir la rama. Hoy se mide con la Cita con Obra de texto más largo del Corpus.'
    severity: medium
  - summary: 'El primer Given de la historia presupone la Épica 29 en la principal; no lo está. La historia se construye sin ella por orden del orquestador (ninguna pieza de la 30.1 usa verso.ts).'
    evidence: 'epics.md Story 30.1, primer Given; epic-30-context.md § Cross-Story Dependencies.'
    severity: low
---

<intent-contract>

## Intent

**Problem:** En la Página de Cita la Tarjeta de Obra (24.4/24.5) va entre la Línea de la Fuente y Copiar; a 360 × 640 Copiar cae entre 661 y 756 px, fuera de la primera pantalla, y quien viene a llevarse la Cita tiene que desplazarse por delante de la Obra (SM-C5).

**Approach:** Reordenar el `<article>` de `src/pages/cita/[slug].astro` a Bloque de Cita → Fuente → Copiar → Imagen → Compartir → Tarjeta de Obra → Rutas de salida → `FiltrosDeLaCita`; ajustar la distancia de compartir a 3 × unidad; sustituir las pruebas de orden de la 24.4/24.5; y declarar el corte de serie nuevo (constante sin valor) que parte solo la continuación de la Página de Cita (SM-4) y SM-C5, con la palanca nueva de SM-C5 en el informe.

## Boundaries & Constraints

**Always:**
- Al abrir la rama la principal tiene: `CopiarCita`, `ImagenDeCita` (solo si `tramo.admiteImagen`), `CompartirEnlace` (el bloque de compartir; el «Compartir en» de la 25.1 **no** ha llegado) y `TarjetaDeObra` con «Siguiente». La Épica 25 y la 28 no están; la portada no lleva acciones. Lo que llegue después nace en el orden nuevo (la que se fusione después integra a la otra).
- La Tarjeta conserva su uso exacto `<TarjetaDeObra cita={cita} autor={autor} nivel={2} siguiente={siguiente} />`, su zona, filas y marcado; solo cambia de sitio. Sin Obra no pinta nada y las Rutas siguen a compartir.
- Distancias UX-DR114 con tokens: Copiar `margin-top: calc(var(--unidad) * 4)` (ya), Imagen 2 × (ya), `CompartirEnlace .isla` pasa de 2 × a `calc(var(--unidad) * 3)`. `CompartirEnlace` solo lo usa la Página de Cita. Ningún literal.
- Zonas sin cambios: ninguna zona ni exención nueva; `COLOCACION` de `tests/unit/medicion.test.ts` no suma ni quita filas.
- Corte de serie: `DESPLIEGUE_DE_CITAR_Y_LLEVARSE: string | undefined = undefined` en `src/lib/umbrales.ts`, con comentario (jornada UTC en que termina «Desplegar» de la Épica 30; la pone Héctor en un commit aparte, como la 23.11). Nueva entrada en `CORTES_DE_SERIE_DECLARADOS` con `que: 'el orden nuevo de la Página de Cita: las acciones antes de la Tarjeta de Obra, con “Cómo citar” e “Inserta esta cita” detrás'` y sin fecha literal.
- `SerieDeMedicion` se amplía en lo mínimo con **un** valor nuevo, `'continuacion-de-cita'` (decisión de esta historia: partir `lectura` partiría todas las tasas de lectura de todas las superficies). La entrada nueva nombra solo esa serie. Los dos cortes declarados y sus `series` no se tocan.
- Lo que parte la serie nueva, y nada más: la continuación de la Página de Cita (SM-4) y su complemento SM-3 —es el mismo número—, y el juicio SM-C5 (sus dos tasas y su línea del bloque «La Página de Cita»). Se leen en la intersección del tramo vigente de `lectura` y del de `continuacion-de-cita`. SM-5, SM-7, SM-C3, la portada, la Obra, los Directorios y la búsqueda siguen en sus tramos de hoy.
- SM-C5 en `juiciosPorVentanas`: con la constante en `undefined`, juzga como hoy (llegada `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS`) y su cabecera de ventanas dice que la llegada de `DESPLIEGUE_DE_CITAR_Y_LLEVARSE` no ha ocurrido y que la tomará de esa constante de `src/lib/umbrales.ts`. Con valor (y ya pasada), ninguna ventana cruza la jornada del corte: su línea base empieza la primera jornada UTC completa tras la llegada y las ventanas se juzgan frente a ella. `NOMBRE_DE_SERIE` y el bloque «Cortes de serie» del informe cubren la serie nueva.
- Palanca: cuando una ventana de SM-C5 sale `salta`, el informe añade «Palanca de SM-C5: quitar de la Página de Cita los tres desplegables o bajarlos tras las Rutas de salida; lo decide Héctor.» (declarada en el juicio, no en el texto del informe a mano).
- Ninguna prueba fija el valor de la constante: las de `linea-base.test.ts` pasan el corte por `opciones.cortes`/`juicios`, con jornada y sin ella.
- Comentarios: el de la página (líneas 117-123) y la cabecera de `TarjetaDeObra.astro` (líneas 5-8) se reescriben con la razón nueva (a 360 × 640 Copiar caía entre 661 y 756 px; la Tarjeta va tras compartir, UX-DR113/UX-DR122).

**Block If:**
- El paso del peso de `npm run build` avisa (entre `AVISO_DE_PESO_DE_DIST` y `TOPE_DE_PESO_DE_DIST`) o se para: lo decide Héctor; no se tocan sus umbrales.
- El barrido de accesibilidad falla en la Página de Cita por el orden nuevo de forma que exija una decisión de UX.

**Never:**
- Tocar la portada, `CitaDelDia.astro`, `BloqueDeCita.astro` ni el 404 (la Cita del Día nace en el orden nuevo con la 28.2).
- Escribir un separador o unión de versos propio (AD-29: `src/lib/verso.ts` es de la Épica 29).
- Dar valor a `DESPLIEGUE_DE_CITAR_Y_LLEVARSE`, crear zonas o exenciones, mover el vocabulario, añadir desplegables (30.3/30.4) o la fila de acciones desde 600 px (30.2).
- Editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Con Fuente y Obra | Cita cotejada | figure → p.fuente → div.isla de Copiar → Imagen → compartir → section.tarjeta-de-obra → nav de salidas | — |
| Sin Fuente, con Obra | Cita del censo con `procedencia.obra` | figure → Copiar → … → Tarjeta → Rutas | — |
| Sin Obra | sin `procedencia.obra` | figure → Copiar → … → compartir → Rutas; ni tarjeta ni hueco | — |
| Sin Imagen | Cita que no admite Imagen | Copiar → compartir, sin hueco | — |
| Portada sin acciones | `dist/index.html` sin `data-copiar` | la regla no aplica; se deja escrita para la 28.2 | — |
| Corte sin valor | `DESPLIEGUE_DE_CITAR_Y_LLEVARSE` = undefined | SM-C5 juzga como hoy + línea «no ha ocurrido; la tomará de …» | — |
| Corte con valor pasado | corte `continuacion-de-cita` llegado | SM-4/SM-C5 solo desde el día siguiente; ninguna ventana cruza el corte; lectura/SM-5/SM-7 intactos | — |
| Señal que salta | dos ventanas seguidas de SM-C5 con la señal | línea de la palanca nueva | — |

</intent-contract>

## Code Map

- `src/pages/cita/[slug].astro:108-138` -- el `<article>`; mover `<TarjetaDeObra …/>` (l.124) tras `<CompartirEnlace …/>` (l.127) y reescribir el comentario l.117-123.
- `src/components/TarjetaDeObra.astro:2-40` -- cabecera que dice «antes de Copiar»; reescribir. Estilo l.122-170 (margin-top 4 ×) sin cambios.
- `src/islands/CompartirEnlace.astro:103-106` -- `.isla { margin-top: calc(var(--unidad) * 2) }` → 3 ×. Raíz `div.isla[data-compartir]` l.59.
- `src/islands/CopiarCita.astro:122-144` -- raíz `div.isla` con `button.copiar[data-copiar]`; margin-top 4 × ya correcto. Su guion se localiza por `previousElementSibling` (no separar el `<script>` del `div`).
- `src/islands/ImagenDeCita.astro:255-320` -- solo pinta con `tramo.admiteImagen`; margin-top 2 ×.
- `src/components/BloqueDeCita.astro:28` -- raíz `<figure class="bloque">`; `Fuente.astro` pinta `<p class="fuente">`.
- `tests/unit/tarjeta-de-obra.test.ts:303-319` -- aserción de orden en la plantilla (Fuente < Tarjeta < Copiar): invertir a Fuente < CopiarCita < ImagenDeCita < CompartirEnlace < TarjetaDeObra < RutasDeSalida.
- `tests/unit/tarjeta-de-obra.test.ts:661-715` -- l.678-680 (sin Obra) y la prueba «después de la Cita y su Fuente, antes de Copiar» (l.687): sustituir. Fixture `corpusDeLaTarjeta` l.466: con Fuente+Obra (Brevedad, Ira), sin Fuente+Obra (Cartas), sin Obra (sin Fuente). Fuente sin Obra no es construible (la obra sale del documento). Helpers: `recorrerElementos`, `tarjetaDeObraDe`, `navDeSalidas`.
- `tests/e2e/pagina-de-cita.spec.ts:583-632` -- bloque 24.4 con la prueba «Copiar va debajo de la tarjeta»: sustituir; helpers en `tests/e2e/ayuda/corpus.ts` (`citaConTarjetaCompleta`, `citaConTituloDeObraMasLargo`, `citaSinObra`).
- `src/lib/umbrales.ts:118-250` -- constantes de despliegue, `SerieDeMedicion` (l.183), `CORTES_DE_SERIE_DECLARADOS` (l.206), `CORTES_DE_SM8` (filtra `sm8`, no le afecta).
- `tools/lib/lineaBase.ts` -- `partirSerie` l.282; `series` l.626/730; `JuicioPorVentanas` l.368-388 y `juiciosPorVentanas` l.397 (SM-C5 l.406-413); `lineaBaseDe` l.1146-1191; juicio por ventanas l.1285-1380 (señal `salta` l.1370); `tasasDeAccion`/`cita` l.1012-1039 (`enLectura`); `NOMBRE_DE_SERIE` l.1483; informe de cortes l.1573-1589, Página de Cita l.1661-1673, ventanas l.1792-1844.
- `tests/unit/linea-base.test.ts:524-535` -- lista exacta de constantes de `CORTES_DE_SERIE_DECLARADOS`: añadir `DESPLIEGUE_DE_CITAR_Y_LLEVARSE`. SM-C5 en l.201 y l.921 (patrón `leer(…, { cortes, juicios, minimo })`).
- `AGENTS.md:968-1010` («La Tarjeta de Obra (Historia 24.4)») y `AGENTS.md:378-420` («Leer la línea base») -- orden nuevo y la constante sin valor.
- Medidas de la auditoría del 2026-11-05 (EXPERIENCE.md l.711): `antonio-machado-caminante-no-hay-camino-se-hace-camino` (707 px), `jose-marti-yo-soy-un-hombre-sincero-de-donde` (661), `jose-marti-yo-vengo-de-todas-partes-y-hacia` (756, en verso).

## Tasks & Acceptance

**Execution:**
- `src/pages/cita/[slug].astro` -- mover la Tarjeta tras `CompartirEnlace`, antes de `RutasDeSalida`; reescribir el comentario -- UX-DR113/UX-DR122.
- `src/components/TarjetaDeObra.astro` -- reescribir la cabecera con el lugar y la razón nuevos -- AC del comentario.
- `src/islands/CompartirEnlace.astro` -- margin-top de `.isla` a 3 × -- UX-DR114.
- `tests/unit/tarjeta-de-obra.test.ts` -- invertir la aserción de plantilla; sustituir l.687 por «nada se intercala entre la Atribución —con su Línea de la Fuente— y Copiar»: en toda Página de Cita del fixture, el siguiente elemento hermano tras `figure.bloque` (o tras `p.fuente` si la hay) contiene `button[data-copiar]`; y la tarjeta va tras la raíz de `CompartirEnlace` y antes del `nav` de salidas, dentro de `article`, fuera de Pagefind y sin Modelo; la misma comprobación se aplica a `dist/index.html` solo si contiene `data-copiar` (hoy no, y se afirma que no lleva Tarjeta), para que la 28.2 la encienda sin escribir otra.
- `tests/e2e/ayuda/corpus.ts` -- añadir `citaConObraDeTextoMasLargo()` (la Cita publicada con Obra y texto más largo; sustituto del verso más largo hasta la Épica 29) -- medida.
- `tests/e2e/pagina-de-cita.spec.ts` -- sustituir la prueba de la 24.5 por: a 360 × 640 (proyecto `movil`), la Cita empieza en la primera pantalla y `button.copiar` va por encima de `.tarjeta-de-obra`, en la cara completa, la de título más largo, la de texto más largo y las tres de la auditoría cuando estén publicadas; anotación con `y` de Copiar y de la tarjeta, sin tope para la larga. Añadir la prueba de tabulación (Chromium): Autor, título de la Obra y Fuente; Copiar e Imagen; destinos de compartir; filas de la Tarjeta; Rutas de salida; pie, en orden de marcado.
- `src/lib/umbrales.ts` -- `DESPLIEGUE_DE_CITAR_Y_LLEVARSE`, valor nuevo de `SerieDeMedicion` y la entrada del corte -- AD-9/AD-13.
- `tools/lib/lineaBase.ts` -- partir la serie nueva; continuación/SM-3/SM-C5 en la intersección de tramos; juicio SM-C5 consciente del corte (línea «no ha ocurrido» sin valor; línea base propia tras la llegada con valor); `palanca` declarada en el juicio e informada al saltar; `NOMBRE_DE_SERIE` -- PRD SM-C5 v9.
- `tests/unit/linea-base.test.ts` -- constante en la lista literal; respuestas fijas: corte sin jornada (SM-C5 como hoy + línea de la llegada pendiente), corte con jornada (ventanas solo tras él, ninguna lo cruza, lectura/SM-5 intactos, continuación partida), palanca al saltar.
- `AGENTS.md` -- orden nuevo de la Página de Cita (y que la Cita del Día lo sigue desde la 28.2), el corte y su constante sin valor, la jornada la pone Héctor.

**Acceptance Criteria:**
- Given cualquier Página de Cita construida, when se lee su `<article>`, then el orden es Bloque de Cita, Fuente (si la hay), Copiar, Imagen (si la hay), compartir, Tarjeta de Obra (si hay Obra), Rutas de salida, `FiltrosDeLaCita` último; y el orden de tabulación es el del marcado.
- Given la tarjeta movida, when se compara su marcado, then es idéntico al de antes (nivel 2, zona `tarjeta-de-obra`, «Siguiente», «Ver la obra…») con cualquier Modelo encendido o apagado.
- Given la misma `FECHA_JORNADA`, when se construye antes y después de la historia, then `dist/index.html` y `dist/404.html` salen idénticos.
- Given `tests/unit/medicion.test.ts`, when corre, then pasa sin zona nueva y sin cambios en `COLOCACION`.
- Given el barrido de `tests/e2e/accesibilidad.spec.ts`, when corre sobre la Página de Cita, then pasa, con reflujo a 320 px.
- Given `npm run medicion` con la constante en `undefined`, when salta SM-C5, then el informe nombra la llegada pendiente y la palanca nueva.

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

**Medida:** la implementación anota aquí, desde las anotaciones de la prueba e2e, la `y` de `button.copiar` a 360 × 640 tras el cambio, frente a la de la auditoría: Machado «Caminante, no hay camino» (707 antes), Martí «Yo soy un hombre sincero» (661), Martí «Yo vengo de todas partes» (756), y la Cita con Obra de texto más largo, con su slug (sustituto del verso hasta la Épica 29).

**Medida tomada (2026-11-07, `movil` a 360 × 640, `npx playwright test tests/e2e/pagina-de-cita.spec.ts`, anotaciones «30.1 a 360 × 640»):**

| Cita | `y` de Copiar antes (auditoría) | `y` de Copiar ahora | Tarjeta desde |
|------|------|------|------|
| `antonio-machado-caminante-no-hay-camino-se-hace-camino` | 707 | 466 (dentro) | 826 |
| `jose-marti-yo-soy-un-hombre-sincero-de-donde` | 661 | 419 (dentro) | 779 |
| `jose-marti-yo-vengo-de-todas-partes-y-hacia` (verso) | 756 | 515 (dentro) | 875 |
| `santiago-ramon-y-cajal-aun-los-medianamente-dotados-desde-el-punto` (Obra y texto más largo, 240 caracteres; sustituto del verso) | — | 667 (fuera) | 1027 |
| `mariano-jose-de-larra-la-verdad-del-teatro-es-enteramente-convencional` (título de Obra más largo) | — | 611 (fuera por 19 px con su alto) | 971 |
| `agustin-alvarez-ahora-empieza-a-haber-quienes-piensen-en` (cara completa) | — | 572 (dentro) | 932 |

Copiar va siempre por encima de la Tarjeta; las de texto largo siguen sin tope, como pide la historia. La repetición con la Cita en verso más larga restituida por la Épica 29 queda en `deferred`.

**Peso:** `npm run build` con `FECHA_JORNADA=2026-11-07`: 508.744.950 bytes juzgados (485,2 MiB), sin aviso (aviso en 750 MiB); la historia es un reordenado y un `margin-top`, y deja `dist/` en la misma cifra con ±10 bytes. `dist/index.html` y `dist/404.html`, idénticos byte a byte a los de la construcción de `baseline_revision` con la misma jornada.

**Lo que no se parte:** el bloque «Superficies con lectura» sigue dando la continuación de cada superficie, la Página de Cita incluida, en el tramo de `lectura` —es la tabla por superficie, rotulada con ese tramo—; la continuación que parte el corte nuevo es la del bloque «La Página de Cita» (SM-4, SM-3 y SM-C5), que con el corte llegado nombra su tramo. Sin corte llegado las dos cifras coinciden.

**Por qué una serie nueva y no `lectura`:** `lectura` la leen todas las superficies con lectura y SM-5/SM-7; partirla movería tasas que esta épica no cambia. La serie nueva solo la leen la continuación de la Página de Cita y SM-C5; su tramo se interseca con el de `lectura` para no reabrir lo que la 23 ya partió.

**Antes de la llegada SM-C5 no cambia:** el corte declarado sin jornada no abre tramo; el juicio sigue con la llegada de la 24/26, y solo añade la línea de la llegada pendiente. Así darle valor a la constante no pone la principal en rojo.

## Verification

**Commands:**
- `npx vitest run tests/unit/tarjeta-de-obra.test.ts` -- verde.
- `npx vitest run tests/unit/linea-base.test.ts tests/unit/medicion.test.ts tests/unit/tipografia-en-tokens.test.ts tests/unit/siguiente.test.ts` -- verde.
- `npx astro check` -- 0 errores.
- `npm run build` (con `FECHA_JORNADA` fija; detached con `correr.sh`) -- termina; anotar las cifras del peso y lo que añade la historia; ningún aviso de peso.
- `npx playwright test tests/e2e/pagina-de-cita.spec.ts tests/e2e/accesibilidad.spec.ts --project=movil` y `--project=escritorio` -- verde; copiar las anotaciones de medida a Design Notes.

**Manual checks:**
- Diff de `dist/index.html` y `dist/404.html` entre la construcción en `baseline_revision` y la de la historia, misma `FECHA_JORNADA`: vacío.

## Auto Run Result

Status: done

**Cambio:** el `<article>` de la Página de Cita va en el orden Bloque de Cita → Fuente → Copiar → Imagen → compartir → Tarjeta de Obra → Rutas de salida → `FiltrosDeLaCita`; compartir queda a 3 × unidad bajo Copiar e Imagen. En la medición, `DESPLIEGUE_DE_CITAR_Y_LLEVARSE` (sin valor) abre un corte de la serie nueva `continuacion-de-cita`, que parte solo la continuación de la Página de Cita, su SM-3 y SM-C5 (leídos en la intersección con el tramo de `lectura`); SM-C5 declara su corte y su palanca, y el informe nombra la llegada pendiente o la línea base propia tras ella, y la palanca cuando la señal salta.

**Ficheros:**
- `src/pages/cita/[slug].astro` — la Tarjeta tras `CompartirEnlace`, comentario con la razón nueva.
- `src/components/TarjetaDeObra.astro` — cabecera con el sitio y la razón nuevos.
- `src/islands/CompartirEnlace.astro` — `.isla` a `calc(var(--unidad) * 3)`.
- `src/lib/umbrales.ts` — `DESPLIEGUE_DE_CITAR_Y_LLEVARSE`, `'continuacion-de-cita'` en `SerieDeMedicion` y su entrada en `CORTES_DE_SERIE_DECLARADOS`.
- `tools/lib/lineaBase.ts` — serie partida, intersección de tramos, `TasasDeLaPaginaDeCita`, `corte` y `palanca` en `JuicioPorVentanas`, línea base propia de SM-C5 tras el corte, informe.
- `tests/unit/tarjeta-de-obra.test.ts` — orden de plantilla invertido; hijos de `article` en `dist/` (nada entre Atribución/Fuente y Copiar, Imagen opcional sin hueco, Tarjeta tras compartir, portada condicionada a `data-copiar`); Cita cotejada sin Imagen en el fixture.
- `tests/unit/linea-base.test.ts` — la constante en la lista literal; seis casos del corte (sin jornada, de hoy, pasada, sin cerrar, palanca con y sin salto).
- `tests/e2e/ayuda/corpus.ts` — `citaConObraDeTextoMasLargo` y `estaPublicada`.
- `tests/e2e/pagina-de-cita.spec.ts` — medida de Copiar sobre la Tarjeta a 360 × 640, orden de tabulación, distancias 4 × / 2 × / 3 ×.
- `tests/e2e/accesibilidad.spec.ts` — el orden de foco esperado pasa a contenido, acciones, tarjeta y salidas.
- `AGENTS.md` — orden nuevo, el corte y su constante sin valor.

**Revisión:** capas externas sin hallazgos en esta pasada: 0 parches, 0 diferidos, 0 rechazados. `followup_review_recommended: false` (parches: 0 high, 0 medium, 0 low; puntuación 0).

**Verificación:** `npx vitest run tests/unit/tarjeta-de-obra.test.ts` (32 verdes); `tests/unit/linea-base.test.ts`, `medicion.test.ts`, `tipografia-en-tokens.test.ts`, `siguiente.test.ts` (800 verdes); `npx astro check` (0 errores); `FECHA_JORNADA=2026-11-07 npm run build` (EXIT 0, sin aviso de peso); `npx playwright test tests/e2e/pagina-de-cita.spec.ts tests/e2e/accesibilidad.spec.ts --project=movil --project=escritorio` (369 verdes, 9 omitidas por proyecto); `npm test` (155 ficheros, 7174 verdes); `dist/index.html` y `dist/404.html` idénticos byte a byte a la construcción de la base con la misma jornada.

**Riesgos residuales:** la medida con la Cita en verso más larga espera a la Épica 29 (deferred). La construcción de la base corrió mientras se editaba `src/pages/cita/[slug].astro`, así que solo vale como base para la portada y el 404, que no dependen de los ficheros tocados. `DESPLIEGUE_DE_CITAR_Y_LLEVARSE` la pone Héctor; el bloque «Superficies con lectura» sigue en el tramo de `lectura` (Design Notes).
