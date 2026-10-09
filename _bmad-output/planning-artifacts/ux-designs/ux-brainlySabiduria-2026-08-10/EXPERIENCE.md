---
name: Sabiduría de Bolsillo
status: final
sources:
  - "{planning_artifacts}/prds/prd-brainlySabiduria-2026-08-10/prd.md"
  - "{planning_artifacts}/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md"
  - "docs/superpowers/specs/2026-10-05-pagina-de-obra-design.md"
  - "DESIGN.md"
updated: 2026-10-09
---

# Sabiduría de Bolsillo — Experience Spine

> Define **cómo funciona**. La identidad visual vive en `DESIGN.md`, referenciada aquí por token con la sintaxis `{ruta.al.token}`. En caso de conflicto con cualquier maqueta o importación, mandan las dos espinas.

## Foundation

Web adaptable, en una sola plataforma, móvil primero. Sin app nativa, sin PWA instalable (PRD §12). Sin sistema de UI de terceros: la interfaz es lo bastante pequeña como para que una dependencia de componentes cueste más de lo que ahorra, y `DESIGN.md` ya define el vocabulario completo.

El grueso del tráfico entra por una **Página de Cita** desde un buscador, en móvil, sin haber visto nunca la portada. Todo el diseño parte de ahí: cada página debe funcionar como primera página.

Tema claro único: el modo oscuro queda fuera de la v1 (`DESIGN.md § Colors`).

## Information Architecture

| Superficie | Se llega desde | Propósito |
|---|---|---|
| **Página de Cita** | Buscador externo (mayoritario), listados, Cita del Día | Resolver la intención completa: leer, confiar, copiar o compartir |
| **Página de Autor** | Atribución de una Cita, búsqueda, **consulta biográfica de buscador** | Ficha del Autor —quién fue, con su fuente, y su obra en este Corpus— y después el catálogo de esa persona *(v5)* |
| **Página de Obra** *(v7.1)* | Atribución de cada Página de Cita, Lista de Obras de la Página de Autor, buscador externo, `/buscar/` —estos dos, solo las indexables (FR-7, FR-52)— | Leer juntas las Citas de una Obra, de qué Fuente y bajo qué licencia se tomó su texto, y dónde leerla entera. **Superficie de lectura**, como la de Cita y la de Colección: no admite publicidad (FR-51, AD-20); qué otros Modelos admite lo declara la fila de cada Modelo en § Component Patterns. Existe para toda Obra con al menos una Cita publicada; se indexa solo la que no repite otra página (FR-52) |
| **Página de Tema** | Chips de Tema, portada, búsqueda | Agregación transversal entre Autores |
| **Página de Colección** *(v3)* | Buscador externo, chips de Colección en la portada | Reunir Citas escogidas por un criterio editorial que no es Autor ni Tema |
| **Portada** | Dominio directo, retorno | Cita del Día, entrada a la búsqueda, Temas destacados |
| **Resultados de búsqueda** | El enlace «Buscar» de la cabecera, en todas las superficies públicas, y el campo del 404 [ASSUMPTION] | Encontrar por fragmento, Autor, Tema u Obra *(v7.1: de Obra, solo las indexables)* |
| **Kit Diario** *(interna, v2)* | Una dirección que Héctor abre en el móvil, sin enlaces desde ninguna superficie pública; solo el Lote enlaza a él *(corregido en la v7.1)* | El material de la jornada ya compuesto: Imagen de la Cita del Día, pie con atribución y enlace marcado por red. `noindex` |
| **Lote** *(interna, v3; se recoge en la v7.1)* | `/lote`, una dirección que Héctor abre en el móvil. Kit y Lote se enlazan entre sí, y ninguna superficie pública enlaza a ninguno de los dos | El Kit Diario de las jornadas que vienen: el material de cada jornada fijada, compuesto con **el mismo marcado** que el Kit. `noindex`, fuera del sitemap y de los dos buscadores. Se documenta como está construido, no se rediseña. [ASSUMPTION] |
| **Curación** *(interna)* | Terminal, en local | Ingesta, revisión y publicación del Corpus. **No es una superficie web:** la arquitectura sitúa el Corpus en ficheros versionados, así que UJ-4 se resuelve en línea de comandos. No hay panel autenticado en producción. |

**Cierre de superficies:** cada UJ del PRD aterriza en una superficie existente y cada superficie tiene al menos un UJ que la alcanza. UJ-1 → Página de Cita. UJ-2 → Página de Cita + Diálogo de Imagen. UJ-3 → Cita → Obra → Autor → Tema → Colección *(v7.1)*, y su resolución, a la Portada. UJ-4 → Curación. UJ-5 → Kit Diario y, para las jornadas que vienen, Lote.

**Navegación real:** lateral, no jerárquica. El visitante entra por una hoja y se mueve entre hojas a través de Autor, Obra, Tema y Colección *(v7.1, PRD §10)*. No hay migas de pan porque no hay jerarquía que reflejar. Qué lleva la cabecera: § Component Patterns, Cabecera.

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

**«Frases» y «citas»** *(v7.1)*:

- **Regla:** la palabra «frases» va **solo** en el título de pestaña y en la meta description de la Página de Obra. Autor y Tema siguen con «Citas de {Autor}» y «Citas sobre {Tema}», y el resto de la microcopia —también la del cuerpo de la Página de Obra y la de su Tarjeta Social— dice «citas».
- **Por qué:** las consultas medidas que alcanzan el sitio dicen «frases» 8 veces y «citas» 2; Autor y Tema no se tocan para no mover títulos de páginas ya indexadas mientras corre la serie de indexación.
- **Coste aceptado:** el sitio usa dos palabras según la familia.
- **Alcance:** lo que se decidió es **el nombre de la entidad** en esos dos textos; «No encontramos esa frase.» de `/buscar/` no nombra la entidad sino lo que el visitante escribió, y se queda como está. AGENTS.md veda «frase» en identificadores de código, no en microcopia.

**Plantillas de la Página de Obra:**

- **Título de pestaña:** `Frases de {Autor} en {Título} | Sabiduría de Bolsillo`, y en las páginas 2+ `Frases de {Autor} en {Título} — página {N} | Sabiduría de Bolsillo`, como Autor y Tema. Ej.: «Frases de Baltasar Gracián en Oráculo manual y arte de prudencia». El Autor va primero, como en «Citas de {Autor}»; coste conocido al elegirlo: el título de la Obra es lo primero que se pierde si el buscador recorta.
- **Meta description:** `{n} frases de {Autor} en {Título}, con su procedencia documentada.`, con ` ({año})` tras el título solo si consta el de la Obra, y en singular cuando es una: «1 frase de…». Sigue la plantilla de pestaña y la de Autor y Tema («Citas de {Autor} con su procedencia documentada.»). Solo hechos derivados y **nunca la Nota de la Ficha de Obra** (§ Component Patterns, Página de Obra). [ASSUMPTION]

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

En móvil, cada tramo baja un escalón; el suelo de 23px no se cruza nunca. **El texto no se recorta jamás** — lo prohíbe NFR-12. Por encima de 300 caracteres la Acción Imagen no se muestra en absoluto, y la microcopia explica por qué solo si el visitante la busca.

## Component Patterns

Comportamiento. Las especificaciones visuales viven en `DESIGN.md § Components`, con los mismos grupos y en el mismo orden.

### Cabecera

| Componente | Dónde | Reglas de comportamiento |
|---|---|---|
| **Cabecera** | Todas las superficies públicas | Lleva solo la marca (enlace a portada) y el enlace «Buscar», que apunta a `/buscar/`, donde vive el campo [ASSUMPTION]. |

### Página de Cita

| Componente | Dónde | Reglas de comportamiento |
|---|---|---|
| **Bloque de Cita** | Página de Cita | Primer elemento visible sin desplazar en 360×640. Tramo tipográfico por longitud. No es interactivo: la Cita no es un enlace. Su maqueta de referencia es la de la [Página de Cita](mockups/pagina-de-cita.html), con sus divergencias en § Maquetas, al final de esta sección. |
| **Atribución** | Bloque de Cita | Nombre del Autor → Página de Autor. *(v7.1)* Cuando la Cita procede de una Obra, se muestra **el título que fija su Ficha de Obra** —el mismo en toda superficie y en todo material de salida, y nunca el literal de la Procedencia, que puede estar escrita de otra forma (FR-53)— enlazado a su Página de Obra, también cuando esa página no se indexa (FR-2, FR-51). Detrás va, sin enlace, el año que declare la Procedencia. El nombre del Autor y el título van en tinta y subrayados siempre: son información, no una acción (`DESIGN.md § Components`, § Accessibility Floor). Lo que la Procedencia declare sin nombrar obra —año o referencia— se muestra sin enlace (FR-2). Sin Procedencia: § State Patterns. Zonas de toque del nombre y del título: § Interaction Primitives. Con traductor, ver § Obra traducida. |
| **Línea de la Fuente** *(recoge lo construido)* | Página de Cita, bajo la Atribución | Dice de dónde se tomó el texto, con el documento enlazado (FR-2): «Texto tomado de {rótulo}.», y detrás la licencia si consta. El rótulo es el nombre de la Fuente y, si no consta, su dominio; **nunca la URL**, que leída en voz alta es ruido. **No afirma el cotejo:** hay Citas publicadas que todavía no lo tienen, y afirmarlo en todas sería falso. Sin Fuente declarada no se pinta ni se busca un sustituto: un documento aproximado parece una comprobación. Abre en la misma pestaña, y su enlace, que va a mitad de frase, queda exento de la zona de toque (§ Interaction Primitives). [ASSUMPTION] |
| **Acción Copiar** | Página de Cita | Una pulsación copia texto + atribución en texto plano. Confirmación en el propio botón durante 2s, sin notificación flotante. |
| **Acción Imagen** *(recoge lo construido)* | Página de Cita | Abre el Diálogo de Imagen. Su rótulo dice adónde irá la imagen: «Compartir como imagen» donde el navegador sabe compartir **ficheros**, y «Descargar como imagen» donde no (FR-17). El JavaScript de la página comprueba que el navegador sabe compartir un fichero, no solo compartir a secas: un navegador que solo sabe mandar enlaces abriría la hoja sin la imagen adjunta. El marcado sale con el rótulo de descarga y el JavaScript lo cambia al cargar solo si se puede compartir: sin aviso de incompatibilidad ni control deshabilitado. Ausente si la Cita supera 300 caracteres: no se oculta ni se deshabilita, no existe. |
| **Diálogo de Imagen** *(recoge lo construido)* | Sobre Página de Cita | Tres plantillas —Papel, Tinta y Siena—, con Papel elegida al abrir, y previsualización real del texto de esa Cita, que se redibuja justo antes de entregarla: lo que sale es lo que se ve. Una sola acción final, «Compartir» o «Descargar», como el rótulo de la Acción Imagen. **Compartir** abre la hoja del sistema con la imagen ya adjunta; si el visitante la cierra sin elegir destino no pasa nada —ni error ni registro de compartición—, y si la hoja falla de verdad, la imagen se descarga sin aviso. **Descargar** la baja directa. El fichero compartido y el descargado son el mismo, de una sola generación (FR-17). Sin paso intermedio y sin pedir registrarse. Cerrable con Esc, con toque fuera y con botón. El nombre accesible del diálogo sigue al rótulo de su acción —Compartir o Descargar—; hoy dice «Descargar» también donde comparte: no cumple, defecto anotado. [ASSUMPTION] |
| **Acción Compartir la cita** *(recoge lo construido)* | Página de Cita, después de la Acción Imagen | Comparte el enlace de la Página de Cita con un texto que lleva la Cita y su Autor, nunca la dirección desnuda (FR-18). Con hoja del sistema, el botón «Compartir la cita» la abre con enlace y texto: aquí basta con que el navegador sepa compartir, no ficheros. Sin ella se ven los destinos concretos —WhatsApp, Telegram, X y Correo—, enlaces compuestos en el build que abren pestaña nueva y no piden registrarse ni instalar nada. Cada destino dice «Compartir en {destino}» y avisa de la pestaña nueva dentro de su nombre accesible (§ Interaction Primitives); hoy dice solo el nombre del destino y no lo avisa: no cumple, defecto anotado [ASSUMPTION]. Cerrar la hoja sin elegir destino no es un fallo: ni error ni registro. |
| **Rutas de salida** *(recoge lo construido)* | Pie de Página de Cita | «Más de {Autor}» (hasta 4) + chips de Temas. Nunca vacío: toda Página de Cita publicada tiene salida (FR-12). |

### Listados

| Componente | Dónde | Reglas de comportamiento |
|---|---|---|
| **Tarjeta de Cita** | Listados de Autor, Tema, Colección y Obra | Fragmento + nombre del Autor. Toda la tarjeta es zona de toque, mínimo 44px de alto. |
| **Paginación** *(recoge lo construido)* | Listados > 50 Citas | Anterior / Siguiente numerada y, entre los dos, «Página N de M» y los números de todas las páginas. Los números se añadieron por NFR-5. Con solo Anterior / Siguiente, las Citas de la tercera página de un listado en adelante quedaban a más saltos de la portada de los que NFR-5 admite, y los saltos crecían con el Corpus, sobre todo al aparecer la cuarta página de los Autores mayores. Se suman al control, no lo sustituyen. Con una sola página no se renderiza: un «1 de 1» invita a buscar una página que no existe. |
| **Chip de Tema** *(recoge lo construido)* | Página de Cita, portada, Página de Obra *(v7.1)* | Navega a Página de Tema. No es filtro ni conmutador. Todo el chip es zona de toque, de `{components.tap-target-min}` de alto (`DESIGN.md § Components`). |
| **Chip de Colección** | Portada | Navega a Página de Colección. Mismo comportamiento que el de Tema. **No aparece en la Página de Cita:** la Colección enlaza a sus Citas, no al revés (FR-28). |

### Página de Colección

| Componente | Dónde | Reglas de comportamiento |
|---|---|---|
| **Nombre de Colección** *(recoge lo construido)* | Página de Colección, en todas sus páginas | Es el `h1`, y el único: lo primero del contenido, encima de la primera Tarjeta de Cita y sin nada entre los dos —ni subtítulo, ni bajada, ni recuento—, así que el listado **empieza sin preámbulo**. No enlaza: es el título de la página en la que ya se está. Las páginas 2+ lo repiten igual, y es su título de pestaña lo que añade «— página N». El título de pestaña de la primera página es el nombre solo, sin «Citas de…» ni «Citas sobre…»: una Colección ya lleva su intención en el nombre. Nunca se recorta ni se encoge (NFR-12). En la Pieza de Colección es el título del lienzo (`DESIGN.md § Components`). |
| **Listado de Colección** | Página de Colección | Usa `TarjetaDeCita`, el mismo componente que Tema y Autor — nunca una presentación propia (AD-19). |
| **Criterio de Colección** | Pie del listado de Colección | Describe para qué está reunida la Colección. No comenta ni adjetiva ninguna Cita. Va después del listado, no antes. |

### Página de Autor

| Componente | Dónde | Reglas de comportamiento |
|---|---|---|
| **Ficha de Autor** *(v5; recoge lo construido; en parte sin construir)* | Al principio de la Página de Autor | **Abre la página, antes del catálogo** — es la excepción declarada en `DESIGN.md § Do's and Don'ts`. Reúne semblanza, atribución y Lista de Obras. Vive **solo en la primera página** del listado: las 2+ son otra superficie y llevan `noindex`. |
| **Semblanza con fuente** *(v5; recoge lo construido; en parte sin construir)* | Ficha de Autor | Sitúa al Autor: cuándo vivió, en qué corriente escribió y por qué se le cita. **La atribución se publica visible** —enlace a la revisión concreta de la fuente y su licencia— porque una procedencia guardada y no mostrada no atribuye nada (AD-28). Es el primer enlace saliente del cuerpo de una página de contenido, y va en `{typography.caption}`, no en la voz citada. |
| **Lista de Obras** *(v5 → v7.1; sin construir)* | Ficha de Autor | **Enumera Obras, no Citas** (AD-19): título de la Ficha de Obra y recuento de Citas publicadas de esa Obra. *(v7.1)* **Cada entrada enlaza a su Página de Obra**, no a las Citas: es allí donde se leen juntas (FR-42, FR-43). El año, con la regla de § State Patterns (FR-42). No aloja ningún enlace comercial: se publica igual con el Modelo de afiliación (`afiliacion-de-libros`) apagado que encendido (FR-43). Nunca despliega Citas dentro: las reproduciría dos veces en la misma URL. Obras sin Citas publicadas y Citas sin obra declarada: § State Patterns. |

### Página de Obra

En el orden de la página. «Dónde leer esta obra» y «Ediciones en venta», que van entre los Temas y la Nota, se desglosan debajo de la tabla por su extensión.

| Componente | Dónde | Reglas de comportamiento |
|---|---|---|
| **Cabecera de Obra** *(v7.1)* | Página de Obra, en todas sus páginas | El `h1` es el título de la Ficha de Obra. Debajo, «de {Autor} · {año}»: el nombre enlaza a la Página de Autor; el año, con la regla de § State Patterns (FR-42, FR-51). Sin traductor (§ Obra traducida). En «de {Autor} · {año}», el punto medio va oculto al lector de pantalla y en su lugar suena una coma [ASSUMPTION]. **No tiene máximo de líneas: crece con el título.** Pasa de tres líneas en 11 de los 183 títulos declarados —con «Hacia una Moral sin Dogmas: Lecciones sobre Emerson y el Eticismo» llega a cinco—, y cada línea de más empuja la primera tarjeta una línea de `{typography.title-lg}`. El título nunca se recorta ni se encoge (NFR-12), y por eso **parte palabras antes que desbordar** (`overflow-wrap` y guiones con el `lang` del documento): es texto libre de la Ficha de Obra, y una palabra larga que no cupiera daría desplazamiento horizontal (WCAG 1.4.10) [ASSUMPTION]. No compone prosa: ni sinopsis, ni contexto, ni adjetivos (FR-51). |
| **Listado de Obra** *(v7.1)* | Página de Obra, justo debajo de la Cabecera de Obra | `TarjetaDeCita`, el mismo componente que Autor, Tema y Colección (AD-19), **sin repetir el nombre del Autor**, que ya está en la Cabecera de Obra, y ordenado como en la Página de Autor, que tampoco lo repite. Cada tarjeta enlaza a su Página de Cita, que sigue siendo la URL canónica de la Cita; la URL canónica de la Página de Obra es la suya, nunca otra (NFR-13). Pagina como el listado de Autor, por encima de 50 Citas (FR-5, FR-51). |
| **Temas de la Obra** *(v7.1)* | Página de Obra, solo la primera página, después del listado | Bajo un `h2` «Temas», como en las Rutas de salida [ASSUMPTION], van todos los Temas publicados que tocan sus Citas, sin tope (FR-51), con el mismo Chip de Tema. Se ordenan por cuántas Citas de la Obra tocan, de más a menos, y por nombre a igualdad. Sin recuento visible en el chip. Medido: los 16 del Oráculo manual ocupan 7 filas a 360px, y como van después del listado no empujan ningún contenido. [ASSUMPTION] Sin Temas publicados, el bloque no existe: ni rótulo ni hueco. [ASSUMPTION] |
| **Nota de la Ficha de Obra** *(v7.1)* | Primera página de la Página de Obra, después de «Dónde leer esta obra» | Solo si la Ficha de Obra la trae. Va **fuera** de la sección «Dónde leer esta obra», precedida del filete y sin encabezado, para que no se oiga como parte de las ediciones en venta [ASSUMPTION]. La escribe una persona —Héctor, nunca un agente—, hasta 160 caracteres, y describe la Obra o su edición cotejada sin calificarla (FR-53, §5 del PRD). Es la única prosa propia de la página y va después de «Dónde leer esta obra» (FR-51). **Nunca en la Tarjeta Social** (FR-51, AD-28) **ni en la meta description** (§ Voice and Tone): es prosa de Héctor, y la descripción es material que el buscador reescribe y recorta. |

**Dónde leer esta obra** *(v7.1)* — pie de la primera página de la Página de Obra.

- **Ubicación:** después del listado y de los Temas, nunca entre las Citas (FR-54, §11, NFR-10).
- **Estructura:** una sección con su `h2` «Dónde leer esta obra» y, debajo, dos partes con su rótulo (`h3`) y sus líneas: **«Edición cotejada, gratuita»** y, solo con el Modelo de afiliación encendido, **«Ediciones en venta»** [ASSUMPTION]. La diferencia entre lo gratuito y lo que se vende la dice la estructura, no la posición.
- **Edición cotejada:** bajo su rótulo van las Fuentes de las que se tomaron sus Citas, con su licencia (FR-54). El enlace es **el nombre de la Fuente**, como en la Línea de la Fuente de la Página de Cita: al documento, si la Obra está en uno solo; a la entrada de la Obra en su Fuente, si está repartida en varios, diciendo en cuántas páginas. Ej.: «Wikisource en español, repartida en 12 páginas. Licencia CC BY-SA 4.0.».
- **Varias Fuentes:** una línea por Fuente bajo el rótulo de la edición cotejada, cada una con su licencia y su enlace, empezando por la que más Citas aporta; generaliza la regla de las dos traducciones [ASSUMPTION].
- **Citas sin documento, o ninguna cotejada:** § State Patterns.
- **Con traductor:** § Obra traducida.

**Ediciones en venta** *(v7.1)* — dentro de «Dónde leer esta obra», debajo de la edición cotejada.

- **Dónde se admite:** solo en la Página de Obra, la única superficie que admite el Modelo de afiliación (FR-51, AD-20), y solo en su primera página: la forma paginada no admite ningún Modelo (AD-20). Solo con el Modelo de afiliación encendido.
- **Forma:** una lista, una edición por elemento y en el orden de la Ficha de Obra: «Edición impresa en {tienda}: {descripción}.» o «Edición electrónica en {tienda}: {descripción}.», seguida en la misma línea de «Enlace de afiliado: si compras, el sitio recibe una comisión sin coste para ti.». La descripción es opcional en la Ficha de Obra; sin ella: «Edición impresa en {tienda}.», y la declaración detrás [ASSUMPTION]. La relación comercial se declara en la misma línea que cada enlace (FR-35).
- **Enlace:** «Edición impresa en {tienda}» o «Edición electrónica en {tienda}», no la tienda sola —con dos ediciones en la misma tienda daría dos enlaces iguales a sitios distintos—, con `rel="sponsored noopener"`; abre pestaña nueva y lo avisa en su nombre accesible (§ Interaction Primitives), y la declaración de afiliado se le asocia con `aria-describedby`, para que llegue también a quien recorre los enlaces [ASSUMPTION].
- **Marcado:** todo lo que pinta —el `h3` y la lista— vive dentro de un único elemento `data-ingreso="afiliacion-de-libros"` (AD-20), **nunca un `aside`**, que haría de las ediciones una región aparte dentro de la sección [ASSUMPTION].
- **Nunca van solas, y con el Modelo apagado no existen:** § State Patterns.
- **Lo demás no cambia:** la edición cotejada, la atribución de cada Cita y su Procedencia se leen igual con el Modelo apagado que encendido (FR-35).

### Búsqueda

| Componente | Dónde | Reglas de comportamiento |
|---|---|---|
| **Campo de búsqueda** | `/buscar/` y 404; desde las demás superficies, por la Cabecera | Normaliza acentos y mayúsculas al consultar. Sin autocompletado en v1. Al enfocarlo lleva el anillo de foco global, como todo lo enfocable (§ Accessibility Floor). [ASSUMPTION] |
| **Resultado de búsqueda** *(recoge lo construido; Obra, v7.1)* | `/buscar/` | Toda la fila es un enlace a su superficie. Encima del título, un rótulo de tipo dice de qué es la coincidencia: «Cita», «Autor», «Tema», «Colección» y, desde la v7.1, «Obra» (FR-7). Un resultado sin tipo reconocido se rotula «Cita». **El de Obra** lleva el título de la Obra y, debajo, el nombre del Autor; solo entran las Obras indexables (FR-7, FR-52). Como el título del resultado sale del `h1`, la línea del Autor pide un metadato nuevo en el índice. [ASSUMPTION] Su nombre accesible se lee «Obra: {título}, de {Autor}». [ASSUMPTION] |

### Modelos de ingreso

| Componente | Dónde | Reglas de comportamiento |
|---|---|---|
| **Invitación de donación** *(recoge lo construido)* | Portada, `/buscar/` y 404 | Al final de la columna, después del contenido y fuera del flujo de lectura: una frase y el enlace «Apoyar el sitio», que abre pestaña nueva y lo anuncia al lector de pantalla. **Vedada en las superficies de lectura** —Cita, Colección y Obra— y en el armazón compartido, que aparece en todas (FR-34, AD-20). Solo con el Modelo de donaciones encendido; apagada es invisible y no latente (UX-DR35). Ignorarla no degrada nada (FR-34). [ASSUMPTION] |

Las Ediciones en venta, el otro Modelo con componente, están en el grupo de la Página de Obra.

### Imágenes que salen del sitio

| Componente | Dónde | Reglas de comportamiento |
|---|---|---|
| **Tarjeta Social de Autor** *(v5; en parte sin construir)* | Previsualización en redes | Se compone con **hechos derivados del Corpus** —nombre, años y recuento de Citas documentadas—, nunca con la semblanza: es texto ajeno y un PNG no puede portar su atribución (AD-28). Tampoco con una bajada escrita por el sistema, que sería prosa nueva sobre una persona real (§5 del PRD). |
| **Tarjeta Social de Obra** *(v7.1; sin construir)* | Previsualización en redes | Hechos derivados del Corpus (FR-51): el título de la Obra y una línea «{n} citas de {Autor}, {año}», con el año solo si consta el de la Obra y en singular cuando es una («1 cita de…»). Nunca la Nota de la Ficha de Obra (§ Página de Obra, arriba), y nunca el traductor (§ Obra traducida). [ASSUMPTION] |

### Maquetas

Qué muestra cada maqueta, qué papel tiene y en qué difiere ya de estas espinas. Lo que las dos maquetas clave marcan «[sin decidir en las espinas]» no es contrato hasta que una pasada lo decida.

| Maqueta | Qué muestra | Papel | Divergencias con las espinas |
|---|---|---|---|
| [Página de Cita](mockups/pagina-de-cita.html) *(recoge lo construido)* | Una Cita de Machado del tramo medio, con anotaciones de los requisitos que realiza: el Bloque de Cita como primer elemento visible, la Atribución y su «Sin obra documentada», Copiar con su confirmación en el propio botón —se puede probar— y las Rutas de salida. | La de referencia de la v1 | Cinco, frente a lo construido: lleva la marca retirada, «Sabiduría Diaria»; pone en la cabecera un campo de búsqueda, donde lo construido lleva el enlace «Buscar»; dibuja dos botones —«Copiar» primario sólido e «Imagen» secundario con filete `{colors.outline-variant}`—, donde lo construido lleva tres secundarios con filete siena (Copiar, Imagen y Compartir la cita) y deja el único primario dentro del Diálogo de Imagen; no tiene la Línea de la Fuente bajo la Atribución; y compone las Rutas de salida como Tarjetas de Cita con la obra debajo, con chips de Tema en Inter y por debajo de `{components.tap-target-min}`. |
| [Página de Autor, los tres órdenes que se compararon](mockups/pagina-de-autor-tres-ordenes.html) | A 360px y con datos reales de Unamuno. Se eligió el orden B, Ficha de Autor primero. | Referencia de la Ficha de Autor | Tres, frente a lo construido: lleva la región junto a los años y el recuento en el rótulo del catálogo, y dibuja la semblanza a un cuerpo menor que el construido. |
| [Página de Obra, las variantes que se compararon](mockups/pagina-de-obra-variantes.html) *(v7.1)* | A 360px y con datos reales: el Oráculo manual de Gracián (114 Citas, 12 páginas de Wikisource), el título largo de Arenal y Proverbios y cantares, con una Cita sin documento. Se eligieron la cabecera **A**, titular grande; «Dónde leer esta obra» **D2**, la estructura que dice a simple vista qué es gratis y qué se vende; y el título de la Obra en la Atribución **E2**. | Registro de la elección | Tres: dibuja un máximo de tres líneas en la Cabecera de Obra, que no tiene máximo; pone el rótulo «Edición cotejada, gratuita» sobre una Obra sin ninguna Cita cotejada, donde ese rótulo no va; y compone los rótulos de las partes de «Dónde leer esta obra» sin el peso que los separa de sus líneas. |
| [Página de Obra, la composición final](mockups/pagina-de-obra.html) *(v7.1)* | A, D2 y E2 con las reglas de la puerta de revisión: el Oráculo manual con el Modelo de afiliación apagado y encendido, Proverbios y cantares, una Obra sin ninguna Cita cotejada, la página 2, la Atribución de la Página de Cita y un título largo partido. | Maqueta clave: referencia de la épica de la Obra | Ninguna anotada. |
| [`/buscar/`](mockups/buscar.html) *(v7.1)* | El resultado de tipo Obra entre los demás, y los estados de carga, sin resultados e índice que no carga. | Maqueta clave: referencia de la épica de la Obra | Ninguna anotada. |

## Obra traducida (FR-48)

*Sección inventada (v7.1): cinco reglas que atraviesan cinco componentes. Las decidió Héctor aunque hoy ninguna Cita publicada trae traductor.*

1. **Atribución** de la Página de Cita, en la línea de la Procedencia: `Odas. Traducción de {traductor}, 1909.` Es una frase propia: el año de la traducción va con el traductor, y junto al título solo va el año si es el de la Obra.
2. **Lo copiado** (FR-3): `«…» — Horacio, Odas, trad. de {traductor}, 1909.`
3. **Cabecera de Obra:** sin traductor —la Cabecera de Obra es de la Obra— y sin año si solo consta el de la traducción.
4. **Dónde leer esta obra**, bajo «Edición cotejada, gratuita»: `Wikisource en español, en la traducción de {traductor} (1909). Licencia CC BY-SA 4.0.` Dos traducciones en una Obra son dos líneas.
5. **Imagen de Cita, Tarjeta Social y Pieza de Canal:** sin traductor. Hechos mínimos, como hoy.

[NOTE FOR PM] **Aviso, no regla.** Qué año guarda hoy la Procedencia de una Obra traducida es un problema de datos abierto, y UX no lo resuelve. La Atribución de Horacio dice hoy «Odas, 1909.», y 1909 es el año de la traducción de Salinas que declara Wikisource, no el de la Obra; con la variante A de la Cabecera de Obra saldría «de Horacio · 1909». El problema es del modelo de datos (FR-48, FR-42, FR-51, AD-25) y va a la próxima pasada del PRD o a la historia de FR-48. UX solo fija que el año de una traducción nunca se presenta junto al título como si fuera el de la Obra.

## State Patterns

| Estado | Dónde | Tratamiento |
|---|---|---|
| Carga normal | Todas, salvo Resultados de búsqueda | El contenido llega en el HTML inicial (NFR-2). No hay esqueletos de carga: no hay nada que esperar. |
| 404 | Cualquiera | Campo de búsqueda + Cita del Día. Un 404 es una oportunidad de entrada, no un muro. |
| Cita sin Procedencia | Página de Cita | «Sin obra documentada» en tinta apagada, en el lugar donde iría la obra: nunca se omite el bloque. Presencia de la ausencia. |
| Cita > 300 caracteres | Página de Cita | La Acción Imagen no se muestra. Copiar sigue disponible. |
| Copiado fallido | Página de Cita | El botón revela el texto seleccionable para copia manual. Sin mensaje de error técnico. |
| Generando imagen *(recoge lo construido)* | Diálogo de Imagen | El diálogo se abre al pulsar, antes de que llegue el generador, que se descarga en ese momento y no antes (AD-6); la previsualización se pinta cuando llega. **Sin indicador de progreso:** la espera es corta. Mientras tanto el diálogo sigue usable y cerrable (§ Component Patterns), y la generación no bloquea la Página de Cita. |
| Generador que no llega a cargar | Diálogo de Imagen | El diálogo lo dice en una frase y ofrece copiar el texto: la Imagen nunca es la única vía (§ Accessibility Floor). Hoy no está construido —la previsualización se queda vacía—: no cumple, defecto anotado. |
| Tema por debajo de 15 Citas | — | El Tema no se publica ni se indexa (FR-6). Sus chips no se renderizan. |
| Colección por debajo de su umbral | — | No se publica ni se indexa. Desaparece a la vez de la página, del sitemap, de los chips y del descubrimiento. |
| Cita retirada de una Colección | Página de Colección | Desaparece del listado sin dejar hueco ni enlace roto; el recuento baja y, si queda por debajo del umbral, la Colección se despublica. La Cita no cambia de Temas ni de Autor. |
| Autor sin Citas publicadas | — | La Página de Autor no existe: 404. No se genera una página vacía (FR-4). |
| Autor sin semblanza de fuente citable | Página de Autor | Conserva la semblanza breve que ya tenía. **No se compone una nueva** ni se deja el hueco: §5 del PRD no admite excepción. *(v5)* |
| Cita del Autor sin obra declarada | Lista de Obras | Queda fuera de la lista, y la línea al pie lo dice: «Y una cita sin obra documentada.» / «Y {n} citas sin obra documentada.». Sin ninguna, no hay línea. La bibliografía es la del Corpus y no finge completitud. Medido: Unamuno tiene una. *(v5; la línea, v7.1)* |
| Obra sin Citas publicadas | — | No tiene página ni aparece en la Lista de Obras (FR-42, FR-51). Su Ficha de Obra avisa en el build y no lo rompe: retirar una Cita no puede tumbar el sitio (FR-53). *(v7.1)* |
| Obra con `noindex` —una sola Cita, o el 90 % o más de las de su Autor— | Página de Obra | Para el visitante es **la misma página**, sin marca ni aviso. Con una sola Cita es una página con una tarjeta, que no se oculta ni se redirige, porque la Atribución de esa Cita enlaza a ella (FR-51) [ASSUMPTION]. Lleva «Dónde leer esta obra» y, con el Modelo de afiliación encendido, las ediciones en venta: AD-20 solo veda un Modelo por la forma de la ruta —las páginas 2+—, no por el contenido: el `noindex` decide qué ve el buscador, no qué ve quien llega desde la Atribución. Queda fuera del sitemap y de `/buscar/` (FR-52). [ASSUMPTION] *(v7.1)* |
| Dos títulos de los que uno es prefijo del otro | Lista de Obras, Página de Obra | Son dos Obras, con dos entradas y dos Páginas de Obra, hasta que su Ficha de Obra reúna sus grafías: el build avisa al editor de que un título es prefijo del otro, en vez de decidir por él (AD-25). Es el caso de «Del sentimiento trágico de la vida/I» y «Del sentimiento trágico de la vida», con 34 Citas y 1, respectivamente. [ASSUMPTION] *(v7.1)* |
| Obra con año discrepante, o sin año | Cabecera de Obra, Lista de Obras, meta description, Tarjeta Social de Obra | Si las Citas que lo declaran discrepan, o ninguna lo declara, el año se omite; **nunca se infiere**. Si discrepan, el build avisa (FR-42, FR-51). *(v7.1)* |
| Páginas 2+ de una Obra | Página de Obra | La misma Cabecera de Obra —el título como `h1`, «de {Autor}» y el año si consta— y el listado. Sin Temas, sin «Dónde leer esta obra», sin nota y sin ediciones en venta: FR-51 las deja en «título, Autor y listado», y AD-20 niega todo Modelo a la forma de ruta paginada. `noindex`, como toda página 2+ (FR-5). [ASSUMPTION] *(v7.1)* |
| Obra sin ninguna Cita cotejada | Dónde leer esta obra | Bajo el `h2` va solo la línea «Ninguna de sus citas tiene todavía documento cotejado.», **sin** el rótulo de la edición cotejada: un rótulo que nombra una edición cotejada encima de su ausencia la afirmaría, y FR-54 dice que la página nunca afirma un cotejo que no ocurrió [ASSUMPTION]. Sin enlace y sin ediciones en venta aunque la Ficha de Obra las declare: las ediciones nunca van solas, con el Modelo encendido o apagado (FR-54, AD-20) [ASSUMPTION]. *(v7.1)* |
| Obra con algunas Citas sin documento | Dónde leer esta obra | La edición cotejada se muestra, y debajo, después de la Fuente, cuántas Citas no tienen documento: «Una de sus 27 citas no tiene documento cotejado.» / «{n} de sus {total} citas no tienen documento cotejado.» [ASSUMPTION]. Nunca se afirma un cotejo que no ocurrió (FR-54). *(v7.1)* |
| Modelo de afiliación apagado, u Obra sin ediciones en su Ficha de Obra | Dónde leer esta obra | Solo la edición cotejada. Con el Modelo apagado, el bloque de las ediciones es **invisible y no latente** (UX-DR35): no queda rótulo, línea, hueco, contenedor ni regla CSS de las ediciones. Con el Modelo apagado, la página se construye idéntica con y sin ediciones declaradas (FR-54, FR-33). *(v7.1)* |
| Obra reunida con otra en una Ficha de Obra | Página de Obra absorbida | Su URL da el 404 (fila «404»): es la ruptura declarada de NFR-4 que admite FR-53, y la redirección queda aplazada hasta que se cumpla su condición (FR-53, «Fuera de alcance»). Las Citas no se mueven; su Atribución pasa a enlazar la Obra que las reúne. *(v7.1)* |
| Búsqueda sin resultados | Resultados de búsqueda | Mensaje + Temas destacados + Autores destacados como salida (FR-8). Nunca un callejón sin salida. |
| Carga del índice *(recoge lo construido)* | Resultados de búsqueda | El índice se descarga al enfocar el campo, no antes (AD-6), y lo escrito se busca cuando llega. Sin indicador de carga. Con la consulta en la URL, la búsqueda corre al cargar la página. [ASSUMPTION] |
| Índice que no carga *(recoge lo construido)* | Resultados de búsqueda | Sin tratamiento: bajo el campo no aparece nada, ni resultados ni la salida de FR-8. [ASSUMPTION] |
| Sin Cita apta para portada *(recoge lo construido)* | Kit Diario; cada jornada del Lote | «Hoy no hay ninguna Cita apta para portada.» en el Kit, y «No hay ninguna Cita apta para portada.» en la jornada del Lote. [ASSUMPTION] |
| Cita del Día sin Imagen *(recoge lo construido)* | Kit Diario y Lote | «Esta Cita pasa del límite de longitud, así que no admite Imagen. Abajo tienes una alternativa apta con su material completo.», y debajo la «Alternativa con Imagen», con el mismo material que la Cita del Día. [ASSUMPTION] |
| Jornadas por delante *(recoge lo construido)* | Kit Diario | Al pie, «Hay {n} jornadas preparadas por delante.» —«No hay ninguna jornada preparada por delante.» si no hay— y el enlace «Ver el lote». [ASSUMPTION] |
| Lote vacío *(recoge lo construido)* | Lote | Dice primero qué significa y después qué hacer: «No hay ninguna jornada preparada por delante. El sitio sigue publicando: cada día sale la Cita del Día que le toca por rotación.»; luego, el enlace al Kit del día y la orden para fijar jornadas desde el ordenador. Una página en blanco no distinguiría «nada fijado» de «página rota». [ASSUMPTION] |
| Fijación muda *(recoge lo construido)* | Lote | Destacada, no como un párrafo más: «Esta jornada no saldrá como está fijada.», la Cita fijada que ya no es apta y, debajo, el material que saldrá de verdad, el de la rotación. Es el fallo silencioso que el Lote existe para enseñar mientras aún se puede arreglar. [ASSUMPTION] |

## Interaction Primitives

- **Un toque, un resultado.** Copiar copia. Imagen abre el diálogo, y en él «Compartir» —o «Descargar», donde no hay hoja del sistema— entrega la imagen; la plantilla viene elegida al abrir, y elegir otra plantilla precede a compartir igual que precedía a descargar (FR-17). Compartir la cita abre la hoja con enlace y texto; donde no la hay, los destinos ya están a la vista. Nada requiere dos pasos para lo que UJ-1 hace con prisa. *(recoge lo construido)*
- **Sin gestos ocultos.** Nada de deslizar, mantener pulsado ni pellizcar. Toda acción tiene un control visible, nombrado con texto: no hay iconos en el producto (`DESIGN.md § Components`). [ASSUMPTION]
- **Sin intersticial.** Ningún modal, aviso ni invitación antes del contenido (NFR-10). Esto incluye el aviso de cookies: la analítica elegida no debe requerirlo (NFR-11).
- **Movimiento mínimo.** Solo transiciones de opacidad y color, ≤ 150ms. Sin animación de entrada del contenido, que retrasaría la lectura. `prefers-reduced-motion` las elimina por completo.
- **Zonas de toque** mínimo `{components.tap-target-min}` (44px) con `{spacing.unit}` (8px) de separación.
  - **Por qué 44px:** son decisión de producto; WCAG 2.1 AA, el suelo declarado, no tiene criterio de tamaño de objetivo.
  - **Exención:** queda exento el objetivo que va dentro de una frase y cuya altura fija el interlineado del texto que lo rodea, que es la excepción que traen la 2.5.5 (AAA, 44px) y la 2.5.8 (AA, 24px) de WCAG: el enlace de la Línea de la Fuente, a mitad de oración.
  - **El título de la Obra en la Atribución** *(v7.1)* **no** está exento: abre su línea y casi es la línea. Lleva al menos 3 × `{spacing.unit}` de zona efectiva —el mínimo de la 2.5.8— sin solapar ninguna otra. La zona ampliada del nombre del Autor, encima, no invade la línea de la Procedencia; hoy la invade: no cumple, defecto anotado.
  - **«de {Autor}» en la Cabecera de Obra** lleva los 44px con el mismo procedimiento de relleno vertical y margen negativo que el nombre en la Atribución. [ASSUMPTION]
- **Desplazamiento** siempre nativo. Sin desplazamiento infinito ni secuestro del desplazamiento.
- **Pestaña nueva solo para entregar algo en curso a un tercero:** donar, compartir y comprar —«Apoyar el sitio», los destinos de «Compartir la cita» y las ediciones en venta—, para que quien leía no pierda la página. Todo enlace que la abre lo avisa dentro de su nombre accesible, con el patrón de «Apoyar el sitio»: «(se abre en una pestaña nueva)», oculto a la vista y leído por el lector de pantalla. La Línea de la Fuente, los enlaces a las cuentas sociales del pie y todo lo demás abren en la misma pestaña. Hoy los enlaces a las cuentas sociales del pie abren pestaña nueva: no cumple, defecto anotado. El siena nunca es la única señal de salida (`DESIGN.md § Colors`). [ASSUMPTION]

## Accessibility Floor

Comportamiento. El contraste visual está resuelto en `DESIGN.md § Colors`.

- **WCAG 2.1 AA** en todas las superficies públicas (NFR-9).
- **Foco visible siempre:** anillo de 2px en `{colors.primary}` con 2px de separación. Nunca se suprime el indicador de foco, tampoco en el campo de búsqueda; hoy el campo lo suprime en `/buscar/` y en el 404: no cumple, defecto anotado. [ASSUMPTION]
- **Orden de tabulación** = orden de lectura. En Página de Cita: contenido primero, acciones después, navegación al final.
- **Semántica correcta:** la Cita se marca como cita con su atribución asociada; un único `h1` por página —en la Página de Obra, el título de la Obra *(v7.1)*—; los listados son listas reales.
- **Mensajes de estado** (WCAG 4.1.3, AA): el recuento de resultados, la búsqueda sin resultados, «Copiado.», la imagen lista y el fallo del generador se anuncian por una región `role="status"`. La región está en el marcado desde la carga, vacía y no oculta: lo que se anuncia es un cambio de contenido, no de visibilidad. Hoy no hay ninguna en todo el sitio: no cumple, defecto anotado. [ASSUMPTION]
- **Subrayado siempre visible** *(v7.1)*: todo enlace que va en una línea de texto —que la comparte con texto que no enlaza— se subraya siempre, sea tinta o siena, y no solo al pasar el cursor. Los enlaces de bloque —Tarjeta de Cita, Citas hermanas, chips, resultados de búsqueda, Paginación, entradas de la Lista de Obras, marca— no lo llevan: los identifican su forma y su posición. Ninguna pareja de la paleta separa enlace y texto por 3:1 (`DESIGN.md § Colors`), en móvil no se puede pasar el cursor por encima, y un enlace que se distingue solo por el color choca con WCAG 1.4.1 [ASSUMPTION]. Lo lleva también el nombre del Autor en la Atribución, aunque ocupe su propia línea: un solo criterio para los enlaces en tinta de la Atribución y de la Cabecera de Obra. Hoy ese nombre solo se subraya al pasar el cursor: no cumple, defecto anotado.
- **La imagen no es la única vía.** Todo lo que ofrece la Imagen de Cita está disponible como texto copiable. La Imagen es un extra, nunca el único acceso al contenido.
- **Zoom hasta 200 %** sin pérdida de contenido ni desplazamiento horizontal.
- **Idioma declarado** `es` en el documento; el marcado no asume variante regional.

## Key Flows

Nombres heredados verbatim del PRD §2.3. No se renumeran.

- **UJ-1 — Lucía necesita una frase para cerrar su presentación, y la necesita ahora.**
  1. Aterriza desde el buscador en una Página de Cita. Sin portada, sin modal, sin aviso.
  2. La Cita ocupa la pantalla. La lee de un vistazo.
  3. Debajo, el Autor y la obra. **Clímax:** confía en lo que va a citar sin tener que comprobarlo en otro sitio.
  4. Pulsa Copiar. El botón confirma en el sitio. Texto y atribución van juntos.
  5. Cierra. Tiempo total desde el clic en Google: por debajo de 30 segundos.
  *Fallo posible:* la Cita no tiene Procedencia. La página lo dice explícitamente en lugar de callar, y Lucía decide con la información completa.

- **UJ-2 — Diego quiere publicar algo hoy y que se vea bien.** *(v7.1: al día con el PRD)*
  1. Diego, 24 años, busca material para su historia de Instagram. Llega a una Página de Cita desde una búsqueda por tema.
  2. Le gusta la frase, pero no va a copiar texto plano. Pulsa «Compartir como imagen» y se abre el diálogo, con unos pocos diseños y su Cita ya compuesta en cada uno.
  3. Elige y pulsa «Compartir». En lugar de recibir un fichero en la carpeta de descargas, se le abre la hoja de compartir de su móvil con la Imagen de Cita ya adjunta.
  4. Toca el icono de Instagram, escribe dos palabras y publica. **Clímax:** ha publicado sin salir del navegador, sin abrir la galería y sin buscar dónde ha caído el fichero.
  5. *Resolución:* la imagen lleva la marca, así que su publicación es la que trae al siguiente visitante.
  *Fallo posible:* en el escritorio no existe hoja del sistema. La misma acción —que allí dice «Descargar como imagen»— descarga el fichero, que es el comportamiento de la v1 y sigue siendo correcto.

- **UJ-3 — Marisol llegó por una frase y se quedó una hora.** *(Reescrito en la v7.1, con el texto nuevo del PRD.)*
  1. Profesora de literatura, busca una cita concreta de un autor clásico y aterriza en su Página de Cita.
  2. Bajo la Cita, en la Atribución, pulsa el título de la obra de la que procede.
  3. Página de Obra: lee juntas las demás Citas de ese libro. *(v7.1)*
  4. Pulsa el nombre del Autor en la Cabecera de Obra. Página de Autor: una semblanza breve y el resto de las Citas de esa persona en el catálogo.
  5. Desde ahí salta a un Tema que le interesa y descubre a un autor latinoamericano que no conocía — el suelo del 40 % del Corpus existe justo para que este momento ocurra.
  6. **Clímax:** cuatro páginas después sigue leyendo.
  7. *Resolución:* vuelve por su cuenta días después, directamente al dominio.
  *Fallo posible:* la Procedencia de la Cita no nombra obra. La Atribución muestra lo que declara —o «Sin obra documentada»— sin enlace (FR-2), y Marisol sigue por el nombre del Autor.

- **UJ-4 — Héctor incorpora cincuenta citas nuevas sin romper la promesa del sitio.**
  1. Carga las cincuenta Citas en la herramienta de Curación.
  2. El sistema rechaza las Citas sin Procedencia y las de Autores sin año de fallecimiento, y dice qué regla incumplió cada una.
  3. Completa lo que falta; el resto queda en revisión, no publicado.
  4. **Clímax:** el Corpus crece y el porcentaje de Citas verificadas no baja — visible en la propia herramienta de Curación (FR-16).
  *Fallo posible:* una Cita duplica otra ya publicada. El sistema lo señala; decide Héctor, no el sistema.

- **UJ-5 — Héctor publica la Cita del Día en sus cuentas antes de desayunar.** *(v7.1: escrito con lo construido)*
  1. Además de editor, Héctor lleva las cuentas de Sabiduría de Bolsillo en Instagram, TikTok, X, Threads y Facebook: la única fuente real de visitantes mientras el Corpus sea pequeño.
  2. A las siete de la mañana abre en el móvil el Kit Diario, una dirección del propio sitio que el sistema ha dejado compuesta esa madrugada y a la que no enlaza ninguna superficie pública.
  3. Encuentra la Imagen de la Cita del Día ya generada, el pie con la atribución escrito y el enlace a la Página de Cita, uno por red con su marca de origen.
  4. Descarga la imagen desde el Kit y la publica en cada cuenta con el pie y el enlace de esa red. **Clímax:** publicar en cuatro redes le cuesta dos minutos y cero decisiones, así que lo hace todos los días en lugar de tres veces por semana.
  5. *Resolución:* los enlaces distinguen de qué red viene cada visita, así que al cabo de un mes sabe cuál de las cuatro merece su tiempo.
  *Para los días que no va a estar* (FR-29): fija antes varias jornadas y las revisa en el Lote, que enseña el mismo material que el Kit traerá cada mañana.
  *Fallo posible:* la Cita del Día supera los 300 caracteres y no admite Imagen. El Kit lo dice y ofrece una Cita alternativa apta, en vez de dejarle sin material.
  [NOTE FOR PM] El PRD dice en UJ-5 que comparte la imagen «desde la misma hoja del sistema que usa cualquier visitante», y el Kit la descarga; y nombra cinco cuentas mientras su clímax y su resolución dicen cuatro redes. Que el PRD alinee los dos puntos.

## Responsive & Platform

Tres puntos de ruptura, no más.

| Ancho | Comportamiento |
|---|---|
| < 600px | Columna única, márgenes `{spacing.margin-mobile}`. Tramo tipográfico un escalón por debajo. Acciones cada una en su línea, a su ancho (`DESIGN.md § Components`). |
| 600 – 1024px | Columna única centrada, medida limitada a `{components.quote-max-measure}`. Acciones como en móvil [ASSUMPTION]. |
| > 1024px | Idéntico a tableta con márgenes `{spacing.margin-desktop}`. **El ancho extra se convierte en aire, no en contenido:** no aparecen columnas laterales ni bloques nuevos. |

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
- Desplazamiento infinito en listados.

## Defectos anotados

*Sección inventada: índice de lo construido que hoy no cumple estas espinas. Cada defecto se describe, con su marca, en el sitio que se cita; aquí va una línea por defecto.*

- **Foco suprimido en el campo de búsqueda**, en `/buscar/` y en el 404 — § Accessibility Floor, Foco visible siempre, y `DESIGN.md § Components`, Campo de búsqueda.
- **Números de la Paginación más juntos** que la separación de `{spacing.unit}` entre zonas de toque — `DESIGN.md § Components`, Paginación.
- **Nombre accesible del Diálogo de Imagen:** dice «Descargar» también donde comparte — § Component Patterns, Diálogo de Imagen.
- **Destinos de «Compartir la cita»:** dicen solo el nombre del destino y no avisan de la pestaña nueva — § Component Patterns, Acción Compartir la cita.
- **Generador que no llega a cargar:** la previsualización se queda vacía — § State Patterns.
- **Zona ampliada del nombre del Autor** en la Atribución: invade la línea de la Procedencia — § Interaction Primitives, Zonas de toque.
- **Enlaces a las cuentas sociales del pie:** abren pestaña nueva — § Interaction Primitives, Pestaña nueva.
- **Mensajes de estado:** no hay ninguna región `role="status"` en el sitio — § Accessibility Floor.
- **Nombre del Autor en la Atribución:** solo se subraya al pasar el cursor — § Accessibility Floor, Subrayado siempre visible.
