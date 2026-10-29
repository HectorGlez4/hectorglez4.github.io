---
title: 'Historia 26.2 — El tipo de un resultado no casa como texto, y la portada tiene el suyo'
type: 'feature'
created: '2026-10-26'
status: 'done'
baseline_revision: 'f8f103d26d1893be38ab989b600ad8eac5767e1b'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-26-context.md'
warnings:
  - oversized
deferred:
  - summary: >-
      La 27.1 pide el peso 0 del `autor` de la Cita «declarado junto al del tipo de la 26.2», pero la 26.2 elige un medio que no es metadato (filtro de Pagefind): no hay peso del tipo, y `autor: 0` ya queda declarado en `OPCIONES_DE_PAGEFIND` por el metadato `autor` de la Obra (22.7), que es el mismo campo.
    evidence: |-
      epics.md, Historia 27.1: «su peso en `ranking.metaWeights` es 0, declarado junto al del tipo
      de la 26.2 y nunca por omisión». El AC de la 26.2 es condicional («el tipo, si viaja como
      metadato…») y AD-17 deja el medio a esta historia. Medido el 2026-10-26 sobre el índice del
      worktree (Pagefind 1.5.2): con el tipo como metadato, 215 de los 400 primeros resultados de
      «obra» no tienen el término en el contenido (`locations` vacío), así que un tipo como
      metadato, aun con peso 0, sigue devolviendo la página. La 27.1 se cumple igual; solo la
      letra del criterio queda desfasada — pendiente de Héctor (bmad-create-epics-and-stories).
    location: >-
      _bmad-output/planning-artifacts/epics.md (Historia 27.1, criterio del metadato `autor`);
      src/lib/tipoDeResultado.ts OPCIONES_DE_PAGEFIND
---

<intent-contract>

## Intent

**Problem:** Desde Pagefind 1.5 la metadata se busca por omisión, y `Armazon.astro` emite el tipo como `data-pagefind-meta="tipo:…"`: buscar «obra» o «cita» devuelve cada página de ese tipo aunque no lo diga (hoy «cita» da 4.559 resultados, y 215 de los 400 primeros de «obra» no tienen la palabra en el contenido). La portada no declara tipo —se rotula «Cita»— e indexa la Cita del Día, los chips y la lista de Autores, así que sale al buscar el texto del día o cualquier Autor.

**Approach:** El tipo viaja como **filtro** de Pagefind (`data-pagefind-filter="tipo:…"` en el `<main>` del armazón), que no casa como texto y llega en `data().filters`; `/buscar/` lo lee de ahí y aplica antes de cada búsqueda las opciones de Pagefind (`metaWeights: { autor: 0 }`), con un solo dueño en `src/lib/tipoDeResultado.ts`. La tabla gana `directorio` y `portada`; la portada declara `portada` y deja fuera del índice todo salvo su `h1`; los resultados de Directorio y Portada se pintan como el de Obra.

## Boundaries & Constraints

**Always:**
- `ETIQUETAS_DE_RESULTADO` es exactamente `cita` «Cita», `autor` «Autor», `tema` «Tema», `coleccion` «Colección», `obra` «Obra», `directorio` «Directorio», `portada` «Portada»; `TipoDeResultado` se sigue derivando de la tabla, `TIPO_POR_OMISION` sigue siendo `'cita'` y `tipoDeOpenGraph` no cambia de regla (los dos nuevos dan `website`).
- `src/lib/tipoDeResultado.ts` exporta además, con docblock: `FILTRO_DE_TIPO = 'tipo'`; `TIPOS_CON_TITULO_EN_SANS` = `obra`, `directorio`, `portada` (UX-DR91, UX-DR104); y `OPCIONES_DE_PAGEFIND = { ranking: { metaWeights: { autor: 0 } } }`, el único sitio donde la búsqueda configura Pagefind: todo `data-pagefind-meta` que no deba puntuar declara aquí su peso 0, y `title` no se nombra (conserva su 5 por omisión).
- `Armazon.astro` es el único emisor del tipo: `data-pagefind-filter={`${FILTRO_DE_TIPO}:${tipo}`}` en `<main>`, solo cuando `enLaBusquedaPropia && tipo`; el atributo `data-pagefind-meta` de `<main>` desaparece. Una página sin `data-pagefind-body` no lleva tipo.
- La isla de `/buscar/` recibe `FILTRO`, `EN_SANS` y `PAGEFIND` por `guionQueAnuncia` (nunca escritos en el guion); lee `dato.filters?.[FILTRO]?.[0] || TIPO_POR_OMISION`; llama `await pf.options(PAGEFIND)` dentro del `try`, justo antes de **cada** `pf.search(…)` (`destroy()` de Pagefind borra las opciones del módulo); y a los tipos de `EN_SANS` les pone la clase `en-sans` (renombra `de-obra`) y, con título en el índice, `aria-label` = `{rótulo}: {título}` más `, de {Autor}` solo en Obra con Autor. La línea de Autor sigue siendo solo de Obra.
- Los comentarios nuevos van en el frontmatter de `buscar.astro`, nunca dentro del guion (viajan al visitante).
- `/buscar/` cabe en `MAX_BYTES_DE_GUION` con la medición puesta (hoy 6.441 B, 215 libres; estimado +≈115 B); se anota la medida nueva en el comentario de `umbrales.ts`, sin mover el tope.
- Portada: `tipo="portada"`; `data-pagefind-ignore="all"` en `section.del-dia`, `p.entrada` y las secciones de Temas, Colecciones y Autores, sin envoltorio nuevo ni cambio visual. Su `h1` (`MARCA`) es lo único que indexa, y de él sale su título en Pagefind.

**Block If:**
- `/buscar/` no cabe bajo `MAX_BYTES_DE_GUION` con la medición puesta aun con el bloque compartido de Design Notes: subir el tope o compactar la parte pura no es de esta historia.
- Cumplir el contrato exigiera tocar `_bmad-output/planning-artifacts/`, `_bmad-output/specs/` o `src/lib/vocabulario.ts`.

**Never:**
- El tipo como `data-pagefind-meta` en ningún elemento, ni derivado de la URL en el cliente; `tipo` en `metaWeights`.
- Páginas nuevas, o tocar `src/lib/superficies.ts`, `src/lib/marca.ts`, `BloqueDeCita.astro`, `Sostener.astro`, el 404, `/kit` o `/lote`.
- Cambiar cómo se pintan o se leen los resultados de Cita, Autor, Tema, Colección y Obra (el «, de» de Obra y el Autor bajo la Cita son de la 27), ni escribir `data-pagefind-meta="title:…"` (28.1) ni mudar las familias (26.7).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Directorio | `filters.tipo=['directorio']`, `meta.title='Autores'` | rótulo «Directorio», `data-tipo="directorio"`, título `.en-sans`, `aria-label="Directorio: Autores"`, sin línea de Autor | — |
| Portada | `['portada']`, título `MARCA` | «Portada», `.en-sans`, `aria-label="Portada: Sabiduría de Bolsillo"` | — |
| Obra | `['obra']`, título y `meta.autor` | como hoy: `.en-sans`, línea de Autor, `aria-label="Obra: {t}, de {A}"` | — |
| Cita, Autor, Tema, Colección | su tipo | como hoy: serif, sin `.en-sans`, sin `aria-label` | — |
| Tipo desconocido | `['foo']` | rótulo «Cita», `data-tipo="foo"`, serif, sin `aria-label` | — |
| Sin filtros | dato sin `filters` | rótulo «Cita», `data-tipo="cita"` | — |
| Directorio o Portada sin título | sin `meta.title` | el título visible es la URL, sin `aria-label` | — |
| Índice que falla y se recupera | `search` lanza, luego responde | `destroy()`, y la búsqueda siguiente llama `options(PAGEFIND)` antes de `search` | el fallo se calla como hoy |
| Buscar un tipo | «obra», «cita», «autor», «tema», «colección», «directorio», «portada», `MARCA` | todo resultado tiene `locations.length > 0` | — |

</intent-contract>

## Code Map

- `src/lib/tipoDeResultado.ts:19-56` -- `ETIQUETAS_DE_RESULTADO` (19-29), unión derivada (32), `TIPO_POR_OMISION` (35), `tipoDeOpenGraph` (54-56). Dueño de la tabla y, desde aquí, del medio y de las opciones de Pagefind; la 27 lo importará desde un guion empaquetado.
- `src/components/Armazon.astro` -- import (19), doc de `Props.tipo` (25-34: «sin valor cae al tipo por omisión»), `enLaBusquedaPropia` de `consecuenciasDe` (78), `og:type` (149), comentario y `<main>` con `data-pagefind-meta={tipo ? …}` (185-198).
- `src/pages/buscar.astro` -- cabecera con los porqués del guion (17-76; bullet 22.7 en 71-73), import (88), constantes por `guionQueAnuncia` (103-110), `cargar` (127-140), lectura del tipo (158), pintado y bloque de Obra (160-193), `try` de `buscar` (213-221: `options` va antes de `pf.search`, en 216), CSS `.titulo` / `.titulo.de-obra` (484-494).
- `src/lib/anuncio.ts:50-68` -- `guionQueAnuncia`: cada constante sale como `const X = <JSON>;`.
- `src/pages/index.astro` -- `<Armazon>` (56-61), `h1` `{MARCA}` (65), `section.del-dia` / `p.entrada` (67-84), Temas (86-101), Colecciones (124-139), Autores (142-155), `Sostener` con `data-pagefind-ignore` propio (173-176 y `Sostener.astro:155-159`).
- `src/pages/obra/[autor]/[slug]/[...page].astro:147` -- el único `data-pagefind-meta` de campo propio (`autor`), cuyo peso pasa a 0.
- `src/lib/umbrales.ts:325-354` -- comentario y valor de `MAX_BYTES_DE_GUION` (medida de la 23.8 en 344-352: 6.441 B en `/buscar/`).
- Pruebas: `tests/unit/ayuda/busqueda.ts` (índice de mentira 288-321: datos con `meta.tipo`, módulo `init`/`search`/`destroy` sin `options`; accesores 392+), `tests/unit/medicion.test.ts` (tope en línea 2265-2292; isla ejecutada 3265-3300 con `isla()`; reintento tras `destroy` 3690-3710, que exige una sola importación), `tests/unit/obra-pagina.test.ts:324`, `tests/unit/coleccion-pagina.test.ts:440-482`, `tests/unit/obra-indexable.test.ts:358`, `tests/unit/tipo-de-open-graph.test.ts`, `tests/unit/publicable-y-alcanzable.test.ts:183-251` (`CORPUS_COMPLETO` y su construcción, con portada, Cita, Autor, Tema, Colección y Obra indexable y no indexable, más páginas 2+), `tests/unit/ayuda/enlaces.ts:161` (`recorrerElementos`, con atributos y antepasados), `tests/e2e/busqueda.spec.ts` (`buscar`/`resultados` 11-32, Obra 96-132 con `.de-obra`, Pagefind de mentira 334-381 sin `options`).
- Hechos de Pagefind 1.5.2 comprobados el 2026-10-26: un resultado que casa solo por metadato trae `locations: []` y un `excerpt` sin `<mark>`; `data-pagefind-filter="tipo:obra"` en `<main data-pagefind-body>` da `filters: {tipo: ['obra']}` y no entra en el contenido; `options()` antes de `init()` vale, y `destroy()` pone a cero las opciones del módulo.

## Tasks & Acceptance

**Execution:**
- `src/lib/tipoDeResultado.ts` -- las dos entradas, `FILTRO_DE_TIPO`, `TIPOS_CON_TITULO_EN_SANS` y `OPCIONES_DE_PAGEFIND`, con su docblock: por qué el tipo es un filtro, la portada titulada con `MARCA` por su `h1`, y por qué `autor` pesa 0.
- `src/components/Armazon.astro` -- `<main>` con el filtro según Always, sin `data-pagefind-meta`; docs de `Props.tipo` y del bloque al día.
- `src/pages/buscar.astro` -- constantes nuevas, lectura del filtro, `options` antes de cada `search`, el bloque compartido de Design Notes, `.titulo.en-sans` en la CSS y la cabecera al día (26.2 en lugar de la nota de 22.7 sobre `.de-obra`).
- `src/pages/index.astro` -- `tipo="portada"` y los cinco `data-pagefind-ignore="all"`, con un comentario que diga que la portada responde solo por su título (AD-17, AD-19) y que la 28.1 declarará `title:…` cuando el `h1` salga de `main`.
- `src/lib/umbrales.ts` -- solo el comentario de `MAX_BYTES_DE_GUION`: la medida de `/buscar/` tras la 26.2.
- `AGENTS.md` -- en «Known pitfalls», una línea: el tipo de resultado viaja como `data-pagefind-filter="tipo:…"` que solo escribe `Armazon.astro`; ningún `data-pagefind-meta` lleva el tipo, y todo metadato nuevo declara su peso en `OPCIONES_DE_PAGEFIND`.
- `tests/unit/tipo-de-resultado.test.ts` (nuevo, sin construir) -- el conjunto exacto y sus siete rótulos; «Portada» no contiene `MARCA`; `TIPOS_CON_TITULO_EN_SANS` exacto; `OPCIONES_DE_PAGEFIND` exacto, sin `tipo` ni `title`; en `src/`, `FILTRO_DE_TIPO` solo lo usan `Armazon.astro` (escribe) y `buscar.astro` (lee), y ningún fichero escribe `data-pagefind-meta` con `tipo`.
- `tests/unit/tipo-de-open-graph.test.ts` -- `directorio` y `portada` dan `website`.
- `tests/unit/ayuda/busqueda.ts` -- el índice de mentira gana `options(o)` y apunta en orden cada llamada (`options`, `init`, `search`, `destroy`); sus datos por omisión llevan `filters: { tipo: ['cita'] }` y no `meta.tipo`; `Respuesta` acepta `datos?: (i) => { url, meta?, filters? }`; un accesor `resultados()` da por fila `tipo` (`dataset`), rótulo, título, clases del título y `aria-label`.
- `tests/unit/medicion.test.ts` -- en la isla ejecutada, un `describe` 26.2: la matriz de pintado (Directorio, Portada, Obra, Cita, desconocido, sin filtros, sin título) y que todo `search`, también el de tras un `destroy`, va precedido de `options` con `OPCIONES_DE_PAGEFIND`. Las pruebas de reintento existentes siguen igual.
- `tests/unit/publicable-y-alcanzable.test.ts` -- en la construcción de `CORPUS_COMPLETO`, un `describe` 26.2 sobre `dist/`: ningún `data-pagefind-meta` lleva `tipo`; toda página con `data-pagefind-body` lleva exactamente un `data-pagefind-filter="tipo:…"`, en su `<main>`, con el tipo de su familia (`/` portada, `/cita/` cita, `/autor/` autor, `/tema/` tema, `/coleccion/` coleccion, `/obra/` obra); ninguna sin cuerpo lo lleva; y en la portada todo elemento de `main` que no sea el `h1` ni un antepasado suyo cae bajo un `data-pagefind-ignore="all"` (o dentro de un `[data-ingreso]` con su propio `data-pagefind-ignore`), con el `h1` igual a `MARCA`.
- `tests/unit/obra-pagina.test.ts:324`, `tests/unit/coleccion-pagina.test.ts:440-482`, `tests/unit/obra-indexable.test.ts:358` -- al medio nuevo (`data-pagefind-filter="tipo:obra"` / `"tipo:coleccion"`), comentarios incluidos.
- `tests/e2e/busqueda.spec.ts` -- los dos Pagefind de mentira exportan `options`; `.de-obra` pasa a `.en-sans`; un `describe` 26.2: (a) con el Pagefind real, importado en la página y con `OPCIONES_DE_PAGEFIND`, cada uno de los ocho términos da solo resultados con `locations.length > 0` (se cargan todos sus datos); (b) buscar `MARCA` en la interfaz da `/` con rótulo «Portada», título `MARCA` en Inter y `aria-label` «Portada: Sabiduría de Bolsillo»; (c) un fragmento de cuatro o cinco palabras de la Cita del Día (leída de `/`) da su Página de Cita (el `href` de «Ver esta cita») y no `/`, y el nombre del primer Autor de la portada da su Página de Autor y no `/`; (d) con un Pagefind de mentira, los resultados de Directorio y Portada llevan su rótulo, título en Inter con peso 400 y el mismo cuerpo que el de una Cita, y su `aria-label`; uno sin tipo reconocido, «Cita».

**Acceptance Criteria:**
- Given el `dist/` de la construcción de prueba, when corre Vitest, then ningún `data-pagefind-meta` lleva `tipo`, toda página con `data-pagefind-body` lleva su tipo por el filtro exactamente una vez, y la portada solo expone su `h1`.
- Given el sitio construido y servido, when se busca «obra», «cita», «autor», «tema», «colección», «directorio», «portada» o el nombre del sitio, then ninguna página sale solo por su tipo (Playwright local), y esa prueba se ve en rojo contra el índice de antes del cambio.
- Given `/buscar/` con la medición puesta, when se mide su guion en línea, then cabe en `MAX_BYTES_DE_GUION` sin moverlo.
- Given la rama con la historia, when se construye, then no hay ruta nueva (sin ficheros nuevos en `src/pages/`, `superficies.ts` intacto) y las pruebas de `busqueda.spec.ts` de Cita, Autor, Tema, Colección y Obra pasan sin cambiar lo que miran; `npm run check` pasa.

## Spec Change Log

## Review Triage Log

### 2026-10-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las capas de revisión son externas en este bucle y no traían hallazgos en esta pasada; la
revisión independiente va después. (Pasada de cierre de la implementación, no una revisión con
hallazgos: `review_loop_iteration` cuenta solo las vueltas por `bad_spec`, y no ha habido ninguna.)

### 2026-10-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5 (high 0, medium 2, low 3)
- defer: 0
- reject: 16
- addressed_findings:
  - `[medium]` `[patch]` La exclusión de `section.del-dia` no la miraba ninguna prueba del CI: el corpus de `CORPUS_COMPLETO` no tenía ninguna Cita apta y la portada construida pintaba `p.entrada` (verification-gap). Una Cita de «Cartas a Lucilio» pasa a `aptaParaPortada: true` y la prueba de la portada exige una `section.del-dia` cubierta por un `data-pagefind-ignore="all"`; quitado el atributo, la prueba se pone en rojo (comprobado).
  - `[medium]` `[patch]` Nada hacía cumplir que todo `data-pagefind-meta` declare su peso (blind-hunter, ac-auditor 1). Nueva prueba sobre `dist/` en `publicable-y-alcanzable.test.ts`: toda clave de `data-pagefind-meta` salvo `title` está en `OPCIONES_DE_PAGEFIND.ranking.metaWeights`, y no en vacío (ve `autor`).
  - `[low]` `[patch]` La regla mezclaba puntuar y casar (blind-hunter). `AGENTS.md` y el docblock de `OPCIONES_DE_PAGEFIND` dicen ahora que un peso 0 quita la puntuación y no la coincidencia, y que un valor que no deba casar va en un filtro o bajo `data-pagefind-ignore`, nunca en un metadato.
  - `[low]` `[patch]` Un solo sitio de configuración y un solo emisor del filtro, sin prueba (ac-auditor 2; blind-hunter: el emisor solo se buscaba por el nombre de la constante y no en `public/`): `tipo-de-resultado.test.ts` exige que `data-pagefind-filter` solo aparezca en `Armazon.astro`, `metaWeights` solo en `tipoDeResultado.ts` y `.options(` solo una vez, en `buscar.astro`, en `src/` y `public/`.
  - `[low]` `[patch]` Las pruebas e2e podían pasar sin mirar (blind-hunter, ac-auditor 3 y 4, intent-alignment): (a) exige además `total > 0` para «obra», «cita», «autor», «tema» y la marca; (c) exige la `section.del-dia` con `toHaveCount(1)` en vez de saltarse su mitad con un `if`.

Rechazados, con su motivo: el `done` antes de la revisión y el `baseline_revision` reescrito
(son el flujo de este bucle: la revisión externa corre sobre un spec cerrado y la base es la
revisión de antes del código); `options()` tras `init()` (comprobado en el `pagefind.js` 1.5.2
construido: tras `init`, `options` llama a `set_ranking` sobre la instancia viva, y tras
`destroy` deja `initial_options` para la siguiente); el `data-tipo` en crudo de un tipo
desconocido (lo fija la matriz del contrato); el `ETIQUETA[tipo]` por herencia (el filtro solo lo
escribe `Armazon.astro` con un tipo de la tabla, y los 102 bytes libres no se gastan en ello);
la ventana de despliegue con fragmentos viejos (transitoria y cosmética: todo se rotula «Cita»);
la tabla de familias copiada en la prueba (que la 26.3 tenga que añadir `directorio` es lo
querido); la prueba de la portada por elementos y no por nodos de texto (el marcado no tiene texto
suelto en los antepasados del `h1`); los cinco `data-pagefind-ignore` (el contrato dice «sin
envoltorio nuevo»); `.de-obra` sin residuo (comprobado con `grep`: solo un comentario); los bytes anotados
en prosa y el rótulo `directorio` (los pide el contrato); `options()` dentro del `try` (decidido
en el contrato); los tres recorridos de `dist/` (el corpus de prueba es pequeño); la carrera de un
`destroy()` sin esperar con una búsqueda en vuelo (edge-case-hunter: hace falta que el índice
falle con dos búsquedas solapadas, el efecto es el orden de una sola búsqueda sin `autor: 0`, la
siguiente lo corrige, y la guarda cuesta bytes de los 102 libres); el rojo previo no reproducido
por el auditor (está en el parte de verificación); y el diferido de la 27.1, ya registrado.

### 2026-10-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 13 (high 0, medium 2, low 11)
- defer: 0
- reject: 25
- addressed_findings:
  - `[medium]` `[patch]` La rama de la portada sin Cita apta (`p.entrada`) no la construía ninguna prueba que mirara Pagefind (verification-gap). La regla de exposición pasa a `tests/unit/ayuda/portada.ts` (`exposicionDeLaPortada`) y la juzgan las dos construcciones: la de `CORPUS_COMPLETO` (Cita del Día) y la «sin ninguna Colección» de `coleccion-pagina.test.ts`, que no tiene Cita apta y pinta la entrada. Quitado a mano el `data-pagefind-ignore` de `p.entrada`, la prueba nueva se pone en rojo (comprobado y devuelto).
  - `[medium]` `[patch]` La e2e (c) solo miraba los 30 resultados pintados: un arranque común de la Cita del Día podía dejar el destino fuera por su puesto y una portada en el 31 pasaba (blind-hunter, edge-case-hunter, ac-auditor 1). Ahora mira la lista entera del índice real con `OPCIONES_DE_PAGEFIND` (`todasLasDirecciones`), para el fragmento y para el Autor.
  - `[low]` `[patch]` La e2e (a) aplicaba `options()` antes de `init()`, al revés que la isla, y dejaba fuera del «no en vacío» a «colección»; ahora va `init()` y `options()` antes de cada búsqueda, «colección» exige resultado y se busca también «coleccion» sin tilde, el valor del metadato de antes (blind-hunter).
  - `[low]` `[patch]` `medicion.test.ts` escribía a mano `FILTRO` y `EN_SANS`: salen de `FILTRO_DE_TIPO` y `TIPOS_CON_TITULO_EN_SANS`, y el título de la prueba dice lo que mira (blind-hunter).
  - `[low]` `[patch]` La prueba de `dist/` del tipo en metadato buscaba «tipo» en todo el valor (un título con la palabra fallaba) y la de pesos usaba `in` (heredaba de `Object.prototype`): las dos leen solo claves (`clavesDeMeta`) y la de pesos usa `Object.hasOwn` (edge-case-hunter, dos hallazgos).
  - `[low]` `[patch]` El `h1` de la portada se leía con una expresión que se rompía con cualquier etiqueta dentro: `exposicionDeLaPortada` quita las etiquetas del contenido (blind-hunter).
  - `[low]` `[patch]` Nada miraba el `og:type` de `/` en `dist/`: la prueba de la portada exige `website` (ac-auditor 4).
  - `[low]` `[patch]` La e2e (b) no miraba el peso del título de la portada con el índice real: exige 400 (intent-alignment 7).
  - `[low]` `[patch]` `AGENTS.md` no decía que un Pagefind de mentira tiene que exportar `options` (blind-hunter): la línea de «Known pitfalls» lo dice.
  - `[low]` `[patch]` Dos comentarios sin reajustar (docblock de `tipoDeOpenGraph` y el de `coleccion-pagina.test.ts`) (blind-hunter).
  - `[low]` `[patch]` El primer bloque de «Auto Run Result» y la primera entrada de este registro se leían como una revisión con cero hallazgos (blind-hunter): quedan rotulados como el cierre de la implementación, superado por las pasadas siguientes.

Rechazados, con su motivo: `sprint-status.yaml` sin tocar (lo lleva el orquestador del bucle, que
solo cambia las líneas que se le dicen); el quitacomentarios de `tipo-de-resultado.test.ts` dentro de
cadenas (ningún fichero de `src/` ni `public/` trae un glob `/*` en una cadena, y el fallo del
`.options(` ajeno sería en rojo, no en silencio); la regla de pesos limitada a lo que construye el
corpus de prueba (es lo que se puede construir; la de producción la miró el auditor a mano: solo
`autor`); la rama `data-ingreso` del ayudante (Sostener y sus Modelos no son de esta historia); el
índice de filtros sin medir (la isla no llama `pf.filters()` y el fragmento lo trae sin
descargarlo); `directorio` antes de su página, los bytes en prosa y las dos cifras de partida
(215/400 en la planificación, 249/486 sobre el índice entero en la verificación: dos medidas con su
método, las pide o las registra el contrato); las aserciones redundantes de
`tipo-de-resultado.test.ts` (fijan el contrato); el `data-tipo` en crudo y `ETIQUETA` por herencia
(decididos en la pasada anterior); las ocho divergencias de intent-alignment que no piden cambio
(la letra de la 27.1, ya diferida; la prueba (a) sobre el índice y no la interfaz, que (b) y (c)
cubren; B2 y E1, más estrictas que el criterio y queridas; el título de la portada desde su `h1`,
que la 28.1 retoma; la construcción de prueba frente a la de producción, que el auditor contó a
mano; el orden por `autor: 0`, que es el criterio; y las añadidas del contrato); y los huecos del
auditor de criterios que no piden cambio (los chips por la interfaz, que la prueba de `dist/`
cubre; Directorio con índice real, de la 26.3; la marca de varias palabras; el cuerpo contra 21 px,
que ya da `--titular-sm`; el rojo previo, en el parte; y el diferido de la 27.1, ya registrado).

## Design Notes

**Por qué un filtro.** Pagefind 1.5 busca la metadata, y `metaWeights: 0` solo quita su efecto en el orden, no la coincidencia: medido, la página sigue saliendo. Un filtro no entra en el contenido ni en la búsqueda de texto, viaja en el fragmento de cada página (`data().filters`, sin descargar el índice de filtros) y lo escribe un atributo, así que la prueba de `dist/` lo cuenta. Consecuencia para la 27: `pf.filters()` traerá también la clave `tipo`, y sus pruebas comparan clave a clave.

**Por qué `options` antes de cada búsqueda.** El `destroy()` del reintento de la 23.8 deja `initial_options` en `undefined`; con `options` solo en `cargar`, la instancia nueva buscaría sin pesos. Llamarlo antes de cada `search` cubre la primera carga y el reintento sin volver a importar (la prueba de 3690-3710 exige una sola importación).

**El bloque compartido** sustituye al de Obra y es lo que hace caber la historia (medido en la planificación: −102 B sobre el bloque de hoy, +189 B de constantes y llamada):

```js
const t = dato.meta?.title;
titulo.textContent = t || dato.url;
a.append(clase, titulo);
if (EN_SANS.includes(tipo)) {
  titulo.classList.add('en-sans');
  const autor = tipo === 'obra' && typeof dato.meta?.autor === 'string' ? dato.meta.autor.trim() : '';
  if (autor !== '') { /* la línea .r-autor, como hoy */ }
  if (t) a.setAttribute('aria-label', ETIQUETA[tipo] + ': ' + t + (autor !== '' ? ', de ' + autor : ''));
}
```

**`autor: 0`.** El metadato `autor` de la Obra existe para pintar la línea del resultado (22.7) y su texto ya está en el cuerpo indexado; la 27.1 da la misma razón para el de la Cita, que usa el mismo campo.

## Verification

**Commands:** desde `/Users/hec/brainlySabiduria/.claude/worktrees/v8-epicas-24-26`; lo que pase de ~8 min, con `/Users/hec/brainlySabiduria/.claude/v8-ralph/correr.sh /Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-24-26/26-2-<nombre>.log /Users/hec/brainlySabiduria/.claude/worktrees/v8-epicas-24-26 <orden>` y llamadas sucesivas a `/Users/hec/brainlySabiduria/.claude/v8-ralph/esperar.pl <log> 540`.
- Antes de tocar el código: el `describe` 26.2 (a) de `tests/e2e/busqueda.spec.ts` contra el sitio de hoy -- rojo en «obra» y «cita».
- `npx vitest run tests/unit/tipo-de-resultado.test.ts tests/unit/tipo-de-open-graph.test.ts` -- verde.
- Uno a uno (en segundo plano): `publicable-y-alcanzable`, `medicion` (el parte de bytes de `/buscar/` va al comentario de `umbrales.ts`), `obra-pagina`, `coleccion-pagina`, `obra-indexable`, `ingreso-construido` -- `FINISHED EXIT=0`.
- `npm run check` -- 0 errores. `npm test` en segundo plano (≈16 min) -- `FINISHED EXIT=0`.
- `npx playwright test tests/e2e/busqueda.spec.ts tests/e2e/receptor.spec.ts` (los dos proyectos; construye con `tests/servidor.mjs`, puertos 4321 y 8787) en segundo plano -- verde. Parar todo servidor arrancado.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Resumen.** El tipo de un resultado de la búsqueda propia deja de viajar como metadato de
Pagefind —que desde la 1.5 se busca— y pasa a ser un filtro (`data-pagefind-filter="tipo:…"`)
en el `<main>` del armazón, su único emisor. `/buscar/` lo lee de `data().filters`, aplica
`OPCIONES_DE_PAGEFIND` (`autor: 0`) antes de cada `search()` y pinta Obra, Directorio y Portada
con el bloque compartido (`.en-sans`, `aria-label` «{rótulo}: {título}», el «, de {Autor}» solo
en Obra). La portada declara `tipo="portada"` y solo indexa su `h1` (la marca): la Cita del Día,
la entrada y las secciones de Temas, Colecciones y Autores van bajo `data-pagefind-ignore="all"`.

**Ficheros.**
- `src/lib/tipoDeResultado.ts` — `directorio` y `portada` en la tabla; `FILTRO_DE_TIPO`,
  `TIPOS_CON_TITULO_EN_SANS` y `OPCIONES_DE_PAGEFIND`, con su docblock.
- `src/components/Armazon.astro` — el filtro en `<main>` solo con `data-pagefind-body` y tipo;
  sin `data-pagefind-meta`.
- `src/pages/buscar.astro` — constantes por `guionQueAnuncia`, lectura del filtro, `options`
  antes de cada búsqueda, bloque compartido, `.titulo.en-sans` y la cabecera al día.
- `src/pages/index.astro` — `tipo="portada"` y los cinco `data-pagefind-ignore="all"`.
- `src/lib/umbrales.ts` — la medida de `/buscar/` tras la 26.2 en el comentario del tope.
- `AGENTS.md` — la línea de «Known pitfalls» sobre el filtro y `OPCIONES_DE_PAGEFIND`.
- `tests/unit/tipo-de-resultado.test.ts` (nuevo) — tabla, sans, opciones, un emisor y un lector,
  ningún `data-pagefind-meta` con `tipo` en `src/` ni `public/`.
- `tests/unit/ayuda/busqueda.ts` — el índice de mentira con `options`, `llamadas()`, `filters`,
  `datos` por respuesta y el accesor `resultados()`.
- `tests/unit/medicion.test.ts` — `describe` 26.2 en la isla ejecutada: la matriz de pintado y
  `options` antes de cada `search`, también tras `destroy()`.
- `tests/unit/publicable-y-alcanzable.test.ts` — `describe` 26.2 sobre `dist/`: ningún meta con
  tipo, un filtro por página con cuerpo y en `<main>` con el tipo de su familia, ninguno sin
  cuerpo, y la portada solo con su `h1` = `MARCA` fuera de `data-pagefind-ignore`.
- `tests/unit/obra-pagina.test.ts`, `coleccion-pagina.test.ts`, `obra-indexable.test.ts`,
  `tipo-de-open-graph.test.ts` — al medio nuevo; `directorio` y `portada` dan `website`.
- `tests/e2e/busqueda.spec.ts` — los Pagefind de mentira exportan `options`; `.de-obra` pasa a
  `.en-sans`; `describe` 26.2 con (a) los ocho términos contra el índice real, (b) la portada
  por su nombre, (c) la Cita del Día y un Autor dan su página y no `/`, (d) Directorio y Portada
  con un Pagefind de mentira.

**Revisión de la implementación** (antes de la revisión externa; la superan las pasadas de
abajo, y el `followup_review_recommended` del frontmatter es el de la última). Parches aplicados:
0. Diferidos nuevos: 0. Rechazados: 0 (capas externas sin hallazgos en esta pasada).
Recomendación de revisión de seguimiento en esa pasada: `false` (0 parches; puntuación 0).

**Verificación.**
- Rojo antes del cambio: el `describe` 26.2 (a) contra el sitio construido con `Armazon.astro`,
  `index.astro` y `buscar.astro` de la base (`f8f103d26d`) falla — «obra» 249 de 486 sin el
  término, «cita» 4.415 de 4.559, «autor» 108 de 207, «tema» 8 de 451, «colección» 16 de 17.
- `npx vitest run tests/unit/tipo-de-resultado.test.ts tests/unit/tipo-de-open-graph.test.ts` — 12 verdes.
- Uno a uno en segundo plano: `publicable-y-alcanzable` (33), `medicion` (514), `obra-pagina`
  (66), `coleccion-pagina` (34), `obra-indexable` (41), `ingreso-construido` (38) — `FINISHED EXIT=0`.
- Parte de bytes: `/buscar/` 6.554 B en línea con la medición puesta (102 libres de 6.656);
  la Página de Cita con Imagen sigue en 5.630.
- `npm run check` — 0 errores, 0 avisos.
- `npm test` — 138 ficheros, 6.343 pruebas, `FINISHED EXIT=0`.
- `npx playwright test tests/e2e/busqueda.spec.ts tests/e2e/receptor.spec.ts` (los dos
  proyectos) — 108 verdes, 64 saltadas (las de siempre: el receptor en móvil y el Tema bajo
  umbral), `FINISHED EXIT=0`; las ocho pruebas 26.2 verdes en los dos proyectos. Ningún
  servidor queda en pie.

**Riesgos residuales.**
- `/buscar/` queda con 102 bytes libres bajo `MAX_BYTES_DE_GUION`: lo que añada la Épica 27
  tiene que subir el tope o compactar, como ya decía el comentario de `umbrales.ts`.
- `pf.filters()` traerá la clave `tipo` cuando la 27 lo use, y sus pruebas deben compararlo
  clave a clave (Design Notes).
- Sigue el diferido para Héctor sobre la letra del criterio de la 27.1 (frontmatter).

### Revisión externa, primera pasada (2026-10-28)

**Resumen.** Cinco parches, todos en las pruebas y en la documentación; el código del sitio no
cambia (solo el docblock de `OPCIONES_DE_PAGEFIND`). La portada de la construcción de prueba pinta
ya la Cita del Día y la prueba de `dist/` exige que quede fuera del índice; todo
`data-pagefind-meta` construido declara su peso; un solo emisor del filtro y un solo sitio que
configura Pagefind, en `src/` y `public/`; y las dos pruebas e2e que podían pasar sin mirar ya no.

**Ficheros.**
- `tests/unit/publicable-y-alcanzable.test.ts` — una Cita de `CORPUS_COMPLETO` apta para portada;
  la prueba de la portada exige `section.del-dia` bajo un `data-pagefind-ignore="all"`; prueba
  nueva: toda clave de `data-pagefind-meta` salvo `title` tiene peso en `OPCIONES_DE_PAGEFIND`.
- `tests/unit/tipo-de-resultado.test.ts` — `data-pagefind-filter` solo en `Armazon.astro`,
  `metaWeights` solo en `tipoDeResultado.ts`, `.options(` una vez y solo en `buscar.astro`.
- `tests/e2e/busqueda.spec.ts` — (a) exige resultados para «obra», «cita», «autor», «tema» y la
  marca; (c) exige la Cita del Día en vez de saltarse su mitad.
- `src/lib/tipoDeResultado.ts`, `AGENTS.md` — un peso 0 quita la puntuación, no la coincidencia.

**Revisión.** Parches aplicados: 5 (high 0, medium 2, low 3). Diferidos nuevos: 0. Rechazados: 16.
Recomendación de revisión de seguimiento: `true` (puntuación 3 × 2 + 3 = 9).

**Verificación.**
- `npx vitest run tests/unit/tipo-de-resultado.test.ts` — 9 verdes; `tipo-de-open-graph` — 4 verdes.
- `npx vitest run tests/unit/publicable-y-alcanzable.test.ts` — 34 verdes. Con el
  `data-pagefind-ignore` quitado a mano de `section.del-dia`, la prueba de la portada se pone en
  rojo (comprobado y devuelto con `git checkout`).
- `npm run check` — 0 errores, 0 avisos.
- `npm test` en segundo plano — 138 ficheros, 6.345 pruebas, `FINISHED EXIT=0`.
- `npx playwright test tests/e2e/busqueda.spec.ts tests/e2e/receptor.spec.ts` — 108 verdes, 64
  saltadas (las de siempre), `FINISHED EXIT=0`; las cuatro pruebas 26.2 verdes en los dos
  proyectos. Puertos 4321, 4399, 4400, 4402 y 8787 libres al terminar.
- No se repitió el rojo previo al cambio: los parches son de pruebas y no tocan el medio.

**Riesgos residuales.**
- La carrera de un `destroy()` sin esperar con una búsqueda en vuelo puede dejar una búsqueda sin
  `autor: 0` (solo su orden); se rechazó por los 102 bytes libres de `/buscar/`.
- La prueba (c) depende de que un fragmento de cinco palabras de la Cita del Día la devuelva entre
  los 30 primeros; con la Cita del día de cada jornada puede variar.


### Revisión externa, segunda pasada (2026-10-28)

**Resumen.** Trece parches, todos en pruebas, comentarios y documentación; el código del sitio no
cambia. La regla «la portada solo expone su `h1`» vive en un ayudante y la juzgan las dos ramas de
la portada —con Cita del Día y con la entrada—; la e2e (c) mira la lista entera del índice real y
no las 30 pintadas; la (a) aplica las opciones en el orden de la isla; las pruebas de `dist/` leen
claves de metadato y no valores, y miran el `og:type` de `/`.

**Ficheros.**
- `tests/unit/ayuda/portada.ts` (nuevo) — `exposicionDeLaPortada` y `conClase`: la regla de
  exposición de la portada y el texto del `h1` sin etiquetas dentro.
- `tests/unit/publicable-y-alcanzable.test.ts` — usa el ayudante; `clavesDeMeta` y
  `Object.hasOwn`; `og:type` `website` en `/`.
- `tests/unit/coleccion-pagina.test.ts` — la rama sin Cita apta: `p.entrada` fuera del índice y el
  `h1` igual a `MARCA`; un comentario reajustado.
- `tests/unit/medicion.test.ts` — `FILTRO` y `EN_SANS` derivados de `tipoDeResultado.ts`.
- `tests/e2e/busqueda.spec.ts` — (a) `init()` y `options()` antes de cada búsqueda, «coleccion»
  sin tilde y «colección» no vacía; (b) peso 400; (c) `todasLasDirecciones` sobre el índice entero.
- `src/lib/tipoDeResultado.ts` — docblock de `tipoDeOpenGraph` reajustado (solo comentario).
- `AGENTS.md` — un Pagefind de mentira exporta `options`.

**Revisión.** Parches aplicados: 13 (high 0, medium 2, low 11). Diferidos nuevos: 0. Rechazados: 25.
Recomendación de revisión de seguimiento: `true` (puntuación 3 × 2 + 11 = 17).

**Verificación.**
- `npx vitest run tests/unit/tipo-de-resultado.test.ts tests/unit/tipo-de-open-graph.test.ts` — 13 verdes.
- Uno a uno en segundo plano: `publicable-y-alcanzable` (34), `coleccion-pagina` (35), `medicion`
  (514) — verdes; `npm run check` — 0 errores, 0 avisos (8 sugerencias viejas, ajenas).
- Con el `data-pagefind-ignore` quitado a mano de `p.entrada`, la prueba nueva de
  `coleccion-pagina.test.ts` se pone en rojo (comprobado y devuelto con `git checkout`).
- `npm test` en segundo plano — 138 ficheros, 6.347 pruebas, `FINISHED EXIT=0`.
- `npx playwright test tests/e2e/busqueda.spec.ts tests/e2e/receptor.spec.ts` — 108 verdes, 64
  saltadas (las de siempre), `FINISHED EXIT=0`; las cuatro pruebas 26.2 verdes en los dos
  proyectos. Puertos 4321, 4399, 4400, 4402 y 8787 libres al terminar.

**Riesgos residuales.**
- La carrera de un `destroy()` sin esperar con una búsqueda en vuelo sigue rechazada por los 102
  bytes libres de `/buscar/`.
- Directorio solo se mira con un índice de mentira hasta que la 26.3 construya sus páginas.
