---
title: 'Historia 24.3 — Cada Cita de un listado dice de qué obra es'
type: 'feature'
created: '2026-10-26'
status: 'done'
baseline_revision: '2e877a2304d04541b05d230931c7da505d6c438d'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-24-context.md'
warnings:
  - oversized
deferred:
  - summary: >-
      La relación de `tools/lib/cambios.ts` no cuenta la ficha de Obra en los listados de Tema, Colección y Autor, que desde la 24.3 pintan su título: retitular una Obra no refecha esos listados en el sitemap ni los avisa `tools/avisar.ts`.
    evidence: |-
      `relacionDeSuperficies` declara la ficha de Obra solo en la Página de Cita y en la de Obra, y la Tarjeta de Cita de los listados pinta `cita.obra.titulo` desde la 24.3. Hasta que se cierre, `titular`, `reunir`, `restituir-grafia` o `documentar` cambian el HTML de esos listados sin mover su `lastmod` ni avisarlos. El contrato de la 24.3 prohíbe tocar la relación, y la Historia 24.8 de `epics.md` lo asigna allí: «Given los listados de Tema, Colección y Autor / When se fechan / Then cuentan también con la ficha de Obra de cada una de sus Citas, porque sus Tarjetas pintan su título desde la 24.3». Lo señalaron blind-hunter, edge-case-hunter e intent-alignment en la revisión del 2026-10-26.
    location: >-
      tools/lib/cambios.ts (relacionDeSuperficies, la declaración de los listados de Tema, Colección y Autor)
    severity: medium
---

<intent-contract>

## Intent

**Problem:** La Tarjeta de Cita de los listados enseña el fragmento y, a veces, el Autor, pero nunca de qué Obra sale, así que quien recorre un Tema, un Autor o una Colección tiene que abrir cada Cita para saberlo; y el componente decide si pinta el Autor por la presencia de un `autor?` opcional, sin que ningún uso declare qué atribución lleva.

**Approach:** `TarjetaDeCita.astro`, la única tarjeta (AD-19), gana una prop obligatoria `atribucion` con un conjunto cerrado —`'autor-y-obra' | 'obra' | 'ninguna'`, sin valor por omisión— y pinta bajo el fragmento, y bajo el Autor si lo lleva, el título de su Obra resuelta (`cita.obra.titulo`) como texto, con un «, » solo para lectores entre partes. Tema y Colección declaran `autor-y-obra`; Autor, `obra`; Obra, `ninguna`.

## Boundaries & Constraints

**Always:**
- Un solo componente, sin tamaño compacto ni variante: `Props` sigue siendo `interface Props` con `zona: Zona` obligatoria (lo exige `tests/unit/medicion.test.ts:3033`) y gana `atribucion` obligatoria; `autor?: Autor` se queda solo para `autor-y-obra`.
- `autor-y-obra` sin `autor` para el build con un error que nombra el slug de la Cita y `autor-y-obra` (la integridad del conjunto garantiza que el Autor resuelve: nunca una tarjeta sin el Autor que su contexto declara). Con `obra` o `ninguna` el componente no lee `autor`, y ningún uso se lo pasa.
- La línea de Obra sale de `cita.obra?.titulo` y de nada más; sin `cita.obra`, no hay línea, ni hueco, ni «Sin obra documentada», ni coma.
- Línea de Obra en `var(--sans)`, `var(--pie)`, peso 400, interlineado 1,5, `var(--tinta-apagada)`, sin `text-transform` ni `letter-spacing`; parte palabras antes que desbordar; sin `white-space: nowrap`, `text-overflow`, `line-clamp` ni `overflow: hidden`. A `var(--unidad)` de la parte anterior (el `gap` que ya tiene el enlace).
- Un único `<a>` por tarjeta, a `rutaDeCita(cita.slug)`, con la zona en el `<li>` como hoy, 44 px mínimos y el fondo a `var(--contenedor-bajo)` al pasar el cursor. El recorte del fragmento (120) no cambia.
- La pausa: un `<span class="solo-para-lectores">, </span>` (clase global de `tokens.css`) entre cada parte visible y la siguiente; ninguno al final ni en una tarjeta de una sola parte.
- La indexabilidad y la congelación no alcanzan a la tarjeta: el título va igual en una Obra `noindex` o congelada fuera.

**Block If:**
- Hacer que `astro check` rechace un uso sin `atribucion` exigiera abandonar `interface Props` o la prop `zona: Zona` de la 23.7.
- Cumplir el contrato exigiera tocar `src/lib/vocabulario.ts` (mueve la huella de AD-14) o un artefacto de `_bmad-output/planning-artifacts/` o `_bmad-output/specs/`.

**Never:**
- Un segundo enlace en la tarjeta, ni enlazar la Obra.
- Escribir en `src/` la cadena `procedencia.obra` ni sus variantes, **tampoco en comentarios**: la prueba de la 22.3 (`tests/unit/obras.test.ts:1053`) lee el fichero entero.
- Tocar la relación de `tools/lib/cambios.ts` (los listados ganan la ficha de Obra en la 24.8), `RutasDeSalida.astro` y sus hermanas (24.6), la Tarjeta de Obra (24.4) o los marcadores de Pagefind de los listados.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tema o Colección, con Obra | `atribucion="autor-y-obra"`, Cita con Obra | fragmento, Autor, título; lector: `«…», Séneca, Sobre la brevedad de la vida` | — |
| Tema o Colección, sin Obra | `autor-y-obra`, sin `cita.obra` | fragmento, Autor; lector `«…», Séneca` | — |
| Autor, con Obra | `atribucion="obra"` | fragmento, título; lector `«…», Cartas a Lucilio` | — |
| Autor, sin Obra | `obra`, sin `cita.obra` | solo el fragmento, sin coma | — |
| Listado de Obra | `atribucion="ninguna"` | solo el fragmento, sin coma, sin Autor ni título | — |
| Título más largo que 120 | Obra de título de 125 caracteres | el título entero, sin «…» | — |
| Obra `noindex` o congelada fuera | Cita de esa Obra en un Tema | el título igual que en una indexable | — |
| Autor que falta | `autor-y-obra` con `autor={undefined}` | — | el build se para nombrando la Cita y `autor-y-obra` |

</intent-contract>

## Code Map

- `src/components/TarjetaDeCita.astro:16-47` -- `Props` (`cita`, `autor?`, `zona`), recorte del fragmento 34-38, marcado `li.tarjeta[data-zona] > a > span.fragmento + span.autor`; estilos 49-90 (`.tarjeta a` en flex columna con `gap: var(--unidad)`, `.autor` en `--autor` y versalitas). Docblock cita UX-DR11: pasa a UX-DR70.
- `src/pages/tema/[slug]/[...page].astro:67` -- `<TarjetaDeCita cita autor={autores.get(cita.autor)} zona="listado" />`; docblock 10-11 habla de la tarjeta con Autor.
- `src/pages/coleccion/[slug]/[...page].astro:143` -- igual que el Tema; docblock 26-27.
- `src/pages/autor/[slug]/[...page].astro:141` -- sin `autor`.
- `src/pages/obra/[autor]/[slug]/[...page].astro:169-171` -- `autor={undefined}` y comentario UX-DR40.
- `src/lib/publicado.ts:69` (`Cita.obra?: ObraResuelta`), `:676` (`verificarIntegridad`: toda Cita resuelve su Autor), `:926-927` (`colgarObras` cuelga la Obra a toda Cita del conjunto, también a las de las Colecciones); `src/lib/obras.ts:704-709` (`ObraResuelta.titulo`, el título efectivo de la ficha).
- `src/styles/tokens.css:187` -- `.solo-para-lectores`, global (lo carga `Armazon.astro:20`); tokens `--pie`, `--tinta-apagada`, `--sans`, `--unidad`, `--contenedor-bajo`.
- `src/components/ListaDeObras.astro:59-64` -- precedente de la pausa oculta dentro de una fila de bloque.
- `tools/lib/cambios.ts:39-44` y `:193-197` -- comentarios que afirman que `TarjetaDeCita` no lleva la Obra; la relación no se toca.
- `AGENTS.md`, sección «La obra se llama igual en todas partes (Historia 22.3)» -- lista de superficies que pintan `cita.obra.titulo`.
- Pruebas que deben seguir verdes: `tests/unit/medicion.test.ts:3033-3051` (Props con `zona: Zona` y la importación de `Zona`), `tests/unit/obras.test.ts:1053` (22.3), `tests/unit/coleccion-pagina.test.ts:185-205` (el `<li>` de la Colección es idéntico al del Tema; `span.autor` con texto plano), `tests/unit/obra-pagina.test.ts:425-435,488-489` (listado de Obra sin `class="autor"` ni el título), `tests/unit/paginacion.test.ts:55` (`<li class="tarjeta"`), `tests/unit/ingreso-construido.test.ts:918` (la línea de importación de la página de Tema, intacta). E2E: `tests/e2e/coleccion.spec.ts:150-165` (en `main` solo `h1` y `span.fragmento` en serif), `tests/e2e/pagina-de-autor.spec.ts:52-64`, `tests/e2e/pagina-de-tema.spec.ts:30` (`.listado li .autor`), `tests/e2e/accesibilidad.spec.ts:540` (sin desplazamiento a 360 px en las superficies derivadas).
- Andamio de pruebas: `tests/unit/ayuda/construir.ts` (`construirConCorpus`, `citaValida`, `coleccionValida`, `AUTOR_VALIDO`, `TEMA_VALIDO`, `paginaConstruida`; las fichas de Obra se siembran solas; un `pendientes-de-cotejo.yml` en el fixture apaga los documentos automáticos), `tools/lib/documento.ts` (`componerDocumento`, `nombreDeDocumento:2387`), patrón de censo y documentos a mano en `tests/unit/lista-de-obras.test.ts:117-190`; construcción con congelación en `tests/unit/obra-pagina.test.ts:1165-1209`.

## Tasks & Acceptance

**Execution:**
- `src/components/TarjetaDeCita.astro` -- añadir `atribucion: 'autor-y-obra' | 'obra' | 'ninguna'` obligatoria a `interface Props` (docblock con los seis usos: Tema, Colección, Autor, «Más de {Autor}», Obra, «De la misma obra»), la guarda que para el build, la línea `span.obra` y las pausas según Design Notes, y la regla `.obra`; actualizar el docblock a UX-DR70 -- el contrato entero vive en el único componente.
- `src/pages/tema/[slug]/[...page].astro`, `src/pages/coleccion/[slug]/[...page].astro` -- `atribucion="autor-y-obra"` con el `autor` de hoy; docblocks a «Autor y Obra» -- FR-6, FR-26.
- `src/pages/autor/[slug]/[...page].astro` -- `atribucion="obra"` -- FR-4.
- `src/pages/obra/[autor]/[slug]/[...page].astro` -- `atribucion="ninguna"` y quitar `autor={undefined}`; comentario: ni Autor ni título, que dice la Cabecera -- FR-51.
- `tools/lib/cambios.ts` -- solo los dos comentarios: los listados pintan el título de la Obra desde la 24.3 y su relación lo recoge la 24.8 (AD-27).
- `AGENTS.md` -- en la sección 22.3, añadir la Tarjeta de Cita de los listados de Tema, Colección y Autor a las superficies que nombran la obra por `cita.obra.titulo`, y una línea con el conjunto cerrado de `atribucion` por uso.
- `tests/unit/tarjeta-de-cita.test.ts` (nuevo) -- **sin construir:** `Props` (TypeScript sobre el frontmatter, como `medicion.test.ts:3033`) trae `atribucion` sin `?` y con exactamente esos tres literales, la desestructuración no le da valor por omisión, y no hay más miembros que `cita`, `atribucion`, `autor`, `zona`; todo `<TarjetaDeCita` de `src/` declara `atribucion` con un literal del conjunto, pasa `autor=` solo con `autor-y-obra`, y en las cuatro páginas declara el que toca; la regla `.obra` cumple la tipografía y no lleva nada que recorte (como `lista-de-obras.test.ts:102-115`). **Una construcción que falla**, con el corpus mínimo (`citaValida()`, `AUTOR_VALIDO`, `TEMA_VALIDO`) y una sonda `paginas: { 'sonda-tarjeta.astro': … }` sin armazón que pinta la primera Cita con `atribucion="autor-y-obra" autor={undefined}`: código distinto de 0 y la salida nombra el slug y `autor-y-obra`. **Una construcción** (fixture en Design Notes): en todas las páginas de `/tema/el-tiempo/`, de la Colección, de `/autor/seneca/` y `/autor/antonio-machado/`, y de las Páginas de Obra, cada `li.tarjeta` del `ul.listado` tiene un solo `<a`, a `/cita/{slug}/`; sus partes visibles (`.fragmento`, `.autor`, `.obra`, en ese orden) son las de su contexto y su Cita; el texto para lectores (sin etiquetas, con lo `.solo-para-lectores`, espacios colapsados) es exactamente las partes unidas por «, »; cada Cita del Tema y del Autor aparece una vez entre todas sus páginas; el título de 125 caracteres sale entero; `/obra/seneca/de-la-ira/` lleva `noindex` y su Cita dice «De la ira» en el Tema; ninguna página contiene «Sin obra documentada» dentro de un listado -- la prueba de la historia.
- `tests/unit/obra-pagina.test.ts` -- en la construcción con congelación (1165), un `it` 24.3: en `/tema/la-vida/` las tarjetas de `seneca-cartas-0…2` (Obra congelada fuera, `noindex`) llevan `Cartas a Lucilio` en su `.obra` y las de `seneca-brevedad-*`, `Sobre la brevedad de la vida` -- la congelación no alcanza a la navegación, sin construcción nueva.

**Acceptance Criteria:**
- Given el repositorio con la historia, when corre `npm run check`, then pasa sin errores, y un `<TarjetaDeCita>` sin `atribucion`, o con un valor fuera del conjunto, es un error de tipos (lo fijan la prueba estructural sobre `Props` y una pasada de `astro check` sobre una sonda con los dos usos rotos y uno bueno, en `tarjeta-de-cita.test.ts`).
- Given el `dist/` de la construcción de prueba, when se lee la Tarjeta de Cita de cualquiera de los cuatro listados, en cualquiera de sus páginas, then lleva exactamente lo que dice su contexto, la Obra como texto y un solo enlace, y la prueba de zonas de la 23.7 (`medicion.test.ts`) sigue pasando sin tocarla.
- Given la suite de Vitest, when corren `tarjeta-de-cita`, `obra-pagina`, `coleccion-pagina`, `obras`, `medicion`, `paginacion`, `lista-de-obras` e `ingreso-construido`, then pasan, y `obras.test.ts` (22.3) sin permitidos nuevos.
- Given el sitio construido, when corren las pruebas locales de Playwright de Tema, Autor, Colección y accesibilidad, then pasan: ningún elemento nuevo va en serif y ninguna superficie desborda a 360 px.

## Spec Change Log

## Review Triage Log

### 2026-10-26 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

Las capas de revisión son externas (bucle v8-ralph) y en esta pasada no traen hallazgos: la revisión independiente viene después.

### 2026-10-26 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 12 (high 0, medium 0, low 12)
- defer: 1 (high 0, medium 1, low 0)
- reject: 16
- addressed_findings:
  - `[low]` `[patch]` AGENTS.md y el docblock de `TarjetaDeCita.astro` daban «Más de {Autor}» (`obra`) y «De la misma obra» (`ninguna`) como usos de hoy: ahora dicen que los pinta `RutasDeSalida.astro` con su propio marcado y que la 24.6 los pasa a la tarjeta.
  - `[low]` `[patch]` AGENTS.md (22.3) decía «la Tarjeta» junto a «la Tarjeta de Cita de los listados» y le atribuía el año: ahora es «la Tarjeta Social», y la de los listados lleva el título sin año.
  - `[low]` `[patch]` El error de `autor-y-obra` sin Autor nombra además la ruta que se construye (`Astro.url.pathname`) y el Autor que declara la Cita (`cita.autor`).
  - `[low]` `[patch]` `atribucion` fuera del conjunto —o ausente, que `astro build` no comprueba tipos— se pintaba en silencio como `obra`: una guarda para el build nombrando la Cita, la ruta y el valor, con su construcción que falla en `tarjeta-de-cita.test.ts` (comprobada por mutación).
  - `[low]` `[patch]` El escáner de usos de `tarjeta-de-cita.test.ts` lee la etiqueta de apertura entera (comillas y llaves, se cierre sola o no), quita comentarios, no confunde `data-autor=` con `autor=`, mira también `.mdx`, exige que todo fichero con un uso esté en `ESPERADA` y se prueba a sí mismo sobre usos inventados.
  - `[low]` `[patch]` La prueba de la regla `.obra` mira toda regla que alcance a `.obra` (`a:hover .obra`, un `@media`), no solo la primera.
  - `[low]` `[patch]` La prueba 24.3 de `obra-pagina.test.ts` recorre todas las páginas de `/tema/la-vida/`, exige el `ul.listado` y compara el conjunto exacto de slugs y títulos en vez de contar 20 en la página 1.
  - `[low]` `[patch]` Ninguna prueba distinguía el título de la ficha de la grafía de la Cita: `obra-construida.test.ts`, la única construcción con dos grafías, lee el listado de `/autor/seneca/` y exige el título de la ficha en las dos Tarjetas y nunca la otra grafía (comprobada por mutación: leyendo la Procedencia, falla).
  - `[low]` `[patch]` La Colección de la construcción de `tarjeta-de-cita.test.ts` pasa a 57 miembros en un orden declarado que no es el de ningún criterio, así que también se comprueba su página 2.
  - `[low]` `[patch]` La tipografía, el hueco y el desborde de la línea de Obra solo se medían a mano: `pagina-de-autor.spec.ts` (24.3) mide a 320 px, en la página de Autor que lleva la Obra de título más largo del Corpus (derivada), familia, color y cuerpo contra los tokens de la página, peso 400, sin versalitas ni espaciado, `--unidad` bajo el fragmento, varias líneas y nada que desborde.
  - `[low]` `[patch]` Chromium calcula el nombre de la tarjeta con un espacio delante de cada coma («…» , Séneca , Obra) porque las partes son bloques flexibles: el comentario del marcado lo dice en vez de prometer lo contrario, y `pagina-de-tema.spec.ts` (24.3) fija lo que importa en todas las tarjetas de `/tema/la-vida/`: las partes visibles, en su orden, separadas por comas y sin ninguna palabra más.
  - `[low]` `[patch]` Los riesgos residuales decían que la comprobación de serif de `coleccion.spec.ts` no corre; el Corpus publica hoy Colecciones y corre y pasa: corregido en el Auto Run Result.

### 2026-10-26 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 21 (high 0, medium 0, low 21)
- defer: 0
- reject: 6
- addressed_findings:
  - `[low]` `[patch]` (blind-hunter) La guarda no distinguía la ausencia de `atribucion` —el caso para el que existe— de un valor ajeno: dice «sin `atribucion`», y una construcción de prueba sin el atributo lo fija (comprobada por mutación).
  - `[low]` `[patch]` (blind-hunter, edge-case-hunter) La lista de la guarda era un `string[]` suelto: ahora `as const satisfies readonly Props['atribucion'][]`, y una prueba exige que tenga los mismos literales que la unión (comprobada por mutación).
  - `[low]` `[patch]` (blind-hunter, edge-case-hunter) Con `autor-y-obra`, un Autor que no es el que declara la Cita detiene la construcción nombrando los dos, con su construcción de prueba (comprobada por mutación). Con `obra` y `ninguna` el componente sigue sin leer `autor`, como dice el contrato; lo vigila el escáner de usos.
  - `[low]` `[patch]` (blind-hunter) El escáner de usos sigue la importación por defecto con cualquier nombre, mira solo la plantilla (el frontmatter no pinta), admite comillas simples, distingue un valor entre llaves y se niega ante una importación que no sabe seguir; su prueba lo comprueba sobre usos inventados.
  - `[low]` `[patch]` (blind-hunter) El comentario de `cambios.ts` sobre la Obra en los listados estaba en la declaración de la Página de Cita: pasa junto a la de los listados de Autor, Tema y Colección y dice el hueco hasta la 24.8 (el aplazado del frontmatter sigue).
  - `[low]` `[patch]` (blind-hunter, edge-case-hunter, ac-auditor) `pagina-de-autor.spec.ts` (24.3) elige la Cita por el título que pinta la Tarjeta —resuelto con `colgarObras`, la función del build, no por la grafía— y lo compara al pie de la letra; recorre solo las páginas que el Autor tiene y exige la Tarjeta una vez; decide si el título parte por su ancho natural contra la caja, no por 60 caracteres; y comprueba que la cara Inter del sitio está cargada.
  - `[low]` `[patch]` (blind-hunter, ac-auditor, intent-alignment) A 320 px, `pagina-de-tema.spec.ts` mide `--unidad` bajo el fragmento y bajo el Autor en cada Tarjeta con Autor y Obra, y que nada desborda; el nombre accesible se comprueba en las siete páginas del Tema, en todas las Colecciones publicadas y en un listado de Autor (`tests/e2e/ayuda/tarjetas.ts`).
  - `[low]` `[patch]` (blind-hunter) El nombre accesible ya no ignora mayúsculas entero: solo la parte del Autor, letra a letra; el fragmento y el título, al pie de la letra.
  - `[low]` `[patch]` (blind-hunter) Un solo lector de Tarjetas construidas, `tests/unit/ayuda/listado.ts`, que decodifica entidades; lo usan `tarjeta-de-cita`, `obra-construida` y `obra-pagina`.
  - `[low]` `[patch]` (blind-hunter) `autorDe` y `textoDe` salen de un `campoDeCita` que lanza nombrando la Cita y el campo que falta.
  - `[low]` `[patch]` (blind-hunter) El fixture lee `LARGO_DE_FRAGMENTO` del componente en vez de fijar 125 frente a 120, y una segunda Cita sin Obra del mismo Autor ya no pisaría la primera (el fichero sale del slug y se niega a repetirse).
  - `[low]` `[patch]` (blind-hunter) El marcado recorre una lista de partes: la regla «una pausa delante de cada parte que sigue al fragmento» está escrita una vez.
  - `[low]` `[patch]` (blind-hunter) AGENTS.md y el docblock dicen «detiene la construcción» en vez de «para el build».
  - `[low]` `[patch]` (blind-hunter) El docblock de `obra-construida.test.ts` dice «la Tarjeta Social» donde ya convivía con la Tarjeta de Cita.
  - `[low]` `[patch]` (blind-hunter) El Auto Run Result registra el commit que cerró la primera pasada con su identificador completo.
  - `[low]` `[patch]` (edge-case-hunter) La prueba de la hoja niega `overflow`, `overflow-x/-y`, `max-height`, `max-block-size`, `contain` y `text-overflow` en toda regla del componente —el `li` y el `a` también—, no solo en las que alcanzan a `.obra`.
  - `[low]` `[patch]` (intent-alignment, ac-auditor) `astro check` se corre de verdad: `tarjeta-de-cita.test.ts` lo pasa sobre la copia de una construcción con una sonda de tres usos y exige error en el que no declara `atribucion` y en el de `"otra"`, y ninguno en el bueno (comprobada por mutación con `atribucion?:`). El criterio de aceptación del spec lo nombra.
  - `[low]` `[patch]` (intent-alignment, ac-auditor) El nombre accesible con un espacio delante de cada coma queda decidido en Design Notes («El nombre que calcula el navegador»), no solo en un comentario del componente.
  - `[low]` `[patch]` (intent-alignment) Una Cita sin Obra del Corpus real, en su listado de Autor: solo el fragmento, sin pausa, sin hueco, sin rótulo, y el texto del enlace es el fragmento.
  - `[low]` `[patch]` (ac-auditor) La prueba de la hoja exige el fondo `var(--contenedor-bajo)` en `.tarjeta a:hover` y ninguna `box-shadow` en el componente.
  - `[low]` `[patch]` (ac-auditor) El recorte del fragmento se prueba: las dos Citas de la Obra de título largo pasan de `LARGO_DE_FRAGMENTO` y su tarjeta, en los cuatro listados, recorta el texto con «…» mientras el título sale entero.

Rechazados: los marcadores de Pagefind (el contrato prohíbe tocarlos en los listados, y la decisión está en Design Notes); los literales de peso e interlineado (todos los componentes los escriben así y `tokens.css` no declara ninguno: no lo causa esta historia); «Más de {Autor}» y «De la misma obra» con su propio marcado y una prueba de que nadie más pinta listas de Citas (los pasa la 24.6, cuya precondición es «una Tarjeta de Cita que declara su atribución»); la lectura «donde aplique» del Listado de Obra (no es una divergencia); los efectos fuera de la superficie (Pagefind, ya decidido; el `lastmod`, ya aplazado a la 24.8); y la relación de `cambios.ts` como hallazgo nuevo (ya está aplazada en el frontmatter). Del de contabilidad, solo se parchea el commit: `review_loop_iteration` cuenta vueltas por `bad_spec` y cada pasada lo reinicia, la entrada vacía es la de una pasada sin hallazgos externos, `followup_review_recommended: true` con `done` es justo lo que pide esta pasada, y `sprint-status.yaml` lo mueve el orquestador. Duplicados fundidos: edge-case-hunter 1–4 con blind-hunter; intent-alignment 3 y 6 y ac-auditor 2, 4, 6 y 7 con los parches de arriba; ac-auditor 5 y 8 con los rechazos.

## Design Notes

**El marcado.** Las pausas van **pegadas** a la parte anterior, sin espacio entre etiquetas (Astro conserva un espacio donde hay salto de línea, y entonces el texto para lectores sería `«…» , Séneca`), y como hermanas, nunca dentro de `.fragmento`: heredarían la serif y `coleccion.spec.ts` solo admite `h1` y `span.fragmento` en serif. `.solo-para-lectores` es `position: absolute`, así que queda fuera del flujo flexible y el `gap` sigue siendo de `--unidad` entre partes visibles. Forma de referencia para `autor-y-obra` con Obra:

```astro
<a href={rutaDeCita(cita.slug)}><span class="fragmento">«{fragmento}»</span>{nombre !== undefined && (<><span class="solo-para-lectores">, </span><span class="autor">{nombre}</span></>)}{titulo !== undefined && (<><span class="solo-para-lectores">, </span><span class="obra">{titulo}</span></>)}</a>
```

con `nombre` el de `autor` solo en `autor-y-obra` (tras la guarda) y `titulo = atribucion === 'ninguna' ? undefined : cita.obra?.titulo`. Las sondas de prueba sin `Armazon.astro` ya construyen (`superficies.ts:631`: lo no declarado no se anuncia y no rompe).

**El fixture de la construcción.** Séneca (`AUTOR_VALIDO`) y Antonio Machado; un solo Tema, `el-tiempo`, en todas las Citas. Séneca: «Sobre la brevedad de la vida» 50 (93 %, `noindex`), «Cartas a Lucilio» 2 (indexable), «De la ira» 1 (`noindex`, una sola Cita) y 1 sin Obra (`procedencia: { referencia }`, sin `fuente`). Machado: una Obra de título de 125 caracteres con 2 Citas y 1 sin Obra (`procedencia: { referencia }`, sin `fuente`). Son 57 Citas en el Tema (dos páginas) y 54 de Séneca (dos páginas). Las dos sin Obra van en `pendientes-de-cotejo.yml`, así que los documentos de las cuatro Obras se escriben a mano con `componerDocumento` en `fuentes/${nombreDeDocumento('wikisource-es', titulo)}.txt`. Una Colección de 15 miembros (`MIN_CITAS_POR_COLECCION`): las dos sin Obra, una de «Cartas a Lucilio», la de «De la ira», una de la Obra de Machado y diez de «Sobre la brevedad». Las fichas las siembra el andamio. Un Listado de Obra no puede tener una Cita sin Obra: ahí se comprueba solo que ninguna tarjeta lleva Autor ni título.

**El nombre que calcula el navegador.** El texto del enlace en `dist/` son las partes unidas por «, » al pie de la letra, y lo fija la construcción de prueba. Chromium compone el nombre accesible separando cada bloque flexible con un espacio, así que anuncia «…» , Séneca , Cartas a Lucilio: la pausa —la coma— está, no hay ninguna palabra más, y el espacio de delante no se oye. Se acepta, como en `ListaDeObras.astro`: quitarlo exigiría sacar las partes del flujo de bloque o duplicar el texto en un `aria-label`, y ninguna de las dos cosas cambia lo que se oye. Las pruebas de punta a punta (`tests/e2e/ayuda/tarjetas.ts`, en todas las páginas de un Tema, en las Colecciones publicadas y en un listado de Autor) exigen las partes visibles en su orden, separadas por comas y nada más; el Autor se compara sin distinguir mayúsculas porque va en versalitas, y el fragmento y el título, al pie de la letra.

**Pagefind.** No se toca: los listados ya indexan lo que dicen sus tarjetas (el fragmento y el Autor), y el título de la Obra entra igual. Buscar el título de una Obra puede devolver además los listados que la nombran; `busqueda.spec.ts` filtra los resultados de Obra por tipo y debe seguir verde.

## Verification

**Commands:** desde `/Users/hec/brainlySabiduria/.claude/worktrees/v8-epicas-24-26`; lo que pase de ~8 min, con `/Users/hec/brainlySabiduria/.claude/v8-ralph/correr.sh /Users/hec/brainlySabiduria/.claude/v8-ralph/logs/s-24-26/24-3-<nombre>.log /Users/hec/brainlySabiduria/.claude/worktrees/v8-epicas-24-26 <orden>` y llamadas sucesivas a `/Users/hec/brainlySabiduria/.claude/v8-ralph/esperar.pl <log> 540`.
- `npx vitest run tests/unit/tarjeta-de-cita.test.ts` y `npx vitest run tests/unit/obra-pagina.test.ts` (en segundo plano) -- `FINISHED EXIT=0`.
- Uno a uno: `coleccion-pagina`, `paginacion`, `obras`, `medicion`, `lista-de-obras`, `ingreso-construido`, `fecha-de-cambio` -- verdes.
- `npm run check` -- 0 errores. `npm test` en segundo plano (≈16 min) -- `FINISHED EXIT=0`.
- `npx playwright test tests/e2e/pagina-de-tema.spec.ts tests/e2e/pagina-de-autor.spec.ts tests/e2e/coleccion.spec.ts tests/e2e/busqueda.spec.ts tests/e2e/accesibilidad.spec.ts` (los dos proyectos; construye el sitio con `tests/servidor.mjs`, puertos 4321 y 8787) en segundo plano -- verde. Parar todo servidor arrancado.

**Manual checks (if no CLI):**
- Con el sitio servido, a 320 px, la Página de Autor que lista la Obra de título más largo del Corpus no desborda (`scrollWidth <= clientWidth`) y el título parte en varias líneas.

## Auto Run Result

Status: done
Blocking condition: ninguna.

**Qué se construyó.** `TarjetaDeCita.astro` gana `atribucion: 'autor-y-obra' | 'obra' | 'ninguna'`, obligatoria y sin valor por omisión, junto a `cita`, `autor?` y `zona: Zona` (la `interface Props` de la 23.7 intacta). Tres guardas detienen la construcción nombrando la Cita y la ruta: un uso sin `atribucion` (que `astro build` no comprueba tipos), un valor fuera del conjunto —la lista de la guarda está atada a la unión con `satisfies` y una prueba—, y `autor-y-obra` sin Autor o con un Autor que no es el que declara la Cita. Con `obra` y `ninguna` no lee `autor`. La línea `span.obra` sale de `cita.obra?.titulo` (nunca con `ninguna`), en `var(--sans)`, `var(--pie)`, 400, 1,5, `var(--tinta-apagada)`, con `overflow-wrap: anywhere` y nada que recorte. El marcado recorre las partes que siguen al fragmento y pone delante de cada una su `<span class="solo-para-lectores">, </span>`, pegada y como hermana; ninguna al final. Un solo `<a>`, la zona en el `<li>`, el recorte del fragmento (120) igual. Tema y Colección declaran `autor-y-obra`, Autor `obra`, Obra `ninguna` (sin `autor={undefined}`).

**Ficheros** (construcción en `29ca0c3ea2c42b3c0def573b65e3c889e78e94cd`; primera pasada de revisión en `008d31dffa2eb9fa827a96982e4cfc663b3ac68a` y `0c1b525c494fc783190c9ea330d03e5012946438`; esta segunda, en el commit que la cierra).
- `src/components/TarjetaDeCita.astro` — `atribucion`, las guardas, la línea de Obra y las pausas por una lista de partes; docblock a UX-DR70 con los cuatro usos de hoy y los dos que traerá la 24.6.
- `src/pages/tema/[slug]/[...page].astro`, `src/pages/coleccion/[slug]/[...page].astro` — `atribucion="autor-y-obra"`; docblocks a «Autor y Obra».
- `src/pages/autor/[slug]/[...page].astro` — `atribucion="obra"`.
- `src/pages/obra/[autor]/[slug]/[...page].astro` — `atribucion="ninguna"`, sin `autor={undefined}`.
- `tools/lib/cambios.ts` — solo comentarios: la Obra de los listados, junto a la declaración de los listados; la relación la recoge la 24.8 (aplazado en el frontmatter).
- `AGENTS.md` — sección 22.3: la Tarjeta de Cita de Tema, Colección y Autor entre las superficies que nombran la obra, sin año; «la Tarjeta Social» donde decía «la Tarjeta»; el conjunto de `atribucion` por uso y qué detiene la construcción.
- `tests/unit/ayuda/listado.ts` (nuevo) — el lector único de Tarjetas construidas, con entidades decodificadas.
- `tests/unit/tarjeta-de-cita.test.ts` (nuevo, 20 pruebas) — sin construir: `Props`, la desestructuración sin valor por omisión, la lista de la guarda igual a la unión, el escáner de usos (sigue la importación con cualquier nombre, solo la plantilla, comillas de los dos tipos) con su propia prueba, la hoja (`.obra`, ninguna regla que recorte, el fondo al pasar el cursor, ninguna sombra). Construcciones que fallan: sin `atribucion`, fuera del conjunto, `autor-y-obra` sin Autor y con el Autor de otro; y `astro check` sobre una sonda con dos usos rotos y uno bueno. Una construcción (57 Citas): los cuatro listados en todas sus páginas —la Colección de 57 miembros, en el orden declarado—, el título de 125 caracteres entero, el fragmento de las Citas largas recortado como antes, la Obra `noindex` nombrada igual y ningún «Sin obra documentada».
- `tests/unit/obra-pagina.test.ts` — `it` 24.3 con la familia congelada: el conjunto exacto de las 23 Citas de `/tema/la-vida/`, en todas sus páginas, con su título.
- `tests/unit/obra-construida.test.ts` — `it` 24.3: con una ficha que reúne dos grafías, el listado de `/autor/seneca/` dice el título de la ficha en las dos Tarjetas y nunca la otra grafía; docblock con «la Tarjeta Social».
- `tests/e2e/ayuda/corpus.ts` — `campoDeCita`, `citaConTituloDeObraMasLargo` y `citaSinObra` (resueltas con `colgarObras`, como el build), `paginasDeAutor` y `paginasDeTema`.
- `tests/e2e/ayuda/tarjetas.ts` (nuevo) — el nombre accesible de cada Tarjeta: sus partes visibles, en su orden, separadas por comas y nada más; el Autor sin distinguir mayúsculas.
- `tests/e2e/pagina-de-tema.spec.ts` — 24.3: el nombre de cada Tarjeta en las siete páginas de `/tema/la-vida/`, y a 320 px `--unidad` bajo el fragmento y bajo el Autor, sin desborde.
- `tests/e2e/pagina-de-autor.spec.ts` — 24.3: a 320 px, la línea de Obra de título más largo del Corpus, igual al título de su ficha, en la Inter cargada, medida contra los tokens, partida si no cabe; el nombre de las Tarjetas de esa página; y una Cita sin Obra con solo el fragmento.
- `tests/e2e/coleccion.spec.ts` — 24.3: el nombre de cada Tarjeta en las Colecciones publicadas.

**Revisión.** Primera pasada (capas externas del bucle v8-ralph): 12 parches `low`, 1 aplazado `medium` (la relación de `cambios.ts`, de la 24.8) y 16 rechazados. Segunda pasada: 21 parches, todos `low`; ningún aplazado nuevo; 6 rechazados (Pagefind, los literales de peso e interlineado, «Más de {Autor}» de la 24.6, la lectura «donde aplique» del Listado de Obra, los efectos fuera de superficie ya decididos o aplazados, y la relación de `cambios.ts` ya aplazada). El detalle, en el Review Triage Log.

**Recomendación de revisión de seguimiento:** `true`. Parcheados en esta pasada: 0 high, 0 medium, 21 low; puntuación 3 × 0 + 21 = 21 (≥ 5).

**Verificación.** Desde el worktree, tras los parches de la segunda pasada:
- `npx vitest run tests/unit/tarjeta-de-cita.test.ts` — 20/20. Por mutación: sin la guarda del Autor ajeno, sin el mensaje de la ausencia, con un literal menos en la lista de la guarda y con `atribucion?:` (la de `astro check`), cada una pone roja su prueba y solo esa.
- `obra-construida` 17, `obra-pagina` 65, `coleccion-pagina` 34, `paginacion` 14, `obras` 117 (sin permitidos nuevos), `medicion` 492 (la de zonas de la 23.7 sin tocar), `lista-de-obras` 18, `ingreso-construido` 38, `fecha-de-cambio` 33 — uno a uno, todos verdes.
- `npm run check` — 0 errores, 0 avisos, 8 pistas previas (ninguna de estos ficheros).
- `npm test` — 134 ficheros, 6140 pruebas, `FINISHED EXIT=0` (744 s).
- `npx playwright test tests/e2e/pagina-de-tema.spec.ts tests/e2e/pagina-de-autor.spec.ts tests/e2e/coleccion.spec.ts tests/e2e/busqueda.spec.ts tests/e2e/accesibilidad.spec.ts` (móvil y escritorio, sitio construido por `tests/servidor.mjs`) — 220 pasan, 10 saltadas por condiciones del Corpus, `FINISHED EXIT=0`; las cinco de la 24.3 pasan en los dos proyectos. Puertos 4321 y 8787 libres al terminar.

**Riesgos residuales.** Hasta la 24.8, retitular o reunir una Obra cambia el HTML de los listados de Tema, Colección y Autor sin mover su `lastmod` ni avisarlos (aplazado). Chromium anuncia la tarjeta con un espacio delante de cada coma, como la Lista de Obras: no se oye, está decidido en Design Notes, y las pruebas de punta a punta exigen lo demás. Las pruebas de punta a punta no corren en el CI. Pagefind no se toca: buscar el título de una Obra puede devolver además los listados que la nombran (`busqueda.spec.ts` sigue verde). «Más de {Autor}» y «De la misma obra» siguen con su propio marcado hasta la 24.6; el escáner de usos obliga a declararlos en cuanto pasen a la tarjeta. La prueba de `astro check` mira solo los errores de su sonda: la copia de la construcción no lleva `medicion/` y `tools/` da los suyos.
