---
title: 'Revisiones fijas de Wikidata, versionadas, y la orden que ata una entidad a su Obra'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: '306a67f9c05d8fa31bbc4c4d1a5017ea86c96f42'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-32-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred:
  - summary: >-
      La 32.2 conecta la Ficha técnica con las fechas: `corpus/wikidata/` entra en `FAMILIAS_DE_FICHERO`, `wikidata` pasa de `CAMPOS_QUE_NO_FECHAN.obra` a `CAMPOS_QUE_PINTA` de la Página de Obra y la relación compone el documento de la Obra y, por `vigentes.yml`, los de sus entidades referidas con `obrasQueRemitenA`.
    evidence: >-
      En la 32.1 ninguna página pinta nada de Wikidata (dist/ no cambia), así que clasificar `wikidata` como campo que pinta fecharía Páginas de Obra sin cambio visible. `tests/unit/fecha-de-cambio.test.ts` exige clasificar la clave nueva en el mismo commit que la añade: se clasifica como que no fecha, y la 32.2, que la pinta, la mueve.
    location: tools/lib/cambios.ts (CAMPOS_QUE_NO_FECHAN, CAMPOS_QUE_PINTA, FAMILIAS_DE_FICHERO en tools/lib/avisar.ts)
    severity: medium
  - summary: >-
      Pregunta 12 del PRD sin responder: si una antología de un compilador («Granos de oro», Martí) es Obra del Autor. No bloquea construir; hasta que Héctor responda, nadie ata entidad de Wikidata a esas Obras.
    evidence: >-
      prd.md §14, pregunta 12 (l. 1813): «Bloquea curar sus ediciones y declarar su entidad de Wikidata, no la construcción; se decide antes de la primera historia de la Ficha técnica. Dueño: Héctor.» No consta respuesta en los artefactos de planificación, la memoria ni la bitácora a 2026-11-07.
    location: _bmad-output/planning-artifacts/prds/prd-brainlySabiduria-2026-08-10/prd.md
    severity: low
  - summary: >-
      No hay orden que quite `wikidata` de una ficha (no existe un `quitar-wikidata` como `quitar-edicion`); una atadura equivocada solo se corrige atando otra entidad. Decidir si hace falta es de Héctor.
    evidence: |-
      Revisión 32.1-1 (blind-hunter): `atarEntidadDeWikidata` es el único escritor del campo y el campo no se edita a mano; hoy ninguna ficha del Corpus real lo declara, así que no hay nada que deshacer todavía.
    location: >-
      tools/lib/obras.ts (atarEntidadDeWikidata), tools/obra.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** La Ficha técnica de la Página de Obra (32.2) necesita género, lengua y año de Wikidata, pero leer Wikidata en vivo daría dos sitios distintos del mismo commit, y atar la entidad equivocada (una homónima de otro autor) describiría otra obra. No existe ni dónde guardar revisiones fijas, ni la orden que ata una entidad a una ficha, ni la puerta del build que lo repita (AD-31).

**Approach:** `tools/recuperar.ts` gana una rama de Wikidata por `oldid` que versiona `corpus/wikidata/{Q}--r{N}.json` (CC0, entidad y revisión declaradas por la API) y recupera las entidades referidas (P50, P136, P407) que falten en `corpus/wikidata/vigentes.yml`, que solo se amplía. Un módulo puro `tools/lib/wikidata.ts` lee esos documentos, extrae `{generos, lenguas, año?}` y coteja el autor; `npm run obra -- wikidata` ata la entidad a la ficha y `npm run obra -- wikidata-vigente` cambia una vigente; un cargador de `src/content.config.ts` repite en el build las comprobaciones. Ninguna página pinta nada todavía.

## Boundaries & Constraints

**Always:**
- Pregunta 12 del PRD (antología de un compilador, «Granos de oro»): **sin respuesta de Héctor a 2026-11-07**. La historia se construye igual; hasta que responda nadie ata entidad a esas Obras (anotado en `deferred`).
- AD-22: la red solo en `tools/recuperar.ts`. `tools/lib/wikidata.ts`, `tools/obra.ts` y el cargador no piden nada; `tests/unit/andamiaje.test.ts` sigue verde sin ampliar `EXCEPCIONES`. Las pruebas no tocan la red: `tests/unit/ayuda/doble-de-red.mjs` para la orden y revisiones de prueba construidas a mano (`tests/unit/ayuda/wikidata.ts`) para lo puro.
- Wikidata **no** entra en `FUENTES` de `tools/lib/fuentes.ts`: no es Fuente de texto (FR-23) ni mutable de biografía; ninguna Cita puede declararla. La reconoce `esDireccionDeWikidata` (anfitriones `www.wikidata.org`, `m.wikidata.org`, coincidencia exacta o subdominio real, solo `https:`/`http:`), y `descargar` revalida cada redirección contra ese reconocedor (parámetro nuevo, por omisión `fuenteDeUrl`).
- Un documento por (entidad, revisión), nunca sobrescrito (`flag: 'wx'`), JSON con, en este orden: `fuente: "wikidata"`, `entidad`, `revision`, `fechaDeRevision` (AAAA-MM-DD de la API), `licencia: "CC0 1.0"`, `url` (enlace permanente `https://www.wikidata.org/w/index.php?title={Q}&oldid={N}`), `pedido` solo si difiere, `recuperado`, `datos` (la entidad tal como la sirve `Special:EntityData`, entera). `JSON.stringify(doc, null, 2)` + `\n`.
- `vigentes.yml`: cabecera de comentarios (qué es, quién lo escribe, que solo añade, que cambiar una vigente es `wikidata-vigente`) y un mapa `Q: revisión` ordenado por número de Q; vacío es la cabecera y `{}`. Dos escritores con nombre en `tools/lib/wikidata.ts` sobre un solo serializador: `anadirVigentes` (lo usa solo `recuperar`; nunca toca una entidad ya vigente) y `sustituirVigente` (lo usa solo `wikidata-vigente`).
- Extracción (`fichaTecnicaDe`, pura): por propiedad, fuera `deprecated`; si hay alguna `preferred`, solo esas; solo `snaktype: value`. Géneros P136 y lenguas P407 (nunca P364), en el orden de la revisión, sin repetidos, cada uno con `labels.es.value` del documento de su revisión vigente; sin vigente, sin documento o sin etiqueta `es`, se omite (nunca el identificador ni otra lengua). Año de P577 solo si queda **exactamente una** declaración y su precisión es ≥ 9; con dos o más, aunque coincidan, ninguno (pregunta 13). Año con signo (`-0049…` → -49).
- Cotejo de autor: P50 con las mismas reglas de rango; alguna etiqueta `es` de la revisión vigente de esa persona concuerda con el `nombre` del Autor de la ficha según `esElMismoAutor` de `tools/lib/documento.ts`. Una sola función (`cotejarAutorDeLaEntidad`) la usan la orden y el cargador.
- Las órdenes que reescriben o mueven una ficha conservan `wikidata` (`datosDeFicha`, `yamlDeFicha` después de `ediciones`); `reunir` conserva el de la destino, no hereda el de la absorbida y lo dice en el parte.
- Códigos de las órdenes: 2 la forma de la invocación; 1 lo que dice; nada escrito en ningún rechazo.

**Block If:**
- Hiciera falta probar contra la red real de Wikidata, o ampliar `EXCEPCIONES` de AD-22, tocar `src/lib/vocabulario.ts` o editar `_bmad-output/planning-artifacts/`/`_bmad-output/specs/`.

**Never:**
- Atar una entidad real a una ficha, escribir entradas en `corpus/wikidata/vigentes.yml` del árbol, o recuperar nada de Wikidata desde el árbol del repositorio: es acto de Héctor.
- Pintar la Ficha técnica, tocar páginas, componentes, `relacionDeSuperficies` o `FAMILIAS_DE_FICHERO` (32.2). `dist/` no cambia ni un byte.
- Que el cotejo de Citas, las posiciones o `extraer` lean `corpus/wikidata/`. Sacar el traductor de la entidad.
- Recuperar entidades referidas en cadena (solo las de la entidad pedida) o versionar la entidad viva.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Recuperar Obra | `…index.php?title=Q480&oldid=N`; P50 Q5682, P136 Q8261 sin vigentes | Pide `api.php?action=query&prop=revisions&revids=N&rvprop=ids|timestamp&format=json&formatversion=2`, luego `Special:EntityData/Q480.json?revision=N`; escribe `Q480--rN.json`; por cada referida, revisión actual por `…&titles=Q5682…`, su `EntityData`, su documento; `vigentes.yml` las añade | código 0, parte con documentos y vigentes añadidas |
| Sin `oldid` | `https://www.wikidata.org/wiki/Q480` | No pide nada | código 1 |
| Otra entidad | `title=Q481&oldid=N`, la API declara Q480 | Nombra las dos, no escribe | código 1 |
| No es entidad | la API declara `Property:P31` o un ns ≠ 0 | No escribe | código 1 |
| `datos.id`/`lastrevid` ≠ lo pedido | EntityData sirve otra entidad (fusionada) u otra revisión | No escribe | código 1, nombra lo servido |
| Ya versionada | existe `Q480--rN.json` | No pide la entidad; sigue con las referidas que falten | código 0 |
| Referida ya vigente | Q8261 en `vigentes.yml` con su documento | No la pide ni toca su línea | — |
| Referida vigente sin documento | Q8261: M sin `Q8261--rM.json` | Recupera esa revisión M | — |
| Referida que falla | 503 persistente en Q5682 | Escribe lo logrado, añade solo las logradas, nombra la que falta; repetir la orden lo completa | código 1 |
| Extracción | Q480 con lengua `deprecated`, P136 con una `preferred`, un género sin etiqueta `es`, dos P577 | `{generos:[solo la preferred con etiqueta], lenguas:[sin la deprecated], año: ausente}` | — |
| Atar | `npm run obra -- wikidata <ficha> corpus/wikidata/Q480--rN.json`, autor concuerda | Escribe `wikidata: {entidad: Q480, revision: N}` | código 0 |
| Atar, autor ajeno | P50 «Manuel González Prada», Autor «Juan Montalvo» | Pone delante las dos partes | código 1, sin escribir |
| Atar, fallos | documento ausente; no es de Wikidata; sin P50; autor sin vigente; sin etiqueta `es`; ficha inexistente; misma entidad y revisión ya declaradas | Nombra el motivo | código 1 |
| Atar, invocación | falta o sobra argumento, bandera desconocida | Uso | código 2 |
| Cambiar vigente | `npm run obra -- wikidata-vigente Q8261 M`, Q8261 vigente en otra revisión, documento M presente | Sustituye la línea; dice cuántas Obras (fichas activas con `wikidata`) remiten a Q8261 y las nombra | código 0 |
| Cambiar vigente, fallos | Q no vigente; misma revisión; documento M ausente (da la orden `recuperar` exacta); documento que no es de Q o de M | Nada escrito | código 1 |
| Build | ficha con `wikidata` cuyo documento falta / es otra revisión o entidad / su autor no concuerda / su autor no tiene vigente; `vigentes.yml` ilegible o con una vigente sin su documento | Rompe nombrando la ficha (o `vigentes.yml`) y lo que falla | build código ≠ 0 |

</intent-contract>

## Code Map

- `tools/recuperar.ts` -- cáscara de red. Rama nueva antes de `fuenteDeUrl` (l. ~154): `if (esDireccionDeWikidata(url)) await recuperarDeWikidata(url)` (`Promise<never>`, patrón de `recuperarBiografia` l. 742–873: revisión de la URL, título tecleado, declaración por API con `conReintentos` + `descargar(..., {tipos: TIPOS_DE_DECLARACION})`, `flag: 'wx'`, `terminar`). `descargar` (l. 1118) usa `fuenteDeUrl(actual)` para revalidar: añadir opción `reconocer`. Uso (l. 141) añade la línea de Wikidata. Mantener `--indice`/`--ensayo` → 2 con una URL de Wikidata.
- `tools/lib/fuentes.ts` -- exportar `revisionDeMediaWiki` y `tituloDeMediaWiki` (hoy privados) y reutilizarlos; `conReintentos`, `mismoTitulo`. No tocar `FUENTES`.
- `tools/lib/wikidata.ts` (nuevo) -- puro sobre lo descargado (fs permitido, sin red): `esDireccionDeWikidata`, constructores de direcciones (declaración por `revids`, revisión actual por `titles`, `Special:EntityData/{Q}.json?revision=N`, enlace permanente), `LICENCIA_DE_WIKIDATA = 'CC0 1.0'`, `nombreDeDocumentoDeWikidata(Q, N)`, `componerDocumentoDeWikidata`/`leerDocumentoDeWikidata` (valida forma y coherencia nombre↔cabecera↔`datos.id`/`lastrevid`), `revisionDeclarada(json, N)`, `declaraciones(datos, P)` (regla de rangos), `entidadesReferidas`, `fichaTecnicaDe`, `cotejarAutorDeLaEntidad`, `leerVigentes`/`componerVigentes`/`anadirVigentes`/`sustituirVigente`, `obrasQueRemitenA`, y para el cargador `leerFichasTecnicasDelCorpus(raiz)` + `guardarFichasTecnicas` (patrón de `tools/lib/posiciones.ts`: `guardarPosiciones`, `releerAlCambiar`).
- `tools/lib/corpus.ts` -- `Rutas`/`rutasDelCorpus` (l. ~256, ~364): añadir `wikidata` y `vigentesDeWikidata`; `yamlDeFicha` (l. 626) emite `wikidata: {entidad, revision}` tras `ediciones`; `leerFichasDeObra`, `leerAutores` (l. 423) los usa el cargador.
- `src/lib/admision.ts` -- `esquemaDeObra` (l. 582): `wikidata` opcional estricto `{entidad: /^Q[1-9]\d*$/, revision: entero positivo}`; actualizar los dos mensajes de claves (l. 655–660) y `tests/unit/obras.test.ts` l. 129.
- `src/lib/obras.ts` -- `FichaDeObra` (l. 180): `wikidata?: { entidad: string; revision: number }`.
- `tools/lib/obras.ts` -- `datosDeFicha` (l. 491) conserva `wikidata`; `reunirFichas` (l. 534, `nueva` l. 573, parte l. 636) conserva el de la destino y avisa si la absorbida lo traía. `titular`, `separar`, `ajustarTitulosDeObra`, `declararEdicion`, `quitarEdicion` ya pasan por `datosDeFicha`; `retirar` y la restauración mueven el fichero. Funciones nuevas `atarEntidadDeWikidata(rutas, ficha, documento)` y `cambiarVigenteDeWikidata(rutas, Q, N)` aquí o en `tools/lib/wikidata.ts`, devolviendo `Resultado` (patrón `declararBiografia`, `tools/lib/gestion.ts` l. 396).
- `tools/obra.ts` -- subórdenes `wikidata <ficha> <documento>` y `wikidata-vigente <Q> <N>` con `exactamente(2, …)`; validar forma de `Q`/`N` → 2; cabecera y `USO`.
- `src/content.config.ts` -- cargador `fichasTecnicas` con el patrón de `cargadorDePosiciones` (l. ~297): solo cablea `tools/lib/wikidata.ts`; una entrada por ficha que declara `wikidata`, id = nombre de ficha, datos `{entidad, revision, generos, lenguas, año?}`; lanza `Regla incumplida: …` nombrando ficha y fallo. Vigila `corpus/obras`, `corpus/autores`, `corpus/wikidata`. Nadie llama `getCollection('fichasTecnicas')` en la 32.1.
- `tests/unit/orden-del-libro.test.ts` l. 937–942 -- la lista permitida pasa a `['../tools/lib/posiciones.ts', '../tools/lib/wikidata.ts']` (segunda excepción nombrada); l. 922 (ningún `src/` salvo `content.config.ts`) sigue igual.
- `tools/lib/cambios.ts` l. 313 -- `CAMPOS_QUE_NO_FECHAN.obra` añade `'wikidata'` con comentario «hasta la 32.2, que la pinta».
- `tests/unit/recuperar-cli.test.ts` -- patrón de la rama de biografías (l. 1457+): `taller`, `recuperar(url, taller, guion)`, registro de peticiones.
- `tests/unit/ayuda/construir.ts` -- `construirConCorpus`, `AUTOR_VALIDO`, `citaValida` para las pruebas de build (patrón `tests/unit/biografia-build.test.ts`).
- `tests/unit/obra-cli.test.ts` -- patrón de invocación de `tools/obra.ts` con `--corpus`.
- `AGENTS.md` § «Las fichas de Obra» (l. 656) -- párrafo nuevo.

## Tasks & Acceptance

**Execution:**
- `tools/lib/wikidata.ts` -- crear el módulo puro descrito en el Code Map -- un dueño para documento, extracción, cotejo y `vigentes.yml` (AD-31).
- `tools/lib/fuentes.ts` -- exportar los dos analizadores de MediaWiki -- un solo analizador de revisión.
- `tools/recuperar.ts` -- rama `recuperarDeWikidata` y opción `reconocer` de `descargar`; parte final: documento, revisión, fecha, licencia, entidades referidas recuperadas/reutilizadas/ya vigentes, añadidas a `vigentes.yml`, y la frase «El cotejo de Citas no lee corpus/wikidata/: de este documento no sale ninguna Cita.» -- AD-22, AD-31.
- `tools/lib/corpus.ts`, `src/lib/admision.ts`, `src/lib/obras.ts`, `tools/lib/obras.ts` -- campo `wikidata` en esquema, tipo, YAML y conservación; `reunir` lo dice -- AD-25.
- `tools/obra.ts` (+ funciones en `tools/lib/`) -- `wikidata` y `wikidata-vigente` -- FR-53, AD-27.
- `src/content.config.ts` -- cargador `fichasTecnicas` -- el build repite las comprobaciones.
- `tools/lib/cambios.ts` -- clasificar `wikidata` como campo que no fecha -- `fecha-de-cambio.test.ts`.
- `corpus/wikidata/vigentes.yml` -- crear con la cabecera y `{}` (salida de `componerVigentes(new Map())`) -- único fichero del directorio.
- `tests/unit/ayuda/wikidata.ts` -- constructores de revisiones de prueba (entidad, declaraciones con rango, etiquetas) y de documentos.
- `tests/unit/wikidata.test.ts` -- cada regla de extracción (Q480 con lengua `deprecated`, `preferred`, sin etiqueta `es`, P364 ignorada, P577 única/doble/precisión 8, signo), cotejo, lectura de documento incoherente, `anadirVigentes` que no toca una vigente, `sustituirVigente`, `obrasQueRemitenA`, `esDireccionDeWikidata` (anfitrión falso `wikidata.org.example.com`).
- `tests/unit/recuperar-cli.test.ts` -- describe «Historia 32.1» con las filas de recuperación de la matriz, comprobando peticiones hechas y no hechas y el contenido de `vigentes.yml`.
- `tests/unit/obra-cli.test.ts` -- describe «Historia 32.1» con atar (concuerda, ajeno, cada fallo, invocación) y `wikidata-vigente`; y que `titular`, `separar`, `edicion` conservan `wikidata` y `reunir` lo dice.
- `tests/unit/wikidata-build.test.ts` -- construye: válida construye y su `dist/` no contiene la entidad, la revisión ni las etiquetas; cada fallo de la fila Build rompe nombrando la ficha.
- `tests/unit/orden-del-libro.test.ts`, `tests/unit/obras.test.ts` -- ajustar lo dicho en el Code Map.
- `AGENTS.md` -- en «Las fichas de Obra», un párrafo: `wikidata` lo escriben solo sus órdenes; cómo se recupera una revisión (`npx tsx tools/recuperar.ts "https://www.wikidata.org/w/index.php?title=<Q>&oldid=<N>"`); qué hace `vigentes.yml` y `wikidata-vigente`; que el cargador de Wikidata es la segunda excepción a la regla de `tools/lib/`; que la Pregunta 12 sigue abierta.

**Acceptance Criteria:**
- Given el árbol al cerrar, when se lista `corpus/wikidata/`, then solo está `vigentes.yml` con su cabecera y `{}`, y ninguna ficha de `corpus/obras/` declara `wikidata`.
- Given el commit de la historia, when se construye el sitio real, then `dist/` es idéntico byte a byte al de su base (salvo lo que rota con la jornada) y la construcción no hace ninguna petición de red.
- Given `tests/unit/andamiaje.test.ts`, when se ejecuta, then pasa sin ampliar `EXCEPCIONES`, y `tests/unit/orden-del-libro.test.ts` pasa con `wikidata.ts` como segunda excepción de `content.config.ts`.
- Given el cotejo, las posiciones y `extraer`, when hay documentos en `corpus/wikidata/`, then ninguno los lee (prueba: un corpus de prueba con un documento de Wikidata da las mismas posiciones y el mismo cotejo que sin él).

## Design Notes

- **`wikidata-vigente` no descarga.** El AC dice que «la recupera»; AD-22 deja la red solo en `tools/recuperar.ts` y ampliar `EXCEPCIONES` es decisión de Héctor. Así que la recuperación es el primer gesto (`recuperar` con el permanente de la revisión nueva versiona el documento sin tocar `vigentes.yml`, porque la entidad ya es vigente) y `wikidata-vigente` el segundo, sin red: si falta el documento, se niega dando la orden `recuperar` exacta. Mismo efecto, sin quinto punto de red.
- **Resuelto (Héctor, 2026-11-08):** que `wikidata-vigente` no descargue y se niegue dando la orden `recuperar` exacta, y que cuente las Obras que remiten a la entidad, es la lectura aceptada del AC; no es una laguna de intención.
- **«Cuántas Obras fecha»**: `obrasQueRemitenA(Q)` cuenta las fichas activas con `wikidata` cuyo documento remite a Q por P50/P136/P407 (reglas de rango). Es la función que la 32.2 usará en la relación de superficies; en la 32.1 ninguna página la pinta todavía (deferred).
- **Referidas = las que la extracción cuenta** (sin `deprecated`, `preferred` si la hay): recuperar una entidad que nadie leerá gasta cuota y repositorio.
- **Entidad entera, no recortada**: el documento es «el JSON de esa revisión»; el repositorio ya versiona libros enteros en `corpus/fuentes/` y `dist/` no lo ve.

## Verification

**Commands:**
- `npx vitest run tests/unit/wikidata.test.ts` -- verde.
- `npx vitest run tests/unit/recuperar-cli.test.ts` -- verde.
- `npx vitest run tests/unit/obra-cli.test.ts` -- verde.
- `npx vitest run tests/unit/wikidata-build.test.ts` -- verde.
- `npx vitest run tests/unit/orden-del-libro.test.ts tests/unit/andamiaje.test.ts tests/unit/obras.test.ts tests/unit/fecha-de-cambio.test.ts` -- verde.
- `npx astro check` -- 0 errores.
- `npm run build` en la rama y en su base, `diff -r` de los dos `dist/` sin los cinco ficheros de `FICHEROS_QUE_ROTAN_CON_LA_JORNADA` -- sin diferencias (con `FECHA_JORNADA` fijada igual en las dos).
- `npm test` (largo, con `correr.sh`) -- verde.

## Review Triage Log

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

(Esa pasada se hizo sin las capas externas, que aún no habían corrido: «sin hallazgos» vale solo para ella. Las capas externas llegan en la pasada siguiente.)

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 11 (high 0, medium 3, low 8)
- defer: 1 (low 1)
- reject: 16
- addressed_findings:
  - `[medium]` `[patch]` `wikidata-vigente` repite el cotejo del autor de cada ficha atada con la revisión nueva antes de escribir y se niega con 1 si alguna dejaría de concordar (blind-hunter, edge-case-hunter).
  - `[medium]` `[patch]` `wikidata` (atar) se niega con 1 si `vigentes.yml` tiene vigentes sin su documento, nombrándolas: el build no construiría (edge-case-hunter).
  - `[medium]` `[patch]` `wikidata` (atar) se niega si otra ficha activa ya declara la misma entidad (edge-case-hunter).
  - `[low]` `[patch]` el cotejo con varios autores dice también los que no se pudieron cotejar cuando hay uno ajeno (edge-case-hunter).
  - `[low]` `[patch]` el cargador envuelve la lectura de fichas y Autores con el prefijo `Regla incumplida: Wikidata (AD-31)` (blind-hunter, edge-case-hunter).
  - `[low]` `[patch]` `wikidata-vigente` rechaza con 2 una revisión por encima de `Number.MAX_SAFE_INTEGER` (blind-hunter, edge-case-hunter).
  - `[low]` `[patch]` `recuperar`, rama ya versionada: la lectura del documento falla con 1 y motivo, no con una excepción (blind-hunter, edge-case-hunter).
  - `[low]` `[patch]` prueba de reatar otra revisión de la misma entidad («Sustituye a…», `revision: 101`) (verification-gap).
  - `[low]` `[patch]` prueba de `recuperar` con documento ya versionado y dirección de otra entidad: 1, las dos nombradas, sin peticiones (verification-gap).
  - `[low]` `[patch]` pruebas del esquema que rechaza un `wikidata` mal formado (Q0, ceros, propiedad, revisión ≤ 0, decimal, cadena, sin revisión, no objeto, clave de más) (ac-auditor).
  - `[low]` `[patch]` el registro de la pasada anterior decía que las capas externas no traían hallazgos antes de haber corrido; corregido (blind-hunter).

Rechazados (por diseño del contrato o sin consecuencia): solo se coteja el autor (AC «solo el autor»); vigentes huérfanas que rompen el build (fila Build de la matriz); título tecleado sin normalizar y direcciones `?revision=`/`wikidata.org` sin `www` (se niegan, que es lo seguro); dependencia del orden de declaración (funciona y no hay caso); expresión de la entidad repetida (`src/` no puede importar de `tools/lib/` salvo el cargador); entidad entera sin tope (Design Notes); solo `labels.es` (contrato, riesgo residual anotado); rango `preferred` antes que `snaktype` (regla de «mejor rango» del contrato); año 0 y calendario (sin caso en el Corpus); conservación de `wikidata` en `retirar`/`documentar`/`restituir-grafia` (pasan por `datosDeFicha` o mueven el fichero); prueba de red del cargador y `dist/` byte a byte (verificado en la pasada anterior y sin cambio de lo que se pinta); revisión anterior aceptada por `wikidata-vigente` (volver atrás puede ser deliberado); fecha UTC de `recuperado` (la misma que las demás ramas de `recuperar`); symlink de `corpus/wikidata/`; desviación de `wikidata-vigente` respecto del texto del AC (aceptada por Héctor, Design Notes); «cuántas Obras fecha» por remisión y no por la relación (misma decisión, diferido a la 32.2).

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3 (high 0, medium 2, low 1)
- defer: 0
- reject: 23
- addressed_findings:
  - `[medium]` `[patch]` el cargador `fichasTecnicas` repite la regla de atar «una entidad, una Obra»: dos fichas activas con la misma `wikidata.entidad` rompen el build nombrándolas (blind-hunter, edge-case-hunter, otros). Camino real: `reunir` deja la absorbida con su entidad en `_obras-retiradas/` y una aprobación la restaura. Prueba en `wikidata-build.test.ts`, que falla sin el arreglo.
  - `[medium]` `[patch]` `wikidata-vigente` se niega con 1, sin escribir, si otra vigente de `vigentes.yml` no tiene su documento —el build no construiría—, como ya hace atar; la de la propia entidad no bloquea, porque el cambio la arregla (edge-case-hunter). Dos pruebas en `obra-cli.test.ts`; la de la negativa falla sin el arreglo.
  - `[low]` `[patch]` el párrafo de AGENTS.md dice ahora las negativas de atar (entidad ya declarada, vigente sin documento), el cotejo previo de `wikidata-vigente` y la regla de unicidad del build, y corrige «(o no hay P50, ni …)», que decía lo contrario (blind-hunter).

Rechazados (proporcionalidad de la última ronda; sin camino de usuario, por contrato o ya decididos): redirección a `http:` (el reconocedor admite `http:` por contrato, como las Fuentes); entidad referida fusionada y su mensaje «repita» (solo el texto del parte, sin caso en el Corpus); deshacer un `recuperar` (git lo deshace; ya diferida la orden que quita `wikidata`); P31 obra frente a edición y alias/homónimos (AC «solo el autor»; riesgo residual anotado); recuperar el permanente de una referida trae sus propias referidas (es la entidad pedida; cuesta una petición); género/lengua sin vigente en el parte; `--corpus` en la orden sugerida; `esquema` en `wikidata-vigente` (la CLI nunca lo pasa); cotejo de todas las fichas atadas (una rota ya rompe el build); comparación de rutas con symlink/mayúsculas; `preferred` sin valor con `normal` con valor (regla de rango del contrato); prueba del contenido del almacén y de la relectura (la 32.2 lo consume y lo prueba); coste de leer las entidades enteras (Design Notes); diagnósticos `invalid`/`missing` de la API; carrera del temporal de `vigentes.yml` (órdenes de una persona, no concurrentes); restauración de una retirada con entidad repetida (la cubre ya la regla del build); mensaje de la relectura en `astro dev` atribuido a las Citas (solo el aviso de desarrollo, y el cargador de índices ya lo comparte); pasajes antiguos del Auto Run Result (son el registro de su pasada, y la frontmatter es la vigente); y los huecos del auditor de AC (desviación de `wikidata-vigente` aceptada por Héctor, dos escritores sobre un serializador por contrato, conservación por `datosDeFicha`, `dist/` y red por evidencia estática y `andamiaje`).

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** Wikidata entra por revisión fija (AD-31). `tools/recuperar.ts` gana la rama `recuperarDeWikidata`, antes del conjunto cerrado de Fuentes: sin `oldid` no pide nada; la entidad y la fecha las declara la API (`revids`, `formatversion=2`), se niega con otra entidad tecleada, con una revisión que no es de un elemento (ns ≠ 0) y con un `Special:EntityData` que sirve otra entidad u otra revisión; versiona `corpus/wikidata/{Q}--r{N}.json` (`wx`, CC0, la entidad entera) y recupera las referidas (P50, P136, P407, con las reglas de rango) que faltan en `vigentes.yml` —en su revisión de hoy, o la vigente si falta su documento—, que solo se amplía. `descargar` revalida cada redirección con un reconocedor inyectable (`reconocer`, por omisión `fuenteDeUrl`). `tools/lib/wikidata.ts` es el dueño puro (sin red) del documento, la extracción (`fichaTecnicaDe`), el cotejo del autor (`cotejarAutorDeLaEntidad`), `vigentes.yml` (`anadirVigentes`, `sustituirVigente` sobre `componerVigentes`), `obrasQueRemitenA` y el cargador del build. `npm run obra -- wikidata` ata la entidad (único escritor del campo) y `npm run obra -- wikidata-vigente` cambia una vigente sin descargar. El esquema de la Ficha de Obra admite `wikidata: {entidad, revision}`, las órdenes que reescriben lo conservan y `reunir` lo dice. El cargador `fichasTecnicas` de `src/content.config.ts` repite las comprobaciones y rompe el build nombrando la ficha o `vigentes.yml`. Nada se pinta: `dist/` no cambia.

**Ficheros.**
- `tools/lib/wikidata.ts` (nuevo) — direcciones, declaración de la API, documento, reglas de rango, extracción, cotejo, `vigentes.yml`, lectura del Corpus y cargador.
- `tools/recuperar.ts` — rama de Wikidata y opción `reconocer` de `descargar`; uso con la línea de Wikidata; `--indice` con Wikidata → 2.
- `tools/lib/fuentes.ts` — exporta `revisionDeMediaWiki` y `tituloDeMediaWiki`; `FUENTES` intacto.
- `tools/lib/corpus.ts` — rutas `wikidata` y `vigentesDeWikidata`; `yamlDeFicha` emite `wikidata` tras `ediciones`.
- `src/lib/admision.ts`, `src/lib/obras.ts` — campo `wikidata` en el esquema (estricto) y en `FichaDeObra`; mensajes de claves.
- `tools/lib/obras.ts` — `datosDeFicha` y `reunirFichas` conservan/avisan; `atarEntidadDeWikidata` y `cambiarVigenteDeWikidata`.
- `tools/obra.ts` — subórdenes `wikidata` y `wikidata-vigente` (2 la forma, 1 lo dicho).
- `src/content.config.ts` — colección `fichasTecnicas` (segunda excepción a `tools/lib/`).
- `tools/lib/cambios.ts` — `wikidata` en `CAMPOS_QUE_NO_FECHAN.obra` hasta la 32.2.
- `corpus/wikidata/vigentes.yml` — cabecera y `{}`, único fichero del directorio.
- `AGENTS.md` — párrafo en «Las fichas de Obra».
- Pruebas: `tests/unit/ayuda/wikidata.ts`, `tests/unit/wikidata.test.ts`, `tests/unit/wikidata-build.test.ts` (nuevas); `recuperar-cli`, `obra-cli` (describe «Historia 32.1»); ajustes en `orden-del-libro`, `obras`, `ediciones-en-venta`.

**Hallazgos de revisión.** Sin hallazgos externos en esta pasada: 0 parches, 0 diferidos, 0 rechazados.

**Revisión de seguimiento.** `followup_review_recommended: false` (parches: 0 high, 0 medium, 0 low; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/wikidata.test.ts` — 28/28.
- `npx vitest run tests/unit/recuperar-cli.test.ts tests/unit/obra-cli.test.ts tests/unit/wikidata.test.ts` — 186/186 (las 15 de recuperación y las 21 de la orden de la 32.1 incluidas).
- `npx vitest run tests/unit/wikidata-build.test.ts` — 3/3 (válida sin rastro en `dist/`; cada fallo de la fila Build nombrado; `vigentes.yml` ilegible).
- `npx vitest run tests/unit/orden-del-libro.test.ts tests/unit/andamiaje.test.ts tests/unit/obras.test.ts tests/unit/fecha-de-cambio.test.ts tests/unit/ediciones-en-venta.test.ts` — 341/341, sin ampliar `EXCEPCIONES`.
- `npx astro check` — 0 errores, 0 avisos.
- `FECHA_JORNADA=2026-11-07 npm run build` en la rama y en la base (306a67f9c0), sumas de los 15.365 ficheros de `dist/` sin los cinco que rotan: idénticos salvo los cuatro `pagefind/filter/*.pf_filter`, `pagefind-entry.json` y el `.pf_meta`, que Pagefind no reproduce entre dos pasadas sobre el **mismo** `dist/` (comprobado volviendo a correrlo sobre la base: salen otros nombres de filtro).
- `npm test` — primera pasada 7236/7237: `extraer-cli.test.ts` «con --autor manuel-gonzalez-prada extrae como antes» agotó los 120 s sobre el Corpus real con la máquina a carga 44–56 (otros worktrees construyendo); el fichero entero pasa solo (53/53, 142 s). Segunda pasada (2026-11-08, sobre el árbol final, sin cambios posteriores): 157/157 ficheros, 7237/7237 pruebas, código 0 (1272 s).

**Matriz.** Cada fila tiene su prueba: recuperación (Obra, sin `oldid`, otra entidad, propiedad/otro espacio, fusionada/otra revisión, ya versionada, referida vigente, vigente sin documento, 503 persistente y repetición) en `recuperar-cli`; extracción en `wikidata.test`; atar (concuerda, ajeno, cada fallo, invocación) y `wikidata-vigente` (éxito y cada fallo) en `obra-cli`; Build en `wikidata-build`.

**Riesgos residuales.** El cotejo de autor lee solo la etiqueta `es` (no los alias): una persona cuya etiqueta no recoja el nombre del Corpus se niega y habrá que decidirlo con el caso delante. La Pregunta 12 sigue abierta (deferred). Ninguna entidad real está atada y `corpus/wikidata/` solo trae `vigentes.yml` vacío.

### Pasada de revisión 32.1-1 (2026-11-08, con las capas externas)

**Resumen.** Once parches, sin cambio de alcance: `wikidata-vigente` repite el cotejo del autor con la revisión nueva antes de escribir; atar se niega con vigentes sin documento y con una entidad que ya declara otra ficha; el cotejo con varios autores dice también los que no pudo cotejar; el cargador da su prefijo a cualquier fallo de lectura; una revisión de más de 2^53 sale con 2; la lectura del documento ya versionado en `recuperar` sale con 1. Pruebas nuevas para «Sustituye a», para la entidad discordante con documento ya versionado y para el esquema que rechaza un `wikidata` mal formado. La desviación de `wikidata-vigente` respecto del AC la aceptó Héctor (Design Notes).

**Ficheros.**
- `tools/lib/obras.ts` — `atarEntidadDeWikidata` (vigentes rotas, entidad repetida) y `cambiarVigenteDeWikidata` (cotejo previo).
- `tools/lib/wikidata.ts` — motivo del cotejo con varios autores; prefijo del cargador.
- `tools/obra.ts` — `Number.isSafeInteger` para la revisión.
- `tools/recuperar.ts` — lectura protegida en la rama ya versionada.
- `tests/unit/obra-cli.test.ts`, `tests/unit/recuperar-cli.test.ts`, `tests/unit/obras.test.ts`, `tests/unit/wikidata.test.ts` — pruebas nuevas.

**Hallazgos.** 11 parches (3 medium, 8 low), 1 diferido (orden que quite `wikidata`, de Héctor), 16 rechazados (ver el registro de triaje).

**Revisión de seguimiento.** `followup_review_recommended: true`: parches 0 high, 3 medium, 8 low; puntuación 3×3 + 8 = 17 ≥ 5.

**Verificación.**
- `npx vitest run tests/unit/wikidata.test.ts tests/unit/obras.test.ts` — 156/156.
- `npx vitest run tests/unit/obra-cli.test.ts -t 32.1` — 26/26; `npx vitest run tests/unit/recuperar-cli.test.ts -t 32.1` — 16/16.
- `npx astro check` — 0 errores, 0 avisos.
- `npm test` — 157/157 ficheros, 7254/7254 pruebas, código 0 (1594 s).
- La comparación de `dist/` no se repitió: los parches tocan solo `tools/` y la rama de error del cargador, que con el Corpus real (ninguna ficha con `wikidata`) no se ejecuta; nada de lo que se pinta cambia.

**Riesgos residuales.** Los de la pasada anterior (solo `labels.es`, Pregunta 12 abierta) y la falta de una orden que quite la atadura (diferida).

### Pasada de revisión 32.1-2 (2026-11-08, con las capas externas; última ronda)

**Resumen.** Tres parches, sin cambio de alcance: el cargador `fichasTecnicas` repite la regla de atar «una entidad, una Obra» y rompe el build si dos fichas activas declaran la misma entidad; `wikidata-vigente` se niega, sin escribir, si otra vigente de `vigentes.yml` no tiene su documento (la de su propia entidad no bloquea: el cambio la arregla); y el párrafo de AGENTS.md recoge esas negativas y corrige la frase que decía lo contrario.

**Ficheros.**
- `tools/lib/wikidata.ts` — `leerFichasTecnicasDelCorpus` nombra la segunda (y siguientes) ficha que declara una entidad ya declarada.
- `tools/lib/obras.ts` — `cambiarVigenteDeWikidata` se niega con las otras vigentes sin documento.
- `tests/unit/wikidata-build.test.ts`, `tests/unit/obra-cli.test.ts` — pruebas que fallan sin el arreglo (comprobado revirtiendo el código), más la de que la vigente rota de la propia entidad no bloquea.
- `AGENTS.md` — párrafo de `wikidata` al día.

**Hallazgos.** 3 parches (2 medium, 1 low), 0 diferidos, 23 rechazados (ver el registro de triaje).

**Revisión de seguimiento.** `followup_review_recommended: true` por la fórmula: parches 0 high, 2 medium, 1 low; puntuación 3×2 + 1 = 7 ≥ 5. Era la última ronda del bucle.

**Verificación.**
- `npx vitest run tests/unit/wikidata.test.ts tests/unit/wikidata-build.test.ts tests/unit/obra-cli.test.ts tests/unit/recuperar-cli.test.ts tests/unit/orden-del-libro.test.ts tests/unit/andamiaje.test.ts tests/unit/obras.test.ts tests/unit/fecha-de-cambio.test.ts` — 8/8 ficheros, 494/494.
- Sin el arreglo: `wikidata-build` 1 fallo (la unicidad) y `obra-cli -t wikidata-vigente` 1 fallo (la vigente rota ajena).
- `npx astro check` — 0 errores, 0 avisos.
- `npm test` — 157/157 ficheros, 7256/7256 pruebas, código 0 (1373 s).
- `dist/` no se recompara: los parches tocan la rama de error del cargador y una orden de `tools/`; con el Corpus real (ninguna ficha con `wikidata`) nada de lo pintado cambia.

**Riesgos residuales.** Los de las pasadas anteriores (solo `labels.es` y sin alias; Pregunta 12 abierta; sin orden que quite la atadura, diferida) y que una entidad de edición (P31) se puede atar si su autor concuerda: lo juzga quien ata.
