/**
 * AD-9 — Los umbrales son configuración con nombre.
 *
 * Ningún literal numérico de regla de negocio aparece fuera de este módulo. Lo que
 * impide es concreto: que un umbral viva como literal en tres sitios y una revisión
 * futura cambie dos de ellos.
 *
 * Ojo con lo que AD-9 **no** cierra: que el número tenga nombre no dice quién lo aplica.
 * De eso se ocupa AD-11 y su dueño único del conjunto publicable, `publicado.ts`.
 */

/**
 * Citas publicadas que necesita un Tema para publicarse — FR-6.
 *
 * Por debajo de esto un Tema es una página con cuatro entradas, que ni ayuda al visitante
 * ni sostiene una consulta de buscador.
 */
export const MIN_CITAS_POR_TEMA = 15;

/**
 * Longitud máxima de una Cita para ofrecer Imagen — FR-10, UX-DR19.
 *
 * Por encima, el texto no cabe en la imagen sin bajar de un tamaño legible, y recortarlo
 * está prohibido: la acción no se ofrece.
 */
export const MAX_CARACTERES_IMAGEN = 300;

/** Entradas por página en los listados de Autor y de Tema — FR-5. */
export const CITAS_POR_PAGINA = 50;

/** Citas del mismo Autor que ofrece una Página de Cita como ruta de salida — UX-DR17. */
export const MAX_CITAS_RELACIONADAS = 4;

/**
 * Saltos de enlace interno desde la portada en los que toda superficie publicada debe
 * alcanzarse — NFR-5, AD-11 extendido.
 *
 * Publicable y alcanzable son el mismo conjunto: una página anunciada a la que no llega
 * ningún enlace es una página que solo existe para el buscador. Tres saltos es lo que hoy
 * cuesta lo más hondo del sitio —portada, Autor o Tema, Cita—, y dejarlo acotado impide
 * que una superficie nueva se cuelgue de una cadena cada vez más larga.
 */
export const MAX_SALTOS_DESDE_LA_PORTADA = 3;

/**
 * Suelo de Autores de tradición latinoamericana, en porcentaje — §6.1 del PRD.
 *
 * El suelo es explícito porque el sesgo hacia España es el resultado por defecto de
 * cualquier curación no vigilada: se llega a él sin decidirlo, empezando por los autores
 * que uno tiene más a mano.
 */
export const SUELO_TRADICION_LATINOAMERICANA = 40;

/**
 * Tope de bytes de guion en línea que puede llevar una Página de Cita — AD-6, NFR-2.
 *
 * Existía como literal dentro de la prueba de la Historia 2.1, que además solo medía
 * construcciones **sin** medición configurada: el guion que instala `medicion.ts` no
 * entraba en la cuenta y creció dos veces sin que nadie lo viera. Con nombre y en un solo
 * sitio, las dos pruebas —la de la página y la de la página con medición— parten del
 * mismo número, y subirlo es una decisión visible en el diff.
 *
 * No cuenta el `application/ld+json` de los datos estructurados: no es JavaScript
 * ejecutable y el navegador no lo interpreta.
 *
 * Subido de 6144 a 6656 en la v2, por el motivo que la propia prueba de la Historia 2.1
 * dejó previsto —«se sube cuando una isla nueva entra a propósito, no cuando algo engorda
 * por su cuenta»—: la Historia 10.3 añadió una tercera isla, la de compartir enlace.
 * Antes de subirlo se compactó el guion de medición, que pasó de 952 a 572 bytes; el tope
 * nuevo deja unos 400 de margen, suficiente para no ir justo y poco para que un
 * crecimiento futuro pase inadvertido.
 */
export const MAX_BYTES_DE_GUION = 6656;

/**
 * Citas publicadas **resueltas** que necesita una Colección para publicarse — FR de la
 * Épica 12, §14.4 del PRD.
 *
 * **VALOR PROVISIONAL.** El PRD deja este umbral abierto a propósito y dice de dónde
 * saldrá el definitivo: de curar las tres o cuatro primeras Colecciones y ver cuántas
 * Citas reúne de verdad un criterio editorial que merezca página. Hasta entonces esto es
 * un marcador de posición con nombre, no una decisión tomada.
 *
 * Arranca igual que `MIN_CITAS_POR_TEMA` porque las dos superficies alimentan la misma
 * contra-métrica —la mediana de Citas por agregación publicada— y empezar igualadas
 * garantiza que una Colección no pueda hundir esa mediana por debajo de lo que un Tema ya
 * puede. Es el arranque prudente: la vía barata de multiplicar páginas indexables es
 * fabricar Colecciones de cinco Citas, y este número existe para cerrarla. El definitivo
 * puede bajar —una Colección es curada a mano y no acumula por deriva como un Tema— pero
 * esa rebaja se decide con Colecciones curadas delante, no aquí.
 *
 * Se aplica al recuento **resuelto**, jamás al declarado: quien lo aplica es
 * `coleccionesPublicadas` en `src/lib/publicado.ts` (AD-11), y es el único sitio **que
 * decide qué se publica**.
 *
 * La precisión no es un matiz: desde la Historia 12.4 hay otros dos lectores de este número
 * —`huecoDeColeccion`, que dice cuántas Citas le faltan a una Colección, y las órdenes que
 * lo escriben en su informe—. Ninguno filtra nada ni genera ninguna ruta: informan. Que
 * lean el mismo número es justamente lo que hace que «le faltan cuatro» y «no se publica»
 * hablen de lo mismo; lo que estaría mal es que decidieran con él.
 */
export const MIN_CITAS_POR_COLECCION = 15;

/**
 * Caracteres que puede medir el criterio de una Colección — Historia 12.3.
 *
 * El criterio no es solo texto de la página: la Página de Colección lo emite **tal cual**
 * como su `<meta name="description">` y como su `og:description`, porque NFR-12 prohíbe
 * que el sistema altere lo que el editor guardó. Eso deja una sola forma sana de acotarlo:
 * en la puerta de admisión, donde el editor todavía lo está escribiendo y puede arreglarlo,
 * y no en la página, donde recortarlo sería reescribirlo.
 *
 * 160 es el punto a partir del cual una descripción se corta con puntos suspensivos en los
 * resultados de búsqueda. Un criterio que no cabe ahí no se publica entero, y entonces la
 * página anuncia media razón de existir. Es holgado para lo que el campo pide —una frase
 * que diga por qué estas Citas están juntas—: el de partida mide setenta y cuatro.
 *
 * Si algún día el criterio necesita más aire como texto editorial, lo que hay que cambiar
 * **no** es este número sino dejar de usarlo literalmente como descripción. Esa es una
 * decisión de diseño, y así se toma mirándola, no desbordando en silencio.
 */
export const MAX_CARACTERES_CRITERIO = 160;

/**
 * Proporción de palabras con señales de OCR roto que un texto puede traer — Historia 11.5.
 *
 * **VALOR PROVISIONAL**, y conviene decir de qué sale. Sale de **un solo documento
 * corrupto**, el *Apéndice a Mis últimas tradiciones peruanas* de Palma que la primera
 * sesión de sembrado recuperó, más los cincuenta y cinco documentos sanos que el Corpus
 * tiene versionados. Cuando haya más corruptos habrá que moverlo, y moverlo será una
 * decisión visible en el diff, que es para lo que este módulo existe.
 *
 * De dónde sale el 2 %. Medidos los documentos sanos con `src/lib/legibilidad.ts` —Gracián,
 * Rodó, Montalvo, el Quijote entero de Gutenberg, Machado, Sor Juana, Séneca, Unamuno,
 * González Prada: unas 450.000 palabras— el corpus sano entero dispara **dos** señales, y
 * el peor documento se queda en el 0,49 % (una página de índice de 204 palabras). Las
 * frases reales del documento de Palma se van del 5 % para arriba. Entre 0,49 y 5 hay
 * sitio de sobra, y 2 deja un margen de cuatro veces sobre lo peor que se ha visto sano.
 *
 * El mismo número mide un documento entero y una candidata suelta, y eso no es un descuido
 * sino el efecto que se busca: en un documento de diez mil palabras un tropiezo aislado no
 * mueve la aguja, y en una candidata de treinta —el largo que la extracción admite— uno
 * solo la condena. Un documento no se juzga por su peor renglón; una Cita sí, porque se
 * publica entera y con la firma de su Autor.
 *
 * Quien lo aplica es `tools/lib/extraccion.ts`, en la extracción y no en la puerta literal
 * de la Historia 11.2: son dos puertas que miden cosas distintas —que no nos hayamos
 * inventado el texto, y que la edición de la que salió se pueda leer— y juntarlas dejaría
 * un solo mensaje de error para dos averías.
 */
export const MAX_PROPORCION_ILEGIBLE = 0.02;

/**
 * Los cuatro Umbrales de Activación de los Modelos de Ingreso — Épica 14, AD-9, AD-21.
 *
 * Están aquí y en ningún otro sitio: ni en el mando de `tools/`, ni en el paso de CI, ni
 * en ninguna página. Quien los cruza con el estado de cada Modelo es `src/lib/ingreso.ts`,
 * que es el dueño único de ese estado; estos números son solo el número.
 *
 * El orden en el que se encienden no es por ingreso esperado sino por **coste sobre el
 * producto**: primero lo que no cuesta nada y último lo que degrada superficie. De ahí que
 * publicidad pida diez veces más sesiones que la afiliación.
 *
 * Y ojo con lo que un número aquí **no** dice: que cruzarlo encienda nada. En la afiliación
 * dispara la solicitud de la cuenta, que es un acto con reloj propio. Eso lo declara cada
 * Modelo en `ingreso.ts`, no este fichero.
 */

/**
 * Sesiones orgánicas al mes que activan la **afiliación de libros** — Épica 14.
 *
 * Mide sesiones, no sesiones monetizables, y la diferencia está abierta a propósito: en
 * América solo hay programa de Amazon Afiliados en EEUU, Canadá, Brasil y México, y con el
 * suelo del 40 % de Autores de tradición latinoamericana buena parte del tráfico no es
 * monetizable por afiliación de producto físico. El número se deja como está hasta que esa
 * cuestión se decida; cambiarlo antes sería fingir que ya se decidió.
 */
export const SESIONES_PARA_AFILIACION = 2000;

/** Sesiones orgánicas al mes que activan el **producto propio** — Épica 14. */
export const SESIONES_PARA_PRODUCTO_PROPIO = 5000;

/**
 * Sesiones orgánicas al mes que activan la **publicidad acotada** — Épica 14.
 *
 * El más alto de los tres porque es el único que degrada la superficie que produce el
 * ingreso. La contra-métrica que lo vigila —rebote de la Página de Cita y tiempo hasta el
 * contenido— es la razón de que encender sea un gesto humano y reversible.
 */
export const SESIONES_PARA_PUBLICIDAD = 25000;

/**
 * El Umbral de las **donaciones**, que no es un número — Épica 14, LC-1…LC-4.
 *
 * Se declara como lista de condiciones y no como cifra porque no lo es: son las cuatro
 * Condiciones de Lanzamiento verificadas. Escribirlo como número —«0 sesiones», «cuando
 * toque»— habría metido las donaciones en la misma casilla que las otras tres y con ella la
 * equivalencia «cruzado ⇒ encender», que no vale para las cuatro filas.
 *
 * Quién las verifica: el dueño, ejecutando `DESPLIEGUE.md`. Ningún agente y ninguna orden
 * abren esa puerta. Hoy LC-4 sigue abierta.
 */
export const CONDICIONES_PARA_DONACIONES = ['LC-1', 'LC-2', 'LC-3', 'LC-4'] as const;

/**
 * La **Meta de Corpus** — el listón agresivo de la v4, decidido por Héctor el 24/08/2026.
 *
 * Estos cuatro números no son umbrales de publicación: son una **ambición**. La diferencia
 * importa y por eso viven juntos y separados de los de arriba. `MIN_CITAS_POR_TEMA` decide
 * si una página existe para el visitante; esto decide cuánto le falta al Corpus para ser lo
 * que se quiere que sea. Un umbral que se mueve rompe páginas publicadas; una meta que se
 * mueve solo cambia a qué se dedica la próxima sesión.
 *
 * De dónde salen. El Corpus del 24/08/2026 tenía 252 Citas, 8 Temas, 17 Autores y ninguna
 * Colección, y `objetivoDeSesion` devolvía «no hay hueco que cerrar»: los criterios de la
 * Historia 11.4 estaban **cumplidos** y el bucle autónomo se quedaba sin trabajo derivable.
 * La meta existe para que vuelva a haberlo, y su tamaño sale de lo que ya está en el
 * repositorio: **59 documentos de Fuente versionados, 489.690 palabras**, de los que solo
 * han salido esas 252 Citas.
 *
 * Quien las cruza con el estado es `meta.ts`, y nadie más. Ninguna de las cuatro filtra
 * nada ni decide qué se publica: eso sigue siendo de `publicado.ts` (AD-11).
 */

/**
 * Citas publicadas a las que aspira el Corpus — Meta de Corpus v4.
 *
 * Mil sobre 489.690 palabras recuperadas es una Cita por cada 490 palabras, y hoy la
 * proporción real es una por cada 1.943. No es, por tanto, una cifra que pida recuperar
 * mucho más: pide **exprimir lo que ya está**, que es exactamente lo que estaba sin hacer.
 */
export const META_CITAS_PUBLICADAS = 1000;

/**
 * Temas publicados a los que aspira el Corpus — Meta de Corpus v4.
 *
 * La Página de Tema es la superficie con forma de consulta —«frases sobre la amistad»— y
 * ocho es una red muy pequeña para un sitio que vive de la cola larga. Veinticuatro Temas a
 * `MIN_CITAS_POR_TEMA` son 360 Citas colocadas como mínimo, holgadamente por debajo de la
 * meta de volumen: la anchura cabe dentro del fondo y no compite con él.
 *
 * Cuenta Temas **publicados**, no declarados. Un Tema con cuatro Citas no es una página que
 * exista para nadie, y contarlo aquí dejaría la meta alcanzable abriendo ficheros vacíos.
 */
export const META_TEMAS_PUBLICADOS = 24;

/**
 * Autores en el Corpus a los que aspira — Meta de Corpus v4.
 *
 * Treinta y cinco es el doble largo de los diecisiete de hoy, y va atado al techo de
 * concentración: es el censo que hace falta para que ningún Autor tenga que cargar con más
 * del `TECHO_CONCENTRACION_POR_AUTOR`. Con treinta y cinco Autores, el reparto plano es el
 * 2,9 % cada uno — el techo del 15 % deja sitio de sobra para que unos pesen más que otros
 * sin que ninguno sea el Corpus entero.
 *
 * Sigue sin decir **a quién**: el `SUELO_TRADICION_LATINOAMERICANA` caracteriza por
 * tradición y esta cifra solo cuenta. Quién entra es del editor, y ninguna meta lo delega.
 */
export const META_AUTORES = 35;

/**
 * Colecciones publicadas a las que aspira el Corpus — Meta de Corpus v4.
 *
 * Es el tramo más barato de los cuatro y por eso va primero en el escalonado: una Colección
 * **no siembra nada**. Se cura sobre Citas ya publicadas, así que doce Colecciones son doce
 * superficies indexables nuevas a coste de curación y con cero riesgo editorial.
 *
 * Doce y no más porque `MIN_CITAS_POR_COLECCION` son 15 y las 252 Citas de partida dan para
 * eso sin que la mediana de Citas por agregación publicada se hunda, que es la
 * contra-métrica que ese umbral vigila. Cuando el volumen suba, esta cifra puede subir; lo
 * que no puede es subir antes que él.
 */
export const META_COLECCIONES_PUBLICADAS = 12;

/**
 * Porcentaje de las Citas del Corpus que puede aportar **un solo Autor** — Meta de Corpus v4.
 *
 * Es el número que impide que la meta de volumen se cumpla por el camino fácil. El 24/08/2026
 * Gracián aportaba **114 de 252 Citas, el 45,2 %**, y no por decisión editorial ninguna: el
 * *Oráculo manual* son trescientos aforismos ya troceados, y Machado hay que leerlo entero
 * para sacar seis. Es literalmente el sesgo que `objetivo.ts` describe —«un agente que
 * siembra sin supervisión deriva hacia lo que es más fácil de encontrar»— materializado en
 * una cifra. Sin techo, mil Citas se alcanzan minando más Gracián.
 *
 * **VALOR PROVISIONAL.** Sale de cruzar `META_AUTORES` con lo que se considera un Corpus que
 * no es la antología de nadie: con 35 Autores el reparto plano es el 2,9 %, y 15 deja que el
 * más representado pese cinco veces la media sin ser el Corpus. Cuando haya treinta Autores
 * de verdad se sabrá si sobra o falta, y moverlo será un diff visible.
 *
 * Cómo se cierra, que no es evidente: **diluyendo, nunca quitando**. Una Cita publicada no se
 * despublica, así que el hueco que este techo declara se mide en Citas de **otros** Autores.
 * Con Gracián en 114 y un techo del 15 %, el Corpus tiene que llegar a 760 Citas para que su
 * peso baje solo — y de ahí sale buena parte de la meta de volumen.
 */
export const TECHO_CONCENTRACION_POR_AUTOR = 15;

/**
 * Caracteres que necesita una Cita para que su **contención** dentro de otra cuente como
 * posible duplicado — Historia 15.2.
 *
 * El detector de duplicados de la Historia 1.6 compara formas canónicas **iguales**, y eso deja
 * pasar el caso que de verdad ocurre: la misma sentencia publicada dos veces, una entera y otra
 * recortada. Pasó en el Corpus el 25/08/2026 con «la diligencia es madre de la buena ventura» y
 * su versión larga; el sitio quedó con dos URL que solo se diferenciaban en un dígito, porque
 * `slugLibre` resolvió la colisión renombrando en silencio y el informe dijo «cero duplicados».
 *
 * De dónde sale el número, y por qué hay número. Sin suelo, cualquier Cita corta quedaría
 * atrapada por cualquier Cita larga que contuviese sus palabras —«Yo sé quién soy» mide 13
 * caracteres canónicos y cabe en media literatura—, y un aviso que salta de más es un aviso que
 * el editor aprende a ignorar, que es peor que no tenerlo. Cuarenta es holgado para lo que hay
 * que atrapar: el caso real medía **41**, y las sentencias breves del Corpus —«Yo sé quién soy»,
 * «paciencia y barajar», «Aún hay sol en las bardas»— se quedan todas por debajo.
 *
 * **VALOR PROVISIONAL**, como los demás de su clase: sale de **un solo caso observado**. Cuando
 * haya un segundo se sabrá si sobra o falta, y moverlo será una decisión visible en el diff.
 */
export const MIN_CARACTERES_PARA_CONTENCION = 40;
