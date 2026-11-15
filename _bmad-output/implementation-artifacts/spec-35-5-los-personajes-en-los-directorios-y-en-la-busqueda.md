---
title: 'Historia 35.5 — Los Personajes en los Directorios y en la búsqueda'
type: 'feature'
created: '2026-11-13'
status: 'done'
baseline_revision: '93b84a1f72f729efdc5f681d2ef6dc13e9aac670'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-35-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-35-4-el-personaje-va-donde-va-el-autor.md'
warnings: ['oversized']
deferred:
  - summary: 'El Resultado de Cita con Personaje lleva el Personaje en la línea `.r-autor`, con el trato del Autor (Inter en versalitas), no en la serif que pide la historia: la UX da al Personaje «el trato del nombre del Autor en cada superficie» y la línea del Autor del resultado va en Inter. Es la misma decisión que la 35.4 tomó para la Atribución. Si la línea debe ir en serif, lo decide Héctor (bmad-ux).'
    evidence: 'epics.md Story 35.5 («en la serif»); DESIGN.md § Typography (v9.1, trato del Autor); src/pages/buscar.astro `.r-autor` (var(--sans)); spec 35.4, primer diferido de tipografía.'
    severity: low
  - summary: 'La meta description y la Tarjeta Social de `/obras/` siguen contando solo la A–Z de Autores («{k} obras de {m} autores, con {n} citas publicadas.»): las Obras de la sección «Personajes» se listan pero no entran en {k} ni en {n}, para que la frase no diga «de {m} autores» de Obras que no son de ningún Autor. Si la meta debe nombrar también las de los Personajes, la letra la decide Héctor (bmad-ux).'
    evidence: 'src/lib/atribucion.ts descripcionDelDirectorioDeObras; src/pages/tarjeta/directorio/obras.png.ts; EXPERIENCE.md § Sección «Personajes» (no dice nada de la meta).'
    severity: low
  - summary: 'Letras del filtro de `/autores/` con Personajes [ASSUMPTION de la historia]: «{a} autores y {p} personajes.» solo si los dos son > 0; con uno a cero, solo el otro («3 autores.», «1 personaje.»); a cero con la sección en la página, «Ningún autor ni personaje tiene «x» en el nombre.». La UX dice que falta el recuento y la frase a cero; las fija Héctor (bmad-ux).'
    evidence: 'EXPERIENCE.md § Sección «Personajes» («Sin decidir en esta pasada»); epics.md Story 35.5 («{a} autores y {p} personajes» [ASSUMPTION]).'
    severity: low
  - summary: 'Una dirección con `autor=` y `personaje=` a la vez no la produce ningún control (el selector es uno): se descarta `personaje` y se dice, como un filtro que no se puede usar, sin cambiar nunca el Autor. Ni la espina ni la UX dicen qué hacer; lo confirma Héctor (bmad-architecture).'
    evidence: 'ARCHITECTURE-SPINE.md, tabla «Parámetros de dirección» (v9.1) y AD-33; EXPERIENCE.md § Búsqueda («nunca se cambia el Autor»).'
    severity: low
  - summary: 'El orden de los parámetros de `/buscar/` pasa a `?q=&autor=&personaje=&obra=&tema=`: el dueño delante de su `obra`. La espina dice «`?q=&autor=&obra=&tema=` y, (v9.1), `personaje=`» sin fijar dónde. Con el Corpus real no cambia ninguna dirección.'
    evidence: 'ARCHITECTURE-SPINE.md, tabla «Parámetros de dirección»; src/lib/busqueda.ts PARAMETROS_DE_LA_BUSQUEDA.'
    severity: low
  - summary: >-
      La historia pide sumar a la tabla `COLOCACION` de `tests/unit/medicion.test.ts` las Filas de Personaje de `/autores/` en `directorio`, pero esa tabla solo compara las once zonas de la Épica 23 (`esDeOtraEpica` aparta `directorio`, de la Épica 26), y una fila con `directorio` no puede pasar. La zona la fijan `tests/unit/personajes-en-los-directorios.test.ts` y la prueba de que todo enlace de `main` tiene zona. Corregir la letra del criterio es pendiente de Héctor (bmad-create-epics-and-stories).
    evidence: |-
      epics.md, Story 35.5 («la tabla COLOCACION suma las Filas de Personaje de /autores/ en directorio»); AGENTS.md, «Las zonas del vocabulario que la Épica 23 no coloca … entran con su épica sin tocar la prueba»; medicion.test.ts, `esDeOtraEpica`.
    severity: low
  - summary: >-
      La presentación de la sección «Personajes» y del salto va en atributos `style` (solo tokens), como `Sostener.astro`, y no en el `<style>` de las páginas: Astro emite el `<style>` aunque no haya sección y `/autores/` y `/obras/` dejaban de salir idénticos con el Corpus real. Si se prefiere un componente con su hoja (que cambiaría el CSS de las dos páginas para siempre), lo decide Héctor (bmad-ux).
    evidence: |-
      Primera construcción con el Corpus real: el `<style>` de `/autores/` ganaba `.salto` y `.personajes` sin Personajes; src/pages/autores.astro y src/pages/obras.astro, `DEL_SALTO` y `DE_LA_SECCION`.
    severity: low
  - summary: >-
      La Obra de un Personaje cuyas Citas publicadas declaran todas a otros Personajes de su ficha no está en la lista de su dueño en el mapa de rótulos, así que su «Buscar en esta obra» (`personaje` + `obra`) llega a `/buscar/` con la Obra descartada y el aviso de filtro que no se puede usar, y una `?obra=` sola de esa Obra tampoco resuelve. Qué debe hacer ese formulario —omitirse, llevar a quien sí la dice o parar la construcción— lo decide Héctor (bmad-ux).
    evidence: |-
      Hallazgo edge-case-hunter de la revisión 35.5-1 y riesgo residual de la construcción. `obrasDelPersonaje` (src/lib/publicado.ts) sale de las Citas que declaran al Personaje, y `ofreceLaObra` mira esa lista; src/pages/obra/[autor]/[slug]/[...page].astro pinta el formulario con el dueño de la ficha. Ningún Corpus lo tiene hoy (no hay Personajes sembrados).
    location: >-
      src/pages/obra/[autor]/[slug]/[...page].astro:215
    severity: low
---

<intent-contract>

## Intent

**Problem:** El Personaje tiene página (35.3) y va donde va el Autor (35.4), pero ningún índice lo encuentra: `/autores/` no lo lista, `/obras/` deja fuera la Obra de un Personaje sin Autor, `/buscar/` no sabe de `personaje=` ni lo ofrece en su selector, y ni la Página de Personaje ni la Obra de un Personaje llevan «Buscar en…».

**Approach:** Una sección «Personajes» tras la A–Z en los dos Directorios (derivada en `src/lib/directorios.ts`, con su salto, sus letras y el filtro al teclear), `personaje=` como dueño en el estado de `/buscar/` con un `optgroup` «Personajes» en el selector de Autor, el filtro `personaje:` en Pagefind, el mapa de rótulos que nombra al dueño con su tipo, «Buscar en {Personaje}» y «Buscar en esta obra» en la Obra de un Personaje, y las aristas nuevas en `grafoDelModelo`. Todo inerte sin Personajes: con el Corpus real `dist/` sale idéntico salvo los dos guiones empaquetados que cambian.

## Boundaries & Constraints

**Always:**
- Sin Personajes publicados no hay sección, salto, hueco, `optgroup` ni clave nueva en el mapa: el HTML de `/autores/`, `/obras/`, `/buscar/`, toda Página de Autor, de Obra y de Cita y `dist/buscar/obras.json` salen byte a byte iguales con el Corpus real. **Las únicas diferencias admitidas en `dist/`** son el contenido y el nombre con huella de los ficheros de `/_astro/` de `Busqueda.astro` y de `FiltroDelDirectorio.astro` (y, si cambia, el trozo compartido que importan), y las referencias a ellos en las páginas que los cargan; además de lo que ya rotaba (`pagefind/`, lo de la jornada). Se comprueba con un `diff -r` de dos construcciones con el Corpus real, antes y después.
- Los Personajes no se cuentan como Autores en ningún sitio: `directorio.autores`, `directorio.citas`, `descripcionDelDirectorioDeAutores`, la Tarjeta Social de los Directorios y el recuento de autores del filtro.
- El orden y las iniciales de la sección salen de `agruparPorClave` (la clave de orden de cada Personaje), el mismo ayudante que la A–Z; ningún `localeCompare` de nombres.
- Un solo espacio de slugs (AD-33): el valor de una opción del selector es el slug, y si es de Autor o de Personaje lo dice el grupo en que va. La isla compone su dirección desde su estado, nunca copia `location.search`; `personaje` no es una Marca de llegada y la isla no lee `de`/`via`.
- Ningún evento, campo, valor ni zona nuevos: `src/lib/vocabulario.ts` no se toca; con `personaje` la búsqueda emite lo mismo que con `autor` (cuenta como `autor` en `filtrosUsados`). Las Filas de Personaje y las cabeceras de grupo de `/obras/` llevan zona `directorio`; el salto a «Personajes», las letras y «Volver a las letras» son anclas de la página, exentas.
- Topes de guion (AD-6): si `FiltroDelDirectorio` o `Busqueda` pasan de `MAX_BYTES_GUION_DEL_FILTRO` o `MAX_BYTES_GUION_DE_LA_BUSQUEDA`, el tope sube **en el mismo diff**, con la cifra medida (bytes del fichero + trozo, por `tests/unit/medicion.test.ts`) y la fecha en su comentario de `src/lib/umbrales.ts`, más unos 400, la regla de los comentarios vecinos; y la cifra se anota en `## Auto Run Result` de este spec. Nunca sin medida.
- Tokens de `DESIGN.md` en todo estilo nuevo; serif solo en nombres de Personaje y Autor; el `h3` de las letras de Personaje con el trato del Rótulo de sección.
- Pruebas sobre fixtures en copias temporales (`construirConCorpus`, `conLaPuertaAbierta`), nunca sobre el árbol; ninguna toca la red.

**Block If:**
- Hacer pasar `npm test` exigiera tocar `src/lib/vocabulario.ts`, mover la huella del vocabulario o editar un artefacto de `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.
- `integraciones/alcance.ts` rompiera con el Corpus real (NFR-5 no se relaja nunca).

**Never:**
- Sembrar Personajes, atribuidas o claves en el Corpus real, ni dar valor a ninguna constante reservada a Héctor (`MAX_*_DE_ATRIBUIDA`, `BUZON_DE_PETICIONES`…) ni subir `MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS`.
- Un cuarto selector «Personaje», un metadato de Pagefind nuevo, o el tipo en un `data-pagefind-meta`.
- Mezclar Personajes en la A–Z de Autores, o poner bajo un Personaje una Obra que ya va bajo un Autor.
- Leer el prefijo de un nombre de ficha en el cliente para saber su dueño.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sin Personajes | Corpus real | `/autores/`, `/obras/`, `/buscar/`, `obras.json` idénticos; filtro y recuento como hoy | — |
| `/autores/` con Personajes | Batman (2 citas), Homero (1) | Tras la A–Z, `h2#personajes` «Personajes», letras propias (`nav#letras-de-personajes`, anclas `personajes-letra-b`…), `h3` por letra, Fila «Batman» / «personaje de DC Comics · 2 citas»; salto «Personajes» bajo el `h1` a `#personajes` | Personaje publicado sin clave: `agruparPorClave` lanza nombrando «el Personaje» y `npx tsx tools/personaje.ts` (la integración de claves ya lo para antes) |
| Filtro `/autores/` | teclea «bat» | queda Batman; recuento «1 personaje.»; la A–Z sin filas oculta; letras de los dos bloques y salto ocultos mientras hay consulta | consulta vacía: todo vuelve, región vacía |
| `/obras/` con Personajes | Obra «El caballero» de Batman sin Autor; «Obras de Séneca» dicha por Batman con Séneca | «El caballero» en la sección «Personajes», bajo `h3` «Batman» enlazado a `/personaje/batman/`; «Obras de Séneca» solo bajo Séneca | una Obra publicada que no cae en ninguna sección: `directorioDeObras` lanza nombrándola |
| `/buscar/?personaje=batman` | Personaje con Citas | Batman elegido en el `optgroup` «Personajes»; filtro Pagefind `personaje: batman`; recuento «N citas de Batman.»; selector de Obra con la Lista de Obras de Batman | `personaje` inexistente: se descarta, se dice y se quita con `replaceState` |
| `?obra=batman--el-caballero` sola | — | el dueño sale del mapa: `personaje=batman`, los dos selectores elegidos | Obra sin dueño en el mapa: se descarta y se dice |
| `?autor=seneca&obra=batman--el-caballero` | no casan | se descarta `obra`, se dice; el Autor no cambia | — |
| `?autor=seneca&personaje=batman` | los dos | se descarta `personaje` (un descarte más) | — |
| Cita con Personaje y Autor | B3 | `data-pagefind-filter` `autor:seneca` y `personaje:batman`; metadato `autor` = «Batman» | — |
| «Buscar en…» | página 1 de Batman; página 1 de «El caballero» | `?personaje=batman`; `?personaje=batman&obra=batman--el-caballero` (orden de `PARAMETROS_DE_LA_BUSQUEDA`) | filtro vacío: el build se para (regla existente) |

</intent-contract>

## Code Map

- `src/lib/directorios.ts` -- `directorioDeAutores` (l. ~146) y `directorioDeObras` (l. ~186) ganan el parámetro `personajes: readonly Personaje[]` y devuelven aparte la sección (`personajes`); `agruparPorClave` (l. ~80) se generaliza en el tipo (`Pick<…,'slug'|'ordenAlfabetico'>`) y en el mensaje (entidad y orden de clave por parámetro); `anclaDeLetra` gana prefijo opcional. Las cifras de siempre (`autores`, `citas`, `obras`) siguen siendo de la A–Z.
- `src/lib/publicado.ts` -- `personajesPublicados` (l. 277), `citasDePersonaje` (l. 243), `obrasDelPersonaje` (l. 1030), `obrasDeLasCitas`; `filtrosDeLaBusqueda` (l. 1158: `porCita` gana `personaje`, opciones `personajes`, `mapaDeObras` con claves de Personaje y tercer elemento de dueño); `grafoDelModelo` (l. 1421: quita el filtro `enElDirectorio` de la 35.4 y añade Directorio de Autores → cada Personaje publicado). `FiltrosDeCita` (l. 1088).
- `src/lib/obras.ts` -- `Dueño` (l. 273), `ObraResuelta.dueño` (l. ~902): de aquí sale el dueño de cada Obra para el mapa y la sección.
- `src/lib/atribucion.ts` -- `hechosDeFilaDeAutor` (l. 288) como modelo; la frase «personaje de {universo}» (l. ~426, único dueño) para la Fila de Personaje; `descripcionDelDirectorioDe*` (l. 307, 329) sin cambio de letra.
- `src/lib/recuentos.ts` -- sin importaciones, apto para el cliente: gana `recuentoDePersonajes` («1 personaje», «n personajes»).
- `src/lib/filtroDelDirectorio.ts` -- `GrupoFiltrable` gana la marca de grupo de Personajes, `ResultadoDelFiltro` cuenta aparte las filas de Personajes, `fraseDelFiltro` compone las letras de la matriz (sin sección, idéntica a hoy).
- `src/components/FiltroDelDirectorio.astro` -- guion: lee también `[data-personajes]` (grupos de letra en `/autores/`; bloques `section.autor` en `/obras/`), oculta la sección entera, su `h2`, sus letras y el salto según el resultado; tope `MAX_BYTES_GUION_DEL_FILTRO` (l. 706 de `umbrales.ts`, 3.915; hoy 2.963 + 552).
- `src/components/LetrasDeSalto.astro` -- `id` hoy fijo `letras`: prop opcional, por omisión `letras` (salida idéntica).
- `src/components/GrupoDeLetra.astro` -- props opcionales `nivel` (2|3, por omisión 2, pasa a `Rotulo`) y el destino de «Volver a las letras» (por omisión `#letras`).
- `src/components/FilaDeAutor.astro` -- se reutiliza para la Fila de Personaje (`años` = «personaje de {universo}»): mismo marcado que lee el filtro (`li.fila-de-bloque .nombre`).
- `src/components/Rotulo.astro` -- admite `nivel` y `destino`; el `h2#personajes` es destino del salto.
- `src/pages/autores.astro`, `src/pages/obras.astro` -- pintan la sección tras la A–Z dentro de `.listado` (para que el filtro la alcance), con su ritmo (5 × `--unidad` desde el cierre del último grupo); el salto bajo el `h1`, con el trato de `.volver a` de `GrupoDeLetra`.
- `src/pages/tarjeta/directorio/{autores,obras}.png.ts` -- llamadas a las funciones de `directorios.ts`: pasan `conjunto.personajes`; cifras sin cambio.
- `src/lib/busqueda.ts` -- `FiltrosElegidos`, `EstadoDeLaBusqueda`, `PARAMETROS_DE_LA_BUSQUEDA` (orden `q, autor, personaje, obra, tema`), `ESTADO_VACIO`, `parametrosDe`, `mismoEstado`, `estadoSinNada`, `estadoDeLaEntrada`, `hayFiltros`, `obraElegida`, `filtrosDePagefind`, `combinacionDeFiltros`, `valoresDeFiltros`, `loFiltrado` (el dueño elegido en el hueco del Autor), `MapaDeObras` y `opcionesDeObra` (clave de dueño), `autorDeLaObra` → dueño de la Obra con su tipo, `LoQueSePuedeElegir` y `resolverEstado` (orden fijo con `personaje`). Ya lo prueba `tests/unit/busqueda-con-filtros.test.ts`.
- `src/lib/tipoDeResultado.ts` -- `FILTROS_DE_CITA` (l. ~93) gana `personaje`; `OPCIONES_DE_PAGEFIND` **no cambia** (sin metadato nuevo).
- `src/components/FiltrosDeLaCita.astro` -- escribe `personaje:` desde `filtros.personaje`; el metadato `autor` lleva el nombre de quien firma la línea del resultado: el Personaje si la Cita lo declara, si no el Autor. `src/pages/cita/[slug].astro` l. 234 (`nombreDelAutor={autor?.nombre}`) pasa ese nombre.
- `src/pages/buscar.astro` (l. 71-74) y `src/components/Busqueda.astro` (props y plantilla del selector de Autor; guion: `elegidos` l. 658, `nombreDe` l. 671, `pedirDatosDeObra`, `componerObra` l. 755, el recuento l. ~952, `resolverYBuscar` l. 1273, `llegar` l. 1319) -- el `optgroup label="Personajes"` tras los Autores; el estado sale del grupo de la opción elegida; el selector de Obra se acota por el dueño elegido.
- `src/pages/buscar/obras.json.ts` -- escribe el mapa nuevo; sin Personajes, idéntico.
- `src/components/BuscarEn.astro` -- `Filtros` gana `{ personaje: string; obra?: string }`.
- `src/pages/personaje/[slug]/[...page].astro` -- «Buscar en {Personaje}» bajo «Citas» y encima del listado, solo página 1, con los ritmos de la Página de Autor (`autor/[slug]/[...page].astro` l. 165-170, 242-256); quitar la nota «sin «Buscar en…» (35.5)» de su cabecera.
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- l. 214: la rama `dueño.tipo === 'autor'` gana la de Personaje (`{ personaje, obra }`); quitar la nota de la 35.4 (l. ~20).
- `tools/lib/cambios.ts` -- `CAMPOS_QUE_PINTA` (l. ~310): `personaje → directorioDeAutores` gana `nombre`, `universo`; `personaje → directorioDeObras` gana `nombre`; `cita → directorioDeAutores` y `→ directorioDeObras` ganan `personaje`. La relación ya compone los ficheros (l. 696-736).
- `integraciones/alcance.ts`, `integraciones/directorios.ts` -- sin cambio esperado: la primera juzga el grafo nuevo; la segunda mide el HTML ya con la sección.
- Pruebas: `tests/unit/directorio-de-autores.test.ts`, `directorio-de-obras.test.ts`, `filtro-del-directorio.test.ts` (+ `ayuda/filtro.ts`, `ayuda/filtroEjecutado.ts`), `busqueda-con-filtros.test.ts` (+ `ayuda/busqueda.ts`), `filtros-de-cita.test.ts`, `publicable-y-alcanzable.test.ts` (l. 916: fuera de `/cita/…` ningún filtro `autor`/`obra`/`tema`; gana `personaje`), `medicion.test.ts` (`COLOCACION` l. 3278, con `PERSONAJE` y `OBRA_DE_BATMAN` ya en su sitio medido), `alcance.test.ts`/`alcance-construido.test.ts`, `fecha-de-cambio.test.ts`, `ingreso-construido.test.ts` (llama a `directorios.ts`), `personaje-donde-el-autor.test.ts` (metadato `autor` de B3). Fixture a imitar: `tests/unit/personaje-donde-el-autor.test.ts` (Batman, su ficha, `conLaPuertaAbierta`, relleno de Tema).
- e2e: `tests/e2e/directorio-de-autores.spec.ts`, `tests/e2e/busqueda-historial.spec.ts` -- casos que se omiten (`test.skip`) si el sitio construido no tiene Personajes (el Corpus real); los corre Héctor.

## Tasks & Acceptance

**Execution:**
- `src/lib/recuentos.ts`, `src/lib/atribucion.ts` -- `recuentoDePersonajes` y los hechos de la Fila de Personaje («personaje de {universo}» + recuento) -- un dueño para cada letra.
- `src/lib/directorios.ts` -- sección de Personajes en los dos Directorios (filas por `agruparPorClave` con anclas con prefijo; en `/obras/`, las Obras de `obrasDeLasCitas` que no caen bajo ningún Autor, agrupadas por `obra.dueño` Personaje, en el orden de su clave, cada una con `ordenDeLaListaDeObras`), lanzando si una Obra publicada no cae en ninguna sección o si su dueño no es un Personaje publicado -- la página solo pinta.
- `src/components/{LetrasDeSalto,GrupoDeLetra}.astro` -- props opcionales con valor por omisión que reproduce el marcado de hoy -- reuso sin choque de `id`.
- `src/pages/autores.astro`, `src/pages/obras.astro` + llamadas de `src/pages/tarjeta/directorio/*.png.ts` -- sección, salto y estilos con tokens -- UX-DR140, UX-DR141.
- `src/lib/filtroDelDirectorio.ts`, `src/components/FiltroDelDirectorio.astro`, `src/lib/umbrales.ts` (si hace falta) -- el filtro alcanza la sección y la oculta entera; letras de la matriz; medida y tope.
- `src/lib/publicado.ts` -- `filtrosDeLaBusqueda` (filtro y opciones de Personaje; mapa: claves de Autor tal cual, claves de Personaje como `personaje:{slug}`, cada lista la Lista de Obras de su dueño —`obrasDelAutor` / `obrasDelPersonaje`—, y un tercer elemento con la clave del dueño de la ficha solo cuando no es el de la lista) y `grafoDelModelo` -- AD-11, AD-33, NFR-5.
- `src/lib/tipoDeResultado.ts`, `src/components/FiltrosDeLaCita.astro`, `src/pages/cita/[slug].astro` -- filtro `personaje:` y metadato de la línea del resultado.
- `src/lib/busqueda.ts` -- estado, dirección, resolución (1: descartar `autor`/`personaje`/`tema` que no son opción y la `obra` no ofrecible; `autor` + `personaje` → se descarta `personaje`; 2: `obra` sin dueño toma el del mapa con su tipo; 3: dueño y `obra` que no casan —la Obra no está en la lista del dueño elegido— → se descarta `obra`), frases con el nombre del dueño, combinación y valores -- AD-33.
- `src/pages/buscar.astro`, `src/components/Busqueda.astro`, `src/pages/buscar/obras.json.ts`, `src/lib/umbrales.ts` (si hace falta) -- `optgroup`, estado por grupo de la opción, selector de Obra por dueño; medida y tope.
- `src/components/BuscarEn.astro`, `src/pages/personaje/[slug]/[...page].astro`, `src/pages/obra/[autor]/[slug]/[...page].astro` -- «Buscar en {Personaje}» y «Buscar en esta obra» de Personaje.
- `tools/lib/cambios.ts` -- campos pintados por los Directorios.
- Pruebas unitarias de la Code Map -- una construcción de prueba con dos Personajes (uno dueño de una Obra sin Autor), una Cita con Personaje y Autor y una de siempre, más lo puro de la matriz en `busqueda-con-filtros`, `filtro-del-directorio` y `directorio-de-*`; las filas nuevas de `COLOCACION` (`/autores/` → Personaje y `/obras/` → Personaje y Obra de Batman, zona `directorio`).
- e2e de la Code Map -- salto y foco al `h2`, filtro con Personajes, `optgroup`, `personaje=` en la dirección; omitidas sin Personajes.
- `AGENTS.md` -- al día «El Directorio de Obras» (sección «Personajes») y la nota del filtro de los Directorios (alcanza a los Personajes, su recuento); `/buscar/` con `personaje=` donde se describe su estado.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- solo la línea `35-5-…`, con su comentario, al cerrar.

**Acceptance Criteria:**
- Given `/autores/` construido con Personajes, when se tabula y se pulsa el salto «Personajes», then el foco va al `h2` «Personajes» (destino con `tabindex="-1"`), que está tras el último grupo de la A–Z, y cada letra de la sección salta a su `h3` sin chocar con las anclas de los Autores.
- Given el mismo sitio, when se leen la meta description, el recuento del filtro sin Personajes en la consulta y la Tarjeta Social de `/autores/`, then ninguno cuenta a los Personajes como Autores.
- Given `/obras/` con una Obra de Personaje sin Autor, when se construye, then esa Obra está una vez bajo su Personaje en la sección «Personajes», toda Obra de `obrasPublicadas` está una vez en la página, y el aviso de `MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS` sigue sin romper.
- Given la construcción con Personajes, when corre `integraciones/alcance.ts`, then el grafo del modelo tiene Directorio de Autores → cada Página de Personaje y Directorio de Obras → cada Obra de Personaje, `dist/` las pinta, y quitar una de las páginas hace romper la construcción nombrando la arista (prueba de `alcance-construido`).
- Given `dist/` con Personajes, when se juzga el índice, then todo registro con filtro `personaje` (como con `autor`) es una Página de Cita, la Cita B3 lleva los dos filtros, ningún metadato nuevo aparece fuera de `OPCIONES_DE_PAGEFIND`, y la Página de Personaje bajo `MIN_CITAS_POR_PERSONAJE` no está en el índice.
- Given `/buscar/` en el entorno simulado de `tests/unit/ayuda/busqueda.ts`, when se elige Batman en el grupo «Personajes» y la búsqueda se asienta, then la dirección dice `?personaje=batman`, se emite la `busqueda` con la misma combinación que daría un Autor (`autor`), y el historial se escribe con la regla de siempre.
- Given el Corpus real, when se construye antes y después del cambio, then `diff -r` de los dos `dist/` (sin `pagefind/` y lo que rota con la jornada) solo muestra los ficheros de `/_astro/` de las dos islas y sus referencias, y los dos guiones caben en su tope (o el tope sube en el diff con su medida anotada).

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
- patch: 2: (high 0, medium 2, low 0)
- defer: 1: (high 0, medium 0, low 1)
- reject: 24: (high 0, medium 3, low 21)
- addressed_findings:
  - `[medium]` `[patch]` El spec estaba roto: el cierre de la construcción partió el fichero por la primera aparición de «## Auto Run Result», que estaba dentro de la regla de los topes del `Always`, y se perdieron el resto del contrato, la matriz, el Code Map, las tareas, los criterios, el registro de cambios, las notas de diseño y la Verificación; además decía «0 diferidos» con siete en el frontmatter. Se restituyó el cuerpo desde la escritura de la planificación (con sus dos correcciones de líneas), sin tocar el `<intent-contract>` original, y el resumen de la construcción va en su sección, con la nota de la revisión aclarada.
  - `[medium]` `[patch]` La rama del tercer elemento de `dueñoDeLaObra` no decidía en ninguna prueba y el comentario de la prueba pura describía un camino que no tomaba: `tests/unit/busqueda-con-filtros.test.ts` corrige el comentario y suma dos mapas en que la primera lista que lleva la Obra es la de quien la dice (Personaje «alfa» y Autor Séneca) y el dueño sale del tercer elemento. Con `const dueño = clave;` la prueba cae (comprobado) y con el código de la 35.5 pasa.

## Design Notes

**El mapa de rótulos con dueño y tipo, compatible.** La forma sigue siendo un objeto de listas de pares, para que con el Corpus real `obras.json` salga igual. La clave dice el dueño y su tipo por su sintaxis —el slug a secas es un Autor; `personaje:{slug}` (los dos puntos no caben en un slug) es un Personaje— y la lista es la Lista de Obras de ese dueño, en su orden. El dueño de cada Obra es el de su ficha: si no es la clave de la lista, el par lleva un tercer elemento con la clave de su dueño.

```json
{ "seneca": [["seneca--obras-de-seneca","Obras de Séneca"],
             ["batman--el-caballero","El caballero","personaje:batman"]],
  "personaje:batman": [["batman--el-caballero","El caballero"],
                       ["seneca--obras-de-seneca","Obras de Séneca","seneca"]] }
```

(La segunda fila de `seneca` existe solo si una Cita de la Obra de Batman declara a Séneca.) Con esto `obra` sola toma al dueño de su ficha, con su tipo, y «casar» es estar en la lista del dueño elegido. `opcionesDeObra` ya tolera el tercer elemento.

**La línea del Resultado de Cita** reutiliza el metadato `autor`: lleva el nombre de quien va donde va el Autor (el Personaje si lo hay). No añade metadato ni toca `OPCIONES_DE_PAGEFIND`, y el nombre ya está en el cuerpo indexado por la Atribución, así que el peso 0 sigue sin estorbar.

**Por qué cambian los guiones con el Corpus real:** el soporte de `personaje` y de la sección vive en el código del cliente, aunque no tenga nada que pintar; es la única diferencia admitida, y por eso la medida.

## Verification

**Commands:**
- `npx vitest run tests/unit/directorio-de-autores.test.ts` (y de uno en uno: `directorio-de-obras`, `filtro-del-directorio`, `busqueda-con-filtros`, `filtros-de-cita`, `publicable-y-alcanzable`, `alcance-construido`, `fecha-de-cambio`, `ingreso-construido`, `personaje-donde-el-autor`, `medicion`) -- expected: verde.
- `npx astro check` -- expected: 0 errores.
- `npm test` (despegado con `correr.sh`) -- expected: verde salvo lo previo documentado.
- Dos `npm run build` con el Corpus real (base en un `git worktree add --detach` bajo `.claude/v9-ralph/tmp-wt/`, y el árbol) y `diff -r` -- expected: solo las diferencias admitidas en Always.
- `npx playwright test tests/e2e/directorio-de-autores.spec.ts tests/e2e/busqueda-historial.spec.ts tests/e2e/filtro-del-directorio.spec.ts --project=escritorio` -- expected: verde, con los casos de Personaje omitidos sobre el Corpus real.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** Los Personajes entran en los dos Directorios y en `/buscar/`. `directorioDeAutores` y `directorioDeObras` devuelven aparte su sección «Personajes» (por `agruparPorClave`, con anclas `personajes-letra-…`); `/autores/` la pinta tras la A–Z con su `h2#personajes` (destino del salto `data-salto` bajo el `h1`), sus letras `nav#letras-de-personajes`, un `h3` por letra y la Fila de Autor con «personaje de {universo} · {n} citas»; `/obras/` pinta las Obras sin Autor bajo su Personaje (la de un Personaje dicha con Autor, solo bajo el Autor), y `directorioDeObras` lanza si una Obra publicada no cae en ninguna sección. Las cifras, la meta y la Tarjeta siguen siendo de la A–Z. El filtro de los Directorios alcanza la sección, la oculta entera, aparta letras y salto con texto y cuenta aparte («{a} autores y {p} personajes.»). `/buscar/` gana `personaje=` (`?q=&autor=&personaje=&obra=&tema=`), el `optgroup` «Personajes» en el selector de Autor, el filtro Pagefind `personaje:` y el metadato `autor` con el nombre del Personaje; el mapa de rótulos lleva `personaje:{slug}` y el tercer elemento del dueño de la ficha ajena; la resolución descarta el `personaje` que no existe o que llega con `autor`, toma el dueño de una `obra` sola del mapa y descarta la `obra` que no está en la lista del dueño elegido. «Buscar en {Personaje}» en la página 1 de la Página de Personaje y «Buscar en esta obra» (`personaje` + `obra`) en la Obra de un Personaje. `grafoDelModelo`: `/autores/` → todo Personaje y `/obras/` → toda Obra. `CAMPOS_QUE_PINTA` al día. Vocabulario intacto: el Personaje cuenta como `autor` para la medición.

**Ficheros.**
- `src/lib/directorios.ts` — secciones «Personajes» de los dos Directorios; `agruparPorClave` genérico (entidad, prefijo de ancla, orden de claves); lanza ante una Obra sin sección.
- `src/lib/recuentos.ts`, `src/lib/atribucion.ts` — `recuentoDePersonajes`, `hechosDeFilaDePersonaje`.
- `src/lib/filtroDelDirectorio.ts`, `src/components/FiltroDelDirectorio.astro` — grupos marcados `personajes`, recuento aparte, sección/letras/salto ocultos.
- `src/components/LetrasDeSalto.astro`, `src/components/GrupoDeLetra.astro` — `id`, `nivel` y `volver` opcionales con la salida de siempre por omisión.
- `src/pages/autores.astro`, `src/pages/obras.astro`, `src/pages/tarjeta/directorio/*.png.ts` — la sección y el salto (estilos en `style`, solo tokens), las llamadas con `conjunto.personajes`.
- `src/lib/busqueda.ts` — `personaje` en el estado y la dirección, `PREFIJO_DE_PERSONAJE`, `claveDelDueño`, `dueñoDeLaClave`, `dueñoDeLaObra` (antes `autorDeLaObra`), `ofreceLaObra`, `resolverEstado` con Personajes, `rotuloBuscarEnPersonaje`.
- `src/lib/publicado.ts` — `filtrosDeLaBusqueda` (filtro y opciones de Personaje, mapa con clave y tipo de dueño), `grafoDelModelo`.
- `src/lib/tipoDeResultado.ts`, `src/components/FiltrosDeLaCita.astro`, `src/pages/cita/[slug].astro` — filtro `personaje:` y metadato `autor` del Personaje.
- `src/components/Busqueda.astro`, `src/pages/buscar.astro`, `src/pages/buscar/obras.json.ts` — `optgroup`, dueño por el grupo de la opción, selector de Obra por clave de dueño.
- `src/components/BuscarEn.astro`, `src/pages/personaje/[slug]/[...page].astro`, `src/pages/obra/[autor]/[slug]/[...page].astro` — «Buscar en {Personaje}» y «Buscar en esta obra» de Personaje.
- `src/lib/umbrales.ts` — topes de guion subidos con su medida.
- `tools/lib/cambios.ts` — `CAMPOS_QUE_PINTA` de los Directorios.
- `AGENTS.md` — «Los Personajes en los Directorios y en la búsqueda», el Directorio de Obras y la nota del filtro.
- Pruebas: `tests/unit/personajes-en-los-directorios.test.ts` (nueva, construcción con Batman, el Zorro, Séneca y la Autora Viva), `directorio-de-autores`, `directorio-de-obras`, `filtro-del-directorio`, `busqueda-con-filtros`, `medicion` (isla con el grupo «Personajes»), `personaje-donde-el-autor`, `publicable-y-alcanzable`, `fecha-de-cambio`, `indexnow`, `tipo-de-resultado`, `ayuda/busqueda.ts` (`optgroup`), `ayuda/filtroEjecutado.ts` (sección y salto); e2e `directorio-de-autores.spec.ts` y `busqueda-historial.spec.ts` (omitidas sin Personajes).

**Topes de guion (AD-6), medidos por `tests/unit/medicion.test.ts` el 2026-11-13:** filtro **4.329 bytes** (3.706 del fichero + 623 del trozo `recuentos`; antes 3.515) → `MAX_BYTES_GUION_DEL_FILTRO` 3.915 → **4.729**; búsqueda **19.211 bytes** (18.588 + 623; antes 18.099) → `MAX_BYTES_GUION_DE_LA_BUSQUEDA` 18.296 → **19.611**.

**Revisión (pasada de la construcción).** Las capas externas no corrieron en esa pasada: 0 parches, 0 diferidos nuevos de revisión, 0 rechazados (los siete diferidos del frontmatter salieron de la planificación y la construcción, no de la revisión). Seguimiento recomendado entonces: no (0 parches; puntuación 0).

**Verificación.**
- `npx astro check`: 0 errores, 0 avisos (471 ficheros).
- Por fichero, en verde: `personajes-en-los-directorios` (15), `directorio-de-autores`, `directorio-de-obras`, `filtro-del-directorio`, `busqueda-con-filtros`, `filtros-de-cita`, `personaje-donde-el-autor`, `fecha-de-cambio`, `alcance`, `medicion` (735), `publicable-y-alcanzable`, `indexnow`, `tipo-de-resultado`, `tipografia-en-tokens`.
- `npm test` completo (logs/s-35/npm-test-35.5.log): 179 de 182 ficheros en verde; los 3 en rojo fijaban lo de antes de la historia (`FILTROS_DE_CITA` sin `personaje`, el universo del Personaje que no avisaba `/autores/`, el metadato `autor` de la Cita con Personaje) y se pusieron al día y pasan por fichero; segunda pasada completa (logs/s-35/npm-test-35.5-b.log): **182 ficheros, 8.088 pruebas, EXIT 0**.
- `dist/` con el Corpus real (`FECHA_JORNADA=2026-11-13`), base en un `git worktree add --detach` de 93b84a1f72 frente al árbol, `diff -rq -x pagefind`: solo cambian los tres ficheros de `/_astro/` (`Busqueda…`, `FiltroDelDirectorio…`, el trozo `recuentos…`) y sus referencias en `/autores/`, `/obras/` y `/buscar/` (idénticas con las huellas normalizadas); `buscar/obras.json` idéntico.
- e2e `--project=escritorio` de `directorio-de-autores`, `directorio-de-obras`, `filtro-del-directorio`, `busqueda-historial` y `busqueda` (logs/s-35/e2e-35.5.log): 127 en verde, 6 omitidas (las dos de Personaje, sin Personajes en el Corpus real), 1 en rojo previa a la historia (`busqueda.spec.ts:502`, la misma de la 35.4: «colección» sin resultados en el Corpus real).

**Riesgos residuales.** La sección «Personajes» solo se ve con Personajes sembrados: el navegador no la ha recorrido (los casos e2e se omiten con el Corpus real y los corre Héctor). La Obra de un Personaje cuyas Citas resueltas son todas de otros Personajes de su `personajes` no está en la lista del dueño en el mapa, y su «Buscar en esta obra» llegaría a `/buscar/` con la Obra descartada (caso límite, sin Corpus que lo tenga).

### Revisión 35.5-1 (2026-11-13)

Status: done
Blocking condition: ninguna.

**Resumen.** Pasada de revisión con las cinco capas externas. Dos parches, los dos sin tocar `src/`: el spec, que el cierre de la construcción había dejado truncado dentro del `<intent-contract>`, recupera su cuerpo entero; y la prueba pura de `dueñoDeLaObra` cubre por fin la rama del tercer elemento. Un diferido nuevo (la Obra de un Personaje que solo dicen otros Personajes de su ficha), para Héctor.

**Ficheros.**
- `_bmad-output/implementation-artifacts/spec-35-5-los-personajes-en-los-directorios-y-en-la-busqueda.md` — cuerpo restituido, registro de triaje, diferido nuevo y este resultado.
- `tests/unit/busqueda-con-filtros.test.ts` — comentario corregido y dos mapas en que decide el tercer elemento.

**Hallazgos.** 2 parches (medio 2), 1 diferido (bajo), 24 rechazados: los que ya estaban diferidos (serif del resultado, `COLOCACION`, meta de `/obras/`, `autor` y `personaje` a la vez), los que el diseño excluye o garantiza en otro sitio (el dueño es uno por Obra, así que la primera lista que la lleva da el mismo; `resolverEstado` no deja pasar dos dueños; `directorioDeObras` lanza ante una Obra sin sección; AD-33 y el esquema de slug impiden el choque de slugs y los dos puntos; `/obras/` sin letras ni salto propios es la letra de UX-DR141), la compatibilidad de las entradas viejas del historial (ya la fija la prueba del objeto de la entrada, que lee una sin `personaje`), y los recorridos en navegador, que el criterio deja a Héctor.

**Seguimiento recomendado: sí.** Parches de esta pasada: alto 0, medio 2, bajo 0; puntuación 3 × 2 + 0 = 6.

**Verificación.**
- La prueba nueva cae con la mutación de la revisión (`const dueño = clave;` en `dueñoDeLaObra`) y pasa con el código de la 35.5; `npx vitest run tests/unit/busqueda-con-filtros.test.ts`: 70 en verde.
- `npx astro check`: 0 errores, 0 avisos (471 ficheros).
- `npm test` completo (logs/s-35/npm-test-35.5-r1.log): **182 ficheros, 8.088 pruebas, EXIT 0**.
- Sin cambio en `src/`: la comparación de `dist/` y las e2e de la construcción siguen valiendo.

**Riesgos residuales.** Los de la construcción, y el diferido nuevo: hasta que Héctor lo decida, el «Buscar en esta obra» de una Obra de Personaje que su dueño no dice llevaría a una búsqueda con la Obra descartada.
