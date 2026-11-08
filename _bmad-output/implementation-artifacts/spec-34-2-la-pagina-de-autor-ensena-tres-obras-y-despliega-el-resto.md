---
title: 'Historia 34.2 — La Página de Autor enseña tres Obras y despliega el resto'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: '2d4f902c0e8340287c60a6ac68a215ca696808b8'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-34-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-34-0-la-primitiva-de-desplegable.md'
warnings: [oversized]
deferred:
  - summary: 'La medida de Barrett a 360 × 640 («Y {m} obras más» y la primera Cita a menos de 1.000 px) la corre Héctor en local y va en el mensaje del commit; el bucle la corre también como verificación, pero la cifra del commit es la de Héctor.'
    evidence: 'epics.md Story 34.2, Given «el Corpus real»: «La prueba la corre Héctor, y la medida va en el mensaje del commit».'
    severity: low
  - summary: >-
      Una salida a una Obra plegada se mide igual que a una a la vista (`salida-interna`, zona `lista-de-obras`), así que el coste de plegar (UX-DR130) en visitas a Obras no se podrá separar después.
    evidence: |-
      Los dos `<ul>` llevan `data-zona="lista-de-obras"` por contrato (sin zona nueva); distinguirlos exigiría una zona o un campo nuevo, que decide Héctor (UX-DR111, bmad-ux).
    location: >-
      src/components/ListaDeObras.astro
    severity: low
---

<intent-contract>

## Intent

**Problem:** La Lista de Obras de la Página de Autor va entera antes de las Citas: con Rafael Barrett (59 Obras) la primera Cita queda a unos 3.249 px a 360 × 640, cinco pantallas abajo (UX-DR130, FR-4).

**Approach:** La Lista de Obras gana una prop obligatoria de pliegue: en la Página de Autor, con más de `MAX_OBRAS_ANTES_DE_LAS_CITAS` (3, valor de Héctor del 2026-11-05) Obras, pinta las tres primeras y luego el resto dentro de un `Desplegable` cerrado (34.0) rotulado «Y {m} obras más» / «Y una obra más»; `/obras/` no se pliega nunca y su HTML no cambia.

## Boundaries & Constraints

**Always:**
- `MAX_OBRAS_ANTES_DE_LAS_CITAS = 3` en `src/lib/umbrales.ts`, literal, con comentario (AD-9, UX-DR130, decisión de Héctor del 2026-11-05). Ninguna prueba lo fija a 3 salvo leyéndolo de ahí.
- `ListaDeObras.astro` gana `pliegue: typeof Desplegable | false`, obligatoria y sin valor por omisión, con `import type Desplegable from './Desplegable.astro'` (solo tipo). La Página de Autor importa `Desplegable` y pasa `pliegue={Desplegable}`; `/obras/` pasa `pliegue={false}`. Es el componente y no un booleano porque Astro emite la hoja de todo lo que un componente importa, se renderice o no (AGENTS.md, `Sostener.astro`): importado desde `ListaDeObras`, el `<style>` en línea de `/obras/` ganaría las reglas del Desplegable y su HTML cambiaría. La cabecera del componente lo explica.
- Plegada y con `obras.length > MAX_OBRAS_ANTES_DE_LAS_CITAS`: `<ul class="lista-de-obras" data-zona={zona}>` con las tres primeras, y justo después `<Pliegue rotulo={rotuloDeObrasPlegadas(m)}>` con un segundo `<ul class="lista-de-obras" data-zona={zona}>` con las m restantes, mismas filas y mismo orden (el de entrada, que ya es `ordenDeLaListaDeObras`). Nada de `<li>` envolviendo el desplegable (34.0 dejó sin decidir el filete con envoltorios). Sin pliegue, o con tres o menos, el marcado es exactamente el de hoy.
- `rotuloDeObrasPlegadas(m)` en `src/lib/atribucion.ts`, la única que redacta el rótulo: m = 1 → «Y una obra más»; m ≥ 2 → «Y {m} obras más»; m no entero o < 1 lanza nombrando la función y el valor.
- El `<summary>` solo lleva el texto del rótulo (lo garantiza `Desplegable`); sin estilos nuevos de color/tipografía literales; `tests/unit/tipografia-en-tokens.test.ts` pasa sin tocar `EXCEPCIONES`.
- Toda Obra del Autor en el HTML de la página 1, cada una una vez; zona `lista-de-obras` en los dos `<ul>`; «Y {n} citas sin obra documentada.» tras el desplegable; «Citas documentadas», «Buscar en {Autor}» y el listado justo después. Las 2+ siguen sin Lista.
- La prueba temporal «ninguna página ni componente del sitio lo importa todavía» de `tests/unit/desplegable.test.ts` se quita (su mensaje lo pide); la guardia permanente de `<details>` escritos a mano se queda.

**Block If:**
- `dist/obras/index.html` (misma `FECHA_JORNADA`, antes y después) cambia en algún byte con el diseño de arriba: HALT, sin cambiar a otro diseño.
- `astro check` no acepta `typeof Desplegable` de un `import type` de un `.astro`, o la página no renderiza el componente pasado por prop: HALT.
- La puerta NFR-5 (`integraciones/alcance.ts`) rompe con el Corpus real tras el cambio.

**Never:**
- Escribir un `<details>` propio, copiar la primitiva o tocar `Desplegable.astro`, `GUIONES_EXTERNOS`, `src/lib/vocabulario.ts`, zonas, `tokens.css`, `_bmad-output/planning-artifacts/`, `_bmad-output/specs/` o `corpus/`.
- Plegar `/obras/`, cambiar su filtro (26.6) o alojar un Modelo de Ingreso en la Página de Autor.
- Cambiar los campos que pinta la Página de Autor en `tools/lib/cambios.ts` (AD-27) o mover un `lastmod`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cinco Obras, plegada | Autor con 5 Obras, `pliegue={Desplegable}` | 3 `<li>` en el primer `<ul>`; `<details class="desplegable">` sin `open` con summary «Y 2 obras más» y 2 `<li>` dentro | — |
| Cuatro Obras | 4 Obras | 3 + «Y una obra más» con 1 `<li>` | — |
| Tres o menos | 3 Obras | un solo `<ul>`, ningún `<details>`, marcado de hoy | — |
| Sin pliegue | `/obras/`, cualquier n | un solo `<ul>` por Autor, ningún `<details>` | — |
| Rótulo | m = 1, 2, 56 | «Y una obra más», «Y 2 obras más», «Y 56 obras más» | m = 0, −1, 1.5, NaN lanzan |

</intent-contract>

## Code Map

- `src/components/ListaDeObras.astro` -- los dos usos (Autor, zona `lista-de-obras`; `/obras/`, zona `directorio`); `Props {obras, zona}` (l. 29–36); filete `.lista-de-obras li:not([hidden]) ~ li` (l. 73) aplica igual al `<ul>` de dentro, que pinta el mismo componente. Actualizar la cabecera (dos usos, pliegue, por qué componente y no booleano).
- `src/components/Desplegable.astro` -- solo lectura: `rotulo` + slot, `border-block` como filete encima del rótulo y debajo del último, `.contenido` con 2×/3× `--unidad`, `max-inline-size: var(--medida-prosa)`; lanza con slot vacío (el resto nunca está vacío porque m ≥ 1).
- `src/pages/autor/[slug]/[...page].astro` -- uso en l. 146 (`<ListaDeObras obras={suObra.obras} zona="lista-de-obras" />`); `pieDeObras` l. 91–97 va tras la lista (ahora tras el desplegable, sin cambio de código); `.obras-del-autor > :global(.lista-de-obras)` (l. 220) da margen solo al primer `<ul>`, el de dentro no es hijo directo. Importar `Desplegable` aquí.
- `src/pages/obras.astro` -- uso en l. 67; añadir `pliegue={false}`.
- `src/lib/umbrales.ts` -- declarar `MAX_OBRAS_ANTES_DE_LAS_CITAS` junto a `MAX_CITAS_DE_LA_MISMA_OBRA` (l. 334), mismo estilo de comentario. El filtro de los Directorios importa este módulo: literal, sin cálculo.
- `src/lib/atribucion.ts` -- `recuentoDeCitas` (lo usa la Lista) y el patrón de función que lanza (`recuentoDeCierre`, l. 396); añadir `rotuloDeObrasPlegadas`.
- `src/lib/publicado.ts` -- `obrasDelAutor` ya devuelve `{obras, sinObra}` ordenadas con `ordenDeLaListaDeObras`; no se toca.
- `tests/unit/lista-de-obras.test.ts` -- construcción con Séneca de 4 Obras (l. 135–368): `entradas(seccion)` sigue viendo las 4 `<li>`; añadir aquí lo nuevo. Patrón `sembrar(autor, clave, titulo, n)` (l. 161).
- `tests/unit/directorio-de-obras.test.ts` -- l. 505 exige `<ul class="lista-de-obras" data-zona="directorio"`; l. 509 «el grupo repite la secuencia de su Página de Autor» con `filasDe` sobre toda la sección: debe seguir verde.
- `tests/unit/desplegable.test.ts` -- l. 182–190, prueba temporal a quitar (y su comentario de encima, l. ~175–181); l. 192 guardia permanente.
- `tests/unit/medicion.test.ts` -- `COLOCACION` l. 3146 (`/autor/seneca/` → `/obra/` con `lista-de-obras`): sin cambio.
- `tests/e2e/pagina-de-autor.spec.ts` -- «Historia 17.3» (l. 126–175): Unamuno tiene 26 Obras; la prueba de 44 px mide filas que quedarían plegadas (alto 0): abrir antes los desplegables. Aquí va la medida de Barrett.
- `tests/e2e/ayuda/corpus.ts` -- `citasResueltas()` con `autor` y `ficha`; `fichasDeObraPorCita` (l. 283); añadir `obrasPorAutor()`/`autorConMasObras()` derivados.
- `tests/e2e/ayuda/desplegables.ts` -- `abrirLosDesplegables(page)` (cuántos abrió), `auditar`, `recorrerElFoco`.
- `tests/e2e/accesibilidad.spec.ts` -- `SUPERFICIES` (l. 185) es muestra derivada por familia; añadir la Página del Autor con más Obras. `TITULOS_QUE_COMPARTEN_FILA` «la Lista de Obras del Autor» (l. ~1173) exige `listado !== 'oculto'` para el título más largo: abrir los desplegables antes de medir.
- `tests/e2e/tipografia-calculada.spec.ts` -- instantánea `autor` del Autor de `citaConLosDosBloques`; si ese Autor tiene más de 3 Obras, gana las claves del `<summary>` y del `<ul>` de dentro.
- `AGENTS.md` -- § «El Directorio de Obras (Historia 26.4)» (l. 1050) y la viñeta del Desplegable (l. 36: «hasta que una superficie pinte uno…»).

## Tasks & Acceptance

**Execution:**
- (antes de código) `FECHA_JORNADA=2026-11-07 npx astro build` y guardar `shasum` de `dist/obras/index.html`, `dist/sitemap-0.xml` y de cada `dist/autor/*/index.html` en `/Users/hec/brainlySabiduria/.claude/v9-ralph/logs/s-34/dist-antes-34.2.sha` -- línea base de «`/obras/` no cambia» y «ningún `lastmod`».
- `src/lib/umbrales.ts` -- declarar `MAX_OBRAS_ANTES_DE_LAS_CITAS = 3` -- AD-9.
- `src/lib/atribucion.ts` -- `rotuloDeObrasPlegadas(m)` -- un solo dueño de la microcopia.
- `src/components/ListaDeObras.astro` -- prop `pliegue`, partición y segundo `<ul>` dentro del `Pliegue`, cabecera al día -- UX-DR130.
- `src/pages/autor/[slug]/[...page].astro` y `src/pages/obras.astro` -- declarar `pliegue` -- la Autor pliega, `/obras/` nunca.
- `tests/unit/lista-de-obras.test.ts` -- (a) pura: el rótulo con m = 1, 2, 56 y que lanza con 0, −1, 1.5 y `NaN`; (b) una construcción nueva con tres Autores de 5, 4 y 3 Obras de recuentos distintos: en el primero, primer `<ul>` con 3 `<li>`, `<details class="desplegable">` sin `open`, summary «Y 2 obras más» sin `h1`…`h6`, 2 `<li>` dentro; en el segundo 3 + «Y una obra más» + 1; en el tercero ningún `<details>`; en los tres los `href` en el orden de `obrasDelAutor` (de `ordenDeLaListaDeObras`), cada uno una vez, los dos `<ul>` con `data-zona="lista-de-obras"`, «sin obra documentada» tras `</details>` y antes de «Citas documentadas»; `/obras/` de esa copia sin `<details` ni `desplegable` en todo el fichero; el corte con `MAX_OBRAS_ANTES_DE_LAS_CITAS` importado.
- `tests/unit/desplegable.test.ts` -- quitar la prueba temporal y su comentario; dejar la permanente.
- `tests/e2e/ayuda/corpus.ts` -- `autorConMasObras(): { slug, obras } | undefined` derivado de `citasResueltas()` (fichas distintas por Autor; empate por slug).
- `tests/e2e/pagina-de-autor.spec.ts` -- en la de 44 px, `abrirLosDesplegables` antes de medir y exigir cada `href` una vez; nueva describe «Historia 34.2» con `/autor/rafael-barrett/` (skip con motivo si el Corpus no lo tiene): a 360 × 640, summary «Y {n − 3} obras más» con n de `ayuda/corpus.ts`, `details` cerrado, la primera `.listado li` con `top` < 1000 (y la cifra en `test.info().annotations`); a 320 px `scrollWidth ≤ clientWidth` cerrado y abierto; Tab hasta el `<summary>` (tope por número de enfocables), Intro lo abre y el foco sigue en él.
- `tests/e2e/accesibilidad.spec.ts` -- añadir la ruta de `autorConMasObras()` a `SUPERFICIES` (axe y foco cerrado y abierto ya los da el paso de la 34.0); en `TITULOS_QUE_COMPARTEN_FILA`, abrir los desplegables tras `cargarEn320` y antes de medir.
- `tests/e2e/tipografia-calculada.spec.ts-snapshots/tipografia-autor-*.json` -- regrabar solo si fallan, comprobando en el diff que solo aparecen o se mueven claves de la Lista de Obras y del `<summary>` y que ningún par existente cambia de valor.
- `AGENTS.md` -- § El Directorio de Obras: la Lista de Obras de la Página de Autor se pliega a `MAX_OBRAS_ANTES_DE_LAS_CITAS` con «Y {m} obras más» (`rotuloDeObrasPlegadas`), la de `/obras/` no, mismo componente con la prop `pliegue` (y por qué es el componente); viñeta del Desplegable: la Página de Autor ya pinta uno.
- (al final) reconstruir con la misma `FECHA_JORNADA` y comparar con `dist-antes-34.2.sha`: `/obras/` y `sitemap-0.xml` idénticos; las Páginas de Autor de tres Obras o menos cambian solo en su `<style>`.

**Acceptance Criteria:**
- Given un uso de `ListaDeObras` sin `pliegue`, when corre `npx astro check`, then falla; con los dos usos declarados, 0 errores.
- Given el sitio real construido antes y después con la misma `FECHA_JORNADA`, when se comparan, then `dist/obras/index.html` y `dist/sitemap-0.xml` son idénticos byte a byte, y la sección `obras-del-autor` de un Autor de tres Obras o menos es idéntica.
- Given `/autor/rafael-barrett/` a 360 × 640 en Playwright local, when carga, then dice «Y {n − 3} obras más» (n del Corpus del día; 59 era la cifra del diseño), el desplegable está cerrado y la primera Cita queda a menos de 1.000 px del borde superior; a 320 px no hay desplazamiento horizontal cerrado ni abierto; el `<summary>` se alcanza con Tab y se abre con Intro sin mover el foco.
- Given `tests/e2e/accesibilidad.spec.ts` con la página del Autor con más Obras, when corre en local, then axe y el recorrido de foco pasan cerrados y abiertos.
- Given `npx vitest run tests/unit/ingreso-construido.test.ts`, when construye con los Modelos admitidos encendidos, then pasa y la Página de Autor no lleva `data-ingreso`.

## Design Notes

Golden de la parte plegada (dentro de `ListaDeObras`, `Pliegue = pliegue`):

```astro
<ul class="lista-de-obras" data-zona={zona}>{primeras.map(fila)}</ul>
<Pliegue rotulo={rotuloDeObrasPlegadas(resto.length)}>
  <ul class="lista-de-obras" data-zona={zona}>{resto.map(fila)}</ul>
</Pliegue>
```

`fila` es el `<li>` de hoy, sin cambiar un carácter, para que el marcado sin pliegue siga idéntico. El filete entre la tercera fila y el rótulo es el `border-block-start` del Desplegable; el de debajo del último, su `border-block-end`; dentro, el del propio `<ul>`.

## Verification

**Commands:**
- `npx vitest run tests/unit/lista-de-obras.test.ts` -- verde.
- `npx vitest run tests/unit/desplegable.test.ts tests/unit/directorio-de-obras.test.ts tests/unit/tipografia-en-tokens.test.ts` -- verde, sin tocar `EXCEPCIONES`.
- `npx vitest run tests/unit/medicion.test.ts tests/unit/ingreso-construido.test.ts` -- verde (zonas y Modelos sin cambio).
- `npx astro check` -- 0 errores.
- `FECHA_JORNADA=2026-11-07 npx astro build` + `shasum` -- `/obras/` y sitemap idénticos a `dist-antes-34.2.sha`; la puerta NFR-5 no rompe.
- `npx playwright test tests/e2e/pagina-de-autor.spec.ts --project=movil` y `--project=escritorio` (detached) -- verde, con la medida de Barrett anotada.
- `npx playwright test tests/e2e/accesibilidad.spec.ts tests/e2e/tipografia-calculada.spec.ts tests/e2e/directorio-de-obras.spec.ts tests/e2e/filtro-del-directorio.spec.ts --project=escritorio` (detached) -- verde.
- `npm test` (detached) -- verde.

## Spec Change Log

- 2026-11-07 — sin vuelta de bad_spec (`review_loop_iteration` cuenta solo esas; las pasadas de revisión están en el Review Triage Log). Desviación de implementación, fuera del contrato: el corte no se hace con un `import` de `MAX_OBRAS_ANTES_DE_LAS_CITAS` en `ListaDeObras.astro`, sino con `partirLaListaDeObras` en `src/lib/obras.ts`, que ya importa `umbrales.ts`. Con el `import` directo, `dist/obras/index.html` cambiaba en bytes (mismo largo: la hoja de `ListaDeObras` y la del filtro del Directorio cambiaban de orden en el `<style>` en línea); se aisló con tres construcciones (sin el `import type`, sin el `Desplegable` en la Página de Autor, sin el `import` de umbrales: solo la última devolvía `/obras/` idéntico). KEEP: la prop `pliegue: typeof Desplegable | false` con `import type`, el `Desplegable` importado y pasado por la Página de Autor, `pliegue={false}` en `/obras/`.

## Review Triage Log

### 2026-11-07 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 4 (high 0, medium 1, low 3)
- defer: 0
- reject: 24 (high 0, medium 3, low 21)
- addressed_findings:
  - `[medium]` `[patch]` La identidad de `/obras/` (AC) solo la guardaba un `shasum` a mano, y lo frágil es el orden de las hojas de componente de su `<style>` en línea (blind-hunter, verification-gap, intent-alignment): nueva prueba en `tests/unit/lista-de-obras.test.ts` que fija esa secuencia por el primer selector de cada hoja; con el `import` de `umbrales.ts` repuesto a mano en `ListaDeObras.astro` falla (`.lista-de-obras` cambia de sitio), y sin él pasa.
  - `[low]` `[patch]` Comentarios rancios que decían que ninguna superficie pinta un `<details>` (verification-gap, «Other findings»): `tests/e2e/desplegable.spec.ts` y `tests/e2e/ayuda/desplegables.ts`, al día con la Página de Autor plegada.
  - `[low]` `[patch]` Cifras del Corpus escritas en comentarios («59 Obras» de Barrett) que ya no casan (blind-hunter): fuera de `src/lib/umbrales.ts` y de `tests/e2e/pagina-de-autor.spec.ts`; queda la medida del diseño (3.249 px).
  - `[low]` `[patch]` La pasada abierta de `accesibilidad.spec.ts` sobre `autorConMasObras()` pasaría en vacío si ese Autor no plegara (edge-case-hunter): solo entra si tiene más de `MAX_OBRAS_ANTES_DE_LAS_CITAS` Obras.

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3 (high 0, medium 1, low 2)
- defer: 1 (low 1)
- reject: 19 (high 0, medium 2, low 17)
- addressed_findings:
  - `[medium]` `[patch]` La describe «Historia 34.2» de `tests/e2e/pagina-de-autor.spec.ts` se saltaba entera si Barrett dejaba de plegar (blind-hunter, intent-alignment): ahora pasa a `autorConMasObras()` con una anotación `sustituto`, y falla —no se salta— si ningún Autor del Corpus tiene más de `MAX_OBRAS_ANTES_DE_LAS_CITAS` Obras.
  - `[low]` `[patch]` `partirLaListaDeObras` con un umbral 0, negativo o no entero (edge-case-hunter): toma el umbral como parámetro con `MAX_OBRAS_ANTES_DE_LAS_CITAS` por omisión y lanza si no es un entero ≥ 1; prueba nueva en `tests/unit/lista-de-obras.test.ts` (0, −1, 1.5, NaN), que sin la guarda falla.
  - `[low]` `[patch]` Contabilidad de la spec (blind-hunter, ac-auditor): el criterio de Barrett ya no fija «hoy 56» (n sale del Corpus del día) y el Spec Change Log aclara que `review_loop_iteration` cuenta solo vueltas de bad_spec.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** La Lista de Obras de la Página de Autor enseña `MAX_OBRAS_ANTES_DE_LAS_CITAS` (3) Obras y pliega el resto en el `Desplegable` de la 34.0, rotulado «Y {m} obras más» / «Y una obra más»; `/obras/` no se pliega y su HTML es idéntico byte a byte.

**Ficheros.**
- `src/lib/umbrales.ts` — `MAX_OBRAS_ANTES_DE_LAS_CITAS = 3`, literal y comentado.
- `src/lib/atribucion.ts` — `rotuloDeObrasPlegadas(m)`, que lanza con m no entero o < 1.
- `src/lib/obras.ts` — `partirLaListaDeObras`, el único corte (ver Spec Change Log).
- `src/components/ListaDeObras.astro` — prop obligatoria `pliegue: typeof Desplegable | false` (solo tipo), dos `<ul>` con la misma fila y la misma zona cuando pliega; cabecera al día.
- `src/pages/autor/[slug]/[...page].astro` — importa `Desplegable` y lo pasa; `src/pages/obras.astro` — `pliegue={false}`.
- `tests/unit/lista-de-obras.test.ts` — rótulo (1, 2, 56; lanza con 0, −1, 1.5, NaN), corte puro, y construcción con Autores de 5, 4 y 3 Obras y `/obras/` sin `<details` ni `desplegable`.
- `tests/unit/desplegable.test.ts` — fuera la prueba temporal de la 34.0.
- `tests/e2e/ayuda/corpus.ts` — `obrasPorAutor()` y `autorConMasObras()`.
- `tests/e2e/pagina-de-autor.spec.ts` — la de 44 px abre los desplegables y exige cada `href` una vez; describe «Historia 34.2» con Barrett.
- `tests/e2e/accesibilidad.spec.ts` — el Autor con más Obras en `SUPERFICIES`; `TITULOS_QUE_COMPARTEN_FILA` abre los desplegables antes de medir.
- `AGENTS.md` — § Directorio de Obras y viñeta del Desplegable.

**Revisión.** Capas externas sin hallazgos en esta pasada: 0 parches, 0 diferidos, 0 rechazados. `followup_review_recommended: false` (0 parcheados; puntuación 0).

**Verificación.**
- `FECHA_JORNADA=2026-11-07 npx astro build` antes y después: `dist/obras/index.html` y `dist/sitemap-0.xml` idénticos (`shasum -c` de `.claude/v9-ralph/logs/s-34/dist-antes-34.2.sha`); las 104 Páginas de Autor de tres Obras o menos, idénticas fuera del `<style>` (sección `obras-del-autor` idéntica); las 31 plegadas, mismos `href` en el mismo orden, un `<details>` cerrado con el rótulo correcto y la línea sin obra tras él. NFR-5: 5120 superficies a 3 saltos o menos.
- `npx astro check`: 0 errores; sin `pliegue` en `/obras/`, 1 error ts(2322).
- `npx vitest run` de lista-de-obras (30), desplegable + directorio-de-obras + tipografia-en-tokens (55, sin tocar `EXCEPCIONES`), medicion + ingreso-construido (728): verde.
- Playwright `pagina-de-autor.spec.ts` en movil y escritorio: 42 pasan, 2 omitidas ya existentes (17.4, semblanza ajena). Barrett hoy tiene 57 Obras: «Y 54 obras más», cerrado, primera Cita a 865 px a 360 × 640.
- Playwright accesibilidad + tipografia-calculada + directorio-de-obras + filtro-del-directorio + pagina-de-autor en escritorio: 218 pasan, 1 omitida (la misma); axe y foco de `/autor/rafael-barrett/` cerrados y abiertos en verde; instantáneas de tipografía sin regrabar.
- `npm test`: 155 ficheros, 7175 pruebas, verde.

**Riesgos residuales.** La cifra de Barrett del commit es la del bucle; la de Héctor queda diferida (frontmatter). El orden de las hojas en línea de Astro depende del grafo de importaciones: un `import` nuevo en `ListaDeObras.astro` puede volver a mover `/obras/` (anotado en AGENTS.md).

### Pasada de revisión del 2026-11-08

**Hallazgos.** Cinco capas externas. 4 parches (1 medio, 3 bajos; ver Review Triage Log), 0 diferidos nuevos (la medida de Barrett de Héctor ya constaba), 24 rechazados: decisiones del contrato (la prop `typeof Desplegable | false`, la hoja del Desplegable en toda Página de Autor, el rótulo «Y {m} obras más»), coberturas ya existentes (páginas 2+ de un Autor que pliega, zonas de los dos `<ul>`, la secuencia 26.4), mejoras de prueba sin defecto que corregir (filete medido, Espacio, medida con 4 Obras, `salida-interna` de lo plegado, Ingreso encendido sobre una Lista plegada, que no se admite por declaración) y fragilidades no demostradas (expresiones regulares de la prueba, recuento de `obrasPorAutor`). El `sprint-status.yaml` lo escribe el paso de cierre del bucle.

**Ficheros de esta pasada.** `tests/unit/lista-de-obras.test.ts` (orden de hojas de `/obras/`), `tests/e2e/accesibilidad.spec.ts` (filtro del Autor plegado), `tests/e2e/desplegable.spec.ts` y `tests/e2e/ayuda/desplegables.ts` (comentarios), `tests/e2e/pagina-de-autor.spec.ts` y `src/lib/umbrales.ts` (comentarios sin cifras del Corpus).

**Seguimiento.** `followup_review_recommended: true` (parcheados: 0 altos, 1 medio, 3 bajos; puntuación 3 × 1 + 3 = 6 ≥ 5).

**Verificación.**
- `npx vitest run tests/unit/lista-de-obras.test.ts -t "34.2"`: 11 pasan; con el `import` de `umbrales.ts` repuesto en `ListaDeObras.astro`, la prueba nueva falla, y se devolvió el componente a su estado.
- `npx astro check`: 0 errores.
- `FECHA_JORNADA=2026-11-07 npx astro build`: termina (NFR-5 no rompe); `dist/obras/index.html` y `dist/sitemap-0.xml` dan OK contra `dist-antes-34.2.sha`.
- Playwright `accesibilidad.spec.ts`, `desplegable.spec.ts` y `pagina-de-autor.spec.ts` en escritorio: 177 pasan, 1 omitida (la ya existente).
- `npm test`: 155 ficheros, 7176 pruebas, verde.

**Riesgos residuales.** La secuencia fijada de `/obras/` cambia también con una decisión legítima que toque sus componentes; entonces se actualiza en el mismo commit, a propósito.

### Segunda pasada de revisión del 2026-11-08

**Hallazgos.** Cinco capas externas (verification-gap sin hallazgos). 3 parches (1 medio, 2 bajos; ver Review Triage Log), 1 diferido nuevo (la salida a una Obra plegada no se distingue de la de una a la vista; zona nueva de Héctor), 19 rechazados: decisiones del contrato ya juzgadas (hoja del Desplegable en toda Página de Autor, la prop como componente, la regla de AGENTS.md sobre pasarlo por prop), mejoras de prueba sin defecto (filete medido, Espacio y tabulabilidad de lo plegado, espera de fuentes, prueba de tipos de `astro check` sin `pliegue`, Ingreso encendido sobre una Lista plegada, que la declaración ya veda), redacción interna (IIFE y la comprobación redundante de `ListaDeObras.astro`), la guarda en tiempo de ejecución de `pliegue` (la prop es obligatoria y `astro check` la exige), `obrasPorAutor` frente a `obrasDelAutor` (hoy concuerdan: «Y 54» con 57 Obras en las dos), y la cifra de Héctor, que ya consta diferida.

**Ficheros de esta pasada.** `src/lib/obras.ts` (umbral por parámetro con guarda), `tests/unit/lista-de-obras.test.ts` (prueba de la guarda), `tests/e2e/pagina-de-autor.spec.ts` (Barrett o, si no pliega, el Autor con más Obras; falla si ninguno pliega), y esta spec (criterio de Barrett sin «hoy 56», nota del Change Log, diferido).

**Seguimiento.** `followup_review_recommended: true` (parcheados: 0 altos, 1 medio, 2 bajos; puntuación 3 × 1 + 2 = 5 ≥ 5). Es la última ronda del bucle; los parches son pequeños y están verificados.

**Verificación.**
- `npx vitest run tests/unit/lista-de-obras.test.ts`: 32 pasan (la guarda nueva incluida; sin la guarda, 0, −1, 1.5 y NaN no lanzan y la prueba falla).
- `npx astro check`: 0 errores.
- `FECHA_JORNADA=2026-11-07 npx astro build`: termina (NFR-5 no rompe); `dist/obras/index.html` y `dist/sitemap-0.xml` OK contra `dist-antes-34.2.sha`.
- Playwright `pagina-de-autor.spec.ts` en movil y escritorio: 42 pasan, 2 omitidas (17.4, ya existentes); la describe 34.2 corre sobre Barrett.
- `npm test`: 155 ficheros, 7177 pruebas, verde.

**Riesgos residuales.** Los de la pasada anterior; la sustitución de Barrett solo se anota, y el criterio que lo nombra sigue esperando la medida de Héctor.
