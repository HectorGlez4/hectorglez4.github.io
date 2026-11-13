# Revisión v9 de la espina — rúbrica

- **Objeto:** `ARCHITECTURE-SPINE.md` (v9, 2026-11-03), cambios marcados *(v9)*: AD-29, AD-30, AD-31; enmiendas de AD-3, AD-8, AD-13, AD-20, AD-23, AD-24, AD-25, AD-27, AD-28; filas *(v9)* del mapa de capacidades; *Deferred*.
- **Contra:** PRD v9 (§4.22, §4.23, FR-10, FR-14, FR-35, FR-51, §6.8, §14 preguntas 11–17), `AGENTS.md` y el código del worktree `brainlySabiduria-plan-v9` (commit `0bdc8a602d`).
- **Revisor:** independiente, solo lectura.
- **Veredicto:** **CONCERNS.** La v9 sitúa bien los puntos de divergencia nuevos: el salto de línea como dato, una sola fuente del texto publicado de una Fuente y Wikidata por revisión fija. Ninguno contradice la pureza de AD-5 ni la red de AD-22. Pero tres reglas no se pueden cumplir tal como están escritas contra el código real: el localizador en coordenadas colapsadas, la prueba de «mismo número de líneas» y la medida de parecido que no detecta fragmentos. Además, dos enmiendas chocan con texto v8 que sigue vigente en la misma espina (AD-23 «nunca el texto» y AD-27 `ordenAlfabetico`), y una `[ASSUMPTION]` de AD-20 contradice al PRD y a `AGENTS.md`. Nada es crítico: todo se corrige con texto en la espina antes de las épicas.

---

## Críticos

Ninguno.

---

## Altos

### A1 — «El mismo localizador» no da desplazamientos sobre el documento, y tres reglas v9 los necesitan

- **Dónde:** AD-30, 1.ª y 2.ª cláusula (el pasaje «con el tramo de la Cita marcado por desplazamientos»); AD-30, 3.ª (`desde` del incipit, «que `desde` se localiza»); AD-29, 4.ª (la restitución «toma del documento el tramo que da el mismo localizador y solo cambia espacios por saltos»).
- **Qué pasa en el código:** `localizar` (`tools/lib/cotejo.ts:78-80`) hace `cuerpo.indexOf(buscado)` sobre las formas ya colapsadas. `colapsarEspacios` (`:52-53`) quita los `INVISIBLES` y pliega todo `\s+` en un espacio. La posición que guarda hoy el cargador de posiciones está en esas coordenadas. Para cortar un párrafo, que se delimita por líneas en blanco y por tanto solo existe en el texto crudo, para marcar el tramo de la Cita dentro del pasaje y para copiar los saltos del documento a la Cita, hace falta el intervalo **en el texto crudo**. Ninguna regla dice quién traduce un desplazamiento colapsado a uno crudo.
- **Riesgo:** es la divergencia que AD-30 dice impedir. Cada historia escribirá su propia correspondencia, o volverá a buscar la Cita en el texto crudo con otra comparación: tres localizadores de facto, uno por historia (verso, pasaje e incipit).
- **Arreglo:** declarar en AD-23 (precisión del localizador) **una sola función de `tools/lib/cotejo.ts`** que colapse el documento y devuelva a la vez la tabla de correspondencia de posiciones colapsadas a crudas, y una sola función que dé el intervalo crudo de una aparición. La usan el cargador (posición y pasaje), la orden del incipit y la restitución de saltos. Una prueba fija que `colapsarEspacios(crudo.slice(a, b)) === colapsarEspacios(cita.texto)` para cada aparición del Corpus.

### A2 — AD-30 contradice la precisión v8 de AD-23, que la v9 no enmendó

- **Dónde:** AD-23, viñeta «Enmendado en la v8 — la posición de la Cita en su documento»: el cargador guarda las apariciones «sin ordenarlas ni elegir, **y nunca el texto**». AD-30, 1.ª cláusula: «El cargador de posiciones (AD-23) entrega por aparición, además de `{documento, posición}`, su pasaje».
- **Contra el código y `AGENTS.md`:** `src/content.config.ts:299` dice «**y nada del texto**». `AGENTS.md` (§ «El orden del libro») dice «sin texto y sin elegir». La v9 enmendó la viñeta de lo que se *publica* («nunca se publica su texto, salvo el pasaje y el incipit»), pero no la del cargador. Quedan dos reglas vigentes y opuestas en la misma espina.
- **Hueco asociado:** AD-30 no dice **quién carga el texto del incipit** en el build. La presentación nunca lee `corpus/` (Design Paradigm), y el cargador de posiciones trabaja por Cita, no por ficha. Si falta el dueño, una historia leerá `corpus/fuentes/` desde una integración o desde la página.
- **Arreglo:** reescribir la viñeta v8 de AD-23 con *(v9)*: el cargador entrega el pasaje por aparición y ningún otro texto. Nombrar además el dueño del incipit: el mismo cargador, ampliado a las fichas con `incipit`, o un hermano con su patrón, que localiza `desde` con la función de A1. Avisar a `bmad-project-context` de que `AGENTS.md` queda desfasado.

### A3 — La `[ASSUMPTION]` de AD-20 contradice al PRD y a `AGENTS.md`

- **Dónde:** AD-20, «Enmendado en la v9 — la tienda se declara sin marca»: «`[ASSUMPTION]` Los demás campos de la tienda —clave, nombre, dominio y parámetro…— los puede escribir una historia».
- **Contra:** PRD §6.8, «Los actos de Héctor, que no son construcción»: «**declarar las tiendas, todavía sin marca**, y poner la marca de cada una el día que solicite su cuenta». `AGENTS.md` (§ «Encender la afiliación de libros», paso 1): «ningún agente escribe una tienda ni una marca». La misma frase está en el comentario de `src/lib/ingreso.ts:259-268`.
- **Riesgo:** una historia de la Épica de afiliación escribiría `TIENDAS` en la principal, que es justo lo que el PRD reserva a Héctor. El supuesto no es una interpretación abierta: el PRD lo decide en contra.
- **Arreglo:** quitar la `[ASSUMPTION]`. La historia construye el esquema con `marca` opcional (hoy `marca: string` es obligatoria en `ingreso.ts:253`, y `revisarTiendas` en `:374` rechaza la marca vacía) y lo prueba con tiendas inventadas en una copia, como ya hace `ingreso-accesible.spec.ts`. Declarar las tiendas reales es un acto de Héctor.

### A4 — AD-29 exige una prueba que no se puede cumplir: «el mismo número de líneas» en los dos reparticiones

- **Dónde:** AD-29, 1.ª cláusula: «una prueba fija que dan el mismo número de líneas para las mismas Citas».
- **Contra el código:** `repartirEnLineas` de `src/lib/lienzo.ts:97-117` reparte **por recuento de caracteres** (`maximo = floor(anchoUtil / (cuerpo * ANCHO_POR_CARACTER))`). `public/islas/imagen.js:38-40` reparte **por `measureText`** con Source Serif cargada. Son dos métricas distintas, y ya hoy dan números de líneas distintos para la misma prosa. La propia espina lo reconoce en AD-8 («`lienzo.ts` rasteriza con las fuentes del sistema»).
- **Riesgo:** la prueba o es imposible o se debilita en la historia hasta no fijar nada. Lo que el *Prevents* quiere fijar —que el salto se respete en los dos— se queda sin guardia.
- **Arreglo:** fijar el invariante que sí importa. En las dos implementaciones, cada `\n` abre línea, ninguna línea contiene un `\n` y ningún verso se une con el siguiente: los puntos de corte forzado son los mismos. La cuenta de líneas solo se compara verso a verso cuando cada verso cabe entero en una línea en las dos.

### A5 — AD-27 v9 deja en pie la prueba v8 que la contradice, y vuelve a fechar en masa

- **Dónde:** AD-27, viñeta v8 «La relación va de cada superficie a (fichero, campos que pinta)»: «`ordenAlfabetico` fecha solo los dos Directorios… Una prueba fija que un commit que solo escribe claves de orden mueve `/autores/` y `/obras/` **y nada más**». Enmienda v9: «La Página de Cita compone también la clave de orden de su Autor —`ordenAlfabetico` y `ordenRevisado`—». La v9 retira solo la prueba de `ordenRevisado`.
- **Contra el código:** `tools/lib/cambios.ts:275-276` y `:306-315` codifican la regla v8: `ordenRevisado` está en `CAMPOS_QUE_NO_FECHAN` y la clave pinta solo los Directorios.
- **Riesgo:** sobrefechado. `npx tsx tools/autor.ts proponer-claves` se repite tras cada puesta al día de una rama y escribe `ordenAlfabetico` en Autores **sin revisar**. Su Referencia no cambia, porque sin revisión va el nombre tal cual (AD-28), y aun así cada Página de Cita y de Obra suya se fecharía y se avisaría. Es el caso de los 308 de Unamuno que el *Prevents* v8 de AD-27 existe para impedir.
- **Arreglo:** que la Página de Cita y la de Obra compongan un **campo derivado** —el nombre tal como lo pone la Referencia, función de `atribucion.ts` sobre (`nombre`, `ordenAlfabetico`, `ordenRevisado`)— y que el comparador lo compare. Si no, el comparador ignora un cambio de `ordenAlfabetico` cuando falta `ordenRevisado` antes y después. Reescribir de forma explícita la frase v8 y su prueba: «un commit que solo escribe claves sin revisar mueve solo los Directorios; revisar una clave mueve además las Páginas de Cita y de Obra de ese Autor». Y dar el coste: revisar a un Autor de 308 Citas avisa 308 rutas una vez.

---

## Medios

### M1 — La medida única de parecido de AD-3 no detecta «una es un fragmento de otra»

- **Dónde:** AD-3, «Enmendado en la v9 — una sola medida de parecido».
- **Contra el PRD y el código:** FR-14 (v9) pide señalar las que «difieren en una palabra, **o una es un fragmento de otra**». La auditoría cita el fragmento suelto de «Cultivo una rosa blanca». `parecidoDeTextos` (`tools/lib/documentacion.ts:143-149`) es la distancia de Levenshtein dividida por la longitud **del más largo**: un fragmento de la mitad de la Cita da más o menos 0,5, muy por debajo de 0,85. Con «ningún módulo calcula otro parecido», el caso del PRD queda prohibido de construir.
- **Arreglo:** dos criterios en el mismo módulo y con un solo dueño: el parecido de siempre, para «difieren en una palabra», y la **contención por palabras sobre la forma canónica**, para «es fragmento». Las repetidas salen por igualdad canónica. De paso, `MIN_PARECIDO_PARA_CORREGIR` vive en `tools/lib/documentacion.ts:132` y no en `umbrales.ts`, contra AD-9. Moverla o declararla excepción.

### M2 — AD-29 fija cómo se guarda el salto, pero no cómo sale en el HTML

- **Dónde:** AD-29. El *Prevents* nombra «una con `<br>`», pero la regla solo fija el almacenamiento (U+000A), las salidas sin saltos (« / ») y el Fragmento (`<br>`, AD-28).
- **Riesgo:** la Página de Cita, la Tarjeta de Cita, `BloqueDeCita` (portada y 404), el pasaje y el incipit pueden pintarse unos con `white-space: pre-line` y otros con `<br>`, con efectos distintos en Pagefind: «partes,Y» unido o separado, que es la consecuencia de FR-63 «la búsqueda encuentra igual». Es justo la divergencia que el AD anuncia.
- **Arreglo:** una sola función o componente que pase el texto de una Cita (o de un trozo literal de Fuente) a HTML, consumida por toda superficie. Una prueba sobre `dist/` busca en Pagefind una consulta que cruza un salto de verso.

### M3 — La prueba de cabida elige mal sus casos con los saltos restituidos

- **Dónde:** AD-8, «La prueba de cabida corre en el navegador… sobre las Citas publicadas **más largas** de cada tramo», y la enmienda v9 («corre con la banda y con los saltos de verso restituidos»).
- **Riesgo:** con verso, el peor caso de un tramo deja de ser el de más caracteres y pasa a ser el de más líneas forzadas, por ejemplo una redondilla de 120 caracteres con ocho versos. El tramo se elige por caracteres (`tramos.ts`), así que una Cita en verso puede no caber en el suyo, y la prueba no la pondría nunca delante.
- **Arreglo:** la selección por tramo incluye la Cita más larga **y** la de más saltos. Decir además si el tramo tiene en cuenta las líneas forzadas o si eso se queda en «lo cambia Héctor en la tabla».

### M4 — Los eventos nuevos de AD-13 no dicen si son de `METRICA_DE_ACCION`, y falta el corte de serie

- **Dónde:** AD-13, «Enmendado en la v9 — dos acciones nuevas».
- **Contra el código:** `src/lib/medicion.ts:526-535`. Toda acción de `METRICA_DE_ACCION` lleva `primera` y fuerza la lectura antes de la acción. «Informadas aparte, fuera de SM-5, SM-7 y SM-C3» no decide si entran en ese mapa con métrica propia (con `primera` y con la lectura delante) o fuera de él (sin `primera`). El fichero y la prueba de correspondencia divergirían por historia.
- **Arreglo:** declararlo. Recomendación: métrica propia en `METRICA_DE_ACCION`, para que la pregunta 15 del PRD tenga ya la serie que necesita. Decidir también si el despliegue v9 de la Página de Cita es **corte de serie** de SM-5 y SM-C5: añade bloques entre la Cita y Copiar o junto a Copiar, y AD-9 exige que un corte nuevo entre con su constante.

### M5 — AD-31 no nombra propiedades ni multiplicidad, ni quién escribe `vigentes.yml`

- **Dónde:** AD-31, 3.ª y 4.ª cláusula.
- **Riesgo:** dos historias leerán propiedades distintas para la lengua original (`P407` o `P364`) y harán cosas distintas con un `P136` de varios géneros («novela», «novela picaresca»): uno, todos o ninguno. La regla de «un único valor o ninguno» se escribió solo para la fecha. `vigentes.yml` no tiene orden que lo escriba: ¿se teclea, contra la convención de «ningún campo de Fuente se teclea»? Tampoco se dice si la revisión de la entidad del **Autor** que usa el cotejo de la orden se versiona y entra en `vigentes.yml`, ni si el build vuelve a cotejar al Autor cuando cambia su `nombre`.
- **Arreglo:** nombrar las propiedades (`P136`, `P577`, `P407` y `P50` para el cotejo) y una regla de multiplicidad por campo. Declarar la orden que escribe `vigentes.yml`, que descarga la revisión y la versiona. Fijar si el cotejo del Autor se repite en el build sobre la revisión versionada.

### M6 — «Cómo citar» no está fuera de Pagefind ni del JSON-LD

- **Dónde:** AD-28, «Enmendado en la v9». El Fragmento va bajo `data-pagefind-ignore="all"`. La Referencia no dice nada.
- **Riesgo:** tres Referencias por página repiten el Autor, el título de la Obra y, según el estilo, el texto, en cada Página de Cita y en la página 1 de cada Obra. Eso pesa en la relevancia de Pagefind y engorda el índice, contra NFR-13 y la regla que la propia espina aplica a la Tarjeta de Obra y a «Rutas de salida».
- **Arreglo:** «Cómo citar» va bajo `data-pagefind-ignore="all"` y fuera del JSON-LD, con la misma prueba sobre `dist/` que el Fragmento.

### M7 — El Entorno operativo no dice cómo se fusiona la v9, y la 25.2 adelantada sería una tercera excepción

- **Dónde:** Entorno operativo, «La unidad de fusión de la v8 es la épica… **Dos excepciones declaradas, y ninguna más**». PRD §6.8, punto 2: la Historia 25.2 «adelantada», con la Épica 25 en `backlog` (`sprint-status.yaml:432-434`).
- **Riesgo:** la v9 no dice su unidad de fusión. Si la 25.2 entra sola en la principal es una tercera excepción no declarada. Además, la Épica 28 está construida y sin fusionar en `v8/epica-28`, y toca `BloqueDeCita` y la Cita del Día: el verso de AD-29 y la banda de AD-8 entran en conflicto con ella según el orden de fusión.
- **Arreglo:** una viñeta *(v9)* en el Entorno operativo: la unidad de fusión, si la 25.2 entra sola —declarada como excepción— o con su épica, y el orden respecto de la Épica 28.

### M8 — Falta el sobre de peso de lo que la v9 añade a miles de páginas

- **Dónde:** AD-30, 4.ª cláusula («Su peso entra en la medida de `dist/`»); Entorno operativo, «Techos del alojamiento» (95–100 KB por Cita y el techo hacia 9.500–10.000 Citas), sin enmendar; *Deferred*, tope de HTML.
- **Hueco:** no hay estimación. Orden de magnitud: pasaje ≤ 1.200 caracteres, el Fragmento escapado (~0,7 KB), tres Referencias (~0,8 KB) y su marcado dan unos 3–5 KB por Página de Cita. Con ~5.000 Citas son 15–25 MB, cerca de un 4–5 % más por Cita. No cambia el techo, pero conviene escribirlo para que la medida diga algo.
- **Otros dos pesos sin nombrar:**
  - El **almacén de datos del cargador**, que guardaría un pasaje **por aparición**: una Cita que aparece en varios documentos lleva varios, y dos Citas del mismo párrafo lo duplican.
  - El tamaño en el repositorio de los JSON de revisión completos de entidades como «español» o «novela», que traen etiquetas y enlaces en cientos de lenguas.
- **Arreglo:** escribir la estimación en «Techos del alojamiento». Valorar que el cargador guarde el pasaje solo de la aparición que `obras.ts` elegiría, o por intervalo (documento, bloque), sin repetirlo. Nombrar el peso de `corpus/wikidata/` como aceptado.

### M9 — Componer «sus documentos» fecha todas las Citas de una Obra paginada al recuperar una página

- **Dónde:** AD-27, «Enmendado en la v9»: «La Página de Cita compone… **sus documentos**».
- **Riesgo:** si «sus documentos» son los de `documentosDeCita` (el casado por prefijo, la misma lectura que la Página de Obra), y un documento solo cuenta como «cambió» (AGENTS.md, 24.8), recuperar una página nueva de una Obra paginada fecha y avisa **toda** Página de Cita de esa Obra (cientos en una obra larga) aunque su pasaje no cambie.
- **Arreglo:** que la Página de Cita componga solo los documentos en que **aparece** su texto, según las posiciones. Una página nueva en la que aparece la Cita está en esa lista y fecha bien; las demás no fechan. Si se prefiere la lectura ancha, nombrar el coste.

---

## Bajos

- **B1 — AD-31 abre una excepción que no hace falta.** La extracción JSON → `{género, lengua, año}` es pura y puede vivir en `src/lib/`, que ya importan las órdenes de `tools/`. Solo la lectura del fichero tiene que ir en el cargador. Así no se abre la «segunda excepción nombrada a que `src/` no importe de `tools/lib/`».
- **B2 — AD-29, «ninguna línea vacía».** Una Cita que cruza estrofas pierde la separación de estrofa. Decir que es a sabiendas, porque el pasaje la conserva. La restitución en masa avisará de cientos de rutas en un solo commit: nombrarlo, y que la orden corra fuera de las sesiones de siembra que comparten el checkout.
- **B3 — AD-30, las dos funciones de texto.**
  - La que corta el incipit en fin de frase tiene que tratar las abreviaturas («D.», «Sr.», «S. M.»), o corta a media frase justo lo que NFR-12 prohíbe.
  - La de párrafo tiene que excluir la cabecera del documento (`obra:`, `autor:`…).
- **B4 — AD-30 frente a AD-19 y NFR-13.** El pasaje de la Cita A reproduce el texto de la Cita B del mismo párrafo. No es una agregación, y AD-19 no lo alcanza, pero conviene escribirlo, citando el supuesto del PRD (FR-59).
- **B5 — AD-28, el tope de guion.** `src/islands/CopiarCita.astro` es una isla en línea que se encuentra a sí misma por instancia. Si se reutiliza como cuatro instancias más (tres Referencias y el Fragmento), el guion en línea se multiplica contra `MAX_BYTES_DE_GUION` (6.656). La `[ASSUMPTION]` lo cubre a medias; recomendar una sola instancia que sirva a todos los blancos de copia de la página.
- **B6 — FR-64 y el mapa de capacidades.** Ningún AD dice quién recorta un texto de listado, y dos listados pueden recortar de dos formas. Basta una línea: o solo CSS, o una función con dueño. El mapa tampoco tiene fila para las enmiendas v9 de FR-51 y FR-54 (subir «Dónde leer esta obra», agrupar por formato y tienda, compartir en la página 1) ni para FR-14 ampliado.
- **B7 — AD-31, quién ata la entidad.** Que la entidad sea la de esa obra «lo decide una persona», y el PRD §6.8 lo da como acto de Héctor. Escribir, como para `autor.ts clave`, que ningún agente corre esa orden sobre el Corpus real.
- **B8 — AD-24 v9 (FR-62), la ventana.** Falta decir qué ventana ordena: la última de 28 días o la suma de las mensuales. Y que la Cita se resuelve a su Obra con el Corpus de hoy (una Cita retirada no suma). Sin esto, dos implementaciones ordenarán distinto. Decir también, como pide el PRD, que la orden avisa de que no cuenta la página de la Obra.
- **B9 — *Deferred*, «Estrategia de crecimiento del build».** No recoge la v9: los pasajes en el cargador y el cargador de Wikidata. Es un coste pequeño, pero la viñeta lleva la cuenta de lo que se suma.

---

## Lo que está bien

- AD-29 sitúa la decisión donde corresponde: el dato con U+000A, la forma canónica y el cotejo sin cambio de veredicto. Se comprobó en el código: `normalizar` (`src/lib/normalizar.ts:39`) y `colapsarEspacios` (`cotejo.ts:53`) pliegan `\s+`, y el slug no se recalcula (AD-4).
- AD-31 preserva AD-22 (red solo en la cáscara de `tools/`), AD-5 (resultado por parámetro) y AD-14/AD-24 (nada leído en vivo); el espacio propio, fuera del cotejo, sigue el patrón de AD-26.
- AD-30 contesta la pregunta 16 del PRD con un criterio comprobable (declaración por orden más localización que rompe el build), y deja fuera de Pagefind, JSON-LD, Imagen y lo copiado lo que debe quedar fuera.
- AD-28 conserva AD-12: la fecha de consulta es del cliente y nunca la del build.
- AD-25 v9: congelación oculta ediciones con la misma consulta `congelacionVigente`; AD-24 v9 mantiene el sitio ajeno a la serie de demanda.
- AD-13 v9 respeta el orden migración → receptor → sitio y la retención en `PENDIENTES`.
- *Deferred* v9 (portada de Commons, más campos de la Ficha técnica) no deja a dos unidades divergir.
