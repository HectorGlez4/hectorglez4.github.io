# Revisión de las espinas — brainlySabiduria (accesibilidad, v8)

*Lente ad hoc de accesibilidad de la puerta de bmad-ux, pasada v8 («la Cita como centro»), contra WCAG 2.2 AA. Se juzgan los patrones v8 tal como los fijan `DESIGN.md` y `EXPERIENCE.md` (destilado del 18/10, `git diff` de la carpeta) y las variantes elegidas de las seis maquetas `mockups/v8-*.html`. Las decisiones de Héctor del 18/10 en `.memlog.md` se dan por buenas: aquí solo se dice lo que cuestan en accesibilidad y cómo cumplirlas sin cambiarlas. Método: contrastes con la fórmula de luminancia relativa de WCAG sobre los hex del frontmatter de `DESIGN.md` y de `public/islas/imagen.js`. Medidas con el Chromium del Playwright del repositorio sobre las maquetas, con el lienzo forzado a 320 px, el espaciado de 1.4.12 inyectado y el texto al 200 % (el `font-size` calculado de cada elemento, duplicado). Nombres accesibles calculados con `ariaSnapshot` de Chromium. No se probó con lectores de pantalla reales: lo que depende de VoiceOver o NVDA va marcado «sin verificar».*

## Veredicto

Los patrones v8 cumplen WCAG 2.2 AA en lo esencial, y ningún hallazgo bloquea una historia. Todos los colores nuevos pasan, el orden de tabulación coincide con el de lectura en todas las superficies y el foco está bien resuelto en «Mostrar 30 más», «Quitar los filtros» y el selector de Obra. Ningún control se deshabilita. Quedan seis problemas medios que conviene cerrar en la espina antes de las historias:

- la zona de toque de la marca toca la de «Autores · Obras · Buscar»;
- la cabecera y la rejilla «Compartir en» desbordan a 320 px con el texto al 200 %;
- los recuentos que se anuncian al teclear, y la convención aplicada sin matiz a ese caso;
- «De la obra» y «Compartir en» como `h2` dentro de «La cita de hoy»;
- los selectores nativos, que con el teclado en Windows rehacen la búsqueda a cada flecha;
- los avisos y el foco del Diálogo de la Historia.

**Recuento:** 0 altos · 6 medios · 13 bajos.

## Hallazgos

### Medios

- **[medium]** **[espina] [maqueta]** **La zona de toque de la marca ocupa toda la fila y toca las de los tres enlaces.** `DESIGN.md:228` hace de la marca «un enlace de bloque … con alto mínimo 44», y `DESIGN.md:230` apila, por debajo de 600 px, «{spacing.unit} de aire arriba y abajo» con 105 px en total. En la maqueta elegida (`v8-cabecera-y-portada.html:177`, `.marca{display:flex}`, y `:193`, `.cab-a`) la marca es de bloque. Medido:
  - la zona de la marca mide 280 × 44 px a 320, y 320 × 44 a 360: toda la fila, aunque el texto ocupa 181 px;
  - acaba en y = 52, que es justo donde empiezan las zonas de «Autores», «Obras» y «Buscar»: **0 px** entre zonas, cuando `EXPERIENCE.md:347` pide 8 entre toda zona de toque.

  2.5.8 (AA) se cumple, porque los objetivos miden más de 24 px. Lo que falla es la regla propia del producto, y en la cabecera de todas las páginas: un toque que cae 2 px por encima de «Autores», o a la derecha del nombre, lleva a la portada. `EXPERIENCE.md:352` solo exige los 8 px *entre* los tres enlaces, que sí se cumplen (8 px medidos). — WCAG 2.5.8 (pasa); regla de producto de 44 + 8 px. *Arreglo:* en `DESIGN.md:228`, la marca a su ancho (`inline-flex`: la zona es el texto con su alto de 44 px). En `:230`, `{spacing.unit}` *entre* las dos filas además de arriba y abajo: la cabecera pasa a 113 px y la Cita de la Página de Cita empieza a unos 153 px, todavía muy dentro de 360 × 640 (NFR-8); hay que volver a medirlo. En `EXPERIENCE.md:352`, que los 8 px valen también en vertical, entre la marca y los enlaces.

- **[medium]** **[espina] [maqueta]** **La cabecera y la rejilla «Compartir en» no tienen salida cuando el texto crece, y a 320 px desbordan.** La espina fija las dos como formas cerradas: «Mide 105px a 360 y lo mismo a 320» (`DESIGN.md:230`) y «Rejilla de dos columnas … un 2 × 2 que no cambia» (`DESIGN.md:251`, `EXPERIENCE.md:440`). No dice qué pasa si no caben. Medido sobre las maquetas elegidas, a 320 px:
  - **con el espaciado de 1.4.12**, las dos caben: la fila de enlaces llega a 250 px de 280, y ninguna celda se recorta;
  - **con el texto al 200 %** (el ajuste de tamaño de texto de Chrome en Android, o el zoom de solo texto), «Buscar» sobresale **24 px** del lienzo, porque `.nav ul` no lleva `flex-wrap` (`v8-cabecera-y-portada.html:182`). La rejilla «Compartir en» sobresale **62 px**: «WhatsApp» a 30 px no cabe en una columna de 136, y `1fr` no baja de su contenido mínimo. En el sitio eso es desplazamiento horizontal de toda la página, justo lo que `EXPERIENCE.md:371` y NFR-8 prohíben.

  1.4.10 se juzga con el texto por omisión y pasa. Pero 1.4.4 pide 200 % sin pérdida, y los dos bloques son la navegación de todas las páginas y la acción principal de UJ-2. Lo mismo vale para la Fila de Obra y para las Obras de la portada, con el recuento a la derecha. La regla «parte palabras antes que desbordar» solo se fija para la Cabecera de Obra y la Tarjeta de Obra (`EXPERIENCE.md:172`, `DESIGN.md:244`). La maqueta de Directorios ya lo resuelve (`v8-directorios.html:218`, `min-width:0; overflow-wrap:break-word`), pero la espina no lo pide. — WCAG 1.4.4 (AA), 1.4.10 (AA) y 1.4.12 (AA). *Arreglo:*
  - en `DESIGN.md:230`, «si los tres enlaces no caben en su fila, se parten en otra, nunca desbordan»;
  - en `DESIGN.md:251`, «la rejilla pasa a una columna cuando una celda no cabe», p. ej. `repeat(auto-fit, minmax(min(100%, 9rem), 1fr))`, y ningún botón lleva `white-space: nowrap`;
  - en `EXPERIENCE.md:371`, que todo título de Obra en una fila con algo al lado parte palabras como el de la Cabecera de Obra;
  - y a las pruebas de 320 px de `accesibilidad.spec.ts`, una pasada con el espaciado de 1.4.12 y otra con el texto al 200 %.

- **[medium]** **[espina] [construido]** **Los recuentos que se anuncian al teclear no tienen pausa, y la convención los vuelve a anunciar aunque no cambien.** El filtro de los Directorios anuncia «13 autores.» mientras se teclea (`EXPERIENCE.md:214`, `:330`), y `/buscar/` hace lo mismo con su recuento. Para repetir un mensaje, la espina vacía la región y la vuelve a escribir en el fotograma siguiente (`EXPERIENCE.md:367`). La convención de AGENTS.md lo pide *siempre*, para todo anuncio (`AGENTS.md:35`). Pensado para «Copiado.», donde el visitante repite una acción, aplicado a un filtro al teclear hace que cada pulsación vuelva a decir el recuento, también cuando no cambia: «gon», «gonz», «gonza» dicen «1 autor.» tres veces. Lo construido busca tras 150 ms sin teclear (`src/pages/buscar.astro:271`), que a la velocidad normal de escritura es casi una vez por letra. Quedan sin decidir otras tres cosas:
  - si la región del Directorio está en el HTML inicial: «Lo inserta la isla» (`DESIGN.md:320`) no distingue el campo de la región; la maqueta sí la pone en el marcado, vacía (`v8-directorios.html:279`);
  - qué dice con el campo vacío al cargar;
  - qué dice al vaciarlo.

  Con lector de pantalla, el visitante que teclea oye una ristra de recuentos que tapa el eco de sus propias letras. — WCAG 4.1.3 (AA: se cumple; el problema es el ruido), 2.2.4 por analogía. *Arreglo:* en `EXPERIENCE.md:367`, separar dos casos:
  - **lo que el visitante repite** —Copiar, «Compartir en la historia» otra vez— se anuncia vaciando y reescribiendo, como dice la convención;
  - **lo que cambia al teclear** se anuncia tras una pausa de tecleo, de unos 700 ms y aparte del pintado de la lista, y **solo si la frase cambió**.

  En `DESIGN.md:320`: «la región está en el HTML inicial, vacía; la isla inserta solo el campo». Y decidir qué dice al vaciar el campo: o nada, o «135 autores.». Pedir el matiz en AGENTS.md con `bmad-project-context` (ver § Convención).

- **[medium]** **[espina] [maqueta]** **En la portada, «De la obra» y «Compartir en» salen como `h2` hermanos de «La cita de hoy», aunque la espina dice que son un solo bloque.** `EXPERIENCE.md:365` declara `h2` «De la obra» y «Compartir en», y en la portada `h2` también «La cita de hoy», «Obras», etc. `EXPERIENCE.md:228` dice que «Cita, Tarjeta de Obra y acciones son un solo bloque». La maqueta elegida los pone así (`v8-cabecera-y-portada.html:733`, `:744`, `:755`). Quien recorre por encabezados oye «La cita de hoy, De la obra, Compartir en, Obras, Temas…» al mismo nivel: la estructura dice que la Tarjeta y el compartir son secciones de la portada, no partes de la Cita del Día. Se confunden además «De la obra» y «Obras», que son cosas distintas y suenan al mismo nivel. En la Página de Cita sí son `h2`, porque cuelgan del `h1`, que es el texto de la Cita (`src/components/BloqueDeCita.astro:39`). — WCAG 1.3.1 (A) y 2.4.6 (AA). *Arreglo:* en `EXPERIENCE.md:365`, «en la portada, “De la obra” y “Compartir en” son `h3` dentro de “La cita de hoy”». Que la Tarjeta de Obra y el bloque «Compartir en» reciban el nivel por propiedad, como ya hace `BloqueDeCita` con `comoTitulo`.

- **[medium]** **[espina]** **Con el teclado en Windows, los selectores nativos rehacen la búsqueda a cada flecha.** En Chrome y Edge para Windows (y en Firefox), las flechas sobre un `<select>` cerrado cambian el valor y disparan `change` a cada pulsación. La espina hace que cada cambio rehaga la búsqueda y la región anuncie el recuento (`EXPERIENCE.md:325`). Además, el estado vive en la dirección y «atrás devuelve la anterior» (`:200`), lo que supone una entrada de historial por búsqueda. Quien recorre con flechas los 135 Autores hasta José Martí desencadena unas setenta búsquedas, setenta anuncios, setenta peticiones de recuentos de Obra y setenta entradas de historial: «atrás» le devuelve un Autor cada vez. No es un cambio de contexto: el foco no se mueve, que es lo que la espina defiende con 3.2.2, y eso está bien. Pero la página cambia bajo el teclado a cada paso. — WCAG 3.2.2 (A: se cumple), 4.1.3 por el ruido; la Understanding de 3.2.2 cita este mismo caso. *Arreglo:* en `EXPERIENCE.md:200`, «un cambio de selector se aplica tras una pausa corta —unos 400 ms sin otro cambio—, y solo esa búsqueda se anuncia y entra en el historial; mientras el mismo selector sigue cambiando, la dirección se reemplaza y no se apila». Con ratón o con el selector de iOS y Android, que solo disparan `change` al elegir, el retraso no se nota.

- **[medium]** **[espina] [maqueta]** **El Diálogo de la Historia dice lo importante tarde, una sola vez o tres veces.** La espina:
  - fija una instrucción visible arriba, «Se copia el enlace para el sticker Enlace.» (`EXPERIENCE.md:134`, `DESIGN.md:257`);
  - anuncia cada estado por la región de dentro del diálogo (`EXPERIENCE.md:134`, `:302`-`:305`);
  - y, si falla el portapapeles, lleva el foco al campo del enlace, seleccionado (`EXPERIENCE.md:305`, `:368`).

  Tres cosas fallan:
  - **La instrucción no se oye al abrir.** No está asociada al diálogo: al abrirlo con lector de pantalla se oye «Compartir en Historia de Instagram, diálogo» y «Cerrar, botón», y la frase solo llega si se recorre el diálogo. Es la que avisa *antes* del segundo toque de que hay que pegar el enlace. La maqueta la deja como `<p>` suelto (`v8-historia-de-instagram.html:391`).
  - **Con el portapapeles fallido, la misma frase suena tres veces.** Es la etiqueta del campo que recibe el foco, el texto visible y el mensaje de la región (`v8-historia-de-instagram.html:832` y `:835`). Y cae mientras la hoja del sistema está delante, donde el anuncio de la página puede perderse o tapar la hoja *(sin verificar)*.
  - **La duración de la frase visible está sin decidir** (`EXPERIENCE.md:269`). Si caduca, quien vuelve de Instagram ya no la encuentra.

  — WCAG 4.1.3 (AA), 1.3.1 (A) y 3.3.2 (A). *Arreglo:*
  - en `EXPERIENCE.md:134`, que el `<dialog>` lleve `aria-describedby` hacia la instrucción;
  - en `:305`, elegir una sola vía para el portapapeles fallido: el foco al campo, con la frase como etiqueta, **sin** escribir en la región;
  - en `:302`-`:305`, que la frase de estado visible no caduque: queda hasta la siguiente acción o hasta cerrar.

### Bajos

- **[low]** **[espina]** **Los saltos dentro de la página no llevan el foco a su destino.** El salto «Dónde leer esta obra ↓» (`EXPERIENCE.md:172`, `DESIGN.md:290`) y las letras de salto (`EXPERIENCE.md:215`, `DESIGN.md:321`) son anclas a un `h2`. La espina no pide que el destino reciba el foco. Los navegadores actuales mueven el punto de partida de la tabulación, pero VoiceOver en iOS no siempre mueve su cursor a un destino que no es enfocable *(sin verificar)*. En `/obras/`, de unos 45.000 px, las letras son la única forma de llegar sin guion a la mitad baja. «Volver a las letras» sigue sin decidir (`EXPERIENCE.md:270`). — WCAG 2.4.3 (A) y 2.1.1 (A). *Arreglo:* «el destino de un ancla —el `h2` del grupo, el de “Dónde leer esta obra”— lleva `tabindex="-1"` y `scroll-margin-top`, y recibe el foco». Decidir «Volver a las letras»: un enlace al pie de cada grupo, o confiar en el salto al contenido.

- **[low]** **[espina] [maqueta]** **«Más opciones…» tiene dos papeles y la espina no da el estado de ninguno.** Con hoja del sistema es un botón que la abre; sin ella, despliega Telegram, X y Correo (`EXPERIENCE.md:133`, `:307`; `DESIGN.md:253`). Como divulgación necesita `aria-expanded`, y la maqueta se lo pone (`v8-pagina-de-cita.html:699`), pero la espina no lo dice. La maqueta propone además un `<details>` que la isla convierte en la hoja (`:715`). Si queda un `summary` que anuncia «contraído» y abre la hoja, el estado miente. Sin guion, la espina dice que los tres destinos «se ven»: entonces no debe quedar un botón que no hace nada. Y la variante del navegador de Facebook dibuja los destinos sin el aviso de pestaña nueva (`v8-pagina-de-cita.html:696`-`:704`). — WCAG 4.1.2 (A). *Arreglo:* en `EXPERIENCE.md:133`:
  - con hoja, un `button` sin `aria-expanded`;
  - sin hoja, una divulgación con `aria-expanded` y `aria-controls`, con los tres destinos detrás de ella en el orden del documento, que ya es así;
  - sin guion, ni botón ni summary: los tres enlaces a la vista.

  Corregir la variante de Facebook de la maqueta.

- **[low]** **[espina] [construido]** **Correo se anuncia como «se abre en una pestaña nueva» y casi nunca la abre.** La espina cuenta Correo entre los destinos que «abren pestaña nueva y lo avisan» (`EXPERIENCE.md:133`, `:356`). Lo construido le pone `target="_blank"` y `AVISO_DE_PESTAÑA_NUEVA` a todos los destinos (`src/islands/CompartirEnlace.astro:66`-`:69`), también al `mailto:` (`src/lib/compartir.ts:63`). Un `mailto:` abre la aplicación de correo. Con `target="_blank"`, algunos navegadores de escritorio dejan además una pestaña en blanco. El aviso describe algo que no pasa. — WCAG 2.4.4 (A) en la calidad del propósito, y 3.2.5 (AAA). *Arreglo:* «Correo abre en la misma pestaña y sin el aviso; los demás destinos de enlace, en pestaña nueva y con él».

- **[low]** **[espina]** **Las filas de bloque de dos líneas se leen sin pausa entre el título y los hechos.** Nombres calculados en Chromium sobre las maquetas:
  - «Oráculo manual y arte de prudencia Baltasar Gracián , 1647 , 141 citas» (Obras de la portada);
  - «Juan María Gutiérrez 1809–1878 , 10 citas» (Fila de Autor);
  - «Cita «A lo que se ha de estar…» José Martí» (resultado de Cita v8).

  Chromium mete un espacio entre las dos líneas; otros navegadores pueden no meter ninguno. La espina fija la coma de los puntos medios, pero no la pausa entre la primera línea y la segunda. Fija el nombre «Obra: {título}, de {Autor}» del resultado de Obra (`EXPERIENCE.md:205`) y no el del resultado de Cita, que la v8 hace paralelo. — WCAG 2.4.4 (A) y 1.3.1 (A), en la calidad. *Arreglo:* en `EXPERIENCE.md:205`, `:217` y `:229`, un separador solo para lectores entre las dos líneas, «, » como el de los puntos medios. Para el resultado de Cita, «Cita: «{texto}», de {Autor}».

- **[low]** **[espina]** **Las letras de salto no tienen nombre fijado.** `EXPERIENCE.md:215` y `:365` dejan sin fijar el nombre de la navegación y el de cada letra [ASSUMPTION]. Una letra sola, «Y» u «O», suena como conjunción, y en la lista de enlaces no dice adónde lleva. La maqueta ya resuelve el de la letra (`v8-directorios.html:279`, «Autores por la A» con el prefijo oculto). — WCAG 2.4.4 (A) y 2.5.3 (A). *Arreglo:* fijar la navegación como «Letras», como en la maqueta, y cada letra como «Autores por la {letra}» en `/autores/` y «Obras de autores por la {letra}» en `/obras/`, con la letra visible dentro del nombre.

- **[low]** **[espina] [maqueta]** **Los selectores de `/buscar/`: cuerpo, valores y grupo.**
  - El valor va en `{typography.body-md}`, 15 px (`DESIGN.md:304`). Safari en iOS amplía la página al enfocar un control de menos de 16 px, y al cerrar el selector la deja ampliada, con desplazamiento horizontal.
  - «Sin cortar ningún valor» no es cierto: un `<select>` cerrado recorta un título largo de Obra a 280 px. La maqueta lo hace con `white-space:nowrap; text-overflow:clip` (`v8-buscar.html:166`).
  - Los recuentos de las opciones de Obra van sin unidad: «Maestros ambulantes (23)» (`v8-buscar.html:306`).
  - El grupo con su leyenda, «Filtrar las citas», está en la maqueta y no en la espina.
  - La maqueta dibuja la flecha de despliegue con `appearance:none` (`v8-buscar.html:166`-`:168`), y la espina dice que es la del control.

  — WCAG 1.3.1 (A) y 1.4.10 (AA) indirecto. *Arreglo:*
  - el valor a `{typography.body-lg}`, 17 px, como el campo;
  - «el valor elegido puede recortarse en el control cerrado; la lista lo muestra entero» en lugar de «sin cortar»;
  - «(23 citas)» con la unidad;
  - `fieldset` con `legend` «Filtrar las citas» en `EXPERIENCE.md:200`;
  - y la maqueta con la apariencia nativa.

- **[low]** **[espina]** **El campo de copia manual sigue con su borde a 1,30:1, y la v8 lo lleva al Diálogo de la Historia.** `DESIGN.md:248` le da un filete `{colors.outline-variant}` sobre `{colors.surface-container-low}`: 1,30:1. `DESIGN.md:260` lo reutiliza en el diálogo para el enlace. Ya estaba en los pendientes de la v7.1. — WCAG 1.4.11 (AA). *Arreglo:* el filete en `{colors.outline}`, 3,51:1 sobre `{colors.surface-container-low}`, como el campo de búsqueda y los selectores.

- **[low]** **[espina] [construido]** **La previsualización no tiene alternativa textual que diga lo que se va a publicar.**
  - La cuadrada es hoy un `<canvas aria-label="Previsualización de la imagen">` sin `role` (`src/islands/ImagenDeCita.astro:140`). Un `aria-label` en un elemento sin rol puede ignorarse.
  - La espina no fija la del 9:16 (`DESIGN.md:258`, `EXPERIENCE.md:134`).
  - A 1:6, el tramo menor de la Cita se ve a 7 px y el dominio a 6. Que no se lea no es un fallo, pero entonces la alternativa es la única forma de saber qué lleva la imagen.
  - Las espinas no coinciden en qué lleva: `EXPERIENCE.md:248` dice «la Cita, el Autor, la marca y el dominio» y `DESIGN.md:346`-`:350` añade la procedencia.

  — WCAG 1.1.1 (A). *Arreglo:*
  - `role="img"` y un nombre que diga lo que lleva, p. ej. «Imagen vertical para la historia: la cita, su autor, su procedencia y sabiduriadebolsillo.net»;
  - igualar las dos espinas en lo que lleva;
  - fuera de WCAG, que el Kit ofrezca junto a cada imagen un texto alternativo para pegarlo al publicar en el *feed* de Instagram, que lo admite.

- **[low]** **[espina]** **La cuenta de «la previsualización cabe en alto» es solo de 360 × 640 en vertical.** `DESIGN.md:258` mide el diálogo a 360 de ancho: la previsualización mide 180 × 320 y el diálogo, unos 510 de alto. Con el móvil en horizontal, unos 640 × 360, o con texto grande, la previsualización sola casi llena el alto, y «Compartir en la historia» queda fuera. La «Historia» se ofrece con puntero grueso, así que el móvil en horizontal es un caso real. — WCAG 1.4.10 (AA, 256 px de alto) y 1.3.4 (AA). *Arreglo:* «el diálogo se desplaza por dentro siempre que no quepa —no solo con el campo del enlace— y la previsualización no pasa del alto disponible». Comprobarlo con el móvil en horizontal.

- **[low]** **[espina]** **Los formularios «Buscar en…» y el campo de la portada no tienen botón de envío** [ASSUMPTION] (`DESIGN.md:310`, `:333`; `EXPERIENCE.md:199`, `:204`). Solo se envían con Intro, o con la tecla del teclado del móvil. Quien usa control por voz o conmutadores no tiene nada que pulsar. «Enviarlo vacío da todas las Citas» no lo descubre nadie. — WCAG 3.3.2 (A, pasa por la etiqueta) y 2.1.1 (A, pasa). Es calidad, no fallo. *Arreglo:* un botón secundario «Buscar» tras el campo, al menos en «Buscar en…», o registrar la decisión de no ponerlo como coste aceptado.

- **[low]** **[espina] [maqueta]** **La semántica de las listas en Safari, y `aria-current` en la cabecera.**
  - Safari y VoiceOver quitan el rol de lista a una `<ul>` con `list-style: none`. Le pasa a la rejilla «Compartir en», a las letras, a las filas, a los chips y a los resultados. `EXPERIENCE.md:365` promete «listas reales». El público es mayoritariamente iOS.
  - `aria-current="page"` se fija solo para la marca en la portada (`EXPERIENCE.md:118`), pero la maqueta de Directorios lo pone en «Autores» (`v8-directorios.html:279`).
  - La navegación de la cabecera se llama «Principal» en una maqueta y «Secciones» en otra.

  — WCAG 1.3.1 (A) y 2.4.8 (AAA). *Arreglo:* `role="list"` explícito en las listas sin viñeta. En la cabecera, `aria-current="page"` en «Autores», «Obras» y «Buscar» en sus páginas, y el nombre «Principal».

- **[low]** **[espina]** **La lista de lo que se subraya, que es la fuente única, no está completa.** `DESIGN.md:334`-`:336` subraya «Ver esta cita», «Las {n} obras →» y «Los {n} autores, de la A a la Z →». La lista de `EXPERIENCE.md:369`, que la v7.1 nombró fuente única del subrayado, no los menciona entre los «enlaces de texto en su propia línea». No falla nada, pero una historia que lea solo la lista los dejaría sin subrayar. — WCAG 1.4.1 (A). *Arreglo:* añadir esos tres a la lista de `EXPERIENCE.md:369`.

- **[low]** **[espina]** **«Mostrar 30 más» no tiene estado de carga ni de fallo** (`EXPERIENCE.md:203`, `:368`). La tanda siguiente puede tardar: hay que pedir los fragmentos de Pagefind. No se dice qué hace una segunda pulsación, ni qué se oye si la tanda no llega; hoy sería silencio. — WCAG 4.1.3 (AA). *Arreglo:* mientras llega, el botón ignora otra pulsación; si falla, la región lo dice («No se han podido cargar más resultados.») y el foco se queda en el botón.

- **[low]** **[espina]** **El suelo declarado es WCAG 2.1 AA, no 2.2** (`EXPERIENCE.md:362`, `:348`; PRD NFR-9, `prd.md:1359`). `EXPERIENCE.md:348` dice que «WCAG 2.1 AA … no tiene criterio de tamaño de objetivo», y es cierto, pero en 2.2 lo tiene: 2.5.8 es AA. La v8 cumple ya los criterios AA y A que añade 2.2:
  - 2.4.11: no hay cabecera fija que tape el foco;
  - 2.5.7: no hay arrastre;
  - 2.5.8: 44 px, y 24 en el título de la Obra en la Atribución;
  - 3.2.6, 3.3.7 y 3.3.8: no aplican.

  *Arreglo:* [NOTE FOR PM] subir NFR-9 a WCAG 2.2 AA en la pasada corta de `bmad-prd`; no cuesta trabajo nuevo. Con eso, actualizar `EXPERIENCE.md:348` y `:362`.

## Lo que está bien y no hay que tocar

- **Contraste, calculado.** Ningún color nuevo falla:
  - el siena sobre papel da 6,26:1 en los usos nuevos: «Mostrar 30 más», «Quitar los filtros», las letras de salto, el salto, «Buscar «x» en las citas» y «Buscar»; y 6,00 sobre `surface-container-low`;
  - la tinta apagada sobre papel, 7,26:1, y 6,96 sobre `surface-container-low`, en hechos, rótulos, recuentos, criterios y marcadores de posición;
  - el blanco sobre siena, 6,70:1;
  - el contorno de los selectores y del campo, 3,66:1 sobre papel (1.4.11);
  - el anillo de foco en siena, 6,26:1 frente al papel;
  - en las plantillas de la imagen, el color apagado da 9,52:1 en Tinta y 5,40:1 en Siena, y el dominio, que en Papel va en tinta apagada, 7,26:1.

  Los filetes de 1,36:1 separan y no identifican ningún control, así que 1.4.11 no los alcanza. La excepción es el campo de copia manual, en los hallazgos.
- **Orden de tabulación igual al de lectura** en la cabecera, la Página de Cita, `/buscar/`, los Directorios y la Página de Obra. La variante 1C se descartó con la razón correcta: obligaba a separar el orden visual del de tabulación.
- **El foco nunca se pierde.** «Mostrar 30 más» lo lleva al primer resultado nuevo antes de desaparecer en la última tanda. «Quitar los filtros» lo lleva al campo, porque el botón desaparece. El selector de Obra aparece *detrás* del de Autor sin mover el foco (3.2.2). Filtrar un Directorio deja el foco en el campo, y las letras se apartan sin que ninguna lleve a un grupo vacío.
- **Nada se deshabilita, y lo que no puede cumplirse no existe:** la Historia sin puntero grueso, la Imagen por encima de 300 caracteres, el selector de Obra sin Autor. `/buscar/` sin guion no deja ningún control que no haga nada (7C).
- **Ningún estado afirma lo que no pasó:** la Historia nunca dice «copiado» sin haber copiado, y cancelar la hoja no dice nada.
- **Etiquetas visibles encima** de todo campo y selector, con una primera opción que no filtra y se nombra («Todos los autores», «Todas sus obras», «Todos los temas», en la maqueta).
- **Los nombres de «Compartir en»** contienen el texto visible («Compartir en WhatsApp (se abre en una pestaña nueva)», calculado), así que 2.5.3 se cumple. El `h2` común da además el contexto del propósito (técnica H80 de 2.4.4).
- **Glifos y puntos medios:** «→» y «↓» van en el marcado con `aria-hidden`, no en un `::after` que algunos lectores leerían. Los puntos medios van ocultos y en las líneas de hechos suena una coma en su lugar.
- **Las letras de salto** funcionan sin guion porque son anclas. Miden 44 px y van a 8 px entre sí: cinco por fila a 320 y seis a 360, medido. Solo hay letra para las iniciales que tienen entradas.
- **Las regiones de estado:** dentro del `<dialog>` cuando se anuncia con él abierto; a la vista donde el recuento se ve; y el Directorio a cero, con una salida que es un enlace fuera de la región (`v8-directorios.html`).
- **La cabecera a 320 px**, con el texto por omisión y con el espaciado de 1.4.12, cabe en 105 px sin desplazamiento horizontal, y la Cita sigue en la primera pantalla. Es igual en toda página, y en la portada solo añade el `h1` alrededor de la marca, con `aria-current`.

## La convención de AGENTS.md sobre mensajes de estado

`AGENTS.md:35` pide cuatro cosas: una región `role="status"` en el marcado desde la carga, vacía y sin `hidden`; dentro del `<dialog>` si se anuncia con él abierto; vaciar y escribir en el fotograma siguiente; y la pestaña nueva solo para donar, compartir y comprar, con `AVISO_DE_PESTAÑA_NUEVA`.

**Lo que la v8 cumple.** La espina recoge las cuatro (`EXPERIENCE.md:367`, `:356`), y las maquetas de la Historia y de los Directorios las aplican. También las cumple lo construido que la v8 reutiliza: `CopiarCita.astro:84`, `ImagenDeCita.astro:152` y `buscar.astro:70`, todos con `requestAnimationFrame`.

**Lo que conviene matizar:**

1. **«Para anunciar» y «para repetir».** La espina dice «Para repetir un mismo mensaje, la región se vacía…», y AGENTS.md lo pide para todo anuncio. Los dos funcionan, pero conviene una sola redacción, con el matiz del hallazgo medio sobre los recuentos: vaciar y reescribir para lo que el visitante repite, y pausa y «solo si cambia» para lo que cambia al teclear.
2. **Un fotograma puede no bastar** para que VoiceOver o NVDA registren el vaciado antes del texto nuevo *(sin verificar)*. Hay que probarlo con los dos lectores. Si falla, la salida conocida es esperar unos 100–150 ms en vez de un fotograma, o alternar dos regiones.
3. **Una región que crea el guion** tiene que existir antes del primer mensaje: la del Directorio, y la del Diálogo de la Historia si la isla lo construye junto con su botón. Lo cumple si se crea vacía junto con su control. La espina debe decirlo en vez de «Lo inserta la isla» a secas.
4. **AGENTS.md enumera cuatro mensajes** («Copiado.», el recuento de `/buscar/`, la imagen lista y el fallo del generador). La v8 añade:
   - los estados de la Historia;
   - el recuento con filtros;
   - el recuento de los Directorios y su frase a cero;
   - la frase de la búsqueda sin resultados con filtros.

   La lista de AGENTS.md debe crecer con `bmad-project-context`, que es quien la escribe; esta revisión no la toca.
5. **Correo** entra en «compartir», pero no abre pestaña: ver el hallazgo bajo.
6. **«Copiado.»** cambia durante 2 s el rótulo visible del botón y conserva su nombre accesible. Así no suena dos veces, pero durante ese tiempo el texto visible no está en el nombre (2.5.3). Es anterior a la v8 y menor; la v8 lo extiende a la portada.
