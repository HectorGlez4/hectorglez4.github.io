---
title: 'Historia 30.4 — «Inserta esta cita»'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_revision: '33b27cebb5f5e8d698a8642afbe837ba456c6711'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-30-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-30-3-como-citar-en-la-pagina-de-cita.md'
warnings: [oversized]
deferred:
  - summary: 'Al fundir la Épica 29 en la rama: los saltos de verso del Fragmento como `<br>` por `versosDe`. `fragmentoParaInsertar` escapa hoy `cita.texto` entero en un solo `<p>`; al fundir, el párrafo pasa a `versosDe(cita.texto).map(escapar).join(''<br>'')` y la tabla de Vitest gana su fila «en verso» (y la prueba de `dist/` lee los `<br>` como saltos).'
    evidence: 'src/lib/verso.ts (29.3) está en v9/epica-29 y no en v9/epica-30; AD-29 prohíbe una partición local por U+000A. Ninguna Cita del Corpus de la rama lleva U+000A en `texto` (0 de 4.424, comprobado el 2026-11-08), así que hoy no se publica ningún Fragmento que pierda un verso.'
    severity: medium
  - summary: 'Pendiente de Héctor (revisión del spec): el marcado literal del Fragmento —dos `<p>` en un `blockquote`, el texto sin comillas, «— {Autor}, <cite>{Obra}</cite>. » y el enlace con `MARCA`— y la distancia de 2 × unidad hasta «Copiar el fragmento» son supuestos de este spec (Design Notes), fijados por la tabla de Vitest; cambiarlos es cambiar la tabla y `atribucion.ts`, nada más.'
    evidence: 'AC de la 30.4: «el marcado exacto … lo fija Vitest con ejemplos literales [ASSUMPTION] que Héctor revisa en el spec»; UX-DR120 «a 2 × {spacing.unit} [ASSUMPTION]».'
    severity: low
---

<intent-contract>

## Intent

**Problem:** Quien quiere poner una Cita en su blog no tiene nada que pegar: tiene que componer a mano un HTML con el texto, el Autor, la Obra y el enlace de vuelta, y suele perder la atribución o el enlace (FR-57, UJ-7).

**Approach:** Tras «Cómo citar», en el mismo bloque de desplegables de la Página de Cita, el Desplegable «Inserta esta cita» (`Desplegable.astro`) con `InsertaEstaCita.astro`: su `<label>`, un `<textarea readonly>` con el Fragmento que compone solo `fragmentoParaInsertar` de `src/lib/atribucion.ts` y un botón «Copiar el fragmento» `hidden` que enseña y atiende la misma isla de Copiar de la 30.3, generalizada por atributos neutros y sin un segundo guion.

## Boundaries & Constraints

**Always:**
- Composición solo en `src/lib/atribucion.ts` (AD-28): `fragmentoParaInsertar(cita, autor, canonica): string`, con el marcado literal de Design Notes. Datos: `cita.texto` entero y literal (sin comillas añadidas, también por encima de `MAX_CARACTERES_IMAGEN`); el nombre por `nombreEnAtribucion(autor)` —función nueva, la que pinta el nombre en la Atribución: `Atribucion.astro` pasa a usarla (salida idéntica) para que la 35.4 ponga ahí el Personaje—; `cita.obra?.titulo` en `<cite>` si hay Obra, y nada si no; `MARCA` como texto del enlace; `canonica` en el `href`. Nada más: sin año, traductor, edición, Fuente ni `procedencia.obra`. Todo texto y el `href` escapados con `escapar` de `src/lib/lienzo.ts` (`&`, `<`, `>`, `"`). `fragmentoParaInsertar` lanza si `canonica` no es URL absoluta `http(s)` o lleva `?…` o `#…` (nunca `?de=`/`?via=`).
- Resultado: un solo `blockquote` raíz, sin `script`, `img`, `iframe`, `link`, `style`, atributo `class` ni `style`, ni recurso del sitio; su único enlace es la canónica.
- `src/components/InsertaEstaCita.astro` recibe `fragmento: string` ya compuesto y no compone nada. Marcado: `<div class="inserta" data-inserta-esta-cita data-copiables>`; `<label for="fragmento-para-insertar">Pega este fragmento en tu página: lleva la cita, su autor y el enlace a esta página.</label>` (`--pie`, `--interlineado-pie`, `--tinta-apagada`, `--sans`, bloque); a 1 × unidad `<textarea id="fragmento-para-insertar" data-copiable readonly rows="6" spellcheck="false">{fragmento}</textarea>` escrito en una sola línea de marcado (sin espacio ni salto entre las etiquetas y `{fragmento}`), en `--mono`, `--codigo`, `--interlineado-codigo`, `--peso-regular`, `--tinta` sobre `--contenedor-bajo`, borde `--grosor-filete` `--contorno`, radio `--radio`, relleno `--unidad`, `inline-size: 100%`, `max-inline-size: var(--medida-prosa)`, `overflow-wrap: anywhere`, `resize: vertical`, sin desplazamiento horizontal a 320 px; a 2 × unidad el botón secundario `<button type="button" class="copiar-fragmento" data-copiar-texto aria-label="Copiar el fragmento" hidden><span data-etiqueta>Copiar el fragmento</span></button>` con el trato de `.copiar-referencia`; y `<p class="solo-para-lectores" role="status" data-anuncio></p>` vacía y sin `hidden`. Solo tokens; sin `data-zona` (no hay `<a>` en la página: el enlace es texto del campo).
- La isla (`src/islands/CopiarCita.astro`): el mismo guion, idéntico byte a byte en toda Página de Cita y sin contenido, recorre bloques por atributos neutros: `[data-copiables]:not([data-listo])` en lugar de `[data-como-citar]…`, botones `[data-copiar-texto]` en lugar de `[data-copiar-referencia]`, y copia el `textContent` de `b.parentNode.querySelector('[data-copiable]')` en lugar de `[data-referencia]`. `ComoCitar.astro` conserva `data-como-citar` y `data-referencia` (identidad para las pruebas) y gana `data-copiables` (bloque) y `data-copiable` (cada `<p>` de Referencia); su botón cambia `data-copiar-referencia` por `data-copiar-texto`. El comportamiento de «Cómo citar» no cambia. Sin `__medir` nuevo (es de la 30.5).
- `src/pages/cita/[slug].astro`: el bloque `div.desplegables` pasa a pintarse siempre (el Fragmento existe para toda Cita); dentro, `{citaTieneComoCitar(cita) && <Desplegable rotulo="Cómo citar">…}` como hoy y detrás, el último, `<Desplegable rotulo="Inserta esta cita"><InsertaEstaCita fragmento={fragmentoParaInsertar(cita, autor, canonica)} /></Desplegable>`. Bajo `data-pagefind-ignore="all"`, fuera del JSON-LD.
- `src/styles/tokens.css`: gana `--mono: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;` junto a `--serif`/`--sans` (sin `@font-face` ni fichero); el comentario de `--codigo` dice «solo el campo del Fragmento» (hoy dice «y la Referencia», que no la usa). `--codigo` e `--interlineado-codigo` ya existen.
- Guion: medir la Página de Cita con Imagen y la medición puesta (`tests/unit/medicion.test.ts`, «la Página de Cita no pierde su listón»); se espera igual o menos que ~7.334 bytes (los selectores neutros son más cortos). Si pasa de `MAX_BYTES_DE_GUION` (7.680), el tope sube en el mismo diff con la cifra medida en su comentario de `umbrales.ts` y en Design Notes. Anotar el peso de una Página de Cita y de `dist/` frente a la base (`33b27cebb5f5e8d698a8642afbe837ba456c6711`) y frente a las cifras de la 30.3.

**Block If:**
- El paso del peso de `npm run build` avisa o se para (umbrales de Héctor).
- El barrido axe falla en «Inserta esta cita» de forma que pida una decisión de UX (no un defecto de marcado).
- Hacer caber el guion exigiría cambiar el comportamiento de Copiar o de «Cómo citar».

**Never:**
- Copiar o cambiar `Desplegable.astro`; escribir un `<details>` propio; un segundo guion o un `<script>` en `InsertaEstaCita.astro`; una vista previa del Fragmento como HTML.
- Partir el texto por U+000A o escribir una unión de versos (AD-29; ver diferido de la Épica 29); leer `procedencia.obra`.
- Tocar `src/lib/vocabulario.ts`, `EVENTOS`, `METRICA_DE_ACCION` o emitir un evento; tocar `AVISO_DE_PESO_DE_DIST`/`TOPE_DE_PESO_DE_DIST`.
- Añadir zonas, exenciones, permitidos de `procedencia.obra` o literales tipográficos; usar `--mono` o `--codigo` fuera de `InsertaEstaCita.astro` (y su declaración en `tokens.css`).
- Cambiar la portada, el 404, el Kit o el JSON-LD; el pasaje (Épica 31) o el Personaje (35.4).
- Editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Con JS | abrir «Inserta esta cita», pulsar «Copiar el fragmento» | portapapeles = valor del campo, exacto; rótulo «Copiado.» dos segundos; la región del bloque lo anuncia | — |
| Sin JS | `javaScriptEnabled: false` | el `<details>` abre y cierra; el campo se enfoca y se selecciona; el botón no se ve | — |
| Portapapeles denegado | `writeText` rechaza | sin «Copiado.»; el campo sigue a la vista y seleccionable | sin mensaje técnico |
| Texto con `&`, `<`, `>`, `"` | Cita y título de Obra de prueba que los traen | sale escapado; sigue siendo un solo `blockquote` y su texto decodificado es el `texto` | — |
| Cita larga | `texto` > `MAX_CARACTERES_IMAGEN` | tiene Fragmento entero | — |
| Cita sin Obra | `citaSinObra` | sin `<cite>`: «— {Autor}. » y el enlace | — |
| Canónica con marca | `canonica` con `?de=x` o `#a` | — | `fragmentoParaInsertar` lanza (detiene la construcción) |
| Pegado fuera | Fragmento en una página de otro origen con la red al sitio cortada | se lee; ninguna petición | — |

</intent-contract>

## Code Map

- `src/lib/atribucion.ts:87-100` (`textoParaCopiar`), `:576-644` (`referenciaDeCita`: la regla `punto`/`conPunto` de «.?!…» a reutilizar tras el nombre y el título), `:15` importa `MARCA` -- añadir `nombreEnAtribucion` y `fragmentoParaInsertar` en una sección «Inserta esta cita — Historia 30.4, FR-57, AD-28» tras la de «Cómo citar».
- `src/lib/lienzo.ts:80-86` -- `escapar` (`&`, `<`, `>`, `"`), módulo sin importaciones: reutilizarlo, no escribir otro.
- `src/components/Atribucion.astro:42` -- `{autor.nombre}` → `{nombreEnAtribucion(autor)}`.
- `src/components/ComoCitar.astro:50-62` -- atributos neutros (`data-copiables`, `data-copiable`, `data-copiar-texto`) y comentario de cabecera; el trato de `.copiar-referencia` (`:95-115`) es el modelo del botón nuevo.
- `src/islands/CopiarCita.astro:87-140` (guion: la función `citar`), `:43-58` (cabecera de la 30.3) -- cambiar los tres selectores; la cabecera dice que el recorrido atiende «Cómo citar» e «Inserta esta cita» por los atributos neutros, y que la 30.5 distinguirá su evento por la identidad del bloque (`data-como-citar` / `data-inserta-esta-cita`).
- `src/components/Desplegable.astro` -- solo lectura: rinde el slot a cadena (`textarea`/`button` cuentan como contenido); `.desplegable + .desplegable` quita el filete doble.
- `src/pages/cita/[slug].astro:150-160` (bloque de desplegables y su comentario), `:97` `canonica`.
- `src/styles/tokens.css:31-55` -- `--serif`/`--sans` y el comentario de `--codigo`; `:80` `--interlineado-codigo`.
- `src/lib/umbrales.ts:466` -- `MAX_BYTES_DE_GUION` (solo si no cabe).
- `tools/lib/html.ts:145` (`recorrerElementos`) y `tests/unit/ayuda/listado.ts:10` (`decodificar`) -- para analizar el Fragmento del `textarea` de `dist/`.
- `tests/unit/como-citar.test.ts:1-80` (corpus de prueba con Obra, sin Obra y cotejadas; `construirConCorpus`, `paginaConstruida`), `:171`, `:175`, `:238` -- patrón y líneas que nombran los atributos que cambian.
- `tests/unit/medicion.test.ts:2476-2515` (bytes de guion), `:3350-3360` (anunciantes: contar los bloques `data-copiables` y no `data-como-citar`).
- `tests/unit/atribucion.test.ts` -- la tabla literal de la 30.3; añadir la del Fragmento.
- `tests/unit/tipografia-en-tokens.test.ts:226-260` -- «un interlineado por token» (`code: 'codigo'`, l.62) ya cubre `--interlineado-codigo`.
- `tests/unit/tarjeta-de-obra.test.ts:745-880` -- orden del `article`: el bloque `desplegables` está ahora en toda Página de Cita.
- `tests/e2e/como-citar.spec.ts` (patrón: `desplegable`, `region`, portapapeles, `javaScriptEnabled: false`), `tests/e2e/ayuda/corpus.ts` (`citaConTarjetaCompleta`, `citaSinObra`).
- `tests/e2e/accesibilidad.spec.ts:660-690` (paradas de foco: `['Cómo citar ›']` pasa a `['Cómo citar ›', 'Inserta esta cita ›']`), `:1290-1315` (zonas de toque: hoy excluye lo plegado; diferido de la 30.3), `:2775-2805` (axe y reflujo de «Cómo citar»).
- `tests/e2e/pagina-de-cita.spec.ts:660-695` -- grupos de tabulación (`desplegables`).
- `tests/e2e/tipografia-calculada.spec.ts-snapshots/tipografia-cita*.json` -- regrabar: solo claves nuevas del bloque.
- `AGENTS.md` -- tras el apartado «Cómo citar (Historia 30.3)».

## Tasks & Acceptance

**Execution:**
- `src/lib/atribucion.ts` -- `nombreEnAtribucion`, `fragmentoParaInsertar` (con la comprobación de la canónica) -- AD-28, FR-57.
- `src/components/Atribucion.astro` -- el nombre por `nombreEnAtribucion` -- una sola función para la 35.4.
- `src/components/InsertaEstaCita.astro` -- crear con el marcado y los estilos de Always y una cabecera (UX-DR120/121/144/145, sin vista previa, el enlace es texto, sin guion propio).
- `src/components/ComoCitar.astro`, `src/islands/CopiarCita.astro` -- atributos neutros; cabeceras al día.
- `src/pages/cita/[slug].astro` -- bloque siempre presente con los dos desplegables; comentario al día.
- `src/styles/tokens.css` -- `--mono`; comentario de `--codigo`.
- `src/lib/umbrales.ts` -- solo si el guion no cabe.
- `tests/unit/atribucion.test.ts` -- tabla literal del Fragmento (Design Notes: con Obra, sin Obra, título en «?», texto con `&<>"`, título con `<`, Cita de 400 caracteres) y que una canónica con `?de=`, `?via=` o `#` lanza; `nombreEnAtribucion` da el `nombre`.
- `tests/unit/inserta-esta-cita.test.ts` -- nuevo, sobre `dist/` (corpus como el de `como-citar.test.ts`, con `&`/`<` en un texto y una Cita sin Obra): en **toda** Página de Cita construida hay un solo `textarea[data-copiable]` dentro de «Inserta esta cita», el último `<details>` de `div.desplegables`, sin `open`, con `<label for>` y la región vacía dentro y el botón `hidden`; su valor decodificado, analizado con `recorrerElementos`, es un `blockquote` raíz único sin elementos ni atributos vedados, cuyo único `a[href]` es la canónica sin `?`, y cuyo primer `<p>` decodificado es el `texto`; ningún `<a>` del bloque en la página; JSON-LD sin el Fragmento; buscar en el índice («Pega este fragmento») no devuelve nada; y en `src/` solo `tokens.css` e `InsertaEstaCita.astro` nombran `--mono` o `--codigo`.
- `tests/unit/como-citar.test.ts`, `tests/unit/medicion.test.ts`, `tests/unit/tarjeta-de-obra.test.ts` -- atributos y orden al día; bytes de guion anotados.
- `tests/e2e/inserta-esta-cita.spec.ts` -- nuevo: la Matrix en el navegador (con JS y «Copiado.» dos segundos con nombre accesible fijo; sin JS; portapapeles denegado; pegado en `http://otro.test/` servido por `page.route`, con toda petición a `localhost` abortada y registrada: cero peticiones y el texto visible); tabulación `<summary>` de «Cómo citar» → (abierto) sus botones → `<summary>` de «Inserta esta cita» → campo → «Copiar el fragmento».
- `tests/e2e/accesibilidad.spec.ts` -- axe con «Inserta esta cita» cerrado y abierto, reflujo a 320 px abierto (`scrollWidth` de la página y del campo), paradas de foco al día y las zonas de toque medidas también con los desplegables abiertos.
- `tests/e2e/pagina-de-cita.spec.ts`, instantáneas de `tipografia-calculada` -- al día.
- `AGENTS.md` -- apartado «Inserta esta cita (Historia 30.4)»: el Fragmento lo compone solo `atribucion.ts`, sin guion ni recurso del sitio y con la canónica sin marca; el enlace es texto del campo (sin zona); `--mono` y `--codigo` son solo del campo; la isla de Copiar atiende los bloques por `data-copiables`/`data-copiar-texto`/`data-copiable`.

**Acceptance Criteria:**
- Given la Página de Cita construida, when se lee su `article`, then `div.desplegables` va tras la tarjeta (o tras compartir) con «Cómo citar» y «Inserta esta cita» en ese orden, cerrados, bajo `data-pagefind-ignore="all"`.
- Given la tabla de Design Notes, when `fragmentoParaInsertar` compone cada caso, then da exactamente la cadena literal, sin dato que no nombre FR-57.
- Given el guion en línea de la Página de Cita con Imagen y la medición puesta, when se mide, then cabe en `MAX_BYTES_DE_GUION` o el tope sube en el mismo diff con la cifra; es idéntico en toda Página de Cita, sin contenido, y «Cómo citar» se comporta como antes (`tests/e2e/como-citar.spec.ts` verde).
- Given `tests/unit/medicion.test.ts`, `obras.test.ts`, `tipografia-en-tokens.test.ts`, la puerta de cobertura y el barrido axe, when corren, then pasan sin zonas, exenciones, permitidos ni literales nuevos.
- Given `npm run build` con `FECHA_JORNADA=2026-11-08`, when termina, then no avisa de peso y el spec anota los bytes por Página de Cita y de `dist/`.

## Spec Change Log

## Review Triage Log

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 0, medium 0, low 5)
- defer: 0
- reject: 27: (high 0, medium 3, low 24)
- addressed_findings:
  - `[low]` `[patch]` La regla del punto final estaba escrita dos veces más en `fragmentoParaInsertar`, en lugar de reutilizar la de `referenciaDeCita` como pedía el Code Map: `punto` y `conPunto` pasan a ser funciones del módulo en `src/lib/atribucion.ts`, y la Referencia y el Fragmento usan las dos (salida idéntica, tabla de Vitest en verde).
  - `[low]` `[patch]` La prueba de Pagefind no buscaba ninguna palabra del rótulo visible («insertar» no sale en el bloque): gana «inserta».
  - `[low]` `[patch]` La vigilancia de `--mono`/`--codigo` solo casaba `var(--x)` exacto: ahora casa también `var( --x )` y `var(--x, respaldo)`.
  - `[low]` `[patch]` Ninguna prueba exigía que `Atribucion.astro` nombrara por `nombreEnAtribucion`: una prueba de fuente nueva en `tests/unit/inserta-esta-cita.test.ts` lo exige y rechaza `{autor.nombre}`.
  - `[low]` `[patch]` La nota de peso decía que no se reconstruyó la base sin decir por qué la cifra de la 30.3 la representa: Design Notes dice ahora que entre la medida de la 30.3 (`f14e82d61f`) y la base solo cambian pruebas, documentación y un comentario de `umbrales.ts`.
- Rechazados (resumen): el `id` fijo del campo (el componente solo va una vez, en la Página de Cita; el spec lo fija); `textContent` frente a `.value` (campo `readonly`, equivalentes) y la forma hermana del botón (cubierta por e2e); la canónica de otro host o con credenciales (sale de `Astro.site`); `lang`/`cite` en el `blockquote`, el texto del enlace, el traductor y el marcado en general (supuesto literal que revisa Héctor, diferido ya anotado; el criterio veda año, traductor y edición); los versos sin guarda (diferido ya anotado); una Cita sin «Cómo citar» (`citaTieneComoCitar` es hoy siempre verdadero: no existe el caso hasta la 35.4); la región de desplegables hasta `</article>`, los estilos duplicados de `.copiar-referencia`, la transición de 150 ms y el `:focus-visible` (trato heredado de la 30.3 y del armazón); el `aria-label` fijo (patrón de la 22.10); `rows="6"` (el campo se redimensiona); los tiempos y la ruta de contexto del e2e; el registro de la pasada anterior; la firma de `nombreEnAtribucion`; el orden de foco sin Obra; un fallo del portapapeles sin seleccionar el campo (lo que pide la Matriz); la región ausente; la puntuación tras «»» o «)» (la misma regla que la Referencia); el bucle del e2e (acotado a 20); la prueba sobre una copia y no el Corpus real (patrón del repositorio); y la función de nombre solo en la Atribución y el Fragmento (lo que pide el contrato).

## Design Notes

**El Fragmento (supuesto; lo revisa Héctor).** Líneas unidas por `\n`, `{X}` el texto escapado, `{N}` `nombreEnAtribucion` escapado, `{O}` el título escapado, `{U}` la canónica escapada; tras `{N}` o `{O}` va «.» salvo que ya acaben en «.», «?», «!» o «…» (la regla `punto` de la 30.3):

```
<blockquote>
<p>{X}</p>
<p>— {N}, <cite>{O}</cite>. <a href="{U}">Sabiduría de Bolsillo</a></p>
</blockquote>
```

Sin Obra, la segunda línea es `<p>— {N}. <a href="{U}">Sabiduría de Bolsillo</a></p>`. Ejemplo (`U` = `https://ejemplo.org/cita/x/`): `<blockquote>\n<p>Yo soy un hombre sincero de donde crece la palma.</p>\n<p>— José Martí, <cite>Versos sencillos</cite>. <a href="https://ejemplo.org/cita/x/">Sabiduría de Bolsillo</a></p>\n</blockquote>`. Con título «¿Qué es la vida?»: `<cite>¿Qué es la vida?</cite> <a …>`. Con texto `A & B <c> "d"`: `<p>A &amp; B &lt;c&gt; &quot;d&quot;</p>`. El texto va sin «»: el `blockquote` ya dice que es cita, y la prueba de `dist/` compara su texto con `texto` tal cual.

**Por qué atributos neutros y no un segundo recorrido:** la isla ya hace lo que pide el botón —enseñar, copiar el `textContent` de lo de al lado, «Copiado.» dos segundos, anunciar por la región del bloque—; un `<textarea readonly>` da su contenido por `textContent` igual que su valor. Renombrar los tres selectores deja un solo recorrido para los dos desplegables y acorta el guion; `w()` y `[data-sin-fecha]` no encuentran nada en «Inserta esta cita». La 30.5 sabrá qué evento emitir por la identidad del bloque.

**`nombreEnAtribucion`:** hoy devuelve `autor.nombre`; existe para que la Atribución y el Fragmento nombren por una sola función (UX-DR137), donde la 35.4 añadirá el Personaje sin tocar los componentes.

**Medidas tomadas (2026-11-08):**

- **Guion en línea** (`tests/unit/medicion.test.ts`, «la Página de Cita no pierde su listón», Página de Cita con Imagen y la medición puesta): **7.326 bytes**, 354 libres de `MAX_BYTES_DE_GUION` (7.680); tras la revisión 1 de la 30.3 eran unos 7.334 (346 libres). Los selectores neutros ahorran 8 bytes y el tope no cambia. La Página de Cita sin Imagen: 3.629 bytes. El resto de superficies, 65 (solo el arranque).
- **Peso** (`FECHA_JORNADA=2026-11-08 npm run build`, juzgado sin lo que rota): **540.697.828 bytes** (515,6 MiB), sin aviso; quedan 245.734.172 bytes (234,4 MiB) hasta el aviso de 750 MiB. Frente a la cifra de la 30.3 con el mismo Corpus y el mismo código salvo un comentario (533.823.946 bytes, medida en su revisión 1, `f14e82d61f`; la base `33b27cebb5` no se reconstruyó aparte porque entre las dos solo cambian pruebas, documentación y un comentario de `src/lib/umbrales.ts`, que no llegan a `dist/`: esa cifra es la de la base): **+6.873.882 bytes** (+6,6 MiB), unos **1.554 bytes por Página de Cita** (4.424 páginas; p. ej. `agustin-alvarez-ahora-empieza-a-haber-quienes-piensen-en`, 42.860 bytes): el Desplegable, el `label`, el Fragmento escapado dos veces y el botón, con los `data-astro-cid` de dos componentes. `index.html` y `404.html` no cambian.

**Decisiones de la implementación (las revisa Héctor con la tabla):**

- La prueba de Pagefind de `dist/` busca palabras sueltas que solo dice el bloque («fragmento», «pega», «blockquote», «cite», «insertar»): la frase «Pega este fragmento» entera casa con las tres Páginas de Cita de la copia por la búsqueda de varias palabras de Pagefind, que no exige todas.
- El campo lleva `box-sizing: border-box` y `display: block` para que `inline-size: 100%` con relleno y borde no desborde a 320 px.
- La prueba de zonas de toque gana un modo `abiertos` (abre cada `<details>` de `main` y espera a «Copiar el fragmento») y una prueba con la cara completa; las de siempre siguen midiendo con todo plegado.

## Verification

**Commands:**
- `npx vitest run tests/unit/atribucion.test.ts tests/unit/inserta-esta-cita.test.ts tests/unit/como-citar.test.ts` -- verde.
- `npx vitest run tests/unit/medicion.test.ts tests/unit/tarjeta-de-obra.test.ts tests/unit/obras.test.ts tests/unit/tipografia-en-tokens.test.ts tests/unit/desplegable.test.ts` -- verde; anotar los bytes de guion.
- `npx astro check` -- 0 errores.
- `FECHA_JORNADA=2026-11-08 npm run build` (detached) -- sin aviso de peso; anotar bytes por Página de Cita y de `dist/` frente a la base.
- `npx playwright test tests/e2e/inserta-esta-cita.spec.ts tests/e2e/como-citar.spec.ts tests/e2e/copiar.spec.ts tests/e2e/accesibilidad.spec.ts tests/e2e/pagina-de-cita.spec.ts tests/e2e/tipografia-calculada.spec.ts --project=movil --project=escritorio` -- verde.
- `npm test` (detached) -- verde.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** Toda Página de Cita lleva, como último Desplegable del bloque `div.desplegables` (que desde ahora se pinta siempre), «Inserta esta cita»: un `<label>`, un `<textarea readonly>` con el Fragmento —un `blockquote` con el texto literal, «— {Autor}, <cite>{Obra}</cite>.» y el enlace a la canónica— y «Copiar el fragmento» `hidden`. El Fragmento lo compone solo `fragmentoParaInsertar` de `src/lib/atribucion.ts`, todo escapado con `escapar`, y detiene la construcción ante una canónica con `?`, `#` o que no sea `http(s)`. La isla de Copiar atiende los dos desplegables por atributos neutros (`data-copiables`, `data-copiar-texto`, `data-copiable`), sin un segundo guion y con 8 bytes menos.

**Ficheros.**
- `src/lib/atribucion.ts` — `nombreEnAtribucion` y `fragmentoParaInsertar` (sección «Inserta esta cita»); importa `escapar` de `lienzo.ts`.
- `src/components/InsertaEstaCita.astro` — nuevo: el campo, su rótulo, el botón `hidden` y la región de estado, solo con tokens.
- `src/components/Atribucion.astro` — el nombre por `nombreEnAtribucion` (salida idéntica).
- `src/components/ComoCitar.astro` — `data-copiables`, `data-copiable` y `data-copiar-texto`; cabecera al día.
- `src/islands/CopiarCita.astro` — los tres selectores neutros; cabecera al día.
- `src/pages/cita/[slug].astro` — el bloque siempre presente, con «Cómo citar» (si la Cita lo tiene) e «Inserta esta cita».
- `src/styles/tokens.css` — `--mono`; el comentario de `--codigo`.
- `AGENTS.md` — apartado «Inserta esta cita (Historia 30.4)» y el de «Cómo citar» al día.
- Pruebas: `tests/unit/atribucion.test.ts` (tabla del Fragmento, canónicas que lanzan, `nombreEnAtribucion`), `tests/unit/inserta-esta-cita.test.ts` (nueva, sobre `dist/`), `como-citar` y `medicion` al día; `tests/e2e/inserta-esta-cita.spec.ts` (nueva), `accesibilidad.spec.ts` (paradas de foco, zonas de toque abiertas, axe y reflujo), `pagina-de-cita.spec.ts` (comentario) y ocho instantáneas de tipografía de Página de Cita regrabadas (solo las claves del bloque nuevo y el `summary` contado dos veces).

**Revisión.** Las capas externas no traen hallazgos en esta pasada: 0 parches, 0 diferidos, 0 rechazados. `followup_review_recommended: false` (parches: alto 0, medio 0, bajo 0; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/atribucion.test.ts tests/unit/inserta-esta-cita.test.ts tests/unit/como-citar.test.ts`: verde (83 + 7 + las de «Cómo citar»).
- `npx vitest run tests/unit/medicion.test.ts tests/unit/tarjeta-de-obra.test.ts tests/unit/obras.test.ts tests/unit/tipografia-en-tokens.test.ts tests/unit/desplegable.test.ts`: verde (693 en `medicion`); guion de la Página de Cita con Imagen 7.326 bytes, 354 libres, sin tocar el tope.
- `npx astro check`: 0 errores, 0 avisos.
- `FECHA_JORNADA=2026-11-08 npm run build` (en segundo plano y esperado): sin aviso de peso; 540.697.828 bytes juzgados (cifras en Design Notes).
- Playwright (`inserta-esta-cita`, `como-citar`, `copiar`, `accesibilidad`, `pagina-de-cita`, `tipografia-calculada`; móvil y escritorio): 483 en verde, 49 omitidas y 8 en rojo, todas instantáneas de `tipografia-calculada` de Página de Cita por las claves nuevas del bloque; regrabadas con `--update-snapshots` y repetido el fichero: 28 en verde. Con una copia de la configuración que solo sube el plazo del `webServer` a 600 s, borrada después; ningún servidor quedó levantado.
- `npm test` (en segundo plano y esperado): 158 ficheros, 7.304 pruebas en verde (1.266 s).
- Matriz: con JS, sin JS, portapapeles denegado y pegado fuera en `tests/e2e/inserta-esta-cita.spec.ts`; texto con `&<>"`, Cita sin Obra y Fragmento de un solo `blockquote` en `tests/unit/inserta-esta-cita.test.ts`; Cita larga (> `MAX_CARACTERES_IMAGEN`), título con `<`, sin Obra y canónica con marca en `tests/unit/atribucion.test.ts`. Todas corrieron y pasaron.

**Riesgos residuales.** El marcado literal del Fragmento es un supuesto que revisa Héctor (diferido). Los versos se pierden en un solo `<p>` hasta fundir la Épica 29 (diferido; hoy ninguna Cita de la rama lleva U+000A). +1,5 KB por Página de Cita (+6,6 MiB en `dist/`), sin aviso; la cifra de la base es la de la 30.3 con el mismo Corpus, no una reconstrucción de `33b27cebb5` en esta pasada.

### Pasada de revisión 1 (2026-11-08, capas externas)

**Resumen.** Cinco parches bajos, sin cambio de comportamiento ni de `dist/`: la regla del punto final es una sola (`punto`/`conPunto` del módulo en `src/lib/atribucion.ts`, para la Referencia y el Fragmento); la prueba de Pagefind busca también «inserta»; la vigilancia de `--mono`/`--codigo` casa las variantes con espacio o respaldo; una prueba de fuente exige que `Atribucion.astro` nombre por `nombreEnAtribucion`; y la nota de peso dice por qué la cifra de la 30.3 es la de la base.

**Ficheros.**
- `src/lib/atribucion.ts` — `punto` y `conPunto` a nivel de módulo; `referenciaDeCita` y `fragmentoParaInsertar` los usan.
- `tests/unit/inserta-esta-cita.test.ts` — término «inserta», regex ampliada y la prueba de `nombreEnAtribucion` en la Atribución.
- Este spec — registro de la pasada, nota de peso y este resultado.

**Revisión.** 5 parches (bajos), 0 diferidos, 27 rechazados (detalle en el Review Triage Log). `followup_review_recommended: true` (parches: alto 0, medio 0, bajo 5; puntuación 3 × 0 + 1 × 5 = 5).

**Verificación.**
- `npx vitest run tests/unit/atribucion.test.ts tests/unit/inserta-esta-cita.test.ts`: 91 en verde.
- `npx astro check`: 0 errores, 0 avisos.
- `npm test` (en segundo plano y esperado): 158 ficheros, 7.305 pruebas en verde (1.262 s).
- Playwright `inserta-esta-cita`, `como-citar` y `copiar`, móvil y escritorio, contra el sitio construido (`npm run build` del `webServer`, con una copia temporal de la configuración que solo sube su plazo y fija `FECHA_JORNADA=2026-11-08`; borrada después): 52 en verde; los servidores pararon.
- `npx tsx integraciones/peso.ts` sobre ese `dist/`: 540.971.222 bytes juzgados, sin aviso (234,1 MiB hasta el aviso).

**Riesgos residuales.** Los de la pasada anterior siguen: los versos hasta fundir la Épica 29 y el marcado literal del Fragmento que revisa Héctor (los dos diferidos).
