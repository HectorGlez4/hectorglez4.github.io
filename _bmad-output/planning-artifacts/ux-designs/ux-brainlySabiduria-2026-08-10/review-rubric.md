# Revisión del par de espinas — brainlySabiduria (rúbrica, pasada v8)

Alcance: `DESIGN.md` y `EXPERIENCE.md` tal como están en el árbol el 2026-10-18 (sin commitear), contra el PRD v8 (`prd.md`, `addendum.md`), el diseño `docs/superpowers/specs/2026-10-17-v8-cita-como-centro-design.md`, las seis maquetas `mockups/v8-*.html` y las entradas v8 de `.memlog.md` (114–128). El foco está en lo que cambió en la v8. Lo anterior a la v8 solo aparece cuando la v8 lo amplía o lo vuelve a usar.

## Veredicto general

Como contrato de la v8, el par se deja extraer casi entero.
- **Componentes.** Cada superficie y cada componente nuevos tienen fila en las dos espinas, en los mismos grupos y en el mismo orden: Cabecera, Tarjeta de Obra, «Compartir en», Historia de Instagram, filtros de `/buscar/`, «Buscar en…», los dos Directorios y la Portada.
- **Tokens.** Las 357 referencias de token resuelven.
- **Contrastes.** Los ocho contrastes publicados son correctos; los he recalculado todos.
- **Maquetas.** Las once están enlazadas, cada una con la variante elegida.
- **Decisiones de Héctor.** Las catorce del 18/10 están escritas en las espinas.

Lo que impide extraer limpio son dos decisiones que el PRD delegó a UX y que siguen abiertas en el centro del alcance nuevo:
- **«Más opciones…» sin guion.** Las dos espinas se contradicen.
- **El estado al que llega «Buscar en esta obra».** El filtro de Obra queda puesto y su selector no existe.

Detrás de esas dos van tres cosas:
- **Geometría que choca con las reglas propias.** Hay zonas de toque pegadas, en la Cabecera de dos filas y en la cabecera de grupo de `/obras/`, y en la portada la estructura de encabezados parte la Cita del Día.
- **Más del doble de tamaño.** DESIGN.md pasa de 4.805 a 9.831 palabras y EXPERIENCE.md de 8.671 a 19.760.
- **Reglas retiradas otra vez dentro del contrato.** Vuelven a citarse literalmente, contra la decisión de Héctor del 09/10.

Las `[ASSUMPTION]` pendientes de Héctor son 43 en DESIGN.md y 69 en EXPERIENCE.md, unas 25 más en cada una que en la v7.1. Están bien marcadas y no cuentan aquí como hallazgo.

## 1. Cobertura de flujos — adecuado

**Qué se comprobó.** Los seis UJ del PRD §2.3 tienen su Key Flow, también el UJ-6, que es nuevo. Los seis tienen protagonista con nombre, pasos numerados, clímax marcado y fallo posible. Los títulos son literales del PRD. UJ-2 cierra bien lo que el PRD dejó a UX: la Historia va en dos toques. UJ-5 ya cuadra con el PRD v8: el Kit descarga y son cinco cuentas. FR-55 lo realiza UJ-6, y FR-56 no pide flujo porque es medición.

### Hallazgos
- **medium** UJ-3 y UJ-6 se apartan del texto del PRD por decisión de Héctor (memlog:128), pero los flujos no lo marcan. UJ-3 amplía su resolución con el Directorio de Obras y compartir por WhatsApp (EXPERIENCE.md:403); el PRD la cierra en «vuelve… directamente al dominio (UJ-6)» (prd.md:58-59). UJ-6 cambia «salta a la «M»…, teclea «mar»» por teclear en el campo, y «escuela» por «enseñanza» (EXPERIENCE.md:427-428, frente a prd.md:67-68). Solo la resolución de UJ-3 lleva `[NOTE FOR PM]`, y lo lleva en el cierre de superficies (EXPERIENCE.md:44), no en el flujo. Quien derive historias de UJ-6 tiene dos textos contradictorios y ninguna marca que diga cuál manda. Para colmo, el fallo de UJ-6 acaba con «el recorrido acaba en ese estado» (EXPERIENCE.md:431), que solo se entiende conociendo la versión del PRD. *Arreglo:* un `[NOTE FOR PM]` en cada uno de los dos flujos que nombre la diferencia exacta, y reescribir esa frase final: «con «escuela», como dice hoy el PRD, el recorrido acaba en cero resultados».
- **low** Si un Tema publicado tiene un solo Autor, «Siguiente cita de {Tema}» da la vuelta y vuelve al mismo Autor, lo que contradice «nunca a otra del mismo Autor» (EXPERIENCE.md:294). Hoy no pasa, pero ninguna puerta lo impide, igual que en la fila «Cita sin Tema publicado». *Arreglo:* sin otro Autor en el Tema, no hay «Siguiente», como sin Tema.

## 2. Completitud de tokens — adecuado

**Qué se comprobó.**
- **El frontmatter no cambia en la v8:** 29 colores, 11 tipografías, 5 radios, 5 espaciados y 4 de `components`, todos con su valor y los colores en hexadecimal.
- **Referencias:** DESIGN.md tiene 340 (37 distintas) y EXPERIENCE.md 17 (13 distintas), y todas resuelven. Quedan sin referenciar 14 colores M3 de relleno y `rounded.sm`, `md` y `full`, lo que es razonable.
- **Contrastes:** recalculé los de la tabla, que la v8 amplía con «Blanco sobre siena 6,7:1» y «Contorno sobre papel 3,66:1». Dan 16,0; 7,26; 6,26; 2,20; 1,16; 2,56; 6,7 y 3,66, todos correctos.

### Hallazgos
- **medium** Se multiplican las composiciones híbridas, y los tokens del frontmatter ya no describen su uso. La v8 escribe:
  - el título de la Tarjeta de Obra y el de las Obras de la portada, «Inter al cuerpo de `body-lg` con peso 600», dos veces;
  - la Fila de Autor y los Autores destacados, «Source Serif al cuerpo de `headline-sm`, con peso 400», dos veces;
  - el Encabezado del Directorio, «Inter al cuerpo de `headline-md`, con peso 600»;
  - las letras de salto, «`body-md` con peso 600»;
  - y el resultado de tipo Directorio, en Inter, al cuerpo de `headline-sm`.

  (DESIGN.md:244, :335, :323, :336, :319, :321, :307.) La convención «un token de tipografía da solo su cuerpo» (DESIGN.md:181) lo cubre en CSS. El frontmatter, en cambio, sigue declarando familia y peso: `headline-sm` = Source Serif 600. Un consumidor que lea el YAML —el formato de Google lo está pensado para eso— sacará la familia o el peso equivocados en siete sitios. *Arreglo:* tokens para las dos parejas que se repiten, `title-md` (Inter 17/600) y `name-sm` (Source Serif 21/400), y una línea en el frontmatter o en Typography que declare explícitamente que la familia y el peso del YAML son los del uso principal.
- **medium** El campo de copia manual sigue con su filete a 1,3:1 (`outline-variant` sobre `surface-container-low`; DESIGN.md:248), y la v8 lo reutiliza en el Diálogo de la Historia cuando falla el portapapeles (DESIGN.md:260; EXPERIENCE.md:305). La tabla de la v8 acaba de publicar que el borde de un control pide 3:1 (WCAG 1.4.11; DESIGN.md:156), así que el contrato se contradice a sí mismo en un componente que la v8 ha vuelto a usar. *Arreglo:* el filete del campo, en `{colors.outline}`. Sobre `surface-container-low` da 3,51:1.

## 3. Cobertura de componentes — adecuado

**Qué se comprobó.** Crucé los componentes nuevos o tocados en la v8 entre DESIGN.md § Components y EXPERIENCE.md § Component Patterns: unos 30 entre la Cabecera, la Página de Cita, los Listados, la Página de Autor, la Página de Obra, la Búsqueda, los Directorios, la Portada, los Modelos de ingreso y las Imágenes. Todos tienen especificación visual y de comportamiento, salvo dos primitivas que solo están en DESIGN, el Rótulo de sección y la Fila de bloque, y es correcto. Los grupos van en el mismo orden en las dos espinas.

### Hallazgos
- **high** El comportamiento de **«Más opciones…» sin guion** se contradice entre las dos espinas, y nadie cerró la decisión que tocaba cerrar.
  - DESIGN.md:253 fija cómo se ve desplegado («en otra rejilla igual a `{spacing.unit}` debajo… como la dibuja 2C», `[ASSUMPTION]`) y lo aplica también «sin guion».
  - EXPERIENCE.md:133 dice «Sin guion se ven todos los destinos de enlace… cómo se pliegan y cómo se ven desplegados está sin fijar».
  - El addendum v8 («Lo que cuesta en guion») y la maqueta (`v8-pagina-de-cita.html`, «[sin decidir] Cómo se ve «Más opciones…» abierto») delegan el mecanismo —un `<details>` que la isla convierte en la hoja— a UX y Arquitectura.

  Si el implementador pone un `<button>`, la Página de Cita y la portada llevan sin guion un control que no hace nada, lo que va contra la regla de la espina «Ningún control que no haga nada» (DESIGN.md:309). Si pone un `<details>` cerrado, sin guion los tres destinos no «se ven», contra FR-18 y EXPERIENCE.md:133. *Arreglo:* decidir y escribirlo en las dos espinas. La propuesta: un `<details>` cuyo `<summary>` es «Más opciones…», abierto o cerrado sin guion según decida Héctor; la isla lo convierte en el disparador de la hoja donde la hay. Añadir la fila de estado «Sin guion» al bloque y quitar de DESIGN el `[ASSUMPTION]` o alinearlo.
- **medium** En la portada, la Tarjeta de Obra y «Compartir en» vuelven a usarse con su `h2` fijo. EXPERIENCE.md:365 los da por `h2` en toda superficie. En la portada eso los pone al nivel de «La cita de hoy», «Obras» y «Temas». Así, el bloque que las dos espinas declaran «un solo bloque» (EXPERIENCE.md:228; DESIGN.md:334) se oye como tres secciones de portada al navegar por encabezados (WCAG 1.3.1). *Arreglo:* dentro de «La cita de hoy», `h3` para «De la obra» y «Compartir en», y la regla escrita en Accessibility Floor: el nivel lo da el contenedor.
- **medium** Los cierres de la portada se tratan distinto que sus gemelos, y la fuente única del subrayado no los nombra.
  - **En la portada, subrayados:** DESIGN.md:335-336 subraya «Las {n} obras →» y «Los {n} autores, de la A a la Z →», y DESIGN.md:334 subraya «Ver esta cita».
  - **En las Rutas de salida, sin subrayar:** los cierres «Las {n} citas de… →» son la última Fila de bloque (DESIGN.md:261, :222).
  - **En la fuente única:** la lista de EXPERIENCE.md:369 —declarada única fuente del subrayado— no incluye ninguno de los tres de la portada, ni entre los subrayados ni entre los de bloque.

  *Arreglo:* un solo trato para los cierres —Fila de bloque o enlace de texto subrayado— y los tres nombrados en EXPERIENCE.md:369.
- **low** El rótulo de tipo «Directorio» está decidido en DESIGN.md:307 y en el estado sin guion (EXPERIENCE.md:326), pero EXPERIENCE.md:205 dice «su rótulo de tipo y qué parte de su lista se ignora los fija Arquitectura». El rótulo visible es microcopia y le toca a UX. A Arquitectura le tocan la clave de Pagefind y lo que se ignora. *Arreglo:* que EXPERIENCE.md:205 comprometa «Directorio» y deje a Arquitectura solo esas dos cosas.
- **low** El nombre accesible del Diálogo de la Historia sale «del botón que lo abre, «Historia de Instagram»» (EXPERIENCE.md:134). Pero el nombre accesible de ese botón es «Compartir en Historia de Instagram», porque lleva el prefijo en `.solo-para-lectores` (EXPERIENCE.md:133). Con `aria-labelledby`, el diálogo hereda el prefijo. *Arreglo:* escribir el nombre resultante, o tomarlo solo del texto visible.
- **low** El Kit y el Lote ofrecen ya los dos formatos (EXPERIENCE.md:249), pero DESIGN.md no tiene fila para el material del Kit y no dice cómo se presentan el cuadrado y el 9:16. Es un pendiente de la v7.1 que la v8 amplía. *Arreglo:* una fila corta, o la constancia de que se documenta como está construido.

## 4. Cobertura de estados — adecuado

**Qué se comprobó.** Recorrí cada superficie de la IA con los estados que le tocan. La v8 cubre con detalle:
- la Página de Cita sin Obra, con Obra de una Cita, sin cotejo, sin hermanas y por encima de 300 caracteres;
- los seis estados de la Historia de FR-17: carga, lista, compartida, rechazo, cancelación y fallo del portapapeles;
- el filtrado con texto, a cero y sin guion en los Directorios;
- en `/buscar/`, el filtro activo, la búsqueda sin JavaScript y la última tanda;
- en la portada, la falta de Obras indexables y la Cita del Día sin Obra o larga.

### Hallazgos
- **high** «Buscar en esta obra» lleva a un estado que la espina prohíbe. El formulario manda «el filtro en un campo oculto», en singular (EXPERIENCE.md:204; DESIGN.md:310), y «el de Obra no existe hasta elegir un Autor» (EXPERIENCE.md:200; DESIGN.md:304). Quien llega desde la Página de Obra tiene puesto el filtro de Obra y no tiene su selector: no ve qué se está filtrando y solo puede cambiarlo con «Quitar los filtros». `v8-buscar.html` lo deja «[sin decidir]» —¿dos campos ocultos, o `/buscar/` deduce el Autor de la ficha?— y la espina no lo recoge. Es una de las cuatro entradas nuevas a la búsqueda (FR-51). *Arreglo:* comprometer que una dirección con `obra=` pone también el Autor de esa Obra y que los dos selectores aparecen elegidos. Cómo se deduce es de Arquitectura. Añadir la fila de estado «Llega con un filtro puesto desde «Buscar en…»».
- **medium** El índice que no carga sigue «sin tratamiento: bajo el campo no aparece nada, ni resultados ni la salida de FR-8» (EXPERIENCE.md:329). La v8 lleva a `/buscar/` con estado desde la portada y desde las páginas 1 de Obra, Autor y Tema, y la búsqueda sin guion ya tiene una salida digna (7C, EXPERIENCE.md:326). Con guion y sin índice, todo eso acaba en un callejón, que la propia espina veda («Nunca un callejón sin salida», EXPERIENCE.md:324). *Arreglo:* que el fallo del índice muestre lo mismo que 7C —la frase, «vuelve atrás» y los dos Directorios— y lo anuncie por la región `role="status"`.
- **medium** No hay estado para una búsqueda compartida que ya no resuelve. La v8 hace compartible la búsqueda («se comparte copiándola», EXPERIENCE.md:200), pero no dice qué pasa con un `?autor=` de un Autor retirado o un `?obra=` de una Obra reunida, cuya URL deja de existir por FR-53. La frase a cero «No encontramos «x» entre las citas de {Autor} en {Obra}» (EXPERIENCE.md:324) no puede nombrar un valor que ya no tiene título. *Arreglo:* un estado que ignore el valor desconocido, lo diga en una frase y deje la búsqueda sin ese filtro.
- **low** El selector de Obra no tiene estado mientras llegan sus recuentos, unos 41 KB que se piden al elegir Autor (EXPERIENCE.md:200, :328). No se dice si aparece sin recuentos o espera. *Arreglo:* una línea.
- **low** Dos estados de los Directorios solo aparecen en la fila de la maqueta (EXPERIENCE.md:270), sin decisión en las filas de componente:
  - la lista salta hacia abajo cuando la isla inserta el campo encima de las letras;
  - no hay «Volver a las letras» en `/obras/`, que la propia espina mide en unos 45.000 px (EXPERIENCE.md:215).

  *Arreglo:* decidir los dos, o subirlos a una lista de pendientes visible.
- **low** En la última tanda, «Mostrar 30 más» puede pedir menos de 30. `v8-buscar.html` (decisión 5) lo deja «[sin decidir]» y la espina no lo menciona. *Arreglo:* confirmar que el rótulo no cambia, como dice FR-7, o llevarlo al PM.

## 5. Cobertura de referencias visuales — sólido

**Qué se comprobó.** `mockups/` tiene once ficheros, cinco anteriores a la v8 y seis de la v8, y los once están en la tabla de Maquetas (EXPERIENCE.md:260-272) con lo que muestran, su papel y sus divergencias. Cada grupo de DESIGN.md § Components enlaza su maqueta de la v8 y nombra la variante elegida. «Mandan las espinas» está escrito en EXPERIENCE.md:15, y la regla de «vale la elegida» en EXPERIENCE.md:258 y DESIGN.md:215. No hay `wireframes/` ni `imports/`, y no hay huérfanos.

### Hallazgos
- **medium** Algunas decisiones que las maquetas de la v8 dejan «[sin decidir]» no llegaron a la espina, ni como decisión ni como divergencia anotada:
  - `v8-buscar.html`, decisión 1: el orden de las opciones del selector de Autor —por nombre o por apellido—, que choca con la búsqueda por tecleo del selector nativo («con «M» no se llega a Martí»), y los 24 Temas que empiezan por «El» o «La»;
  - `v8-directorios.html`, 3A: si el filtro casa por principio de palabra o por subcadena (13 o 14 resultados para «mar»). Aun así, la espina da «13 autores.» como ejemplo y UJ-6 depende de esa regla (EXPERIENCE.md:214, :427);
  - la etiqueta del campo de filtro de los Directorios y el texto de la «primera opción que no filtra» de cada selector (EXPERIENCE.md:200, :214).

  La fila de `v8-buscar` en la tabla de Maquetas anota tres divergencias, y no son estas. *Arreglo:* decidir —en la propuesta, por principio de palabra, con las opciones de Autor en el orden del Directorio y la microcopia escrita— o anotarlas en la columna de divergencias, para que no se pierdan.
- **low** `v8-buscar.html` (decisión 8) dibuja «Buscar en…» con un botón secundario «Buscar», y `v8-pagina-de-obra.html` sin botón. La espina elige sin botón (DESIGN.md:310, `[ASSUMPTION]`). Además, el formulario sin envío visible —también en la portada— choca con «Toda acción tiene un control visible» (EXPERIENCE.md:344). *Arreglo:* que Héctor lo confirme. Si se queda sin botón, declarar la excepción junto a esa regla.

## 6. Sobrecarga y sobreespecificación — flojo

**Qué se comprobó.** El tamaño, la densidad de anotaciones de versión, las celdas de tabla y las cifras con fecha.

### Hallazgos
- **medium** Vuelven las reglas retiradas citadas literalmente. Héctor decidió el 2026-10-09 que «solo se quitan las reglas retiradas citadas literalmente y las alternativas descartadas, que ya están en la bitácora» (memlog:84). La v8 añade 27 anotaciones «*(v8 — antes …)*», 21 en EXPERIENCE.md y 6 en DESIGN.md, y 19 llevan la regla vieja entre comillas. La más arriesgada está en EXPERIENCE.md:58: la columna «Sí» de Voice and Tone guarda, dentro de la celda, la microcopia retirada «Esta cita es demasiado larga para generar una imagen.», que un extractor que lea esa columna tomará por válida. Otras: :102, :118, :137, :143, :223, :298, :315, :324, :343, :364, :386; DESIGN.md:141, :250. *Arreglo:* dejar el «*(v8)*» y quitar el «antes «…»», que ya está en el memlog y en git.
- **medium** El par dobla su tamaño en una sola pasada. DESIGN.md pasa de 4.805 a 9.831 palabras y EXPERIENCE.md de 8.671 a 19.760, con 179 y 67 marcas «(v8». Hay celdas de comportamiento de 479 palabras (el bloque «Compartir en», EXPERIENCE.md:133), de 333 (Tarjeta de Obra, :129) y de 298 (Diálogo de la Historia, :134). Son reglas de verdad, pero metidas en una celda de tabla no se pueden citar ni extraer por partes. *Arreglo:* convertir en listas debajo de la tabla las cuatro filas de más de 250 palabras, como ya se hizo con «Dónde leer esta obra» (EXPERIENCE.md:177-193). Y con la puerta pasada, quitar las marcas de versión de las reglas que no sustituyen a otra.
- **low** Hay cifras del Corpus fechadas dentro del contrato: «Hoy son 4 Citas» (EXPERIENCE.md:293), «Hoy son 7 Obras» (:295), «las 87 Obras de dos Citas» (:296), «unos 45.000px» (:215) y la página que crece «de unos 1.500px a unos 2.780» (DESIGN.md:261). Envejecen solas. *Arreglo:* «medido el 2026-10-18», o moverlas al memlog.

## 7. Disciplina de herencia — adecuado

**Qué se comprobó.** Los `sources` resuelven. Los nombres de UJ son literales. Usan los términos del glosario v8 del PRD: Tarjeta de Obra, Tarjeta de Cita, Directorio de Autores, Directorio de Obras, marca de difusión, marca de origen, clave de orden y superficie de lectura. Los nombres de componente son iguales en las dos espinas, y las referencias FR/NFR que muestreé son correctas (FR-7, FR-8, FR-9, FR-12, FR-17, FR-18, FR-20, FR-51, FR-52, FR-55, FR-56, NFR-8).

### Hallazgos
- **medium** Las zonas de FR-56 están escritas a medias. Siete filas dicen qué zona registran: Cabecera, Tarjeta de Obra, «De la misma obra», «Más de {Autor}», Tarjeta de Cita, Resultado y Fila de Autor (EXPERIENCE.md:118, :129, :135, :136, :143, :205, :217), y la Cita del Día (:228). Otras que FR-56 incluye no lo dicen:
  - la Atribución y el Autor de la Cabecera de Obra (:127, :172);
  - el Chip de Tema y el Chip de Colección (:145, :146);
  - la Paginación (:144);
  - la Lista de Obras (:162);
  - las Obras y los Autores de la portada (:229, :230).

  Un consumidor no sabe si el silencio quiere decir «sin zona». *Arreglo:* quitar todas las menciones y remitir a FR-56, o poner en Component Patterns una sola tabla de componente y zona.
- **medium** La regla de separación de 8 px entre zonas de toque (EXPERIENCE.md:347) choca con la geometría que la v8 decide, y no declara su alcance.
  - **La Cabecera de dos filas** mide 105 = 8 + 44 + 44 + 8 + 1 (DESIGN.md:230): la zona de la marca toca la de «Autores · Obras · Buscar», a 0 px, y la maqueta `.cab-a` lo confirma. EXPERIENCE.md:352 solo pide 8 px en horizontal.
  - **La Cabecera de grupo de `/obras/`** pide 44 px para un nombre de 27,3 px de línea, por relleno y margen negativo, y pone la lista «a `{spacing.unit}` del nombre» (DESIGN.md:324). La zona asoma 8,35 px por debajo y la deja a unos 0 px de la primera Fila de Obra. La maqueta dibuja 41 px con 1 px de separación.
  - **Las Filas de bloque apiladas** —Tarjeta de Obra, Directorios, portada— están pegadas, separadas solo por un filete.

  *Arreglo:* declarar en Interaction Primitives que dos filas de bloque a todo el ancho y apiladas no necesitan los 8 px, y decir si la marca de la Cabecera es una de ellas. En la cabecera de grupo, hacer que el nombre sea un bloque de 44 px de alto, como el salto de la Cabecera de Obra, para que la lista a `{spacing.unit}` deje 8 px de verdad.
- **low** Las entidades no se escriben igual en la microcopia nueva. «Siguiente cita de {Tema} →» (EXPERIENCE.md:129, :294; DESIGN.md:246) produce «Siguiente cita de La vida →». En cambio, el Recuento escribe el Tema en minúscula y con «sobre» (EXPERIENCE.md:202), y es lo que dibuja la maqueta («sobre la vida»). Además, «Buscar en este Tema» va con mayúscula y «Buscar en esta obra», en minúscula (EXPERIENCE.md:204). *Arreglo:* una sola regla de mayúsculas para las entidades en la microcopia, y «Siguiente cita sobre {tema} →», si Héctor lo confirma.
- **low** «Hoja del Sistema» lleva mayúsculas en el glosario del PRD. En las espinas aparece 7 veces en minúscula y una con mayúscula (EXPERIENCE.md:446). *Arreglo:* el término del glosario.
- **low** Los `sources` no son simétricos. Ninguna de las dos espinas lista `addendum.md`, que es fuente de la v8 y delega mecanismos a UX. DESIGN.md no lista `2026-10-05-pagina-de-obra-design.md` y EXPERIENCE.md sí (DESIGN.md:4-7; EXPERIENCE.md:4-9). *Arreglo:* añadir el addendum a las dos, y la decisión del 05/10 a DESIGN.

## 8. Forma — sólido

**Qué se comprobó.**
- **DESIGN.md:** las ocho secciones canónicas, en orden. «De token a propiedad CSS» va dentro de Components y está justificado.
- **EXPERIENCE.md:** tiene todos los defaults obligatorios —Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor y Key Flows—, además de Responsive y de Inspiration & Anti-patterns, que tocan por la portada y los navegadores de referencia.
- **Secciones inventadas:** las dos se ganan su sitio. «Tipografía adaptativa de la Cita» gana en la v8 la columna 9:16. «Obra traducida» se extiende a la Tarjeta de Obra y al 9:16. «Maquetas» es una subsección.
- **Orden:** EXPERIENCE pone Key Flows antes de Responsive e Inspiration, y no hay orden bloqueado que lo impida.

Sin hallazgos.

## Notas mecánicas

- **Referencias cruzadas:** las `§` que comprobé resuelven todas: § Portada, § Búsqueda, § Directorios, § Primitivas, § Obra traducida, § Maquetas, § Tipografía adaptativa y «Imágenes que salen del sitio». No quedan referencias vivas a componentes retirados: «Compartir la cita» y «Citas hermanas» solo aparecen en notas de historia.
- **Marcas abiertas:** hay 43 `[ASSUMPTION]` en DESIGN.md (en 38 líneas) y 69 en EXPERIENCE.md (en 56). Hay tres `[NOTE FOR PM]` (EXPERIENCE.md:44, :284 y :294), y falta el de UJ-6 (§1).
- **Estado de la pasada:** el frontmatter de las dos espinas dice `status: final` y `updated: 2026-10-18`, pero `.memlog.md` no tiene todavía el evento «spines finalized (v8)». La pasada está en la puerta de revisión.
- **Copias en `.working/`:** quedan seis copias de las maquetas v8, del mismo tamaño en bytes que las promovidas a `mockups/`. Es fácil editar la que no es. Conviene borrarlas o marcarlas al cerrar la pasada.
- **Dibujos:** no hay Mermaid.
- **Geometría comprobada contra las maquetas:**
  - El salto «Dónde leer esta obra ↓» a 3 × `{spacing.unit}` deja 14 px entre su zona y la de «de {Autor}», porque el salto es un bloque de 44 px. Cumple.
  - La rejilla de letras da 6 por fila y unos 200 px a 360, como dice la espina.
  - La Cabecera mide 105 px, igual a 320 que a 360.
