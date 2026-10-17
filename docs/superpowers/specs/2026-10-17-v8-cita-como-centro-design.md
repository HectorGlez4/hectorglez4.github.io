---
title: 'La Cita como centro — la v8 de Sabiduría de Bolsillo'
created: 2026-10-17
status: >-
  diseño aprobado por Héctor el 2026-10-17 en cinco secciones; corregido tras una revisión
  adversarial (124 hallazgos, 108 confirmados); texto pendiente de su revisión
origen: >-
  Petición de Héctor del 2026-10-16 («preparar la próxima versión… cambiar la UX/UI para
  hacer mejor la página de inicio, poder buscar la lista de autores, buscar citas por obra,
  por autor o por tema y poder filtrar, guardar la cita del día, mucho más foco a la obra
  para trabajar luego en enlaces de afiliado, compartir directamente en Instagram Stories,
  Threads y Facebook, y que el usuario se quede y sea parte del crecimiento compartiendo»).
  Mapa de siete lectores en solo lectura (portada, búsqueda, Obra, compartir, medición con
  D1 leído el 16/10, restricciones, investigación externa) y un crítico de coherencia;
  doce preguntas de alcance y cinco secciones aprobadas una a una, con maquetas a 360 px;
  revisión por cinco lentes (PRD, espina, UX, código, viabilidad) con verificación escéptica.
---

# La Cita como centro — la v8 de Sabiduría de Bolsillo

Este documento es un diseño, no un artefacto BMad, y no sustituye a ninguno. Lo aprobado
aquí va a `bmad-prd`, `bmad-ux`, `bmad-architecture`, `bmad-spec` y
`bmad-create-epics-and-stories`, y de ahí a `bmad-build` historia a historia. Nada de lo
que sigue se escribe a mano en `_bmad-output/`. El inventario completo de lo que cada pasada
tiene que enmendar está en §10.

## 1. Lo que se pidió

Héctor pide preparar la próxima versión «ahora que estamos teniendo un poco de tráfico», con
ocho peticiones:

- **A.** Rediseñar la UX/UI para mejorar la portada.
- **B.** Poder buscar en la lista de Autores, que es larga.
- **C.** Buscar Citas por Obra, por Autor o por Tema, y poder filtrar.
- **D.** Conservar la Cita del Día.
- **E.** Mucho más protagonismo de la Obra, para trabajar después los enlaces de afiliación;
  que las Obras sean ya más visibles.
- **F.** Compartir las Citas directamente en Instagram Stories, Threads y Facebook.
- **G.** Que el visitante se quede.
- **H.** Que el visitante sea parte del crecimiento compartiendo.

## 2. De dónde parte (lecturas del 2026-10-16)

**El tráfico es menos de lo que parece.** D1 registra 3.695 vistas de Cita entre el
2026-09-04 y el 2026-10-16. El 38 % lleva `?de=threads` con una firma mecánica: unas 20
rutas al día y, en 283 de 587 pares ruta-jornada, exactamente «2 vistas con marca + 1 sin
marca». Otro 18 % son vistas sin marca en la misma ruta y jornada que una de Threads. El 44 %
restante son casi todo ráfagas de una vista por ruta en cientos de rutas (rastreadores que
ejecutan JavaScript). Fuera de eso, lo humano y orgánico ronda **una vista al día**. Del 11
al 16/10 la portada tuvo 19 vistas de superficie y las Páginas de Cita unas 266.

**Casi nadie comparte.** En seis semanas: 4 copiados (la misma Cita, el mismo día), 2
descargas de imagen, 2 comparticiones de imagen y ninguna de enlace. Instagram, TikTok, X y
Facebook no han traído ninguna visita marcada.

**Hoy no se puede medir G ni H.** No hay identificador de visita (AD-13, NFR-11), la vista
se emite al cargar y el Worker no distingue personas de máquinas. Lo que comparte un
visitante sale sin marca: la visita que trae entra como orgánica.

**El sitio en vivo está congelado desde el 2026-10-11.** Las ejecuciones de «Publicar»
fallan en las pruebas de documentos (`documento.test.ts`, `legibilidad.test.ts`). En vivo
hay 1.894 Citas, 65 Autores y 180 Obras (81 indexables); el árbol tiene unas 4.420 Citas,
135 Autores con Citas (de 171 fichas), 517 Obras con Citas (277 indexables), 24 Temas y 16
Colecciones. Es un arreglo aparte (§16), condición de que la v8 llegue a alguien.

**La Página de Cita y la portada no tienen sitio para guion nuevo.** La Página de Cita de
slug más largo lleva en producción 6.611 bytes de guion en línea frente a
`MAX_BYTES_DE_GUION = 6.656`: quedan 44, y unos 38 en el árbol, porque el slug va dentro de
la isla de copiar. Unos 680 son la medición. La portada, con las islas de la Cita del Día que
la v8 le añade, quedaría en unos 6.584 antes de lo nuevo. `public/islas/imagen.js` se carga
por `import()` al pulsar y no cuenta.

## 3. Decisiones tomadas el 2026-10-16 y 2026-10-17

1. **Foco: la Página de Cita es el centro.** La portada se mejora como superficie de retorno
   sin revocar FR-9 ni §10.
2. **La medición nueva va a la vez** que lo demás, en la primera épica, sin esperar a una
   línea base para construir.
3. **Lo que comparte un visitante lleva `?via=<destino>`**, una marca aparte de un conjunto
   cerrado. `?de=` sigue siendo solo de las cuentas propias.
4. **Compartir con botones directos, también en móvil:** Historia de Instagram, WhatsApp,
   Facebook y Threads siempre a la vista, y «Más opciones…».
5. **La imagen para historias es 1080×1920, de una sola plantilla (Papel)**, con
   «sabiduriadebolsillo.net» legible al pie. El dominio se añade también a la imagen
   cuadrada.
6. **La Obra gana protagonismo como navegación ya; la venta, después.** La afiliación sigue
   solo en la Página de Obra y apagada hasta juzgar SM-11.
7. **Filtros de búsqueda: Autor, Obra (dependiente del Autor) y Tema**, con todas las Obras
   como valor —también las que no se indexan—, «Buscar en esta…» y «Mostrar 30 más».
8. **Directorio `/autores/` por apellido**, con letras de salto, años, recuento y filtro al
   teclear; la clave de orden es un campo nuevo que escribe una orden.
9. **Retención: «Siguiente cita»** calculada en el build. No entran favoritas, boletín ni
   PWA.
10. **Se trocea por superficie:** medición, Página de Cita, directorios y búsqueda, portada.
11. **La Tarjeta de Obra va bajo la atribución** de la Cita, aunque en móvil las acciones de
    compartir caigan justo por debajo de la primera pantalla.
12. **Cabecera nueva: «Autores · Obras · Buscar».**
13. **La portada lleva una línea con las cifras del Corpus.**

## 4. Medir la lectura (Épica 23)

Va primero porque sin ella ninguna otra épica se puede juzgar. Todo respeta AD-13: vocabulario
cerrado, sin identificador, sin agente de usuario, sin referente, sin carga libre.

**Eventos nuevos.**

- **`lectura`.** Se emite una vez por carga en toda superficie que emite vista, cuando la
  página lleva visible un tiempo mínimo acumulado, o antes, a la primera interacción
  (`pointerdown`, `keydown`, `wheel`, `touchmove`; nunca el evento `scroll`, que disparan
  también la restauración del desplazamiento y los anclajes). El tiempo vive en
  `src/lib/umbrales.ts`; la propuesta es 8 segundos. Una página restaurada desde la caché de
  atrás y adelante (`pageshow` con `persisted`) cuenta como carga nueva y vuelve a emitirla.
  Separa la lectura de la carga: las precargas y los renderizadores que cierran al terminar
  no llegan.
- **`salida-interna`, con `zona`.** Se emite al pulsar un enlace interno marcado con una zona
  de un conjunto cerrado: `tarjeta-de-obra`, `siguiente`, `misma-obra`, `rutas-de-salida`,
  `atribucion`, `chip-de-tema`, `cita-del-dia`, `obras-de-portada`, `autores-de-portada`,
  `colecciones`, `resultado`, `directorio`, `paginacion`, `cabecera`. Una sola escucha
  delegada en el guion de medición; la zona se coteja antes de salir, como hoy `?de=`. Las
  aperturas en pestaña nueva (clic central, pulsación larga) no disparan `click` y no se
  miden, y se dice. Si se cuenta como mucho una salida por lectura lo fija
  `bmad-architecture`. Con ella, «1 − salidas internas / lecturas» es un rebote aproximado
  por superficie y se sabe qué enlace retiene.
- **`busqueda`.** Se emite **una vez por consulta asentada** —al enviar el formulario, al
  pulsar un resultado o al ocultarse la página, con el último estado—, nunca por pulsación ni
  por cada cambio de selector. Lleva el número de resultados en tramos (0, 1–9, 10–29, 30+) y
  qué dimensiones se usaron (Autor, Obra, Tema). **No lleva el texto de la consulta**: eso
  sigue siendo exclusivo de `busqueda-sin-resultados`, que pasa a seguir la misma regla de
  asentamiento. Un filtrado sin texto con cero resultados lo cuenta `busqueda` en el tramo 0;
  si además emite `busqueda-sin-resultados` lo decide `bmad-architecture` (propuesta: no,
  porque no hay consulta que registrar).
- **`vista-de-obra`.** Hoy emite vista de superficie solo la página 1 de una Obra indexable,
  y así sigue: `vista-de-superficie` es «sí y solo si producto» (Historia 20.1) y no cambia,
  ni cambia SM-8. Para medir también las Obras que no se indexan entra un evento nuevo,
  `vista-de-obra`, con una marca cerrada indexable / no indexable, que emite la página 1 de
  toda Obra. Las páginas 2+ siguen sin vista. `/autores/` y `/obras/`, que son de producto,
  emiten `vista-de-superficie`.

**Marca de difusión `?via=<destino>`.** Todo enlace que compone el sitio para que un
visitante lo comparta lleva `?via=` con un valor del conjunto cerrado de destinos (abajo).
El guion de medición lo lee y lo coteja igual que `?de=`; `via` y `de` se cotejan y se
guardan por separado, y una visita que traiga las dos cuenta en las dos series. Canónica,
`og:url` y `<link rel="canonical">` no cambian. **Una llegada es una `lectura` con `via`**,
no una vista, para no contar máquinas. Métrica nueva, la **difusión**: lecturas con `via`
entre comparticiones, por destino (§12). FR-18 ya pedía que «el enlace compartido lleva
marca de origen» y la Historia 10.3 hizo lo contrario: `?via=` es esa marca, y la enmienda de
FR-22 no la duplica.

**Destinos.** `src/lib/destinos.ts` separa dos clases, y `DESTINOS_VALIDOS` es su unión más
`opaco`:

- **destinos de enlace**, con constructor en `src/lib/compartir.ts`: whatsapp, telegram, x,
  correo y, nuevos, `facebook` y `threads`. X pasa a `x.com/intent/tweet`, la ruta
  documentada;
- **el destino de imagen** `instagram-historia`, sin constructor de enlace. Nombra **el botón
  que se pulsó**, no la aplicación que eligió el visitante en la hoja: la Web Share API no lo
  dice. Es una excepción declarada a FR-20 («opaco cuando el visitante usó la Hoja del
  Sistema»), que sigue valiendo para «Más opciones…».

El mismo conjunto sirve para el destino de una compartición y para `via`: un solo dueño. La
invariante de `tests/unit/comparticion.test.ts:82` cambia con ello.

**Dónde se guarda cada dato nuevo.** Lo decide `bmad-architecture`: `via`, la `zona` de
`salida-interna`, el tramo y las dimensiones de `busqueda` y la marca de `vista-de-obra`.
Cada uno toma valores de un conjunto cerrado declarado en `src/lib/medicion.ts`, se coteja en
`medicion/receptor.ts` y es nulo fuera de su evento, como `origen` y `destino`. Hoy el
receptor descarta todo campo que no esté en su registro, así que sin esto llegarían a nulo
sin ningún error.

**Orden de despliegue: una migración.** Un evento nuevo no cambia la tabla, pero una columna
sí, y `esquema.sql` es `CREATE TABLE IF NOT EXISTS`: volver a ejecutarlo no migra una tabla
existente. El orden es:

1. `ALTER TABLE eventos ADD COLUMN …` en remoto (`npx wrangler d1 execute medicion --remote`),
   desde un fichero de migración versionado en `medicion/`, y `esquema.sql` al día;
2. el Worker, comprobado con la baliza manual de `DESPLIEGUE.md`;
3. el sitio.

Un Worker que escribe columnas que D1 aún no tiene pierde cada evento en silencio (el `catch`
de `worker.ts`). `DESPLIEGUE.md` §3 gana este paso, y su «No hay migración» deja de valer.

**El presupuesto de guion.** Nada de esto cabe en 44 bytes, y la decisión cubre la Página de
Cita, la portada (Épica 28) y la Página de Obra. Lo decide `bmad-architecture` (AD-6, AD-13)
entre:

- **(recomendada)** sacar el guion de medición a un `<script src defer>` que se carga en toda
  página cuando hay `MEDICION_ENDPOINT`. **No tiene el precedente de `imagen.js`**, que se pide
  al pulsar: este se descarga en cada carga, así que enmienda AD-6 (sería la única isla que
  no es bajo demanda) y el criterio de la Historia 2.1 («la página no descarga ningún fichero
  de script»). El fichero lo genera el build desde `src/lib/medicion.ts` —un endpoint
  `.js.ts`, no una copia en `public/`—, para que el vocabulario y el punto final se sigan
  importando y no copiando (AD-13). La vista la emite el propio fichero a partir de un
  `data-*` de la página, y las islas toleran que `__medir` llegue después. Como
  `bytesDeGuionEnLinea` cuenta 0 un `<script src>`, el fichero lleva **su propio tope** con
  nombre en `umbrales.ts`, para que el guion que más ha crecido no quede sin vigilar.
- subir `MAX_BYTES_DE_GUION` en un diff visible.

## 5. La Página de Cita: la Obra se ve y la Cita sigue (Épica 24)

La Cita sigue en la primera pantalla a 360×640 (FR-1). El orden de la página pasa a ser:

1. **El Bloque de Cita**, con la atribución de siempre (Autor subrayado, título de la Obra en
   tinta y subrayado, E2).
2. **La Tarjeta de Obra**, un componente nuevo y único (`TarjetaDeObra.astro`):
   - rótulo «De la obra»;
   - el título de la Obra resuelta (`cita.obra.titulo`), en la sans: la serif sigue
     reservada a Cita, Autor, Tema y Colección;
   - «{Autor} · {año de la Obra} · {n} citas», en singular «1 cita». El año es el de la Obra
     resuelta: si sus Citas declaran años discrepantes, va sin año, nunca se elige uno. Sin
     traductor. Los puntos medios van ocultos al lector de pantalla, que oye una coma, como
     en la Cabecera de Obra;
   - **«Siguiente cita de esta obra →»**: enlace fijo a la Cita que sigue a esta en el orden
     del listado de la Página de Obra, dando la vuelta al final. Ese orden se calcula hoy en
     línea dentro del `getStaticPaths` de la Página de Obra; pasa a una función compartida
     para que haya un solo dueño. Si la Obra tiene una sola Cita, el enlace es «Siguiente
     cita de {Tema} →», por el orden del listado de su primer Tema publicado; sin ninguno, no
     hay «Siguiente»;
   - **«Ver la obra y dónde leerla →»** si la Obra tiene dónde leerse (alguna Cita cotejada);
     si no, **«Ver la obra →»** (hoy 7 Obras, entre ellas «Campos de Castilla»), para no
     prometer lo que el bloque no da (FR-54).
   Las 4 Citas sin Obra (forma canónica vacía) no llevan tarjeta ni «Siguiente». Aceptado:
   con la tarjeta arriba, en móvil Copiar, Imagen y compartir quedan justo por debajo de la
   primera pantalla.
3. **La Línea de la Fuente**, como hoy. Queda por decidir si va **antes** de la Tarjeta de
   Obra, pegada a la Atribución que acredita (§14).
4. **Copiar e Imagen**, y el bloque de compartir (§6).
5. **«De la misma obra»**: hasta 3 Tarjetas de Cita de la misma Obra, sin repetir la actual
   ni la «siguiente», elegidas con el reparto a pasos iguales de `citasRelacionadas` sobre el
   orden del listado de la Obra, y «Las {n} citas de {título} →». Las tarjetas van sin Autor
   ni título de Obra. Se omite si, quitadas la actual y la siguiente, no queda ninguna (las
   87 Obras de 2 Citas). FR-12 ya decía que la relación se deriva de Autor, Obra y Tema; el
   código no miraba la Obra.
6. **«Más de {Autor}»**: hasta `MAX_CITAS_RELACIONADAS` (4) Tarjetas de Cita sin Autor y con
   el título de su Obra, sin repetir la actual, la siguiente ni las de la misma Obra, y «Las
   {n} citas de {Autor} →». Se omite si no queda ninguna.
7. **Temas**, como hoy.

Todo lo nuevo va fuera del cuerpo de Pagefind y sin guion: son enlaces compuestos en el
build (AD-5, AD-14), y dos construcciones del mismo commit dan el mismo `dist/`. El orden de
tabulación pasa a ser contenido, Tarjeta de Obra, acciones y rutas de salida.

**Fuera de la Página de Cita:**

- **La Tarjeta de Cita** de los listados de Tema, Colección y Autor, y la de «Más de {Autor}»,
  lleva el título de la Obra como texto (junto al Autor donde lo hay), nunca como segundo
  enlace: toda la tarjeta ya enlaza a la Cita. En la Página de Obra y en «De la misma obra»,
  donde sería redundante, no lo lleva. Un solo componente (AD-19).
- **La página 1 de la Página de Obra** gana en su cabecera un salto «Dónde leer esta obra ↓» a
  `#donde-leer-esta-obra`, que ya existe. Las páginas 2+ no lo llevan: no tienen ese bloque.
  El bloque no se mueve (FR-54) y la afiliación sigue donde está y apagada.

## 6. Compartir donde se publica (Épica 25)

**El bloque «Compartir en».** Cuatro botones a la vista, en este orden, y «Más opciones…»:

- **Historia de Instagram.** Entre el toque que comparte y `navigator.share({ files })` no hay
  **ninguna espera** de red ni de composición: `navigator.share` exige una activación del
  usuario reciente y la consume, y una espera larga (el `import()` de `imagen.js`, componer
  2 Mpx, `toBlob`) puede agotarla, sobre todo en WebKit. Por eso `imagen.js` cargado, el 9:16
  compuesto en la plantilla Papel y el `File` hecho ya están listos antes de ese toque: o en
  dos toques, como la Imagen de hoy (el primero abre el diálogo, carga y previsualiza; el
  segundo, «Compartir en la historia», copia y comparte), o preparándolo antes del toque sin
  descargar el generador hasta que haya intención (AD-6). Lo decide `bmad-ux`. El orden es
  `navigator.clipboard.writeText(canónica + ?via=instagram-historia)` y después
  `navigator.share({ files })`, sin texto ni URL, que es lo que hace que Instagram ofrezca la
  historia. Los estados:
  - compartido: «Enlace copiado: pégalo en el sticker Enlace.»;
  - sin hoja con ficheros (el navegador de la app de Facebook en Android) o con
    `NotAllowedError`, que no es una cancelación: la imagen se descarga y se anuncia «La
    imagen se ha descargado. Enlace copiado: pégalo en el sticker Enlace.»;
  - cancelación (`AbortError`): nada, y no se registra nada;
  - si el portapapeles falla, el mensaje no dice «copiado» y revela el enlace en un campo
    seleccionable, el mismo respaldo que Copiar;
  - si el generador no llega, lo dice en una frase y ofrece copiar el texto (EXPERIENCE:219);
    pulsar de nuevo lo vuelve a intentar.
  Todo se anuncia por una región `role="status"` presente y vacía desde la carga, dentro del
  `<dialog>` si se anuncia con él abierto (convención de AGENTS.md). Solo existe para Citas
  de hasta `MAX_CARACTERES_IMAGEN` (FR-10); por encima, el bloque lleva los otros tres. En
  escritorio, donde no hay historias, ver §14.
- **WhatsApp** (`wa.me/?text=`), **Facebook** (`facebook.com/sharer/sharer.php?u=`, sin texto:
  la tarjeta sale de `og:title`, `og:description` y `og:image`, excepción declarada a FR-18
  «nunca solo la URL desnuda») y **Threads** (`threads.com/intent/post?text=&url=`). Son
  enlaces compuestos en el build con `?via=` en la URL compartida y abren en pestaña nueva con
  `AVISO_DE_PESTAÑA_NUEVA`.
- **Más opciones…**, con nombre accesible «Más opciones para compartir». Con hoja del sistema,
  la abre con la canónica y `?via=opaco`, el valor del conjunto para la hoja; sin ella,
  despliega Telegram, X y Correo.

Cada control conserva el nombre accesible «Compartir en {destino}» (`rotuloDeDestino`), con
el aviso de pestaña nueva dentro cuando abre una; si el texto visible bajo el rótulo es solo
el destino, el prefijo va en `.solo-para-lectores` (el defecto que corrigió la 22.10). Son
**siete destinos nombrados**, cuatro a la vista y tres tras «Más opciones…», más la hoja: por
debajo del anti-patrón de ocho de EXPERIENCE:340. Sin iconos (DESIGN:213): los botones son
texto, con zona de toque de 44 px.

**Lo que esto cuesta en guion.** La isla de compartir deja de esconder los destinos cuando hay
hoja (`compartir-enlace.spec.ts:27-33` y `:93-98` cambian). Los enlaces directos no llevan
guion propio —la isla registra el destino al pulsar—, pero el disparador de la Historia y el
de «Más opciones…» sí son guion en línea. Todo lo que no sea el disparador va a `imagen.js`, y
lo que quede en línea se suma al presupuesto de §4.

**Las imágenes.**

- **9:16, 1080×1920, una plantilla (Papel).** Su cuerpo tipográfico es una columna nueva de
  `src/lib/tramos.ts` (AD-8), que llega a `imagen.js` por un atributo `data-*` porque la isla
  no puede importar de `src/`. Ausencia antes que mutilación: lo que no cabe no se encoge.
  FR-17 se enmienda: la Historia comparte sin elección de plantilla, excepción declarada a
  «la elección de plantilla precede a compartir».
- **El dominio en las dos.** «sabiduriadebolsillo.net» legible al pie, junto a la marca. En
  una historia es el único enlace que sobrevive si nadie pone el sticker.
- La cuadrada conserva sus tres plantillas. El Kit gana también el 9:16 para el canal propio.

**Compartir en la Página de Obra.** El mismo bloque de enlaces (WhatsApp, Facebook, Threads,
Más opciones…), solo en la página 1 —FR-51 deja las 2+ con título, Autor y listado— y sin
Historia de Instagram: no hay Imagen de Obra. Es **una isla, la primera de la Página de Obra**:
AD-6 la declara y, como la página admite la afiliación, su guion cuenta en el tope que mide
`ingreso-construido.test.ts`. La isla de hoy está escrita para una sola Cita (`cita` y
`autor`, `textoParaCompartir`, un solo `[data-compartir]`): se generaliza. El texto propuesto
en WhatsApp y Threads es «{título}, de {Autor}», compuesto en `src/lib/atribucion.ts`; su
lugar en la página, en §14. La vista previa es la Tarjeta Social de Obra que ya existe.

**Medición.** `comparticion-de-imagen` con destino `instagram-historia`;
`descarga-de-imagen` cuando cae en la descarga; `comparticion-de-enlace` con su destino al
pulsar cada enlace; `opaco` para «Más opciones…» con hoja.

**Matriz de dispositivos.** El CI no corre e2e y nada de esto se ve en un navegador de
escritorio, así que la épica cierra con una prueba manual anotada en `DESPLIEGUE.md`: iPhone
(Safari), Android (Chrome) y los navegadores dentro de las apps de Facebook, Instagram y
Threads en los dos sistemas. Se comprueba: que Instagram ofrece «Historia» al recibir solo el
fichero; que `share()` y el portapapeles conservan la activación en iOS Safari y en los
WebView; que `writeText` funciona en esos navegadores; que la descarga de un `blob` funciona
en un WebView y adónde va en iOS (Archivos, no Fotos); que `facebook.com/sharer` se abre
dentro del navegador de la app de Facebook; y si `?via=` sobrevive al clic de una tarjeta de
Facebook.

## 7. Directorios y cabecera (Épica 26)

**La cabecera** pasa de «marca · Buscar» a «Sabiduría de Bolsillo · Autores · Obras · Buscar»
en todas las páginas. Reabre UX-DR29. **No cabe en una fila a 360 px** con los tokens de hoy
(medido: la marca 181 px y los tres enlaces con su zona de toque y su separación hasta 448 px,
frente a 320 útiles). `bmad-ux` fija la disposición —por ejemplo, la marca en una fila y los
tres enlaces en otra—, con 44 px de zona de toque, sin desplazamiento horizontal a 320 px
(WCAG 1.4.10, NFR-9) y con los puntos medios ocultos al lector de pantalla. Los tres enlaces
llevan la zona `cabecera`.

**`/autores/`**, superficie de producto nueva, declarada en `src/lib/superficies.ts`:

- de la A a la Z por **apellido**, con letras de salto (solo las que tienen Autores);
- cada fila: el nombre (en serif, como en la lista de Autores de la portada), los años si
  constan y «{n} citas», en singular «1 cita»;
- un campo que filtra la lista al teclear, que inserta la isla: sin guion no hay campo, la
  lista está entera y las letras funcionan. Normaliza acentos y mayúsculas como el campo de
  búsqueda y anuncia «{n} autores» por una región `role="status"` presente y vacía desde la
  carga.

**La clave de orden** es un campo nuevo de la ficha de Autor, `ordenAlfabetico`. **No se
teclea:** la escribe `tools/autor.ts crear` al dar de alta, con una clave propuesta, y una
orden de `tools/autor.ts` propone en una pasada la de los 171 Autores. Héctor revisa después
los casos que no tienen apellido o no se ordenan por él (Séneca, Marco Aurelio, Sor Juana,
nombres compuestos); **esa revisión no bloquea nada**. El build rompe solo si un Autor
publicado no tiene clave, nunca por no estar revisada, así que la siembra de un agente no se
para. Los Autores de prueba (`AUTOR_VALIDO` de `tests/unit/ayuda/construir.ts` y los demás)
la llevan.

**`/obras/`**, superficie de producto nueva: las 517 Obras con Citas, agrupadas por Autor en
el mismo orden, cada una con su título (sans), año si lo tiene y «{n} citas», y el mismo
filtro al teclear («{n} obras»). Enlaza también a las Obras que no se indexan, que son
`noindex, follow`.

**Lo que trae ser de producto.** En `superficies.ts` el carácter de producto da a la vez
sitemap, ausencia de `noindex` y `data-pagefind-body`, e `integraciones/indexables.ts` rompe
el build si esos tres conjuntos no coinciden: **los dos directorios entran en Pagefind**. Para
que no respondan a cada nombre de Autor o título de Obra que contienen, llevan un tipo de
resultado nuevo en `tipoDeResultado.ts` (sin él saldrían rotulados «Cita») y su listado va en
`data-pagefind-ignore`: se encuentran por su título. Además declaran `og:image`, como toda
página del sitemap; `rutasPublicadas` y `rutasIndexables` las enumeran (AD-11), y el censo de
las series (indexación, tráfico, demanda, rastreo, canal) les da familia o las excluye por su
nombre (AD-24).

No hace falta `/temas/` (los 24 caben en la portada) ni `/colecciones/` (las 16 se listan en
ella, FR-26).

**NFR-5 se sigue cumpliendo.** Desde la portada, un Autor queda a 2 saltos (cabecera →
`/autores/` → Autor) y una Obra también (cabecera → `/obras/` → Obra). Toda Cita sigue a 3
saltos por Tema → página N → Cita **mientras tenga al menos un Tema publicado**: hoy todas lo
tienen (0 de 4.420 sin Tema) y la paginación pinta todos los números, pero ninguna puerta lo
impone (`revisar` admite aprobar sin `--temas`), y por `/autores/` una Cita de la página 2+ de
su Autor queda a 4. La Épica 26 decide si esa condición se comprueba en el build o se conserva
otra vía de 3 saltos. Lo vigilan `tests/unit/publicable-y-alcanzable.test.ts`, en CI, y
`seo.spec.ts`, en local.

## 8. Buscar con filtros (Épica 27)

**Facetas de Pagefind en `/buscar/`.** La Página de Cita declara `data-pagefind-filter` de
**autor**, **obra** y **tema** (uno por cada Tema de la Cita). El valor de obra es el nombre de
la ficha de la Obra resuelta (`cita.obra.nombre`, `{slug-autor}--{slug-obra}`), que ya la liga
a su Autor —dos Autores con unas «Odas» no se mezclan—; su rótulo visible es
`cita.obra.titulo`, nunca `procedencia.obra`. Como Pagefind no guarda rótulos para los
valores, `busqueda.js` recibe del build un mapa nombre → título. La Cita gana también el
metadato `autor` para pintarlo bajo cada resultado, y un `data-pagefind-sort` para que
`search(null, …)` y «Mostrar 30 más» recorran las Citas en un orden estable.

**La interfaz.** Bajo el campo, tres selectores nativos: Autor; Obra, que aparece al elegir
Autor y lista solo las suyas con su recuento; y Tema. Las opciones de Autor y Tema se componen
en el build desde `publicado.ts`, con la misma función que escribe `data-pagefind-filter`, para
no tener dos orígenes; los recuentos de Obra llegan de `pagefind.filters()`, que descarga los
~41 KB de filtros (medido sobre una copia de `dist/`) solo al elegir Autor, filtrar o buscar,
o cuando la URL trae estado. Se puede filtrar sin escribir (`search(null, filtros)`). El
estado vive en la URL (`?q=&autor=&obra=&tema=`): una búsqueda se comparte y «atrás»
funciona. El recuento se anuncia en la región `role="status"`, y el corte de 30 pasa a
«Mostrar 30 más», sin desplazamiento infinito. **Con un filtro activo solo hay resultados de
Cita**, y se dice; los de Autor, Obra, Tema y Colección de FR-7 son los de la búsqueda sin
filtro.

**El guion** va a una isla externa, `public/islas/busqueda.js`: a `/buscar/` le queda un margen
de unos 1.000 bytes. Recibe por `data-*` del marcado, compuestos desde `src/lib`, la tabla de
rótulos de `tipoDeResultado.ts`, el tipo por omisión, los nombres de evento y los tramos, como
`imagen.js` recibe `data-tamano`: nunca copiados.

**«Buscar en esta obra / en {Autor} / en este Tema».** Un formulario GET en la página 1 de
Obra, Autor y Tema, con el filtro en un campo oculto, que envía a `/buscar/`. El formulario no
añade guion: las páginas de Autor y Tema no reciben isla nueva, y la de Obra solo la de
compartir (§6). No se crea ninguna combinación indexable: `/buscar/` es de servicio (AD-17,
AD-19).

**Sin guion,** `/buscar/` dice en su marcado estático que el filtrado necesita JavaScript y
enlaza a `/autores/` y `/obras/`. No puede enlazar a lo elegido: una página estática no lee su
URL sin guion. Quien llegó desde «Buscar en esta…» vuelve con «atrás» a la página que ya lista
sus Citas.

**«Destacados»** de la búsqueda sin resultados (FR-8): los 8 Autores con más Citas, no los 8
primeros del alfabeto como hoy.

Los resultados de tipo Obra siguen siendo solo los de las Obras indexables (FR-7, FR-52): lo
que entra para todas las Obras es el **valor del filtro**, que vive en la Cita indexada, no la
página de la Obra. FR-52 se enmienda en ese sentido.

## 9. La portada de retorno (Épica 28)

Sigue siendo «identidad y retorno»: FR-9 y §10 se enmiendan para admitir el campo de búsqueda
y las acciones sobre la Cita del Día, no se revocan. De arriba abajo:

1. **La cabecera nueva.**
2. **Una línea con las cifras del Corpus**, compuesta en el build desde `publicado.ts`
   (AD-11): «{n} citas de {m} autores; {k} cotejadas con el texto de su fuente.», con k
   contado por `esCitaDocumentada`. **No dice «cada una con su fuente»**: hoy 21 Citas
   publicadas no tienen documento (el censo de `corpus/pendientes-de-cotejo.yml`), y 11 de las
   16 aptas para portada están entre ellas. Esa coletilla solo se podrá componer cuando el
   censo quede vacío (§5 del PRD, EXPERIENCE:341). Es un hecho del Corpus, no un contador del
   visitante; EXPERIENCE:54 se aclara en ese sentido. La redacción final la fija `bmad-ux`.
3. **El campo de búsqueda**, un formulario GET a `/buscar/?q=` sin guion. EXPERIENCE:33 y §10
   piden acceso a la búsqueda, que hoy da el enlace de la cabecera; se enmiendan para que en
   la portada ese acceso sea un campo.
4. **La cita de hoy**, con la Tarjeta de Obra y las acciones: Copiar, Imagen y el bloque de
   compartir de §6, con la canónica de la Cita. Son las únicas islas de la portada, y entran
   en el mismo presupuesto de guion que la Página de Cita, con la medición y, encendidas, las
   donaciones (lo miden `medicion.test.ts` e `ingreso-construido.test.ts`): la decisión de §4
   tiene que cubrir a las dos.
5. **Obras**: seis Obras indexables, una por Autor, que rotan con la jornada del build como la
   Cita del Día (AD-12), y «Las 517 obras →».
6. **Temas**: los 24 chips, como hoy.
7. **Colecciones**: las 16, cada una con su criterio en una línea, para que dejen de parecer
   Temas (DESIGN:233).
8. **Autores**: los 8 con más Citas, en serif, y «Los 135 autores, de la A a la Z →». La
   lista de unos 5.900 px sale de la portada.

**La Cita del Día** conserva sus reglas: jornada del build, rondas por Autor (21.1) y
fijaciones de `corpus/portada.json`. Su punto débil son las **16 aptas**, que se repiten cada
16 días; llevarlas a 120 o más es la 21.2, que espera el tachado de Héctor. Es lo que más
retorno da por hora suya.

## 10. Inventario de enmiendas

| Artefacto | Qué cambia |
|---|---|
| **PRD** (`bmad-prd`) | **§4.9 y UJ-2** (la restricción «en escritorio no hay hoja del sistema» y el caso límite: la hoja existe donde el navegador la ofrece); **FR-7** (filtros, «Buscar en esta…»); **FR-8** (destacados por Citas; el filtrado sin resultados); **FR-9 y §10** (campo de búsqueda, acciones sobre la Cita del Día, cabecera, dos superficies nuevas); **FR-10 y FR-11** (formato 9:16 de una plantilla, dominio en la imagen); **FR-12** («De la misma obra», «Siguiente», Tarjeta de Obra); **FR-15 y el modelo de datos del addendum** (Autor: `ordenAlfabetico`, obligatorio para publicar y escrito por una orden); **FR-17** (la Historia comparte sin elección de plantilla y en escritorio no muestra aviso de incompatibilidad); **FR-18** (destinos nombrados visibles también donde hay hoja; Facebook comparte solo la URL y su Tarjeta Social hace de texto; la «marca de origen» de lo compartido es `?via=`; la Página de Obra también se comparte, con texto propuesto); **FR-20 y el glosario** (Destino de Compartición: un botón nombrado registra su botón aunque pase por la hoja; `opaco` queda para «Más opciones…»; siete destinos nombrados y `opaco`); **FR-22** (`?de=` solo cuentas propias, `?via=` para visitantes); **FR-51** (salto a «Dónde leer» y bloque de compartir en la página 1; `vista-de-obra`); **FR-52** (una Obra no indexable puede ser valor de filtro, no resultado); **NFR-1** (`/autores/` y `/obras/` entre las superficies indexables) y **un FR nuevo para los dos directorios** (contenido, orden, filtro, `/obras/` enlaza también las no indexables); **SM-3 y SM-4** (aproximación por `lectura` y `salida-interna`); **SM-5, SM-7 y SM-C3** (sobre lecturas, solo acciones de la Página de Cita); **SM-6** (denominador `busqueda`, incluye filtrados) y la métrica nueva de búsqueda seguida; la métrica nueva de **difusión**; **SM-8 y la Historia 20.1** no cambian (`vista-de-obra` es otro evento) |
| **Decisiones del 04/10** (borrador §2, no BMad) | Se revocan las condiciones de reapertura de Facebook como destino, de «siguiente» y de `salida-interna` |
| **UX** (`bmad-ux`) | **EXPERIENCE:** :26-39 (filas de `/autores/` y `/obras/` en la arquitectura de la información, :30 y :34 con sus orígenes nuevos, y el UJ que alcanza cada directorio), :33, :54 y :341 (la línea de cifras no afirma el cotejo), :76-82 (columna «Imagen 9:16»), :94 (cabecera), :102 (la Línea de la Fuente y la Tarjeta de Obra), :103-107 (Copiar, Imagen y el Diálogo también en la portada; destinos visibles con hoja), :113, :116 (Chip de Colección con criterio), :136 (compartir en la Página de Obra), :140 (Cabecera de Obra con salto), :167-168 (filtros; Autor bajo el resultado de Cita), :246 (destinos a la vista y «Más opciones…»), :264 (orden de tabulación de la Página de Cita); **DESIGN:** :138 (el siena en la primera pantalla, y el color de Autores y Obras en la cabecera), :217 (cabecera), :223 y :224 (la Línea de la Fuente y las acciones de la Página de Cita), :225 (Papel en 9:16 y el dominio al pie de las dos), :226 (las hermanas pasan a Tarjetas), :230 (Tarjeta de Cita con Obra), :233, :248 (Cabecera de Obra), :256-257 (campo de búsqueda en la portada; Autor bajo el resultado); **UX-DR11, UX-DR17, UX-DR19, UX-DR22, UX-DR24, UX-DR29, UX-DR34, UX-DR38, UX-DR53**; componentes nuevos: Tarjeta de Obra, bloque «Compartir en», directorio, selectores de filtro; dónde va la marca en la portada para no repetirla dos veces en la primera pantalla |
| **Arquitectura** (`bmad-architecture`) | **AD-6** (islas nuevas declaradas y contadas: compartir en la Página de Obra y en la portada, Copiar e Imagen en la portada, Historia de Instagram, el filtro de `/autores/` y `/obras/`, `busqueda.js`, y el sitio de la medición; si sale a un fichero, la única isla que no es bajo demanda, con su propio tope); **AD-8** (columna 9:16 en `tramos.ts`); **AD-11** (`rutasPublicadas` y `rutasIndexables` enumeran los directorios, que derivan de `autoresPublicados` y `obrasPublicadas`); **AD-13** (eventos `lectura`, `salida-interna`, `busqueda`, `vista-de-obra`; zonas; `via`; destinos de enlace y de imagen; columnas nuevas en D1 y su migración); **AD-17** (`/autores/` y `/obras/`: su tipo de resultado en Pagefind y qué parte de su lista se ignora); **AD-19** (la Tarjeta de Cita con Obra); **AD-24** (si los directorios son una familia de las series o quedan fuera del censo con exclusión escrita); **AD-27** (`relacionDeSuperficies` de `tools/lib/cambios.ts`: los listados de Tema, Colección y Autor se componen también con la ficha de Obra de sus Citas; `/autores/` y `/obras/` se declaran en la relación o se dejan fuera con su motivo, como la portada; y se decide si los recuentos, «Siguiente», «De la misma obra» y «Más de {Autor}» entran en la relación de la Página de Cita —incluirlos refecha y avisa por IndexNow todas las Páginas de Cita de un Autor con cada Cita nueva suya, 308 en el caso de Unamuno— o se quitan los recuentos de los enlaces de salida para que la Página de Cita no dependa de todo el Autor) |
| **SPEC** (`bmad-spec`) | Rederivar a la v8 con las CAP afectadas (búsqueda, Página de Cita, compartir, portada, medición) y dos nuevas (directorios) |
| **Épicas** (`bmad-create-epics-and-stories`) | Épicas 23 a 28 (§11); Historia 2.1 («la página no descarga ningún fichero de script», si la medición sale a un fichero); Historia 4.1 (de «no envía JavaScript» a «solo las islas declaradas») |
| **Pruebas** | `pagina-de-cita.spec.ts`: :133-170 (de «cero ficheros de script» a «solo los guiones externos declarados»), :195-202 (la cabecera con 4 enlaces: `/`, `/autores/`, `/obras/`, `/buscar/`), :246-272 (la serif admitida en el fragmento de la Tarjeta de Cita), :282-306 (descontar el texto ajeno de las Tarjetas); `portada.spec.ts:83-87` (h1 = marca, si la marca se mueve); `accesibilidad.spec.ts:348` (sin desplazamiento horizontal) y la cabecera a 320 px; `compartir-enlace.spec.ts`: :27-33 y :93-98 (los destinos ya no se esconden con hoja), :121-131 (lo compartido lleva `?via=`, nunca `?de=`); `rutas-de-salida.spec.ts:15-30` (hasta `MAX_CITAS_RELACIONADAS` en «Más de {Autor}» y hasta 3 en «De la misma obra»); `pagina-de-autor.spec.ts:99-105`; `comparticion.test.ts:82` (destinos de enlace ∪ de imagen ∪ `opaco`); `medicion.test.ts`: :50-67 (vocabulario), :249-321 (la vista de superficie y `vista-de-obra`), :312-321 y :344-371 (el instalador en línea, o el fichero externo construyendo con `MEDICION_ENDPOINT`); `receptor.test.ts:96-108` (columnas nuevas); `indexacion.test.ts:141-160` (su filtro `startsWith('/obra/')` no excluye `/obras/`) y `publicado.test.ts` (directorios); `citas-relacionadas.test.ts` («Más de {Autor}» sin las de la misma Obra); `fecha-de-cambio.test.ts`, `fecha-de-cambio-build.test.ts` e `indexnow.test.ts` (AD-27); `seo.spec.ts` y `publicable-y-alcanzable.test.ts` (NFR-5 con los directorios); el barrido axe con las superficies nuevas; y el tope de guion de las páginas que lo miden, con la Página de Obra entre ellas |

## 11. Épicas, en orden de construcción

| Épica | Contenido | Depende de |
|---|---|---|
| **23 · Medir la lectura** | §4 | — |
| **24 · La Obra se ve y la Cita sigue** | §5 | 23 (zonas) |
| **25 · Compartir donde se publica** | §6 | 23 (`via`, destinos, presupuesto) |
| **26 · Directorios y cabecera** | §7 | 23 |
| **27 · Buscar con filtros** | §8 | 23, 26 |
| **28 · La portada de retorno** | §9 | 24–27 y la decisión de presupuesto de §4 |

Orden: la 23; la 24 y la 26 a la vez (para que Obra y Autor ganen enlaces internos en el mismo
despliegue, §13); la 25 y la 27; la 28 al final.

## 12. Métricas

Las metas se fijan con la línea base de las dos primeras semanas de la Épica 23, nunca antes;
fijarlas hoy sería fijarlas sobre cargas de máquinas. Toda tasa va sobre **lecturas**, no
sobre vistas.

- **Continuación:** salidas internas / lecturas, por superficie y por zona. Sustituye a SM-3 y
  SM-4 mientras no haya sesión. La de la Página de Cita juzga la Épica 24; la de la portada
  (zonas `cita-del-dia`, `obras-de-portada`, `autores-de-portada`, `colecciones`,
  `cabecera`), la Épica 28.
- **SM-5 y SM-7:** copiados y descargas, y comparticiones, entre lecturas de la Página de
  Cita, contando solo las acciones emitidas en rutas `/cita/…`. Las de la portada y la Página
  de Obra se informan aparte, por superficie. Así **SM-C3** compara las dos sobre el mismo
  denominador, y es la contra-métrica de la Épica 25: que compartir no crezca a costa de
  copiar.
- **Difusión:** lecturas con `via` / comparticiones, por destino. Es la medida de H.
- **Búsqueda:** SM-6 = `busqueda-sin-resultados` / `busqueda`, filtrados incluidos. Aparte, la
  **búsqueda seguida**: `salida-interna` de zona `resultado` / `busqueda`.

## 13. Riesgos

- **El CI rojo** impide desplegar nada: la v8 no llega a nadie hasta arreglarlo (§16).
- **SM-11 se juzga hacia el 2026-12-05 con más enlaces internos.** La Tarjeta de Obra pone un
  enlace a la Obra en cada Página de Cita. Para no inclinar la comparación Obra frente a
  Autor, la Épica 24 se despliega junto a la 26 (directorio de Autores y cabecera), y la fecha
  de ese despliegue conjunto se declara en `src/lib/umbrales.ts`, junto a
  `PRIMER_DESPLIEGUE_DE_OBRAS`, para que el informe de indexación la nombre en la línea SM-11.
  **La Épica 28 inclina en el otro sentido**: quita de la portada el enlace directo a cada
  Autor (que pasa de 1 a 2 saltos) y añade Obras. O se despliega después del juicio de SM-11,
  o su fecha se declara igual. SM-11 se juzga sabiéndolo.
- **Fechas del sitemap y avisos (AD-27).** Ampliar la relación de la Página de Cita puede mover
  el `lastmod` de cientos de páginas en cada sesión de siembra y avisarlas por IndexNow, que es
  lo que `tools/avisar.ts` dice que enseña a los buscadores a ignorar. Se mide cuántas mueve
  una sesión antes de desplegar.
- **La activación del usuario.** Si «Historia de Instagram» pierde la activación entre el
  toque y `share()`, cae en la descarga, que en iOS va a Archivos y no a Fotos, desde donde la
  historia no la recoge. La matriz de dispositivos lo dice antes de cerrar la épica.
- **Instagram puede no ofrecer «Historia»** al recibir un fichero desde la web, según versión y
  sistema. La salida digna es la descarga con el enlace copiado.
- **Facebook pierde `?via=` por construcción** si el clic de la tarjeta lleva a `og:url`, que
  va sin marca: la compartición se cuenta al pulsar, la llegada no. La difusión de Facebook se
  lee sabiéndolo, o se excluye de la comparación entre destinos.
- **El portapapeles en los navegadores incrustados** puede fallar; el anuncio solo dice
  «copiado» si `writeText` resolvió.
- **Peso de la Página de Cita.** Hasta siete Tarjetas de Cita más (3 de la misma Obra y
  `MAX_CITAS_RELACIONADAS` = 4) y la Tarjeta de Obra. Hoy solo se vigila el guion: ninguna
  prueba mide el HTML. Si se quiere vigilar el peso, se crea en `umbrales.ts` un tope de bytes
  de HTML para la Página de Cita, con su prueba.
- **La línea base sigue contaminada** si `lectura` no separa bien a las máquinas; el tiempo
  mínimo es un umbral de `umbrales.ts` y se ajusta con un diff.
- **Horas de Héctor.** Varios pasos son suyos (§16); la 21.2 y la revisión de las claves de
  orden propuestas no las puede hacer un agente.

## 14. Lo que este diseño no decide

**Para Héctor:**

- si la Línea de la Fuente va **antes** de la Tarjeta de Obra, pegada a la Atribución que
  acredita, para que «Texto tomado de…» no se lea como si hablara de la tarjeta (propuesta:
  sí, Atribución y Fuente juntas y después la tarjeta);
- qué hace «Historia de Instagram» en escritorio, donde no hay historias. El addendum v2
  decidió no ofrecer Instagram en escritorio («un botón que no puede cumplir es peor que no
  ofrecerlo»). Propuesta: el botón solo aparece con puntero grueso (`matchMedia('(pointer:
  coarse)')`), porque `canShare({files})` también es cierto en Safari de macOS y en Chrome de
  Windows; en escritorio el bloque lleva los otros tres, sin aviso de incompatibilidad
  (FR-17).

**Para las pasadas BMad**, con la propuesta que aquí se da:

- el tiempo mínimo de `lectura` (propuesta: 8 s) y si se cuenta como mucho una salida interna
  por lectura;
- si la medición sale a un fichero o se sube el tope (propuesta: fichero, con su propio tope);
- si un filtrado sin texto con cero resultados emite también `busqueda-sin-resultados`
  (propuesta: no);
- la Historia en dos toques o preparada antes del toque;
- la disposición de la cabecera a 360 px y el color de Autores y Obras (tinta, si son
  navegación que informa, o siena, como Buscar; DESIGN:138-139);
- el tipo de resultado de `/autores/` y `/obras/` en Pagefind y qué parte de su lista se
  ignora; si `/obras/` lleva letras de salto;
- si NFR-5 para las Citas se comprueba en el build o se conserva otra vía de 3 saltos;
- la decisión de AD-27 sobre qué entra en la relación de la Página de Cita;
- adónde va el foco tras «Mostrar 30 más» (propuesta: al primer resultado nuevo);
- el lugar del formulario «Buscar en esta…» en las páginas de Obra, Autor y Tema, el del
  bloque de compartir en la Página de Obra, y el UJ que alcanza cada directorio;
- la regla exacta de rotación de las seis Obras de la portada;
- dónde va la marca en la portada para que no salga dos veces arriba, y la redacción final de
  la línea de cifras;
- los tokens de la Tarjeta de Obra y del bloque «Compartir en».

## 15. Fuera de la v8

- Favoritas, boletín y PWA: siguen siendo no-objetivos.
- Encender la afiliación: espera al juicio de SM-11 (desde el 2026-12-05), a la primera
  tienda y su marca (las declara Héctor) y a reanclar el Umbral a una cifra medible (la E-F
  del borrador del 04/10).
- Archivo de la Cita del Día: AD-12 la recalcula en cada build sin commit, y guardarla
  exigiría un commit diario del CI que dispara el aviso de AD-27 (el razonamiento de AD-24);
  recalcular el pasado da otra Cita en cuanto cambian las aptas.
- Efemérides («nació un día como hoy»): el Corpus solo guarda el año.
- Páginas de intersección Tema × Autor u Obra × Tema: AD-19, NFR-13.
- `/temas/` y `/colecciones/` como índices.
- Las tres plantillas en 9:16.
- Autocompletado del campo de búsqueda.

## 16. Actos de Héctor, en paralelo

Ninguno es de un agente, y varios condicionan que las cifras de la v8 valgan:

- **Arreglar el CI** (hay una tarea aparte con el diagnóstico pendiente).
- **La credencial de Search Console** (`DESPLIEGUE.md` §5), para llenar las series de
  indexación, tráfico y demanda y poder juzgar SM-11.
- **Los enlaces del canal propio:** Linktree, la bio de TikTok (hoy apunta al .com, que no
  responde) y el campo web de Facebook, al .net.
- **Decir quién publica unas 20 Citas al día en Threads** y anotarlo con `npm run canal`.
- **El tachado de aptas de la 21.2.**
- **Revisar las claves de orden** que proponga la orden de `/autores/` (no bloquea nada).

## 17. Ruta

1. Este documento, commiteado aparte.
2. `bmad-prd` (actualizar), `bmad-ux`, `bmad-architecture`, `bmad-spec` y
   `bmad-create-epics-and-stories`, cada uno en su commit.
3. `bmad-sprint-planning` en `--dry-run` y alta a mano de las Épicas 23–28 en
   `sprint-status.yaml` con las claves que enseñe.
4. `bmad-build`, historia a historia, empezando por la 23.

## Apéndice: alternativas consideradas

- **Trocear por petición** (una épica por A–H): se reconoce en la lista, pero «Obra»,
  «compartir» y «retención» chocan en la Página de Cita y su presupuesto. Descartada.
- **Un rediseño de una vez:** lo más vistoso y lo más largo sin desplegar, sin poder atribuir
  ningún cambio. Descartada.
- **La portada como puerta de entrada** (revocar FR-9 y §10): los datos dicen que se entra por
  la Cita. Descartada.
- **Medir primero y esperar línea base:** Héctor prefirió medir a la vez.
- **Reutilizar `?de=` para los visitantes:** mezcla las cuentas propias con lo que comparten
  los visitantes y rompe SM-8. Descartada.
- **Mantener solo la hoja del sistema en móvil:** deja fuera al navegador de Facebook en
  Android, sin hoja, que es la audiencia principal. Descartada.
- **Tres plantillas en 9:16, o el dominio con la ruta:** más decisiones antes de compartir
  (FR-11), o una URL ilegible en una historia. Descartadas.
- **Afiliación en la Página de Cita, o el bloque de ediciones más arriba en la de Obra:**
  revocan AD-20 v7.1 o FR-54 y arrancan el reloj de la cuenta antes de SM-11. Descartadas.
- **Solo Obras indexables en los filtros:** coherente con FR-52, pero quien busca una obra
  pequeña no la encuentra; el filtro vive en la Cita indexada. Descartada.
- **Directorio por nombre de pila o solo un filtro en la portada:** Cervantes seguiría en la
  «M», o la portada seguiría siendo el directorio. Descartadas.
- **Favoritas en el navegador, boletín, PWA:** reabren no-objetivos y cuestan guion o datos
  personales. Fuera.
- **La Tarjeta de Obra después de compartir, o compacta:** Héctor prefirió la Obra como lo
  segundo que se ve.
- **Emitir `vista-de-superficie` desde toda Página de Obra:** rompía «sí y solo si producto»
  (Historia 20.1) y metía páginas de servicio en SM-8. Sustituida por `vista-de-obra`.
- **`?via=hoja`:** no está en el conjunto cerrado; la hoja ya se llama `opaco`.
