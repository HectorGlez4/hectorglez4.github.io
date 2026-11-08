---
title: 'Historia 30.3 — «Cómo citar» en la Página de Cita'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_revision: 'ed97032da5da9cdc4ab456d721b3ea8cd0153897'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-30-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-30-2-la-cita-a-su-medida-y-las-acciones-en-fila-desde-600-px.md'
warnings: [oversized]
deferred:
  - summary: 'Al fundir la Épica 29 en la rama: la Referencia por enUnaLinea. `referenciaDeCita` toma hoy `cita.texto` tal cual (en esta rama ningún texto lleva U+000A); al fundir, el texto de la Referencia pasa por `enUnaLinea` de `src/lib/verso.ts` y la fila «en verso» de la tabla de Vitest gana su caso con « / ».'
    evidence: 'La Épica 29 (src/lib/verso.ts) no está en v9/epica-30; AD-29 prohíbe escribir una unión de versos local. El AC de la 30.3 pide la forma en una línea por `enUnaLinea` (29.3).'
    severity: medium
  - summary: 'Pendiente de Héctor (revisión del spec): las formas literales de APA, MLA y Chicago, el formato de la fecha de consulta por estilo y la línea «Sin fecha de consulta…» bajo cada Referencia son supuestos de este spec (Design Notes), fijados por la tabla de Vitest; cambiarlos es cambiar la tabla y `atribucion.ts`, nada más.'
    evidence: 'AC de la 30.3: «la forma literal de las tres … la fija una tabla de ejemplos literales en Vitest [ASSUMPTION] que Héctor revisa en el spec»; formato de fecha [ASSUMPTION].'
    severity: low
  - summary: >-
      Pendiente de Héctor (formas literales): el punto tras las comillas de cierre cuando el texto de la Cita ya acaba en puntuación —hoy «…palma.». y «¿…?».—.
    evidence: |-
      `referenciaDeCita` escribe siempre `«${cita.texto}».`, como fija la tabla de Design Notes. La ortografía académica suprime el punto interior y deja el exterior («…palma».), mientras que tras «?»/«!» el punto exterior sí va; 254 de las 4.424 Citas acaban en «?», «!» o «…». Quitar el punto final del texto choca con «el texto de la Cita entra entero y literal» del intent: es decisión de forma de Héctor (revisión 1 de la 30.3, blind-hunter).
    location: >-
      src/lib/atribucion.ts (referenciaDeCita, const texto)
    severity: low
  - summary: >-
      Pendiente de Héctor (formas literales): comillas anidadas cuando el texto de la Cita ya lleva «…».
    evidence: |-
      La Referencia envuelve el texto en «…» y 8 Citas del Corpus ya traen «…» dentro, que queda «…«…»…» en vez de pasar a “…”; cambiar las comillas interiores altera el texto literal que el intent manda conservar (revisión 1 de la 30.3, blind-hunter).
    location: >-
      src/lib/atribucion.ts (referenciaDeCita)
    severity: low
  - summary: >-
      Pendiente de Héctor (formas literales): el traductor de una Cita sin Obra se omite en los tres estilos.
    evidence: |-
      El AC pone la traducción «si la Cita los declara», y Design Notes la ata al tramo de Obra («Sin Obra: sin el tramo de Obra ni su traducción»), porque en APA va junto al título. Hoy ninguna Cita del Corpus declara traductor sin Obra (0 de 4.424), así que no se publica ninguna Referencia que lo pierda; dónde iría sin título es una forma que decide Héctor (revisión 1, intent-alignment y ac-auditor G2).
    location: >-
      src/lib/atribucion.ts (referenciaDeCita, const traduccion)
    severity: low
  - summary: >-
      Para la 32.5: `ComoCitar.astro` depende de que la página lleve la isla de Copiar (`CopiarCita.astro`), que es quien escribe la fecha y enseña los botones.
    evidence: |-
      La Página de Obra no lleva Copiar; reutilizar allí `ComoCitar.astro` sin un guion que recorra `[data-como-citar]` dejaría las Referencias sin fecha y los botones ocultos para siempre, y ninguna puerta del build ata el bloque a ese guion (revisión 1, blind-hunter). La 32.5 decide de dónde le llega el guion.
    location: >-
      src/components/ComoCitar.astro, src/islands/CopiarCita.astro
    severity: low
  - summary: >-
      La prueba de zonas de toque de `accesibilidad.spec.ts` excluye todo lo de dentro de un `<details>` cerrado salvo su `<summary>`, y no vuelve a medirlo abierto.
    evidence: |-
      La exclusión es necesaria (el navegador da caja a lo plegado), pero los desplegables que vienen —el pasaje (Épica 31), «Inserta esta cita» (30.4)— quedarían sin medir sus objetivos si nadie los mide abiertos (revisión 1, blind-hunter).
    location: >-
      tests/e2e/accesibilidad.spec.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** Quien llega a una Página de Cita para citarla en un trabajo tiene que componer la Referencia a mano, y nada en el sitio le da APA, MLA ni Chicago con lo que consta de esa Cita (FR-58, UJ-7).

**Approach:** Tras la Tarjeta de Obra —o tras «Compartir en», sin Obra—, un bloque de desplegables con el Desplegable «Cómo citar» (`Desplegable.astro` de la 34.0) que pinta `ComoCitar.astro` con las tres Referencias que compone solo `src/lib/atribucion.ts`, cada una con un marcador vacío donde va la fecha; la isla de copiar de la página (`CopiarCita.astro`, generalizada) escribe la fecha del visitante con `fechaDeConsulta`, muestra los botones y copia cada Referencia.

## Boundaries & Constraints

**Always:**
- Composición, solo en `src/lib/atribucion.ts` (AD-28): `citaTieneComoCitar(cita): boolean` (hoy `true` para toda Cita; la 35.4 añadirá ahí la Cita atribuida), `nombreEnReferencia(autor, estilo)`, `referenciaDeCita(cita, autor, canonica, estilo)` → segmentos (`{ texto, cursiva? }` y un segmento de fecha), `fechaDeConsulta(estilo, fecha)` y `MARCADOR_DE_FECHA_DE_CONSULTA` (el atributo del marcador vacío, `data-fecha-de-consulta="{estilo}"`). Estilos `apa | mla | chicago`, en ese orden. Las formas literales son las de Design Notes, fijadas por tabla en Vitest.
- Datos: nombre del Autor; `cita.obra?.titulo` (nunca `procedencia.obra`); `cita.procedencia.año` de **esa** Cita; `procedencia.traduccion` (traductor y su año si consta); la edición cotejada, `rotuloDeFuente(cita.fuente)`, solo si la Cita tiene `fuente`; `MARCA`; la canónica que la página ya calcula (`canonica`, sin `?de=` ni `?via=`); la fecha de consulta. Lo que no consta se omite —sin «s. f.», sin «Sin obra documentada», sin dato de otra Cita, de la ficha ni del conocimiento general—. El texto de la Cita entra entero y literal (hoy `cita.texto` tal cual; ver diferido de la Épica 29).
- Nombre invertido solo con `ordenRevisado` y un `ordenAlfabetico` igual (exacto) a una palabra del `nombre` partido por espacios (la primera aparición): apellidos = desde esa palabra hasta el final; nombre de pila = lo de antes. APA: «Apellidos, I.» con inicial solo de las palabras del nombre de pila que empiezan por mayúscula; MLA y Chicago: «Apellidos, Nombre de pila». Sin nombre de pila (una palabra), solo los apellidos. Si no, el `nombre` tal cual, en los tres. Una parte pura (`partesDelNombre(autor)` o equivalente) la comparten `nombreEnReferencia` y la relación de `tools/lib/cambios.ts`.
- `fechaDeConsulta` autocontenida (sin importar nada, sin cierres sobre el módulo, sin comentarios dentro): viaja a la isla por su texto, como `anunciar` por `guionQueAnuncia`. Usa el calendario local del `Date` que recibe.
- `ComoCitar.astro` recibe `referencias: { estilo, rotulo, segmentos }[]` ya compuestas y no compone nada ni sabe si son de Cita o de Obra (la 32.5 lo reutiliza). Por estilo: rótulo «APA»/«MLA»/«Chicago» (caption 13 px, `--peso-fuerte`, `--tinta`); a 1 × unidad la Referencia (`<p data-referencia>` en una sola línea de marcado, `--cuerpo-md`, `--sans`, `--tinta`, título y —en MLA— el sitio en `<i>`); bajo ella la línea «Sin fecha de consulta: añade la de hoy.» (`--pie`, `--tinta-apagada`, `data-sin-fecha`); a 2 × el botón secundario «Copiar APA/MLA/Chicago» (trato de `.copiar`, `hidden` en el marcado, `aria-label` fijo, `data-copiar-referencia`); 3 × entre estilos. Dentro, una región `<p class="solo-para-lectores" role="status">` vacía y sin `hidden`. Solo tokens.
- `src/pages/cita/[slug].astro`: un solo bloque, `<div class="desplegables" data-pagefind-ignore="all">`, entre `TarjetaDeObra` y `RutasDeSalida`, con `{citaTieneComoCitar(cita) && <Desplegable rotulo="Cómo citar"><ComoCitar …/></Desplegable>}`; a 4 × unidad de lo de arriba; sin desplegable no pinta el bloque. Sin `data-zona` (sin enlaces: la canónica es texto). `DatosEstructurados` no cambia.
- La isla: el guion de `CopiarCita.astro` sigue siendo uno, idéntico byte a byte en toda Página de Cita, sin datos de contenido. Además de lo de hoy (que no cambia: copia el mismo `data-carga`), al estar el documento analizado (`DOMContentLoaded` si `readyState === 'loading'`) recorre cada bloque de «Cómo citar» no marcado aún (lo marca: el Kit lleva dos copias), escribe `fechaDeConsulta(estilo, new Date())` en cada marcador, quita las líneas `data-sin-fecha`, quita `hidden` de los botones; al pulsar uno copia el `textContent` de su `[data-referencia]`, rótulo «Copiado.» dos segundos, `anunciar` por la región del bloque; si `writeText` rechaza, nada (ni «Copiado.» ni error). Sin `__medir` nuevo (el evento es de la 30.5) y sin `requestAnimationFrame` fuera de `anunciar`.
- AD-27: `CAMPOS_QUE_PINTA.autor.cita` cuenta el nombre derivado (de `nombre`, `ordenAlfabetico`, `ordenRevisado`) con el comparador único `cambiaronLosCampos`: revisar una clave o cambiar una revisada fecha y avisa las Páginas de Cita del Autor; `proponer-claves` sobre claves sin revisar sigue moviendo solo `/autores` y `/obras`. `ordenRevisado` sale de `CAMPOS_QUE_NO_FECHAN` y la prueba de clasificación sigue verde.
- Guion: se mide la Página de Cita con Imagen con la medición puesta; si pasa de `MAX_BYTES_DE_GUION` (6.656), el tope sube en el mismo diff con la cifra medida en su comentario de `umbrales.ts` y en Design Notes. Se anota el peso de una Página de Cita y de `dist/`.

**Block If:**
- El paso del peso de `npm run build` avisa o se para (umbrales de Héctor).
- El barrido axe falla en «Cómo citar» de forma que pida una decisión de UX.
- Cumplir AD-27 exigiría fechar o avisar algo que no sea la Página de Cita del Autor y los Directorios.

**Never:**
- Copiar o cambiar `Desplegable.astro`; escribir un `<details>` propio.
- Escribir una unión de versos (AD-29) o leer `procedencia.obra` fuera de `obras.ts`/`admision.ts`.
- Tocar `src/lib/vocabulario.ts`, `EVENTOS`, `METRICA_DE_ACCION` o emitir un evento nuevo; tocar `AVISO_DE_PESO_DE_DIST`/`TOPE_DE_PESO_DE_DIST`.
- Añadir zonas, exenciones o un `<a>` en el bloque; el pasaje (Épica 31) o «Inserta esta cita» (30.4), ni hueco para ellos.
- Cambiar la portada, el 404, el Kit o el JSON-LD más allá del guion compartido de Copiar (que crece en ellos y no cambia su comportamiento); poner en `dist/` la jornada del build en «Cómo citar».
- Editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`; correr `tools/autor.ts clave` sobre el Corpus real.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Con JS | abrir «Cómo citar», pulsar «Copiar APA» | portapapeles = Referencia leída con la fecha de hoy; región «Copiado.»; repetir vuelve a anunciar | — |
| Sin JS | `javaScriptEnabled: false` | el `<details>` abre y cierra; Referencias sin fecha y seleccionables; tres líneas «Sin fecha…»; botones no visibles | — |
| Portapapeles denegado | `writeText` rechaza | región sin «Copiado.»; la Referencia sigue a la vista | sin mensaje técnico |
| Build | `FECHA_JORNADA=2026-11-08` | ningún «Cómo citar» de `dist/` lleva «8 de noviembre de 2026», «8 nov. 2026» ni «2026-11-08» | — |
| Cita sin Obra | `citaSinObra` | desplegable tras «Compartir en»; Referencias sin título | — |

</intent-contract>

## Code Map

- `src/lib/atribucion.ts:51-104` -- `procedenciaCompuesta`, `fraseDeTraduccion`, `textoParaCopiar` (no cambia): modelo de composición y de omisión; añadir aquí las piezas de la Referencia. Importa ya `MARCA` (l.15); `rotuloDeFuente` está en `src/lib/obras.ts:1188`.
- `src/lib/anuncio.ts:22-71` -- `anunciar` y `guionQueAnuncia` (constantes + `String(anunciar)` + cuerpo, rompe ante `</script`/`<!--`): `fechaDeConsulta` viaja igual (por su texto dentro del cuerpo, o ampliando `guionQueAnuncia` en lo mínimo con funciones extra).
- `src/islands/CopiarCita.astro:58-120` (guion), `122-144` (marcado), `146+` (estilos; `.copiar` es el trato del botón secundario) -- generalizar; marcado y `data-carga` de Copiar no cambian. Lo usan `[slug].astro`, `CitaDelDia.astro` (portada, 404) y `MaterialParaPublicar.astro` (Kit, dos copias).
- `src/components/Desplegable.astro` -- solo lectura: `rotulo` + slot; rompe con slot vacío; `max-inline-size: --medida-prosa`, filetes, `.contenido` con 2 × / 3 ×.
- `src/pages/cita/[slug].astro:118-141` -- `canonica` (l.97), orden del `article`; el bloque va entre `TarjetaDeObra` y `RutasDeSalida` (cuyo `margin-top` 8 × / 12 × no cambia).
- `src/lib/admision.ts:324-347` -- `ordenAlfabetico`, `ordenRevisado` (jornada) del esquema de Autor; `src/lib/publicado.ts:97` interfaz `Autor`.
- `tools/lib/cambios.ts:175-216` (`cambiaronLosCampos`, `valorDelCampo`), `218-221` (`CAMPOS_DEL_AUTOR_FUERA`), `259-296` (`CAMPOS_QUE_PINTA`), `298-317` (`CAMPOS_QUE_NO_FECHAN`, con `ordenRevisado`) -- añadir el campo derivado; importa ya de `src/lib/obras.ts`.
- `tests/unit/fecha-de-cambio.test.ts:550-575` -- «solo claves de orden…» (sigue) y «solo la revisión de las claves… nada cambia» (reescribir); `341-370` clasificación.
- `tools/lib/cobertura.ts:148-280` -- la puerta lee todo el texto de cada página: el «›» del `<summary>` entra solo; probarlo sobre una Página de Cita construida (patrón en `tests/unit/desplegable.test.ts:297-330`).
- `tests/unit/medicion.test.ts:2484-2515` (bytes de guion por superficie, Cita con/sin Imagen), `2635-2655` (Copiar tras su isla), y las de guion idéntico / sin contenido / `requestAnimationFrame`.
- `tests/unit/ayuda/pagefind.ts:68` -- `indiceDe(proyecto)` para buscar en el índice generado (`conBusqueda`); `tests/unit/ayuda/construir.ts:309` (`jornada` → `FECHA_JORNADA`).
- `tests/unit/obras.test.ts:1068-1100` -- nadie lee `procedencia.obra`: verde sin permitidos nuevos.
- `tests/unit/tarjeta-de-obra.test.ts:745-880` -- `hijosDelArticle` y el orden del `article`: reconocer `desplegables` tras la tarjeta (o tras compartir) y antes de las rutas.
- `tests/e2e/copiar.spec.ts`, `tests/e2e/desplegable.spec.ts`, `tests/e2e/accesibilidad.spec.ts:777-975`, `tests/e2e/ayuda/corpus.ts` (`citaConTarjetaCompleta`, `citaSinObra`) -- patrones para la e2e nueva.
- `tests/e2e/tipografia-calculada.spec.ts-snapshots/tipografia-cita*.json` -- regrabar si cambian; solo claves nuevas del bloque.
- `AGENTS.md:976-1040` -- apartados de la Tarjeta de Obra y de la Fila de acciones; añadir uno de «Cómo citar» detrás.

## Tasks & Acceptance

**Execution:**
- `src/lib/atribucion.ts` -- `EstiloDeReferencia`, `ESTILOS_DE_REFERENCIA`, `MARCADOR_DE_FECHA_DE_CONSULTA`, `citaTieneComoCitar`, `partesDelNombre`, `nombreEnReferencia`, `referenciaDeCita`, `fechaDeConsulta` y un `referenciaEnTexto(segmentos, fecha?)` para las pruebas -- AD-28, FR-58.
- `src/components/ComoCitar.astro` -- crear (cabecera con UX-DR119/145/146 y que la reutiliza la 32.5) -- composición de Always.
- `src/islands/CopiarCita.astro` -- generalizar el guion como en Always; cabecera al día.
- `src/pages/cita/[slug].astro` -- el bloque de desplegables y su comentario (palanca de SM-C5: un diff de un sitio).
- `src/lib/umbrales.ts` -- solo si el guion no cabe: `MAX_BYTES_DE_GUION` con la cifra medida.
- `tools/lib/cambios.ts` -- campo derivado del nombre en Autor → Página de Cita; `ordenRevisado` fuera de `CAMPOS_QUE_NO_FECHAN`; comentarios.
- `tests/unit/atribucion.test.ts` (o `como-citar.test.ts`) -- la tabla literal de Design Notes (los 3 estilos × los casos), `nombreEnReferencia` con Martí, Horacio, María de Zayas y Sotomayor (revisadas en el fixture) y uno sin revisar, `fechaDeConsulta` para los 12 meses en MLA y una fecha en APA/Chicago, y que `String(fechaDeConsulta)` evaluado aparte da lo mismo.
- `tests/unit/como-citar.test.ts` (sobre `dist/` construido con `jornada: '2026-11-08'` y `conBusqueda`) -- orden del `article` (desplegables tras la tarjeta o tras compartir), bloque bajo `data-pagefind-ignore="all"`, `<details>` sin `open`, región vacía dentro, botones `hidden`, marcadores vacíos, sin la jornada, JSON-LD sin «Cómo citar», buscar el título de una Obra devuelve las mismas Páginas de Cita que antes (las de esa Obra) y una palabra solo del bloque («Recuperado») ninguna, cobertura del «›», guion idéntico en dos Páginas de Cita y `data-carga` de Copiar como `textoParaCopiar`.
- `tests/unit/tarjeta-de-obra.test.ts`, `tests/unit/fecha-de-cambio.test.ts`, `tests/unit/medicion.test.ts` -- al día (orden; revisión de clave fecha `/cita/…` del Autor, `proponer-claves` sin revisar no; bytes anotados).
- `tests/e2e/como-citar.spec.ts` -- nuevo: los casos de la Matrix, la Cita sin Obra, «Copiado.» dos segundos y nombre accesible fijo, tabulación tarjeta → `<summary>` → (abierto) tres botones.
- `tests/e2e/accesibilidad.spec.ts` -- axe con «Cómo citar» cerrado y abierto, y reflujo a 320 px abierto.
- `AGENTS.md` -- apartado «Cómo citar (Historia 30.3)» con lo que pide el AC (lugar, primitiva, `ComoCitar.astro`, `atribucion.ts` dueño, fecha del cliente por `fechaDeConsulta` y sin JS sin fecha, revisar una clave fecha y avisa las Páginas de Cita).

**Acceptance Criteria:**
- Given la Página de Cita construida, when se lee su `article`, then el orden es bloque, fuente, fila, compartir, tarjeta (si hay Obra), desplegables, rutas, filtros; el bloque está una sola vez, bajo `data-pagefind-ignore="all"`, con el `<details>` cerrado y su primer filete a 4 × unidad.
- Given las Referencias de la tabla, when se componen, then cada estilo da exactamente la cadena literal de Design Notes, sin dato que no conste, y revisar la clave del fixture cambia solo el nombre.
- Given un commit que solo revisa la clave de un Autor (`ordenRevisado` y una clave que es palabra del nombre), when se fecha y se avisa, then cambian sus Páginas de Cita y los Directorios; given `proponer-claves` sobre claves sin revisar, then solo `/autores` y `/obras`.
- Given el guion en línea de la Página de Cita con Imagen y la medición puesta, when se mide, then cabe en `MAX_BYTES_DE_GUION` o el tope sube en el mismo diff con la cifra; es idéntico en toda Página de Cita y no lleva contenido.
- Given `tests/unit/medicion.test.ts`, `obras.test.ts`, `tipografia-en-tokens.test.ts` y el barrido axe, when corren, then pasan sin zonas, exenciones, permitidos ni literales nuevos.

## Spec Change Log

## Review Triage Log

### 2026-11-08 — Review pass
Primera pasada sin hallazgos externos que triar (el orquestador corre las capas después): no clasificó nada.
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

### 2026-11-08 — Review pass
Revisión 1, con los hallazgos de las cinco capas externas (blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor), deduplicados.
- intent_gap: 0
- bad_spec: 0
- patch: 8 (high 0, medium 1, low 7)
- defer: 5 (high 0, medium 0, low 5)
- reject: 15 (high 0, medium 0, low 15)
- addressed_findings:
  - `[low]` `[patch]` La región de estado compartida: el temporizador de un botón borraba el «Copiado.» de otro pulsado después. El bloque recuerda qué botón anunció lo último (`k.d`) y solo ese vacía la región al volver; e2e nueva en `como-citar.spec.ts`.
  - `[low]` `[patch]` `b.firstChild` como etiqueta dependía del formato del marcado: ahora `b.querySelector('[data-etiqueta]')`, como Copiar.
  - `[low]` `[patch]` La fecha de consulta se fijaba al cargar: cada pulsación la vuelve a escribir en los marcadores antes de copiar (una página abierta desde ayer copia la de hoy); e2e nueva con `page.clock`.
  - `[low]` `[patch]` `conPunto` solo reconocía «.»: el título, el año, la edición y el cierre del contenedor de MLA no llevan punto tras «.», «?», «!» o «…» (43 Citas del Corpus tienen Obra con título en «?», «!» o «…»); dos filas nuevas en la tabla de `atribucion.test.ts`.
  - `[low]` `[patch]` Iniciales de APA en un nombre de pila con guion: «Rousseau, J.-J.» y no «J.» (Jean-Jacques Rousseau está en el Corpus).
  - `[medium]` `[patch]` Ninguna prueba veía `ordenRevisado` llegar por `aplanarAutor`: `atribucion.test.ts` aplana ahora las fichas reales de `corpus/autores/` (José Martí, Jean-Jacques Rousseau) con la revisión puesta y quitada en memoria y comprueba el nombre invertido en la Referencia (cierra también «Autores reales del Corpus», intent-alignment 3 y ac-auditor G3).
  - `[low]` `[patch]` Design Notes decía que el Kit no lleva Copiar; lo lleva (`MaterialParaPublicar.astro`) y su guion crece igual: corregido.
  - `[low]` `[patch]` `npm test` entero no se había repetido tras corregir `indexnow.test.ts`: repetido en esta pasada (ver Verificación).

## Design Notes

**Las formas literales (supuesto; las revisa Héctor).** Ejemplo con `U` = `https://ejemplo.org/cita/x/`, `X` = «Yo soy un hombre sincero de donde crece la palma.», fecha 8-11-2026; `*…*` es `<i>` (en el texto copiado, sin marca). Plantillas, con «[…]» lo que se omite si no consta:

- APA: `{N}[ ({año})]. «{X}». [En *{Obra}*[ ({traductor}, Trad.[, {añoTrad}])]. ][{Edición}. ]Sabiduría de Bolsillo. [Recuperado el {fecha} de ]{U}`
- MLA: `{N}. «{X}». [{contenedor}. ][{Edición}. ]*Sabiduría de Bolsillo*, {U}.[ Consultado el {fecha}.]`, donde `{contenedor}` une con «, » lo que conste de `*{Obra}*`, `traducido por {traductor}[, {añoTrad}]` (solo con Obra) y `{año}`; si no consta nada, no va.
- Chicago: `{N}. [*{Obra}*. ][{año}. ][Traducido por {traductor}[, {añoTrad}]. ][{Edición}. ]«{X}». Sabiduría de Bolsillo. [Consultado el {fecha}. ]{U}.`

`{N}`, el título, el año y la edición con «.» detrás salvo que ya acaben en «.», «?», «!» o «…» (APA «Martí, J.»; «En *¿Qué es la vida?* Sabiduría…»; revisión 1); APA sin año: `{N}. «{X}».…`. Sin Obra: sin el tramo de Obra ni su traducción. Martí revisado, con todo: APA `Martí, J. (1891). «Yo soy un hombre sincero de donde crece la palma.». En *Versos sencillos*. Wikisource. Sabiduría de Bolsillo. Recuperado el 8 de noviembre de 2026 de https://ejemplo.org/cita/x/`; MLA `Martí, José. «Yo soy…palma.». *Versos sencillos*, 1891. Wikisource. *Sabiduría de Bolsillo*, https://ejemplo.org/cita/x/. Consultado el 8 nov. 2026.`; Chicago `Martí, José. *Versos sencillos*. 1891. Wikisource. «Yo soy…palma.». Sabiduría de Bolsillo. Consultado el 8 de noviembre de 2026. https://ejemplo.org/cita/x/.` Sin revisar: `José Martí` en los tres (APA `José Martí (1891). …`). María de Zayas y Sotomayor con clave revisada «Zayas»: APA `Zayas y Sotomayor, M.`, MLA/Chicago `Zayas y Sotomayor, María de`. Horacio: `Horacio` sin coma.

`fechaDeConsulta`: APA `Recuperado el 8 de noviembre de 2026 de `, MLA ` Consultado el 8 nov. 2026.` (meses: ene., feb., mar., abr., mayo, jun., jul., ago., sept., oct., nov., dic.), Chicago `Consultado el 8 de noviembre de 2026. `; día sin cero. El marcador vacío va donde va esa frase, y el texto sin fecha no deja espacios dobles.

**Por qué el texto de la Cita entra en los tres:** la Página de Cita cita un fragmento, no la Obra entera; UX v9.1 y AD-29 dan la forma del verso «en la Referencia», lo que presupone que el texto entra. Chicago abre con la entrada de bibliografía fijada por Héctor y lleva el fragmento después.

**Una línea «Sin fecha…» bajo cada Referencia** (EXPERIENCE: «bajo una Referencia sin JavaScript»), para que quien selecciona solo una la vea.

**Una sola isla:** la de Copiar ya está en la página y antes que el bloque en el marcado, así que espera a `DOMContentLoaded`; marcar cada bloque procesado evita que las dos copias del Kit (y la Cita del Día) lo hagan dos veces.

**Medidas tomadas (2026-11-08):**

- **Guion en línea** (`tests/unit/medicion.test.ts`, «la Página de Cita no pierde su listón», Página de Cita con Imagen y la medición puesta): **5.651 → 7.251 bytes** (+1.600). El guion de Copiar pasa de 1.138 a 2.738 bytes (`fechaDeConsulta` por su texto, ~520, y el recorrido de «Cómo citar»). Antes de subir el tope se compactó lo nuevo desde 7.590. `MAX_BYTES_DE_GUION` sube de 6.656 a **7.680** en el mismo diff (429 libres, el margen de la v2), con la cifra en su comentario de `umbrales.ts`. La portada y el 404 no llevan hoy Copiar en la página construida (la portada lo recibirá con la 28.2), así que no crecen; el Kit (`MaterialParaPublicar.astro`, dos copias) sí lo lleva y su guion crece igual, sin «Cómo citar» que recorrer (corregido en la revisión 1: decía que el Kit tampoco).
- **Tras la revisión 1:** el recorrido de «Cómo citar» del guion de Copiar crece 83 bytes (1.023 → 1.106: la fecha en cada pulsación, la etiqueta por `querySelector` y el dueño de la región), así que el guion de la Página de Cita con Imagen queda en unos **7.334 bytes**, 346 bajo el tope de 7.680; `medicion.test.ts` sigue verde. `dist/` juzgado: **533.823.946 bytes**, sin aviso (240,9 MiB hasta el aviso).
- **Peso** (`FECHA_JORNADA=2026-11-08 npm run build`, juzgado sin lo que rota): base (`ed97032da5`, construida en un `git worktree --detach` aparte) **512.080.993 bytes**; con la historia **533.616.179 bytes**: +21.535.186 (+20,5 MiB), unos **4.902 bytes por Página de Cita** (4.424 páginas; p. ej. 36.355 → 41.257) —1.600 de guion y el resto el marcado de las tres Referencias, con los `data-astro-cid` de dos componentes—. Sin aviso: quedan 252.815.821 bytes (241,1 MiB) hasta el aviso de 750 MiB. `index.html` y `404.html` idénticos en tamaño.

**Decisiones de la implementación (las revisa Héctor con la tabla):**

- El año va por `añoLegible` («23 a. C.»), la forma del sitio para los negativos; sin él, la Referencia de Horacio diría «(-23)». Tras un año que acaba en punto no se añade otro (MLA y Chicago).
- APA sin nombre de pila con mayúscula (todo el nombre de pila en minúscula) deja solo los apellidos. Un nombre de pila con guion da una inicial por trozo: «Rousseau, J.-J.» (revisión 1).
- El rótulo de la edición cotejada es `rotuloDeFuente(cita.fuente)`: con una Fuente sin `nombre` declarado sale el anfitrión («es.wikisource.org»), igual que en la Línea de la Fuente.
- El botón de cada Referencia lleva la clase `copiar-referencia`, no `copiar`: el trato es el mismo (declaraciones copiadas, solo tokens), pero `button.copiar` ya nombra en las pruebas el Copiar de la Cita.
- El marcador de la fecha se escribe con su nombre literal (`data-fecha-de-consulta`) y `ComoCitar.astro` para la construcción si `MARCADOR_DE_FECHA_DE_CONSULTA` dejara de ser ese nombre: un atributo esparcido le ponía a Astro la clase de ámbito y la clave de las instantáneas de tipografía llevaba su hash.
- AD-27: el campo derivado es `NOMBRE_EN_REFERENCIA` (`CampoDerivado` en `tools/lib/cambios.ts`: `de` y `valor`), y su valor son los tres nombres que pinta la página, no las partes: revisar la clave de un Autor de una sola palabra («Horacio») no cambia ninguna Referencia y no fecha nada. La prueba de clasificación de la 24.8 lee las claves de un derivado por su `de`.
- La prueba de zonas de toque de `accesibilidad.spec.ts` deja fuera lo de dentro de un `<details>` cerrado salvo su `<summary>`: el navegador le da caja (`content-visibility: hidden`) encima de lo que sigue y se medían como objetivos los botones plegados.
- Las pruebas de orden de foco y de tabulación (`accesibilidad.spec.ts`, `pagina-de-cita.spec.ts`) reconocen el grupo `desplegables` entre la tarjeta y las salidas; la temporal de la 34.0 («ninguna página lo importa todavía») se retira, como pedía su comentario.

## Verification

**Commands:**
- `npx vitest run tests/unit/atribucion.test.ts tests/unit/como-citar.test.ts` (o los nombres elegidos) -- verde.
- `npx vitest run tests/unit/fecha-de-cambio.test.ts tests/unit/tarjeta-de-obra.test.ts tests/unit/medicion.test.ts tests/unit/obras.test.ts tests/unit/tipografia-en-tokens.test.ts tests/unit/desplegable.test.ts` -- verde; anotar los bytes de guion.
- `npx astro check` -- 0 errores.
- `FECHA_JORNADA=2026-11-08 npm run build` (detached) -- sin aviso de peso; anotar bytes por Página de Cita y de `dist/` frente a la base.
- `npx playwright test tests/e2e/como-citar.spec.ts tests/e2e/copiar.spec.ts tests/e2e/accesibilidad.spec.ts tests/e2e/pagina-de-cita.spec.ts tests/e2e/tipografia-calculada.spec.ts --project=movil --project=escritorio` -- verde.
- `npm test` (detached) -- verde.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** La Página de Cita lleva tras la Tarjeta de Obra —o tras «Compartir en», sin Obra— un bloque `div.desplegables` (bajo `data-pagefind-ignore="all"`, sin zona) con el Desplegable «Cómo citar»: APA, MLA y Chicago compuestos solo en `src/lib/atribucion.ts`, pintados por `ComoCitar.astro` con un marcador vacío para la fecha. La isla de Copiar, generalizada y aún idéntica en toda Página de Cita, escribe la fecha del visitante con `fechaDeConsulta`, enseña los botones y copia cada Referencia. AD-27: revisar una clave fecha y avisa las Páginas de Cita del Autor (`NOMBRE_EN_REFERENCIA`).

**Ficheros.**
- `src/lib/atribucion.ts` — estilos, `partesDelNombre`, `nombreEnReferencia`, `referenciaDeCita`, `referenciasDeCita`, `fechaDeConsulta`, `referenciaEnTexto`, `citaTieneComoCitar`, `MARCADOR_DE_FECHA_DE_CONSULTA`.
- `src/components/ComoCitar.astro` — nuevo: las Referencias compuestas, sus líneas «Sin fecha…», sus botones `hidden` y la región de estado.
- `src/islands/CopiarCita.astro` — el guion atiende también «Cómo citar» tras `DOMContentLoaded`; cabecera al día.
- `src/pages/cita/[slug].astro` — el bloque de desplegables y su distancia de 4 × unidad.
- `src/lib/publicado.ts` — el `Autor` lleva `ordenRevisado`.
- `src/lib/umbrales.ts` — `MAX_BYTES_DE_GUION` 6.656 → 7.680 con la cifra medida.
- `tools/lib/cambios.ts` — `CampoDerivado`, `NOMBRE_EN_REFERENCIA` en `autor.cita`; `ordenRevisado` fuera de `CAMPOS_QUE_NO_FECHAN`.
- `AGENTS.md` — apartado «Cómo citar (Historia 30.3)».
- Pruebas: `tests/unit/atribucion.test.ts` y `tests/unit/como-citar.test.ts` (nuevas); `fecha-de-cambio`, `indexnow`, `tarjeta-de-obra`, `medicion` y `desplegable` al día; `tests/e2e/como-citar.spec.ts` (nueva), `accesibilidad.spec.ts` y `pagina-de-cita.spec.ts` al día; ocho instantáneas de tipografía de Página de Cita regrabadas (solo claves nuevas del bloque).

**Revisión.** Sin hallazgos externos en esta pasada: 0 parches, 0 diferidos, 0 rechazados. `followup_review_recommended: false` (parcheados: 0 altos, 0 medios, 0 bajos; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/atribucion.test.ts tests/unit/como-citar.test.ts` y el lote de `fecha-de-cambio`, `tarjeta-de-obra`, `medicion`, `obras`, `tipografia-en-tokens`, `desplegable`, `ingreso-construido`, `autores-destacados` y `compartir`: 11 ficheros, 1.077 pruebas en verde.
- `npx astro check`: 0 errores.
- `FECHA_JORNADA=2026-11-08 npm run build`: sin aviso de peso; cifras en Design Notes.
- Playwright (`como-citar`, `copiar`, `accesibilidad`, `pagina-de-cita`, `tipografia-calculada`, `desplegable`, móvil y escritorio): 473 en verde y 2 en rojo por el texto esperado del rótulo (`\u00a0` frente al espacio que deja la prueba al colapsar); corregido y repetido «Historia 2.8 — foco»: 18 en verde. Corrido con una copia de la configuración que solo sube el plazo del `webServer` a 600 s (el build pasaba de 180 s con otras ramas construyendo), borrada después.
- `npm test`: 156 ficheros en verde y 1 en rojo, `tests/unit/indexnow.test.ts` (recorría los campos de la tabla como cadenas y el derivado no lo es); corregido para recorrer el derivado por sus claves y repetido el fichero solo: 36 en verde.
- Matriz: con JS, sin JS y portapapeles denegado en `tests/e2e/como-citar.spec.ts`; el build con `FECHA_JORNADA` en `tests/unit/como-citar.test.ts`; la Cita sin Obra en las dos. Todas corrieron y pasaron.

**Riesgos residuales.** Las formas literales de los tres estilos son un supuesto que revisa Héctor. +4,9 KB por Página de Cita (+20,5 MiB en `dist/`), sin aviso. El guion de Copiar crece 1.600 bytes y el tope queda con 429 libres para la 30.4. No se repitió `npm test` entero tras corregir `indexnow.test.ts`.

### Revisión 1 (2026-11-08)

**Resumen.** Se triaron los hallazgos de las cinco capas externas. Ocho parches: la región de estado compartida que vaciaba el temporizador de otro botón, la etiqueta del botón por `querySelector`, la fecha de consulta reescrita en cada pulsación, el punto que no se añade tras un título, año o edición que ya acaba en «?», «!» o «…», las iniciales de APA para un nombre de pila con guion («Rousseau, J.-J.»), la prueba de que `ordenRevisado` llega por `aplanarAutor` con fichas reales del Corpus, la nota de Design Notes sobre el Kit y la repetición de `npm test` entero. Cinco diferidos (tres formas para Héctor, uno para la 32.5 y uno de la prueba de zonas de toque). Quince rechazos.

**Ficheros.**
- `src/islands/CopiarCita.astro` — guion: `w()` reescribe la fecha al cargar y en cada pulsación, la etiqueta por `[data-etiqueta]`, y solo el botón que anunció lo último (`k.d`) vacía la región; cabecera al día.
- `src/lib/atribucion.ts` — `punto`/`conPunto` reconocen «.», «?», «!» y «…», y se aplican al título (APA, Chicago) y al cierre del contenedor de MLA; iniciales por trozo en un nombre de pila con guion.
- `tests/unit/atribucion.test.ts` — dos filas de la tabla (títulos con «?» y «!»), el caso de Jean-Jacques Rousseau y un bloque que aplana las fichas reales de José Martí y Jean-Jacques Rousseau con la revisión puesta y quitada.
- `tests/e2e/como-citar.spec.ts` — la vuelta de «Copiar APA» no borra el «Copiado.» de «Copiar MLA», y una página abierta desde ayer copia la fecha del día de la pulsación (`page.clock`).
- Este spec — diferidos, Design Notes (punto tras puntuación final, nombre con guion, el Kit sí lleva Copiar, bytes nuevos) y el triage.

**Hallazgos.** Parches 8 (alto 0, medio 1, bajo 7); diferidos 5; rechazados 15. `followup_review_recommended: true`: puntuación 3 × 1 + 1 × 7 = 10 (≥ 5).

**Verificación.**
- `npx vitest run tests/unit/atribucion.test.ts`: 60 en verde.
- `npx astro check`: 0 errores, 0 avisos.
- `npm test` (en segundo plano y esperado): 157 ficheros, 7.267 pruebas en verde (1.275 s).
- `npx playwright test` de `como-citar`, `copiar`, `accesibilidad`, `pagina-de-cita` y `tipografia-calculada`, móvil y escritorio: 473 en verde y 49 omitidas, con las dos e2e nuevas; ningún servidor quedó levantado.
- `FECHA_JORNADA=2026-11-08 npm run build`: sin aviso de peso; 533.823.946 bytes juzgados.

**Riesgos residuales.** Las formas literales siguen siendo un supuesto que revisa Héctor, ahora con tres decisiones más anotadas en los diferidos (punto tras comillas, comillas anidadas, traductor sin Obra). El tope de guion queda con unos 346 bytes libres para la 30.4.
