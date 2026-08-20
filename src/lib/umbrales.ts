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
