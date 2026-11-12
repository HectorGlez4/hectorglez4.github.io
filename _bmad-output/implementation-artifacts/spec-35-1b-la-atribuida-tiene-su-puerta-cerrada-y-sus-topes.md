---
title: 'Historia 35.1b — La atribuida tiene su puerta, cerrada, y sus topes'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_revision: 'fbf5692012104972d0d9300716caf1193974ebb7'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-35-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-35-1-la-clase-se-fija-al-dar-de-alta-y-queda-registrada.md'
warnings: [oversized]
deferred:
  - summary: 'Los «espejos conocidos» de BrainyQuote no están enumerados en ningún artefacto: el conjunto cerrado entra con `brainyquote.com` (y el propio dominio aparte); añadir espejos es decisión de Héctor en un diff de `src/lib/atestiguaciones.ts`.'
    evidence: 'AD-32 («la semilla, BrainyQuote, y sus espejos conocidos») no los nombra; epics.md Story 35.1b.'
    severity: low
  - summary: '`tools/autor.ts crear --vivo` y la revisión de las lecturas crudas de `añoFallecimiento` en `tools/` (cruce por épocas, auditoría, suelo, objetivo) siguen diferidas: con la puerta cerrada y ningún Autor vivo en el Corpus real no se ejercen; las cierra quien dé de alta el primer Autor vivo (Héctor, al abrir la puerta).'
    evidence: 'Diferidos de la 35.1 que la señalaban «35.1b o quien publique la primera atribuida de un Autor vivo»; esta historia no da de alta ningún Autor.'
    severity: low
  - summary: '`MAX_CARACTERES_DE_ATRIBUIDA` sobre la `variante` se aplica cuando exista el campo (Historia 35.6): hoy solo juzga el `texto`.'
    evidence: 'epics.md Story 35.1b («y, cuando exista, la variante»).'
    severity: low
---

<intent-contract>

## Intent

**Problem:** La 35.1 deriva la clase atribuida pero la deja siempre en `corpus/_revision/` con un motivo provisional; falta la puerta real de la atribuida —atestiguaciones contadas por dominio registrable, `origen`, sin salto, no apta para portada, sin cotejo, figura pública con Obra, duplicados entre clases— y sus cinco constantes con nombre, que mientras no tengan valor la mantienen cerrada en el build y en las órdenes.

**Approach:** Esquema de la atribuida en `src/lib/admision.ts` (con `dominioDeAtestiguacion` de un `src/lib/atestiguaciones.ts` nuevo sobre `tldts@7.4.19`), un módulo puro `tools/lib/atribuidas.ts` que juzga la puerta cerrada, los topes sobre el Corpus entero, la figura sin Obra y los duplicados entre clases, enchufado al build (`integraciones/clases.ts`), al alta y a `revisar --aprobar`; el cotejo salta la atribuida; portada y jornada la rechazan. Con el Corpus real `dist/` no cambia.

## Boundaries & Constraints

**Always:**
- Usar sin cambiarlos `esAtribuida`, `derechosVigentes`, `claseQueCorresponde` de `src/lib/clase.ts` y el registro de clases. Ningún módulo nuevo lee `clase` ni escribe el literal `'atribuida'`: todo pasa por `esAtribuida` (lo vigila `tests/unit/clase.test.ts`).
- Las cinco constantes entran en `undefined`, con comentario de dueño (Héctor) y regla: `MAX_CARACTERES_DE_ATRIBUIDA`, `MAX_ATRIBUIDAS_POR_OBRA`, `MAX_ATRIBUIDAS_POR_DUEÑO`, `MIN_ATESTIGUACIONES_DE_ATRIBUIDA` (`src/lib/umbrales.ts`, literales, sin cálculo: el módulo viaja al cliente) y `BUZON_DE_PETICIONES` (`src/lib/dominio.ts`). Ninguna prueba fija su valor: las que se lo dan parchean la copia sustituyendo el valor que tengan (como `clase-build.test.ts`).
- **Puerta cerrada** = alguna de las cinco en `undefined`: el build rompe ante cada atribuida de `corpus/citas/` nombrando su fichero y **cada** constante sin valor; el alta y `revisar --aprobar` la dejan en `corpus/_revision/` con ese mismo motivo (sustituye a `MOTIVO_PUERTA_CERRADA` de la 35.1, que nombra ya las constantes).
- `dominioDeAtestiguacion(url)` es la única que cuenta: eTLD+1 con `tldts` solo ICANN (`allowPrivateDomains: false`), `undefined` para una URL sin dominio registrable, del conjunto cerrado `DOMINIOS_QUE_NO_ATESTIGUAN` (`brainyquote.com`) o del propio `DOMINIO`. Sin red. `tldts` fijado exacto (`"tldts": "7.4.19"`, sin `^`) y nunca en un guion del cliente.
- Esquema de la atribuida: `atestiguaciones` lista no vacía de `{url (http/https), consultadaEl (jornada, `esJornada`)}`; con `MIN_ATESTIGUACIONES_DE_ATRIBUIDA` con valor, al menos tantos dominios distintos que cuenten; `origen ∈ {original, doblaje, traduccion-publicada}`; `texto` sin `\n` aun con Fuente; `aptaParaPortada: true` rechazado. La de siempre con `atestiguaciones` u `origen` es error que nombra el fichero. Los dos campos se declaran también en la colección `citas` de `src/content.config.ts` y van a `CAMPOS_QUE_NO_FECHAN.cita` en el mismo commit; no viajan a `publicado.ts` ni a `dist/`.
- Con la puerta abierta, build, alta y aprobación juzgan, sobre el Corpus entero más lo que la pasada publica: texto > `MAX_CARACTERES_DE_ATRIBUIDA` puntos de código; más de `MAX_ATRIBUIDAS_POR_OBRA` atribuidas en una Obra cuyo dueño tiene derechos vigentes; más de `MAX_ATRIBUIDAS_POR_DUEÑO` atribuidas de un dueño (Autor o, sin él, Personaje) con derechos vigentes. Cada fallo nombra la Cita o la Obra o el dueño, el recuento y el tope.
- Figura pública sin Obra: atribuida con Autor y sin Personaje solo si ese Autor es `autor` de alguna Ficha de Obra activa (en el alta cuenta la que la misma entrada crea); si no, revisión / build rompe nombrando el Autor y «pregunta 23». Con Personaje no aplica.
- Duplicados entre clases: la atribuida se compara con `parecidoEntre` (sus tres clases) contra lo publicado de las dos clases y, en las órdenes, contra las demás candidatas de `_revision/` y del lote; cualquier coincidencia la niega nombrando el slug y la clase, también con `--con-duplicados`. El build repite contra `corpus/citas/` solo.
- Cotejo: `cotejar` salta toda atribuida (no la coteja ni le exige Fuente aunque la declare; no cuenta como cotejada) y rompe si una está en el censo; `motivoParaNoPublicar` no exige Fuente a la atribuida. Una atribuida con Fuente la conserva y pinta su Línea de la Fuente; sin Fuente, nada. `aprobar` no restituye saltos (29.2) a una atribuida.
- `marcarAptaParaPortada` y `fijarJornadas` se niegan ante una atribuida con 1, nombrando la Cita y «pregunta 22».
- Tema: la atribuida necesita Tema publicado como toda Cita (lo que ya hacen las órdenes). Códigos: 2 forma, 1 contenido.

**Block If:**
- `npm install --save-exact tldts@7.4.19` no puede instalar la versión exacta.
- Con el Corpus real, `dist/` cambia frente a la construcción de antes en la misma jornada por algo que no sea un error propio corregible.
- El guion de algún `GUIONES_EXTERNOS` crece (tldts arrastrado al cliente) y no se puede evitar sin tocar topes.

**Never:**
- Dar valor a ninguna constante, sembrar atribuidas, Autores vivos, Personajes ni atestiguaciones en el Corpus real; descargar o cotejar atestiguaciones; tocar `src/lib/vocabulario.ts`, `_bmad-output/planning-artifacts/`, `_bmad-output/specs/`.
- `formas-vedadas.yml` (35.7), la `variante` y la orden `atribuida` (35.6), el buzón y su línea (35.8), pintar la atribuida en superficies o quitarle Cómo citar/pasaje (35.4).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Corpus real | Constantes en `undefined`, sin atribuidas | Build 0, `dist/` idéntico | — |
| Puerta cerrada, build | Atribuida válida en `citas/`, una constante en `undefined` (copia) | Build rompe nombrando fichero y constantes sin valor | — |
| Puerta cerrada, órdenes | Lote/candidata atribuida | A/queda en `_revision/` con el motivo de las constantes | Sale como hoy |
| Feliz (copia, cinco valores) | Autor `vivo` con Ficha, 2 atestiguaciones de dominios distintos, `origen`, Tema | Build 0; Página de Cita sin Línea de la Fuente | — |
| Subdominios | `es.wikiquote.org` + `en.wikiquote.org` | Cuentan 1 | — |
| Dos niveles | `bbc.co.uk` | `bbc.co.uk` | — |
| Sufijo privado | dos `*.github.io` | Cuentan 1 (solo ICANN) | — |
| Vetados | URL de BrainyQuote o del propio dominio | No cuenta | — |
| Dominio de menos | 2 URL, un dominio, MIN=2 | Error del esquema | — |
| Con `\n` | atribuida con salto | Error del esquema | — |
| Siempre con `atestiguaciones`/`origen` | — | Error que nombra el fichero | — |
| Apta | atribuida con `aptaParaPortada: true`; `portada marcar`; `jornada fijar` | Error del esquema; órdenes salen 1 con «pregunta 22» | — |
| Tope | texto largo / Obra o dueño sobre su tope | Rechazo con recuento y tope | Build rompe; orden: revisión |
| Sin Obra | Autor vivo sin ninguna Ficha, sin Personaje | Rechazo nombrando Autor y pregunta 23 | ídem |
| Duplicado | atribuida contenida en una publicada de siempre o en otra candidata | Rechazo nombrando slug y clase | ídem, también con `--con-duplicados` |
| En el censo | atribuida en `pendientes-de-cotejo.yml` | Build rompe | — |

</intent-contract>

## Code Map

- `src/lib/umbrales.ts` -- añadir las cuatro constantes junto a `PLAZO_DE_PROTECCION_AÑOS`/`AÑO_DE_REFERENCIA` (35.1), literales en `undefined`.
- `src/lib/dominio.ts` -- `BUZON_DE_PETICIONES: string | undefined = undefined`; `DOMINIO` (lee `public/CNAME`) para excluir el propio.
- `src/lib/atestiguaciones.ts` (nuevo) -- `dominioDeAtestiguacion`, `DOMINIOS_QUE_NO_ATESTIGUAN`, `dominiosQueAtestiguan(lista)` (distintos); `import { getDomain } from 'tldts'`.
- `src/lib/admision.ts:180-310,657-677` -- esquemas `atestiguacion`, `origen` (`ORIGENES`); ampliar `reglasDeClase` (atribuida: exige los dos, sin `\n`, no apta, recuento si MIN con valor; siempre: rechaza los dos); `citaAdmisible` gana los campos. Solo lo importan `content.config.ts` y `publicado.ts` (servidor).
- `src/content.config.ts:71-115` -- declarar `atestiguaciones` y `origen` en `citas`.
- `tools/lib/atribuidas.ts` (nuevo, puro) -- `constantesSinValor(valores)`, `motivoPuertaCerrada`, `fallosDeAtribuidas({citas, autores, personajes, fichas, topes, comparables})` (topes, figura sin Obra con «pregunta 23», duplicados con `parecidoEntre`/`indiceDeContencion` de `tools/lib/parecido.ts:204,291`), con `topes` por parámetro y por omisión los del árbol (patrón `ReferenciaDeDerechos` de `clase.ts`). La Obra de una Cita: `fichaDeCita` de `src/lib/obras.ts:381`; su dueño, `ficha.autor ?? ficha.personaje`.
- `tools/lib/clases.ts:39` -- `MOTIVO_PUERTA_CERRADA` pasa a función/valor que nombra las constantes (de `atribuidas.ts`); revisar sus usos en `tools/alta.ts:539` y `tools/lib/revision.ts:529-532`.
- `integraciones/clases.ts:31-55` -- además de `fallosDeClases`, leer fichas (`leerFichasDeObra`) y personajes y añadir `fallosDeAtribuidas`; mismo titular/corte.
- `tools/lib/cotejo.ts:492-516,596-700` -- `CitaParaCotejar` gana `clase?`; `cotejar` salta la atribuida y rompe si está en el censo; `motivoParaNoPublicar` devuelve `undefined` ante una atribuida. `integraciones/cotejo.ts:81-87` pasa la clase (con `claseDe` si `esAtribuida`).
- `tools/alta.ts:404-660` -- tras derivar la clase: puerta cerrada → motivo; abierta → `fallosDeAtribuidas` con lo publicado + `enRevisionYa` + lo que la pasada ya publica (y la ficha planificada cuenta como Obra del Autor); duplicados de la atribuida no se saltan con `conDuplicados`; `aRegistroDeCita` escribe `atestiguaciones`/`origen`. `EntradaDeLote` gana los dos campos.
- `tools/lib/revision.ts:455-600` -- en `aprobar`, sustituir el rechazo fijo de la atribuida por el mismo juicio (lote de `_revision/` como comparables); saltar `saltosQueLeFaltan` para la atribuida; `loteEnRevision:239` pasa la clase a `motivoParaNoPublicar`.
- `tools/extraer.ts` -- (diferido de la 35.1) derivar la clase con `claseQueCorresponde` y no escribir `estadoDerechos` cuando deriva atribuida (escribe `clase`).
- `tools/lib/gestion.ts:622` `marcarAptaParaPortada`, `tools/lib/jornadas.ts:234` -- negarse ante `esAtribuida`.
- `tools/lib/cambios.ts:388-401` -- `CAMPOS_QUE_NO_FECHAN.cita` += `atestiguaciones`, `origen`.
- `tests/unit/ayuda/construir.ts:163,246` -- `ficheros` para parchear `umbrales.ts`/`dominio.ts` en la copia; `sembrarClases` ya registra la atribuida del fixture.
- `tests/unit/clase-build.test.ts` -- su construcción feliz publica una atribuida de Autor vivo: con la puerta cerrada ya no construye; darle los cinco valores en la copia (y atestiguaciones/origen) o moverla a la prueba nueva.
- `tests/unit/medicion.test.ts` (`GUIONES_EXTERNOS`) -- debe pasar sin tocar topes.

## Tasks & Acceptance

**Execution:**
- `package.json`, `package-lock.json` -- `npm install --save-exact tldts@7.4.19` -- dependencia de AD-32.
- `src/lib/umbrales.ts`, `src/lib/dominio.ts` -- las cinco constantes en `undefined` con su comentario.
- `src/lib/atestiguaciones.ts` -- módulo nuevo y `tests/unit/atestiguaciones.test.ts` (subdominios, `bbc.co.uk`, sufijo privado, BrainyQuote, propio dominio, URL sin dominio).
- `src/lib/admision.ts`, `src/content.config.ts` -- esquema de la atribuida.
- `tools/lib/atribuidas.ts` + `tests/unit/atribuidas.test.ts` -- juicio puro con topes por parámetro (cerrada, cada tope, figura sin Obra, Personaje sin exigencia, duplicado con cada clase de coincidencia).
- `integraciones/clases.ts`, `tools/lib/cotejo.ts`, `integraciones/cotejo.ts` -- puerta del build y salto del cotejo.
- `tools/alta.ts`, `tools/lib/revision.ts`, `tools/lib/clases.ts`, `tools/extraer.ts` -- las órdenes; ampliar `tests/unit/alta.test.ts`, `tests/unit/revision.test.ts` (cerrada con el motivo nuevo; abierta por parámetro o copia: publica, duplicado con `--con-duplicados`, tope, sin Obra, Tema) y la prueba de `extraer`.
- `tools/lib/gestion.ts`, `tools/lib/jornadas.ts` -- negativas con pruebas en sus ficheros de prueba.
- `tools/lib/cambios.ts` -- clasificar las dos claves.
- `tests/unit/puerta-de-admision.test.ts` -- construcción con los cinco valores en la copia: publica la feliz y rechaza, cada una con su mensaje, tope, dominio de menos, BrainyQuote, `\n`, siempre con `personaje`, siempre de Autor vivo, Autor sin Obra; con cada constante en `undefined`, ninguna, nombrándola. Ajustar `tests/unit/clase-build.test.ts`.
- `AGENTS.md` -- sección «La Cita atribuida»: la puerta, sus cinco constantes, que las fija Héctor, que `tldts` solo lo usan el esquema y las órdenes, el salto del cotejo y las negativas de portada.

**Acceptance Criteria:**
- Given el Corpus real y `FECHA_JORNADA` fija, when se construye antes y después, then `diff -r` de los dos `dist/` no da ninguna diferencia.
- Given `tests/unit/fecha-de-cambio.test.ts` y `tests/unit/medicion.test.ts`, when corren, then pasan sin eximir `atestiguaciones` ni `origen` y sin tocar ningún tope de guion.
- Given `tests/unit/clase.test.ts`, when corre, then ningún fichero nuevo lee `clase` ni escribe `'atribuida'` fuera de los dueños.
- Given `npm test` en local, when corre la suite entera, then pasa.

## Spec Change Log

## Review Triage Log

### 2026-11-12 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

## Design Notes

El juicio que necesita el Corpus entero vive en `tools/lib/atribuidas.ts` y no en el esquema: el esquema juzga un fichero (forma, recuento de dominios), el módulo relaciona ficheros (topes, fichas, duplicados). Las órdenes lo llaman antes de escribir con lo publicado más lo de la pasada; el build, con lo versionado. Los topes entran por parámetro para que las pruebas unitarias no parcheen nada; solo las de construcción parchean la copia.

`[ASSUMPTION]` `MAX_CARACTERES_DE_ATRIBUIDA` cuenta puntos de código, como `MAX_CARACTERES_IMAGEN`; `consultadaEl` es una jornada `AAAA-MM-DD`.

## Verification

**Commands:**
- `npx vitest run tests/unit/atestiguaciones.test.ts tests/unit/atribuidas.test.ts tests/unit/clase.test.ts` -- verde.
- `npx vitest run tests/unit/puerta-de-admision.test.ts tests/unit/clase-build.test.ts tests/unit/alta.test.ts tests/unit/revision.test.ts tests/unit/fecha-de-cambio.test.ts tests/unit/medicion.test.ts` -- verde.
- `npx astro check` -- 0 errores.
- `FECHA_JORNADA=2026-11-09 npm run build` antes (copiar `dist/` al scratch) y después; `diff -r` -- vacío.
- `npm test` con `correr.sh`/`esperar.pl` -- FINISHED EXIT=0.

## Auto Run Result

Status: done
Blocking condition: ninguna

**Resumen.** La atribuida tiene su puerta, y la puerta está cerrada en el árbol. Las cinco constantes
entran en `undefined` con su dueño (Héctor); con alguna sin valor, el build rompe ante cada atribuida
de `corpus/citas/` nombrando su fichero y las constantes que faltan, y el alta y `revisar --aprobar`
la dejan en `corpus/_revision/` con ese mismo motivo (`motivoPuertaCerrada`, que sustituye a
`MOTIVO_PUERTA_CERRADA` de la 35.1). Con la puerta abierta (en una copia o por parámetro) se juzgan el
esquema de la atribuida, sus topes, la figura sin Obra y los duplicados entre clases; el cotejo la
salta; portada y jornada la rechazan. Con el Corpus real, `dist/` no cambia.

**Ficheros.**
- `package.json`, `package-lock.json` — `tldts` 7.4.19 exacta (`--save-exact`).
- `src/lib/umbrales.ts`, `src/lib/dominio.ts` — las cuatro constantes y `BUZON_DE_PETICIONES`, en `undefined`, literales; `dominio.ts` lee además `public/CNAME` desde la raíz de la construcción si no está junto al módulo (el empaquetado de las páginas).
- `src/lib/atestiguaciones.ts` (nuevo) — `dominioDeAtestiguacion` (eTLD+1 ICANN con `tldts`), `dominiosQueAtestiguan`, `DOMINIOS_QUE_NO_ATESTIGUAN` (`brainyquote.com`); el propio dominio sale de `DOMINIO`.
- `src/lib/admision.ts` — `atestiguacion(es)`, `ORIGENES`/`origen`, `motivoDeAtestiguacionesEscasas`; `reglasDeClase` exige a la atribuida atestiguaciones, origen, una línea y no apta, cuenta dominios con el mínimo, y rechaza los dos campos en la de siempre; `citaAdmisible` los gana.
- `src/content.config.ts` — los dos campos en la colección `citas`.
- `tools/lib/atribuidas.ts` (nuevo, puro) — `constantesSinValor`, `motivoPuertaCerrada`, `fallosDeAtribuidas` (topes, figura sin Obra «pregunta 23», duplicados con `parecidoEntre`), `motivosDe`, `lineaDelBuild`, valores por parámetro y por omisión los del árbol.
- `integraciones/clases.ts` — añade `fallosDeAtribuidas` sobre lo versionado, con las fichas de Obra.
- `tools/lib/cotejo.ts`, `integraciones/cotejo.ts` — la atribuida no se coteja ni se le exige Fuente, no cuenta como cotejada, y en el censo rompe.
- `tools/alta.ts` — `atestiguaciones`/`origen` en el lote y en lo escrito; puerta cerrada → motivo; abierta → juicio con lo publicado, lo de la pasada, `_revision/` y el lote (la ficha que crea la entrada cuenta); la atribuida no recibe saltos; opción `puerta`.
- `tools/lib/revision.ts` — el mismo juicio en `aprobar` (opción `puerta`), sin restituir saltos a la atribuida; `loteEnRevision` no le exige Fuente.
- `tools/lib/clases.ts` — retira `MOTIVO_PUERTA_CERRADA`.
- `tools/extraer.ts` — deriva la clase: de un Autor con derechos vigentes escribe `clase` y no `estadoDerechos`, y el texto en una línea.
- `tools/lib/gestion.ts`, `tools/lib/jornadas.ts` — marcar y fijar se niegan ante una atribuida («pregunta 22»).
- `tools/lib/cambios.ts` — `atestiguaciones` y `origen` en `CAMPOS_QUE_NO_FECHAN.cita`.
- `tests/unit/ayuda/construir.ts` — `ATESTIGUADA`, `PUERTA_DE_PRUEBA` y `conLaPuertaAbierta` (sustituye el valor que tengan las constantes en la copia).
- Pruebas nuevas: `atestiguaciones.test.ts`, `atribuidas.test.ts`; ampliadas: `puerta-de-admision.test.ts` (cuatro construcciones de la puerta), `alta.test.ts`, `revision.test.ts`, `cotejo.test.ts`, `gestion.test.ts`, `jornadas.test.ts`, `extraer-cli.test.ts`, `clase.test.ts`; ajustadas a la puerta (atestiguadas y con la puerta abierta en la copia): `clase-build`, `personajes-build`, `pagina-de-personaje` (sin atribuida apta: la portada y el 404 ya no tienen Cita del Día; textos de serie que no casan por `parecidoEntre`), `publicable-y-alcanzable`, `medicion`.
- `AGENTS.md` — «La puerta de la atribuida (Historia 35.1b)» dentro de «La Cita atribuida».

**Revisión.** Las capas externas no traen hallazgos en esta pasada: 0 parches, 0 diferidos, 0 rechazados.
Recomendación de revisión de seguimiento: `false` (parches 0 alto, 0 medio, 0 bajo; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/atestiguaciones.test.ts tests/unit/atribuidas.test.ts tests/unit/clase.test.ts` — verde.
- `npx vitest run tests/unit/puerta-de-admision.test.ts -t 35.1b` (4 construcciones), `clase-build`, `personajes-build`, `pagina-de-personaje`, `publicable-y-alcanzable` (64), `alta`, `revision`, `cotejo`, `gestion`, `jornadas`, `extraer-cli`, `medicion`, `fecha-de-cambio`, `huella`, `clases-de-cita`, `peso` (882) — verde; `medicion.test.ts` pasa sin tocar ningún tope de guion y `fecha-de-cambio.test.ts` sin eximir los dos campos.
- `npx astro check` — 0 errores, 0 avisos.
- `FECHA_JORNADA=2026-11-09 npm run build` antes (en `fbf5692012`) y después; `diff -r`: fuera de `pagefind/` no difiere ningún fichero; en `pagefind/` solo los nombres de `filter/*.pf_filter`, `pf_meta` y `pagefind-entry.json`, el no determinismo previo de Pagefind que ya anotaron la 35.1 y la 35.2.
- `npm test` entero con `correr.sh`/`esperar.pl` — FINISHED EXIT=0: 180 ficheros, 7.938 pruebas. (Dos pasadas anteriores cayeron en una prueba cada una —`cotejo.test.ts`, «la única lectura de disco de src/lib/ sigue siendo el dominio»; `dominio.test.ts`, «ninguna página ni componente lo lleva escrito a mano»— y se corrigieron leyendo el dominio propio de `DOMINIO`.)

**Riesgos residuales.**
- `src/lib/dominio.ts` entra ahora en el empaquetado de las páginas (el esquema viaja con `publicado.ts` y necesita el dominio propio): su lectura de `public/CNAME` relativa al módulo falla ahí, y la segunda, desde `process.cwd()`, supone que se construye desde la raíz del proyecto, como hacen `npm run build`, el CI y las pruebas.
- Con la puerta abierta, las órdenes juzgan los duplicados de cada atribuida contra todo `corpus/_revision/` (cientos de miles de candidatas en la principal): las formas se calculan una vez por candidata (`WeakMap`), pero aprobar muchas atribuidas de golpe será lento. Hoy no se ejerce: la puerta está cerrada.
- El tope por Obra cuenta una Obra por su ficha resuelta: en el alta, varias atribuidas de una Obra que la misma pasada crea no cuentan juntas hasta que la ficha existe (el build sí las cuenta).
