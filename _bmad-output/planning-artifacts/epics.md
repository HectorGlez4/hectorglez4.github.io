---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-brainlySabiduria-2026-08-10/prd.md
  - _bmad-output/planning-artifacts/prds/prd-brainlySabiduria-2026-08-10/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/GUIA-DE-ARRANQUE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/EXPERIENCE.md
---

# Sabiduría de Bolsillo - Epic Breakdown

## Overview

Descomposición completa en épicas e historias para **Sabiduría de Bolsillo** (nombrado «Sabiduría Diaria» durante la v1), a partir de los requisitos del PRD, las espinas de UX y la espina de arquitectura.

Las Épicas 1 a 5 son la v1 y están completas. Las Épicas 6 a 10 son la v2 y se documentan en la segunda mitad de este fichero.

## Requirements Inventory

### Functional Requirements

- **FR-1: Visualización de una Cita** — Cualquier visitante puede ver una Cita individual en su propia URL permanente. URL única, estable y legible; no cambia al reasignar Tema; una Cita en revisión devuelve 404 y no entra en el sitemap; el texto es el primer elemento visible sin desplazar en 360×640.
- **FR-2: Atribución y procedencia visibles** — Nombre del Autor enlazado a su página; obra y año cuando existan; ausencia declarada explícitamente, nunca omitida en silencio; nunca se muestra procedencia inferida.
- **FR-3: Copiado con atribución** — Una sola pulsación copia texto y atribución juntos en texto plano, con confirmación visual.
- **FR-4: Ficha y listado de Autor** — Semblanza breve más todas las Citas publicadas del Autor en URL propia. Un Autor sin Citas publicadas no tiene página accesible ni indexable.
- **FR-5: Paginación del listado de Autor** — Listados de más de 50 Citas se paginan; páginas 2+ son `noindex, follow`.
- **FR-6: Listado por Tema** — Citas de varios Autores en URL propia. Un Tema con menos de 15 Citas publicadas no se publica ni se indexa. Conjunto de Temas cerrado y gestionado internamente.
- **FR-7: Búsqueda por texto** — Por fragmento, Autor o Tema desde cualquier superficie pública. Equivalente con y sin acentos, insensible a mayúsculas; un fragmento de tres o más palabras consecutivas localiza la Cita; los resultados distinguen el tipo de coincidencia.
- **FR-8: Resultado vacío productivo** — Cero resultados ofrece Temas y Autores destacados; la consulta se registra para alimentar la curación.
- **FR-9: Cita del Día** — Cita destacada en portada que cambia una vez por jornada, igual para todos los visitantes, enlazada a su página. Selección automática sobre el subconjunto apto para portada, sin repetir mientras queden aptas; fijación manual prioritaria.
- **FR-10: Generación de Imagen de Cita** — Imagen descargable con texto, Autor y marca, en proporción apta para redes. Tamaño por tramos discretos según longitud; más de 300 caracteres no ofrece imagen; nunca se recorta el texto.
- **FR-11: Selección de diseño** — Más de una plantilla y menos de las que obliguen a decidir; la plantilla no altera contenido ni atribución.
- **FR-12: Rutas de salida desde la Página de Cita** — Otras Citas del mismo Autor y de los mismos Temas. Ninguna Página de Cita publicada queda sin enlaces salientes internos. Sin motor de recomendación.
- **FR-13: Alta de Cita con reglas de admisión** — Alta individual o por lote; el sistema impide publicar Citas cuyo Autor carece de año de fallecimiento, sin Procedencia, o con Estado de Derechos distinto de `dominio-público`. El rechazo indica la regla incumplida.
- **FR-14: Detección de duplicados** — Coincidencia detectada pese a diferencias de puntuación, acentuación y mayúsculas. El editor decide; el sistema no descarta.
- **FR-15: Gestión de Autores y Temas** — Crear y editar Autores y Temas y asociar Citas. Año de fallecimiento obligatorio. Un Tema no se elimina con Citas publicadas asociadas. Marcado de Cita como apta para portada.
- **FR-16: Visibilidad de la salud del Corpus** — Porcentaje de Citas publicadas con Procedencia completa, consultable en cualquier momento sin exportar datos, desglosado por Autor.

#### Añadidos en la v2

- **FR-17: Compartir la Imagen de Cita por la Hoja del Sistema** — Donde el navegador admite compartir ficheros, la acción principal abre la hoja del sistema con la imagen adjunta; donde no, descarga como en la v1. Sin tercera vía ni botón deshabilitado. El fichero compartido y el descargado salen de la misma generación. Cancelar la hoja no registra compartición ni muestra error.
- **FR-18: Compartir el enlace de una Cita** — Texto propuesto con Cita y Autor, nunca URL desnuda. Hoja del sistema donde exista; destinos concretos donde no. Ningún destino exige registro. El enlace lleva marca de origen sin generar URL indexable distinta de la canónica.
- **FR-19: Tarjeta Social de toda Cita publicada** — Toda Cita publicada tiene tarjeta. Las que admiten Imagen muestran texto y Autor; las que superan el límite de FR-10 muestran Autor y marca **sin texto**, nunca un fragmento recortado. Verificable con los validadores de las redes.
- **FR-20: Medición de la compartición** — Evento con destino cuando es conocido, opaco cuando se usó la hoja del sistema. Imagen y enlace se distinguen. Sin cookie ni identificador. Vocabulario de eventos cerrado.
- **FR-21: La jornada deja el material compuesto** — Imagen de la Cita del Día, pie con atribución y enlace, accesibles desde móvil sin herramientas. Se recompone al cambiar la jornada. No indexable ni enlazada. Si la Cita del Día no admite Imagen, lo indica y ofrece alternativa apta.
- **FR-22: Atribución del tráfico por cuenta** — Una marca de origen por red. La página de destino es siempre la canónica, con o sin marca. La marca no altera lo que ve el visitante.
- **FR-23: Extracción de candidatas desde una Fuente** — Candidatas con obra y año tomados de la Fuente, no inferidos. Cada una registra Fuente y licencia. Una Fuente sin licencia de reutilización no produce candidatas. No se proponen textos que no estén en español.
- **FR-24: Aprobación por lote** — Aprobar somete a las mismas reglas de FR-13 y FR-14; el sembrado no abre puerta lateral. Rechazar descarta sin dejar rastro en el Corpus. Duplicados señalados antes de decidir. El lote es reanudable.
- **FR-25: Prioridad de sembrado por hueco del Corpus** — Temas por debajo del umbral de FR-6 con cuántas Citas les faltan; proporción de Autores de tradición latinoamericana frente al suelo del 40 %. Informa la decisión del editor, no la sustituye.

### NonFunctional Requirements

- **NFR-1: Indexabilidad** — Toda Página de Cita, Autor y Tema publicada es rastreable e indexable, con canónica propia y presencia en el sitemap.
- **NFR-2: HTML inicial** — El contenido principal está en el HTML inicial, sin requerir ejecución de JavaScript para que un rastreador lo lea.
- **NFR-3: Datos estructurados** — Cada Página de Cita expone datos estructurados de cita con su autor.
- **NFR-4: URL legibles** — Legibles, estables y en español, sin identificadores opacos.
- **NFR-5: Sin huérfanas** — Toda página publicada es alcanzable por enlaces internos desde la portada en un número acotado de saltos.
- **NFR-6: Aislamiento de lo no publicado** — El contenido en revisión no es rastreable, indexable ni alcanzable por URL adivinable.
- **NFR-7: Rendimiento** — Contenido principal de una Página de Cita visible en móvil con 4G en menos de 2,5 s.
- **NFR-8: Móvil primero** — Todas las superficies públicas plenamente utilizables en viewport de 360 px.
- **NFR-9: Accesibilidad** — WCAG 2.1 AA en superficies públicas: contraste, tamaño tipográfico, navegación por teclado.
- **NFR-10: Sin muro de entrada** — Ninguna superficie pública exige interacción antes de mostrar el contenido principal.
- **NFR-11: Privacidad** — Analítica sin consentimiento invasivo y sin identificación individual del visitante.
- **NFR-12: Integridad del contenido** — El sistema no altera, corrige ni normaliza el texto de una Cita publicada sin acción explícita del editor.

### Additional Requirements

**Plantilla de arranque (impacta Épica 1, Historia 1):** la arquitectura especifica `npm create astro@latest -- --template minimal --typescript strict`. Plantilla mínima a propósito — cualquier plantilla de blog trae una estructura de contenido que habría que deshacer.

- **Node.js 22 LTS mínimo**, exigido por Astro 7.0. Verificar en la máquina antes de la primera historia.
- **Stack fijado y verificado (2026-08-10):** Astro 7.0, TypeScript estricto, Zod vía `astro/zod`, Pagefind 1.5, Fonts API de Astro para Source Serif 4 e Inter.
- **AD-1 — Puerta de admisión en el esquema.** `src/content.config.ts` declara obligatorios `procedencia` y `añoFallecimiento` y restringe `estadoDerechos`. Un incumplimiento **rompe el build**. Ninguna comprobación de admisión puede vivir solo en `tools/`.
- **AD-2 — Lo no publicado fuera del árbol construido.** `corpus/_revision/` no lo carga ninguna colección. No existe campo `publicada` que filtrar; publicar es mover el fichero.
- **AD-3 — Normalización canónica única.** `src/lib/normalizar.ts` consumida por búsqueda, duplicados y slugs. Ningún módulo implementa la suya.
- **AD-4 — Slug inmutable.** Derivado de autor + fragmento normalizado, escrito al crear el fichero, nunca recalculado. Los Temas no participan en rutas de Cita.
- **AD-5 — Derivación pura.** `src/lib/` no importa componentes, no lee el sistema de ficheros, no depende de Astro.
- **AD-6 — Cero JS por defecto.** Solo tres islas, hidratadas bajo demanda: generador de imagen, búsqueda, botón de copiar.
- **AD-7 — Imagen generada en el cliente** sobre canvas, dentro de la isla. Ningún artefacto de imagen se versiona ni se sirve desde el origen.
- **AD-8 — Una sola definición de tramos tipográficos** en `src/lib/tramos.ts`, consumida por página y generador.
- **AD-9 — Umbrales con nombre** en `src/lib/umbrales.ts`: `MIN_CITAS_POR_TEMA = 15`, `MAX_CARACTERES_IMAGEN = 300`, `CITAS_POR_PAGINA = 50`.
- **AD-10 — Sin otro almacén que git.** Ni base de datos, ni CMS, ni panel autenticado en producción.
- **AD-13 — La medición es un módulo propio.** `src/lib/medicion.ts` es el único emisor de eventos; el conjunto es cerrado (vista de Página de Cita, copiado, descarga de imagen, búsqueda sin resultados). El proveedor debe funcionar sin cookies y sin identificación individual, para que NFR-10 y NFR-11 se cumplan por elección de herramienta y no por configuración.
- **AD-11 — Dueño único del conjunto publicable.** `src/lib/publicado.ts`; toda superficie que enumere contenido —rutas, sitemap, índice Pagefind, chips, listados, descubrimiento— deriva de ella.
- **AD-12 — Jornada fijada por el build.** El CI reconstruye **una vez al día a hora fija**, además de en cada push. Sin el disparador diario, la portada se congela.
- **Convenciones de nombres:** entidades en español según el glosario del PRD (`Cita`, `Autor`, `Tema`, `Procedencia`). Rutas `/cita/{slug}`, `/autor/{slug}`, `/tema/{slug}`, `/buscar`.
- **Ausencia de datos:** campo opcional ausente se omite del fichero; nunca cadena vacía ni `null`.
- **Despliegue:** hosting estático, un solo entorno (producción), sin staging. Revertir = redesplegar un commit anterior.

### UX Design Requirements

**Sistema de diseño (DESIGN.md — «Papel y Tinta»)**

- **UX-DR1:** Implementar los tokens de color como propiedades personalizadas de CSS definidas una sola vez: papel `#FAF7F0`, tinta `#1F1B16`, tinta apagada `#5A5147`, siena `#8C4A2F`, filete `#DDD5C7`, más la escala de contenedores. Ningún valor de color literal en un componente.
- **UX-DR2:** Implementar la escala tipográfica con los tokens `quote-xl/lg/md/sm`, `headline-md/sm`, `body-lg/md`, `author`, `caption`. Los tokens `quote-*` solo pueden aplicarse a texto de Cita.
- **UX-DR3:** Cargar Source Serif 4 e Inter vía Fonts API de Astro, con cobertura completa de diacríticos españoles y comillas angulares « ».
- **UX-DR4:** Implementar los tokens de espaciado (unidad 8px, gutter 24px, márgenes 20/56px, respiración 64px) y de radio (base 3px, tarjetas 6px). Ritmo vertical en múltiplos de 8px sin excepciones.
- **UX-DR5:** Aplicar las medidas máximas: 34ch para texto de Cita, 68ch para prosa.
- **UX-DR6:** Sistema plano — cero sombras y cero elevación tonal en superficies públicas. Única excepción: atenuación de fondo al 40 % en el diálogo de Imagen.

**Componentes (8 en DESIGN.md, 10 patrones de comportamiento en EXPERIENCE.md)**

- **UX-DR7:** Bloque de Cita — comillas angulares, filete corto de 48px debajo, sin recuadro ni fondo propio, no interactivo.
- **UX-DR8:** Atribución — Autor en token `author` (Inter, versalitas por letter-spacing) enlazado en tinta, no en siena; Procedencia debajo en `caption` y tinta apagada; «Sin obra documentada» cuando falte.
- **UX-DR9:** Botones — primario siena sólido, secundario texto siena con filete; altura mínima 44px.
- **UX-DR10:** Campo de búsqueda — filete inferior que pasa a 2px siena al recibir foco; sin caja, sin sombra, sin icono decorativo.
- **UX-DR11:** Tarjeta de Cita para listados — fragmento más autor, filete divisorio, fondo a `surface-container-low` al pasar el cursor, toda la tarjeta como zona de toque de 44px mínimo.
- **UX-DR12:** Chip de Tema — fondo `surface-container`, radio 6px, nunca en siena.
- **UX-DR13:** Filete divisorio de 1px como único separador del sistema.
- **UX-DR14:** Iconografía de línea 1,5px sin relleno, exclusivamente para copiar, buscar y descargar.
- **UX-DR15:** Acción Copiar — confirmación en el propio botón durante 2 s, sin notificación flotante.
- **UX-DR16:** Diálogo de Imagen — 3 plantillas con previsualización real del texto de esa Cita, descarga directa sin paso intermedio ni registro, cerrable con Esc, con toque fuera y con botón.
- **UX-DR17:** Rutas de salida — hasta 4 Citas del mismo Autor más chips de Temas; nunca vacío.
- **UX-DR18:** Paginación — Anterior/Siguiente numerada para listados de más de 50.

**Tipografía adaptativa (resuelve FR-10)**

- **UX-DR19:** Implementar los cinco tramos por longitud en caracteres: ≤80 → 44px/64px · 81–160 → 36px/52px · 161–240 → 28px/42px · 241–300 → 23px/34px · >300 → sin imagen. En móvil cada tramo baja un escalón; el suelo de 23px no se cruza.

**Estados (10 en EXPERIENCE.md)**

- **UX-DR20:** Implementar los diez patrones de estado: carga normal sin esqueletos, Cita sin Procedencia, búsqueda sin resultados, Autor sin Citas (404), Tema bajo umbral, Cita de más de 300 caracteres, copiado fallido con texto seleccionable, generación de imagen no bloqueante, y página 404 con búsqueda y Cita del Día.

**Microcopia**

- **UX-DR21:** Aplicar la tabla de voz y tono: frases completas con punto final, sin exclamaciones, sin emoji, sin contadores ni gamificación. El sitio nunca califica una Cita.

**Primitivas de interacción**

- **UX-DR22:** Un toque un resultado; sin gestos ocultos; sin interstitial de ningún tipo incluido el aviso de cookies; movimiento máximo 150 ms solo en opacidad y color, eliminado con `prefers-reduced-motion`; zonas de toque de 44px con 8px de separación; desplazamiento nativo sin scroll infinito.

**Accesibilidad**

- **UX-DR23:** Foco visible siempre — anillo de 2px en siena con 2px de separación, nunca suprimido.
- **UX-DR24:** Orden de tabulación igual al orden de lectura: contenido, acciones, navegación.
- **UX-DR25:** Semántica correcta — la Cita marcada como cita con su atribución asociada, un único `h1` por página, listados como listas reales.
- **UX-DR26:** Todo lo que ofrece la Imagen de Cita disponible como texto copiable; la imagen nunca es la única vía al contenido.
- **UX-DR27:** Zoom hasta 200 % sin pérdida de contenido ni desplazamiento horizontal. Idioma `es` declarado sin variante regional.

**Responsive**

- **UX-DR28:** Tres puntos de ruptura: <600px columna única con márgenes de 20px y tramo un escalón por debajo; 600–1024px columna centrada con medida limitada; >1024px idéntico con márgenes de 56px. **El ancho extra se convierte en aire, no en contenido** — sin columnas laterales ni bloques nuevos en escritorio.

**Arquitectura de la información**

- **UX-DR29:** Cabecera con solo marca y acceso a búsqueda; sin migas de pan porque no hay jerarquía. Navegación lateral entre hojas a través de Autor y Tema.

### FR Coverage Map

| FR | Épica | Qué entrega |
|---|---|---|
| FR-1 | Épica 2 | Página de Cita en URL permanente |
| FR-2 | Épica 2 | Atribución y procedencia visibles |
| FR-3 | Épica 2 | Copiado con atribución — cierre de UJ-1 |
| FR-4 | Épica 2 | Ficha y listado de Autor |
| FR-5 | Épica 2 | Paginación de listados largos |
| FR-6 | Épica 2 | Listado por Tema con umbral de 15 |
| FR-7 | Épica 3 | Búsqueda tolerante a acentos y por fragmento |
| FR-8 | Épica 3 | Resultado vacío productivo |
| FR-9 | Épica 4 | Cita del Día en portada |
| FR-10 | Épica 5 | Generación de Imagen de Cita |
| FR-11 | Épica 5 | Selección de plantilla |
| FR-12 | Épica 2 | Rutas de salida — ninguna hoja sin enlaces |
| FR-13 | Épica 1 | Alta con reglas de admisión — la puerta |
| FR-14 | Épica 1 | Detección de duplicados |
| FR-15 | Épica 1 | Gestión de Autores y Temas |
| FR-16 | Épica 1 | Salud del Corpus |

**Cobertura de NFR:** NFR-6 y NFR-12 en Épica 1 · NFR-1…NFR-5 y NFR-7…NFR-11 en Épica 2 · NFR-2 y NFR-9 reaparecen como criterio en cada épica con superficie nueva.

## Epic List

### Épica 1: Un Corpus en el que se puede confiar

Héctor puede incorporar, revisar y auditar Citas con la garantía de que ninguna sin procedencia verificada puede llegar a publicarse. Al terminar existe un corpus real, validado y auditable — aunque todavía no haya sitio web. Es la épica que convierte la promesa del producto en una propiedad del sistema, y por eso va primero: la guía de arranque lo dice sin rodeos, *«esa comprobación es el producto»*.

**FRs covered:** FR-13, FR-14, FR-15, FR-16
**NFRs:** NFR-6, NFR-12
**Notas de implementación:** incluye el andamiaje del proyecto (plantilla `minimal` de Astro 7, TypeScript estricto) como primera historia. Materializa AD-1 (puerta en el esquema), AD-2 (revisión fuera del árbol), AD-3 (normalización canónica), AD-4 (slug inmutable), AD-9 y AD-10. La verificación clave: una Cita sin procedencia **rompe el build**.

### Épica 2: El sitio que se lee

Cualquier visitante que llegue desde un buscador encuentra la Cita, confía en ella y se la lleva — y desde ahí puede seguir leyendo. Al terminar, el producto ya cumple su recorrido principal completo: UJ-1 de principio a fin y UJ-3 entero.

**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-12
**NFRs:** NFR-1, NFR-2, NFR-3, NFR-4, NFR-5, NFR-7, NFR-8, NFR-9, NFR-10
**Notas de implementación:** épica grande y consolidada a propósito — las tres superficies comparten `src/lib/publicado.ts`, los componentes y el sistema de tokens, así que separarlas produciría tres épicas reescribiendo los mismos ficheros. Materializa AD-5, AD-6, AD-11 y la práctica totalidad del sistema de diseño (UX-DR1…UX-DR14, UX-DR17…UX-DR29). Los fundamentos de SEO entran aquí porque son el motor, no un acabado.

### Épica 3: Encontrar sin pasar por Google

Quien ya está en el sitio, o llega sin una consulta de buscador, encuentra lo que busca escribiendo como se escribe de verdad en español: sin acentos, con errores, recordando solo un fragmento.

**FRs covered:** FR-7, FR-8
**Notas de implementación:** Pagefind se ejecuta sobre `dist/` después del build, así que depende de la Épica 2 pero no la modifica. Consume la normalización canónica de AD-3 y el conjunto publicable de AD-11 — la búsqueda no puede indexar nada que las páginas no publiquen.

### Épica 4: Un motivo para volver

El visitante que ya conoce el sitio entra directamente al dominio y encuentra algo distinto cada jornada. Es lo que da nombre al producto y la base de cualquier canal recurrente futuro.

**FRs covered:** FR-9
**Notas de implementación:** materializa AD-12. Incluye la reconstrucción diaria programada en CI, que **no es infraestructura sino producto**: sin ella la portada se congela hasta el siguiente commit y FR-9 no se cumple. Es el fallo más silencioso de toda la arquitectura.

### Épica 5: Que la frase salga de aquí

El visitante convierte una Cita en algo publicable sin abrir un editor ni salir del móvil, y esa publicación trae al siguiente visitante. Cierra UJ-2 y el circuito de tráfico.

**FRs covered:** FR-10, FR-11
**Notas de implementación:** va la última a propósito — es la pieza más cara (AD-7, generación sobre canvas en el cliente) y la única cuyo aplazamiento no bloquea nada más. Consume los tramos de AD-8 y UX-DR19; la previsualización y el fichero descargado deben coincidir por construcción, no por coincidencia.

## Epic 1: Un Corpus en el que se puede confiar

Héctor puede incorporar, revisar y auditar Citas con la garantía de que ninguna sin procedencia verificada puede llegar a publicarse. Al terminar existe un corpus real, validado y auditable, aunque todavía no haya sitio web.

### Story 1.1: Andamiaje del proyecto

As a desarrollador único del proyecto,
I want un proyecto Astro 7 en marcha con TypeScript estricto y la estructura de directorios que fija la espina,
So that toda historia posterior tenga dónde aterrizar sin decidir estructura sobre la marcha.

**Acceptance Criteria:**

**Given** una máquina con Node.js instalado
**When** ejecuto la comprobación de versión
**Then** la versión es 22 o superior
**And** si no lo es, el proceso se detiene con instrucción de actualizar antes que continuar

**Given** un directorio vacío
**When** genero el proyecto con la plantilla `minimal` de Astro 7 y TypeScript estricto
**Then** `astro dev` arranca sin errores
**And** existen los directorios `corpus/citas/`, `corpus/autores/`, `corpus/temas/`, `corpus/_revision/`, `src/lib/`, `src/components/`, `src/islands/`, `src/pages/`, `src/styles/` y `tools/`
**And** no queda ningún fichero de ejemplo de la plantilla

**Given** el proyecto generado
**When** ejecuto el build
**Then** se produce un sitemap, aunque todavía esté vacío de contenido propio
**And** las historias posteriores pueden afirmar qué entra y qué no entra en él sin tener que crearlo

### Story 1.2: La puerta de admisión vive en el esquema

As a editor responsable de la promesa del sitio,
I want que el sistema impida compilar una Cita que incumple el criterio de admisión,
So that publicar contenido sin verificar sea imposible por construcción y no por disciplina.

**Acceptance Criteria:**

**Given** el esquema de contenido definido en `src/content.config.ts`
**When** existe una Cita sin campo de procedencia
**Then** el build falla
**And** el mensaje indica la ruta del fichero y la regla incumplida

**Given** una Cita cuyo Autor no tiene año de fallecimiento registrado
**When** ejecuto el build
**Then** el build falla indicando el Autor y la regla incumplida

**Given** una Cita con estado de derechos distinto de `dominio-público`
**When** ejecuto el build
**Then** el build falla

**Given** una Cita completa y válida
**When** ejecuto el build
**Then** el build termina sin errores

**Given** el criterio de admisión
**When** reviso dónde está implementado
**Then** vive en el esquema y no únicamente en `tools/`, de modo que un fichero editado a mano no puede esquivarlo

### Story 1.3: Lo no publicado no existe para el build

As a editor,
I want que las Citas en revisión queden fuera del alcance del build,
So that sea estructuralmente imposible que contenido sin terminar se filtre a producción.

**Acceptance Criteria:**

**Given** una Cita en `corpus/_revision/`
**When** ejecuto el build
**Then** ninguna colección la carga
**And** no se genera página para ella
**And** no aparece en el sitemap

**Given** el modelo de contenido
**When** busco un campo booleano de publicación que haya que filtrar en tiempo de ejecución
**Then** no existe: la pertenencia al directorio es el único mecanismo

**Given** una Cita en revisión
**When** la muevo a `corpus/citas/` y reconstruyo
**Then** pasa a estar publicada sin ningún otro cambio

### Story 1.4: Normalización canónica y slug inmutable

As a desarrollador,
I want una única función de normalización de texto y una única derivación de slug,
So that la búsqueda, la detección de duplicados y las URL no puedan discrepar entre sí.

**Acceptance Criteria:**

**Given** `src/lib/normalizar.ts`
**When** aplico la función a un texto
**Then** elimina diacríticos, pasa a minúsculas, colapsa espacios y elimina puntuación
**And** «Corazón» y «corazon» producen el mismo resultado

**Given** el módulo de slug en `src/lib/slug.ts`
**When** genero el slug de una Cita
**Then** se deriva del slug del Autor más un fragmento normalizado del texto
**And** ningún Tema participa en la derivación

**Given** una Cita ya creada con su slug escrito en el fichero
**When** cambio sus Temas y reconstruyo
**Then** el slug no cambia

**Given** cualquier otro módulo del proyecto
**When** necesita normalizar texto
**Then** importa la función canónica en lugar de implementar la suya

### Story 1.5: Alta de Citas por lote

As a Héctor incorporando un lote de un autor recién entrado en dominio público,
I want cargar varias Citas de una vez y que el sistema me diga cuáles no admite,
So that pueda completar lo que falta sin revisar el lote entero a mano.

**Acceptance Criteria:**

**Given** un lote de Citas para incorporar
**When** ejecuto la herramienta de alta
**Then** las Citas completas se escriben en `corpus/citas/` con su slug generado
**And** las incompletas se escriben en `corpus/_revision/`
**And** el informe indica, por cada Cita rechazada, qué regla incumplió

**Given** una Cita cuyo Autor no existe todavía en el corpus
**When** ejecuto el alta
**Then** la herramienta lo señala en lugar de crear un Autor incompleto

### Story 1.6: Detección de duplicados en la ingesta

As a Héctor,
I want que el sistema me avise cuando una Cita entrante ya está en el corpus,
So that el catálogo no acumule repeticiones con puntuación distinta.

**Acceptance Criteria:**

**Given** una Cita ya publicada
**When** incorporo otra con el mismo texto pero distinta puntuación, acentuación o mayúsculas
**Then** la herramienta la señala como posible duplicado antes de escribirla
**And** la comparación usa la función canónica de normalización

**Given** un posible duplicado señalado
**When** confirmo que quiero incorporarlo igualmente
**Then** se incorpora
**And** el sistema no descarta nada por su cuenta

### Story 1.7: Gestión de Autores y Temas

As a Héctor,
I want crear y editar Autores y Temas con las restricciones del modelo aplicadas,
So that el corpus no acumule entidades incompletas que después bloqueen publicaciones.

**Acceptance Criteria:**

**Given** la creación de un Autor
**When** omito el año de fallecimiento
**Then** la operación se rechaza indicando que es obligatorio

**Given** un Tema con Citas publicadas asociadas
**When** intento eliminarlo
**Then** la operación se rechaza indicando cuántas Citas lo usan

**Given** una Cita publicada
**When** la marco como apta para portada
**Then** el marcado queda registrado en su fichero

**Given** un campo opcional sin valor
**When** se escribe el fichero
**Then** el campo se omite, y nunca aparece como cadena vacía ni como `null`

### Story 1.8: Auditoría de salud del Corpus

As a Héctor vigilando que crecer no degrade la promesa,
I want consultar qué porcentaje de las Citas publicadas tiene procedencia completa,
So that pueda detectar si el catálogo está creciendo a costa de la verificación.

**Acceptance Criteria:**

**Given** un corpus con Citas publicadas
**When** ejecuto la auditoría
**Then** obtengo el porcentaje de Citas con procedencia completa
**And** obtengo el desglose por Autor
**And** no necesito exportar datos ni abrir otra herramienta

**Given** una Cita con procedencia parcial
**When** se calcula la auditoría
**Then** cuenta como no completa, y el informe distingue parcial de ausente

## Epic 2: El sitio que se lee

Cualquier visitante que llegue desde un buscador encuentra la Cita, confía en ella y se la lleva, y desde ahí puede seguir leyendo. Al terminar, UJ-1 y UJ-3 están completos.

### Story 2.1: Página de Cita

As a Lucía preparando una presentación a las once de la noche,
I want ver la Cita completa con su autor y su procedencia nada más aterrizar desde el buscador,
So that pueda confiar en ella sin comprobarla en otro sitio.

**Acceptance Criteria:**

**Given** una Cita publicada
**When** visito su URL
**Then** el texto de la Cita es el primer elemento visible sin desplazar en un viewport de 360 × 640
**And** la URL es legible, en español y sin identificadores opacos
**And** se muestra el nombre del Autor enlazado a su página
**And** se muestra la obra y el año cuando la Cita tiene procedencia

**Given** una Cita sin procedencia documentada
**When** visito su página
**Then** se indica explícitamente la ausencia
**And** el bloque no se omite en silencio
**And** no se muestra ninguna procedencia inferida o aproximada

**Given** la Cita se compone con los tramos tipográficos definidos
**When** su longitud cae en un tramo distinto
**Then** el tamaño corresponde al tramo: ≤80 → 44px, 81–160 → 36px, 161–240 → 28px, 241–300 y superiores → 23px
**And** en móvil cada tramo baja un escalón sin bajar del suelo de 23px
**And** la tabla de tramos vive en un único módulo

**Given** la página cargada con JavaScript desactivado
**When** la inspecciono
**Then** el texto de la Cita, el Autor y la procedencia están en el HTML inicial
**And** la página no envía JavaScript

**Given** los tokens de diseño
**When** reviso cualquier componente
**Then** no contiene valores literales de color ni de tipografía
**And** la familia serif solo se aplica a texto de Cita, nombre de Autor y nombre de Tema

**Given** una Cita en revisión
**When** intento visitar su URL
**Then** obtengo 404

**Given** el armazón del sitio
**When** reviso la cabecera
**Then** contiene únicamente la marca enlazada a la portada y el acceso a la búsqueda
**And** no hay migas de pan, porque no hay jerarquía que reflejar

**Given** cualquier superficie pública
**When** reviso su tratamiento visual
**Then** no hay sombras ni elevación tonal
**And** la jerarquía se comunica con tamaño tipográfico, espacio en blanco y filete de 1px
**And** el filete de 1px es el único separador del sistema

**Given** cualquier texto que el sitio escribe por su cuenta
**When** lo reviso
**Then** son frases completas con punto final, sin exclamaciones, sin emoji y sin contadores
**And** el sitio no califica ni adjetiva ninguna Cita

**Given** la página cargada
**When** observo la aparición del contenido
**Then** no hay esqueletos de carga ni animación de entrada, porque no hay nada que esperar

### Story 2.2: Copiado con atribución

As a Lucía,
I want llevarme la Cita y su atribución de una sola pulsación,
So that no tenga que teclear el nombre del autor ni arriesgarme a citar mal.

**Acceptance Criteria:**

**Given** una Página de Cita
**When** pulso la acción de copiar
**Then** el portapapeles contiene el texto de la Cita y su atribución juntos
**And** el contenido copiado es texto plano sin marcado
**And** el propio botón confirma la acción durante dos segundos, sin notificación flotante

**Given** que el copiado al portapapeles falla
**When** pulso la acción
**Then** el texto se muestra seleccionable para copia manual
**And** no aparece ningún mensaje de error técnico

### Story 2.3: Página de Autor

As a Marisol que llegó por una frase suelta,
I want ver quién fue esa persona y qué más dijo,
So that pueda seguir leyendo en lugar de volver al buscador.

**Acceptance Criteria:**

**Given** un Autor con Citas publicadas
**When** visito su URL
**Then** veo su semblanza en un párrafo breve
**And** veo todas sus Citas publicadas, cada una enlazada a su página
**And** no aparece ninguna Cita en revisión

**Given** un Autor sin ninguna Cita publicada
**When** intento visitar su URL
**Then** obtengo 404
**And** su página no está en el sitemap

### Story 2.4: Paginación de listados largos

As a visitante ante un autor prolífico,
I want recorrer su catálogo por partes,
So that la página no se degrade por acumular cientos de entradas.

**Acceptance Criteria:**

**Given** un listado con más de 50 Citas
**When** visito la página
**Then** el listado se pagina con controles de anterior y siguiente numerados

**Given** un listado con 50 Citas o menos
**When** visito la página
**Then** no aparece paginación

**Given** la segunda página de un listado y siguientes
**When** inspecciono sus metadatos
**Then** están marcadas como no indexables pero sí rastreables

**Given** el umbral de paginación
**When** busco dónde está definido
**Then** vive en el módulo de umbrales con nombre y no como literal en la página

### Story 2.5: Página de Tema con umbral de publicación

As a visitante que busca «frases sobre el tiempo»,
I want una página que agrupe esa idea entre autores distintos,
So that pueda explorar por lo que quiero decir y no solo por quién lo dijo.

**Acceptance Criteria:**

**Given** un Tema con 15 o más Citas publicadas
**When** visito su URL
**Then** veo Citas de varios Autores, cada una enlazada a su página

**Given** un Tema con menos de 15 Citas publicadas
**When** intento visitar su URL
**Then** obtengo 404
**And** no aparece en el sitemap
**And** no se renderiza ningún chip que enlace a él

**Given** el conjunto publicable
**When** cualquier superficie enumera Citas, Autores o Temas
**Then** deriva de un único módulo dueño del conjunto publicable
**And** ningún módulo aplica el umbral por su cuenta ni filtra colecciones directamente

**Given** un Tema que cae por debajo del umbral
**When** reconstruyo
**Then** deja de publicarse, y sus Citas conservan sus demás Temas

### Story 2.6: Rutas de salida desde cada Cita

As a visitante que acaba de leer una frase que le gustó,
I want tener a dónde seguir sin volver atrás,
So that una visita de un segundo se convierta en una sesión.

**Acceptance Criteria:**

**Given** una Página de Cita publicada
**When** llego al final del contenido
**Then** veo hasta cuatro Citas más del mismo Autor
**And** veo los chips de los Temas publicados a los que pertenece

**Given** cualquier Página de Cita publicada
**When** compruebo sus enlaces salientes internos
**Then** tiene al menos uno
**And** ninguno apunta a una página que no existe

**Given** la selección de Citas relacionadas
**When** reviso cómo se calcula
**Then** deriva de Autor y de Tema, sin motor de recomendación

### Story 2.7: Fundamentos de SEO

As a responsable del producto,
I want que cada página publicada sea rastreable, indexable y descriptible por un buscador,
So that el mecanismo de crecimiento del producto pueda funcionar.

**Acceptance Criteria:**

**Given** el sitio construido
**When** consulto el sitemap
**Then** contiene todas las Páginas de Cita, Autor y Tema publicadas
**And** no contiene ninguna página no publicada
**And** su contenido deriva del módulo dueño del conjunto publicable

**Given** cualquier página publicada
**When** inspecciono su cabecera
**Then** declara su propia URL canónica
**And** declara el idioma `es` sin variante regional

**Given** una Página de Cita
**When** inspecciono sus datos estructurados
**Then** expone la cita y su autor en formato estructurado

**Given** cualquier página publicada
**When** trazo su alcance desde la portada
**Then** es alcanzable siguiendo enlaces internos en un número acotado de saltos

### Story 2.8: Accesibilidad y comportamiento responsive

As a visitante que navega con teclado, con zoom o desde un móvil pequeño,
I want poder usar el sitio completo sin obstáculos,
So that el contenido esté disponible independientemente de cómo lo consulte.

**Acceptance Criteria:**

**Given** cualquier superficie pública
**When** la audito contra WCAG 2.1 nivel AA
**Then** cumple contraste, tamaño tipográfico y navegación por teclado

**Given** la navegación por teclado
**When** recorro los elementos interactivos
**Then** el foco es siempre visible con un anillo de 2px separado 2px
**And** el orden de tabulación es contenido, después acciones, después navegación
**And** el indicador de foco no está suprimido en ningún elemento

**Given** una Página de Cita
**When** inspecciono su semántica
**Then** la Cita está marcada como cita con su atribución asociada
**And** hay un único `h1`
**And** los listados son listas reales

**Given** un viewport de 360px
**When** uso cualquier superficie pública
**Then** es plenamente utilizable
**And** no hay desplazamiento horizontal
**And** las zonas de toque miden al menos 44px con 8px de separación

**Given** un viewport superior a 1024px
**When** comparo con tablet
**Then** el ancho adicional es margen y no contenido nuevo: no aparecen columnas laterales ni bloques adicionales

**Given** zoom del navegador al 200%
**When** recorro el sitio
**Then** no se pierde contenido ni aparece desplazamiento horizontal

**Given** la preferencia de movimiento reducido activada
**When** interactúo con el sitio
**Then** no se ejecuta ninguna transición

**Given** cualquier superficie pública
**When** cargo la página por primera vez
**Then** no aparece ningún modal, aviso de consentimiento ni invitación antes del contenido principal

### Story 2.9: Medición desde la primera página publicada

As a responsable del producto,
I want que el sitio mida su propio comportamiento desde que existe la primera página,
So that pueda saber si funciona en lugar de suponerlo, y sin línea base perdida.

**Acceptance Criteria:**

**Given** el módulo `src/lib/medicion.ts`
**When** reviso quién emite eventos
**Then** es el único emisor del proyecto
**And** ninguna página, componente ni isla llama al proveedor directamente

**Given** el conjunto de eventos
**When** lo reviso
**Then** es cerrado y con nombre: vista de Página de Cita, copiado, descarga de imagen y búsqueda sin resultados
**And** añadir un evento fuera de ese conjunto exige modificar el módulo, no la superficie que lo emite

**Given** el proveedor de analítica elegido
**When** compruebo su comportamiento
**Then** no usa cookies
**And** no identifica individualmente al visitante
**And** no requiere banner de consentimiento, de modo que NFR-10 sigue cumpliéndose

**Given** una visita a una Página de Cita
**When** se carga
**Then** se registra el evento de vista

**Given** un copiado de Cita
**When** se completa
**Then** se registra el evento de copiado
**And** junto con el evento de descarga de la Historia 5.1, permite calcular SM-5

**Given** cualquier evento emitido
**When** inspecciono su contenido
**Then** no transporta datos personales del visitante

**Given** el sitio publicado
**When** consulto la medición
**Then** dispongo de las señales necesarias para SM-2, SM-3, SM-4 y SM-6
**And** SM-1 y SM-C2 se obtienen del sitemap y de la auditoría del Corpus, sin necesitar analítica

## Epic 3: Encontrar sin pasar por Google

Quien ya está en el sitio, o llega sin una consulta de buscador, encuentra lo que busca escribiendo como se escribe de verdad en español.

### Story 3.1: Búsqueda por fragmento, autor y tema

As a visitante que solo recuerda un trozo de la frase,
I want encontrarla escribiendo como me sale, sin acentos y sin precisión,
So that no dependa de recordar el texto exacto ni de escribir bien.

**Acceptance Criteria:**

**Given** el campo de búsqueda presente en cualquier superficie pública
**When** escribo un fragmento de tres o más palabras consecutivas de una Cita publicada
**Then** esa Cita aparece entre los resultados

**Given** una consulta escrita sin acentos
**When** la ejecuto
**Then** devuelve los mismos resultados que la misma consulta con acentos
**And** el resultado es idéntico en mayúsculas y en minúsculas

**Given** una consulta que coincide con un nombre de Autor o de Tema
**When** veo los resultados
**Then** distinguen visualmente si la coincidencia es de Cita, de Autor o de Tema

**Given** el índice de búsqueda
**When** reviso qué contiene
**Then** solo incluye contenido publicado, derivado del módulo dueño del conjunto publicable
**And** ninguna Cita en revisión es localizable

**Given** una página cargada sin interactuar con la búsqueda
**When** mido el JavaScript enviado
**Then** el código de búsqueda no se ha cargado todavía

### Story 3.2: Resultado vacío con salida

As a visitante cuya búsqueda no encontró nada,
I want que el sitio me ofrezca por dónde seguir,
So that no acabe en un callejón sin salida y me marche.

**Acceptance Criteria:**

**Given** una búsqueda sin resultados
**When** veo la pantalla
**Then** se ofrecen Temas y Autores destacados como alternativa
**And** el mensaje sugiere reformular con menos palabras
**And** no aparece ningún texto de error técnico

**Given** una búsqueda sin resultados
**When** se completa
**Then** se emite el evento de búsqueda sin resultados con el texto de la consulta, mediante el módulo de medición establecido en la Historia 2.9
**And** el evento no se asocia a ningún visitante ni transporta datos personales
**And** la consulta queda disponible para alimentar la curación del Corpus

## Epic 4: Un motivo para volver

El visitante que ya conoce el sitio entra directamente al dominio y encuentra algo distinto cada jornada.

### Story 4.1: Portada con Cita del Día

As a visitante que ya conoce el sitio,
I want encontrar una Cita distinta cada día al entrar,
So that tenga un motivo para volver por mi cuenta.

**Acceptance Criteria:**

**Given** la portada
**When** la visito
**Then** veo una Cita destacada enlazada a su Página de Cita
**And** veo el acceso a la búsqueda y entradas a Temas publicados

**Given** dos visitantes distintos en la misma jornada
**When** ambos visitan la portada
**Then** ven la misma Cita del Día

**Given** el conjunto de Citas marcadas como aptas para portada
**When** se selecciona la Cita del Día
**Then** no se repite ninguna mientras queden aptas sin destacar
**And** la selección es determinista a partir de la fecha del build

**Given** una fijación manual para una fecha concreta
**When** llega esa fecha
**Then** la fijación tiene prioridad sobre la selección automática

**Given** la portada
**When** la cargo
**Then** el contenido está en el HTML inicial y no envía JavaScript

### Story 4.2: Reconstrucción diaria programada

As a responsable del producto,
I want que el sitio se reconstruya solo una vez al día,
So that la Cita del Día cambie por jornada sin depender de que yo publique algo.

**Acceptance Criteria:**

**Given** la configuración de integración continua
**When** la reviso
**Then** existen dos disparadores: cada push a la rama principal, y una reconstrucción programada diaria a hora fija

**Given** una jornada sin ningún push
**When** llega la hora programada
**Then** el sitio se reconstruye y la Cita del Día cambia

**Given** un push a media jornada
**When** se despliega
**Then** la Cita del Día de la jornada en curso no cambia

**Given** un fallo de validación del corpus
**When** se dispara cualquiera de los dos disparadores
**Then** el despliegue no llega a producción y el sitio anterior sigue servido

## Epic 5: Que la frase salga de aquí

El visitante convierte una Cita en algo publicable sin abrir un editor ni salir del móvil, y esa publicación trae al siguiente visitante.

### Story 5.1: Generación de Imagen de Cita

As a Diego buscando algo que publicar hoy,
I want descargar la Cita como imagen lista para redes,
So that pueda publicarla sin abrir un editor ni salir del móvil.

**Acceptance Criteria:**

**Given** una Página de Cita de 300 caracteres o menos
**When** pulso la acción de imagen
**Then** se abre un diálogo con la previsualización real del texto de esa Cita
**And** puedo descargar la imagen en una proporción apta para publicación en redes
**And** la imagen contiene el texto, el nombre del Autor y la marca del sitio

**Given** una Cita de más de 300 caracteres
**When** visito su página
**Then** la acción de imagen no se muestra
**And** la acción de copiar sigue disponible

**Given** el cálculo del tamaño tipográfico de la imagen
**When** lo comparo con el de la página
**Then** ambos derivan del mismo módulo de tramos
**And** la previsualización coincide con el fichero descargado

**Given** cualquier longitud de Cita
**When** se compone la imagen
**Then** el texto nunca se recorta ni se abrevia para que quepa

**Given** la generación en curso
**When** se está componiendo la imagen
**Then** la Página de Cita sigue siendo utilizable

**Given** una página cargada sin pulsar la acción de imagen
**When** mido el JavaScript enviado
**Then** el generador no se ha cargado todavía

**Given** una descarga de Imagen de Cita completada
**When** se emite la medición
**Then** se registra el evento de descarga a través del módulo de medición
**And** junto con el evento de copiado de la Historia 2.2, permite calcular SM-5

### Story 5.2: Selección de plantilla

As a Diego,
I want elegir entre unos pocos diseños antes de descargar,
So that la imagen encaje con lo que estoy publicando sin obligarme a decidir demasiado.

**Acceptance Criteria:**

**Given** el diálogo de imagen abierto
**When** veo las opciones
**Then** hay tres plantillas, cada una con la previsualización de esa Cita

**Given** una plantilla seleccionada
**When** comparo con las demás
**Then** el contenido textual y la atribución son idénticos en todas

**Given** el diálogo abierto
**When** pulso Escape, toco fuera del diálogo o pulso el botón de cerrar
**Then** el diálogo se cierra en los tres casos

**Given** el diálogo abierto
**When** descargo
**Then** la descarga es directa, sin paso intermedio ni registro

### Story 4.3: La página 404 como puerta de entrada

As a visitante que llegó a una URL que ya no existe,
I want encontrar por dónde seguir en lugar de un muro,
So that un enlace roto no me expulse del sitio.

**Acceptance Criteria:**

**Given** una URL que no corresponde a ninguna página publicada
**When** la visito
**Then** obtengo una página 404 con el campo de búsqueda y la Cita del Día
**And** el mensaje no contiene texto de error técnico

**Given** la página 404
**When** la reviso
**Then** usa el mismo armazón, tokens y voz que el resto del sitio

---

# Sabiduría de Bolsillo — Épicas de la v2

## Condiciones de Lanzamiento (requisitos adicionales)

No son FR y no producen historias por sí mismas: son las puertas verificables de §13 del PRD, y cada una está asignada a una historia concreta de la Épica 6 o la Épica 7.

- **LC-1 — Dominio propio sirviendo.** `sabiduriadebolsillo.com` por HTTPS; canónica y sitemap lo declaran. → Historia 7.1
- **LC-2 — El sitemap es anunciable.** `robots.txt` que declara dónde está el sitemap. → Historia 7.2
- **LC-3 — Search Console verificada.** Propiedad verificada y sitemap enviado. Sin ella SM-1 no es medible. → Historia 7.2
- **LC-4 — La medición recibe.** Punto final desplegado, eventos de la v1 llegando y consultables. → Historia 7.3
- **LC-5 — Coherencia de marca.** Ninguna superficie ni la marca de agua mencionan el nombre retirado. → Historia 6.1
- **LC-6 — Corpus mínimo defendible.** Ninguna Cita publicada sin Procedencia; ningún Tema anunciado en portada por debajo del umbral de FR-6. → Historia 9.3

## Epic List — v2

### Épica 6: El nombre correcto antes de la primera URL

El producto se llama en todas partes como se llaman las cuentas que van a traerle sus primeros visitantes. Va **primera y sola** por una razón de coste: mientras no exista una URL indexada, renombrar es reemplazar cadenas; en cuanto exista, es una migración con redirecciones, pérdida de posiciones y una marca de agua circulando por Instagram que apunta a un nombre retirado.

**Condiciones cubiertas:** LC-5
**Notas de implementación:** toca 13 ficheros, la marca de agua fija de `public/islas/imagen.js`, tres pruebas que afirman el nombre literal y el `name` de `package.json`. No hay decisión de diseño: la tipografía, los tokens y la disposición no cambian.

### Épica 7: El sitio existe para el mundo

El sitio deja de estar construido y pasa a estar publicado: dominio propio, buscadores avisados y medición recibiendo. Al terminar, cada visita deja rastro y cada página es candidata a indexarse — que es la condición para que cualquier métrica del PRD llegue a existir.

**Condiciones cubiertas:** LC-1, LC-2, LC-3, LC-4
**Notas de implementación:** el hosting no cambia; GitHub Pages sirve desde la v1 con reconstrucción diaria. El módulo de medición está construido desde la Historia 2.9 y hasta ahora no envía a ninguna parte: esta épica le pone receptor, no lo reescribe. AD-13 se preserva — el receptor acepta la baliza propia, no se introduce el guion de un proveedor.

### Épica 8: El canal propio

Héctor publica la Cita del Día en las cinco cuentas de Sabiduría de Bolsillo en dos minutos y sin decisiones, y al cabo de un mes sabe cuál de ellas merece su tiempo. Es el único mecanismo de entrada de visitantes mientras el Corpus no sostenga tráfico de buscador, y va antes que el sembrado porque su efecto se acumula a diario mientras el sembrado es un proceso continuo sin fecha de corte.

**FRs covered:** FR-21, FR-22
**Notas de implementación:** materializa UJ-5, el recorrido nuevo del PRD. No necesita infraestructura: la reconstrucción diaria de AD-12 ya se despierta cada jornada y puede dejar compuesta una página más. `noindex` y sin enlaces entrantes, como la herramienta de curación.

### Épica 9: Un Corpus que crece publicado

El Corpus pasa de 38 Citas a un volumen defendible sin que baje el porcentaje de Procedencia verificada, extrayendo de obras en fuentes de dominio público que traen la referencia consigo. Al terminar, sembrar un Autor es una sesión reproducible en lugar de una tarde de copiar y pegar.

**FRs covered:** FR-23, FR-24, FR-25
**Condiciones cubiertas:** LC-6
**Notas de implementación:** extiende `tools/` y la puerta de admisión existente; **no la esquiva**. Lo que esta épica NO hace, y conviene que quede escrito porque es una idea que vuelve: rastrear sitios de citas existentes. Sus condiciones lo prohíben, su compilación está protegida y —lo decisivo— publican texto y nombre sin obra ni año, así que cada Cita extraída de ahí moriría en `corpus/_revision/`. Tampoco se traducen Citas: la traducción es obra nueva con plazo propio, y una traducción del editor produce una Cita cuya Procedencia no consta en ninguna edición.

### Épica 10: Que la frase salga hacia una aplicación

El visitante manda la Cita a la aplicación donde publica, sin pasar por la carpeta de descargas, y el enlace que comparte llega con una previsualización que muestra la Cita. Cierra UJ-2 hasta su final, que la v1 dejaba a medio camino.

**FRs covered:** FR-17, FR-18, FR-19, FR-20
**Notas de implementación:** va la última porque compartir con 38 Citas y sin medición configurada gasta el alcance de las cuentas en un sitio que todavía no puede retener a nadie ni contar si lo hizo. La generación del PNG ya existe (`public/islas/imagen.js`, `canvas.toBlob()`); FR-17 cambia el destino del mismo blob. La Tarjeta Social, en cambio, es pieza nueva: se genera en el build, no en el navegador, y debe consumir los tramos de `src/lib/tramos.ts` o divergirá de la Imagen de Cita.

---

## Epic 6: El nombre correcto antes de la primera URL

El producto se llama en todas partes como se llaman las cuentas que van a traerle sus primeros visitantes.

### Story 6.1: Renombrado a Sabiduría de Bolsillo

As a visitante que llega desde una cuenta de Sabiduría de Bolsillo,
I want aterrizar en un sitio que se llama igual que la cuenta que me trajo,
So that no dude si he llegado a donde quería.

**Acceptance Criteria:**

**Given** cualquier superficie pública del sitio
**When** la reviso
**Then** la marca dice «Sabiduría de Bolsillo»
**And** no queda ninguna aparición del nombre retirado en marcado, títulos ni metadatos

**Given** una Imagen de Cita recién generada
**When** miro su marca de agua
**Then** dice «Sabiduría de Bolsillo»
**And** conserva su posición, tamaño y peso tipográfico anteriores

**Given** las pruebas que afirmaban el nombre literal
**When** ejecuto la suite completa
**Then** pasan afirmando el nombre nuevo
**And** ninguna prueba quedó afirmando el antiguo

**Given** el sitio construido
**When** busco el nombre retirado en `dist/`
**Then** no aparece en ningún fichero

## Epic 7: El sitio existe para el mundo

El sitio deja de estar construido y pasa a estar publicado.

### Story 7.1: El dominio propio sirviendo

As a Héctor,
I want que el sitio responda en sabiduriadebolsillo.com,
So that cada página que se indexe lo haga ya en su dirección definitiva y no haya que redirigirla después.

**Acceptance Criteria:**

**Given** `sabiduriadebolsillo.com`
**When** lo visito
**Then** responde por HTTPS con certificado válido
**And** la versión sin `www` y la versión con `www` llevan a la misma página

**Given** cualquier página publicada
**When** leo su etiqueta canónica
**Then** apunta al dominio definitivo
**And** el sitemap declara ese mismo dominio en todas sus entradas

**Given** el dominio configurado
**When** reviso dónde vive esa configuración
**Then** el dominio aparece en la variable de entorno del despliegue y en el fichero que exige el hospedaje
**And** ningún componente ni página lo lleva escrito a mano

**Given** un despliegue posterior
**When** se ejecuta la reconstrucción diaria
**Then** el dominio se mantiene sin intervención manual

### Story 7.2: Anunciar el sitio a los buscadores

As a Héctor,
I want que los buscadores sepan dónde está el sitemap y quién es el dueño del sitio,
So that SM-1 pueda medirse en lugar de suponerse.

**Acceptance Criteria:**

**Given** el sitio publicado
**When** pido `/robots.txt`
**Then** existe y declara la ubicación del sitemap
**And** no bloquea ninguna página que el sitemap anuncia

**Given** las páginas marcadas `noindex` en la v1
**When** comparo `robots.txt`, el sitemap y las etiquetas de cada página
**Then** los tres coinciden: lo que se pide no indexar no se anuncia en ninguno

**Given** Search Console
**When** reviso la propiedad
**Then** está verificada para el dominio y el sitemap enviado
**And** el método de verificación queda documentado para poder repetirlo

### Story 7.3: La medición recibe de verdad

As a Héctor,
I want que los eventos que el sitio emite desde la v1 lleguen a algún sitio consultable,
So that pueda responder «cuántos» en lugar de «no sé» a partir del primer día publicado.

**Acceptance Criteria:**

**Given** el punto final de medición desplegado
**When** el sitio emite un evento del vocabulario cerrado
**Then** el evento queda registrado con su nombre y su ruta
**And** puedo consultarlo sin exportar nada ni pedir permiso a un tercero

**Given** un evento con nombre fuera del vocabulario cerrado
**When** llega al punto final
**Then** se descarta

**Given** cualquier evento registrado
**When** examino lo almacenado
**Then** no contiene identificador de visitante, cookie ni dato que pueda convertirse en uno
**And** la propiedad «no requiere consentimiento» sigue siendo cierta por construcción

**Given** el punto final caído o inalcanzable
**When** un visitante usa el sitio
**Then** la página funciona con normalidad y el evento se pierde en silencio

**Given** los cuatro eventos de la v1
**When** recorro las superficies que los emiten
**Then** los cuatro llegan al receptor

## Epic 8: El canal propio

Héctor publica la Cita del Día en sus cuentas en dos minutos y sin decisiones.

### Story 8.1: El Kit Diario de Publicación

As a Héctor llevando las cuentas de Sabiduría de Bolsillo,
I want abrir una sola dirección por la mañana y encontrar el material del día ya compuesto,
So that publicar a diario me cueste dos minutos y lo haga todos los días en vez de tres veces por semana.

**Acceptance Criteria:**

**Given** una jornada cualquiera
**When** abro la dirección del Kit desde el móvil
**Then** veo la Imagen de la Cita del Día ya generada
**And** el pie con la atribución escrito y listo para copiar
**And** el enlace a la Página de Cita

**Given** el cambio de jornada
**When** se ejecuta la reconstrucción diaria
**Then** el Kit muestra la Cita del Día nueva sin ninguna intervención

**Given** el Kit
**When** compruebo su indexabilidad
**Then** declara `noindex`
**And** no aparece en el sitemap
**And** no hay ningún enlace hacia él desde la navegación pública

**Given** una Cita del Día que supera el límite de longitud para Imagen
**When** abro el Kit
**Then** me lo dice explícitamente
**And** me ofrece una Cita alternativa apta con su material completo

**Given** el Kit abierto en un móvil
**When** intento llevarme la imagen
**Then** puedo hacerlo con el mismo gesto que cualquier visitante usa en una Página de Cita

### Story 8.2: Saber qué red trae visitas

As a Héctor,
I want distinguir de qué cuenta viene cada visita,
So that dentro de un mes sepa en cuál de las cinco redes invertir el tiempo y en cuáles no.

**Acceptance Criteria:**

**Given** el Kit Diario
**When** miro los enlaces que ofrece
**Then** hay uno por red, cada uno con su marca de origen distinta

**Given** una visita llegada por uno de esos enlaces
**When** consulto la medición
**Then** puedo agrupar visitas por red de origen y por jornada

**Given** una Página de Cita alcanzada con marca de origen
**When** la comparo con la misma sin marca
**Then** la etiqueta canónica es idéntica en ambas
**And** el buscador no ve dos páginas distintas

**Given** un visitante que llega con marca de origen
**When** mira la página
**Then** no percibe ninguna diferencia respecto a llegar sin ella

## Epic 9: Un Corpus que crece publicado

El Corpus crece sin que baje el porcentaje de Procedencia verificada.

### Story 9.1: Extracción de candidatas desde una Fuente

As a Héctor sembrando el Corpus,
I want partir de una obra concreta y obtener candidatas que ya traen su obra y su año,
So that la Procedencia no sea algo que haya que buscar después de tener el texto.

**Acceptance Criteria:**

**Given** un Autor y una Fuente admitida
**When** ejecuto la extracción
**Then** obtengo candidatas cuyo campo de obra y de año vienen de la Fuente
**And** ninguna candidata trae Procedencia inferida o aproximada

**Given** cualquier candidata extraída
**When** examino lo que se guardó
**Then** consta de qué Fuente salió y bajo qué licencia

**Given** una Fuente cuya licencia no permite reutilización
**When** intento extraer de ella
**Then** el proceso se detiene y explica por qué
**And** no queda ninguna candidata en el Corpus

**Given** una obra con pasajes en otra lengua
**When** se proponen candidatas
**Then** las que no están en español no se proponen

**Given** las candidatas extraídas
**When** compruebo dónde han quedado
**Then** están en revisión, no publicadas

### Story 9.2: Aprobación por lote

As a Héctor,
I want revisar un lote entero de candidatas y decidir sobre cada una sin salir de la revisión,
So that sembrar treinta Citas sea una sesión y no treinta sesiones.

**Acceptance Criteria:**

**Given** un lote de candidatas
**When** apruebo una
**Then** pasa por las mismas reglas de admisión que cualquier alta manual
**And** una que las incumpla no se publica aunque yo la haya aprobado

**Given** una candidata que duplica una Cita ya publicada
**When** llego a ella en la revisión
**Then** se me señala antes de decidir
**And** la decisión sigue siendo mía

**Given** una candidata rechazada
**When** reviso el Corpus después
**Then** no ha quedado en ninguna parte

**Given** un lote a medio revisar
**When** lo dejo y vuelvo otro día
**Then** continúo donde lo dejé sin repetir lo ya decidido

### Story 9.3: Ver qué le falta al Corpus

As a Héctor a punto de empezar una sesión de sembrado,
I want saber qué huecos tiene el Corpus antes de elegir a quién dedico la sesión,
So that el sembrado llene lo que está vacío en vez de engordar lo que ya está lleno.

**Acceptance Criteria:**

**Given** el Corpus actual
**When** consulto los huecos
**Then** veo los Temas por debajo del umbral de publicación con cuántas Citas les faltan a cada uno

**Given** el Corpus actual
**When** consulto el equilibrio de tradición
**Then** veo la proporción de Autores de tradición latinoamericana frente al suelo comprometido

**Given** la vista de huecos
**When** la uso
**Then** informa mi decisión y no elige por mí: no propone Autores automáticamente

**Given** un Tema que se anuncia en la portada
**When** compruebo su recuento
**Then** está por encima del umbral de publicación

## Epic 10: Que la frase salga hacia una aplicación

El visitante manda la Cita a la aplicación donde publica.

### Story 10.1: Tarjeta Social de toda Cita publicada

As a alguien que recibe por WhatsApp el enlace de una Cita,
I want ver de qué Cita se trata antes de decidir si abro el enlace,
So that el enlace me diga algo en lugar de ser una dirección desnuda.

**Acceptance Criteria:**

**Given** cualquier Cita publicada
**When** pego su enlace en una red o mensajería
**Then** la previsualización muestra una imagen propia de esa Cita, no un genérico del sitio

**Given** una Cita que admite Imagen de Cita
**When** miro su Tarjeta Social
**Then** presenta el texto de la Cita y el nombre del Autor

**Given** una Cita que supera el límite de longitud de FR-10
**When** miro su Tarjeta Social
**Then** presenta el Autor y la marca sin el texto de la Cita
**And** en ningún caso muestra un fragmento recortado del texto

**Given** la Tarjeta Social y la Imagen de Cita de una misma Cita
**When** comparo su composición tipográfica
**Then** ambas derivan del mismo módulo de tramos

**Given** cualquier Cita publicada
**When** paso su URL por los validadores de previsualización de las redes de destino
**Then** ninguna reporta tarjeta ausente o imagen inaccesible

### Story 10.2: Compartir la imagen por la hoja del sistema

As a Diego con el móvil en la mano,
I want mandar la Imagen de Cita directamente a la aplicación donde voy a publicar,
So that no tenga que buscar dónde ha caído el fichero descargado.

**Acceptance Criteria:**

**Given** un navegador móvil que admite compartir ficheros
**When** pulso la acción tras elegir plantilla
**Then** se abre la hoja del sistema con la imagen ya adjunta

**Given** un navegador que no admite compartir ficheros
**When** pulso la misma acción
**Then** la imagen se descarga, exactamente como en la v1
**And** no veo ningún aviso de incompatibilidad ni ningún control deshabilitado

**Given** la imagen compartida y la imagen descargada de la misma Cita y plantilla
**When** las comparo
**Then** son el mismo fichero, producido por la misma generación

**Given** la hoja del sistema abierta
**When** la cierro sin elegir destino
**Then** no se registra compartición
**And** no aparece ningún mensaje de error

**Given** la detección de capacidad del navegador
**When** reviso cómo se decide qué acción ofrecer
**Then** se comprueba la capacidad de compartir **ficheros**, no la de compartir en general

### Story 10.3: Compartir el enlace a un destino

As a Marisol que quiere mandar una Cita a alguien,
I want compartir el enlace con la Cita y su autor ya escritos,
So that quien lo reciba sepa qué le mando sin tener que abrirlo.

**Acceptance Criteria:**

**Given** una Página de Cita
**When** comparto su enlace
**Then** el texto propuesto incluye la Cita y el nombre del Autor
**And** nunca es solo la dirección

**Given** un dispositivo con hoja del sistema
**When** uso la acción de compartir enlace
**Then** se abre la hoja con enlace y texto

**Given** un navegador sin hoja del sistema
**When** uso la misma acción
**Then** veo destinos concretos y visibles
**And** solo aparecen los destinos que admiten recibir un enlace desde la web

**Given** cualquier destino ofrecido
**When** lo uso
**Then** no se me pide registrarme en el sitio ni instalar nada

**Given** un enlace compartido con marca de origen
**When** reviso qué indexa el buscador
**Then** solo existe la URL canónica

### Story 10.4: Medir la compartición

As a Héctor,
I want saber cuánto y hacia dónde se comparte,
So that pueda comprobar si la v2 amplió el alcance del sitio o solo movió un botón de sitio.

**Acceptance Criteria:**

**Given** una compartición hacia un destino elegido en el sitio
**When** se emite la medición
**Then** el evento registra ese destino

**Given** una compartición a través de la hoja del sistema
**When** se emite la medición
**Then** el evento registra el destino como opaco
**And** no se intenta averiguar cuál fue

**Given** las comparticiones de imagen y de enlace
**When** consulto la medición
**Then** puedo distinguirlas entre sí

**Given** los eventos nuevos
**When** reviso el módulo de medición
**Then** están declarados en el vocabulario cerrado
**And** no existe ningún evento genérico con carga libre que permita ampliarlo sin tocar el módulo

**Given** cualquier evento de compartición
**When** examino lo que viaja
**Then** no incluye cookie, identificador ni dato que pueda convertirse en uno

**Given** SM-5 y SM-7 medidas durante el mismo periodo
**When** las comparo
**Then** puedo comprobar si la compartición creció a costa del copiado, que es lo que SM-C3 vigila
