---
title: 'Historia 17.5 — Un Modelo se admite por ruta, y el tope de guion se mide donde se admite'
type: 'feature'
created: '2026-10-10'
status: 'in-progress'
baseline_revision: 'c9aa9b8296e36062b81216c162b705c47e677849'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-17-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** `src/lib/ingreso.ts` declara qué superficie admite cada Modelo por el **fichero** de página (`modelosEn('index.astro')`). Un mismo fichero genera rutas de distinto carácter: el listado de Autor da la página 1 (producto) y las 2+ (servicio por forma). Admitir un Modelo en ese fichero lo colaría en las 2+. Además, el tope de guion en línea solo se mide en la Página de Cita, y la prueba de `dist/` juzga la marca por fichero y no por ruta. Hoy los cuatro Modelos están apagados.

**Approach:** La admisión se expresa y se consulta **por ruta**, con el mismo predicado de `src/lib/superficies.ts` (`superficieDeclaradaDe` y `caracterDe`). Una ruta que es servicio **por forma** —las 2+ de un listado, es decir, `noPublicableEn`— nunca admite un Modelo. La afiliación de libros solo puede admitirse en la Página de Obra. El tope de guion se mide en cada superficie que admite un Modelo, y la prueba de `dist/` juzga cada ruta.

## Boundaries & Constraints

**Always:**
- **API** (`src/lib/ingreso.ts`):
  - `modelosEnRuta(ruta)` devuelve los Modelos encendidos **y** admitidos en la superficie declarada de esa ruta, y ninguno si esa ruta es servicio por forma;
  - las páginas que hoy llaman a `modelosEn('<fichero>')` (portada, `/buscar`, `/404`) pasan a `modelosEnRuta(<su ruta>)`;
  - `modelosEn(pagina)` se elimina, o queda como interno, sin consumidores en páginas.
- `admitidoEn` sigue nombrando superficies por su identidad declarada en `superficies.ts`.
- `revisarDeclaracionDeIngreso` rechaza:
  - una superficie que no existe (como hoy);
  - un Modelo vedado en lectura (como hoy);
  - la afiliación (`afiliacion-libros`, o su id real) admitida en cualquier superficie que no sea la Página de Obra. Hoy no existe ninguna Página de Obra, así que no la admite ninguna. La regla se escribe con la identidad que tendrá (`obra/…`) y la prueba la ejercita con una declaración inventada.
- La restricción es **solo de forma**. Lo que la 22.4 declare servicio por contenido (`noindex` de una Obra que repite otra) no restringe ninguna admisión. Escríbelo en el comentario.
- **Tope de guion:** una prueba construye el sitio con **todos** los Modelos encendidos en las superficies que hoy los admiten. Usa la técnica de copia temporal parcheada de `tests/e2e/ingreso-accesible.spec.ts` o de `ingreso-construido.test.ts`, nunca el árbol (AD-21). Mide el guion en línea de cada ruta que lleva un `data-ingreso` frente a `MAX_BYTES_DE_GUION`.
- **`tests/unit/ingreso-construido.test.ts`:** lo marcado con `data-ingreso` en cada **ruta** de `dist/` tiene que estar encendido y admitido **en esa ruta** (`modelosEnRuta`), no en su fichero. Prueba de que una página 2+ de un listado cuyo fichero admitiera un Modelo no lo lleva.
- La lista de obras de la Página de Autor (17.3) no existe todavía. Su condición «no aloja ningún Modelo» queda como regla en la declaración: ningún Modelo puede admitir `autor/[slug]/[...page].astro`. Se rechaza y se prueba.
- `dist/` del sitio real, con todo apagado, idéntico al de la base.
- AGENTS.md, en «Encender un Modelo de Ingreso»: la admisión es por ruta y las 2+ quedan excluidas por forma.

**Block If:** nada.

**Never:**
- Encender un Modelo.
- Admitir un Modelo nuevo en ninguna superficie real.
- Tocar `DESPLIEGUE.md` §4 más allá de una frase si cambia el nombre de una función.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Portada | `modelosEnRuta('/')` con las donaciones encendidas | [donaciones] | — |
| Página 2+ | declaración inventada que admite donaciones en el listado de Tema, y la ruta `/tema/x/2/` | [] | — |
| Página 1 | la misma declaración, y la ruta `/tema/x/` | [donaciones] | — |
| Afiliación fuera de Obra | declaración inventada con afiliación en `index.astro` | `revisarDeclaracionDeIngreso` da un fallo | — |
| Afiliación en Obra | declaración inventada en `obra/[autor]/[obra].astro` | sin fallo por esta regla | — |
| Autor | cualquier Modelo admitido en el listado de Autor | fallo | — |
| Tope | todo encendido en las superficies admitidas | cada ruta con `data-ingreso` < `MAX_BYTES_DE_GUION` | — |
| `dist/` real | todo apagado | idéntico a la base | — |

</intent-contract>

## Code Map

- `src/lib/ingreso.ts` -- `Modelo.admitidoEn` (l.106), `SUPERFICIES_DE_LECTURA` (l.140), `MODELOS_VEDADOS_EN_LECTURA` (l.168), `MODELOS` (l.179), `modelosEn` (l.296), `modelosMarcadosEn` (l.314) y `revisarDeclaracionDeIngreso` (l.331).
- `src/lib/superficies.ts` -- `SUPERFICIES` (`pagina` y `noPublicableEn`, l.42-145), `caracterDe` (l.315) y `superficieDeclaradaDe`.
- Llamadas a `modelosEn`: `grep -rn "modelosEn(" src`, que serán la portada, `buscar.astro`, `404.astro` y quizá `Sostener.astro`.
- `src/lib/umbrales.ts:100` -- `MAX_BYTES_DE_GUION`.
- `tests/unit/ingreso-construido.test.ts` -- l.255, la juzga por fichero (`superficie.pagina`).
- `tests/unit/ingreso.test.ts` (o el nombre que tenga) -- las pruebas de la declaración.
- `tests/unit/medicion.test.ts` -- el patrón de medición del guion en línea.
- `tests/e2e/ingreso-accesible.spec.ts` -- el sitio parcheado en una copia temporal.

## Tasks & Acceptance

**Execution:**
- `src/lib/ingreso.ts` -- `modelosEnRuta` y las reglas nuevas.
- Las páginas consumidoras.
- `tests/unit/ingreso*.test.ts` -- cada fila de la matriz y la medición del tope con todo encendido.
- `AGENTS.md`.

**Acceptance Criteria:**
- Given `npx vitest run tests/unit/ingreso*.test.ts`, `npx astro check` y `npm run build`, when corren, then pasan y `dist/` no cambia.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npx vitest run tests/unit/ingreso-construido.test.ts` (y el resto de `tests/unit/ingreso*.test.ts`) -- expected: verde
- `npx astro check` -- expected: 0 errores
- `npm run build` -- expected: código 0
