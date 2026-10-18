# Cotejo de entradas — PRD v8/v8.1 y addendum contra la espina v8

**Fecha:** 2026-10-18 · **Paso:** Finalize 2 de `bmad-architecture` · **Solo lectura** salvo este informe.

**Entradas:** `prds/prd-brainlySabiduria-2026-08-10/prd.md` (FR-3, FR-7…FR-12, FR-15, FR-17, FR-18, FR-20, FR-22, FR-38, FR-40, FR-47, FR-51, FR-52, FR-55, FR-56, NFR-1, NFR-2, NFR-5, NFR-7…NFR-9, NFR-11, §6.7, §7) y `addendum.md`, bloque de la v8, con «Decisiones de mecanismo diferidas — v8» y todo lo que nombra a Arquitectura.
**Contra:** `ARCHITECTURE-SPINE.md` en el árbol de trabajo (`git diff`, +199/−85) y `.memlog.md` (D-1…D-16).
**Contraste con el código, solo donde decide un hallazgo:** `src/components/Medicion.astro`, `src/components/Armazon.astro`, `src/pages/buscar.astro`, `src/lib/medicion.ts`, `tools/lib/cotejo.ts`, `medicion/`, `tests/e2e/`.

Las líneas citadas de la espina son las del fichero en el árbol de trabajo.

## Veredicto

Las once diferidas de Arquitectura tienen respuesta, y las cuatro bifurcaciones que decidió Héctor (D-1, D-2/2b, D-4, D-7, D-9) aterrizaron fieles. Lo que se cae no son decisiones: son **requisitos silenciosos que la redacción de un AD estrechó sin querer**. El más grave sale de una sola frase de AD-6 —el guion de medición «se carga en toda página que emite vista»—, que contra el código actual deja sin medición la búsqueda y la Obra que no se indexa. Hay uno alto, cuatro medios y una cola de bajos. Ninguno contradice una decisión de Héctor.

---

## Huecos — lo que no aterrizó o aterrizó distinto

### 1. ALTO — El guion de medición solo se carga «en toda página que emite vista»: se quedan sin medir la búsqueda y la Obra que no se indexa

- **Espina:** AD-6 v8, primera viñeta (l. 108): «se carga en toda página que emite vista. La vista la emite el fichero a partir de un `data-*` de la página». AD-13 v8, Lectura (l. 172): «en toda superficie que emite vista».
- **Entrada:**
  - FR-56: «Toda página que registra una vista **—también la vista de Obra de abajo—** registra además una lectura».
  - FR-56 / SM-13: «Pulsar un resultado se mide como salida interna de la búsqueda», y la salida de la búsqueda «la mide SM-13».
  - FR-8: la consulta sin resultados se registra para la curación.
  - SM-6: búsquedas asentadas, con los filtrados dentro.
  - SM-C4 deja escrito que «la búsqueda y la página 404 no emiten vista».
- **Qué se cae.** Hoy `Medicion.astro` se instala en **toda** página desde `Armazon.astro` (l. 160), con la vista como prop opcional. Por eso `buscar.astro:197` tiene `window.__medir` sin emitir vista. Leída al pie de la letra, la regla de la v8 quita el guion donde no hay vista:
  - **`/buscar/`** pierde `busqueda`, `busqueda-sin-resultados` y la salida `resultado`. SM-6, SM-13 y el registro de curación de FR-8 quedan a cero sin error, que es justo el «cero fabricado» que AD-13 v8 existe para impedir.
  - **La página 1 de una Obra que no se indexa** (unas 240 de 517) no emite vista en el código (`obra/[autor]/[slug]/[...page].astro:127`, `vista={emiteVista ? 'superficie' : undefined}`). Se queda sin `vista-de-obra`, sin lectura y sin salidas. Caen la familia Obra «entera, se indexe o no» de §7 y SM-4, la llegada por difusión a una Obra de SM-12 y el rebote de la Página de Obra con el que SM-C4 juzga la afiliación.
  - **Los Directorios** registran «vista y lectura como las demás superficies indexables» (FR-56). La espina no lo dice. Hoy cada página declara su vista a mano y la regla «vista de superficie sí y solo si producto» no tiene dueño en `superficies.ts`: entre las cuatro consecuencias de AD-17 no está. Es el filtro que se olvida, de AD-2.
  - **Dos vistas en una página.** La página 1 de una Obra indexable emite vista de superficie **y** `vista-de-obra` (FR-51). `Medicion.astro` lo impide por tipo («una sola prop, así que las dos vistas a la vez son imposibles por tipo»), y el «un `data-*`» de AD-6 no lo corrige.
- **Agravante.** AD-6 v8 hace que la búsqueda empaquetada importe `medicion`. Si en `/buscar/` no está el guion externo, la única forma de emitir es que la isla emita por su cuenta, con su propia copia del módulo. Eso rompe dos reglas de AD-13 a la vez: «una sola escucha delegada» y «las marcas de llegada tienen un solo lector».
- **Propuesta.** AD-6: el guion «se carga en toda página que emite algún evento del vocabulario». Lista explícita: las que emiten vista o `vista-de-obra`, `/buscar/`, y las páginas 2+ si sus salidas se registran (FR-56 dice que se registran, aunque no entren en ninguna continuación). La lectura acompaña a toda vista, también a `vista-de-obra`. El `data-*` declara el **conjunto** de vistas de la página. Y qué vista emite cada superficie se deriva de `superficies.ts` como quinta consecuencia de AD-17, no de una prop por página.

### 2. MEDIO-ALTO — La puerta de NFR-5 en el build reabre «retirar una Cita no puede tumbar el sitio»

- **Espina:** AD-11 v8, última viñeta (l. 154). `superficiesInalcanzables` rompe el build si una superficie queda a más de `MAX_SALTOS_DESDE_LA_PORTADA`, y «`revisar` se niega, por comodidad, a aprobar una Cita sin Tema».
- **Entrada:** NFR-5 condiciona los tres saltos de una Cita a «al menos **un Tema publicado**». FR-6: un Tema que cae por debajo de 15 «pasa a no publicado». FR-53 y AD-25 (l. 317): «retirar una Cita no puede tumbar el sitio (AD-18)».
- **Qué se cae.**
  - **El caso que tumba el sitio.** Se retira o se documenta-retira una Cita y un Tema baja de 15 a 14. Las Citas cuyo único Tema era ese pierden la vía de tres saltos. Si están en la página 2+ de su Autor y en una Obra de más de 50 Citas, por encima de la 50.ª, el build rompe en `astro:build:done` sobre una Cita que nadie tocó. Pasa a ser verdad justo lo que FR-53 descarta.
  - **El caso que la orden deja pasar.** La comodidad de `revisar` mira «sin Tema». La condición de NFR-5 es «sin Tema publicado», así que una Cita aprobada solo con un Tema nuevo de tres Citas pasa la orden y rompe el build.
- **Propuesta.** Que la puerta diga qué hace ante una causa lejana: o avisa y no rompe cuando la causa es una retirada, como la ficha sin Citas, o nombra también el Tema que cayó y su umbral. La comodidad de `revisar` pasa a «sin Tema **publicado**». La decisión de poner la puerta es de Héctor (D-4) y no se reabre: falta la regla que la compatibiliza con AD-18.

### 3. MEDIO — Sacar la vista a un fichero `defer` cambia el instrumento de la serie en vistas, y solo se declara el corte de la marca

- **Espina:** AD-13 v8, marcas (l. 175): «Contarlas una vez por llegada abre un corte en la serie de SM-8, con su fecha en `umbrales.ts`». AD-6 v8 (l. 108) mueve la vista del guion en línea a un `<script src defer>`.
- **Entrada:** FR-56: «Las vistas se siguen registrando como hasta ahora y no se reinterpretan». SM-8 «se sigue contando en vistas» y declara su corte solo por la marca.
- **Qué se cae.** Hoy la vista sale en línea, durante el análisis del HTML. Con un fichero diferido se pierde toda carga que se cierra antes de que el fichero llegue o se ejecute, y todo agente que ejecuta guion en línea pero no pide ficheros. La firma mecánica de Threads, que es el 38 % de las vistas de Cita, puede ser de esa clase. La serie de vistas —SM-8, la de la Historia 20.1 y la comparación de antes y después de la Épica 23— cambia de instrumento sin que conste.
- **Propuesta.** Declarar que el corte de SM-8 cubre las dos causas: la marca contada una vez y la vista emitida desde el fichero. Si las dos cosas pueden desplegarse por separado, declarar dos fechas.

### 4. MEDIO — Una búsqueda restaurada desde la caché de atrás y adelante vuelve a registrarse

- **Espina:** AD-13 v8 (l. 172): «`pageshow` con `persisted` cuenta como carga nueva». Y (l. 174): «una vez por estado distinto de texto y filtros **en cada carga**».
- **Entrada:** FR-56: «Volver a un estado ya registrado, **o que el navegador restaure la página**, no registra otra». El addendum, `busqueda`: «restaurar `/buscar/` desde la caché de atrás y adelante no la emite otra vez».
- **Qué se cae.** La excepción de la búsqueda no está en la espina. Quien aplique la regla general de la lectura —restaurar es una carga nueva— vuelve a emitir el estado restaurado al ocultarse la página, y SM-6 y SM-13 cuentan dos veces la misma consulta.
- **Propuesta.** Una cláusula en AD-13: la restauración es carga nueva para la lectura y **no** para la búsqueda, que conserva en memoria los estados ya emitidos.

### 5. MEDIO — El reflujo a 320 px de NFR-8 v8 no tiene dueño en el barrido

- **Espina:** AD-17 v8, último punto (l. 225). Lo único que la v8 añade al barrido son las etiquetas `wcag22aa`, y «los criterios de 2.2 sin regla en axe no se dan por comprobados por el barrido».
- **Entrada:** NFR-8 v8: ninguna superficie «obliga a desplazarse en horizontal a 320 px». §6.7: NFR-8, «ninguna superficie con desplazamiento horizontal a 320 px, con la cabecera nueva (26)».
- **Qué se cae.** El reflujo (1.4.10) no tiene regla en axe, y el barrido derivado de `superficies.ts` mide a 360 px (`tests/e2e/accesibilidad.spec.ts:107`). Solo `coleccion.spec.ts` mira `scrollWidth`. La cabecera nueva, que es lo que más riesgo trae a 320, no la comprueba nadie por derivación.
- **Propuesta.** AD-17: el barrido móvil derivado añade la comprobación de `scrollWidth` a 320 px en toda superficie pública.

### 6. MEDIO-BAJO — «Se comprueba sobre el sitio construido» de FR-52 no alcanza a los lectores nuevos

- **Espina:** AD-17 (l. 219). La comprobación de `astro:build:done` mira tres conjuntos: el sitemap, lo que no lleva `noindex` y el cuerpo de Pagefind. AD-11 v8 (l. 152) suma tres lectores de `rutasIndexables`: los resultados de Pagefind, las Obras de la portada y la marca de `vista-de-obra`.
- **Entrada:** FR-52 v8 incluye en la regla única las Obras de la portada y la vista de Obra («que dice si la página es indexable»), y dice: «Ninguno discrepa de otro, y se comprueba sobre el sitio construido».
- **Qué se cae.** Ninguna prueba sobre `dist/` exige que las seis Obras de la portada sean rutas sin `noindex`, ni que la marca `indexable` de la vista de Obra coincida con el `noindex` de la propia página. Si divergen, SM-11 lee mal la familia sin que falle nada.
- **Propuesta.** Ampliar la comprobación de AD-17 con esos dos lectores.

### 7. MEDIO-BAJO — Dos diferidas tienen respuesta, pero no exacta

- **La regla de rotación de las seis Obras.** AD-12 v8 (l. 162) dice «ventana de seis que avanza con el número de jornada» y «de seis Autores distintos mientras los haya». Quedan dos huecos:
  - No dice si la ventana avanza de uno en uno o de seis en seis. Dos builders dan portadas distintas el mismo día.
  - No cubre lo que FR-9 sí dice: «con menos Autores con Obras indexables, **una de cada uno**». Una ventana de seis sobre menos Autores repite Autor. Con la congelación de SM-11 el conjunto puede encoger.

  El addendum pedía «la regla exacta».
- **Qué valida la orden que corrige la clave de orden.** AD-1 v8 (l. 70) dice dónde vive la validación, la puerta del esquema exportado, pero no qué valida. Lo mínimo que hace falta para que el Directorio no reparta letras imposibles es que la clave produzca una inicial de A–Z más Ñ con la función hermana de AD-3. El addendum lo listaba entre las diferidas («qué valida está entre las diferidas»).

### 8. BAJO-MEDIO — La decisión del presupuesto desbloquea las Épicas 25 y 28 sin cifrarlo

- **Entrada:** el addendum, en «El presupuesto de guion», dice que la decisión «bloquea las Épicas 23, 25 y 28», y en compartición: «A Arquitectura solo le queda lo que ese cambio cuesta en guion en línea, que se suma al presupuesto».
- **Espina:** AD-6 v8 elige el fichero (D-1) y amplía `MAX_BYTES_DE_GUION` a toda superficie pública. No dice cuánto libera sacar la medición (unos 680 bytes) ni si cubre los disparadores de la Historia de Instagram y de «Más opciones…» en la Página de Cita y en la portada, que el addendum estimaba en unos 6.584 bytes antes de lo nuevo. Si no cabe, la Épica 25 vuelve a pedir subir el tope, que es la salida falsa que D-1 vino a cerrar.

### 9. BAJOS

- **La justificación de que los documentos no fechen la Obra es falsa en un caso.** AD-27 v8 (l. 351) dice: «la posición solo cambia con un fichero de Cita». Pero `documentosDeCita` (`tools/lib/cotejo.ts:222`) casa por prefijo con **todos** los documentos de la obra, y AD-23 da a una Cita en varios documentos la posición del primero. Recuperar una página nueva de una Obra paginada puede reordenar su listado sin tocar ningún fichero de Cita. Es raro: basta con escribir la excepción o meter en la relación los documentos de las Obras paginadas.
- **«Siguiente» de una Obra de una sola Cita.** AD-11 v8 (l. 153) dice «su primer Tema». FR-12 dice «el primero de sus Temas **publicados** —el primero en el orden en que la Cita los declara—».
- **La vía no es de un evento.** AD-13 v8 (l. 177) llama a `via` «columna nula fuera de su evento», pero viaja con la vista y la lectura de la llegada, como `origen` (lo dice el addendum). Conviene escribir de qué eventos es.
- **AD-6 se contradice.** Llama al de medición «el único guion externo que no es bajo demanda» (l. 108), pero los guiones empaquetados del filtro de los Directorios y de la búsqueda (l. 109) se cargan con la página, porque son los que insertan el campo. La lista cerrada sigue valiendo; la frase del «único», no.
- **Lo que deja de leerse.** AD-14 v8 dice «no hay punto final de lectura». AD-21 conserva «un paso del flujo diario de CI avisa cuando se cruza». Sin punto final, ese paso necesita una credencial de Cloudflare en Actions, y no se dice. Hoy los Umbrales siguen en sesiones (§6.7), así que no muerde todavía.
- **Deuda del addendum sin dueño:**
  - «Se mide cuántas fechas mueve una sesión de siembra antes de desplegar» (Fechas del sitemap y avisos).
  - La condición de la coletilla «cada una con su fuente» de la línea de cifras: solo se escribe con el censo vacío (FR-9, §5).

  Ninguna es invariante, pero ninguna tiene sitio.
- **Fuera del alcance PRD, para la puerta de UX.** EXPERIENCE.md ordena los Autores del selector de `/buscar/` «por su nombre tal como se lee, y no por la clave de orden». AD-3 v8 (l. 87) dice «ningún módulo ordena Autores por su cuenta». Una de las dos cede, o la espina nombra ese segundo orden.

---

## Lo que la espina decide contra la entrada, o más allá

| Decisión de la espina | Qué decía la entrada | Juicio |
|---|---|---|
| **La búsqueda es un guion empaquetado que importa `src/lib`** (AD-6 v8, D-9) | Addendum: «`busqueda.js` es una isla externa… recibe por `data-*`… como `imagen.js` recibe `data-tamano`» | Decisión de Héctor, coherente con AD-3 y AD-9. El addendum queda desfasado en ese punto. Que la isla importe `medicion` exige escribir que solo llama a `__medir` y nunca emite con su copia del módulo (ver hueco 1). |
| **`wrangler d1 migrations` con `migrations_dir`, y la primera migración solo con los `ALTER`** (AD-14 v8) | Addendum: el `ALTER` «en remoto (`wrangler d1 execute medicion --remote`), desde un fichero de migración versionado», con `esquema.sql` al día | Mejora el registro de lo aplicado y abre una trampa. Con `esquema.sql` como estado acumulado, una base nueva —local, de pruebas o recreada— que arranque desde él, como manda `DESPLIEGUE.md` §3, falla al aplicar la 0001 (`duplicate column`), y una que arranque solo con migraciones falla porque no hay tabla. Falta una migración 0000 con la línea de partida, o la regla de arranque. |
| **NFR-5 con puerta en el build** (AD-11 v8, D-4) | El addendum lo asignaba a la Épica 26 (`bmad-create-epics-and-stories`): «si NFR-5 para las Citas se comprueba en el build o se conserva otra vía» | Lo decidió Héctor y el PRD lo admite. Falta la compatibilidad con AD-18 (hueco 2). |
| **La familia `directorio` en las cinco series de `tools/`** (AD-24 v8, D-7) | FR-40 habla solo de la serie de indexación, y §6.7 deja las series de tráfico y demanda fuera de la v8 (`[NOTE FOR PM]`), pendientes de meter la familia Obra | Coherente con «la familia sale del censo». Toca tráfico y demanda antes de la pasada de métricas y deja la asimetría de que el Directorio cuente ahí antes que la Obra. Que se diga. |
| **Los Directorios entran en la relación de AD-27 «con todo lo que pintan»** | El addendum ofrecía también dejarlos fuera «con su motivo, como la portada» | Elección válida. Son dos URL que se refechan en cada siembra, y la espina lo acepta y lo dice. |
| **La Página de Obra no gana sus documentos en la relación** | FR-51: «si cuentan también los documentos… lo decide la arquitectura» | Decidido, con una justificación incompleta (bajos, primer punto). |
| **`MAX_BYTES_DE_GUION` en toda superficie pública, y `imagen.js` con tope propio** (AD-6 v8) | El PRD y el addendum pedían el tope del fichero de medición | Extensión sana. Convierte un guion externo sin tope en fallo de prueba. |
| **Como mucho una salida interna por carga** (AD-13 v8) | El addendum preguntaba «por lectura» | Equivale, porque la lectura es una por carga. Coherente con SM-3 («si una lectura pudiera aportar más de una salida…»). |

## Estado de las diferidas de Arquitectura del addendum

| Diferida | Dónde aterriza | Estado |
|---|---|---|
| Tiempo mínimo de lectura y salidas por lectura | AD-13 (l. 172–173), AD-9 (l. 134) | ✓ 8 s; una salida por carga |
| ¿Fichero o subir el tope? | AD-6 (l. 107–110), D-1 | ✓ Fichero. El presupuesto resultante no se cifra (hueco 8) y el alcance se queda corto (hueco 1) |
| Dónde se guarda cada dato y con qué columnas | AD-13 (l. 177), AD-14 (l. 186) | ✓ Una columna nula por dato y migraciones (trampa de base nueva, en la tabla de arriba) |
| Prueba sobre `dist/` de zonas | AD-13 (l. 173) | ✓ |
| Tipo de resultado de los Directorios y qué se ignora | AD-17 (l. 223) | ✓ |
| Autor de una dirección con `obra` y sin `autor` | AD-11 (l. 151), convención de dirección | ✓ Del mapa de rótulos |
| Directorios: ¿familia propia o fuera del censo? | AD-24 (l. 307), AD-17 (l. 222) | ✓ Familia propia |
| Cómo expresa AD-27 el criterio de FR-47 | AD-27 (l. 348–352) | ✓ Bajo en los documentos |
| Orden entre documentos y posición repetida | AD-23 (l. 290–291), Deferred (l. 516) | ✓ |
| Regla exacta de rotación de las seis Obras | AD-12 (l. 162) | ◐ No es exacta (hueco 7) |
| Qué valida la orden de la clave y si la revisión deja rastro | AD-1 (l. 69–72) | ◐ El rastro, sí. Qué valida, no (hueco 7) |
| *(De la Épica 26)* ¿NFR-5 en el build? | AD-11 (l. 154) | ✓ Lo tomó la espina con Héctor. Falta la compatibilidad con AD-18 (hueco 2) |

## Lo que aterrizó sin fisura

Están en la espina y casan con la entrada, sin cambios de sentido:

- **De AD-3:** el filtro de los Directorios como tercer consumidor de la normalización, y la Ñ en una función hermana.
- **De AD-11:** los ocho destacados con una sola regla, la de FR-8 tal como la dice; las opciones de filtro y `data-pagefind-filter` de una sola función; y los dos lectores que usan, a propósito, el conjunto publicable.
- **De AD-25:** el orden del libro con un solo dueño y su localizador compartido con el cotejo; la clave compuesta de `data-pagefind-sort`; el nombre de la ficha como interfaz pública del filtro; y la congelación que no alcanza a la navegación.
- **De AD-27:** la navegación de la Página de Cita fuera de la relación, y los listados con la ficha de Obra de sus Citas.
- **De AD-13:** las dos clases de destino y la marca de difusión con un solo lector, que la quita con `replaceState`.
- **De AD-7 y AD-8:** el 9:16 en el mismo generador, la columna 9:16 en `tramos.ts` y la prueba de los tramos con el pie de dominio.
- **De AD-20:** ningún Modelo en los Directorios ni en las entradas a la Obra, y la publicidad en `/buscar/` con filtros.
- **De AD-28:** el texto que se comparte de una Obra, compuesto en `atribucion.ts`.
- **De AD-14:** el orden de despliegue migración → receptor → sitio.
- **De AD-17:** WCAG 2.2 AA con `wcag22aa`.
- **De AD-9:** las fechas de SM-11 y del corte de SM-8 en `umbrales.ts`.
