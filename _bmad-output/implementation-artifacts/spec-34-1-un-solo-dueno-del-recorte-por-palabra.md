---
title: 'Historia 34.1 — Un solo dueño del recorte por palabra'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_revision: '2b9c8669b3519df7e08c053eaedfb83250afad64'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-34-context.md'
warnings: [oversized]
deferred:
  - summary: 'Un texto de una sola palabra más largo que el tope se devuelve tal cual, sin «…»: el criterio de epics.md («la primera palabra ya pasa del tope ⇒ esa palabra entera seguida de «…»») no dice qué hacer cuando no hay nada detrás que omitir. No existe en el Corpus (ninguna Cita de una palabra pasa de 110).'
    evidence: 'epics.md Story 34.1, criterio `[ASSUMPTION]` de la primera palabra; recorrido del Corpus del 2026-11-08 (4.424 Citas).'
    severity: low
  - summary: 'El AC de epics.md dice que la Imagen y `/buscar/` conservan el texto íntegro, pero la prueba de `dist/` solo puede fijar lo que el build emite (el `h1` del que Pagefind toma el título, el atributo de la Imagen y el JSON-LD); el índice de Pagefind en sí no se inspecciona.'
    evidence: 'Pagefind indexa `data-pagefind-body` y toma el título del `h1`; la prueba fija el `h1`.'
    severity: low
---

<intent-contract>

## Intent

**Problem:** El texto de Cita se recorta en dos sitios y con dos reglas, las dos a ciegas: `TarjetaDeCita.astro` hace `slice(0, 119)` y la Página de Cita `slice(0, 109)`, así que cortan a media palabra («Como la del camposant…»), cuentan unidades UTF‑16 y cuentan cada salto de verso como un carácter; además la meta descripción lleva la Cita entera (UX-DR131, UX-DR132, FR-64).

**Approach:** Una sola función pura, `recortarPorPalabra(texto, tope)` en `src/lib/recorte.ts`, con los topes con nombre en `src/lib/umbrales.ts`; la Tarjeta de Cita y el título y la meta de la Página de Cita la usan, y una prueba prohíbe cualquier otro recorte de texto de Cita en `src/components/` y `src/pages/`.

## Boundaries & Constraints

**Always:**
- `recortarPorPalabra(texto, tope)`: si el texto **cuenta** ≤ `tope`, lo devuelve idéntico (sin «…»). Contar = puntos de código (`for…of`), sin contar ningún U+000A.
- Si no cabe: el prefijo más largo que termina justo antes de un blanco (`\s`, también el salto) del texto, al que se le quitan por la derecha blancos y `,` `;` `:` repetidos, y cuya cuenta + 1 («…») ≤ `tope`; devuelve ese prefijo + «…». Los saltos que quedan dentro del prefijo se conservan. Nunca corta dentro de una palabra (una palabra = racha sin blancos, con su puntuación y sus «¿»/«¡» pegados).
- Si ni la primera palabra cabe: esa palabra entera (limpia por la derecha igual) + «…», aunque pase del tope. Si esa palabra es todo el texto, el texto tal cual.
- `src/lib/recorte.ts` no parte, sustituye ni quita el salto con `split`/`replace`/`replaceAll` (lo vigila `tests/unit/verso.test.ts`): cuenta comparando carácter a carácter o con `versosDe`.
- Topes en `src/lib/umbrales.ts`, literales, con el patrón documental de `MAX_CARACTERES_IMAGEN`: `MAX_CARACTERES_DE_TARJETA_DE_CITA = 120` y `MAX_CARACTERES_DE_TITULO_Y_META = 110`. `MAX_BYTES_GUION_DEL_FILTRO` no se mueve.
- Página de Cita: `recorte = enUnaLinea(recortarPorPalabra(cita.texto, MAX_CARACTERES_DE_TITULO_Y_META))`; título `tituloDe(«{recorte}» — {Autor})`; `descripcion = {recorte} — {Autor}.` (de ahí `og:description`). Recortar antes de pasar a una línea, así que « / » nunca queda delante de «…».
- El `h1`, el JSON-LD, lo copiado (`data-texto-plano`, `data-compartir`), la Imagen y Pagefind conservan el texto íntegro (NFR-12).
- Ningún campo del Corpus cambia; ningún `lastmod` se mueve.

**Block If:**
- Hace falta otro tope, otro nombre de constante distinto de los de arriba o tocar `src/lib/vocabulario.ts`/`GUIONES_EXTERNOS`.
- `MAX_BYTES_GUION_DEL_FILTRO` o el peso de `dist/` tendrían que subir para que el build pase.

**Never:**
- Recortar el título de la Obra, el nombre del Autor ni nada que no sea texto de Cita.
- Tocar `src/lib/verso.ts` (sus dos funciones siguen sin opciones) ni `_bmad-output/planning-artifacts/`/`_bmad-output/specs/`.
- Recortar en `tools/` (Pieza, Kit): fuera de alcance.
- Dejar `LARGO_DE_FRAGMENTO` en ninguna parte.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cabe justa | cuenta == tope | texto idéntico | — |
| Pasa por uno | cuenta == tope + 1 | prefijo en palabra entera + «…», cuenta ≤ tope | — |
| «camposanto» en el borde | el tope cae dentro de «camposanto» | corta antes de «camposanto», nunca «camposant…» | — |
| Puntuación delante | el prefijo acaba en «dos:» / «viejo,» / «;» | «dos…», «viejo…» | — |
| Verso, corte tras un salto | `LARGA` de `verso-construido.test.ts`, tope 120 | `…Cuando murió el pobre viejo,\nCuando ella me…` (saltos conservados) | — |
| Verso, título | `LARGA`, tope 110, después `enUnaLinea` | `…Dos veces vi el alma, dos: / Cuando murió el pobre viejo…` | — |
| Verso que ya cabe | Martí «Yo sé que el necio se entierra…», 121 unidades UTF-16 con sus 3 saltos, 118 sin ellos | texto entero, sin «…» (antes: «camposant…») | — |
| Tildes y aperturas | «¿Qué…», «¡Ay…», «á», astral (emoji) | cuenta por punto de código; «¿»/«¡» van con su palabra | — |
| Primera palabra larga | primera palabra > tope, hay más texto | esa palabra + «…» | — |
| Una sola palabra larga | texto = una palabra > tope | texto tal cual | — |

</intent-contract>

## Code Map

- `src/components/TarjetaDeCita.astro:113-123` -- `LARGO_DE_FRAGMENTO = 120` local y `slice(0, LARGO_DE_FRAGMENTO - 1).trimEnd()`: sustituir por `recortarPorPalabra(cita.texto, MAX_CARACTERES_DE_TARJETA_DE_CITA)`. El fragmento va por `TextoDeCita` (pinta versos); el nombre accesible no cambia.
- `src/pages/cita/[slug].astro:90-111` -- `recorte` con `slice(0, 109).replace(/\s*\n\s*$/, '')` y `descripcion={enUnaLinea(cita.texto) …}`: reescribir con la función y el tope; el comentario de las líneas 90-100 se actualiza.
- `src/lib/verso.ts` -- `versosDe`, `enUnaLinea` (solo lectura, se reutilizan).
- `src/lib/umbrales.ts:20-26` -- `MAX_CARACTERES_IMAGEN`, modelo de las dos constantes nuevas (ponerlas junto a ella).
- `tests/unit/verso.test.ts:66-83` -- lista de exenciones de `LEE_EL_SALTO`: quitar la de `src/pages/cita/[slug].astro`; `recorte.ts` no añade ninguna.
- `tests/unit/verso-construido.test.ts:125-195` -- fija el corte viejo de `LARGA` («Cuando ell…» y «…pobre viejo,…»): pasa al corte nuevo; la meta de `LARGA` pasa a llevar el recorte.
- `tests/unit/tarjeta-de-cita.test.ts:550-630,693-710` -- lee `LARGO_DE_FRAGMENTO` del componente por AST y replica `slice`: pasar a importar `MAX_CARACTERES_DE_TARJETA_DE_CITA` y `recortarPorPalabra`; el `it` «se recorta como antes» pasa a fijar el recorte por palabra.
- `tests/unit/obras.test.ts:1068-1110` -- modelo de la prueba de escaneo («nadie lee procedencia.obra») para la de recorte.
- `src/components/Armazon.astro:128,180` -- `description` y `og:description` desde la prop `descripcion` (solo lectura).
- Recorrido del Corpus (2026-11-08, 4.424 Citas, 75 en verso): cambian 17 Tarjetas y 16 títulos de Citas en verso, p. ej. `jose-marti-yo-se-que-el-necio-se-entierra` (Tarjeta: «…Como la del camposant…» → entera), `luis-de-gongora-cosas-celalba-mia-he-visto-extranas-cascarse` (título: «…fundamentos…» → «…fundamentos,\ny…»), `sor-juana-ines-de-la-cruz-detente-sombra-de-mi-bien-esquivo-imagen`, `pedro-calderon-de-la-barca-contra-vosotros-naciendo-aunque-si-naci-ya`, `gonzalo-de-berceo-quanto-aqui-vivimos-en-ageno-moramos-la`, `francisco-de-quevedo-llevada-de-enganoso-pensamiento-y-de-esperanza`; en prosa cambian además 1.067 Tarjetas y 1.599 títulos (y toda meta de Cita de más de 110). La lista completa sale de reejecutar el recorrido; va resumida en el mensaje del commit.

## Tasks & Acceptance

**Execution:**
- `src/lib/umbrales.ts` -- añadir `MAX_CARACTERES_DE_TARJETA_DE_CITA = 120` y `MAX_CARACTERES_DE_TITULO_Y_META = 110`, literales y documentadas (UX-DR131, AD-9) -- los topes con nombre.
- `src/lib/recorte.ts` -- crear `recortarPorPalabra(texto: string, tope: number): string`, pura, con cabecera que diga que es el único dueño del recorte de texto de Cita y que cambia el punto de corte de la Épica 29 -- un solo criterio.
- `src/components/TarjetaDeCita.astro` -- usar la función y el tope; borrar `LARGO_DE_FRAGMENTO` -- UX-DR132.
- `src/pages/cita/[slug].astro` -- título y meta con el recorte por palabra y luego `enUnaLinea` -- UX-DR131.
- `tests/unit/recorte.test.ts` -- crear: la matriz de arriba sobre la función (sin build) y la prueba de escaneo que falla si un fichero de `src/components/` o `src/pages/` hace `.slice(`/`.substring(` sobre una expresión que acaba en `texto` (`cita.texto`, `texto.slice`…), con su `it` que demuestra que el patrón detecta las formas y no marca `Busqueda.astro` -- la regla se compila.
- `tests/unit/tarjeta-de-cita.test.ts` -- importar tope y función; un `it` sin build que fija la Cita de Martí del Corpus con el corte de antes (`slice(0,119)` → «…camposant…») y el de después; en la construcción existente, comprobar que en todo listado del fixture (Tema, Colección, Autor, Obra y el pie de Página de Cita) todo fragmento terminado en «…» es, colapsando blancos, un prefijo del texto de su Cita seguido en el texto de `[,;:\s]*\s`; y que una Página de Cita de >110 caracteres del fixture lleva título y `description`/`og:description` recortados por palabra, y `h1`, JSON-LD `text`, `data-texto-plano` y el atributo de la Imagen íntegros.
- `tests/unit/verso-construido.test.ts`, `tests/unit/verso.test.ts` -- al corte nuevo y sin la exención de `[slug].astro`.
- `AGENTS.md` -- en «Conventions that differ from defaults», una línea: el texto de Cita solo se recorta con `recortarPorPalabra` de `src/lib/recorte.ts` y los topes de `umbrales.ts`; lo vigila `tests/unit/recorte.test.ts`.

**Acceptance Criteria:**
- Given el sitio construido, when se abre un listado con una Cita de más de 120 caracteres, then su Tarjeta acaba en «…» tras una palabra entera del texto y cuenta ≤ 120 sin saltos.
- Given una Página de Cita de más de 110 caracteres, when se lee su `<title>`, `meta description` y `og:description`, then los tres llevan el recorte por palabra (meta: `{recorte} — {Autor}.`) y el `h1`, JSON-LD, lo copiado y la Imagen llevan el texto íntegro.
- Given una Cita en verso, when se recorta para el título, then no hay salto ni « / » delante de «…».
- Given `src/components/` y `src/pages/`, when corre `tests/unit/recorte.test.ts`, then ningún fichero recorta texto de Cita fuera de `recortarPorPalabra`.
- Given el árbol tras la historia, when se busca `LARGO_DE_FRAGMENTO`, then no aparece; y `git diff` no toca `corpus/`.

## Spec Change Log

## Review Triage Log

### 2026-11-08 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

## Design Notes

El corte es un cambio respecto de la Épica 29, a propósito: la 29.1/29.3 contaban cada salto como un carácter y dejaban el corte en el mismo índice; ahora los saltos no cuentan, así que en verso el corte se adelanta unos caracteres (`LARGA`: «Cuando ell…» → «Cuando ella me…»). Ejemplo de la regla:

```ts
recortarPorPalabra('Dos veces vi el alma, dos: Cuando murió', 27) // 'Dos veces vi el alma, dos…'
recortarPorPalabra('Supercalifragilístico y más', 5)          // 'Supercalifragilístico…'
```

## Verification

**Commands:**
- `npx vitest run tests/unit/recorte.test.ts` -- expected: verde.
- `npx vitest run tests/unit/tarjeta-de-cita.test.ts` -- expected: verde.
- `npx vitest run tests/unit/verso-construido.test.ts tests/unit/verso.test.ts` -- expected: verde.
- `npx vitest run tests/unit/medicion.test.ts` -- expected: verde (el guion del filtro no engorda).
- `npx astro check` -- expected: 0 errores.
- `npm run build` -- expected: termina con 0 y el paso del peso sin parada.

## Auto Run Result

**Resumen.** El texto de Cita tiene un solo dueño del recorte: `recortarPorPalabra(texto, tope)` en `src/lib/recorte.ts`, pura, que cuenta puntos de código sin los saltos de verso, corta en la última palabra entera (sin blancos ni `,` `;` `:` colgando) y añade «…»; si cabe, el texto sale idéntico. La Tarjeta de Cita la usa con `MAX_CARACTERES_DE_TARJETA_DE_CITA` (120) y la Página de Cita, para título, `description` y `og:description`, con `MAX_CARACTERES_DE_TITULO_Y_META` (110), pasando después a una línea con `enUnaLinea`. La meta ya no lleva la Cita entera. `LARGO_DE_FRAGMENTO` desaparece y la exención de `[slug].astro` en `verso.test.ts` también.

**Ficheros.**
- `src/lib/recorte.ts` — nuevo: la función y su cabecera (único dueño; cambia el corte de la Épica 29).
- `src/lib/umbrales.ts` — los dos topes literales, documentados junto a `MAX_CARACTERES_IMAGEN`.
- `src/components/TarjetaDeCita.astro` — el fragmento por `recortarPorPalabra`; sin `LARGO_DE_FRAGMENTO`.
- `src/pages/cita/[slug].astro` — título y meta con el recorte por palabra y luego `enUnaLinea`.
- `tests/unit/recorte.test.ts` — nuevo: la matriz entera sobre la función y la prueba de escaneo (`slice`/`substring` sobre una expresión que acaba en `texto`), con su prueba del patrón y de `Busqueda.astro`.
- `tests/unit/tarjeta-de-cita.test.ts` — tope y función importados; Martí del Corpus antes («…camposant…») y después (entera); todo fragmento con «…» de Tema, Colección, Autor, Obra y pie de Página de Cita corta en palabra; la Página de Cita de >110 lleva título y metas recortados e `h1`, JSON-LD, `data-texto-plano` y `data-texto` de la Imagen íntegros.
- `tests/unit/verso-construido.test.ts` — al corte nuevo de `LARGA` («Cuando ella me…», «…pobre viejo…») y su meta recortada.
- `tests/unit/verso.test.ts` — sin la exención de `src/pages/cita/[slug].astro`.
- `AGENTS.md` — la convención del recorte en «Conventions that differ from defaults».

**Revisión.** Capas externas sin hallazgos en esta pasada: 0 parches, 0 diferidos, 0 rechazados. Seguimiento recomendado: no (0 parches; puntuación 0).

**Verificación.**
- `npx vitest run tests/unit/recorte.test.ts tests/unit/verso.test.ts` — verde (19 pruebas).
- `npx vitest run tests/unit/tarjeta-de-cita.test.ts tests/unit/verso-construido.test.ts tests/unit/medicion.test.ts` — verde (728 pruebas).
- `npx astro check` — 0 errores, 0 avisos.
- `npm run build` — sale con 0; el paso del peso, sin aviso ni parada (485,4 MiB juzgados).
- `npm test` completo — 164 ficheros, 7.459 pruebas, verde.
- Muestra en `dist/` del Corpus real: la Tarjeta de Martí en `/tema/la-muerte/` sale entera («…camposanto.»); el título de Góngora, «…fundamentos, / y…».
- Recorrido del Corpus (4.424 Citas, 75 en verso): cambian 1.084 Tarjetas (17 en verso), 1.615 títulos (16 en verso) y 1.919 metas pasan a llevar el recorte.
- Auditoría de la matriz: cada fila tiene su prueba en `tests/unit/recorte.test.ts`, y corrió en verde.

**Riesgos residuales.** Los dos diferidos del frontmatter (una sola palabra más larga que el tope sale sin «…»; el índice de Pagefind no se inspecciona, solo el `h1`). Ningún `corpus/` tocado.

