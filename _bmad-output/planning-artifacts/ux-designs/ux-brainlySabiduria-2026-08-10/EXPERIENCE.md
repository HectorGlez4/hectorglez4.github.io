---
name: Sabiduría de Bolsillo
status: final
sources:
  - "{planning_artifacts}/prds/prd-brainlySabiduria-2026-08-10/prd.md"
  - "DESIGN.md"
updated: 2026-08-18
---

# Sabiduría de Bolsillo — Experience Spine

> Define **cómo funciona**. La identidad visual vive en `DESIGN.md`, referenciada aquí por token con la sintaxis `{ruta.al.token}`. En caso de conflicto con cualquier maqueta o importación, mandan las dos espinas.

## Foundation

Web responsive de una sola superficie, móvil primero. Sin app nativa, sin PWA instalable (PRD §12). Sin sistema de UI de terceros: la interfaz es lo bastante pequeña como para que una dependencia de componentes cueste más de lo que ahorra, y `DESIGN.md` ya define el vocabulario completo.

El grueso del tráfico entra por una **Página de Cita** desde un buscador, en móvil, sin haber visto nunca la portada. Todo el diseño parte de ahí: cada página debe funcionar como primera página.

Tema claro único. El modo oscuro queda fuera de la v1 por decisión registrada.

## Information Architecture

| Superficie | Se llega desde | Propósito |
|---|---|---|
| **Página de Cita** | Buscador externo (mayoritario), listados, Cita del Día | Resolver la intención completa: leer, confiar, copiar o compartir |
| **Página de Autor** | Atribución de una Cita, búsqueda | Semblanza + catálogo de esa persona |
| **Página de Tema** | Chips de Tema, portada, búsqueda | Agregación transversal entre Autores |
| **Página de Colección** *(v3)* | Buscador externo, chips de Colección en la portada | Reunir Citas escogidas por un criterio editorial que no es Autor ni Tema |
| **Portada** | Dominio directo, retorno | Cita del Día, entrada a la búsqueda, Temas destacados |
| **Resultados de búsqueda** | Campo de búsqueda (presente en todas las superficies públicas) | Encontrar por fragmento, Autor o Tema |
| **Kit Diario** *(interna, v2)* | Una dirección que Héctor abre en el móvil | El material de la jornada ya compuesto: Imagen de la Cita del Día, pie con atribución y enlace marcado por red. `noindex`, sin enlaces entrantes |
| **Curación** *(interna)* | Terminal, en local | Ingesta, revisión y publicación del Corpus. **No es una superficie web:** la arquitectura sitúa el Corpus en ficheros versionados, así que UJ-4 se resuelve en línea de comandos. No hay panel autenticado en producción. |

**Cierre de superficies:** cada UJ del PRD aterriza en una superficie existente y cada superficie tiene al menos un UJ que la alcanza. UJ-1 → Página de Cita. UJ-2 → Página de Cita + diálogo de Imagen. UJ-3 → Cita → Autor → Tema → Colección. UJ-4 → Curación. UJ-5 → Kit Diario.

**Navegación real:** lateral, no jerárquica. El visitante entra por una hoja y se mueve entre hojas a través de Autor y Tema. No hay migas de pan porque no hay jerarquía que reflejar. La cabecera lleva solo la marca (enlace a portada) y el acceso a búsqueda.

## Voice and Tone

Microcopia. La voz de marca vive en `DESIGN.md § Brand & Style`.

| Sí | No |
|---|---|
| «Copiado.» | «¡Copiado con éxito! ✓» |
| «Sin obra documentada.» | *(omitir el bloque en silencio)* |
| «No encontramos esa frase. Prueba con menos palabras.» | «Error: 0 resultados» |
| «Más de Antonio Machado» | «¡Descubre más frases increíbles!» |
| «Esta cita es demasiado larga para generar una imagen.» | *(ocultar el botón sin explicación)* |
| Frases completas, punto final, sin exclamaciones. | Emoji, contadores, gamificación, segunda persona efusiva. |

El sitio **nunca califica una Cita**. No hay «frase destacada», «la mejor de», ni adjetivos sobre el contenido ajeno. Presenta y se aparta.

## Tipografía adaptativa de la Cita

*Sección inventada: resuelve la pregunta abierta que el PRD delegó explícitamente a UX (FR-10).*

El tamaño de la Cita se elige por **tramos discretos según longitud en caracteres**, nunca de forma continua. Los tramos son deterministas, así que el resultado de cualquier Cita es predecible y verificable en pruebas.

| Longitud | Token en página | Token en Imagen de Cita |
|---|---|---|
| ≤ 80 caracteres | `{typography.quote-xl}` — 44px | 64px |
| 81 – 160 | `{typography.quote-lg}` — 36px | 52px |
| 161 – 240 | `{typography.quote-md}` — 28px | 42px |
| 241 – 300 | `{typography.quote-sm}` — 23px | 34px *(suelo legible)* |
| > 300 | `{typography.quote-sm}` — 23px | **sin imagen** (FR-10) |

En móvil, cada tramo baja un escalón; el suelo de 23px no se cruza nunca. **El texto no se recorta jamás** — lo prohíbe NFR-12. Por encima de 300 caracteres la acción «Imagen» no se muestra en absoluto, y la microcopia explica por qué solo si el visitante la busca.

## Component Patterns

Comportamiento. Las especificaciones visuales viven en `DESIGN.md § Components`.

| Componente | Dónde | Reglas de comportamiento |
|---|---|---|
| **Bloque de Cita** | Página de Cita | Primer elemento visible sin desplazar en 360×640. Tramo tipográfico por longitud. No es interactivo: la Cita no es un enlace. |
| **Atribución** | Bloque de Cita | Nombre del Autor → Página de Autor. Procedencia no enlazada. Si la Procedencia falta, se muestra «Sin obra documentada» — nunca se omite el bloque. |
| **Acción Copiar** | Página de Cita | Una pulsación copia texto + atribución en texto plano. Confirmación en el propio botón durante 2s, sin notificación flotante. |
| **Acción Imagen** | Página de Cita | Abre el diálogo de plantillas. Ausente si la Cita supera 300 caracteres. |
| **Diálogo de Imagen** | Sobre Página de Cita | 3 plantillas, previsualización real del texto de esa Cita. Descarga directa; sin paso intermedio, sin registro. Cerrable con Esc, con toque fuera y con botón. |
| **Rutas de salida** | Pie de Página de Cita | «Más de {Autor}» (hasta 4) + chips de Temas. Nunca vacío: toda Página de Cita publicada tiene salida (FR-12). |
| **Campo de búsqueda** | Cabecera, todas las superficies públicas | Normaliza acentos y mayúsculas al consultar. Sin autocompletado en v1. |
| **Tarjeta de Cita** | Listados de Autor y Tema | Fragmento + autor. Toda la tarjeta es zona de toque, mínimo 44px de alto. |
| **Chip de Tema** | Página de Cita, portada | Navega a Página de Tema. No es filtro ni conmutador. |
| **Chip de Colección** | Portada | Navega a Página de Colección. Mismo comportamiento que el de Tema. **No aparece en la Página de Cita:** la Colección enlaza a sus Citas, no al revés (FR-28). |
| **Listado de Colección** | Página de Colección | **Empieza sin preámbulo:** la primera Tarjeta de Cita es el primer contenido visible bajo el nombre. Usa `TarjetaDeCita`, el mismo componente que Tema y Autor — nunca una presentación propia (AD-19). |
| **Criterio de Colección** | Pie del listado de Colección | Describe para qué está reunida la Colección. No comenta ni adjetiva ninguna Cita. Va después del listado, no antes. |
| **Paginación** | Listados > 50 Citas | Anterior / Siguiente numerada. Caso excepcional con el Corpus previsto. |

## State Patterns

| Estado | Superficie | Tratamiento |
|---|---|---|
| Carga normal | Todas | El contenido llega en el HTML inicial (NFR-2). No hay esqueletos de carga: no hay nada que esperar. |
| Cita sin Procedencia | Página de Cita | «Sin obra documentada» en tinta apagada, en el lugar donde iría la obra. Presencia de la ausencia. |
| Búsqueda sin resultados | Resultados | Mensaje + Temas destacados + Autores destacados como salida (FR-8). Nunca un callejón sin salida. |
| Autor sin Citas publicadas | — | La Página de Autor no existe: 404. No se genera una página vacía (FR-4). |
| Tema por debajo de 15 Citas | — | El Tema no se publica ni se indexa (FR-6). Sus chips no se renderizan. |
| Colección por debajo de su umbral | — | No se publica ni se indexa. Desaparece a la vez de la página, del sitemap, de los chips y del descubrimiento. |
| Cita retirada de una Colección | Página de Colección | Desaparece del listado sin dejar hueco ni enlace roto; el recuento baja y puede despublicar la Colección. La Cita no cambia de Temas ni de Autor. |
| Cita > 300 caracteres | Página de Cita | La acción «Imagen» no se muestra. Copiar sigue disponible. |
| Copiado fallido | Página de Cita | El botón revela el texto seleccionable para copia manual. Sin mensaje de error técnico. |
| Generando imagen | Diálogo | El diálogo permanece usable; la previsualización muestra estado de progreso. No bloquea la Página de Cita. |
| 404 | Cualquiera | Campo de búsqueda + Cita del Día. Un 404 es una oportunidad de entrada, no un muro. |

## Interaction Primitives

- **Un toque, un resultado.** Copiar copia. Imagen abre el diálogo. Nada requiere dos pasos para lo que UJ-1 hace con prisa.
- **Sin gestos ocultos.** Nada de deslizar, mantener pulsado ni pellizcar. Toda acción tiene un control visible.
- **Sin interstitial.** Ningún modal, aviso ni invitación antes del contenido (NFR-10). Esto incluye el aviso de cookies: la analítica elegida no debe requerirlo (NFR-11).
- **Movimiento mínimo.** Solo transiciones de opacidad y color, ≤ 150ms. Sin animación de entrada del contenido, que retrasaría la lectura. `prefers-reduced-motion` las elimina por completo.
- **Zonas de toque** mínimo `{components.tap-target-min}` (44px) con 8px de separación.
- **Desplazamiento** siempre nativo. Sin scroll infinito ni secuestro del desplazamiento.

## Accessibility Floor

Comportamiento. El contraste visual está resuelto en `DESIGN.md § Colors`.

- **WCAG 2.1 AA** en todas las superficies públicas (NFR-9).
- **Foco visible siempre:** anillo de 2px en `{colors.primary}` con 2px de separación. Nunca se suprime el indicador de foco.
- **Orden de tabulación** = orden de lectura. En Página de Cita: contenido primero, acciones después, navegación al final.
- **Semántica correcta:** la Cita se marca como cita con su atribución asociada; un único `h1` por página; los listados son listas reales.
- **La imagen no es la única vía.** Todo lo que ofrece la Imagen de Cita está disponible como texto copiable. La Imagen es un extra, nunca el único acceso al contenido.
- **Zoom hasta 200 %** sin pérdida de contenido ni desplazamiento horizontal.
- **Idioma declarado** `es` en el documento; el marcado no asume variante regional.

## Key Flows

Nombres heredados verbatim del PRD §2.3. No se renumeran.

- **UJ-1 — Lucía necesita una frase para cerrar su presentación.**
  1. Aterriza desde el buscador en una Página de Cita. Sin portada, sin modal, sin aviso.
  2. La Cita ocupa la pantalla. La lee de un vistazo.
  3. Debajo, el Autor y la obra. **Clímax:** confía en lo que va a citar sin tener que comprobarlo en otro sitio.
  4. Pulsa Copiar. El botón confirma en el sitio. Texto y atribución van juntos.
  5. Cierra. Tiempo total desde el clic en Google: por debajo de 30 segundos.
  *Fallo posible:* la Cita no tiene Procedencia. La página lo dice explícitamente en lugar de callar, y Lucía decide con la información completa.

- **UJ-2 — Diego quiere publicar algo hoy.**
  1. Llega a una Página de Cita desde un Tema.
  2. Pulsa Imagen. Se abre el diálogo con tres plantillas y su Cita ya compuesta en cada una.
  3. Elige. **Clímax:** descarga y publica sin abrir un editor ni salir del móvil.
  4. La imagen lleva la marca del sitio, subordinada a la frase.
  *Fallo posible:* la Cita supera 300 caracteres y no hay acción Imagen. Diego copia el texto; el producto no le miente con una imagen ilegible.

- **UJ-3 — Marisol llegó por una frase y se quedó.**
  1. Página de Cita. Pulsa el nombre del Autor.
  2. Página de Autor: semblanza breve, catálogo completo.
  3. Desde una Cita, salta a un Tema. **Clímax:** descubre a un autor latinoamericano que no conocía — el suelo del 40 % del Corpus existe justo para que este momento ocurra.
  4. Cuatro páginas después sigue leyendo.

- **UJ-4 — Héctor incorpora cincuenta citas sin romper la promesa.**
  1. Carga el lote en la herramienta de Curación.
  2. El sistema rechaza las Citas sin Procedencia y las de Autores sin año de fallecimiento, y dice cuál regla incumplió cada una.
  3. Completa lo que falta; el resto queda en revisión, no publicado.
  4. **Clímax:** el Corpus crece y el porcentaje de Citas verificadas no baja — visible en el propio panel (FR-16).
  *Fallo posible:* una Cita duplica otra ya publicada. El sistema lo señala; decide Héctor, no el sistema.

## Responsive & Platform

Tres puntos de ruptura, no más.

| Ancho | Comportamiento |
|---|---|
| < 600px | Columna única, márgenes `{spacing.margin-mobile}`. Tramo tipográfico un escalón por debajo. Acciones a ancho completo apiladas. |
| 600 – 1024px | Columna única centrada, medida limitada a `{components.quote-max-measure}`. Acciones en línea. |
| > 1024px | Idéntico a tablet con márgenes `{spacing.margin-desktop}`. **El ancho extra se convierte en aire, no en contenido:** no aparecen columnas laterales ni bloques nuevos. |

La decisión de que el escritorio no gane densidad es deliberada: la mayoría del tráfico es móvil, y una segunda composición para escritorio duplicaría el trabajo de mantenimiento sin servir a ningún UJ.

## Inspiration & Anti-patterns

**Referencia de actitud:** una antología impresa bien editada — la que presenta el texto y desaparece.

**Anti-patrones, explícitos porque son el estado del arte del vertical en español:**

- Publicidad intercalada en el cuerpo del contenido, entre la Cita y su atribución.
- Muros de consentimiento o suscripción antes de mostrar la frase.
- Listados de 200 frases sin jerarquía donde hay que rebuscar.
- Botoneras de compartir de ocho redes sociales.
- Atribución sin fuente, presentada con la misma seguridad que una verificada.
- Imágenes de fondo con textura o fotografía de paisaje bajo el texto.
- Scroll infinito en listados.
