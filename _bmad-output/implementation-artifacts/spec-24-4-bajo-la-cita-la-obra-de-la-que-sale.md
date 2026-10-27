---
title: 'Historia 24.4 — Bajo la Cita, la obra de la que sale'
type: 'feature'
created: '2026-10-26'
status: 'done'
baseline_revision: 'ac71f2cd11129ebd42caa1aaabb34c6456191dcb'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-24-context.md'
warnings:
  - oversized
deferred:
  - summary: >-
      La Tarjeta de Obra pinta el año, el recuento y la edición cotejada de la Obra, que dependen de las Citas hermanas, y ni el lastmod ni el aviso de esas hermanas se mueven cuando entra o sale una Cita de la Obra; ninguna prueba fija que la exclusión es deliberada.
    evidence: |-
      contenidoDeTarjetaDeObra lee obra.recuento, obra.año y obra.edicionCotejada (resolverObras, todas las Citas de la Obra); relacionDeSuperficies de tools/lib/cambios.ts declara la Página de Cita con sus Temas y la ficha de su Obra, no con las Citas hermanas, y en esta historia solo ganó un comentario. Es la excepción de Héctor que el contrato deja a la 24.8 («ni la relación de tools/lib/cambios.ts (24.8; solo un comentario)»); hallazgo de la revisión del 2026-10-27 (blind-hunter).
    location: >-
      tools/lib/cambios.ts (relacionDeSuperficies, Página de Cita)
    severity: low
  - summary: >-
      La prueba «ningún enlace saliente apunta a una página que no existe» recorre todas las Páginas de Cita y sus destinos y pasa de su límite de 30 s en el proyecto movil cuando corre junto al barrido de accesibilidad.
    evidence: |-
      Dos pasadas de los cinco ficheros del criterio (2026-10-27) la dan caída por tiempo en [movil] con 41,5 s y 41,4 s, mientras en la misma pasada [escritorio] tarda 12,8-13,4 s; sola, [movil] pasa en 11,9-13,6 s. La 24.4 no le añade destinos —el enlace de la tarjeta es el mismo que el del título en la Atribución, que ya estaba en el conjunto— y solo ~1,1 kB por página, así que el límite depende de la carga de la máquina y no de la historia.
    location: >-
      tests/e2e/rutas-de-salida.spec.ts:98
    severity: low
  - summary: >-
      La Fila de bloque (y la Lista de Obras de la que toma el trato) pinta su texto en `{typography.body-md}` con interlineado 1,4, y el token `body-md` de DESIGN.md declara `lineHeight: '1.6'`; lo decide Héctor (bmad-ux), y el cambio alcanzaría a la Lista de Obras y a toda fila que herede la Fila de bloque.
    evidence: |-
      DESIGN.md, `typography.body-md`: fontSize 15px, lineHeight '1.6'. `src/components/ListaDeObras.astro` (`.titulo`, desde la 17.3) declara `line-height: 1.4`, y el contrato de la 24.4 pide «interlineado 1,4» con el trato de la Lista de Obras; `src/components/FilaDeBloque.astro` lo copia y `tests/unit/tarjeta-de-obra.test.ts` exige ya que los dos coincidan. La divergencia con el token es anterior a la historia (ac-auditor, segunda revisión del 2026-10-27).
    location: >-
      src/components/ListaDeObras.astro (.titulo), src/components/FilaDeBloque.astro (.fila-de-bloque a)
    severity: low
---

<intent-contract>

## Intent

**Problem:** La Página de Cita nombra su Obra solo dentro de la línea de la Procedencia, así que quien llega desde un buscador no ve de qué libro sale la frase, cuántas citas hay de él ni que puede ir a la Obra y a dónde leerla; y el sitio no tiene todavía la Fila de bloque que «Siguiente» (24.5), los cierres (24.6), los Directorios (26) y la portada (28) van a reutilizar.

**Approach:** Un componente único, `TarjetaDeObra.astro`, entre la Línea de la Fuente (o la Atribución) y Copiar en la Página de Cita y solo allí: rótulo «De la obra» con el nivel que recibe, el título de la ficha, «{Autor} · {año} · {n} citas» y una Fila de bloque —un componente nuevo, `FilaDeBloque.astro`, escrito una vez con el trato de la Lista de Obras— que dice «Ver la obra y dónde leerla ›» o «Ver la obra ›» —el glifo de avance es «›», U+203A (v8.3, decisión de Héctor del 2026-10-27)— y lleva a la página 1 de la Obra con la zona `tarjeta-de-obra`. Todo en el HTML del build, sin guion, fuera de Pagefind, sin Modelo, idéntico con afiliación o congelación.

## Boundaries & Constraints

**Always:**
- `TarjetaDeObra.astro`: `interface Props { cita: Cita; autor: Autor; nivel: 2 | 3 }`, `nivel` obligatorio y sin valor por omisión (la Página de Cita pasa `2`; la portada pasará `3` en la 28.2). Sin `cita.obra` no pinta nada —ni sección, ni rótulo, ni hueco—, como `Fuente.astro`. Si `autor.slug` no es `cita.autor`, detiene la construcción con un error que nombra la Cita, la ruta (`Astro.url.pathname`) y los dos Autores.
- Raíz `<section class="tarjeta-de-obra" aria-labelledby="de-la-obra" data-pagefind-ignore="all">`, sin `data-ingreso` ni `<script>`. Dentro, en este orden: el rótulo «De la obra» con `Rotulo.astro` (`id="de-la-obra"`, nivel recibido); `<p class="titulo">` con `cita.obra.titulo`, sin enlace; `<p class="hechos">`; `<ul class="filas">` con una sola `FilaDeBloque` (`zona="tarjeta-de-obra"`, `href` = `rutaDeLaObra(cita.obra)`, la página 1 se indexe o no). El componente no escribe ningún `<a>` propio.
- Los hechos y el texto de la fila los compone una función pura nueva de `src/lib/atribucion.ts`, junto a `descripcionDeObra` y `añoLegible`: partes `[autor.nombre, añoLegible(obra.año)?, «1 cita» | «{n} citas»]` con `obra.recuento` y `obra.año` de la Obra resuelta (nunca se cuenta ni se deriva en el componente), y «Ver la obra y dónde leerla» si `obra.edicionCotejada`, «Ver la obra» si no. Las constantes de los dos rótulos viven ahí.
- En los hechos, entre parte y parte va `<span aria-hidden="true"> · </span><span class="solo-para-lectores">, </span>` pegado a las dos, sin espacio entre etiquetas; ningún separador al principio ni al final ni de sobra cuando falta el año.
- `FilaDeBloque.astro`: `interface Props` con `href: string`, `zona: Zona` obligatoria (`import type { Zona } from '../lib/vocabulario.ts';`) y `avance?: boolean` opcional; pinta `<li class="fila-de-bloque" data-zona={zona}><a href={href}>…</a></li>`, sin `target`, y el glifo de avance lo pone el propio componente como `<span aria-hidden="true">&nbsp;›</span>` («›», U+203A, dentro del subconjunto `latin` de Inter y Source Serif 4: la puerta de cobertura lo admite sin tocar `astro.config.mjs`). Es un glifo tipográfico del rótulo, nunca un icono, un SVG ni un `content` de CSS; la flecha «→» (U+2192) no la pinta ningún componente de la historia (solo puede nombrarla un comentario o una prueba que la excluye). Trato de la Lista de Obras: el `li` con filete inferior `var(--grosor-filete) solid var(--filete)`; el `a` en flex centrado, `min-height: var(--zona-de-toque)`, `padding-block: calc(var(--unidad) * 1.25)`, `var(--sans)`, `var(--cuerpo-md)`, interlineado 1,4, `var(--tinta)`, `text-decoration: none`, y parte palabras antes que desbordar.
- Tokens de la tarjeta: sección a `calc(var(--unidad) * 4)` de lo de arriba, filete superior a lo ancho, `padding-top: calc(var(--unidad) * 3)`, `max-width: var(--medida-prosa)`, sin fondo, radio ni siena; título a `var(--unidad)`, `var(--sans)`, `var(--cuerpo-lg)`, 600, `var(--tinta)`, `text-wrap: balance`, la partición del `h1` de la Cabecera de Obra (`overflow-wrap: break-word; hyphens: auto`); hechos a `var(--unidad)`, `var(--pie)`, 400, 1,5, `var(--tinta-apagada)`; `ul.filas` a `calc(var(--unidad) * 2)`, sin viñetas ni relleno, con filete superior. Nada recorta: ni `white-space: nowrap`, ni `text-overflow`, ni `line-clamp`, ni `overflow: hidden`.
- `Rotulo.astro` gana `nivel?: 2 | 3` (por omisión `2`) y sus usos de hoy salen byte a byte iguales.
- Importaciones relativas (sin alias): `tests/unit/peso.test.ts` sigue el grafo de importaciones de las páginas.

**Block If:**
- Cumplir el contrato exigiera tocar `src/lib/vocabulario.ts` (mueve la huella de AD-14), `src/lib/ingreso.ts`, un artefacto de `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`, o la configuración de Astro.
- El `diff -rq` de las dos construcciones del Corpus real (Verification) cambia algún fichero fuera de `dist/cita/` y `dist/pagefind/` —la portada, el 404, una Página de Obra o de Autor— y no se puede evitar sin tocar la configuración de Astro.

**Never:**
- Tocar `BloqueDeCita.astro`, `src/pages/index.astro` ni `src/pages/404.astro` (la portada y el 404 no cambian; la tarjeta llega a la portada con la 28.2), `CopiarCita`, `ImagenDeCita` ni `CompartirEnlace` (sus márgenes ya son 4 × y 2 × `--unidad`; «Compartir la cita» sigue hasta la 25.1), `RutasDeSalida.astro` (24.6), `ListaDeObras.astro` (conserva su marcado) ni la relación de `tools/lib/cambios.ts` (24.8; solo un comentario).
- «Siguiente» (24.5) ni la exención de las Filas de bloque apiladas en la prueba de toque de `tests/e2e/accesibilidad.spec.ts` (24.5): aquí hay una sola fila.
- Tocar en `tests/unit/medicion.test.ts` la tabla `COLOCACION` o la lista de los seis componentes de enlace: la prueba de la 23.7 sigue pasando sin tocarla.
- Tocar `astro.config.mjs`, las fuentes declaradas, `tools/lib/cobertura.ts` ni `integraciones/cobertura.ts`, ni rodear la puerta de cobertura: «›» ya pasa por ella tal cual.
- Escribir en `src/` la cadena `procedencia.obra` ni sus variantes, tampoco en comentarios (`tests/unit/obras.test.ts`, 22.3).
- Enlazar el título o el Autor de la tarjeta, abrir en otra pestaña, que la tarjeta dependa de `ediciones`, de la afiliación, de la indexabilidad o de la congelación, o poner «Sin año documentado» o cualquier frase de relleno.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Obra de varias Citas, cotejada | 3 Citas con Fuente, `año: 49` | hechos «Séneca · 49 · 3 citas» (lector «Séneca, 49, 3 citas»); fila «Ver la obra y dónde leerla ›» a la página 1 | — |
| Obra de una Cita | `recuento: 1` | «… · 1 cita» | — |
| Años discrepantes | Citas con 62 y 64 | «Séneca · 2 citas»: sin año, sin hueco ni separador de sobra | el build avisa como ya hace |
| Solo año de traducción | `traduccion.año: 1888`, sin `año` | «Epicteto · 2 citas», nunca 1888 | — |
| Antes de Cristo | `año: -350` | «Aristóteles · 350 a. C. · 1 cita» | — |
| Obra sin cotejar | ninguna Cita con Fuente (aunque la ficha declare `ediciones`) | «Ver la obra ›» | — |
| Obra `noindex` o congelada fuera | Obra de una Cita, o familia congelada | la misma tarjeta, a la página 1 de la Obra, que existe en `dist/` | — |
| Título largo | título de 163 caracteres | entero, sin «…», en varias líneas | — |
| Cita sin Obra | Procedencia sin obra resuelta | ni sección, ni «De la obra»; Copiar sigue a la Fuente o a la Atribución | — |
| Autor ajeno | `autor.slug` ≠ `cita.autor` | — | la construcción se detiene nombrando la Cita, la ruta y los dos Autores |

</intent-contract>

## Code Map

- Rama local `v8/wip-24-4-tarjeta-de-obra`, commit `b05d7e4c70429dfc7e054f789f5b8b03a9a40ac3` (el mismo que `_bmad-output/implementation-artifacts/24-4-tarjeta-de-obra-wip.patch`) -- la implementación parcial sobre la línea base `943ff5d3…`; `src/`, `tests/` y `tools/` no han cambiado desde entonces en `v8/epicas-24-26` y su diff aplica limpio sobre `7e2b4e14…` (comprobado con `git apply --check`). Trae `contenidoDeTarjetaDeObra` y `FILA_VER_LA_OBRA_Y_DONDE_LEERLA` / `FILA_VER_LA_OBRA` en `atribucion.ts`, `nivel` en `Rotulo.astro`, `FilaDeBloque.astro` (con la prop `flecha` y `&nbsp;→`, que se cambian), `TarjetaDeObra.astro`, la tarjeta en la Página de Cita, el comentario de `cambios.ts` y `tests/unit/ayuda/tarjeta-de-obra.ts`. Los docblocks de `FilaDeBloque.astro` que citan «→» (los cierres de la 24.6) pasan a «›».
- `tools/lib/cobertura.ts` (solo lectura) -- la puerta lee los `unicode-range` del CSS emitido y exige que **todas** las familias cubran cada carácter; `latin` trae `U+2000-206F`, donde cae U+203A. `integraciones/cobertura.ts` la corre en `astro:build:done`, así que toda construcción de prueba la pasa o falla.
- `src/pages/cita/[slug].astro:13-30,69-89` -- importaciones y el orden `BloqueDeCita` → `Fuente` (78) → `CopiarCita` (79) → `ImagenDeCita` → `CompartirEnlace` → `RutasDeSalida`; la tarjeta va entre 78 y 79 con `nivel={2}`. `autor` llega de `getStaticPaths`.
- `src/components/BloqueDeCita.astro` -- lo comparten `src/pages/index.astro:15` y `src/pages/404.astro:15`: por eso la tarjeta no va dentro.
- `src/components/Fuente.astro:30-55` -- patrón de componente que recibe `cita` y no pinta nada sin su dato.
- `src/components/Rotulo.astro:16-42` -- el Rótulo de sección, hoy solo `h2` (`id`, `destino`); sus usos: `ListaDeObras.astro:53`, la Página de Obra (`Temas`) y `DondeLeer.astro`.
- `src/components/ListaDeObras.astro:59-64,87-114` -- el trato de fila que la Fila de bloque copia (filete, `min-height`, `padding-block` 1,25 ×, tinta, sin subrayado) y los hechos con punto oculto y coma para lectores; usa `añoLegible`.
- `src/components/TarjetaDeCita.astro:60-100,122-148` -- las guardas que detienen la construcción nombrando Cita y ruta (24.3), las pausas pegadas con `.solo-para-lectores` y la zona en el `<li>`.
- `src/lib/obras.ts:704-737` -- `ObraResuelta` (`titulo`, `año` solo si coinciden y nunca de traducción, `edicionCotejada`, `recuento`); `:120` `rutaDeLaObra` (página 1 por omisión); `:770-775` `tieneFuente`, el único criterio de «cotejada», el mismo de «Dónde leer esta obra».
- `src/lib/atribucion.ts:134-136` `añoLegible`; `:222-232` `descripcionDeObra`, vecina de la función nueva (`atribucion.ts` solo importa tipos de `obras.ts`: no hay ciclo).
- `src/lib/publicado.ts:69,927` -- `Cita.obra`, colgada a toda Cita por `colgarObras`.
- `src/styles/tokens.css:50-53,64,82,175,187` -- `--cuerpo-lg`, `--cuerpo-md`, `--pie`, `--grosor-filete`, `--zona-de-toque`, `.enlace-en-tinta` (no se usa aquí), `.solo-para-lectores` global.
- `src/islands/CopiarCita.astro:142-145` (`.isla` a 4 × `--unidad`) e `src/islands/ImagenDeCita.astro:300-302` (2 ×) -- ya cumplen la separación de las acciones; no se tocan.
- `src/pages/obra/[autor]/[slug]/[...page].astro:213-222` -- la regla de partición del `h1` de la Cabecera de Obra que copia el título.
- `src/lib/vocabulario.ts:102-119` -- `ZONAS` ya trae `tarjeta-de-obra` (solo lectura).
- `tools/lib/cambios.ts:27-37,192-201` -- documentación y declaración de la Página de Cita en la relación; solo se añade un comentario.
- `tests/unit/medicion.test.ts:2660-2690,2852-2870,2909-2922,3033` -- `ZONAS_DE_HOY`/`esDeOtraEpica` y el comentario que ya prevé la tarjeta de la 24.4; no se tocan.
- `tests/unit/ediciones-en-venta.test.ts:500-655,790-838` -- `corpusConstruido(true)` y las dos construcciones memorizadas `construida('encendida' | 'apagada')` con la tienda de prueba: Brevedad (cotejada, con ediciones), Cartas (cotejada, con ediciones) y De la ira (`IRA_SIN`, sin cotejar, con ediciones); la `describe` de la 24.7 es el patrón.
- `tests/unit/obra-pagina.test.ts:289-300,1166-1185,1212-1232` -- la construcción abierta de `corpus(1)` con la sonda, la congelada con la misma sonda y el `it` de la 24.3 que reutiliza la congelada.
- `tests/unit/tarjeta-de-cita.test.ts:111-330,460-540` -- pruebas estructurales sobre el frontmatter con `typescript`, construcciones que fallan y el fixture con censo y documentos escritos a mano (`componerDocumento`, `nombreDeDocumento`).
- `tests/unit/ayuda/construir.ts` (`construirConCorpus` con `paginas` y `ficheros`, `citaValida`, `AUTOR_VALIDO`, `TEMA_VALIDO`, `paginaConstruida`), `tests/unit/ayuda/enlaces.ts:161,316` (`recorrerElementos`, `enlacesDe` con la declaración más cercana).
- `tests/e2e/accesibilidad.spec.ts:62-109` (`obrasDelBarrido`, patrón de derivación), `:111-146` (las caras de Obra y el título largo a 360 px), `:464-488` (la prueba 2.8 del orden que se enmienda), `:540-628` (sin desplazamiento a 360 y zonas de toque: siguen sin tocarse).
- `tests/e2e/ayuda/corpus.ts:160-228` -- `citasResueltas` (con `colgarObras`), `citaConTituloDeObraMasLargo`, `citaSinObra`.
- `tests/e2e/pagina-de-cita.spec.ts:22-36,337-352` -- la primera pantalla de 360 × 640 y la sonda de tokens calculados.
- `AGENTS.md`, secciones «La obra se llama igual en todas partes (Historia 22.3)» y «La Página de Obra (Historia 22.4)».

## Tasks & Acceptance

**Execution:**
- Rama `v8/epicas-24-26` -- aplicar el trabajo guardado sin commitearlo aparte (`git cherry-pick --no-commit b05d7e4c70429dfc7e054f789f5b8b03a9a40ac3`, o `git apply _bmad-output/implementation-artifacts/24-4-tarjeta-de-obra-wip.patch` si la rama ya no está) y, en `FilaDeBloque.astro`, renombrar la prop `flecha` a `avance` (también en su uso de `TarjetaDeObra.astro`) y pintar `&nbsp;›`; `grep -rn '→' src/components/FilaDeBloque.astro src/components/TarjetaDeObra.astro src/lib/atribucion.ts` vacío salvo comentarios que nombren la flecha descartada -- partir de lo hecho y medido, con el glifo de la v8.3.
- `src/lib/atribucion.ts` -- la función pura de los hechos y del texto de la fila, con sus dos rótulos como constantes -- un solo dueño de lo que dice la tarjeta (AD-11), probado sin construir.
- `src/components/Rotulo.astro` -- `nivel?: 2 | 3`, por omisión 2, salida de hoy idéntica; docblock: lo usa también la Tarjeta de Obra.
- `src/components/FilaDeBloque.astro` (nuevo) -- según Always; docblock (UX-DR105, UX-DR106, UX-DR107): forma de «Ver la obra», el glifo de avance «›» y por qué no «→» (v8.3), y la reutilizarán «Siguiente» (24.5), los cierres (24.6), los Directorios y la portada; la clase `fila-de-bloque` es por la que la 24.5 eximirá de los 8 px a las filas apiladas.
- `src/components/TarjetaDeObra.astro` (nuevo) -- según Always y Design Notes; docblock con FR-12, UX-DR64, UX-DR104, UX-DR108, UX-DR110 y por qué no está en `BloqueDeCita`.
- `src/pages/cita/[slug].astro` -- `<TarjetaDeObra cita={cita} autor={autor} nivel={2} />` entre `Fuente` y `CopiarCita`, con un comentario.
- `tools/lib/cambios.ts` -- solo comentario en la Página de Cita: desde la 24.4 la Tarjeta de Obra pinta el año, el recuento y si hay edición cotejada, que dependen de las Citas hermanas; es navegación y no fecha ni avisa (excepción de Héctor, 24.8, FR-47).
- `AGENTS.md` -- la Tarjeta de Obra en la lista de la 22.3, y una subsección corta «La Tarjeta de Obra (Historia 24.4)»: dónde va y dónde no, `nivel`, `FilaDeBloque` como fila única con su zona obligatoria y su glifo de avance «›» (U+203A, nunca «→», que la puerta de cobertura para porque no está en `latin`), Pagefind `all`, sin Modelo, «y dónde leerla» por `edicionCotejada`.
- `tests/unit/ayuda/tarjeta-de-obra.ts` (nuevo) -- `tarjetaDeObraDe(html)`: el subárbol `section.tarjeta-de-obra` completo, o `undefined`; lo usan las tres pruebas de abajo.
- `tests/unit/tarjeta-de-obra.test.ts` (nuevo) -- **sin construir:** la función pura en todos los casos de la matriz (también antes de Cristo y la traducción); `Props` de `TarjetaDeObra` (`cita`, `autor`, `nivel: 2 | 3` sin `?` y sin valor por omisión en la desestructuración) y de `FilaDeBloque` (`zona: Zona` obligatoria importada del vocabulario); `TarjetaDeObra.astro` no contiene `<a`, ni `<script`, ni `data-ingreso`; `BloqueDeCita.astro`, `index.astro` y `404.astro` no la importan y solo `src/pages/cita/[slug].astro` la usa; las reglas de la hoja según Always (como `tarjeta-de-cita.test.ts`). **Una construcción que falla:** una sonda sin armazón que pinta la tarjeta con el Autor de otro: código distinto de 0 y la salida nombra la Cita y los dos Autores. **Una construcción** con el fixture de Design Notes: toda Página de Cita con Obra tiene exactamente una tarjeta y ninguna sin Obra; la tarjeta va después del `figure` y de `p.fuente` (si la hay) y antes de la `.isla` de Copiar, dentro de `article`; tiene un ancestro `data-pagefind-ignore="all"` y ningún `data-ingreso`; el `h2` «De la obra» es el de su `aria-labelledby`; el título es `cita.obra.titulo` entero y no está en un `<a>`; los hechos, leídos sin lo `aria-hidden`, son las partes unidas por «, », y sin lo `.solo-para-lectores`, unidas por « · »; un único enlace en la tarjeta, con el texto que toca seguido de un único `span[aria-hidden="true"]` cuyo texto es U+00A0 seguido de «›» (U+203A), y sin «→» (U+2192) en ninguna parte de la tarjeta, a la página 1 de su Obra, que existe en `dist/`, con la declaración más cercana `{ zona: 'tarjeta-de-obra' }` y sin `target`; la Obra `noindex` enlaza igual.
- `tests/unit/ediciones-en-venta.test.ts` -- `describe` 24.4 con `construida('encendida')` y `construida('apagada')`, sin construir más: en toda Página de Cita, el subárbol de la tarjeta es igual byte a byte; la de Brevedad dice «Ver la obra y dónde leerla ›» y la de `IRA_SIN`, «Ver la obra ›» aunque su ficha declare ediciones y la afiliación esté encendida; ninguna Página de Cita lleva `data-ingreso`.
- `tests/unit/obra-pagina.test.ts` -- la construcción abierta de `corpus(1)` pasa a una función memorizada que comparten la `describe` 22.4 y un `it` 24.4 nuevo en la `describe` congelada: en toda Página de Cita, la tarjeta de la congelada es igual byte a byte a la de la abierta, y la de `seneca-cartas-0` (Obra indexable abierta, `noindex` congelada) enlaza a `/obra/seneca/cartas-a-lucilio/`.
- `tests/e2e/ayuda/corpus.ts` -- `citasResueltas` pasa `fuente` a `colgarObras` y conserva el recuento y `edicionCotejada`; nuevas `citaConTarjetaCompleta()` (Obra de ≥ 2 Citas con edición cotejada, la Cita con Fuente y texto ≤ `MAX_CARACTERES_IMAGEN`, la primera por slug) y `citaDeObraSinCotejar()`.
- `tests/e2e/accesibilidad.spec.ts` -- las Páginas de Cita del barrido, derivadas del Corpus (`citaConTarjetaCompleta`, `citaSinObra`, `citaDeObraSinCotejar`, `citaConTituloDeObraMasLargo`) y añadidas a `SUPERFICIES`; las dos primeras caras son obligatorias, las otras dos entran si el Corpus las tiene y una prueba nombra en sus anotaciones la que falte y comprueba en `dist/` la cara de cada una; la prueba 2.8 del orden pasa a «contenido, tarjeta, acciones y después salidas» con Tab real desde el enlace del Autor (Design Notes) en una Cita con tarjeta y en una sin Obra; y a 320 × 640 el título de la Tarjeta de Obra más largo parte en varias líneas sin desplazamiento horizontal.
- `tests/e2e/pagina-de-cita.spec.ts` -- `describe` 24.4: en móvil, con `citaConTarjetaCompleta()` y la del título largo, el texto de la Cita empieza dentro de 360 × 640 sin desplazar, y Copiar queda debajo de la tarjeta (su posición va a las anotaciones); en los dos proyectos, los tokens calculados de la tarjeta y de la fila según Always, `.isla` de Copiar a 32 px ±1 del fondo de la tarjeta, la de Imagen a 16 px ±1 de la de Copiar, y cada botón en su línea y más estrecho que la columna.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- al cerrar, solo la línea de `24-4-bajo-la-cita-la-obra-de-la-que-sale`: su estado y, en lugar del comentario `# bloqueada: …`, uno corto con el desbloqueo («›», v8.3) y el bucle; el resto del fichero y sus comentarios, intactos (se mantiene a mano).

**Acceptance Criteria:**
- Given el repositorio con la historia, when corre `npm run check`, then pasa sin errores.
- Given la suite de Vitest, when corren uno a uno `tarjeta-de-obra`, `ediciones-en-venta`, `obra-pagina`, `medicion`, `tarjeta-de-cita`, `obras`, `lista-de-obras`, `ingreso-construido`, `peso`, `superficies`, `espinas-de-ux`, `publicable-y-alcanzable`, `fecha-de-cambio-build` y `cobertura-build`, then pasan, y `medicion.test.ts` y `obras.test.ts` sin tocar sus tablas ni sus permitidos.
- Given dos `npm run build` del Corpus real con la misma `FECHA_JORNADA`, uno en la línea base y otro con la historia, when se comparan con `diff -rq`, then la segunda sale con código 0 —la puerta de cobertura no nombra ningún carácter—, y solo cambian ficheros de `dist/cita/` (y, si cambian, de `dist/pagefind/`), y en una Cita sin Obra el `<main>` es idéntico.
- Given el sitio construido por `tests/servidor.mjs`, when corren en los dos proyectos `accesibilidad`, `pagina-de-cita`, `rutas-de-salida`, `copiar` y `busqueda`, then pasan, y la prueba de zonas de toque de la 2.8 sin tocarla.

## Spec Change Log

## Review Triage Log

### 2026-10-27 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las capas de revisión de este bucle son externas y en esta pasada no traían hallazgos (no hay secciones «## Hallazgos externos — …» en la invocación); la revisión independiente viene después.

### 2026-10-27 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 15 (high 0, medium 1, low 14)
- defer: 2 (low 2)
- reject: 18
- addressed_findings:
  - `[medium]` `[patch]` La Fila de bloque es flexible y el texto y el «›» eran dos hijos: al partirse el texto el glifo quedaba en su propia columna, no tras la última palabra. Ahora van juntos en un único `span`, el único hijo del enlace (`FilaDeBloque.astro`, docblock al día); la prueba de la construcción lo exige.
  - `[low]` `[patch]` El peso anotado («447,6 MiB en los dos») era el de la línea base: re-medido con las dos construcciones del Corpus real, 469.343.209 → 474.347.283 bytes (447,6 → 452,4 MiB, +4,8 MiB; la tarjeta son ~848 B en 4.416 páginas). Corregido en Auto Run Result.
  - `[low]` `[patch]` `nivel={3}` no se construía nunca: una sonda sin armazón en la construcción de `tarjeta-de-obra.test.ts` pinta la tarjeta con `nivel={3}` (rótulo `h3#de-la-obra`) y `Rotulo` sin nivel, con 2 y con 3.
  - `[low]` `[patch]` Nada comprobaba que la Obra enlazada cumple «y dónde leerla»: la prueba mira en la página de destino «Dónde leer esta obra» con edición cotejada exactamente cuando la fila lo promete, y el estado (c) cuando no.
  - `[low]` `[patch]` `accesibilidad.spec.ts` y `pagina-de-cita.spec.ts` lanzaban al cargar si al Corpus le faltaba una cara obligatoria, tumbando el fichero entero: `citaConTarjetaCompleta` devuelve `undefined` y fallan, con su motivo, solo las pruebas que la piden.
  - `[low]` `[patch]` `accesibilidad.spec.ts` recortaba la tarjeta con su propia expresión y decodificaba a mano: usa `tarjetaDeObraDe` y `leerTarjetaDeObra` de `tests/unit/ayuda/tarjeta-de-obra.ts`, el lector único.
  - `[low]` `[patch]` La deuda de Copiar a 360 × 640 no tenía cota: «justo debajo» se exige como Copiar antes del final de la segunda pantalla (y < 1.280).
  - `[low]` `[patch]` La cifra 53 de `ediciones-en-venta.test.ts` se deriva de las Citas del fixture.
  - `[low]` `[patch]` El U+00A0 literal de `soloTexto` se escribe `\u00A0`.
  - `[low]` `[patch]` Fuera el campo `año` sin uso del tipo de `citasResueltas` en `tests/e2e/ayuda/corpus.ts`.
  - `[low]` `[patch]` `Rotulo.astro` duplica el encabezado en dos ramas: se probó una etiqueta dinámica y Astro pinta el atributo de ámbito como `data-astro-cid-…="true"`, que cambiaba los rótulos de 135 Páginas de Autor y 517 de Obra; se conserva el ternario con un comentario que lo explica.
  - `[low]` `[patch]` El `line-height: 1.4` del título entra en la prueba de la hoja.
  - `[low]` `[patch]` `construidaAbierta` de `obra-pagina.test.ts` memorizaba una promesa rechazada: un rechazo ya no se memoriza.
  - `[low]` `[patch]` La portada y el 404 sin tarjeta solo se sostenían con el `diff`: la construcción de prueba los mira (sin las hojas en línea).
  - `[low]` `[patch]` El barrido pasaba axe dos veces por la misma Página de Cita, con y sin barra final: `SUPERFICIES` se deduplica por la ruta sin barra.

### 2026-10-27 — Review pass (segunda)
- intent_gap: 0
- bad_spec: 0
- patch: 12 (high 0, medium 0, low 12)
- defer: 1 (low 1)
- reject: 18
- addressed_findings:
  - `[low]` `[patch]` `sprint-status.yaml` decía «sin diferidos» en la línea de la 24.4 con dos en el spec: el comentario nombra ahora los tres diferidos (solo esa línea).
  - `[low]` `[patch]` El Auto Run Result mezclaba bloques vigentes y superados sin decir cuál manda: un párrafo «Cómo leer esta sección» al principio, el bloque de la primera implementación marcado como superado y «Para retomar» como histórico, con la rama y el parche del bloqueo declarados innecesarios (borrarlos lo decide Héctor).
  - `[low]` `[patch]` La Atribución con el año de su Cita y la tarjeta sin año de la Obra en la misma página no lo fijaba ninguna prueba: una prueba de la construcción lo exige en las dos Citas de Cartas (62 y 64 → «Séneca · 2 citas»).
  - `[low]` `[patch]` `&nbsp;›` depende de que el `slot` no traiga un salto de línea al final: el docblock de `FilaDeBloque.astro` dice que el texto va en la misma línea que la etiqueta, para la 24.5, la 24.6, la 26 y la 28.
  - `[low]` `[patch]` Las dos ramas de `Rotulo.astro` podían divergir: una prueba sin construir compara sus atributos y su contenido, y la sonda de la construcción pinta `destino` en `h2` y en `h3` y exige la misma apertura.
  - `[low]` `[patch]` La comprobación «sin Obra» de `accesibilidad.spec.ts` buscaba la clase en el HTML crudo, que una hoja en línea traería: usa el lector `tarjetaDeObraDe` y busca el rótulo.
  - `[low]` `[patch]` `citaConTarjetaCompleta` medía el texto en unidades UTF-16: usa `admiteImagen` de `src/lib/tramos.ts`, la regla del sitio (puntos de código), y deja de importar `MAX_CARACTERES_IMAGEN` (blind-hunter y edge-case-hunter, un solo parche).
  - `[low]` `[patch]` `not.toContain('<a')` también casaba con `<aside`/`<abbr`/`<article` y con comentarios: `/<a[\s>]/` sobre la fuente sin comentarios; el comentario de `reglasDe` dice que aplana los `@media`.
  - `[low]` `[patch]` Restos de `obra-pagina.test.ts` y `accesibilidad.spec.ts`: la ruta de Cartas se comprueba antes de usarse, el `> 50` pasa a «una Página de Cita por cada Cita del fixture» y fuera el envoltorio `tarjetaDe`.
  - `[low]` `[patch]` «Mismo trato que la Lista de Obras» se probaba contra cadenas escritas en la prueba: ahora contra las reglas de `ListaDeObras.astro` (`.lista-de-obras a` y `.titulo`), para que no diverjan sin que nada falle.
  - `[low]` `[patch]` Sin Obra, la separación de Copiar no se medía en el navegador: una prueba de `pagina-de-cita.spec.ts` la mide (32 px ±1 del `figure` o de la Línea de la Fuente) en los dos proyectos.
  - `[low]` `[patch]` La «deuda» de la baseline y del WIP sin cierre (blind-hunter): cubierta por el párrafo «Cómo leer esta sección» del Auto Run Result.

Diferido: el interlineado 1,4 de la Fila de bloque y de la Lista de Obras frente al 1,6 de `body-md` (anterior a la historia; lo decide Héctor). Rechazados: la deuda de Copiar a 360 × 640 (la acepta la propia historia y la vigila SM-C5), las hermanas sin fecha ni aviso y la caída por tiempo de `rutas-de-salida.spec.ts:98` (ya diferidos), el `id` fijo del rótulo (lo fija el contrato; una tarjeta por página hasta la 28.2), el `href` sin tipo de ruta interna (el contrato pide `string`), el estado al pasar el cursor (es el trato de la Lista de Obras y el anillo global), las dos líneas a 320 px (las pide la propia historia sobre el título más largo), el modo oscuro (tokens del sitio), Pagefind (el atributo `all` está probado), el formato y el cero del recuento (una Cita siempre cuenta en su Obra; cuatro cifras no llevan punto), el centinela de `pagina-de-cita.spec.ts`, `construidaAbierta` con código distinto de 0 (cada uso lo comprueba), las lecturas R3–R6 de intent-alignment (el contrato fija la R1; la R5 es el diferido de la 24.8), la partición de palabras sin fixture (la propiedad calculada está probada), los años de traducción solo en la prueba pura (los resuelve `resolverObras`, probada en `obras.test.ts`), la comprobación del Corpus real por `diff -rq` (es la verificación del spec) y el estado `review` del tablero (lo cambia la fusión de la épica).

## Design Notes

**El marcado de referencia** (la regla de las pausas pegadas es la de la 24.3: Astro conserva un espacio donde hay salto de línea):

```astro
<section class="tarjeta-de-obra" aria-labelledby="de-la-obra" data-pagefind-ignore="all">
  <Rotulo id="de-la-obra" nivel={nivel}>De la obra</Rotulo>
  <p class="titulo">{obra.titulo}</p>
  <p class="hechos">{hechos.map((parte, i) => (<>{i > 0 && (<><span aria-hidden="true"> · </span><span class="solo-para-lectores">, </span></>)}{parte}</>))}</p>
  <ul class="filas"><FilaDeBloque href={rutaDeLaObra(obra)} zona="tarjeta-de-obra" avance>{fila}</FilaDeBloque></ul>
</section>
```

**La zona y la fila.** La zona va en el `li` de la Fila de bloque, el contenedor que pinta el build; la sección no declara ninguna porque su único enlace la trae. En la 24.5, «Siguiente» será otra `FilaDeBloque` con `zona="siguiente"` encima de esta. La Lista de Obras no se migra: tiene dos columnas, el filete solo entre entradas y la zona en el `ul`, y el Directorio de Obras la reutiliza tal cual; la Fila de bloque toma su trato, no su marcado.

**El fixture de `tarjeta-de-obra.test.ts`.** Séneca (`AUTOR_VALIDO`) con «Sobre la brevedad de la vida» 3 Citas cotejadas de `año: 49`, «De la ira» 1 cotejada de 41 (`noindex`) y «Cartas a Lucilio» 2 sin Fuente de 62 y 64; una Cita sin Obra (`procedencia: { referencia }`, sin Fuente); Antonio Machado con una Obra de título de 163 caracteres, 2 Citas cotejadas. Un Tema, `el-tiempo`. Las Citas sin Fuente van en `pendientes-de-cotejo.yml`, así que los documentos de las cotejadas se escriben a mano como en `tarjeta-de-cita.test.ts`. La sonda del Autor ajeno pinta `TarjetaDeObra` con la primera Cita y el Autor de Machado.

**La prueba del orden de tabulación.** Se enfoca el enlace del Autor y se pulsa Tab hasta el primer enlace de `nav`, anotando el grupo de cada elemento enfocado: `figcaption` o `.fuente` es contenido, `.tarjeta-de-obra` es tarjeta, `.isla` es acción (Copiar, Imagen, la hoja o los destinos de compartir) y `nav` es salida; cualquier otro, fallo. Con tarjeta, los grupos seguidos son `contenido, tarjeta, acción, salida`, con el Autor, el título de la Obra y la Fuente delante y «Ver la obra y dónde leerla» como única parada de la tarjeta; sin Obra, `contenido, acción, salida`. Ningún elemento de `main` lleva `tabindex` positivo. La enmienda del texto de la Historia 2.8 —el orden y las zonas de toque— ya está en `epics.md` (v8, 2026-10-19); aquí solo cambia su prueba del orden, y la exención de las filas apiladas en la prueba de toque llega con la 24.5, la primera que apila dos.

**El glifo de avance (v8.3).** «›» (U+203A) y no «→»: la flecha no está en el subconjunto `latin` de Google Fonts de ninguna de las dos familias y la puerta de cobertura paró las 4.416 Páginas de Cita (Auto Run Result). Lo decidió Héctor el 2026-10-27 y lo recogen `DESIGN.md`, `EXPERIENCE.md` y `epics.md` (UX-DR107, e54a0594ab y f571d0c0de). Va en un `span` `aria-hidden`, pegado al texto con `&nbsp;` para que nunca quede solo en una línea, y el nombre accesible del enlace es solo el texto. La 24.5, la 24.6, la 26 y la 28 lo heredan de `FilaDeBloque`; «↓» de «Dónde leer esta obra» no cambia.

**Pagefind.** `all` y no el atributo a secas: la tarjeta nombra el título y el Autor, que Pagefind no debe recoger ni como texto ni como filtro desde cada Página de Cita (NFR-13).

## Verification

**Commands:** desde `/Users/hec/brainlySabiduria/.claude/worktrees/v8-epicas-24-26`; lo que pase de ~8 min, con `/Users/hec/brainlySabiduria/.claude/v8-ralph/correr.sh /Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-24-26/24-4-<nombre>.log /Users/hec/brainlySabiduria/.claude/worktrees/v8-epicas-24-26 <orden>` y llamadas sucesivas a `/Users/hec/brainlySabiduria/.claude/v8-ralph/esperar.pl <log> 540`.
- Antes de tocar código: `FECHA_JORNADA=2026-10-26 npm run build` y mover `dist/` a un directorio del scratchpad (`$ANTES`); después de implementar, la misma orden y `diff -rq "$ANTES" dist` -- solo `dist/cita/` (y quizá `dist/pagefind/`); anotar el recuento y borrar `$ANTES`.
- `npx vitest run tests/unit/tarjeta-de-obra.test.ts`, y uno a uno los demás del criterio -- verdes.
- `npm run check` -- 0 errores. `npm test` en segundo plano (≈16 min) -- `FINISHED EXIT=0`.
- `npx playwright test tests/e2e/accesibilidad.spec.ts tests/e2e/pagina-de-cita.spec.ts tests/e2e/rutas-de-salida.spec.ts tests/e2e/copiar.spec.ts tests/e2e/busqueda.spec.ts` en segundo plano (puertos 4321 y 8787) -- verde; parar todo servidor arrancado.

**Manual checks (if no CLI):**
- Hasta la 26.9, el reflujo a 320 px de la Página de Cita con el título de Obra más largo se mira con una captura: el título parte en varias líneas, nada se sale y la fila cabe. Anotar en el spec el alto de la tarjeta a 360 px y la posición de Copiar en la primera pantalla.

## Auto Run Result

**Cómo leer esta sección.** Los bloques son el historial del bucle y no se reescriben: la implementación, la replanificación y el bloqueo anterior a ella, y después una entrada por pasada de revisión, de la más antigua a la más nueva. **Manda el último bloque** («Revisión, segunda pasada»): sus cifras de pruebas, parches y diferidos y el `followup_review_recommended` del frontmatter son los vigentes. «Para retomar» y la rama `v8/wip-24-4-tarjeta-de-obra` / `24-4-tarjeta-de-obra-wip.patch` son del bloqueo: la implementación entró en `v8/epicas-24-26` desde 253b605b97, así que la rama y el parche ya no hacen falta para nada (borrarlos lo decide Héctor; la rama es local).

**Implementación (2026-10-27, bucle v8-ralph).** Status: done. Línea base `ac71f2cd11129ebd42caa1aaabb34c6456191dcb` (el spec replanificado); se partió del commit guardado `b05d7e4c70429dfc7e054f789f5b8b03a9a40ac3` con `git cherry-pick --no-commit`, con la prop `flecha` renombrada a `avance` y el glifo cambiado a `&nbsp;›` (U+203A).

Qué cambia:
- `src/lib/atribucion.ts` -- `contenidoDeTarjetaDeObra` y las constantes `FILA_VER_LA_OBRA_Y_DONDE_LEERLA` / `FILA_VER_LA_OBRA`: lo único que dice la tarjeta.
- `src/components/Rotulo.astro` -- `nivel?: 2 | 3`, por omisión 2; los usos de hoy salen byte a byte iguales (comprobado en la construcción real).
- `src/components/FilaDeBloque.astro` (nuevo) -- la Fila de bloque con `zona` obligatoria y `avance` («›» en `span` `aria-hidden`), docblock con el porqué de «›» y no «→».
- `src/components/TarjetaDeObra.astro` (nuevo) -- la tarjeta, con la guarda del Autor ajeno.
- `src/pages/cita/[slug].astro` -- la tarjeta entre `Fuente` y `CopiarCita`, `nivel={2}`.
- `tools/lib/cambios.ts` -- solo comentario (navegación que no fecha ni avisa, 24.8).
- `AGENTS.md` -- la Tarjeta de Obra en la lista de la 22.3 y la subsección «La Tarjeta de Obra (Historia 24.4)».
- `tests/unit/ayuda/tarjeta-de-obra.ts` (nuevo), `tests/unit/tarjeta-de-obra.test.ts` (nuevo, 23 pruebas: matriz pura, contrato de los componentes, hoja, construcción que falla y construcción), `tests/unit/ediciones-en-venta.test.ts` (`describe` 24.4), `tests/unit/obra-pagina.test.ts` (construcción abierta memorizada y `it` 24.4 en la congelada).
- `tests/e2e/ayuda/corpus.ts` (`citasResueltas` con Fuente, recuento y `edicionCotejada`; `citaConTarjetaCompleta`, `citaDeObraSinCotejar`), `tests/e2e/accesibilidad.spec.ts` (las cuatro caras de Página de Cita en el barrido, su comprobación en `dist/`, el orden de tabulación con Tab real y el reflujo a 320 px), `tests/e2e/pagina-de-cita.spec.ts` (`describe` 24.4).

Verificación:
- `FECHA_JORNADA=2026-10-26 npm run build` en la línea base y con la historia: las dos con código 0; la segunda pasa la puerta de cobertura («5288 páginas, 2 familias, sin caídas al tipo de reserva»). `diff -rq`: 4.422 líneas, 4.420 páginas de `dist/cita/` y el par de la hoja `_astro/_slug_.*.css` (solo la usan las Páginas de Cita); ningún fichero de `dist/pagefind/`, ninguna Página de Obra, de Autor, la portada ni el 404. En una Cita sin Obra (`concepcion-arenal-abrid-escuelas-y-se-cerraran-carceles`) el `<main>` es idéntico (mismo SHA-1). Peso: ~~447,6 MiB en 15.340 ficheros en los dos~~ — corregido en la revisión: 469.343.209 → 474.347.283 bytes (447,6 → 452,4 MiB), 15.340 ficheros en los dos.
- Vitest uno a uno: `tarjeta-de-obra` 23, `ediciones-en-venta` 55, `obra-pagina` 66, `medicion` 496 (sin tocarla), `tarjeta-de-cita` 20, `obras` 117 (sin tocarla), `lista-de-obras` 18, `ingreso-construido` 38, `peso` 56, `superficies` 99, `espinas-de-ux` 10, `publicable-y-alcanzable` 30, `fecha-de-cambio-build` 10, `cobertura-build` 2: todo verde.
- `npm run check`: 0 errores. `npm test`: 135 ficheros, 6.180 pruebas, verde (774 s).
- Playwright `accesibilidad`, `pagina-de-cita`, `rutas-de-salida`, `copiar`, `busqueda` en los dos proyectos: 259 verdes, 6 saltadas por proyecto, 1 caída por tiempo en `[movil] rutas-de-salida.spec.ts:98` (41,5 s con la máquina cargada; en escritorio 12,8 s). Repetido `rutas-de-salida.spec.ts` solo: 14 verdes (la misma prueba en 13,6 s). La tarjeta no añade destinos nuevos a esa prueba: su enlace es el mismo que el del título en la Atribución. La prueba de zonas de toque de la 2.8, sin tocarla, verde.
- Medido en el navegador (anotaciones de Playwright): a 360 × 640 la tarjeta de `agustin-alvarez-ahora-empieza-a-haber-quienes-piensen-en` mide 188 px desde y = 536 y Copiar queda en y = 756, fuera de la primera pantalla; con el título de Obra más largo (`mariano-jose-de-larra-la-verdad-del-teatro-es-enteramente-convencional`), 260 px desde y = 575 y Copiar en y = 867 (deuda aceptada que vigila SM-C5). A 320 px ese título ocupa 119 px (cinco líneas de 23,8 px), la fila cabe y no hay desplazamiento horizontal; la captura manual la sustituye esta medida.
- Auditoría de la matriz: cada fila la cubre al menos una prueba que corrió y pasó (pura en `tarjeta-de-obra.test.ts` para las diez; construida para varias Citas, una Cita, años discrepantes, sin cotejar, `noindex`, título largo, sin Obra y Autor ajeno; congelada en `obra-pagina.test.ts`; sin cotejar con ediciones y afiliación encendida en `ediciones-en-venta.test.ts`).

Revisión: 0 parches, 0 diferidos, 0 rechazados en esta pasada (capas externas sin hallazgos todavía). `followup_review_recommended: false` (0 parches; puntuación 0). *(Superado por las pasadas de revisión de abajo.)*

Riesgos residuales: Copiar sale de la primera pantalla de 360 × 640 en las Citas con tarjeta (deuda aceptada, SM-C5); la prueba de `rutas-de-salida.spec.ts:98` recorre todas las Páginas de Cita y roza su límite de 30 s cuando la máquina va cargada, sin relación con esta historia.


**Replanificación (2026-10-27, bucle v8-ralph).** Con el glifo «›» el contrato ya no exige tocar la configuración de Astro: se enmiendan el enfoque, la `FilaDeBloque` (prop `avance`, `&nbsp;›`), la matriz y las pruebas, se añade la tarea de partir del commit guardado y el criterio de que la construcción real pasa la puerta de cobertura. Lo demás del contrato no cambia. Estado: `ready-for-dev`. Lo de abajo es el historial del bloqueo y lo medido entonces.

**Desbloqueo (2026-10-27).** Héctor decidió en el chat cambiar «→» por «›» (U+203A), que el subconjunto `latin` ya cubre; `DESIGN.md`, `EXPERIENCE.md` y `epics.md` quedan enmendados en e54a0594ab y f571d0c0de (v8.3). Sin cambio de fuentes ni de la puerta. El spec vuelve a borrador para replanificarlo con el glifo nuevo y retomar la rama `v8/wip-24-4-tarjeta-de-obra`.

Status: blocked (anterior al desbloqueo)
Blocking condition: Block If del spec — cumplir el contrato exige tocar la configuración de Astro. La flecha «→» (U+2192) que `FilaDeBloque.astro` pinta como `<span aria-hidden="true">&nbsp;→</span>` no la cubre ninguna fuente declarada en `fonts` de `astro.config.mjs` (Inter y Source Serif 4, `subsets: ['latin']`), y la puerta de cobertura tipográfica (`integraciones/cobertura.ts`, criterio en `tools/lib/cobertura.ts`) detiene `npm run build`. Lo decide Héctor.

Planificada por el bucle v8-ralph (2026-10-26) sobre `epic-24-context.md`, la continuidad de la 24.3 (`status: done`) y el código del worktree. Implementación detenida el 2026-10-26 en la verificación.

**Lo que falla.** `FECHA_JORNADA=2026-10-26 npm run build` con la historia sale con código 1 en `astro:build:done`: «Caracteres que las fuentes declaradas no saben componer: «→» U+2192 — cita/… (+4413 más)», es decir, las 4.416 Páginas de Cita con Obra. El rango `latin` de Google Fonts (`U+0000-00FF, …, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, …`) trae «↑» y «↓» —por eso la 24.7 pudo poner «Dónde leer esta obra ↓»— pero no «→». Ninguno de los subconjuntos que Google sirve de las dos familias lo cubre (consultado el 2026-10-26: Inter tiene `cyrillic-ext`, `cyrillic`, `greek-ext`, `greek`, `vietnamese`, `latin-ext` y `latin`; Source Serif 4, los mismos sin `greek-ext`), así que ni siquiera ensanchar `subsets` basta: haría falta otra forma de servir la fuente. La puerta exige que **todas** las familias cubran el carácter.

**Por qué no se rodea.** `DESIGN.md § Iconografía` dice que las flechas son glifos tipográficos de la familia del rótulo, ocultos al lector, y no iconos: un SVG lo contradice; ponerla con `content` de CSS esquiva la puerta pero la compone igual con la reserva del sistema, que es justo lo que la puerta impide; y cambiar el glifo es decisión de diseño (`bmad-ux`). La misma flecha la piden la 24.5 («Siguiente cita de esta obra →»), la 24.6 («Las {n} citas de… →»), la 26 y la 28, así que la decisión vale para toda la rama 24+26.

**Opciones para Héctor** (ninguna la toma un agente):
1. Servir Inter y Source Serif 4 con un recorte propio que incluya U+2192 —por ejemplo, con el proveedor local de la API de fuentes de Astro—, en `astro.config.mjs`; es un `.woff2` más o distinto en el camino crítico, decisión que el propio fichero dice que se mide.
2. Cambiar el glifo por uno del rango `latin` (por ejemplo «›», U+203A), enmendando `DESIGN.md`/`EXPERIENCE.md` con `bmad-ux` y el spec con `bmad-build`.
3. Afinar la puerta para que juzgue cada carácter solo contra la familia que lo compone (hoy exige la intersección, y su propio comentario dice cuándo dejaría de bastar); seguiría haciendo falta que Inter cubra U+2192, así que no evita la opción 1.

**Lo que queda hecho y guardado.** La implementación parcial está en la rama local `v8/wip-24-4-tarjeta-de-obra`, commit `b05d7e4c70429dfc7e054f789f5b8b03a9a40ac3`, fuera de `v8/epicas-24-26` porque no construye: `contenidoDeTarjetaDeObra` y las constantes `FILA_VER_LA_OBRA_Y_DONDE_LEERLA` / `FILA_VER_LA_OBRA` en `src/lib/atribucion.ts`; `nivel?: 2 | 3` en `Rotulo.astro`; `FilaDeBloque.astro` y `TarjetaDeObra.astro` nuevos; la tarjeta en `src/pages/cita/[slug].astro` entre `Fuente` y `CopiarCita`; el comentario de la 24.8 en `tools/lib/cambios.ts`; y el lector `tests/unit/ayuda/tarjeta-de-obra.ts`. Faltan las pruebas unitarias y de punta a punta, `AGENTS.md` y la verificación entera.

**Lo que se midió con esa implementación** (el `dist/` que la construcción dejó escrito antes de detenerse; sin Pagefind ni sitemap, que no llegaron a correr): `diff -rq -x pagefind` contra la línea base da 4.424 diferencias, todas en `dist/cita/` (4.420 páginas, porque todas enlazan la hoja de la Página de Cita) salvo la propia hoja `_astro/_slug_.*.css`, que solo la usan las Páginas de Cita, y el sitemap que faltaba. Ninguna Página de Obra, de Autor, la portada ni el 404 cambian, así que `nivel` deja los rótulos de hoy byte a byte iguales; en una Cita sin Obra (`concepcion-arenal-abrid-escuelas-y-se-cerraran-carceles`, una de las 4 del Corpus) el `<main>` es idéntico. Una tarjeta sale así: rótulo `h2#de-la-obra`, título, «Agustín Álvarez · 20 citas» con el punto `aria-hidden` y la coma para lectores pegados, y una sola fila `li.fila-de-bloque[data-zona="tarjeta-de-obra"]` a la página 1 de su Obra con «Ver la obra y dónde leerla».

**Para retomar** *(histórico: ya se retomó; véase «Cómo leer esta sección»)*: con la decisión tomada (y, si es la opción 1, su commit en la principal o en la rama), devolver este spec a `ready-for-dev` —o enmendarlo con `bmad-build` si cambia el glifo—, partir de `v8/wip-24-4-tarjeta-de-obra` —o, si la rama ya no está, de `git am _bmad-output/implementation-artifacts/24-4-tarjeta-de-obra-wip.patch`, el mismo commit— y seguir por las tareas de pruebas de **Tasks & Acceptance**.

**Revisión, primera pasada (2026-10-27, bucle v8-ralph).** Status: done. Cinco capas externas (blind-hunter, edge-case-hunter, verification-gap sin hallazgos, intent-alignment, ac-auditor); 15 parches aplicados (1 medio, 14 bajos), 2 diferidos (bajos) y 18 rechazados. Ningún `intent_gap` ni `bad_spec`.

Qué cambia en esta pasada:
- `src/components/FilaDeBloque.astro` -- texto y glifo en un único `span`, el único hijo del enlace flexible, para que «›» siga a la última palabra cuando el texto parte; docblock al día.
- `src/components/Rotulo.astro` -- solo un comentario: por qué dos ramas y no una etiqueta dinámica (Astro la pinta con `data-astro-cid-…="true"`, y se probó: cambiaba 135 Páginas de Autor y 517 de Obra).
- `tests/unit/tarjeta-de-obra.test.ts` -- sonda de `nivel={3}` y de `Rotulo` en la construcción, la página de destino cumple «y dónde leerla», portada y 404 sin tarjeta, el `span` único de la fila, el `line-height` del título; la Cita sin Obra se mira sin las hojas en línea (la sonda comparte la hoja de la tarjeta).
- `tests/unit/ayuda/tarjeta-de-obra.ts` (`\u00A0` visible), `tests/unit/ediciones-en-venta.test.ts` (recuento derivado del fixture), `tests/unit/obra-pagina.test.ts` (no memoriza un rechazo).
- `tests/e2e/ayuda/corpus.ts` (`citaConTarjetaCompleta` devuelve `undefined`, `SIN_TARJETA_COMPLETA`, fuera `año`), `tests/e2e/accesibilidad.spec.ts` (caras obligatorias que fallan por prueba, lector único de la tarjeta, barrido sin duplicados por la barra final), `tests/e2e/pagina-de-cita.spec.ts` (cara obligatoria por prueba, Copiar antes de y = 1.280).

Verificación de esta pasada:
- Dos `FECHA_JORNADA=2026-10-26 npm run build` del Corpus real, `src/` en la línea base y con los parches: las dos con código 0 y la cobertura sin caídas; `diff -rq` 4.422 líneas, 4.420 de `dist/cita/` y el par de `_astro/_slug_.*.css`, nada más; `<main>` de la Cita sin Obra idéntico (SHA-1 `1ec052ee…`); peso 469.343.209 → 474.347.283 bytes (+4,8 MiB; la tarjeta mide ~848 B en cada una de las 4.416 Páginas de Cita con Obra), lejos del aviso de 750 MiB.
- `npx vitest run tests/unit/tarjeta-de-obra.test.ts`: 26 verdes. `npm run check`: 0 errores. `npm test`: 135 ficheros, 6.183 pruebas, verde (764 s).
- Playwright `accesibilidad`, `pagina-de-cita`, `rutas-de-salida`, `copiar`, `busqueda` en los dos proyectos: 255 verdes, 6 saltadas, y otra vez la caída por tiempo de `[movil] rutas-de-salida.spec.ts:98` (41,4 s; en escritorio 13,4 s). Repetido `rutas-de-salida.spec.ts --project=movil` solo: 7 verdes (esa prueba en 11,9 s). Diferido con su evidencia: la tarjeta no le añade destinos.

`followup_review_recommended: true` — parches de esta pasada: 0 altos, 1 medio, 14 bajos; puntuación 3 × 1 + 14 = 17 (≥ 5).

Riesgos residuales: Copiar sigue fuera de la primera pantalla de 360 × 640 en las Citas con tarjeta (deuda aceptada, SM-C5; ahora con cota de la segunda pantalla); la caída por tiempo de `rutas-de-salida.spec.ts:98` bajo carga (diferida); la Tarjeta de Obra de las hermanas no fecha ni avisa (excepción de la 24.8, diferida).

**Revisión, segunda pasada (2026-10-27, bucle v8-ralph).** Status: done. Cinco capas externas (blind-hunter, edge-case-hunter, verification-gap sin hallazgos, intent-alignment, ac-auditor); 12 parches aplicados (12 bajos), 1 diferido (bajo) y 18 rechazados. Ningún `intent_gap` ni `bad_spec`. El código de producción solo cambia en un comentario.

Qué cambia en esta pasada:
- `src/components/FilaDeBloque.astro` -- solo el docblock: el texto de la fila va en la misma línea que la etiqueta, o el «›» puede quedarse solo.
- `tests/unit/tarjeta-de-obra.test.ts` -- las dos ramas de `Rotulo` comparadas sin construir y con `destino` en la sonda; el trato de la Fila de bloque contra las reglas de `ListaDeObras.astro`; la Atribución con el año de su Cita junto a la tarjeta sin año de la Obra; `/<a[\s>]/` sobre la fuente sin comentarios; el comentario de `reglasDe`.
- `tests/unit/obra-pagina.test.ts` -- la ruta de Cartas comprobada antes de usarse y una Página de Cita por Cita del fixture en lugar de «> 50».
- `tests/e2e/ayuda/corpus.ts` (`admiteImagen` en vez de `.length`), `tests/e2e/accesibilidad.spec.ts` (sin Obra por el lector de la tarjeta; fuera el envoltorio), `tests/e2e/pagina-de-cita.spec.ts` (sin Obra, Copiar a 32 px ±1 de lo de arriba, medido).
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- solo el comentario de la línea de la 24.4: los tres diferidos.
- Este spec -- el diferido nuevo, «Cómo leer esta sección» y los bloques superados marcados como tales.

Verificación de esta pasada:
- `npx vitest run tests/unit/tarjeta-de-obra.test.ts`: 28 verdes. `npx vitest run tests/unit/obra-pagina.test.ts`: 66 verdes. `npm run check`: 0 errores. `npm test`: 135 ficheros, 6.185 pruebas, verde (731 s).
- Playwright `accesibilidad`, `pagina-de-cita`, `rutas-de-salida`, `copiar`, `busqueda` en los dos proyectos: 257 verdes, 6 saltadas, y la caída por tiempo ya diferida de `[movil] rutas-de-salida.spec.ts:98` (42,3 s; en escritorio 14,2 s). Repetido `rutas-de-salida.spec.ts --project=movil` solo: 7 verdes (esa prueba en 9,8 s). La prueba nueva de Copiar sin Obra, verde en los dos proyectos.
- El `dist/` del Corpus real que reconstruyó `tests/servidor.mjs` con los parches: `shasum` de `dist/cita/` y `dist/_astro/` idéntico, fichero a fichero (4.423), al de la construcción anterior de `e95f6ba534`; el docblock no cambia la salida, así que el `diff -rq` y el peso de la primera pasada siguen valiendo.

`followup_review_recommended: true` — parches de esta pasada: 0 altos, 0 medios, 12 bajos; puntuación 3 × 0 + 12 = 12 (≥ 5).

Riesgos residuales: Copiar fuera de la primera pantalla de 360 × 640 en las Citas con tarjeta (deuda aceptada, SM-C5); la caída por tiempo de `rutas-de-salida.spec.ts:98` bajo carga, que pone en rojo la pasada conjunta de Playwright (diferida); la Tarjeta de Obra de las hermanas no fecha ni avisa (24.8, diferida); el interlineado 1,4 frente al 1,6 de `body-md` (diferido, lo decide Héctor).
