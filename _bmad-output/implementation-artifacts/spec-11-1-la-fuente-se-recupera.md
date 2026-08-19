---
title: 'Story 11.1 — La Fuente se recupera, y su metadato sale del documento'
type: 'feature'
created: '2026-08-19'
status: 'ready-for-dev'
baseline_revision: 'f92943e0c63eb3d527104ab9c2ac6881b9ad7732'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Hoy `tools/extraer.ts` recibe la obra, el año y la URL en un YAML escrito a mano. Quien siembra puede teclear una Procedencia que la Fuente no dice, y nada lo detecta. Abrir el sembrado a un agente con ese hueco abierto convierte la promesa del producto —procedencia comprobada— en una declaración de confianza.

**Approach:** Una orden nueva recupera el documento de la Fuente por su URL, lo versiona como texto plano en `corpus/fuentes/`, y deriva de él la obra, el año y la licencia. La extracción deja de aceptar metadato tecleado y pasa a leer el documento versionado. Lo que hace segura la apertura no es confiar en quien ejecuta: es que el metadato no tenga por dónde entrar a mano.

## Boundaries & Constraints

**Always:**
- La red vive **solo** en la cáscara exterior de `tools/` — en la orden nueva y en ninguna otra parte. `tools/lib/`, `src/lib/`, el esquema y las páginas son puros sobre datos ya recuperados (AD-22).
- Ningún paso del build descarga nada. `npm run build` sigue funcionando sin red.
- Un documento por par (Fuente, obra), en `corpus/fuentes/{id-de-fuente}--{slug-de-obra}.txt`, texto plano sin marcado (AD-23).
- El año solo se escribe si consta **exacto** en el documento. Reutilizar `añoExacto` de `tools/lib/extraccion.ts`.
- Un campo opcional sin valor se **omite**; nunca cadena vacía ni `null`.
- La licencia sale de la entrada de `FUENTES` que corresponde a la URL, no de un argumento.

**Block If:**
- Cumplir un criterio exigiera que `src/lib/` o el build hicieran una petición de red.

**Never:**
- No mapear la fecha de publicación de Project Gutenberg («Release Date») al año de la obra: es cuándo Gutenberg publicó el fichero, no cuándo se escribió la obra. Escribirlo ahí es la Procedencia inferida que FR-2 prohíbe. Sin año exacto, la candidata queda con obra y sin año — procedencia parcial es un estado legítimo.
- No aceptar `--obra`, `--año` ni `--licencia` en ninguna orden.
- No tocar `corpus/citas/`: la extracción sigue escribiendo solo en `corpus/_revision/`.
- No implementar el cotejo del texto contra el documento — eso es la Historia 11.2.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| URL admitida, obra nueva | URL de `wikisource-es` o `gutenberg` | Descarga, retira el marcado y escribe `corpus/fuentes/{id}--{slug-obra}.txt` con cabecera de metadato y cuerpo en texto plano | Sin error |
| URL no admitida | URL de un dominio fuera de `FUENTES` | No escribe documento y **no produce candidatas**; explica que el conjunto es cerrado | Código de salida ≠ 0 |
| Fuente admitida sin reutilización | URL de `cervantes-virtual` | No escribe nada; explica que su licencia excluye el uso comercial | Código de salida ≠ 0 |
| Obra ya versionada | El `.txt` de esa obra ya existe | Reutiliza el existente, no vuelve a descargar y no añade una segunda copia | Sin error |
| Documento sin obra derivable | La página no declara título | No escribe documento; sin obra la Procedencia habría que inferirla | Código de salida ≠ 0 |
| Año aproximado o ausente | «c. 1615», «1615?», o nada | Documento escrito **sin** campo de año; la candidata queda con obra y sin año | Sin error |
| Extracción sobre documento versionado | `.txt` recuperado + `--autor` | Candidatas en `corpus/_revision/` con obra, año y licencia salidos del documento | Sin error |

</intent-contract>

## Code Map

- `tools/lib/fuentes.ts` -- conjunto cerrado `FUENTES` (`id`, `nombre`, `licencia`, `permiteReutilizacion`, `razon`) y `fuenteDe(id)`. **Ampliar** con los anfitriones de cada Fuente y `fuenteDeUrl(url)`. Puro y sin red.
- `tools/lib/extraccion.ts` -- puro. `DocumentoDeFuente`, `extraerCandidatas`, `añoExacto` (rechaza aproximaciones), `estaEnEspañol`, ventana `MIN/MAX_CARACTERES_CANDIDATA`. **Reutilizar tal cual.**
- `tools/extraer.ts` -- cáscara actual: lee un YAML escrito a mano y escribe candidatas en `rutas.revision` con `nombreDeFicheroDeCita` y `slugLibre`. **Modificar**: consume el documento versionado y **comprueba su procedencia** (ver Tarea 6).
- `tools/lib/corpus.ts` -- `rutasDelCorpus` (líneas 25-33). **Añadir** `fuentes`. También `aYaml`, `leerCitas`, `nombreDeFicheroDeCita`.
- `tools/lib/cli.ts` -- `opcion()`, `raizDeCorpusDe()`, `terminar()`. Los rechazos salen con código ≠ 0.
- `src/lib/slug.ts` -- `slugDeCita`, `slugLibre`, `slugDeAutor`, `slugDeTema` (estos dos son `unir(normalizar(nombre))`). Hace falta un slug de obra: **reutilizar el cuerpo existente, no añadir una tercera copia idéntica**.
- `src/lib/normalizar.ts` -- `normalizar()`. **No retira `·` ni símbolos sueltos**: importa para el guardián de nombre vacío.
- `src/content.config.ts` -- colecciones `citas`, `autores`, `temas`. **`corpus/fuentes/` no es colección y el build NO lo lee**; ningún comentario debe afirmar lo contrario.
- `tests/unit/andamiaje.test.ts` -- estructura del repositorio; aquí vive el guardián de AD-22.
- `tests/unit/aislamiento-de-revision.test.ts` -- prueba que ninguna colección tiene `corpus/_revision` como base; el sitio para `corpus/fuentes`.
- `tests/unit/extraer-cli.test.ts`, `tests/unit/revisar-cli.test.ts` -- **ambos** alimentan hoy `extraer.ts` con un YAML a mano; los dos hay que adaptarlos.

## Tasks & Acceptance

**Execution:**
- `tools/lib/fuentes.ts` -- añadir los anfitriones de cada Fuente y `fuenteDeUrl(url)`, con coincidencia exacta de anfitrión o subdominio real, rechazo de protocolos que no sean `http(s)`, y aceptación de las variantes móviles (`es.m.wikisource.org`) -- una URL copiada del móvil es la misma Fuente.
- `tools/lib/corpus.ts` -- añadir `fuentes` a `rutasDelCorpus` -- las rutas del corpus tienen un solo dueño. **No escribir que el build lo lee: no lo lee.**
- `src/lib/slug.ts` -- exponer el slug de obra **reutilizando** el cuerpo que ya comparten `slugDeAutor` y `slugDeTema` -- una regla de canonización, un solo dueño. Probarlo en `tests/unit/normalizar-y-slug.test.ts`, donde viven sus hermanas.
- `tools/lib/documento.ts` (nuevo, puro, sin red) -- retirada de marcado, derivación de obra y año por Fuente, composición y análisis de la cabecera, y `nombreDeDocumento(idFuente, obra)`.
  - Acotar el cuerpo a la **región de contenido** antes de retirar etiquetas (en MediaWiki, `.mw-parser-output` / `#mw-content-text`) y recortar Gutenberg entre `*** START OF …` y `*** END OF …` -- si no, la barra lateral, el pie, la lista de categorías y la licencia de Gutenberg se versionan como si fueran la obra, y de ahí salen candidatas.
  - Resolver entidades **antes** de retirar etiquetas y volver a barrer después; ante una entidad desconocida, no dejarla a medias.
  - La etiqueta suelta de año solo mira la línea adyacente (ventana de una o dos líneas), nunca «la siguiente no vacía» a cualquier distancia -- si no, un número ajeno del cromo de la página pasa por año declarado.
  - `nombreDeDocumento` debe rechazar los títulos que no dejan ni una letra tras normalizar (incluido `«···»`, que `normalizar` no limpia) y acotar la longitud del nombre.
- `tools/recuperar.ts` (nuevo, cáscara exterior) -- **único** punto con `fetch`. Además de validar la URL contra el conjunto cerrado y reutilizar el documento ya versionado:
  - **Revalidar el destino tras los redireccionamientos**: `redirect: 'manual'`, o comprobar `respuesta.url` con `fuenteDeUrl` y rechazar si cambió de Fuente. Un anfitrión admitido que redirige fuera traería texto no verificado con la licencia de una Fuente admitida.
  - Poner **tiempo máximo** (`AbortSignal.timeout`), **techo de tamaño** y comprobación de `Content-Type` (`text/html` o `text/plain`) -- la única llamada de red del proyecto no puede colgarse ni tragarse un binario.
  - Respetar el **juego de caracteres** que declare la respuesta en vez de suponer UTF-8 -- Gutenberg todavía sirve Latin-1, y un acento mal descodificado se versiona para siempre y envenena el cotejo de la 11.2.
  - Enviar un **`User-Agent` identificable**: Wikimedia y Gutenberg rechazan a los clientes que no se identifican.
  - Rechazar con mensaje propio, no con traza, cuando la respuesta no sea `ok` o `fetch` lance.
  - Analizar los argumentos de forma que `--corpus` antes de la URL no se confunda con la URL.
- `tools/extraer.ts` -- consumir el documento versionado **y comprobar que lo produjo la recuperación**: la ruta tiene que resolver dentro de `rutas.fuentes`, su nombre tiene que coincidir con `nombreDeDocumento(fuente, obra)` de su propia cabecera, y su `url` tiene que pertenecer al conjunto cerrado. Sin las tres, no produce candidatas y sale con código ≠ 0. **Es la tarea que cierra la historia**: sin ella el metadato se sigue tecleando, solo que en `.txt` en vez de en `.yaml`. Encauzar los fallos por `terminar` como el resto de las órdenes, y no dejar que un fichero inexistente salga por una traza de ENOENT.
- `tests/unit/documento.test.ts` (nuevo) -- lo puro: retirada de marcado sobre una página con cromo real, recorte de Gutenberg, obra derivada, año exacto vs aproximado vs ausente, que «Release Date» **no** se convierta en año, etiqueta de año lejana que no debe capturarse, nombre del documento, título que no deja letras, y entidades.
- `tests/unit/recuperar-cli.test.ts` (nuevo) -- sobre disco con `fetch` sustituido: URL admitida escribe el documento; URL de fuera no escribe nada, **no llega a pedirla** y sale ≠ 0; Fuente sin reutilización no se descarga; segunda recuperación reutiliza y no vuelve a pedir; **redirección a un anfitrión de fuera no escribe nada**; **respuesta 404 y `fetch` que lanza** no escriben nada y salen ≠ 0; `Content-Type` que no es texto se rechaza.
- `tests/unit/extraer-cli.test.ts` -- adaptar a la entrada nueva conservando las siete comprobaciones vigentes, y añadir la que falta: **un documento con cabecera creíble pero que la recuperación no produjo —fuera de `corpus/fuentes/`, o con nombre que no cuadra con su cabecera, o con una `url` de fuera del conjunto— deja `_revision/` vacío y sale ≠ 0.** Comprobar el comportamiento ejecutando la orden, **no** leyendo el código fuente en busca de `'--obra'`: esa aserción pasa escribiendo la bandera con comillas dobles.
- `tests/unit/revisar-cli.test.ts` -- adapta su documento a la entrada nueva (hoy también alimenta un YAML a mano).
- `tests/unit/andamiaje.test.ts` -- guardián de AD-22 sobre **`src/` y todo `tools/`**, exceptuando únicamente `tools/recuperar.ts`, y sobre las extensiones que el proyecto ejecuta (`.ts`, `.tsx`, `.js`, `.mjs`, `.astro`) -- barrer solo `tools/lib/` deja nueve órdenes sin cubrir. Comprobar además que `corpus/fuentes` existe en el repositorio.
- `tests/unit/aislamiento-de-revision.test.ts` -- añadir `corpus/fuentes` a la comprobación de que ninguna colección lo tiene por base -- es texto de terceros dentro de `corpus/`, y no puede filtrarse al sitio construido.
- `tests/unit/extraccion.test.ts` -- recorrer `FUENTES` y exigir que toda Fuente con `permiteReutilizacion` tenga anfitriones no vacíos y lector de obra -- hoy se puede añadir una Fuente que descarga y luego falla con «no declara título», y la suite no se entera.
- `corpus/fuentes/.gitkeep` -- **añadirlo al control de versiones**, no solo al disco: el andamiaje exige el directorio y un clon limpio fallaría.

**Acceptance Criteria:**
- Given una URL del conjunto cerrado, when se lanza la recuperación, then el documento queda versionado como texto plano en `corpus/fuentes/{id-de-fuente}--{slug-de-obra}.txt`.
- Given una URL fuera del conjunto, when se pasa a la recuperación, then no se llega a pedir, no se escribe nada y la orden sale con código distinto de cero.
- Given un anfitrión admitido que redirige a uno que no lo está, when se recupera, then no se versiona nada y la orden sale con código distinto de cero.
- Given un documento con cabecera creíble que la recuperación no produjo, when se pasa a la extracción, then no se escribe ninguna candidata y la orden sale con código distinto de cero.
- Given la obra, el año y la licencia de una candidata, when se componen, then salen de un documento que la recuperación produjo desde una URL admitida, y ninguna orden acepta pasarlos por argumento.
- Given una obra cuyo documento ya está versionado, when se recupera otra vez, then se reutiliza el existente, no se vuelve a pedir y no aparece una segunda copia.
- Given `src/` y todo `tools/` salvo `tools/recuperar.ts`, when se busca una llamada de red, then no hay ninguna, y `npm run build` no descarga nada.

## Spec Change Log

### 2026-08-19 — Enmienda tras la primera pasada de revisión

**Hallazgo que la desencadena.** Las cuatro capas de revisión coincidieron, y dos lo demostraron ejecutándolo: `tools/extraer.ts` aceptaba **cualquier** fichero con cabecera `clave: valor` y una línea `---`. Un `.txt` escrito a mano con `fuente: gutenberg`, `obra: Obra Que Nunca Existió`, `año: 1492` producía candidatas reales en `corpus/_revision/` con esa Procedencia y licencia `dominio público`. La superficie de tecleo se mudó de `.yaml` a la cabecera del `.txt`; no se cerró.

**Qué se enmienda.** La versión anterior de esta especificación fijaba la garantía en la **superficie de argumentos** («que no haya banderas `--obra`»), cuando el «So that» de la historia —*nadie pueda teclear una Procedencia que la Fuente no dice*— y su criterio —*salen del documento **recuperado***— exigen la **cadena de derivación**. Se añade la tarea que comprueba la procedencia del documento en `extraer.ts` (ruta dentro de `rutas.fuentes`, nombre que cuadra con su propia cabecera, `url` del conjunto cerrado) y su criterio de aceptación. Se añaden además: revalidación tras redirección, tiempo máximo, techo de tamaño, `Content-Type`, juego de caracteres, `User-Agent`, acotado a la región de contenido y recorte de Gutenberg, ventana adyacente para la etiqueta de año, ampliación del guardián de AD-22 a todo `tools/`, consistencia entre `FUENTES` y las tablas por Fuente, y `.gitkeep` versionado.

**Estado malo que evita.** Que la historia cuyo objeto es hacer comprobable la Procedencia se cierre dejándola declarable a mano, con una suite en verde que informa de lo contrario.

**KEEP — lo que funcionó y debe sobrevivir a la re-derivación:**
1. La **separación** `tools/lib/documento.ts` (puro) / `tools/recuperar.ts` (cáscara con la única `fetch`). Es exactamente AD-22 y se probó sin servidor.
2. `fuenteDeUrl` con coincidencia **exacta** de anfitrión o subdominio real: `gutenberg.org.example.com` no cuela. Conservar esa prueba.
3. La **cabecera con separador `---`** y el cuerpo debajo, con la línea del año **omitida** cuando no consta exacta.
4. Que la «Release Date» de Gutenberg **no** se lea como año de la obra, y que el año salga solo de `Original Publication`. Conservar esa prueba nominal.
5. El guardián de AD-22 en `andamiaje.test.ts` (ampliar su alcance, no retirarlo) y la comprobación de que falla si se inyecta una llamada de red.
6. La comprobación previa a la descarga que reutiliza el documento ya versionado sin pedirlo.
7. Las siete comprobaciones de la 9.1 en `extraer-cli.test.ts`, que ya se conservaron una vez.

## Review Triage Log

### 2026-08-19 — Review pass
- intent_gap: 0
- bad_spec: 11: (high 2, medium 8, low 1)
- patch: 0
- defer: 2: (medium 1, low 1)
- reject: 4: (low 4)
- addressed_findings:
  - `[high]` `[bad_spec]` `extraer.ts` admitía cualquier fichero con cabecera: la Procedencia se seguía pudiendo teclear. Enmendada la especificación con la comprobación de procedencia del documento y su criterio de aceptación.
  - `[high]` `[bad_spec]` `fetch` seguía redirecciones sin revalidar el destino: texto de un anfitrión no admitido quedaba con la licencia de uno admitido. Enmendada con revalidación tras redirección.
  - `[medium]` `[bad_spec]` Sin tiempo máximo, techo de tamaño ni comprobación de `Content-Type` en la única llamada de red.
  - `[medium]` `[bad_spec]` Juego de caracteres ignorado: Gutenberg sirve Latin-1 y el acento mal descodificado se versiona para siempre.
  - `[medium]` `[bad_spec]` Sin `User-Agent`: Wikimedia y Gutenberg rechazan a quien no se identifica.
  - `[medium]` `[bad_spec]` El cromo de Wikisource y el preámbulo legal de Gutenberg se versionaban como obra y producían candidatas.
  - `[medium]` `[bad_spec]` El guardián de AD-22 barría solo `src/` y `tools/lib/`: nueve órdenes de `tools/` quedaban sin cubrir.
  - `[medium]` `[bad_spec]` Ninguna prueba ejercitaba la respuesta no-2xx ni el fallo de red.
  - `[medium]` `[bad_spec]` `FUENTES` y las tablas por Fuente podían desincronizarse en silencio.
  - `[medium]` `[bad_spec]` Las aserciones de «no se puede teclear» leían el código fuente en busca de `'--obra'` en vez de ejecutar la orden.
  - `[low]` `[bad_spec]` `.gitkeep` sin versionar rompería un clon limpio; comentarios afirmando que el build lee `corpus/fuentes` cuando no lo hace; `slugDeObra` como tercera copia idéntica.

## Design Notes

**Por qué el documento lleva cabecera.** AD-23 dice «un documento por par (Fuente, obra)», en singular: un fichero de metadato al lado sería un segundo documento. Y el metadato tiene que ser derivable después, así que vive dentro del mismo `.txt`, separado del cuerpo.

```
fuente: gutenberg
obra: Del sentimiento trágico de la vida
url: https://www.gutenberg.org/…
recuperado: 2026-08-19
---
<cuerpo en texto plano>
```

Sin año exacto, la línea `año:` **se omite** — nunca se escribe vacía. El cotejo de la 11.2 opera sobre el cuerpo, no sobre la cabecera.

**La cabecera no es una credencial.** Es metadato legible, no una firma, y no pretende resistir a quien edite ficheros con intención. Lo que la comprobación de procedencia impide es el accidente y el atajo: que quien siembra —persona o agente con prisa— componga un `.txt` a mano porque es más rápido que recuperar. Por eso las tres condiciones son baratas de comprobar y de explicar en el mensaje de error, y por eso el mensaje dice qué orden hay que ejecutar en su lugar.

**Sustituir la red en las pruebas.** `tools/recuperar.ts` es la cáscara; las pruebas de CLI le sustituyen el `fetch` global antes de invocar, y el sustituto debe poder devolver 3xx, 404, un `Content-Type` que no sea texto, y lanzar. Lo decidible sin red vive en `tools/lib/documento.ts` y se prueba directamente.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run` -- expected: todo en verde; ninguna de las 588 de la línea base perdida.
- `npm run build` -- expected: construye sin descargar nada.
- `grep -rn "fetch(" src/ tools/ --include="*.ts" --include="*.astro" | grep -v "^tools/recuperar.ts"` -- expected: ninguna aparición. No incluir `medicion/`: su `fetch` es el manejador de entrada del Worker.

**Manual checks (if no CLI):**
- Componer a mano un `.txt` con cabecera creíble fuera de `corpus/fuentes/`, pasarlo a `tools/extraer.ts` y confirmar que `corpus/_revision/` queda vacío y la orden sale con código distinto de cero.
