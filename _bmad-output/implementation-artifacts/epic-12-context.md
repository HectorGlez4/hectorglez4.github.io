# Epic 12 Context: La cola larga tiene dónde aterrizar

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Un visitante que busca «frases cortas para reflexionar» encuentra una página propia con esas Citas escogidas, y el editor crea una Colección sin tocar una sola Cita. La Colección es la superficie con la que el sitio captura consultas de cola larga que ni el Autor ni el Tema capturan, y por eso tiene que sumar señal en vez de repartirla: agrega y enlaza, nunca compite con la Página de Cita. El corazón de la épica no es la página, sino la resolución blanda de la pertenencia — la Colección declara sus miembros y el build los intersecta con lo publicable, de modo que retirar una Cita del Corpus la saca de todas sus Colecciones sin romper la construcción ni dejar un enlace roto. Es además la primera superficie pública nueva desde el Kit Diario, así que aquí aterriza también el dueño único del carácter publicable de una superficie.

## Stories

- Story 12.1: Una superficie declara en un solo sitio si es publicable
- Story 12.2: La Colección declara sus miembros, y la lista es blanda
- Story 12.3: La Página de Colección, sin canibalizar a la Cita
- Story 12.4: Curar una Colección desde la herramienta

## Requirements & Constraints

**Publicación de la Colección.** Toda Colección publicada tiene URL propia, legible, en español, estable y sin identificadores opacos, y es rastreable e indexable con canónica propia como cualquier otra superficie pública. Una Colección por debajo de su umbral mínimo no se publica: desaparece a la vez de la página, del sitemap, de los chips y del descubrimiento. Ninguna Colección publicada queda huérfana — es alcanzable por enlaces internos desde la portada en un número acotado de saltos.

**Curación sin tocar Citas.** Crear una Colección no modifica ningún fichero de Cita. Solo admite Citas en estado publicada: no es una vía para adelantar contenido en revisión. Una Cita puede pertenecer a varias Colecciones sin que cambien sus Temas ni su Autor. Despublicar una Colección no borra ni cambia de estado ninguna Cita. El editor ve cuántas Citas le faltan a una Colección para alcanzar su umbral, con la misma lectura que la vista de huecos por Tema.

**No canibalización.** La canónica de una Cita es siempre su Página de Cita, esté en cuantas Colecciones esté; una Cita presente en varias agregaciones no genera contenido duplicado indexable. La Página de Colección enlaza a cada Página de Cita y no es un destino terminal.

**Higiene del índice interno.** Hoy la 404 y la página de búsqueda aparecen en el índice de búsqueda interna pese a declararse no indexables: la búsqueda debe devolver Citas, Autores y Temas, no superficies internas.

**Contra-métrica que frena la feature.** La vía barata de multiplicar páginas indexables es fabricar Colecciones de cinco Citas; por eso las Colecciones entran en la misma contra-métrica de densidad que los Temas (mediana de Citas por agregación publicada). El umbral mínimo existe para eso.

**Accesibilidad y móvil.** La Página de Colección cumple WCAG 2.1 AA y es plenamente utilizable a 360 px, y entra en el barrido automatizado sin haberse añadido a ninguna lista aparte.

**Puerta de publicación de la v3.** Se puede construir en cualquier orden, pero nada se publica hasta que las Condiciones de Lanzamiento estén verificadas. Ninguna historia de esta épica la abre ni está bloqueada por ella.

## Technical Decisions

- **Un solo dueño del carácter publicable de una superficie.** Una superficie declara en un único sitio si es publicable, y de esa declaración derivan tres consecuencias: su inclusión o exclusión en el sitemap, su `noindex`, y su entrada en el barrido automatizado de accesibilidad y móvil. Añadir una superficie no puede exigir acordarse de un segundo fichero. Hoy la información está repartida en tres sitios: dos banderas en el armazón compartido y un filtro de expresiones regulares en la configuración de Astro; el índice de búsqueda interna no deriva de ninguno, que es el fallo visible. Empieza por consolidarlo.
- **Pertenencia declarada en la Colección, y blanda.** Los miembros se declaran por slug en `corpus/colecciones/{slug}.yml`, invirtiendo a propósito la dirección del Tema (que se declara en la Cita). La lista es una referencia blanda: se resuelve intersectándola con el conjunto publicable, y un slug no publicado simplemente no forma parte de la Colección. Nunca una referencia dura de esquema — mover una Cita a `corpus/_revision/` no puede romper el build, porque despublicar sigue siendo mover un fichero.
- **El umbral se aplica al recuento resuelto, jamás al declarado.** Su valor está deliberadamente sin fijar: sale de curar las tres o cuatro primeras Colecciones. Mientras tanto vive en `src/lib/umbrales.ts` con un valor provisional declarado como tal, nunca como literal suelto en otro módulo.
- **Dueño único del conjunto publicable, extendido.** `src/lib/publicado.ts` posee también las Colecciones y la enumeración de descubrimiento: publicable y alcanzable son el mismo conjunto. Ningún módulo aplica un umbral por su cuenta ni filtra colecciones directamente.
- **Componente de tarjeta único.** Toda superficie indexable que enumere Citas las presenta con `src/components/TarjetaDeCita.astro` — fragmento acotado, atribución y enlace. La Colección lo reutiliza y no compone el suyo; ninguna agregación reproduce el texto íntegro de una Cita.
- **El slug de la Cita no participa de la agregación.** Ni Temas ni Colecciones entran en la ruta de una Cita, y el slug no se recalcula por pertenecer a una Colección. La ruta de Colección es propia y paginada, en línea con las de Autor y Tema.
- **La herramienta de curación es comodidad, no puerta.** Editar un fichero de Colección a mano salta la herramienta pero no las reglas: el esquema aplica las mismas y rompe el build si se incumplen.
- **Sin tecnología nueva.** El stack es el de la v2.

## UX & Interaction Patterns

- **Hueco de diseño declarado, y qué lo sustituye.** Los documentos de diseño y de experiencia están al día del 10/08 y no describen la Página de Colección como superficie (tampoco el Kit Diario). Las historias de esta épica se escriben con el criterio de tarjeta única como aceptación en lugar de con una espina de UX que la cubra. Una pasada de diseño acotada a esta superficie puede refinar la presentación más adelante sin invalidar ninguna historia, siempre que respete la regla de tarjeta única.
- **Presentación.** El listado usa el mismo componente de tarjeta que Tema y Autor: fragmento en `headline-sm`, autor en el token `author`, filete divisorio entre tarjetas. Empieza sin preámbulo — la primera tarjeta es el primer contenido bajo el nombre.
- **Tipografía.** El nombre de la Colección va en Source Serif, como los de Autor y Tema; todo lo demás —criterio editorial, navegación, metadatos— en Inter. Ningún otro uso de la serif.
- **Voz.** El texto editorial describe el criterio por el que la Colección está reunida y no adjetiva ni comenta ninguna Cita. Va al pie del listado, no antes, y por debajo de todo lo citado en jerarquía visual.
- **Navegación lateral, no jerárquica.** La Colección se alcanza por enlaces internos desde la portada, con un chip idéntico al de Tema. No introduce migas de pan ni una jerarquía que el sitio no tiene, y el chip no aparece en la Página de Cita: la Colección enlaza a sus Citas, no al revés. (El enlace inverso desde la Página de Cita se descartó a propósito en la validación; sería una superficie de diseño nueva y queda como pregunta para una pasada de diseño.)
- **Accesibilidad estructural.** Foco visible de 2 px, un solo `h1`, listados como listas reales, igual que las demás superficies públicas.

## Cross-Story Dependencies

- 12.1 va primera: el dueño único de superficie publicable es lo que permite que 12.3 entre en sitemap y barrido sin listas aparte. 12.2 es el corazón técnico y habilita 12.3 y 12.4; el orden natural es 12.1 → 12.2 → 12.3 → 12.4.
- 12.4 depende del esquema y de la resolución blanda de 12.2, y reutiliza la lectura de «cuánto falta» de la vista de huecos construida para el sembrado.
- La épica se beneficia del volumen de la Épica 11 —una Colección necesita Citas publicadas entre las que escoger— pero no está bloqueada por ella.
- La Épica 13 hereda de aquí el dueño único de superficie publicable para su lote interno, y su pieza derivada de una Colección publicada consume lo que esta épica define.
- Toca módulos compartidos: el conjunto publicable, el módulo de umbrales, el armazón y la configuración de sitemap. Coordinar con cualquier trabajo simultáneo sobre ellos.
