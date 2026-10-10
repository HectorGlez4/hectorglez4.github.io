---
title: '22.9 — Las ediciones en venta, construidas y apagadas'
type: 'feature'
created: '2026-10-10'
status: 'done'
baseline_revision: '644823d258803a3373023b3e91d3c119eff059ba'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-22-context.md'
  - '{project-root}/AGENTS.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Declarar ediciones con el Modelo apagado cambia el fichero de la ficha, y con él el `lastmod` de la Página de Obra en el sitemap.
    evidence: |-
      La relación AD-27 fecha por fichero, no por campo. El HTML de todas las páginas sí es idéntico (probado), pero `dist/sitemap-0.xml` cambiaría en el repositorio real. Solo ocurre cuando Héctor declare la primera edición, presumiblemente al encender.
    location: >-
      tools/lib/cambios.ts relacionDeSuperficies, integraciones/historial.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** El Modelo «Afiliación de libros» está declarado y apagado, pero no hay dónde declarar una edición en venta ni nada que la pinte: el día que Héctor solicite la cuenta tendría que construirse todo con el reloj de 3 ventas en 180 días ya en marcha.

**Approach:** Dejar construido y apagado todo el camino: un conjunto cerrado de tiendas en `src/lib/ingreso.ts` (que el repositorio versiona **vacío**: ninguna marca de afiliado se escribe hasta que Héctor declare la primera), el campo `ediciones` de la ficha juzgado por el esquema, una función pura que compone la URL con la marca, la admisión de la afiliación en la Página de Obra (página 1), el bloque «Ediciones en venta» bajo la edición cotejada, y la orden con la que Héctor declarará ediciones.

## Boundaries & Constraints

**Always:**
- Tiendas (FR-35, AD-20): `TIENDAS` en `src/lib/ingreso.ts`, conjunto cerrado de `{ clave, nombre, dominio, parametro, marca }` (p. ej. `nombre: 'Amazon México'`, `dominio: 'amazon.com.mx'`, `parametro: 'tag'`). En el repositorio queda **vacío** (`[]`): la primera tienda —con su marca— la declara Héctor (las marcas quedan visibles en un repositorio público; ningún agente escribe una). No usar la clave `id:` en las tiendas (los parches de prueba cortan el tramo de un Modelo en el siguiente `id: '`). `ingreso.ts` sigue importando solo `./superficies.ts` y `./umbrales.ts` y sin E/S.
- Esquema (AD-1, AD-20): `ediciones` opcional en `obraAdmisible`: lista no vacía de `{ tienda, formato: 'impresa' | 'electronica', url, descripcion? }`; `tienda` es una `clave` del conjunto; `url` `https://` cuyo host es el `dominio` de esa tienda o un subdominio suyo; se rechaza la URL que ya trae el `parametro` de marca de la tienda; descripción recortada, 1 a `MAX_CARACTERES_NOTA_DE_OBRA` puntos de código, sin saltos. Rige **encendido o apagado**. Mensaje de claves de la ficha al día. El campo viaja como `nota`: `FichaDeObra` → `aplanarFichaDeObra` → `ObraResuelta`; `yamlDeFicha` y `datosDeFicha` lo conservan; `reunir` conserva el de la destino y no hereda el de la absorbida, y lo dice.
- Función pura `urlDeEdicion(edicion, tienda)` que añade `parametro=marca` a la URL (respetando una consulta existente); se usa en el build.
- Admisión: `admitidoEn` de la afiliación = `['obra/[autor]/[slug]/[...page].astro']`; por forma, `/obra/a/b/` sí (también sin indexar) y `/obra/a/b/2/` no (ya lo da `modelosEnRuta`). `revisarDeclaracionDeIngreso` sigue rechazándola en cualquier otra superficie. Encender la afiliación exige al menos una tienda declarada (en lugar del `destino` único, que este Modelo no tiene); el resto de Modelos encendidos sigue exigiendo `destino`.
- Marcado (UX-DR43, `EXPERIENCE.md:154-160`, maqueta `mockups/pagina-de-obra.html:396-404`): la Página de Obra pregunta `modelosEnRuta(ruta)`; con la afiliación admitida y encendida, la Obra con ediciones **y** al menos una línea de edición cotejada pinta, dentro de `section.donde-leer` y tras la parte cotejada, un único `<div data-ingreso="afiliacion-de-libros">` (nunca `aside`) con `h3` «Ediciones en venta» y una lista en el orden de la ficha: enlace «Edición {impresa|electrónica} en {nombre de la tienda}» con `href` = `urlDeEdicion`, `rel="sponsored noopener"`, `target="_blank"`, «(se abre en una pestaña nueva)» oculto dentro del enlace, `aria-describedby` a «Enlace de afiliado: si compras, el sitio recibe una comisión sin coste para ti.»; tras el enlace «: {descripción}.» o «.». Presentación solo en atributos `style` con tokens (ningún `<style>` en el componente nuevo, que no importa `ingreso.ts`; la decisión llega por props). 16 px (2 × `--unidad`) sobre el bloque y 8 px entre ediciones.
- Sin edición cotejada (estado c), las ediciones no se pintan, encendido o apagado, y el build **avisa** (no rompe) nombrando la ficha: la edición en venta nunca va sola (FR-54).
- Apagado: `dist/` idéntico con y sin ediciones declaradas: ni rótulo, ni línea, ni hueco, ni contenedor, ni regla CSS.
- Orden `npm run obra -- edicion <ficha> <tienda> <impresa|electronica> <url> [--descripcion "<texto>"]` (`tools/obra.ts` + `tools/lib/obras.ts`): añade una edición a la ficha validando con el esquema; rechaza con código 1 y sin escribir si `congelacionVigente()` existe (SM-11), si la tienda no es del conjunto o si el esquema la rechaza; código 2 la forma de la invocación. Hoy, con el conjunto vacío, toda tienda se rechaza.
- `npm run ingreso` sigue diciendo que el Umbral de la afiliación dispara **solicitar** la cuenta; además dice cuántas tiendas hay declaradas («ninguna tienda declarada» hoy).

**Block If:** Escribir una marca de afiliado real o una tienda en el árbol: no se hace; si alguna prueba o paso lo exigiera, HALT.

**Never:** No encender el Modelo ni declarar ediciones o tiendas en el árbol (las pruebas usan copias temporales, AD-21). No `aside`. No pintar ediciones en páginas 2+ ni sin edición cotejada. No leer `procedencia.obra` fuera de `src/lib/obras.ts`/`admision.ts`. No `<style>` en el componente del Modelo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| URL de otro dominio | tienda `amazon.com.mx`, url `https://ejemplo.org/x` | el esquema rechaza, nombrando la ficha | build roto |
| URL con marca | url con `?tag=otro-21` | el esquema rechaza | build roto |
| Tienda fuera del conjunto | `tienda: libreria` | el esquema rechaza | build roto |
| Composición | url `https://www.amazon.com.mx/dp/X?th=1`, marca `m-21` | `…/dp/X?th=1&tag=m-21` | — |
| Encendido, con cotejada | ficha con 2 ediciones | bloque con 2 `li`, `rel`, `target`, `aria-describedby` válidos | — |
| Encendido, página 2 | `/obra/a/b/2/` | sin bloque ni `data-ingreso` | — |
| Encendido, Obra noindex | página 1 | bloque presente | — |
| Sin cotejada | estado c con ediciones | sin bloque, aviso en el build | — |
| Apagado | con y sin ediciones | `dist/` byte a byte igual | — |
| Orden con congelación | `CONGELACION_DE_OBRAS` declarada | código 1, nada escrito | — |
| Orden, tienda desconocida | conjunto vacío | código 1, nada escrito | — |

</intent-contract>

## Code Map

- `src/lib/ingreso.ts` -- Modelo `afiliacion-de-libros` (l.260-283: `encendido: false`, `dispara: 'solicita'`, `admitidoEn: []`, sin `destino`); `SUPERFICIES_DE_LECTURA` (l.152), `esPaginaDeObra` (l.211), `modelosEnRuta` (l.371), `revisarDeclaracionDeIngreso` (l.431-580; afiliación fuera de Obra l.515, destino obligatorio de encendidos l.548-576), carga con `throw` (l.624).
- `src/components/Sostener.astro` -- patrón del componente de Modelo: props primitivas, `data-ingreso`, estilos `string[].join('; ')` con tokens, `SOLO_PARA_LECTORES` en línea.
- `src/components/DondeLeer.astro` y `dondeLeer` (`src/lib/obras.ts:~1020`, `ResumenDondeLeer`) -- el bloque va dentro de la rama con líneas, tras la parte cotejada.
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- `getStaticPaths` pasa `dondeLeer` solo a la página 1; aquí la consulta `modelosEnRuta`.
- `src/lib/admision.ts:537-620` (`obraAdmisible`, `.strict()`, mensaje de claves, refines de `nota`), `src/lib/obras.ts` (`FichaDeObra`, `ObraResuelta`, `resolverObras`, `avisosDeObras` l.408), `src/lib/publicado.ts:751` (`aplanarFichaDeObra`), `integraciones/obras.ts:110` (avisos).
- `tools/lib/corpus.ts:606` (`yamlDeFicha`), `reescribirFichaDeObra`; `tools/lib/obras.ts` (`datosDeFicha` l.482, `reunirFichas` l.556, `titularFicha` l.732 como modelo de la orden; `congelacionVigente` en `src/lib/obras.ts`); `tools/obra.ts` (`switch`, `exactamente`, `terminar`).
- `tools/lib/ingresos.ts:268, 366` -- aviso «solicitar» y `lineasDelInforme`.
- Pruebas: `tests/unit/ingreso.test.ts` (fija hoy `admitidoEn: []` l.613, sin destino l.252, dos importaciones l.186, «ninguna superficie de lectura admite» l.200), `tests/unit/ingreso-construido.test.ts` (14.1 l.256, sin `<style>` l.319, censo de consultores = 3 páginas l.455, tope de guion 17.5 l.720-783 con su `CORPUS` sin ficha con ediciones), `tests/unit/ayuda/construir.ts` (`construirConCorpus` con `ficheros`, `fuenteConModeloEncendido` l.501, `tramoDelModelo`), `tests/unit/obra-pagina.test.ts` (bloque 22.6 como plantilla de ficha YAML; parcheo de `src/lib/umbrales.ts`), `tests/e2e/ingreso-accesible.spec.ts` (barre portada, buscar y 404; hay que añadir la Página de Obra con la afiliación encendida y una tienda ficticia en la copia).

## Tasks & Acceptance

**Execution:**
- `src/lib/ingreso.ts` -- `TIENDAS` vacío, tipo `Tienda`, `urlDeEdicion`, admisión en la Obra, regla de encendido por tiendas.
- `src/lib/admision.ts`, `src/lib/obras.ts`, `src/lib/publicado.ts`, `integraciones/obras.ts` -- campo `ediciones`, su viaje y el aviso sin cotejada.
- `src/components/EdicionesEnVenta.astro` (nuevo), `src/components/DondeLeer.astro`, la página de Obra -- el bloque.
- `tools/lib/corpus.ts`, `tools/lib/obras.ts`, `tools/obra.ts` -- conservación del campo y la orden `edicion`.
- `tools/lib/ingresos.ts` -- tiendas declaradas en el informe.
- Pruebas -- cada fila de la matriz (con una tienda ficticia en copia temporal); `ingreso.test.ts` y `ingreso-construido.test.ts` al día (censo de consultores con la Obra, tope de guion medido en una Obra con ediciones); `dist/` idéntico apagado con y sin ediciones; e2e de accesibilidad de la Obra encendida.
- `AGENTS.md` -- en «Encender un Modelo de Ingreso», la afiliación: declarar la primera tienda con su marca (Héctor), la orden `edicion`, y que encender exige tienda en vez de `destino`.

**Acceptance Criteria:**
- Given `npx vitest run` de los ficheros tocados, `npx astro check` y `npm run build`, when corren, then pasan, y `dist/` no contiene ningún `data-ingreso`.
- Given `npx playwright test tests/e2e/ingreso-accesible.spec.ts --project=escritorio`, when corre, then pasa también sobre la Página de Obra con ediciones.
- Given el repositorio al cerrar, when se mira, then `TIENDAS` está vacío, el Modelo apagado y ninguna ficha declara `ediciones`; `npm run ingreso` dice «solicitar» y «ninguna tienda declarada».

## Design Notes

**Por qué el conjunto de tiendas queda vacío.** La historia exige avisar a Héctor antes de escribir la primera marca, y AGENTS.md añade que qué edición se enlaza «se decide con la cuenta delante». Un conjunto vacío construye todo el camino —esquema, composición, admisión, marcado, orden— sin publicar ninguna marca: declarar la primera tienda es el cambio declarado de FR-35 que hará Héctor, y hasta entonces el esquema rechaza cualquier edición, así que «ninguna ficha declara ediciones» lo garantiza el propio esquema.

## Verification

**Commands:**
- `npx vitest run tests/unit/ingreso.test.ts tests/unit/ingreso-construido.test.ts tests/unit/obra-pagina.test.ts tests/unit/obra-cli.test.ts` (y los nuevos) -- expected: verde.
- `npx astro check` -- expected: 0 errores.
- `npm run build` -- expected: termina; `grep -rl 'data-ingreso' dist | wc -l` = 0.
- `npx playwright test tests/e2e/ingreso-accesible.spec.ts --project=escritorio` -- expected: verde.
- `npm run ingreso` -- expected: «solicitar» y «ninguna tienda declarada».

## Auto Run Result

**Resumen:** la afiliación de libros queda construida y apagada: `TIENDAS` en `src/lib/ingreso.ts` (vacío en el repositorio: ninguna marca escrita), `urlDeEdicion` pura, el campo `ediciones` juzgado por el esquema (tienda del conjunto, dominio de la tienda, sin marca ni puerto), la admisión en la página 1 de la Página de Obra (encender exige al menos una tienda), el bloque «Ediciones en venta» bajo la edición cotejada en un único `data-ingreso`, el aviso de ediciones sin cotejada y las órdenes `npm run obra -- edicion` (rechaza con congelación) y `quitar-edicion`.

**Ficheros:** `src/lib/ingreso.ts`, `src/lib/ediciones.ts` (nuevo), `src/lib/admision.ts`, `src/lib/obras.ts`, `src/lib/publicado.ts`, `integraciones/obras.ts`, `src/components/EdicionesEnVenta.astro` (nuevo), `src/components/DondeLeer.astro`, la página de Obra, `tools/lib/corpus.ts`, `tools/lib/obras.ts`, `tools/obra.ts`, `tools/lib/ingresos.ts`, `tools/ingreso.ts`, pruebas (`ediciones-en-venta.test.ts` nueva; `ingreso`, `ingreso-construido`, `obras`, `obra-pagina`, `ayuda/construir.ts`, e2e `ingreso-accesible`) y `AGENTS.md`.

**Revisión:** 15 patches (4 medios, 11 bajos), 1 deferido, 9 rechazados.

**Revisión de seguimiento:** `true` — parcheados alto 0, medio 4, bajo 11; puntuación 3 × 4 + 11 = 23 ≥ 5.

**Verificación:** 12 ficheros de prueba tocados, 436/436 (y 285/285 en mi repaso de cinco de ellos); `npx astro check` 0 errores; `npm run build` termina y `dist/` no contiene ningún `data-ingreso` (idéntico al de la base); `npx playwright test tests/e2e/ingreso-accesible.spec.ts --project=escritorio` 12/12; `npm run ingreso` dice «dispara la SOLICITUD» y «ninguna tienda declarada». La suite completa la corre el CI en el push.

**Riesgos:** `src/lib/admision.ts` importa `ingreso.ts`, así que una declaración de Modelos inválida para también las órdenes que cargan el esquema; con `TIENDAS` vacío una ficha con `ediciones` no se deja leer (correcto hoy); quitar una edición no consulta la congelación (no expone nada nuevo).

