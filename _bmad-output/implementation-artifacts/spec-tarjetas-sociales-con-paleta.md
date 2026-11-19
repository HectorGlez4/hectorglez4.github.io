---
title: 'Tarjetas Sociales con paleta de 256 colores'
type: 'chore'
created: '2026-11-19'
status: 'done'
baseline_commit: '07ec368c91236cab9fe2a7cb3336155d8a382c85'
review_loop_iteration: 0
context:
  - '{project-root}/DESPLIEGUE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `dist/` pesa 917,6 MiB sin lo que rota y pasa `TOPE_DE_PESO_DE_DIST` (900 MiB), así que `npm run build` se para y las 125 Citas de los grupos 3 y 4 de la séptima tanda no se publican. Las Tarjetas Sociales (`dist/tarjeta/`) son 514 MiB, el 56 %: cada una sale de `sharp(svg).png()` con las opciones por omisión (RGBA, compresión 6), un PNG de unos 60 KB para una imagen de ~496 colores planos.

**Approach:** Todas las Tarjetas Sociales se rasterizan por un único dueño que las codifica en RGB sin alfa y con paleta de 256 colores (cuantización a calidad 100, sin tramado, compresión 9). Sobre 60 tarjetas reales: 56 % menos de bytes, y ningún canal de ningún píxel se mueve más de 3/255 (solo bordes suavizados del texto). Decisión de Héctor del 19/11, elegida frente a la recompresión sin pérdida (27 %).

## Boundaries & Constraints

**Always:** Un solo módulo decide cómo se codifica una Tarjeta Social; los nueve endpoints de `src/pages/tarjeta/` y las pruebas que comparan bytes lo llaman a él. La salida sigue siendo PNG de 1200×630 y determinista: el mismo SVG da los mismos bytes en dos procesos. `tarjeta.ts` sigue siendo puro (AD-5): no importa `sharp`.

**Ask First:** Si tras el cambio `dist/` no baja del `TOPE_DE_PESO_DE_DIST`, o si alguna tarjeta muestreada difiere más de 3/255 en algún canal de la de antes, parar y decírselo a Héctor.

**Never:** No se mueve ningún umbral de `src/lib/umbrales.ts`. No se tocan el icono del sitio (`src/pages/icono/`), la Pieza de Canal (`tools/lib/piezas.ts`) ni la Imagen de Cita del cliente: no están en el problema y la Pieza ni siquiera va a `dist/`. No se cambia el SVG ni el diseño de ninguna tarjeta. No se añade dependencia nueva (`sharp` ya trae libimagequant).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tarjeta de Cita | SVG de `svgDeTarjeta` | PNG con paleta, 1200×630, ~56 % menos que antes | N/A |
| Tarjeta de listado | SVG de `svgDeTarjetaDeListado` (Autor, Tema, Obra, Colección, Personaje, Directorios, portada) | Igual que la de Cita | N/A |
| Repetición | El mismo SVG rasterizado dos veces | Bytes idénticos | N/A |
| SVG inválido | `sharp` no puede leerlo | Lanza, como hoy; el endpoint de Cita sigue nombrando el slug | Sin cambio |

</frozen-after-approval>

## Code Map

- `src/pages/tarjeta/[slug].png.ts:59` -- `sharp(Buffer.from(svg)).png().toBuffer()`; el mismo patrón en `portada.png.ts:30`, `coleccion/[slug].png.ts:32`, `directorio/obras.png.ts:24`, `directorio/autores.png.ts:25`, `obra/[autor]/[slug].png.ts:57`, `tema/[slug].png.ts:38`, `personaje/[slug].png.ts:34`, `autor/[slug].png.ts:34`.
- `src/lib/tarjeta.ts` -- compone los SVG; puro por AD-5, no debe rasterizar.
- `tests/unit/tarjeta.test.ts:146-158` -- exige que el endpoint de Cita importe `sharp`; pasará a exigirlo del módulo nuevo y que el endpoint importe el módulo. `:333-338` -- determinismo con `sharp(...).png()`.
- `tests/unit/directorio-de-autores.test.ts:472,495` y `tests/unit/directorio-de-obras.test.ts:676` -- comparan los bytes construidos con `sharp(svg).png()`; tienen que usar el mismo dueño.
- `tests/unit/tarjeta-construida.test.ts:81-82` -- lee ancho y alto del IHDR; sigue valiendo.
- `integraciones/peso.ts` y `src/lib/umbrales.ts` (`TOPE_DE_PESO_DE_DIST`) -- solo lectura: son la medida que tiene que volver a pasar.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/rasterizado.ts` -- crear `pngDeTarjeta(svg: string): Promise<Buffer>` con `removeAlpha()` y `png({ palette: true, quality: 100, effort: 10, dither: 0, compressionLevel: 9 })`, y la cabecera que explica por qué (peso de `dist/`, decisión del 19/11, cota de 3/255) -- un solo dueño de la codificación.
- [x] `src/pages/tarjeta/**/*.png.ts` (los nueve) -- sustituir `sharp(...).png().toBuffer()` por `pngDeTarjeta(svg)` y quitar la importación de `sharp` -- la decisión no se repite nueve veces.
- [x] `tests/unit/tarjeta.test.ts` -- la prueba de la Historia 10.1 exige `sharp` en `src/lib/rasterizado.ts` y la importación del módulo en el endpoint; la de determinismo usa `pngDeTarjeta`; añadir una que compruebe que el PNG lleva paleta (tipo de color 3 del IHDR) y mide 1200×630.
- [x] `tests/unit/directorio-de-autores.test.ts`, `tests/unit/directorio-de-obras.test.ts` -- comparar contra `pngDeTarjeta(svg)`.
- [x] `DESPLIEGUE.md` § «El techo de peso del hospedaje» -- actualizar el desglose de lo que pesa cada Cita nueva (la Tarjeta deja de ser 64 KB).

**Acceptance Criteria:**
- Given el Corpus de la rama con los grupos 3 y 4, when se corre `npm run build`, then termina con código 0 y el peso juzgado queda bajo `TOPE_DE_PESO_DE_DIST`.
- Given la muestra de 203 tarjetas de antes del cambio, when se comparan píxel a píxel con las nuevas de la misma ruta, then ningún canal difiere más de 3/255 y todas miden 1200×630.
- Given el cambio, when se buscan `.png().toBuffer()` en `src/pages/tarjeta/`, then no queda ninguno.

## Design Notes

Las tarjetas son colores planos con texto suavizado: ~496 colores, casi todos rampas de borde entre tres o cuatro tintas. Con 256 colores, la cuantización funde solo pasos vecinos de esas rampas, de ahí la cota de 3/255. Sin tramado (`dither: 0`), porque el tramado añadiría ruido en los fondos planos y bytes. `effort` y `quality` en `sharp` ya implican paleta; `palette: true` se escribe igual para que se lea. Medido: determinista entre procesos.

## Verification

**Commands:**
- `npx vitest run tests/unit/tarjeta.test.ts tests/unit/tarjeta-construida.test.ts tests/unit/directorio-de-autores.test.ts tests/unit/directorio-de-obras.test.ts` -- expected: todo en verde.
- `npm run build` -- expected: código 0, «Juzgado sin lo que rota» bajo 900 MiB.
- `npx astro check` -- expected: sin errores.
- Comparación de la muestra guardada en el scratchpad contra `dist/tarjeta/` -- expected: diferencia máxima ≤ 3, 1200×630.

## Suggested Review Order

**La codificación, en un solo dueño**

- Paleta de 256 colores, sin tramado; el alfa se aplana sobre el papel.
  [`rasterizado.ts:31`](../../src/lib/rasterizado.ts#L31)

- El endpoint de Cita, el que más pesa (~6.900 tarjetas), solo llama al dueño.
  [`[slug].png.ts:59`](../../src/pages/tarjeta/[slug].png.ts#L59)

**Lo que la vigila**

- Fidelidad: ningún canal más de 3/255 frente al raster sin pérdida.
  [`tarjeta.test.ts:193`](../../tests/unit/tarjeta.test.ts#L193)

- Todo endpoint de `src/pages/tarjeta/`, por glob, pasa por `pngDeTarjeta`.
  [`tarjeta.test.ts:207`](../../tests/unit/tarjeta.test.ts#L207)

- La tarjeta construida sale con paleta: lo que mantiene `dist/` bajo el tope.
  [`tarjeta-construida.test.ts:84`](../../tests/unit/tarjeta-construida.test.ts#L84)

- Los Directorios comparan sus bytes contra el mismo dueño.
  [`directorio-de-obras.test.ts:676`](../../tests/unit/directorio-de-obras.test.ts#L676)

**Las cifras del peso**

- El desglose por Cita nueva pasa de 95 KB a 58 KB, con la medida del 19/11.
  [`DESPLIEGUE.md:151`](../../DESPLIEGUE.md#L151)

- Las cotas que quedan hasta aviso, tope y techo.
  [`DESPLIEGUE.md:210`](../../DESPLIEGUE.md#L210)

- Los comentarios de umbrales y del paso del peso, al día.
  [`umbrales.ts:1007`](../../src/lib/umbrales.ts#L1007)
