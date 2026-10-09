# Informe de validación — brainlySabiduria

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/EXPERIENCE.md`
- **Ejecutado:** 2026-10-09T07:58:13+02:00

## Veredicto general

Como contrato de la **Página de Obra**, el par aguanta. La v7.1 la cubre con su fila de la IA, la Cabecera, «Dónde leer esta obra», las ediciones en venta, once estados, la sección de Obra traducida y la microcopia de pestaña y descripción, y todas las referencias de token resuelven. Lo que impide extraer limpio está **fuera del núcleo nuevo**: un componente del que dependen cuatro filas —la línea de la Fuente de la Página de Cita— no existe en ninguna de las dos espinas; la Tarjeta Social de Obra no tiene especificación visual, y reutilizar la plantilla que sí está descrita rompe la regla de la serif; y las dos espinas se contradicen entre sí en componentes ya construidos: la búsqueda de la cabecera, las acciones, el chip y la iconografía. También quedan dentro del contrato decisiones que el propio texto declara abiertas —la hoja del sistema en el Kit, el progreso de la imagen, los cuerpos de la Lista de Obras y la Tarjeta Social de Autor—, y EXPERIENCE.md arrastra mucha historia de decisiones que pertenece a la bitácora. Hay 21 `[ASSUMPTION]` pendientes de Héctor (6 en DESIGN.md y 15 en EXPERIENCE.md); están bien marcadas y no cuentan como hallazgo.

La lente de accesibilidad cambia el cuadro: **el suelo WCAG 2.1 AA que declaran las espinas no se cumple hoy, y no se cumpliría aunque se reconstruyera todo desde ellas.** No hay en el sitio una sola región viva. En `/buscar/` el recuento de resultados y la frase de «sin resultados» aparecen sin anunciarse, «Copiado.» solo cambia el rótulo del botón enfocado y la imagen lista llega en silencio, y el Accessibility Floor no menciona los mensajes de estado (4.1.3, AA). Es el único hallazgo high de la lente; otros dos tocan criterios de nivel A en lo construido —2.4.4 en los destinos de compartir y 4.1.2 en el nombre del diálogo de imagen— con severidad media. El resto es contrato sin escribir: ninguna pareja de la paleta separa un enlace del texto de su línea por color (todas por debajo de 3:1), así que el subrayado tiene que ser regla general y no caso por caso; falta una política de enlaces que salen del sitio y el nombre accesible de los enlaces de compartir y de afiliado; y la exención de zona de toque está mal aplicada al título de la Obra en la Atribución. La v7.1 decide bien lo gordo —subrayado siempre en la Página de Obra, estructura en «Dónde leer», nada recortado—, y el arreglo del high es corto: una regla en el Accessibility Floor y una región `role="status"` en `/buscar/` y en Copiar.

## Veredictos por categoría

- Cobertura de flujos — adecuado
- Completitud de tokens — adecuado
- Cobertura de componentes — flojo
- Cobertura de estados — adecuado
- Referencias visuales — adecuado
- Hinchazón y sobreespecificación — flojo
- Disciplina de herencia — adecuado
- Ajuste de forma — sólido

## Hallazgos por severidad

52 hallazgos: Critical 0 · High 4 · Medium 18 · Low 30. Rúbrica: 35 (High 3, Medium 11, Low 21). Lente de accesibilidad: 17 (High 1, Medium 7, Low 9).

### Critical (0)

Ninguno.

### High (4)

**[Cobertura de componentes]** — La línea de la Fuente de la Página de Cita no tiene fila en ninguna de las dos espinas (§ DESIGN.md:133, :188, :199, :203; EXPERIENCE.md:166)

Está construida (`src/components/Fuente.astro`, 2026-08-26) y cinco pasajes se definen contra ella:

- el siena de § Colors;
- «Semblanza», «como el enlace de la Fuente en la Página de Cita»;
- «Dónde leer esta obra», con la misma frase;
- la exención de zona de toque;
- las «Acciones», que van «debajo de la Atribución y de la línea de la Fuente».

Su comportamiento solo vive en el código: el rótulo es el nombre de la Fuente o su anfitrión, nunca la URL desnuda; lleva la licencia si consta; **no afirma el cotejo**; y no se pinta sin Fuente. Lo que FR-54 pide a «Dónde leer» se define por analogía con ella.

Arreglo: una fila en cada espina, escrita como está construida.

**[Cobertura de componentes]** — La Tarjeta Social de Obra (FR-51) no tiene especificación visual en DESIGN.md (§ DESIGN.md:201; EXPERIENCE.md:111)

Tiene fila en EXPERIENCE.md y no en DESIGN.md. La única especificación visual disponible es la «plantilla común de las Tarjetas Sociales de listado», que pone el nombre **en serif** y añade una banda siena decorativa. Reutilizarla para la Obra pone el título en serif, contra el Don't y contra la convención de la espina de arquitectura, y hereda un uso del siena que choca con «siena = actuar o salir». El `[DERIVADO]` «título de la Obra en Inter» de la bitácora (.memlog.md:63) no llegó a DESIGN.md. Quedan también abiertas la composición de la Tarjeta Social de Autor de la v5 («ni la maqueta ni la bitácora fijan su composición») y la Tarjeta Social de Cita (FR-19), que no tiene fila.

Arreglo: una fila «Tarjeta Social» en DESIGN.md, con sus variantes de Cita, listado, Autor y Obra, el título de la Obra en Inter y una decisión sobre la banda siena.

**[Cobertura de componentes]** — Las dos espinas se contradicen entre sí en componentes construidos (§ DESIGN.md:133, :188, :190, :193, :209; EXPERIENCE.md:34, :92, :114, :235-236)

Son divergencias ya conocidas (.memlog.md:79), pero aquí no es solo la espina contra el código, sino un documento contra el otro, y quien implemente recibe dos respuestas. Gravedad de cada una:

| Componente | Qué dice cada sitio | Gravedad |
|---|---|---|
| Campo de búsqueda | Las dos filas lo ponen «en la cabecera, todas las superficies públicas». DESIGN § Colors cuenta «Buscar» como enlace siena, y la nota de la maqueta de EXPERIENCE.md dice que lo construido es el enlace «Buscar». Afecta a la cabecera de todas las páginas (DESIGN.md:133, :190; EXPERIENCE.md:34, :92, :114). | high |
| Acciones | DESIGN.md dice «cada una en su propia línea», como está construido. EXPERIENCE § Responsive dice «a ancho completo apiladas» por debajo de 600 px y «en línea» de 600 a 1024 (DESIGN.md:188; EXPERIENCE.md:235-236). | medium |
| Chip de Tema | DESIGN.md lo pone en `caption` (Inter 13), con `rounded.md` y sin alto mínimo. La nota de la maqueta de EXPERIENCE.md trata «chips de Tema en Inter y por debajo de `tap-target-min`» como divergencia respecto de lo construido, que es serif a 44 px (DESIGN.md:193; EXPERIENCE.md:114). | medium |
| Iconografía | DESIGN.md dice que los iconos se usan «exclusivamente para copiar, buscar y descargar», y el mismo DESIGN.md dice «Sin icono» en las Acciones y en el Campo de búsqueda (DESIGN.md:188, :190, :209). | medium |

Arreglo: que Héctor haga el triaje y que cada caso quede en una sola frase idéntica en las dos espinas, antes de que ninguna historia toque la Página de Cita o la cabecera.

**[Lente de accesibilidad · espina, construido]** — Ningún mensaje de estado se anuncia (§ EXPERIENCE.md § Accessibility Floor; src/pages/buscar.astro:64, :69)

En `/buscar/`, el recuento («12 resultados.») y «No encontramos esa frase. Prueba con menos palabras.» aparecen al teclear sin `role="status"` ni `aria-live` (`src/pages/buscar.astro:64` y `:69`; un `grep` de `aria-live|role="status"` en `src/` da cero). Quien busca con lector de pantalla teclea y no oye nada: ni que hay resultados, ni cuántos, ni que no hay ninguno. La salida de FR-8, «nunca un callejón sin salida», es un callejón mudo. «Copiado.» (`src/islands/CopiarCita.astro:82`) solo cambia el texto del botón enfocado, y VoiceOver en iOS, que es el público mayoritario (móvil), muchas veces no anuncia ese cambio. La espina no lo pide en ninguna parte: `EXPERIENCE.md § Accessibility Floor` no menciona mensajes de estado, y la fila «Resultado de búsqueda *(recoge lo construido)*» (L110) documenta lo construido sin ellos. Lo mismo vale para «Generando imagen» (L156): la previsualización llega en silencio. — WCAG 4.1.3 Mensajes de estado (AA).

Arreglo: añadir al Accessibility Floor: «Todo mensaje de estado —recuento de resultados, búsqueda sin resultados, “Copiado.”, imagen lista— se anuncia por una región `role="status"` que existe en el marcado desde la carga, vacía y no `hidden`; el cambio es de contenido, no de visibilidad». En `buscar.astro`, quitar `hidden` de `.estado`, darle `role="status"` y escribir ahí también la frase de sin resultados. En `CopiarCita`, un hermano solo para lectores con `role="status"` que recibe «Copiado.».

### Medium (18)

**[Cobertura de flujos]** — UJ-5 lleva dentro del contrato una decisión que él mismo declara sin tomar (§ EXPERIENCE.md:219-227)

El paso 4 describe compartir desde la hoja del sistema, y la nota «Desfase abierto, sin decidir» reconoce que el Kit construido solo descarga y que FR-21 no lo exige. Quien implemente historias no puede saber si debe construir la hoja en el Kit. Además, el paso 1 nombra cinco cuentas y el clímax dice «cuatro redes»; esa incoherencia ya viene del PRD.

Arreglo: que Héctor decida. Si el Kit sigue descargando, el paso 4 se reescribe como está construido y la hoja pasa a `[NOTE FOR PM]`. Si no, se compromete como requisito y se añade un patrón de componente del Kit. La cifra de redes se corrige en el PRD.

**[Completitud de tokens]** — Faltan los contrastes de los pares que cargan peso (§ DESIGN.md:131-133, :188, :193)

Calculados por la rúbrica:

| Par | Contraste | Dónde se usa | Situación |
|---|---|---|---|
| `on-primary` sobre `primary` | 6,7:1 | botón primario, relleno al pasar el cursor, plantilla elegida, plantilla Siena | pasa, sin declarar |
| texto del Chip de Tema | — | chip | el color no está asignado (solo `caption` y el fondo `surface-container`) |
| campo de copia manual | 1,3:1 el filete `outline-variant` sobre `surface-container-low`; 1,04:1 el relleno frente a `surface` | campo de copia | nada lo identifica como campo (WCAG 1.4.11 pide 3:1) |
| `outline` del campo de búsqueda | 3,66:1 | campo de búsqueda | pasa, sin declarar |

Dos de las cifras declaradas no cuadran: la tinta da 16,0:1, no 15,8:1, y la tinta apagada da 7,26:1, no 7,4:1.

Arreglo: una tabla de contraste con esos pares, asignar color al texto del chip y darle al campo de copia un filete que llegue a 3:1 (`outline`).

**[Completitud de tokens]** — Hay composiciones fuera de la escala de tokens (§ DESIGN.md:163, :194, :200, :201, :206)

La convención de la espina de arquitectura dice que los estilos son tokens definidos una sola vez.

- las Citas hermanas van en «Source Serif al tamaño de `{typography.body-lg}`», que es un token Inter;
- el resultado de Obra va en «Inter al cuerpo y peso de `headline-sm`», que es un token serif;
- la Lista de Obras deja «los cuerpos del título y del recuento… sin fijar», y eso bloquea la historia de la Épica 17;
- la respiración móvil de 40 px es un literal sin token, aunque el código ya lo tiene;
- las Tarjetas Sociales usan «píxeles del lienzo».

Arreglo: añadir tokens —por ejemplo uno serif de 17 px para las Citas hermanas, `title-sm` en Inter 21/600 y `quote-breathing` para móvil— y fijar los cuerpos de la Lista de Obras.

**[Cobertura de componentes]** — Al Resultado de búsqueda le falta la base en DESIGN.md (§ DESIGN.md:206; EXPERIENCE.md:110)

Solo existe «Resultado de búsqueda de tipo Obra», que se define por diferencia («el mismo trato que "Cita"…», «el mismo cuerpo y peso que ellos») contra una especificación base que no está escrita en ningún sitio. Lo construido es un rótulo de tipo y el título en serif de 21 px. Los nombres tampoco coinciden entre los dos ficheros.

Arreglo: una fila «Resultado de búsqueda» con la base y la variante de Obra.

**[Cobertura de componentes]** — Al pie de la Página de Obra le falta la especificación visual (§ EXPERIENCE.md:106-109; DESIGN.md:194, :203)

«Temas de la Obra» no tiene fila en DESIGN.md, y no está fijado el ritmo vertical de la secuencia listado → paginación → Temas → Dónde leer → Nota, cuando las Rutas de salida lo tienen al detalle. Tampoco está fijado el nivel de encabezado de «Temas», mientras que «Dónde leer» sí fija su `h2` y sus `h3`.

Arreglo: una fila para el pie de la Página de Obra que reutilice el ritmo de las Rutas de salida, con «Temas» como `h2`.

**[Cobertura de estados]** — «Carga normal… no hay nada que esperar» es falso para /buscar/ (§ EXPERIENCE.md:136, :141)

Los resultados llegan de Pagefind en el navegador: `buscar.astro` lo importa al enfocar el campo. Hay estados sin cubrir:

- la consulta vacía, en la que no se muestra nada;
- la carga del índice;
- un índice que no carga: el error no se trata y la página se queda en blanco;
- sin JavaScript: el formulario hace GET a `/buscar/?q=` y no aparece nada;
- el tope de 30 resultados.

Además, la salida de «sin resultados» construida enseña Temas, Colecciones y **todos** los Autores, y la espina dice «Temas destacados + Autores destacados». Pesa ahora porque la v7.1 añade el tipo Obra a esta superficie.

Arreglo: una fila por cada estado, como está construido o como se decida.

**[Cobertura de estados]** — «Generando imagen» no decide el progreso ni cubre el fallo del generador (§ EXPERIENCE.md:156)

El estado deja sin decidir si sigue haciendo falta el indicador de progreso que pedía la v1: lo anota y no lo resuelve. Tampoco hay estado para un generador que no llega a cargar, por ejemplo sin red después de cargar la página; hoy la previsualización se queda vacía indefinidamente.

Arreglo: decidir lo del progreso y añadir el fallo, por ejemplo «No se pudo preparar la imagen.», con Copiar disponible.

**[Cobertura de estados]** — Dos estados de la Lista de Obras se han quedado viejos frente a la v7.1 (§ EXPERIENCE.md:139-140; DESIGN.md:198)

- «Dos obras que son la misma partida por la Fuente — No se publican dos entradas» contradice AD-25 v7.1, que dice «grafías, nunca partes», que dos títulos donde uno es prefijo del otro avisan y no rompen, y que se decide en la Ficha de Obra. Hoy esos dos títulos serían dos Páginas de Obra hasta que la ficha las reúna.
- «Cita sin obra declarada — … el recuento lo dice» se apoya en un recuento que DESIGN.md declara inexistente («Citas documentadas», sin recuento).

La Épica 17 hereda los dos.

Arreglo: reescribir los dos estados contra AD-25 y FR-53, y decidir si hay recuento y dónde va.

**[Hinchazón y sobreespecificación]** — La prosa de EXPERIENCE.md arrastra historia de decisiones, alternativas descartadas y mediciones (§ EXPERIENCE.md:58-60, :99, :104, :106, :166)

La rúbrica pide que no lleve voz editorial:

- Cabecera de Obra: «el diseño del 05/10 traía tres…», «11 de los 183», «llega a cinco» y el segundo tramo descartado;
- Paginación: la historia de NFR-5;
- «Frases» y «citas»: el porqué y el coste aceptado;
- el título de pestaña: las alternativas descartadas;
- las Zonas de toque: el párrafo sobre WCAG;
- «Medido: los 16 del Oráculo…».

Hay filas de 150 a 250 palabras en las que la regla cabe en una frase.

Arreglo: dejar en la espina la regla y su referencia (FR o AD), y llevar el porqué a la bitácora, donde ya está.

**[Hinchazón y sobreespecificación]** — La regla retirada del siena sigue citada literalmente dentro de la regla vigente (§ DESIGN.md:133, :216)

«si aparece en más de dos sitios de una pantalla, algo está mal» sigue en § Colors y en el Do. Fuera del alcance de UX, el comentario de `src/styles/tokens.css` la sigue enunciando como vigente. Quien busque «siena» encontrará la regla vieja dos veces, una de ellas en el código.

Arreglo: quitar la cita de la espina y avisar del comentario a la próxima historia que toque `tokens.css`.

**[Disciplina de herencia]** — Los nombres de token chocan con la convención del repositorio (§ DESIGN.md:38-113)

`quote-*`, `author`, `quote-max-measure` y `quote-breathing` usan los nombres de entidad en inglés que vedan la convención de nombres de la espina de arquitectura y AGENTS.md («Ni `quote`… ni `author`»). El código los tradujo en `src/styles/tokens.css` (`--cita-xl`, `--autor`, `--siena`, `--titular-md`…), y esa correspondencia solo vive allí. El `title-lg` nuevo todavía no tiene nombre en español, y el obvio, `--titular-lg`, se confundiría con `--titular-md` y `--titular-sm`, que son serif.

Arreglo: una tabla «token de DESIGN.md → propiedad CSS» en DESIGN.md con el nombre de `title-lg` ya fijado, o renombrar los tokens en español.

**[Lente de accesibilidad · espina]** — El enlace de una edición en venta se queda sin propósito ni declaración para quien navega por enlaces (§ EXPERIENCE.md L108, L118; DESIGN.md L204)

La espina fija que el enlace sea **solo** el nombre de la tienda, y corrige a propósito la maqueta, que enlazaba «Edición impresa en Amazon México» (L118). En la lista de enlaces del lector queda «Amazon México», y con dos ediciones en la misma tienda quedan dos «Amazon México» iguales que van a sitios distintos. La declaración «Enlace de afiliado: si compras…» va detrás, en la misma línea, pero no está asociada al enlace, así que FR-35 («en la misma línea que cada enlace») se cumple a la vista y no para quien navega por enlaces o tabula. Además: `rel="sponsored noopener"` presupone `target="_blank"` y la espina no dice si se abre en pestaña nueva; tampoco fija el elemento del bloque `data-ingreso`. Si se copia el patrón de `Sostener` (`<aside aria-label>`), queda una región complementaria metida dentro de «Dónde leer», dentro de `main`. — WCAG 2.4.4 Propósito de los enlaces (A: se salva por contexto de párrafo, pero ese contexto no llega por la lista de enlaces), 1.3.1.

Arreglo: que el texto del enlace sea «Edición impresa en {tienda}» / «Edición electrónica en {tienda}», como en la maqueta, y que la declaración vaya en un `<span id>` referenciado con `aria-describedby` desde su enlace. Decidir y escribir si abre pestaña nueva; si la abre, el aviso va dentro del nombre accesible, como en `Sostener`. Las ediciones van en `<ul>`, una por `<li>`, dentro de un `<div data-ingreso>` con su `h3`, y nunca en un `aside`. Escribir «subrayado» explícitamente (ver el hallazgo de la regla del subrayado).

**[Lente de accesibilidad · espina, construido]** — Los destinos de «Compartir la cita» no dicen que comparten (§ EXPERIENCE.md L90; DESIGN.md L188; src/islands/CompartirEnlace.astro:47-60)

Sin hoja del sistema (Firefox de escritorio, por ejemplo), lo que se ve y lo que se lee es una fila de enlaces «WhatsApp», «Telegram», «X» y «Correo» sin rótulo visible ni programático: el botón «Compartir la cita» desaparece justo entonces (`DESIGN.md` L188: «se sustituye por los destinos»), y la lista no lleva `aria-label` ni encabezado. Con NVDA, «enlace WhatsApp» se oye como el WhatsApp del sitio, y el día que la cuenta de X exista, el pie (`DondeSeguirnos`) y los destinos tendrán dos «X» con propósitos opuestos. — WCAG 2.4.4 Propósito de los enlaces (en contexto) (A): no hay frase, párrafo ni encabezado previo que dé el contexto.

Arreglo: en la espina (`EXPERIENCE.md` L90, `DESIGN.md` L188), que cada destino diga «Compartir en {destino}», o como mínimo «Compartir en» oculto y solo para lectores dentro del enlace, con el aviso de pestaña nueva al final (siguiente hallazgo).

**[Lente de accesibilidad · espina, construido]** — No hay una política de enlaces que salen del sitio, y lo construido hace tres cosas distintas (§ EXPERIENCE.md § Interaction Primitives; DESIGN.md L133)

La Fuente abre en la misma pestaña (`Fuente.astro`). «Apoyar el sitio» abre pestaña nueva y lo anuncia dentro de su nombre accesible (`Sostener.astro`). Los destinos de compartir (`CompartirEnlace.astro:51`) y las cuentas del pie (`DondeSeguirnos.astro:36`, en todas las páginas) abren pestaña nueva **sin avisar**. Las ediciones en venta, sin decidir. En móvil, una pestaña nueva silenciosa rompe el gesto de volver, y quien no ve la pantalla no sabe por qué. La regla «siena = actuar o salir» (`DESIGN.md` L133) añade otro problema: confía al color la diferencia entre dentro y fuera. El rechazo de E3 («vestía igual la obra, dentro del sitio, que la Fuente, fuera») da por hecho que el color distingue, y siena sobre tinta es 2,56:1, que para protanopía o deuteranopía es el mismo marrón oscuro. — WCAG 3.2.5 (AAA) y técnica G201; 1.4.1 si el color es la única señal de «sale».

Arreglo: una línea en `EXPERIENCE.md § Interaction Primitives` que diga qué enlaces abren pestaña nueva (propuesta: ninguno salvo los que entregan a un tercero con estado —donar, compartir, comprar—) y que todo enlace que la abre lo anuncia dentro de su nombre accesible con el patrón de `Sostener`. Añadir que el siena **nunca** es la única señal de salida: la salida la dice también el texto, como ya hace «Texto tomado de…». Arreglar `CompartirEnlace` y `DondeSeguirnos`.

**[Lente de accesibilidad · espina]** — La exención en línea está mal aplicada al título de la Obra en la Atribución, y «de {Autor}» no tiene regla de zona de toque (§ EXPERIENCE.md L166, L104; DESIGN.md L202; src/components/Atribucion.astro:77)

El título no va «a mitad de oración»: abre la línea y casi **es** la línea («Oráculo manual y arte de prudencia, 1647.»). Lo que de verdad limita su altura no es el interlineado ajeno, sino que nadie le ha dado relleno. Medido en la Página de Cita a 320 px: la caja de la línea de Procedencia mide 19,5 px y la del texto 16 px. El enlace del Autor ya crece a 44 px con `padding-block: 13px` y margen negativo (`src/components/Atribucion.astro:77`) y **se mete 5 px en la línea de la Procedencia** (473,9–518,1 frente a 513,1); `elementFromPoint` sobre el hueco de esa línea devuelve ya el enlace del Autor. El de la Fuente queda 11,5 px por debajo, con 16 px de alto. Así que E2 apila tres objetivos en unos 84 px, y el del medio, de 16 px, solapa el área del de arriba. No pasaría ni la excepción de espaciado de 2.5.8, porque el círculo de 24 px centrado en el título corta la zona del Autor. Con el foco en el Autor, su anillo tacha además el título de la Obra. La Cabecera de Obra no dice nada del objetivo de «de {Autor}» (`DESIGN.md` L202, `EXPERIENCE.md` L104), que es el paso 4 de UJ-3. Aquí no hay nada interactivo en 8 px alrededor: el `h1` no enlaza y el listado empieza 32 px más abajo. — WCAG 2.5.8 (AA de 2.2) y 2.5.5 (AAA); la regla de producto de 44 px con 8 px (L166).

Arreglo: retirar la [ASSUMPTION] de L166 para el título de la Obra y escribir que lleva al menos 24 px de zona efectiva sin solapar ninguna otra (relleno vertical con margen negativo, como el Autor) y que la zona ampliada del Autor no invade la línea siguiente: menos relleno inferior, o 2 × `{spacing.unit}` entre Autor y Procedencia. Para «de {Autor}», 44 px por el mismo procedimiento que el nombre en la Atribución. La exención se queda para la Fuente («Texto tomado de [Wikisource]»), que sí va dentro de una frase.

**[Lente de accesibilidad · espina]** — El subrayado se escribe caso por caso, pero la paleta exige que sea regla general (§ DESIGN.md § Colors L133, L204; EXPERIENCE.md L177)

Ninguna pareja de color de enlace llega a 3:1 frente al texto de su línea: tinta/tinta apagada **2,20:1**, siena/tinta apagada **1,16:1** (prácticamente la misma luminancia), siena/tinta **2,56:1**. Así que **ningún** enlace dentro de un texto se distingue por color en este sistema. `DESIGN.md § Colors` (L133) justifica el siena con «6,3:1 sobre papel: pasa AA también como texto de enlace», que es la comparación equivocada para 1.4.1. El Accessibility Floor (L177) enumera solo dos casos subrayados (título de la Obra y «de {Autor}»), y las ediciones en venta (`DESIGN.md` L204) no dicen «subrayado». Hoy sale subrayado por el estilo por omisión del navegador, y deja de salir en cuanto alguien escriba `text-decoration: none` en un atributo `style`, como ya llevan el siena de «Buscar» y la paginación. Las cifras declaradas tampoco son exactas: tinta/papel es 16,0 (no 15,8) y tinta apagada/papel 7,26 (no 7,4). Ninguna cambia de nivel. — WCAG 1.4.1 Uso del color (A); regla axe `link-in-text-block`.

Arreglo: sustituir L177 por la regla general: «Todo enlace que comparte línea con texto que no enlaza va subrayado siempre, sea tinta o siena; ninguna pareja de la paleta llega a 3:1 entre enlace y texto». Publicar en `§ Colors` las tres razones enlace/texto junto a las de texto/fondo, y corregir 15,8 → 16,0 y 7,4 → 7,26.

**[Lente de accesibilidad · espina]** — Las versalitas no distinguen el nombre del Autor como enlace, porque el sistema las usa para lo que no enlaza (§ DESIGN.md L133, L186; EXPERIENCE.md L177)

El token `author` (mayúsculas espaciadas) viste también los `h2` «TEMAS», «MÁS DE…», «DÓNDE LEER ESTA OBRA» y «CITAS DOCUMENTADAS», el rótulo de tipo «OBRA» de `/buscar/` y el nombre del Autor que va *dentro* de la tarjeta sin ser enlace propio. En la Página de Cita, el nombre en versalitas y sin subrayado no tiene ninguna señal visual de que lleva a algún sitio. Y el mismo destino, la Página de Autor, va subrayado en la Cabecera de Obra y sin subrayar en la Atribución. Las Rutas de salida no lo compensan: «Más de {Autor}» es un `h2`, no un enlace. No es un fallo estricto de 1.4.1 (el nombre ocupa su propia línea), pero el razonamiento de L133, L186 y L177 es falso y una historia lo heredaría como verdad. Quien más lo nota es la persona con baja visión o con dificultades cognitivas, que no descubre el enlace. — WCAG 3.2.4 Identificación coherente (AA, en el espíritu) y 1.4.1 por analogía.

Arreglo: subrayar siempre también el nombre del Autor en la Atribución. Si se decide no hacerlo, que la espina lo registre como coste aceptado, con su motivo real, y retire «se distingue por sus versalitas».

**[Lente de accesibilidad · construido]** — El diálogo de imagen se anuncia como «Descargar la cita como imagen» donde la acción es compartir (§ src/islands/ImagenDeCita.astro:85; EXPERIENCE.md L88; DESIGN.md L189)

En móvil, donde la acción es compartir, son casi todos los dispositivos. El nombre está escrito en el marcado (`src/islands/ImagenDeCita.astro:85`), y el guion cambia el texto de los dos botones a «Compartir como imagen» y «Compartir», pero no toca el `aria-label`. El título visible, «Elige un diseño.», no está asociado al diálogo, así que quien ve y quien oye reciben dos nombres distintos. Rompe la regla de la propia espina («Su rótulo dice adónde irá la imagen», `EXPERIENCE.md` L88), que no dice cómo se nombra el diálogo. — WCAG 4.1.2 Nombre, función, valor (A) y 2.4.6 (AA).

Arreglo: `aria-labelledby` hacia el título visible y un `aria-describedby` que diga «Compartir» o «Descargar» según la capacidad, o actualizar el `aria-label` en el mismo punto del guion que cambia los rótulos. En `DESIGN.md` L189, una frase: «el nombre accesible del diálogo sigue al rótulo de la acción».

### Low (30)

**[Cobertura de flujos]** — El paso 2 de UJ-2 promete varios diseños compuestos a la vez (§ EXPERIENCE.md:196 frente a :89 y DESIGN.md:189)

Dice «con unos pocos diseños y su Cita ya compuesta en cada uno». El Diálogo de Imagen, en las dos espinas, tiene una sola previsualización, tres botones de plantilla y Papel elegida al abrir.

Arreglo: «elige entre Papel, Tinta y Siena; la previsualización muestra la elegida».

**[Cobertura de flujos]** — El clímax de UJ-1 no es el del PRD (§ EXPERIENCE.md:189-191)

El PRD lo pone en tener la Cita pegada, con su atribución, en menos de 30 s. La espina lo pone en «confía en lo que va a citar» (paso 3) y deja los 30 s en el paso 5, sin marca de clímax.

Arreglo: marcar el clímax del PRD, o declarar la reinterpretación.

**[Cobertura de flujos]** — UJ-4 remite a un panel y a una herramienta que no existen (§ EXPERIENCE.md:37, :213, :216)

El clímax dice «visible en el propio panel (FR-16)», y la IA afirma que «No hay panel autenticado en producción». El paso 1 habla de «la herramienta de Curación», cuando la puerta real son tres órdenes: `recuperar`, `extraer` y `revisar`.

Arreglo: «visible en el informe de salud del Corpus, en la terminal».

**[Cobertura de flujos]** — Ningún flujo cubre la entrada directa a una Página de Obra desde el buscador externo (§ EXPERIENCE.md § Key Flows)

La entrada desde el buscador externo («frases del Oráculo manual») es la primera razón de ser de §4.19, y tampoco hay flujo para el paso de «Dónde leer» a la edición cotejada. El PRD no tiene UJ para eso, así que la rúbrica no lo cuenta como falta.

Arreglo: si se quiere el flujo, pedir al PM una variante de UJ-3. La espina no debe inventar un UJ.

**[Cobertura de componentes]** — Hay componentes construidos que no aparecen en ninguna espina (§ DESIGN.md § Components; EXPERIENCE.md § Component Patterns)

Aunque esta pasada quería ponerse al día con lo construido, faltan:

- «Dónde seguirnos», en el pie del armazón (`DondeSeguirnos.astro`), que está en todas las páginas, también en las de lectura;
- la cabecera del sitio, con la marca y «Buscar»;
- la Cita del Día de la portada;
- el material del Kit y del Lote (`MaterialParaPublicar.astro`).

Arreglo: añadirles fila, o declararlos expresamente fuera del contrato.

**[Cobertura de componentes]** — La fila de la Tarjeta de Cita no recoge la excepción sin nombre de Autor (§ EXPERIENCE.md:93 frente a :105 y DESIGN.md:191)

Sigue diciendo «Fragmento + autor» para los listados de Autor y de Obra, sin la excepción que sí fijan DESIGN.md y la fila del Listado de Obra: sin el nombre del Autor.

Arreglo: añadir la excepción en esa fila.

**[Cobertura de estados]** — Una Obra cuyas Citas no tocan ningún Tema publicado no tiene estado (§ EXPERIENCE.md:106)

Con todos sus Temas por debajo de 15, no se sabe si el rótulo «Temas» se pinta vacío.

Arreglo: «Sin Temas publicados, el bloque no existe».

**[Cobertura de estados]** — Los estados construidos del Kit y del Lote no figuran en State Patterns (§ EXPERIENCE.md:35-36)

La fila del Lote dice que se documenta «como está construido», y faltan:

- «Hoy no hay ninguna Cita apta para portada.»;
- el lote vacío;
- una fijación muda;
- la alternativa con Imagen.

Arreglo: filas de estado para los dos.

**[Cobertura de estados]** — Quedan dos estados vacíos sin cubrir (§ EXPERIENCE.md § State Patterns)

- la portada sin ninguna Colección publicada, que es el estado real de hoy porque `corpus/colecciones/` está vacío;
- una Página de Autor cuyas Citas no declaran obra, con la Lista de Obras vacía (¿se pinta el rótulo?).

Arreglo: una fila para cada uno.

**[Referencias visuales]** — DESIGN.md cita maquetas sin nombrarlas ni enlazarlas (§ DESIGN.md:198-203)

- «la maqueta del orden B»;
- «La maqueta»;
- «Es la variante A» y «variante D2»;
- «la bitácora», que es `.memlog.md` y no es una fuente para quien consume las espinas.

Con tres maquetas, «la maqueta» es ambigua.

Arreglo: enlazar `mockups/pagina-de-autor-tres-ordenes.html` y `mockups/pagina-de-obra-variantes.html`.

**[Referencias visuales]** — «Mandan las espinas» se repite cuatro veces, y la nota de la Página de Autor niega una divergencia que ya existe (§ EXPERIENCE.md:116; DESIGN.md:198-199)

Está en la cabecera y en tres notas. La nota de la maqueta de la Página de Autor dice además «si algún día divergen», cuando ya divergen en tres puntos que DESIGN.md enumera: la región junto a los años, el recuento en el rótulo y la semblanza a un cuerpo menor.

Arreglo: dejar una sola declaración y listar esas tres divergencias en la nota.

**[Hinchazón y sobreespecificación]** — El estado de implementación está mezclado con el contrato (§ DESIGN.md:188-207)

- «(recoge lo construido)», «Construido:», «Sin construir (Épica 17)», «hoy se pinta también en las 2+»;
- una marca de versión (v5, v7.1…) en casi cada fila.

Todo eso caduca con cada historia.

Arreglo: un único marcador «Estado» por fila, o llevarlo a `sprint-status.yaml`.

**[Hinchazón y sobreespecificación]** — Hay 21 tokens que ninguna espina referencia (§ DESIGN.md:136; EXPERIENCE.md:37)

La paleta `error-*`, `inverse-*`, `surface-dim` y `surface-bright`, `surface-container-high` y `-highest`, `on-*-container`, `rounded.sm` y `rounded.full`. La paleta de error contradice que no exista ningún estado visual de error. Y `secondary` está reservado a una herramienta de curación que EXPERIENCE.md declara de terminal.

Arreglo: quitarlos o marcarlos como reservados.

**[Hinchazón y sobreespecificación]** — Hay literales en píxeles donde ya existe un token (§ DESIGN.md:185, :187; EXPERIENCE.md:166)

- «Botones — texto en Inter 15px» (`body-md`);
- «filete corto (48px, 1px…)» (`rule-width`);
- «8px de separación» (`spacing.unit`).

Arreglo: citar los tokens.

**[Hinchazón y sobreespecificación]** — Las anti-referencias están duplicadas (§ DESIGN.md:124; EXPERIENCE.md:245-253)

Texturas, publicidad intercalada y botoneras de ocho redes aparecen en DESIGN.md § Brand & Style y en EXPERIENCE.md § Inspiration & Anti-patterns.

Arreglo: dejarlas en un solo sitio.

**[Disciplina de herencia]** — «Nombres heredados verbatim del PRD §2.3» no es cierto en tres de los cinco UJ (§ EXPERIENCE.md:184)

- UJ-1 pierde «, y la necesita ahora»;
- UJ-3 pierde «una hora»;
- UJ-4 pierde «nuevas» y «del sitio».

Los identificadores UJ-N son estables, así que la trazabilidad no se rompe.

Arreglo: copiar los títulos literales.

**[Disciplina de herencia]** — El `sources` de DESIGN.md omite el encargo de la Página de Obra y mezcla tres bases de ruta (§ DESIGN.md:4-6; EXPERIENCE.md:4-8)

No incluye `docs/superpowers/specs/2026-10-05-pagina-de-obra-design.md`, aunque sus filas de la v7.1 (`title-lg`, cabecera A, D2, E2) responden a ese encargo. Además, `sources` mezcla `{planning_artifacts}/…`, `docs/…` relativa al repositorio y `DESIGN.md` relativa al espacio.

Arreglo: añadir la fuente y unificar las bases.

**[Disciplina de herencia]** — Los nombres de componente no son idénticos entre secciones y ficheros (§ DESIGN.md y EXPERIENCE.md, varias secciones)

- «Rutas de Salida» (dos veces en DESIGN.md) frente a «Rutas de salida»;
- «Tarjeta de Cita (listados)» frente a «Tarjeta de Cita»;
- «Acciones de la Página de Cita» frente a «Acción Copiar», «Acción Imagen» y «Acción Compartir la cita»;
- «Resultado de búsqueda de tipo Obra» frente a «Resultado de búsqueda»;
- «diálogo de Imagen» y «Diálogo» frente a «Diálogo de Imagen»;
- «Nota de la ficha», ambigua porque hay dos fichas en superficies vecinas, la de Obra y la de Autor.

Arreglo: un único nombre por componente, y «Nota de la Ficha de Obra».

**[Disciplina de herencia]** — Tres desajustes con el glosario y con las fuentes (§ EXPERIENCE.md:108, :112, :153)

- «hoja del sistema» va en minúsculas en todo el texto, y el glosario dice «Hoja del Sistema»;
- UX-DR35 se cita tres veces, y es un identificador definido en `epics.md`, que está aguas abajo de estas espinas y fuera de sus fuentes;
- «Curación» y «Lote» se usan como nombres de superficie y no están en el glosario.

Arreglo: respetar la mayúscula del glosario y citar FR-33 y AD-20 en lugar de UX-DR35.

**[Ajuste de forma]** — La clave `components` del frontmatter guarda dimensiones sueltas, y falta `description` (§ DESIGN.md:109-113)

Guarda cuatro dimensiones (`rule-width`, las dos medidas y `tap-target-min`). La especificación de DESIGN.md reserva esa clave para objetos de componente, así que un resolvedor leería `rule-width` como un componente. Al frontmatter le falta además `description`.

Arreglo: mover esas dimensiones a `spacing` o a un grupo propio, y añadir `description`.

**[Ajuste de forma]** — «Obra traducida» termina con una nota para el PM (§ EXPERIENCE.md:130)

«Aviso, no regla» es una nota para el PM sobre el modelo de datos y ya está en la bitácora (.memlog.md:55).

Arreglo: dejarlo en una línea: «Abierto en datos: ver FR-48».

**[Lente de accesibilidad · espina]** — La Nota de la ficha cae, en la estructura, bajo el último h3 de «Dónde leer esta obra» (§ EXPERIENCE.md L109; DESIGN.md L205)

Con el Modelo encendido ese `h3` es «Ediciones en venta», y quien navega por encabezados, o lee de corrido, oye «Trescientos aforismos comentados, publicados en Huesca en 1647…» como si fuera parte de la oferta comercial. La nota no tiene encabezado ni sección propia. — WCAG 1.3.1 Información y relaciones (A).

Arreglo: «Dónde leer esta obra» como `<section aria-labelledby="{id del h2}">`, con la nota **fuera** de esa sección, y con un rótulo propio (`h2` con el trato del rótulo, por ejemplo «Sobre esta obra») o como `<p>` precedido del filete. Escribirlo en la fila de la Nota.

**[Lente de accesibilidad · espina]** — El recuento de la Lista de Obras es un número sin unidad (§ DESIGN.md L200; EXPERIENCE.md L102)

La espina fija «el recuento de sus Citas a la derecha… con cifras tabulares», y la maqueta del orden B lo dibuja como `<span>34</span>` fuera del enlace. Con lector se oye «enlace, Del sentimiento trágico de la vida… 34». Tampoco se fija si la fila entera es el enlace (con 44 px, la fila lo pide) ni el nivel del rótulo «Su obra en este Corpus». — WCAG 1.3.1 y 2.4.4.

Arreglo: que la fila entera sea el enlace, con «citas» oculto solo para lectores tras la cifra («34 citas»), y que el rótulo sea `h2`, como «Citas documentadas» en lo construido.

**[Lente de accesibilidad · espina]** — Microcopia leída en voz alta (§ DESIGN.md L206; EXPERIENCE.md L110)

En «de Baltasar Gracián · 1647», el punto medio se lee «punto», «punto medio» o nada según el lector y su nivel de puntuación; en el último caso queda «de Baltasar Gracián 1647», sin pausa ni pista de que el número es un año. La Atribución resuelve lo mismo con coma («…, 1647.»). En `/buscar/`, el nombre de la fila de un resultado de Obra se compone sin puntuación: «Obra Oráculo manual y arte de prudencia Baltasar Gracián». — WCAG 1.3.1 y 2.4.4 (calidad, no fallo).

Arreglo: el punto medio con `aria-hidden="true"` y una coma oculta solo para lectores (sin añadir «publicada en», que afirmaría un dato que la Procedencia no asegura). En el resultado, «Obra:» y «, de {Autor}» como texto solo para lectores.

**[Lente de accesibilidad · espina]** — Jerarquía de encabezados de la Página de Obra a medio fijar (§ EXPERIENCE.md L106)

El nivel del rótulo «Temas» no está escrito (L106 dice «bajo el rótulo»), mientras que «Dónde leer esta obra» es `h2` y sus partes `h3`. Visualmente, los `h3` («Edición cotejada, gratuita», `caption` 400 en tinta) pesan **menos** que el `h2` y que nada de su entorno, y se separan de las líneas que encabezan solo por el color: tinta frente a tinta apagada, 2,20:1, al mismo cuerpo y peso. Para quien ve poco, rótulo y contenido son la misma línea. — WCAG 1.3.1 y 1.4.1.

Arreglo: «Temas» como `h2`, como en las Rutas de salida. Los `h3` de «Dónde leer» en `caption` 600, para que la jerarquía tenga una señal que no sea el color.

**[Lente de accesibilidad · construido]** — La paginación separa los números 4 px, no los 8 px de la regla (§ src/components/Paginacion.astro:124; EXPERIENCE.md L166)

Medido a 320 px en `/autor/baltasar-gracian/2/`: no hay desplazamiento horizontal (`scrollWidth` 320), pero la fila se descompone. «Página 2 de 4» se parte en dos líneas, los cuatro números se apilan en **una columna vertical** de 44 px a 4 px entre sí (188 px de alto), y «Siguiente» acaba en 301 px, 1 px dentro del margen. Pasa 2.5.8 por tamaño; incumple la regla de producto y deja los números apilados casi pegados para quien tiene temblor. — WCAG 1.4.10 (pasa por poco) y regla de producto de 8 px.

Arreglo: `gap: var(--unidad)` en `.numeros`, y en anchos estrechos la fila de números en su propia línea (por ejemplo, `flex-wrap: wrap` en `.paginacion` con los números a ancho completo) en lugar de una columna.

**[Lente de accesibilidad · espina]** — El reflow de la Cabecera A aguanta hoy, pero por casualidad (§ Fila de la Cabecera de Obra (DESIGN.md L202, EXPERIENCE.md L104))

Medido con la Inter del sitio sobre 133 de los 183 títulos, todos los largos incluidos. A 320 px (280 de texto), ningún título desborda; 16 ocupan tres líneas o más y 4 llegan a cuatro. Con el espaciado de 1.4.12, uno llega a seis. La palabra más ancha, «Librepensamiento», mide 226 px, y **276 px con el espaciado de 1.4.12: 4 px de holgura**. Los títulos son texto libre que escribe una persona en la Ficha (FR-53). Cualquier palabra de unas 17 letras o más («Hispanoamericanos», «Constitucionalismo») produce desplazamiento horizontal, y NFR-12 prohíbe encoger para remediarlo. La espina no dice cómo se parte una palabra que no cabe. — WCAG 1.4.10 Reflow y 1.4.12 Espaciado del texto (AA).

Arreglo: en la fila de la Cabecera de Obra, «el título parte palabras antes que desbordar: `overflow-wrap: break-word` y `hyphens: auto` con el `lang` del documento». Es la única salida compatible con NFR-12.

**[Lente de accesibilidad · espina, construido]** — El foco del campo de búsqueda contradice el suelo y es débil (§ EXPERIENCE.md L174; DESIGN.md L190; src/pages/buscar.astro:296, :303)

El Accessibility Floor dice «anillo de 2px en primary… Nunca se suprime» (L174), y `DESIGN.md` L190 da al campo otro indicador: un filete inferior que pasa de 1 px en `outline` a 2 px en siena. Lo construido escribe `outline: none` dos veces (`src/pages/buscar.astro:296` y `:303`), aunque `tokens.css:115` afirme que no existe ninguna regla así. El cambio de estado es 1 → 2 px con un cambio de color de **1,71:1** (contorno → siena), que con baja visión casi no se ve. — WCAG 2.4.7 Foco visible (AA: pasa) y 2.4.13 (AAA).

Arreglo: reconciliar las espinas (o anillo también en el campo, o el filete de foco a 2 px **y** que el estado enfocado se distinga del no enfocado por al menos 3:1) y corregir el comentario de `tokens.css`.

**[Lente de accesibilidad · espina]** — Idioma de partes en los títulos que no son castellanos (§ EXPERIENCE.md L180)

«De Agri Cultura» (Catón, 2 Citas: tiene página) está en latín, y FR-48 abrirá la puerta a más títulos no castellanos. La Ficha de Obra no tiene campo de idioma, y la espina solo declara `lang="es"` en el documento (L180). La excepción de nombres propios de 3.1.2 probablemente cubre un título, por eso es baja. — WCAG 3.1.2 Idioma de las partes (AA).

Arreglo: un campo opcional de idioma del título en la Ficha, que se vuelque como `lang` en el `h1`, en la Atribución, en la Lista de Obras y en el resultado de búsqueda.

**[Lente de accesibilidad · espina]** — La fila del Chip de Tema no lleva la zona de toque ni el cuerpo construidos (§ DESIGN.md L193)

No lleva `{components.tap-target-min}` y fija el texto en `caption` (13 px). Lo construido mide 44 px con texto de 15 px (divergencia ya anotada en la bitácora). Si la historia de triaje alinea lo construido con la espina, los 16 chips del Oráculo manual pierden la zona de toque y bajan de cuerpo. El fondo del chip contra el papel es 1,10:1, así que el chip tampoco se reconoce como control por su forma. — WCAG 2.5.8, y legibilidad.

Arreglo: recoger lo construido en la espina (texto de 15 px y alto mínimo de 44 px) antes de cualquier triaje.

## Notas mecánicas (rúbrica)

- `{ruta.al.token}` (EXPERIENCE.md:14) es el ejemplo de la sintaxis, no una referencia. Todas las demás resuelven.
- DESIGN.md usa `headline-sm` y `quote-*` sin llaves (DESIGN.md:147, :185, :191). Las demás referencias van en la forma `{typography.…}`.
- «Sin obra documentada» lleva punto final en la tabla de Voice and Tone (EXPERIENCE.md:50) y va sin él en Atribución y en State Patterns (:86, :137). Conviene unificarlo con lo que emite `Atribucion.astro`.
- En § Responsive, de 600 a 1024 px, dice «medida limitada a `{components.quote-max-measure}`» para toda la columna (EXPERIENCE.md:236). DESIGN.md reserva 34ch para la Cita y 68ch para la prosa, y el código usa una columna de 45rem.
- El formato base de lo copiado (FR-3), sin traductor, no está escrito en ningún sitio. Solo se deduce del ejemplo de § Obra traducida. La fila de la Acción Copiar debería decir que usa el título de la Ficha de Obra (FR-53).
- Accessibility Floor dice «navegación al final» del orden de tabulación de la Página de Cita, y la cabecera (marca y «Buscar») va antes del contenido (EXPERIENCE.md:175). La rúbrica lo deja a la lente de accesibilidad.
- Divergencias conocidas solo entre la espina y el código (.memlog.md:79), con la gravedad que les da la rúbrica:

  | Divergencia | Gravedad | Por qué |
  |---|---|---|
  | 4 px entre los números de página frente a los 8 px de las zonas de toque | medium | rompe una regla del suelo |
  | banda siena decorativa en las Tarjetas Sociales | medium | la heredaría la Tarjeta Social de Obra; ver §3 |
  | `aria-label` del diálogo que dice «Descargar» también al compartir | medium | toca a la accesibilidad |
  | progreso de la imagen sin construir | medium | ver §4 |
  | serif rasterizada en Georgia frente a «dos familias, sin excepciones» | low | — |

## Lo que está bien (lente de accesibilidad)

- **Contraste de texto, calculado:** tinta/papel 16,0:1; tinta apagada/papel 7,26:1, que se queda en 6,96 sobre `surface-container-low` (fondo de la tarjeta al pasar el cursor) y en 6,60 sobre `surface-container`; siena/papel 6,26:1 (6,00 al pasar el cursor); blanco/siena 6,70:1; tinta/chip 14,5:1. Todo pasa AA a 13 px, y casi todo AAA. El filete de búsqueda (`outline`) llega a 3,66:1 frente al papel (1.4.11).
- **Subrayado siempre** del título de la Obra y de «de {Autor}», con el porqué escrito (en móvil no hay hover). E1 se descartó con la razón correcta.
- **D2 sobre D1:** la diferencia entre lo gratuito y lo que se vende la dice la estructura (`h2` y `h3`), no tres enlaces siena seguidos. Sin ninguna Cita cotejada, no hay rótulo que afirme un cotejo.
- **Un solo `h1` por página.** En la Página de Obra es el título, y las páginas 2+ lo repiten con «— página N» en la pestaña. El orden del marcado coincide con el de lectura (cabecera, listado, paginación, Temas, Dónde leer, nota): nada se reordena por CSS.
- **Nada se recorta ni se encoge**, sin máximo de líneas, y sin desplazamiento horizontal medido a 320 px.
- **Apagado es invisible y no latente:** sin hueco, sin contenedor y sin hoja.
- **Ya construido y correcto:** paginación como `nav` con nombre, `aria-current` y «Página N» solo para lectores; enlace de salto al contenido; anillo de foco global de 2 px en siena separado 2 px; `prefers-reduced-motion` que elimina las transiciones; ni gestos ocultos ni animación de entrada; `<dialog>` nativo; `figure`/`blockquote`/`figcaption` en la Cita; y en `Sostener`, el aviso de pestaña nueva dentro del nombre accesible, que es el patrón que hay que extender al resto.

## Ficheros de revisión

- `review-rubric.md`
- `review-accesibilidad.md`
