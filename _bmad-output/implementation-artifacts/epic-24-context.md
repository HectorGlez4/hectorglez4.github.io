# Epic 24 Context: La Obra se ve y la Cita sigue

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Quien lee una Cita ve justo debajo de qué Obra sale —título, Autor, año si sus Citas coinciden y cuántas tiene— y de un toque pasa a la siguiente en el orden del libro o a la Obra entera y dónde leerla; al pie encuentra hasta tres Citas más de esa Obra y cuatro del mismo Autor sacadas de otras, sin que la Cita deje la primera pantalla. Los listados de Autor, Tema y Colección dicen de qué Obra es cada Cita, y la Página de Obra lista las suyas en el orden del libro y salta a «Dónde leer esta obra». Todo se compone en el build, sin guion y sin enlace comercial, y una Cita nueva no refecha las demás Páginas de Cita de su Autor. Como es la épica que más peso añade a `dist/`, trae también la vigilancia del peso frente al techo del alojamiento (GitHub Pages: 1 GB por sitio y corte del despliegue a los 10 minutos).

## Stories

- Story 24.1: La Página de Obra lista sus Citas en el orden del libro
- Story 24.2: El build avisa antes de que `dist/` llegue al techo del alojamiento
- Story 24.3: Cada Cita de un listado dice de qué obra es
- Story 24.4: Bajo la Cita, la obra de la que sale
- Story 24.5: De una Cita a la siguiente del libro
- Story 24.6: Al pie, más de la misma obra y más del Autor
- Story 24.7: La Obra salta a dónde leerla
- Story 24.8: Una Cita nueva no refecha las demás Páginas de Cita

## Requirements & Constraints

- **Orden de la Página de Cita:** Cita con atribución y Línea de la Fuente → Tarjeta de Obra → Copiar, Imagen y «Compartir la cita» (intacto hasta la 25) → «De la misma obra» → «Más de {Autor}» → Temas. A 360 × 640 el texto de la Cita sigue empezando en la primera pantalla; que Copiar quede justo debajo es deuda aceptada que vigila SM-C5.
- **Tarjeta de Obra:** solo en Página de Cita con Obra (portada y 404 no cambian aquí). Título de la ficha, «{Autor} · {año} · {n} citas» —año solo si las Citas que lo declaran coinciden, nunca el de una traducción—, «Siguiente…» y «Ver la obra y dónde leerla ›» (o «Ver la obra ›» si ninguna Cita está cotejada), hacia la página 1 de la Obra aunque sea `noindex`.
- **«Siguiente»:** en Obra de ≥2 Citas, la siguiente en el orden del libro, y de la última a la primera. En Obra de una Cita, la primera Cita de **otro Autor** que le sigue en el listado de su primer Tema publicado (con vuelta al principio), nunca del mismo Autor; sin ese Tema o sin otro Autor en él, no hay fila.
- **Rutas de salida:** «De la misma obra» hasta 3 y «Más de {Autor}» hasta `MAX_CITAS_RELACIONADAS` (4, sin las de su Obra), ninguna la que se lee ni la siguiente; como mucho siete Tarjetas por página. Elección determinista por commit, nunca por jornada. Las Citas hermanas actuales y los respaldos «Explorar por tema» / «Seguir leyendo» se retiran.
- **Tarjeta de Cita según contexto:** Tema y Colección llevan Autor y Obra; Autor y «Más de {Autor}», solo la Obra; Listado de Obra y «De la misma obra», ninguna. La Obra es texto, nunca un segundo enlace.
- **Página de Obra:** orden del libro en todas sus páginas y en sus datos estructurados, sin decir cuál es; la página 1 salta a «Dónde leer esta obra», las 2+ no.
- **Ausencia sin hueco y sin recorte:** sin Obra, Obra de una Cita, Obra sin cotejar, grupo vacío, Cita sin Tema o año que no consta no dejan rótulo, separador, filete ni frase de relleno; los títulos nunca se recortan (NFR-12).
- **Modelos e indexación:** la Tarjeta de Obra, «Siguiente» y el salto no alojan ningún Modelo y salen idénticos byte a byte con la afiliación encendida o apagada (FR-35). Ni el `noindex` ni la congelación de SM-11 alcanzan a la navegación. Lo que enumera Citas en la Página de Cita y la Tarjeta de Obra van bajo `data-pagefind-ignore="all"` (NFR-13).
- **Fechas (FR-38, FR-47):** una Página de Cita cambia de fecha solo si cambia lo que afirma de su Cita; su navegación se pinta y no fecha ni avisa (excepción declarada por Héctor).
- **Peso de `dist/`:** aviso y tope con nombre en `umbrales.ts`, ambos bajo 1 GB y el aviso bajo el tope, sin valor por omisión: los fija Héctor en un diff visible. Partida: 485 MiB por `du` y 445 MiB en bytes (2026-10-16), ~95–100 KB por Cita nueva, techo hacia 9.500–10.000 Citas. Entre aviso y tope avisa sin romper; por encima, `npm run build` falla nombrando peso, tope y constante. El tope del número de PNG puede quedar sin valor (solo informa); el número de ficheros se informa sin umbral (Cloudflare Pages corta a 20.000). El tope de HTML de la Página de Cita sigue aplazado.
- **Medidas que se anotan en el spec, nunca contra el sitio en vivo:** duración del build con el cargador (24.1), NFR-7 con Lighthouse móvil frente a la principal y peso de `dist/` con su proyección (24.6), fechas que mueve una siembra real (24.8).

## Technical Decisions

- **Paradigma v8:** `tools/lib/` es la segunda capa pura y sin red; la importan el build, `content.config.ts` y las órdenes, y `src/lib/` nunca importa de ella (una prueba lo fija). `content.config.ts` pasa `z` a `astro/zod`.
- **Posiciones (AD-23):** un cargador de contenido, al patrón del de biografías, lee Citas y documentos con los mismos lectores que el cotejo, casa por `documentosDeCita` y localiza con el **mismo** `indexOf` sobre formas colapsadas (no hay segundo localizador). Entrega `{slug → [{documento, posición}]}` con el `slug` del frontmatter, todas las apariciones, sin ordenar, elegir ni guardar texto. La lógica vive en `tools/lib/`; `content.config.ts` solo la cablea.
- **Orden del libro (AD-25):** solo `src/lib/obras.ts` ordena, con las posiciones por parámetro (AD-5): Fuente que más Citas aporta primero; documentos por orden natural del slug de página con romanos leídos; Citas sin documento al final por slug. Lo leen el listado de Obra, «Siguiente», «De la misma obra» y, más tarde, la búsqueda. El índice de subpáginas de la Fuente queda aplazado.
- **Un solo dueño de lo enumerado (AD-11):** la Obra resuelta (`cita.obra.titulo`, año, recuento, si hay edición cotejada), los recuentos de tarjeta y cierres y las elecciones de las rutas salen de `publicado.ts`/`obras.ts`; ningún componente cuenta. «Siguiente» de una Obra de una Cita lee el listado del dueño que pinta la Página de Tema. Fuera de `obras.ts` y `admision.ts`, nada de `src/` lee `procedencia.obra`.
- **Componentes únicos (AD-19):** una sola `TarjetaDeCita.astro`, cuyo uso declara su atribución en un conjunto cerrado sin valor por omisión; una sola `TarjetaDeObra.astro`, que recibe el nivel de su encabezado porque la portada la reutilizará.
- **Paso final del build (AD-9, AD-16):** la comprobación del peso corre tras Pagefind en `npm run build`, nunca en `astro:build:done`, sobre lo que se despliega (`dist/pagefind/` incluido), desglosando `/tarjeta/` y contando PNG y ficheros. El veredicto no depende de la jornada: la función pura recibe la medida ya sin la portada, el 404, `/kit`, `/lote` y `rss.xml`. Las decisiones son funciones puras probadas en Vitest; el caso de error se prueba con el tope rebajado en una copia temporal, nunca en el árbol. La caché de PNG es deuda declarada cuyo disparador es el tope de PNG.
- **Relación por campos (AD-27):** `relacionDeSuperficies` de `tools/lib/cambios.ts` pasa a superficie → (fichero, campos que pinta), con un dueño y dos lecturas (`lastmod` y `rutasAvisadasPor`). Los listados ganan las fichas de Obra de sus Citas; la Página de Obra, sus documentos (`corpus/fuentes/` entra como familia de fichero `documento`); una baja fecha lo que componía; `tools/avisar.ts --ensayo` cuenta por familia lo que movería un rango sin desplegar.
- **Zonas (AD-13):** ya existen desde la 23.7; esta épica coloca `tarjeta-de-obra`, `siguiente`, `misma-obra` y reutiliza `listado`, `rutas-de-salida` y `chip-de-tema`. El salto de la Obra es ancla de la misma página y va exento.
- **Pruebas:** Vitest construye el sitio (una construcción por fichero) y juzga `dist/`, con parejas afiliación apagada/encendida y la congelación en copia temporal. Playwright es local contra el sitio construido, con Citas derivadas del Corpus y nunca fijadas a mano.

## UX & Interaction Patterns

- **Fila de bloque:** se escribe una vez, con el trato de la Lista de Obras, y la reutilizan «Siguiente», «Ver la obra» y los cierres «Las {n} citas de… ›»: fila entera, alto mínimo de toque, filete entre filas, en tinta y sin subrayado, misma pestaña, glifo de avance con `aria-hidden`. Las filas y tarjetas apiladas se tocan sin los 8 px; la exención de la prueba de toque va por componente, no por ruta, y sustituye a la de `.hermanas`.
- **El glifo de avance es «›» (U+203A), nunca la flecha «→»** (decisión de Héctor, v8.3) en «Siguiente…», «Ver la obra…» y los cierres: la flecha no está en el subconjunto `latin` de Inter ni de Source Serif 4 y pararía la puerta de cobertura tipográfica en todas las Páginas de Cita. Es un glifo tipográfico del rótulo, no un icono. «↓» del salto no cambia.
- **Tarjeta de Obra plana y en tinta**, sin fondo, radio ni siena; puntos medios `aria-hidden` (el lector oye una coma). La línea de Obra de la Tarjeta de Cita va en Inter pequeña y apagada, con un «, » solo para lectores entre partes.
- **Tabulación de la Página de Cita:** atribución y Fuente → tarjeta («Siguiente» antes que «Ver la obra») → acciones → rutas de salida; enmienda la Historia 2.8 y su prueba de `tests/e2e/accesibilidad.spec.ts`.
- **El salto de la Obra** es un enlace subrayado en `{colors.primary}`; su destino `h2` recibe el foco (`tabindex="-1"`) y el bloque sigue al pie.

## Cross-Story Dependencies

- **Rama y merge compartidos con la Épica 26** (SM-11): un solo merge con CI verde y `npm run test:e2e` entero; lo cierra la 26.11, que mide NFR-7 y da valor a `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS`. Depende de la Épica 23 por las zonas (23.7).
- **Orden:** 24.1 primero (de ella cuelgan 24.5 y 24.6); 24.3 y 24.4 tras la 23.7; 24.5 tras 24.1 y 24.4; 24.6 tras 24.1, 24.2, 24.3 y 24.5; 24.7 libre; 24.8 la última, y antes que la 26.1.
- **La 24.2 es excepción a la fusión por épica:** entra sola en la principal en cuanto Héctor fije aviso y tope (acto suyo, del que cuelgan 24.6, 24.8 y la 26); la rama 24+26 la recibe de la principal y los valores se revisan tras la 24.6.
- **Fuera:** «Compartir en» (25.1, 25.6), «Buscar en…» (27.8), `data-pagefind-sort` (27.1), la Tarjeta de Obra en la portada (28.2), la vista de Obra (23.9) y los Directorios en AD-27 (26). El orden de la 21.2 respecto de esta épica lo decide Héctor.
