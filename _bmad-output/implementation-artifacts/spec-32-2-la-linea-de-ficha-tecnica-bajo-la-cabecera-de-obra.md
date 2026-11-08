---
title: 'La línea de Ficha técnica bajo la cabecera de Obra'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_revision: '6041a380c5d70617b8ef63f1200691d0c49a1460'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-32-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-32-1-revisiones-fijas-de-wikidata-versionadas-y-la-orden-que-ata.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** La 32.1 versiona revisiones fijas de Wikidata y el cargador `fichasTecnicas` ya extrae `{generos, lenguas, año?}` por ficha, pero ninguna página lo pinta: el visitante de una Página de Obra no sabe qué clase de obra tiene delante, ni cuándo se publicó ni en qué lengua se escribió, y la relación de superficies (AD-27) no fecha ni avisa nada de Wikidata.

**Approach:** `src/lib/obras.ts` recibe por parámetro la Ficha técnica del cargador y la cuelga de la Obra resuelta; la página 1 de la Obra pinta bajo «de {Autor} · {año}» una línea «Novela · 1605 · Escrita en español · Traducción de X · Datos: Wikidata, CC0» compuesta por `src/lib/atribucion.ts`, con el traductor de `traductorDeLaEdicionQueEncabeza` (nueva, pura); el build avisa «Ficha técnica con año discrepante»; y `corpus/wikidata/` entra en la relación de fechas y avisos. Con el Corpus real (ninguna ficha declara `wikidata`) `dist/` no cambia ni un byte.

## Boundaries & Constraints

**Always:**
- Texto de la línea (UX-DR126, `[ASSUMPTION]` revisable por Héctor con `bmad-ux`): partes en orden fijo, solo las que consten: géneros unidos por «, » con mayúscula inicial solo en el primer carácter de la parte (`toLocaleUpperCase('es')`; el resto, la etiqueta tal cual); el año con `añoLegible` de `src/lib/atribucion.ts` (negativo → «49 a. C.»); «Escrita en {lenguas}», con las lenguas unidas como enumeración española (dos: «A y B»; tres o más: «A, B y C»); si hay traductor, «Traducción de {traductor}»; y siempre al final el enlace «Datos: Wikidata, CC0». Separadores: `<span aria-hidden="true"> · </span><span class="solo-para-lectores">, </span>` (el patrón de `p.de` de la Cabecera).
- Hay línea solo si la Obra tiene `fichaTecnica` **y** al menos uno de género, año o lengua; el traductor solo no basta. Sin ella: ningún elemento, rótulo ni hueco. Solo en la página 1; las 2+ no cambian.
- El enlace va a `enlace` (el permanente `https://www.wikidata.org/w/index.php?title={Q}&oldid={N}` que entrega el cargador con `enlacePermanenteDeWikidata` — único dueño), misma pestaña (sin `target`), siena, subrayado siempre, inline (exento de zona de toque), sin `data-zona` ni `data-sin-zona` (es externo).
- Presentación: `{typography.caption}` = `--pie`/`--interlineado-pie`, Inter (`--sans`), `--tinta-apagada`; margen superior `--unidad` desde `p.de`; `overflow-wrap: anywhere` para no desbordar a 320 px. **Sin bloque `<style>` en el componente ni en la página**: Astro emite los estilos por el grafo de importaciones aunque no se pinte nada y `dist/` cambiaría con el Corpus real; se usan atributos `style` con tokens, como `Sostener.astro` (`tests/unit/tipografia-en-tokens.test.ts` los vigila).
- El contenedor de la línea lleva `data-pagefind-ignore="all"`. El JSON-LD (`DatosDeObra.astro`) no cambia. La línea no recibe nada de `src/lib/ingreso.ts`: idéntica con la afiliación encendida o apagada.
- `traductorDeLaEdicionQueEncabeza(citas: readonly CitaParaDondeLeer[]): string | undefined` en `src/lib/obras.ts`, vecina de `dondeLeer`, pura: agrupa las Citas **con Fuente** solo por `fuente.id` (sumando todos sus traductores), elige la de más Citas con el desempate de `dondeLeer` (rótulo de la Fuente con `localeCompare('es')`, y si persiste, `id`); el rótulo se calcula con un ayudante privado compartido con `dondeLeer`, sin duplicar la regla. Devuelve el traductor solo si **todas** las Citas de esa Fuente declaran `procedencia.traduccion.traductor` y es el mismo; si no, o sin Cita con Fuente, `undefined`. Nunca de la entidad.
- Fechas (AD-27): Página de Obra compone el documento `corpus/wikidata/{Q}--r{N}.json` de su ficha (cualquier cambio) y `corpus/wikidata/vigentes.yml` **solo con las claves** de las entidades que pinta (P136 y P407 con las reglas de rango; P50 no se pinta), y `wikidata` de la ficha pasa a `CAMPOS_QUE_PINTA.obra.obra`. Si el documento no se deja leer, compone `vigentes.yml` con `CUALQUIER_CAMBIO` (fechar de más antes que de menos); leer el Corpus para fechar nunca lanza por esto.
- La portada no se avisa por un cambio que solo toque `corpus/wikidata/` (como con `documento`): no pinta nada de Wikidata.

**Block If:**
- Hiciera falta tocar `src/lib/vocabulario.ts`, ampliar `EXCEPCIONES` de AD-22, una zona nueva, editar `_bmad-output/planning-artifacts/`/`_bmad-output/specs/`, o atar una entidad real / escribir en `corpus/wikidata/` del árbol.

**Never:**
- Atar ninguna entidad del Corpus real ni recuperar nada de Wikidata desde el árbol.
- Retirar el salto «Dónde leer esta obra ↓», plegar «Dónde leer», incipit o «Cómo citar» (32.3–32.5). La línea va dentro de `header.cabecera-de-obra`, tras `p.de` y antes de `p.salto`.
- Completar la línea con datos de otra Cita, de la Cabecera o de la entidad (traductor); corregir ninguno de los dos años.
- Llamar a `getCollection('fichasTecnicas')` si ninguna ficha declara `wikidata` (una colección vacía avisa en cada construcción).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Completa | géneros [novela], año 1605, lenguas [español] | «Novela · 1605 · Escrita en español · Datos: Wikidata, CC0»; el lector oye comas | — |
| Varios | géneros [novela, sátira], lenguas [latín, griego antiguo] | «Novela, sátira · … · Escrita en latín y griego antiguo» | — |
| Parcial | solo lenguas [español] | «Escrita en español · Datos: Wikidata, CC0» | — |
| Antes de Cristo | año -49 | «49 a. C.» | — |
| Vacía | entidad atada, sin campos con etiqueta `es` y sin año | sin línea ni hueco | — |
| Sin entidad | ficha sin `wikidata` | página idéntica a la de hoy | — |
| Traducida | Fuente que encabeza con todas sus Citas de «Juan Pérez» | «… · Traducción de Juan Pérez · Datos: …» | — |
| Traductor no común | esa Fuente con Citas de dos traductores, o alguna sin traductor | sin «Traducción de» | — |
| Empate de Fuentes | dos Fuentes con las mismas Citas | gana la de rótulo menor (`es`) | — |
| Sin cotejada | ninguna Cita con Fuente | `undefined` | — |
| Año discrepante | Wikidata 1605, Obra 1604 | build avisa «Ficha técnica con año discrepante», nombra la ficha y los dos años; línea 1605, Cabecera 1604 | aviso, no rompe |
| Página 2+ | Obra con > `CITAS_POR_PAGINA` (50) Citas | `/2/` sin línea | — |

</intent-contract>

## Code Map

- `tools/lib/wikidata.ts` -- `FichaTecnicaDeObra` (l. 683) gana `enlace` (de `enlacePermanenteDeWikidata`, l. 92) en `leerFichasTecnicasDelCorpus` (l. 695, `salida.set` ~l. 750). Nueva exportación `entidadesQuePinta(datos)` = P136 + P407 con `entidadesDe` (vecina de `entidadesReferidas`, l. 414). `obrasQueRemitenA` no cambia.
- `src/content.config.ts` l. 423–432 -- esquema de `fichasTecnicas` añade `enlace: z.string().url()`.
- `src/lib/obras.ts` -- tipo `FichaTecnicaDeObra` propio (src no importa de `tools/lib/`): `{entidad, revision, generos, lenguas, año?, enlace}`; `ObraResuelta` (l. 733) gana `fichaTecnica?`; `resolverObras` (l. 824) y `colgarObras` (l. 878) ganan tercer parámetro opcional `fichasTecnicas: ReadonlyMap<string, FichaTecnicaDeObra>` (por nombre de ficha; se omite el campo si no hay entrada); `traductorDeLaEdicionQueEncabeza` junto a `dondeLeer` (l. 1338), con ayudante privado del rótulo de grupo extraído de `dondeLeer` (l. 1363–1365; `rotuloDeFuente` l. 1194, `valorComun` l. 1239, `paginaNormalizada`); `avisosDeAñoDeFichaTecnica(obras, fichasTecnicas, rutaDeFicha)` junto a `avisosDeAñosDeObras` (l. 899), mismo formato «  · Ficha técnica con año discrepante: {ruta} → Wikidata dice {a}; sus Citas, {b}. …».
- `src/lib/publicado.ts` -- `aplanarFichaDeObra` (l. 1431) copia `wikidata` (hoy lo pierde); `conjuntoPublicable` (l. 1547–1558) lee `getCollection('fichasTecnicas')` solo si alguna ficha declara `wikidata` y lo pasa a `colgarObras`.
- `src/lib/atribucion.ts` -- `partesDeFichaTecnica(ficha, traductor?)` → `string[] | undefined` (las partes de texto sin el enlace; `undefined` si no hay ningún campo) y `TEXTO_DATOS_DE_WIKIDATA = 'Datos: Wikidata, CC0'`; reutiliza `añoLegible` (l. 231).
- `src/components/FichaTecnica.astro` (nuevo) -- `<p>` con `data-pagefind-ignore="all"`, partes con los separadores ocultos, enlace final; solo atributos `style` con tokens; props `obra` (con `fichaTecnica`) y `traductor: string | undefined` (obligatoria, sin `?`).
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- `getStaticPaths` (l. 83–86): calcular `traductorDeLaEdicionQueEncabeza(citas)` y pasarlo solo a la página 1 junto a `dondeLeer`; en el `header` (tras `p.de`, l. ~150) `{primera && <FichaTecnica …/>}` (el componente no pinta nada sin partes). Comentario de cabecera del fichero al día.
- `integraciones/obras.ts` (l. 110–120) -- añade `avisosDeAñoDeFichaTecnica`: lee con `leerFichasTecnicasDelCorpus(join(raiz,'corpus'))` dentro de `try`; si lanza, no añade avisos (el cargador rompe el build con su mensaje); las Obras resueltas con `resolverObras(citas, fichas)`.
- `tools/lib/avisar.ts` l. 38–45 -- `['corpus/wikidata', 'wikidata']` en `FAMILIAS_DE_FICHERO` (ampliar el tipo del `satisfies`); l. 184: la portada no se avisa si todos los cambios son `documento` o `wikidata`. Cabecera del módulo al día.
- `tools/lib/cambios.ts` -- `CAMPOS_QUE_PINTA` (l. 259): `obra.obra` añade `'wikidata'` y familia `wikidata: { obra: CUALQUIER_CAMBIO }`; `CAMPOS_QUE_NO_FECHAN.obra` (l. 319) queda `['distintaDe']` y su comentario (l. 306) se retira; `ObraParaFechar` (l. 351) gana `wikidata?: { documento: string; pinta?: readonly string[] }` (`pinta` ausente = no se pudo leer); `CorpusParaFechar` (l. 386) gana `vigentesDeWikidata?: string`; en `relacionDeSuperficies`, bucle de la Página de Obra (l. 585–603): `componer(ruta, obra.wikidata.documento, 'wikidata')` y `componerCampos(ruta, corpus.vigentesDeWikidata, obra.wikidata.pinta ?? CUALQUIER_CAMBIO)` (l. 493); `conRutas` (l. 789) y `ficherosDelCorpus` (l. 812) traducen/incluyen el documento y `vigentes.yml`. Cabecera (l. 24–50) y comentario de la tabla (l. 240–258) al día.
- `integraciones/historial.ts` `corpusParaFechar` (l. 430–478) -- por ficha con `wikidata`: ruta de su documento (`nombreDeDocumentoDeWikidata` en `rutas.wikidata`) y `pinta` con `documentoDeLaCarpeta` + `entidadesQuePinta` (sin lanzar); `vigentesDeWikidata: resolve(rutas.vigentesDeWikidata)`. `analizarVersion` (l. 237) ya trata `.json` como opaco y `vigentes.yml` como YAML: no tocar. `tools/avisar.ts` extrae `corpus/wikidata` solo por estar en `FAMILIAS_DE_FICHERO`: comprobar, no tocar.
- `tests/unit/wikidata-build.test.ts` -- la prueba «válida … sin rastro en dist» pasa a: las etiquetas y la entidad aparecen solo en la página 1 de esa Obra (no en `/2/`, ni en otra superficie, ni en el JSON-LD, ni en `dist/pagefind/`).
- `tests/unit/ayuda/wikidata.ts` (`entidad`, `aEntidad`, `aTiempo`, `documento`) y `tests/unit/ayuda/construir.ts` (`construirConCorpus`, `citaValida`, `fuenteConModeloEncendido`, `fuenteConTiendaDePrueba`) -- reutilizar.
- `tests/e2e/ingreso-accesible.spec.ts` -- patrón para un e2e con corpus de prueba, servidor propio en puerto fijo, `test.describe.configure({ mode: 'serial' })`, axe.
- Título más largo del Corpus real (177 caracteres, Larra): `corpus/obras/mariano-jose-de-larra--primera-representacion-del-drama-episodico-…-ventura-de-la-vega.yml`.

## Tasks & Acceptance

**Execution:**
- `tools/lib/wikidata.ts`, `src/content.config.ts` -- `enlace` en la Ficha técnica del cargador; `entidadesQuePinta` -- un dueño del permanente y de lo que se pinta.
- `src/lib/obras.ts`, `src/lib/publicado.ts` -- tipo, colgado por parámetro, `traductorDeLaEdicionQueEncabeza`, `avisosDeAñoDeFichaTecnica`; `aplanarFichaDeObra` con `wikidata` -- AD-5, AD-28, AD-31.
- `src/lib/atribucion.ts`, `src/components/FichaTecnica.astro`, página de Obra -- la línea -- UX-DR126.
- `integraciones/obras.ts` -- el aviso de año -- FR-60.
- `tools/lib/avisar.ts`, `tools/lib/cambios.ts`, `integraciones/historial.ts` -- familia y relación -- AD-27.
- `tests/unit/ficha-tecnica.test.ts` (nuevo, puro) -- `partesDeFichaTecnica` (cada fila de texto de la matriz, `undefined` sin campos), `traductorDeLaEdicionQueEncabeza` (un traductor; dos traductores; Citas sin traductor; dos Fuentes empatadas; sin Cita cotejada; Fuente que gana sumando dos traductores frente a otra con más Citas en un solo grupo de `dondeLeer`), `avisosDeAñoDeFichaTecnica` (discrepa, coincide, falta uno de los dos), `colgarObras` con y sin el mapa (sin entrada, el campo se omite).
- `tests/unit/ficha-tecnica-build.test.ts` (nuevo, construye) -- fixture con >50 Citas de una Obra atada (traducida) y una Obra atada sin campos: orden y texto de la línea, `aria-hidden` y `solo-para-lectores`, `href` permanente sin `target`, sin `data-zona`, dentro del `header` tras `p.de`, `data-pagefind-ignore="all"`, ausente en `/2/` y en la Obra vacía, JSON-LD sin etiquetas ni Wikidata, aviso «Ficha técnica con año discrepante» en la salida del build sin romper, y el `<p>` de la línea byte a byte igual en una segunda construcción con la afiliación encendida y una tienda de prueba.
- `tests/unit/fecha-de-cambio.test.ts` -- atar una entidad (ficha + documentos nuevos) fecha y avisa solo esa Obra (`rutasAvisadasPor`) y no la portada si solo cambia `corpus/wikidata/`; cambiar en `vigentes.yml` la revisión de un género fecha y avisa toda Obra que lo pinta y ninguna otra superficie (ni Página de Cita); cambiar la de su autor (P50) no fecha nada; documento ilegible → fecha con cualquier cambio de `vigentes.yml`; `wikidata` clasificado en la tabla.
- `tests/unit/wikidata-build.test.ts` -- ajustar como dice el Code Map.
- `tests/e2e/ficha-tecnica.spec.ts` (nuevo, puerto 4405: 4402 es de `ingreso-accesible`, 4403 de `busqueda-historial`, 4404 de `desplegable`) -- construye una copia con una Obra atada cuyo título es el de Larra (177 caracteres), dos géneros, año, dos lenguas y traductor: axe sin infracciones en su página 1; a 360 × 640 el borde superior de la primera Tarjeta del listado < 640 px (y se anota la medida); a 320 px `scrollWidth <= clientWidth`.
- `AGENTS.md` § «Las fichas de Obra» -- en el párrafo de `wikidata` de la 32.1: la línea que se pinta, el traductor por `traductorDeLaEdicionQueEncabeza`, el aviso de año, y que la Página de Obra se fecha por su documento y por las claves de `vigentes.yml` que pinta.
- Este spec -- anotar en Design Notes la medida de la primera pantalla tomada por el e2e.

**Acceptance Criteria:**
- Given el Corpus real (ninguna ficha con `wikidata`), when se construye la rama y su base con la misma `FECHA_JORNADA`, then `dist/` es idéntico salvo los cinco ficheros que rotan y los ficheros de filtro de Pagefind que no se reproducen entre pasadas (32.1), y el build no pide red ni avisa de una colección vacía.
- Given una Página de Obra con Ficha técnica construida con fixtures, when corren Vitest y `tests/e2e/ficha-tecnica.spec.ts`, then la línea sale con su orden, su traductor y su enlace, axe no da infracción, y la primera Cita de la Obra de título más largo empieza dentro de los 640 px a 360 de ancho.
- Given `tests/unit/medicion.test.ts`, `tests/unit/tipografia-en-tokens.test.ts`, `tests/unit/orden-del-libro.test.ts` y `npx astro check`, when se ejecutan, then pasan sin zona nueva, sin literal tipográfico y sin otro `src/` que importe de `tools/lib/`.

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

(Entrada escrita al cerrar la implementación, antes de que las capas externas del orquestador v9-ralph devolvieran hallazgos: no registra ninguna revisión. La primera pasada de revisión real es la siguiente.)

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 7 (high 0, medium 1, low 6)
- defer: 0
- reject: 25
- addressed_findings:
  - `[medium]` `[patch]` (verification-gap, intent-alignment e) El cableado de `corpusParaFechar` con una ficha atada no lo ejercía ninguna prueba desde el disco y git: nuevo bloque «Historia 32.2 — la Ficha técnica fecha su Página de Obra desde el disco» en `tests/unit/fecha-de-cambio.test.ts`, con un repositorio real (ficha atada, documentos de `corpus/wikidata/`, `vigentes.yml`) y `fechasDeLasSuperficies`: la vigente de un género refecha la Obra, la del autor (P50) no, ninguna refecha la Cita ni el Autor, y un cambio del documento de la revisión refecha la Obra. Comprobado que quitar el reparto de `wikidata` en `obras[]` la tumba.
  - `[low]` `[patch]` (blind-hunter, edge-case-hunter) Dos entidades con la misma etiqueta repetían texto («Novela, novela»): `partesDeFichaTecnica` quita las etiquetas repetidas (sin distinguir mayúsculas, en el orden de la revisión), con su caso en `tests/unit/ficha-tecnica.test.ts`.
  - `[low]` `[patch]` (edge-case-hunter) El aviso «Ficha técnica con año discrepante» escribía «-49»: ahora usa `añoLegible`, como la línea («49 a. C.»), con su caso.
  - `[low]` `[patch]` (blind-hunter, verification-gap) `ficherosQueContienen` de `tests/unit/wikidata-build.test.ts` leía los `pf_*` de Pagefind sin descomprimir: ahora los descomprime con `gunzipSync`, y el comentario ya no afirma que esa construcción (sin `conBusqueda`) mire Pagefind; lo fija `ficha-tecnica-build.test.ts`.
  - `[low]` `[patch]` (blind-hunter) La fecha por las claves de `vigentes.yml` usa el documento de la revisión que la ficha declara hoy: anotado como límite conocido en AGENTS.md («Lo que la relación todavía no compone»).
  - `[low]` `[patch]` (ac-auditor) «La Fuente que encabeza no es una traducción» no tenía caso propio en Vitest: añadido.
  - `[low]` `[patch]` (blind-hunter) La entrada anterior de este registro daba por hecha una revisión que no había ocurrido: anotada como tal arriba.

## Design Notes

- **Por qué atributos `style`**: el brief y la regla de AGENTS.md sobre `Sostener.astro`: un `<style>` del componente entraría en la hoja de toda Página de Obra (y quizá en un `_astro/*.css` compartido, cambiando su hash en todo el sitio) con el Corpus real sin ninguna línea.
- **Traductor por Fuente, no por grupo de `dondeLeer`**: el AC suma los traductores de una Fuente; si esa Fuente mezcla traductores no hay línea de traducción aunque `dondeLeer` encabece con uno de sus grupos. Es lo que pide FR-48 (nunca atribuir un traductor que no es de todas sus Citas).
- **`vigentes.yml` por claves**: es un mapa YAML `Q: N` que `analizarVersion` ya analiza, así que `cambiaronLosCampos` con las claves pintadas fecha exactamente las Obras de esa entidad; los documentos de las referidas son inmutables (un fichero por revisión) y no hace falta componerlos.
- **Medida de la primera pantalla** (`tests/e2e/ficha-tecnica.spec.ts`, 2026-11-08): a 360 × 640, con el título de Larra (177 caracteres), el nombre «Mariano José de Larra», dos géneros de etiqueta larga, año, dos lenguas y traductor, el borde superior de la primera Tarjeta del listado queda a **599,5 px** (antes de la línea, 514 px según el contexto de la épica): 40,5 px de margen. Lo que añadan entre la Cabecera y el listado los desplegables cerrados de la 32.3–32.5 (y lo que quite el salto retirado) lo miden ellas.
- Ejemplo de marcado (orientativo):
  ```astro
  <p data-pagefind-ignore="all" style={LINEA}>Novela<span aria-hidden="true"> · </span><span class="solo-para-lectores">, </span>1605<span aria-hidden="true"> · </span><span class="solo-para-lectores">, </span><a href={enlace} style={ENLACE}>Datos: Wikidata, CC0</a></p>
  ```

## Verification

**Commands:**
- `npx vitest run tests/unit/ficha-tecnica.test.ts` -- verde.
- `npx vitest run tests/unit/ficha-tecnica-build.test.ts tests/unit/wikidata-build.test.ts` -- verde.
- `npx vitest run tests/unit/fecha-de-cambio.test.ts tests/unit/indexnow.test.ts tests/unit/medicion.test.ts tests/unit/tipografia-en-tokens.test.ts tests/unit/orden-del-libro.test.ts tests/unit/obras.test.ts tests/unit/wikidata.test.ts` -- verde.
- `npx astro check` -- 0 errores.
- `npx playwright test tests/e2e/ficha-tecnica.spec.ts --project=escritorio` (y el proyecto móvil si el fichero lo usa) -- verde; anotar la medida.
- `FECHA_JORNADA=2026-11-08 npm run build` en la rama y en la base (`git worktree add --detach` bajo `.claude/v9-ralph/tmp-wt/`), comparar sumas de `dist/` -- sin diferencias salvo lo dicho en el primer AC.
- `npm test` (largo, con `correr.sh`) -- verde.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** La página 1 de una Obra atada a Wikidata pinta, dentro de `header.cabecera-de-obra` tras `p.de`, la línea «Novela · 1605 · Escrita en español · Traducción de X · Datos: Wikidata, CC0» (solo las partes que constan; sin género, año ni lengua, nada). La Ficha técnica viaja del cargador `fichasTecnicas` (ahora con `enlace`) a la Obra resuelta por parámetro de `colgarObras`/`resolverObras`; el traductor sale de `traductorDeLaEdicionQueEncabeza` (nueva, pura, con el rótulo de grupo compartido con `dondeLeer`); el build avisa «Ficha técnica con año discrepante»; y `corpus/wikidata/` es familia de fichero `wikidata` que fecha y avisa solo la Página de Obra (su documento, cualquier cambio; `vigentes.yml`, por las claves que pinta; todo si el documento no se lee), sin avisar la portada. Con el Corpus real `dist/` no cambia.

**Ficheros.**
- `tools/lib/wikidata.ts` — `enlace` en `FichaTecnicaDeObra`; `entidadesQuePinta` (P136 + P407).
- `src/content.config.ts` — `enlace` en el esquema de `fichasTecnicas`.
- `src/lib/obras.ts` — tipo `FichaTecnicaDeObra`, `ObraResuelta.fichaTecnica`, tercer parámetro de `resolverObras`/`colgarObras`, `traductorDeLaEdicionQueEncabeza`, `rotuloDeGrupo` (privado, compartido con `dondeLeer`), `avisosDeAñoDeFichaTecnica`.
- `src/lib/publicado.ts` — `aplanarFichaDeObra` copia `wikidata`; `conjuntoPublicable` lee `fichasTecnicas` solo si alguna ficha está atada.
- `src/lib/atribucion.ts` — `partesDeFichaTecnica`, `TEXTO_DATOS_DE_WIKIDATA`.
- `src/components/FichaTecnica.astro` (nuevo) — la línea, con atributos `style` y sin `<style>`.
- `src/pages/obra/[autor]/[slug]/[...page].astro` — traductor a la página 1 y la línea en la Cabecera.
- `integraciones/obras.ts` — el aviso de año.
- `integraciones/historial.ts` — documento y `pinta` por ficha atada; `vigentesDeWikidata`.
- `tools/lib/avisar.ts`, `tools/lib/cambios.ts` — familia `wikidata`, `wikidata` en `CAMPOS_QUE_PINTA.obra.obra`, composición de la Página de Obra, portada sin aviso.
- `tests/unit/ficha-tecnica.test.ts`, `tests/unit/ficha-tecnica-build.test.ts`, `tests/e2e/ficha-tecnica.spec.ts` (nuevos); `tests/unit/fecha-de-cambio.test.ts`, `tests/unit/indexnow.test.ts`, `tests/unit/wikidata-build.test.ts` (al día).
- `AGENTS.md` — la línea, el traductor, el aviso y la fecha, en el párrafo de `wikidata`.

**Revisión.** 0 patches, 0 diferidos, 0 rechazados (capas externas sin hallazgos en esta pasada). Seguimiento: `false` (0 high, 0 medium, 0 low; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/ficha-tecnica.test.ts` — 18 en verde.
- `npx vitest run tests/unit/ficha-tecnica-build.test.ts tests/unit/wikidata-build.test.ts` — verde (8 + 3).
- `npx vitest run tests/unit/fecha-de-cambio.test.ts tests/unit/indexnow.test.ts tests/unit/medicion.test.ts tests/unit/tipografia-en-tokens.test.ts tests/unit/orden-del-libro.test.ts tests/unit/obras.test.ts tests/unit/wikidata.test.ts` — verde (tras poner al día en `indexnow.test.ts` la lista de `FAMILIAS_DE_FICHERO`).
- `npx astro check` — 0 errores, 0 avisos.
- `npx playwright test tests/e2e/ficha-tecnica.spec.ts --project=escritorio` — 3 en verde; primera Tarjeta a 599,5 px de 640.
- `FECHA_JORNADA=2026-11-08 npm run build` en la rama y en la base (6041a380c5, worktree desprendido en `.claude/v9-ralph/tmp-wt/`, ya retirado): 15.370 ficheros; solo difieren 8 `pagefind/filter/*.pf_filter`, los dos `pf_meta` y `pagefind-entry.json` que los nombran (los filtros que no se reproducen entre pasadas, 32.1); sin aviso de colección vacía ni de año.
- `npm test` — 159 ficheros, 7.296 pruebas en verde.

**Riesgos residuales.** La línea mide 599,5 px de primera pantalla en el peor caso construido; las 32.3–32.5 añaden desplegables y deben volver a medir. El texto (UX-DR126) sigue siendo `[ASSUMPTION]` revisable por Héctor con `bmad-ux`. Ninguna ficha real está atada: atar es acto de Héctor.

### Primera pasada de revisión (2026-11-08)

**Resumen.** Siete patches sobre los hallazgos de las cinco capas externas; ningún bad_spec ni intent_gap; nada diferido; 25 rechazados (lo que el contrato fija a propósito —orden de la línea con el traductor antes del crédito, los dos años sin rótulo, el traductor por Fuente frente al grupo de «Dónde leer», el aviso de año sin romper—, coste o estilo sin consecuencia —dos lecturas del Corpus, `opacos`, condición redundante, números de línea del Code Map— y huecos de prueba de presentación que el contrato no pide).

**Ficheros.**
- `src/lib/atribucion.ts` — `partesDeFichaTecnica` quita etiquetas repetidas (`sinEtiquetasRepetidas`).
- `src/lib/obras.ts` — el aviso de año escribe los años con `añoLegible`.
- `tests/unit/fecha-de-cambio.test.ts` — la Ficha técnica fecha su Página de Obra desde el disco y git (`corpusParaFechar` + `fechasDeLasSuperficies`).
- `tests/unit/ficha-tecnica.test.ts` — etiquetas repetidas, aviso antes de Cristo, Fuente que no es traducción.
- `tests/unit/wikidata-build.test.ts` — los `pf_*` se descomprimen; el comentario ya no afirma que esa construcción mire Pagefind.
- `AGENTS.md` — límite conocido de la fecha por `vigentes.yml` con el documento de hoy.

**Seguimiento.** `true`: patches 0 high, 1 medium, 6 low; puntuación 3 × 1 + 6 = 9 ≥ 5.

**Verificación.** `npx vitest run tests/unit/ficha-tecnica.test.ts tests/unit/fecha-de-cambio.test.ts tests/unit/obras.test.ts tests/unit/wikidata.test.ts tests/unit/indexnow.test.ts` — 293 en verde; `npx vitest run tests/unit/ficha-tecnica-build.test.ts tests/unit/wikidata-build.test.ts tests/unit/medicion.test.ts tests/unit/tipografia-en-tokens.test.ts tests/unit/orden-del-libro.test.ts` — 762 en verde; `npx astro check` — 0 errores, 0 avisos; `npx playwright test tests/e2e/ficha-tecnica.spec.ts --project=escritorio` — 3 en verde, primera Tarjeta a 599,5 px de 640; `npm test` — 159 ficheros, 7.301 pruebas en verde. La comparación de `dist/` con la base no se repitió: ningún patch toca lo que se pinta sin ficha atada.

**Riesgos residuales.** Los de arriba, más: el orden «Traducción de X · Datos: Wikidata, CC0» y los dos años sin rótulo cuando discrepan son del texto de UX-DR126, `[ASSUMPTION]` que revisa Héctor con `bmad-ux`.
