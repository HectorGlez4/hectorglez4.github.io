---
title: 'Historia 34.0 — La primitiva de Desplegable'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: '9b33277f97ac5ea2042dcb0af2cebd0073a8e4ed'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-34-context.md'
warnings: [oversized]
deferred:
  - summary: 'El glifo de despliegue «›» (U+203A), girado 90° al abrir, es provisional: pendiente de Héctor (bmad-ux).'
    evidence: 'epics.md Story 34.0 lo marca [ASSUMPTION]; DESIGN.md § Primitivas → Iconografía solo exige que sea del subconjunto latin y sin fuente propia. Comparte glifo con el avance de FilaDeBloque.'
    severity: low
  - summary: 'Cierre: la fila 34-0-la-primitiva-de-desplegable de sprint-status.yaml debe llevar en su comentario en línea que se funde sola en la principal, antes que la Épica 30 (excepción con nombre, como la 23.12).'
    evidence: 'epics.md Story 34.0, último Given; epic-34-context.md § Cross-Story Dependencies.'
    severity: low
  - summary: >-
      Un solo filete entre desplegables que el consumidor envuelve (un `<li>` por desplegable en una Lista de Obras plegada) no está decidido: `.desplegable + .desplegable` solo alcanza a hermanos directos. Pendiente de Héctor (bmad-ux).
    evidence: |-
      Revisión 34.0, blind-hunter. DESIGN.md/EXPERIENCE.md no dicen cómo se pliega una lista de bloques envueltos; la hoja no puede nombrar el envoltorio ajeno (selector vigilado).
    location: >-
      src/components/Desplegable.astro (.desplegable + .desplegable)
    severity: medium
  - summary: >-
      Si un Desplegable puede contener otro (y con qué filetes y medida) no está decidido. Pendiente de Héctor (bmad-ux).
    evidence: |-
      Revisión 34.0, blind-hunter. Ninguna historia de la v9 lo pide hoy; anidar duplicaría filetes y heredaría `max-inline-size`.
    location: >-
      src/components/Desplegable.astro
    severity: low
  - summary: >-
      El esquema de encabezados de una sección que se pliega: el `<summary>` no admite `h1`…`h6` (NFR-9), así que la sección deja de figurar en la navegación por encabezados, y no está dicho qué nivel llevan los de dentro. Pendiente de Héctor (bmad-ux).
    evidence: |-
      Revisión 34.0, blind-hunter. UX-DR143/UX-DR146 fijan el rótulo sin encabezado, pero no qué pasa con el esquema de la página.
    location: >-
      src/components/Desplegable.astro (summary)
    severity: medium
  - summary: >-
      Sin estado de puntero ni de pulsación en el `<summary>` (solo `cursor: pointer` y el glifo), y su texto va en `--tinta-apagada`. Si basta como señal de control lo decide Héctor (bmad-ux); el contraste lo mide ya axe en `tests/e2e/desplegable.spec.ts`.
    evidence: |-
      Revisión 34.0, blind-hunter. La primitiva copia el Rótulo de sección, que no es control; DESIGN.md no da trato de puntero a lo plegado.
    location: >-
      src/components/Desplegable.astro (summary)
    severity: low
  - summary: >-
      Qué hace un desplegable cerrado ante un `#ancla` a algo de dentro (Safari no lo abre), al imprimir y con `:target`: no está decidido. Pendiente de Héctor (bmad-ux).
    evidence: |-
      Revisión 34.0, blind-hunter. EXPERIENCE.md no trata ni la impresión ni los fragmentos de lo plegado; abrir por `hashchange` exigiría guion, que la primitiva no lleva.
    location: >-
      src/components/Desplegable.astro
    severity: low
  - summary: >-
      `max-inline-size: var(--medida-prosa)` se impone a todo consumidor, también al contenido que no es prosa (Lista de Obras, ediciones), y la API no tiene salida. Pendiente de Héctor (bmad-ux) antes de la 34.2.
    evidence: |-
      Revisión 34.0, blind-hunter. Lo fija el contrato de la historia (Boundaries); la API es solo `rotulo` y la hoja no puede ser pisada desde fuera sin romper la guardia de selectores.
    location: >-
      src/components/Desplegable.astro (.desplegable)
    severity: medium
---

<intent-contract>

## Intent

**Problem:** La v9 pliega bloques en la Página de Cita, la de Obra, la Lista de Obras y la de Personaje (30.3, 30.4, 31.2, 32.3–32.5, 33.2, 34.2, 35.3), y sin una primitiva única cada historia escribiría su propio `<details>` con su trato, su glifo y su accesibilidad.

**Approach:** Un solo componente, `src/components/Desplegable.astro`: `<details>` nativo cerrado, `<summary>` con solo el texto del rótulo (prop) y un glifo `aria-hidden`, contenido por `slot`, estilos solo con tokens y solo sobre su marcado; se niega a un contenido vacío. Ninguna página lo importa todavía, así que `dist/` no cambia. Se prueba renderizado en una sonda de una copia y el barrido e2e gana un paso con todos los `<details>` abiertos.

## Boundaries & Constraints

**Always:**
- API mínima y documentada en la cabecera del componente: `interface Props { rotulo: string }` y el `slot` por omisión. Nada más (ni `open`, ni `id`, ni `zona`, ni `nivel`).
- `<details class="desplegable">` sin atributo `open`; `<summary>` con `{rotulo}` y el glifo en `<span aria-hidden="true">`; ningún `h1`…`h6` dentro; sin `data-zona`, sin `<script>`, sin `data-ingreso`, sin `data-pagefind-*`.
- Glifo: «›» (U+203A), pegado al rótulo con `&nbsp;` dentro del mismo `span` de texto (patrón de `FilaDeBloque`), girado 90° con `details[open]` (sin transición). Nunca «→» (U+2192), nunca `content:` de CSS ni SVG.
- `<summary>`: trato del Rótulo de sección —`var(--sans)`, `var(--autor)`, `var(--peso-fuerte)`, `var(--interlineado-autor)`, `letter-spacing: 0.09em`, mayúsculas, `var(--tinta-apagada)`—; `list-style: none` y `::-webkit-details-marker { display: none }`; `display: flex; align-items: center; min-block-size: var(--zona-de-toque)`; sin subrayado ni siena; sin regla de foco propia (manda el anillo global de `tokens.css`).
- Plano: `border-block: var(--grosor-filete) solid var(--filete)` en cada `.desplegable` y `.desplegable + .desplegable { border-block-start: none }` (filete encima de cada rótulo y debajo del último); sin fondo ni radio; `max-inline-size: var(--medida-prosa)`. Contenido en `<div class="contenido">` con `padding-block: calc(var(--unidad) * 2) calc(var(--unidad) * 3)`.
- Contenido vacío —sin `slot` o con `slot` que renderiza solo espacio en blanco (`await Astro.slots.render('default')`)— lanza un `Error` que nombra el rótulo: `Desplegable «{rotulo}» sin contenido: quien lo usa no lo renderiza (UX-DR144)`.
- `<style>` con ámbito de Astro: cada selector solo nombra `details`, `summary`, `span`, `div` o las clases que el propio marcado pinta (`desplegable`, `contenido`, `glifo` o equivalentes), sin `:global`, sin `slot` ajeno, sin elementos de fuera.

**Block If:**
- La compilación o la construcción de la sonda revelan que Astro 7 no permite detectar el `slot` vacío en el componente (ni `Astro.slots.has` ni `Astro.slots.render`): HALT, no se sustituye por otra regla.
- `dist/` del sitio real cambia algún fichero tras añadir el componente (construido en la misma jornada antes y después).

**Never:**
- Importar el componente desde ninguna página o componente del sitio; construir ningún consumidor (Lista de Obras plegada, desplegables de Cita u Obra).
- Tocar `GUIONES_EXTERNOS`, `src/lib/vocabulario.ts`, las zonas, `src/lib/umbrales.ts`, `tokens.css` ni los artefactos de `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.
- Añadir excepción a `tests/unit/tipografia-en-tokens.test.ts` o una fuente/subconjunto propio.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Con contenido | `<Desplegable rotulo="Cómo citar"><p>x</p></Desplegable>` | `<details class="desplegable">` sin `open`; `<summary>` cuyo texto es «Cómo citar» + glifo oculto; `<p>x</p>` dentro de `.contenido` | — |
| Sin slot | `<Desplegable rotulo="Cómo citar" />` | La construcción para | `Error` con «Desplegable «Cómo citar» sin contenido» |
| Slot en blanco | `<Desplegable rotulo="Lee el pasaje">   </Desplegable>` | La construcción para | Mismo error, nombrando «Lee el pasaje» |
| Dos seguidos | dos `<Desplegable>` hermanos | un filete entre ellos, no dos | — |
| Teclado | foco en el `<summary>`, Intro o Espacio | abre/cierra; el foco sigue en el `<summary>` | — |

</intent-contract>

## Code Map

- `src/components/Rotulo.astro` -- trato del Rótulo de sección a copiar en el `<summary>` (mismos literales y tokens, `letter-spacing: 0.09em`). No se reutiliza el componente: pinta un `h2`/`h3` y el `<summary>` no admite encabezado.
- `src/components/FilaDeBloque.astro` -- referencia del glifo «›» en `span aria-hidden` pegado con `&nbsp;`, y del comentario de cabecera largo que documenta por qué; zona de toque con `--zona-de-toque`.
- `src/styles/tokens.css` -- tokens disponibles: `--sans --autor --peso-fuerte --interlineado-autor --tinta-apagada --filete --grosor-filete --unidad --zona-de-toque --medida-prosa`; anillo de foco global.
- `tests/unit/ayuda/construir.ts` -- `construirConCorpus(corpus, { paginas: { 'sonda-….astro': … } })` (l. 99) monta una copia y construye; `paginaConstruida`, `limpiar`, `AUTOR_VALIDO`, `TEMA_VALIDO`, `citaValida`. Las sondas sin `Armazon` no necesitan declararse en `superficies.ts` (ver `anunciableEnElSitemap`, `src/lib/superficies.ts` ~l. 745).
- `tests/unit/tarjeta-de-obra.test.ts` -- patrón de sonda que rompe la construcción (l. 552–570: `expect(codigo).not.toBe(0)` y `toMatch` sobre `salida`) y de sonda que construye (l. 620–650); helpers `sinComentarios`, lectura de la plantilla tras el frontmatter (l. 275–286).
- `tools/lib/cobertura.ts` -- `revisarCobertura(paginas, css)` (l. 208) y `rangosPorFamilia`; `integraciones/cobertura.ts` (`hojasDeEstilo`, no exportada) junta `<style>` en línea con `@font-face` y los `.css` de `dist/`. El `unicode-range` real de Inter `latin` incluye `U+2000-206F`.
- `tests/unit/tipografia-en-tokens.test.ts` -- recorre todo `.astro` de `src/`; el componente nuevo debe pasar sin tocar `EXCEPCIONES`.
- `tests/e2e/accesibilidad.spec.ts` -- `SUPERFICIES` (l. 184); describe de axe (l. 352–369) y prueba de foco (l. 564–620, selector de enfocables sin `summary`). Hoy ningún fichero de `src/` pinta `<details>`.
- `AGENTS.md` § «Conventions that differ from defaults» -- gana la convención del Desplegable.

## Tasks & Acceptance

**Execution:**
- (antes de escribir código) construir el sitio real en la misma jornada (`FECHA_JORNADA=2026-11-07 npx astro build`) y guardar `find dist -type f | sort | xargs shasum` en `/Users/hec/brainlySabiduria/.claude/v9-ralph/logs/s-34-0/dist-antes.sha` -- línea base para «`dist/` no cambia».
- `src/components/Desplegable.astro` -- crear con la cabecera documentada (qué es, API `rotulo` + slot, quién lo usará, por qué sin encabezado, sin guion ni zona, por qué el glifo y que es provisional, la negativa ante lo vacío, por qué los estilos solo tocan su marcado) y el marcado/estilos de Boundaries -- primitiva única de UX-DR117/143/144/145/146.
- `tests/unit/desplegable.test.ts` -- crear: (a) estática sobre la fuente: props exactas `['rotulo']` obligatoria `string`; plantilla con `<details class="desplegable">` sin `open`, glifo `U+203A` en `span aria-hidden="true"`, sin `<script`, `data-zona`, `data-ingreso`, `<h[1-6]`, `content:`, `<svg`, `→`; (b) estilos: cada selector del `<style>` solo nombra elementos y clases del propio marcado, sin `:global` (falla con una regla ajena, probada con un caso negativo sobre una cadena); (c) una construcción con sonda (Corpus mínimo de `construir.ts`) que pinta un desplegable con contenido y dos seguidos: HTML con `<details` sin `open`, el texto del `<summary>` sin el glifo igual al rótulo, ningún `h1`…`h6` en el `<summary>`, el contenido dentro; y `revisarCobertura` sobre esa página con el CSS emitido de la copia (`<style>` con `@font-face` + `.css` de `dist/`) da `ok` y el CSS trae familias; (d) dos sondas que rompen: sin slot y con slot en blanco, salida con «Desplegable «…» sin contenido» nombrando el rótulo -- fija la primitiva fuera de toda página (AD-21).
- `tests/e2e/accesibilidad.spec.ts` -- añadir, para cada `ruta` de `SUPERFICIES`, un barrido axe tras `document.querySelectorAll('details').forEach((d) => { d.open = true; })`, y en la prueba de foco una segunda pasada con los `<details>` abiertos y `summary` en el selector de enfocables (extraer el recorrido a una función y llamarla cerrado y abierto) -- cada uso futuro se barre cerrado y abierto sin escribir su paso.
- `AGENTS.md` -- en «Conventions that differ from defaults», una viñeta: todo lo que se pliega usa `src/components/Desplegable.astro` (`<details>` nativo cerrado, rótulo en el `<summary>` sin encabezado, sin guion ni zona; lo de dentro declara su zona), ningún componente escribe su propio `<details>`, y un desplegable sin contenido no se pinta: quien lo usa no lo renderiza y el componente detiene la construcción.
- (al final) reconstruir en la misma jornada y comparar con `dist-antes.sha`: idéntico.
- Cierre (paso de cierre del bucle, no de implementación): `sprint-status.yaml`, solo la fila `34-0-la-primitiva-de-desplegable`, con comentario en línea «se funde sola en la principal, antes que la Épica 30 (excepción con nombre, como la 23.12)».

**Acceptance Criteria:**
- Given la sonda construida, when se abre en un navegador sin guion, then el desplegable está cerrado, Intro o Espacio sobre el `<summary>` lo abre sin mover el foco, y el `<summary>` mide al menos `--zona-de-toque` de alto.
- Given `npx vitest run tests/unit/tipografia-en-tokens.test.ts`, when corre con el componente nuevo, then pasa sin excepción nueva.
- Given el sitio real construido en la misma jornada antes y después, when se comparan las sumas de `dist/`, then no cambia ningún fichero, y `GUIONES_EXTERNOS`, `vocabulario.ts` y `umbrales.ts` siguen idénticos (`git diff --stat` no los nombra).
- Given `tests/e2e/accesibilidad.spec.ts` con el paso nuevo, when corre en local, then los resultados no cambian (hoy no hay `<details>` en ninguna superficie).

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

(Primera pasada de la implementación, sin hallazgos: las capas externas aún no habían corrido. La sustituye la pasada 1 de abajo.)

### 2026-11-07 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 8 (high 0, medium 2, low 6)
- defer: 6 (medium 3, low 3)
- reject: 7 (medium 0, low 7)
- addressed_findings:
  - `[medium]` `[patch]` La pasada de foco con lo plegado cerrado no contaba el `<summary>` y sí lo de dentro de un `<details>` cerrado (tope mal medido, paradas sin marca). Ahora `ENFOCABLES` lleva `summary` en las dos pasadas y `recorrerElFoco` descarta lo inalcanzable, también anidado (`tests/e2e/ayuda/desplegables.ts`).
  - `[medium]` `[patch]` La pasada abierta del e2e y el teclado no habían corrido nunca. Nuevo `tests/e2e/desplegable.spec.ts`: sonda construida en una copia (AD-21, puerto 4404) con siete desplegables; corre `auditar` y `recorrerElFoco` cerrados y abiertos (exige que abra siete), Tab para solo en los `<summary>`, Intro y Espacio abren y cierran sin mover el foco, el glifo gira 90° sin desplazar su centro, lo de encima no se mueve, el `<summary>` mide al menos `--zona-de-toque`, sin marcador y un solo filete entre hermanos. Las tres funciones salen de `accesibilidad.spec.ts` a esa ayuda.
  - `[low]` `[patch]` La negativa ante lo vacío solo veía espacio en blanco: ahora también comentarios, `&nbsp;` y elementos sin texto, salvo medios y controles; sonda que rompe con ese caso.
  - `[low]` `[patch]` Un rótulo en blanco dejaba el `<summary>` sin nombre accesible: detiene la construcción (NFR-9); sonda que rompe.
  - `[low]` `[patch]` El glifo giraba con el `&nbsp;` dentro de su caja: gira solo `.giro`, el «›».
  - `[low]` `[patch]` La guardia «ningún componente escribe su propio `<details>`» compartía prueba con la temporal «nadie lo importa»: va en la suya, permanente, y mira también `public/islas/`, `.js`/`.tsx`/`.mjs` y `createElement('details')`.
  - `[low]` `[patch]` La prueba de cobertura exige que Inter esté entre las familias juzgadas.
  - `[low]` `[patch]` La sonda construida afirma sin `<script>` en la página y sin `data-zona`, `data-ingreso` ni `data-pagefind` en cada desplegable; el espacio que pega el glifo se exige que no parta (`&nbsp;` o U+00A0, escrito como escape).

Rechazados: el mensaje de error no nombra la página (la salida de `astro build` la nombra, y el texto lo fija el contrato); «la prueba admite un espacio que parte» (la alternativa era U+00A0, ahora escrita como `\u00a0`); la guardia de selectores ingenua ante selectores que la hoja no usa; compatibilidad con navegadores viejos sin evidencia; el comentario de `sprint-status.yaml` (lo escribe el paso de cierre del bucle, ya diferido); `<details>` insertados por islas (ninguna lo hace y ahora lo vigila la guardia); la identidad de `dist/` fuera de las pruebas (verificada fuera de banda, idéntica).

### 2026-11-07 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 9 (high 0, medium 1, low 8)
- defer: 0
- reject: 22 (medium 0, low 22)
- addressed_findings:
  - `[medium]` `[patch]` La excepción «un medio o un control también es contenido» no la ejercía ninguna construcción (verification-gap): la sonda construida gana un desplegable con solo una `<img>`, que construye y la lleva dentro de `.contenido`.
  - `[low]` `[patch]` Un rótulo ausente daba un `TypeError` sin nombre (`astro build` no comprueba tipos): la guarda mira `typeof rotulo !== 'string'`; sonda que rompe sin `rotulo`.
  - `[low]` `[patch]` Un desplegable anidado y cerrado giraba su glifo con el de fuera abierto: `.desplegable[open] > summary .giro`, fijado en la prueba de la hoja.
  - `[low]` `[patch]` `abrirLosDesplegables` contaba los `<details>`, no los abiertos, y un acordeón exclusivo (`name`) dejaba uno solo: quita `name` y cuenta los que quedan abiertos; la sonda e2e lo prueba con `name` puesto.
  - `[low]` `[patch]` El teclado solo probaba Intro abre y Espacio cierra: también Espacio abre sin desplazar la página e Intro cierra.
  - `[low]` `[patch]` El trato del `<summary>` no se medía en un navegador (ac-auditor): toda la fila de ancho, mayúsculas, sin subrayado y en `--tinta-apagada`; y abierto, el contenido con 2× y 3× `--unidad` y el desplegable dentro de `--medida-prosa`.
  - `[low]` `[patch]` La convención de `AGENTS.md` no decía todo lo que la primitiva rechaza ni que la pasada abierta solo corre hoy en la sonda (puerto 4404).
  - `[low]` `[patch]` La prueba temporal «nadie lo importa» dice en su mensaje que la quita el primer consumidor (34.2 o la Épica 30).
  - `[low]` `[patch]` La contabilidad del spec: el primer bloque de resultado y la línea de la Matriz estaban rancios; `review_loop_iteration` queda en 0, porque ninguna pasada volvió atrás por `bad_spec`.

Rechazados: el comentario de `sprint-status.yaml` (lo escribe el paso de cierre del bucle; ya diferido); la identidad de `dist/` fuera de las pruebas (verificada de nuevo, idéntica); `<script>`, `<style>`, `<template>`, `hidden`, `<input type="hidden">`, botones vacíos, entidades de espacio raras, anchura cero y `>` en atributos como contenido (ningún consumidor los produce); las mayúsculas fuera de `latin` (las del español están en U+0000-00FF); `fileURLToPath` y `stdio` del servidor de la sonda (mismo patrón que `accesibilidad.spec.ts`); un registro de puertos; el marcador en Firefox y WebKit (un `<summary>` en `flex` deja de ser `list-item`, y el CI no corre e2e); el filtro de visibles en `recorrerElFoco` (el tope solo es cota con holgura); importaciones sin uso en `accesibilidad.spec.ts` (siguen usándose); la guardia fuera de `src/` y `public/islas/` y su `sinComentarios` ante globs (sin caso real); la aserción del CSS con ámbito (Astro fijado); lo exclusivamente intent-alignment ya cubierto o diferido.

## Design Notes

El `<summary>` no reutiliza `Rotulo.astro` porque ese pinta un encabezado y NFR-9 lo prohíbe dentro del `<summary>`; se copian sus cinco declaraciones tipográficas, que son tokens salvo `letter-spacing`, que la guardia de tipografía no vigila. Que un desplegable «que no existe» no deje hueco lo cumple quien lo usa, no renderizándolo; el componente solo garantiza que nunca sale vacío. El `<style>` se emite por el grafo de importaciones: por eso solo puede tocar su marcado —un selector de fuera cambiaría páginas que no lo usan cuando el primer consumidor lo importe—. Golden:

```astro
<details class="desplegable">
  <summary><span>{rotulo}<span class="glifo" aria-hidden="true">&nbsp;›</span></span></summary>
  <div class="contenido"><Fragment set:html={contenido} /></div>
</details>
```

(`contenido` = `await Astro.slots.render('default')`, validado no vacío tras `trim()`; si el `&nbsp;` dentro del `span` oculto rompe la comparación «texto del summary = rótulo», la prueba compara el texto sin el glifo.)

## Verification

**Commands:**
- `npx vitest run tests/unit/desplegable.test.ts` -- expected: verde.
- `npx vitest run tests/unit/tipografia-en-tokens.test.ts` -- expected: verde, sin tocar `EXCEPCIONES`.
- `npx vitest run tests/unit/medicion.test.ts` -- expected: verde (sin guion nuevo).
- `npx astro check` -- expected: 0 errores.
- `FECHA_JORNADA=2026-11-07 npx astro build` + `shasum` de `dist/` -- expected: idéntico a `dist-antes.sha`.
- `npx playwright test tests/e2e/accesibilidad.spec.ts --project=escritorio` (detached con `correr.sh`) -- expected: mismos resultados que antes.
- `npx playwright test tests/e2e/desplegable.spec.ts --project=escritorio` (detached) -- expected: verde; la sonda corre los barridos de axe y de foco cerrados y abiertos, el teclado, la zona de toque, el glifo y el filete.
- `npm test` (detached) -- expected: verde.

**Manual checks (if no CLI):**
- Servir la `dist/` de la copia de la sonda (o con `estatico`) y comprobar con el teclado: cerrado al cargar, Intro/Espacio abre y cierra, el foco no se mueve, el glifo gira y no hay marcador del navegador.

## Auto Run Result

Status: done
Blocking condition: ninguna

**Resumen.** Nace `src/components/Desplegable.astro`, la primitiva única de lo plegado: `<details class="desplegable">` cerrado, `<summary>` con solo el rótulo y el glifo «›» (U+203A) en un `span aria-hidden` pegado con `&nbsp;`, contenido en `.contenido`, hoja con ámbito de Astro y solo tokens (más `letter-spacing: 0.09em`), y una negativa que detiene la construcción ante un `slot` ausente o en blanco nombrando el rótulo. Ninguna página lo importa: `dist/` del sitio real no cambia.

**Ficheros.**
- `src/components/Desplegable.astro` — la primitiva, con la cabecera documentada (API, usos futuros, por qué sin encabezado, glifo provisional, negativa ante lo vacío, por qué la hoja solo toca su marcado).
- `tests/unit/desplegable.test.ts` — contrato estático (props, marcado, hoja, vigilante de selectores con casos negativos, nadie lo importa ni escribe `<details>`), sonda construida (cerrado, texto del `<summary>` = rótulo, sin encabezado, contenido dentro, dos seguidos con un solo filete, cobertura tipográfica con el CSS de la copia) y dos sondas que rompen (sin `slot`, `slot` en blanco).
- `tests/e2e/accesibilidad.spec.ts` — `auditar` y `recorrerElFoco` extraídos; cada superficie se barre con axe y se tabula también con todos los `<details>` abiertos (`summary` entre los enfocables). Sin ningún `<details>` en la página, la segunda pasada sería idéntica y no se repite: hoy no añade tiempo.
- `AGENTS.md` — convención del Desplegable en «Conventions that differ from defaults».

**Revisión.** (Sustituida por las pasadas de revisión de abajo.) Parches: 0. Diferidos nuevos: 0. Rechazados: 0.

**Verificación.**
- `npx vitest run tests/unit/desplegable.test.ts` — 11/11 verde.
- `npx vitest run tests/unit/tipografia-en-tokens.test.ts` — 6/6 verde, sin tocar `EXCEPCIONES`.
- `npx vitest run tests/unit/medicion.test.ts` — 687/687 verde.
- `npx astro check` — 0 errores, 0 avisos (8 sugerencias previas).
- `FECHA_JORNADA=2026-11-07 npx astro build` antes y después + `shasum` de `dist/` (10.433 ficheros) — idéntico a `logs/s-34-0/dist-antes.sha`.
- `npx playwright test tests/e2e/accesibilidad.spec.ts --project=escritorio` — 146 passed.
- `npm test` — 155 ficheros, 7.160 pruebas, verde.
- Comprobación manual (Chromium sin guion, sonda de una copia): al cargar cerrado; Tab lleva el foco al `<summary>`; Intro abre (glifo girado, `matrix(0, 1, -1, 0, 0, 0)`) con el foco en el `<summary>`; Espacio cierra; alto del `<summary>` 44 px; sin marcador.

**Matriz.** Con contenido, sin slot, slot en blanco y dos seguidos: pruebas de `desplegable.test.ts`. Teclado: `tests/e2e/desplegable.spec.ts` (desde la pasada 1 de revisión).

**Riesgos residuales.** El glifo es provisional (diferido a Héctor). El paso de cierre de `sprint-status.yaml` (comentario «se funde sola en la principal…») queda para el cierre del bucle.

### Revisión independiente (pasada 1, 2026-11-07)

**Resumen.** Ocho parches de la revisión externa: la pasada de foco cuenta el `<summary>` y descarta lo de dentro de un `<details>` cerrado; una sonda e2e en una copia hace correr por fin los barridos de axe y de foco con lo plegado abierto y comprueba el teclado, el foco, la zona de toque, el glifo, lo de encima y el filete en un navegador; la negativa ante lo vacío alcanza comentarios y elementos sin texto, y la de un rótulo en blanco; el glifo gira solo; la guardia de `<details>` escritos a mano es permanente y mira también las islas.

**Ficheros.**
- `src/components/Desplegable.astro` — negativa ante rótulo en blanco y contenido sin texto (salvo medios y controles); el giro va en un `span.giro` con solo el «›».
- `tests/unit/desplegable.test.ts` — glifo con `.giro`, espacio que no parte, sin guion ni marcas en la sonda construida, Inter entre las familias, dos sondas más que rompen, guardia de `<details>` en su propia prueba sobre `src/` y `public/islas/`.
- `tests/e2e/ayuda/desplegables.ts` — nuevo: `ENFOCABLES` (con `summary`), `recorrerElFoco` (solo lo alcanzable), `abrirLosDesplegables` y `auditar`, compartidos.
- `tests/e2e/accesibilidad.spec.ts` — usa la ayuda; mismas pasadas.
- `tests/e2e/desplegable.spec.ts` — nuevo: la sonda en el navegador (puerto 4404).

**Revisión.** Parches: 8 (alto 0, medio 2, bajo 6). Diferidos: 6, todos pendientes de Héctor (bmad-ux). Rechazados: 7. `followup_review_recommended: true` (puntuación 3 × 2 + 1 × 6 = 12).

**Verificación.**
- `npx vitest run tests/unit/desplegable.test.ts` — 14/14 verde.
- `npx vitest run tests/unit/superficies.test.ts tests/unit/tipografia-en-tokens.test.ts tests/unit/desplegable.test.ts` — 129/129 verde (la guardia del barrido acepta la ayuda nueva).
- `npx astro check` — 0 errores, 0 avisos.
- `npx playwright test tests/e2e/desplegable.spec.ts tests/e2e/accesibilidad.spec.ts --project=escritorio` — 151 passed (146 de antes + 5 de la sonda).
- `FECHA_JORNADA=2026-11-07 npx astro build` + `shasum` de `dist/` (10.433 ficheros) — idéntico a `logs/s-34-0/dist-antes.sha`.
- `npm test` — 155 ficheros, 7.165 pruebas, verde.

**Riesgos residuales.** Los seis diferidos de UX (filete entre envueltos, anidar, esquema de encabezados, señal de puntero, anclas e impresión, medida de prosa impuesta) llegan con la 34.2 y la Épica 30 si Héctor no los decide antes. La sonda e2e solo corre en local, como todo Playwright.

### Revisión independiente (pasada 2, 2026-11-07, la última)

**Resumen.** Nueve parches pequeños: la excepción de medios y controles la ejerce por fin una construcción; un rótulo ausente detiene la construcción con su mensaje; el glifo de un desplegable anidado cerrado no gira con el de fuera; la apertura del barrido cuenta los que quedan abiertos y deshace los acordeones exclusivos; el teclado prueba las cuatro combinaciones; el trato del `<summary>`, el espaciado del contenido y la medida se miden en el navegador; la convención de `AGENTS.md` y la contabilidad del spec, al día.

**Ficheros.**
- `src/components/Desplegable.astro` — guarda `typeof rotulo !== 'string'`; giro solo con `.desplegable[open] > summary .giro`.
- `tests/unit/desplegable.test.ts` — desplegable con solo una `<img>` en la sonda construida; sonda que rompe sin `rotulo`; selector del giro; mensaje de la prueba temporal.
- `tests/e2e/ayuda/desplegables.ts` — `abrirLosDesplegables` quita `name` y cuenta los abiertos.
- `tests/e2e/desplegable.spec.ts` — `name` puesto antes de abrir; Espacio abre sin desplazar e Intro cierra; ancho, mayúsculas, subrayado y tinta del `<summary>`; padding de `.contenido` y medida de prosa.
- `AGENTS.md` — la convención dice todo lo que se rechaza y dónde corre la pasada abierta.

**Revisión.** Parches: 9 (alto 0, medio 1, bajo 8). Diferidos: 0. Rechazados: 22. `followup_review_recommended: true` (puntuación 3 × 1 + 1 × 8 = 11), aunque es la última pasada del bucle.

**Verificación.**
- `npx vitest run tests/unit/desplegable.test.ts tests/unit/tipografia-en-tokens.test.ts` — 21/21 verde.
- `npx astro check` — 0 errores, 0 avisos (8 sugerencias previas).
- `npx playwright test tests/e2e/desplegable.spec.ts tests/e2e/accesibilidad.spec.ts --project=escritorio` — 152 passed (146 + 6 de la sonda); puertos libres después.
- `FECHA_JORNADA=2026-11-07 npx astro build` + `shasum` de `dist/` — idéntico a `logs/s-34-0/dist-antes.sha`.
- `npm test` — 155 ficheros, 7.166 pruebas, verde.

**Riesgos residuales.** Los seis diferidos de UX siguen pendientes de Héctor (bmad-ux). El comentario de la fila de `sprint-status.yaml` lo escribe el cierre del bucle.

## Verificación previa a la fusión — 2026-11-07 (UTC)

Puerta del bucle v9-ralph sobre `v9/34-0-desplegable`, con origin/main en a6e9b17ebc (ancestro de la rama, sin fusión que hacer; `proponer-claves` no escribió nada).

- `npm ci`: no hacía falta (package-lock.json igual que en main).
- `npm run build`: verde (5.295 páginas, NFR-5 y peso dentro del tope).
- `npx astro check`: 0 errores, 0 avisos.
- `npm test`: 155 ficheros, 7.166 pruebas, verde (912 s).
- `npm run test:e2e` (escritorio y móvil, receptor local en 8787): 1.100 pasadas, 108 omitidas, 4 fallidas, todas en `tipografia-calculada.spec.ts`. Las dos de `/obras/` eran la instantánea de la 26.12, que contaba 517 Obras donde la siembra ya ha dejado 518 (solo cambian recuentos, ningún peso ni interlineado); se regrabaron en 2f8b2a6c86. Las dos de `buscar-con-resultados` pasaron al repetirlas sin regrabar (inestables). El fichero entero, repetido: 28 pasadas.
- `dist/`: idéntico byte a byte al de la base construida desde main el mismo día (10.433 ficheros; comprobado por la implementación y por el auditor de aceptación en las dos rondas). Nada de `src/` importa `Desplegable.astro`.
- NFR-7: no aplica (el sitio construido no cambia).
- Vocabulario y migraciones: sin cambios; no hay despliegue de D1.
