---
title: 'Historia 26.2 — El tipo de un resultado no casa como texto, y la portada tiene el suyo'
type: 'feature'
created: '2026-10-26'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
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

Status: ready-for-dev
Blocking condition: ninguna. Planificación terminada (se pidió parar tras planificar); un diferido para Héctor en el frontmatter (letra del criterio de la 27.1, bmad-create-epics-and-stories).
