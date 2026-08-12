---
title: Sabiduría de Bolsillo
status: final
created: 2026-08-10
updated: 2026-08-11
---

# PRD: Sabiduría de Bolsillo

## 0. Propósito del Documento

Este PRD define **qué** debe hacer Sabiduría de Bolsillo, no **cómo** se construye. Sus lectores son los flujos aguas abajo del método BMad —UX, Arquitectura, y la generación de épicas e historias— además de Héctor como responsable de producto. Se estructura con vocabulario anclado en un glosario (§3), features agrupadas con requisitos funcionales anidados y numerados globalmente (FR-1…FR-N), y supuestos etiquetados en línea e indexados en §15.

**Estado del producto (2026-08-11).** La v1 está construida y verificada: seis superficies auditadas, épicas 1 a 5 completas. Este documento incorpora la **v2**, cuyo propósito es distinto del de la v1 y conviene no confundirlos. La v1 construyó el producto; la v2 lo pone delante de personas. Sus dos frentes son la **compartición directa a redes** (§4.9) y la **salida a producción con canal de arranque propio** (§4.10, §13).

**Renombrado de marca.** El producto pasa a llamarse **Sabiduría de Bolsillo**, no «Sabiduría Diaria». La razón no es estética: el tráfico de arranque no viene del buscador —el Corpus es demasiado pequeño todavía— sino de las cuentas sociales que ya existen con ese nombre, y un visitante que pulsa en «Sabiduría de Bolsillo» y aterriza en un sitio llamado de otra forma pierde el reconocimiento en el punto más frágil del embudo. El cambio se ejecuta **antes de que exista una sola URL indexada**: después costaría redirecciones, posiciones y una marca de agua circulando por Instagram que apunta a un nombre retirado.

Se apoya en el **Brief de Producto** (`_bmad-output/planning-artifacts/briefs/brief-brainlySabiduria-2026-08-10/brief.md`, `status: final`) y su addendum, que contienen el razonamiento de las decisiones de alcance, la comparativa de vías de origen del corpus y la verificación de dominio. Este documento no los duplica: los da por firmes.

No existe todavía documento de UX. Los identificadores de recorrido (UJ-N) definidos aquí son los que UX debe reutilizar.

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

- **El coleccionista.** Quien quiere guardar, organizar y volver a sus citas favoritas. No hay cuentas ni favoritos en la v1.
- **El contribuidor.** Quien quiere aportar citas al catálogo. La curación es interna (§4.8).
- **El lector no hispanohablante.** El producto es monolingüe por decisión, no por limitación.

### 2.3 Recorridos de Usuario Clave

- **UJ-1. Lucía necesita una frase para cerrar su presentación, y la necesita ahora.**
  Lucía, consultora, prepara a las 23:40 la presentación de mañana. Busca en Google "frases sobre el esfuerzo y la constancia" y aterriza directamente en una **Página de Cita** de Sabiduría de Bolsillo, sin pasar por la portada. Lee la cita en pantalla completa, ve el nombre del autor y, debajo, la obra de la que procede. Pulsa copiar. El texto y la atribución van juntos al portapapeles. Cierra el móvil. **Clímax:** la cita está en su presentación en menos de treinta segundos desde el clic en Google, con la atribución correcta pegada sin que ella tuviera que teclearla. **Caso límite:** si la cita no tiene obra documentada, la ficha muestra el autor y el estado de la procedencia sin inventar una fuente.

- **UJ-2. Diego quiere publicar algo hoy y que se vea bien.**
  Diego, 24 años, busca material para su historia de Instagram. Llega a una Página de Cita desde una búsqueda por tema. Le gusta la frase pero no va a copiar texto plano. Pulsa "compartir imagen", elige entre unos pocos diseños y, en lugar de recibir un fichero en la carpeta de descargas, **se le abre la hoja de compartir de su móvil con la Imagen de Cita ya adjunta**. Toca el icono de Instagram, escribe dos palabras y publica. **Clímax:** ha publicado sin salir del navegador, sin abrir la galería y sin buscar dónde ha caído el fichero. **Resolución:** la imagen lleva la marca, así que su publicación es la que trae al siguiente visitante. **Caso límite:** en el escritorio no existe hoja del sistema; la misma acción descarga el fichero, que es el comportamiento de la v1 y sigue siendo correcto.

- **UJ-3. Marisol llegó por una frase y se quedó una hora.**
  Marisol, profesora de literatura, busca una cita concreta de un autor clásico. Desde la Página de Cita pulsa el nombre del autor y aterriza en la **Página de Autor**: una semblanza breve y el resto de citas de esa persona en el catálogo. Desde ahí salta a un **Tema** que le interesa y descubre a un autor latinoamericano que no conocía. **Clímax:** cuatro páginas después sigue leyendo. **Resolución:** vuelve por su cuenta días después, directamente al dominio.

- **UJ-4. Héctor incorpora cincuenta citas nuevas sin romper la promesa del sitio.**
  Héctor, único editor, tiene un lote de citas de un autor recién entrado en dominio público. Las carga en la herramienta interna. El sistema rechaza las que no traen **Procedencia** y las que pertenecen a un **Autor** sin año de fallecimiento registrado, dejándolas en estado de revisión en lugar de publicarlas. Él completa lo que falta y publica el resto. **Clímax:** el catálogo crece sin que baje el porcentaje de citas verificadas. **Caso límite:** si una cita duplica una ya publicada, el sistema lo señala antes de aceptarla.

- **UJ-5. Héctor publica la Cita del Día en sus cuentas antes de desayunar.**
  Héctor, además de editor, lleva las cuentas de Sabiduría de Bolsillo en Instagram, TikTok, X, Threads y Facebook. Son la única fuente real de visitantes mientras el Corpus sea pequeño. A las siete de la mañana abre el móvil y entra en una URL del propio sitio que el sistema ha dejado compuesta esa madrugada: la Imagen de la Cita del Día ya generada, el pie con la atribución escrito, y el enlace a la Página de Cita. Comparte la imagen a cada cuenta desde la misma hoja del sistema que usa cualquier visitante. **Clímax:** publicar en cuatro redes le cuesta dos minutos y cero decisiones, así que lo hace todos los días en lugar de tres veces por semana. **Resolución:** los enlaces distinguen de qué red viene cada visita, así que al cabo de un mes sabe cuál de las cuatro merece su tiempo. **Caso límite:** si la Cita del Día supera los 300 caracteres y no admite Imagen, el kit lo dice y ofrece una Cita alternativa apta, en vez de dejarle sin material.

## 3. Glosario

Los flujos aguas abajo deben usar estos términos exactamente. Introducir un sinónimo en cualquier parte del documento es una violación de disciplina.

- **Cita** — Unidad atómica de contenido: un texto textual atribuido a un Autor. Tiene exactamente un Autor, cero o más Temas, una Procedencia y un Estado de Derechos. Es la única entidad con página propia indexable individualmente.
- **Autor** — Persona a quien se atribuye una o más Citas. Registra nombre, semblanza breve, nacionalidad y año de fallecimiento. El año de fallecimiento es obligatorio: sin él, ninguna Cita del Autor puede publicarse.
- **Tema** — Etiqueta transversal que agrupa Citas de distintos Autores (por ejemplo, el amor, el tiempo, el esfuerzo). Una Cita puede pertenecer a varios Temas.
- **Procedencia** — Origen documentado de una Cita: obra, año o referencia. Distinta de la atribución, que es solo el nombre del Autor. Una Cita puede tener Procedencia completa, parcial o ausente.
- **Estado de Derechos** — Campo de la Cita que registra bajo qué criterio es publicable. En la v1 solo se publica el valor `dominio-público`. El campo existe para admitir otros criterios sin rehacer la ingesta.
- **Estado de Publicación** — Campo de la Cita: `publicada` (visible e indexable) o `en-revisión` (no visible, no indexable).
- **Corpus** — Conjunto de todas las Citas del sistema, publicadas o en revisión.
- **Cita del Día** — La Cita destacada en la portada durante una jornada. Se selecciona del Corpus publicado.
- **Imagen de Cita** — Representación gráfica descargable de una Cita, generada por el sistema.
- **Página de Cita / Página de Autor / Página de Tema** — Las tres superficies indexables del sitio, una por entidad del mismo nombre.
- **Tarjeta Social** — Representación de una Página de Cita que muestran las redes cuando alguien pega su enlace. La compone el sistema; no es la Imagen de Cita, aunque se le parezca. Existe para toda Cita publicada, incluidas las que no admiten Imagen de Cita.
- **Destino de Compartición** — Aplicación o red a la que va a parar una Cita compartida. Puede ser **conocido** (el visitante eligió un destino concreto en el sitio) o **opaco** (el visitante usó la hoja del sistema, que no revela su elección).
- **Hoja del Sistema** — Selector de aplicaciones que ofrece el sistema operativo del visitante al compartir. Es el único camino hacia las redes que no admiten compartición desde la web.
- **Kit Diario** — Material de publicación que el sistema deja compuesto cada jornada para las cuentas propias: la Imagen de la Cita del Día, su pie con atribución y su enlace marcado por red. Superficie interna, no indexable.
- **Fuente** — Origen documental del que se extrae una Cita candidata durante el sembrado: una obra concreta en una edición concreta. Distinta de la Procedencia, que es lo que la Cita publica; la Fuente es de dónde lo sacó el editor y bajo qué licencia.

## 4. Features

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
- Cuando la Cita tiene Procedencia, se muestra la obra y el año disponibles.
- Cuando la Procedencia está ausente, la página lo indica explícitamente en lugar de omitir el bloque en silencio.
- El sistema nunca muestra una Procedencia inferida o aproximada.

#### FR-3: Copiado con atribución

El visitante puede copiar la Cita al portapapeles en una sola acción, y lo copiado incluye la atribución. Realiza UJ-1.

**Consecuencias (verificables):**
- Una sola pulsación copia texto y atribución juntos.
- El sistema confirma visualmente que el copiado ocurrió.
- El formato copiado es texto plano legible, sin marcado.

**Fuera de alcance:** elección de formato de citación académica (APA, MLA). `[NON-GOAL for MVP]`

---

### 4.2 Página de Autor

**Descripción:** Agrega todas las Citas publicadas de un Autor y aporta el contexto mínimo para situar a la persona. Es la segunda fuente de tráfico orgánico y el principal motor de sesión larga. Realiza UJ-3.

**Requisitos Funcionales:**

#### FR-4: Ficha y listado de Autor

Cualquier visitante puede ver, en una URL propia, la semblanza de un Autor y todas sus Citas publicadas. Realiza UJ-3.

**Consecuencias (verificables):**
- La página lista todas las Citas del Autor en estado `publicada`, y ninguna en `en-revisión`.
- La semblanza no supera un párrafo breve.
- Un Autor sin Citas publicadas no tiene Página de Autor accesible ni indexable.
- Cada Cita del listado enlaza a su Página de Cita.

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

---

### 4.4 Búsqueda

**Descripción:** La vía de entrada para quien ya está en el sitio y para quien llega sin una consulta de buscador. Debe tolerar cómo se escribe realmente en español: sin acentos, con errores, y a menudo recordando solo un fragmento de la frase.

**Requisitos Funcionales:**

#### FR-7: Búsqueda por texto

Cualquier visitante puede buscar Citas por fragmento de texto, por nombre de Autor o por Tema desde cualquier página del sitio.

**Consecuencias (verificables):**
- La búsqueda devuelve resultados equivalentes con y sin acentos ("Machado" y "machado", "corazon" y "corazón").
- La búsqueda es insensible a mayúsculas y minúsculas.
- Un fragmento de tres o más palabras consecutivas de una Cita publicada la devuelve entre los resultados.
- Los resultados distinguen visualmente si la coincidencia es de Cita, de Autor o de Tema.

#### FR-8: Resultado vacío productivo

Cuando una búsqueda no devuelve resultados, el visitante recibe una salida en lugar de un callejón sin salida.

**Consecuencias (verificables):**
- La pantalla de cero resultados ofrece Temas y Autores destacados como alternativa.
- El sistema registra la consulta sin resultados para alimentar la curación del Corpus (§4.8).

---

### 4.5 Portada y Cita del Día

**Descripción:** La portada da identidad al producto y es el motivo de retorno directo. Su elemento central es la Cita del Día, que también da nombre al sitio.

**Requisitos Funcionales:**

#### FR-9: Cita del Día

Cualquier visitante que llegue a la portada ve una Cita destacada que cambia una vez por jornada.

**Consecuencias (verificables):**
- La Cita del Día es la misma para todos los visitantes dentro de una misma jornada.
- La Cita del Día enlaza a su Página de Cita.
- La selección es **automática por regla**, sobre el subconjunto de Citas que el editor ha marcado como aptas para portada. No exige intervención diaria.
- La selección no repite una Cita mientras queden aptas sin destacar.
- El editor puede fijar manualmente la Cita del Día de una fecha concreta; esa fijación tiene prioridad sobre la regla.
- La portada no es la superficie de entrada mayoritaria y no se optimiza como tal.

---

### 4.6 Imagen de Cita

**Descripción:** Convierte una Cita en un objeto publicable. Es la pieza que cierra el circuito de tráfico: la imagen lleva la marca, así que la publicación de un visitante trae al siguiente. Realiza UJ-2. Es también el mayor coste técnico no evidente de la v1 —generación, tipografías, caché, distribución— y así consta en el addendum del brief.

**Requisitos Funcionales:**

#### FR-10: Generación de Imagen de Cita

Cualquier visitante puede generar y descargar una Imagen de Cita desde la Página de Cita. Realiza UJ-2.

**Consecuencias (verificables):**
- La imagen contiene el texto de la Cita, el nombre del Autor y la marca del sitio.
- La imagen se genera en un formato de proporción apta para publicación en redes sociales.
- El texto es legible en la imagen sin recorte para Citas de hasta una longitud máxima definida.
- El tamaño tipográfico se reduce por **tramos discretos** según la longitud de la Cita, hasta un mínimo legible definido.
- Las Citas de **más de 300 caracteres** no ofrecen Imagen de Cita: la acción no se muestra en su Página de Cita.
- El sistema **nunca recorta ni abrevia** el texto para que quepa (ver NFR-12). Ausencia antes que mutilación.

#### FR-11: Selección de diseño

El visitante puede elegir entre un conjunto acotado de diseños antes de descargar.

**Consecuencias (verificables):**
- Se ofrece más de un diseño y menos de los que obliguen a decidir.
- El diseño elegido no altera el contenido textual ni la atribución.

**NFR específicos de la feature:**
- La generación no debe bloquear la interacción con la Página de Cita mientras ocurre.

---

### 4.7 Descubrimiento

**Descripción:** Convierte una visita de un segundo en una sesión. Es la feature que sostiene la métrica de páginas por sesión y la que hace rentable el tamaño reducido del Corpus: con pocas Citas, las rutas entre ellas importan más. Realiza UJ-3.

**Requisitos Funcionales:**

#### FR-12: Rutas de salida desde la Página de Cita

Desde cualquier Página de Cita, el visitante encuentra al menos una ruta a contenido relacionado. Realiza UJ-3.

**Consecuencias (verificables):**
- Se ofrecen otras Citas del mismo Autor.
- Se ofrecen Citas de los mismos Temas.
- Ninguna Página de Cita publicada queda sin enlaces salientes internos.
- La relación se deriva de Autor y Tema; no hay motor de recomendación. `[NON-GOAL for MVP]`

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

**Restricción de plataforma que condiciona todos los FR de esta feature.** Compartir ficheros desde la web solo existe en navegadores móviles; en escritorio no hay hoja del sistema. Y ninguna red permite preinsertar texto en una publicación de imagen: Instagram y TikTok reciben el fichero y nada más. El producto no puede prometer «publicar en un toque»; promete **entregar la pieza a la aplicación correcta sin pasar por el gestor de ficheros**.

**Requisitos Funcionales:**

#### FR-17: Compartir la Imagen de Cita por la Hoja del Sistema

El visitante puede enviar la Imagen de Cita a cualquier aplicación de su dispositivo sin pasar por la descarga. Realiza UJ-2.

**Consecuencias (verificables):**
- Donde el navegador admite compartir ficheros, la acción principal abre la Hoja del Sistema con la imagen ya adjunta.
- Donde no lo admite, la misma acción descarga el fichero, con el comportamiento de la v1 sin cambios. No existe una tercera vía, ni un botón deshabilitado, ni un aviso de incompatibilidad.
- El fichero compartido y el fichero descargado son el mismo: una sola ruta de generación produce ambos.
- La elección de plantilla (FR-11) precede a compartir igual que precedía a descargar.
- Si el visitante cierra la Hoja del Sistema sin elegir destino, no se registra compartición y no se muestra ningún error.

#### FR-18: Compartir el enlace de una Cita

El visitante puede enviar el enlace de la Página de Cita, con su atribución, al lugar donde quiera publicarlo.

**Consecuencias (verificables):**
- El texto propuesto incluye la Cita y su Autor; nunca solo la URL desnuda.
- En un dispositivo con Hoja del Sistema, la acción la abre con enlace y texto.
- Donde no la hay, se ofrecen Destinos de Compartición concretos y visibles.
- Ningún destino exige al visitante registrarse en el sitio ni instalar nada.
- El enlace compartido lleva marca de origen sin que ello genere una URL indexable distinta de la canónica.

#### FR-19: Tarjeta Social de toda Cita publicada

Cuando alguien pega el enlace de una Cita en una red, la previsualización muestra la Cita, no un genérico del sitio.

**Consecuencias (verificables):**
- Toda Cita publicada tiene Tarjeta Social. Ninguna queda sin ella.
- La Tarjeta de una Cita que admite Imagen de Cita presenta el texto de la Cita y su Autor.
- La Tarjeta de una Cita que **no** admite Imagen —por superar el límite de longitud de FR-10— presenta Autor y marca **sin el texto de la Cita**. Nunca un fragmento recortado: NFR-12 prohíbe alterar el texto, y media Cita en una tarjeta es una Cita alterada.
- La composición se verifica contra los validadores de previsualización de las redes de destino, no solo a ojo.

#### FR-20: Medición de la compartición

El sistema registra que hubo compartición y, cuando la plataforma lo permite, hacia dónde. Valida SM-7.

**Consecuencias (verificables):**
- Se registra el evento con su Destino de Compartición cuando es conocido, y como opaco cuando el visitante usó la Hoja del Sistema.
- La compartición de imagen y la de enlace se distinguen entre sí.
- No se añade cookie, identificador de visitante ni dato que pueda convertirse en uno: NFR-10 y NFR-11 siguen intactos.
- El vocabulario de eventos permanece cerrado; añadir uno exige modificar el módulo de medición, y esa fricción es deliberada.

---

### 4.10 Kit Diario de Publicación *(v2)*

**Descripción:** Superficie interna que convierte la jornada del sitio en material publicable en las cuentas propias. Realiza UJ-5.

Existe por una razón de plan, no de comodidad: mientras el Corpus no sostenga tráfico de buscador, las cuentas de Sabiduría de Bolsillo son el único canal de entrada, y un canal que depende de que su operador tenga tiempo y ganas cada mañana deja de alimentarse en la primera semana ocupada. El Kit Diario reduce la publicación diaria a un gesto, que es lo que la hace sostenible.

**Requisitos Funcionales:**

#### FR-21: La jornada deja el material compuesto

Cada jornada, el sistema deja preparado y accesible el material para publicar la Cita del Día. Realiza UJ-5.

**Consecuencias (verificables):**
- El material incluye la Imagen de la Cita del Día ya generada, un pie con la atribución, y el enlace a su Página de Cita.
- Es accesible desde un móvil sin herramientas ni acceso al repositorio.
- Se recompone en la misma jornada en que cambia la Cita del Día, sin intervención.
- La superficie no es indexable ni alcanzable desde la navegación pública.
- Si la Cita del Día no admite Imagen de Cita, el Kit lo indica y ofrece una Cita alternativa apta, en lugar de presentar un material incompleto.

#### FR-22: Atribución del tráfico por cuenta

El editor puede saber qué red trae visitas. Valida SM-8.

**Consecuencias (verificables):**
- El enlace del Kit distingue la red de destino, una marca por cuenta.
- La página de destino es siempre la misma URL canónica, con o sin marca de origen: el índice del buscador no ve páginas duplicadas.
- La marca de origen no altera lo que ve el visitante.

---

### 4.11 Sembrado del Corpus *(v2)*

**Descripción:** Proceso incremental por el que el Corpus crece desde las 38 Citas actuales hacia el orden de magnitud que §6.1 supone, sin que baje el porcentaje de Citas con Procedencia verificada. Extiende la herramienta de §4.8; no la sustituye.

**La decisión que define esta feature es de dónde NO se extrae.** Los sitios de citas existentes publican texto y nombre, sin obra ni año: cualquier Cita tomada de ellos moriría en la puerta de admisión de FR-13, y además §5 lo excluye explícitamente. La extracción se hace **desde las obras**, en fuentes de dominio público que traen la referencia consigo. La Procedencia no se busca después de tener el texto: viene con él.

**Sobre las traducciones.** Una obra en dominio público no arrastra a sus traducciones, que son obras nuevas con su propio plazo de protección. Y una traducción hecha por el editor produce una frase en español que no consta en ninguna edición publicada, o sea una Cita cuya Procedencia no es verificable — justo el defecto que el producto existe para corregir. Solo se admite texto en español procedente de una edición identificable, sea original o traducción ya en dominio público.

**Requisitos Funcionales:**

#### FR-23: Extracción de candidatas desde una Fuente

El editor elige un Autor y una Fuente, y obtiene Citas candidatas con su Procedencia ya rellena.

**Consecuencias (verificables):**
- Cada candidata llega con obra y año tomados de la Fuente, no inferidos.
- Cada candidata registra de qué Fuente y bajo qué licencia se obtuvo.
- Una Fuente cuya licencia no permita reutilización no produce candidatas.
- El sistema no propone candidatas cuyo texto no esté en español.

#### FR-24: Aprobación por lote

El editor revisa las candidatas en bloque y decide cuáles entran, sin abandonar la revisión para cada una.

**Consecuencias (verificables):**
- Aprobar una candidata la somete a las mismas reglas de FR-13 y FR-14 que cualquier alta: el sembrado no abre una puerta lateral.
- Rechazar una candidata la descarta sin dejarla en el Corpus.
- Una candidata duplicada de una Cita ya publicada se señala antes de la decisión.
- El lote es reanudable: el editor puede dejarlo a medias y continuar otro día.

#### FR-25: Prioridad de sembrado por hueco del Corpus

El editor puede ver qué falta antes de decidir a qué Autor dedica la sesión. Valida SM-C2.

**Consecuencias (verificables):**
- Se muestran los Temas por debajo del umbral de publicación de FR-6, con cuántas Citas les faltan.
- Se muestra la proporción de Autores de tradición latinoamericana frente al suelo del 40 % de §6.1.
- La vista no propone Autores automáticamente: informa la decisión del editor, no la sustituye.

## 5. No-Objetivos (Explícitos)

- **No somos una red social.** Sin cuentas, sin perfiles, sin comentarios, sin votos.
- **No somos un agregador.** El Corpus se cura, no se rastrea de otros sitios. Se evaluó explícitamente en la v2 extraer de un sitio de citas existente y se descartó por tres razones concurrentes: sus condiciones lo prohíben, su compilación está protegida, y —lo decisivo— publica texto y nombre sin obra ni año, así que **nada de lo extraído pasaría la puerta de admisión de FR-13**. Ver §4.11.
- **No traducimos Citas para publicarlas.** Una traducción propia produce una frase que no consta en ninguna edición, es decir, una Cita sin Procedencia verificable. Solo entra texto en español de una edición identificable.
- **No somos una enciclopedia de autores.** La semblanza sitúa; no compite con Wikipedia.
- **No aspiramos al volumen en la v1.** Un catálogo pequeño y verificado, no uno grande y dudoso.
- **No traducimos.** El producto es en español y las Citas se publican en español.
- **No monetizamos todavía.** La v1 se diseña sin publicidad; la decisión se toma con datos de tráfico.
- **No generamos Citas con IA.** El sistema no crea ni parafrasea contenido atribuible a una persona real.

## 6. Alcance

### 6.1 Dentro de la v1

- Páginas de Cita, Autor y Tema, todas indexables (FR-1…FR-6).
- Búsqueda tolerante a acentos y por fragmento (FR-7, FR-8).
- Portada con Cita del Día (FR-9).
- Imagen de Cita descargable (FR-10, FR-11).
- Descubrimiento por Autor y Tema (FR-12).
- Herramienta interna de ingesta y curación (FR-13…FR-16).
- Fundamentos de SEO y rendimiento (§8).
- Corpus de arranque: ~2.000 Citas de 150–250 Autores, con **mínimo del 40 % de Autores de tradición latinoamericana**. El suelo es explícito porque el sesgo hacia España es el resultado por defecto de cualquier curación no vigilada.

### 6.2 Fuera de la v1

- **Cuentas, favoritos y colecciones** — requieren autenticación y almacenamiento por usuario; no sirven al tráfico orgánico, que es el mecanismo de crecimiento. Diferido a v2.
- **Aportes de usuarios** — exigen moderación y verificación de procedencia desde el día uno. Diferido a v2. `[NOTE FOR PM]` Es la vía natural de escalado del Corpus; revisar en cuanto la curación interna sea el cuello de botella.
- **Boletín y notificaciones** — dependen de tener audiencia. Diferido.
- **Motor de recomendación** — la relación por Autor y Tema basta con 2.000 Citas.
- **Monetización y publicidad** — decisión con datos, no con supuestos.
- **App nativa** — la web responsive cubre el caso de uso completo.
- **Multilingüe** — no es el producto.

### 6.3 Alcance de la v2

La v1 construyó el producto y quedó verificada sin haberse publicado nunca. La v2 tiene un objetivo distinto y más estrecho: **ponerlo delante de personas y aprender de ellas**. Todo lo que no sirva a eso queda fuera.

**Dentro:**

- Renombrado de marca a Sabiduría de Bolsillo en todas las superficies, incluida la marca de la Imagen de Cita (§0).
- Compartición directa a redes (FR-17…FR-20).
- Kit Diario de Publicación para las cuentas propias (FR-21, FR-22).
- Sembrado incremental del Corpus desde fuentes con Procedencia (FR-23…FR-25).
- Condiciones de Lanzamiento cumplidas y verificadas (§13).

**El orden importa y no es negociable.** El renombrado va primero, antes de que exista una URL indexada. El sembrado y las Condiciones de Lanzamiento van antes que la compartición: compartir con 38 Citas y sin medición configurada gasta el alcance de las cuentas en un sitio que todavía no puede retener a nadie ni contar si lo hizo.

**Fuera de la v2, y por qué:**

- **Vídeo y por tanto YouTube.** Las otras cuatro cuentas consumen imagen fija, que el sistema ya sabe componer. El vídeo exige un motor propio —composición temporal, audio, duración— que no es una historia sino un producto. Se revisa cuando las cuentas de imagen demuestren que traen visitantes.
- **Publicación automática en las cuentas.** El Kit Diario deja el material compuesto; publicar lo hace Héctor. Automatizarlo exige credenciales de cuatro plataformas, sus revisiones de aplicación y su mantenimiento, para ahorrar dos minutos al día.
- **Cuentas, favoritos y aportes de usuarios.** Siguen diferidos por las razones de §6.2, que la v2 no cambia.

## 7. Métricas de Éxito

**Primarias**

- **SM-1 — Indexación.** ≥ 90 % de las Citas publicadas indexadas a los 3 meses del lanzamiento. Valida FR-1 y §8. Es el indicador temprano: si las páginas no se indexan, ninguna otra métrica llega a existir.
- **SM-2 — Tráfico orgánico.** 5.000 sesiones orgánicas/mes al mes 6; 25.000 al mes 12. Valida FR-1, FR-4, FR-6.

**Secundarias**

- **SM-3 — Resolución de la intención.** Rebote < 65 % en Páginas de Cita. Valida FR-1, FR-2, FR-3.
- **SM-4 — Fondo del sitio.** ≥ 1,8 páginas por sesión. Valida FR-12, FR-4.
- **SM-5 — Circuito de compartición.** ≥ 3 % de las visitas a Página de Cita generan una acción de copiado o de descarga de Imagen de Cita. Valida FR-3, FR-10. Es la métrica que justifica el coste de la feature más cara de la v1.
- **SM-6 — Cobertura de la búsqueda.** < 15 % de búsquedas internas con cero resultados. Valida FR-7, FR-8.
- **SM-7 — Compartición efectiva.** ≥ 2 % de las visitas a Página de Cita generan una compartición, de imagen o de enlace. Valida FR-17, FR-18. Se mide aparte de SM-5 a propósito: copiar y descargar son usos privados, compartir es el único que puede traer a otra persona.
- **SM-8 — Rendimiento del canal propio.** Visitas atribuidas a cada cuenta de Sabiduría de Bolsillo, por red y por jornada. Valida FR-21, FR-22. No lleva objetivo numérico: en la v2 la pregunta no es cuánto trae, sino **cuál de las cuatro redes trae**, porque de eso depende dónde se invierte el tiempo del mes siguiente.

**Contra-métricas (no optimizar)**

- **SM-C1 — Procedencia verificada.** Porcentaje de Citas publicadas con Procedencia completa. Contrapesa SM-2: el tráfico crece publicando más Citas, y la vía barata de publicar más es relajar la verificación. Si SM-C1 baja mientras SM-2 sube, el producto está destruyendo su único diferenciador defendible. Valida FR-13, FR-16.
- **SM-C2 — Densidad de las Páginas de Tema.** Número mediano de Citas por Tema publicado. Contrapesa SM-1: la vía barata de multiplicar páginas indexables es crear Temas con tres Citas cada uno, que es exactamente el defecto de los competidores. Valida FR-6, FR-25.
- **SM-C3 — Sustitución del circuito privado.** Suma de copiados y descargas (SM-5) medida junto a SM-7. Contrapesa SM-7: la vía barata de subir la compartición es hacer que compartir estorbe menos que copiar. Si SM-7 sube mientras SM-5 baja en proporción parecida, la v2 no ha ampliado el alcance del sitio — ha movido un botón de sitio. Valida FR-3, FR-17.

## 8. SEO y Descubribilidad *(preocupación transversal)*

En este producto el SEO no es una optimización posterior: es el mecanismo por el que el producto encuentra a sus usuarios. Se documenta como sección propia porque sus requisitos atraviesan todas las features y ninguna de ellas los contiene.

- **NFR-1.** Toda Página de Cita, Autor y Tema publicada es rastreable e indexable, con etiqueta canónica propia y presencia en el sitemap.
- **NFR-2.** El contenido principal de cada página está disponible en el HTML inicial, sin requerir ejecución de JavaScript para ser leído por un rastreador.
- **NFR-3.** Cada Página de Cita expone datos estructurados de cita con su autor.
- **NFR-4.** Las URL son legibles, estables y en español, sin identificadores opacos.
- **NFR-5.** Ninguna página publicada queda huérfana: toda página es alcanzable por enlaces internos desde la portada en un número acotado de saltos.
- **NFR-6.** El contenido en estado `en-revisión` no es rastreable, indexable ni alcanzable por URL adivinable.

## 9. NFR Transversales

- **NFR-7 — Rendimiento.** El contenido principal de una Página de Cita es visible en móvil con conexión 4G en menos de 2,5 segundos. El rendimiento es requisito de SEO, no de confort.
- **NFR-8 — Móvil primero.** Todas las superficies públicas son plenamente utilizables en un viewport de 360 px de ancho. El grueso del tráfico llega desde móvil.
- **NFR-9 — Accesibilidad.** Contraste, tamaño tipográfico y navegación por teclado conformes a WCAG 2.1 nivel AA en las superficies públicas.
- **NFR-10 — Sin muro de entrada.** Ninguna superficie pública exige interacción (modal, aviso, registro) antes de mostrar el contenido principal.
- **NFR-11 — Privacidad.** La analítica no requiere consentimiento invasivo ni identifica individualmente al visitante. El sitio se dirige a mercados con normativas distintas, incluida la europea.
- **NFR-12 — Integridad del contenido.** El sistema no altera, corrige ni normaliza el texto de una Cita publicada sin acción explícita del editor.

## 10. Arquitectura de la Información

Cuatro superficies públicas y una interna:

- **Portada** — Cita del Día, acceso a la búsqueda, entradas a Temas destacados.
- **Página de Cita** — hoja del árbol y principal punto de entrada real desde buscadores.
- **Página de Autor** — agregación por persona; enlaza a sus Citas.
- **Página de Tema** — agregación transversal; enlaza a Citas de varios Autores.
- **Herramienta de curación** — interna, no indexable, un solo operador.

La navegación real del visitante es lateral, no jerárquica: entra por una hoja y se mueve entre hojas a través de Autor y Tema. La portada es identidad y retorno, no puerta de entrada.

## 11. Estética y Tono

- **Referencias:** el contenido manda sobre el continente. Tipografía grande y legible, mucho aire, cero adornos que compitan con la Cita.
- **Anti-referencias:** los sitios de citas en español actuales — fondos con textura, publicidad intercalada en el contenido, tipografía pequeña, listados densos sin jerarquía.
- **Voz del producto:** sobria y sin solemnidad impostada. El sitio no comenta las Citas ni las adjetiva ("¡una frase increíble!"). Presenta y se aparta.
- **La marca en la Imagen de Cita** está presente pero subordinada: se lee, no se impone sobre la frase.

## 12. Plataforma y Monetización

- **Plataforma v1:** web responsive, sin app nativa ni PWA instalable.
- **Monetización:** ninguna en la v1. La decisión se toma con datos de tráfico reales. El diseño no debe crear obstáculos a una futura inserción publicitaria, pero tampoco reservarle espacio: NFR-10 tiene prioridad sobre cualquier consideración publicitaria futura.

## 13. Condiciones de Lanzamiento

No son features y no producen FR: son las puertas que deben estar abiertas para que el sitio pueda considerarse publicado. Existen como sección propia porque cada una es invisible mientras falta —el sitio funciona igual de bien sin ninguna de ellas— y su ausencia solo se descubre semanas después, cuando la métrica que dependía de ella no existe.

- **LC-1 — Dominio propio sirviendo.** `sabiduriadebolsillo.com` responde por HTTPS, y la URL canónica de cada página y el sitemap lo declaran. Mientras el sitio se sirva desde una URL provisional, cada página indexada es una redirección futura.
- **LC-2 — El sitemap es anunciable.** Existe un `robots.txt` que declara dónde está el sitemap. Hoy el sitemap se genera y no lo anuncia nada.
- **LC-3 — Search Console verificada.** Propiedad verificada y sitemap enviado. Sin ella, SM-1 no es medible: no hay otra forma de saber cuántas Citas están indexadas.
- **LC-4 — La medición recibe.** El punto final de medición está desplegado y los eventos de la v1 llegan y se pueden consultar. El módulo está construido desde la v1 y hasta hoy no envía a ninguna parte.
- **LC-5 — Coherencia de marca.** Ninguna superficie, ni la marca de agua de la Imagen de Cita, menciona el nombre retirado.
- **LC-6 — Corpus mínimo defendible.** Ninguna Cita publicada sin Procedencia, y al menos un Tema publicado por encima del umbral de FR-6 en cada Tema que se anuncie en la portada. Un visitante que llega desde las cuentas y encuentra un Tema vacío no vuelve.

## 14. Preguntas Abiertas

Las seis preguntas abiertas de la primera redacción se resolvieron en aquella pasada; las decisiones están incorporadas a los FR y registradas en `.memlog.md`. Quedan tres, ninguna bloqueante para UX ni para Arquitectura:

1. **Marca registrada.** Búsqueda en OEPM y EUIPO para "Sabiduría de Bolsillo". El dominio está contratado, que es cosa distinta. No bloquea el desarrollo, sí el gasto en identidad visual.
2. **Umbral de reducción tipográfica.** FR-10 fija los tramos por longitud y el corte en 300 caracteres, pero los valores concretos de cada tramo salen de probar plantillas reales. Corresponde a UX, no a producto.
3. **Cadencia de sembrado.** FR-23…FR-25 definen el proceso, no el ritmo. Cuántas Citas por sesión y cada cuánto es una decisión de operación que se toma con la primera sesión real hecha, no antes.

## 15. Índice de Supuestos

Los supuestos etiquetados en la primera redacción se convirtieron en decisiones (§14). Permanecen dos, ambos de capacidad y no de preferencia:

- **§8 / NFR-2** — El sitio se sirve con HTML renderizado en servidor o pregenerado. Es un supuesto de capacidad, no una elección de tecnología: la indexación fiable de ~2.000 páginas lo requiere. La elección concreta corresponde a Arquitectura.
- **§6.1** — El Corpus de arranque de ~2.000 Citas es alcanzable por un solo editor antes del lanzamiento. Es el supuesto con más riesgo de plan del documento: si resulta falso, la palanca es reducir el Corpus, nunca relajar FR-13. **Revisado en la v2:** resultó falso en su forma original. El lanzamiento no espera a las 2.000 Citas; sale con lo que haya y el Corpus crece publicado, mediante §4.11. Lo que no se toca es FR-13, exactamente como el supuesto preveía.
- **§4.10 / SM-8** — Las cuentas de Sabiduría de Bolsillo tienen audiencia suficiente para producir visitas medibles. Es un supuesto de capacidad del canal, no del sistema: si resulta falso, SM-8 no dará señal y la conclusión será que el canal propio no sustituye al buscador, no que el Kit Diario esté mal construido.
