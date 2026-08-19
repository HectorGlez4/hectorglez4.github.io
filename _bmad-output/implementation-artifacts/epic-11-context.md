# Epic 11 Context: Un Corpus con volumen defendible

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

El Corpus pasa de 38 Citas a un volumen donde hay cola larga que capturar y Temas que superan su umbral de publicación, sin que baje el porcentaje de Citas con Procedencia verificada. Va primera de la v3 porque todo lo demás mejora con volumen y nada lo sustituye: una Colección necesita Citas entre las que escoger y una Pieza de varias Citas necesita que haya varias que merezcan ir juntas. La épica no consiste en sembrar más rápido, sino en hacer que el sembrado lo pueda ejecutar un agente sin supervisión y siga siendo seguro: la Procedencia deja de ser una afirmación de quien la teclea y pasa a derivarse del documento recuperado, y el texto de cada Cita tiene que aparecer literalmente en él. Tres historias construyen esas salvaguardas; la cuarta corre el proceso y se cierra por resultado medido.

## Stories

- Story 11.1: La Fuente se recupera, y su metadato sale del documento
- Story 11.2: Ninguna Cita se publica sin aparecer en su documento
- Story 11.3: El objetivo de cada sesión sale del hueco, no del criterio
- Story 11.4: El Corpus alcanza volumen defendible (operativa: no la ejecuta un agente de desarrollo)

## Requirements & Constraints

**Recuperación de la Fuente.** La obra, el año y la licencia de una candidata se derivan del documento descargado, y no existe forma de pasarlos por argumento a la orden. Una URL fuera del conjunto cerrado de Fuentes admitidas no produce candidatas, y tampoco lo hace una Fuente cuya licencia no permita reutilización. El conjunto admitido son repositorios de obras en dominio público que traen la referencia consigo (Wikisource en español, Biblioteca Virtual Miguel de Cervantes, Project Gutenberg y, con la reserva de licencia sin resolver, Wikiquote en español limitado a entradas con referencia). No se admiten textos que no estén en español ni traducciones que no estén ya en dominio público.

**Cotejo literal.** Ninguna Cita se publica sin que su texto se localice literalmente en el documento de su Fuente. El fallo rompe la construcción indicando ruta del fichero y regla incumplida; nunca se degrada a aviso. Una Cita escrita a mano directamente en el corpus pasa por la misma puerta que una sembrada — ningún camino de publicación la esquiva. La comparación colapsa espacios y nada más: una diferencia de acento o de puntuación respecto a la edición debe fallar, porque cazarla es justamente para lo que existe.

**Política de objetivo.** El objetivo de cada sesión de sembrado sale del hueco del Corpus, con una política determinista: mismo estado del Corpus, mismo objetivo, y declarando de qué hueco sale. Prioriza cerrar el déficit de tradición latinoamericana cuando la proporción está por debajo de su suelo. El editor conserva la última palabra: puede anular la propuesta, y la anulación queda registrada. La vista de huecos dice cuántas Citas le faltan a cada Tema por debajo del umbral.

**Criterios de cierre de la épica (11.4).** Cada Tema que la portada anuncia alcanza el umbral mínimo de Citas publicadas y la herramienta de huecos no reporta ninguno por debajo; el porcentaje de Citas con Procedencia completa no ha bajado respecto a la medición de apertura; la proporción de Autores de tradición latinoamericana alcanza o supera su suelo (parte del 16,7 % con 9 peninsulares, 2 latinoamericanos y 1 otra sobre 12 Autores); y queda declarada la cadencia de sembrado a partir de sesiones medidas, no estimadas. Una sesión en la que la Procedencia verificada baja mientras sube el número de Citas se considera fallida aunque haya sumado, y sus Citas incompletas se retiran a revisión.

**Punto de partida medido (2026-08-18).** 38 Citas, 12 Autores, 8 Temas. Solo dos Temas superan el umbral; seis están por debajo, el más vacío con una sola Cita.

**Puerta de publicación de la v3.** Se puede construir en cualquier orden, pero nada se publica ni se comparte hasta que las Condiciones de Lanzamiento estén verificadas. Ninguna historia de esta épica está bloqueada por esa puerta ni la abre.

## Technical Decisions

- **La red vive solo en la cáscara exterior de las herramientas de editor.** Las capas internas de herramientas, la derivación pura, el esquema y las páginas operan sobre datos ya recuperados. Ningún paso del build descarga nada: dos construcciones del mismo commit dan el mismo sitio. Es la primera dependencia de red del proyecto y entra acotada.
- **El documento de la Fuente se versiona como texto plano**, con el marcado retirado en la recuperación, en un directorio del corpus que el build sí lee pero que no es una colección de contenido. Un documento por par (Fuente, obra), nombrado `{id-de-fuente}--{slug-de-obra}`; cada Cita lo referencia por ese mismo identificador. Recuperar una obra ya versionada reutiliza su documento en vez de añadir otra copia.
- **El cotejo corre en el build, no en las herramientas.** Dónde exactamente lo elige el código —cargador, refinamiento del esquema o paso de validación propio—, con una única condición: fuera de la capa de derivación pura, que no lee el sistema de ficheros. Lo invariante es que corra en el build y no se pueda saltar. El cotejo no pasa por la normalización de texto del proyecto.
- **La caché del cotejo está deliberadamente sin decidir.** A volumen y con dos construcciones diarias conviene no rehacerlo entero cada vez; es el mismo problema que ya se resolvió para la pregeneración incremental por Cita —función del contenido, no del calendario— y admite la misma forma de solución. Decidir cuando el build lo pida, no antes.
- **Todo literal numérico de regla de negocio vive en el módulo de umbrales** y en ningún otro sitio, incluidos el umbral de Citas por Tema y el suelo de tradición latinoamericana que consume la política de objetivo.
- **El Corpus no tiene más almacén que git.** No se introduce base de datos ni segundo origen de verdad para candidatas, huecos ni documentos.
- **Aprobar una candidata la somete a las mismas reglas de admisión que cualquier alta**: el sembrado no abre puerta lateral. Rechazar descarta sin dejar rastro en el Corpus, los duplicados se señalan antes de decidir, el lote es reanudable, y publicar es siempre un acto explícito — nada pasa a publicado por acumulación de tiempo ni por ausencia de objeción.
- **Sin tecnología nueva.** El stack es el mismo de la v2.

## Cross-Story Dependencies

- 11.1 habilita a 11.2: sin documentos de Fuente versionados no hay contra qué cotejar. El orden natural es 11.1 → 11.2 → 11.3 → 11.4.
- 11.4 depende de las tres anteriores y es la única historia de la v3 que un agente de desarrollo no ejecuta: corre la tubería a lo largo de varias sesiones y se cierra por resultado medido.
- La épica extiende las herramientas de sembrado, auditoría y huecos ya construidas en la Épica 9; no las sustituye. La política determinista de 11.3 sustituye al criterio de selección aceptado entonces.
- Las Épicas 12 y 13 se benefician del volumen que produce esta épica (una Colección necesita Citas entre las que escoger), pero no están bloqueadas por ella.
- El dueño único de superficie publicable y el módulo de resolución del conjunto publicable se tocan en la Épica 12, no aquí.
