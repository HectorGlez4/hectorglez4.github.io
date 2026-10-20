---
title: "Lente adversaria — la pasada corta v8.2 contra las Épicas 23–28"
status: final
created: 2026-10-20
lens: adversarial (Finalize, `finalize_reviewers`)
against:
  - 'ARCHITECTURE-SPINE.md (v8 en 58a4b437 más el diff sin commitear de la pasada v8.2)'
  - '.memlog.md (las doce entradas desde «Pasada corta v8.2 (2026-10-20)»)'
also_read:
  - 'reviews/review-v8-2-rubrica.md (para no repetirla: aquí se construye la pareja y se dice dónde su arreglo no basta)'
  - 'implementation-readiness.md (c6a68d9d): puntos 1, 4 y 5 y las notas de «Arquitectura y espina»'
  - 'PRD v8.2 (f46a8bee): FR-56 «Lectura con acción», SM-5, SM-7, SM-8, SM-12, SM-13'
  - 'scratchpad/resoluciones-v8.md (decisiones de Héctor del 2026-10-19)'
  - 'epics.md: Historias 23.1–23.11, 24.2, 24.8, 25.2, 25.5, 26.7, 26.8, 26.11, 27.4, 28.2, 28.4'
  - 'EXPERIENCE.md 252–266 (selectores e historial de /buscar/)'
  - 'Código: medicion/{esquema.sql,worker.ts,receptor.ts}, src/lib/{medicion,umbrales,huecos,superficies,publicado}.ts, tools/lib/{avisar,cambios,indexacion,trafico}.ts, tools/avisar.ts, src/islands/ImagenDeCita.astro, public/islas/imagen.js, tests/unit/ayuda/construir.ts, package.json, publicar.yml'
---

# Lente adversaria — la pasada corta v8.2 contra las Épicas 23–28

**Veredicto: la v8.2 cierra lo que la puerta le pedía, pero cuatro de sus reglas nuevas permiten que dos historias cumplan la letra y construyan cosas incompatibles.** Las cuatro son:

- **la memoria de `primera`**, que la espina pone en un arranque que el guion sustituye;
- **la unidad «superficie» de la medición**, que no dice si es familia o superficie declarada, cuando la portada no tiene familia;
- **el historial de `/buscar/`**, en el que la UX apila estados que AD-13 no da por asentados, mientras la regla de `back_forward` supone que todo lo apilado se asentó;
- **el barajado del `rowid`**, que una migración hace demasiado pronto y una vuelta atrás de la 23.3 deshace sin que la huella lo vea.

Todo se cierra precisando AD-13, AD-14, AD-9, AD-12 y AD-27. Ningún hallazgo pide un AD nuevo ni contradice una decisión de Héctor. En dos casos el cierre pide que Héctor elija entre dos salidas, y se dice.

**Recuento:** 4 altos · 6 medios · 4 bajos.

**Método.** Para cada regla que tocó la pasada se construyeron dos unidades del nivel de abajo, historias o mitades de historia de las Épicas 23–28, que obedecen la regla tal como está escrita. Después se buscó dónde chocan: un estado con dos dueños, una forma de datos que una produce y la otra no espera, dos calendarios, una prueba que pasa en verde con el fallo dentro. Cada pareja se contrastó con el código del repositorio.

**Relación con la rúbrica.** La rúbrica (`review-v8-2-rubrica.md`) ya vio como ambigüedad cinco de estos sitios: A-1 (historial), A-2 (familias de fichero), M-1 (`primera`), M-3 (`rowid`) y M-5 (cortes). Aquí no se repiten sus argumentos. Se da la pareja concreta y, donde su arreglo no basta, se dice por qué. Lo enteramente nuevo es lo siguiente:

- la prueba de correspondencia que deja pasar un `primera` ausente (A1);
- la superficie de la medición (A2);
- el choque con `EXPERIENCE.md` 260 y la marca en `history.state` (A3);
- el volcado de la 23.3 y el coste en cuota del barajado (A4);
- el lado de ruta de las familias del aviso (M1);
- la descarga forzada de la Imagen cuadrada (M2);
- la recarga y el dueño de la regla de `back_forward` (M3);
- la jornada de llegada entera dentro del tramo nuevo (M4);
- los cortes que no son de SM-8 (M5);
- el veredicto del peso de `dist/`, que depende de la jornada (M6).

Las líneas de la espina son las del árbol de trabajo.

---

## Altos

### A1. `primera` tiene dos sitios donde vivir, y ninguna prueba nota cuál se eligió

- **Espina:**
  - AD-13 l. 191: el arranque «define `__medir` como cola; el guion de medición la vacía al cargar y la sustituye».
  - l. 194: «El arranque de `__medir` lleva en memoria, por carga, qué métricas de acción ya contó».
  - l. 207: la prueba de correspondencia es «las claves que emite el guion ⊆ el registro del receptor ⊆ las columnas».
- **La pareja:**
  - **Historia 23.1, el arranque y el guion.** El arranque en línea es una cola mínima que solo apila argumentos: cuenta en `MAX_BYTES_DE_GUION`, y la 25 y la 28 necesitan ese hueco (AD-6 l. 115). El guion diferido vacía la cola y pone su propio `__medir`.
  - **Historias 23.2 y 23.5, `primera`.** Leen la l. 194 al pie de la letra: la memoria va en el arranque, que decide `primera` cuando lo llaman y la apila junto al evento.
- **Qué se rompe:**
  - **Dos `primera` = sí en una carga.** Con 4G lento, el visitante pulsa «Copiar la cita» antes de que corra el guion `defer`. El arranque apila `copiado` con `primera` = sí. El guion vacía la cola tal cual y su `__medir` empieza con la memoria vacía, así que el segundo «Copiar» también sale con `primera` = sí. Esa carga cuenta como dos lecturas con acción.
  - **La variante inversa.** Si el guion espera que la cola traiga `primera` ya decidida y no la calcula, todo lo emitido después de cargarlo llega sin ella.
- **Ninguna prueba lo ve:**
  - La correspondencia de la l. 207 es una inclusión de **claves**. Un guion que no emite `primera` la cumple. También uno que la emite como booleano cuando el conjunto es sí/no: el receptor descarta el valor por estar fuera de su conjunto (como `receptor.ts` hace hoy con `origen` y `destino`). En los dos casos el dato llega nulo sin error, que es lo que el *Prevents* v8 de AD-13 nombra.
  - La 23.2 de `epics.md` (5113) tampoco pone `primera` entre los `ADD COLUMN` de la `0001`: un constructor que la siga deja la columna fuera, y añadirla después es otra vuelta de la 23.2 y la 23.3.
- **Lo agrava (rúbrica M-1, punto 3).** La lectura por interacción la emite la escucha de `pointerdown` del guion. Un clic que llega antes que el guion queda en la cola sin que nadie emita su lectura, aunque hubo interacción. El numerador de SM-5 deja de ser subconjunto del denominador justo en las cargas lentas, que son las del móvil.
- **Cierre (AD-13 l. 191, 194 y 207):**
  1. `primera` la decide **solo el guion de medición**, al emitir, también al vaciar la cola en orden. El arranque en línea es solo cola, sin memoria ni vocabulario. La l. 194 dice «el único `__medir` en ejecución», no «el arranque».
  2. Si la cola trae una acción o una salida y la lectura de la carga no ha salido, el guion emite antes la lectura: lo que hay en la cola es interacción. Vale también para toda acción o salida posterior sin lectura (lector de pantalla, voz, `element.click()`).
  3. La correspondencia se fija **por evento y por valor**: en el entorno simulado, para cada evento, las claves que emite el guion son **las mismas** que el vocabulario le declara, y cada valor pertenece a su conjunto. La inclusión registro ⊆ columnas se queda.
  4. El módulo del vocabulario declara la correspondencia evento → métrica (SM-5: `copiado` y `descarga-de-imagen` sin `instagram-historia`; SM-7: las dos comparticiones). El guion la importa; ninguna isla la sabe.

### A2. «La superficie de un registro» no dice si se agrupa por familia o por superficie declarada, y la portada no tiene familia

- **Espina:**
  - AD-13 l. 206: «La superficie de un registro es la página donde ocurre… El censo de la medición es `rutasPublicadas` sin el servicio por forma».
  - AD-17 l. 256: seis familias en `superficies.ts`, y «cada serie y el aviso declaran su subconjunto».
- **Código:** `rutasPublicadas` empieza por `'/'` (`src/lib/publicado.ts` 429–438). La portada es una `Superficie` declarada (`superficies.ts` 84–89), pero no está en ninguna de las seis familias.
- **La pareja:**
  - **Historia 23.10, constructor X.** Agrupa por las familias de AD-17, como las cinco series de `tools/` (AD-24), y declara su subconjunto con nombre. La portada no casa con ninguna familia, así que va a «lo que no casa se cuenta aparte» (`epics.md` 5467), junto a `/buscar/` y el 404.
  - **Historias 28.2, 28.5 y 26.11, constructor Y.** Leen «superficie» como la entrada declarada de `superficies.ts`. Lo necesitan para cumplir lo suyo: «lo copiado, descargado y compartido desde la portada… la 23.10 las informa aparte» (7881–7883, sobre las lecturas de la portada, SM-5 y SM-7) y «SM-4 de los Directorios… contra su propia serie» (7238–7240).
- **Qué se rompe:**
  - **La portada.** Con X no hay serie de la portada: las cifras de SM-5 y SM-7 de la portada, y la continuación que juzga la 28.5, no tienen de dónde leerse.
  - **Los Directorios.** Son una familia (`directorio`) y dos superficies declaradas. La línea base «se cierra al reunir un mínimo de lecturas de su superficie» (FR-56): X la cierra al sumar el mínimo entre los dos, e Y necesita el mínimo en cada uno, el doble. La fecha en que SM-4 de los Directorios se puede juzgar depende de quién escribió la orden.
  - **La Obra.** La l. 206 da la marca indexable a «las lecturas y las salidas», no a las acciones. SM-7 de la Obra (las comparticiones de su página 1, 25.6) se informa «sobre las lecturas de su superficie». El denominador sale partido por marca y el numerador no, así que la tasa de las Obras indexables suma comparticiones de las que no se indexan. Eso es justo lo que FR-56 dice evitar: que una página que no puede indexarse entre en las cifras de las indexables.
- **Cierre (AD-13 l. 206):**
  - La unidad de agregación de la medición es la **superficie declarada** en `superficies.ts`: la portada, las Páginas de Cita, de Autor, de Tema, de Colección y de Obra (partida por su marca), y los Directorios. La medición no es una serie de AD-24 y no declara un subconjunto de familias.
  - Para los Directorios, la regla tiene que decir si son una superficie o dos a efectos de línea base. Lo decide Héctor. La propuesta es una sola, «los Directorios», como los nombran FR-56 y SM-4.
  - **Todo** registro de una ruta de Obra (lecturas, salidas y acciones) toma la marca de sus vistas de Obra de esa jornada, y la cuenta aparte de «cambió» vale para todos.

### A3. La UX apila en el historial lo que AD-13 no da por asentado, y la regla de `back_forward` cuenta con que todo lo apilado se asentó

- **Espina:**
  - AD-13 l. 199: se asienta «al enviar, al pulsar un resultado o al ocultarse la página».
  - l. 200: una llegada `back_forward` sin caché «da por ya registrado el estado de búsqueda con el que llega».
  - l. 201 y la convención de dirección (l. 415): `pushState` al asentar y `replaceState` mientras no se asienta.
- **Fuera de la espina:**
  - `EXPERIENCE.md` 260: tras la pausa de un selector, «solo esa búsqueda se anuncia y entra en el historial».
  - 27.4, `epics.md` 7475–7477: «cuando pasa la pausa, solo ese estado entra en el historial».
- **La pareja:**
  - **Historia 27.4, la dirección.** Sigue `EXPERIENCE.md` y su propio criterio: al terminar la pausa, `pushState`. Cree cumplir AD-13, porque la l. 201 obliga a apilar lo asentado y no prohíbe apilar más.
  - **Historia 23.8 con la l. 200, la búsqueda asentada.** Emite solo en los tres disparadores de la l. 199 y da por registrado el estado de una llegada `back_forward`.
- **Qué se rompe.** El visitante elige Autor (la pausa apila E2), elige Tema (apila E3) y pulsa un resultado (asienta E3). Luego:
  - **Primer «atrás», sin caché:** llega a E3, que la regla da por registrado. Bien.
  - **Segundo «atrás»:** llega a E2. Según la especificación de HTML, es un `popstate` del mismo documento nuevo (rúbrica A-1). E2 no se asentó nunca. Con el arreglo de la rúbrica («todo estado al que se llega por la historia se da por registrado»), E2 no cuenta nunca. Sin él, se asienta al ocultarse.
  - **Con caché de atrás y adelante:** la memoria de la carga sabe que E2 no salió, y lo asienta.

  Dos navegadores dan dos recuentos de SM-6 y de SM-13, que es lo que la l. 200 quería quitar. Y con la letra de la l. 201 (`pushState` al asentar sobre una dirección que la pausa ya había escrito con `replaceState`), la entrada queda duplicada (rúbrica A-1), y la prueba de la 27.4 «atrás entre dos estados» falla.
- **Por qué el arreglo de la rúbrica no basta.** Supone que toda entrada del historial es un estado asentado. La UX, que manda sobre el comportamiento (`AGENTS.md`), apila estados que no lo son.
- **Cierre (AD-13 l. 200–201, convención de dirección):**
  - **Cuándo se apila lo decide la UX:** el primer cambio tras un estado que ya tiene entrada abre una entrada nueva, como dice `EXPERIENCE.md` 260 y precisa la rúbrica A-1. La medición deja de suponer que apilado es lo mismo que asentado.
  - **Que un estado está asentado lo dice su entrada.** Al asentar, la isla escribe en `history.state` de la entrada en curso un booleano (`asentada: true`) con `replaceState`: nunca un identificador, y no sale del navegador (NFR-11). En toda llegada a `/buscar/` (`navigate`, `reload`, `back_forward` con caché o sin ella, `popstate`), el estado de llegada cuenta como registrado si y solo si su entrada lo dice. El estado serializado forma parte de la entrada del historial: sobrevive a la recarga y a recorrer el historial entre documentos. Esto sustituye a la detección por Navigation Timing de la l. 200. La memoria de la carga queda solo para los estados que no tienen entrada.
  - Si el navegador rechaza esa escritura (límite de frecuencia), queda como hoy, y se dice.
  - **Playwright local recorre:** «Autor, Tema, resultado, atrás, atrás» con caché y sin ella, y la recarga de `/buscar/?q=…`.

### A4. El barajado del `rowid`: una migración lo hace demasiado pronto, y la vuelta atrás de la 23.3 lo deshace sin que nada lo vea

- **Espina:**
  - AD-13 l. 208: «el Worker inserta cada fila con un `rowid` aleatorio… y un `UPDATE` baraja una vez lo ya escrito».
  - AD-14 l. 217–218: las migraciones son solo aditivas, en el orden migración → receptor → sitio.
  - Paradigma l. 33: la tabla «cambia solo por migraciones aditivas versionadas».
- **La pareja:**
  - **Historia 23.2, constructor X.** Como la tabla «cambia solo por migraciones», escribe el barajado como `medicion/migrations/0002` (`UPDATE eventos SET rowid = abs(random())`). `desplegar` aplica las migraciones **antes** de desplegar el receptor (5135, l. 218). Mientras tanto sigue en vivo el Worker v7.1 (`worker.ts` 53–66, sin `rowid`), y SQLite le da a cada fila nueva `max(rowid) + 1`: tras el mayor aleatorio, una tira de filas consecutivas que conservan su orden. Y como migración corre una vez, nunca más.
  - **Historia 23.3, constructor Y.** Su vuelta atrás (5167–5170) es «Héctor vuelve a desplegar desde la principal el receptor que había». El `rowid` aleatorio vive en la rama, así que ese receptor no lo tiene: semanas de filas en orden, con el barajado ya gastado. La huella no lo ve, porque el cambio no toca columnas (l. 208).
  - **La misma 23.3:** «la tabla de producción antes de migrar… se compara después: conserva todas sus filas» (5163–5165). Un constructor que compare con `wrangler d1 export` antes y después deja en disco un volcado cuyas sentencias van en el orden del `rowid` anterior al barajado. El recorrido que la regla borra en D1 sobrevive en un fichero, sin caducidad.
- **El coste que nadie cuenta.** Cambiar el `rowid` reescribe la fila y su entrada en los dos índices, y cada índice cuenta una fila más (Entorno operativo, l. 535). Son unas tres escrituras por fila contra las 100.000 del día, el mismo día que las balizas de prueba.
- **Cierre (AD-13 l. 208, AD-14 l. 217–219):**
  - **El `rowid` aleatorio entra en la principal antes que la 23.3**, como cambio propio del adaptador (`worker.ts`), sin vocabulario ni columnas, y por eso sin huella que mover. Así toda vuelta atrás y todo redespliegue desde la principal lo conservan. Una prueba estructural del SQL del adaptador lo fija, como `receptor.test.ts` fija hoy lo que el adaptador no lee.
  - **El barajado no es migración.** No cambia el esquema, y AD-14 quiere las migraciones aditivas. Es un paso de `npm run medicion -- desplegar` que corre **después** de comprobar con su baliza que el receptor desplegado inserta con `rowid` aleatorio. Es idempotente y se repite en cada `desplegar`. La l. 33 dice «su esquema cambia solo por migración aditiva», no «la tabla».
  - Los recuentos de antes y de después se hacen con `COUNT` por (jornada, evento). Antes del barajado no se copia ninguna fila (ni `export` ni `SELECT *`), y no se guarda ninguna.
  - El paso informa de las filas que escribirá frente a la cuota del día y no corre si no caben.
  - Time Travel se nombra como pérdida aceptada, como pide la rúbrica M-3.

---

## Medios

### M1. Las familias del aviso: AD-17 y la 26.7 le dan un subconjunto, AD-27 le da dos y la portada no tiene ninguno

- **Espina:**
  - AD-17 l. 256: «cada serie y el aviso declaran su subconjunto».
  - AD-27 l. 397: «la del fichero… son cinco; la de la ruta avisada sale de la relación, y son seis, el subconjunto entero».
- **Historias:**
  - 26.7 (7039–7040): «el aviso, las familias que tienen directorio en el Corpus».
  - 24.8 (6028–6030): la orden «dice por familia cuántas superficies cambian de fecha y cuántas se avisarían».
  - 26.11 (7224–7226): la corre «con la v8 puesta».
- **La pareja:**
  - **Historia 26.7.** Declara `FAMILIAS_DEL_AVISO` con las cinco que tienen directorio, derivadas de `superficies.ts`, y tipa `FamiliaAvisable` con ellas. La prueba «subconjuntos, no igualdad» pasa.
  - **Historia 24.8**, que va antes en la misma rama. Su informe por familia necesita la familia de cada **ruta**, y toma la única que el aviso conoce, `FamiliaAvisable`, la de fichero.
- **Qué se rompe:**
  - Cuando la 26 mete `/autores/` y `/obras/` en la relación, sus rutas no tienen `FamiliaAvisable`. El informe las pierde o las echa a «otra», y son dos URL que se mueven «en cada siembra» (AD-27 l. 396).
  - La portada, que el aviso manda siempre, no tiene familia en ninguno de los dos conjuntos.
  - En el lado de fichero, además de `corpus/fuentes/` (rúbrica A-2), el rango también mira `src/lib/umbrales.ts` (`tools/avisar.ts` 165 y 233–252), que no es ninguna familia. El `documento` que propone la rúbrica no lo cubre.
- **Cierre (AD-27 l. 397, AD-17 l. 256):**
  - El aviso declara **dos** constantes:
    - los directorios que observa en el diff, cada uno con su familia de fichero (`cita`, `autor`, `tema`, `coleccion`, `obra` y `documento`), más `src/lib/umbrales.ts` como regla, sin familia;
    - las familias de ruta, que son las seis de `superficies.ts`. La portada se avisa sin familia y se informa aparte.
  - La familia de una ruta avisada la pone la entrada de la relación, que la toma del constructor de ruta que la declara. Nunca sale del fichero que la movió ni del prefijo.
  - La 26.7 dice «el aviso, sus dos subconjuntos», y la prueba fija los dos.

### M2. La descarga forzada de la Imagen cuadrada gasta la primera de SM-5, y la de la Historia no

- **Espina:**
  - AD-7 l. 128: tres rechazos de `share()` caen en la descarga.
  - AD-13 l. 192: `destino` va en `descarga-de-imagen` «solo con ese valor», `instagram-historia`.
  - l. 194: la descarga con `instagram-historia` «no gasta su primera».
- **Código:**
  - `public/islas/imagen.js` 159–160: todo error que no sea `AbortError` cuenta como fallo.
  - `src/islands/ImagenDeCita.astro` 280–294: tras un fallo, descarga y emite `descarga-de-imagen` sin destino.
- **La pareja:**
  - **Historia 25.2** (6198–6201): «descargada, se registra `descarga-de-imagen` sin destino, como hoy», también cuando la descarga la impone un rechazo.
  - **Historia 25.5** (6388–6391): el mismo rechazo en la Historia registra la descarga con `instagram-historia`.
- **Qué se rompe.** El visitante pide «Compartir como imagen» y el navegador lo rechaza con `NotAllowedError`. La 25.2 lo cuenta como lectura con descarga, gasta la primera de SM-5, y SM-C3 lo lee como uso privado. Sin embargo, la razón por la que el PRD saca la descarga de la Historia, «no las eligió el visitante, sino el navegador al rechazar la entrega» (SM-5), vale palabra por palabra para la cuadrada.
- **Cierre, a decidir por Héctor antes de la línea base (23.2):**
  - **(a)** Toda descarga en que cae un rechazo de `share()` lleva el destino del botón pulsado: `opaco` en la cuadrada e `instagram-historia` en la Historia. Ninguna descarga con destino gasta la primera de SM-5. El conjunto de `destino` en `descarga-de-imagen` pasa a {`opaco`, `instagram-historia`}, y SM-12 no suma esas descargas de `opaco` a su denominador (el `opaco` de SM-12 sigue siendo solo la hoja de «Más opciones…»).
  - **(b)** AD-13 declara la asimetría, y `bmad-prd` la escribe en SM-5.

  La salida (a) es la que el PRD argumenta.

### M3. La regla de `back_forward` no tiene dueño, y deja fuera la recarga

- **Espina:**
  - AD-13 l. 191: «toda emisión pasa por el único `__medir` en ejecución».
  - l. 200: la regla de `back_forward`, sin decir quién la aplica.
- **La pareja:**
  - **Historias 23.1 y 23.5, el guion.** El guion ya lee el estado de navegación para la lectura y para `pageshow`, y es el emisor único, así que aplica la l. 200 él mismo: en una carga `back_forward` sin `persisted`, descarta la primera `busqueda` (y `busqueda-sin-resultados`). No puede saber de qué estado es, porque el texto no viaja (NFR-11).
  - **Historias 23.8 y 27.4, la isla.** Siembra su memoria con el estado de llegada.
- **Qué se rompe:**
  - **El estado que cambia.** El visitante llega por «atrás» a `?q=amor`, cambia a «odio» y pulsa un resultado. La isla emite «odio»; el guion lo descarta, porque es la primera `busqueda` de la carga. Con las dos implementadas, cada historia según su lectura, «amor» no sale (bien) y «odio» tampoco (mal).
  - **La recarga.** Tirar hacia abajo para recargar `/buscar/?q=amor` en el móvil da un tipo de navegación `reload`, no `back_forward`: «amor» se asienta otra vez al ocultarse. FR-56 dice «volver a un estado ya registrado… no registra otra». Un constructor trata la recarga como vuelta y otro no, y salen dos denominadores de SM-6.
- **Cierre (AD-13 l. 200):**
  - La regla la aplica **la isla de búsqueda**, dueña de los estados. El guion no la aplica nunca, porque no ve el estado.
  - Vale para toda carga cuyo estado de llegada tiene entrada asentada. Con la marca de `history.state` de A3, cubre la recarga sin enumerar tipos de navegación.
  - Si se conserva Navigation Timing, la regla enumera `back_forward` y `reload`, y cualquier otro tipo, o su ausencia, cuenta como `navigate` (rúbrica B-6).

### M4. El corte de SM-8 mete en el tramo nuevo la jornada entera de la llegada, y la fecha gemela de SM-11 se lee en el calendario local

- **Espina:**
  - AD-13 l. 205: el corte es «la jornada UTC en que llega al sitio en vivo… desde esa jornada todo cuenta para el tramo nuevo».
  - AD-9 l. 146 y Entorno operativo l. 529: la jornada de la 24 con la 26 es la misma de SM-11.
- **Código:**
  - `medicion/receptor.ts` 54: la jornada del receptor es UTC.
  - `tools/lib/indexacion.ts` 851–855: `lineasDeSm11` compara un «hoy» **local** (`getFullYear`, `getMonth`, `getDate`).
  - `tools/` fecha en calendario local (`fechaLocal`, `jornadaLocal`).
- **La pareja:**
  - **Historias 23.11 y 26.11, quien anota.** Héctor fusiona de madrugada (los ficheros de esta pasada son de las 05:35). Un despliegue que llega a las 23:40 UTC del 30-10 son las 00:40 del 31-10 en Madrid (UTC+1 desde el 25-10). Además, la 26.11 (7235) exige escribir **la misma** cadena en `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS` y en `CORTES_DE_SM8`.
  - **Historia 23.10, la orden.** Parte las filas de D1 por jornada UTC ≥ corte.
- **Qué se rompe:**
  - **Con la letra (30-10):** el tramo nuevo abre con 23 h 40 min del instrumento viejo (la marca contada en cada recarga, la vista en línea), así que su primer día es casi entero del anterior.
  - **Con el calendario de quien anota (31-10):** 20 minutos del instrumento nuevo caen en el tramo viejo.
  - **La fecha gemela:** como la 26.11 obliga a una sola cadena y el informe de SM-11 compara en local, cada vez que el despliegue cruza la medianoche en uno de los dos calendarios, una de las dos constantes queda en el calendario equivocado.

  El «todo en UTC» de la rúbrica M-5 arregla la cadena, no la contaminación.
- **Cierre (AD-13 l. 205, AD-9):**
  - El tramo nuevo empieza en la **primera jornada UTC completa** tras la llegada. La jornada de la llegada no entra en ningún tramo: se informa aparte, como «cambió» en la Obra. Así la hora a la que se fusiona deja de importar.
  - Toda fecha de despliegue de `umbrales.ts` es la jornada UTC de llegada, y sale del instante en que termina el trabajo «Desplegar» de Actions, nunca del merge ni del reloj de quien la anota.
  - Lo que la compara en `tools/` pasa su «hoy» a UTC antes de comparar.

### M5. `CORTES_DE_SM8` es la única lista de cortes, y la espina manda abrir otros que no tienen dónde ir

- **Espina:**
  - AD-13 l. 192: cambiar los cortes del tramo «abre un corte de serie con fecha en `umbrales.ts`».
  - l. 205: la lista es solo de SM-8.
  - AD-14 l. 219: la reversión empieza por el sitio.
- **Historias:**
  - 23.5 (5253): si cambia el umbral de 8 s, «se repite la línea base».
  - 23.10 (5480–5484): solo lee `CORTES_DE_SM8`, y su prueba exige «sin fechas repetidas».
- **La pareja:**
  - **Historia 23.2.** Mueve un corte del tramo y busca dónde fechar el corte de serie. La única lista que existe es `CORTES_DE_SM8`: o lo apunta ahí, aunque SM-8 no usa el tramo, o crea otra constante que nadie lee.
  - **Historia 23.10.** No parte SM-6 ni SM-13 por nada, así que suma dos tramos distintos como una sola serie.
- **Qué se rompe:**
  - **La reversión.** Si se revierte la 23, su despliegue vuelve a cambiar el instrumento de SM-8 y necesita su entrada, y la nueva fusión otra. Si caen en la misma jornada UTC, la prueba de la 23.10 no admite la fecha repetida. Y como la entrada es una fecha sin instrumento, el tramo tras la reversión se lee como nuevo cuando es el de la v7.1.
  - **El cambio de los 8 s.** No tiene constante, así que la 23.10 no sabe desde dónde repetir la línea base.
- **Cierre (AD-9, AD-13 l. 192 y 205):**
  - Una sola forma para todo corte de serie: entradas `{ jornada, que, series }` en una lista ordenada de `umbrales.ts`, para la llegada en vivo que cambia un instrumento, una reversión, un cambio de los cortes del tramo y un cambio del umbral de lectura.
  - La orden parte cada serie solo por las entradas que la nombran, y admite dos entradas con la misma jornada y distinto `que`.
  - `CORTES_DE_SM8` pasa a ser la proyección de esa lista sobre SM-8, compuesta de las constantes con nombre que pide la rúbrica M-5.

### M6. El paso tras Pagefind da un veredicto del build que cambia con la jornada

- **Espina:**
  - AD-9 l. 146: el peso de `dist/` se mide tras Pagefind, con un aviso y un tope.
  - Entorno operativo l. 533: rompe al pasar el tope.
  - AD-12 l. 179: «Un veredicto del build es función del commit: dos construcciones del mismo commit en jornadas distintas dan los mismos veredictos».
- **La pareja:**
  - **Historia 24.2** (5648–5651, 5660–5662). Mide los bytes de todo `dist/` tras Pagefind, avisa o rompe, y escribe una línea con las dos cifras.
  - **Historia 26.8** (7121–7127). Su prueba de las dos jornadas exige «los mismos veredictos… con los mismos avisos». Construye con `construirProyecto`, que corre `astro build` y nunca el paso final (`tests/unit/ayuda/construir.ts` 271–285), así que pasa en verde.
- **Qué se rompe.** `dist/` contiene la portada, el 404, `/kit`, `/lote` y `rss.xml`, y los cinco cambian con la jornada: la 26.8 misma saca `rss.xml` de la comparación de HTML (7126). El tope existe para cuando `dist/` se acerque a él, a unos 100 KB por Cita nueva. Con `dist/` a pocos KB del tope, la reconstrucción diaria sin commit lo cruza un día y no el siguiente: avisa sin que nadie cambiara nada, o rompe el despliegue diario. Es justo el *Prevents* v8 de AD-12. Además, la línea de bytes difiere entre jornadas, así que «con los mismos avisos» deja de ser cierto si la prueba incluye el paso.
- **Cierre (AD-9 y AD-12):**
  - El veredicto del peso se calcula sobre `dist/` **sin los ficheros que rotan con la jornada**: las cuatro páginas que AD-12 ya exceptúa y `rss.xml`. Esos se miden y se informan aparte.
  - La línea de cifras del parte no es un aviso: avisos son los que cruzan un umbral.
  - La función pura de la 24.2 recibe la medida ya sin esos ficheros, y una prueba lo fija.

---

## Bajos

### B1. El tope del guion de Pagefind no tiene dónde medirse

- **Espina y precedente:**
  - AD-6 l. 113: el tope de una entrada que se pide con `import()` es «su fichero con todo lo que importa de forma estática».
  - La 23.1 (5050–5054) lo exige como «fallo de prueba (Vitest sobre `dist/`)».
- **El hueco.** `dist/pagefind/pagefind.js` solo existe tras la CLI de Pagefind, y el ayudante solo la corre con `conBusqueda` (`construir.ts` 247–255). Un constructor lo mide en Vitest con `conBusqueda`. Otro lo mide en el paso final de AD-9, donde se mide «lo que existe tras Pagefind». Un tercero se queda en comprobar que el destino está en la lista, que es una prueba de ausencia.
- **Cierre:**
  - AD-6 dice que el tope de la entrada de Pagefind se mide en Vitest, sobre una construcción con Pagefind.
  - AD-9 dice que el paso final mide solo el peso y los tamaños.

### B2. El azar del `rowid` depende de un generador que el repositorio no puede probar

- **El hueco:**
  - `abs(random())` lanza un desbordamiento de entero si `random()` devuelve −2⁶³, como documenta SQLite.
  - Una colisión de `rowid` hace fallar el `INSERT`, y `worker.ts` se lo traga.
  - Las dos probabilidades son despreciables (del orden de N²/2⁶⁴), pero la regla descansa en cómo siembra su generador el SQLite de D1, y Vitest (`node:sqlite` o el cotejo estructural) no lo ejercita.
- **Cierre:**
  - El adaptador genera el `rowid` con `crypto.getRandomValues` (63 bits) y lo pasa por `bind`, y la prueba lo inyecta.
  - La pérdida por colisión se nombra como aceptada.

### B3. El grafo del modelo es más estricto que el del build, y la negativa puede dar una causa falsa

- **Espina:** AD-11 l. 169 enumera las aristas del modelo sin dos clases deterministas que están en `dist/` y no rotan:
  - portada → los ocho Autores destacados (28.4, UX-DR62, que salen de una sola función);
  - las rutas de salida de la Página de Cita.
- **El hueco.** El build comprueba que `dist/` contiene el modelo, y pasa. Las órdenes que retiran calculan sobre el modelo. Un `tema quitar` que deja una Cita solo en la página 2 o siguientes de un Autor destacado se niega, porque en el modelo queda a cuatro saltos (portada → `/autores/` → Autor → página N → Cita). El build la aceptaría: en `dist/` está a tres (portada → Autor destacado → página N → Cita).
- **Cierre.** Una de dos:
  - añadir al modelo la arista portada → Autores destacados, calculada sobre el Corpus resultante;
  - declarar que el modelo es más estricto a propósito, y que la negativa lo dice.

### B4. Volver sin caché vuelve a emitir la vista, y con caché no

- **Espina:** AD-13 l. 193: tras `pageshow` con `persisted`, «no vuelve a emitir ninguna vista».
- **El hueco.** Una vuelta sin caché es un documento nuevo y emite vista. La dirección ya está limpia, así que SM-8 no cambia. Pero la comparación por firma de FR-56 («qué proporción de las vistas llega a lectura») y los recuentos de `vista-de-obra` dependen de si el navegador tiene caché de atrás y adelante. Es la misma dependencia que la l. 200 quitó a la búsqueda.
- **Cierre.** Una de dos:
  - declararlo (las vistas no son denominador de ninguna tasa);
  - tratar la vuelta sin caché como `persisted` para la vista.

---

## Comprobado y sin pareja

- **La llegada con marca tras un «atrás».** El guion quita `de` y `via` con `replaceState` antes de emitir, así que la entrada a la que se vuelve ya está limpia. Si el guion no llegó a correr antes de salir, la marca se cuenta una vez, en la vuelta, porque la primera carga no emitió nada. No hay doble cuenta.
- **La salida tras un «atrás».** Es carga nueva con caché y sin ella, igual que dice la 23.7 (5346–5349). SM-13 da lo mismo en los dos casos.
- **`primera` = no como unión de registros.** Lo trata la rúbrica (M-2) y no se repite.
- **La rotación con menos de seis Autores (AD-12 l. 178).** Es determinista sobre el conjunto de la jornada: con k < 6 Autores, la ventana da la vuelta entera cada día y cada Autor avanza su n-ésima Obra. No choca con la prueba de las dos jornadas, que solo compara subárboles `data-jornada`.
- **«Solo importa módulos hoja».** `umbrales.ts`, `destinos.ts` y `redes.ts` no importan nada. Que el vocabulario pudiera importar también `umbrales.ts` no cambia la huella mientras esta se calcule sobre los conjuntos del vocabulario y no sobre sus importaciones. Conviene que la orden de la 23.2 lo diga cuando escriba la forma de la huella.

## Alineaciones que no son de la espina

Para `bmad-create-epics-and-stories`, una vez la espina recoja los cierres:

- **23.2:** la `0001` añade `primera` (5113). La prueba de correspondencia es por evento y por valor (5123–5125). El vocabulario importa solo módulos hoja (5096).
- **23.3:** el barajado es paso de `desplegar`, y los recuentos se hacen sin copiar filas (5163–5170).
- **23.8 y 27.4:** la marca en `history.state` y el dueño de la regla de `back_forward` (7475–7488, 5392–5394).
- **23.10:**
  - la unidad «superficie declarada» (5464–5468);
  - las acciones de la Obra con su marca (5470–5473);
  - la lista general de cortes (5480–5484);
  - «en rutas `/cita/`» (5498), que contradice la l. 206.
- **24.2:** el veredicto sin los ficheros que rotan.
- **26.7:** los dos subconjuntos del aviso (7040).
- **26.11:** la fecha UTC del trabajo «Desplegar» y el tramo desde la primera jornada completa (7235).
