# Cotejo de entradas — pasada v8 de `bmad-ux`

Fecha: 2026-10-18. Paso «Inputs reconciled».

**Espinas cotejadas:** `DESIGN.md` y `EXPERIENCE.md` tal como están en el árbol de trabajo. Su diff frente a `HEAD` es la destilación v8.

**Entradas:**

- el PRD v8 (`prd.md` y `addendum.md`): FR-3, FR-7…FR-12, FR-17, FR-18, FR-20, FR-51, FR-52, FR-55, FR-56, §10, §11 y UJ-1…UJ-6;
- el diseño `docs/superpowers/specs/2026-10-17-v8-cita-como-centro-design.md`: §5–§9 y la fila UX de §10;
- las seis maquetas `mockups/v8-*.html`, sobre todo sus anotaciones «[sin decidir]».

**Criterio:** la bitácora del 18/10 manda. Tres cambios al PRD son a sabiendas y van a una pasada corta de `bmad-prd`: FR-12, con «Siguiente» de Tema igual a la primera Cita del siguiente Autor; UJ-3, ampliado con el Directorio de Obras; y UJ-6, con «enseñanza» y sin «salta a la M». No se cuentan como fallo. Solo se comprueba que las dos espinas los dicen igual y que los marcan para el PM.

**Gravedad:**

- **alta**: deja a la implementación ante un estado imposible o ante dos contratos;
- **media**: falta una regla que una historia necesitará, o una espina contradice a la otra;
- **baja**: matiz, redacción o deuda ya conocida.

## 1. Lo más grave

1. **alta — «Buscar en esta obra» choca con el selector de Obra.**
   - Las dos espinas dan el formulario por cerrado con «el filtro en un campo oculto», en singular (EXPERIENCE § Búsqueda; DESIGN § Búsqueda).
   - Pero el selector de Obra «no existe hasta elegir un Autor», y quitar el Autor quita la Obra.
   - Desde la Página de Obra se llegaría a `/buscar/?obra=…` sin Autor. Habría un filtro activo que ningún selector enseña ni deja quitar uno a uno. El recuento «23 citas de José Martí en Maestros ambulantes.» tampoco tendría su Autor.
   - La maqueta `v8-buscar.html` lo dejó «[sin decidir]» con dos salidas: dos campos ocultos, `autor` y `obra`, o deducir el Autor del nombre de la ficha. Ninguna espina elige.
2. **alta — «Más opciones…» sin guion.**
   - FR-18 y NFR-2 exigen Telegram, X y Correo en el HTML inicial, «tras «Más opciones…»».
   - El addendum propone un `<details>` que la isla convierte en la hoja, y dice «lo cierran UX y Arquitectura».
   - EXPERIENCE lo deja «sin fijar» —«cómo se pliegan y cómo se ven desplegados»—. DESIGN, en cambio, los da por desplegados sin guion [ASSUMPTION]. Son dos contratos distintos.
   - Ninguna espina dice qué semántica tiene el despliegue con guion y sin hoja: `aria-expanded`, adónde va el foco y si los destinos se anuncian.
   - Si se construye como `button`, sin guion es un control que no hace nada. Es justo lo que DESIGN veda para `/buscar/`.
3. **media — La Lista de Obras se contradice entre las dos espinas.**
   - DESIGN § Página de Autor: «la cifra sola a la vista, y la unidad para el lector de pantalla», como está construido. Solo el Directorio de Obras lleva «la unidad a la vista».
   - EXPERIENCE § Página de Autor: la Lista de Obras, «Ficha de Autor y Directorio de Obras», lleva «la unidad visible —«27 citas», «1 cita»—» [ASSUMPTION].
   - Uno de los dos cambia lo construido en la Página de Autor sin decirlo.
4. **media — «Siguiente cita de {Tema} →» sale agramatical.**
   - Los 24 Temas empiezan por «El» o «La», así que la plantilla da «Siguiente cita de El amor →», sin contracción.
   - Choca además con la convención de la propia espina para el Tema dentro de una frase: en minúscula y tras «sobre», como en «Citas sobre {Tema}» o en el recuento «8 citas de José Martí sobre la prudencia.».
   - La maqueta de la Página de Cita usó «Siguiente cita sobre la vida →». La espina lo anota como divergencia de la maqueta en vez de resolver la plantilla.
   - Mismo asunto, menor: las espinas escriben «Buscar en este Tema» con mayúscula, y la microcopia escribe las entidades en minúscula («Escribe un fragmento, un autor o un tema.»). `v8-buscar.html` lo marca «[sin decidir]».
5. **media — Los cambios a sabiendas de UJ-6 y UJ-3 no llevan marca para el PM en su recorrido.**
   - La decisión está escrita igual en las dos espinas y en la bitácora: «mar» en el campo, encima de las letras, y «enseñanza».
   - Pero el único `[NOTE FOR PM]` de recorridos está en el Cierre de superficies, y solo por el Directorio de Obras de UJ-3.
   - El Key Flow de UJ-6 no lleva ninguno, aunque difiere del PRD en dos pasos.
   - El caso límite de UJ-6 también difiere y no consta en la bitácora como cambio al PRD. El PRD dice «el filtro del Directorio lo dice con su recuento a cero». La espina lo sustituye por «Ningún autor tiene «x» en el nombre.» sin recuento, y Voice and Tone rechaza «0 autores.» como callejón.
   - La cabecera de UJ-3 dice «ampliado en la v8, con el texto nuevo del PRD», y su paso 8 no es texto del PRD.
   - La pasada corta de `bmad-prd` no tiene desde los recorridos un puntero a lo que debe alinear.
6. **media — Falta la frase del filtrado sin texto que no da nada.**
   - FR-8 pide que, con filtros y sin resultados, la página nombre los filtros «a quien quizá no escribió ninguna».
   - La única plantilla de las espinas lleva texto: «No encontramos «escuela» entre las citas de José Martí en Maestros ambulantes.».
   - Falta la forma sin texto, por ejemplo con un Autor y un Tema que no se cruzan. Es un caso real: Autor + Tema y Autor + Obra + Tema pueden dar cero, y FR-56 lo cuenta en el tramo 0.

## 2. Comprobación de los cambios a sabiendas (bitácora del 18/10)

| Cambio | Cómo lo dicen las espinas | ¿Igual? | Marca para el PM |
|---|---|---|---|
| FR-12: «Siguiente» de una Obra de una sola Cita = primera Cita del siguiente Autor en el primer Tema publicado | EXPERIENCE § State Patterns, la fila «Obra de una sola Cita», más el fallo de UJ-3 y la fila de maquetas. DESIGN solo da el rótulo | Sí. «Tras el último Autor, al primero» va como [ASSUMPTION] | Sí, `[NOTE FOR PM]` en la fila |
| UJ-3: la Resolución recorre el Directorio de Obras y comparte la Página de Obra | EXPERIENCE, Cierre de superficies y Key Flow, paso 8 | Sí | Solo en el Cierre de superficies. El Key Flow se presenta como «texto nuevo del PRD» (§1.5) |
| UJ-6: «teclea mar en el campo del Directorio, encima de las letras», y «enseñanza» en vez de «escuela» | EXPERIENCE, Key Flow, pasos 4 y 5; el fallo usa «escuela» como el caso a cero | Sí | **No** (§1.5) |

Hay un hueco que la regla nueva de FR-12 abre y nadie cierra, de gravedad baja. «Nunca a otra del mismo Autor» no se puede cumplir en un Tema cuyas Citas sean todas de un solo Autor: ninguna puerta lo impide, y la vuelta al primero devuelve al mismo Autor.

## 3. Por entrada

### PRD

- **FR-3** — Recogido entero: Copiar sobre la Cita del Día, lo mismo carácter por carácter y registrado como de la portada. Sin hallazgo.
- **FR-7**
  - **media**: el orden de las opciones de los selectores está sin fijar. `v8-buscar.html` lo marca «[sin decidir]» con un dato que lo complica: la búsqueda por tecleo del selector nativo casa por el principio del rótulo. Con el orden por apellido, «M» no lleva a Martí, y teclear «s» no lleva a «El saber».
  - **baja**: tampoco se fijan el texto de la primera opción («Todos los autores», «Todas sus obras»…), ni la forma visible del recuento de cada Obra en su opción, ni si ese recuento sigue a los demás filtros o es el total.
  - **baja**: el rótulo del resultado de tipo Directorio difiere entre espinas. DESIGN lo da: «Directorio», con el título en Inter. EXPERIENCE dice que «su rótulo de tipo… lo fijan Arquitectura». El rótulo visible es de UX; el tipo de Pagefind, de Arquitectura.
  - **baja**: «Mostrar 30 más» en la última tanda parcial: el texto que lleva no se dice, y la maqueta lo deja «[sin decidir]».
- **FR-8**
  - Falta la frase del filtrado sin texto que no da nada (§1.6).
  - **baja**: la regla de los ocho Autores destacados está; su **orden** de presentación no. La maqueta usa el del Directorio y advierte que por recuento «parecería un podio», y eso toca «el sitio nunca califica».
- **FR-9**
  - Recogido: orden de bloques, línea de cifras, campo, acciones, seis Obras, criterio de Colección, ocho Autores, la marca como `h1` y la Tarjeta plana.
  - **baja**: el PRD dice que cada Colección lleva su criterio «en una línea»; EXPERIENCE, «en una frase —que puede ocupar de dos a cuatro renglones—». Conviene que el PRD lea «una frase».
  - **baja**: si una de las seis Obras puede ser la de la Cita del Día está «[sin decidir]» en la maqueta; la regla de rotación es de Arquitectura.
  - **media, accesibilidad**: en la portada, «De la obra» y «Compartir en» se declaran `h2`, igual que «La cita de hoy». El bloque que la espina llama «uno solo» queda partido en el esquema de encabezados; dentro de «La cita de hoy» deberían ser `h3`.
- **FR-10, FR-11** — Recogidos enteros: los dos formatos, la columna 9:16, el dominio al pie, Papel única y la ausencia por encima de 300 caracteres también en la portada.
  - **baja, cualitativa**: se pierde el porqué de FR-11, «cada elección entre el toque y la historia es una ocasión más de abandonar».
- **FR-12** — Recogido entero, con el cambio a sabiendas (§2).
  - **media-baja**: FR-12 dice que la búsqueda interna no devuelve una Página de Cita por el texto de las Citas que enlaza, y el diseño §5 dice que «todo lo nuevo va fuera del cuerpo de Pagefind». La espina solo lo dice de la Tarjeta de Obra. «De la misma obra» y «Más de {Autor}» son ahora hasta siete Tarjetas de Cita con su fragmento entero, y no se dice que vayan fuera de `data-pagefind-body`.
- **FR-17**
  - Recogido: dos toques, estados, `AbortError` frente a `NotAllowedError`, el portapapeles y la región dentro del diálogo.
  - **baja**: el PRD dice «pulsar otra vez lo vuelve a intentar». En la Historia, la espina lo concreta como cerrar el diálogo y pulsar otra vez «Historia de Instagram». Es una lectura válida, pero distinta.
  - **media, cualitativa**: ver §5, la descarga en iOS.
- **FR-18**
  - Recogido: orden, destinos a la vista con hoja, Facebook solo con el enlace, X y Threads sin fragmento, el texto de Obra y `?via=`.
  - **alta**: «Más opciones…» sin guion (§1.2).
  - **baja**: el criterio de la v2 que distinguía «hoja para enlaces» —basta con que el navegador sepa compartir— de «hoja para ficheros» se cayó al retirar la Acción Compartir la cita. «Más opciones…» con hoja no dice cuál de las dos detecciones usa.
  - **baja**: «Compartir una Obra sigue durante la congelación» no consta en ninguna espina; sí consta para la Tarjeta de Obra, la Fila de Obra y las Obras de la portada.
- **FR-20** — Recogido: el botón nombra el destino, `opaco` para la hoja, y la descarga de la Historia con su destino. Sin hallazgo.
- **FR-51**
  - Recogido: el salto, compartir, «Buscar en esta obra», el orden del libro y que las páginas 2+ no los llevan.
  - **baja**: el orden del libro omite «documento a documento» para una Obra cotejada en varios documentos, que el PRD nombra y difiere a Arquitectura.
- **FR-52** — Recogido: fuera de resultados y de la portada, valor de filtro y fila igual en el Directorio de Obras. Sin hallazgo.
- **FR-55**
  - Recogido: orden por clave, Ñ, letras solo con entrada, años, recuento, filtro, sin guion y sin Modelos.
  - **media**: falta «volver a las letras». La maqueta mide unos 6.000 px de vuelta desde la M de `/autores/` y unos 41.000 desde la U de `/obras/`, y lo deja «[sin decidir]». Sin ello, la defensa que §11 y Inspiration & Anti-patterns hacen de los Directorios —que no son un listado denso porque se recorren por letras— solo vale bajando.
  - **baja**: en `/obras/`, cuando lo tecleado casa con un título y no con el Autor, no se dice si la cabecera de grupo del Autor se queda.
  - **baja**: el recuento en singular («1 autor.», «1 obra.») no se da.
  - **baja**: si el filtro casa por principio de palabra o por subcadena queda sin decir. Es mecanismo, pero el ejemplo «13 autores.» de UJ-6 depende de ello: con subcadena salen 14.
- **FR-56** — **media**. Las espinas asignan zona solo a parte de los enlaces: cabecera, Tarjeta de Obra, «Siguiente», «De la misma obra», «Más de {Autor}», Tarjeta de Cita, resultado, Directorios y Cita del Día.
  - Callan siete del conjunto cerrado del addendum: `atribucion` (el Autor y el título de la Atribución, y «de {Autor}» de la Cabecera de Obra), `chip-de-tema`, `obras-de-portada`, `autores-de-portada`, `colecciones`, `lista-de-obras` y `paginacion`.
  - Tampoco dicen qué zona llevan «Las {n} obras →», «Los {m} autores… →», «Ver esta cita» ni «Buscar «x» en las citas» del Directorio a cero.
  - O se nombran todas, o la espina remite al conjunto de AD-13. A medias, parece que las demás no registran.
- **§10**
  - **baja**: el PRD v8 nombra la página 404 como superficie pública no indexable. La tabla de superficies de EXPERIENCE no la tiene: solo vive en State Patterns.
- **§11** — Recogido entero: sin iconos de red, Directorios sin densidad, cifras como hecho y el dominio subordinado.
- **UJ-1**
  - **baja, preexistente**: el clímax del PRD es «en menos de treinta segundos… con la atribución correcta pegada sin que ella tuviera que teclearla». EXPERIENCE lo pone en «confía en lo que va a citar» y deja el tiempo en un paso sin clímax. La v8 lo hace visible: el PRD dice que la Tarjeta de Obra no le cuesta *ese* clímax.
- **UJ-2** — Recogido con el texto v8 y los dos toques. Ver §5, la descarga en iOS.
- **UJ-3, UJ-6** — §2 y §1.5.
- **UJ-4, UJ-5** — Recogidos enteros. La nota para el PM de UJ-5 se retira con razón.

### Diseño del 2026-10-17

- **§5** — Recogido: orden, Tarjeta de Obra, «Siguiente», «Ver la obra» con y sin «y dónde leerla», «De la misma obra», «Más de {Autor}», Tarjeta de Cita con Obra y el salto. Hallazgo de Pagefind en FR-12.
- **§6** — Recogido: el bloque, puntero grueso, la Historia, la imagen 9:16, el dominio y compartir en la Página de Obra. Hallazgos en «Más opciones…» (§1.2) y en la descarga en iOS (§5).
- **§7** — Recogido: la cabecera en dos filas, Autores y Obras en tinta y los dos Directorios. Hallazgos de FR-55.
- **§8** — Recogido: los selectores, la dirección, «Mostrar 30 más», el foco y la página sin guion.
  - «Buscar en esta obra» (§1.1) y el orden de las opciones (FR-7).
  - **baja**: el formulario «Buscar en…» va sin botón de envío visible [ASSUMPTION], y EXPERIENCE dice que «enviarlo vacío da todas las Citas de esa página». Sin botón, ese camino no se descubre.
- **§9** — Recogido entero, salvo el orden de los ocho Autores (FR-8) y el criterio «en una línea» (FR-9).
- **§10, fila UX**
  - Las líneas que cita de EXPERIENCE (:26-39, :33, :54, :76-82, :94, :103-107, :113, :116, :136, :140, :167-168, :246, :264, :341) y de DESIGN (:138, :217, :224, :225, :226, :230, :233, :248, :256-257) están atendidas.
  - Los UX-DR que nombra también: 11, 17, 19, 22, 24, 29, 34, 38 y 53; la pregunta de UX-DR34 —un enlace de la Página de Cita a su Colección— la contesta el Chip de Colección («No aparece en la Página de Cita»).
  - Los cuatro componentes nuevos y el sitio de la marca en la portada, también.
  - Los puntos de §14 delegados a UX están todos decididos.

## 4. Contradicciones entre las dos espinas

1. La unidad del recuento en la Lista de Obras de la Página de Autor (§1.3).
2. «Más opciones…» sin guion: desplegado en DESIGN, sin fijar en EXPERIENCE (§1.2).
3. El rótulo del resultado de tipo Directorio: dado en DESIGN, remitido a Arquitectura en EXPERIENCE (FR-7).
4. **baja, preexistente**: «Dos familias, sin excepciones» (DESIGN § Typography) frente a la Tarjeta Social rasterizada en Georgia y en la sans del sistema. La v8 le suma la variante de los Directorios con la misma reserva.

## 5. Ideas cualitativas que se pierden o se debilitan

- **media — «Entregar la pieza a la aplicación correcta sin pasar por el gestor de ficheros» (PRD §4.9).**
  - La caída de la Historia por `NotAllowedError` dice solo «La imagen se ha descargado.».
  - En iOS va a Archivos y no a Fotos, desde donde la historia no la recoge, y es justo lo que el clímax de UJ-2 promete evitar («sin buscar dónde ha caído el fichero»).
  - El addendum lo acepta como deuda, y la maqueta anota «decir dónde ha caído sería otra frase por sistema». La espina no lo dice ni ofrece el paso siguiente, que el diseño §13 llama «salida digna».
  - Debería al menos constar como deuda aceptada en la fila del estado.
- **media-baja — Retener sin recordar (PRD §2.2, «Fuera de alcance» de FR-12).** La v8 retiene «con lo que el sitio compone para todos —la siguiente Cita, la Cita del Día— y nunca con lo que guarda cada visitante». La Foundation de EXPERIENCE dice que la Página de Cita «lo que gana es retener», pero no recoge ese límite. Es el que cierra la puerta a «seguir donde lo dejaste» o a recordar la última búsqueda en el navegador.
- **baja — «Que compartir no crezca a costa de copiar» (SM-C3, diseño §12).** La espina nombra SM-C5 para la Tarjeta de Obra y no recoge esta contra-métrica. El orden —Copiar e Imagen antes del bloque de compartir— la respeta de hecho.
- **baja — «Si falta, nada se recoloca» (bloque «Compartir en»).**
  - Vale dentro de la rejilla, no para la página. Sin reservar sitio, la isla que inserta la Historia empuja la rejilla unos 52 px después de cargar.
  - Con una Cita sin Obra, las acciones suben a la primera pantalla y el salto se ve.
  - No se pide reservar sitio, que UX-DR35 veda. Se pide que la frase no prometa más de lo que da.
- **baja — Los filtros se aplican al cambiar.** «Cambiar un filtro rehace la búsqueda y la región anuncia el recuento nuevo.» En un `select` nativo, algunos navegadores disparan `change` con cada flecha. Se buscaría y se anunciaría una vez por opción recorrida. No es una ruptura de 3.2.2, pero el anuncio se volvería ruido.
