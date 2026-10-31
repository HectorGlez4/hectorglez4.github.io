# Epic 27 Context: Buscar con filtros

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

`/buscar/` deja de ser una caja de texto suelta: quien busca acota por Autor, por una Obra de ese Autor (también las que no se indexan) y por Tema, con texto o sin él. La búsqueda vive en la dirección (`?q=&autor=&obra=&tema=`), se comparte y «atrás» devuelve la anterior; los resultados llegan de 30 en 30, con su recuento anunciado y cada Cita con su Autor. Desde la página 1 de una Obra, un Autor o un Tema se entra con «Buscar en…» y el filtro puesto, sin que ninguna combinación cree una página indexable. Sin resultados se ofrecen los ocho Autores con más Citas, con el suelo latinoamericano garantizado, y sin JavaScript la página lo dice y lleva a los Directorios. Así Héctor puede juzgar cuántas búsquedas acaban en un resultado pulsado y cuántas se quedan a cero.

## Stories

- Story 27.1: Cada resultado de Cita lleva su Autor, y la Cita declara sus filtros
- Story 27.2: La búsqueda se acota por Autor y por Tema
- Story 27.3: La búsqueda se acota también por una Obra del Autor elegido
- Story 27.4: La búsqueda vive en la dirección, y «atrás» la devuelve
- Story 27.5: Los resultados llegan de 30 en 30
- Story 27.6: Sin resultados, los ocho Autores con más Citas
- Story 27.7: Sin JavaScript, la búsqueda lleva a los Directorios
- Story 27.8: Buscar en esta obra, en un Autor o en un tema
- Story 27.9: La búsqueda con filtros llega al sitio en vivo (operativa)

## Requirements & Constraints

- Basta un filtro para buscar: sin texto corre `search(null, …)` en el orden de la clave; con texto manda la relevancia. Solo espacios cuenta como sin texto; sin texto ni filtros no hay búsqueda, ni recuento ni emisión.
- Con algún filtro solo salen resultados de Cita. Las opciones salen solo del Corpus publicado (ningún Autor sin Citas, ningún Tema bajo `MIN_CITAS_POR_TEMA`); el filtro de Obra ofrece toda Obra con Citas publicadas, también `noindex` o congelada, pero como resultado de tipo Obra solo salen las indexables. Nada se alcanza solo filtrando.
- Ninguna combinación crea ruta ni página indexable: un solo HTML de `/buscar/`, `noindex`, canónica `/buscar/`, fuera del sitemap y de Pagefind. «Buscar en…» es un GET sin guion.
- Un filtro de la dirección que ya no existe se ignora, se dice con frase fija y se quita con `replaceState`. Orden: descartar lo inexistente; una `obra` sin `autor` toma el Autor del mapa; si no casan, se descarta la `obra`. Una Obra absorbida nunca se traduce a la que la absorbió.
- `busqueda` sale una vez por estado distinto y carga, al asentarse (enviar, pulsar un resultado, ocultar la página), con tramo y combinación de filtros del vocabulario cerrado. Restaurar desde la caché de atrás y adelante, la marca en `history.state` y la recarga cuentan como ya registrado. Un índice que no carga no emite.
- Lo tecleado que vuelve a la página se pinta por `textContent`/`value`, nunca como HTML. WCAG 2.2 AA y reflujo a 320 px en las tres condiciones de texto; mensajes por la región `role="status"` presente desde la carga.
- Para fusionar: CI verde y `npm run test:e2e` entero sobre la rama, con la medición contra un receptor local; la 27.9 mide NFR-7 con Lighthouse en `/buscar/` y en una Página de Cita frente a la principal del mismo día. Nada se comprueba en el sitio en vivo.
- Fuera: trocear los filtros y el mapa de rótulos (solo su aviso de tamaño), el autocompletado y toda página de intersección.

## Technical Decisions

- **Un solo dueño de los filtros:** una función de `src/lib/publicado.ts` compone el `data-pagefind-filter` de cada Cita y las opciones de los selectores. `autor` es el slug del Autor; `obra`, el nombre de la ficha (`cita.obra.nombre`, nunca el título); `tema`, uno por Tema publicado. Los escribe un solo componente, solo en `src/pages/cita/[slug].astro`, fuera de todo bloque reutilizable y nunca dentro de `data-pagefind-ignore="all"`. Una prueba de `dist/` prohíbe esos tres filtros y la clave fuera de la Página de Cita; el filtro del tipo de resultado queda exento por su nombre.
- **Metadato `autor`** con el nombre del Autor y peso 0, declarado como `autor: 0` en `OPCIONES_DE_PAGEFIND` de `src/lib/tipoDeResultado.ts`, el único sitio donde la búsqueda configura Pagefind; el tipo viaja como filtro y no lleva peso.
- **`data-pagefind-sort`** (lo compone `src/lib/obras.ts`): ordinal entero de ancho fijo con **dos campos de 4096** —el del Autor, en el orden del Directorio, y la posición dentro del Autor, que compone el orden de su lista de obras y el del libro, con los huecos «sin Obra» (detrás de sus Obras, por slug) y «sin documento» (detrás de las documentadas, por slug)—. Tres campos no caben con holgura en los 2^24 enteros exactos de un `f32`. Va en toda Página de Cita (excepción declarada a la convención de ausencia), con claves únicas; un campo que desborda su ancho rompe el build nombrándolo.
- **Guion empaquetado de la búsqueda:** entrada de `GUIONES_EXTERNOS` con su tope en `umbrales.ts`; siempre a fichero, sin guion en línea ni `define:vars`. Importa de `src/lib` sin copiar y emite siempre `__medir(…)`. Pagefind entra por `import()` diferido del literal `/pagefind/pagefind.js`, solo al enfocar, al elegir filtro o con estado en la dirección.
- **Mapa de rótulos** (nombre de ficha → título y Autor): JSON del build, compuesto por la misma función que los filtros, pedido junto a `filters()`; el Autor de una `obra` sin `autor` sale de él, nunca de partir el nombre en el cliente. Su tamaño con el de los filtros se mide tras Pagefind en `npm run build`, y avisa sin romper.
- **Órdenes:** el selector de Autor ordena por el nombre como se lee y el de Tema por nombre con artículo, con funciones de `src/lib/normalizar.ts`; el de Obra toma el orden de la lista de obras de `obras.ts`. Ningún selector ordena por su cuenta.
- **Destacados:** una función de `publicado.ts`, que reutilizará la portada: los 8 con más Citas, desempate por el orden del Directorio, y si los latinoamericanos quedan bajo `SUELO_TRADICION_LATINOAMERICANA` ceden plaza uno a uno (nunca un Autor de tradición `otra`). El predicado «cuenta para el suelo» tiene un solo dueño en `src/lib/huecos.ts`.
- **Historial:** la dirección se compone desde el estado de la isla, nunca copiando `location.search`; `pushState` al primer estado tras la pausa y `replaceState` mientras cambia el mismo control; un estado asentado no se reescribe. Las marcas `de`/`via` las quita solo el guion de medición.
- **Zonas:** los resultados van en el contenedor de zona `resultado`, también los que inserta el cliente; «Buscar en…», las salidas sin resultados y los Directorios de los avisos van exentos por escrito.
- Constantes con nombre en `umbrales.ts`: tanda (30), pausa de los selectores, recuento de destacados (8), topes de guion y de filtros y mapa, y la jornada de llegada de la búsqueda con filtros.

## UX & Interaction Patterns

- Selectores nativos en un `fieldset` sin borde («Filtrar las citas», solo para lectores), apilados a todo el ancho, etiqueta visible encima («Autor», «Obra», «Tema»), 44 px de alto. Obra solo aparece con un Autor elegido que tenga Obras, sin mover el foco; cambiar el Autor quita la Obra.
- Recuento encima de la lista que nombra lo filtrado («8 citas de José Martí sobre la prudencia.»), anunciado por el segundo ritmo. Resultado de Cita con el Autor debajo; se lee «Cita: «{texto}», {Autor}».
- «Quitar los filtros» solo con filtros, foco al campo. «Mostrar 30 más» como botón secundario, foco al primer resultado nuevo, con su propia región de estado si falla.
- Sin resultados, una frase que nombra lo filtrado y la salida a Temas, Colecciones y los 8 destacados. Sin JS, `<noscript>` con los Directorios; índice que no carga, aviso y reintento.
- «Buscar en…» solo en página 1: encima del listado en el Autor y en el Tema, y **debajo** del listado y su paginación en la Obra, con «Compartir en» después. La primera Cita de Tema y de Obra sigue en la primera pantalla a 360 × 640.

## Cross-Story Dependencies

- Depende de la Épica 23 (evento `busqueda`, zona `resultado`, `__medir`, emisión asentada) y de la 26 (Directorios, clave de orden del Autor, Campo y pausa de tecleo, lista de obras, tipo de resultado y reflujo). Rama propia, un solo merge tras la 24 con la 26.
- Orden interno: 27.1 primero; 27.2 abre el guion empaquetado, del que salen 27.3 y 27.5; 27.4 y 27.6 tras la 27.3; 27.7 y 27.8 tras la 27.4; 27.9 la última, que deja escrita la jornada de llegada.
- La portada de la Épica 28 reutiliza la función de destacados; «Compartir en» de la Épica 25 se coloca tras «Buscar en esta obra».
