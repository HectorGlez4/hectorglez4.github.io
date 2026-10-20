---
name: Papel y Tinta
status: final
sources:
  - "{planning_artifacts}/prds/prd-brainlySabiduria-2026-08-10/prd.md"
  - "{planning_artifacts}/prds/prd-brainlySabiduria-2026-08-10/addendum.md"
  - "{planning_artifacts}/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md"
  - "docs/superpowers/specs/2026-10-05-pagina-de-obra-design.md"
  - "docs/superpowers/specs/2026-10-17-v8-cita-como-centro-design.md"
updated: 2026-10-20
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

- **Lo lleva** lo que actúa o saca del sitio: los botones (relleno o filete) —desde la v8 también «Mostrar 30 más» y «Quitar los filtros»—, la paginación [ASSUMPTION], «Buscar» y los enlaces de salida a una Fuente o a una edición, en siena y subrayados; también el anillo de foco. *(v8)* Cuenta como actuar lo que mueve al visitante dentro de la misma página —las letras de salto de los Directorios y el salto «Dónde leer esta obra ↓» de la Cabecera de Obra, los dos en siena por decisión de Héctor (18/10), y «Volver a las letras» [ASSUMPTION]— o entre las páginas de un mismo listado, que es la paginación. Ir a otra Página de Cita, aunque sea la siguiente de su Obra, es navegación que informa y va en tinta (abajo). También buscar, venga de donde venga: «Buscar «x» en las citas» del Directorio sin resultados va en siena.
- **Va en tinta** la navegación que informa —el nombre del Autor, el título de la Obra—: subrayada cuando va en una línea de texto, y sin subrayado cuando es un enlace de bloque, una fila entera (`EXPERIENCE.md § Accessibility Floor`). Los Temas y las Colecciones van en chip. *(v8)* La regla no se enmienda para la navegación nueva, que es toda de esta clase: «Autores» y «Obras» de la Cabecera (la variante 2A, decisión de Héctor); las filas de la Tarjeta de Obra, «Siguiente cita de esta obra →» y «Ver la obra →»; los cierres «Las {n} citas de… →»; «Las {n} obras →» y «Los {m} autores, de la A a la Z →» de la portada; las filas y las cabeceras de grupo de los Directorios; y «Ver esta cita» de la Cita del Día de la portada, que hoy está construido en siena [ASSUMPTION]. *(v8.2)* El del 404 sigue en siena (abajo).
- **La cifra no es la regla** *(v8)*. Con la Tarjeta de Obra, las acciones quedan por debajo de la primera pantalla de la Página de Cita a 360 × 640, y esa primera pantalla lleva el siena en dos sitios: «Buscar» y el enlace de la Fuente. Con una Cita sin Obra suben también las acciones, todas secundarias y ninguna de relleno. Lo que decide es la función de cada elemento, nunca el recuento.
- **Nunca es la única señal de salida:** la dice también el texto, como en «Texto tomado de…» [ASSUMPTION].
- **Gobierna la interfaz:** las imágenes que salen del sitio —Imagen de Cita en sus dos formatos, Tarjeta Social, Pieza de Canal, Imagen del Kit— no son interfaz y llevan el siena como marca.
- **No rige en el Kit Diario ni en el Lote** *(v8, decisión de Héctor del 18/10)*: son superficies internas y van como están construidas, con los enlaces por red y el aviso de fijación muda en siena (`§ Imágenes que salen del sitio → Material para publicar`).
- **Ni en «Ver esta cita» del 404** *(v8.2, decisión de Héctor del 2026-10-19)*: sigue en siena, como está construido (`§ Portada → Cita del Día`). Es la única navegación que informa que va en siena en una superficie pública.

**Contrastes.** Todo el texto pasa AA sobre papel, y ninguna pareja de la paleta separa un enlace del texto de su línea por los 3:1 que pide WCAG 1.4.1:

| Pareja | Contraste | Qué mide |
|---|---|---|
| Tinta sobre papel | 16,0:1 | texto sobre fondo |
| Tinta apagada sobre papel | 7,26:1 | texto sobre fondo |
| Siena sobre papel | 6,3:1 | texto sobre fondo |
| Tinta frente a tinta apagada | 2,20:1 | enlace frente a su texto |
| Siena frente a tinta apagada | 1,16:1 | enlace frente a su texto |
| Siena frente a tinta | 2,56:1 | enlace frente a su texto |
| Blanco sobre siena *(v8: se publica)* | 6,7:1 | texto del botón primario y del elegido |
| Contorno sobre papel *(v8)* | 3,66:1 | borde de un control —el filete del campo y la caja de los selectores—, que WCAG 1.4.11 pide a 3:1 |
| Contorno sobre contenedor bajo *(v8)* | 3,51:1 | borde del campo de copia manual, sobre su fondo (WCAG 1.4.11) |

Por eso el color nunca basta para señalar un enlace: qué enlaces se subrayan siempre —también el nombre del Autor en la Atribución— y cuáles identifican su forma y su posición lo fija `EXPERIENCE.md § Accessibility Floor`. [ASSUMPTION]

El azul (`{colors.secondary}`) queda reservado para estados informativos de la herramienta interna de curación. **No aparece en las superficies públicas.**

**Modo oscuro: fuera de la v1.** La dirección elegida es luminosa por definición, y un segundo tema duplicaría el trabajo de plantillas de Imagen de Cita. Decisión registrada, no olvido.

## Typography

La tipografía es el producto. Dos familias, sin excepciones.

- **Source Serif 4** — la voz de la Cita. Serif de lectura con cobertura completa de diacríticos españoles (á é í ó ú ü ñ ¿ ¡ « »), variable, licencia abierta. Se usa para el texto citado y para los nombres de Autor, Tema y Colección. *(v8)* Por eso la llevan también los nombres del Directorio de Autores, las cabeceras de grupo del Directorio de Obras y los Autores destacados de la portada: son nombres de Autor.
- **Inter** — la voz del sistema. Atribución, navegación, metadatos, interfaz. Nunca toca el texto de una Cita. *(v8)* También el texto que el visitante teclea en un campo —el de `/buscar/`, el de la portada, el de «Buscar en…» y el filtro de los Directorios—, al cuerpo de `{typography.body-lg}`: lo tecleado no es una Cita ni un nombre, y la regla de las dos familias no admite una tercera clase [ASSUMPTION]. En `/buscar/` y en el 404 cambia lo construido.

**La regla que gobierna todo:** el texto de la Cita se compone con `quote-*`; ningún otro contenido puede usar esos tokens. Si algo que no es una Cita aparece en Source Serif a 44px, es un error de implementación.

**El título de una Obra va en Inter** *(v5; con titular propio desde la v7.1)*, nunca en la serif, en toda superficie: la Obra ya se muestra en Inter en la Atribución de cada Página de Cita, y vestir la misma entidad de dos formas según dónde aparezca es divergencia sin motivo. Lo fija también la espina de arquitectura en sus Consistency Conventions. Como titular de la Cabecera de Obra usa `{typography.title-lg}` —Inter 600—, y no hay un segundo tamaño por longitud: un título largo ocupa más líneas, nunca un cuerpo menor (NFR-12). Qué título se muestra lo fija `EXPERIENCE.md § Component Patterns`, en la Atribución (FR-53). *(v8)* La misma regla alcanza a cada sitio nuevo que nombra una Obra: la Tarjeta de Obra, el título de la Obra dentro de la Tarjeta de Cita, las Obras de la portada, el Directorio de Obras y el selector de Obra de `/buscar/`. Y al título de un resultado de tipo Directorio y, *(v8.2)*, de tipo Portada, que no son nombre de Autor, Tema ni Colección [ASSUMPTION].

**Escala adaptativa de la Cita.** El tamaño se elige por tramos según la longitud del texto, no de forma continua — así el resultado es predecible y verificable. Los tramos y su umbral de corte viven en `EXPERIENCE.md § Tipografía adaptativa de la Cita`, porque son una regla de comportamiento, no un valor visual.

**Atribución:** el nombre del Autor va en `{typography.author}` — Inter, versalitas ópticas por `letter-spacing` abierto y mayúsculas. Es lo que separa visualmente la voz de quien habla de la voz del sitio. La Procedencia va debajo en `{typography.caption}`, en tinta apagada.

**Comillas:** angulares españolas « » alrededor del texto de la Cita, no comillas rectas ni inglesas. Es una decisión de identidad y de corrección ortográfica a la vez.

**En CSS**, un token de tipografía da solo su cuerpo: la familia sale de `--serif` o `--sans`, y el peso, el interlineado y el espaciado los escribe cada componente. La correspondencia de todos los tokens con su propiedad CSS está al cierre de `§ Components`.

**En el frontmatter** *(v8)*, la familia y el peso de cada token son los de su uso principal, no una regla para todo uso. Cuando un componente toma solo el cuerpo de un token, su fila dice la familia y el peso, y quien lea el YAML no debe tomarlos de él. Son dos parejas que se repiten y siete usos sueltos:
- Inter al cuerpo de `{typography.body-lg}` con peso 600: el título de la Tarjeta de Obra y el de las Obras de la portada;
- Source Serif al cuerpo de `{typography.headline-sm}` con peso 400: la Fila de Autor, los Autores destacados de la portada y el título del Resultado de búsqueda;
- y los usos sueltos:
  - Inter al cuerpo de `{typography.headline-md}` con peso 600: el Encabezado del Directorio;
  - `{typography.body-md}` con peso 600: las letras de salto;
  - Inter al cuerpo de `{typography.headline-sm}` con peso 400: el título de los resultados de tipo Obra, Directorio y Portada;
  - Source Serif al cuerpo de `{typography.body-md}`: el Chip de Tema y, *(v8.2)*, los Autores destacados de la búsqueda sin resultados, que van en él;
  - `{typography.caption}` con el peso de `{typography.author}`: el rótulo de cada parte de «Dónde leer esta obra»;
  - `{typography.caption}` en mayúsculas y con el espaciado de `{typography.author}`: el rótulo de tipo del Resultado de búsqueda;
  - Inter al cuerpo de `{typography.body-md}`, en negrita y mayúsculas, y Source Serif al cuerpo de `{typography.body-lg}`: el rótulo y la Cita del Material para publicar.

No se crean tokens para estas combinaciones: sus cuerpos son ya los de la escala [ASSUMPTION].

## Layout & Spacing

Retícula de una sola columna centrada. No hay barra lateral, ni carrusel, ni bloques laterales de «también te puede interesar» que compitan con el contenido.

- **Medida de la Cita:** máximo `{components.quote-max-measure}` (34ch). Una línea de texto citado más larga que eso deja de leerse de un vistazo, y el vistazo es todo lo que UJ-1 concede.
- **Medida de prosa:** máximo `{components.prose-max-measure}` (68ch) para semblanzas y listados.
- **Respiración:** `{spacing.quote-breathing}` (64px) por encima y por debajo del bloque de Cita en escritorio; 40px en móvil. Es el espacio el que comunica que esto es una antología y no un listado.
- **Márgenes:** `{spacing.margin-mobile}` (20px) en móvil, `{spacing.gutter}` (24px) en tableta y `{spacing.margin-desktop}` (56px) en escritorio, según los puntos de ruptura de `EXPERIENCE.md § Responsive & Platform`. El contenido se enmarca, nunca sangra al borde de la pantalla.
- **Ritmo vertical:** múltiplos de `{spacing.unit}` (8px). Sin excepciones.
- **Rejillas de controles, nunca de contenido** *(v8)*: dentro de la columna, las únicas rejillas son las del bloque «Compartir en» y las letras de salto de los Directorios. Ninguna pone dos Citas, dos Autores ni dos Obras lado a lado, y los selectores de `/buscar/` van apilados en todas las anchuras. [ASSUMPTION]
- **Cabecera en dos filas por debajo de 600px** *(v8)*: la marca en una y «Autores · Obras · Buscar» en otra; desde 600px, una sola. El detalle, en `§ Components → Cabecera`.
- **Reflujo sin desbordar** *(v8)*: a 320px de ancho, con el texto al 200 % (WCAG 1.4.4) o con el espaciado de WCAG 1.4.12, nada desborda ni pide desplazamiento horizontal. Una fila que no cabe se parte en otra, una rejilla pasa a una columna y un título parte palabras antes que desbordar; ningún control ni título lleva `white-space: nowrap`. Las pruebas de 320px lo comprueban en esas dos condiciones, además de con el texto por omisión.

## Elevation & Depth

**No hay elevación.** El sistema es plano por decisión: cero sombras, cero elevación tonal en superficies públicas.

La jerarquía se comunica con tres recursos, en este orden: **tamaño tipográfico**, **espacio en blanco**, **filete de 1px**. Cuando se necesite delimitar una zona (por ejemplo, una tarjeta de Cita en un listado), se usa un filete en `{colors.outline-variant}` o un cambio a `{colors.surface-container-low}` — nunca una sombra.

**La Tarjeta de Obra es plana** *(v8, variante 1A)*: la delimitan un filete a lo ancho y el rótulo de sección, como las Rutas de salida, sin fondo propio ni radio. Un fondo habría sido el primero de la Página de Cita, y sería el mismo `{colors.surface-container-low}` que toma la Tarjeta de Cita al pasar el cursor. Tampoco lo lleva dentro de la Cita del Día de la portada, donde la volvería una tarjeta dentro de un bloque [ASSUMPTION].

Único uso de profundidad en todo el producto: el Diálogo de Imagen, modal, que atenúa el fondo con `{colors.on-surface}` al 40 % de opacidad, y desde la v8 el Diálogo de Imagen en la Historia de Instagram, que es el mismo diálogo. Es la excepción que confirma la regla.

## Shapes

**Casi recto.** `{rounded.DEFAULT}` (3px) es el radio base — suficiente para no cortar, insuficiente para parecer una app. Los botones y los campos comparten ese radio, y desde la v8 también la caja de los selectores de `/buscar/`; las tarjetas usan `{rounded.lg}` (6px). La Tarjeta de Obra no tiene radio: no es una caja (`§ Elevation & Depth`). Las letras de salto de los Directorios tampoco: son zonas de toque sin caja, como los números de la Paginación.

La Imagen de Cita generada tiene esquinas **rectas**, en sus dos formatos *(v8)*: es un objeto para publicar en otro sitio, no un elemento de esta interfaz.

Sin píldoras, sin círculos salvo el avatar del Autor si algún día existe.

## Components

Agrupados por superficie, con los mismos grupos y en el mismo orden que `EXPERIENCE.md § Component Patterns`. *(v8)* Cada grupo que toca la v8 enlaza la maqueta que lo ilustra y nombra la variante elegida. Seis maquetas son de decisión, con variantes A/B/C, y en cada una vale la elegida; las dos de referencia, `v8-kit-y-lote.html` y `v8-pagina-de-tema.html`, no tienen variantes. Lo que una maqueta marca «[sin decidir]» no es contrato, y las maquetas anteriores a la v8 dibujan la Cabecera de antes.

### Primitivas

- **Botones** — texto en Inter 15px, altura mínima `{components.tap-target-min}` (44px). El primario es siena sólido con texto blanco; el secundario es texto en siena con filete de 1px. Relleno lateral generoso.
- **Filete divisorio** — 1px, `{colors.outline-variant}`, ancho completo de la medida de texto. El único separador del sistema.
- **Rótulo de sección** *(recoge lo construido; nombrado en la v8)* — `{typography.author}` en `{colors.on-surface-variant}`, en mayúsculas: el de las Rutas de salida, «Temas», «Dónde leer esta obra» y la Lista de Obras. Desde la v8 lo llevan también «De la obra», «Compartir en», los bloques de la portada y las letras de grupo de los Directorios.
- **Fila de bloque** *(v8; recoge el patrón de la Lista de Obras)* — un enlace que ocupa su fila entera: alto mínimo `{components.tap-target-min}`, filete `{colors.outline-variant}` entre filas, en `{colors.on-surface}` y sin subrayado. Es la forma de «Siguiente» y «Ver la obra» en la Tarjeta de Obra, de los cierres «Las {n} citas de… →» de las Rutas de salida y de las filas de los Directorios y de la portada.
  - **Apiladas, se tocan:** entre dos Filas de bloque a todo el ancho no hay los `{spacing.unit}` que separan toda zona de toque, porque cada zona es su fila entera y el filete dice dónde acaba. [ASSUMPTION]
  - **Con dos líneas** —el título y, debajo, sus hechos—, entre las dos suena una coma, solo para lectores de pantalla, como la que suena en lugar de los puntos medios. [ASSUMPTION] *(v8.2)* La misma coma suena en la Tarjeta de Cita, entre el fragmento, el Autor y la Obra que lleve (`§ Listados`).
  - **Dos formas de cierre:** un cierre «… →» que va dentro de su lista es su última Fila de bloque —las Rutas de salida—. Uno que va fuera, a 2 × `{spacing.unit}` de la lista, es un enlace de texto en su propia línea, subrayado y con su zona de toque, como «Ver esta cita»: «Las {n} obras →» y «Los {m} autores, de la A a la Z →» de la portada, como los dibuja su maqueta. Las dos formas van en tinta. [ASSUMPTION]
- **Iconografía** — no hay iconos en el producto: las acciones se nombran con texto. Un icono sería decoración y no entra. [ASSUMPTION] *(v8)* Las flechas «→» y «↓» de «Siguiente cita de esta obra →» o «Dónde leer esta obra ↓» no son iconos: son glifos tipográficos de la familia del rótulo, ocultos al lector de pantalla (`aria-hidden`). [ASSUMPTION] Los botones de compartir dicen el nombre de su destino y no llevan el icono de su red (PRD §11).

### Cabecera

- **Cabecera** *(v8, variantes 1A y 2A de [`mockups/v8-cabecera-y-portada.html`](mockups/v8-cabecera-y-portada.html))* — «Sabiduría de Bolsillo · Autores · Obras · Buscar», con filete inferior `{colors.outline-variant}`.
  - **La marca**, enlace a la portada: Inter al cuerpo, peso y espaciado de `{typography.author}`, en mayúsculas y en `{colors.on-surface}`. Es un enlace de bloque —subrayado solo al pasar el cursor— **a su ancho**: su zona de toque es su texto con alto mínimo `{components.tap-target-min}`, no la fila entera, para que un toque a su derecha o junto a «Autores» no lleve a la portada.
  - **Los tres enlaces**: `{typography.body-md}`, cada uno con una zona de toque de `{components.tap-target-min}` de alto y de ancho mínimo y `{spacing.unit}` de relleno lateral. Entre ellos, un punto medio en `{colors.on-surface-variant}`, oculto al lector de pantalla, que da el `{spacing.unit}` de separación entre zonas. **«Autores» y «Obras» van en `{colors.on-surface}`** —son navegación que informa— **y «Buscar», en `{colors.primary}`**, porque actúa; los tres, subrayados siempre, porque comparten línea con los puntos medios (`§ Colors`). Si no caben en su fila —a 320px con el texto al 200 %—, se parten en otra, con `{spacing.unit}` entre filas, y nunca desbordan (`§ Layout & Spacing`).
  - **Por debajo de 600px, dos filas**: la marca en la suya y los tres enlaces debajo, alineados a la izquierda con el texto de la marca —el primero se retranquea su `{spacing.unit}` de relleno—, con `{spacing.unit}` de aire arriba, **entre las dos filas** y abajo, para que la zona de la marca quede a `{spacing.unit}` de las de los enlaces. Mide unos 113px a 360 y lo mismo a 320, sin desplazamiento horizontal; la Cita de la Página de Cita empieza hacia los 153px y sigue en la primera pantalla de 360 × 640 (NFR-8), cifra que hay que volver a medir sobre lo construido. **Desde 600px, una fila**: la marca a la izquierda y los enlaces a la derecha, con 2 × `{spacing.unit}` de aire.
  - **En la portada, la marca es el `h1`** *(v8, variante 4A)*: el mismo elemento, sin cambiar de aspecto, así que la marca sale una sola vez y la Cabecera es idéntica en toda página.
  - Qué lleva y adónde lleva: `EXPERIENCE.md § Component Patterns`.

### Página de Cita

*(v8)* De arriba abajo: Bloque de Cita con su Atribución, Línea de la Fuente, Tarjeta de Obra, Acciones, «Compartir en» y Rutas de salida. Maqueta: [`mockups/v8-pagina-de-cita.html`](mockups/v8-pagina-de-cita.html), variantes **1A** (Tarjeta de Obra), **2C** («Compartir en») y **3A** (Rutas de salida), y su primera pantalla marcada; el Diálogo de Imagen en la Historia de Instagram, en [`mockups/v8-historia-de-instagram.html`](mockups/v8-historia-de-instagram.html), variante **A**.

- **Bloque de Cita** — el componente central. Texto en el token `quote-*` que corresponda al tramo, comillas angulares, filete corto (48px, 1px, `{colors.outline-variant}`) debajo, y luego la Atribución. Sin recuadro, sin fondo propio: la Cita flota sobre el papel.
- **Atribución** — nombre del Autor en `{typography.author}`, enlazado en `{colors.on-surface}` (no en siena: el nombre no es una llamada a la acción, es información) y **subrayado siempre** (`§ Colors`, WCAG 1.4.1). Procedencia debajo en `{typography.caption}` y `{colors.on-surface-variant}`. *(v7.1)* Dentro de la línea de la Procedencia, el título de la Obra enlazado va en `{colors.on-surface}` —más oscuro que el resto de la línea— y subrayado siempre, con el mismo criterio que el nombre del Autor.
- **Línea de la Fuente** *(recoge lo construido)* — en la Página de Cita, debajo de la Atribución y a `{spacing.unit}` de la Procedencia: «Texto tomado de {rótulo}.» y, si consta, la licencia, en `{typography.caption}` y `{colors.on-surface-variant}`. El nombre de la Fuente es el enlace, en `{colors.primary}` y subrayado: es salida y va dentro de una frase. Sin filete propio. [ASSUMPTION]
- **Tarjeta de Obra** *(v8, variante 1A)* — lo que la Página de Cita dice de su Obra, detrás de la Línea de la Fuente —o de la Atribución, si no hay Fuente— y dentro de la medida de prosa. **Plana y en tinta** (`§ Elevation & Depth`): ni fondo, ni radio, ni siena.
  - **Apertura:** 4 × `{spacing.unit}` de lo de arriba, un filete superior `{colors.outline-variant}` a lo ancho y 3 × `{spacing.unit}` de aire.
  - **Rótulo** «De la obra», el Rótulo de sección de las Rutas de salida.
  - **Título**, a `{spacing.unit}`: Inter al cuerpo de `{typography.body-lg}` con peso 600 y en `{colors.on-surface}` (`§ Typography`). No enlaza —ya enlaza en la Atribución, y aquí lo hace «Ver la obra»—, reparte sus líneas equilibradas y parte palabras antes que desbordar, como el de la Cabecera de Obra.
  - **Hechos**, a `{spacing.unit}`: «{Autor} · {año} · {n} citas» en `{typography.caption}` y `{colors.on-surface-variant}`, sin enlaces; los puntos medios, ocultos al lector de pantalla.
  - **Dos filas**, a 2 × `{spacing.unit}`: «Siguiente cita de esta obra →» —o «Siguiente cita sobre {tema} →», con el nombre del Tema en minúscula dentro de la frase, como en el Recuento de resultados: «Siguiente cita sobre la vida →»— y «Ver la obra y dónde leerla →» —o «Ver la obra →»—. Son Filas de bloque en `{typography.body-md}`, con filete encima de la primera y debajo de cada una. Sin «Siguiente», queda la fila de «Ver la obra».
  - **Medida:** unos 240px a 360. Sin Obra no existe y no deja hueco. Qué dice cada estado: `EXPERIENCE.md § Component Patterns`.
- **Acciones de la Página de Cita** *(recoge lo construido; v8: la posición y «Compartir la cita»)* — Copiar e Imagen.
  - **Dónde:** *(v8)* debajo de la Tarjeta de Obra y, sin Obra, debajo de la Atribución y de la Línea de la Fuente. Cada una va en su propia línea y a su ancho, en todas las anchuras [ASSUMPTION]. Copiar abre el grupo a 4 × `{spacing.unit}` de lo de arriba; Imagen va a 2 × `{spacing.unit}`. *(v8)* Con el mismo trato van sobre la Cita del Día de la portada.
  - **Cuáles:** «Copiar la cita» y «Descargar como imagen» —«Compartir como imagen» donde el navegador sabe compartir ficheros—. *(v8)* «Compartir la cita» se retira: lo sustituye el bloque «Compartir en», que va detrás.
  - **Cómo:** las dos son el botón secundario: texto en `{typography.body-md}` y `{colors.primary}`, filete de `{components.rule-width}` en `{colors.primary}`, radio `{rounded.DEFAULT}`, alto mínimo `{components.tap-target-min}` y 3 × `{spacing.unit}` de relleno lateral. Al pasar el cursor se rellenan de `{colors.primary}` con el texto en `{colors.on-primary}`, y Copiar se queda así mientras dice «Copiado.». **Ninguna es primaria:** fuera de sus dos diálogos, la Página de Cita no lleva relleno sólido. Ninguna lleva icono.
  - **Campo de copia manual:** si el portapapeles falla, bajo Copiar aparece el texto para copiarlo a mano: la indicación en `{typography.caption}` y `{colors.on-surface-variant}`, y el campo en `{typography.body-md}` y `{colors.on-surface}` sobre `{colors.surface-container-low}`, con radio `{rounded.DEFAULT}`, dentro de la medida de prosa. *(v8)* Su filete va en `{colors.outline}`, que da los 3:1 de un control sobre su fondo (`§ Colors`); con `{colors.outline-variant}` se quedaba en 1,3:1. Cambia lo construido. [ASSUMPTION]
- **Bloque «Compartir en»** *(v8, variante 2C)* — el bloque de destinos, a 3 × `{spacing.unit}` bajo Imagen y dentro de la medida de prosa, también en escritorio [ASSUMPTION].
  - **Rótulo común** «Compartir en», el Rótulo de sección. Cada botón muestra solo su destino; el prefijo «Compartir en » va en `.solo-para-lectores`, dentro del nombre accesible *(v8; cambia lo construido en la 22.10)*.
  - **Rejilla de dos columnas**, a 2 × `{spacing.unit}` del rótulo y con `{spacing.unit}` entre celdas. «Historia de Instagram» ocupa la primera fila entera, solo donde aparece, porque es el único destino que puede faltar y el único nombre largo. Debajo, WhatsApp, Facebook, Threads y «Más opciones…» forman un 2 × 2 que no cambia con la Historia o sin ella. **Pasa a una columna cuando una celda no cabe**: a 320px con el texto al 200 %, «WhatsApp» no cabe en media columna (`§ Layout & Spacing`).
  - **Cada destino es el botón secundario** de las Acciones, con dos diferencias: ocupa su celda entera y lleva 2 × `{spacing.unit}` de relleno lateral, para que la celda quepa a 360.
  - **«Más opciones…»** *(v8, decisión de Héctor del 18/10)* — un `<details>` nativo, cerrado al cargar. Su `<summary>` es la cuarta celda del 2 × 2, con el trato de botón secundario de los demás destinos y sin el marcador del navegador, que sería un icono (`§ Primitivas`) [ASSUMPTION]; su nombre accesible es «Más opciones para compartir». Al pulsarlo —sin guion, o con guion donde no hay Hoja del Sistema— despliega Telegram, X y Correo en otra rejilla igual, a `{spacing.unit}` bajo el 2 × 2 y fuera de la celda del botón, como la dibuja 2C [ASSUMPTION]. Con guion y Hoja del Sistema, la isla hace que abra la hoja y no despliega nada. Cómo se anuncia cada caso: `EXPERIENCE.md`.
  - **Medida:** unos 180px desde el rótulo con la Historia, y 52 menos sin ella. Cuando la isla inserta la fila de la Historia, lo de debajo baja esos 52px: no se le reserva sitio, porque sin Historia quedaría vacío [ASSUMPTION]. Sin iconos: los botones dicen el destino (`§ Primitivas`).
- **Diálogo de Imagen** *(recoge lo construido)* — el diálogo nativo, sobre la Página de Cita y con la atenuación de `§ Elevation & Depth`. *(v8)* Se abre igual sobre la Cita del Día de la portada.
  - **Marco:** fondo `{colors.surface}`, filete de `{components.rule-width}` en `{colors.outline-variant}`, radio `{rounded.lg}` y 3 × `{spacing.unit}` de relleno.
  - **Arriba**, «Elige un diseño.» en `{typography.body-md}` y, a `{spacing.gutter}`, «Cerrar» como botón secundario. Debajo, a 3 × `{spacing.unit}`, los botones de plantilla —Papel, Tinta y Siena—, secundarios y separados por `{spacing.unit}`; el elegido, relleno de `{colors.primary}` con el texto en `{colors.on-primary}`.
  - **La previsualización**, a todo el ancho, con esquinas rectas y filete `{colors.outline-variant}`, a 3 × `{spacing.unit}` arriba y abajo. *(v8)* «A todo el ancho» es de la imagen cuadrada; el 9:16 se previsualiza en el Diálogo de Imagen en la Historia de Instagram.
  - **Al final, el botón primario** —relleno `{colors.primary}`, texto `{colors.on-primary}`, a todo el ancho y con 4 × `{spacing.unit}` de relleno lateral—, que dice «Compartir» o «Descargar». Con el del Diálogo de Imagen en la Historia de Instagram *(v8)*, es el único botón primario de la Página de Cita, y solo existe con su diálogo abierto.
  - **Las plantillas de la imagen:** Papel, en `{colors.surface}` con el texto en `{colors.on-surface}`; Tinta, invertida, en `{colors.on-surface}` con el texto en `{colors.surface}`; Siena, en `{colors.primary}` con el texto en `{colors.on-primary}`.
- **Diálogo de Imagen en la Historia de Instagram** *(v8, variante A: dos toques)* — el que abre «Historia de Instagram»: el mismo diálogo nativo, con el mismo marco y la misma atenuación que el Diálogo de Imagen. Cambia en tres cosas:
  - **Sin botones de plantilla:** el 9:16 tiene un solo diseño, Papel (FR-11). Arriba, la instrucción del diálogo en `{typography.body-md}` y, a `{spacing.gutter}`, «Cerrar» como botón secundario; su texto, en `EXPERIENCE.md`. *(v8)* La instrucción es la descripción accesible del diálogo (`aria-describedby`), para que se oiga al abrirlo y no solo al recorrerlo.
  - **La previsualización cabe en alto, no a lo ancho** *(v8 — enmienda el «a todo el ancho» del Diálogo de Imagen)*: el 9:16 centrado a 1:6 —180 × 320px a 360 de ancho—, con esquinas rectas, filete `{colors.outline-variant}` y 3 × `{spacing.unit}` arriba y abajo. A todo el ancho mediría 283 × 503, y el botón quedaría fuera del alto máximo del diálogo a 360 × 640. Nunca pasa del alto disponible, y el diálogo se desplaza por dentro siempre que no quepa —el móvil en horizontal, el texto grande—, no solo con el campo del enlace [ASSUMPTION]. A ese tamaño no se lee, así que su nombre accesible dice lo que lleva la imagen (`EXPERIENCE.md`).
  - **Debajo, el botón primario «Compartir en la historia»**, con el trato del primario del Diálogo de Imagen. Sale cuando el fichero está hecho, junto con la previsualización, porque pulsarlo antes obligaría a esperar después del toque [ASSUMPTION].
  - **Estados:** cada frase de estado va bajo el botón, a 2 × `{spacing.unit}`, en `{typography.caption}` y `{colors.on-surface}`, y se queda hasta la siguiente acción o hasta cerrar el diálogo: quien vuelve de Instagram la encuentra [ASSUMPTION]. Si el portapapeles falla, bajo el botón aparece el campo de copia manual de las Acciones con el enlace, y la frase es la etiqueta del campo, no una línea aparte [ASSUMPTION]. Si el generador no llega, la frase va donde iba la previsualización, en `{typography.body-md}`, sin el primario y con «Copiar el texto» como botón secundario a 2 × `{spacing.unit}`. *(v8.2)* Igual si la Cita no cabe en el 9:16, y con el mismo trato en el Diálogo de Imagen de la cuadrada (`EXPERIENCE.md § State Patterns`, «La Cita no cabe en la imagen»).
- **Rutas de salida** *(recoge lo construido; v8: los grupos y las tarjetas, variante 3A)* — al pie de la Página de Cita y dentro de la medida de prosa: bajo el bloque «Compartir en», 8 × `{spacing.unit}` en móvil y 12 × en escritorio —lo más cerca de vez y media la respiración de `§ Layout & Spacing` que deja el ritmo de 8px; en móvil cambia 4px lo construido— [ASSUMPTION], un filete superior `{colors.outline-variant}` y 3 × `{spacing.unit}` de aire. Cada grupo —«De la misma obra», «Más de {Autor}» y «Temas» *(v8)*— lleva su Rótulo de sección, con 2 × `{spacing.unit}` hasta su contenido y 4 × `{spacing.unit}` entre grupos; un grupo sin contenido no se dibuja. **Las Citas van en Tarjeta de Cita** (`§ Listados`), la de los listados sin variante *(v8; cambia lo construido)*. Cada lista lleva su filete superior y cierra con una última Fila de bloque en `{typography.body-md}` y `{colors.on-surface}`. La página crece, a 360, de unos 1.500px a unos 2.780 (medido el 2026-10-18), y todo lo que crece cae después de las acciones.
  - **De la misma obra** *(v8)* — las Tarjetas sin Autor ni título de Obra, y el cierre «Las {n} citas de {título} →».
  - **Más de {Autor}** *(v8: sin las de la misma Obra)* — las Tarjetas sin Autor y con el título de su Obra, y el cierre «Las {n} citas de {Autor} →».
  - **Temas** — con el Chip de Tema, separados por `{spacing.unit}`.

### Listados

- **Tarjeta de Cita** — fragmento de la Cita en `{typography.headline-sm}`, nombre del Autor en `{typography.author}`, filete divisorio entre tarjetas. Sin imagen ni fondo propio. Al pasar el cursor, sin sombra: solo el fondo pasa a `{colors.surface-container-low}`. *(v7.1)* En las Páginas de Obra y de Autor va sin el nombre del Autor (`EXPERIENCE.md § Component Patterns`). *(v8)* **Con el título de su Obra** donde el listado no lo da por sabido —Autor, Tema, Colección y «Más de {Autor}»—: debajo del fragmento y del Autor, si lo lleva, a `{spacing.unit}`, en Inter, `{typography.caption}` y `{colors.on-surface-variant}`, sin las versalitas, que son del Autor. Es texto, nunca un segundo enlace: la tarjeta entera ya lo es. No lo lleva en la Página de Obra ni en «De la misma obra», ni una Cita sin Obra. El orden Autor y después Obra es [ASSUMPTION]. *(v8.2)* Entre el fragmento, el Autor y la Obra suena un «, » solo para lectores de pantalla, como entre las dos líneas de una Fila de bloque (`§ Primitivas`), y sin ninguna palabra más: el nombre de la tarjeta es su texto visible, en su orden (`EXPERIENCE.md § Accessibility Floor`).
- **Paginación** *(recoge lo construido)* — sin filete propio: el listado ya cierra con el de su última tarjeta, y la separación la dan 3 × `{spacing.unit}` de aire. En una sola fila, «Anterior» en un extremo y «Siguiente» en el otro, en `{typography.body-md}` y `{colors.primary}`, sin subrayado salvo al pasar el cursor y con alto mínimo `{components.tap-target-min}`. En medio, «Página N de M» en `{typography.caption}` y `{colors.on-surface-variant}`, y los números de página en `{typography.caption}` y `{colors.primary}`, cada uno en su zona de toque cuadrada de `{components.tap-target-min}`. Las zonas se separan por `{spacing.unit}`, como toda zona de toque, también en vertical si la fila no cabe y se parte. El número actual no enlaza: va en `{colors.on-surface}` y con más peso. Donde no hay página anterior o siguiente queda su sitio vacío, para que la fila no se descoloque.
- **Chip de Tema** *(recoge lo construido)* — el nombre en Source Serif al cuerpo de `{typography.body-md}` y en `{colors.on-surface}`, sobre `{colors.surface-container}`, que cambia a `{colors.surface-container-high}` al pasar el cursor; radio `{rounded.lg}`, alto mínimo `{components.tap-target-min}` y 2 × `{spacing.unit}` de relleno lateral. Entre chips, `{spacing.unit}`. Nunca en siena: los Temas son navegación, no acento. [ASSUMPTION]
- **Chip de Colección** — idéntico al de Tema. Que se distingan no es trabajo del chip: lo dice el sitio donde aparece y el nombre que lleva. *(v8, variante 3A de [`mockups/v8-cabecera-y-portada.html`](mockups/v8-cabecera-y-portada.html))* En la portada eso no bastaba —«Los escollos del trato» junto a «La amistad» se leía como un Tema más—, y cada Colección va en su fila: el chip y, a `{spacing.unit}` debajo, su criterio en `{typography.caption}` y `{colors.on-surface-variant}`, con 2 × `{spacing.unit}` entre Colecciones. El criterio es una frase, repartida en los renglones que pida y nunca recortada [ASSUMPTION]. El chip no cambia.

### Página de Colección

- **Nombre de Colección** *(recoge lo construido)* — `{typography.headline-md}` en Source Serif, sobre la primera tarjeta del listado y sin nada entre los dos (`EXPERIENCE.md § Component Patterns`): la página abre por el contenido. Ocupa **una sola línea** en la Página de Colección, donde a 30px dentro de la medida de prosa se cumple sola; donde la medida es otra —la Pieza, con 888px útiles— un nombre largo se reparte en dos líneas y debe repartirse, porque recortarlo o encogerlo lo prohíbe NFR-12, con más razón sobre el identificador de lo que se anuncia que sobre una Cita.
- **Criterio de Colección** — `{typography.caption}` en `{colors.on-surface-variant}`, al pie del listado, dentro de la medida de prosa. Es prosa propia del sitio y comparte página con Citas —desde la v7.1 no es la única: también lo es la Nota de la Ficha de Obra—, y va en el mismo tamaño y color que la Procedencia: deliberadamente por debajo de todo lo citado.

### Página de Autor

- **Ficha de Autor** *(v5; recoge lo construido, también lo de la Épica 17)* — abre la Página de Autor, dentro de la medida de prosa, y vive solo en su primera página. El nombre como `h1` en `{typography.headline-md}` y `{colors.on-surface}`; a `{spacing.unit}`, los años en `{typography.caption}` y `{colors.on-surface-variant}`; a 2 × `{spacing.unit}`, la semblanza con su atribución; y después la Lista de Obras, como en la maqueta del orden B. El catálogo empieza 5 × `{spacing.unit}` más abajo, con el rótulo «Citas documentadas», el Rótulo de sección, sin recuento, y, debajo, «Buscar en {Autor}» y el listado con su filete superior, a las distancias de la viñeta siguiente. En qué difiere la maqueta: `EXPERIENCE.md § Component Patterns → Maquetas`.
  - **«Buscar en {Autor}»** *(v8, variante 4B de [`mockups/v8-pagina-de-obra.html`](mockups/v8-pagina-de-obra.html))* — al empezar el catálogo, bajo el rótulo «Citas documentadas», y no dentro de la Ficha, que queda entera: justo encima del listado que filtra. Solo en la primera página. El formulario es el de `§ Búsqueda → Buscar en esta obra / en {Autor} / en este Tema`, a 2 × `{spacing.unit}` del rótulo, y el listado empieza 3 × `{spacing.unit}` más abajo [ASSUMPTION].
- **Semblanza con fuente** *(v5; recoge lo construido)* — la semblanza va en `{typography.body-lg}` y `{colors.on-surface}`, en Inter: no es voz citada. Su atribución, construida en la Épica 17, va justo debajo, a `{spacing.unit}` y en una línea —«Semblanza tomada de «{título}» en {fuente}, revisión {N} · {licencia}»— en `{typography.caption}` y `{colors.on-surface-variant}`, con dos enlaces de salida (`§ Colors`): el artículo en esa revisión y la licencia.
- **Lista de Obras** *(v5 → v7.1; recoge lo construido)* — entre la atribución de la semblanza y el catálogo, bajo el Rótulo de sección «Su obra en este Corpus». Una entrada por fila, separadas por filete `{colors.outline-variant}` y con alto mínimo `{components.tap-target-min}`: es la Fila de bloque. A la izquierda, el título de la Obra en Inter (`§ Typography`), en `{typography.body-md}` y `{colors.on-surface}` —navegación que informa (`§ Colors`)—, con el año detrás de un punto medio cuando consta. A la derecha, el recuento de sus Citas en `{typography.caption}` y `{colors.on-surface-variant}`, con cifras tabulares y *(v8)* **la unidad a la vista** —«27 citas», «1 cita»—, decisión de Héctor del 18/10: es el mismo componente que la Fila de Obra del Directorio, y cambia lo construido, que enseñaba la cifra sola. Si título y recuento no caben en la fila, el título parte palabras antes que desbordar y el recuento baja bajo él, sin encogerse (`§ Layout & Spacing`) [ASSUMPTION]. Cada entrada enlaza a su Página de Obra. *(v8)* El Directorio de Obras la reutiliza tal cual (`§ Directorios`).

### Página de Obra

*(v8)* La primera página, de arriba abajo: Cabecera de Obra con su salto, «Buscar en esta obra», el listado y su paginación, «Compartir en», Temas, «Dónde leer esta obra» y la Nota. Las páginas 2+ no cambian: Cabecera de Obra sin salto y listado. Maqueta: [`mockups/v8-pagina-de-obra.html`](mockups/v8-pagina-de-obra.html), variantes **1A** (el salto), **2B** (buscar encima del listado y compartir tras él) y **3A** (el orden del libro, sin texto nuevo); su cabecera del sitio es provisional.

- **Cabecera de Obra** *(v7.1; v8: el salto)* — el título como `h1` en `{typography.title-lg}` y `{colors.on-surface}`, con las líneas equilibradas y sin segundo tamaño (`§ Typography`). Debajo, a `{spacing.unit}`, «de {Autor} · {año}» en `{typography.body-md}`: «de» y el año en `{colors.on-surface-variant}`, el nombre en `{colors.on-surface}` y subrayado, con su zona de toque de `{components.tap-target-min}` (`EXPERIENCE.md § Interaction Primitives`). Cómo crece con un título largo: `EXPERIENCE.md § Component Patterns`. El título manda en la Cabecera de Obra, como el nombre en la Ficha de Autor.
  - **El salto «Dónde leer esta obra ↓»** *(v8, variante 1A; solo en la primera página)* — un enlace de texto en su propia línea, a 3 × `{spacing.unit}` de «de {Autor} · {año}»: lo mínimo para que su zona de toque de `{components.tap-target-min}` quede a `{spacing.unit}` de la del nombre. Va en `{typography.body-md}` y `{colors.primary}`, subrayado siempre, porque mueve al visitante dentro de la página (`§ Colors`). La flecha es un glifo oculto al lector de pantalla (`§ Primitivas`). Su destino, el `h2` de «Dónde leer esta obra», recibe el foco al llegar, con el anillo global, y queda a 2 × `{spacing.unit}` del borde superior (`scroll-margin-top`), como el de las letras de salto [ASSUMPTION].
  - **Lo que viene después:** en la primera página, «Buscar en esta obra» a 4 × `{spacing.unit}` del salto y el listado 4 × `{spacing.unit}` más abajo, con su filete [ASSUMPTION]. En las 2+, el listado empieza 4 × `{spacing.unit}` bajo «de {Autor} · {año}», como hasta ahora.
  - **El orden del libro no se dibuja** *(v8, variante 3A)*: el listado cambia de orden sin ninguna línea que lo diga ni subrótulo para las Citas sin documento, que ya cuenta «Dónde leer esta obra».
- **Dónde leer esta obra** *(v7.1)* — al pie, con el rótulo de sección en `{typography.author}` y `{colors.on-surface-variant}`, el mismo de las Rutas de salida y de los Temas. Debajo, el rótulo de cada parte —«Edición cotejada, gratuita» y, con el Modelo de afiliación (`afiliacion-de-libros`) encendido, «Ediciones en venta»— va en `{typography.caption}` con el peso de `{typography.author}` y en `{colors.on-surface}`, para que la jerarquía tenga una señal que no sea el color [ASSUMPTION]. Bajo cada rótulo, sus líneas en `{typography.caption}` y `{colors.on-surface-variant}`, dentro de la medida de prosa. El nombre de la Fuente es el enlace, como enlace de salida (`§ Colors`). Su ritmo vertical, en el Pie de la Página de Obra.
- **Ediciones en venta** *(v7.1)* — con el mismo trato que las líneas de la edición cotejada; el enlace —«Edición impresa en {tienda}» o «Edición electrónica en {tienda}»— va como enlace de salida (`§ Colors`). [ASSUMPTION] **Sin tokens ni hoja de estilos propios:** la presentación va en atributos `style` dentro del elemento `data-ingreso`, con los tokens del sistema, para que, con el Modelo apagado, no quede ni una regla CSS en ninguna página (AD-20). Con el Modelo apagado, el bloque no existe: `EXPERIENCE.md § State Patterns`.
- **Nota de la Ficha de Obra** *(v7.1)* — `{typography.caption}` en `{colors.on-surface-variant}`, después de «Dónde leer esta obra» y fuera de su sección, precedida de un filete `{colors.outline-variant}` y sin encabezado, dentro de la medida de prosa [ASSUMPTION]: el mismo cuerpo y color que el Criterio de Colección, y por la misma razón.
- **Bloque «Compartir en» en la Página de Obra** *(v8, variante 2B)* — el bloque de la Página de Cita sin la fila de «Historia de Instagram», porque no hay Imagen de Obra: queda solo el 2 × 2 de WhatsApp, Facebook, Threads y «Más opciones…». Va tras el listado y su paginación y antes de «Temas», como en la Página de Cita: leer, llevarse, seguir. Solo en la primera página. La rejilla es [ASSUMPTION]: 2B dibuja los destinos en fila, con los tokens provisionales de su maqueta.
- **Pie de la Página de Obra** *(v7.1; v8: «Compartir en»)* — el de la primera página sigue el ritmo de la maqueta de la variante elegida: 5 × `{spacing.unit}` de la paginación —o de la última tarjeta— a «Compartir en» *(v8)* y 5 × de ahí a «Temas» *(v8)*, 4 × hasta «Dónde leer esta obra», 2 × del `h2` al primer rótulo y 1 × del rótulo a sus líneas; la Nota de la Ficha de Obra, 4 × por encima de su filete y 3 × por debajo [ASSUMPTION]. Composición de la v7.1 en [`mockups/pagina-de-obra.html`](mockups/pagina-de-obra.html), con la Cabecera del sitio de antes; la de la v8, en `mockups/v8-pagina-de-obra.html` (arriba).

### Búsqueda

*(v8)* Maqueta: [`mockups/v8-buscar.html`](mockups/v8-buscar.html), con las recomendaciones que eligió Héctor: **1A** (selectores apilados), **2B** («Quitar los filtros»), **3C** (el recuento nombra lo filtrado, y por eso la decisión 4 no pide ninguna línea aparte para decir que solo hay Citas), **5A** («Mostrar 30 más», con el foco al primer resultado nuevo), **6A** (el Autor bajo la Cita) y **7C** (sin guion, los Directorios como resultados). El lugar de «Buscar en…» lo fija `mockups/v8-pagina-de-obra.html`, porque la decisión 8 no elige; esa maqueta lo dibuja sin botón, y vale el botón «Buscar» de la decisión 8, por decisión de Héctor del 18/10 (`§ Campo de búsqueda`). La maqueta quita además la flecha nativa de los selectores (`appearance: none`), y vale la del control.

- **Campo de búsqueda** — vive en `/buscar/` y en el 404 y, desde la v8, también en la portada y, como «Buscar en…», en la primera página de Obra, Autor y Tema; desde las demás superficies se llega por la Cabecera.
  - **Etiqueta y filete:** la etiqueta, visible y encima, en `{typography.caption}` y `{colors.on-surface-variant}`, a `{spacing.unit}` del campo *(recoge lo construido)*. Filete inferior de `{components.rule-width}` en `{colors.outline}`. Sin caja, sin sombra, sin icono.
  - **Lo tecleado** *(v8)* va en Inter, al cuerpo de `{typography.body-lg}`, y en `{colors.on-surface}` (`§ Typography`) [ASSUMPTION].
  - **Foco:** al recibir foco lleva el anillo global de `EXPERIENCE.md § Accessibility Floor`, como todo lo enfocable; además, el filete pasa a `{colors.primary}` y se engruesa, sumado al anillo y nunca en su lugar. [ASSUMPTION]
  - **Con botón «Buscar»** *(v8, decisión de Héctor del 18/10)*: en la portada, en el 404 y en «Buscar en…», que envían a `/buscar/`, el campo lleva debajo el botón secundario «Buscar», a su ancho y a 2 × `{spacing.unit}`, como lo dibuja la decisión 8 de `mockups/v8-buscar.html` [ASSUMPTION]. Así quien usa control por voz o conmutadores tiene qué pulsar. En el 404 cambia lo construido, que se enviaba solo con Intro; las maquetas de la portada, de la Obra y del Tema lo dibujan sin botón. En `/buscar/` y en el filtro de los Directorios, que responden al teclear, no hay botón.
- **Selectores de filtro** *(v8, variante 1A)* — Autor, Obra y Tema, en ese orden, a 3 × `{spacing.unit}` bajo el campo y separados entre sí por 2 × `{spacing.unit}`.
  - **Apilados a todo el ancho de la medida de prosa, en todas las anchuras**: una sola composición. El valor elegido puede recortarse en el control cerrado, y la lista desplegada lo muestra entero.
  - **El de Obra** aparece entre Autor y Tema al elegir un Autor, o al llegar con una Obra en la dirección, que trae su Autor (`§ Búsqueda → Buscar en esta obra / en {Autor} / en este Tema`).
  - **Etiquetas y grupo:** cada uno lleva su etiqueta visible encima, como el campo. Los tres van en un grupo sin borde ni relleno (`fieldset`), con la leyenda «Filtrar las citas» solo para lectores de pantalla, como en la maqueta [ASSUMPTION].
  - **El control nativo:** caja con filete de `{components.rule-width}` en `{colors.outline}`, que pasa los 3:1 de un control (`§ Colors`), radio `{rounded.DEFAULT}`, fondo `{colors.surface}`, alto mínimo `{components.tap-target-min}`, y el valor en `{typography.body-lg}` y `{colors.on-surface}`, como lo tecleado en el campo: *(v8)* por debajo de 16px, Safari en iOS amplía la página al enfocar el control y la deja ampliada al cerrarlo. La indicación de despliegue es la del control: el sitio no dibuja icono.
  - **Medida:** a 360 los tres ocupan unos 252px, medidos con el valor a 15px: hay que volver a medirlo.
- **Quitar los filtros** *(v8, variante 2B)* — el botón secundario, a su ancho y a 2 × `{spacing.unit}` bajo los selectores. Solo existe con algún filtro puesto; los quita todos y deja el texto.
- **Recuento de resultados** *(recoge lo construido; v8: el lugar y la frase)* — encima de la lista y a 3 × `{spacing.unit}` de lo de arriba, en `{typography.caption}` y `{colors.on-surface-variant}`, a la vista. Con filtros, la frase nombra lo filtrado (variante 3C); su texto, en `EXPERIENCE.md`. *(v8)* Al teclear, se escribe y se anuncia tras unos 700 ms sin teclear y solo si la frase cambia, aparte del pintado de la lista (`EXPERIENCE.md`). *(v8.2)* El fallo de «Mostrar 30 más» no va aquí: va bajo su botón, y el Recuento sigue a la vista (abajo).
- **Resultado de búsqueda** *(recoge lo construido; Obra, v7.1; v8: Autor bajo la Cita y Directorio)* — en `/buscar/`, dentro de la medida de prosa: una fila por resultado, con filete inferior `{colors.outline-variant}`, alto mínimo `{components.tap-target-min}` y 2 × `{spacing.unit}` de relleno vertical; toda la fila es el enlace. Arriba, el rótulo de tipo —«Cita», «Autor», «Tema», «Colección», «Obra» y, desde la v8, «Directorio» [ASSUMPTION] y, *(v8.2)*, «Portada»— en mayúsculas con el espaciado de `{typography.author}`, al cuerpo y peso de `{typography.caption}` y en `{colors.on-surface-variant}`; a `{spacing.unit}`, el título en Source Serif al cuerpo de `{typography.headline-sm}`, con peso 400, y en `{colors.on-surface}`. Encima de la lista, el Recuento de resultados. [ASSUMPTION]
  - **El de Obra** lleva el título en Inter (`§ Typography`), con el mismo cuerpo y peso que los demás: solo cambia la familia, sin token nuevo. Debajo, el nombre del Autor en `{typography.author}` y `{colors.on-surface-variant}`, como en la Tarjeta de Cita. [ASSUMPTION]
  - **El de Cita** *(v8, variante 6A)* lleva igual el nombre de su Autor debajo del texto, en `{typography.author}` y `{colors.on-surface-variant}`: paralelo al de Obra y a la Tarjeta de Cita.
  - **El de Directorio** *(v8)* lleva el título en Inter, como el de Obra [ASSUMPTION].
  - **El de la portada** *(v8.2)* se rotula «Portada» y lleva de título el nombre del sitio: «Portada: Sabiduría de Bolsillo», sin repetir la marca en el rótulo. El título va en Inter, como el de Directorio, porque no es nombre de Autor, Tema ni Colección [ASSUMPTION].
- **Mostrar 30 más** *(v8, variante 5A)* — el botón secundario, a su ancho, a 3 × `{spacing.unit}` bajo el último resultado. Ningún desplazamiento lo dispara. *(v8.2, decisión de Héctor del 2026-10-20)* Si la tanda no llega, «No se han podido cargar más resultados.» va bajo el botón, a 2 × `{spacing.unit}`, en `{typography.caption}` y `{colors.on-surface}`, como las frases de estado del Diálogo de Imagen en la Historia de Instagram [ASSUMPTION], en una región propia que se inserta vacía con el botón; el texto y cómo se anuncia, en `EXPERIENCE.md`.
- **Búsqueda sin resultados** *(v8.2)* — la frase y, debajo, cada grupo bajo su `h2`: los Temas, las Colecciones y los ocho Autores destacados, todos en chip, con el trato del Chip de Tema (`§ Listados`), como está construido. En la portada los destacados son Filas de bloque; aquí, chips (`EXPERIENCE.md § Portada`).
- **`/buscar/` sin JavaScript** *(v8, variante 7C)* — sin campo ni selectores: la frase que lo explica y la de volver atrás en `{typography.body-lg}`, a 3 × y 2 × `{spacing.unit}`, y debajo los dos Directorios como Resultados de búsqueda de tipo «Directorio». Ningún control que no haga nada. **Con guion y sin índice** —el índice que no carga—, la misma salida bajo el campo, con su propia frase, anunciada por la región del Recuento (`EXPERIENCE.md`) [ASSUMPTION]. *(v8.2)* **Con guion, antes de que arranque la búsqueda**, la misma composición que sin JavaScript —la frase condicional y la de volver atrás, con los mismos tokens y distancias, y debajo los dos Directorios como Resultados de búsqueda de tipo «Directorio»—, en el HTML inicial y oculta sin guion; la isla la retira al arrancar, sin dejar hueco (`EXPERIENCE.md § State Patterns`) [ASSUMPTION].
- **Buscar en esta obra / en {Autor} / en este Tema** *(v8)* — «Buscar en esta obra», «Buscar en {Autor}» y «Buscar en este tema», en la primera página de cada una: el Campo de búsqueda con su etiqueta visible y los filtros en campos ocultos, dentro de la medida de prosa. **En la Obra son dos, `autor` y `obra`** *(v8, decisión de Héctor del 18/10)*: se llega a `/buscar/` con los dos selectores elegidos y el recuento completo, y una dirección que traiga solo `obra` completa el Autor desde la Obra. En el Autor y en el Tema, uno. Lleva el botón «Buscar» del Campo de búsqueda, y se envía también con Intro o con la tecla de buscar del teclado del móvil, como el del 404. Va justo encima del listado que filtra:
  - en la Obra, bajo su Cabecera (`§ Página de Obra`);
  - en el Autor, bajo el rótulo «Citas documentadas» (`§ Página de Autor`);
  - en el Tema, bajo el `h1`, a 4 × `{spacing.unit}`, con el listado 4 × más abajo [ASSUMPTION]. Es la excepción declarada a que la Página de Tema empiece por su contenido (`§ Do's and Don'ts`), y la primera Cita sigue en la primera pantalla (variante 5A de `mockups/v8-pagina-de-obra.html`; la página entera, en [`mockups/v8-pagina-de-tema.html`](mockups/v8-pagina-de-tema.html)); las dos maquetas la miden sin el botón, así que hay que volver a medirlo.

### Directorios *(v8)*

`/autores/` y `/obras/`, dentro de la medida de prosa. Maqueta: [`mockups/v8-directorios.html`](mockups/v8-directorios.html), con las ocho recomendadas que eligió Héctor: **1A** (letras en rejilla), **2A** (fila de Autor), **3A** (campo antes de las letras, recuento a la vista), **4B** (`/obras/` con letras), **5B** (cabecera de grupo enlazada), **6C** (fila de Obra con la unidad), **7A** (sin distinción para las que no se indexan) y **8B** (salida a la búsqueda). Su cabecera del sitio es provisional.

- **Encabezado del Directorio** — el `h1`, como el de `/buscar/` construido: Inter al cuerpo de `{typography.headline-md}`, con peso 600 y en `{colors.on-surface}`. No es nombre de Autor ni de Tema, y no va en la serif. Su texto, en `EXPERIENCE.md`. [ASSUMPTION]
- **Campo de filtro del Directorio** *(variante 3A)* — el Campo de búsqueda, con su etiqueta visible, a 3 × `{spacing.unit}` del `h1` y **antes** de las letras. Debajo, a 2 × `{spacing.unit}`, el recuento («{n} autores.», «{n} obras.») en `{typography.caption}` y `{colors.on-surface-variant}`, a la vista: es la misma región que lo anuncia.
  - **La región está en el HTML inicial, vacía; la isla inserta solo el campo.** Sin guion no hay campo, y las letras quedan bajo el `h1`. El campo se inserta al cargar, sin hueco reservado (UX-DR35): sin desplazar, las letras y la lista bajan lo que mide; con la página ya desplazada, el anclaje de desplazamiento del navegador deja en su sitio lo que el visitante tiene delante (`EXPERIENCE.md`) [ASSUMPTION].
  - **El recuento se escribe tras unos 700 ms sin teclear, y solo si cambia**: la lista se repinta al teclear, y la frase llega después (`EXPERIENCE.md`). Con el campo vacío, la región queda vacía, como al cargar, y vuelven las letras [ASSUMPTION].
- **Letras de salto** *(variantes 1A y 4B)* — una rejilla que se ajusta al ancho, con columnas de `{components.tap-target-min}` como mínimo y `{spacing.unit}` entre zonas: a 360, seis por fila, y las 24 a la vista sin deslizar en unos 200px. Cada letra está en su zona de toque cuadrada, en `{typography.body-md}` con peso 600 [ASSUMPTION] y en `{colors.primary}`, sin subrayado y sin caja, como los números de la Paginación: mueve dentro de la página, y eso es actuar (`§ Colors`). Solo hay letra para las iniciales con alguna entrada. En `/obras/`, la misma rejilla, con la inicial de la clave de orden de cada Autor. Mientras el campo tiene texto, la rejilla no está.
- **Grupo de letra** — el Rótulo de sección con la letra, como `h2`: el primero a 4 × `{spacing.unit}` de las letras y los demás a 5 × de lo que cierra el anterior. La lista va a 2 × `{spacing.unit}` del rótulo, con su filete superior. El rótulo es el destino de su letra: al llegar recibe el foco, con el anillo global, y queda a 2 × `{spacing.unit}` del borde superior (`scroll-margin-top`) [ASSUMPTION].
  - **«Volver a las letras»** *(v8)* — al final de cada grupo, a 2 × `{spacing.unit}` de su última fila: un enlace de texto en su propia línea, en `{typography.body-md}` y `{colors.primary}` —mueve dentro de la página—, subrayado y con su zona de toque de `{components.tap-target-min}`. Lleva a la rejilla de letras. Sin él, volver desde la M de `/autores/` son unos 6.000px, y desde la U de `/obras/` unos 41.000 (medido el 2026-10-18). Mientras el campo tiene texto no está, como las letras. [ASSUMPTION]
- **Fila de Autor** *(variante 2A)* — una Fila de bloque por Autor, en `/autores/`. El nombre va en Source Serif al cuerpo de `{typography.headline-sm}`, con peso 400, y en `{colors.on-surface}`, con toda la medida (`§ Typography`). Debajo, sus hechos —«{años} · {n} citas»— en `{typography.caption}` y `{colors.on-surface-variant}`, con cifras tabulares y el punto medio oculto al lector de pantalla. El nombre parte palabras antes que desbordar (`§ Layout & Spacing`).
- **Cabecera de grupo del Directorio de Obras** *(variante 5B)* — en `/obras/`, bajo el rótulo de la letra: el nombre del Autor como `h3`, en Source Serif al cuerpo y peso de `{typography.headline-sm}`, en `{colors.on-surface}` y subrayado siempre. Enlaza a su Página de Autor, y el enlace es **un bloque de `{components.tap-target-min}` de alto**, como el salto de la Cabecera de Obra: así la lista de sus Obras, a `{spacing.unit}` del bloque, queda de verdad a `{spacing.unit}` de su zona; con relleno y margen negativo, la zona asomaría bajo el nombre y tocaría la primera Fila de Obra [ASSUMPTION]. Entre Autores, 4 × `{spacing.unit}`. Con el filtro puesto, la cabecera se queda mientras alguna de sus Obras case, aunque lo tecleado no case con el nombre: una Obra nunca aparece sin su Autor [ASSUMPTION].
- **Fila de Obra** *(variantes 6C y 7A)* — la de la Lista de Obras (`§ Página de Autor`), igual: «27 citas» a la derecha, en `{typography.caption}` y `{colors.on-surface-variant}`, con cifras tabulares y la unidad a la vista. Una Obra que no se indexa va exactamente igual: el Directorio dice qué hay, no lo que ve el buscador.
- **Filtro del Directorio, a cero** *(variante 8B)* — la frase va en la región del recuento, con su mismo trato. Debajo, a `{spacing.unit}`, el enlace «Buscar «x» en las citas», en `{typography.body-md}` y `{colors.primary}` —buscar es actuar—, subrayado y con su zona de toque de `{components.tap-target-min}`. Los textos, en `EXPERIENCE.md`.

### Portada *(v8)*

De arriba abajo, el orden del diseño aprobado: la Cabecera, la línea de cifras, el campo, la Cita del Día con su Tarjeta de Obra y sus acciones, las Obras, los Temas, las Colecciones y los Autores destacados, y al final, si está encendida, la Invitación de donación. Maqueta: [`mockups/v8-cabecera-y-portada.html`](mockups/v8-cabecera-y-portada.html), variantes **3A** con la redacción 1 de la línea de cifras y **4A** (la marca es el `h1`). Dentro de la medida de prosa, cada bloque abre con su Rótulo de sección a 6 × `{spacing.unit}` del anterior, y su contenido empieza 2 × `{spacing.unit}` más abajo; el de la Cita del Día, a 3 × [ASSUMPTION].

- **Línea de cifras** — lo primero de la columna, en `{typography.body-md}` y `{colors.on-surface-variant}`, tal como la dibuja 3A, que dejó su cuerpo sin fijar [ASSUMPTION]. Es un hecho del Corpus, no un contador: ni cifra destacada, ni tamaño de reclamo, ni color propio. Su texto, en `EXPERIENCE.md`.
- **Campo de búsqueda**, en la portada — con su etiqueta visible y su botón «Buscar» (`§ Búsqueda → Campo de búsqueda`), a 3 × `{spacing.unit}` de la línea de cifras.
- **Cita del Día** *(recoge lo construido; v8: la Tarjeta y las acciones)* — bajo el rótulo «La cita de hoy», el Bloque de Cita a su tramo, con su Atribución y, si consta, su Línea de la Fuente, pegada a la Procedencia como en la Página de Cita [ASSUMPTION]. Debajo, a 3 × `{spacing.unit}`, «Ver esta cita» en `{typography.body-md}`, subrayado y con su zona de toque, y en `{colors.on-surface}`: lleva a su Página de Cita, y eso es navegación que informa (`§ Colors`) [ASSUMPTION]. Después, la misma Tarjeta de Obra, las mismas Acciones y el mismo «Compartir en» que en la Página de Cita, con sus tokens: la Tarjeta, también aquí, plana y con filete (`§ Elevation & Depth`). La Cita, su Tarjeta y sus acciones forman un solo bloque, y nada se intercala entre ellos.
  - **Un solo bloque también al lector de pantalla** *(v8)*: «La cita de hoy» es el `h2`, y dentro de él «De la obra» y «Compartir en» son `h3`, con el mismo Rótulo de sección. El nivel lo da el contenedor; en la Página de Cita son `h2`.
  - En el 404, la Cita del Día va sin Tarjeta de Obra ni acciones [ASSUMPTION]. *(v8.2)* Su «Ver esta cita» sigue como está construido, en `{colors.primary}`: el paso a `{colors.on-surface}` es solo de la portada (decisión de Héctor del 2026-10-19).
- **Obras de la portada** — seis Filas de bloque bajo el rótulo «Obras». El título va en Inter al cuerpo de `{typography.body-lg}`, con peso 600 —el de la Tarjeta de Obra— y en `{colors.on-surface}`, y parte palabras antes que desbordar. Debajo, «{Autor} · {año} · {n} citas» en `{typography.caption}` y `{colors.on-surface-variant}`, con los puntos medios ocultos. Cierra, a 2 × `{spacing.unit}`, «Las {n} obras →» en `{typography.body-md}` y `{colors.on-surface}`, subrayado y con su zona de toque (`§ Primitivas → Fila de bloque`). Sin Obras indexables, el bloque no existe.
- **Autores destacados** — ocho Filas de bloque bajo el rótulo «Autores», con el nombre en Source Serif al cuerpo de `{typography.headline-sm}`, con peso 400, en `{colors.on-surface}` y sin subrayado (`§ Typography`). Van en el orden del Directorio de Autores, por su clave de orden: por recuento serían un podio, y el sitio nunca califica [ASSUMPTION]. Cierra, a 2 × `{spacing.unit}`, «Los {m} autores, de la A a la Z →», con el trato de «Las {n} obras →».
- Los Temas van con el Chip de Tema, y las Colecciones, con el suyo y su criterio (`§ Listados`).

### Modelos de ingreso

- **Invitación de donación** *(recoge lo construido)* — al final de la columna, tras un filete superior y con el aire de las Rutas de salida, dentro de la medida de prosa. La frase en `{typography.body-md}` y `{colors.on-surface-variant}`; el enlace «Apoyar el sitio» en `{typography.body-md}` y `{colors.primary}`, porque saca del sitio, con su zona de toque completa (`{components.tap-target-min}`). Sin tokens ni hoja de estilos propios, por la misma razón que las ediciones en venta: atributos `style` dentro de `data-ingreso` (AD-20). [ASSUMPTION] *(v8)* En la portada va detrás de los Autores destacados, nunca entre la Cita del Día, su Tarjeta de Obra y sus acciones, que son un solo bloque. En los Directorios no existe.

### Imágenes que salen del sitio

- **Imagen de Cita** *(recoge lo construido para la cuadrada; v8: el 9:16 y el dominio)* — la imagen que el visitante comparte o descarga, y que el Kit Diario ofrece en sus dos formatos (FR-10). No es interfaz: esquinas rectas (`§ Shapes`) y cuerpos en píxeles del lienzo, fuera de la escala de tokens. La componen, en los dos formatos:
  - la Cita entre comillas angulares, en la serif, con interlineado de 1,3, al cuerpo de su tramo (`EXPERIENCE.md § Tipografía adaptativa de la Cita`);
  - un filete corto en `{colors.outline-variant}`;
  - el Autor en mayúsculas, en la familia de la interfaz y con peso 600;
  - la procedencia en el color apagado de su plantilla;
  - y al pie, la marca en mayúsculas y, debajo, el dominio «sabiduriadebolsillo.net».
  - **Margen y dominio** — margen de 96px. *(v8)* El dominio va al cuerpo del Autor, con el peso y el color de la procedencia: legible y por debajo del Autor, subordinado como la marca (PRD §11). Al cuerpo de la marca no se leería en un móvil. Lo que no cabe no se encoge. La procedencia se reparte en líneas como la Cita y nunca sale del lienzo (NFR-12) [ASSUMPTION].
  - **Cuadrada**, 1080 × 1080, con las tres plantillas del Diálogo de Imagen. El Autor, a 24px; la procedencia, a 22; la marca, a 20; y el dominio, a 24 (variante B de la decisión 3 de [`mockups/v8-historia-de-instagram.html`](mockups/v8-historia-de-instagram.html)).
  - **9:16** *(v8)*, 1080 × 1920, **solo en Papel** (FR-11). Variante B de la decisión 2 de la misma maqueta: la Cita centrada entre las dos bandas que Instagram pinta encima, y el pie justo encima de la de abajo, para que el campo de respuesta no tape el dominio, que es el único enlace que sobrevive sin sticker. La zona de la Cita va de unos 250px del borde superior a unos 370 del inferior, y el pie queda a unos 280 del inferior: las bandas de Instagram miden unos 250px, un supuesto que comprueba la matriz de dispositivos. Los cuerpos se proponen y se prueban: la Cita a 80, 64, 52 o 42px según su tramo, y el dominio a 36, el cuerpo del Autor. La procedencia a 33 y la marca a 30 son [ASSUMPTION], tomados de la maqueta.
- **Material para publicar** *(recoge lo construido; v8: el 9:16)* — el material de cada jornada en el Kit Diario y en el Lote, con el mismo marcado en las dos (`MaterialParaPublicar.astro`). Es de una superficie interna y se documenta como está construido; la maqueta es [`mockups/v8-kit-y-lote.html`](mockups/v8-kit-y-lote.html).
  - **Marco:** un filete superior `{colors.outline-variant}`, 2 × `{spacing.unit}` de aire y el rótulo —«La Cita del Día», «Alternativa con Imagen»—, `h2` en el Kit y `h3` en el Lote, en Inter al cuerpo de `{typography.body-md}`, en negrita, mayúsculas y `{colors.on-surface-variant}`. Entre materiales, 4 × `{spacing.unit}`.
  - **La Cita**, entre comillas angulares, en la serif al cuerpo de `{typography.body-lg}` y sin tramo: es lo que se va a publicar, no un Bloque de Cita.
  - **Las dos imágenes**, en Papel y con el trato de la cuadrada construida: a todo el ancho de la columna, con esquinas rectas y filete `{colors.outline-variant}`, y debajo de cada una, a `{spacing.unit}`, el botón primario a todo el ancho. Primero la cuadrada, con «Descargar la imagen cuadrada»; después, a 2 × `{spacing.unit}`, el 9:16, con «Descargar la imagen vertical» —las palabras de UJ-5—, para que los dos botones no se llamen igual (WCAG 2.4.6). El sitio del 9:16 y los dos rótulos son [ASSUMPTION], tomados de la maqueta.
  - **Debajo**, «Copiar la cita» como el secundario de las Acciones, el enlace «Ver la Página de Cita» en `{typography.body-md}`, y un enlace por red en el orden de `src/lib/redes.ts`, cada uno en una caja con filete `{colors.outline-variant}`, radio `{rounded.DEFAULT}`, alto mínimo `{components.tap-target-min}` y 2 × `{spacing.unit}` de relleno lateral, separadas por `{spacing.unit}`. Los enlaces van en siena, como están construidos: la regla del siena no rige en el Kit ni en el Lote (`§ Colors`).
- **Tarjeta Social** *(recoge lo construido; Obra, v7.1)* — la previsualización que el build rasteriza para las redes (FR-19). No es interfaz: como toda imagen que sale del sitio, lleva el siena como marca (`§ Colors`), en una banda de `{colors.primary}` en el borde superior del lienzo, que va en `{colors.surface}`. Al pie, la marca en versalitas, en la familia de la interfaz y `{colors.on-surface-variant}`, salvo en la Tarjeta Social de listado de la portada, donde el título ya es la marca. Los cuerpos son píxeles del lienzo y no salen de la escala de tokens. Se rasteriza con las familias de reserva del código, no con las del sitio: la serif sale en Georgia, que la pila pide antes que Source Serif 4, y la de la interfaz en la sans del sistema, porque el rasterizador del build no tiene Inter. [ASSUMPTION] Cinco variantes *(v8: la de los Directorios)*, *(v8.2)* cada una con su nombre entero, para que lo que se derive de aquí no las abrevie y las confunda con la Tarjeta de Cita y la Tarjeta de Obra, que son otros componentes en el glosario de la v8:
  - **Tarjeta Social de Cita** — el texto entre comillas angulares en la serif y `{colors.on-surface}`, al cuerpo que `src/lib/tramos.ts` da a su tramo en la Tarjeta Social (`pixelesEnTarjeta`); un filete corto en `{colors.outline-variant}`; el Autor en versalitas, en la familia de la interfaz y `{colors.on-surface}`; y la obra y el año en `{colors.on-surface-variant}`. Por encima del corte de FR-10 no lleva ni una palabra de la Cita: el nombre del Autor en la serif, debajo la obra y el año, y la marca. *(v8)* En Facebook es lo único que acompaña al enlace compartido (FR-18, FR-19).
  - **Tarjeta Social de listado** (portada, Tema y Colección) — el nombre de la página en la serif y `{colors.on-surface}`, repartido en las líneas que haga falta y nunca recortado; un filete corto en `{colors.outline-variant}`; y debajo la bajada —la descripción del sitio, la del Tema o el criterio de la Colección— en la familia de la interfaz y `{colors.on-surface-variant}`, cortada a cuatro líneas.
  - **Tarjeta Social de Autor** *(v5; recoge lo construido en la Épica 17)* — la Tarjeta Social de listado con el nombre del Autor y, como bajada, sus hechos derivados: los años y el recuento de Citas documentadas, nunca la semblanza.
  - **Tarjeta Social de Obra** *(v7.1; recoge lo construido en la 22.7)* — la Tarjeta Social de listado con el título de la Obra en la familia de la interfaz (`§ Typography`), y como bajada la línea de hechos de `EXPERIENCE.md § Component Patterns`. Conserva la banda siena. *(v8)* Es también lo único que acompaña a una Obra compartida en Facebook, que recibe solo el enlace (FR-18, FR-19).
  - **Tarjeta Social de los Directorios** *(v8; sin construir)* — la Tarjeta Social de listado con el nombre del Directorio en la familia de la interfaz, como la Tarjeta Social de Obra, porque no es nombre de Autor, Tema ni Colección, y como bajada un hecho del Corpus: cuántos Autores o cuántas Obras lista (FR-55). Conserva la banda siena. [ASSUMPTION]

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
| `{typography.title-lg}` | `--titular-obra` —declarado desde la épica de la Obra—, no `--titular-lg`, que se confundiría con los dos titulares serif |
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
- Dejar que la Página de Tema y la de Colección empiecen por su contenido, no por su explicación. *(Acotado en la v5: **la Página de Autor es la excepción y empieza por su Ficha de Autor**, porque las nueve consultas medidas que alcanzan el sitio son de Autor, y cuatro de ellas biográficas: ahí la explicación **es** el contenido que se vino a buscar.)* *(Acotado en la v8: **«Buscar en este tema» va bajo el título y encima del listado**, la otra excepción declarada, por decisión de Héctor (18/10). Con 12 páginas en el Tema mayor (medido el 2026-10-18), es la única forma de no tener que pasarlas, y la primera Cita sigue en la primera pantalla.)*
- Componer la atribución en Inter para separarla de la voz citada.
- *(v8)* Dar a la Obra su bloque con piezas que ya existen —rótulo de sección, filete y filas de bloque—, sin un fondo, un titular ni un siena nuevos que compitan con la Cita o se adelanten a Copiar.
- Mantener el filete de 1px como único separador.

**Don't**
- Nunca sombras, degradados ni texturas de fondo.
- Nunca un icono decorativo junto a una Cita. *(v8)* Tampoco el icono de una red en los botones de compartir: dicen el nombre de su destino (PRD §11).
- Nunca la palabra del sitio adjetivando la Cita («una frase preciosa»).
- Nunca Source Serif en algo que no sea una Cita, un nombre de Autor, de Tema o de Colección: tampoco en el título de una Obra (`§ Typography`) *(v7.1)*, ni como titular de la Cabecera de Obra ni en un resultado de búsqueda de tipo Obra, aunque los de Cita, Autor, Tema y Colección lleven su título en serif. *(v8)* Ni en la Tarjeta de Obra, ni en el Directorio de Obras, salvo el nombre del Autor que encabeza cada grupo, ni en el texto que se teclea en un campo [ASSUMPTION].
- Nunca un modal, aviso de consentimiento o invitación antes de mostrar el contenido — lo prohíbe NFR-10.
- Nunca más de un nivel de anidamiento visual: la Cita no vive dentro de una tarjeta dentro de una sección. *(v8)* Por eso la Tarjeta de Obra de la Cita del Día se delimita con filete y sin fondo (`§ Elevation & Depth`).
- *(v8)* Nunca recortar, abreviar ni encoger el título de una Obra, el nombre de una Colección o la procedencia en una imagen para que quepan: se reparten en líneas (NFR-12); lo de la procedencia es [ASSUMPTION].
