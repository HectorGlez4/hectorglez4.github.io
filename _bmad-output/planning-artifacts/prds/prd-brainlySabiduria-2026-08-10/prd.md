---
title: Sabiduría de Bolsillo
status: final
created: 2026-08-10
updated: 2026-08-18
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
  Héctor, único editor, tiene un lote de citas de un autor recién entrado en dominio público. El lote entra por la herramienta interna — lo lanza él o un agente por él; la puerta es la misma. El sistema rechaza las que no traen **Procedencia** y las que pertenecen a un **Autor** sin año de fallecimiento registrado, dejándolas en estado de revisión en lugar de publicarlas. Él completa lo que falta y publica el resto. **Clímax:** el catálogo crece sin que baje el porcentaje de citas verificadas. **Caso límite:** si una cita duplica una ya publicada, el sistema lo señala antes de aceptarla.

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
- **Colección** *(v3)* — Agrupación editorial de Citas escogidas por un criterio que no es el Autor ni el Tema («frases cortas», «para dedicar», «para empezar el año»). Transversal a ambos: una Cita puede estar en varias Colecciones sin que cambie su Tema ni su Autor. Tiene página propia indexable y umbral mínimo de publicación, como el Tema. A diferencia del Tema, su criterio es editorial y su conjunto es abierto.
- **Pieza de Canal** *(v3)* — Unidad publicable en una cuenta propia. La v2 producía una sola por jornada (la Imagen de la Cita del Día, dentro del Kit Diario); la v3 admite además piezas de varias Citas y piezas en movimiento. Es material de salida, nunca una superficie indexable.
- **Modelo de Ingreso** *(v3)* — Una de las cuatro vías por las que el producto puede producir ingreso: donaciones, afiliación de libros, producto propio o publicidad. Cada uno tiene su Umbral de Activación.
- **Umbral de Activación** *(v3)* — Cifra de tráfico orgánico medido por encima de la cual un Modelo de Ingreso puede encenderse. Se mide en el receptor de LC-4. Por debajo del umbral, el Modelo está diseñado pero apagado.

## 4. Features

Catorce features repartidas en tres rondas. La etiqueta de versión va también en cada encabezado:

- **v1 — §4.1…§4.8.** El producto: las cuatro superficies públicas, la búsqueda, la Imagen de Cita y la herramienta de curación.
- **v2 — §4.9…§4.11.** Ponerlo delante de personas: compartición, canal propio y sembrado del Corpus.
- **v3 — §4.12…§4.14.** Que crezca y se sostenga: Colecciones, ampliación del canal y monetización por umbral.

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

**La restricción que gobierna toda la sección.** NFR-10 (sin muro de entrada) tiene prioridad sobre cualquier Modelo de Ingreso, y §11 identifica «publicidad intercalada en el contenido» como anti-referencia declarada del producto. **Ninguna unidad publicitaria** puede aparecer en la Página de Cita ni en la de Colección, que son el punto de entrada real desde buscadores y las superficies donde el producto cumple su promesa. Un Modelo sin coste de superficie sí puede nacer de lo que la página ya publica —es el caso de FR-35, cuyo enlace sale de la Procedencia—, siempre que la atribución se lea igual con el Modelo encendido que apagado.

**Requisitos Funcionales:**

#### FR-33: Activación por umbral medido

Ningún Modelo de Ingreso se enciende antes de que su Umbral de Activación se mida en el receptor de LC-4.

**Consecuencias (verificables):**
- El umbral se comprueba contra tráfico orgánico medido, no estimado ni proyectado.
- Cada Modelo se enciende y se apaga por separado, sin afectar a los demás.
- Un Modelo apagado no deja hueco reservado ni espacio en blanco en ninguna superficie, por §12.
- El estado de cada Modelo (activo o apagado, y contra qué cifra) es consultable sin exportar datos, como en FR-16.

#### FR-34: Donaciones

El visitante que quiere sostener el sitio encuentra cómo, sin que se le pida.

**Umbral de Activación:** desde que LC-1…LC-4 estén verificadas. Es un enlace; su coste es cero.

**Consecuencias (verificables):**
- La invitación no aparece en la Página de Cita ni interrumpe ninguna lectura.
- No introduce JavaScript de terceros en ninguna superficie pública.
- Rechazar o ignorar la invitación no degrada ninguna funcionalidad.

#### FR-35: Afiliación de libros

La Procedencia de una Cita puede llevar a la edición de la que salió.

**Umbral de Activación:** 2.000 sesiones orgánicas/mes.

**Consecuencias (verificables):**
- El enlace sale de la Procedencia ya publicada (FR-2); no se inventa una obra para poder enlazar.
- Una Cita sin Procedencia completa no produce enlace de afiliación, nunca uno aproximado.
- La relación comercial se declara donde el enlace aparece.
- La atribución y la Procedencia se leen igual con el Modelo apagado que encendido.

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
- **La Página de Cita queda excluida.** También la Página de Colección, que es superficie de lectura. Admiten publicidad la portada, los resultados de búsqueda y la página 404.
- Ninguna unidad publicitaria se intercala entre el contenido, por §11.
- No degrada NFR-7: el contenido principal sigue visible en móvil con 4G en menos de 2,5 s, medido con el Modelo encendido.
- No introduce muro, modal ni aviso previo al contenido, por NFR-10.
- No exige consentimiento invasivo ni identificación individual del visitante, por NFR-11. Un Modelo que lo exija no cumple este FR y no se enciende.

---

## 5. No-Objetivos (Explícitos)

- **No somos una red social.** Sin cuentas, sin perfiles, sin comentarios, sin votos.
- **No somos un agregador.** El Corpus se cura, no se rastrea de otros sitios. Se evaluó explícitamente en la v2 extraer de un sitio de citas existente y se descartó por tres razones concurrentes: sus condiciones lo prohíben, su compilación está protegida, y —lo decisivo— publica texto y nombre sin obra ni año, así que **nada de lo extraído pasaría la puerta de admisión de FR-13**. Ver §4.11.
- **No traducimos Citas para publicarlas.** Una traducción propia produce una frase que no consta en ninguna edición, es decir, una Cita sin Procedencia verificable. Solo entra texto en español de una edición identificable.
- **No somos una enciclopedia de autores.** La semblanza sitúa; no compite con Wikipedia.
- **No aspiramos al volumen en la v1.** Un catálogo pequeño y verificado, no uno grande y dudoso.
- **No traducimos.** El producto es en español y las Citas se publican en español.
- **No monetizamos antes de su umbral.** La v1 se diseñó sin ingreso alguno. La v3 no deroga esa regla: diseña los cuatro Modelos de Ingreso y los deja apagados hasta que el tráfico medido cruce el Umbral de Activación de cada uno (§4.14, §12). Lo que se adelanta es el diseño, nunca el cobro.
- **No ponemos publicidad donde se lee.** Ninguna unidad publicitaria aparece en la Página de Cita ni en la Página de Colección: son las superficies donde el producto cumple su promesa y el punto de entrada real desde buscadores. §11 y NFR-10 tienen prioridad sobre cualquier ingreso.
- **No inventamos texto y lo presentamos como real.** El sistema no crea ni parafrasea el texto de una Cita, ni compone prosa nueva sobre una persona real y la publica como si estuviera documentada. Seleccionar y transcribir literalmente de una edición identificable **sí** es admisible, y es exactamente lo que hace el sembrado de §4.11, lo ejecute el editor o un agente. La distinción es entre *escoger lo que alguien escribió* y *escribir en su lugar*. **La semblanza de un Autor entra en la prohibición**: es prosa nueva sobre una persona real, así que o procede de una fuente citable o la escribe una persona que responde de ella.

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
- **Monetización y publicidad** — decisión con datos, no con supuestos. **Revisado en la v3:** la regla se conserva y se hace operable. La v3 diseña los Modelos de Ingreso y fija su Umbral de Activación en cifras de tráfico medido; ninguno se enciende por debajo del suyo. Ver §4.14 y §12.
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
- **SM-9 — Cobertura de la cola larga.** Sesiones orgánicas que aterrizan en una Página de Colección, como proporción del total orgánico. Valida FR-26. Sin objetivo numérico en la primera pasada: la pregunta es si la superficie captura consultas que las otras cuatro no capturaban, y eso se responde comparando las consultas de entrada, no un porcentaje.
- **SM-10 — Ingreso por Modelo.** Ingreso mensual atribuido a cada Modelo de Ingreso activo, junto al tráfico que lo produjo. Valida FR-33…FR-37. Se mide por Modelo y no agregado a propósito: la decisión que informa es cuál merece seguir encendido, y un total no la responde.
- **SM-8 — Rendimiento del canal propio.** Visitas atribuidas a cada cuenta de Sabiduría de Bolsillo, por red y por jornada. Valida FR-21, FR-22. No lleva objetivo numérico: en la v2 la pregunta no es cuánto trae, sino **cuál de las cuatro redes trae**, porque de eso depende dónde se invierte el tiempo del mes siguiente.

**Contra-métricas (no optimizar)**

- **SM-C1 — Procedencia verificada.** Porcentaje de Citas publicadas con Procedencia completa. Contrapesa SM-2: el tráfico crece publicando más Citas, y la vía barata de publicar más es relajar la verificación. Si SM-C1 baja mientras SM-2 sube, el producto está destruyendo su único diferenciador defendible. Valida FR-13, FR-16.
- **SM-C2 — Densidad de las páginas de agregación.** Número mediano de Citas por Tema publicado **y por Colección publicada**. Contrapesa SM-1: la vía barata de multiplicar páginas indexables es crear Temas con tres Citas cada uno, que es exactamente el defecto de los competidores. **Extendida en la v3:** las Colecciones son agregación igual que los Temas y fallan igual, así que entran en la misma contra-métrica en vez de tener una propia — una contra-métrica repartida en dos no frena en ninguna de las dos. Valida FR-6, FR-25, FR-26.
- **SM-C4 — Coste de la monetización sobre la experiencia.** SM-3 (rebote en Página de Cita) y NFR-7 (tiempo hasta el contenido en 4G) medidos antes y después de encender cada Modelo de Ingreso. Contrapesa SM-10: la vía barata de subir el ingreso es ocupar más superficie y aceptar que el sitio empeore un poco cada vez. Si SM-10 sube mientras SM-3 o NFR-7 se degradan, el Modelo se apaga — está comprándose ingreso con el activo que lo produce. Valida FR-33, FR-37.
- **SM-C3 — Sustitución del circuito privado.** Suma de copiados y descargas (SM-5) medida junto a SM-7. Contrapesa SM-7: la vía barata de subir la compartición es hacer que compartir estorbe menos que copiar. Si SM-7 sube mientras SM-5 baja en proporción parecida, la v2 no ha ampliado el alcance del sitio — ha movido un botón de sitio. Valida FR-3, FR-17.

## 8. SEO y Descubribilidad *(preocupación transversal)*

En este producto el SEO no es una optimización posterior: es el mecanismo por el que el producto encuentra a sus usuarios. Se documenta como sección propia porque sus requisitos atraviesan todas las features y ninguna de ellas los contiene.

- **NFR-1.** Toda Página de Cita, Autor y Tema publicada es rastreable e indexable, con etiqueta canónica propia y presencia en el sitemap.
- **NFR-2.** El contenido principal de cada página está disponible en el HTML inicial, sin requerir ejecución de JavaScript para ser leído por un rastreador.
- **NFR-3.** Cada Página de Cita expone datos estructurados de cita con su autor.
- **NFR-4.** Las URL son legibles, estables y en español, sin identificadores opacos.
- **NFR-5.** Ninguna página publicada queda huérfana: toda página es alcanzable por enlaces internos desde la portada en un número acotado de saltos.
- **NFR-6.** El contenido en estado `en-revisión` no es rastreable, indexable ni alcanzable por URL adivinable.
- **NFR-13** *(v3)*. Ninguna superficie de agregación canibaliza a la Cita. La canónica de una Cita es siempre su Página de Cita, esté en cuantos Temas y Colecciones esté; una Cita presente en varias agregaciones no genera contenido duplicado indexable. Es la condición para que multiplicar agregación sume superficie en vez de repartir la misma señal entre más URL.

## 9. NFR Transversales

- **NFR-7 — Rendimiento.** El contenido principal de una Página de Cita es visible en móvil con conexión 4G en menos de 2,5 segundos. El rendimiento es requisito de SEO, no de confort.
- **NFR-8 — Móvil primero.** Todas las superficies públicas son plenamente utilizables en un viewport de 360 px de ancho. El grueso del tráfico llega desde móvil.
- **NFR-9 — Accesibilidad.** Contraste, tamaño tipográfico y navegación por teclado conformes a WCAG 2.1 nivel AA en las superficies públicas.
- **NFR-10 — Sin muro de entrada.** Ninguna superficie pública exige interacción (modal, aviso, registro) antes de mostrar el contenido principal.
- **NFR-11 — Privacidad.** La analítica no requiere consentimiento invasivo ni identifica individualmente al visitante. El sitio se dirige a mercados con normativas distintas, incluida la europea.
- **NFR-12 — Integridad del contenido.** El sistema no altera, corrige ni normaliza el texto de una Cita publicada sin acción explícita del editor.

## 10. Arquitectura de la Información

Cinco superficies públicas y dos internas *(la Colección y el Kit Diario se añaden en la v3 y en la v2 respectivamente)*:

- **Portada** — Cita del Día, acceso a la búsqueda, entradas a Temas destacados.
- **Página de Cita** — hoja del árbol y principal punto de entrada real desde buscadores.
- **Página de Autor** — agregación por persona; enlaza a sus Citas.
- **Página de Tema** — agregación transversal por clasificación; enlaza a Citas de varios Autores.
- **Página de Colección** *(v3)* — agregación transversal por criterio editorial; cruza Tema y Autor sin sustituir a ninguno.
- **Herramienta de curación** — interna, no indexable, un solo operador.
- **Kit Diario y lote de composición** — internos, no indexables, un solo operador.

La navegación real del visitante es lateral, no jerárquica: entra por una hoja y se mueve entre hojas a través de Autor, Tema y Colección. La portada es identidad y retorno, no puerta de entrada.

**Por qué dos agregaciones transversales y no una.** El Tema y la Colección se parecen y hacen cosas distintas. El Tema **clasifica** —responde a qué trata la Cita, su conjunto es cerrado, y cambiarlo reordena el Corpus—. La Colección **escoge** —responde a para qué se busca la Cita, su conjunto es abierto, y crear una no toca ninguna Cita existente—. Fundirlas obligaría a abrir el conjunto de Temas, y con él se iría el umbral de FR-6 que sostiene SM-C2.

## 11. Estética y Tono

- **Referencias:** el contenido manda sobre el continente. Tipografía grande y legible, mucho aire, cero adornos que compitan con la Cita.
- **Anti-referencias:** los sitios de citas en español actuales — fondos con textura, publicidad intercalada en el contenido, tipografía pequeña, listados densos sin jerarquía.
- **Sobre la publicidad, tras la v3.** Esta anti-referencia sigue vigente sin matices y es la razón de la forma exacta de FR-37: la publicidad no puede aparecer donde el visitante lee, ni en la Página de Cita ni en la de Colección. Que un Modelo de Ingreso rinda no es argumento para relajar esta línea — si alguna vez lo fuera, el producto habría dejado de tener la ventaja por la que existe.
- **Voz del producto:** sobria y sin solemnidad impostada. El sitio no comenta las Citas ni las adjetiva ("¡una frase increíble!"). Presenta y se aparta.
- **La marca en la Imagen de Cita** está presente pero subordinada: se lee, no se impone sobre la frase.

## 12. Plataforma y Monetización

- **Plataforma:** web responsive, sin app nativa ni PWA instalable. Sin cambios en la v3.
- **Monetización v1:** ninguna. La decisión se toma con datos de tráfico reales. El diseño no debe crear obstáculos a una futura inserción publicitaria, pero tampoco reservarle espacio: NFR-10 tiene prioridad sobre cualquier consideración publicitaria futura.

### 12.1 Modelos de Ingreso y sus umbrales *(v3)*

La regla de la v1 se conserva y se hace operable. No se sustituye por una fecha ni por una corazonada: cada Modelo tiene una cifra, y esa cifra se mide en el receptor de LC-4. Diseñarlos hoy no es monetizar hoy.

| Modelo | Umbral de Activación | Anclaje | Coste sobre la experiencia |
|---|---|---|---|
| **Donaciones** (FR-34) | LC-1…LC-4 verificadas | Es un enlace; no tiene coste que amortizar | Ninguno — fuera del flujo de lectura, sin JS de terceros |
| **Afiliación de libros** (FR-35) | 2.000 sesiones orgánicas/mes | Primer tráfico con volumen suficiente para que un porcentaje signifique algo | Bajo — nace de la Procedencia ya publicada (FR-2) |
| **Producto propio** (FR-36) | 5.000 sesiones orgánicas/mes | La meta de SM-2 al mes 6 | Ninguno sobre las páginas públicas |
| **Publicidad acotada** (FR-37) | 25.000 sesiones orgánicas/mes | La meta de SM-2 al mes 12 | **Alto** — el único que degrada superficie; por eso el umbral más exigente y la exclusión de la Página de Cita y de Colección |

**Por qué el orden de los umbrales es ese.** No es por ingreso esperado, es por **coste sobre el producto**. Se enciende primero lo que no cuesta nada y último lo que cuesta más, de modo que el sitio solo acepta degradarse cuando ya tiene tráfico bastante para que compense — y aun entonces, solo donde no se lee.

**Ningún Modelo reserva espacio mientras está apagado.** Un hueco en blanco esperando publicidad es exactamente el obstáculo que la regla de la v1 prohibía crear. Un Modelo apagado es invisible, no latente.

**Ningún Modelo sobrevive a su contra-métrica.** SM-C4 mide rebote y tiempo hasta el contenido antes y después de cada encendido. Un Modelo que suba SM-10 degradando SM-3 o NFR-7 se apaga: estaría comprando ingreso con el activo que lo produce.

## 13. Condiciones de Lanzamiento

No son features y no producen FR: son las puertas que deben estar abiertas para que el sitio pueda considerarse publicado. Existen como sección propia porque cada una es invisible mientras falta —el sitio funciona igual de bien sin ninguna de ellas— y su ausencia solo se descubre semanas después, cuando la métrica que dependía de ella no existe.

- **LC-1 — Dominio propio sirviendo.** `sabiduriadebolsillo.net` responde por HTTPS, y la URL canónica de cada página y el sitemap lo declaran. Mientras el sitio se sirva desde una URL provisional, cada página indexada es una redirección futura. *(Corregido en la v3: el PRD decía `.com`; el dominio contratado y servido es `.net`, declarado en `public/CNAME` y leído por `src/lib/dominio.ts`.)*
- **LC-2 — El sitemap es anunciable.** Existe un `robots.txt` que declara dónde está el sitemap. Hoy el sitemap se genera y no lo anuncia nada.
- **LC-3 — Search Console verificada.** Propiedad verificada y sitemap enviado. Sin ella, SM-1 no es medible: no hay otra forma de saber cuántas Citas están indexadas.
- **LC-4 — La medición recibe.** El punto final de medición está desplegado y los eventos de la v1 llegan y se pueden consultar. El módulo está construido desde la v1 y hasta hoy no envía a ninguna parte.
- **LC-5 — Coherencia de marca.** Ninguna superficie, ni la marca de agua de la Imagen de Cita, menciona el nombre retirado.
- **LC-6 — Corpus mínimo defendible.** Ninguna Cita publicada sin Procedencia, y al menos un Tema publicado por encima del umbral de FR-6 en cada Tema que se anuncie en la portada. Un visitante que llega desde las cuentas y encuentra un Tema vacío no vuelve.

**La jornada en que LC-1…LC-4 quedan verificadas es el mes 0 del producto** *(v3)*. Toda métrica con plazo —SM-1 a los 3 meses, SM-2 a los 6 y a los 12— se cuenta desde ahí y no desde la fecha de este documento. Hasta entonces esos plazos no tienen origen, que es la razón por la que la v2 terminó sin poder medir nada de lo que había construido.

## 14. Preguntas Abiertas

Las seis preguntas abiertas de la primera redacción se resolvieron en aquella pasada; las decisiones están incorporadas a los FR y registradas en `.memlog.md`. Quedan tres, ninguna bloqueante para UX ni para Arquitectura:

1. **Marca registrada.** Búsqueda en OEPM y EUIPO para "Sabiduría de Bolsillo". El dominio está contratado, que es cosa distinta. No bloquea el desarrollo, sí el gasto en identidad visual.
2. **Umbral de reducción tipográfica.** FR-10 fija los tramos por longitud y el corte en 300 caracteres, pero los valores concretos de cada tramo salen de probar plantillas reales. Corresponde a UX, no a producto.
3. **Cadencia de sembrado.** FR-23…FR-25 definen el proceso, no el ritmo. Cuántas Citas por sesión y cada cuánto se decide con la primera sesión real hecha, no antes. *(Replanteada en la v3.1: con el sembrado ejecutable por agentes, el límite deja de ser el tiempo del editor y pasa a ser lo que SM-C1 aguante. La pregunta ya no es «cuánto puede sembrar Héctor», sino «a partir de qué ritmo la salud del Corpus empieza a bajar».)*

**Añadidas en la v3, ninguna bloqueante para Arquitectura ni para épicas:**

4. **Umbral mínimo de una Colección.** FR-26 exige que exista; no fija el número. El Tema usa 15 (FR-6), pero una Colección se lee de otra forma —«frases cortas» con 15 puede quedarse pobre y «para dedicar» con 15 puede sobrar— así que el valor sale de curar las tres o cuatro primeras, no de decidirlo ahora.
5. **Qué es el producto propio.** FR-36 fija el umbral de 5.000 sesiones/mes y aplaza el contenido. Decidir entre lámina, antología y recurrencia antes de saber quién visita el sitio sería exactamente el supuesto que §12 existe para evitar.
6. **Programa de afiliación concreto.** FR-35 fija la capacidad y el umbral; qué programa se usa depende de la disponibilidad de las ediciones en dominio público que el Corpus cita, y varias no tendrán edición en venta. Se resuelve al acercarse el umbral.

## 15. Índice de Supuestos

Los supuestos etiquetados en la primera redacción se convirtieron en decisiones (§14). Permanecen dos, ambos de capacidad y no de preferencia:

- **§8 / NFR-2** — El sitio se sirve con HTML renderizado en servidor o pregenerado. Es un supuesto de capacidad, no una elección de tecnología: la indexación fiable de ~2.000 páginas lo requiere. La elección concreta corresponde a Arquitectura.
- **§6.1** — El Corpus de arranque de ~2.000 Citas es alcanzable por un solo editor antes del lanzamiento. Es el supuesto con más riesgo de plan del documento: si resulta falso, la palanca es reducir el Corpus, nunca relajar FR-13. **Revisado en la v2:** resultó falso en su forma original. El lanzamiento no espera a las 2.000 Citas; sale con lo que haya y el Corpus crece publicado, mediante §4.11. Lo que no se toca es FR-13, exactamente como el supuesto preveía.
- **§4.10 / SM-8** — Las cuentas de Sabiduría de Bolsillo tienen audiencia suficiente para producir visitas medibles. Es un supuesto de capacidad del canal, no del sistema: si resulta falso, SM-8 no dará señal y la conclusión será que el canal propio no sustituye al buscador, no que el Kit Diario esté mal construido.

**Añadido en la v3.1:**

- **§4.11 / FR-24** — El cotejo literal contra el documento de la Fuente basta para que el sembrado ejecutado por agentes no degrade SM-C1. Es el supuesto que sostiene toda la apertura: si resulta falso —porque el cotejo pase textos correctos con Procedencia equivocada, o porque el volumen esconda errores que una revisión humana habría visto—, la palanca es volver a poner una persona en la aprobación, nunca relajar el cotejo. Se falsa barato: auditar una muestra de lo sembrado por agente contra sus ediciones.

**Añadidos en la v3:**

- **§4.12 / SM-9** — Existe cola larga en español que las Colecciones pueden capturar y que las cuatro superficies actuales no capturan. Es el supuesto que justifica una superficie nueva entera. Se falsa barato: tres o cuatro Colecciones publicadas y las consultas de entrada de Search Console lo dicen en semanas. Si resulta falso, la palanca es dejar de crear Colecciones, no bajar su umbral para tener más.
- **§4.13 / FR-31** — El vídeo corto trae visitantes que la imagen fija no trae. **Es el supuesto de mayor coste del documento y el peor sostenido:** §6.3 lo descartó en la v2 con un argumento —el motor de vídeo es un producto, no una historia— que nadie ha refutado desde entonces. Entra por decisión explícita de Héctor, con su propio umbral (ninguna cuenta de imagen fija demostrando visitas, ningún motor de vídeo) y como candidato preferente al recorte si la v3 se pasa de tamaño.
- **§4.14 / SM-2** — El sitio alcanza los umbrales de activación. Los tres primeros Modelos se anclan a metas que el PRD ya se había fijado (2.000, y las de SM-2 a los meses 6 y 12), así que este supuesto no es nuevo: es SM-2 otra vez, ahora con el ingreso colgando de ella. Si SM-2 falla, no falla la monetización — falla el producto, y la monetización simplemente no se enciende, que es justo lo que los umbrales existen para garantizar.
- **§6.4** — Llegar al orden de las 2.000 Citas es alcanzable ahora que el sembrado (§4.11) está construido y el Corpus crece publicado. Reformula el supuesto original de §6.1, que resultó falso cuando el volumen era condición de lanzamiento. Ya no lo es: el riesgo dejó de ser de plan y pasó a ser de ritmo.
