---
title: 'Historia 33.2 — Las ediciones en venta, por formato y por tienda dentro de «Dónde leer esta obra»'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_revision: 'a38d79125d93bb46a895379670e31343dfe9504c'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-33-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      La decisión de UX de la 33.2 —el orden de las tiendas dentro de un formato por `TIENDAS` y
      los 3 × `--unidad` entre «Gratis» y cada grupo de venta— vive solo en el código y en
      AGENTS.md, no en DESIGN.md ni en EXPERIENCE.md, que mandan; pendiente de Héctor (bmad-ux).
    evidence: |-
      La [ASSUMPTION] de la Épica 33 (orden de TIENDAS frente al de la ficha) se aceptó por
      delegación de Héctor (chat, 2026-11-14), y AGENTS.md la anota como «pendiente de bmad-ux».
      Los artefactos de UX no se editan a mano (AGENTS.md): cuando bmad-ux la decida, la nota
      transitoria de AGENTS.md y la cabecera de edicionesPorFormato se ponen al día con ella.
    location: >-
      src/lib/ediciones.ts (cabecera de edicionesPorFormato); AGENTS.md § Encender la afiliación de libros
    severity: low
  - summary: >-
      Dos tiendas de TIENDAS con el mismo nombre darían dos enlaces con el mismo nombre accesible
      («Edición impresa en X») hacia sitios distintos: revisarTiendas rechaza la clave repetida,
      no el nombre repetido.
    evidence: |-
      revisarTiendas (src/lib/ingreso.ts) solo comprueba «se declara dos veces» por clave; el texto
      del enlace de EdicionesEnVenta.astro sale de `tienda` (el nombre), como desde la 22.9. No lo
      causa la 33.2, que añade claveDeTienda solo para ordenar; TIENDAS está vacío en el árbol.
    location: >-
      src/lib/ingreso.ts revisarTiendas; src/components/EdicionesEnVenta.astro
    severity: low
---

<intent-contract>

## Intent

**Problem:** Con la afiliación encendida, las ediciones en venta salen bajo un único rótulo «Ediciones en venta» (un `h3`), en el orden de la ficha y mezclando formatos, y la congelación de la familia Obra (SM-11) no las oculta. La v9 pide repartirlas en «Electrónica» e «Impresa» bajo «Gratis», por tienda, y que lo congelado se conserve sin enseñarse (FR-35, FR-54, AD-25, UX-DR127, UX-DR147).

**Approach:** Una función pura `edicionesPorFormato` en `src/lib/ediciones.ts` agrupa lo que ya compone `edicionesEnVenta`: «Electrónica» antes que «Impresa», dentro por el orden de `TIENDAS` y, a igual tienda, por el de la ficha, sin grupos vacíos. `EdicionesEnVenta.astro` pinta los grupos con `RotuloDeGrupo.astro` dentro de un único `div[data-ingreso]`, y la página de Obra no compone `enVenta` cuando `congelacionVigente()` tiene valor.

## Boundaries & Constraints

**Always:**
- `TIENDAS` sigue vacío y la afiliación apagada en el árbol. Toda tienda de prueba es inventada (`.example`) y vive solo en la copia (AD-21) o por parámetro.
- Un solo `div data-ingreso="afiliacion-de-libros"` (nunca `aside`) dentro del `<details>` de «Dónde leer esta obra», tras el grupo «Gratis», con los dos grupos dentro. Un formato sin ediciones no deja rótulo, contenedor ni hueco.
- El rótulo de cada grupo es `RotuloDeGrupo.astro` (el mismo elemento que «Gratis»; ya lo importa `DondeLeer.astro`, así que su hoja no añade regla nueva). Todo lo demás del bloque va en atributos `style` con tokens: 3 × `--unidad` del grupo anterior a cada grupo de venta, `--unidad` del rótulo a cada línea, líneas en `--pie`/`--interlineado-pie`/`--tinta-apagada`. Ningún `<style>` en `EdicionesEnVenta.astro`; `tests/unit/tipografia-en-tokens.test.ts` pasa sin excepción nueva.
- Cada línea conserva texto, `rel="sponsored noopener"`, `target="_blank"`, `AVISO_DE_PESTAÑA_NUEVA` y `aria-describedby`; los `id` de la declaración siguen siendo únicos en la página, numerados en el orden en que se pintan (`edicion-en-venta-{n}-afiliado`).
- `EdicionesEnVenta.astro` y `DondeLeer.astro` no importan `src/lib/ingreso.ts`; reciben los grupos ya hechos. La página es quien llama a `edicionesEnVenta`, `edicionesPorFormato` (con las claves de `TIENDAS`) y `congelacionVigente`.
- Apagada, `dist/` idéntico al de hoy (las cuatro variantes de la 33.1 siguen en verde). Sin guion nuevo ni enlace interno nuevo en `main`; `tests/unit/medicion.test.ts` no cambia. `ediciones` sigue fechando y avisando solo su Página de Obra (`tests/unit/fecha-de-cambio.test.ts` sin cambios).

**Block If:**
- La identidad byte a byte de las copias congeladas (encendida contra apagada) o de `dist/` fuera de las Obras falla por algo que no es el bloque y cerrarlo exige tocar la configuración del empaquetado: HALT con la ruta y el fichero que difieren. (La variación del `.woff2` de Google Fonts entre construcciones es el diferido conocido de la 33.1: se repite la prueba, no se debilita.)

**Never:**
- Escribir una tienda, una marca o una edición real, encender un Modelo o declarar `CONGELACION_DE_OBRAS` en el árbol.
- Leer la congelación de otro sitio que `congelacionVigente` de `src/lib/obras.ts`.
- Rótulo de tienda, «Ediciones en venta», «Consíguelo» o «Cómprala» en ninguna superficie. El texto «Ediciones en venta (n):» del parte de `tools/lib/obras.ts` es de la orden, no de una superficie, y se queda.
- Tocar la Obra con derechos vigentes (FR-70, 35.9), elegir ediciones o tiendas (FR-62), ni `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dos formatos, dos tiendas | ficha `[imp B, ele A, imp A, ele B]`, orden `[A, B]` | `[Electrónica: ele A, ele B] [Impresa: imp A, imp B]` | — |
| Dos ediciones de una tienda | `[imp A1, imp B, imp A2]`, orden `[A, B]` | `[Impresa: A1, A2, B]` | — |
| Un formato vacío | solo impresas | un único grupo «Impresa», sin «Electrónica» | — |
| Ninguna edición | `[]` | `[]` (sin bloque) | — |
| Tienda fuera del orden | clave que no está en el orden | — | lanza nombrando la clave |
| Congelada, encendida | `CONGELACION_DE_OBRAS` con valor | ninguna Página de Obra con bloque; idéntica a la congelada apagada | — |

</intent-contract>

## Code Map

- `src/lib/ediciones.ts` — `EdicionEnVenta` (sin la clave de tienda hoy) y `FORMATOS_DE_EDICION`. Aquí van el campo nuevo `claveDeTienda`, el tipo `GrupoDeEdiciones` (`{ formato, rotulo: 'Electrónica'|'Impresa', ediciones }`) y `edicionesPorFormato(ediciones, ordenDeTiendas: readonly string[])`. Módulo sin E/S que los componentes importan solo por tipos.
- `src/lib/ingreso.ts:365` `edicionesEnVenta(ediciones, ficha, tiendas)` — añadir `claveDeTienda: tienda.clave` al resultado. `TIENDAS` en l.307.
- `src/pages/obra/[autor]/[slug]/[...page].astro:124-139` — comentario «congelada o no» de `conDondeLeer` (l.124) y composición de `enVenta` (l.135-139). Importa de `../../../../lib/obras.ts` (l.43-56; añadir `congelacionVigente`) y de `ingreso.ts` (l.57; añadir `TIENDAS`). `<DondeLeer … enVenta={enVenta} />` en l.201.
- `src/components/DondeLeer.astro` — prop `enVenta?: { id; ediciones }` y la condición `enVenta.ediciones.length > 0` (≈l.80): pasan a `grupos`. Su comentario de la 22.9 («El reparto … es de la 33.2») se pone al día. `.grupo + .grupo` (3 × unidad) es su regla scoped; el bloque de venta no la hereda y lleva su margen en `style`.
- `src/components/EdicionesEnVenta.astro` — hoy un `h3` «Ediciones en venta» y una sola `ul`; `DEL_BLOQUE` = 2 × unidad, `DEL_ROTULO` duplica a `RotuloDeGrupo`. Se reescribe a un `div` por grupo con `RotuloDeGrupo` y su `ul`.
- `src/components/RotuloDeGrupo.astro` — `<p class="rotulo-de-grupo"><slot/></p>`; reutilizar tal cual.
- `src/lib/obras.ts:198` `congelacionVigente(declarada = CONGELACION_DE_OBRAS)`; `src/lib/umbrales.ts:134` la declaración, que las pruebas parchean por texto (`'export const CONGELACION_DE_OBRAS: CongelacionDeObras | undefined = undefined;'`, ver `tests/unit/obra-pagina.test.ts:1254`).
- `tests/unit/ediciones-en-venta.test.ts` — `corpusConstruido` (l.791; la Brevedad declara impresa B1 «Cátedra, 2015.» y electrónica B2), `construida('encendida'|'apagada')` memorizada (l.914), `bloqueDeEdiciones` y `seccionDondeLeer`. Asertos que cambian: l.943-946 (margen 2 ×, `h3`), l.988 (sigue: «Ediciones en venta» ausente), l.959-964 y l.966-972 (orden de enlaces y líneas: la electrónica va primero ahora). Describe 32.4 (l.1110-1163) ya prueba «encendida = apagada + bloque» en las Obras.
- `tests/unit/ayuda/construir.ts:668` `fuenteConTiendaDePrueba`, `:544` `fuenteConModeloEncendido`, `TIENDA_DE_PRUEBA`.
- `tests/e2e/ingreso-accesible.spec.ts:556-600` — el barrido de la Obra con dos ediciones (impresa X, electrónica Y) y los nombres accesibles en orden impresa→electrónica: se invierte el orden y se esperan los rótulos «Electrónica» e «Impresa».
- `tests/e2e/tipografia-calculada.spec.ts:44` — comentario que nombra el bloque «Ediciones en venta»: renombrar.
- `AGENTS.md` § «Encender la afiliación de libros» (≈l.1811-1857): párrafo inicial y pasos 3 y 4.

## Tasks & Acceptance

**Execution:**
- `src/lib/ediciones.ts` -- Añadir `claveDeTienda: string` a `EdicionEnVenta`, `GrupoDeEdiciones` y `edicionesPorFormato(ediciones, ordenDeTiendas)`: orden de formatos `electronica`, `impresa` con rótulos «Electrónica»/«Impresa»; dentro, orden estable por índice de `claveDeTienda` en `ordenDeTiendas` (orden de la ficha a igual tienda); omite grupos vacíos; lanza nombrando la clave si una no está en el orden. Comentario de cabecera: la regla y la pregunta abierta (orden de `TIENDAS` frente al de la ficha, `[ASSUMPTION]` de la épica). -- La agrupación decide en un solo sitio, puro y probado.
- `src/lib/ingreso.ts` -- `edicionesEnVenta` devuelve también `claveDeTienda`. -- La agrupación ordena por clave, no por nombre (el nombre no es único).
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- `enVenta` = `{ id, grupos: edicionesPorFormato(edicionesEnVenta(obra.ediciones, obra.nombre), TIENDAS.map((t) => t.clave)) }` solo si la afiliación se admite en la ruta, hay ediciones **y** `congelacionVigente() === undefined`. Comentario de l.124: «Dónde leer» va en toda página 1, se indexe o no; la congelación oculta las ediciones en venta, no el desplegable. Comentario de l.130-134 al día. -- AD-25.
- `src/components/DondeLeer.astro` -- `enVenta?: { id: string; grupos: readonly GrupoDeEdiciones[] }`; pintar `EdicionesEnVenta` solo con líneas cotejadas y `grupos.length > 0`; comentario al día. -- FR-54.
- `src/components/EdicionesEnVenta.astro` -- Props `{ id, grupos }`. Un `div data-ingreso` con `style` 3 × unidad arriba; dentro, por grupo, un `div` (el segundo con `margin-top` 3 × unidad), `RotuloDeGrupo` con el rótulo y la `ul` de siempre; numeración de `id` continua entre grupos. Quitar `DEL_ROTULO` y el `h3`. Comentario de cabecera al día (33.2, UX-DR127). -- UX-DR127.
- `tests/unit/ediciones.test.ts` (nuevo) -- Vitest puro de `edicionesPorFormato` con los casos de la matriz (dos formatos y dos tiendas, dos de una tienda, un formato vacío, vacío, clave desconocida). -- AC de la función pura.
- `tests/unit/ediciones-en-venta.test.ts` -- Poner al día el describe «encendida, construida»: bloque con margen 3 ×, sin `h3` ni «Ediciones en venta»; en la Brevedad, «Electrónica» con B2 y luego «Impresa» con B1, cada rótulo `p.rotulo-de-grupo` dentro del bloque y en ese orden, enlaces e `id` 1 y 2 en ese orden; en Cartas, solo «Impresa». Nuevo: fuera de `obra/`, las huellas de `dist/` de `construida('encendida')` y `construida('apagada')` son idénticas, y las páginas 2+ de Obra no llevan `data-ingreso`. Nuevo describe de la congelación: dos copias más con `src/lib/umbrales.ts` parcheado (`desde` fijo, `indexables` con la Brevedad), Modelo encendido y apagado y la tienda de prueba; ningún HTML de la encendida lleva `data-ingreso`, y cada `obra/**/index.html` es idéntico byte a byte entre las dos; «levantar» queda probado porque `construida('encendida')` es la misma copia sin congelación y pinta el bloque. Ninguna palabra «Consíguelo»/«Cómprala» en ningún HTML de la encendida. -- UX-DR147, AD-25.
- `tests/e2e/ingreso-accesible.spec.ts` -- Esperar los rótulos «Electrónica» e «Impresa» dentro del bloque y los nombres en orden electrónica→impresa; ninguna mención de «Ediciones en venta». -- NFR-9 (lo corre Héctor en local).
- `tests/e2e/tipografia-calculada.spec.ts` -- Renombrar el bloque en el comentario. -- Coherencia.
- `AGENTS.md` -- § Encender la afiliación de libros: el bloque son los grupos «Electrónica» e «Impresa» dentro de «Dónde leer esta obra», bajo «Gratis», en un único `data-ingreso`, por tienda en el orden de `TIENDAS`; con la familia congelada ninguna Página de Obra pinta ediciones aunque el Modelo esté encendido, y se conservan en la ficha; el paso 4 nombra la prueba de los dos estados (`tests/unit/ediciones-en-venta.test.ts`) junto al barrido. -- AC de documentación.

**Acceptance Criteria:**
- Given la copia encendida, when se construye, then la página 1 de la Brevedad lleva dentro del `<details>` de «Dónde leer esta obra», tras «Gratis», un único `div[data-ingreso]` con «Electrónica» y luego «Impresa», y Cartas a Lucilio solo «Impresa».
- Given las copias encendida y apagada sin congelar, when se comparan, then en cada Página de Obra quitar el bloque deja el HTML idéntico, y fuera de `obra/` los `dist/` son idénticos byte a byte.
- Given las copias congeladas encendida y apagada, when se comparan, then ninguna página lleva `data-ingreso` y cada Página de Obra es idéntica byte a byte.
- Given la Obra sin cotejo con ediciones, when se construye encendida, then no hay bloque y el build avisa «Ediciones sin edición cotejada» con la ficha.
- Given `npx astro check` y `tests/unit/tipografia-en-tokens.test.ts`, when corren, then 0 errores y verde sin excepción nueva.

## Design Notes

`RotuloDeGrupo` en vez de un `p` con `style`: la AC pide «el mismo elemento de rótulo de grupo que «Gratis»», y su hoja ya está en toda página 1 de Obra porque `DondeLeer` lo importa; apagado no cambia nada, y dentro del bloque solo cambia el `p` marcado. La congelación se resuelve en la página y no en `DondeLeer`, que no debe saber de Modelos ni de umbrales. La clave de tienda viaja en `EdicionEnVenta` porque dos tiendas pueden llamarse igual y la clave es la identidad que declara `revisarTiendas`.

**`[ASSUMPTION]` aceptada por delegación.** La pregunta abierta de la Épica 33 —si dentro de un formato las tiendas siguen el orden de `TIENDAS` o el de la ficha— se resuelve por el de `TIENDAS`, aceptado por delegación de Héctor (chat, 2026-11-14) y **pendiente de Héctor (`bmad-ux`)**: lo dice la cabecera de `edicionesPorFormato` y AGENTS.md; cambiarlo es cambiar esa función y `tests/unit/ediciones.test.ts`.

## Verification

**Commands:**
- `npx vitest run tests/unit/ediciones.test.ts` -- expected: verde.
- `npx vitest run tests/unit/ediciones-en-venta.test.ts` -- expected: verde, incluidas las cuatro variantes apagadas y las copias congeladas.
- `npx vitest run tests/unit/ingreso-construido.test.ts tests/unit/tipografia-en-tokens.test.ts tests/unit/fecha-de-cambio.test.ts tests/unit/medicion.test.ts` -- expected: verde.
- `npx astro check` -- expected: 0 errores.

## Spec Change Log

_Sin entradas: ninguna vuelta atrás por `bad_spec`._

## Review Triage Log

### 2026-11-15 — Review pass (abortada)
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Pasada abortada, no una revisión: las cinco capas son externas (orquestador v9-ralph) y esta invocación llegó sin sus hallazgos, así que no se juzgó nada. La revisión de verdad es la pasada siguiente.

### 2026-11-15 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 4 (high 0, medium 1, low 3)
- defer: 2 (high 0, medium 0, low 2)
- reject: 17 (high 0, medium 2, low 15)
- addressed_findings:
  - `[medium]` `[patch]` El orden de `TIENDAS` dentro de un formato solo se probaba en la función pura: toda copia encendida declaraba una tienda (verification-gap, blind-hunter, intent-alignment, ac-auditor). Nuevo describe en `tests/unit/ediciones-en-venta.test.ts`: copia encendida con dos tiendas con marca, `TIENDAS` al revés que la ficha; en la Brevedad y en Cartas «Impresa» sale en el orden de `TIENDAS` y los `id` siguen 1–3. Comprobado que discrimina: con `TIENDAS` invertido en la página, las dos pruebas fallan.
  - `[low]` `[patch]` `GRUPOS` no era exhaustivo: un formato nuevo de `FORMATOS_DE_EDICION` desaparecería en silencio (blind-hunter, edge-case-hunter). `edicionesPorFormato` lanza nombrando el formato sin grupo; caso nuevo en `tests/unit/ediciones.test.ts`.
  - `[low]` `[patch]` La numeración de `id` entre grupos usaba `slice`/`reduce` cuadrático y aserciones no nulas (`inicios[g]!`). `EdicionesEnVenta.astro` lleva ahora un desplazamiento acumulado por grupo; el marcado no cambia.
  - `[low]` `[patch]` El Auto Run Result decía que el barrido e2e no se había corrido; el ac-auditor lo corrió en local (12/12). Riesgos residuales y verificación puestos al día.

Rechazados, con su motivo: la línea de `sprint-status.yaml` y el estado `review` de la 32.4 y la 33.1 los escribe el cierre del bucle (las épicas se funden enteras); el registro de triaje anterior lo sustituye esta pasada; los grupos de venta sin la clase `.grupo` y el rótulo con la hoja de `RotuloDeGrupo` son lo que pide el contrato (presentación en `style`, «el mismo elemento que Gratis»); el `p.rotulo-de-grupo` sin asociar a su lista es el mismo patrón que «Gratis»; `nombreDelFormato` (minúscula en la frase) y el rótulo son textos distintos; la clave repetida en `TIENDAS` ya la rechaza `revisarTiendas`; un aviso de build cuando la congelación oculta ediciones no lo pide la intención y AGENTS.md documenta el efecto; el parche de `umbrales.ts` por texto es el de `obra-pagina.test.ts` y `congelacionVigente` no lee `desde`; «levantar» se cubre con la misma copia sin el parche; las tres Obras del corpus de prueba y la página 2 se comparan todas; los asertos de marcado, `parentPath` (Node 24, ya usado en otras pruebas), el coste del paso 4, el tránsito de 2 × a 3 × (es UX-DR127, del contrato), la tipografía calculada y la congelada sin marca (la congelación corta antes de leer marcas).

### 2026-11-15 — Review pass (segunda pasada de triaje)
- intent_gap: 0
- bad_spec: 0
- patch: 2 (high 0, medium 0, low 2)
- defer: 0
- reject: 25 (high 0, medium 0, low 25)
- addressed_findings:
  - `[low]` `[patch]` El barrido e2e citado como verificación corrió en 5715810a74, antes de los parches que renumeraron los `id`, y «los parches no cambian el marcado» se afirmaba sin repetirlo (blind-hunter, intent-alignment). Repetido en 9a71fe9d17: `npx playwright test tests/e2e/ingreso-accesible.spec.ts --project=escritorio`, 12/12 verde; la línea de verificación de la pasada anterior ya no lo da por hecho.
  - `[low]` `[patch]` La primera entrada del registro de triaje parecía una revisión con cero hallazgos y no lo era (blind-hunter). Rotulada «abortada»: la invocación llegó sin los hallazgos de las capas externas.

Rechazados, en orden de capa. **blind-hunter:** (1) el `h3` sustituido por `p.rotulo-de-grupo` sin `aria-labelledby` es lo que pide el contrato («el mismo elemento que Gratis», sin «Ediciones en venta»), y cada línea declara la afiliación; (2) `nombreDelFormato` con dos ramas está cerrado por el tipo `FormatoDeEdicion` y `edicionesPorFormato` lanza antes ante un formato sin grupo; (3) el `as FormatoDeEdicion` de `edicionesEnVenta` lee fichas que ya validó el esquema del build; (4) que la congelación oculte sin aviso no lo pide la intención y AGENTS.md lo documenta; (5) la decisión de la página se prueba con las construcciones que exige el contrato; (6) el nombre de tienda repetido ya está diferido; (7) `desde` futuro en la copia congelada: `congelacionVigente` no lo lee y es dato de prueba; (8) el parche de `umbrales.ts` por texto es el patrón de `obra-pagina.test.ts`; (9) los recuentos de `div`/`ul` son asertos de marcado deliberados; (10) los separadores de Windows: el proyecto corre en macOS y Linux; (11) e2e de la congelación y de dos tiendas: lo cubren las pruebas de `dist/`; (13) `status: done` con `followup_review_recommended: true` es el resultado que el flujo escribe, y el `baseline_revision` es el commit del plan; (15) el formato de los rechazos no cambia nada que consuma nadie; (16) dónde vive la decisión de UX ya está diferido; (17) los dos mecanismos de espaciado los fija el contrato (presentación en `style`, sin `<style>`); (18) `claveDeTienda` obligatoria: `astro check` compila todo constructor de `EdicionEnVenta`; (19) la clave repetida en el orden ya la rechaza `revisarTiendas`. **intent-alignment:** cada Obra se compara (PAGINA_1, CARTAS_1, IRA_1, PAGINA_2, según el ac-auditor); «levantar» con la misma copia sin parche es equivalente; R2 frente a R2′ es la `[ASSUMPTION]` aceptada y diferida; R3a es la letra del contrato; las precondiciones las corrió el ac-auditor (945/945); el lanzamiento y el campo nuevo son decisiones del plan. **ac-auditor:** la línea de `sprint-status.yaml` la escribe el cierre del bucle; el rótulo con la hoja de `RotuloDeGrupo` es lo que el contrato pide.

## Auto Run Result

Status: done

**Resumen.** `edicionesPorFormato` (`src/lib/ediciones.ts`) reparte las ediciones en venta en «Electrónica» y luego «Impresa», por tienda en el orden de `TIENDAS` y, a igual tienda, en el de la ficha, sin grupos vacíos, y lanza ante una clave fuera del orden. `EdicionEnVenta` lleva `claveDeTienda`. La Página de Obra compone `enVenta.grupos` solo con la afiliación admitida en la ruta, ediciones declaradas y `congelacionVigente() === undefined`. `EdicionesEnVenta.astro` pinta, dentro de un único `div[data-ingreso]` a 3 × `--unidad` de «Gratis», un `div` por grupo con `RotuloDeGrupo` y su lista (el segundo a 3 × `--unidad`), con los `id` numerados seguidos; sin `h3` ni «Ediciones en venta», sin `<style>`.

**Ficheros.**
- `src/lib/ediciones.ts` — `claveDeTienda`, `GrupoDeEdiciones`, `edicionesPorFormato` y la pregunta abierta en su cabecera.
- `src/lib/ingreso.ts` — `edicionesEnVenta` devuelve `claveDeTienda`.
- `src/pages/obra/[autor]/[slug]/[...page].astro` — la congelación oculta las ediciones; grupos con las claves de `TIENDAS`; comentarios al día.
- `src/components/DondeLeer.astro` — prop `enVenta.grupos`; comentarios al día.
- `src/components/EdicionesEnVenta.astro` — los grupos con `RotuloDeGrupo`; sin `h3` ni `DEL_ROTULO`.
- `tests/unit/ediciones.test.ts` (nuevo) — la matriz de la función pura.
- `tests/unit/ediciones-en-venta.test.ts` — grupos y orden en la Brevedad y en Cartas, sin «Consíguelo»/«Cómprala»/«Ediciones en venta», `dist/` fuera de `obra/` idéntico encendida/apagada, páginas 2+ sin `data-ingreso`, y el describe de la congelación (dos copias más).
- `tests/e2e/ingreso-accesible.spec.ts` — rótulos «Electrónica» e «Impresa» y orden electrónica→impresa.
- `tests/e2e/tipografia-calculada.spec.ts` — comentario.
- `AGENTS.md` — § Encender la afiliación de libros: grupos, orden, congelación que oculta y la prueba de los dos estados.

**Revisión (pasada 1 de triaje, 2026-11-15).** 4 parches (1 medium, 3 low), 2 diferidos (low; uno pendiente de Héctor con `bmad-ux`), 17 rechazados. Recomendación de revisión de seguimiento: `true` (0 high, 1 medium, 3 low; puntuación 3 × 1 + 3 = 6 ≥ 5).

Ficheros de los parches:
- `src/lib/ediciones.ts` — `edicionesPorFormato` lanza ante un formato sin grupo.
- `src/components/EdicionesEnVenta.astro` — numeración de `id` con desplazamiento acumulado, sin `!`.
- `tests/unit/ediciones.test.ts` — el caso del formato sin grupo.
- `tests/unit/ediciones-en-venta.test.ts` — copia encendida con dos tiendas en orden distinto del de la ficha.

**Verificación.**
- `npx vitest run tests/unit/ediciones.test.ts` — 8/8 verde.
- `npx vitest run tests/unit/ediciones-en-venta.test.ts` — 76/76 verde, con las cuatro variantes apagadas, las dos copias congeladas y la nueva de dos tiendas; con `TIENDAS` invertido en la página, las dos pruebas nuevas fallan (mutación revertida).
- `npx vitest run tests/unit/ingreso-construido.test.ts tests/unit/tipografia-en-tokens.test.ts tests/unit/fecha-de-cambio.test.ts tests/unit/medicion.test.ts tests/unit/obra-pagina.test.ts tests/unit/ediciones.test.ts` — 938/938 verde.
- `npx astro check` — 0 errores, 0 avisos.
- `npm test` — 186 ficheros, 8.173 pruebas, verde (1.259 s).
- Barrido e2e `npx playwright test tests/e2e/ingreso-accesible.spec.ts --project=escritorio` — 12/12 verde en local en la revisión (ac-auditor, HEAD 5715810a74). Tras los parches de esta pasada se repitió en la segunda pasada de triaje (abajo).

**Revisión (segunda pasada de triaje, 2026-11-15).** 2 parches (low, ambos de contabilidad del spec: el barrido e2e repetido tras los parches y la primera entrada del registro rotulada como abortada), 0 diferidos nuevos, 25 rechazados. Ningún fichero de código cambia en esta pasada; la HEAD del código sigue en 9a71fe9d17. Recomendación de revisión de seguimiento: `false` (0 high, 0 medium, 2 low; puntuación 2 < 5).

Verificación de esta pasada, sobre 9a71fe9d17:
- `npx playwright test tests/e2e/ingreso-accesible.spec.ts --project=escritorio` — 12/12 verde (1,9 min), sin servidores en escucha después.
- `npx astro check` — 0 errores, 0 avisos.
- `npm test` — 186 ficheros, 8.173 pruebas, verde (1.243 s); cubre los cuatro mandatos de vitest de § Verification.

**Riesgos residuales.** El orden por `TIENDAS` es una `[ASSUMPTION]` aceptada por delegación y pendiente de `bmad-ux` (diferido). El CI no corre el barrido e2e: repetirlo el día de encender es de Héctor (AGENTS.md, paso 4).

## Verificación previa a la fusión — 2026-11-15

Puerta de la etapa s-33 (Épica 33, historias 33.1–33.3), sobre la rama `v9/epica-33`.

- **Puesta al día.** `origin/main` (296594d2c8: verificación en vivo de la Épica 32 y `DESPLIEGUE_DE_LA_OBRA_COMO_DESTINO = '2026-11-15'`) no era antepasada de c8be6e0cfa; se fusionó sin conflictos en 49b4a3333f (solo `src/lib/umbrales.ts` y el spec de la 32.4). `npx tsx tools/autor.ts proponer-claves`: «Ninguna clave nueva»; no escribió nada. `package-lock.json` no cambia frente a la principal: sin `npm ci`.
- **Equivalente del CI** (`.github/workflows/publicar.yml`), sobre 49b4a3333f: `npm run build` verde (5.295 páginas, NFR-5 y peso dentro de los topes); `npx astro check` — 479 ficheros, 0 errores, 0 avisos, 13 sugerencias; `npm test` — 186 ficheros, 8.173 pruebas, verde (1.279 s).
- **e2e completo** (`npm run test:e2e`, los dos proyectos, receptor local en 8787): 1.471 pasadas, 177 omitidas, ninguna fallida ni inestable (7,9 min). Sin servidores en escucha después.
- **NFR-7: no aplica.** Con `TIENDAS` vacío y la afiliación apagada, la rama no cambia lo que pintan ni cargan la Página de Cita, la de Obra, la portada ni `/buscar/`. Evidencia: `diff -rq` de los dos `dist/` construidos en árboles separados (la principal en 296594d2c8 y la rama en 49b4a3333f) con `FECHA_JORNADA=2026-11-15` y `MEDICION_ENDPOINT=http://localhost:8787/` — 15.373 ficheros, todo HTML, CSS, JS, PNG, `fragment/` e `index/` de Pagefind idénticos; difieren solo los 4 `pagefind/filter/*.pf_filter`, el `pf_meta` y `pagefind-entry.json`. Los filtros de cada par tienen el mismo tamaño descomprimido y el mismo multiconjunto de bytes (reordenación interna de Pagefind), y el `pf_meta` descomprimido difiere solo en los nombres de esos filtros, que derivan de su contenido. No hay cambio de lo servido que medir con Lighthouse.
- **Vocabulario:** ni `src/lib/vocabulario.ts` ni `medicion/migrations/` cambian frente a `origin/main`.
- **Arreglos:** ninguno.

## Verificación en el sitio en vivo — 2026-11-15

Fusión c196ace7aa, Publicar (run 43671662601) en verde, «Desplegar» terminado el 2026-11-15T03:52:16Z: llegada 2026-11-15 (UTC). Comprobado con `curl` sobre https://sabiduriadebolsillo.net, sin navegador. En vivo el Modelo `afiliacion-de-libros` está apagado y `TIENDAS` vacío, así que lo que exige tiendas declaradas o el Modelo encendido (los grupos «Electrónica» e «Impresa», el orden por tienda, la congelación que oculta) queda **sin datos que enseñar**: se comprueba en las copias de las pruebas, no en el sitio.

- **33.1 — apagado no deja rastro.** `/`, `/cita/miguel-de-cervantes-cada-uno-es-hijo-de-sus-obras/`, `/obras/`, `/autores/` y `/obra/miguel-de-cervantes/don-quijote/2/` responden 200, sin `data-ingreso`, sin `rel="sponsored"` y sin ningún dominio de tienda (`amazon.`). Bien.
- **33.2 — «Dónde leer esta obra» sin ediciones en venta.** `/obra/miguel-de-cervantes/don-quijote/` responde 200 con su `<details class="desplegable">`, «Dónde leer esta obra» y el grupo «Gratis»; sin `data-ingreso`, sin rótulos de grupo «Electrónica» ni «Impresa», sin «Ediciones en venta», sin «Enlace de afiliado» y sin `rel="sponsored"`. Bien.
- **33.2 — muestra de Obras del sitemap** (una de cada 40 de las 279 rutas `/obra/` de `sitemap-0.xml`): `/obra/alberto-masferrer/el-elogio-del-silencio/`, `/obra/emilio-castelar/recuerdos-de-italia-parte-2-de-2/`, `/obra/jose-marti/la-futura-esclavitud/`, `/obra/manuel-gonzalez-prada/la-autoridad/`, `/obra/miguel-de-unamuno/la-tia-tula-1921/`, `/obra/rafael-barrett/el-porno-cinematografo/` y `/obra/rosalia-de-castro/flavio/`: todas 200 con «Dónde leer esta obra» y «Gratis», y ninguna con `data-ingreso`, «Electrónica», «Impresa», «Ediciones en venta», «Enlace de afiliado», `sponsored` ni `amazon.`. Bien.
- **33.3 — `npm run obra -- curar-primero`.** Es una orden de `tools/`, de solo lectura, que no pinta nada en `dist/`: no es observable en el sitio en vivo.

Ninguna historia de la Épica 33 pide una constante de llegada en `src/lib/umbrales.ts` ni un corte de serie: no se cambia ninguna.
