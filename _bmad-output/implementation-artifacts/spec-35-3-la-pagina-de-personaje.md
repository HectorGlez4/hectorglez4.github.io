---
title: 'Historia 35.3 — La Página de Personaje'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_revision: '923a0f27b4caeb6d10986741d0a7261bfe78a20d'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-35-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-35-2-el-personaje-entra-en-el-corpus-y-la-obra-tiene-un-solo-dueno.md'
warnings: [oversized]
deferred:
  - summary: 'Decisión de plan: la 35.3 NO levanta la guarda de 35.2 «Obra de un Personaje con Citas publicadas» (fallosDeObras, Página y Tarjeta de Obra). Levantarla obliga a pintar la Cabecera «de {Personaje}», su JSON-LD con `character` y su Tarjeta Social, que son criterios de la 35.4. El caso «un Personaje dueño de una Obra» del último Given de pruebas se cubre aquí sobre la función pura (`obrasDelPersonaje` con una ObraResuelta de dueño Personaje) y no sobre `dist/`; la construcción de prueba con un Personaje dueño de una Obra la añade la 35.4 al levantar la guarda.'
    evidence: 'src/lib/obras.ts MENSAJE_OBRA_DE_PERSONAJE_PUBLICADA; src/pages/obra/[autor]/[slug]/[...page].astro:66; epics.md Story 35.4 «la Página de Obra de un Personaje»; spec 35.2 deferred[0].'
    severity: medium
  - summary: 'Contradicción en los criterios: «personaje es un tipo más, rotulado «Personaje»» exige la entrada en ETIQUETAS_DE_RESULTADO, que el guion de cliente de Busqueda.astro importa entero; con el Corpus real ese guion (y la referencia a su hash en /buscar/) cambia por esos bytes, contra «ningún fichero de dist/ cambia». El plan acepta esa única diferencia, medida y nombrada; cualquier otra diferencia bloquea. Si la regla de la épica debe admitir esta excepción o la etiqueta esperar a la 35.5, lo decide Héctor (bmad-create-epics-and-stories).'
    evidence: 'src/components/Busqueda.astro:494-503,884 (ETIQUETAS_DE_RESULTADO[tipo] en el guion); dist/_astro/Busqueda.astro_astro_type_script_index_0_lang.*.js contiene los rótulos; epics.md Story 35.3 último Given.'
    severity: medium
  - summary: 'El rótulo de la Lista de Obras de la Página de Personaje no está redactado en la UX (la del Autor dice «Su obra en este Corpus», que no vale para un personaje). Se usa «Obras en este Corpus» [ASSUMPTION]; la letra la decide Héctor (bmad-ux).'
    evidence: 'DESIGN.md § Página de Personaje («la Lista de Obras… como en la Ficha de Autor»); src/pages/autor/[slug]/[...page].astro (Rotulo «Su obra en este Corpus»).'
    severity: low
  - summary: 'El barrido de accesibilidad (tests/e2e/accesibilidad.spec.ts) deriva sus muestras de las rutas construidas con el Corpus real, que no tiene Personajes: no recorrerá la Página de Personaje hasta que haya uno. `superficiesDelBarrido` la incluye por declaración; correr el barrido sobre un Corpus con Personaje es acto de Héctor.'
    evidence: 'tests/e2e/accesibilidad.spec.ts:90 (DERIVADAS = superficiesDelBarrido(rutasConstruidas())).'
    severity: low
  - summary: >-
      «tools/avisar.ts la avisa solo si es indexable antes o después» (FR-38 v9.1) no tiene mecanismo propio para la Página de Personaje: el filtro por indexabilidad de tools/lib/avisar.ts solo mira las rutas de Obra, así que hoy avisa toda Página de Personaje tocada; la 35.3b, que pone MIN_CITAS_POR_PERSONAJE, tiene que extender ese filtro y su prueba.
    evidence: |-
      tools/lib/avisar.ts no está en el diff de la 35.3 y decide la indexabilidad con esRutaDeObra; mientras personajesIndexables sea igual a personajesPublicados, toda ruta de Personaje de la relación de --desde o --hasta es indexable en ese extremo, así que el resultado coincide con FR-38, pero el criterio de antes/después no está construido ni probado para el Personaje (revisión externa 35.3-1, intent-alignment y ac-auditor).
    location: >-
      tools/lib/avisar.ts (filtro de indexables por esRutaDeObra)
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Un Personaje del Corpus (35.2) no tiene página: ni `/personaje/{slug}/`, ni familia en `superficies.ts`, ni arista en el grafo de NFR-5, ni tipo en la búsqueda propia, ni sitio en la relación de AD-27; y la Atribución de su Cita sigue nombrando solo al Autor.

**Approach:** Declarar `personaje` como séptima familia y superficie `producto` `indexablePorContenido` (hasta la 35.3b se indexa la página 1 de todo Personaje publicado), añadir `personajes` al conjunto publicable, construir la página calcando la de Autor, enlazar el Personaje desde la Atribución, y extender grafo del modelo, rutas indexables, tipo de resultado, relación de AD-27, series y admisión de ingreso. Con el Corpus real (sin Personajes) `dist/` solo cambia en el guion de la búsqueda (deferred[1]).

## Boundaries & Constraints

**Always:**
- Toda superficie, ruta y familia sale de `src/lib/superficies.ts`: `rutaDePersonaje(slug, pagina = 1)` junto a `rutaDeAutor`, con `rutaDePagina`; reconoce `/^\/personaje\/[^/]+(?:\/\d+)?$/`, `noPublicableEn` anclado `/^\/personaje\/[^/]+\/\d+$/`, `vista: EVENTOS.vistaDeSuperficie`, `indexablePorContenido: true`, sin `vistaConMarca` ni `lineaBase`. `FAMILIAS` = las seis de hoy + `'personaje'` al final.
- Un Personaje se publica si alguna Cita publicada lo declara (`personajesPublicados`). La lista indexable de Personajes la da **una** función nueva de `src/lib/publicado.ts` (`personajesIndexables`, hoy = publicados; la 35.3b le pone el umbral), usada por `rutasIndexables` y por `integraciones/indexables.ts`, que declara Obras + Personajes indexables.
- Página 1: `h1` nombre en serif con el trato del `h1` de Autor; «personaje de {universo}» con la clase/tokens de `.años`; semblanza (biografía AD-26 o `semblanzaPropia`) **siempre** bajo `data-pagefind-ignore` con su atribución visible: `AtribucionDeSemblanza.astro` (biografía) o «Semblanza de {responde}.» (propia), mismos tokens, sin `<style>`; Lista de Obras con `ListaDeObras` + `Desplegable`, zona `lista-de-obras`, rótulo «Obras en este Corpus» y el mismo pie «… sin obra documentada»; rótulo `h2` «Citas»; listado `TarjetaDeCita atribucion="obra" zona="listado"`; `Paginacion` por `CITAS_POR_PAGINA`. Páginas 2+: `h1` y listado, sin ficha.
- Título `Frases de {nombre} | Sabiduría de Bolsillo` (2+: `Frases de {nombre} — página N | …`) con `tituloDePersonaje` en `src/lib/marca.ts`; meta «{n} frases de {nombre}, personaje de {universo}.» (`n` = Citas publicadas del Personaje; «1 frase»; 2+ añade « Página N.») con `descripcionDePersonaje` en `src/lib/atribucion.ts`. Sin `tarjeta` (og:image llega con la 35.3b).
- JSON-LD: `CollectionPage` con `mainEntity` = `listaDeCitas(...)` como la de Autor; sin `about`, sin `Person`, sin fechas ni `sameAs`.
- Atribución (`Atribucion.astro`): con `cita.personaje`, el párrafo `.autor` nombra al Personaje y enlaza a `rutaDePersonaje`, zona `atribucion`; la línea de procedencia no cambia; sin Personaje, marcado idéntico al de hoy.
- `ETIQUETAS_DE_RESULTADO.personaje = 'Personaje'`, fuera de `TIPOS_CON_TITULO_EN_SANS` y de `TIPOS_CON_LINEA_DE_AUTOR`; la página pasa `tipo="personaje"` al `Armazon`.
- La página de Personaje entra en `SUPERFICIES_SIN_INGRESO` (`src/lib/ingreso.ts`); no en `SUPERFICIES_DE_LECTURA`.
- Series: `personaje` es familia propia en todas las que derivan de `FAMILIAS`; `FUERA_DEL_TOTAL` la incluye (no suma a `publicadas`); `NOMBRE_DE_FAMILIA.personaje = 'Personaje'`; el censo la compone con `personajesPublicados` + `rutaDePersonaje`. Una familia sin URL publicadas se trata como hoy la Colección vacía.
- `src/lib/vocabulario.ts` intacto; ningún evento ni zona nuevos.

**Block If:**
- Con el Corpus real y `FECHA_JORNADA` fija, `diff -r` de `dist/` antes/después muestra cualquier diferencia que no sea el guion de `Busqueda.astro` y las referencias a su nombre con hash (incluido un re-troceo de CSS por la página nueva sin rutas).
- El guion de la búsqueda pasa de su tope de `GUIONES_EXTERNOS` y subirlo exigiría más que el delta medido.
- Hace falta tocar `src/lib/vocabulario.ts`, `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.

**Never:**
- Levantar la guarda de Obra de Personaje ni la de «Cita publicada lleva Autor» (35.4); pintar Personaje en Tarjeta de Cita, Rutas de salida, Tarjeta de Obra, lo copiado, JSON-LD de Cita o Imagen (35.4); «Buscar en {Personaje}», Directorios y optgroup (35.5); línea de retirada (35.8); Tarjeta Social y `MIN_CITAS_POR_PERSONAJE` (35.3b).
- Sembrar Personajes, semblanzas o claves en el Corpus real; publicar una semblanza escrita por un agente.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sin Personajes | Corpus real | Ninguna ruta `/personaje/`; sin `getCollection('personajes')` si ninguna Cita declara Personaje | — |
| Ruta sin lista | `caracterDe('/personaje/batman')` sin `declararRutasIndexables` | Rompe como ante una Obra | — |
| 2+ | `/personaje/batman/2` | `servicio` por forma, `noindex`, sin vista | — |
| Obras dichas | Cita (autor seneca, personaje batman) resuelve ficha de seneca | Batman lista esa Obra; arista `/personaje/batman → /obra/seneca/…` | — |
| Obra propia (puro) | ObraResuelta con `dueño {personaje, batman}` | `obrasDelPersonaje` la incluye | En build sigue la guarda de 35.2 |
| Cita sin Personaje | Cita de siempre | Atribución igual byte a byte | — |
| Modelo en Personaje | `admitidoEn` incluye la página de Personaje | `revisarDeclaracionDeIngreso` rechaza | Lanza con mensaje |

</intent-contract>

## Code Map

- `src/lib/superficies.ts:165-315` -- declaración (calcar Autor, l.180) + `indexablePorContenido`; `FAMILIAS` l.315; `rutaDePersonaje` junto a `rutaDeAutor` l.378; `PAGINA_DE_PERSONAJE` constante como `PAGINA_DE_OBRA`.
- `src/lib/publicado.ts:157` `ConjuntoPublicable` + `personajes: Personaje[]`; l.178 `Personaje` gana `semblanza?`, `atribucion?` (biografía), `responde?` (propia); nuevos `aplanarPersonaje`, `citasDePersonaje`, `obrasDelPersonaje` (calca `obrasDelAutor` l.881 filtrando `cita.personaje`), `personajesIndexables`; `rutasPublicadas` l.828 (tras Autores); `rutasIndexables` l.1152 (los Personajes no indexables fuera — hoy ninguno); `grafoDelModelo` l.1235 (listado de Personaje, Personaje→Obras, Cita→Personaje); `resolverAtribuciones` l.1439 genérico sobre `{slug}`; `verificarIntegridad` l.1349 (personaje de Cita existe); `conjuntoPublicable` l.1606 (personajes y sus biografías, consultando colecciones solo si hace falta, como biografías l.1622).
- `src/lib/atribucion.ts:121-150` -- `semblanzaEn` admite `responde` como atribución; superficie `'ficha-de-personaje'` en `SUPERFICIES_DE_LA_SEMBLANZA` y `PORTAN_LA_ATRIBUCION`; `descripcionDePersonaje` junto a `descripcionDeAutor` l.300.
- `src/lib/marca.ts:76` -- `tituloDePersonaje`.
- `src/components/AtribucionDeSemblanza.astro` -- prop unión `AtribucionDeSemblanza | { responde: string }`.
- `src/components/Atribucion.astro`, `src/components/BloqueDeCita.astro:17-47`, `src/pages/cita/[slug].astro:39-108` -- prop `personaje?: Personaje` resuelta del conjunto.
- `src/components/DatosDePersonaje.astro` (nuevo, calca `DatosDeAutor.astro` sin `about`).
- `src/pages/personaje/[slug]/[...page].astro` (nuevo, calca `src/pages/autor/[slug]/[...page].astro` sin `BuscarEn`, sin `DatosDeAutor`, sin años, con «Citas»).
- `src/lib/tipoDeResultado.ts:27` -- etiqueta. `src/lib/ingreso.ts:208` -- `SUPERFICIES_SIN_INGRESO`.
- `integraciones/indexables.ts:91` -- declara también Personajes; el informe de Obras no cambia. Lee personajes con `leerPersonajes` (`tools/lib/corpus.ts`).
- `tools/lib/alcance.ts:69-110` -- `DatosDelCorpus.personajes`, `conjuntoDeLosDatos` los pasa.
- `tools/lib/indexacion.ts:76-110,305` -- `FUERA_DEL_TOTAL`, `NOMBRE_DE_FAMILIA`, censo. Ripple de `Record<Familia,…>` en `tools/lib/{trafico,demanda,rastreo,canal,avisar}.ts`, `tools/trafico.ts`, `tools/avisar.ts`: resolver con lo que `astro check` señale.
- `tools/lib/cambios.ts:217-350,560-680` -- columna `personaje`: `CAMPOS_QUE_PINTA.personaje.personaje` = `nombre, universo, semblanza, semblanzaPropia, biografia` (salen de `CAMPOS_QUE_NO_FECHAN`, que queda `['ordenRevisado']`); `cita.personaje = CAMPOS_DE_CITA`; `obra.personaje = ['titulo']`. Relación: declarar `rutaDePersonaje` solo para Personajes con alguna Cita viva, componer su fichero y `conLaCita`; bajas de Cita con `personaje` lo componen.
- Fixtures: `tests/unit/personajes-build.test.ts:24-60` (`personaje`, `atribuida` con Autor y Personaje), `tests/unit/ayuda/relleno.ts` (Tema publicado), `tests/unit/ayuda/construir.ts` (`construirConCorpus`, `registroDeClasesDe`). COLOCACION en `tests/unit/medicion.test.ts:3129`, sitio en l.2043.

## Tasks & Acceptance

**Execution:**
- `src/lib/superficies.ts` -- familia, superficie, `rutaDePersonaje` -- AD-17.
- `src/lib/publicado.ts`, `tools/lib/alcance.ts`, `integraciones/indexables.ts` -- conjunto, rutas, indexables, grafo -- AD-11, NFR-5.
- `src/lib/atribucion.ts`, `src/lib/marca.ts`, `src/components/AtribucionDeSemblanza.astro`, `src/components/DatosDePersonaje.astro`, `src/pages/personaje/[slug]/[...page].astro` -- la página -- UX-DR134.
- `src/components/Atribucion.astro`, `src/components/BloqueDeCita.astro`, `src/pages/cita/[slug].astro` -- arista Cita→Personaje.
- `src/lib/tipoDeResultado.ts`, `src/lib/ingreso.ts` -- tipo y sin Modelos.
- `tools/lib/indexacion.ts` y lectores de familias -- séptima familia en series.
- `tools/lib/cambios.ts` -- relación AD-27.
- Pruebas: `tests/unit/pagina-de-personaje.test.ts` (nuevo, construcción con Personaje A de `CITAS_POR_PAGINA + 1` Citas y Personaje B de una, todas con Autor `vivo` y Tema publicado, una Cita de A con Obra de su Autor; B con `semblanzaPropia`: Ficha, «personaje de …», «Semblanza de …», Lista de Obras, «Citas», listado, 2+ sin ficha y `noindex`, `data-vistas` con la `vista-de-superficie` solo en la página 1, título y meta, JSON-LD sin `Person`, «frases» solo en título/meta de Obra y Personaje, Atribución de la Cita enlaza a `/personaje/a/`, `alcance` pasa y la Personaje queda dentro de `MAX_SALTOS_DESDE_LA_PORTADA` por portada→Tema→Cita→Personaje); `superficies.test.ts` (rutas de ejemplo, fallo sin lista, 2+ por forma); `publicado.test` o el que cubra `grafoDelModelo`/`obrasDelPersonaje` (incluido dueño Personaje en puro); `ingreso.test.ts` (rechazo); `tipo-de-resultado.test.ts`; `fecha-de-cambio.test.ts`/`indexnow.test.ts` (relación y aviso de la Página de Personaje); `medicion.test.ts` (sitio medido con un Personaje; filas `atribucion` de Cita→Personaje, `listado` y `lista-de-obras` de la página).
- `AGENTS.md` -- «Known pitfalls» (siete familias; Página de Personaje en la lista de rutas indexables junto a Obra); familias de las series; «Los Personajes».

**Acceptance Criteria:**
- Given el Corpus real y `FECHA_JORNADA` fija, when se construye antes y después y se compara con `diff -r`, then solo difieren el guion de `Busqueda.astro` y las referencias a su hash, y el spec anota el delta en bytes.
- Given la construcción de `pagina-de-personaje.test.ts`, when corre Vitest sobre su `dist/`, then cumple cada punto de la tarea de pruebas.
- Given `npx astro check` y `npm test` (detached), when corren, then pasan, `huella.test.ts` incluida sin mover la huella.

## Design Notes

**Decisión del orquestador (por delegación de Héctor, 2026-11-08).** Con el Corpus real, la única diferencia de `dist/` aceptada es el guion de cliente de `/buscar/` (`Busqueda.astro_astro_type_script_index_0_lang.*.js`) y la referencia a su nombre con hash en `/buscar/index.html`, por el rótulo «Personaje» de `ETIQUETAS_DE_RESULTADO`, con su tamaño medido y bajo su tope; cualquier otra diferencia bloquea. Las guardas de la 35.2 siguen hasta la 35.4, como planea este spec.

**Segunda decisión del orquestador (por delegación de Héctor, 2026-11-08).** Se acepta también, como diferencia de `dist/` con el Corpus real, el re-troceo del `<style>` en las 192 páginas `/autor/**`: las mismas reglas con su `cid`, nada fuera del `<style>`, +1 byte por página. Es la misma clase de diferencia que la del CSS del Desplegable en la 32.3. Lo provoca que la Página de Personaje importe `Desplegable.astro`, que hasta ahora solo importaba la de Autor. La Página de Personaje se queda con `ListaDeObras` + `Desplegable`, como dice el contrato.

Dueño de la página: `citasDePersonaje(citas, slug)` = Citas con `personaje === slug`, en el orden de `citasDeAutor`. Una Cita con Autor y Personaje está en las dos páginas (AD-33). `semblanzaEn` sigue intacta para el Autor: solo gana el caso `responde`. El orden de componentes del `<header class="ficha">` y las distancias son las de la Página de Autor; las 2+ calcan las de Autor.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run tests/unit/<cada fichero tocado>.test.ts` -- expected: verde.
- `/Users/hec/brainlySabiduria/.claude/v9-ralph/correr.sh …/logs/s-35/test-35.3.log … npm test` -- expected: FINISHED EXIT=0.
- Construcción de antes (worktree `--detach` en baseline bajo `.claude/v9-ralph/tmp-wt/`) y de después con la misma `FECHA_JORNADA`; `diff -r` -- expected: solo el guion de la búsqueda.

## Spec Change Log

- 2026-11-08 — Decisión del orquestador, por delegación de Héctor: se acepta como diferencia de `dist/` el re-troceo del `<style>` de las 192 páginas `/autor/**` (reglas idénticas, solo cambia el orden; +1 byte por página), además del guion de `/buscar/`. Desbloquea la Block If de la ejecución anterior sin cambiar el contrato: la Página de Personaje sigue con `ListaDeObras` + `Desplegable`.

## Review Triage Log

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 11: (high 0, medium 6, low 5)
- defer: 1: (high 0, medium 1, low 0)
- reject: 24: (high 0, medium 0, low 24)
- addressed_findings:
  - `[medium]` `[patch]` La Cita del Día de la portada y del 404 nombraba al Autor de una Cita con Personaje mientras su Página de Cita nombraba al Personaje: `CitaDelDia.astro` recibe el Personaje (obligatorio, `Personaje | undefined`), `index.astro` y `404.astro` se lo pasan del conjunto, y `Atribucion.astro` para la construcción si el Personaje que recibe no es el que la Cita declara (ni otro ni ninguno). Prueba: `pagina-de-personaje.test.ts` (la Cita del Día, única apta, enlaza a `/personaje/b/` en `/` y `/404`).
  - `[medium]` `[patch]` Dos copias del aplanado de Personaje (`aplanarPersonaje` y `personajeDeLosDatos` de `tools/lib/alcance.ts`): una sola, `personajePlano` de `src/lib/publicado.ts`, que usan las dos; se borra la copia de `tools/`.
  - `[medium]` `[patch]` La puerta de NFR-5 y el censo de las series no tenían prueba de que el modelo leído de disco lleve Personajes: `alcance.test.ts` comprueba con `modeloDeLosDatos` que el Personaje sale con `personajePlano`, entra en `rutasPublicadas` y el grafo pide Cita → Personaje, y que un sitio sin esa arista rompe nombrándola; `indexacion.test.ts` da a la igualdad de AD-11 un Personaje publicado (`censo.personaje`).
  - `[medium]` `[patch]` La semblanza de una biografía en la Página de Personaje solo se probaba en su camino de fallo: `pagina-de-personaje.test.ts` construye el Personaje C con biografía literal y fija la atribución visible («Semblanza tomada de «…» en …, revisión N · licencia») bajo `data-pagefind-ignore`.
  - `[medium]` `[patch]` «"frases" solo en el título y la meta de Obra y de Personaje» se probaba solo en una página: `pagina-de-personaje.test.ts` recorre todo el `dist/` de su construcción (sin `<title>` ni `<meta>`, ninguna «frases»; en ellos, solo en `/obra/` y `/personaje/`).
  - `[medium]` `[patch]` Se había quitado la comprobación negativa de que la Página de Cita no nombra al Personaje fuera de la Atribución (frontera de la 35.4): `personajes-build.test.ts` la restituye, quitando solo el enlace de la Atribución.
  - `[low]` `[patch]` La Lista de Obras plegada no se ejercía: el Personaje D dice `MAX_OBRAS_ANTES_DE_LAS_CITAS + 1` Obras y la prueba fija «Y una obra más», sus cuatro enlaces y que toda zona de la sección, también la del Desplegable, es `lista-de-obras`.
  - `[low]` `[patch]` `citasDePersonaje` reescribía el orden de `citasDeAutor`: las dos usan el mismo comparador `porSlug`. Y el comentario de `rutasIndexables` decía lo contrario de lo que hace: corregido.
  - `[low]` `[patch]` El parche de `obra-pagina.test.ts` podía quedar vacuo si cambiaba el fragmento: la prueba exige que la copia parcheada difiera del original. Y la unidad de línea base de la Página de Personaje, `[ASSUMPTION]` del criterio, queda fijada en `superficies.test.ts` (la suya, sin `lineaBase`, distinta de la del Autor).
- rejected (resumen): la Atribución que pone al Personaje en el lugar del Autor es el criterio, y el grafo del modelo no declara Cita → Autor; biografía y `semblanzaPropia` no conviven (esquema, `src/lib/admision.ts:567`); `.universo`, el `h2` «Citas», el JSON-LD sin `name` y la Lista de Obras vacía con pie calcan la Página de Autor por contrato; la cadena `style` de `AtribucionDeSemblanza` (cosmético, y reescribir su marcado arriesga el `dist/` de los Autores con biografía); la doble lectura de `corpus/citas/` al arrancar y la lectura asimétrica de `corpus/personajes/` (el cargador de Astro carga la colección igual); la prueba automática de «sin Personaje, marcado idéntico» es criterio de la 35.4; el suelo de Personaje bajo SM-11 sigue la regla escrita («el suelo de las demás»); guardas de casos que el esquema o el dueño ya impiden (semblanza sin atribución, Personaje sin Citas, «0 frases», Corpus ilegible); el `lastmod` por campos lo fija la relación (`fecha-de-cambio.test.ts`) y sale del mismo historial que las demás familias; tipografía por CSS, «ninguna Cita sin su Personaje» (la Tarjeta no cambia) y el barrido de axe (ya en `deferred`).

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 0, low 2)
- defer: 0
- reject: 40: (high 0, medium 0, low 40)
- addressed_findings:
  - `[low]` `[patch]` El Personaje era opcional (`personaje?: Personaje`) en `Atribucion.astro` y `BloqueDeCita.astro`, así que un uso nuevo que lo olvidara pasaba `astro check` y solo rompía en la guarda el día que le llegara una Cita con Personaje: ahora es obligatorio, `Personaje | undefined`, como en `CitaDelDia.astro` y como `zona`. Todos los usos ya lo pasaban; `astro check` en 0 errores lo fija.
  - `[low]` `[patch]` En `src/lib/publicado.ts`, `porSlug` quedaba entre el JSDoc de `citasDeAutor` y la función, con dos comentarios apilados, y `citasDePersonaje` lo usaba antes de su declaración: `porSlug` se declara antes de `citasDePersonaje` y `citasDeAutor` recupera su comentario.
- rejected (resumen): `.universo` sale en la sans, porque `.ficha` no fija familia y el `body` es sans (solo el `h1` lleva la serif); el `h2` «Citas», el JSON-LD sin `name`, la cadena `style` de `AtribucionDeSemblanza` y la doble lectura de `corpus/citas/` ya se rechazaron en la pasada anterior por las mismas razones; `personajes.get` sin ficha, el Personaje del día sin ficha y la arista Cita → Personaje sin página son inalcanzables tras `verificarIntegridad`; `semblanzaEn` con la superficie cruzada, `resolverAtribuciones` con su valor por omisión, `corpus.personajes ?? []` y una variante futura de `AtribucionDeSemblanza` con `responde` son usos que hoy no existen; la baja de la última Cita de un Personaje la avisa la relación de `--desde`, que sí declara su página, como a la Obra que se queda sin Citas; el suelo de Personaje bajo SM-11 sigue la regla escrita, como se decidió en la pasada anterior; las pruebas de series con una ruta `/personaje/`, del orden del listado, del `lastmod` en el sitemap, del render de `/buscar/` con un Personaje, de la fila del Desplegable en `COLOCACION` y de la guarda de la Atribución en su camino de fallo son huecos de verificación sin defecto (las familias salen de `FAMILIAS` y del censo, y lo demás está fijado en su capa); el comentario de «3 de 55» / «3 de 54» y el `replace` del ancla son de las pruebas, sin efecto en el sitio; FR-38 para el Personaje, el dueño Personaje sobre `dist/`, el barrido de axe y el `diff` de `dist/` contra la base ya están en `deferred` o son decisión aceptada del orquestador; `review_loop_iteration: 0` es el valor que pone el paso 1 a cada pasada nueva; la longitud de los párrafos de `AGENTS.md` es redacción.

## Auto Run Result

Status: done
Blocking condition: ninguna. La pasada anterior quedó bloqueada por el re-troceo del `<style>` de las 192 páginas `/autor/**` (la importación de `Desplegable.astro` desde la Página de Personaje). El orquestador aceptó esa diferencia por delegación de Héctor (Design Notes, Spec Change Log): es la opción 1, el árbol tal como estaba. Capas de revisión externas, sin hallazgos en esta pasada.

Lo demás está construido y verificado:
- `dist/` con el Corpus real: el guion `Busqueda.astro_astro_type_script_index_0_lang.*.js` pasa de 17.353 a 17.375 bytes (+22, el rótulo «Personaje»), bajo `MAX_BYTES_GUION_DE_LA_BUSQUEDA` (18.296) con su trozo; `/buscar/index.html` cambia solo en la referencia al hash. `pagefind/` cambia de nombres de fichero, el no determinismo de Pagefind ya documentado en la 35.2. Ninguna ruta `/personaje/` ni otro fichero cambia.
- `npx astro check`: 0 errores. `npm test` completo (detached, `logs/s-35/test-35.3-2.log`): 164 ficheros, 7.361 pruebas en verde, `huella.test.ts` incluida sin mover la huella. Por fichero, en verde: `pagina-de-personaje` (nuevo), `personajes-build`, `superficies`, `publicado`, `ingreso`, `tipo-de-resultado`, `semblanza`, `fecha-de-cambio`, `indexnow`, `avisar-rango`, `medicion`, `publicable-y-alcanzable`, `tarjeta-de-cita`, `obra-pagina`, `congelacion-de-obras` y las de las series.
- Matriz: «Sin Personajes» y «Cita sin Personaje» por el `diff` de `dist/` (ninguna ruta `/personaje/`, Páginas de Cita idénticas); «Ruta sin lista» y «2+» en `superficies.test.ts` y `pagina-de-personaje.test.ts`; «Obras dichas» y «Obra propia (puro)» en `publicado.test.ts` (`obrasDelPersonaje`, `grafoDelModelo`) y en la construcción; «Modelo en Personaje» en `ingreso.test.ts`.
- No se sembró ningún Personaje real; `vocabulario.ts`, `_bmad-output/planning-artifacts/` y `_bmad-output/specs/` intactos.

### Revisión externa 1 (2026-11-08)

Status: done. Cinco capas externas (blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor); ningún intent_gap ni bad_spec.

- **Cambio:** la Cita del Día de la portada y del 404 nombra al Personaje como su Página de Cita, y `Atribucion.astro` para la construcción si recibe un Personaje que no es el que la Cita declara; un solo aplanado de Personaje (`personajePlano`) para el build y las órdenes; un solo comparador de orden para Autor y Personaje; pruebas nuevas de la puerta de NFR-5 sobre el modelo de disco, del censo de AD-11 con Personaje, de la semblanza de biografía, de la Lista de Obras plegada, de «frases» en todo `dist/`, de la frontera de la 35.4 en la Página de Cita y de la unidad de línea base.
- **Ficheros:** `src/components/Atribucion.astro` (la guarda), `src/components/CitaDelDia.astro`, `src/pages/index.astro`, `src/pages/404.astro` (el Personaje del día), `src/lib/publicado.ts` (`personajePlano`, `porSlug`, comentario), `tools/lib/alcance.ts` (usa `personajePlano`), `tests/unit/{pagina-de-personaje,personajes-build,alcance,indexacion,superficies,obra-pagina}.test.ts`.
- **Hallazgos:** 11 parches (6 medium, 4+1 low), 1 diferido (FR-38 para el Personaje, a la 35.3b), 24 rechazados.
- **Revisión de seguimiento:** recomendada (`true`): parcheados 0 high, 6 medium y 5 low; puntuación 3 × 6 + 5 = 23 ≥ 5.
- **Verificación:** `npx astro check` 0 errores; por fichero, en verde: `pagina-de-personaje`, `personajes-build`, `obra-pagina`, `alcance`, `indexacion`, `superficies`; `npm test` completo (detached, `logs/s-35/npm-test-triage-35.3-1.log`): 164 ficheros, 7.367 pruebas, EXIT 0. `npm run build` con el Corpus real y `FECHA_JORNADA=2026-11-08` (`logs/s-35/build-triage-35.3-1.log`) frente al `dist/` de la pasada anterior: `diff -rq` sin ninguna diferencia fuera de `pagefind/`; NFR-5 y la coincidencia de indexables en verde.
- **Riesgos:** la `dist/` de referencia era la de la construcción anterior de este árbol (21:03), no una de la base; las diferencias aceptadas frente a la base no se volvieron a medir. Sigue el diferido de FR-38 y los de la pasada anterior.

### Revisión externa 2 (2026-11-08)

Status: done. Cinco capas externas (blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor); ningún intent_gap ni bad_spec. Última ronda, proporcionada.

- **Cambio:** el Personaje pasa a ser prop obligatoria (`Personaje | undefined`) de `Atribucion.astro` y `BloqueDeCita.astro`, para que `astro check` señale el uso que la olvide antes de que la guarda rompa la construcción; `porSlug` se declara antes de su primer uso y `citasDeAutor` recupera su comentario.
- **Ficheros:** `src/components/Atribucion.astro`, `src/components/BloqueDeCita.astro` (prop obligatoria), `src/lib/publicado.ts` (orden de `porSlug` y comentarios).
- **Hallazgos:** 2 parches (0 high, 0 medium, 2 low), 0 diferidos, 40 rechazados.
- **Revisión de seguimiento:** no recomendada (`false`): parcheados 0 high, 0 medium y 2 low; puntuación 3 × 0 + 2 = 2 < 5.
- **Verificación:** `npx astro check` 0 errores (431 ficheros); `npm test` completo (detached, `logs/s-35/npm-test-triage-35.3-2.log`): 164 ficheros, 7.367 pruebas, EXIT 0.
- **Riesgos:** los de la pasada anterior (FR-38 del Personaje a la 35.3b, dueño Personaje sobre `dist/` a la 35.4, barrido de axe de Héctor); los cambios de esta pasada son de tipos y de orden de declaraciones, sin efecto en `dist/`.
