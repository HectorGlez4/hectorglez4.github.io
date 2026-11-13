---
title: 'Historia 26.12 — El peso y el interlineado salen de sus tokens'
type: 'refactor'
created: '2026-10-31'
status: 'done'
review_loop_iteration: 0
baseline_commit: '45d278a3c7216dee7fc5c76cbb079f5bb0ef7dbd'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-26-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** el peso y el interlineado de la letra se escriben como literales en 26 ficheros de `src/` (30 `font-weight`, 36 `line-height`), aunque `DESIGN.md` los declara por rol y la convención prohíbe tipografía literal en un componente (espina v8.5, «Estilos»). Además, que el peso juzgado de `dist/` no dependa de la jornada nunca se ha probado sobre una construcción real: la 24.2 lo aplazó porque entonces fallaba.

**Approach:** `tokens.css` declara `--peso-regular`, `--peso-fuerte` y un `--interlineado-<tamaño>` por rol, y cada literal pasa al token del rol cuyo cuerpo usa, sin cambiar ningún valor calculado; una prueba de Vitest prohíbe los literales con la excepción nombrada. Otra prueba construye dos veces el mismo commit en jornadas distintas y exige que todo lo juzgado sea idéntico byte a byte.

## Boundaries & Constraints

**Always:** los valores calculados no cambian (mismo peso, mismo interlineado en cada elemento); el interlineado es el del token del cuerpo que la regla usa, salvo las excepciones de `DESIGN.md` § Typography: `FilaDeBloque` (`.fila-de-bloque a`), `ListaDeObras` (`.titulo`) y `TarjetaDeObra` (`.titulo`) toman `--interlineado-autor`; `LetrasDeSalto` (`a`) conserva `line-height: 1` literal, la única excepción, nombrada por fichero y selector en la prueba. Los estilos en atributo de `EdicionesEnVenta.astro` también usan los tokens (sigue sin `<style>`: AGENTS.md, «Encender un Modelo de Ingreso»). Las pruebas que hoy afirman literales (`tarjeta-de-obra`, `tarjeta-de-cita`, `obra-pagina`) pasan a afirmar el token.

**Ask First:** cualquier literal que no case con el token de su cuerpo y no sea una de las cuatro excepciones (lo decide Héctor con `bmad-ux`); que la prueba de dos jornadas falle, es decir, que algún fichero fuera de `FICHEROS_QUE_ROTAN_CON_LA_JORNADA` cambie entre jornadas: se para, se nombran los ficheros y no se toca `tools/lib/peso.ts` ni la lista para hacerla pasar.

**Never:** tocar el lienzo rasterizado (`src/lib/tarjeta.ts`, `src/lib/pieza.ts`, `src/lib/lienzo.ts`, `public/islas/imagen.js`), que usa atributos SVG o canvas y no propiedades de CSS; añadir tokens de espaciado entre letras; cambiar un valor de `DESIGN.md` o de un tamaño; tocar `src/lib/vocabulario.ts`, `umbrales.ts` o la medición.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Literal nuevo | un `<style>` o un atributo `style` con `font-weight: 700` o `line-height: 1.3` | la prueba falla nombrando fichero y declaración | N/A |
| Atajo `font` | `font: 600 15px/1.4 var(--sans)` | la prueba falla igual | N/A |
| Excepción | `line-height: 1` en `LetrasDeSalto.astro`, selector `a` | admitida | cualquier otro `1` falla |
| Token | `font-weight: var(--peso-fuerte)`, `line-height: var(--interlineado-pie)` | admitido | un `var()` a un token inexistente falla |
| Dos jornadas | mismo commit, dos `FECHA_JORNADA` con distinta Cita del Día | fuera de lo que rota, todo `dist/` idéntico byte a byte salvo los ficheros de índice de `pagefind/`, que se descomprimen y son iguales con su orden normalizado (Héctor, 2026-10-31: Pagefind 1.5.2 no es determinista ni en el mismo día) | lista los ficheros o las entradas del índice que cambian |

</frozen-after-approval>

## Code Map

- `src/styles/tokens.css` -- `:root`, bloque «Tipografía» (l. 30–53): añadir los dos pesos y once interlineados junto a los tamaños; `body` (l. 114) usa `line-height: 1.65` → `--interlineado-cuerpo-lg`.
- Literales a migrar (todos casan con el token de su `font-size` en el mismo bloque, medido el 2026-10-31): `Rotulo`, `BloqueDeCita` (también dentro de `@media`), `FilaDeAutor`, `TarjetaDeCita`, `Atribucion`, `Fuente`, `Paginacion`, `DondeLeer`, `Busqueda`, `Armazon`, `CitaDelDia` en `src/components/`; `index`, `404`, `autores`, `obras`, `buscar`, `tema/[slug]/[...page]`, `autor/[slug]/[...page]`, `coleccion/[slug]/[...page]`, `obra/[autor]/[slug]/[...page]` en `src/pages/`. Pesos: solo 400 y 600.
- Excepciones: `FilaDeBloque.astro:72`, `ListaDeObras.astro:108`, `TarjetaDeObra.astro:144` (1.4 → `--interlineado-autor`); `LetrasDeSalto.astro:63` (1, se queda).
- `src/components/EdicionesEnVenta.astro:59–77` -- `DEL_ROTULO` y `DE_LA_LINEA`, cadenas `style`: `font-weight: 600`, `line-height: 1.5` (cuerpo `--pie`).
- `tests/unit/lista-de-obras.test.ts:90` -- patrón de prueba «el componente no lleva literales» que se generaliza.
- `tests/unit/tarjeta-de-obra.test.ts:357–428`, `tests/unit/tarjeta-de-cita.test.ts:285`, `tests/unit/obra-pagina.test.ts:835` -- afirman literales; pasan a tokens.
- `tests/unit/peso-construido.test.ts` -- `CORPUS` (dos Citas aptas), `huellaDe`, `SIN_ACTIONS`, `construirConCorpus({ conNpmRunBuild, jornada })`: base de la prueba de dos jornadas.
- `tools/lib/peso.ts:38` -- `FICHEROS_QUE_ROTAN_CON_LA_JORNADA`, solo lectura.

## Tasks & Acceptance

**Execution:**
- [x] `src/styles/tokens.css` -- declarar `--peso-regular: 400`, `--peso-fuerte: 600` y `--interlineado-{cita-xl,cita-lg,cita-md,cita-sm,titular-md,titular-sm,titular-obra,cuerpo-lg,cuerpo-md,autor,pie}` con los valores de `DESIGN.md`; `body` usa su token.
- [x] los 22 ficheros con literales y `EdicionesEnVenta.astro` -- sustituir cada literal por su token (excepciones arriba) -- sin cambiar ningún valor.
- [x] `tests/unit/tipografia-en-tokens.test.ts` (nuevo) -- recorrer `src/**/*.astro` y `src/styles/*.css` salvo `tokens.css`, `<style>` y cadenas `style`, rechazar `font-weight`/`line-height` (también en `font`) que no sean `var(--peso-…)`/`var(--interlineado-…)` de un token declarado en `tokens.css`; admitir solo la excepción nombrada; probar la matriz con fuentes sintéticas además del árbol.
- [x] `tests/unit/tarjeta-de-obra.test.ts`, `tarjeta-de-cita.test.ts`, `obra-pagina.test.ts` -- afirmar los tokens en lugar de los literales.
- [x] `tests/unit/peso-construido.test.ts` -- nuevo `describe` «Historia 26.12 — dos jornadas, la misma medida»: dos construcciones con `conNpmRunBuild` en jornadas cuya Cita del Día difiera (se comprueba que `index.html` cambia); fuera de lo que rota, huellas iguales salvo el índice de `pagefind/` (`pagefind-entry.json`, `*.pf_meta`, `*.pf_filter`, `*.pf_index`, `*.pf_fragment`), que se compara descodificado —gzip, cabecera `pagefind_dcd` y CBOR, con un descodificador mínimo en `tests/unit/ayuda/` si no hay dependencia— con mapas y listas en orden normalizado y sin los hashes de los nombres; si falla, nombra cada fichero o entrada. El `juzgado` del paso puede variar los pocos bytes de recomprimir ese índice, y no se compara.
- [x] `tests/e2e/tipografia-calculada.spec.ts` (nuevo, local) -- en portada, una Página de Cita, una de Obra, una de Autor, `/autores/` y `/obras/`, recoger por ruta de clases el `fontWeight` y `lineHeight/fontSize` calculados de cada elemento con texto y compararlo con una instantánea JSON grabada desde la principal antes de migrar.

**Acceptance Criteria:**
- Given el sitio construido en la principal y en la rama, when corre `tipografia-calculada.spec.ts`, then ninguna instantánea cambia.
- Given el árbol migrado, when se busca `font-weight:` o `line-height:` con número fuera de `tokens.css`, then solo queda el de `LetrasDeSalto.astro`.

## Spec Change Log

- 2026-10-31, durante la implementación (Ask First): la prueba de dos jornadas falló porque Pagefind 1.5.2 escribe en distinto orden los filtros de `pf_meta` y los valores del filtro `tipo` en cada construcción, también en dos del mismo día y el mismo commit (los nombres con hash cambian y lo juzgado varía ±1 byte). Héctor decidió comparar el índice de `pagefind/` descodificado y con su orden normalizado, y el resto de `dist/` byte a byte. Evita una prueba siempre roja por algo que no es la jornada y conserva lo que la 24.2 quería saber: que la jornada no cambia el contenido de nada juzgado. KEEP: la migración, la guardia de literales y las instantáneas de Playwright, que pasaron. Queda para `bmad-create-epics-and-stories`: el criterio de la 26.12 en `epics.md` dice «idéntica byte a byte».

## Design Notes

La instantánea de Playwright se graba en la principal (`--update-snapshots`) antes del primer cambio de CSS y se commitea con la historia: así «antes y después» queda en el repositorio y no en la memoria de quien migra. La clave por ruta de clases (no por texto) hace que el contenido del Corpus no la mueva.

## Verification

**Commands:**
- `npx vitest run tests/unit/tipografia-en-tokens.test.ts tests/unit/tarjeta-de-obra.test.ts tests/unit/tarjeta-de-cita.test.ts tests/unit/obra-pagina.test.ts tests/unit/lista-de-obras.test.ts` -- expected: verde.
- `npx vitest run tests/unit/peso-construido.test.ts` -- expected: verde, con el describe nuevo.
- `npx astro check` -- expected: 0 errores.
- `npx playwright test tests/e2e/tipografia-calculada.spec.ts --project=escritorio` -- expected: instantáneas sin cambios.
- `npm run build` -- expected: termina, con las cinco líneas del peso.

## Suggested Review Order

**Los tokens**

- Entrada: dos pesos y once interlineados, con los valores de DESIGN.md.
  [`tokens.css:64`](../../src/styles/tokens.css#L64)

- El body ya toma su interlineado del token de su cuerpo.
  [`tokens.css:138`](../../src/styles/tokens.css#L138)

**Las excepciones de DESIGN.md**

- Letras de salto: el único literal que queda, nombrado.
  [`LetrasDeSalto.astro:68`](../../src/components/LetrasDeSalto.astro#L68)

- Filas y títulos de Obra a 1,4 con `--interlineado-autor`, comentado.
  [`FilaDeBloque.astro:77`](../../src/components/FilaDeBloque.astro#L77)

- Igual en la Lista de Obras y la Tarjeta de Obra.
  [`ListaDeObras.astro:113`](../../src/components/ListaDeObras.astro#L113)

**La migración**

- El Bloque de Cita: cada tramo con el interlineado de su cuerpo, también en `@media`.
  [`BloqueDeCita.astro:72`](../../src/components/BloqueDeCita.astro#L72)

- Cadenas `style` del Modelo apagado, sin `<style>` para no emitir nada.
  [`EdicionesEnVenta.astro:64`](../../src/components/EdicionesEnVenta.astro#L64)

**La guardia**

- Qué se rechaza y qué excepción se admite, por fichero y selector.
  [`tipografia-en-tokens.test.ts:98`](../../tests/unit/tipografia-en-tokens.test.ts#L98)

- Emparejamiento: el interlineado sigue al cuerpo de la misma regla.
  [`tipografia-en-tokens.test.ts:162`](../../tests/unit/tipografia-en-tokens.test.ts#L162)

- Qué ficheros vigila y por qué el lienzo queda fuera.
  [`tipografia-en-tokens.test.ts:212`](../../tests/unit/tipografia-en-tokens.test.ts#L212)

**Las dos jornadas**

- El índice de Pagefind se descodifica y solo se normaliza lo que Pagefind baraja.
  [`indice-de-pagefind.ts:189`](../../tests/unit/ayuda/indice-de-pagefind.ts#L189)

- Dos jornadas y un testigo con otra Cita; veredicto del paso comparado.
  [`peso-construido.test.ts:392`](../../tests/unit/peso-construido.test.ts#L392)

**Periféricos**

- Instantáneas de peso e interlineado calculados, grabadas desde el commit base.
  [`tipografia-calculada.spec.ts:76`](../../tests/e2e/tipografia-calculada.spec.ts#L76)

- La convención en AGENTS.md, con sus excepciones y su prueba.
  [`AGENTS.md:34`](../../AGENTS.md#L34)

## Riesgos tras la revisión

- En la pasada entera de `tipografia-calculada.spec.ts` y `busqueda.spec.ts` (210 pruebas, 2026-10-31) fallaron por tiempo `buscar-con-resultados` (móvil) y «el fragmento de una tarjeta del pie» (escritorio, de la 24.6); repetidas solas pasaron (3 de 3 y 1 de 1). Las dos esperan resultados de Pagefind bajo carga.
- No hay instantánea del tramo `sm`: ninguna Cita del Corpus pasa de 240 caracteres; su token se mide en el `md` móvil.
