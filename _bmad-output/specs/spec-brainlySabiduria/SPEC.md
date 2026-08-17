---
id: SPEC-brainlySabiduria
companions:
  - '../../planning-artifacts/prds/prd-brainlySabiduria-2026-08-10/prd.md'
  - '../../planning-artifacts/prds/prd-brainlySabiduria-2026-08-10/addendum.md'
  - '../../planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/ARCHITECTURE-SPINE.md'
  - '../../planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/GUIA-DE-ARRANQUE.md'
  - '../../planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md'
  - '../../planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/EXPERIENCE.md'
  - '../../../DESPLIEGUE.md'
sources:
  - '../../planning-artifacts/architecture/architecture-brainlySabiduria-2026-08-10/RECONCILIACION.md'
---

> **Contrato canónico.** Este SPEC y los ficheros de `companions:` son el contrato completo y validado por preservación de qué construir, probar y validar. Los documentos de `sources:` son trazabilidad — consúltalos solo si necesitas el razonamiento narrativo que este contrato omite a propósito.
>
> **Reparto de responsabilidades.** El kernel de abajo fija las capacidades con IDs estables, las restricciones que doblan cualquier decisión y la señal de éxito. El detalle verificable de cada capacidad —las «Consecuencias» de cada FR— vive en el PRD adoptado, que sigue siendo propiedad de `bmad-prd`; los invariantes técnicos, en la espina de arquitectura, propiedad de `bmad-architecture`; los tokens y el comportamiento, en `DESIGN.md` y `EXPERIENCE.md`. Este SPEC no los duplica en ningún punto, a propósito: dos copias de una regla divergen en la primera revisión.

# Sabiduría de Bolsillo

## Why

**Una visión que realizar, con una oportunidad detrás y un plazo que se está gastando solo.** Sabiduría de Bolsillo es un sitio panhispánico donde cada cita célebre es una página propia, encontrable desde un buscador y respaldada por la procedencia de lo que afirma. Ataca tres fallos simultáneos del vertical en español —no encuentras la frase concreta, no puedes fiarte de la atribución, y no puedes usarla sin fricción— en un espacio atendido por sitios con diseños de otra década y atribuciones sin verificar. El motor de crecimiento no es una campaña: es la estructura del sitio, una red densa de páginas pequeñas que responden consultas de cola larga.

Lo que hace que importe **ahora** es el estado exacto en que está: la v1 construyó el producto y la v2 lo preparó para salir, pero **el sitio nunca se ha publicado**. Treinta y ocho Citas, ocho Temas, todo construido y verificado, y las cuatro puertas de LC-1…LC-4 cerradas — el dominio no sirve, el sitemap no se anuncia, Search Console no está verificada y el receptor de medición no recibe un solo evento. Todo lo que la v2 construyó para medir está sin estrenar, y ninguna métrica con plazo tiene origen porque el mes 0 aún no ha ocurrido. La v3 tiene por eso un objetivo en dos tiempos: abrir esas puertas y, con el sitio ya publicado, convertirlo en algo que crece por sí solo y se sostiene. El afectado es un operador único, Héctor, que es a la vez editor del Corpus y responsable de las cuentas propias — el único canal de entrada mientras el Corpus no sostenga tráfico de buscador.

## Capabilities

- **CAP-1 — Página de Cita** *(FR-1…FR-3)*
  - **intent:** Un visitante lee una Cita en su URL propia y permanente, ve quién la dijo y de dónde procede, y se la lleva copiada con su atribución en una sola acción.
  - **success:** El texto de la Cita es el primer contenido visible sin desplazamiento en un viewport de 360 × 640 px; una pulsación deja texto y atribución juntos en el portapapeles como texto plano; una Procedencia ausente se declara explícitamente en lugar de omitir el bloque; una Cita `en-revisión` devuelve 404 y no aparece en el sitemap.

- **CAP-2 — Página de Autor** *(FR-4, FR-5)*
  - **intent:** Un visitante sitúa a la persona con una semblanza breve y recorre todas sus Citas publicadas desde una URL propia.
  - **success:** La página lista todas las Citas `publicada` del Autor y ninguna `en-revisión`; un Autor sin Citas publicadas no tiene página accesible ni indexable; por encima de 50 Citas el listado se pagina y las páginas 2 y siguientes son `noindex, follow`.

- **CAP-3 — Página de Tema** *(FR-6)*
  - **intent:** Un visitante encuentra Citas de distintos Autores bajo una etiqueta transversal, capturando la intención de búsqueda amplia.
  - **success:** Un Tema con menos de 15 Citas publicadas no se publica ni se indexa; si cae por debajo del umbral se despublica y sus Citas conservan sus demás Temas; el conjunto de Temas es cerrado y no se genera ninguno automáticamente.

- **CAP-4 — Búsqueda** *(FR-7, FR-8)*
  - **intent:** Un visitante encuentra una Cita por fragmento de texto, por Autor o por Tema, escribiendo como se escribe de verdad en español.
  - **success:** «corazon» devuelve «corazón» y la búsqueda es insensible a mayúsculas; un fragmento de tres o más palabras consecutivas de una Cita publicada la devuelve; los resultados distinguen si la coincidencia es de Cita, de Autor o de Tema; la pantalla de cero resultados ofrece Temas y Autores destacados y registra la consulta para alimentar la curación.

- **CAP-5 — Cita del Día** *(FR-9)*
  - **intent:** La portada destaca una Cita que cambia una vez por jornada y da motivo de retorno directo al sitio.
  - **success:** Es la misma para todos los visitantes de la jornada y se selecciona de forma determinista a partir de la fecha del build, sobre el subconjunto apto para portada, sin repetir mientras queden aptas sin destacar; una fijación manual de una jornada concreta tiene prioridad sobre la rotación.

- **CAP-6 — Imagen de Cita** *(FR-10, FR-11)*
  - **intent:** Un visitante convierte una Cita en un objeto publicable, eligiendo entre un conjunto acotado de diseños.
  - **success:** La imagen contiene el texto, el nombre del Autor y la marca, en proporción apta para redes; el tamaño tipográfico baja por tramos discretos según la longitud hasta un suelo legible; una Cita de más de 300 caracteres no ofrece la acción en absoluto; el sistema nunca recorta ni abrevia el texto para que quepa; la generación no bloquea la interacción con la página.

- **CAP-7 — Descubrimiento** *(FR-12)*
  - **intent:** Desde cualquier Página de Cita, el visitante encuentra al menos una ruta a contenido relacionado, convirtiendo una visita de un segundo en una sesión.
  - **success:** Se ofrecen otras Citas del mismo Autor y de sus mismos Temas; ninguna Página de Cita publicada queda sin enlaces salientes internos; la relación se deriva de Autor y Tema, sin motor de recomendación.

- **CAP-8 — Ingesta y curación del Corpus** *(FR-13…FR-16)*
  - **intent:** El editor da de alta Citas, individualmente o por lote, y el sistema impide por construcción publicar las que incumplen el criterio de admisión.
  - **success:** Una Cita sin Procedencia, o cuyo Autor no tiene año de fallecimiento, o cuyo Estado de Derechos no es `dominio-público`, no puede pasar a `publicada`, y el rechazo indica qué regla se incumplió con la ruta del fichero; los duplicados se señalan pese a diferencias de puntuación, acentuación y mayúsculas, y decide el editor; el porcentaje de Citas publicadas con Procedencia completa es consultable en cualquier momento y desglosado por Autor.

- **CAP-9 — Compartir directo** *(FR-17…FR-20)*
  - **intent:** El visitante entrega la Imagen de Cita o el enlace a la aplicación donde publica de verdad, sin pasar por el gestor de ficheros.
  - **success:** Donde el navegador admite compartir ficheros la acción principal abre la Hoja del Sistema con la imagen ya adjunta, y donde no, la misma acción descarga — sin tercera vía, sin botón deshabilitado, sin aviso de incompatibilidad; el fichero compartido y el descargado son el mismo; toda Cita publicada tiene Tarjeta Social, y la que no admite Imagen la lleva con Autor y marca pero **sin** el texto de la Cita; los eventos registran el Destino de Compartición cuando es conocido y como opaco cuando no, sin cookie ni identificador.

- **CAP-10 — Kit Diario de Publicación** *(FR-21, FR-22)*
  - **intent:** Cada jornada, el sistema deja compuesto el material para publicar la Cita del Día en las cuentas propias, de modo que publicar cueste un gesto y no dependa de que su operador tenga tiempo.
  - **success:** La superficie es alcanzable desde un móvil sin herramientas ni acceso al repositorio, no es indexable ni alcanzable desde la navegación pública, y se recompone en la misma jornada en que cambia la Cita del Día sin intervención; si la Cita del Día no admite Imagen, lo indica y ofrece una alternativa apta; el enlace distingue la red de destino sin que la página deje de ser la misma URL canónica.

- **CAP-11 — Sembrado del Corpus** *(FR-23…FR-25)*
  - **intent:** El editor hace crecer el Corpus extrayendo candidatas desde las obras, no desde otros sitios de citas, de modo que la Procedencia venga con el texto en lugar de buscarse después.
  - **success:** Cada candidata llega con obra y año tomados de la Fuente y registra bajo qué licencia se obtuvo; una Fuente cuya licencia no permita reutilización no produce candidatas; aprobar una candidata la somete a las mismas reglas que cualquier alta de CAP-8; el lote es reanudable; la vista de huecos muestra los Temas por debajo del umbral y la proporción de Autores de tradición latinoamericana frente al suelo del 40 %, sin proponer Autores automáticamente.

- **CAP-12 — Colecciones Curadas** *(FR-26…FR-28)*
  - **intent:** Una agregación editorial que cruza Tema y Autor captura la consulta real —«frases cortas para reflexionar», «para dedicar»— que hoy no tiene dónde aterrizar.
  - **success:** La Colección declara sus miembros por slug en su propio fichero y la lista es **blanda**: mover una Cita a `_revision/` no rompe el build y la retira de todas sus Colecciones sin hueco ni enlace roto; el umbral mínimo se aplica al recuento resuelto, nunca al declarado; una Colección bajo su umbral desaparece a la vez de la página, del sitemap, de los chips y del descubrimiento; toda Colección publicada es alcanzable desde la portada; la canónica de una Cita sigue siendo su Página de Cita.

- **CAP-13 — Ampliación del canal propio** *(FR-29…FR-32)*
  - **intent:** El editor compone varias jornadas de material de una sentada y produce piezas que reúnen varias Citas o anuncian una Colección, de modo que olvidar un día deje de ser perder ese día.
  - **success:** La composición anticipada usa las mismas fijaciones de jornada que la rotación —no existe un segundo calendario— y el lote es reanudable; una pieza de varias Citas conserva la atribución visible de cada una y excluye las que no admiten Imagen; la pieza derivada de una Colección enlaza a la Página de Colección y no se produce si la Colección está bajo su umbral; la pieza en movimiento no se construye hasta que SM-8 demuestre que al menos una cuenta de imagen fija trae visitas medibles.

- **CAP-14 — Monetización por umbral** *(FR-33…FR-37)*
  - **intent:** Cuatro Modelos de Ingreso quedan diseñados y apagados, cada uno con una cifra de tráfico medido por encima de la cual puede encenderse, por separado y de forma reversible.
  - **success:** El estado de cada Modelo es configuración versionada — encenderlo es un cambio visible en un diff y `git revert` lo apaga; ninguno se enciende por debajo de su Umbral de Activación medido en el receptor; con todos apagados ninguna superficie tiene hueco reservado ni espacio en blanco; ninguna unidad de ingreso aparece en la Página de Cita ni en la de Colección; el estado de cada Modelo y la cifra contra la que se mide son consultables sin exportar datos.

- **CAP-15 — Publicación y medición operativas** *(LC-1…LC-6)*
  - **intent:** El sitio queda servido en su dominio propio, anunciado, verificado y midiendo, de modo que exista un mes 0 desde el que contar toda métrica con plazo. No produce FR: es ejecución de `DESPLIEGUE.md` §1–§3.
  - **success:** `sabiduriadebolsillo.net` responde por HTTPS y la canónica de cada página y el sitemap lo declaran; un `robots.txt` anuncia dónde está el sitemap; la propiedad de Search Console está verificada y el sitemap enviado; los eventos de medición llegan al receptor y se pueden consultar; ninguna superficie ni la marca de agua de la Imagen de Cita menciona el nombre retirado; ninguna Cita publicada carece de Procedencia y todo Tema anunciado en la portada está por encima del umbral de CAP-3.

## Constraints

- **La puerta de publicación.** Se puede construir en cualquier orden; **nada se publica ni se comparte hasta que LC-1…LC-4 estén verificadas** (CAP-15). Compartir con un Corpus corto y sin medición gasta el alcance de las cuentas en un sitio que todavía no puede retener a nadie ni contar si lo hizo, y ese gasto es irreversible: la primera impresión de una cuenta se da una vez.
- **El contenido principal está en el HTML inicial**, sin requerir ejecución de JavaScript para que un rastreador lo lea (NFR-2). El sitio se sirve estático: sin servidor de aplicación, sin base de datos y sin estado mutable en el camino del visitante.
- **La puerta de admisión vive en el esquema de contenido, no en la herramienta** (AD-1). Un fichero editado a mano que incumpla la admisión **rompe el build**; ninguna comprobación de admisión puede vivir únicamente en `tools/`.
- **Lo no publicado se separa por directorio, no por un campo que filtrar** (AD-2). Publicar es mover el fichero. Un filtro es algo que se olvida en la siguiente superficie que enumere contenido.
- **Integridad del texto** (NFR-12): el sistema no altera, corrige, normaliza ni recorta el texto de una Cita publicada sin acción explícita del editor. Ausencia antes que mutilación — de ahí el corte de 300 caracteres de CAP-6 y la Tarjeta Social sin texto de CAP-9.
- **Sin muro de entrada** (NFR-10) y **sin identificación del visitante** (NFR-11): ninguna superficie pública exige interacción antes de mostrar el contenido, y la analítica no requiere consentimiento invasivo. Ambas tienen prioridad sobre cualquier Modelo de Ingreso.
- **Ningún guion de tercero en ninguna superficie**, y un Modelo de Ingreso no es una excepción (AD-20). La propiedad se garantiza por construcción, no por la casilla de configuración del proveedor: un proveedor que exija su guion no cumple y no se enciende, por rentable que sea.
- **La medición es un plano de un solo sentido** (AD-14): ningún byte de `dist/` deriva de ella, ni en build ni en cliente. Con el receptor caído el sitio se construye y se sirve idéntico. Los umbrales se consultan desde `tools/` o desde un aviso de CI, y **encender un Modelo es un commit, no una medición** (AD-21).
- **Ninguna agregación reproduce la Cita** (AD-19, NFR-13): toda superficie indexable que enumere Citas las presenta con el **mismo** componente de tarjeta —fragmento acotado, atribución, enlace— y la canónica de una Cita es siempre su Página de Cita, esté en cuantos Temas y Colecciones esté.
- **El slug de una Cita es inmutable y no deriva de su agregación** (AD-4). Ni los Temas ni las Colecciones participan en ninguna ruta de Cita.
- **Un solo dueño por conjunto.** `publicado.ts` posee lo publicable *y* lo alcanzable; `umbrales.ts`, todo literal numérico de regla de negocio; `normalizar.ts`, la única normalización de texto; `tramos.ts`, la tabla de tramos tipográficos; `medicion.ts`, el vocabulario cerrado de eventos; y cada superficie declara en un solo sitio si es publicable, del que derivan sitemap, `noindex` y el barrido de accesibilidad (AD-3, AD-8, AD-9, AD-11, AD-13, AD-17).
- **El Corpus no tiene otro almacén que git** (AD-10): sin base de datos, sin CMS, sin panel autenticado del que el sitio derive contenido. La historia editorial es la historia de git.
- **Origen del Corpus.** Solo entra texto **en español** procedente de una **edición identificable en dominio público**. No se traduce para publicar —una traducción propia produce una frase que no consta en ninguna edición— y no se extrae de agregadores de citas, que publican texto y nombre sin obra ni año y por tanto no pasarían la admisión de CAP-8.
- **La detección de la Hoja del Sistema es `navigator.canShare({ files })`**, nunca `'share' in navigator`: el segundo da verdadero en navegadores que comparten enlaces pero no ficheros, y la promesa se rompería en tiempo de ejecución.
- **Una construcción no rasteriza un artefacto por Cita cuya entrada no ha cambiado** (AD-16), y la entrada incluye la versión de la plantilla. Sin esto, crecer el Corpus convierte el build en cuello de botella sin que nadie lo vea venir.
- **Rendimiento y accesibilidad son requisito, no acabado.** Contenido principal visible en móvil con 4G en menos de 2,5 s (NFR-7), superficies públicas plenamente utilizables a 360 px de ancho (NFR-8) y conformes a WCAG 2.1 AA (NFR-9). El rendimiento es requisito de SEO.
- **Vocabulario y ausencia de datos.** Las entidades se nombran en español según el glosario —`Cita`, `Autor`, `Tema`, `Procedencia`, `Colección`, `Pieza de Canal`, `Modelo de Ingreso`—, también en identificadores de código; nunca `quote`, `frase` ni `author`. Un campo opcional sin valor **se omite** del fichero: nunca cadena vacía ni `null`, porque la distinción entre Procedencia completa, parcial y ausente es de presencia de campos.
- **El sitio presenta y se aparta.** Ninguna superficie comenta ni adjetiva una Cita; la serif toca exclusivamente texto de Cita y nombres de Autor, Tema y Colección; el siena es el único acento y ningún componente lleva valores literales de color o tipografía.

## Non-goals

- **No somos una red social.** Sin cuentas, sin perfiles, sin comentarios, sin votos, sin favoritos.
- **No aceptamos aportes de usuarios.** La curación es interna y de un solo operador; multiusuario, roles y permisos no existen, y si aparecen más editores el mecanismo es el control de acceso del repositorio.
- **No somos un agregador.** El Corpus se cura desde las obras, no se rastrea de otros sitios de citas.
- **No traducimos.** Ni Citas para publicarlas, ni el producto: es monolingüe en español por decisión, no por limitación.
- **No somos una enciclopedia de autores.** La semblanza sitúa; no compite con Wikipedia.
- **No hay motor de recomendación.** La relación se deriva de Autor y Tema.
- **No hay app nativa ni PWA instalable.** La web responsive cubre el caso de uso completo.
- **No hay boletín ni notificaciones.** Dependen de tener audiencia, y averiguar si la hay es precisamente lo que la v3 va a hacer.
- **No hay publicación automática en las cuentas.** El sistema deja el material compuesto; publicar lo hace Héctor. Automatizarlo exige credenciales de cuatro plataformas y sus revisiones de aplicación para ahorrar dos minutos al día.
- **No hay modo oscuro.** La dirección visual es luminosa por definición y un segundo tema duplicaría el trabajo de plantillas de Imagen de Cita. Decisión registrada, no olvido.
- **No generamos Citas con IA.** El sistema no crea ni parafrasea contenido atribuible a una persona real.
- **No monetizamos la lectura ni antes de su umbral.** Ningún Modelo de Ingreso toca la Página de Cita ni la Página de Colección, y ninguno se enciende por debajo de su Umbral de Activación. Lo que se adelanta es el diseño, nunca el cobro.
- **No aspiramos al volumen a costa de la verificación.** Si el ritmo del Corpus falla, la palanca es reducir el Corpus, nunca relajar la admisión.
- **No hay entorno de ensayo.** No hay estado que migrar: la reversión es volver a desplegar un commit anterior y la copia de seguridad es el repositorio.

## Success signal

**El mes 0 empieza la jornada en que LC-1…LC-4 quedan verificadas**, y toda métrica con plazo se cuenta desde ahí. A los 3 meses, al menos el 90 % de las Citas publicadas están indexadas (SM-1) — es el indicador temprano: si las páginas no se indexan, ninguna otra métrica llega a existir. Al mes 6, 5.000 sesiones orgánicas/mes; al mes 12, 25.000 (SM-2).

El contrapeso decide tanto como la meta. Si SM-2 sube mientras baja el porcentaje de Citas publicadas con Procedencia completa (SM-C1) o la mediana de Citas por Tema y por Colección publicados (SM-C2), el producto está destruyendo su único diferenciador defendible y la respuesta es frenar la publicación, nunca relajar la admisión. Lo mismo con el ingreso: un Modelo que suba SM-10 degradando el rebote o el tiempo hasta el contenido (SM-C4) se apaga — estaría comprando ingreso con el activo que lo produce.

## Assumptions

- **Llegar al orden de las ~2.000 Citas es alcanzable** ahora que el sembrado está construido y el Corpus crece publicado. El supuesto original —alcanzarlas *antes* del lanzamiento— resultó falso; el riesgo dejó de ser de plan y pasó a ser de ritmo.
- **Las cuentas propias tienen audiencia suficiente para producir visitas medibles.** Es un supuesto de capacidad del canal, no del sistema: si resulta falso, la conclusión es que el canal propio no sustituye al buscador, no que el Kit Diario esté mal construido.
- **Existe cola larga en español que las Colecciones pueden capturar** y que las cuatro superficies actuales no capturan. Se falsa barato: tres o cuatro Colecciones publicadas y las consultas de entrada de Search Console lo dicen en semanas.
- **El vídeo corto trae visitantes que la imagen fija no trae.** Es el supuesto peor sostenido del contrato: se descartó en la v2 con un argumento que nadie ha refutado. Entra por decisión explícita de Héctor, con su propia puerta y como candidato preferente al recorte.
- **El sitio alcanza los Umbrales de Activación.** No es un supuesto nuevo: es SM-2 otra vez, ahora con el ingreso colgando de ella.
- **El PRD, la espina de arquitectura, `DESIGN.md`, `EXPERIENCE.md` y `DESPLIEGUE.md` siguen siendo los dueños de su contenido.** Este SPEC no lo duplica y se deriva de nuevo cuando alguno cambia; una regla escrita en dos sitios diverge en la primera revisión.

## Open Questions

- **¿Cuál es el umbral mínimo de una Colección?** El Tema usa 15, pero una Colección se lee de otra forma. Sale de curar las tres o cuatro primeras, no de decidirlo ahora. Bloquea el cierre de CAP-12, no su construcción.
- **¿Qué es el producto propio?** Lámina de alta resolución, antología en PDF o producto de recurrencia. Se decide al acercarse las 5.000 sesiones/mes, no antes.
- **¿Qué programa de afiliación concreto?** Depende de qué ediciones en dominio público que el Corpus cita siguen a la venta, y varias no tendrán ninguna.
- **¿Está libre la marca «Sabiduría de Bolsillo» en OEPM y EUIPO?** El dominio está contratado, que es cosa distinta. No bloquea el desarrollo, sí el gasto en identidad visual.
- **¿Con qué cadencia se siembra?** Cuántas Citas por sesión y cada cuánto es una decisión de operación que se toma con la primera sesión real hecha.
- **`EXPERIENCE.md` no conoce el Kit Diario ni la Página de Colección.** AD-19 obliga a que toda agregación use el mismo componente de tarjeta; si UX diseña la Colección con presentación propia, el diseño y la espina chocan en la primera historia. ¿Una pasada de `bmad-ux` acotada a la Página de Colección antes de construir CAP-12?
- **`AGENTS.md` declara «13 decisiones vinculantes» y ahora son 21**, y sus *Known pitfalls* no incluyen ninguno de los cuatro errores nuevos de la v3. Es el fichero que un agente lee primero y siempre. ¿Reejecutar `bmad-project-context`?
- **El addendum del PRD sigue delegando a Arquitectura dónde vive el material compuesto por adelantado**, que la espina ya resolvió: son las fijaciones de jornada de `corpus/portada.json`, sin segundo calendario. Una historia escrita desde ese párrafo construiría el calendario duplicado. ¿Reejecutar `bmad-prd` para retirar la delegación?
- **`sabiduriadebolsillo.com` sigue libre.** Registrarlo y redirigirlo al `.net` tiene fecha de caducidad: el nombre queda expuesto en cuanto el sitio se publique y empiece a circular por las cuentas.
