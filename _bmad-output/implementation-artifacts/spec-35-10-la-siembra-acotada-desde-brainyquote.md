---
title: 'Historia 35.10 — La siembra acotada desde BrainyQuote'
type: 'feature'
created: '2026-11-14'
status: 'done'
baseline_revision: 'd82e6badb3b016b7be17847dc9f77bec27aa362f'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-35-context.md'
warnings: [oversized]
deferred:
  - summary: 'SEMILLA_DE_ATRIBUIDAS queda vacía en el árbol: qué Personajes y Autores lleva la semilla, y la página de BrainyQuote de cada uno, lo decide Héctor en un diff (FR-68).'
    severity: low
    location: 'src/lib/umbrales.ts'
  - summary: 'Pendiente de Héctor: correr la siembra real (semilla + proponer + revisar --aprobar) y registrar la sesión con --clase-de-cita atribuida. Ningún agente lo hace.'
    severity: low
  - summary: 'El lector de la página de BrainyQuote (anclas title="view quote" / title="view author") es [ASSUMPTION]: no se ha contrastado con la página real, porque ningún agente la pide. Si la página real no casa, la orden sale con 1 sin escribir y se ajusta el lector.'
    severity: medium
    location: 'tools/lib/siembraAtribuida.ts'
---

<intent-contract>

## Intent

**Problem:** La Cita atribuida tiene puerta (35.1b), Variante (35.6) y formas vedadas (35.7), pero no hay forma de sembrarla sin teclear metadato: falta la orden que lleve una semilla de prueba de BrainyQuote —unos pocos Personajes o Autores que elige Héctor— a candidatas en `corpus/_revision/`, y la sesión no dice de qué clase de Cita es.

**Approach:** Una lista con nombre `SEMILLA_DE_ATRIBUIDAS` (vacía) en `src/lib/umbrales.ts`; dos subórdenes nuevas de `npm run atribuida`: `semilla <slug>` (la cáscara descarga una vez la página declarada y escribe, fuera de `corpus/` y sin versionar, las frases en inglés y quién las dice) y `proponer <lote.yaml>` (juzga candidatas en español con lo de la 35.1b/35.6/35.7 y escribe las que pasan solo en `corpus/_revision/`); y `npx tsx tools/objetivo.ts --registrar --clase-de-cita atribuida`, que anota `claseDeCita: atribuida` con las atribuidas publicadas.

## Boundaries & Constraints

**Always:**
- La red solo en la cáscara `tools/atribuida.ts` (AD-22); `tools/lib/siembraAtribuida.ts` es puro sobre HTML ya recibido y sobre el Corpus leído.
- `proponer` nunca escribe en `corpus/citas/`, ni fichas de Obra, ni el registro de clases ni el de formas vedadas: aprobar es de una persona con `revisar --aprobar`.
- La clase se deriva (`claseQueCorresponde`), nunca se teclea; el dueño del slug y del fichero es el Autor o, sin él, el Personaje (`nombreDeFicheroDeCita`, `slugDeCita`, `slugLibre` con `slugsConOtraClase`).
- Los dominios los cuenta solo `dominiosQueAtestiguan`; los duplicados, solo `parecidoEntre` (vía `tools/lib/atribuidas.ts`).
- Códigos: 2 por la forma de la invocación, 1 por lo que dice; con todo el lote rechazado, no se escribe nada.
- Las pruebas no tocan la red (`tests/unit/ayuda/doble-de-red.mjs`) ni el Corpus real; la semilla llena solo en una copia del proyecto.
- `dist/` no cambia: `SEMILLA_DE_ATRIBUIDAS` no la importa ninguna página ni isla; `src/lib/vocabulario.ts` y `GUIONES_EXTERNOS` no se tocan.

**Block If:** la historia exigiera un valor de Héctor para construirse (no lo exige: la lista va vacía y `MIN_ATESTIGUACIONES_DE_ATRIBUIDA` sin valor se informa sin juzgar).

**Never:** pedir BrainyQuote ni ninguna dirección real; sembrar, proponer o aprobar sobre el Corpus real; dar valor a `SEMILLA_DE_ATRIBUIDAS` ni a ninguna constante de la puerta; editar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`; búsqueda abierta o siembra a escala (pregunta 18); traducir.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| semilla, slug de la lista | lista con `{slug:'batman', pagina:'https://www.brainyquote.com/…'}`, doble responde 200 HTML con frases | escribe `semillas/batman.json` (o `--salida`) con `{slug, pagina, descargadaEl, frases:[{frase, quien}]}`; una sola petición | 0 |
| semilla, fuera de la lista / lista vacía | slug ausente | no pide nada; mensaje nombra `SEMILLA_DE_ATRIBUIDAS` y que la siembra a escala espera a la pregunta 18 | 1 |
| semilla repetida | la salida ya existe | no pide nada, no reescribe («una sola vez») | 1 |
| semilla, red falla / no-200 / no HTML / 3xx / ninguna frase reconocida | doble | no escribe nada, nombra el motivo | 1 |
| semilla, `--salida` dentro de `corpus/` o sin `.json` | — | no pide nada | 1 |
| semilla, forma | sin slug, dos slugs, bandera desconocida/repetida/vacía | uso | 2 |
| proponer, candidata válida | texto es, Personaje de la lista que existe, `origen`, atestiguaciones con dominios, Obra opcional resoluble | escrita en `corpus/_revision/{dueño}--….md` con `clase: atribuida`, `personaje`/`autor`, `procedencia.obra` si consta, `temas: []`, atestiguaciones, origen, variante | 0 |
| proponer, sin `MIN_ATESTIGUACIONES_DE_ATRIBUIDA` | mínimo sin valor | se escribe igual; el parte da sus dominios y «sin juzgar el mínimo: MIN_ATESTIGUACIONES_DE_ATRIBUIDA sin valor» | 0 |
| proponer, mínimo con valor (por parámetro) | menos dominios | rechazada con el motivo de `motivoDeAtestiguacionesEscasas` | 1 |
| proponer, rechazos | sin `texto` (sin versión en español), sin Personaje ni Autor, Personaje/Autor inexistente, fuera de la semilla, de clase de siempre, `clase` tecleada, sin `origen` u otra regla del esquema, ningún dominio que cuente, Obra que `resolverFichaDeObra` no resuelve, duplicado (`parecidoEntre`) con publicada de cualquier clase, candidata de `_revision/`, otra entrada del lote o forma vedada | no se escribe; el parte la nombra (posición y texto) con cada motivo | 1 |
| proponer, todo rechazado | — | no escribe nada | 1 |
| proponer, forma | sin lote, lote ilegible o que no es lista, bandera desconocida | uso | 2 |
| proponer, registro de clases o de formas vedadas ilegible | — | no escribe nada | 1 |
| registrar atribuida | `--registrar --clase-de-cita atribuida` | entrada con `fecha`, `hora`, `claseDeCita: "atribuida"`, `resultado: {citasPublicadas, atribuidasPublicadas}`, sin `clase`/`propuesto`/`hueco` de la política | 0 |
| registrar atribuida repetida | misma jornada y mismo resultado | no anota (reintento) | 1 |
| clase-de-cita mal | valor distinto de `atribuida`, o sin `--registrar`, o con `--anular`/`--elegido` | uso | 2 |

</intent-contract>

## Code Map

- `src/lib/umbrales.ts` (~1446–1500, bloque de la atribuida) -- añadir `EntradaDeSemilla {slug, pagina}` y `SEMILLA_DE_ATRIBUIDAS: readonly EntradaDeSemilla[] = []` con su comentario (de Héctor; generalizar es otra decisión). Lo importa el filtro de Directorios: un literal sin uso se elimina del guion.
- `src/lib/atestiguaciones.ts` -- `dominiosQueAtestiguan`, `DOMINIOS_QUE_NO_ATESTIGUAN` (brainyquote.com). Solo se reutiliza.
- `src/lib/admision.ts:377` -- `motivoDeAtestiguacionesEscasas(urls, minimo)`; `citaAdmisible` (esquema completo con `reglasDeClase`: origen, atestiguaciones, variante, una línea).
- `tools/lib/atribuidas.ts:~340–390` -- los bucles de duplicados entre clases y de formas vedadas viven dentro de `fallosDeAtribuidas`, tras el corte de puerta cerrada: extraerlos a `fallosDeDuplicados(...)` exportada y que `fallosDeAtribuidas` la llame (mismo comportamiento), para que `proponer` los juzgue con la puerta cerrada.
- `tools/alta.ts:226–800` -- patrón a calcar: dueño (`slugDueño = autor ?? personaje`), `slugDeCita`/`slugLibre`/`slugsConOtraClase`, `claseQueCorresponde`, `MOTIVO_CLASE_TECLEADA`, `escribirCita(rutas.revision, …)`, `resolverFichaDeObra` en solo lectura, `paraAtribuidas`/`textoDeVariante`.
- `tools/lib/revision.ts:489+` -- `aprobar` ya publica una atribuida de `_revision/` con la puerta abierta: el formato que escribe `proponer` tiene que ser el que `loteEnRevision` lee (frontmatter de Cita; `procedencia.obra`).
- `tools/lib/corpus.ts` -- `leerAutores`, `leerPersonajes:495`, `leerCitas`, `leerRegistroDeClases:3786`, `escribirCita:939`, `nombreDeFicheroDeCita:1154`; sesiones: `SesionDeSembrado:1548`, `SesionRegistrada:1562`, `registrarSesionDeSembrado:1659` (solo añade, valida en memoria).
- `tools/lib/formasVedadas.ts:136` -- `leerFormasVedadas`.
- `tools/lib/html.ts` -- utilidades de HTML para el lector de la página (texto de un elemento, entidades).
- `tools/atribuida.ts` -- cáscara con `FORMA` por suborden: añadir `semilla` (1 suelto, `--salida`) y `proponer` (1 suelto, `--corpus`), USO y cabecera.
- `tools/recuperar.ts:1121–1200` -- patrón de `fetch` (redirect manual, `AbortSignal.timeout`, user-agent, tipo de contenido).
- `tools/objetivo.ts` -- registrar: nueva bandera `--clase-de-cita` (con valor), rama atribuida que no consulta la política ni exige objetivo; `salud.atribuidas` ya existe.
- `tests/unit/ayuda/doble-de-red.mjs` -- doble con `DOBLE_GUION`/`DOBLE_REGISTRO`; `tests/unit/recuperar-cli.test.ts:106` -- cómo se precarga.
- `tests/unit/ayuda/construir.ts` -- `RAIZ`, `enlazarDependencias`, `ATESTIGUADA`, `AUTOR_VALIDO`, `TEMA_VALIDO`, `citaValida`.
- `tests/unit/atribuida-cli.test.ts`, `tests/unit/objetivo-cli.test.ts` -- patrones de prueba por proceso con `--corpus` en temporal.
- `.gitignore` -- añadir `semillas/` (como `piezas/`).
- `AGENTS.md` -- nueva sección «Una sesión de sembrado de la Cita atribuida» tras «La Cita atribuida»/sus subsecciones.

## Tasks & Acceptance

**Execution:**
- `src/lib/umbrales.ts` -- `EntradaDeSemilla` y `SEMILLA_DE_ATRIBUIDAS = []` -- la lista que llena Héctor.
- `tools/lib/atribuidas.ts` -- extraer `fallosDeDuplicados` (duplicados entre clases + formas vedadas) sin cambiar `fallosDeAtribuidas` -- juzgar duplicados con la puerta cerrada.
- `tools/lib/siembraAtribuida.ts` (nuevo) -- `problemasDeLaSemilla(semilla)` (slug con forma de slug, sin repetidos, `pagina` `https:` de `brainyquote.com` o subdominio); `entradaDeSemilla(slug, semilla)`; `frasesDeLaPagina(html)` (pares frase/quién en orden, texto decodificado y colapsado; vacío si no reconoce); `componerSemilla(...)` (el JSON); `proponerAtribuidas(rutas, lote, {semilla, minAtestiguaciones, hoy?})` → informe `{escritas:[{ruta, slug, dominios, sinJuzgarMinimo}], rechazadas:[{indice, texto, motivos}]}` y escribe solo si alguna pasa; `formatearPropuesta(informe)` -- todo lo decidible sin red.
- `tools/atribuida.ts` -- subórdenes `semilla` (comprueba la lista, la salida fuera de `corpus/` y que no exista antes de pedir; una petición, `redirect: 'manual'`, timeout, 200 + `text/html`; escribe con `wx`) y `proponer` (lee el YAML; 2 si no es lista) -- la cáscara con red.
- `tools/lib/corpus.ts` -- `SesionDeSembrado` admite la rama `{claseDeCita:'atribuida', momento?, resultado}`; `SesionRegistrada` con `claseDeCita?` y `clase`/`propuesto` opcionales; `ResultadoDeLaSesion` con `atribuidasPublicadas?`; `claseDeCitaDeLaSesion(s)` (sin campo → `siempre`) -- la sesión dice su clase.
- `tools/objetivo.ts` -- `--clase-de-cita atribuida` solo con `--registrar` -- registra sin la política.
- `.gitignore` -- `semillas/`.
- `tests/unit/siembra-atribuida.test.ts` (nuevo) -- la matriz: puras (`problemasDeLaSemilla`, `frasesDeLaPagina`, `proponerAtribuidas` con semilla y mínimo por parámetro sobre un corpus temporal, incluidos todos los rechazos, lote todo rechazado sin escribir y que `aprobar` con la puerta abierta por parámetro publica lo propuesto); por proceso con el árbol (lista vacía → 1 sin petición registrada; forma → 2); por proceso en una copia del proyecto (`tools/`, `src/`, `public/CNAME`, `package.json`, `tsconfig.json`, `enlazarDependencias`) con la lista llena y el doble de red: una petición, JSON escrito, repetir → 1 sin segunda petición.
- `tests/unit/objetivo-cli.test.ts` -- casos de `--clase-de-cita` (registra, repetida → 1, formas → 2, entradas viejas sin campo se leen `siempre`).
- `AGENTS.md` -- la sección nueva: la semilla de prueba y su lista, la versión en español que circula con su origen (el sitio no traduce), la puerta de calidad, que aprobar es de una persona, que la escala espera a la pregunta 18, y el registro con su clase.

**Acceptance Criteria:**
- Given el árbol, when `npm run atribuida -- semilla <x>` o `-- proponer <lote>`, then sale con 1 nombrando `SEMILLA_DE_ATRIBUIDAS` y la pregunta 18, sin petición de red ni escritura.
- Given una candidata que pasa con la puerta abierta por parámetro, when `aprobar` la publica, then sale de `corpus/_revision/` a `corpus/citas/` como atribuida (lo propuesto es aprobable tal cual).
- Given la historia cerrada, when se mira el árbol, then `SEMILLA_DE_ATRIBUIDAS` está vacía, `corpus/` no tiene ningún cambio y `semillas/` está ignorado.

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

(Las capas de revisión son externas y esta pasada no trae hallazgos: las corre el orquestador después.)

## Design Notes

- **La lista lleva la página.** Cada entrada es `{slug, pagina}`: la dirección de BrainyQuote la declara Héctor con el slug, en vez de adivinarla por el nombre; la orden solo admite `https://` de `brainyquote.com` (o `www.`). El slug tiene que ser, al proponer, un Personaje de `corpus/personajes/` o un Autor de `corpus/autores/` (lo dan de alta sus órdenes; `proponer` no crea ninguno), y todo Personaje y Autor que declare una candidata tiene que estar en la lista.
- **Ninguna atestiguación que cuente** rechaza siempre: cualquier valor de `MIN_ATESTIGUACIONES_DE_ATRIBUIDA` es un entero positivo, así que cero dominios no pasaría con ninguno; no es inventar un mínimo.
- **Sin versión en español** = la entrada sin `texto`. El lote no lleva la frase inglesa; la semilla solo sirve de lista de trabajo.
- **La sesión atribuida no lleva la política**: sin `clase`, `propuesto` ni `hueco`. Su `resultado` es `{citasPublicadas (las dos clases, como siempre), atribuidasPublicadas}`.

## Verification

**Commands:**
- `npx vitest run tests/unit/siembra-atribuida.test.ts` -- expected: verde.
- `npx vitest run tests/unit/atribuidas.test.ts tests/unit/atribuida-cli.test.ts tests/unit/objetivo-cli.test.ts tests/unit/objetivo.test.ts` -- expected: verde (sin regresión del extraído).
- `npx astro check` -- expected: 0 errores.
- `npm test` (desatendido con correr.sh) -- expected: verde.
- `git status --short corpus/` -- expected: vacío.

## Auto Run Result

Status: done
Blocking condition: ninguna

**Qué se hizo.** La siembra acotada de la Cita atribuida, construida y sin sembrar nada: la lista
`SEMILLA_DE_ATRIBUIDAS` (vacía) en `src/lib/umbrales.ts`; `npm run atribuida -- semilla <slug>` (la
cáscara pide una vez la página declarada y escribe la lista en inglés en `semillas/`, ignorado) y
`-- proponer <lote.yaml>` (juzga y escribe solo en `corpus/_revision/`); y
`npx tsx tools/objetivo.ts --registrar --clase-de-cita atribuida`.

**Ficheros.**
- `src/lib/umbrales.ts` — `EntradaDeSemilla` y `SEMILLA_DE_ATRIBUIDAS = []`.
- `tools/lib/siembraAtribuida.ts` (nuevo) — lista de la semilla, lector de la página, propuesta y parte; sin red.
- `tools/lib/atribuidas.ts` — `fallosDeDuplicados` extraída de `fallosDeAtribuidas`, sin cambio de comportamiento.
- `tools/atribuida.ts` — subórdenes `semilla` (la única con `fetch`) y `proponer`.
- `tools/lib/corpus.ts` — sesión `SesionDeSembradoAtribuida`, `claseDeCita` y `claseDeCitaDeLaSesion`.
- `tools/objetivo.ts` — `--clase-de-cita atribuida` con `--registrar` (2 por la forma).
- `.gitignore` — `semillas/`.
- `tests/unit/siembra-atribuida.test.ts` (nuevo), `tests/unit/objetivo-cli.test.ts` — la matriz.
- `tests/unit/andamiaje.test.ts` — `tools/atribuida.ts` entra como décima excepción de AD-22, con su motivo (la historia la exige).
- `AGENTS.md` — «Una sesión de sembrado de la Cita atribuida».

**Desviaciones del plan, menores.** El lote admite además `año` y `referencia`, porque el esquema exige
Procedencia (obra, año o referencia) a toda Cita; el duplicado dentro del lote se juzga solo contra las
entradas anteriores (la primera pasa, la repetida se nombra).

**Revisión.** Sin hallazgos en esta pasada (capas externas): 0 parches, 0 diferidos, 0 rechazados.
`followup_review_recommended: false` (puntuación 0).

**Verificación.** `npx vitest run tests/unit/siembra-atribuida.test.ts` 47/47;
`tests/unit/objetivo-cli.test.ts` 50/50; `clase`, `atribuidas`, `atribuida-cli`, `objetivo` en verde;
`npx astro check` 0 errores; `npm test` completo: 8483/8485, los dos fallos eran de
`tests/unit/andamiaje.test.ts` (la excepción AD-22 de la cáscara nueva), corregidos y vueltos a correr
en verde (89/89 con la prueba de la siembra). `corpus/` sin cambios.

**Riesgos.** El lector de BrainyQuote es un supuesto sin contrastar (diferido). `dist/` no se ha
reconstruido para compararlo: el único cambio de `src/` es una constante que ninguna página importa.
