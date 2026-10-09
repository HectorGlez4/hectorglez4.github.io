---
stepsCompleted: [1, 2, 3, 4]  # pasadas v1, v2, v3, v3.1 y v5 completadas; v7 (ciclo 1) en curso: paso 4; 2026-10-05: documentación retroactiva de la Épica 15 (v4) y de las historias 11.5, 11.6, 19.12 y 19.13, ya construidas; v7.1 (Página de Obra), 2026-10-09: pasos 1 a 4
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-brainlySabiduria-2026-08-10/prd.md
  - _bmad-output/planning-artifacts/prds/prd-brainlySabiduria-2026-08-10/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/GUIA-DE-ARRANQUE.md
  - _bmad-output/planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/RECONCILIACION.md
  - _bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/EXPERIENCE.md
  - _bmad-output/specs/spec-brainlySabiduria/SPEC.md
  - docs/superpowers/specs/2026-10-04-ciclo-1-medir-y-canal-design.md
  - docs/superpowers/specs/2026-10-04-fase-siguiente-borrador.md
  - docs/superpowers/specs/2026-10-03-datos-recogidos.md
  - docs/superpowers/specs/2026-10-05-pagina-de-obra-design.md
  - _bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/mockups/pagina-de-obra.html
  - _bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/mockups/buscar.html
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


#### Añadidos en la v5

- **FR-38: El sitio anuncia sus cambios a los buscadores que lo aceptan** — Aviso de cambio por canal abierto al publicar o modificar cualquiera de las cuatro familias, emitido desde la publicación y no desde el build; su fallo no falla el despliegue. **No arregla SM-1**: el buscador que la mide no acepta aviso. Se sostiene por su motivo propio y se mide aparte.
- **FR-39: El enlace interno se reparte desde donde el buscador ya entra** — Para cada superficie publicada, cuántos enlaces entrantes llegan desde superficies **indexadas** y cuántos del resto. Lista consultable de las que no reciben ninguno. Añade el origen del enlace a lo que NFR-5 ya cuenta en saltos.
- **FR-40: La indexación se lee por familia, no como un total** — Proporción indexada de cada familia, con su fecha de lectura. La cifra que se compara con SM-1 es la de la familia Cita. Sin fuente disponible, no publica número.
- **FR-41: La semblanza sitúa al Autor con fuente** — Cuándo vivió, en qué corriente escribió y por qué se le cita, con la atribución publicada visible. El sistema no compone prosa nueva sobre el Autor. Sin procedencia declarada no se publica.
- **FR-42: La Página de Autor enumera su obra** — Lista derivada de las Procedencias publicadas, con recuento por obra y enlace a sus Citas. Una obra sin Citas publicadas no aparece. Año solo cuando la Procedencia lo declara.
- **FR-43: La obra es la superficie natural del enlace de afiliación** — La lista se publica con el Modelo apagado y no cambia de forma al encenderse. La Página de Autor se suma a las superficies admitidas, sin sustituir a la de Cita.

*(**FR-4** queda enmendado en la v5: la semblanza deja de medirse por su longitud y pasa a medirse por lo que trae.)*

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

> **Superada por la Story 11.3.** Este criterio se aceptó con la redacción de FR-25 vigente en la v2. El PRD v3.1 la cambió: la política de selección pasa a ser determinista y consultable, y el editor la anula con la anulación registrada. Se conserva tal cual porque documenta lo que se construyó y se aceptó entonces; lo que hay que implementar ahora es la 11.3.

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

---

# Sabiduría de Bolsillo — Épicas de la v3

Las Épicas 1 a 5 son la v1 y las 6 a 10 la v2, ambas documentadas más arriba. Esta tercera parte cubre la v3: cerrar las Condiciones de Lanzamiento, crecer el Corpus publicado, y las tres features nuevas de §4.12–§4.14 del PRD.

**La puerta que gobierna todas estas épicas.** §6.3 del PRD, reescrita en la v3, dejó de ser un orden de construcción y pasó a ser una puerta de publicación: *se puede construir en cualquier orden; nada se publica ni se comparte hasta que LC-1…LC-4 estén verificadas*. Ninguna historia de aquí está bloqueada por esa puerta, y ninguna la abre — la abre Héctor ejecutando `DESPLIEGUE.md` §1–§3, y la jornada en que se cierra es el mes 0 del producto.

## Requirements Inventory — v3

### Functional Requirements

FR-26: Toda Colección publicada tiene URL propia, legible y estable, con las Citas que la componen; una Colección por debajo de su umbral mínimo no se publica ni entra en el sitemap, y toda Colección publicada es alcanzable por enlaces internos desde la portada.
FR-27: El editor crea una Colección con criterio y nombre y le asigna Citas ya `publicada`; una Cita puede pertenecer a varias Colecciones sin que cambien sus Temas ni su Autor, el editor ve cuántas le faltan para el umbral, y una Colección se despublica sin borrar ninguna Cita.
FR-28: La Colección agrega y enlaza pero no reproduce el producto en otra URL: la canónica de cada Cita sigue siendo su Página de Cita, una Cita en varias Colecciones no genera contenido duplicado indexable, y el texto editorial describe el criterio sin comentar ni adjetivar las Citas.
FR-29: El editor compone varias jornadas de material de una sola sentada; lo compuesto por adelantado es indistinguible de lo que compone la jornada y lo sustituye si ambos existen, cambiar la Cita del Día de una jornada ya compuesta la recompone, el lote es reanudable y su superficie no es indexable ni enlazada.
FR-30: El sistema compone una Pieza de Canal que reúne varias Citas; cada una conserva su atribución visible, una Cita que no admite Imagen por el límite de FR-10 tampoco entra, la pieza declara un único enlace de destino marcado por red según FR-22, y la plantilla no altera el texto de ninguna Cita.
FR-31: El sistema compone una Pieza de Canal con duración; se compone sin intervención manual una vez elegidas las Citas, el texto de cada Cita permanece en pantalla el tiempo necesario para leerlo sin recortarse ni acelerarse, y la atribución acompaña a cada Cita mientras se muestra. **Umbral de construcción:** no se construye hasta que SM-8 demuestre que al menos una cuenta de imagen fija trae visitas medibles.
FR-32: Una Colección publicada produce su propia Pieza de Canal, que enlaza a la Página de Colección y no a una Cita suelta; una Colección por debajo de su umbral no produce pieza, y la pieza respeta las reglas de atribución de FR-30.
FR-33: Ningún Modelo de Ingreso se enciende antes de que su Umbral de Activación se mida en el receptor de LC-4; cada Modelo se enciende y apaga por separado, un Modelo apagado no deja hueco reservado ni espacio en blanco en ninguna superficie, y su estado y la cifra contra la que se mide son consultables sin exportar datos.
FR-34: El visitante que quiere sostener el sitio encuentra cómo sin que se le pida; la invitación no aparece en la Página de Cita ni interrumpe ninguna lectura, no introduce JavaScript de terceros, y rechazarla o ignorarla no degrada ninguna funcionalidad. **Umbral:** LC-1…LC-4 verificadas.
FR-35: La Procedencia de una Cita puede llevar a la edición de la que salió; el enlace sale de la Procedencia ya publicada y nunca se inventa una obra, una Cita sin Procedencia completa no produce enlace, la relación comercial se declara donde el enlace aparece, y la atribución se lee igual con el Modelo apagado que encendido. **Umbral:** 2.000 sesiones orgánicas/mes.
FR-36: El Corpus verificado sostiene algo que se vende una vez y no por visita; lo que se venda no retira del sitio nada que hoy sea gratuito y ninguna Cita deja de ser accesible, copiable ni compartible. **Definición diferida** a propósito. **Umbral:** 5.000 sesiones orgánicas/mes.
FR-37: La publicidad, si se enciende, vive donde no está la Cita: la Página de Cita y la Página de Colección quedan excluidas y solo admiten publicidad la portada, los resultados de búsqueda y la 404; ninguna unidad se intercala entre el contenido, no degrada NFR-7 medido con el Modelo encendido, no introduce muro ni modal, y no exige consentimiento invasivo ni identificación individual. **Umbral:** 25.000 sesiones orgánicas/mes.

### NonFunctional Requirements

NFR-13 *(nuevo en la v3)*: Ninguna superficie de agregación canibaliza a la Cita. La canónica de una Cita es siempre su Página de Cita, esté en cuantos Temas y Colecciones esté; una Cita presente en varias agregaciones no genera contenido duplicado indexable.

Los NFR-1…NFR-12 del inventario de la v1 siguen vinculando y no se reenuncian. Los que la v3 pone a prueba de forma nueva:

- **NFR-1…NFR-5** — la Página de Colección es una superficie indexable más: canónica propia, contenido en el HTML inicial, URL legible en español, y ninguna Colección publicada huérfana.
- **NFR-6** — el lote de composición de FR-29 es superficie interna: ni rastreable, ni indexable, ni alcanzable por URL adivinable.
- **NFR-7** — se vuelve a medir con cada Modelo de Ingreso **encendido**, no solo en reposo.
- **NFR-10, NFR-11** — tienen prioridad sobre cualquier Modelo de Ingreso; un proveedor que exija consentimiento invasivo o identifique al visitante no cumple FR-37 y no se enciende.
- **NFR-12** — la Pieza de Canal no altera el texto de ninguna Cita, igual que la Imagen y la Tarjeta.

### Additional Requirements

De la espina de arquitectura (AD nuevos o extendidos en la v3) y de la reconciliación aguas arriba:

- **AD-15 — el plano de composición lo fija quién consume el artefacto.** Build para lo que pide un tercero que no ejecuta JavaScript (Tarjeta Social); cliente para lo que pide alguien con navegador delante (Imagen de Cita, Imagen del Kit); `tools/` para composición por lote o que exige codificación — ahí caen las cuatro Piezas de Canal de FR-29…FR-32, motor de vídeo incluido. La salida de `tools/` **no se versiona**; lo versionado es la fijación de jornada.
- **AD-16 — la pregeneración por Cita es incremental.** Una construcción no rasteriza un artefacto por Cita cuya entrada no ha cambiado, y la entrada incluye la versión de la plantilla. Vincula a la clase entera, no solo a la Tarjeta.
- **AD-17 — el carácter publicable de una superficie tiene un solo dueño.** Una superficie declara en un solo sitio si es publicable, y de ahí derivan la inclusión en el sitemap, el `noindex` y el barrido automatizado de accesibilidad y móvil. Hoy son tres sitios: `noIndexar` y `fueraDeLaBusqueda` en `Armazon.astro`, más el filtro de `astro.config.mjs`.
- **AD-18 — la pertenencia a una Colección se declara en la Colección, y es blanda.** Miembros por slug en `corpus/colecciones/{slug}.yml`, resueltos por intersección con el conjunto publicable; el umbral se aplica al recuento **resuelto**, nunca al declarado. Invierte a propósito la dirección del Tema, que se declara en la Cita.
- **AD-19 — ninguna agregación reproduce la Cita.** Toda superficie indexable que enumere Citas usa el **mismo** componente de tarjeta (`src/components/TarjetaDeCita.astro`): fragmento acotado, atribución y enlace. La Colección lo reutiliza; no compone el suyo. No vincula al material de salida: una Pieza de Canal reúne Citas íntegras a propósito.
- **AD-20 — ningún guion de tercero, y el Modelo de Ingreso no es una excepción.** `MAX_BYTES_DE_GUION` cubre también lo que traiga un Modelo. Qué superficie admite qué Modelo tiene dueño propio, y **el armazón compartido no aloja ninguno**.
- **AD-21 — encender un Modelo de Ingreso es un commit, no una medición.** El estado es configuración versionada; una herramienta de `tools/` consulta el receptor e **informa**, y un paso del CI avisa al cruzarse el umbral.
- **AD-11 extendido — publicable y alcanzable son el mismo conjunto.** `src/lib/publicado.ts` posee ahora también la enumeración de descubrimiento, de modo que una superficie no puede ser publicable y quedar huérfana.
- **AD-9** — el umbral mínimo de Colección y los cuatro Umbrales de Activación entran en `src/lib/umbrales.ts` y en ningún otro sitio.
- **AD-4** — ni los Temas ni las Colecciones participan en ninguna ruta de Cita; el slug no se recalcula.
- **AD-12 + AD-15 — no hay segundo calendario.** La composición anticipada de FR-29 son las fijaciones de `corpus/portada.json`, que `citaDelDia.ts` ya prioriza sobre la rotación desde la v1. El lote y la jornada derivan de la misma fijación, así que «lo anticipado sustituye a lo de la jornada» se cumple por construcción y no hay desempate que inventar. *(Corrige la delegación a Arquitectura que el addendum del PRD todavía arrastra — `RECONCILIACION.md` §2.)*
- **AD-22 — la red vive en la cáscara de `tools/`.** Solo la capa exterior hace peticiones; `tools/lib/`, `src/lib/`, el esquema y las páginas son puros sobre datos ya recuperados, y **ningún paso del build descarga nada**. Es la primera dependencia de red del proyecto y entra acotada.
- **AD-23 — el cotejo corre en el build, contra el documento versionado.** El documento de la Fuente vive en `corpus/fuentes/` (no es colección, y sí lo lee el build), cada Cita lo referencia, y una Cita cuyo texto no aparezca literalmente en él rompe la construcción. Dónde corre el cotejo lo elige el código con una condición: fuera de `src/lib/`, que por AD-5 no lee el disco. Un documento por par (Fuente, obra), nombrado `{id-de-fuente}--{slug-de-obra}`, en texto plano y sin marcado; el cotejo colapsa espacios y nada más, sin pasar por `normalizar.ts`.
- **Sin tecnología nueva.** El stack de la v3 es el de la v2: Astro 7, Node ≥22.12, TypeScript estricto, Pagefind, `sharp`, GitHub Pages, Cloudflare Workers + D1.
- **Diferido a propósito, y no se decide en estas épicas:** el motor de vídeo de FR-31 (sin encoder elegido; su puerta es SM-8), el valor del umbral mínimo de Colección (sale de curar las tres o cuatro primeras), el mecanismo concreto de caché de AD-16, el proveedor de publicidad y la definición del producto propio de FR-36.

### UX Design Requirements

Continúan la numeración de la v2, que terminó en UX-DR29.

UX-DR30: La Página de Colección presenta sus Citas con `src/components/TarjetaDeCita.astro`, el mismo componente que usan los listados de Autor y de Tema — fragmento en `headline-sm`, autor en el token `author`, filete divisorio entre tarjetas. No compone una presentación propia. *(AD-19, NFR-13.)*
UX-DR31: El nombre de una Colección se compone en Source Serif, como los de Autor y Tema; el resto de la página —criterio editorial, navegación, metadatos— va en Inter. Ningún otro uso de la serif.
UX-DR32: El texto editorial de la Colección describe su criterio y no adjetiva ni comenta las Citas que contiene, por la voz de producto de `DESIGN.md § Brand & Style` y `EXPERIENCE.md § Voice and Tone`.
UX-DR33: La Página de Colección cumple el suelo de accesibilidad y el comportamiento responsive de las demás superficies públicas: WCAG 2.1 AA, utilizable a 360 px, foco visible de 2px, un solo `h1`, listados como listas reales. Debe entrar en el barrido automatizado **sin** añadirse a ninguna lista aparte *(AD-17)*.
UX-DR34: La Colección es navegación lateral, no jerárquica: se alcanza por enlaces internos desde la portada y no introduce migas de pan ni una jerarquía que el sitio no tiene. *(Recortado en la validación final: la redacción original exigía además alcanzarla **desde las Páginas de Cita que contiene**, y el contrato no lo sostiene — FR-28 dice que la Colección enlaza a las Citas, no al revés, y AD-18 invierte a propósito la dirección del Tema. Un enlace inverso en la Página de Cita sería una superficie de diseño nueva; queda como pregunta para una pasada de `bmad-ux`.)*
UX-DR35: Con un Modelo de Ingreso apagado, ninguna superficie muestra hueco reservado, espacio en blanco ni marcador. Un Modelo apagado es invisible, no latente *(FR-33, §12.1)*.
UX-DR36: Ningún Modelo de Ingreso aparece en el armazón compartido ni en la Página de Cita ni en la de Colección. La invitación de donación vive en superficies de no-lectura: portada, resultados de búsqueda y 404 *(FR-34, FR-37, AD-20)*.
UX-DR37: **Hueco declarado.** `DESIGN.md` y `EXPERIENCE.md` están actualizados al 10/08 y no describen ni el Kit Diario (v2, ya construido) ni la Página de Colección (v3). Las historias de Colección se escriben con AD-19 como criterio de aceptación en lugar de con una espina de UX que la cubra. Una pasada de `bmad-ux` acotada a esa superficie puede refinar la presentación después sin invalidar ninguna historia, siempre que respete UX-DR30.

### FR Coverage Map — v3

FR-23, FR-24, FR-25: **Épica 11** — reescritos en el PRD v3.1 para que el sembrado lo pueda ejecutar un agente. La Épica 9 construyó las herramientas; esta épica les añade las salvaguardas que hacen segura esa apertura (recuperación de la Fuente, cotejo en el build, política determinista de objetivo) y después las ejercita hasta alcanzar volumen.
FR-26: **Épica 12** — Página de Colección indexable, con umbral sobre el recuento resuelto y sin quedar huérfana.
FR-27: **Épica 12** — curación de una Colección: criterio, nombre y asignación de Citas ya publicadas.
FR-28: **Épica 12** — la Colección agrega y enlaza; la canónica sigue siendo la Página de Cita.
FR-29: **Épica 13** — composición anticipada por lote, sobre las fijaciones de `corpus/portada.json`.
FR-30: **Épica 13** — Pieza de Canal de varias Citas, cada una con su atribución.
FR-31: **Sin épica — puerta cerrada.** No se construye hasta que SM-8 demuestre que al menos una cuenta de imagen fija trae visitas medibles. Hoy la medición no recibe (LC-4), así que SM-8 no existe todavía. Candidato preferente al recorte; AD-15 lo deja en `tools/` para que recortarlo no toque nada más.
FR-32: **Épica 13** — Pieza de Canal derivada de una Colección publicada.
FR-33: **Épica 14** — activación por umbral medido, con el estado como configuración versionada.
FR-34: **Épica 14** — donaciones. Su umbral es «LC-1…LC-4 verificadas», así que se enciende el mismo día que se abren las puertas.
FR-35: **Sin épica — puerta cerrada.** Umbral de 2.000 sesiones orgánicas/mes. *(La contradicción que este mapa registraba quedó resuelta en el PRD v3.1: §5 se estrechó a la publicidad, que es para lo que se había decidido, y FR-35 es construible desde la Procedencia. Sigue sin épica solo por su umbral.)*
FR-36: **Sin épica — puerta cerrada y contenido sin definir.** Umbral de 5.000 sesiones orgánicas/mes; el PRD difiere a propósito la elección entre lámina, antología y recurrencia.
FR-37: **Sin épica — puerta cerrada.** Umbral de 25.000 sesiones orgánicas/mes. AD-20 excluye de partida a buena parte del mercado de display, y conviene saberlo antes de evaluar proveedores.

**Cobertura no-FR.** La Épica 11 cierra LC-6 (ningún Tema anunciado en portada por debajo del umbral) y valida SM-C1 y SM-C2. LC-1…LC-4 no aparecen aquí: son de la Épica 7, cuyas tres historias están en `review` esperando `DESPLIEGUE.md` §1–§3.

## Epic List — v3

### Épica 11: Un Corpus con volumen defendible

El Corpus pasa de 38 Citas a un volumen donde hay cola larga que capturar y Temas que superan su umbral, sin que baje el porcentaje de Procedencia verificada. Va primera porque **todo lo demás mejora con volumen y nada lo sustituye**: una Colección necesita Citas entre las que escoger, y una Pieza de varias Citas necesita que haya varias que merezcan ir juntas.

**FRs covered:** FR-23, FR-24, FR-25 — reescritos en el PRD v3.1.
**Condiciones cubiertas:** LC-6.
**Notas de implementación:** tres historias de desarrollo y una operativa. Las tres primeras construyen las salvaguardas que permiten que el sembrado lo ejecute un agente sin que la Procedencia deje de ser comprobable: lo que hace segura la apertura no es confiar en quien ejecuta, sino que el metadato se derive del documento y que el texto tenga que aparecer en él. La cuarta corre el proceso y solo se cierra si las contra-métricas aguantan — si SM-C1 baja mientras el Corpus crece, la sesión ha fallado aunque haya sumado Citas. La 11.4 es la única de la v3 que `bmad-build` no puede ejecutar, y va la última a propósito: las tres que sí puede la habilitan.

### Épica 12: La cola larga tiene dónde aterrizar

Un visitante que busca «frases cortas para reflexionar» encuentra una página propia con esas Citas escogidas, y el editor crea una Colección sin tocar una sola Cita. Al terminar, retirar una Cita del Corpus la saca de todas sus Colecciones sin romper el build y sin dejar un enlace roto.

**FRs covered:** FR-26, FR-27, FR-28.
**NFR:** NFR-13. **UX-DR:** UX-DR30, UX-DR31, UX-DR32, UX-DR33, UX-DR34.
**Notas de implementación:** el corazón de la feature no es la página, es la **resolución blanda** de AD-18 — la Colección declara sus miembros por slug y `publicado.ts` los intersecta con el conjunto publicable, de modo que mover una Cita a `_revision/` no rompe nada. Empieza por ahí. La Colección es la primera superficie pública nueva desde el Kit, así que esta épica es también donde aterriza el dueño único de AD-17: una sola declaración de la que derivan el sitemap, el `noindex` y el barrido de accesibilidad. La presentación reutiliza `src/components/TarjetaDeCita.astro` y no compone la suya (AD-19). El umbral mínimo sale de curar las tres o cuatro primeras Colecciones, no de decidirlo antes (§14.4 del PRD); mientras tanto vive en `umbrales.ts` con un valor provisional declarado como tal.

### Épica 13: El canal deja de exigir presencia diaria

Héctor compone varias jornadas de material de una sentada, y el sistema produce piezas que reúnen varias Citas o anuncian una Colección. Olvidar un día deja de ser perder ese día.

**FRs covered:** FR-29, FR-30, FR-32.
**Notas de implementación:** las tres viven en `tools/` por AD-15 y su salida **no se versiona**; lo versionado es la decisión, que es la fijación de jornada. FR-29 **no necesita mecanismo nuevo**: `corpus/portada.json` ya tiene fijaciones y `citaDelDia.ts` ya les da prioridad sobre la rotación desde la v1, así que el lote fija jornadas ahí y la exigencia de que «lo anticipado sustituya a lo de la jornada» se cumple sola. No construyas un segundo calendario — es la trampa que `RECONCILIACION.md` §2 nombra. El lote es una superficie interna nueva y hereda el dueño único de AD-17 de la Épica 12. Las piezas consumen `src/lib/tramos.ts` (AD-8) y excluyen las Citas que no admiten Imagen. FR-31 (pieza en movimiento) **no entra en esta épica** a propósito: su puerta es SM-8 y AD-15 la deja aislada en `tools/` para que recortarla no toque nada de lo de aquí.

### Épica 14: El ingreso tiene interruptor antes de tener ingreso

El visitante que quiere sostener el sitio encuentra cómo, sin que se le pida. Y cada Modelo de Ingreso futuro nace con un interruptor versionado, auditable y reversible por `git revert`, en lugar de con un disparador automático que sabe encenderse y no sabe apagarse.

**FRs covered:** FR-33, FR-34.
**UX-DR:** UX-DR35, UX-DR36.
**Notas de implementación:** construye el dueño del estado (AD-21) aunque de momento solo haya un Modelo — con dos ya es tarde. Las donaciones se pueden encender el mismo día que se cierren LC-1…LC-4: ese es su umbral, y su coste de implementación es un enlace. Ningún guion de tercero (AD-20), y el armazón compartido no aloja ningún Modelo, así que la invitación vive en la portada, los resultados de búsqueda y la 404 — nunca en la Página de Cita ni en la de Colección. Los cuatro Umbrales de Activación entran en `umbrales.ts` (AD-9). La herramienta que consulta el receptor **informa y no decide**, y el build no lee el plano de medición jamás (AD-14): dos construcciones del mismo commit tienen que dar el mismo sitio.

---

## Epic 11: Un Corpus con volumen defendible

El Corpus pasa de 38 Citas a un volumen donde hay cola larga que capturar y Temas que superan su umbral, sin que baje el porcentaje de Procedencia verificada.

**Punto de partida medido (2026-08-18):** 38 Citas, 12 Autores, 8 Temas. Solo `la-vida` (17) y `el-saber` (15) superan `MIN_CITAS_POR_TEMA`. Por debajo: `la-virtud` 11, `el-tiempo` 8, `la-palabra` 7, `la-adversidad` 6, `la-libertad` 5, `la-amistad` 1. Tradición: 9 peninsulares, 2 latinoamericanos, 1 otra — un 16,7 % frente al suelo del 40 %.

**Historias 11.5 y 11.6 (añadidas aquí el 2026-10-05):** no salieron del PRD sino de la primera sesión de sembrado real de la 11.4, y se especificaron directamente como spec en `implementation-artifacts/` (`spec-11-5-el-documento-ilegible-no-siembra.md`, `spec-11-6-documentar-una-cita-publicada.md`). Las dos se construyeron el 2026-08-21 y están `done`. Ninguna produce FR nuevos: son dos salvaguardas más de la misma tubería —una puerta de legibilidad entre recuperar y proponer, y la orden que documenta una Cita anterior a la v3 contra su documento—. Se escriben aquí tal como se construyeron, para que el tablero las encuentre; no son planificación nueva.

### Story 11.1: La Fuente se recupera, y su metadato sale del documento

As a quien siembra el Corpus —el editor o un agente—,
I want que la obra, el año y la licencia salgan del documento recuperado,
So that nadie pueda teclear una Procedencia que la Fuente no dice.

**Acceptance Criteria:**

**Given** una URL perteneciente al conjunto cerrado de Fuentes admitidas
**When** lanzo la recuperación
**Then** el documento se descarga y se versiona como texto plano, con el marcado retirado, en `corpus/fuentes/{id-de-fuente}--{slug-de-obra}.txt`

**Given** una URL que no pertenece al conjunto de Fuentes admitidas
**When** la paso a la recuperación
**Then** no produce candidatas

**Given** la obra, el año y la licencia de una candidata
**When** se componen
**Then** salen del documento recuperado
**And** no existe forma de pasarlos por argumento a la orden

**Given** una obra cuyo documento ya está versionado
**When** la recupero otra vez
**Then** se reutiliza el documento existente en lugar de añadir otra copia

**Given** la petición de red
**When** reviso dónde vive
**Then** está en la capa exterior de `tools/`, y `tools/lib/`, `src/lib/`, el esquema y las páginas no hacen ninguna
**And** ningún paso del build descarga nada

### Story 11.2: Ninguna Cita se publica sin aparecer en su documento

As a lector que confía en la atribución antes de repetirla en público,
I want que el texto publicado esté verificado contra la edición de la que dice salir,
So that la Procedencia sea comprobada y no simplemente declarada.

**Acceptance Criteria:**

**Given** una Cita en `corpus/citas/` que referencia su documento de Fuente
**When** se construye el sitio
**Then** el cotejo comprueba que su texto aparezca literalmente en ese documento

**Given** una Cita cuyo texto no se localiza en su documento
**When** se construye el sitio
**Then** el build falla con la ruta del fichero y la regla incumplida
**And** no se degrada a aviso

**Given** una Cita que difiere de su edición en un acento o en un signo de puntuación
**When** corre el cotejo
**Then** falla — la comparación colapsa espacios y nada más, y no pasa por `normalizar.ts`

**Given** que las reglas de admisión se cablean desde `src/lib/admision.ts`, que por AD-5 no lee el sistema de ficheros
**When** se implementa el cotejo
**Then** vive fuera de `src/lib/`
**And** ningún camino de publicación lo esquiva

**Given** una Cita escrita a mano directamente en `corpus/citas/`, sin pasar por el sembrado
**When** se construye el sitio
**Then** pasa por el cotejo igual que una sembrada

### Story 11.3: El objetivo de cada sesión sale del hueco, no del criterio

As a agente que siembra sin supervisión,
I want una política determinista que diga a qué Tema y a qué Autor dedicar la sesión,
So that el sembrado desatendido no derive hacia lo que resulta más fácil de encontrar.

**Acceptance Criteria:**

**Given** un estado del Corpus
**When** pido el objetivo de la sesión
**Then** la política devuelve el mismo objetivo para el mismo estado
**And** declara de qué hueco sale

**Given** una proporción de Autores de tradición latinoamericana por debajo de `SUELO_TRADICION_LATINOAMERICANA`
**When** la política elige objetivo
**Then** prioriza cerrar ese hueco

**Given** que el editor quiere dedicar la sesión a otro objetivo
**When** anula la propuesta
**Then** la anulación queda registrada

**Given** los Temas por debajo del umbral de publicación
**When** consulto la vista de huecos
**Then** veo cuántas Citas le faltan a cada uno

### Story 11.4: El Corpus alcanza volumen defendible

As a visitante que llega desde las cuentas de Sabiduría de Bolsillo,
I want que el Tema que pulso en la portada tenga contenido detrás,
So that no aterrice en una página vacía y me vaya para no volver.

**Nota de ejecución:** es la única historia de la v3 que no ejecuta un agente de desarrollo — corre la tubería que construyen 11.1 a 11.3 y se cierra por resultado medido, a lo largo de varias sesiones.

**Acceptance Criteria:**

**Given** los seis Temas por debajo de `MIN_CITAS_POR_TEMA` al abrir la épica
**When** la cierro
**Then** cada Tema que la portada anuncia tiene al menos 15 Citas publicadas
**And** `tools/huecos.ts` no reporta ninguno por debajo del umbral

**Given** SM-C1 medido con `tools/auditoria.ts` antes de empezar
**When** lo vuelvo a medir al cerrar
**Then** el porcentaje de Citas publicadas con Procedencia completa no ha bajado

**Given** la proporción de tradición latinoamericana, hoy en el 16,7 %
**When** cierro la épica
**Then** alcanza o supera el suelo del 40 %

**Given** las sesiones ya corridas
**When** registro su resultado
**Then** queda declarada la cadencia de sembrado que §14.3 del PRD dejaba abierta
**And** sale de sesiones medidas, no de una estimación

**Given** una sesión en la que SM-C1 baja mientras el número de Citas sube
**When** la reviso
**Then** se considera fallida aunque haya sumado Citas
**And** las Citas sin Procedencia completa se mueven a `corpus/_revision/`

### Story 11.5: Un documento ilegible no siembra

As a quien revisa candidatas —el editor o un agente—,
I want que un documento con el OCR roto no proponga ninguna candidata, y que uno sano con párrafos rotos proponga solo lo sano,
So that una Cita mutilada no llegue a publicarse bajo la firma de su Autor, con la Procedencia correcta y el cotejo en verde.

**Nota de origen:** la primera sesión de sembrado real recuperó el *Apéndice a Mis últimas tradiciones peruanas* de Ricardo Palma y extrajo 61 candidatas con texto corrupto —«enseiia», «For- mabalo», «6» donde va «ó»— que el cotejo de la 11.2 daba por buenas, porque la basura está literal en su documento. Solo las paró que una persona las leyera una a una. Construida el 2026-08-21; la señal de puntuación rota se le añadió el 2026-08-28, medida contra las 1.632 Citas publicadas para que no mordiera ninguna.

**Acceptance Criteria:**

**Given** un documento con el OCR roto —el *Apéndice* de Palma: 82 de 2.292 palabras con señales de OCR, un 3,6 % sobre el 2 % admitido—
**When** lo extraigo
**Then** ninguna candidata llega a `corpus/_revision/`
**And** la orden sale con código distinto de 0 y dice por qué, con la medida y las palabras que la dispararon delante

**Given** un documento sano con algunos párrafos rotos
**When** lo extraigo
**Then** las candidatas afectadas se descartan y se cuentan en el informe, junto a las descartadas por longitud y por idioma
**And** las sanas entran

**Given** un texto con arcaísmos, latín, nombres propios extranjeros, poesía con guiones y elisiones, cursiva marcada con guiones bajos o un suplemento del traductor entre ángulos
**When** lo extraigo
**Then** no se descarta nada por legibilidad: la señal es de OCR, no de vocabulario
**And** los documentos reales del Corpus pasan con cero descartes, y el peor no llega a la mitad del umbral

**Given** cualquier documento
**When** la puerta actúa
**Then** no se modifica ni un carácter de ningún texto: la medida devuelve números, nunca texto corregido

**Given** la puerta
**When** reviso dónde vive
**Then** está en la extracción, entre recuperar y proponer, y no en el cotejo de la 11.2, que no se relaja
**And** mide sin diccionario ni servicio externo, y su umbral vive en `src/lib/umbrales.ts` declarado como provisional

**Given** la puntuación rota del escaneo —un punto intruso a mitad de frase con cuatro letras o más delante, o un espacio antes de coma, punto o punto y coma—
**When** se mide contra las Citas ya publicadas
**Then** ninguna publicada queda mordida, y la señal actúa en la extracción y en la aprobación
**And** deja pasar las abreviaturas, los puntos suspensivos con espacio delante propios del XIX y el punto seguido que abre en mayúscula

**Given** una palabra rota que solo un léxico distinguiría —«indivicluo», «porpue», «laspocas»—
**When** pasa la puerta
**Then** sigue pasando, y queda escrito en `deferred-work.md`: el léxico es una decisión de producto, no del bucle

### Story 11.6: Documentar una Cita publicada

As a editor que coteja las Citas anteriores a la v3,
I want documentar una Cita ya publicada contra un documento recuperado, restituir su texto literal cuando la edición dice lo mismo con otros signos, y retirar con motivo la que no supera el cotejo,
So that el censo de pendientes de cotejo mengüe sin editar un `.md` a mano, y ninguna Cita salga del censo sin haberse cotejado.

**Nota de origen:** era el último criterio abierto de la 11.4 —el censo de 38 no podía menguar porque no había orden que documentara una Cita publicada—, y al cotejar a Gracián contra su edición de 1647 aparecieron dos Citas publicadas desde la v1 que no son suyas. Se construyó el 2026-08-21 como `npm run documentar`, y el censo pasó de 38 a 29 ese mismo día: dos retiradas, tres corregidas contra su edición, cuatro documentadas. El cotejo de Autor (FR-23) se le añadió el 2026-08-23. Lo que no puede saldar, y queda dicho: las cinco de Séneca, porque la Fuente aloja otra traducción y para un autor traducido no existe «la edición».

**Acceptance Criteria:**

**Given** una Cita publicada cuyo texto aparece literal en un documento ya recuperado
**When** la documento con `npm run documentar -- <slug> corpus/fuentes/<documento>.txt`
**Then** se escriben su `fuente` y su Procedencia derivadas del documento —obra y año salen de la declaración; no hay banderas `--obra` ni `--año`—
**And** sale del censo en el mismo gesto, el fichero del censo conserva su cabecera y sus comentarios, y el build sigue en verde

**Given** una Cita cuyo texto no aparece en el documento
**When** intento documentarla
**Then** se rechaza con código 1 nombrando el documento y las dos salidas —corregir contra la edición o retirar—
**And** no se toca ni la Cita ni el censo

**Given** una Cita cuya edición dice lo mismo con otros signos
**When** la documento con `--texto "<el texto literal de la edición>"`
**Then** el texto nuevo tiene que aparecer literal en el documento y parecerse al publicado por encima de `MIN_PARECIDO_PARA_CORREGIR` (0,85 sobre la forma canónica de AD-3)
**And** se dice el antes y el después antes de escribir, y el slug no se recalcula (AD-4)

**Given** `--texto` con algo que el documento no dice, o con otro pasaje del mismo documento
**When** intento documentar
**Then** se rechaza con código 1 —nombrando el parecido y el umbral en el segundo caso—
**And** no quedan tocados ni la Cita, ni el censo, ni el fichero

**Given** una Cita que no supera el cotejo
**When** la retiro con `--retirar <slug> "<motivo>"`
**Then** el fichero se mueve a `corpus/_revision/` y sale del censo si estaba; no se borra nada (AD-2)
**And** sin motivo la orden se niega con código 2

**Given** una Cita que ya declara `fuente`, un slug con errata, una Cita en revisión, o un documento que no está o no tiene la forma de la recuperación
**When** intento documentar
**Then** se rechaza con código 1 nombrando lo que falla

**Given** una Cita documentada cuya línea se repone a mano en el censo
**When** se construye el sitio
**Then** el build falla: documentar y salir del censo van juntos porque el estado intermedio no puede existir

**Given** un documento firmado por un Autor distinto del que la Cita declara
**When** intento documentarla
**Then** se rechaza con código 1 poniendo delante las dos partes, y la Cita sigue censada como no verificada
**And** un documento sin autor declarado, o firmado «Anónimo», documenta igual y el parte dice «Autor: sin cotejar»

---

## Epic 12: La cola larga tiene dónde aterrizar

Un visitante que busca «frases cortas para reflexionar» encuentra una página propia con esas Citas escogidas, y el editor crea una Colección sin tocar una sola Cita. Al terminar, retirar una Cita del Corpus la saca de todas sus Colecciones sin romper el build y sin dejar un enlace roto.

### Story 12.1: Una superficie declara en un solo sitio si es publicable

As a visitante que busca en el sitio,
I want que los resultados sean Citas, Autores y Temas y no páginas internas,
So that la búsqueda no me devuelva ruido.

**Acceptance Criteria:**

**Given** que hoy `/404.html` y `/buscar.html` figuran en el índice de Pagefind pese a declarar `noIndexar`
**When** aplico la declaración única de superficie publicable
**Then** ninguna superficie que no sea del producto aparece en el índice interno
**And** una búsqueda por un término contenido en una Cita no devuelve la página 404 ni la de búsqueda

**Given** una superficie nueva que no es del producto
**When** la declaro no publicable en un solo sitio
**Then** de esa declaración derivan su exclusión del sitemap, su `noindex` y su exclusión del índice interno
**And** no hay que tocar `astro.config.mjs` ni recordar un segundo fichero

**Given** una superficie nueva declarada pública
**When** corre el barrido automatizado de accesibilidad y móvil
**Then** entra en él sin haberse añadido a ninguna lista

**Given** el conjunto publicable
**When** enumero superficies
**Then** publicable y alcanzable son el mismo conjunto, y ninguna superficie publicada queda huérfana

### Story 12.2: La Colección declara sus miembros, y la lista es blanda

As a editor,
I want crear una Colección sin tocar ninguna Cita,
So that añadir una agrupación no sea editar decenas de ficheros.

**Acceptance Criteria:**

**Given** un fichero en `corpus/colecciones/{slug}.yml` que declara sus miembros por slug
**When** se construye el sitio
**Then** la pertenencia se resuelve intersectando esa lista con el conjunto publicable
**And** ninguna Cita ha sido modificada para pertenecer a la Colección

**Given** una Cita miembro que muevo a `corpus/_revision/`
**When** se construye el sitio
**Then** el build no falla
**And** la Cita sale de todas sus Colecciones sin dejar hueco ni enlace roto

**Given** una Colección cuyo recuento resuelto cae por debajo del umbral mínimo
**When** se construye el sitio
**Then** desaparece a la vez de la página, del sitemap, de los chips y del descubrimiento

**Given** el umbral mínimo de Colección, que el PRD §14.4 deja abierto a propósito
**When** se implementa
**Then** vive en `src/lib/umbrales.ts` con un valor provisional declarado como tal, nunca como literal suelto en otro módulo

**Given** una Cita que pertenece a varias Colecciones
**When** consulto sus Temas y su Autor
**Then** no han cambiado

### Story 12.3: La Página de Colección, sin canibalizar a la Cita

As a Lucía, que busca «frases cortas para reflexionar»,
I want una página que reúna justo esas Citas,
So that no tenga que rebuscar por Tema y por Autor hasta dar con ellas.

**Acceptance Criteria:**

**Given** una Colección publicada
**When** la visito en `/coleccion/{slug}`
**Then** presenta sus Citas con `src/components/TarjetaDeCita.astro`, el mismo componente que usan los listados de Tema y de Autor
**And** no compone una presentación propia

**Given** una Cita presente en varias Colecciones
**When** un rastreador recorre el sitio
**Then** la canónica de esa Cita sigue siendo su Página de Cita
**And** no se genera contenido duplicado indexable

**Given** una Colección publicada
**When** parto de la portada
**Then** es alcanzable por enlaces internos en un número acotado de saltos
**And** su URL es legible, en español y sin identificadores opacos

**Given** el nombre de la Colección
**When** se compone la página
**Then** va en Source Serif, como los nombres de Autor y de Tema, y el resto de la página en Inter

**Given** el texto editorial de la Colección
**When** lo leo
**Then** describe el criterio de la Colección y no adjetiva ni comenta ninguna Cita

**Given** la Página de Colección
**When** corre el barrido automatizado
**Then** cumple WCAG 2.1 AA y es plenamente utilizable en un viewport de 360 px
**And** lo hace sin haberse añadido a ninguna lista aparte

### Story 12.4: Curar una Colección desde la herramienta

As a editor,
I want crear una Colección, asignarle Citas y ver cuánto le falta para publicarse,
So that pueda curar sin editar YAML a mano ni adivinar si ya está publicada.

**Acceptance Criteria:**

**Given** la herramienta de curación
**When** creo una Colección con su criterio y su nombre y le asigno Citas
**Then** solo admite Citas en estado `publicada`

**Given** una Colección por debajo de su umbral
**When** consulto su estado
**Then** veo cuántas Citas le faltan para alcanzarlo, como en la vista de huecos

**Given** una Colección publicada
**When** la despublico
**Then** ninguna Cita se borra ni cambia de estado

**Given** que la herramienta es comodidad y no puerta
**When** edito un fichero de Colección a mano saltándome la herramienta
**Then** el esquema aplica las mismas reglas y rompe el build si se incumplen

---

## Epic 13: El canal deja de exigir presencia diaria

Héctor compone varias jornadas de material de una sola sentada, y el sistema produce piezas que reúnen varias Citas o anuncian una Colección. Olvidar un día deja de ser perder ese día.

### Story 13.1: Componer varias jornadas de una sentada

As a Héctor, que lleva las cuentas además de editar,
I want dejar preparadas varias jornadas de material a la vez,
So that una semana ocupada no sea una semana sin publicar.

**Acceptance Criteria:**

**Given** el lote de composición
**When** compongo varias jornadas por adelantado
**Then** fija esas jornadas en `corpus/portada.json`, el mismo mecanismo que ya prioriza la Cita del Día desde la v1
**And** no se construye un segundo calendario ni un desempate entre ambos

**Given** una jornada con material compuesto por adelantado
**When** llega esa jornada
**Then** lo anticipado es indistinguible de lo que compondría el día, porque ambos derivan de la misma fijación

**Given** una jornada ya compuesta cuya Cita del Día cambio
**When** vuelvo a componer
**Then** su material se recompone en lugar de quedar obsoleto

**Given** un lote dejado a medias
**When** lo retomo otro día
**Then** continúa donde lo dejé

**Given** la superficie del lote
**When** se construye el sitio
**Then** no es indexable ni alcanzable desde la navegación pública, heredando la declaración única de la Story 12.1

**Given** la salida del lote
**When** reviso el repositorio
**Then** no está versionada; lo versionado es la fijación de jornada

### Story 13.2: Una pieza que reúne varias Citas

As a Héctor,
I want publicar una pieza que reúna varias Citas,
So that una jornada rinda más de un formato sin más trabajo.

**Acceptance Criteria:**

**Given** una pieza de varias Citas
**When** la compongo
**Then** cada Cita conserva su atribución visible y ninguna aparece sin Autor

**Given** una Cita que supera `MAX_CARACTERES_IMAGEN`
**When** selecciono Citas para la pieza
**Then** queda excluida, igual que no admite Imagen de Cita

**Given** la pieza compuesta
**When** declara su destino
**Then** lleva un único enlace, marcado por red

**Given** el texto de cada Cita de la pieza
**When** la plantilla lo compone
**Then** no se altera, ni se recorta, ni se abrevia
**And** los tamaños salen de `src/lib/tramos.ts`, no de valores escritos en la plantilla

### Story 13.3: Una Colección anuncia su propia pieza

As a Héctor,
I want que una Colección publicada produzca su propia pieza,
So that pueda anunciar la agrupación entera y no una Cita suelta de ella.

**Acceptance Criteria:**

**Given** una Colección publicada
**When** compongo su pieza
**Then** el enlace de destino apunta a la Página de Colección, no a una Cita

**Given** una Colección por debajo de su umbral
**When** intento componer su pieza
**Then** no se produce: no se anuncia lo que no está publicado

**Given** la pieza de Colección
**When** la reviso
**Then** respeta las mismas reglas de atribución y de tramos que la pieza de varias Citas

---

## Epic 14: El ingreso tiene interruptor antes de tener ingreso

El visitante que quiere sostener el sitio encuentra cómo, sin que se le pida. Y cada Modelo de Ingreso futuro nace con un interruptor versionado, auditable y reversible, en lugar de con un disparador automático que sabe encenderse y no sabe apagarse.

### Story 14.1: Encender un Modelo de Ingreso es un commit

As a Héctor,
I want que activar o desactivar un Modelo de Ingreso sea un cambio visible y reversible,
So that no tenga un interruptor que sepa encenderse y no sepa apagarse.

**Acceptance Criteria:**

**Given** el estado de un Modelo de Ingreso
**When** lo consulto
**Then** es configuración versionada en el repositorio: encenderlo es un diff y `git revert` lo apaga

**Given** un Umbral de Activación cruzado en el receptor
**When** corre el flujo diario de CI
**Then** avisa de que se ha cruzado
**And** ningún Modelo se enciende por su cuenta

**Given** el build
**When** se construye el sitio
**Then** ningún byte de `dist/` deriva del plano de medición
**And** dos construcciones del mismo commit dan el mismo sitio, también con el receptor apagado

**Given** los cuatro Umbrales de Activación
**When** se implementan
**Then** viven en `src/lib/umbrales.ts` y en ningún otro sitio

**Given** todos los Modelos apagados
**When** recorro cualquier superficie del sitio
**Then** no hay hueco reservado, espacio en blanco ni marcador: un Modelo apagado es invisible, no latente

**Given** el estado de cada Modelo y la cifra contra la que se mide
**When** los consulto
**Then** los obtengo sin exportar datos, igual que la salud del Corpus

### Story 14.2: El visitante que quiere sostener el sitio encuentra cómo

As a visitante al que el sitio le ha resuelto algo,
I want poder apoyarlo sin que me lo pidan,
So that exista la opción sin que se convierta en un peaje.

**Acceptance Criteria:**

**Given** la Página de Cita y la Página de Colección
**When** las recorro con las donaciones encendidas
**Then** la invitación no aparece en ninguna de las dos ni interrumpe ninguna lectura

**Given** las superficies que sí la admiten —portada, resultados de búsqueda y página 404—
**When** la invitación aparece
**Then** lo hace fuera del flujo de lectura
**And** el armazón compartido no la aloja

**Given** la invitación
**When** se sirve la página
**Then** no introduce ningún guion de tercero
**And** `MAX_BYTES_DE_GUION` se sigue cumpliendo

**Given** que ignoro o rechazo la invitación
**When** sigo usando el sitio
**Then** ninguna funcionalidad se degrada

**Given** el Umbral de Activación de las donaciones
**When** compruebo si puede encenderse
**Then** basta con que LC-1…LC-4 estén verificadas

---

## Epic 15: Meta de Corpus

El bucle autónomo vuelve a tener de qué tirar después de cumplir la 11.4: el Corpus pasa de 252 Citas, 8 Temas, 17 Autores y ninguna Colección a mil Citas, veinticuatro Temas, treinta y cinco Autores y doce Colecciones, con el Autor más representado por debajo del 15 % del Corpus. No construye tubería: explota la que dejaron las Épicas 9, 11, 12 y 13.

**FRs covered:** ninguno nuevo. Ejercita FR-23, FR-24 y FR-25 —la tubería de sembrado de la Épica 11—, FR-6 —la Página de Tema con su umbral— y FR-26, FR-27 —la Colección y su curación—.
**Condiciones cubiertas:** ninguna nueva; amplía lo que la 11.4 dejó medido.
**Notas de implementación:** **esta épica no salió de un PRD** (añadida aquí el 2026-10-05, con la épica ya cerrada). Nació el 2026-08-24 de que los criterios medibles de la 11.4 quedaron cumplidos —ningún Tema bajo el umbral, tradición latinoamericana en el 41,2 %— y `npm run huecos` cerraba con «No hay hueco que cerrar», con 59 documentos de Fuente y 489.690 palabras versionadas sin exprimir. La decidió Héctor ese día y su protocolo es `implementation-artifacts/LOOP-PROTOCOL-V4.md`. La Meta son cuatro números y un techo en `src/lib/umbrales.ts` (AD-9), cruzados con el estado por `src/lib/meta.ts`, su único dueño; va aparte de `objetivo.ts` porque el suelo de publicación es una regla del producto y la meta, una ambición. El orden de las historias 15.2 a 15.6 es el escalonado de `objetivoDeMeta` —por coste y no por importancia: Colecciones, concentración, Autores, Temas, volumen— y el bucle no elige tramo: lee el que la política declara. Lo que el bucle no decidió: no bajó ningún umbral para alcanzar una meta, no inventó Fuente ni Colecciones de relleno, y a quién se admite siguió reservado a Héctor hasta que lo delegó el 2026-08-26. **Cerrada el 2026-08-27:** `npm run huecos` declaró «Meta de Corpus alcanzada» por su cuenta —1.632 Citas, 24 Temas, 35 Autores, 16 Colecciones— con el Autor más representado en el 11,1 % y ningún umbral bajado. La 19.5 añadió después la cobertura por época a lo que «alcanzada» significa.

### Story 15.1: El listón agresivo tiene nombre, y lo cruza un solo módulo

As a bucle que deriva su trabajo del hueco,
I want que la Meta de Corpus tenga cifras con dueño y que la política declare a qué tramo se dedica la sesión,
So that cuando el suelo de publicación esté cumplido siga habiendo trabajo derivable sin que nadie lo invente.

**Nota de ejecución:** construida y cerrada el 2026-08-24, sin tocar una línea de las 96 pruebas de la 11.3.

**Acceptance Criteria:**

**Given** las cuatro cifras de la Meta —1.000 Citas, 24 Temas, 35 Autores, 12 Colecciones— y el techo de concentración del 15 %
**When** reviso dónde viven
**Then** están en `src/lib/umbrales.ts` y en ningún otro sitio (AD-9), aparte de los umbrales de publicación y documentadas como ambición y no como umbral
**And** las cruza con el estado `src/lib/meta.ts`, su único dueño, sin tocar `objetivo.ts`

**Given** el estado del Corpus
**When** `npm run huecos` lo informa
**Then** cierra con un bloque «Meta de Corpus» detrás del «Objetivo de la sesión», con cada tramo como alcanzado, meta y faltan
**And** `faltan` nunca es negativo, y los Temas y las Colecciones se cuentan publicados —restando los que `verHuecos` dejó por debajo de su umbral— sin volver a aplicar el umbral

**Given** el escalonado
**When** `objetivoDeMeta` elige tramo
**Then** va por coste —Colecciones, concentración, Autores, Temas, volumen— y declara «alcanzada» cuando los cuatro tramos están y el reparto no excede el techo
**And** cada objetivo declara de qué tramo sale, con la cifra alcanzada y la meta delante, y el mismo estado da el mismo texto palabra por palabra

**Given** el techo de concentración
**When** un Autor pasa del 15 % del Corpus
**Then** el hueco se mide en Citas de otros Autores que faltan para bajarlo —diluyendo, nunca despublicando—
**And** el techo se compara con la razón exacta en enteros, no con el porcentaje redondeado

**Given** la regla de la Historia 9.3
**When** el informe habla del tramo de concentración
**Then** dice «el Autor más representado» y jamás su nombre; el slug viaja solo en el `--json`
**And** lo único que el informe entrecomilla sigue siendo nombres de Tema

**Given** el suelo de publicación
**When** `objetivoDeSesion` declara un hueco
**Then** ese hueco va antes que cualquier tramo de la Meta

### Story 15.2: Doce Colecciones sobre lo ya publicado

As a visitante que llega buscando un criterio y no un asunto,
I want doce Páginas de Colección publicadas, curadas sobre Citas ya publicadas,
So that el sitio gane doce superficies indexables sin sembrar una Cita ni correr riesgo editorial.

**Nota de ejecución:** es el tramo más barato de la Meta y el que llevaba dos épicas construido sin estrenar. Cerrada el 2026-08-24: 12 de 12 en dos sesiones.

**Acceptance Criteria:**

**Given** las Épicas 12 y 13 construidas y `corpus/colecciones/` con su `.gitkeep` y nada más
**When** se curan las Colecciones con `npm run coleccion`
**Then** no se siembra ninguna Cita ni se recupera ningún documento
**And** cada Colección es un criterio editorial que merece página, con nombre y criterio, y ninguna es relleno para llegar a doce

**Given** una Colección curada
**When** se publica
**Then** alcanza `MIN_CITAS_POR_COLECCION` con miembros resueltos contra el conjunto publicable (AD-18)
**And** puede solaparse con un Tema: un Tema es un asunto y una Colección es un criterio, y de no canibalizar a la Cita se ocupa la canónica (12.3)

**Given** el tramo cerrado
**When** se mide
**Then** hay 12 Colecciones de 12, el sitio pasa de 277 a 289 páginas, 204 de las 252 Citas (81 %) pertenecen a alguna, y diez de las doce mezclan Autores
**And** `objetivoDeMeta` pasa por su cuenta al tramo siguiente, declarando cuántas Citas de otros Autores faltan

**Given** las Páginas de Colección desplegadas
**When** se verifican en vivo
**Then** responden 200, están en el sitemap y la canónica de cada una apunta a sí misma

**Given** que la siembra avanza después de curarlas
**When** se revisan contra el Corpus que creció debajo
**Then** los miembros se vuelven a curar —las dieciséis, de 297 a 390 miembros— porque son listas escritas a mano que no se actualizan solas

### Story 15.3: Ningún Autor pasa del techo de concentración

As a lector que no quiere la antología de un solo Autor,
I want que ningún Autor aporte más del 15 % de las Citas del Corpus,
So that el volumen no se alcance por el camino fácil de minar más al que más rinde.

**Nota de ejecución:** cerrada el 2026-08-25. Se cerró diluyendo, sin despublicar ninguna Cita, como manda la política.

**Acceptance Criteria:**

**Given** Gracián con 114 de 252 Citas —el 45,2 %— al abrir la épica
**When** se cierra el tramo
**Then** el Autor más representado queda por debajo del techo: 114 sobre 761, el 14,98 %
**And** ese Autor conserva exactamente las 114 que tenía

**Given** una sesión de siembra con el techo cerca
**When** se planea el reparto
**Then** se calcula con la aritmética antes de sembrar, sobre el Corpus final, para que ningún Autor cruce el techo al llegar
**And** no se apoya en el redondeo

**Given** el techo vigilando solo al primero
**When** once sesiones diluyendo al más representado llevaron al segundo a seis Citas del techo sin aviso
**Then** la política cuenta cuántos Autores pasan del techo, no solo si alguno pasa, y las Citas que faltan salen del Autor que más dilución exige
**And** el informe dice cuántas Citas propias caben todavía bajo el techo, sin nombrar a nadie

**Given** la regla de que a quién se admite no lo decide el bucle
**When** el tramo parece bloqueado por falta de Autores
**Then** ampliar un Autor ya representado con otra de sus obras es trabajo del bucle, y así entraron los documentos que lo cerraron
**And** lo que sigue reservado es admitir Autores nuevos, que es la 15.4

**Given** documentos recuperados para diluir
**When** no declaran Autor, declaran dos firmantes, o no dan ninguna Cita
**Then** no se siembran, y el que no da Cita se retira

### Story 15.4: El censo llega a treinta y cinco Autores

As a visitante que busca a un Autor concreto,
I want un censo de treinta y cinco Autores que publican,
So that el techo de concentración sea sostenible y el Corpus no sea el de nadie.

**Nota de ejecución:** el tramo estuvo reservado a Héctor —a quién se admite era lo único que el producto no delegaba— y lo delegó el 2026-08-26, con lo que pasó de ser una puerta a ser un procedimiento. Puesta el 2026-08-27: 35 de 35, sin bajar ningún umbral.

**Acceptance Criteria:**

**Given** un candidato a Autor
**When** se evalúa antes de recuperar nada
**Then** murió en 1946 o antes, y si es traducción la edición declara año; sin año declarado no entra, porque no hay con qué respaldar el `estadoDerechos` de cada Cita
**And** se elige por género medido —prosa doctrinal y aforística— y no por fama

**Given** la Fuente
**When** se buscan candidatos
**Then** se lista la categoría del catálogo —ensayos por Autor, o materia en Gutenberg—, no palabras del título ni nombres pensados
**And** se ordena por tamaño de cada obra, nunca por la suma del Autor; los dos catálogos en castellano se contaron enteros, 144 y 143 firmas admisibles

**Given** la Meta
**When** cuenta Autores
**Then** cuenta los que publican, no los declarados: admitir es recuperar, versionar, extraer, leer y publicar
**And** una firma admitida que no publica no se queda: en la última tirada entraron cinco firmas y se retiraron cinco obras que no daban dos Citas

**Given** el nombre del Autor
**When** se crea su ficha
**Then** se copia del documento, no se completa: `extraer` se niega ante unas iniciales desplegadas
**And** el suelo del 40 % de tradición latinoamericana se mide sobre los admitidos y se respeta

**Given** el tramo cerrado
**When** se mide
**Then** 35 de 35, sin bajar ningún umbral y con el techo respetado

### Story 15.5: Veinticuatro Temas publicados

As a visitante que llega por una consulta con forma de asunto,
I want veinticuatro Páginas de Tema publicadas con sus quince Citas cada una,
So that la red de cola larga del sitio triplique su anchura.

**Nota de ejecución:** puesta el 2026-08-27, 24 de 24, sin bajar ningún umbral. Es la historia que cerró la épica: `npm run huecos` declaró «Meta de Corpus alcanzada» ese día.

**Acceptance Criteria:**

**Given** un asunto candidato a Tema
**When** se decide si abrirlo
**Then** se hacen tres preguntas en este orden: si otro Tema publicado ya posee la mitad de sus Citas, es ese Tema; cuántos sentidos tiene la palabra que lo cuenta; y solo entonces si hay cantera, medida con `npm run asuntos -- --cantera` sobre las candidatas y no sobre lo publicado
**And** un Tema nuevo necesita quince Citas sobre un asunto que ninguno de los existentes cubra, y `MIN_CITAS_POR_TEMA` no se toca

**Given** la cuenta por asunto
**When** se mide
**Then** vive en `tools/asuntos.ts` y no en un grep distinto cada sesión, con los defectos conocidos catalogados en la cabecera del módulo —razón/corazón, ira/irá, error/terror—
**And** una sonda nueva se escribe mirando ese catálogo

**Given** un Tema que puede salir de Citas ya publicadas
**When** se abre con `tema asignar` y `tema quitar`
**Then** no se despublica nada, y se dice que organiza el Corpus en vez de agrandarlo

**Given** el Tema «El error» publicado
**When** cuatro pruebas E2E del 404 y de la búsqueda vacía caen por casar su nombre con un patrón de jerga técnica
**Then** no se renombra el Tema para devolver el verde: se aprieta el alcance de la aserción a la prosa de la página, con el razonamiento escrito dentro de la prueba

**Given** el tramo cerrado
**When** se mide
**Then** 24 de 24, ningún Tema por debajo del umbral, y los dos últimos —«el deber» y «el error»— salieron solo después de arreglar sus familias de palabras

### Story 15.6: Mil Citas publicadas

As a visitante que busca una Cita concreta,
I want mil Citas publicadas con Procedencia cotejada,
So that la cola larga tenga volumen y el sitio no sea la antología de un libro.

**Nota de ejecución:** puesta el 2026-08-26 —1.000 de 1.000, 73.ª sesión del bucle— con el techo respetado en todo momento: el más representado en 149, el 14,9 %. El bucle siguió sembrando hasta las 1.632 con las que se cerró la épica.

**Acceptance Criteria:**

**Given** una Cita que se publica
**When** pasa por la tubería
**Then** tiene documento versionado, pasa el cotejo literal de la 11.2 y la puerta de legibilidad de la 11.5, y su Autor concuerda con el que declara el documento (FR-23)
**And** no se inventa Fuente ni se baja ningún umbral

**Given** las tres canteras con obra extraíble y el techo del 15 %
**When** se reparten las últimas treinta y tres
**Then** el reparto sale de la aritmética del techo sobre el Corpus final, hecha antes de leer
**And** ninguna sesión rompe el techo

**Given** una obra candidata
**When** se elige
**Then** se elige obra y no firma: el rendimiento es del género y del modo retórico de la obra concreta, y una obra tiene tramos
**And** antes de recuperar se mira `corpus/_fuentes-retiradas/`, y la orden se niega sobre un documento ya retirado

**Given** la segunda Fuente admitida, Project Gutenberg, con un solo documento de 143 versionados
**When** se abre
**Then** da libros enteros donde Wikisource da capítulos, y se busca en ella por materia y no por género

**Given** el tramo cerrado
**When** se mide
**Then** 1.000 de 1.000, sin bajar ningún umbral; mil Citas es un hito y no la Meta, que solo se declara cuando los cuatro tramos están

---

## Epic 16: El buscador deja de descartar el sitio

Las 1.639 Páginas de Cita existen, son rastreables y están en el sitemap, y **Google ha indexado ocho**. Las otras 1.534 están en «Detectada, actualmente no indexada»: descubiertas y descartadas. Esta épica no añade ninguna superficie — pone el instrumento para saber por qué, el canal para anunciar lo que cambia, y el reparto de enlace hacia donde el buscador ya entra.

**FRs covered:** FR-38, FR-40 *(FR-39 aplazado el 2026-09-04)*
**Condiciones cubiertas:** ninguna nueva; ataca SM-1

**RECORTADA el 2026-09-04, por lo que midió su propia primera historia.** La 16.1 se estrenó contra Search Console y encontró 2 URL indexadas de 80, con 45 «desconocidas para Google» y el sitemap leído con sus 1.715 páginas descubiertas. Eso deja a las otras dos historias sin la premisa sobre la que se escribieron:

- **16.2** (anunciar cambios) pierde su motivo principal —Google ya conoce las URL, no hay nada que anunciarle— y **se queda solo por el suyo propio**: los índices que sí aceptan aviso, y con ellos la búsqueda por IA. Deja de ser trabajo de indexación y pasa a ser trabajo de descubribilidad en otros buscadores.
- **16.3** (repartir enlace desde superficies indexadas) queda **aplazada**: hay dos superficies indexadas en todo el sitio. Se reabre cuando la serie muestre una familia por encima del 20 %.

El remedio de verdad se fue a la **Épica 18**, que no existía cuando esto se planificó. Y la 16.1 se queda entera: es el instrumento que descubrió el error, y sin él la Épica 18 no sabría si funciona.
**Notas de implementación:** va **primera** por la razón que el PRD escribe en §6.5 — ninguna feature produce visitas si su página no se indexa. Dentro de la épica, la medición va antes que el remedio: sin la serie de AD-24 no se sabe si algo funcionó, y la pregunta 8 de §14 solo se falsa comparando el reparto por familia a lo largo del tiempo. Restricción externa que las historias heredan y **no deben redescubrir**: la Search Console API no expone informe de cobertura; solo `URL Inspection`, una URL por petición, con tope de 2.000 al día y 600 por minuto por propiedad.

### Story 16.1: El estado de indexación se lee por familia y se versiona

As a editor que necesita saber si el producto existe para el buscador,
I want una serie con cuántas superficies están indexadas de cada familia,
So that pueda distinguir «va lento» de «no se mueve», que es lo que decide todo lo demás.

**Acceptance Criteria:**

**Given** una lectura de indexación
**When** se registra
**Then** queda versionada en el repositorio con su fecha, su reparto por familia —Cita, Autor, Tema, Colección— y el estado de lectura de cada una
**And** la escribe una orden de `tools/`, nunca el build ni un paso de CI que commitee a `main`

**Given** que la fuente del dato solo ofrece inspección de una URL por petición, con tope diario
**When** el barrido no cabe en la cuota
**Then** la serie se compone por muestreo por familia y **el tamaño de muestra queda escrito en la entrada**
**And** una comparación entre jornadas sabe qué está comparando

**Given** una familia cuya lectura no se logró
**When** se escribe la entrada
**Then** esa familia **se omite**, y jamás se escribe cero
**And** el cero real —que es casi el estado de hoy— sigue siendo distinguible de la ausencia de lectura

**Given** dos lecturas de la misma jornada
**When** se registra la segunda
**Then** reemplaza a la primera en vez de añadirse: esto mide un estado, no una sesión

**Given** la cifra que se compara con SM-1
**When** se informa
**Then** es la de la familia Cita, no el agregado del sitio

**Given** cualquier módulo de `src/lib/`
**When** se construye el sitio
**Then** ninguno recibe el estado de indexación, ni siquiera por parámetro
**And** dos construcciones del mismo commit siguen dando el mismo sitio

### Story 16.2: El sitio anuncia lo que cambia, y las cuatro familias cuentan

As a sitio que publica a diario,
I want avisar de cada cambio a los buscadores que aceptan aviso,
So that no dependa solo de que alguien pase a mirar el sitemap.

**Acceptance Criteria:**

**Given** que se publica o modifica una Cita, un Autor, un Tema o una Colección
**When** el despliegue termina
**Then** el aviso cubre **las cuatro familias**, no solo `corpus/citas/`
**And** el mapeo de fichero del corpus a rutas afectadas tiene un solo dueño

**Given** el aviso
**When** el receptor no responde o falla
**Then** el despliegue **no** falla
**And** queda registrado qué se envió y qué contestó

**Given** el build
**When** corre
**Then** no depende de ningún servidor ajeno: el aviso es efecto de publicar y nunca condición de construir

**Given** una jornada en la que solo cambió la serie de indexación
**When** el flujo termina
**Then** no se emite aviso: quien avisa de todo a diario enseña a los buscadores a no hacerle caso

**Given** el aviso emitido
**When** se lee su efecto
**Then** se mide **aparte** del índice que mide SM-1, porque ese buscador no acepta aviso y el aviso no puede mover su cifra

### Story 16.3: El enlace interno se reparte desde donde el buscador ya entra

As a editor que quiere que las Citas entren en el índice,
I want saber qué superficies publicadas no reciben enlace desde una indexada,
So that el reparto deje de ser una intención y pase a ser una cifra.

**Acceptance Criteria:**

**Given** cada superficie publicada
**When** se informa
**Then** se distingue cuántos enlaces entrantes le llegan **desde superficies indexadas** y cuántos desde el resto
**And** NFR-5 sigue contando saltos desde la portada; esto cuenta procedencia

**Given** las superficies publicadas
**When** se listan las que no reciben ningún enlace desde una indexada
**Then** la lista es consultable y va ordenada por familia

**Given** las superficies de agregación
**When** reparten enlace hacia las Citas que agregan
**Then** el informe expresa su capacidad como cifra —75 páginas frente a 1.639— y no como intención

**Given** el cruce entre el grafo de enlace y lo indexado
**When** se calcula
**Then** ocurre en `tools/`, consumiendo de `publicado.ts` lo que ya es suyo
**And** el sitio construido no cambia por ello

---

## Epic 17: La Página de Autor responde a quién fue

Es la única superficie de contenido con impresiones medidas, y las nueve consultas que alcanzan el sitio son de Autor —cuatro de ellas biográficas explícitas—. Al terminar, esa página sitúa al Autor con fuente citada y enumera su obra, y deja lista la superficie donde un enlace de afiliación tendría sentido el día que lo tenga.

**FRs covered:** FR-4 *(enmendado)*, FR-41, FR-42, FR-43
**Enmendada en la v7.1 (2026-10-09):** la 17.3 y la 17.5 se reescriben en su sitio. La lista de obras enlaza a la Página de Obra, que es donde vive el enlace de afiliación, y la Página de Autor deja de admitirlo; la 17.3 se construye después de la 22.4 y la 17.5 antes de la 22.9.
**Notas de implementación:** la primera historia no la ve ningún visitante y es la mayor de la épica: admitir una Fuente **mutable** no es una línea en el conjunto cerrado, porque la extracción de metadato está construida sobre las plantillas de encabezado de Wikisource. El orden de la página lo fija la espina de UX —ficha primero, orden B— y deroga para esta superficie la regla de «contenido antes que explicación», que sigue entera en Tema y Colección.

### Story 17.1: Una Fuente mutable entra por revisión, y su documento no comparte espacio con las obras

As a sistema que coteja lo que publica,
I want tratar una fuente que cambia como un documento fijo,
So that el build no se rompa un martes porque alguien editó un artículo.

**Acceptance Criteria:**

**Given** una Fuente cuyo contenido puede cambiar
**When** se evalúa su entrada al conjunto cerrado
**Then** solo entra si ofrece direccionamiento por revisión
**And** se recupera **por el origen de esa revisión** —el texto en bruto—, nunca por la página renderizada ni por la dirección viva

**Given** el documento recuperado
**When** se versiona
**Then** la revisión forma parte de su identidad
**And** el build **rompe** cuando la revisión declarada en el Autor no es la del documento versionado

**Given** el cotejo de una Cita
**When** busca su documento
**Then** **jamás** casa con un documento de biografía, ni por prefijo ni por nombre exacto
**And** una obra cuyo identificador coincida con el de un Autor no se traga el documento del otro

**Given** una Fuente sin las plantillas de encabezado sobre las que se construyó la extracción existente
**When** se recupera de ella
**Then** su metadato sale de su propia extracción declarada, y no de un encabezado que no tiene

**Given** una obra ya versionada cuyo identificador trunca igual que otra
**When** se intenta reutilizar su documento
**Then** se compara la obra declarada en la cabecera con la pedida y **se rechaza la reutilización cuando difieren**, en vez de contestar «ya versionado»

### Story 17.2: La semblanza sitúa al Autor, publica su atribución, y sale de la Tarjeta

As a visitante que busca quién fue un autor,
I want que la página me lo diga y me enseñe de dónde lo saca,
So that pueda fiarme sin salir a comprobarlo.

**Acceptance Criteria:**

**Given** la semblanza de un Autor
**When** se publica
**Then** dice cuándo vivió, en qué corriente escribió y por qué se le cita
**And** un elemento que la fuente no sostenga se omite, no se rellena

**Given** una semblanza procedente de una fuente citable
**When** se sirve la página
**Then** su atribución se publica **visible** —enlace a la revisión concreta y su licencia—, no solo guardada
**And** va compuesta en la familia de la interfaz, no en la voz citada

**Given** una semblanza sin procedencia declarada
**When** se intenta publicar
**Then** no se publica, y el sistema **no compone** una en su lugar

**Given** un Autor sin fuente citable disponible
**When** se construye su página
**Then** conserva la semblanza breve que ya tenía, sin hueco y sin prosa nueva

**Given** la Tarjeta Social de un Autor
**When** se genera
**Then** se compone con hechos derivados del Corpus —nombre, años y recuento de Citas documentadas—
**And** **no** reproduce la semblanza, que es texto ajeno en una superficie que no puede portar su atribución
**And** tampoco lleva una bajada escrita por el sistema, que sería prosa nueva sobre una persona real

### Story 17.3: La Página de Autor enumera su obra *(reescrita en la v7.1)*

As a visitante que quiere saber qué escribió alguien,
I want ver de qué obras salen sus Citas, cuántas de cada una, y llegar a cada obra,
So that entienda qué me ofrece este sitio de esa persona y pueda leer juntas las Citas de un libro.

*(v7.1, 2026-10-09 — reescrita en su sitio por decisión de Héctor. La v5 derivaba aquí las obras, desambiguaba dos homónimas **en la Procedencia** y enlazaba cada obra a sus Citas; la v7.1 prohíbe lo primero fuera de `obras.ts` (AD-25), lo segundo en todas partes (FR-53) y muda lo tercero a la Página de Obra (FR-43). Las puertas de grafías pasaron a la 22.2.)*

**Acceptance Criteria:**

**Given** las Historias **22.3 y 22.4** terminadas
**When** empieza esta historia
**Then** la Obra ya se resuelve en `src/lib/obras.ts` y tiene página; sin eso no empieza, porque derivar aquí las obras sería la segunda derivación que AD-25 existe para impedir

**Given** las Obras de un Autor
**When** se compone su lista
**Then** la da `obras.ts`, derivada de las Procedencias publicadas; ninguna Ficha de Obra añade una obra sin Citas publicadas (FR-42)
**And** enumera Obras y no Citas, así que ninguna Cita aparece dos veces en la misma URL (AD-19)

**Given** cada entrada de la lista
**When** se sirve
**Then** lleva el título de su ficha en Inter, a la izquierda, y el recuento de sus Citas publicadas a la derecha, en cifras tabulares, con alto mínimo de 44 px y filete (UX-DR46)
**And** **enlaza a su Página de Obra**, también cuando esta no se indexa (FR-43, NFR-5)
**And** el año, solo cuando las Citas que lo declaran coinciden; si no, se omite y nunca se infiere

**Given** Citas del Autor que no declaran obra
**When** se compone la lista
**Then** quedan fuera, y al pie se dice «Y una cita sin obra documentada.» o «Y {n} citas sin obra documentada.»; sin ninguna, no hay línea: la bibliografía es la del Corpus y no finge completitud

**Given** la lista
**When** se sirve
**Then** va bajo el rótulo «Su obra en este Corpus», solo en la primera página del listado, dentro de la Ficha de Autor (17.4)
**And** no aloja ningún enlace comercial: se publica igual con el Modelo de afiliación apagado que encendido (FR-43)

**Given** dos obras del mismo Autor que parecen la misma, o una que parece parte de otra
**When** se publican
**Then** la lista lo refleja tal como lo decide su ficha (22.2); ni la lista ni nada reescribe la Procedencia para unirlas o separarlas

### Story 17.4: La ficha abre la página, y solo la primera

As a visitante que llegó buscando quién fue alguien,
I want la respuesta antes que el catálogo,
So that no tenga que desplazar para encontrar lo que vine a buscar.

**Acceptance Criteria:**

**Given** la Página de Autor
**When** se sirve
**Then** la ficha —semblanza, atribución y lista de obras— va **antes** del catálogo de Citas
**And** es la excepción declarada de la regla de agregación, que sigue entera en Tema y Colección

**Given** las páginas 2 y siguientes del listado de un Autor
**When** se sirven
**Then** **no** llevan la ficha: son otra superficie y van `noindex`

**Given** un viewport de 360 px
**When** se carga la página
**Then** el nombre del Autor y su semblanza son visibles sin desplazar
**And** no se introduce muro, modal ni aviso previo al contenido

**Given** la Página de Autor con la ficha
**When** se mide
**Then** sigue cumpliendo el tope de guion en línea y no carga guion de tercero

### Story 17.5: Un Modelo se admite por ruta, y el tope de guion se mide donde se admite *(reescrita en la v7.1)*

As a dueño del sitio,
I want que admitir un Modelo en una superficie no lo cuele en las páginas que la forma de su ruta excluye,
So that encender un ingreso no publique enlaces comerciales donde el sitio no debe ponerlos.

*(v7.1, 2026-10-09 — reescrita en su sitio por decisión de Héctor. AD-20 v7.1 revoca la admisión de la afiliación en la Página de Autor y la excepción de la Página de Cita, y restringe la admisión solo por **forma** de ruta, no por contenido. La afiliación se admitirá solo en la Página de Obra, en la 22.9.)*

**Acceptance Criteria:**

**Given** la declaración de qué superficie admite qué Modelo de Ingreso en `src/lib/ingreso.ts`
**When** se revisa
**Then** se expresa sobre el mismo predicado de ruta con el que `src/lib/superficies.ts` declara las superficies
**And** un Modelo admitido en una ruta que es servicio **por forma** —las páginas 2+ de un listado— se rechaza
**And** la restricción es solo de forma: cuando exista el servicio por contenido (22.4), no restringe ninguna admisión, porque el `noindex` decide qué ve el buscador, no qué ve quien llega desde una atribución

**Given** el Modelo de afiliación de libros
**When** se revisa la declaración
**Then** se rechaza en cualquier superficie que no sea la Página de Obra; hoy no lo admite ninguna, y la Página de Autor y la de Cita tampoco (FR-35)

**Given** cualquier superficie que admita un Modelo
**When** se mide su guion en línea
**Then** el tope de `MAX_BYTES_DE_GUION` se comprueba **en esa superficie**, no solo en la Página de Cita (AD-20)

**Given** el `dist/` construido
**When** corre `tests/unit/ingreso-construido.test.ts`
**Then** exige que lo marcado con `data-ingreso` en cada ruta esté encendido y admitido **en esa ruta**, no en su fichero de página

**Given** la lista de obras de la Página de Autor
**When** se construye con cualquier Modelo encendido o apagado
**Then** no aloja ninguno (FR-43)

---

## Epic 18: Que el buscador gaste rastreo en este sitio

Google conoce las 1.715 URL —el sitemap se leyó el 2/09 y las descubrió todas— y aun así indexa 2 de cada 80. No es descubrimiento, no es contenido y no es SEO técnico: el sitemap, las canónicas, el `robots.txt` y los códigos de respuesta están comprobados. Es que un sitio de dos días, sin un solo enlace entrante externo, que publicó 1.715 URL de golpe, no recibe presupuesto de rastreo.

**FRs covered:** FR-44, FR-45, FR-46, FR-47
**Notas de implementación:** esta épica **no la escribió el PRD original de la v5**: nació el 2026-09-04 de la Historia 16.1, que midió y demostró que las Épicas 16 y 17 atacaban la causa equivocada. Casi nada de ella es código — es trabajo editorial y de canal, y el instrumento para saber si funciona ya existe (FR-40). El Kit Diario de la Épica 8 está construido desde la v2 y es exactamente la herramienta que la 18.2 necesita.

### Story 18.1: El sitio deja de tener cero enlaces entrantes

As a sitio nuevo que ningún buscador tiene motivo para rastrear,
I want que existan enlaces hacia mí desde dominios que no controlo,
So that el buscador tenga una razón para gastar rastreo en mis páginas.

**Acceptance Criteria:**

**Given** el informe de enlaces de la propiedad
**When** se consulta
**Then** el número de dominios de referencia es mayor que cero
**And** la cifra sale del informe, no de una estimación

**Given** cada señal conseguida
**When** se registra
**Then** queda anotada con su fecha, para poder cruzarla con la serie de indexación

**Given** el origen de una señal
**When** se decide buscarla
**Then** es un sitio que admite una obra de dominio público por lo que es
**And** nunca un enlace comprado, intercambiado, ni un sitio cuyo criterio de admisión sea el pago

### Story 18.2: El canal propio se usa como fuente de rastreo

As a editor que ya publica a diario en cinco cuentas,
I want que esa publicación cuente como señal y no solo como visitas,
So that el instrumento que ya existe sirva también para lo que ahora hace falta.

**Acceptance Criteria:**

**Given** la Cita del Día publicada en una cuenta propia
**When** se compone su pieza
**Then** enlaza a la URL canónica, como ya exige FR-22
**And** ese enlace queda contado como señal en el registro de la 18.1

**Given** la cadencia de publicación
**When** se mide
**Then** se sostiene en el tiempo: una cuenta que publica dos veces y calla no produce señal ninguna

**Given** el Kit Diario
**When** se usa para esto
**Then** no se le añade ninguna capacidad nueva: está construido desde la v2 y basta

### Story 18.3: Se pide rastreo de lo que representa al sitio

As a editor,
I want pedir rastreo de unas pocas URL escogidas y saber cuáles pedí,
So that pueda distinguir lo que entró por petición de lo que entró solo.

**Acceptance Criteria:**

**Given** la selección de URL para las que se pide rastreo
**When** se compone
**Then** es del orden de la decena, no del millar: pedir rastreo de 1.715 URL no es una petición, es ruido

**Given** cada petición
**When** se cursa
**Then** quedan registradas las URL y la fecha
**And** la serie de indexación puede distinguir lo pedido de lo espontáneo

**Given** la selección
**When** se decide
**Then** la hace una persona, como se elige la Cita del Día
**And** no se automatiza sobre el Corpus entero

**Given** cualquier servicio que prometa indexación a cambio de dinero
**When** aparezca en la conversación
**Then** queda fuera, como declara §4.17

### Story 18.4: El sitemap dice qué cambió y cuándo

As a buscador con presupuesto de rastreo limitado y 1.715 URL delante,
I want saber cuáles han cambiado y cuándo,
So that pueda gastar ese presupuesto en lo que lo merece en vez de repartirlo a ciegas.

**Acceptance Criteria:**

**Given** el sitemap publicado
**When** se sirve
**Then** cada entrada declara su `lastmod`
**And** hoy ninguna lo hace: son 1.715 `<loc>` a secas, sin una sola señal de novedad

**Given** la fecha de una superficie
**When** se compone
**Then** sale de **cuándo cambió su contenido de verdad** —el historial del repositorio, que es donde vive el Corpus—, nunca de la hora de construcción

**Given** la reconstrucción diaria de AD-12
**When** corre sin que el Corpus haya cambiado
**Then** el `lastmod` de las superficies **no se mueve**
**And** el sitio no le dice al buscador que 1.715 páginas cambiaron cuando no cambió ninguna: una fecha falsa es peor que ninguna fecha, porque enseña a no hacer caso

**Given** una superficie cuya fecha no se puede determinar
**When** se compone su entrada
**Then** se omite el `lastmod` de esa entrada en vez de inventarlo
**And** se sigue la misma regla que el resto del Corpus: un campo sin valor se omite, nunca se rellena

**Given** una Página de Cita
**When** se deriva su fecha
**Then** refleja el último cambio de su propia Cita, no el del Corpus entero

**Given** el sitemap construido
**When** lo comprueba la suite
**Then** hay una prueba que falla si las entradas pierden el `lastmod`
**And** otra que falla si dos construcciones del mismo commit dan fechas distintas

---

## Epic 19: El Corpus se abre a los clásicos

El Corpus está invertido respecto a la demanda: González Prada aporta 154 Citas y García Lorca aporta 1. Creció por lo que había disponible, que es lo único que podía hacer mientras no hubiera demanda medida. Ahora la hay, y esta épica gira el catálogo hacia donde se busca — filosofía antigua y teología, en profundidad por Autor.

**FRs covered:** FR-48, FR-49, FR-50
**Notas de implementación:** la primera historia se especificó como puerta y **se suavizó el 2026-09-05**: la verificación de derechos ya la hace el conjunto cerrado de Fuentes —Wikisource solo aloja dominio público— y exigir además el año de cada traducción duplicaba esa comprobación un nivel más abajo y peor. Ya no bloquea a las demás. Las dos siguientes son operación —el bucle— y no producen FR nuevos: las herramientas son las de la Épica 9, ya construidas. La 19.4 es superficie nueva y va la última, con condición de indexación.
**Historias 19.5 a 19.11 (añadidas aquí el 2026-09-14):** no salieron de la planificación sino de diagnósticos del bucle, y se especificaron directamente como spec en `implementation-artifacts/`. Ninguna produce FR nuevos: son operación del bucle (19.5, 19.6) y lectura de la Fuente (19.7 a 19.11). La 19.5 sustituye al listón numérico que la 19.2 dejaba pendiente. La 19.9 se construyó el 2026-09-14 por decisión de Héctor, sabiendo lo medido antes de escribirla: vale el 8 % de las páginas mudas y no el 53 %, y no salva a Esopo ni a *La República*.
**Historias 19.12 y 19.13 (añadidas aquí el 2026-10-05):** de la misma clase que las siete anteriores —lectura de la Fuente, diagnosticadas por el bucle y especificadas directamente como spec en `implementation-artifacts/`—, y ninguna produce FR nuevos. La 19.12 se construyó el 2026-09-22 y la 19.13 el 2026-10-02; las dos están en `review`.

### Story 19.1: De una obra traducida se conserva lo que la Fuente declare *(reescrita en la v7.1)*

As a editor que abre el Corpus a los clásicos,
I want que el traductor y el año de la traducción se conserven cuando la Fuente los da, y que nunca pasen por año de la obra,
So that quede constancia de la edición sin que ninguna página diga que Horacio escribió las Odas en 1909.

**Realiza:** FR-48 y UX-DR51.

*(v7.1, 2026-10-09 — reescrita en su sitio. Decisión de Héctor en la mesa redonda de la épica de la Obra: va **antes** de la Página de Obra (22.4). Medido ese día: 63 Citas publicadas en 4 Obras llevan como año el de su traducción —«Odas» 35 (Germán Salinas, 1909), «Consolación a Marcia» 14 (1884), «La Eneida» 8 (1869), «Fedro» 6 (1871)— y 64 traducidas no llevan año. La versión de la v6 solo conservaba el dato al recuperar, y no habría corregido lo ya publicado.)*

**Acceptance Criteria:**

**Given** un documento de Fuente cuyo encabezado declara traductor o año
**When** se recupera y se extraen sus Citas
**Then** esos datos quedan en la Procedencia como **traducción** —traductor y año de la traducción—, separados del año de la obra
**And** hoy `recuperar.ts` los descarta: solo conserva título y autor
**And** el traductor se guarda sin marcado de la Fuente: «[[Germán Salinas]]» queda «Germán Salinas»

**Given** las Citas ya publicadas cuyo documento versionado declara traductor
**When** se restituye con su orden
**Then** el traductor y el año de la traducción salen de la cabecera de ese documento (AD-23: restituir el literal, nunca inferir), y el año que hoy publican como de la obra pasa a ser el de la traducción
**And** ninguna Cita sin documento cambia; el año de la obra queda omitido si la Fuente no lo da, nunca inventado
**And** las 63 Citas de las 4 Obras medidas quedan así en un commit propio

**Given** una obra traducida cuya Fuente **no** declara traductor ni año
**When** se publica una Cita suya
**Then** se publica igual: **esto no es una puerta**
**And** la verificación de derechos sigue donde ya estaba, en el conjunto cerrado de Fuentes

**Given** una Cita con traducción
**When** se publica
**Then** su Atribución dice «Odas. Traducción de {traductor}, 1909.», con el año junto al traductor y junto al título solo el de la obra (UX-DR51)
**And** lo copiado dice ««…» — Horacio, Odas, trad. de {traductor}, 1909.»
**And** la Imagen de Cita, la Tarjeta Social y la Pieza no nombran al traductor

**Given** el informe de salud del Corpus
**When** lo consulto
**Then** dice cuántas Citas de obra traducida no traen traductor ni año
**And** las de Séneca sin dato aparecen ahí como cifra, no como error

**Given** el conjunto cerrado de Fuentes
**When** entra una nueva
**Then** sigue declarando su licencia y rechazándose si no permite reutilización, como hasta ahora

### Story 19.2: El bucle siembra clásicos con meta propia

As a editor,
I want que el bucle sepa cuántos clásicos faltan y a quién buscar,
So that la siembra se derive del hueco y no de mi criterio cada mañana.

**Acceptance Criteria:**

**Given** el informe de huecos
**When** lo consulto
**Then** cuenta los Autores de tradición `otra` **aparte**, con su propia meta
**And** el suelo panhispánico se mide sobre hispánicos y no sobre el Corpus entero

**Given** dos Autores admisibles
**When** el bucle elige a quién sembrar
**Then** prioriza por **demanda** y no por disponibilidad

**Given** el techo de concentración por Autor
**When** el bucle siembra en profundidad
**Then** lo respeta sin excepción, y dice cuántas Citas más caben de ese Autor

**Given** una sesión del bucle
**When** termina
**Then** queda registrada en la serie de sembrado, como toda sesión desde la 11.3

### Story 19.3: La profundidad por Autor llega a la obra y a la biografía

As a visitante que busca a un autor famoso,
I want encontrar sus frases, sus obras y quién fue,
So that la página resuelva la consulta entera y no un tercio.

**Acceptance Criteria:**

**Given** un Autor de esta épica
**When** se publica
**Then** su Página de Autor trae semblanza con fuente citada, su obra y sus Citas
**And** eso es exactamente FR-41 y FR-42, ya especificados en la Épica 17: esta historia **no los reimplementa**, los consume

**Given** el orden entre épicas
**When** se planifica
**Then** la 17.1 y la 17.2 van antes que esta historia, porque son las que construyen la semblanza con fuente

### Story 19.4: La Época agrupa a los Autores que comparten tiempo y escuela

As a visitante que busca «filósofos estoicos» y no un nombre,
I want recorrer el catálogo por época,
So that pueda llegar sin saber a quién busco.

**Acceptance Criteria:**

**Given** una Época
**When** se publica
**Then** agrupa **Autores** y no Citas, que es lo que la distingue del Tema

**Given** una Época sin Autores publicados
**When** se construye el sitio
**Then** no se publica ni se indexa, como todo umbral de este producto

**Given** la superficie nueva
**When** se declara
**Then** dice en un solo sitio si es publicable, como manda la Historia 12.1

**Given** la serie de indexación
**When** ninguna familia pasa del 20 % indexado
**Then** esta historia **no se construye todavía**: añadir superficies a un sitio que no se rastrea es gastar en la dirección contraria

### Story 19.5: La época se declara desde la Fuente, y el hueco sale de ella

As a editor que siembra clásicos,
I want que la lista de a quién buscar salga de las categorías de la Fuente,
So that el bucle tenga trabajo derivable y una condición de término que sea una cuenta y no un cansancio.

**Acceptance Criteria:**

**Given** las categorías de autores de Wikisource-es por época —Antigüedad, Antigua Grecia, Antigua Roma y católicos— y la marca `DP-Autores-100` de dominio público
**When** se recupera una época
**Then** la lista de candidatos se versiona como todo lo que el bucle consume
**And** no vive en el repositorio como catálogo escrito a mano

**Given** una época recuperada
**When** se cruza con el Corpus
**Then** dice cuántos candidatos hay, cuántos sembrados y cuántos descartados con motivo

**Given** todos los candidatos de una época sembrados o descartados con motivo
**When** se consulta el hueco
**Then** esa época se declara terminada
**And** un candidato que no da Citas se descarta con su motivo escrito, nunca se salta

**Given** la Fuente sin responder
**When** se consulta
**Then** se trabaja con la lista versionada y se dice que no se actualizó

**Given** un candidato con `DP-Autores-100`
**When** se siembra
**Then** pasa la puerta de admisión igual que cualquier otro: admitir sigue siendo del editor

### Story 19.6: La cola de revisión se ordena por probabilidad, no por alfabeto

As a editor,
I want revisar primero las candidatas con más probabilidad de valer,
So that agotar una época no sea leer 21.021 candidatas ordenadas por su primera palabra.

**Acceptance Criteria:**

**Given** 21.021 candidatas pendientes
**When** se pide la cola
**Then** el total sigue siendo 21.021 y el orden no es alfabético
**And** ninguna candidata se oculta: un orden que esconde la cola es una puerta en secreto

**Given** `--primeras 300`
**When** se lista
**Then** se enseñan 300 y se dice cuántas quedan debajo

**Given** dos candidatas con la misma puntuación
**When** se lista dos veces
**Then** salen en el mismo orden

**Given** una señal de orden
**When** entra
**Then** trae su cifra medida contra el Corpus publicado, escrita donde vive
**And** convertirla en puerta es decisión aparte: como puerta muerde Citas publicadas

### Story 19.7: El lector entiende la obra escaneada, que es donde viven los clásicos

As a editor,
I want que el Autor de una obra transcrita de un escaneo se lea de su etiqueta `<pages … autor="…" />`,
So that los clásicos no se versionen mudos cuando la Fuente sí los declara.

**Acceptance Criteria:**

**Given** una página con `<pages … autor="Marco Aurelio" />`
**When** se deriva
**Then** declara a Marco Aurelio
**And** la etiqueta se normaliza a las mismas líneas `|autor = …` de la plantilla, y de ahí para dentro nada cambia

**Given** el nombre de fichero del índice con `(1888)`
**When** se deriva el año
**Then** no hay año: un nombre de fichero no es una declaración de la Fuente

**Given** los doce libros de los *Soliloquios* recuperados de nuevo
**When** corre la prueba de FR-23
**Then** ninguno queda sin Autor declarado
**And** ningún documento versionado se edita a mano

### Story 19.8: El clásico firma con un solo nombre

As a editor,
I want que `[[Categoría:Obras de Platón]]` declare a Platón,
So that la guarda calibrada con Autores de dos apellidos no deje mudo al clásico.

**Acceptance Criteria:**

**Given** `[[Categoría:Obras de Platón]]`
**When** se deriva el Autor
**Then** declara «Platón»: un nombre de una sola palabra cuenta si empieza en mayúscula

**Given** `[[Categoría:Obras de teatro]]`
**When** se deriva
**Then** no declara nada

**Given** la categoría
**When** la página declara Autor por otra vía
**Then** la categoría no la adelanta: sigue siendo el último eslabón de la cadena
**And** los falsos positivos medidos van escritos junto a la regla

**Given** los documentos de Platón recuperados de nuevo
**When** corre la prueba de FR-23
**Then** ninguno queda sin Autor declarado

### Story 19.9: El Autor se lee del Índice del escaneo

As a editor,
I want que una página escaneada sin `autor=` tome el Autor de la página `Índice:` que ella misma nombra,
So that se declare lo que la Fuente atribuye aunque no lo repita en cada subpágina.

**Acceptance Criteria:**

**Given** una página muda cuyo índice declara Autor
**When** se recupera
**Then** el documento lo declara, marcado como del índice

**Given** una página que ya declara Autor
**When** se recupera
**Then** no se pide el índice

**Given** un índice con `|Autor=` vacío
**When** se recupera
**Then** el documento sigue sin declarar Autor y no se inventa ninguno
**And** nunca se deriva del padre por la ruta, que es la Procedencia inferida que prohíbe la 11.1

**Given** el alcance medido antes de escribirla
**When** se decide construirla
**Then** consta que salva 2 de 25 subpáginas mudas, y no las de Esopo ni *La República*, cuyos índices traen el Autor vacío

### Story 19.10: Los géneros que faltaban en la categoría de Autor

As a editor,
I want que `[[Categoría:Tragedias de Sófocles]]` declare a Sófocles,
So that la lista cerrada de géneros no deje mudas las tragedias y el teatro de los clásicos.

**Acceptance Criteria:**

**Given** `[[Categoría:Tragedias de Sófocles]]`
**When** se deriva
**Then** declara «Sófocles»
**And** la lista sigue cerrada: cada género entra con su cifra medida contra la Fuente

**Given** `[[Categoría:Traducciones de Alejo García Moreno]]`
**When** se deriva
**Then** no declara Autor
**And** «Traducciones de», «Ilustraciones de» y «Documentos de» quedan fuera a propósito, porque nombran a quien no escribió

**Given** las tragedias recuperadas
**When** corre la prueba de FR-23
**Then** ninguna queda muda

### Story 19.11: La numeración de verso del escaneo no se versiona

As a editor,
I want que la numeración de verso de un escaneo no se guarde como texto de la obra,
So that «5Mucho padeció» no quede versionado como si lo hubiera escrito Virgilio.

**Acceptance Criteria:**

**Given** un `<sup>` sin atributos cuyo único texto son de una a cuatro cifras
**When** se recupera de Wikisource-es
**Then** se sustituye por un espacio, nunca por nada, para no pegar dos palabras
**And** se conservan el `<sup>` con atributos, con letras o con marcado dentro

**Given** La Eneida de Ochoa, libro I, recuperada de nuevo
**When** se mide con `tools/peor-legible.ts`
**Then** su cifra-en-palabra es 0
**And** la declaración y el resto del cuerpo son idénticos a lo versionado

**Given** los documentos regenerados
**When** corre el cotejo del build
**Then** toda Cita publicada sigue literal en su documento

**Given** la canaria de legibilidad
**When** se construye la historia
**Then** no se toca: la numeración es aparato del escaneo, no margen de la canaria

### Story 19.12: El verso se lee por frase, no por renglón

As a editor que siembra verso declarado por la Fuente,
I want que dentro de un bloque que la Fuente declara como verso el salto de renglón se versione como salto simple y no como párrafo,
So that una sentencia repartida en varios versos llegue entera al troceador, en vez de salir como tres fragmentos que no alcanzan los 40 caracteres.

**Nota de origen:** medido el 2026-09-20: la «Canción divina» de González de Eslava daba 1 candidata en ventana y debía dar 14, y de ahí salieron descartes de Autores enteros «porque su obra solo da medios versos». Construida el 2026-09-22 y medida sobre los 306 documentos de Wikisource-es versionados: 54 traen verso declarado, y en ellos las candidatas pasan de 8.269 a 8.508 —1.130 ganadas, 891 perdidas, 684 de ellas medio verso—.

**Acceptance Criteria:**

**Given** un `<div class="poem">`, `verse` o `mw-poem-indented` —por identificador exacto de clase, nunca por subcadena ni por heurística de longitud—
**When** se recupera de Wikisource-es
**Then** el bloque es un párrafo y sus frases se parten por puntuación, como en la prosa
**And** `<br><br>` sigue dando párrafo, un contenedor sin cerrar se deja intacto, y `data-class` no declara verso

**Given** un documento sin verso declarado
**When** se recupera otra vez
**Then** su cuerpo es idéntico byte a byte salvo la fecha de recuperación
**And** ni el troceador, ni `MIN_CARACTERES_CANDIDATA`, ni el cotejo ni la canaria de legibilidad se tocan

**Given** la «Canción divina» recuperada de nuevo
**When** se extraen y se revisan sus candidatas una a una
**Then** al menos una es Cita publicable; la cifra de candidatas en cola no es criterio de nada

**Given** los documentos ya versionados con verso declarado
**When** se regeneran con `tools/recuperar.ts`, de uno en uno y comparando palabra a palabra
**Then** solo cambia el espaciado, y si cambia algo más se restituye el viejo —50 regenerados y 4 restituidos—
**And** se anota por documento si pierde candidatas en ventana, porque unir versos puede pasar una frase de 240 caracteres

**Given** los documentos regenerados
**When** corre el cotejo del build
**Then** toda Cita publicada sigue literal en su documento

**Given** el teatro, con el nombre del personaje delante de cada frase, y la clase `poem` envolviendo prosa en *La ciudad de Dios*
**When** se juzga el alcance
**Then** no entran: lo primero espera a saber separar el nombre, y lo segundo queda anotado en `deferred-work.md` porque distinguirlo exigiría adivinar por la forma del renglón

### Story 19.13: Un título largo no deja sin nombre a las páginas de su obra

As a editor que versiona una obra por subpáginas,
I want que cada subpágina de una obra de título largo tenga nombre propio de documento,
So that las veintiuna páginas de los *Coloquios* de González de Eslava no compitan por un solo fichero y se pueda versionar más de una.

**Nota de origen:** medido el 2026-09-24 y el 2026-10-02: el nombre `{fuente}--{slug-de-obra}--{slug-de-página}` acota cada segmento a 60 caracteres, y cuando la obra agota ese largo el segmento de página queda idéntico al de la obra y el nombre colapsa. De los 309 documentos de Wikisource-es versionados, uno solo tenía el nombre colapsado por esta causa. Construida el 2026-10-02.

**Acceptance Criteria:**

**Given** dos subpáginas cualesquiera de los *Coloquios*
**When** se piden sus nombres
**Then** son distintos entre sí y distintos del de la obra: el segmento sale de lo que la Fuente escribe en su título declarado detrás del título de la obra, con todos los tramos que quedan, nunca de la URL ni del índice del escaneo

**Given** los 309 documentos de Wikisource-es ya versionados
**When** se recalculan sus nombres
**Then** ninguno cambia salvo el de los *Coloquios*

**Given** una página que es su propia obra, o que difiere de ella solo en mayúsculas, o cuya obra derivada es su propio título con barra por no declarar `|título`
**When** se pide su nombre
**Then** sigue teniendo un solo segmento, el que su documento ya lleva escrito
**And** Gutenberg sigue con uno

**Given** una subpágina de más de un tramo —«Obra/Libro I/Capítulo I» y «Obra/Libro II/Capítulo I»—
**When** se piden sus nombres
**Then** son distintos entre sí

**Given** una subpágina cuya cola da el mismo slug que la obra
**When** se pide su nombre
**Then** lleva dos segmentos y no reclama el documento de la obra entera

**Given** dos subpáginas que siguen coincidiendo al acotar
**When** se recuperan
**Then** `recuperar` sigue negándose: no se numera ni se desambigua con un sufijo inventado

**Given** el documento de los *Coloquios* ya versionado con el nombre colapsado
**When** se renombra con `git mv` al nombre que `nombreDeDocumento` deriva, por decisión de Héctor del 2026-10-02
**Then** el cotejo del build sigue en verde, `extraer` pasa la puerta del nombre con código 0, y la prueba que recorre los documentos versionados ya no admite excepciones

---

# Sabiduría de Bolsillo — Épicas de la v7 (ciclo 1)

Las Épicas 1 a 5 son la v1, las 6 a 10 la v2, las 11 a 14 la v3, la 15 la v4, las 16 a 18 la v5 y la 19 la v6. Esta parte abre la v7, que es la fase planificada el 2026-10-04 a partir de los primeros datos con volumen de Search Console y del panel de Facebook. La fase entera son seis épicas candidatas, escritas en `docs/superpowers/specs/2026-10-04-fase-siguiente-borrador.md`; **aquí entra solo su primer ciclo**, el único con diseño aprobado: medir antes de mover, y conectar el canal propio al sitio.

**Lo que esta parte no trae, y por qué.** El ciclo **no añade ningún FR al PRD**: realiza FR que ya existen y añade capacidad de medición que el diseño aprobado deriva de ellos. Por eso el inventario distingue los FR realizados de los *requisitos derivados del diseño*, numerados D-1 a D-7. Si la skill de arquitectura juzga que AD-24 debe nombrar las dos series nuevas, el PRD y la espina se regeneran por sus skills; ninguna línea de este documento los sustituye.

**La puerta que gobierna el ciclo.** Nada de lo que aquí se construye se juzga sin series: la de indexación lleva una sola lectura, la de tráfico y la de demanda no existen, y D1 no se ha leído desde este equipo. La Épica 20 va primera por eso, y la 21 publica desde el mismo día sabiendo que, hasta que la 20.1 esté desplegada, solo los enlaces a una Página de Cita dejan fila.

## Requirements Inventory — v7

### Functional Requirements

Los FR del PRD que el ciclo realiza o completa. Ninguno es nuevo; se reenuncian por lo que este ciclo les añade.

FR-9 *(realizado de nuevo)*: la Cita del Día rota por el conjunto de aptas sin repetir ninguna hasta agotarlo, es la misma para todos los visitantes de una jornada y no depende del orden en que el build leyó el disco. El ciclo cambia el **orden de recorrido** —en rondas por Autor— y conserva las tres propiedades.
FR-15 *(realizado de nuevo)*: marcar una Cita como apta para portada es un acto editorial que pasa por la orden, nunca por editar el fichero. El ciclo lleva el conjunto de 16 a 120 o más con una regla escrita en el commit.
FR-22 *(completado)*: el enlace de cada publicación distingue la red de destino con una marca de origen, la página de destino es siempre la URL canónica y la marca no altera lo que ve el visitante. Hoy la marca solo cuenta cuando aterriza en una Página de Cita; el ciclo la hace contar también en portada, Autor, Tema y Colección, que es donde aterrizan las Piezas.
FR-38 *(criterio pendiente)*: el aviso de cambio llega a los índices que lo aceptan y **su efecto se mide aparte del de Google**. El aviso está construido desde agosto (`tools/avisar.ts`); lo que falta es la lectura de Bing, que cierra el criterio y pasa la 16.2 a revisión.
FR-40 *(operación)*: la indexación se lee por familia, con fecha, y sin número cuando la fuente no está. La serie vuelve a medir en cuanto exista la credencial, con presupuesto corto y commit aparte.
FR-44 *(realizado)*: existen señales hacia el sitio desde fuera, cada una registrada con su fecha para cruzarla con la serie de indexación; nunca compradas ni intercambiadas. El ciclo construye el registro y distingue la señal **propia** —una bio, un Linktree, una descripción de vídeo del proyecto— de la **ajena**; solo la ajena cierra la 18.1.
FR-45 *(realizado)*: la publicación en las cuentas propias enlaza a la URL canónica con su marca, se cuenta como señal, y su cadencia **se sostiene y se mide**. El ciclo construye el registro de publicaciones y fija la plantilla semanal; al Kit no se le añade nada, como la 18.2 exige.
FR-29, FR-30, FR-32 *(operación)*: el lote, la Pieza de varias Citas y la Pieza de Colección se usan tal como están en la plantilla semanal. No cambian.

### Requisitos derivados del diseño aprobado

Salen de `docs/superpowers/specs/2026-10-04-ciclo-1-medir-y-canal-design.md` §4 y §5. Cada uno es comprobable y ninguno pide un FR nuevo.

D-1 — **El evento de vista en las superficies de agregación.** El vocabulario cerrado de `src/lib/medicion.ts` gana `vista-de-superficie`; lo emiten la portada, la Página de Autor, la de Tema y la de Colección, y no lo emiten `/buscar`, `/404`, `/kit` ni `/lote`. Sin identificador, cookie, sesión ni referente; `datos` y `destino` siguen vedados fuera de sus eventos. El receptor lo acepta por importar el vocabulario y no hay migración de esquema; el Worker se redespliega el mismo día que el sitio. El guion en línea sigue dentro de `MAX_BYTES_DE_GUION`.
D-2 — **La serie de tráfico orgánico.** Una orden de `tools/` lee el rendimiento Web de Search Analytics con la credencial y el alcance de la serie de indexación y escribe `corpus/serie-de-trafico.yml`: por mes, total y reparto por familia, clics, impresiones, CTR y posición; idempotente por mes; mes parcial marcado; sin credencial código 2 y nada escrito; lectura fallida código 1 y nada escrito; un mes que no se pudo leer se omite y nunca se escribe como cero. Ningún módulo de `src/lib/` la lee.
D-3 — **La serie de demanda por página.** Misma credencial, dimensión página, ventana de 28 días —16 meses en la primera lectura—, agregada por slug de Autor con el prefijo más largo y por Cita, con mínimo de cinco impresiones por fila; `corpus/serie-de-demanda.yml` idempotente por fecha. Informa; **no entra** en `src/lib/objetivo.ts` en este ciclo.
D-4 — **La rotación en rondas por Autor.** `citaDelDia` agrupa las aptas por Autor, ordena Autores y Citas por slug, y recorre primero la primera de cada Autor, luego la segunda de cada uno. Es una permutación de las aptas: FR-9 y AD-12 se conservan; las fijaciones de `corpus/portada.json` siguen mandando; dos jornadas consecutivas no comparten Autor mientras la ronda tenga al menos dos.
D-5 — **La regla de las aptas.** Texto de 160 caracteres o menos, `procedencia.obra` presente, una o dos Citas por Autor, los 24 Temas cubiertos, prioridad a los Autores con demanda medida. El agente propone la lista entera, Héctor tacha en bloque, se aplica con la orden existente y queda en un solo commit con la regla en el mensaje.
D-6 — **El registro de publicaciones de canal.** `corpus/publicaciones-de-canal.yml` solo añade: fecha, red del conjunto cerrado, formato (`foto`, `reel`, `pieza`, `historia`), ruta enlazada sin dominio o ninguna, nota opcional. Su orden lista por semana ISO y por red, y anota; rechaza red desconocida, ruta no publicable y fecha futura. Código 1 lo que la invocación dice, 2 su forma.
D-7 — **El registro de señales externas.** `corpus/senales-externas.yml` solo añade: fecha, URL de origen, ruta de destino, `tipo: propia | ajena`, nota. Misma orden, misma lista. Solo `ajena` cierra la 18.1.

### NonFunctional Requirements

Los NFR-1…NFR-13 siguen vinculando y no se reenuncian. Los que el ciclo pone a prueba de forma nueva:

- **NFR-10, NFR-11** — el evento nuevo no introduce visitante, sesión, cookie ni referente; la razón `vista-de-cita / vista-de-superficie` es un agregado por jornada, no una sesión.
- **NFR-6** — el Kit y el lote siguen siendo superficies internas: no emiten el evento y no entran en ninguna serie.
- **NFR-7** — el guion en línea crece unos veinte bytes en toda página; lo decide la prueba de presupuesto, nunca subiendo el tope.
- **NFR-12** — la plantilla semanal publica el texto literal del Corpus con obra y año; ninguna Cita se redacta de nuevo para el canal.

### Additional Requirements

De la espina de arquitectura y de las convenciones del repositorio:

- **AD-13 — vocabulario cerrado, ampliado por su módulo.** Añadir `vista-de-superficie` exige tocar `src/lib/medicion.ts`, que es la fricción que el AD diseña; el receptor importa el vocabulario y no lo copia.
- **AD-14 — el plano de medición es de un solo sentido.** El sitio no lee D1 ni las series nuevas; quien lee es `tools/` y Héctor.
- **AD-24 — series versionadas que el sitio no toca**, extendido por el mismo motivo a `serie-de-trafico.yml` y `serie-de-demanda.yml`: se componen en `tools/`, viven en la raíz de `corpus/` como metadato y ninguna colección de `src/content.config.ts` apunta a ellas.
- **AD-22 — la red solo en la cáscara de `tools/`.** Las dos series y la lectura de Bing hacen peticiones desde la orden; `tools/lib/` y `src/lib/` siguen puros.
- **AD-12 y AD-10 — rotación determinista y sin estado.** El orden nuevo deriva de la fecha del build y del conjunto de aptas; nada recuerda qué salió.
- **AD-15 — las Piezas se componen en `tools/` y su salida no se versiona.** La plantilla las consume tal cual.
- **AD-27 — anunciar no es construir.** La lectura de Bing mide el aviso; no se construye nada para avisar.
- **Convención de `tools/`:** código de salida 2 para la forma de la invocación, 1 para lo que la invocación dice; «ausencia antes que cero» en toda serie; una **serie** reemplaza por fecha o por mes porque mide un estado, y un **registro** solo añade porque anota actos — es la misma distinción que separa `serie-de-indexacion.yml` de `peticiones-de-rastreo.yml`.
- **Sin tecnología nueva.** Las dos series reutilizan `googleapis` y la credencial de la Historia 16.1; los registros reutilizan el patrón de `tools/rastreo.ts`.

### UX Design Requirements

Ningún UX-DR nuevo: el ciclo no añade ni cambia superficie visible. UX-DR17 y UX-DR34 —las rutas de salida de la Página de Cita y el chip de Colección— quedan a propósito para el ciclo siguiente, con su pasada acotada de `bmad-ux` antes de tocar código.

### FR Coverage Map — v7

FR-9: **Épica 21** — la rotación de la Cita del Día pasa a rondas por Autor y conserva «todas antes de repetir» (21.1).
FR-15: **Épica 21** — el conjunto de aptas pasa de 16 a 120 o más por la orden, con la regla en el commit (21.2).
FR-22: **Épica 20** — la marca de origen cuenta también en portada, Autor, Tema y Colección, que es donde aterrizan las Piezas (20.1).
FR-29, FR-30, FR-32: **Épica 21, en operación** — el lote y las Piezas se usan tal cual en la plantilla semanal; no cambian.
FR-38: **Épica 20** — la lectura de Bing cierra «el efecto se mide aparte» y pasa la 16.2 a revisión (20.4).
FR-40: **Épica 20** — la serie de indexación vuelve a medir en cuanto exista la credencial (20.4).
FR-44: **Épica 21** — el registro de señales externas, propia o ajena; solo la ajena cierra la 18.1 (21.4).
FR-45: **Épica 21** — el registro de publicaciones de canal y la plantilla semanal, que es el trabajo de la 18.2 (21.3).
D-1, D-2, D-3: **Épica 20** — evento de vista en agregación, serie de tráfico, serie de demanda (20.1, 20.2, 20.3).
D-4, D-5, D-6, D-7: **Épica 21** — rotación dispersa, regla de aptas, registro de publicaciones, registro de señales (21.1 a 21.4).

**Cobertura no-FR.** SM-8 completo y SM-2 medible salen de la Épica 20; la línea base de SM-5, SM-6 y SM-7 de la 20.4; el proxy de profundidad `vista-de-cita / vista-de-superficie` de la 20.1. Las donaciones (FR-34) siguen apagadas por decisión de Héctor del 2026-10-04 y no entran; el `.com` se deja caducar y solo se corrige la bio de TikTok.

## Epic List — v7

### Épica 20: Se mide antes de mover

Héctor lee, desde series versionadas en el Corpus y no desde un panel ajeno, qué red trae visitas a cualquier superficie, cuánto tráfico orgánico llega cada mes y a qué familia, qué páginas se buscan, y cuántas páginas de cada familia indexa Google. Va primera porque todo lo demás de la fase se juzga con estas series, y hoy la de indexación tiene una lectura, las otras dos no existen y D1 no se ha leído desde este equipo.

**FRs covered:** FR-22 *(completado)*, FR-38 *(criterio de medición aparte)*, FR-40 *(operación)*; D-1, D-2, D-3.
**Notas de implementación:** tres historias de repositorio y una operativa. La 20.1 amplía el vocabulario cerrado **por su módulo** (AD-13): `src/lib/medicion.ts` gana el evento, `Medicion.astro` y `Armazon.astro` lo propagan, las cuatro páginas de agregación lo piden, el receptor lo acepta por importar el vocabulario y no hay migración de esquema; lo que sí hay es un redespliegue del Worker el mismo día, porque hasta entonces el receptor lo descarta en silencio. La 20.2 y la 20.3 son clientes de Search Analytics al patrón de `tools/indexacion.ts` —misma credencial, mismo alcance, misma propiedad derivada de `public/CNAME`, red solo en la cáscara (AD-22)— que escriben dos series en la raíz de `corpus/` que ningún módulo de `src/lib/` lee (AD-24). La 20.4 es la semana manual: credenciales, D1, paneles del canal, inspección de la canónica de Unamuno y Gracián, Bing; existe como historia para que el tablero la cuente, que es lo que no pasó con la 18.3. Restricción que las historias heredan: los clics por consulta de Search Console vienen anonimizados, así que la demanda se agrega **por página**, no por consulta.

### Épica 21: El canal propio lleva al sitio

Quien sigue a Sabiduría de Bolsillo en una red tiene un camino al sitio; lo que se publica es el texto literal del Corpus con su enlace marcado por red; la portada y el canal no repiten una Cita en cuatro meses; y cada publicación y cada señal quedan anotadas para saber, a los 90 días, si la página trae visitas o no la trae. Cierra la 18.2 y deja la 18.1 abierta hasta la primera señal ajena.

**FRs covered:** FR-9, FR-15, FR-44, FR-45; FR-29, FR-30, FR-32 *(en operación)*; D-4, D-5, D-6, D-7.
**Notas de implementación:** dos historias de repositorio sobre la Cita del Día y dos registros. La 21.1 cambia una decisión de implementación —el orden por slug de `citaDelDia`, que agrupa por Autor— por un recorrido en rondas por Autor; es una permutación de las aptas, así que FR-9 y AD-12 se conservan y el RSS y el Kit lo heredan sin tocarse; al desplegar, la Cita de ese día cambia, y se despliega un día sin jornada fijada o se fija la de ese día. La 21.2 no es código: es una lista propuesta por el agente con la regla de D-5, tachada en bloque por Héctor y aplicada con `tools/portada.ts marcar` en un solo commit. La 21.3 y la 21.4 son una orden nueva, `tools/canal.ts`, al patrón de `tools/rastreo.ts`: dos ficheros que **solo añaden** y que ningún módulo de `src/lib/` lee. La plantilla semanal y el camino del enlace —bios, Linktree, campo web de Facebook, el pie con regla de caída— son el trabajo de la 18.2 y no piden nada nuevo al Kit; la Épica 21 les da el registro que les faltaba. Publicar no depende de la Épica 20; medirlo entero, sí: hasta que la 20.1 esté desplegada, solo los enlaces a una Página de Cita dejan fila.

## Epic 20: Se mide antes de mover

Héctor lee, desde series versionadas en el Corpus y no desde un panel ajeno, qué red trae visitas a cualquier superficie, cuánto tráfico orgánico llega cada mes y a qué familia, qué páginas se buscan, y cuántas páginas de cada familia indexa Google. Hoy la serie de indexación tiene una lectura del 4 de septiembre, las de tráfico y demanda no existen, y D1 no se ha leído desde este equipo: todo lo demás de la fase se juzgaría con series que no están.

**FRs covered:** FR-22 *(completado)*, FR-38 *(criterio de medición aparte)*, FR-40 *(operación)*; D-1, D-2, D-3.
**Notas de implementación:** el diseño aprobado está en `docs/superpowers/specs/2026-10-04-ciclo-1-medir-y-canal-design.md` §4 y las notas largas en la lista de épicas de arriba. Lo que las cuatro historias comparten: nada de lo que escriben lo lee el sitio (AD-14, AD-24), la red vive solo en la cáscara de `tools/` (AD-22), y «ausencia antes que cero» rige en toda serie. La 20.4 es manual y va numerada la última, pero sus gestos empiezan el primer día y en paralelo: la 20.2 y la 20.3 se prueban con respuestas fijas y solo se *corren* con la credencial.

### Story 20.1: La vista de una superficie de agregación deja fila

As a editor que publica Piezas que aterrizan en la portada y en las Páginas de Colección,
I want que esas vistas lleguen al receptor con su marca de origen,
So that SM-8 cuente todo lo que el canal trae y no solo lo que enlaza a una Cita.

**Acceptance Criteria:**

**Given** el vocabulario cerrado de `src/lib/medicion.ts`
**When** se construye el sitio con `MEDICION_ENDPOINT` definido
**Then** la portada, la Página de Autor, la de Tema y la de Colección emiten `vista-de-superficie` una sola vez
**And** la Página de Cita sigue emitiendo `vista-de-cita` y no emite el nuevo
**And** `/buscar`, `/404`, `/kit` y `/lote` no lo emiten

**Given** una baliza `vista-de-superficie` con `origen` del conjunto cerrado
**When** la interpreta el receptor
**Then** se registra con jornada, ruta y origen
**And** `destino` y `datos` se descartan en ese evento sin descartar el evento
**And** una carga con campos de más se registra sin ellos

**Given** `medicion/esquema.sql`
**When** se despliega la historia
**Then** no hay migración, porque la columna `evento` admite el nombre nuevo
**And** el Worker se redespliega el mismo día que el sitio
**And** una baliza manual de comprobación aparece en el recuento por evento de D1

**Given** `MEDICION_ENDPOINT` sin definir
**When** se construye
**Then** `dist/` es idéntico byte a byte al anterior a la historia

**Given** el guion en línea con el evento nuevo
**When** corre la prueba de presupuesto
**Then** sigue por debajo de `MAX_BYTES_DE_GUION`
**And** si no cupiera, se abrevia el guion y nunca se sube el tope

**Given** DESPLIEGUE.md §3
**When** se cierra la historia
**Then** documenta las consultas nuevas: SM-8 por origen y evento, y la razón `vista-de-cita / vista-de-superficie` por jornada
**And** la razón se declara como agregado por jornada y no como sesión

### Story 20.2: La serie de tráfico orgánico se versiona desde Search Console

As a editor,
I want una serie mensual de clics e impresiones orgánicos, total y por familia, versionada en el Corpus,
So that SM-2 tenga cifra propia y los Umbrales tengan algún día contra qué medirse.

**Acceptance Criteria:**

**Given** `SEARCH_CONSOLE_CREDENCIALES` ausente
**When** `npm run trafico`
**Then** nombra lo que falta, no escribe nada y sale con código 2

**Given** la credencial
**When** `npm run trafico`
**Then** informa por mes clics, impresiones, CTR y posición, en total y por familia
**And** no escribe nada

**Given** `npm run trafico:registrar`
**When** termina
**Then** `corpus/serie-de-trafico.yml` tiene una entrada por mes, con `leidoEl` y `parcial: true` en el mes en curso
**And** una segunda lectura del mismo mes la reemplaza

**Given** una lectura que falla en un mes o una familia
**When** se registra
**Then** ese mes o familia se omite y aparece en `sinLeer` con su motivo
**And** jamás se escribe un cero
**And** si no se pudo leer nada, código 1

**Given** la red
**When** corre la orden
**Then** solo `tools/trafico.ts` hace peticiones y `tools/lib/trafico.ts` es puro, probado con respuestas fijas
**And** ningún módulo de `src/lib/` importa la serie y ninguna colección de `src/content.config.ts` apunta a ella

**Given** la propiedad
**When** se deriva
**Then** sale de `public/CNAME`, como en la serie de indexación
**And** la cabecera del fichero explica qué mide y por qué reemplaza por mes

### Story 20.3: La demanda medida se versiona por página

As a editor que decide a quién sembrar,
I want saber qué Autores y qué Citas reciben impresiones y clics,
So that la prioridad por demanda de FR-49 tenga un dato versionado en vez de una lectura a ojo.

**Acceptance Criteria:**

**Given** la credencial
**When** `npm run demanda`
**Then** lee la dimensión página de los últimos 28 días, y de 16 meses por mes en la primera lectura
**And** agrega por slug de Autor, atribuyendo cada ruta de Cita por el prefijo de Autor más largo, y por Cita

**Given** filas con menos de cinco impresiones
**When** se agregan
**Then** no se versionan una a una y se suman en un resto declarado

**Given** `npm run demanda:registrar`
**When** termina
**Then** escribe `corpus/serie-de-demanda.yml`, idempotente por fecha
**And** la lectura informa Autores por impresiones, Citas con clic y reparto por familia
**And** `sinLeer`, códigos y ausencia antes que cero como en la 20.2

**Given** un prefijo que no corresponde a ningún Autor del Corpus
**When** se atribuye
**Then** la ruta se cuenta en «sin Autor» y se dice; no se descarta

**Given** `src/lib/objetivo.ts`
**When** corre `npm run huecos`
**Then** no lee la serie: la política no cambia en esta historia
**And** una prueba sostiene que ningún módulo de `src/lib/` la importa

### Story 20.4: La semana cero se lee y se anota

As a dueño del sitio,
I want leer las tres fuentes la misma semana y dejar anotado qué decían,
So that el ciclo tenga línea base y ninguna decisión se tome con la serie de septiembre.

**Acceptance Criteria:**

**Given** este equipo
**When** `cd medicion && npx wrangler whoami`
**Then** hay sesión
**And** las consultas de DESPLIEGUE.md §3 se corren y su resultado queda anotado con fecha junto al informe de datos

**Given** la cuenta de servicio como Propietaria
**When** `npm run indexacion:registrar -- --presupuesto 200`
**Then** la serie gana una lectura, commiteada aparte
**And** gana una segunda en la misma semana

**Given** Search Console
**When** se inspeccionan las dos Páginas de Autor con demanda con y sin barra
**Then** queda anotada la canónica elegida y a qué URL corresponden las 5 «con redirección» y las 2 «duplicadas»
**And** si la canónica es la forma sin barra, se abre una historia antes de tocar la familia Autor

**Given** Bing Webmaster Tools
**When** se consulta
**Then** queda anotado si el sitio está y con cuántas URL
**And** la 16.2 pasa a revisión con esa cifra

**Given** los paneles de Facebook, YouTube Studio, TikTok Creator y Spring
**When** se leen
**Then** sus cifras de ingreso y elegibilidad quedan anotadas con fecha, fuera de `corpus/`

## Epic 21: El canal propio lleva al sitio

Quien sigue a Sabiduría de Bolsillo en una red tiene un camino al sitio; lo que se publica es el texto literal del Corpus con su enlace marcado por red; la portada y el canal no repiten una Cita en cuatro meses; y cada publicación y cada señal quedan anotadas para saber, a los 90 días, si la página trae visitas o no la trae. Hoy 27.722 seguidores en Facebook, 19.700 en TikTok y 19.800 en YouTube no tienen un solo camino comprobado al sitio, y la marca de origen que el Kit compone desde la v2 no la pisa nadie.

**FRs covered:** FR-9, FR-15, FR-44, FR-45; FR-29, FR-30, FR-32 *(en operación)*; D-4, D-5, D-6, D-7.
**Notas de implementación:** el diseño aprobado está en `docs/superpowers/specs/2026-10-04-ciclo-1-medir-y-canal-design.md` §5. La plantilla semanal y el camino del enlace —bio de TikTok al `.net`, el sitio primero en el Linktree, el campo «Sitio web» de la página de Facebook, el pie con regla de caída: Cita publicada, si no Página de Autor, si no portada, siempre con `?de=<red>`— son el trabajo de la 18.2 y no piden nada nuevo al Kit; estas cuatro historias le dan la rotación que no repite, las aptas que la sostienen y el registro que le faltaba. Publicar no depende de la Épica 20; medirlo entero, sí: hasta que la 20.1 esté desplegada, solo los enlaces a una Página de Cita dejan fila. Las donaciones siguen apagadas y el `.com` se deja caducar, por decisión del 2026-10-04.

### Story 21.1: La Cita del Día recorre las aptas en rondas por Autor

As a visitante que vuelve a la portada varios días seguidos,
I want que la Cita del Día no me enseñe tres días seguidos al mismo Autor,
So that volver tenga sentido aunque el conjunto de aptas sea pequeño.

**Acceptance Criteria:**

**Given** el conjunto de aptas
**When** `citaDelDia` ordena
**Then** agrupa por Autor, ordena Autores y Citas por slug, y recorre primero la primera de cada Autor, luego la segunda de cada uno, hasta agotar
**And** el índice sigue siendo los días desde la época módulo el tamaño del conjunto

**Given** dos jornadas consecutivas
**When** la ronda en curso tiene al menos dos Autores
**Then** no comparten Autor
**And** con un solo Autor apto se comporta como hoy

**Given** el recorrido
**When** se mide sobre el conjunto entero
**Then** es una permutación de las aptas: ninguna se repite antes de agotar todas
**And** dos builds del mismo día dan la misma Cita

**Given** una fijación en `corpus/portada.json`
**When** la jornada coincide
**Then** manda sobre la rotación
**And** una fijación a una Cita no apta se ignora y rota

**Given** el RSS y el Kit
**When** se construyen
**Then** heredan el orden sin tocarse
**And** `sindicacion.test.ts` y `kit.test.ts` siguen verdes

**Given** el despliegue de la historia
**When** se publica
**Then** la Cita de ese día cambia: se despliega un día sin jornada fijada o se fija la de ese día
**And** el commit lo dice

### Story 21.2: De 16 Citas aptas a 120 o más, con la regla en el commit

As a editor,
I want ampliar las aptas con una regla escrita,
So that la portada, el RSS y el canal no repitan Cita en cuatro meses.

**Acceptance Criteria:**

**Given** la regla D-5
**When** el agente propone
**Then** la lista entera, con slug, Autor, Tema y caracteres, va en un fichero fuera del repositorio
**And** toda Cita propuesta tiene 160 caracteres o menos y obra declarada
**And** ningún Autor suma más de dos nuevas, ni queda sin una si tiene alguna que cumpla

**Given** la lista
**When** Héctor tacha en bloque
**Then** solo lo no tachado se marca, con `npx tsx tools/portada.ts marcar <slug>` una a una desde un bucle
**And** `npx tsx tools/portada.ts listar` da 120 aptas o más
**And** los 24 Temas tienen al menos una apta

**Given** las 16 aptas de hoy
**When** se aplica la lista
**Then** se conservan

**Given** el commit
**When** se escribe
**Then** es uno solo, `feat(portada)`, y su cuerpo lleva la regla literal y el recuento por Autor y por Tema

**Given** el RSS de 30 jornadas
**When** se construye con las aptas nuevas
**Then** no repite ninguna Cita
**And** el Kit no repite en 120 días

### Story 21.3: Cada publicación del canal queda anotada

As a editor que publica a diario en varias cuentas,
I want anotar qué publiqué, dónde y con qué enlace,
So that a los 90 días se distinga «la página no trae visitas» de «se publicó la mitad de las semanas».

**Acceptance Criteria:**

**Given** `npm run canal -- anotar <red> <formato> <ruta|-> [--fecha AAAA-MM-DD]`
**When** la red está en el conjunto cerrado de `src/lib/redes.ts`, el formato es `foto`, `reel`, `pieza` o `historia`, la ruta es publicable según `src/lib/superficies.ts` o es «-», y la fecha no es futura
**Then** se añade al final de `corpus/publicaciones-de-canal.yml`, con la fecha de hoy si no se dio
**And** nada anterior se reescribe

**Given** una red fuera del conjunto, una ruta que el sitio no publica o una fecha futura
**When** se intenta anotar
**Then** no escribe y sale con 1
**And** una bandera desconocida o argumentos de menos, con 2

**Given** `npm run canal`
**When** se consulta
**Then** lista por semana ISO y red: publicaciones, cuántas enlazan a Cita, Autor, Colección o portada, y cuántas no enlazan
**And** no escribe nada

**Given** el fichero
**When** se lee su cabecera
**Then** dice qué registra, por qué solo añade y qué lo distingue de las series
**And** ninguna colección de `src/content.config.ts` lo carga y ningún módulo de `src/lib/` lo lee

**Given** la 18.2
**When** se juzga si está hecha
**Then** se cierra cuando el registro muestre cuatro semanas ISO seguidas con la foto diaria y el enlace marcado

**Given** la suite
**When** corre
**Then** una prueba cubre altas, los tres rechazos y la lista por semana

### Story 21.4: Cada señal externa queda anotada, propia o ajena

As a dueño del sitio,
I want anotar cada enlace hacia el sitio desde fuera, diciendo si lo puse yo o lo puso otro,
So that cuando la serie de indexación se mueva se sepa si fue por una señal y de qué clase.

**Acceptance Criteria:**

**Given** `npm run canal -- senal <url-origen> <ruta-destino> --tipo propia|ajena [--fecha] [--nota]`
**When** la URL de origen no es del propio dominio, la ruta es publicable y el tipo es uno de los dos
**Then** se añade al final de `corpus/senales-externas.yml`
**And** sin `--tipo` sale con 2

**Given** una URL de origen del propio dominio
**When** se intenta anotar
**Then** se rechaza con 1: una señal interna no es externa

**Given** `npm run canal`
**When** se consulta
**Then** separa señales propias de ajenas, con fecha y destino por familia
**And** dice si existe alguna ajena

**Given** la 18.1
**When** se juzga si está hecha
**Then** no se cierra con señales propias; se cierra con la primera ajena
**And** las propias de la semana del ciclo —bio de TikTok, Linktree, campo web de Facebook, bio de Instagram— se anotan el día que se pongan

**Given** el informe de enlaces de Search Console
**When** pasan dos semanas desde la primera señal propia
**Then** queda anotado si figura como dominio de referencia
**And** esa lectura decide si las señales propias cuentan para algo más que SM-8

---

# v7.1 — La Obra tiene página

Esta parte abre la v7.1, que es el cuarto frente de la fase planificada el 2026-10-04: que la obra tenga página. Lo pidió Héctor el 2026-10-05, con el diseño aprobado ese día en `docs/superpowers/specs/2026-10-05-pagina-de-obra-design.md`, y a diferencia del primer ciclo **sí pasó por el PRD** (§4.19, FR-51…FR-54, §6.6, SM-11), por la espina (AD-25 reescrito, AD-17 y AD-20 enmendados) y por las espinas de UX, que eligieron la composición viendo maquetas a 360 px.

**Lo que esta parte toca fuera de su épica, y por qué.** Las Historias 17.3 y 17.5 se escribieron en la v5 con premisas que la v7.1 revoca: la lista de obras enlazaba a las Citas, dos obras homónimas se desambiguaban **en la Procedencia** y la afiliación se admitía en la Página de Autor. Las tres cosas están ahora prohibidas o mudadas. Por decisión de Héctor del 2026-10-09 las dos historias se reescriben **en su sitio y con su número**, marcadas *(v7.1)*, y no se trasladan: la Épica 17 sigue en backlog y su trabajo sigue siendo suyo.

**El orden que manda el PRD.** Se construye detrás de las Historias 20.1–20.3 y con la serie de indexación leyendo de nuevo (20.4), para que la familia se mida desde su primer despliegue. La ficha va antes que la página, y las reuniones y separaciones de obras ya conocidas se deciden antes de publicar ninguna URL de Obra, porque reunir después rompe una URL. El enlace de afiliación nace apagado.

## Requirements Inventory — v7.1

### Functional Requirements

**Nuevos (§4.19):**

FR-51: **La Página de Obra.** Toda Obra con al menos una Cita publicada tiene página propia, sin umbral de existencia; una Obra sin Citas publicadas no la tiene. Muestra el título de la Obra y su Autor enlazado; el año sigue la regla de FR-42 y, si las Citas que lo declaran discrepan, además se avisa. Lista sus Citas con la tarjeta común, cada una enlazada a su Página de Cita; la canónica de la Página de Obra es la propia. Muestra los Temas que tocan sus Citas. Pagina como el listado de Autor, y las páginas 2+ llevan solo título, Autor y listado. No compone prosa salvo la nota de su ficha, que va después de dónde leerla. Es superficie de lectura: no admite donaciones ni publicidad, y es la única que admite la afiliación. Se alcanza desde la atribución de cada Cita y desde la lista de obras del Autor, también cuando no se indexa. Emite la vista de agregación con su marca de origen. Tiene Tarjeta Social con hechos y nunca con la nota. Expone datos estructurados con la misma identidad que nombran sus Citas. Su `lastmod` es el cambio más reciente entre su ficha y sus Citas. Cumple NFR-8…NFR-10 sea indexable o no.
FR-52: **La Obra se indexa por lo que contiene.** Regla: al menos 2 Citas publicadas y menos del 90 % de las de su Autor. La que no la cumple existe, es rastreable y transmite enlace (`noindex, follow`), y queda fuera del sitemap y de la búsqueda interna. Es una sola regla que consultan igual la página, el sitemap, la búsqueda, el aviso y el informe, y se comprueba sobre el sitio construido. Se recalcula en cada construcción y se corrige sola en los dos sentidos. Mientras la familia esté congelada por SM-11, ninguna Obra entra en el conjunto indexable, ni nueva ni existente, y las que dejen de cumplir la regla salen igual. Ante duplicados en dos lecturas seguidas de FR-40 se baja el tope; nunca se parchea una página.
FR-53: **La Ficha de Obra fija la URL y el título.** La URL lleva Autor y obra y no cambia al corregir el título. Ninguna Obra con Citas publicadas se publica sin ficha: si falta, la construcción se detiene y dice cómo crearla; la crea el sistema al publicarse la primera Cita de una Obra nueva, sin decidir nada. Una ficha que se queda sin Citas avisa y no detiene. El título es siempre una grafía de sus Procedencias. Reunir grafías —nunca partes— o declarar distintas dos obras se decide en la ficha; una grafía la reclama a lo sumo una ficha; el prefijo avisa; dos grafías que solo difieren en mayúsculas, tildes o signos detienen la construcción hasta restituir el literal. Nunca se reescribe la Procedencia, salvo para restituir el literal de su Fuente. Ediciones en venta, nota (≤ 160 caracteres, sin calificar), título y reuniones solo los decide una persona. Reunir dos Obras ya publicadas retira la URL de la absorbida, y se avisa.
FR-54: **Dónde leer esta obra.** Al pie de la primera página: las Fuentes con su licencia y, con edición cotejada, al menos un enlace —al documento si es uno, a la entrada de la obra en su Fuente si son varios—. Nunca afirma un cotejo que no ocurrió: dice cuántas Citas no tienen documento, y una Obra sin ninguna cotejada lo dice y no enlaza edición. Va después de las Citas y nunca entre ellas. Las ediciones en venta van **debajo** de la cotejada y nunca solas. Con el Modelo apagado, o sin ediciones en la ficha, no queda línea, hueco ni contenedor, y la página se construye idéntica con y sin ediciones declaradas.

**Enmendados con trabajo de construcción (§6.6):**

FR-2 *(enmendado)*: cuando la Cita procede de una Obra, la atribución muestra **el título de su Ficha de Obra** enlazado a su Página de Obra y el año que declare la Procedencia de esa Cita, nunca el de la Obra; cuando la Procedencia no nombra obra, lo que declare, sin enlace. También en lo copiado (FR-3) y en todo material de salida.
FR-7 *(enmendado)*: los resultados distinguen también la coincidencia de Obra; solo entran las Obras indexables.
FR-33, FR-35 *(FR-35 reescrito)*: el enlace de afiliación vive solo en la Página de Obra, en el bloque de FR-54 y debajo de la edición cotejada, también en la que no se indexa. La edición la elige una persona en la ficha; sin ficha con ediciones no hay enlace. Ediciones impresas y electrónicas, declaradas como tales. Varias tiendas de un conjunto cerrado; añadir una es un cambio declarado; una tienda da una URL, nunca un guion. La URL de la edición se declara limpia y la marca de afiliado es del Modelo; una URL con marca o de otra tienda se rechaza. La relación comercial se declara en la misma línea que cada enlace. El Umbral dispara **solicitar** la cuenta, no encender.
FR-38 *(enmendado)*: publicar una Obra indexable emite aviso de cambio.
FR-40 *(enmendado)*: la familia Obra entra en el informe y cuenta solo sus páginas indexables.
FR-42, FR-43 *(FR-43 reescrito)*: la lista de obras del Autor se deriva de las Procedencias publicadas, ninguna ficha añade una obra sin Citas, cada obra muestra su recuento y **enlaza a su Página de Obra**, el año solo cuando sus Citas coinciden. La lista no aloja el enlace de afiliación.
FR-47 *(alcance ampliado)*: el `lastmod` de la Página de Obra sale de su ficha, sus Citas y el fichero de su Autor (AD-27; decisión de Héctor del 2026-10-08, que manda sobre la letra de FR-51).
FR-12 *(enmendado, sin trabajo nuevo si FR-2 está hecho)*: toda Cita que procede de una Obra lleva a su Página de Obra desde la atribución.

**Enmendados sin trabajo nuevo:** FR-34 y FR-37 (la Obra es superficie de lectura: ni donaciones ni publicidad), SM-C2 (la Obra **no** entra en su mediana) y SM-C4 (para la afiliación, también el tiempo hasta el contenido de la Página de Obra).

### NonFunctional Requirements

Los NFR-1…NFR-13 siguen vinculando. Los que la v7.1 enmienda o pone a prueba de forma nueva:

- **NFR-1** *(enmendado)* — indexable la Página de Obra que cumple FR-52; la que no, rastreable y fuera del sitemap, como las páginas 2+.
- **NFR-3** *(enmendado)* — los datos estructurados de cada Página de Cita nombran la obra de la que procede con la misma identidad que su Página de Obra: el `isPartOf` de la Cita y el `about` de la Obra comparten `@id`, la URL canónica de la Obra, también cuando no se indexa.
- **NFR-4** — la URL de una Obra no se recalcula nunca; la única ruptura declarada es la de la absorbida al reunir.
- **NFR-5** — la Página de Obra sin indexar sigue a los mismos saltos que el resto: la alcanzan la atribución y la lista de obras.
- **NFR-7** — el tiempo hasta el contenido de la Página de Obra se mide con el listón de NFR-7 (SM-C4); el tope de guion se comprueba donde se admite un Modelo.
- **NFR-8…NFR-10** — la Página de Obra entra en el barrido de accesibilidad y móvil por la declaración única de `superficies.ts`, indexable o no; las ediciones en venta nunca interrumpen la lectura.
- **NFR-12** — el título de una Obra nunca se recorta ni se encoge: parte palabras antes que desbordar.
- **NFR-13** *(ampliado)* — ninguna agregación repite a otra; la Obra que es casi todo su Autor no se indexa.

### Additional Requirements

De la espina v7.1. Ninguna tecnología nueva.

- **AD-25 — la Obra se deriva; la ficha ancla su URL.** Identidad (Autor, forma canónica con `normalizar`, AD-3); una ficha reclama exactamente las formas de su lista, explícita y sin valor por omisión. Ficha en `corpus/obras/{slug-autor}--{slug-obra}.yml`, con `slugDeObra` **sin la truncación del documento**; el nombre es el slug y no se recalcula; el build casa ficha y Obra por identidad y exige que el prefijo de Autor coincida.
- **AD-25 — una sola función de `tools/lib/` crea la ficha**: busca la forma entre activas y retiradas, restaura la retirada, nunca sobrescribe, se niega ante colisión de nombre. La llaman en el mismo gesto aprobar, dar de alta y documentar, y ninguna otra.
- **AD-25 — puertas.** Obra con Citas sin ficha rompe el build con la orden que la crea; ficha sin Citas avisa; retirar una ficha la mueve a `corpus/_obras-retiradas/` y se niega mientras una Cita publicada o candidata la resuelva; **retirar un Autor se bloquea también por sus fichas** (`tools/autor.ts`).
- **AD-25 — puerta ortográfica.** Rompe mientras un grupo de grafías equivalentes del mismo Autor contenga alguna que no sea literal de su Fuente (una Cita sin documento no es literal). Prefijo avisa. Título que deja de ser literal avisa y cae a la grafía por omisión de una regla fija de `obras.ts`; retirar y documentar actualizan la ficha en el mismo gesto.
- **AD-25 — `src/lib/obras.ts` es dueño de los atributos derivados** (título publicado, año coincidente, Fuentes y edición cotejada, Temas, recuento). **Migración:** hoy componen la obra por su cuenta la Atribución, los datos estructurados de la Página de Cita, la Tarjeta Social, la Imagen de Cita y la Imagen del Kit; todos pasan a consumir la Obra resuelta, y ninguno lee la Procedencia para mostrarla.
- **AD-25 — la congelación de SM-11** es una declaración versionada con un solo dueño, junto a los números de FR-52 en `umbrales.ts`: fija la lista de identidades indexables. Entra en la función de indexabilidad como dato, nunca como lectura de la serie de AD-24; rastreo, ediciones y Piezas consultan la misma declaración. Congelar y levantar son commits.
- **AD-25 — superficie.** `/obra/{slug-autor}/{slug-obra}/` (`src/pages/obra/[autor]/[slug]/[...page].astro`), declarada en `superficies.ts` como servicio por contenido. La indexabilidad no se declara en ninguna ficha.
- **AD-11 — `rutasIndexables`.** `rutasPublicadas` sigue significando «existe y es alcanzable» y enumera todas las Obras; `publicado.ts` expone además `rutasIndexables`, que usan el rastreo, el informe, el aviso y la prueba del sitemap.
- **AD-17 — servicio por contenido.** `superficies.ts` recibe la lista positiva de rutas indexables y no la calcula; **falla cerrado** sin ella o con ella sin calcular; expone la **causa** del servicio (forma o contenido); una sola entrada después de la puerta de admisión, con el mismo esquema exportado; el filtro síncrono del sitemap la recibe de una integración en `astro:build:start`; y **en `astro:build:done`, sobre el `dist/` real**, el sitemap anuncia exactamente las rutas sin `noindex` y el índice interno las mismas, o rompe el build.
- **AD-20 v7.1 — admisión por forma.** Las páginas 2+ no admiten ningún Modelo; la primera página de una Obra sin indexar **sí** admite la afiliación. La afiliación se rechaza en cualquier otra superficie (revoca la Cita y el Autor de la v5). La Obra es superficie de lectura. Tiendas: conjunto cerrado con dominio y marca, junto al estado del Modelo; la ficha declara la URL limpia y una función pura compone la final; **la forma de una edición es puerta del esquema** de las fichas, encendido o apagado. La edición en venta solo se pinta dentro del bloque cotejado. Lo marcado con `data-ingreso` es subconjunto de lo encendido y admitido en esa ruta; presentación en atributos `style`. La historia que admita la afiliación en la Obra construye la admisión por predicado de ruta (17.5), para que `/obra/a/b/2/` no herede el enlace.
- **AD-16 v7.1** — la pregeneración por Obra (Tarjeta de Obra, `src/pages/tarjeta/obra/[autor]/[slug].png.ts`) es función de su ficha y sus Citas.
- **AD-19 v7.1** — la Página de Obra usa la misma tarjeta; su canónica es la propia; la duplicación con el Autor la resuelve FR-52, no una canónica cruzada.
- **AD-23 v7.1** — ninguna operación sobre la Obra reescribe la Procedencia; la única reescritura es **restituir el literal**: documentar una Cita y, en una Cita del censo sin documento, igualar su grafía de obra a la cabecera de un documento versionado de esa misma obra. Literal = igual a esa cabecera colapsando espacios.
- **AD-24 v7.1** — la familia Obra entra en la serie; su censo es `rutasIndexables`; mientras rija SM-11, Autor y Obra se leen **enteras** la misma jornada (~147 URL) y la entrada anota qué conjunto midió.
- **AD-27 v7.1** — cinco familias; aviso y `lastmod` derivan de una sola relación superficie→ficheros (hoy en dos módulos, fijados inversos por una prueba). La Página de Obra se compone de su ficha, sus Citas y el fichero de su Autor. Las hermanas cuentan solo cuando cambia su indexabilidad, detectado comparando la lista indexable de antes y de después; se anuncia toda ruta de Obra cuyo estado anunciable cambió, incluida la que desaparece. El aviso toma las rutas del sitemap construido.
- **AD-28** — la Tarjeta de Obra lleva solo hechos; la licencia de la Fuente la publica la superficie que reproduce el texto («Dónde leer esta obra»).
- **AD-13** — la Página de Obra emite `vista-de-superficie` (20.1): no amplía el vocabulario, lo usa.

**Trabajo de datos previo a publicar ninguna URL de Obra (PRD §6.6):** decidir en las fichas las reuniones y separaciones ya conocidas —«Del sentimiento trágico de la vida/I» con «Del sentimiento trágico de la vida», «Sobre la brevedad de la vida» frente a «De la brevedad de la vida», los dos «Proverbios y cantares» y «Sor/sor Filotea» (20 contra 1, viva en la puerta ortográfica)—. Lo decide Héctor; el agente propone.

**Preguntas abiertas que heredan las historias** (SPEC v7.1, sin cerrar por `bmad-architecture`): dónde vive exactamente la congelación —«junto a los números de FR-52 en `umbrales.ts`», que es código, y a la vez «como dato del corpus»—; si la entrada de la Tarjeta de Obra incluye el fichero del Autor (AD-16 dice ficha y Citas; AD-27 y el `lastmod` ya lo cuentan); y qué conjunto admiten los registros de canal y de señales: rutas publicadas o solo indexables.

**Hallazgo de datos para el PM** (UX v7.1): «Odas, 1909» de Horacio es el año de la traducción de Salinas, no el de la Obra; con la Cabecera de Obra saldría «de Horacio · 1909». Es del modelo de datos de FR-48 (Historia 19.1, en backlog).

### UX Design Requirements

Numeración continua desde la v3 (UX-DR37). Referencia visual: [`mockups/pagina-de-obra.html`](ux-designs/ux-brainlySabiduria-2026-08-10/mockups/pagina-de-obra.html) y [`mockups/buscar.html`](ux-designs/ux-brainlySabiduria-2026-08-10/mockups/buscar.html), sin divergencias anotadas.

UX-DR38: **Cabecera de Obra** (variante A), en todas las páginas de la Obra. `h1` = título de la ficha en `{typography.title-lg}` (Inter 600, 26 px) y `{colors.on-surface}`, líneas equilibradas y **sin máximo de líneas ni segundo tamaño**; parte palabras antes que desbordar (`overflow-wrap` y guiones con el `lang` del documento). Debajo, a `{spacing.unit}`, «de {Autor} · {año}» en `body-md`: «de» y el año en `on-surface-variant`, el nombre en `on-surface`, subrayado y con zona de toque de 44 px por relleno vertical y margen negativo; el punto medio oculto al lector de pantalla, que oye una coma. Sin traductor. El listado empieza 4 × `{spacing.unit}` más abajo, con su filete.
UX-DR39: **Token `--titular-obra`** para `{typography.title-lg}`, declarado en la hoja global —no `--titular-lg`, que se confundiría con los titulares serif—. El título de una Obra va en Inter en toda superficie: Cabecera, Atribución, Lista de Obras, resultado de búsqueda y Tarjeta. Nunca Source Serif.
UX-DR40: **Listado de Obra.** `TarjetaDeCita` sin repetir el nombre del Autor, ordenado como la Página de Autor, paginado por encima de 50 Citas con la Paginación común; cada tarjeta enlaza a su Página de Cita.
UX-DR41: **Temas de la Obra**, solo en la primera página y después del listado: `h2` «Temas», todos los Temas publicados que tocan sus Citas, sin tope, con el Chip de Tema común, ordenados por cuántas Citas de la Obra tocan y por nombre a igualdad, sin recuento visible. Sin Temas, ni rótulo ni hueco.
UX-DR42: **Dónde leer esta obra** (estructura D2), al pie de la primera página: `h2` y, debajo, partes con rótulo `h3` —«Edición cotejada, gratuita» y, solo con el Modelo encendido, «Ediciones en venta»— en `caption` con el peso de `author` y en `on-surface`. Bajo la cotejada, una línea por Fuente, empezando por la que más Citas aporta, con su licencia; el enlace es **el nombre de la Fuente**, al documento o a la entrada de la obra repartida, diciendo en cuántas páginas («Wikisource en español, repartida en 12 páginas. Licencia CC BY-SA 4.0.»). Ritmo del pie: 5 × de la paginación a «Temas», 4 × hasta «Dónde leer», 2 × del `h2` al primer rótulo, 1 × del rótulo a sus líneas.
UX-DR43: **Ediciones en venta.** Lista en el orden de la ficha: «Edición impresa en {tienda}: {descripción}.» o «Edición electrónica en {tienda}: {descripción}.» (descripción opcional), seguida en la misma línea de «Enlace de afiliado: si compras, el sitio recibe una comisión sin coste para ti.». El enlace es «Edición {impresa|electrónica} en {tienda}», `rel="sponsored noopener"`, pestaña nueva avisada en el nombre accesible y la declaración asociada por `aria-describedby`. Todo —`h3` y lista— dentro de un único elemento `data-ingreso="afiliacion-de-libros"`, **nunca un `aside`**, con la presentación en atributos `style`. Solo en la primera página.
UX-DR44: **Nota de la Ficha de Obra**, solo si la ficha la trae: después de «Dónde leer», **fuera** de su sección, precedida de filete `outline-variant` y sin encabezado, en `caption` y `on-surface-variant` dentro de la medida de prosa (4 × por encima del filete, 3 × por debajo). Nunca en la Tarjeta Social ni en la meta description.
UX-DR45: **Atribución E2** en la Página de Cita: el título de la ficha, enlazado a la Página de Obra —también cuando no se indexa—, en `on-surface` y **subrayado siempre**, dentro de la línea de la Procedencia en `caption`; detrás, sin enlace, el año de esa Procedencia. Zona efectiva de al menos 3 × `{spacing.unit}` sin solapar otra. Lo declarado sin obra va sin enlace.
UX-DR46: **Lista de Obras** (enmienda de la 17.3): una entrada por fila con alto de 44 px y filete; título de la ficha en Inter a la izquierda, recuento en `on-surface-variant` y cifras tabulares a la derecha; **cada entrada enlaza a su Página de Obra**; bajo el rótulo «Su obra en este Corpus»; al pie, «Y una cita sin obra documentada.» / «Y {n} citas sin obra documentada.», y sin ninguna, nada. Sin enlace comercial, idéntica con el Modelo apagado o encendido.
UX-DR47: **Resultado de búsqueda de tipo Obra** en `/buscar/`: rótulo «Obra», título en Inter —nunca serif, aunque los demás tipos lleven el suyo en serif— y debajo el nombre del Autor, que pide un metadato nuevo en el índice de Pagefind. Nombre accesible «Obra: {título}, de {Autor}». Solo Obras indexables.
UX-DR48: **Tarjeta Social de Obra**: la de listado, con banda siena, el título en la familia de la interfaz y como bajada «{n} citas de {Autor}, {año}» —el año solo si consta el de la Obra, «1 cita de…» en singular—. Nunca la nota ni el traductor.
UX-DR49: **Voz de la Obra.** «frases» va **solo** en el título de pestaña y la meta description de la Página de Obra: `Frases de {Autor} en {Título} | Sabiduría de Bolsillo` y, en 2+, `… — página {N} | …`. El cuerpo y la Tarjeta dicen «citas». La meta description se compone de hechos y omite el año si discrepa o falta.
UX-DR50: **Estados de la Obra.** (a) `noindex` por una Cita o ≥ 90 % de su Autor: la misma página para el visitante, sin marca ni aviso, con «Dónde leer» y ediciones si procede; (b) páginas 2+: Cabecera y listado, sin Temas, «Dónde leer», nota ni ediciones, `noindex`; (c) sin ninguna Cita cotejada: bajo el `h2`, solo «Ninguna de sus citas tiene todavía documento cotejado.», **sin** el rótulo de la edición cotejada, sin enlace y sin ediciones aunque la ficha las declare; (d) algunas sin documento: «Una de sus 27 citas no tiene documento cotejado.» / «{n} de sus {total} citas no tienen documento cotejado.»; (e) Modelo apagado o ficha sin ediciones: ni rótulo, línea, hueco, contenedor ni regla CSS; (f) Obra absorbida: su URL da el 404 común y la Atribución de sus Citas enlaza a la que las reúne; (g) año discrepante o ausente: se omite en Cabecera, Lista de Obras, meta y Tarjeta, nunca se infiere, y si discrepa el build avisa.
UX-DR51: **Obra traducida (FR-48)**, cinco reglas decididas aunque hoy ninguna Cita trae traductor: Atribución «Odas. Traducción de {traductor}, 1909.»; lo copiado ««…» — Horacio, Odas, trad. de {traductor}, 1909.»; Cabecera sin traductor y sin año si solo consta el de la traducción; en «Dónde leer», «Wikisource en español, en la traducción de {traductor} (1909). Licencia …», una línea por traducción; Imagen, Tarjeta y Pieza sin traductor. Va con la Historia 19.1, que es la que conserva el traductor.
UX-DR52: **Siena = actuar o salir; tinta subrayada = información.** En toda línea de texto, el enlace se subraya siempre, sea tinta o siena (WCAG 1.4.1); los enlaces de bloque no. Pestaña nueva solo para donar, compartir y comprar.
UX-DR53: **Defectos anotados** de `EXPERIENCE.md § Defectos anotados`, nueve en lo construido: foco suprimido en el campo de búsqueda (`/buscar/` y 404); números de la Paginación más juntos que `{spacing.unit}`; nombre accesible del Diálogo de Imagen que dice «Descargar» donde comparte; destinos de «Compartir la cita» sin «Compartir en {destino}» ni aviso de pestaña nueva; previsualización vacía cuando el generador no carga; zona ampliada del nombre del Autor que invade la línea de la Procedencia; enlaces del pie a las cuentas sociales que abren pestaña nueva; **ninguna región `role="status"` en el sitio** (WCAG 4.1.3); nombre del Autor en la Atribución subrayado solo al pasar el cursor. Por decisión de Héctor del 2026-10-09, historia de corrección aparte dentro de la Épica 22.

### FR Coverage Map — v7.1

FR-53: **Épica 22** — la Ficha de Obra ancla URL y título; la crea el sistema; sus puertas y la de grafías (22.1, 22.2).
FR-2, FR-3: **Épica 22** — la Obra se nombra con el título de su ficha en toda superficie y material de salida (22.3), y la atribución lleva a su página (22.4, 22.5).
FR-51: **Épica 22** — la Página de Obra (22.4), su Tarjeta Social (22.7).
FR-52: **Épica 22** — la indexabilidad por contenido nace con la página, no antes (22.4); la congelación de SM-11 la fija (22.8).
FR-54: **Épica 22** — «Dónde leer esta obra» y la nota (22.6).
FR-7: **Épica 22** — la Obra indexable en `/buscar/` (22.7).
FR-12: **Épica 22** — sale sola de la atribución enlazada (22.4).
FR-38, FR-40, FR-47: **Épica 22** — aviso, familia Obra en el informe y `lastmod` desde una sola relación (22.8).
FR-33, FR-35: **Épica 22** — las ediciones en venta, construidas y apagadas, solo en la Obra (22.9), sobre la admisión por ruta de la **17.5**.
FR-42, FR-43: **Épica 17** — la Lista de Obras enlaza a la Página de Obra (**17.3**, reescrita *(v7.1)*, construida después de la 22.4).
FR-48: **Épica 19** — el traductor y el año de la traducción se separan del año de la Obra, también en lo publicado (**19.1**, reescrita *(v7.1)*, construida antes de la 22.4).
FR-34, FR-37: **Épica 22, sin trabajo propio** — la revisión de la declaración rechaza donaciones y publicidad en la Obra (22.4).
SM-11: **Épica 22** — la familia se lee aparte desde el primer despliegue y la congelación es una declaración versionada (22.8).

**Cobertura UX-DR.** UX-DR38–41 y UX-DR49–50(a, b, g): 22.4. UX-DR45, UX-DR52 en la Atribución y la Cabecera de Obra, y los defectos del subrayado y de la zona ampliada del nombre del Autor: 22.5. UX-DR42, UX-DR44 y UX-DR50(c, d, e): 22.6. UX-DR47 y UX-DR48: 22.7. UX-DR43: 22.9. UX-DR50(f): 22.2. UX-DR46: 17.3. UX-DR51: 19.1, con su regla de la Cabecera en la 22.4 y la de «Dónde leer» en la 22.6. UX-DR52 en el resto del sitio y los otros siete defectos de UX-DR53: 22.10.

**Cobertura no-FR.** SM-C2 no se extiende (sin trabajo). SM-C4 para la afiliación: el tope de guion y el tiempo hasta el contenido se miden en la Obra (17.5, 22.9). Medido el 2026-10-09 para la mesa redonda: **63 Citas publicadas en 4 Obras** llevan como año el de su traducción —Odas 35 (Salinas, 1909), Consolación a Marcia 14 (1884), La Eneida 8 (1869), Fedro 6 (1871)—, y 64 traducidas no llevan año; por eso la 19.1 va antes de la página.

## Epic List — v7.1

### Épica 22: La obra tiene página

Quien llega por una Cita pulsa el título de su obra y lee juntas las demás Citas de ese libro, sabe de qué Fuente y bajo qué licencia salió su texto y dónde leer la obra entera; la obra que no repite otra página capta su propia consulta. Héctor ve la familia medida aparte desde su primer despliegue, con un freno declarado, y el enlace de compra queda construido y apagado en el único sitio donde puede vivir.

**FRs covered:** FR-51, FR-52, FR-53, FR-54; FR-2, FR-3, FR-7, FR-12, FR-33, FR-35, FR-38, FR-40, FR-47 *(enmendados)*; FR-34, FR-37 *(sin trabajo)*; SM-11.
**Notas de implementación:** una sola épica porque todo está diseñado y validado y casi todo toca los mismos ficheros (`obras.ts`, `publicado.ts`, `superficies.ts`, `/obra/`, la Atribución); la única frontera de riesgo —que el buscador no indexe la familia— no la resuelve partir, la gobierna SM-11. **Orden en el tablero:** 20.1–20.3 → **19.1** → 22.1–22.3 → 22.4 → **17.3** → el resto; la **17.5** antes de la 22.9. La ficha va antes que la URL (AD-25), las reuniones de obras conocidas las decide Héctor antes de publicar ninguna URL (22.2), la indexabilidad nace con la página porque sin rutas de Obra su comprobación sobre el `dist/` pasaría en vacío (decisión de la mesa del 2026-10-09), y el subrayado del Autor viaja con la Atribución E2 para que ninguna página enseñe el título subrayado y el Autor no. Fuera de la épica y reescritas en su sitio: 17.3, 17.5 y 19.1.

## Epic 22: La obra tiene página

Quien llega por una Cita pulsa el título de su obra y lee juntas las demás Citas de ese libro, sabe de qué Fuente y bajo qué licencia salió su texto y dónde leer la obra entera; la obra que no repite otra página capta su propia consulta —«frases del Oráculo manual» es otra búsqueda que «frases de Gracián»—. Héctor ve la familia medida aparte desde su primer despliegue, con un freno declarado, y el enlace de compra queda construido y apagado en el único sitio donde puede vivir.

**FRs covered:** FR-51, FR-52, FR-53, FR-54; FR-2, FR-3, FR-7, FR-12, FR-33, FR-35, FR-38, FR-40, FR-47 *(enmendados)*; FR-34, FR-37 *(sin trabajo)*; SM-11.
**Notas de implementación:** se construye detrás de 20.1–20.3 y con la serie de indexación leyendo (20.4), y la página detrás de la **19.1**: medido el 2026-10-09, 63 Citas de 4 Obras publican como año el de su traducción, y la Cabecera de Obra lo afirmaría de la Obra. La 22.1–22.3 no publican ninguna URL nueva: la ficha va antes que la URL (AD-25) y las reuniones conocidas se deciden antes de la primera. La indexabilidad nace con la página (22.4) porque sin rutas de Obra su comprobación sobre el `dist/` pasaría en vacío. La 17.3 se construye después de la 22.4 y la 17.5 antes de la 22.9. Ningún agente escribe ediciones en venta, notas, títulos ni reuniones: los propone y los decide Héctor.

### Story 22.1: Cada Obra tiene ficha antes de tener URL

As a editor del Corpus,
I want que el sistema cree una ficha por Obra que fije su URL desde el primer día,
So that corregir una tilde del título nunca mueva una página ni rompa un enlace ya publicado.

**Acceptance Criteria:**

**Given** la colección nueva `corpus/obras/` en `src/content.config.ts`
**When** se declara
**Then** cada ficha lleva `autor`, `titulo` y `formas` —la lista explícita y completa de formas canónicas que reclama, sin valor por omisión—, y su esquema se exporta para que todo lector fuera de la colección analice las fichas con él y nunca como YAML crudo (AD-17, AD-1)
**And** la identidad de una Obra es el par (Autor, forma canónica) con `normalizar` de `src/lib/normalizar.ts` (AD-3): el ámbito es el Autor y el título nunca interviene en ella

**Given** el nombre de una ficha
**When** se crea
**Then** es `{slug-autor}--{slug-obra}.yml`, con `slugDeObra` de `src/lib/slug.ts` **sin la truncación del documento de Fuente**, y no se recalcula nunca (AD-4)
**And** el build casa ficha y Obra por identidad, no por nombre, y rompe si el prefijo de Autor del nombre no coincide con su campo `autor`

**Given** una Cita publicada cuya obra no reclama ninguna ficha
**When** se construye el sitio
**Then** el build rompe nombrando la Obra, su Autor y la orden exacta que crea la ficha (FR-53)
**And** una forma reclamada por dos fichas también rompe, nombrando las dos

**Given** una ficha cuya Obra se queda sin Citas publicadas
**When** se construye
**Then** avisa y no rompe: retirar una Cita no puede tumbar el sitio (AD-18)

**Given** una sola función de `tools/lib/` que crea la ficha
**When** `revisar --aprobar`, `alta` o `documentar` dejan publicada una Cita con una obra sin ficha
**Then** la crea en el mismo gesto, con el título por la regla fija de grafía por omisión y sin decidir nada más
**And** esa regla la declara esta historia en `src/lib/obras.ts`, el módulo que la 22.3 completa, porque la misma la usará el build cuando un título deje de ser literal (AD-25)
**And** busca la forma entre las fichas activas y las de `corpus/_obras-retiradas/`, restaura la retirada en vez de crear otra, nunca sobrescribe y se niega ante una colisión de nombre
**And** escribir una candidata en `corpus/_revision/` no crea ficha

**Given** el Corpus de hoy —1.894 Citas, 182 Obras medidas el 2026-10-05—
**When** se siembran las fichas iniciales
**Then** las crea la misma función, por una orden, en un commit propio y ninguna a mano
**And** el informe dice cuántas creó y cuántos grupos de grafías equivalentes encontró, para la 22.2

**Given** retirar una ficha
**When** se pide con su orden y su motivo
**Then** la mueve a `corpus/_obras-retiradas/` (AD-2) y se niega, con código 1 y sin mover nada, mientras una Cita publicada o candidata la resuelva; sin motivo sale con 2
**And** `tools/autor.ts retirar` añade las fichas del Autor a la lista de lo que lo bloquea, dicha toda a la vez

**Given** esta historia terminada
**When** se construye el sitio
**Then** el `dist/` es idéntico al de antes: ninguna ruta, enlace ni texto cambia todavía

### Story 22.2: Una obra, un nombre: las grafías se deciden en la ficha

As a editor del Corpus,
I want que el build me diga qué grafías de una misma obra discrepan y que reunirlas o separarlas sea editar una ficha,
So that ninguna obra se publique con dos nombres ni haya que reescribir la Procedencia para unirlas.

**Acceptance Criteria:**

**Given** un grupo de grafías del mismo Autor que normalizan igual pero se escriben distinto
**When** alguna no es literal de su Fuente —igual a la cabecera de su documento colapsando espacios y nada más; una Cita sin documento no es literal—
**Then** el build rompe nombrando ficheros y formas, y dice cómo restituir el literal (AD-25, AD-23)
**And** cuando todas son literales no rompe y publica el título de la ficha: el título lo elige una persona entre ellas

**Given** una Cita del censo, sin documento, cuya grafía de obra discrepa de la cabecera de un documento versionado de esa misma obra
**When** se restituye con su orden
**Then** su grafía se iguala a esa cabecera y no se toca nada más, ni se la saca del censo: es la única reescritura de la Procedencia admitida además de documentar (AD-23)
**And** «Respuesta a Sor/sor Filotea de la Cruz» (20 contra 1) deja de romper así, sin reescribir ninguna Cita a mano

**Given** dos formas del mismo Autor en que una es prefijo de la otra
**When** se construye
**Then** avisa sin romper, y reunirlas o declararlas distintas en la ficha (`distintaDe`) silencia el aviso

**Given** reunir dos grafías de una misma obra
**When** se añaden a las `formas` de una ficha con `npm run obra -- reunir`
**Then** ninguna Cita ni ningún documento se mueve, y la Procedencia sigue diciendo lo que dice su Fuente (FR-53)
**And** la ficha reúne grafías, nunca partes: las 35 fábulas sueltas de Fedro siguen siendo Obras distintas

**Given** cambiar el título publicado
**When** se pide con `npm run obra -- titular`
**Then** solo se admite una grafía que declare una Procedencia de la Obra; una escrita de nuevo se rechaza con código 1
**And** si el título deja de ser literal porque se retiró o se documentó la Cita que lo sostenía, el build avisa y publica la grafía por omisión de `obras.ts`, y `documentar` y `retirar` actualizan la ficha en el mismo gesto

**Given** reunir dos Obras que ya tienen URL
**When** se reúnen
**Then** la orden avisa de que la URL de la absorbida dará 404, que es la ruptura declarada de NFR-4, y la redirección sigue aplazada (UX-DR50 f)

**Given** las reuniones y separaciones ya conocidas —«Del sentimiento trágico de la vida/I» con «Del sentimiento trágico de la vida», «Sobre la brevedad de la vida» frente a «De la brevedad de la vida», los dos «Proverbios y cantares» y «Sor/sor Filotea»—
**When** se cierra la historia
**Then** el agente propone cada una con sus datos, **Héctor decide** y se aplican con la orden en un commit propio, antes de que la 22.4 publique ninguna URL de Obra

### Story 22.3: La obra se llama igual en todas partes

As a visitante que copia, descarga o comparte una Cita,
I want que la obra se nombre igual en la página, en lo que copio, en la imagen y en la tarjeta,
So that la misma obra no aparezca con dos nombres según por dónde la mire.

**Acceptance Criteria:**

**Given** `src/lib/obras.ts`, que la 22.1 abrió con la regla de grafía por omisión
**When** se completa
**Then** resuelve cada Cita a su Obra por identidad y es dueño de sus atributos derivados —título publicado, año cuando las Citas que lo declaran coinciden, Fuentes y si hay edición cotejada, Temas y recuento— (AD-25)
**And** es puro (AD-5) y recibe las Citas y las fichas después de la puerta de admisión

**Given** una Obra cuyas Citas declaran años distintos
**When** se construye
**Then** el año de la Obra se omite y el build avisa; nunca se infiere (FR-42)
**And** el año de una traducción nunca cuenta como año de la Obra (Historia 19.1)

**Given** la Atribución, los datos estructurados de la Página de Cita, la Tarjeta Social, la Imagen de Cita y la Imagen del Kit
**When** nombran la obra de una Cita
**Then** consumen la Obra resuelta y usan el título de su ficha; `atribucion.ts` compone a partir de ella y ninguno lee la Procedencia para mostrarla
**And** una prueba lo fija: fuera de `obras.ts` y de la admisión, ningún módulo lee `procedencia.obra`
**And** `public/islas/imagen.js`, que no puede importar de `src/`, recibe el título ya compuesto en el marcado

**Given** lo copiado (FR-3)
**When** se compone
**Then** lleva el título de la ficha y el año que declara la Procedencia **de esa Cita**, nunca el de la Obra: 129 Citas sin año pertenecen a Obras que sí lo tienen y lo mostrarían falso

**Given** las 21 Citas de la «Respuesta a sor Filotea de la Cruz»
**When** se publican
**Then** todas nombran la Obra con el mismo título, en la página y en todo material de salida

**Given** esta historia terminada
**When** se mira la Atribución
**Then** el título todavía no enlaza a nada: la Página de Obra no existe hasta la 22.4

### Story 22.4: La obra tiene página, y solo se indexa si no repite otra

As a visitante que llegó por una Cita,
I want pulsar el título de su obra y leer juntas las demás Citas de ese libro,
So that una frase suelta me lleve a la obra de la que sale.

**Acceptance Criteria:**

**Given** la **Historia 19.1** terminada
**When** empieza esta historia
**Then** ninguna Procedencia publicada declara como año de la Obra el de su traducción; sin eso esta historia no empieza, porque la Cabecera lo afirmaría

**Given** toda Obra con al menos una Cita publicada
**When** se construye el sitio
**Then** tiene página en `/obra/{slug-autor}/{slug-obra}/` (`src/pages/obra/[autor]/[slug]/[...page].astro`), con el slug de su ficha, declarada en `src/lib/superficies.ts` como **servicio por contenido** (AD-17)
**And** una Obra sin Citas publicadas no tiene página

**Given** la primera página de una Obra
**When** se sirve
**Then** lleva la Cabecera de Obra (UX-DR38) con el token `--titular-obra` declarado en la hoja global (UX-DR39), el Listado de Obra (UX-DR40) y los Temas de la Obra (UX-DR41), según `mockups/pagina-de-obra.html`
**And** no compone prosa: ni sinopsis, ni contexto, ni adjetivos (FR-51)
**And** con traductor, la Cabecera no lo nombra y omite el año si solo consta el de la traducción (UX-DR51)

**Given** una Obra de más de 50 Citas
**When** se pagina
**Then** las páginas 2+ llevan solo la Cabecera y el listado, `noindex` como toda página 2+ (UX-DR50 b)
**And** el título de pestaña y la meta description siguen UX-DR49: «Frases de {Autor} en {Título}», y el cuerpo dice «citas»

**Given** la regla de FR-52 —al menos 2 Citas y menos del 90 % de las de su Autor, los dos números en `src/lib/umbrales.ts`—
**When** se calcula
**Then** `src/lib/publicado.ts` expone `rutasIndexables` como subconjunto de `rutasPublicadas`, que sigue enumerando todas las Obras (AD-11)
**And** `superficies.ts` recibe la lista sin calcularla, **falla cerrado** sin ella o con ella sin calcular, y expone la causa del servicio, forma o contenido
**And** el filtro síncrono del sitemap la recibe de una integración en `astro:build:start`

**Given** una Obra que no cumple la regla
**When** se sirve
**Then** es la misma página para el visitante, sin marca ni aviso, con `noindex, follow`, fuera del sitemap y fuera del índice de Pagefind (NFR-1, UX-DR50 a)

**Given** el `dist/` real
**When** termina cada construcción (`astro:build:done`)
**Then** el sitemap anuncia exactamente las rutas sin `noindex`, el índice interno las mismas, y si no coinciden el build rompe

**Given** un Autor cuyas demás obras llegan al 10 % de sus Citas
**When** se reconstruye sin tocar ninguna ficha
**Then** la Obra que era casi todo su Autor pasa a indexarse, y una indexada que deja de cumplir la regla sale del sitemap: se corrige sola en los dos sentidos (FR-52)
**And** la indexabilidad no se declara en ninguna ficha

**Given** la Atribución de una Cita que procede de una Obra
**When** se sirve
**Then** su título enlaza a la Página de Obra, también cuando esta no se indexa (FR-2, FR-12, NFR-5)

**Given** los datos estructurados
**When** se emiten
**Then** el `about` de la Página de Obra y el `isPartOf` de cada una de sus Citas comparten `@id`: la URL canónica de la Página de Obra, también cuando no se indexa (NFR-3)
**And** la canónica de la Página de Obra es la propia, y la de cada Cita sigue siendo su Página de Cita (NFR-13)

**Given** la Página de Obra
**When** carga
**Then** emite `vista-de-superficie` con su marca de origen (FR-22, Historia 20.1), como las demás agregaciones

**Given** la declaración de Modelos de `src/lib/ingreso.ts`
**When** se revisa
**Then** rechaza donaciones y publicidad en la Página de Obra, que es superficie de lectura (FR-34, FR-37)

**Given** el barrido de accesibilidad y móvil
**When** corre
**Then** incluye una Obra indexable, una con `noindex`, una página 2+ y un título que parte en cinco líneas a 360 px sin desplazamiento horizontal, porque las cuatro salen de la misma declaración (NFR-8…NFR-10, NFR-12)

**Given** el primer despliegue
**When** se publica
**Then** el informe del build dice cuántas Obras existen y cuántas son indexables, para la línea base de SM-11

### Story 22.5: La atribución dice de qué obra sale, y se ve que es un enlace

As a visitante que lee una Cita en el móvil,
I want ver que el nombre del Autor y el título de la obra se pueden pulsar, y pulsarlos sin acertar en el otro,
So that no tenga que adivinar qué es enlace en una línea donde no hay cursor que pasar por encima.

**Acceptance Criteria:**

**Given** la Atribución de la Página de Cita
**When** la Cita procede de una Obra
**Then** el título va en `{colors.on-surface}`, más oscuro que el resto de la línea, y **subrayado siempre** (UX-DR45), y detrás, sin enlace, el año de esa Procedencia
**And** lo que la Procedencia declare sin nombrar obra va sin enlace

**Given** el nombre del Autor en la Atribución
**When** se sirve
**Then** se subraya siempre, no solo al pasar el cursor: un solo criterio para los enlaces en tinta de la Atribución y de la Cabecera de Obra (UX-DR52; defecto anotado)

**Given** las zonas de toque del nombre y del título
**When** se miden a 360 px
**Then** el título tiene al menos 3 × `{spacing.unit}` de zona efectiva sin solapar ninguna otra (WCAG 2.5.8)
**And** la zona ampliada del nombre del Autor ya no invade la línea de la Procedencia (defecto anotado)

**Given** la Cabecera de Obra
**When** se sirve
**Then** «de {Autor}» lleva el mismo subrayado y su zona de 44 px

**Given** las demás pantallas
**When** se construye
**Then** solo cambian la Atribución y la Cabecera de Obra: el resto de enlaces en línea del sitio lo corrige la 22.10

### Story 22.6: Dónde leer esta obra

As a visitante que quiere leer la obra entera,
I want saber de qué edición se tomó su texto, bajo qué licencia, y llegar a ella,
So that pueda seguir leyendo donde el sitio leyó, y fiarme de que lo que cita está comprobado.

**Acceptance Criteria:**

**Given** la primera página de una Obra con edición cotejada
**When** se sirve
**Then** al pie, después del listado y de los Temas y nunca entre las Citas, va la sección «Dónde leer esta obra» con la parte «Edición cotejada, gratuita» (UX-DR42)
**And** una línea por Fuente, empezando por la que más Citas aporta, con su licencia y el nombre de la Fuente como enlace: al documento si la Obra está en uno, a la entrada de la obra en su Fuente si está en varios, diciendo en cuántas páginas
**And** con traductor, «en la traducción de {traductor} ({año})», una línea por traducción (UX-DR51)

**Given** una Obra sin ninguna Cita cotejada —nueve hoy—
**When** se sirve
**Then** bajo el `h2` solo va «Ninguna de sus citas tiene todavía documento cotejado.», sin el rótulo de la edición cotejada y sin enlace (UX-DR50 c)

**Given** una Obra con algunas Citas sin documento —cuatro hoy—
**When** se sirve
**Then** después de la Fuente dice cuántas: «Una de sus 27 citas no tiene documento cotejado.» / «{n} de sus {total} citas no tienen documento cotejado.» (UX-DR50 d)

**Given** el campo `nota` de la ficha
**When** se declara en el esquema
**Then** es opcional, de 160 caracteres como máximo, y el esquema rechaza una más larga
**And** la escribe Héctor, nunca un agente: ninguna historia ni orden la rellena

**Given** una ficha con nota
**When** se sirve la primera página
**Then** va después de «Dónde leer esta obra», fuera de su sección, precedida de filete y sin encabezado (UX-DR44)
**And** nunca en la Tarjeta Social ni en la meta description

**Given** las páginas 2+
**When** se sirven
**Then** no llevan ni «Dónde leer esta obra» ni la nota

**Given** esta historia terminada
**When** se mira la sección
**Then** no tiene ninguna parte de ediciones en venta, ni hueco para ellas: las construye la 22.9

### Story 22.7: La obra se encuentra en el buscador del sitio, y se ve al compartirla

As a visitante que busca una obra por su nombre, o que pega su enlace en una red,
I want encontrarla en `/buscar/` con su Autor y ver una tarjeta que diga qué es,
So that la obra se alcance sin pasar por Google y su enlace no llegue mudo a ninguna parte.

**Acceptance Criteria:**

**Given** el índice de Pagefind
**When** se construye
**Then** entran solo las Páginas de Obra indexables, con el tipo «Obra» en `src/lib/tipoDeResultado.ts` y el nombre del Autor como metadato nuevo (FR-7)

**Given** un resultado de tipo Obra en `/buscar/`
**When** se pinta
**Then** lleva el rótulo «Obra», el título en Inter —nunca en serif, aunque los demás tipos lleven el suyo en serif— y debajo el Autor, con nombre accesible «Obra: {título}, de {Autor}» (UX-DR47, `mockups/buscar.html`)

**Given** `src/pages/tarjeta/obra/[autor]/[slug].png.ts`
**When** se rasteriza
**Then** es la tarjeta de listado con banda siena, el título en la familia de la interfaz y la bajada «{n} citas de {Autor}, {año}» —el año solo si consta el de la Obra, «1 cita de…» en singular— (UX-DR48)
**And** nunca la nota ni el traductor (AD-28)
**And** es función del contenido, no del calendario (AD-16): dos construcciones del mismo commit dan los mismos bytes

**Given** que se corrige el nombre de un Autor
**When** se reconstruye
**Then** sus Tarjetas de Obra lo reflejan: el fichero del Autor entra en la entrada de la Tarjeta, que es la pregunta que el SPEC v7.1 dejó abierta sobre AD-16

**Given** la Página de Obra
**When** se sirve
**Then** declara su Tarjeta como imagen social, sea indexable o no

### Story 22.8: Lo que cambia en una obra se anuncia, y la familia se mide aparte

As a Héctor,
I want que la Obra entre en el aviso, en el `lastmod` y en la serie de indexación, y que congelarla sea un commit,
So that a las ocho semanas sepa si el buscador la indexa y pueda pararla sin que cada lector la pare a su modo.

**Acceptance Criteria:**

**Given** la relación de cada superficie a los ficheros que renderiza
**When** se reescribe
**Then** tiene un solo dueño y dos lecturas —rutas a avisar y ficheros de cada ruta—, y una prueba las fija como inversas mientras vivan en dos módulos (AD-27)
**And** la Página de Obra se compone de su ficha, sus Citas y el fichero de su Autor, y su `lastmod` sale solo de ahí (FR-47)

**Given** un commit que cambia una Cita
**When** se avisa
**Then** las Obras hermanas del mismo Autor se anuncian solo si cambia su indexabilidad, detectado comparando la lista indexable de antes y de después, nunca mapeando cada Cita a todas las Obras de su Autor
**And** se anuncia toda ruta de Obra cuyo estado anunciable cambió en cualquier sentido, incluida la que desaparece —absorbida, retirada, sin Citas o que pasa a `noindex`—, y las demás solo si son indexables (FR-38)
**And** el aviso toma las rutas indexables del sitemap construido y no recalcula la regla

**Given** `npm run indexacion`
**When** lee la serie
**Then** la familia Obra entra con su censo de `rutasIndexables`, leído del sitemap, y nunca cuenta una página con `noindex` (FR-40, AD-24)
**And** mientras rija SM-11, Autor y Obra se leen **enteras** la misma jornada —unas 147 URL— y el muestreo se aplica solo a las demás, con el conjunto medido anotado en la entrada
**And** una familia que no se pudo leer se omite; jamás se escribe cero

**Given** la congelación de SM-11
**When** se declara
**Then** es una declaración versionada con un solo dueño, donde la espina la fija, que guarda la lista de identidades de Obra indexables en ese momento
**And** congelar y levantar son commits (AD-21), compuestos por una orden desde la lista indexable vigente

**Given** la congelación vigente
**When** se construye
**Then** ninguna Obra entra en el conjunto indexable, ni nueva ni existente que pase a cumplir la regla; las que dejan de cumplirla salen igual (FR-52)
**And** entra en la función de indexabilidad como dato, nunca como lectura de la serie de AD-24
**And** `npm run rastreo -- --registrar` rechaza una URL de Obra consultando la misma declaración, que queda expuesta para las ediciones (22.9) y las Piezas

**Given** las ocho semanas desde el primer despliegue de la 22.4
**When** toca juzgar SM-11
**Then** la serie compara la proporción indexada de Obra con la de Autor de la misma jornada, y decidir si se congela es de Héctor

### Story 22.9: Las ediciones en venta, construidas y apagadas

As a Héctor,
I want declarar en la ficha de una obra sus ediciones en venta y que el sitio sepa pintarlas debajo de la edición cotejada,
So that el día que solicite la cuenta el enlace ya esté hecho, sin haber publicado nada comercial antes de tiempo.

**Acceptance Criteria:**

**Given** la **Historia 17.5** terminada
**When** empieza esta historia
**Then** la admisión de Modelos ya se declara sobre el predicado de ruta y la afiliación no la admite ninguna superficie

**Given** las tiendas
**When** se declaran
**Then** son un conjunto cerrado junto al estado del Modelo en `src/lib/ingreso.ts`, cada una con su dominio y su marca de afiliado; añadir una es un cambio declarado (FR-35, AD-20)
**And** antes de escribir la primera marca se avisa a Héctor: en un repositorio público quedan visibles

**Given** el campo `ediciones` de la ficha
**When** el esquema lo juzga
**Then** cada edición declara tienda del conjunto, formato `impresa` o `electronica`, URL y descripción opcional, y se rechaza una URL de otro dominio o que ya traiga marca, **encendido o apagado** (AD-1, AD-20)
**And** una función pura compone en el build la URL final con la marca del Modelo

**Given** la declaración de admisión
**When** se revisa
**Then** la afiliación se admite solo en la Página de Obra, y por forma: la primera página sí, también la de una Obra sin indexar; `/obra/a/b/2/` no
**And** la revisión la rechaza en cualquier otra superficie

**Given** el Modelo encendido y una Obra con ediciones y edición cotejada
**When** se sirve su primera página
**Then** bajo la edición cotejada va «Ediciones en venta» con la forma, el enlace, `rel="sponsored noopener"`, la pestaña nueva avisada y la declaración asociada por `aria-describedby` de UX-DR43
**And** todo vive dentro de un único `data-ingreso="afiliacion-de-libros"`, nunca un `aside`, con la presentación en atributos `style`

**Given** una Obra sin ninguna Cita cotejada
**When** su ficha declara ediciones
**Then** no se pintan, encendido o apagado, y el build avisa: la edición en venta nunca va sola (FR-54)

**Given** el Modelo apagado
**When** se construye el sitio con y sin ediciones declaradas
**Then** los dos `dist/` son idénticos: ni rótulo, ni línea, ni hueco, ni contenedor, ni regla CSS (UX-DR35, UX-DR50 e)
**And** `tests/unit/ingreso-construido.test.ts` exige que lo marcado sea subconjunto de lo encendido y admitido en cada ruta

**Given** el Modelo encendido en una copia temporal, nunca en el árbol (AD-21)
**When** se pasa el barrido de accesibilidad
**Then** cubre la Página de Obra con ediciones, y el tope de guion se mide en ella (NFR-7, SM-C4)

**Given** la congelación de SM-11 vigente
**When** se pide declarar ediciones en una ficha con su orden
**Then** se rechaza con código 1

**Given** el repositorio
**When** se cierra la historia
**Then** el Modelo sigue apagado, ninguna ficha declara ediciones y ningún agente las escribe; `npm run ingreso` dice que su Umbral dispara **solicitar** la cuenta, no encender

### Story 22.10: Lo construido cumple las espinas de UX

As a visitante que navega con teclado, lector de pantalla o el pulgar,
I want que lo que ya existe se comporte como dicen las espinas,
So that el sitio no me excluya en lo que ya publicó mientras crece por otro lado.

**Realiza:** UX-DR53, salvo los dos defectos de la Atribución que corrige la 22.5, y UX-DR52 fuera de la Atribución y la Cabecera de Obra.

**Acceptance Criteria:**

**Given** el campo de búsqueda de `/buscar/` y del 404
**When** recibe el foco
**Then** muestra el anillo de foco global; nada lo suprime

**Given** la Paginación
**When** se miden sus números a 360 px
**Then** quedan separados al menos `{spacing.unit}` entre zonas de toque

**Given** el Diálogo de Imagen
**When** se abre donde el navegador comparte ficheros
**Then** su nombre accesible dice «Compartir», y «Descargar» solo donde descarga

**Given** los destinos de «Compartir la cita»
**When** se leen con lector de pantalla
**Then** cada uno dice «Compartir en {destino}» y avisa en su nombre de que abre pestaña nueva

**Given** un generador de imagen que no llega a cargar
**When** se abre el Diálogo
**Then** la previsualización no se queda vacía: dice qué pasó, según `EXPERIENCE.md § State Patterns`

**Given** los enlaces del pie a las cuentas sociales
**When** se pulsan
**Then** abren en la misma pestaña: pestaña nueva solo para donar, compartir y comprar (UX-DR52)

**Given** las confirmaciones que hoy cambian un texto en pantalla —Copiar, entre otras—
**When** ocurren
**Then** se anuncian por una región `role="status"`, que hoy no existe en ningún sitio (WCAG 4.1.3)

**Given** todo enlace que va en una línea de texto fuera de la Atribución y la Cabecera de Obra
**When** se sirve
**Then** se subraya siempre, sea tinta o siena (UX-DR52)

**Given** `EXPERIENCE.md § Defectos anotados`
**When** se cierra la historia
**Then** cada uno de los nueve está corregido aquí o en la 22.5, y la sección se vacía con una pasada de `bmad-ux`, nunca a mano
