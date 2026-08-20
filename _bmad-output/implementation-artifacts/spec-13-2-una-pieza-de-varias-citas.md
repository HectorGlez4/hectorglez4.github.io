---
title: 'Story 13.2 — Una pieza que reúne varias Citas'
type: 'feature'
created: '2026-08-20'
status: 'ready-for-dev'
baseline_revision: 'cf33fa8'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-13-1-componer-varias-jornadas.md'
warnings: []
deferred: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El Canal propio solo sabe producir un formato: una Cita suelta. Una jornada rinde una publicación y nada más, aunque el Corpus tenga cuatro Citas del mismo Tema que juntas dicen algo que ninguna dice sola.

**Approach:** Una orden que compone una **Pieza de Canal** con varias Citas en una sola imagen: `npx tsx tools/pieza.ts componer --red <red> <slug> <slug> [...]`. Se compone en `tools/` porque nadie la pide a demanda (AD-15), se rasteriza con el mismo camino SVG→`sharp` que la Tarjeta Social, y **su salida no se versiona**.

## Boundaries & Constraints

**Always:**
- Cada Cita de la pieza lleva su Autor **visible en la imagen**. La atribución del texto para publicar sale de `src/lib/atribucion.ts`, la misma que se lleva el visitante.
- Los tamaños salen de `src/lib/tramos.ts` (AD-8). Si el lienzo nuevo necesita un tamaño propio, es **una columna más en esa tabla**, nunca un número escrito en la plantilla.
- Una Cita que no admite Imagen por `MAX_CARACTERES_IMAGEN` **no entra**, y la orden lo dice nombrando el slug y la regla.
- **Ausencia antes que mutilación** (NFR-12): el texto de cada Cita va entero. Si el apilado no cabe, la pieza no se compone; jamás se recorta, abrevia ni se ponen puntos suspensivos.
- La pieza declara **un único** enlace de destino, marcado por red con `enlaceConOrigen` (FR-22). Una red por composición, del conjunto cerrado de `src/lib/redes.ts`.
- Los rechazos salen con código ≠ 0 y motivo redactado, como el resto de `tools/`.

**Ask First:**
- Si cumplir un criterio exigiera una dependencia de cómputo nueva, o embeber fuentes en el rasterizado.

**Never:**
- **No versiones la salida.** El PNG va a `piezas/`, ignorado por git. Lo versionado es la decisión, no el artefacto (AD-15).
- No uses `TarjetaDeCita.astro` ni ningún fragmento acotado: **AD-19 excluye expresamente el material de salida**. Una pieza reúne Citas íntegras a propósito.
- No abras la pieza de Colección: eso es la 13.3, que deriva de esta.
- No prepares nada para la pieza en movimiento (FR-31): su puerta es SM-8 y SM-8 no existe.
- No añadas una superficie web. La pieza no es indexable ni tiene URL.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Componer | 2+ slugs publicados que caben, y una red válida | PNG en `piezas/`, y por salida estándar el texto a publicar con **un** enlace marcado | Sin error |
| Cita larga | Un slug que supera `MAX_CARACTERES_IMAGEN` | Se rechaza nombrando el slug y la regla de FR-10 | Código 1 |
| No cabe | Slugs válidos cuyo apilado supera el alto útil | Se rechaza diciendo cuántas caben; no se compone nada | Código 1 |
| Una sola Cita | Un solo slug | Se rechaza: para una Cita ya está la Imagen de Cita | Código 1 |
| Slug inexistente o en revisión | Errata, o Cita en `corpus/_revision/` | Se rechaza nombrando el slug | Código 1 |
| Slug repetido | El mismo slug dos veces | Se rechaza: una Cita no se anuncia dos veces en la misma pieza | Código 1 |
| Red ausente o inválida | Sin `--red`, o `--red mastodon` | Se rechaza enumerando las redes válidas | Código 2 / 1 |
| Bandera desconocida | `--formato vertical` | Se rechaza antes de tocar nada | Código 2 |
| Repetir la composición | La misma orden dos veces | Mismo PNG byte a byte; se sobrescribe sin preguntar | Sin error |

</frozen-after-approval>

## Code Map

- `src/lib/tarjeta.ts` -- el precedente exacto del rasterizado: `svgDeTarjeta` devuelve una cadena SVG y `src/pages/tarjeta/[slug].png.ts:43` la pasa por `sharp(Buffer.from(svg)).png()`. De aquí salen `repartirEnLineas(texto, cuerpo, anchoUtil)` (mide por factor `cuerpo*0.52`, no parte palabras) y `escapar` (interno hoy).
- `src/lib/tramos.ts` -- `TABLA` con `pixelesEnImagen` / `pixelesEnTarjeta` por tramo, y `tramoDe(texto)` / `admiteImagen(texto)`. Su propia cabecera ya explica por qué un lienzo nuevo es **una columna más** y no un factor.
- `src/lib/atribucion.ts:23` -- `textoParaCopiar(cita, autor)`, dueño único de la atribución. `src/lib/compartir.ts:78` es un alias suyo.
- `src/lib/redes.ts` -- `REDES` (5), `esRedValida`, `PARAMETRO_DE_ORIGEN='de'`, `enlaceConOrigen(ruta, red)`. `src/lib/dominio.ts:27` (`SITIO`) lee `public/CNAME` con `readFileSync`, así que **sí funciona desde `tools/`**.
- `src/lib/marca.ts` -- `MARCA`. `src/lib/umbrales.ts:26` -- `MAX_CARACTERES_IMAGEN`, pero **consúltalo por `admiteImagen`**, no directamente.
- `src/lib/publicado.ts` -- tipos planos y funciones puras. `conjuntoPublicable()` hace `await import('astro:content')` y **no se puede llamar desde `tsx`**: el puente vigente es `tools/lib/corpus.ts` + funciones puras, como en `tools/huecos.ts:34-68`.
- `tools/lib/corpus.ts` -- `rutasDelCorpus`, `leerCitas(rutas.citas)` (publicadas) y `leerCitas(rutas.revision)`, `leerAutores(rutas)`.
- `tools/lib/gestion.ts:33` -- `type Resultado = {ok:true;ruta;mensaje} | {ok:false;motivos:string[]}`. Regla de oro: **o todo o nada**, nada se escribe hasta que todo valida.
- `tools/lib/cli.ts` -- `opcion`, `posicionales(argumentos, conValor)`, `raizDeCorpusDe`, `motivosDeArgumentosNoReconocidos`, `terminar`. Códigos: **2 = error de uso, 1 = rechazo, 0 = éxito** (`tools/jornada.ts:139`).
- `tools/coleccion.ts` y `tools/jornada.ts` -- el molde de la orden. `tests/unit/coleccion-cli.test.ts` -- el molde de su prueba (corpus en `mkdtemp`, `execFile` sobre `npx tsx`, `instantanea` antes/después).
- `tests/unit/tarjeta-construida.test.ts` -- el molde para verificar un PNG: `bytes.subarray(1,4).toString()==='PNG'`, `readUInt32BE(16)` ancho, `readUInt32BE(20)` alto.
- `public/islas/imagen.js:14-31` -- `LADO=1080`, `MARGEN=96` y las tres plantillas. Es JS de cliente **inimportable desde Node**: se toma la geometría como precedente, no como importación.

## Tasks & Acceptance

**Execution:**
- [ ] `src/lib/lienzo.ts` (nuevo, puro) -- mover aquí `escapar` y `repartirEnLineas`, y que `src/lib/tarjeta.ts` las importe. Rationale: dos módulos que rasterizan no pueden tener dos algoritmos de salto de línea; el segundo divergiría del primero sin que nadie lo viera.
- [ ] `src/lib/tramos.ts` -- añadir `pixelesEnPieza` a `Tramo` y a `TABLA` (44 / 36 / 30 / 26). Rationale: AD-8. El lienzo de la pieza apila varias Citas, así que su tamaño no es el de la Imagen; que la plantilla lo calcule aparte es justo lo que la regla impide.
- [ ] `src/lib/pieza.ts` (nuevo, puro, sin disco) -- `LADO=1080`, `MARGEN=96`; `svgDePieza(citas: CitaEnPieza[]): string` y `cabenEnPieza(citas): {cabe:true} | {cabe:false;maximo:number}`. Apila cada Cita con su Autor y su filete; el alto se calcula antes de componer.
- [ ] `tools/lib/piezas.ts` (nuevo) -- `componerPieza(rutas, slugs, red, salida?): Promise<Resultado>`: lee el corpus, resuelve los slugs contra las Citas publicadas, aplica los rechazos de la matriz, rasteriza con `sharp` y escribe. Nada se escribe hasta que todo valida.
- [ ] `tools/pieza.ts` (nuevo) -- la orden `componer`, con `--red`, `--corpus` y `--salida`, guardián de banderas y `terminar`.
- [ ] `.gitignore` -- ignorar `piezas/`. `package.json` -- guion `pieza`. `AGENTS.md` -- cómo se compone una pieza, fuera del bloque gestionado.
- [ ] `tests/unit/pieza.test.ts` (nuevo) -- sobre el SVG: 1080×1080; el texto de cada Cita **entero** (recomponer los `<text>` y exigir cada palabra); ningún `…` ni `...`; un Autor por Cita; `font-size` = `pixelesEnPieza` del tramo; escapado de `& < > "`; y la prueba estructural de que el módulo no lleva tabla de tamaños propia (`not.toMatch(/hasta:\s*\d+/)` y `contiene "from './tramos.ts'"`), como en `tests/unit/tarjeta.test.ts`.
- [ ] `tests/unit/pieza-cli.test.ts` (nuevo) -- la matriz entera por la orden, con corpus temporal: cabeceras PNG 1080×1080, el enlace único marcado en la salida, y `instantanea` probando que el corpus no cambia ni un byte.

**Acceptance Criteria:**
- Given una pieza compuesta, when la reviso, then cada Cita conserva su atribución visible y ninguna aparece sin Autor.
- Given una Cita que supera `MAX_CARACTERES_IMAGEN`, when la nombro en la selección, then queda excluida por la misma regla que le niega Imagen de Cita, y la orden lo dice.
- Given la pieza compuesta, when declara su destino, then lleva un único enlace, marcado por red.
- Given el texto de cada Cita, when la plantilla lo compone, then no se altera, ni se recorta, ni se abrevia, y los tamaños salen de `src/lib/tramos.ts`.
- Given la salida de la orden, when reviso el repositorio, then el PNG no está versionado.

## Spec Change Log

## Design Notes

**Por qué cuadrada de 1080, y por qué eso no es inventar formato.** Ni el PRD ni la espina fijan proporción para las Piezas. Lo que sí existe es una proporción ya decidida para publicar en una cuenta propia: la de la Imagen de Cita, cuadrada de 1080 con margen 96 (`public/islas/imagen.js`). Tomarla es la opción conservadora y reversible; elegir un formato vertical nuevo sería una decisión de producto que esta historia no tiene por qué tomar. Queda escrito aquí para que la 13.3 herede el mismo lienzo en vez de abrir el debate otra vez.

**El destino de una pieza sin Colección es la portada.** Una pieza de tres Citas no puede enlazar a una de ellas sin favorecerla, y el enlace tiene que ser uno solo. La portada es la única superficie que las contiene a todas sin elegir. La 13.3 sustituye ese destino por la Página de Colección, que es exactamente la diferencia entre las dos historias.

**Rechazar en vez de descartar en silencio.** El criterio dice que una Cita larga «queda excluida». Componer la pieza sin ella y no decir nada convierte un error de selección en un artefacto publicado al que le falta una Cita, y eso no se ve hasta después de publicarlo. La orden rechaza nombrando el slug y la regla: la exclusión es la misma, pero ocurre delante de quien la puede corregir.

**Lo que no cabe no se encoge.** El alto se calcula antes de componer nada. Si el apilado se pasa, no hay «ajustar un poco el tamaño»: los tamaños son los de `tramos.ts` y bajarlos sería devolverle a la plantilla la decisión que AD-8 le quitó. Se rechaza diciendo cuántas caben.

**Las fuentes del rasterizado siguen siendo las del sistema.** `src/lib/tarjeta.ts:78-83` ya deja escrito que el build no tiene las de la Fonts API y compone con la reserva —Georgia y la sans del sistema—. La pieza hereda esa limitación tal cual. Embeber los `.woff2` es un cambio que afecta también a la Tarjeta y no es de esta historia.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run` -- expected: todo en verde; ninguna de las 1277 de la línea base perdida.
- `npm run build` -- expected: construye igual; la pieza no añade superficie.
- `git status --porcelain` -- expected: vacío tras componer una pieza de verdad; el PNG queda ignorado.
- `grep -rn "1080\|pixelesEnPieza" src/ tools/ --include="*.ts"` -- expected: el lienzo declarado en un solo sitio y ningún tamaño de Cita escrito a mano.
