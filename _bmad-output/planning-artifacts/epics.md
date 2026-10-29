---
stepsCompleted: [1, 2, 3, 4]  # pasadas v1, v2, v3, v3.1 y v5 completadas; v7 (ciclo 1) en curso: paso 4; 2026-10-05: documentación retroactiva de la Épica 15 (v4) y de las historias 11.5, 11.6, 19.12 y 19.13, ya construidas; v7.1 (Página de Obra), 2026-10-09: pasos 1 a 4; v8 (la Cita como centro), 2026-10-19: pasos 1 a 4; v8.2, 2026-10-23 y 24: pasos 1 a 4; v8.3, 2026-10-27: el glifo de avance «›» de la UX v8.3 propagado a UX-DR y criterios, sin otro cambio
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
  - docs/superpowers/specs/2026-10-17-v8-cita-como-centro-design.md
  - _bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v8-cabecera-y-portada.html
  - _bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v8-pagina-de-cita.html
  - _bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v8-historia-de-instagram.html
  - _bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v8-directorios.html
  - _bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v8-buscar.html
  - _bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v8-pagina-de-obra.html
  - _bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v8-kit-y-lote.html
  - _bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v8-pagina-de-tema.html
  - _bmad-output/planning-artifacts/implementation-readiness.md
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
- **FR-43: La lista de obras lleva a la Página de Obra** *(reescrito en la v7.1)* — La lista de obras de la Página de Autor lleva a la Página de Obra de cada una, que es donde vive el enlace de afiliación, y no lo aloja: se publica igual con el Modelo apagado que encendido. Ni la Página de Autor ni la de Cita admiten la afiliación; su único sitio es la Página de Obra (FR-35, FR-54, AD-20 v7.1). *(Corregida en su sitio en la v8: la línea de la v5 decía «La obra es la superficie natural del enlace de afiliación» y «La Página de Autor se suma a las superficies admitidas, sin sustituir a la de Cita», y la v7.1 revocó las dos admisiones.)*

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

### Story 2.1: Página de Cita *(enmendada en la v8)*

As a Lucía preparando una presentación a las once de la noche,
I want ver la Cita completa con su autor y su procedencia nada más aterrizar desde el buscador,
So that pueda confiar en ella sin comprobarla en otro sitio.

*(v8, 2026-10-19 — enmendada en su sitio en tres criterios. **El JavaScript:** AD-6 v8, por decisión de Héctor del 2026-10-18, saca la medición del guion en línea a un `<script src defer>` que el build genera desde `src/lib/medicion.ts` y que, con `MEDICION_ENDPOINT`, se carga en toda superficie pública con vista, zona o búsqueda. El criterio «la página no envía JavaScript» pasa a «solo sus islas declaradas y los guiones externos de la lista cerrada de AD-6», y su prueba de `tests/e2e/pagina-de-cita.spec.ts`, de «cero ficheros de script» a «solo los guiones externos declarados», juzgada también contra el sitio construido con punto final: una prueba de ausencia no prueba nada (Historia 23.1). **La cabecera** gana «Autores» y «Obras» con la Épica 26 (Historia 26.5). **La voz:** «sin contadores» no prohíbe los hechos del Corpus (Historia 28.1).)*

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

**Given** la página cargada *(v8)*
**When** mido el JavaScript que envía
**Then** no envía más JavaScript que el de sus islas declaradas (AD-6): lo que va en línea cabe en `MAX_BYTES_DE_GUION`, y el generador de imagen se pide al pulsar
**And** el único fichero de script que descarga al cargar es, con `MEDICION_ENDPOINT`, el guion de medición que el build genera desde `src/lib/medicion.ts`; sin él, no hay fichero ni etiqueta
**And** la prueba admite solo los guiones externos de la lista cerrada de AD-6, cada uno bajo su tope con nombre en `src/lib/umbrales.ts`, y se juzga también contra el sitio construido con `MEDICION_ENDPOINT`

**Given** los tokens de diseño
**When** reviso cualquier componente
**Then** no contiene valores literales de color ni de tipografía
**And** la familia serif solo se aplica a texto de Cita, nombre de Autor y nombre de Tema

**Given** una Cita en revisión
**When** intento visitar su URL
**Then** obtengo 404

**Given** el armazón del sitio
**When** reviso la cabecera
**Then** contiene únicamente la marca enlazada a la portada y el acceso a la búsqueda —*(v8)* y, desde la Épica 26, «Autores» y «Obras», que llevan a los Directorios, en dos filas por debajo de 600 px—
**And** no hay migas de pan, porque no hay jerarquía que reflejar

**Given** cualquier superficie pública
**When** reviso su tratamiento visual
**Then** no hay sombras ni elevación tonal
**And** la jerarquía se comunica con tamaño tipográfico, espacio en blanco y filete de 1px
**And** el filete de 1px es el único separador del sistema

**Given** cualquier texto que el sitio escribe por su cuenta
**When** lo reviso
**Then** son frases completas con punto final, sin exclamaciones, sin emoji y sin contadores de visitas ni de lo que hace el visitante *(v8)*: un hecho del Corpus —la línea de cifras de la portada, el recuento de una Obra— no es un contador
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

### Story 2.8: Accesibilidad y comportamiento responsive *(enmendada en la v8)*

As a visitante que navega con teclado, con zoom o desde un móvil pequeño,
I want poder usar el sitio completo sin obstáculos,
So that el contenido esté disponible independientemente de cómo lo consulte.

*(v8, 2026-10-19 — enmendada en su sitio en dos criterios: el orden de tabulación, con la Tarjeta de Obra entre el contenido y las acciones (Historia 24.4), y la separación de las zonas de toque entre Filas de bloque apiladas, que se tocan porque el filete las separa (DESIGN v8, Historia 24.4, la primera que las apila). El suelo sube a WCAG 2.2 AA con la Historia 23.4 (NFR-9 v8.1), y el reflujo se prueba a 320 px con la 26.9 (NFR-8), sin enmendar el resto de este texto.)*

**Acceptance Criteria:**

**Given** cualquier superficie pública
**When** la audito contra WCAG 2.1 nivel AA
**Then** cumple contraste, tamaño tipográfico y navegación por teclado

**Given** la navegación por teclado
**When** recorro los elementos interactivos
**Then** el foco es siempre visible con un anillo de 2px separado 2px
**And** el orden de tabulación es el de lectura: contenido, después acciones, después navegación *(v8)*; en la Página de Cita, la Tarjeta de Obra, donde la hay, va entre el contenido y las acciones, que es donde se lee
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
**And** las zonas de toque miden al menos 44px con 8px de separación, salvo entre Filas de bloque apiladas a todo el ancho, que se tocan porque cada zona es su fila entera y el filete dice dónde acaba *(v8)*

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

### Story 3.1: Búsqueda por fragmento, autor y tema *(enmendada en la v8)*

As a visitante que solo recuerda un trozo de la frase,
I want encontrarla escribiendo como me sale, sin acentos y sin precisión,
So that no dependa de recordar el texto exacto ni de escribir bien.

*(v8, 2026-10-19 — enmendada en su sitio en el criterio del JavaScript, con la 2.1 y la 4.1 (AD-6 v8, Historia 23.1). La búsqueda con filtros de la Épica 27 la amplía sin enmendar el resto, y el evento sin resultados de la 3.2 lo sustituye la Historia 23.8.)*

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
**Then** el guion y el índice de Pagefind no se han cargado todavía: se piden al enfocar el campo, al elegir un filtro o al llegar con estado en la dirección *(v8)*
**And** los únicos ficheros de script que carga son los de la lista cerrada de AD-6 —el de medición, con `MEDICION_ENDPOINT`, y en `/buscar/`, desde la Épica 27, el empaquetado de la búsqueda, que inserta el campo y los selectores—, cada uno bajo su tope con nombre en `src/lib/umbrales.ts` *(v8)*

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

### Story 4.1: Portada con Cita del Día *(enmendada en la v8)*

As a visitante que ya conoce el sitio,
I want encontrar una Cita distinta cada día al entrar,
So that tenga un motivo para volver por mi cuenta.

*(v8, 2026-10-19 — enmendada en su sitio. Con `MEDICION_ENDPOINT` la portada ya llevaba la medición en línea; la v8 la saca al guion externo de AD-6, por decisión de Héctor del 2026-10-18, y la Épica 28 le da Copiar, Imagen y compartir sobre la Cita del Día, que serán sus únicas islas (Historias 23.1 y 28.2). El criterio pasa de «no envía JavaScript» a «solo las islas declaradas», y su prueba de `tests/e2e/portada.spec.ts`, de «no descarga scripts» a «solo los guiones externos declarados».)*

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
**Then** el contenido está en el HTML inicial
**And** no envía más JavaScript que el de sus islas declaradas (AD-6): lo que va en línea cabe en `MAX_BYTES_DE_GUION`, medido con una Cita del Día que admite Imagen (AD-12), y el generador de imagen se pide al pulsar *(v8)*
**And** el único fichero de script que descarga al cargar es, con `MEDICION_ENDPOINT`, el guion de medición, y sin él ninguno: la prueba admite solo los guiones externos de la lista cerrada de AD-6, cada uno bajo su tope con nombre en `src/lib/umbrales.ts` *(v8)*

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

## Requirements Inventory — v8

La v8, «La Cita como centro», desde el PRD v8.2 (f46a8bee, fa1a512f), la UX v8.2 (c3afeefd), la espina v8.2 (354f70c3, 265343e2, 33eb87ee, 85cfc466, df5e284d), el SPEC v8.2 (303b301a), el diseño del 2026-10-17, las resoluciones de Héctor del 2026-10-19, sus decisiones del 20, del 22, del 23 y del 24/10 y la puerta de preparación (c6a68d9d) *(v8.2)*. Las espinas mandan sobre las maquetas.

**La pasada v8.2** (2026-10-23 y 24) alinea este inventario, el mapa de cobertura y la lista de épicas con esos documentos y con las quince decisiones de Héctor sobre lo que la puerta dejó abierto: trece del 2026-10-23 y dos del 2026-10-24 —el barajado que no se trocea y la 27.9 probada en local, que no es una pasada en producción— *(v8.2)*. Lo que cambia lleva *(v8.2)* en su sitio, y lo que sale de esas decisiones, *(v8.2, Héctor, 2026-10-23)* o *(v8.2, Héctor, 2026-10-24)*, según su fecha. Las historias las alinea el paso 3 de la misma pasada.

### Functional Requirements

Los rótulos entre comillas son los del PRD. El texto final es el de `EXPERIENCE.md` v8, que no promete más que ellos.

**Nuevos (§4.20, §4.21):**

FR-55: **Directorios.** `/autores/` lista todo Autor con al menos una Cita publicada, y ninguno más. Va de la A a la Z por su clave de orden (FR-15), nunca por el nombre tal como se escribe: Cervantes va en la C. Lleva letras de salto solo para las iniciales que tienen algún Autor; la inicial se toma sin tilde, la Ñ es letra propia y el slug desempata. Cada Autor figura con su nombre enlazado, sus años si constan y su recuento de Citas, en singular cuando es una. `/obras/` lista toda Obra con Citas publicadas, también la que no se indexa y también con la familia congelada. Las agrupa bajo su Autor en ese mismo orden, con las mismas letras de salto y el nombre del Autor enlazado en la cabecera de cada grupo. Dentro de cada grupo van en el orden de la lista de obras (FR-42), con el título de su ficha enlazado a su Página de Obra, el año con la regla de FR-42 y el recuento. Los dos llevan un campo que filtra mientras se teclea, por subcadena y con la normalización de la búsqueda: «gonzalez» encuentra a González Prada, y en Obras casa con el título y con el Autor. El recuento se ve y se anuncia. Si el filtro no encuentra nada, lo dice y ofrece buscar lo tecleado entre las Citas; si eso tampoco da nada, ofrece los Autores destacados (FR-8). Sin JavaScript no hay campo, la lista está entera y las letras funcionan. Son indexables, con canónica, sitemap y Tarjeta Social con hechos. En la búsqueda interna salen por su título, con tipo propio, nunca por lo que listan. No reproducen Citas, no componen prosa y no son superficie de lectura. Los enlazan la portada y la cabecera de toda página pública («Autores · Obras · Buscar»). Esa cabecera se usa a 320 px sin desplazamiento horizontal y, a 360 × 640 px, no saca la Cita de la primera pantalla. Con ella, todo Autor y toda Obra quedan a dos saltos de la portada. No cuentan en la familia de lo que listan en ninguna serie. No admiten ningún Modelo de Ingreso y se construyen idénticos con todos encendidos o apagados.

FR-56: **Medición de la lectura.** Toda página que registra vista, también la vista de Obra, registra como mucho una lectura por carga. Ocurre a los 8 s de visibilidad acumulada (umbral con nombre en `umbrales.ts`) o antes, a la primera interacción. No la producen una pestaña oculta, una carga cerrada antes del tiempo sin interacción, el desplazamiento que restaura el navegador ni el salto a un ancla. Volver atrás o adelante es carga nueva, sin marcas. Pulsar un enlace interno de una zona registra una salida interna con la zona más concreta que lo contiene. Las zonas son un conjunto cerrado (`EXPERIENCE.md § Zonas de salida interna`). La salida se atribuye a la página donde ocurre, y la continuación solo se calcula en superficies con lectura. Lo que se abre en pestaña nueva no se mide, y toda cifra lo declara como cota inferior. Cada búsqueda se registra una vez, al asentarse, como mucho una por estado distinto de texto y filtros en cada carga. Lleva su tramo de resultados (0, 1–9, 10–29, 30+) y los filtros usados, nunca el texto. La página 1 de toda Obra registra una vista de Obra que dice si es indexable; no entra en SM-8. Los Directorios registran vista y lectura. La llegada con marca de difusión cuenta con su lectura, nunca con la vista. Las dos marcas se cotejan y se guardan aparte, se cuentan una vez por llegada y la página las quita de su dirección sin recargar ni tocar la canónica. Todo dato nuevo sale de un conjunto cerrado del módulo de medición. Ningún registro lleva cookie, identificador, agente de usuario, procedencia, hora ni texto libre, salvo la consulta sin resultados de FR-8. El receptor sabe guardar cada dato nuevo antes de que el sitio lo envíe, y se comprueba con un registro de prueba. Las vistas no se reinterpretan. No hay JavaScript de terceros ni se degrada NFR-7. La línea base de cada métrica empieza cuando el sitio en vivo registra lo que ella mide y se cierra con un mínimo de lecturas de su superficie —de búsquedas asentadas en SM-6 y SM-13—, con nombre y no un número de días; para la línea base, `/autores/` y `/obras/` son una sola superficie, que se informa también por separado. El informe de cada línea base compara la razón lectura/vista de las firmas mecánicas —Threads: par ruta-jornada con exactamente dos vistas con su marca y una sin ella; ráfaga: jornada en que 100 rutas de Cita o más, umbral con nombre, reciben una sola vista cada una— frente al resto, y ninguna línea base se da por buena hasta que Héctor la mira; SM-6 y SM-13 no se comparan por firma y se leen sabiéndolo. Que la miró y la da por buena lo anota Héctor en `DESPLIEGUE.md` §3, con fecha y métrica *(v8.2, Héctor, 2026-10-23)*. Volver a un estado de búsqueda ya registrado, o que el navegador restaure la página, no registra otra búsqueda, también sin la caché de atrás y adelante. SM-5 y SM-7 cuentan lecturas con acción: una carga cuenta como mucho una vez en cada una; lo que revela la marca —cuántas acciones hubo en una carga, nunca cuál ni de quién— lo aceptó Héctor el 2026-10-20. El orden de llegada de los registros no permite encadenarlos *(v8.2)*.

**Enmendados con trabajo de construcción (§6.7):**

FR-3 *(enmendado)*: Copiar está también sobre la Cita del Día de la portada, y lo copiado es idéntico, carácter por carácter, a lo que se copia en su Página de Cita.
FR-4 *(enmendado)*: la Tarjeta de Cita del listado de Autor lleva, como texto y nunca como segundo enlace, el título de la Ficha de Obra cuando la Cita procede de una, y no lleva el nombre del Autor. La página 1 ofrece «Buscar en {Autor}», que lleva a `/buscar/` con ese filtro puesto, sin añadir JavaScript ni crear página indexable; las páginas 2+ no lo ofrecen.
FR-6 *(enmendado)*: la Tarjeta de Cita del listado de Tema lleva el Autor y, como texto y nunca como segundo enlace, el título de su Obra. La página 1 ofrece «Buscar en este tema», con las mismas condiciones que la de Autor.
FR-7 *(enmendado)*: se busca y se acota por Autor, Obra y Tema, con texto o sin él; basta un filtro. El filtro de Obra aparece al elegir un Autor y ofrece solo sus Obras, con su recuento, también las que no se indexan. Las nombra con el título de su ficha y nunca mezcla las homónimas de dos Autores. Nunca va sin su Autor: una dirección que solo nombra la Obra pone también su Autor. Los valores salen del Corpus publicado. Con un filtro puesto solo hay resultados de Cita, y la página lo dice. Sin filtros, los resultados distinguen también Colección y Directorio, y el Directorio sale por su nombre. Cada resultado de Cita lleva su Autor. Texto y filtros viven en la dirección, y «atrás» devuelve la búsqueda anterior. Los resultados llegan en tandas de 30 con «Mostrar 30 más», nunca con desplazamiento infinito, y el recuento dice cuántos hay y se anuncia. Desde la página 1 de Obra, Autor y Tema se entra con «Buscar en…». Pulsar un resultado es salida interna (SM-13). Ninguna combinación produce página indexable. Sin JavaScript, o si el índice no carga, la página lo dice y lleva a los Directorios; escribir o filtrar otra vez reintenta la carga.
FR-8 *(enmendado)*: la pantalla sin resultados ofrece Temas, Colecciones y ocho Autores destacados. Son los mismos que los de la portada y salen de una sola regla: los ocho con más Citas publicadas, con el suelo latinoamericano del 40 % de §6.1 garantizado. Si no se cumple, cede su sitio, uno a uno, el que menos Citas tiene de los que cuentan para el suelo sin ser latinoamericanos, nunca uno de tradición `otra`. A igualdad decide el orden del Directorio, y el mismo Corpus da siempre los mismos ocho. Con filtros puestos, la pantalla los nombra y ofrece quitarlos. La consulta sin resultados se registra una vez, al asentarse, nunca por tecla. Un filtrado sin texto no registra ninguna consulta.
FR-9 *(enmendado)*: la portada sigue siendo superficie de retorno (§10) y conserva la Cita del Día. La presenta con su Tarjeta de Obra y con Copiar, Imagen y compartir, que actúan sobre su Página de Cita y comparten su canónica, nunca la portada. Lo que se hace desde ahí se registra como de la portada, fuera de SM-5 y SM-7. Lleva una línea de cifras del Corpus compuesta en el build, que no dice «cada una», en ninguna forma, mientras quede alguna Cita en el censo de pendientes de cotejo; con el censo vacío dirá «{n} citas de {m} autores, cada una cotejada con el texto de su fuente.» *(v8.2)*. Lleva también un campo de búsqueda hacia `/buscar/`, sin JavaScript. Muestra seis Obras indexables de seis Autores distintos, las mismas para todos en una jornada. Rotan aparte de la Cita del Día: la Obra de la Cita del Día puede salir entre las seis, y una fijación de `corpus/portada.json` no las cambia *(v8.2)*. Mientras la familia Obra esté congelada (`CONGELACION_DE_OBRAS`), salen del conjunto indexable congelado *(v8.2)*; sin ninguna Obra, no hay bloque ni hueco; el bloque lleva al Directorio de Obras. Enlaza todos los Temas y todas las Colecciones publicados, cada Colección con su criterio entero. Muestra los ocho Autores destacados de FR-8 y lleva al Directorio de Autores. Cada salida se mide con su zona (FR-56). La línea de cifras y el campo van antes de la Cita del Día, y el texto de la Cita del Día empieza en la primera pantalla a 360 × 640 px.
FR-10 *(enmendado)*: la Imagen de Cita tiene dos formatos de una sola ruta de generación, el cuadrado y el vertical 9:16, los dos con `sabiduriadebolsillo.net` legible al pie y subordinado a la frase. Cada formato tiene su columna de tramos y ninguno baja del mínimo. Toda Cita de hasta 300 caracteres sigue cabiendo con el pie en los dos formatos. Por encima de 300 no se muestran ni la Imagen ni la historia, ni en la Página de Cita ni en la portada. La Imagen de la portada es la misma que la de su Página de Cita, y generarla no bloquea la página.
FR-11 *(enmendado)*: el diseño se elige antes de descargar o compartir el cuadrado. El 9:16 tiene un solo diseño, uno de los del cuadrado compuesto en vertical, y se comparte sin elegir. Los demás diseños en 9:16 quedan fuera.
FR-12 *(reescrito)*: toda Cita que procede de una Obra lleva una Tarjeta de Obra, después de la atribución y de la línea de su Fuente. La tarjeta da el título de la ficha, el Autor, el año de la Obra solo si sus Citas coinciden en él, y el recuento. Lleva a la Página de Obra: «Ver la obra y dónde leerla» si alguna Cita está cotejada, «Ver la obra» si no. Lleva también a la Cita siguiente en el orden del libro, de forma circular («Siguiente cita de esta obra»). Con una sola Cita, «Siguiente» lleva a la primera Cita de otro Autor que le sigue en el listado de su primer Tema publicado. Si no queda ninguna después, lleva a la primera del listado que sea de otro Autor; sin Tema publicado, o sin otro Autor en él, no hay siguiente. «De la misma obra» ofrece hasta tres Citas más, repartidas a lo largo del orden, sin la que se lee ni la siguiente, y enlace a la Obra. «Más de {Autor}» ofrece hasta cuatro Citas de otras Obras, con enlace al Autor. Un bloque vacío no aparece, y sus tarjetas no repiten lo que la página ya dice. Siguen los Temas publicados. El orden es fijo: Cita, atribución y Fuente, Tarjeta de Obra, acciones, «De la misma obra», «Más de {Autor}» y Temas. Sin Obra no hay ni tarjeta ni siguiente. La tarjeta no aloja ningún Modelo, y la congelación de SM-11 no la quita. Todo va en el HTML inicial y es determinista por commit. Cada ruta lleva su zona de FR-56. La búsqueda no devuelve la página por las Citas que enlaza. NFR-7 se mide con todo puesto.
FR-15 *(enmendado)*: todo Autor lleva una clave de orden (`ordenAlfabetico`): su apellido, o el nombre por el que se le conoce. Un Autor con Citas publicadas y sin clave, o con una que no da inicial de la A a la Z o la Ñ, detiene la construcción. La clave nunca se teclea: la propone la herramienta al dar de alta al Autor y en lote para los que ya existen, y se corrige con una orden que la valida. La revisa una persona, nunca un agente, y esa revisión no bloquea la publicación ni el sembrado.
FR-17 *(enmendado)*: «Historia de Instagram» entrega a la Hoja del Sistema la Imagen en 9:16. Solo aparece en pantallas táctiles cuyo navegador puede compartir ficheros y en Citas que admiten Imagen. En escritorio, en el navegador de la app de Facebook en Android, sin JavaScript o con más de 300 caracteres no aparece, y no hay aviso. Son dos toques y en ninguno se elige nada. El primero enseña la imagen y avisa de que se copiará el enlace. El segundo, «Compartir en la historia», copia el enlace con su marca de difusión y entrega solo el fichero; dice que el enlace se pega en el sticker Enlace en cuanto el portapapeles lo acepta, sin esperar a la entrega. Si el navegador rechaza la entrega antes de abrir la hoja —`NotAllowedError`, `DataError` o `TypeError`—, descarga la imagen, deja el enlace copiado y lo dice; es el único caso en que descarga. Cancelar no descarga ni registra nada, y un fallo de entrega con la hoja ya abierta cuenta como cancelar. En iOS la frase de la descarga dice adónde cae solo si la matriz de dispositivos reproduce allí esa caída *(v8.2)*. Nunca dice «copiado» sin haber copiado: si falla el portapapeles, muestra el enlace en un campo seleccionable. Si la imagen no se genera, lo dice, ofrece copiar el texto y pulsar otra vez lo reintenta. Cada estado se anuncia al lector de pantalla.
FR-18 *(reescrito)*: el bloque «Compartir en» muestra, también donde hay Hoja del Sistema, «Historia de Instagram» si puede cumplirse, WhatsApp, Facebook, Threads y «Más opciones…». «Más opciones…» abre la hoja con enlace y texto donde la hay y, donde no, despliega Telegram, X y Correo. El texto propuesto lleva la Cita y su Autor. Facebook recibe solo el enlace, y su Tarjeta Social hace de texto. X y Threads, cuando no cabe todo, reciben el Autor y el enlace, nunca un fragmento. El bloque acompaña también a la Cita del Día y comparte su Página de Cita. La página 1 de toda Obra lleva el mismo bloque sin la Historia, con el texto «{título}, de {Autor}», se indexe o no y aunque la familia esté congelada; las páginas 2+ no lo llevan. Todo enlace compuesto lleva la marca `?via=` de su destino, y el de la hoja el valor opaco; nunca lleva `?de=`. La canónica y la URL que se declara a las redes no cambian con la marca. Sin JavaScript quedan todos los destinos de enlace.
FR-19 *(enmendado)*: las Tarjetas Sociales de la Cita y de la Obra se verifican en el validador de previsualización de Facebook antes de ofrecer ese destino.
FR-20 *(enmendado)*: un destino nombrado registra el botón pulsado, aunque la entrega pase por la hoja. Opaco queda solo para «Más opciones…» con hoja y para la Imagen cuadrada compartida desde su diálogo. El conjunto es cerrado: seis destinos de enlace y uno de imagen (`instagram-historia`), más opaco, y da los valores de `?via=`. La Historia que cae en la descarga se registra como descarga con destino `instagram-historia`, nunca como compartición. Toda descarga que impone un rechazo de la entrega lleva el destino de su botón —`opaco` la de la Imagen cuadrada, `instagram-historia` la de la Historia— y no cuenta en SM-5; solo la que elige el visitante va sin destino. La Imagen cuadrada, que no lleva enlace, no entra en el denominador de SM-12. Una compartición por la hoja se registra cuando el navegador confirma la entrega *(v8.2)*. Cada compartición registra su superficie: Página de Cita, portada u Obra. La visita que trae se reconoce por su marca y cuenta con su lectura. Ninguna marca nombra a nadie.
FR-21 *(enmendado)*: el Kit Diario ofrece la Imagen de la Cita del Día también en 9:16.
FR-22 *(enmendado)*: la marca de origen `?de=` es solo de las cuentas propias, y SM-8 cuenta solo esa. Lo que comparte un visitante lleva `?via=` y nunca `?de=`. Las dos marcas se cotejan y se guardan por separado, cada una contra su conjunto cerrado; un valor ajeno no se guarda. Una visita con las dos cuenta en las dos series. Cada marca se cuenta una vez por llegada y se quita de la dirección. Ninguna crea otra URL indexable ni altera lo que ve el visitante.
FR-26 *(enmendado)*: la Tarjeta de Cita del listado de Colección lleva el Autor y, como texto y nunca como segundo enlace, el título de su Obra, como la de Tema.
FR-35 *(enmendado)*: el enlace de afiliación no aparece en ninguna de las entradas a la Obra que añade la v8: la Tarjeta de Obra, el Directorio de Obras, las Obras de la portada y lo que se comparte de la Página de Obra. La Tarjeta de Obra y el salto a «Dónde leer esta obra» se publican idénticos con el Modelo apagado y encendido, porque «y dónde leerla» depende de la edición cotejada, nunca de las ediciones en venta. Se comprueba construyendo el sitio en los dos estados.
FR-38 *(enmendado)*: el aviso solo cubre lo que cambió según FR-47. Una Cita nueva no avisa de las demás Páginas de Cita de su Autor ni de su Obra, aunque cambien sus rutas de salida y sus recuentos.
FR-40 *(enmendado)*: `/autores/` y `/obras/` nunca cuentan en la familia de Autor ni en la de Obra. Por AD-24 forman la familia propia `directorio` en las cinco series por familia de `tools/`. La familia de una URL sale del censo, nunca del prefijo de su ruta: `/obras/` no es una Obra.
FR-47 *(enmendado)*: en la Página de Cita, un cambio real es un cambio en lo que afirma de su Cita: texto, atribución, Procedencia, Fuente, título de su Obra y Temas. Lo que compone para salir de ella es navegación y no mueve su `lastmod` ni dispara el aviso: la Tarjeta de Obra con su año y su recuento, «Siguiente», las Citas ofrecidas con sus recuentos, y el año de la Obra en sus datos estructurados. Es una excepción declarada al criterio de AD-27, decisión de Héctor del 2026-10-17, y la suite comprueba que una Cita nueva no refecha ninguna otra Página de Cita. Un listado sí cambia con sus tarjetas: retitular una Obra refecha los listados de Tema, Colección y Autor que la nombran.
FR-51 *(enmendado)*: el listado va en el orden del libro: por la posición de cada Cita en el documento cotejado, documento a documento en el orden que fija la arquitectura, y al final, por slug, las Citas sin documento. Ese orden rige también en las páginas 2+ y es el de «Siguiente» y «De la misma obra». La tarjeta no repite el título de la Obra. La página 1 lleva en su cabecera el salto «Dónde leer esta obra ↓»; el bloque de FR-54 no se mueve. Lleva también compartir, sin la Historia, y «Buscar en esta obra», con los filtros de la Obra y de su Autor puestos. Emite la vista de Obra, se indexe o no, y la indexable emite además la vista de superficie. Las páginas 2+ no llevan salto, compartir ni «Buscar en esta obra», y no emiten ninguna de las dos vistas. La página se alcanza también desde la Tarjeta de Obra y el Directorio de Obras, y la indexable desde las Obras de la portada.

**Enmendados sin trabajo nuevo:**

- FR-33: mientras un Umbral siga escrito en sesiones orgánicas no se puede afirmar que se cruzó, y ningún Modelo que dependa de él se enciende hasta que la pasada de métricas lo reancle.
- FR-34: la invitación sigue en la portada, la búsqueda y la 404. Nunca va en la Página de Autor ni en los Directorios, ni entre la Cita del Día, su Tarjeta de Obra y sus acciones.
- FR-37: la portada y la búsqueda con filtros siguen admitiendo publicidad, los Directorios no, y ninguna unidad va dentro del bloque de la Cita del Día.
- FR-39: la v8 no lo reabre, porque sus enlaces son de retención y de alcance.
- FR-50: el Directorio de Autores no agrupa por Época ni abre una superficie por ella.
- FR-52: la Obra no indexable sigue siendo valor del filtro de Obra y la enlaza el Directorio de Obras, los dos lectores que a propósito no aplican la regla. La consultan además las Obras de la portada y la vista de Obra. La congelación no alcanza a la navegación, y lo que queda de ella se llama «conjunto indexable congelado».

**FR-42 no se enmienda.** La v8 lo cita como regla —orden y año de la lista de obras— que heredan el Directorio de Obras (FR-55) y la Tarjeta de Obra (FR-12). No lleva marca *(v8)* ni lo nombra §6.7.

**Métricas (§7).** Toda tasa que sale del receptor pasa a calcularse sobre lecturas, y SM-6 y SM-13 sobre búsquedas asentadas; ninguna se calcula ya sobre vistas. Las metas de SM-3…SM-7 (65 %, 1,8, 3 %, 15 % y 2 %) quedan en suspenso hasta la línea base de FR-56: no se retiran ni se rebajan. Ninguna métrica pide trabajo propio fuera de la orden de la línea base (23.10), que da además la comparación por firma y las ventanas de SM-C3 y SM-C5; el trabajo de SM-11 ya está hecho (64b1bf0d), salvo componer en UTC el «hoy» de su línea, que hace la 23.10 (AD-9) *(v8.2)*. La misma orden entrega por ventanas, con la misma definición de ventana, toda tasa que se juzga «contra su propia serie» —SM-C3, SM-C5, la continuación de los Directorios, la de la portada por zona— *(v8.2, Héctor, 2026-10-23)*.

- SM-3 *(enmendada)*: rebote aproximado = 1 − la continuación de la Página de Cita. Es abandono más que rebote y queda por encima del real; se compara consigo misma, nunca con el 65 %.
- SM-4 *(enmendada)*: continuación por superficie, con la Página de Obra incluida se indexe o no, y por zona. La de la Página de Cita juzga la Épica 24, la de los Directorios la 26 y la de la portada, con sus zonas, la 28. Ahora valida también FR-9 y FR-55.
- SM-5 *(enmendada)*: ≥ 3 % de las lecturas de Página de Cita con copiado o descarga hechos en ella: cuenta lecturas con acción, como mucho una por carga, con el copiado y la descarga juntos. Lo de la portada y la Obra se informa aparte. Ninguna descarga impuesta por un rechazo de la entrega —ni `instagram-historia` ni `opaco`— entra *(v8.2)*.
- SM-6 *(enmendada)*: búsquedas asentadas en el tramo 0 entre todas las asentadas, con los filtrados dentro. El numerador no es el registro de FR-8. Su línea base se cierra con un mínimo de búsquedas asentadas. No se compara por firma —la búsqueda asentada no lleva tiempo mínimo ni marca, y `/buscar/` no emite vista— y se lee sabiéndolo. Volver atrás sin la caché de atrás y adelante no asienta otra vez la búsqueda con que se llega *(v8.2)*.
- SM-7 *(enmendada)*: ≥ 2 % de las lecturas de Página de Cita con una compartición hecha en ella, como mucho una por carga. La portada y la Obra se informan aparte. Ninguna descarga impuesta cuenta. En Chrome para Android es cota inferior: la compartición se registra cuando el navegador confirma la entrega, y allí puede no confirmarla nunca *(v8.2)*.
- SM-8 *(enmendada)*: cuenta solo la marca de origen y sigue en vistas. Su serie tiene dos cortes, en `CORTES_DE_SM8`: el de la Épica 23, cuando la marca pasa a contarse una vez por llegada, y el de las Épicas 24 y 26, cuando los Directorios empiezan a emitir vista. Cada uno lleva la jornada UTC en que su despliegue llega al sitio en vivo; el tramo nuevo empieza la primera jornada UTC completa tras esa llegada, y la jornada de llegada no entra en ningún tramo: se informa aparte, como «cambió» *(v8.2)*. La vista de Obra no entra, y Threads no se lee como personas mientras no se sepa quién publica sus enlaces.
- SM-11 *(con trabajo de construcción)*: `umbrales.ts` declara, junto a `PRIMER_DESPLIEGUE_DE_OBRAS`, tres fechas de despliegue en vivo: `DESPLIEGUE_DE_LA_REPARACION` = 2026-10-19 —la reparación llegó al sitio en vivo ese día a las 09:22 UTC—, y `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS` y `DESPLIEGUE_DE_LA_PORTADA_DE_RETORNO`, en `undefined` hasta que lleguen. Cada una es la jornada UTC en que termina el trabajo «Desplegar» de Actions, nunca la del merge. El informe de indexación las nombra en su línea SM-11. Las constantes y la línea SM-11 del informe (`desplieguesQueMuevenSm11`, que nombra las que llegaron y calla las demás) ya existen: las añadió 64b1bf0d, después de la reparación, que llegó sin ellas *(v8.2)*. Su «hoy», que `lineasDeSm11` compone todavía en hora local, pasa a UTC con la 23.10 (AD-9) *(v8.2)*. La congelación no alcanza a la navegación.
- SM-12 *(nueva)*: **Difusión.** Lecturas que llegan con `?via=` entre comparticiones, por destino, en toda superficie, con llegada a Cita o a Obra y una vez por llegada. El denominador de la Historia suma las descargas de ese botón —las impuestas por un rechazo de la entrega, que dejan copiado el enlace con su marca—. La Imagen cuadrada, que se comparte solo como fichero, no entra en el denominador: se informa aparte, fuera de todo destino, y su descarga impuesta (`opaco`) tampoco; el `opaco` de SM-12 son solo las comparticiones por la hoja de «Más opciones…». En Chrome para Android la cifra puede quedar por encima de la real, porque allí la compartición puede no registrarse y la llegada sí *(v8.2)*. La cifra puede pasar de uno. Facebook queda fuera de la comparación hasta la prueba de dispositivos.
- SM-13 *(nueva)*: **Búsqueda seguida.** Salidas internas desde un resultado entre búsquedas asentadas, con los filtrados dentro. Su línea base se cierra con un mínimo de búsquedas asentadas. No se compara por firma —la búsqueda asentada no lleva tiempo mínimo ni marca, y `/buscar/` no emite vista— y se lee sabiéndolo. Volver atrás sin la caché de atrás y adelante no asienta otra vez la búsqueda con que se llega *(v8.2)*.
- SM-C1 *(aclarada)*: la línea de cifras de la portada no es SM-C1.
- SM-C2 *(aclarada)*: los Directorios no entran en su mediana.
- SM-C3 *(enmendada)*: se lee sobre las mismas lecturas de Página de Cita y es la contra-métrica de la Épica 25. Una ventana es un bloque de jornadas cerradas consecutivas, contado desde el cierre de la línea base y sin solaparse con la anterior, que reúne el mismo mínimo de lecturas que la cerró. SM-C3 salta si en dos ventanas seguidas SM-7 sube y SM-5 baja, cada una frente a su línea base: basta la dirección, y la magnitud es la pregunta 9 de §14. La descarga impuesta no entra en ninguna de las dos. Si la 25 llega en vivo antes de esa línea base, las ventanas se cuentan desde su llegada, frente a la serie propia de cada métrica, y se dice. Saltar no apaga nada *(v8.2)*. La palanca, que decide Héctor, es quitar peso a los destinos, nunca esconder Copiar.
- SM-C4 *(enmendada)*: rebote aproximado por superficie: el de la Página de Cita para todo Modelo, más el de la Página de Obra para la afiliación y el de la portada para donaciones y publicidad. Se juzga antes y después de encender.
- SM-C5 *(nueva)*: **Desvío de la resolución.** La continuación de la Página de Cita junto a SM-5, sobre las mismas lecturas, como contra-métrica de la Épica 24. Salta si en dos ventanas seguidas, con la misma ventana, la continuación de la Página de Cita sube y SM-5 baja, cada una frente a su línea base (o, si la 24 llega antes de esa línea base, desde su llegada y frente a su serie) *(v8.2)*. Si salta, la palanca, que decide Héctor, es poner la Tarjeta de Obra detrás de las acciones.

### NonFunctional Requirements

Los NFR-1…NFR-13 siguen vinculando. Abajo, los que la v8 enmienda o pone a prueba de forma nueva. Fuera del núcleo de su épica solo tres llevan trabajo de construcción: NFR-5 y NFR-8, en la Épica 26, y NFR-9, en la primera épica que se fusione, la 23. Los demás añaden a su regla lo nuevo (PRD §6.7).

- **NFR-1** *(enmendado)* — `/autores/` y `/obras/` son indexables, con canónica propia, sitemap y Tarjeta Social, y no tienen páginas 2+. Ninguna marca de la URL crea una URL indexable: con `?de=` o con `?via=` la página declara la misma canónica, el mismo `og:url` y el mismo `<link rel="canonical">` que sin ellas. `/buscar/` con cualquier `?q=&autor=&obra=&tema=` es la misma ruta de servicio, sin superficie nueva.
- **NFR-2** *(ampliado)* — la Tarjeta de Obra, «Siguiente», «De la misma obra», «Más de {Autor}» y los dos Directorios completos están en el HTML inicial. El filtro de los Directorios, el selector de Obra y la Historia de Instagram los inserta la isla encima de lo que ya hay, y nada se alcanza solo filtrando. Sin guion, los Directorios se recorren enteros con sus letras de salto, y «Más opciones para compartir» es un `<details>` con Telegram, X y Correo en el marcado. `/buscar/` sin guion dice en `<noscript>` que buscar y filtrar necesitan JavaScript, y enlaza a los dos Directorios. Con el guion activo, hasta que arranca el paquete y también si no arranca, el HTML inicial lleva fuera de `<noscript>`, oculto sin guion, el aviso condicional con los dos Directorios, y la isla lo retira al arrancar *(v8.2)*. Nunca queda un `h1` solo.
- **NFR-3** — el `isPartOf` de la Página de Cita lleva el año de la Obra solo cuando sus Citas coinciden, y nunca el de una traducción (FR-48, AD-25). Ese año es navegación: que cambie al entrar otra Cita de la Obra no fecha la Página de Cita (AD-27).
- **NFR-4** — el estado de `/buscar/` lleva identificadores, nunca rótulos: slug de Autor, nombre de ficha y slug de Tema. El nombre de la Ficha de Obra es interfaz pública como valor del filtro `obra`, así que retitular no rompe una búsqueda compartida. Reunir es la ruptura declarada, y alcanza también a `?obra=` con la absorbida: la búsqueda ignora ese filtro, lo dice y lo quita de la dirección.
- **NFR-5** *(enmendado)* — tres saltos como máximo desde la portada, también para lo que no se indexa; todo Autor y toda Obra quedan a dos, por la cabecera y su Directorio. La espina ya tomó la decisión que el PRD dejaba a la Épica 26 (Héctor, 2026-10-18): la condición tiene puerta en el build, sobre el `dist/` real, sin los bloques que rotan con la jornada. Las órdenes que retiran —también `coleccion despublicar`— se niegan con código 1 si dejarían una Cita a más de tres saltos, y `revisar` y `tools/alta.ts` se niegan a publicar una Cita sin Tema publicado *(v8.2)*. El tope no se relaja.
- **NFR-6** — el Kit y el Lote siguen siendo internos con lo que la v8 les añade. El 9:16 del Kit se compone en el cliente, con `imagen.js` importado al cargar. Quedan fuera de la prueba de las dos jornadas (AD-12) y de toda serie, y ninguna superficie del producto los enlaza, tampoco la cabecera ni los Directorios.
- **NFR-7** *(ampliado)* — la Tarjeta de Obra, hasta siete Tarjetas de Cita y la medición de la lectura no mueven el listón: van después de la Cita y de su atribución, y el tiempo se mide con todo ello puesto. La medición es a mano, con Lighthouse en perfil móvil 4G, sobre una Página de Cita con la medición puesta contra un receptor local (`wrangler dev` con D1 local) o un punto final ficticio, nunca contra el D1 de producción, y sin puerta automática *(v8.2)*. La principal con la que se compara se mide construida y servida igual, en local y con la medición contra un receptor local o un punto final ficticio: nunca se mide el sitio en vivo, cuyo guion de medición escribiría en el D1 de producción *(v8.2)*. La mide cada historia de cierre de épica —la 23.11, la 25.7, la 26.11, la 27.9 y la 28.5— con todo lo suyo puesto, y si empeora, el merge espera a que Héctor decida *(v8.2, Héctor, 2026-10-23)*. `MAX_BYTES_DE_GUION` se mide en toda superficie pública, y cada guion externo tiene su tope en `umbrales.ts`. El peso del HTML de la Página de Cita sigue sin tope (aplazado): se crea si Héctor lo decide, al degradarse la medición a mano de NFR-7 en una historia de cierre o para vigilar ese peso (24.2) *(v8.2)*.
- **NFR-8** *(ampliado)* — ninguna superficie pública obliga a desplazarse en horizontal a 320 px. Se comprueba con `scrollWidth` frente al ancho de la ventana, porque 1.4.10 no tiene regla en axe, y la UX pide repetir la prueba con el espaciado de 1.4.12 y con el texto al 200 %. La cabecera va en dos filas por debajo de 600 px, con unos 113 px de alto. A 360 × 640 px el texto de la Cita sigue empezando en la primera pantalla, medido sobre lo construido.
- **NFR-9** *(enmendado en la v8.1)* — WCAG 2.2 AA. El barrido axe pide `wcag22aa` además de las etiquetas de 2.1, desde el mismo dueño (`superficies.ts`). Entra con la Épica 23, para que las demás se auditen ya contra 2.2, y en el mismo commit `@axe-core/playwright` y `axe-core` suben a la 4.14.0. Los criterios de 2.2 sin regla en axe no se dan por comprobados por él: 2.5.8 sí la tiene (`target-size`, con la etiqueta `wcag22aa`), y la UX da por cumplidos 2.4.11 y 2.5.7 *(v8.2)*; 3.2.6, 3.3.7 y 3.3.8 no aplican. El barrido es Playwright local, que el CI no corre.
- **NFR-11** *(ampliado)* — `lectura`, `salida-interna`, `busqueda` y `vista-de-obra` llevan solo valores de un vocabulario cerrado. `copiado`, `descarga-de-imagen` y las dos comparticiones llevan además `primera` (sí/no), que revela cuántas acciones hubo en una carga, nunca cuál ni de quién, y lo aceptó Héctor el 2026-10-20. El orden de llegada de las filas no encadena registros: el receptor inserta con `rowid` aleatorio *(v8.2)*. No llevan identificador de visita, agente de usuario, referente ni hora. Tampoco el texto de la consulta, que sigue siendo exclusivo de `busqueda-sin-resultados`. `?via=` nombra el botón pulsado, nunca a quien comparte ni a quien abre. Las dos marcas se quitan de la dirección y se olvidan al emitir la lectura. Sin sesión, SM-2, SM-9 y los Umbrales en sesiones siguen sin medirse.
- **NFR-12** — el cuadrado y el 9:16, los dos con el dominio al pie, nunca encogen ni recortan una Cita de hasta `MAX_CARACTERES_IMAGEN`: si no cabe, no se compone, y el mensaje de fallo ofrece copiar el texto. Cuando la Cita con su Autor y su enlace no cabe en X o en Threads, reciben solo el Autor y el enlace, nunca un fragmento. El título de una Obra en la Tarjeta de Obra, en las Obras de la portada y en el Directorio de Obras parte palabras y hace crecer su fila; nunca se recorta.
- **NFR-13** *(ampliado)* — los Directorios listan entidades, no Citas, y en Pagefind responden solo por su título, con el listado en `data-pagefind-ignore="all"`. «Buscar en esta obra / en {Autor} / en este tema» lleva a una búsqueda que no se indexa con ningún filtro, y las páginas de intersección siguen fuera. La Página de Cita enumera hasta siete Citas con la Tarjeta de Cita común, fuera de Pagefind. La Cita del Día es la única superficie indexable que reproduce íntegra una Cita fuera de su página; su bloque queda fuera de Pagefind y su canónica sigue siendo la de su Página de Cita.

### Additional Requirements

De la espina v8.2 *(v8.2)*, que enmienda en su sitio AD-1, AD-3, AD-6, AD-7, AD-8, AD-9, AD-11, AD-12, AD-13, AD-14, AD-15, AD-16, AD-17, AD-19, AD-20, AD-21, AD-23, AD-24, AD-25, AD-27 y AD-28, sin ningún AD nuevo ni renumerado. Ninguna tecnología nueva: de Pagefind se usa lo que la 1.5 ya trae; de `wrangler`, sus migraciones de D1; de axe, las etiquetas de WCAG 2.2.

- **Paradigma v8 — `tools/lib/` es la segunda capa pura.** La importan las integraciones del build, `astro.config.mjs`, el cargador de posiciones de `content.config.ts` y las órdenes. Ella importa de `src/lib/`, y `src/lib/` nunca importa de ella. Sin red (AD-22). El criterio de la puerta del cotejo vive aquí.
- **AD-1 — la clave de orden del Autor es obligación de publicar, no de admitir.** La forma de `ordenAlfabetico` es puerta del esquema exportado: tiene que dar, con la función hermana de AD-3, una inicial de la A a la Z o la Ñ. `tools/autor.ts` la repite por comodidad. Su presencia se exige sobre `autoresPublicados`: un Autor con Citas publicadas y sin clave rompe el build con la ruta de su fichero; uno sin Citas, no. `ordenRevisado` (jornada ISO) lo escribe solo la orden que confirma o corrige la clave, y se omite si no. El build no lo lee, «sin revisar» se cuenta sin leer git, y la revisión no bloquea.
- **AD-3 — dos consumidores más, con el mismo dueño.** El filtro de los Directorios es el tercer consumidor de `normalizar`: casa por subcadena de lo normalizado y la importa por un guion empaquetado, sin reimplementarla. Una función hermana en `normalizar.ts` da la inicial sin tilde, con la Ñ como letra propia, y la clave de comparación de la clave de orden, con el slug como desempate. La consumen el Directorio de Autores, las letras de salto de los dos Directorios y los destacados de FR-8; ningún módulo ordena Autores por su cuenta. El mismo módulo da también el orden por el nombre tal como se lee, para el selector de Autor de `/buscar/`, y el de los Temas por su nombre con el artículo. La rotación de la Cita del Día sigue por slug, como excepción declarada.
- **AD-6 — la medición sale a un fichero.** Es un `<script src defer>` que el build genera desde `src/lib/medicion.ts` con un endpoint `.js.ts`, y su URL se versiona por su contenido. Sin `MEDICION_ENDPOINT`, el `getStaticPaths` queda vacío y no hay ni fichero ni etiqueta, pero el marcado del build —el `data-*` de las vistas, las zonas y la marca indexable— se queda en `dist/` *(v8.2)*. Se carga en toda superficie pública con vista, zona o búsqueda, también en `/buscar/`, las páginas 2+, el 404 y la página 1 de una Obra que no se indexa. Emite las vistas que declara un `data-*` de la página, derivado de `superficies.ts`: la página 1 de una Obra indexable emite dos, y sin ese `data-*` no emite ninguna. Se acepta perder vistas hasta 10 minutos tras un despliegue que cambie el guion (`max-age=600`).
- **AD-6 — los guiones externos son una lista cerrada, cada uno con su tope con nombre en `umbrales.ts`.** Con la página se cargan el de medición y dos que empaqueta Astro: el filtro de los Directorios y la búsqueda con filtros. Los dos importan `normalizar`, `tipoDeResultado`, `umbrales` y el vocabulario, sin copiarlos. Se piden con `import()` dos más: `imagen.js` al pulsar —el Kit y el Lote lo importan al cargar— y Pagefind al enfocar el campo, al elegir un filtro o al llegar con estado en la dirección. `public/islas/` queda solo para lo que se pide con `import()`. El tope de cada entrada cuenta todo lo que importa de forma estática, trozos compartidos incluidos. Un guion externo fuera de la lista, o sin tope, es fallo de prueba.
- **AD-6 — un guion empaquetado sale siempre a fichero.** `astro.config.mjs` fija `vite.build.assetsInlineLimit` como una función que devuelve `false` para los `.js` y deja lo demás a la regla por omisión. Una prueba sobre `dist/` exige que ningún guion procesado quede en línea. El comportamiento se comprobó en Astro 7.2.0 y se reverifica al subir de versión.
- **AD-6 — el presupuesto en línea.** `MAX_BYTES_DE_GUION` es el tope de toda superficie pública y se mide en cada una. Sacar la medición libera unos 680 bytes; los disparadores de la Historia y de «Más opciones…» caben en ese hueco o suben el tope en el mismo diff que los trae. Ningún guion en línea lleva datos de contenido —slug, texto, Obra—, que van en `data-*`. Es una migración, porque hoy `CopiarCita.astro` mete el slug por `define:vars`.
- **AD-6 — una prueba de ausencia no prueba nada.** Las pruebas que afirmaban la medición en línea, o que «la página no descarga ningún fichero de script», se juzgan contra la lista cerrada y contra el fichero construido con punto final. Los criterios de las Historias 2.1 y 4.1, «no envía JavaScript», pasan a «solo las islas y los guiones declarados».
- **AD-6 — las islas de la v8, declaradas y contadas:**
  - copiar, Imagen y compartir sobre la Cita del Día;
  - compartir en la página 1 de la Página de Obra, que es su primera isla;
  - el disparador de la Historia de Instagram;
  - el botón que sustituye al `<details>` de «Más opciones…» donde hay hoja;
  - el filtro de los Directorios y la búsqueda con filtros;
  - el guion de medición y su arranque en línea en el armazón;
  - el 9:16 de la Imagen del Kit.
- **AD-7 — dos formatos y una sola ruta de generación.** El cuadrado y el 9:16 salen del mismo generador del cliente, también en el Kit, con el dominio al pie, que llega desde `dominio.ts` por `data-*`. La Historia va en dos toques. El primero carga `imagen.js`, compone y previsualiza. El segundo lanza `writeText` antes de `share()`, en el mismo manejador y el mismo turno, y dice «Enlace copiado» en cuanto `writeText` resuelve, y nada de la interfaz espera a `share()`, que en Chrome para Android puede no resolverse nunca; la compartición se emite al resolver `share()`, así que allí SM-7 y SM-12 son cota inferior. Caen en la descarga `NotAllowedError`, `DataError` y `TypeError`, y ninguno más, y solo antes de abrir la hoja: un fallo de entrega con la hoja abierta llega como `AbortError`, como cancelar, y no descarga ni registra; `InvalidStateError` se ignora. La descarga impuesta lleva el destino del botón —`opaco` en la Imagen cuadrada, `instagram-historia` en la Historia—, no gasta la `primera` de SM-5 y SM-12 no suma la de `opaco`; la que el visitante elige va sin destino *(v8.2)*. La URL marcada, también la de `opaco` y la de `instagram-historia`, la compone el build con `compartir.ts` y llega por `data-*`; nunca sale de `location`.
- **AD-7 — la Historia está sin confirmar en iOS.** Antes de construir el 9:16, la matriz de dispositivos la comprueba en iOS Safari y en Android Chrome con la versión de Instagram de ese día. Si en iOS no aparece, el cuadrado se conserva. No hay destino Feed en el conjunto cerrado: qué hace en iOS el botón de la Historia lo decide Héctor en la 25.3, con la matriz delante, y, si lo que decida necesita un destino nuevo, solo entonces entra en el vocabulario, por la orden de la 23.2 y la 23.3, antes de la 25.5 *(v8.2)*.
- **AD-8 — la columna 9:16.** Es una columna más de `tramos.ts`, y llega a `imagen.js` por `data-*`. La geometría del lienzo 9:16 se declara una sola vez, junto a la del cuadrado, y una prueba la fija. La prueba de cabida corre en el navegador (Playwright local), con el pie de dominio y en los dos formatos, sobre las Citas publicadas más largas de cada tramo: la que no cabe no se compone. La isla ofrece la Historia solo si un `data-*` derivado de `tramos.ts` dice que la Cita admite Imagen. En la Página de Obra ese `data-*` no existe, así que la Historia tampoco.
- **AD-9 — `umbrales.ts` guarda todo literal de regla de negocio y toda fecha que una regla o un informe nombra.** Entran, entre otros:
  - los 8 s de la lectura y el mínimo de lecturas de una línea base;
  - el tope de cada guion externo;
  - la tanda de resultados y la pausa de tecleo común a los Directorios y a `/buscar/`;
  - los recuentos de «De la misma obra», de las Obras y de los Autores destacados de la portada;
  - las jornadas de despliegue —`DESPLIEGUE_DE_LA_REPARACION`, `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS`, `DESPLIEGUE_DE_LA_PORTADA_DE_RETORNO` y la de la 23, con la misma forma: cadena de jornada, `undefined` mientras no llega—, junto a `PRIMER_DESPLIEGUE_DE_OBRAS`, cada una la jornada UTC en que termina el trabajo «Desplegar» de Actions, y `tools/` pasa su «hoy» a UTC antes de comparar; y la lista de cortes de serie, que se compone de ellas, nunca de un literal (AD-13) *(v8.2)*;
  - con la misma forma, las jornadas de llegada en vivo de la 25 y de la 27, cada una con la suya, y la de la 28 también si llega tras el juicio, en la misma `DESPLIEGUE_DE_LA_PORTADA_DE_RETORNO`; a cada una le da valor su historia de cierre el día que llega *(v8.2, Héctor, 2026-10-23)*;
  - las jornadas y las rutas de las dos pasadas que escriben en el D1 de producción —la 25.3 y la 25.7, y ninguna más *(v8.2, Héctor, 2026-10-24)*; la baliza de prueba de `desplegar` y `comprobar` no es una pasada, porque se escribe y se borra en la misma orden *(v8.2)*—, en una constante con nombre citada en `DESPLIEGUE.md`, que la orden de la 23.10 descuenta igual en cada lectura *(v8.2, Héctor, 2026-10-23)*;
  - la constante con nombre, apagada, que activa la frase de iOS de la Historia (25.5) y que Héctor enciende en un diff visible tras la matriz, como `SM12_CON_FACEBOOK` *(v8.2, Héctor, 2026-10-23)*;
  - el aviso y el tope del peso de `dist/`, y el tope del número de PNG de `dist/` (AD-16) *(v8.2)*;
  - los tamaños que reabren un aplazado —los filtros de Pagefind con el mapa de rótulos, y el HTML de `/obras/`—, que el build avisa al pasar, sin romper.

  Un guion empaquetado los importa; uno de `public/islas/` los recibe por `data-*`. Los cortes de tramo de `busqueda` no entran: son vocabulario (AD-13). El peso de `dist/`, los tamaños de los filtros y del mapa de rótulos y el número de PNG se miden en un paso final de `npm run build`, después de Pagefind, sobre lo que se despliega —`dist/pagefind/` incluido—, nunca en `astro:build:done`, y sin los ficheros que rotan con la jornada —portada, 404, `/kit`, `/lote` y `rss.xml`—, que se miden e informan aparte; la línea de cifras del parte no es un aviso *(v8.2)*.
- **AD-11 — más enumeraciones con el mismo dueño.** `publicado.ts` da `autoresPublicados` y `obrasPublicadas`. Una sola función compone las opciones de filtro de `/buscar/` y el `data-pagefind-filter` de cada Cita. Otra da los ocho Autores destacados de la portada y de la búsqueda sin resultados: la regla de FR-8 con el predicado «cuenta para el suelo», cuyo dueño es `src/lib/huecos.ts`, no `salud` *(v8.2)*. Las seis Obras de la portada salen del conjunto indexable de `publicado.ts`, y su selección vive junto a `citaDelDia.ts` (AD-12) *(v8.2)*. `publicado.ts` da también los recuentos de la Tarjeta de Obra y de las rutas de salida. También la línea de cifras, contada con `esCitaDocumentada`, que con el censo de pendientes de cotejo vacío dice «cada una cotejada con el texto de su fuente», y mientras quede censo no dice «cada una» en ninguna forma *(v8.2)*. El mapa de rótulos (nombre de ficha → título y Autor) lo genera el build como un JSON que la isla pide junto a `filters()`, nunca en el HTML. De ese mapa sale el Autor de una dirección con `obra` y sin `autor`.
- **AD-11 — quién lee cada conjunto.** Leen `rutasIndexables` los resultados de Pagefind, las Obras de la portada y la marca de `vista-de-obra`. Leen el conjunto publicable, a propósito, el filtro de Obra y el Directorio de Obras.
- **AD-11 — un solo componente escribe los filtros, los metadatos y la clave de orden de una Cita, y solo en su Página de Cita.** Todo bloque que enumera Citas, la Tarjeta de Obra y el bloque de la Cita del Día llevan `data-pagefind-ignore="all"`. Una prueba sobre `dist/` exige que todo registro con filtro `autor` sea una Página de Cita. Ese registro lleva exactamente un `autor` y como mucho una `obra`, los suyos, y en `tema` exactamente sus Temas publicados. Cotejar los recuentos de `filters()` con los del módulo es prueba de Playwright local.
- **AD-11 — las rutas de salida.**
  - El «Siguiente» de una Obra de una sola Cita lleva a la primera Cita del siguiente Autor en el listado del primer Tema publicado de la Cita, leído del mismo dueño que pinta la Página de Tema.
  - Tras el último Autor, vuelve al primero. Sin Tema publicado, o sin otro Autor en él, no hay «Siguiente».
  - «De la misma obra» y «Más de {Autor}» dejan fuera la Cita que se lee y la siguiente, y «Más de {Autor}» también las de su misma Obra.
  - Las cuatro de «Más de {Autor}» las elige una función determinista del commit, nunca de la jornada.
- **AD-11 — NFR-5 tiene puerta.** `superficiesInalcanzables` rompe el build en `astro:build:done` si una superficie publicable queda a más de `MAX_SALTOS_DESDE_LA_PORTADA` saltos.
  - **El grafo** es el del `dist/` real, sin los subárboles `data-jornada` e ignorando `<template>` y `<noscript>`.
  - **Al romper**, nombra la superficie y, si la causa es un Tema que cayó bajo su umbral, ese Tema.
  - **Las órdenes que retiran** —`documentar --retirar`, `autor retirar`, `coleccion quitar`, `coleccion despublicar` y `tema quitar`— se niegan con código 1 si dejarían una Cita a más de esos saltos. Calculan sobre el grafo del modelo que compone una sola función de `publicado.ts`, con cada arista sacada de la enumeración que la pinta en la página, nunca de una lista aparte: portada → Temas, Colecciones y Directorios; cabecera; Tema → página N → Cita, y así cada listado con todos sus números de página; Autor → sus Obras y sus Citas; Directorios → Autores y Obras *(v8.2)*.
  - **El build comprueba** que el grafo del `dist/` contiene el del modelo.
  - **`revisar` y `tools/alta.ts`** se niegan a publicar una Cita sin Tema publicado *(v8.2)*.
- **AD-12 — las seis Obras de la portada.**
  - **De dónde salen:** viven junto a `citaDelDia.ts` y salen del conjunto del que rotan, que son las Obras indexables o, si rige la congelación, las del conjunto congelado.
  - **La rotación:** va en rondas por Autor sobre la lista circular de los Autores con Obras en ese conjunto, en el orden del Directorio, y la ventana avanza por jornada tantos puestos como Obras salen *(v8.2)*.
  - **Qué Obra de cada Autor:** en su n-ésima aparición sale la n-ésima de sus Obras, en el orden de su lista de obras y módulo su número; n se cuenta desde el mismo origen de jornadas que `citaDelDia.ts`.
  - **Cuántos Autores:** seis distintos mientras los haya; con menos, una Obra de cada uno, y la ventana avanza ese número *(v8.2)*; sin ninguno, el bloque no existe.
  - **Aparte de la Cita del Día:** las seis y la Cita del Día rotan de forma independiente; la Obra de la Cita del Día puede salir también entre las seis y no se excluye, y una fijación de `corpus/portada.json` no cambia las Obras *(v8.2)*.
  - **La Cita del Día:** gana su Tarjeta de Obra y las acciones de su Página de Cita, que actúan sobre la canónica de esa página.
- **AD-12 — la jornada cambia lo que se pinta, nunca lo que se juzga.** Todo bloque que rota lleva una sola marca, `data-jornada`, que pone un solo componente. Una prueba construye dos jornadas del mismo commit y exige los mismos veredictos. Exige también que el HTML de toda página salvo la portada, el 404, `/kit` y `/lote` sea idéntico byte a byte, y que en la portada y en el 404, que conserva su Cita del Día, solo cambien esos subárboles *(v8.2)*. El tope de guion de la portada se mide con una Cita del Día que admite Imagen. Toda comprobación sobre un lector que rota se hace sobre el conjunto del que rota, no sobre lo que sale hoy.
- **AD-13 — eventos y vocabulario.** Entran `lectura`, `salida-interna`, `busqueda` y `vista-de-obra`, y `busqueda-sin-resultados` pasa a emitirse solo con la consulta asentada. Los eventos, los campos cerrados y los nombres de `de` y `via` viven en un módulo puro que solo importa módulos hoja sin importaciones —`destinos.ts` y `redes.ts`— y nunca copia sus conjuntos *(v8.2)*. De él importan el receptor, los guiones empaquetados y `tools/`. La emisión y la composición del guion siguen en `medicion.ts`.
- **AD-13 — un solo `__medir` en ejecución.** Un arranque en línea del armazón define `__medir` como cola, antes de toda isla y también sin punto final. El guion de medición vacía esa cola al cargar y la sustituye. Las islas llaman siempre a `__medir(…)`, nunca `window.__medir && …`, y ninguna isla empaquetada emite con su propia copia. El arranque cuenta en `MAX_BYTES_DE_GUION`.
- **AD-13 — cada campo es un conjunto cerrado.**
  - **La zona de `salida-interna`:** las dieciséis de `EXPERIENCE.md § Zonas de salida interna`.
  - **El tramo de `busqueda`:** 0, 1–9, 10–29 y 30+. Es vocabulario y no umbral, así que cambiarlo mueve la huella de AD-14 y abre una entrada en la lista de cortes de serie (abajo) *(v8.2)*.
  - **Los filtros usados:** las seis combinaciones válidas, porque la Obra nunca va sin su Autor.
  - **La marca de `vista-de-obra`:** indexable o no indexable.
  - **`primera`** (sí / no) de `copiado`, `descarga-de-imagen` y las dos comparticiones *(v8.2)*.
  - **`via`:** sus valores son `DESTINOS_VALIDOS`.
  - **Los destinos:** se parten en destinos de enlace, con constructor en `compartir.ts` y ahora con `facebook` y `threads`, y el destino de imagen `instagram-historia`. Ese nombra el botón pulsado. `destino` lo guarda también `descarga-de-imagen`, con {`opaco`, `instagram-historia`}: el del botón cuya compartición rechazó el navegador, y nunca en la descarga que el visitante elige *(v8.2)*.
- **AD-13 — la lectura.** Como mucho una por carga, en toda superficie que emite vista, también la de Obra. Se emite a los 8 s de visibilidad acumulada, contada con `visibilitychange`, o antes, al primer `pointerdown`, `keydown`, `wheel` o `touchmove`; nunca por `scroll`. `pageshow` con `persisted` es carga nueva para la lectura y la salida, sin marcas y sin volver a emitir vista. Una página prerenderizada no emite vista hasta su activación (`document.prerendering`, `prerenderingchange`).
- **AD-13 — la lectura con acción** *(v8.2)*. SM-5 y SM-7 cuentan lecturas con acción, y las marca `primera`. Lo decide solo el guion de medición al emitir, también al vaciar la cola y en su orden; el arranque en línea es solo cola, sin memoria ni vocabulario. El guion lleva en memoria, por carga, qué métricas de acción ya contó, con la correspondencia evento → métrica del vocabulario: SM-5 junta `copiado` y `descarga-de-imagen`; SM-7, las dos comparticiones. Solo la primera de cada métrica sale con sí; toda descarga con destino lleva siempre no. Una carga nueva —también `pageshow` con `persisted`— empieza de cero. Toda acción va detrás de la lectura de su carga en una superficie con lectura: si la lectura no salió —la acción llegó en la cola, o sin `pointerdown` ni `keydown`: un lector de pantalla, la voz, un `element.click()`—, el guion la emite antes. SM-12 cuenta toda compartición, sin mirar `primera`.
- **AD-13 — la salida interna.** La recoge una sola escucha delegada del guion de medición, con la zona más concreta que contiene el enlace. Es como mucho una por carga y, donde hay lectura, va después de ella.
  - **Qué cuenta:** solo un enlace que sale de la página, pulsado con el botón principal, sin modificador y sin `defaultPrevented`. Las anclas de la misma página son una de las exenciones, y enviar un formulario no es salida. Están exentos de zona, por escrito: «Buscar en…», el campo de la portada y el del 404; las salidas de la búsqueda sin resultados —Temas, Colecciones y Autores destacados—; y los Directorios del aviso de `/buscar/`, el del índice que no carga y el que se pinta hasta que arranca la búsqueda. Se revisa en la pasada de métricas *(v8.2)*.
  - **Dónde se declara la zona:** es prop obligatoria de los componentes de enlace compartidos, y `astro check` la hace cumplir. Va en el contenedor que pinta el build, y lo que inserte el cliente la hereda.
  - **La prueba:** sobre `dist/`, todo enlace interno de `main` en una superficie con lectura lleva zona o una exención explícita.
- **AD-13 — la búsqueda asentada.** Se emite una vez por estado distinto de texto y filtros en cada carga: al enviar, al pulsar un resultado o al ocultarse la página. Nunca por tecla ni con el texto de la consulta. Restaurar `/buscar/` desde la caché de atrás y adelante es carga nueva para la lectura, pero no para la búsqueda, que conserva en memoria los estados ya emitidos. Sin esa caché tampoco: una navegación `back_forward` (Navigation Timing, leído una vez al cargar) da por ya registrado el estado con que llega. Al asentar, la isla marca su entrada con un booleano en `history.state` (`replaceState` con la misma dirección), que no es identificador ni sale del navegador; en toda llegada a un estado —una carga o un `popstate`— cuenta como registrado el que su entrada marca, con Navigation Timing de respaldo para la entrada sin objeto de estado. La recarga cuenta como ya registrada; sin `PerformanceNavigationTiming`, la carga cuenta como `navigate`; una marca rechazada por frecuencia se acepta. La regla la aplica solo la isla de búsqueda: el guion de medición nunca descarta una `busqueda`. Apilado no es asentado *(v8.2)*.
- **AD-13 — las marcas de llegada tienen un solo lector.** Solo el guion de medición lee `de` y `via`, cada una contra su conjunto, al cargar y antes de la vista.
  - Las quita con `history.replaceState`, mediante una sola función pura que quita exactamente esos dos parámetros, en todas sus apariciones, y conserva el resto de la cadena y el fragmento; al reescribir pasa `history.state`, porque `replaceState` con `null` borra la marca de asentada *(v8.2)*.
  - Las guarda en memoria para esa carga y las olvida al emitir la lectura.
  - Va en el documento antes que todo guion que escriba la dirección, y ninguna isla salvo la búsqueda escribe en el historial.
  - `npm run canal` rechaza con código 1 un enlace con `?via=` en `anotar` y en `senal --tipo propia`; `senal --tipo ajena` lo admite y la consulta lo marca, como la ajena con `?de=` *(v8.2)*, salvo un `?via=` cuyo destino no está en `DESTINOS_VALIDOS`, o más de un `?via=`, que rechaza con código 1, como ya rechaza un `?de=` de una red que no existe *(v8.2, Héctor, 2026-10-23)*.
- **AD-13 — los cortes de serie** *(v8.2)* son una lista ordenada en `umbrales.ts` cuyas entradas dicen su jornada, qué cambió y qué series parten: la llegada en vivo que cambia un instrumento, su reversión, un cambio de los cortes del tramo de `busqueda` y un cambio del tiempo mínimo de la lectura, que repite la línea base. Cada jornada sale de las constantes de despliegue de AD-9, filtrando las que no llegaron, nunca de un literal. El tramo nuevo empieza la primera jornada UTC completa tras la llegada, y la de llegada se informa aparte, como «cambió». `CORTES_DE_SM8` es su proyección sobre SM-8, con dos entradas: la 23 y la 24 con la 26. La orden parte cada serie solo por las entradas que la nombran, y admite dos en la misma jornada con distinto motivo.
- **AD-13 — la superficie de un registro es la página donde ocurre.** `tools/` la resuelve contra el censo, nunca por el prefijo de la ruta. La unidad de agregación es la superficie declarada en `superficies.ts` —la portada, que no es de ninguna familia; las Páginas de Cita, de Autor, de Tema, de Colección y de Obra; y los Directorios—, nunca la familia. Para la línea base, `/autores/` y `/obras/` son una sola superficie, «los Directorios», que junta sus lecturas, y se informan también por separado *(v8.2)*. El censo de la medición es `rutasPublicadas` sin el servicio por forma, así que la Obra que no se indexa entra. La familia Obra se parte por la marca de `vista-de-obra`: todo registro de una ruta de Obra en una jornada —lecturas, salidas y acciones— toma la marca de sus vistas de esa jornada. Si ese día llegan las dos marcas, esa ruta y esa jornada se cuentan aparte, para todos sus registros, como «cambió» *(v8.2)*. La marca nunca se reconstruye desde git.
- **AD-13 — lo que se añade llega entero.** Un evento o un campo nuevo exige tocar el módulo, el receptor, una columna y una migración (AD-14). Una prueba de correspondencia lo fija por evento y por valor: las claves que emite el guion para cada evento son exactamente las que el vocabulario le declara, cada valor es de su conjunto, y esas claves ⊆ el registro del receptor ⊆ las columnas del esquema. La huella vive en el repositorio con la ruta y la forma que escribe la orden de la 23.2, y esa orden no se salta el cotejo en silencio cuando no hay huella *(v8.2)*. Cada dato es una columna nula fuera de sus eventos, nunca una columna genérica ni JSON, y ninguna lleva hora. `via`, como `origen`, viaja con la vista y la lectura de la llegada; `zona`, `tramo`, `filtros`, `indexable` y `primera` *(v8.2)*, cada una con su evento.
- **AD-13 — ni el orden de llegada** *(v8.2)*. El Worker inserta cada fila con `rowid` aleatorio (`INSERT INTO eventos (rowid, …) VALUES (abs(random()), …)`), sin migración ni cambio de la huella de columnas, y un `UPDATE` baraja lo ya escrito. Ninguna lectura ordena por `rowid` ni lo lee desde JavaScript (si hace falta, `CAST(rowid AS TEXT)`), y ningún SQL de `tools/` lo nombra salvo la comprobación del despliegue y el `UPDATE` que baraja en `desplegar` (23.2) *(v8.2)*. Un `rowid` repetido pierde ese evento, y se acepta. Entra en la principal antes de la 23.3, como cambio propio de `medicion/worker.ts`, sin vocabulario ni huella y sin desplegarse hasta la 23.3: es la Historia 23.12 *(v8.2, Héctor, 2026-10-23)*. Barajar no es migrar: es un paso idempotente de la orden que despliega el receptor, que corre después de comprobar con su baliza que el receptor en vivo inserta con `rowid` aleatorio y se repite en cada despliegue; un receptor anterior al cambio vuelve a dejar el orden, y la comprobación lo dice y no baraja. Cuesta unas tres filas escritas por fila: el paso las cuenta antes contra la cuota de escritura del día y, si no caben, `desplegar` no baraja, lo dice y sale con 1, y Héctor lo repite otro día; no se trocea por jornadas *(v8.2, Héctor, 2026-10-24)*. Los recuentos de antes y de después son `COUNT` por (jornada, evento), sin copiar ninguna fila. Pérdida nombrada: Time Travel guarda 7 días (30 en el plan de pago) y ninguna orden de `tools/` restaura producción.
- **AD-14 — la tabla migra solo hacia delante.** Las migraciones son versionadas y solo aditivas, y cambian el esquema, no las filas *(v8.2)*, con `wrangler d1 migrations` y `migrations_dir` en `wrangler.toml`, en `medicion/migrations/`. `esquema.sql` queda como estado acumulado de referencia, y una base nueva se crea solo aplicando las migraciones. La `0000` es la tabla de producción tal como está —las seis columnas y los dos índices de la v7.1, con `IF NOT EXISTS`—, y la `0001` lleva solo los `ALTER`. `wrangler` va con versión exacta y `--remote` siempre explícito.
- **AD-14 — el orden es migración, receptor, sitio, y se hace desde la rama.** Una orden de `tools/` aplica la migración en remoto, despliega el receptor comprobado con una baliza de prueba, después baraja *(v8.2)*, y versiona la huella del vocabulario desplegado. `npm test` falla si esa huella no casa con el vocabulario de `src/lib/`. El cambio vive en su rama y entra en la principal ya con su huella. Aplicar en remoto y desplegar el receptor son actos de Héctor.
- **AD-14 — reversión y lectura.** La reversión va en orden inverso, primero el sitio y después el receptor, y las migraciones no se revierten. No hay punto final de lectura: la línea base se lee desde `tools/` con `wrangler`, y el receptor sigue contestando 204 a todo lo que no sea `POST`. La misma orden informa de las filas escritas del día frente a la cuota y del tamaño de la base. `DESPLIEGUE.md` §3 deja de decir «No hay migración».
- **AD-15** — el 9:16 del visitante y el del Kit se componen en el cliente; las Tarjetas Sociales de los Directorios, en el build.
- **AD-16** — la entrada de la Tarjeta Social de una Obra incluye el fichero de su Autor, cuyo nombre pinta: renombrar un Autor la invalida. Es lo primero que se mira contra el techo del alojamiento: el 2026-10-16, los 5.116 PNG de `dist/` pesaban 308 de sus 485 MB. Hoy no hay caché de PNG, y es deuda declarada: cada build rasteriza todas las Tarjetas Sociales de Cita y de Obra (`src/pages/tarjeta/[slug].png.ts`). Ningún artefacto nuevo por Cita o por Obra entra sin su caché, y la deuda se paga cuando salta un tope con nombre del número de PNG de `dist/`, que el paso final de AD-9 cuenta y avisa sin romper. Su valor lo fija Héctor en un diff visible; hasta entonces el paso informa del número sin avisar *(v8.2)*.
- **AD-17 — los Directorios son producto.** `/autores/` y `/obras/` se declaran en `superficies.ts` con rutas literales con barra final y todas las consecuencias de AD-17, también la quinta, y sin páginas 2+. La historia de los Directorios muda a `superficies.ts` el conjunto cerrado de familias, con seis valores: `cita`, `autor`, `tema`, `coleccion`, `obra` y `directorio`. Hoy está en `FAMILIAS` y `FAMILIAS_DE_LA_SERIE` de `tools/lib/indexacion.ts` y en `FamiliaAvisable` de `tools/lib/avisar.ts`. `tools/lib/` lo importa, cada serie declara su subconjunto como constante con nombre, el aviso declara dos —las familias de fichero y las de ruta (AD-27)— y la medición ninguno: agrega por superficie *(v8.2)*. Una prueba fija subconjuntos, no igualdad.
- **AD-17 — los tipos de resultado.** Hay un solo tipo `directorio` en `tipoDeResultado.ts`, rotulado «Directorio», con el listado en `data-pagefind-ignore="all"` dentro de `main`. La portada declara también su tipo, rotulado «Portada» y titulado con el nombre del sitio («Portada: Sabiduría de Bolsillo»), sin repetir la marca en el rótulo *(v8.2)*, y responde solo por su título. Los tipos de resultado son las familias con resultado más `portada`, y una prueba lo fija; `tipoDeOpenGraph` sigue dando `website`.
- **AD-17 — el tipo de resultado no casa como texto.** Desde la 1.5.0, Pagefind busca en la metadata por omisión, así que un tipo buscable devolvería cada página de ese tipo. Lo emite solo el armazón, por un medio que no case. Ese medio lo elige la primera historia que escriba metadatos de Pagefind, y una prueba de búsqueda sobre `dist/` lo fija para las siguientes. Todo metadato que no deba puntuar lleva peso 0 en `ranking.metaWeights`.
- **AD-17 — una quinta consecuencia: qué vistas emite cada superficie.** Se declara en `superficies.ts` junto al carácter de la superficie, y de ahí sale el `data-*` de AD-6. La portada no emite la vista de una Cita por los componentes de la Cita del Día. La comprobación sobre `dist/` gana dos lectores. El conjunto del que rotan las Obras de la portada son rutas sin `noindex`. Y la marca `indexable` de `vista-de-obra` coincide con el `noindex` de su página.
- **AD-17 — el barrido.** Pide `wcag22aa` además de las etiquetas de 2.1, con axe 4.14.0, que deja de dar `target-size` en enlaces solapados con el mismo destino. El barrido móvil exige, a 320 px, `scrollWidth` ≤ ancho de la ventana en toda superficie pública. Es Playwright local entero.
- **AD-19 — la tarjeta no repite lo que la página ya dice.** La Tarjeta de Cita lleva la atribución que el contexto no da:
  - en el listado de Obra y en «De la misma obra», sin Autor ni Obra;
  - en el listado de Autor y en «Más de {Autor}», con el título de la Obra y sin el Autor;
  - en los de Tema y Colección, con Autor y Obra.

  El título de la Obra va siempre como texto, nunca como segundo enlace. La Página de Cita enumera hasta siete Citas con esa tarjeta, fuera de Pagefind, como la Tarjeta de Obra. Lo que se copia, descarga o comparte desde la portada lleva la canónica de la Página de Cita. Los Directorios listan entidades, nunca Citas.
- **AD-20 — un Modelo no trae `<script src>`.** Esa garantía la sostiene la lista cerrada de AD-6, no `MAX_BYTES_DE_GUION`.
  - **Los Directorios** no admiten ningún Modelo, por declaración propia; la revisión de la declaración lo rechaza, y se construyen idénticos con cualquier Modelo encendido o apagado.
  - **Las entradas a la Obra** tampoco alojan ninguno: la Tarjeta de Obra, «Siguiente», las Obras de la portada y lo que se comparte de la Página de Obra.
  - **En la portada,** la Cita del Día, su Tarjeta de Obra y sus acciones son un solo bloque, sin Modelo en medio.
  - **La isla de compartir de la Página de Obra** cuenta en el tope que `ingreso-construido.test.ts` mide en toda ruta con `data-ingreso`.
  - **La publicidad** sigue admitida en `/buscar/` con filtros, porque es la misma ruta.
- **AD-21** — el aviso diario de `publicar.yml` sigue diciendo «no medible», y ninguna historia de la v8 lo cambia: leer D1 desde Actions exigiría una credencial de Cloudflare que el CI no tiene. Saber si un Umbral se cruzó sigue siendo `npm run ingreso` hasta la pasada de métricas.
- **AD-23 — la posición de la Cita sale del mismo localizador que el cotejo.** La lee un cargador de contenido de `content.config.ts`, con el patrón del de biografías.
  - **Localiza con lo mismo:** el `indexOf` sobre las formas colapsadas de `tools/lib/cotejo.ts`, sobre el mismo conjunto de documentos que el cotejo —el de `documentosDeCita`, casado por prefijo y sin biografías— y con las Citas leídas por el mismo lector.
  - **Guarda todas las apariciones:** `{slug → [{documento, posición}]}`, con el `slug` del frontmatter, sin ordenarlas ni elegir, y nunca el texto. `obras.ts` las recibe por parámetro, y ningún fichero de Cita guarda su posición.
  - **Las pruebas:** una fija que ni el cargador ni el cotejo ordenan documentos para nadie más. Otra, sobre el Corpus, exige que alguna Obra documentada de varias Citas salga en un orden distinto del de slug.
- **AD-23 — el orden entre los documentos lo declara la Fuente.** En una Obra paginada, `tools/` recupera una vez el índice de subpáginas y lo versiona aparte, sin reescribir ningún documento. Mientras no esté capturado rige el orden natural del slug de página, con los números romanos leídos, fijado por una prueba. Una Cita que aparece en varios documentos toma la posición del primero en el orden de la Obra; a igual posición, decide el slug. Entre Fuentes de una misma Obra va primero la que más Citas aporta, y a igualdad, su identificador. Ese orden lo calcula, y esa aparición la elige, solo `obras.ts`. `corpus/fuentes/` se lee para cotejar y para ordenar, y nunca se publica su texto.
- **AD-24 — la familia `directorio`.** `/autores/` y `/obras/` forman una familia propia en las cinco series por familia de `tools/` —indexación, tráfico, demanda, rastreo y canal— y nunca cuentan en la de lo que listan. La familia sale del censo, nunca del prefijo de la ruta: `/obras/` no es una Obra. La serie de indexación toma las seis familias; tráfico, demanda, rastreo y canal, todas menos `obra` hasta la pasada de métricas. El informe nombra en su línea SM-11 las fechas que declara `umbrales.ts`.
- **AD-25 — el orden del libro tiene un solo dueño.** `obras.ts` ordena las Citas de una Obra por su posición en su documento cotejado; las que no tienen documento van detrás, por slug. De `obras.ts` leen ese orden:
  - el listado, en todas sus páginas, también las 2+;
  - «Siguiente cita de esta obra», que tras la última vuelve a la primera;
  - «De la misma obra», que reparte a pasos iguales sobre él;
  - la Tarjeta de Obra de la Cita del Día;
  - el orden de la búsqueda.

  Sustituye al orden por slug que hoy se calcula en línea en el `getStaticPaths` de la Página de Obra.
- **AD-25 — `data-pagefind-sort`.** Es un ordinal entero de ancho fijo que `obras.ts` compone en el build con los rangos de la función hermana de AD-3: el orden del Directorio del Autor, después el de su lista de obras y después el del libro. Va en toda Página de Cita, con un hueco declarado para «sin Obra» y otro para «sin documento». Es la excepción declarada a la convención de ausencia, porque Pagefind saca de los resultados ordenados a la página sin clave. Se aplica solo a `search(null, …)` con filtro. Una prueba sobre `dist/` exige que todo registro de tipo Cita la lleve y que todas sean numéricas.
- **AD-25 — la lista de obras.** La lista de obras de la Página de Autor y la Fila de Obra de `/obras/` son el mismo componente, con el mismo orden: recuento descendente, título y nombre de ficha. Ese orden es de `obras.ts`, que `publicado.ts` reexporta. Lo consumen la Página de Autor, `/obras/`, el selector de Obra de `/buscar/`, la rotación de la portada y la clave de `data-pagefind-sort`. El Directorio lista también las Obras que no se indexan.
- **AD-25 — el nombre de la ficha es interfaz pública** como valor del filtro `obra`. Toda Obra con Citas publicadas es valor de filtro, y solo las indexables salen como resultado. Retitular no rompe el filtro; reunir deja sin él las búsquedas con la absorbida, que la búsqueda ignora y lo dice. El año de una Obra nunca cuenta el de una traducción, y al traductor lo nombra solo `atribucion.ts` (FR-48). La congelación de SM-11 alcanza a las Obras de la portada, pero no a la navegación: la Tarjeta de Obra, `/obras/` y compartir la Obra siguen igual.
- **AD-27 — la relación va de cada superficie a (fichero, campos que pinta).** Un commit fecha y avisa una superficie solo si cambió uno de esos campos; el mecanismo es del código.
  - **La navegación de la Página de Cita** se pinta y no fecha: la Tarjeta de Obra con el año y el recuento de la Obra, «Siguiente», «De la misma obra», «Más de {Autor}», sus recuentos y el año del `isPartOf`.
  - **Qué fecha cada campo:** `ordenAlfabetico`, solo los dos Directorios, aunque mueva el `data-pagefind-sort`; `ordenRevisado`, ninguna superficie; la semblanza, solo la Página de Autor; `nota` y `ediciones`, solo la Página de Obra; `distintaDe`, ninguna.
  - **Las pruebas:** una Cita nueva no mueve la fecha de ninguna otra Página de Cita; un commit que solo escribe claves de orden mueve `/autores/` y `/obras/` y nada más; uno que solo escribe `ordenRevisado` no mueve nada.
- **AD-27 — qué ficheros compone cada superficie.**
  - **Los listados de Tema, Colección y Autor** ganan las fichas de Obra de sus Citas, cuyo título pintan.
  - **La Página de Obra** se compone de su ficha, sus Citas, el fichero de su Autor y sus documentos, por el mismo casado que el cotejo. Por eso el commit que añade una página a una Obra paginada fecha la Obra.
  - **Los Directorios** entran con todo lo que pintan, también las Citas, por sus recuentos.
  - **Una baja** fecha lo que componía en la relación de antes, con la fecha del commit que la saca. La prueba de inversas se escribe también sobre un corpus con una baja.
  - **Antes de desplegar:** la misma relación, leída por `tools/` sobre un rango sin desplegar, dice cuántas fechas mueve una sesión de siembra.
  - **La familia del fichero no es la de la ruta avisada** *(v8.2)*. El aviso declara dos constantes con nombre en `tools/lib/avisar.ts`, y una prueba fija las dos: lo que observa en el `git diff` —cada directorio con su familia de fichero, las cinco de `superficies.ts` con directorio en el Corpus más `documento`, de `corpus/fuentes/`, y `src/lib/umbrales.ts`, sin familia—, y las seis familias de ruta, cuya familia pone la entrada de la relación, nunca el fichero ni el prefijo. Los Directorios no tienen fichero propio y entran por sus páginas; la portada se avisa siempre, sin familia, y se informa aparte.
- **AD-28** — los Directorios y sus Tarjetas Sociales publican solo hechos del Corpus, y `atribucion.ts` los cuenta entre las superficies sin semblanza. El texto que se comparte de una Obra, «{título}, de {Autor}», se compone también en `atribucion.ts`; Facebook recibe solo el enlace.
- **Convención — parámetros de dirección.** Ninguno crea una ruta ni cambia la canónica. El estado de `/buscar/` es `?q=&autor=&obra=&tema=`, con identificadores. `obra` nunca va sin `autor`; si llega sin él, el Autor sale del mapa de rótulos. La búsqueda compone su dirección desde su propio estado y nunca copia `location.search`. La escribe tras la misma pausa, nunca por tecla, y toda escritura del historial va dentro de un `try`: el estado que deja la pausa entra con `pushState`, mientras sigue cambiando el mismo control se reescribe con `replaceState`, un estado asentado no se reescribe nunca —el primer cambio tras él abre entrada— y uno igual al de la dirección no la escribe. En `popstate` la isla repinta el estado de la entrada, de su objeto de estado o, sin él, de la dirección. Un filtro que no se puede usar se ignora, se dice y se quita con `replaceState`, sin abrir entrada, en un orden fijo: lo que no existe; la `obra` sin `autor` toma su Autor; la `obra` de otro Autor se descarta. Quitar `de` y `via` conserva el objeto de estado *(v8.2)*.
- **Convención — mensajes de estado.** Una región `role="status"` está en el marcado desde la carga, vacía y sin `hidden`; va dentro del `<dialog>` si se anuncia con él abierto. Hay dos ritmos, con un solo dueño en `src/lib/`. Lo que se repite se anuncia vaciando la región y escribiendo en el siguiente fotograma. Lo que cambia al teclear se anuncia tras su pausa, aparte del pintado de la lista, y solo si la frase cambió; «Mostrar 30 más» no vuelve a anunciar. Los guiones empaquetados importan ese dueño. Los guiones en línea reciben su texto derivado en el build con `String(…)` de la misma función, insertado con `set:html`; nunca por `define:vars` ni copiado a mano. Una prueba sobre `dist/` exige que toda isla en línea que anuncia lleve ese texto.
- **Convención — glosario y conjuntos cerrados.** El glosario gana `Directorio`, `Tarjeta de Obra`, `Tarjeta de Cita`, `Lectura`, `Salida interna`, `Zona`, `Marca de origen` y `Marca de difusión`. «Lectura», a secas, nombra solo el acto medido; el tipo de página se dice completo, «superficie de lectura». Son también conjuntos cerrados las zonas, los tramos de búsqueda, los filtros usados, la marca de `vista-de-obra`, `primera` *(v8.2)*, las dos clases de destino y los guiones externos.
- **Entorno operativo — la unidad de fusión es la épica.** Cada épica se integra en su propia rama, y la 24 y la 26 comparten una. Sus historias se fusionan allí, y la rama entra en la principal en un solo merge. El orden es: la 23; la 24 y la 26 juntas; la 25 y la 27, en cualquier orden; y la 28 al final, tras el juicio de SM-11 —desde el 2026-12-05— o con su fecha declarada. Esto cambia los bucles de `bmad-build`, que fusionaban historia a historia. El Corpus sigue fusionándose a diario en la principal *(v8.2)*. El cambio de vocabulario de AD-14 entra como una épica más, desde su rama y con su huella. Lo que `umbrales.ts` declara es la jornada UTC en que el despliegue de cada rama llega al sitio en vivo, no la del merge: la de la 24 con la 26 es la de la línea SM-11 y la de su corte de SM-8, y la de la 23, la de su corte *(v8.2)*. Dos excepciones declaradas, y ninguna más. Una es el `rowid` aleatorio del `INSERT` de `medicion/worker.ts`, que entra en la principal antes de la 23.3, solo y como cambio propio del adaptador, sin vocabulario ni huella, y no se despliega hasta la 23.3, para que toda vuelta atrás o redespliegue desde la principal lo conserve *(v8.2)*; es la Historia 23.12, que se fusiona sola en la principal. La otra es la 24.2, el aviso y el tope del peso de `dist/` tras Pagefind, que entra sola en la principal en cuanto Héctor dé sus dos valores, porque no cambia ningún fichero de `dist/` y vigila el peso desde ya. Son las dos únicas historias de la v8 que se fusionan fuera de su rama de épica *(v8.2, Héctor, 2026-10-23)*.
- **Entorno operativo — la principal nunca en rojo.** Cada push despliega, así que el orden de fusión es el orden de despliegue, y nada se fusiona con el CI en rojo. La publicación falló del 2026-10-11 al 2026-10-19 en `documento.test.ts` y `legibilidad.test.ts`, y el vivo se quedó con el Corpus del 11/10. La reparación, trabajo aparte de la v8, llegó al sitio en vivo el 2026-10-19 a las 09:22 UTC; desde entonces el vivo vuelve a ser el árbol de la principal. Llegó sin las constantes de SM-11, que añadió después 64b1bf0d: `DESPLIEGUE_DE_LA_REPARACION` = 2026-10-19, y la de la 24 con la 26 y la de la 28 en `undefined`. Junto a la de la 23, que da su corte, son cuatro jornadas, y cada una se anota el día en que su despliegue llega al sitio en vivo *(v8.2)*. Con la misma forma se anotan las jornadas de llegada de la 25, de la 27 y de la 28 si llega tras el juicio (AD-9) *(v8.2, Héctor, 2026-10-23)*.
- **Entorno operativo — lo que el CI no prueba.** El CI corre `npm run build`, `astro check` y `npm test` (Vitest), pero no Playwright. Estas son pruebas locales, declaradas así, que se corren a mano sobre la rama de cada épica antes de su merge:
  - la lectura a 8 s y `pageshow`;
  - las marcas quitadas con `replaceState`;
  - una salida interna por carga, y después de la lectura;
  - la primera acción de cada métrica por carga, también la que llega en la cola, detrás de su lectura *(v8.2)*;
  - el historial de `/buscar/` —«Autor, Tema, resultado, atrás, atrás» con caché y sin ella, y la recarga— *(v8.2)*;
  - el barrido WCAG 2.2 AA y el reflujo a 320 px;
  - la cabida de la Imagen en los dos formatos;
  - las que llaman a Pagefind: los recuentos de `filters()`, la búsqueda que fija el medio del tipo y el orden de `data-pagefind-sort`.

  De Pagefind, el CI cubre en Vitest los atributos de `dist/`. La Épica 25 cierra además con la matriz de dispositivos y el validador de Facebook, que son actos de Héctor. Antes de cada merge de épica se corre `npm run test:e2e` entero sobre la rama, no solo las pruebas que nombra su historia de cierre. Toda construcción de una rama con la medición puesta —Playwright, Lighthouse para NFR-7, la matriz de la 25.7 por el túnel— apunta a un receptor local (`wrangler dev` con D1 local, que monta la 23.2) y nunca escribe en el D1 de producción; la principal con la que se compara NFR-7 se construye y se sirve igual, en local, y nunca se mide en vivo *(v8.2)*. Fusionar cada rama es acto de Héctor: un agente puede correr y anotar las pruebas, nunca fusionar *(v8.2)*. Dos pasadas escriben en el D1 de producción, y ninguna más: la 25.3, que va sobre el sitio en vivo, y la segunda pasada de la 25.7, cuyo clic en la tarjeta de Facebook aterriza en la canónica en vivo. Sus jornadas y sus rutas viven en una constante con nombre de `umbrales.ts`, citada en `DESPLIEGUE.md`, y la orden de la 23.10 las descuenta igual en cada lectura *(v8.2, Héctor, 2026-10-23)*. La 27.9 no es una tercera: lo prueba todo sobre la rama contra un receptor local y, tras el merge, solo anota su jornada de llegada *(v8.2, Héctor, 2026-10-24)*.
- **Entorno operativo — dónde se anota** *(v8.2)*. **Lo que una historia anota** —tiempos de build, medidas de lo construido, cifras de Lighthouse, recuentos de su orden— va en el spec de la historia (`_bmad-output/implementation-artifacts/`), con fecha; no es un dato que lea el código. Lo que se anota sobre el vivo después del merge —los recuentos de D1 de la primera jornada, la matriz de dispositivos y el plan de Cloudflare— va en `DESPLIEGUE.md` §3 o en la sección de la matriz. La jornada y las rutas de toda pasada que escribe en producción se citan allí, y viven en su constante de `umbrales.ts`; que Héctor miró la comparación por firma y da por buena una línea base, con fecha y métrica, va en `DESPLIEGUE.md` §3 *(v8.2, Héctor, 2026-10-23)*. Es la regla de los «queda anotado» de las historias: 23.3, 23.4, 23.11, 24.1, 24.5, 24.6, 24.8, 25.7, 26.5, 26.11, 27.2, 27.3, 27.8, 27.9 y 28.5 *(v8.2)*.
- **Entorno operativo — techos del alojamiento y del receptor.** GitHub Pages admite 1 GB por sitio publicado y corta el despliegue a los 10 minutos. `dist/` medía 485 MiB según `du` el 2026-10-16, 445 MiB en bytes, que es lo que mide el paso final *(v8.2)*, y cada Cita nueva suma unos 95–100 KB. `umbrales.ts` declara un aviso y un tope del peso de `dist/`, los dos por debajo de 1 GB y con margen. Un paso final de `npm run build`, después de Pagefind, los mide sobre lo que se despliega, `dist/pagefind/` incluido y sin lo que rota con la jornada (AD-9) *(v8.2)*: avisa al pasar el aviso, rompe al pasar el tope y dice cuántos ficheros tiene `dist/`. Hoy son 15.339, y Cloudflare Pages corta a 20.000. D1, en el plan gratuito, admite 100.000 filas escritas al día y 500 MB por base, y al pasarlos las escrituras fallan en silencio hasta las 00:00 UTC. La v8 pasa de un evento por carga a unos tres; con los dos índices, unas nueve filas escritas por carga, y caben unas 11.000 cargas al día *(v8.2)*.
- **Entorno operativo — versiones.**
  - **Node:** `>=22.12.0`. Pasa a `>=22.22.0` en el mismo commit que suba Astro a la 7.4, con `engines` y `tools/comprobar-node.mjs`, y en ese commit se reverifica el *inlining* de AD-6.
  - **TypeScript:** ^5.9, no la 7, que `astro check` no admite.
  - **Zod:** migra de `astro:content` a `astro/zod`.
  - **`wrangler`:** 4.151.1, en versión exacta donde lo invoquen las órdenes, sin `@cloudflare/workers-types`.
  - **axe:** 4.14.0, con `wcag22aa`.
  - **Pagefind:** ^1.5.2.

**Preguntas abiertas que heredan las historias** (espina v8.2 y SPEC v8.2, sin cerrar) *(v8.2: las dos primeras de la v8 —la zona de los formularios internos y de las salidas sin resultados, y `?autor=a&obra=b` con una Obra de otro Autor— las cerró Héctor el 2026-10-19, y ya las recogen la espina v8.2 y la UX v8.2)*:

- El valor del mínimo de lecturas que cierra una línea base. Ninguna fuente lo da, y se fija en un diff visible antes de leer la primera.
- Los valores del aviso y del tope del peso de `dist/`, y el del tope del número de PNG (AD-16), que Héctor fija en un diff y puede quedar sin valor *(v8.2)*. Los fija, con Héctor, la historia que crea la comprobación, la 24.2, que entra sola en la principal en cuanto tenga los dos primeros *(v8.2, Héctor, 2026-10-23)*.
- Qué hace «Historia de Instagram» en iOS si Instagram no ofrece la historia al recibir el fichero. La matriz de dispositivos corre dos veces, antes de construir el 9:16 (AD-7) y al cerrar la Épica 25 (PRD), y la épica dice qué comprobación es puerta de qué paso.
- Si la ventana de 8 semanas de SM-11 se reinicia desde el despliegue que reparó la publicación, el 2026-10-19 *(v8.2)*. Decide Héctor antes del 2026-12-05, y de la respuesta dependen la fecha de la 28, congelar la familia y encender la afiliación.
- El commit único de las aptas (21.2): si entra antes que la Épica 24, que construye el criterio nuevo de AD-27, fecha y avisa una vez sus ~104 Páginas de Cita. Hay que decidir si eso se acepta o si la 21.2 se ordena después de la 24.
- Qué reuniones de Obra se aplican, ya publicadas sus URL. Desde la v8, reunir deja además sin filtro las búsquedas compartidas con la absorbida.
- El plan contratado de Cloudflare, que se revisa al desplegar la 23.
- Cuándo se cierra la línea base de SM-12, que junta llegadas a Páginas de Cita y de Obra, y si SM-C3 y SM-C5, que saltan por la dirección, llevan además umbral de magnitud (PRD §14, pregunta 9) *(v8.2)*.
- Si la frase de la portada sin ninguna Cita apta (UX-DR108) se escribe aparte o si `DESCRIPCION_DEL_SITIO` de `src/lib/marca.ts` cambia con ella, y con ella la `description` de la portada, el `WebSite`, la bajada de su Tarjeta Social y la descripción del canal de `rss.xml`. `EXPERIENCE.md` las da por iguales, y la constante dice hoy otra cosa: «Citas célebres en español, cada una con su autor y la obra de la que procede, cuando consta.». La cierra `bmad-ux`, y bloquea la 28.2 *(v8.2)*.

**Desalineaciones que las historias resuelven por precedencia** (SPEC v8.2) *(v8.2: salen las dos que la espina v8.2 y la UX v8.2 alinearon —la fecha de SM-11 es la del despliegue en vivo, y rige WCAG 2.2 AA—)*:

- El `lastmod` de la Página de Obra lo fija AD-27 —ficha, Citas, fichero del Autor y documentos— hasta que `bmad-prd` alinee FR-51.
- La congelación es la constante `CONGELACION_DE_OBRAS` de `umbrales.ts`, no el «dato del corpus» que aún dice AD-25.
- AD-17 añade a `/buscar/` un tipo «portada» que FR-7 no enumera.
- La «Tarjeta de Obra» de AD-16 es la Tarjeta Social de la Obra, no la tarjeta de la Página de Cita.
- `AGENTS.md` describe un solo ritmo de anuncio; rigen los dos de la espina.
- `DESPLIEGUE.md` §3 dice «No hay migración»; lo pone al día la Épica 23.
- El inventario de la v5 de este fichero aún pone la afiliación en la Página de Autor; rige AD-20 v7.1.
- AD-11 da las seis Obras de la portada a `publicado.ts`, AD-12 las pone junto a `citaDelDia.ts`, y AD-11 conserva «cada una con su fuente»: mandan AD-12 para el dueño y la UX v8.2 para el texto *(v8.2)*.
- La espina no nombra la cuota de lectura de D1 —5 millones de filas leídas al día en el plan gratuito— ni qué informa de ella la orden de la línea base (`bmad-architecture`) *(v8.2)*.
- La espina no dice cómo se activa la frase de iOS de la Historia (25.5): Héctor decidió el 2026-10-23 que sea una constante con nombre de `umbrales.ts`, apagada, que él enciende en un diff visible tras la matriz, como `SM12_CON_FACEBOOK`, y rige eso hasta que la espina la nombre *(v8.2, Héctor, 2026-10-23)*.
- `EXPERIENCE.md` da la frase de la portada sin ninguna Cita apta por igual a `DESCRIPCION_DEL_SITIO`, y la constante dice otra cosa. Esta no se resuelve por precedencia: es la pregunta abierta de arriba, pendiente de `bmad-ux`, y la 28.2 no se cierra sin la respuesta *(v8.2)*.

**Aplazado a propósito, y no se construye en estas épicas:**

- **El tope de bytes de HTML de la Página de Cita:** se crea si Héctor lo decide, al degradarse la medición a mano de NFR-7 en una historia de cierre o para vigilar ese peso (24.2) *(v8.2)*.
- **El índice de subpáginas de la Fuente:** se captura con la primera Obra que salga desordenada; no hay detector.
- **Trocear los filtros de Pagefind y el mapa de rótulos, y paginar `/obras/`:** cuando el build avise de que pasaron su tamaño con nombre.
- **Conservar el guion de medición anterior durante un despliegue.**
- **La sesión o un identificador de visita:** NFR-11 los veda.
- **El archivo de la Cita del Día.**
- **La caché de PNG de las Tarjetas Sociales** (AD-16): deuda declarada, que se paga cuando salte el tope del número de PNG o entre un artefacto nuevo por Cita o por Obra, lo primero que ocurra *(v8.2)*.

**Fuera de la espina, sin historia todavía:** `publicar.yml` usa acciones para Node 20, retirado el 2026-09-23, y es trabajo de una historia de mantenimiento.

### UX Design Requirements

Numeración continua desde la v7.1, que terminó en UX-DR53. Los requisitos salen de las espinas de UX v8 del 2026-10-18 (`DESIGN.md` y `EXPERIENCE.md`), con las variantes que eligió Héctor, y de su pasada v8.2 del 2026-10-20 (c3afeefd) *(v8.2)*. Lo que las espinas marcan [ASSUMPTION] entra como requisito con la medida que dan, y las cifras que piden volver a medir se miden sobre lo construido.

UX-DR54: **Cabecera** *(variantes 1A y 2A)*, en toda superficie pública: «Sabiduría de Bolsillo · Autores · Obras · Buscar», con filete inferior `{colors.outline-variant}`, dentro de una navegación llamada «Principal». La marca lleva a la portada y los tres enlaces a `/autores/`, `/obras/` y `/buscar/`, todos en la misma pestaña y con `aria-current="page"` en su página. La marca va en Inter al cuerpo, peso y espaciado de `{typography.author}` (13 px, 600, 0,09em), en mayúsculas y `{colors.on-surface}`: es un enlace de bloque, subrayado solo al pasar el cursor, y va **a su ancho**, así que su zona de toque es su texto con 44 px de alto y no la fila entera. Los tres enlaces van en `{typography.body-md}` (15 px) y subrayados siempre: «Autores» y «Obras» en `{colors.on-surface}`, «Buscar» en `{colors.primary}`. Cada uno tiene una zona de toque de 44 × 44 px como mínimo y `{spacing.unit}` de relleno lateral. Entre ellos va un punto medio en `{colors.on-surface-variant}`, con `aria-hidden`, que da los 8 px entre zonas. Orden de tabulación: «Saltar al contenido.», marca, Autores, Obras, Buscar. Zona de salida: `cabecera`.
UX-DR55: **Disposición de la Cabecera.**
- **Por debajo de 600 px, dos filas.** La marca va en la suya y los tres enlaces debajo, alineados a la izquierda con el texto de la marca (el primero se retranquea sus 8 px de relleno). Lleva `{spacing.unit}` (8 px) de aire arriba, entre las filas y abajo, para que la zona de la marca quede a 8 px de la de los enlaces.
- **Medidas a 360 y a 320 px.** La cabecera mide unos 113 px en los dos anchos. La Cita de la Página de Cita empieza hacia los 153 px, dentro de la primera pantalla de 360 × 640 (NFR-8); esta cifra se vuelve a medir sobre lo construido.
- **Desde 600 px, una sola fila**: la marca a la izquierda y los enlaces a la derecha, con 2 × `{spacing.unit}` (16 px) de aire.
- **Reflujo.** No hay desplazamiento horizontal a 320 px. Si los enlaces no caben (320 px con el texto al 200 %), se parten en otra fila con 8 px entre filas. Ningún enlace lleva `white-space: nowrap`.
UX-DR56: **Portada** *(variantes 3A y 4A)*. El orden, de arriba abajo:
- la Cabecera;
- la línea de cifras;
- el campo de búsqueda;
- «La cita de hoy», con su Tarjeta de Obra y sus acciones;
- las seis Obras;
- los Temas;
- las Colecciones, cada una con su criterio;
- los ocho Autores destacados;
- al final, y solo si está encendida, la Invitación de donación.

  **La marca de la cabecera es el `h1` de la portada.** No cambia de aspecto, sigue siendo enlace, lleva `aria-current="page"` y queda en la región de la cabecera, no en `main`: así sale una vez y la cabecera es idéntica en toda página. Dentro de la medida de prosa, cada bloque abre con su Rótulo de sección (`h2`) a 6 × `{spacing.unit}` (48 px) del anterior, y su contenido empieza 2 × (16 px) más abajo; el de la Cita del Día, a 3 × (24 px). El texto de la Cita del Día empieza en la primera pantalla de 360 × 640 (FR-9). «Saltar al contenido.» lleva a la línea de cifras.
UX-DR57: **Línea de cifras**, lo primero de la columna: «{n} citas de {m} autores; {k} cotejadas con el texto de su fuente.» (redacción 1). Las cifras llevan punto de millar, y k son las Citas con documento cotejado. Va en `{typography.body-md}` y `{colors.on-surface-variant}`, sin cifra destacada, tamaño de reclamo ni color propio. La compone el build con lo publicado: es un hecho del Corpus, no un contador (FR-9). **Nunca dice «cada una», en ninguna forma,** mientras quede alguna Cita en el censo de pendientes de cotejo. Con el censo vacío, k = n y la línea pasa a «{n} citas de {m} autores, cada una cotejada con el texto de su fuente.», con «de 1 autor» si hay uno solo y «1 cita de 1 autor, cotejada con el texto de su fuente.» si hay una sola Cita; conserva el verbo de la redacción 1, y su prueba veta «cada una» mientras quede censo *(v8.2)*. La cifra de cotejadas no es SM-C1.
UX-DR58: **Campo de búsqueda** *(v8)*, en `/buscar/`, el 404, la portada y «Buscar en…».
- **Etiqueta y filete.** La etiqueta va visible encima, en `{typography.caption}` y `{colors.on-surface-variant}`, a `{spacing.unit}` del campo. Filete inferior de `{components.rule-width}` (1 px) en `{colors.outline}` (3,66:1), sin caja, sombra ni icono.
- **Lo tecleado** va en Inter, al cuerpo de `{typography.body-lg}` (17 px), y en `{colors.on-surface}`.
- **Foco.** Lleva el anillo global y, además, el filete pasa a `{colors.primary}` y se engruesa; se suma al anillo, nunca lo sustituye.
- **Botón «Buscar».** En la portada, el 404 y «Buscar en…», que envían a `/buscar/`, el campo lleva debajo el botón secundario «Buscar», a su ancho y a 2 × `{spacing.unit}` (16 px). También se envía con Intro o con la tecla de buscar del teclado del móvil. En `/buscar/` y en el filtro de los Directorios, que responden al teclear, no hay botón. En la portada, el 404 y la página 1 de Obra, Autor y Tema hay dos «Buscar» con el mismo nombre —el enlace de la cabecera y el botón—, y se acepta: llevan a `/buscar/`, y el control por voz numera los nombres repetidos *(v8.2)*.
- **Texto de ejemplo** *(v8.2)*. «Por ejemplo: no hay camino» va solo en los campos que buscan en todo el Corpus —el de `/buscar/`, que inserta la isla, el del 404 y el de la portada—; no lo llevan «Buscar en…» ni el filtro de los Directorios, y ningún ejemplo nombra un Autor ni una Obra. Una prueba exige que «no hay camino» dé algún resultado.
- **En la portada** es un formulario GET a `/buscar/?q=`, sin guion, a 3 × `{spacing.unit}` (24 px) de la línea de cifras.
UX-DR59: **Cita del Día en la portada** *(v8)*.
- **Qué lleva.** Bajo el `h2` «La cita de hoy» va el Bloque de Cita a su tramo, con su Atribución y, si consta, su Línea de la Fuente pegada a la Procedencia. A 3 × `{spacing.unit}` (24 px) va «Ver esta cita», hacia su Página de Cita: en `{typography.body-md}` y `{colors.on-surface}` (ya no en siena, en la portada; el del 404 sigue en siena, como está construido, y es la única navegación que informa que va en siena en una superficie pública *(v8.2)*), subrayado y con zona de toque de 44 px. Su zona de salida es `cita-del-dia`.
- **Después, lo mismo que en la Página de Cita**: la Tarjeta de Obra, las Acciones y «Compartir en», con sus tokens y sus condiciones. Aquí **«De la obra» y «Compartir en» son `h3`**, dentro de «La cita de hoy».
- **Todo actúa sobre su Página de Cita.** Lo copiado es idéntico carácter por carácter, la Imagen es la misma y lo compartido enlaza a su canónica con `?via=`, nunca a `/`. Todo se registra como de la portada (FR-9, FR-20).
- **Un solo bloque.** La Cita, su Tarjeta y sus acciones van marcadas `data-jornada` y en `data-pagefind-ignore="all"`, y nada se intercala entre ellas, ningún Modelo tampoco.
UX-DR60: **Obras de la portada**: seis Filas de bloque bajo el `h2` «Obras».
- **Cuáles.** Seis Obras **indexables**, de seis Autores distintos mientras los haya; con menos Autores, una de cada uno. Son las mismas para todos los visitantes de una jornada y rotan con ella (AD-12). Rotan aparte de la Cita del Día: la Obra de la Cita del Día puede salir también entre las seis, y no se excluye, así que algún día la misma Obra aparece dos veces en la primera mitad de la portada. Una fijación del Lote no cambia las Obras *(v8.2)*. Si rige la congelación de SM-11, salen del conjunto congelado.
- **Cada fila.** El título va en Inter al cuerpo de `{typography.body-lg}`, con peso 600 y en `{colors.on-surface}`, y parte palabras antes que desbordar. Debajo, «{Autor} · {año} · {n} citas» en `{typography.caption}` y `{colors.on-surface-variant}`: el año solo si consta sin discrepancia, sin traductor, con los puntos medios ocultos y una pausa entre las dos líneas para el lector de pantalla.
- **Cierre.** A 2 × `{spacing.unit}`, «Las {n} obras ›» lleva al Directorio de Obras, en `{typography.body-md}` y `{colors.on-surface}`, subrayado y con zona de toque de 44 px.
- **Zona y ausencia.** Zona `obras-de-portada`. Sin Obras indexables, el bloque no existe, ni rótulo ni hueco. No aloja ningún enlace comercial.
UX-DR61: **Temas y Colecciones de la portada**: todos los publicados, cada grupo bajo su `h2`. Los chips de Tema y de Colección no cambian: Source Serif al cuerpo de `{typography.body-md}`, fondo `{colors.surface-container}`, radio `{rounded.lg}`, 44 px de alto, 2 × `{spacing.unit}` de relleno lateral y `{spacing.unit}` entre chips. **Cada Colección va en su fila** *(variante 3A)*: el chip y, a `{spacing.unit}` debajo, su criterio, en `{typography.caption}` y `{colors.on-surface-variant}`. El criterio es una frase en los renglones que pida, nunca recortada, se asocia al chip con `aria-describedby` y no enlaza. Entre Colecciones, 2 × `{spacing.unit}`. El chip de Colección sigue sin aparecer en la Página de Cita (FR-28). Zonas: `chip-de-tema` y `colecciones`.
UX-DR62: **Autores destacados**: ocho Filas de bloque bajo el `h2` «Autores». Son los mismos ocho que los de la búsqueda sin resultados y salen de una sola función; cada nombre enlaza con el componente de su sitio: Fila de bloque en la portada y Chip en la búsqueda sin resultados, como los Temas y las Colecciones de esa salida *(v8.2)*. Son los de más Citas publicadas, con el suelo latinoamericano de FR-8. **Se presentan en el orden del Directorio de Autores**, por su clave de orden, nunca por recuento. El nombre va en Source Serif al cuerpo de `{typography.headline-sm}` (21 px), con peso 400, en `{colors.on-surface}` y sin subrayado. Cierra, a 2 × `{spacing.unit}`, «Los {m} autores, de la A a la Z ›», hacia el Directorio de Autores, con el trato de «Las {n} obras ›». Zona: `autores-de-portada`. La lista entera de Autores sale de la portada.
UX-DR63: **Orden de la Página de Cita** *(v8)*.
- **Orden de los bloques:** el Bloque de Cita con su Atribución y la Línea de la Fuente pegada a la Procedencia; la Tarjeta de Obra; Copiar e Imagen; el bloque «Compartir en»; «De la misma obra»; «Más de {Autor}»; los Temas.
- **La Cita, primero.** Nada nuevo va antes que ella, que sigue siendo lo primero visible a 360 × 640 con la cabecera en dos filas (FR-1).
- **Copiar.** Con Tarjeta de Obra, Copiar queda justo por debajo de la primera pantalla: es una deuda aceptada, que vigila SM-C5. Sin Obra, las acciones suben.
- **Orden de tabulación, el mismo:** el Autor, el título de la Obra y la Fuente (la Cita no es enfocable); la Tarjeta, con «Siguiente» y «Ver la obra»; Copiar, Imagen y los destinos; «De la misma obra», «Más de {Autor}», los Temas y el pie.
- **«Compartir la cita» se retira.**
UX-DR64: **Tarjeta de Obra** *(variante 1A)*, un componente único (`TarjetaDeObra.astro`).
- **Dónde.** Detrás de la Línea de la Fuente o, si no hay Fuente, de la Atribución, dentro de la medida de prosa. **Plana y en tinta**: ni fondo, ni radio, ni siena.
- **Apertura.** A 4 × `{spacing.unit}` (32 px) de lo de arriba, con filete superior `{colors.outline-variant}` a lo ancho y 3 × (24 px) de aire.
- **Rótulo.** «De la obra», el Rótulo de sección: `h2`, y `h3` en la portada.
- **Título.** A `{spacing.unit}`, el de su Ficha de Obra, en Inter al cuerpo de `{typography.body-lg}`, con peso 600 y en `{colors.on-surface}`. **No enlaza.** Reparte sus líneas equilibradas y parte palabras antes que desbordar.
- **Hechos.** A `{spacing.unit}`, «{Autor} · {año} · {n} citas» («1 cita» en singular), en `{typography.caption}` y `{colors.on-surface-variant}`, sin enlaces. Los puntos medios van ocultos y suenan como una coma. El año va solo si las Citas que lo declaran coinciden, y nunca es el de una traducción.
- **Dos Filas de bloque**, a 2 × `{spacing.unit}`, en `{typography.body-md}`, con filete encima de la primera y debajo de cada una: «Siguiente…» (zona `siguiente`) y la que lleva a la Obra (zona `tarjeta-de-obra`). Esa segunda dice **«Ver la obra y dónde leerla ›» si alguna Cita de la Obra está cotejada, y «Ver la obra ›» si ninguna lo está**.
- **Medida.** Unos 240 px a 360.
- **Lo que no cambia.** Sin Obra, la tarjeta no existe y no deja hueco. No aloja ningún Modelo y sale idéntica con la afiliación encendida o apagada. La congelación no la quita. Va fuera del cuerpo de Pagefind.
UX-DR65: **«Siguiente»**, la primera fila de la Tarjeta de Obra. Va en tinta, no en siena, y se compone en el build: es determinista y no lleva guion.
- **«Siguiente cita de esta obra ›»** lleva a la Cita que sigue a esta en el orden del libro, que es el del Listado de Obra. Tras la última, lleva a la primera.
- **Si la Obra tiene una sola Cita**, el enlace es **«Siguiente cita sobre {tema} ›»**, con el Tema en minúscula tras «sobre» («Siguiente cita sobre la vida ›»). Toma el primer Tema publicado de la Cita, en el orden en que la Cita los declara, y lleva a la primera Cita que la sigue en su listado y es de otro Autor, nunca a otra del mismo Autor. Si detrás no queda ninguna de otro Autor, lleva a la primera del listado que lo sea.
- **Sin «Siguiente».** Sin Tema publicado, o si ese Tema no tiene Citas de otro Autor, no hay «Siguiente» y queda solo «Ver la obra».
- **Retener sin recordar.** Se retiene con lo que el sitio compone para todos, nunca con lo que guarda del visitante: ni «seguir donde lo dejaste» ni la última búsqueda recordada en el navegador.
UX-DR66: **Acciones de la Página de Cita** *(v8: la posición)*.
- **Cuáles.** «Copiar la cita» y «Descargar como imagen», que pasa a «Compartir como imagen» donde el navegador sabe compartir ficheros.
- **Dónde.** Cada una en su línea y a su ancho, en todas las anchuras, debajo de la Tarjeta de Obra; sin Obra, debajo de la Atribución y de la Línea de la Fuente. Copiar va a 4 × `{spacing.unit}` (32 px) de lo de arriba, e Imagen a 2 × (16 px).
- **Cómo.** Las dos son el botón secundario: `{typography.body-md}` en `{colors.primary}`, filete de 1 px en `{colors.primary}`, radio `{rounded.DEFAULT}` (3 px), 44 px de alto y 3 × `{spacing.unit}` (24 px) de relleno lateral. Al pasar el cursor se rellenan de siena con el texto en `{colors.on-primary}`, y Copiar se queda así mientras dice «Copiado.». Sin icono, y ninguna es primaria.
- **En la portada**, el mismo trato sobre la Cita del Día.
- **Por encima de 300 caracteres** la Imagen no existe, tampoco en la portada, y nada lo explica.
UX-DR67: **Rutas de salida** *(variante 3A)*, al pie de la Página de Cita y dentro de la medida de prosa.
- **Apertura.** Bajo «Compartir en», 8 × `{spacing.unit}` (64 px) en móvil y 12 × (96 px) en escritorio, un filete superior `{colors.outline-variant}` y 3 × `{spacing.unit}` (24 px) de aire.
- **Grupos.** «De la misma obra», «Más de {Autor}» y «Temas», en ese orden. Cada uno lleva su Rótulo de sección (`h2`), con 2 × `{spacing.unit}` (16 px) hasta su contenido y 4 × (32 px) entre grupos.
- **Listas.** Cada lista lleva su filete superior, va en Tarjetas de Cita de los listados y cierra con una última Fila de bloque en `{typography.body-md}` y `{colors.on-surface}`. Los Temas van en Chip de Tema, separados por `{spacing.unit}`.
- **Reglas.** Un grupo sin contenido no se dibuja, y la página nunca queda sin enlaces internos. Todo va fuera del cuerpo de Pagefind: ninguna búsqueda devuelve una Página de Cita por el texto de las Tarjetas que enlaza.
- **Medida.** A 360, la página crece de unos 1.500 a unos 2.780 px, y todo lo que crece cae después de las acciones.
UX-DR68: **De la misma obra**: hasta tres Tarjetas de Cita de la Obra, sin repetir la que se lee ni la siguiente. Se reparten a pasos iguales a lo largo del orden del libro, en vez de ir contiguas, y van **sin Autor ni título de Obra**. Cierra con «Las {n} citas de {título} ›», hacia la Página de Obra. Zona: `misma-obra`. Si no queda ninguna que ofrecer, como en las 87 Obras de dos Citas, o si la Cita no tiene Obra, el bloque no existe.
UX-DR69: **Más de {Autor}**: hasta `MAX_CITAS_RELACIONADAS` (4) Tarjetas de Cita del Autor que no sean de la misma Obra, ni la que se lee, ni la siguiente. Van **sin el Autor y con el título de su Obra**. Cierra con «Las {n} citas de {Autor} ›», hacia la Página de Autor. Zona: `rutas-de-salida`. Con una Cita sin Obra, elige entre todas las demás Citas del Autor. Si no queda ninguna que ofrecer, el bloque no existe.
UX-DR70: **Tarjeta de Cita con Obra** *(enmienda UX-DR11)*.
- **Qué lleva.** El fragmento en `{typography.headline-sm}` y, donde el listado no lo da por sabido, el Autor en `{typography.author}`. Debajo, a `{spacing.unit}`, el título de su Ficha de Obra en Inter, `{typography.caption}` y `{colors.on-surface-variant}`, sin versalitas, **como texto y nunca como un segundo enlace**.
- **Qué lleva cada sitio.** En Tema y en Colección, Autor y Obra. En Autor y en «Más de {Autor}», solo la Obra. En Obra y en «De la misma obra», ninguno de los dos. Una Cita sin Obra no lleva línea de Obra.
- **El componente.** Uno solo, sin tamaño compacto (AD-19). Toda la tarjeta es enlace, de 44 px de alto como mínimo. Al pasar el cursor, el fondo pasa a `{colors.surface-container-low}`, sin sombra.
- **Lo que suena.** Entre el fragmento, el Autor y la Obra que lleve suena un «, » solo para lectores de pantalla, sin ninguna palabra más: el nombre de la tarjeta es su texto visible, en su orden (WCAG 2.5.3) *(v8.2)*.
UX-DR71: **Bloque «Compartir en»** *(variante 2C)*, a 3 × `{spacing.unit}` (24 px) bajo Imagen y dentro de la medida de prosa, también en escritorio.
- **Rótulo.** «Compartir en», el Rótulo de sección: `h2`, y `h3` en la portada.
- **Rejilla.** A 2 × `{spacing.unit}` del rótulo, una rejilla de dos columnas con `{spacing.unit}` entre celdas y `role="list"`. «Historia de Instagram» ocupa la primera fila entera, solo donde aparece. Debajo, un 2 × 2 fijo con WhatsApp, Facebook, Threads y «Más opciones…», que no se recoloca haya Historia o no.
- **Cada destino** es el botón secundario y ocupa su celda, con 2 × `{spacing.unit}` (16 px) de relleno lateral y sin el icono de su red.
- **Nombre accesible.** **El texto visible es solo el destino.** El prefijo «Compartir en » va en `.solo-para-lectores`, así que el nombre accesible es «Compartir en {destino}», con `AVISO_DE_PESTAÑA_NUEVA` dentro en los destinos que abren pestaña.
- **Reflujo y medida.** Pasa a una columna cuando una celda no cabe (320 px con el texto al 200 %). Mide unos 180 px desde el rótulo con la Historia y 52 menos sin ella, sin hueco reservado.
- **Destinos de enlace.** Son enlaces del HTML inicial, compuestos en el build, con `?via={destino}` en la URL compartida. Nunca llevan `?de=`, y la canónica no cambia.
- **Texto propuesto.** La Cita y su Autor. Facebook (`sharer.php?u=`) recibe solo el enlace. X y Threads, cuando la Cita no cabe, reciben solo el Autor y el enlace, nunca un fragmento.
- **Registro.** Cada pulsación registra `comparticion-de-enlace` con su destino.
UX-DR72: **«Más opciones…»**, la cuarta celda del 2 × 2: un `<details>` nativo, cerrado al cargar. Su `<summary>` tiene el trato de botón secundario, sin el marcador del navegador, y su nombre accesible es «Más opciones para compartir».
- **Sin guion, o con guion y sin Hoja del Sistema**, despliega Telegram, X y Correo, que son enlaces del HTML inicial, en otra rejilla igual, a `{spacing.unit}` bajo el 2 × 2 y fuera de la celda del botón. El foco se queda en el `summary`, y los tres destinos lo siguen en el orden del documento.
- **Con guion y Hoja del Sistema**, la isla lo cambia por un `button` **sin `aria-expanded`** que abre la hoja con enlace, texto y `?via=opaco`, y registra `opaco`. Para eso basta con que el navegador sepa compartir enlaces.
UX-DR73: **«Historia de Instagram»: cuándo existe.** La isla la inserta en la Página de Cita y sobre la Cita del Día solo cuando se cumplen las cuatro condiciones:
- puntero grueso (`pointer: coarse`);
- un navegador que puede compartir el fichero;
- guion;
- una Cita que admite Imagen, según un `data-*` derivado de `tramos.ts` (300 caracteres o menos).

  **Depende del puntero, no del ancho.** En escritorio, en el navegador de la aplicación de Facebook en Android, sin JavaScript o por encima de 300 caracteres, **no existe**: ni se oculta, ni se deshabilita, ni se avisa, y el 2 × 2 queda igual. Nunca aparece en la Página de Obra. Al insertarse, lo de debajo baja 52 px.
UX-DR74: **Diálogo de Imagen en la Historia de Instagram** *(variante A, dos toques)*.
- **Marco.** El `<dialog>` nativo del Diálogo de Imagen, con su marco (`{colors.surface}`, filete de 1 px en `{colors.outline-variant}`, radio `{rounded.lg}` y 3 × `{spacing.unit}` de relleno) y la atenuación del fondo al 40 % de `{colors.on-surface}`. **No tiene botones de plantilla**: solo hay Papel.
- **Primer toque.** Abre el diálogo y pide el generador en ese momento, no antes (AD-6).
- **Arriba.** En `{typography.body-md}`, la línea «Se copia el enlace para el sticker Enlace.», asociada al diálogo por `aria-describedby`. A `{spacing.gutter}` (24 px), «Cerrar», como botón secundario.
- **Previsualización.** El 9:16 cabe en alto: va centrado a 1:6 (180 × 320 px a 360 de ancho), con esquinas rectas, filete `{colors.outline-variant}` y 3 × `{spacing.unit}` arriba y abajo. Es una imagen con nombre (`role="img"`): «Imagen vertical para la historia: la cita, su autor, su procedencia y sabiduriadebolsillo.net». Nunca pasa del alto disponible, y el diálogo se desplaza por dentro cuando no cabe.
- **«Compartir en la historia».** El botón primario va debajo y aparece junto con la previsualización, cuando el fichero ya está hecho.
- **Segundo toque.** Escribe en el portapapeles la canónica con `?via=instagram-historia` y después entrega a la hoja el fichero, sin texto ni enlace. Entre el toque y `share()` **no hay ninguna espera**.
- **Nombre y cierre.** El nombre accesible es «Compartir en Historia de Instagram», tomado por `aria-labelledby` del botón que abre el diálogo. Se cierra con Esc, con un toque fuera y con el botón.
- **Registro.** `comparticion-de-imagen`, con destino `instagram-historia`, solo si la hoja confirma la entrega; en Chrome para Android la cuenta es una cota inferior *(v8.2)*.
UX-DR75: **Estados de la Historia.** Cada uno se dice en una frase bajo el botón, a 2 × `{spacing.unit}`, en `{typography.caption}` y `{colors.on-surface}`. La frase se queda hasta la siguiente acción o hasta cerrar el diálogo, y se anuncia por una región `role="status"` **dentro** del `<dialog>`, creada vacía con él.
- **Lista:** «La imagen está lista.».
- **Compartida:** «Enlace copiado: pégalo en el sticker Enlace.», en cuanto el portapapeles acepta el enlace, sin esperar a `share()` *(v8.2)*.
- **El navegador rechaza la entrega antes de abrir la hoja** *(v8.2)* (`NotAllowedError`, y también `DataError` o `TypeError`, AD-7): se descarga el mismo 9:16, el enlace queda copiado y la frase dice «La imagen se ha descargado. Enlace copiado: pégalo en el sticker Enlace.». Se registra como descarga, con destino `instagram-historia`. `InvalidStateError` se ignora: ni frase, ni descarga, ni registro *(v8.2)*.
- **Cancelada o fallida con la hoja abierta** (`AbortError`): ni descarga ni registro, y el diálogo no añade ninguna frase; «Enlace copiado…», si ya salió, se queda *(v8.2)*.
- **Falla el portapapeles:** el enlace se revela en el campo de copia manual, con el foco en él y seleccionado. Su etiqueta es la frase, «Selecciona el enlace y cópialo para el sticker Enlace.», y no se repite en la región. Si además se descargó la imagen, la región dice solo «La imagen se ha descargado.».
- **El generador no llega:** la frase del fallo va donde iba la previsualización, en `{typography.body-md}`, sin el botón primario y con «Copiar el texto» como secundario a 2 × `{spacing.unit}`. La línea de arriba se retira y el `aria-describedby` pasa a la frase del fallo. Se reintenta cerrando el diálogo y pulsando otra vez «Historia de Instagram».
- **La Cita no cabe en el 9:16** *(v8.2)*: «Esta cita no cabe en la imagen vertical. Puedes copiar su texto.», donde iba la previsualización, sin primario y con «Copiar el texto»; la línea de arriba se retira y el `aria-describedby` pasa a la frase; no se ofrece reintentar.
- **En iOS** la descarga va a Archivos y no a Fotos. La frase «La imagen se ha descargado en Archivos: guárdala en Fotos para publicarla en la historia. Enlace copiado: pégalo en el sticker Enlace.» —y, con el portapapeles fallido, «La imagen se ha descargado en Archivos: guárdala en Fotos para publicarla en la historia.»— queda escrita y se activa solo si la matriz de la 25.3 o la 25.7 reproduce en iOS la caída a la descarga; distinguir iOS es leer el sistema en el cliente, que NFR-11 permite porque no se transporta *(v8.2)*. La activa una constante con nombre de `umbrales.ts`, apagada, que Héctor enciende en un diff visible tras la matriz, como `SM12_CON_FACEBOOK` *(v8.2, Héctor, 2026-10-23)*.
UX-DR76: **Diálogo de Imagen** *(v8)*. Entrega solo la Imagen **cuadrada**, con Papel, Tinta y Siena, y Papel elegida al abrir. Se abre también sobre la Cita del Día, y la generación no bloquea la portada. La previsualización, a todo el ancho, es una imagen con nombre (`role="img"`): «Imagen cuadrada en Papel: la cita, su autor, su procedencia y sabiduriadebolsillo.net», que cambia con la plantilla elegida («en Tinta», «en Siena»), con el dominio de `dominio.ts` y sin rótulo visible propio *(v8.2)*. El fichero compartido y el descargado son el mismo, formato a formato. **Compartir**: si el navegador rechaza antes de abrir la hoja —`NotAllowedError`, `DataError` o `TypeError`—, la imagen se descarga sin aviso y se registra como descarga con destino `opaco`; `AbortError` —cerrar sin elegir o un fallo con la hoja ya abierta— ni descarga ni registra, e `InvalidStateError` se ignora. **Descargar** se registra sin destino. Una Cita que no cabe dice «Esta cita no cabe en la imagen. Puedes copiar su texto.», sin reintento *(v8.2)*. Junto con el del diálogo de la Historia, su botón primario es el único primario de la Página de Cita, y solo existe con su diálogo abierto.
UX-DR77: **Imagen de Cita 9:16** *(variante B de la decisión 2)*: 1080 × 1920 px, **solo en Papel**, con esquinas rectas y margen de 96 px. Sale del mismo generador que la cuadrada.
- **Composición.** La Cita va centrada entre las dos bandas que pinta Instagram, que se suponen de unos 250 px: ocupa desde unos 250 px del borde superior hasta unos 370 del inferior. El pie (la marca en mayúsculas y, debajo, «sabiduriadebolsillo.net») queda a unos 280 px del borde inferior.
- **Cuerpos.** Salen de la columna 9:16 de `tramos.ts`, que llega a `imagen.js` por `data-*`. La Cita va a 80, 64, 52 o 42 px según su tramo, sin bajar de 42; el Autor y el dominio, a 36; la procedencia, a 33, y la marca, a 30 [ASSUMPTION].
- **Sin recortar.** La procedencia se reparte en líneas como la Cita y nunca sale del lienzo. Lo que no cabe no se encoge.
- **Sin traductor.** Por encima de 300 caracteres no hay imagen.
UX-DR78: **El dominio en la imagen cuadrada** *(variante B de la decisión 3)*. La Imagen cuadrada (1080 × 1080, tres plantillas) lleva al pie, bajo la marca, «sabiduriadebolsillo.net» al cuerpo del Autor (24 px), con el peso y el color de la procedencia: legible y subordinado a la Cita. El Autor va a 24 px, la procedencia a 22 y la marca a 20. La prueba de los tramos se repite con el pie puesto, en los dos formatos: toda Cita de hasta 300 caracteres tiene que seguir cabiendo en su tramo, y la que no quepa no se encoge.
UX-DR79: **Tarjeta Social** *(v8)*. Nueva variante, la **Tarjeta Social de los Directorios** *(v8.2)*: la de listado, con el nombre del Directorio en la familia de la interfaz y, como bajada, cuántos Autores o cuántas Obras lista. Conserva la banda siena y no lleva prosa. La Tarjeta Social de Cita y la Tarjeta Social de Obra *(v8.2)* son lo único que acompaña al enlace compartido en Facebook, así que se comprueban en el validador de previsualización de Facebook antes de ofrecer ese destino (FR-19).
UX-DR80: **Directorios** *(v8)*, `/autores/` y `/obras/`, una sola página cada uno, dentro de la medida de prosa. De arriba abajo:
- **el `h1`**, «Autores» u «Obras», el mismo nombre que el enlace de la cabecera. Va en Inter al cuerpo de `{typography.headline-md}` (30 px), con peso 600 y en `{colors.on-surface}`, sin enlace, bajada ni recuento;
- el campo de filtro;
- las letras de salto;
- la lista por grupos.

  **Pestaña y meta.** Títulos de pestaña: `Autores, de la A a la Z | Sabiduría de Bolsillo` y `Obras, por autor | Sabiduría de Bolsillo`. La meta description es, literal, «{m} autores, de la A a la Z, con {n} citas publicadas.» en `/autores/` y «{k} obras de {m} autores, con {n} citas publicadas.» en `/obras/`, con el singular donde toque («1 autor», «1 obra», «1 cita publicada»): hechos del Corpus, con la palabra «citas» y sin prosa. Los títulos de pestaña son la plantilla literal, y ningún texto de los Directorios dice «frases» *(v8.2)*. **Reglas.** No reproducen ninguna Cita y no admiten ningún Modelo. Su lista va en `data-pagefind-ignore="all"`. Zona: `directorio`.
UX-DR81: **Campo de filtro del Directorio** *(variante 3A)*.
- **Dónde.** Es el Campo de búsqueda, sin botón, a 3 × `{spacing.unit}` (24 px) del `h1` y **antes** de las letras.
- **Etiqueta visible.** «Escribe parte del nombre.» en `/autores/` y «Escribe parte del título o del autor.» en `/obras/`.
- **Región del recuento.** **La región `role="status"` está en el HTML inicial, vacía**, a 2 × `{spacing.unit}` bajo el campo, en `{typography.caption}` y `{colors.on-surface-variant}` y a la vista.
- **Inserción.** La isla inserta solo el campo, sin hueco reservado. Sin desplazar, las letras y la lista bajan lo que mide; con la página ya desplazada, el anclaje de desplazamiento del navegador deja en su sitio lo que el visitante tiene delante.
- **Cómo casa.** Por **subcadena** de lo normalizado, sin distinguir acentos ni mayúsculas: «gonzalez» encuentra a Manuel González Prada, y «mar» deja 14 Autores. En `/autores/` casa con el nombre; en `/obras/`, con el título y con el nombre de su Autor.
- **Recuento.** «14 autores.» o «1 autor.», «13 obras.» o «1 obra.». Se escribe tras unos 700 ms sin teclear, y solo si cambia.
- **Mientras hay texto**, las letras de salto y «Volver a las letras» se apartan. Un grupo sin coincidencias desaparece entero, con su letra, y el que queda la conserva.
- **Al vaciar el campo**, la región se vacía y vuelven la lista entera y las letras.
- **Sin guion** no hay campo: la lista está entera y las letras funcionan.
UX-DR82: **Letras de salto** *(variantes 1A y 4B)*: una navegación llamada «Letras», con una rejilla que se ajusta al ancho. Las columnas miden 44 px como mínimo, con `{spacing.unit}` entre zonas: seis por fila a 360 px, y las 24 a la vista en unos 200 px, sin deslizar.
- **Cada letra** va en su zona de toque cuadrada de 44 px, en `{typography.body-md}` con peso 600 y en `{colors.primary}`, sin subrayado ni caja. Es un ancla a su grupo y funciona sin guion.
- **Qué letras.** Solo las iniciales que tienen alguna entrada, por la clave de orden: la inicial sin tilde, y la Ñ como letra propia. En `/obras/`, la letra es la del Autor que encabeza cada grupo.
- **Nombre accesible.** «Autores por la {letra}» en `/autores/` y «Obras de autores por la {letra}» en `/obras/`: la letra visible va dentro del nombre y el resto en `.solo-para-lectores`. La lista lleva `role="list"`.
UX-DR83: **Grupo de letra y «Volver a las letras».**
- **El grupo.** Empieza por su letra, como Rótulo de sección en `h2`: el primero a 4 × `{spacing.unit}` (32 px) de las letras, y los demás a 5 × (40 px) de lo que cierra el anterior. El rótulo lleva `tabindex="-1"` y `scroll-margin-top` de 2 × `{spacing.unit}`, y recibe el foco al llegar. Su lista va a 2 × `{spacing.unit}`, con filete superior.
- **«Volver a las letras».** Cierra cada grupo, a 2 × `{spacing.unit}` de su última fila: un enlace de texto en su propia línea, en `{typography.body-md}` y `{colors.primary}`, subrayado y con zona de toque de 44 px. Lleva a la navegación «Letras», que recibe el foco. Sin él, volver desde la M de `/autores/` son unos 6.000 px, y desde la U de `/obras/`, unos 41.000. Mientras el campo tiene texto, no está.
UX-DR84: **Fila de Autor** *(variante 2A)*, en `/autores/`: una Fila de bloque por cada Autor con Citas publicadas, hacia su Página de Autor, en el orden de la clave de orden (FR-15) y, a igualdad de clave, del slug.
- **El nombre**, tal como se escribe, va en Source Serif al cuerpo de `{typography.headline-sm}` (21 px), con peso 400 y en `{colors.on-surface}`. Ocupa toda la medida y parte palabras antes que desbordar.
- **Debajo, sus hechos:** «{años} · {n} citas» («1 cita» en singular; los años, solo si constan), en `{typography.caption}` y `{colors.on-surface-variant}`, con cifras tabulares. {n} son sus Citas publicadas (FR-55), las que lista su página, no el recuento de Citas documentadas de la Tarjeta Social de Autor, que puede ser menor *(v8.2)*. El punto medio va oculto y suena como una coma, y entre las dos líneas suena una pausa.
UX-DR85: **Directorio de Obras** *(variantes 5B, 6C y 7A)*. Bajo cada letra van los Autores, en el orden del Directorio de Autores, cada uno con su cabecera de grupo y sus Filas de Obra.
- **Cabecera de grupo.** El nombre del Autor como `h3`, en Source Serif al cuerpo y peso de `{typography.headline-sm}`, en `{colors.on-surface}` y subrayado siempre. Enlaza a su Página de Autor, y el enlace es **un bloque de 44 px de alto**. Su lista va a `{spacing.unit}` del bloque, y entre Autores hay 4 × `{spacing.unit}` (32 px).
- **Filas de Obra.** Son la Lista de Obras de la Página de Autor, tal cual y en su mismo orden: el título de la Ficha de Obra en Inter (`{typography.body-md}`, `{colors.on-surface}`), con el año si consta, y a la derecha «27 citas» o «1 cita», en `{typography.caption}`, `{colors.on-surface-variant}` y cifras tabulares.
- **La unidad, a la vista.** También en la Lista de Obras de la Página de Autor, lo que cambia lo construido en la 17.3.
- **Si no caben**, el título parte palabras y el recuento baja bajo él, sin encogerse.
- **Obras sin indexar.** La Obra que no se indexa va exactamente igual, sin marca. La congelación de SM-11 no recorta nada.
- **Con el filtro puesto**, la cabecera de un Autor se queda mientras alguna de sus Obras case, aunque su nombre no case.
UX-DR86: **Filtro del Directorio a cero** *(variante 8B)*. No quedan letras ni lista. La región del recuento dice «Ningún autor tiene «{lo tecleado}» en el nombre.» en `/autores/`, o «Ninguna obra tiene «{lo tecleado}» en el título ni en su autor.» en `/obras/`. Debajo, a `{spacing.unit}`, el enlace «Buscar «{lo tecleado}» en las citas», hacia `/buscar/?q=`, que compone la isla: en `{typography.body-md}` y `{colors.primary}`, subrayado y con zona de toque de 44 px (zona `directorio`). Nunca se queda en «0 autores.» sin más.
UX-DR87: **Selectores de filtro** *(variante 1A)*, en `/buscar/`.
- **Disposición.** Autor, Obra y Tema, en ese orden, dentro de un `fieldset` sin borde ni relleno, con la leyenda «Filtrar las citas» solo para lectores de pantalla. Van a 3 × `{spacing.unit}` (24 px) bajo el campo y a 2 × (16 px) entre sí, **apilados a todo el ancho de la medida de prosa, en todas las anchuras**, cada uno con su etiqueta visible encima.
- **El control nativo.** Filete de 1 px en `{colors.outline}` (3,66:1), radio `{rounded.DEFAULT}`, fondo `{colors.surface}` y 44 px de alto. El valor va en `{typography.body-lg}` (17 px), para que Safari en iOS no amplíe la página. Se deja la flecha del control, sin icono propio.
- **Opciones.** Cada selector empieza por una que no filtra: «Todos los autores», «Todas sus obras», «Todos los temas». Los Autores van por su nombre tal como se lee, y los Temas por su nombre, con el artículo. Los valores salen solo del Corpus publicado.
- **El de Obra no existe hasta elegir un Autor**: no está oculto ni deshabilitado. Aparece entre Autor y Tema, completo y cuando han llegado sus recuentos, sin mover el foco. Ofrece las Obras de ese Autor en el orden de su Lista de Obras, también las que no se indexan, con su recuento: «Maestros ambulantes (23 citas)», el total de la Obra. Cambiar o quitar el Autor quita la Obra elegida.
- **La dirección.** El estado vive en ella (`?q=&autor=&obra=&tema=`), con identificadores. Cada cambio rehace la búsqueda tras unos 400 ms sin otro cambio, y solo esa búsqueda entra en el historial.
- Basta un filtro para buscar, sin escribir nada.
- **Medida.** A 360, los tres ocupan unos 252 px; hay que volver a medirlo con el valor a 17 px.
UX-DR88: **Quitar los filtros** *(variante 2B)*: el botón secundario, a su ancho y a 2 × `{spacing.unit}` bajo los selectores. Solo existe con algún filtro puesto. Quita todos los filtros y deja el texto; al pulsarlo, el botón desaparece y el foco pasa al campo.
UX-DR89: **Recuento de resultados** *(variante 3C)*: encima de la lista, a 3 × `{spacing.unit}` de lo de arriba, en `{typography.caption}` y `{colors.on-surface-variant}`, dentro de la región `role="status"`. Dice cuántos resultados hay, no cuántos se ven.
- **Con filtros**, nombra lo filtrado, con el Tema en minúscula: «222 citas de José Martí.», «23 citas de José Martí en Maestros ambulantes.», «8 citas de José Martí sobre la prudencia.», «6 citas sobre el saber con «escuela».». En singular: «Una cita de José Martí en Maestros ambulantes.».
- **Sin filtros:** «28 resultados.» o «Un resultado.».
- **Anuncio.** Al teclear, se escribe tras unos 700 ms sin teclear y solo si la frase cambió; tras un cambio de selector, tras la pausa de los selectores. «Mostrar 30 más» no lo cambia ni lo vuelve a anunciar.
UX-DR90: **Mostrar 30 más** *(variante 5A)*: los resultados llegan en tandas de 30, y la siguiente la pide este botón secundario, a su ancho y a 3 × `{spacing.unit}` bajo el último resultado. Es un `button`, no un enlace: ningún desplazamiento lo dispara y no cambia la dirección.
- **Al pulsarlo, el foco va al primer resultado nuevo.** Mientras llegan, otra pulsación no hace nada.
- **Si no llegan**, «No se han podido cargar más resultados.» va bajo el botón, a 2 × `{spacing.unit}`, en `{typography.caption}` y `{colors.on-surface}`, por una región `role=status` propia que se inserta vacía con el botón; el Recuento no se toca y sigue a la vista, y el foco se queda en el botón. Pulsarlo otra vez la vuelve a pedir; si el reintento llega, esa región se vacía y el foco va al primer resultado nuevo *(v8.2)*.
- **Última tanda:** «Mostrar las 12 que faltan», o «Mostrar la que falta» si es una. Con todos los resultados a la vista, el botón no existe.
UX-DR91: **Resultado de búsqueda** *(v8, variantes 6A y 7C)*.
- **La fila.** Toda la fila es el enlace, con filete inferior, 44 px de alto como mínimo y 2 × `{spacing.unit}` de relleno vertical.
- **El rótulo de tipo** va en mayúsculas, con el espaciado de `{typography.author}`, al cuerpo de `{typography.caption}` y en `{colors.on-surface-variant}`.
- **El título**, a `{spacing.unit}`, va en Source Serif al cuerpo de `{typography.headline-sm}` con peso 400, salvo los de Obra, **Directorio** y Portada *(v8.2)*, que van en Inter.
- **El de Cita lleva debajo el nombre de su Autor**, en `{typography.author}` y `{colors.on-surface-variant}`, como el de Obra. Se lee «Cita: «{texto}», {Autor}»: solo la pausa, sin «de»; el de Obra, «Obra: {título}, {Autor}», y eso cambia lo construido, que le pone «de» *(v8.2)*.
- **Tipo nuevo «Directorio».** Los dos Directorios salen por su título, nunca por lo que listan.
- **Con un filtro puesto, solo hay resultados de Cita.** Zona: `resultado`.
- **El de la portada** se rotula «Portada» y se titula con el nombre del sitio —«Portada: Sabiduría de Bolsillo»—, con el título en Inter, como el de Directorio *(v8.2)*.
UX-DR92: **`/buscar/` sin JavaScript, e índice que no carga** *(variante 7C)*.
- **Sin guion** no hay campo ni selectores. El HTML inicial dice «Buscar y filtrar necesitan JavaScript, y este navegador no lo está ejecutando.» y «Sin él, todos los autores y todas las obras se leen en sus directorios. Si llegaste desde la página de un autor, de una obra o de un tema, vuelve atrás: allí están sus citas.», en `{typography.body-lg}`, a 3 × y 2 × `{spacing.unit}`. Debajo van los dos Directorios, como Resultados de tipo «Directorio». Con guion, nada de esto se ve.
- **Con guion, antes de que arranque la búsqueda** *(v8.2)*, el HTML inicial lleva, fuera de `<noscript>` y oculto sin guion, «Si la búsqueda no aparece, todos los autores y todas las obras se leen en sus directorios. Si llegaste desde la página de un autor, de una obra o de un tema, vuelve atrás: allí están sus citas.» y, debajo, los dos Directorios como resultados de tipo «Directorio». La isla lo retira al arrancar, sin dejar hueco. Se pinta en cada carga hasta que arranca el paquete, también cuando sí va a arrancar, y por eso es condicional; el salto de maquetación se acepta. «No se ha podido cargar la búsqueda.» se queda para cuando el índice falla al buscar.
- **Si el índice no carga** (cambia lo construido), bajo el campo y en lugar de los resultados va «No se ha podido cargar la búsqueda.», seguida de la segunda frase y de los dos Directorios, y se anuncia por la región del Recuento. Escribir o filtrar otra vez reintenta la carga.
UX-DR93: **Estados de la búsqueda** *(v8)*.
- **Sin resultados.** La frase se anuncia por la región `role="status"`, y la salida son los Temas, las Colecciones y los ocho Autores destacados (UX-DR62), en chips, cada grupo bajo su `h2` *(v8.2)*.
  - Con texto y sin filtros: «No encontramos esa frase. Prueba con menos palabras.».
  - Con filtros: «No encontramos «escuela» entre las citas de José Martí en Maestros ambulantes.», con «Quitar los filtros» justo encima.
  - Con filtros y sin texto: «No hay citas de {Autor} sobre {tema}.» o «No hay citas de {Autor} en {Obra} sobre {tema}.».
- **Un filtro de la dirección que no se puede usar** *(v8.2)* —uno que ya no existe, o una `obra` de otro Autor que el de `autor`— se ignora y se dice, en la región del Recuento y delante del recuento: «Uno de los filtros de esta dirección no se puede usar, y la búsqueda va sin él.»; con dos o tres, «Dos de los filtros de esta dirección no se pueden usar, y la búsqueda va sin ellos.» o «Tres de los filtros…». Si no queda nada con que buscar, «El filtro de esta dirección ya no existe.» o «Los filtros de esta dirección ya no existen.», sin recuento ni salida de la búsqueda sin resultados. Nunca se cambia el Autor. La dirección se reemplaza sin esos filtros.
- **Llegada desde «Buscar en…».** Los selectores se ven elegidos (desde la Obra, Autor y Obra), «Quitar los filtros» está a la vista, lo escrito está en el campo y el recuento nombra lo filtrado entero. Una dirección con `obra` y sin `autor` toma el Autor de la Obra.
- **Carga del índice.** Se pide al enfocar el campo y, con texto o filtros en la dirección, al cargar la página. Los filtros de Pagefind (unos 41 KB) se piden solo al elegir un Autor, filtrar o buscar, o si la dirección trae estado.
UX-DR94: **«Buscar en esta obra / en {Autor} / en este tema»**, solo en la página 1. Es un formulario GET a `/buscar/` con el Campo de búsqueda y el botón secundario «Buscar». La etiqueta visible es el nombre del componente, en minúscula: «Buscar en esta obra», «Buscar en {Autor}» o «Buscar en este tema». El filtro va en campos ocultos: **dos en la Obra, `autor` y `obra`**, y uno en el Autor y en el Tema. No añade guion ni crea ninguna página indexable. Enviarlo vacío da todas las Citas de esa página, y «atrás» devuelve a ella. No lleva texto de ejemplo: un ejemplo de todo el Corpus dentro de «Buscar en José Martí» daría cero resultados *(v8.2)*. Va justo encima del listado que filtra:
- **en la Obra**, a 4 × `{spacing.unit}` (32 px) del salto, con el listado 4 × más abajo;
- **en el Autor**, bajo el rótulo «Citas documentadas», a 2 × `{spacing.unit}` y con el listado 3 × más abajo, sin tocar la Ficha de Autor;
- **en el Tema**, a 4 × `{spacing.unit}` bajo el `h1` y con el listado 4 × más abajo. Es la excepción declarada a que la Página de Tema empiece por su contenido. La primera Cita sigue en la primera pantalla de 360 × 640, y hay que volver a medirlo con el botón.
UX-DR95: **Página de Obra, página 1** *(v8, variantes 2B y 3A)*.
- **Orden:** la Cabecera de Obra con su salto, «Buscar en esta obra», el Listado de Obra con su Paginación, «Compartir en», los Temas, «Dónde leer esta obra» y la Nota. Las páginas 2+ no cambian: Cabecera de Obra, sin salto, y el listado.
- **El orden del libro.** El listado va por la posición de cada Cita en su documento cotejado, documento a documento, y las Citas sin documento van detrás, por slug. Vale también en las páginas 2+. Ninguna línea ni subrótulo lo dice, y las Tarjetas van sin Autor ni título de Obra.
- **Ritmo del pie:** 5 × `{spacing.unit}` (40 px) desde la paginación, o desde la última tarjeta, hasta «Compartir en»; 5 × de ahí a «Temas»; 4 × hasta «Dónde leer esta obra»; 2 × del `h2` al primer rótulo, y 1 × del rótulo a sus líneas. La Nota, 4 × por encima de su filete y 3 × por debajo.
- La primera Cita sigue en la primera pantalla.
UX-DR96: **Salto «Dónde leer esta obra ↓»** *(variante 1A)*, solo en la página 1. Es un enlace de texto en su propia línea, a 3 × `{spacing.unit}` (24 px) de «de {Autor} · {año}», para que su zona de toque de 44 px quede a 8 px de la del nombre. Va en `{typography.body-md}` y `{colors.primary}`, subrayado siempre, hacia `#donde-leer-esta-obra`, en la misma pestaña, y su flecha lleva `aria-hidden`. Su destino, el `h2` de «Dónde leer esta obra», lleva `tabindex="-1"` y `scroll-margin-top` de 2 × `{spacing.unit}`, y recibe el foco con el anillo global. El bloque no se mueve de su sitio, y el salto y su destino, el `h2` de «Dónde leer esta obra», se construyen idénticos con la afiliación encendida o apagada (FR-35); la página no, porque encendida lleva «Ediciones en venta» *(v8.2)*.
UX-DR97: **Compartir en la Página de Obra** *(variante 2B)*: el bloque «Compartir en» sin la fila de la Historia, solo con el 2 × 2 de WhatsApp, Facebook, Threads y «Más opciones…». Va tras el listado y su paginación y antes de «Temas», solo en la página 1, se indexe la Obra o no y también con la familia congelada. El texto propuesto es «{título}, de {Autor}», con el título de su Ficha de Obra y sin traductor; en Facebook se publica su Tarjeta Social de Obra. **Correo** lleva el asunto «Una obra» —«Una cita» desde la Página de Cita y desde la Cita del Día, como está construido— y el cuerpo «{título}, de {Autor}», una línea en blanco y el enlace con `?via=correo`; el título va en el cuerpo y no en el asunto *(v8.2)*. Es la primera isla de la Página de Obra, y su guion cuenta en el tope que se mide donde se admite la afiliación.
UX-DR98: **Material para publicar con el 9:16**, en el Kit Diario y en el Lote (`MaterialParaPublicar.astro`), por jornada y con el mismo marcado en los dos.
- **Marco.** Un filete superior `{colors.outline-variant}`, 2 × `{spacing.unit}` de aire y el rótulo («La Cita del Día», «Alternativa con Imagen»): `h2` en el Kit y `h3` en el Lote, en Inter al cuerpo de `{typography.body-md}`, en negrita, mayúsculas y `{colors.on-surface-variant}`. Entre materiales, 4 × `{spacing.unit}`.
- **La Cita**, entre comillas angulares, en la serif al cuerpo de `{typography.body-lg}` y sin tramo.
- **Las dos imágenes, en Papel**, a todo el ancho de la columna, con esquinas rectas y filete. Primero la cuadrada, con el botón primario «Descargar la imagen cuadrada» a `{spacing.unit}` debajo. Después, a 2 × `{spacing.unit}`, el 9:16, con «Descargar la imagen vertical».
- **Debajo:** «Copiar la cita», como botón secundario; «Ver la Página de Cita», en `{typography.body-md}`; y un enlace por red, en el orden de `redes.ts`, cada uno en una caja con filete, radio `{rounded.DEFAULT}`, 44 px de alto y 2 × `{spacing.unit}` de relleno lateral, separadas por `{spacing.unit}`.
- **La regla del siena no rige aquí.** Los enlaces por red y el aviso de fijación muda siguen en siena, como están construidos.
UX-DR99: **Mensajes de estado** (WCAG 4.1.3).
- **Qué se anuncia:** «Copiado.», el recuento de `/buscar/` y su frase sin resultados, la imagen lista, el fallo del generador, cada estado de la Historia, y el recuento de cada Directorio con su frase a cero.
- **La región.** Una región `role="status"` que está en el marcado desde la carga, vacía y sin `hidden` (`.solo-para-lectores`). La de un control que inserta el guion existe antes del primer mensaje: la del Directorio está en el HTML inicial, la de la Historia se crea vacía con el diálogo, y la del fallo de «Mostrar 30 más» se inserta vacía con el botón, aparte de la del Recuento *(v8.2)*. Lo que se anuncia con un `<dialog>` abierto va en una región **dentro** de él.
- **Dos ritmos, con un solo dueño en `src/lib/`.**
  - Lo que el visitante repite (Copiar, o «Compartir en la historia» otra vez) vacía la región y escribe el mensaje en el siguiente fotograma (`requestAnimationFrame`). Si con VoiceOver y NVDA no basta, se espera entre 100 y 150 ms.
  - Lo que cambia al teclear (el recuento de `/buscar/` y el de cada Directorio) se anuncia tras unos 700 ms sin teclear, aparte del pintado de la lista, y solo si la frase cambió.
- **«Copiado.»** suena solo por la región: el botón conserva su nombre accesible.
UX-DR100: **Adónde va el foco** *(v8)*.
- Tras «Mostrar 30 más», al primer resultado nuevo; si no llegan, se queda en el botón y el fallo lo dice la región del botón; si el reintento llega, al primer resultado nuevo *(v8.2)*.
- Tras «Quitar los filtros», al campo.
- Que aparezca el selector de Obra no mueve el foco (WCAG 3.2.2).
- Si falla el portapapeles en la Historia, al campo del enlace, seleccionado.
- **El destino de un ancla** (el `h2` de un grupo de letra, la navegación «Letras», el `h2` de «Dónde leer esta obra») lleva `tabindex="-1"` y `scroll-margin-top`, y recibe el foco.
- El anillo global es de 2 px en `{colors.primary}`, con 2 px de separación, y nunca se suprime.
UX-DR101: **Semántica y orden** *(v8)*.
- **Un solo `h1` por página.** En la portada es la marca, en la región de la cabecera; en los Directorios, «Autores» y «Obras».
- **Los `h2`.** «De la obra», «Compartir en», «De la misma obra», «Más de {Autor}» y «Temas»; en la portada, «La cita de hoy», «Obras», «Temas», «Colecciones» y «Autores». En la portada, «De la obra» y «Compartir en» son `h3`, dentro de «La cita de hoy».
- **Directorios.** En `/autores/`, cada letra es `h2`. En `/obras/`, la letra es `h2` y cada Autor, `h3`.
- **Listas.** Toda lista sin viñetas (la rejilla «Compartir en», las letras, las filas, los chips y los resultados) lleva `role="list"` explícito.
- **Puntos medios y pausas.** Los puntos medios de la cabecera y de las líneas de hechos llevan `aria-hidden`, con una coma en su lugar. En una Fila de bloque de dos líneas suena entre ellas un «, » solo para lectores. La misma pausa suena en la Tarjeta de Cita *(v8.2)*.
- **«Saltar al contenido.»** es el primer enlace de toda página y lleva a `main`; en la portada, a la línea de cifras.
- **Orden de tabulación.** En `/buscar/`: el campo, los selectores de Autor, Obra y Tema, «Quitar los filtros», los resultados y «Mostrar 30 más». En un Directorio: el campo, las letras y la lista.
UX-DR102: **Zonas de toque** *(v8)*. Todas de 44 px, con 8 px de separación, también en vertical. Los 44 px son decisión de producto: WCAG 2.2 AA solo pide 24 px (2.5.8).
- **Cabecera:** la zona de cada enlace queda a 8 px de la de la marca, a 320 como a 360 px.
- **Letras de salto:** cada una es un cuadrado de 44 px, a 8 px de la siguiente.
- **Salto «Dónde leer esta obra ↓»:** su zona no toca la de «de {Autor}».
- **Cabecera de grupo de `/obras/`:** el Autor es un bloque de 44 px, con su primera Fila de Obra a 8 px.
- **Enlaces de texto en su línea:** «Volver a las letras», «Ver esta cita», los cierres de la portada y «Buscar «x» en las citas», 44 px.
- **Filas de bloque apiladas** a todo el ancho (Tarjeta de Obra, Directorios, portada): se tocan, sin los 8 px, porque el filete las separa.
UX-DR103: **Reflujo a 320 px** (WCAG 1.4.4, 1.4.10 y 1.4.12; NFR-8). Ninguna superficie pide desplazamiento horizontal a 320 px. Se comprueba con `scrollWidth` en tres condiciones: con el texto por omisión, con el texto al 200 % y con el espaciado de 1.4.12.
- Los enlaces de la cabecera pasan a otra fila.
- La rejilla «Compartir en» pasa a una columna.
- Todo título de Obra que comparte fila con algo (Tarjeta de Obra, Obras de la portada, Directorio de Obras, Lista de Obras) parte palabras, y la fila crece con él.
- Ningún control ni título lleva `white-space: nowrap`.

  El suelo de accesibilidad es WCAG 2.2 AA (NFR-9, PRD v8.1): el barrido axe pide `wcag22aa` desde la primera épica que se fusione.
UX-DR104: **Tipografía** *(v8)*.
- **Lo tecleado va en Inter, al cuerpo de `{typography.body-lg}`**, en todo campo (`/buscar/`, la portada, «Buscar en…», el filtro de los Directorios) y en el valor de los selectores.
- **Source Serif**, solo en Cita, Autor, Tema y Colección. Por eso la llevan los nombres del Directorio de Autores, las cabeceras de grupo de `/obras/` y los Autores destacados de la portada, al cuerpo de `{typography.headline-sm}` con peso 400. Los de la búsqueda sin resultados van en el Chip, en Source Serif al cuerpo de `{typography.body-md}`, como el Chip de Tema *(v8.2)*.
- **El título de una Obra va en Inter** en todo sitio nuevo: la Tarjeta de Obra y las Obras de la portada, al cuerpo de `{typography.body-lg}` con peso 600; la Fila de Obra; y el selector de Obra. También el título de los resultados de tipo Directorio y Portada *(v8.2)*, al cuerpo de `{typography.headline-sm}` con peso 400.
- **Encabezado del Directorio:** Inter al cuerpo de `{typography.headline-md}`, con peso 600. **Letras de salto:** al cuerpo de `{typography.body-md}`, con peso 600.
- **Ningún token nuevo.** Cada combinación toma el cuerpo de la escala (`--cuerpo-lg`, `--titular-sm`, `--titular-md`, `--cuerpo-md`) y escribe su familia y su peso.
UX-DR105: **Siena y subrayado** *(v8, enmienda UX-DR52)*. Lo decide la función del elemento, nunca cuánto siena haya en la pantalla.
- **En siena, lo que actúa:** los botones (también «Mostrar 30 más», «Quitar los filtros» y «Buscar»), «Buscar» de la cabecera, la paginación, las letras de salto, el salto «Dónde leer esta obra ↓», «Volver a las letras», «Buscar «x» en las citas» y los enlaces de salida.
- **En tinta, toda la navegación nueva:** «Autores» y «Obras» de la cabecera, las filas de la Tarjeta de Obra, «Siguiente», «Ver la obra», los cierres «… ›», las filas y las cabeceras de grupo de los Directorios, y «Ver esta cita» de la portada; el del 404 sigue en siena, como está construido, y es la única navegación que informa que va en siena en una superficie pública *(v8.2)*.
- **Subrayados siempre:** los tres enlaces de la cabecera, el salto, «Buscar «x» en las citas», «Volver a las letras», «Ver esta cita», «Las {n} obras ›», «Los {m} autores, de la A a la Z ›» y el Autor de la cabecera de grupo de `/obras/`.
- **Sin subrayado, los enlaces de bloque:** la marca, las filas de la Tarjeta de Obra, los cierres que son la última fila de su lista, las filas de los Directorios, las letras, las Obras y los Autores de la portada, y los botones de «Compartir en».
- La regla no rige en el Kit ni en el Lote.
UX-DR106: **Pestaña nueva** *(v8)*, solo para donar, compartir y comprar. WhatsApp, Facebook, Threads, Telegram y X la abren, y lo avisan con `AVISO_DE_PESTAÑA_NUEVA` (`src/lib/accesibilidad.ts`), oculto dentro de su nombre accesible. **Correo** comparte desde la misma pestaña, con `mailto:` y sin el aviso. «Historia de Instagram» y «Más opciones…» con hoja no abren pestaña: entregan a la Hoja del Sistema. La cabecera, los Directorios, la Tarjeta de Obra y su «Siguiente», «Buscar en…», el salto y «Volver a las letras» van en la misma pestaña.
UX-DR107: **Voz y microcopia** *(v8)*.
- **Entidades en minúscula** en el texto que lee el visitante, y el Tema dentro de una frase, tras «sobre»: «Buscar en este tema», «Ver la obra ›», «Siguiente cita sobre la vida ›».
- **Una cifra del Corpus no es un contador**, y no hay ningún contador de visitas, lecturas ni comparticiones.
- **Ninguna frase excusa una acción que no existe.**
- **«Citas» y «frases».** Los Directorios no dicen «frases» en ningún texto. «Citas» va en el cuerpo y en la meta description, y el título de pestaña es la plantilla literal de UX-DR80 (decisión de Héctor del 2026-10-19) *(v8.2)*. «Frases» sigue solo en el título de pestaña y la meta description de la Página de Obra.
- **Microcopia nueva, literal:** «La cita de hoy», «Ver esta cita», «Obras», «Autores», «Las {n} obras ›», «Los {m} autores, de la A a la Z ›», «De la obra», «Siguiente cita de esta obra ›», «Ver la obra y dónde leerla ›», «Ver la obra ›», «De la misma obra», «Las {n} citas de {título} ›», «Las {n} citas de {Autor} ›», «Compartir en», «Historia de Instagram», «Más opciones…», «Compartir en la historia», «Dónde leer esta obra ↓», «Filtrar las citas», «Quitar los filtros», «Mostrar 30 más», «Volver a las letras», «Buscar», «Descargar la imagen cuadrada» y «Descargar la imagen vertical». Se suman las frases de estado de UX-DR75, UX-DR81, UX-DR86, UX-DR89, UX-DR90, UX-DR92 y UX-DR93.
- **El glifo de avance es «›»** (U+203A) *(v8.3, decisión de Héctor del 2026-10-27)*: el de las Filas de bloque y los cierres «… ›» —«Siguiente cita de esta obra ›», «Ver la obra ›», «Las {n} obras ›»—, no la flecha U+2192, que no está en el subconjunto `latin` de Google Fonts de Inter ni de Source Serif 4 y pararía la puerta de cobertura tipográfica en todas las Páginas de Cita; «›» cae en U+2000–206F, dentro de ese subconjunto. Es un glifo tipográfico de la familia del rótulo, con `aria-hidden`, y no un icono. «↓» no cambia.
UX-DR108: **Estados nuevos de la Página de Cita y de la portada.**
- **Cita sin Obra:** sin Tarjeta de Obra, sin «Siguiente» y sin «De la misma obra». Las acciones suben a la primera pantalla, y «Más de {Autor}» elige entre todas las demás Citas del Autor. Eran 4 Citas el 2026-10-18.
- **Obra de una sola Cita:** la tarjeta dice «1 cita», no hay «De la misma obra», y el «Siguiente» es «Siguiente cita sobre {tema} ›» o no existe.
- **Obra sin ninguna Cita cotejada:** «Ver la obra ›». Eran 7 Obras.
- **«De la misma obra» o «Más de {Autor}» sin Citas que ofrecer:** el bloque no existe.
- **Cita sin Tema publicado:** no hay bloque de Temas.
- **Año discrepante o ausente:** se omite, sin hueco y sin «Sin año documentado».
- **Cita de más de 300 caracteres:** ni Imagen ni Historia, también en la portada. Copiar y los destinos de enlace siguen.
- **Copiado fallido sobre la Cita del Día:** como en la Página de Cita.
- **El 404:** su Cita del Día va sin Tarjeta de Obra ni acciones, y su campo lleva el botón «Buscar»; su «Ver esta cita» sigue en siena, y su campo conserva «Por ejemplo: no hay camino» *(v8.2)*.
- **Portada sin ninguna Cita apta** *(v8.2)*: en lugar de «La cita de hoy», tras el campo, una sola frase, «Citas en español, cada una en su página, con su autor y, cuando consta, la obra de la que procede.», que `EXPERIENCE.md` da por igual a `DESCRIPCION_DEL_SITIO`, aunque la constante dice hoy otra cosa; si la frase se escribe aparte o la constante cambia con ella está abierto (`bmad-ux`, 28.2: véase «Lo que las espinas dejan sin cerrar») *(v8.2)*; cambia lo construido.
- **Cita de hasta 300 caracteres que con el pie no cabe** *(v8.2)*: el diálogo lo dice y ofrece copiar el texto, sin reintento (UX-DR75, UX-DR76).
UX-DR109: **Estados nuevos de Obra, Autor, Tema y Directorios.**
- **Obra con `noindex`:** queda fuera del sitemap, de los resultados de `/buscar/` y de las Obras de la portada. Sigue siendo valor del filtro de Obra, va igual que las demás en el Directorio de Obras, y su página 1 lleva el salto, «Compartir en» y «Buscar en esta obra».
- **Páginas 2+ de una Obra:** sin salto, sin «Compartir en» y sin «Buscar en esta obra», en el orden del libro.
- **Páginas 2+ de Autor y de Tema:** sin «Buscar en…».
- **Autor u Obra sin Citas publicadas, y Tema por debajo de 15 Citas:** no figuran en los Directorios ni son valor de filtro. Ese Tema tampoco cuenta como primer Tema publicado para «Siguiente».
- **Portada sin Obras indexables:** el bloque de Obras no existe. Con la familia congelada, las seis salen del conjunto congelado.
- **Directorio sin guion:** no hay campo, la lista está entera y las letras funcionan.
UX-DR110: **Modelos de Ingreso** *(v8)*.
- **Lo que añade la v8 no aloja ningún Modelo.** La Tarjeta de Obra, el salto, las Obras de la portada, el Directorio de Obras y lo que se comparte de la Página de Obra se construyen idénticos con la afiliación encendida o apagada.
- **Los Directorios y la Página de Autor** no admiten ningún Modelo, y se publican igual en los dos estados.
- **En la portada**, la Invitación de donación va al final, tras los Autores destacados, y nada se intercala entre la Cita del Día, su Tarjeta de Obra y sus acciones.
- **`/buscar/`** admite la publicidad acotada también con filtros.
UX-DR111: **Zonas de salida interna** (FR-56), según la tabla de `EXPERIENCE.md`. Cada enlace registra la zona más concreta que lo contiene, declarada en el contenedor que pinta el build:

| Zona | Enlaces |
|---|---|
| `cabecera` | La marca y los tres enlaces |
| `atribucion` | El Autor y el título de la Obra en la Atribución, y «de {Autor}» en la Cabecera de Obra |
| `tarjeta-de-obra` | «Ver la obra…» |
| `siguiente` | «Siguiente…», aunque vaya dentro de la Tarjeta de Obra |
| `misma-obra` | Las Tarjetas de «De la misma obra» y su cierre |
| `rutas-de-salida` | Las Tarjetas de «Más de {Autor}» y su cierre |
| `chip-de-tema` | El Chip de Tema de la Página de Cita, de la Página de Obra y de la portada |
| `colecciones` | El Chip de Colección de la portada |
| `listado` | La Tarjeta de Cita de los listados de Autor, Tema, Colección y Obra |
| `paginacion` | La Paginación |
| `lista-de-obras` | Las entradas de la Lista de Obras de la Página de Autor |
| `resultado` | Todo Resultado de búsqueda, también el de Directorio, salvo los Directorios del aviso *(v8.2)* |
| `directorio` | Las filas, las cabeceras de grupo y «Buscar «x» en las citas» |
| `cita-del-dia` | «Ver esta cita» |
| `obras-de-portada` | Las seis Obras de la portada y su cierre |
| `autores-de-portada` | Los ocho Autores destacados y su cierre |

  Están exentas, por escrito *(v8.2)*: las anclas de la misma página; «Buscar en…», el campo de la portada y el del 404, porque enviar un formulario no es salida; las salidas de la búsqueda sin resultados —Temas, Colecciones y Autores destacados—; y los Directorios del aviso de `/buscar/`, el del índice que no carga y el que se pinta hasta que arranca la búsqueda, que en la zona `resultado` darían a SM-13 salidas sin denominador. Se revisa en la pasada de métricas. Un enlace que no figura en la tabla no registra nada.
UX-DR112: **Lo construido que la v8 cambia.**
- La cabecera pasa de dos enlaces a cuatro, y la marca es el `h1` de la portada.
- «Compartir la cita» se retira, y los destinos quedan a la vista también donde hay Hoja del Sistema, con el prefijo «Compartir en » en `.solo-para-lectores` (lo que corrigió la 22.10).
- Las Citas hermanas de las Rutas de salida pasan a Tarjeta de Cita, y la apertura del bloque en móvil cambia 4 px, a 64.
- «Más de {Autor}» deja fuera las Citas de la misma Obra.
- El Listado de Obra deja el orden por slug por el orden del libro.
- El filete del campo de copia manual pasa de `{colors.outline-variant}` (1,3:1) a `{colors.outline}` (3,51:1).
- El campo del 404 gana el botón «Buscar», y lo tecleado en `/buscar/` y en el 404 pasa a Inter.
- «Ver esta cita» pasa de siena a tinta en la portada; el del 404 no cambia *(v8.2)*.
- La Lista de Obras de la Página de Autor enseña la unidad.
- En `/buscar/`, el tope de 30 resultados pasa a «Mostrar 30 más», el índice que no carga ofrece los Directorios, y los Autores destacados dejan los ocho primeros del alfabeto por la regla de FR-8.
- La Imagen cuadrada gana el dominio.
- La lista entera de Autores sale de la portada.
- El resultado de Obra deja el «de» en su nombre accesible *(v8.2)*.
- El fallo de «Mostrar 30 más» sale bajo el botón *(v8.2)*.
- La portada sin ninguna apta cambia su párrafo de presentación por la frase de UX-DR108 *(v8.2)*.
- El campo de `/buscar/` conserva «Por ejemplo: no hay camino», que pusieron las Historias 3.1 y 4.3 *(v8.2)*.

**Qué requisitos anteriores enmiendan**, sin renumerarlos:

| Anterior | Lo enmienda |
|---|---|
| UX-DR10 | UX-DR58 |
| UX-DR11 | UX-DR70 |
| UX-DR14: no hay iconos en el producto, tampoco el de cada red | UX-DR71 |
| UX-DR16 | UX-DR76 |
| UX-DR17 | UX-DR67–69 |
| UX-DR19 | UX-DR77 |
| UX-DR20 | UX-DR93, UX-DR108 y UX-DR109 |
| UX-DR21 | UX-DR107 |
| UX-DR22 | UX-DR58, UX-DR74 y UX-DR102 |
| UX-DR24 y UX-DR25 | UX-DR101 |
| UX-DR27 | UX-DR103 |
| UX-DR28 | UX-DR55 y UX-DR87 |
| UX-DR29 | UX-DR54–55 |
| UX-DR34: el chip lleva su criterio, y la Página de Cita sigue sin enlazar a su Colección | UX-DR61 |
| UX-DR36 | UX-DR110 |
| UX-DR38 | UX-DR96 |
| UX-DR41 y UX-DR42 | UX-DR95 |
| UX-DR46 | UX-DR85 |
| UX-DR47 | UX-DR91 |
| UX-DR50 (b) | UX-DR109 |
| UX-DR52 | UX-DR105 |
| UX-DR53 | UX-DR112 |

**Qué hay que volver a medir sobre lo construido:**
- la altura de la cabecera (unos 113 px) y dónde empieza la Cita (unos 153 px);
- los 252 px de los selectores, con el valor a 17 px;
- la primera Cita del Tema y de la Obra, con el botón «Buscar» puesto;
- las bandas de unos 250 px de la historia, en la matriz de dispositivos;
- si un fotograma basta para el primer ritmo de anuncio.

**La UX v8.2 está alineada con el PRD v8.2 y la espina v8.2** *(v8.2)*: retiró los seis [NOTE FOR PM] que el PRD ya contestó y pasó a WCAG 2.2 AA. `AGENTS.md` describe todavía un solo ritmo de anuncio, y la espina describe dos; lo cierra `bmad-project-context`.

**Lo que las espinas dejan sin cerrar:** una pregunta *(v8.2)*. Si la frase de la portada sin ninguna Cita apta (UX-DR108) se escribe aparte o si `DESCRIPCION_DEL_SITIO` cambia con ella, y con ella la `description` de la portada, el `WebSite`, la bajada de su Tarjeta Social y la descripción de `rss.xml`: `EXPERIENCE.md` las da por iguales, y la constante dice hoy «Citas célebres en español, cada una con su autor y la obra de la que procede, cuando consta.». La cierra `bmad-ux`, y bloquea la 28.2. Lo demás está cerrado: la meta description de los Directorios la aprobó Héctor el 19/10 (UX-DR80); la frase de la descarga en iOS está escrita y se activa solo si la matriz la reproduce (UX-DR75); la Paginación de 12 páginas a 360 px la cerró Héctor el 19/10 dentro del barrido de reflujo (26.9).

**Referencia visual.** Las maquetas están en `ux-designs/ux-brainlySabiduria-2026-08-10/mockups/`. Seis son de decisión, y en ellas vale solo la variante elegida:

| Maqueta | Variantes elegidas |
|---|---|
| [`v8-cabecera-y-portada.html`](ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v8-cabecera-y-portada.html) | 1A, 2A, 3A con la redacción 1 de la línea de cifras, y 4A |
| [`v8-pagina-de-cita.html`](ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v8-pagina-de-cita.html) | 1A, 2C y 3A |
| [`v8-historia-de-instagram.html`](ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v8-historia-de-instagram.html) | A, 2B y 3B |
| [`v8-directorios.html`](ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v8-directorios.html) | 1A, 2A, 3A, 4B, 5B, 6C, 7A y 8B |
| [`v8-buscar.html`](ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v8-buscar.html) | 1A, 2B, 3C (que cubre también la decisión 4), 5A, 6A y 7C; la decisión 8 la fija la maqueta de la Obra |
| [`v8-pagina-de-obra.html`](ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v8-pagina-de-obra.html) | 1A, 2B, 3A, 4B y 5A |

Dos son de referencia, sin variantes: [`v8-pagina-de-tema.html`](ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v8-pagina-de-tema.html) y [`v8-kit-y-lote.html`](ux-designs/ux-brainlySabiduria-2026-08-10/mockups/v8-kit-y-lote.html).

**Las espinas mandan sobre las maquetas.** Lo que una maqueta marca en ámbar como «[sin decidir]» no es contrato. Las divergencias anotadas en `EXPERIENCE.md § Maquetas` se resuelven a favor de `DESIGN.md` y `EXPERIENCE.md`:
- la cabecera provisional, con los tres enlaces en siena y sin aire entre las dos filas;
- la Tarjeta de Obra y «Compartir en» como `h2` en la portada;
- «Buscar en…» sin botón y con un solo campo oculto;
- los recuentos sin unidad;
- «Buscar en este Tema», con mayúscula;
- lo tecleado en serif, y la flecha propia del selector;
- el filtro del Directorio por principio de palabra, que da 13 Autores en vez de 14;
- «Siguiente cita sobre la vida ›» hacia la Cita contigua;
- el destino Facebook sin aviso de pestaña nueva;
- la línea de arriba de la Historia sin asociar al diálogo;
- el texto de ejemplo en el filtro de los Directorios, «Por ejemplo: gonzalez» y «Por ejemplo: quijote», donde la espina no pone ninguno *(v8.2)*.

Las maquetas anteriores a la v8 dibujan la cabecera de antes.

### FR Coverage Map — v8

FR-56: **Épica 23** — la lectura, la salida interna con su zona, la búsqueda asentada, la vista de Obra y la llegada con marca, sobre un vocabulario cerrado que entra entero con su migración —con la lectura con acción (`primera`) y la descarga con destino—, el `rowid` aleatorio, que entra antes en la principal (23.12), la búsqueda ya asentada al volver sin caché (23.8), y la línea base con su comparación por firma y sus ventanas (23.10) *(v8.2)*. La vista y la lectura de los Directorios las declara la **26** sobre ese mecanismo, y la combinación de filtros de la búsqueda la emite la **27**.
FR-22: **Épicas 23 y 25** — la 23 coteja `?de=` y `?via=`, las guarda aparte, las cuenta una vez por llegada y las quita de la dirección; la 25 pone `?via=` en todo lo que se comparte, y nunca `?de=`.
FR-12: **Épica 24** — la Tarjeta de Obra, «Siguiente», «De la misma obra», «Más de {Autor}» y su orden, en el HTML inicial y sin guion. Sobre la Cita del Día, **28**.
FR-4, FR-6, FR-26: **Épica 24** — la Tarjeta de Cita de cada listado lleva el título de su Obra como texto. «Buscar en {Autor}» y «Buscar en este tema» (FR-4, FR-6), **Épica 27**.
FR-35: **Épica 24** — la Tarjeta de Obra y el salto, comprobados en los dos estados de la afiliación. Cada otra entrada nueva la comprueba quien la construye: lo compartido de la Obra (**25**), el Directorio de Obras (**26**) y las Obras de la portada (**28**).
FR-38, FR-47: **Épica 24** — la relación por fichero y campos que pinta, la navegación que no fecha y los listados que ganan las fichas de Obra. Los Directorios, con lo que pintan y con la clave de orden, entran en la relación con la **26**.
FR-51: **Épica 24** — el orden del libro en todas las páginas, la tarjeta sin título de Obra y el salto. La vista de Obra, **23**; compartir en la página 1, **25**; «Buscar en esta obra», **27**. La alcanzan la Tarjeta de Obra (24), el Directorio de Obras (26) y, si es indexable, las Obras de la portada (28).
FR-10, FR-11, FR-17, FR-19, FR-21: **Épica 25** — los dos formatos de una sola ruta de generación con el dominio al pie, el 9:16 sin elegir diseño, la Historia en dos toques, el validador de Facebook y el 9:16 del Kit. La Imagen sobre la Cita del Día (FR-10), **28**.
FR-18: **Épica 25** — «Compartir en», con los destinos a la vista también donde hay hoja, «Más opciones…» y la página 1 de la Obra. Sobre la Cita del Día, **28**.
FR-20: **Épica 25** — el botón nombrado registra su destino, `opaco` queda solo para la hoja y para la Imagen cuadrada, y toda descarga impuesta por un rechazo se registra como descarga con el destino de su botón: `opaco` en la cuadrada (25.2), `instagram-historia` en la Historia (25.5) *(v8.2)*. El conjunto de destinos, también los de `descarga-de-imagen` *(v8.2)*, lo declara la **23**, y la superficie portada llega con la **28**.
FR-55: **Épica 26** — los dos Directorios, su orden, sus letras, su filtro, su tipo en Pagefind, su familia propia y la cabecera. La portada los enlaza por la cabecera desde la 26, y con sus dos cierres desde la **28**.
FR-15: **Épica 26** — la clave de orden, que la orden propone y corrige y la construcción exige a todo Autor publicado.
FR-40: **Épica 26** — `/autores/` y `/obras/` forman la familia `directorio` en las cinco series.
FR-7: **Épica 27** — los filtros por Autor, Obra y Tema, el estado en la dirección, las tandas de 30, «Buscar en…» y la salida sin JavaScript. El tipo «Directorio» lo añade la **26**, y la zona `resultado` la pone la **23**.
FR-8: **Épica 27** — los ocho destacados de una sola regla y la pantalla sin resultados con filtros. La consulta sin resultados registrada al asentarse, **23**; los mismos ocho en la portada, **28**.
FR-9: **Épica 28** — la línea de cifras, el campo, la Cita del Día con su Tarjeta y sus acciones, las seis Obras, los Temas, las Colecciones con su criterio y los ocho Autores.
FR-3: **Épica 28** — Copiar sobre la Cita del Día, idéntico carácter por carácter a lo que se copia en su Página de Cita.
FR-42 *(no se enmienda)*: lo heredan la Tarjeta de Obra (**24**) y el Directorio de Obras (**26**).
FR-34, FR-37 *(sin trabajo)*: **Épica 26** (los Directorios no admiten ningún Modelo), **27** (la publicidad sigue admitida con filtros) y **28** (nada entre la Cita del Día, su Tarjeta y sus acciones; la invitación, al final).
FR-52 *(sin trabajo)*: la consultan la marca de `vista-de-obra` (**23**) y las Obras de la portada (**28**). A propósito no la aplican el Directorio de Obras (**26**) ni el filtro de Obra (**27**).
FR-50 *(sin trabajo)*: **Épica 26** — el Directorio de Autores no agrupa por Época.
FR-33, FR-39 *(sin trabajo)*: ninguna épica. Ningún Modelo se enciende mientras su Umbral siga en sesiones, y la v8 no reabre FR-39.

**Cobertura de métricas.** Ninguna métrica pide trabajo propio fuera de la orden de la línea base (23.10), que da la comparación por firma y las ventanas de SM-C3 y SM-C5 —y, con la misma ventana, de toda tasa que se juzga contra su propia serie *(v8.2, Héctor, 2026-10-23)*—; SM-11 ya lo tiene hecho (64b1bf0d) *(v8.2)*. Las que van sobre lecturas o búsquedas asentadas salen del instrumento de la **23** y de su lectura desde `tools/`, y las juzga la épica que las mueve:
- SM-3, SM-4 de la Página de Cita y SM-C5 (con SM-5): la **24**;
- SM-5, SM-7, SM-12 y SM-C3: la **25**;
- SM-4 de los Directorios: la **26**;
- SM-6 y SM-13: la **27**;
- SM-4 de la portada, por zonas: la **28**.

SM-8 sigue en vistas, y lleva un corte con fecha en `umbrales.ts` —en la lista `CORTES_DE_SM8`— por cada despliegue que cambia su instrumento, con la jornada UTC en que llega al sitio en vivo, compuesta de su constante de despliegue; el tramo nuevo empieza la primera jornada UTC completa tras la llegada *(v8.2)* (decisión de Héctor, 2026-10-19): el de la **23** (la marca contada una vez por llegada, la vista desde el fichero y la espera a la activación) y el de la **24 con la 26** (los Directorios emiten vista).

**SM-11:** las tres constantes y la línea del informe ya existen (64b1bf0d), con `DESPLIEGUE_DE_LA_REPARACION` = 2026-10-19. La **24 con la 26** da valor a `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS` (26.11), y la **28**, a `DESPLIEGUE_DE_LA_PORTADA_DE_RETORNO` si llega antes del juicio (28.5) *(v8.2)*. La **23** pasa a UTC el «hoy» con que `lineasDeSm11` compara esas jornadas (23.10, AD-9) *(v8.2)*.

**Las jornadas de llegada** de la **25** y de la **27**, desde las que se cuentan sus ventanas si llegan antes de su línea base, son constantes de despliegue con la forma de las demás: les dan valor la 25.7 y la 27.9 el día que llegan, y la 28.5 a la de la 28 también si llega tras el juicio *(v8.2, Héctor, 2026-10-23)*.

SM-C1 y SM-C2 son aclaraciones sin trabajo (**28** y **26**). SM-C4 se juzga antes y después de encender un Modelo, fuera de estas épicas.

**Cobertura NFR.**
- **NFR-1:** los Directorios, **26**; las marcas no crean URL, **23** y **25**; `/buscar/` con parámetros, **27**.
- **NFR-2:** la Tarjeta y las rutas de salida en el HTML inicial, **24**; los Directorios enteros, con el filtro encima, **26**; el `<details>` de «Más opciones…» y la Historia insertada, **25**; el `<noscript>` y el paquete caído, **27**.
- **NFR-3:** **24**.
- **NFR-4:** **27**.
- **NFR-5:** **26**.
- **NFR-6:** **25**.
- **NFR-7:** cada historia de cierre mide a mano con Lighthouse, con lo de su épica puesto y contra un receptor local, frente a la principal del mismo día —la 23.11, la 26.11, la 25.7, la 27.9 y la 28.5—, y si se degrada el merge espera a que Héctor decida; sin puerta automática *(v8.2, Héctor, 2026-10-23)*. La principal se mide construida y servida igual, en local y con la medición contra un receptor local o un punto final ficticio, nunca en el sitio en vivo, cuyo guion de medición escribiría en el D1 de producción *(v8.2)*. La lista cerrada de guiones y `MAX_BYTES_DE_GUION` en toda superficie, **23**; el tope de cada guion empaquetado, **26** y **27**.
- **NFR-8:** la prueba, **26**; el reflujo de lo que construye cada una, **24**, **25** y **28**.
- **NFR-9** y **NFR-11:** **23**.
- **NFR-12:** los dos formatos y X y Threads, **25**; el título de Obra que parte palabras, **24**, **26** y **28**.
- **NFR-13:** **24**, **26**, **27** y **28**, cada una en lo que añade.

**Cobertura UX-DR.**
- **Épica 23:** UX-DR111, el vocabulario y la colocación en lo ya construido: `atribucion`, `chip-de-tema`, `colecciones`, `listado`, `paginacion`, `lista-de-obras`, `resultado`, `cita-del-dia`, `rutas-de-salida`, `autores-de-portada` y la `cabecera` de hoy. También el suelo WCAG 2.2 AA de UX-DR103, y el texto derivado en el build de las islas en línea que anuncian (UX-DR99). Y las exenciones de zona escritas, también la de los Directorios del aviso de `/buscar/` (UX-DR111) *(v8.2)*.
- **Épica 24:** UX-DR64, UX-DR65, UX-DR67, UX-DR68, UX-DR69, UX-DR70 y UX-DR96; UX-DR63 (el orden, salvo «Compartir en»); UX-DR66 (la posición); UX-DR95 (el orden del libro, el salto y el ritmo del pie); las zonas `tarjeta-de-obra`, `siguiente` y `misma-obra`.
- **Épica 25:** UX-DR71, UX-DR72, UX-DR73, UX-DR74, UX-DR75, UX-DR76, UX-DR77, UX-DR78, UX-DR97 y UX-DR98; UX-DR79 (el validador de Facebook); UX-DR63 (se retira «Compartir la cita»); UX-DR95 («Compartir en», en su sitio). Y el nombre de la previsualización cuadrada, la Cita que no cabe, los rechazos solo antes de abrir la hoja, «Enlace copiado» sin esperar a `share()`, la frase de iOS condicionada (UX-DR75, UX-DR76) y el correo de una Obra (UX-DR97) *(v8.2)*.
- **Épica 26:** UX-DR54, UX-DR55, UX-DR80, UX-DR81, UX-DR82, UX-DR83, UX-DR84, UX-DR85 y UX-DR86; UX-DR58 (el componente nace en el filtro); UX-DR79 (la Tarjeta Social de los Directorios *(v8.2)*); UX-DR91 (el tipo «Directorio»); UX-DR99 (el segundo ritmo); la zona `directorio` y la cabecera de cuatro enlaces.
- **Épica 27:** UX-DR87, UX-DR88, UX-DR89, UX-DR90, UX-DR92, UX-DR93 y UX-DR94; UX-DR58 (`/buscar/`, el 404 y «Buscar en…», con su botón); UX-DR91 (el resto); UX-DR95 («Buscar en esta obra», en su sitio). Y el filtro que no se puede usar (UX-DR93), `/buscar/` antes de que arranque (UX-DR92), el fallo de «Mostrar 30 más» bajo el botón (UX-DR90) y el texto de ejemplo (UX-DR58) *(v8.2)*.
- **Épica 28:** UX-DR56, UX-DR57, UX-DR59, UX-DR60, UX-DR61 y UX-DR62; UX-DR58 (la portada); UX-DR66, UX-DR71, UX-DR73 y UX-DR76 sobre la Cita del Día; las zonas `obras-de-portada` y los ocho de `autores-de-portada`. Y la línea de cifras con el censo vacío (UX-DR57), la portada sin apta (UX-DR108) y las Obras que rotan aparte (UX-DR60) *(v8.2)*.

**Transversales**, cada épica en lo que construye:
- **UX-DR99, los mensajes:**
  - los estados de la Historia, **25**;
  - el recuento del Directorio y su frase a cero, **26**;
  - el recuento y la frase sin resultados de `/buscar/`, y la región del fallo de «Mostrar 30 más» *(v8.2)*, **27**;
  - «Copiado.» sobre la Cita del Día, **28**.
- **UX-DR100, el foco:**
  - el `h2` de «Dónde leer esta obra», **24**;
  - el campo del enlace en la Historia, **25**;
  - los grupos de letra y «Letras», **26**;
  - «Mostrar 30 más», «Quitar los filtros» y el selector de Obra, **27**.
- **UX-DR101, la semántica:**
  - los `h2` de la Página de Cita, **24**;
  - «Compartir en» y su rejilla, **25**;
  - encabezados, listas y puntos medios de los Directorios y de la cabecera, **26**;
  - la tabulación y los resultados de `/buscar/`, **27**;
  - la marca como `h1`, los rótulos y «Saltar al contenido» de la portada, **28**.
- **UX-DR102, las zonas de toque:**
  - el salto y las filas de la Tarjeta, **24**;
  - la cabecera, las letras, la cabecera de grupo, «Volver a las letras» y «Buscar «x» en las citas», **26**;
  - «Ver esta cita» y los cierres de la portada, **28**.
- **UX-DR103, el reflujo:**
  - la prueba en tres condiciones y la cabecera, **26**;
  - la rejilla «Compartir en», **25**;
  - los títulos de Obra que comparten fila: en la Tarjeta, **24**; en el Directorio y la Lista de Obras, **26**; en las Obras de la portada, **28**.
- **UX-DR104, la tipografía:**
  - la Tarjeta de Obra, **24**;
  - el campo, los nombres, el encabezado y las letras de los Directorios, la Fila de Obra y el título del resultado «Directorio», **26**;
  - lo tecleado en `/buscar/`, en «Buscar en…» y en el 404, y los selectores, **27**;
  - el campo, las Obras y los Autores de la portada, **28**.
- **UX-DR105, el siena y el subrayado:**
  - la Tarjeta, «Siguiente», los cierres y el salto, **24**;
  - los botones de «Compartir en», **25**;
  - la cabecera, las letras, «Volver a las letras», las filas y «Buscar «x» en las citas», **26**;
  - «Mostrar 30 más», «Quitar los filtros» y «Buscar», **27**;
  - «Ver esta cita» de la portada, que pasa a tinta; el del 404 sigue en siena *(v8.2)*; y los cierres de la portada, **28**.
- **UX-DR106, la pestaña nueva:**
  - los destinos, y Correo por `mailto:` sin aviso, **25**;
  - la misma pestaña para la Tarjeta, «Siguiente» y el salto, **24**;
  - para la cabecera, los Directorios y «Volver a las letras», **26**;
  - para «Buscar en…», **27**.
- **UX-DR107, la voz:** cada épica pone sus literales. Los Directorios no dicen «frases» en ningún texto, y dicen «citas» en el cuerpo y en la meta description, con el título de pestaña literal de UX-DR80 (**26**) *(v8.2)*.
- **UX-DR108, los estados de la Página de Cita y de la portada:**
  - Cita sin Obra, Obra de una Cita, Obra sin cotejar, bloques vacíos, Cita sin Tema y año que se omite, **24**;
  - Cita de más de 300 caracteres, sin Imagen ni Historia, **25**, y en la portada, **28**;
  - el copiado fallido sobre la Cita del Día y el 404 sin Tarjeta ni acciones, **28**;
  - el botón del campo del 404, **27**.
- **UX-DR109, los estados de Obra, Autor, Tema y Directorios:**
  - Obra `noindex` con su salto, páginas 2+ en el orden del libro y sin salto, y el Tema bajo su umbral, que no cuenta para «Siguiente», **24**;
  - «Compartir en» solo en la página 1, **25**;
  - la Obra igual que las demás en el Directorio, Autores y Obras sin Citas fuera, y el Directorio sin guion, **26**;
  - el valor de filtro y «Buscar en…» solo en la página 1, **27**;
  - fuera de las Obras de la portada, y la portada sin Obras o congelada, **28**.
- **UX-DR110, los Modelos:**
  - la Tarjeta de Obra y el salto, **24**;
  - lo compartido de la Obra, **25**;
  - los Directorios, **26**;
  - `/buscar/` con filtros, **27**;
  - las Obras de la portada y la invitación al final, **28**.
- **UX-DR112, lo construido que la v8 cambia:**
  - las hermanas como Tarjeta de Cita, «Más de {Autor}» sin las de la misma Obra y el Listado de Obra en el orden del libro, **24**;
  - «Compartir la cita» retirada, los destinos a la vista, la Imagen cuadrada con dominio y el filete del campo de copia manual, **25**;
  - la cabecera de cuatro enlaces y la unidad en la Lista de Obras, **26**;
  - el 404 con botón y en Inter, y los cambios de `/buscar/`, **27**;
  - la marca como `h1`, «Ver esta cita» a tinta en la portada *(v8.2)* y la lista entera de Autores fuera de la portada, **28**.

**Volver a medir sobre lo construido:** la cabecera y dónde empieza la Cita, **26**; los selectores con el valor a 17 px, y la primera Cita del Tema y de la Obra con el botón «Buscar», **27**; las bandas de la historia y si basta un fotograma para el primer ritmo, **25**. **Lo que las espinas dejaban sin cerrar** lo cerraron Héctor y la UX v8.2: la meta description (**26**) y la frase de iOS, que se activa con la matriz (**25**) *(v8.2)*, con una constante de `umbrales.ts` que Héctor enciende *(v8.2, Héctor, 2026-10-23)*. Queda abierta, para `bmad-ux`, la frase de la portada sin apta frente a `DESCRIPCION_DEL_SITIO`, que bloquea la 28.2 (**28**) *(v8.2)*.

**Cobertura de los Additional Requirements.**
- **Épica 23:**
  - AD-6: la medición a fichero, el presupuesto en línea (el hueco y el slug de `CopiarCita` a `data-*`), «una prueba de ausencia no prueba nada» y la lista cerrada, abierta con la medición, `imagen.js` y Pagefind; la isla de medición y su arranque;
  - AD-9: los 8 s, el mínimo de lecturas, la jornada de despliegue de la 23 y la lista de cortes de serie *(v8.2)*; la constante de las pasadas que escriben en producción, que la orden de la 23.10 descuenta *(v8.2, Héctor, 2026-10-23)*; y el «hoy» de `tools/` en UTC frente a toda constante de despliegue, también en `lineasDeSm11` (23.10) *(v8.2)*;
  - AD-11: quién lee la marca de `vista-de-obra`;
  - AD-13, entero: también el `rowid` aleatorio con su excepción a la fusión por épica (23.12) y su barajado (23.2, 23.3), que sin cupo en la cuota de escritura del día no corre ni se trocea *(v8.2, Héctor, 2026-10-24)*; la lectura con acción; la búsqueda ya asentada al volver *(v8.2)*;
  - AD-14, entero, con `DESPLIEGUE.md` §3;
  - AD-17: la quinta consecuencia (el `data-*` de vistas desde `superficies.ts` y la marca `indexable` igual al `noindex`) y el barrido con `wcag22aa` y axe 4.14.0;
  - la convención de mensajes, en las islas en línea;
  - el glosario de la medición: Lectura, Salida interna, Zona, Marca de origen y Marca de difusión, y los conjuntos cerrados;
  - el Entorno operativo: las cuotas de D1 en la orden de la línea base, el plan de Cloudflare, `wrangler` 4.151.1 exacto y lo que el CI no prueba de la medición, y el receptor local de toda construcción de rama, que monta la 23.2 *(v8.2)*.
- **Épica 24:**
  - el paradigma v8, porque el cargador de posiciones estrena `tools/lib/` en `content.config.ts`;
  - AD-9: el recuento de «De la misma obra» y el aviso y el tope del peso de `dist/`, medido tras Pagefind, con la 24.2 adelantada a la principal *(v8.2, Héctor, 2026-10-23)*; y el tope del número de PNG, sin valor hasta que Héctor lo fije *(v8.2)*;
  - AD-16: la deuda declarada de la caché de PNG, que cuenta el paso final *(v8.2)*;
  - AD-11: los recuentos de la Tarjeta de Obra y de las rutas de salida, y las rutas de salida mismas;
  - AD-19: la tarjeta según el contexto, y hasta siete fuera de Pagefind;
  - AD-20: la Tarjeta y «Siguiente» sin Modelo;
  - AD-23, las dos reglas;
  - AD-25: el orden del libro;
  - AD-27: la relación por campos, los ficheros de los listados y de la Obra, las bajas y la cuenta antes de desplegar;
  - el glosario: Tarjeta de Obra y Tarjeta de Cita;
  - el Entorno operativo: los techos del alojamiento.
- **Épica 25:**
  - AD-6: el presupuesto de los disparadores y las islas de la Historia, de «Más opciones…», de compartir la Obra y del 9:16 del Kit;
  - AD-7 y AD-8;
  - AD-9: la jornada de llegada de la 25 (25.7), las jornadas y rutas de la 25.3 y de la 25.7 en la constante de las pasadas que escriben en producción, y la constante que activa la frase de iOS (25.5) *(v8.2, Héctor, 2026-10-23)*;
  - AD-15: el 9:16;
  - AD-16: la Tarjeta Social de Obra con el fichero de su Autor, que ya construyó la 22.7 y la 25 conserva;
  - AD-20: lo compartido de la Obra, y su isla en el tope;
  - AD-28: «{título}, de {Autor}»;
  - el Entorno operativo: la matriz y el validador.
- **Épica 26:**
  - AD-1;
  - AD-3: el filtro y la función hermana;
  - AD-6: el guion empaquetado siempre a fichero, el filtro y su tope;
  - AD-9: la pausa de tecleo y el tamaño de `/obras/`;
  - AD-11: `autoresPublicados` y `obrasPublicadas`, la puerta de NFR-5 —con `coleccion despublicar` y `tools/alta.ts`, y las aristas del grafo del modelo *(v8.2)*— y quién lee el Directorio de Obras;
  - AD-12: la marca `data-jornada` y la prueba de las dos jornadas, con el 404 como la portada *(v8.2)*;
  - AD-15: las Tarjetas de los Directorios;
  - AD-17: los Directorios como producto, la mudanza de las familias, los tipos `directorio` y `portada`, el medio que no casa, la quinta consecuencia de los Directorios y el reflujo a 320 px;
  - AD-19: los Directorios listan entidades;
  - AD-20: los Directorios no admiten ningún Modelo;
  - AD-24;
  - AD-25: el mismo componente para la lista de obras;
  - AD-27: `ordenAlfabetico`, `ordenRevisado` y los ficheros de los Directorios, y la familia del fichero frente a la de la ruta *(v8.2)*;
  - AD-28: los Directorios sin semblanza;
  - la convención de mensajes: el segundo ritmo;
  - el glosario: Directorio.
- **Épica 27:**
  - AD-3: el orden por el nombre tal como se lee, el de los Temas con su artículo y los destacados;
  - AD-6: la búsqueda empaquetada y su tope;
  - AD-9: la tanda de resultados, los ocho destacados y el tamaño de los filtros y del mapa, y la jornada de llegada de la 27 (27.9) *(v8.2, Héctor, 2026-10-23)*, que es lo único que la 27.9 anota tras el merge: no es una pasada que escriba en producción *(v8.2, Héctor, 2026-10-24)*;
  - AD-11: las opciones de filtro, el mapa de rótulos, los destacados, el componente único de filtros y metadatos, y quién lee el filtro de Obra;
  - AD-13: la búsqueda asentada con filtros, la caché de atrás y adelante y la navegación `back_forward` sin ella (`history.state`, Navigation Timing) *(v8.2)*;
  - AD-20: la publicidad con filtros;
  - AD-25: `data-pagefind-sort` y el nombre de ficha como interfaz pública;
  - la convención de parámetros de dirección;
  - el Entorno operativo: las pruebas que llaman a Pagefind.
- **Épica 28:**
  - AD-6: las islas sobre la Cita del Día, y el tope de la portada medido con una Cita que admite Imagen;
  - AD-9: el recuento de las Obras de la portada, y `DESPLIEGUE_DE_LA_PORTADA_DE_RETORNO`, que la 28.5 anota llegue antes o después del juicio *(v8.2, Héctor, 2026-10-23)*;
  - AD-11: las seis Obras y la línea de cifras;
  - AD-12: las seis Obras, con la marca de la 26, la ventana que avanza tantos puestos como Obras salen, y las seis aparte de la Cita del Día *(v8.2)*;
  - AD-17: la portada no emite vista de Cita, y sus Obras son rutas sin `noindex`;
  - AD-19: la canónica de lo que se hace en la portada;
  - AD-20: el bloque sin Modelo y las Obras de la portada;
  - AD-25: la congelación alcanza a las Obras de la portada.
- **Sin trabajo:** AD-21. La congelación no alcanza a la navegación: la 24, la 25 y la 26 no la aplican.
- **Todas las épicas:** la unidad de fusión (ramas 23 · 24+26 · 25 · 27 · 28, con dos historias que entran solas en la principal: la 23.12 antes de la 23.3 y la 24.2 en cuanto tenga sus valores *(v8.2, Héctor, 2026-10-23)*) y la principal nunca en rojo, con la reparación ya en vivo (2026-10-19); `npm run test:e2e` entero antes de cada merge, que es acto de Héctor *(v8.2)*. Cada épica cierra con su historia operativa —la 23.11, la 25.7, la 26.11, la 27.9 y la 28.5—, que mide NFR-7 *(v8.2, Héctor, 2026-10-23)*.
- **Épica 24:** Zod desde `astro/zod`, en la historia del cargador de posiciones.
- **Épica 26:** la Paginación de 12 páginas a 360 px, en el barrido de reflujo.
- **Sin épica:** las tres fechas de SM-11, ya construidas en 64b1bf0d *(v8.2)*, salvo el «hoy» en UTC de su línea, que es de la 23.10 *(v8.2)*; Node `>=22.22.0`, atado a subir Astro a la 7.4, que ninguna épica sube; las acciones para Node 20 de `publicar.yml`, mantenimiento sin historia. Pagefind ^1.5.2 y TypeScript ^5.9 ya se cumplen.

**Preguntas abiertas y desalineaciones, por épica.**
- **Épica 23:** el mínimo de lecturas y el plan de Cloudflare; `DESPLIEGUE.md` §3, que pone al día la 23.2 *(v8.2)*. Que Héctor miró la comparación por firma y da por buena una línea base lo anota en `DESPLIEGUE.md` §3, con fecha y métrica (23.10) *(v8.2, Héctor, 2026-10-23)*. La cuota de lectura de D1, que la espina no nombra *(v8.2)*. Decidido por Héctor el 2026-10-24: el barajado no se trocea; si no cabe en la cuota de escritura del día, `desplegar` sale con 1 sin barajar y él lo repite otro día (23.2) *(v8.2, Héctor, 2026-10-24)*.
- **Épica 24:** los valores del aviso y del tope del peso de `dist/`, y el tope del número de PNG *(v8.2)*; la 21.2, antes o después de esta épica; el `lastmod` de la Obra, que fija AD-27.
- **Épica 25:** la Historia en iOS, decidida por la puerta de la matriz antes del 9:16, y qué hace allí su botón (Héctor, 25.3) *(v8.2)*; la «Tarjeta de Obra» de AD-16, que es la Tarjeta Social. Decididos por Héctor el 2026-10-23: la jornada de llegada de la 25 es una constante de despliegue (25.7), la segunda pasada de la 25.7 escribe en producción y se descuenta como la 25.3, y la frase de iOS se activa con una constante de `umbrales.ts` *(v8.2, Héctor, 2026-10-23)*.
- **Épica 26:** el tipo `portada`.
- **Épica 27:** las reuniones de Obra ya publicadas, que dejan sin filtro las búsquedas que nombran la absorbida. `?autor=a&obra=b` con una Obra de otro Autor descarta la Obra y lo dice, y «Buscar en…» y las salidas sin resultados van exentos de zona por escrito (decisiones de Héctor, 2026-10-19), como los Directorios del aviso de `/buscar/` (decisión de Héctor, 2026-10-22) *(v8.2)*.
- **Épica 28:** la ventana de SM-11. Si la frase de la portada sin apta se escribe aparte o si `DESCRIPCION_DEL_SITIO` cambia con ella, que `EXPERIENCE.md` da por iguales y que hoy difieren: la cierra `bmad-ux`, y bloquea la 28.2 *(v8.2)*. El campo de la portada va exento de zona por escrito (decisión de Héctor, 2026-10-19).
- **La fecha de SM-11 es la del despliegue en vivo:** **24** con la **26**, y **28**; y la de la **23** es la de su corte de SM-8 *(v8.2)*.

**Fuera, a propósito:**
- el tope de HTML de la Página de Cita, salvo que Héctor lo cree (24.2) *(v8.2)*;
- el índice de subpáginas de la Fuente;
- trocear los filtros y paginar `/obras/`;
- conservar el guion de medición anterior durante un despliegue;
- la sesión o un identificador de visita;
- el archivo de la Cita del Día;
- la caché de PNG de AD-16, deuda declarada *(v8.2)*.

## Epic List — v8

Seis épicas, troceadas por superficie para poder atribuir cada cambio: desplegada de una vez, la ronda movería todas las cifras juntas y ninguna diría qué las movió. La unidad de fusión es la épica. Cada una se integra en su rama, salvo la 24 y la 26, que comparten una, y entran en la principal en este orden: la 23; la 24 con la 26; la 25 y la 27, en cualquier orden; la 28 al final. Ninguna se fusiona con el CI en rojo. La publicación, que falló del 2026-10-11 al 2026-10-19, se reparó fuera de la v8 y está en vivo desde el 2026-10-19 a las 09:22 UTC *(v8.2)*. Dos excepciones a la fusión por épica, cada una una historia que entra sola en la principal: el `rowid` aleatorio de `medicion/worker.ts`, antes de la 23.3 (23.12) *(v8.2)*, y el aviso y el tope del peso de `dist/` tras Pagefind (24.2), en cuanto Héctor dé sus dos valores *(v8.2, Héctor, 2026-10-23)*. Cada épica cierra con una historia operativa que la lleva al sitio en vivo: la 23.11, la 26.11 por la 24 y la 26, la 25.7, la 27.9 y la 28.5 *(v8.2, Héctor, 2026-10-23)*. Antes de cada merge se corre `npm run test:e2e` entero sobre la rama, y fusionar es acto de Héctor *(v8.2)*.

### Épica 23: Medir la lectura

Héctor sabe, por superficie y por zona:
- cuántas cargas se leyeron de verdad, porque la página estuvo visible ocho segundos o alguien la tocó;
- por qué enlace siguió quien leía;
- cuántas búsquedas se asentaron y en qué tramo de resultados;
- cuánto se lee cada Obra, se indexe o no;
- qué trae cada marca, la de las cuentas propias y la de lo que comparte un visitante, contadas una vez por llegada y quitadas de la dirección.

Nada de esto lleva identificador, cookie ni texto libre, y el listón de la Página de Cita no se mueve: el guion de medición sale de la página a un fichero y deja el hueco en línea que necesitan las épicas siguientes. Va primera porque sin ella ninguna otra se puede juzgar: las tasas de §7 pasan a lecturas, y las metas de SM-3…SM-7 esperan a su línea base.

**FRs covered:** FR-56; FR-22 *(cotejo, guardado y recuento de las dos marcas)*, FR-8 *(la consulta sin resultados, registrada al asentarse)*, FR-51 *(la vista de Obra)* *(enmendados)*; NFR-9, NFR-11; SM-8 *(el corte de su serie)*; el instrumento de SM-3…SM-7, SM-12, SM-13, SM-C3 y SM-C5.

**Notas de implementación:**
- **La decisión de presupuesto de AD-6 ya está tomada** (Héctor, 2026-10-18): la medición sale a un `<script src defer>` que el build genera desde `src/lib/medicion.ts`. Era la puerta de la primera historia, porque a la Página de Cita le quedan unos 40 bytes en línea y la 23 añade guion a toda página con vista. Construirla es esa primera historia:
  - el fichero con su tope y el arranque `__medir` en el armazón;
  - la lista cerrada de guiones externos, abierta con la medición, `imagen.js` y Pagefind;
  - el slug de `CopiarCita.astro` fuera de `define:vars`, y el texto que anuncia una isla en línea derivado en el build con `String(…)` y `set:html`;
  - los criterios de las Historias 2.1 y 4.1 y sus pruebas, reescritos de «no envía JavaScript» a «solo las islas y los guiones declarados».

  **Lo que bloquea a la 25 y a la 28 es esto construido, no la decisión**: entran en los ~680 bytes que libera, o suben el tope en el mismo diff.
- **El vocabulario de la v8 entra entero aquí, en un solo cambio de AD-14:**
  - los cuatro eventos, las dieciséis zonas, los cuatro tramos y las seis combinaciones de filtros;
  - la marca de `vista-de-obra`;
  - `via`, con `DESTINOS_VALIDOS` partido en destinos de enlace (ya con `facebook` y `threads`, y sus constructores puros en `compartir.ts`, sin botón) y el de imagen, `instagram-historia`;
  - `primera` (sí/no) de `copiado`, `descarga-de-imagen` y las dos comparticiones, con la correspondencia evento → métrica; y el destino de `descarga-de-imagen`, con {`opaco`, `instagram-historia`} *(v8.2)*. Entra ahora porque añadirlo después de que empiece la línea base abriría un corte en ella.

  Así ninguna de la 24 a la 28 toca D1 ni el receptor: colocan en su marcado zonas y destinos que ya existen. Las zonas de lo ya construido las pone esta épica, porque su prueba sobre `dist/` exige zona o exención en todo enlace interno de `main`.
- **El `rowid` aleatorio del `INSERT` entra en la principal antes de la 23.3 (23.12), sin desplegarse hasta ella** *(v8.2)*. Es la Historia 23.12, la única de la épica que se fusiona fuera de su rama: va sola a la principal, con su prueba estructural, y su fila se añade a mano a `sprint-status.yaml` *(v8.2, Héctor, 2026-10-23)*.
- **Orden de AD-14, desde su rama:** primero las migraciones `0000` (la tabla de producción tal cual) y `0001` (solo los `ALTER`) con `wrangler d1 migrations`; después el receptor, comprobado con baliza de prueba, que dice también si inserta con `rowid` aleatorio, y entonces baraja lo ya escrito —sus filas contadas antes contra la cuota del día—; la huella versionada; al final el sitio *(v8.2)*. Si el barajado no cabe en la cuota de escritura del día, `desplegar` no baraja ni escribe la huella, lo dice y sale con 1, y Héctor lo repite otro día: no se trocea por jornadas *(v8.2, Héctor, 2026-10-24)*. Aplicar en remoto y desplegar el receptor son actos de Héctor. `DESPLIEGUE.md` §3 deja de decir «No hay migración». La orden de `tools/` que lee la línea base con `wrangler` informa de las filas del día frente a la cuota de D1 y del tamaño de la base. Esa orden (23.10) da además la comparación por firma, entrega por ventanas, con la misma definición, toda tasa que se juzga contra su propia serie, y descuenta las jornadas y rutas de las pasadas que escriben en producción, leídas de su constante de `umbrales.ts` *(v8.2, Héctor, 2026-10-23)*; son dos, la 25.3 y la 25.7, y ninguna más *(v8.2, Héctor, 2026-10-24)*. Al desplegar se revisa el plan contratado de Cloudflare. Mientras viva la rama, el receptor no se vuelve a desplegar desde la principal; si se hace, la huella de la rama queda rancia y la 23.3 se repite *(v8.2)*.
- **NFR-9 entra con ella:** el barrido pide `wcag22aa`, y `@axe-core/playwright` y `axe-core` suben a la 4.14.0 en el mismo commit, para que las demás épicas se auditen ya contra 2.2.
- **Lo que no hace:**
  - no emite la vista ni la lectura de los Directorios: las declara la 26 en `superficies.ts`, sobre este mecanismo;
  - no compone ningún `?via=`: eso es de la 25;
  - la búsqueda asentada lleva filtros «ninguno» hasta la 27.
- **Para fusionar** (lo cierra la 23.11):
  - el CI de la principal en verde y el `rowid` aleatorio ya en ella (23.12) *(v8.2)*;
  - `npm run test:e2e` entero sobre la rama, contra un receptor local, con la lectura a 8 s y `pageshow`, la primera acción por carga, la búsqueda ya asentada al volver y el barrido 2.2 *(v8.2)*;
  - en `umbrales.ts`, el mínimo de lecturas de la línea base, fijado en un diff visible antes de leer la primera;
  - el día del merge, desde la rama, la comprobación con balizas de la 23.2 contra el receptor desplegado (23.11) *(v8.2)*;
  - NFR-7 medido a mano con Lighthouse, contra un receptor local y frente a la principal del mismo día; si empeora, el merge espera a que Héctor decida *(v8.2, Héctor, 2026-10-23)*.
- **Tras el despliegue:** Héctor da valor, en un commit aparte del día en que llega, a la jornada de despliegue de la 23 —la UTC en que termina «Desplegar»—, y de ella se compone la primera entrada de `CORTES_DE_SM8` (23.11) *(v8.2)*. Es la del despliegue que llega al sitio en vivo, no la del merge, como la de SM-11 (decisión de Héctor, 2026-10-19). Como existe después del merge, no es condición para fusionar.

### Épica 24: La Obra se ve y la Cita sigue

Quien lee una Cita ve justo debajo de qué obra sale: título, Autor, año si sus Citas coinciden y cuántas tiene. De un toque pasa a la siguiente en el orden del libro o a la obra entera y dónde leerla. Al pie encuentra hasta tres Citas más de esa obra y cuatro del mismo Autor sacadas de otras, y la Cita no deja la primera pantalla.

Los listados de Autor, Tema y Colección dicen de qué obra es cada Cita. La Página de Obra lista las suyas en el orden del libro y salta a «Dónde leer esta obra». Todo se compone en el build, sin guion y sin enlace comercial, y una Cita nueva no refecha las demás Páginas de Cita de su Autor.

**FRs covered:** FR-12 *(reescrito)*; FR-4, FR-6, FR-26 *(la Tarjeta de Cita con Obra)*, FR-35 *(Tarjeta de Obra y salto, en los dos estados)*, FR-38, FR-47, FR-51 *(orden del libro y salto)* *(enmendados)*; NFR-2, NFR-3, NFR-12 y NFR-13 en lo que añade; FR-42 *(heredado)*; SM-3, SM-4 de la Página de Cita y SM-C5 *(la juzgan)*; SM-11 *(la fecha del despliegue conjunto con la 26)*.

**Notas de implementación:**
- **Comparte rama y merge con la 26, por SM-11.** La Tarjeta de Obra pone un enlace a su Obra en cada Página de Cita; desplegada sola, la Obra ganaría enlace interno y el Autor no.
  - Su fecha es `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS`, que ya declara `umbrales.ts` en `undefined` (64b1bf0d): la 26.11 le da la jornada UTC en que llega al sitio en vivo, y de ella sale también el segundo corte de SM-8 *(v8.2)*.
  - Depende de la 23 por las zonas `tarjeta-de-obra`, `siguiente` y `misma-obra`.
  - Si llega antes de que la continuación de la Página de Cita tenga línea base, las ventanas de SM-C5 se cuentan desde su llegada, frente a la serie propia de cada métrica, y se dice *(v8.2)*.
- **El cargador de posiciones va primero** (AD-23). Es un cargador de `content.config.ts`, al patrón del de biografías:
  - localiza cada Cita con el `indexOf` de `tools/lib/cotejo.ts`, sobre el mismo conjunto de documentos que el cotejo;
  - guarda todas sus apariciones sin elegir ni ordenar, y entrega solo la posición;
  - de él sale el orden del libro, que calcula `obras.ts`, y que leen el listado de Obra en todas sus páginas, «Siguiente», «De la misma obra» y, en la 27, `data-pagefind-sort`;
  - sustituye al orden por slug que hoy se calcula en línea en el `getStaticPaths` de la Página de Obra.

  Entre documentos rige el orden natural con romanos, con su prueba, hasta capturar el índice de la Fuente (aplazado). Otra prueba exige que alguna Obra documentada salga en un orden distinto del de slug. Es el segundo lector de `corpus/fuentes/` en cada build: unos 1.421 documentos y unos 159 MB, desde que la reparación retiró 160 (8e834217) *(v8.2)*. La historia que lo construye, la primera que toca `content.config.ts`, pasa además `z` de `astro:content` a `astro/zod`, como ya hace `src/lib/admision.ts` (decisión de Héctor, 2026-10-19).
- **AD-27, por fichero y campos que pinta.**
  - La navegación de la Página de Cita se pinta y no fecha. Es una excepción declarada, decisión de Héctor del 2026-10-17.
  - Los listados ganan las fichas de Obra de sus Citas, y la Página de Obra, sus documentos.
  - Las pruebas: una Cita nueva no fecha otra Página de Cita, una baja fecha lo que componía, y las relaciones inversas casan.
  - Antes de desplegar se cuenta cuántas fechas mueve una sesión de siembra.
  - Si la 21.2 entra antes que esta épica, fecha y avisa una vez sus ~104 Páginas de Cita. Lo decide Héctor.
- **FR-35 se comprueba construyendo el sitio con la afiliación encendida y apagada.** La Tarjeta de Obra y las rutas de salida van en `data-pagefind-ignore="all"`. La congelación de SM-11 no quita la tarjeta.
- **Peso.** Cada Página de Cita gana hasta siete Tarjetas de Cita. La comprobación del peso de `dist/` —en un paso final de `npm run build`, tras Pagefind, sobre lo que se despliega y sin los ficheros que rotan con la jornada (decisión de Héctor, 2026-10-19), y con el número de PNG, cuyo tope (AD-16) fija Héctor en un diff *(v8.2)*; aviso y tope en `umbrales.ts`, con Héctor— va con esta épica, que es la que más peso añade: las Páginas de Cita eran 134 MiB de los 485 según `du` el 2026-10-16 *(v8.2)*. NFR-7 se mide a mano con todo puesto, contra un receptor local *(v8.2)*, y el tope de HTML de la Página de Cita sigue aplazado: se crea si Héctor lo decide, al degradarse la medición a mano de NFR-7 en una historia de cierre —para la 24 con la 26, la 26.11— o para vigilar ese peso (24.2) *(v8.2)*.
- **La 24.2 se adelanta a la principal** *(v8.2, Héctor, 2026-10-23)*. Entra sola, en cuanto Héctor dé los valores del aviso y del tope, como excepción declarada a la fusión por épica, igual que la 23.12: no cambia ningún fichero de `dist/` y vigila el peso desde ya, mientras la principal crece con cada siembra y la 24 con la 26 sigue en su rama. Los valores se revisan igual tras la 24.6, que vuelve a medir.
- **Un acto de Héctor a mitad de cadena** *(v8.2)*: los valores del aviso y del tope del peso de `dist/` de la 24.2, de la que cuelgan la 24.6, la 24.8 y toda la 26; se piden antes de abrir la rama 24+26, y `sprint-status.yaml` lo marca en un comentario (a mano), como el precedente de la 22.2 («las reuniones de obras conocidas las decide Héctor, en commit propio, antes de la 22.4»).
- **No toca compartir.** «Compartir la cita» sigue como está hasta la 25. Copiar queda justo bajo la primera pantalla: es una deuda aceptada, que vigila SM-C5.
- **Para fusionar:** el CI en verde y, sobre la rama conjunta, `npm run test:e2e` entero, con el barrido 2.2 y el reflujo a 320 px de la 26.9 *(v8.2)*. Lo cierra la 26.11, que mide NFR-7 con lo de las dos épicas puesto *(v8.2, Héctor, 2026-10-23)*.

### Épica 25: Compartir donde se publica

Quien quiere compartir una Cita tiene a la vista WhatsApp, Facebook y Threads, también en el móvil que ofrece la hoja del sistema, y «Más opciones…», que abre la hoja o despliega Telegram, X y Correo. En una pantalla táctil que sabe compartir ficheros, la lleva a su Historia de Instagram en dos toques, con una imagen vertical que lleva el dominio al pie y el enlace ya copiado para el sticker.

La Imagen cuadrada gana el dominio, la Página de Obra también se comparte, y el Kit Diario saca el 9:16 para el canal propio. Todo lo que se comparte lleva `?via=` con su destino. Así Héctor sabe cuántas lecturas trae cada botón (SM-12) y vigila que compartir no crezca a costa de copiar (SM-C3).

**FRs covered:** FR-10, FR-11, FR-17, FR-18 *(reescrito)*, FR-19, FR-20, FR-21, FR-22 *(`?via=` en todo lo compartido, nunca `?de=`)*, FR-51 *(compartir en la página 1)*, FR-35 *(lo que se comparte de la Obra)* *(enmendados)*; NFR-6 y NFR-12 en lo que añade; SM-5, SM-7, SM-12 y SM-C3 *(la juzgan)*.

**Notas de implementación:**
- **Depende de la 23:** la marca de difusión, el conjunto de destinos y el hueco en línea que libera la medición. Los disparadores de la Historia y de «Más opciones…» caben en él, o suben `MAX_BYTES_DE_GUION` en el mismo diff, como isla que entra a propósito. Rama propia; se fusiona después de la 24 con la 26, antes o después de la 27.
- **La matriz de dispositivos corre dos veces, y cada una es puerta de un paso.**
  - **Antes de construir el 9:16** (AD-7): la Historia en iOS Safari y en Android Chrome, con la versión de Instagram de ese día. Si en iOS no aparece, se conserva el cuadrado; no hay destino Feed: qué hace allí el botón lo decide Héctor en la 25.3 y, si lo que decida necesita un destino nuevo, entra en el vocabulario por la orden de la 23.2 y la 23.3 antes de la 25.5 *(v8.2)*. Provoca también un fallo de entrega con la hoja abierta (AD-7) *(v8.2)*; si en algún sistema no llega como `AbortError`, Héctor decide con la matriz delante, y la decisión entra como criterio de la 25.5 —y de la 25.2 si aún no está construida— por `bmad-correct-course` antes de construirla, como la de la Historia no ofrecida *(v8.2)*. Va sobre el sitio en vivo, así que escribe en el D1 de producción: su jornada UTC y sus rutas viven en la constante de `umbrales.ts` de las pasadas que escriben en producción, citada en `DESPLIEGUE.md`, y la orden de la 23.10 las descuenta de la línea base *(v8.2, Héctor, 2026-10-23)*.
  - **Al cerrar la épica:** iPhone, Android y los navegadores de las aplicaciones de Facebook, Instagram y Threads, anotada en `DESPLIEGUE.md`. Con ella, las Tarjetas Sociales de la Cita y de la Obra, verificadas en el validador de Facebook antes de ofrecer ese destino (FR-19). La rama se construye con la medición puesta contra un receptor local *(v8.2)*; el clic en la tarjeta de Facebook aterriza en la canónica en vivo, así que esta pasada también escribe en el D1 de producción, y su jornada y sus rutas se anotan y se descuentan como las de la primera *(v8.2, Héctor, 2026-10-23)*.

  Las dos son actos de Héctor y, sin ellas, la épica se queda en revisión. Son las dos únicas pasadas de la v8 que escriben en el D1 de producción *(v8.2, Héctor, 2026-10-24)*. Sus entradas en la constante de las pasadas en producción van a la principal el día de cada pasada, en un commit aparte: son un dato de Héctor y no código de la épica, como dar valor a una constante de despliegue, y no son una excepción a la fusión por épica *(v8.2)*. Facebook queda fuera de la comparación de SM-12 hasta la prueba.
- **Una sola ruta de generación** para el cuadrado y el 9:16:
  - el dominio llega al pie desde `dominio.ts` por `data-*`, y la columna 9:16 de `tramos.ts`, también por `data-*`;
  - la geometría se declara una vez, y la cabida se prueba en el navegador (Playwright local) en los dos formatos, con el pie puesto;
  - la Historia va en dos toques: el primero carga `imagen.js`, compone y previsualiza; el segundo lanza `writeText` antes de `share()`, en el mismo turno. Cada rechazo tiene su conducta fija: los tres que llevan a la descarga, solo antes de abrir la hoja, y la descarga impuesta con el destino de su botón; «Enlace copiado» no espera a `share()` (AD-7) *(v8.2)*;
  - la URL marcada la compone el build con `compartir.ts`, también la de `opaco` y la de `instagram-historia`, y nunca sale de `location`.
- **La frase de iOS** de la Historia (25.5) queda escrita y apagada tras una constante con nombre de `umbrales.ts`, que Héctor enciende en un diff visible si la matriz reproduce en iOS la caída a la descarga, como `SM12_CON_FACEBOOK` *(v8.2, Héctor, 2026-10-23)*.
- **Si la 25 llega al sitio en vivo antes de que SM-5 y SM-7 tengan su línea base**, se juzga contra su propia serie y contra SM-C3, con las ventanas contadas desde su llegada, y se dice. La Imagen cuadrada no entra en el denominador de SM-12 *(v8.2)*. Su jornada de llegada es una constante de despliegue de `umbrales.ts`, con la forma de las demás, a la que la 25.7 da valor el día que llega *(v8.2, Héctor, 2026-10-23)*.
- **Un acto de Héctor a mitad de cadena** *(v8.2)*: si el pie no deja caber alguna Cita, el diff de `src/lib/tramos.ts` de la 25.2, del que cuelgan la 25.4 y la 25.5; también con su comentario en el tablero.
- **La isla de compartir se generaliza**, porque hoy está escrita para una sola Cita.
  - En la Página de Obra es su primera isla, sin la Historia, con «{título}, de {Autor}» compuesto en `atribucion.ts`.
  - Cuenta en el tope que `ingreso-construido.test.ts` mide donde se admite la afiliación.
  - La entrada de la Tarjeta Social de Obra conserva el fichero de su Autor (AD-16), que ya puso la 22.7, porque es lo que Facebook publica como texto.
- **No toca la portada:** el bloque sobre la Cita del Día es de la 28, que lo reutiliza.
- **Para fusionar** (lo cierra la 25.7): el CI en verde; `npm run test:e2e` entero sobre la rama al día con la principal, que ya trae la 24 con la 26, contra un receptor local *(v8.2)*; la matriz de cierre y el validador; NFR-7 medido a mano con Lighthouse en una Página de Cita con la Historia y «Compartir en» puestos, frente a la principal del mismo día, y si empeora, el merge espera a que Héctor decida *(v8.2, Héctor, 2026-10-23)*.

### Épica 26: Directorios y cabecera

Quien busca un Autor o una Obra los encuentra de la A a la Z, por el apellido o por el nombre con que se le conoce: Cervantes va en la C. Tiene letras de salto, años y recuento, y filtra al teclear sin pensar en tildes: «gonzalez» encuentra a González Prada.

Desde cualquier página, la cabecera «Autores · Obras · Buscar» deja todo Autor y toda Obra a dos saltos de la portada. No obliga a desplazarse en horizontal a 320 px y no saca la Cita de la primera pantalla a 360 × 640. Héctor ve los Directorios medidos como familia propia, sin contar en la de lo que listan, y el build garantiza que ninguna Cita queda a más de tres saltos.

**FRs covered:** FR-55; FR-15, FR-40 *(enmendados)*, FR-7 *(el tipo de resultado «Directorio»)*; NFR-1, NFR-5, NFR-8 y NFR-13 en lo que añade; FR-34, FR-37, FR-50, FR-52 *(sin trabajo)*; FR-42 *(heredado)*; SM-4 de los Directorios *(la juzga)*, SM-C2; SM-11 *(la fecha del despliegue conjunto con la 24)*.

**Notas de implementación:**
- **Misma rama y mismo merge que la 24.** Depende de la 23: la vista y la lectura de los Directorios se declaran en `superficies.ts` sobre su mecanismo, y las zonas `directorio` y `cabecera` ya existen. Su despliegue da valor a `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS` (26.11), del que se compone su entrada de `CORTES_DE_SM8` *(v8.2)*, porque los Directorios son superficies nuevas que emiten vista.
- **La clave de orden va primero** (FR-15, AD-1).
  - La forma de `ordenAlfabetico` es puerta del esquema exportado, y su presencia se exige sobre `autoresPublicados`: un Autor con Citas y sin clave rompe el build con la ruta de su fichero.
  - `tools/autor.ts` la propone al dar de alta, y en lote para los Autores que ya existen. Una orden la corrige y la valida, y solo esa orden escribe `ordenRevisado`.
  - La propuesta es la última palabra del `nombre`, y el parte marca aparte los nombres de tres palabras o más para que Héctor los revise primero *(v8.2, Héctor, 2026-10-23)*.
  - La revisión es de Héctor y no bloquea la publicación ni la siembra. Los Autores de prueba llevan clave. La 26.10 se cierra al revisar las claves del lote inicial; las de los Autores nuevos pasan a la sesión de sembrado *(v8.2, Héctor, 2026-10-23)*.
  - La función hermana de `normalizar.ts` da la inicial sin tilde, con la Ñ propia y el slug como desempate. La consumen el Directorio de Autores, las letras de los dos Directorios y, en la 27, los destacados.
- **Los Directorios son producto** (AD-17).
  - Van con rutas literales con barra final y sin páginas 2+, con sitemap, canónica, Tarjeta Social de hechos compuesta en el build y su vista.
  - El conjunto de las seis familias pasa a vivir en `superficies.ts`; hoy lo repiten `tools/lib/indexacion.ts` y `tools/lib/avisar.ts`. La familia `directorio` entra en las cinco series de `tools/` (AD-24).
  - En Pagefind responden por su título. El tipo `directorio`, y también el de la portada, va en `tipoDeResultado.ts`. Lo emite el armazón, por un medio que no casa como texto; una prueba de búsqueda lo fija aquí (Playwright local). El listado va en `data-pagefind-ignore="all"`.
  - No admiten ningún Modelo, y se construyen idénticos con todos encendidos o apagados.
- **El filtro es el primer guion empaquetado de la v8.** Con él entran:
  - `vite.build.assetsInlineLimit` como función, y la prueba de que ningún guion procesado queda en línea, que antes pasaría en vacío;
  - su tope con nombre y la pausa de tecleo, que reutiliza la 27;
  - el Campo de búsqueda de la v8;
  - el segundo ritmo de anuncio, tras la pausa y solo si la frase cambió.

  La Lista de Obras de la Página de Autor y la Fila de Obra de `/obras/` pasan a ser un solo componente, con la unidad a la vista. El tamaño del HTML de `/obras/` avisa al pasar su umbral, sin romper.
- **NFR-5 gana puerta.**
  - `superficiesInalcanzables` rompe en `astro:build:done`, sobre el grafo del `dist/` real, sin los subárboles `data-jornada` e ignorando `<template>` y `<noscript>`.
  - Las órdenes que retiran —también `coleccion despublicar`— se niegan con código 1 si dejarían una Cita a más de tres saltos, y `revisar` y `tools/alta.ts` no publican una Cita sin Tema publicado *(v8.2)*.
  - Es el primer veredicto del build sobre algo que rota. Por eso la marca única `data-jornada` y la prueba de las dos jornadas (AD-12) entran aquí, sobre la Cita del Día, que ya rota. El 404 también la conserva (UX-DR108), así que la prueba lo trata como a la portada: solo pueden diferir sus subárboles `data-jornada` *(v8.2: AD-12 ya nombra el 404)*.
- **NFR-8 gana prueba.** El barrido móvil exige `scrollWidth` ≤ ancho a 320 px en toda superficie pública, en tres condiciones: con el texto por omisión, al 200 % y con el espaciado de 1.4.12. La cabecera va en dos filas por debajo de 600 px. Su altura (~113 px) y dónde empieza la Cita se vuelven a medir sobre lo construido. La Paginación de 12 páginas a 360 px entra en el mismo barrido, con `{spacing.unit}` entre zonas también en vertical (decisión de Héctor, 2026-10-19).
- **No depende de la 27.** A cero, el filtro ofrece «Buscar «x» en las citas» hacia la `/buscar/` de hoy, y los destacados que allí salgan siguen la regla de la 27 cuando llegue.
- **Para fusionar** (lo cierra la 26.11, por la 24 y la 26): el CI en verde; `npm run test:e2e` entero *(v8.2)*; NFR-7 medido a mano con Lighthouse con lo de las dos épicas puesto, contra un receptor local y frente a la principal del mismo día, y si empeora, el merge espera a que Héctor decida *(v8.2, Héctor, 2026-10-23)*. Ya en vivo, la 26.11 da valor a `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS`, que no es condición para fusionar *(v8.2)*.

### Épica 27: Buscar con filtros

Quien busca acota por Autor, por una Obra de ese Autor (también las que no se indexan) y por Tema, con texto o sin él. La búsqueda vive en la dirección y se comparte, y «atrás» devuelve la anterior. Los resultados llegan de 30 en 30, con su recuento anunciado, y cada Cita lleva su Autor.

Desde la página 1 de una Obra, de un Autor o de un Tema se entra con «Buscar en…» y el filtro puesto, sin que ninguna combinación cree una página indexable. La pantalla sin resultados ofrece los ocho Autores con más Citas, con el suelo latinoamericano garantizado. Sin JavaScript, la página lo dice y lleva a los Directorios. Héctor sabe cuántas búsquedas acaban en un resultado pulsado (SM-13) y cuántas se quedan a cero (SM-6).

**FRs covered:** FR-7, FR-8 *(enmendados)*; FR-4, FR-6 *(«Buscar en…»)*, FR-51 *(«Buscar en esta obra»)*; NFR-1 *(`/buscar/` con parámetros)*, NFR-2, NFR-4 y NFR-13 en lo que añade; FR-37, FR-52 *(sin trabajo)*; SM-6 y SM-13 *(las juzgan)*.

**Notas de implementación:**
- **Depende de la 23 y de la 26.**
  - De la 23: el evento `busqueda`, con tramo y filtros, y la zona `resultado`.
  - De la 26: los Directorios como salida sin guion, la clave de orden para el desempate de los destacados, el Campo y la pausa de tecleo, `autoresPublicados` y `obrasPublicadas`, y el componente de la lista de obras, cuyo orden toma el selector de Obra.

  Rama propia; se fusiona antes o después de la 25. La cierra la 27.9, operativa, que la lleva al sitio en vivo *(v8.2, Héctor, 2026-10-23)*. Lo prueba todo sobre la rama contra un receptor local y, tras el merge, solo anota su jornada de llegada: no comprueba nada en el sitio en vivo, que escribiría en el D1 de producción, y siguen siendo dos, y ninguna más, las pasadas que escriben allí, la 25.3 y la 25.7 *(v8.2, Héctor, 2026-10-24)*.
- **Un solo componente escribe los filtros, los metadatos y la clave de orden de una Cita, y solo en su Página de Cita** (AD-11):
  - `autor`, a lo sumo una `obra` y sus Temas publicados. El valor de `obra` es el nombre de su ficha, que pasa a ser interfaz pública;
  - `data-pagefind-sort`: un ordinal de ancho fijo que compone `obras.ts` con el orden del Directorio, el de la lista de obras y el del libro, y que deja sus huecos para «sin Obra» y «sin documento».

  El CI fija en Vitest los atributos de `dist/`. Los recuentos de `filters()` y el orden de `search(null, …)` son Playwright local.
- **La búsqueda con filtros es un guion empaquetado con su tope.**
  - Pagefind se pide con `import()` al enfocar el campo, al elegir un filtro o al llegar con estado en la dirección, y los ~41 KB de filtros solo cuando hacen falta.
  - El mapa de rótulos (nombre de ficha → título y Autor) es un JSON del build, nunca HTML.
  - El mapa y los filtros tienen un tamaño con nombre que avisa sin romper, medido tras Pagefind. Trocearlos está aplazado.
- **La dirección es estado** (convención de parámetros).
  - `?q=&autor=&obra=&tema=`, con identificadores.
  - `obra` sin `autor` toma el Autor del mapa.
  - Un filtro que ya no existe, también el de una Obra absorbida al reunir, se ignora, se dice y se quita.
  - El estado que deja la pausa entra con `pushState` y se reescribe con `replaceState` mientras sigue cambiando el mismo control; todo dentro de un `try` *(v8.2)*.
  - La búsqueda asentada de la 23 pasa a este guion con sus filtros. Restaurar desde la caché de atrás y adelante conserva los estados ya emitidos, y sin la caché la entrada marcada en `history.state` —con Navigation Timing de respaldo— dice que ya se asentó *(v8.2)*.
- **Los destacados salen de una sola función** de `publicado.ts`, con el predicado «cuenta para el suelo» de `src/lib/huecos.ts` (`EquilibrioDeTradicion.hispanicos`), que la 27.6 saca a una función con nombre que usan `huecos.ts` y los destacados, y su recuento en `umbrales.ts`. La portada de la 28 la reutiliza.
- **«Buscar en…» no añade guion ni crea página indexable:** es un formulario GET con el filtro en campos ocultos, dos en la Obra. El campo del 404 gana el botón «Buscar», y lo tecleado pasa a Inter.
- **Lo que heredaba, resuelto** por Héctor el 2026-10-19: en `?autor=a&obra=b`, una `b` de otro Autor se descarta y se dice, con la regla del filtro que ya no existe (27.4); «Buscar en…», el campo de la portada, el del 404 y las salidas de la búsqueda sin resultados van exentos de zona por escrito (27.6, 27.8), y los Directorios del aviso de `/buscar/`, también exentos (decisión de Héctor, 2026-10-22; 27.7) *(v8.2)*. `/buscar/` sigue admitiendo la publicidad acotada con filtros.
- **Para fusionar:** el CI en verde y `npm run test:e2e` entero sobre la rama, construida con la medición contra un receptor local, con lo que llama a Pagefind y el barrido 2.2 con el reflujo; lo cierra la 27.9 *(v8.2)*, que mide NFR-7 a mano con Lighthouse en `/buscar/` y en una Página de Cita, frente a la principal del mismo día, las dos construidas en local con la medición contra un receptor local *(v8.2, Héctor, 2026-10-24)*, y si empeora, el merge espera a que Héctor decida; un agente nunca fusiona, y su jornada de llegada es una constante de despliegue de `umbrales.ts` a la que la 27.9 da valor el día que llega *(v8.2, Héctor, 2026-10-23)*, que es lo único que anota tras el merge *(v8.2, Héctor, 2026-10-24)*.

### Épica 28: La portada de retorno

Quien vuelve a la portada lee arriba, en una línea, cuántas Citas de cuántos Autores tiene el Corpus y cuántas están cotejadas, y tiene un campo para buscar. Debajo está la Cita de hoy con su obra y las mismas acciones que en su página: copiar, imagen y compartir. Actúan sobre su Página de Cita, nunca sobre la portada.

Siguen seis Obras de seis Autores que cambian con la jornada, todos los Temas, las Colecciones con su criterio para que no parezcan Temas, y los ocho Autores con más Citas, cada bloque con su camino al Directorio. Héctor sabe por qué zona sigue quien vuelve.

**FRs covered:** FR-9 *(enmendado)*; FR-3, FR-10, FR-12, FR-18 *(sobre la Cita del Día)*, FR-20 *(la superficie portada)*, FR-35 *(las Obras de la portada)*, FR-55 *(los cierres hacia los Directorios)*, FR-8 *(los mismos ocho)*; NFR-12 y NFR-13 en lo que añade; FR-34, FR-37, FR-52 *(sin trabajo)*; SM-4 de la portada, por zonas *(la juzga)*, SM-C1; SM-11 *(la fecha de su despliegue, si llega antes del juicio)*.

**Notas de implementación:**
- **Va al final y depende de las cuatro anteriores:**
  - la Tarjeta de Obra (24);
  - el bloque «Compartir en», la Imagen y la Historia (25);
  - la cabecera, los Directorios, su orden, el Campo y la marca `data-jornada` (26);
  - los destacados (27).

  Depende también del presupuesto de AD-6 construido en la 23. La portada lo comparte con la Página de Cita, y su tope se mide con una Cita del Día que admite Imagen y, encendidas, las donaciones.
- **Se fusiona después del juicio de SM-11, desde el 2026-12-05, o con su fecha declarada** —`DESPLIEGUE_DE_LA_PORTADA_DE_RETORNO`, que `umbrales.ts` ya declara en `undefined` (64b1bf0d) *(v8.2)*—, porque inclina la comparación al revés: quita de la portada el enlace directo a cada Autor, salvo los ocho destacados, y añade Obras. Sin la credencial de Search Console no hay juicio, y va por fecha declarada. Esa fecha depende de lo que decida Héctor sobre si la ventana de SM-11 se reinicia. La 28.5 le da valor el día que llega, también si llega tras el juicio *(v8.2, Héctor, 2026-10-23)*.
- **Las seis Obras rotan aparte de la Cita del Día** (AD-12): la Obra de la Cita del Día puede salir entre ellas, una fijación no las cambia, y la ventana avanza tantos puestos como Obras salen *(v8.2)*.
  - Viven junto a `citaDelDia.ts` y salen de las Obras indexables o, si rige la congelación, del conjunto congelado.
  - Rotan en rondas por Autor, en el orden del Directorio, con la marca `data-jornada` de la 26.
  - Toda comprobación sobre ellas se hace sobre el conjunto del que rotan.
- **La Cita del Día, su Tarjeta y sus acciones son un solo bloque.** No llevan ningún Modelo en medio, van fuera de Pagefind y actúan sobre la canónica de su Página de Cita. La portada no emite la vista de una Cita por ellas.
- **El resto de la portada.**
  - La línea de cifras se cuenta con `esCitaDocumentada`, y no dice «cada una», en ninguna forma, mientras quede censo; con el censo vacío dice «cada una cotejada con el texto de su fuente» *(v8.2)*.
  - El campo es un formulario GET sin guion.
  - La marca de la cabecera es el `h1`, y «Saltar al contenido» lleva a la línea de cifras.
  - La puerta de NFR-5 de la 26 tiene que seguir pasando sin la lista entera de Autores.
- **Una pregunta abierta, que bloquea la 28.2** *(v8.2)*: si la frase de la portada sin ninguna Cita apta se escribe aparte o si `DESCRIPCION_DEL_SITIO` cambia con ella, y con ella la `description` de la portada, el `WebSite`, la bajada de su Tarjeta Social y `rss.xml`. `EXPERIENCE.md` las da por iguales y hoy difieren; la cierra `bmad-ux`.
- **Conviene hacer antes la 21.2:** con 16 aptas, la Cita del Día se repite cada 16 días, y la portada no se puede juzgar.
- **Para fusionar** (lo cierra la 28.5): el CI en verde y `npm run test:e2e` entero, contra un receptor local *(v8.2)*; NFR-7 medido a mano con Lighthouse sobre la portada y una Página de Cita, frente a la principal del mismo día, y si empeora, el merge espera a que Héctor decida *(v8.2, Héctor, 2026-10-23)*. El 404 conserva su Cita del Día sin Tarjeta ni acciones.

## Epic 23: Medir la lectura

Héctor sabe, por superficie y por zona, cuántas cargas se leyeron de verdad —la página estuvo visible ocho segundos o alguien la tocó—, por qué enlace siguió quien leía, cuántas búsquedas se asentaron y en qué tramo de resultados, cuánto se lee cada Obra, se indexe o no, y qué trae cada marca, la de las cuentas propias y la de lo que comparte un visitante, contadas una vez por llegada y quitadas de la dirección. Nada de esto lleva identificador, cookie ni texto libre, y el listón de la Página de Cita no se mueve: el guion de medición sale de la página a un fichero y deja el hueco en línea que necesitan las épicas siguientes. Va primera porque sin ella ninguna otra se puede juzgar: las tasas de §7 pasan a lecturas, y las metas de SM-3…SM-7 esperan a su línea base.

**FRs covered:** FR-56; FR-22 *(cotejo, guardado y recuento de las dos marcas)*, FR-8 *(la consulta sin resultados, registrada al asentarse)*, FR-51 *(la vista de Obra)* *(enmendados)*; NFR-9, NFR-11; SM-8 *(el corte de su serie)*; el instrumento de SM-3…SM-7, SM-12, SM-13, SM-C3 y SM-C5.
**Notas de implementación:** se construye en su propia rama y entra en la principal en un solo merge (23.11), con el CI en verde *(v8.2)*; lo que no hace y las condiciones de fusión están en la Epic List — v8. La excepción es la 23.12, el `rowid` aleatorio del `INSERT` de `medicion/worker.ts`: entra sola en la principal, fuera de la rama, y es la única historia de la épica que lo hace; su fila se añade a mano a `sprint-status.yaml` *(v8.2, Héctor, 2026-10-23)*. **Orden:** la 23.1 primero, porque su fichero y su arranque son el mecanismo de todo lo demás; la 23.4 cuando se quiera, porque no depende de nada; la 23.2 tras la 23.1; la 23.12 entra en la principal antes de la 23.3, por su cuenta, y la rama la trae de ella *(v8.2)*; y la 23.3, acto de Héctor, justo detrás: desde la 23.2 la huella deja `npm test` en rojo en la rama, a propósito (AD-14), hasta que la 23.3 la versiona. Después la 23.5, de la que cuelgan la 23.6–23.9, que van en cualquier orden; la 23.10 lee lo que dejan esas cinco, y la 23.11, de Héctor, cierra la rama. El vocabulario entra entero en la 23.2: una historia posterior que necesite tocarlo vuelve a pasar por la orden de la 23.2 y por la 23.3 antes de seguir. El CI solo corre en la principal —el build, `astro check` y `npm test`, que es Vitest— y no corre Playwright, así que en la rama el build, `astro check`, `npm test` y Playwright local se corren a mano, y antes del merge `npm run test:e2e` entero, con la rama construida con la medición puesta contra un receptor local (`wrangler dev` con D1 local), nunca contra el D1 de producción *(v8.2)*. **Fuera, y a qué épica va:** la vista y la lectura de los Directorios y la zona `directorio` puesta, a la 26; todo `?via=` compuesto y los destinos `facebook`, `threads` e `instagram-historia` ofrecidos, a la 25; los filtros de `busqueda`, a la 27; las zonas `tarjeta-de-obra`, `siguiente` y `misma-obra`, a la 24, y `obras-de-portada`, a la 28.
**Preguntas abiertas:** la cuota de lectura de D1 —5 millones de filas leídas al día en el plan gratuito—, que la espina no nombra, ni qué informa de ella la orden de la 23.10 (`bmad-architecture`) *(v8.2)*.

### Story 23.1: La medición sale a un fichero, y la Página de Cita no pierde su listón

As a Héctor,
I want que el guion de medición salga de la página a un fichero que el build genera y que todo guion externo esté en una lista cerrada con su tope,
So that medir más no mueva el listón de la Página de Cita y las épicas siguientes tengan el hueco en línea que necesitan sin subir el tope a ciegas.

**Acceptance Criteria:**

**Given** `MEDICION_ENDPOINT` definido
**When** se construye el sitio
**Then** el guion de medición es un fichero que genera un endpoint `.js.ts` de `src/pages/` a partir de `src/lib/medicion.ts`, con una URL que cambia con su contenido, y ninguna página lo lleva en línea (AD-6)
**And** el vocabulario y el punto final se importan al componerlo, nunca se copian en `public/` (AD-13)

**Given** `MEDICION_ENDPOINT` sin definir
**When** se construye
**Then** el `getStaticPaths` del endpoint queda vacío: no hay fichero ni etiqueta, y ninguna página emite nada
**And** de la medición quedan en `dist/` el arranque de `__medir`, que va también sin punto final, y el marcado del build —el `data-*` de las vistas y, cuando lleguen, las zonas (23.7) y la marca indexable (23.9)—; no queda ningún fichero ni etiqueta de guion *(v8.2)*. Por el arranque y el `data-*` de las vistas, el `dist/` sin punto final cambia con esta historia —y con la 23.7 y la 23.9, por las zonas y la marca— *(v8.2)*, y los criterios de la Historia 20.1 no se enmiendan: se cumplieron en su entrega, y esta declara su invariante nuevo

**Given** toda superficie de carácter `producto` o `servicio` en `src/lib/superficies.ts` —también `/buscar/`, las páginas 2+, el 404 y la página 1 de una Obra que no se indexa—
**When** se sirve con punto final
**Then** lleva un único `<script src defer>` hacia el guion, del mismo origen y en el `<head>`
**And** `/kit` y `/lote`, ajenas, no lo cargan: quedan fuera de toda serie (NFR-6)

**Given** el arranque en línea de `src/components/Armazon.astro`
**When** se carga cualquier página
**Then** define `__medir` como cola antes de toda isla, y el guion, al cargar, vacía esa cola en orden y la sustituye (AD-13)
**And** toda isla llama `__medir(…)`, nunca `window.__medir && …`, y ninguna define su propio emisor: una prueba sobre `dist/` lo fija en `CopiarCita`, `ImagenDeCita`, `CompartirEnlace` y `/buscar/`
**And** el arranque cuenta en `MAX_BYTES_DE_GUION`
**And** el arranque es solo cola: no lleva memoria ni vocabulario; qué acción es la primera de su métrica lo decide el guion al vaciarla, en su orden (23.5, AD-13) *(v8.2)*

**Given** la declaración de cada superficie en `src/lib/superficies.ts`
**When** se pinta una página
**Then** el conjunto de vistas que emite sale de esa declaración —la quinta consecuencia de AD-17— a un `data-*` de la página, el guion las emite a partir de él, y sin ese `data-*` no emite ninguna
**And** la prop `vista` del armazón y de `src/components/Medicion.astro` desaparece: ninguna página ni componente elige su vista, y la portada no emitirá `vista-de-cita` por ningún componente de Cita que lleve
**And** emiten las mismas vistas que antes de la historia —`vista-de-cita` la Página de Cita y `vista-de-superficie` la portada y la página 1 de Autor, Tema, Colección y Obra indexable—, con su marca de origen, y una prueba sobre `dist/` coteja cada ruta con su declaración

**Given** una página prerenderizada
**When** el navegador la prepara sin mostrarla
**Then** no emite ninguna vista hasta su activación (`document.prerendering`, `prerenderingchange`), y entonces la emite una sola vez

**Given** la lista cerrada de guiones externos de AD-6
**When** se declara
**Then** se abre con tres entradas, cada una con su tope con nombre en `src/lib/umbrales.ts`, fijado en esta historia en un diff visible: el guion de medición, que se carga con la página; `public/islas/imagen.js`, que se pide con `import()` al pulsar, y al cargar solo en `/kit` y `/lote`; y el de Pagefind, al enfocar el campo, al elegir un filtro o al llegar con estado en la dirección
**And** cada tope cuenta todo lo que su entrada importa de forma estática: el del guion de medición, los bytes que descarga al cargar
**And** un `<script src>` o un `import()` de `dist/` que no esté en la lista, o una entrada sin tope, es fallo de prueba (Vitest sobre `dist/`), porque `bytesDeGuionEnLinea` cuenta cero un `<script src>`
**And** ningún guion se sirve desde otro origen: no hay JavaScript de terceros (FR-56)

**Given** el sitio construido con punto final
**When** se mide el guion en línea
**Then** `MAX_BYTES_DE_GUION` se mide en una muestra de cada superficie pública, no solo en la Página de Cita, y ninguna lo pasa (NFR-7)
**And** el parte de la historia dice cuántos bytes quedan libres en la Página de Cita, con Imagen y sin ella: es el hueco en que entran la 25 y la 28, o suben el tope en el mismo diff

**Given** un guion en línea que necesita un dato de contenido —slug, texto u Obra—
**When** se construye
**Then** lo lee de un `data-*` y nunca de `define:vars`: `src/islands/CopiarCita.astro` deja de meter el slug, y el guion de cada isla es idéntico byte a byte en toda página de su familia (AD-6, AD-12)
**And** las dos copias de `CopiarCita` del Kit Diario, la de la Cita del Día y la de su alternativa, siguen vivas sin el slug: cada guion encuentra su botón por `document.currentScript` o por un oyente delegado, nunca por un selector común, y una prueba de Playwright local pulsa la segunda, porque `tests/e2e/kit.spec.ts` solo prueba `.first()` y una segunda instancia muerta pasaría *(v8.2)*
**And** `src/islands/ImagenDelKit.astro`, que también mete el slug por `define:vars` en `/kit` y `/lote`, ajenas, queda como está: lo pasa a `data-*` la 25.4, que toca el Kit, y hasta entonces la prueba la nombra como exención

**Given** una isla en línea que anuncia —Copiar, la Imagen de Cita y la búsqueda de `/buscar/`—
**When** escribe en su región `role="status"`
**Then** lo hace con el texto de una sola función de `src/lib/` para lo que se repite —vaciar la región y escribir en el siguiente fotograma—, derivado en el build con `String(…)` e insertado con `set:html`, nunca por `define:vars` ni copiado a mano (UX-DR99, convención de mensajes de estado)
**And** la región sigue en el marcado desde la carga, vacía y sin `hidden`, como manda `AGENTS.md`
**And** una prueba sobre `dist/` exige ese texto en toda isla en línea que anuncia; el segundo ritmo, el del tecleo, lo añade la 26

**Given** las pruebas que afirmaban la medición en línea o que «la página no descarga ningún fichero de script» —en `tests/unit/medicion.test.ts`, `tests/e2e/pagina-de-cita.spec.ts`, `tests/e2e/portada.spec.ts`, `tests/e2e/pagina-de-autor.spec.ts` y, *(v8.2)* porque su ausencia de guiones pasa en vacío sin `MEDICION_ENDPOINT`, `tests/e2e/pagina-404.spec.ts` (89–96) y `tests/e2e/seo.spec.ts` (107–116)—
**When** se reescriben
**Then** se juzgan contra la lista cerrada y contra un sitio construido con punto final: una prueba de ausencia no prueba nada (AD-6)
**And** responden a los criterios de JavaScript de las Historias 2.1, 3.1 y 4.1, enmendados en su sitio; la 17.4 conserva su criterio y solo cambia su prueba
**And** los espías con `addInitScript` de `compartir-enlace.spec.ts`, `compartir-imagen.spec.ts`, `imagen.spec.ts` y `busqueda.spec.ts`, que el arranque de `__medir`, ahora siempre presente, sobrescribiría, se adaptan (`window.__medir = window.__medir || …` o cambiando el espía) *(v8.2)*

**Given** un despliegue que cambia el guion
**When** un HTML en caché pide el fichero anterior
**Then** esas vistas se pierden hasta 10 minutos (`max-age=600`), y `DESPLIEGUE.md` §3 lo nombra como pérdida aceptada; conservar el guion anterior sigue aplazado

**Given** la lógica del guion —la cola, las vistas y la espera a la activación—
**When** se prueba
**Then** Vitest la ejecuta en el entorno simulado de `tests/unit/medicion.test.ts`, y Playwright local la confirma en un navegador con el receptor Node de `tests/e2e/receptor.spec.ts`, que llama a `interpretar` y guarda en memoria lo que llega, sin `medicion/worker.ts` ni D1; no es el `wrangler dev` con D1 local de la 23.2, que es el de las construcciones de rama *(v8.2)*

### Story 23.2: El receptor sabe guardar lo que la v8 va a medir antes de que nadie lo envíe

As a Héctor,
I want que el vocabulario entero de la v8 llegue de una vez al receptor y a D1, con una orden que aplica la migración, despliega y deja la huella,
So that ningún dato nuevo llegue a nulo sin error y ninguna épica posterior tenga que tocar D1 ni el receptor.

**Acceptance Criteria:**

**Given** el vocabulario de la medición
**When** se separa de la emisión
**Then** vive en un módulo puro de `src/lib/` que solo importa módulos hoja sin importaciones —`destinos.ts`, que da `DESTINOS_VALIDOS`, y `redes.ts`, que da `PARAMETRO_DE_ORIGEN`— y nunca copia sus conjuntos, y de él importan el receptor, el guion de la 23.1, los guiones empaquetados que traigan la 26 y la 27 y `tools/`; `src/lib/medicion.ts` conserva la emisión y la composición del guion (AD-13) *(v8.2)*
**And** una prueba de Vitest lo fija como «solo importa módulos sin importaciones» *(v8.2)*
**And** declara los eventos de siempre y los cuatro nuevos —`lectura`, `salida-interna`, `busqueda` y `vista-de-obra`—, cada campo como conjunto cerrado y los nombres de los parámetros `de` y `via`
**And** los campos son: la zona, con las dieciséis de `EXPERIENCE.md § Zonas de salida interna` (UX-DR111); el tramo, con sus cortes 0, 1–9, 10–29 y 30+ y sus rótulos, que son vocabulario y no umbral; los filtros usados, con las seis combinaciones válidas, porque la Obra nunca va sin su Autor; la marca indexable o no indexable de `vista-de-obra`; `via`, cuyo conjunto es `DESTINOS_VALIDOS`; *(v8.2)* `primera` (sí/no) de `copiado`, `descarga-de-imagen` y las dos comparticiones, con la correspondencia evento → métrica que solo el vocabulario declara —SM-5 junta `copiado` y `descarga-de-imagen`; SM-7, las dos comparticiones—; y el `destino` de `descarga-de-imagen`, con {`opaco`, `instagram-historia`}
**And** `primera` y el destino de la descarga entran ahora porque añadirlos después de que empiece la línea base abriría un corte en ella *(v8.2)*

**Given** `src/lib/destinos.ts`
**When** se parte en dos clases
**Then** los destinos de enlace son `whatsapp`, `telegram`, `x`, `correo`, `facebook` y `threads`, el destino de imagen es `instagram-historia`, y `DESTINOS_VALIDOS` es su unión más `opaco`, sin importaciones (FR-20)
**And** los constructores puros de `facebook` y `threads` entran aquí, en `src/lib/compartir.ts`, con su prueba y sin botón, para que la invariante de `tests/unit/comparticion.test.ts` —todo destino de enlace tiene constructor— se cumpla siempre, también entre la 23 y la 25 (AD-13); sus botones son de la 25.1
**And** el sitio no ofrece todavía `facebook`, `threads` ni `instagram-historia`: el bloque de compartir de hoy se construye idéntico, y lo que se ofrece de ellos es de la 25
**And** `DESTINOS` de `src/lib/compartir.ts`, que hoy es a la vez la tabla de constructores y la lista que pinta `CompartirEnlace.astro`, se parte en dos: los constructores, ya con `facebook` y `threads`, y una lista de ofrecidos aparte, que sigue siendo la de hoy; meterlos en `DESTINOS` los pintaría y rompería `tests/unit/compartir.test.ts` (61–66) y `tests/unit/espinas-de-ux.test.ts` (174–187) *(v8.2)*
**And** la invariante de la línea 82 de `tests/unit/comparticion.test.ts` pasa a «los ofrecidos son subconjunto de los de enlace», escrita sobre la lista de ofrecidos *(v8.2)*; con la 25.1, el criterio de la hoja de la Historia 10.4 —«una compartición a través de la hoja del sistema» registra «el destino como opaco»— queda sustituido, porque con la 25.5 la Historia de Instagram también pasa por la hoja y registra `instagram-historia`; al cerrarse la 25.1 se marca *(sustituido en la v8 por las Historias 23.2 y 25.1)*, como la 3.2 y la 22.4

**Given** los identificadores y los comentarios del módulo
**When** se revisan
**Then** siguen el glosario: Lectura, Salida interna, Zona, Marca de origen y Marca de difusión; `lectura` a secas nombra solo el acto medido, y el tipo de página se dice completo, «superficie de lectura»

**Given** `medicion/migrations/` y `migrations_dir` en `medicion/wrangler.toml`
**When** se escriben las migraciones
**Then** la `0000` es la tabla de producción tal como está —las seis columnas y los dos índices, con `IF NOT EXISTS`— y no hace nada en la base de producción, y la `0001` lleva solo los `ALTER TABLE … ADD COLUMN` de `via`, `zona`, `tramo`, `filtros`, `indexable` y `primera` *(v8.2)* (AD-14)
**And** cada columna nueva es nula fuera de sus eventos; no hay columna genérica ni JSON, y ninguna lleva hora
**And** `medicion/esquema.sql` queda como estado acumulado de referencia, una prueba fija que aplicar las migraciones en orden da sus columnas, y una base nueva se crea solo aplicándolas: `DESPLIEGUE.md` §3 deja de crearla con `--file=esquema.sql`

**Given** el receptor local de las construcciones de rama *(v8.2)*
**When** se monta con esas migraciones
**Then** aplica `medicion/migrations/` a un D1 local (`wrangler d1 migrations apply --local`) y levanta `medicion/worker.ts` con `wrangler dev`, los dos con `wrangler` 4.151.1 en versión exacta y sin `--remote`: nunca toca el D1 de producción
**And** con él, el `webServer` de `playwright.config.ts` —hoy `npm run build && node tests/servidor.mjs`, sin `MEDICION_ENDPOINT`— y la construcción que mide Lighthouse se hacen con `MEDICION_ENDPOINT` apuntando a ese receptor; es el «receptor local (`wrangler dev` con D1 local)» que nombran el Entorno operativo, la 24.6 y las historias de cierre (23.11, 25.7, 26.11, 27.9 y 28.5)
**And** las pruebas de ausencia de guiones de la 23.1 y las que construyen su propio sitio siguen eligiendo su construcción
**And** el receptor Node de `tests/e2e/receptor.spec.ts`, que llama a `interpretar` sin `worker.ts` ni D1, es otra cosa: lo usan las pruebas de comportamiento del guion (23.1, 23.5, 23.9), que leen en memoria lo que llega

**Given** una baliza
**When** la interpreta `medicion/receptor.ts`
**Then** registra los eventos nuevos y coteja cada campo nuevo contra su conjunto, guardándolo solo en sus eventos: `via` en las vistas y la lectura, que es donde el guion lleva las marcas de la llegada; `zona` en `salida-interna`; `tramo` y `filtros` en `busqueda`; `indexable` en `vista-de-obra`; `destino`, además de en las comparticiones, en `descarga-de-imagen` con {`opaco`, `instagram-historia`}; y `primera` en `copiado`, `descarga-de-imagen` y las dos comparticiones *(v8.2)*. `origen` se sigue guardando como hoy
**And** un valor fuera de su conjunto, o un campo fuera de su evento, se descarta sin descartar el evento, y `consulta` sigue siendo exclusiva de `busqueda-sin-resultados` (NFR-11)
**And** `medicion/worker.ts` escribe las columnas nuevas, y el receptor sigue aceptando todo lo que envía el sitio en vivo con el vocabulario de la v7.1, que lo enviará hasta el merge
**And** en cuanto la rama trae la 23.12 de la principal —a más tardar antes de la 23.3—, el `INSERT` que escribe las columnas nuevas conserva su `rowid` aleatorio y su prueba estructural pasa en la rama *(v8.2)*

**Given** la prueba de correspondencia
**When** corre `npm test`
**Then** fija, por evento y por valor, que las claves que emite el guion para cada evento son exactamente las que el vocabulario le declara —un campo que falta pasa una prueba de inclusión—, que cada valor es de su conjunto y que esas claves ⊆ el registro del receptor ⊆ las columnas del esquema: un dato que llega a nulo sin error es indistinguible de un cero (AD-13) *(v8.2)*
**And** donde el nombre de la baliza y el de la columna difieren —`datos` y `consulta`—, la correspondencia se declara y la prueba la usa *(v8.2)*
**And** cubre los eventos y los campos que el guion ya emite, y nombra como pendientes, cada uno con la historia que lo emitirá, los que aún no emite: `lectura` y `primera` (23.5), `via` (23.6), `salida-interna` con `zona` (23.7), `busqueda` con `tramo` y `filtros` (23.8) y `vista-de-obra` con `indexable` (23.9). Cada una de esas historias mete su caso en la prueba y lo saca de pendientes, así que la prueba no pasa en vacío ni deja la rama en rojo más allá de la 23.3, y la lista está vacía cuando la rama entra en la principal (23.11) *(v8.2)*

**Given** la huella del vocabulario desplegado, versionada
**When** corre `npm test`
**Then** falla si no casa con el vocabulario de `src/lib/`, y nombra la diferencia y la orden que la cierra (AD-14)
**And** la huella vive en el repositorio con la ruta y la forma que escribe la orden, que nombran cada evento y cada valor; sin huella versionada, la prueba falla diciéndolo, y la orden no se salta el cotejo en silencio: `desplegar` lo dice, coteja el registro del receptor contra el vocabulario de la principal, que es lo que emite el sitio en vivo, y sigue *(v8.2)*
**And** cambiar los cortes del tramo mueve la huella y añade una entrada a la lista de cortes de serie de la 23.10, con su jornada de despliegue *(v8.2)*
**And** terminada esta historia, la rama queda en rojo por esa prueba hasta que la 23.3 versione la huella nueva: es la forma en que la rama entra en la principal ya con su huella

**Given** `npm run medicion -- desplegar` en `tools/medicion.ts`, con `wrangler` 4.151.1 en versión exacta y `--remote` siempre explícito
**When** se corre
**Then** aplica las migraciones pendientes con `wrangler d1 migrations`, despliega el receptor, le envía una baliza de prueba por cada evento y cada campo nuevos a la ruta `/__comprobacion/`, lee de vuelta que cada campo llegó y, con `CAST(rowid AS TEXT)` de sus filas, que el receptor en vivo inserta con `rowid` aleatorio, las borra, baraja lo ya escrito con un `UPDATE` idempotente y, solo entonces, escribe la huella; no hace commit *(v8.2)*
**And** antes de barajar cuenta las filas que escribirá —unas tres por fila: la fila y sus dos índices— frente a la cuota de escritura de D1 del día; si no caben, no baraja ni escribe la huella, lo dice y sale con 1, y Héctor repite la orden otro día: el barajado no se trocea por jornadas *(v8.2, Héctor, 2026-10-24)*; da los recuentos de antes y de después como `COUNT` por (jornada, evento), sin copiar ninguna fila ni usar `wrangler d1 export` (AD-13) *(v8.2)*
**And** si el receptor no inserta con `rowid` aleatorio, lo dice, no baraja ni escribe la huella y sale con 1; lo baraja el siguiente despliegue que pase la comprobación (AD-13); el barajado se repite en cada despliegue del receptor, y barajar no es migrar: no cambia el esquema (AD-14) *(v8.2)*
**And** se para en el primer fallo, con código 1, y dice qué quedó aplicado: sin baliza vista no hay huella, y nunca reintenta una migración a ciegas, porque `ADD COLUMN` no es idempotente
**And** se niega, con 1 y sin desplegar, si el registro del receptor no cubre el vocabulario de la huella versionada, que es el del sitio en vivo —o, sin huella versionada, el de la principal *(v8.2)*—: por eso la reversión empieza por el sitio
**And** sin sesión de `wrangler` no hace nada, lo dice y sale con 2; una bandera desconocida, también con 2

**Given** `npm run medicion -- comprobar` *(v8.2)*
**When** se corre
**Then** envía las balizas de prueba al receptor en vivo, lee de vuelta cada campo y el `rowid` aleatorio, las borra y coteja lo visto con la huella versionada, sin migrar, desplegar, barajar ni escribir la huella
**And** sale con 1 si no casa con la huella o si el receptor no inserta con `rowid` aleatorio, nombrando la diferencia y que la cierra repetir la 23.3; con 2 sin sesión de `wrangler`
**And** es la que corre la 23.11 el día del merge

**Given** la red
**When** corre la orden
**Then** solo la cáscara de `tools/medicion.ts` invoca `wrangler`, y la parte pura de `tools/lib/` —también el coste del barajado frente a la cuota y la lectura del `rowid` de las balizas *(v8.2)*— se prueba en Vitest con respuestas fijas; ninguna prueba toca el remoto (AD-22)
**And** aplicar en remoto y desplegar el receptor son actos de Héctor (23.3): ningún agente corre `desplegar`, ni `comprobar`, que también escribe y borra en el D1 de producción *(v8.2)*

**Given** `DESPLIEGUE.md` §3
**When** se cierra la historia
**Then** deja de decir «No hay migración» y documenta el orden migración, receptor y sitio, la orden y su baliza, y la reversión: primero el sitio, después el receptor, y las migraciones no se revierten
**And** documenta también el barajado del `rowid` y su coste contra la cuota —si no cabe en la del día, `desplegar` sale con 1 sin barajar y se corre otro día, nunca troceado *(v8.2, Héctor, 2026-10-24)*—, y que se repite en cada despliegue; `comprobar`; que mientras viva la rama de la 23 el receptor no se vuelve a desplegar desde la principal, y que si se hace la huella de la rama queda rancia y la 23.3 se repite; y cómo se recupera D1 —Time Travel, 7 días en el plan gratuito y 30 en el de pago, sobrescribe lo escrito después, y ninguna orden de `tools/` restaura producción— *(v8.2)*
**And** la Historia 2.9 queda ampliada sin enmendarla: el conjunto de eventos sigue siendo cerrado y con nombre, y crece aquí como creció en la 10.4 y la 20.1

### Story 23.3: La migración y el receptor llegan antes que el sitio

As a Héctor,
I want aplicar la migración y desplegar el receptor desde la rama antes de que el sitio emita nada nuevo,
So that el receptor sepa guardar cada dato nuevo el día que el sitio lo envíe, y la rama vuelva a verde con su huella.

**Acceptance Criteria:**

**Given** las Historias 23.2 y 23.12 terminadas —la 23.12 ya en la principal, y la rama al día con ella— y este equipo con sesión de `wrangler` (`cd medicion && npx wrangler@4.151.1 whoami`) *(v8.2, Héctor, 2026-10-23)*, y, la primera vez, sin ninguna huella versionada —es el primer `desplegar`—, que es el caso en que la orden lo dice y coteja el registro del receptor contra el vocabulario de la principal (23.2) *(v8.2)*
**When** Héctor corre `npm run medicion -- desplegar` desde la rama de la épica
**Then** la `0000` y la `0001` quedan aplicadas en remoto, el receptor desplegado e insertando con `rowid` aleatorio, las balizas de prueba vistas y borradas, lo ya escrito barajado —con sus filas contadas antes contra la cuota del día— y la huella escrita *(v8.2)*
**And** Héctor commitea la huella en la rama, nunca en la principal, y ningún agente corre la orden

**Given** la tabla de producción antes de migrar
**When** se compara después
**Then** conserva todas sus filas, la `0000` no cambió nada y las columnas nuevas están a nulo en las filas de antes
**And** los recuentos de antes y de después —los `COUNT` por (jornada, evento) que da la orden al barajar— quedan anotados con fecha en el spec de la historia, y coinciden en toda jornada cerrada; la del día, que el sitio en vivo sigue escribiendo mientras corre la orden, solo puede crecer, y se dice *(v8.2)*

**Given** el sitio en vivo, que sigue en la principal con el vocabulario de la v7.1
**When** se lee la primera jornada cerrada tras el despliegue
**Then** sus eventos siguen llegando como antes: el receptor nuevo no pierde nada de lo que envía el sitio viejo
**And** si dejan de llegar, Héctor vuelve a desplegar desde la principal el receptor de la principal —el de la v7.1, ya con el `rowid` aleatorio de la 23.12 *(v8.2)*; las migraciones no se revierten: sus columnas nuevas admiten nulo— y la rama no sigue hasta saber por qué
**And** esa vuelta atrás deja rancia la huella de la rama —describe un receptor que ya no está—, así que la 23.3 se repite desde la rama antes de seguir; el receptor de la principal conserva el `rowid` aleatorio (23.12), y uno anterior a él volvería a dejar el orden de llegada sin que la huella lo viera: `comprobar` y la comprobación de `desplegar` (23.2) lo dicen, y `desplegar` no baraja *(v8.2)*
**And** fuera de esta vuelta atrás, mientras viva la rama el receptor no se despliega desde la principal *(v8.2)*

**Given** un fallo a mitad de la orden
**When** se para
**Then** lo que quedó aplicado se anota en el spec de la historia *(v8.2)*, no se reintenta sin diagnóstico y la rama no avanza sobre una huella que no se escribió
**And** si lo que la para es la cuota —el barajado no cabe en la de escritura del día—, el diagnóstico es ese: Héctor repite la orden otro día desde la rama, sin trocear el barajado, y la rama sigue en rojo hasta que se escriba la huella *(v8.2, Héctor, 2026-10-24)*

**Given** la huella commiteada en la rama
**When** se corre `npm test`
**Then** la prueba de la huella pasa, y sigue pasando mientras ninguna historia posterior toque el vocabulario

### Story 23.4: El sitio se audita contra WCAG 2.2 AA

As a visitante que navega con teclado, lector de pantalla o el pulgar,
I want que el sitio se audite contra WCAG 2.2 AA antes de que la v8 lo haga crecer,
So that lo que añadan las épicas siguientes se compruebe ya contra el suelo vigente, y no contra uno anterior.

**Acceptance Criteria:**

**Given** el barrido de accesibilidad
**When** pide sus etiquetas a axe
**Then** pide `wcag22aa` además de `wcag2a`, `wcag2aa`, `wcag21a` y `wcag21aa`, y la lista la declara una sola vez `src/lib/superficies.ts`, el dueño del barrido (AD-17, NFR-9, el suelo de UX-DR103)
**And** `tests/e2e/accesibilidad.spec.ts` y `tests/e2e/ingreso-accesible.spec.ts` la importan; ninguna prueba escribe su propia lista

**Given** el mismo commit que añade `wcag22aa`
**When** se revisan las dependencias
**Then** `@axe-core/playwright` y `axe-core` suben a la 4.14.0, y el fichero de bloqueo resuelve esa versión de `axe-core`, que deja de dar `target-size` en enlaces solapados con el mismo destino

**Given** las superficies de `superficiesDelBarrido`, en los perfiles `movil` y `escritorio`
**When** corre el barrido
**Then** no hay ninguna violación, y lo que aparezca en lo construido se corrige en esta historia
**And** ninguna regla se desactiva ni se excluye un nodo para pasar; si corregir algo pide una decisión de diseño, se nombra a Héctor y la historia no se cierra

**Given** los criterios que WCAG 2.2 AA añade
**When** se lee el barrido
**Then** 2.5.8 lo comprueba axe con `target-size` (etiqueta `wcag22aa`); 2.4.11 y 2.5.7, que axe no comprueba, no se dan por comprobados por él y los da por cumplidos la UX; y 3.2.6, 3.3.7 y 3.3.8 no aplican, y la prueba lo dice así *(v8.2)*

**Given** el CI
**When** se cierra la historia
**Then** el barrido es Playwright local, que el CI no corre, y su resultado queda anotado en el spec de la historia para el merge de la 23.11 *(v8.2)*
**And** los criterios de WCAG 2.1 AA de las Historias 2.8 y 12.3 quedan elevados sin enmendarlos, y el reflujo a 320 px sigue siendo de la 26.9

### Story 23.5: Una carga que se lee deja una lectura

As a Héctor,
I want que cada carga que alguien lee de verdad deje una lectura, y que las demás no la dejen,
So that toda tasa del sitio se calcule sobre personas que leyeron y no sobre cargas de máquinas.

**Acceptance Criteria:**

**Given** una superficie que emite vista según su declaración de la 23.1
**When** lleva visible 8 s acumulados —umbral con nombre en `src/lib/umbrales.ts` (AD-9)—, contados con `visibilitychange`
**Then** el guion emite una `lectura`, y como mucho una por carga (FR-56, AD-13)
**And** el tiempo en que la pestaña estuvo oculta no cuenta, y en una página prerenderizada no corre antes de su activación

**Given** la primera `pointerdown`, `keydown`, `wheel` o `touchmove` antes de los 8 s
**When** ocurre
**Then** emite la lectura en ese momento, y ni el tiempo ni otra interacción emiten otra

**Given** solo eventos `scroll` —el desplazamiento que restaura el navegador o el salto a un ancla al llegar con fragmento—
**When** pasa el tiempo sin interacción y sin cumplir los 8 s
**Then** no hay lectura: `scroll` nunca la produce

**Given** una carga en una pestaña que nunca se muestra, o cerrada antes de los 8 s sin interacción
**When** la página se oculta o se descarga
**Then** no emite lectura, tampoco al ocultarse

**Given** una superficie sin vista —las páginas 2+, `/buscar/`, el 404—
**When** se carga
**Then** no emite lectura, y en ella no se calcula continuación

**Given** una página restaurada desde la caché de atrás y adelante (`pageshow` con `persisted`)
**When** vuelve a mostrarse
**Then** es carga nueva para la lectura: puede emitir otra, sin las marcas con que llegó y sin volver a emitir ninguna vista

**Given** una lectura
**When** sale
**Then** lleva solo el evento, la ruta y las marcas de la llegada que coteja la 23.6; ningún identificador, agente de usuario, referente ni hora (NFR-11)
**And** sin JavaScript no se mide nada

**Given** un `copiado`, una `descarga-de-imagen` o una compartición *(v8.2)*
**When** el guion la emite, también al vaciar la cola
**Then** lleva `primera` = sí si es la primera de su métrica en la carga y no en las demás, con la memoria por carga del guion y la correspondencia evento → métrica del vocabulario de la 23.2; toda descarga con destino lleva siempre no y no gasta la primera de SM-5: el primer `copiado` o la primera descarga sin destino de la carga salen con sí aunque vengan después de ella (FR-56, AD-13)
**And** lo decide solo el guion, el único `__medir` en ejecución: ninguna isla decide `primera` ni conoce la correspondencia
**And** una carga nueva, también `pageshow` con `persisted`, empieza de cero
**And** `primera` = no revela cuántas acciones hubo en una carga, nunca cuál ni de quién, y lo aceptó Héctor el 2026-10-20 (NFR-11)

**Given** una acción —`copiado`, `descarga-de-imagen` o una compartición— en una superficie con lectura *(v8.2)*
**When** la lectura de su carga no ha salido —la acción llegó en la cola antes que el guion, o sin `pointerdown` ni `keydown`: un lector de pantalla, la voz, un `element.click()`—
**Then** el guion emite antes la lectura, así que el numerador de SM-5 y SM-7 está siempre dentro de su denominador (AD-13)
**And** la 23.7 aplica la misma regla a la salida interna

**Given** la lógica de la lectura
**When** se prueba
**Then** Vitest, que corre el CI, la ejecuta en el entorno simulado del guion, con tiempo y visibilidad fingidos, también `primera`, con la descarga con destino que no la gasta, y la lectura que precede a una acción sin interacción; y Playwright local comprueba en un navegador, contra el receptor Node de `tests/e2e/receptor.spec.ts` (23.2) *(v8.2)*, la lectura a 8 s, la interacción, `pageshow` y *(v8.2)* la primera acción de cada métrica por carga, también la que llega en la cola, detrás de su lectura, con un clic sin `pointerdown`; el CI no corre Playwright
**And** mete en la prueba de correspondencia de la 23.2 el caso de `lectura` y el de `primera` en `copiado`, `descarga-de-imagen` y las dos comparticiones, y los saca de pendientes *(v8.2)*
**And** es el instrumento de SM-3…SM-7: si la comparación por firma del informe de la 23.10 dice que las lecturas reproducen las firmas mecánicas, Héctor ajusta el umbral en un diff y se repite la línea base; el cambio del tiempo mínimo es una entrada de la lista de cortes de serie, cuyo tramo nuevo empieza la primera jornada UTC completa tras su llegada en vivo *(v8.2)*

### Story 23.6: Las marcas de llegada cuentan una vez y salen de la dirección

As a Héctor,
I want que la marca de mis cuentas y la de lo que comparte un visitante se cuenten aparte, una vez por llegada, y desaparezcan de la dirección,
So that SM-8 y la difusión no cuenten dos veces la misma llegada, ni una recarga o un enlace copiado arrastren la marca.

**Acceptance Criteria:**

**Given** una carga con `?de=`, con `?via=` o con las dos
**When** corre el guion de medición
**Then** las lee antes de emitir la vista, cada una contra su conjunto —las redes de `src/lib/redes.ts` y `DESTINOS_VALIDOS`—, y las guarda aparte; una visita con las dos cuenta en las dos series (FR-22, AD-13)
**And** un valor ajeno no se guarda y el evento se emite igual; con un parámetro repetido se coteja la primera aparición, como hoy

**Given** las marcas leídas
**When** el guion las quita con `history.replaceState`
**Then** lo hace por una sola función pura que quita exactamente `de` y `via`, en todas sus apariciones, y conserva el resto de la cadena en su orden y el fragmento, sin dejar un `?` vacío y sin tocar parámetros de nombre parecido
**And** al reescribir pasa `history.state` tal como estaba, porque `replaceState` con `null` borraría la marca de asentada de la búsqueda (23.8, AD-13) *(v8.2)*
**And** la página no se recarga, y la canónica, `og:url` y `<link rel="canonical">` no cambian: ninguna marca crea una URL indexable (NFR-1) ni cambia lo que ve el visitante, así que el criterio de la Historia 8.2 sigue cierto

**Given** las marcas de una carga
**When** salen sus eventos
**Then** viajan con sus vistas y con su lectura, y se olvidan al emitir la lectura: ningún evento posterior las lleva ni vuelve a leer `location.search`
**And** una llegada con `?via=` cuenta con su lectura y nunca con la sola vista: cerrada antes de la lectura, no cuenta para la difusión (FR-56)
**And** en una superficie sin vista, las marcas se quitan igual y no van con ningún evento

**Given** una recarga tras quitar las marcas, o una página restaurada desde la caché de atrás y adelante
**When** se vuelve a contar
**Then** llega sin marcas: cada marca cuenta una vez por llegada

**Given** el documento
**When** se revisa sobre `dist/`
**Then** el guion de medición va antes que todo guion que escriba la dirección, ninguna isla salvo la búsqueda escribe en el historial y ninguna otra lee `de` ni `via`

**Given** `npm run canal -- anotar` con un enlace que lleva `?via=`
**When** se valida
**Then** se rechaza con código 1, sin escribir, diciendo que `?via=` es la marca de un visitante y no la de una cuenta propia (AD-13)
**And** lo mismo con `npm run canal -- senal … --tipo propia`

**Given** `npm run canal -- senal … --tipo ajena` con un destino que lleva `?via=`
**When** se valida
**Then** se admite y se anota: un tercero puede haber copiado un enlace que compartió un visitante, y rechazarla dejaría sin anotar una señal real
**And** la consulta `npm run canal` la marca «copia un enlace compartido», como ya marca la ajena con `?de=` («copia un enlace del Kit»)
**And** el destino se guarda recortado, sin `?…`, así que la marca va en un campo nuevo de `senales-externas.yml`, al patrón de `marcado`: un booleano opcional que solo se escribe a `true`, y la consulta lo lee de ahí; las dos marcas se cotejan cada una por su lado (FR-22) *(v8.2)*
**And** un `?via=` cuyo destino no está en `DESTINOS_VALIDOS`, o más de un `?via=`, se rechaza con código 1 y sin escribir, como ya se rechaza un `?de=` de una red que no existe *(v8.2, Héctor, 2026-10-23)*
**And** `CODIGOS_DE_SENAL` se repite literal en tres sitios, que `tests/unit/canal.test.ts` (1304–1319) compara: se pone al día en los tres a la vez *(v8.2)*

**Given** SM-8
**When** cambia su instrumento
**Then** sigue contando solo la marca de origen y en vistas; esta historia es una de las causas de su corte, que se compone de la jornada de despliegue de la 23, a la que da valor la 23.11 *(v8.2)*
**And** `?via=` nombra el botón pulsado, nunca a quien comparte ni a quien abre (NFR-11)

**Given** las pruebas
**When** corren
**Then** la función pura y el guion en su entorno simulado van en Vitest, que corre el CI —también que `replaceState` recibe el `history.state` que había *(v8.2)*—, como `tests/unit/canal.test.ts` para el rechazo, para la ajena admitida y *(v8.2)* para el `?via=` ajeno o repetido; quitar las marcas sin recargar, con la canónica intacta, es Playwright local
**And** mete en la prueba de correspondencia de la 23.2 el caso de `via` en las vistas y en la lectura, y lo saca de pendientes *(v8.2)*

### Story 23.7: Cada salida interna dice desde qué zona

As a Héctor,
I want saber por qué enlace siguió quien leía cada superficie,
So that la continuación se mida por zona y cada épica sepa si el enlace que añade retiene.

**Acceptance Criteria:**

**Given** una sola escucha delegada en el guion de medición
**When** se pulsa un enlace interno que sale de la página, con el botón principal, sin modificador y sin `defaultPrevented`
**Then** emite una `salida-interna` con la zona del contenedor más cercano que la declara, atribuida a la ruta donde ocurre (FR-56, AD-13)
**And** como mucho una por carga, y en una superficie con lectura va después de ella: si la lectura no salió —sin `pointerdown` ni `keydown`: un lector de pantalla, la voz, un `element.click()`—, el guion la emite antes de la salida (23.5) *(v8.2)*
**And** una zona fuera del conjunto cerrado no se envía

**Given** un ancla de la misma página, un enlace a la propia ruta, un clic con modificador o con otro botón, un `defaultPrevented` o el envío de un formulario
**When** ocurre
**Then** no es salida ni gasta la de la carga
**And** lo que se abre en pestaña nueva no se mide, y por eso toda continuación es cota inferior (23.10)

**Given** los componentes de enlace compartidos —`TarjetaDeCita`, `Chips`, `Paginacion`, `ListaDeObras`, `RutasDeSalida` y `Atribucion`—
**When** se usan
**Then** la zona es prop obligatoria, del tipo del conjunto cerrado, y `astro check` rompe si una página la omite
**And** la zona va en el contenedor que pinta el build, y lo que inserta el cliente la hereda

**Given** lo ya construido
**When** se pone cada zona según `EXPERIENCE.md § Zonas de salida interna` (UX-DR111)
**Then** llevan zona las once de hoy: `cabecera` (la marca y «Buscar»), `atribucion` (también «de {Autor}» en la Cabecera de Obra), `chip-de-tema`, `colecciones`, `listado`, `paginacion`, `lista-de-obras`, `resultado` en el contenedor de resultados de `/buscar/`, `cita-del-dia` en «Ver esta cita», `rutas-de-salida` y `autores-de-portada` en la lista de Autores de la portada
**And** lo que la tabla no nombra lleva una exención explícita y no registra nada: los Chips de Tema del 404 y las salidas de la búsqueda sin resultados —Temas, Colecciones y Autores destacados—
**And** también, cuando la 27.7 los ponga, los Directorios del aviso de `/buscar/` —el del índice que no carga y el que se pinta hasta que arranca la búsqueda—, fuera del contenedor `resultado`: en él, SM-13 sumaría salidas sin denominador, porque esa búsqueda no se asienta (AD-13; decisión de Héctor, 2026-10-22) *(v8.2)*
**And** esas exenciones son las de la v8, igual que la de los formularios «Buscar en…», el campo de la portada y el del 404: enviar un formulario no es salida (AD-13) y una zona nueva exigiría otra migración de AD-14; se revisan en la pasada de métricas *(v8.2)*

**Given** el sitio construido
**When** corre la prueba sobre `dist/` (Vitest, que corre el CI)
**Then** todo enlace interno de `main` en una superficie con lectura lleva zona o exención explícita, y las anclas de la misma página son una de las exenciones que nombra la prueba *(v8.2)*
**And** la Página de Obra que no se indexa entra en la prueba en cuanto la 23.9 le da vista, sin tocarla

**Given** las páginas 2+, `/buscar/` y el 404
**When** se pulsa un enlace con zona
**Then** emiten su salida sin lectura, y la continuación no se calcula en ellas

**Given** una página restaurada desde la caché de atrás y adelante (`pageshow` con `persisted`), también `/buscar/`
**When** se pulsa un enlace con zona
**Then** es carga nueva para la salida: emite otra `salida-interna`, aunque la carga de antes ya hubiera gastado la suya, y donde hay lectura va después de la nueva lectura (FR-56, AD-13)
**And** es el recorrido de SM-13 en `/buscar/`: pulsar un resultado, volver y pulsar otro deja dos salidas de zona `resultado`

**Given** las pruebas de comportamiento
**When** corren
**Then** la escucha y sus exenciones van en Vitest, en el entorno simulado, también la lectura que se emite antes de una salida sin `pointerdown` ni `keydown` *(v8.2)*; una salida por carga, después de la lectura, con modificadores y anclas, la salida nueva tras restaurar desde la caché de atrás y adelante, también en `/buscar/`, y los resultados de `/buscar/` heredando su zona, son Playwright local
**And** mete en la prueba de correspondencia de la 23.2 el caso de `salida-interna` con `zona`, y lo saca de pendientes *(v8.2)*
**And** es el instrumento de SM-4 y de SM-13

### Story 23.8: Una búsqueda cuenta una vez, cuando se asienta

As a Héctor,
I want que cada búsqueda cuente una vez, cuando quien busca se decide, con cuántos resultados dio y sin su texto,
So that SM-6 y la búsqueda seguida se midan sobre búsquedas y no sobre pulsaciones.

**Acceptance Criteria:**

**Given** la isla de `/buscar/`
**When** un estado de texto y filtros se asienta —al enviar el formulario, al pulsar un resultado o al ocultarse la página—
**Then** emite `busqueda` una vez para ese estado en la carga, con el tramo del total de resultados, no de los que se pintan, y con los filtros «ninguno» hasta la 27 (FR-56, AD-13)
**And** no lleva el texto de la consulta (NFR-11), y lo que viaja es el tramo, nunca el número: los cortes salen del módulo del vocabulario y la isla no los copia

**Given** el tecleo
**When** el campo cambia y se repinta la lista
**Then** no se emite nada por tecla ni por repintado, y escribir y borrar sin asentar no deja registro

**Given** un estado ya emitido en la carga
**When** se vuelve a él y se asienta otra vez
**Then** no se emite de nuevo: como mucho una por estado distinto
**And** un estado sin texto ni filtros no es una búsqueda y no emite nada

**Given** una búsqueda que no pudo correr, porque el índice de Pagefind no cargó
**When** se daría por asentada
**Then** no emite `busqueda` ni `busqueda-sin-resultados`: no es una búsqueda asentada (SM-6), y la 27 extiende la regla a los filtros y al mapa sin cargar

**Given** un estado asentado con texto y sin resultados
**When** se emite su `busqueda` en el tramo 0
**Then** se emite además, una vez, `busqueda-sin-resultados` con la consulta (FR-8), y nunca por tecla
**And** un filtrado sin texto y sin resultados va al tramo 0 y nunca emite `busqueda-sin-resultados`: la regla queda en la parte pura de la medición, lista para la 27

**Given** la página que se oculta
**When** se asienta por ocultarse
**Then** emite el último estado buscado, el de los resultados que se ven
**And** una llegada con `?q=` —desde el campo del 404 o un enlace— busca al cargar y se asienta por lo mismo que las demás, no por llegar

**Given** `/buscar/` restaurada desde la caché de atrás y adelante
**When** vuelve a mostrarse
**Then** es carga nueva para la salida (23.7) —`/buscar/` no emite lectura (23.5)—, pero no para la búsqueda: conserva en memoria los estados ya emitidos y no los repite

**Given** una navegación `back_forward` que no viene de la caché de atrás y adelante, o una recarga *(v8.2)*
**When** `/buscar/` llega a un estado
**Then** lo da por ya registrado y no asienta otra `busqueda` ni otra `busqueda-sin-resultados` (AD-13)
**And** al asentar, la isla escribe en el objeto de estado de su entrada un booleano, con `replaceState` y la misma dirección, que no es identificador ni sale del navegador (NFR-11); en toda llegada a un estado —una carga o un `popstate`— cuenta como ya registrado el que su entrada marca, y Navigation Timing, leído una vez al cargar, queda de respaldo para la entrada sin objeto de estado; sin `PerformanceNavigationTiming`, la carga cuenta como `navigate`
**And** la recarga cuenta como ya registrada; una pestaña restaurada o duplicada que hereda la marca, también; una marca que el navegador rechaza por frecuencia se acepta
**And** la regla la aplica solo la isla: el guion de medición nunca descarta una `busqueda`, y asentar no abre entrada en el historial

**Given** la Historia 3.2
**When** se cierra esta
**Then** sustituye su criterio de emisión —«se emite el evento de búsqueda sin resultados con el texto de la consulta»—, que se marca *(sustituido en la v8 por la Historia 23.8)*; los demás criterios de la 3.2 siguen

**Given** las pruebas
**When** corren
**Then** la decisión de qué emitir ante cada estado y cada disparador va en Vitest, que corre el CI —también la marca de la entrada, el tipo de navegación y su respaldo *(v8.2)*—, y el flujo con el índice real de Pagefind es Playwright local, con *(v8.2)* «texto, resultado, atrás, atrás», con la caché y sin ella, y la recarga
**And** mete en la prueba de correspondencia de la 23.2 el caso de `busqueda` con `tramo` y `filtros`, estos en «ninguno» hasta la 27, y lo saca de pendientes *(v8.2)*
**And** es el instrumento de SM-6 —el tramo 0 entre las asentadas, cuyo numerador no es el registro de FR-8— y, con la zona `resultado` de la 23.7, de SM-13

### Story 23.9: Toda Obra cuenta sus vistas, se indexe o no

As a Héctor,
I want que la página 1 de toda Obra cuente sus vistas y sus lecturas, con la marca de lo que la página declaraba,
So that la Obra se lea también donde el buscador no la ve, sin mezclar las que se indexan con las que no.

**Acceptance Criteria:**

**Given** la declaración de la Página de Obra en `src/lib/superficies.ts`
**When** se sirve su página 1
**Then** emite `vista-de-obra` con su marca indexable o no indexable, se indexe o no (FR-51, FR-56)
**And** la indexable emite además `vista-de-superficie`, como hoy, y son las dos vistas que declara su `data-*` (AD-6); la que no se indexa, solo `vista-de-obra`; las páginas 2+, ninguna

**Given** el sitio construido
**When** corre la prueba sobre `dist/` (Vitest, que corre el CI)
**Then** la marca de cada página 1 de Obra coincide con su `noindex` (AD-17)
**And** la comprobación de `astro:build:done` de AD-17 sobre el `dist/` real la exige también (`integraciones/indexables.ts`), no solo la prueba de Vitest *(v8.2)*
**And** sale de `rutasIndexables` (AD-11), así que sigue a FR-52 y a `CONGELACION_DE_OBRAS` sin recalcularlos: en una copia con la congelación vigente, la Obra que sale del conjunto lleva la marca de no indexable

**Given** la página 1 de una Obra que no se indexa
**When** gana su vista
**Then** gana también su lectura (23.5), y sus enlaces entran en la prueba de zonas de la 23.7

**Given** SM-8
**When** se lee
**Then** `vista-de-obra` no entra, y la `vista-de-superficie` de la Obra indexable sigue contando como hoy

**Given** el sitemap, el `noindex` y el índice de Pagefind
**When** se construye
**Then** no cambian: la historia no crea superficie ni cambia ningún carácter

**Given** la Historia 22.4
**When** se cierra esta
**Then** sustituye su criterio «emite `vista-de-superficie` con su marca de origen, como las demás agregaciones», que se marca *(sustituido en la v8 por la Historia 23.9)*: `vista-de-superficie` sigue siendo «sí y solo si producto», como está construido

**Given** la emisión en un navegador
**When** se prueba
**Then** es Playwright local, contra el receptor Node de `tests/e2e/receptor.spec.ts` (23.2) *(v8.2)*, con una Obra indexable y otra que no
**And** la historia mete en la prueba de correspondencia de la 23.2 el caso de `vista-de-obra` con `indexable`, y lo saca de pendientes *(v8.2)*

### Story 23.10: La línea base se lee desde `tools/`, con la cuota de D1 a la vista

As a Héctor,
I want leer desde este equipo, con una sola orden, lo que la medición registró, por superficie y por zona, con la cuota de D1 a la vista,
So that cada métrica tenga su línea base sin panel ajeno y sepa a tiempo si el receptor se acerca a su techo.

**Acceptance Criteria:**

**Given** sesión de `wrangler`
**When** `npm run medicion`
**Then** lee D1 con `wrangler` 4.151.1 y `--remote`, informa y no escribe nada, ni en D1 ni en el repositorio; no hay punto final de lectura y el receptor sigue contestando 204 a todo lo que no sea `POST` (AD-14)
**And** sin sesión no hace nada, lo dice y sale con 2, igual que con una bandera desconocida; si no puede leer nada, sale con 1

**Given** una consulta que falla
**When** se compone el informe
**Then** esa cifra se omite y sale en `sinLeer` con su motivo; jamás se escribe como cero

**Given** las jornadas
**When** se calculan las tasas
**Then** van sobre jornadas cerradas en UTC, y no cuentan la ruta `/__comprobacion/` de las balizas de prueba ni los registros de las pasadas que escriben a propósito en el D1 de producción —la 25.3 y la 25.7—, que la orden descuenta igual en cada lectura *(v8.2)*
**And** esas pasadas viven en una constante con nombre de `src/lib/umbrales.ts`, una entrada por pasada con su jornada UTC y las rutas que recorrió, que esta historia declara vacía y que anota Héctor el día de cada pasada; `DESPLIEGUE.md` la cita y no la copia, y la orden la lee y no la copia (AD-9) *(v8.2, Héctor, 2026-10-23)*
**And** una prueba de Vitest con respuestas fijas fija que no cuentan los registros de esas rutas en esas jornadas, y sí los de otras rutas de la misma jornada *(v8.2, Héctor, 2026-10-23)*

**Given** todo registro —lecturas, salidas internas y acciones— *(v8.2)*
**When** se reparten
**Then** la superficie de cada registro es la página donde ocurrió, resuelta contra el censo de la medición —`rutasPublicadas` sin el servicio por forma— y la declaración de `src/lib/superficies.ts`, nunca por el prefijo de la ruta (AD-13)
**And** la unidad de agregación es la superficie declarada en `src/lib/superficies.ts`, la portada incluida, nunca la familia; para la línea base, `/autores/` y `/obras/` son una sola superficie, «los Directorios», que junta sus lecturas, y se informan también por separado *(v8.2)*
**And** esa agrupación no la escribe la orden: la lee, de forma genérica, de la superficie de línea base que `superficies.ts` declara para cada superficie —la de los Directorios la declaran la 26.3 y la 26.4—, sin nombrar ninguna ruta, y una prueba de Vitest con respuestas fijas la fija con dos superficies de prueba que declaran la misma *(v8.2)*
**And** lo que no casa —páginas 2+, `/buscar/`, la dirección rota que sirve el 404, una Cita retirada— se cuenta aparte y se nombra, nunca se descarta en silencio; los Directorios entrarán con la 26 sin tocar la orden
**And** la continuación es salidas internas entre lecturas, por superficie y por zona, solo en superficies con lectura, y el informe la declara cota inferior por lo que se abre en pestaña nueva

**Given** la familia Obra
**When** se parte
**Then** todo registro de una ruta de Obra en una jornada —lecturas, salidas y acciones— toma la marca de sus vistas de Obra de esa jornada; si ese día llegan las dos marcas, esa ruta y esa jornada se cuentan aparte, como «cambió», para todos sus registros, y nunca se reparten *(v8.2)*
**And** una ruta de Obra con registros y sin vista de Obra esa jornada va a «sin marca»; la marca nunca se reconstruye desde git

**Given** las marcas
**When** se informan
**Then** SM-8 cuenta las vistas de Cita y de superficie con marca de origen, sin `vista-de-obra`, partida por las entradas de `CORTES_DE_SM8`: cada tramo nuevo empieza la primera jornada UTC completa tras la llegada, la jornada de llegada se informa aparte como «cambió», los tramos no se suman como una sola serie, y sin ninguna entrada llegada el informe lo dice *(v8.2)*; Threads no se lee como personas mientras no conste quién publica sus enlaces
**And** SM-12 cuenta las lecturas con `via` entre las comparticiones de su destino, sin mirar `primera`, con las descargas impuestas de `instagram-historia` en el denominador de ese botón y nunca las de `opaco`; la `comparticion-de-imagen` de la Imagen cuadrada se informa aparte, fuera de todo destino, así que el `opaco` son solo las hojas de «Más opciones…»; y el informe dice que en Chrome para Android la cifra puede quedar por encima de la real *(v8.2)*
**And** Facebook queda fuera de la comparación entre destinos mientras siga apagada la constante que lo incluye

**Given** los cortes de serie *(v8.2)*
**When** se declaran en `src/lib/umbrales.ts`, junto a `PRIMER_DESPLIEGUE_DE_OBRAS`
**Then** son una lista ordenada cuyas entradas dicen su jornada, qué cambió y qué series parten —la llegada en vivo que cambia un instrumento, su reversión, un cambio de los cortes de tramo de `busqueda` y un cambio del tiempo mínimo de la lectura—, y cada jornada sale de las constantes de despliegue de AD-9, filtrando las que no llegaron, nunca de un literal (AD-9, AD-13)
**And** esta historia declara sin valor la jornada de despliegue de la 23, con la forma de `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS` (`string | undefined = undefined`), y `CORTES_DE_SM8` como proyección de la lista sobre SM-8, con dos entradas: la de la 23 y `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS`; nadie escribe una fecha en la lista: Héctor da valor a la constante (23.11, 26.11), y ningún agente se lo da
**And** la orden parte cada serie solo por las entradas que la nombran, sin elegir ninguna ni suponer cuántas hay, y admite dos en la misma jornada con distinto motivo
**And** la jornada de despliegue de la 23 no entra en `desplieguesQueMuevenSm11` de `tools/lib/indexacion.ts`: la línea SM-11 nombra solo la reparación, la 24 con la 26 y la 28, y la jornada de la 23 solo parte las series de la medición; una prueba de `tests/unit/indexacion.test.ts` lo fija
**And** una prueba de Vitest, con respuestas fijas, fija que dos cortes dan tres tramos que no se suman entre sí, que la jornada de llegada no entra en ninguno, que una constante sin valor no corta y que la lista va en orden

**Given** el «hoy» de `tools/` frente a una constante de despliegue *(v8.2)*
**When** se compara —en esta orden, en `lineasDeSm11` de `tools/lib/indexacion.ts` y en toda comparación de `tools/` con una jornada de despliegue—
**Then** se compone en UTC, como las jornadas con que se compara (AD-9); hoy `lineasDeSm11` lo compone con `getFullYear`, `getMonth` y `getDate`, que son locales, para decidir «Toca juzgar SM-11» frente a una jornada UTC
**And** una prueba de `tests/unit/indexacion.test.ts`, con un instante cerca de la medianoche en que la jornada local y la UTC difieren, lo fija

**Given** Facebook en la comparación de SM-12
**When** se declara
**Then** lo decide una constante con nombre de `src/lib/umbrales.ts`, `SM12_CON_FACEBOOK`, que esta historia declara apagada (`false`): la cambia Héctor en la 25.7, en un diff visible, si la matriz dice que `?via=` sobrevive al clic de una tarjeta de Facebook, y ningún agente la enciende (AD-9, SM-12)
**And** la orden la lee y no la copia, y una prueba de Vitest fija la comparación en los dos estados

**Given** las búsquedas
**When** se informan
**Then** salen las asentadas por tramo y por filtros, SM-6 como tramo 0 entre asentadas y SM-13 como salidas de zona `resultado` entre asentadas, y las consultas sin resultados como hasta ahora (FR-8)
**And** el informe declara SM-13 cota inferior, como la continuación: un resultado abierto en pestaña nueva no se mide (FR-56)
**And** SM-6 y SM-13 no se comparan por firma —la búsqueda asentada no lleva tiempo mínimo ni marca, y `/buscar/` no emite vista— y el informe lo dice junto a sus cifras; su línea base se cierra con el mínimo de búsquedas asentadas *(v8.2)*

**Given** SM-5, SM-7, SM-C3 y SM-C5
**When** se calculan
**Then** van sobre las lecturas de las Páginas de Cita resueltas contra el censo de la medición, nunca por el prefijo `/cita/`; su numerador son las lecturas con acción —las acciones con `primera` = sí: en SM-5, copiado y descarga sin destino juntos; en SM-7, las comparticiones—, y ninguna descarga con destino entra; lo de la portada y la Obra se informa aparte; SM-7 se declara cota inferior en Chrome para Android; SM-C3 es SM-5 leída junto a SM-7, y SM-C5, la continuación de la Página de Cita junto a SM-5 *(v8.2)*
**And** da también SM-3 como 1 − la continuación de la Página de Cita, y cada tasa con su denominador *(v8.2)*
**And** ninguna cifra se compara con las metas en suspenso de SM-3…SM-7 —65 %, 1,8, 3 %, 15 % y 2 %—

**Given** una línea base cerrada *(v8.2)*
**When** se informa después
**Then** la orden da por ventanas —bloques de jornadas cerradas consecutivas, contados desde el cierre de la línea base y sin solaparse, que reúnen cada uno el mismo mínimo que la cerró— SM-5, SM-7, la continuación de la Página de Cita y, cerradas, las demás tasas que una historia de cierre juzga «contra su propia serie» —la continuación de los Directorios (26.11), la de la portada por zona (28.5) y SM-6 y SM-13 (27.9), estas con el mínimo de búsquedas asentadas; una tasa nueva que se juzgue así entra en esta lista por su historia—, con la misma definición de ventana y cada una frente a su línea base *(v8.2, Héctor, 2026-10-23)*
**And** dice en cada ventana si SM-7 sube y SM-5 baja (SM-C3) y si la continuación de la Página de Cita sube y SM-5 baja (SM-C5), y que una de las dos «salta» cuando ocurre en dos ventanas seguidas; basta la dirección, sin umbral de magnitud, y saltar no apaga nada
**And** si la épica que se juzga llegó en vivo antes de esa línea base, las ventanas se cuentan desde la primera jornada UTC completa tras su llegada —la jornada de su constante de despliegue de `umbrales.ts`, que la orden lee y no copia (AD-9); la de llegada se informa aparte, como «cambió»— y frente a la serie propia de antes, y lo dice *(v8.2)*
**And** una prueba de Vitest con respuestas fijas fija las ventanas, la dirección, las dos seguidas y las contadas tras una llegada anterior a la línea base, sin la jornada de llegada *(v8.2)*

**Given** el informe de cada línea base *(v8.2)*
**When** se compone
**Then** da la razón lectura/vista de cada firma mecánica frente a la del resto: Threads, el par ruta-jornada con exactamente dos vistas con su marca y una sin ella; ráfaga, la jornada en que 100 rutas de Cita o más —umbral con nombre en `umbrales.ts`— reciben una sola vista cada una (FR-56)
**And** dice «cerrada» al reunir el mínimo y nunca «buena»: la da por buena Héctor, que mira la comparación antes de fijar ninguna meta y antes de juzgar contra ella la 24, la 25, la 26 o la 28; si las razones se parecen, ajusta el tiempo mínimo (23.5)
**And** que la miró y da por buena una línea base lo anota Héctor en `DESPLIEGUE.md` §3, con fecha y métrica, junto a las consultas de la línea base; es acto suyo, y ningún agente lo anota *(v8.2, Héctor, 2026-10-23)*
**And** una prueba de Vitest con respuestas fijas fija las dos firmas

**Given** `MIN_LECTURAS_DE_LINEA_BASE` en `src/lib/umbrales.ts`
**When** se declara
**Then** se declara sin valor, como `CONGELACION_DE_OBRAS`, y ningún agente se lo da (AD-9)
**And** la línea base de cada métrica empieza en la primera jornada UTC completa tras la llegada en vivo que la hace medible —la de llegada se informa aparte, como «cambió»— y se cierra al reunir ese mínimo de lecturas de su superficie —de búsquedas asentadas en SM-6 y SM-13—, con los Directorios como una sola superficie, no un número de días *(v8.2)*; sin valor declarado, el informe dice «sin mínimo declarado» y nunca da una línea base por cerrada

**Given** la cuota de D1
**When** se informa
**Then** da las filas escritas del día según la plataforma frente a las 100.000 del plan gratuito y el tamaño de la base frente a 500 MB, con las dos cuotas con nombre y no como literal, y recuerda que al pasarlas las escrituras fallan en silencio hasta las 00:00 UTC

**Given** el código de la orden
**When** se prueba
**Then** la agregación, la resolución contra el censo y la línea base viven en `tools/lib/`, puros y probados en Vitest con respuestas fijas; solo la cáscara invoca `wrangler` (AD-22)
**And** solo lee recuentos por jornada, ruta, evento y campo: no reconstruye sesiones ni recorridos (NFR-11)
**And** ninguna consulta ordena por `rowid` ni lo lee desde JavaScript, y una prueba estructural de Vitest fija que ningún SQL de `tools/` nombra `rowid` salvo la comprobación (`CAST(rowid AS TEXT)`) de `desplegar` y `comprobar` y el `UPDATE` que baraja en `desplegar` (23.2); estrecha la de la 23.12, que solo prohibía ordenar por él (AD-13) *(v8.2)*
**And** ningún módulo de `src/` lee nada de esto, y el aviso diario de `publicar.yml` sigue diciendo «no medible» (AD-21, sin trabajo)
**And** `DESPLIEGUE.md` §3 documenta la orden junto a las consultas que ya tiene, cita la constante de las pasadas que escriben en producción y es donde Héctor anota que da por buena una línea base *(v8.2, Héctor, 2026-10-23)*

### Story 23.11: La lectura se mide en vivo y su línea base empieza a contar

As a Héctor,
I want comprobar la rama en local, fijar el mínimo de lecturas, revisar el plan de Cloudflare y fusionar,
So that la lectura empiece a medirse en vivo con su línea base contando y el corte de SM-8 compuesto de la jornada de su llegada *(v8.2)*.

**Acceptance Criteria:**

**Given** el CI de la principal en verde —la reparación de la publicación llegó en vivo el 2026-10-19— y el `rowid` aleatorio ya en ella (23.12) *(v8.2)*
**When** se plantea el merge
**Then** puede hacerse; si la principal sigue en rojo, la rama espera

**Given** la rama con las Historias 23.1–23.10 y la huella de la 23.3, al día con la principal, que trae la 23.12 *(v8.2)*
**When** se corren a mano, porque el CI solo corre en la principal y no corre Playwright
**Then** `npm run build`, `astro check` y `npm test` pasan, también la prueba de la huella y la estructural del `rowid` *(v8.2)*
**And** `npm run test:e2e` pasa entero en la rama, construida con la medición puesta contra un receptor local (`wrangler dev` con D1 local, el de la 23.2), y entre sus pruebas de Playwright local están la lectura a 8 s y `pageshow`, la primera acción de cada métrica por carga detrás de su lectura, las marcas quitadas, una salida por carga y después de la lectura, la salida nueva tras restaurar, la búsqueda asentada y la ya asentada al volver sin caché y al recargar, la vista de Obra y el barrido WCAG 2.2 AA en los dos perfiles; el resultado queda anotado en el spec de la historia *(v8.2)*

**Given** una Página de Cita con la medición puesta contra un receptor local o un punto final ficticio, nunca el de producción *(v8.2)*
**When** se mide a mano con Lighthouse en perfil móvil 4G, con todo lo de la épica puesto y sin puerta automática
**Then** el contenido principal sigue visible en menos de 2,5 s (NFR-7), medida el mismo día y con el mismo perfil sobre la principal, y las dos cifras quedan anotadas en el spec *(v8.2)*
**And** la principal se mide construida y servida igual, en local y con la medición contra un receptor local o un punto final ficticio: nunca se mide el sitio en vivo, cuyo guion de medición escribiría en el D1 de producción *(v8.2)*
**And** si pasa de 2,5 s o empeora frente a la principal, el merge espera a que Héctor decida *(v8.2, Héctor, 2026-10-23)*

**Given** `MIN_LECTURAS_DE_LINEA_BASE`
**When** Héctor le da valor
**Then** lo hace en un diff visible, antes de leer la primera línea base; ningún agente lo elige

**Given** el plan contratado de Cloudflare
**When** Héctor lo revisa
**Then** queda anotado en `DESPLIEGUE.md` §3 *(v8.2)* y, si no es el gratuito, las cuotas con nombre de la 23.10 se ponen al día en un diff

**Given** el día del merge *(v8.2)*
**When** Héctor corre desde la rama `npm run medicion -- comprobar` (23.2)
**Then** el receptor desplegado casa con la huella de la rama y sigue insertando con `rowid` aleatorio
**And** si no casa —el receptor se volvió a desplegar desde la principal—, se repite la 23.3 antes de fusionar

**Given** todo lo anterior
**When** Héctor fusiona
**Then** la rama entra en la principal en un solo merge, que despliega

**Given** ese despliegue
**When** llega al sitio en vivo
**Then** Héctor da valor en `umbrales.ts`, en un commit aparte del día en que llega, a la jornada de despliegue de la 23 que declaró la 23.10: la jornada UTC en que termina el trabajo «Desplegar» de Actions, no la del merge (AD-9) *(v8.2)*
**And** de ella se compone la primera entrada de `CORTES_DE_SM8`, que cubre todas las causas de la épica —la vista desde el fichero diferido, la espera a la activación y la marca contada una vez por llegada—, y su tramo nuevo empieza la jornada siguiente; nadie escribe una fecha en la lista (AD-13) *(v8.2)*

**Given** la primera jornada UTC completa tras la llegada, ya cerrada *(v8.2)*
**When** Héctor corre `npm run medicion`
**Then** las filas escritas frente a la cuota —la v8 pasa de un evento por carga a unos tres, unas nueve filas escritas con sus índices— y el tamaño de la base quedan anotados con fecha en `DESPLIEGUE.md` §3 *(v8.2)*
**And** cada evento nuevo sale con sus filas o nombrado sin ellas, y la línea base de cada métrica empieza a contar desde la primera jornada UTC completa tras la llegada *(v8.2)*

**Given** esta historia
**When** se cierra
**Then** el merge, el mínimo, el valor de la jornada de despliegue de la 23 —de la que sale el corte— y la revisión del plan son actos de Héctor, igual que dar por buena la comparación por firma cuando se cierre la línea base (23.10); un agente puede correr las pruebas locales y Lighthouse contra un receptor local y anotarlas, nunca fusionar *(v8.2)*

### Story 23.12: El orden de llegada no reconstruye a nadie

As a Héctor,
I want que el receptor guarde cada fila con un `rowid` aleatorio antes de que el sitio emita nada nuevo,
So that el orden de las filas no devuelva el recorrido de una persona, ni el de antes de la v8 ni el de después *(v8.2, Héctor, 2026-10-23)*.

**Acceptance Criteria:**

**Given** `medicion/worker.ts` en la principal
**When** inserta una baliza
**Then** el `INSERT` lleva `rowid` aleatorio (`INSERT INTO eventos (rowid, …) VALUES (abs(random()), …)`), sin migración, sin columnas nuevas y sin tocar la huella ni el vocabulario (AD-13, AD-14)
**And** un `rowid` repetido pierde ese evento, como un almacén caído, y se acepta: lo recoge el mismo `catch` que ya pierde el evento en silencio, y el receptor sigue contestando 204
**And** `medicion/receptor.ts` no cambia: el receptor sigue aceptando lo mismo que hoy y guardando las mismas columnas

**Given** toda consulta de `tools/` a D1
**When** lee la tabla `eventos`
**Then** no ordena por `rowid` ni lo lee desde JavaScript, que lo redondea: si hace falta, `CAST(rowid AS TEXT)` (AD-13)

**Given** lo ya escrito en la base de producción, en el orden de llegada
**When** entra esta historia
**Then** no lo toca: barajarlo no es migrar, sino un paso idempotente de la orden que despliega el receptor, `npm run medicion -- desplegar` (23.2), que corre después de comprobar con su baliza que el receptor en vivo inserta con `rowid` aleatorio, cuenta antes las filas que escribirá frente a la cuota del día y se repite en cada despliegue del receptor (AD-13, AD-14)
**And** el primer barajado lo corre Héctor en la 23.3, con el receptor que ya lleva esta historia

**Given** las pruebas
**When** corren en Vitest, que corre el CI
**Then** una prueba estructural fija que el `INSERT` del adaptador lleva el `rowid` aleatorio
**And** otra fija que ningún SQL de `tools/` ordena por `rowid`; hoy ninguno lo nombra, y la 23.10 la estrecha a que solo lo nombren la comprobación de `desplegar` y `comprobar` y el barajado de `desplegar` (23.2)
**And** no hay prueba de Playwright local: el cambio no toca `dist/` ni ninguna página, y lo comprueba en vivo la baliza de la 23.3

**Given** la historia
**When** se cierra
**Then** entra en la principal sola, antes de la 23.3 y fuera de la rama de la 23, con el CI en verde: es una de las dos excepciones declaradas a la fusión por épica, con la 24.2, y no lleva vocabulario ni huella
**And** no se despliega: ningún flujo de Actions despliega el receptor, y el receptor que la lleva lo despliega Héctor en la 23.3, desde la rama, que la trae de la principal; así toda vuelta atrás o redespliegue del receptor desde la principal la conserva
**And** la fusiona Héctor; un agente nunca fusiona
**And** su fila se añade a mano a `sprint-status.yaml`, que no se regenera

## Epic 24: La Obra se ve y la Cita sigue

Quien lee una Cita ve justo debajo de qué obra sale: el título, el Autor, el año si sus Citas coinciden y cuántas tiene. De un toque pasa a la siguiente en el orden del libro, o a la obra entera y a dónde leerla. Al pie encuentra hasta tres Citas más de esa obra y cuatro del mismo Autor sacadas de otras, y la Cita no deja la primera pantalla. Los listados de Autor, Tema y Colección dicen de qué obra es cada Cita. La Página de Obra lista las suyas en el orden del libro y salta a «Dónde leer esta obra». Todo se compone en el build, sin guion y sin enlace comercial, y una Cita nueva no refecha las demás Páginas de Cita de su Autor.

**FRs covered:** FR-12 *(reescrito)*; FR-4, FR-6, FR-26 *(la Tarjeta de Cita con Obra)*, FR-35 *(Tarjeta de Obra y salto, en los dos estados)*, FR-38, FR-47, FR-51 *(orden del libro y salto)* *(enmendados)*; NFR-2, NFR-3, NFR-12 y NFR-13 en lo que añade; FR-42 *(heredado)*; SM-3, SM-4 de la Página de Cita y SM-C5 *(la juzgan)*; SM-11 *(la fecha del despliegue conjunto con la 26)*.

**Notas de implementación:** la 24.1 va primero, porque construye el cargador de posiciones y el orden del libro que leen la 24.5 y la 24.6. La 24.2 y la 24.7 no dependen de nada dentro de la épica, aunque la 24.6 mide el peso de `dist/` con la línea de la 24.2, y la 24.3 y la 24.4 necesitan las zonas de la 23.7. La 24.2 entra sola en la principal en cuanto Héctor dé los valores del aviso y del tope, como excepción declarada a la fusión por épica, y la rama de la 24 con la 26 la recibe de la principal *(v8.2, Héctor, 2026-10-23)*. Esos dos valores son un acto de Héctor a mitad de cadena, del que cuelgan la 24.6, la 24.8 y toda la 26, y se piden antes de abrir la rama 24+26 *(v8.2)*. La 24.8 es la última historia de la épica, y en la rama que comparte con la 26 va antes que la 26.1: sin la relación por campos, el lote de claves de orden refecharía todo el sitio. La 24 y la 26 entran en la principal en un solo merge, con el CI en verde y, sobre la rama conjunta, `npm run test:e2e` entero, con el barrido 2.2 y el reflujo a 320 px de la 26.9 *(v8.2)*. Lo cierra la 26.11, que mide NFR-7 con lo de las dos épicas puesto y, si empeora, deja el merge a la espera de que Héctor decida *(v8.2, Héctor, 2026-10-23)*. Hasta que exista la 26.9, el reflujo de lo que construye la 24 se mira a mano, y la 26.11 da valor a `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS` *(v8.2)*. Quedan fuera: «Compartir en» y la retirada de «Compartir la cita» (25.1), compartir la Página de Obra (25.6), «Buscar en esta obra», «Buscar en {Autor}» y «Buscar en este tema» (27.8), `data-pagefind-sort` (27.1), la Tarjeta de Obra sobre la Cita del Día (28.2), la vista de Obra (23.9) y los Directorios y la clave de orden en la relación de AD-27 (26). El resto, en la Épica 24 de la Epic List — v8.
**Preguntas abiertas:** la ventana de SM-11 con que se juzga el despliegue conjunto con la 26 (Héctor, antes del 2026-12-05; PRD §14); los valores del aviso y del tope del peso de `dist/` y el del tope del número de PNG, que Héctor fija en un diff, y este último puede quedar sin valor (24.2) *(v8.2)*. *(v8.2: sale la letra de AD-9 y del Entorno operativo sobre `astro:build:done`, que la espina v8.2 alineó con el paso final tras Pagefind.)*

### Story 24.1: La Página de Obra lista sus Citas en el orden del libro

As a visitante que lee juntas las Citas de una obra,
I want encontrarlas en el orden en que aparecen en el libro,
So that recorrer la Página de Obra se parezca a hojear la obra y no a leer un índice alfabético.

**Acceptance Criteria:**

**Given** `src/content.config.ts`, que la v8 toca por primera vez en esta historia
**When** se migra
**Then** toma `z` de `astro/zod`, como ya hace `src/lib/admision.ts`, y deja de importarlo de `astro:content` (decisión de Héctor, 2026-10-19)
**And** las colecciones admiten y rechazan lo mismo que antes: `tests/unit/puerta-de-admision.test.ts` y `astro check` pasan sin tocarlos

**Given** una colección nueva de posiciones en `content.config.ts`, con un cargador que sigue el patrón del de biografías
**When** carga
**Then** lee las Citas con el mismo lector que el cotejo (`leerCitas` de `tools/lib/corpus.ts`) y los documentos con `leerDocumentosDeFuente`
**And** casa cada Cita con su conjunto de documentos por `documentosDeCita` de `tools/lib/cotejo.ts`: por prefijo y sin biografías (AD-23)
**And** localiza con una sola función de `tools/lib/cotejo.ts`, el `indexOf` sobre las formas de `colapsarEspacios`, y `apareceEnDocumento` pasa a usar esa misma función: no hay un segundo localizador
**And** esa composición vive en `tools/lib/` y `content.config.ts` solo la cablea. Por eso la prueba de la 22.3 en `tests/unit/obras.test.ts` (nada de `src/` fuera de `obras.ts` y `admision.ts` lee `procedencia.obra`) sigue pasando sin añadir permitidos
**And** no pide nada a la red (AD-22)

**Given** lo que guarda el cargador
**When** se lee
**Then** es `{slug → [{documento, posición}]}`, con el `slug` del frontmatter, nunca el id de la entrada ni el nombre del fichero
**And** guarda una entrada por cada documento del conjunto en que aparece el texto, sin ordenarlas, sin elegir ninguna y sin guardar el texto (AD-23)
**And** una Cita del censo de `corpus/pendientes-de-cotejo.yml`, que no tiene documento, no tiene entradas
**And** ningún fichero de Cita guarda su posición

**Given** las posiciones
**When** `src/lib/obras.ts` ordena las Citas de una Obra
**Then** las recibe por parámetro (AD-5) y es el único módulo que ordena: por la posición de cada Cita en su documento, documento a documento, y al final, por slug, las Citas sin documento (AD-23, AD-25)
**And** entre Fuentes de la Obra va primero la que más Citas aporta y, a igualdad, la de menor identificador
**And** dentro de una Fuente, los documentos van por el orden natural del slug de página, con los números romanos leídos: «ii» antes que «x», «2» antes que «10»
**And** una Cita que aparece en varios documentos toma la posición del primero en ese orden; a igual documento y posición, decide el slug
**And** es el mismo orden para una Obra indexable, una con `noindex` y una congelada

**Given** el índice de subpáginas de la Fuente
**When** se construye esta historia
**Then** no se captura: queda aplazado hasta la primera Obra que salga desordenada, y no hay detector
**And** el orden natural lo fija una prueba de Vitest hecha con slugs de página reales del Corpus

**Given** la Página de Obra (`src/pages/obra/[autor]/[slug]/[...page].astro`)
**When** compone su listado
**Then** toma el orden de `obras.ts` y deja de ordenar por slug en su `getStaticPaths`. Esto sustituye el criterio UX-DR40 de la Historia 22.4, «ordenado como la Página de Autor» (FR-51, UX-DR112)
**And** el orden vale en todas sus páginas: la página 2 empieza por la Cita 51 del libro, y los datos estructurados enumeran las Citas en ese mismo orden (UX-DR109)
**And** ninguna línea ni subrótulo dice cuál es el orden, y las Tarjetas siguen sin Autor ni título de Obra (UX-DR95)

**Given** las dos pruebas que pide AD-23
**When** corren en Vitest
**Then** la primera exige que el orden del libro no dependa del orden en que el cargador o `documentosDeCita` entregan documentos y apariciones: si se permutan, sale el mismo orden. El orden de `documentosDeCita`, que pone el nombre corto delante para los fallos del cotejo, no significa nada fuera del cotejo
**And** la segunda, sobre el Corpus real y sin construir, exige que alguna Obra documentada de varias Citas salga en un orden distinto del de slug

**Given** la dirección de dependencias del paradigma v8, que esta historia estrena al usar `tools/lib/` desde `content.config.ts`
**When** corre la suite de Vitest
**Then** una prueba fija que ningún módulo de `src/lib/` importa de `tools/lib/`

**Given** que el cargador es el segundo lector de `corpus/fuentes/` en cada construcción, con unos 1.421 documentos y unos 159 MB, desde que la reparación retiró 160 (8e834217) *(v8.2)*
**When** se cierra la historia
**Then** se ha medido, sobre el Corpus real, cuánto tarda `npm run build` antes y después, y la cifra queda anotada en el spec, porque construir ya tarda 15 min 24 s en CI (2026-10-19), con la Tarjeta Social entera dentro *(v8.2)*
**And** el corte de 10 minutos es la espera de `deploy-pages`, que depende del peso y del número de ficheros que mide la 24.2, no del build *(v8.2)*
**And** al comparar el HTML de `dist/` de antes con el de después, construidos en la misma jornada, solo cambian rutas `/obra/…`; los ficheros de `dist/pagefind/` cambian también, porque el orden nuevo cambia los fragmentos y el índice *(v8.2)*

### Story 24.2: El build avisa antes de que `dist/` llegue al techo del alojamiento

As a Héctor,
I want que cada construcción mida lo que se va a desplegar y me avise con margen,
So that una sesión de siembra no tumbe el despliegue de GitHub Pages (1 GB por sitio, corte a los 10 minutos) sin haberlo visto venir.

**Acceptance Criteria:**

**Given** `src/lib/umbrales.ts`
**When** se declara
**Then** lleva con nombre un aviso y un tope del peso de `dist/`, los dos por debajo de 1 GB y el aviso por debajo del tope, y una prueba de Vitest fija esa relación (AD-9)
**And** los valores los fija Héctor en un diff visible. Antes, el agente los propone con estos datos: 485 MiB según `du` el 2026-10-16, 445 MiB en bytes, que es lo que mide el paso final, unos 95–100 KB por cada Cita nueva y el techo hacia las 9.500–10.000 Citas *(v8.2)*
**And** es un acto de Héctor a mitad de cadena: de él cuelgan la 24.6, la 24.8 y toda la 26, así que los valores se piden antes de abrir la rama 24+26 *(v8.2)*
**And** no se escribe ningún valor por omisión, y la historia no se cierra sin los dos. El tope del número de PNG, abajo, va aparte y puede quedar sin valor *(v8.2)*

**Given** una comprobación como paso final de `npm run build`, detrás de Pagefind (`astro build && pagefind --site dist … &&` la comprobación), que es la orden con que construye el despliegue
**When** termina cada construcción
**Then** mide el `dist/` que se despliega, `dist/pagefind/` incluido (bytes y número de ficheros), y escribe una línea con las dos cifras (AD-9; decisión de Héctor, 2026-10-19)
**And** el veredicto no depende de la jornada: mide `dist/` sin los ficheros que rotan con ella —la portada, el 404, `/kit`, `/lote` y `rss.xml`—, que mide e informa aparte, y la función pura recibe la medida ya sin ellos (AD-9, AD-12) *(v8.2)*
**And** dice cuánto de ese peso son las Tarjetas Sociales (`/tarjeta/`), que es lo primero que se mira contra el techo (AD-16)
**And** cuenta el número de PNG de `dist/` y lo informa. Su tope con nombre (AD-16) se declara sin valor, porque lo fija Héctor en un diff, y mientras no lo tenga el paso informa sin avisar; con valor, avisa al pasarlo y no rompe *(v8.2)*
**And** el número de ficheros se informa, sin aviso ni tope. Cloudflare Pages corta a 20.000, así que mudarse de alojamiento se decide con esa cifra delante
**And** la línea de cifras no es un aviso: avisa solo lo que cruza un umbral *(v8.2)*

**Given** un `dist/` que pasa el aviso sin llegar al tope
**When** termina la construcción
**Then** avisa con el peso, el aviso y el tope, y no rompe
**And** el aviso no decide nada: qué se hace cuando salta lo decide Héctor

**Given** un `dist/` que pasa el tope
**When** termina la construcción
**Then** `npm run build` sale con error nombrando el peso, el tope y la constante que lo declara, antes de que el despliegue falle al publicar

**Given** la decisión, con sus tres casos (por debajo, entre aviso y tope, y por encima)
**When** se prueba
**Then** es una función pura, probada en Vitest en los tres casos y en los dos bordes
**And** otra prueba de Vitest fija que la medida que recibe llega ya sin los ficheros que rotan con la jornada, así que dos jornadas dan el mismo veredicto (AD-9, AD-12) *(v8.2)*
**And** la decisión del número de PNG también es una función pura, probada en Vitest: sin valor, informa y no avisa; con valor, no avisa por debajo ni en el borde, y al pasarlo avisa sin romper (AD-16) *(v8.2)*
**And** en Vitest, un `npm run build` de prueba, con Pagefind, y el tope rebajado en una copia temporal, nunca en el árbol, sale con error y su mensaje

**Given** esta historia terminada
**When** se construye el sitio
**Then** ningún fichero de `dist/` cambia
**And** el tope de HTML de la Página de Cita sigue aplazado: se crea si Héctor lo decide, al degradarse la medición a mano de NFR-7 en una historia de cierre —para esta épica, la 26.11— o para vigilar ese peso *(v8.2, Héctor, 2026-10-23)*

**Given** la historia, con los dos valores del peso ya en `umbrales.ts`
**When** se fusiona
**Then** entra sola en la principal, en cuanto los tenga, como excepción declarada a la fusión por épica: no cambia ningún fichero de `dist/` y vigila el peso desde ya, mientras la principal crece con cada siembra *(v8.2, Héctor, 2026-10-23)*
**And** entra con el CI en verde, y fusionarla es acto de Héctor *(v8.2)*
**And** la rama de la 24 con la 26 la recibe de la principal, y los valores se revisan igual tras la 24.6, que vuelve a medir *(v8.2, Héctor, 2026-10-23)*

### Story 24.3: Cada Cita de un listado dice de qué obra es

As a visitante que recorre un listado de Tema, de Autor o de Colección,
I want ver bajo cada Cita de qué obra sale,
So that elija cuál abrir sabiendo de dónde viene, sin entrar en cada una.

**Acceptance Criteria:**

**Given** la Historia 23.7 terminada
**When** empieza esta historia
**Then** la Tarjeta de Cita ya lleva su zona `listado`, y la prueba de la 23.7 sobre `dist/` (zona o exención en todo enlace interno de `main`) sigue pasando con lo que añade esta

**Given** `TarjetaDeCita.astro`, la única Tarjeta de Cita (AD-19)
**When** se usa
**Then** cada uso declara qué atribución pinta: Autor y Obra, solo la Obra, o ninguna. Es un conjunto cerrado y sin valor por omisión, y `astro check` rechaza el uso que no la declare
**And** con ese conjunto se cubren también «Más de {Autor}» (solo la Obra) y «De la misma obra» (ninguna)
**And** no hay un segundo componente ni un tamaño compacto (UX-DR70)

**Given** el listado de Tema o de Colección
**When** se sirve, en todas sus páginas
**Then** cada Tarjeta lleva el fragmento, el Autor y, debajo, el título de su Obra (FR-6, FR-26)

**Given** el listado de Autor
**When** se sirve, en todas sus páginas
**Then** cada Tarjeta lleva el fragmento y el título de su Obra, sin el Autor (FR-4)

**Given** el Listado de Obra
**When** se sirve
**Then** las Tarjetas van sin Autor ni título de la Obra, que ya están en su Cabecera (FR-51)

**Given** una Cita sin Obra (4 el 2026-10-18)
**When** aparece en cualquier listado
**Then** su Tarjeta no lleva línea de Obra, ni hueco, ni «Sin obra documentada»

**Given** la línea de Obra
**When** se pinta
**Then** es el título de su Ficha de Obra, `cita.obra.titulo` (AD-25), y nunca se lee de la Procedencia: la prueba de la 22.3 sigue pasando
**And** va en Inter, en `{typography.caption}` y `{colors.on-surface-variant}`, sin versalitas, a `{spacing.unit}` bajo el fragmento y bajo el Autor si lo lleva (UX-DR70, UX-DR104)
**And** es texto y nunca un segundo enlace: toda la tarjeta lleva a su Página de Cita, con su zona de toque de 44 px como mínimo, y al pasar el cursor el fondo pasa a `{colors.surface-container-low}`, sin sombra
**And** el título no se recorta ni lleva puntos suspensivos: si es largo, ocupa más líneas (NFR-12). El fragmento de la Cita se sigue acotando como hoy
**And** entre el fragmento, el Autor y la Obra que lleve suena un «, » solo para lectores de pantalla, sin ninguna palabra más, para que el nombre de la tarjeta siga siendo su texto visible en su orden (UX-DR70, UX-DR101, WCAG 2.5.3) *(v8.2)*

**Given** una Obra con `noindex`, o la familia congelada
**When** sus Citas aparecen en un listado
**Then** su título va igual: ni la indexabilidad ni la congelación alcanzan a la navegación (AD-25)

**Given** una construcción de prueba con una Cita con Obra y otra sin ella en cada uno de los cuatro listados
**When** corre Vitest sobre su `dist/`
**Then** cada Tarjeta lleva exactamente lo que dice su contexto, con un «, » solo para lectores de pantalla entre cada parte y la siguiente, y ninguno al final ni en una Tarjeta que solo lleva el fragmento *(v8.2)*
**And** cada Tarjeta tiene exactamente un enlace, a su Página de Cita

### Story 24.4: Bajo la Cita, la obra de la que sale

As a visitante que acaba de leer una Cita,
I want ver justo debajo de qué obra sale y llegar a ella de un toque,
So that una frase suelta me lleve al libro del que viene y a dónde leerlo.

**Acceptance Criteria:**

**Given** la Historia 23.7 terminada
**When** empieza esta historia
**Then** la zona `tarjeta-de-obra` existe en el vocabulario, y la prueba de la 23.7 sobre `dist/` sigue pasando con el enlace nuevo

**Given** una Página de Cita cuya Cita procede de una Obra
**When** se sirve
**Then** lleva la Tarjeta de Obra detrás de la Línea de la Fuente (o de la Atribución, si no hay Fuente) y antes de Copiar. Es un componente único, `TarjetaDeObra.astro`, y va en el HTML inicial, sin guion (FR-12, UX-DR64, NFR-2)
**And** no la incluye `BloqueDeCita.astro`, que la portada comparte, así que la portada y el 404 no cambian
**And** no es la Tarjeta Social de la Obra (`/tarjeta/obra/…png`), que AD-16 llama también así

**Given** la tarjeta
**When** se pinta
**Then** es plana y en tinta: a 4 × `{spacing.unit}` de lo de arriba, con filete superior `{colors.outline-variant}` a lo ancho y 3 × `{spacing.unit}` de aire, sin fondo, radio ni siena
**And** su rótulo es «De la obra», el Rótulo de sección, en `h2`. El componente recibe el nivel del encabezado, porque en la portada será `h3` (UX-DR101)
**And** el título de la ficha (`cita.obra.titulo`) va a `{spacing.unit}`, en Inter al cuerpo de `{typography.body-lg}`, con peso 600 y en `{colors.on-surface}`. No enlaza, reparte sus líneas equilibradas y parte palabras antes que desbordar (UX-DR104, NFR-12)

**Given** la línea de hechos de la tarjeta
**When** se pinta
**Then** va a `{spacing.unit}` del título y dice «{Autor} · {año} · {n} citas» («1 cita» en singular), en `{typography.caption}` y `{colors.on-surface-variant}`, sin enlaces
**And** los puntos medios llevan `aria-hidden`, y el lector de pantalla oye una coma en su lugar
**And** el año es el de la Obra resuelta: solo si las Citas que lo declaran coinciden, y nunca el de una traducción (FR-42, AD-25)
**And** si el año discrepa o no consta, se omite sin hueco, sin separador de sobra y sin «Sin año documentado» (UX-DR108)
**And** el recuento sale de la Obra resuelta que expone `publicado.ts`, nunca se cuenta en el componente (AD-11)

**Given** la fila que lleva a la Obra
**When** se pinta
**Then** es una Fila de bloque a 2 × `{spacing.unit}`, en `{typography.body-md}` y `{colors.on-surface}`, sin subrayado, con un alto mínimo de `{components.tap-target-min}` y filete encima y debajo (UX-DR105)
**And** dice «Ver la obra y dónde leerla ›» si alguna Cita de la Obra está cotejada, y «Ver la obra ›» si ninguna lo está (7 Obras el 2026-10-18) (UX-DR108)
**And** lleva a la página 1 de su Obra, en la misma pestaña, también cuando la Obra no se indexa. Su zona es `tarjeta-de-obra`, y el glifo «›» lleva `aria-hidden` (UX-DR106, UX-DR107, UX-DR111)
**And** la Fila de bloque se escribe una sola vez, con el trato que ya tiene la Lista de Obras, y la reutilizan las filas que vienen después

**Given** una Cita sin Obra
**When** se sirve
**Then** no hay tarjeta ni hueco, y Copiar queda donde está hoy (UX-DR108)

**Given** las acciones
**When** se pintan
**Then** Copiar va a 4 × `{spacing.unit}` bajo la tarjeta (o bajo la Atribución y la Línea de la Fuente, si no hay Obra) e Imagen a 2 × `{spacing.unit}`. Cada una va en su línea y a su ancho, en todas las anchuras (UX-DR66, UX-DR63)
**And** «Compartir la cita» sigue como está hasta la 25.1

**Given** la tarjeta, frente a Pagefind y a los Modelos de Ingreso
**When** se construye
**Then** va dentro de `data-pagefind-ignore="all"` y no lleva ningún `data-ingreso` (AD-11, AD-20)
**And** una pareja de construcciones en Vitest, una con la afiliación apagada y otra encendida, con una tienda de prueba y ediciones declaradas en una Obra con edición cotejada y en otra sin ella, exige que el subárbol de la tarjeta sea igual byte a byte. «Y dónde leerla» depende de la edición cotejada, nunca de las ediciones en venta (FR-35, UX-DR110)
**And** con `CONGELACION_DE_OBRAS` declarada en una copia temporal, nunca en el árbol, la tarjeta sigue igual (AD-25)

**Given** el orden de tabulación de la Página de Cita
**When** se recorre con el teclado
**Then** va así: el Autor, el título de la Obra y la Fuente; la tarjeta; Copiar, Imagen y «Compartir la cita»; las rutas de salida (UX-DR63)
**And** es la enmienda de la Historia 2.8 en sus dos criterios, que se aplica en el texto de la 2.8: el orden de tabulación, y las zonas de toque. Las Filas de bloque apiladas se tocan sin los 8 px, porque el filete las separa (UX-DR102)
**And** esta historia cambia la prueba de la 2.8 en `tests/e2e/accesibilidad.spec.ts`, «en la Página de Cita el orden es contenido, acciones y después salidas», para que coloque la tarjeta entre el contenido y las acciones (Playwright local)

**Given** la primera pantalla de 360 × 640
**When** se mide sobre lo construido (Playwright local)
**Then** el texto de la Cita sigue empezando en ella (FR-1)
**And** Copiar queda justo debajo, que es la deuda aceptada que vigila SM-C5

**Given** el barrido de accesibilidad y móvil (Playwright local)
**When** corre
**Then** incluye Páginas de Cita derivadas del Corpus, nunca fijadas a mano: con Obra de varias Citas, sin Obra, de una Obra sin cotejar y con un título de Obra largo
**And** ese título parte palabras a 320 px sin desplazamiento horizontal. Hasta que exista la 26.9, el reflujo se mira a mano

**Given** el `dist/` de una construcción de prueba
**When** corre Vitest
**Then** toda Página de Cita con Obra tiene una tarjeta, y ninguna Página de Cita sin Obra la tiene
**And** «Ver la obra…» lleva a una página que existe en ese `dist/`

### Story 24.5: De una Cita a la siguiente del libro

As a visitante que quiere seguir leyendo esa obra,
I want pasar de un toque a la Cita que sigue en el libro,
So that pueda leer una obra Cita a Cita sin volver al listado.

**Acceptance Criteria:**

**Given** las Historias 24.1 y 24.4 terminadas
**When** empieza esta historia
**Then** `obras.ts` da el orden del libro y la Tarjeta de Obra tiene la fila de la Obra, encima de la cual va «Siguiente»

**Given** una Cita cuya Obra tiene dos Citas o más
**When** se sirve su página
**Then** la primera fila de la Tarjeta de Obra es «Siguiente cita de esta obra ›». Lleva a la Cita que sigue a esta en el orden del libro de `obras.ts`, el mismo del Listado de Obra, y desde la última, a la primera (FR-12, AD-25, UX-DR65)
**And** en una Obra de dos Citas, cada una lleva a la otra

**Given** una Cita cuya Obra tiene una sola Cita
**When** se sirve su página
**Then** si hay a dónde ir, la fila dice «Siguiente cita sobre {tema} ›», con el nombre del Tema en minúscula tras «sobre» («Siguiente cita sobre la vida ›»). Lo compone `src/lib/`, no la plantilla (UX-DR107)
**And** el Tema es el primero publicado de la Cita, en el orden en que la Cita los declara (`temasDeLaCita`). Un Tema por debajo de `MIN_CITAS_POR_TEMA` no cuenta (UX-DR109)
**And** lleva a la primera Cita de otro Autor que le sigue en el listado de ese Tema. El listado se lee de `citasDeTema` de `publicado.ts`, el mismo dueño que pinta la Página de Tema (AD-11)
**And** si detrás no queda ninguna de otro Autor, lleva a la primera del listado que lo sea. Nunca lleva a otra Cita del mismo Autor

**Given** una Obra de una sola Cita, sin Tema publicado o cuyo Tema no tiene Citas de otro Autor
**When** se sirve su página
**Then** no hay «Siguiente»: la tarjeta lleva solo la fila de la Obra, sin hueco (UX-DR108)

**Given** la fila «Siguiente…»
**When** se pinta
**Then** es una Fila de bloque en tinta y sin subrayado, que abre en la misma pestaña. Va con filete encima de la primera fila y debajo de cada una (UX-DR105, UX-DR106)
**And** lleva la zona `siguiente`, más concreta que la `tarjeta-de-obra` que la contiene (UX-DR111)
**And** en el orden de tabulación, «Siguiente» va antes que «Ver la obra» (UX-DR63)

**Given** la prueba «las zonas de toque miden 44px con 8px de separación» de `tests/e2e/accesibilidad.spec.ts` (Playwright local)
**When** encuentra «Siguiente» y la fila de la Obra apiladas, separadas solo por el filete
**Then** exime de los 8 px a las Filas de bloque apiladas, como ya exime las filas de `.hermanas`, por UX-DR102 *(v8.2)*
**And** la exención se escribe por el componente de la Fila de bloque, no por su ruta, y sigue exigiendo que no se solapen *(v8.2)*

**Given** cómo se compone
**When** se construye
**Then** sale del build: es determinista, no lleva guion y no guarda nada del visitante. No hay «seguir donde lo dejaste» ni nada en el almacenamiento del navegador (UX-DR65)
**And** sale igual en una Obra con `noindex` o con la familia congelada

**Given** el `dist/` de una construcción de prueba
**When** corre Vitest
**Then** en una Obra de n Citas, seguir «Siguiente» desde cualquiera de ellas recorre las n en el orden del Listado de Obra y vuelve a la de partida en n saltos
**And** en una Obra de una Cita, lleva a una Página de Cita que existe, de otro Autor de su primer Tema publicado
**And** los dos casos sin «Siguiente» no tienen la fila

**Given** la tarjeta con sus dos filas
**When** se mide a 360 px sobre lo construido (Playwright local)
**Then** mide unos 240 px, y la cifra se anota en el spec (UX-DR64) *(v8.2)*
**And** el texto de la Cita sigue empezando en la primera pantalla de 360 × 640

### Story 24.6: Al pie, más de la misma obra y más del Autor

As a visitante que llega al pie de una Cita,
I want encontrar más Citas de esa obra y otras del mismo Autor sacadas de otras obras,
So that tenga a dónde seguir sin que se me repita lo que acabo de leer.

**Acceptance Criteria:**

**Given** las Historias 24.1, 24.2, 24.3 y 24.5 terminadas
**When** empieza esta historia
**Then** hay orden del libro, la línea del peso de `dist/` con que se mide al cerrar, una Tarjeta de Cita que declara su atribución y un «Siguiente» que dejar fuera

**Given** las rutas de salida (`RutasDeSalida.astro`)
**When** se pintan
**Then** van tras las acciones y en este orden: «De la misma obra», «Más de {Autor}» y «Temas», cada grupo con su Rótulo de sección en `h2` (FR-12, UX-DR67, UX-DR101)
**And** el conjunto abre a 8 × `{spacing.unit}` en móvil y a 12 × en escritorio, con filete superior `{colors.outline-variant}` y 3 × `{spacing.unit}` de aire. Del rótulo a su contenido hay 2 × `{spacing.unit}`, y entre grupos, 4 ×
**And** cada lista lleva filete superior y Tarjetas de Cita, y cierra con una última Fila de bloque en `{typography.body-md}` y `{colors.on-surface}`. Las Citas hermanas de lo construido se retiran (UX-DR112)

**Given** una Cita cuya Obra tiene Citas que ofrecer
**When** se compone «De la misma obra»
**Then** ofrece hasta tres Tarjetas de Cita; ese tres es un recuento con nombre en `umbrales.ts`, junto a `MAX_CITAS_RELACIONADAS` (AD-9)
**And** no ofrece la Cita que se lee ni la siguiente
**And** las reparte a pasos iguales sobre el orden del libro, con el mismo reparto que ya usa `citasRelacionadas`, sin escribir una segunda función de reparto, y las muestra en el orden del libro (UX-DR68)
**And** las Tarjetas van sin Autor ni título de Obra
**And** cierra con «Las {n} citas de {título} ›» hacia la página 1 de la Obra, con la zona `misma-obra`

**Given** una Cita sin Obra, de una Obra de dos Citas (87 Obras el 2026-10-18), o a la que, quitadas la actual y la siguiente, no le queda ninguna
**When** se sirve
**Then** «De la misma obra» no existe: ni rótulo, ni cierre, ni hueco (UX-DR108)

**Given** «Más de {Autor}»
**When** se compone
**Then** ofrece hasta `MAX_CITAS_RELACIONADAS` (4) Tarjetas de Cita del Autor, sin las de la misma Obra, sin la que se lee y sin la siguiente (UX-DR69)
**And** van sin el Autor y con el título de su Obra, como texto; la que no tiene Obra va sin esa línea
**And** las elige `citasRelacionadas` de `publicado.ts`, determinista por commit y nunca por la jornada (AD-11)
**And** cierra con «Las {n} citas de {Autor} ›» hacia la página 1 del Autor, con la zona `rutas-de-salida`
**And** si la Cita no tiene Obra, elige entre todas las demás Citas del Autor; si no queda ninguna que ofrecer, el bloque no existe

**Given** los Temas
**When** se pintan
**Then** son Chips de Tema de los Temas publicados de la Cita, con su zona `chip-de-tema`
**And** una Cita sin Tema publicado no tiene bloque de Temas (UX-DR108)

**Given** una Cita a la que no le queda ningún grupo: sin «De la misma obra», sin «Más de {Autor}» y sin Tema publicado
**When** se sirve
**Then** no se pinta ningún respaldo: «Explorar por tema», con los Temas del sitio, y «Seguir leyendo», hacia el Autor, se retiran de `RutasDeSalida.astro` con la prop `temasDelSitio`, y el conjunto no deja filete ni hueco (UX-DR108; decisión de Héctor, 2026-10-19)
**And** la página no queda sin enlaces internos, porque la Atribución ya enlaza al Autor (UX-DR67): lo sigue comprobando sobre `main` la prueba de la 2.6 «ninguna Página de Cita publicada queda sin enlaces salientes» (`tests/e2e/rutas-de-salida.spec.ts`, Playwright local)

**Given** las cifras de los dos cierres
**When** se componen
**Then** salen de `publicado.ts` (la Obra resuelta y las Citas del Autor), nunca se cuentan en el componente (AD-11)

**Given** las rutas de salida, frente a Pagefind
**When** se construye
**Then** van dentro de `data-pagefind-ignore="all"`. Hoy llevan `data-pagefind-ignore` sin valor, y Pagefind recoge los filtros y metadatos que hay dentro (AD-11, AD-19)
**And** una prueba de Vitest sobre `dist/` exige que toda Tarjeta de Cita y la Tarjeta de Obra de una Página de Cita tengan un ancestro con `data-pagefind-ignore="all"`
**And** en Playwright local, buscar el fragmento de una Cita devuelve su Página de Cita y no las que la enlazan (FR-12, NFR-13)

**Given** el `dist/` de una construcción de prueba
**When** corre Vitest
**Then** ninguna Página de Cita enumera más de siete Tarjetas de Cita (AD-19)
**And** ninguna repite la que se lee ni la siguiente, y «Más de {Autor}» no trae ninguna de la misma Obra

**Given** los criterios de la Historia 2.6 «hasta cuatro Citas más del mismo Autor» y «deriva de Autor y de Tema, sin motor de recomendación»
**When** se cierra esta historia
**Then** quedan sustituidos por estos, y con ellos las comprobaciones de `tests/e2e/rutas-de-salida.spec.ts` (Playwright local) sobre `.hermanas` y sobre la sección «Seguir leyendo»
**And** «tiene al menos uno» y «ninguno apunta a una página que no existe» siguen siendo ciertos, y sus pruebas se quedan

**Given** la prueba «las zonas de toque miden 44px con 8px de separación» de `tests/e2e/accesibilidad.spec.ts` (Playwright local)
**When** encuentra Tarjetas de Cita apiladas, y la Fila de bloque que cierra su lista, separadas solo por el filete
**Then** extiende a ellas la exención de las Filas de bloque de la 24.5, por UX-DR102: las Filas de bloque apiladas se tocan *(v8.2)*
**And** esa exención sustituye a la de `.hermanas`, que sale de la prueba con las Citas hermanas que esta historia retira *(v8.2)*
**And** la exención se escribe por su componente, no por su ruta, y sigue exigiendo que no se solapen *(v8.2)*

**Given** la Página de Cita con todo puesto: la Tarjeta de Obra, «Siguiente», las siete Tarjetas y la medición puesta contra un receptor local o un punto final ficticio, nunca el de producción *(v8.2)*
**When** se cierra la historia
**Then** NFR-7 está medido a mano con Lighthouse en perfil móvil 4G y anotado en el spec, junto a la medida de la principal del mismo día, sin puerta automática *(v8.2)*
**And** la principal se mide construida y servida igual, en local y con la medición contra un receptor local o un punto final ficticio: nunca se mide el sitio en vivo, cuyo guion de medición escribiría en el D1 de producción *(v8.2)*
**And** la consecuencia sobre el merge no es de esta historia: la pone la 26.11, que vuelve a medir con lo de las dos épicas puesto *(v8.2, Héctor, 2026-10-23)*
**And** está medido, y anotado en el spec, cuánto crece la página a 360 px (de unos 1.500 a unos 2.780 px), todo después de las acciones, y cuánto pesa `dist/` antes y después según la línea de la 24.2
**And** con esa medida, el spec anota la proyección hacia el techo —KB por Cita nueva y Citas hasta el techo— frente a la de la 24.2 (95–100 KB, 9.500–10.000 Citas). Se le da a Héctor, que revisa los valores de la 24.2, ya en la principal, y si los cambia lo hace en un diff *(v8.2, Héctor, 2026-10-23)*
**And** el barrido de accesibilidad (Playwright local) incluye una Página de Cita con los dos bloques, una sin «De la misma obra» y otra sin «Más de {Autor}»

### Story 24.7: La Obra salta a dónde leerla

As a visitante que llega a una Página de Obra queriendo leerla entera,
I want saltar desde arriba a «Dónde leer esta obra»,
So that no tenga que recorrer todas sus Citas para encontrar la edición.

**Acceptance Criteria:**

**Given** la página 1 de cualquier Obra, se indexe o no y con la familia congelada o no
**When** se sirve
**Then** su Cabecera de Obra lleva, a 3 × `{spacing.unit}` de «de {Autor} · {año}» y en su propia línea, el salto «Dónde leer esta obra ↓» (FR-51, UX-DR96, UX-DR109)
**And** va en `{typography.body-md}` y `{colors.primary}`, subrayado siempre, hacia `#donde-leer-esta-obra` y en la misma pestaña (UX-DR105, UX-DR106)
**And** la flecha lleva `aria-hidden`, así que su nombre accesible es «Dónde leer esta obra»
**And** no lleva zona: es un ancla de la misma página, que está exenta (AD-13)

**Given** las páginas 2 y siguientes de una Obra
**When** se sirven
**Then** no llevan salto, porque no tienen ese bloque (UX-DR109)

**Given** el destino del salto
**When** se construye
**Then** el `h2` «Dónde leer esta obra» lleva `tabindex="-1"` y un `scroll-margin-top` de 2 × `{spacing.unit}` (UX-DR100)
**And** al activar el salto con Intro, el foco queda en ese `h2`, con el anillo global (Playwright local)
**And** el bloque no se mueve: sigue al pie, detrás del listado, su paginación y los Temas (FR-54)

**Given** la zona de toque del salto
**When** se mide a 360 y a 320 px (Playwright local)
**Then** mide 44 px, queda a 8 px de la zona de «de {Autor}» y no la toca (UX-DR102)

**Given** el pie de la página 1
**When** se pinta
**Then** de la paginación, o de la última tarjeta, a «Temas» hay 5 × `{spacing.unit}`. Ese hueco lo ocupará «Compartir en» con la 25.6, y no se le reserva sitio (UX-DR95)
**And** de «Temas» a «Dónde leer esta obra» hay 4 ×, del `h2` a su primer rótulo 2 × y del rótulo a sus líneas 1 ×; la Nota queda a 4 × por encima de su filete y a 3 × por debajo
**And** no se reserva hueco para «Buscar en esta obra», que llega con la 27.8

**Given** la afiliación apagada y encendida
**When** se construyen las dos (Vitest; vale la misma pareja de construcciones que en la 24.4)
**Then** el salto y su `h2` de destino salen idénticos byte a byte (FR-35, UX-DR110)
**And** lo único que difiere en la página vive dentro del `data-ingreso` de «Ediciones en venta»
**And** es lo que dice UX-DR96 desde la UX v8.2: el salto y su destino se construyen idénticos con la afiliación encendida o apagada, como FR-35, y la página no, porque encendida lleva «Ediciones en venta» (decisión de Héctor, 2026-10-19) *(v8.2)*

**Given** la primera pantalla de 360 × 640, con el salto puesto
**When** se mide sobre lo construido (Playwright local)
**Then** la primera Cita del listado sigue empezando en ella (UX-DR95)

**Given** el `dist/` de una construcción de prueba
**When** corre Vitest
**Then** toda página 1 de Obra lleva exactamente un salto, y su destino es un `id` de esa misma página
**And** ninguna página 2+ lo lleva

### Story 24.8: Una Cita nueva no refecha las demás Páginas de Cita

As a Héctor,
I want que cada commit feche y avise solo lo que cambió de verdad,
So that el sitemap y el aviso sigan diciendo la verdad, y una sesión de siembra no refeche las 308 Páginas de Cita de Unamuno (2026-10-17).

**Acceptance Criteria:**

**Given** las Historias 24.1 y 24.3 a 24.7 terminadas
**When** empieza esta historia
**Then** la Página de Cita ya pinta toda su navegación, y los listados el título de cada Obra

**Given** la relación `relacionDeSuperficies` de `tools/lib/cambios.ts`
**When** se reescribe
**Then** relaciona cada superficie con los ficheros y los campos que pinta. Un commit fecha y avisa una superficie solo si cambió alguno de esos campos (AD-27)
**And** el mecanismo lo decide el código, y la relación conserva un dueño y dos lecturas: la fecha del sitemap y `rutasAvisadasPor` de `tools/lib/avisar.ts`

**Given** la Página de Cita
**When** se fecha
**Then** cambia de fecha si cambia algo de lo que afirma de su Cita: el texto, la atribución, la Procedencia, la Fuente, el título de su Obra o sus Temas. También si cambian los campos de su Autor que pinta: hoy, el nombre y los años de sus datos estructurados (FR-47)
**And** la navegación se pinta y no fecha ni avisa: la Tarjeta de Obra con el año y el recuento de la Obra, «Siguiente», «De la misma obra», «Más de {Autor}», sus recuentos y el año del `isPartOf` (NFR-3). Es la excepción que declaró Héctor el 2026-10-17

**Given** los campos que solo pinta otra superficie
**When** un commit los toca
**Then** la semblanza fecha solo la Página de Autor, y `nota` y `ediciones`, solo la Página de Obra
**And** `distintaDe` no fecha ninguna superficie
**And** `aptaParaPortada`, o cualquier otro campo que la Página de Cita no pinte, no fecha ninguna Página de Cita

**Given** los listados de Tema, Colección y Autor
**When** se fechan
**Then** cuentan también con la ficha de Obra de cada una de sus Citas, porque sus Tarjetas pintan su título desde la 24.3. La Página de Autor lo pinta además en su Lista de Obras desde la 17.3, y hoy su relación no la incluye
**And** retitular una Obra fecha y avisa su página, sus Páginas de Cita y los listados que la nombran (FR-47)

**Given** la Página de Obra
**When** se fecha
**Then** se compone de su ficha, sus Citas, el fichero de su Autor y sus documentos, casados como en el cotejo (`documentosDeCita`)
**And** el commit que añade una página a una Obra paginada fecha la Obra, porque puede reordenar su listado (24.1). Para eso, el aviso observa también `corpus/fuentes/`, como familia de fichero `documento`, que no es familia de superficie ni de ruta (AD-27) *(v8.2)*
**And** es el `lastmod` de la Obra que fija AD-27, que manda por precedencia hasta que `bmad-prd` alinee FR-51

**Given** una baja: una Cita retirada a `corpus/_revision/`, una ficha retirada o un Autor retirado
**When** se fecha
**Then** cada superficie que la baja componía en la relación de antes toma la fecha del commit que la sacó. Así el `lastmod` dice lo mismo que el aviso cuando un recuento baja

**Given** las pruebas de Vitest, sin repositorio, en `tests/unit/fecha-de-cambio.test.ts` y `tests/unit/indexnow.test.ts`
**When** corren
**Then** una Cita nueva no mueve la fecha de ninguna otra Página de Cita (FR-47), aunque cambien su «Siguiente», sus recuentos y el año de su `isPartOf`; sí mueve su Obra, su Autor, sus Temas y sus Colecciones
**And** lo fijan también en el único camino que cruza Autores: una Cita de otro Autor, de una Obra de una sola Cita y con el mismo primer Tema publicado, cuyo «Siguiente cita sobre {tema}» pasa a apuntar a la Cita nueva, no cambia de fecha ni se avisa
**And** retitular una ficha mueve sus listados, y un documento nuevo mueve solo su Obra
**And** tocar solo la semblanza, la `nota`, `ediciones`, `distintaDe` o `aptaParaPortada` mueve lo que dice el criterio de los campos, y nada más
**And** fijan que el aviso y la fecha son lecturas inversas también sobre un corpus con un alta y una baja

**Given** un rango de commits que solo añade una Cita
**When** `tools/avisar.ts` compone el aviso
**Then** avisa su Página de Cita, su Autor, sus Temas y sus Colecciones, y su Obra con las reglas de la 22.8. No avisa ninguna otra Página de Cita (FR-38)

**Given** un rango de siembra sin desplegar (`--desde`, `--hasta`)
**When** se lee la misma relación con `npx tsx tools/avisar.ts --ensayo --desde … --hasta …`, que ya compone el aviso sin enviarlo y gana aquí el reparto por familia y las fechas que cambian *(v8.2)*
**Then** dice por familia cuántas superficies cambian de fecha y cuántas se avisarían, sin escribir ni enviar nada (AD-27)
**And** al cerrar la historia se ha corrido sobre una sesión de siembra real, y quedan anotadas en el spec las dos cifras: con la relación de antes y con la de ahora *(v8.2)*
**And** `AGENTS.md` documenta la orden *(v8.2)*

**Given** la Historia 21.2, el commit único de las aptas
**When** se ordena respecto de esta épica
**Then** el orden lo decide Héctor, con esto delante: con la relación por campos, un commit que solo escribe `aptaParaPortada` no fecha ni avisa ninguna Página de Cita; sin ella, fecharía y avisaría una vez sus ~104 Páginas de Cita

**Given** lo que esta historia no hace
**When** se cierra
**Then** ni `ordenAlfabetico`, ni `ordenRevisado`, ni los Directorios entran en la relación: entran con la 26

## Epic 25: Compartir donde se publica

Quien quiere compartir una Cita tiene a la vista WhatsApp, Facebook y Threads, también en el móvil que ofrece la hoja del sistema, y «Más opciones…», que abre la hoja o despliega Telegram, X y Correo. En una pantalla táctil que sabe compartir ficheros la lleva a su Historia de Instagram en dos toques, con una imagen vertical que lleva el dominio al pie y el enlace ya copiado para el sticker. La Imagen cuadrada gana el dominio, la Página de Obra también se comparte y el Kit Diario saca el 9:16 para el canal propio. Todo lo compartido lleva `?via=` con su destino, así que Héctor sabe cuántas lecturas trae cada botón (SM-12) y vigila que compartir no crezca a costa de copiar (SM-C3).

**FRs covered:** FR-10, FR-11, FR-17, FR-18 *(reescrito)*, FR-19, FR-20, FR-21, FR-22 *(`?via=` en todo lo compartido, nunca `?de=`)*, FR-51 *(compartir en la página 1)*, FR-35 *(lo que se comparte de la Obra)* *(enmendados)*; NFR-6 y NFR-12 en lo que añade; SM-5, SM-7, SM-12 y SM-C3 *(la juzgan)*.
**Notas de implementación:** la épica vive en su propia rama y entra en la principal en un solo merge. Va después de la 24 con la 26, antes o después de la 27, con el CI en verde *(v8.2)*. Las entradas de la 25.3 y la 25.7 en la constante de las pasadas que escriben en producción (23.10) van a la principal el día de cada pasada; no son una excepción a la fusión por épica *(v8.2, Héctor, 2026-10-23)*. La 25.3 puede correr desde el principio. Es la primera pasada de la matriz de dispositivos y la puerta de la 25.4: sin la Historia comprobada en iOS y en Android, el 9:16 no se construye (AD-7). La 25.1 arranca con la 23.1 y la 23.2 construidas, y la 25.2 arranca con la 23.2 y la 23.5 construidas *(v8.2)*. La 25.4 va tras la 25.2 y la 25.3, la 25.5 tras la 25.1 y la 25.4, y la 25.6 tras la 25.1. La 25.7 cierra la épica con la segunda pasada de la matriz, el validador de Facebook y NFR-7 medido a mano *(v8.2, Héctor, 2026-10-23)*; sin ella, la épica se queda en revisión. Quedan fuera tres cosas: el bloque y la Imagen sobre la Cita del Día, que son de la 28 y reutilizan lo de aquí sin copiarlo; los demás diseños en 9:16 (FR-11); y toda Imagen de Obra. El resto, en las viñetas de la Epic List — v8.
**Preguntas abiertas:** qué hace en iOS el botón de la Historia si Instagram no la ofrece allí (Héctor, 25.3) *(v8.2)*. El nombre de la previsualización cuadrada y la frase de la descarga en iOS los cerró la UX v8.2, y el «destino Feed», la espina v8.2: no lo hay *(v8.2)*. Decidido por Héctor el 2026-10-23: la jornada de llegada de la 25 es una constante de despliegue de `umbrales.ts` (25.7), la segunda pasada de la 25.7 escribe en el D1 de producción y se descuenta como la 25.3, y la frase de iOS se activa con una constante de `umbrales.ts` (25.5) *(v8.2, Héctor, 2026-10-23)*.

### Story 25.1: Compartir en WhatsApp, Facebook y Threads, también donde hay hoja

As a visitante que quiere mandar una Cita a alguien desde el móvil,
I want ver los destinos donde se publica sin abrir antes nada, también donde el navegador trae hoja del sistema,
So that la Cita llegue a WhatsApp, a Facebook o a Threads en un toque, con su Autor y con un enlace que dice de qué botón salió.

**Acceptance Criteria:**

**Given** las Historias 23.1 y 23.2 terminadas
**When** empieza esta historia
**Then** ya existen tres cosas: el arranque de `__medir` como cola en el armazón, el hueco en línea que dejó la medición al salir a fichero y `DESTINOS_VALIDOS` partido en destinos de enlace (ya con `facebook` y `threads`) y el destino de imagen
**And** sin ellas no empieza: no habría marca que poner ni bytes donde caber (AD-6, AD-13)
**And** la 23.2 ya trajo los constructores puros de `facebook` y `threads` en `src/lib/compartir.ts`, con su prueba y sin botón, para que la invariante de `tests/unit/comparticion.test.ts` (todo destino de enlace tiene constructor) se cumpla siempre: esta historia les pone el botón

**Given** la Página de Cita
**When** se sirve
**Then** tras Copiar e Imagen va el bloque «Compartir en», a 3 × `{spacing.unit}` bajo Imagen (bajo Copiar si la Cita no admite Imagen) y dentro de la medida de prosa, también en escritorio
**And** el bloque es el Rótulo de sección como `h2` y, a 2 × `{spacing.unit}`, una rejilla de dos columnas con `role="list"` y `{spacing.unit}` entre celdas, con WhatsApp, Facebook, Threads y «Más opciones…» en un 2 × 2 fijo (UX-DR71, UX-DR101)
**And** «Compartir la cita» desaparece: ni su botón de hoja ni su lista (UX-DR63, UX-DR112)
**And** el orden de tabulación sigue al de lectura: Copiar, Imagen y los destinos en el orden de la rejilla

**Given** cada destino
**When** se pinta
**Then** es el botón secundario de las Acciones y ocupa su celda: 2 × `{spacing.unit}` de relleno lateral, 44 px de alto, en siena, sin subrayado y sin el icono de su red, con los tokens de `DESIGN.md` y ningún literal de color ni de tipografía (UX-DR71, UX-DR105)
**And** su texto visible es solo el destino. El prefijo «Compartir en » va en `.solo-para-lectores`, así que el nombre accesible es «Compartir en {destino}», con `AVISO_DE_PESTAÑA_NUEVA` de `src/lib/accesibilidad.ts` oculto dentro en los destinos que abren pestaña nueva
**And** esto revierte el texto visible de la 22.10 y conserva su nombre accesible; la prueba de la 22.10 en `tests/unit/espinas-de-ux.test.ts` pasa a exigir el prefijo en `.solo-para-lectores` (UX-DR112)

**Given** los destinos de enlace
**When** el build los compone
**Then** salen de `src/lib/compartir.ts`, con un constructor por cada destino de enlace de `destinos.ts` y ninguno para `instagram-historia` ni para `opaco`
**And** cada uno usa la URL de intención del addendum:
- WhatsApp, `wa.me/?text=`, con el texto y el enlace juntos;
- Facebook, `facebook.com/sharer/sharer.php?u=`, solo con el enlace;
- Threads, `threads.com/intent/post?text=&url=`;
- Telegram, `t.me/share/url?url=&text=`;
- X, `x.com/intent/tweet` (antes `x.com/intent/post`);
- Correo, `mailto:?subject=&body=`.

**And** una prueba de Vitest fija esa correspondencia: un destino de enlace sin constructor, o un constructor sin destino, la rompe

**Given** la URL que se comparte
**When** se compone
**Then** es la canónica de la página con `?via={destino}`, codificada dentro del parámetro de la intención (FR-18, FR-22)
**And** la compone el build y nunca sale de `location`: llegar con `?de=` o con el `?via=` de otro botón no la arrastra, y nunca lleva `?de=` (AD-7)
**And** la página que se abre con `?via=` declara la misma canónica, el mismo `og:url` y el mismo `<link rel="canonical">` que sin él (NFR-1)
**And** el criterio de la 10.3 «solo existe la URL canónica» y la prueba «el enlace compartido no arrastra marca de origen» de `tests/e2e/compartir-enlace.spec.ts` siguen en pie, ampliados a `?via=` *(v8.2)*

**Given** el texto propuesto
**When** se compone
**Then** es el de `textoParaCompartir`, la Cita y su Autor tal como se copian, en WhatsApp, Telegram, Correo, X y Threads
**And** Facebook recibe solo el enlace, y lo que se publica es su Tarjeta Social (FR-18, FR-19). Es la excepción declarada a «nunca es solo la dirección» de la 10.3, que sigue valiendo para los demás

**Given** una Cita que no cabe en X o en Threads con su Autor y su enlace
**When** se compone su enlace para ese destino
**Then** recibe solo el Autor y el enlace, nunca un fragmento de la Cita (NFR-12)
**And** el tope de cada red lleva nombre en `src/lib/umbrales.ts` (AD-9), con el valor que dé la documentación de esa red el día de construir, verificado ese día, y su fuente en el comentario de la constante: hoy, 280 caracteres en X, con el enlace contado como 23, y 500 en Threads
**And** una prueba con una Cita larga y otra corta del corpus de prueba fija las dos ramas: el texto de X y el de Threads llevan la Cita entera o ninguna parte de ella

**Given** «Más opciones…»
**When** la página carga sin guion, o con guion en un navegador sin `navigator.share`
**Then** es un `<details>` nativo, cerrado al cargar. Su `<summary>` es la cuarta celda, con el trato de los demás destinos, sin el marcador del navegador y con el nombre accesible «Más opciones para compartir» (UX-DR72)
**And** al abrirlo enseña Telegram, X y Correo, que son enlaces del HTML inicial, en otra rejilla igual, a `{spacing.unit}` bajo el 2 × 2 y fuera de la celda del botón (NFR-2)
**And** el foco se queda en el `summary`, y los tres destinos lo siguen en el orden del documento

**Given** un navegador con guion que sabe compartir enlaces (`navigator.share`, sin la comprobación de ficheros de la Acción Imagen)
**When** la página carga
**Then** la isla cambia el `<details>` por un `button` sin `aria-expanded` y con el mismo nombre accesible
**And** el botón abre la hoja con el texto propuesto y con la canónica marcada `?via=opaco`, que compone el build y la isla lee de un `data-*`
**And** registra `comparticion-de-enlace` con destino `opaco` solo si `share()` resolvió; en Chrome para Android, donde puede no resolverse nunca, no se cuenta, y SM-7 y SM-12 lo declaran *(v8.2)*; cerrar la hoja sin elegir (`AbortError`) no registra nada ni enseña ningún error, y un fallo de entrega con la hoja ya abierta llega como `AbortError` y tampoco registra nada (FR-20) *(v8.2)*
**And** los destinos de la rejilla siguen a la vista, porque la hoja ya no esconde nada. Esto sustituye los criterios «con hoja del sistema» de la 10.3 y, en `tests/e2e/compartir-enlace.spec.ts`, las pruebas «se ofrece la hoja y se esconde la lista» y «la hoja recibe el enlace y el texto», del bloque «Historia 10.3 — con hoja del sistema», y «por la hoja del sistema el destino es opaco», de la 10.4, que se reescriben contra «Más opciones…»
**And** «el enlace compartido no arrastra marca de origen» sigue en pie, como dice el criterio de la URL que se comparte, y su prueba se queda

**Given** un destino de enlace pulsado
**When** se emite la medición
**Then** se registra `comparticion-de-enlace` con su destino, por `__medir(…)` y nunca por `window.__medir && …`, desde un solo oyente delegado en la isla (FR-20, AD-13)
**And** el destino nombra el botón, nunca a quien comparte (NFR-11)
**And** la isla no decide `primera`: la pone el guion de medición al emitir (23.5) *(v8.2)*
**And** la invariante de `tests/unit/comparticion.test.ts` «la hoja se registra como opaco» pasa a decir que `opaco` es solo de «Más opciones…» con hoja y de la Imagen cuadrada, la compartida por la hoja y la descargada por un rechazo *(v8.2)*. Con la 23.2, sustituye el criterio de la hoja de la 10.4, que al cerrarse esta historia se marca *(sustituido en la v8 por las Historias 23.2 y 25.1)*
**And** los destinos son enlaces que salen del sitio: no llevan zona ni cuentan como salida interna (UX-DR111)

**Given** WhatsApp, Facebook, Threads, Telegram y X
**When** se pulsan
**Then** abren pestaña nueva con `rel="noopener noreferrer"` y la avisan en su nombre accesible (UX-DR106)
**And** Correo no: abre la aplicación de correo desde la misma pestaña, sin `target` y sin el aviso, porque un `mailto:` no abre ninguna pestaña
**And** ningún destino pide registrarse en el sitio ni instalar nada, e Instagram y TikTok no son destinos de enlace (10.3)

**Given** la rejilla a 320 px, con el texto al 200 % o con el espaciado de 1.4.12
**When** una celda no cabe
**Then** la rejilla pasa a una columna, y ningún botón lleva `white-space: nowrap` (UX-DR103, NFR-8)
**And** el texto al 200 % se simula con zoom, el ancho CSS a la mitad, porque los tokens de `tokens.css` están en px, y la prueba que lo mide lo declara
**And** sin la Historia, el bloque mide 52 px menos que los unos 180 que mide con ella, y no le reserva hueco (UX-DR35)

**Given** el guion en línea del bloque
**When** se mide
**Then** no lleva datos de contenido: el texto, el slug y las URL van en `data-*` (AD-6)
**And** con el disparador de «Más opciones…», cabe en el hueco que dejó la 23.1 o sube `MAX_BYTES_DE_GUION` en el mismo diff, como isla que entra a propósito. La prueba de presupuesto lo mide en la Página de Cita con la medición puesta

**Given** las pruebas
**When** corren
**Then** Vitest fija en el CI el marcado de `dist/`: los destinos, las URL marcadas, los nombres accesibles, Correo sin pestaña nueva, el `<details>` y la ausencia de `?de=`; y, en una sola prueba estructural, que ni el guion de la isla ni `public/islas/imagen.js` nombran `primera`, que pone el guion de medición (23.5) *(v8.2)*
**And** son Playwright local, que el CI no corre: la hoja, también cerrada o fallida con `AbortError` y sin registro *(v8.2)*, el registro al pulsar, el `<details>` sin guion y el barrido axe del bloque con `wcag22aa`

### Story 25.2: La Imagen cuadrada lleva el dominio al pie

As a visitante que se lleva una Cita como imagen,
I want que la imagen diga de dónde sale, legible y sin quitarle sitio a la frase,
So that quien la vea publicada sepa adónde ir aunque nadie le dé el enlace.

**Acceptance Criteria:**

**Given** las Historias 23.2 y 23.5 terminadas *(v8.2)*
**When** empieza esta historia
**Then** existen el destino de `descarga-de-imagen`, con {`opaco`, `instagram-historia`}, y `primera`, que pone el guion de medición
**And** sin ellos no empieza: la descarga impuesta no tendría con qué registrarse (AD-13)
**And** si la 25.3 ya anotó que en algún sistema un fallo de entrega con la hoja abierta no llega como `AbortError`, esta historia lleva ya, como criterio escrito en `epics.md`, lo que Héctor decidió para la cuadrada; sin esa decisión no empieza (25.3, AD-7) *(v8.2)*

**Given** la Imagen cuadrada, de 1080 × 1080 y con sus tres plantillas
**When** se compone
**Then** lleva al pie, bajo la marca, «sabiduriadebolsillo.net» al cuerpo del Autor (24 px), con el peso y el color de la procedencia: legible y subordinado a la Cita (FR-10, UX-DR78)
**And** el Autor va a 24 px, la procedencia a 22 y la marca a 20, con el margen de 96

**Given** el dominio
**When** llega al generador
**Then** es `DOMINIO` de `src/lib/dominio.ts`, el de `public/CNAME`, sin esquema ni barra y no el origen de `SITE_URL`. Llega por un `data-*`, como la marca y el tamaño (AD-7, AD-8)
**And** `public/islas/imagen.js` no lo escribe: una prueba busca el literal en el fichero, como hace con la marca `tests/unit/marca.test.ts`

**Given** la geometría del cuadrado
**When** se declara
**Then** se declara una sola vez, en el generador, que es donde la 25.4 pondrá la del 9:16 (AD-8)
**And** una prueba de Vitest lee el módulo y la fija: el lienzo, el margen, los cuerpos del pie y que la zona de la Cita y la del pie no se solapan

**Given** una procedencia que no cabe en una línea
**When** se compone
**Then** se reparte en líneas como la Cita, sin partir palabras, y nunca sale del lienzo: en una sola línea, un título de Obra largo se salía, y eso es un recorte (NFR-12)
**And** es la de `procedenciaCompuesta` de `src/lib/atribucion.ts`, con el título de la Obra resuelta y sin traductor

**Given** las Citas publicadas más largas de cada tramo
**When** corre la prueba de cabida en el navegador (Playwright local, con Source Serif cargada y el pie puesto)
**Then** toda Cita de hasta `MAX_CARACTERES_IMAGEN` cabe en su tramo en el cuadrado (FR-10, AD-8)
**And** si alguna deja de caber por el pie, la historia no se cierra. Lo decide Héctor en un diff visible de `src/lib/tramos.ts`, nunca encogiendo en el generador; es un acto de Héctor a mitad de cadena, del que cuelgan la 25.4 y la 25.5, y `sprint-status.yaml` lo marca en un comentario, a mano *(v8.2)*

**Given** una Cita que no cabe en el lienzo, por su alto o por una palabra más ancha que la columna
**When** el generador la compone en el navegador
**Then** no la compone: el diálogo lo dice donde iba la previsualización, con el trato de la frase del generador que no llega: «Esta cita no cabe en la imagen. Puedes copiar su texto.», sin el primario y con «Copiar el texto» (NFR-12, AD-8) *(v8.2)*
**And** nunca encoge, recorta ni pone puntos suspensivos
**And** no ofrece reintentar: con la misma Cita y la misma tabla el resultado no cambia, y pulsar otra vez la Acción Imagen da la misma frase *(v8.2)*
**And** la frase se anuncia por la región `role="status"` del diálogo, como cuando el generador no llega, cuya frase sigue siendo «No se ha podido preparar la imagen. Puedes copiar el texto de la cita.», con reintento *(v8.2)*

**Given** el Diálogo de Imagen
**When** se abre
**Then** entrega solo la Imagen cuadrada, con Papel, Tinta y Siena, y Papel elegida al abrir. El diseño se elige antes de descargar o de compartir (FR-11, UX-DR76)
**And** el 9:16 no se ofrece en este diálogo: lo entrega «Historia de Instagram» (25.5)

**Given** la previsualización
**When** se pinta
**Then** es una imagen con nombre (`role="img"`), y su nombre accesible es «Imagen cuadrada en Papel: la cita, su autor, su procedencia y sabiduriadebolsillo.net», que cambia con la plantilla elegida —«en Tinta», «en Siena»—, con el dominio de `dominio.ts` *(v8.2)*
**And** no lleva rótulo visible propio, y deja de ser «Previsualización de la imagen» (UX-DR76, WCAG 1.1.1) *(v8.2)*

**Given** la Imagen cuadrada
**When** se comparte por la hoja desde el diálogo
**Then** se registra `comparticion-de-imagen` con destino `opaco` cuando `share()` resuelve (FR-20) *(v8.2)*
**And** si el navegador rechaza antes de abrir la hoja —`NotAllowedError`, `DataError` o `TypeError`—, la imagen se descarga sin aviso y se registra `descarga-de-imagen` con destino `opaco` y `primera` = no, que pone el guion de medición (23.5): no cuenta en SM-5 ni en SM-C3, ni entra en SM-12 (AD-7) *(v8.2)*
**And** `AbortError` —cerrar la hoja sin elegir, o un fallo de entrega con la hoja ya abierta— ni descarga ni registra, e `InvalidStateError` se ignora *(v8.2)*
**And** descargada porque el visitante lo eligió, se registra `descarga-de-imagen` sin destino, como hoy *(v8.2)*
**And** la `comparticion-de-imagen` de la cuadrada no entra en el denominador de SM-12, que la 23.10 informa aparte *(v8.2)*
**And** el fichero compartido y el descargado son el mismo, porque salen de la misma generación (FR-17)

**Given** la Imagen del Kit Diario y la del Lote
**When** se componen
**Then** llevan el mismo pie, porque salen del mismo generador con el mismo `data-*` (AD-7)

**Given** una Cita de más de 300 caracteres
**When** se sirve su página
**Then** la Acción Imagen no existe: no está oculta ni deshabilitada, nada lo explica y Copiar sigue (UX-DR108, `tests/unit/imagen-larga.test.ts`)

**Given** las pruebas
**When** corren
**Then** Vitest fija sobre `dist/` el `data-*` del dominio, y en el módulo la geometría y la ausencia del literal
**And** son Playwright local la cabida, el nombre de la previsualización con cada plantilla, la Cita que no cabe, sin reintento, y, con `share` sustituido, los tres rechazos antes de abrir la hoja, `AbortError` e `InvalidStateError`, cada uno con lo que registra *(v8.2)*

### Story 25.3: La Historia se prueba en iOS y en Android antes de construirla *(operativa)*

As a Héctor,
I want comprobar en un iPhone y en un Android, con el Instagram de ese día, si Instagram ofrece la historia cuando recibe solo un fichero desde la web,
So that el 9:16 no se construya para un destino que en uno de los dos sistemas no existe.

**Acceptance Criteria:**

**Given** esta historia
**When** empieza
**Then** no depende de ninguna otra y puede correr desde el principio de la épica
**And** es la primera pasada de la matriz de dispositivos y la puerta de la 25.4 (AD-7, Entorno operativo)

**Given** un iPhone con Safari y un Android con Chrome, cada uno con Instagram instalado y al día
**When** se pulsa «Compartir como imagen» en una Página de Cita del sitio en vivo que admite Imagen, y en la hoja se elige Instagram
**Then** queda anotado si Instagram ofrece «Historia» al recibir el fichero. Esa acción ya entrega a la hoja solo el fichero, sin texto ni enlace
**And** la pasada se hace con esa acción del sitio en vivo y no con nada de la rama, que todavía no tiene nada construido con lo que probar; el sitio en vivo ya se sirve con HTTPS, así que esta pasada no necesita el túnel de la 25.7
**And** la pasada escribe en el D1 de producción, porque el sitio en vivo ya mide —con el receptor de la v7.1 mientras no llegue la 23—; con la segunda pasada de la 25.7, son las dos únicas que lo hacen a propósito *(v8.2)*
**And** Héctor anota su jornada UTC y las rutas que toca en la constante de `umbrales.ts` de las pasadas que escriben en producción, en un commit aparte a la principal el día de la pasada: es un dato de Héctor y no código de la épica, como dar valor a una constante de despliegue. `DESPLIEGUE.md` cita la constante y no la copia, y la orden de la 23.10 las descuenta igual en cada lectura (AD-9); si la constante aún no está en la principal, la anota en cuanto llegue *(v8.2, Héctor, 2026-10-23)*
**And** queda anotado si en iOS la cuadrada cae en la descarga: esta pasada y la de la 25.7 son las dos que pueden activar la frase de iOS de la 25.5 *(v8.2)*
**And** la anotación lleva la fecha, el dispositivo y las versiones del sistema, del navegador y de Instagram, en una sección nueva de `DESPLIEGUE.md` para la matriz de la Épica 25

**Given** el rótulo de la Acción Imagen en cada teléfono
**When** la página carga
**Then** queda anotado qué dice. «Compartir como imagen» significa que el navegador comparte ficheros (`canShare({ files })`), y «Descargar como imagen», que no: es la condición de la que dependerá la Historia (UX-DR73)

**Given** la Acción Imagen del sitio en vivo en cada teléfono *(v8.2)*
**When** se provoca un fallo de entrega con la hoja ya abierta
**Then** queda anotado qué hace el navegador. AD-7 da por hecho que llega como `AbortError`, como cancelar, sin descarga ni registro, y que nada lo distingue de cerrar la hoja
**And** si algún sistema cae en la descarga o da otro error, qué hacen allí la Historia y la Imagen cuadrada lo decide Héctor con la matriz delante, como cuando un sistema no ofrece la historia (abajo) *(v8.2)*
**And** la decisión entra como criterio de la 25.5, y de la 25.2 si aún no está construida, por `bmad-correct-course` antes de construirla, no solo en su spec; la 25.5 no empieza sin ella, y ningún agente la toma *(v8.2)*
**And** va en la misma anotación de la matriz en `DESPLIEGUE.md`

**Given** que los dos sistemas ofrecen «Historia»
**When** se anota
**Then** la 25.4 puede empezar

**Given** que alguno de los dos no la ofrece
**When** se anota
**Then** qué hace allí el botón «Historia de Instagram» lo decide Héctor con la matriz delante (PRD §15)
**And** si el que no la ofrece es iOS, la Imagen cuadrada se conserva allí, porque va por la misma vía; no hay destino Feed (AD-7): si lo que Héctor decida necesita un destino nuevo, entra en el vocabulario por la orden de la 23.2 y la 23.3 antes de la 25.5 *(v8.2)*
**And** la decisión queda escrita en `DESPLIEGUE.md` y en `epics.md`, como criterio de la 25.5, por una pasada de `bmad-create-epics-and-stories` o de `bmad-correct-course` antes de construirla, no solo en su spec; ningún agente la toma *(v8.2)*
**And** si distingue iOS, la isla lee el sistema en el cliente, que NFR-11 permite porque no se transporta *(v8.2)*

**Given** lo que esta pasada no puede ver: la activación del segundo toque, el portapapeles, los navegadores de las aplicaciones y las bandas que pinta Instagram
**When** se cierra la historia
**Then** todo eso queda para la 25.7, porque necesita el 9:16 construido

**Given** la anotación
**When** se commitea
**Then** va en un commit propio, sin código *(v8.2)*
**And** la entrada de la pasada en la constante de `umbrales.ts` va en un commit aparte a la principal el día de la pasada: es un dato de Héctor y no código de la épica, como dar valor a una constante de despliegue *(v8.2, Héctor, 2026-10-23)*
**And** sin la anotación, la historia se queda en revisión: pide teléfonos con Instagram y una persona, y ningún agente puede cerrarla

### Story 25.4: La Cita también en vertical, y el Kit la saca para el canal

As a Héctor, que publica la Cita del Día en las cuentas propias,
I want que el Kit Diario me dé cada mañana la Cita también en vertical, compuesta igual que la verá quien la comparta,
So that publique la historia en cada cuenta sin rehacer la imagen a mano.

**Acceptance Criteria:**

**Given** la Historia 25.2 terminada y la anotación de la 25.3
**When** empieza esta historia
**Then** la matriz dice que Instagram ofrece la historia, o Héctor ya decidió qué hace el botón donde no la ofrece
**And** sin esa anotación, el 9:16 no se construye (AD-7)

**Given** el 9:16
**When** se compone
**Then** sale del mismo generador que la cuadrada, `public/islas/imagen.js`: 1080 × 1920 px, solo en Papel, con esquinas rectas y margen de 96 px (UX-DR77, FR-11, AD-7)
**And** lleva lo mismo que la cuadrada, con el mismo texto y la misma atribución (FR-11): la Cita, el filete corto, el Autor en mayúsculas, la procedencia de `procedenciaCompuesta` sin traductor y, al pie, la marca y el dominio de `dominio.ts`

**Given** la composición
**When** se dibuja
**Then** la Cita va centrada entre las dos bandas que pinta Instagram, que se suponen de unos 250 px: ocupa desde unos 250 px del borde superior hasta unos 370 del inferior (UX-DR77)
**And** el pie queda a unos 280 px del borde inferior, para que el campo de respuesta no tape el dominio
**And** esa geometría se declara una sola vez, junto a la del cuadrado, y la prueba de la 25.2 la fija también (AD-8)

**Given** los cuerpos
**When** se eligen
**Then** el de la Cita sale de una columna nueva de `src/lib/tramos.ts` para el 9:16 y llega al generador por `data-*`, como `data-tamano` (AD-8)
**And** la columna da 80, 64, 52 o 42 px según el tramo, sin bajar de 42. El Autor y el dominio van a 36 px, la procedencia a 33 y la marca a 30 (estas dos son [ASSUMPTION] de `DESIGN.md`)
**And** `tests/unit/tramos.test.ts` fija tres cosas: la columna, que por encima de 300 caracteres no admite imagen y que ningún tramo que la admite queda en cero. Nadie escribe el cuerpo de la Cita en el generador

**Given** las Citas publicadas más largas de cada tramo
**When** corre la prueba de cabida en el navegador (Playwright local, con Source Serif cargada y el pie puesto)
**Then** toda Cita de hasta `MAX_CARACTERES_IMAGEN` cabe en su tramo en los dos formatos (FR-10, NFR-12, AD-8)
**And** los cuerpos del 9:16 son la propuesta que Héctor aceptó para probar: si uno no cabe, se corrige su columna en un diff visible, nunca encogiendo en el generador
**And** en el navegador, una Cita que no cabe no se compone y el generador lo dice con la frase de la Cita que no cabe de la 25.2, en el Diálogo de Imagen y en el Material del Kit y del Lote; la de la Historia la escribe y la prueba la 25.5 *(v8.2)*

**Given** el Material para publicar del Kit Diario y del Lote (`MaterialParaPublicar.astro`)
**When** se sirve una jornada cuya Cita admite Imagen
**Then** lleva las dos imágenes en Papel, a todo el ancho de la columna, con esquinas rectas y filete (UX-DR98, FR-21)
**And** primero va la cuadrada, con el botón primario «Descargar la imagen cuadrada» a `{spacing.unit}` debajo; después, a 2 × `{spacing.unit}`, el 9:16, con «Descargar la imagen vertical»
**And** debajo siguen «Copiar la cita», «Ver la Página de Cita» y un enlace por red en el orden de `src/lib/redes.ts`, con su marca de origen `?de=` y nunca `?via=`
**And** la regla del siena no rige aquí, y el rótulo de cada material es `h2` en el Kit y `h3` en el Lote

**Given** el Lote y el Kit de una misma jornada
**When** se comparan
**Then** el material es el mismo marcado, y `tests/unit/lote-construido.test.ts` lo sigue exigiendo con las dos imágenes

**Given** las dos descargas
**When** se pulsan
**Then** cada formato baja su propio fichero, con un nombre distinto del otro, y el fichero es el lienzo que se ve, redibujado justo antes, como hoy (FR-21)
**And** descargar en el Kit o en el Lote no registra nada: son superficies internas, sin medición (NFR-6)

**Given** el Kit y el Lote
**When** cargan
**Then** importan `imagen.js` al cargar y componen los dos formatos sin que haya que pulsar nada. El 9:16 del Kit es una isla declarada y contada (AD-6, AD-15, NFR-6)
**And** `src/islands/ImagenDelKit.astro` pasa el slug de `define:vars` a un `data-*`, como dejó dicho la 23.1: el guion de la isla no lleva datos de contenido (AD-6)
**And** toda copia de `ImagenDelKit` que conviva con otra en la misma página —una por jornada en el Lote— sigue viva sin el slug: cada guion encuentra su isla por `document.currentScript` o por un oyente delegado, nunca por un selector común *(v8.2)*
**And** una prueba descarga desde una copia que no es la primera, porque `tests/e2e/kit.spec.ts` solo prueba `.first()` y una copia muerta pasaría *(v8.2)*
**And** se quita la exención de `ImagenDelKit` que la 23.1 dejó en la prueba de los guiones en línea («ningún guion en línea lleva datos de contenido»), que pasa a juzgar también la isla del Kit: sin quitarla, una regresión del Kit pasaría tapada
**And** los dos siguen con `noindex`, fuera del sitemap, de los dos buscadores, de la prueba de las dos jornadas (AD-12) y de toda serie, y ninguna superficie del producto los enlaza

**Given** una Cita del Día de más de 300 caracteres
**When** se compone el Kit
**Then** no hay imagen en ningún formato, y el Kit dice «Esta Cita pasa del límite de longitud, así que no admite Imagen. Abajo tienes una alternativa apta con su material completo.»
**And** la «Alternativa con Imagen» lleva los dos formatos (FR-21)

**Given** la Página de Cita
**When** se cierra esta historia
**Then** todavía no ofrece el 9:16: lo entregará «Historia de Instagram» en la 25.5

**Given** las pruebas
**When** corren
**Then** Vitest fija sobre `dist/` las dos imágenes del Material, sus rótulos, el `data-*` del 9:16, el del slug del Kit y la columna
**And** son Playwright local cinco cosas: que el Kit compone los dos formatos sin pulsar (`tests/e2e/kit.spec.ts`), la descarga de cada uno, la descarga desde una copia de `ImagenDelKit` que no es la primera, en el Lote *(v8.2)*, la cabida y una Cita de prueba que no cabe en el 9:16, con su frase en el Material del Kit *(v8.2)*

### Story 25.5: A la Historia de Instagram en dos toques

As a Diego, que busca algo que publicar hoy en su historia de Instagram,
I want llevar la Cita a la historia desde su página, sin elegir diseño y con el enlace ya copiado para el sticker,
So that publique sin abrir la galería, sin buscar dónde ha caído el fichero y sin teclear una dirección.

**Acceptance Criteria:**

**Given** las Historias 23.2, 23.5, 25.1 y 25.4 terminadas *(v8.2)*
**When** empieza esta historia
**Then** existen el bloque «Compartir en», el 9:16 del generador e `instagram-historia` en el conjunto cerrado, como destino de imagen y de `descarga-de-imagen`, y el campo `primera` (AD-13) *(v8.2)*
**And** si la 25.3 anotó que un sistema no ofrece la historia, esta historia lleva ya, como criterio escrito en `epics.md`, lo que Héctor decidió para el botón en ese sistema y, si pide un destino nuevo, el vocabulario ya desplegado por la 23.2 y la 23.3. Sin esa decisión no empieza (AD-7) *(v8.2)*
**And** lo mismo si la 25.3 anotó que en algún sistema un fallo de entrega con la hoja abierta no llega como `AbortError`: lo que Héctor decidió va ya como criterio escrito en `epics.md`, y sin esa decisión no empieza *(v8.2)*

**Given** la Página de Cita
**When** la isla carga
**Then** inserta «Historia de Instagram» solo si se cumplen las cuatro condiciones (UX-DR73, AD-8):
- puntero grueso (`matchMedia('(pointer: coarse)')`);
- un navegador que puede compartir el fichero: `navigator.canShare({ files })`, preguntado con un `File` PNG de prueba, sin componer antes el 9:16;
- guion;
- un `data-*` derivado de `tramos.ts` que dice que la Cita admite Imagen.

**And** el botón va en la primera fila de la rejilla, a lo ancho, como primer destino
**And** el 2 × 2 no se recoloca y lo de debajo baja 52 px: antes de insertarlo no se le reserva hueco (UX-DR35)

**Given** un escritorio, un navegador sin puntero grueso, el de la aplicación de Facebook en Android (que no comparte ficheros), una página sin guion o una Cita de más de 300 caracteres
**When** la página carga
**Then** «Historia de Instagram» no existe: ni oculta, ni deshabilitada, ni avisada, y la rejilla queda igual (FR-17, UX-DR108)
**And** un `canShare` que lanza una excepción cuenta como falso
**And** la Página de Obra no lleva el `data-*`, así que nunca la ofrece (AD-8)

**Given** el primer toque
**When** se pulsa «Historia de Instagram»
**Then** abre el `<dialog>` nativo del Diálogo de Imagen, con su marco y la atenuación al 40 % de `{colors.on-surface}` y sin botones de plantilla, y pide `imagen.js` en ese momento, no antes (AD-6, UX-DR74)
**And** arriba, en `{typography.body-md}`, va «Se copia el enlace para el sticker Enlace.», asociada al diálogo por `aria-describedby`; a `{spacing.gutter}`, «Cerrar», como botón secundario
**And** el nombre accesible del diálogo es «Compartir en Historia de Instagram», tomado con `aria-labelledby` del botón que lo abre, y se cierra con Esc, con un toque fuera y con «Cerrar»

**Given** el generador ya llegado
**When** compone
**Then** dibuja el 9:16 en Papel y hace el `File`. Solo entonces pinta la previsualización y, debajo, el botón primario «Compartir en la historia», y la región dice «La imagen está lista.» (UX-DR74, UX-DR75)
**And** la previsualización va centrada a 1:6 (180 × 320 px a 360 de ancho), con esquinas rectas, filete `{colors.outline-variant}` y 3 × `{spacing.unit}` arriba y abajo
**And** es una imagen con nombre: «Imagen vertical para la historia: la cita, su autor, su procedencia y sabiduriadebolsillo.net», con el dominio de `dominio.ts`
**And** nunca pasa del alto disponible: con el móvil en horizontal o con el texto grande, el diálogo se desplaza por dentro y «Compartir en la historia» siempre se alcanza (WCAG 1.4.10)
**And** el 9:16 de la Historia y el del Kit de la misma Cita son el mismo lienzo (AD-7)

**Given** el segundo toque
**When** se pulsa «Compartir en la historia»
**Then** el mismo manejador lanza, en el mismo turno, primero `navigator.clipboard.writeText` y después `navigator.share({ files })`, y las dos se esperan después (AD-7, FR-17)
**And** `writeText` copia la canónica con `?via=instagram-historia`, que el build compuso con `compartir.ts` y la isla lee de un `data-*`
**And** `share()` lleva el `File` ya hecho, sin texto ni enlace
**And** entre el toque y `share()` no hay ninguna espera: ni `import()`, ni composición, ni `toBlob`. Una prueba con un `writeText` que tarda en resolver comprueba que `share()` ya se ha llamado

**Given** que `writeText` resuelve *(v8.2)*
**When** termina
**Then** la frase dice «Enlace copiado: pégalo en el sticker Enlace.» en ese momento, bajo el botón, a 2 × `{spacing.unit}`, en `{typography.caption}` y `{colors.on-surface}`, sin esperar a `share()` (AD-7, UX-DR75)
**And** nada de la interfaz espera a `share()`, que en Chrome para Android puede no resolverse nunca

**Given** que `share()` resuelve
**When** termina
**Then** se registra `comparticion-de-imagen` con destino `instagram-historia` (FR-20)
**And** donde no resuelve no se registra, y SM-7 y SM-12 lo declaran: en Chrome para Android la cuenta de comparticiones es cota inferior *(v8.2)*

**Given** que el navegador rechaza antes de abrir la hoja, con `NotAllowedError`, `DataError` o `TypeError` *(v8.2)*
**When** termina
**Then** descarga el mismo 9:16, deja el enlace copiado y dice «La imagen se ha descargado. Enlace copiado: pégalo en el sticker Enlace.». Es el único caso en que la Historia descarga (FR-17, AD-7)
**And** se registra como `descarga-de-imagen` con destino `instagram-historia`, nunca como compartición, y con `primera` = no, que pone el guion de medición (23.5): no gasta la lectura con acción de SM-5 *(v8.2)*

**Given** que `share()` rechaza con `AbortError` —cerrar la hoja sin elegir, o un fallo de entrega con la hoja ya abierta, que nada distingue de cancelar— *(v8.2)*
**When** termina
**Then** ni descarga ni registro, y el diálogo no añade ninguna frase; «Enlace copiado…», si ya salió, se queda, porque es cierta. Cancelar no es que el navegador rechace *(v8.2)*
**And** con `InvalidStateError`, que señala otra compartición en curso, el rechazo se ignora: ni frase, ni descarga, ni registro (AD-7) *(v8.2)*

**Given** que `writeText` rechaza
**When** termina
**Then** no dice «copiado». El enlace, con su `?via=instagram-historia`, aparece bajo el botón en el campo de copia manual de las Acciones, con el foco en él y seleccionado (UX-DR75, UX-DR100)
**And** la etiqueta del campo es «Selecciona el enlace y cópialo para el sticker Enlace.», y la región no la repite
**And** la hoja se abre igual, porque el fichero está; si además cayó en la descarga, la región dice solo «La imagen se ha descargado.», o en iOS, con la frase de iOS activada, la suya sin el enlace *(v8.2)*
**And** el filete de ese campo, y también el del respaldo de Copiar, pasa de `{colors.outline-variant}` a `{colors.outline}` (`--contorno`, 3,51:1) (UX-DR112)

**Given** que el generador no llega
**When** el diálogo lo sabe
**Then** la frase «No se ha podido preparar la imagen. Puedes copiar el texto de la cita.» va donde iba la previsualización, en `{typography.body-md}`, sin el primario y con «Copiar el texto» como secundario a 2 × `{spacing.unit}` (UX-DR75)
**And** la línea de arriba se retira y el `aria-describedby` pasa a la frase del fallo
**And** se reintenta cerrando el diálogo y pulsando otra vez «Historia de Instagram», que vuelve a pedir el generador

**Given** una Cita que no cabe en el 9:16 *(v8.2)*
**When** el diálogo lo sabe
**Then** dice, donde iba la previsualización y con el trato de la frase del generador que no llega, «Esta cita no cabe en la imagen vertical. Puedes copiar su texto.», sin el primario y con «Copiar el texto» (UX-DR75, NFR-12)
**And** la línea de arriba se retira y el `aria-describedby` pasa a la frase
**And** no se ofrece reintentar: con la misma Cita y la misma tabla el resultado no cambia, y pulsar otra vez «Historia de Instagram» da la misma frase

**Given** cada estado
**When** se anuncia
**Then** lo anuncia una región `role="status"` dentro del `<dialog>`, creada vacía con él, con el primer ritmo de su dueño único de la 23.1: se vacía y se escribe en el siguiente fotograma (UX-DR99)
**And** así, pulsar otra vez «Compartir en la historia» lo vuelve a decir
**And** la frase visible se queda hasta la siguiente acción o hasta cerrar el diálogo: quien vuelve de Instagram la encuentra con el diálogo abierto

**Given** el guion
**When** se mide
**Then** en línea va solo el disparador, que inserta el botón, abre el diálogo y pide el generador. No lleva datos de contenido y cabe en el hueco de la 23.1 o sube `MAX_BYTES_DE_GUION` en el mismo diff. Lo demás vive en `imagen.js` (AD-6)
**And** su peso no cambia con la Cita, porque la isla decide por el `data-*`

**Given** la orden de la línea base de la 23.10
**When** lee estos registros
**Then** las descargas con destino `instagram-historia`, con `primera` = no, no entran en SM-5 ni en SM-7, y suman en el denominador de SM-12 de ese botón, junto a sus comparticiones *(v8.2)*
**And** si la orden todavía no los separa, esta historia lo añade

**Given** el criterio de la 5.2 «hay tres plantillas»
**When** se lee junto a esta historia
**Then** sigue cierto en el Diálogo de Imagen cuadrada, y la Historia es su excepción declarada: el 9:16 tiene un solo diseño y se comparte sin elegir (FR-11, FR-17)

**Given** iOS
**When** la Historia cae en la descarga
**Then** el fichero va a Archivos y no a Fotos, que es deuda aceptada, y la frase es la común, salvo que esté activada la de iOS *(v8.2)*
**And** esta historia escribe la frase de iOS —«La imagen se ha descargado en Archivos: guárdala en Fotos para publicarla en la historia. Enlace copiado: pégalo en el sticker Enlace.» y, con el portapapeles fallido, «La imagen se ha descargado en Archivos: guárdala en Fotos para publicarla en la historia.»— y su condición, que lee el sistema en el cliente: NFR-11 lo permite porque no se transporta *(v8.2)*
**And** la activa una constante con nombre de `umbrales.ts` que esta historia declara apagada y que llega a la isla por `data-*` (AD-9). La enciende Héctor en un diff visible, como `SM12_CON_FACEBOOK`, solo si la matriz de la 25.3 o la de la 25.7 reproduce en iOS la caída a la descarga, y ningún agente la enciende *(v8.2, Héctor, 2026-10-23)*

**Given** las pruebas
**When** corren
**Then** Vitest fija en el CI, sobre `dist/`, el `data-*` de la URL marcada y el de la Cita que admite Imagen, y su ausencia en una Cita larga y en la Página de Obra; y que el `data-*` de la frase de iOS sigue a la constante en sus dos estados, sin depender del valor que tenga en el árbol, como `SM12_CON_FACEBOOK` (23.10) *(v8.2, Héctor, 2026-10-23)*
**And** son Playwright local, que el CI no corre: cada estado, con `share`, `canShare` y el portapapeles sustituidos y el puntero grueso emulado, también un `share()` que no resuelve nunca con «Enlace copiado» ya dicho, los tres rechazos antes de abrir la hoja, `AbortError` con el enlace ya copiado, `InvalidStateError` y una Cita de prueba que no cabe, sin reintento *(v8.2)*; la frase de iOS y la común en iOS, con la constante en cada estado en una copia temporal, sin cambiar el árbol, y el sistema emulado *(v8.2, Héctor, 2026-10-23)*; la carga del generador al primer toque; y el barrido axe con el diálogo abierto

### Story 25.6: La Obra también se comparte

As a Marisol, que vuelve al sitio y quiere mandar a sus alumnos una obra entera,
I want compartir la Página de Obra con los mismos destinos que una Cita,
So that lleguen al libro, no a una frase suelta, con lo que dice su tarjeta.

**Acceptance Criteria:**

**Given** la Historia 25.1 terminada
**When** empieza esta historia
**Then** el bloque «Compartir en» y su isla ya existen en la Página de Cita

**Given** la isla de compartir, escrita para una sola Cita (`cita` y `autor`, `textoParaCompartir` y un solo `[data-compartir]`)
**When** se generaliza
**Then** recibe del build, por `data-*`, el texto propuesto y las URL marcadas, también la de `opaco`, y no sabe si comparte una Cita o una Obra (AD-6, AD-7)
**And** es un solo componente, que acepta el nivel de su rótulo (`h2` por omisión) para que la 28 lo ponga en `h3` sobre la Cita del Día sin copiarlo
**And** la Página de Cita sale idéntica a como estaba antes de esta historia

**Given** la página 1 de toda Obra, se indexe o no y también con la familia congelada
**When** se sirve
**Then** lleva el bloque sin la fila de «Historia de Instagram», con el 2 × 2 de WhatsApp, Facebook, Threads y «Más opciones…», tras el listado y su paginación y antes de «Temas» (FR-18, FR-51, UX-DR97, UX-DR109)
**And** sigue el ritmo del pie de UX-DR95: 5 × `{spacing.unit}` desde la paginación, o desde la última tarjeta, hasta «Compartir en», y otros 5 × de ahí a «Temas»
**And** la congelación no lo quita, porque no alcanza a la navegación (SM-11)

**Given** las páginas 2+ de una Obra
**When** se sirven
**Then** no llevan el bloque ni su guion (FR-51, UX-DR109)

**Given** el texto propuesto
**When** se compone
**Then** es «{título}, de {Autor}», con el título de su Ficha de Obra y el nombre del Autor, sin traductor ni nota, y se compone en `src/lib/atribucion.ts` (AD-28, FR-53)
**And** va en WhatsApp, Threads, Telegram, X, Correo y la hoja; Facebook recibe solo el enlace y publica la Tarjeta Social de Obra (FR-18)
**And** Correo lleva el asunto «Una obra» y el cuerpo «{título}, de {Autor}», una línea en blanco y el enlace con `?via=correo`; desde la Página de Cita y desde la Cita del Día sigue «Una cita» (UX-DR97) *(v8.2)*

**Given** las URL que se comparten
**When** se componen
**Then** son la canónica de la Página de Obra con `?via={destino}`, o con `?via=opaco` en la hoja. Las compone el build, nunca salen de `location` y nunca llevan `?de=` (FR-22)
**And** la página que se abre con `?via=` declara la misma canónica y el mismo `og:url` (NFR-1)

**Given** la Página de Obra
**When** carga
**Then** no ofrece «Historia de Instagram» en ningún dispositivo: no hay Imagen de Obra, y en ella no existe el `data-*` de `tramos.ts` (AD-8, UX-DR73)

**Given** una compartición desde la Obra
**When** se registra
**Then** es `comparticion-de-enlace` con su destino, u `opaco`, y con la ruta de la Página de Obra (FR-20)
**And** `tools/` resuelve esa ruta a la familia Obra contra el censo, nunca por el prefijo (AD-13)
**And** SM-7 no la cuenta: lo de la Obra se informa aparte

**Given** la afiliación encendida en una copia temporal y apagada en el árbol (AD-21)
**When** se construye el sitio en los dos estados
**Then** el bloque sale idéntico, fuera de todo `data-ingreso` y sin enlace comercial (FR-35, AD-20, UX-DR110)
**And** es la primera isla de la Página de Obra, y su guion cuenta en el tope que `tests/unit/ingreso-construido.test.ts` mide en toda ruta con `data-ingreso`: cabe en `MAX_BYTES_DE_GUION` o lo sube en el mismo diff (AD-6, AD-20)

**Given** la Tarjeta Social de Obra
**When** se compone
**Then** su entrada es la ficha, sus Citas y el fichero de su Autor, cuyo nombre pinta: otro nombre da otros bytes, y el mismo contenido da los mismos (AD-16)
**And** lo construyó la 22.7 y lo fija `tests/unit/tarjeta.test.ts`: esta historia lo conserva con su prueba y no construye nada, tampoco una caché de PNG que invalidar, porque no la hay
**And** la Página de Obra declara la tarjeta en todas sus páginas, también cuando se abre con `?via=`

**Given** la Página de Obra sin guion
**When** carga
**Then** los seis destinos de enlace están en el HTML inicial, con Telegram, X y Correo dentro del `<details>` (NFR-2)

**Given** las pruebas
**When** corren
**Then** Vitest fija sobre `dist/` el bloque en la página 1, su ausencia en la 2, el texto, las URL marcadas, los dos asuntos del correo —«Una obra» en la Obra y «Una cita» en la Página de Cita— *(v8.2)* y que el bloque sale igual con la afiliación encendida o apagada
**And** es Playwright local el barrido de accesibilidad con `wcag22aa`, con el bloque puesto, en una Obra indexable y en una con `noindex`
**And** el barrido de `tests/e2e/ingreso-accesible.spec.ts` sigue pasando con la afiliación encendida

### Story 25.7: Lo compartido se comprueba en los teléfonos y en Facebook *(operativa)*

As a Héctor,
I want probar lo compartido en los teléfonos y en los navegadores de las aplicaciones donde lee la audiencia, y ver en el validador de Facebook lo que Facebook va a publicar,
So that la épica no llegue a nadie con un destino que falla justo donde más se usa.

**Acceptance Criteria:**

**Given** las Historias 25.1 a 25.6 terminadas en la rama de la épica
**When** empieza esta historia
**Then** es la segunda pasada de la matriz de dispositivos y la puerta del merge (Entorno operativo)
**And** sin la matriz y sin el validador, la épica se queda en revisión
**And** la entrada de la 25.3 ya está en la constante de `umbrales.ts` de las pasadas que escriben en producción *(v8.2, Héctor, 2026-10-23)*
**And** la 23 está en vivo (23.11): la comprobación de `?via=` en la tarjeta de Facebook se lee en la vista del D1 de producción, que solo guarda `via` desde ella; si aún no lo está, esa comprobación espera, y se dice *(v8.2)*

**Given** un iPhone con Safari, un Android con Chrome y los navegadores de las aplicaciones de Facebook, Instagram y Threads en los dos sistemas
**When** se recorre la rama construida con la medición puesta contra un receptor local (`wrangler dev` con D1 local), servida en local y abierta en el teléfono por un túnel HTTPS temporal (`cloudflared tunnel --url …`) *(v8.2)*
**Then** quedan anotadas, con fecha y versiones, en la sección de la matriz de `DESPLIEGUE.md`, las comprobaciones de la tabla del addendum:
- que la Historia no aparece en el navegador de la aplicación de Facebook en Android;
- que Instagram ofrece «Historia» al recibir solo el fichero, en iPhone y en Android;
- que `share()` y el portapapeles conservan la activación del toque en iOS Safari y en los tres navegadores de las aplicaciones;
- que `writeText` funciona en esos navegadores;
- que la descarga de un `blob` funciona en ellos, y adónde va en iOS;
- que un fallo de entrega con la hoja abierta en la Historia no descarga y deja el enlace copiado *(v8.2)*;
- que `facebook.com/sharer` se abre dentro del navegador de la aplicación de Facebook;
- que `?via=` sobrevive al clic de una tarjeta de Facebook, comprobado en el D1 de producción, en la vista con `via` = `facebook`, y no en la barra de direcciones, porque el guion de la 23 lo quita al cargar *(v8.2)*. Héctor lo lee con `wrangler d1 execute --remote` (`wrangler` 4.151.1), junto a las consultas de `DESPLIEGUE.md` §3, filtrando por la ruta y la jornada que anota para esta pasada en la constante de las pasadas en producción: la orden de la 23.10 las descuenta en cada lectura, así que no la ve. El resultado va a esta sección de la matriz *(v8.2)*.

**And** ese clic lleva a la canónica en vivo, así que escribe en el D1 de producción: es, con la 25.3, una de las dos únicas pasadas que lo hacen a propósito. Héctor anota su jornada UTC y sus rutas en la constante de `umbrales.ts` de las pasadas que escriben en producción, en un commit aparte a la principal el día de la pasada: es un dato de Héctor y no código de la épica, como dar valor a una constante de despliegue. `DESPLIEGUE.md` cita la constante y no la copia, y la orden de la 23.10 las descuenta igual en cada lectura, como las de la 25.3 (AD-9) *(v8.2, Héctor, 2026-10-23)*
**And** lo demás que se recorre por el túnel no escribe en ningún D1: la rama lleva la medición contra un receptor local, que el teléfono no alcanza por el túnel del sitio, así que sus balizas se pierden y ninguna comprobación de esta lista las lee *(v8.2)*
**And** hace falta HTTPS porque la hoja y el portapapeles solo existen en un contexto seguro, y el sitio no tiene entorno de ensayo
**And** el túnel lo abre y lo cierra Héctor: no se publica en ningún sitio y su URL no se anota en el repositorio, tampoco en `DESPLIEGUE.md`

**Given** una comprobación que falla
**When** se anota
**Then** se aplica lo que el addendum dice para ese fallo: retirar la Historia de un sistema, revisar la condición con que aparece o leer la difusión de Facebook sabiéndolo
**And** cuál de esas salidas se toma lo decide Héctor; ningún agente cambia el bloque por su cuenta

**Given** el validador de previsualización de Facebook
**When** Héctor pasa por él cuatro páginas (una Cita que admite Imagen, una de más de 300 caracteres, una Obra indexable y una con `noindex`), con la URL marcada `?via=facebook` tal como la recibe `sharer.php`
**Then** ninguna da tarjeta ausente ni imagen inaccesible, y la tarjeta es la de su canónica (FR-19, UX-DR79)
**And** el resultado de las cuatro queda anotado, con fecha, en la sección de la matriz de la Épica 25 de `DESPLIEGUE.md`, como las comprobaciones de la tabla del addendum *(v8.2)*
**And** si alguna falla, Facebook no se ofrece: la épica no se fusiona con ese destino hasta que se corrija la tarjeta o se retire el destino en un diff visible. Lo decide Héctor

**Given** SM-12
**When** la matriz dice si `?via=` sobrevive al clic de la tarjeta de Facebook
**Then** Facebook entra en la comparación entre destinos solo si sobrevive: Héctor enciende `SM12_CON_FACEBOOK`, la constante que la 23.10 declaró apagada en `umbrales.ts`, en un diff visible, y ningún agente la cambia (AD-9)
**And** si no sobrevive, la constante sigue apagada, Facebook se queda fuera y `DESPLIEGUE.md` lo dice (SM-12, FR-20)

**Given** una historia publicada de verdad en iOS y en Android
**When** se mira
**Then** las bandas que pinta Instagram no tapan la Cita ni el pie
**And** lo visto queda anotado, con fecha y versiones, en la sección de la matriz de la Épica 25 de `DESPLIEGUE.md` *(v8.2)*
**And** si las bandas no miden unos 250 px, la geometría del 9:16 se corrige en su única declaración, en la rama, y la prueba de cabida vuelve a correr (UX-DR77)

**Given** VoiceOver en iOS, al repetir Copiar y al pulsar otra vez «Compartir en la historia», y NVDA, al repetir Copiar
**When** se escucha
**Then** queda anotado si un fotograma basta para que el mensaje se vuelva a anunciar, con fecha y las versiones del sistema y del lector, en la sección de la matriz de la Épica 25 de `DESPLIEGUE.md` *(v8.2)*
**And** si no basta, el dueño único del primer ritmo espera entre 100 y 150 ms, en un solo cambio (UX-DR99)

**Given** la descarga en iOS
**When** la matriz dice si la Historia cae en ella y adónde va
**Then** si la matriz de la 25.3 o la de esta historia reproduce en iOS la caída a la descarga, Héctor enciende, en un diff visible de esta rama, la constante de `umbrales.ts` que activa la frase de iOS que la 25.5 dejó escrita y apagada; si no la reproduce, vale la común *(v8.2, Héctor, 2026-10-23)*
**And** ningún agente la enciende *(v8.2, Héctor, 2026-10-23)*

**Given** la rama lista para el merge
**When** se prepara
**Then** pasa `npm run test:e2e` entero sobre la rama al día con la principal, que ya trae la 24 con la 26 —Playwright local, que el CI no corre—, contra un receptor local, no solo lo que nombra esta historia: también la cabida en los dos formatos, el barrido WCAG 2.2 AA y el reflujo a 320 px *(v8.2)*
**And** el barrido cubre la Página de Cita con la Historia insertada y su diálogo abierto, y la página 1 de una Obra con el bloque
**And** el reflujo de la rejilla se prueba en las tres condiciones de UX-DR103 con la prueba de la 26.9, que la rama trae de la principal *(v8.2)*
**And** el CI está en verde *(v8.2)*

**Given** una Página de Cita con la Historia y «Compartir en» puestos, construida con la medición contra un receptor local *(v8.2, Héctor, 2026-10-23)*
**When** se mide a mano con Lighthouse en perfil móvil 4G, frente a la principal del mismo día y sin puerta automática
**Then** el contenido principal sigue visible en menos de 2,5 s (NFR-7), y las dos cifras quedan en el spec de la historia
**And** la principal se mide construida y servida igual, en local y con la medición contra un receptor local: nunca se mide el sitio en vivo, cuyo guion de medición escribiría en el D1 de producción *(v8.2)*
**And** si se degrada, el merge espera a que Héctor decida

**Given** el merge
**When** entra en la principal
**Then** es uno solo, después de la 24 con la 26 y antes o después de la 27 (Entorno operativo)
**And** el merge, la decisión ante un NFR-7 que se degrada y la jornada de llegada son actos de Héctor: un agente puede correr y anotar las pruebas, nunca fusionar *(v8.2)*

**Given** la constante de despliegue de la 25 en `umbrales.ts`, con la forma de las demás —una jornada, `undefined` mientras no llega—, que esta historia declara en la rama *(v8.2, Héctor, 2026-10-23)*
**When** el despliegue llega al sitio en vivo
**Then** Héctor le da valor ese día, en un commit aparte: la jornada UTC en que termina el trabajo «Desplegar» de Actions que la lleva al sitio en vivo, nunca la del merge, y ningún agente se lo da (AD-9) *(v8.2, Héctor, 2026-10-23)*
**And** desde ella cuenta la orden de la 23.10 las ventanas de SM-C3 si la 25 llega antes de la línea base de SM-5 y SM-7; si la orden todavía no la lee, esta historia se la da, como la 25.5 le da las descargas con destino

**Given** el despliegue en vivo
**When** la orden de la 23.10 lee lo que la épica mide
**Then** SM-5, SM-7, SM-12 y SM-C3 salen de ella, sobre las mismas lecturas y sin trabajo propio, y no se juzgan contra su línea base hasta que esta reúna su mínimo y Héctor dé por buena la comparación por firma, que anota en `DESPLIEGUE.md` §3 con fecha y métrica (23.10) *(v8.2, Héctor, 2026-10-23)*
**And** SM-C3 salta si en dos ventanas seguidas de la 23.10 —con la misma definición de ventana que toda tasa que se juzga contra su propia serie— SM-7 sube y SM-5 baja, cada una frente a su línea base, o, si la 25 llegó antes, desde su llegada y frente a su serie, y el informe lo dice; basta la dirección *(v8.2, Héctor, 2026-10-23)*
**And** saltar no apaga nada: la palanca la decide Héctor, quitar peso a los destinos, nunca esconder Copiar *(v8.2)*
**And** la Imagen cuadrada no entra en SM-12, y en Chrome para Android la cuenta de comparticiones es cota inferior: SM-7 puede quedar por debajo de la real y SM-12, por encima *(v8.2)*

**Given** `sprint-status.yaml`
**When** se cierra la épica
**Then** pasa a hecha solo con la matriz y el validador anotados y NFR-7 medido *(v8.2, Héctor, 2026-10-23)* —la matriz, con las bandas y la escucha, y el validador, en la sección de la matriz de la Épica 25 de `DESPLIEGUE.md`; NFR-7, en el spec *(v8.2)*—, y ningún agente anota la matriz ni el validador por Héctor

## Epic 26: Directorios y cabecera

Quien busca un Autor o una Obra los encuentra de la A a la Z, por el apellido o por el nombre con que se le conoce —Cervantes va en la C—, con letras de salto, años y recuento, y filtra al teclear sin pensar en tildes: «gonzalez» encuentra a González Prada. Desde cualquier página, la cabecera «Autores · Obras · Buscar» deja todo Autor y toda Obra a dos saltos de la portada, no obliga a desplazarse en horizontal a 320 px y no saca la Cita de la primera pantalla a 360 × 640. Héctor ve los Directorios medidos como familia propia, sin contar en la de lo que listan, y el build garantiza que ninguna página publicada queda a más de tres saltos.

**FRs covered:** FR-55; FR-15, FR-40 *(enmendados)*, FR-7 *(el tipo de resultado «Directorio»)*; NFR-1, NFR-5, NFR-8 y NFR-13 en lo que añade; FR-34, FR-37, FR-50, FR-52 *(sin trabajo)*; FR-42 *(heredado)*; SM-4 de los Directorios *(la juzga)*, SM-C2; SM-11 *(la fecha del despliegue conjunto con la 24)*.
**Notas de implementación:** comparte rama y merge con la Épica 24, y lo demás que la gobierna está en la Epic List — v8. La **26.1** va primera en la épica y detrás de la **24.8**: sin la relación por campos de AD-27, el lote de claves de los 171 Autores refecharía y avisaría el sitio entero. La 26.2 no depende de nada. La 26.3 y la 26.4 abren los Directorios, la 26.5 los enlaza desde la cabecera, y la 26.6 y la 26.7 les dan el filtro y la familia propia. La 26.8 pone la puerta de NFR-5 y la marca `data-jornada` cuando la cabecera ya existe, y la 26.9 barre el reflujo con todo puesto. La 26.10 es la revisión de Héctor y no bloquea la publicación, la siembra ni el merge; `epic-26` pasa a hecha cuando se cierra, al revisar las claves de los Autores que había al correr el lote por última vez, sobre la rama al día (26.11), y las de los Autores nuevos pasan a la sesión de sembrado *(v8.2, Héctor, 2026-10-23)*. La 26.11 es el merge conjunto con la 24, con el CI en verde y `npm run test:e2e` entero *(v8.2)*, con NFR-7 medido con lo de las dos épicas puesto, que si empeora deja el merge a la espera de Héctor *(v8.2, Héctor, 2026-10-23)*, y, ya en vivo, el valor de `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS` *(v8.2)*. No depende de la 27: a cero, el filtro lleva a la `/buscar/` de hoy. Fuera de la épica: los ocho destacados (27), los cierres de la portada hacia los Directorios y la marca como `h1` (28), la Época (FR-50), los índices de Temas y de Colecciones, y paginar `/obras/`, aplazado.
**Preguntas abiertas:** la ventana de SM-11 (Héctor, antes del 2026-12-05).

### Story 26.1: Todo Autor publicado tiene su clave de orden

As a Héctor, editor del Corpus,
I want que cada Autor lleve una clave de orden que propone la herramienta y que yo reviso cuando pueda,
So that el Directorio ponga a Cervantes en la C sin que nadie teclee claves en las fichas ni la siembra se pare a esperarme.

**Acceptance Criteria:**

**Given** la **Historia 24.8** terminada
**When** empieza esta historia
**Then** la relación de AD-27 ya va por fichero y campos que pinta; sin ella esta historia no empieza, porque el commit del lote refecharía y avisaría todas las Páginas de Autor y de Cita

**Given** el campo `ordenAlfabetico` del Autor
**When** se declara
**Then** lo declaran con un mismo validador el esquema exportado `autorAdmisible` de `src/lib/admision.ts` y la colección `autores` de `src/content.config.ts`, opcional en los dos (AD-1)
**And** su forma es puerta del esquema: una clave que no da, con la función hermana de `src/lib/normalizar.ts`, una inicial de la A a la Z o la Ñ —en blanco, o que empiece por cifra o por signo— rompe el build con la ruta del fichero y la regla, esté publicado el Autor o no (FR-13, FR-15)
**And** sin valor, el campo se omite del fichero: nunca cadena vacía ni `null`

**Given** un Autor con al menos una Cita publicada (`autoresPublicados` de `src/lib/publicado.ts`)
**When** se construye sin `ordenAlfabetico`
**Then** el build rompe con la ruta de su fichero y la orden que le propone la clave (FR-15, AD-1)
**And** un Autor sin Citas publicadas y sin clave no rompe nada, tampoco uno cuyas Citas siguen todas en `corpus/_revision/`

**Given** la función hermana de `src/lib/normalizar.ts`
**When** recibe una clave
**Then** da su inicial sin tilde —«Álvarez» en la A, «Úbeda» en la U— y la Ñ como letra propia, aunque `normalizar` la pliegue en N (AD-3)
**And** da la clave de comparación con la que se ordena, con el slug del Autor como desempate: dos claves iguales —«Séneca» de `seneca` y de `seneca-el-viejo`— salen siempre en el mismo orden
**And** el grupo de la Ñ va detrás de toda la N y antes de la O
**And** la consumen el Directorio de Autores, las letras de los dos Directorios y, desde la 27, los destacados de FR-8; ninguno ordena Autores ni calcula su inicial por su cuenta. Vitest la fija con tildes, Ñ, mayúsculas y empates

**Given** `npx tsx tools/autor.ts crear`
**When** da de alta un Autor
**Then** escribe `ordenAlfabetico` con la clave que propone una sola función de `tools/lib/`, y nunca `ordenRevisado` (FR-15)
**And** la regla es fija y escrita: la clave propuesta es la última palabra del `nombre` —Miguel de Cervantes en la C, José Martí en la M—, así que el parte del lote es reproducible *(v8.2, Héctor, 2026-10-23)*
**And** el parte dice la clave propuesta y que está sin revisar, y la marca aparte si el `nombre` tiene tres palabras o más, donde la regla puede fallar *(v8.2, Héctor, 2026-10-23)*
**And** una prueba de Vitest fija la regla y la marca con un nombre de una palabra, uno de dos y uno de tres o más *(v8.2, Héctor, 2026-10-23)*
**And** no acepta ninguna bandera para teclearla: una bandera desconocida sale con 2, como hoy

**Given** los Autores que ya existen en `corpus/autores/`
**When** se corre la orden de lote (`npx tsx tools/autor.ts proponer-claves`)
**Then** escribe la clave que propone la misma función que el alta en cada ficha que no la tiene, y no toca ninguna que ya la lleve, revisada o no: es idempotente
**And** el parte lista cada Autor con su nombre y su clave, y dice cuántos quedan sin revisar
**And** el parte del lote marca aparte los nombres de tres palabras o más, en los que la regla puede fallar —Manuel González Prada cae en la P, Benito Pérez Galdós en la G—, para que la revisión de la 26.10 empiece por ellos *(v8.2, Héctor, 2026-10-23)*
**And** el lote va en un commit propio, sin código, y por la 24.8 no mueve la fecha ni el aviso de ninguna superficie, porque todavía ninguna pinta la clave
**And** se vuelve a correr sobre la rama al día con la principal antes de fusionarla (Historia 26.11), para los Autores que la siembra dé de alta allí mientras tanto

**Given** la orden que confirma o corrige una clave (`npx tsx tools/autor.ts clave <slug> [<clave>]`)
**When** se pide
**Then** con una clave la valida con el esquema exportado y la escribe; sin ella, confirma la que hay; en los dos casos escribe `ordenRevisado` con la jornada de hoy, y es la única orden que lo escribe (AD-1)
**And** se niega con 1 y sin escribir si el slug no es de ningún Autor del Corpus o la clave no tiene forma; sale con 2 si falta el slug, sobra un argumento o llega una bandera desconocida
**And** `editar` no toca la clave, tampoco cuando cambia el nombre, y su parte recuerda la clave que sigue escrita

**Given** `ordenRevisado`
**When** se declara
**Then** el esquema exportado lo admite opcional con forma de jornada (`esJornada`), ninguna superficie lo pinta ni lo usa, y «sin revisar» se cuenta por su ausencia, sin leer git (AD-1)
**And** `npx tsx tools/autor.ts listar` enseña la clave de cada Autor, y «sin revisar» donde falta

**Given** la relación de AD-27
**When** un commit solo escribe `ordenAlfabetico` u `ordenRevisado`
**Then** no mueve el `lastmod` ni el aviso de ninguna superficie, y una prueba en Vitest lo fija sobre `relacionDeSuperficies` de `tools/lib/cambios.ts`: la clave la pintarán los Directorios (26.3, 26.4), y `ordenRevisado` no lo pinta nadie
**And** la 26.3 y la 26.4 reescriben esa prueba cuando la clave empieza a pintarse: la de `ordenAlfabetico` pasa a fijar que mueve solo `/autores/`, y después solo `/autores/` y `/obras/`; la de `ordenRevisado` sigue sin mover nada *(v8.2)*

**Given** los Autores de las pruebas —`AUTOR_VALIDO` de `tests/unit/ayuda/construir.ts` y los que escriben en línea las demás—
**When** se construye
**Then** llevan clave, y una prueba de build cubre los tres casos: publicado sin clave rompe, sin Citas y sin clave no rompe, y forma inválida rompe

**Given** la revisión de las claves propuestas
**When** se cierra la historia
**Then** queda para Héctor (Historia 26.10): ningún agente confirma ni corrige una clave ni escribe `ordenRevisado`, y la revisión no bloquea la publicación, el sembrado ni el merge (FR-15)

**Given** `AGENTS.md` § Una sesión de sembrado *(v8.2)*
**When** se cierra esta historia, que cambia el alta
**Then** el procedimiento de la sesión gana el paso «confirmar o corregir con `npx tsx tools/autor.ts clave` las claves sin revisar de los Autores dados de alta en la sesión»
**And** es donde se revisan las claves de los Autores nuevos, que la 26.10 deja fuera del lote inicial (decisión de Héctor del 2026-10-23); el paso es de Héctor, y ningún agente lo da por hecho

### Story 26.2: El tipo de un resultado no casa como texto, y la portada tiene el suyo

As a visitante que busca en el sitio,
I want que la búsqueda me devuelva una página por lo que dice y no por la clase de página que es,
So that escribir «obra» o «cita» no me devuelva el sitio entero.

**Acceptance Criteria:**

**Given** `src/lib/tipoDeResultado.ts`
**When** se amplía
**Then** gana `directorio`, rotulado «Directorio», y `portada`, rotulado «Portada» y titulado con el nombre del sitio (`MARCA` de `src/lib/marca.ts`), que se lee «Portada: Sabiduría de Bolsillo»: la marca no se repite en el rótulo (AD-17, FR-7, UX-DR91) *(v8.2)*
**And** la unión de tipos sigue derivándose de la tabla, y `tipoDeOpenGraph` da `website` para los dos
**And** una prueba de Vitest fija el conjunto exacto: Cita, Autor, Tema, Colección, Obra, Directorio y Portada. Que sea el de las familias con resultado más `portada` lo fija la 26.7, cuando las familias se muden a `src/lib/superficies.ts`

**Given** el tipo de cada página indexada
**When** se emite
**Then** lo emite solo `src/components/Armazon.astro`, una vez por página y por un medio que no casa como texto. Deja de ir en `data-pagefind-meta="tipo:…"`, porque desde Pagefind 1.5.0 la metadata se busca por omisión (AD-17)
**And** el tipo, si viaja como metadato, y todo metadato que no deba puntuar llevan peso 0 en `ranking.metaWeights`, en el único sitio donde la búsqueda configura Pagefind
**And** `src/pages/buscar.astro` lee el tipo del medio nuevo, y un resultado sin tipo reconocido se sigue rotulando «Cita»

**Given** el `dist/` construido
**When** corre la prueba en Vitest
**Then** ningún `data-pagefind-meta` lleva `tipo`, y toda página con `data-pagefind-body` lleva su tipo por el medio elegido exactamente una vez

**Given** el índice de Pagefind
**When** se busca «obra», «cita», «autor», «tema», «colección», «directorio», «portada» o el nombre del sitio *(v8.2)*
**Then** ninguna página sale solo por su tipo: cada resultado contiene el término en lo que indexa
**And** es Playwright local, que el CI no corre. Esta prueba fija el medio para las historias que escriban metadatos de Pagefind después, la 27.1 la primera

**Given** la portada
**When** se indexa
**Then** declara el tipo `portada` y responde solo por su título: la Cita del Día, los chips y la lista de Autores van en `data-pagefind-ignore="all"` (AD-17, AD-19, NFR-13)
**And** buscar un fragmento de la Cita del Día devuelve su Página de Cita, buscar el nombre de un Autor devuelve su Página de Autor, y ninguno de los dos devuelve la portada
**And** cuando la 28.1 lleve el `h1` de la portada a la cabecera, fuera de `main` y de `data-pagefind-body`, el armazón declarará su título a Pagefind con `data-pagefind-meta="title:…"` dentro de `data-pagefind-body` (decisión de Héctor del 2026-10-19); lo construye la 28.1, no esta historia

**Given** un resultado de tipo Directorio o de tipo portada
**When** `/buscar/` lo pinta
**Then** lleva su rótulo de tipo como los demás y el título en Inter al cuerpo de `{typography.headline-sm}` con peso 400, como el de Obra (UX-DR91, UX-DR104)
**And** el de portada va también en Inter, por la convención de la serif: su título no es texto de Cita ni nombre de Autor, Tema o Colección, como dicen ya UX-DR91 y UX-DR104 *(v8.2)*

**Given** esta historia terminada
**When** se construye el sitio
**Then** no existe todavía ninguna página nueva, y los resultados de Cita, Autor, Tema, Colección y Obra se pintan como antes

### Story 26.3: Todos los Autores, de la A a la Z

As a visitante que busca a un Autor por su nombre,
I want una página con todos los Autores del sitio, por su apellido y con letras para saltar,
So that encuentre a Cervantes en la C sin saber cómo se escribe su nombre entero.

**Acceptance Criteria:**

**Given** las Historias **26.1** y **26.2**, y la **23.5** y la **23.7**, terminadas
**When** empieza esta historia
**Then** todo Autor publicado tiene clave y existe el tipo `directorio`. La lectura funciona, y el vocabulario ya tiene la zona `directorio` y la vista declarada desde `src/lib/superficies.ts`

**Given** `src/pages/autores.astro`
**When** se declara
**Then** `src/lib/superficies.ts` la declara producto con la ruta literal `/autores/`, sin páginas 2+, con su constructor de ruta junto a los demás (AD-17). Ninguna plantilla la escribe a mano: `tests/unit/barra-final.test.ts` caza la forma sin barra final, y el destino lo vigila la prueba de la cabecera de la 26.5 *(v8.2)*
**And** declara también que emite `vista-de-superficie` y, por ella, lectura (la quinta consecuencia de AD-17, FR-56)
**And** de esa declaración salen el sitemap, la canónica sin `noindex`, `data-pagefind-body` y la entrada en el barrido, y `integraciones/indexables.ts` sigue rompiendo si esos conjuntos no casan (NFR-1)
**And** `rutasPublicadas` y `rutasIndexables` la enumeran (AD-11); `/autores/2/` no existe
**And** declara también su superficie de línea base, «los Directorios», que `/obras/` compartirá (26.4): la orden de la 23.10 la lee de ahí y junta sus lecturas sin tocarse (FR-56, AD-13) *(v8.2)*

**Given** los Autores con al menos una Cita publicada
**When** se compone la lista
**Then** hay una Fila de Autor por cada uno y ninguna más (FR-55, UX-DR109)
**And** un Autor sin Citas publicadas, o con todas en `corpus/_revision/`, no figura
**And** van por la clave de comparación de la función hermana de AD-3 y, a igual clave, por slug: Miguel de Cervantes en la C. Nunca van por el nombre tal como se escribe, ni en el orden por nombre en que hoy devuelve `autoresPublicados`
**And** no se agrupan por Época (FR-50, sin trabajo)

**Given** cada Fila de Autor
**When** se pinta
**Then** es un enlace de bloque a su Página de Autor, en la misma pestaña y sin subrayado (UX-DR84, UX-DR105, UX-DR106)
**And** el nombre, tal como se escribe, va en Source Serif al cuerpo de `{typography.headline-sm}` con peso 400 y en `{colors.on-surface}`, y parte palabras antes que desbordar (UX-DR104)
**And** debajo, «{años} · {n} citas» —«1 cita» en singular— en `{typography.caption}` y `{colors.on-surface-variant}`, con cifras tabulares
**And** sin ningún año que conste, la línea es solo «{n} citas»: sin punto medio, sin separador de sobra y sin hueco, por la convención de ausencia (FR-55, UX-DR84, UX-DR108). La rama es inalcanzable con el esquema, que hace obligatorio el año de fallecimiento (AD-1), así que la prueba de Vitest va sobre la función pura con los años opcionales, sin relajar el tipo *(v8.2)*
**And** los años salen de `añosDeAutor` de `src/lib/atribucion.ts`, también «Fallecido en 65» cuando no consta el nacimiento, y {n} son sus Citas publicadas, las que lista su página, no las documentadas que cuenta la Tarjeta Social de Autor: las dos cifras difieren en los Autores con Citas en `corpus/pendientes-de-cotejo.yml` (FR-55, UX-DR84, decisión de Héctor del 2026-10-19) *(v8.2)*
**And** el punto medio lleva `aria-hidden` y suena como una coma, y entre las dos líneas suena una pausa «, » solo para lectores (UX-DR101)

**Given** las letras de salto
**When** se pintan
**Then** van en una navegación «Letras» con `role="list"`, una por inicial con algún Autor —la de su clave, sin tilde y con la Ñ propia— (UX-DR82)
**And** van en una rejilla de columnas de 44 px como mínimo con `{spacing.unit}` entre zonas: seis por fila a 360 px, y todas a la vista sin deslizar
**And** cada letra es un ancla a su grupo que funciona sin guion, en su zona cuadrada de 44 px, en `{typography.body-md}` con peso 600 y `{colors.primary}`, sin subrayado ni caja (UX-DR105)
**And** su nombre accesible es «Autores por la {letra}», con la letra visible dentro del nombre y el resto en `.solo-para-lectores`
**And** una inicial sin Autores no tiene letra ni grupo

**Given** un grupo de letra
**When** se llega a él por su letra, también sin JavaScript
**Then** su rótulo es un `h2` con el trato de Rótulo de sección, con `tabindex="-1"` y `scroll-margin-top` de 2 × `{spacing.unit}`, y recibe el foco con el anillo global (UX-DR83, UX-DR100)
**And** cierra con «Volver a las letras», un enlace de texto en su propia línea, en `{typography.body-md}` y `{colors.primary}`, subrayado y con 44 px de zona (UX-DR102)
**And** «Volver a las letras» lleva a la navegación «Letras», que también recibe el foco al llegar
**And** el ritmo: el primer grupo a 4 × `{spacing.unit}` de las letras y los demás a 5 × del cierre anterior; la lista a 2 × del rótulo, con filete superior, y «Volver a las letras» a 2 × de la última fila

**Given** la página
**When** se sirve
**Then** su único `h1` es «Autores», en Inter al cuerpo de `{typography.headline-md}` con peso 600 y en `{colors.on-surface}`, sin enlace, bajada ni recuento (UX-DR80, UX-DR101)
**And** todo va dentro de la medida de prosa, y el título de pestaña es «Autores, de la A a la Z | Sabiduría de Bolsillo», la plantilla literal de UX-DR80, sin la palabra «citas»: los Directorios no dicen «frases» en ningún texto, y «citas» va en el cuerpo y en la meta description (UX-DR107, decisión de Héctor del 2026-10-19) *(v8.2)*
**And** la meta description dice solo hechos del Corpus, con la palabra «citas»: «{m} autores, de la A a la Z, con {n} citas publicadas.», en singular cuando la cifra es una —«1 autor», «1 cita publicada»—, con la redacción que aprobó Héctor el 2026-10-19 (UX-DR80, UX-DR107)
**And** no reproduce ninguna Cita ni ninguna semblanza, ni compone prosa, y no es superficie de lectura; `src/lib/atribucion.ts` gana la lista de superficies sin semblanza, que hoy no existe, y la cuenta en ella; no entra en `SUPERFICIES_DE_LA_SEMBLANZA`, que fija `tests/unit/semblanza.test.ts` (AD-19, AD-28) *(v8.2)*
**And** la lista lleva `/autores/` y su Tarjeta Social de los Directorios, y una prueba de Vitest la fija y exige sobre `dist/` que ninguna página de la lista contenga la `semblanza` de ningún Autor (AD-28) *(v8.2)*

**Given** la búsqueda interna
**When** se indexa la página
**Then** el listado entero va en `data-pagefind-ignore="all"` dentro de `main`, la página lleva el tipo `directorio` y responde por su título (NFR-13)
**And** buscar «autores» la devuelve, y buscar el nombre de un Autor devuelve su Página de Autor y no el Directorio
**And** los atributos se prueban en Vitest sobre `dist/`, y la búsqueda, en Playwright local

**Given** su Tarjeta Social de los Directorios, con su nombre entero *(v8.2)*
**When** se compone en el build (AD-15)
**Then** es la de listado, con banda siena, «Autores» en la familia de la interfaz y como bajada cuántos lista, con su unidad: «{m} autores», o «1 autor» en singular. No lleva prosa (UX-DR79)
**And** se sirve en `/tarjeta/directorio/autores.png`, fuera del espacio `/tarjeta/{slug}.png` de las Citas, y la página la declara como imagen social
**And** dos construcciones del mismo commit dan los mismos bytes

**Given** la declaración de Modelos de `src/lib/ingreso.ts`
**When** se revisa
**Then** `autores.astro` entra en `SUPERFICIES_SIN_INGRESO`, y `revisarDeclaracionDeIngreso` rechaza admitirle cualquier Modelo (AD-20; FR-34 y FR-37, sin trabajo)
**And** una prueba de Vitest construye una copia con todos los Modelos que alguna superficie admite encendidos —`producto-propio` y `publicidad-acotada` declaran `admitidoEn: []` y romperían el build—, como `tests/unit/ingreso-construido.test.ts` (AD-21), y exige `/autores/` idéntico byte a byte al de la misma copia con todos apagados, construidas las dos con el mismo `MEDICION_ENDPOINT` (FR-55, UX-DR110) *(v8.2)*

**Given** la relación de AD-27
**When** se declara `/autores/`
**Then** se compone de lo que pinta: el `nombre`, los años y `ordenAlfabetico` de cada Autor publicado y, por sus recuentos, las Citas publicadas
**And** la semblanza, la tradición, la biografía y `ordenRevisado` no la fechan. Una Cita nueva la fecha y una semblanza nueva no, y el aviso y el `lastmod` salen de esa relación
**And** la prueba de la 26.1 pasa a fijar que un commit que solo escribe `ordenAlfabetico` mueve solo `/autores/`, y que uno que solo escribe `ordenRevisado` sigue sin mover nada *(v8.2)*

**Given** las series por familia de `tools/`
**When** encuentran `/autores/`
**Then** no la cuentan en la familia Autor, porque el censo sale de lo publicado y no del prefijo de la ruta (FR-40)
**And** hasta que la 26.7 cree la familia `directorio`, queda fuera de toda familia, como la portada: en el tráfico y la demanda, en `fueraDelCenso`
**And** la prueba de `tests/unit/indexacion.test.ts` que compara el censo con `rutasPublicadas` la exime por su declaración en `superficies.ts`, nunca por el prefijo

**Given** la prueba de alcance sobre lo construido (`tests/unit/publicable-y-alcanzable.test.ts`, Vitest) y `tests/e2e/seo.spec.ts` (Playwright local), que toma lo publicado del sitemap y se pone en rojo entre la 26.3 y la 26.5 *(v8.2)*
**When** corren antes de que la 26.5 ponga la cabecera
**Then** `/autores/` va eximida por su ruta en las dos, con un comentario que lo explica, y ninguna otra superficie se exime; la 26.5 quita la exención de las dos *(v8.2)*
**And** el acoplamiento con una historia posterior lo aceptó Héctor el 2026-10-19: la rama no entra en la principal hasta la 26.11, así que ninguna exención llega al sitio en vivo

**Given** la medición de la Épica 23
**When** carga con `MEDICION_ENDPOINT`
**Then** emite `vista-de-superficie` y lectura (FR-56)
**And** las filas llevan la zona `directorio` en su contenedor; las letras y «Volver a las letras» son anclas de la misma página, una de las exenciones escritas (AD-13, UX-DR111) *(v8.2)*. La prueba de zonas de la 23.7 la cubre sin tocarla

**Given** el barrido de accesibilidad
**When** corre (Playwright local, WCAG 2.2 AA)
**Then** `/autores/` entra por su declaración y pasa sin violaciones (NFR-9)

### Story 26.4: Todas las Obras, bajo su Autor

As a visitante que quiere saber qué obras tiene el sitio,
I want una página con todas las Obras agrupadas bajo su Autor, por letras,
So that llegue a cualquier obra, también a la que el buscador no indexa, sin conocer antes una Cita suya.

**Acceptance Criteria:**

**Given** la **Historia 26.3** terminada
**When** empieza esta historia
**Then** las letras de salto, los grupos, «Volver a las letras» y el orden por la clave ya existen, y `/obras/` los reutiliza sin copiarlos

**Given** `src/pages/obras.astro`
**When** se declara
**Then** `src/lib/superficies.ts` la declara producto con la ruta literal `/obras/`, sin páginas 2+, con su constructor, con la vista `vista-de-superficie` y con las mismas consecuencias que `/autores/`; `rutasPublicadas` y `rutasIndexables` la enumeran (AD-17, AD-11, NFR-1)
**And** declara la misma superficie de línea base que `/autores/`, «los Directorios» (26.3), así que la orden de la 23.10 junta las lecturas de las dos sin tocarse y las informa también por separado (FR-56, AD-13) *(v8.2)*
**And** `/obras/` no es una Página de Obra: `esRutaDeObra('/obras/')` es falso, y ninguna regla de Obra la alcanza, ni FR-52, ni la congelación, ni las ediciones (FR-40, FR-55)

**Given** las Obras con al menos una Cita publicada
**When** se compone la lista
**Then** están todas las de `obrasPublicadas`, cada una una sola vez. Es el conjunto publicable y no `rutasIndexables`: también las que no se indexan y también con `CONGELACION_DE_OBRAS` declarada (AD-11, AD-25; FR-52, sin trabajo)
**And** una Obra sin Citas publicadas no figura, y un Autor sin ninguna Obra no tiene grupo (UX-DR109)
**And** la que no se indexa va exactamente igual que las demás, sin marca, clase ni color propio, y su enlace lleva a su página, que sigue con `noindex, follow` (UX-DR85)
**And** una prueba construye una copia con una congelación declarada y exige `/obras/` idéntico al del sitio sin ella
**And** otra prueba exige que la fila de una Obra con `noindex` tenga el mismo marcado que la de una indexable, salvo su enlace y su texto

**Given** los grupos
**When** se ordenan
**Then** bajo cada letra van los Autores con Obras, en el orden del Directorio de Autores. La letra es la inicial de la clave del Autor que encabeza el grupo, con la misma rejilla, los mismos grupos y el mismo «Volver a las letras» que en `/autores/` (FR-55, UX-DR82, UX-DR83)
**And** el nombre accesible de cada letra es «Obras de autores por la {letra}»
**And** la letra es `h2` y cada Autor, `h3` (UX-DR101)

**Given** la cabecera de grupo de un Autor
**When** se pinta
**Then** su nombre va en Source Serif al cuerpo y peso de `{typography.headline-sm}`, en `{colors.on-surface}` y subrayado siempre, y enlaza a su Página de Autor en la misma pestaña (UX-DR85, UX-DR105)
**And** el enlace es un bloque de 44 px de alto, su primera Fila de Obra queda a `{spacing.unit}` del bloque, y entre Autores hay 4 × `{spacing.unit}` (UX-DR102)

**Given** las Obras de cada Autor
**When** se pintan
**Then** son la Lista de Obras de la Página de Autor: el mismo componente (`src/components/ListaDeObras.astro`) y el mismo orden, recuento descendente, título y nombre de ficha (AD-25; FR-42, heredado)
**And** ese orden pasa a ser de `src/lib/obras.ts`, y `src/lib/publicado.ts` lo reexporta en vez de calcularlo en `obrasDelAutor`
**And** una prueba sobre `dist/` exige que, para cada Autor, la secuencia de Obras de su Página de Autor y la de su grupo en `/obras/` sean la misma
**And** cada fila lleva el título de su Ficha de Obra en Inter (`{typography.body-md}`, `{colors.on-surface}`), con el año si consta por la regla de FR-42 —omitido si discrepa, nunca el de una traducción, y escrito con `añoLegible`—, y sin traductor
**And** a la derecha, «27 citas» o «1 cita», en `{typography.caption}`, `{colors.on-surface-variant}` y cifras tabulares (UX-DR85, UX-DR104)
**And** si no caben, el título parte palabras y el recuento baja bajo él, sin encogerse; nunca se recorta (NFR-12, UX-DR103)
**And** la línea de Citas sin obra documentada sigue siendo solo de la Página de Autor: `/obras/` lista Obras

**Given** la Lista de Obras de la Página de Autor
**When** se sirve desde esta historia
**Then** enseña la unidad a la vista, «27 citas» o «1 cita», en vez de la cifra sola, y el lector de pantalla oye el recuento una sola vez (UX-DR85, UX-DR112)
**And** cambia lo construido de la Historia 17.3 sin enmendar su criterio, que dice «el recuento»
**And** el componente recibe su zona por prop: `lista-de-obras` en la Página de Autor y `directorio` en `/obras/` (AD-13, UX-DR111)

**Given** la página
**When** se sirve
**Then** su único `h1` es «Obras», con el trato del de `/autores/`, y su título de pestaña es «Obras, por autor | Sabiduría de Bolsillo», la plantilla literal de UX-DR80, sin «frases» en ningún texto (UX-DR80, UX-DR107) *(v8.2)*
**And** la meta description es «{k} obras de {m} autores, con {n} citas publicadas.», en singular cuando la cifra es una —«1 obra», «1 autor», «1 cita publicada»—, con la redacción que aprobó Héctor el 2026-10-19 (UX-DR107)
**And** su Tarjeta Social de los Directorios *(v8.2)* es la de listado, con «Obras» y la bajada «{k} obras» («1 obra» en singular), en `/tarjeta/directorio/obras.png` (UX-DR79, AD-15)
**And** el listado va en `data-pagefind-ignore="all"` y la página lleva el tipo `directorio`: buscar el título de una Obra indexable devuelve su Página de Obra, nunca `/obras/` (NFR-13)
**And** no reproduce ninguna Cita, semblanza ni nota de Ficha de Obra, y `src/lib/atribucion.ts` la cuenta, con su Tarjeta Social de los Directorios, en la lista de superficies sin semblanza que ganó en la 26.3, y la prueba de la 26.3 pasa a fijarla con ella; no entra en `SUPERFICIES_DE_LA_SEMBLANZA`, que fija `tests/unit/semblanza.test.ts` (AD-19, AD-28) *(v8.2)*

**Given** los Modelos de Ingreso
**When** se revisa la declaración y se construye
**Then** `obras.astro` entra en `SUPERFICIES_SIN_INGRESO` (AD-20)
**And** una prueba de Vitest construye una copia con todos los Modelos que alguna superficie admite encendidos —`producto-propio` y `publicidad-acotada` declaran `admitidoEn: []` y romperían el build—, como `tests/unit/ingreso-construido.test.ts`, con la afiliación con la tienda de prueba y ediciones declaradas en una ficha, y exige `/obras/` idéntico byte a byte al de la misma copia con todos apagados, construidas las dos con el mismo `MEDICION_ENDPOINT`, y sin ningún enlace de edición (FR-35, FR-55, UX-DR110) *(v8.2)*

**Given** el tamaño del HTML de `/obras/`
**When** termina el build (`astro:build:done`)
**Then** se mide, y si pasa del tamaño con nombre de `src/lib/umbrales.ts`, el build avisa sin romper: nombra el tamaño y dice que reabre paginar `/obras/`, aplazado (AD-9)
**And** el valor se fija en el mismo diff, con margen sobre el tamaño medido el día de construirla, y el mensaje del commit da esa medida

**Given** la relación de AD-27
**When** se declara `/obras/`
**Then** se compone de lo que pinta: el `titulo` de cada ficha con Citas, el `nombre` y `ordenAlfabetico` de cada Autor con Obras y, de las Citas, lo que da los recuentos y el año de cada Obra
**And** `nota`, `ediciones`, `distintaDe`, `ordenRevisado` y la semblanza no la fechan
**And** la prueba de la 26.1, que reescribió la 26.3, pasa a fijar que un commit que solo escribe claves de orden mueve `/autores/` y `/obras/` y nada más, aunque la 27 lleve la clave al `data-pagefind-sort` de cada Página de Cita, y que uno que solo escribe `ordenRevisado` no mueve nada (AD-27) *(v8.2)*

**Given** las series por familia y la prueba de alcance
**When** encuentran `/obras/`
**Then** reciben el mismo trato transitorio que `/autores/` en la 26.3: ninguna serie la cuenta como Obra, y hasta la 26.7 queda fuera de toda familia; la prueba de alcance (Vitest) y `tests/e2e/seo.spec.ts` (Playwright local) la eximen por su ruta hasta la 26.5 (FR-40) *(v8.2)*

**Given** la medición y el barrido
**When** corren
**Then** emite `vista-de-superficie` y lectura; las filas y las cabeceras de grupo llevan la zona `directorio` (FR-56, UX-DR111)
**And** el barrido 2.2 AA pasa en Playwright local (NFR-9)

### Story 26.5: La cabecera lleva a Autores, Obras y Buscar

As a visitante en cualquier página del sitio,
I want una cabecera que me lleve a todos los Autores, a todas las Obras y a la búsqueda,
So that desde donde haya llegado esté a dos toques de cualquier Autor u Obra, sin que la Cita deje la primera pantalla.

**Acceptance Criteria:**

**Given** las Historias **26.3** y **26.4** terminadas
**When** empieza esta historia
**Then** los dos Directorios existen, y la cabecera no enlaza a ninguna ruta que el build no construya

**Given** el armazón (`src/components/Armazon.astro`)
**When** pinta la cabecera
**Then** en toda superficie que lo usa dice «Sabiduría de Bolsillo · Autores · Obras · Buscar», con filete inferior `{colors.outline-variant}` y sin migas de pan (UX-DR54)
**And** la marca lleva a `/`, y una navegación «Principal» (`<nav aria-label="Principal">`) lleva los tres enlaces a `/autores/`, `/obras/` y `/buscar/`, compuestos con los constructores de `src/lib/superficies.ts` y en la misma pestaña (UX-DR106)
**And** la lista de los tres lleva `role="list"`; los dos puntos medios, en `{colors.on-surface-variant}`, llevan `aria-hidden` y dan el `{spacing.unit}` entre zonas (UX-DR101)
**And** en su página, el enlace lleva `aria-current="page"`: «Autores» en `/autores/`, «Obras» en `/obras/`, «Buscar» en `/buscar/` con cualquier parámetro, y la marca en la portada; en ninguna otra ruta
**And** una prueba en Vitest sobre `dist/` exige que toda página construida con el armazón lleve esos cuatro enlaces, en ese orden y con esos destinos, y `aria-current` solo donde toca

**Given** la marca
**When** se pinta
**Then** va en Inter al cuerpo, peso y espaciado de `{typography.author}` (13 px, 600 y 0,09em), en mayúsculas y en `{colors.on-surface}` (UX-DR54)
**And** es un enlace de bloque, subrayado solo al pasar el cursor, que va a su ancho: su zona de toque es su texto con 44 px de alto, no la fila entera
**And** sigue sin ser un `h1`; que lo sea en la portada es de la 28.1

**Given** los tres enlaces
**When** se pintan
**Then** van en `{typography.body-md}` y subrayados siempre: «Autores» y «Obras» en `{colors.on-surface}` y «Buscar» en `{colors.primary}` (UX-DR105)
**And** cada uno tiene una zona de toque de 44 × 44 px como mínimo y `{spacing.unit}` de relleno lateral (UX-DR102)

**Given** una ventana de menos de 600 px
**When** se pinta la cabecera
**Then** va en dos filas: la marca en la suya, y los tres enlaces debajo, alineados a la izquierda con el texto de la marca (el primero se retranquea sus 8 px de relleno) (UX-DR55)
**And** lleva `{spacing.unit}` de aire arriba, entre las filas y abajo, así que la zona de la marca queda a 8 px de las de los enlaces, a 320 como a 360 px (UX-DR102)
**And** desde 600 px va en una sola fila, la marca a la izquierda y los enlaces a la derecha, con 2 × `{spacing.unit}` de aire
**And** a 320 px con el texto al 200 %, los enlaces que no caben se parten en otra fila con 8 px entre filas, sin desplazamiento horizontal; ningún enlace lleva `white-space: nowrap` (NFR-8)
**And** el texto al 200 % se simula con zoom —la ventana sigue a 320 px y el ancho CSS queda a la mitad—, porque los cuerpos de `src/styles/tokens.css` están en px y subir la letra raíz no los movería; la prueba de esta historia (Playwright local) lo declara, y la 26.9 extiende la misma simulación a toda superficie (decisión de Héctor del 2026-10-19)

**Given** 360 × 640 y 320 px
**When** se mide sobre lo construido (Playwright local)
**Then** la cabecera mide unos 113 px en los dos anchos, y el texto de la Cita de la Página de Cita empieza dentro de la primera pantalla de 360 × 640, hacia los 153 px (FR-1, FR-55, NFR-8)
**And** las dos cifras medidas se anotan, con fecha, en el spec de la historia (`_bmad-output/implementation-artifacts/`) *(v8.2)*; si difieren de las de `DESIGN.md`, se llevan a la próxima pasada de `bmad-ux` y nunca se corrigen a mano

**Given** el teclado
**When** se recorre una página
**Then** el orden es «Saltar al contenido.», la marca, Autores, Obras y Buscar, y después `main`; los cuatro muestran el anillo global de foco (UX-DR54, UX-DR101)

**Given** la medición de la Épica 23
**When** se pulsa la marca o uno de los tres enlaces
**Then** se registra `salida-interna` con la zona `cabecera`, que va en el contenedor de la cabecera (UX-DR111)

**Given** el Kit Diario y el Lote
**When** se mira la cabecera
**Then** ningún enlace de la cabecera ni de los Directorios lleva a `/kit` ni a `/lote`; los dos conservan el armazón y siguen sin ningún enlace entrante (NFR-6)

**Given** el alcance (NFR-5)
**When** se recorre el sitio de prueba construido
**Then** toda Página de Autor y toda página 1 de Obra, también la que no se indexa, queda a dos saltos de la portada, por la cabecera y su Directorio, y una prueba en Vitest lo fija (FR-55)
**And** se quitan las exenciones por ruta que la 26.3 y la 26.4 dejaron para `/autores/` y `/obras/` en las dos pruebas: la de alcance (`tests/unit/publicable-y-alcanzable.test.ts`, Vitest) y `tests/e2e/seo.spec.ts` (Playwright local) *(v8.2)*

**Given** la Historia 2.1
**When** se cierra esta historia
**Then** esta historia realiza la enmienda de su criterio de cabecera, ya aplicada en su sitio (UX-DR112)
**And** su prueba de `tests/e2e/pagina-de-cita.spec.ts`, «la cabecera lleva solo marca y búsqueda», pasa a los cuatro enlaces `/`, `/autores/`, `/obras/` y `/buscar/`, sin migas de pan, y el comentario de UX-DR29 del armazón se pone al día

**Given** el barrido de accesibilidad
**When** corre (Playwright local)
**Then** la cabecera pasa WCAG 2.2 AA en toda superficie del barrido

### Story 26.6: El Directorio filtra al teclear, sin pensar en tildes

As a visitante que sabe a quién busca,
I want escribir parte del nombre y ver solo lo que casa, sin preocuparme de tildes ni mayúsculas,
So that encuentre a González Prada tecleando «gonzalez» y, si no está, el Directorio me ofrezca buscarlo entre las Citas.

**Acceptance Criteria:**

**Given** el filtro
**When** se construye
**Then** es el primer guion empaquetado de la v8: un `<script>` procesado por Astro que importa `normalizar` de `src/lib/normalizar.ts` sin copiarla ni reimplementarla, y que solo cargan `/autores/` y `/obras/` (AD-3, AD-6)
**And** `astro.config.mjs` fija `vite.build.assetsInlineLimit` como una función que devuelve `false` para los `.js` y deja lo demás a la regla por omisión
**And** una prueba sobre `dist/` exige que ningún guion procesado quede en línea. Antes de esta historia pasaba en vacío; el comportamiento se comprobó en Astro 7.2.0 y se reverifica al subir de versión (AD-6)
**And** entra en la lista cerrada de guiones externos de la 23.1, con su tope con nombre en `src/lib/umbrales.ts` (AD-6, NFR-7)
**And** el tope cuenta todo lo que el guion importa de forma estática, trozos compartidos incluidos, y se mide como los bytes que descarga al cargar cada página que lo lleva; pasarlo, o cargar un guion externo fuera de la lista, es fallo de prueba

**Given** el campo de filtro
**When** la isla lo inserta al cargar
**Then** es el Campo de búsqueda de la v8, que nace aquí y que reutilizan la 27 y la 28 (UX-DR58, UX-DR81, UX-DR104)
**And** lleva la etiqueta visible encima, en `{typography.caption}` y `{colors.on-surface-variant}`, a `{spacing.unit}`: «Escribe parte del nombre.» en `/autores/` y «Escribe parte del título o del autor.» en `/obras/`
**And** tiene un filete inferior de 1 px en `{colors.outline}`, sin caja, sombra ni icono, y lo tecleado va en Inter al cuerpo de `{typography.body-lg}` y en `{colors.on-surface}`
**And** con el foco lleva el anillo global y, además, el filete pasa a `{colors.primary}` y se engruesa. No tiene botón
**And** no lleva texto de ejemplo: la etiqueta ya es la instrucción y el recuento responde a la primera letra; la maqueta, que pone «Por ejemplo: gonzalez» y «Por ejemplo: quijote», no manda (UX-DR58) *(v8.2)*
**And** va a 3 × `{spacing.unit}` del `h1` y antes de las letras, sin hueco reservado: sin desplazar, las letras y la lista bajan lo que mide; con la página ya desplazada, el anclaje de desplazamiento del navegador deja en su sitio lo que el visitante tenía delante
**And** el orden de tabulación queda así: el campo, las letras y la lista (UX-DR101)

**Given** la región del recuento
**When** se sirve la página
**Then** está en el HTML inicial con `role="status"`, vacía, sin `hidden` y a la vista, a 2 × `{spacing.unit}` bajo el campo, en `{typography.caption}` y `{colors.on-surface-variant}` (UX-DR81, UX-DR99)
**And** vacía no ocupa alto, así que sin JavaScript no deja hueco entre el `h1` y las letras

**Given** lo tecleado
**When** cambia
**Then** la lista se repinta al momento con las filas cuyo texto normalizado contiene lo tecleado normalizado, por subcadena: en `/autores/`, el nombre; en `/obras/`, el título y el nombre de su Autor (FR-55, AD-3)
**And** «gonzalez» encuentra a Manuel González Prada, y «MARTÍ» y «marti», a José Martí
**And** el filtro pliega la eñe como la búsqueda, aunque las letras la traten como propia: en `/obras/`, «espana» encuentra «Historia de la decadencia de España» *(v8.2)*
**And** con el Corpus del 2026-10-18, «mar» dejaba 14 Autores, con Josefa Amar y Borbón. La prueba compara con lo que da `normalizar` sobre la lista construida, nunca con una cifra
**And** las pruebas toman los ejemplos del Corpus que sirve Playwright, nunca de una lista vacía: una comparación como «espana» frente a «españa» sobre dos listas vacías pasaría en vacío *(v8.2)*
**And** un texto que normaliza a vacío, como espacios o signos sueltos, cuenta como el campo vacío

**Given** el filtro con texto
**When** quedan coincidencias
**Then** las letras de salto y todos los «Volver a las letras» se apartan; un grupo sin coincidencias desaparece entero, con su letra, y el que queda la conserva (UX-DR81)
**And** en `/obras/`, la cabecera de un Autor se queda mientras alguna de sus Obras case, aunque su nombre no case; si casa su nombre, quedan todas sus Obras (UX-DR85)
**And** tras la pausa de tecleo, unos 700 ms sin teclear, la región dice «14 autores.» o «1 autor.», «13 obras.» o «1 obra.», y solo si la frase cambió: dos tecleos que dan la misma cifra no la repiten (UX-DR81, UX-DR99) *(v8.2)*
**And** la pausa tiene nombre en `src/lib/umbrales.ts` y la reutilizará `/buscar/` en la 27 (AD-9)
**And** es el segundo ritmo de la convención de mensajes, con el mismo dueño en `src/lib/` que el primero; el guion lo importa, nunca por `define:vars` ni copiado

**Given** el filtro a cero
**When** nada casa
**Then** no quedan letras ni lista, y la región dice «Ningún autor tiene «{lo tecleado}» en el nombre.» o «Ninguna obra tiene «{lo tecleado}» en el título ni en su autor.»; nunca «0 autores.» sin más (UX-DR86)
**And** debajo, a `{spacing.unit}`, la isla compone «Buscar «{lo tecleado}» en las citas», hacia `/buscar/?q=` con lo tecleado codificado, en la misma pestaña (UX-DR86, UX-DR106)
**And** ese enlace va en `{typography.body-md}` y `{colors.primary}`, subrayado y con 44 px de zona, y hereda la zona `directorio` de su contenedor (UX-DR102, UX-DR105, AD-13)
**And** lleva a la `/buscar/` de hoy, sin depender de la 27; la búsqueda sin resultados ofrecerá los Autores destacados cuando la 27 los construya
**And** lo tecleado entra en la frase de la región y en el texto del enlace como texto, por `textContent`, nunca como HTML: con `<img src=x onerror=…>` tecleado, la frase lo enseña escrito tal cual y no se ejecuta nada, y una prueba de Playwright local lo fija; es la misma regla que la 27.4 pone a `/buscar/` *(v8.2)*

**Given** el campo
**When** se vacía
**Then** la región se vacía, y vuelven la lista entera, las letras y los «Volver a las letras» (UX-DR81)

**Given** un navegador sin JavaScript, o un guion que no llega a cargar
**When** se abre un Directorio
**Then** no hay campo, la lista está entera y las letras funcionan: nada se alcanza solo filtrando (NFR-2, UX-DR109)

**Given** las pruebas
**When** corren
**Then** Vitest fija sobre `dist/` la región vacía en el HTML inicial, la lista entera sin guion, el guion como fichero y su tope
**And** Playwright local fija el casado, los grupos y las letras que se apartan, el recuento tras la pausa y solo si cambia, la frase a cero con su enlace y su zona, el anclaje del desplazamiento y que el campo no lleva `placeholder` *(v8.2)*
**And** el barrido 2.2 AA pasa con el campo puesto, con texto y a cero

### Story 26.7: Los Directorios se miden como familia propia

As a Héctor,
I want que `/autores/` y `/obras/` cuenten aparte en cada serie,
So that dos URL de índice no falseen el reparto de las familias de Autor y de Obra mientras se juzga SM-11.

**Acceptance Criteria:**

**Given** el conjunto cerrado de familias
**When** se muda
**Then** vive en `src/lib/superficies.ts` con seis valores: `cita`, `autor`, `tema`, `coleccion`, `obra` y `directorio`, uno para los dos Directorios (AD-17)
**And** deja de declararse en `FAMILIAS` y `FAMILIAS_DE_LA_SERIE` de `tools/lib/indexacion.ts` y en `FamiliaAvisable` de `tools/lib/avisar.ts`, que lo importan de ahí
**And** cada serie declara su subconjunto como constante con nombre derivada de él; el aviso declara dos en `tools/lib/avisar.ts` —las familias de fichero, las cinco con directorio en el Corpus más `documento`, de `corpus/fuentes/`, con `src/lib/umbrales.ts` sin familia, y las seis familias de ruta—; la medición no declara ninguno, porque agrega por superficie. La prueba de cada serie (Vitest) fija que su constante es subconjunto de las seis, no la igualdad; la del aviso fija sus dos constantes enteras (AD-17, AD-24, AD-27) *(v8.2)*
**And** la indexación toma las seis; el tráfico, la demanda, el rastreo y el canal, todas menos `obra`, como hoy
**And** la familia de una ruta avisada la pone su entrada en la relación, nunca el fichero ni el prefijo; los Directorios, que no tienen fichero propio, entran por sus páginas, y la portada se avisa siempre, sin familia, y se informa aparte; una prueba de Vitest sobre `relacionDeSuperficies` fija que una Cita nueva con Obra avisa `/autores/` y `/obras/` con la familia `directorio`, y la portada sin familia (AD-27) *(v8.2)*
**And** los tipos de resultado de `src/lib/tipoDeResultado.ts` son las familias con resultado más `portada`, y la prueba de la 26.2 pasa a fijarlo así (AD-17)
**And** `NOMBRE_DE_FAMILIA` gana «Directorio»

**Given** la familia de una URL
**When** se resuelve en cualquier serie
**Then** sale del censo, nunca del prefijo de la ruta: `/autores/` y `/obras/` son `directorio`, `/obras/` no es una Obra y `/autores/` no es un Autor (FR-40, AD-24)
**And** `censoPorFamilia` los da en `directorio`, y la prueba de `tests/unit/indexacion.test.ts` que compara el censo con `rutasPublicadas` deja de eximirlos: solo exime la portada, y la Obra por su censo de sitemap

**Given** `npm run indexacion`
**When** lee la serie
**Then** mide `directorio` con su censo de lo publicado y la anota con `censo: publicadas`; son dos URL, así que se lee entera, por debajo de `MUESTRA_MINIMA_POR_FAMILIA` (AD-24)
**And** mientras rija SM-11, Autor y Obra se siguen leyendo enteras, y el Directorio no les quita suelo
**And** una lectura fallida va a `sinLeer` con su motivo, jamás a cero, y las entradas anteriores, sin `directorio`, se siguen leyendo

**Given** `npm run trafico` y `npm run demanda`
**When** agregan por familia
**Then** cuentan `directorio` como familia; como cada pasada reatribuye los meses pasados con el censo de hoy, lo que de esas dos URL estaba en `fueraDelCenso` pasa a ella
**And** la Obra sigue sin contarse en ninguna de las dos (AD-24)

**Given** `npm run rastreo -- --registrar`
**When** recibe `/autores/` o `/obras/`
**Then** los anota, y la consulta los cuenta en `directorio`
**And** con la familia Obra congelada, `/obras/` se acepta, porque no es una Obra (FR-40)

**Given** `npm run canal`
**When** anota o consulta una publicación o una señal que enlaza a un Directorio
**Then** la acepta y la desglosa como «Directorio», nunca como «otra», como Autor ni como Obra

**Given** SM-C2
**When** se calcula
**Then** no cambia: su mediana cuenta Temas y Colecciones, y los Directorios no son ninguno de los dos (sin trabajo)

**Given** cualquiera de estas órdenes
**When** falla
**Then** conserva sus códigos: 2 por la credencial o la forma de la invocación, y 1 por lo que dice; ninguna escribe cero por un fallo, y ningún módulo de `src/` lee las series (AD-24)

### Story 26.8: Ninguna Cita queda a más de tres saltos, y el build lo comprueba

As a Héctor,
I want que el build rompa si una página publicada queda a más de tres saltos de la portada, con un veredicto que no cambie con la jornada,
So that quitar la lista de Autores de la portada o retirar una Cita no deje nada fuera de alcance sin que nadie lo vea.

**Acceptance Criteria:**

**Given** la **Historia 26.5** terminada
**When** empieza esta historia
**Then** la cabecera enlaza los dos Directorios desde toda página, y el grafo ya tiene esa arista

**Given** los bloques que rotan con la jornada
**When** se marcan
**Then** llevan una sola marca, `data-jornada`, que pone un solo componente. Hoy son la Cita del Día de la portada y la del 404, con su «Ver esta cita» (AD-12, UX-DR108)
**And** el atributo `data-jornada` que hoy pone `src/pages/lote.astro` en cada sección de jornada, con la fecha por valor, se renombra en el mismo commit, por ejemplo a `data-dia-del-lote`, junto con su prueba `tests/unit/lote-construido.test.ts`. El Lote enseña lo mismo que antes
**And** una prueba sobre `dist/` exige que `data-jornada` solo salga de ese componente

**Given** el `dist/` real
**When** termina el build (`astro:build:done`)
**Then** `superficiesInalcanzables` de `src/lib/publicado.ts` recorre desde `/` el grafo de enlaces internos, y rompe si una superficie de `rutasPublicadas` queda a más de `MAX_SALTOS_DESDE_LA_PORTADA` (3) saltos (NFR-5, AD-11)
**And** cuenta también la Obra que no se indexa. Mide el conjunto publicable y no `caracterDe(ruta) === 'producto'`, que es lo que mide hoy `tests/unit/publicable-y-alcanzable.test.ts`
**And** el grafo se lee sin los subárboles `data-jornada` e ignorando `<template>` y `<noscript>`, porque solo cuenta un enlace que está en el HTML con guion y sin él
**And** al romper nombra cada superficie y, si la causa es un Tema que cayó bajo `MIN_CITAS_POR_TEMA`, ese Tema y cuántas Citas tiene
**And** el tope no se relaja

**Given** el grafo del modelo
**When** se compone
**Then** lo compone una sola función de `src/lib/publicado.ts`, desde las mismas enumeraciones que pintan las páginas (AD-11)
**And** cada arista sale de la enumeración que la pinta, nunca de una lista aparte: la portada hacia los Temas, las Colecciones y los Directorios; la cabecera de toda página; cada Tema hacia sus páginas y de cada página a sus Citas, y así cada listado con todos sus números de página; cada Autor hacia sus Obras y sus Citas; y los Directorios hacia sus Autores y sus Obras (AD-11) *(v8.2)*
**And** el build comprueba que el grafo de `dist/` contiene el del modelo: si una plantilla deja de pintar una arista del modelo, como un número de la Paginación o una fila de un Directorio, rompe y la nombra

**Given** las órdenes que retiran —`npm run documentar -- --retirar`, `npx tsx tools/autor.ts retirar`, `npm run coleccion -- quitar`, `npm run coleccion -- despublicar` y `npx tsx tools/tema.ts quitar`—
**When** dejarían una Cita a más de tres saltos en el grafo del modelo del Corpus resultante
**Then** se niegan con código 1, sin mover ni escribir nada, y nombran la Cita y, si es el caso, el Tema que caería bajo su umbral (NFR-5, AD-11)
**And** un retiro que no deja a nadie fuera sigue como hoy, con sus códigos de siempre
**And** `autor retirar` ya se niega con 1 si el Autor tiene Citas publicadas (`retirarAutor`), así que su negativa de NFR-5 no tiene caso que montar en la prueba *(v8.2)*

**Given** `npx tsx tools/revisar.ts --aprobar` o `npx tsx tools/alta.ts`, las dos órdenes que publican en `corpus/citas/`
**When** una Cita aprobada o dada de alta no tendría ningún Tema publicado
**Then** la orden se niega a publicarla con 1, sin escribirla, y nombra la Cita y los Temas que declara con su recuento (NFR-5, AD-11) *(v8.2)*
**And** cuenta las Citas que aprueba la misma pasada: aprobar la decimoquinta Cita de un Tema lo publica, y se admite

**Given** dos construcciones del mismo commit en jornadas distintas (`FECHA_JORNADA`)
**When** corre la prueba de las dos jornadas (Vitest)
**Then** los veredictos son los mismos: las dos construyen o las dos rompen, con los mismos avisos (AD-12)
**And** el HTML de toda página es idéntico byte a byte salvo la portada, el 404, `/kit` y `/lote`, y en la portada y el 404 solo difieren sus subárboles `data-jornada`
**And** las jornadas se eligen para que la Cita del Día cambie; si no, la prueba no probaría nada
**And** los ficheros que no son páginas, como `rss.xml`, el canal de la Cita del Día, quedan fuera de la comparación, que es de HTML; el sitemap es idéntico
**And** el 404 se trata como la portada, porque conserva su Cita del Día y esta rota (AD-12, UX-DR108; decisión de Héctor del 2026-10-19) *(v8.2)*

**Given** la reconstrucción diaria
**When** cambia la Cita del Día sin ningún commit
**Then** la puerta de NFR-5 da el mismo veredicto que el día anterior (AD-12)

**Given** `tests/e2e/seo.spec.ts`
**When** recorre el sitio servido
**Then** sigue midiendo lo mismo en Playwright local; la puerta del build no la sustituye

### Story 26.9: Ninguna página obliga a desplazarse en horizontal a 320 px

As a visitante con un móvil pequeño, con el texto ampliado o con mi propio espaciado,
I want que ninguna página me obligue a desplazarme de lado,
So that pueda leer y pulsar todo con una mano.

**Acceptance Criteria:**

**Given** el barrido móvil de `tests/e2e/accesibilidad.spec.ts` (Playwright local)
**When** corre a 320 px de ancho
**Then** en toda superficie pública del barrido —la muestra que da `superficiesDelBarrido`, que ya incluye los Directorios, más las cuatro caras de la Página de Obra de la 22.4— el `scrollWidth` no pasa del ancho de la ventana, porque 1.4.10 no tiene regla en axe (NFR-8, AD-17)
**And** se comprueba en tres condiciones: con el texto por omisión, con el texto al 200 % y con el espaciado de 1.4.12 (interlineado 1,5, párrafos a 2 em, letras a 0,12 em y palabras a 0,16 em) (UX-DR103; WCAG 1.4.4, 1.4.10 y 1.4.12)
**And** el texto al 200 % se simula con zoom —la ventana sigue a 320 px y el ancho CSS queda a la mitad—, porque los cuerpos de `src/styles/tokens.css` están en px y subir la letra raíz no los movería; la prueba lo declara (decisión de Héctor del 2026-10-19)
**And** la comprobación de 360 px de la Historia 2.8 se queda

**Given** la Paginación con más páginas del `dist/`, hoy la de `/tema/el-saber/`, de 12 (decisión de Héctor del 2026-10-19)
**When** se mide a 360 px
**Then** sus números miden 44 × 44 px y quedan a `{spacing.unit}` entre zonas en la fila y también entre filas
**And** el listado se elige por su número de páginas entre Autor, Tema, Colección y Obra, no por su nombre; la prueba de la 22.10, que tomaba el Autor con más páginas, pasa a él
**And** a 320 px, en las tres condiciones, no desborda

**Given** la cabecera, las rejillas y los títulos de Obra
**When** se miden en esas condiciones
**Then** los enlaces de la cabecera se parten en otra fila, y las letras de salto se reajustan sin deslizar (UX-DR103, NFR-12)
**And** todo título de Obra que comparte fila con algo —en la Tarjeta de Obra de la 24, en el Directorio de Obras y en la Lista de Obras— parte palabras, y la fila crece con él
**And** ningún enlace, botón, campo, selector ni encabezado visible calcula `white-space: nowrap`

**Given** un fallo del barrido
**When** se corrige
**Then** se corrige en lo construido, también en lo de la Épica 24 dentro de la rama conjunta, y nunca relajando la prueba ni cambiando el ancho

**Given** la fusión de la rama conjunta
**When** se prepara (Historia 26.11)
**Then** este barrido es puerta también de la Épica 24, que no tiene otro reflujo a 320 px

### Story 26.10: Una persona revisa las claves de orden *(operativa, no bloquea)*

As a Héctor,
I want revisar cuando pueda las claves de orden que propuso la herramienta,
So that el Directorio ordene bien los casos que ninguna regla resuelve, sin haber parado nada mientras tanto.

**Acceptance Criteria:**

**Given** `npx tsx tools/autor.ts listar`
**When** lo corre
**Then** ve cada Autor con su clave, «sin revisar» donde no hay `ordenRevisado`, y cuántos faltan

**Given** los casos en que la última palabra del `nombre`, que es la clave propuesta (26.1), no ordena bien —Manuel González Prada cae en la P, Benito Pérez Galdós en la G, Emilia Pardo Bazán en la B, Santiago Ramón y Cajal en la C, Alfonso X el Sabio en la S, y Marco Aurelio en la A, que con dos palabras no sale marcado—, cerca de cuarenta hasta que se revisan *(v8.2, Héctor, 2026-10-23)*
**When** decide cada uno, empezando por los nombres de tres palabras o más que el parte del lote marca aparte *(v8.2, Héctor, 2026-10-23)*
**Then** confirma con `npx tsx tools/autor.ts clave <slug>` o corrige con `npx tsx tools/autor.ts clave <slug> "<clave>"`, y la orden valida la clave y escribe `ordenRevisado`
**And** nunca edita la ficha a mano

**Given** las claves revisadas
**When** las commitea
**Then** van en commits propios: uno que cambia claves mueve solo las fechas de `/autores/` y `/obras/`, y uno que solo confirma no mueve ninguna (AD-27)

**Given** que la revisión no bloquea
**When** se planifica
**Then** no la esperan ni la publicación, ni la siembra, ni el merge de la 26.11, y puede hacerse antes o después del despliegue (FR-15)
**And** ningún agente revisa claves ni escribe `ordenRevisado`

**Given** una corrección después del despliegue
**When** se construye otra vez
**Then** el Directorio la refleja, y ninguna URL cambia, porque ninguna ruta depende de la clave

**Given** la historia
**When** se cierra
**Then** se cierra cuando Héctor ha revisado las claves de los Autores que existían al correr el lote de la 26.1 sobre la rama al día (26.11); las de los Autores que la siembra dé de alta después se revisan en su sesión de sembrado, sin reabrir esta historia *(v8.2, Héctor, 2026-10-23)*, por el paso que la 26.1 añade a `AGENTS.md` § Una sesión de sembrado *(v8.2)*
**And** `epic-26` pasa a hecha sin esperar a esas altas *(v8.2, Héctor, 2026-10-23)*

### Story 26.11: La Obra y los Directorios llegan juntos al sitio en vivo, y su fecha queda escrita *(operativa)*

As a Héctor,
I want fusionar la Épica 24 y la 26 de una vez, comprobadas en local, y dejar escrita la fecha en que llegaron al sitio en vivo,
So that la Obra y el Autor ganen sus enlaces internos el mismo día y SM-11 se juzgue sabiendo cuándo.

**Acceptance Criteria:**

**Given** la Épica 23 ya en la principal
**When** empieza esta historia
**Then** la principal está en verde, y `src/lib/umbrales.ts` declara ya `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS: string | undefined = undefined`, que añadió 64b1bf0d tras la reparación de la publicación, en vivo desde el 2026-10-19, y `desplieguesQueMuevenSm11` de `tools/lib/indexacion.ts` la nombrará en la línea SM-11 en cuanto tenga valor *(v8.2)*

**Given** la rama conjunta, al día con la principal
**When** se prepara
**Then** se vuelve a correr la orden de lote de claves de la 26.1 para los Autores que la siembra dio de alta en la principal mientras tanto, y se commitea lo que proponga; sin ese paso, el build de la principal rompería por un Autor publicado sin clave
**And** se corren a mano sobre la rama `npm run build`, `astro check` y `npm test` (Vitest), lo mismo que el CI, que solo corre en la principal, y pasan *(v8.2)*

**Given** la rama construida con la medición puesta contra un receptor local (`wrangler dev` con D1 local), nunca contra el D1 de producción *(v8.2)*
**When** se corre a mano `npm run test:e2e` entero (Playwright local), porque el CI no lo corre *(v8.2)*
**Then** pasa entero, con el barrido WCAG 2.2 AA (23.4), el reflujo a 320 px en sus tres condiciones con la Paginación de 12 páginas (26.9), la prueba que fija el medio del tipo (26.2), las de la cabecera y el filtro (26.5 y 26.6) y las de la Épica 24 *(v8.2)*
**And** el resultado se anota, con fecha, en el spec de la historia (`_bmad-output/implementation-artifacts/`) *(v8.2)*

**Given** una Página de Cita con la cabecera y la Tarjeta de Obra puestas, construida con la medición puesta contra un receptor local *(v8.2)*
**When** se mide a mano NFR-7, con Lighthouse en perfil móvil 4G, frente a la principal del mismo día y sin puerta automática *(v8.2)*
**Then** el contenido principal sigue visible en menos de 2,5 s (NFR-7), y las dos cifras se anotan en el spec *(v8.2)*
**And** la principal se mide construida y servida igual, en local y con la medición contra un receptor local: nunca se mide el sitio en vivo, cuyo guion de medición escribiría en el D1 de producción *(v8.2)*
**And** si se degrada, el merge espera a que Héctor decida *(v8.2, Héctor, 2026-10-23)*

**Given** la relación de AD-27, leída por `tools/` sobre el rango sin desplegar
**When** se consulta con `tools/avisar.ts --ensayo --desde … --hasta …` (24.8) *(v8.2)*
**Then** dice cuántas fechas mueve una sesión de siembra con la v8 puesta, y se anota en el spec antes de fusionar (AD-27) *(v8.2)*

**Given** todo lo anterior
**When** Héctor fusiona
**Then** la rama entra en la principal en un solo merge, que el CI de la principal construye en verde; ninguna historia de la 24 ni de la 26 entra suelta, salvo la 24.2, que entra sola en la principal en cuanto Héctor da sus dos valores, como excepción declarada a la fusión por épica *(v8.2, Héctor, 2026-10-23)*
**And** lo fusiona Héctor: un agente puede correr y anotar las pruebas, nunca fusionar *(v8.2)*

**Given** el despliegue
**When** llega al sitio en vivo
**Then** se comprueba en vivo, sin ejecutar JavaScript, que la cabecera lleva los cuatro enlaces y que `/autores/` y `/obras/` responden y están en el sitemap publicado: con peticiones HTTP —`curl`— del HTML de una página, de `/autores/`, de `/obras/` y de `sitemap-0.xml`, que no emiten balizas *(v8.2)*
**And** no se abre ninguna página en un navegador, porque su guion de medición escribiría en el D1 de producción, como dice la 27.9: siguen siendo dos, y ninguna más, las pasadas que escriben allí, la 25.3 y la 25.7, y la 26 no añade ninguna entrada a su constante de `umbrales.ts` *(v8.2)*
**And** en un commit aparte del día en que llega, Héctor da valor a `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS`: la jornada UTC en que termina el trabajo «Desplegar» de Actions, no la del merge (decisión de Héctor del 2026-10-19). De ella se compone la segunda entrada de `CORTES_DE_SM8`, que la 23.10 ya declara, sin escribir ninguna fecha más, porque los Directorios emiten vista; el tramo nuevo de SM-8 empieza la jornada siguiente, la primera UTC completa tras la llegada, y la de llegada se informa aparte, como «cambió» *(v8.2)*
**And** la línea SM-11 de `npm run indexacion` la nombra («Despliegues que mueven la comparación»), como fija `tests/unit/indexacion.test.ts` (AD-24) *(v8.2)*

**Given** SM-4 de los Directorios
**When** se juzga
**Then** se lee con la orden de la 23.10, con `/autores/` y `/obras/` como una sola superficie para la línea base y por separado en el informe *(v8.2)*
**And** frente a su línea base se juzga solo después de que Héctor dé por buena la comparación por firma de esa línea base (23.10) *(v8.2)*, y él lo anota en `DESPLIEGUE.md` §3, con fecha y métrica *(v8.2, Héctor, 2026-10-23)*
**And** si llega antes de que su continuación tenga línea base, se juzga contra su propia serie, por las ventanas de la 23.10, y se dice *(v8.2, Héctor, 2026-10-23)*; nunca contra el 1,8, que está en suspenso

**Given** SM-C5 *(v8.2)*
**When** se juzga la Épica 24
**Then** salta si en dos ventanas seguidas de la 23.10 la continuación de la Página de Cita sube y SM-5 baja, cada una frente a su línea base; frente a su línea base se juzga solo después de que Héctor dé por buena la comparación por firma de esas líneas base (23.10), y él lo anota en `DESPLIEGUE.md` §3, con fecha y métrica *(v8.2, Héctor, 2026-10-23)*
**And** si la 24 llegó antes de esa línea base, las ventanas se cuentan desde su llegada y frente a la serie propia de cada métrica, y se dice
**And** saltar no apaga nada: la palanca, poner la Tarjeta de Obra detrás de las acciones, la decide Héctor

## Epic 27: Buscar con filtros

Quien busca acota por Autor, por una Obra de ese Autor —también las que no se indexan— y por Tema, con texto o sin él. La búsqueda vive en la dirección y se comparte, «atrás» devuelve la anterior, y los resultados llegan de 30 en 30, con su recuento anunciado y cada Cita con su Autor. Desde la página 1 de una Obra, de un Autor o de un Tema se entra con «Buscar en…» y el filtro puesto, sin que ninguna combinación cree una página indexable. La pantalla sin resultados ofrece los ocho Autores con más Citas, con el suelo latinoamericano garantizado, y sin JavaScript la página lo dice y lleva a los Directorios. Héctor sabe cuántas búsquedas acaban en un resultado pulsado (SM-13) y cuántas se quedan a cero (SM-6).

**FRs covered:** FR-7, FR-8 *(enmendados)*; FR-4, FR-6 *(«Buscar en…»)*, FR-51 *(«Buscar en esta obra»)*; NFR-1 *(`/buscar/` con parámetros)*, NFR-2, NFR-4 y NFR-13 en lo que añade; FR-37, FR-52 *(sin trabajo)*; SM-6 y SM-13 *(las juzgan)*.
**Notas de implementación:** depende de la 23 y de la 26 como dice la Epic List v8; rama propia, que entra en la principal en un solo merge después de la 24 con la 26, antes o después de la 25. La **27.1** va primero, porque sin filtros, metadatos ni clave escritos en la Página de Cita toda prueba de Pagefind pasaría en vacío; la **27.2** muda la búsqueda a su guion empaquetado, y de ella salen la 27.3 y la 27.5; la 27.4 y la 27.6 van tras la 27.3, porque la 27.6 nombra la Obra en sus frases; y la 27.7 y la 27.8, tras la 27.4, porque la 27.7 distingue el filtro que ya no existe del mapa que no llega. La **27.9**, operativa y acto de Héctor, va la última y cierra la épica: la lleva al sitio en vivo y deja escrita su jornada de llegada *(v8.2, Héctor, 2026-10-23)*; lo prueba todo sobre la rama contra un receptor local y, tras el merge, solo anota esa jornada: no comprueba nada en el sitio en vivo, que escribiría en el D1 de producción, y siguen siendo dos, y ninguna más, las pasadas que escriben allí, la 25.3 y la 25.7 *(v8.2, Héctor, 2026-10-24)*. SM-6 y SM-13 se leen con la orden de la 23.10: esta épica solo pone los filtros en `busqueda`, y la 27.9 deja escrita la jornada desde la que se cuentan sus ventanas *(v8.2, Héctor, 2026-10-24)*. **Para fusionar:** el CI en verde —build, `astro check` y Vitest, que cubre los atributos de `dist/`— y `npm run test:e2e` entero —Playwright local, que el CI no corre— sobre la rama construida con la medición contra un receptor local, con lo que llama a Pagefind —recuentos de `filters()`, orden de `search(null, …)` y la prueba del medio del tipo de la 26.2 con los metadatos nuevos—, el historial de `/buscar/` con la caché de atrás y adelante y sin ella, y el barrido WCAG 2.2 AA con el reflujo a 320 px *(v8.2)*; lo cierra la 27.9, que mide NFR-7 a mano con Lighthouse en `/buscar/` y en una Página de Cita, frente a la principal del mismo día, las dos construidas en local con la medición contra un receptor local *(v8.2, Héctor, 2026-10-24)*, y si empeora el merge espera a que Héctor decida; un agente nunca fusiona *(v8.2, Héctor, 2026-10-23)*. Las tres preguntas que heredaba las resolvió Héctor el 2026-10-19, y cada una va en los criterios de su historia (27.4, 27.6 y 27.8); los Directorios del aviso de `/buscar/` van también exentos de zona (decisión de Héctor, 2026-10-22; 27.7) *(v8.2)*. Fuera: trocear los filtros y el mapa de rótulos (aplazado; aquí solo su aviso), el autocompletado (`[NON-GOAL]` de FR-7) y toda página de intersección (NFR-13). De lo viejo, la 3.1 ya está enmendada en su sitio y la 27.2 la amplía; el criterio de emisión de la 3.2 lo sustituyó la 23.8, y su «menos palabras» lo acota la 27.6; la 4.3 no se enmienda, y su botón lo pone la 27.8. **Preguntas abiertas:** qué reuniones de Obra se aplican ya publicadas sus URL, cada una de las cuales deja sin su filtro las búsquedas compartidas con la absorbida (Héctor). Las frases de los filtros que no se pueden usar y el aviso de `/buscar/` antes de que arranque los cerró la UX v8.2, y AD-9 v8.2 mide ya tras Pagefind *(v8.2)*.

### Story 27.1: Cada resultado de Cita lleva su Autor, y la Cita declara sus filtros

As a visitante que busca una frase entre las citas,
I want ver bajo cada resultado de Cita de quién es,
So that sepa qué abro antes de abrirlo, y la búsqueda pueda acotarse por Autor, Obra y Tema.

**Acceptance Criteria:**

**Given** la Página de Cita (`src/pages/cita/[slug].astro`)
**When** se construye
**Then** un solo componente, que solo usa esa página, escribe sus filtros de Pagefind, su metadato `autor` y su `data-pagefind-sort`, fuera de todo bloque reutilizable —`BloqueDeCita`, la Atribución, la Tarjeta de Obra, la Tarjeta de Cita— y nunca dentro de un `data-pagefind-ignore="all"`, que los descartaría (AD-11)
**And** los valores salen de una sola función de `src/lib/publicado.ts`, que esta historia crea y que compone también las opciones de filtro de `/buscar/`: `autor` es el slug de su Autor, `obra` el nombre de la ficha de su Obra resuelta (`cita.obra.nombre`) y `tema`, uno por cada Tema publicado de la Cita (AD-11, AD-25)

**Given** el valor de `obra`
**When** se escribe
**Then** es el nombre de la ficha, que no se recalcula nunca, y no su título: retitular una Obra no cambia el filtro de ninguna de sus Citas, y dos Obras con el mismo título de dos Autores no comparten valor (AD-25, NFR-4)

**Given** una Cita sin Obra resuelta —también la de obra «…», cuya forma canónica es vacía y no tiene ficha—
**When** se construye
**Then** no lleva filtro `obra`, y su clave cae en el hueco declarado «sin Obra», detrás de las Obras de su Autor
**And** las Citas sin Obra de un mismo Autor van entre sí por slug, para que el orden sea estable (AD-25)

**Given** una Cita con un Tema por debajo de `MIN_CITAS_POR_TEMA`
**When** se construye
**Then** ese Tema no es valor de su filtro `tema`: lo son solo sus Temas publicados (FR-7, UX-DR109)

**Given** `data-pagefind-sort`
**When** lo compone `src/lib/obras.ts`
**Then** es un ordinal entero de ancho fijo con tres rangos: el orden del Directorio del Autor, de la función hermana de `normalizar.ts` (26.1, AD-3); el de su lista de obras (AD-25); y el del libro (24.1)
**And** va en **toda** Página de Cita, con un hueco declarado para «sin Obra» y otro para «sin documento» —el de las Citas de una Obra sin documento, que van detrás de las documentadas y por slug—: es la excepción declarada a la convención de ausencia, porque Pagefind saca de los resultados ordenados a la página que no lleva la clave (AD-25)
**And** dos Citas no comparten clave, para que las tandas recorran un orden estable, y un rango que no cabe en su ancho rompe el build nombrándolo: un desbordamiento callado ordenaría mal sin que nada fallara

**Given** el metadato `autor` de la Cita
**When** Pagefind lo indexa
**Then** lleva el nombre de su Autor, y su peso en `ranking.metaWeights` es 0, declarado junto al del tipo de la 26.2 y nunca por omisión: el nombre ya está en el cuerpo indexado, por la Atribución, y no puntúa dos veces (AD-17)
**And** la prueba de búsqueda de la 26.2, que fija que el tipo no casa como texto, sigue pasando con él

**Given** un resultado de tipo Cita en `/buscar/`
**When** se pinta
**Then** lleva debajo el nombre de su Autor, en `{typography.author}` y `{colors.on-surface-variant}`, como el de Obra, y se lee «Cita: «{texto}», {Autor}»: solo la pausa entre las dos líneas, sin «de» (FR-7, UX-DR91) *(v8.2)*
**And** lo pinta el mismo código que ya pinta el Autor del resultado de Obra (Historia 22.7); sin metadato `autor`, no hay línea ni pausa *(v8.2)*
**And** `/buscar/` sigue bajo `MAX_BYTES_DE_GUION` (AD-6)

**Given** el `dist/` construido, en Vitest y por tanto en el CI
**When** se recorre
**Then** fuera de la Página de Cita ningún HTML lleva los filtros `autor`, `obra` ni `tema`, ni `data-pagefind-sort` (AD-11)
**And** el medio del tipo de resultado que fijó la 26.2, que el armazón emite en toda página indexada, queda exento por su nombre si es un `data-pagefind-filter`: la prueba no prohíbe todo `data-pagefind-filter`, solo esos tres, y no rompe lo que la 26.2 ya construyó en las páginas de Autor, Tema, Colección y Obra, los Directorios y la portada (AD-11, AD-17)
**And** cada Página de Cita lleva exactamente un `autor`, como mucho una `obra` —la de su Obra resuelta— y en `tema` exactamente sus Temas publicados (AD-11)
**And** toda Página de Cita lleva su clave, y todas son numéricas, del mismo ancho y distintas (AD-25)

**Given** el sitio construido, en Playwright local (Entorno operativo)
**When** se llama a Pagefind
**Then** los recuentos de `filters()` coinciden, valor a valor, con los de `src/lib/publicado.ts` para cada Autor, cada Tema publicado y cada Obra, también las que no se indexan (AD-11, FR-52)
**And** `search(null, { filters: { obra }, sort })` devuelve las Citas de una Obra en el orden de su Página de Obra, página tras página, comprobado sobre una Obra documentada cuyo orden no es el de slug (AD-25, 24.1)

**Given** esta historia terminada
**When** se mira `/buscar/`
**Then** todavía no hay selectores: lo único que cambia es que el resultado de Cita lleva su Autor

### Story 27.2: La búsqueda se acota por Autor y por Tema

As a visitante que busca algo de un autor o sobre un tema,
I want acotar la búsqueda por Autor y por Tema, con texto o sin él,
So that encuentre entre sus citas sin pasar sus páginas una a una.

**Acceptance Criteria:**

**Given** `/buscar/` (`src/pages/buscar.astro`)
**When** se construye
**Then** la búsqueda es un guion empaquetado por Astro, entrada de la lista cerrada de AD-6 con su tope con nombre en `src/lib/umbrales.ts`, que cuenta todo lo que importa de forma estática, trozos compartidos incluidos; el guion en línea de hoy desaparece, y con él su `define:vars` (AD-6, NFR-7)
**And** AD-6 manda sobre el §8 del diseño del 2026-10-17, que la ponía en `public/islas/busqueda.js` con los datos por `data-*` y queda superado
**And** importa de `src/lib/` lo que usa —`tipoDeResultado`, `umbrales`, el vocabulario de la medición y el dueño de los dos ritmos de anuncio— sin copiar nada, y sale a fichero aunque pese poco (`assetsInlineLimit`, 26.6)
**And** emite siempre por `__medir(…)`, nunca con `window.__medir && …` como el guion de hoy ni con una copia propia (AD-13)
**And** las opciones de Pagefind —`ranking.metaWeights` de la 26.2 y de la 27.1— pasan a él sin cambiar

**Given** la página cargada sin interactuar
**When** se mira lo que descarga
**Then** el guion de medición, con `MEDICION_ENDPOINT`, va en el documento antes que el de la búsqueda, y Pagefind se pide con `import()` solo al enfocar el campo, al elegir un filtro o al llegar con estado en la dirección (AD-6, AD-13)
**And** ese `import()` de `/pagefind/pagefind.js` va con el literal, marcado para que Vite no lo resuelva (`/* @vite-ignore */` o `external`), porque Pagefind escribe su índice después de `astro build`; nunca con una variable, que dejaría ese destino fuera de la vista de la lista cerrada de guiones de la 23.1 *(v8.2)*
**And** amplía así la Historia 3.1, ya enmendada en su sitio en ese criterio, sin enmendar lo demás: sus criterios siguen ciertos para la búsqueda sin filtros, y la prueba de `tests/e2e/busqueda.spec.ts` que filtra por `pagefind` sigue valiendo

**Given** el guion de la búsqueda
**When** arranca
**Then** inserta el Campo de búsqueda de la 26.6, sin botón porque responde al teclear, con su etiqueta «Escribe un fragmento, un autor o un tema.» y lo tecleado en Inter al cuerpo de `{typography.body-lg}`, que cambia lo construido en serif (UX-DR58, UX-DR104, UX-DR112)
**And** lleva el texto de ejemplo «Por ejemplo: no hay camino», como lo construido, porque es de los campos que buscan en todo el Corpus, y una prueba exige que «no hay camino» dé algún resultado: en Vitest, y por tanto en el CI, que alguna Cita publicada lo contenga en su forma canónica (AD-3), y en Playwright local, que la búsqueda la devuelva (UX-DR58, UX-DR112) *(v8.2)*
**And** inserta debajo los selectores, dentro de un `fieldset` sin borde ni relleno con la leyenda «Filtrar las citas» solo para lectores: a 3 × `{spacing.unit}` bajo el campo y a 2 × entre sí, apilados a todo el ancho de la medida de prosa en todas las anchuras, cada uno con su etiqueta visible encima, «Autor» y «Tema» (UX-DR87)
**And** cada uno es el control nativo, con filete de 1 px en `{colors.outline}`, radio `{rounded.DEFAULT}`, fondo `{colors.surface}`, 44 px de alto, el valor en `{typography.body-lg}` para que Safari en iOS no amplíe la página, y la flecha del control, sin icono propio

**Given** las opciones de los dos selectores
**When** se componen
**Then** salen en el build de la función de la 27.1 que escribe los filtros de cada Cita, y solo del Corpus publicado: ningún Autor sin Citas publicadas ni Tema por debajo de su umbral, y ninguno publicado que falte (FR-7, AD-11)
**And** el de Autor empieza por «Todos los autores» y sigue por el nombre tal como se lee, para que la búsqueda por tecleo del control lleve a cada Autor por la primera letra de su nombre tal como se lee —a José Martí, con la «J»— *(v8.2)*; el de Tema, por «Todos los temas» y sigue por el nombre con su artículo
**And** los dos órdenes son funciones de `src/lib/normalizar.ts` que esta historia añade, con la comparación canónica, y el selector no ordena por su cuenta (AD-3)

**Given** un filtro elegido y el campo vacío
**When** se busca
**Then** corre `search(null, …)` con ese filtro, en el orden de la clave de la 27.1: basta un filtro para buscar (FR-7)
**And** con texto manda la relevancia y la clave no se aplica; un texto de solo espacios cuenta como sin texto
**And** sin texto ni filtros no hay búsqueda: ni recuento ni salida

**Given** algún filtro puesto
**When** llegan los resultados
**Then** solo hay resultados de Cita, y el recuento lo dice al nombrar lo filtrado; los de Autor, Obra, Tema, Colección y Directorio salen solo en la búsqueda sin filtros (FR-7, UX-DR91)
**And** nada se alcanza solo filtrando: toda Cita que la búsqueda devuelve está también en el listado de su Autor (NFR-2)

**Given** los resultados que pinta el guion
**When** se migran desde el guion en línea
**Then** pintan lo mismo que hoy: la fila entera como enlace, el rótulo de tipo, el título en Source Serif salvo los de Obra, Directorio y portada, en Inter, y la línea del Autor bajo la Cita y bajo la Obra (Historias 22.7, 26.2 y 27.1, UX-DR91)
**And** salvo el nombre accesible del de Obra, que pasa a «Obra: {título}, {Autor}», sin el «de» que puso la 22.7: solo la pausa, como el de Cita de la 27.1 (UX-DR91, UX-DR112) *(v8.2)*
**And** la lista lleva `role="list"`, y el orden de tabulación es el campo, los selectores, «Quitar los filtros» y los resultados (UX-DR101)

**Given** un cambio de selector
**When** pasa la pausa de los selectores sin otro cambio —unos 400 ms, con nombre en `umbrales.ts` junto a la pausa de tecleo de la 26.6—
**Then** la búsqueda se rehace una sola vez: las flechas sobre un selector cerrado, que en Windows cambian el valor a cada pulsación, no disparan una búsqueda por pulsación (UX-DR87, AD-9)

**Given** el Recuento de resultados
**When** hay resultados
**Then** va encima de la lista, a 3 × `{spacing.unit}`, en `{typography.caption}` y `{colors.on-surface-variant}`, dentro de la región `role="status"` que está en el marcado desde la carga (UX-DR89, UX-DR99)
**And** dice cuántos hay, no cuántos se ven: sin filtros, «28 resultados.» o «Un resultado.»; con filtros, nombra lo filtrado, con el Tema en minúscula tras «sobre» y el texto tras «con»: «222 citas de José Martí.», «8 citas de José Martí sobre la prudencia.», «6 citas sobre el saber con «escuela».», y en singular «Una cita…»
**And** la minúscula del Tema es la misma regla que la de «Siguiente cita sobre {tema} ›» (24.5, UX-DR107), sin una segunda
**And** se anuncia con el segundo ritmo: al teclear, tras unos 700 ms sin teclear y solo si la frase cambió; tras un selector, tras la pausa de los selectores

**Given** algún filtro puesto
**When** se pinta la página
**Then** existe «Quitar los filtros», el botón secundario, a su ancho, a 2 × `{spacing.unit}` bajo los selectores y en siena; sin filtros no existe (UX-DR88, UX-DR105)
**And** al pulsarlo quita todos los filtros, deja el texto y desaparece, y el foco pasa al campo (UX-DR100); con el campo vacío, la página vuelve a no tener búsqueda

**Given** una búsqueda
**When** se asienta —al enviar, al pulsar un resultado o al ocultarse la página—
**Then** emite `busqueda` como mucho una vez por estado distinto de texto y filtros en la carga, con su tramo y su combinación de filtros del vocabulario cerrado: ninguno, Autor, Tema o Autor con Tema (AD-13, FR-56)
**And** la emisión que la 23.8 dejó en la búsqueda —con su marca en `history.state` y su respaldo de Navigation Timing— pasa a este guion sin cambiar su regla *(v8.2)*: la consulta sin resultados con texto se sigue registrando al asentarse, solo con el texto, y un filtrado sin texto no registra ninguna (FR-8)

**Given** un resultado
**When** se pulsa
**Then** es un enlace dentro del contenedor que el build marca con la zona `resultado` (23.7), también el que insertó el cliente —salvo los Directorios de los avisos de `/buscar/`, que van fuera y exentos de zona (27.7, UX-DR111)— *(v8.2)*, y la isla no lo intercepta: sin `defaultPrevented`, la escucha de la medición lo cuenta como salida interna (SM-13, AD-13)

**Given** la declaración de `src/lib/ingreso.ts`
**When** se revisa
**Then** no cambia: `/buscar/` con filtros es la misma ruta, sigue admitiendo la publicidad acotada y no aloja ningún Modelo en el guion (FR-37, AD-20, UX-DR110)
**And** la invitación de donación sigue al final de la columna, fuera de la salida sin resultados, y la isla no la mueve
**And** `tests/unit/ingreso-construido.test.ts` sigue midiendo `/buscar/` con los Modelos encendidos, con el guion de la búsqueda ya fuera de línea y dentro de la lista cerrada

**Given** lo que esta historia todavía no hace
**When** se usa `/buscar/`
**Then** la llegada con `?q=` sigue buscando al cargar, como hoy; los filtros en la dirección son de la 27.4, la tanda sigue en 30 sin botón hasta la 27.5, y a cero sigue la salida construida hasta que la 27.6 la nombre con filtros

**Given** los dos selectores a 360 px
**When** se miden sobre lo construido, con el valor a 17 px
**Then** se anota lo que ocupan, con fecha, en el spec de la historia *(v8.2)*; la cifra de los tres, unos 252 px según UX-DR87, se completa con el de Obra en la 27.3

### Story 27.3: La búsqueda se acota también por una Obra del Autor elegido

As a visitante que ya eligió un autor,
I want acotar también por una de sus obras, viendo cuántas citas tiene cada una,
So that busque dentro del libro que me interesa y no entre todo su autor.

**Acceptance Criteria:**

**Given** ningún Autor elegido
**When** se mira `/buscar/`
**Then** no hay selector de Obra: no está oculto ni deshabilitado, no existe (UX-DR87)

**Given** un Autor elegido
**When** han llegado los recuentos de `filters()`
**Then** aparece el selector «Obra» entre Autor y Tema, ya completo y sin mover el foco (WCAG 3.2.2, UX-DR100)
**And** empieza por «Todas sus obras» y ofrece solo las Obras de ese Autor, en el orden de su lista de obras (AD-25), también las que no se indexan y con la familia congelada (FR-52)
**And** cada una va con el título de su ficha, en Inter, y su recuento con unidad: «Maestros ambulantes (23 citas)», y «(1 cita)» en singular, como la Fila de Obra; es el total de la Obra, que no cambia con el texto ni con los demás filtros (UX-DR87, UX-DR104)
**And** el orden llega hecho del build, el de `obras.ts`: la isla no lo recalcula con los recuentos

**Given** un Autor elegido sin ninguna Obra —todas sus Citas sin Obra—
**When** han llegado los recuentos de `filters()`
**Then** el selector de Obra no aparece, como sin Autor: nunca se ofrece «Todas sus obras» sola (UX-DR87)

**Given** dos Autores con una Obra del mismo título
**When** se elige cada uno
**Then** cada selector ofrece solo la suya, con su propio nombre de ficha: nunca se mezclan (FR-7)

**Given** una Obra elegida
**When** se busca
**Then** la combinación de filtros que emite `busqueda` es Autor con Obra, o Autor con Obra y Tema, del vocabulario cerrado (AD-13)
**And** el recuento la nombra tras su Autor: «23 citas de José Martí en Maestros ambulantes.», «Una cita de José Martí en Maestros ambulantes.» (UX-DR89)
**And** sin texto, sus Citas salen en el orden de su Página de Obra (27.1)

**Given** el Autor cambiado por otro, o quitado
**When** cambia
**Then** la Obra elegida se quita: quitarlo hace desaparecer el selector de Obra, y cambiarlo lo rehace con las Obras del nuevo, sin mover el foco (UX-DR87)

**Given** `filters()` y el mapa de rótulos
**When** se piden
**Then** es solo al elegir un Autor, filtrar o buscar, o con estado en la dirección: sin intención no se descarga nada (AD-6, UX-DR93)
**And** el mapa —nombre de ficha → título y Autor— es un JSON del build, compuesto por la misma función que los filtros y nunca en el HTML, y la isla lo pide junto a `filters()` (AD-11)
**And** si no llegan, el selector de Obra no aparece, ni a medias ni con recuentos vacíos

**Given** una Obra que `filters()` devuelve y el mapa no nombra —el índice y el mapa de dos despliegues, por la caché de `max-age=600` (AD-6)—
**When** se compone el selector de Obra
**Then** se omite del selector y nada rompe: las demás Obras del Autor se ofrecen igual

**Given** una Obra con `noindex`
**When** se ofrece
**Then** es valor de filtro como cualquier otra, y no sale nunca como resultado de tipo Obra: de Obra solo salen las indexables. Es uno de los dos lectores que, a propósito, leen el conjunto publicable y no el indexable (AD-11, FR-52)

**Given** el tamaño de los filtros de Pagefind y el del mapa
**When** pasan su tamaño con nombre en `umbrales.ts` —los filtros eran unos 41 KB el 2026-10-17—
**Then** el build avisa y no rompe; trocearlos sigue aplazado (AD-9)
**And** los dos se miden en un paso final de `npm run build`, después de Pagefind, sobre lo que se despliega, `dist/pagefind/` incluido: en `astro:build:done` los filtros aún no existen (AD-9) *(v8.2)*

**Given** los tres selectores a 360 px
**When** se miden sobre lo construido, con el valor a 17 px
**Then** se vuelve a medir lo que ocupan, que UX-DR87 estimó en unos 252 px, y la cifra se anota, con fecha, en el spec de la historia *(v8.2)*

**Given** `/buscar/` con un Autor elegido, el selector de Obra con el título de Obra más largo del Corpus elegido, «Quitar los filtros» y sus resultados
**When** se mide a 320 px en las tres condiciones de la 26.9 —el texto por omisión, al 200 % simulado con zoom y el espaciado de 1.4.12— (Playwright local)
**Then** el `scrollWidth` no pasa del ancho de la ventana: los selectores apilados, el título de Obra con su «(n citas)», «Quitar los filtros» y los resultados parten o crecen sin desbordar, y ninguno lleva `white-space: nowrap` (NFR-8, NFR-12, UX-DR103)
**And** el barrido WCAG 2.2 AA pasa en ese mismo estado (NFR-9)

### Story 27.4: La búsqueda vive en la dirección, y «atrás» la devuelve

As a visitante que quiere volver a una búsqueda o mandarla,
I want que el texto y los filtros vivan en la dirección de la página,
So that pueda compartirla copiándola y «atrás» me devuelva la anterior.

**Acceptance Criteria:**

**Given** el estado de la búsqueda
**When** se escribe en la dirección
**Then** es `?q=&autor=&obra=&tema=` con identificadores —slug de Autor, nombre de ficha y slug de Tema—, nunca rótulos (NFR-4, convención de parámetros)
**And** la isla la compone desde su propio estado, nunca copiando `location.search`, y la escribe tras la pausa de `umbrales.ts`, nunca por tecla (AD-9) *(v8.2)*
**And** toda escritura del historial va dentro de un `try`: si el navegador la rechaza por frecuencia, la búsqueda sigue, la dirección se queda como estaba y la siguiente escritura lo vuelve a intentar

**Given** cambios seguidos del mismo control
**When** pasa la pausa
**Then** el estado que deja la pausa entra en el historial con `pushState`; mientras sigue cambiando el mismo control —tecleando o en el mismo selector— se reescribe con `replaceState`, sin apilar (UX-DR87) *(v8.2)*
**And** un estado asentado no se reescribe nunca: el primer cambio tras él abre entrada; asentar no abre entrada, marca la suya (AD-13) *(v8.2)*
**And** un estado igual al de la dirección no la escribe

**Given** «atrás» o «adelante» entre dos búsquedas de la misma carga
**When** ocurre
**Then** la isla repinta el estado de la entrada —de su objeto de estado o, sin él, leyendo la dirección como en una llegada—: campo, selectores, recuento y resultados, sin recargar *(v8.2)*
**And** no vuelve a emitir `busqueda` por un estado ya emitido en la carga, ni por uno que su entrada marca como asentado, aunque lo asentara otro documento (AD-13) *(v8.2)*

**Given** «atrás» desde un resultado pulsado
**When** el navegador restaura `/buscar/` de la caché de atrás y adelante (`pageshow` con `persisted`)
**Then** es carga nueva para la salida (23.7) —`/buscar/` no emite lectura (23.5)— y no para la búsqueda: conserva en memoria los estados ya emitidos y no los vuelve a emitir, y el resultado que se pulse después cuenta como salida nueva (AD-13, SM-13)
**And** sin esa caché, la página se rehace desde la dirección y da por ya registrado el estado con que llega —por la marca de `history.state`, o por Navigation Timing si la entrada no la trae—: no asienta otra `busqueda` ni otra `busqueda-sin-resultados` (AD-13) *(v8.2)*
**And** la recarga cuenta igual, como ya registrada (AD-13; decisión de Héctor del 2026-10-20) *(v8.2)*

**Given** una dirección con estado que se puede usar —texto, o algún filtro que exista y case— *(v8.2)*
**When** se carga
**Then** Pagefind, `filters()` y el mapa se piden al cargar, la búsqueda corre, y se ven elegidos los selectores de los filtros que trae, con «Quitar los filtros» a la vista si trae alguno, lo escrito en el campo y el recuento de lo filtrado entero (UX-DR93); la que no deja nada con que buscar sigue la regla del filtro que no se puede usar, abajo *(v8.2)*

**Given** una dirección con `obra` y sin `autor`
**When** se carga
**Then** el Autor sale del mapa de rótulos, nunca de partir el nombre de la ficha en el cliente, los dos selectores se ven elegidos, y la dirección que se compone desde ese estado lleva los dos (AD-11, FR-7)

**Given** un filtro de la dirección que ya no existe —un `?autor=` de un Autor retirado o sin Citas, un `?tema=` de un Tema bajo su umbral, un `?obra=` de una Obra sin Citas o absorbida al reunir—
**When** se carga
**Then** se ignora, la búsqueda corre con lo demás, y la región del Recuento lo dice delante del recuento: «Uno de los filtros de esta dirección no se puede usar, y la búsqueda va sin él.» (UX-DR93, NFR-4) *(v8.2)*
**And** la dirección se reemplaza sin él, sin entrada nueva en el historial
**And** la existencia se juzga contra las opciones que compone el build y contra el mapa, y una Obra absorbida nunca se traduce a la que la absorbió: reunir es la ruptura declarada (NFR-4, AD-25)
**And** con dos o tres que no se pueden usar, la región lo dice una sola vez: «Dos de los filtros de esta dirección no se pueden usar, y la búsqueda va sin ellos.» o «Tres de los filtros de esta dirección no se pueden usar, y la búsqueda va sin ellos.» (UX-DR93) *(v8.2)*
**And** si no queda nada con que buscar —ningún texto ni ningún filtro que se pueda usar—, dice «El filtro de esta dirección ya no existe.» o, con dos o más, «Los filtros de esta dirección ya no existen.», sin recuento ni salida de la búsqueda sin resultados, porque no ha corrido ninguna; quedan el campo y los selectores para empezar otra (UX-DR93) *(v8.2)*
**And** así «ya no existe» se dice solo donde es cierto: no queda nada solo con filtros que no existen, porque una `obra` que no casa siempre deja su Autor, y «va sin él» no se promete cuando no corre ninguna búsqueda *(v8.2)*

**Given** una dirección con `autor` y una `obra` de otro Autor (`?autor=a&obra=b`)
**When** se carga
**Then** se ignora la Obra con la regla del filtro que ya no existe: la búsqueda corre con el Autor y lo demás, la región lo dice delante del recuento con la misma frase, «no se puede usar», que es cierta de los dos casos *(v8.2)*, y la dirección se reemplaza sin `obra`; nunca se cambia el Autor por el de la Obra (FR-7, NFR-4, UX-DR93)

**Given** una dirección con más de un filtro
**When** se resuelve su estado
**Then** el orden es uno y fijo: primero se descarta lo que no existe, y se dice; después, una `obra` sin `autor` toma el Autor del mapa; y por último, si `autor` y `obra` existen y no casan, se descarta `obra`, y se dice (NFR-4, AD-11)
**And** así, con un `autor` que ya no existe y una `obra` que sí, la búsqueda va en esa Obra con su Autor, y la región dice que uno de los filtros no se puede usar *(v8.2)*

**Given** una búsqueda compartida con `?obra=`
**When** después se retitula esa Obra con `npm run obra -- titular`
**Then** la misma dirección sigue filtrando, y el selector y el recuento nombran el título nuevo: el nombre de la ficha no cambia (NFR-4)

**Given** `/buscar/` con cualquier combinación de `q`, `autor`, `obra` y `tema`
**When** se sirve
**Then** es la misma ruta de servicio, con su `noindex` y su canónica `/buscar/`, fuera del sitemap y del índice de Pagefind: ninguna combinación crea una ruta ni una página indexable (NFR-1, NFR-13, AD-17)
**And** lo prueba Vitest sobre `dist/`: un solo HTML de `/buscar/`, ninguna ruta bajo ella y ninguna en el sitemap

**Given** `de` o `via` en la dirección de llegada
**When** la búsqueda lee su estado
**Then** ya las quitó el guion de medición, que va antes en el documento, y la función que las quita conserva el objeto de estado de la entrada *(v8.2)*; la búsqueda nunca las lee ni las vuelve a poner (AD-13)

**Given** una dirección compartida con un `?q=` que lleva marcado (`<img src=x onerror=…>`)
**When** la isla lo pinta en el campo o, con algún filtro puesto, en el recuento («… con «x».») *(v8.2)*
**Then** sale como texto, por `textContent` o `value`, nunca como HTML, y una prueba de Playwright local lo fija *(v8.2)*
**And** vale igual para lo tecleado que vuelve dentro de una frase en el filtro de los Directorios («Ningún autor tiene «x»…» y «Buscar «x» en las citas», 26.6) *(v8.2)*

**Given** Playwright local
**When** corre sobre la rama
**Then** cubre la dirección compuesta, «atrás» entre dos estados, la caché de atrás y adelante, el filtro que no se puede usar con sus frases en singular, en plural y sin nada con que buscar, la `obra` sin `autor`, la `obra` de otro Autor y un `replaceState` que lanza *(v8.2)*
**And** cubre «Autor, Tema, resultado, atrás, atrás» con la caché de atrás y adelante y sin ella, y la recarga, sin volver a asentar *(v8.2)*
**And** cubre «teclear, enviar con Intro, seguir tecleando, atrás», que vuelve al estado enviado: el cambio tras un estado asentado abrió entrada y no lo reescribió *(v8.2)*

### Story 27.5: Los resultados llegan de 30 en 30

As a visitante cuya búsqueda da muchas citas,
I want pedir la tanda siguiente cuando yo quiera, sabiendo cuántas quedan,
So that pueda recorrerlas todas sin que la página crezca sola ni pierda por dónde iba.

**Acceptance Criteria:**

**Given** una búsqueda con más resultados que la tanda
**When** llegan
**Then** se pintan los primeros 30 —la tanda, con nombre en `umbrales.ts` (AD-9)— y, a 3 × `{spacing.unit}` bajo el último, el botón secundario «Mostrar 30 más», a su ancho y en siena (UX-DR90, UX-DR105)
**And** es un `button`, no un enlace: ningún desplazamiento lo dispara y no cambia la dirección (FR-7)
**And** su cifra sale de la misma constante que la tanda
**And** cambia lo construido, que cortaba en 30 sin más (UX-DR112)

**Given** «Mostrar 30 más»
**When** se pulsa
**Then** llega la tanda siguiente y el foco va al primer resultado nuevo (UX-DR100)
**And** el recuento no cambia ni se vuelve a anunciar (UX-DR89)
**And** mientras llegan, otra pulsación no hace nada

**Given** una tanda que no llega
**When** falla
**Then** «No se han podido cargar más resultados.» va bajo el botón, a 2 × `{spacing.unit}`, en `{typography.caption}` y `{colors.on-surface}`, por una región `role="status"` propia que se inserta vacía con el botón, aparte de la del Recuento; el Recuento no se toca y sigue a la vista, el foco se queda en el botón, y pulsarlo otra vez la vuelve a pedir (UX-DR90, UX-DR99, UX-DR100) *(v8.2)*
**And** la frase se anuncia como todo mensaje de estado: la región se vacía y se escribe en el siguiente fotograma *(v8.2)*
**And** si el reintento llega, esa región se vacía y el foco va al primer resultado nuevo; el Recuento no se vuelve a anunciar (UX-DR89, UX-DR100) *(v8.2)*

**Given** quedan menos de 30
**When** se pinta el botón
**Then** dice cuántas: «Mostrar las 12 que faltan», o «Mostrar la que falta» si es una; si quedan exactamente 30, sigue diciendo «Mostrar 30 más»
**And** con todos los resultados a la vista el botón no existe, y con 30 o menos desde el principio no llega a existir

**Given** las tandas de una misma búsqueda
**When** se piden una tras otra
**Then** siguen el orden de la primera —la relevancia con texto; sin texto y con filtro, la clave de la 27.1— y ninguna repite ni salta un resultado

**Given** un cambio de texto o de filtro mientras llega una tanda
**When** la tanda llega
**Then** no se pinta: lo que se ve es siempre del último estado

**Given** el orden de tabulación
**When** hay botón
**Then** va después de los resultados (UX-DR101)

**Given** Playwright local
**When** corre
**Then** cubre la segunda tanda con su foco, la última nombrada, la tanda que falla con su reintento —la frase bajo el botón, en su región, y el Recuento sin cambiar con el fallo ni con el reintento— y la pulsación doble *(v8.2)*
**And** el reflujo a 320 px en las tres condiciones de la 26.9, con «Mostrar 30 más», con «Mostrar las 12 que faltan» y con la frase del fallo bajo el botón *(v8.2)* a la vista, sin desplazamiento horizontal, y el barrido WCAG 2.2 AA con el botón puesto (NFR-8, NFR-9, UX-DR103)

### Story 27.6: Sin resultados, los ocho Autores con más Citas

As a visitante cuya búsqueda no encontró nada,
I want que el sitio me diga qué no encontró y me ofrezca por dónde seguir,
So that no acabe en un callejón, y menos por un filtro que puse yo.

**Acceptance Criteria:**

**Given** la Historia 27.3 terminada
**When** empieza esta historia
**Then** existen el selector de Obra y el recuento que nombra la Obra tras su Autor («en Maestros ambulantes»), que las frases sin resultados con Obra reutilizan; sin eso no empieza

**Given** los ocho Autores destacados
**When** se calculan
**Then** salen de una sola función de `src/lib/publicado.ts`, la que reutilizará la portada (28.4), con su recuento en `umbrales.ts` (AD-11, AD-9, FR-8)
**And** son los ocho con más Citas publicadas, en una sola clasificación por número de Citas y, a igualdad, por el orden del Directorio de Autores (26.1, AD-3)

**Given** entre los ocho, los de tradición latinoamericana por debajo de `SUELO_TRADICION_LATINOAMERICANA` (40 %) de los que cuentan para el suelo —todos menos los de tradición `otra`—
**When** se aplica la regla
**Then** el que menos Citas tiene de los que cuentan para el suelo sin ser latinoamericanos —un peninsular o uno sin tradición declarada; nunca uno de `otra`— cede su sitio al latinoamericano con más Citas que quedó fuera, uno a uno, hasta cumplirlo o hasta que no quede fuera ninguno (FR-8)
**And** el desempate sale de esa misma clasificación, sin una segunda: cede el último de los ocho que puede ceder y entra el primer latinoamericano de fuera, así que a igualdad de Citas cede el que va detrás en el Directorio y entra el que va delante (FR-8)
**And** se compara la razón exacta, nunca un porcentaje redondeado: 2 de 5 cumple
**And** si entre los ocho no queda nadie que pueda ceder, la regla se detiene

**Given** el predicado «cuenta para el suelo»
**When** la función lo usa
**Then** es el de `src/lib/huecos.ts` (`EquilibrioDeTradicion.hispanicos`), sacado en esta historia a una función con nombre que usan `huecos.ts` y los destacados: nunca una segunda definición (AD-11)
**And** el Autor publicado lleva su `tradicion` cuando la declara —hoy `aplanarAutor` la deja caer—, y uno sin declararla cuenta para el suelo, como en `huecos.ts`

**Given** el mismo Corpus
**When** se construye dos veces, o con las Citas y los Autores en otro orden
**Then** da los mismos ocho; una prueba de Vitest lo fija con casos que ceden, que se detienen y que empatan

**Given** la pantalla sin resultados
**When** se pinta
**Then** su salida son los Temas, las Colecciones y los ocho destacados, estos en el orden del Directorio de Autores y nunca por recuento, cada nombre enlace a su Página de Autor, en la misma pestaña (FR-8, UX-DR62, UX-DR93)
**And** cada grupo va bajo su `h2`, y los tres en chip, con el trato del Chip de Tema, como lo construido: los destacados son Chips en Source Serif al cuerpo de `{typography.body-md}`, no las Filas de bloque de la portada (UX-DR62, UX-DR93, UX-DR104) *(v8.2)*
**And** deja los ocho primeros del alfabeto que da lo construido (UX-DR112): cambia la regla, no el componente
**And** la frase se anuncia por la región `role="status"` sin pintarse dos veces, como dejó la Historia 22.10 (UX-DR99)

**Given** texto y ningún filtro
**When** no hay resultados
**Then** dice «No encontramos esa frase. Prueba con menos palabras.»

**Given** texto y algún filtro
**When** no hay resultados
**Then** la frase nombra los filtros puestos, con la composición del recuento, y no pide menos palabras a quien quizá no escribió ninguna: «No encontramos «escuela» entre las citas de José Martí en Maestros ambulantes.», con «Quitar los filtros» justo encima (FR-8, UX-DR93)
**And** sustituye, para la búsqueda con filtros, el criterio de la Historia 3.2 «el mensaje sugiere reformular con menos palabras», que sigue cierto sin ellos; la 3.2 no se enmienda en su sitio por esto
**And** lo tecleado que la frase repite sale como texto, por `textContent`, nunca como HTML: un `?q=` con marcado se lee tal cual, y una prueba de Playwright local lo fija *(v8.2)*

**Given** filtros y ningún texto
**When** no hay resultados
**Then** dice «No hay citas de {Autor} sobre {tema}.» o «No hay citas de {Autor} en {Obra} sobre {tema}.»
**And** son los dos únicos casos que pueden darse, porque un filtro solo, o un Autor con una Obra suya, siempre da Citas

**Given** una búsqueda a cero
**When** se asienta
**Then** cuenta en el tramo 0 de `busqueda`, con texto o sin él, y es el numerador de SM-6; el registro de la consulta sin resultados sigue la regla de la 23.8 y no lo es (FR-8, SM-6)

**Given** las salidas de la búsqueda sin resultados —Temas, Colecciones y Autores destacados—
**When** se marca la medición
**Then** no llevan zona, y quedan fuera del contenedor de la zona `resultado`: es la exención escrita en la v8, porque una zona nueva exigiría otra migración de AD-14, y se revisa en la pasada de métricas (AD-13, AD-14, SM-13)

### Story 27.7: Sin JavaScript, la búsqueda lleva a los Directorios

As a visitante cuyo navegador no ejecuta JavaScript, o al que no le carga la búsqueda,
I want que la página me lo diga y me dé por dónde seguir,
So that no me quede ante un título y nada debajo.

**Acceptance Criteria:**

**Given** las Historias 27.3 y 27.4 terminadas
**When** empieza esta historia
**Then** existen el mapa de rótulos (27.3) y la llegada con estado en la dirección, con su aviso del filtro que no se puede usar (27.4) *(v8.2)*, que esta historia distingue del índice que no carga; sin eso no empieza

**Given** `/buscar/` sin guion
**When** se carga
**Then** no hay campo ni selectores, que no harían nada, y el HTML inicial dice en `<noscript>` «Buscar y filtrar necesitan JavaScript, y este navegador no lo está ejecutando.» y «Sin él, todos los autores y todas las obras se leen en sus directorios. Si llegaste desde la página de un autor, de una obra o de un tema, vuelve atrás: allí están sus citas.», en `{typography.body-lg}`, a 3 × y 2 × `{spacing.unit}` (FR-7, NFR-2, UX-DR92)
**And** debajo van `/autores/` y `/obras/` como Resultados de búsqueda de tipo «Directorio», con el rótulo y el título con que salen en Pagefind (26.2)
**And** con guion, nada de eso se ve

**Given** el guion activo, antes de que arranque el paquete de la búsqueda —también cuando sí va a arrancar, y cuando no llega a ejecutar— *(v8.2)*
**When** se carga `/buscar/`
**Then** la página no se queda en un `h1` solo: el HTML inicial lleva, fuera de `<noscript>` y oculto sin guion, «Si la búsqueda no aparece, todos los autores y todas las obras se leen en sus directorios. Si llegaste desde la página de un autor, de una obra o de un tema, vuelve atrás: allí están sus citas.» y, debajo, los dos Directorios como resultados de tipo «Directorio», sin depender del paquete (AD-6, NFR-2, UX-DR92) *(v8.2)*
**And** se pinta en cada carga hasta que arranca el paquete, y por eso es condicional: es cierto mientras carga y también si el paquete falla, donde una frase de fallo sería falsa en cada carga normal *(v8.2)*
**And** la isla lo retira al arrancar, sin dejar hueco, y con el paquete en marcha no queda nada de él (UX-DR92); el salto de maquetación al retirarlo se acepta *(v8.2)*
**And** «No se ha podido cargar la búsqueda.» se queda para cuando el índice falla al buscar *(v8.2)*
**And** sin guion no se ve junto al aviso de `<noscript>`: la página dice una sola de las dos cosas
**And** lo prueba Playwright local cortando el fichero del paquete

**Given** el índice que no carga —`pagefind.js` que no llega, su arranque que falla, o los filtros que una búsqueda filtrada necesita—
**When** se busca o se filtra
**Then** bajo el campo y en lugar de los resultados va «No se ha podido cargar la búsqueda.», seguida de «Todos los autores y todas las obras se leen en sus directorios. Si llegaste desde la página de un autor, de una obra o de un tema, vuelve atrás: allí están sus citas.» y de los dos Directorios como resultados (FR-7, UX-DR92)
**And** sale del mismo componente que el aviso sin guion, dentro de un `<template>` (AD-6), y se anuncia por la región del Recuento
**And** los Directorios de los dos avisos —el del índice que no carga y el de antes de arrancar— quedan fuera del contenedor de la zona `resultado` y exentos de zona por escrito, como las salidas de la búsqueda sin resultados: en `resultado`, SM-13 sumaría salidas sin denominador, porque esa búsqueda no se asienta; la prueba de la 23.7 los nombra entre sus exenciones (AD-13, UX-DR111; decisión de Héctor del 2026-10-22) *(v8.2)*

**Given** el índice que no cargó
**When** se escribe o se filtra otra vez
**Then** se reintenta de verdad: la carga se pide otra vez a la red, sin reutilizar el fallo de la primera, y si llega, la búsqueda corre y la salida desaparece
**And** lo prueba Playwright local con la respuesta cortada y después devuelta

**Given** el mapa de rótulos que no llega y una `obra` en la dirección
**When** se carga
**Then** no se dice que el filtro no se puede usar ni que ya no existe, porque no se sabe: es el estado del índice que no carga *(v8.2)*

**Given** una búsqueda que no pudo correr —el índice, sus filtros o el mapa sin cargar—
**When** se oculta la página o se pulsa una salida
**Then** no emite `busqueda`: no es una búsqueda asentada, un fallo no es un tramo 0 y no entra en SM-6 (AD-13)

**Given** el grafo de enlaces de la puerta de NFR-5 (26.8)
**When** se calcula
**Then** los enlaces a los Directorios del `<template>` y del `<noscript>` no cuentan, porque los ignora (AD-11); los del aviso del HTML inicial, fuera de `<noscript>`, sí cuentan, y no cambian el veredicto, porque la cabecera ya enlaza los dos Directorios *(v8.2)*

### Story 27.8: Buscar en esta obra, en un Autor o en un tema

As a visitante que lee la página de una obra, de un autor o de un tema,
I want buscar solo entre sus citas desde ahí mismo,
So that no tenga que pasar sus páginas para encontrar la que recuerdo.

**Acceptance Criteria:**

**Given** la página 1 de una Obra, de un Autor o de un Tema
**When** se sirve
**Then** lleva «Buscar en esta obra», «Buscar en {Autor}» o «Buscar en este tema»: un formulario GET a `/buscar/` con el Campo de búsqueda, cuya etiqueta visible es ese rótulo, y debajo el botón secundario «Buscar», a su ancho, a 2 × `{spacing.unit}` y en siena (FR-4, FR-6, FR-51, UX-DR94, UX-DR58, UX-DR105)
**And** lo tecleado va en Inter, al cuerpo de `{typography.body-lg}` (UX-DR104)
**And** el filtro va en campos ocultos, con los identificadores de la dirección: dos en la Obra, `autor` y `obra`; `autor` en el Autor y `tema` en el Tema (NFR-4)
**And** se envía también con Intro o con la tecla de buscar del teclado del móvil, y en la misma pestaña (UX-DR106)
**And** no lleva texto de ejemplo: uno de todo el Corpus dentro de «Buscar en José Martí» daría cero resultados (UX-DR58, UX-DR94) *(v8.2)*
**And** en esa página hay dos «Buscar» con el mismo nombre —el enlace de la cabecera y el botón—, y se acepta: los dos llevan a `/buscar/` (UX-DR58) *(v8.2)*

**Given** dónde va
**When** se sirve
**Then** siempre justo encima del listado que filtra (UX-DR94, UX-DR95)
**And** en la Obra, a 4 × `{spacing.unit}` del salto «Dónde leer esta obra ↓», con el listado 4 × más abajo
**And** en el Autor, bajo el rótulo «Citas documentadas», a 2 × y con el listado 3 × más abajo, sin tocar la Ficha de Autor
**And** en el Tema, a 4 × bajo el `h1` y con el listado 4 × más abajo: es la excepción declarada a que la Página de Tema empiece por su contenido

**Given** las páginas 2+ de Obra, de Autor y de Tema
**When** se sirven
**Then** no lo llevan (UX-DR109)

**Given** una Obra con `noindex`, o la familia congelada
**When** se sirve su página 1
**Then** lo lleva igual que la indexable: la congelación no alcanza a la navegación (UX-DR109, FR-52, AD-25)

**Given** el formulario
**When** se construye
**Then** no añade guion: la Página de Autor y la de Tema cargan los mismos guiones y el mismo peso en línea que antes, y la de Obra no gana ninguna isla por él (AD-6, FR-7)
**And** no crea ninguna página indexable: lleva a `/buscar/`, que es servicio con cualquier filtro, y ningún cruce tiene página propia (NFR-13, AD-17)
**And** funciona sin guion, porque es un GET
**And** lo prueba Vitest sobre `dist/`

**Given** el formulario enviado vacío
**When** llega a `/buscar/`
**Then** da todas las Citas de esa página, con los selectores elegidos —desde la Obra, Autor y Obra—, «Quitar los filtros» a la vista y el recuento de lo filtrado entero, «23 citas de José Martí en Maestros ambulantes.», que coincide con el del listado de origen (FR-7, UX-DR93)
**And** con texto, lo escrito está en el campo
**And** «atrás» devuelve a la página de origen

**Given** el campo del 404 (`src/pages/404.astro`)
**When** se sirve
**Then** es el Campo de la 26.6 con el botón secundario «Buscar» visible, y lo tecleado pasa a Inter al cuerpo de `{typography.body-lg}` (UX-DR58, UX-DR104, UX-DR108, UX-DR112)
**And** sigue siendo un GET a `/buscar/?q=` sin guion, y su Cita del Día no cambia
**And** conserva «Por ejemplo: no hay camino», que es de los campos que buscan en todo el Corpus, y sus dos «Buscar» —el de la cabecera y el botón— se aceptan como en «Buscar en…» (UX-DR58, UX-DR108) *(v8.2)*
**And** la Historia 4.3 no se enmienda, porque ningún criterio decía «sin botón»: cambia lo construido, que se enviaba solo con Intro

**Given** la primera Cita de la página 1 del Tema y de la Obra
**When** se mide a 360 × 640 sobre lo construido, con el formulario y su botón
**Then** sigue empezando en la primera pantalla, y la medida se anota, con fecha, en el spec de la historia (UX-DR94) *(v8.2)*

**Given** Playwright local
**When** corre sobre la rama
**Then** el barrido WCAG 2.2 AA y el reflujo a 320 px incluyen la página 1 de una Obra, de un Autor y de un Tema con el formulario, y el 404 con su botón

**Given** «Buscar en…» y el campo del 404
**When** se marca la medición
**Then** no llevan zona, porque enviar un formulario no es salida (AD-13) y una zona nueva exigiría otra migración de AD-14: es la exención escrita en la v8, que alcanza también al campo de la portada y a las salidas de la búsqueda sin resultados (27.6), y desde la v8.2 a los Directorios del aviso de `/buscar/` (27.7) *(v8.2)*; se revisa en la pasada de métricas

### Story 27.9: La búsqueda con filtros llega al sitio en vivo *(operativa)* *(v8.2, Héctor, 2026-10-23)*

As a Héctor,
I want fusionar la Épica 27 comprobada en local y dejar escrita la jornada en que llega al sitio en vivo,
So that la búsqueda con filtros llegue en vivo sin heredar rojos a la épica siguiente, y SM-6 y SM-13 se lean sabiendo desde cuándo.

**Acceptance Criteria:**

**Given** las Historias 27.1–27.8 terminadas en la rama de la épica
**When** empieza esta historia
**Then** la principal está en verde —la reparación de la publicación llegó en vivo el 2026-10-19— y la 24 con la 26 ya está en ella, cerrada por la 26.11; sin eso no empieza

**Given** `src/lib/umbrales.ts` en la rama
**When** empieza esta historia
**Then** esta historia declara en él la jornada de llegada en vivo de la Épica 27, antes de las pruebas y sin valor: una constante de despliegue con la forma de las demás —cadena de jornada, `undefined` mientras no llega—, que será la jornada UTC en que termina el trabajo «Desplegar» de Actions que lleva la 27 al sitio en vivo, nunca la del merge (AD-9) *(v8.2, Héctor, 2026-10-23)*
**And** si la orden de la línea base de la 23.10 todavía no la lee, esta historia se la da, leída y no copiada, para contar desde ella las ventanas de SM-6 y SM-13, y la prueba de Vitest de las ventanas de la 23.10 fija, con respuestas fijas, que cuentan desde ella cuando tiene valor y que sin valor no cuenta nada *(v8.2)*
**And** contar desde ella es empezar la primera jornada UTC completa tras la llegada: la jornada de llegada no entra en ninguna ventana y se informa aparte, como «cambió», como en la 23.10, y la misma prueba lo fija *(v8.2)*
**And** nadie le da valor antes de la llegada: se lo da Héctor, abajo

**Given** la rama al día con la principal y construida con la medición puesta contra un receptor local (`wrangler dev` con D1 local), nunca contra el D1 de producción
**When** se corren a mano `npm run build`, `astro check` y `npm test` —lo que corre el CI, Vitest incluido— y `npm run test:e2e` entero —Playwright local, contra el sitio que construye `tests/servidor.mjs`, que el CI no corre—
**Then** pasan todas, no solo las que nombran las historias de la épica (Entorno operativo)
**And** entre ellas están lo que llama a Pagefind —los recuentos de `filters()`, el orden de `search(null, …)` y la prueba del medio del tipo de la 26.2 con los metadatos nuevos—, el historial de `/buscar/` —«Autor, Tema, resultado, atrás, atrás» con la caché de atrás y adelante y sin ella, y la recarga, sin volver a asentar—, el filtro que no se puede usar, la tanda que falla, `/buscar/` antes de que arranque y con el índice cortado, «Buscar en…», `tests/e2e/ingreso-accesible.spec.ts`, que barre `/buscar/` con la invitación de donación puesta, y el barrido WCAG 2.2 AA y el reflujo a 320 px en sus tres condiciones
**And** la prueba de la huella de AD-14 pasa sin tocarla: la combinación de filtros de `busqueda` ya es del vocabulario que entró con la 23, y esta épica no despliega receptor
**And** el resultado queda anotado, con fecha, en el spec de la historia

**Given** `/buscar/` con un Autor y una Obra en la dirección, y una Página de Cita, de la rama construida con lo de la épica puesto y la medición contra un receptor local
**When** se miden a mano con Lighthouse en perfil móvil 4G, frente a la principal del mismo día y sin puerta automática
**Then** la principal se mide construida y servida igual, en local y con la medición contra un receptor local: nunca se mide el sitio en vivo, cuyo guion de medición escribiría en el D1 de producción *(v8.2, Héctor, 2026-10-24)*
**And** en la Página de Cita el contenido principal sigue visible en menos de 2,5 s (NFR-7), y de las dos quedan anotadas en el spec de la historia las cifras de la rama y las de la principal
**And** si la Página de Cita pasa de 2,5 s, o alguna de las dos empeora frente a la principal, el merge espera a que Héctor decida *(v8.2, Héctor, 2026-10-23)*

**Given** todo lo anterior
**When** Héctor fusiona
**Then** la rama entra en la principal en un solo merge, con el CI en verde, antes o después de la 25; ninguna historia de la 27 entra suelta
**And** el merge, la decisión ante un NFR-7 que pasa de 2,5 s o empeora y la jornada de llegada son actos de Héctor: un agente puede correr las pruebas y Lighthouse en local, contra un receptor local, y anotarlas, nunca fusionar (Entorno operativo) *(v8.2, Héctor, 2026-10-24)*

**Given** ese despliegue
**When** llega al sitio en vivo
**Then** Héctor da valor a la jornada de llegada de la 27 en un commit aparte del día en que llega, con la jornada UTC de esa llegada (AD-9) *(v8.2, Héctor, 2026-10-23)*, leída en el trabajo «Desplegar» de Actions y no en el sitio; tras el merge, es lo único que hace esta historia, aparte de cerrar su fila en `sprint-status.yaml` (abajo) *(v8.2, Héctor, 2026-10-24)*
**And** no se comprueba nada en el sitio en vivo —ni los filtros, ni una dirección con filtros, ni «Buscar en…»—: ya lo cubrió Playwright local sobre la rama, y abrir en vivo `/buscar/` o una página escribiría en el D1 de producción. Siguen siendo dos, y ninguna más, las pasadas que escriben allí a propósito, la 25.3 y la 25.7, con sus jornadas y rutas en la constante de `umbrales.ts` que la orden de la 23.10 descuenta; la 27 no le añade ninguna entrada *(v8.2, Héctor, 2026-10-24)*
**And** no entra en `CORTES_DE_SM8`: `/buscar/` no emite vista, y la 27 no cambia el instrumento de SM-8

**Given** la orden de la línea base de la 23.10 sobre lo desplegado
**When** se leen SM-6 y SM-13, fuera de esta historia, que tras el merge solo anota su jornada *(v8.2, Héctor, 2026-10-24)*
**Then** cuentan sobre búsquedas asentadas, con su combinación de filtros, y su línea base se cierra con el mínimo de búsquedas asentadas (FR-56)
**And** no se comparan por firma —la búsqueda asentada no lleva tiempo mínimo ni marca, y `/buscar/` no emite vista—, y se leen sabiéndolo, como dice el informe junto a sus cifras
**And** si la 27 llega antes de su línea base, se juzgan contra su propia serie, por las ventanas de la 23.10 contadas desde la jornada de llegada de la 27, y se dice; nunca contra el 15 % de SM-6, que sigue en suspenso *(v8.2, Héctor, 2026-10-23)*
**And** la primera ventana empieza la primera jornada UTC completa tras la llegada, y la jornada de llegada se informa aparte, como «cambió», como en la 23.10 *(v8.2)*

**Given** `_bmad-output/implementation-artifacts/sprint-status.yaml`
**When** se cierra esta historia
**Then** `epic-27` pasa a hecha con ella, y no antes; la fila de la 27.9 se añade a mano, porque el fichero se mantiene a mano y nunca con el generador de `bmad-sprint-planning`

## Epic 28: La portada de retorno

Quien vuelve a la portada lee arriba, en una línea, cuántas Citas de cuántos Autores tiene el Corpus y cuántas están cotejadas, y tiene un campo para buscar. Debajo está la Cita de hoy con su obra y las mismas acciones que en su página —copiar, imagen y compartir—, que actúan sobre su Página de Cita y nunca sobre la portada. Siguen seis Obras de seis Autores que cambian con la jornada, todos los Temas, las Colecciones con su criterio para que no parezcan Temas y los ocho Autores con más Citas, cada bloque con su camino al Directorio. Héctor sabe por qué zona sigue quien vuelve.

**FRs covered:** FR-9 *(enmendado)*; FR-3, FR-10, FR-12, FR-18 *(sobre la Cita del Día)*, FR-20 *(la superficie portada)*, FR-35 *(las Obras de la portada)*, FR-55 *(los cierres hacia los Directorios)*, FR-8 *(los mismos ocho)*; NFR-12 y NFR-13 en lo que añade; FR-34, FR-37, FR-52 *(sin trabajo)*; SM-4 de la portada, por zonas *(la juzga)*, SM-C1; SM-11 *(la fecha de su despliegue, si llega antes del juicio)*.
**Notas de implementación:** rama propia y la última de la v8 en entrar en la principal, después del juicio de SM-11 —desde el 2026-12-05— o con `DESPLIEGUE_DE_LA_PORTADA_DE_RETORNO`, que `umbrales.ts` ya declara en `undefined` (64b1bf0d) *(v8.2)*, porque quita de la portada el enlace directo a cada Autor y añade Obras; la 28.5 le da valor el día que llega, también si llega tras el juicio *(v8.2, Héctor, 2026-10-23)*. Lo que reutiliza de las cuatro anteriores y del presupuesto de AD-6 de la 23 está en la Epic List — v8. La **28.1 va primero**: saca la marca de `main`, fija el orden de los bloques y deja la portada respondiendo solo por su título; la **28.2, la 28.3 y la 28.4**, en cualquier orden; la **28.5**, operativa, cierra con `npm run test:e2e` entero contra un receptor local, NFR-7 y el merge, que es acto de Héctor *(v8.2)*. Conviene tener hecha antes la **21.2**: con 16 aptas la Cita del Día se repite cada 16 días y la portada no se puede juzgar. Fuera de la épica: el botón «Buscar» del campo del 404 (27.8), la publicidad acotada, que no tiene componente, el Kit y el Lote, y el archivo de la Cita del Día, aplazado a propósito. **Preguntas abiertas:** si las 8 semanas de SM-11 se reinician desde el despliegue que reparó la publicación, el 2026-10-19, de lo que depende la fecha de la 28 (Héctor, antes del 2026-12-05) *(v8.2)*; si la frase de la portada sin apta sale de `DESCRIPCION_DEL_SITIO`, que `EXPERIENCE.md` da por igual y que hoy dice otra cosa (28.2, `bmad-ux`) *(v8.2)*.

### Story 28.1: La portada abre con las cifras del Corpus y un campo para buscar

As a Valeria, que vuelve a la portada escribiendo la dirección en el móvil,
I want leer arriba, en una línea, cuánto hay en el Corpus y tener debajo un campo para buscar,
So that sepa qué es el sitio sin que me lo vendan y busque sin pasar antes por otra página.

**Acceptance Criteria:**

**Given** las Historias 26.5, 26.6 y 27.8 terminadas
**When** empieza esta historia
**Then** existen la Cabecera de la v8, con la marca que enlaza a `/`, el Campo de búsqueda de la v8, que nació en la 26.6, y el campo del 404 ya pasado a ese Campo con su botón «Buscar» (27.8), que el de la portada copia; sin eso no empieza

**Given** la portada construida
**When** se recorre de arriba abajo
**Then** el orden es el de UX-DR56: la Cabecera, la línea de cifras, el campo de búsqueda, «La cita de hoy», el sitio de las Obras, los Temas, las Colecciones, los Autores y, al final y solo encendida, la Invitación de donación (FR-9, variante 3A)
**And** dentro de la medida de prosa, cada bloque abre con su Rótulo de sección (`h2`) a 6 × `{spacing.unit}` del anterior y su contenido empieza 2 × `{spacing.unit}` más abajo; el de la Cita del Día, a 3 × (`DESIGN.md § Portada`)
**And** los rótulos son, literales, «La cita de hoy», «Obras», «Temas», «Colecciones» y «Autores» (UX-DR101, UX-DR107)

**Given** la marca de la Cabecera de la 26.5
**When** se sirve la portada
**Then** es el único `h1` de la página: el mismo enlace a `/`, sin cambiar de aspecto, con `aria-current="page"` y dentro de la región de la cabecera, no en `main` (UX-DR56, UX-DR101, variante 4A)
**And** desaparece el `h1` que `src/pages/index.astro` pinta hoy dentro de `main` (`.marca-portada`): la marca sale una sola vez y la cabecera se ve igual en toda página (UX-DR112)
**And** la prueba «un único h1» de `tests/e2e/portada.spec.ts` lo busca en la cabecera (Playwright local)

**Given** «Saltar al contenido.»
**When** se usa en la portada
**Then** lleva a la línea de cifras, que es lo primero de `main` (UX-DR101)

**Given** el Corpus publicado
**When** el build compone la línea de cifras
**Then** mientras quede alguna Cita en el censo de `corpus/pendientes-de-cotejo.yml`, dice, literal, «{n} citas de {m} autores; {k} cotejadas con el texto de su fuente.» (redacción 1, UX-DR57) *(v8.2)*, con punto de millar: n son las Citas publicadas, m los Autores de `autoresPublicados` y k las que cuenta `esCitaDocumentada` de `src/lib/publicado.ts`
**And** la compone una sola función de `src/lib/publicado.ts` (AD-11), nunca la página ni `tools/lib/cifras.ts`, que cuenta Citas para la bitácora
**And** va en `{typography.body-md}` y `{colors.on-surface-variant}`, sin cifra destacada, tamaño de reclamo ni color propio: es un hecho del Corpus, no un contador (FR-9)

**Given** el censo de `corpus/pendientes-de-cotejo.yml` con alguna Cita —21 hoy—
**When** se compone la línea
**Then** no dice «cada una» en ninguna forma, y una prueba de Vitest sobre `dist/` lo fija sobre el texto de la línea, no sobre la página: la `description`, el `WebSite` y la frase de la portada sin apta (28.2) dicen «cada una» de otra cosa (FR-9, UX-DR57) *(v8.2)*
**And** con el censo vacío, la misma función escribe «{n} citas de {m} autores, cada una cotejada con el texto de su fuente.», con «de 1 autor» si hay uno y «1 cita de 1 autor, cotejada con el texto de su fuente.» si hay una sola Cita; conserva el verbo de la redacción 1, que es lo que comprueba el build (AD-23), y una prueba de Vitest fija las tres formas con tres Corpus de prueba de censo vacío —varios Autores, uno solo y una sola Cita— (UX-DR57) *(v8.2)*
**And** AD-11 dice todavía «cada una con su fuente» para esa coletilla; manda la UX v8.2 *(v8.2)*

**Given** la cifra de cotejadas
**When** se lee
**Then** no es SM-C1 ni se presenta como tal (SM-C1, aclaración sin trabajo)
**And** no depende de la jornada: la línea no va en ningún subárbol `data-jornada`, y la prueba de las dos jornadas de la 26.8 (Vitest) la encuentra idéntica
**And** la portada sigue sin `lastmod` en el sitemap y el aviso la anuncia siempre, como decide `tools/lib/cambios.ts` (AD-27): una cifra que cambia con cada Cita no le da fecha

**Given** el campo de búsqueda de la portada
**When** se sirve
**Then** es el Campo de búsqueda de la v8 que nació en la 26.6 (UX-DR58), dentro de un formulario GET a `/buscar/` con el campo `q`, sin guion y como el del 404, a 3 × `{spacing.unit}` de la línea de cifras
**And** lleva su etiqueta visible encima, la del 404 —«Escribe un fragmento, un autor o un tema.», como la dibuja 3A—, en `{typography.caption}` y `{colors.on-surface-variant}` a `{spacing.unit}` del campo; filete inferior de `{components.rule-width}` en `{colors.outline}`, sin caja, sombra ni icono; y lo tecleado, en Inter al cuerpo de `{typography.body-lg}` (UX-DR104)
**And** lleva el texto de ejemplo «Por ejemplo: no hay camino», como el del 404 (UX-DR58) *(v8.2)*
**And** debajo, a 2 × `{spacing.unit}`, el botón secundario «Buscar», a su ancho; también se envía con Intro o con la tecla de buscar del teclado del móvil
**And** con el botón «Buscar», la portada tiene dos «Buscar» con el mismo nombre —el de la cabecera y el botón—, y se acepta: los dos llevan a `/buscar/` (UX-DR58) *(v8.2)*
**And** al enfocarlo lleva el anillo global, y el filete pasa a `{colors.primary}` y se engruesa: se suma al anillo, nunca lo sustituye

**Given** que escribo en el campo de la portada
**When** pulso «Buscar»
**Then** llego a `/buscar/` con lo escrito en `?q=` y la búsqueda arranca con ello; para enviarlo, la portada no ha cargado Pagefind ni ningún guion (AD-6)
**And** sin JavaScript se envía igual
**And** enviar el formulario no es salida interna (AD-13), y el campo no lleva zona: está entre los exentos por escrito de la v8 —«Buscar en…», el campo de la portada y el del 404; las salidas de la búsqueda sin resultados, porque una zona nueva exigiría otra migración de AD-14; y los Directorios del aviso de `/buscar/` *(v8.2)*—, que se revisan en la pasada de métricas (UX-DR111)

**Given** el índice de Pagefind
**When** se construye
**Then** la portada responde solo por su título, con el tipo `portada` de la 26.2 (AD-17): todo lo que pinta en `main` —la línea de cifras, el campo y los bloques que ya tenía— va en `data-pagefind-ignore="all"` (NFR-13)
**And** su resultado, rotulado «Portada», se sigue titulando con el nombre del sitio —se lee «Portada: Sabiduría de Bolsillo» (26.2) *(v8.2)*— aunque el `h1` haya salido de `main`: el armazón declara el título de la portada a Pagefind con `data-pagefind-meta="title:…"` dentro de `data-pagefind-body`, y una prueba de búsqueda lo fija (Playwright local); AD-17 dice todavía «rotulada con el nombre del sitio», y manda la UX v8.2 *(v8.2)*

**Given** la línea y el campo encima de la Cita del Día
**When** se mide lo construido a 360 × 640 (Playwright local)
**Then** el texto de la Cita del Día sigue empezando en la primera pantalla, con la cabecera en dos filas (FR-9, NFR-8)
**And** a 320 px no hay desplazamiento horizontal en las tres condiciones del barrido de la 26.9

**Given** el criterio de voz de la Historia 2.1
**When** se cierra esta historia
**Then** su enmienda en su sitio —«sin contadores de visitas ni de lo que hace el visitante»: un hecho del Corpus no es un contador— es la que sostiene esta línea; la 4.1 sigue cierta, porque el acceso a la búsqueda es ahora el campo

### Story 28.2: La cita de hoy lleva su obra y las acciones de su página

As a visitante que vuelve a la portada por la Cita del Día,
I want ver de qué obra sale y poder copiarla, hacerla imagen o compartirla ahí mismo,
So that haga desde la portada lo que haría en su página, y lo que comparto lleve a la Cita y no a una portada que mañana enseña otra.

**Acceptance Criteria:**

**Given** las Historias 24.4, 24.5, 25.1, 25.2, 25.5, 25.6 y 26.8 terminadas
**When** empieza esta historia
**Then** existen la Tarjeta de Obra con su «Siguiente» (24.5), el bloque «Compartir en» con la isla generalizada que recibe el texto y las URL marcadas por `data-*` y acepta el nivel de su rótulo (25.6), la Imagen con el dominio, la Historia de Instagram, y la marca `data-jornada` con la puerta de NFR-5; sin eso no empieza

**Given** la Cita del Día de la portada
**When** se sirve
**Then** bajo el `h2` «La cita de hoy» van, en este orden: el Bloque de Cita a su tramo, con su Atribución y, si consta, su Línea de la Fuente pegada a la Procedencia; a 3 × `{spacing.unit}`, «Ver esta cita»; la Tarjeta de Obra; «Copiar la cita» e Imagen; y el bloque «Compartir en» (UX-DR59)
**And** son los mismos componentes que en la Página de Cita, con sus tokens y sus condiciones, y nada más: ni «De la misma obra» ni «Más de {Autor}»
**And** «De la obra» y «Compartir en» son aquí `h3`, dentro de «La cita de hoy»; el componente es el mismo y el nivel lo da el contenedor, por la prop de nivel de la 24.4 y de la 25.6 (UX-DR64, UX-DR71, UX-DR101)

**Given** «Ver esta cita»
**When** se pinta
**Then** va en `{typography.body-md}` y `{colors.on-surface}` —pasa de siena a tinta—, subrayado siempre y con zona de toque de 44 px, hacia su Página de Cita en la misma pestaña y con la zona `cita-del-dia` que puso la 23.7 (UX-DR59, UX-DR102, UX-DR105, UX-DR112)
**And** el paso a tinta es solo de la portada: el «Ver esta cita» del 404 sigue en siena, como era (UX-DR105) *(v8.2)*

**Given** el bloque de la Cita del Día
**When** se construye
**Then** la Cita, su Tarjeta de Obra y sus acciones son un solo subárbol, con la marca `data-jornada` del componente único de la 26.8 y en `data-pagefind-ignore="all"` (AD-11, AD-12, AD-19)
**And** buscar en `/buscar/` un fragmento de la Cita del Día devuelve su Página de Cita y no la portada (NFR-13, Playwright local)
**And** el grafo de NFR-5 sigue sin contarlo, y la prueba de las dos jornadas (Vitest) sigue encontrando que en la portada solo difieren los subárboles `data-jornada`
**And** la canónica de la portada sigue siendo `/`, y la de la Cita, su Página de Cita: es la que lleva todo lo que se copia, descarga o comparte desde aquí (AD-19)

**Given** «Copiar la cita» sobre la Cita del Día
**When** lo pulso
**Then** copia lo mismo, carácter por carácter, que en su Página de Cita (FR-3): Vitest sobre `dist/` compara lo que el build entrega a la isla en las dos páginas, y Playwright local, el portapapeles
**And** «Copiado.» se anuncia por una región `role="status"` que está en el marcado desde la carga, vacía y sin `hidden` (`.solo-para-lectores`), vaciándola y escribiendo el mensaje en el siguiente fotograma; el botón conserva su nombre accesible (UX-DR99)
**And** si el portapapeles falla, el botón revela el texto seleccionable para copia manual, como en la Página de Cita y sin mensaje de error técnico (UX-DR108)

**Given** Imagen sobre la Cita del Día
**When** abro su diálogo
**Then** es el Diálogo de Imagen v8 de la 25.2, con la cuadrada, sus tres plantillas y Papel elegida al abrir, y la imagen es la misma que se genera en su Página de Cita, con el dominio al pie (FR-10, UX-DR76): los `data-*` que llegan a `imagen.js` son idénticos en las dos páginas (Vitest sobre `dist/`), y los dos ficheros generados, también (Playwright local)
**And** el generador se pide con `import()` al pulsar, no antes, y generarla no bloquea la portada (AD-6, FR-10)
**And** si el generador no llega, el diálogo lo dice y ofrece copiar el texto (NFR-12)
**And** la Cita que con el pie no cabe en su tramo, los rechazos de la entrega antes de abrir la hoja —que descargan con destino `opaco`— y el `AbortError` se tratan como en el diálogo de la 25.2, sin nada propio de la portada (UX-DR76, UX-DR108, AD-7); la prueba de Playwright local de la 25.2 —la Cita que no cabe, sin reintento, y, con `share` sustituido, los tres rechazos antes de abrir la hoja, `AbortError` e `InvalidStateError`, cada uno con lo que registra— corre también sobre la portada *(v8.2)*

**Given** una Cita del Día de más de `MAX_CARACTERES_IMAGEN` (300) caracteres, en un Corpus de prueba
**When** se sirve la portada
**Then** ni la Acción Imagen ni «Historia de Instagram» existen —ni ocultas ni deshabilitadas— y nada lo explica; Copiar y los destinos de enlace siguen (FR-10, UX-DR66, UX-DR108)

**Given** «Compartir en» sobre la Cita del Día
**When** se construye
**Then** sus enlaces son los de su Página de Cita: su canónica con la marca `?via=` de cada destino, compuesta por el build con `compartir.ts` y llegada por `data-*`, nunca `/` ni nada sacado de `location`, y nunca con `?de=` (FR-18, FR-22, AD-7)
**And** sin JavaScript quedan todos los destinos de enlace y «Más opciones…» como `<details>` con Telegram, X y Correo (NFR-2)
**And** «Historia de Instagram» la inserta la isla solo con las cuatro condiciones de UX-DR73, con la Cita admitida por el `data-*` de `tramos.ts`; en escritorio, en el navegador de la aplicación de Facebook en Android, sin JavaScript o por encima de 300 caracteres no existe, y el 2 × 2 queda igual (FR-17)
**And** su segundo toque copia la canónica de la Página de Cita con `?via=instagram-historia`, nunca la de la portada (AD-7)

**Given** una copia, una descarga o una compartición hechas en la portada
**When** se registran
**Then** son de la portada (FR-9, FR-20): la superficie de un registro es la página donde ocurre (AD-13), así que quedan fuera de SM-5 y SM-7, y la lectura de `tools/` de la 23.10 las informa aparte
**And** la portada no emite por estos componentes la vista de una Cita: emite solo las vistas que `superficies.ts` le declara, y una prueba de Vitest sobre `dist/` lo fija (AD-17)

**Given** la Cita del Día con Obra
**When** se pinta su Tarjeta
**Then** lleva a su Página de Obra se indexe o no, con «Siguiente» en el orden del libro que da `obras.ts` (FR-12, AD-25); la congelación de SM-11 no la quita
**And** sin Obra, en un Corpus de prueba, no hay Tarjeta ni hueco, y las acciones siguen a «Ver esta cita» (UX-DR108)

**Given** cualquier Modelo encendido en una copia temporal, nunca en el árbol (AD-21)
**When** se construye la portada
**Then** ningún `data-ingreso` cae dentro del subárbol de la Cita del Día: nada se intercala entre la Cita, su Tarjeta de Obra y sus acciones (FR-34, FR-37, AD-20, UX-DR110), y una prueba de Vitest sobre esa copia lo fija

**Given** las islas de la portada
**When** se mide el guion en línea con una Cita del Día que admite Imagen y con las donaciones encendidas (AD-12)
**Then** son solo las que AD-6 declara —copiar, Imagen y compartir sobre la Cita del Día, con los disparadores de la Historia y de «Más opciones…»— y caben en `MAX_BYTES_DE_GUION`, o el tope sube en el mismo diff, como isla que entra a propósito, nunca porque algo engordó (AD-6)
**And** lo miden `tests/unit/medicion.test.ts` y `tests/unit/ingreso-construido.test.ts` (Vitest), y los guiones externos siguen siendo los de la lista cerrada, como pide la Historia 4.1 enmendada
**And** ningún guion en línea lleva datos de contenido: el slug, el texto y la Obra van en `data-*`

**Given** la portada a 360 × 640
**When** se mide lo construido (Playwright local)
**Then** el texto de la Cita del Día empieza en la primera pantalla, y la Tarjeta de Obra y las acciones quedan debajo, como en la Página de Cita (FR-9, UX-DR56)
**And** a 320 px la rejilla «Compartir en» pasa a una columna sin desplazamiento horizontal (UX-DR103)
**And** el barrido WCAG 2.2 AA pasa sobre la portada con el bloque entero (Playwright local)

**Given** el 404
**When** se construye
**Then** su Cita del Día sigue como estaba construida —el Bloque de Cita y «Ver esta cita», este en siena, su trato de antes, y no en tinta *(v8.2)*—, sin Tarjeta de Obra, sin acciones y sin ninguna isla de la portada (UX-DR108, Historia 4.3, `EXPERIENCE.md`: «el 404 la conserva como era»)
**And** la 26.8 la sigue tratando como a la portada en la prueba de las dos jornadas (Vitest)

**Given** un Corpus de prueba sin ninguna Cita apta para portada
**When** se construye
**Then** la portada se construye sin el bloque de la Cita del Día —ni su rótulo, ni acciones, ni islas—, y los demás bloques salen igual
**And** en lugar de «La cita de hoy», tras el campo, va una sola frase, «Citas en español, cada una en su página, con su autor y, cuando consta, la obra de la que procede.»; cambia lo construido, el párrafo de presentación que `src/pages/index.astro` pinta hoy en ese caso (UX-DR108) *(v8.2)*
**And** `DESCRIPCION_DEL_SITIO` de `src/lib/marca.ts`, que es también la `description` de la portada, la del `WebSite`, la bajada de su Tarjeta Social y la descripción del canal de `rss.xml`, dice hoy «Citas célebres en español, cada una con su autor y la obra de la que procede, cuando consta.»: `EXPERIENCE.md` la da por igual a la frase y no dice si la frase se escribe aparte o si la constante cambia con ella, y con ella esas cuatro (abierta — `bmad-ux`); la 28.2 no se cierra sin la respuesta *(v8.2)*
**And** una prueba de Vitest sobre ese Corpus de prueba fija la frase literal *(v8.2)*

### Story 28.3: Seis Obras que cambian con la jornada

As a visitante que vuelve a la portada,
I want encontrar cada día seis obras de seis autores distintos,
So that volver me abra libros que no conocía y el Directorio de Obras me quede a un toque.

**Acceptance Criteria:**

**Given** las Historias 26.1, 26.4 y 26.8 terminadas
**When** empieza esta historia
**Then** existen la clave de orden del Directorio de Autores, el Directorio de Obras con el orden de la lista de obras, y la marca `data-jornada` con la prueba de las dos jornadas; sin eso no empieza

**Given** el conjunto del que rotan
**When** se calcula
**Then** son las Obras de `obrasIndexables` de `src/lib/publicado.ts`, la misma lista que da `rutasIndexables` (AD-11): una Obra que no se indexa —una sola Cita, o el 90 % o más de las de su Autor— nunca sale (FR-52, sin trabajo; UX-DR109)
**And** si rige la congelación de SM-11 —`CONGELACION_DE_OBRAS` declarada en `umbrales.ts`—, salen del conjunto indexable congelado, porque `obrasIndexables` ya la consulta con `congelacionVigente()` de `src/lib/obras.ts`; la portada no la lee por su cuenta (AD-25)
**And** «mientras la familia Obra esté congelada por SM-11», como dicen FR-9, AD-12, UX-DR60 y `EXPERIENCE.md`, lo decide `CONGELACION_DE_OBRAS`, nunca `SM11_VIGENTE`, que hoy es `true` con la congelación en `undefined` *(v8.2)*
**And** la congelación no quita el bloque: no alcanza a la navegación

**Given** una jornada
**When** se eligen sus Obras
**Then** las elige una función pura que vive junto a `src/lib/citaDelDia.ts` y recibe la jornada de `jornadaDelBuild` —y con ella `FECHA_JORNADA`—, sin averiguarla (AD-5, AD-12)
**And** recorre en rondas la lista circular de los Autores con Obras en ese conjunto, en el orden del Directorio de Autores (26.1); la ventana avanza por jornada tantos puestos como Obras salen —seis mientras haya seis Autores— *(v8.2)*, y de cada Autor sale, en su n-ésima aparición, la n-ésima de sus Obras de ese conjunto en el orden de su lista de obras de `obras.ts` —recuento descendente, título y nombre de ficha—, módulo su número (AD-12, AD-25)
**And** n cuenta las apariciones desde el mismo origen de jornadas que `citaDelDia.ts`
**And** el seis es un recuento con nombre en `src/lib/umbrales.ts`, nunca un literal de la función ni de la página (AD-9)
**And** una prueba de Vitest fija la regla sobre un conjunto de prueba con un Autor de una sola Obra y otro de varias: el segundo enseña la siguiente de las suyas en cada vuelta

**Given** al menos seis Autores con Obras en el conjunto
**When** se compone una jornada
**Then** salen seis Obras de seis Autores distintos
**And** dos builds de la misma jornada dan las mismas seis, en el mismo orden, para todos los visitantes (FR-9)

**Given** menos de seis Autores con Obras en el conjunto
**When** se compone una jornada
**Then** sale una Obra de cada uno, sin repetir Autor ni rellenar el hueco (AD-12, UX-DR60)
**And** la ventana avanza tantos puestos como Obras salen, así que cada jornada cada Autor suma una aparición y enseña la siguiente de sus Obras; la prueba de Vitest de la regla lo fija también con menos de seis Autores *(v8.2)*

**Given** la Cita del Día y las seis Obras de una jornada
**When** se componen
**Then** rotan de forma independiente: la Obra de la Cita del Día puede salir también entre las seis y no se excluye, y una fijación de `corpus/portada.json` no cambia las Obras (AD-12) *(v8.2)*
**And** una prueba de Vitest fija que una jornada con fijación da las mismas seis que sin ella *(v8.2)*
**And** la misma prueba fija que una jornada cuya Cita del Día es de una Obra que la regla elige la deja entre las seis *(v8.2)*

**Given** ninguna Obra en el conjunto
**When** se construye la portada
**Then** el bloque no existe: ni el rótulo «Obras», ni el cierre, ni hueco (FR-9, UX-DR60, UX-DR109)

**Given** cada Obra del bloque
**When** se pinta
**Then** es una Fila de bloque hacia su Página de Obra (`rutaDeLaObra`), en la misma pestaña, bajo el `h2` «Obras»: el título de su ficha en Inter al cuerpo de `{typography.body-lg}`, peso 600 y `{colors.on-surface}`, sin subrayado; debajo, «{Autor} · {año} · {n} citas» en `{typography.caption}` y `{colors.on-surface-variant}` (UX-DR60, UX-DR104, UX-DR105)
**And** el año va solo si las Citas que lo declaran coinciden, nunca es el de una traducción, y no se nombra al traductor (FR-42, AD-25)
**And** los puntos medios llevan `aria-hidden` y suenan como una coma, y entre las dos líneas suena una pausa solo para lectores (UX-DR101)
**And** el título parte palabras antes que desbordar y la fila crece con él: nunca se recorta (NFR-12, UX-DR103)
**And** las filas apiladas se tocan, sin los 8 px, porque el filete las separa (UX-DR102)

**Given** el cierre del bloque
**When** se pinta
**Then** a 2 × `{spacing.unit}` va «Las {n} obras ›», con n las Obras que lista el Directorio de Obras —también las que no se indexan—, hacia `/obras/`: un enlace de texto en `{typography.body-md}` y `{colors.on-surface}`, subrayado siempre, con zona de toque de 44 px y la flecha con `aria-hidden` (FR-55, UX-DR60, UX-DR102, UX-DR105)
**And** las filas y el cierre llevan la zona `obras-de-portada` (UX-DR111), y la prueba de Vitest de la 23.7 sobre `dist/` no encuentra en el bloque ningún enlace sin zona

**Given** el bloque
**When** se construye
**Then** sus filas van en un subárbol `data-jornada`, con la marca del componente único de la 26.8, y todo el bloque en `data-pagefind-ignore="all"` (AD-12, NFR-13)
**And** la prueba de las dos jornadas (Vitest) construye el mismo commit en dos jornadas y encuentra los mismos veredictos, con solo ese subárbol distinto
**And** la comprobación sobre `dist/` de AD-17, que corre en el build y por tanto en el CI, exige que todo el conjunto del que rotan —no las seis de hoy— sean rutas sin `noindex`

**Given** la afiliación encendida en una copia temporal con una tienda inventada, nunca en el árbol (AD-21)
**When** se construye la portada en los dos estados
**Then** el bloque de Obras sale idéntico y sin ningún enlace comercial (FR-35, AD-20, UX-DR110), y una prueba de Vitest sobre las dos construcciones lo fija

**Given** el barrido móvil (Playwright local)
**When** corre a 320 px con `FECHA_JORNADA` en una jornada en que sale la Obra de título más largo del conjunto
**Then** su título parte en varias líneas sin desplazamiento horizontal, en las tres condiciones de la 26.9 (NFR-8, NFR-12)

**Given** la rotación de la Cita del Día de la Historia 21.1
**When** se construye esta historia
**Then** no cambia: las seis Obras toman su patrón de rondas por Autor y su origen de jornadas sin tocarla, y `tests/unit/cita-del-dia.test.ts` (Vitest) sigue en verde

### Story 28.4: Todos los Temas, las Colecciones con su criterio y ocho Autores

As a visitante que vuelve a la portada,
I want ver todos los Temas, saber qué reúne cada Colección y encontrar a los Autores con más Citas,
So that no confunda una Colección con un Tema y llegue a cualquier Autor por su Directorio, sin bajar por una lista de casi seis mil píxeles.

**Acceptance Criteria:**

**Given** las Historias 26.8 y 27.6 terminadas
**When** empieza esta historia
**Then** existen la puerta de NFR-5 sin los subárboles `data-jornada` y la función única de los ocho Autores destacados; sin eso no empieza

**Given** los Temas publicados
**When** se pinta su bloque
**Then** van todos los de `temasPublicados`, bajo el `h2` «Temas», con el Chip de Tema de siempre y la zona `chip-de-tema` (FR-9, UX-DR61)
**And** sin ningún Tema publicado el bloque no existe, como hoy

**Given** las Colecciones publicadas
**When** se pinta su bloque
**Then** van todas las de `conjunto.colecciones`, ya resueltas y sobre su umbral (AD-18), bajo el `h2` «Colecciones», cada una en su fila: el chip de siempre y, a `{spacing.unit}` debajo, su criterio entero en `{typography.caption}` y `{colors.on-surface-variant}`, con 2 × `{spacing.unit}` entre Colecciones (FR-9, UX-DR61, variante 3A)
**And** el criterio es una frase en los renglones que pida, nunca recortada ni con puntos suspensivos; se asocia a su chip con `aria-describedby` y no enlaza (NFR-12)
**And** el chip lleva la zona `colecciones`, y el chip de Colección sigue sin aparecer en la Página de Cita (FR-28)

**Given** una Colección sin criterio, o con el criterio en blanco
**When** se construye
**Then** `criterioDeColeccion` de `src/lib/admision.ts` rompe la construcción: no hay Colección publicada sin criterio, y la portada nunca pinta un chip sin su frase
**And** una Colección por debajo de `MIN_CITAS_POR_COLECCION` no se publica ni sale en la portada; sin ninguna publicada, la sección se omite entera, como hoy

**Given** los Autores destacados
**When** se pintan
**Then** son los ocho de la función única de `src/lib/publicado.ts` que construyó la 27.6, la misma de la búsqueda sin resultados, sin recalcular la regla de FR-8 ni su suelo latinoamericano (AD-11)
**And** van en el orden del Directorio de Autores —por su clave de orden y, a igualdad, por slug—, nunca por recuento (UX-DR62)
**And** cada nombre es una Fila de bloque hacia su Página de Autor, en Source Serif al cuerpo de `{typography.headline-sm}`, peso 400, `{colors.on-surface}` y sin subrayado, bajo el `h2` «Autores» y con la zona `autores-de-portada` (UX-DR104, UX-DR105, UX-DR111)
**And** la regla de los ocho es una y el componente, el de cada sitio: Fila de bloque en la portada y Chip en la búsqueda sin resultados, que esta historia no toca (UX-DR62) *(v8.2)*
**And** una prueba de Vitest sobre `dist/` exige que la portada pinte exactamente los ocho que devuelve la función para ese Corpus, y en ese orden

**Given** el cierre del bloque de Autores
**When** se pinta
**Then** a 2 × `{spacing.unit}` va «Los {m} autores, de la A a la Z ›», con la m de la línea de cifras, hacia `/autores/`: el trato de «Las {n} obras ›» y la zona `autores-de-portada` (FR-55, UX-DR62, UX-DR102, UX-DR105)

**Given** la lista entera de Autores que la portada pinta hoy —unos 5.900 px—
**When** se cierra la historia
**Then** sale de la portada, y todo Autor queda a dos saltos por la cabecera y su Directorio (FR-55, UX-DR112)
**And** la puerta de NFR-5 de la 26.8, que corre en el build y por tanto en el CI, sigue pasando sin ella con el Corpus de hoy, sobre el grafo del `dist/` real y sin los subárboles `data-jornada`, y también la prueba de `tests/e2e/seo.spec.ts` (Playwright local)
**And** si una Cita quedara a más de tres saltos —por un Tema que cae bajo su umbral—, el build rompe nombrando la superficie y el Tema, y el tope no se relaja (NFR-5)

**Given** las donaciones encendidas en una copia temporal (AD-21)
**When** se construye la portada
**Then** la Invitación de donación va al final de la columna, tras los Autores destacados y su cierre, con su filete, por `modelosEnRuta('/')` y `src/components/Sostener.astro` (FR-34, UX-DR110)
**And** apagadas, la portada no emite nada de ella —ni contenedor, ni hueco, ni regla CSS— (UX-DR35), y lo fija `tests/unit/ingreso-construido.test.ts` (Vitest)
**And** la publicidad acotada sigue sin componente, y esta historia no se lo da (FR-37, sin trabajo)

**Given** los bloques de Temas, Colecciones y Autores
**When** se construye el índice
**Then** van en `data-pagefind-ignore="all"`, como todo bloque de la portada (28.1): buscar un criterio o el nombre de un Autor devuelve su Colección o su Página de Autor, no la portada (NFR-13, Playwright local)

**Given** el barrido a 320 px (Playwright local)
**When** corre en las tres condiciones de la 26.9
**Then** el criterio más largo de las Colecciones publicadas y el nombre más largo de los ocho no obligan a desplazarse en horizontal (NFR-8)

### Story 28.5: La portada nueva llega en vivo tras el juicio de SM-11

As a Héctor,
I want fusionar la portada nueva después de juzgar SM-11, o con su fecha escrita si llega antes,
So that el juicio de la familia Obra no lea como suyo un cambio de enlaces internos que lo inclina al revés, y yo sepa por qué zona sigue quien vuelve.

**Acceptance Criteria:**

**Given** las Historias 28.1, 28.2, 28.3 y 28.4 terminadas
**When** empieza esta historia
**Then** la portada nueva está entera en la rama de la épica: la línea de cifras y el campo, la Cita del Día con su Tarjeta y sus acciones, las seis Obras, y los Temas, las Colecciones y los ocho Autores; sin eso no empieza

**Given** las Épicas 23, 24 con la 26, 25 y 27 en la principal —la 27, cerrada por la 27.9— *(v8.2)*
**When** se decide fusionar la rama de la 28
**Then** es la última de la v8, en un solo merge y con el CI en verde: `npm run build`, `astro check` y `npm test`, que es Vitest (Entorno operativo)
**And** antes pasa `npm run test:e2e` entero sobre la rama —Playwright local, que el CI no corre—, construida con la medición puesta contra un receptor local (`wrangler dev` con D1 local), nunca contra el D1 de producción, y entre sus pruebas están `tests/e2e/portada.spec.ts`, `tests/e2e/pagina-404.spec.ts`, el barrido WCAG 2.2 AA y el reflujo a 320 px en tres condiciones, la búsqueda que fija que la portada responde solo por su título, el copiado y la Imagen sobre la Cita del Día, y `npx playwright test tests/e2e/ingreso-accesible.spec.ts --project=escritorio` con las donaciones encendidas en la copia; el resultado queda anotado en el spec de la historia *(v8.2)*
**And** el 404 conserva su Cita del Día sin Tarjeta de Obra ni acciones

**Given** la portada y una Página de Cita construidas desde la rama con todo lo de la épica puesto y la medición contra un receptor local o un punto final ficticio, nunca el de producción
**When** se miden a mano con Lighthouse en perfil móvil 4G, sin puerta automática, frente a la principal medida el mismo día y con el mismo perfil
**Then** en la Página de Cita el contenido principal sigue visible en menos de 2,5 s (NFR-7), y de las dos quedan anotadas en el spec de la historia las cifras de la rama y las de la principal *(v8.2, Héctor, 2026-10-23)*
**And** la principal se mide construida y servida igual, en local y con la medición contra un receptor local o un punto final ficticio: nunca se mide el sitio en vivo, cuyo guion de medición escribiría en el D1 de producción *(v8.2)*
**And** si alguna empeora frente a la principal, el merge espera a que Héctor decida *(v8.2, Héctor, 2026-10-23)*

**Given** el juicio de SM-11, que toca a las `SEMANAS_HASTA_JUZGAR_SM11` (8) de `PRIMER_DESPLIEGUE_DE_OBRAS` (2026-10-10): desde el 2026-12-05
**When** se elige el día del merge
**Then** se fusiona después del juicio o, si antes, sabiendo que su llegada quedará declarada en `DESPLIEGUE_DE_LA_PORTADA_DE_RETORNO` el día que llegue (abajo) *(v8.2)*, porque la 28 inclina la comparación al revés: quita de la portada el enlace directo a cada Autor, salvo los ocho destacados, y añade Obras
**And** sin la credencial de Search Console no hay juicio, y va con su jornada declarada al llegar *(v8.2)*
**And** lo decide Héctor, ningún agente, y lo fusiona Héctor: un agente puede correr las pruebas y Lighthouse y anotarlos, nunca fusionar *(v8.2)*

**Given** el despliegue de la rama de la 28
**When** llega al sitio en vivo, antes o después del juicio
**Then** Héctor da valor ese día, en un commit aparte, a `DESPLIEGUE_DE_LA_PORTADA_DE_RETORNO` —`string | undefined`, que añadió 64b1bf0d tras la reparación—: la jornada UTC en que termina el trabajo «Desplegar» de Actions, no la del commit (SM-11, AD-9, AD-24) *(v8.2)*
**And** si llega antes del juicio, la línea SM-11 de `npm run indexacion` la nombra por `desplieguesQueMuevenSm11`, y SM-11 se juzga sabiéndolo *(v8.2)*
**And** si llega después, le da valor igual y en la misma constante —un despliegue, una constante (AD-9)—, porque la portada se juzga antes y después de la épica y la orden de la 23.10 corta en esa jornada las ventanas de su serie —ninguna la cruza, y la de llegada se informa aparte, como «cambió»—; si la orden solo cuenta desde una llegada anterior al cierre de la línea base (23.10), esta historia se lo da, como la 25.7 le da la suya *(v8.2, Héctor, 2026-10-23)*
**And** llegue antes o después del juicio, las ventanas que la orden cuenta desde su llegada —las que siguen al corte o, si llega antes del cierre de la línea base, todas (23.10)— empiezan la primera jornada UTC completa tras la llegada, y la jornada de llegada no entra en ninguna, de antes ni de después: se informa aparte, como «cambió», como en la 23.10 *(v8.2)*
**And** si `SM11_VIGENTE` se apagó con el juicio, la línea SM-11 ya no sale y no la nombra (`tools/lib/indexacion.ts`), y en ese mismo commit el comentario de la constante en `umbrales.ts` deja de decir «si llega antes del juicio de SM-11» *(v8.2)*
**And** no abre corte en la serie de SM-8: la 28 no cambia su instrumento, porque la portada emite la misma vista

**Given** la Historia 21.2
**When** se planifica el merge
**Then** conviene que esté hecha: con 16 aptas la Cita del Día se repite cada 16 días y la continuación de la portada no se puede juzgar; si no lo está, el juicio de la épica lo dice

**Given** la lectura de `tools/` de la 23.10 sobre lo desplegado
**When** se juzga la épica
**Then** la continuación de la portada se lee por zona —`cabecera`, `atribucion`, `cita-del-dia`, `tarjeta-de-obra`, `siguiente`, `obras-de-portada`, `chip-de-tema`, `colecciones` y `autores-de-portada`— contra su propia serie, por las ventanas de la 23.10, con la misma definición de ventana que SM-C3 y SM-C5 *(v8.2, Héctor, 2026-10-23)*, solo con el mínimo de lecturas que cierra una línea base y después de que Héctor dé por buena la comparación por firma de esa línea base *(v8.2)*, que anota en `DESPLIEGUE.md` §3 con fecha y métrica *(v8.2, Héctor, 2026-10-23)*; nunca contra la meta de SM-4, que sigue en suspenso (SM-4)
**And** lo copiado, descargado y compartido desde la portada se informa aparte de SM-5 y SM-7
**And** lo que se abre en pestaña nueva no se mide, y la cifra se da como cota inferior
