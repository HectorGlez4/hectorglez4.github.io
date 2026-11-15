---
title: 'Historia 35.3b — La Tarjeta Social del Personaje y cuándo se indexa su página'
type: 'feature'
created: '2026-11-12'
status: 'done'
baseline_revision: '126de0c260a6600b5cca13e20e31274b09998b11'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-35-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-35-3-la-pagina-de-personaje.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** La Página de Personaje (35.3) se comparte sin previsualización —no declara `og:image`— y se indexa la de todo Personaje publicado, también la de una sola frase; y el aviso de IndexNow (FR-38) no distingue un Personaje indexable de uno `noindex` (diferido de la revisión de la 35.3).

**Approach:** Construir `/tarjeta/personaje/{slug}.png` con la plantilla de listado del Autor y declararla en toda página de Personaje; poner `MIN_CITAS_POR_PERSONAJE = 2` en `src/lib/umbrales.ts` y aplicarlo **solo** en `personajesIndexables`, de donde lo heredan `rutasIndexables`, las dos instancias de `superficies.ts`, el sitemap, Pagefind, la vista y el rastreo; extender el filtro de indexabilidad del aviso de la Obra a toda superficie `indexablePorContenido`.

## Boundaries & Constraints

**Always:**
- `MIN_CITAS_POR_PERSONAJE = 2` (valor que fija la historia mientras Héctor no dé otro), con JSDoc como `MIN_CITAS_OBRA_INDEXABLE`; inclusivo («al menos»), contando las Citas publicadas con `personaje === slug` (`citasDePersonaje`). Ninguna prueba fija su valor: las fixtures se derivan de la constante.
- La Tarjeta: `datosDeTarjetaDePersonaje(personaje)` en `src/lib/tarjeta.ts` → `{ titulo: nombre, hechos: ['personaje de {universo}'] }`, sin bajada, serif por omisión, nunca la semblanza ni recuento (el de documentadas de la de Autor es siempre 0 para un Personaje: solo la atribuida admite `personaje`). La frase «personaje de {universo}» tiene **un** dueño en `src/lib/atribucion.ts` (`universoDePersonaje`), que usan la ficha de la página, `descripcionDePersonaje` y la Tarjeta, sin cambiar ningún byte de lo que hoy pintan.
- Endpoint `src/pages/tarjeta/personaje/[slug].png.ts` calcado de `src/pages/tarjeta/autor/[slug].png.ts`: rutas de `personajesPublicados(conjunto.personajes, conjunto.citas)` (indexable o no), `svgDeTarjetaDeListado` + `sharp`, mismas cabeceras.
- La Página de Personaje pasa `tarjeta={`/tarjeta/personaje/${personaje.slug}.png`}` al `Armazon` en todas sus páginas (1, 2+, indexable o no).
- La Página de Personaje bajo el mínimo: la misma página, sin marca ni aviso; `noindex, follow`, fuera del sitemap, sin `data-pagefind-body`, sin `vista-de-superficie`, `causaDelServicio` = `contenido`. Todo sale ya del mecanismo `indexablePorContenido`; no se escribe otra regla.
- Aviso (FR-38): un predicado nuevo en `src/lib/superficies.ts`, `dependeDelContenido(ruta)` = la superficie declarada lleva `indexablePorContenido`, sustituye a `esRutaDeObra` en el filtro de `componerAviso` y en `rutasDeObraDelSitemap` (`tools/lib/avisar.ts`); la lista de antes de `tools/avisar.ts` suma `personajesIndexablesEnDisco(copia)` a las Obras, y el bucle que avisa de umbrales cambiados en el rango incluye `MIN_CITAS_POR_PERSONAJE`. Para la Obra el resultado no cambia.
- Rastreo: una Página de Personaje publicada y `noindex` se rechaza con 1 (ya lo hace por `indexables`), con un motivo propio que nombra `MIN_CITAS_POR_PERSONAJE` en lugar del de la Obra (`esRutaDePersonaje` por declaración, junto a `esRutaDeObra`).
- Series: la familia `personaje` ya está en indexación, tráfico, demanda, rastreo y canal, con «Personaje», censo de lo publicado y fuera de `publicadas` (35.3); esta historia solo la prueba donde falte (rastreo noindex, canal «Personaje»). SM-C2 no tiene código en el repositorio: no se toca nada.
- `src/lib/vocabulario.ts` intacto; ningún evento ni zona nuevos.

**Block If:**
- Con el Corpus real y `FECHA_JORNADA` fija, `diff -r` de `dist/` antes/después (sin `pagefind/`, cuyo no determinismo de nombres está documentado en la 35.2/35.3) muestra cualquier diferencia.
- Hace falta tocar `src/lib/vocabulario.ts`, `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`, o dar valor a una constante reservada a Héctor distinta de `MIN_CITAS_POR_PERSONAJE`.

**Never:**
- Levantar las guardas de la 35.2 (Obra de Personaje, «Cita publicada lleva Autor») ni pintar el Personaje en la Tarjeta Social de Cita, lo copiado o la Imagen (35.4); «Buscar en…», Directorios, optgroup (35.5); línea de retirada (35.8).
- Declarar la indexabilidad en la ficha del Personaje; sembrar Personajes o Citas en el Corpus real.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| En el mínimo | Personaje con `MIN_CITAS_POR_PERSONAJE` Citas | Página 1 indexable: sitemap, `data-pagefind-body`, `vista-de-superficie` | — |
| Bajo el mínimo | Personaje con 1 Cita (si `1 < MIN`) | `noindex, follow`, fuera de sitemap y Pagefind, sin vista, mismo `<main>`; `causaDelServicio` = `contenido` | — |
| Tarjeta | Todo Personaje publicado | PNG en `dist/tarjeta/personaje/{slug}.png`; `og:image` de 1 y 2+ resuelve a él | — |
| Corpus real | Sin Personajes | Ninguna ruta `/personaje/` ni `/tarjeta/personaje/`; PNG de `dist/` +0 | — |
| Aviso, sigue noindex | Cita nueva de un Personaje que sigue bajo el mínimo | No se avisa su página | — |
| Aviso, cruza | Personaje pasa de 1 a 2 Citas, o al revés | Se avisa su página | Sin lista de un lado, se nombra como hoy con la Obra |
| Rastreo | `--registrar /personaje/x/` con `noindex` | Código 1, motivo con `MIN_CITAS_POR_PERSONAJE` | — |

</intent-contract>

## Code Map

- `src/lib/umbrales.ts:83` -- junto a `MIN_CITAS_OBRA_INDEXABLE`: `MIN_CITAS_POR_PERSONAJE`. El guion del filtro de Directorios importa el módulo: una constante literal no lo engorda (sin cómputo en lo alto).
- `src/lib/publicado.ts:208-219` -- `personajesIndexables`: hoy devuelve `personajesPublicados`; filtrar por `citas.filter(c => c.personaje === slug).length >= MIN_CITAS_POR_PERSONAJE`. Sus consumidores ya están cableados: `rutasIndexables` l.1241, `integraciones/indexables.ts:84` (`personajesIndexablesEnDisco`), `tools/rastreo.ts:150`. Corregir sus JSDoc («hoy, todo Personaje publicado»).
- `src/lib/superficies.ts:194-210,594` -- comentario de la superficie («la 35.3b le pone su umbral»); `esRutaDePersonaje` y `dependeDelContenido` junto a `esRutaDeObra`. `causaDelServicio` l.693 y `consecuenciasDe` l.746 ya hacen `contenido`/sin vista.
- `src/lib/tarjeta.ts:281` -- `datosDeTarjetaDeAutor` como modelo; `datosDeTarjetaDePersonaje` debajo. `svgDeTarjetaDeListado` l.195.
- `src/lib/atribucion.ts` -- `descripcionDePersonaje` (35.3) y nuevo `universoDePersonaje`.
- `src/pages/tarjeta/autor/[slug].png.ts` -- plantilla del endpoint nuevo `src/pages/tarjeta/personaje/[slug].png.ts`.
- `src/pages/personaje/[slug]/[...page].astro:84-89,99` -- prop `tarjeta` del `Armazon`; la línea «personaje de …» usa `universoDePersonaje`; JSDoc de cabecera («sin Tarjeta Social (35.3b)»). `Armazon.astro:71,106` ya compone `og:image`.
- `tools/lib/avisar.ts:16,146-250,262-276` -- `esRutaDeObra` → `dependeDelContenido` en el filtro de `tocadas` y en `rutasDeObraDelSitemap`; JSDoc y mensajes hablan de Obras: decir «Obra o Personaje» donde aplique.
- `tools/avisar.ts:400-422` -- bucle de umbrales cambiados (`constanteNumerica`) y `antes = { rutas: [...obras, ...personajesIndexablesEnDisco(copia)] }`.
- `tools/lib/rastreo.ts:260-275` -- motivo de `noindex`: rama por `esRutaDePersonaje`.
- `tools/lib/peso.ts:164` -- cuenta PNG genérico: nada que tocar; con el Corpus real suma 0.
- Pruebas que hoy suponen «todo Personaje se indexa» y deben revisarse al poner el umbral: `tests/unit/publicado.test.ts:317-326` (batman con una Cita), `tests/unit/pagina-de-personaje.test.ts:250-256` («sin tarjeta social»), `tests/unit/personajes-build.test.ts`, `tests/unit/medicion.test.ts` (sitio medido con Personaje: su vista), `tests/unit/alcance.test.ts`, `tests/unit/indexacion.test.ts`, `tests/unit/superficies.test.ts`, `tests/unit/indexnow.test.ts`, `tests/unit/avisar-rango.test.ts`, `tests/unit/rastreo.test.ts:876-901` (modelo del rechazo `noindex`), `tests/unit/canal.test.ts`.

## Tasks & Acceptance

**Execution:**
- `src/lib/umbrales.ts`, `src/lib/publicado.ts` -- constante y umbral en `personajesIndexables` -- FR-66, NFR-1 v9.1.
- `src/lib/superficies.ts` -- `esRutaDePersonaje`, `dependeDelContenido`, comentarios -- AD-17.
- `src/lib/atribucion.ts`, `src/lib/tarjeta.ts`, `src/pages/tarjeta/personaje/[slug].png.ts`, `src/pages/personaje/[slug]/[...page].astro` -- Tarjeta Social y `og:image` -- UX-DR134, AD-15, AD-28.
- `tools/lib/avisar.ts`, `tools/avisar.ts` -- FR-38 para el Personaje (cierra el diferido de la 35.3).
- `tools/lib/rastreo.ts` -- motivo del `noindex` de Personaje.
- `tests/unit/pagina-de-personaje.test.ts` -- B pasa a decir exactamente `MIN_CITAS_POR_PERSONAJE` Citas (la nueva con un slug que la deje en la página 1 del Tema, p. ej. `vivo-b-la-otra`, para NFR-5) y C conserva 1; se exige: B indexable (sitemap, `data-pagefind-body`, vista) y, si `1 < MIN_CITAS_POR_PERSONAJE`, C `noindex, follow`, fuera del sitemap y de Pagefind, sin vista y con el mismo `<main>` que tendría indexable (ficha, semblanza, listado presentes); para **toda** página `dist/personaje/**/index.html`, su `og:image` resuelve a un fichero de `dist/` con cabecera PNG; `dist/tarjeta/personaje/` tiene un PNG por Personaje publicado (4); ajustar recuentos de meta de B.
- `tests/unit/tarjeta.test.ts` -- `datosDeTarjetaDePersonaje`: título, el único hecho, sin semblanza aunque la tenga.
- `tests/unit/publicado.test.ts`, `tests/unit/superficies.test.ts` -- `personajesIndexables` en el mínimo, bajo él y con una Cita de otro Personaje; `causaDelServicio('/personaje/x')` = `contenido` sin x en la lista; `dependeDelContenido` verdadero para Obra y Personaje (1 y 2+), falso para Autor.
- `tests/unit/indexnow.test.ts` -- `componerAviso` con un Personaje: noindex antes y después no se avisa; cruzar el umbral en los dos sentidos se avisa; hermana que cruza se avisa; `rutasDeObraDelSitemap` devuelve también `/personaje/…`.
- `tests/unit/rastreo.test.ts`, `tests/unit/canal.test.ts` -- rechazo con 1 del Personaje `noindex` con su motivo; el canal acepta un Personaje `noindex` publicado y lo desglosa «Personaje».
- Pruebas del Code Map que supongan «todo Personaje se indexa» -- adaptar fixtures a la constante.
- `AGENTS.md` -- «Los Personajes»: Tarjeta Social y regla de `MIN_CITAS_POR_PERSONAJE` (sustituye «hoy, todo Personaje publicado; el umbral lo pone la 35.3b»); «Leer el estado de indexación», «tráfico», «demanda», «rastreo» y «canal»: la familia `personaje` («Personaje», censo de lo publicado, no suma a `publicadas`; el rastreo rechaza la `noindex`); «El aviso, la serie y la congelación»: el aviso trata igual Obra y Personaje por indexabilidad.

**Acceptance Criteria:**
- Given el Corpus real y `FECHA_JORNADA` fija, when se construye antes (worktree `--detach` en la base) y después y se compara con `diff -r` sin `pagefind/`, then no difiere ningún fichero y el número de PNG del paso final de `npm run build` es el mismo (el spec lo anota).
- Given la construcción de `pagina-de-personaje.test.ts`, when corre Vitest sobre su `dist/`, then se cumple cada exigencia de su tarea, también la comprobación de `integraciones/indexables.ts` en `astro:build:done` (la construcción sale con 0).
- Given `npx astro check` y `npm test` (detached), when corren, then pasan, `huella.test.ts` incluida sin mover la huella.

## Design Notes

El umbral vive en un solo sitio (`personajesIndexables`) porque las dos instancias de `superficies.ts`, el rastreo y el aviso ya lo consumen; repetir la cuenta en otro lugar es el segundo cómputo que AD-11 prohíbe. «Personaje de {universo}» y no «de {Obra o universo}»: la Página ya pinta `universo` (35.3) y el criterio de la historia lo dice así.

## Verification

**Commands:**
- `npx astro check` -- expected: 0 errores.
- `npx vitest run tests/unit/<cada fichero tocado>.test.ts` -- expected: verde.
- `/Users/hec/brainlySabiduria/.claude/v9-ralph/correr.sh /Users/hec/brainlySabiduria/.claude/v9-ralph/logs/s-35/test-35.3b.log /Users/hec/brainlySabiduria/.claude/worktrees/v9-35 npm test` -- expected: FINISHED EXIT=0.
- `FECHA_JORNADA=2026-11-12 npm run build` en la base y en el árbol; `diff -rq` sin `pagefind/` -- expected: sin diferencias; mismas cifras de PNG.

## Spec Change Log

### 2026-11-12 — Implementación
- `rutasDeObraDelSitemap` (`tools/lib/avisar.ts`) pasa a devolver también las rutas de Personaje, como pide el Code Map. Esa lista la comparte la serie de indexación (`obrasDelSitemap` → censo de la familia Obra), así que `tools/indexacion.ts` filtra con `esRutaDeObra` antes de componer el censo y de decidir «el sitemap no trae ninguna Obra»: la familia Obra no gana Personajes. Prueba en `tests/unit/indexacion.test.ts`.
- `tools/avisar.ts`: el reparto del ensayo asigna `personaje` a una ruta de Personaje que no esté en ninguna relación, como hacía con la Obra.
- Fixtures que suponían «todo Personaje se indexa» (`medicion.test.ts`, `publicable-y-alcanzable.test.ts`): Batman recibe `MIN_CITAS_POR_PERSONAJE - 1` Citas más, fuera del Tema y en la página 1 del Autor; el recuento de Citas del sitemap se deriva de la constante. Los textos añadidos son tres: un `MIN_CITAS_POR_PERSONAJE` mayor que 4 exigiría ampliarlos.

## Review Triage Log

### 2026-11-12 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

### 2026-11-12 — Review pass (capas externas, pasada 1)
- intent_gap: 0
- bad_spec: 0
- patch: 3 (high 0, medium 1, low 2)
- defer: 0
- reject: 28 (high 0, medium 0, low 28)
- addressed_findings:
  - `[medium]` `[patch]` El camino del rango de `tools/avisar.ts` con Personajes no tenía prueba (blind-hunter, verification-gap ×3, ac-auditor): `tests/unit/avisar-rango.test.ts` gana cuatro commits con `corpus/personajes/batman.yml` —`MIN_CITAS_POR_PERSONAJE` Citas, una menos, el umbral subido y restituido— y cuatro casos: el Personaje que llega al umbral se avisa, el que baja se avisa por la lista de antes (`personajesIndexablesEnDisco(copia)`), el ensayo lo cuenta en `reparto.personaje`, y el aviso «MIN_CITAS_POR_PERSONAJE cambió en el rango … la lista de Personajes indexables». Quitar la lista de Personajes de antes pone en rojo dos de ellos (comprobado).
  - `[low]` `[patch]` Las fixtures de Batman de `medicion.test.ts` y `publicable-y-alcanzable.test.ts` fallaban a ciegas con un `MIN_CITAS_POR_PERSONAJE` mayor que sus textos: ahora rompen nombrando la constante.
  - `[low]` `[patch]` Fuera del endpoint de la Tarjeta la línea «Con el Corpus de hoy, sin Personajes, no construye ninguna», que caducaría con el primer Personaje.
- Rechazados, con su razón: «personaje de el …» (el universo es un título y «de El Quijote» es la grafía con título; la frase es la de UX-DR134 y ya la pintaba la 35.3); el `desde` anterior a la 35.3b sin la constante y la copia sin `corpus/personajes/` (las épicas se fusionan enteras: ningún `desde` de la principal tiene Personajes sin su umbral, y el build exige la ficha de todo Personaje declarado); la clave `personaje` del reparto (sale de `FAMILIAS_DE_RUTA`, que la trae: la prueba del ensayo la afirma); contar Citas «en disco» frente a «publicadas» y el recuento propio de `personajesIndexables` (toda Cita de `corpus/citas/` se publica —`conjuntoPublicable` lee la misma colección sin filtrar; la puerta de la atribuida actúa al aprobar—, y la regla `personaje === slug` es la de `citasDePersonaje`); el nombre de `rutasDeObraDelSitemap` (sus dos consumidores son el aviso, que quiere las dos, y la indexación, que filtra); el motivo del rastreo (`personajesIndexables` es la única regla que deja fuera a un Personaje publicado); `Cache-Control immutable` y la tarjeta sin comprobación de ancho (calco de la de Autor; en un build estático la cabecera del endpoint no se sirve); el nombre de los ficheros de fixture, `it.runIf`, la expresión regular de `og:image`, el `as number`, el censo a mano del canal, el `as` del endpoint (estilo, calco de la de Autor); el triaje vacío de la pasada anterior (no había capas externas; esta lo corrige); que el `diff` de `dist/` con el Corpus real no ejerce lo nuevo (es su propósito: lo nuevo lo prueban las construcciones de fixture) y que excluya `pagefind/` (excepción del propio Block-If); `AGENTS.md` documenta la 35.3 en las series (es la misma familia, que la tarea pedía documentar); las páginas 2+ en `componerAviso` (igual que la Obra desde la 22.8); el universo vacío (el esquema lo exige); el tope del Tema con más Citas de B (la construcción rompería nombrándolo); el +1 PNG por Personaje sin observar en `peso` (el criterio lo resuelve el spec anotándolo; `dist/tarjeta/personaje/` tiene uno por Personaje y `peso` cuenta todo PNG de `dist/`); «mismo marcado» como presencia de las partes, el código 1 del rastreo por la orden y las series de tráfico y demanda (cubiertos por la función pura que la orden llama, `tools/rastreo.ts` sale con 1 en `!ok`, y por las pruebas de la 35.3); FR-38 fuera del relato de la épica (el intent-contract lo incluye); SM-C2 (sin código).

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** `MIN_CITAS_POR_PERSONAJE = 2` en `src/lib/umbrales.ts`, aplicado solo en `personajesIndexables`; la Página de Personaje bajo el umbral se sirve `noindex, follow`, fuera del sitemap y de Pagefind y sin vista, con el mismo `<main>`. Tarjeta Social `/tarjeta/personaje/{slug}.png` (plantilla de listado: nombre serif y «personaje de {universo}», con `universoDePersonaje` como único dueño de la frase) declarada en toda página de Personaje. FR-38: `dependeDelContenido` sustituye a `esRutaDeObra` en el aviso y en el sitemap que lee, y la lista de antes suma `personajesIndexablesEnDisco`; el rastreo rechaza el Personaje `noindex` con su propio motivo.

**Ficheros.**
- `src/lib/umbrales.ts` — `MIN_CITAS_POR_PERSONAJE`.
- `src/lib/publicado.ts` — el umbral en `personajesIndexables`.
- `src/lib/superficies.ts` — `esRutaDePersonaje`, `dependeDelContenido`, comentarios.
- `src/lib/atribucion.ts` — `universoDePersonaje`; `descripcionDePersonaje` lo usa.
- `src/lib/tarjeta.ts` — `datosDeTarjetaDePersonaje`.
- `src/pages/tarjeta/personaje/[slug].png.ts` — endpoint nuevo.
- `src/pages/personaje/[slug]/[...page].astro` — `tarjeta` del Armazón y la línea del universo.
- `tools/lib/avisar.ts`, `tools/avisar.ts` — FR-38 para el Personaje (cierra el diferido de la 35.3).
- `tools/lib/rastreo.ts` — motivo del `noindex` de Personaje.
- `tools/indexacion.ts` — el censo de la Obra filtra los Personajes de la lista del sitemap.
- `AGENTS.md` — Personajes, indexación, tráfico, demanda, rastreo y aviso.
- Pruebas: `pagina-de-personaje`, `tarjeta`, `publicado`, `superficies`, `indexnow`, `avisar-rango`, `rastreo`, `canal`, `indexacion`, `medicion`, `publicable-y-alcanzable`.

**Revisión.** Capas externas sin hallazgos en esta pasada: 0 parches, 0 diferidos, 0 rechazados. `followup_review_recommended: false` (0 parcheados; puntuación 0).

**Verificación.**
- `npx astro check`: 0 errores.
- Pruebas por fichero en verde (las once de arriba).
- `npm test` completo detached (`logs/s-35/test-35.3b.log`): 180 ficheros, 7983 pruebas en verde, `huella.test.ts` incluida sin mover la huella.
- `FECHA_JORNADA=2026-11-12 npm run build` en la base (worktree `--detach` en 126de0c260) y en el árbol: `diff -rq -x pagefind` sin diferencias (`logs/s-35/distdiff-35.3b.log` vacío); PNG 5.123 en las dos, Tarjetas Sociales 5.120 ficheros y 312.892.904 bytes en las dos.
- Matriz: cada fila tiene prueba que corrió (B en el mínimo y C bajo él, Tarjeta y `og:image` en `pagina-de-personaje`; aviso que sigue `noindex`, que cruza en los dos sentidos, hermana y sin lista en `indexnow`; rastreo en `rastreo`); la del Corpus real, por el `diff` de `dist/`.

**Riesgos residuales.** El aviso sin `--sitemap` lee el sitemap en vivo, que hoy no trae Personajes: sin cambio. Si `MIN_CITAS_POR_PERSONAJE` supera 4, las fixtures de Batman necesitan más textos.

### Pasada de revisión 1 (capas externas)

- Parches: 3 (medium 1, low 2), en `tests/unit/avisar-rango.test.ts`, `tests/unit/medicion.test.ts`, `tests/unit/publicable-y-alcanzable.test.ts` y `src/pages/tarjeta/personaje/[slug].png.ts`. Diferidos: 0. Rechazados: 28.
- `followup_review_recommended: true` — puntuación 3 × 1 + 1 × 2 = 5 (0 high).
- Verificación: `npx astro check` 0 errores; `npx vitest run tests/unit/avisar-rango.test.ts` 34 en verde, y con la lista de Personajes de antes quitada de `tools/avisar.ts` dos de los casos nuevos fallan; `npm test` completo detached (`logs/s-35/test-35.3b-r1.log`): FINISHED EXIT=0, 180 ficheros y 7987 pruebas en verde, `huella.test.ts` incluida.
- Riesgo residual: lo nuevo de la historia no lo ejerce ninguna construcción con el Corpus real, que no tiene Personajes; lo cubren las construcciones de fixture.
