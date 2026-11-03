---
tipo: revisión adversaria
objeto: ARCHITECTURE-SPINE.md, partes de la v9 (AD-29, AD-30, AD-31 y los «Enmendado en la v9» de AD-3, AD-8, AD-13, AD-20, AD-24, AD-25, AD-27, AD-28)
fecha: 2026-11-03
método: pares de historias construidas por separado que cumplen cada AD al pie de la letra y aun así no encajan
---

# Revisión adversaria de la v9

**Veredicto.** La v9 nombra bien a los dueños de cada composición, pero deja sin fijar tres formas de datos compartidas —en qué coordenadas se marca la Cita dentro del pasaje, qué significa un salto en un documento de texto plano y qué forma tiene el resultado de Wikidata—. Deja además sin puerta en el build la regla «nadie teclea un salto», y fecha el pasaje por ficheros cuando lo que decide si cambia es una elección derivada. Hay dos huecos críticos y tres altos que conviene cerrar antes de partir la Épica en historias.

Contrastado con el código del árbol `brainlySabiduria-plan-v9`: `tools/lib/cotejo.ts` (`colapsarEspacios`, `localizar`), `src/lib/lienzo.ts` y `public/islas/imagen.js` (los dos parten por `\s+`), `src/islands/CopiarCita.astro` (`data-carga` compuesto en el build por `textoParaCopiar`), `src/lib/ingreso.ts` (`Tienda.marca` obligatoria, `urlDeEdicion`) y los documentos de `corpus/fuentes/` (267 de Gutenberg, 1.159 de Wikisource).

---

## 1. CRÍTICO — ¿En qué coordenadas van los desplazamientos de la Cita dentro del pasaje?

**Par.** La historia A (cargador de posiciones, AD-30) entrega `{documento, posición, pasaje, inicio, fin}` y toma `inicio` de `localizar`, que devuelve una posición **en el cuerpo colapsado**: sin espacios repetidos, sin saltos y sin los `INVISIBLES` que retira `colapsarEspacios`. La historia B (la Página de Cita) pinta el pasaje **crudo**, «con sus saltos», como pide AD-30, y marca `pasaje.slice(inicio, fin)`. Las dos cumplen AD-23 («el mismo localizador») y AD-30 («trozo literal… con el tramo marcado por desplazamientos»). El resultado es una marca que se va desplazando hacia la derecha un carácter por cada espacio doble, salto o invisible que haya antes de la Cita. Ninguna prueba lo caza si los ejemplos son de prosa limpia de Wikisource.

Al mismo hueco caen otras dos unidades que necesitan pasar de lo colapsado a lo crudo, y que escribirían cada una su propio mapa:
- la **restitución de saltos** (AD-29: «toma del documento el tramo que da el mismo localizador»);
- el **incipit** (AD-30: `desde` «se localiza», y se corta por frases o versos en el texto crudo).

Así salen tres traducciones de colapsado a crudo, y eso es el segundo localizador que AD-30 dice impedir.

Las unidades tampoco fijan la unidad de medida: UTF-16 (`String.prototype.slice`) o puntos de código (`Array.from`). Bastan las rayas o los signos fuera del BMP para que diverjan.

**Regla que lo cierra (enmienda de AD-23/AD-30).** `tools/lib/cotejo.ts` exporta, junto a `localizar`, **una sola** función `tramoEnCrudo(cuerpoCrudo, buscado) → {inicio, fin} | undefined`. Devuelve los desplazamientos en **unidades UTF-16 sobre el cuerpo crudo**, contado tras la cabecera del documento. Está construida sobre el mismo `localizar` y sobre un mapa colapsado→crudo que se calcula una vez por documento. La usan el pasaje, la restitución y el incipit, y ninguna otra traducción existe. Los desplazamientos del pasaje van **relativos al principio del pasaje** y en UTF-16. Una prueba fija, con un documento que tiene espacios dobles, saltos e invisibles delante de la Cita, que `pasaje.slice(inicio, fin)` colapsado es igual a la Cita colapsada.

## 2. CRÍTICO — Un salto en el texto plano no dice si es verso

**Par.** La historia A (restitución, AD-29) cambia por U+000A cada espacio de la Cita que en el documento es un salto: «solo cambia espacios por saltos». La historia B (pasaje, AD-30) pinta el pasaje «con sus saltos». Las dos cumplen. Pero los documentos de Gutenberg son **prosa con ajuste duro a ~70 columnas**: `gutenberg--7-de-julio.txt` corta «Serán / furtivos los ejemplares». La restitución convertiría en «verso» toda Cita en prosa de los 267 documentos de Gutenberg. El pasaje de esas Citas saldría con cortes arbitrarios a media frase. La Imagen y la Tarjeta las repartirían como poemas (AD-8/AD-29), y la meta descripción les metería « / ».

AD-29 dice que «una Cita cuyo documento no trae los saltos no cambia», pero en Gutenberg **todos** los documentos traen saltos. Lo que no traen es saltos con significado. Wikisource da en principio una línea por párrafo, y Gutenberg da tanto verso con sus líneas como prosa ajustada, así que no basta una regla por Fuente.

**Regla que lo cierra (enmienda de AD-23 y AD-29).** Cada documento declara en su cabecera la **semántica de sus líneas**, `lineas: logicas | ajustadas`. La escribe `recuperar` según la Fuente, y para Gutenberg queda `ajustadas` salvo que una persona declare `logicas` con una orden, nunca a mano. La restitución **solo** lee documentos `logicas`. En el pasaje y el incipit de un documento `ajustadas`, los saltos dentro de un bloque se pintan como espacio, y solo la línea en blanco separa. Sin declaración vale `ajustadas`: ausencia antes que verso inventado. La función de párrafo de AD-30 recibe esa semántica por parámetro.

Hay un hueco menor en la misma zona: las marcas de transcripción de Gutenberg (`_cursiva_`) entran tal cual en el pasaje y el incipit. Una sola función de `tools/lib/` debe decidir qué marcas se retiran o se traducen antes de publicar. Si no la hay, dos historias lo resolverán cada una a su modo, o nadie lo hará y saldrán subrayados en la página.

## 3. ALTO — «Nadie teclea un salto» no tiene puerta, y hay tres caminos que escriben `texto`

**Par 1, puerta esquivada.** Un fichero `.md` editado a mano con un `\n` en mitad de un verso pasa el cotejo, porque `colapsarEspacios` pliega el salto. También pasa el esquema y el slug, que no cambia. AD-29 lo prohíbe, pero nada en el build lo comprueba: es justo el fallo que AD-1 y AD-23 existen para cerrar.

**Par 2, rutas de escritura en conflicto.** La historia A restituye los saltos de 300 Citas. Después, la historia B, o una sesión de siembra, corre `documentar <slug> doc --texto "…"` para corregir una coma. El literal tecleado en una línea **sustituye** el `texto` y borra los saltos. El parecido (`MIN_PARECIDO_PARA_CORREGIR`, sobre la forma canónica) da 1,0 y no protesta. Al revés, `--texto $'verso\nverso'` deja teclear saltos. `extraer`, `alta` y `sembrar` tampoco dicen si escriben la Cita nueva con saltos o sin ellos. Habrá Citas sembradas en verso y otras planas según la orden que las publicó.

**Par 3, la línea vacía.** Una Cita que cruza dos estrofas tiene una línea en blanco en el documento. La restitución «solo cambia espacios por saltos» y produciría `\n\n`, que AD-29 prohíbe («ninguna línea vacía»). Una historia la reduce a un salto y otra se niega a restituir esa Cita.

**Regla que lo cierra (enmienda de AD-29).**
- **Un solo escritor del campo `texto`** en `tools/lib/`, `textoDeCita(documento, literal)`. Aplica la restitución con `tramoEnCrudo` (hueco 1) cuando el documento es `logicas` (hueco 2). Lo llaman `extraer`, `alta`, `sembrar`, `documentar` (también con `--texto`, cuyo literal se colapsa antes y se vuelve a restituir) y la orden de restitución.
- **Puerta en el build:** todo U+000A del `texto` corresponde a un salto del documento en el tramo localizado. Una Cita sin documento, o con documento `ajustadas`, no lleva ninguno. Si no se cumple, rompe con la ruta.
- **Una estrofa cruzada se restituye con un solo salto** en la frontera, y la regla lo dice.

## 4. ALTO — La fecha del pasaje: ficheros de más y ficheros de menos

AD-27 (v9) hace que la Página de Cita componga «sus documentos». Por el casado de `documentosDeCita`, eso significa **todas las páginas** de la Obra cuyo prefijo casa.

**De más.** `recuperar` añade la página 201 de una Obra paginada y refecha y avisa las 200 Páginas de Cita de esa Obra, aunque ninguna cambie de pasaje. Es el caso «308 de Unamuno» que la v8 cerró, abierto de nuevo por otra puerta.

**De menos.** El pasaje depende de la **aparición que elige `obras.ts`**, y esa elección depende de cosas que la relación de la Cita no compone:
- las `formas` de la ficha: `reunir` cambia qué documentos son de la Obra sin tocar el título, que es lo único de la ficha que la Cita compone;
- el índice de subpáginas que AD-23 versionará aparte, y que reordena sin tocar ningún documento;
- `MAX_CARACTERES_DEL_PASAJE` en `umbrales.ts`: subirlo hace aparecer pasajes en miles de páginas sin fechar ninguna;
- el propio código de la función de párrafo.

Una historia escribe la relación tal como la dicta AD-27 y otra cambia cualquiera de esas entradas. Las dos cumplen, y el `lastmod` miente.

**Regla que lo cierra (enmienda de AD-27).** El pasaje se fecha por su **valor derivado** y no por su conjunto de ficheros. La componente de la Página de Cita es `(documento elegido, huella del pasaje con sus desplazamientos)`. Se calcula en el estado de antes y en el de después con las mismas funciones puras, y fecha solo si cambia. Si el mecanismo de campos no admite valores derivados, la regla mínima es esta: la Página de Cita compone **solo el documento de la aparición elegida**, más las `formas` de su ficha y `MAX_CARACTERES_DEL_PASAJE`. Una prueba fija que añadir una página a una Obra no refecha las Páginas de Cita cuya aparición no cambia. El mismo criterio, el valor y no la clave, sirve para `ordenRevisado` (hueco 9).

## 5. ALTO — `vigentes.yml` no tiene escritor, y la Ficha técnica no tiene puerta en el build

**Par 1, dos escritores.** La historia A (declarar la entidad de una Obra) añade a `vigentes.yml` la revisión **de hoy** de cada entidad referida que encuentra: «novela», «español». La historia B (otra Obra, otro día) hace lo mismo y **sobrescribe** «novela» con una revisión más nueva. Las dos cumplen «una revisión vigente por entidad». La segunda refecha y avisa en silencio **toda** Obra novela (AD-27 v9), en un commit que solo quería declarar una. Ninguna AD dice quién escribe `vigentes.yml` ni si declarar una Obra puede mover una vigente.

**Par 2, puerta esquivada.** La orden coteja el autor de la entidad antes de escribir `wikidata: {entidad, revisión}`. El build no repite ninguna comprobación: un `wikidata` editado a mano, un documento `{Q}--r{N}.json` que falta o un `N` que no es la revisión del fichero pasan sin que nada proteste. AD-26 sí rompe en el caso equivalente de la biografía. Tampoco consta de dónde sale la «revisión versionada de esa persona» con la que se coteja: si es una vigente, cambiarla no vuelve a cotejar nada.

**Par 3, forma del resultado.** La extracción da `{género, lengua, año}`, pero `género` (P136) y la lengua tienen a menudo varios valores en Wikidata. Una historia guarda un escalar con el primero, otra una lista, y la Página de Obra los pinta distinto. Para el año, AD-31 sí dice «con más de uno, ninguno». Para el género no dice nada.

**Regla que lo cierra (enmienda de AD-31).**
- `vigentes.yml` lo escribe **una sola orden de `tools/`**, que solo **añade** las entidades que faltan. Cambiar la revisión de una vigente es una orden aparte y explícita, que informa de cuántas Obras refecha.
- **El build comprueba** que el documento de `wikidata` existe y es esa revisión, y que cada entidad referida que se pinta tiene su vigente. También **repite el cotejo de autor**, con la persona leída de una revisión declarada en la ficha y no de `vigentes.yml`. Si algo falla, rompe nombrando la ficha.
- **Forma fija:** `{generos: string[], lenguas: string[], año?: number}`. Las listas van en el orden de las declaraciones de la revisión, se omiten si quedan vacías, y cada etiqueta sale de la vigente en español; sin ella, ese valor se omite.

## 6. MEDIO — El formato de la fecha de consulta: ¿lo compone `atribucion.ts` o la isla?

**Par.** La historia A (`atribucion.ts`) compone la Referencia en el build, en APA, MLA y Chicago, y la deja en `data-carga` como hace hoy `textoParaCopiar`. La historia B (la isla de copiar, AD-28) mete la fecha «al copiar y al pintar». Para hacerlo, B tiene que formatear la fecha **según el estilo**: APA «Recuperado el 3 de noviembre de 2026», MLA «Consultado el 3 nov. 2026». Eso es una cuarta composición fuera del único dueño, escrita a mano en el guion. Además, la isla no sabe en qué punto de la carga va la fecha, salvo que A deje un marcador que B adivine.

**Regla que lo cierra (enmienda de AD-28).** `atribucion.ts` exporta una función pura `fechaDeConsulta(estilo, fecha)` que **viaja a la isla por su texto**, con el patrón de `asentamientoDeBusqueda`. La Referencia del build lleva un **marcador declarado como constante** en el punto exacto de la fecha, y el texto «sin fecha», que es lo que se ve sin JavaScript. La isla solo sustituye el marcador. Una prueba fija que lo pintado sin guion y lo copiado con fecha salen de las mismas funciones.

## 7. MEDIO — La prueba de cabida con los saltos restituidos pone la principal en rojo sin dueño

**Par.** La historia A restituye los saltos (AD-29). La prueba de cabida de AD-8 corre «con los saltos restituidos». Una Cita de 280 caracteres que en prosa cabía, en seis versos ya no cabe en el 9:16. La prueba falla, y la regla dice que lo que se cambia es «el reparto de la tabla, que es un acto de Héctor». Así, el commit de una orden de `tools/` deja `npm test` en rojo hasta un acto humano, y ningún agente lo puede arreglar sin saltarse la regla. FR-10 tiene ya una salida de ausencia para una Cita que no cabe: la Cita no tiene Imagen.

**Regla que lo cierra (enmienda de AD-8/AD-29).** La orden de restitución corre la misma comprobación de cabida **antes de escribir** y deja sin restituir, informándolo, la Cita que dejaría de caber. Si no, la regla debe decir cuál de las dos cosas manda: que la Cita pierda la Imagen (ausencia) o que se pare hasta Héctor. Hoy no lo decide ninguna AD.

## 8. MEDIO — El incipit no tiene lector con nombre, y su documento puede dejar de ser de la Obra

**Par 1, dueño.** AD-30 dice que «nadie más» que el cargador de posiciones lee el cuerpo de un documento para publicarlo. Pero ese cargador va **por Cita** (`{slug → apariciones}`) y el incipit va **por ficha**. Una historia lo mete en el cargador de posiciones y otra crea un tercer cargador, que sería una tercera excepción a «`src/` no importa de `tools/lib/`» (AD-31 solo nombra dos). Una tercera calcula el corte en `obras.ts` con el cuerpo recibido por parámetro. Tampoco se dice dónde vive la «sola función» que corta por frase o verso.

**Par 2, puerta incompleta.** La orden comprueba que el documento del incipit «es de esa Obra por el casado de `documentosDeCita`». Pero ese casado va por Cita, y los documentos de una Obra son la unión sobre sus Citas. Tras `separar`, `reunir` o retirar la última Cita de esa Fuente, el documento deja de ser de la Obra. El build solo rompe si `desde` «deja de localizarse», y entonces se publica el principio de otro libro.

**Regla que lo cierra (enmienda de AD-30).** El incipit lo entrega **el mismo cargador** que el pasaje, en una segunda clave por nombre de ficha, con su forma (`{documento, texto}`). Lo corta una función de `tools/lib/` vecina de la de párrafo. El build comprueba en cada construcción **las dos cosas**: que el documento sigue en el conjunto de documentos de la Obra y que `desde` se localiza con `tramoEnCrudo`.

## 9. MEDIO — Invertir el nombre con la clave revisada no fija la regla

**Par.** La historia A invierte el nombre en APA como `{ordenAlfabetico}, {iniciales del resto}`, y la historia B como `{apellidos tal como los escribe el nombre}, {nombre}`. Para «Miguel de Cervantes Saavedra», con clave «Cervantes», salen «Cervantes, M. de» y «Cervantes Saavedra, Miguel de». Las dos usan solo la clave revisada, como pide AD-28. Si la clave corregida a mano no es una subcadena contigua del nombre, que es el caso para el que existe `clave`, la inversión no tiene definición.

Revisar una clave refecha también todas las Páginas de Cita del Autor (AD-27 v9), aunque la Referencia salga idéntica.

**Regla que lo cierra (enmienda de AD-28).** `atribucion.ts` tiene **una** función `nombreInvertido(nombre, ordenAlfabetico)` que solo invierte cuando la clave es un tramo contiguo del nombre que termina el nombre o lo termina antes de un sufijo declarado. En cualquier otro caso devuelve el nombre tal cual. Las iniciales son la regla de un estilo y se fijan por prueba. Revisar una clave fecha por el valor de la Referencia (hueco 4), no por el campo.

## 10. MEDIO — La tienda sin marca: la puerta tiene el grano equivocado, y la congelación contradice a la orden

**Par 1.** La historia A declara las dos tiendas que fija el PRD, sin marca, como permite AD-20 v9. Héctor recibe primero la cuenta de una sola y le pone marca. Con la afiliación encendida, el build **se para** por la otra tienda, que sigue sin marca (AD-20: «alguna tienda sin marca»). Para encender hay que retirar la segunda, y eso exige antes quitar con `quitar-edicion` todas sus ediciones de toda ficha, que es justo el trabajo de curación que la v9 quería conservar.

**Par 2.** `urlDeEdicion` recibe `Pick<Tienda, 'parametro'|'marca'>`. Con `marca` opcional, una historia la tipa `marca?: string` y añade `tag=` vacío o se lo salta en silencio. Otra lanza. Cualquier camino de `tools/` que componga una URL de edición, como el parte de `edicion`, una Pieza o el Kit, queda fuera de la puerta del build.

**Par 3.** AD-25 v9: con la familia Obra congelada, las ediciones «se quedan en la ficha». Hoy `obra edicion` se niega con código 1 si la familia está congelada (AGENTS.md, 22.9). Una historia mantiene la negativa y otra la levanta para «curar antes de solicitar», y las dos citan la v9.

**Regla que lo cierra (enmienda de AD-20/AD-25).**
- La puerta se para por una tienda sin marca **solo si alguna de sus ediciones se pintaría**: con el Modelo encendido, en una Obra con Cita cotejada y sin congelación. Una tienda sin marca y sin nada que pintar no para nada.
- `urlDeEdicion` exige un tipo `TiendaConMarca`, que solo produce un estrechamiento con nombre. Ninguna función compone una URL con una tienda sin marca.
- La AD dice expresamente si `obra edicion` admite declarar bajo congelación.

## 11. MEDIO-BAJO — ¿Quién decide «pasaje igual a la Cita», y de qué página sale?

**Par 1.** AD-30: «si coincide con la Cita colapsada, no hay pasaje». La historia A (el cargador) lo omite en la entrega. La historia B (`obras.ts` o la página) lo compara al pintar, con `normalizar`, que pliega tildes y puntuación y declara iguales cosas que no lo son. Resultado: dos dueños y dos criterios.

**Par 2.** La aparición que elige `obras.ts` puede estar en una página del documento distinta de la que enlaza la Línea de la Fuente de esa Cita. Es lo que pasa con una Cita repetida en un índice o en una página de citas. El visitante lee «Lee el pasaje» de una página y el enlace le lleva a otra.

**Regla que lo cierra.** Lo decide el cargador, con `colapsarEspacios` y nunca con `normalizar`, y entrega ausencia. La Línea de la Fuente de la Página de Cita enlaza **el documento de la aparición elegida**, o el pasaje lo nombra. Una prueba fija que los dos coinciden.

## 12. MEDIO-BAJO — Lo copiado, `data-texto-plano` y Pagefind con `<br>`

- **Lo copiado no tiene forma fija.** AD-29 lista las salidas que reciben « / » (meta, JSON-LD, Referencia en línea), pero no dice qué recibe **lo copiado** (FR-3, `textoParaCopiar`) ni `data-texto-plano` (UX-DR26). Una historia deja `\n` en `data-carga`, otra pasa por la función de « / ». Que aparezcan o no en la lista debe decidirlo la AD.
- **Pagefind.** AD-29 afirma que con saltos Pagefind «es el mismo», pero eso vale para el texto del fichero, no para el marcado. Si la página pinta el verso con `<br>` sin espacio en el texto, el extractor de Pagefind puede unir la última palabra de un verso con la primera del siguiente («almaquiero»), y la búsqueda deja de encontrar la Cita. **Regla:** la página pinta el verso con un salto de texto real más `<br>`, o con `white-space: pre-line` sobre el `\n`. Una prueba sobre el índice de `dist/` busca una palabra a cada lado de un salto.
- **Imagen.** `imagen.js` tiene que recibir el texto con `\n` por `data-*`. Si alguna vez lo leyera del `textContent` de un `<blockquote>` con `<br>`, unirá los versos sin espacio. La prueba de líneas iguales de AD-29 debe cubrir el texto tal como llega del marcado, no un literal de prueba.

## 13. BAJO — Fragmento para insertar: dónde vive, y la clase que se cuela

- **La clase que se cuela.** Si la «sola función» de AD-29 devuelve HTML para la página (por ejemplo `<br class="verso">`) y el Fragmento la reutiliza, el Fragmento lleva una `class` que AD-28 prohíbe. **Regla:** la función de saltos devuelve **líneas** (`string[]`) o la forma « / », nunca marcado. Cada salida compone su propio HTML. La prueba de `dist/` del Fragmento admite solo `br`, `blockquote`, `p`, `cite` y `a[href]` sin otros atributos.
- **Previsualizarlo con marcado vivo.** Si una historia previsualiza el Fragmento como marcado vivo en `<main>`, su `<a>` es un enlace interno sin zona. La prueba de `medicion.test.ts` lo rechaza, y una exención nueva es de Héctor (UX-DR111). **Regla:** el Fragmento solo aparece en la página como **texto escapado** (por ejemplo, en un `textarea` de solo lectura o en `data-carga`), nunca como marcado vivo.

## 14. BAJO — Las acciones retenidas de AD-13

La historia del botón (Fragmento o Referencia) y la de liberar la acción de `PENDIENTES` van por separado. Si la primera escribe ya `__medir('copiar-fragmento')`, el arranque encola un evento que el fichero no conoce. **Regla:** mientras el evento siga en `PENDIENTES`, el guion no lo nombra. Que sea la prueba de vocabulario la que lo vigile, no la memoria de quien construye.

---

## Resumen de enmiendas propuestas

| # | Severidad | AD | Enmienda |
|---|---|---|---|
| 1 | Crítico | AD-23/30 | `tramoEnCrudo` único en `cotejo.ts`, UTF-16 sobre el crudo; lo usan el pasaje, la restitución y el incipit |
| 2 | Crítico | AD-23/29/30 | `lineas: logicas \| ajustadas` en la cabecera; restituir solo de `logicas`; reflujo en `ajustadas`; una función para las marcas de transcripción |
| 3 | Alto | AD-29 | un solo escritor de `texto`; puerta en el build sobre cada `\n`; la estrofa cruzada lleva un salto |
| 4 | Alto | AD-27 | el pasaje se fecha por su valor derivado (o solo por el documento elegido + `formas` + umbral) |
| 5 | Alto | AD-31 | un escritor de `vigentes.yml` que solo añade; puerta y cotejo de autor en el build; forma `{generos[], lenguas[], año?}` |
| 6 | Medio | AD-28 | `fechaDeConsulta` viaja a la isla por su texto; marcador declarado |
| 7 | Medio | AD-8/29 | la restitución comprueba la cabida antes de escribir |
| 8 | Medio | AD-30 | el incipit lo entrega el mismo cargador; el build comprueba que el documento es de la Obra |
| 9 | Medio | AD-28 | `nombreInvertido` con regla fija; fecha por valor |
| 10 | Medio | AD-20/25 | la puerta solo mira lo que se pintaría; `TiendaConMarca`; decidir si `edicion` se admite bajo congelación |
| 11 | Medio-bajo | AD-30 | el cargador decide la igualdad con `colapsarEspacios`; la Línea de la Fuente enlaza el documento elegido |
| 12 | Medio-bajo | AD-29 | forma de lo copiado; verso con salto real para Pagefind; la Imagen lee `data-*` |
| 13 | Bajo | AD-28/29 | la función de saltos devuelve líneas; el Fragmento solo como texto escapado |
| 14 | Bajo | AD-13 | el guion no nombra eventos que siguen en `PENDIENTES` |
