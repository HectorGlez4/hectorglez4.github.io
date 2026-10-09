# Revisión de las espinas — brainlySabiduria (rúbrica)

## Veredicto general

Como contrato de la **Página de Obra**, el par aguanta. La v7.1 la cubre con su fila de la IA, la Cabecera, «Dónde leer esta obra», las ediciones en venta, once estados, la sección de Obra traducida y la microcopia de pestaña y descripción, y todas las referencias de token resuelven. Lo que impide extraer limpio está **fuera del núcleo nuevo**:
- un componente del que dependen cuatro filas —la línea de la Fuente de la Página de Cita— no existe en ninguna de las dos espinas;
- la Tarjeta Social de Obra no tiene especificación visual, y reutilizar la plantilla que sí está descrita rompe la regla de la serif;
- las dos espinas se contradicen entre sí en componentes ya construidos: la búsqueda de la cabecera, las acciones, el chip y la iconografía.

También quedan dentro del contrato decisiones que se declaran abiertas en el propio texto: la hoja del sistema en el Kit, el progreso de la imagen, los cuerpos de la Lista de Obras y la Tarjeta Social de Autor. Y EXPERIENCE.md arrastra mucha historia de decisiones que pertenece a la bitácora. Hay 21 `[ASSUMPTION]` pendientes de Héctor (6 en DESIGN.md y 15 en EXPERIENCE.md). Están bien marcadas y no cuentan aquí como hallazgo.

## 1. Cobertura de flujos — adecuado

**Qué se comprobó.** Los cinco UJ del PRD §2.3 tienen cada uno su Key Flow, y los cinco cumplen la forma: protagonista con nombre, pasos numerados, clímax marcado y fallo posible. FR-51 dice que «realiza UJ-3», y UJ-3 recoge la Página de Obra en su paso 3. En la estructura no falta nada. Los problemas están en el contenido.

### Hallazgos
- **medium** UJ-5 lleva dentro del contrato una decisión que él mismo declara sin tomar: el paso 4 describe compartir desde la hoja del sistema, y la nota «Desfase abierto, sin decidir» reconoce que el Kit construido solo descarga y que FR-21 no lo exige. Quien implemente historias no puede saber si debe construir la hoja en el Kit. Además, el paso 1 nombra cinco cuentas y el clímax dice «cuatro redes»; esa incoherencia ya viene del PRD (EXPERIENCE.md:219-227). *Arreglo:* que Héctor decida. Si el Kit sigue descargando, el paso 4 se reescribe como está construido y la hoja pasa a `[NOTE FOR PM]`. Si no, se compromete como requisito y se añade un patrón de componente del Kit. La cifra de redes se corrige en el PRD.
- **low** El paso 2 de UJ-2 dice «con unos pocos diseños y su Cita ya compuesta en cada uno». El Diálogo de Imagen, en las dos espinas, tiene una sola previsualización, tres botones de plantilla y Papel elegida al abrir (EXPERIENCE.md:196 frente a :89 y DESIGN.md:189). *Arreglo:* «elige entre Papel, Tinta y Siena; la previsualización muestra la elegida».
- **low** El clímax de UJ-1 no es el del PRD. El PRD lo pone en tener la Cita pegada, con su atribución, en menos de 30 s. La espina lo pone en «confía en lo que va a citar» (paso 3) y deja los 30 s en el paso 5, sin marca de clímax (EXPERIENCE.md:189-191). *Arreglo:* marcar el clímax del PRD, o declarar la reinterpretación.
- **low** El clímax de UJ-4 dice «visible en el propio panel (FR-16)», y la IA afirma que «No hay panel autenticado en producción». El paso 1 habla de «la herramienta de Curación», cuando la puerta real son tres órdenes: `recuperar`, `extraer` y `revisar` (EXPERIENCE.md:37, :213, :216). *Arreglo:* «visible en el informe de salud del Corpus, en la terminal».
- **low** Ningún flujo cubre la entrada directa a una Página de Obra desde el buscador externo («frases del Oráculo manual»), que es la primera razón de ser de §4.19, ni el paso de «Dónde leer» a la edición cotejada. El PRD no tiene UJ para eso, así que la rúbrica no lo cuenta como falta. *Arreglo:* si se quiere el flujo, pedir al PM una variante de UJ-3. La espina no debe inventar un UJ.

## 2. Completitud de tokens — adecuado

**Qué se comprobó.** El frontmatter de DESIGN.md define 54 tokens: 29 de color, 11 de tipografía, 5 de radio, 5 de espaciado y 4 en `components`. Las 28 referencias `{…}` de DESIGN.md y las 13 de EXPERIENCE.md resuelven todas. La única que no resuelve es `{ruta.al.token}` (EXPERIENCE.md:14), y es el ejemplo de la sintaxis. Todos los colores llevan hex. Hay contraste declarado para tres pares.

### Hallazgos
- **medium** Faltan los contrastes de pares que cargan peso. Los he calculado:

  | Par | Contraste | Dónde se usa | Situación |
  |---|---|---|---|
  | `on-primary` sobre `primary` | 6,7:1 | botón primario, relleno al pasar el cursor, plantilla elegida, plantilla Siena | pasa, sin declarar |
  | texto del Chip de Tema | — | chip | el color no está asignado (solo `caption` y el fondo `surface-container`) |
  | campo de copia manual | 1,3:1 el filete `outline-variant` sobre `surface-container-low`; 1,04:1 el relleno frente a `surface` | campo de copia | nada lo identifica como campo (WCAG 1.4.11 pide 3:1) |
  | `outline` del campo de búsqueda | 3,66:1 | campo de búsqueda | pasa, sin declarar |

  Dos de las cifras declaradas no cuadran: la tinta da 16,0:1, no 15,8:1, y la tinta apagada da 7,26:1, no 7,4:1 (DESIGN.md:131-133, :188, :193). *Arreglo:* una tabla de contraste con esos pares, asignar color al texto del chip y darle al campo de copia un filete que llegue a 3:1 (`outline`).
- **medium** Hay composiciones fuera de la escala de tokens, y la convención de la espina de arquitectura dice que los estilos son tokens definidos una sola vez:
  - las Citas hermanas van en «Source Serif al tamaño de `{typography.body-lg}`», que es un token Inter;
  - el resultado de Obra va en «Inter al cuerpo y peso de `headline-sm`», que es un token serif;
  - la Lista de Obras deja «los cuerpos del título y del recuento… sin fijar», y eso bloquea la historia de la Épica 17;
  - la respiración móvil de 40 px es un literal sin token, aunque el código ya lo tiene;
  - las Tarjetas Sociales usan «píxeles del lienzo».

  (DESIGN.md:163, :194, :200, :201, :206.) *Arreglo:* añadir tokens —por ejemplo uno serif de 17 px para las Citas hermanas, `title-sm` en Inter 21/600 y `quote-breathing` para móvil— y fijar los cuerpos de la Lista de Obras.

## 3. Cobertura de componentes — flojo

**Qué se comprobó.** Hay 25 filas en DESIGN.md § Components y 28 en EXPERIENCE.md § Component Patterns, y se cruzaron una a una.
- Están bien cubiertas por otra fila: Listado de Colección y Listado de Obra (por la Tarjeta de Cita), y Acción Copiar, Imagen y Compartir la cita (por «Acciones de la Página de Cita»).
- Solo están en DESIGN, y es razonable porque son primitivas: Botones, Filete divisorio e Iconografía.

### Hallazgos
- **high** La **línea de la Fuente** de la Página de Cita (`src/components/Fuente.astro`, construida el 2026-08-26) no tiene fila en ninguna de las dos espinas. Aun así, cinco pasajes se definen contra ella:
  - el siena de § Colors;
  - «Semblanza», «como el enlace de la Fuente en la Página de Cita»;
  - «Dónde leer esta obra», con la misma frase;
  - la exención de zona de toque;
  - las «Acciones», que van «debajo de la Atribución y de la línea de la Fuente».

  Su comportamiento solo vive en el código: el rótulo es el nombre de la Fuente o su anfitrión, nunca la URL desnuda; lleva la licencia si consta; **no afirma el cotejo**; y no se pinta sin Fuente. Lo que FR-54 pide a «Dónde leer» se define por analogía con ella (DESIGN.md:133, :188, :199, :203; EXPERIENCE.md:166). *Arreglo:* una fila en cada espina, escrita como está construida.
- **high** La **Tarjeta Social de Obra** (FR-51) tiene fila en EXPERIENCE.md y no la tiene en DESIGN.md. La única especificación visual disponible es la «plantilla común de las Tarjetas Sociales de listado», que pone el nombre **en serif** y añade una banda siena decorativa. Reutilizarla para la Obra pone el título en serif, contra el Don't y contra la convención de la espina de arquitectura, y hereda un uso del siena que choca con «siena = actuar o salir». El `[DERIVADO]` «título de la Obra en Inter» de la bitácora (.memlog.md:63) no llegó a DESIGN.md. Quedan también abiertas la composición de la Tarjeta Social de Autor de la v5 («ni la maqueta ni la bitácora fijan su composición») y la Tarjeta Social de Cita (FR-19), que no tiene fila (DESIGN.md:201; EXPERIENCE.md:111). *Arreglo:* una fila «Tarjeta Social» en DESIGN.md, con sus variantes de Cita, listado, Autor y Obra, el título de la Obra en Inter y una decisión sobre la banda siena.
- **high** **Las dos espinas se contradicen entre sí** en componentes construidos. Son divergencias ya conocidas (.memlog.md:79), pero aquí no es solo la espina contra el código, sino un documento contra el otro, y quien implemente recibe dos respuestas. Gravedad de cada una:

  | Componente | Qué dice cada sitio | Gravedad |
  |---|---|---|
  | Campo de búsqueda | Las dos filas lo ponen «en la cabecera, todas las superficies públicas». DESIGN § Colors cuenta «Buscar» como enlace siena, y la nota de la maqueta de EXPERIENCE.md dice que lo construido es el enlace «Buscar». Afecta a la cabecera de todas las páginas (DESIGN.md:133, :190; EXPERIENCE.md:34, :92, :114). | high |
  | Acciones | DESIGN.md dice «cada una en su propia línea», como está construido. EXPERIENCE § Responsive dice «a ancho completo apiladas» por debajo de 600 px y «en línea» de 600 a 1024 (DESIGN.md:188; EXPERIENCE.md:235-236). | medium |
  | Chip de Tema | DESIGN.md lo pone en `caption` (Inter 13), con `rounded.md` y sin alto mínimo. La nota de la maqueta de EXPERIENCE.md trata «chips de Tema en Inter y por debajo de `tap-target-min`» como divergencia respecto de lo construido, que es serif a 44 px (DESIGN.md:193; EXPERIENCE.md:114). | medium |
  | Iconografía | DESIGN.md dice que los iconos se usan «exclusivamente para copiar, buscar y descargar», y el mismo DESIGN.md dice «Sin icono» en las Acciones y en el Campo de búsqueda (DESIGN.md:188, :190, :209). | medium |

  *Arreglo:* que Héctor haga el triaje y que cada caso quede en una sola frase idéntica en las dos espinas, antes de que ninguna historia toque la Página de Cita o la cabecera.
- **medium** Al **Resultado de búsqueda** le falta la base en DESIGN.md. Solo existe «Resultado de búsqueda de tipo Obra», que se define por diferencia («el mismo trato que "Cita"…», «el mismo cuerpo y peso que ellos») contra una especificación base que no está escrita en ningún sitio. Lo construido es un rótulo de tipo y el título en serif de 21 px. Los nombres tampoco coinciden entre los dos ficheros (DESIGN.md:206; EXPERIENCE.md:110). *Arreglo:* una fila «Resultado de búsqueda» con la base y la variante de Obra.
- **medium** Al pie de la Página de Obra le falta la especificación visual. «Temas de la Obra» no tiene fila en DESIGN.md, y no está fijado el ritmo vertical de la secuencia listado → paginación → Temas → Dónde leer → Nota, cuando las Rutas de salida lo tienen al detalle. Tampoco está fijado el nivel de encabezado de «Temas», mientras que «Dónde leer» sí fija su `h2` y sus `h3` (EXPERIENCE.md:106-109; DESIGN.md:194, :203). *Arreglo:* una fila para el pie de la Página de Obra que reutilice el ritmo de las Rutas de salida, con «Temas» como `h2`.
- **low** Hay componentes construidos que no aparecen en ninguna espina, aunque esta pasada quería ponerse al día con lo construido:
  - «Dónde seguirnos», en el pie del armazón (`DondeSeguirnos.astro`), que está en todas las páginas, también en las de lectura;
  - la cabecera del sitio, con la marca y «Buscar»;
  - la Cita del Día de la portada;
  - el material del Kit y del Lote (`MaterialParaPublicar.astro`).

  *Arreglo:* añadirles fila, o declararlos expresamente fuera del contrato.
- **low** La fila de la Tarjeta de Cita en EXPERIENCE.md sigue diciendo «Fragmento + autor» para los listados de Autor y de Obra, sin la excepción que sí fijan DESIGN.md y la fila del Listado de Obra: sin el nombre del Autor (EXPERIENCE.md:93 frente a :105 y DESIGN.md:191). *Arreglo:* añadir la excepción en esa fila.

## 4. Cobertura de estados — adecuado

**Qué se comprobó.** Se recorrieron las once superficies de la IA. La Página de Obra está muy bien cubierta: `noindex`, una sola Cita, sin Citas, sin cotejo, cotejo parcial, año que discrepa, páginas 2+, afiliación apagada, Obra absorbida y traductor. Los huecos están en superficies anteriores o en interacciones del cliente.

### Hallazgos
- **medium** La fila «Carga normal | Todas | … no hay nada que esperar» es falsa para `/buscar/`. Los resultados llegan de Pagefind en el navegador: `buscar.astro` lo importa al enfocar el campo. Hay estados sin cubrir:
  - la consulta vacía, en la que no se muestra nada;
  - la carga del índice;
  - un índice que no carga: el error no se trata y la página se queda en blanco;
  - sin JavaScript: el formulario hace GET a `/buscar/?q=` y no aparece nada;
  - el tope de 30 resultados.

  Además, la salida de «sin resultados» construida enseña Temas, Colecciones y **todos** los Autores, y la espina dice «Temas destacados + Autores destacados». Pesa ahora porque la v7.1 añade el tipo Obra a esta superficie (EXPERIENCE.md:136, :141). *Arreglo:* una fila por cada estado, como está construido o como se decida.
- **medium** El estado «Generando imagen» del Diálogo de Imagen deja sin decidir si sigue haciendo falta el indicador de progreso que pedía la v1: lo anota y no lo resuelve. Tampoco hay estado para un generador que no llega a cargar, por ejemplo sin red después de cargar la página; hoy la previsualización se queda vacía indefinidamente (EXPERIENCE.md:156). *Arreglo:* decidir lo del progreso y añadir el fallo, por ejemplo «No se pudo preparar la imagen.», con Copiar disponible.
- **medium** Dos estados de la Lista de Obras se han quedado viejos frente a la v7.1:
  - «Dos obras que son la misma partida por la Fuente — No se publican dos entradas» contradice AD-25 v7.1, que dice «grafías, nunca partes», que dos títulos donde uno es prefijo del otro avisan y no rompen, y que se decide en la Ficha de Obra. Hoy esos dos títulos serían dos Páginas de Obra hasta que la ficha las reúna.
  - «Cita sin obra declarada — … el recuento lo dice» se apoya en un recuento que DESIGN.md declara inexistente («Citas documentadas», sin recuento).

  La Épica 17 hereda los dos (EXPERIENCE.md:139-140; DESIGN.md:198). *Arreglo:* reescribir los dos estados contra AD-25 y FR-53, y decidir si hay recuento y dónde va.
- **low** Una Obra cuyas Citas no tocan ningún Tema publicado —todos por debajo de 15— no tiene estado. No se sabe si el rótulo «Temas» se pinta vacío (EXPERIENCE.md:106). *Arreglo:* «Sin Temas publicados, el bloque no existe».
- **low** Los estados construidos del Kit y del Lote no figuran en State Patterns, aunque la fila del Lote dice que se documenta «como está construido»:
  - «Hoy no hay ninguna Cita apta para portada.»;
  - el lote vacío;
  - una fijación muda;
  - la alternativa con Imagen.

  (EXPERIENCE.md:35-36.) *Arreglo:* filas de estado para los dos.
- **low** Quedan dos estados vacíos sin cubrir:
  - la portada sin ninguna Colección publicada, que es el estado real de hoy porque `corpus/colecciones/` está vacío;
  - una Página de Autor cuyas Citas no declaran obra, con la Lista de Obras vacía (¿se pinta el rótulo?).

  *Arreglo:* una fila para cada uno.

## 5. Cobertura de referencias visuales — adecuado

**Qué se comprobó.** `mockups/` tiene tres ficheros, y no existen `wireframes/` ni `imports/`; `.working/` está vacío. Los tres ficheros se enlazan en línea en EXPERIENCE.md § Component Patterns, con lo que ilustran y con sus divergencias enumeradas (cinco en la de la Página de Cita y tres en la de la Página de Obra). Comprobé al azar algunas de esas divergencias contra los ficheros y se sostienen. No hay huérfanos. «Mandan las espinas» está dicho en la cabecera de EXPERIENCE.md.

### Hallazgos
- **low** DESIGN.md cita maquetas sin nombrarlas ni enlazarlas:
  - «la maqueta del orden B»;
  - «La maqueta»;
  - «Es la variante A» y «variante D2»;
  - «la bitácora», que es `.memlog.md` y no es una fuente para quien consume las espinas.

  Con tres maquetas, «la maqueta» es ambigua (DESIGN.md:198-203). *Arreglo:* enlazar `mockups/pagina-de-autor-tres-ordenes.html` y `mockups/pagina-de-obra-variantes.html`.
- **low** «Mandan las espinas» se repite cuatro veces: la cabecera más tres notas. La nota de la maqueta de la Página de Autor dice además «si algún día divergen», cuando ya divergen en tres puntos que DESIGN.md enumera: la región junto a los años, el recuento en el rótulo y la semblanza a un cuerpo menor (EXPERIENCE.md:116; DESIGN.md:198-199). *Arreglo:* dejar una sola declaración y listar esas tres divergencias en la nota.

## 6. Hinchazón y sobreespecificación — flojo

### Hallazgos
- **medium** La prosa de EXPERIENCE.md arrastra historia de decisiones, alternativas descartadas y mediciones, cuando la rúbrica pide que no lleve voz editorial:
  - Cabecera de Obra: «el diseño del 05/10 traía tres…», «11 de los 183», «llega a cinco» y el segundo tramo descartado;
  - Paginación: la historia de NFR-5;
  - «Frases» y «citas»: el porqué y el coste aceptado;
  - el título de pestaña: las alternativas descartadas;
  - las Zonas de toque: el párrafo sobre WCAG;
  - «Medido: los 16 del Oráculo…».

  Hay filas de 150 a 250 palabras en las que la regla cabe en una frase (EXPERIENCE.md:58-60, :99, :104, :106, :166). *Arreglo:* dejar en la espina la regla y su referencia (FR o AD), y llevar el porqué a la bitácora, donde ya está.
- **medium** La regla retirada del siena sigue citada literalmente dentro de la regla vigente: «si aparece en más de dos sitios de una pantalla, algo está mal» (DESIGN.md:133, y también en el Do de :216). Fuera del alcance de UX, el comentario de `src/styles/tokens.css` la sigue enunciando como vigente. Quien busque «siena» encontrará la regla vieja dos veces, una de ellas en el código. *Arreglo:* quitar la cita de la espina y avisar del comentario a la próxima historia que toque `tokens.css`.
- **low** El estado de implementación está mezclado con el contrato:
  - «(recoge lo construido)», «Construido:», «Sin construir (Épica 17)», «hoy se pinta también en las 2+»;
  - una marca de versión (v5, v7.1…) en casi cada fila.

  Todo eso caduca con cada historia (DESIGN.md:188-207). *Arreglo:* un único marcador «Estado» por fila, o llevarlo a `sprint-status.yaml`.
- **low** Hay 21 tokens que ninguna espina referencia: la paleta `error-*`, `inverse-*`, `surface-dim` y `surface-bright`, `surface-container-high` y `-highest`, `on-*-container`, `rounded.sm` y `rounded.full`. La paleta de error contradice que no exista ningún estado visual de error. Y `secondary` está reservado a una herramienta de curación que EXPERIENCE.md declara de terminal (DESIGN.md:136; EXPERIENCE.md:37). *Arreglo:* quitarlos o marcarlos como reservados.
- **low** Hay literales en píxeles donde ya existe un token:
  - «Botones — texto en Inter 15px» (`body-md`);
  - «filete corto (48px, 1px…)» (`rule-width`);
  - «8px de separación» (`spacing.unit`).

  (DESIGN.md:185, :187; EXPERIENCE.md:166.) *Arreglo:* citar los tokens.
- **low** Las anti-referencias están duplicadas en DESIGN.md § Brand & Style y en EXPERIENCE.md § Inspiration & Anti-patterns: texturas, publicidad intercalada y botoneras de ocho redes (DESIGN.md:124; EXPERIENCE.md:245-253). *Arreglo:* dejarlas en un solo sitio.

## 7. Disciplina de herencia — adecuado

### Hallazgos
- **medium** Los nombres de token chocan con la convención del repositorio. `quote-*`, `author`, `quote-max-measure` y `quote-breathing` usan los nombres de entidad en inglés que vedan la convención de nombres de la espina de arquitectura y AGENTS.md («Ni `quote`… ni `author`»). El código los tradujo en `src/styles/tokens.css` (`--cita-xl`, `--autor`, `--siena`, `--titular-md`…), y esa correspondencia solo vive allí. El `title-lg` nuevo todavía no tiene nombre en español, y el obvio, `--titular-lg`, se confundiría con `--titular-md` y `--titular-sm`, que son serif (DESIGN.md:38-113). *Arreglo:* una tabla «token de DESIGN.md → propiedad CSS» en DESIGN.md con el nombre de `title-lg` ya fijado, o renombrar los tokens en español.
- **low** «Nombres heredados verbatim del PRD §2.3» (EXPERIENCE.md:184) no es cierto en tres de los cinco UJ:
  - UJ-1 pierde «, y la necesita ahora»;
  - UJ-3 pierde «una hora»;
  - UJ-4 pierde «nuevas» y «del sitio».

  Los identificadores UJ-N son estables, así que la trazabilidad no se rompe. *Arreglo:* copiar los títulos literales.
- **low** El `sources` de DESIGN.md no incluye `docs/superpowers/specs/2026-10-05-pagina-de-obra-design.md`, aunque sus filas de la v7.1 (`title-lg`, cabecera A, D2, E2) responden a ese encargo. Además, `sources` mezcla tres bases de ruta: `{planning_artifacts}/…`, `docs/…` relativa al repositorio y `DESIGN.md` relativa al espacio (DESIGN.md:4-6; EXPERIENCE.md:4-8). *Arreglo:* añadir la fuente y unificar las bases.
- **low** Los nombres de componente no son idénticos entre secciones y ficheros:
  - «Rutas de Salida» (dos veces en DESIGN.md) frente a «Rutas de salida»;
  - «Tarjeta de Cita (listados)» frente a «Tarjeta de Cita»;
  - «Acciones de la Página de Cita» frente a «Acción Copiar», «Acción Imagen» y «Acción Compartir la cita»;
  - «Resultado de búsqueda de tipo Obra» frente a «Resultado de búsqueda»;
  - «diálogo de Imagen» y «Diálogo» frente a «Diálogo de Imagen»;
  - «Nota de la ficha», ambigua porque hay dos fichas en superficies vecinas, la de Obra y la de Autor.

  *Arreglo:* un único nombre por componente, y «Nota de la Ficha de Obra».
- **low** Tres desajustes con el glosario y con las fuentes:
  - «hoja del sistema» va en minúsculas en todo el texto, y el glosario dice «Hoja del Sistema»;
  - UX-DR35 se cita tres veces, y es un identificador definido en `epics.md`, que está aguas abajo de estas espinas y fuera de sus fuentes;
  - «Curación» y «Lote» se usan como nombres de superficie y no están en el glosario.

  (EXPERIENCE.md:108, :112, :153.) *Arreglo:* respetar la mayúscula del glosario y citar FR-33 y AD-20 en lugar de UX-DR35.

## 8. Ajuste de forma — sólido

**Qué se comprobó.** DESIGN.md sigue el orden canónico, de Brand & Style a Do's and Don'ts. EXPERIENCE.md tiene todas las secciones obligatorias. Las dos secciones inventadas se ganan el sitio: «Tipografía adaptativa» resuelve la pregunta que FR-10 delegó en UX, y «Obra traducida» reúne cinco reglas que atraviesan cinco componentes.

### Hallazgos
- **low** La clave `components` del frontmatter guarda cuatro dimensiones sueltas (`rule-width`, las dos medidas y `tap-target-min`). La especificación de DESIGN.md la reserva para objetos de componente, así que un resolvedor leería `rule-width` como un componente. Al frontmatter le falta además `description` (DESIGN.md:109-113). *Arreglo:* mover esas dimensiones a `spacing` o a un grupo propio, y añadir `description`.
- **low** «Obra traducida» termina con «Aviso, no regla», que es una nota para el PM sobre el modelo de datos y ya está en la bitácora (.memlog.md:55) (EXPERIENCE.md:130). *Arreglo:* dejarlo en una línea: «Abierto en datos: ver FR-48».

## Notas mecánicas

- `{ruta.al.token}` (EXPERIENCE.md:14) es el ejemplo de la sintaxis, no una referencia. Todas las demás resuelven.
- DESIGN.md usa `headline-sm` y `quote-*` sin llaves (DESIGN.md:147, :185, :191). Las demás referencias van en la forma `{typography.…}`.
- «Sin obra documentada» lleva punto final en la tabla de Voice and Tone (EXPERIENCE.md:50) y va sin él en Atribución y en State Patterns (:86, :137). Conviene unificarlo con lo que emite `Atribucion.astro`.
- En § Responsive, de 600 a 1024 px, dice «medida limitada a `{components.quote-max-measure}`» para toda la columna (EXPERIENCE.md:236). DESIGN.md reserva 34ch para la Cita y 68ch para la prosa, y el código usa una columna de 45rem.
- El formato base de lo copiado (FR-3), sin traductor, no está escrito en ningún sitio. Solo se deduce del ejemplo de § Obra traducida. La fila de la Acción Copiar debería decir que usa el título de la Ficha de Obra (FR-53).
- Accessibility Floor dice «navegación al final» del orden de tabulación de la Página de Cita, y la cabecera (marca y «Buscar») va antes del contenido (EXPERIENCE.md:175). Lo dejo a la lente de accesibilidad.
- Divergencias conocidas solo entre la espina y el código (.memlog.md:79), con la gravedad que les doy:

  | Divergencia | Gravedad | Por qué |
  |---|---|---|
  | 4 px entre los números de página frente a los 8 px de las zonas de toque | medium | rompe una regla del suelo |
  | banda siena decorativa en las Tarjetas Sociales | medium | la heredaría la Tarjeta Social de Obra; ver §3 |
  | `aria-label` del diálogo que dice «Descargar» también al compartir | medium | toca a la accesibilidad |
  | progreso de la imagen sin construir | medium | ver §4 |
  | serif rasterizada en Georgia frente a «dos familias, sin excepciones» | low | — |
