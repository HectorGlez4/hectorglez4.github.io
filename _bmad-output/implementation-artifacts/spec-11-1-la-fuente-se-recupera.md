---
title: 'Story 11.1 — La Fuente se recupera, y su metadato sale del documento'
type: 'feature'
created: '2026-08-19'
status: 'ready-for-dev'
review_loop_iteration: 0
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

- `tools/lib/fuentes.ts` -- conjunto cerrado `FUENTES` con `id`, `nombre`, `licencia`, `permiteReutilizacion`, `razon`; `fuenteDe(id)`. **Ampliar** con reconocimiento de URL → Fuente. Sigue siendo puro y sin red.
- `tools/lib/extraccion.ts` -- puro. `DocumentoDeFuente` (`fuente`/`obra`/`año`/`url`/`texto`), `extraerCandidatas`, `añoExacto` (líneas ~118-130, rechaza aproximaciones), `estaEnEspañol`, ventana `MIN/MAX_CARACTERES_CANDIDATA`. **Reutilizar tal cual**; su contrato de entrada no cambia.
- `tools/extraer.ts` -- cáscara actual: lee el YAML a mano, llama a `extraerCandidatas`, escribe en `rutas.revision` con `nombreDeFicheroDeCita` y `slugLibre`. **Modificar** la entrada: documento versionado en vez de YAML.
- `tools/lib/corpus.ts` -- `rutasDelCorpus` (líneas 25-33) devuelve `raiz/citas/autores/temas/revision`. **Añadir** `fuentes`. También `aYaml`, `leerCitas`, `nombreDeFicheroDeCita`.
- `tools/lib/cli.ts` -- `opcion()`, `raizDeCorpusDe()`, `terminar()`. Reutilizar; los rechazos salen con código ≠ 0.
- `src/lib/slug.ts` -- `slugDeCita`, `slugLibre`. Necesario un slug de obra para el nombre del documento.
- `tests/unit/extraer-cli.test.ts` -- 11 pruebas de la 9.1 sobre disco con corpus temporal. **Actualizar a la entrada nueva conservando lo que comprueban**: solo `_revision`, constancia de Fuente y licencia, exclusión del latín, nombre de fichero, recuento, no pisar slugs, rechazo por licencia.
- `tests/unit/extraccion.test.ts` -- pruebas puras de `extraerCandidatas`. No deberían necesitar cambios.

## Tasks & Acceptance

**Execution:**
- `tools/lib/fuentes.ts` -- añadir a cada Fuente los anfitriones que la identifican y una función `fuenteDeUrl(url)` que devuelva la Fuente o `undefined` -- el conjunto cerrado deja de ser solo un identificador escrito a mano y pasa a reconocerse desde la URL.
- `tools/lib/corpus.ts` -- añadir `fuentes` a `rutasDelCorpus` -- las rutas del corpus tienen un solo dueño.
- `tools/lib/documento.ts` (nuevo, puro, sin red) -- retirada de marcado, derivación de obra y año desde el documento de cada Fuente, composición y análisis de la cabecera, y `nombreDeDocumento(idFuente, obra)` -- todo lo decidible sin red vive aquí para poder probarse sin servidor, igual que hizo la 9.1 con `extraccion.ts`.
- `tools/recuperar.ts` (nuevo, cáscara exterior) -- **único** punto con `fetch`: valida la URL contra el conjunto cerrado, reutiliza el documento ya versionado si existe, y si no descarga, convierte a texto plano y escribe en `corpus/fuentes/` -- AD-22 exige que la red entre acotada y en un solo sitio.
- `tools/extraer.ts` -- aceptar el documento versionado y componer `DocumentoDeFuente` desde su cabecera; retirar la lectura del YAML a mano -- es el cambio que cierra el hueco de la historia.
- `tests/unit/documento.test.ts` (nuevo) -- cubrir la matriz de E/S en lo puro: retirada de marcado, obra derivada, año exacto vs aproximado vs ausente, nombre del documento, y que «Release Date» de Gutenberg **no** se convierta en año.
- `tests/unit/recuperar-cli.test.ts` (nuevo) -- sobre disco con corpus temporal y `fetch` sustituido: URL admitida escribe el documento; URL no admitida no escribe nada y sale ≠ 0; Fuente sin reutilización no escribe nada; segunda recuperación reutiliza y no duplica.
- `tests/unit/extraer-cli.test.ts` -- adaptar a la entrada nueva conservando las siete comprobaciones vigentes.
- `tests/unit/andamiaje.test.ts` -- añadir una comprobación de que ningún fichero de `src/` ni de `tools/lib/` contiene `fetch(` -- AD-22 deja de depender de que nadie se despiste. **Excluir `medicion/`**: `medicion/worker.ts:42` declara `async fetch(peticion: Request)`, que es el manejador de entrada del Worker y no una petición de salida.

**Acceptance Criteria:**
- Given una URL del conjunto cerrado, when se lanza la recuperación, then el documento queda versionado como texto plano en `corpus/fuentes/{id-de-fuente}--{slug-de-obra}.txt`.
- Given una URL fuera del conjunto, when se pasa a la recuperación, then no produce candidatas y la orden sale con código distinto de cero.
- Given la obra, el año y la licencia de una candidata, when se componen, then salen del documento recuperado, y ninguna orden acepta pasarlos por argumento.
- Given una obra cuyo documento ya está versionado, when se recupera otra vez, then se reutiliza el existente y no aparece una segunda copia.
- Given `src/` y `tools/lib/`, when se busca `fetch(`, then no hay ninguna aparición —hoy no la hay, la baliza usa `navigator.sendBeacon`— y `npm run build` no descarga nada.

## Spec Change Log

## Review Triage Log

## Design Notes

**Por qué el documento lleva cabecera.** AD-23 dice «un documento por par (Fuente, obra)», en singular: un fichero de metadato al lado sería un segundo documento. Y el metadato tiene que ser derivable después, así que vive dentro del mismo `.txt`, separado del cuerpo. El cuerpo queda en texto plano y sin marcado, que es lo que la Historia 11.2 va a cotejar.

```
fuente: gutenberg
obra: Del sentimiento trágico de la vida
url: https://www.gutenberg.org/…
recuperado: 2026-08-19
---
<cuerpo en texto plano>
```

Sin año exacto, la línea `año:` **se omite** — no se escribe vacía. El cotejo de la 11.2 opera sobre el cuerpo, no sobre la cabecera.

**Sustituir la red en las pruebas.** `tools/recuperar.ts` es la cáscara; las pruebas de CLI le inyectan un `fetch` falso por variable de entorno o sustituyendo el global antes de invocar. Lo decidible sin red ya vive en `tools/lib/documento.ts` y se prueba directamente.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores, igual que la línea base de 118 ficheros.
- `npx vitest run` -- expected: todo en verde; 588 pruebas de línea base más las nuevas, ninguna perdida.
- `npm run build` -- expected: construye sin red y sin descargar nada.
- `grep -rn "fetch(" src/ tools/lib/ --include="*.ts" --include="*.astro"` -- expected: ninguna aparición. No incluir `medicion/`: su `fetch` es el manejador de entrada del Worker.
