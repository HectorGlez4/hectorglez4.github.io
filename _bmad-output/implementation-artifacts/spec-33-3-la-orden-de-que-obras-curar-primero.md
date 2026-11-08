---
title: 'Historia 33.3 — La orden de qué Obras curar primero'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_revision: 'a8f304ce0833d36b7df2a3bd6899e821d991a37c'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-33-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Héctor cura ediciones en venta ficha a ficha y no tiene forma de saber qué Obras con edición cotejada tienen más demanda ni cuántas ediciones declara ya cada una; y hoy `corpus/serie-de-demanda.yml` no tiene ninguna ventana leída, así que cualquier orden «por demanda» sería inventado.

**Approach:** Suborden nueva `npm run obra -- curar-primero` en `tools/obra.ts`: lee Citas publicadas, Autores, fichas y la serie de demanda, compone las candidatas con un cálculo puro en `tools/lib/curarPrimero.ts` (efectos inyectados, AD-22) e informa por stdout. No escribe nada. Sin ventana de 28 días legible, cada candidata sale «sin cifra» con su motivo, nunca 0.

## Boundaries & Constraints

**Always:**
- Candidatas = Obras de `obrasPublicadas` (vía `obrasDeLosDatos(...).publicadas`) con `edicionCotejada === true`; ninguna otra regla. Cada una: nombre de ficha, título (`titulo` de la Obra resuelta), Autor (nombre de su ficha de Autor; slug si no lo trae), `ediciones` declaradas (0 si se omite), cuántas de ellas son de una tienda sin marca (`tieneMarca` de `src/lib/ingreso.ts` sobre `TIENDAS`, por parámetro con valor por omisión) y `congelada` (de `congelacionVigente()`). El parte dice cuántas Obras quedaron fuera por no tener edición cotejada, sin listarlas.
- Congelación (`congelacionVigente()` ≠ `undefined`): el parte dice «La familia Obra está congelada por SM-11 desde el {desde}» y no propone ninguna Obra; código 0.
- La ventana es la `clase: "28-dias"` de `hasta` más reciente (empate: `desde` más reciente) y se nombra con `desde` y `hasta`. Las mensuales nunca se usan; nunca se suman ventanas.
- La demanda de una Obra = Σ impresiones y Σ clics de las entradas de `citas` de esa ventana cuyo slug es una Cita publicada (de Autor publicado) colgada a esa Obra por `colgarObras`/`resolverObras` de `src/lib/obras.ts`. Las entradas cuyo slug no es Cita publicada o no resuelve a Obra no cuentan en ninguna, y el parte dice cuántas. Con cifra, el parte dice que es **provisional** (la serie no cuenta la Página de Obra: `FAMILIAS_DE_LA_DEMANDA` no la incluye) y **cota inferior** (las Citas por debajo de `MIN_IMPRESIONES_POR_FILA` van a `resto`).
- Orden con cifra: impresiones desc, clics desc, nombre de ficha (`localeCompare(…, 'es')`). Sin cifra: por nombre de ficha, y el parte dice que ese orden no es de prioridad y que no hay orden por demanda que dar.
- Una Obra sin Citas en la ventana leída, o una ventana con `vacia: true` (o sin `citas`), da 0 y el parte dice que ese cero es una lectura (cota inferior).
- Ausencia antes que cero: sin ninguna entrada, sin ninguna `28-dias`, o con una entrada ilegible que pueda ser de 28 días → todas «sin cifra» con ese motivo concreto, sin recurrir a otra ventana.
- Códigos: 0 si informó (también todo «sin cifra» o congelada); 1, por stderr y sin escribir, si el Corpus, una ficha o el fichero de la serie no se dejan leer, nombrando qué; 2 con bandera desconocida o argumento posicional de más. Solo admite `--corpus`, la opción común de todas las subórdenes de `npm run obra`, que usan las pruebas.
- Solo lectura: ninguna escritura en disco, sin `SEARCH_CONSOLE_CREDENCIALES`, sin red.

**Block If:**
- Hiciera falta tocar `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`, o escribir una tienda, una marca o una edición reales.

**Never:**
- Ningún módulo de `src/`, `integraciones/` ni `astro.config.mjs` importa `tools/lib/curarPrimero.ts`, lee la serie o recibe el resultado (AD-24).
- No ordenar por recuento de Citas ni por nada que suplante la demanda; no escribir 0 por una lectura que no existe.
- No proponer ediciones ni tiendas `[NON-GOAL]`, ni sugerir encender un Modelo ni solicitar una cuenta.
- No usar `leerSerieDeDemanda` para esta orden: lanza ante una entrada mal formada, y aquí una entrada ilegible es «sin cifra», no código 1.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Hoy | `lecturas:` vacía, sin congelación | Cada candidata «sin cifra: la serie de demanda no tiene ninguna ventana leída»; lista por nombre de ficha; «no hay orden por demanda» | 0 |
| Solo mensuales | Entradas `mes` legibles, ninguna `28-dias` | «sin cifra» con motivo «ninguna ventana de 28 días leída» | 0 |
| Una ventana | Una `28-dias` con `citas` | Se nombra la ventana; demanda por Obra; provisional y cota inferior; orden impr/clics/ficha | 0 |
| Dos ventanas 28 | `hasta` distintos | Gana la de `hasta` mayor; la otra no se suma | 0 |
| Ventana vacía | `vacia: true` | Todas 0, dicho como lectura | 0 |
| Cita retirada | Slug de `citas` no publicado | No cuenta; «N Citas de la ventana no cuentan» | 0 |
| Obra sin Citas en la ventana | Ventana legible | 0 (cota inferior, lectura) | 0 |
| Sin edición cotejada | Obra sin Fuente en ninguna Cita | No se propone; se cuenta en «fuera» | 0 |
| Congelada | `congelacion: {desde, …}` | «congelada por SM-11 desde el {desde}»; ninguna Obra | 0 |
| Entrada ilegible | Sin `desde`/`hasta`, fecha imposible, `clase` desconocida o ausente, `citas` sin forma (`cita` no string, métricas no enteros ≥ 0) en una `28-dias` o de clase no determinable | Todas «sin cifra» nombrando la entrada (índice 1-based) y el motivo | 0 |
| Serie ilegible | No es YAML, sin clave `lecturas:`, `lecturas` no lista | Mensaje por stderr nombrando `corpus/serie-de-demanda.yml` | 1, nada escrito |
| Serie ausente | Fichero no existe | Igual que `lecturas:` vacía | 0 |
| Corpus/ficha ilegible | `leerCitas`/`leerAutores`/`leerFichasDeObra` lanzan | stderr con el motivo | 1 |
| Forma | `curar-primero --x` o `curar-primero algo` | Uso | 2 |

</intent-contract>

## Code Map

- `tools/obra.ts` -- CLI; añadir `case 'curar-primero'` (patrón de `congelar`/`levantar`: `motivosDeArgumentosNoReconocidos` con `conValor: ['--corpus']`, sobrantes → `usoMal`), línea en `USO` y párrafo en la cabecera del fichero. `terminar` de `tools/lib/cli.ts` imprime `Resultado` (ok → stdout 0; no ok → stderr 1).
- `tools/lib/curarPrimero.ts` (nuevo) -- puro: `ventanaDeCuracion(entradas: unknown[])` (elige o explica), `componerCuracion({ obras, citas, congelacion, entradas, tiendas })`, `lineasDeCuracion(informe)`; y `curarPrimero(rutas, efectos = { leerCitas, leerAutores, leerFichasDeObra, leerEntradas })` → `Resultado`. No reutilizar el nombre `tools/lib/curacion.ts`: es el de Colecciones (12.4).
- `tools/lib/corpus.ts:1689` `analizarSerie` -- valida YAML, clave `lecturas` y lista (mensajes reutilizables) y luego lanza por entrada; añadir junto a `leerSerieDeDemanda` (`:2253`) un lector exportado tolerante, p. ej. `leerEntradasDeLaSerieDeDemanda(rutas): Promise<unknown[]>`, que comparta la parte de fichero (extraer un ayudante privado común si hace falta, sin cambiar el comportamiento de `analizarSerie`) y devuelva las entradas sin juzgarlas; fichero ausente → `[]`.
- `tools/lib/demanda.ts` -- reutilizar `esJornadaDeSerie` (`:79`), `CLASES_DE_VENTANA` (`:68`), `MIN_IMPRESIONES_POR_FILA` (`:51`), `FAMILIAS_DE_LA_DEMANDA` (`:60`) para el texto; forma de entrada `LecturaDeVentanaRegistrada` (`tools/lib/corpus.ts:2242`): `citas?: {cita, clics, impresiones}[]`, `vacia?: true`.
- `integraciones/indexables.ts:60` `obrasDelCorpusEnDisco` -- modelo de lectura: `leerCitas(rutas.citas)`, `leerAutores(rutas)`, `leerFichasDeObra(rutas)` + `obrasDeLosDatos` (`src/lib/publicado.ts:1052`). Para el mapa slug→Obra: `colgarObras(citas, fichas)` (`src/lib/obras.ts`) filtrando Citas de Autor existente, como `obrasDelConjunto` (`src/lib/publicado.ts:1031`).
- `src/lib/obras.ts:173` `congelacionVigente`; `:727` `ObraResuelta` (`edicionCotejada`, `ediciones`, `titulo`, `autor`); `src/lib/ingreso.ts:278` `tieneMarca`, `TIENDAS`.
- `tools/lib/obras.ts:843` `declararEdicion` -- redacción de referencia del mensaje de congelación.
- `tests/unit/demanda.test.ts:777` -- prueba AD-24 por `git grep`: ampliar la regex con `curarPrimero|curar-primero`.
- `tests/unit/obra-cli.test.ts:25` `corpusConCita` / `correr` -- patrón de corpus mínimo en tmp y ejecución con `--corpus`. Con `TIENDAS` vacío una ficha con `ediciones` no se deja leer: las ediciones y tiendas sin marca se prueban en el cálculo puro con tiendas inventadas `.example`.
- `AGENTS.md:270` § Leer la demanda por página -- añadir el párrafo.

## Tasks & Acceptance

**Execution:**
- `tools/lib/corpus.ts` -- añadir el lector tolerante de entradas de la serie de demanda -- la orden distingue fichero ilegible (1) de entrada ilegible («sin cifra»).
- `tools/lib/curarPrimero.ts` -- crear el cálculo puro y la función con efectos inyectados según Boundaries y la matriz; cabecera que diga AD-22, AD-24, FR-62 y «ausencia antes que cero» -- es el único dueño de la regla de curación.
- `tools/obra.ts` -- cablear `curar-primero` (códigos 0/1/2), `USO` y cabecera -- superficie de la orden.
- `tests/unit/curar-primero.test.ts` -- Vitest del cálculo puro con series inventadas: sin ventanas, solo mensuales, una ventana, dos de 28 días (gana la más reciente, sin sumar), ventana vacía, Cita retirada (contada aparte), Obra sin Citas en la ventana (0 como lectura), Obra sin edición cotejada (no se propone, contada), congelación (nada propuesto), entrada ilegible («sin cifra» con motivo), recuento de ediciones y de tiendas sin marca con tiendas `.example`, orden determinista con empates; y la CLI sobre un corpus mínimo en tmp: sale 0 con «sin cifra», no cambia ningún fichero (comparar listado y contenidos antes/después), sale 2 con `--bandera` y con un posicional de más, sale 1 con una serie que no es YAML.
- `tests/unit/demanda.test.ts` -- ampliar la regex AD-24 para el módulo nuevo.
- `AGENTS.md` -- en § Leer la demanda por página, párrafo de la orden: qué lee, que no escribe, «sin cifra» con su motivo y nunca cero, provisional y cota inferior, congelación sin propuestas, códigos; la frase «ningún módulo de `src/` la lee (AD-24)» sigue siendo verdad.

**Acceptance Criteria:**
- Given el Corpus del repositorio con `lecturas:` vacía, when se corre `npm run obra -- curar-primero`, then sale 0, toda candidata dice «sin cifra» con el motivo de la serie vacía, no aparece ningún 0 de demanda y `git status` sigue limpio.
- Given cualquier estado, when la orden termina, then ningún fichero bajo `corpus/` ni fuera cambia y no se hizo ninguna petición de red.
- Given `git grep` de `curarPrimero|curar-primero|serie-de-demanda` en `src/`, `integraciones/` y `astro.config.mjs`, when corre la prueba AD-24, then no hay coincidencias.

## Design Notes

Esbozo del parte con cifra (orientativo):

```
Ventana de 28 días: 2026-10-08 – 2026-11-04 (la más reciente de 3).
Demanda provisional y cota inferior: la serie no cuenta la Página de Obra y las Citas con menos de 5 impresiones van a `resto`.
1. seneca--cartas-a-lucilio · Cartas a Lucilio · Séneca — 412 impresiones, 9 clics · 0 ediciones
...
Fuera por no tener edición cotejada: 37 Obras. Citas de la ventana que no cuentan: 4.
```

## Verification

**Commands:**
- `npx vitest run tests/unit/curar-primero.test.ts` -- expected: verde.
- `npx vitest run tests/unit/demanda.test.ts tests/unit/obra-cli.test.ts` -- expected: verde.
- `npx tsx tools/obra.ts curar-primero` -- expected: código 0, «sin cifra» en cada candidata, `git status --short` vacío después.
- `npx astro check` -- expected: sin errores nuevos.

## Review Triage Log

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Sin hallazgos externos en este pase (el orquestador no pasó ninguna sección «## Hallazgos externos — …»).

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** Suborden nueva `npm run obra -- curar-primero`: lee Citas publicadas, Autores, fichas de Obra y `corpus/serie-de-demanda.yml` y lista las Obras publicadas con edición cotejada (ficha, título, Autor, ediciones declaradas, de ellas de tienda sin marca, congelada), ordenadas por la demanda de la ventana `28-dias` más reciente; sin ventana legible, cada una «sin cifra» con su motivo y por nombre de ficha. Con congelación lo dice con su jornada y no propone nada. No escribe nada (AD-24).

**Ficheros.**
- `tools/lib/curarPrimero.ts` (nuevo) — `ventanaDeCuracion`, `componerCuracion`, `lineasDeCuracion` puros y `curarPrimero` con efectos inyectados (AD-22).
- `tools/lib/corpus.ts` — `entradasDeLaSerie`, ayudante privado con la parte de fichero de `analizarSerie` (sin cambiar su comportamiento), y `leerEntradasDeLaSerieDeDemanda`, lector tolerante (ausente → `[]`).
- `tools/obra.ts` — `case 'curar-primero'` (códigos 0/1/2), línea en `USO` y párrafo en la cabecera.
- `tests/unit/curar-primero.test.ts` (nuevo) — 29 pruebas: la matriz entera en el cálculo puro y la CLI sobre un corpus mínimo en tmp (0 sin escribir, serie ausente, 1 con serie no YAML / sin clave / no lista / ficha ilegible, 2 con bandera o posicional de más).
- `tests/unit/demanda.test.ts` — la regex AD-24 cubre `curarPrimero|curar-primero`.
- `AGENTS.md` — § Leer la demanda por página gana «Qué Obras curar primero (Historia 33.3)».

**Revisión.** 0 parches, 0 diferidos, 0 rechazados. `followup_review_recommended: false` (parcheados: alta 0, media 0, baja 0; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/curar-primero.test.ts` — 29/29 verde.
- `npx vitest run tests/unit/demanda.test.ts tests/unit/obra-cli.test.ts` — 74/74 verde.
- `npx tsx tools/obra.ts curar-primero` — código 0, 511 candidatas «sin cifra: la serie de demanda no tiene ninguna ventana leída», 7 fuera; `git status` sin cambios del Corpus después. `curar-primero --x` y `curar-primero algo` salen 2.
- `npx astro check` — 0 errores, 0 avisos.
- `npm test` — 7208/7214; los 6 fallos eran los inestables conocidos: hash del woff2 de Google Fonts (`ingreso-construido` ×2, `ediciones-en-venta` ×1), plazo de 120 s bajo carga (`extraer-cli` ×1) y `avisar-rango` ×2 contando copias temporales en el `tmpdir` compartido mientras otro worktree corría su suite. Repetidos solos los cuatro ficheros: 196/196 verde.

**Riesgos residuales.** Con la serie vacía, hoy no hay orden por demanda; el primer `demanda:registrar` de Héctor lo enciende. Una entrada mensual mal formada no estorba (no es de 28 días), a propósito; `leerSerieDeDemanda` sí la rechazaría al registrar.
