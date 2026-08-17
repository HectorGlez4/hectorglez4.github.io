---
title: "Addendum — PRD Sabiduría Diaria"
status: final
created: 2026-08-10
updated: 2026-08-10
---

# Addendum del PRD

Profundidad que no cabe en el PRD pero que consumen Arquitectura, UX y la generación de épicas. El PRD define capacidades; aquí queda el *cómo* y el porqué de lo descartado.

## Modelo de datos implícito en el glosario

El §3 del PRD define entidades en lenguaje de producto. Traducido a lo que Arquitectura debe modelar, sin decidir tecnología:

| Entidad | Campos que el PRD hace obligatorios | Origen del requisito |
|---|---|---|
| **Autor** | nombre, semblanza, nacionalidad, **año de fallecimiento (obligatorio)** | FR-13, FR-15 |
| **Cita** | texto, autor (1:1), temas (N:M), **procedencia**, **estado de derechos**, **estado de publicación** | FR-1, FR-2, FR-13 |
| **Tema** | nombre, slug; no eliminable con citas publicadas | FR-6, FR-15 |
| **Cita del Día** | fecha, cita destacada; unicidad por jornada | FR-9 |

El **año de fallecimiento del Autor** es la clave de bóveda: es el único dato que hace que "dominio público" sea una condición comprobable por el sistema y no una afirmación del editor. Si Arquitectura lo modela como opcional, FR-13 deja de ser exigible y SM-C1 deja de ser medible.

La **Procedencia** admite tres grados (completa, parcial, ausente) y el PRD exige distinguirlos en la interfaz (FR-2). No es un campo de texto libre binario.

## Decisiones de mecanismo diferidas a Arquitectura

El PRD las evita a propósito; se listan para que no se tomen por omisión:

- **Renderizado.** NFR-2 exige contenido en el HTML inicial. Eso restringe el espacio de soluciones (servidor o pregeneración) sin elegir dentro de él. Con ~2.000 páginas, la pregeneración completa es viable; con crecimiento a decenas de miles, deja de serlo. Decisión con horizonte, no permanente.
- **Búsqueda.** FR-7 exige tolerancia a acentos y coincidencia por fragmento. Es lo que descarta una comparación exacta ingenua y lo que hace que la normalización del texto sea un requisito de datos, no un detalle de la consulta.
- **Generación de la Imagen de Cita.** El PRD no dice si se genera al vuelo, bajo demanda con caché, o por anticipado. Las tres cumplen FR-10 y tienen costes operativos muy distintos. Es la decisión de arquitectura con mayor impacto en coste de la v1.
- **Detección de duplicados (FR-14).** Exige normalización insensible a puntuación, acentos y mayúsculas. Comparte la normalización con la búsqueda; conviene que sea la misma.

## Origen del corpus — decidido en el brief

Recogido por referencia, no reabierto. Ver `briefs/brief-brainlySabiduria-2026-08-10/addendum.md` para la comparativa de vías (dominio público, derecho de cita, traducción, aportes de usuarios) y para la nota de plazos por jurisdicción. Resumen operativo: se publica solo `dominio-público`; el campo Estado de Derechos existe para admitir otros criterios sin rehacer la ingesta.

## La feature que el brief no nombraba

El brief dice que "la curación es interna" y ahí se detiene. El PRD convierte esa frase en la feature §4.8 con cuatro requisitos funcionales.

Razón: sin una herramienta que rechace por construcción las Citas sin procedencia y los Autores sin año de fallecimiento, el criterio de admisión depende únicamente de la disciplina del editor. Un compromiso que solo vive en la cabeza de una persona no es un diferenciador defendible — es una intención. FR-13 lo convierte en una propiedad del sistema, y FR-16 lo hace observable.

Consecuencia de alcance: la v1 incluye una superficie interna que el brief no presupuestaba. No es grande, pero no es cero, y aparece en el plan de entrega.

## Contra-métricas — por qué estas dos

Ambas nacen de la misma observación: las métricas primarias del producto se pueden subir por la vía barata, y la vía barata destruye el producto.

- **SM-C1 (procedencia verificada)** contrapesa el tráfico. Publicar más citas sube SM-2; verificar menos es la forma más rápida de publicar más.
- **SM-C2 (densidad de Temas)** contrapesa la indexación. Multiplicar Temas sube el número de páginas indexables de SM-1, y produce exactamente las páginas vacías que el §El Problema del brief identifica como el defecto de los competidores.

Si alguna de las dos se elimina en una revisión futura, conviene releer este párrafo antes.

## Deuda conocida que entra a propósito

- **Sin cuentas de usuario.** Implica que no hay forma de medir retorno a nivel de persona; SM-4 y SM-5 son proxies agregados. Aceptado.
- **Editor único.** FR-13…FR-16 se diseñan para un operador. Multiusuario, roles y permisos son v2 y requerirán revisar la herramienta, no ampliarla.
- **Temas gestionados a mano.** Escala mal por encima de unos pocos cientos de Citas por Tema, pero protege SM-C2. Consciente.

---

# Addendum de la v2

## Decisiones de mecanismo — compartición

Ninguna de estas pertenece al PRD; se registran aquí para que Arquitectura no las reabra desde cero.

- **Hoja del Sistema = `navigator.share` con ficheros.** Es la única API web que alcanza Instagram y TikTok, que no admiten intención web de ningún tipo. La detección debe ser `navigator.canShare({ files })` y no `'share' in navigator`: el segundo da verdadero en navegadores que comparten enlaces pero no ficheros, y la promesa se rompería en tiempo de ejecución.
- **El PNG ya existe.** `public/islas/imagen.js` compone el lienzo y lo pasa por `canvas.toBlob()` antes de fabricar el enlace de descarga. FR-17 cambia el destino de ese mismo blob, no la generación. Por eso «el fichero compartido y el descargado son el mismo» es verificable en lugar de aspiracional: hay una sola llamada a `toBlob`.
- **Destinos de escritorio = URL de intención.** X, WhatsApp, Facebook, Telegram y LinkedIn las admiten. Instagram y TikTok no, y por eso no aparecen como destino en escritorio: ofrecer un botón que no puede cumplir es peor que no ofrecerlo.
- **La Tarjeta Social se genera en el build, no en el navegador.** El generador actual es `canvas` del navegador y no existe en Node. Arquitectura debe elegir el generador de servidor; lo que no es negociable es que consuma los mismos tramos tipográficos de `src/lib/tramos.ts` que la Imagen de Cita, o la tarjeta y la imagen divergirán.
- **Eventos nuevos bajo AD-13.** El vocabulario cerrado de `src/lib/medicion.ts` se amplía con la compartición y su destino. La fricción de tener que modificar el módulo es la revisión que AD-13 quería; no se elude añadiendo un evento genérico con carga libre.

## Decisiones de mecanismo — operación y lanzamiento

- **Receptor de medición: Cloudflare Worker.** Se eligió frente a un proveedor externo (Plausible y similares) porque la baliza propia de AD-13 ya está construida y funciona; un proveedor obligaría a introducir su guion, y con él vuelven las cookies y el consentimiento que NFR-10 y NFR-11 excluyeron por diseño. Se descartó Cloudflare Web Analytics por medir páginas vistas y no eventos propios: dejaría SM-5 y SM-7 sin datos, que son justo las que la v2 quiere probar.
- **El hosting no cambia.** GitHub Pages sirve el sitio desde la v1 con reconstrucción diaria. Salir a producción es conectar el dominio, no migrar de plataforma.
- **El Kit Diario se sirve como una página más del sitio.** No necesita infraestructura: el CI ya se despierta cada jornada para componer la Cita del Día, y esa misma ejecución puede dejar la página compuesta. Es `noindex` y no está enlazada desde la navegación.

## Origen del Corpus en la v2 — opciones consideradas

La v2 se planteó explícitamente extraer de un sitio de citas existente. Se descartó, y conviene dejar por escrito por qué, porque es una idea que vuelve:

1. **Condiciones de uso.** Prohíben el rastreo automatizado.
2. **Derecho sobre la compilación.** La selección y disposición de una base de datos de citas está protegida con independencia de que las frases individuales estén en dominio público.
3. **La razón que decide, y es de producto.** Esos sitios publican texto y nombre, sin obra ni año. La puerta de admisión de FR-13 vive en el esquema de contenido (AD-1), así que cada Cita extraída de ahí quedaría en `corpus/_revision/`. La tubería completa desembocaría en el desagüe.

**Traducciones.** Se descartó traducir Citas de otras lenguas por dos motivos independientes, cualquiera de ellos suficiente. El de derechos: una traducción es obra nueva con su propio plazo, así que un original en dominio público no libera su traducción moderna. El de producto: una traducción propia produce una frase en español que no consta en ninguna edición publicada, es decir, una Cita cuya Procedencia no se puede verificar — el defecto exacto que el producto existe para corregir.

**Fuentes admitidas.** Wikisource en español, Biblioteca Virtual Miguel de Cervantes, Project Gutenberg y Wikiquote en español restringido a sus entradas con referencia. Las tres primeras dan obra y edición; la cuarta obliga a atribuir y compartir bajo la misma licencia, lo que Arquitectura debe resolver antes de usarla.

**Uso legítimo de la competencia.** Consultar qué Autores y Temas concentran demanda es investigación de mercado y sirve para priorizar a quién se dedica cada sesión de sembrado. Es una lectura, no una extracción, y no toca el Corpus.


---

# Addendum de la v3

## Monetización — opciones consideradas y por qué esos umbrales

Los cuatro Modelos se evaluaron por **coste sobre el producto**, no por ingreso esperado. La razón es que el ingreso de los cuatro es igualmente desconocido con 38 Citas y cero tráfico medido, así que ordenarlos por una cifra inventada habría sido falsa precisión; el coste, en cambio, sí se conoce hoy.

| Modelo | Coste de implementación | Coste sobre la experiencia | Reversible |
|---|---|---|---|
| Donaciones | Un enlace | Ninguno | Sí, sin rastro |
| Afiliación | Enlace derivado de la Procedencia ya publicada | Bajo; convierte procedencia en superficie comercial | Sí |
| Producto propio | Alto, y sin definir | Ninguno sobre las páginas públicas | Sí, pero con inventario ya producido |
| Publicidad | Medio (integración de tercero) | **Alto** — el único que degrada páginas existentes | Sí, pero deja al visitante con la impresión ya formada |

**Anclaje de los umbrales.** Tres de los cuatro se anclan a cifras que el PRD ya se había comprometido en SM-2 (2.000 como primer volumen significativo; 5.000 = meta al mes 6; 25.000 = meta al mes 12). Esto es deliberado: usar metas preexistentes impide fabricar umbrales a medida de la impaciencia. Si SM-2 se revisa alguna vez, los umbrales se revisan con ella y no por separado.

**Descartado: muro blando o límite de lecturas.** Se descartó sin discusión por NFR-10, que no admite excepción. Un producto cuyo mecanismo de crecimiento es el tráfico orgánico no puede poner una puerta delante del contenido que ese tráfico viene a leer.

**Descartado: reservar espacio publicitario desde ya.** La regla de la v1 lo prohíbe explícitamente («no debe crear obstáculos... pero tampoco reservarle espacio»), y sigue siendo correcta: un hueco esperando anuncios es un anuncio de que vendrán.

## Decisiones de mecanismo — v3

- **Motor de vídeo (FR-31).** Sin decidir: composición temporal, audio o su ausencia, duración, formato de salida por red. Es la única pieza de la v3 que introduce una dependencia de cómputo nueva, y §6.3 la había descartado en la v2 con un argumento que sigue en pie. Su umbral (ninguna evidencia de SM-8, ningún motor) existe para que Arquitectura no gaste tiempo en ella antes de que haya señal.
- **Composición por lote (FR-29).** Dónde vive el material compuesto por adelantado y cómo se reconcilia con la reconstrucción diaria de AD-12. La restricción de producto es que lo anticipado sustituya a lo de la jornada cuando ambos existan; el mecanismo es de Arquitectura.
- **Modelo de la Colección (FR-26…FR-28).** Si la pertenencia se declara en la Cita o en la Colección. El PRD exige que añadir una Colección no toque ninguna Cita existente, lo que apunta a lo segundo, pero la elección es de Arquitectura y toca AD-4 (slug inmutable) solo si alguien propusiera meter la Colección en la ruta de la Cita — cosa que FR-28 prohíbe.
- **Integración publicitaria (FR-37).** Qué proveedor y por qué transporte. La restricción dura es NFR-11: un proveedor que exija consentimiento invasivo o identifique al visitante no cumple FR-37 y no se enciende, por rentable que sea. Esto excluye de partida a buena parte del mercado y conviene saberlo antes de evaluar.

## Por qué SM-C2 se extendió en vez de crear una contra-métrica de Colecciones

Una contra-métrica frena cuando la cifra que vigila es una sola y duele mirarla. Las Colecciones y los Temas fallan del mismo modo —agregación con poco dentro— y repartir esa vigilancia en dos métricas habría permitido justificar cada una con la otra («los Temas están densos, aunque las Colecciones no»). Una sola mediana sobre las dos superficies no admite esa salida.

## Deuda conocida que entra a propósito en la v3

- **FR-31 (vídeo) entra sin evidencia que lo respalde.** Registrado como el supuesto peor sostenido del documento (§15) y como candidato preferente al recorte. Se acepta a sabiendas.
- **El producto propio (FR-36) tiene umbral sin contenido.** Es deuda deliberada: definirlo ahora contradiría la propia regla de §12.
- **La v3 planifica en paralelo al desbloqueo de LC-1…LC-4.** El riesgo real no es de construcción sino de publicación, y la puerta de activación reescrita en §6.3 es lo que lo contiene. Si esa puerta se salta, la v3 repite el error de la v2 con más superficie en juego.
