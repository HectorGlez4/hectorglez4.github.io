---
title: 'Historia 26.1 — Todo Autor publicado tiene su clave de orden'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_revision: '39234cc4dd8ace36326b2709551cd7c483209b71'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-26-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** El Directorio de Autores (26.3) tiene que poner a Cervantes en la C, y hoy ningún Autor declara por qué letra se ordena: no hay campo, ni regla que lo proponga, ni puerta que impida publicar un Autor sin él. Teclear 171 claves a mano, o parar la siembra hasta que Héctor las revise, son justo lo que FR-15 prohíbe.

**Approach:** Añadir `ordenAlfabetico` y `ordenRevisado` (opcionales, un solo validador en `autorAdmisible` y en la colección `autores`), una función hermana de `normalizar` que da la inicial (con la Ñ propia) y la clave de comparación, una sola función de `tools/lib/` que propone «la última palabra del `nombre`», las órdenes `proponer-claves` y `clave` en `tools/autor.ts`, y una puerta de build que rompe ante un Autor publicado sin clave. El lote sobre los Autores existentes va en un commit propio, sin código.

## Boundaries & Constraints

**Always:**
- Un solo validador de forma de `ordenAlfabetico` (exportado de `src/lib/admision.ts`), usado por `autorAdmisible`, por la colección `autores` de `src/content.config.ts`, por la puerta de build y por la orden `clave`. Su regla: la función hermana da inicial A–Z o Ñ; en blanco, con espacio inicial, o empezando por cifra o signo, no tiene forma. La clave nunca se recorta ni se reescribe.
- `ordenRevisado` es opcional con forma `esJornada` (`src/lib/citaDelDia.ts`). Sin valor, los dos campos se omiten: nunca cadena vacía ni `null`. «Sin revisar» = ausencia de `ordenRevisado`; nada lee git para decirlo.
- La regla de propuesta es fija: última palabra (separada por espacios) del `nombre` recortado, tal cual (tildes y mayúsculas incluidas); se marca aparte el `nombre` de tres palabras o más. Vive en una sola función de `tools/lib/claves.ts`, que usan `crear` (y por él `tools/sembrar.ts`) y `proponer-claves`.
- Escribir la clave (lote y `clave`) toca solo esos campos: conserva el resto del fichero byte a byte, comentarios incluidos (`corpus/autores/teresa-de-jesus.yml` lleva comentarios que `aYaml` perdería). Formato del valor como `aYaml`: `ordenAlfabetico: "Cervantes"`, al final del fichero.
- La presencia solo se exige al Autor de `autoresPublicados` (`src/lib/publicado.ts`) sobre las Citas de `corpus/citas/`; la forma, a todo Autor.
- Códigos de las órdenes: 2 es la forma de la invocación (falta el slug, sobra un argumento, bandera desconocida), 1 lo que dice (slug que no es de ningún Autor, clave sin forma, nada que confirmar). Ninguna escribe si se niega.
- En `relacionDeSuperficies` los dos campos no fechan ni avisan nada hasta la 26.3 (`CAMPOS_QUE_NO_FECHAN.autor`).

**Block If:**
- El lote de `proponer-claves` sobre `corpus/autores/` produce algún cambio distinto de añadir una línea `ordenAlfabetico:` por fichero, y no se puede evitar sin cambiar el escritor de otras órdenes.
- Algún Autor del Corpus queda sin clave tras el lote porque la regla no da inicial válida (hoy ninguno: las 171 últimas palabras empiezan por letra).

**Never:**
- Ningún agente corre `npx tsx tools/autor.ts clave` sobre el Corpus real, confirma o corrige una clave ni escribe `ordenRevisado` (26.10, de Héctor). Las pruebas sí la ejercitan sobre corpus temporales.
- Ninguna bandera para teclear la clave en `crear` ni en `editar`; `editar` no toca la clave aunque cambie el nombre.
- Ninguna superficie pinta ni ordena por la clave en esta historia (es la 26.3); no se cambia `autoresPublicados` ni su orden.
- No se editan `_bmad-output/planning-artifacts/` ni `_bmad-output/specs/`.
- No se commitean `corpus/_revision/`, `dist/`, `medicion/.wrangler/` ni logs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Inicial con tilde | `inicialDeClave("Álvarez")`, `("Úbeda")`, `("ñandú")`, `("Ñ")`, `("de la Barca")` | `A`, `U`, `Ñ`, `Ñ`, `D` | — |
| Inicial sin forma | `""`, `"  "`, `" Cervantes"`, `"1984"`, `"¿Quién?"`, `"«Rojas»"` | `undefined` | el esquema lo rechaza con la regla |
| Orden con Ñ | claves `Nuño`, `Núñez`, `Nuza`, `Ñandú`, `Ocampo`, `Navarro` | `Navarro < Núñez < Nuño < Nuza < Ñandú < Ocampo` (la ñ va tras toda n y antes de o, también dentro de palabra) | — |
| Empate | `Séneca`/`seneca-el-viejo` y `Séneca`/`seneca`, en cualquier orden de entrada | siempre `seneca` antes que `seneca-el-viejo` | — |
| Propuesta | `Séneca`; `José Martí`; `Miguel de Cervantes`; `Manuel González Prada` | `Séneca` sin marca; `Martí` sin marca; `Cervantes` marcada; `Prada` marcada | — |
| `crear` | `crear --nombre "Miguel de Cervantes" …` | escribe `ordenAlfabetico: "Cervantes"`, sin `ordenRevisado`; el parte dice la clave, «sin revisar» y la marca de tres palabras | bandera desconocida (p. ej. `--clave`) → 2, sin escribir |
| Regla sin inicial | `crear --nombre "Pío 2"` (última palabra sin forma) | crea el Autor **sin** `ordenAlfabetico`, sale con 0 y el parte dice que la regla no da clave y que la fija Héctor con `npx tsx tools/autor.ts clave <slug> "<clave>"`; `proponer-claves` lo lista aparte sin escribirle nada; la puerta del build, si está publicado, nombra esa orden en vez de `proponer-claves` | — |
| `proponer-claves` | Corpus con Autores con y sin clave | escribe solo en los que no la tienen; parte: cada Autor con nombre y clave, cuántos sin revisar, y aparte los de tres o más palabras sin revisar; segunda pasada no escribe nada | argumento suelto o bandera desconocida → 2 |
| `clave <slug> <clave>` | Autor existente, clave con forma | escribe la clave y `ordenRevisado` = jornada local de hoy | slug inexistente o clave sin forma → 1 sin escribir |
| `clave <slug>` | Autor con clave | conserva la clave y escribe `ordenRevisado` | sin clave que confirmar → 1; sin slug, argumento de más o bandera desconocida → 2 |
| Build, publicado sin clave | Autor con Cita en `corpus/citas/` y sin `ordenAlfabetico` | rompe nombrando `corpus/autores/<slug>.yml` y `npx tsx tools/autor.ts proponer-claves` | excepción en `astro:build:start`; aviso en `astro dev` |
| Build, sin Citas | Autor sin Citas publicadas (o con todas en `_revision/`) y sin clave | construye | — |
| Build, forma | cualquier Autor con `ordenAlfabetico: "1984"` | rompe con el Autor, `ordenAlfabetico` y la regla | — |

</intent-contract>

## Code Map

- `src/lib/normalizar.ts` -- AD-3. Añadir la función hermana junto a `normalizar` (que pliega ñ→n, l. 34): `inicialDeClave(clave)` y la comparación (`claveDeComparacion(clave)` + `compararPorClave({clave, slug}, {clave, slug})`, por unidades de código, no `localeCompare`). Una vía: sustituir ñ/Ñ por `n` + un carácter de uso privado (U+E000) antes de `normalizar`; ese carácter no es `\p{M}` ni puntuación y ordena tras toda letra.
- `src/lib/admision.ts:303` `autorAdmisible` -- añadir `ordenAlfabetico` (validador exportado, con `.refine` sobre `inicialDeClave` y mensaje «Regla incumplida: …») y `ordenRevisado` (`esJornada`), ambos `.optional()`.
- `src/content.config.ts:85` colección `autores` -- añadir los mismos dos validadores importados (no redefinidos).
- `src/lib/citaDelDia.ts:39` `esJornada` -- reutilizar.
- `tools/lib/gestion.ts:93` `crearAutor` / `:137` `editarAutor` -- `crear` escribe la clave propuesta (nunca `ordenRevisado`) y su mensaje dice clave, «sin revisar» y la marca; `editar` conserva el fichero (ya lo hace) y su mensaje recuerda la clave escrita (o que no la tiene). Aquí van también `proponerClaves(rutas)` y `fijarClave(rutas, slug, clave?, hoy)`, con `Resultado`.
- `tools/lib/claves.ts` (nuevo) -- `proponerClave(nombre) → { clave?: string; marcada: boolean }` y el núcleo puro de la puerta: `fallosDeClaves(autores con {slug, ruta, ordenAlfabetico?}, publicados)` → líneas con ruta y regla/orden.
- `tools/lib/corpus.ts:852` `escribirAutor` vuelca con `aYaml` y pierde comentarios; añadir junto a él un escritor de campos que use `parseDocument` de `yaml` y solo fije las claves dadas. `fechaLocal` (l. 1260) da la jornada.
- `tools/autor.ts` -- órdenes `proponer-claves` y `clave <slug> [<clave>]` (solo `--corpus` como bandera; la clave es posicional), `USO`, guardián `motivosDeArgumentosNoReconocidos`; `listar` añade la clave (o «sin clave») y «sin revisar», y una línea final con cuántos faltan.
- `integraciones/claves.ts` (nuevo) + `astro.config.mjs` -- puerta en `astro:build:start` que lee `leerAutores` y `leerCitas(rutas.citas)`, calcula `autoresPublicados` y lanza con el detalle por `logger.error` (patrón de `integraciones/cotejo.ts:123`); `astro:server:setup` solo avisa.
- `tools/lib/cambios.ts:254` `CAMPOS_QUE_NO_FECHAN` -- `autor: ['tradicion', 'ordenAlfabetico', 'ordenRevisado']`; la prueba de clasificación (`tests/unit/fecha-de-cambio.test.ts:341`) lo exige.
- `tests/unit/fecha-de-cambio.test.ts:388` matriz `VERSIONES`/`refechadas`/`avisadas` -- patrón para la prueba «solo claves no mueve nada».
- `tests/unit/ayuda/construir.ts:673` `AUTOR_VALIDO` y los Autores en línea de ~37 ficheros de `tests/unit/` (`grep -rln añoFallecimiento tests`) -- llevan clave; `tests/unit/autor-cli.test.ts` y `tests/unit/gestion.test.ts` comparan ficheros escritos por `crear`.
- `AGENTS.md` § «Una sesión de sembrado» -- paso nuevo de Héctor.

## Tasks & Acceptance

**Execution:**
- `src/lib/normalizar.ts` -- función hermana (inicial y comparación con desempate por slug) -- AD-3, una sola dueña de iniciales y orden de Autores.
- `src/lib/admision.ts`, `src/content.config.ts` -- los dos campos opcionales con el mismo validador -- AD-1.
- `tools/lib/claves.ts` -- `proponerClave` y `fallosDeClaves` -- regla fija y puerta pura, probadas sin construir.
- `tools/lib/corpus.ts` -- escritor de campos de Autor que conserva comentarios -- el lote solo añade una línea por fichero.
- `tools/lib/gestion.ts`, `tools/autor.ts` -- `crear` con clave, `editar` que la recuerda, `proponer-claves`, `clave`, `listar` -- FR-15.
- `tools/lib/cambios.ts` -- clasificar los dos campos como que no fechan -- AD-27.
- `tests/unit/normalizar-y-slug.test.ts`, `tests/unit/claves.test.ts`, `tests/unit/autor-cli.test.ts`, `tests/unit/gestion.test.ts`, `tests/unit/fecha-de-cambio.test.ts` -- la matriz de arriba: tildes, Ñ, mayúsculas, empates; propuesta y marca con 1, 2 y 3+ palabras; códigos 1/2 sin escribir; idempotencia del lote; comentarios conservados; un commit que solo escribe `ordenAlfabetico` u `ordenRevisado` no refecha ni avisa ninguna ruta.
- `tests/unit/ayuda/construir.ts` y los Autores en línea de las pruebas -- añadir `ordenAlfabetico` -- AC «los Autores de las pruebas llevan clave».
- **Commit 1 (código, sin puerta)**: todo lo anterior. Construye contra el Corpus real porque la presencia aún no se exige.
- **Commit 2 (lote, sin código)**: `npx tsx tools/autor.ts proponer-claves` sobre `corpus/autores/`; `git diff` debe ser solo `+ordenAlfabetico: "…"`, una por fichero sin clave; `git add corpus/autores` (nunca `-A`, nunca `_revision/`); guardar el parte (en especial la lista de tres o más palabras) en el Auto Run Result del spec.
- **Commit 3 (puerta)**: `integraciones/claves.ts`, `astro.config.mjs`, `tests/unit/claves-build.test.ts` (los tres casos con `construirConCorpus`: publicado sin clave rompe con ruta y orden; sin Citas y sin clave construye; forma inválida rompe con la regla) y `AGENTS.md` § Una sesión de sembrado (paso: «confirmar o corregir con `npx tsx tools/autor.ts clave` las claves sin revisar de los Autores dados de alta en la sesión», de Héctor, que ningún agente da por hecho; y que tras cada puesta al día con la principal se reejecuta `proponer-claves`).

**Acceptance Criteria:**
- Given el repositorio tras los tres commits, when se corre `npm run build`, then construye con los 171 Autores con clave y sin ninguno `ordenRevisado`.
- Given el commit del lote, when `relacionDeSuperficies` lee su diff, then no mueve el `lastmod` ni el aviso de ninguna superficie.
- Given `npx tsx tools/autor.ts listar`, when se corre, then cada Autor sale con su clave y «sin revisar», y una línea dice cuántos faltan.
- Given el cierre de la historia, when se mira el Corpus, then ningún fichero de `corpus/autores/` lleva `ordenRevisado` escrito por un agente.

## Design Notes

El orden de commits evita un commit roto: si la puerta entrase antes que el lote, el build del Corpus real fallaría entre los dos. La 26.3 y la 26.4 reescribirán la prueba de `relacionDeSuperficies` (la clave pasará a mover `/autores/` y `/obras/`); `ordenRevisado` seguirá sin mover nada.

## Verification

**Commands:**
- `npx vitest run tests/unit/<cada fichero tocado>.test.ts` -- verde.
- `npx tsx tools/autor.ts proponer-claves` dos veces -- la segunda no escribe nada; `git status --porcelain corpus/autores` vacío tras el commit 2.
- `npm run build` y `npx astro check` -- 0 errores.
- `npm test` completo (≈16 min, con `correr.sh`/`esperar.pl`) -- verde.

## Review Triage Log

### 2026-10-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

(Las cinco capas de revisión son externas en el bucle v8-ralph y en esta pasada no traían hallazgos: la revisión independiente viene después.)

### 2026-10-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 10: (high 0, medium 2, low 8)
- defer: 0
- reject: 30
- addressed_findings:
  - `[medium]` `[patch]` `proponer-claves` se paraba a medias, con traza y sin parte, ante un fichero que `fijarCamposDeAutor` no deja escribir (blind-hunter, edge-case-hunter): ahora lo nombra en «No se pudo escribir la clave de N Autor(es)», escribe los demás y sale con 1; prueba en `gestion.test.ts`.
  - `[medium]` `[patch]` Ninguna prueba construida fijaba la forma de `ordenRevisado` en la colección `autores` (verification-gap): cuarto caso en `claves-build.test.ts` con `ordenRevisado: "2026-02-31"`, que rompe nombrando el fichero y la regla.
  - `[low]` `[patch]` El aviso de `astro dev` (`astro:server:setup`) no tenía prueba (blind-hunter, verification-gap, ac-auditor): `claves.test.ts` llama a los ganchos con un registro de mentira y comprueba que avisa con el fichero y la orden sin lanzar, y que `astro:build:start` sí lanza.
  - `[low]` `[patch]` `fijarClave` dejaba escapar la excepción de `fijarCamposDeAutor` (edge-case-hunter): devuelve `motivos` y sale con 1 sin tocar el fichero; prueba en `gestion.test.ts`.
  - `[low]` `[patch]` `proponer-claves` daba por «revisada» la clave que acababa de escribir en un fichero con `ordenRevisado` y sin `ordenAlfabetico` (edge-case-hunter): una clave nueva cuenta siempre como sin revisar; prueba en `gestion.test.ts`.
  - `[low]` `[patch]` Un `ordenRevisado` sin `ordenAlfabetico` pasaba el build (blind-hunter, edge-case-hunter): `fallosDeClaves` lo rechaza nombrando el fichero y la orden `clave`, y la integración le pasa el campo; prueba en `claves.test.ts`.
  - `[low]` `[patch]` `inicialDeClave` daba I y S a «ı» y «ſ», que `claveDeComparacion` ordena tras la Z (edge-case-hunter): la letra se mira antes de pasarla a mayúscula; casos en `normalizar-y-slug.test.ts`.
  - `[low]` `[patch]` `clave <slug> ""` salía con 2 como argumento sobrante (blind-hunter, ac-auditor): la cadena vacía es la clave y la regla la rechaza con 1; caso en `autor-cli.test.ts`.
  - `[low]` `[patch]` La prueba de la clave sin forma no fijaba la ruta del fichero, y la de `puerta-de-admision` sin año construía un Autor publicado sin clave (intent-alignment, ac-auditor): la primera exige `corpus/autores/horacio.yml`; la segunda lleva `ordenAlfabetico`, para que el fallo venga del año.
  - `[low]` `[patch]` `crearAutor` llamaba dos veces a `proponerClave` (blind-hunter): el parte recibe la propuesta escrita.

Rechazados, con su razón (30): la marca solo a partir de tres palabras, el conjunto A–Z/Ñ de iniciales sin salida para Ø/Ł/Æ, y que `editar` no recalcule la clave son reglas del `<intent-contract>`; que nada impida a la 26.3 pintar claves sin revisar es FR-15 (no parar la siembra hasta la revisión de Héctor, 26.10); las columnas de `listar` y el recuento «faltan» mezclando no publicados, el `switch` sin `break` tras `terminar(): never`, `--corpus` antes del slug, `--corpus=`, la escritura no atómica (patrón de todo `tools/lib/corpus.ts`), los marcadores de documento y escalares de bloque (la verificación ya lanza y no escribe), `ordenRevisado` futuro, los dobles de tipo en la puerta (lo único que `autoresPublicados` lee hoy es el slug y el `autor`), la doble lectura del Corpus, la reexportación de `esJornada`, la ordenación de claves compuestas (la consume la 26.3), las pruebas de `sembrar`/`revisar` (pasan por `crearAutor`) y de las 171 líneas del lote (comprobado en el commit, sin reejecución posible), la ambigüedad de `AGENTS.md`, la fusión con la principal (26.11), el estado del seguimiento de 24.8 y 26.1 en `sprint-status.yaml` (lo mueve el orquestador, no esta pasada), el aviso de la portada en `avisar` (política anterior: toda reconstrucción la avisa), la propiedad única de la ordenación (26.3), y la nota de que la pasada anterior no tuvo revisión (es esta).

## Auto Run Result

Status: done
Blocking condition: ninguna

**Qué se hizo.** `ordenAlfabetico` y `ordenRevisado` existen como campos opcionales del Autor con un solo validador; la hermana de `normalizar` da la inicial (A–Z o Ñ) y el orden (ñ entre n y o, desempate por slug); la regla fija «última palabra del nombre» vive en `tools/lib/claves.ts`; `tools/autor.ts` propone la clave al crear, la recuerda al editar, la propone en lote (`proponer-claves`) y la confirma o corrige (`clave`, la única que escribe `ordenRevisado`); el build rompe ante un Autor publicado sin clave o ante una clave sin forma. Los 171 Autores del Corpus llevan la clave propuesta, ninguna revisada.

**Commits** (sobre `39234cc4dd8ace36326b2709551cd7c483209b71`):
1. `0deecbaae8` feat(autores) — código sin puerta, pruebas y Autores de las pruebas con clave.
2. `908ee84fc1` chore(autores) — el lote de `proponer-claves`, solo `corpus/autores/` (171 ficheros, +1 línea `ordenAlfabetico:` cada uno, 0 líneas quitadas).
3. `f05ffa143f` feat(autores) — la puerta del build, su prueba construida y el paso de Héctor en `AGENTS.md`.
4. `2bb2c15b2c` fix(autores) — `esJornada` pasa a `src/lib/jornada.ts` (reexportada por `citaDelDia.ts`): importarla de `citaDelDia.ts` metía a toda superficie que admite contenido en el grafo de las que rotan con la jornada (lo cazó `tests/unit/peso.test.ts`).

**Ficheros.**
- `src/lib/normalizar.ts` — `inicialDeClave`, `claveDeComparacion`, `compararPorClave`.
- `src/lib/admision.ts` — validadores `ordenAlfabetico` (con `REGLA_DE_CLAVE_DE_ORDEN`) y `ordenRevisado`; los dos en `autorAdmisible`.
- `src/lib/jornada.ts` (nuevo), `src/lib/citaDelDia.ts` — `esJornada` en su propio módulo, reexportada.
- `src/content.config.ts` — los dos campos en la colección `autores`, importados.
- `tools/lib/claves.ts` (nuevo) — `proponerClave`, `fallosDeClaves`, órdenes nombradas.
- `tools/lib/corpus.ts` — `fijarCamposDeAutor`, que localiza con `parseDocument` y escribe por texto (conserva comentarios byte a byte).
- `tools/lib/gestion.ts` — `crearAutor` con clave, `editarAutor` que la recuerda, `proponerClaves`, `fijarClave`.
- `tools/autor.ts` — órdenes `proponer-claves` y `clave`, `listar` con clave y recuento, guardián de argumentos.
- `tools/lib/cambios.ts` — `CAMPOS_QUE_NO_FECHAN.autor` con los dos campos.
- `integraciones/claves.ts` (nuevo), `astro.config.mjs` — la puerta (`astro:build:start` rompe, `astro:server:setup` avisa).
- `AGENTS.md` — § Una sesión de sembrado: el paso de Héctor y la vuelta a `proponer-claves` tras cada puesta al día.
- Pruebas: `tests/unit/claves.test.ts` y `tests/unit/claves-build.test.ts` (nuevos); casos nuevos en `normalizar-y-slug`, `autor-cli`, `gestion` y `fecha-de-cambio`; `ordenAlfabetico` en `tests/unit/ayuda/construir.ts` (`AUTOR_VALIDO`) y en los Autores en YAML de 32 ficheros de prueba.

**Parte del lote** (`npx tsx tools/autor.ts proponer-claves`, 2026-10-28): 171 claves escritas, sin revisar: 171 de 171; la regla dio clave a todos. Nombres de tres palabras o más, sin revisar —para la 26.10, de Héctor—: 78:
agustin-de-arguelles «Argüelles», agustin-de-hipona «Hipona», alfonso-x-el-sabio «Sabio», antonio-alcala-galiano «Galiano», antonio-canovas-del-castillo «Castillo», arcipreste-de-hita «Hita», aristobulo-del-valle «Valle», armando-palacio-valdes «Valdés», bartolome-de-las-casas «Casas», benito-perez-galdos «Galdós», caton-el-viejo «Viejo», clorinda-matto-de-turner «Turner», domingo-faustino-sarmiento «Sarmiento», eduardo-acevedo-diaz «Díaz», emilia-pardo-bazan «Bazán», enric-prat-de-la-riba «Riba», eugenio-maria-de-hostos «Hostos», federico-garcia-lorca «Lorca», felix-lope-de-vega-y-carpio «Carpio», felix-maria-samaniego «Samaniego», fernan-gonzalez-de-eslava «Eslava», fernando-de-rojas «Rojas», fernando-tarrida-del-marmol «Mármol», francisco-de-quevedo «Quevedo», francisco-pi-y-margall «Margall», francois-de-salignac-de-la-mothe-fenelon «Mothe-Fénelon», gaspar-melchor-de-jovellanos «Jovellanos», gayo-julio-fedro «Fedro», gertrudis-gomez-de-avellaneda «Avellaneda», gonzalo-de-berceo «Berceo», gustavo-adolfo-becquer «Bécquer», gustavo-sanchez-galarraga «Galarraga», guy-de-maupassant «Maupassant», henry-david-thoreau «Thoreau», honore-de-balzac «Balzac», ignacio-manuel-altamirano «Altamirano», joaquin-diaz-garces «Garcés», joaquin-v-gonzalez «González», jose-asuncion-silva «Silva», jose-de-san-martin «Martín», jose-enrique-rodo «Rodó», jose-manuel-de-navarrete «Navarrete», jose-maria-de-pereda «Pereda», jose-maria-samper «Samper», jose-victorino-lastarria «Lastarria», josefa-amar-y-borbon «Borbón», juan-bautista-alberdi «Alberdi», juan-donoso-cortes «Cortés», juan-maria-gutierrez «Gutiérrez», juan-ruiz-de-alarcon «Alarcón», juana-manuela-gorriti «Gorriti», julio-herrera-y-reissig «Reissig», luis-de-gongora «Góngora», manuel-gonzalez-prada «Prada», marcelino-menendez-y-pelayo «Pelayo», maria-de-zayas-y-sotomayor «Sotomayor», mariano-jose-de-larra «Larra», miguel-antonio-caro «Caro», miguel-de-cervantes «Cervantes», miguel-de-unamuno «Unamuno», pablo-de-olavide «Olavide», pedro-antonio-de-alarcon «Alarcón», pedro-bonifacio-palacios «Palacios», pedro-calderon-de-la-barca «Barca», praxedis-g-guerrero «Guerrero», publio-terencio-africano «Africano», ramon-del-valle-inclan «Valle-Inclán», ricardo-flores-magon «Magón», rosalia-de-castro «Castro», rosario-de-acuna «Acuña», salvador-camacho-roldan «Roldán», santiago-ramon-y-cajal «Cajal», soledad-acosta-de-samper «Samper», sor-juana-ines-de-la-cruz «Cruz», t-h-pardo-de-tavera «Tavera», teresa-de-jesus «Jesús», tomas-de-iriarte «Iriarte», vicente-blasco-ibanez «Ibáñez».

**Revisión.** Parches: 0. Aplazados: 0. Rechazados: 0 (capas externas sin hallazgos en esta pasada). `followup_review_recommended: false` — parcheados: high 0, medium 0, low 0; puntuación 0.

**Verificación.**
- `npx vitest run` de `normalizar-y-slug`, `claves`, `autor-cli`, `gestion`, `fecha-de-cambio`, `claves-build`, `peso`, `cita-del-dia`, `lote`, `linea-base` — verde.
- `npx tsx tools/autor.ts proponer-claves` dos veces — la primera escribe 171; la segunda «Ninguna clave nueva»; `git status --porcelain corpus/autores` vacío tras el commit 2.
- `npx tsx tools/autor.ts listar` — cada Autor con «…» y «sin revisar»; última línea «Claves de orden: faltan 0 y 171 están sin revisar, de 171 Autores.»
- `npx tsx tools/avisar.ts --ensayo --desde 0deecbaae8 --hasta 908ee84fc1 --sitemap dist/sitemap-0.xml` — el lote no refecha ni avisa ninguna familia (0 en cita, autor, tema, colección y obra; solo la portada, que se avisa siempre que cambia el Corpus).
- `npm run build` con la puerta y tras el arreglo — EXIT 0 (467,7 MiB juzgados). `npx astro check` — 0 errores, 0 avisos.
- `npm test` completo — primera pasada: 1 fallo (`peso.test.ts`, la jornada; arreglado en el commit 4); segunda: 140 ficheros, 6398 pruebas, verde.
- Ningún fichero de `corpus/autores/` lleva `ordenRevisado`.

**Auditoría de la matriz.** Cada fila tiene prueba que corrió en verde: iniciales y orden (`normalizar-y-slug`), propuesta (`claves`), `crear`/regla sin inicial/`proponer-claves`/`clave` con sus códigos (`autor-cli`, `gestion`), las tres filas del build (`claves-build`; la orden nombrada cuando la regla no da clave, en `claves`).

**Segunda pasada de revisión (2026-10-28, capas externas).** Parches: 10 (high 0, medium 2, low 8). Aplazados: 0. Rechazados: 30. `followup_review_recommended: true` — puntuación 3 × 2 + 1 × 8 = 14.
- `tools/lib/gestion.ts` — `proponerClaves` recoge el fichero que no se deja escribir, sigue con los demás y sale con 1; una clave recién escrita nunca cuenta como revisada; `fijarClave` devuelve el fallo del escritor como motivo; `crearAutor` pasa al parte la propuesta que escribió.
- `tools/lib/claves.ts`, `integraciones/claves.ts` — la puerta rechaza `ordenRevisado` sin `ordenAlfabetico`.
- `src/lib/normalizar.ts` — `inicialDeClave` mira la letra antes de la mayúscula («ı», «ſ» no tienen inicial).
- `tools/autor.ts` — `clave <slug> ""` es una clave sin forma (1), no un suelto de más (2).
- Pruebas: `claves.test.ts` (revisión huérfana; ganchos de `astro dev` y de build con registro de mentira), `claves-build.test.ts` (ruta del fichero; `ordenRevisado` que no es jornada), `gestion.test.ts` (lote con un fichero que no se deja escribir; clave nueva sin revisar; `fijarClave` sobre ese fichero), `autor-cli.test.ts` (clave vacía), `normalizar-y-slug.test.ts` («ı», «ſ»), `puerta-de-admision.test.ts` (el Autor sin año lleva clave).
- Verificación: `npx vitest run` de `gestion`, `autor-cli`, `claves`, `normalizar-y-slug`, `fecha-de-cambio` — verde (286); `npx tsx tools/autor.ts proponer-claves` sobre el Corpus real — «Ninguna clave nueva», `git status --porcelain corpus` vacío; `npx astro check` — 0 errores, 0 avisos; `npm test` — 140 ficheros, 6404 pruebas, verde; `npm run build` — EXIT 0 (467,7 MiB juzgados).

**Riesgos residuales.**
- El aviso de `astro dev` se prueba llamando al gancho, no arrancando `astro dev`.
- `sprint-status.yaml` sigue con la 26.1 en `backlog` y la 24.8 en `review`: lo mueve el orquestador del bucle.
- `editar` y `biografia` siguen volcando la ficha con `aYaml` y pierden comentarios (anterior a esta historia); conservan la clave y la revisión.
- Al fusionar con la principal hay que volver a correr `proponer-claves` (26.11): los Autores sembrados allí entretanto llegan sin clave y romperían el build.
