---
title: 'Historia 35.5 — Los Personajes en los Directorios y en la búsqueda'
type: 'feature'
created: '2026-11-13'
status: 'done'
baseline_revision: '93b84a1f72f729efdc5f681d2ef6dc13e9aac670'
review_loop_iteration: 0
followup_review_recommended: false
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
- Topes de guion (AD-6): si `FiltroDelDirectorio` o `Busqueda` pasan de `MAX_BYTES_GUION_DEL_FILTRO` o `MAX_BYTES_GUION_DE_LA_BUSQUEDA`, el tope sube **en el mismo diff**, con la cifra medida (bytes del fichero + trozo, por `tests/unit/medicion.test.ts`) y la fecha en su comentario de `src/lib/umbrales.ts`, más unos 400, la regla de los comentarios vecinos; y la cifra se anota en `## Auto Run Result

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

**Revisión.** Las capas son externas y no traen hallazgos en esta pasada: 0 parches, 0 diferidos, 0 rechazados. Seguimiento recomendado: no (0 parches; puntuación 0).

**Verificación.**
- `npx astro check`: 0 errores, 0 avisos (471 ficheros).
- Por fichero, en verde: `personajes-en-los-directorios` (15), `directorio-de-autores`, `directorio-de-obras`, `filtro-del-directorio`, `busqueda-con-filtros`, `filtros-de-cita`, `personaje-donde-el-autor`, `fecha-de-cambio`, `alcance`, `medicion` (735), `publicable-y-alcanzable`, `indexnow`, `tipo-de-resultado`, `tipografia-en-tokens`.
- `npm test` completo (logs/s-35/npm-test-35.5.log): 179 de 182 ficheros en verde; los 3 en rojo fijaban lo de antes de la historia (`FILTROS_DE_CITA` sin `personaje`, el universo del Personaje que no avisaba `/autores/`, el metadato `autor` de la Cita con Personaje) y se pusieron al día y pasan por fichero; segunda pasada completa (logs/s-35/npm-test-35.5-b.log): **182 ficheros, 8.088 pruebas, EXIT 0**.
- `dist/` con el Corpus real (`FECHA_JORNADA=2026-11-13`), base en un `git worktree add --detach` de 93b84a1f72 frente al árbol, `diff -rq -x pagefind`: solo cambian los tres ficheros de `/_astro/` (`Busqueda…`, `FiltroDelDirectorio…`, el trozo `recuentos…`) y sus referencias en `/autores/`, `/obras/` y `/buscar/` (idénticas con las huellas normalizadas); `buscar/obras.json` idéntico.
- e2e `--project=escritorio` de `directorio-de-autores`, `directorio-de-obras`, `filtro-del-directorio`, `busqueda-historial` y `busqueda` (logs/s-35/e2e-35.5.log): 127 en verde, 6 omitidas (las dos de Personaje, sin Personajes en el Corpus real), 1 en rojo previa a la historia (`busqueda.spec.ts:502`, la misma de la 35.4: «colección» sin resultados en el Corpus real).

**Riesgos residuales.** La sección «Personajes» solo se ve con Personajes sembrados: el navegador no la ha recorrido (los casos e2e se omiten con el Corpus real y los corre Héctor). La Obra de un Personaje cuyas Citas resueltas son todas de otros Personajes de su `personajes` no está en la lista del dueño en el mapa, y su «Buscar en esta obra» llegaría a `/buscar/` con la Obra descartada (caso límite, sin Corpus que lo tenga).
