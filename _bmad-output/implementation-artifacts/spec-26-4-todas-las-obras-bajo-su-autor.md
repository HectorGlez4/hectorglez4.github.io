---
title: 'Todas las Obras, bajo su Autor'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_revision: 'bad5a77126a29981612864abbe8d0aa674391743'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-26-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Quien quiere saber qué obras tiene el sitio no tiene dónde recorrerlas: una Obra solo se alcanza desde una Cita suya, la Lista de Obras de su Autor o el buscador, que no ve las que no se indexan. Historia 26.4, `epics.md` líneas 7077-7183 (autoritativo).

**Approach:** Una página nueva, `/obras/`, declarada producto en `src/lib/superficies.ts` como segundo Directorio (misma línea base «los Directorios», mismo `esRutaDeDirectorio`), que agrupa por letra —la inicial de la clave del Autor— a cada Autor con Obras publicadas, en el orden del Directorio de Autores, con su cabecera de grupo enlazada y debajo la Lista de Obras de su Página de Autor, el mismo componente y el mismo orden; con su Tarjeta Social de los Directorios, sin ningún Modelo, compuesta en AD-27 por lo que pinta y con un aviso de build cuando su HTML pase de un tamaño con nombre. La Lista de Obras pasa a enseñar la unidad («27 citas») también en la Página de Autor.

## Boundaries & Constraints

**Always:**
- Reutilizar, nunca copiar, lo de la 26.3: `LetrasDeSalto.astro`, `GrupoDeLetra.astro`, `anclaDeLetra` y el orden/agrupado por `compararPorClave`/`inicialDeClave` (`src/lib/normalizar.ts`), extraído a un ayudante común de `src/lib/directorios.ts` que usen los dos Directorios. Ningún `localeCompare` sobre nombres de Autor.
- La lista = `obrasPublicadas` entera (también las `noindex` y con `CONGELACION_DE_OBRAS`), cada Obra una vez; las de cada Autor = `obrasDelAutor(conjunto.citas, slug).obras`, la misma llamada que la Página de Autor. Autor sin Obras: sin grupo; inicial sin Autor con Obras: sin letra.
- La Obra `noindex` va idéntica a las demás: ninguna clase, atributo, marca ni color que la distinga.
- Rutas solo por constructor (`rutaDelDirectorioDeObras()`, `rutaDeAutor`, `rutaDeLaObra`); barra final; enlaces en la misma pestaña.
- Tokens de `tokens.css`, ningún literal de color o tamaño. Serif solo en el nombre del Autor (`h3`); `h1`, letras, títulos de Obra, recuentos y «Volver a las letras» en Inter. Ningún glifo de avance («→» ni «›») en la página.
- Textos: singular obligatorio («1 obra», «1 autor», «1 cita», «1 cita publicada»); nunca «frases»; un dato ausente se omite sin separador; nada se recorta (NFR-12): el título parte palabras y el recuento baja bajo él, sin encogerse; sin `white-space: nowrap` en la Fila de Obra.
- Zona `directorio` en el `<ul>` de cada Lista de Obras de `/obras/` y en el `h3` de cada cabecera de grupo; `lista-de-obras` en la Página de Autor. Letras y «Volver a las letras» son anclas de la misma página (exentas).
- Sin JavaScript todo funciona.

**Block If:**
- Hacer pasar una prueba exigiría editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`, relajar un umbral, o eximir otra ruta que `/autores/` y `/obras/`.
- `/obras/` no sale idéntica byte a byte con todos los Modelos admitidos encendidos frente a apagados, o con congelación frente a sin ella, y la diferencia no se puede quitar sin tocar un Modelo construido o la regla de la congelación.

**Never:** campo de filtro, región `role="status"`, guion o `assetsInlineLimit` (26.6); familia `directorio` en las series de `tools/` (26.7); cabecera con «Obras» (26.5); paginar `/obras/`; JSON-LD propio; Citas, semblanzas, notas de Ficha de Obra, ediciones o traductores en la página o su Tarjeta; la línea «citas sin obra documentada» en `/obras/`; tocar `integraciones/cobertura.ts`, las fuentes de `astro.config.mjs` o la regla `esObraIndexable`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Agrupado | Séneca (clave «Séneca», 4 Obras), Epicteto (1 Obra), Machado (0 Obras) | Letras E y S; grupos E→Epicteto, S→Séneca; ni letra M ni grupo de Machado | — |
| Orden en el grupo | Séneca: Brevedad 45, Cartas 3, De la ira 3, Providencia 2 | Mismo orden que su Página de Autor: Brevedad, Cartas, De la ira, Providencia | — |
| Fila con año | Cartas a Lucilio, año 64, 3 Citas | «Cartas a Lucilio · 64» y «3 citas»; el lector oye «Cartas a Lucilio, 64, 3 citas» una vez | — |
| Año a. C. y singular | Enquiridión, −50, 1 Cita | «Enquiridión · 50 a. C.» y «1 cita» | — |
| Año discrepante | De la providencia, 62 y 63 | sin año ni «·» | — |
| `noindex` | Enquiridión (1 Cita) | Fila con el mismo marcado que una indexable salvo `href` y texto; su página sigue `noindex, follow` | — |
| Congelación | `CONGELACION_DE_OBRAS` con una lista | `/obras/` idéntico byte a byte al construido sin ella | — |
| Meta y Tarjeta | 5 Obras de 2 Autores, 54 Citas con Obra | «5 obras de 2 autores, con 54 citas publicadas.»; Tarjeta «Obras» / «5 obras» | — |
| Singulares | 1 Obra de 1 Autor con 1 Cita | «1 obra de 1 autor, con 1 cita publicada.»; Tarjeta «1 obra» | — |
| Corpus sin Obras | 0 Obras | `h1` solo; meta «0 obras de 0 autores, con 0 citas publicadas.» | se prueba en lo puro |
| Autor con Obras sin clave | `ordenAlfabetico` ausente | la función pura lanza nombrando el slug (lo para antes `integraciones/claves.ts`) | `throw` |
| HTML grande | `dist/obras/index.html` > `MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS` | el build avisa con el tamaño y «reabre paginar `/obras/`», y termina con 0 | si no existe el fichero, avisa que no pudo medir; nunca rompe |

</intent-contract>

## Code Map

- `src/lib/directorios.ts` -- `directorioDeAutores` (61-125): orden por `compararPorClave`, agrupado por `inicialDeClave`, lanza sin clave y si una inicial se reabre; `GrupoDeLetra<T>` con `entradas`; `anclaDeLetra`. Es lo que se extrae y reutiliza.
- `src/pages/autores.astro` -- patrón entero de la página (Armazon con `titulo`/`descripcion`/`tarjeta`/`ruta`/`tipo="directorio"`, `.prosa`, `h1`, `.listado` con `data-pagefind-ignore="all"` a 3 × unidad).
- `src/components/LetrasDeSalto.astro` (prop `entidades` → «{entidades} por la {letra}»), `GrupoDeLetra.astro` (`.grupo > :global(ul)` da margen y filete a una `ul` hija directa; «Volver a las letras» a 2 ×), `Rotulo.astro`.
- `src/components/ListaDeObras.astro` -- hoy pinta `<section class="obras-del-autor">` + `Rotulo` «Su obra en este Corpus» + `<ul class="lista-de-obras" data-zona={zona}>` + pie «… sin obra documentada»; recuento con la cifra `aria-hidden` y «, n citas»/«una cita» oculto; `.recuento` con `white-space: nowrap`; `.lista-de-obras` con `margin: 2×unidad 0 0`.
- `src/pages/autor/[slug]/[...page].astro:48,126` -- `obrasDelAutor(conjunto.citas, autor.slug)` y `<ListaDeObras obras sinObra zona="lista-de-obras">` solo en la página 1.
- `src/lib/publicado.ts` -- `rutasPublicadas` (697-708, `/autores/` tras los Autores), `obrasDeLasCitas` (723), `obrasDelAutor` (748-757, el orden a mudar), `obrasPublicadas` (783).
- `src/lib/obras.ts` -- `ObraResuelta` (704-737: `nombre`, `titulo`, `año?`, `recuento`, `nota?`, `ediciones?`), `rutaDeLaObra` (120).
- `src/lib/superficies.ts` -- `PAGINAS_DE_DIRECTORIO` (152-158), declaración del Directorio de Autores (228-239, patrón), `LINEA_BASE_DE_LOS_DIRECTORIOS` y su comentario (118-137), `rutaDelDirectorioDeAutores`/`TARJETA_DEL_DIRECTORIO_DE_AUTORES` (360-371), `esRutaDeObra` (497, `/obras` no casa), `esRutaDeDirectorio` (502-509).
- `src/lib/atribucion.ts` -- `SUPERFICIES_SIN_SEMBLANZA` (138-148), `recuentoDeCitas` (155), `recuentoDeAutores` (185), `descripcionDelDirectorioDeAutores` (190-201, con «1 cita publicada»), `añoLegible`.
- `src/lib/marca.ts:40-51` -- `NOMBRE_DEL_DIRECTORIO_DE_AUTORES`, `tituloDelDirectorioDeAutores` (`tituloDe`).
- `src/lib/tarjeta.ts:300-315` -- `datosDeTarjetaDelDirectorioDeAutores` y `svgDeTarjetaDeListado`; `src/pages/tarjeta/directorio/autores.png.ts` -- patrón del PNG.
- `src/lib/ingreso.ts:199-208` -- `SUPERFICIES_SIN_INGRESO = [AUTOR, ...PAGINAS_DE_DIRECTORIO]`: `obras.astro` entra solo con añadirla a `PAGINAS_DE_DIRECTORIO`.
- `src/lib/umbrales.ts` -- sitio del nuevo tope (junto a los de peso, 494-543).
- `tools/lib/cambios.ts` -- cabecera (48-52), `CAMPOS_QUE_PINTA` (216-251, indexada por `FamiliaDeRuta`; columna `directorio` = la de `/autores/`), `CAMPOS_QUE_NO_FECHAN` (267-271), `relacionDeSuperficies`: `declarar`/`componer` (402-416, `componer` busca la columna por `superficie.familia`), `fichasDeLaCita` (393-399, viva y de baja), Directorio de Autores (461-470), bajas de Cita (490-506).
- `integraciones/indexables.ts` / `integraciones/cobertura.ts` -- patrón de `astro:build:done` con `dir` y `logger`; `astro.config.mjs:69-` lista de integraciones.
- Pruebas: `tests/unit/lista-de-obras.test.ts` (corpus Séneca/Epicteto/Machado 123-195 reutilizable; textos y lector 225-245), `tests/unit/directorio-de-autores.test.ts` (patrón y `SUPERFICIES_SIN_SEMBLANZA` exacta), `tests/unit/obra-pagina.test.ts:1189-1205` (copia con congelación vía `ficheros: { 'src/lib/umbrales.ts' }`), `tests/unit/ingreso-construido.test.ts` (huella 269; 17.5 con ficha con ediciones 761-830), `tests/unit/fecha-de-cambio.test.ts` (550-628, 665, 727), `tests/unit/superficies.test.ts` (1140-1150 exención que se quita; 1156-1174), `tests/unit/publicable-y-alcanzable.test.ts` (324-325, 366, 526, 587), `tests/unit/indexacion.test.ts:159-165`, `tests/unit/barra-final.test.ts:36-44,86`, `tests/unit/publicado.test.ts:126-130`, `tests/unit/medicion.test.ts:2275-2279` (barrido de 9), `tests/unit/indexnow.test.ts:373,553`, `tests/unit/avisar-rango.test.ts:291,371`, `tests/unit/fecha-de-cambio-build.test.ts:91,384`, `tests/unit/rastreo.test.ts:416`, `tests/unit/trafico.test.ts:402`, `tests/unit/demanda.test.ts:300`, `tests/e2e/seo.spec.ts:165`, `tests/e2e/busqueda.spec.ts:640-670`, `tests/e2e/directorio-de-autores.spec.ts` (patrón de sondas de tokens), `tests/e2e/pagina-de-autor.spec.ts:126-158`.
- `AGENTS.md:200,232,285,403,444`, `tools/lib/rastreo.ts:408`, `tools/lib/canal.ts:325` -- textos que nombran solo `/autores/` como Directorio sin familia.

## Tasks & Acceptance

**Execution:**
- `src/lib/obras.ts` -- `ordenDeLaListaDeObras(obras)` (copia ordenada: recuento descendente, `titulo` con `localeCompare('es')`, `nombre`), con docblock AD-25 (único dueño del orden de la Lista de Obras).
- `src/lib/publicado.ts` -- `obrasDelAutor` ordena con `ordenDeLaListaDeObras` y el módulo la reexporta; `rutasPublicadas` enumera `rutaDelDirectorioDeObras()` justo tras `rutaDelDirectorioDeAutores()`, siempre.
- `src/lib/superficies.ts` -- `PAGINA_DEL_DIRECTORIO_DE_OBRAS = 'obras.astro'` en `PAGINAS_DE_DIRECTORIO`; declaración «el Directorio de Obras» (`reconoce: /^\/obras$/`, `producto`, `vista: EVENTOS.vistaDeSuperficie`, `lineaBase: LINEA_BASE_DE_LOS_DIRECTORIOS`, sin `noPublicableEn`); `rutaDelDirectorioDeObras()` → `'/obras/'`; `TARJETA_DEL_DIRECTORIO_DE_OBRAS = '/tarjeta/directorio/obras.png'`; comentarios de 26.4 al día.
- `src/lib/directorios.ts` -- extraer `agruparPorClave<T>(autores, fila)` (ordenar, agrupar, las dos excepciones) y reescribir `directorioDeAutores` sobre él sin cambiar su salida; `directorioDeObras(autores, citas)` → `{ grupos: GrupoDeLetra<{ slug, nombre, ruta, obras: ObraResuelta[] }>[]; obras; autores; citas }` sobre los `autoresPublicados` con `obrasDelAutor(citas, slug).obras` no vacío; `citas` = suma de `recuento` de las Obras listadas.
- `src/lib/atribucion.ts` -- `recuentoDeObras(k)`; `descripcionDelDirectorioDeObras({ obras, autores, citas })` → «{k} obras de {m} autores, con {n} citas publicadas.» con singulares (reusar la concordancia de «cita publicada» de la de Autores); `SUPERFICIES_SIN_SEMBLANZA` gana `rutaDelDirectorioDeObras()` y `TARJETA_DEL_DIRECTORIO_DE_OBRAS`.
- `src/lib/marca.ts` -- `NOMBRE_DEL_DIRECTORIO_DE_OBRAS = 'Obras'`; `tituloDelDirectorioDeObras()` → `tituloDe('Obras, por autor')`.
- `src/lib/tarjeta.ts` + `src/pages/tarjeta/directorio/obras.png.ts` (nuevo) -- `datosDeTarjetaDelDirectorioDeObras(k)` → `{ titulo: NOMBRE_DEL_DIRECTORIO_DE_OBRAS, hechos: [recuentoDeObras(k)], familiaDelTitulo: 'sans' }`; el PNG como el de Autores, con `k` de `directorioDeObras`.
- `src/components/ListaDeObras.astro` -- pasa a pintar solo la `<ul class="lista-de-obras" data-zona={zona}>` (props `obras`, `zona`), con `margin: 0` y docblock de sus dos usos; recuento visible `recuentoDeCitas(n)` precedido de `<span class="oculto">, </span>` (se oye una vez); fila `flex-wrap: wrap`, título `flex: 1 1 0%` con `overflow-wrap: break-word` y sin `min-width: 0`, recuento `flex: none` sin `nowrap`.
- `src/pages/autor/[slug]/[...page].astro` -- recibe la `<section class="obras-del-autor" aria-labelledby="su-obra" data-pagefind-ignore>`, el `Rotulo` y el pie «… sin obra documentada» (lógica y estilos movidos tal cual), con la lista a 2 × unidad (`.obras-del-autor > :global(.lista-de-obras)`).
- `src/pages/obras.astro` (nuevo) -- como `autores.astro`: `h1` `NOMBRE_DEL_DIRECTORIO_DE_OBRAS`; en `.listado` (`data-pagefind-ignore="all"`) `LetrasDeSalto entidades="Obras de autores"` y por grupo `GrupoDeLetra` con, por Autor, `<section class="autor">` → `<h3 data-zona="directorio"><a href={ruta}>{nombre}</a></h3>` + `<ListaDeObras obras zona="directorio" />`. Estilos: `h3` margen 0, `--serif`, `--titular-sm`, 600; `h3 a` `display:flex; align-items:center; min-height: var(--zona-de-toque)`, `--tinta`, subrayado; lista a `--unidad` del bloque; `.autor` a 4 × unidad y el primero de su grupo a 2 × del rótulo. Docblock.
- `src/lib/umbrales.ts` + `integraciones/directorios.ts` (nuevo) + `astro.config.mjs` -- `MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS` (medido en este diff sobre `npm run build`, +25 % redondeado arriba a 10 KiB; la medida va en el mensaje del commit); función pura `avisoDelDirectorioDeObras(bytes | undefined)` y una integración que en `astro:build:done` lo mide y `logger.warn` sin lanzar; registrada en la lista de integraciones con su comentario (sin tocar fuentes ni cobertura).
- `tools/lib/cambios.ts` -- la tabla pasa a columnas por superficie: `directorio` se desdobla en `directorioDeAutores` (lo de hoy) y `directorioDeObras` (cita: `autor`, `procedencia`; autor: `nombre`, `ordenAlfabetico`; obra: `titulo`, `formas`); `declarar(ruta, familia, columna = familia)`; declarar `/obras/` con familia `directorio` y componerla con cada Cita, cada ficha de `fichasDeLaCita` y el fichero del Autor de cada Cita con `obra`; las bajas de Cita la componen. Cabecera y docblocks al día (`nota`, `ediciones`, `distintaDe`, `ordenRevisado`, años y semblanza no la fechan).
- `AGENTS.md`, `tools/lib/rastreo.ts`, `tools/lib/canal.ts` -- donde dice `/autores/`, «los Directorios (`/autores/` y `/obras/`)».
- `tests/unit/directorio-de-obras.test.ts` (nuevo) -- puro: la matriz (agrupado, orden igual a `obrasDelAutor`, singulares de meta y Tarjeta, sin clave lanza, sin Obras, aviso de tamaño por encima/debajo/sin fichero, `ordenDeLaListaDeObras`). Sobre `dist/` (corpus de `lista-de-obras.test.ts` más una `nota` en una ficha y semblanzas distintivas) y una segunda construcción con congelación: conjunto de `href` de Fila = `obrasPublicadas`, sin repetir; por Autor, la secuencia de su Página de Autor = la de su grupo; letras «Obras de autores por la X», `h2` letra y `h3` Autor con `data-zona="directorio"`, `ul` con `data-zona="directorio"`; fila `noindex` con el mismo marcado salvo `href` y texto; `/obras/` idéntico con y sin congelación; `<title>`, meta, `og:image` y PNG byte a byte del SVG; un `h1` «Obras»; sitemap, canónica sin `noindex`, `data-vistas`, `tipo:directorio`, `data-pagefind-ignore="all"`; ni Cita, ni semblanza, ni `nota`, ni «frases», ni glifo de avance.
- `tests/unit/lista-de-obras.test.ts` -- textos y lector con la unidad («· 49 45 citas» / «…, 49, 45 citas»; «1 cita»); la sección sigue en la Página de Autor.
- `tests/unit/ingreso-construido.test.ts` -- huella con `obras/index.html` y `tarjeta/directorio/obras.png`; en 17.5, `obras/index.html` idéntico encendido/apagado y sin la URL de la edición de prueba.
- `tests/unit/fecha-de-cambio.test.ts` -- solo claves → `['/autores', '/obras']`; solo `ordenRevisado` → nada; `/obras` se mueve por título/`formas` de ficha, `procedencia`/`autor` de Cita y nombre de Autor con Obras, y no por años, semblanza, `nota`, `ediciones`, `distintaDe` ni Autor sin Obras; matrices de alta/baja al día. Clasificación verde.
- Demás pruebas del Code Map -- al día: línea base sin exención (las dos la declaran), `esRutaDeDirectorio('/obras/')` verdadero y `PAGINAS_DE_DIRECTORIO` de dos, `esRutaDeObra('/obras/')` falso, barra final, `rutasPublicadas`, barrido de 10, exención de alcance por ruta de `/autores/` y `/obras/` (comentario 26.4-26.5; exige que sean exactamente esas), indexación/tráfico/demanda/rastreo/canal con `/obras/` fuera de toda familia (rastreo la admite con congelación), indexnow y aviso con `/obras/`.
- `tests/e2e/directorio-de-obras.spec.ts` (nuevo), `busqueda.spec.ts`, `seo.spec.ts` -- con y sin JS, letra → foco en su `h2`, «Volver» → `nav`; `h3 a` 44 px, primera Fila a 8 px, Autores a 32 px; serif solo en el `h3`; a 320 px el título más largo leído de la página parte línea, el recuento queda en una línea y sin encogerse y no hay desplazamiento horizontal; filas leídas de la página, `> 0`, sin `target`; búsqueda de «obras» da `/obras/` como «Directorio» y la del título de una Obra indexable da su Página de Obra, nunca `/obras/`; `seo.spec.ts` exime las dos rutas.

**Acceptance Criteria:**
- Given el sitio construido, when se abre `/obras/`, then están todas las Obras de `obrasPublicadas` una vez, bajo su Autor, en el orden del Directorio de Autores, y cada grupo de Autor repite la secuencia de su Página de Autor.
- Given la Página de Autor construida, when se lee su Lista de Obras, then cada fila enseña «N citas»/«1 cita» y el lector oye el recuento una vez.
- Given la declaración, when se construye, then `/obras/` está en el sitemap, sin `noindex`, con `data-pagefind-body`, emite `vista-de-superficie`, comparte «los Directorios», no existe `/obras/2/` e `integraciones/indexables.ts` no rompe.
- Given todos los Modelos admitidos encendidos frente a apagados (mismo `MEDICION_ENDPOINT`), when se construyen, then `/obras/index.html` es idéntico byte a byte y no lleva enlace de edición.
- Given un commit que solo escribe `ordenAlfabetico`, when se leen fecha y aviso, then mueven `/autores/` y `/obras/` y nada más; solo `ordenRevisado`, nada.
- Given el barrido local, when corre, then `/obras/` entra por su declaración y pasa WCAG 2.2 AA.
- Given `npm run build`, `npm run check` y las pruebas tocadas, when corren en la rama, then pasan, y el build informa el tamaño de `/obras/` sin aviso.

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

Las cinco capas (blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor) son externas en el bucle v8-ralph y no traían hallazgos en esta pasada: la revisión independiente viene después.

## Design Notes

**Columnas de la tabla, no familias.** `CAMPOS_QUE_PINTA` se indexaba por `FamiliaDeRuta`, y los dos Directorios son la misma familia (`directorio`, la que medirá la 26.7) pero pintan cosas distintas: `/autores/` los años, `/obras/` no; `/obras/` el título de ficha y la Procedencia, `/autores/` no. La familia sigue siendo `directorio` para el aviso y el ensayo; solo la columna de la tabla se desdobla. `formas` de una ficha entra porque decide qué Citas cuentan en cada Obra (el recuento); `procedencia` de una Cita, porque da su Obra y el año.

**`{n}` de la meta son las Citas de las Obras listadas**, la suma de los recuentos que la página pinta (AD-11: la meta sale del mismo Directorio que pinta), no las 4.420 publicadas: las Citas sin Obra no figuran en `/obras/`.

**La Lista de Obras se reparte.** El componente es la lista (lo común a los dos usos); el rótulo «Su obra en este Corpus» y la línea «sin obra documentada» son de la Página de Autor y se van a ella. El espacio sobre la lista lo pone su contenedor.

**El aviso de tamaño es una integración propia** porque AD-9 lo quiere en `astro:build:done` y no es asunto de indexables ni de cobertura; registrarla en `astro.config.mjs` no toca fuentes ni la puerta tipográfica.

**Transitorios:** la exención de alcance por ruta (Vitest y `seo.spec.ts`) cubre ya `/autores/` y `/obras/` y la quita la 26.5; la de línea base ≥ 2 desaparece aquí.

```astro
<section class="autor"><h3 data-zona="directorio"><a href={autor.ruta}>{autor.nombre}</a></h3><ListaDeObras obras={autor.obras} zona="directorio" /></section>
```

## Verification

**Commands:**
- `npx vitest run tests/unit/directorio-de-obras.test.ts` y `npx vitest run tests/unit/lista-de-obras.test.ts` -- verdes.
- `npx vitest run tests/unit/fecha-de-cambio.test.ts tests/unit/indexnow.test.ts tests/unit/superficies.test.ts tests/unit/barra-final.test.ts tests/unit/ingreso.test.ts tests/unit/indexacion.test.ts tests/unit/publicado.test.ts tests/unit/rastreo.test.ts tests/unit/trafico.test.ts tests/unit/demanda.test.ts tests/unit/linea-base.test.ts` -- verdes.
- `npx vitest run tests/unit/directorio-de-autores.test.ts`, `tests/unit/publicable-y-alcanzable.test.ts`, `tests/unit/ingreso-construido.test.ts`, `tests/unit/medicion.test.ts` -- verdes (construyen).
- `npm run build` y `npm run check` -- sin errores; `dist/sitemap-0.xml` contiene `/obras/`; existen `dist/obras/index.html` y `dist/tarjeta/directorio/obras.png`; sin aviso de tamaño.
- `npm test` completo, desatendido con `correr.sh`/`esperar.pl` -- verde.
- Playwright local contra lo construido, `--project=escritorio --project=movil` (`seo.spec.ts` con `--workers=1`): `directorio-de-obras.spec.ts`, `directorio-de-autores.spec.ts`, `pagina-de-autor.spec.ts`, `busqueda.spec.ts`, `seo.spec.ts`, `accesibilidad.spec.ts` -- verdes.

**Manual checks:**
- `/obras/` construido a 360 × 640: letras en rejilla, Autor en serif subrayado, Obras con «N citas» a la derecha, «Volver a las letras» tras cada grupo; `/autor/miguel-de-unamuno/` con la unidad visible.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** `/obras/` es el segundo Directorio: declarado producto en `src/lib/superficies.ts` (`obras.astro` en `PAGINAS_DE_DIRECTORIO`, línea base «los Directorios», sin 2+), con toda Obra de `obrasPublicadas` una vez bajo su Autor —también las `noindex` y con congelación, sin marca que las distinga—, los Autores en el orden del Directorio de Autores (`agruparPorClave`, extraído de `directorioDeAutores`) y sus Obras en el de su Página de Autor (`obrasDelAutor`, que ordena con `ordenDeLaListaDeObras` de `src/lib/obras.ts`). La Lista de Obras enseña la unidad también en la Página de Autor. El código va en `e3ebafb838`.

**Ficheros.**
- `src/lib/obras.ts` — `ordenDeLaListaDeObras`, único dueño del orden (AD-25).
- `src/lib/publicado.ts` — `obrasDelAutor` lo usa y se reexporta; `rutasPublicadas` enumera `/obras/` tras `/autores/`.
- `src/lib/superficies.ts` — declaración «el Directorio de Obras», `rutaDelDirectorioDeObras`, `TARJETA_DEL_DIRECTORIO_DE_OBRAS`.
- `src/lib/directorios.ts` — `agruparPorClave` común; `directorioDeObras`.
- `src/lib/atribucion.ts` — `recuentoDeObras`, `descripcionDelDirectorioDeObras`, `SUPERFICIES_SIN_SEMBLANZA` con `/obras/` y su Tarjeta.
- `src/lib/marca.ts`, `src/lib/tarjeta.ts`, `src/pages/tarjeta/directorio/obras.png.ts` — nombre, título y Tarjeta Social «Obras» / «{k} obras».
- `src/components/ListaDeObras.astro` — solo la lista, con «N citas» visible y el recuento oído una vez; sin `nowrap`, el recuento baja de línea.
- `src/pages/autor/[slug]/[...page].astro` — recibe la sección, el rótulo y la línea «sin obra documentada».
- `src/pages/obras.astro` — la página.
- `src/lib/umbrales.ts`, `integraciones/directorios.ts`, `astro.config.mjs` — `MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS` = 290 KiB (230.455 bytes medidos + 25 %, redondeado a 10 KiB) y el aviso en `astro:build:done`, que nunca rompe.
- `tools/lib/cambios.ts` — columnas `directorioDeAutores` / `directorioDeObras`; `/obras/` compuesta por Citas, fichas y Autores con Obras; bajas de Cita.
- `AGENTS.md`, `tools/lib/rastreo.ts`, `tools/lib/canal.ts` — «los Directorios (`/autores/` y `/obras/`)».
- Pruebas: `tests/unit/directorio-de-obras.test.ts` y `tests/e2e/directorio-de-obras.spec.ts` nuevas; al día las del Code Map. `tests/e2e/accesibilidad.spec.ts` pone `test.slow()` en la prueba de foco del barrido (tabula ~700 enfocables de `/obras/`; 29,4 s en escritorio y >30 s en móvil sin ello): presupuesto de prueba, no umbral de producto.

**Hallazgos de revisión.** Ninguno en esta pasada (capas externas sin hallazgos): 0 parches, 0 aplazados, 0 rechazados. Recomendación de revisión de seguimiento: `false` (0 parches; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/directorio-de-obras.test.ts tests/unit/lista-de-obras.test.ts` — 49 verdes.
- `npx vitest run` de fecha-de-cambio, indexnow, superficies, barra-final, ingreso, indexacion, publicado, rastreo, trafico, demanda, linea-base y avisar-rango — 655 verdes.
- `npx vitest run` de directorio-de-autores, publicable-y-alcanzable, ingreso-construido, medicion y fecha-de-cambio-build — 647 verdes.
- `npm run build` — sale 0; «El Directorio de Obras pesa 230455 bytes, dentro de MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS (296960)», sin aviso; «517 Obras publicadas, 277 indexables» y coincidencia de sitemap/`noindex`/Pagefind; `dist/sitemap-0.xml` trae `/obras/`; existen `dist/obras/index.html` y `dist/tarjeta/directorio/obras.png`.
- `npm run check` — 0 errores, 0 avisos.
- `npm test` completo — 142 ficheros, 6.530 pruebas verdes (811 s).
- Playwright local `--project=escritorio --project=movil`: directorio-de-obras, directorio-de-autores, busqueda, seo (`--workers=1`, 20 verdes) y, tras corregir la lectura del recuento visible y el presupuesto de la prueba de foco, pagina-de-autor y accesibilidad (174 verdes; `/obras` pasa axe WCAG 2.2 AA en los dos proyectos).
- Comprobación manual a 360 × 640 sobre lo construido: letras en rejilla, Autor en serif subrayado, Obras con «N citas» a la derecha, «Volver a las letras» tras cada grupo; `/autor/miguel-de-unamuno/` con la unidad visible.

**Matriz.** Cada fila la cubre `tests/unit/directorio-de-obras.test.ts` (puro y sobre `dist/`, con una segunda construcción congelada), y la de la Página de Autor `tests/unit/lista-de-obras.test.ts`; todas corrieron en `npm test`.

**Riesgos residuales.** `/obras/` crece con cada Obra: hoy 230 KB, el aviso salta hacia las ~660 Obras. La prueba de foco del barrido tarda ~30 s y vive de `test.slow()`. Las exenciones de alcance por ruta (`/autores/`, `/obras/`) siguen hasta la 26.5.
