---
title: 'Historia 33.2 — Las ediciones en venta, por formato y por tienda dentro de «Dónde leer esta obra»'
type: 'feature'
created: '2026-11-15'
status: 'ready-for-dev'
baseline_revision: '5a8344601b82a920e7a39189038efc57f2f5bd5a'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-33-context.md'
warnings: ['oversized']
deferred: []
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

## Verification

**Commands:**
- `npx vitest run tests/unit/ediciones.test.ts` -- expected: verde.
- `npx vitest run tests/unit/ediciones-en-venta.test.ts` -- expected: verde, incluidas las cuatro variantes apagadas y las copias congeladas.
- `npx vitest run tests/unit/ingreso-construido.test.ts tests/unit/tipografia-en-tokens.test.ts tests/unit/fecha-de-cambio.test.ts tests/unit/medicion.test.ts` -- expected: verde.
- `npx astro check` -- expected: 0 errores.
