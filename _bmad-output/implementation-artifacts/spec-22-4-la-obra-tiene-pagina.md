---
title: 'Historia 22.4 — La obra tiene página, y solo se indexa si no repite otra'
type: 'feature'
created: '2026-10-10'
status: 'done'
baseline_revision: '190c7b85687ba63fc6c0425b3aab54e4f6801f09'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-22-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-22-3-la-obra-se-llama-igual-en-todas-partes.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/mockups/pagina-de-obra.html'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Quien llega por una Cita no puede ir a la obra de la que sale. La Obra tiene ficha (22.1), un solo nombre (22.2) y atributos resueltos (22.3), pero no tiene página. Además, una Obra que repite su Página de Autor (casi todas las Citas del Autor) o que tiene una sola Cita no debe indexarse, y esa decisión tiene que corregirse sola cuando cambie el Corpus.

**Approach:**
- Nueva superficie `/obra/{slug-autor}/{slug-obra}/` (`src/pages/obra/[autor]/[slug]/[...page].astro`), con Cabecera, Listado y Temas.
- Regla FR-52, en función pura: indexable si tiene al menos 2 Citas y menos del 90 % de las de su Autor. Los dos números van en `umbrales.ts`.
- `publicado.ts` expone `rutasIndexables`.
- `superficies.ts` recibe la lista sin calcularla, falla cerrado sin ella y distingue servicio por forma de servicio por contenido.
- El sitemap la recibe de una integración en `astro:build:start`.
- Una comprobación en `astro:build:done` rompe si el sitemap, los `noindex` y lo que entra en Pagefind no coinciden.
- La Atribución enlaza el título a la Página de Obra.
- El JSON-LD comparte `@id`.

## Boundaries & Constraints

**Always:**

- **Rutas y declaración:**
  - `rutaDeObra(autor, slugObra, pagina = 1)` en `src/lib/superficies.ts`. Los dos segmentos salen del `nombre` de la ficha partido por el primer `--`.
  - Nueva entrada en `SUPERFICIES`:
    - `pagina: 'obra/[autor]/[slug]/[...page].astro'`;
    - `reconoce: /^\/obra\/[^/]+\/[^/]+(?:\/\d+)?$/`;
    - `caracter: 'producto'`;
    - `noPublicableEn: /^\/obra\/[^/]+\/[^/]+\/\d+$/`, para las 2+.
  - Si una ficha tiene un slug de obra puramente numérico, el build rompe: ese nombre chocaría con «página N».
  - Solo tienen página las Obras con al menos una Cita publicada.

- **Regla de indexabilidad (FR-52):**
  - En `src/lib/umbrales.ts`: `MIN_CITAS_OBRA_INDEXABLE = 2` y `MAX_PROPORCION_OBRA_DEL_AUTOR = 0.9`, este último excluyente.
  - Función pura `esObraIndexable(recuento, citasDelAutor)` en `src/lib/obras.ts`.
  - `publicado.ts` expone:
    - `obrasPublicadas(conjunto)`, las Obras resueltas con `recuento > 0`;
    - `rutasIndexables(conjunto)`, que devuelve **todas** las rutas de producto indexables. Incluye las de `rutasPublicadas` salvo las Obras que no cumplen la regla, así que es un subconjunto de `rutasPublicadas`.
  - `rutasPublicadas` enumera **todas** las Obras, página 1 (AD-11).
  - La indexabilidad no se declara en ninguna ficha: se recalcula en cada build, y por eso se corrige sola en los dos sentidos.

- **`superficies.ts` falla cerrado:**
  - `declararRutasIndexables(lista)` guarda la lista en el estado del módulo, normalizada.
  - `caracterDe(ruta)` de una ruta de Obra de página 1:
    - sin lista declarada, **lanza** («la lista de rutas indexables no se ha declarado»);
    - si la ruta está en la lista, `producto`;
    - si no está, `servicio`.
  - `causaDelServicio(ruta)` devuelve `'forma' | 'contenido' | undefined`.
  - Las rutas que no son de Obra no necesitan la lista: el resto del sitio no cambia de comportamiento.
  - Como la configuración de Astro y el bundle de páginas cargan **instancias distintas** del módulo:
    - `Armazon.astro` llama `declararRutasIndexables(await rutasIndexables(…))` antes de `consecuenciasDe`, o pasa la lista explícitamente, a elegir lo más limpio sin duplicar la regla;
    - una integración nueva, `integraciones/indexables.ts`, en `astro:build:start`, calcula la misma lista desde el corpus con la misma función pura, la declara en la instancia de la configuración (la del filtro síncrono del sitemap) y escribe en el registro «N Obras publicadas, M indexables» (línea base de SM-11).
  
  Las dos instancias usan la **misma** función pura: no hay dos reglas.

- **Comprobación final (`astro:build:done`)**, en la misma integración, sobre el `dist/` real:
  - las rutas del sitemap = las páginas HTML sin `<meta name="robots" content="noindex…">` = las páginas cuyo `<main>` lleva `data-pagefind-body`;
  - si no coinciden, el build rompe, nombrando las rutas que sobran o faltan en cada lado;
  - Pagefind corre después de Astro (`package.json`), así que se compara la marca `data-pagefind-body`.

- **Página de Obra**, página 1, en este orden:
  - **Cabecera (UX-DR38):** `<h1>` con el título efectivo de la Obra, en Inter con el token **nuevo** `--titular-obra: 26px` declarado en `src/styles/tokens.css` (UX-DR39), `text-wrap: balance`, `overflow-wrap: break-word` y `hyphens: auto`. Debajo, «de {Autor} · {año}»:
    - «de» y el año en `--tinta-apagada`;
    - el nombre enlaza a la Página de Autor, siempre subrayado, con zona de toque de 44 px;
    - el «·» lleva `aria-hidden` y un «, » oculto para lectores de pantalla;
    - el año es `obra.año` (22.3), que ya se omite si discrepa o falta y nunca es el de una traducción (UX-DR51);
    - no se nombra al traductor.
  - **Listado (UX-DR40):** `TarjetaDeCita` sin `autor`, en el orden de `citasDeAutor` (por slug), paginado a `CITAS_POR_PAGINA` con `Paginacion`, con su filete superior y separado de la Cabecera por 4 × `--unidad`.
  - **Temas (UX-DR41)**, solo en la página 1 y tras la paginación:
    - `<h2>` «Temas» con el estilo de rótulo de la maqueta;
    - chips de Tema como los de `RutasDeSalida.astro`, reutilizando sus clases y estilos (extráelos a un componente si hace falta, sin duplicar CSS);
    - solo Temas **publicados** (`temasPublicados`), ordenados por número de Citas de la Obra (descendente) y luego por nombre, sin recuento visible;
    - sin Temas, ni rótulo ni hueco.
  - Ninguna prosa compuesta (FR-51): ni sinopsis, ni contexto, ni adjetivos.
  - Valores de color y tipografía solo con tokens.

- **Páginas 2+ (UX-DR50 b):** solo Cabecera y Listado, `noindex` por forma.

- **Título y meta (UX-DR49):**
  - pestaña: `Frases de {Autor} en {Título}` y, en las 2+, « — página {N}», con `tituloDe` (en `src/lib/marca.ts`, `tituloDeObra`);
  - meta: `{n} frases de {Autor} en {Título}[ ({año})], con su procedencia documentada.`, con «1 frase» en singular;
  - el cuerpo dice «citas».

- **Obra no indexable (UX-DR50 a):** la misma página, sin marca ni aviso, con `noindex, follow`, fuera del sitemap y de Pagefind. Lo hace Armazon por `consecuenciasDe`.

- **Atribución:** en `Atribucion.astro`, el título de la Obra es un `<a href={rutaDeObra(…)}>`, también si la Obra no se indexa. El resto de la frase («, año», la traducción, la referencia) queda fuera del enlace. Que el subrayado sea siempre visible es la 22.5: aquí basta con el estilo de enlace actual.

- **Datos estructurados:**
  - la Página de Obra emite un `CollectionPage` con `about: { '@type': 'Book', '@id': <canónica de la página 1 de la Obra>, name, author → @id de la Persona del Autor, datePublished? }` y `mainEntity` con `listaDeCitas`;
  - el `isPartOf` de cada Cita lleva ese mismo `'@id'`;
  - la canónica de la Obra es la suya, y la de cada Cita sigue siendo la Página de Cita (NFR-13).

- **Medición:** `vista="superficie"` en la página 1 (Historia 20.1).

- **Ingreso:** `'obra/[autor]/[slug]/[...page].astro'` entra en `SUPERFICIES_DE_LECTURA`, de modo que donaciones y publicidad quedan rechazadas. Se actualizan las pruebas de `ingreso` que daban por hecho que no existía ninguna Página de Obra.

- **Buscador:** `TipoDeResultado` gana `obra`, con la etiqueta «Obra», para que las Obras indexables entren en Pagefind con su tipo. El resultado completo de búsqueda es la 22.7.

- **Familias de las series:**
  - `censoPorFamilia` (`tools/lib/indexacion.ts`) **no** cuenta la Obra (las series no cuentan la familia Obra hasta la pasada de métricas);
  - la prueba que iguala la unión de familias con `rutasPublicadas` excluye explícitamente las rutas de Obra.

- **Barrido:**
  - `tests/e2e/accesibilidad.spec.ts` añade cuatro rutas de Obra explícitas: una indexable, una con `noindex`, una página 2+ y la del título largo «Hacia una Moral sin Dogmas: Lecciones sobre Emerson y el Eticismo», a 360 px, sin desplazamiento horizontal;
  - `tests/unit/publicable-y-alcanzable.test.ts` acepta `/obra/a/b/2`.

- **Sitio real:** `dist/` gana las páginas de Obra, los enlaces en la Atribución, los `@id` y el token, y el informe del build da las cifras.

**Block If:** una Cita publicada cuya Obra no tiene ficha (el build de la 22.1 ya rompe), o una regla del contrato que no pueda cumplirse sin cambiar la arquitectura.

**Never:**
- «Dónde leer», la nota y las ediciones (22.6 y 22.9).
- La Tarjeta de Obra (22.7).
- El aviso de cambios (22.8).
- Prosa compuesta.
- Declarar la indexabilidad en la ficha.
- Un literal de color o tipografía.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Indexable | Obra con 3 de las 10 Citas de su Autor | página sin `noindex`, en el sitemap, con `data-pagefind-body` | — |
| Una Cita | Obra con 1 Cita | página con `noindex, follow`, fuera del sitemap y de Pagefind | — |
| Casi todo el Autor | 9 de 10 (90 %) | `noindex` | — |
| Se corrige sola | el mismo Autor gana 2 Citas en otra obra (9 de 12) | la Obra pasa a indexable sin tocar la ficha | — |
| Paginada | 51 Citas | `/obra/a/b/2/` solo con Cabecera y Listado, `noindex` | — |
| Sin lista | `caracterDe('/obra/a/b')` sin declarar | lanza | — |
| Causa | página 2+ / Obra no indexable | `causaDelServicio` = `forma` / `contenido` | — |
| Atribución | Cita de esa Obra | título enlazado a `/obra/a/b/` | — |
| JSON-LD | Cita y su Obra | `isPartOf['@id']` = `about['@id']` = la canónica de la Obra | — |
| Año de traducción | Obra con solo `traduccion.año` | la Cabecera sin año ni traductor | — |
| Temas | Citas con Temas publicados y no publicados | solo los publicados, por recuento | — |
| Sin Temas | — | ni rótulo ni hueco | — |
| Desajuste | sitemap ≠ `noindex` ≠ Pagefind | el build rompe y lo nombra | código ≠ 0 |
| Slug numérico | ficha `autor--1984` | el build rompe | código ≠ 0 |
| Ingreso | donaciones admitidas en Obra | `revisarDeclaracionDeIngreso` falla | — |

</intent-contract>

## Code Map

- **`src/lib/superficies.ts`:**
  - `Superficie` y `SUPERFICIES` (l.38-150);
  - los constructores de ruta (l.177-220);
  - `consecuenciasDelCaracter` (l.241), `superficieDeclaradaDe` (l.308), `esServicioPorForma` (l.329), `caracterDe` (l.345), `consecuenciasDe` (l.365), `anunciableEnElSitemap` (l.383) y `superficiesDelBarrido` (l.408).
- **`src/lib/publicado.ts`:**
  - `ConjuntoPublicable` (l.95) y `rutasPublicadas` (l.398);
  - `autoresPublicados`, `temasPublicados` (l.130), `citasDeAutor` (l.157) y `temasDeLaCita` (l.171);
  - `conjuntoPublicable` (l.669-729), que ya carga las fichas y llama a `colgarObras`;
  - `aplanarFichaDeObra` (l.591).
- **`src/lib/obras.ts`:** `ObraResuelta` (l.607), `resolverObras` (l.688), `obraDeCita` (l.727) y `nombreDeFichaDeObra` (l.84). `ObraResuelta.temas` hoy está sin filtrar ni contar: los Temas de la Página de Obra se calculan aparte, desde las Citas.
- **`src/lib/umbrales.ts`:** las convenciones (l.1-10), `CITAS_POR_PAGINA` (l.29), cuyo comentario hay que ampliar a la Obra, y el estilo de proporción (l.178).
- **`src/lib/marca.ts:35-59`:** `tituloDe` y `tituloDeAutor/Tema/Coleccion`. Aquí se añade `tituloDeObra`.
- **`src/lib/atribucion.ts`:** `descripcionDeAutor`, con la que se compone `descripcionDeObra`.
- **`src/pages/autor/[slug]/[...page].astro`:** el patrón: `getStaticPaths` con `paginate`, `Armazon`, el slot `cabeza`, `.listado`, `Paginacion` y estilos.
- **`src/components/`:**
  - `Armazon.astro` (`consecuenciasDe` en l.71, `noindex` en l.98 y `data-pagefind-*` en l.171-173);
  - `Atribucion.astro` (l.28-67);
  - `DatosEstructurados.astro` (l.65-71);
  - `DatosDeAutor.astro` y `DatosDeTema.astro` como patrón;
  - `TarjetaDeCita.astro`, `Paginacion.astro` y `RutasDeSalida.astro` (chips, l.61-66 y CSS l.145-170).
- **`src/lib/datosDeListado.ts`:** `listaDeCitas`.
- **`src/lib/tipoDeResultado.ts:20-25`.**
- **`src/lib/ingreso.ts:152-219`:** `SUPERFICIES_DE_LECTURA` y `esPaginaDeObra`.
- **`src/styles/tokens.css:31-47`.**
- **`astro.config.mjs:67-172`:** las integraciones y el filtro del sitemap. Patrones de integración: `integraciones/obras.ts:116-150` y `integraciones/cobertura.ts:75` (`build:done`).
- **`tools/lib/indexacion.ts:53-56,213`:** `FAMILIAS` y `censoPorFamilia`.
- **Pruebas afectadas:**
  - `tests/unit/indexacion.test.ts:110`, `publicable-y-alcanzable.test.ts` (l.103-170, 284, 417-457), `superficies.test.ts` (l.228-365), `ingreso.test.ts` (l.205, 226, 366, 619), `publicado.test.ts`, `barra-final.test.ts` y `obra-construida.test.ts`;
  - `tests/e2e/accesibilidad.spec.ts:46-63`.
- **Maqueta:** `mockups/pagina-de-obra.html`: la página 1 en l.274-345, el CSS de `.obra-h1` y `.de` en l.153-159, la página 2 en l.503-545 y el título largo en l.578-605.

## Tasks & Acceptance

**Execution:**
- `src/lib/umbrales.ts`, `src/lib/obras.ts` (`esObraIndexable`, slug numérico), `src/lib/publicado.ts` (`obrasPublicadas`, `rutasIndexables`, `rutasPublicadas` con Obras) y `src/lib/superficies.ts` (ruta, declaración, lista, causa).
- `integraciones/indexables.ts` y su registro en `astro.config.mjs`.
- `src/pages/obra/[autor]/[slug]/[...page].astro`, `tokens.css`, `marca.ts`, `atribucion.ts` y `DatosDeObra.astro`.
- `Atribucion.astro`, `DatosEstructurados.astro`, `Armazon.astro`, `tipoDeResultado.ts` e `ingreso.ts`.
- `tools/lib/indexacion.ts` y sus pruebas.
- **Pruebas:** cada fila de la matriz, con builds de corpus mínimo para lo que se ve en `dist/`. La prueba de «se corrige sola» compara dos builds.
- `tests/e2e/accesibilidad.spec.ts`: las cuatro rutas.
- `AGENTS.md`: una sección corta, «La Página de Obra», con la regla, dónde viven los números, que se recalcula sola y la comprobación del build.

**Acceptance Criteria:**
- Given `npx vitest run` sobre los ficheros tocados, `npx astro check` y `npm run build` sobre el corpus real, when corren, then pasan, el registro dice «N Obras publicadas, M indexables» y la comprobación final no rompe.

## Spec Change Log

### 2026-10-10 — el título largo
- **Hallazgo:** el barrido pedía un título «que parte en cinco líneas a 360 px». Con Inter cargada, el título más largo del Corpus ocupa 3 líneas.
- **Cambio:** la prueba e2e exige que parta en varias líneas y que no haya desplazamiento horizontal; la cifra de cinco era de la maqueta.

## Review Triage Log

### 2026-10-10 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 13 (high 0, medium 3, low 10)
- defer: 0
- reject: 1
- addressed_findings:
  - `[medium]` `[patch]` La baliza de vista salía en Obras `noindex` (servicio) → solo si la ruta es producto, como manda la 20.1.
  - `[medium]` `[patch]` La integración y las páginas calculaban la lista desde entradas distintas → `obrasDelConjunto`, una sola función, con prueba de igualdad.
  - `[medium]` `[patch]` `rastreo` y `canal` reventaban con una ruta de Obra y aceptaban pedir rastreo de una página `noindex` → declaran la lista; `rastreo` juzga contra las indexables.
  - `[low]` `[patch]` `kit.spec` examina las Obras; Autor de la Cabecera publicado; `Book` en los dos `@id`; título siempre enlazado; barrido derivado de `dist/`; `lastmod` de Obra; meta de las 2+; declaración que siempre reemplaza; Temas por Cita; tipos; AGENTS.md.

## Verification

**Commands:**
- `npx vitest run tests/unit/superficies.test.ts tests/unit/publicado.test.ts tests/unit/publicable-y-alcanzable.test.ts tests/unit/ingreso.test.ts tests/unit/indexacion.test.ts tests/unit/obras.test.ts tests/unit/obra-construida.test.ts` (y los nuevos) -- expected: verde
- `npx astro check` -- expected: 0 errores
- `npm run build` -- expected: código 0, con el informe de Obras

## Auto Run Result

Status: done

**Resumen:** toda Obra con Citas publicadas tiene página en `/obra/{autor}/{obra}/`, con Cabecera (`--titular-obra`), Listado paginado y Temas. FR-52 (≥2 Citas y <90 % de su Autor) decide `noindex`, sitemap y Pagefind; se recalcula en cada build, y una comprobación en `build:done` rompe si los tres no coinciden. La Atribución enlaza el título y el JSON-LD comparte `@id`. La Obra es superficie de lectura (sin donaciones ni publicidad). Corpus real: 180 Obras publicadas, 81 indexables; 2.081 rutas indexables coinciden.

**Revisión:** 13 parches aplicados y 1 rechazado (contar contra el índice real de Pagefind, que corre después de Astro: se compara su marca). Seguimiento: 3×3 = 9 → true.

**Verificación:** suite 118 ficheros y 3750 pruebas; astro check, 0 errores; build en verde con el informe; Playwright de accesibilidad y Kit en escritorio, 40/40.
