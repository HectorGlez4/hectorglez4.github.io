# Epic 22 Context: La obra tiene página

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Quien llega por una Cita pulsa el título de su Obra y lee juntas las demás Citas de ese libro, sabe de qué Fuente y bajo qué licencia salió el texto y dónde leer la Obra entera. Cada Obra con Citas publicadas tiene página en `/obra/{slug-autor}/{slug-obra}/`, anclada por una Ficha de Obra que fija URL y título; solo se indexa la que no repite otra página (la que no es una sola Cita ni casi todo su Autor), para captar consultas por obra que la Página de Autor no capta. Héctor mide la familia aparte desde su primer despliegue, con un freno declarado (congelación), y el enlace de compra queda construido y apagado en el único sitio donde puede vivir.

## Stories

- Story 22.1: Cada Obra tiene ficha antes de tener URL
- Story 22.2: Una obra, un nombre: las grafías se deciden en la ficha
- Story 22.3: La obra se llama igual en todas partes
- Story 22.4: La obra tiene página, y solo se indexa si no repite otra
- Story 22.5: La atribución dice de qué obra sale, y se ve que es un enlace
- Story 22.6: Dónde leer esta obra
- Story 22.7: La obra se encuentra en el buscador del sitio, y se ve al compartirla
- Story 22.8: Lo que cambia en una obra se anuncia, y la familia se mide aparte
- Story 22.9: Las ediciones en venta, construidas y apagadas
- Story 22.10: Lo construido cumple las espinas de UX

## Requirements & Constraints

- **Existir ≠ ser indexable.** Toda Obra con ≥ 1 Cita publicada tiene página (es destino de la Atribución y de la Lista de Obras del Autor). Indexable solo con ≥ 2 Citas publicadas y < 90 % de las Citas de su Autor; los dos números viven en `src/lib/umbrales.ts`. La no indexable es la misma página, sin marca, con `noindex, follow`, fuera del sitemap y de Pagefind. Se recalcula en cada build y se corrige sola en los dos sentidos. La indexabilidad nunca se declara en una ficha.
- **Una sola regla, muchos lectores**: página, sitemap, búsqueda interna, aviso de cambio e informe de indexación. Se comprueba sobre el `dist/` real: si sitemap e índice interno no coinciden con las rutas sin `noindex`, el build rompe.
- **Ficha de Obra**: la crea el sistema, nunca a mano. Una Obra con Citas sin ficha rompe el build nombrando la orden que la crea; una forma reclamada por dos fichas rompe; ficha sin Citas avisa y no rompe. El título publicado es siempre una grafía que declara alguna Procedencia de la Obra; es el único nombre de la Obra en toda superficie y material de salida.
- **Nunca se reescribe la Procedencia** para reunir o separar grafías. Única excepción: restituir el literal de la Fuente (documentar; o igualar la grafía de una Cita del censo a la cabecera de un documento versionado de esa misma obra). Literal = igual a la cabecera colapsando espacios.
- **Solo Héctor decide** ediciones en venta, nota (≤ 160 caracteres, describe y no califica), elección de título y reuniones/separaciones. El agente propone; ninguna orden ni historia rellena esos campos.
- **Sin prosa compuesta** sobre la Obra: ni sinopsis, ni contexto, ni adjetivos; todo sale de hechos del Corpus.
- **Año de la Obra**: solo si las Citas que lo declaran coinciden; si discrepan se omite y el build avisa; nunca se infiere; el año de una traducción nunca cuenta. Lo copiado lleva el año de la Procedencia de *esa* Cita, no el de la Obra.
- **Dónde leer**: nunca afirma un cotejo que no ocurrió; dice cuántas Citas no tienen documento; sin ninguna cotejada no enlaza edición. La edición en venta nunca va sola ni en lugar de la cotejada.
- **Modelos**: la Obra es superficie de lectura: rechaza donaciones y publicidad. Admite solo afiliación, y solo en la primera página (también si no se indexa). Con el Modelo apagado, `dist/` idéntico con y sin ediciones declaradas.
- **Freno (SM-11)**: la familia Obra se lee aparte desde el primer despliegue y se compara con Autor la misma jornada, ambas enteras (~147 URL). Si a las 8 semanas va peor que Autor, se congela: ninguna Obra entra en el conjunto indexable, no se curan ediciones, no se pide rastreo, no hay Piezas que enlacen a ella. Congelar y levantar son commits. Ante duplicados, se baja el tope del 90 %; nunca se parchea una página.
- Accesibilidad y móvil como el resto de superficies públicas, sea indexable o no.

## Technical Decisions

- **Identidad de Obra** = (Autor, forma canónica con `normalizar` de `src/lib/normalizar.ts`); el título nunca interviene. Ficha en `corpus/obras/{slug-autor}--{slug-obra}.yml` con `autor`, `titulo`, `formas` (lista explícita, sin valor por omisión), opcionales `distintaDe`, `nota`, `ediciones`. Nombre con `slugDeObra` de `src/lib/slug.ts` **sin la truncación del documento**; nunca se recalcula. El build casa ficha y Obra por identidad y exige que el prefijo de Autor del nombre coincida con `autor`. Esquema exportado: todo lector fuera de la colección analiza con él, nunca YAML crudo.
- **Una sola función de `tools/lib/` crea fichas**: busca la forma en activas y en `corpus/_obras-retiradas/`, restaura la retirada, nunca sobrescribe, se niega ante colisión. La llaman en el mismo gesto `revisar --aprobar`, `alta` y `documentar`; escribir una candidata en `_revision/` no crea ficha. La siembra inicial (182 Obras) usa la misma función, en commit propio.
- **Retirar ficha** mueve a `corpus/_obras-retiradas/`; código 1 si una Cita publicada o candidata la resuelve; 2 sin motivo. `tools/autor.ts retirar` se bloquea también por las fichas del Autor.
- **Puerta ortográfica**: rompe si un grupo de grafías equivalentes del mismo Autor contiene alguna no literal de su Fuente (Cita sin documento = no literal). Prefijo de otra forma avisa (`distintaDe` lo silencia). Título que deja de ser literal avisa y cae a la grafía por omisión de una regla fija en `src/lib/obras.ts`. Órdenes: `npm run obra -- reunir`, `npm run obra -- titular`.
- **`src/lib/obras.ts`** (puro, después de la puerta de admisión) es dueño de los atributos derivados: título publicado, año coincidente, Fuentes y edición cotejada, Temas, recuento. Atribución (`atribucion.ts`), datos estructurados de la Página de Cita, Tarjeta Social, Imagen de Cita e Imagen del Kit consumen la Obra resuelta; una prueba fija que fuera de `obras.ts` y la admisión nadie lee `procedencia.obra`. `public/islas/imagen.js` recibe el título ya compuesto en el marcado.
- **Superficie**: `src/pages/obra/[autor]/[slug]/[...page].astro`, declarada en `src/lib/superficies.ts` como servicio por contenido. `src/lib/publicado.ts` expone `rutasIndexables` ⊂ `rutasPublicadas` (que sigue enumerando todas). `superficies.ts` recibe la lista positiva sin calcularla, falla cerrado sin ella y expone la causa (forma o contenido); el filtro síncrono del sitemap la recibe de una integración en `astro:build:start`; la comprobación cruzada va en `astro:build:done`.
- **Datos estructurados**: `about` de la Página de Obra e `isPartOf` de cada Cita comparten `@id` = canónica de la Página de Obra (también si no se indexa). Canónica de la Obra = la propia; la de cada Cita sigue siendo su Página de Cita.
- **Tarjeta de Obra**: `src/pages/tarjeta/obra/[autor]/[slug].png.ts`, función de ficha + Citas + fichero del Autor; mismos bytes en dos builds del mismo commit. Solo hechos: nunca nota, licencia ni traductor.
- **Aviso y `lastmod`**: una sola relación superficie→ficheros con dos lecturas, fijadas inversas por prueba. La Página de Obra = ficha + sus Citas + fichero del Autor. Las Obras hermanas se anuncian solo si cambia su indexabilidad (comparando lista indexable antes/después); se anuncia toda ruta de Obra cuyo estado anunciable cambió, incluida la que desaparece. El aviso toma las rutas del sitemap construido.
- **Serie de indexación**: familia Obra con censo de `rutasIndexables` leído del sitemap; nunca cuenta páginas `noindex`; familia no leída se omite, jamás cero; la entrada anota qué conjunto midió.
- **Congelación**: declaración versionada con un solo dueño, junto a los números de la regla en `umbrales.ts`, con la lista de identidades indexables al congelar; entra en la función de indexabilidad como dato (nunca leyendo la serie). La consultan `npm run rastreo -- --registrar`, las ediciones y las Piezas. Pregunta abierta: dónde vive exactamente (código frente a dato del corpus).
- **Afiliación**: tiendas como conjunto cerrado (dominio + marca) en `src/lib/ingreso.ts`; el esquema de `ediciones` rechaza URL de otro dominio o con marca, encendido o apagado; función pura compone la URL final. Admisión por predicado de ruta (Historia 17.5): `/obra/a/b/` sí, `/obra/a/b/2/` no. Todo dentro de un único `data-ingreso="afiliacion-de-libros"` con presentación en atributos `style`. Avisar a Héctor antes de escribir la primera marca (repositorio público).
- La Página de Obra emite `vista-de-superficie` con su marca de origen, sin ampliar el vocabulario.

## UX & Interaction Patterns

Referencia visual: `mockups/pagina-de-obra.html` y `mockups/buscar.html` (sin divergencias).

- **Cabecera de Obra**: `h1` con el título de la ficha en Inter 600 26 px vía token nuevo `--titular-obra` (hoja global; nunca `--titular-lg`), sin máximo de líneas ni segundo tamaño, partiendo palabras antes que desbordar. Debajo «de {Autor} · {año}»: nombre subrayado con zona de 44 px; punto medio oculto al lector (oye una coma); sin traductor.
- **El título de una Obra va en Inter en toda superficie**, nunca en serif (excepción a la serif para nombres de entidad).
- **Listado**: `TarjetaDeCita` sin repetir Autor, orden de la Página de Autor, paginado > 50 con la Paginación común. Páginas 2+: solo Cabecera y listado, `noindex`.
- **Pie de la primera página**, en orden: Temas (`h2`, Chips comunes, por nº de Citas y nombre, sin recuento; sin Temas no hay rótulo) → «Dónde leer esta obra» (`h2`; `h3` «Edición cotejada, gratuita»; una línea por Fuente con licencia, el nombre de la Fuente como enlace, indicando nº de páginas si está repartida; luego «Ediciones en venta» solo con el Modelo encendido) → nota tras filete, fuera de la sección y sin encabezado.
- **Estados**: sin ninguna cotejada → solo «Ninguna de sus citas tiene todavía documento cotejado.»; algunas sin documento → «{n} de sus {total} citas no tienen documento cotejado.» (singular «Una de sus…»); Modelo apagado → ni rótulo, hueco, contenedor ni regla CSS; Obra absorbida → 404 común.
- **Voz**: «frases» solo en `<title>` y meta description (`Frases de {Autor} en {Título} | Sabiduría de Bolsillo`, en 2+ `… — página {N} | …`); cuerpo y Tarjeta dicen «citas».
- **Atribución en la Página de Cita**: título de la ficha enlazado a la Obra (también no indexable), en `on-surface` y subrayado siempre, año de esa Procedencia detrás sin enlace; zona ≥ 3 × `{spacing.unit}` sin solapes. El nombre del Autor también se subraya siempre y su zona ampliada deja de invadir la línea de la Procedencia.
- **Búsqueda**: resultado tipo «Obra» con título en Inter y Autor debajo (metadato nuevo en Pagefind); nombre accesible «Obra: {título}, de {Autor}».
- **Tarjeta Social de Obra**: la de listado con banda siena, bajada «{n} citas de {Autor}, {año}» (año solo si consta; «1 cita de…» en singular).
- **Ediciones en venta**: «Edición {impresa|electrónica} en {tienda}» como enlace, `rel="sponsored noopener"`, pestaña nueva avisada, declaración de afiliado por `aria-describedby`; nunca `aside`.
- **Regla global**: siena = actuar o salir, tinta subrayada = información; todo enlace en línea de texto se subraya siempre; pestaña nueva solo para donar, compartir y comprar. La 22.10 corrige los demás defectos anotados (foco en búsqueda, separación de la Paginación, nombre del Diálogo de Imagen, destinos de compartir, previsualización vacía, pie social en pestaña nueva, región `role="status"` inexistente).

## Cross-Story Dependencies

- Orden en el tablero: 20.1–20.3 (vista de superficie) y serie de indexación leyendo (20.4) → **19.1** (separa traductor y año de traducción; sin ella la 22.4 no empieza) → 22.1 → 22.2 → 22.3 → 22.4 → **17.3** (Lista de Obras enlaza a la Página de Obra) → resto. La **17.5** (admisión por predicado de ruta) antes de la 22.9.
- 22.1–22.3 no publican ninguna URL nueva; la 22.1 deja `dist/` idéntico y la 22.3 aún no enlaza el título.
- Las reuniones conocidas («Del sentimiento trágico de la vida/I», «Sobre/De la brevedad de la vida», los dos «Proverbios y cantares», «Sor/sor Filotea») las decide Héctor en la 22.2, en commit propio, antes de que la 22.4 publique ninguna URL.
- La 22.5 corrige el subrayado del Autor junto con el del título; el resto de enlaces en línea es de la 22.10. La 22.6 no deja hueco para ediciones: las construye la 22.9. La congelación de la 22.8 la consultan la 22.9, el rastreo y las Piezas.
- `npm run indexacion` (serie) y `npm run rastreo` son planos existentes que la 22.8 extiende con la familia Obra.
