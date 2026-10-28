---
title: 'Todos los Autores, de la A a la Z'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_revision: '9e5c4693379a12fdda9a546a97df3ed74baada34'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-26-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Quien busca a un Autor sin saber cómo se escribe su nombre entero no tiene dónde recorrerlos: el sitio no lista sus Autores en ningún sitio, y Cervantes solo se alcanza por una de sus Citas o por la búsqueda. Historia 26.3, `epics.md` líneas 6975-7075 (autoritativo).

**Approach:** Una página nueva, `/autores/`, declarada producto en `src/lib/superficies.ts` (con su constructor, su vista, su línea base «los Directorios» y un predicado `esRutaDeDirectorio`), que lista todo Autor con Citas publicadas por la clave de orden de la 26.1 (`compararPorClave`, `inicialDeClave`), agrupado por letra con letras de salto que funcionan sin guion, con su Tarjeta Social de los Directorios en `/tarjeta/directorio/autores.png`, sin ningún Modelo de Ingreso, y compuesta en la relación de AD-27 por lo que pinta. Sin campo de filtro, sin región de recuento y sin guion: eso es la 26.6.

## Boundaries & Constraints

**Always:**
- Una sola fuente de orden e inicial: `compararPorClave`/`inicialDeClave`/`claveDeComparacion` de `src/lib/normalizar.ts`; ningún otro módulo ordena Autores ni calcula iniciales. Nunca `localeCompare` ni el orden por nombre de `autoresPublicados`.
- Lista = `autoresPublicados(conjunto.autores, conjunto.citas)`; {n} = `citasDeAutor(...).length` (las publicadas que lista su página, no las documentadas). Los años, de `añosDeAutor`. Singulares: «1 cita», «1 autor», «1 cita publicada». Ningún texto de la página, del título, de la meta ni de la Tarjeta dice «frases».
- Un dato ausente se omite sin separador ni hueco. Nada se recorta.
- Rutas solo por constructor (`rutaDelDirectorioDeAutores()`, `rutaDeAutor`); barra final.
- Tokens de `tokens.css`, ningún literal de color o tipografía. Serif solo en el nombre del Autor; `h1`, letras, hechos y «Volver a las letras» en Inter. Glifo de avance: ninguno en esta página (y nunca «→»).
- Zona: `directorio` en el contenedor de cada Fila (`FilaDeBloque` la pone en su `<li>`); las letras y «Volver a las letras» son anclas de la misma página (exentas sin tocar la prueba de la 23.7).
- Sin JavaScript todo funciona: las letras son anclas, el destino recibe el foco por `tabindex="-1"`.
- No relajar `MAX_SALTOS_DESDE_LA_PORTADA` ni ningún umbral; no tocar `astro.config.mjs` ni la puerta de cobertura tipográfica.

**Block If:**
- Hacer pasar una prueba exigiría editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`, o eximir otra ruta que `/autores/`.
- `/autores/` no sale idéntica byte a byte con todos los Modelos admitidos encendidos frente a apagados y la diferencia no se puede quitar sin tocar un Modelo construido (Sostener, Ediciones).

**Never:** campo de filtro, región `role="status"`, guion o `assetsInlineLimit` (26.6); familia `directorio` en las series de `tools/` —indexación, tráfico, demanda, rastreo, canal— (26.7); cabecera con «Autores» (26.5); `/obras/` (26.4); JSON-LD propio; paginar `/autores/`; agrupar por Época; reproducir semblanzas o Citas; componer prosa.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Orden por clave | «Miguel de Cervantes» con clave «Cervantes» | Fila bajo la C, entre las claves que la rodean por `claveDeComparacion` | — |
| Ñ | claves «Nuño», «Ñandú», «Ocampo» | Grupos N, Ñ, O en ese orden; letra «Ñ» propia | — |
| Tilde en la inicial | clave «Álvarez» | Grupo y letra «A» | — |
| Empate de clave | dos «Séneca» (`seneca`, `seneca-el-viejo`) | Por slug: `seneca` primero | — |
| Sin Citas publicadas | Autor sin Citas o con todas fuera | No hay fila; si era el único de su inicial, no hay letra ni grupo | — |
| Años | 1547/1616 · 12 Citas | «1547–1616 · 12 citas» | — |
| Sin nacimiento | solo fallecimiento 65 | «Fallecido en 65 · 1 cita» | — |
| Sin años (función pura) | sin `añoFallecimiento` | solo «{n} citas», sin «·» ni espacio | inalcanzable con el esquema; se prueba solo la función |
| Autor publicado sin clave | `ordenAlfabetico` ausente | el build ya lo para en `integraciones/claves.ts`; la función pura lanza nombrando el slug | `throw` |
| Corpus vacío | 0 Autores | `h1` solo, sin letras ni grupos; meta «0 autores, de la A a la Z, con 0 citas publicadas.» | — |

</intent-contract>

## Code Map

- `src/lib/superficies.ts` -- `SUPERFICIES` (152-257): añadir la del Directorio de Autores (`pagina: 'autores.astro'`, `reconoce: /^\/autores$/`, `caracter: 'producto'`, `vista: EVENTOS.vistaDeSuperficie`, `lineaBase: LINEA_BASE_DE_LOS_DIRECTORIOS`, sin `noPublicableEn`). Constructores (284-338): añadir `rutaDelDirectorioDeAutores()` → `'/autores/'` y la constante `TARJETA_DEL_DIRECTORIO_DE_AUTORES = '/tarjeta/directorio/autores.png'`. Patrón de predicado por declaración: `esRutaDeObra` (464). Comentario de `lineaBase` (118-129) al día.
- `src/lib/normalizar.ts:60-130` -- `inicialDeClave`, `claveDeComparacion`, `compararPorClave` (26.1). Solo consumir.
- `src/lib/publicado.ts` -- `Autor` (75-88) gana `ordenAlfabetico?: string`; `aplanarAutor` (975) lo copia si está; `autoresPublicados` (136) no cambia; `rutasPublicadas` (679) añade la ruta del Directorio tras los Autores (y por ella la hereda `rutasIndexables`, 851).
- `src/lib/atribucion.ts` -- `añosDeAutor` (148), `SUPERFICIES_DE_LA_SEMBLANZA` (102, intacta), patrón de descripciones `descripcionDeAutor`/`descripcionDeObra` (197-232); copias de «1 cita» en 269 y `tarjeta.ts:277`.
- `src/lib/tarjeta.ts:121-300` -- `svgDeTarjetaDeListado` con `hechos` y `familiaDelTitulo: 'sans'`; patrón `datosDeTarjetaDeObra`.
- `src/pages/tarjeta/portada.png.ts` -- patrón de una Tarjeta sin parámetro (sharp → PNG).
- `src/lib/marca.ts:35` -- `tituloDe(parte)`.
- `src/lib/ingreso.ts:203` -- `SUPERFICIES_SIN_INGRESO`; la revisión (600-620, 661) ya rechaza admitir un Modelo ahí.
- `src/components/FilaDeBloque.astro` -- `<li data-zona>` + `<a><span><slot/></span></a>`, flex, sans; los estilos de quien la usa alcanzan su `slot`. `Rotulo.astro` -- `h2` con `destino` (tabindex −1 y `scroll-margin-top`). `TarjetaDeObra.astro:116` -- patrón del punto medio `aria-hidden` + `.solo-para-lectores` «, ».
- `src/pages/autor/[slug]/[...page].astro` y `src/pages/buscar.astro:419` -- patrón de página (`Armazon` con `titulo`, `descripcion`, `tarjeta`, `ruta`, `tipo`) y del `h1` en Inter.
- `src/components/Armazon.astro` -- emite canónica, `noindex`, `data-pagefind-body`, el filtro `tipo:` y `data-vistas` desde la declaración; no se toca.
- `tools/lib/cambios.ts` -- `CAMPOS_QUE_PINTA` (199-232), `CAMPOS_QUE_NO_FECHAN` (250-254, `ordenAlfabetico` sale de ahí), `relacionDeSuperficies` (338-465: declarar/componer, bajas de Cita 437-450). `tools/lib/avisar.ts:49` -- `FAMILIAS_DE_RUTA` (gana `'directorio'`); `tools/avisar.ts:465-555` -- reparto e informe del ensayo, que iteran esa tabla.
- Pruebas que tocan: `tests/unit/fecha-de-cambio.test.ts` (clasificación ~290-385; matriz 388+; caso 26.1 en 549-560), `tests/unit/indexnow.test.ts:165-169`, `tests/unit/superficies.test.ts:1127-1138` (línea base ≥2), `tests/unit/ingreso.test.ts:685`, `tests/unit/ingreso-construido.test.ts` (reproducibilidad 185-262; todo encendido 743-800), `tests/unit/publicable-y-alcanzable.test.ts` (alcance 320-328, familias 337-361, sitemap 501, 26.2 `tipoDeLaRuta` 563-566 y conjunto de tipos 615), `tests/unit/indexacion.test.ts:116-161`, `tests/unit/barra-final.test.ts:28-80`, `tests/unit/publicado.test.ts`, `tests/e2e/seo.spec.ts:125-233`, `tests/e2e/busqueda.spec.ts` (`buscar`/`resultados` 12-32), `tests/unit/ayuda/construir.ts` (`construirConCorpus`, `AUTOR_VALIDO` con clave, `fuenteConModeloEncendido`, `fuenteConTiendaDePrueba`).
- Datos reales: 171 Autores con clave; Cervantes `miguel-de-cervantes`, clave «Cervantes»; una clave con tilde, «Álvarez».

## Tasks & Acceptance

**Execution:**
- `src/lib/superficies.ts` -- la declaración, `rutaDelDirectorioDeAutores`, `TARJETA_DEL_DIRECTORIO_DE_AUTORES`, `PAGINAS_DE_DIRECTORIO = ['autores.astro']` y `esRutaDeDirectorio(rutaOUrl)` (por la declaración, como `esRutaDeObra`; la 26.4 añade `obras.astro`). Comentarios al día (línea base declarada por `/autores/`; `/obras/` en la 26.4).
- `src/lib/publicado.ts` -- `ordenAlfabetico?` en `Autor` y en `aplanarAutor` (omitido si falta); `rutasPublicadas` enumera `rutaDelDirectorioDeAutores()` siempre (página estática), con su docblock.
- `src/lib/atribucion.ts` -- `recuentoDeCitas(n)` («1 cita»/«n citas», que reemplaza las dos copias de `atribucion.ts:269` y `tarjeta.ts:277`); `hechosDeFilaDeAutor({ añoNacimiento?, añoFallecimiento? }, n)` → `{ años?: string; recuento: string }`, años solo si consta `añoFallecimiento` (por `añosDeAutor`); `descripcionDelDirectorioDeAutores(autores, citas)` → «{m} autores, de la A a la Z, con {n} citas publicadas.» con singulares; `SUPERFICIES_SIN_SEMBLANZA = [rutaDelDirectorioDeAutores(), TARJETA_DEL_DIRECTORIO_DE_AUTORES]` con docblock (AD-19, AD-28: no reproducen semblanza; distinta de `SUPERFICIES_DE_LA_SEMBLANZA`; la 26.4 añade `/obras/`).
- `src/lib/directorios.ts` (nuevo, puro, AD-5) -- `directorioDeAutores(autores, citas)` → `{ grupos: { inicial, ancla, autores: { slug, nombre, ruta, años?, recuento }[] }[]; autores: number; citas: number }`: publicados, ordenados por `compararPorClave({ clave: ordenAlfabetico, slug })`, agrupados por `inicialDeClave` en el orden resultante; `ancla` = `letra-` + inicial en minúscula («letra-ñ»). Lanza si un publicado no tiene clave o su clave no da inicial (nombra el slug y que lo para `integraciones/claves.ts`; propone `npx tsx tools/autor.ts proponer-claves`).
- `src/lib/marca.ts` -- `tituloDelDirectorioDeAutores()` → `tituloDe('Autores, de la A a la Z')`.
- `src/lib/tarjeta.ts` -- `datosDeTarjetaDelDirectorioDeAutores(m)` → `{ titulo: 'Autores', hechos: ['{m} autores' | '1 autor'], familiaDelTitulo: 'sans' }`; sin bajada ni prosa; usa `recuentoDeCitas` donde hoy copia «1 cita».
- `src/pages/tarjeta/directorio/autores.png.ts` (nuevo) -- `GET` como `portada.png.ts`, con `m` de `directorioDeAutores(await conjuntoPublicable())`.
- `src/components/LetrasDeSalto.astro` (nuevo, reutilizable por la 26.4) -- props `letras: { inicial, ancla }[]`, `entidades: string` («Autores»): `<nav id="letras" aria-label="Letras" tabindex="-1">` con `<ul role="list">` y por letra `<li><a href="#{ancla}"><span class="solo-para-lectores">{entidades} por la </span>{inicial}</a></li>`. Rejilla `repeat(auto-fill, minmax(var(--zona-de-toque), 1fr))`, `gap: var(--unidad)`; anclas cuadradas de 44 px, `--cuerpo-md` 600, `--siena`, sin subrayado ni caja; `li { position: relative }`; la `nav` con `scroll-margin-top: calc(var(--unidad) * 2)`.
- `src/components/GrupoDeLetra.astro` (nuevo, reutilizable) -- `Rotulo` `destino` con el `id` del ancla y la letra; `<slot/>` (la lista); cierre `<p class="volver"><a href="#letras">Volver a las letras</a></p>` en `--cuerpo-md`, `--siena`, subrayado, `display: inline-flex; min-height: var(--zona-de-toque); align-items: center`, a 2 × unidad. El grupo a 4 × unidad de las letras (el primero) y a 5 × del cierre anterior; la lista a 2 × del rótulo con filete superior.
- `src/components/FilaDeAutor.astro` (nuevo) -- `FilaDeBloque` con `href={rutaDeAutor(slug)}`, `zona="directorio"`, sin `avance`; dentro, `<span class="nombre">` (`--serif`, `--titular-sm`, 400, `--tinta`, `display:block`, `overflow-wrap: anywhere`), `<span class="solo-para-lectores">, </span>` y `<span class="hechos">` (`--pie`, `--tinta-apagada`, `tabular-nums`, `display:block`) con «{años}<span aria-hidden="true"> · </span><span class="solo-para-lectores">, </span>{recuento}» o solo el recuento.
- `src/pages/autores.astro` (nuevo) -- `Armazon` con `titulo={tituloDelDirectorioDeAutores()}`, `descripcion`, `tarjeta={TARJETA_DEL_DIRECTORIO_DE_AUTORES}`, `ruta={rutaDelDirectorioDeAutores()}`, `tipo="directorio"`; un `div.contenedor` dentro de `--medida-prosa`: `h1` «Autores» (`--sans`, `--titular-md`, 600, `--tinta`, margen 0, sin enlace ni bajada) y un `div data-pagefind-ignore="all"` con `LetrasDeSalto` (a 3 × unidad del `h1`; ahí insertará el campo la 26.6) y un `GrupoDeLetra` por grupo con su `<ul>` de `FilaDeAutor`. Docblock: qué es, por qué no hay filtro aún (26.6), sin Modelos.
- `src/lib/ingreso.ts` -- `SUPERFICIES_SIN_INGRESO` gana `'autores.astro'`, docblock al día.
- `tools/lib/avisar.ts` -- `FAMILIAS_DE_RUTA` gana `'directorio'` (familia de ruta del aviso; las series no cambian hasta la 26.7), comentario.
- `tools/lib/cambios.ts` -- `CAMPOS_QUE_PINTA.cita.directorio = ['autor']`, `.autor.directorio = [...CAMPOS_DEL_AUTOR_FUERA, 'ordenAlfabetico']`; `ordenAlfabetico` sale de `CAMPOS_QUE_NO_FECHAN` (queda `ordenRevisado`); `relacionDeSuperficies` declara `rutaDelDirectorioDeAutores()` con familia `directorio`, compone los ficheros de los Autores con alguna Cita en `corpus.citas` y todas las Citas, y en las bajas de Cita compone también el Directorio. Cabecera y docblocks al día (semblanza, tradición, biografía y `ordenRevisado` no lo fechan).
- `tests/unit/directorio-de-autores.test.ts` (nuevo) -- puro: la matriz de I/O (orden, Ñ, tilde, empate, sin Citas, años, «Fallecido en», sin años, sin clave lanza), singulares de descripción y Tarjeta, `SUPERFICIES_SIN_SEMBLANZA` exacta. Sobre `dist/` de una construcción con tres o más Autores (uno con «Ñ», uno sin nacimiento, uno sin Citas, semblanzas distintivas): una Fila por publicado y en orden; ninguna para el sin Citas; letras = iniciales con Autor, cada una con nombre accesible «Autores por la X» y su grupo `h2` con `tabindex="-1"` e `id` del ancla; «Volver a las letras» → `#letras` y la `nav` con `tabindex="-1"`; un único `h1` «Autores»; `<title>` exacto; meta exacta; `og:image` absoluta a la Tarjeta y el PNG 1200×630; canónica sin `noindex`; `/autores/` en el sitemap; no existe `autores/2/`; `data-pagefind-ignore="all"` envuelve letras y grupos dentro de `main` y el filtro es `tipo:directorio`; `data-vistas="vista-de-superficie"`; `data-zona="directorio"` en cada `li` de Fila; el `·` con `aria-hidden`; ninguna semblanza del corpus en las páginas de `SUPERFICIES_SIN_SEMBLANZA` y `datosDeTarjeta…` sin ella; «frases» en ningún texto de la página ni de la Tarjeta.
- `tests/unit/ingreso.test.ts` -- `SUPERFICIES_SIN_INGRESO` = `[AUTOR, 'autores.astro']`; admitir cualquier Modelo en `autores.astro` falla por la regla.
- `tests/unit/ingreso-construido.test.ts` -- en la reproducibilidad, exigir que la huella contenga `tarjeta/directorio/autores.png` y `autores/index.html` (las dos construcciones del mismo commit dan los mismos bytes); en el `describe` 17.5, una segunda construcción de la misma copia (mismo corpus, misma tienda, mismo `MEDICION_ENDPOINT`) sin encender ningún Modelo, y `/autores/index.html` idéntico byte a byte entre las dos.
- `tests/unit/fecha-de-cambio.test.ts` -- el caso 26.1 pasa a dos: solo `ordenAlfabetico` refecha y avisa solo `/autores`; solo `ordenRevisado`, nada. La matriz suma `/autores` donde ahora mueve (nombre o años de un Autor con Citas, alta/baja/cambio de `autor` de una Cita) y lo prueba ausente donde no (semblanza, tradición, texto de Cita, ficha de Obra). Clasificación verde.
- `tests/unit/indexnow.test.ts:165-169` -- seis familias de ruta, y la relación del ejemplo las produce.
- `tests/unit/superficies.test.ts` -- la línea base ≥2 exime `LINEA_BASE_DE_LOS_DIRECTORIOS` mientras solo la declare `/autores/`, con comentario «la 26.4 quita esta exención»; `esRutaDeDirectorio` (sí `/autores/`, no `/autor/x/` ni `/obras/`).
- `tests/unit/barra-final.test.ts` -- el constructor da `/autores/`, lo reconoce su superficie y es `producto`; `/autores/2` no está declarada.
- `tests/unit/publicable-y-alcanzable.test.ts` -- alcance: `/autores` eximida por su ruta con comentario (26.3-26.5, la 26.5 la quita; ninguna otra); `/autores` exigida entre las rutas construidas y en el sitemap; `tipoDeLaRuta` da `directorio` por `esRutaDeDirectorio`, y el conjunto de tipos vistos gana `directorio`.
- `tests/unit/indexacion.test.ts:116-161` -- el censo frente a `rutasPublicadas` exime `/autores/` por `esRutaDeDirectorio`, nunca por prefijo, y comprueba que no está en ninguna familia.
- `tests/unit/publicado.test.ts` y demás que enumeren `rutasPublicadas` o `aplanarAutor` exactos -- al día.
- `tests/e2e/seo.spec.ts` -- en «nada huérfano», `/autores/` eximida por su ruta (`rutaDelDirectorioDeAutores()`) con comentario 26.3-26.5.
- `tests/e2e/directorio-de-autores.spec.ts` (nuevo) -- con y sin JavaScript: pulsar una letra lleva el foco a su `h2`; «Volver a las letras» lo lleva a la `nav`; a 360 px seis letras por fila y todas a la vista sin desplazamiento horizontal de la rejilla; cada Fila, leída de la página servida (nunca de una lista fija), enlaza a `/autor/{slug}/` sin `target`, y el número de Filas es mayor que cero.
- `tests/e2e/busqueda.spec.ts` -- buscar «autores» devuelve `/autores/` con rótulo «Directorio»; buscar el nombre de un Autor leído de `/autores/` devuelve su Página de Autor y no `/autores/`.

**Acceptance Criteria:**
- Given el sitio construido, when se abre `/autores/`, then hay una Fila de Autor por cada Autor con Citas publicadas en el orden de `compararPorClave`, Cervantes bajo la C, y las letras y grupos solo de iniciales con Autor.
- Given la página sin JavaScript, when se pulsa una letra o «Volver a las letras», then el foco llega al `h2` del grupo o a la navegación «Letras».
- Given la declaración, when se construye, then `/autores/` está en el sitemap, sin `noindex`, con `data-pagefind-body`, emite `vista-de-superficie` y entra en el barrido; `integraciones/indexables.ts` no rompe; `/autores/2/` no existe.
- Given la búsqueda interna, when se busca «autores», then sale `/autores/` como «Directorio», y el nombre de un Autor devuelve su Página de Autor y no el Directorio.
- Given todos los Modelos admitidos encendidos frente a apagados, when se construyen con el mismo `MEDICION_ENDPOINT`, then `/autores/index.html` es idéntico byte a byte.
- Given un commit que solo escribe `ordenAlfabetico`, when se leen fecha y aviso, then mueven solo `/autores/`; uno que solo escribe `ordenRevisado` no mueve nada.
- Given el barrido de accesibilidad local, when corre, then `/autores/` entra por su declaración y pasa sin violaciones WCAG 2.2 AA.
- Given `npm run build`, `npm run check` y las pruebas por fichero tocadas, when corren en la rama, then pasan.

## Spec Change Log

## Review Triage Log

### 2026-10-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las capas de revisión son externas en este bucle (v8-ralph) y esta pasada no traía hallazgos: la revisión independiente viene después.

### 2026-10-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 11 (high 0, medium 1, low 10)
- defer: 0
- reject: 24 (high 0, medium 2, low 22)
- addressed_findings:
  - `[medium]` `[patch]` La Tarjeta del Directorio no se juzgaba construida (blind-hunter, verification-gap, ac-auditor, intent-alignment): `tests/unit/directorio-de-autores.test.ts` exige ahora que `dist/tarjeta/directorio/autores.png` sea byte a byte el rasterizado de `svgDeTarjetaDeListado(datosDeTarjetaDelDirectorioDeAutores(5))` —«5 autores», Ocampo sin Citas no cuenta—, y la comprobación de «sin semblanza ni frases» mira ese SVG y no una llamada inventada.
  - `[low]` `[patch]` La meta contaba Autores y Citas por su cuenta (AD-11): `descripcionDelDirectorioDeAutores` recibe las cifras de `directorioDeAutores`, y la página le pasa el mismo Directorio que pinta.
  - `[low]` `[patch]` «1 autor» se escribía en dos sitios: `recuentoDeAutores` en `src/lib/atribucion.ts`, único dueño para la meta y la Tarjeta.
  - `[low]` `[patch]` El agrupado confiaba en que orden e inicial nunca se contradigan: `directorioDeAutores` lanza, nombrando el Autor, si una inicial ya cerrada se reabre, en vez de publicar dos `id` iguales.
  - `[low]` `[patch]` `'autores.astro'` escrito a mano en `SUPERFICIES_SIN_INGRESO`: ahora entra por `...PAGINAS_DE_DIRECTORIO`, y la 26.4 no tiene que acordarse de dos listas.
  - `[low]` `[patch]` Las exenciones transitorias no caducaban solas: `publicable-y-alcanzable.test.ts` exige que `/autores/` siga siendo la única inalcanzable y `superficies.test.ts` que solo `autores.astro` declare «los Directorios»; las dos fallan el día que la exención sobra.
  - `[low]` `[patch]` AD-27 sin fijar para un Autor sin Citas ni para la biografía: `fecha-de-cambio.test.ts` prueba que clave, nombre o años de un Autor sin Citas publicadas no mueven `/autores/`, y que la biografía mueve solo la Página del Autor.
  - `[low]` `[patch]` El rastreo nombraba como portada una petición de `/autores/`: el informe dice «Sin familia —la portada y los Directorios no son de ninguna—», el docblock de `DestinoDePeticion` lo explica y `rastreo.test.ts` lo prueba.
  - `[low]` `[patch]` `fueraDelCenso` de `/autores/` solo por construcción: `trafico.test.ts` lo prueba con el censo real de un corpus (la demanda reparte con la misma `agregarPorFamilia`).
  - `[low]` `[patch]` `AGENTS.md` no decía que `/autores/` cae fuera de toda familia hasta la 26.7: una frase en «Leer el tráfico orgánico».
  - `[low]` `[patch]` Tipografía, color, subrayado y ritmo sin prueba: `tests/e2e/directorio-de-autores.spec.ts` los mide en el navegador contra sondas de los propios tokens (serif solo en el nombre, Inter en el `h1`, letras, hechos y «Volver»; siena y subrayado; rejilla a 1×, grupos a 4× y 5×, lista y «Volver» a 2×, `scroll-margin-top` 2×).

Rechazados, con su razón: el coste cuadrático de `citasDeAutor` (135 × 4.420 en el build, y contar aparte sería otro dueño del recuento); `Cache-Control … immutable` (el patrón de todas las Tarjetas, y el sitio estático no sirve esa cabecera); la reconstrucción de `dist/` en la 17.5 de `ingreso-construido` (las pruebas posteriores leen `paginas` en memoria); el Corpus vacío —página fina, meta con ceros, sin construir— (lo fija la matriz de I/O del intent, y el Corpus real nunca está vacío); JSON-LD propio (el intent lo prohíbe); separador de miles (convención del sitio entero); `font-weight`/`line-height` literales (`tokens.css` no declara pesos, y es lo que hacen los demás componentes); el orden del nombre accesible «Autores por la C» (lo prescribe el criterio); `aria-labelledby` en cada grupo (veintisiete regiones de más, y axe pasa); la redacción de la prueba de línea base (fixture de la 26.4); los años sin fallecimiento (lo fija el spec); el spec cerrado sin revisión y los tiempos agotados de `seo.spec.ts` (proceso, y esta es la revisión; el barrido pasa con `--workers=1`); el alcance del diff (informativo); el 500 de `astro dev` ante un Autor sin clave (el intent manda lanzar, y el mensaje da la orden); las balizas de vista y lectura en tiempo de ejecución (las cubre `receptor.spec.ts` para toda vista declarada; aquí se prueba `data-vistas`); `directorio` en `FAMILIAS_DE_RUTA` (decisión del spec: el aviso no es una serie); la exención de línea base como lectura de borde (prevista en el spec, y ahora caduca sola); el barrido axe sin prueba nueva (`accesibilidad.spec.ts` lo cubre por la declaración); `sprint-status.yaml` y las precondiciones en `review` (lo lleva el orquestador); el anillo de foco con teclado (regla global ya probada en la 2.8); Autor con todas sus Citas en `_revision/` y publicadas frente a documentadas (equivalen a «sin Citas» y a las 12 sin documentar de la prueba pura); las claves sin revisar (dato de la 26.10).

## Design Notes

**`directorio` como familia de ruta del aviso ya en la 26.3.** La relación de AD-27 exige una familia por superficie, y `/autores/` no es un Autor. Darle `directorio` en `FAMILIAS_DE_RUTA` (la tabla del aviso y del ensayo) no la mete en ninguna serie: indexación, tráfico, demanda, rastreo y canal siguen leyendo su censo, donde `/autores/` cae en `fueraDelCenso` hasta la 26.7, que muda las familias a `superficies.ts`. La alternativa —la familia `autor`— contaría el Directorio como Autor en el ensayo, que es lo que FR-40 prohíbe.

**Lo que pinta de una Cita es solo su Autor.** El Directorio cuenta Citas por Autor: un alta, una baja o un cambio de `autor` lo mueven; un cambio de texto no.

**Transitorios con fecha de caducidad:** la exención de alcance por ruta (Vitest y `seo.spec.ts`) la quita la 26.5; la de línea base ≥2 la quita la 26.4. Los dos llevan su comentario.

Fila de Autor (forma; tokens arriba):

```astro
<FilaDeBloque href={rutaDeAutor(a.slug)} zona="directorio"><span class="nombre">{a.nombre}</span><span class="solo-para-lectores">, </span><span class="hechos">{a.años !== undefined && (<>{a.años}<span aria-hidden="true"> · </span><span class="solo-para-lectores">, </span></>)}{a.recuento}</span></FilaDeBloque>
```

## Verification

**Commands:**
- `npx vitest run tests/unit/directorio-de-autores.test.ts` -- verde.
- `npx vitest run tests/unit/fecha-de-cambio.test.ts tests/unit/indexnow.test.ts tests/unit/superficies.test.ts tests/unit/barra-final.test.ts tests/unit/ingreso.test.ts tests/unit/indexacion.test.ts tests/unit/publicado.test.ts` -- verde (puras).
- `npx vitest run tests/unit/publicable-y-alcanzable.test.ts` y `npx vitest run tests/unit/ingreso-construido.test.ts` -- verde (construyen).
- `npm run build` y `npm run check` -- sin errores; `dist/sitemap-0.xml` contiene `/autores/` y existen `dist/autores/index.html` y `dist/tarjeta/directorio/autores.png`.
- `npm test` completo, desatendido con `correr.sh`/`esperar.pl` -- verde.
- Playwright local contra lo construido: `tests/e2e/directorio-de-autores.spec.ts`, `busqueda.spec.ts`, `seo.spec.ts` y `accesibilidad.spec.ts` (`--project=escritorio` y `--project=movil`) -- verde.

**Manual checks:**
- Abrir `/autores/` construido a 360 × 640: seis letras por fila, nombres en serif, hechos en una línea bajo cada nombre, «Volver a las letras» tras cada grupo.

## Auto Run Result

**Resumen.** `/autores/` existe: una página de producto declarada en `src/lib/superficies.ts` (constructor `rutaDelDirectorioDeAutores`, `TARJETA_DEL_DIRECTORIO_DE_AUTORES`, `PAGINAS_DE_DIRECTORIO`, `esRutaDeDirectorio`, vista de superficie y línea base «los Directorios»), que lista los Autores con Citas publicadas por la clave de orden de la 26.1, agrupados por inicial (Ñ propia, tildes fuera), con letras de salto que funcionan sin guion, «Volver a las letras», su Tarjeta Social de los Directorios, sin ningún Modelo de Ingreso y compuesta en la relación de AD-27 por lo que pinta. Sin campo de filtro, región de recuento ni guion (26.6).

**Ficheros.**
- `src/lib/superficies.ts` — declaración del Directorio de Autores, constructor, Tarjeta, `PAGINAS_DE_DIRECTORIO`, `esRutaDeDirectorio`; comentario de `lineaBase` al día.
- `src/lib/directorios.ts` (nuevo) — `directorioDeAutores` y `anclaDeLetra`: orden por `compararPorClave`, grupos por `inicialDeClave`, lanza ante un publicado sin clave.
- `src/lib/publicado.ts` — `Autor.ordenAlfabetico?`, `aplanarAutor` la copia; `rutasPublicadas` enumera `/autores/` siempre, tras los Autores.
- `src/lib/atribucion.ts` — `recuentoDeCitas`, `hechosDeFilaDeAutor`, `descripcionDelDirectorioDeAutores`, `SUPERFICIES_SIN_SEMBLANZA`; la Tarjeta de Obra usa `recuentoDeCitas`.
- `src/lib/tarjeta.ts` — `datosDeTarjetaDelDirectorioDeAutores`; `bajadaDeTarjetaDeObra` usa `recuentoDeCitas`.
- `src/lib/marca.ts` — `tituloDelDirectorioDeAutores`.
- `src/lib/ingreso.ts` — `SUPERFICIES_SIN_INGRESO` gana `autores.astro`; el mensaje del rechazo nombra la lista.
- `src/pages/autores.astro`, `src/pages/tarjeta/directorio/autores.png.ts` (nuevos) — la página y su Tarjeta.
- `src/components/LetrasDeSalto.astro`, `GrupoDeLetra.astro`, `FilaDeAutor.astro` (nuevos) — letras, grupo con rótulo destino y cierre, fila.
- `tools/lib/avisar.ts` — `FAMILIAS_DE_RUTA` gana `directorio` (solo aviso y ensayo).
- `tools/lib/cambios.ts` — `CAMPOS_QUE_PINTA` para `directorio` (Cita: `autor`; Autor: nombre, años y `ordenAlfabetico`); `ordenAlfabetico` sale de `CAMPOS_QUE_NO_FECHAN`; la relación declara y compone `/autores/`, también en las bajas de Cita.
- Pruebas: `tests/unit/directorio-de-autores.test.ts` y `tests/e2e/directorio-de-autores.spec.ts` (nuevas); al día `fecha-de-cambio`, `fecha-de-cambio-build`, `indexnow`, `avisar-rango`, `superficies`, `barra-final`, `ingreso`, `ingreso-construido`, `indexacion`, `publicado`, `publicable-y-alcanzable`, `linea-base`, `medicion` (unitarias) y `seo.spec.ts`, `busqueda.spec.ts` (e2e). Exención de alcance de `/autores/` por su ruta, con comentario, en `publicable-y-alcanzable.test.ts` y `seo.spec.ts` (la quita la 26.5); exención de línea base ≥2 para «los Directorios» en `superficies.test.ts` (la quita la 26.4).

**Revisión (primera pasada, sin hallazgos).** Parches aplicados: 0. Diferidos: 0. Rechazados: 0 (las capas son externas y esta pasada no traía hallazgos).

**Revisión (pasada 1 con las capas externas, 2026-10-28).** Parches aplicados: 11 (media 1, baja 10). Diferidos: 0. Rechazados: 24. Ficheros de esta pasada:
- `src/lib/atribucion.ts` — `recuentoDeAutores`; `descripcionDelDirectorioDeAutores` recibe las cifras del Directorio.
- `src/lib/tarjeta.ts` — la Tarjeta usa `recuentoDeAutores`.
- `src/lib/directorios.ts` — lanza si una inicial cerrada se reabre.
- `src/lib/ingreso.ts` — `SUPERFICIES_SIN_INGRESO` entra por `PAGINAS_DE_DIRECTORIO`.
- `src/pages/autores.astro` — la meta sale del mismo Directorio que pinta.
- `tools/lib/rastreo.ts` — «Sin familia —la portada y los Directorios no son de ninguna—» y su docblock.
- `AGENTS.md` — `/autores/` fuera de toda familia hasta la 26.7.
- Pruebas: `directorio-de-autores` (PNG construido byte a byte), `fecha-de-cambio` (Autor sin Citas, biografía), `publicable-y-alcanzable` y `superficies` (exenciones que caducan), `rastreo`, `trafico`, y `tests/e2e/directorio-de-autores.spec.ts` (tokens y ritmo).

**Revisión de seguimiento recomendada:** `true` — 11 parches en la pasada 1 (alta 0, media 1, baja 10); puntuación 3 × 1 + 1 × 10 = 13.

**Verificación de la pasada 1.**
- Puras: `fecha-de-cambio`, `indexnow`, `superficies`, `barra-final`, `ingreso`, `indexacion`, `publicado`, `linea-base`, `tarjeta` — 516/516; `rastreo` y `trafico` — 91/91.
- Construyen: `directorio-de-autores`, `publicable-y-alcanzable`, `ingreso-construido` — 98/98.
- `npm run check` — 0 errores, 0 avisos (8 pistas previas).
- `npm test` completo, desatendido — 141/141 ficheros, 6478/6478 pruebas.
- Playwright local contra lo construido (su `webServer` corre `npm run build`): `directorio-de-autores.spec.ts`, `busqueda.spec.ts` y `accesibilidad.spec.ts` con `--project=escritorio --project=movil` — 198 pasan, 2 omitidas; `seo.spec.ts` en los dos proyectos con `--workers=1` — 20/20.

**Verificación.**
- `npm run build` — EXIT 0; `dist/sitemap-0.xml` contiene `https://sabiduriadebolsillo.net/autores/`; existen `dist/autores/index.html` (135 Autores, meta «135 autores, de la A a la Z, con 4420 citas publicadas.») y `dist/tarjeta/directorio/autores.png`; `integraciones/indexables.ts` no rompe.
- `npm run check` — 0 errores, 0 avisos (8 pistas previas).
- `npx vitest run tests/unit/directorio-de-autores.test.ts` — 23/23.
- Puras: `fecha-de-cambio`, `indexnow`, `superficies`, `barra-final`, `ingreso`, `indexacion`, `publicado`, `linea-base` — verdes.
- Construyen: `publicable-y-alcanzable` (34/34) e `ingreso-construido` (40/40, con `/autores/` idéntico byte a byte encendido frente a apagado y en la huella de dos construcciones).
- `npm test` completo — 138/141 ficheros verdes a la primera; los 5 fallos (`avisar-rango` ×3, `fecha-de-cambio-build`, `medicion`) eran expectativas que no contaban `/autores/` o la familia `directorio`; corregidas, los tres ficheros vuelven a correr en verde (572/572).
- Playwright local contra lo construido, `--project=escritorio --project=movil`: `directorio-de-autores.spec.ts`, `busqueda.spec.ts` y `accesibilidad.spec.ts` verdes (incluido «nada huérfano» con la exención); `seo.spec.ts` dio 8 tiempos agotados en los barridos de todo el sitemap bajo carga paralela (problema conocido de esos barridos) y, repetido solo con `--workers=1`, 20/20.
- Comprobación manual a 360 × 640 (captura): seis letras por fila (A–F), nombres en serif, hechos en una línea bajo cada nombre, «Volver a las letras» tras cada grupo; `scrollWidth` 360.

**Matriz.** Cada fila la cubre `tests/unit/directorio-de-autores.test.ts` (orden por clave con Cervantes, Ñ, tilde, empate por slug, sin Citas, años, «Fallecido en», sin años en la función pura, sin clave lanza, Corpus vacío por la función pura y la descripción), y las de orden, Ñ, sin Citas y «Fallecido en» también sobre `dist/`.

**Riesgos residuales.**
- La fila «Corpus vacío» se prueba en lo puro (`directorioDeAutores` sin grupos y la meta con ceros); la página solo pinta las letras si hay grupos, pero no se construye un sitio con el Corpus vacío.
- La meta escribe las cifras sin separador de miles («4420 citas»), como las demás descripciones del sitio.
- Las claves de orden son las propuestas por la regla «última palabra del nombre» y aún sin revisar (26.10): hoy «Publio Terencio Africano» cae en la A. Es dato del Corpus, no de esta historia.
- El barrido de `seo.spec.ts` sobre todo el sitemap es sensible a la carga cuando corre en paralelo con otras pruebas.

