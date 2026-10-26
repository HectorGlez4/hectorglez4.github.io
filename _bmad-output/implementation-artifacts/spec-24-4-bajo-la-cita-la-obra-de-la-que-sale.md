---
title: 'Historia 24.4 — Bajo la Cita, la obra de la que sale'
type: 'feature'
created: '2026-10-26'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-24-context.md'
warnings:
  - oversized
deferred: []
---

<intent-contract>

## Intent

**Problem:** La Página de Cita nombra su Obra solo dentro de la línea de la Procedencia, así que quien llega desde un buscador no ve de qué libro sale la frase, cuántas citas hay de él ni que puede ir a la Obra y a dónde leerla; y el sitio no tiene todavía la Fila de bloque que «Siguiente» (24.5), los cierres (24.6), los Directorios (26) y la portada (28) van a reutilizar.

**Approach:** Un componente único, `TarjetaDeObra.astro`, entre la Línea de la Fuente (o la Atribución) y Copiar en la Página de Cita y solo allí: rótulo «De la obra» con el nivel que recibe, el título de la ficha, «{Autor} · {año} · {n} citas» y una Fila de bloque —un componente nuevo, `FilaDeBloque.astro`, escrito una vez con el trato de la Lista de Obras— que dice «Ver la obra y dónde leerla →» o «Ver la obra →» y lleva a la página 1 de la Obra con la zona `tarjeta-de-obra`. Todo en el HTML del build, sin guion, fuera de Pagefind, sin Modelo, idéntico con afiliación o congelación.

## Boundaries & Constraints

**Always:**
- `TarjetaDeObra.astro`: `interface Props { cita: Cita; autor: Autor; nivel: 2 | 3 }`, `nivel` obligatorio y sin valor por omisión (la Página de Cita pasa `2`; la portada pasará `3` en la 28.2). Sin `cita.obra` no pinta nada —ni sección, ni rótulo, ni hueco—, como `Fuente.astro`. Si `autor.slug` no es `cita.autor`, detiene la construcción con un error que nombra la Cita, la ruta (`Astro.url.pathname`) y los dos Autores.
- Raíz `<section class="tarjeta-de-obra" aria-labelledby="de-la-obra" data-pagefind-ignore="all">`, sin `data-ingreso` ni `<script>`. Dentro, en este orden: el rótulo «De la obra» con `Rotulo.astro` (`id="de-la-obra"`, nivel recibido); `<p class="titulo">` con `cita.obra.titulo`, sin enlace; `<p class="hechos">`; `<ul class="filas">` con una sola `FilaDeBloque` (`zona="tarjeta-de-obra"`, `href` = `rutaDeLaObra(cita.obra)`, la página 1 se indexe o no). El componente no escribe ningún `<a>` propio.
- Los hechos y el texto de la fila los compone una función pura nueva de `src/lib/atribucion.ts`, junto a `descripcionDeObra` y `añoLegible`: partes `[autor.nombre, añoLegible(obra.año)?, «1 cita» | «{n} citas»]` con `obra.recuento` y `obra.año` de la Obra resuelta (nunca se cuenta ni se deriva en el componente), y «Ver la obra y dónde leerla» si `obra.edicionCotejada`, «Ver la obra» si no. Las constantes de los dos rótulos viven ahí.
- En los hechos, entre parte y parte va `<span aria-hidden="true"> · </span><span class="solo-para-lectores">, </span>` pegado a las dos, sin espacio entre etiquetas; ningún separador al principio ni al final ni de sobra cuando falta el año.
- `FilaDeBloque.astro`: `interface Props` con `href: string`, `zona: Zona` obligatoria (`import type { Zona } from '../lib/vocabulario.ts';`) y la flecha opcional; pinta `<li class="fila-de-bloque" data-zona={zona}><a href={href}>…</a></li>`, sin `target`, y la flecha la pone el propio componente como `<span aria-hidden="true">&nbsp;→</span>`. Trato de la Lista de Obras: el `li` con filete inferior `var(--grosor-filete) solid var(--filete)`; el `a` en flex centrado, `min-height: var(--zona-de-toque)`, `padding-block: calc(var(--unidad) * 1.25)`, `var(--sans)`, `var(--cuerpo-md)`, interlineado 1,4, `var(--tinta)`, `text-decoration: none`, y parte palabras antes que desbordar.
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
- Escribir en `src/` la cadena `procedencia.obra` ni sus variantes, tampoco en comentarios (`tests/unit/obras.test.ts`, 22.3).
- Enlazar el título o el Autor de la tarjeta, abrir en otra pestaña, que la tarjeta dependa de `ediciones`, de la afiliación, de la indexabilidad o de la congelación, o poner «Sin año documentado» o cualquier frase de relleno.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Obra de varias Citas, cotejada | 3 Citas con Fuente, `año: 49` | hechos «Séneca · 49 · 3 citas» (lector «Séneca, 49, 3 citas»); fila «Ver la obra y dónde leerla →» a la página 1 | — |
| Obra de una Cita | `recuento: 1` | «… · 1 cita» | — |
| Años discrepantes | Citas con 62 y 64 | «Séneca · 2 citas»: sin año, sin hueco ni separador de sobra | el build avisa como ya hace |
| Solo año de traducción | `traduccion.año: 1888`, sin `año` | «Epicteto · 2 citas», nunca 1888 | — |
| Antes de Cristo | `año: -350` | «Aristóteles · 350 a. C. · 1 cita» | — |
| Obra sin cotejar | ninguna Cita con Fuente (aunque la ficha declare `ediciones`) | «Ver la obra →» | — |
| Obra `noindex` o congelada fuera | Obra de una Cita, o familia congelada | la misma tarjeta, a la página 1 de la Obra, que existe en `dist/` | — |
| Título largo | título de 163 caracteres | entero, sin «…», en varias líneas | — |
| Cita sin Obra | Procedencia sin obra resuelta | ni sección, ni «De la obra»; Copiar sigue a la Fuente o a la Atribución | — |
| Autor ajeno | `autor.slug` ≠ `cita.autor` | — | la construcción se detiene nombrando la Cita, la ruta y los dos Autores |

</intent-contract>

## Code Map

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
- `src/lib/atribucion.ts` -- la función pura de los hechos y del texto de la fila, con sus dos rótulos como constantes -- un solo dueño de lo que dice la tarjeta (AD-11), probado sin construir.
- `src/components/Rotulo.astro` -- `nivel?: 2 | 3`, por omisión 2, salida de hoy idéntica; docblock: lo usa también la Tarjeta de Obra.
- `src/components/FilaDeBloque.astro` (nuevo) -- según Always; docblock (UX-DR105, UX-DR106): forma de «Ver la obra», y la reutilizarán «Siguiente» (24.5), los cierres (24.6), los Directorios y la portada; la clase `fila-de-bloque` es por la que la 24.5 eximirá de los 8 px a las filas apiladas.
- `src/components/TarjetaDeObra.astro` (nuevo) -- según Always y Design Notes; docblock con FR-12, UX-DR64, UX-DR104, UX-DR108, UX-DR110 y por qué no está en `BloqueDeCita`.
- `src/pages/cita/[slug].astro` -- `<TarjetaDeObra cita={cita} autor={autor} nivel={2} />` entre `Fuente` y `CopiarCita`, con un comentario.
- `tools/lib/cambios.ts` -- solo comentario en la Página de Cita: desde la 24.4 la Tarjeta de Obra pinta el año, el recuento y si hay edición cotejada, que dependen de las Citas hermanas; es navegación y no fecha ni avisa (excepción de Héctor, 24.8, FR-47).
- `AGENTS.md` -- la Tarjeta de Obra en la lista de la 22.3, y una subsección corta «La Tarjeta de Obra (Historia 24.4)»: dónde va y dónde no, `nivel`, `FilaDeBloque` como fila única con su zona obligatoria, Pagefind `all`, sin Modelo, «y dónde leerla» por `edicionCotejada`.
- `tests/unit/ayuda/tarjeta-de-obra.ts` (nuevo) -- `tarjetaDeObraDe(html)`: el subárbol `section.tarjeta-de-obra` completo, o `undefined`; lo usan las tres pruebas de abajo.
- `tests/unit/tarjeta-de-obra.test.ts` (nuevo) -- **sin construir:** la función pura en todos los casos de la matriz (también antes de Cristo y la traducción); `Props` de `TarjetaDeObra` (`cita`, `autor`, `nivel: 2 | 3` sin `?` y sin valor por omisión en la desestructuración) y de `FilaDeBloque` (`zona: Zona` obligatoria importada del vocabulario); `TarjetaDeObra.astro` no contiene `<a`, ni `<script`, ni `data-ingreso`; `BloqueDeCita.astro`, `index.astro` y `404.astro` no la importan y solo `src/pages/cita/[slug].astro` la usa; las reglas de la hoja según Always (como `tarjeta-de-cita.test.ts`). **Una construcción que falla:** una sonda sin armazón que pinta la tarjeta con el Autor de otro: código distinto de 0 y la salida nombra la Cita y los dos Autores. **Una construcción** con el fixture de Design Notes: toda Página de Cita con Obra tiene exactamente una tarjeta y ninguna sin Obra; la tarjeta va después del `figure` y de `p.fuente` (si la hay) y antes de la `.isla` de Copiar, dentro de `article`; tiene un ancestro `data-pagefind-ignore="all"` y ningún `data-ingreso`; el `h2` «De la obra» es el de su `aria-labelledby`; el título es `cita.obra.titulo` entero y no está en un `<a>`; los hechos, leídos sin lo `aria-hidden`, son las partes unidas por «, », y sin lo `.solo-para-lectores`, unidas por « · »; un único enlace en la tarjeta, con el texto y la flecha `aria-hidden` que tocan, a la página 1 de su Obra, que existe en `dist/`, con la declaración más cercana `{ zona: 'tarjeta-de-obra' }` y sin `target`; la Obra `noindex` enlaza igual.
- `tests/unit/ediciones-en-venta.test.ts` -- `describe` 24.4 con `construida('encendida')` y `construida('apagada')`, sin construir más: en toda Página de Cita, el subárbol de la tarjeta es igual byte a byte; la de Brevedad dice «Ver la obra y dónde leerla →» y la de `IRA_SIN`, «Ver la obra →» aunque su ficha declare ediciones y la afiliación esté encendida; ninguna Página de Cita lleva `data-ingreso`.
- `tests/unit/obra-pagina.test.ts` -- la construcción abierta de `corpus(1)` pasa a una función memorizada que comparten la `describe` 22.4 y un `it` 24.4 nuevo en la `describe` congelada: en toda Página de Cita, la tarjeta de la congelada es igual byte a byte a la de la abierta, y la de `seneca-cartas-0` (Obra indexable abierta, `noindex` congelada) enlaza a `/obra/seneca/cartas-a-lucilio/`.
- `tests/e2e/ayuda/corpus.ts` -- `citasResueltas` pasa `fuente` a `colgarObras` y conserva el recuento y `edicionCotejada`; nuevas `citaConTarjetaCompleta()` (Obra de ≥ 2 Citas con edición cotejada, la Cita con Fuente y texto ≤ `MAX_CARACTERES_IMAGEN`, la primera por slug) y `citaDeObraSinCotejar()`.
- `tests/e2e/accesibilidad.spec.ts` -- las Páginas de Cita del barrido, derivadas del Corpus (`citaConTarjetaCompleta`, `citaSinObra`, `citaDeObraSinCotejar`, `citaConTituloDeObraMasLargo`) y añadidas a `SUPERFICIES`; las dos primeras caras son obligatorias, las otras dos entran si el Corpus las tiene y una prueba nombra en sus anotaciones la que falte y comprueba en `dist/` la cara de cada una; la prueba 2.8 del orden pasa a «contenido, tarjeta, acciones y después salidas» con Tab real desde el enlace del Autor (Design Notes) en una Cita con tarjeta y en una sin Obra; y a 320 × 640 el título de la Tarjeta de Obra más largo parte en varias líneas sin desplazamiento horizontal.
- `tests/e2e/pagina-de-cita.spec.ts` -- `describe` 24.4: en móvil, con `citaConTarjetaCompleta()` y la del título largo, el texto de la Cita empieza dentro de 360 × 640 sin desplazar, y Copiar queda debajo de la tarjeta (su posición va a las anotaciones); en los dos proyectos, los tokens calculados de la tarjeta y de la fila según Always, `.isla` de Copiar a 32 px ±1 del fondo de la tarjeta, la de Imagen a 16 px ±1 de la de Copiar, y cada botón en su línea y más estrecho que la columna.

**Acceptance Criteria:**
- Given el repositorio con la historia, when corre `npm run check`, then pasa sin errores.
- Given la suite de Vitest, when corren uno a uno `tarjeta-de-obra`, `ediciones-en-venta`, `obra-pagina`, `medicion`, `tarjeta-de-cita`, `obras`, `lista-de-obras`, `ingreso-construido`, `peso`, `superficies`, `espinas-de-ux`, `publicable-y-alcanzable` y `fecha-de-cambio-build`, then pasan, y `medicion.test.ts` y `obras.test.ts` sin tocar sus tablas ni sus permitidos.
- Given dos `npm run build` del Corpus real con la misma `FECHA_JORNADA`, uno en la línea base y otro con la historia, when se comparan con `diff -rq`, then solo cambian ficheros de `dist/cita/` (y, si cambian, de `dist/pagefind/`), y en una Cita sin Obra el `<main>` es idéntico.
- Given el sitio construido por `tests/servidor.mjs`, when corren en los dos proyectos `accesibilidad`, `pagina-de-cita`, `rutas-de-salida`, `copiar` y `busqueda`, then pasan, y la prueba de zonas de toque de la 2.8 sin tocarla.

## Spec Change Log

## Review Triage Log

## Design Notes

**El marcado de referencia** (la regla de las pausas pegadas es la de la 24.3: Astro conserva un espacio donde hay salto de línea):

```astro
<section class="tarjeta-de-obra" aria-labelledby="de-la-obra" data-pagefind-ignore="all">
  <Rotulo id="de-la-obra" nivel={nivel}>De la obra</Rotulo>
  <p class="titulo">{obra.titulo}</p>
  <p class="hechos">{hechos.map((parte, i) => (<>{i > 0 && (<><span aria-hidden="true"> · </span><span class="solo-para-lectores">, </span></>)}{parte}</>))}</p>
  <ul class="filas"><FilaDeBloque href={rutaDeLaObra(obra)} zona="tarjeta-de-obra" flecha>{fila}</FilaDeBloque></ul>
</section>
```

**La zona y la fila.** La zona va en el `li` de la Fila de bloque, el contenedor que pinta el build; la sección no declara ninguna porque su único enlace la trae. En la 24.5, «Siguiente» será otra `FilaDeBloque` con `zona="siguiente"` encima de esta. La Lista de Obras no se migra: tiene dos columnas, el filete solo entre entradas y la zona en el `ul`, y el Directorio de Obras la reutiliza tal cual; la Fila de bloque toma su trato, no su marcado.

**El fixture de `tarjeta-de-obra.test.ts`.** Séneca (`AUTOR_VALIDO`) con «Sobre la brevedad de la vida» 3 Citas cotejadas de `año: 49`, «De la ira» 1 cotejada de 41 (`noindex`) y «Cartas a Lucilio» 2 sin Fuente de 62 y 64; una Cita sin Obra (`procedencia: { referencia }`, sin Fuente); Antonio Machado con una Obra de título de 163 caracteres, 2 Citas cotejadas. Un Tema, `el-tiempo`. Las Citas sin Fuente van en `pendientes-de-cotejo.yml`, así que los documentos de las cotejadas se escriben a mano como en `tarjeta-de-cita.test.ts`. La sonda del Autor ajeno pinta `TarjetaDeObra` con la primera Cita y el Autor de Machado.

**La prueba del orden de tabulación.** Se enfoca el enlace del Autor y se pulsa Tab hasta el primer enlace de `nav`, anotando el grupo de cada elemento enfocado: `figcaption` o `.fuente` es contenido, `.tarjeta-de-obra` es tarjeta, `.isla` es acción (Copiar, Imagen, la hoja o los destinos de compartir) y `nav` es salida; cualquier otro, fallo. Con tarjeta, los grupos seguidos son `contenido, tarjeta, acción, salida`, con el Autor, el título de la Obra y la Fuente delante y «Ver la obra y dónde leerla» como única parada de la tarjeta; sin Obra, `contenido, acción, salida`. Ningún elemento de `main` lleva `tabindex` positivo. La enmienda del texto de la Historia 2.8 —el orden y las zonas de toque— ya está en `epics.md` (v8, 2026-10-19); aquí solo cambia su prueba del orden, y la exención de las filas apiladas en la prueba de toque llega con la 24.5, la primera que apila dos.

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

Status: ready-for-dev
Blocking condition: ninguna.

Planificada por el bucle v8-ralph (2026-10-26) sobre `epic-24-context.md`, la continuidad de la 24.3 (`status: done`) y el código del worktree; la ejecución se detuvo tras planificar, como pedía la invocación. Sin aplazados para Héctor: la enmienda del texto de la Historia 2.8 ya está en `epics.md`, y nada de esta historia toca artefactos de planificación.
