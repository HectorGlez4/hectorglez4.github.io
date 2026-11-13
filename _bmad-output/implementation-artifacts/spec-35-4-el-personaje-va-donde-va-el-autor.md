---
title: 'Historia 35.4 — El Personaje va donde va el Autor'
type: 'feature'
created: '2026-11-12'
status: 'done'
baseline_revision: 'c9718b39ebb774fa8b3b537444ce784d764eb368'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-35-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-35-3-la-pagina-de-personaje.md'
warnings: ['oversized']
deferred:
  - summary: 'JSON-LD de la Cita: la espina (AD-33) y la historia dicen `author` para el Autor; el sitio lleva desde la v1 `creator`. Se conserva `creator` para el Autor en toda Cita (con Personaje o sin él) y se añade `spokenByCharacter`: renombrar cambiaría toda Página de Cita del Corpus real (contra «dist/ idéntico») y dos nombres para el mismo papel serían incoherentes. Si debe ser `author`, lo decide Héctor (bmad-architecture).'
    evidence: 'src/components/DatosEstructurados.astro (creator); ARCHITECTURE-SPINE.md AD-33; epics.md Story 35.4 «la Quotation lleva author si hay Autor».'
    severity: low
  - summary: 'La historia pide el Personaje de la Atribución «con su trato ({typography.author}, en la serif)», pero `{typography.author}` es Inter y el Autor de la Atribución va en Inter; la UX dice que el Personaje lleva el trato del Autor «en cada superficie donde ocupa su lugar» y que «no se separa de la autoría con la familia». Se aplica el trato del Autor en cada superficie (Inter versalitas en la Atribución, como ya construyó la 35.3; el de la Tarjeta de Cita en la Tarjeta). Si la Atribución debe ir en serif, lo decide Héctor (bmad-ux).'
    evidence: 'DESIGN.md typography.author (Inter); DESIGN.md § Typography Source Serif 4 (v9.1); src/components/Atribucion.astro .autor (var(--sans)).'
    severity: low
  - summary: 'Año en la línea de Obra de una Cita con Personaje y Autor: la UX da «{título}, de {Autor}» y, sin Obra, «de {Autor}» solo, sin decir dónde va el año. Se compone como lo copiado: «{título}, de {Autor}, {año}.» y «de {Autor}, {año}.»; sin Obra y con Autor no se escribe «Sin obra documentada» [ASSUMPTION]. La letra la decide Héctor (bmad-ux).'
    evidence: 'EXPERIENCE.md § Voice and Tone («La línea de Obra de una Cita con Personaje y Autor»; «El nombre en lo que sale de la página»).'
    severity: low
  - summary: 'La Página de Obra de un Personaje no lleva «Buscar en esta obra» hasta la 35.5: `/buscar/` no tiene todavía `personaje=` y un `autor` con el slug de un Personaje se descartaría. La Obra de un Personaje sin ningún Autor no sale en `/obras/` hasta la sección «Personajes» de la 35.5; la arista Directorio de Obras → Obra del modelo sale de lo que pinta `directorioDeObras`, no de `obrasPublicadas`.'
    evidence: 'epics.md Story 35.5 («el estado gana personaje=», «/obras/ … sección Personajes»); src/lib/publicado.ts grafoDelModelo (bucle obrasPublicadas → rutaDelDirectorioDeObras).'
    severity: medium
  - summary: 'La meta description de la Página de Obra de un Personaje usa la plantilla de siempre con su nombre («{n} frases de {Personaje} en {Título}, con su procedencia documentada.»), aunque sus Citas son atribuidas y no se cotejan. Si la letra debe ser otra, lo decide Héctor (bmad-ux).'
    evidence: 'src/lib/atribucion.ts descripcionDeObra; EXPERIENCE.md § Voice and Tone (meta de Obra).'
    severity: low
  - summary: 'La línea de procedencia de la Tarjeta Social y de la Imagen es una sola línea sin reparto: una atribución larga («{título}, de {Autor}, {año}») puede salirse por el ancho, como ya puede hoy un título largo. La prueba de tramos mide el alto (la tabla de AD-8), no el ancho de esa línea.'
    evidence: 'src/lib/tarjeta.ts svgDeTarjeta (procedencia en un solo <text>); public/islas/imagen.js (fillText de la procedencia).'
    severity: low
  - summary: >-
      La prueba e2e `tests/e2e/busqueda.spec.ts:502` exige que «colección» dé algún resultado, y ninguna página del Corpus real la contiene: queda en rojo por el Corpus, no por esta historia.
    evidence: |-
      Verificación de la 35.4 (logs/s-35/e2e-35.4.log): 1 en rojo previa al cambio; dist/ idéntico fuera de pagefind/ con el Corpus real. Que una Cita diga la palabra o que la prueba deje de exigirla lo decide Héctor.
    location: >-
      tests/e2e/busqueda.spec.ts:502
    severity: low
  - summary: >-
      `concentracionDe` (src/lib/meta.ts) sigue dividiendo por todas las Citas, también las de un Personaje sin Autor, así que el peso de cada Autor frente al techo se diluye cuando haya atribuidas; qué cuenta solo la clase de siempre es de la Historia 35.7.
    evidence: |-
      `const total = citas.length` tras saltar en `porAutor` las Citas sin Autor (revisión 35.4, edge-case-hunter). Con el Corpus real no hay ninguna, así que hoy no mueve ninguna cifra.
    location: >-
      src/lib/meta.ts concentracionDe
    severity: low
  - summary: >-
      Las páginas 2+ de la Página de Obra de un Personaje (Cabecera, título, meta, sin «Buscar en esta obra») no tienen prueba sobre dist/: el fixture de la 35.4 tiene dos Citas de Batman y una sola página.
    evidence: |-
      tests/unit/personaje-donde-el-autor.test.ts solo construye /obra/batman/el-caballero/; la Cabecera de las 2+ sale del mismo marcado que la página 1 (src/pages/obra/[autor]/[slug]/[...page].astro).
    severity: low
  - summary: >-
      Una ficha de Personaje que solo resuelven Citas de otros Personajes de su `personajes` (ninguna declara al dueño) para la construcción: su dueño no tiene página y la Cabecera enlazaría a un 404. El build lo dice ahora con su causa (`mensajeDeDueñoSinPagina`); si una ficha así debe admitirse —y a dónde enlaza entonces— lo decide Héctor (bmad-architecture).
    evidence: |-
      src/pages/obra/[autor]/[slug]/[...page].astro y src/pages/tarjeta/obra/[autor]/[slug].png.ts resuelven el dueño entre `personajesPublicados`; `fichasDeCita` resuelve una ficha de Personaje por su lista `personajes` (src/lib/obras.ts). La guarda de la 35.2 que lo tapaba se levantó en esta historia.
    severity: medium
---

<intent-contract>

## Intent

**Problem:** El build rompe ante una Cita publicada sin Autor y ante una Obra de Personaje con Citas publicadas (dos guardas de la 35.2 «hasta la 35.4»), y fuera del enlace de la Atribución (35.3) ninguna superficie de la Página de Cita, de la Página de Obra ni de lo que sale de ellas nombra al Personaje.

**Approach:** Levantar las dos guardas y hacer `Cita.autor` opcional en `src/`; componer el Personaje donde va el Autor desde una sola función de `src/lib/atribucion.ts` (orden fijo Personaje, Obra, Autor), y extender con el dueño la Tarjeta de Obra, las Rutas de salida, «Siguiente», la Cabecera y el JSON-LD de Obra; excluir pasaje y «Cómo citar» de la atribuida en sus dos puntos con nombre. Con el Corpus real (sin Personajes ni atribuidas) `dist/` no cambia.

## Boundaries & Constraints

**Always:**
- Una sola composición del nombre: `firmaDeCita(cita, { autor?, personaje? })` en `src/lib/atribucion.ts` [nombre elegido aquí] da el nombre de la primera línea (Personaje si lo hay; si no, Autor) y el resto en orden fijo (título de la Obra resuelta, «de {Autor}» solo si hay Personaje y Autor, año de la Procedencia de esa Cita). La usan `textoParaCopiar` (y por él `textoParaCompartir` y `data-texto-plano`), la procedencia de la Imagen (`data-autor`/`data-procedencia`) y de la Tarjeta Social de Cita, `fragmentoParaInsertar` (sin año, como hoy), `nombreEnAtribucion` y la línea de Obra de `Atribucion.astro`. Copiado: ««…» — {Personaje}, {título}, de {Autor}, {año}.»; sin Obra «— {Personaje}, de {Autor}, {año}.»; la traducción sigue detrás como hoy. Fragmento: «— {Personaje}, <cite>{título}</cite>, de {Autor}.».
- Atribución con Personaje: primera línea el Personaje (enlace a su página, trato `.autor` de siempre); línea de Obra «<a>{título}</a>, de <a>{Autor}</a>{resto}» con el Autor `enlace-en-tinta` a su Página de Autor; sin Obra y con Autor «de <a>{Autor}</a>» (+ «, {año}» si consta) sin «Sin obra documentada»; sin Autor, la línea de siempre («Sin obra documentada.»…). Los dos párrafos con `data-zona="atribucion"`. El `cite` del `blockquote` apunta a la ruta del nombre de la primera línea.
- Cita sin Personaje: marcado, texto copiado, Imagen, Tarjeta, Fragmento, JSON-LD, meta y título byte a byte como hoy.
- Dueño de una Cita para «Siguiente» por Tema y para las Rutas de salida: su Personaje si lo tiene, su Autor si no (función con nombre en `src/lib/publicado.ts`, p. ej. `dueñoDeLaRuta`; no reutilizar `dueñoDeCita` de `obras.ts`, que prefiere el Autor para el prefijo del slug).
- «Más de {Personaje}»: `citasDePersonaje` sin la propia, la de «Siguiente» ni las de su Obra, ordenadas y repartidas como «Más de {Autor}» (`repartir`); recuento = Citas que declaran el Personaje; cierre `cierreDeMasDelPersonaje` (hermana de `cierreDeMasDelAutor`, misma `recuentoDeCierre`) a `rutaDePersonaje`; zona `rutas-de-salida`; tarjetas `atribucion="obra"`. `problemaDeRutasDeSalida` recibe el dueño y objeta una Cita de otro dueño, y «De la misma obra» de otra Obra por `obra.dueño`.
- Tarjeta de Obra: «{nombre del dueño de la Obra} · {año} · {n} citas» (`obra.dueño`: Autor o Personaje); `contenidoDeTarjetaDeObra` recibe ese dueño.
- Tarjeta de Cita `autor-y-obra` (Tema, Colección): con Personaje, su nombre en el sitio del Autor, mismo trato; el Autor no entra. Con `autor-y-obra` recibe además `personaje` (el que declara la Cita, `undefined` si ninguno) y la construcción se para si no casa con `cita.personaje`, como en `Atribucion.astro`; con `obra` y `ninguna` no pinta nombre y no lo recibe.
- Página de Obra de Personaje (página 1 y 2+): Cabecera «de <a href=/personaje/…>{Personaje}</a> · {año}» con `data-zona="atribucion"` y el mismo `data-pagefind-meta="autor"`; título y meta con su nombre (`tituloDeObra`, `descripcionDeObra`); JSON-LD `about` `CreativeWork` con `character: {@type: Person, name, url}` y sin `author`; Tarjeta Social de Obra con «{n} citas de {Personaje}, {año}»; sin «Buscar en esta obra». La de Autor, como hoy.
- JSON-LD de Cita: `creator` del Autor solo si hay Autor (como hoy, sin `deathDate` si vive); `spokenByCharacter` `{@type: Person, name, url}` si hay Personaje, sin fechas ni `sameAs`; `isPartOf` con `@type` `CreativeWork` si la Obra es de Personaje (el mismo tipo que su `about`), `Book` si no.
- Título de pestaña y meta de la Página de Cita: el Autor si lo hay; si no, el Personaje; mismo `recortarPorPalabra`.
- `citaTieneComoCitar(cita)` = `!esAtribuida(cita)` (recibe `{clase?}`); `ofrecePasaje` recibe `atribuida: boolean` y la decide primero (motivo nuevo `'atribuida'`); `pasajeDeAparicion` lo pasa desde `posicionesDeCitas`. Microcopia de «Inserta esta cita» con Personaje: «…lleva la cita, su personaje y el enlace a esta página.».
- Una Cita sin Autor no cuenta para ningún Autor (ni clave `undefined`) en meta, huecos, salud, citaDelDia, sindicación, Pieza; `filtrosDeLaBusqueda` no le da filtro ni metadato `autor` (`FiltrosDeLaCita` omite los dos `span`) y su Obra sin Autor no entra en el mapa de Obras; `clavesDeOrden` agrupa por `dueñoDeCita` y recibe Autores y Personajes (un solo espacio de slugs, clave `ordenAlfabetico` de cada uno).
- Ninguna zona ni evento nuevo; `vocabulario.ts` no se toca. Ningún guion en línea lleva el nombre: va en `data-*`. Sin literales de color/tipografía.
- Fixtures siempre en copia temporal con `conLaPuertaAbierta()` (`tests/unit/ayuda/construir.ts`); nunca se escribe en `corpus/` real.

**Block If:**
- Con el Corpus real y `FECHA_JORNADA` fija, `diff -r` de `dist/` (sin `pagefind/`, por el no determinismo conocido de la 35.2) frente a la construcción de antes da alguna diferencia.
- La prueba de tramos con la atribución más larga de un Personaje con Obra y Autor hace que alguna Cita de su tramo deje de caber o baje de cuerpo (AD-8: la tabla la decide Héctor).
- Cumplir un criterio exige subir un tope de guion o tocar `src/lib/vocabulario.ts`.

**Never:**
- Sembrar Personajes, atribuidas o claves en el Corpus real; dar valor en el árbol a las constantes de la puerta (`MAX_CARACTERES_DE_ATRIBUIDA`…).
- Construir lo de la 35.5 (`personaje=` en `/buscar/`, filtro Pagefind `personaje`, sección «Personajes» de los Directorios, «Buscar en {Personaje}»), la Variante (35.6), la línea de retirada (35.8) ni lo de la 35.7 (qué cuenta solo la clase de siempre).
- Editar `_bmad-output/planning-artifacts/` ni `_bmad-output/specs/`; usar `!` para callar el tipo de `autor`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Personaje solo, con Obra de Personaje | `personaje: batman`, sin `autor`, ficha `batman--…` | Atribución «BATMAN» / «{título}, {año}.»; Tarjeta de Obra «Batman · … · n citas»; «Más de Batman»; sin «Cómo citar» ni pasaje; Página de Obra «de Batman», JSON-LD `character` | build verde |
| Personaje y Autor con Obra | `personaje: batman`, `autor: seneca`, Obra de Séneca | línea «{título}, de Séneca, 2000.»; copiado ««…» — Batman, {título}, de Séneca, 2000.»; JSON-LD `creator` + `spokenByCharacter`; Tarjeta de Obra «Séneca · …» | — |
| Personaje y Autor sin Obra | sin `procedencia.obra` | línea «de Séneca.» (o «de Séneca, {año}.»); copiado «— Batman, de Séneca.»; sin Tarjeta de Obra | — |
| Autor `vivo` solo (atribuida) | `autor` vivo, sin Personaje | Atribución, copiado, Tarjeta de Obra como hoy; `creator` sin `deathDate`; sin «Cómo citar» ni pasaje | — |
| Cita de siempre en la misma construcción | de siempre | idéntica a la construcción de antes (golden) | — |
| Obra de una Cita de Personaje, «Siguiente» por Tema | Tema con Citas de Batman, Joker y Séneca | salta a la primera de otro dueño (Personaje o Autor distinto) | lanza si la Cita no está en su listado, como hoy |
| Componente con dueño equivocado | `TarjetaDeObra`/`RutasDeSalida`/`TarjetaDeCita` reciben otro Autor o Personaje | — | la construcción se para nombrando la Cita, como hoy |

</intent-contract>

## Code Map

- `src/lib/admision.ts:279-415` `reglaDeAutorPublicado`, `MENSAJE_PUBLICADA_SIN_AUTOR` -- quitar (y su uso en `src/content.config.ts:85` colección `citas`); comentarios «hasta la 35.4».
- `src/lib/obras.ts:454-617` `MENSAJE_OBRA_DE_PERSONAJE_PUBLICADA` y su `fallos.push` en `fallosDeObras` -- quitar la guarda; `:921` `ObraResuelta.dueño`; `:282,293` `dueñoDeFicha`/`dueñoDeCita`; `:1692-1790` `clavesDeOrden` (agrupa por `cita.autor` → por `dueñoDeCita`).
- `src/lib/publicado.ts:73-85` `Cita.autor` → opcional; `aplanarCita` (~:1497) sin la comprobación de Autor; `:235` `citasDePersonaje`; `:370` `citasDeAutor`; `:620` `citasRelacionadas` (por dueño); `:674-790` `RutasDeSalidaDeCita.delAutor` → `delDueño` con `dueño: {tipo, slug, nombre?}`, `rutasDeSalidaDeCita`, `problemaDeRutasDeSalida`; `:817-856` `siguienteCita` (compara dueños, :851); `:1078-1130` `filtrosDeLaBusqueda`; `:1340-1400` `grafoDelModelo` (arista Directorio de Obras → Obra desde `directorioDeObras`).
- `src/lib/atribucion.ts:90` `textoParaCopiar`; `:427` `contenidoDeTarjetaDeObra`; `:491` `cierreDeMasDelAutor` (+ hermana); `:530` `lineaDeProcedencia`; `:597` `citaTieneComoCitar`; `:791` `nombreEnAtribucion`; `:815` `fragmentoParaInsertar`; `:386` `descripcionDeObra` (acepta `{nombre}` de cualquier dueño). Nueva `firmaDeCita`.
- `src/lib/compartir.ts:119` `textoParaCompartir` -- recibe los mismos quienes.
- `src/lib/tarjeta.ts:311-340` `bajadaDeTarjetaDeObra`/`datosDeTarjetaDeObra` -- `{nombre}` del dueño; `svgDeTarjeta` sin cambios.
- `src/pages/cita/[slug].astro:48-200` -- `autor` opcional, `personaje`, título/meta, desplegables, props nuevas de cada componente; `dueñoDeLaObra` resuelto de `autores`/`personajes` por `cita.obra.dueño`.
- `src/components/Atribucion.astro`, `BloqueDeCita.astro:33` (`cite`), `TarjetaDeObra.astro:60-90` (prop `autor` → `dueño`, comprobación contra `cita.obra.dueño`), `RutasDeSalida.astro` (rótulo «Más de {dueño}», `id="mas-del-autor"` se conserva), `TarjetaDeCita.astro:40-75`, `DatosEstructurados.astro`, `DatosDeObra.astro`, `FiltrosDeLaCita.astro:39-43`, `InsertaEstaCita.astro:31` (prop `conPersonaje`), `CitaDelDia.astro`.
- `src/islands/CopiarCita.astro:86-90`, `ImagenDeCita.astro:113-295`, `CompartirEnlace.astro:50-56` -- reciben `autor | undefined` + `personaje`; `public/islas/imagen.js` sin cambios (lee `data-autor`/`data-procedencia`).
- `src/pages/obra/[autor]/[slug]/[...page].astro:53-200` y `src/pages/tarjeta/obra/[autor]/[slug].png.ts:30-40` -- quitar la guarda; dueño Autor (publicado) o Personaje (publicado); `BuscarEn` solo con dueño Autor.
- `src/pages/tarjeta/[slug].png.ts:30-40`, `tema/[slug]/[...page].astro:83`, `coleccion/[slug]/[...page].astro:144`, `index.astro`, `404.astro`, `kit.astro`, `lote.astro` -- tipos y Personaje en `TarjetaDeCita`.
- `src/lib/{meta,huecos,salud,citaDelDia,sindicacion,pieza,coleccionEnPieza}.ts` -- lectores de `cita.autor` que `astro check` señale: saltar la Cita sin Autor.
- `tools/lib/pasaje.ts:90-140` `ofrecePasaje`/`pasajeDeAparicion`; `tools/lib/posiciones.ts:107-131`.
- `src/lib/directorios.ts:186` `directorioDeObras` -- sin cambios de comportamiento (Obras por `obrasDelAutor`).
- Pruebas existentes a reescribir: `tests/unit/personajes-build.test.ts:95-110,204` (el Personaje ya no está solo en la Atribución; la publicada sin Autor ya no rompe), `tests/unit/obras.test.ts:1589` (la guarda), `tests/unit/atribucion.test.ts:223` («Cómo citar»), `tests/unit/pasaje.test.ts:316-340`. COLOCACION en `tests/unit/medicion.test.ts:3252` (sitio de prueba con `SLUG_DE_PERSONAJE`, `PERSONAJE`).
- `tools/lib/cambios.ts` -- sin campos nuevos: el Personaje ya compone Página de Cita, listados y su Obra (35.2/35.3); la Tarjeta de Obra y las Rutas son navegación (FR-47).

## Tasks & Acceptance

**Execution:**
- `src/lib/admision.ts`, `src/content.config.ts`, `src/lib/obras.ts`, `src/lib/publicado.ts` -- levantar las dos guardas, `Cita.autor?`, dueño de ruta, «Siguiente», Rutas de salida, filtros, claves de orden, arista del Directorio de Obras -- AD-33.
- `src/lib/atribucion.ts`, `src/lib/compartir.ts`, `src/lib/tarjeta.ts` -- `firmaDeCita` y sus usuarios, línea de Obra, Tarjeta de Obra, cierre de Personaje, «Cómo citar» -- UX-DR135–137, FR-65.
- `tools/lib/pasaje.ts`, `tools/lib/posiciones.ts` -- exclusión en `ofrecePasaje` -- AD-30 v9.1.
- `src/components/*`, `src/islands/*`, `src/pages/cita/[slug].astro`, `src/pages/obra/…`, `src/pages/tarjeta/…`, listados -- pintar lo de arriba; lectores restantes de `cita.autor`.
- Pruebas: `tests/unit/atribucion.test.ts` (tabla de `firmaDeCita`/copiado/Fragmento por los cuatro casos; `citaTieneComoCitar`; `cierreDeMasDelPersonaje`), `tests/unit/siguiente.test.ts` y `rutas-de-salida.test.ts` (dueño Personaje; objeción de otro dueño), `tests/unit/pasaje.test.ts` (motivo `atribuida`), `tests/unit/tarjeta-de-cita.test.ts` (Personaje en `autor-y-obra`), `tests/unit/tramos.test.ts` (por tramo: texto en su cota superior con la firma de Personaje + la `titulo` más larga de `corpus/obras/` + el `nombre` más largo de `corpus/autores/` → `svgDeTarjeta` no lanza y el cuerpo es el mismo que sin Personaje), `tests/unit/medicion.test.ts` (COLOCACION: Personaje y Autor de la línea de Obra en `atribucion`, tarjetas y cierre de «Más de {Personaje}» en `rutas-de-salida`, Cabecera de Obra de Personaje en `atribucion`), y una construcción nueva `tests/unit/personaje-donde-el-autor.test.ts` con las cuatro Citas de la matriz más una de siempre (golden de su Atribución, Tarjeta de Obra, Rutas, desplegables, copiado y Fragmento, igual que antes) y la Página de Obra de Personaje (Cabecera, JSON-LD, Tarjeta Social).
- `AGENTS.md` -- la serif (texto de Cita y nombres de Autor, Personaje, Tema y Colección); «La Cita atribuida», «Los Personajes» y «Las fichas de Obra» sin las guardas «hasta la 35.4»; «La Tarjeta de Obra» y «Al pie de la Página de Cita» con el dueño; «Inserta esta cita»/«Cómo citar» con la exclusión.

**Acceptance Criteria:**
- Given el Corpus real y `FECHA_JORNADA` fija, when se construye antes y después y se comparan los `dist/` sin `pagefind/` con `diff -r`, then no difiere ningún fichero.
- Given la construcción de prueba de la matriz, when corre Vitest sobre su `dist/`, then cada Página de Cita lleva la Atribución, la Tarjeta de Obra, las Rutas de salida, los desplegables (atribuida: solo «Inserta esta cita», sin `<summary>` de los otros dos; nada entre Atribución/Fuente y Copiar), lo copiado (`data-texto-plano`, carga de Copiar), la Imagen (`data-autor`, `data-procedencia`), el Fragmento, el JSON-LD (`spokenByCharacter`; sin `creator` sin Autor), el título y la meta que fija la matriz, y la de siempre sale idéntica al golden.
- Given la Página de Obra de un Personaje del fixture, when se sirve, then su Cabecera dice «de {Personaje}» enlazado con zona `atribucion`, su JSON-LD es `CreativeWork` con `character` y sin `author`, y su Tarjeta Social existe; y una Cita con Personaje y Autor está en el listado de los dos, en «Más de {Autor}» de otra Cita del Autor y en la Lista de Obras del Autor.
- Given `grep -rn "hasta la Historia 35.4\|hasta la 35.4" src tools integraciones AGENTS.md`, when corre, then no sale nada.
- Given `npx astro check` y las pruebas por fichero de la lista, when corren, then pasan.

## Spec Change Log

## Review Triage Log

### 2026-11-13 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

### 2026-11-13 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 17: (high 0, medium 4, low 13)
- defer: 4: (high 0, medium 1, low 3)
- reject: 21: (high 0, medium 0, low 21)
- addressed_findings:
  - `[medium]` `[patch]` `problemaDeRutasDeSalida` no juzgaba el dueño de «De la misma obra» con un dueño Personaje: recibe ahora `autorDeLaCita` (obligatorio, también como prop de `RutasDeSalida.astro`) y solo admite la Obra del Personaje o la del Autor que declara la Cita; prueba con Batman, Séneca, Epicteto y Joker en `rutas-de-salida.test.ts`.
  - `[medium]` `[patch]` La ficha de un Personaje que solo resuelven Citas de otros Personajes paraba la construcción con «no debería pasar» y un mensaje sin causa: `mensajeDeDueñoSinPagina` (`src/lib/publicado.ts`) lo dice con su tipo, su causa y qué hace falta, en la Página de Obra y en su Tarjeta Social; la decisión de fondo, diferida a Héctor.
  - `[medium]` `[patch]` La Tarjeta Social de una Cita con Personaje no tenía prueba: una sonda de `getStaticPaths` en `personaje-donde-el-autor.test.ts` fija nombre y procedencia de B1, B3, B4 y S1.
  - `[medium]` `[patch]` Lo compartido (`data-compartir data-texto`) no tenía prueba con Personaje: se fija en B1, B3, B4 y S1.
  - `[low]` `[patch]` `Atribucion.astro` pintaba `<a>` sin `href` sin Autor ni Personaje: se para con su nombre.
  - `[low]` `[patch]` `Atribucion.astro` perdía en silencio «, de {Autor}» si llegaba `deAutor` sin Autor: se para.
  - `[low]` `[patch]` El título y la meta de la Página de Cita podían decir «— undefined»: se para.
  - `[low]` `[patch]` «Cómo citar» se escondía en silencio con `autor === undefined`: lo decide solo `citaTieneComoCitar`, y una de siempre sin Autor para la construcción.
  - `[low]` `[patch]` `kit.astro` y `lote.astro` callaban el tipo con `!`: buscan el Autor y se paran si falta.
  - `[low]` `[patch]` `tools/lib/piezas.ts` callaba el tipo con `as Autor`: se comprueba.
  - `[low]` `[patch]` `textoParaCopiar`, `textoParaCompartir` y `fragmentoParaInsertar` tomaban `personaje?` opcional: ahora es obligatorio (`Personaje | undefined`), como en los componentes.
  - `[low]` `[patch]` El mensaje de `TarjetaDeObra.astro` no decía el tipo de los dos dueños: lo dice.
  - `[low]` `[patch]` `concentracionDe` rompía con `ordenados[0]!` si ninguna Cita declara Autor: devuelve `undefined`.
  - `[low]` `[patch]` `MaterialParaPublicar.astro` copiaba sin Personaje por supuesto: se para si una Cita del material lo declara.
  - `[low]` `[patch]` `clavesDeOrden` sin prueba de una Obra de Personaje con Citas que declaran Autor: caso en `clave-de-orden.test.ts`.
  - `[low]` `[patch]` La exclusión del pasaje de la atribuida en el cargador no tenía prueba con Fuente y tope: caso en `orden-del-libro.test.ts`.
  - `[low]` `[patch]` «Nada entre la Atribución y Copiar» de la atribuida no se afirmaba: se fija en B1.

## Design Notes

- **`creator` y no `author`**: ver `deferred[0]`. La prueba de los tres casos mira `creator` y `spokenByCharacter`.
- **Dos dueños con reglas distintas, a propósito**: `dueñoDeCita` (obras.ts) prefiere el Autor —es el prefijo del slug y la ficha—; el dueño de las Rutas y de «Siguiente» prefiere el Personaje (decisión de Héctor del 2026-11-05). Una función con nombre en `publicado.ts` evita que una use la del otro.
- Forma orientativa de la firma (no vinculante en nombres de campos):
  ```ts
  firmaDeCita(cita, { autor, personaje }) → { nombre: string; titulo?: string; deAutor?: string; año?: number }
  // Batman, Obra de Séneca, 2000 → { nombre: 'Batman', titulo: 'Obras de Séneca', deAutor: 'Séneca', año: 2000 }
  // Séneca sin Personaje         → { nombre: 'Séneca', titulo: 'Obras de Séneca', año: 2000 }  (como hoy)
  ```

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run tests/unit/personaje-donde-el-autor.test.ts` (y cada fichero de pruebas tocado, uno a uno) -- expected: verde.
- `npm test` detached con `correr.sh` y `esperar.pl` -- expected: `FINISHED EXIT=0`.
- Dos `npm run build` con `FECHA_JORNADA` fija (antes desde un `git worktree add --detach` en `.claude/v9-ralph/tmp-wt/`, después en el árbol) y `diff -r -x pagefind` de los `dist/` -- expected: sin salida.

## Auto Run Result

Status: done
Blocking condition: ninguna.

### Pasada de revisión 1 (2026-11-13), con los hallazgos de las cinco capas externas

**Cambio de esta pasada.** Se cierran los huecos que señalaron las capas: `problemaDeRutasDeSalida` juzga el dueño de «De la misma obra» también con un dueño Personaje (nuevo parámetro obligatorio `autorDeLaCita`, y prop de `RutasDeSalida.astro`); lo que antes se callaba o pintaba un hueco ahora para la construcción con su nombre (Atribución sin dueño o con «de {Autor}» sin Autor, título y meta sin nombre, «Cómo citar» de una de siempre sin Autor, material del Kit con Personaje, `!` de `kit`/`lote`, `as Autor` de las Piezas, `concentracionDe` sin Autores); el Personaje es parámetro obligatorio de `textoParaCopiar`, `textoParaCompartir` y `fragmentoParaInsertar`; el dueño sin página de una Obra de Personaje se dice con su causa (`mensajeDeDueñoSinPagina`), y el mensaje de `TarjetaDeObra` nombra el tipo de los dos dueños. Pruebas nuevas: lo compartido y la Tarjeta Social de Cita con Personaje (sonda de `getStaticPaths`), nada entre Atribución y Copiar en la atribuida, «De la misma obra» con dueño Personaje, la clave de orden de una Obra de Personaje con Citas que declaran Autor y el pasaje de una atribuida con Fuente y tope.

**Ficheros de esta pasada.** `src/lib/publicado.ts` (`problemaDeRutasDeSalida` con `autorDeLaCita`, `mensajeDeDueñoSinPagina`); `src/lib/atribucion.ts` y `src/lib/compartir.ts` (Personaje obligatorio); `src/lib/meta.ts` (sin Autores, sin concentración); `src/components/{Atribucion,RutasDeSalida,TarjetaDeObra,MaterialParaPublicar}.astro` (guardas y prop); `src/pages/cita/[slug].astro` (título, meta y «Cómo citar»); `src/pages/{kit,lote}.astro`; `src/pages/obra/[autor]/[slug]/[...page].astro` y `src/pages/tarjeta/obra/[autor]/[slug].png.ts` (mensaje del dueño sin página); `tools/lib/piezas.ts`; pruebas `personaje-donde-el-autor`, `rutas-de-salida`, `tarjeta-de-obra`, `clave-de-orden`, `orden-del-libro`, `atribucion`, `compartir`, `obras`.

**Revisión.** Parches 17 (0 high, 4 medium, 13 low), diferidos 4 (la e2e de «colección» que rompe por el Corpus, el denominador de `concentracionDe` para la 35.7, las páginas 2+ de una Obra de Personaje sin prueba y la ficha de Personaje cuyo dueño no tiene página, para Héctor), rechazados 21 (duplicados de los diferidos de `creator`/`author`, la serif y el año sin Obra; decisiones del intent como «Más de {Personaje}» con Autor y lo aplazado a la 35.5; supuestos que el esquema ya impide —Cita sin dueño, nombre vacío, Autor desconocido en la clave—, y estilo de las pruebas). Revisión de seguimiento: recomendada (`true`): 4 medium y 13 low, puntuación 3 × 4 + 13 = 25.

**Verificación de esta pasada.**
- `npx astro check`: 0 errores, 0 avisos.
- Por fichero: `clave-de-orden`, `compartir`, `atribucion` (164) y, detached, `personaje-donde-el-autor`, `rutas-de-salida`, `tarjeta-de-obra`, `orden-del-libro`, `obras`, `pasaje`, `tarjeta-de-cita`, `medicion`, `personajes-build` (1.082) en verde (`logs/s-35/triage-35.4-1-ficheros.log`).
- `npm test` completo (detached, `logs/s-35/npm-test-35.4-t1.log`): 181 ficheros, 8.047 pruebas, EXIT 0.
- Corpus real con `FECHA_JORNADA=2026-11-12`: base en `git worktree add --detach` de `14303d941d` y árbol con los parches; `diff -r -x pagefind` sin salida (`logs/s-35/triage-35.4-1-distdiff.log`, 0 bytes).

**Riesgos de esta pasada.** Una Pieza (`tools/lib/piezas.ts`) firma una Cita con Personaje y Autor solo con el Autor —su firma la compone `citaEnPieza`, no `firmaDeCita`—; con el Corpus real no hay ninguna. La comprobación `atribuida` de `ofrecePasaje` sigue siendo defensa en profundidad: en el cargador, la atribuida ya se salta antes (35.2).

### Primera pasada (construcción)

**Cambio.** Se levantan las dos guardas de la 35.2 (`reglaDeAutorPublicado`/`MENSAJE_PUBLICADA_SIN_AUTOR` y `MENSAJE_OBRA_DE_PERSONAJE_PUBLICADA`) y `Cita.autor` pasa a opcional en `src/`; la Cita plana lleva además `clase` solo si es atribuida (por `esAtribuida`). El nombre lo compone una sola función, `firmaDeCita` de `src/lib/atribucion.ts` (Personaje, Obra, «de {Autor}» solo con los dos, año), que usan lo copiado, lo compartido, la Imagen, la Tarjeta Social de Cita, el Fragmento, `nombreEnAtribucion` y la línea de Obra de la Atribución (`lineaDeProcedencia` con `deAutor`). El dueño de las Rutas y de «Siguiente» es `dueñoDeLaRuta` (Personaje primero), con `delDueño`, «Más de {Personaje}» y `cierreDeMasDelPersonaje`; la Tarjeta de Obra recibe `dueño` (`obra.dueño`); la Tarjeta de Cita `autor-y-obra` recibe `personaje`; JSON-LD con `creator` solo si hay Autor, `spokenByCharacter` y `isPartOf` `CreativeWork` para la Obra de un Personaje; la Página de Obra de un Personaje con su Cabecera, título, meta, JSON-LD `character` y Tarjeta Social, sin «Buscar en esta obra»; «Cómo citar» y el pasaje excluyen la atribuida (`citaTieneComoCitar`, `ofrecePasaje` con motivo `CLASE_ATRIBUIDA`). Una Cita sin Autor no cuenta para ningún Autor (filtros, mapa de Obras, claves por dueño, meta, huecos, salud, Cita del Día, sindicación, Pieza), y la arista Directorio de Obras → Obra sale de lo que pinta `/obras/`.

**Ficheros.** `src/lib/{atribucion,publicado,obras,admision,compartir,tarjeta,citaDelDia,coleccionEnPieza,sindicacion,meta,huecos,salud}.ts`, `src/content.config.ts`; `src/components/{Atribucion,BloqueDeCita,TarjetaDeObra,RutasDeSalida,TarjetaDeCita,DatosEstructurados,DatosDeObra,DatosDePersonaje,FiltrosDeLaCita,InsertaEstaCita,MaterialParaPublicar}.astro`; `src/islands/{CopiarCita,ImagenDeCita,CompartirEnlace}.astro`; `src/pages/cita/[slug].astro`, `src/pages/obra/[autor]/[slug]/[...page].astro`, `src/pages/tarjeta/[slug].png.ts`, `src/pages/tarjeta/obra/[autor]/[slug].png.ts`, `src/pages/{tema,coleccion}/[slug]/[...page].astro`, `src/pages/{kit,lote}.astro`; `tools/lib/{pasaje,posiciones,piezas}.ts`; `AGENTS.md`. Pruebas: nueva `tests/unit/personaje-donde-el-autor.test.ts` (las cuatro filas de la matriz más la de siempre, la Página de Obra de un Personaje y el doble listado) y al día `atribucion`, `pasaje`, `siguiente`, `rutas-de-salida`, `tarjeta-de-cita`, `tarjeta-de-obra`, `tramos`, `medicion` (COLOCACION y contenido de los guiones con una Cita de Batman sin Autor y su Obra), `personajes-build`, `obras`, `inserta-esta-cita`, `cita-del-dia`, `publicable-y-alcanzable` y `tests/e2e/busqueda.spec.ts` (tipos).

**Revisión.** Parches 0, diferidos 0, rechazados 0 (sin hallazgos externos en esta pasada). Revisión de seguimiento: no recomendada (`false`): 0 high, 0 medium, 0 low; puntuación 0.

**Verificación.**
- `npx astro check`: 0 errores, 0 avisos (470 ficheros).
- Por fichero, en verde: `personaje-donde-el-autor` (13+1), `atribucion`, `pasaje`, `clase`, `inserta-esta-cita`, `personajes-build`, `rutas-de-salida`, `siguiente`, `obras`, `tarjeta-de-cita`, `tarjeta-de-obra`, `tramos`, `medicion` (728).
- `npm test` completo (detached, `logs/s-35/npm-test-35.4-b.log`): 181 ficheros, 8.043 pruebas, EXIT 0.
- Corpus real con `FECHA_JORNADA=2026-11-12`: base en `git worktree add --detach` de `c9718b39eb` (`logs/s-35/build-base-35.4.log`) y árbol (`logs/s-35/build-tras-35.4-2.log`); `diff -r -x pagefind` sin salida (`logs/s-35/distdiff-35.4-2.log`, 0 bytes). El guion de la Página de Cita no cambia, así que `MAX_BYTES_DE_GUION` no se mueve.
- e2e `--project=escritorio` de `pagina-de-cita`, `busqueda`, `inserta-esta-cita`, `rutas-de-salida`, `copiar` y `como-citar` (`logs/s-35/e2e-35.4.log`): 184 en verde, 20 omitidas, 1 en rojo previa al cambio —`busqueda.spec.ts:502` exige que «colección» dé algún resultado y ninguna página del Corpus real la contiene; con `dist/` idéntico fuera de `pagefind/` y el Corpus sin tocar, no la causa esta historia.
- Matriz: filas 1–5 en `personaje-donde-el-autor.test.ts` (B1, B3, B4, V1, S1); «Siguiente» por Tema con Batman, Joker y Séneca en `siguiente.test.ts`; dueño equivocado en las sondas de `tarjeta-de-obra.test.ts` (dueño), `tarjeta-de-cita.test.ts` (Personaje que la Cita no declara) y `problemaDeRutasDeSalida` (`rutas-de-salida.test.ts`).
- `grep -rn "hasta la Historia 35.4\|hasta la 35.4" src tools integraciones AGENTS.md`: sin salida.

**Riesgos.** Los diferidos del frontmatter (sobre todo `creator` frente a `author` y la Obra de Personaje sin Autor fuera de `/obras/` hasta la 35.5). Una Cita de Personaje sin Autor solo llega a tres saltos por su Tema: la lista de Autores de la portada no la acerca (lo dice NFR-5 en la construcción). La prueba e2e de «colección» depende del Corpus real y queda en rojo hasta que alguna Cita publicada diga la palabra o la prueba deje de exigirla (Héctor).

