---
title: 'Historia 19.1 — De una obra traducida se conserva lo que la Fuente declare'
type: 'feature'
created: '2026-10-09'
status: 'in-progress'
baseline_revision: '80220616addfbb70c68e63b474d6192e8d0190bd'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** De una obra traducida, la Fuente declara el traductor y el año de la traducción (`|traductor=`, `|año=`), pero la derivación solo conserva la obra y el año, y ese año se publica como si fuera el de la Obra. Hoy 65 Citas (Odas 35, Consolación a Marcia 14, La Eneida 8, Fedro 6 y Las avispas 2) dicen, por ejemplo, que Horacio escribió las Odas en 1909.

**Approach:** La Procedencia gana `traduccion: { traductor, año? }`. La derivación lee el traductor de la declaración literal y, cuando lo hay, el año declarado a su lado pasa a ser el de la traducción y no el de la Obra. Una orden restituye lo ya publicado leyendo el documento versionado (AD-23). La Atribución y lo copiado nombran la traducción (UX-DR51); la Imagen, la Tarjeta y la Pieza no.

## Boundaries & Constraints

**Always:**
- **Esquema** (`src/lib/admision.ts`): `procedencia.traduccion` es opcional y estricta. Lleva `traductor` (cadena no vacía, **obligatorio**) y `año` (opcional, con la regla `año` existente). Un campo sin valor se omite.
- **Derivación** (`tools/lib/documento.ts`):
  - `traductor()` en el lector de Wikisource, con el mismo orden de búsqueda que `año()`: página, después `obra>`, después `índice>`. El parámetro admite `|traductor =` con espacios y `translator`;
  - el marcado se quita: `[[Germán Salinas]]` queda `Germán Salinas`, y `[[X|Y]]` queda `Y`;
  - `derivarDeLaDeclaracion` devuelve `traductor` y, **si hay traductor**, `añoDeTraduccion` en lugar de `año` (el año de la Obra queda sin declarar);
  - sin traductor, nada cambia;
  - `Wikisource` es un traductor declarado literal y se conserva tal cual.
- **Al recuperar y extraer:**
  - `recuperar.ts` añade `traductor:` a la cabecera del documento cuando se deriva;
  - `extraer.ts` y `documentar` escriben `procedencia.traduccion` desde la derivación;
  - los documentos ya versionados **no se reescriben**: la orden de restitución lee su declaración.
- **Restitución:**
  - `npm run documentar -- --restituir-traduccion` recorre las Citas publicadas cuyo documento (por `documentosDeCita`) declara traductor;
  - en cada una escribe `traduccion` con el traductor literal y el año declarado, y quita de `procedencia.año` el año igual al de la traducción. Si la Cita trae un año de la Obra distinto, lo conserva;
  - no toca ninguna Cita sin documento, ni el texto ni el slug;
  - es idempotente: una segunda pasada no cambia nada;
  - informa por obra cuántas Citas cambió;
  - el cambio del corpus se versiona en un **commit propio**, aparte del código.
- **Atribución** (`src/components/Atribucion.astro`):
  - con `traduccion`: `{obra}[, {año de la Obra}]. Traducción de {traductor}[, {año}].`, más la referencia como hoy;
  - no dice «Sin año documentado» cuando la hay.
- **Lo copiado** (`textoParaCopiar`): `«…» — {Autor}, {obra}[, {año Obra}], trad. de {traductor}[, {año}].`.
- `procedenciaCompuesta`, la Imagen de Cita, el Kit, la Tarjeta Social, la Pieza y el JSON-LD **no** nombran al traductor ni ponen el año de la traducción como año de la Obra: solo usan `procedencia.año`.
- **Salud** (`npx tsx tools/auditoria.ts`): una línea con cuántas Citas de Autor de `tradicion: "otra"` no traen `traduccion`. Es una cifra y no un error.
- `gradoDeProcedencia` no cambia: una Cita que pierde el año que no era de la Obra pasa a «parcial», y es lo cierto.

**Block If:** la restitución tocaría alguna Cita cuyo año publicado no coincide con el año que el documento declara junto al traductor y que no trae otro año. En ese caso no se toca: se lista y la orden sigue. Esto **no** bloquea la historia.

**Never:**
- Inferir un traductor o un año que la declaración no trae.
- Hacer de la traducción una puerta de publicación.
- Reescribir `corpus/fuentes/`.
- Editar una Cita a mano.
- Borrar nada de `corpus/`.
- Construir la Cabecera de Obra ni «Dónde leer» (eso es la 22.x).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Derivar Odas | declaración `\|traductor=[[Germán Salinas]]`, `\|año=1909` | `{obra:'Odas', traductor:'Germán Salinas', añoDeTraduccion:1909}`, sin `año` | — |
| Derivar Eneida | traductor y año solo en líneas `obra>` | traductor y año de la traducción del `obra>` | — |
| Variante | `\|traductor =Federico Baráibar` | traductor «Federico Baráibar» | — |
| Sin traductor | `\|año=1898` | `año: 1898` como hoy | — |
| Restituir | Cita Odas con `año: 1909` | `procedencia: {obra:'Odas', traduccion:{traductor:'Germán Salinas', año:1909}}` | — |
| Restituir 2ª vez | ya restituida | sin cambios | — |
| Sin año declarado | Ciudad de Dios, traductor sin año | `traduccion:{traductor}` y nada más | — |
| Atribución | la Cita de arriba | «Odas. Traducción de Germán Salinas, 1909.» | — |
| Copiado | ídem, Autor Horacio | «… — Horacio, Odas, trad. de Germán Salinas, 1909.» | — |
| Imagen, Tarjeta y Pieza | ídem | solo «Odas», sin traductor ni 1909 | — |
| Esquema | `traduccion: {año: 1909}` sin traductor | el build se para | error de esquema |
| Salud | Séneca (`otra`) sin traducción | aparece en la cifra | — |

</intent-contract>

## Code Map

- `src/lib/admision.ts:50-90` -- `procedenciaDeclarada` (estricta, con superRefine que exige obra, año o referencia: `traduccion` sola no basta) y `gradoDeProcedencia` (l.270, no cambia).
- `src/content.config.ts:56` -- usa `procedencia` de admisión.
- `tools/lib/documento.ts`:
  - `PARAMETRO_DE_ENCABEZADO` (l.345, ya incluye `traductor|translator`), `PARAMETRO_DE_AÑO_WIKITEXTO` (l.349) y `PARAMETRO_DE_TITULO_WIKITEXTO` (l.353);
  - `añoDeParametro` (l.310) y `tituloDeclarado` (l.379), que quita enlaces;
  - `loQueDeclaraLaPagina`, `loQueDeclaraLaObra` y `loQueDeclaraElIndice` (l.934/942/1073);
  - `LectorDeFuente` (l.1159) y el lector de Wikisource, con `año()` en l.1648;
  - `derivarDeLaDeclaracion` (l.1742), `DerivacionDeDocumento` y `derivarDocumento` (l.1832/1859), `componerDocumento` y `analizarDocumento` (l.1977/1999).
- `tools/recuperar.ts:327-340` -- compone la cabecera.
- `tools/lib/extraccion.ts:46-52,759` -- `Candidata.procedencia` y su construcción.
- `tools/extraer.ts:233,443-455` -- deriva y escribe la candidata.
- `tools/documentar.ts` y `tools/lib/documentacion.ts` -- `documentarCita` (l.429) y la reescritura de la Procedencia (l.582-587), con `escribirCita`. Aquí va el modo `--restituir-traduccion`.
- `tools/lib/cotejo.ts:199,220` -- `documentoDeCita` y `documentosDeCita`, que resuelven el documento por `fuente.id` y `procedencia.obra`.
- `src/components/Atribucion.astro:22-42` -- las frases de la Procedencia.
- `src/lib/atribucion.ts:29-47` -- `procedenciaCompuesta` (no cambia) y `textoParaCopiar`, que gana el sufijo de la traducción.
- Superficies que no deben nombrar la traducción: `src/islands/ImagenDeCita.astro:59`, `src/islands/ImagenDelKit.astro:28`, `src/pages/tarjeta/[slug].png.ts:29`, `src/lib/pieza.ts:42`, `src/components/DatosEstructurados.astro:23`. Leen `procedencia.año`; basta con no tocarlas y probarlo.
- `tools/auditoria.ts:54-95` y `src/lib/salud.ts` (`auditar`, `CitaParaAuditar` en l.15) -- la cifra nueva. Necesita la `tradicion` del Autor: se amplía `CitaParaAuditar` o se calcula en `tools/`.
- Pruebas existentes: `tests/unit/documento.test.ts`, `extraccion.test.ts`, `documentacion.test.ts`, `documentar-cli.test.ts`, `puerta-de-admision.test.ts`, `salud.test.ts` y `compartir.test.ts`. El constructor de corpus de prueba está en `tests/unit/ayuda/construir`.

## Tasks & Acceptance

**Execution:**
- `src/lib/admision.ts` -- el esquema de `traduccion`.
- `tools/lib/documento.ts` -- `PARAMETRO_DE_TRADUCTOR_WIKITEXTO`, `traductor()` y la derivación con `traductor` y `añoDeTraduccion`.
- `tools/recuperar.ts`, `tools/lib/extraccion.ts`, `tools/extraer.ts` y `tools/lib/documentacion.ts` -- llevar `traduccion` a la Procedencia.
- `tools/documentar.ts` y `tools/lib/documentacion.ts` -- el modo `--restituir-traduccion` (puro y probado), con su uso en `USO` y una línea en la sección de AGENTS.md «Documentar una Cita ya publicada».
- `src/components/Atribucion.astro` y `src/lib/atribucion.ts` -- la frase y el copiado.
- `src/lib/salud.ts` y `tools/auditoria.ts` -- la cifra.
- Pruebas: cada fila de la matriz en el fichero de prueba que corresponda; para la Atribución, el copiado, la Imagen, la Tarjeta y la Pieza, una construcción con una Cita con traducción (`construirConCorpus`).
- **Ejecución:** `npm run documentar -- --restituir-traduccion` sobre el corpus real. Revisar el informe (cerca de 65 Citas con año movido y traductor añadido en las demás traducidas con documento) y verificar que `npm run build` construye.

**Acceptance Criteria:**
- Given el corpus restituido, when se construye, then la Página de Cita de una Oda de Horacio dice «Odas. Traducción de Germán Salinas, 1909.» y su Tarjeta no nombra a Salinas.
- Given la suite tocada, `npx astro check` y `npm run build`, when corren, then pasan en verde.

## Spec Change Log

## Review Triage Log

## Design Notes

Por qué «año junto al traductor = año de la traducción» no es inferir: en los documentos medidos, el único `|año=` declarado está en el mismo bloque que `|traductor=`, y la épica fija que «el año que hoy publican como de la obra pasa a ser el de la traducción». Lo que **sería** inferir es inventarle a la Obra un año; por eso queda omitido.

## Verification

**Commands:**
- `npx vitest run tests/unit/documento.test.ts tests/unit/documentacion.test.ts tests/unit/documentar-cli.test.ts tests/unit/extraccion.test.ts tests/unit/puerta-de-admision.test.ts tests/unit/salud.test.ts tests/unit/compartir.test.ts` (y los ficheros nuevos) -- expected: verde
- `npx astro check` -- expected: 0 errores
- `npm run build` -- expected: código 0
