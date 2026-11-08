---
title: 'Historia 30.1 — Copiar antes de la Tarjeta de Obra en la Página de Cita'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: '7a9de4a9254aedeb726328ecbd7e49bb9c195656'
review_loop_iteration: 0
followup_review_recommended: true
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

### 2026-11-07 — Review pass (implementación, antes de las capas externas)
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

### 2026-11-07 — Review pass (capas externas, pasada 1)
- intent_gap: 0
- bad_spec: 0
- patch: 10: (high 0, medium 3, low 7)
- defer: 0
- reject: 21
- addressed_findings:
  - `[medium]` `[patch]` El informe no decía que SM-5, SM-7, SM-C3 y la continuación de «Superficies con lectura» siguen en el tramo de la lectura, ni que partir SM-5 lo decide Héctor, y enseñaba dos cifras sin rotularlas (blind-hunter 5/6, intent-alignment). La línea del corte llegado lo dice ahora tal cual (`tools/lib/lineaBase.ts`), y la prueba fija la línea entera, con «sobre 720 lecturas» (verification-gap, otros).
  - `[medium]` `[patch]` Con el corte llegado y el juicio sin contar (sin mínimo, sin leer, línea base sin empezar), SM-C5 nombraba la llegada vieja y callaba la del corte (edge-case 1). El corte llegado se fija antes de las salidas tempranas, sin `acumulado` —nada inventado—, y la cabecera y la línea del corte lo dicen; prueba nueva.
  - `[medium]` `[patch]` La igualdad byte a byte de `dist/index.html` y `dist/404.html` descansaba en una base construida a media edición (blind-hunter 17, ac-auditor 1). Se rehízo con la base limpia: `src/` de `baseline_revision` y de la historia, `FECHA_JORNADA=2026-11-07 npx astro build` cada una; `cmp` sin diferencias en las dos.
  - `[low]` `[patch]` `interseccion` daba el número de tramo de la lectura en la línea de la continuación (blind-hunter 1). Lleva el de `continuacion-de-cita`; prueba nueva sin el corte de la 23, donde los dos números difieren.
  - `[low]` `[patch]` Un corte de ayer en la serie nueva no tenía prueba (blind-hunter 2, edge-case 4): el informe dice «aún no tiene ninguna jornada cerrada» y «reúne 0 de 300»; prueba nueva.
  - `[low]` `[patch]` La prueba de tabulación tiraba las paradas que no casaban, juntaba Copiar e Imagen y no exigía llegar al pie (blind-hunter 9, edge-case 6, ac-auditor 3). Ahora una parada del `article` fuera de sus grupos falla nombrándose, Copiar e Imagen son grupos propios y el recorrido tiene que acabar en el pie.
  - `[low]` `[patch]` Las Citas de la auditoría ausentes del Corpus se caían sin aviso (blind-hunter 8): cada una ausente es una prueba omitida con su motivo.
  - `[low]` `[patch]` `hijosDelArticle` tomaba por `FiltrosDeLaCita` cualquier hijo `hidden` (blind-hunter 11): la marca es ahora el `span[data-pagefind-sort]` que solo él lleva.
  - `[low]` `[patch]` Sin Obra se exigía `salidas` tras compartir aunque una Cita sin Rutas acabe en los filtros (blind-hunter 12): se acepta `filtros` cuando no hay `nav`, como en la rama con Obra.
  - `[low]` `[patch]` La distancia 3 × de compartir solo la miraba el e2e local (verification-gap): una prueba de `tarjeta-de-obra.test.ts` en `npm test` lee el `margin-top` de la raíz de Copiar (4 ×), Imagen (2 ×) y compartir (3 ×).
  - Rechazadas (21): la palanca con cualquier ventana `salta` (es la letra del contrato: «cuando una ventana de SM-C5 sale `salta`», y `salta` ya son dos seguidas); la 30.1 desplegada sola (la Épica 30 se funde entera, tras la 29); un tope a la `y` de Copiar (la historia pide anotarla sin tope); dos dueños del orden de tabulación (miden granos distintos y los dos pasan); la distancia compartir → Tarjeta (no la fija ningún criterio; la Tarjeta conserva su 4 ×); `texto.length` del fixture de Unamuno (el texto es ASCII, sin comillas, y cada Cita del fixture se comprueba con o sin Imagen en `dist/`); el estado `done` previo a la revisión externa (es el orden del bucle); `sprint-status.yaml` (lo escribe el cierre del bucle); `cifra(undefined)` (da «sin leer», no un número); las comillas “ ” del `que` (las fija el contrato); el `!` de `desde` de la intersección (un corte llegado siempre abre tramo con principio); un segundo corte pendiente de la misma serie (no hay ninguno declarado); «Superficies con lectura» sin partir (decisión de Design Notes, dicha ahora en el informe); la medida sin Imagen en el navegador y en las seis rutas (el orden lo cubre `dist/`); las cifras de la auditoría y la orden remota (de Héctor); y la Cita en verso, ya diferida.

### 2026-11-07 — Review pass (capas externas, pasada 2, la última)
- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 0, medium 1, low 4)
- defer: 0
- reject: 29
- addressed_findings:
  - `[medium]` `[patch]` La medida e2e a 360 × 640 dejaba pasar una ruta de `conTarjeta` sin `.tarjeta-de-obra`: con la tarjeta nula se saltaba la comparación (blind-hunter 4, edge-case 5). Ahora exige la tarjeta en esas rutas y nombra la ruta (`tests/e2e/pagina-de-cita.spec.ts`).
  - `[low]` `[patch]` Con el corte llegado, la cabecera de SM-C5 que sale antes de contar tomaba el `desde` del tramo del corte y la línea base propia el de la intersección (blind-hunter 13, edge-case 2). Un solo cálculo, `desdeTrasElCorte`, sirve a las dos (`tools/lib/lineaBase.ts`).
  - `[low]` `[patch]` Ese principio podía caer antes del de la línea base de la unidad (edge-case 1): `desdeTrasElCorte` toma el más tardío de los dos.
  - `[low]` `[patch]` La línea base propia de SM-C5 tras el corte se salta las jornadas de otra llegada de la unidad, y nada lo comprobaba (verification-gap). Prueba nueva en `tests/unit/linea-base.test.ts` con SM-C3 llegando el 2026-11-07: referencia del 6, el 8 y el 9, cerrada el 9.
  - `[low]` `[patch]` El spec se contradecía sobre su revisión (blind-hunter 1, ac-auditor): la primera entrada del triaje y el primer párrafo «Revisión» del resultado se rotulan como la pasada de la implementación, y el resultado dice cuál es la vigente.
  - Rechazadas (29): `done` y `sprint-status.yaml` (la línea la escribe el cierre del bucle); un tope a la `y` de Copiar y las Citas largas fuera de la primera pantalla (la historia pide anotar sin tope y solo que Copiar vaya sobre la Tarjeta); el grupo `imagen` de la tabulación en la cara completa, la parada en `document.body`, `conImagen` fijado en el fixture, el recuento de caracteres y `previousElementSibling` nulo (la cara completa y el fixture son fijos: futuros especulativos); la rama de la portada sin ejercitar (es la regla escrita para la 28.2, por contrato); la identidad de la tarjeta con Modelos (la cubre `ediciones-en-venta.test.ts`), la igualdad de portada y 404 (comprobada a mano con la base limpia en la pasada 1), Fuente sin Obra (no es construible), la medida en seis rutas (el orden lo cubre `dist/`), las distancias sin Fuente (las mide «sin Obra, Copiar sigue donde estaba») y la Imagen a 2 × desde 600 px (es de la 30.2); un segundo corte de la misma serie, la palanca fuera de `salta`, la lista de series repetida, los textos de la 30.3/30.4 en el `que` y la palanca (los fija el contrato) y el denominador de cada línea (ya rotulado en la pasada 1); el tramo vacío de un corte de ayer (ya probado en la pasada 1); la clasificación de foco en la isla de Copiar; los números de línea del Code Map; y la Épica 29, ya diferida.

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

**Revisión (pasada de la implementación, antes de las capas externas):** sin hallazgos: 0 parches, 0 diferidos, 0 rechazados. Las dos pasadas externas van abajo; el estado vigente es el de la última.

**Verificación:** `npx vitest run tests/unit/tarjeta-de-obra.test.ts` (32 verdes); `tests/unit/linea-base.test.ts`, `medicion.test.ts`, `tipografia-en-tokens.test.ts`, `siguiente.test.ts` (800 verdes); `npx astro check` (0 errores); `FECHA_JORNADA=2026-11-07 npm run build` (EXIT 0, sin aviso de peso); `npx playwright test tests/e2e/pagina-de-cita.spec.ts tests/e2e/accesibilidad.spec.ts --project=movil --project=escritorio` (369 verdes, 9 omitidas por proyecto); `npm test` (155 ficheros, 7174 verdes); `dist/index.html` y `dist/404.html` idénticos byte a byte a la construcción de la base con la misma jornada.

**Riesgos residuales:** la medida con la Cita en verso más larga espera a la Épica 29 (deferred). `DESPLIEGUE_DE_CITAR_Y_LLEVARSE` la pone Héctor; el bloque «Superficies con lectura» sigue en el tramo de `lectura` (Design Notes), y el informe lo dice.

### Pasada de revisión externa 1 (2026-11-07)

**Cambio:** el informe de `npm run medicion`, con el corte llegado, dice que SM-5, SM-7, SM-C3 y la continuación de «Superficies con lectura» siguen en el tramo de la lectura y que partir también SM-5 lo decide Héctor; nombra el tramo de `continuacion-de-cita` y no el de la lectura; y SM-C5 nombra la llegada del corte también cuando no llega a contar. Las pruebas de orden, tabulación y distancias se endurecen.

**Ficheros:**
- `tools/lib/lineaBase.ts` — número de tramo de la continuación, corte llegado antes de las salidas tempranas (`acumulado` opcional), línea del informe que dice lo que no se parte.
- `tests/unit/linea-base.test.ts` — línea entera del corte llegado; tres pruebas nuevas (número de tramo, corte de ayer, corte llegado sin mínimo).
- `tests/unit/tarjeta-de-obra.test.ts` — `FiltrosDeLaCita` por su marca, Rutas o filtros tras compartir sin Obra, distancias 4 × / 2 × / 3 × en `npm test`.
- `tests/e2e/pagina-de-cita.spec.ts` — tabulación con Copiar e Imagen separados, sin paradas sueltas en el `article` y hasta el pie; aviso de la Cita de la auditoría ausente.

**Revisión:** 10 parches (0 high, 3 medium, 7 low), 0 diferidos, 21 rechazados. `followup_review_recommended: true` (3 × 3 + 1 × 7 = 16 ≥ 5).

**Verificación:** `npx vitest run tests/unit/linea-base.test.ts` (90 verdes) y `tests/unit/tarjeta-de-obra.test.ts` (33 verdes); `npx playwright test tests/e2e/pagina-de-cita.spec.ts --project=movil --project=escritorio` (77 verdes, 9 omitidas por proyecto); `dist/index.html` y `dist/404.html` idénticos byte a byte entre `src/` de `baseline_revision` y de la historia, `FECHA_JORNADA=2026-11-07 npx astro build` en las dos; `npx astro check` (0 errores, 0 avisos); `npm test` (155 ficheros, 7178 verdes).

### Pasada de revisión externa 2, la última (2026-11-07)

**Cambio:** la medida e2e a 360 × 640 exige la Tarjeta en las rutas de `conTarjeta`; el principio de la línea base propia de SM-C5 tras el corte sale de un solo cálculo (`desdeTrasElCorte`: la intersección con el tramo de la unidad, nunca antes de su línea base), para la cabecera que sale antes de contar y para la que cuenta; una prueba fija que esa línea base se salta la jornada de otra llegada de la unidad. El spec rotula su primera pasada como la de la implementación.

**Ficheros:**
- `tests/e2e/pagina-de-cita.spec.ts` — la tarjeta, obligatoria en las rutas de `conTarjeta`.
- `tools/lib/lineaBase.ts` — `desdeTrasElCorte`, un solo principio tras el corte.
- `tests/unit/linea-base.test.ts` — prueba nueva: SM-C3 llega dentro del tramo tras el corte y su jornada no entra en la referencia de SM-C5.
- este spec — triaje y resultado al día.

**Revisión:** 5 parches (0 high, 1 medium, 4 low), 0 diferidos, 29 rechazados. `followup_review_recommended: true` (3 × 1 + 1 × 4 = 7 ≥ 5); es la última pasada del bucle, así que la recomendación queda anotada para Héctor y no abre otra.

**Verificación:** `npx vitest run tests/unit/linea-base.test.ts` (91 verdes); `npx playwright test tests/e2e/pagina-de-cita.spec.ts --project=movil --project=escritorio` (77 verdes, 9 omitidas); `npx astro check` (0 errores, 0 avisos); `npm test` (155 ficheros, 7179 verdes). Los cambios no tocan `src/`, así que `dist/` y la igualdad de portada y 404 de la pasada 1 siguen valiendo.

**Estado en HEAD:** la historia está construida y revisada en `v9/epica-30`, sin fusionar: la Épica 30 se funde entera tras la 29, y la línea de `sprint-status.yaml` la escribe el cierre del bucle. Siguen diferidas la medida con la Cita en verso de la Épica 29 y su precondición.

**Riesgos residuales:** los de arriba; y que las Citas de texto largo dejan Copiar fuera de la primera pantalla (667 y 611 px), que la historia acepta sin tope.
