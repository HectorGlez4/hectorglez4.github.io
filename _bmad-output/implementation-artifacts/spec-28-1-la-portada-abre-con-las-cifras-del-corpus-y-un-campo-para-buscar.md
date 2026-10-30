---
title: 'Historia 28.1 — La portada abre con las cifras del Corpus y un campo para buscar'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_revision: 'ec1a27d1566088f073ef3572b2c51c9c415ca765'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-28-context.md'
  - '{project-root}/AGENTS.md'
warnings: [oversized]
deferred:
  - summary: 'AD-11 dice todavía «cada una con su fuente» para la coletilla del censo vacío, y AD-17 «rotulada con el nombre del sitio»; manda la UX v8.2. Pendiente de Héctor (bmad-architecture).'
    evidence: 'epics.md, Historia 28.1, criterios marcados (v8.2)'
---

<intent-contract>

## Intent

**Problem:** La portada abre con un `h1` de marca dentro de `main` y salta directa a la Cita del Día: quien vuelve no lee qué hay en el Corpus ni tiene dónde buscar sin pasar por `/buscar/`, y Pagefind la indexa por ese `h1`, que la 28.1 tiene que sacar de `main`.

**Approach:** La marca de la Cabecera pasa a ser el único `h1` (solo en la portada); `main` abre con la línea de cifras —compuesta por una sola función nueva de `src/lib/publicado.ts`— y el Campo de búsqueda con botón «Buscar», como el del 404; los bloques quedan en el orden de UX-DR56 con su Rótulo de sección, todo `main` fuera de Pagefind, y el armazón declara el título de la portada a Pagefind.

## Boundaries & Constraints

**Always:**
- Línea con censo no vacío, literal: «{n} citas de {m} autores; {k} cotejadas con el texto de su fuente.»; con censo vacío: «{n} citas de {m} autores, cada una cotejada con el texto de su fuente.», «… de 1 autor, cada una …» y «1 cita de 1 autor, cotejada con el texto de su fuente.». Números con `milesEnEspañol` (`src/lib/formato.ts`). n = Citas publicadas, m = `autoresPublicados(...).length`, k = Citas con `esCitaDocumentada`. Nunca «cada una» mientras quede censo.
- Concordancia de número también con censo: «1 cita», «1 autor», «1 cotejada» (ver Design Notes).
- Campo: `CampoDeBusqueda` con `ETIQUETA_DE_LA_BUSQUEDA`, `TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA`, `nombre={PARAMETROS_DE_LA_BUSQUEDA.texto}` y `boton`, dentro de `<form role="search" action={rutaDeLaBusqueda()} method="get">`, como `src/pages/404.astro`. Sin guion, sin zona, sin `data-sin-zona` (no tiene enlaces).
- Orden en `main`: línea de cifras (primer elemento) → formulario → Cita del Día (o la `.entrada` sin apta) → [hueco de las Obras, 28.3] → Temas → Colecciones → Autores → `Sostener` (solo encendida).
- Espaciado: formulario a 3 × `--unidad` de la línea; Cita del Día / `.entrada` a 6 ×; cada `section` a 6 × y su contenido a 2 × de su rótulo (el 3 × de la Cita del Día ya lo pone `CitaDelDia.astro`).
- Todo lo que la portada pinta en `main` bajo `data-pagefind-ignore="all"`; el título de Pagefind lo declara `Armazon.astro`.
- Tokens de `tokens.css`, nunca literales de color o tipografía. Ningún `nowrap`.

**Block If:**
- La portada construida deja de salir en el índice de Pagefind o deja de leerse «Portada: Sabiduría de Bolsillo» con el elemento de título descrito en Design Notes y no hay otra forma de declararlo dentro de `data-pagefind-body` sin texto visible ni `h1` en `main`.
- La puerta de NFR-5 (`integraciones/alcance.ts`) o la prueba de dos jornadas rompen con el Corpus real: el tope no se relaja.

**Never:**
- No construir el bloque nuevo de la Cita del Día (Tarjeta de Obra, acciones, «Ver esta cita» en tinta, frase sin apta: 28.2), las seis Obras (28.3) ni los ocho Autores, criterios y cierres (28.4). No tocar `CitaDelDia.astro` ni el 404.
- No leer `corpus/pendientes-de-cotejo.yml` desde `src/` ni contar en `tools/lib/cifras.ts` ni en la página.
- No zonas ni exenciones nuevas; no tocar `src/lib/vocabulario.ts`; ningún guion nuevo.
- No editar `_bmad-output/planning-artifacts/` ni `_bmad-output/specs/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Censo con Citas | 3.494 Citas, 400 Autores, 3.473 documentadas | «3.494 citas de 400 autores; 3.473 cotejadas con el texto de su fuente.» | — |
| Censo vacío, varios Autores | 12 Citas, 3 Autores, todas documentadas | «12 citas de 3 autores, cada una cotejada con el texto de su fuente.» | — |
| Censo vacío, un Autor | 51 Citas de 1 Autor | «51 citas de 1 autor, cada una cotejada con el texto de su fuente.» | — |
| Censo vacío, una Cita | 1 Cita, 1 Autor | «1 cita de 1 autor, cotejada con el texto de su fuente.» | — |
| Censo, singulares | 2 Citas de 1 Autor, 1 documentada | «2 citas de 1 autor; 1 cotejada con el texto de su fuente.» | — |
| Sin Citas | 0 Citas | `undefined`: no hay línea | La portada sale sin ella |

</intent-contract>

## Code Map

- `src/pages/index.astro` -- la portada. Hoy: `<h1 class="marca-portada">` en `main` (l. 77, CSS l. 191), `CitaDelDia` o `.entrada`, secciones Temas/Colecciones/Autores con `<h2>` propios y `data-pagefind-ignore="all"` cada una, `Sostener` al final.
- `src/components/Armazon.astro` -- cabecera (`a.marca`, l. ~205, ya con `aria-current` vía `actualSi(portada)`), «Saltar al contenido.» → `#contenido` (= `main`), `main` con `data-pagefind-body` / filtro de tipo. CSS `.marca` (align-self flex-start; center ≥600px).
- `src/lib/publicado.ts` -- `autoresPublicados` (l. 170), `esCitaDocumentada` (l. 267); aquí va la función nueva de la línea.
- `src/lib/formato.ts` -- `milesEnEspañol` (punto de millar).
- `src/components/CampoDeBusqueda.astro` -- el Campo v8 con `boton`; uso de referencia en `src/pages/404.astro` (form `.formulario`).
- `src/lib/busqueda.ts` -- `ETIQUETA_DE_LA_BUSQUEDA`, `TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA`, `PARAMETROS_DE_LA_BUSQUEDA`, `rutaDeLaBusqueda` (de `superficies.ts`).
- `src/components/Rotulo.astro` -- Rótulo de sección (`h2`, prop `id` obligatoria, sin márgenes).
- `src/components/CitaDelDia.astro` -- solo lectura: su `h2` «La cita de hoy» y el 3 × ya están; único emisor de `data-jornada`.
- `src/lib/tipoDeResultado.ts` -- comentarios l. 37–41 («la portada responde solo por su `h1`»): actualizar al título declarado.
- `integraciones/cotejo.ts` -- solo lectura: garantiza que censo ⇔ Citas publicadas sin `fuente` (ver Design Notes).
- `tests/unit/ayuda/portada.ts` -- `exposicionDeLaPortada`: hoy busca el `h1` en `main`; lo usan `publicable-y-alcanzable.test.ts` (l. 960) y `coleccion-pagina.test.ts` (l. 551).
- `tests/unit/cotejo-build.test.ts` -- único fixture con censo no vacío que construye (caso l. 184; `CENSO_DE_PARTIDA`, `documento()`, `CUERPO_CON_LA_CITA`).
- `tests/unit/dos-jornadas.test.ts` -- ya exige igualdad fuera de `data-jornada`.
- `tests/e2e/portada.spec.ts` -- «un único h1» (l. 95); `tests/e2e/busqueda.spec.ts` (26.2, l. 505–590) fija «Portada: Sabiduría de Bolsillo»; `tests/e2e/cabecera.spec.ts` mide `a.marca`; `tests/e2e/accesibilidad.spec.ts` barre 320 px sobre `SUPERFICIES` (incluye `/`).

## Tasks & Acceptance

**Execution:**
- `src/lib/publicado.ts` -- añadir `lineaDeCifras(citas: readonly Cita[], autores: readonly Autor[]): string | undefined`, pura, con el comentario de la equivalencia censo ⇔ k < n; única redactora de la línea (AD-11).
- `src/components/Armazon.astro` -- con `esLaPortada` (ruta normalizada = `rutaDeLaPortada()`): envolver `a.marca` en `<h1 class="titulo-de-la-marca">` sin cambiar su aspecto (`margin: 0; font: inherit`, y el `align-self` de `.marca` pasa al `h1` en las dos anchuras); y, si además `enLaBusquedaPropia`, tras `<slot />` en `main`, `<span hidden data-pagefind-meta={`title:${MARCA}`}>{MARCA}</span>`. Actualizar el comentario de cabecera («La marca no es un `h1` (eso es de la 28.1)»).
- `src/pages/index.astro` -- quitar `.marca-portada` (marcado y CSS); envolver el contenido de `.pagina` en `data-pagefind-ignore="all"`; primero `<p class="cifras">{linea}</p>` (`--cuerpo-md`, `--tinta-apagada`, `margin: 0`, `max-width: var(--medida-prosa)`), luego el formulario a 3 × (`max-width: var(--medida-prosa)`), luego Cita del Día o `.entrada` a 6 ×, dejar un comentario donde entrará «Obras» (28.3), y Temas/Colecciones/Autores con `<Rotulo id=…>` y contenido a 2 ×. Actualizar el comentario de cabecera de la página.
- `src/lib/tipoDeResultado.ts` -- actualizar los comentarios que dicen que la portada responde por su `h1`.
- `tests/unit/publicado.test.ts` -- las seis filas de la matriz con tres Corpus de censo vacío (varios Autores, uno, una Cita) y los de censo, sobre arrays en memoria; una aserción de que con censo nunca sale «cada una».
- `tests/unit/cotejo-build.test.ts` -- caso nuevo (o ampliar l. 184): la Cita censada + una documentada de otro texto del mismo documento → construye y `dist/index.html` lleva, en el texto de `p.cifras`, «2 citas de 1 autor; 1 cotejada con el texto de su fuente.», sin «cada una» en esa línea.
- `tests/unit/ayuda/portada.ts` -- `exposicionDeLaPortada` toma como título el elemento de `main` con `data-pagefind-meta` `title:…` (su texto y su valor), cuenta los `h1` de `main` (0) y de la cabecera (1), y lo expuesto excluye solo ese elemento; ajustar `publicable-y-alcanzable.test.ts` y `coleccion-pagina.test.ts` a la nueva forma.
- `tests/unit/publicable-y-alcanzable.test.ts` -- en la construcción del 26.2: orden de los rótulos de `main` («La cita de hoy», «Temas», «Colecciones» si hay, «Autores»), `p.cifras` primer hijo de `main`→`.pagina`, formulario GET a `/buscar/` con `q`, sin `<script>` nuevo, y la línea del censo vacío con su forma.
- `tests/unit/dos-jornadas.test.ts` -- aserción explícita: `p.cifras` idéntica en las dos jornadas y fuera del subárbol `data-jornada`.
- `tests/e2e/portada.spec.ts` -- «un único h1» lo busca en `header.cabecera` (texto `MARCA`, `aria-current="page"`, 0 en `main`); la línea con el Corpus real cumple la forma con censo y no dice «cada una»; tras «Saltar al contenido.» el siguiente Tab va a `main input[name="q"]`; escribir y pulsar «Buscar» lleva a `/buscar/?q=…` (también con JavaScript desactivado), sin cargar guion fuera de la lista al enviar; distancias 3 × / 6 × / 2 × medidas; a 360 × 640 el texto de la Cita del Día empieza dentro de los 640 px; la caja de `a.marca` en `/` igual que en una Página de Cita a 360 y 1280 px.
- `tests/e2e/busqueda.spec.ts` -- actualizar el comentario de (a) («la marca en el `h1` de la portada»); (b) debe seguir pasando sin cambios de aserción.

**Acceptance Criteria:**
- Given la portada construida, when se recorre, then el único `h1` está en la cabecera con `aria-current="page"`, `main` no tiene ninguno, y en el resto de páginas la cabecera no lleva `h1`.
- Given la portada construida, when se lee `main`, then su primer contenido es la línea de cifras, siguen el formulario, la Cita del Día y las secciones «Temas», «Colecciones» (si hay) y «Autores» con sus `h2` literales.
- Given el índice de Pagefind, when se busca «Sabiduría de Bolsillo», then sale la portada rotulada «Portada» y nombrada «Portada: Sabiduría de Bolsillo», y ningún texto de la línea, el campo o los bloques la devuelve.
- Given dos jornadas, when se construye, then la línea de cifras es idéntica y la portada sigue sin `lastmod`.
- Given 320 px en las tres condiciones de la 26.9, when se carga `/`, then no hay desplazamiento horizontal.

## Design Notes

**Censo sin leer el YAML.** `integraciones/cotejo.ts` rompe el build si una Cita publicada sin `fuente` no está censada, si una censada declara `fuente` o si un slug censado no es Cita publicada. Por tanto «queda censo» ⇔ k < n, y la función decide con eso; el comentario lo cita.

**Concordancia.** La redacción 1 se escribe con plurales; con 1 se concuerda («1 cita», «de 1 autor», «1 cotejada»), igual que la UX hace explícito para el censo vacío. Solo afecta a Corpus de prueba.

**Título para Pagefind (verificado con Pagefind 1.5.2).** Un `data-pagefind-body` sin ninguna palabra indexable se descarta entero: `data-pagefind-meta="title:…"` sobre `main` con todo lo demás ignorado deja la portada fuera del índice. Un `<span hidden>` con el nombre como texto y como valor de `title:` la indexa con contenido «Sabiduría de Bolsillo» y título igual; `hidden` lo saca de la vista y del árbol de accesibilidad.

## Verification

**Commands:**
- `npx vitest run tests/unit/publicado.test.ts` -- verde.
- `npx vitest run tests/unit/cotejo-build.test.ts` / `publicable-y-alcanzable.test.ts` / `coleccion-pagina.test.ts` / `dos-jornadas.test.ts` / `alcance-construido.test.ts` / `medicion.test.ts` -- verde (uno por uno).
- `npx astro check` -- 0 errores.
- `npm run build` -- termina; la puerta de NFR-5 pasa con el Corpus real.
- `npx playwright test tests/e2e/portada.spec.ts tests/e2e/cabecera.spec.ts tests/e2e/busqueda.spec.ts --project=movil` y `--project=escritorio`, y `tests/e2e/accesibilidad.spec.ts -g "320|axe|h1"` -- verde, con el sitio de `tests/servidor.mjs` y el receptor local (puertos 4321 y 8787 libres).

## Review Triage Log

### 2026-10-30 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las capas de revisión son externas en el bucle v8-ralph y no traían hallazgos en esta pasada; sigue una revisión independiente.

### 2026-10-30 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 15: (high 0, medium 1, low 14)
- defer: 0
- reject: 27: (high 0, medium 0, low 27)
- addressed_findings:
  - `[medium]` `[patch]` Ninguna prueba buscaba en el índice real el texto que la portada deja fuera: la (c) de `tests/e2e/busqueda.spec.ts` busca ahora la línea de cifras sin números, «cotejadas» y la etiqueta del campo, y exige que no den `/`.
  - `[low]` `[patch]` Las dos ramas del enlace de la marca podían divergir: `publicable-y-alcanzable.test.ts` exige que `a.marca` lleve en la portada los mismos atributos que en el resto, salvo `aria-current`.
  - `[low]` `[patch]` Las secciones de la portada no se nombraban por su rótulo: llevan `aria-labelledby` con el `id` de su `Rotulo`, como en las demás páginas, y la prueba exige el `id` único. Se ajusta la expresión del parche de `alcance-construido.test.ts`.
  - `[low]` `[patch]` Con el criterio «dentro de la medida de prosa», las secciones (los chips) llevan `max-width: var(--medida-prosa)`.
  - `[low]` `[patch]` La línea de cifras heredaba el interlineado de `body-lg`: lleva el 1,6 de `body-md`, y una prueba de `portada.spec.ts` mide su cuerpo, color, peso e interlineado y que no tiene marcado dentro.
  - `[low]` `[patch]` Sin ninguna Cita publicada el formulario abría la columna con 3 × de aire: `.formulario:first-child` va sin margen.
  - `[low]` `[patch]` La rama sin Cita apta no comprobaba el orden: `coleccion-pagina.test.ts` exige `p.cifras`, `form.formulario`, `p.entrada` como primeros hijos de `.pagina`.
  - `[low]` `[patch]` La primera pantalla a 360 × 640 se daba por buena con el borde superior del texto: ahora exige la primera línea entera dentro de los 640 px.
  - `[low]` `[patch]` El nombre «no carga ningún guion más» prometía más de lo que miraba: se llama «el campo no trae Pagefind a la portada» (la lista cerrada la vigila `medicion.test.ts`).
  - `[low]` `[patch]` La prueba del formulario fijaba `/buscar/` y `q` a mano: usa `rutaDeLaBusqueda()` y `PARAMETROS_DE_LA_BUSQUEDA.texto`.
  - `[low]` `[patch]` El Campo de la portada no tenía comprobados etiqueta, ejemplo, `enterkeyhint`, ni el botón `submit` sin `name` tras el campo con su texto: lo exige ahora `publicable-y-alcanzable.test.ts`, con las constantes de `src/lib/busqueda.ts`.
  - `[low]` `[patch]` La prueba sin JavaScript no cerraba su contexto si fallaba: `try/finally`.
  - `[low]` `[patch]` El anillo de foco del campo no se medía en la portada: `/` entra en la prueba del anillo de `accesibilidad.spec.ts`.
  - `[low]` `[patch]` «La búsqueda arranca con ello» no se comprobaba: tras enviar, el campo de `/buscar/` trae lo escrito y pinta resultados o la salida.
  - `[low]` `[patch]` El envío con Intro no se probaba: prueba nueva en `portada.spec.ts`.

Rechazados, con su motivo: `sprint-status.yaml` lo mueve el orquestador del bucle; el registro vacío era de la pasada anterior; la suite tras el último cambio (solo un comentario) la cubrieron las pruebas por fichero de esta pasada; el desfase AD-11/AD-17 ya está diferido; enviar el formulario no es salida interna por el propio criterio; `tokens.css` no tiene regla de `h1`; el recuento de `title:` en otras páginas es a propósito; el `lastmod` lo fija ya `fecha-de-cambio-build.test.ts`; el corte de `data-jornada` y el slug de Cita de las e2e son de prueba y estables; la dependencia de Pagefind con el texto oculto está en los riesgos; las cifras de la matriz son ilustrativas; la concordancia con censo está en el contrato; la eficiencia de `autoresPublicados` es despreciable; una Cita sin Autor y una `MARCA` con coma no pueden darse (el esquema y la constante); «Autores» vacío sin Citas es previo e inalcanzable; «Obras» sin bloque es de la 28.3, que exige que sin Obras no haya rótulo; el censo por k < n lo garantiza la puerta de la 11.2; las tres formas de censo vacío las fija la función pura y dos construcciones; la línea con censo sobre `dist/` está en `cotejo-build.test.ts`; el salto lleva a `main`, cuyo primer hijo es la línea; el 3 × de «La cita de hoy» y su `h2` son de `CitaDelDia.astro`, que rehace la 28.2; la cabecera en dos filas en `/` se sigue de la caja idéntica de la marca; el resto del aspecto del Campo es del componente compartido y se mide en `/buscar/` y el 404.

## Auto Run Result

Status: done

**Cambio.** La marca de la Cabecera es el único `h1` de la portada (envuelta en `h1.titulo-de-la-marca`, mismo aspecto y caja que en una Página de Cita; en el resto de páginas la cabecera no lleva encabezado). `main` de la portada abre con la línea de cifras, que redacta solo `lineaDeCifras` de `src/lib/publicado.ts` (con censo: «{n} citas de {m} autores; {k} cotejadas con el texto de su fuente.»; con censo vacío, «cada una cotejada», con concordancia en singular), y el Campo de búsqueda con botón «Buscar» del 404 (GET a `/buscar/` con `q`, sin guion ni zona). Siguen la Cita del Día (o la entrada), el hueco comentado de «Obras» (28.3), «Temas», «Colecciones» y «Autores» con `Rotulo`, a las distancias de UX-DR56 (3 ×, 6 ×, 2 ×). Todo `.pagina` va bajo `data-pagefind-ignore="all"` y el armazón declara el título con un `<span hidden data-pagefind-meta="title:Sabiduría de Bolsillo">` dentro de `main`. Con el Corpus real: «4.420 citas de 135 autores; 4.399 cotejadas con el texto de su fuente.»

**Ficheros.**
- `src/lib/publicado.ts` — `lineaDeCifras`, pura y única redactora de la línea; `autoresPublicados` acepta listas de solo lectura.
- `src/components/Armazon.astro` — `h1` alrededor de la marca solo en la portada y título declarado a Pagefind; CSS del `h1` sin cambio de aspecto.
- `src/pages/index.astro` — sin `.marca-portada`; línea, formulario, orden de bloques con `Rotulo`, `data-pagefind-ignore="all"` en `.pagina`, espaciado nuevo.
- `src/lib/tipoDeResultado.ts` — comentario: la portada responde por el título declarado, no por un `h1`.
- `tests/unit/publicado.test.ts` — las filas de la matriz sobre arrays en memoria, y «nunca cada una» con censo.
- `tests/unit/cotejo-build.test.ts` — construcción con una Cita censada y una documentada: «2 citas de 1 autor; 1 cotejada…».
- `tests/unit/ayuda/portada.ts` — `exposicionDeLaPortada` lee el título declarado, los `h1` de `main` y de la cabecera.
- `tests/unit/publicable-y-alcanzable.test.ts` — la marca en `h1` solo en `/`, título declarado y oculto, orden de rótulos, línea del censo vacío, formulario GET sin guion.
- `tests/unit/coleccion-pagina.test.ts` — la rama sin Cita del Día con la nueva forma del título.
- `tests/unit/dos-jornadas.test.ts` — la línea idéntica en dos jornadas y fuera del subárbol `data-jornada`.
- `tests/unit/alcance-construido.test.ts` — el parche que quita «Autores» sigue el marcado nuevo (`<section>` + `Rotulo`).
- `tests/e2e/portada.spec.ts` — `h1` en la cabecera, línea real con censo, Tab tras el salto al campo, envío con y sin JavaScript, distancias, primera pantalla a 360 × 640 y caja de la marca igual a 360 y 1280 px.
- `tests/e2e/busqueda.spec.ts` — comentarios de la 26.2 al título declarado; aserciones sin cambios.

**Hallazgos.** Parches: 0. Diferidos nuevos: 0 (se conserva el de AD-11/AD-17, pendiente de Héctor, bmad-architecture). Rechazados: 0.

**Revisión de seguimiento.** `followup_review_recommended: false` — parches de esta pasada: high 0, medium 0, low 0; puntuación 0.

**Verificación.**
- `npx vitest run tests/unit/publicado.test.ts` — 78 pasan.
- `npx vitest run` uno por uno: `publicable-y-alcanzable` (45), `coleccion-pagina` (35), `cotejo-build` (21), `dos-jornadas` (6), `alcance-construido` (6, tras ajustar su parche al marcado nuevo), `medicion` (683) — todos verdes.
- `npx astro check` — 0 errores, 0 avisos.
- `npm run build` — termina; NFR-5: 5115 superficies a 3 saltos o menos y las 37398 aristas del modelo en `dist/`; peso juzgado 481 MiB, bajo el aviso.
- `npx playwright test tests/e2e/portada.spec.ts tests/e2e/cabecera.spec.ts tests/e2e/busqueda.spec.ts` (móvil y escritorio, con receptor local) — 230 pasan, 6 omitidas condicionales previas.
- `npx playwright test tests/e2e/accesibilidad.spec.ts -g "320|axe|h1"` — 154 pasan.
- `npm test` completo (red de seguridad) — 7042 de 7043; el fallo era `cotejo.test.ts` («ningún fichero de src/lib/ lo nombra siquiera»), por la palabra en el comentario de `lineaDeCifras`; reescrito el comentario, `cotejo.test.ts` y `publicado.test.ts` vuelven a pasar (136).
- Auditoría de la matriz: las seis filas, en `publicado.test.ts`; la de censo, además, construida en `cotejo-build.test.ts` y con el Corpus real en `portada.spec.ts`.

**Riesgos residuales.** El título de Pagefind depende de que un `span` con `hidden` siga indexándose (verificado con Pagefind 1.5.2 por la prueba (b) de `busqueda.spec.ts`); un cambio de versión de Pagefind que dejara de indexar texto oculto sacaría la portada del índice. La concordancia en singular con censo produce «1 cita de 1 autor; 0 cotejadas…» en un Corpus de una sola Cita censada, que solo se da en pruebas.

### Pasada de revisión 1 (2026-10-30)

**Cambio de esta pasada.** Quince parches de los hallazgos de las cinco capas externas, sin tocar el contrato: en `src/pages/index.astro`, las tres secciones con `aria-labelledby` hacia su `Rotulo`, dentro de la medida de prosa, la línea de cifras con el interlineado 1,6 de `body-md` y el formulario sin aire encima cuando no hay línea; el resto, pruebas.

**Ficheros.**
- `src/pages/index.astro` — `aria-labelledby` en Temas, Colecciones y Autores; `max-width: var(--medida-prosa)` en las secciones; `line-height: 1.6` en `.cifras`; `.formulario:first-child` sin margen.
- `tests/unit/publicable-y-alcanzable.test.ts` — el Campo de la portada (etiqueta, ejemplo, `enterkeyhint`, botón `submit` sin `name` tras el campo, con su texto), con `rutaDeLaBusqueda()` y `PARAMETROS_DE_LA_BUSQUEDA`; cada sección nombrada por su rótulo con `id` único; `a.marca` con los mismos atributos en toda página salvo `aria-current`; la prueba de guiones, renombrada a lo que mira.
- `tests/unit/coleccion-pagina.test.ts` — en la rama sin Cita apta, `p.cifras`, `form.formulario`, `p.entrada` en ese orden.
- `tests/unit/alcance-construido.test.ts` — la expresión del parche sigue el `aria-labelledby` nuevo.
- `tests/e2e/portada.spec.ts` — `/buscar/` arranca con lo escrito; envío con Intro; estilo de la línea (cuerpo, color, peso, interlineado, sin marcado); primera línea entera de la Cita del Día a 360 × 640; `try/finally` en la prueba sin JavaScript.
- `tests/e2e/busqueda.spec.ts` — la línea de cifras, «cotejadas» y la etiqueta del campo no dan la portada en el índice real.
- `tests/e2e/accesibilidad.spec.ts` — el anillo de foco del campo, también en `/`.

**Hallazgos.** Parches: 15 (medium 1, low 14). Diferidos: 0 (se conserva el de AD-11/AD-17). Rechazados: 27, con su motivo en el registro de triaje.

**Revisión de seguimiento.** `followup_review_recommended: true` — parches de esta pasada: high 0, medium 1, low 14; puntuación 3 × 1 + 14 = 17 (≥ 5).

**Verificación.**
- `npx astro check` — 0 errores, 0 avisos.
- `npx vitest run` uno por uno: `publicable-y-alcanzable` (46), `coleccion-pagina` (35), `alcance-construido` (6), `dos-jornadas` (6), `cotejo-build` (21), `publicado` (78), `cotejo` (58), `medicion` (683) — todos verdes.
- `npx playwright test tests/e2e/portada.spec.ts tests/e2e/cabecera.spec.ts tests/e2e/busqueda.spec.ts` (móvil y escritorio, con `npm run build` del `webServer` —puerta de NFR-5 incluida— y el receptor local) — 234 pasan, 6 omitidas condicionales previas.
- `npx playwright test tests/e2e/accesibilidad.spec.ts -g "320|axe|h1|anillo"` — 168 pasan.

**Riesgos residuales.** Los de la pasada anterior. La prueba de que la línea no devuelve la portada busca la frase sin cifras y «cotejadas»: si el índice no diera ningún resultado para ellas, pasaría sin mirar nada, aunque lo que fija es la ausencia de `/`.
