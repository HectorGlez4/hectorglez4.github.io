---
title: Sabiduría Diaria
status: final
created: 2026-08-10
updated: 2026-08-10
---

# PRD: Sabiduría Diaria

## 0. Propósito del Documento

Este PRD define **qué** debe hacer Sabiduría Diaria en su v1, no **cómo** se construye. Sus lectores son los flujos aguas abajo del método BMad —UX, Arquitectura, y la generación de épicas e historias— además de Héctor como responsable de producto. Se estructura con vocabulario anclado en un glosario (§3), features agrupadas con requisitos funcionales anidados y numerados globalmente (FR-1…FR-N), y supuestos etiquetados en línea e indexados en §14.

Se apoya en el **Brief de Producto** (`_bmad-output/planning-artifacts/briefs/brief-brainlySabiduria-2026-08-10/brief.md`, `status: final`) y su addendum, que contienen el razonamiento de las decisiones de alcance, la comparativa de vías de origen del corpus y la verificación de dominio. Este documento no los duplica: los da por firmes.

No existe todavía documento de UX. Los identificadores de recorrido (UJ-N) definidos aquí son los que UX debe reutilizar.

## 1. Visión

Sabiduría Diaria es un sitio web panhispánico donde **cada cita célebre es una página propia**, encontrable desde un buscador y respaldada por la procedencia de lo que afirma. Replica un modelo de producto ya probado —una red densa de páginas pequeñas y muy específicas que capturan búsquedas de cola larga— y lo trae al español, donde ese espacio está atendido por sitios con diseños de otra década y atribuciones sin verificar.

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
  Lucía, consultora, prepara a las 23:40 la presentación de mañana. Busca en Google "frases sobre el esfuerzo y la constancia" y aterriza directamente en una **Página de Cita** de Sabiduría Diaria, sin pasar por la portada. Lee la cita en pantalla completa, ve el nombre del autor y, debajo, la obra de la que procede. Pulsa copiar. El texto y la atribución van juntos al portapapeles. Cierra el móvil. **Clímax:** la cita está en su presentación en menos de treinta segundos desde el clic en Google, con la atribución correcta pegada sin que ella tuviera que teclearla. **Caso límite:** si la cita no tiene obra documentada, la ficha muestra el autor y el estado de la procedencia sin inventar una fuente.

- **UJ-2. Diego quiere publicar algo hoy y que se vea bien.**
  Diego, 24 años, busca material para su historia de Instagram. Llega a una Página de Cita desde una búsqueda por tema. Le gusta la frase pero no va a copiar texto plano. Pulsa "compartir imagen", elige entre unos pocos diseños, y descarga una **Imagen de Cita** con la frase, el autor y la marca del sitio. **Clímax:** publica sin salir del móvil ni abrir un editor. **Resolución:** la imagen lleva la marca, así que su publicación es la que trae al siguiente visitante.

- **UJ-3. Marisol llegó por una frase y se quedó una hora.**
  Marisol, profesora de literatura, busca una cita concreta de un autor clásico. Desde la Página de Cita pulsa el nombre del autor y aterriza en la **Página de Autor**: una semblanza breve y el resto de citas de esa persona en el catálogo. Desde ahí salta a un **Tema** que le interesa y descubre a un autor latinoamericano que no conocía. **Clímax:** cuatro páginas después sigue leyendo. **Resolución:** vuelve por su cuenta días después, directamente al dominio.

- **UJ-4. Héctor incorpora cincuenta citas nuevas sin romper la promesa del sitio.**
  Héctor, único editor, tiene un lote de citas de un autor recién entrado en dominio público. Las carga en la herramienta interna. El sistema rechaza las que no traen **Procedencia** y las que pertenecen a un **Autor** sin año de fallecimiento registrado, dejándolas en estado de revisión en lugar de publicarlas. Él completa lo que falta y publica el resto. **Clímax:** el catálogo crece sin que baje el porcentaje de citas verificadas. **Caso límite:** si una cita duplica una ya publicada, el sistema lo señala antes de aceptarla.

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

## 5. No-Objetivos (Explícitos)

- **No somos una red social.** Sin cuentas, sin perfiles, sin comentarios, sin votos.
- **No somos un agregador.** El Corpus se cura, no se rastrea de otros sitios.
- **No somos una enciclopedia de autores.** La semblanza sitúa; no compite con Wikipedia.
- **No aspiramos al volumen en la v1.** Un catálogo pequeño y verificado, no uno grande y dudoso.
- **No traducimos.** El producto es en español y las Citas se publican en español.
- **No monetizamos todavía.** La v1 se diseña sin publicidad; la decisión se toma con datos de tráfico.
- **No generamos Citas con IA.** El sistema no crea ni parafrasea contenido atribuible a una persona real.

## 6. Alcance de la v1

### 6.1 Dentro

- Páginas de Cita, Autor y Tema, todas indexables (FR-1…FR-6).
- Búsqueda tolerante a acentos y por fragmento (FR-7, FR-8).
- Portada con Cita del Día (FR-9).
- Imagen de Cita descargable (FR-10, FR-11).
- Descubrimiento por Autor y Tema (FR-12).
- Herramienta interna de ingesta y curación (FR-13…FR-16).
- Fundamentos de SEO y rendimiento (§10).
- Corpus de arranque: ~2.000 Citas de 150–250 Autores, con **mínimo del 40 % de Autores de tradición latinoamericana**. El suelo es explícito porque el sesgo hacia España es el resultado por defecto de cualquier curación no vigilada.

### 6.2 Fuera de la v1

- **Cuentas, favoritos y colecciones** — requieren autenticación y almacenamiento por usuario; no sirven al tráfico orgánico, que es el mecanismo de crecimiento. Diferido a v2.
- **Aportes de usuarios** — exigen moderación y verificación de procedencia desde el día uno. Diferido a v2. `[NOTE FOR PM]` Es la vía natural de escalado del Corpus; revisar en cuanto la curación interna sea el cuello de botella.
- **Boletín y notificaciones** — dependen de tener audiencia. Diferido.
- **Motor de recomendación** — la relación por Autor y Tema basta con 2.000 Citas.
- **Monetización y publicidad** — decisión con datos, no con supuestos.
- **App nativa** — la web responsive cubre el caso de uso completo.
- **Multilingüe** — no es el producto.

## 7. Métricas de Éxito

**Primarias**

- **SM-1 — Indexación.** ≥ 90 % de las Citas publicadas indexadas a los 3 meses del lanzamiento. Valida FR-1 y §8. Es el indicador temprano: si las páginas no se indexan, ninguna otra métrica llega a existir.
- **SM-2 — Tráfico orgánico.** 5.000 sesiones orgánicas/mes al mes 6; 25.000 al mes 12. Valida FR-1, FR-4, FR-6.

**Secundarias**

- **SM-3 — Resolución de la intención.** Rebote < 65 % en Páginas de Cita. Valida FR-1, FR-2, FR-3.
- **SM-4 — Fondo del sitio.** ≥ 1,8 páginas por sesión. Valida FR-12, FR-4.
- **SM-5 — Circuito de compartición.** ≥ 3 % de las visitas a Página de Cita generan una acción de copiado o de descarga de Imagen de Cita. Valida FR-3, FR-10. Es la métrica que justifica el coste de la feature más cara de la v1.
- **SM-6 — Cobertura de la búsqueda.** < 15 % de búsquedas internas con cero resultados. Valida FR-7, FR-8.

**Contra-métricas (no optimizar)**

- **SM-C1 — Procedencia verificada.** Porcentaje de Citas publicadas con Procedencia completa. Contrapesa SM-2: el tráfico crece publicando más Citas, y la vía barata de publicar más es relajar la verificación. Si SM-C1 baja mientras SM-2 sube, el producto está destruyendo su único diferenciador defendible. Valida FR-13, FR-16.
- **SM-C2 — Densidad de las Páginas de Tema.** Número mediano de Citas por Tema publicado. Contrapesa SM-1: la vía barata de multiplicar páginas indexables es crear Temas con tres Citas cada uno, que es exactamente el defecto de los competidores. Valida FR-6.

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

## 13. Preguntas Abiertas

Las seis preguntas abiertas de la primera redacción se resolvieron en esta pasada; las decisiones están incorporadas a los FR y registradas en `.memlog.md`. Quedan dos, ninguna bloqueante para UX ni para Arquitectura:

1. **Marca registrada.** Búsqueda en OEPM y EUIPO para "Sabiduría Diaria". Solo se verificó disponibilidad de dominio. Heredada del brief. No bloquea el desarrollo, sí el gasto en identidad visual.
2. **Umbral de reducción tipográfica.** FR-10 fija los tramos por longitud y el corte en 300 caracteres, pero los valores concretos de cada tramo salen de probar plantillas reales. Corresponde a UX, no a producto.

## 14. Índice de Supuestos

Los supuestos etiquetados en la primera redacción se convirtieron en decisiones (§13). Permanecen dos, ambos de capacidad y no de preferencia:

- **§8 / NFR-2** — El sitio se sirve con HTML renderizado en servidor o pregenerado. Es un supuesto de capacidad, no una elección de tecnología: la indexación fiable de ~2.000 páginas lo requiere. La elección concreta corresponde a Arquitectura.
- **§6.1** — El Corpus de arranque de ~2.000 Citas es alcanzable por un solo editor antes del lanzamiento. Es el supuesto con más riesgo de plan del documento: si resulta falso, la palanca es reducir el Corpus, nunca relajar FR-13.
