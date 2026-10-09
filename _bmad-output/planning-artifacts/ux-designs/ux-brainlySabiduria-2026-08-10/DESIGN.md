---
name: Papel y Tinta
status: final
sources:
  - "{planning_artifacts}/prds/prd-brainlySabiduria-2026-08-10/prd.md"
  - "{planning_artifacts}/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md"
updated: 2026-10-09
colors:
  surface: '#faf7f0'
  surface-dim: '#efe9dd'
  surface-bright: '#fffdf8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f2ea'
  surface-container: '#f1ece2'
  surface-container-high: '#eae4d8'
  surface-container-highest: '#e3dccf'
  on-surface: '#1f1b16'
  on-surface-variant: '#5a5147'
  inverse-surface: '#332e28'
  inverse-on-surface: '#f6f2ea'
  outline: '#8a7f72'
  outline-variant: '#ddd5c7'
  primary: '#8c4a2f'
  on-primary: '#ffffff'
  primary-container: '#f7e3d8'
  on-primary-container: '#5c2c18'
  secondary: '#4a5d73'
  on-secondary: '#ffffff'
  secondary-container: '#dde5ef'
  on-secondary-container: '#2b3a4a'
  error: '#8f2c22'
  on-error: '#ffffff'
  error-container: '#f9dfdb'
  on-error-container: '#5c1712'
  background: '#faf7f0'
  on-background: '#1f1b16'
  surface-variant: '#e3dccf'
typography:
  quote-xl:
    fontFamily: Source Serif 4
    fontSize: 44px
    fontWeight: '400'
    lineHeight: '1.25'
    letterSpacing: -0.015em
  quote-lg:
    fontFamily: Source Serif 4
    fontSize: 36px
    fontWeight: '400'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  quote-md:
    fontFamily: Source Serif 4
    fontSize: 28px
    fontWeight: '400'
    lineHeight: '1.35'
  quote-sm:
    fontFamily: Source Serif 4
    fontSize: 23px
    fontWeight: '400'
    lineHeight: '1.4'
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Source Serif 4
    fontSize: 21px
    fontWeight: '600'
    lineHeight: '1.3'
  title-lg:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '600'
    lineHeight: '1.25'
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.65'
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
  author:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.09em
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  sm: 0.125rem
  DEFAULT: 0.1875rem
  md: 0.25rem
  lg: 0.375rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 56px
  quote-breathing: 64px
components:
  rule-width: 1px
  quote-max-measure: 34ch
  prose-max-measure: 68ch
  tap-target-min: 44px
---

## Brand & Style

**Minimalismo editorial.** El sitio se comporta como una antología bien editada: presenta la Cita y se aparta. La identidad no está en un logotipo ni en un color de marca — está en el trato tipográfico del texto ajeno y en la cantidad de aire que lo rodea.

Esto no es una elección estética arbitraria: es la forma que respalda la promesa del producto. Un sitio que promete procedencia verificada y se presenta con fondos texturizados, contadores y publicidad intercalada se contradice a sí mismo. La sobriedad *es* el argumento.

**Voz visual:** serena, sin solemnidad impostada. El sitio nunca adjetiva la Cita ni la comenta. Nada compite con el texto: ni sombras, ni degradados, ni ilustración decorativa, ni animación de entrada.

**Anti-referencias explícitas** — los sitios de citas en español actuales: su tipografía pequeña y lo que enumera `EXPERIENCE.md § Inspiration & Anti-patterns`.

## Colors

Paleta de papel e imprenta. Cinco valores hacen todo el trabajo; el resto son escalones intermedios.

- **Papel (`{colors.surface}` #FAF7F0)** — el lienzo. Cálido y no clínico: reduce la fatiga en lectura nocturna prolongada, que es el contexto real de uso (UJ-1).
- **Tinta (`{colors.on-surface}` #1F1B16)** — negro cálido, nunca #000. Es el color de la Cita y de todo texto principal.
- **Tinta apagada (`{colors.on-surface-variant}` #5A5147)** — atribución secundaria, Procedencia, metadatos.
- **Siena (`{colors.primary}` #8C4A2F)** — el único acento de la interfaz, y significa **actuar o salir** *(v7.1)*. Su regla va debajo de esta lista.
- **Filete (`{colors.outline-variant}` #DDD5C7)** — reglas de 1px. Separa sin encerrar.

**La regla del siena** *(v7.1)*. Lo decide la función del elemento, no cuántas veces aparece:

- **Lo lleva** lo que actúa o saca del sitio: los botones (relleno o filete), la paginación [ASSUMPTION], «Buscar» y los enlaces de salida a una Fuente o a una edición, en siena y subrayados; también el anillo de foco. La primera pantalla de la Página de Cita lo lleva en cinco sitios, todos secundarios y ninguno de relleno.
- **Va en tinta** la navegación que informa —el nombre del Autor, el título de la Obra—, subrayada; los Temas y las Colecciones van en chip.
- **Nunca es la única señal de salida:** la dice también el texto, como en «Texto tomado de…» [ASSUMPTION].
- **Gobierna la interfaz:** las imágenes que salen del sitio —Imagen de Cita, Tarjeta Social, Pieza de Canal, Imagen del Kit— no son interfaz y llevan el siena como marca.

**Contrastes.** Todo el texto pasa AA sobre papel, y ninguna pareja de la paleta separa un enlace del texto de su línea por los 3:1 que pide WCAG 1.4.1:

| Pareja | Contraste | Qué mide |
|---|---|---|
| Tinta sobre papel | 16,0:1 | texto sobre fondo |
| Tinta apagada sobre papel | 7,26:1 | texto sobre fondo |
| Siena sobre papel | 6,3:1 | texto sobre fondo |
| Tinta frente a tinta apagada | 2,20:1 | enlace frente a su texto |
| Siena frente a tinta apagada | 1,16:1 | enlace frente a su texto |
| Siena frente a tinta | 2,56:1 | enlace frente a su texto |

Por eso el color nunca basta para señalar un enlace: qué enlaces se subrayan siempre —también el nombre del Autor en la Atribución— y cuáles identifican su forma y su posición lo fija `EXPERIENCE.md § Accessibility Floor`. [ASSUMPTION]

El azul (`{colors.secondary}`) queda reservado para estados informativos de la herramienta interna de curación. **No aparece en las superficies públicas.**

**Modo oscuro: fuera de la v1.** La dirección elegida es luminosa por definición, y un segundo tema duplicaría el trabajo de plantillas de Imagen de Cita. Decisión registrada, no olvido.

## Typography

La tipografía es el producto. Dos familias, sin excepciones.

- **Source Serif 4** — la voz de la Cita. Serif de lectura con cobertura completa de diacríticos españoles (á é í ó ú ü ñ ¿ ¡ « »), variable, licencia abierta. Se usa para el texto citado y para los nombres de Autor, Tema y Colección.
- **Inter** — la voz del sistema. Atribución, navegación, metadatos, interfaz. Nunca toca el texto de una Cita.

**La regla que gobierna todo:** el texto de la Cita se compone con `quote-*`; ningún otro contenido puede usar esos tokens. Si algo que no es una Cita aparece en Source Serif a 44px, es un error de implementación.

**El título de una Obra va en Inter** *(v5; con titular propio desde la v7.1)*, nunca en la serif, en toda superficie: la Obra ya se muestra en Inter en la Atribución de cada Página de Cita, y vestir la misma entidad de dos formas según dónde aparezca es divergencia sin motivo. Lo fija también la espina de arquitectura en sus Consistency Conventions. Como titular de la Cabecera de Obra usa `{typography.title-lg}` —Inter 600—, y no hay un segundo tamaño por longitud: un título largo ocupa más líneas, nunca un cuerpo menor (NFR-12). Qué título se muestra lo fija `EXPERIENCE.md § Component Patterns`, en la Atribución (FR-53).

**Escala adaptativa de la Cita.** El tamaño se elige por tramos según la longitud del texto, no de forma continua — así el resultado es predecible y verificable. Los tramos y su umbral de corte viven en `EXPERIENCE.md § Tipografía adaptativa de la Cita`, porque son una regla de comportamiento, no un valor visual.

**Atribución:** el nombre del Autor va en `{typography.author}` — Inter, versalitas ópticas por `letter-spacing` abierto y mayúsculas. Es lo que separa visualmente la voz de quien habla de la voz del sitio. La Procedencia va debajo en `{typography.caption}`, en tinta apagada.

**Comillas:** angulares españolas « » alrededor del texto de la Cita, no comillas rectas ni inglesas. Es una decisión de identidad y de corrección ortográfica a la vez.

**En CSS**, un token de tipografía da solo su cuerpo: la familia sale de `--serif` o `--sans`, y el peso, el interlineado y el espaciado los escribe cada componente. La correspondencia de todos los tokens con su propiedad CSS está al cierre de `§ Components`.

## Layout & Spacing

Retícula de una sola columna centrada. No hay barra lateral, ni carrusel, ni bloques laterales de «también te puede interesar» que compitan con el contenido.

- **Medida de la Cita:** máximo `{components.quote-max-measure}` (34ch). Una línea de texto citado más larga que eso deja de leerse de un vistazo, y el vistazo es todo lo que UJ-1 concede.
- **Medida de prosa:** máximo `{components.prose-max-measure}` (68ch) para semblanzas y listados.
- **Respiración:** `{spacing.quote-breathing}` (64px) por encima y por debajo del bloque de Cita en escritorio; 40px en móvil. Es el espacio el que comunica que esto es una antología y no un listado.
- **Márgenes:** `{spacing.margin-mobile}` (20px) en móvil, `{spacing.gutter}` (24px) en tableta y `{spacing.margin-desktop}` (56px) en escritorio, según los puntos de ruptura de `EXPERIENCE.md § Responsive & Platform`. El contenido se enmarca, nunca sangra al borde de la pantalla.
- **Ritmo vertical:** múltiplos de `{spacing.unit}` (8px). Sin excepciones.

## Elevation & Depth

**No hay elevación.** El sistema es plano por decisión: cero sombras, cero elevación tonal en superficies públicas.

La jerarquía se comunica con tres recursos, en este orden: **tamaño tipográfico**, **espacio en blanco**, **filete de 1px**. Cuando se necesite delimitar una zona (por ejemplo, una tarjeta de Cita en un listado), se usa un filete en `{colors.outline-variant}` o un cambio a `{colors.surface-container-low}` — nunca una sombra.

Único uso de profundidad en todo el producto: el Diálogo de Imagen, modal, que atenúa el fondo con `{colors.on-surface}` al 40 % de opacidad. Es la excepción que confirma la regla.

## Shapes

**Casi recto.** `{rounded.DEFAULT}` (3px) es el radio base — suficiente para no cortar, insuficiente para parecer una app. Los botones y los campos comparten ese radio; las tarjetas usan `{rounded.lg}` (6px).

La Imagen de Cita generada tiene esquinas **rectas**: es un objeto para publicar en otro sitio, no un elemento de esta interfaz.

Sin píldoras, sin círculos salvo el avatar del Autor si algún día existe.

## Components

Agrupados por superficie, con los mismos grupos y en el mismo orden que `EXPERIENCE.md § Component Patterns`.

### Primitivas

- **Botones** — texto en Inter 15px, altura mínima `{components.tap-target-min}` (44px). El primario es siena sólido con texto blanco; el secundario es texto en siena con filete de 1px. Relleno lateral generoso.
- **Filete divisorio** — 1px, `{colors.outline-variant}`, ancho completo de la medida de texto. El único separador del sistema.
- **Iconografía** — no hay iconos en el producto: las acciones se nombran con texto. Un icono sería decoración y no entra. [ASSUMPTION]

### Cabecera

- **Cabecera** — la marca, enlace a la portada, y el enlace «Buscar», en `{typography.body-md}` y `{colors.primary}`, con alto mínimo `{components.tap-target-min}`. Qué lleva y adónde lleva: `EXPERIENCE.md § Component Patterns`.

### Página de Cita

- **Bloque de Cita** — el componente central. Texto en el token `quote-*` que corresponda al tramo, comillas angulares, filete corto (48px, 1px, `{colors.outline-variant}`) debajo, y luego la Atribución. Sin recuadro, sin fondo propio: la Cita flota sobre el papel.
- **Atribución** — nombre del Autor en `{typography.author}`, enlazado en `{colors.on-surface}` (no en siena: el nombre no es una llamada a la acción, es información) y **subrayado siempre** (`§ Colors`, WCAG 1.4.1). Procedencia debajo en `{typography.caption}` y `{colors.on-surface-variant}`. *(v7.1)* Dentro de la línea de la Procedencia, el título de la Obra enlazado va en `{colors.on-surface}` —más oscuro que el resto de la línea— y subrayado siempre, con el mismo criterio que el nombre del Autor.
- **Línea de la Fuente** *(recoge lo construido)* — en la Página de Cita, debajo de la Atribución y a `{spacing.unit}` de la Procedencia: «Texto tomado de {rótulo}.» y, si consta, la licencia, en `{typography.caption}` y `{colors.on-surface-variant}`. El nombre de la Fuente es el enlace, en `{colors.primary}` y subrayado: es salida y va dentro de una frase. Sin filete propio. [ASSUMPTION]
- **Acciones de la Página de Cita** *(recoge lo construido)* — Copiar, Imagen y Compartir la cita, debajo de la Atribución y de la Línea de la Fuente. Cada una va en su propia línea y a su ancho, en todas las anchuras [ASSUMPTION]. El orden es: «Copiar la cita», «Descargar como imagen» —«Compartir como imagen» donde el navegador sabe compartir ficheros— y «Compartir la cita». Las tres son el botón secundario: texto en `{typography.body-md}` y `{colors.primary}`, filete de `{components.rule-width}` en `{colors.primary}`, radio `{rounded.DEFAULT}`, alto mínimo `{components.tap-target-min}` y 3 × `{spacing.unit}` de relleno lateral. Al pasar el cursor se rellenan de `{colors.primary}` con el texto en `{colors.on-primary}`, y Copiar se queda así mientras dice «Copiado.». **Ninguna es primaria:** fuera del Diálogo de Imagen, la Página de Cita no lleva relleno sólido. Copiar abre el grupo a 4 × `{spacing.unit}` de lo de arriba; las otras dos van a 2 × `{spacing.unit}`. Donde no hay hoja del sistema, «Compartir la cita» se sustituye por los destinos, en fila, con el mismo trato y separados por `{spacing.unit}`. Si el portapapeles falla, bajo Copiar aparece el texto para copiarlo a mano: la indicación en `{typography.caption}` y `{colors.on-surface-variant}`, y el campo en `{typography.body-md}` y `{colors.on-surface}` sobre `{colors.surface-container-low}`, con filete `{colors.outline-variant}` y radio `{rounded.DEFAULT}`, dentro de la medida de prosa. Ninguna de las tres lleva icono.
- **Diálogo de Imagen** *(recoge lo construido)* — el diálogo nativo, sobre la Página de Cita y con la atenuación de `§ Elevation & Depth`. Fondo `{colors.surface}`, filete de `{components.rule-width}` en `{colors.outline-variant}`, radio `{rounded.lg}` y 3 × `{spacing.unit}` de relleno. Arriba, «Elige un diseño.» en `{typography.body-md}` y, a `{spacing.gutter}`, «Cerrar» como botón secundario. Debajo, a 3 × `{spacing.unit}`, los botones de plantilla —Papel, Tinta y Siena—, secundarios y separados por `{spacing.unit}`; el elegido, relleno de `{colors.primary}` con el texto en `{colors.on-primary}`. Luego la previsualización a todo el ancho, con esquinas rectas y filete `{colors.outline-variant}`, a 3 × `{spacing.unit}` arriba y abajo. Al final va el botón primario —relleno `{colors.primary}`, texto `{colors.on-primary}`, a todo el ancho y con 4 × `{spacing.unit}` de relleno lateral—, que dice «Compartir» o «Descargar»: es el único botón primario de la Página de Cita, y solo existe con el diálogo abierto. Las plantillas de la imagen: Papel, en `{colors.surface}` con el texto en `{colors.on-surface}`; Tinta, invertida, en `{colors.on-surface}` con el texto en `{colors.surface}`; Siena, en `{colors.primary}` con el texto en `{colors.on-primary}`.
- **Rutas de salida** *(recoge lo construido)* — al pie de la Página de Cita y dentro de la medida de prosa: a vez y media la respiración de `§ Layout & Spacing` bajo las acciones, un filete superior `{colors.outline-variant}` y 3 × `{spacing.unit}` de aire. Cada grupo —«Más de {Autor}», «Temas»— lleva su rótulo en `{typography.author}` y `{colors.on-surface-variant}`, con 2 × `{spacing.unit}` hasta su contenido y 4 × `{spacing.unit}` entre grupos. Las Citas hermanas son un fragmento entre comillas angulares, en Source Serif al tamaño de `{typography.body-lg}` y en `{colors.on-surface}`, sin subrayado salvo al pasar el cursor; una por fila, con alto mínimo `{components.tap-target-min}` y filete `{colors.outline-variant}` entre filas. No son Tarjetas de Cita: ni cambian de fondo al pasar el cursor ni llevan el nombre del Autor, que ya dice el rótulo. Los Temas van con el Chip de Tema, separados por `{spacing.unit}`.

### Listados

- **Tarjeta de Cita** — fragmento de la Cita en `{typography.headline-sm}`, nombre del Autor en `{typography.author}`, filete divisorio entre tarjetas. Sin imagen ni fondo propio. Al pasar el cursor, sin sombra: solo el fondo pasa a `{colors.surface-container-low}`. *(v7.1)* En las Páginas de Obra y de Autor va sin el nombre del Autor (`EXPERIENCE.md § Component Patterns`).
- **Paginación** *(recoge lo construido)* — sin filete propio: el listado ya cierra con el de su última tarjeta, y la separación la dan 3 × `{spacing.unit}` de aire. En una sola fila, «Anterior» en un extremo y «Siguiente» en el otro, en `{typography.body-md}` y `{colors.primary}`, sin subrayado salvo al pasar el cursor y con alto mínimo `{components.tap-target-min}`. En medio, «Página N de M» en `{typography.caption}` y `{colors.on-surface-variant}`, y los números de página en `{typography.caption}` y `{colors.primary}`, cada uno en su zona de toque cuadrada de `{components.tap-target-min}`. Las zonas se separan por `{spacing.unit}`, como toda zona de toque; hoy van más juntas: no cumple, defecto anotado. El número actual no enlaza: va en `{colors.on-surface}` y con más peso. Donde no hay página anterior o siguiente queda su sitio vacío, para que la fila no se descoloque.
- **Chip de Tema** *(recoge lo construido)* — el nombre en Source Serif al cuerpo de `{typography.body-md}` y en `{colors.on-surface}`, sobre `{colors.surface-container}`, que cambia a `{colors.surface-container-high}` al pasar el cursor; radio `{rounded.lg}`, alto mínimo `{components.tap-target-min}` y 2 × `{spacing.unit}` de relleno lateral. Entre chips, `{spacing.unit}`. Nunca en siena: los Temas son navegación, no acento. [ASSUMPTION]
- **Chip de Colección** — idéntico al de Tema. Que se distingan no es trabajo del chip: lo dice el sitio donde aparece y el nombre que lleva.

### Página de Colección

- **Nombre de Colección** *(recoge lo construido)* — `{typography.headline-md}` en Source Serif, sobre la primera tarjeta del listado y sin nada entre los dos (`EXPERIENCE.md § Component Patterns`): la página abre por el contenido. Ocupa **una sola línea** en la Página de Colección, donde a 30px dentro de la medida de prosa se cumple sola; donde la medida es otra —la Pieza, con 888px útiles— un nombre largo se reparte en dos líneas y debe repartirse, porque recortarlo o encogerlo lo prohíbe NFR-12, con más razón sobre el identificador de lo que se anuncia que sobre una Cita.
- **Criterio de Colección** — `{typography.caption}` en `{colors.on-surface-variant}`, al pie del listado, dentro de la medida de prosa. Es prosa propia del sitio y comparte página con Citas —desde la v7.1 no es la única: también lo es la Nota de la Ficha de Obra—, y va en el mismo tamaño y color que la Procedencia: deliberadamente por debajo de todo lo citado.

### Página de Autor

- **Ficha de Autor** *(v5; recoge lo construido; en parte sin construir)* — abre la Página de Autor, dentro de la medida de prosa. **Construido:** el nombre como `h1` en `{typography.headline-md}` y `{colors.on-surface}`; a `{spacing.unit}`, los años en `{typography.caption}` y `{colors.on-surface-variant}`; y a 2 × `{spacing.unit}`, la semblanza. El catálogo empieza 5 × `{spacing.unit}` más abajo, con el rótulo «Citas documentadas» en `{typography.author}` y `{colors.on-surface-variant}`, sin recuento, y el listado a 2 × `{spacing.unit}` del rótulo, con su filete superior. **Sin construir** (Épica 17): la atribución de la semblanza; la Lista de Obras, que la maqueta del orden B pone entre la semblanza y el catálogo; y que la Ficha de Autor viva solo en la primera página —hoy se pinta también en las 2+—. En qué difiere la maqueta: `EXPERIENCE.md § Component Patterns → Maquetas`.
- **Semblanza con fuente** *(v5; recoge lo construido; en parte sin construir)* — la semblanza va en `{typography.body-lg}` y `{colors.on-surface}`, en Inter: no es voz citada. **Su atribución está sin construir** (Épica 17). La maqueta la pone justo debajo, en una línea —«Semblanza de {fuente, revisión} · {licencia}»— en `{typography.caption}` y `{colors.on-surface-variant}`, con la fuente como enlace de salida (`§ Colors`).
- **Lista de Obras** *(v5 → v7.1; sin construir)* — no existe todavía (Épica 17). Lo que fija la maqueta del orden B: va entre la atribución de la semblanza y el catálogo, bajo su propio rótulo —en la maqueta, «Su obra en este Corpus»—, con el trato del rótulo «Citas documentadas» [ASSUMPTION]. Una entrada por fila, separadas por filete `{colors.outline-variant}` y con alto mínimo `{components.tap-target-min}`: el título de la Obra a la izquierda, en Inter (`§ Typography`), y el recuento de sus Citas a la derecha, en `{colors.on-surface-variant}` y con cifras tabulares. Desde la v7.1 cada entrada enlaza a su Página de Obra, y el título va en `{colors.on-surface}`: es navegación que informa (`§ Colors`) [ASSUMPTION]. Los cuerpos del título y del recuento quedan sin fijar: la maqueta los dibuja fuera de la escala de tokens.

### Página de Obra

- **Cabecera de Obra** *(v7.1)* — el título como `h1` en `{typography.title-lg}` y `{colors.on-surface}`, con las líneas equilibradas y sin segundo tamaño (`§ Typography`). Debajo, a `{spacing.unit}`, «de {Autor} · {año}» en `{typography.body-md}`: «de» y el año en `{colors.on-surface-variant}`, el nombre en `{colors.on-surface}` y subrayado, con su zona de toque de `{components.tap-target-min}` (`EXPERIENCE.md § Interaction Primitives`). El listado empieza 4 × `{spacing.unit}` más abajo, con su filete. Cómo crece con un título largo: `EXPERIENCE.md § Component Patterns`. El título manda en la Cabecera de Obra, como el nombre en la Ficha de Autor.
- **Dónde leer esta obra** *(v7.1)* — al pie, con el rótulo de sección en `{typography.author}` y `{colors.on-surface-variant}`, el mismo de las Rutas de salida y de los Temas. Debajo, el rótulo de cada parte —«Edición cotejada, gratuita» y, con el Modelo de afiliación (`afiliacion-de-libros`) encendido, «Ediciones en venta»— va en `{typography.caption}` con el peso de `{typography.author}` y en `{colors.on-surface}`, para que la jerarquía tenga una señal que no sea el color [ASSUMPTION]. Bajo cada rótulo, sus líneas en `{typography.caption}` y `{colors.on-surface-variant}`, dentro de la medida de prosa. El nombre de la Fuente es el enlace, como enlace de salida (`§ Colors`). Su ritmo vertical, en el Pie de la Página de Obra.
- **Ediciones en venta** *(v7.1)* — con el mismo trato que las líneas de la edición cotejada; el enlace —«Edición impresa en {tienda}» o «Edición electrónica en {tienda}»— va como enlace de salida (`§ Colors`). [ASSUMPTION] **Sin tokens ni hoja de estilos propios:** la presentación va en atributos `style` dentro del elemento `data-ingreso`, con los tokens del sistema, para que, con el Modelo apagado, no quede ni una regla CSS en ninguna página (AD-20). Con el Modelo apagado, el bloque no existe: `EXPERIENCE.md § State Patterns`.
- **Nota de la Ficha de Obra** *(v7.1)* — `{typography.caption}` en `{colors.on-surface-variant}`, después de «Dónde leer esta obra» y fuera de su sección, precedida de un filete `{colors.outline-variant}` y sin encabezado, dentro de la medida de prosa [ASSUMPTION]: el mismo cuerpo y color que el Criterio de Colección, y por la misma razón.
- **Pie de la Página de Obra** *(v7.1)* — el de la primera página sigue el ritmo de la maqueta de la variante elegida: 5 × `{spacing.unit}` de la paginación a «Temas», 4 × hasta «Dónde leer esta obra», 2 × del `h2` al primer rótulo y 1 × del rótulo a sus líneas; la Nota de la Ficha de Obra, 4 × por encima de su filete y 3 × por debajo [ASSUMPTION]. Composición final en [`mockups/pagina-de-obra.html`](mockups/pagina-de-obra.html).

### Búsqueda

- **Campo de búsqueda** — vive en `/buscar/` y en el 404; desde las demás superficies se llega por la Cabecera. Filete inferior de `{components.rule-width}` en `{colors.outline}`. Sin caja, sin sombra, sin icono. Al recibir foco lleva el anillo global de `EXPERIENCE.md § Accessibility Floor`, como todo lo enfocable; hoy lo suprime y en su lugar el filete pasa a `{colors.primary}` y se engruesa: no cumple, defecto anotado. [ASSUMPTION]
- **Resultado de búsqueda** *(recoge lo construido; Obra, v7.1)* — en `/buscar/`, dentro de la medida de prosa: una fila por resultado, con filete inferior `{colors.outline-variant}`, alto mínimo `{components.tap-target-min}` y 2 × `{spacing.unit}` de relleno vertical; toda la fila es el enlace. Arriba, el rótulo de tipo —«Cita», «Autor», «Tema», «Colección» u «Obra»— en mayúsculas con el espaciado de `{typography.author}`, al cuerpo y peso de `{typography.caption}` y en `{colors.on-surface-variant}`; a `{spacing.unit}`, el título en Source Serif al cuerpo de `{typography.headline-sm}` y en `{colors.on-surface}`. Encima de la lista, el recuento en `{typography.caption}` y `{colors.on-surface-variant}`. [ASSUMPTION] **El de Obra** lleva el título en Inter (`§ Typography`), con el mismo cuerpo y peso que los demás: solo cambia la familia, sin token nuevo. Debajo, el nombre del Autor en `{typography.author}` y `{colors.on-surface-variant}`, como en la Tarjeta de Cita. [ASSUMPTION]

### Modelos de ingreso

- **Invitación de donación** *(recoge lo construido)* — al final de la columna, tras un filete superior y con el aire de las Rutas de salida, dentro de la medida de prosa. La frase en `{typography.body-md}` y `{colors.on-surface-variant}`; el enlace «Apoyar el sitio» en `{typography.body-md}` y `{colors.primary}`, porque saca del sitio, con su zona de toque completa (`{components.tap-target-min}`). Sin tokens ni hoja de estilos propios, por la misma razón que las ediciones en venta: atributos `style` dentro de `data-ingreso` (AD-20). [ASSUMPTION]

### Imágenes que salen del sitio

- **Tarjeta Social** *(recoge lo construido; Obra, v7.1)* — la previsualización que el build rasteriza para las redes (FR-19). No es interfaz: como toda imagen que sale del sitio, lleva el siena como marca (`§ Colors`), en una banda de `{colors.primary}` en el borde superior del lienzo, que va en `{colors.surface}`. Al pie, la marca en versalitas, en la familia de la interfaz y `{colors.on-surface-variant}`, salvo en la de portada, donde el título ya es la marca. Los cuerpos son píxeles del lienzo y no salen de la escala de tokens. Se rasteriza con las familias de reserva del código, no con las del sitio: la serif sale en Georgia, que la pila pide antes que Source Serif 4, y la de la interfaz en la sans del sistema, porque el rasterizador del build no tiene Inter. [ASSUMPTION] Cuatro variantes:
  - **de Cita** — el texto entre comillas angulares en la serif y `{colors.on-surface}`, al cuerpo que `src/lib/tramos.ts` da a su tramo en la Tarjeta; un filete corto en `{colors.outline-variant}`; el Autor en versalitas, en la familia de la interfaz y `{colors.on-surface}`; y la obra y el año en `{colors.on-surface-variant}`. Por encima del corte de FR-10 no lleva ni una palabra de la Cita: el nombre del Autor en la serif, debajo la obra y el año, y la marca.
  - **de listado** (portada, Tema y Colección) — el nombre de la página en la serif y `{colors.on-surface}`, repartido en las líneas que haga falta y nunca recortado; un filete corto en `{colors.outline-variant}`; y debajo la bajada —la descripción del sitio, la del Tema o el criterio de la Colección— en la familia de la interfaz y `{colors.on-surface-variant}`, cortada a cuatro líneas.
  - **de Autor** *(v5; en parte sin construir)* — hoy, la de listado con el nombre del Autor, y la semblanza como bajada. Los hechos derivados que la sustituyen —años y recuento de Citas documentadas— están **sin construir** (Épica 17), y su composición, sin fijar.
  - **de Obra** *(v7.1; sin construir)* — la de listado con el título de la Obra en la familia de la interfaz (`§ Typography`), y como bajada la línea de hechos de `EXPERIENCE.md § Component Patterns`. Conserva la banda siena. [ASSUMPTION]

### De token a propiedad CSS

Los tokens conservan los nombres del formato de DESIGN.md; el código los declara una sola vez, en español, en `src/styles/tokens.css`. Esta es la correspondencia de todos los grupos de tokens; cómo da un token de tipografía su propiedad está en `§ Typography`. Los tokens que no aparecen aquí no tienen propiedad declarada.

| Token | Propiedad CSS |
|---|---|
| `{colors.surface}` | `--papel` |
| `{colors.surface-dim}` · `{colors.surface-bright}` | `--papel-tenue` · `--papel-claro` |
| `{colors.surface-container-lowest}` · `{colors.surface-container-low}` · `{colors.surface-container}` · `{colors.surface-container-high}` · `{colors.surface-container-highest}` | `--contenedor-minimo` · `--contenedor-bajo` · `--contenedor` · `--contenedor-alto` · `--contenedor-maximo` |
| `{colors.on-surface}` · `{colors.on-surface-variant}` | `--tinta` · `--tinta-apagada` |
| `{colors.outline}` · `{colors.outline-variant}` | `--contorno` · `--filete` |
| `{colors.primary}` · `{colors.on-primary}` | `--siena` · `--sobre-siena` |
| familia de `quote-*` y `headline-*` | `--serif` |
| familia de `title-lg`, `body-*`, `author` y `caption` | `--sans` |
| `{typography.quote-xl}` · `{typography.quote-lg}` · `{typography.quote-md}` · `{typography.quote-sm}` | `--cita-xl` · `--cita-lg` · `--cita-md` · `--cita-sm` |
| `{typography.headline-md}` · `{typography.headline-sm}` | `--titular-md` · `--titular-sm` |
| `{typography.title-lg}` | `--titular-obra` —todavía sin declarar—, no `--titular-lg`, que se confundiría con los dos titulares serif |
| `{typography.body-lg}` · `{typography.body-md}` | `--cuerpo-lg` · `--cuerpo-md` |
| `{typography.author}` · `{typography.caption}` | `--autor` · `--pie` |
| `{rounded.DEFAULT}` · `{rounded.lg}` | `--radio` · `--radio-tarjeta` |
| `{spacing.unit}` · `{spacing.gutter}` | `--unidad` · `--canal` |
| `{spacing.margin-mobile}` · `{spacing.margin-desktop}` | `--margen`, que toma `margin-mobile`, `gutter` o `margin-desktop` según el punto de ruptura (`EXPERIENCE.md § Responsive & Platform`) |
| `{spacing.quote-breathing}` | `--respiracion`, que en móvil vale los 40px de `§ Layout & Spacing` |
| `{components.rule-width}` | `--grosor-filete` |
| `{components.quote-max-measure}` · `{components.prose-max-measure}` | `--medida-cita` · `--medida-prosa` |
| `{components.tap-target-min}` | `--zona-de-toque` |

## Do's and Don'ts

**Do**
- Dejar que la Cita sea lo primero visible sin desplazar en cualquier pantalla.
- Usar comillas angulares « » en el texto citado.
- Reservar el siena de la interfaz para lo que actúa o saca del sitio (`§ Colors`).
- Dejar que la Página de Tema y la de Colección empiecen por su contenido, no por su explicación. *(Acotado en la v5: **la Página de Autor es la excepción y empieza por su Ficha de Autor**, porque las nueve consultas medidas que alcanzan el sitio son de Autor, y cuatro de ellas biográficas: ahí la explicación **es** el contenido que se vino a buscar.)*
- Componer la atribución en Inter para separarla de la voz citada.
- Mantener el filete de 1px como único separador.

**Don't**
- Nunca sombras, degradados ni texturas de fondo.
- Nunca un icono decorativo junto a una Cita.
- Nunca la palabra del sitio adjetivando la Cita («una frase preciosa»).
- Nunca Source Serif en algo que no sea una Cita, un nombre de Autor, de Tema o de Colección: tampoco en el título de una Obra (`§ Typography`) *(v7.1)*, ni como titular de la Cabecera de Obra ni en un resultado de búsqueda de tipo Obra, aunque los demás resultados lleven su título en serif.
- Nunca un modal, aviso de consentimiento o invitación antes de mostrar el contenido — lo prohíbe NFR-10.
- Nunca más de un nivel de anidamiento visual: la Cita no vive dentro de una tarjeta dentro de una sección.
