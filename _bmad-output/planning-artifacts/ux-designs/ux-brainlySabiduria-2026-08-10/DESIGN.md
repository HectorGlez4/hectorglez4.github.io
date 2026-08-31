---
name: Papel y Tinta
status: final
sources:
  - "{planning_artifacts}/prds/prd-brainlySabiduria-2026-08-10/prd.md"
updated: 2026-08-31
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

**Anti-referencias explícitas** — los sitios de citas en español actuales: fondos con textura o imagen, publicidad intercalada en el cuerpo del contenido, tipografía pequeña, listados densos sin jerarquía, botones de compartir de ocho redes apilados.

## Colors

Paleta de papel e imprenta. Cinco valores hacen todo el trabajo; el resto son escalones intermedios.

- **Papel (`{colors.surface}` #FAF7F0)** — el lienzo. Cálido y no clínico: reduce la fatiga en lectura nocturna prolongada, que es el contexto real de uso (UJ-1).
- **Tinta (`{colors.on-surface}` #1F1B16)** — negro cálido, nunca #000. Es el color de la Cita y de todo texto principal. Contraste 15,8:1 sobre papel.
- **Tinta apagada (`{colors.on-surface-variant}` #5A5147)** — atribución secundaria, procedencia, metadatos. Contraste 7,4:1.
- **Siena (`{colors.primary}` #8C4A2F)** — el único acento. Enlaces, foco, acción primaria. Se usa con avaricia: si aparece en más de dos sitios de una pantalla, algo está mal.
- **Filete (`{colors.outline-variant}` #DDD5C7)** — reglas de 1px. Separa sin encerrar.

El azul (`{colors.secondary}`) queda reservado para estados informativos de la herramienta interna de curación. **No aparece en las superficies públicas.**

**Modo oscuro: fuera de la v1.** La dirección elegida es luminosa por definición, y un segundo tema duplicaría el trabajo de plantillas de Imagen de Cita. Decisión registrada, no olvido.

## Typography

La tipografía es el producto. Dos familias, sin excepciones.

- **Source Serif 4** — la voz de la Cita. Serif de lectura con cobertura completa de diacríticos españoles (á é í ó ú ü ñ ¿ ¡ « »), variable, licencia abierta. Se usa para el texto citado y para los títulos de Autor, Tema y Colección.
- **Inter** — la voz del sistema. Atribución, navegación, metadatos, interfaz. Nunca toca el texto de una Cita.

**La regla que gobierna todo:** el texto de la Cita se compone con `quote-*`; ningún otro contenido puede usar esos tokens. Si algo que no es una Cita aparece en Source Serif a 44px, es un error de implementación.

**Escala adaptativa de la Cita.** El tamaño se elige por tramos según la longitud del texto, no de forma continua — así el resultado es predecible y verificable. Los tramos y su umbral de corte viven en `EXPERIENCE.md § Tipografía adaptativa de la Cita`, porque son una regla de comportamiento, no un valor visual.

**Atribución:** el nombre del Autor va en `{typography.author}` — Inter, versalitas ópticas por `letter-spacing` abierto y mayúsculas. Es lo que separa visualmente la voz de quien habla de la voz del sitio. La Procedencia va debajo en `{typography.caption}`, en tinta apagada.

**Comillas:** angulares españolas « » alrededor del texto de la Cita, no comillas rectas ni inglesas. Es una decisión de identidad y de corrección ortográfica a la vez.

## Layout & Spacing

Retícula de una sola columna centrada. No hay barra lateral, ni carrusel, ni bloques laterales de "también te puede interesar" que compitan con el contenido.

- **Medida de la Cita:** máximo `{components.quote-max-measure}` (34ch). Una línea de texto citado más larga que eso deja de leerse de un vistazo, y el vistazo es todo lo que UJ-1 concede.
- **Medida de prosa:** máximo `{components.prose-max-measure}` (68ch) para semblanzas y listados.
- **Respiración:** `{spacing.quote-breathing}` (64px) por encima y por debajo del bloque de Cita en escritorio; 40px en móvil. Es el espacio el que comunica que esto es una antología y no un listado.
- **Márgenes:** `{spacing.margin-mobile}` (20px) en móvil — el contenido se enmarca, nunca sangra al borde de la pantalla.
- **Ritmo vertical:** múltiplos de `{spacing.unit}` (8px). Sin excepciones.

## Elevation & Depth

**No hay elevación.** El sistema es plano por decisión: cero sombras, cero elevación tonal en superficies públicas.

La jerarquía se comunica con tres recursos, en este orden: **tamaño tipográfico**, **espacio en blanco**, **filete de 1px**. Cuando se necesite delimitar una zona (por ejemplo, una tarjeta de Cita en un listado), se usa un filete en `{colors.outline-variant}` o un cambio a `{colors.surface-container-low}` — nunca una sombra.

Único uso de profundidad en todo el producto: el diálogo modal de la Imagen de Cita, que atenúa el fondo con `{colors.on-surface}` al 40 % de opacidad. Es la excepción que confirma la regla.

## Shapes

**Casi recto.** `{rounded.DEFAULT}` (3px) es el radio base — suficiente para no cortar, insuficiente para parecer una app. Los botones y los campos comparten ese radio; las tarjetas usan `{rounded.lg}` (6px).

La Imagen de Cita generada tiene esquinas **rectas**: es un objeto para publicar en otro sitio, no un elemento de esta interfaz.

Sin píldoras, sin círculos salvo el avatar del Autor si algún día existe.

## Components

- **Bloque de Cita** — el componente central. Texto en el token `quote-*` que corresponda al tramo, comillas angulares, filete corto (48px, 1px, `{colors.outline-variant}`) debajo, y luego la atribución. Sin recuadro, sin fondo propio: la Cita flota sobre el papel.
- **Atribución** — nombre del Autor en `{typography.author}` enlazado en `{colors.on-surface}` (no en siena: el nombre no es una llamada a la acción, es información). Subrayado al pasar el cursor. Procedencia debajo en `{typography.caption}` y `{colors.on-surface-variant}`.
- **Botones** — texto en Inter 15px, altura mínima `{components.tap-target-min}` (44px). El primario es siena sólido con texto blanco; el secundario es texto en siena con filete de 1px. Padding horizontal generoso.
- **Campo de búsqueda** — filete inferior de 1px en `{colors.outline}` que pasa a `{colors.primary}` con 2px al recibir foco. Sin caja, sin sombra, sin icono decorativo a la izquierda.
- **Tarjeta de Cita (listados)** — fragmento de la Cita en `headline-sm`, autor en `{typography.author}`, filete divisorio entre tarjetas. Sin imagen, sin fondo, sin sombra al pasar el cursor: solo el fondo pasa a `{colors.surface-container-low}`.
- **Chip de Tema** — texto en `{typography.caption}`, fondo `{colors.surface-container}`, radio `{rounded.md}`. Nunca en siena: los Temas son navegación, no acento.
- **Chip de Colección** — idéntico al de Tema. Que se distingan no es trabajo del chip: lo dice el sitio donde aparece y el nombre que lleva.
- **Nombre de Colección** — `{typography.headline-md}` en Source Serif, sobre la primera tarjeta del listado. Sin subtítulo, sin bajada, sin recuento: la página abre por el contenido. En la Página de Colección ocupa **una sola línea**, y eso no es una restricción que haya que hacer cumplir: a 30px dentro de la medida de prosa se cumple sola. Donde la medida es otra —la Pieza, con 888px útiles— un nombre largo se reparte en dos líneas, y debe repartirse: recortarlo o encogerlo son las dos únicas alternativas y NFR-12 las prohíbe, con más razón sobre el identificador de lo que se anuncia que sobre una Cita.
- **Criterio de Colección** — `{typography.caption}` en `{colors.on-surface-variant}`, al pie del listado, dentro de la medida de prosa. Es la única prosa propia del sitio que comparte página con Citas, y va en el mismo tamaño y color que la Procedencia — deliberadamente por debajo de todo lo citado.
- **Filete divisorio** — 1px, `{colors.outline-variant}`, ancho completo de la medida de texto. El único separador del sistema.
- **Iconografía** — de línea, 1,5px, sin relleno. Se usa exclusivamente para copiar, buscar y descargar. Cualquier otro icono es decoración y no entra.

## Do's and Don'ts

**Do**
- Dejar que la Cita sea lo primero visible sin desplazar en cualquier pantalla.
- Usar comillas angulares « » en el texto citado.
- Reservar el siena para una sola acción por pantalla.
- Dejar que una página de agregación empiece por su contenido, no por su explicación.
- Componer la atribución en Inter para separarla de la voz citada.
- Mantener el filete de 1px como único separador.

**Don't**
- Nunca sombras, degradados ni texturas de fondo.
- Nunca un icono decorativo junto a una Cita.
- Nunca la palabra del sitio adjetivando la Cita ("una frase preciosa").
- Nunca Source Serif en algo que no sea una Cita, un nombre de Autor, de Tema o de Colección.
- Nunca un modal, aviso de consentimiento o invitación antes de mostrar el contenido — lo prohíbe NFR-10.
- Nunca más de un nivel de anidamiento visual: la Cita no vive dentro de una tarjeta dentro de una sección.
