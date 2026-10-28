---
title: 'Historia 26.1 — Todo Autor publicado tiene su clave de orden'
type: 'feature'
created: '2026-10-28'
status: 'in-progress'
baseline_revision: '39234cc4dd8ace36326b2709551cd7c483209b71'
review_loop_iteration: 0
followup_review_recommended: false
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

## Auto Run Result

Status: ready-for-dev
Blocking condition: ninguna (planificación detenida a propósito: «Halt after planning»).
