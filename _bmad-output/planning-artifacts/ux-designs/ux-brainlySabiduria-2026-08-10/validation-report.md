# Informe de validación — brainlySabiduria (pasada v8)

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/EXPERIENCE.md`
- **Ejecutado:** 2026-10-18T16:46:28+02:00

## Veredicto general

**Este informe registra el estado del par antes de las correcciones.** Recoge lo que encontraron el 2026-10-18 la rúbrica, la lente de accesibilidad, la revisión de coherencia y el cotejo de entradas sobre el destilado v8 («la Cita como centro»), con las líneas de entonces. **Todos los altos y todos los medios se cerraron en la misma pasada**, con las decisiones de Héctor de la bitácora —130, «Buscar en esta obra» con dos campos ocultos; 131, «Más opciones…» como `<details>`; 132, la unidad a la vista en la Lista de Obras; 134, el filtro de los Directorios por subcadena; 135, el botón «Buscar» visible en «Buscar en…», la portada y el 404; 140, se conservan las marcas *(v8)*— y con los arreglos derivados de las entradas 133, 137 y 139. La verificación de cierre (`.working/verif-cierre.md`) no encontró ningún alto abierto, y lo que dejó a medias o abrió de nuevo también quedó cerrado. Cada alto lleva abajo «Resuelto: …» y cada medio su estado. Los bajos no se repasaron uno a uno y no llevan estado, aunque buena parte se atendió en las entradas 137 y 139. Dos cosas se cierran fuera de `bmad-ux`: el matiz de los mensajes de estado en `AGENTS.md`, que es de `bmad-project-context`, y los `[NOTE FOR PM]` para la pasada corta de `bmad-prd`.

Como contrato de la v8, el par se dejaba extraer casi entero. Cada superficie y cada componente nuevos tenían fila en las dos espinas, en los mismos grupos y en el mismo orden; las 357 referencias de token resolvían; los ocho contrastes publicados eran correctos; las once maquetas estaban enlazadas con su variante elegida, y las catorce decisiones de Héctor del 18/10 estaban escritas. Lo que impedía extraer limpio eran **dos decisiones que el PRD delegó a UX y seguían abiertas en el centro del alcance nuevo**: «Más opciones…» sin guion, en el que las dos espinas se contradecían, y el estado al que llega «Buscar en esta obra», con el filtro de Obra puesto y sin su selector. Detrás iban geometría que chocaba con las reglas propias —zonas de toque pegadas en la Cabecera de dos filas y en la cabecera de grupo de `/obras/`, y una portada cuyos encabezados partían la Cita del Día—, un par que más que doblaba su tamaño (DESIGN.md de 4.805 a 9.831 palabras, EXPERIENCE.md de 8.671 a 19.760) y reglas retiradas otra vez citadas dentro del contrato. Las `[ASSUMPTION]` pendientes de Héctor eran 43 y 69, bien marcadas, y no cuentan como hallazgo.

Las otras tres lentes no mueven los veredictos; los afinan. **La de accesibilidad no encontró ningún alto**: los colores nuevos pasan, el orden de tabulación coincide con el de lectura y el foco nunca se pierde. Sus seis medios eran contrato sin escribir: la zona de la marca, el reflujo a 320 px con el texto al 200 %, los recuentos que se anuncian al teclear, los selectores nativos que rehacen la búsqueda a cada flecha, los `h2` de la portada y los avisos del Diálogo de la Historia. **La revisión de coherencia sumó un tercer alto** que la rúbrica no vio: la unidad del recuento en la Lista de Obras, que las dos espinas decían distinta. **El cotejo de entradas confirmó los dos altos de la rúbrica** y añadió lo que solo se ve contra el PRD: las zonas de FR-56 a medias, la falta de «volver a las letras» (FR-55), la frase del filtrado sin texto que no da nada (FR-8) y la descarga en iOS, que contradice el clímax de UJ-2. Los seis altos de los cuatro informes son tres problemas, y los tres están resueltos.

## Veredictos por categoría

- Cobertura de flujos — adecuado
- Completitud de tokens — adecuado
- Cobertura de componentes — adecuado
- Cobertura de estados — adecuado
- Cobertura de referencias visuales — sólido
- Sobrecarga y sobreespecificación — flojo
- Disciplina de herencia — adecuado
- Forma — sólido

## Hallazgos por gravedad

104 hallazgos en cuatro informes: rúbrica 26, accesibilidad 20, coherencia 24 y cotejo 34. Los seis altos son tres problemas distintos, todos resueltos; los medios, todos cerrados. Crítico 0 · Alto 6 · Medio 37 · Bajo 61.

| Informe | Altos | Medios | Bajos | Total |
|---|---|---|---|---|
| Rúbrica (`review-rubric.md`) | 2 | 12 | 12 | 26 |
| Lente de accesibilidad (`review-accesibilidad.md`) | 0 | 6 | 14 | 20 |
| Revisión de coherencia (`review-coherencia.md`) | 2 | 8 | 14 | 24 |
| Cotejo de entradas (`reconcile-v8.md`) | 2 | 11 | 21 | 34 |
| **Total** | **6** | **37** | **61** | **104** |

### Críticos (0)

Ninguno.

### Altos (6)

**[Cobertura de componentes]** — «Más opciones…» sin guion: las dos espinas se contradicen y la decisión que tocaba cerrar seguía abierta (§ DESIGN.md:253, :309; EXPERIENCE.md:133; addendum «Lo que cuesta en guion»; v8-pagina-de-cita.html)

- DESIGN.md fija cómo se ve desplegado («en otra rejilla igual a `{spacing.unit}` debajo… como la dibuja 2C», `[ASSUMPTION]`) y lo aplica también «sin guion».
- EXPERIENCE.md dice «Sin guion se ven todos los destinos de enlace… cómo se pliegan y cómo se ven desplegados está sin fijar».
- El addendum v8 y la maqueta («[sin decidir] Cómo se ve «Más opciones…» abierto») delegan el mecanismo —un `<details>` que la isla convierte en la hoja— a UX y Arquitectura.

Si se construye un `<button>`, la Página de Cita y la portada llevan sin guion un control que no hace nada, contra «Ningún control que no haga nada». Si se construye un `<details>` cerrado, sin guion los tres destinos no «se ven», contra FR-18 y EXPERIENCE.md:133.

Arreglo: decidir y escribirlo en las dos espinas: un `<details>` cuyo `<summary>` es «Más opciones…»; la isla lo convierte en el disparador de la hoja donde la hay. Añadir la fila de estado «Sin guion» y alinear o quitar el `[ASSUMPTION]` de DESIGN.

**Resuelto:** decisión de Héctor (bitácora 131). «Más opciones…» es un `<details>` nativo llamado «Más opciones para compartir», cerrado al cargar. Sin guion se abre como todo `<details>` y enseña Telegram, X y Correo, que están en el HTML inicial: ningún control queda muerto. Con guion y Hoja del Sistema, la isla lo cambia por un `button` sin `aria-expanded` que abre la hoja; con guion y sin hoja sigue siendo el desplegable (bitácora 139). Está escrito igual en DESIGN.md § Components (bloque «Compartir en») y en EXPERIENCE.md § Component Patterns, con su fila de estado «“Más opciones…” sin Hoja del Sistema».

**[Cobertura de estados]** — «Buscar en esta obra» lleva a un estado que la espina prohíbe (§ EXPERIENCE.md:204, :200; DESIGN.md:310, :304; v8-buscar.html (decisión 8))

El formulario manda «el filtro en un campo oculto», en singular, y «el de Obra no existe hasta elegir un Autor». Quien llega desde la Página de Obra tiene puesto el filtro de Obra y no tiene su selector: no ve qué se está filtrando y solo puede cambiarlo con «Quitar los filtros». `v8-buscar.html` lo deja «[sin decidir]» —¿dos campos ocultos, o `/buscar/` deduce el Autor de la ficha?— y la espina no lo recoge. Es una de las cuatro entradas nuevas a la búsqueda (FR-51).

Arreglo: comprometer que una dirección con `obra=` pone también el Autor de esa Obra y que los dos selectores aparecen elegidos; cómo se deduce es de Arquitectura. Añadir la fila de estado «Llega con un filtro puesto desde «Buscar en…»».

**Resuelto:** decisión de Héctor (bitácora 130). En la Página de Obra, «Buscar en esta obra» envía dos campos ocultos, `autor` y `obra`: se llega a `/buscar/` con los dos selectores elegidos y el recuento completo («23 citas de José Martí en Maestros ambulantes.»). Una dirección que traiga solo `obra` completa el Autor desde la Obra, y cómo lo deduce lo fija Arquitectura. Escrito en DESIGN.md § Búsqueda, en EXPERIENCE.md § Component Patterns («La dirección») y en la fila de estado nueva «Llega con un filtro puesto desde «Buscar en…»».

**[Revisión de coherencia]** — La Lista de Obras: la unidad del recuento, a la vista o solo para el lector de pantalla (§ DESIGN.md:283, :325; EXPERIENCE.md:162, :219)

- DESIGN dice que en la Página de Autor va «la cifra sola a la vista, y la unidad para el lector de pantalla», y que solo el Directorio de Obras la reutiliza «con la unidad a la vista».
- EXPERIENCE dice que el mismo componente lleva «la unidad visible —«27 citas», «1 cita»—» también en la Ficha de Autor, porque es la Fila de Obra del Directorio [ASSUMPTION].
- Héctor (bitácora 123) decidió 6C solo para la Fila de Obra de `/obras/`, y `v8-pagina-de-obra.html` dibuja la Lista de Obras de Sor Juana con la cifra sola.

Con las dos espinas así, una historia sobre `ListaDeObras.astro` puede construir cualquiera de las dos cosas.

Arreglo: en EXPERIENCE.md:162, la cifra sola en la Ficha de Autor y la unidad a la vista en el Directorio, con la adopción en la Página de Autor como pendiente de Héctor; o, si Héctor prefiere la unidad en las dos, el cambio va en DESIGN.md:283.

**Resuelto:** decisión de Héctor (bitácora 132). La Lista de Obras de la Página de Autor enseña también la unidad —«27 citas», «1 cita»—, igual que la Fila de Obra del Directorio de Obras: es un solo componente. Escrito igual en DESIGN.md § Página de Autor y en EXPERIENCE.md § Component Patterns; cierra el pendiente de la v7.1 y cambia lo construido, que enseñaba la cifra sola.

**[Revisión de coherencia]** — «Buscar en esta obra» envía solo `obra`, y el selector de Obra no existe sin Autor (§ EXPERIENCE.md:204, :200, :202; DESIGN.md:310; addendum.md:313)

Desde la Página de Obra el formulario lleva un solo campo oculto (`obra=…`), como dibuja `v8-pagina-de-obra.html`, y se llega a `/buscar/?obra=…` sin `autor`: hay un filtro puesto que ningún selector visible muestra, porque el de Obra «no existe hasta elegir un Autor» y «cambiar o quitar el Autor quita la Obra elegida». El recuento («23 citas de José Martí en Maestros ambulantes.») necesita además el Autor. `v8-buscar.html` lo marca «[sin decidir]».

Arreglo: en la Obra, dos campos ocultos, `autor` y `obra`; si la dirección trae `obra` sin `autor`, el Autor se toma de la Obra y los dos selectores se ven puestos; en DESIGN.md, «el filtro en campos ocultos —dos en la Obra—».

**Resuelto:** decisión de Héctor (bitácora 130), la misma que cierra el alto de la rúbrica en Cobertura de estados: dos campos ocultos, `autor` y `obra`, y una dirección con solo `obra` completa el Autor desde la Obra. DESIGN.md § Búsqueda dice ya «los filtros en campos ocultos… En la Obra son dos».

**[Cotejo de entradas]** — «Buscar en esta obra» choca con el selector de Obra (§ EXPERIENCE § Búsqueda; DESIGN § Búsqueda; v8-buscar.html)

Las dos espinas dan el formulario por cerrado con «el filtro en un campo oculto», en singular, pero el selector de Obra «no existe hasta elegir un Autor». Desde la Página de Obra se llegaría a `/buscar/?obra=…` con un filtro activo que ningún selector enseña ni deja quitar uno a uno, y el recuento no tendría su Autor. La maqueta dejó dos salidas y ninguna espina elige.

Arreglo: elegir entre dos campos ocultos y deducir el Autor de la ficha.

**Resuelto:** decisión de Héctor (bitácora 130): dos campos ocultos, `autor` y `obra`, y una dirección con solo `obra` completa el Autor desde la Obra. Ver el alto de la rúbrica en Cobertura de estados.

**[Cotejo de entradas]** — «Más opciones…» sin guion (§ EXPERIENCE § Component Patterns; DESIGN § Components; addendum; FR-18; NFR-2)

FR-18 y NFR-2 exigen Telegram, X y Correo en el HTML inicial, «tras «Más opciones…»». El addendum propone un `<details>` y dice «lo cierran UX y Arquitectura». EXPERIENCE lo deja «sin fijar» y DESIGN los da por desplegados sin guion [ASSUMPTION]: dos contratos. Ninguna espina dice qué semántica tiene el despliegue con guion y sin hoja —`aria-expanded`, adónde va el foco, si los destinos se anuncian—. Construido como `button`, sin guion es un control que no hace nada.

Arreglo: cerrar el pliegue y su semántica en las dos espinas.

**Resuelto:** decisión de Héctor (bitácora 131): `<details>` nativo «Más opciones para compartir», que sin guion se abre y enseña los tres destinos. La semántica también quedó escrita: con guion y sin hoja sigue siendo el `<details>`, el navegador expone su estado, el foco se queda en él y los destinos lo siguen en el orden del documento; con hoja, la isla lo cambia por un `button` sin `aria-expanded` (bitácora 139).

### Medios (37)

**[Cobertura de flujos]** — UJ-3 y UJ-6 se apartan del PRD por decisión de Héctor, y los flujos no lo marcan (§ EXPERIENCE.md:403, :427-431, :44; prd.md:58-59, :67-68)

La bitácora 128 amplía la Resolución de UJ-3 con el Directorio de Obras y compartir por WhatsApp, donde el PRD la cierra en «vuelve… directamente al dominio (UJ-6)». UJ-6 cambia «salta a la «M»…, teclea «mar»» por teclear en el campo, y «escuela» por «enseñanza». Solo la resolución de UJ-3 lleva `[NOTE FOR PM]`, y en el Cierre de superficies, no en el flujo. Quien derive historias de UJ-6 tiene dos textos contradictorios y ninguna marca que diga cuál manda; el fallo de UJ-6 acaba con «el recorrido acaba en ese estado», que solo se entiende conociendo la versión del PRD.

Arreglo: un `[NOTE FOR PM]` en cada uno de los dos flujos con la diferencia exacta, y reescribir la frase final: «con «escuela», como dice hoy el PRD, el recorrido acaba en cero resultados».

**Cerrado:** `[NOTE FOR PM]` al pie del paso 8 de UJ-3 y al final de UJ-6, con los tres puntos que enmienda, y la frase del fallo reescrita (bitácora 133).

**[Completitud de tokens]** — Las composiciones híbridas se multiplican y el frontmatter ya no describe su uso (§ DESIGN.md:244, :335, :323, :336, :319, :321, :307; :181)

La v8 escribe en siete sitios una familia o un peso distintos de los que declara el token:
- el título de la Tarjeta de Obra y el de las Obras de la portada, «Inter al cuerpo de `body-lg` con peso 600»;
- la Fila de Autor y los Autores destacados, «Source Serif al cuerpo de `headline-sm`, con peso 400»;
- el Encabezado del Directorio, «Inter al cuerpo de `headline-md`, con peso 600»;
- las letras de salto, «`body-md` con peso 600»;
- el resultado de tipo Directorio, en Inter al cuerpo de `headline-sm`.

La convención «un token de tipografía da solo su cuerpo» lo cubre en CSS, pero el frontmatter sigue declarando familia y peso (`headline-sm` = Source Serif 600), y un consumidor que lea el YAML sacará la familia o el peso equivocados.

Arreglo: tokens para las dos parejas que se repiten, `title-md` (Inter 17/600) y `name-sm` (Source Serif 21/400), y una línea que declare que la familia y el peso del YAML son los del uso principal.

**Cerrado sin tokens nuevos:** § Typography declara que la familia y el peso del frontmatter son los de su uso principal y enumera los usos híbridos (bitácora 137).

**[Completitud de tokens]** — El campo de copia manual sigue con su filete a 1,3:1, y la v8 lo reutiliza en el Diálogo de la Historia (§ DESIGN.md:248, :260, :156; EXPERIENCE.md:305)

El filete es `outline-variant` sobre `surface-container-low`. La tabla de la v8 acaba de publicar que el borde de un control pide 3:1 (WCAG 1.4.11), así que el contrato se contradice a sí mismo en un componente que la v8 ha vuelto a usar cuando falla el portapapeles.

Arreglo: el filete del campo en `{colors.outline}`, que sobre `surface-container-low` da 3,51:1.

**Cerrado:** el filete pasa a `{colors.outline}`, 3,51:1; cambia lo construido (bitácora 137).

**[Cobertura de componentes]** — En la portada, la Tarjeta de Obra y «Compartir en» llevan su `h2` fijo y parten la Cita del Día en tres secciones (§ EXPERIENCE.md:365, :228; DESIGN.md:334)

EXPERIENCE.md da a «De la obra» y «Compartir en» un `h2` en toda superficie. En la portada eso los pone al nivel de «La cita de hoy», «Obras» y «Temas», y el bloque que las dos espinas declaran «un solo bloque» se oye como tres secciones al navegar por encabezados (WCAG 1.3.1).

Arreglo: dentro de «La cita de hoy», `h3` para «De la obra» y «Compartir en», y la regla escrita en Accessibility Floor: el nivel lo da el contenedor.

**Cerrado:** `h3` dentro de «La cita de hoy», con la regla «el nivel lo da el contenedor» en el Accessibility Floor (bitácora 133).

**[Cobertura de componentes]** — Los cierres de la portada se tratan distinto que sus gemelos, y la fuente única del subrayado no los nombra (§ DESIGN.md:334-336, :261, :222; EXPERIENCE.md:369)

- En la portada van subrayados «Las {n} obras →», «Los {n} autores, de la A a la Z →» y «Ver esta cita».
- En las Rutas de salida, los cierres «Las {n} citas de… →» son la última Fila de bloque, sin subrayar.
- La lista de EXPERIENCE.md:369, declarada única fuente del subrayado, no incluye ninguno de los tres de la portada.

Arreglo: un solo trato para los cierres —Fila de bloque o enlace de texto subrayado— y los tres nombrados en la fuente única.

**Cerrado:** la fuente única del subrayado (EXPERIENCE.md § Accessibility Floor) tiene ya una regla para «Los cierres «→»», con un solo criterio, y nombra los de la portada.

**[Cobertura de estados]** — El índice que no carga sigue sin tratamiento: un callejón con guion (§ EXPERIENCE.md:329, :326, :324)

Bajo el campo no aparece nada, ni resultados ni la salida de FR-8. La v8 lleva a `/buscar/` con estado desde la portada y desde las páginas 1 de Obra, Autor y Tema, y la búsqueda sin guion ya tiene una salida digna (7C). Con guion y sin índice, todo eso acaba en un callejón, que la propia espina veda («Nunca un callejón sin salida»).

Arreglo: que el fallo del índice muestre lo mismo que 7C —la frase, «vuelve atrás» y los dos Directorios— y lo anuncie por la región `role="status"`.

**Cerrado:** el índice que no carga muestra la salida 7C, con la frase escrita entera, y se anuncia por la región (bitácora 137).

**[Cobertura de estados]** — No hay estado para una búsqueda compartida que ya no resuelve (§ EXPERIENCE.md:200, :324)

La v8 hace compartible la búsqueda («se comparte copiándola»), pero no dice qué pasa con un `?autor=` de un Autor retirado o un `?obra=` de una Obra reunida, cuya URL deja de existir por FR-53. La frase a cero «No encontramos «x» entre las citas de {Autor} en {Obra}» no puede nombrar un valor que ya no tiene título.

Arreglo: un estado que ignore el valor desconocido, lo diga en una frase y deje la búsqueda sin ese filtro.

**Cerrado:** fila de estado «Un filtro de la dirección que ya no existe» en EXPERIENCE.md § State Patterns (bitácora 139).

**[Cobertura de referencias visuales]** — Decisiones que las maquetas v8 dejan «[sin decidir]» no llegaron a la espina, ni como decisión ni como divergencia (§ v8-buscar.html (decisión 1); v8-directorios.html (3A); EXPERIENCE.md:200, :214, :427)

- El orden de las opciones del selector de Autor —por nombre o por apellido—, que choca con la búsqueda por tecleo del selector nativo («con «M» no se llega a Martí»), y los 24 Temas que empiezan por «El» o «La».
- Si el filtro de los Directorios casa por principio de palabra o por subcadena (13 o 14 resultados para «mar»), aunque la espina da «13 autores.» como ejemplo y UJ-6 depende de esa regla.
- La etiqueta del campo de filtro de los Directorios y el texto de la «primera opción que no filtra» de cada selector.

La fila de `v8-buscar` en la tabla de Maquetas anota tres divergencias, y no son estas.

Arreglo: decidir —por principio de palabra, con las opciones de Autor en el orden del Directorio y la microcopia escrita— o anotarlas en la columna de divergencias.

**Cerrado:** filtro por subcadena normalizada, que da 14 Autores para «mar» y cambia los ejemplos a «14 autores.» (decisión de Héctor, bitácora 134); orden y primera opción de los selectores (137); etiquetas del filtro y «(23 citas)» en el selector de Obra (139).

**[Sobrecarga y sobreespecificación]** — Vuelven las reglas retiradas citadas literalmente (§ EXPERIENCE.md:58, :102, :118, :137, :143, :223, :298, :315, :324, :343, :364, :386; DESIGN.md:141, :250)

Héctor decidió el 2026-10-09 que se quitan las reglas retiradas citadas literalmente y las alternativas descartadas, que ya están en la bitácora (entrada 84). La v8 añade 27 anotaciones «*(v8 — antes …)*» —21 en EXPERIENCE.md y 6 en DESIGN.md— y 19 llevan la regla vieja entre comillas. La más arriesgada está en la columna «Sí» de Voice and Tone, que guarda dentro de la celda la microcopia retirada «Esta cita es demasiado larga para generar una imagen.»: un extractor que lea esa columna la tomará por válida.

Arreglo: dejar el «*(v8)*» y quitar el «antes «…»», que ya está en la bitácora y en git.

**Cerrado:** se retiraron las citas literales «antes «…»» (bitácora 133); al cierre no queda ninguna en las dos espinas.

**[Sobrecarga y sobreespecificación]** — El par dobla su tamaño en una sola pasada (§ EXPERIENCE.md:133, :129, :134)

DESIGN.md pasa de 4.805 a 9.831 palabras y EXPERIENCE.md de 8.671 a 19.760, con 179 y 67 marcas «(v8». Hay celdas de comportamiento de 479 palabras (el bloque «Compartir en»), de 333 (la Tarjeta de Obra) y de 298 (el Diálogo de la Historia). Son reglas de verdad, pero metidas en una celda de tabla no se pueden citar ni extraer por partes.

Arreglo: convertir en listas debajo de la tabla las filas de más de 250 palabras, como ya se hizo con «Dónde leer esta obra», y, con la puerta pasada, quitar las marcas de versión de las reglas que no sustituyen a otra.

**Cerrado en la pasada:** las celdas de más de 250 palabras pasaron a listas (bitácora 133), y las marcas *(v8)* se conservan, como hicieron las pasadas anteriores con las suyas, porque dicen a la siguiente pasada qué derivó de la v8 (bitácora 140). El tamaño no baja: al cierre, 12.015 y 23.723 palabras.

**[Disciplina de herencia]** — Las zonas de FR-56 están escritas a medias (§ EXPERIENCE.md:118, :127, :129, :135, :136, :143, :144, :145, :146, :162, :172, :205, :217, :228-230)

Ocho filas dicen qué zona registran: la Cabecera, la Tarjeta de Obra, «De la misma obra», «Más de {Autor}», la Tarjeta de Cita, el Resultado, la Fila de Autor y la Cita del Día. Otras que FR-56 incluye no lo dicen: la Atribución y el Autor de la Cabecera de Obra, el Chip de Tema y el de Colección, la Paginación, la Lista de Obras, y las Obras y los Autores de la portada. Un consumidor no sabe si el silencio quiere decir «sin zona».

Arreglo: quitar todas las menciones y remitir a FR-56, o poner en Component Patterns una sola tabla de componente y zona.

**Cerrado:** una sola tabla de componente y zona, EXPERIENCE.md § Zonas de salida interna, con los 16 valores del conjunto cerrado del addendum (bitácora 137).

**[Disciplina de herencia]** — La regla de 8 px entre zonas de toque choca con la geometría que decide la v8, y no declara su alcance (§ EXPERIENCE.md:347, :352; DESIGN.md:230, :324)

- **La Cabecera de dos filas** mide 105 = 8 + 44 + 44 + 8 + 1: la zona de la marca toca la de «Autores · Obras · Buscar», a 0 px, y la maqueta `.cab-a` lo confirma. EXPERIENCE.md:352 solo pide 8 px en horizontal.
- **La cabecera de grupo de `/obras/`** pide 44 px para un nombre de 27,3 px de línea, por relleno y margen negativo, con la lista «a `{spacing.unit}` del nombre»: la zona asoma 8,35 px y queda a unos 0 px de la primera Fila de Obra.
- **Las Filas de bloque apiladas** —Tarjeta de Obra, Directorios, portada— están pegadas, separadas solo por un filete.

Arreglo: declarar en Interaction Primitives que dos filas de bloque a todo el ancho y apiladas no necesitan los 8 px, y decir si la marca es una de ellas; en la cabecera de grupo, el nombre como bloque de 44 px de alto.

**Cerrado:** la marca a su ancho y 8 px entre las dos filas de la cabecera, que pasa de 105 a unos 113 px, con la Cita aún en la primera pantalla y a volver a medir (bitácoras 133 y 137); la cabecera de grupo como bloque de 44 px y las filas de bloque apiladas exentas de los 8 px, declarado en Interaction Primitives (139).

**[Lente de accesibilidad]** — La zona de toque de la marca ocupa toda la fila y toca las de los tres enlaces (§ DESIGN.md:228, :230; EXPERIENCE.md:347, :352; v8-cabecera-y-portada.html:177, :193)

La marca es un enlace de bloque con alto mínimo 44. Medido sobre la maqueta elegida: la zona mide 280 × 44 px a 320 y 320 × 44 a 360 —toda la fila, aunque el texto ocupa 181 px— y acaba en y = 52, justo donde empiezan «Autores», «Obras» y «Buscar»: **0 px** entre zonas, cuando la espina pide 8. 2.5.8 se cumple; lo que falla es la regla propia del producto, en la cabecera de todas las páginas: un toque 2 px por encima de «Autores», o a la derecha del nombre, lleva a la portada.

Arreglo: la marca a su ancho (`inline-flex`), `{spacing.unit}` también entre las dos filas (la cabecera pasa a unos 113 px; volver a medir la primera pantalla) y los 8 px también en vertical en EXPERIENCE.md:352.

**Cerrado:** marca a su ancho, 8 px entre filas y en vertical (bitácoras 133 y 137).

**[Lente de accesibilidad]** — La cabecera y la rejilla «Compartir en» no tienen salida cuando el texto crece, y a 320 px desbordan (§ DESIGN.md:230, :251, :244; EXPERIENCE.md:440, :371, :172; v8-cabecera-y-portada.html:182)

La espina fija las dos como formas cerradas («Mide 105px a 360 y lo mismo a 320»; «un 2 × 2 que no cambia»). A 320 px con el espaciado de 1.4.12 caben; con el texto al 200 %, «Buscar» sobresale **24 px** porque `.nav ul` no lleva `flex-wrap`, y la rejilla **62 px**, porque «WhatsApp» a 30 px no cabe en una columna de 136. En el sitio eso es desplazamiento horizontal de toda la página, que NFR-8 prohíbe. La regla «parte palabras antes que desbordar» solo se fija para la Cabecera de Obra y la Tarjeta de Obra. — WCAG 1.4.4, 1.4.10 y 1.4.12 (AA).

Arreglo: los tres enlaces se parten en otra fila y nunca desbordan; la rejilla pasa a una columna cuando una celda no cabe, sin `white-space: nowrap`; todo título de Obra con algo al lado parte palabras; y en `accesibilidad.spec.ts`, una pasada a 320 px con el espaciado de 1.4.12 y otra con el texto al 200 %.

**Cerrado:** reflujo a 320 px con el texto al 200 % escrito en las dos espinas —enlaces que se parten, rejilla que pasa a una columna, títulos que parten palabras— (bitácora 133).

**[Lente de accesibilidad]** — Los recuentos que se anuncian al teclear no tienen pausa, y la convención los vuelve a anunciar aunque no cambien (§ EXPERIENCE.md:214, :330, :367; DESIGN.md:320; AGENTS.md:35; src/pages/buscar.astro:271)

El filtro de los Directorios y `/buscar/` anuncian su recuento mientras se teclea, y la convención de vaciar y reescribir —pensada para «Copiado.»— hace que cada pulsación vuelva a decirlo: «gon», «gonz», «gonza» dicen «1 autor.» tres veces. Lo construido busca tras 150 ms sin teclear, casi una vez por letra. Quedan sin decidir si la región del Directorio está en el HTML inicial («Lo inserta la isla» no distingue el campo de la región), qué dice al cargar y qué dice al vaciar el campo. — WCAG 4.1.3 (se cumple; el problema es el ruido).

Arreglo: separar dos ritmos: lo que el visitante repite se anuncia vaciando y reescribiendo; lo que cambia al teclear, tras una pausa de unos 700 ms y solo si la frase cambió. «La región está en el HTML inicial, vacía; la isla inserta solo el campo.» Pedir el matiz en AGENTS.md con `bmad-project-context`.

**Cerrado en las espinas:** los dos ritmos escritos en el Accessibility Floor y aplicados en DESIGN.md, con la región del Directorio en el HTML inicial (bitácora 133). El matiz de AGENTS.md no lo puede cerrar `bmad-ux`: queda anotado para `bmad-project-context` (bitácora 138).

**[Lente de accesibilidad]** — En la portada, «De la obra» y «Compartir en» salen como `h2` hermanos de «La cita de hoy» (§ EXPERIENCE.md:365, :228; v8-cabecera-y-portada.html:733, :744, :755)

Quien recorre por encabezados oye «La cita de hoy, De la obra, Compartir en, Obras, Temas…» al mismo nivel: la estructura dice que la Tarjeta y el compartir son secciones de la portada, no partes de la Cita del Día, y se confunden «De la obra» y «Obras». En la Página de Cita sí son `h2`, porque cuelgan del `h1`, que es el texto de la Cita. — WCAG 1.3.1 (A) y 2.4.6 (AA).

Arreglo: en la portada, `h3` dentro de «La cita de hoy»; que la Tarjeta de Obra y el bloque «Compartir en» reciban el nivel por propiedad, como ya hace `BloqueDeCita` con `comoTitulo`.

**Cerrado** (bitácora 133); ver el medio de la rúbrica en Cobertura de componentes.

**[Lente de accesibilidad]** — Con el teclado en Windows, los selectores nativos rehacen la búsqueda a cada flecha (§ EXPERIENCE.md:325, :200)

En Chrome, Edge y Firefox para Windows, las flechas sobre un `<select>` cerrado disparan `change` a cada pulsación. Cada cambio rehace la búsqueda, se anuncia y apila una entrada de historial: recorrer con flechas los 135 Autores hasta José Martí son unas setenta búsquedas, setenta anuncios, setenta peticiones de recuentos y setenta entradas de «atrás». El foco no se mueve, y eso está bien (3.2.2), pero la página cambia bajo el teclado a cada paso.

Arreglo: un cambio de selector se aplica tras unos 400 ms sin otro cambio; solo esa búsqueda se anuncia y entra en el historial, y mientras el mismo selector sigue cambiando la dirección se reemplaza.

**Cerrado:** espera de unos 400 ms y dirección reemplazada, no apilada (bitácora 133).

**[Lente de accesibilidad]** — El Diálogo de la Historia dice lo importante tarde, una sola vez o tres veces (§ EXPERIENCE.md:134, :269, :302-305, :368; DESIGN.md:257; v8-historia-de-instagram.html:391, :832, :835)

- **La instrucción no se oye al abrir.** «Se copia el enlace para el sticker Enlace.» no está asociada al diálogo, y es la que avisa antes del segundo toque de que hay que pegar el enlace.
- **Con el portapapeles fallido, la misma frase suena tres veces:** etiqueta del campo que recibe el foco, texto visible y mensaje de la región, y cae mientras la hoja del sistema está delante *(sin verificar)*.
- **La duración de la frase visible está sin decidir.** Si caduca, quien vuelve de Instagram ya no la encuentra.

— WCAG 4.1.3 (AA), 1.3.1 (A) y 3.3.2 (A).

Arreglo: `aria-describedby` del `<dialog>` hacia la instrucción; una sola vía para el portapapeles fallido —el foco al campo, con la frase como etiqueta, sin escribir en la región—; y que la frase de estado visible no caduque.

**Cerrado:** `aria-describedby` hacia la instrucción, una sola vía para el portapapeles fallido y frase que no caduca (bitácora 133); si falla el generador, la línea de arriba se retira y el `aria-describedby` pasa a la frase del fallo (139).

**[Revisión de coherencia]** — El rótulo de tipo «Directorio»: DESIGN lo fija y EXPERIENCE lo delega (§ DESIGN.md:307, :309; EXPERIENCE.md:205; addendum.md:428)

La bitácora 124 eligió 7C, «los dos Directorios como resultados de tipo Directorio», pero `v8-buscar.html` marca «[sin decidir] El rótulo «Directorio»». El addendum solo difiere a Arquitectura el tipo de resultado en Pagefind, que es mecanismo; el texto visible es de UX.

Arreglo: en EXPERIENCE.md:205, «se rotula «Directorio» (variante 7C) [ASSUMPTION]; el tipo de resultado en Pagefind y qué parte de su lista se ignora los fija Arquitectura», y `[ASSUMPTION]` en DESIGN.md:307.

**Cerrado:** «Directorio» en las dos espinas; a Arquitectura quedan el tipo de Pagefind y qué parte de la lista se ignora.

**[Revisión de coherencia]** — La regla del siena, a la letra, pone «Siguiente cita de esta obra» en siena (§ DESIGN.md:139, :140; bitácora 117)

«Cuenta como actuar lo que mueve al visitante dentro de la misma página o del mismo listado, igual que la paginación.» «Siguiente cita de esta obra →» recorre el listado de la Obra, así que la regla lo manda a siena —la variante 1C que Héctor descartó—, y la línea siguiente lo pone en tinta.

Arreglo: actuar es moverse dentro de la misma página —letras de salto, «Dónde leer esta obra ↓»— o entre las páginas de un mismo listado; ir a otra Página de Cita, aunque sea la siguiente de su Obra, es navegación que informa y va en tinta.

**Cerrado:** regla del siena reescrita así (bitácora 133); la bitácora 136 añade que no rige en el Kit ni en el Lote.

**[Revisión de coherencia]** — «Siguiente cita de {Tema} →» no compone con los nombres de Tema (§ DESIGN.md:246; EXPERIENCE.md:129, :294, :404, :268)

Los 24 Temas empiezan por «El» o «La»: la plantilla da «Siguiente cita de El amor →» —sin contracción, en 7 Temas— o «Siguiente cita de La vida →» —con mayúscula a media frase, en 17—. La maqueta dibuja «Siguiente cita sobre la vida →», y el recuento de `/buscar/` ya fija la otra forma, «sobre la prudencia».

Arreglo: «Siguiente cita sobre {tema} →», con el Tema en minúscula, en las cuatro ubicaciones, y quitar la divergencia de la tabla de Maquetas.

**Cerrado:** «Siguiente cita sobre {tema} →» con el Tema en minúscula (bitácora 133).

**[Revisión de coherencia]** — UJ-6 y el paso 8 de UJ-3 se separan del PRD sin `[NOTE FOR PM]` en el propio flujo (§ EXPERIENCE.md:395, :403, :427-431; prd.md:59, :68)

La cabecera de UJ-3 dice «ampliado en la v8, con el texto nuevo del PRD», pero el paso 8 no está en el PRD. UJ-6 enmienda el PRD en tres puntos —«mar» en el campo, «enseñanza» y el cero del Directorio dicho con una frase y una salida, no con el recuento—. La bitácora 128 dice que las dos van al PRD, y solo EXPERIENCE.md:44 lleva la marca.

Arreglo: marcar la cabecera de UJ-3, un `[NOTE FOR PM]` al final de UJ-6 con los tres puntos, y «el recorrido que escribe hoy el PRD acaba en ese estado».

**Cerrado** (bitácora 133); ver el medio de la rúbrica en Cobertura de flujos.

**[Revisión de coherencia]** — «Más opciones…» sin guion: tres versiones distintas (§ EXPERIENCE.md:133, :307; DESIGN.md:253; addendum.md:276; v8-pagina-de-obra.html)

EXPERIENCE dice a la vez que sin guion «se ven todos los destinos» y que cómo se pliegan «está sin fijar»; DESIGN fija el aspecto desplegado «sin guion» [ASSUMPTION]; la maqueta de la Obra dibuja cerrado el `<details>` del addendum. FR-18 solo pide que estén en el HTML inicial.

Arreglo: WhatsApp, Facebook y Threads a la vista, y Telegram, X y Correo tras «Más opciones…», que sin guion los despliega al pulsarlo; el mecanismo lo cierra Arquitectura.

**Cerrado** con la decisión de Héctor de la bitácora 131; ver el alto de la rúbrica en Cobertura de componentes.

**[Revisión de coherencia]** — Las Rutas de salida no dicen que van fuera del cuerpo de Pagefind (§ EXPERIENCE.md:129, :135-137; prd.md:363 (FR-12))

FR-12: «La búsqueda interna no devuelve una Página de Cita por el texto de las Citas que enlaza». La espina lo dice de la Tarjeta de Obra, que no lleva texto de Cita, y no de «De la misma obra» ni de «Más de {Autor}», que llevan hasta siete fragmentos de otras Citas.

Arreglo: «Todo se compone en el build, es determinista y va fuera del cuerpo de Pagefind (FR-12).»

**Cerrado:** las Rutas de salida van fuera del cuerpo de Pagefind, escrito en su fila de Component Patterns.

**[Revisión de coherencia]** — Obra traducida: dos hechos que ya no son ciertos (§ EXPERIENCE.md:276, :284)

«Hoy ninguna Cita publicada trae traductor»: el 2026-10-18, 307 Citas publicadas llevan `procedencia.traduccion` (la verificación de cierre contó 306). El `[NOTE FOR PM]` sobre la Atribución de Horacio («Odas, 1909.») pide arreglar algo que la Historia 19.1 ya resolvió, y haría perder una pasada del PRD.

Arreglo: poner al día las dos frases con la Historia 19.1 y sustituir el `[NOTE FOR PM]` por la constancia de lo resuelto, comprobando la Atribución contra lo construido.

**Cerrado:** § Obra traducida puesta al día con la Historia 19.1.

**[Revisión de coherencia]** — La Cita del Día de la portada no dice si lleva la Línea de la Fuente (§ DESIGN.md:334; EXPERIENCE.md:228; prd.md:281, :348)

FR-9 da a la Cita del Día la misma Tarjeta de Obra que su Página de Cita, y FR-12 la pone después de la atribución y de la Línea de la Fuente. Ninguna espina dice si la Cita del Día la lleva, ni dónde va respecto a «Ver esta cita».

Arreglo: «y, si consta, su Línea de la Fuente, pegada a la Procedencia como en la Página de Cita [ASSUMPTION]», en las dos espinas.

**Cerrado:** la lleva si consta, pegada a la Procedencia (bitácora 137).

**[Cotejo de entradas]** — La Lista de Obras se contradice entre las dos espinas (§ DESIGN § Página de Autor; EXPERIENCE § Página de Autor)

DESIGN pone la cifra sola a la vista, como está construido; EXPERIENCE, la unidad visible [ASSUMPTION]. Uno de los dos cambia lo construido en la Página de Autor sin decirlo. La revisión de coherencia lo da como alto.

Arreglo: una sola frase en las dos espinas.

**Cerrado** con la decisión de Héctor de la bitácora 132: la unidad a la vista también en la Página de Autor.

**[Cotejo de entradas]** — «Siguiente cita de {Tema} →» sale agramatical (§ EXPERIENCE § Página de Cita; DESIGN § Página de Cita; v8-buscar.html)

Da «Siguiente cita de El amor →», y choca con la convención de la propia espina para el Tema dentro de una frase, en minúscula y tras «sobre». Menor: «Buscar en este Tema» va con mayúscula, y la microcopia escribe las entidades en minúscula.

Arreglo: resolver la plantilla, no anotarla como divergencia de la maqueta.

**Cerrado:** «Siguiente cita sobre {tema} →» (bitácora 133) y la minúscula de las entidades en microcopia, «Buscar en este tema», con `[NOTE FOR PM]` por la grafía del PRD (139).

**[Cotejo de entradas]** — Los cambios a sabiendas de UJ-6 y UJ-3 no llevan marca para el PM en su recorrido (§ EXPERIENCE § Key Flows; § Cierre de superficies)

El único `[NOTE FOR PM]` de recorridos está en el Cierre de superficies, y solo por el Directorio de Obras de UJ-3. El Key Flow de UJ-6 difiere del PRD en dos pasos y en su caso límite —el PRD dice que el filtro «lo dice con su recuento a cero»; la espina, con una frase sin recuento—, y la cabecera de UJ-3 se presenta como «texto nuevo del PRD». La pasada corta de `bmad-prd` no tiene desde los recorridos un puntero a lo que debe alinear.

Arreglo: un `[NOTE FOR PM]` en cada recorrido.

**Cerrado** (bitácora 133); ver el medio de la rúbrica en Cobertura de flujos.

**[Cotejo de entradas]** — Falta la frase del filtrado sin texto que no da nada (§ EXPERIENCE § State Patterns; FR-8)

FR-8 pide que, con filtros y sin resultados, la página nombre los filtros «a quien quizá no escribió ninguna». La única plantilla lleva texto («No encontramos «escuela» entre las citas de José Martí en Maestros ambulantes.»), y Autor + Tema o Autor + Obra + Tema pueden dar cero.

Arreglo: la forma sin texto.

**Cerrado:** «No hay citas de {Autor} sobre {tema}.» (bitácora 139).

**[Cotejo de entradas]** — FR-7: el orden de las opciones de los selectores, sin fijar (§ v8-buscar.html (decisión 1))

La búsqueda por tecleo del selector nativo casa por el principio del rótulo: con el orden por apellido, «M» no lleva a Martí, y teclear «s» no lleva a «El saber».

Arreglo: fijar el orden.

**Cerrado:** orden y primera opción de los selectores escritos (bitácora 137).

**[Cotejo de entradas]** — FR-9: en la portada, «De la obra» y «Compartir en» son `h2`, como «La cita de hoy» (§ EXPERIENCE § Accessibility Floor; § Portada)

El bloque que la espina llama «uno solo» queda partido en el esquema de encabezados.

Arreglo: `h3` dentro de «La cita de hoy».

**Cerrado** (bitácora 133).

**[Cotejo de entradas]** — FR-55: falta «volver a las letras» (§ EXPERIENCE § Directorios; v8-directorios.html)

La maqueta mide unos 6.000 px de vuelta desde la M de `/autores/` y unos 41.000 desde la U de `/obras/`, y lo deja «[sin decidir]». Sin ello, la defensa de que los Directorios no son un listado denso porque se recorren por letras solo vale bajando.

Arreglo: decidirlo.

**Cerrado:** «Volver a las letras» al pie de cada grupo (bitácora 137).

**[Cotejo de entradas]** — FR-56: las espinas asignan zona solo a parte de los enlaces (§ EXPERIENCE § Component Patterns; addendum (conjunto cerrado de `salida-interna`))

Callan siete valores del conjunto cerrado del addendum —`atribucion`, `chip-de-tema`, `obras-de-portada`, `autores-de-portada`, `colecciones`, `lista-de-obras` y `paginacion`— y la zona de «Las {n} obras →», «Los {m} autores… →», «Ver esta cita» y «Buscar «x» en las citas». A medias, parece que las demás no registran.

Arreglo: nombrarlas todas o remitir al conjunto de AD-13.

**Cerrado:** tabla única de zonas con los 16 valores (bitácora 137).

**[Cotejo de entradas]** — La descarga en iOS contradice el clímax de UJ-2 (§ EXPERIENCE § State Patterns (rechazo de la Historia); PRD §4.9; diseño §13)

Con `NotAllowedError`, la caída dice solo «La imagen se ha descargado.»: en iOS va a Archivos y no a Fotos, desde donde la historia no la recoge, que es justo lo que UJ-2 promete evitar. El addendum lo acepta como deuda, pero la espina no lo dice ni ofrece el paso siguiente.

Arreglo: al menos, constancia de deuda aceptada en la fila del estado.

**Cerrado:** consta como deuda aceptada en la fila «El navegador rechaza la entrega de la Historia».

**[Cotejo de entradas]** — FR-12: «De la misma obra» y «Más de {Autor}» no se declaran fuera de Pagefind (media-baja en el cotejo) (§ EXPERIENCE § Página de Cita; diseño §5)

Son ahora hasta siete Tarjetas de Cita con su fragmento entero, y solo la Tarjeta de Obra se declara fuera de `data-pagefind-body`.

Arreglo: decirlo de las Rutas de salida.

**Cerrado**; coincide con el medio 8 de coherencia.

**[Cotejo de entradas]** — Retener sin recordar no consta en la Foundation (media-baja en el cotejo) (§ EXPERIENCE § Foundation; PRD §2.2)

La v8 retiene «con lo que el sitio compone para todos… y nunca con lo que guarda cada visitante». La Foundation dice que la Página de Cita «lo que gana es retener», pero no recoge ese límite, que cierra la puerta a «seguir donde lo dejaste».

Arreglo: recoger el límite.

**Cerrado:** recogido en la Foundation de EXPERIENCE.md.

### Bajos (61)

**[Cobertura de flujos]** — «Siguiente cita de {Tema}» vuelve al mismo Autor si el Tema tiene uno solo (§ EXPERIENCE.md:294)

Si un Tema publicado tiene un solo Autor, «Siguiente» da la vuelta y vuelve al mismo Autor, contra «nunca a otra del mismo Autor». Hoy no pasa, pero ninguna puerta lo impide, igual que en la fila «Cita sin Tema publicado».

Arreglo: sin otro Autor en el Tema, no hay «Siguiente», como sin Tema.

**[Cobertura de componentes]** — El rótulo de tipo «Directorio» lo decide DESIGN y EXPERIENCE lo delega a Arquitectura (§ DESIGN.md:307; EXPERIENCE.md:205, :326)

El rótulo visible es microcopia y le toca a UX; a Arquitectura le tocan la clave de Pagefind y qué parte de la lista se ignora.

Arreglo: que EXPERIENCE.md:205 comprometa «Directorio» y deje a Arquitectura solo esas dos cosas.

**[Cobertura de componentes]** — El nombre accesible del Diálogo de la Historia hereda el prefijo oculto del botón (§ EXPERIENCE.md:134, :133)

El diálogo toma su nombre «del botón que lo abre, «Historia de Instagram»», pero el nombre accesible de ese botón es «Compartir en Historia de Instagram», porque lleva el prefijo en `.solo-para-lectores`. Con `aria-labelledby`, el diálogo hereda el prefijo.

Arreglo: escribir el nombre resultante, o tomarlo solo del texto visible.

**[Cobertura de componentes]** — El material del Kit y del Lote no tiene fila en DESIGN.md (§ EXPERIENCE.md:249)

El Kit y el Lote ofrecen ya los dos formatos, pero DESIGN.md no dice cómo se presentan el cuadrado y el 9:16. Es un pendiente de la v7.1 que la v8 amplía.

Arreglo: una fila corta, o la constancia de que se documenta como está construido.

**[Cobertura de estados]** — El selector de Obra no tiene estado mientras llegan sus recuentos (§ EXPERIENCE.md:200, :328)

Son unos 41 KB que se piden al elegir Autor, y no se dice si el selector aparece sin recuentos o espera.

Arreglo: una línea.

**[Cobertura de estados]** — Dos estados de los Directorios solo viven en la fila de la maqueta (§ EXPERIENCE.md:270, :215)

- La lista salta hacia abajo cuando la isla inserta el campo encima de las letras.
- No hay «Volver a las letras» en `/obras/`, que la propia espina mide en unos 45.000 px.

Arreglo: decidir los dos, o subirlos a una lista de pendientes visible.

**[Cobertura de estados]** — En la última tanda, «Mostrar 30 más» puede pedir menos de 30 (§ v8-buscar.html (decisión 5))

La maqueta lo deja «[sin decidir]» y la espina no lo menciona.

Arreglo: confirmar que el rótulo no cambia, como dice FR-7, o llevarlo al PM.

**[Cobertura de referencias visuales]** — «Buscar en…» con botón en una maqueta y sin él en otra; la espina elige sin botón (§ v8-buscar.html (decisión 8); v8-pagina-de-obra.html; DESIGN.md:310; EXPERIENCE.md:344)

`v8-buscar.html` lo dibuja con un botón secundario «Buscar» y `v8-pagina-de-obra.html` sin él. La espina elige sin botón (`[ASSUMPTION]`), y el formulario sin envío visible —también en la portada— choca con «Toda acción tiene un control visible».

Arreglo: que Héctor lo confirme; si se queda sin botón, declarar la excepción junto a esa regla.

**[Sobrecarga y sobreespecificación]** — Cifras del Corpus fechadas dentro del contrato (§ EXPERIENCE.md:293, :295, :296, :215; DESIGN.md:261)

«Hoy son 4 Citas», «Hoy son 7 Obras», «las 87 Obras de dos Citas», «unos 45.000px» y la página que crece «de unos 1.500px a unos 2.780» envejecen solas.

Arreglo: «medido el 2026-10-18», o moverlas a la bitácora.

**[Disciplina de herencia]** — Las entidades no se escriben igual en la microcopia nueva (§ EXPERIENCE.md:129, :294, :202, :204; DESIGN.md:246)

«Siguiente cita de {Tema} →» produce «Siguiente cita de La vida →», mientras el Recuento escribe el Tema en minúscula y con «sobre», como dibuja la maqueta. «Buscar en este Tema» va con mayúscula y «Buscar en esta obra» en minúscula.

Arreglo: una sola regla de mayúsculas para las entidades en la microcopia, y «Siguiente cita sobre {tema} →», si Héctor lo confirma.

**[Disciplina de herencia]** — «Hoja del Sistema» no se escribe como en el glosario (§ EXPERIENCE.md:446)

El glosario del PRD lo escribe con mayúsculas; en las espinas aparece siete veces en minúscula y una con mayúscula.

Arreglo: el término del glosario.

**[Disciplina de herencia]** — Los `sources` de las dos espinas no son simétricos (§ DESIGN.md:4-7; EXPERIENCE.md:4-9)

Ninguna lista `addendum.md`, que es fuente de la v8 y delega mecanismos a UX, y DESIGN.md no lista `2026-10-05-pagina-de-obra-design.md`, que EXPERIENCE.md sí.

Arreglo: añadir el addendum a las dos, y la decisión del 05/10 a DESIGN.

**[Lente de accesibilidad]** — Los saltos dentro de la página no llevan el foco a su destino (§ EXPERIENCE.md:172, :215, :270; DESIGN.md:290, :321)

El salto «Dónde leer esta obra ↓» y las letras de salto son anclas a un `h2`, y la espina no pide que el destino reciba el foco. VoiceOver en iOS no siempre mueve su cursor a un destino no enfocable *(sin verificar)*, y en `/obras/`, de unos 45.000 px, las letras son la única forma de llegar sin guion a la mitad baja. «Volver a las letras» sigue sin decidir. — WCAG 2.4.3 y 2.1.1 (A).

Arreglo: el destino de un ancla lleva `tabindex="-1"` y `scroll-margin-top`, y recibe el foco; decidir «Volver a las letras».

**[Lente de accesibilidad]** — «Más opciones…» tiene dos papeles y la espina no da el estado de ninguno (§ EXPERIENCE.md:133, :307; DESIGN.md:253; v8-pagina-de-cita.html:696-715)

Con hoja del sistema es un botón que la abre; sin ella, despliega Telegram, X y Correo, y como divulgación necesita `aria-expanded`, que la maqueta pone y la espina no dice. Un `summary` que anuncia «contraído» y abre la hoja mentiría sobre su estado. La variante del navegador de Facebook dibuja los destinos sin el aviso de pestaña nueva. — WCAG 4.1.2 (A).

Arreglo: con hoja, un `button` sin `aria-expanded`; sin hoja, una divulgación con `aria-expanded` y `aria-controls`; sin guion, los tres enlaces a la vista. Corregir la variante de Facebook de la maqueta.

**[Lente de accesibilidad]** — Correo se anuncia como «se abre en una pestaña nueva» y casi nunca la abre (§ EXPERIENCE.md:133, :356; src/islands/CompartirEnlace.astro:66-69; src/lib/compartir.ts:63)

Lo construido pone `target="_blank"` y `AVISO_DE_PESTAÑA_NUEVA` también al `mailto:`, que abre la aplicación de correo; algunos navegadores de escritorio dejan además una pestaña en blanco. El aviso describe algo que no pasa. — WCAG 2.4.4 (A).

Arreglo: Correo abre en la misma pestaña y sin el aviso; los demás destinos de enlace, en pestaña nueva y con él.

**[Lente de accesibilidad]** — Las filas de bloque de dos líneas se leen sin pausa entre el título y los hechos (§ EXPERIENCE.md:205, :217, :229)

Nombres calculados en Chromium: «Oráculo manual y arte de prudencia Baltasar Gracián , 1647 , 141 citas»; «Juan María Gutiérrez 1809–1878 , 10 citas»; «Cita «A lo que se ha de estar…» José Martí». Otros navegadores pueden no meter ni el espacio. La espina fija el nombre del resultado de Obra y no el del resultado de Cita, que la v8 hace paralelo. — WCAG 2.4.4 y 1.3.1 (A).

Arreglo: un separador solo para lectores «, » entre las dos líneas; para el resultado de Cita, «Cita: «{texto}», de {Autor}».

**[Lente de accesibilidad]** — Las letras de salto no tienen nombre fijado (§ EXPERIENCE.md:215, :365; v8-directorios.html:279)

Una letra sola, «Y» u «O», suena como conjunción, y en la lista de enlaces no dice adónde lleva. La maqueta ya lo resuelve con un prefijo oculto. — WCAG 2.4.4 y 2.5.3 (A).

Arreglo: la navegación como «Letras», y cada letra como «Autores por la {letra}» en `/autores/` y «Obras de autores por la {letra}» en `/obras/`.

**[Lente de accesibilidad]** — Los selectores de `/buscar/`: cuerpo, valores y grupo (§ DESIGN.md:304; EXPERIENCE.md:200; v8-buscar.html:166-168, :306)

- El valor va a 15 px, y Safari en iOS amplía la página al enfocar un control de menos de 16 px y la deja ampliada.
- «Sin cortar ningún valor» no es cierto: un `<select>` cerrado recorta un título largo.
- Los recuentos de las opciones de Obra van sin unidad: «Maestros ambulantes (23)».
- El grupo con su leyenda, «Filtrar las citas», está en la maqueta y no en la espina, y la maqueta dibuja la flecha con `appearance:none`.

Arreglo: el valor a `{typography.body-lg}`; «el valor elegido puede recortarse en el control cerrado; la lista lo muestra entero»; «(23 citas)»; `fieldset` con `legend`; y la maqueta con la apariencia nativa.

**[Lente de accesibilidad]** — El campo de copia manual sigue con su borde a 1,30:1, y la v8 lo lleva al Diálogo de la Historia (§ DESIGN.md:248, :260)

Ya estaba en los pendientes de la v7.1. — WCAG 1.4.11 (AA).

Arreglo: el filete en `{colors.outline}`, 3,51:1, como el campo de búsqueda y los selectores.

**[Lente de accesibilidad]** — La previsualización no tiene alternativa textual que diga lo que se va a publicar (§ src/islands/ImagenDeCita.astro:140; DESIGN.md:258, :346-350; EXPERIENCE.md:134, :248)

La cuadrada es hoy un `<canvas aria-label>` sin `role`, que puede ignorarse; la espina no fija la del 9:16; a 1:6 el texto se ve a 7 px y el dominio a 6, así que la alternativa es la única forma de saber qué lleva; y las espinas no coinciden en qué lleva (EXPERIENCE sin la procedencia, DESIGN con ella). — WCAG 1.1.1 (A).

Arreglo: `role="img"` y un nombre que diga lo que lleva; igualar las dos espinas; y, fuera de WCAG, que el Kit ofrezca un texto alternativo para pegarlo al publicar en Instagram.

**[Lente de accesibilidad]** — La cuenta de «la previsualización cabe en alto» es solo de 360 × 640 en vertical (§ DESIGN.md:258)

Con el móvil en horizontal (unos 640 × 360) o con texto grande, la previsualización casi llena el alto y «Compartir en la historia» queda fuera. La Historia se ofrece con puntero grueso, así que es un caso real. — WCAG 1.4.10 y 1.3.4 (AA).

Arreglo: el diálogo se desplaza por dentro siempre que no quepa, y la previsualización no pasa del alto disponible; comprobarlo en horizontal.

**[Lente de accesibilidad]** — Los formularios «Buscar en…» y el campo de la portada no tienen botón de envío (§ DESIGN.md:310, :333; EXPERIENCE.md:199, :204)

Solo se envían con Intro o con la tecla del teclado del móvil: quien usa control por voz o conmutadores no tiene nada que pulsar, y «enviarlo vacío da todas las Citas» no lo descubre nadie. Es calidad, no fallo (3.3.2 y 2.1.1 pasan).

Arreglo: un botón secundario «Buscar» tras el campo, al menos en «Buscar en…», o registrar la decisión como coste aceptado.

**[Lente de accesibilidad]** — La semántica de las listas en Safari, y `aria-current` en la cabecera (§ EXPERIENCE.md:365, :118; v8-directorios.html:279)

Safari y VoiceOver quitan el rol de lista a una `<ul>` con `list-style: none`, y el público es mayoritariamente iOS. `aria-current="page"` solo se fija para la marca en la portada, y la navegación de la cabecera se llama «Principal» en una maqueta y «Secciones» en otra. — WCAG 1.3.1 (A).

Arreglo: `role="list"` explícito en las listas sin viñeta; `aria-current="page"` en «Autores», «Obras» y «Buscar» en sus páginas; y el nombre «Principal».

**[Lente de accesibilidad]** — La lista de lo que se subraya, que es la fuente única, no está completa (§ EXPERIENCE.md:369; DESIGN.md:334-336)

No menciona «Ver esta cita», «Las {n} obras →» ni «Los {n} autores, de la A a la Z →», que DESIGN subraya. — WCAG 1.4.1 (A).

Arreglo: añadir los tres a la lista.

**[Lente de accesibilidad]** — «Mostrar 30 más» no tiene estado de carga ni de fallo (§ EXPERIENCE.md:203, :368)

La tanda siguiente puede tardar, y no se dice qué hace una segunda pulsación ni qué se oye si no llega; hoy sería silencio. — WCAG 4.1.3 (AA).

Arreglo: mientras llega, el botón ignora otra pulsación; si falla, la región lo dice («No se han podido cargar más resultados.») y el foco se queda en el botón.

**[Lente de accesibilidad]** — El suelo declarado es WCAG 2.1 AA, no 2.2 (§ EXPERIENCE.md:362, :348; prd.md:1359 (NFR-9))

EXPERIENCE.md dice que «WCAG 2.1 AA… no tiene criterio de tamaño de objetivo», pero 2.2 lo tiene (2.5.8, AA). La v8 ya cumple los criterios A y AA que añade 2.2: 2.4.11, 2.5.7 y 2.5.8; 3.2.6, 3.3.7 y 3.3.8 no aplican.

Arreglo: `[NOTE FOR PM]`: subir NFR-9 a WCAG 2.2 AA en la pasada corta de `bmad-prd`, y luego actualizar EXPERIENCE.md.

**[Revisión de coherencia]** — La fuente única del subrayado no lista tres enlaces que DESIGN subraya (§ EXPERIENCE.md:369; DESIGN.md:334-336)

«Ver esta cita», «Las {n} obras →» y «Los {n} autores, de la A a la Z →» no están en la lista que la bitácora 106 declara única fuente.

Arreglo: añadirlos como enlaces de texto en su propia línea.

**[Revisión de coherencia]** — El cuerpo de las letras de salto se da por decidido sin estarlo (§ DESIGN.md:321)

«En `{typography.body-md}` con peso 600» va sin `[ASSUMPTION]`, y `v8-directorios.html` marca «[sin decidir] el cuerpo de la letra».

Arreglo: añadir `[ASSUMPTION]`.

**[Revisión de coherencia]** — La tabla de Maquetas, incompleta en dos filas e inexacta en una (§ EXPERIENCE.md:271, :269)

`v8-buscar.html` no marca variante recomendada para su decisión 8, le faltan dos divergencias (el botón «Buscar» de 8A y lo que deja sin decidir) y la fila de la Historia dice «Ninguna anotada», aunque la maqueta deja sin decidir si la línea de arriba se queda cuando falla el generador.

Arreglo: completar las dos filas con esas divergencias.

**[Revisión de coherencia]** — En la portada, los encabezados parten en tres lo que es un solo bloque (§ EXPERIENCE.md:228, :365)

«De la obra» y «Compartir en» quedan como `h2` hermanos de «La cita de hoy». Coincide con el medio de la rúbrica y el de accesibilidad.

Arreglo: en la portada, `h3` dentro de «La cita de hoy» [ASSUMPTION].

**[Revisión de coherencia]** — «Temas de la Obra»: la columna Dónde no recoge el orden de la v8 (§ EXPERIENCE.md:174, :168; DESIGN.md:297)

Dice «después del listado»; desde la v8, los Temas van después de «Compartir en».

Arreglo: «Página de Obra, solo la primera página, después de «Compartir en»».

**[Revisión de coherencia]** — Las zonas de FR-56 se nombran en unas filas sí y en otras no (§ EXPERIENCE.md:118, :127, :129, :135, :136, :143-146, :162, :172, :205, :217, :228-230; addendum.md:238)

Callan su zona la Atribución, «de {Autor}», la Paginación, la Lista de Obras, el Chip de Tema, las Colecciones y las Obras y los Autores de la portada, y no se dice qué registra «Buscar «x» en las citas» del Directorio.

Arreglo: una sola frase en Interaction Primitives que remita a FR-56 y al conjunto cerrado del addendum, o la zona en cada fila.

**[Revisión de coherencia]** — El nombre accesible del Diálogo de la Historia no coincide con el de su botón (§ EXPERIENCE.md:134, :133)

Con `aria-labelledby`, el diálogo se llama «Compartir en Historia de Instagram», no «Historia de Instagram».

Arreglo: escribir el nombre resultante, o decir que toma solo el texto visible.

**[Revisión de coherencia]** — «Mostrar 30 más» cuando faltan menos de 30 (§ EXPERIENCE.md:203; prd.md:123)

La espina no dice qué rótulo lleva el botón en la última tanda, y el PRD pide que el texto no prometa más de lo que da.

Arreglo: «Si quedan menos de 30, dice «Mostrar las {n} que faltan» [ASSUMPTION]», o declarar que no cambia y por qué.

**[Revisión de coherencia]** — El recuento con filtros, en singular (§ EXPERIENCE.md:202)

El singular solo está escrito para la búsqueda sin filtros («Un resultado.»).

Arreglo: «Una cita de José Martí en Maestros ambulantes.» [ASSUMPTION].

**[Revisión de coherencia]** — El aire de las Rutas de salida no es múltiplo de la unidad en móvil (§ DESIGN.md:261, :191; src/components/RutasDeSalida.astro:88)

«A vez y media la respiración» da 60 px en móvil, que no es múltiplo de 8, contra «múltiplos de `{spacing.unit}`. Sin excepciones.».

Arreglo: 8 × `{spacing.unit}` en móvil y 12 × en escritorio, o declarar la excepción.

**[Revisión de coherencia]** — El criterio de Colección: «una línea» en el PRD, una frase de varios renglones en EXPERIENCE (§ EXPERIENCE.md:146; prd.md:289 (FR-9))

EXPERIENCE da una frase «que puede ocupar de dos a cuatro renglones».

Arreglo: «“En una línea” de FR-9 se lee como una frase, no como un renglón, y nunca se recorta» [NOTE FOR PM].

**[Revisión de coherencia]** — El orden de los ocho Autores destacados, sin decidir y sin marca (§ EXPERIENCE.md:230, :267; DESIGN.md:336)

Solo la tabla de Maquetas dice que está sin decidir; la maqueta los ordena como el Directorio.

Arreglo: decirlo en la fila de la portada.

**[Revisión de coherencia]** — Las espinas no citan el addendum entre sus fuentes (§ DESIGN.md:4-7; EXPERIENCE.md:4-9)

El addendum v8 trae las decisiones diferidas a UX que esta pasada cierra.

Arreglo: añadir `addendum.md` a las dos.

**[Revisión de coherencia]** — Un `[ASSUMPTION]` sobre algo que fija el PRD (§ EXPERIENCE.md:315; prd.md:951-954, :458)

«Su página 1 lleva el salto, compartir y «Buscar en esta obra», como la indexable (FR-51). [ASSUMPTION]»: FR-51 y FR-18 ya lo fijan.

Arreglo: quitar ese `[ASSUMPTION]`, o moverlo tras lo que de verdad supone.

**[Cotejo de entradas]** — «Nunca a otra del mismo Autor» no se puede cumplir en un Tema de un solo Autor (§ EXPERIENCE § State Patterns (FR-12))

La vuelta al primer Autor devuelve al mismo, y ninguna puerta lo impide.

Arreglo: cerrar el caso.

**[Cotejo de entradas]** — FR-7: la primera opción de cada selector y el recuento de cada Obra en su opción (§ EXPERIENCE § Búsqueda)

No se fijan el texto de la primera opción («Todos los autores», «Todas sus obras»…), la forma visible del recuento en la opción, ni si ese recuento sigue a los demás filtros o es el total.

Arreglo: fijarlos.

**[Cotejo de entradas]** — FR-7: el rótulo del resultado de tipo Directorio difiere entre espinas (§ DESIGN § Búsqueda; EXPERIENCE § Búsqueda)

DESIGN da «Directorio»; EXPERIENCE dice que lo fija Arquitectura. El rótulo visible es de UX.

Arreglo: comprometerlo en EXPERIENCE.

**[Cotejo de entradas]** — FR-7: el texto de «Mostrar 30 más» en la última tanda parcial (§ EXPERIENCE § Búsqueda; v8-buscar.html)

No se dice, y la maqueta lo deja «[sin decidir]».

Arreglo: fijarlo.

**[Cotejo de entradas]** — FR-8: el orden de los ocho Autores destacados (§ EXPERIENCE § Portada)

La maqueta usa el del Directorio y advierte que por recuento «parecería un podio», lo que toca «el sitio nunca califica».

Arreglo: fijar el orden.

**[Cotejo de entradas]** — FR-9: el criterio «en una línea» frente a «una frase» (§ EXPERIENCE § Portada; prd.md (FR-9))

Conviene que el PRD lea «una frase».

Arreglo: llevarlo al PM.

**[Cotejo de entradas]** — FR-9: si una de las seis Obras puede ser la de la Cita del Día (§ v8-cabecera-y-portada.html)

Está «[sin decidir]» en la maqueta; la regla de rotación es de Arquitectura.

Arreglo: dejarlo dicho como pendiente de Arquitectura.

**[Cotejo de entradas]** — FR-10 y FR-11: se pierde el porqué de FR-11 (§ EXPERIENCE § Imágenes)

«Cada elección entre el toque y la historia es una ocasión más de abandonar» no consta.

Arreglo: recoger la razón.

**[Cotejo de entradas]** — FR-17: «pulsar otra vez lo vuelve a intentar», concretado de otra forma (§ EXPERIENCE § Diálogo de la Historia)

La espina lo concreta como cerrar el diálogo y pulsar otra vez «Historia de Instagram»: una lectura válida, pero distinta.

Arreglo: declararlo.

**[Cotejo de entradas]** — FR-18: se cayó la distinción entre hoja para enlaces y hoja para ficheros (§ EXPERIENCE § Compartir en)

Se perdió al retirar la Acción Compartir la cita, y «Más opciones…» con hoja no dice cuál de las dos detecciones usa.

Arreglo: decir cuál.

**[Cotejo de entradas]** — FR-18: «Compartir una Obra sigue durante la congelación» no consta (§ EXPERIENCE § Página de Obra)

Consta para la Tarjeta de Obra, la Fila de Obra y las Obras de la portada, no para compartir.

Arreglo: añadirlo.

**[Cotejo de entradas]** — FR-51: el orden del libro omite «documento a documento» (§ EXPERIENCE § Página de Obra)

Para una Obra cotejada en varios documentos, que el PRD nombra y difiere a Arquitectura.

Arreglo: nombrarlo.

**[Cotejo de entradas]** — FR-55: en `/obras/`, la cabecera de grupo cuando lo tecleado casa con un título (§ EXPERIENCE § Directorios)

No se dice si la cabecera de grupo del Autor se queda.

Arreglo: decirlo.

**[Cotejo de entradas]** — FR-55: el recuento en singular (§ EXPERIENCE § Directorios)

No se dan «1 autor.» ni «1 obra.».

Arreglo: escribirlos.

**[Cotejo de entradas]** — FR-55: principio de palabra o subcadena (§ EXPERIENCE § Directorios; UJ-6)

Es mecanismo, pero el ejemplo «13 autores.» de UJ-6 depende de ello: con subcadena salen 14.

Arreglo: decidirlo.

**[Cotejo de entradas]** — §10: la página 404 no está en la tabla de superficies (§ EXPERIENCE § IA)

El PRD v8 la nombra como superficie pública no indexable, y solo vive en State Patterns.

Arreglo: añadirla.

**[Cotejo de entradas]** — UJ-1: el clímax no es el del PRD (preexistente) (§ EXPERIENCE § Key Flows (UJ-1))

El PRD lo pone en tener la Cita pegada, con su atribución, en menos de treinta segundos; la espina, en «confía en lo que va a citar». La v8 lo hace visible, porque el PRD dice que la Tarjeta de Obra no le cuesta ese clímax.

Arreglo: marcar el clímax del PRD o declarar la reinterpretación.

**[Cotejo de entradas]** — «Dos familias, sin excepciones» frente a la Tarjeta Social rasterizada en Georgia (preexistente) (§ DESIGN § Typography)

La v8 le suma la variante de los Directorios con la misma reserva.

Arreglo: declarar la excepción o cambiar el rasterizado.

**[Cotejo de entradas]** — «Que compartir no crezca a costa de copiar» (SM-C3) no consta (§ EXPERIENCE § Compartir en; diseño §12)

La espina nombra SM-C5 para la Tarjeta de Obra y no recoge esta contra-métrica, aunque el orden —Copiar e Imagen antes del bloque de compartir— la respeta de hecho.

Arreglo: recogerla.

**[Cotejo de entradas]** — «Si falta, nada se recoloca» vale dentro de la rejilla, no para la página (§ EXPERIENCE § Compartir en)

Sin reservar sitio, la isla que inserta la Historia empuja la rejilla unos 52 px después de cargar. No se pide reservar sitio, que UX-DR35 veda, sino que la frase no prometa más de lo que da.

Arreglo: acotar la frase a la rejilla.

**[Cotejo de entradas]** — Los filtros se aplican al cambiar, y en un `select` nativo eso es a cada flecha (§ EXPERIENCE § Búsqueda)

Se buscaría y se anunciaría una vez por opción recorrida. No rompe 3.2.2, pero el anuncio se vuelve ruido. Es el medio 5 de la lente de accesibilidad.

Arreglo: una pausa antes de aplicar.

## Lo que está bien y no hay que tocar (lente de accesibilidad)

- **Contraste, calculado:** el siena sobre papel da 6,26:1 en todos los usos nuevos y 6,00 sobre `surface-container-low`; la tinta apagada 7,26:1 y 6,96; el blanco sobre siena 6,70:1; el contorno de selectores y campo 3,66:1 (1.4.11); el anillo de foco 6,26:1; en las plantillas de la imagen, el apagado da 9,52:1 en Tinta y 5,40:1 en Siena. Los filetes de 1,36:1 separan y no identifican controles.
- **Orden de tabulación igual al de lectura** en la cabecera, la Página de Cita, `/buscar/`, los Directorios y la Página de Obra; la variante 1C se descartó con la razón correcta.
- **El foco nunca se pierde:** «Mostrar 30 más» lo lleva al primer resultado nuevo, «Quitar los filtros» al campo, el selector de Obra aparece detrás del de Autor sin moverlo, y filtrar un Directorio lo deja en el campo.
- **Nada se deshabilita,** y lo que no puede cumplirse no existe: la Historia sin puntero grueso, la Imagen por encima de 300 caracteres, el selector de Obra sin Autor. Ningún estado afirma lo que no pasó.
- **Etiquetas visibles encima** de todo campo y selector; los nombres de «Compartir en» contienen el texto visible (2.5.3); «→» y «↓» van en el marcado con `aria-hidden`; las letras de salto funcionan sin guion, miden 44 px y van a 8 px entre sí.
- **La convención de `AGENTS.md`** sobre mensajes de estado está recogida en la espina y aplicada en las maquetas y en lo construido que la v8 reutiliza (`CopiarCita.astro`, `ImagenDeCita.astro`, `buscar.astro`, todos con `requestAnimationFrame`).

## Comprobado sin hallazgo (revisión de coherencia)

- **Bitácora 115–128:** las catorce decisiones están en las espinas con la variante exacta; la única diferencia era el rótulo de 7C (medio 3).
- **Addendum, «De UX»:** las siete decisiones diferidas estaban cerradas en las espinas.
- **Compartición:** el mecanismo de la Historia —portapapeles y después la hoja, `AbortError` frente a `NotAllowedError`, `pointer: coarse` y `canShare` con un PNG de prueba— sin contradicción; la línea de cifras, también.
- **Componentes:** los nombres son los mismos en las dos espinas, y los grupos van en el mismo orden.
- **Contrastes de § Colors, recalculados:** 16,00; 7,26; 6,26; 6,70; 3,66; y 2,20, 1,16 y 2,56 para las parejas enlace frente a texto.
- **Los FR:** 7, 8, 9, 10, 11, 17, 18, 20, 21, 51, 52, 54 y 55 están como los fija el PRD; las únicas enmiendas son las de FR-12 y UJ-6.

## Notas mecánicas

- **Referencias cruzadas:** las `§` comprobadas resuelven todas (§ Portada, § Búsqueda, § Directorios, § Primitivas, § Obra traducida, § Maquetas, § Tipografía adaptativa e «Imágenes que salen del sitio»). No quedan referencias vivas a componentes retirados: «Compartir la cita» y «Citas hermanas» solo aparecen en notas de historia.
- **Marcas abiertas.** En la puerta había 43 `[ASSUMPTION]` en DESIGN.md y 69 en EXPERIENCE.md, y tres `[NOTE FOR PM]`. Al cierre son 71 y 126 `[ASSUMPTION]`, que esperan la confirmación de Héctor y no cuentan como hallazgo, y seis `[NOTE FOR PM]` en EXPERIENCE.md.
- **Fuera de `bmad-ux`.** Para la pasada corta de `bmad-prd`: FR-12, UJ-3, UJ-6, FR-9 («en una línea»), NFR-9 (WCAG 2.2 AA) y la grafía «en este tema» (bitácoras 125, 128, 138 y 139). Para `bmad-project-context`: los dos ritmos de anuncio y los mensajes de estado nuevos de la v8 en `AGENTS.md` (bitácora 138).
- **Tamaño al cierre:** DESIGN.md 459 líneas y 12.015 palabras; EXPERIENCE.md 573 líneas y 23.723 palabras, con 80 y 201 marcas «(v8», que se conservan por convención de las pasadas anteriores (bitácora 140, decisión de proceso).
- **Estado de la pasada:** el frontmatter de las dos espinas dice `status: final` y `updated: 2026-10-18`, y los `sources` ya incluyen el addendum en las dos. A la fecha de este informe la bitácora acaba en la entrada 141 y todavía no tiene el evento «spines finalized (v8)».
- **Copias de `.working/`:** en la puerta quedaban seis copias de las maquetas v8, idénticas a las promovidas. Se borraron (bitácora 141); en `.working/` solo queda `verif-cierre.md`.
- **Dibujos:** no hay Mermaid.
- **Geometría comprobada contra las maquetas, en la puerta:** el salto «Dónde leer esta obra ↓» a 3 × `{spacing.unit}` deja 14 px entre su zona y la de «de {Autor}» y cumple; la rejilla de letras da 6 por fila y unos 200 px a 360; la Cabecera medía 105 px a 320 y a 360, y con los 8 px entre filas pasa a unos 113, a volver a medir.
- **Cómo se cuentan los hallazgos:** 104 entradas en cuatro informes, sin deduplicar entre informes. Los seis altos son tres problemas distintos, y varios medios se repiten entre lentes (los `h2` de la portada, «Más opciones…», las zonas de FR-56, las marcas para el PM de UJ-3 y UJ-6).

## Ficheros de revisión

- `review-rubric.md`
- `review-accesibilidad.md`
- `review-coherencia.md`
- `reconcile-v8.md`
- `.working/verif-cierre.md` (verificación de cierre, posterior a las correcciones)
