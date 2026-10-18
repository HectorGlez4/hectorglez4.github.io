---
title: Sabiduría de Bolsillo
status: final
created: 2026-08-10
updated: 2026-10-18
---

# PRD: Sabiduría de Bolsillo

## 0. Propósito del Documento

Este PRD define **qué** debe hacer Sabiduría de Bolsillo, no **cómo** se construye. Sus lectores son los flujos aguas abajo del método BMad —UX, Arquitectura, y la generación de épicas e historias— además de Héctor como responsable de producto. Se estructura con vocabulario anclado en un glosario (§3), features agrupadas con requisitos funcionales anidados y numerados globalmente (FR-1…FR-N), y supuestos etiquetados en línea e indexados en §15.

**Estado del producto (2026-10-17).** Están construidas las rondas v1 a v7.1, épicas 1 a 22: el producto (v1); la compartición, el canal propio y el sembrado (v2); las Colecciones, la ampliación del canal, los cuatro Modelos de Ingreso, diseñados y apagados, y un Corpus con volumen defendible, con la Fuente recuperada (v3); la Meta de Corpus (v4); la indexación leída por familia, la Página de Autor con semblanza y obra, y las señales para que el buscador rastree (v5); los clásicos (v6); las series de medición, el registro del canal propio y la Cita del Día en rondas por Autor (v7), y la Página de Obra (v7.1). En el tablero, varias historias siguen en revisión. El sitio está en línea desde el 2026-08-13; el mes 0 de §13 es el 2026-09-02, la jornada en que quedaron verificadas LC-1…LC-4. Lo que esas épicas dejan abierto no es construcción: son actos de Héctor —la credencial de Search Console, la lectura de Bing, el tachado de las Citas aptas para portada, las semblanzas con fuente, cuatro semanas de publicaciones anotadas en el canal propio, el listón de la siembra de clásicos—, una señal que solo puede poner un tercero —el primer enlace ajeno hacia el sitio— o puertas que la serie de indexación aún no abre (FR-39, FR-50). *(v8 — antes decía «El sitio está publicado desde el 2026-09-02», que es el mes 0 y no el primer día en línea.)*

**El sitio en vivo no es el árbol.** Desde el 2026-10-11 la construcción que publica el sitio falla en sus pruebas y no despliega, así que el sitio en vivo sigue con el Corpus de ese día: 1.894 Citas de 65 Autores y 180 Obras, 81 de ellas indexables. Sigue también con la Cita del Día y el Kit Diario de esa jornada: la portada enseña la misma Cita desde entonces, y en vivo FR-9 y UJ-5 no se cumplen. El repositorio tiene, el 2026-10-17, 4.420 Citas de 135 Autores —de 171 fichas de Autor—, 517 Obras con Citas, 277 de ellas indexables, 24 Temas y 16 Colecciones. Mientras la publicación siga rota, toda cifra del Corpus tiene que decir si es del sitio o del árbol, y lo sembrado después del 2026-10-11 no lo ha visto ningún buscador. Arreglarla es un trabajo aparte, y es condición de que la v8 llegue a alguien (§6.7).

Este documento incorpora la **v8, la Cita como centro**. La v1 construyó el producto, la v2 lo puso delante de personas y las rondas siguientes lo ensancharon y lo hicieron encontrable; la v8 se ocupa de lo que pasa cuando alguien llega. Su propósito es que quien aterriza en una Cita se quede y traiga al siguiente, y poder medir por primera vez si ocurre. Hoy no se puede: la vista se registra al cargar la página y no distingue a una persona de una máquina, lo humano y orgánico ronda una vista al día, y en seis semanas casi nadie copió ni compartió (§4.9). Por eso medir la lectura aparte de la carga va primero (§4.21), y lo demás no espera a su línea base para construirse: la Página de Cita enseña de qué Obra sale la Cita y ofrece la siguiente (FR-12); se comparte donde se publica, con los destinos a la vista y una imagen para historias (§4.9); los Autores y las Obras tienen su Directorio (§4.20) y la búsqueda, filtros (FR-7); y la portada mejora como superficie de retorno sin pasar a ser puerta de entrada (FR-9). La Obra gana protagonismo como navegación, y la venta sigue apagada: encenderla espera, como poco, al juicio de SM-11 (§6.7). La v8 absorbe además la parte de la pasada de métricas que se mide en el propio sitio: lo que hace el visitante se cuenta sobre lecturas, con las metas numéricas en suspenso hasta tener línea base; la parte que se cuenta en sesiones —SM-2, SM-9 y los Umbrales de Activación—, con las series de Search Console, sigue pendiente (§7, §6.7).

**Renombrado de marca** *(v2)*. El producto pasa a llamarse **Sabiduría de Bolsillo**, no «Sabiduría Diaria». La razón no es estética: el tráfico de arranque no viene del buscador —el Corpus es demasiado pequeño todavía— sino de las cuentas sociales que ya existen con ese nombre, y un visitante que pulsa en «Sabiduría de Bolsillo» y aterriza en un sitio llamado de otra forma pierde el reconocimiento en el punto más frágil del embudo. El cambio se ejecuta **antes de que exista una sola URL indexada**: después costaría redirecciones, posiciones y una marca de agua circulando por Instagram que apunta a un nombre retirado.

Se apoya en el **Brief de Producto** (`_bmad-output/planning-artifacts/briefs/brief-brainlySabiduria-2026-08-10/brief.md`, `status: final`) y su addendum, que contienen el razonamiento de las decisiones de alcance, la comparativa de vías de origen del corpus y la verificación de dominio. Este documento no los duplica: los da por firmes.

Las decisiones visuales y de comportamiento viven en el documento de UX (`_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/`: `DESIGN.md` y `EXPERIENCE.md`), que se deriva de este PRD y se pone al día en cada ronda. Los identificadores de recorrido (UJ-N) los define este documento —también el UJ-6 de la v8— y UX los reutiliza sin renumerarlos. *(v8 — antes decía «No existe todavía documento de UX».)*

## 1. Visión

Sabiduría de Bolsillo es un sitio web panhispánico donde **cada cita célebre es una página propia**, encontrable desde un buscador y respaldada por la procedencia de lo que afirma. Replica un modelo de producto ya probado —una red densa de páginas pequeñas y muy específicas que capturan búsquedas de cola larga— y lo trae al español, donde ese espacio está atendido por sitios con diseños de otra década y atribuciones sin verificar.

El producto resuelve tres fallos simultáneos del estado actual: no encuentras la frase concreta que buscas, no puedes fiarte de que sea de quien dicen, y no puedes usarla sin fricción una vez la encuentras. La v1 ataca los tres con paridad funcional completa respecto al modelo de referencia, sobre un catálogo deliberadamente pequeño de citas en dominio público.

El motor de crecimiento no es una campaña: es la propia estructura del sitio. Cada cita publicada es una página indexable que responde a una consulta específica. Por eso el SEO no es una tarea de acabado en este producto — es una preocupación transversal de primer orden, tratada en §8.

## 2. Usuario Objetivo

### 2.1 Trabajos por Hacer (JTBD)

- **Funcional:** encontrar rápido una frase concreta para un uso concreto — una presentación, una dedicatoria, el cierre de un discurso, un pie de foto.
- **Funcional:** comprobar si una frase es realmente de quien se le atribuye, antes de repetirla en público.
- **Social:** publicar algo que exprese lo que uno piensa, con la autoridad prestada de quien lo dijo primero.
- **Emocional:** evitar el ridículo de citar mal en público.
- **Contextual:** hacerlo desde el móvil, con prisa, y muchas veces de noche.

### 2.2 No-Usuarios (v1)

- **El coleccionista.** Quien quiere guardar, organizar y volver a sus citas favoritas. No hay cuentas ni favoritos en la v1, ni tampoco en la v8, que retiene con lo que el sitio compone para todos —la siguiente Cita, la Cita del Día— y nunca con lo que guarda cada visitante. *(v8 — antes «en la v1».)*
- **El contribuidor.** Quien quiere aportar citas al catálogo. La curación es interna (§4.8). *(v8)* Que el visitante sea parte del crecimiento se lee como difusión —compartir lo que ya hay—, no como aporte: la v8 no reabre los aportes de usuarios (§6.2).
- **El lector no hispanohablante.** El producto es monolingüe por decisión, no por limitación.

### 2.3 Recorridos de Usuario Clave

- **UJ-1. Lucía necesita una frase para cerrar su presentación, y la necesita ahora.**
  Lucía, consultora, prepara a las 23:40 la presentación de mañana. Busca en Google "frases sobre el esfuerzo y la constancia" y aterriza directamente en una **Página de Cita** de Sabiduría de Bolsillo, sin pasar por la portada. Lee la cita en pantalla completa, ve el nombre del autor y, debajo, la obra de la que procede. Desliza una vez —en el móvil, Copiar queda justo por debajo de la primera pantalla, después de la Tarjeta de Obra— y pulsa copiar. El texto y la atribución van juntos al portapapeles. Cierra el móvil. **Clímax:** la cita está en su presentación en menos de treinta segundos desde el clic en Google, con la atribución correcta pegada sin que ella tuviera que teclearla. La Tarjeta de Obra no le cuesta ese clímax: es un desplazamiento, no una decisión, y SM-C5 vigila que siga siéndolo. **Caso límite:** si la cita no procede de ninguna obra, la página muestra el autor y el estado de la procedencia sin inventar una fuente, y no hay Tarjeta de Obra entre la cita y Copiar. *(v8: la Tarjeta de Obra)*

- **UJ-2. Diego quiere publicar algo hoy y que se vea bien.** *(reescrito en la v8)*
  Diego, 24 años, busca material para su historia de Instagram. Llega a una Página de Cita desde una búsqueda por tema. Le gusta la frase pero no va a copiar texto plano. Bajo la cita, entre los destinos de compartir que ya están a la vista, pulsa «Historia de Instagram». No elige diseño: la imagen para historias tiene uno solo, vertical, con el formato de una historia. En ese mismo toque —o en el segundo, si UX lo pide en dos—, la Imagen de Cita le llega ya adjunta a la Hoja del Sistema de su móvil, y el sitio le avisa de que ha copiado el enlace a la cita. Elige Instagram, la publica como historia y pega el enlace en el sticker Enlace. **Clímax:** ha publicado sin salir del navegador, sin abrir la galería, sin buscar dónde ha caído el fichero y sin teclear una dirección. **Resolución:** al siguiente visitante lo trae el sticker, y como el enlace copiado lleva la marca de difusión, su llegada se cuenta (SM-12); si Diego no puso el sticker, lo trae el dominio que la imagen lleva legible al pie, y esa llegada no se distingue de una directa. **Caso límite:** donde el navegador no puede compartir el fichero —el de la aplicación de Facebook en Android— y en el escritorio, donde no se publican historias, el botón no aparece y quedan WhatsApp, Facebook, Threads y «Más opciones…», sin aviso de incompatibilidad; si el navegador rechaza la entrega en el último momento, la imagen se descarga, el enlace queda copiado y el sitio lo dice (FR-17). *(v8 — antes Diego elegía entre unos pocos diseños, la hoja recibía la imagen cuadrada y en el escritorio la misma acción descargaba el fichero.)*

- **UJ-3. Marisol llegó por una frase y se quedó una hora.**
  Marisol, profesora de literatura, busca una cita concreta de un autor clásico. Bajo la cita, la **Tarjeta de Obra** le dice de qué libro sale y cuántas citas de él hay en el catálogo; pulsa «Siguiente cita de esta obra», lee la que viene después en ese libro y, desde ella, otra de las que ofrece «De la misma obra» *(v8)*. Desde la tarjeta pasa a la **Página de Obra** y lee juntas las demás citas de ese libro *(v7.1)*; de ahí pulsa el nombre del autor y aterriza en la **Página de Autor**: una semblanza breve y el resto de citas de esa persona en el catálogo. Desde ahí salta a un **Tema** que le interesa y descubre a un autor latinoamericano que no conocía. **Clímax:** seis páginas después sigue leyendo, y ninguna la ha devuelto al buscador. **Resolución:** vuelve por su cuenta días después, directamente al dominio (UJ-6). **Caso límite:** si la cita no procede de ninguna obra, no hay tarjeta ni siguiente, y Marisol sigue por el nombre del autor; si la obra solo tiene esa cita, «Siguiente» la lleva a la siguiente de su Tema. *(v8)*

- **UJ-4. Héctor incorpora cincuenta citas nuevas sin romper la promesa del sitio.**
  Héctor, único editor, tiene un lote de citas de un autor recién entrado en dominio público. El lote entra por la herramienta interna — lo lanza él o un agente por él; la puerta es la misma. El sistema rechaza las que no traen **Procedencia** y las que pertenecen a un **Autor** sin año de fallecimiento registrado, dejándolas en estado de revisión en lugar de publicarlas. Él completa lo que falta y publica el resto. **Clímax:** el catálogo crece sin que baje el porcentaje de citas verificadas. **Caso límite:** si una cita duplica una ya publicada, el sistema lo señala antes de aceptarla.

- **UJ-5. Héctor publica la Cita del Día en sus cuentas antes de desayunar.**
  Héctor, además de editor, lleva las cuentas de Sabiduría de Bolsillo en Instagram, TikTok, X, Threads y Facebook. Son la única fuente real de visitantes mientras el Corpus sea pequeño. A las siete de la mañana abre el móvil y entra en una URL del propio sitio que el sistema ha dejado compuesta esa madrugada: la Imagen de la Cita del Día ya generada en sus dos formatos —el cuadrado para publicar y el vertical para las historias *(v8)*—, el pie con la atribución escrito, y el enlace a la Página de Cita con la marca de origen de cada cuenta. Descarga desde el Kit la imagen que pide cada red y la publica con su pie y su enlace. **Clímax:** publicar en sus cinco cuentas le cuesta dos minutos y cero decisiones, así que lo hace todos los días en lugar de tres veces por semana. **Resolución:** los enlaces distinguen de qué red viene cada visita, así que al cabo de un mes sabe cuál de las cinco merece su tiempo. **Caso límite:** si la Cita del Día supera los 300 caracteres y no admite Imagen, el kit lo dice y ofrece una Cita alternativa apta, en vez de dejarle sin material. *(v8 — antes la compartía «desde la misma hoja del sistema que usa cualquier visitante», cuando el Kit la descarga, y decía «cuatro redes» enumerando cinco cuentas.)*

- **UJ-6. Valeria vuelve por la Cita del Día.** *(v8)*
  Valeria, 34 años, maestra de primaria en Guadalajara, conoció el sitio cuando una compañera le mandó una cita por WhatsApp: entró por ese enlace, y su llegada contó como difusión (SM-12). Una semana después escribe la dirección en el navegador del móvil antes de entrar a clase y llega a la **portada**. Lee la Cita del Día, mira en su **Tarjeta de Obra** de qué libro sale y la comparte en el grupo de WhatsApp de las maestras, con el enlace de su Página de Cita. Luego quiere algo de José Martí para el homenaje del viernes: pulsa «Autores» en la cabecera, salta a la «M» del **Directorio de Autores**, teclea «mar» y entra en su página; desde ahí usa «Buscar en José Martí» con «escuela» y, en la búsqueda, filtra por su obra *Maestros ambulantes*. **Clímax:** en dos minutos ha compartido la cita de hoy y tiene la de Martí para el viernes, sin pasar por el buscador. **Resolución:** al día siguiente vuelve por la nueva Cita del Día; el sitio no sabe que es ella, y no le hace falta. **Caso límite:** si el Autor que busca no está en el Corpus, el filtro del Directorio lo dice con su recuento a cero, y la búsqueda sin resultados le ofrece los Autores destacados (FR-8). Realiza FR-3, FR-7, FR-9, FR-18 y FR-55.

## 3. Glosario

Los flujos aguas abajo deben usar estos términos exactamente. Introducir un sinónimo en cualquier parte del documento es una violación de disciplina.

- **Cita** — Unidad atómica de contenido: un texto textual atribuido a un Autor. Tiene exactamente un Autor, cero o más Temas, una Procedencia y un Estado de Derechos. Las demás páginas del sitio la agregan, y su canónica es siempre su Página de Cita (NFR-13). *(v7.1 — antes decía «la única entidad con página propia indexable individualmente».)*
- **Autor** — Persona a quien se atribuyen una o más Citas. Registra nombre, semblanza, nacionalidad y año de fallecimiento. El año de fallecimiento es obligatorio: sin él, ninguna Cita del Autor puede publicarse. *(v8)* Registra también su **clave de orden**: por dónde se le ordena alfabéticamente —su apellido, o el nombre por el que se le conoce cuando no se ordena por apellido—, y es la que ordena el Directorio de Autores. Es obligatoria para publicarlo y nunca se escribe a mano en la ficha: la propone el sistema al darlo de alta, se corrige con una orden que la valida antes de escribirla, y que una persona no la haya revisado todavía no impide publicar.
- **Semblanza** *(v5)* — Texto que sitúa al Autor en su Página de Autor. Hasta la v5 se definía por su brevedad; ahora por su contenido y su fuente (FR-4 y FR-41).
- **Obra** *(v5; redefinida en la v7.1)* — Una obra de un Autor de la que procede al menos una Cita publicada. Su identidad es la del Autor junto con el título que declaran las Procedencias de sus Citas, sin distinguir mayúsculas, tildes ni signos: el ámbito es el Autor, y dos Autores pueden tener cada uno sus «Odas». No se da de alta: se **deriva** del Corpus, y por eso la bibliografía de un Autor es la de sus Citas publicadas y no la de su vida. Distinta de la Procedencia, que es el campo de una Cita: la Obra **agrupa** las Citas cuyas Procedencias la nombran, en cualquiera de las grafías de la misma obra que reúne su Ficha de Obra. Hasta la v7.1 no tenía página; ahora tiene Página de Obra (§4.19).
- **Ficha de Obra** *(v7.1)* — Registro versionado de una Obra que fija lo que de ella no se puede derivar: su URL, que no cambia aunque cambie el título; el título con que el sitio la nombra en todas partes, que es siempre una de las grafías que declaran sus Procedencias; y qué grafías de la Procedencia reúne. La crea el sistema cuando llega una Obra nueva, sin decidir nada. Lo que en ella se decide lo decide una persona: qué grafía es el título, reunir o separar grafías de una misma obra, las **ediciones en venta** de la obra —impresas o electrónicas, y nunca en lugar de la edición cotejada de su Fuente— y una **nota** de hasta 160 caracteres que describe la obra o su edición cotejada sin calificarla. No es la «ficha» de la Página de Autor de FR-4, que es la cabecera de esa página, ni la Tarjeta de Obra *(v8)*, que es lo que la Página de Cita muestra de su Obra.
- **Tema** — Etiqueta transversal que agrupa Citas de distintos Autores (por ejemplo, el amor, el tiempo, el esfuerzo). Una Cita puede pertenecer a varios Temas.
- **Época** *(v6; en el glosario desde la v8)* — Agrupación de Autores que comparten tiempo y escuela —filosofía antigua, patrística, escolástica, y las que el catálogo pida— (FR-50). Agrupa Autores, no Citas, y un Autor pertenece a lo sumo a una. No tiene página todavía: FR-50 la condiciona a que la serie de indexación muestre una familia por encima del 20 %, y el Directorio de Autores no la adelanta.
- **Procedencia** — Origen documentado de una Cita: obra, año o referencia, tal como lo declara su Fuente. Distinta de la atribución, que dice quién dijo la Cita; la Procedencia dice de dónde sale. Una Cita puede tener Procedencia completa, parcial o ausente. *(v7.1)* La obra de una Procedencia no se reescribe para publicarla: el sitio la nombra con el título de su Obra, que fija su Ficha de Obra.
- **Estado de Derechos** — Campo de la Cita que registra bajo qué criterio es publicable. En la v1 solo se publica el valor `dominio-público`. El campo existe para admitir otros criterios sin rehacer la ingesta.
- **Estado de Publicación** — Campo de la Cita: `publicada` (visible e indexable) o `en-revisión` (no visible, no indexable).
- **Corpus** — Conjunto de todas las Citas del sistema, publicadas o en revisión.
- **Cita del Día** — La Cita destacada en la portada durante una jornada. Se selecciona del Corpus publicado. *(v8)* La portada la presenta con su Tarjeta de Obra y con las mismas acciones que su Página de Cita —copiar, Imagen y compartir—, y lo que se comparte desde ahí enlaza a la canónica de esa Página, nunca a la portada.
- **Imagen de Cita** — Representación gráfica de una Cita, generada por el sistema, que el visitante comparte o descarga. Tiene dos formatos: el cuadrado, con unos pocos diseños a elegir (FR-11), y el vertical para historias, con uno solo; los dos llevan legible el dominio del sitio (FR-10). *(v8 — antes «descargable», con un solo formato.)*
- **Página de Cita / de Autor / de Tema / de Colección / de Obra** — La página propia de cada entidad del mismo nombre *(la de Colección desde la v3, la de Obra desde la v7.1)*. Toda página publicada es rastreable, pero no toda es indexable: las páginas 2 y siguientes de un listado (FR-5) y la Página de Obra que no cumple la regla de FR-52 existen sin indexarse. Los Directorios *(v8)* no son la página de ninguna entidad, sino de todas las entidades de un tipo: todos los Autores o todas las Obras.
- **Directorio** *(v8)* — Página que lista todas las entidades publicadas de un tipo, cada una con su recuento de Citas y enlazada a su página (FR-55): el **Directorio de Autores**, de la A a la Z por la clave de orden de cada Autor, y el **Directorio de Obras**, agrupadas por Autor en ese mismo orden, que enlaza también a las Obras que no se indexan (FR-52). Lista entidades, nunca Citas: no es superficie de lectura ni compite con ninguna Página de Cita (NFR-13). Es indexable y, como la Página de Autor, no admite ningún Modelo de Ingreso.
- **Superficie de lectura** *(v7.1)* — La Página de Cita, la de Colección y la de Obra: las páginas donde el visitante lee Citas. Ninguna admite donaciones ni publicidad; la de Obra es la única que admite la afiliación. *(v8)* Ni la portada ni los Directorios lo son: la portada presenta la Cita del Día con sus acciones y sigue admitiendo donaciones y publicidad, nunca intercaladas con ella (FR-34, FR-37); un Directorio lista Autores y Obras, no Citas. No confundir con la lectura, que es un acto medido y ocurre en cualquier superficie.
- **Tarjeta Social** — Representación de una página del sitio que muestran las redes cuando alguien pega su enlace. La compone el sistema; no es la Imagen de Cita, aunque se le parezca. La tiene toda página del sitemap —desde la v8, también los Directorios— y toda Página de Obra, se indexe o no. La de una Página de Cita existe para toda Cita publicada, incluidas las que no admiten Imagen de Cita (FR-19). La de una Obra solo lleva hechos, nunca la nota de su Ficha de Obra (FR-51). Donde un destino recibe solo el enlace, sin texto propuesto (FR-18), la Tarjeta Social es lo único que dice qué se compartió. *(v8 — antes se definía solo para la Página de Cita y, desde la v7.1, para la de Obra.)*
- **Tarjeta de Obra** *(v8)* — Lo que una Página de Cita dice de la Obra de la que procede su Cita, bajo la atribución y la línea de su Fuente: el título de la Obra, su Autor, el año de la Obra cuando consta sin discrepancia (FR-42), cuántas Citas tiene, el enlace a la siguiente Cita —de esa Obra o, si no tiene otra, de su Tema— y el enlace a su Página de Obra (FR-12). La lleva toda Página de Cita cuya Cita procede de una Obra, y también la Cita del Día en la portada, y solo dice hechos derivados del Corpus (§5). No es la Ficha de Obra, que es el registro que fija su URL y su título, ni la Tarjeta Social de la Página de Obra.
- **Tarjeta de Cita** *(v8)* — La forma en que una Cita aparece dentro de un listado —de Autor, de Tema, de Colección y de Obra, y en las rutas de salida de la Página de Cita—: su texto y, donde el listado no los da por sabidos, su Autor y el título de su Obra, como texto y nunca como un segundo enlace, porque la tarjeta entera lleva a su Página de Cita. Es la misma en todos los listados.
- **Destino de Compartición** — Lo que el visitante elige en el sitio para enviar una Cita o, desde la v8, una Obra: el botón que pulsó, no la aplicación en la que acabó publicando, que el navegador no revela. Es **conocido** cuando pulsó un destino nombrado —WhatsApp, Facebook, Threads, Telegram, X, Correo o la Historia de Instagram, aunque esta pase por la Hoja del Sistema— y **opaco** cuando usó la Hoja del Sistema sin pulsar un destino nombrado: desde «Más opciones…» o al compartir la Imagen cuadrada (FR-17). Seis de los siete nombrados son de enlace y la Historia de Instagram es de imagen; los siete y opaco forman un conjunto cerrado, el mismo que da valor a la marca de difusión (FR-20). *(v8 — antes era la aplicación o red de destino, y opaco todo uso de la Hoja del Sistema.)*
- **Hoja del Sistema** — Selector de aplicaciones que ofrece el sistema operativo del visitante al compartir. Es el único camino hacia las redes que no admiten compartición desde la web, como las historias de Instagram. *(v8)* Existe donde el navegador la ofrece, también en algunos de escritorio, y falta en algunos móviles: el navegador de la aplicación de Facebook en Android no la tiene. Por eso WhatsApp, Facebook y Threads están siempre a la vista, también donde hay hoja (FR-18).
- **Marca de origen** *(v2; redefinida en la v8)* — La marca que lleva en su enlace lo que publican las cuentas propias del sitio (`?de=`), una por cuenta (FR-22). Solo la llevan las cuentas propias: lo que comparte un visitante nunca la lleva. Se cuenta una vez por llegada: tras leerla, la página la quita de su dirección (FR-56). No crea una URL indexable distinta de la canónica ni cambia lo que ve el visitante.
- **Marca de difusión** *(v8)* — La marca que lleva el enlace que el sitio compone para que un visitante lo comparta (`?via=`), con el Destino de Compartición por el que salió (FR-18, FR-20). Se coteja y se cuenta aparte de la marca de origen —una visita que traiga las dos cuenta en las dos—, y una llegada con ella se cuenta cuando produce una lectura, no cuando carga (SM-12). Como la de origen, se cuenta una vez por llegada y la dirección queda sin ella (FR-56), no crea una URL indexable y no cambia lo que ve el visitante.
- **Lectura** *(v8)* — Acto medido: una carga de página que estuvo visible un tiempo mínimo, o que antes de cumplirlo recibió una interacción del visitante. Se cuenta como mucho una por carga, en toda superficie que emite vista (FR-56). Separa a quien lee de lo que solo carga la página: se supone que las precargas y los rastreadores que la cierran al terminar de cargarla no llegan a producirla, y es el supuesto de §15. Es la unidad de las tasas de §7 que se miden en el sitio —su denominador y, en SM-12, su numerador—, en lugar de las visitas y las sesiones, porque contar sobre vistas sería contar máquinas; las de búsqueda (SM-6, SM-13) van sobre búsquedas asentadas, SM-8 sigue en vistas, y SM-2, SM-9 y los Umbrales de Activación, en sesiones (§7). No confundir con la **Superficie de lectura**, que es un tipo de página: hay lecturas de la portada y de los Directorios. «El flujo de lectura» de FR-37, «ninguna lectura» de FR-34 y «la lectura de esa superficie» de §4.14 conservan su sentido corriente. La lectura de una serie de Search Console (FR-40, SM-1, SM-11) es otra cosa, el acto de consultarla, y se nombra siempre con su serie o con su fecha.
- **Salida interna** *(v8)* — Pulsación de un enlace de una página del sitio hacia otra del sitio, cuando el enlace pertenece a una **zona**: el lugar de la página de donde sale —la Tarjeta de Obra, «Siguiente», las rutas de salida, una Tarjeta de Cita de un listado, un resultado de búsqueda, la cabecera…—, de un conjunto cerrado (FR-56). Un enlace que no pertenece a ninguna zona, o que se abre en pestaña nueva, no se registra.
- **Continuación** *(v8)* — Salidas internas entre lecturas, de una superficie o de una zona: cuánto sigue leyendo quien llega. Solo se calcula en las superficies que registran lectura. Mientras el sitio no tenga sesión, sustituye a las páginas por sesión (SM-4), y uno menos la continuación aproxima el rebote (SM-3). Es una cota inferior, porque no cuentan lo que se abre en pestaña nueva ni los enlaces que no pertenecen a ninguna zona, y por eso el rebote aproximado sale por encima del real.
- **Kit Diario** — Material de publicación que el sistema deja compuesto cada jornada para las cuentas propias: la Imagen de la Cita del Día en sus dos formatos *(v8)*, su pie con atribución y su enlace con la marca de origen de cada cuenta. Superficie interna, no indexable.
- **Fuente** — Origen documental del que se extrae una Cita candidata durante el sembrado: una obra concreta en una edición concreta. Distinta de la Procedencia, que es lo que la Cita publica; la Fuente es de dónde lo sacó el editor y bajo qué licencia. *(v7.1)* También se muestra al visitante: la Página de Obra dice de qué Fuente, y bajo qué licencia, se tomó su texto. Cuando hay documento contra el que cotejarlo, esa Fuente es la **edición cotejada**, que es distinta de las ediciones en venta de una Ficha de Obra.
- **Colección** *(v3)* — Agrupación editorial de Citas escogidas por un criterio que no es el Autor ni el Tema («frases cortas», «para dedicar», «para empezar el año»). Transversal a ambos: una Cita puede estar en varias Colecciones sin que cambie su Tema ni su Autor. Tiene página propia indexable y umbral mínimo de publicación, como el Tema. A diferencia del Tema, su criterio es editorial y su conjunto es abierto.
- **Pieza de Canal** *(v3)* — Unidad publicable en una cuenta propia. La v2 producía una sola por jornada (la Imagen de la Cita del Día, dentro del Kit Diario); la v3 admite además piezas de varias Citas y piezas en movimiento. Es material de salida, nunca una superficie indexable.
- **Modelo de Ingreso** *(v3)* — Una de las cuatro vías por las que el producto puede producir ingreso: donaciones, afiliación de libros, producto propio o publicidad. Cada uno tiene su Umbral de Activación.
- **Umbral de Activación** *(v3; precisado en la v7.1)* — Cifra de tráfico orgánico medido que autoriza el primer acto de un Modelo de Ingreso. En la mayoría ese acto es encenderlo; en la afiliación de libros es **solicitar** la cuenta de cada programa que imponga un plazo de ventas mínimas, porque solicitarla arranca ese plazo, y encender viene después (FR-35). Cruzarlo no enciende nada por sí solo. Se mide en el receptor de LC-4. *(v8)* Mientras un Umbral se exprese en sesiones, el receptor no puede medirlo sin identificar la visita (NFR-11): reanclarlo es de la pasada de métricas (§6.7), y hasta entonces no se enciende ningún Modelo cuyo Umbral esté en sesiones (FR-33). Por debajo del umbral, el Modelo está diseñado pero apagado.

## 4. Features

Veintiuna features repartidas en siete rondas de PRD. Desde la v2, la etiqueta de versión va también en cada encabezado:

- **v1 — §4.1…§4.8.** El producto: las cuatro superficies públicas, la búsqueda, la Imagen de Cita y la herramienta de curación.
- **v2 — §4.9…§4.11.** Ponerlo delante de personas: compartición, canal propio y sembrado del Corpus.
- **v3 — §4.12…§4.14.** Que crezca y se sostenga: Colecciones, ampliación del canal y monetización por umbral.
- **v5 — §4.15…§4.17.** Que lo encuentren: entrar en el índice, darle a la Página de Autor el contenido que su consulta pide, y **conseguir que el buscador gaste rastreo en el sitio** — esta última añadida el 2026-09-04, cuando la primera medición demostró que las otras dos atacaban la causa equivocada.
- **v6 — §4.18.** Que el catálogo deje de estar invertido respecto a la demanda: clásicos y teología, en profundidad por Autor, con la Época como eje nuevo.
- **v7.1 — §4.19.** Que la obra tenga página: una URL por obra que capta su consulta, deja leer juntas sus Citas y es el único sitio del enlace de afiliación.
- **v8 — §4.20…§4.21.** Que quien llega a una Cita se quede y traiga al siguiente, y saber si ocurre: los Directorios de Autores y de Obras, y la lectura medida aparte de la carga.

**No hay v4 en este documento, y no es un salto por error.** La v4 fue la Meta de Corpus —1.632 Citas, 24 Temas y 35 Autores al cerrarla el 2026-08-27— y no salió de aquí: salió de que el bucle de sembrado agotó el hueco del que derivaba trabajo (FR-25). Se numera igual que las demás para que el histórico no mienta.

**La v7 tampoco pasó por este documento.** Su primer ciclo —medir antes de mover, y que el canal propio lleve al sitio— se escribió directamente en épicas sobre FR existentes. Por eso esta ronda es la v7.1.

**La v8 es, sobre todo, enmiendas.** Solo dos de sus piezas son features nuevas, porque no tenían dónde vivir. Lo demás —la Tarjeta de Obra y la siguiente Cita, compartir con los destinos a la vista y la imagen para historias, los filtros de la búsqueda, la portada de retorno y las métricas sobre lecturas— cambia FR que ya existían, y se enmienda en su sitio con la marca *(v8)*, sin renumerar nada: FR-12 y FR-18 conservan su número y se marcan «reescrito en la v8». Qué enmiendas traen trabajo de construcción y cuáles no lo dice §6.7. Los rótulos que la v8 cita entre comillas —«Siguiente cita de esta obra», «Más opciones…», «Mostrar 30 más», «Buscar en esta obra»— son los del diseño aprobado: lo que el PRD fija es lo que cada uno promete, y el texto final lo fija UX en `EXPERIENCE.md` sin prometer más.

### 4.1 Página de Cita

**Descripción:** La superficie principal del producto y la unidad atómica de tráfico. Muestra una sola Cita con protagonismo tipográfico, su Autor, y su Procedencia cuando existe. Es la página a la que llega la mayoría del tráfico orgánico, casi siempre desde un buscador y casi siempre en móvil, por lo que debe resolver la intención completa sin exigir navegación adicional. Realiza UJ-1.

**Requisitos Funcionales:**

#### FR-1: Visualización de una Cita

Cualquier visitante puede ver una Cita individual en su propia URL permanente. Realiza UJ-1.

**Consecuencias (verificables):**
- Cada Cita publicada tiene una URL única, estable y legible que incluye un identificador derivado del texto y del Autor.
- La URL de una Cita no cambia si la Cita se reasigna de Tema.
- Una Cita en estado `en-revisión` devuelve 404 y no aparece en el sitemap.
- El texto de la Cita es el primer elemento de contenido visible sin desplazamiento en un viewport móvil de 360 × 640 px.

#### FR-2: Atribución y procedencia visibles

El visitante puede ver quién dijo la Cita y de dónde procede, sin abandonar la Página de Cita.

**Consecuencias (verificables):**
- Se muestra el nombre del Autor, enlazado a su Página de Autor.
- Cuando la Cita procede de una Obra, se muestra el título de esa Obra —el que fija su Ficha de Obra—, enlazado a su Página de Obra, y el año que declare su Procedencia. *(v7.1 — antes la obra se mostraba con el literal de la Procedencia y sin enlace.)*
- Cuando la Procedencia no nombra obra, se muestra lo que declare —año o referencia—, sin enlace. *(v7.1)*
- Cuando la Procedencia está ausente, la página lo indica explícitamente en lugar de omitir el bloque en silencio.
- El sistema nunca muestra una Procedencia inferida o aproximada. El título de la Obra no es una inferencia: es una de las grafías que declaran sus Procedencias, elegida por una persona en la Ficha de Obra, y la Procedencia de cada Cita conserva su literal.

#### FR-3: Copiado con atribución

El visitante puede copiar la Cita al portapapeles en una sola acción, y lo copiado incluye la atribución. Realiza UJ-1.

**Consecuencias (verificables):**
- Una sola pulsación copia texto y atribución juntos.
- El sistema confirma visualmente que el copiado ocurrió.
- El formato copiado es texto plano legible, sin marcado.
- La acción está también sobre la Cita del Día de la portada (FR-9, UJ-6), y lo que copia es idéntico, carácter por carácter, a lo que se copia en su Página de Cita. *(v8)*

**Fuera de alcance:** elección de formato de citación académica (APA, MLA). `[NON-GOAL for MVP]`

---

### 4.2 Página de Autor

**Descripción:** Agrega todas las Citas publicadas de un Autor y aporta el contexto mínimo para situar a la persona. Es la segunda fuente de tráfico orgánico y el principal motor de sesión larga. Realiza UJ-3.

**Requisitos Funcionales:**

#### FR-4: Ficha y listado de Autor

Cualquier visitante puede ver, en una URL propia, la semblanza de un Autor y todas sus Citas publicadas. Realiza UJ-3.

**Consecuencias (verificables):**
- La página lista todas las Citas del Autor en estado `publicada`, y ninguna en `en-revisión`.
- La semblanza sitúa al Autor: **cuándo vivió, en qué corriente escribió y por qué se le cita.** *(v5 — antes decía «no supera un párrafo breve». El límite era de longitud y no de contenido, así que una semblanza podía cumplirlo sin situar a nadie. Lo que la acota ahora es §4.16.)*
- Un Autor sin Citas publicadas no tiene Página de Autor accesible ni indexable.
- Cada Cita del listado enlaza a su Página de Cita.
- La Tarjeta de Cita del listado lleva, como texto y nunca como un segundo enlace, el título de la Obra de la que procede la Cita —el que fija su Ficha de Obra (FR-53)—, cuando procede de una: toda la tarjeta ya lleva a la Página de Cita. No lleva el nombre del Autor, que es el de la página. *(v8)*
- La página 1 ofrece buscar entre las Citas del Autor («Buscar en {Autor}»), que lleva a la búsqueda con el Autor ya puesto como filtro (FR-7). No añade JavaScript a la página ni crea ninguna página indexable. Las páginas 2 y siguientes no lo ofrecen. *(v8)*

#### FR-5: Paginación del listado de Autor

El visitante puede recorrer el catálogo completo de un Autor prolífico sin degradación de la página.

**Consecuencias (verificables):**
- Los listados de **más de 50 Citas** se paginan; por debajo de ese número la página es única.
- Las páginas 2 y siguientes son rastreables pero no indexables (`noindex, follow`): transmiten enlace hacia las Páginas de Cita sin competir por consultas ni consumir presupuesto de rastreo.
- Con el Corpus de arranque previsto, la paginación es un caso excepcional: se implementa como salvaguarda, no como superficie principal.

---

### 4.3 Página de Tema

**Descripción:** Agrupa Citas de distintos Autores bajo una etiqueta transversal. Captura la intención de búsqueda amplia ("frases sobre el amor"), que es la más competida pero también la de mayor volumen. Realiza UJ-3.

**Requisitos Funcionales:**

#### FR-6: Listado por Tema

Cualquier visitante puede ver, en una URL propia, las Citas publicadas asociadas a un Tema. Realiza UJ-3.

**Consecuencias (verificables):**
- La página lista Citas de múltiples Autores.
- Un Tema con **menos de 15 Citas publicadas** no se publica ni se indexa. Si cae por debajo del umbral, pasa a no publicado y sus Citas conservan sus demás Temas.
- El conjunto de Temas es cerrado y gestionado internamente; no se generan Temas automáticamente.
- La Tarjeta de Cita del listado lleva el nombre del Autor y, como texto y nunca como un segundo enlace, el título de la Obra de la que procede la Cita —el que fija su Ficha de Obra (FR-53)—, cuando procede de una. *(v8)*
- La página 1 ofrece buscar entre las Citas del Tema («Buscar en este Tema»), con las mismas condiciones que la de Autor (FR-4). *(v8)*

---

### 4.4 Búsqueda

**Descripción:** La vía de entrada para quien ya está en el sitio y para quien llega sin una consulta de buscador. Debe tolerar cómo se escribe realmente en español: sin acentos, con errores, y a menudo recordando solo un fragmento de la frase. Desde la v8 es también la forma de recorrer el Corpus por Autor, por Obra y por Tema sin escribir nada: filtrar es buscar con el campo vacío. Realiza UJ-6. *(v8)*

**Filtrar no crea páginas, y esa es la condición.** La vía barata de multiplicar superficie sería dar una URL indexable a cada cruce de Autor, Obra y Tema: miles de listados que repiten Citas que ya tienen su página, que es justo lo que NFR-13 prohíbe. La búsqueda filtrada vive en una sola superficie, que no se indexa con filtros ni sin ellos. Que su estado viaje en la dirección sirve para compartir una búsqueda y para volver atrás, no para que la encuentre un buscador.

**Requisitos Funcionales:**

#### FR-7: Búsqueda por texto y por filtros

Cualquier visitante puede buscar Citas por fragmento de texto, por nombre de Autor o por Tema desde cualquier página del sitio, y acotar lo que encuentra por Autor, por Obra y por Tema, con texto o sin él. Realiza UJ-6. Valida SM-6 y SM-13. *(v8 — antes el encabezado decía «Búsqueda por texto» y no había filtros.)*

**Consecuencias (verificables):**
- La búsqueda devuelve resultados equivalentes con y sin acentos ("Machado" y "machado", "corazon" y "corazón").
- La búsqueda es insensible a mayúsculas y minúsculas.
- Un fragmento de tres o más palabras consecutivas de una Cita publicada la devuelve entre los resultados.
- Los resultados distinguen visualmente si la coincidencia es de Cita, de Autor, de Obra, de Tema, de Colección o de un Directorio. De Obra solo entran las indexables (FR-52), y un Directorio sale por su propio nombre, nunca por cada Autor u Obra que lista (FR-55). *(v7.1: la Obra. v8 — antes no nombraba la Colección, que ya era tipo de resultado, y los Directorios no existían.)*
- Cada resultado de Cita lleva el nombre de su Autor. *(v8)*
- Se puede acotar por tres filtros: **Autor**, **Obra** y **Tema**. El de Obra depende del Autor: aparece al elegir uno y ofrece solo sus Obras, cada una con cuántas Citas tiene. *(v8)*
- Basta un filtro para buscar: elegir un Autor, una Obra o un Tema sin escribir nada devuelve sus Citas. *(v8)*
- Con un filtro puesto, los resultados son solo Citas, y la página lo dice; los resultados de Autor, Obra, Tema, Colección y Directorio solo salen en la búsqueda sin filtros. *(v8)*
- Los valores de cada filtro salen del Corpus publicado: ninguno ofrece un Autor, una Obra o un Tema sin Citas publicadas, ni un Tema que no se publica (FR-6), ni falta un Autor, una Obra o un Tema publicado que las tenga. La Obra se nombra con el título de su Ficha de Obra (FR-53), y dos Obras de Autores distintos con el mismo título no se mezclan. *(v8)*
- El filtro de Obra ofrece **toda** Obra con Citas publicadas, también la que no se indexa (FR-52). *(v8)*
- El texto y los filtros viven en la dirección de la página: una búsqueda se comparte copiando su dirección, y «atrás» devuelve la búsqueda anterior. *(v8)*
- Los resultados llegan en tandas de 30, y la siguiente se pide con una acción explícita, «Mostrar 30 más», nunca con desplazamiento infinito. El recuento dice cuántos resultados hay, no cuántos se ven, y se anuncia también a quien usa lector de pantalla (NFR-9). *(v8)*
- Desde la página 1 de una Obra, de un Autor y de un Tema se puede buscar entre sus Citas —«Buscar en esta obra», «Buscar en {Autor}», «Buscar en este Tema»—, y eso lleva a esta búsqueda con ese filtro ya puesto. La entrada no añade JavaScript a la página que la ofrece. *(v8)*
- Pulsar un resultado se mide como salida interna de la búsqueda (FR-56): es lo que dice si se encontró lo buscado (SM-13). *(v8)*
- Ninguna combinación de texto y filtros produce una página indexable, y los cruces de Tema con Autor o de Obra con Tema no tienen página propia (NFR-13). *(v8)*
- Sin JavaScript, la búsqueda dice en su HTML inicial que buscar y filtrar lo necesitan, y lleva a los Directorios de Autores y de Obras (FR-55), que se leen enteros sin él. Quien llegó desde «Buscar en…» vuelve con «atrás» a la página que ya lista esas Citas. *(v8)*

**Fuera de alcance:** el autocompletado del campo de búsqueda. `[NON-GOAL]`

#### FR-8: Resultado vacío productivo

Cuando una búsqueda no devuelve resultados, el visitante recibe una salida en lugar de un callejón sin salida. Valida SM-6. *(v8)*

**Consecuencias (verificables):**
- La pantalla de cero resultados ofrece como alternativa los Temas, las Colecciones y ocho Autores destacados. *(v8 — antes decía «Temas y Autores destacados»: no nombraba las Colecciones, que ofrece desde la v3, ni decía qué Autores se destacan.)*
- Los ocho Autores destacados son los mismos que los de la portada (FR-9) y salen de una sola regla: los ocho con más Citas publicadas. Si entre esos ocho los de tradición latinoamericana quedan por debajo del 40 % de los que cuentan para el suelo de §6.1 —todos menos los de tradición `otra`—, el que menos Citas tiene de los que cuentan para el suelo sin ser latinoamericanos —un peninsular o uno sin tradición declarada; nunca uno de tradición `otra`, que no cuenta en él— cede su sitio al latinoamericano con más Citas que haya quedado fuera, uno a uno, hasta cumplirlo o hasta que no quede fuera ningún latinoamericano. A igualdad de Citas decide el orden del Directorio de Autores (FR-55), y con el mismo Corpus la regla da siempre los mismos ocho. *(v8 — antes no decía cuáles, y el sitio construido daba los ocho primeros del alfabeto.)*
- Cuando la búsqueda lleva filtros y no da resultados, la pantalla nombra los filtros puestos y ofrece quitarlos (FR-7): no le pide que pruebe con menos palabras a quien quizá no escribió ninguna. *(v8)*
- El sistema registra la consulta sin resultados para alimentar la curación del Corpus (§4.8).
- La consulta se registra una vez, cuando el visitante la da por hecha —al enviarla, o al dejar la página con ella escrita—, nunca por cada tecla: «corazo», camino de «corazón», no es una consulta sin resultados. *(v8)*
- Lo que se registra para la curación es el texto. Un filtrado sin texto que no da resultados no registra ninguna consulta, porque no la hay; su resultado vacío lo cuenta la medición de la búsqueda (FR-56). *(v8)*

---

### 4.5 Portada y Cita del Día

**Descripción:** La portada da identidad al producto y es la superficie de retorno: a ella vuelve quien ya conoce el sitio, no quien llega desde un buscador, que aterriza en una Página de Cita (§10). Su elemento central es la Cita del Día. Realiza UJ-6. *(v8 — antes decía también que la Cita del Día «da nombre al sitio», que era cierto de «Sabiduría Diaria» y dejó de serlo con el renombrado de §0.)*

**Lo que cambia en la v8 es para quien vuelve.** Hasta la v7.1, la portada enseñaba la Cita del Día y debajo listaba Temas, Colecciones y Autores: para llevarse la Cita había que entrar en su página, y para buscar, ir a la búsqueda. La v8 le da lo que quien vuelve viene a hacer: llevarse o compartir la Cita del Día desde ahí, buscar desde ahí, y ver de un vistazo qué hay en el Corpus —cuánto, de qué Obras, de qué Temas, de qué Colecciones y de qué Autores—. No la convierte en puerta de entrada: la decisión de §10 se mantiene, y FR-9 la conserva. Que esto mejore el retorno es un supuesto, y se falsa con lo que la portada mide (§15).

**El riesgo que esta feature introduce, y su freno.** La portada cambia el enlazado interno de las dos familias que SM-11 compara: quita el enlace directo a cada Autor salvo los ocho destacados (FR-8) —los demás pasan al Directorio de Autores— y añade seis Obras. Hecho a mitad del experimento, el cambio inclinaría la comparación sin que constara en ninguna parte. Por eso se despliega después del juicio de SM-11 o con su fecha declarada, para que el informe de indexación la nombre (§6.7), y las seis Obras salen del conjunto indexable congelado mientras rija la congelación (FR-52).

**Requisitos Funcionales:**

#### FR-9: Cita del Día

Cualquier visitante que llegue a la portada ve una Cita destacada que cambia una vez por jornada y, desde la v8, puede llevársela desde ahí y seguir hacia el Corpus. Realiza UJ-6. Valida SM-4.

**Consecuencias (verificables):**
- La Cita del Día es la misma para todos los visitantes dentro de una misma jornada.
- La Cita del Día enlaza a su Página de Cita.
- La selección es **automática por regla**, sobre el subconjunto de Citas que el editor ha marcado como aptas para portada. No exige intervención diaria.
- La selección no repite una Cita mientras queden aptas sin destacar.
- El editor puede fijar manualmente la Cita del Día de una fecha concreta; esa fijación tiene prioridad sobre la regla.
- La portada no es la superficie de entrada mayoritaria y no se optimiza como tal.
- La Cita del Día lleva su Tarjeta de Obra cuando procede de una Obra, la misma que en su Página de Cita (FR-12). *(v8)*
- Sobre la Cita del Día se ofrecen las acciones de su Página de Cita —copiar (FR-3), la Imagen de Cita (FR-10) y compartir (FR-17, FR-18)—, con sus mismas condiciones, y todas actúan sobre esa Página de Cita: lo copiado y la Imagen son los mismos, y el enlace que se comparte es su canónica, nunca la portada, que mañana enseñará otra Cita. La canónica de la Cita sigue siendo su Página de Cita (NFR-13). *(v8)*
- Lo que se copia, se descarga o se comparte desde la portada se registra como de la portada: se informa aparte y no entra en las métricas de la Página de Cita (SM-5, SM-7), que miden lo que esa página resuelve. *(v8)*
- Una línea dice las cifras del Corpus: cuántas Citas publicadas hay, de cuántos Autores, y cuántas están cotejadas con el texto de su Fuente (FR-24). Se compone con lo publicado en cada construcción: es un hecho del Corpus, no un contador de visitas. *(v8)*
- La línea no dice que cada Cita tenga su fuente mientras quede alguna publicada sin documento contra el que cotejarla: esa frase solo se escribe cuando sea cierta (§5). Y la cifra de cotejadas no es SM-C1, que mide Procedencia completa, ni se lee como tal. *(v8)*
- La portada tiene un campo de búsqueda: enviarlo lleva a la búsqueda con lo escrito (FR-7), y no añade JavaScript a la portada. *(v8)*
- Muestra seis Obras indexables (FR-52), de seis Autores distintos mientras los haya: con menos Autores con Obras indexables, una de cada uno, y sin ninguna, el bloque no aparece, sin hueco. La selección es la misma para todos los visitantes de una misma jornada y depende de ella, como la Cita del Día, y el bloque lleva al Directorio de Obras (FR-55). *(v8)*
- Mientras la familia Obra esté congelada por SM-11, las seis salen del conjunto indexable congelado (FR-52): la portada no anuncia una Obra que el criterio de parada dejó fuera. La congelación no quita el bloque, porque no alcanza a la navegación (SM-11). *(v8)*
- Enlaza a todos los Temas publicados y a todas las Colecciones publicadas (FR-26). Cada Colección lleva su criterio en una línea: sin él, «Los escollos del trato» junto a «La amistad» se lee como un Tema más (§10). *(v8: el criterio.)*
- Muestra los ocho Autores destacados de FR-8, con su misma regla, y lleva al Directorio de Autores (FR-55), donde están todos: la portada deja de ser la lista de Autores, y un Autor queda a dos saltos de ella (NFR-5). *(v8)*
- Las salidas desde la Cita del Día y su Tarjeta de Obra, y desde las Obras, los Temas, las Colecciones y los Autores de la portada, se miden cada una con su zona de FR-56 —los Temas, con la misma que en la Página de Cita—, para saber por dónde sigue quien vuelve (SM-4). *(v8)*
- El orden de los bloques lo fija UX, partiendo del orden del diseño aprobado —la línea de cifras y el campo de búsqueda antes de la Cita del Día—, y el texto de la Cita del Día empieza en la primera pantalla a 360 × 640 px. *(v8)*

---

### 4.6 Imagen de Cita

**Descripción:** Convierte una Cita en un objeto publicable. Es la pieza que cierra el circuito de tráfico: la imagen lleva la marca y la dirección del sitio, así que la publicación de un visitante trae al siguiente. Realiza UJ-2. Es también el mayor coste técnico no evidente de la v1 —generación, tipografías, caché, distribución— y así consta en el addendum del brief. *(v8: la dirección.)*

**Desde la v8 tiene dos formatos.** El cuadrado es el de siempre, el de una publicación. El vertical 9:16 es el de las historias: existe para el botón «Historia de Instagram» (FR-17), y el Kit Diario lo ofrece también a las cuentas propias (FR-21). En una historia, si nadie pega el enlace, lo único que lleva al sitio es la dirección escrita al pie, y por eso la v8 la añade a los dos.

**Requisitos Funcionales:**

#### FR-10: Generación de Imagen de Cita

Cualquier visitante puede generar y descargar una Imagen de Cita desde la Página de Cita y, desde la v8, también sobre la Cita del Día de la portada (FR-9, UJ-6). Realiza UJ-2.

**Consecuencias (verificables):**
- La imagen contiene el texto de la Cita, el nombre del Autor, la marca del sitio y su dominio, `sabiduriadebolsillo.net` (LC-1), legible al pie y subordinado como la marca (§11). *(v8 — antes la marca sola.)*
- La imagen se genera en dos formatos: el cuadrado, apto para publicar en redes sociales, que se descarga o se comparte tras elegir diseño (FR-11, FR-17), y el vertical 9:16, que el visitante comparte a una historia y solo descarga cuando el navegador rechaza la entrega (FR-17), y que el Kit Diario ofrece para descargar a las cuentas propias (FR-21). *(v8 — antes un solo formato, «de proporción apta para publicación en redes sociales».)*
- El texto es legible en la imagen sin recorte para Citas de hasta una longitud máxima definida.
- El tamaño tipográfico se reduce por **tramos discretos** según la longitud de la Cita, hasta un mínimo legible definido. Cada formato tiene sus tramos, porque la misma Cita no ocupa lo mismo en un cuadrado que en un 9:16, y en ninguno se baja del mínimo para que quepa. Con el dominio al pie, toda Cita de hasta 300 caracteres sigue cabiendo en su tramo en los dos formatos, y la prueba de los tramos se repite con él. *(v8: los tramos del 9:16 y el pie.)*
- Las Citas de **más de 300 caracteres** no ofrecen Imagen de Cita en ningún formato: ni la acción de la Imagen ni la de la historia se muestran, en su Página de Cita ni en la portada. *(v8 — antes «la acción no se muestra en su Página de Cita», con un solo formato y sin portada.)*
- El sistema **nunca recorta ni abrevia** el texto para que quepa (ver NFR-12). Ausencia antes que mutilación.
- La Imagen que se genera desde la portada es la misma que la de su Página de Cita. *(v8)*

#### FR-11: Selección de diseño

El visitante puede elegir entre un conjunto acotado de diseños para la Imagen cuadrada antes de descargarla o compartirla. *(v8 — antes decía «antes de descargar», cuando había un solo formato; FR-17 ya lo extendía a compartir.)*

**Consecuencias (verificables):**
- Se ofrece más de un diseño y menos de los que obliguen a decidir.
- El diseño elegido no altera el contenido textual ni la atribución.
- **El 9:16 tiene un solo diseño.** Se comparte a la historia sin elegir (FR-17): quien pulsa para publicar en su historia ya ha decidido, y cada elección entre el toque y la historia es una ocasión más de abandonar. Ese diseño es uno de los del cuadrado, compuesto en vertical, y tampoco altera el texto ni la atribución. *(v8)*

**Fuera de alcance:** los demás diseños en 9:16. Serían más decisiones antes de compartir, que es lo que este FR acota. `[NON-GOAL]`

**NFR específicos de la feature:**
- La generación no debe bloquear la interacción con la página desde la que se pide —la Página de Cita o la portada— mientras ocurre. *(v8: la portada.)*

---

### 4.7 Descubrimiento

**Descripción:** Convierte una visita de un segundo en una sesión. Es la feature que sostiene la continuación (SM-4) y la que hace rentable el tamaño reducido del Corpus: con pocas Citas, las rutas entre ellas importan más. Realiza UJ-3. *(v8 — antes «la métrica de páginas por sesión», que no se puede medir: el sitio no identifica la visita, NFR-11.)*

**La v8 pone la Obra en la ruta.** Hasta la v7.1, desde una Página de Cita se llegaba a la Obra solo por el título de la atribución, y las rutas propias de la página eran otras Citas del Autor y los Temas. La v8 hace de la Obra lo segundo que se ve, después de la Cita: una tarjeta con su título y un enlace a la Cita siguiente de la misma obra, y un bloque con otras Citas de ella antes que las del Autor. Quien llega por una frase de un libro tiene a un toque la que viene después en ese libro, porque las Citas de una Obra se ordenan por su posición en el documento cotejado (FR-51).

**El riesgo que esta feature introduce, y su freno.** La Tarjeta de Obra va antes que copiar, la Imagen y compartir, y en un móvil eso deja esas acciones justo por debajo de la primera pantalla. Es una decisión de producto tomada a sabiendas, y la Cita sigue siendo lo primero que se ve (FR-1). Su freno es SM-C5: si la continuación de la Página de Cita sube mientras SM-5 baja sobre las mismas lecturas, la tarjeta está alejando al visitante de llevarse la Cita, que es a lo que vino (UJ-1). El otro riesgo es de medida: la tarjeta pone un enlace más a la Obra en cada Página de Cita durante la ventana en que SM-11 compara Obra con Autor, y por eso se despliega junto al Directorio de Autores y con su fecha declarada (§6.7).

**Requisitos Funcionales:**

#### FR-12: Rutas de salida desde la Página de Cita *(reescrito en la v8)*

Desde cualquier Página de Cita, el visitante encuentra la Obra de la que procede la Cita, la Cita siguiente de esa Obra, otras Citas de ella y de su Autor, y los Temas de la Cita. Realiza UJ-3. Valida SM-4 y SM-C5. *(v8 — antes «al menos una ruta a contenido relacionado»: otras Citas del mismo Autor y de los mismos Temas.)*

**Consecuencias (verificables):**
- **La Tarjeta de Obra.** Toda Cita que procede de una Obra lleva una Tarjeta de Obra, después de su atribución y de la línea que dice de qué Fuente se tomó su texto —cuando la hay—; esa línea sigue pegada a la atribución que acredita. La tarjeta nombra la Obra con el título de su Ficha de Obra (FR-53), dice su Autor, el año de la Obra si las Citas que lo declaran coinciden (FR-42) —si discrepan, va sin año, nunca con uno elegido— y cuántas Citas tiene, y lleva a su Página de Obra.
- La tarjeta promete dónde leer la obra solo cuando su Página de Obra lo da, es decir, cuando alguna de sus Citas está cotejada (FR-54). Si no, lleva a la Página de Obra sin prometerlo.
- **La siguiente.** La tarjeta lleva a la Cita que sigue a esta en el orden de su Obra —el de su Página de Obra, que es el del libro (FR-51)—, y tras la última, a la primera: pasando de cada Cita a su siguiente se recorren todas las de la Obra y se vuelve a la de partida. Si la Obra tiene una sola Cita, lleva a la Cita que le sigue en el listado del primero de sus Temas publicados —el primero en el orden en que la Cita los declara— y, tras la última del Tema, a la primera; sin Tema publicado, no hay siguiente. *(El orden del libro, decisión de Héctor del 2026-10-18.)*
- **De la misma obra.** Hasta tres Citas más de la Obra, sin repetir la que se lee ni la siguiente, repartidas a lo largo del orden de la Obra en vez de contiguas, y un enlace a la Página de Obra con todas. Si no queda ninguna, el bloque no aparece.
- **Más de {Autor}.** Hasta cuatro Citas más del Autor que no sean de la misma Obra, ni la que se lee, ni la siguiente, y un enlace a la Página de Autor con todas. Si no queda ninguna, el bloque no aparece. *(v8 — antes «Se ofrecen otras Citas del mismo Autor», también de la misma Obra.)*
- Las Citas de «Más de {Autor}» van en Tarjeta de Cita con el título de su Obra y sin el Autor; las de «De la misma obra», sin ninguno de los dos: la tarjeta no repite lo que la página ya dice.
- Se ofrecen los Temas publicados de la Cita, cada uno hacia su Página de Tema. *(v8 — antes «Citas de los mismos Temas»; lo que se construyó, y se conserva, es el enlace al Tema, que las reúne.)*
- Una Cita que no procede de ninguna Obra no lleva Tarjeta de Obra ni siguiente, y conserva las demás rutas: «Siguiente» vive en la Tarjeta de Obra, y sin Obra no hay tarjeta que lo lleve; sus Temas siguen entre sus rutas.
- Ninguna Página de Cita publicada queda sin enlaces salientes internos.
- Toda Cita que procede de una Obra lleva a su Página de Obra desde la atribución (FR-2) y desde su Tarjeta de Obra, también cuando la Obra no es indexable. *(v7.1; v8: la tarjeta.)*
- El orden de la página es la Cita con su atribución y su Fuente, la Tarjeta de Obra, las acciones de copiar, Imagen y compartir, «De la misma obra», «Más de {Autor}» y los Temas. Nada de lo que añade este FR va antes que la Cita (FR-1).
- La Tarjeta de Obra no aloja ningún Modelo de Ingreso (FR-35).
- La congelación de la familia Obra no quita la Tarjeta de Obra ni ninguna de estas rutas: no alcanza a la navegación (SM-11).
- Todo se compone al construir el sitio y es determinista: dos construcciones del mismo commit ofrecen las mismas rutas. Son enlaces del HTML inicial, que no necesitan JavaScript (NFR-2).
- Lo que cambie en estas rutas —la Tarjeta de Obra con el año y el recuento de la Obra, la siguiente, las Citas ofrecidas y sus recuentos— no es un cambio de la Página de Cita a efectos del sitemap ni del aviso de cambio (FR-47, FR-38): lo que la página afirma de su Cita no ha cambiado.
- La búsqueda interna no devuelve una Página de Cita por el texto de las Citas que enlaza: solo por el suyo.
- Cada una de estas rutas se mide como zona de la salida interna (FR-56), para saber qué enlace retiene.
- Nada de esto saca a la Página de Cita de NFR-7, que se mide con todo ello puesto.
- La relación se deriva de Autor, Obra y Tema; no hay motor de recomendación. `[NON-GOAL for MVP]` *(v8: la v7.1 ya lo decía de la Obra y el sitio construido no la miraba; desde la v8, sí.)*

**Fuera de alcance:** las rutas que dependan del visitante —recomendar por lo que leyó antes, favoritas, «seguir donde lo dejaste»—. Todas exigen recordarlo, y el producto no lo hace (§2.2, NFR-11). `[NON-GOAL]`

---

### 4.8 Ingesta y Curación del Corpus

**Descripción:** Herramienta interna, de un solo operador, que introduce Citas en el sistema haciendo cumplir por construcción las reglas que el producto promete públicamente. No es una superficie pública y no se indexa. Es la feature que hace que la promesa de procedencia sea verificable en lugar de aspiracional. Realiza UJ-4.

**[NOTE FOR PM]** Esta feature no aparece nombrada en el brief, que se limita a decir que "la curación es interna". Se hace explícita aquí porque sin ella el criterio de admisión del corpus no es exigible por el sistema, sino solo por la disciplina del editor.

**Requisitos Funcionales:**

#### FR-13: Alta de Cita con reglas de admisión

El editor puede dar de alta Citas, individualmente o por lote, y el sistema impide publicar las que incumplen el criterio de admisión. Realiza UJ-4.

**Consecuencias (verificables):**
- Una Cita cuyo Autor no tiene año de fallecimiento registrado no puede pasar a `publicada`.
- Una Cita sin Procedencia no puede pasar a `publicada`; queda en `en-revisión`.
- Una Cita con Estado de Derechos distinto de `dominio-público` no puede pasar a `publicada` en la v1.
- El rechazo indica cuál regla se incumplió.

#### FR-14: Detección de duplicados

El sistema señala al editor cuándo una Cita entrante coincide con una ya existente. Realiza UJ-4.

**Consecuencias (verificables):**
- La coincidencia se detecta pese a diferencias de puntuación, acentuación y mayúsculas.
- El editor decide; el sistema no descarta automáticamente.

#### FR-15: Gestión de Autores y Temas

El editor puede crear y editar Autores y Temas, y asociar Citas a ellos.

**Consecuencias (verificables):**
- El año de fallecimiento es obligatorio para crear un Autor.
- Todo Autor lleva una **clave de orden**: su apellido, o el nombre por el que se le conoce cuando no se ordena por apellido. Es la que ordena el Directorio de Autores (FR-55): por el nombre de pila, Cervantes iría a la «M». Es obligatoria para publicar: un Autor con Citas publicadas y sin clave detiene la construcción, en vez de caer en un sitio cualquiera del Directorio. *(v8)*
- La clave nunca se escribe a mano en la ficha. La escribe la herramienta al dar de alta al Autor, como propuesta, y la propone en lote para los Autores que ya existen. Corregirla es también un acto de la herramienta, con una orden que valida la clave antes de escribirla. *(v8)*
- Las claves propuestas las revisa una persona, nunca un agente, porque los casos que no tienen apellido o no se ordenan por él —Séneca, Marco Aurelio, Sor Juana, los nombres compuestos— no los resuelve una regla. Esa revisión no bloquea nada: un Autor cuya clave nadie ha revisado se publica igual, y el sembrado de §4.11 no se detiene a esperarla. *(v8)*
- Un Tema no puede eliminarse mientras tenga Citas publicadas asociadas.
- El editor puede marcar una Cita como apta para portada, alimentando la selección de FR-9.

#### FR-16: Visibilidad de la salud del Corpus

El editor puede consultar el porcentaje de Citas publicadas con Procedencia completa. Valida SM-C1.

**Consecuencias (verificables):**
- La cifra es consultable en cualquier momento, sin exportar datos.
- Se desglosa por Autor.

---

### 4.9 Compartir Directo *(v2)*

**Descripción:** Convierte el circuito de compartición de la v1 —copiar texto, descargar un fichero— en una salida hacia las aplicaciones donde el visitante publica realmente. Realiza UJ-2 hasta su final, que la v1 dejaba a medio camino: la v1 entregaba un PNG a la carpeta de descargas y confiaba en que el visitante lo encontrara.

Es la feature que hace que cada visitante pueda traer al siguiente. Con un Corpus pequeño y sin posiciones en el buscador, ese circuito no es un extra: es el único mecanismo de crecimiento disponible antes de que el SEO empiece a rendir.

**Enmendada en la v8, con el dato delante.** En seis semanas de medición, del 2026-09-04 al 2026-10-16, hubo 4 copiados —la misma Cita, el mismo día—, 2 descargas de imagen, 2 comparticiones de imagen y ninguna de enlace. La v2 confió la compartición a la Hoja del Sistema y escondía los destinos allí donde la había; donde no la había, la imagen solo se descargaba, y entre los destinos de enlace no estaban ni Facebook ni Threads. Es justo el caso del navegador integrado en la aplicación de Facebook en Android, que no tiene hoja para ficheros y es por donde la v8 supone que lee la audiencia principal del proyecto (§15). La v8 pone a la vista los destinos donde se publica, también cuando hay hoja; hace de «Historia de Instagram» un destino propio, con su formato, allí donde el navegador puede entregarle el fichero (FR-10, FR-17); deja la hoja del enlace detrás de «Más opciones…»; comparte también la Página de Obra; y marca lo que comparte un visitante para que la visita que trae se cuente (FR-18, FR-20, FR-22). Que casi nadie compartiera por falta de camino y no de ganas es un supuesto, no un hecho, y lo falsan SM-7 y SM-12 (§15).

**Restricción de plataforma que condiciona todos los FR de esta feature.** La Hoja del Sistema existe donde el navegador la ofrece, y eso no depende de que el dispositivo sea un móvil: hay navegadores de escritorio que comparten ficheros, y navegadores integrados en aplicaciones móviles —el de Facebook en Android— que no lo hacen. *(v8 — antes decía «Compartir ficheros desde la web solo existe en navegadores móviles; en escritorio no hay hoja del sistema».)* Que una hoja acepte un fichero tampoco quiere decir que pueda llevarlo a una historia: en escritorio no hay historias que publicar, y por eso «Historia de Instagram» solo se ofrece en pantallas táctiles cuyo navegador puede compartir el fichero (FR-17); que Instagram ofrezca entonces la historia es un supuesto, que la prueba de dispositivos comprueba antes de que lo vea un visitante (§15). Y ninguna red permite preinsertar texto en una publicación de imagen: Instagram y TikTok reciben el fichero y nada más. En una historia, el enlace solo llega si el visitante lo pega en el sticker Enlace, así que el sitio se lo deja copiado antes de entregar la imagen; si no lo pega, el único enlace que sobrevive es el dominio impreso al pie de la imagen (FR-10). *(v8)* El producto no puede prometer «publicar en un toque»; promete **entregar la pieza a la aplicación correcta sin pasar por el gestor de ficheros**.

**Requisitos Funcionales:**

#### FR-17: Compartir la Imagen de Cita por la Hoja del Sistema

El visitante puede enviar la Imagen de Cita a cualquier aplicación de su dispositivo sin pasar por la descarga y, en una pantalla táctil cuyo navegador pueda compartirla, llevarla a una historia de Instagram con el enlace de la Cita listo para pegar. Realiza UJ-2. *(v8: la historia de Instagram)*

**Consecuencias (verificables):**
- Donde el navegador admite compartir ficheros, la acción principal abre la Hoja del Sistema con la imagen ya adjunta.
- Donde no lo admite, la misma acción descarga el fichero, con el comportamiento de la v1 sin cambios. No existe una tercera vía, ni un botón deshabilitado, ni un aviso de incompatibilidad.
- El fichero compartido y el fichero descargado son el mismo: una sola ruta de generación produce ambos, en cada uno de los dos formatos de FR-10. *(v8: también el 9:16)*
- La elección de diseño (FR-11) precede a compartir igual que precedía a descargar, salvo en «Historia de Instagram», que comparte sin elegir: el 9:16 tiene un solo diseño. *(v8)*
- Si el visitante cierra la Hoja del Sistema sin elegir destino, no se registra compartición y no se muestra ningún error.
- **«Historia de Instagram»** es un destino del bloque de compartir (FR-18) que entrega a la Hoja del Sistema la Imagen de Cita en 9:16. Solo aparece en pantallas táctiles cuyo navegador puede compartir el fichero, y en Citas que admiten Imagen de Cita. Donde no puede cumplirse —en escritorio; en un navegador que no comparte ficheros, como el de la aplicación de Facebook en Android; sin JavaScript; en una Cita de más de 300 caracteres— no aparece, y el bloque lleva los demás destinos sin aviso: es la regla de «ni un botón deshabilitado, ni un aviso de incompatibilidad» aplicada a un destino, y la de que un botón que no puede cumplir es peor que no ofrecerlo. *(v8; dónde no aparece, decisión de Héctor del 2026-10-18.)*
- Primero deja copiado el enlace de la Página de Cita, con su marca de difusión (FR-18); después entrega a la hoja el fichero, sin texto ni enlace, que es lo que lleva a Instagram a ofrecer la historia. Al terminar dice que el enlace está copiado y que se pega en el sticker Enlace. *(v8)*
- Si el navegador rechaza la entrega —la activación del toque se perdió o se negó, que no se puede prever antes del toque—, la misma acción descarga la imagen, deja el enlace copiado y lo dice. Es el único caso en que «Historia de Instagram» descarga. Que el navegador rechace no es que el visitante cancele: cancelar no descarga ni registra nada, igual que cerrar la hoja. *(v8)*
- Nunca dice «copiado» sin haber copiado. Si el portapapeles falla, el mensaje no lo afirma y muestra el enlace en un campo seleccionable para copiarlo a mano. *(v8)*
- Si la imagen no se puede generar, lo dice en una frase y ofrece copiar el texto de la Cita; pulsar otra vez lo vuelve a intentar. *(v8)*
- Cada uno de esos estados se anuncia también a quien navega con lector de pantalla (NFR-9). *(v8)*

#### FR-18: Compartir el enlace de una Cita o de una Obra *(reescrito en la v8)*

El visitante puede enviar el enlace de una Página de Cita, con su atribución, o el de una Página de Obra, a la aplicación donde quiera publicarlo, eligiéndola entre destinos que ve en la propia página. Realiza UJ-2 y UJ-6. Valida SM-7 y SM-12. *(v8 — antes decía «El visitante puede enviar el enlace de la Página de Cita, con su atribución, al lugar donde quiera publicarlo», y la Hoja del Sistema, donde existía, sustituía a los destinos.)*

**Consecuencias (verificables):**
- **Los destinos están a la vista, también donde hay Hoja del Sistema.** El bloque de compartir muestra, en este orden, «Historia de Instagram» (FR-17), WhatsApp, Facebook y Threads, y después «Más opciones…». Donde «Historia de Instagram» no puede cumplirse (FR-17) quedan los otros tres, sin aviso.
- «Más opciones…» abre la Hoja del Sistema con enlace y texto donde la hay; donde no, despliega Telegram, X y Correo. Para el enlace, la hoja ya no es la acción principal en ningún dispositivo: es una opción más, detrás de los destinos donde se publica.
- El texto propuesto incluye la Cita y su Autor; nunca solo la URL desnuda. La única excepción es Facebook, que no admite texto propuesto y recibe solo el enlace: lo que acompaña a la publicación es su Tarjeta Social (FR-19). Un destino que limita la longitud —X, Threads— recibe, cuando la Cita con su Autor y su enlace no cabe, solo el Autor y el enlace, como la Tarjeta Social de una Cita que no admite Imagen: nunca un fragmento de la Cita (NFR-12).
- El bloque acompaña a la Cita en la Página de Cita y a la Cita del Día en la portada (FR-9). En los dos sitios comparte la Página de Cita, nunca la portada.
- **La Página de Obra también se comparte.** Su página 1, se indexe o no, lleva el mismo bloque sin «Historia de Instagram», porque no hay Imagen de Obra; las páginas 2 y siguientes no lo llevan (FR-51). El texto propuesto es «{título}, de {Autor}», con el título que fija su Ficha de Obra (FR-53): un hecho, no una descripción de la obra (§5). Lo que muestra la red al pegarlo es la Tarjeta Social de la Obra (FR-51). Compartir una Obra sigue durante la congelación de su familia, que no alcanza a la navegación (SM-11).
- **Lo que se comparte lleva marca de difusión.** El enlace que el sitio compone para un destino lleva la marca de ese destino, y el que «Más opciones…» entrega a la Hoja del Sistema lleva el valor opaco, del conjunto cerrado de FR-20; los destinos que despliega donde no hay hoja llevan cada uno la suya. Nunca lleva la marca de origen de las cuentas propias (FR-22). Es la marca que la v2 ya pedía y no llegó a construirse: lo compartido salía sin marca, y la visita que traía contaba como orgánica.
- La marca no genera una URL indexable distinta de la canónica: la canónica de la página, y la URL que la página declara a las redes, son las mismas con marca o sin ella.
- Ningún destino exige al visitante registrarse en el sitio ni instalar nada.
- Sin JavaScript, el bloque lleva igual los destinos de enlace —WhatsApp, Facebook y Threads, y Telegram, X y Correo tras «Más opciones…»—, que son enlaces del HTML inicial; solo la Hoja del Sistema y «Historia de Instagram» necesitan guion (NFR-2).

#### FR-19: Tarjeta Social de toda Cita publicada

Cuando alguien pega el enlace de una Cita en una red, la previsualización muestra la Cita, no un genérico del sitio.

**Consecuencias (verificables):**
- Toda Cita publicada tiene Tarjeta Social. Ninguna queda sin ella.
- La Tarjeta de una Cita que admite Imagen de Cita presenta el texto de la Cita y su Autor.
- La Tarjeta de una Cita que **no** admite Imagen —por superar el límite de longitud de FR-10— presenta Autor y marca **sin el texto de la Cita**. Nunca un fragmento recortado: NFR-12 prohíbe alterar el texto, y media Cita en una tarjeta es una Cita alterada.
- La composición se verifica contra los validadores de previsualización de las redes de destino, no solo a ojo.
- En Facebook, la Tarjeta Social es lo único que acompaña al enlace compartido (FR-18): lo que dice la tarjeta es lo que se publica. Por eso la de la Cita, y la de la Obra cuando se comparte una (FR-51), se verifican en el validador de previsualización de Facebook antes de ofrecer ese destino. *(v8)*

#### FR-20: Medición de la compartición

El sistema registra que hubo compartición y desde qué destino, y reconoce la visita que esa compartición trae. Valida SM-7 y SM-12. *(v8: la visita que trae, y SM-12)*

**Consecuencias (verificables):**
- Se registra el evento con su Destino de Compartición. Un destino nombrado registra **el botón que se pulsó**, también cuando la entrega pasa por la Hoja del Sistema: «Historia de Instagram» se registra como tal, porque el destino nombra el botón y no la aplicación que el visitante eligió en la hoja, que el navegador no revela. Opaco queda para la Hoja del Sistema abierta sin pulsar un destino nombrado: «Más opciones…» donde hay hoja, y la Imagen cuadrada compartida desde su diálogo (FR-17). *(v8 — antes decía «y como opaco cuando el visitante usó la Hoja del Sistema».)*
- **El conjunto de destinos es cerrado y tiene dos clases.** Los destinos de enlace —WhatsApp, Facebook, Threads, Telegram, X y Correo— reciben un enlace; el destino de imagen —«Historia de Instagram»— recibe un fichero. Son siete destinos nombrados —por debajo de los que obligan a decidir— más opaco. El mismo conjunto da los valores de la marca de difusión (FR-18): no hay marca de difusión que no sea un destino, ni destino sin su marca. *(v8)*
- Cuando «Historia de Instagram» cae en la descarga (FR-17), se registra como descarga de imagen y no como compartición —se cuenta lo que ocurrió, no lo que se intentó—, y la descarga lleva el destino del botón, `instagram-historia`. Así no se mezcla con las descargas que el visitante eligió (SM-5) ni con las comparticiones (SM-7, SM-C3), y la difusión de ese destino cuenta también el enlace que dejó copiado (SM-12). *(v8; el destino de la descarga, 2026-10-18.)*
- La compartición de imagen y la de enlace se distinguen entre sí.
- Se sabe en qué superficie ocurrió cada compartición —la Página de Cita, la portada o la Página de Obra—, porque SM-7 cuenta solo las de la Página de Cita y las demás se informan aparte. *(v8)*
- La visita que trae una compartición se reconoce por su marca de difusión y cuenta cuando es una lectura (FR-56), no al cargarse la página: una carga la produce también una máquina. La que llega desde Facebook puede venir sin marca: si su tarjeta enlaza a la URL que la página declara a las redes, que no la lleva, la compartición se cuenta y la llegada no, y la difusión de Facebook queda fuera de la comparación entre destinos hasta que la prueba de dispositivos diga si la marca sobrevive (SM-12). *(v8)*
- No se añade cookie, identificador de visitante ni dato que pueda convertirse en uno: NFR-10 y NFR-11 siguen intactos. La marca de difusión nombra un destino, nunca a quien compartió ni a quien llega. *(v8: la marca de difusión)*
- El vocabulario de eventos permanece cerrado; añadir uno exige modificar el módulo de medición, y esa fricción es deliberada.

---

### 4.10 Kit Diario de Publicación *(v2)*

**Descripción:** Superficie interna que convierte la jornada del sitio en material publicable en las cuentas propias. Realiza UJ-5.

Existe por una razón de plan, no de comodidad: mientras el Corpus no sostenga tráfico de buscador, las cuentas de Sabiduría de Bolsillo son el único canal de entrada, y un canal que depende de que su operador tenga tiempo y ganas cada mañana deja de alimentarse en la primera semana ocupada. El Kit Diario reduce la publicación diaria a un gesto, que es lo que la hace sostenible.

**Requisitos Funcionales:**

#### FR-21: La jornada deja el material compuesto

Cada jornada, el sistema deja preparado y accesible el material para publicar la Cita del Día. Realiza UJ-5.

**Consecuencias (verificables):**
- El material incluye la Imagen de la Cita del Día ya generada en sus dos formatos —el cuadrado y el 9:16 de las historias (FR-10)—, un pie con la atribución, y el enlace a su Página de Cita. *(v8: el 9:16)*
- Es accesible desde un móvil sin herramientas ni acceso al repositorio.
- Se recompone en la misma jornada en que cambia la Cita del Día, sin intervención.
- La superficie no es indexable ni alcanzable desde la navegación pública.
- Si la Cita del Día no admite Imagen de Cita, el Kit lo indica y ofrece una Cita alternativa apta, en lugar de presentar un material incompleto.

#### FR-22: Atribución del tráfico por cuenta

El editor puede saber qué red trae visitas, y separar las que traen sus cuentas de las que trae lo que comparten los visitantes. Valida SM-8 y SM-12. *(v8: la separación, y SM-12)*

**Consecuencias (verificables):**
- El enlace del Kit distingue la red de destino, una marca por cuenta.
- La marca de origen es solo de las cuentas propias, y SM-8 cuenta solo esa. Lo que comparte un visitante lleva la marca de difusión (FR-18) y nunca la de origen: con una sola marca, la visita que trajo un visitante se atribuiría a una cuenta, y SM-8 dejaría de decir qué red merece el tiempo del editor. *(v8)*
- Las dos marcas se reconocen y se guardan por separado, cada una contra su conjunto cerrado; un valor que no es de su conjunto no se guarda, y la visita cuenta como si no lo trajera. Una visita que trae las dos cuenta en las dos series, y ninguna se la quita a la otra. Cada una se cuenta una vez por llegada: tras leerlas, la página las quita de su dirección, así que una recarga o una vuelta atrás no las cuentan otra vez, y quien copia la dirección de la barra no las arrastra (FR-56). *(v8)*
- La página de destino es siempre la misma URL canónica, con o sin marca de origen o de difusión: el índice del buscador no ve páginas duplicadas. *(v8: también la de difusión)*
- Ninguna de las dos marcas altera lo que ve el visitante. *(v8 — antes decía «La marca de origen no altera lo que ve el visitante».)*

---

### 4.11 Sembrado del Corpus *(v2)*

**Descripción:** Proceso incremental por el que el Corpus crece desde las 38 Citas actuales hacia el orden de magnitud que §6.1 supone, sin que baje el porcentaje de Citas con Procedencia verificada. Extiende la herramienta de §4.8; no la sustituye.

**Quién lo ejecuta, revisado en la v3.1.** El sembrado puede ejecutarlo el editor o un agente. Lo que hace esa apertura segura no es confiar en quien lo lanza, sino que la Procedencia deje de ser una afirmación: la Fuente se recupera y su metadato se deriva del documento (FR-23), y el texto de cada candidata se localiza literalmente en él antes de publicarse (FR-24). Un agente no puede inventar una obra porque nunca la teclea, y no puede inventar una Cita porque su texto tiene que aparecer en el documento.

**La decisión que define esta feature es de dónde NO se extrae.** Los sitios de citas existentes publican texto y nombre, sin obra ni año: cualquier Cita tomada de ellos moriría en la puerta de admisión de FR-13, y además §5 lo excluye explícitamente. La extracción se hace **desde las obras**, en fuentes de dominio público que traen la referencia consigo. La Procedencia no se busca después de tener el texto: viene con él.

**Sobre las traducciones.** Una obra en dominio público no arrastra a sus traducciones, que son obras nuevas con su propio plazo de protección. Y una traducción hecha por el editor produce una frase en español que no consta en ninguna edición publicada, o sea una Cita cuya Procedencia no es verificable — justo el defecto que el producto existe para corregir. Solo se admite texto en español procedente de una edición identificable, sea original o traducción ya en dominio público.

**Requisitos Funcionales:**

#### FR-23: Extracción de candidatas desde una Fuente

Elegidos un Autor y una Fuente, el sistema obtiene Citas candidatas con su Procedencia ya rellena, **derivada del documento recuperado y no de lo que declare quien lanza la extracción**.

**Consecuencias (verificables):**
- La Fuente se recupera desde su URL y su metadato —obra, año, licencia— se deriva del documento recuperado. No se teclea al invocar la extracción: un dato escrito a mano no es lo que dice la Fuente, sino lo que recuerda quien lo escribe.
- Una URL que no pertenezca al conjunto de Fuentes admitidas no produce candidatas.
- Cada candidata llega con obra y año tomados de la Fuente, no inferidos.
- Cada candidata registra de qué Fuente y bajo qué licencia se obtuvo.
- Una Fuente cuya licencia no permita reutilización no produce candidatas.
- El sistema no propone candidatas cuyo texto no esté en español.
- El documento recuperado se conserva mientras haya candidatas suyas pendientes, porque el cotejo de FR-24 se hace contra él.

#### FR-24: Aprobación por lote con cotejo contra la Fuente

Las candidatas se revisan en bloque y ninguna se publica hasta localizar su texto en el documento de su Fuente. La revisión puede ejecutarla el editor o un agente; lo que no cambia es la puerta.

**Consecuencias (verificables):**
- El texto de una candidata debe encontrarse **literalmente** en el documento recuperado de su Fuente. Si no se localiza, la candidata no se publica y permanece en revisión.
- El cotejo se hace contra el documento recuperado, nunca contra la afirmación de quien extrajo la candidata.
- Aprobar una candidata la somete a las mismas reglas de FR-13 y FR-14 que cualquier alta: el sembrado no abre una puerta lateral.
- Rechazar una candidata la descarta sin dejarla en el Corpus.
- Una candidata duplicada de una Cita ya publicada se señala antes de la decisión.
- El lote es reanudable: puede dejarse a medias y retomarse otro día.
- Publicar es siempre un acto explícito. Ninguna candidata pasa a `publicada` por acumulación de tiempo ni por ausencia de objeción.

#### FR-25: Prioridad de sembrado por hueco del Corpus

El hueco del Corpus determina a qué se dedica la sesión de sembrado, con una política explícita y reproducible que puede aplicar el editor o un agente. Valida SM-C2.

**Consecuencias (verificables):**
- Se muestran los Temas por debajo del umbral de publicación de FR-6, con cuántas Citas les faltan.
- Se muestra la proporción de Autores de tradición latinoamericana frente al suelo del 40 % de §6.1.
- La política de selección es determinista y consultable: con el mismo estado del Corpus propone el mismo objetivo, y dice de qué hueco sale.
- El editor puede anular la propuesta, y la anulación queda registrada. Automatizar la elección no es retirarle la última palabra.

### 4.12 Colecciones Curadas *(v3)*

**Descripción:** Superficie de agregación editorial que cruza Tema y Autor. Existe porque las cuatro superficies de §10 dejan un hueco: la consulta real de un visitante rara vez es «frases de Séneca» o «frases sobre el tiempo» — es «frases cortas para reflexionar», «frases para dedicar a una madre», «frases para empezar el año». Ninguna de esas es un Autor ni pertenece al conjunto cerrado de Temas, así que hoy no tiene dónde aterrizar y el tráfico se va a quien sí les ha hecho una página.

**Por qué el conjunto es abierto y el de Temas cerrado.** El Tema clasifica la Cita y por eso debe ser estable: cambiarlo reordena el Corpus entero. La Colección no clasifica, escoge — su criterio es editorial, responde a cómo se busca, y crear una nueva no toca ninguna Cita existente. Son dos mecanismos distintos que se parecen, y confundirlos rompería FR-6.

**El riesgo que esta feature introduce, y su freno.** La vía barata de multiplicar páginas indexables es fabricar Colecciones de cinco Citas. Es exactamente el defecto que SM-C2 vigila en los Temas, y por eso la Colección hereda un umbral mínimo propio en vez de nacer libre.

**Requisitos Funcionales:**

#### FR-26: Página de Colección indexable

Toda Colección publicada tiene URL propia, legible y estable, con las Citas que la componen.

**Consecuencias (verificables):**
- Una Colección con menos Citas que su umbral mínimo no se publica ni entra en el sitemap.
- La Página de Colección es rastreable e indexable, con canónica propia, y cumple NFR-1…NFR-5 como las otras superficies.
- Toda Colección publicada es alcanzable por enlaces internos desde la portada.
- Retirar una Cita del Corpus la retira de todas sus Colecciones sin dejar hueco ni enlace roto.
- La Tarjeta de Cita del listado lleva el nombre del Autor y, como texto y nunca como un segundo enlace, el título de la Obra de la que procede la Cita, cuando procede de una, como en el listado de Tema (FR-6). *(v8)*

#### FR-27: Curación de una Colección

El editor crea una Colección, le da criterio y nombre, y le asigna Citas ya publicadas.

**Consecuencias (verificables):**
- Una Colección solo admite Citas en estado `publicada`; no es una vía para adelantar contenido en revisión.
- Una Cita puede pertenecer a varias Colecciones sin que cambien sus Temas ni su Autor.
- El editor ve cuántas Citas le faltan a una Colección para alcanzar su umbral, como en FR-25.
- Una Colección se despublica sin borrar ninguna Cita.

#### FR-28: La Colección no compite con la Cita

La Colección agrega y enlaza; no reproduce el producto en otra URL.

**Consecuencias (verificables):**
- La canónica de cada Cita sigue siendo su Página de Cita, nunca la Colección que la contiene.
- Una Cita presente en varias Colecciones no genera contenido duplicado indexable.
- La Página de Colección enlaza a cada Página de Cita; no es un destino terminal.
- El texto editorial de la Colección describe el criterio; no comenta ni adjetiva las Citas, por §11.

---

### 4.13 Ampliación del Canal Propio *(v3)*

**Descripción:** El Kit Diario de §4.10 compone una pieza por jornada y exige presencia diaria de Héctor. La v3 ataca las dos limitaciones que eso impone: que solo hay un formato, y que olvidar un día es perder ese día.

**Sobre el vídeo, que la v2 dejó fuera a propósito.** §6.3 lo excluyó con este argumento: *«el vídeo exige un motor propio —composición temporal, audio, duración— que no es una historia sino un producto»*. Ese argumento sigue siendo cierto y nada lo ha invalidado. Entra en la v3 por decisión explícita de Héctor, con la advertencia registrada: es la pieza más cara del alcance, la única que exige una decisión de arquitectura nueva, y la candidata preferente al recorte si la v3 se pasa de tamaño. Lleva por eso su propio umbral (FR-31).

**Requisitos Funcionales:**

#### FR-29: Composición anticipada por lote

El editor compone varias jornadas de material de una sola sentada.

**Consecuencias (verificables):**
- El material compuesto por adelantado es indistinguible del que compone la jornada, y lo sustituye si ambos existen.
- Cambiar la Cita del Día de una jornada ya compuesta recompone su material, no lo deja obsoleto.
- El lote es reanudable, como en FR-24.
- La superficie del lote no es indexable ni enlazada, igual que el Kit Diario.

#### FR-30: Pieza de varias Citas

El sistema compone una Pieza de Canal que reúne varias Citas, no una sola.

**Consecuencias (verificables):**
- Cada Cita de la pieza conserva su atribución visible; ninguna aparece sin Autor.
- Una Cita que no admite Imagen por el límite de FR-10 tampoco entra en una pieza de varias.
- La pieza declara un único enlace de destino, marcado por red según FR-22.
- La plantilla no altera el texto de ninguna Cita, por NFR-12.

#### FR-31: Pieza en movimiento

El sistema compone una Pieza de Canal con duración, para las redes que la exigen.

**Umbral de construcción:** esta feature no se construye hasta que SM-8 demuestre que al menos una cuenta de imagen fija trae visitas medibles. Sin esa señal, el motor de vídeo es coste sin evidencia.

**Consecuencias (verificables):**
- La pieza se compone sin intervención manual una vez elegidas las Citas.
- El texto de cada Cita permanece en pantalla el tiempo necesario para leerlo; no se recorta ni se acelera para caber.
- La atribución acompaña a cada Cita mientras esta se muestra, no solo al final.

#### FR-32: Pieza derivada de una Colección

Una Colección publicada produce su propia Pieza de Canal.

**Consecuencias (verificables):**
- La pieza enlaza a la Página de Colección, no a una Cita suelta.
- Una Colección por debajo de su umbral no produce pieza: no se anuncia lo que no está publicado.
- La pieza respeta las mismas reglas de atribución de FR-30.

---

### 4.14 Monetización por Umbral *(v3)*

**Descripción:** Cuatro Modelos de Ingreso diseñados ahora y encendidos por separado, cada uno cuando el tráfico medido cruce su Umbral de Activación. La regla que la v1 se dio —*«la decisión se toma con datos de tráfico»*— se conserva íntegra: lo que la v3 adelanta es el diseño, no el cobro.

**Por qué umbrales y no una fecha.** Un calendario monetiza un sitio que quizá no tenga visitantes; un umbral solo se cruza si los hay. Además convierte cada Modelo en una decisión reversible: si el tráfico baja del umbral, el Modelo se apaga sin haber comprometido el diseño del producto.

**La restricción que gobierna toda la sección.** NFR-10 (sin muro de entrada) tiene prioridad sobre cualquier Modelo de Ingreso, y §11 identifica «publicidad intercalada en el contenido» como anti-referencia declarada del producto. **Ninguna unidad publicitaria** puede aparecer en la Página de Cita, en la de Colección ni, desde la v7.1, en la de Obra: son el punto de entrada real desde buscadores y las superficies donde el producto cumple su promesa. La restricción veda unidades publicitarias, no todo Modelo: un Modelo de coste bajo sobre la superficie es admisible donde su FR lo sitúe, siempre que la lectura de esa superficie no cambie con el Modelo encendido o apagado. El de FR-35 vive en la Página de Obra, debajo de la edición cotejada, y no en la Página de Cita porque se le eligió otro sitio, no porque esta restricción lo prohíba. *(v7.1 — antes decía que su enlace salía de la Procedencia que la Página de Cita muestra.)*

**Requisitos Funcionales:**

#### FR-33: Activación por umbral medido

Ningún Modelo de Ingreso se enciende antes de que su Umbral de Activación se mida en el receptor de LC-4.

**Consecuencias (verificables):**
- El umbral se comprueba contra tráfico orgánico medido, no estimado ni proyectado.
- Cada Modelo se enciende y se apaga por separado, sin afectar a los demás.
- Un Modelo apagado no deja hueco reservado ni espacio en blanco en ninguna superficie, por §12.
- Cada Modelo declara qué acto dispara su Umbral; ninguno se enciende solo por cruzarlo. En la afiliación, el acto es solicitar la cuenta (FR-35). *(v7.1)*
- El estado de cada Modelo (activo o apagado, contra qué cifra y qué acto dispara) es consultable sin exportar datos, como en FR-16.
- Mientras un Umbral siga escrito en sesiones orgánicas, el receptor no lo puede medir sin identificar la visita (NFR-11, FR-56): cruzarlo no se puede afirmar, y ningún Modelo que dependa de él se enciende hasta que la pasada de métricas lo reancle (§6.7). *(v8)*

#### FR-34: Donaciones

El visitante que quiere sostener el sitio encuentra cómo, sin que se le pida.

**Umbral de Activación:** desde que LC-1…LC-4 estén verificadas. Es un enlace; su coste es cero.

**Consecuencias (verificables):**
- La invitación no aparece en ninguna superficie de lectura —la Página de Cita, la de Colección y, desde la v7.1, la de Obra— ni interrumpe ninguna lectura.
- No introduce JavaScript de terceros en ninguna superficie pública.
- Rechazar o ignorar la invitación no degrada ninguna funcionalidad.
- La invitación vive en la portada, la búsqueda y la página 404. No aparece en la Página de Autor ni en los Directorios (FR-55), que no admiten ningún Modelo (§12). *(v8)*
- En la portada no se pone entre la Cita del Día, su Tarjeta de Obra y sus acciones, que son un solo bloque (FR-37). *(v8)*

#### FR-35: Afiliación de libros *(reescrito en la v7.1)*

Una Obra puede llevar a ediciones en venta de ella, elegidas por una persona, desde su Página de Obra y desde ningún otro sitio.

**Umbral de Activación:** 2.000 sesiones orgánicas/mes. Cruzarlo dispara **solicitar** la cuenta de cada programa que imponga un plazo de ventas mínimas, no encender: las ediciones se curan antes de solicitarla, porque solicitar arranca ese plazo, y por no cumplirlo ya se cerró una vez la cuenta del proyecto. Una tienda sin plazo se da de alta cuando se curen sus ediciones. Encender es un commit posterior.

**Consecuencias (verificables):**
- El enlace vive solo en la Página de Obra, en el bloque de FR-54 y debajo de la edición cotejada. No aparece en la Página de Cita ni en la lista de obras del Autor. Aparece también en la Página de Obra que no se indexa (FR-52): la regla decide qué ve el buscador, no qué ve quien llega desde la atribución. *(v7.1 — antes decía «El enlace sale de la Procedencia ya publicada (FR-2)», y sus superficies eran la Página de Cita y la de Autor.)*
- Tampoco aparece en ninguna de las entradas a la Obra que añade la v8: ni en la Tarjeta de Obra de la Página de Cita (FR-12), ni en el Directorio de Obras (FR-55), ni en las Obras de la portada (FR-9), ni en lo que se comparte de la Página de Obra, que lleva a su canónica (FR-18). Quien llega a la Obra por cualquiera de ellas encuentra el enlace donde vive, en su página. *(v8)*
- La Tarjeta de Obra se publica igual con el Modelo apagado que encendido, como la lista de obras (FR-43): no aloja enlace comercial, y su «Ver la obra y dónde leerla» depende de que la Obra tenga edición cotejada (FR-54), nunca de que tenga ediciones en venta. Lo mismo vale para el salto a «Dónde leer esta obra» de la Página de Obra (FR-51). Se comprueba construyendo el sitio en los dos estados. *(v8)*
- La edición en venta la elige una persona, obra por obra, en la Ficha de Obra. Sin ficha con ediciones no hay enlace, nunca uno aproximado; y no se inventa una obra para poder enlazar: solo tiene página —y por tanto enlace— la Obra con Citas publicadas (FR-51).
- Una Obra sin edición cotejada no muestra ediciones en venta: la de venta nunca va sola (FR-54).
- Admite ediciones impresas y electrónicas; la ficha declara cuál es cada una. La electrónica es lo único entregable en buena parte del público.
- Admite varias tiendas de un conjunto cerrado, porque ningún programa por sí solo cubre todos los países del público. Añadir una tienda es un cambio declarado, y una tienda da una URL, nunca un guion de tercero.
- La marca de afiliado pertenece al Modelo, no a la obra: la URL de una edición se declara limpia, y una que ya traiga marca o sea de otra tienda se rechaza.
- La relación comercial se declara en la misma línea que cada enlace.
- La edición cotejada, la atribución de cada Cita y su Procedencia se leen igual con el Modelo apagado que encendido.

#### FR-36: Producto propio

El Corpus verificado sostiene algo que se vende una vez, no por visita.

**Umbral de Activación:** 5.000 sesiones orgánicas/mes — la meta de SM-2 al mes 6.

**Consecuencias (verificables):**
- **Definición diferida.** Los candidatos son láminas de alta resolución sin marca (reutilizando FR-10 y FR-11), una antología en PDF apoyada en la Procedencia verificada, o un producto de recurrencia sobre la Cita del Día. La elección se toma cuando el umbral se acerque, no ahora. Registrado en §15.
- Lo que se venda no retira del sitio nada que hoy sea gratuito.
- Ninguna Cita deja de ser accesible, copiable ni compartible por existir el producto.

#### FR-37: Publicidad acotada fuera del flujo de lectura

La publicidad, si se enciende, vive donde no está la Cita.

**Umbral de Activación:** 25.000 sesiones orgánicas/mes — la meta de SM-2 al mes 12. Es el último en encenderse porque es el único que cuesta algo al producto.

**Consecuencias (verificables):**
- **La Página de Cita queda excluida.** También la Página de Colección y, desde la v7.1, la Página de Obra, que son superficies de lectura. Admiten publicidad la portada, los resultados de búsqueda y la página 404. *(v8)* La portada la sigue admitiendo aunque lleve la Cita del Día con su Tarjeta de Obra y sus acciones —Copiar, Imagen y compartir—: tener acciones sobre una Cita no la convierte en superficie de lectura. Los resultados de búsqueda la admiten también con filtros, aunque entonces solo listen Citas y se llegue a ellos desde «Buscar en esta obra» o sus análogos de Autor y de Tema. Los Directorios no la admiten, ni ningún otro Modelo (§12).
- Ninguna unidad publicitaria se intercala entre el contenido, por §11. *(v8)* En la portada, la Cita del Día, su Tarjeta de Obra y sus acciones son un solo bloque, y ninguna unidad se pone entre ellos.
- No degrada NFR-7: el contenido principal sigue visible en móvil con 4G en menos de 2,5 s, medido con el Modelo encendido.
- No introduce muro, modal ni aviso previo al contenido, por NFR-10.
- No exige consentimiento invasivo ni identificación individual del visitante, por NFR-11. Un Modelo que lo exija no cumple este FR y no se enciende.

---

### 4.15 Estar en el índice, no solo ser indexable *(v5)*

**Descripción:** El sitio cumple NFR-1 —toda página publicada es rastreable, y la indexable lleva canónica y presencia en el sitemap— y aun así, el 2026-09-02, **Google había indexado 8 de 1.715 URL**.

**Corregido el 2026-09-04, con la primera lectura por familia de FR-40.** Esta feature se escribió culpando al contenido —«páginas finas y casi idénticas»— y esa hipótesis está descartada: sobre 80 URL inspeccionadas hay 2 indexadas y **45 que Google declara desconocidas**, sin diferencia entre familias. Con el sitemap leído y sus 1.715 páginas descubiertas, Google **conoce** las URL y **no las rastrea**. No es un juicio sobre lo que dicen: no ha llegado a leerlas. Lo que queda de esta feature es el instrumento —FR-40— y lo que se va a §4.17 es el remedio. *Ser* indexable es una propiedad del sitio; *estar* indexado es una decisión del buscador, y hasta la v5 el PRD exigía la primera y medía la segunda sin nada en medio. SM-1 llevaba razón al llamarse «el indicador temprano»: su primera lectura la deja entre el 0 % y el 0,5 % —§7 explica por qué el agregado del panel no es la métrica— frente a una meta del 90 %, y por debajo de ella ninguna otra métrica llega a existir. Esta feature es lo que faltaba entre el requisito y la métrica.

**Requisitos Funcionales:**

#### FR-38: El sitio anuncia sus cambios a los buscadores que aceptan el aviso

El sistema notifica cada publicación o modificación de una superficie a los buscadores que admiten aviso de cambio, además de mantener el sitemap.

**Lo primero que hay que decir es lo que este FR *no* arregla.** **Google no acepta aviso de cambio** —no participa en IndexNow; sus canales son el sitemap y su propio rastreo—, y las 1.534 páginas descartadas están en *su* índice, que es el que mide SM-1. Así que FR-38 **no es el remedio de SM-1**: quien ataca SM-1 son FR-39 y §4.16, por la vía del enlace interno y del contenido por página. FR-38 se sostiene por un motivo propio y distinto, registrado en la investigación de la v3.2: el aviso llega a Bing, y **Bing es el índice del que se sirve ChatGPT Search**, de modo que dejar de ser residual ahí es la puerta a la búsqueda por IA. Confundir las dos cosas sería poner primero lo que no mueve la métrica.

**Consecuencias (verificables):**
- Publicar una Cita, un Autor, un Tema, una Colección o una Obra indexable emite un aviso de cambio por un canal abierto y compartido, sin exigir el panel de un proveedor concreto. *(v7.1: la Obra)*
- Avisa de lo que cambió según FR-47, y de nada más: una Cita nueva no avisa de las demás Páginas de Cita de su Autor ni de su Obra, aunque sus rutas de salida y sus recuentos cambien con ella. Avisar de cientos de páginas en cada sesión de siembra enseña al receptor a ignorar el aviso, igual que fechar de más enseña al buscador a no creer el sitemap. *(v8, decisión de Héctor del 2026-10-17.)*
- El aviso se emite desde la reconstrucción, no a mano: una jornada sin editor lo emite igual.
- El sitemap sigue siendo el catálogo; el aviso es el canal de cambios. Ninguno sustituye al otro.
- El sistema registra qué envió y qué respondió el receptor. Que un buscador acepte el aviso **no se cuenta como indexación**: eso solo lo dice FR-40.
- El efecto se mide aparte del de Google, porque son índices distintos. Mezclarlos haría ilegible cuál de las dos vías funcionó.

**Fuera de alcance:** pagar por indexación, o cualquier servicio que prometa posiciones. `[NON-GOAL]`

#### FR-39: El enlace interno se reparte desde donde el buscador ya entra *(APLAZADO el 2026-09-04)*

**No se construye todavía, y el motivo es aritmético:** este requisito reparte enlace **desde superficies indexadas**, y la primera lectura de la serie de FR-40 encontró **dos** en todo el sitio. No hay desde dónde repartir. Se reabre cuando la serie de FR-40 muestre una familia por encima del 20 % indexado; hasta entonces su trabajo lo hace §4.17, que ataca por qué no se rastrea. Lo que sigue escrito abajo es válido y no se toca — solo espera.

**La v8 no lo reabre** *(2026-10-17)*. Los enlaces que añade —la Tarjeta de Obra, «Siguiente» y «De la misma obra» en la Página de Cita, los dos Directorios y la cabecera que los alcanza— son de retención y de alcance: existen para que el visitante siga leyendo y para acortar los saltos de NFR-5, no para repartir enlace desde superficies indexadas, que es lo que este FR pide y sigue sin poder hacerse.

Toda superficie de agregación publicada reparte enlace hacia las Citas que agrega, y el sistema informa de qué superficies no reciben ninguno desde una página indexada.

Lo que este FR añade a NFR-5 es el **origen** del enlace. NFR-5 exige que ninguna página quede huérfana desde la portada. Eso se cumple y no bastó: una página que el buscador no ha indexado no transmite nada, así que un grafo interno perfecto entre páginas invisibles no mueve la aguja.

**Consecuencias (verificables):**
- El sistema distingue, para cada superficie publicada, cuántos enlaces entrantes le llegan **desde superficies indexadas** y cuántos desde el resto. NFR-5 cuenta saltos; esto cuenta procedencia.
- Existe una lista consultable de superficies publicadas con cero enlaces entrantes desde una indexada, ordenada por familia.
- Las superficies de agregación —Autor, Tema, Colección y, desde la v7.1, la Obra indexable— reparten enlace hacia las Citas que agregan. Eran 75 páginas en septiembre de 2026 —35 de Autor, 24 de Tema, 16 de Colección— frente a 1.639 de Cita, así que su capacidad de reparto es limitada por aritmética y el informe la expresa como cifra, no como intención.

#### FR-40: La indexación se lee por familia, no como un total

El editor puede saber qué proporción de cada familia de superficies está indexada, y cuáles no lo están.

**El dato de origen es de Google y no hay alternativa**: solo el buscador sabe qué ha indexado, y Search Console es la única vía. Lo que este FR exige no es prescindir de esa fuente —sería fingir— sino **dejar de leerla a ojo**: traerla de forma reproducible y agruparla como el producto la necesita, que es por familia.

**Consecuencias (verificables):**
- El informe distingue Cita, Autor, Tema, Colección y Obra. El panel da un total y el total engaña: el remedio no es el mismo para las páginas de una frase que para las de agregación, y un porcentaje global no dice cuál de las dos falla.
- La familia Obra cuenta solo sus páginas indexables (FR-52): una página que no puede indexarse, contada como no indexada, fabricaría un cero. *(v7.1)*
- Los dos Directorios (FR-55) no cuentan en la familia de Autor ni en la de Obra, aunque su ruta se parezca a las de esas familias: son dos URL, y meterlas en una familia de muchas falsearía su reparto sin que nadie lo notara. Si forman familia propia o quedan fuera del censo por su nombre, como la portada, lo decide la arquitectura (AD-24); en ningún caso se suman a otra familia. *(v8)*
- La cifra que se compara con SM-1 es la de la familia Cita, no el agregado del sitio.
- El informe registra su fecha de lectura. Un dato de indexación sin fecha es inútil: el índice cambia y la comparación con la meta es temporal.
- Cuando la fuente no está disponible, el informe lo dice y no publica un número, igual que hace §4.14 con la medición.

---

### 4.16 La Página de Autor se gana su propia consulta *(v5)*

**Descripción:** Es la única superficie de contenido que hoy recibe impresiones —solo la comparte la portada, que las recibe por el nombre de la marca— —`/autor/miguel-de-unamuno` y `/autor/baltasar-gracian`, y ninguna Página de Cita— , y la que §4.2 ya llamaba «la segunda fuente de tráfico orgánico», con el 2 % de las URL del sitio. Las nueve consultas que existen son todas de Autor y cuatro son biográficas explícitas. Esta feature le da a esa superficie el contenido que la consulta pide: una semblanza que sitúa, y la **obra** del Autor. Ambas de fuente citable, porque §5 lo exige y no se deroga.

**Requisitos Funcionales:**

#### FR-41: La semblanza sitúa al Autor con fuente

La Página de Autor presenta una semblanza que dice cuándo vivió el Autor, en qué corriente escribió y por qué se le cita, y la atribuye a la fuente de la que procede. Es la misma tríada que FR-4 exige, aquí con su requisito de fuente.

**Consecuencias (verificables):**
- La semblanza declara su fuente y su licencia, como ya hace toda Cita con su Fuente.
- El sistema **no compone** prosa nueva sobre el Autor: o la semblanza procede de una fuente citable admitida, o la escribe una persona que responde de ella. Es §5 sin excepción.
- La tríada se comprueba una a una: años de nacimiento y fallecimiento para el «cuándo vivió», tradición o corriente declarada para el «en qué corriente escribió», y el motivo por el que el Autor está en este Corpus para el «por qué se le cita». Un elemento que la fuente no sostenga se omite; no se rellena.
- No cubre vida privada, polémicas ni recepción crítica: eso es la cobertura enciclopédica que §5 sigue descartando.
- Una semblanza sin fuente declarada no se publica.

#### FR-42: La Página de Autor enumera su obra

La página lista las obras del Autor de las que este Corpus publica Citas, cada una enlazada a su Página de Obra. *(v7.1 — antes «enlazada a las Citas que proceden de ella».)*

**Consecuencias (verificables):**
- La lista se **deriva** de las Procedencias publicadas, y ninguna Ficha de Obra puede añadir a ella una obra sin Citas publicadas. Lo que la ficha decide es el título con que se nombra y qué grafías reúne, no qué obras hay. *(v7.1)*
- Cada obra muestra cuántas Citas publicadas proceden de ella y enlaza a su Página de Obra, que es donde se leen juntas. *(v7.1)*
- Una obra de la que no se publica ninguna Cita no aparece: la bibliografía es la del Corpus, no la del Autor. La página lo dice de sí misma, para no aparentar una completitud que no tiene.
- El año de una obra se muestra cuando las Citas que lo declaran coinciden en él; si discrepan, o ninguna lo declara, se omite el campo y no se infiere. El 2026-10-05 constaba en 31 de 182 obras. *(v7.1 — antes se medía por Cita: el 26,8 % declaraba año.)*

#### FR-43: La lista de obras lleva a la Página de Obra *(reescrito en la v7.1)*

La lista de obras de la Página de Autor lleva a la Página de Obra de cada una, que es donde vive el enlace de afiliación; la lista no lo aloja. *(v7.1 — antes decía «La lista de obras es el lugar donde un Modelo de Ingreso de afiliación puede aparecer».)*

**Consecuencias (verificables):**
- La lista se publica igual con el Modelo de afiliación apagado que encendido, porque no aloja enlace comercial. Se comprueba construyendo el sitio en los dos estados.
- Ni la Página de Autor ni la de Cita son superficies admitidas del Modelo de afiliación. **No es porque §5 lo vede** —§5 veda unidades publicitarias, no todo Modelo—: es que el enlace tiene un solo sitio, la Página de Obra (FR-35, FR-54).
- Lo de §4.14 rige sin excepción: apagado hasta su Umbral, sin guion de tercero, y encender es un commit.

**Fuera de alcance:** si la afiliación de libros es viable. Es la mitad de la pregunta 7 de §14 que sigue abierta; la otra mitad —qué edición se enlaza— la contesta FR-35. `[NON-GOAL]`

---

### 4.17 Que el buscador gaste rastreo en este sitio *(v5, añadida el 2026-09-04)*

**Descripción:** Google conoce las 1.715 URL —el sitemap se leyó el 2/09 y las descubrió todas— y aun así indexa 2 de cada 80. No es descubrimiento, no es contenido y no es SEO técnico: el sitemap, las canónicas, el `robots.txt` y los códigos de respuesta están comprobados y correctos. Es que **un sitio nuevo —en línea desde el 2026-08-13 y con Search Console verificada desde el 2026-09-02—, sin un solo enlace entrante externo, que publicó 1.715 URL de golpe, no recibe presupuesto de rastreo**. Esta feature es la única de la v5 que ataca esa causa; §4.15 la había supuesto en el contenido y se equivocaba.

**Requisitos Funcionales:**

#### FR-44: El sitio tiene señales externas que no se ha dado a sí mismo

Existen enlaces y menciones al sitio desde dominios que no controla el proyecto.

**Consecuencias (verificables):**
- El sitio deja de tener cero dominios de referencia. La cifra sale del informe de enlaces de la propiedad, no de una estimación.
- Las señales proceden de sitios que aceptan una obra de dominio público por lo que es —directorios de recursos abiertos, catálogos de citas, comunidades de lectura—, nunca de compra de enlaces ni de granjas: el sitio no gana rastreo a costa de una penalización posterior.
- Cada señal conseguida se registra con su fecha, para poder cruzarla con la serie de FR-40.

**Fuera de alcance:** comprar enlaces, intercambiarlos, o publicar en sitios cuyo criterio de admisión sea el pago. `[NON-GOAL]`

#### FR-45: El canal propio se usa como fuente de rastreo, no solo de visitas

La publicación en las cuentas propias se aprovecha para que el buscador vea actividad y llegada de personas.

**Consecuencias (verificables):**
- La Cita del Día publicada enlaza siempre a su URL canónica, que ya hace FR-22, y ese enlace se cuenta como señal en el registro de FR-44.
- La cadencia de publicación se sostiene: una cuenta que publica dos veces y calla no produce señal ninguna.
- **No produce FR nuevos de canal:** el Kit Diario de §4.10 ya está construido desde la v2 y es exactamente el instrumento. Lo que cambia es que su valor deja de medirse solo por SM-8.

#### FR-46: Se pide rastreo de lo que importa, no de todo

El editor puede solicitar la inspección y el rastreo de una selección corta de URL, y sabe cuáles ha pedido.

**Consecuencias (verificables):**
- La selección es corta y deliberada —el orden de magnitud de la decena, no del millar—: pedir rastreo de 1.715 URL no es una petición, es ruido.
- Quedan registradas las URL solicitadas y la fecha, para distinguir en la serie de FR-40 lo que entró por petición de lo que entró solo.
- **La petición no se automatiza sobre el Corpus entero.** Es una decisión editorial sobre qué páginas representan el sitio, del mismo carácter que elegir la Cita del Día.

**Fuera de alcance:** cualquier servicio que prometa indexación a cambio de dinero. `[NON-GOAL]`

#### FR-47: El sitemap declara qué cambió y cuándo

Cada entrada del sitemap declara la fecha del último cambio real de esa superficie.

**Consecuencias (verificables):**
- La fecha sale de **cuándo cambió el contenido**, que en este producto es el historial del repositorio donde vive el Corpus. Nunca de la hora de construcción.
- La reconstrucción diaria **no mueve** la fecha de una superficie que no cambió. Un sitio que declara 1.715 páginas nuevas cada día enseña al buscador a no creerle, que es peor que no declarar nada.
- En una Página de Cita, **un cambio real es un cambio en lo que afirma de su Cita**: su texto, su atribución, su Procedencia, la Fuente de la que se tomó su texto, el título de su Obra y sus Temas. Lo que compone para salir de ella —las rutas de salida de FR-12: la Tarjeta de Obra con el año de la Obra y su recuento, «Siguiente», las Citas ofrecidas y sus recuentos— es navegación: cambia cuando entra o sale otra Cita de su Autor, de su Obra o de sus Temas, y no mueve su fecha ni dispara el aviso de FR-38. El año de la Obra que declaran sus datos estructurados (NFR-3) cae del mismo lado que el de la Tarjeta: depende de las demás Citas de la Obra, no de lo que esta afirma. Si la navegación moviera la fecha, cada Cita nueva refecharía todas las de su Autor —308 en el caso de Unamuno, en el repositorio el 2026-10-17— en cada sesión de siembra, que es lo que la consecuencia anterior prohíbe. Es una excepción declarada al criterio de AD-27 —lo que la página pinta, sin excepciones—, aceptada a sabiendas. Se comprueba en la suite como lo demás: una Cita nueva no mueve la fecha de ninguna otra Página de Cita solo por cambiar sus rutas de salida. *(v8, decisión de Héctor del 2026-10-17.)*
- Un listado sí cambia con lo que afirman sus tarjetas: desde que la Tarjeta de Cita nombra la Obra de cada Cita, retitular una Obra cambia también los listados de Tema, de Colección y de Autor que la nombran. *(v8)*
- Una superficie cuya fecha no puede determinarse **omite el campo** en vez de inventarlo, como todo campo opcional en este producto.
- Se comprueba en la suite: que las entradas la declaran, y que dos construcciones del mismo commit dan la misma fecha.

**Por qué está aquí y no en §4.15:** salió de mirar el sitemap el 2026-09-04, con la primera medición ya hecha. Hoy son **1.715 `<loc>` a secas, sin una sola señal de novedad**, en un sitio que reconstruye a diario y que por tanto tiene ese dato y no lo publica. No se afirma que sea la causa —la causa medida es que un sitio nuevo sin señales externas no recibe rastreo—, pero es una señal que el sitio puede dar gratis, que hoy no da, y que apunta al mismo problema.

---

### 4.18 El Corpus cubre a los clásicos, y en profundidad *(v6, 2026-09-05)*

**Descripción:** el Corpus tiene 1.639 Citas de 35 Autores y está **invertido respecto a la demanda**: Manuel González Prada aporta 154 Citas y Federico García Lorca aporta 1. Creció por lo que había disponible y era fácil de extraer, no por lo que se busca — y no podía crecer de otro modo, porque hasta el 2026-09-02 no había demanda medida que consultar. Esta feature lo corrige por el lado que más búsqueda tiene: filosofía antigua y teología, en profundidad por Autor.

**Requisitos Funcionales:**

#### FR-48: De una obra traducida se registra lo que la Fuente declare

Cuando la Fuente declara traductor o año de la traducción, el sistema lo conserva; cuando no, la Cita se publica igual.

**Consecuencias (verificables):**
- El encabezado de la Fuente se conserva entero: si trae `traductor` o `año`, quedan en la Procedencia. Hoy `recuperar.ts` los descarta.
- **No es una puerta.** Una obra traducida sin año de traducción **se publica**. La verificación de derechos ya ocurre —y ocurre mejor— al admitir la Fuente: el conjunto cerrado solo admite Fuentes cuya licencia permite reutilización, y por eso rechaza a las que no.
- El informe de salud dice **cuántas** Citas de obra traducida no traen traductor ni año. Es visibilidad, no bloqueo: sirve para decidir si algún día conviene rastrear una edición, y para que la cifra no sorprenda a nadie.
- **Ajustado el 2026-09-05, y conviene decir por qué.** Se especificó primero como puerta que rompía el build. La sonda sobre Wikisource-es enseñó que el dato existe pero **vive en la edición y no en la obra** —Fedón declara «Azcárate, 1871» y Critón, de la misma edición, no declara nada—, y que exigirlo habría dejado 165 Citas ya publicadas de Séneca en falta por un dato que la Fuente no da. Para autores de la antigüedad el riesgo real es ínfimo —Azcárate murió en 1886— y la comprobación que importa ya la hace el conjunto de Fuentes.

**Fuera de alcance:** rastrear ediciones para completar lo ya publicado. Se informa y se decide aparte. `[NON-GOAL]`

#### FR-49: El Corpus cubre a los clásicos sin diluir lo panhispánico

El catálogo incorpora Autores de la antigüedad y de la tradición teológica, con meta propia y sin tocar el compromiso panhispánico.

**Consecuencias (verificables):**
- Los Autores de tradición `otra` tienen **meta propia**, contada aparte, y no entran en el denominador del suelo panhispánico (§6.1).
- El techo de concentración por Autor sigue rigiendo sin excepción: la profundidad por Autor obliga a que el total crezca en paralelo, no a que uno solo pese más.
- Todo lo demás de la puerta de admisión se aplica igual: dominio público, año de fallecimiento del Autor, Procedencia, y el cotejo contra el documento versionado.
- Se prioriza por **demanda**, no por disponibilidad: entre dos Autores admisibles entra antes el que más se busca.

#### FR-50: La Época agrupa a los Autores que comparten tiempo y escuela

El visitante puede recorrer el catálogo por época —filosofía antigua, patrística, escolástica, y las que el catálogo pida— además de por Autor y por Tema.

**Consecuencias (verificables):**
- La Época agrupa **Autores**, no Citas: es la diferencia con el Tema, y lo que evita que compita con la Página de Cita.
- Un Autor pertenece a lo sumo a una Época, y una Época sin Autores publicados no se publica ni se indexa.
- La Época declara en un solo sitio si es publicable, como toda superficie desde la Historia 12.1.
- **Va la última de esta feature, y con condición:** añade superficies a un sitio con 2 URL indexadas de 1.715, que es el problema que §4.17 ataca. No se construye hasta que la serie de indexación muestre una familia por encima del 20 %.
- El Directorio de Autores (FR-55) no la adelanta: ordena a los Autores alfabéticamente, sin agruparlos por época, escuela ni tradición, y no abre ninguna superficie por Época. La condición de la consecuencia anterior sigue intacta. *(v8)*

---

### 4.19 La Obra tiene página *(v7.1, 2026-10-05)*

**Descripción:** Una página por obra, con URL propia, que hace tres cosas: capta la consulta por obra —«frases del Oráculo manual» es otra búsqueda que «frases de Gracián»—, deja leer juntas las Citas de una misma obra, y es el único sitio donde vive el enlace de afiliación de FR-35. Lo que la distingue de la Página de Autor es su sujeto: una obra, con la Fuente y la licencia de las que se tomó su texto, los Temas que tocan sus Citas y dónde leerla entera; ninguno de esos datos está en la Página de Autor.

**Existir y ser indexable son dos cosas.** Toda Obra con al menos una Cita publicada tiene página, porque es el destino del enlace de la atribución de sus Citas y de la lista de obras de su Autor —y, desde la v8, de la Tarjeta de Obra de sus Citas y del Directorio de Obras—. Indexable solo es la que no repite otra página (FR-52): por eso capta la consulta por obra cuando la obra no es casi todo su Autor, y si lo es, la recoge la Página de Autor. Es una forma de umbral distinta de la del Tema y la de la Colección, que no se publican por debajo del suyo.

**El riesgo que esta feature introduce, y su freno.** Añade 182 Obras con página, 82 de ellas indexables (medido el 2026-10-05), a un sitio cuyo índice deja fuera casi la mitad de sus páginas —1.050 de 2.000 en la lectura del panel de Search Console del 2026-10-03, fuera de la serie de FR-40—, y se abre sin que las Páginas de Autor estén indexadas (18 de 65 en esa misma lectura), que era la condición que la arquitectura le había puesto. A diferencia de la Época (FR-50), no espera a que una familia cruce un umbral de indexación: se eligió medir y parar en vez de precondicionar. El freno es que la familia se mide aparte desde su primer despliegue y tiene criterio de parada (SM-11), y que, si aparecen duplicados, se baja el tope de FR-52 y nunca se parchea una página.

**Requisitos Funcionales:**

#### FR-51: La Página de Obra

Toda Obra con al menos una Cita publicada tiene una página propia que reúne sus Citas y dice de qué obra salen. Realiza UJ-3. Valida SM-11.

**Consecuencias (verificables):**
- Existe para toda Obra con al menos una Cita publicada, sin umbral que la excluya. Una Obra sin Citas publicadas no tiene página.
- Muestra el título de la Obra y su Autor, enlazado a su Página de Autor. El año sigue la regla de la lista de obras (FR-42); si las Citas que lo declaran discrepan, además se avisa.
- Lista sus Citas con la Tarjeta de Cita de los demás listados, cada una enlazada a su Página de Cita; aquí la tarjeta no repite el título de la Obra, que es el de la página. Las lista en el orden del libro: por su posición en el documento cotejado —si la Obra se cotejó en varios documentos, documento a documento, en el orden que fija la arquitectura—, y las que no tienen documento van después, por slug. Ese orden es el de «Siguiente» y el de «De la misma obra» (FR-12). La canónica de cada Cita sigue siendo su Página de Cita, y la de la Página de Obra es la propia, nunca otra URL (NFR-13). *(v8 — antes decía «la misma tarjeta que los demás listados», y el listado ordenaba por slug; el orden del libro, decisión de Héctor del 2026-10-18.)*
- Muestra los Temas que tocan sus Citas.
- Pagina como el listado de Autor (FR-5); las páginas 2 y siguientes llevan solo título, Autor y listado, sin el salto a «Dónde leer esta obra», sin compartir y sin «Buscar en esta obra». *(v8: lo que no llevan.)*
- La página 1 lleva en su cabecera un salto a «Dónde leer esta obra», el bloque de FR-54. El bloque no se mueve: sigue después de las Citas, y el salto solo acorta el camino hasta él. *(v8)*
- La página 1 se puede compartir con los mismos destinos de enlace que la Página de Cita (FR-18), con un texto propuesto que da el título y el Autor —dos hechos, no una descripción (§5)— y con su Tarjeta Social como vista previa. No ofrece la Historia de Instagram, porque no hay Imagen de Obra. *(v8)*
- La página 1 ofrece «Buscar en esta obra», que lleva a la búsqueda con el filtro de la Obra ya puesto (FR-7). No crea ninguna página indexable, porque la búsqueda no se indexa con ningún filtro (NFR-13). *(v8)*
- No compone prosa: ni sinopsis, ni contexto, ni adjetivos (§5). Todo lo que dice sale de hechos derivados del Corpus, salvo la nota de su Ficha de Obra, que escribe una persona y se muestra después de dónde leerla (FR-54).
- Es superficie de lectura, como la Página de Cita y la de Colección, y por eso nunca admite donaciones ni publicidad (FR-34, FR-37). A diferencia de ellas, admite la afiliación (FR-35), que es el único Modelo que aloja.
- Se alcanza desde la atribución de cada Cita de la Obra (FR-2), desde la Tarjeta de Obra de cada una (FR-12), desde la lista de obras de su Autor (FR-42) y desde el Directorio de Obras (FR-55), también cuando no es indexable (NFR-5); la indexable, además, desde las Obras de la portada los días que la portada la elige (FR-9). *(v8 — antes solo desde la atribución y la lista de obras.)*
- Si la Obra es indexable, su página 1 emite la misma vista de superficie que las demás agregaciones, con su marca de origen (FR-22), para que la familia se mida como las otras; eso no cambia en la v8. Además, la página 1 de **toda** Obra, indexable o no, emite la vista de Obra (FR-56), que no cuenta en SM-8. Las páginas 2 y siguientes no emiten ninguna de las dos. *(v8 — antes decía «Emite la misma vista que las demás agregaciones», sin decir que solo la emite la página 1 de una Obra indexable.)*
- Tiene Tarjeta Social con hechos —cuántas Citas, de qué Autor y el año si consta—, nunca con la nota.
- Expone datos estructurados que la identifican como la misma obra que nombran sus Citas (NFR-3).
- La fecha de su último cambio es la más reciente entre su Ficha de Obra y sus Citas (FR-47); si cuentan también los documentos de los que sale su orden lo decide la arquitectura (AD-27).
- Cumple NFR-8…NFR-10 como el resto de superficies públicas, sea indexable o no.

#### FR-52: La Obra se indexa por lo que contiene, no por existir

Una Página de Obra es indexable solo cuando no repite otra página del sitio; si la repite, existe sin indexarse.

**Regla de indexación:** al menos 2 Citas publicadas, y menos del 90 % de las Citas publicadas de su Autor.

**Consecuencias (verificables):**
- Con una sola Cita, la página repetiría esa Cita y competiría con su canónica; con el 90 % o más de su Autor, listaría lo mismo que su Página de Autor con otra cabecera. En los dos casos la página existe, es rastreable y transmite enlace (`noindex, follow`), y queda fuera del sitemap y de los resultados de la búsqueda interna: es el mismo estado de las páginas 2 y siguientes de FR-5, aplicado por contenido. *(v8 — antes «fuera… de la búsqueda interna»: lo que queda fuera es la página como resultado.)*
- Quedar fuera de los resultados no es quedar fuera de la búsqueda: la Obra sigue siendo un valor del filtro de Obra (FR-7), porque el filtro vive en las Citas indexadas que la nombran y no en la página de la Obra. Quien busca las Citas de una obra pequeña las encuentra aunque esa obra no tenga página indexable. *(v8)*
- Es una sola regla y la consultan igual todos los que la necesitan: la página, el sitemap —que anuncia exactamente las Páginas de Obra indexables, ni una más—, los resultados de la búsqueda interna (FR-7), el aviso de cambio (FR-38), el informe de indexación (FR-40) y, desde la v8, las Obras de la portada (FR-9) y la vista de Obra, que dice si la página es indexable (FR-51, FR-56). Ninguno discrepa de otro, y se comprueba sobre el sitio construido. Dos lectores no la aplican, a propósito: el filtro de Obra, que ofrece toda Obra con Citas publicadas, y el Directorio de Obras (FR-55), que las enlaza todas, porque enlazar una página `noindex, follow` no la indexa. *(v8)*
- Se recalcula en cada construcción y se corrige sola en los dos sentidos: cuando las demás obras de un Autor llegan al 10 % de sus Citas, la que era casi todo su Autor pasa a indexarse sin tocar nada; y una Obra indexada que deja de cumplir la regla sale del sitemap.
- Mientras la familia está congelada por el criterio de parada de SM-11, ninguna Obra entra en el conjunto indexable —ni una nueva ni una existente que pase a cumplir la regla— hasta que se levante la congelación; las que dejen de cumplirla salen igual. Lo que queda —la lista que fijó la congelación, menos las que han salido— es el **conjunto indexable congelado**. *(Precisado el 2026-10-07; el nombre, v8.)*
- La congelación no alcanza a la navegación (SM-11): con la familia congelada siguen igual la Tarjeta de Obra, el Directorio de Obras, compartir la Página de Obra y el resto de los enlaces que llevan a ella; las Obras de la portada salen solo del conjunto indexable congelado. *(v8, decisión de Héctor del 2026-10-17.)*
- Si dos lecturas seguidas de FR-40 muestran Páginas de Obra que el buscador declara duplicadas, se baja el tope del 90 %; nunca se corrige una página suelta.

#### FR-53: La Ficha de Obra fija la URL y el título

Cada Obra tiene una Ficha de Obra que fija su URL y el título que el sitio publica, y en la que una persona decide lo que no se puede derivar.

**Consecuencias (verificables):**
- La URL de una Obra es legible, lleva el Autor y la obra, y no cambia aunque se corrija el título (NFR-4).
- Ninguna Obra con Citas publicadas se publica sin su ficha; si falta, la construcción se detiene y dice cómo crearla. La crea el sistema al publicarse la primera Cita de una Obra nueva, sin decidir nada; nadie la crea a mano.
- Una ficha cuya Obra se queda sin Citas publicadas avisa y no detiene la construcción: retirar una Cita no puede tumbar el sitio.
- El título es siempre una de las grafías que declaran sus Procedencias: corregirlo es elegir otra de ellas, nunca escribir una nueva. Es el único con que el sitio nombra la Obra, en toda superficie y en todo material de salida.
- Reunir dos grafías de una misma obra, o declarar que dos títulos parecidos son obras distintas, se decide en la ficha. La ficha reúne grafías de una misma obra, no partes de ella: un capítulo o una fábula que la Fuente publica como obra propia sigue siéndolo.
- Una grafía la reclama a lo sumo una ficha; si dos la reclaman, la construcción se detiene.
- Dos títulos del mismo Autor en que uno empieza por el otro producen un aviso, no una parada, y decidirlo en la ficha lo silencia.
- Dos grafías de Citas del mismo Autor que solo difieren en mayúsculas, tildes o signos detienen la construcción hasta que la discrepante se restituye al literal de su Fuente, documentándola (FR-24). Si las dos son literales de su Fuente, el título lo elige una persona en la ficha.
- **Nunca se reescribe la Procedencia de una Cita para reunir o separar grafías**, porque la Procedencia es lo que dice la Fuente (FR-23); la única excepción es restituir el literal que declara su Fuente, que es lo que hace documentar una Cita (FR-24).
- Las ediciones en venta, la nota, la elección del título y reunir o separar grafías solo las decide una persona, nunca un agente. La nota tiene como máximo 160 caracteres, describe la obra o su edición cotejada y no la califica (§5, §11).
- Reunir dos Obras ya publicadas retira la URL de la absorbida. Hasta que exista la redirección es una ruptura declarada de NFR-4, y se avisa.

**Fuera de alcance:** redirigir la URL de una Obra fusionada o retirada. Se aplaza hasta que haya una Página de Obra indexada. `[NON-GOAL]`

#### FR-54: Dónde leer esta obra

La Página de Obra dice, al pie, dónde leer la obra entera: la edición cotejada, que es gratuita, y, con el Modelo de afiliación encendido, las ediciones en venta debajo de ella.

**Consecuencias (verificables):**
- Muestra las Fuentes de las que se tomaron sus Citas, con su licencia, y, cuando hay edición cotejada, al menos un enlace a ella: el documento, si es uno, o la entrada de la obra en su Fuente, si son varios.
- Nunca afirma un cotejo que no ocurrió: si alguna Cita de la Obra no tiene documento, dice cuántas; una Obra sin ninguna Cita cotejada lo dice y no enlaza ninguna edición.
- Va en la primera página, después de las Citas y nunca entre ellas (§11, NFR-10).
- Las ediciones en venta aparecen **debajo** de la edición cotejada, nunca en su lugar: el visitante ve la edición que se verificó y, al lado, la que se puede comprar (FR-35). Una Obra sin edición cotejada no muestra ediciones en venta.
- Con el Modelo apagado, o sin ediciones en la ficha, el bloque es solo la edición cotejada: no queda línea, hueco ni contenedor de las ediciones. Con el Modelo apagado, la página se construye idéntica con y sin ediciones declaradas (FR-33). Se comprueba construyendo el sitio en los dos estados.

---

### 4.20 Los Directorios *(v8, 2026-10-17)*

**Descripción:** Dos páginas que no listan Citas, sino lo que el Corpus tiene: todos sus Autores y todas sus Obras. Hasta la v8 la lista de Autores vivía en la portada —unos 5.900 px de lista, ordenada por el nombre tal como se escribe, así que Miguel de Cervantes estaba en la M—, y a una Obra solo se llegaba desde la atribución de sus Citas y desde la lista de obras de su Autor. Con 135 Autores con Citas y 517 Obras en el repositorio el 2026-10-17, ninguna de las dos cosas se deja recorrer. Atiende dos peticiones de Héctor del 2026-10-16: poder buscar en la lista de Autores, que es larga, y que las Obras sean ya más visibles.

**Son dos páginas, y seguirán siendo dos.** Con el Corpus crece lo que listan, no su número. Por eso no necesitan una regla de indexación propia, como la de la Obra (FR-52), ni una puerta que espere a la indexación de otra familia, como la de la Época (FR-50): esa regla y esa puerta existen para familias de muchas páginas. No reproducen ninguna Cita, así que no compiten con ninguna Página de Cita (NFR-13), y no abren al buscador ninguna página que no alcanzara ya: las Obras que no se indexan recibían enlace desde la atribución de sus Citas.

**El riesgo que introducen, y su freno.** Dan a cada Autor y a cada Obra un enlace interno más dentro de la ventana de 8 semanas en que SM-11 compara la indexación de las dos familias. Para no inclinar la comparación, los Directorios y la cabecera que los enlaza se despliegan el mismo día que la Tarjeta de Obra, que da a cada Obra un enlace desde cada una de sus Citas, y esa fecha se declara para que el informe de indexación la nombre en su línea SM-11 (§6.7).

**Requisitos Funcionales:**

#### FR-55: Directorios

El visitante puede recorrer en una página todos los Autores del Corpus, y en otra todas sus Obras, y encontrar el que busca filtrando la lista mientras teclea. Realiza UJ-6. Valida SM-4.

**Consecuencias (verificables):**
- El **Directorio de Autores** (`/autores/`) lista todo Autor con al menos una Cita publicada, y ninguno más, de la A a la Z por apellido, con letras de salto solo para las iniciales que tienen algún Autor. La inicial se toma sin tilde, la Ñ es letra propia, y a igualdad de clave decide el slug del Autor.
- El orden por apellido sale de la clave de orden de cada Autor (FR-15), nunca del nombre tal como se escribe: Miguel de Cervantes va en la C.
- Cada Autor figura con su nombre, enlazado a su Página de Autor; sus años, si constan; y cuántas Citas suyas se publican, en singular cuando es una.
- El **Directorio de Obras** (`/obras/`) lista toda Obra con al menos una Cita publicada, agrupadas por Autor en el mismo orden que el Directorio de Autores y, dentro de cada Autor, en el de la lista de obras de su Página de Autor (FR-42). Cada Obra figura con su título —el que fija su Ficha de Obra (FR-53)—, enlazado a su Página de Obra; su año, con la regla de la lista de obras (FR-42); y cuántas Citas suyas se publican.
- El Directorio de Obras enlaza también las Obras que no se indexan (FR-52), que siguen siendo `noindex, follow`: el Directorio dice qué hay, y la regla decide qué ve el buscador, no qué ve el visitante.
- La congelación de la familia Obra no recorta el Directorio de Obras: no alcanza a la navegación (SM-11).
- Los dos llevan un campo que filtra la lista mientras se teclea, con la misma tolerancia a acentos y mayúsculas que la búsqueda (FR-7): «gonzalez» encuentra a Manuel González Prada. En el de Autores, lo tecleado casa con el nombre; en el de Obras, con el título y con el nombre de su Autor. Cuántos quedan se anuncia a quien usa lector de pantalla (NFR-9).
- Sin JavaScript no hay campo de filtro, la lista está entera y las letras de salto funcionan (NFR-2).
- Los dos son indexables, con canónica propia y presencia en el sitemap (NFR-1), y tienen Tarjeta Social con hechos, como toda página del sitemap.
- En la búsqueda interna se encuentran por su título, con su propio tipo de resultado, y no por lo que listan: buscar el nombre de un Autor o el título de una Obra devuelve su página, no el Directorio que la nombra (FR-7).
- No reproducen ninguna Cita ni componen prosa (§5): listan Autores y Obras con hechos del Corpus. No son superficie de lectura.
- Toda página pública los enlaza desde su cabecera, junto a la búsqueda, y la portada los enlaza también (FR-9). Con ellos, toda Página de Autor y toda Página de Obra queda a dos saltos de la portada (NFR-5).
- La cabecera que los enlaza se usa a 320 px de ancho sin desplazamiento horizontal y, a 360 × 640 px, no saca el texto de la Cita de la primera pantalla (FR-1, NFR-8).
- No cuentan en la familia de lo que listan en ninguna serie por familia (FR-40): el Directorio de Obras no es una Página de Obra, aunque su dirección se le parezca.
- No admiten ningún Modelo de Ingreso, como la Página de Autor: ni la invitación de FR-34, ni la afiliación de FR-35, ni publicidad (FR-37). Se publican igual con cualquier Modelo encendido o apagado, y se comprueba construyendo el sitio en los dos estados.

**Fuera de alcance:** índices de Temas y de Colecciones —los 24 Temas y las 16 Colecciones caben en la portada (FR-9, FR-26)—; agrupar los Autores por Época, que es FR-50 y sigue esperando su puerta; y páginas que crucen un Autor o una Obra con un Tema (NFR-13). `[NON-GOAL]`

---

### 4.21 La lectura se mide aparte de la carga *(v8, 2026-10-17)*

**Descripción:** Hasta la v8 el sitio contaba cargas de página, y una carga no es una persona leyendo. La medición del receptor de LC-4, leída el 2026-10-17, lo enseña: de las 3.702 vistas de Página de Cita registradas del 2026-09-04 al 2026-10-16, el 38 % lleva la marca de Threads con una firma mecánica —de 15 a 23 rutas al día entre el 14 de septiembre y el 11 de octubre, menos desde entonces, y, en casi la mitad de los pares de ruta y jornada, exactamente dos vistas con marca y una sin ella—; otro 18 % son vistas sin marca en la misma ruta y jornada que una de esas, y el resto son casi todo ráfagas de una vista por ruta en cientos de rutas, de rastreadores que ejecutan JavaScript. Lo humano y orgánico ronda una vista al día, así que toda tasa de §7 calculada sobre visitas mide, sobre todo, máquinas. Esta feature le da a §7 otro denominador, la **lectura** —el acto medido del glosario, que no es la superficie de lectura—, y lo que hace falta para juzgar dos peticiones de la v8 que hasta ahora no se podían medir: que el visitante se quede, y que lo que comparte traiga a alguien.

**No es una sesión, y no lo pretende.** Sin identificador de visita (NFR-11) no se puede seguir a una persona de una página a otra, y esta feature no lo intenta. Mide totales —lecturas, salidas internas por zona, búsquedas, llegadas por difusión— y con ellos aproxima lo que SM-3 y SM-4 pedían a la sesión: las salidas internas entre las lecturas de una superficie dicen cuánto se continúa desde ella, y por qué enlace (§7).

**Va la primera, y a la vez que lo demás.** Ninguna otra feature de la v8 se puede juzgar sin ella, pero no se espera a su línea base para construir las demás: lo decidió Héctor el 2026-10-17. Lo que sí espera a la línea base son las metas (§6.7).

**El riesgo que introduce, y su freno.** Que la lectura no separe a las personas de las máquinas tan bien como se supone (§15): la línea base nacería contaminada, y con ella las metas. El tiempo mínimo que define la lectura es un umbral con nombre, y ajustarlo es un cambio visible y fechado, nunca una corrección a mano de una cifra ya leída.

**Requisitos Funcionales:**

#### FR-56: Medición de la lectura

El sistema registra cuándo una página se lee, no solo cuándo se carga, y qué enlace interno sigue el visitante, sin identificar a nadie. Valida SM-3…SM-7, SM-12, SM-13, SM-C3, SM-C4 y SM-C5.

**Consecuencias (verificables):**
- **Lectura.** Toda página que registra una vista —también la vista de Obra de abajo— registra además una lectura, como mucho una por carga: cuando la página lleva visible un tiempo mínimo acumulado o, antes, a la primera interacción del visitante con ella. El tiempo mínimo es un umbral con nombre, declarado junto a los demás umbrales del producto; su valor lo fija la arquitectura.
- Una carga en una pestaña oculta, o que se cierra antes del tiempo mínimo sin ninguna interacción, no produce lectura, y que el navegador restaure el desplazamiento o salte a un ancla no cuenta como interacción. Que eso deje fuera a las precargas y a los renderizadores reales es el supuesto de §15, y se comprueba antes de fijar ninguna meta: se compara qué proporción de las vistas llega a lectura en las firmas mecánicas que delató el receptor —la marca de Threads, las ráfagas de una vista por ruta— frente al resto.
- Una página que el navegador restaura al volver atrás o adelante cuenta como carga nueva, y puede registrar otra lectura, pero sin la marca con la que llegó (abajo).
- **Salida interna.** Pulsar un enlace interno que pertenece a una zona registra una salida interna con esa zona. Las zonas forman un conjunto cerrado: la Tarjeta de Obra, «Siguiente», «De la misma obra», las demás rutas de salida (FR-12), la atribución —también el Autor que nombra la cabecera de la Página de Obra—, los Temas —de la Cita, de la Página de Obra y de la portada—, la Cita del Día, las Obras, los Autores y las Colecciones de la portada, las Tarjetas de Cita del listado de las Páginas de Autor, de Tema, de Colección y de Obra —no las de «De la misma obra» ni las de «Más de {Autor}», que registran la zona de su bloque—, la lista de obras de la Página de Autor (FR-42), los resultados de búsqueda, los Directorios, la paginación y la cabecera. Un enlace fuera de ellas no registra salida.
- Cada enlace registra una sola zona, la más concreta que lo contiene: «Siguiente» registra la suya también dentro de la Tarjeta de Obra, y la Tarjeta de Obra de la Cita del Día, la de la Tarjeta. De qué superficie sale lo dice la página donde ocurre, no la zona.
- Una salida se atribuye a la página exacta donde ocurre, y la continuación solo se calcula sobre las superficies que registran lectura: las salidas de una página sin lectura —la búsqueda, la página 404, las páginas 2 y siguientes de un listado— no entran en la de ninguna otra. La de la búsqueda la mide SM-13.
- Abrir un enlace en una pestaña nueva con el botón central o con una pulsación larga no registra salida. No se mide, y se dice: toda cifra calculada con salidas internas lo declara, porque la continuación que mide es una cota inferior de la real y el rebote que se aproxima con ella queda por encima del real.
- **Búsqueda.** Cada búsqueda se registra una sola vez, cuando se asienta —al enviarla, al pulsar un resultado o al dejar la página, con el último estado—, nunca por cada tecla ni por cada cambio de filtro: como mucho una vez por cada estado distinto de texto y filtros en una misma carga. Volver a un estado ya registrado, o que el navegador restaure la página, no registra otra, y dejar la página registra el último estado solo si no se registró ya. Lleva cuántos resultados dio, en tramos de un conjunto cerrado, y qué filtros usó —Autor, Obra, Tema—, y **nunca el texto de la consulta**, que sigue siendo exclusivo del registro de la búsqueda sin resultados (FR-8). Un filtrado sin texto que no da resultados se registra como búsqueda en el tramo de cero.
- **Vista de Obra.** La página 1 de toda Página de Obra registra una vista de Obra que dice si la Obra es indexable o no (FR-52); las páginas 2 y siguientes no registran ninguna. La vista que ya emitía la página 1 de una Obra indexable (FR-51) sigue igual, y SM-8 también: la vista de Obra es un registro aparte y no entra en SM-8. Así la familia Obra se mide entera, también lo que no se indexa, sin que una página que no puede indexarse entre en las cifras de las indexables.
- Los dos Directorios (FR-55) registran vista y lectura como las demás superficies indexables.
- **Llegada por difusión.** Una página que se abre con marca de difusión (FR-18) la registra con su lectura, junto con su destino; una vista con marca y sin lectura no cuenta como llegada, para no contar máquinas. Las dos marcas se cotejan y se guardan como dice FR-22. Cada una se cuenta una vez por llegada: tras leerla, la página la quita de su dirección sin recargarse ni cambiar su canónica, así que una recarga o una vuelta atrás no la cuentan otra vez, y quien copia la dirección de la barra no la arrastra.
- **Vocabulario cerrado.** Cada dato nuevo —la zona, el tramo, los filtros usados, si la Obra es indexable, el destino de la difusión— toma sus valores de un conjunto cerrado y solo existe en su registro. Añadir un evento o un valor exige modificar el módulo de medición, como en FR-20.
- **Sin identificador.** Ningún registro lleva cookie, identificador de visita, agente de usuario, página de procedencia ni texto libre —salvo la consulta sin resultados de FR-8—, y ningún campo sirve para unir dos registros de la misma persona (NFR-11). El tiempo de cada registro sigue siendo la jornada: una hora o un instante encadenarían una salida con la lectura que la sigue. La continuación se calcula entre totales, nunca siguiendo a nadie.
- **Ningún dato nuevo se pierde en silencio.** El receptor de LC-4 sabe guardar cada registro y cada dato nuevo antes de que el sitio los envíe, y se comprueba con un registro de prueba antes de desplegar el sitio. Un dato que llega vacío sin error es indistinguible de un cero, y un cero fabricado es peor que no medir.
- Las vistas se siguen registrando como hasta ahora y no se reinterpretan: lo que cambia es la unidad de las tasas de §7, que pasa a ser la lectura —la búsqueda asentada, en SM-6 y SM-13—.
- No introduce JavaScript de terceros ni degrada NFR-7. Sin JavaScript la página se lee entera y no se mide nada, como hasta ahora.
- **La línea base** de §7 de cada métrica empieza el día en que el sitio en vivo registra lo que ella mide —la lectura, con la Épica 23; la difusión, cuando la 25 pone la marca en lo compartido; la continuación de los Directorios, cuando la 26 los publica— y se cierra al reunir un mínimo de lecturas de su superficie —de búsquedas asentadas, en las de búsqueda—, que es un umbral con nombre y no un número de días. Hasta entonces, ninguna de las métricas que valida tiene meta numérica, y las que la tenían quedan en suspenso (§6.7).

**Fuera de alcance:** reconstruir sesiones o recorridos. Identificar la visita, aunque sea con un identificador efímero o una huella, lo veda NFR-11, y es la razón por la que SM-2 y los Umbrales de Activación siguen sin poder medirse (§6.7). Tampoco entra analítica de terceros. `[NON-GOAL]`

---

## 5. No-Objetivos (Explícitos)

- **No somos una red social.** Sin cuentas, sin perfiles, sin comentarios, sin votos.
- **No somos un agregador.** El Corpus se cura, no se rastrea de otros sitios. Se evaluó explícitamente en la v2 extraer de un sitio de citas existente y se descartó por tres razones concurrentes: sus condiciones lo prohíben, su compilación está protegida, y —lo decisivo— publica texto y nombre sin obra ni año, así que **nada de lo extraído pasaría la puerta de admisión de FR-13**. Ver §4.11.
- **No traducimos Citas para publicarlas.** Una traducción propia produce una frase que no consta en ninguna edición, es decir, una Cita sin Procedencia verificable. Solo entra texto en español de una edición identificable.
- **No competimos con Wikipedia en cobertura biográfica** *(estrechado en la v5)*. La Página de Autor sitúa a la persona y enumera su obra; no narra su vida entera, no cubre polémicas ni recepción crítica, y no aspira a ser la página que alguien lea *en lugar de* una enciclopedia. Hasta la v5 este no-objetivo decía «no somos una enciclopedia de autores» y se escribió **sin ningún dato de demanda**; los primeros datos de Search Console (§7) muestran que las únicas consultas que alcanzan el sitio son de Autor y que cuatro de nueve son explícitamente biográficas. Lo que el no-objetivo protegía —no llenar páginas de refrito— lo protege ahora §4.16, que exige fuente citable y acota qué se dice. Lo que prohibía de más, se retira.
- **No aspiramos al volumen en la v1.** Un catálogo pequeño y verificado, no uno grande y dudoso.
- **No traducimos.** El producto es en español y las Citas se publican en español.
- **No monetizamos antes de su umbral.** La v1 se diseñó sin ingreso alguno. La v3 no deroga esa regla: diseña los cuatro Modelos de Ingreso y los deja apagados hasta que el tráfico medido cruce el Umbral de Activación de cada uno (§4.14, §12). Lo que se adelanta es el diseño, nunca el cobro.
- **No ponemos publicidad donde se lee.** Ninguna unidad publicitaria aparece en la Página de Cita, en la de Colección ni, desde la v7.1, en la de Obra: son las superficies donde el producto cumple su promesa y el punto de entrada real desde buscadores. §11 y NFR-10 tienen prioridad sobre cualquier ingreso.
- **No inventamos texto y lo presentamos como real.** El sistema no crea ni parafrasea el texto de una Cita, ni compone prosa nueva sobre una persona real **ni sobre una obra** —sinopsis, contexto o valoración— y la publica como si estuviera documentada. Seleccionar y transcribir literalmente de una edición identificable **sí** es admisible, y es exactamente lo que hace el sembrado de §4.11, lo ejecute el editor o un agente. La distinción es entre *escoger lo que alguien escribió* y *escribir en su lugar*. **La semblanza de un Autor entra en la prohibición**: es prosa nueva sobre una persona real, así que o procede de una fuente citable o la escribe una persona que responde de ella. **La nota de una Ficha de Obra también** *(ampliado en la v7.1)*: la escribe una persona que responde de ella, o no existe, y nunca un agente.

## 6. Alcance

### 6.1 Dentro de la v1

- Páginas de Cita, Autor y Tema, todas indexables (FR-1…FR-6).
- Búsqueda tolerante a acentos y por fragmento (FR-7, FR-8).
- Portada con Cita del Día (FR-9).
- Imagen de Cita descargable (FR-10, FR-11).
- Descubrimiento por Autor y Tema (FR-12).
- Herramienta interna de ingesta y curación (FR-13…FR-16).
- Fundamentos de SEO y rendimiento (§8).
- Corpus de arranque: ~2.000 Citas de 150–250 Autores, con **mínimo del 40 % de Autores de tradición latinoamericana sobre los Autores que cuentan para el suelo** — todos menos los de tradición `otra`, según la redefinición de más abajo. El suelo es explícito porque el sesgo hacia España es el resultado por defecto de cualquier curación no vigilada.

  **Redefinido el 2026-09-05: el suelo se mide sobre todos los Autores menos los de tradición `otra`, no sobre el Corpus entero.** El compromiso del brief es «no escorar hacia España», y eso es una afirmación sobre el reparto **entre peninsulares y latinoamericanos** — nunca sobre cuántos clásicos universales hay. Medido sobre todos, cada Séneca que entra diluye un compromiso que no tenía nada que ver con él: con cuarenta clásicos nuevos el indicador caería al 24 % sin que un solo autor hispánico hubiera cambiado de sitio. Medido sobre hispánicos, hoy va al **56,2 %** y sigue igual después. **El suelo no baja: cambia su denominador.** Se escribe aquí y no en un comentario para que nadie dentro de seis meses crea que se relajó a escondidas.

  La tercera categoría —`otra`— existe en el esquema desde la v1 y hoy la ocupan tres Autores. Deja de contar en el denominador del suelo y pasa a tener meta propia, porque un catálogo panhispánico que además cubre a los clásicos es más que uno que solo cubre a los clásicos.

  Los Autores **sin tradición declarada sí cuentan** en el denominador. El campo es opcional a propósito —obligarlo empujaría a rellenarlo a ojo y la proporción pasaría a medir suposiciones—, así que un Autor sin declarar es un dato que falta, no un Autor que no cuente: sacarlo del denominador dejaría que un fallo de captura *mejorase* el indicador. Dentro es la opción conservadora, que es la que corresponde a un suelo.

### 6.2 Fuera de la v1

- **Cuentas, favoritos y colecciones** — requieren autenticación y almacenamiento por usuario; no sirven al tráfico orgánico, que es el mecanismo de crecimiento. Diferido a v2.
- **Aportes de usuarios** — exigen moderación y verificación de procedencia desde el día uno. Diferido a v2. `[NOTE FOR PM]` Es la vía natural de escalado del Corpus; revisar en cuanto la curación interna sea el cuello de botella.
- **Boletín y notificaciones** — dependen de tener audiencia. Diferido.
- **Motor de recomendación** — la relación por Autor, Obra y Tema basta. *(v8 — antes decía «la relación por Autor y Tema basta con 2.000 Citas». La Obra entró en la relación en la v7.1, y el Corpus del repositorio tiene 4.420 Citas el 2026-10-17: lo que sostiene la frase no es el tamaño del Corpus, sino que la relación se deriva de él y se compone en la construcción, igual para todos los visitantes (FR-12).)*
- **Monetización y publicidad** — decisión con datos, no con supuestos. **Revisado en la v3:** la regla se conserva y se hace operable. La v3 diseña los Modelos de Ingreso y fija su Umbral de Activación en cifras de tráfico medido; ninguno se enciende por debajo del suyo. Ver §4.14 y §12.
- **App nativa** — la web responsive cubre el caso de uso completo.
- **Multilingüe** — no es el producto.

### 6.3 Alcance de la v2

La v1 construyó el producto y quedó verificada sin haberse publicado nunca en el sentido de §13. La v2 tiene un objetivo distinto y más estrecho: **ponerlo delante de personas y aprender de ellas**. Todo lo que no sirva a eso queda fuera.

**Dentro:**

- Renombrado de marca a Sabiduría de Bolsillo en todas las superficies, incluida la marca de la Imagen de Cita (§0).
- Compartición directa a redes (FR-17…FR-20).
- Kit Diario de Publicación para las cuentas propias (FR-21, FR-22).
- Sembrado incremental del Corpus desde fuentes con Procedencia (FR-23…FR-25).
- Condiciones de Lanzamiento cumplidas y verificadas (§13).

**El orden importa.** El renombrado va primero, antes de que exista una URL indexada.

**Reescrito en la v3 como puerta de activación, no como orden de construcción.** La redacción original decía que el sembrado y las Condiciones de Lanzamiento iban *antes* que la compartición. La v2 la incumplió —la compartición se construyó con 38 Citas y sin medición— sin consecuencias, porque nunca se compartió de verdad. Eso demuestra que la restricción real nunca fue sobre el orden de construir, sino sobre el de **publicar**:

> Se puede construir en cualquier orden. **Nada se publica ni se comparte hasta que LC-1…LC-4 estén verificadas.** Compartir con un Corpus corto y sin medición gasta el alcance de las cuentas en un sitio que todavía no puede retener a nadie ni contar si lo hizo — y ese gasto es irreversible: la primera impresión de una cuenta se da una vez.

La intención se conserva íntegra; lo que se elimina es un bloqueo al trabajo que no protegía nada.

**Fuera de la v2, y por qué:**

- **Vídeo y por tanto YouTube.** Las otras cuatro cuentas consumen imagen fija, que el sistema ya sabe componer. El vídeo exige un motor propio —composición temporal, audio, duración— que no es una historia sino un producto. Se revisa cuando las cuentas de imagen demuestren que traen visitantes.
- **Publicación automática en las cuentas.** El Kit Diario deja el material compuesto; publicar lo hace Héctor. Automatizarlo exige credenciales de cuatro plataformas, sus revisiones de aplicación y su mantenimiento, para ahorrar dos minutos al día.
- **Cuentas, favoritos y aportes de usuarios.** Siguen diferidos por las razones de §6.2, que la v2 no cambia.

### 6.4 Alcance de la v3

La v2 quiso poner el producto delante de personas y no llegó a hacerlo: lo construyó todo y dejó sin abrir las cuatro puertas de §13. La v3 tiene un objetivo en dos tiempos: **abrir esas puertas y, con el sitio ya publicado, convertirlo en algo que crece por sí solo y se sostiene**.

**Dentro:**

- **Cierre de las Condiciones de Lanzamiento.** LC-1…LC-4 verificadas. No produce FR: es ejecución de `DESPLIEGUE.md` §1–§3. Va primera y condiciona todo lo demás por la puerta de activación de §6.3.
- **Crecimiento del Corpus a volumen.** De 38 Citas hacia el orden de las ~2.000 de §6.1, respetando el suelo del 40 % de Autores de tradición latinoamericana. **No produce FR nuevos:** las herramientas son las de §4.11, ya construidas y probadas. Es operación, no desarrollo.
- **Colecciones Curadas** (FR-26…FR-28) — la superficie que captura la cola larga.
- **Ampliación del canal propio** (FR-29…FR-32) — lote, piezas de varias Citas, pieza en movimiento y pieza de Colección.
- **Monetización por umbral** (FR-33…FR-37) — cuatro Modelos diseñados, encendidos por separado.

**El reloj empieza aquí.** El mes 0 del producto es la jornada en que LC-1…LC-4 quedan verificadas, y toda métrica con plazo se cuenta desde ahí (§13). Hasta la v3, promesas como «5.000 sesiones orgánicas/mes al mes 6» no tenían origen porque el lanzamiento no había ocurrido.

**Fuera de la v3, y por qué:**

- **Publicación automática en las cuentas.** Sigue fuera por las razones de §6.3: credenciales de cuatro plataformas y sus revisiones de aplicación para ahorrar dos minutos al día. FR-29 ataca el mismo problema por el lado barato — componer por adelantado en vez de publicar solo.
- **Boletín y notificaciones.** Siguen diferidos por §6.2: dependen de tener audiencia, y la v3 es precisamente la que va a averiguar si la hay.
- **Cuentas, favoritos y aportes de usuarios.** Sin cambios respecto a §6.2.
- **La definición del producto propio.** FR-36 fija su umbral, no su contenido. Elegir entre lámina, antología y recurrencia sin saber quién visita el sitio sería el supuesto que §12 existe para evitar.

### 6.5 Alcance de la v5

**El origen es un dato, no una idea.** El 2026-09-02 quedaron verificadas LC-1…LC-4 y llegaron las primeras cifras de Search Console. Dicen dos cosas, y las dos son la v5.

**Dentro:**

- **Medir la indexación** (FR-40) — el instrumento. Va primero, y la decisión se pagó sola: descubrió en una tarde que las otras dos features de esta ronda atacaban la causa equivocada.
- **Que el buscador gaste rastreo** (FR-44…FR-46) — *añadida el 2026-09-04*. Señales externas, el canal propio como fuente de rastreo, y petición deliberada de las URL que representan el sitio. **Es la única que ataca la causa medida.**
- **La Página de Autor se gana su consulta** (FR-41…FR-43) — semblanza con fuente y lista de obras. Es la única superficie de contenido con impresiones, y sigue siendo donde está la demanda.

**Reordenado el 2026-09-04, con el dato delante.** El orden original —indexación y luego contenido— era correcto en su instinto y equivocado en su contenido:

- **FR-38** (anunciar cambios) se queda **solo por su motivo propio** —los índices que sí aceptan aviso, y con ellos la búsqueda por IA—, nunca como remedio de SM-1. Google conoce ya las 1.715 URL: no hay nada que anunciarle.
- **FR-39** (repartir enlace desde superficies indexadas) queda **aplazado**: hay dos superficies indexadas en todo el sitio, así que no hay desde dónde repartir.
- **§4.16 va después de §4.17.** Enriquecer 35 páginas de las que Google conoce 11 e indexa 1 no produce visitas mientras nadie las rastree. El contenido no sobra: llega tarde si va antes. **Enmendado el 2026-10-05:** FR-42 —con FR-43, que solo dice adónde lleva su lista— se construye con la Página de Obra (§6.6) sin esperar a que cierre §4.17. La semblanza de FR-41 sigue detrás de §4.17 hasta que se decida el orden de la Épica 17 entera; la premisa original ya no basta para sostenerlo, porque la lectura del panel del 2026-10-03 da 18 Páginas de Autor indexadas de 65.

**Fuera de la v5, y por qué:**

- **Encender la afiliación de libros.** FR-43 construye la superficie *(v7.1: la superficie del enlace es ahora la Página de Obra, FR-54)*; encenderla es FR-35 y su Umbral, y la pregunta 7 de §14 dice por qué eso está más lejos de lo que parecía. La lista de obras se construye por su valor propio y no queda inservible si la afiliación no llega nunca.
- ~~**Elegir qué edición se enlaza.**~~ **CONTESTADA el 2026-10-05:** la elige una persona en la Ficha de Obra, debajo de la edición cotejada (FR-35, FR-54).
- **Sembrar obra que el Corpus no publica.** La bibliografía es la del Corpus, no la del Autor. Completarla sería inventar cobertura, que es justo lo que §5 sigue descartando.
- **Cobertura biográfica enciclopédica.** Estrechar el no-objetivo de §5 no lo deroga: sigue fuera la vida entera, la polémica y la recepción crítica.

### 6.6 Alcance de la v7.1

**El origen es una petición, medida.** El 2026-10-05 Héctor pidió una página por obra que capte su consulta, deje leer juntas sus Citas y sea el sitio del enlace de afiliación. Se abre sabiendo que el buscador aún no indexa todas las Páginas de Autor, y por eso con medición propia y criterio de parada.

**Dentro:**

- **La Obra tiene página** (FR-51…FR-54): la página, la regla de indexación por contenido, la ficha que fija URL y título, y dónde leer la obra entera.
- **Enmiendas con trabajo de construcción:**
  - FR-2: la atribución nombra la Obra con su título y lleva a ella, también en lo copiado y en el material de salida, por FR-53.
  - FR-7: la Obra en la búsqueda interna.
  - FR-33 y FR-35: el enlace de afiliación se muda a la Página de Obra, con el acto que dispara su Umbral.
  - FR-38: el aviso de la Obra indexable.
  - FR-40: la familia Obra en el informe.
  - FR-42 y FR-43: la lista de obras del Autor lleva a ella.
- **Enmiendas sin trabajo nuevo:** FR-12, FR-34, FR-37, NFR-1, NFR-3, NFR-13, SM-C2 y SM-C4, que añaden la Obra a una regla o a una exclusión.

**El orden importa.** Se construye después de las Historias 20.1–20.3 y con la serie de indexación leyendo de nuevo (Historia 20.4), para que la familia se mida desde su primer despliegue (SM-11). La ficha va antes que la página. Antes de publicar ninguna URL de Obra se fija la regla de indexación y se deciden las reuniones y separaciones de obras ya conocidas —«Del sentimiento trágico de la vida/I», «Sobre la brevedad de la vida» frente a «De la brevedad de la vida», los dos «Proverbios y cantares» y la grafía «Sor/sor Filotea»—, porque reunir después rompe una URL. El enlace de afiliación nace apagado.

**Fuera de la v7.1, y por qué:**

- **Solicitar la cuenta y encender la afiliación.** Son actos de una persona con su Umbral (FR-35), no construcción.
- **Qué tiendas entran.** Es la pregunta 6 de §14.
- **Sinopsis o contexto de la obra.** Lo veda §5.
- **Redirigir la URL de una Obra fusionada o retirada.** Se aplaza hasta la primera Página de Obra indexada.
- **Sembrar obra que el Corpus no publica.** Sigue fuera por §6.5.
- **La pasada de métricas.** Las series de tráfico y demanda, su relación con los Umbrales y la revisión de SM-2 son otra señal y no entran. *(v8 — antes seguía con la nota para el PM de esa pasada: dueño Héctor, reapertura en su propia pasada del PRD y, cuando entrara, la familia Obra dentro, porque «hasta entonces SM-11 es su única medida». La v8 absorbe la mitad de sitio de esa pasada, con la familia Obra medida entera (FR-56); lo que queda de ella, con su nota, está en §6.7.)*

### 6.7 Alcance de la v8

**El origen es una petición, y una medición que la ordena.** El 2026-10-16 Héctor pidió preparar la siguiente versión «ahora que estamos teniendo un poco de tráfico»: mejorar la portada; poder buscar en la lista de Autores; buscar Citas por Obra, por Autor o por Tema, y filtrarlas; conservar la Cita del Día; dar a la Obra mucho más protagonismo, para trabajar después la afiliación; compartir directamente en las historias de Instagram, en Threads y en Facebook; que el visitante se quede, y que sea parte del crecimiento compartiendo. La medición, leída ese día y releída con la ventana cerrada el 2026-10-17, dijo dos cosas que ordenan la ronda. El tráfico es menos de lo que parece: lo humano y orgánico ronda una vista al día, y el resto son una firma mecánica con marca de Threads y ráfagas de rastreadores (§4.21). Y casi nadie comparte (§4.9), y ni Instagram, ni TikTok, ni X, ni Facebook han traído una sola visita marcada. Héctor fijó el 2026-10-17 las dos decisiones que se siguen de ahí: **la Página de Cita es el centro** —se entra por ella—, y la portada se mejora como superficie de retorno sin revocar FR-9 ni §10; y **la medición nueva va a la vez que lo demás**, en la primera épica, sin esperar a una línea base para construir. El diseño aprobado, con sus quince decisiones, está en `docs/superpowers/specs/2026-10-17-v8-cita-como-centro-design.md`.

**Dentro**, en seis épicas que se trocean por superficie para poder atribuir cada cambio: desplegada de una vez, la ronda movería todas las cifras juntas y ninguna diría qué las movió.

- **Épica 23 · Medir la lectura** (FR-56): la lectura, la salida interna con su zona, la búsqueda asentada, la vista de Obra y la llegada por difusión.
- **Épica 24 · La Obra se ve y la Cita sigue** (FR-12, reescrito): la Tarjeta de Obra bajo la atribución, «Siguiente cita de esta obra», «De la misma obra» y «Más de {Autor}» sin las de la misma Obra.
- **Épica 25 · Compartir donde se publica** (FR-10, FR-11, FR-17, FR-18 reescrito y FR-20): la Historia de Instagram con una imagen 9:16, solo en pantallas táctiles que pueden compartir el fichero; WhatsApp, Facebook y Threads siempre a la vista, y «Más opciones…»; la marca de difusión en todo lo que se comparte; el dominio legible al pie de las dos imágenes; y compartir también la Página de Obra. Se cierra con la prueba manual de dispositivos anotada en `DESPLIEGUE.md` —iPhone, Android y los navegadores de las aplicaciones de Facebook, Instagram y Threads—, que el CI no puede hacer.
- **Épica 26 · Directorios y cabecera** (FR-55): los Directorios de Autores y de Obras, la clave de orden del Autor (FR-15) y la cabecera «Autores · Obras · Buscar» en toda página.
- **Épica 27 · Buscar con filtros** (FR-7 y FR-8): filtrar por Autor, por Obra —también las que no se indexan— y por Tema, también sin escribir; el estado de la búsqueda en su dirección; «Mostrar 30 más»; «Buscar en esta obra / en {Autor} / en este Tema»; y los Autores destacados por número de Citas, con el suelo de tradición latinoamericana de §6.1 garantizado.
- **Épica 28 · La portada de retorno** (FR-9 y §10): la línea con las cifras del Corpus, el campo de búsqueda, la Cita del Día con su Tarjeta de Obra y sus acciones, seis Obras indexables que rotan con la jornada —del conjunto indexable congelado, si SM-11 congela la familia—, los Temas, las Colecciones con su criterio y los ocho Autores con más Citas, con el mismo suelo.
- **Enmiendas con trabajo de construcción**, fuera del núcleo de su épica:
  - FR-3 y FR-10: Copiar, Imagen y compartir también sobre la Cita del Día de la portada (28).
  - FR-4, FR-6 y FR-26: la Tarjeta de Cita de los listados lleva el título de su Obra (24), y la página 1 de Autor y de Tema gana «Buscar en…» (27).
  - FR-12 y FR-35: la Tarjeta de Obra y el salto a «Dónde leer esta obra», construidos y comprobados en los dos estados de la afiliación (24).
  - FR-19: las Tarjetas Sociales de la Cita y de la Obra, verificadas en el validador de Facebook antes de ofrecer ese destino (25).
  - FR-21: el Kit Diario gana la imagen 9:16 (25).
  - FR-22: la marca de origen queda solo para las cuentas propias, se coteja aparte de la de difusión y se cuenta una vez por llegada (23 y 25).
  - FR-38 y FR-47: la navegación nueva no mueve la fecha de la Página de Cita ni dispara el aviso, con su prueba en la suite, y los listados se fechan también con la ficha de Obra de sus Citas; enmienda el criterio de AD-27 (24).
  - FR-40: los Directorios no se cuentan en la familia de lo que listan; si son familia propia o quedan fuera del censo lo decide AD-24 (26).
  - FR-51: el orden del libro en todo el listado, también en las páginas 2 y siguientes (24); y, en la página 1, el salto a «Dónde leer esta obra» (24), compartir (25), «Buscar en esta obra» (27) y la vista de Obra (23).
  - NFR-5 y NFR-8: decidir si las Citas a tres saltos se comprueban al construir, y ninguna superficie con desplazamiento horizontal a 320 px, con la cabecera nueva (26).
  - SM-11: se declaran la fecha del despliegue que repare la publicación, la del despliegue conjunto de las Épicas 24 y 26 y, si la 28 llega antes del juicio, la de la 28, y el informe de indexación las nombra en su línea SM-11. Las constantes y la línea del informe se construyen con el arreglo de la publicación, que se despliega primero, y cada fecha se anota el día que su despliegue llega al sitio en vivo.
- **Enmiendas sin trabajo nuevo:** §0; el glosario; §2.2 y los recorridos de §2.3, con el nuevo UJ-6; FR-33, FR-34, FR-37, FR-39, FR-50 y FR-52; NFR-1, NFR-2, NFR-7, NFR-11 y NFR-13; §6.2 y §6.6; §10, §11 y §12; §13, §14 y §15; y las métricas de §7: SM-3…SM-7, SM-C3 y SM-C4, y las nuevas SM-12, SM-13 y SM-C5, que se calculan con lo que registra FR-56; SM-8, que sigue en vistas, separa la marca de origen de la de difusión y declara el corte de su serie cuando la marca pasa a contarse una vez por llegada (FR-22); SM-C1, que dice que la línea de cifras de la portada no es ella, y SM-C2, que deja fuera a los Directorios. Añaden lo nuevo a una regla o a una exclusión, o dicen qué no cambia: FR-39, por ejemplo, dice que la v8 no lo reabre.

**El orden importa.** Toda épica depende de la 23, y la 28 de todas, pero lo que más importa es el orden en que se despliegan, y cada fusión a la rama principal despliega. Por eso ninguna épica de la v8 se fusiona con la integración continua en rojo, y se fusionan en el orden de abajo: con la publicación rota, el primer despliegue en verde sacaría varias a la vez y ninguna se podría juzgar por separado. *(2026-10-18.)*

- **La 23, primero.** Sin la lectura no se puede juzgar ninguna otra. Las metas de §7 salen de su línea base y nunca antes, porque antes serían metas sobre cargas de máquinas; hasta entonces, las metas numéricas de SM-3…SM-7 —el 65 %, el 1,8, el 3 %, el 15 % y el 2 %— quedan en suspenso. Cada métrica tiene su línea base desde que el sitio en vivo registra lo que mide y hasta reunir un mínimo de lecturas (FR-56); el mes 0 de §13 sigue siendo el de SM-1 y SM-2. Antes de su primera historia necesita la decisión de arquitectura sobre el presupuesto de guion de toda página que emite vista: a la Página de Cita le quedan unos 40 bytes, y la 23 añade guion a todas. Si la decisión es sacar la medición a un fichero, eso enmienda AD-6 y el criterio de la Historia 2.1 —la página no envía JavaScript—, y es trabajo de la 23.
- **La 24 y la 26, juntas, por SM-11.** La Tarjeta de Obra pone un enlace a su Obra en cada Página de Cita dentro de la ventana de 8 semanas en que SM-11 compara la indexación de la familia Obra con la de Autor. Desplegada sola, la Obra ganaría enlace interno y el Autor no, y SM-11 mediría el enlace y no la familia. Con los Directorios y la cabecera el mismo día, las dos familias lo ganan a la vez: las dos épicas llegan a la rama principal en la misma fusión, y la fecha de ese despliegue en vivo —no la del commit— se declara junto a la del primer despliegue de Obras, para que el informe de indexación la nombre en su línea SM-11. Si la 24 llega al sitio en vivo antes de que la continuación de la Página de Cita tenga su línea base, se juzga contra su propia serie y contra SM-C5, y se dice.
- **La 25 y la 27, después**, en cualquier orden entre ellas: la 25 necesita la marca de difusión y los destinos de la 23, y la decisión del presupuesto de guion, porque sus disparadores van en línea en la Página de Cita; la 27, los Directorios de la 26.
- **La 28, al final.** Necesita lo de las cuatro anteriores y la misma decisión de presupuesto, porque la Página de Cita y la portada lo comparten. Además inclina SM-11 en el otro sentido: quita de la portada el enlace directo a cada Autor salvo los ocho destacados (FR-8) —los demás pasan a quedar a dos saltos— y añade Obras. O se despliega después del juicio de SM-11, desde el 2026-12-05, o su fecha se declara igual; sin la credencial de Search Console no hay juicio, y la 28 va por la fecha declarada. SM-11 se juzga sabiéndolo.
- **Nada de esto llega a nadie con la publicación rota.** Desde el 2026-10-11 las ejecuciones que publican el sitio fallan en las pruebas de documentos, y lo que se sirve es el Corpus de entonces: 1.894 Citas, 65 Autores y 180 Obras, 81 de ellas indexables, frente a 4.420 Citas, 135 Autores con Citas y 517 Obras, 277 indexables, en el repositorio el 2026-10-17. Arreglarlo es un trabajo aparte, no una épica de la v8, y es condición de que la v8 llegue a alguien y de que la Épica 23 tenga línea base. El despliegue que lo arregle es además la mayor perturbación de SM-11: dentro de su ventana hará pasar en vivo las Obras indexables de 81 a 277 y los Autores de 65 a 135, con páginas que el buscador no ha visto. Su fecha se declara como la de la 24 y la 26, y el informe de indexación la nombra en su línea SM-11. *(2026-10-18.)*

**Fuera de la v8, y por qué:**

- **Favoritas, boletín e instalar el sitio como aplicación.** Siguen fuera (§6.2, §12): cuestan JavaScript o datos personales. La petición de guardar la Cita del Día se atiende conservándola, con sus reglas de siempre.
- **Un archivo de la Cita del Día.** Se recalcula en cada construcción y no se guarda. Guardarla exigiría un commit diario que movería fechas y avisos sin que cambiara nada (FR-38, FR-47), y recalcular el pasado daría otra Cita en cuanto cambian las aptas para portada.
- **Efemérides** («nació un día como hoy»). El Corpus solo guarda el año.
- **Páginas que crucen un Tema con un Autor o con una Obra.** Repetirían agregaciones que ya existen (NFR-13). «Buscar en esta obra / en {Autor} / en este Tema» atiende la misma necesidad sin crear ninguna combinación indexable.
- **Índices de Temas y de Colecciones.** Los 24 Temas y las 16 Colecciones caben en la portada; solo los Autores y las Obras necesitan Directorio (FR-55).
- **Los tres diseños en el formato 9:16, y el autocompletado de la búsqueda.** La Historia de Instagram sale sin elegir diseño a propósito: cada decisión antes de compartir es una ocasión de no compartir (FR-11). El autocompletado es otra capacidad que la de filtrar (FR-7) y no entra.
- **Encender la afiliación de libros.** La Obra gana protagonismo ya como navegación, y la venta viene después: la afiliación sigue solo en la Página de Obra y apagada. Encenderla espera al juicio de SM-11, desde el 2026-12-05; a la primera tienda con su marca, que declara Héctor; y a que su Umbral se reancle a una cifra medible (abajo). Lo primero no lo exige FR-35: lo decidió Héctor para esta ronda, para no arrancar el plazo de la cuenta sobre una familia que quizá haya que congelar.
- **Aportes de usuarios.** Que el visitante sea parte del crecimiento se atiende con la difusión (SM-12), no con aportes, que siguen fuera por §6.2.
- **Reabrir FR-39 o la Época (FR-50).** Los enlaces nuevos de la v8 sirven a quien ya está en el sitio; no son el reparto desde superficies indexadas de FR-39. Si alguna de las dos puertas se ha cruzado lo dice la serie de FR-40, no la lectura del panel del 2026-10-03, y lo decide Héctor cuando haya credencial para leerla.
- **Los actos de Héctor, que no son construcción y condicionan las cifras.** Ninguno es de un agente:
  - dar la credencial de Search Console, sin la que SM-11 no se puede juzgar;
  - llevar al dominio del sitio los enlaces del canal propio —el Linktree, la biografía de TikTok, que hoy apunta a un dominio que no sirve el sitio (responde 402), y el campo web de Facebook—;
  - averiguar y anotar quién publica cada día enlaces a Citas con la marca de Threads, que es el 38 % de las vistas de Cita registradas;
  - el tachado de la Historia 21.2, que lleva las Citas aptas para portada de 16 —que se repiten cada 16 días— a 120 o más, y que es, de todos, el que más retorno promete por hora suya, porque la Cita del Día es lo que la portada enseña a quien vuelve;
  - revisar las claves de orden que proponga el sistema, que no bloquea nada;
  - decidir, antes del 2026-12-05, si la ventana de 8 semanas de SM-11 se reinicia desde el despliegue que repare la publicación o se compara solo lo publicado el 2026-10-10 (SM-11, pregunta 10 de §14);
  - y, para cerrar la Épica 25, la prueba manual de dispositivos y la verificación de las Tarjetas Sociales en el validador de Facebook (FR-19), que piden una sesión de Facebook y teléfonos con las aplicaciones instaladas.
- **La mitad de tráfico de la pasada de métricas.** La v8 absorbe la mitad de sitio: SM-3…SM-7, SM-C3, SM-C4 y la familia Obra, todas sobre lecturas salvo SM-6, que va sobre búsquedas asentadas (FR-56), con sus metas en suspenso hasta la línea base. No absorbe la otra mitad: SM-2, SM-9, los Umbrales de Activación (§12.1, FR-33) y las series de tráfico y de demanda de Search Console, que se leen sin FR propio y sin relación escrita con los Umbrales. SM-2, SM-9 y los Umbrales siguen contados en sesiones orgánicas, que el sitio no puede medir sin identificar la visita (NFR-11), así que §7 queda a sabiendas con unidades distintas: lecturas, y búsquedas asentadas en SM-6 y SM-13, para lo que el sitio mide de quien llega; vistas para SM-8, y sesiones para lo que espera su propia pasada. `[NOTE FOR PM]` Dueño: Héctor; se reabre en su propia pasada del PRD cuando la serie de tráfico tenga tres meses leídos —la condición del borrador del 2026-10-04—, o antes si lo pide. Cuando entre, debe incluir la familia Obra en las series de tráfico y de demanda, donde todavía no se cuenta, y reanclar los Umbrales a una cifra que el sitio pueda medir, que es condición de encender la afiliación.

## 7. Métricas de Éxito

**Desde la v8, lo que se mide en el sitio se cuenta en lecturas y no en vistas, y sus metas están en suspenso** *(v8)*. Toda tasa de esta sección que sale del receptor de medición —SM-3 a SM-7, las nuevas SM-12 y SM-13, y las contra-métricas SM-C3, SM-C4 y SM-C5— se calcula sobre **lecturas** —la página estuvo visible un tiempo mínimo o recibió una interacción (§3, FR-56)— o, las de búsqueda (SM-6 y SM-13), sobre búsquedas asentadas, una por consulta. Ninguna se calcula ya sobre vistas, que cuentan cargas. La razón es una medición: leído el 2026-10-17, el receptor tenía 3.702 vistas de Cita en las seis semanas que acabaron el 2026-10-16, y lo humano y orgánico rondaba **una vista al día**. El resto eran cargas de máquinas —una firma mecánica bajo la marca de origen de Threads y ráfagas de una vista por ruta en cientos de rutas—. Una tasa sobre vistas habría medido rastreadores. La familia Obra entra entera en estas métricas, se indexe o no, y SM-11 deja de ser su única medida.

**Las metas numéricas que esas métricas llevaban —el 65 % de SM-3, el 1,8 de SM-4, el 3 % de SM-5, el 15 % de SM-6 y el 2 % de SM-7— quedan en suspenso.** No se retiran ni se rebajan: dejan de compararse con nada hasta que haya línea base. La de cada métrica empieza el día en que el sitio en vivo registra lo que mide —no el día en que se construye— y se cierra al reunir un mínimo de lecturas, que es un umbral con nombre y no un número de días (FR-56): con una lectura humana al día, dos semanas de calendario serían unas catorce lecturas, y una meta fijada sobre tres eventos no es una meta. Con esa línea base, una pasada del PRD las confirma o las rehace, y fija por primera vez las de las métricas nuevas (pregunta 9 de §14). Fijarlas antes sería fijarlas sobre cargas de máquinas.

**La v8 no absorbe la pasada de métricas entera** (§6.7). Quedan fuera SM-2, SM-9 y los Umbrales de Activación de §12.1, que siguen escritos en sesiones orgánicas aunque el sitio no las mida, y las series de Search Console. Esta sección tiene por eso, a sabiendas, unidades distintas: lecturas y búsquedas asentadas para lo que se mide en el sitio, vistas para SM-8 y sesiones para lo que espera su propia pasada. SM-1, SM-2, SM-9, SM-10 y SM-11 no cambian de medida; SM-8 tampoco cambia de unidad, pero su serie tiene el corte que declara su enmienda.

**Primarias**

- **SM-1 — Indexación.** ≥ 90 % de las Citas publicadas indexadas a los 3 meses del lanzamiento. Valida FR-1, FR-38…FR-40 y §8. Es el indicador temprano: si las páginas no se indexan, ninguna otra métrica llega a existir.

  **Primera lectura, 2026-09-02 (mes 0), en el índice de Google.** Search Console informa **8 URL indexadas y 1.534 en «Detectada, actualmente no indexada»** sobre las 1.715 del sitemap. Ese agregado **no es SM-1**: esta métrica se mide sobre **Citas publicadas** (1.639), y el panel no separa por familia. Con el peor de los repartos posibles —que ninguna de las 8 sea una Cita— SM-1 estaría en **0 %**; con el mejor, en 0,5 %. En cualquiera de los dos, la métrica está a dos órdenes de magnitud de su meta. La cifra que se compare con el 90 % sale de FR-40, que sí separa por familia, y no de este agregado.

  **Hito intermedio, añadido en la v5:** el 90 % a los 3 meses se conserva como meta y se le pone un escalón comprobable antes — **≥ 10 % de las Citas publicadas indexadas al mes 2** (hacia noviembre de 2026). No es rebajar la meta: es que un salto de 0 a 90 sin punto intermedio no distingue «va lento» de «no se mueve», y esa distinción es la que decide si la hipótesis de la pregunta 8 de §14 es falsa.

  La métrica se cumplía sola en el papel mientras nada la atacaba: NFR-1 exige que las páginas *sean* indexables y se cumple, pero *estar* indexado lo decide el buscador. §4.15 existe para llenar ese hueco, y hasta la v5 el PRD no tenía ni un requisito entre el NFR y esta métrica.
- **SM-2 — Tráfico orgánico.** 5.000 sesiones orgánicas/mes al mes 6; 25.000 al mes 12. Valida FR-1, FR-4, FR-6.

  **El mes 0 fue el 2026-09-02**, así que el mes 6 cae hacia marzo de 2027 y el mes 12 hacia septiembre. Primera lectura: **0 clics, 26 impresiones en 13 días, posición media 49,4.**

  **Esa cifra no admite proyección, y conviene que quede escrito.** Veintiséis impresiones son señal cualitativa —de qué se busca— y no volumen del que estimar nada. Lo cualitativo sí es nítido y es lo que decide la v5: las nueve consultas que existen son **todas** de Autor, cuatro son biográficas explícitas (`unamuno biografia`, `quien fue unamuno`), y las únicas páginas con impresiones son dos Páginas de Autor y la portada. **Ninguna Página de Cita ha recibido una sola impresión**, con el 95,6 % de las URL del sitio.

**Secundarias**

- **SM-3 — Resolución de la intención.** Rebote < 65 % en Páginas de Cita *(v8: meta en suspenso)*. Valida FR-1, FR-2, FR-3.

  **Mientras no haya sesión, se aproxima** *(v8)*, y sin identificador de visita no la hay (NFR-11). El rebote aproximado de la Página de Cita es 1 − su continuación, que es la proporción de salidas internas entre lecturas de Páginas de Cita (FR-56). Tiene tres sesgos conocidos y se lee con ellos. Lo que se abre en pestaña nueva no se mide, así que la continuación es una cota inferior y el rebote aproximado queda por encima del real. Sin sesión no se sabe qué lectura abrió un recorrido, así que la cifra es en rigor de abandono y no de rebote: cuenta también la última página de un recorrido que empezó en otra. Y si una lectura pudiera aportar más de una salida, la cifra dejaría de ser una proporción. Por eso no se compara con el 65 %, que se escribió para sesiones, sino consigo misma a lo largo del tiempo.
- **SM-4 — Fondo del sitio.** ≥ 1,8 páginas por sesión *(v8: meta en suspenso)*. Valida FR-12, FR-4 y, desde la v8, FR-9 y FR-55.

  **Mientras no haya sesión, se aproxima por la continuación** *(v8)*: salidas internas entre lecturas, por superficie —la Página de Obra incluida, se indexe o no— y por zona, que es el bloque de la página desde el que se sale (FR-56). La continuación de la Página de Cita juzga la Épica 24; la de los Directorios de Autores y de Obras, la Épica 26; y la de la portada, con sus zonas —la Cita del Día y su Tarjeta de Obra, las Obras, los Temas, las Colecciones, los Autores y la cabecera—, la Épica 28: es donde empieza UJ-6. Solo se calcula donde hay lecturas (FR-56). Por zona dice qué retiene —la Tarjeta de Obra, el enlace a la siguiente Cita, las rutas de salida—, que es lo que una cifra de páginas por sesión nunca dijo. Lleva los sesgos de SM-3, y por eso tampoco se compara con el 1,8.
- **SM-5 — Circuito de compartición.** ≥ 3 % de las lecturas de Página de Cita generan una acción de copiado o de descarga de Imagen de Cita. *(v8 — antes «de las visitas a Página de Cita»; la meta, en suspenso.)* Numerador y denominador son de la misma superficie: solo cuentan los copiados y las descargas hechos en una Página de Cita. Los que se hacen sobre la Cita del Día en la portada se informan aparte, sobre las lecturas de la portada, y nunca se suman a estos. Valida FR-3, FR-10. Es la métrica que justifica el coste de la feature más cara de la v1. Las descargas en que cae «Historia de Instagram» llevan su destino (FR-20) y no entran: no las eligió el visitante, sino el navegador al rechazar la entrega; se informan aparte.
- **SM-6 — Cobertura de la búsqueda.** < 15 % de búsquedas internas con cero resultados *(v8: meta en suspenso)*. Valida FR-7, FR-8.

  **Se cuenta por búsqueda asentada y con los filtrados dentro** *(v8)*. Una búsqueda cuenta una vez por consulta, nunca por pulsación de tecla ni por cada cambio de filtro (FR-56), y cuenta igual si solo filtra, sin texto. SM-6 son las búsquedas asentadas en el tramo de cero resultados entre todas las búsquedas asentadas, filtrados incluidos. El numerador **no** es el registro de consultas sin resultados de FR-8, que guarda el texto para la curación y en el que un filtrado sin texto no entra: si lo fuera, ese filtrado entraría en el denominador y no en el numerador, y SM-6 bajaría sin que nadie encontrara más.
- **SM-7 — Compartición efectiva.** ≥ 2 % de las lecturas de Página de Cita generan una compartición, de imagen o de enlace. *(v8 — antes «de las visitas a Página de Cita»; la meta, en suspenso.)* Como en SM-5, solo cuentan las comparticiones hechas en una Página de Cita; las de la portada y las de la Página de Obra se informan aparte, cada una sobre las lecturas de su superficie. Valida FR-17, FR-18. Se mide aparte de SM-5 a propósito: copiar y descargar son usos privados, compartir es el único que puede traer a otra persona.

  **La Historia de Instagram que cae en la descarga no cuenta aquí** *(v8)*. Solo cae cuando el navegador rechaza la entrega, porque donde no puede compartir el fichero —el navegador de la aplicación de Facebook en Android, donde la v8 supone que está la audiencia principal (§15)— el botón no aparece (FR-17). Esa descarga lleva el destino del botón (FR-20) y no suma aquí ni en SM-5: se informa aparte, y un intento de compartir que falló no se confunde con un copiado ni con una compartición. *(v8 — antes la Historia caía en la descarga en todo navegador sin hoja para ficheros, sumaba a SM-5 y no se distinguía de la descarga que el visitante eligió.)*
- **SM-9 — Cobertura de la cola larga.** Sesiones orgánicas que aterrizan en una Página de Colección, como proporción del total orgánico. Valida FR-26. Sin objetivo numérico en la primera pasada: la pregunta es si la superficie captura consultas que las otras cuatro no capturaban, y eso se responde comparando las consultas de entrada, no un porcentaje.
- **SM-10 — Ingreso por Modelo.** Ingreso mensual atribuido a cada Modelo de Ingreso activo, junto al tráfico que lo produjo. Valida FR-33…FR-37. Se mide por Modelo y no agregado a propósito: la decisión que informa es cuál merece seguir encendido, y un total no la responde.
- **SM-8 — Rendimiento del canal propio.** Visitas atribuidas a cada cuenta de Sabiduría de Bolsillo, por red y por jornada. Valida FR-21, FR-22. No lleva objetivo numérico: en la v2 la pregunta no es cuánto trae, sino **cuál de las cinco redes trae**, porque de eso depende dónde se invierte el tiempo del mes siguiente.

  **Solo la marca de origen** *(v8)*. SM-8 cuenta la marca de los enlaces de las cuentas propias y nunca la marca de difusión de lo que comparte un visitante, que es de SM-12: una visita que traiga las dos cuenta en cada métrica por la suya (FR-22). Se sigue contando en vistas, como desde la v2, porque su pregunta es qué red trae y no qué hace quien llega, y su serie es la de la Historia 20.1; la lectura lleva la misma marca (FR-56), así que leerla además sobre lecturas no exige tocarla. Desde el despliegue de la Épica 23, la marca se cuenta una vez por llegada, y una recarga o una vuelta atrás ya no la cuentan otra vez (FR-22): la serie de la Historia 20.1 tiene ahí un corte, su fecha se anota, y las cifras de antes y de después no se comparan como una sola serie. La vista que la v8 añade a toda Página de Obra (FR-51) no entra: SM-8 sigue contando la vista de siempre. Se lee sabiendo que el 38 % de las vistas de Cita lleva la marca de Threads con una firma mecánica (§4.21): hasta saber quién publica esos enlaces, la cifra de Threads no se lee como personas.
- **SM-11 — Indexación de la familia Obra** *(v7.1)*. Proporción indexada de las Páginas de Obra indexables, leída por familia con FR-40 y comparada con la de Autor. No lleva objetivo numérico: el listón es relativo. Las dos familias se leen la misma jornada y enteras. **Criterio de parada:** si a las 8 semanas del primer despliegue es peor que la de Autor, se congela la familia hasta entender por qué: no se curan ediciones en venta, no se pide rastreo de sus páginas, no se publican Piezas que enlacen a ella, no se enciende en ella la afiliación, y ninguna Obra entra desde entonces en el conjunto indexable, ni nueva ni existente: la congelación fija como techo la lista de las indexables en ese momento, y de ella solo se sale por dejar de cumplir la regla de FR-52; lo que queda es el conjunto indexable congelado. Las páginas siguen naciendo de las Citas, porque son el destino de su atribución. Valida FR-51, FR-52.

  **La congelación no alcanza a la navegación** *(v8)*. Congela el trabajo sobre la familia —ediciones en venta, rastreo, Piezas y afiliación— y la indexación nueva, no los enlaces internos: la Tarjeta de Obra de cada Página de Cita, el Directorio de Obras y compartir una Página de Obra siguen igual con la familia congelada, porque son caminos del visitante hacia páginas que ya existen y no trabajo sobre la familia. Las Obras de la portada se eligen entre las indexables, así que con la familia congelada salen solo del conjunto indexable congelado.

  **La v8 cae dentro de su ventana, y la sesga en los dos sentidos** *(v8)*. El primer despliegue de Obras fue el 2026-10-10, y SM-11 se juzga hacia el 2026-12-05. La Página de Cita de la v8 lleva un segundo enlace a su Obra —la Tarjeta de Obra— y el Directorio de Obras enlaza todas las Obras: las dos cosas inclinan la comparación hacia la Obra. Para no inclinarla, la Página de Cita nueva y el Directorio de Autores con la cabecera nueva se despliegan juntos (Épicas 24 y 26), de modo que Obra y Autor ganan enlaces internos el mismo día; la fecha de ese despliegue conjunto en vivo se declara junto a la del primer despliegue de Obras, y el informe de indexación la nombra en su línea SM-11. La portada de la v8 (Épica 28) inclina en el otro sentido: quita el enlace directo de la portada a cada Autor salvo los ocho destacados (FR-8), con lo que los demás pasan de uno a dos saltos, y añade Obras; por eso se despliega después del juicio o con su fecha declarada igual. Pesa más que todo eso el despliegue que repare la publicación: dentro de la ventana hará pasar en vivo las Obras indexables de 81 a 277 y los Autores de 65 a 135, con páginas que el buscador no ha visto, y su fecha se declara igual (§6.7). Si la ventana de 8 semanas se reinicia desde él o se compara solo lo publicado el 2026-10-10 lo decide Héctor antes del 2026-12-05 (§6.7, pregunta 10 de §14). SM-11 se juzga con esas fechas delante, no como si la familia se hubiera medido en un sitio quieto. Y juzgarla exige lecturas de la serie de FR-40, que el 2026-10-17 tiene una sola, del 2026-09-04, anterior a la primera Obra: sin la credencial de Search Console no hay juicio, y la Épica 28 va por la fecha declarada.
- **SM-12 — Difusión** *(v8)*. Lecturas que llegan con marca de difusión entre comparticiones, por destino: cuántas lecturas trae lo que se comparte, según por dónde se compartió. Valida FR-17, FR-18, FR-20, FR-22 y FR-56. Es la medida de que el visitante sea parte del crecimiento: SM-7 dice cuánto se comparte, y esta, si lo compartido trae a alguien. Cuenta las comparticiones de toda superficie, y la llegada tanto si es a una Página de Cita como a una de Obra; se cuenta por su lectura y no por su vista, para no contar las máquinas que abren un enlace para previsualizarlo, y una vez por llegada, sin que una recarga ni una vuelta atrás la cuenten otra vez (FR-56). Para «Historia de Instagram», el denominador suma a sus comparticiones las descargas de ese mismo botón (FR-20), porque también esas dejan copiado el enlace con su marca. Una compartición puede traer varias lecturas —un grupo, un reenvío—, así que la cifra puede pasar de uno. Sin meta hasta la línea base (pregunta 9 de §14).

  **Facebook la pierde casi seguro, por construcción.** Su compartición lleva solo la URL y su Tarjeta Social hace de texto (FR-18); el clic en esa tarjeta lleva a la canónica que declara la página, que va sin marca, así que la compartición se cuenta y la llegada no. Facebook queda fuera de la comparación entre destinos hasta que la prueba de dispositivos de la Épica 25 diga si la marca sobrevive. Y un enlace de compartir que el visitante abre en pestaña nueva, o copia con el menú del navegador, lleva la marca sin que se registre ninguna compartición: la cifra puede subir sin denominador, y se lee sabiéndolo.
- **SM-13 — Búsqueda seguida** *(v8)*. Salidas internas desde un resultado de búsqueda entre búsquedas asentadas, con los filtrados dentro, como en SM-6. Valida FR-7. SM-6 dice si la búsqueda encuentra algo; esta, si lo que encuentra lleva a alguna parte: una búsqueda con resultados que nadie pulsa es un fallo que SM-6 no ve. Lleva el sesgo de SM-3 —lo que se abre en pestaña nueva no se cuenta— y no tiene meta hasta la línea base (pregunta 9 de §14).

**Contra-métricas (no optimizar)**

- **SM-C1 — Procedencia verificada.** Porcentaje de Citas publicadas con Procedencia completa. Contrapesa SM-2: el tráfico crece publicando más Citas, y la vía barata de publicar más es relajar la verificación. Si SM-C1 baja mientras SM-2 sube, el producto está destruyendo su único diferenciador defendible. Valida FR-13, FR-16.

  **La línea de cifras de la portada no es SM-C1** *(v8)*. Dice cuántas Citas hay, de cuántos Autores y cuántas están cotejadas con el texto de su Fuente, y estar cotejada no es tener Procedencia completa: una Cita cotejada puede no declarar año, y una con obra y año puede no tener todavía documento contra el que cotejarla. Es un hecho del Corpus que se le da al visitante, no la contra-métrica, que se sigue leyendo en FR-16.
- **SM-C2 — Densidad de las páginas de agregación.** Número mediano de Citas por Tema publicado **y por Colección publicada**. Contrapesa SM-1: la vía barata de multiplicar páginas indexables es crear Temas con tres Citas cada uno, que es exactamente el defecto de los competidores. **Extendida en la v3:** las Colecciones son agregación igual que los Temas y fallan igual, así que entran en la misma contra-métrica en vez de tener una propia — una contra-métrica repartida en dos no frena en ninguna de las dos. **La Obra no entra en esta mediana** *(v7.1)*: 82 Obras indexables, el 2026-10-05, junto a 24 Temas y 16 Colecciones harían que la mediana midiera obras. Y la Obra no tiene la vía barata que esta métrica vigila: no se crea por elección editorial, nace de las Citas. **Tampoco entran los Directorios de Autores y de Obras** *(v8)*: listan Autores y Obras, no Citas, y hay uno de cada, así que ni miden densidad ni tienen la vía barata que esta métrica vigila. Valida FR-6, FR-25, FR-26.
- **SM-C4 — Coste de la monetización sobre la experiencia.** SM-3 (rebote en Página de Cita) y NFR-7 (tiempo hasta el contenido en 4G), medidos antes y después de encender cada Modelo; para la afiliación, además, el tiempo hasta el contenido de la Página de Obra, medido igual y con el listón de NFR-7. *(v7.1 — antes medía solo la Página de Cita.)* **El rebote es el aproximado de SM-3 y se lee por superficie** *(v8 — antes «El rebote por superficie entra con la pasada de métricas»)*: el de la Página de Cita para todo Modelo y, además, el de la superficie donde vive el Modelo —la Página de Obra para la afiliación, se indexe o no; la portada para las donaciones y la publicidad, que es la única de sus superficies con lecturas (la búsqueda y la página 404 no emiten vista, y allí el Modelo se juzga solo por lo que mide en la Página de Cita)—. Se juzga el cambio antes y después de encender, en la misma superficie y con la misma medida, nunca la cifra frente al 65 % en suspenso. Contrapesa SM-10: la vía barata de subir el ingreso es ocupar más superficie y aceptar que el sitio empeore un poco cada vez. Si SM-10 sube mientras SM-3, el rebote de la superficie del Modelo o NFR-7 se degradan, el Modelo se apaga — está comprándose ingreso con el activo que lo produce. Valida FR-33, FR-35, FR-37.
- **SM-C3 — Sustitución del circuito privado.** Suma de copiados y descargas (SM-5) medida junto a SM-7, las dos sobre las mismas lecturas de Página de Cita *(v8)*. Contrapesa SM-7: la vía barata de subir la compartición es hacer que compartir estorbe menos que copiar. Si SM-7 sube mientras SM-5 baja en proporción parecida, la v2 no ha ampliado el alcance del sitio — ha movido un botón de sitio. Valida FR-3, FR-17.

  **Es la contra-métrica de la Épica 25** *(v8)*, que pone los destinos de compartir a la vista: que compartir no crezca a costa de copiar. La Historia de Instagram que cae en la descarga no entra en ninguna de las dos (FR-20), así que no tapa una caída del copiado. Si salta —en dos ventanas seguidas, cada una con el mínimo de lecturas de su línea base—, la palanca, que decide Héctor, es quitar peso a los destinos frente a Copiar —por ejemplo, devolverlos detrás de «Más opciones…» donde hay hoja, como en la v2—, nunca esconder Copiar.
- **SM-C5 — Desvío de la resolución** *(v8)*. La continuación de la Página de Cita (SM-4) leída junto a SM-5, sobre las mismas lecturas de Página de Cita. Es la contra-métrica de la Épica 24. Contrapesa SM-4: la vía barata de subir la continuación es poner, por delante de las acciones, enlaces que se lleven al visitante antes de que copie o descargue, y la Tarjeta de Obra va justo ahí —en móvil deja Copiar, Imagen y compartir por debajo de la primera pantalla—. Si la continuación sube mientras SM-5 baja, la Página de Cita no retiene mejor: está apartando al visitante de la resolución de UJ-1, que es llevarse la Cita. Si salta —en dos ventanas seguidas, cada una con el mínimo de lecturas de su línea base—, la palanca, que decide Héctor, es pasar la Tarjeta de Obra detrás de las acciones, que es la alternativa que se descartó al decidirla. Valida FR-3, FR-12.

## 8. SEO y Descubribilidad *(preocupación transversal)*

En este producto el SEO no es una optimización posterior: es el mecanismo por el que el producto encuentra a sus usuarios. Se documenta como sección propia porque sus requisitos atraviesan todas las features y ninguna de ellas los contiene.

- **NFR-1.** Toda página publicada es rastreable. Son indexables —con etiqueta canónica propia y presencia en el sitemap— la portada, los dos Directorios (FR-55) *(v8)*, toda Página de Cita, de Autor, de Tema y de Colección publicada, y la Página de Obra que cumple FR-52. Las páginas 2 y siguientes de un listado (FR-5) y la Página de Obra que no cumple FR-52 son rastreables, no indexables, y quedan fuera del sitemap. *(v7.1 — antes enumeraba solo Cita, Autor y Tema, y daba por indexable toda página publicada.)* *(v8)* Ninguna marca en la URL —ni la de origen de las cuentas propias (FR-22) ni la de difusión de lo que comparte un visitante (FR-18)— crea una URL indexable: la página declara la misma canónica con marca y sin ella.
- **NFR-2.** El contenido principal de cada página está disponible en el HTML inicial, sin requerir ejecución de JavaScript para ser leído por un rastreador. *(Ampliado en la v8.)* Vale para todo lo que la v8 añade como enlace: la Tarjeta de Obra, «Siguiente» y las demás rutas de salida de la Página de Cita están en el HTML inicial, y los dos Directorios se leen enteros sin guion; su filtro al teclear se añade encima y no es la vía para ver la lista. De la navegación, solo necesitan guion la búsqueda con sus filtros, que vive en una página que no se indexa, y el filtro de los Directorios, que se añade sobre la lista entera; ninguno es el único camino a nada, porque lo que se alcanza filtrando se alcanza también por enlaces del HTML inicial (NFR-5).
- **NFR-3.** Cada Página de Cita expone datos estructurados de cita con su autor y, desde la v7.1, con la obra de la que procede, con la misma identidad que su Página de Obra.
- **NFR-4.** Las URL son legibles, estables y en español, sin identificadores opacos.
- **NFR-5.** Ninguna página publicada queda huérfana: toda página es alcanzable por enlaces internos desde la portada en tres saltos como máximo, también la que no se indexa. *(v8 — antes «en un número acotado de saltos»; el tope de la suite ya era tres.)* Con la cabecera de toda página (§10), todo Autor y toda Obra quedan a dos: su Directorio y su página. Una Cita queda a tres por su Tema —el Tema, la página de su listado que la contiene y la Cita— mientras tenga al menos un Tema publicado; el 2026-10-17 lo tienen todas, pero ninguna regla de admisión lo exige, y por el Directorio de Autores una Cita de la página 2 o siguientes de su Autor queda a cuatro. Si esa condición se impone al construir o se garantiza otra vía de tres saltos lo decide la Épica 26 al escribir sus historias, con la arquitectura si hace falta una comprobación nueva al construir; el tope no se relaja.
- **NFR-6.** El contenido en estado `en-revisión` no es rastreable, indexable ni alcanzable por URL adivinable.
- **NFR-13** *(v3)*. Ninguna superficie de agregación canibaliza a la Cita. La canónica de una Cita es siempre su Página de Cita, esté en cuantos Temas, Colecciones y Obras esté; una Cita presente en varias agregaciones no genera contenido duplicado indexable. Es la condición para que multiplicar agregación sume superficie en vez de repartir la misma señal entre más URL. *(Ampliado en la v7.1.)* Tampoco una agregación indexable repite a otra; la Página de Obra que lista casi todo su Autor no se indexa (FR-52). *(Ampliado en la v8.)* Los dos Directorios no canibalizan nada: listan Autores y Obras, no Citas, y cada entrada enlaza a la página de su entidad; en la búsqueda interna se encuentran por su título, no por los nombres que listan (FR-55). «Buscar en esta obra» y sus análogos de Autor y de Tema llevan a la búsqueda, que no se indexa con ningún filtro, así que no crean ninguna combinación indexable; las páginas de intersección —Tema por Autor, Obra por Tema— siguen fuera (§6.7).

## 9. NFR Transversales

- **NFR-7 — Rendimiento.** El contenido principal de una Página de Cita es visible en móvil con conexión 4G en menos de 2,5 segundos. El rendimiento es requisito de SEO, no de confort. *(Ampliado en la v8.)* Lo que la v8 añade a la Página de Cita —la Tarjeta de Obra, hasta siete Tarjetas de Cita en sus rutas de salida y la medición de la lectura (FR-56)— no mueve el listón: se mide con todo ello puesto, y todo ello va después de la Cita y de su atribución.
- **NFR-8 — Móvil primero.** Todas las superficies públicas son plenamente utilizables en un viewport de 360 px de ancho. El grueso del tráfico llega desde móvil. *(Ampliado en la v8.)* Ninguna obliga a desplazarse en horizontal a 320 px, el reflujo que ya exige WCAG 2.1 AA (NFR-9). La cabecera de toda página —la marca y «Autores · Obras · Buscar», §10— puede ocupar dos filas a 360 px, pero nunca saca el texto de la Cita de la primera pantalla de la Página de Cita a 360 × 640 px (FR-1).
- **NFR-9 — Accesibilidad.** Contraste, tamaño tipográfico y navegación por teclado conformes a WCAG 2.1 nivel AA en las superficies públicas.
- **NFR-10 — Sin muro de entrada.** Ninguna superficie pública exige interacción (modal, aviso, registro) antes de mostrar el contenido principal.
- **NFR-11 — Privacidad.** La analítica no requiere consentimiento invasivo ni identifica individualmente al visitante. El sitio se dirige a mercados con normativas distintas, incluida la europea. *(Ampliado en la v8.)* La medición de la lectura (FR-56) no lo cambia: la lectura, la salida interna con su zona, el registro de cada búsqueda y la vista de Obra llevan solo valores de un vocabulario cerrado, sin identificador de visita, sin agente de usuario, sin referente y sin el texto de lo buscado, que sigue siendo exclusivo de la búsqueda sin resultados (FR-8). La marca de difusión dice por qué botón se compartió un enlace, nunca quién lo compartió ni quién lo abre: todos los que pulsan el mismo botón comparten el mismo enlace.
- **NFR-12 — Integridad del contenido.** El sistema no altera, corrige ni normaliza el texto de una Cita publicada sin acción explícita del editor.

## 10. Arquitectura de la Información

Ocho superficies públicas, otras dos públicas que nunca se indexan —la búsqueda y la página 404— y dos internas *(la Colección y el Kit Diario se añaden en la v3 y en la v2 respectivamente, la Obra en la v7.1 y los dos Directorios en la v8)*:

- **Portada** — identidad y retorno: la Cita del Día con su Tarjeta de Obra y sus acciones —Copiar, Imagen y compartir—, una línea con las cifras del Corpus, un campo de búsqueda y entradas a Obras indexables, a los Temas, a las Colecciones, a los Autores destacados y a los dos Directorios (FR-9). *(v8 — antes «Cita del Día, acceso a la búsqueda, entradas a Temas destacados».)*
- **Página de Cita** — hoja del árbol y principal punto de entrada real desde buscadores. *(v8)* Es también donde la Obra se ve: su Tarjeta de Obra y la Cita siguiente de esa Obra (FR-12).
- **Página de Autor** — agregación por persona; enlaza a sus Citas.
- **Página de Tema** — agregación transversal por clasificación; enlaza a Citas de varios Autores.
- **Página de Colección** *(v3)* — agregación transversal por criterio editorial; cruza Tema y Autor sin sustituir a ninguno.
- **Página de Obra** *(v7.1)* — agregación por obra dentro de un Autor, no transversal; existe para toda Obra con Citas y se indexa solo cuando no repite su Página de Autor ni una sola Cita (FR-52).
- **Directorio de Autores** *(v8)* — índice de todos los Autores con Citas publicadas, por apellido y con letras de salto; enlaza a cada Página de Autor, no a las Citas (FR-55).
- **Directorio de Obras** *(v8)* — índice de toda Obra con Citas publicadas, agrupada bajo su Autor en el mismo orden, también la que no se indexa; enlaza a cada Página de Obra, no a las Citas (FR-55).
- **Búsqueda y página 404** *(v8: se nombran aquí)* — públicas, no indexables y sin vista ni lectura: la búsqueda, con sus filtros desde la v8 (FR-7), y la página 404. Las dos admiten las donaciones y la publicidad acotada (FR-34, FR-37).
- **Herramienta de curación** — interna, no indexable, un solo operador.
- **Kit Diario y lote de composición** — internos, no indexables, un solo operador.

**Toda página pública lleva la misma cabecera: la marca, que lleva a la portada, y «Autores · Obras · Buscar»** *(v8 — antes, la marca y «Buscar»)*. Así los dos Directorios y la búsqueda quedan a un salto de cualquier hoja, que es por donde se entra.

La navegación real del visitante es lateral, no jerárquica: entra por una hoja y se mueve entre hojas a través de Autor, Obra, Tema y Colección, y desde la v8 también de una Cita a la siguiente de su Obra o de su Tema («Siguiente», FR-12). Los Directorios no la vuelven jerárquica: no son un nivel por el que haya que pasar, sino el índice al que se acude desde la cabecera cuando se busca a alguien o una obra por su nombre. La portada es identidad y retorno, no puerta de entrada: la v8 la mejora para quien vuelve (UJ-6) sin optimizarla como entrada (FR-9).

**Por qué dos agregaciones transversales y no una.** El Tema y la Colección se parecen y hacen cosas distintas. El Tema **clasifica** —responde a qué trata la Cita, su conjunto es cerrado, y cambiarlo reordena el Corpus—. La Colección **escoge** —responde a para qué se busca la Cita, su conjunto es abierto, y crear una no toca ninguna Cita existente—. Fundirlas obligaría a abrir el conjunto de Temas, y con él se iría el umbral de FR-6 que sostiene SM-C2.

**Por qué los Directorios no son agregación** *(v8)*. Listan entidades, no Citas: personas en uno y obras en el otro, y ninguna entrada enlaza a una Cita. Por eso no compiten con la Página de Cita (NFR-13) ni son superficie de lectura. Tampoco hace falta un índice de Temas ni de Colecciones: los Temas caben enteros en la portada, y las Colecciones se listan en ella (FR-26).

## 11. Estética y Tono

- **Referencias:** el contenido manda sobre el continente. Tipografía grande y legible, mucho aire, cero adornos que compitan con la Cita. *(v8)* Por eso los botones de compartir dicen el nombre de su destino y no llevan el icono de su red: una fila de iconos de redes bajo cada Cita es un adorno que compite con ella.
- **Anti-referencias:** los sitios de citas en español actuales — fondos con textura, publicidad intercalada en el contenido, tipografía pequeña, listados densos sin jerarquía. *(v8)* Los Directorios son los listados más largos del sitio —todos los Autores, todas las Obras— y no caen en el último de esos defectos: el de Autores se recorre por letras de salto, el de Obras agrupa cada obra bajo su Autor, y cada entrada lleva solo su nombre o su título, sus años o su año si constan, y cuántas Citas tiene.
- **Sobre la publicidad, tras la v3.** Esta anti-referencia sigue vigente sin matices y es la razón de la forma exacta de FR-37: la publicidad no puede aparecer donde el visitante lee, ni en la Página de Cita, ni en la de Colección, ni en la de Obra *(v7.1)*. Que un Modelo de Ingreso rinda no es argumento para relajar esta línea — si alguna vez lo fuera, el producto habría dejado de tener la ventaja por la que existe.
- **Voz del producto:** sobria y sin solemnidad impostada. El sitio no comenta las Citas ni las adjetiva ("¡una frase increíble!"). Presenta y se aparta. *(v8)* Las cifras que la portada da del Corpus son hechos, no reclamos: no afirman más de lo que el Corpus sostiene (FR-9).
- **La marca en la Imagen de Cita** está presente pero subordinada: se lee, no se impone sobre la frase. *(v8)* El dominio, que la acompaña al pie en los dos formatos, también: legible, porque en una historia es el único enlace que sobrevive si nadie pone el sticker, y subordinado a la frase como la marca.

## 12. Plataforma y Monetización

- **Plataforma:** web responsive, sin app nativa ni PWA instalable. Sin cambios en la v3 ni en la v8, que deja la PWA fuera a propósito (§6.7).
- **Monetización v1:** ninguna. La decisión se toma con datos de tráfico reales. El diseño no debe crear obstáculos a una futura inserción publicitaria, pero tampoco reservarle espacio: NFR-10 tiene prioridad sobre cualquier consideración publicitaria futura.
- **Los Directorios no admiten ningún Modelo** *(v8)*, como la Página de Autor. No es una consecuencia de las exclusiones de FR-34 y FR-37, que vedan las superficies de lectura, porque los Directorios no lo son: es una declaración propia, decidida por Héctor el 2026-10-17. Un Directorio se publica igual con todos los Modelos encendidos que apagados. La búsqueda, en cambio, sigue admitiendo la publicidad acotada también con filtros (FR-37).

### 12.1 Modelos de Ingreso y sus umbrales *(v3)*

La regla de la v1 se conserva y se hace operable. No se sustituye por una fecha ni por una corazonada: cada Modelo tiene una cifra, y esa cifra se mide en el receptor de LC-4. Diseñarlos hoy no es monetizar hoy. *(v8)* Hoy esa cifra no se puede medir para los tres Modelos cuyo Umbral está en sesiones orgánicas (FR-33, §6.7).

| Modelo | Umbral de Activación | Anclaje | Coste sobre la experiencia |
|---|---|---|---|
| **Donaciones** (FR-34) | LC-1…LC-4 verificadas | Es un enlace; no tiene coste que amortizar | Ninguno — fuera del flujo de lectura, sin JS de terceros |
| **Afiliación de libros** (FR-35) | 2.000 sesiones orgánicas/mes — dispara solicitar la cuenta, no encender | Primer tráfico con volumen suficiente para que un porcentaje signifique algo | Bajo — solo en la Página de Obra, debajo de la edición cotejada gratuita, con ediciones elegidas por una persona *(v7.1)* |
| **Producto propio** (FR-36) | 5.000 sesiones orgánicas/mes | La meta de SM-2 al mes 6 | Ninguno sobre las páginas públicas |
| **Publicidad acotada** (FR-37) | 25.000 sesiones orgánicas/mes | La meta de SM-2 al mes 12 | **Alto** — el único que degrada superficie; por eso el umbral más exigente y la exclusión de la Página de Cita, de Colección y de Obra |

**Por qué el orden de los umbrales es ese.** No es por ingreso esperado, es por **coste sobre el producto**. Se enciende primero lo que no cuesta nada y último lo que cuesta más, de modo que el sitio solo acepta degradarse cuando ya tiene tráfico bastante para que compense — y aun entonces, solo donde no se lee.

**Ningún Modelo reserva espacio mientras está apagado.** Un hueco en blanco esperando publicidad es exactamente el obstáculo que la regla de la v1 prohibía crear. Un Modelo apagado es invisible, no latente.

**Ningún Modelo sobrevive a su contra-métrica.** SM-C4 mide rebote y tiempo hasta el contenido antes y después de cada encendido. Un Modelo que suba SM-10 degradando SM-3, NFR-7 o, en la superficie donde vive, el rebote o el tiempo hasta el contenido se apaga: estaría comprando ingreso con el activo que lo produce.

## 13. Condiciones de Lanzamiento

No son features y no producen FR: son las puertas que deben estar abiertas para que el sitio pueda considerarse publicado. Existen como sección propia porque cada una es invisible mientras falta —el sitio funciona igual de bien sin ninguna de ellas— y su ausencia solo se descubre semanas después, cuando la métrica que dependía de ella no existe.

- **LC-1 — Dominio propio sirviendo.** `sabiduriadebolsillo.net` responde por HTTPS, y la URL canónica de cada página y el sitemap lo declaran. Mientras el sitio se sirva desde una URL provisional, cada página indexada es una redirección futura. *(Corregido en la v3: el PRD decía `.com`; el dominio contratado y servido es `.net`, declarado en `public/CNAME` y leído por `src/lib/dominio.ts`.)*
- **LC-2 — El sitemap es anunciable.** Existe un `robots.txt` que declara dónde está el sitemap. Hoy el sitemap se genera y no lo anuncia nada.
- **LC-3 — Search Console verificada.** Propiedad verificada y sitemap enviado. Sin ella, SM-1 no es medible: no hay otra forma de saber cuántas Citas están indexadas.
- **LC-4 — La medición recibe.** El punto final de medición está desplegado y los eventos de la v1 llegan y se pueden consultar. El módulo está construido desde la v1; hasta la v2 no enviaba a ninguna parte, y desde el 2026-09-02 la condición está verificada (§6.5) y el receptor registra eventos. *(v8 — antes «y hasta hoy no envía a ninguna parte».)* Los eventos que añade la v8 (FR-56) no reabren esta condición ni crean otra, porque llegan al mismo punto final. Pero una métrica de §7 sobre lecturas no tiene línea base hasta que esos eventos llegan del sitio en vivo con todos sus campos: un dato nuevo que el receptor no reconoce se pierde sin error, y una serie que lo pierde parece una serie a cero.
- **LC-5 — Coherencia de marca.** Ninguna superficie, ni la marca de agua de la Imagen de Cita, menciona el nombre retirado.
- **LC-6 — Corpus mínimo defendible.** Ninguna Cita publicada sin Procedencia, y al menos un Tema publicado por encima del umbral de FR-6 en cada Tema que se anuncie en la portada. Un visitante que llega desde las cuentas y encuentra un Tema vacío no vuelve.

**La jornada en que LC-1…LC-4 quedan verificadas es el mes 0 del producto** *(v3)*. Toda métrica con plazo —SM-1 a los 3 meses, SM-2 a los 6 y a los 12— se cuenta desde ahí y no desde la fecha de este documento. Hasta entonces esos plazos no tienen origen, que es la razón por la que la v2 terminó sin poder medir nada de lo que había construido.

**Las metas que la v8 deja en suspenso tienen otro origen** *(v8)*: no el mes 0, sino la línea base de cada una, que empieza el día en que el sitio en vivo registra lo que mide y se cierra al reunir un mínimo de lecturas (§7, FR-56). No es una condición nueva de lanzamiento, sino el reloj de esas metas. Mientras el sitio en vivo no se pueda desplegar —no se despliega desde el 2026-10-11, con la integración continua en rojo (§6.7)—, ese origen no existe, por la misma razón que no existía el de la v2: lo construido sin desplegar no mide nada.

## 14. Preguntas Abiertas

Las seis preguntas abiertas de la primera redacción se resolvieron en aquella pasada; las decisiones están incorporadas a los FR y registradas en `.memlog.md`. Quedaron tres, ninguna bloqueante para UX ni para Arquitectura:

1. **Marca registrada.** Búsqueda en OEPM y EUIPO para "Sabiduría de Bolsillo". El dominio está contratado, que es cosa distinta. No bloquea el desarrollo, sí el gasto en identidad visual.
2. **Umbral de reducción tipográfica.** FR-10 fija los tramos por longitud y el corte en 300 caracteres, pero los valores concretos de cada tramo salen de probar plantillas reales. Corresponde a UX, no a producto. *(v8)* Alcanza también al formato 9:16 de la Historia de Instagram, que tiene su propia columna de tramos y un solo diseño: sus valores salen igual de probarla, y lo que no quepa no se encoge (FR-10, NFR-12).
3. **Cadencia de sembrado.** FR-23…FR-25 definen el proceso, no el ritmo. Cuántas Citas por sesión y cada cuánto se decide con la primera sesión real hecha, no antes. *(Replanteada en la v3.1: con el sembrado ejecutable por agentes, el límite deja de ser el tiempo del editor y pasa a ser lo que SM-C1 aguante. La pregunta ya no es «cuánto puede sembrar Héctor», sino «a partir de qué ritmo la salud del Corpus empieza a bajar».)*

**Añadidas en la v3, ninguna bloqueante para Arquitectura ni para épicas:**

4. **Umbral mínimo de una Colección.** FR-26 exige que exista; no fija el número. El Tema usa 15 (FR-6), pero una Colección se lee de otra forma —«frases cortas» con 15 puede quedarse pobre y «para dedicar» con 15 puede sobrar— así que el valor sale de curar las tres o cuatro primeras, no de decidirlo ahora.
5. **Qué es el producto propio.** FR-36 fija el umbral de 5.000 sesiones/mes y aplaza el contenido. Decidir entre lámina, antología y recurrencia antes de saber quién visita el sitio sería exactamente el supuesto que §12 existe para evitar.
6. ~~**Programa de afiliación concreto.**~~ **Replanteada en la v7.1: qué tiendas entran.** Ya no es elegir un programa, porque FR-35 admite un conjunto cerrado de tiendas. Cuáles entran, y si tienen programa en México, Colombia y Perú, se decide cuando llegue su historia; añadir una es un cambio declarado. Una obra sin edición en venta no lleva enlace. Cuándo se solicita la cuenta lo dispara su Umbral, y la fecha la pone una persona con las ediciones ya curadas.

   *Redacción original, que se conserva:* FR-35 fija la capacidad y el umbral; qué programa se usa depende de la disponibilidad de las ediciones en dominio público que el Corpus cita, y varias no tendrán edición en venta. Se resuelve al acercarse el umbral.

**Añadidas en la v5:**

7. ~~**Qué edición se enlaza**~~ **CONTESTADA el 2026-10-05 en su mitad editorial**, y **si la afiliación de libros es viable siquiera**, que sigue abierta.

   No se elige entre la edición cotejada y una moderna: se muestran las dos. La cotejada, gratuita, siempre; la de venta, elegida por una persona en la Ficha de Obra, debajo y nunca en su lugar (FR-35, FR-54). La Procedencia sigue siendo la que se verificó, y lo que se vende se declara como tal en su propia línea. La viabilidad sigue abierta: el libro físico paga el 4,5 %, el programa no existe en varios de los países del público, el plazo de ventas mínimas empieza al solicitar la cuenta, y la edición gratuita al lado baja la conversión a propósito. La Página de Obra se construye por su valor propio y no depende de que el enlace llegue. Por ese mismo plazo, las primeras ediciones se curan en Obras indexables: el Quijote, única obra de Cervantes en el Corpus, no se indexa, y su enlace no tendría tráfico de buscador.

   *Redacción de la v5, que se conserva:* La pregunta 6 daba por hecho que era cuestión de elegir programa. La investigación de la v3.2 —registrada en `.memlog.md`— dice algo más incómodo, y FR-43 hereda la pregunta sin resolverla: el libro físico paga el 4,5 %, las 103 obras del Corpus son de dominio público y su edición cotejada suele tener versión electrónica gratuita o de ~1 €. Enlazar **la edición que se cotejó** respeta FR-24 y no ingresa nada; enlazar **una edición moderna anotada** ingresa y erosiona el principio de que la Procedencia es la que se verificó y no la que conviene vender. A eso se suma la cobertura: el programa no existe en Argentina, Chile, Colombia ni Perú, lo que choca con el suelo del 40 % de tradición latinoamericana. **Consecuencia asumida en la v5:** FR-43 construye la superficie por su valor propio —contenido e intención de Autor— y no la condiciona a que esta pregunta tenga buena respuesta.

8. ~~**Por qué el buscador descarta 1.534 páginas.**~~ **CONTESTADA el 2026-09-04, y con el «no» que no se esperaba.**

   La hipótesis era que si las Páginas de Autor se indexaban y las Citas no, la causa estaría en la Página de Cita. **No se indexa ninguna familia.** Sobre 80 URL inspeccionadas por la Historia 16.1: **2 indexadas** —Cita 0 de 24, Autor 1 de 20, Tema 0 de 20, Colección 1 de 16— y **45 «desconocidas para Google»**. No hay diferencia entre familias que explique nada, así que el contenido de la Página de Cita queda exculpado.

   Y lo que descarta pesa más que lo que confirma: Search Console declara `sitemap-0.xml` leído el 2/09 con **1.715 páginas descubiertas**. Google conoce todas las URL. Luego el problema **no es descubrimiento ni contenido** —no ha llegado a mirarlo—: es **rastreo**. Un sitio de tres semanas, con Search Console de dos días, sin un solo enlace entrante externo, que publicó 1.715 URL de golpe.

   Eso lo ataca §4.17 y no lo atacaba ninguna de las ocho historias que la v5 escribió antes de tener el dato.

**Añadidas en la v8:**

9. **Qué metas se fijan con la línea base de lecturas, y qué pasa con las de sesión.** La línea base de cada métrica en el sitio en vivo (§7) tiene que contestar tres cosas. La primera, las metas de lo que la v8 mide por primera vez: la continuación por superficie y por zona (SM-3, SM-4), con el umbral que haría saltar a SM-C5; la difusión por destino (SM-12); y la búsqueda seguida (SM-13), cada una con la línea base que empieza cuando el sitio registra lo que mide. La segunda, si el 3 % y el 2 % de SM-5 y SM-7, escritos para visitas, se confirman o se rehacen: una lectura deja fuera a las máquinas, así que el mismo comportamiento humano da sobre lecturas una tasa más alta que sobre vistas, y conservar la cifra sería exigir menos sin decirlo; y si el 15 % de SM-6, escrito cuando una búsqueda no se contaba asentada, sigue valiendo para búsquedas asentadas. La tercera, si el 65 % de rebote y el 1,8 páginas por sesión vuelven a ser meta el día que haya sesión o la continuación los sustituye para siempre; hoy no hay sesión porque no hay identificador de visita (NFR-11), y nada de la v8 lo cambia. Con una lectura humana al día, el mínimo de lecturas puede tardar en llegar: hasta entonces, las épicas de la v8 se juzgan por si dan señal, no contra una cifra. No bloquea a UX, a Arquitectura ni a las épicas, que se construyen sin esperar a la línea base; bloquea juzgar las épicas de la v8 contra una cifra. Dueño: Héctor, en una pasada del PRD.

10. **Desde cuándo cuenta la ventana de 8 semanas de SM-11.** El despliegue que repare la publicación hará pasar en vivo las Obras indexables de 81 a 277 y los Autores de 65 a 135 dentro de la ventana que abrió el primer despliegue de Obras, el 2026-10-10, con páginas que el buscador no ha visto (§6.7, SM-11). Si la ventana se reinicia desde ese despliegue o se compara solo lo publicado el 2026-10-10 cambia el juicio de SM-11, y de ese juicio dependen congelar la familia Obra y encender la afiliación. No bloquea a UX, a Arquitectura ni a las épicas; se decide antes del 2026-12-05. Dueño: Héctor.

## 15. Índice de Supuestos

Los supuestos etiquetados en la primera redacción se convirtieron en decisiones (§14). Permanecen los de capacidad, no de preferencia:

- **§8 / NFR-2** — El sitio se sirve con HTML renderizado en servidor o pregenerado. Es un supuesto de capacidad, no una elección de tecnología: la indexación fiable de ~2.000 páginas lo requiere. La elección concreta corresponde a Arquitectura.
- **§6.1** — El Corpus de arranque de ~2.000 Citas es alcanzable por un solo editor antes del lanzamiento. Es el supuesto con más riesgo de plan del documento: si resulta falso, la palanca es reducir el Corpus, nunca relajar FR-13. **Revisado en la v2:** resultó falso en su forma original. El lanzamiento no espera a las 2.000 Citas; sale con lo que haya y el Corpus crece publicado, mediante §4.11. Lo que no se toca es FR-13, exactamente como el supuesto preveía.
- **§4.10 / SM-8** — Las cuentas de Sabiduría de Bolsillo tienen audiencia suficiente para producir visitas medibles. Es un supuesto de capacidad del canal, no del sistema: si resulta falso, SM-8 no dará señal y la conclusión será que el canal propio no sustituye al buscador, no que el Kit Diario esté mal construido. **Revisado en la v8, y en entredicho.** El 2026-10-16, tras seis semanas de receptor, Instagram, TikTok, X y Facebook no habían traído ninguna visita marcada, y la marca de Threads llegaba con una firma mecánica que no parece de personas (SM-8). No está falsado: varios enlaces del canal propio no llevan todavía al sitio, y quién publica los enlaces de Threads está por aclarar. Pero ya no se puede dar por cierto, y si sigue igual cuando esos enlaces estén bien puestos, la conclusión es la que el supuesto ya preveía.

**Añadido en la v3.1:**

- **§4.11 / FR-24** — El cotejo literal contra el documento de la Fuente basta para que el sembrado ejecutado por agentes no degrade SM-C1. Es el supuesto que sostiene toda la apertura: si resulta falso —porque el cotejo pase textos correctos con Procedencia equivocada, o porque el volumen esconda errores que una revisión humana habría visto—, la palanca es volver a poner una persona en la aprobación, nunca relajar el cotejo. Se falsa barato: auditar una muestra de lo sembrado por agente contra sus ediciones.

**Añadidos en la v3:**

- **§4.12 / SM-9** — Existe cola larga en español que las Colecciones pueden capturar y que las cuatro superficies actuales no capturan. Es el supuesto que justifica una superficie nueva entera. Se falsa barato: tres o cuatro Colecciones publicadas y las consultas de entrada de Search Console lo dicen en semanas. Si resulta falso, la palanca es dejar de crear Colecciones, no bajar su umbral para tener más.
- **§4.13 / FR-31** — El vídeo corto trae visitantes que la imagen fija no trae. **Es el supuesto de mayor coste del documento y el peor sostenido:** §6.3 lo descartó en la v2 con un argumento —el motor de vídeo es un producto, no una historia— que nadie ha refutado desde entonces. Entra por decisión explícita de Héctor, con su propio umbral (ninguna cuenta de imagen fija demostrando visitas, ningún motor de vídeo) y como candidato preferente al recorte si la v3 se pasa de tamaño.
- **§4.14 / SM-2** — El sitio alcanza los umbrales de activación. Los tres primeros Modelos se anclan a metas que el PRD ya se había fijado (2.000, y las de SM-2 a los meses 6 y 12), así que este supuesto no es nuevo: es SM-2 otra vez, ahora con el ingreso colgando de ella. Si SM-2 falla, no falla la monetización — falla el producto, y la monetización simplemente no se enciende, que es justo lo que los umbrales existen para garantizar.
- **§6.4** — Llegar al orden de las 2.000 Citas es alcanzable ahora que el sembrado (§4.11) está construido y el Corpus crece publicado. Reformula el supuesto original de §6.1, que resultó falso cuando el volumen era condición de lanzamiento. Ya no lo es: el riesgo dejó de ser de plan y pasó a ser de ritmo.

**Añadidos en la v5:**

- **§4.16 / FR-41** — Existe una fuente citable con licencia admisible que sostenga una semblanza de cada uno de los 35 Autores. Es un supuesto de disponibilidad, no de preferencia: Wikipedia es CC BY-SA 4.0, la misma licencia con la que Wikisource-es ya aporta 1.275 Citas, así que la postura de licencia no es nueva. **Consecuencia asumida:** una semblanza derivada de una fuente CC BY-SA queda bajo esa misma licencia y no es propiedad exclusiva del sitio. Alcanza al texto derivado, no al Corpus ni al resto del sitio. Si un Autor no tiene fuente citable, se queda con la semblanza que ya tiene antes que componérsela — §5 no admite excepción.
- ~~**§4.15**~~ — **FALSADO el 2026-09-04, dos días después de escribirlo.** Decía que anunciar los cambios y repartir enlace interno movería la indexación. Las dos mitades cayeron por separado: **anunciar no sirve** porque Google ya conoce las 1.715 URL —sitemap leído el 2/09, con las páginas descubiertas—, y **repartir enlace desde superficies indexadas** no se puede hacer cuando hay dos superficies indexadas en todo el sitio. La palanca que queda no es de código: un sitio nuevo sin señales externas no recibe presupuesto de rastreo. Se falsó el mismo día y por una tarde de trabajo, que es exactamente para lo que se escribió como supuesto y no como certeza.

**Añadidos en la v7.1:**

- **§4.19** — Existe una consulta por obra que la Página de Autor no capta. Es el supuesto que justifica una superficie nueva entera, y SM-11 no lo pone a prueba: mide indexación, no demanda. Se falsa con las impresiones y consultas que aterricen en la Página de Obra, que llegan con la pasada de métricas.
- **§4.19 / SM-11** — El buscador indexará la familia Obra aunque no indexe aún todas las Páginas de Autor. Se abre sin la condición de reapertura que la arquitectura le había puesto, y se falsa barato: SM-11 a las 8 semanas. Si resulta falso, la palanca es congelar la familia (SM-11), nunca relajar la regla de FR-52 para tener más páginas.
- **§4.19 / FR-52** — Por debajo del 90 % de su Autor, el buscador no trata una Página de Obra como duplicada de la Página de Autor. Se falsa en la serie de indexación si la familia acumula páginas declaradas duplicadas. Si resulta falso, la palanca es bajar el tope, nunca parchear una página.

**Añadidos en la v8:**

- **§4.9 / SM-7, SM-12** — Si casi nadie comparte, es por fricción y no por falta de intención. En seis semanas de receptor hubo 4 copiados —de la misma Cita y el mismo día—, 2 descargas de imagen, 2 comparticiones de imagen y ninguna de enlace. La v8 lo lee como un problema de puerta: compartir pasaba por la Hoja del Sistema, que el navegador de la aplicación de Facebook en Android no ofrece, y los destinos concretos se escondían donde la había. Supone además que ese navegador es donde está la audiencia principal, y eso la medición no puede confirmarlo, porque no guarda el agente de usuario (NFR-11). Es el supuesto que justifica la Épica 25 entera. Se falsa con SM-7 y SM-12 tras la línea base: si con los destinos a la vista compartir sigue cerca de cero, la palanca no es otro botón; lo que se propone a Héctor es decidir si se sigue invirtiendo en la compartición o se acepta que el visitante de este sitio se lleva la Cita sin publicarla.
- **§4.21 / FR-56** — Una lectura separa a las personas de las máquinas. Toda tasa de §7 descansa en este supuesto: la lectura exige que la página esté visible un tiempo mínimo o reciba una interacción, y las precargas y los renderizadores que cierran al terminar no llegan a ella; un rastreador que ejecute JavaScript y espere, o que simule una interacción, sí llegaría. Se falsa en la línea base: si las lecturas reproducen las firmas que el 2026-10-16 delataban a las máquinas —ráfagas de una por ruta en cientos de rutas, el reparto fijo de la marca de Threads—, la línea base está contaminada. La palanca es ajustar el tiempo mínimo, que es un valor declarado y se cambia a la vista, y repetir la línea base; nunca fijar metas sobre una serie contaminada. Supone también que el sitio en vivo, con la publicación arreglada, reúne el mínimo de lecturas de la línea base en semanas y no en meses; si no, las metas esperan y las épicas se juzgan por si dan señal (pregunta 9 de §14).
- **§4.9 / FR-17** — Instagram ofrece publicar en la historia cuando recibe un fichero desde la web, y la activación del toque sobrevive hasta entregárselo. Es el supuesto del botón «Historia de Instagram», y depende de versiones de aplicación y de sistema que el producto no controla. Se falsa antes de que lo vea un visitante, en la prueba manual de dispositivos con que cierra la Épica 25: iPhone, Android y los navegadores de las aplicaciones de Facebook, Instagram y Threads. La v8 ya no lo ofrece donde el navegador no puede compartir el fichero, como el de la aplicación de Facebook en Android, y la descarga con el enlace copiado queda solo para cuando el navegador rechaza la entrega (FR-17); en iOS esa salida es menos digna de lo que parece, porque la descarga va a Archivos y no a Fotos, y desde allí la historia no la recoge. Si resulta falso donde sí se ofrece, la palanca es retirar el botón también ahí —un botón que no puede cumplir es peor que no ofrecerlo—, nunca dejar la descarga como su camino habitual.
- **§4.5 / FR-9** — La portada de la v8 mejora el retorno. Parte casi de cero: del 11 al 16 de octubre de 2026 tuvo 21 vistas de superficie, frente a 273 de Páginas de Cita (leído el 2026-10-17). El retorno no se puede medir sin identificador de visita (NFR-11), así que se falsa por lo que sí se mide —las lecturas de la portada y su continuación por zonas (SM-4), antes y después de la Épica 28, que es donde empieza UJ-6—, sabiendo que con estas cifras cualquier cambio será pequeño y ruidoso. Lo confunde además que la Cita del Día se repita cada 16 días mientras solo haya 16 aptas para portada: el tachado de la Historia 21.2, que las lleva a 120 o más, es lo que más retorno promete por hora de Héctor, y conviene que llegue antes de juzgar la portada (§6.7). Si resulta falso, la palanca no es convertirla en puerta de entrada, que los datos ya descartan (FR-9): lo que se propone a Héctor es decidir si se sigue invirtiendo en ella o se vuelve el esfuerzo a la Página de Cita, por donde se entra.
