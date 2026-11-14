---
title: 'Historia 35.7 — Lo que cuenta solo la clase de siempre'
type: 'feature'
created: '2026-11-14'
status: 'done'
baseline_revision: '281328151309233f068d168ac51531cf36e8e2eb'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-35-context.md'
warnings: ['oversized']
deferred:
  - summary: 'El hueco de Tema de `verHuecos` (y por él el de `npm run objetivo` y `npm run huecos`) cuenta solo la clase de siempre, como pide la historia; `anunciadosBajoUmbral` (LC-6) sigue contando las dos, porque compara contra la regla de publicación (`MIN_CITAS_POR_TEMA` cuenta las dos). Un Tema publicado con ayuda de atribuidas puede salir como hueco de sembrado [ASSUMPTION]. Si el hueco debe contar las dos, lo decide Héctor (bmad-create-epics-and-stories).'
    evidence: 'epics.md Story 35.7 («el hueco de npm run objetivo … cuentan solo la clase de siempre»; «MIN_CITAS_POR_TEMA … sigue contando las dos clases»).'
  - summary: 'Quién escribe `cambio-de-clase` [ASSUMPTION]: la historia no nombra ninguna orden que lo escriba. Lo deriva `documentar --retirar`, nunca tecleado: retirar una Cita de siempre cuyo Autor ya no es de dominio público (`esDeDominioPublico` falso: vive, o su plazo corre) anota `cambio-de-clase`; cualquier otra retirada, `retirada`. Una entrada `cambio-de-clase` no veda nunca ninguna atribuida (es la forma que vuelve como atribuida con otro slug). Si debe ser una bandera u otra orden, lo decide Héctor (bmad-architecture).'
    evidence: 'ARCHITECTURE-SPINE.md AD-32, segunda y cuarta cláusulas.'
  - summary: 'El motivo que anota `revisar --rechazar` [ASSUMPTION]: rechazar no dice por qué. Se deriva de la candidata de siempre: `sin-procedencia` si su Procedencia es ausente (`gradoDeProcedencia`), `cotejo-fallido` en lo demás. Una candidata atribuida rechazada no se anota. La aprobación anota solo lo que deja en revisión por el cotejo (sin Fuente: `motivoParaNoPublicar`) o por la Procedencia ausente, sin repetir una entrada igual (forma, motivo y slug).'
    evidence: 'epics.md Story 35.7, AC de formas-vedadas.yml.'
  - summary: 'Las «bajas por cambio de clase en el periodo» de la auditoría [ASSUMPTION]: la auditoría no tiene periodo; se cuentan todas las entradas `cambio-de-clase` del registro (desde que existe), y las atribuidas publicadas, de lo publicado (cotejado con el registro de clases por el build). Si hace falta un periodo, lo decide Héctor.'
    evidence: 'epics.md Story 35.7 (salud del Corpus); FR-16 v9.1.'
  - summary: 'Las series que parte `DESPLIEGUE_DE_LA_ATRIBUIDA` [ASSUMPTION]: `sm8` —la Página de Personaje emite `vista-de-superficie`, que SM-8 cuenta— y `continuacion-de-cita` —la Página de Cita atribuida no lleva Cómo citar, pasaje ni Tarjeta de Obra en el mismo orden, y cambia la continuación (SM-4/SM-3) y SM-C5—. No parte `lectura` (la Personaje es una unidad nueva, sin serie de antes; las de siempre no cambian) ni `busqueda` (sin evento ni tramo nuevos). SM-C5 declara su llegada con la marca «la primera Cita atribuida publicada en vivo, no el merge».'
    evidence: 'src/lib/umbrales.ts CORTES_DE_SERIE_DECLARADOS; tools/lib/lineaBase.ts juiciosPorVentanas (SM-C5).'
  - summary: >-
      Rechazar (o dejar en revisión al aprobar) una candidata de siempre cuyo texto coincide con una atribuida ya publicada de otro slug anota una forma que veda a esa atribuida viva, y el siguiente build rompe sobre una Cita que ya estaba en el sitio; ni `rechazar` ni `aprobar` lo avisan antes de anotar. Si deben avisar o negarse, o si la veda solo alcanza lo que entra después, lo decide Héctor (bmad-architecture, AD-32).
    evidence: |-
      tools/lib/revision.ts registra `porVedar` y las rechazadas sin cotejarlas contra las atribuidas publicadas; integraciones/clases.ts juzga toda atribuida publicada contra todo el registro (`fallosDeAtribuidas` con `vedadas`). Hallazgo edge-case-hunter, pasada 1.
    location: >-
      tools/lib/revision.ts (rechazar, aprobar)
    severity: medium
  - summary: >-
      Un Autor que no es `vivo` pero cuyo plazo de derechos corre (solo puede tener atribuidas) sigue contando en la tradición, el suelo y el margen de `verHuecos` y como sembrado en `slugsSembrados`; la historia nombra solo al Autor `vivo`. Si el criterio debe ser `esDeDominioPublico(dueñoAutor(a))`, lo decide Héctor (bmad-create-epics-and-stories).
    evidence: |-
      src/lib/huecos.ts y tools/lib/epocas.ts filtran `vivo === true`; `documentar --retirar` ya usa `esDeDominioPublico` para derivar `cambio-de-clase`, así que las dos superficies usan criterios distintos para «Autor solo de atribuidas». Hallazgo edge-case-hunter, pasada 1.
    location: >-
      src/lib/huecos.ts verHuecos; tools/lib/epocas.ts slugsSembrados
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Abrir la Cita atribuida infla lo que el sitio promete y mide: la línea de cifras la cuenta como cotejada, los destacados, el suelo, el hueco y las épocas la cuentan a su Autor (o cuentan al Autor vivo), la Cita del Día y la Pieza la admiten, SM-C1 la mete en su denominador, y nada impide que una candidata de siempre que no pasó el cotejo vuelva a entrar como atribuida cuando ya no está en `corpus/_revision/`.

**Approach:** Cada cálculo pregunta a `esAtribuida` y excluye a la atribuida (y al Autor `vivo`) donde la historia lo dice; un registro nuevo, `corpus/formas-vedadas.yml`, que solo añade, lo escriben el rechazo, la aprobación fallida por cotejo o Procedencia y `documentar --retirar`, y lo leen la puerta de la atribuida en el alta, la aprobación, `npm run atribuida` y el build; y una constante de despliegue en `undefined` con su corte de serie. Con el Corpus real, `dist/` no cambia.

## Boundaries & Constraints

**Always:**
- `esAtribuida` de `src/lib/clase.ts` es el único lector de `clase`; un Autor `vivo` se reconoce por `vivo === true`.
- Línea de cifras: n = todas las publicadas; m = `autoresPublicados(autores, citas)`; k = las de siempre con `esCitaDocumentada`. «cada una» solo con k = n (censo vacío y ninguna atribuida). `esCitaDocumentada` no cambia (la usan la Tarjeta Social de Autor y su descripción).
- `MIN_CITAS_POR_TEMA` / `temasPublicados` siguen contando las dos clases.
- `formas-vedadas.yml`: cabecera + `formas:` vacía; entradas `{ forma, slug?, motivo, fecha }`, una por línea, `forma` = `normalizar(texto)` no vacía, `motivo` de `MOTIVOS_DE_FORMA_VEDADA = ['cotejo-fallido','sin-procedencia','retirada','cambio-de-clase']`, `fecha` jornada válida; escrito solo por `appendFile` tras componer y analizar el fichero que quedaría y releyéndolo (patrón `registrarClases`). Ilegible ⇒ las órdenes que lo leen o escriben se niegan con 1 sin escribir, y el build rompe nombrándolo.
- Veda: una atribuida juzgada coincide (`parecidoEntre` de `tools/lib/parecido.ts`, texto o Variante) con la `forma` de una entrada, salvo `cambio-de-clase` y salvo la entrada cuyo `slug` es el de la propia Cita; el motivo nombra la entrada (forma, motivo, fecha, slug si lo hay). Lo juzga `fallosDeAtribuidas` (campo nuevo `vedadas`), solo con la puerta abierta, igual en el build, el alta, la aprobación y `cambiarAtribuida`.
- El build lee el registro solo para romper (`integraciones/clases.ts`); ningún byte de `dist/` sale de él; no es familia de `FAMILIAS_DE_FICHERO` (no fecha ni avisa); su «solo añade» lo prueba `npm test` contra `HEAD^1` como el de clases.
- `DESPLIEGUE_DE_LA_ATRIBUIDA: string | undefined = undefined` con su comentario (primer día con una atribuida publicada en vivo, no el merge; la pone Héctor en commit aparte), su entrada en `CORTES_DE_SERIE_DECLARADOS` (`que: 'la primera Cita atribuida publicada'`, `series: ['sm8','continuacion-de-cita']`) y su llegada en SM-C5 de `juiciosPorVentanas`.
- Con el Corpus real y `FECHA_JORNADA` fija, `dist/` idéntico (fuera de `pagefind/`) antes y después.

**Block If:**
- `diff -r -x pagefind` del `dist/` con el Corpus real antes/después muestra cualquier diferencia → HALT `blocked` nombrando los ficheros.
- Algún guion de `GUIONES_EXTERNOS` cambia de bytes por este cambio.

**Never:**
- Dar valor a `DESPLIEGUE_DE_LA_ATRIBUIDA` ni a las constantes de la puerta; sembrar `formas-vedadas.yml` con las candidatas de `corpus/_revision/` o con nada; correr las órdenes que escriben sobre el Corpus real.
- Tocar `src/lib/vocabulario.ts`, zonas, eventos, `_bmad-output/planning-artifacts/`, `_bmad-output/specs/` o `sprint-status.yaml`.
- Una segunda medida de parecido fuera de `tools/lib/parecido.ts`; leer `formas-vedadas.yml` desde `src/`.
- Construir la línea de retirada o `npm run peticion` (35.8).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cifras sin atribuidas | censo vacío, todas con Fuente | «N citas de M autores, cada una cotejada con el texto de su fuente.» | — |
| Cifras con una atribuida | censo vacío, 1 atribuida (con o sin Fuente) | «N citas de M autores; N−1 cotejadas con el texto de su fuente.» | — |
| Destacados / suelo | atribuidas de un Autor vivo y de uno DP | el vivo no entra; las atribuidas no suman al DP | — |
| Huecos | Autor vivo; atribuidas en un Tema | el vivo fuera de tradición y margen; hueco de Tema y margen solo con las de siempre; `anunciadosBajoUmbral` con las dos | — |
| Épocas | Autor `vivo` cuyo slug es candidato | no cuenta como sembrado | — |
| Portada | atribuida marcada `aptaParaPortada` a mano y fijada | fuera de `aptasParaPortada`; `fijacionesSinAtribuidas` la descarta; `listar` y `/lote` la marcan muda | — |
| Pieza `componer` | un slug atribuido | sale con 1 nombrando el slug y «pregunta 27»; no escribe | código 1 |
| Pieza `coleccion` | miembro atribuido | en `fuera` con el motivo de la pregunta 27 | — |
| Auditoría | 2 de siempre (1 completa) + 1 atribuida + 1 `cambio-de-clase` | 50 % sobre 2; «Atribuidas publicadas: 1», «Bajas por cambio de clase: 1» con la lectura de SM-C1; `--json` con `atribuidas` y `bajasPorCambioDeClase` | — |
| Rechazar | candidata de siempre sin Procedencia / con ella | entrada `sin-procedencia` / `cotejo-fallido` con su slug; luego se borra | registro ilegible → 1, nada borrado |
| Aprobar fallida | de siempre sin Fuente (no censada) | sigue en revisión y se anota `cotejo-fallido`; repetir no duplica la entrada | — |
| Retirar | `documentar --retirar` de siempre, Autor DP / Autor ya `vivo` | se mueve y se anota `retirada` / `cambio-de-clase` | si no se puede anotar, la Cita vuelve y sale 1 |
| Veda | alta/aprobación/`atribuida texto` de una atribuida igual a una forma vedada | en revisión / se niega, nombrando la entrada | — |
| Excepciones | entrada `cambio-de-clase`, o entrada con el slug de la propia Cita | no veda | — |
| Build | atribuida publicada que coincide con una vedada (puerta abierta en la copia) | rompe nombrando el fichero y la entrada | build falla |
| Build | `formas-vedadas.yml` con un motivo ajeno | rompe nombrándolo | build falla |

</intent-contract>

## Code Map

- `src/lib/publicado.ts:454` `lineaDeCifras` -- k pasa a `!esAtribuida(c) && esCitaDocumentada(c)`; comentario. `:361` `autoresDestacados` -- recuento solo de las de siempre (Pick con `clase`) y fuera los `vivo === true`. `:411` `temasPublicados` -- no cambia.
- `src/lib/huecos.ts` -- `AutorParaHuecos` gana `vivo?: unknown`, `CitaParaHuecos` gana `clase?: unknown`; `verHuecos` (l.469) toma `deSiempre` para el hueco de Tema y el margen (y su total), `autores` sin `vivo` para tradición, clásicos y margen; `anunciadosBajoUmbral` sigue con todas. Llamadores `tools/huecos.ts:147`, `tools/objetivo.ts:142` pasan lo leído en bruto (ya trae `clase` y `vivo`).
- `tools/lib/epocas.ts:674` `slugsSembrados` -- salta el Autor `vivo === true` (tipo con `vivo?: unknown`); lo usan `epocasParaHuecos`, `tools/epocas.ts:310` y `tools/lib/gestion.ts:986`.
- `src/lib/citaDelDia.ts:151` `aptasParaPortada` -- `c.aptaParaPortada && !esAtribuida(c)`.
- `src/lib/portada.ts` -- nueva `fijacionesSinAtribuidas(fijaciones, citas)`; aplicada en `src/pages/index.astro:94`, `404.astro:39`, `rss.xml.ts:28`, `kit.astro:32` (no en `lote.astro`, que debe enseñarla muda).
- `tools/lib/jornadas.ts:385` `inventarioDeJornadas` -- `JornadaFijada` gana `atribuida: boolean`, `apta` falso si lo es; `tools/jornada.ts:168` aviso «← es atribuida, y una atribuida no sale en portada (pregunta 22): ese día rotará otra».
- `tools/lib/piezas.ts:~320` -- antes del Personaje, rechazo de la atribuida con «pregunta 27»; `src/lib/coleccionEnPieza.ts:~105` -- `fuera` con el mismo motivo.
- `src/lib/salud.ts` -- `CitaParaAuditar` gana `clase?`; `auditar` cuenta solo las de siempre y devuelve `atribuidas: number`; `sinTraduccionDeclarada` salta las atribuidas. `tools/auditoria.ts` -- lee `formas-vedadas.yml`, líneas «Atribuidas publicadas» y «Bajas por cambio de clase» (+ lectura SM-C1 si ≠ 0), y las dos en `--json`. `tools/objetivo.ts:233` registra `procedenciaCompleta` de `auditar` (ya solo de siempre).
- `tools/lib/formasVedadas.ts` -- NUEVO: `FICHERO_DE_FORMAS_VEDADAS = 'formas-vedadas.yml'`, `MOTIVOS_DE_FORMA_VEDADA`, `FormaVedada`, `CABECERA`, `leerFormasVedadas(rutas)`, `registrarFormasVedadas(rutas, entradas)` (vacío no escribe; omite las que ya hay con la misma forma, motivo y slug), `entradaVedada(texto, motivo, fecha, slug?)`, `vedanALaAtribuida(vedadas, slug)`, `bajasPorCambioDeClase(vedadas)`. Modelo: `leerRegistroDeClases`/`registrarClases`, `tools/lib/corpus.ts:3699-3830`.
- `tools/lib/corpus.ts:353,396` -- `Rutas.formasVedadas` y su ruta.
- `corpus/formas-vedadas.yml` -- NUEVO: cabecera (qué registra, solo añade, quién escribe, quién lee, no fecha ni avisa) y `formas:` vacía.
- `tools/lib/atribuidas.ts:146` `EntradaDelJuicio` gana `vedadas?: readonly FormaVedada[]`; en `fallosDeAtribuidas` (l.207), con la puerta abierta, fallo por cada juzgada que coincide con una vedada que la veda.
- `integraciones/clases.ts:31` -- lee `leerFormasVedadas` y la pasa; su ilegibilidad rompe por la vía de `revisar()`.
- `tools/alta.ts:702`, `tools/lib/revision.ts:642`, `tools/lib/cambioDeAtribuida.ts:403` -- pasan `vedadas` (leídas una vez antes de escribir nada).
- `tools/lib/revision.ts` -- `CandidataEnRevision` (l.71) gana `faltaCotejo?: true` (`sinDocumento`) y `faltaProcedencia?: true` (`gradoDeProcedencia(procedencia) === 'ausente'`), solo en las de siempre (l.322); `aprobar` acumula las entradas de las de siempre no admisibles por eso y las registra al final (fallo → aviso); `rechazar` (l.968) registra antes de borrar (de siempre) y, si falla, no borra nada y lo dice.
- `tools/revisar.ts` -- si `rechazar` lleva motivos (registro ilegible), sale con 1.
- `tools/lib/documentacion.ts:825` `retirarCita` -- tras mover, `registrarFormasVedadas` con `retirada` o `cambio-de-clase` (`esDeDominioPublico(dueñoAutor(autor))` falso); si falla, devuelve la Cita a `corpus/citas/`, restituye el censo y sale con 1; el parte dice el motivo anotado.
- `src/lib/umbrales.ts:243-320` -- `DESPLIEGUE_DE_LA_ATRIBUIDA` y su corte.
- `tools/lib/lineaBase.ts:444` -- SM-C5 `corte.llegadas` gana `{ deDondeLlega: 'DESPLIEGUE_DE_LA_ATRIBUIDA', marca: 'la primera Cita atribuida publicada en vivo, no el merge' }`.
- Pruebas existentes a tocar: `tests/unit/publicable-y-alcanzable.test.ts:1136` (la línea pasa a la redacción 1 con `CITAS_POR_PAGINA + 1 + CITAS_DE_CARTAS.length` cotejadas), `tests/unit/linea-base.test.ts:1281,1297` (lista de llegadas de SM-C5), `tests/unit/clases-de-cita.test.ts:224` (modelo del «solo añade»). Andamios: `tests/unit/ayuda/construir.ts` (`citaValida`, `conLaPuertaAbierta`, `PUERTA_DE_PRUEBA`, `ATESTIGUADA`, `registroDeClasesDe`), `tests/unit/ayuda/relleno.ts` (`sembrarTemaPublicado`), `tests/unit/duplicados.test.ts:350` (`conBuzz`, `candidataDeBuzz`).

## Tasks & Acceptance

**Execution:**
- `src/lib/publicado.ts`, `src/lib/huecos.ts`, `src/lib/citaDelDia.ts`, `src/lib/portada.ts`, `src/lib/salud.ts`, `src/lib/coleccionEnPieza.ts` -- excluir la atribuida y el Autor `vivo` como dice el Code Map -- AD-11, AD-1, FR-16.
- `src/pages/index.astro`, `404.astro`, `rss.xml.ts`, `kit.astro` -- `fijacionesSinAtribuidas` -- pregunta 22.
- `tools/lib/epocas.ts`, `tools/lib/jornadas.ts`, `tools/jornada.ts`, `tools/lib/piezas.ts`, `tools/auditoria.ts` -- lo mismo en `tools/` -- AD-1, AD-15.
- `tools/lib/formasVedadas.ts`, `tools/lib/corpus.ts`, `corpus/formas-vedadas.yml` -- el registro -- AD-32.
- `tools/lib/atribuidas.ts`, `integraciones/clases.ts`, `tools/alta.ts`, `tools/lib/revision.ts`, `tools/revisar.ts`, `tools/lib/cambioDeAtribuida.ts`, `tools/lib/documentacion.ts` -- escribir y leer el registro -- AD-32, AD-24.
- `src/lib/umbrales.ts`, `tools/lib/lineaBase.ts` -- la constante y su corte -- AD-9, AD-13.
- `tests/unit/clase-de-siempre.test.ts` -- NUEVO, puro: `lineaDeCifras` (las dos redacciones, censo vacío + una atribuida), `autoresDestacados` y `verHuecos` (vivo fuera, atribuidas sin sumar, `anunciadosBajoUmbral` con las dos), `temasPublicados` con las dos clases (`MIN_CITAS_POR_TEMA`), `slugsSembrados` sin el vivo, `aptasParaPortada`, `fijacionesSinAtribuidas`, `seleccionDeColeccion` con un miembro atribuido, `auditar` (porcentaje sobre siempre, `atribuidas`), `fallosDeAtribuidas` con vedadas (veda, `cambio-de-clase` no veda, mismo slug no veda, puerta cerrada solo da su motivo).
- `tests/unit/formas-vedadas.test.ts` -- NUEVO: leer/registrar (cabecera, solo añade, entrada sin forma o motivo ajeno no escribe, ilegible lanza, idempotente por forma+motivo+slug); `rechazar` (los dos motivos, ilegible → nada borrado), `aprobar` fallida por Fuente (anota una vez), `retirarCita` (`retirada` y `cambio-de-clase`, fallo al anotar → la Cita vuelve), alta y aprobación de una atribuida vedada con `PUERTA_DE_PRUEBA` → en revisión nombrando la entrada; «solo añade» del fichero del árbol contra `HEAD^1`; no es familia de fichero; el del árbol tiene `formas:` vacía.
- `tests/unit/clase-de-siempre-build.test.ts` -- NUEVO, `construirConCorpus` con `conLaPuertaAbierta`: atribuida publicada igual a una forma vedada → el build rompe nombrando el fichero; con un motivo ajeno en el registro → rompe. La redacción 1 con censo vacío y atribuidas la fija en `dist/` `publicable-y-alcanzable.test.ts` (su copia ya trae las atribuidas de Batman y el censo vacío).
- `tests/unit/pieza-cli.test.ts`, `tests/unit/jornadas.test.ts`, `tests/unit/auditoria-cli.test.ts`, `tests/unit/linea-base.test.ts` -- añadir: `componer` con atribuida → 1 sin escribir; `inventarioDeJornadas` marca la atribuida; la auditoría por proceso con las dos cifras y `--json`; el juicio de SM-C5 con `DESPLIEGUE_DE_LA_ATRIBUIDA` sin valor («no ha ocurrido» con su marca) y con valor (línea base propia), construidos como los del pasaje, sin fijar el valor del árbol.
- `tests/unit/publicable-y-alcanzable.test.ts` -- la línea de cifras pasa a la redacción 1 y el comentario dice por qué.
- `AGENTS.md` -- «Una sesión de sembrado» (formas vedadas: quién las escribe, que vedan la atribuida) y «Documentar una Cita ya publicada» (`--retirar` anota la forma, `retirada` o `cambio-de-clase`); `DESPLIEGUE_DE_LA_ATRIBUIDA` entre las constantes de Héctor en «Leer la línea base».

**Acceptance Criteria:**
- Given el Corpus real y `FECHA_JORNADA` fija, when se construye antes y después y se compara `diff -r -x pagefind`, then ningún fichero difiere.
- Given `npm run pieza -- componer --red instagram <atribuida> <otra>` en una copia, when corre, then sale con 1 nombrando el slug y la pregunta 27, y no hay PNG.
- Given `corpus/formas-vedadas.yml` del árbol, when se lee, then tiene su cabecera y `formas:` vacía, y empieza por el del primer padre.
- Given `npm test`, `npx astro check` y `npm run build`, when corren tras el cambio, then pasan sin errores nuevos.

## Spec Change Log

## Review Triage Log

### 2026-11-14 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

### 2026-11-14 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 15 (high 0, medium 5, low 10)
- defer: 2 (high 0, medium 2, low 0)
- reject: 18 (high 0, medium 6, low 12)
- addressed_findings:
  - `[medium]` `[patch]` `tools/auditoria.ts` con `formas-vedadas.yml` ilegible seguía con 0, contra la regla «las órdenes que lo leen se niegan con 1»: ahora escribe el informe sin la cifra (`bajasSinLeer`, nunca cero) y sale con 1; prueba por proceso en `auditoria-cli.test.ts` y AGENTS.md al día.
  - `[medium]` `[patch]` La deuda de cotejo de la auditoría (`resumenDeCotejo`) contaba como «con documento» a la atribuida con Fuente: ahora recibe solo la clase de siempre; aserción `cotejo.conDocumento` en `auditoria-cli.test.ts`.
  - `[medium]` `[patch]` `tools/objetivo.ts` cambiaba en silencio el significado de `citasPublicadas` de `sesiones-de-sembrado.yml`: suma de nuevo las atribuidas (`salud.publicadas.total + salud.atribuidas`); solo `procedenciaCompleta` pasa a la clase de siempre. AGENTS.md lo dice.
  - `[medium]` `[patch]` La vuelta atrás de `retirarCita` cuando anotar falla tras mover la Cita no tenía prueba: `documentacion.test.ts` la fuerza con el registro de solo lectura y exige la Cita y el censo como estaban.
  - `[medium]` `[patch]` Los caminos de salida de `tools/revisar.ts` no tenían prueba: `formas-vedadas.test.ts` corre la orden y comprueba la línea ⊘ de `--rechazar`, el 1 sin borrar nada con el registro ilegible y el 1 con «Las formas vedadas no se anotaron» en `--aprobar`.
  - `[low]` `[patch]` La etiqueta «Citas publicadas» de la auditoría nombraba otra cantidad: pasa a «Citas de siempre publicadas», diciendo que la línea de cifras del sitio cuenta las dos.
  - `[low]` `[patch]` `retirarCita`: la lectura de Autores y `esDeDominioPublico` entran en el `try` previo (negativa, no excepción), y la restitución del censo en la vuelta atrás tiene su propio `try` y lo dice si falla.
  - `[low]` `[patch]` El parte de `retirarCita` decía «queda vedada» para una entrada `cambio-de-clase`, que no veda: ahora la nombra como baja por cambio de clase que no veda.
  - `[low]` `[patch]` `tools/lib/piezas.ts`: quitada la línea en blanco que separaba el comentario del Personaje de su `if`.
  - `[low]` `[patch]` La cabecera de `tools/lib/formasVedadas.ts` atribuía escritura a la retirada por petición de la 35.8, que no existe: retirado.
  - `[low]` `[patch]` `verHuecos` reasignaba su parámetro `autores` y derivaba dos veces la clase de siempre: parámetro `todosLosAutores`, `deSiempre` como un solo conjunto que usan el hueco de Tema y el margen.
  - `[low]` `[patch]` Ninguna aserción leía `caben` con atribuidas presentes: prueba nueva en `clase-de-siempre.test.ts` que distingue el total de la clase de siempre del de todas.
  - `[low]` `[patch]` El salto de la atribuida en `sinTraduccionDeclarada` no tenía prueba: caso puro en `clase-de-siempre.test.ts` con una atribuida con Fuente de Autor `otra`.
  - `[low]` `[patch]` La aprobación que anota `sin-procedencia` no tenía prueba: caso en `formas-vedadas.test.ts`.
  - `[low]` `[patch]` El aviso «es atribuida» de `npm run jornada -- listar` no tenía prueba: caso por proceso en `jornadas.test.ts`.

## Verification

**Commands:**
- `npx vitest run tests/unit/clase-de-siempre.test.ts tests/unit/formas-vedadas.test.ts` -- expected: verde.
- `npx vitest run tests/unit/clase-de-siempre-build.test.ts tests/unit/publicable-y-alcanzable.test.ts tests/unit/linea-base.test.ts tests/unit/pieza-cli.test.ts tests/unit/jornadas.test.ts tests/unit/auditoria-cli.test.ts tests/unit/huecos.test.ts tests/unit/autores-destacados.test.ts tests/unit/salud.test.ts` -- expected: verde.
- `npx astro check` -- expected: 0 errores.
- `FECHA_JORNADA=2026-11-14 npm run build` en la base (worktree desacoplado) y en la rama, `diff -r -x pagefind` -- expected: sin diferencias.
- `npm test` (desacoplado con `correr.sh`) -- expected: verde.

## Auto Run Result

Status: done

**Resumen.** Lo cotejado se cuenta solo con la clase de siempre: la línea de cifras (k sin atribuidas, «cada una» solo sin ellas), los destacados y el suelo (sin atribuidas ni Autor `vivo`), los huecos (Tema y margen sobre la clase de siempre, tradición sin el `vivo`; `anunciadosBajoUmbral` con las dos), las épocas (`slugsSembrados` sin el `vivo`), la portada (`aptasParaPortada` y `fijacionesSinAtribuidas`; `listar` y `/lote` la marcan muda), la Pieza (`componer` 1 y `coleccion` excluida, pregunta 27) y SM-C1 (`auditar`, con `atribuidas` y bajas por cambio de clase aparte en `tools/auditoria.ts`). Registro nuevo `corpus/formas-vedadas.yml` (`tools/lib/formasVedadas.ts`), escrito por `revisar --rechazar`, la aprobación fallida por cotejo o Procedencia y `documentar --retirar` (`retirada` o `cambio-de-clase`, derivado), y leído por `fallosDeAtribuidas` en el build, el alta, la aprobación y `npm run atribuida`. `DESPLIEGUE_DE_LA_ATRIBUIDA` en `undefined` con su corte (`sm8`, `continuacion-de-cita`) y su llegada en SM-C5.

**Ficheros.**
- `src/lib/publicado.ts` — k de la línea de cifras y destacados sin atribuidas ni `vivo`.
- `src/lib/huecos.ts` — huecos y margen sobre la clase de siempre; tradición sin `vivo`.
- `src/lib/citaDelDia.ts`, `src/lib/portada.ts`, `src/pages/{index,404,kit}.astro`, `src/pages/rss.xml.ts` — la atribuida fuera de portada y fijaciones.
- `src/lib/coleccionEnPieza.ts`, `tools/lib/piezas.ts` — la atribuida fuera de la Pieza.
- `src/lib/salud.ts`, `tools/auditoria.ts` — SM-C1 sobre la clase de siempre; atribuidas y bajas aparte.
- `src/lib/umbrales.ts`, `tools/lib/lineaBase.ts` — `DESPLIEGUE_DE_LA_ATRIBUIDA` y su corte.
- `tools/lib/formasVedadas.ts`, `corpus/formas-vedadas.yml`, `tools/lib/corpus.ts` — el registro.
- `tools/lib/atribuidas.ts`, `integraciones/clases.ts`, `tools/alta.ts`, `tools/lib/cambioDeAtribuida.ts` — la veda en la puerta.
- `tools/lib/revision.ts`, `tools/revisar.ts`, `tools/lib/documentacion.ts` — quién escribe el registro.
- `tools/lib/epocas.ts`, `tools/lib/jornadas.ts`, `tools/jornada.ts` — épocas sin `vivo`; `listar` marca la atribuida.
- `AGENTS.md` — formas vedadas, lo que cuenta solo la clase de siempre, `--retirar` y la constante.
- Pruebas: `clase-de-siempre.test.ts`, `formas-vedadas.test.ts`, `clase-de-siempre-build.test.ts` (nuevas); `atribuida-cli`, `auditoria-cli`, `coleccion-en-pieza`, `documentacion`, `jornadas`, `linea-base`, `lote`, `pieza-cli`, `publicable-y-alcanzable`; y `alcance-construido` (rota desde `d1cf408201`, que renombró `clase` a `nombreDeClase` en `LoQueRota.astro`: el patrón de la prueba lo sigue).

**Revisión.** Pasada sin hallazgos externos: 0 parches, 0 diferidos, 0 rechazados. `followup_review_recommended: false` (puntuación 0).

**Verificación.** `npm test` 193 ficheros / 8.327 pruebas en verde; `npx astro check` 0 errores; `FECHA_JORNADA=2026-11-14 npm run build` en la base (worktree desacoplado en `2813281513`) y en la rama, `diff -rq -x pagefind` sin diferencias (repetido tras los últimos cambios).

**Riesgos residuales.** Los supuestos del frontmatter `deferred` (hueco de Tema, quién escribe `cambio-de-clase`, motivo del rechazo, periodo de las bajas, series del corte) los decide Héctor. La rama de `retirarCita` en que la anotación falla **tras** mover la Cita (devolverla) no tiene prueba propia; la de registro ilegible, sí.

### Pasada de revisión 1 (2026-11-14, sobre `fb35359edd`)

**Resumen.** Cinco capas externas (blind-hunter, edge-case-hunter, verification-gap, intent-alignment, ac-auditor): 15 parches, 2 diferidos, 18 rechazados, ningún intent_gap ni bad_spec. Los parches cierran lo que se desviaba del contrato o de la serie (la auditoría sale con 1 con el registro ilegible; la deuda de cotejo sin atribuidas; `citasPublicadas` de la sesión vuelve a contar las dos clases), endurecen `retirarCita` y su parte, limpian `verHuecos`, `piezas.ts` y la cabecera de `formasVedadas.ts`, y añaden las pruebas que faltaban (vuelta atrás de la retirada, salidas de `revisar`, `caben`, `sinTraduccionDeclarada`, `sin-procedencia`, aviso de `jornada listar`).

**Ficheros de esta pasada.**
- `tools/auditoria.ts` — sale con 1 con `formas-vedadas.yml` ilegible; cotejo solo de siempre; etiqueta «Citas de siempre publicadas».
- `tools/objetivo.ts` — `citasPublicadas` suma las atribuidas: la serie sigue midiendo lo mismo.
- `tools/lib/documentacion.ts` — lectura de Autores dentro del `try`; restitución del censo protegida; parte de `cambio-de-clase` sin «vedada».
- `src/lib/huecos.ts` — sin reasignar el parámetro; `deSiempre` como un solo conjunto.
- `tools/lib/piezas.ts`, `tools/lib/formasVedadas.ts` — línea en blanco y mención a la 35.8.
- `AGENTS.md` — la auditoría con el registro ilegible y el `citasPublicadas` de la sesión.
- Pruebas: `auditoria-cli`, `clase-de-siempre`, `documentacion`, `formas-vedadas`, `jornadas`.

**Hallazgos.** Parches 15 (medium 5, low 10). Diferidos 2: la veda que alcanza a una atribuida ya publicada al rechazar una de siempre con su mismo texto, y el Autor con plazo vigente que no es `vivo`. Rechazados 18 (entre ellos: retirar una atribuida, que `localizarPublicada` ya impide; el motivo del rechazo, el periodo de las bajas y el campo del hueco, ya diferidos a Héctor; `cambio-de-clase` que no veda nunca y `fijacionesSinAtribuidas`, que fija el `<intent-contract>`; la redacción de la línea de cifras y «léase como una bajada», que son del epic; la asimetría de formas, que no existe porque las dos pasan por `normalizar`).

**Revisión de seguimiento.** `followup_review_recommended: true`: 0 high, 5 medium y 10 low entre los parches, puntuación 3×5 + 10 = 25 ≥ 5.

**Verificación.** `npx vitest run` de los 12 ficheros tocados o cercanos (383 pruebas) en verde; `npx astro check` 0 errores; `npm test` desacoplado: 193 ficheros / 8.334 pruebas en verde (log `.claude/v9-ralph/logs/s-35/triage-35.7-1-npmtest.log`). El `diff` de `dist/` no se repitió: lo único de `src/` que cambia es una refactorización sin efecto de `verHuecos`, que ninguna página importa (`publicado.ts` solo toma `cuentaParaElSuelo`).

**Riesgos residuales.** Los dos diferidos nuevos y los supuestos anteriores, para Héctor.
