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

/**
 * Entradas por página en los listados de Autor, de Tema, de Colección y de Obra — FR-5.
 *
 * La Página de Obra (Historia 22.4) pagina con este mismo número y la misma `Paginacion`: un
 * listado de la Obra no tiene por qué cortarse en otro sitio que el de su Autor.
 */
export const CITAS_POR_PAGINA = 50;

/**
 * Citas publicadas que necesita una Obra para que su página se **indexe** — FR-52.
 *
 * Existir no es indexarse: toda Obra con al menos una Cita publicada tiene página (es el
 * destino del título en la Atribución), pero una Obra de una sola Cita repite la Página de
 * esa Cita con otro título, y el buscador la leería como contenido duplicado. Con menos de
 * esto la página se sirve con `noindex, follow`, fuera del sitemap y del índice de Pagefind.
 *
 * Quien lo aplica es `esObraIndexable` (`src/lib/obras.ts`), y nadie más.
 */
export const MIN_CITAS_OBRA_INDEXABLE = 2;

/**
 * Proporción de las Citas de su Autor a partir de la cual una Obra **no** se indexa — FR-52.
 *
 * **Excluyente**: una Obra con el 90 % exacto de las Citas de su Autor ya no se indexa. Una
 * Obra que reúne casi todo su Autor repite su Página de Autor con otro título, y competir
 * contra uno mismo por la misma consulta es justo lo que la regla existe para impedir.
 *
 * Se recalcula en cada construcción con el Corpus de ese día, así que se corrige sola en los
 * dos sentidos: el día que el Autor gana Citas de otra obra, esta pasa a indexarse sin tocar
 * su ficha. Ante duplicados, se baja este tope; nunca se parchea una página (épica 22).
 */
export const MAX_PROPORCION_OBRA_DEL_AUTOR = 0.9;

/**
 * La congelación de la familia Obra — el freno de SM-11 (AD-25, Historia 22.8).
 *
 * Vive junto a los dos números de FR-52 porque es un dato más de la misma regla: mientras
 * esté declarada, una Obra se indexa **si cumple FR-52 y su ficha está en `indexables`** —la
 * lista de nombres de ficha que se indexaban el día que se congeló—. Ninguna entra; las que
 * dejan de cumplir la regla salen. La aplica `obrasIndexables` (`src/lib/publicado.ts`) en las
 * dos instancias del sitio, y la consultan por `congelacionVigente()` (`src/lib/obras.ts`) el
 * rastreo y, cuando existan, las ediciones en venta (22.9) y las Piezas que enlacen a Obras.
 *
 * **No se escribe a mano**: la compone `npm run obra -- congelar` desde la lista indexable
 * vigente y la devuelve a `undefined` `npm run obra -- levantar`. Ninguna de las dos hace
 * commit: congelar y levantar son commits de Héctor, revertibles con `git revert`, como
 * encender un Modelo en `ingreso.ts`. Nunca se deriva de la serie de indexación (AD-24).
 */
export interface CongelacionDeObras {
  /** La jornada en que se congeló, `AAAA-MM-DD`. */
  desde: string;
  /** Los nombres de ficha (`{slug-autor}--{slug-obra}`) que se indexaban al congelar. */
  indexables: readonly string[];
}

export const CONGELACION_DE_OBRAS: CongelacionDeObras | undefined = undefined;

/**
 * Si rige la medición de SM-11: mientras sea `true`, la lectura de la serie lee **enteras** las
 * familias Autor y Obra —la comparación de la misma jornada no admite muestra— y reparte el
 * resto del presupuesto entre las demás. Se apaga cuando SM-11 se juzgue.
 */
export const SM11_VIGENTE = true;

/** El primer despliegue de la Página de Obra (Historia 22.4): el origen del plazo de SM-11. */
export const PRIMER_DESPLIEGUE_DE_OBRAS = '2026-10-10';

/** Semanas tras el primer despliegue a partir de las cuales SM-11 se juzga. */
export const SEMANAS_HASTA_JUZGAR_SM11 = 8;

/*
 * Las jornadas en que un despliegue cambia lo que SM-11 compara (PRD §6.7): cada una es la del
 * despliegue que **llega al sitio en vivo** —no la de su commit— y se anota ese día; `undefined`
 * mientras no haya llegado. El informe de indexación las nombra en su línea SM-11, para que el
 * juicio sepa qué movió la comparación. Si la ventana se reinicia desde alguna lo decide Héctor.
 */

/** La reparación de la publicación, en rojo del 2026-10-11 al 2026-10-19 (Publicar, 09:22 UTC). */
export const DESPLIEGUE_DE_LA_REPARACION = '2026-10-19';

/** La Tarjeta de Obra con los Directorios y la cabecera: las Épicas 24 y 26, juntas (26.11). */
export const DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS: string | undefined = undefined;

/** La portada de retorno, si llega antes del juicio de SM-11 (Historia 28.5). */
export const DESPLIEGUE_DE_LA_PORTADA_DE_RETORNO: string | undefined = undefined;

/**
 * La llegada en vivo del sitio de la Épica 23 — AD-9, AD-13, Historia 23.10.
 *
 * Es la jornada UTC en que el sitio con la lectura, las Marcas de llegada contadas una vez, las
 * salidas internas, la búsqueda asentada y la vista de Obra (Historias 23.5–23.9) **llega al sitio
 * en vivo** —el fin de «Desplegar», no el merge—, con la misma forma que las de arriba:
 * `undefined` mientras no haya llegado. **Le da valor Héctor, en un commit aparte (23.11), y ningún
 * agente la elige.**
 *
 * **Llegó el 2026-10-25**: el merge `63b2bb95d2` («merge: la Épica 23, medir la lectura») y su
 * «Desplegar» de Publicar, que terminó a las 17:48:18 UTC de esa jornada. La jornada de llegada es
 * mixta —páginas abiertas con el guion de la v7.1— y el tramo nuevo empieza la siguiente, la
 * 2026-10-26. La escribió el bucle v8-ralph con la autorización de Héctor del 2026-10-24.
 *
 * No está entre las jornadas que mueven SM-11 —no cambia lo que el buscador indexa, así que la
 * línea SM-11 del informe de indexación no la nombra—: solo parte series de la medición, por su
 * entrada en `CORTES_DE_SERIE_DECLARADOS` (abajo).
 */
export const DESPLIEGUE_DE_LA_LECTURA: string | undefined = '2026-10-25';

/*
 * Los cortes de serie de la medición — AD-9, AD-13, Historia 23.10.
 *
 * Un corte es una jornada a partir de la cual una serie no se compara con lo de antes porque
 * cambió el instrumento que la mide: la llegada en vivo que cambia qué se emite o cómo, su
 * reversión, un cambio de los cortes de tramo de `busqueda` (vocabulario) o un cambio de
 * `MIN_MS_VISIBLES_PARA_LA_LECTURA`, que repite la línea base. Cada entrada dice su jornada, qué
 * cambió y qué series parte, y **la jornada sale siempre de una constante de despliegue**, nunca
 * de un literal: la lista se compone de ellas y filtra las que aún no llegaron. Una entrada nueva
 * entra con su historia, y con su constante.
 *
 * La lectura de la línea base parte cada serie solo por las entradas que la nombran, sin elegir
 * ninguna ni suponer cuántas hay: el tramo nuevo empieza la primera jornada UTC completa tras la
 * llegada, y la de llegada se informa aparte, como «cambió». Dos entradas en la misma jornada, con
 * distinto motivo, son un solo «cambió».
 */

/** Las series de la medición que un corte puede partir. */
export type SerieDeMedicion = 'sm8' | 'lectura' | 'busqueda';

/** Un corte de serie tal como se declara: su jornada es la de una constante de despliegue. */
export interface CorteDeSerie {
  /** La jornada UTC de la llegada en vivo, `AAAA-MM-DD`; `undefined` mientras no haya llegado. */
  readonly jornada: string | undefined;
  /** Qué cambió, como lo nombra el informe. */
  readonly que: string;
  /** Las series que parte. */
  readonly series: readonly SerieDeMedicion[];
}

/** Un corte que ya llegó: el que tiene jornada. */
export interface CorteLlegado extends CorteDeSerie {
  readonly jornada: string;
}

/**
 * La lista declarada, en el orden en que se escribió: cada jornada es una constante de arriba.
 * La de la Épica 23 parte SM-8 —la marca se cuenta una vez por llegada y la vista sale del fichero
 * diferido—, la serie de la lectura y la de la búsqueda, que empiezan con ella; la de la 24 con la
 * 26 parte SM-8, porque los Directorios emiten vista.
 */
export const CORTES_DE_SERIE_DECLARADOS: readonly CorteDeSerie[] = [
  {
    jornada: DESPLIEGUE_DE_LA_LECTURA,
    que: 'la llegada de la Épica 23 (la lectura, las marcas contadas una vez, las salidas y la búsqueda asentada)',
    series: ['sm8', 'lectura', 'busqueda'],
  },
  {
    jornada: DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS,
    que: 'la llegada de la Tarjeta de Obra con los Directorios (Épicas 24 y 26)',
    series: ['sm8'],
  },
];

/**
 * Los cortes que ya llegaron, ordenados por jornada: filtra los que no tienen y conserva el orden
 * declarado entre los de la misma jornada (`sort` es estable).
 */
export function cortesQueLlegaron(declarados: readonly CorteDeSerie[]): CorteLlegado[] {
  return declarados
    .filter((corte): corte is CorteLlegado => corte.jornada !== undefined)
    .sort((a, b) => (a.jornada < b.jornada ? -1 : a.jornada > b.jornada ? 1 : 0));
}

/** La lista de cortes de serie, solo con los que llegaron y en orden. */
export const CORTES_DE_SERIE: readonly CorteLlegado[] = cortesQueLlegaron(CORTES_DE_SERIE_DECLARADOS);

/**
 * Su proyección sobre SM-8 — las entradas que parten la serie del canal propio, en el mismo orden
 * (Héctor, 2026-10-19). Mientras ninguna constante tenga valor está vacía, y el informe lo dice.
 * Desde la 23.11 su primera entrada es la llegada de la Épica 23, compuesta de
 * `DESPLIEGUE_DE_LA_LECTURA`; la segunda llega con `DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS` (26.11).
 */
export const CORTES_DE_SM8: readonly CorteLlegado[] = CORTES_DE_SERIE.filter((corte) =>
  corte.series.includes('sm8'),
);

/**
 * Las pasadas de prueba que escriben a propósito en el D1 de producción — AD-9, AD-14,
 * Historia 23.10 (Héctor, 2026-10-23).
 *
 * Son dos y ninguna más: la de la Historia 25.3, sobre el sitio en vivo, y la de la 25.7, cuyo
 * clic en la tarjeta de Facebook aterriza en la canónica en vivo. Cada una deja registros de
 * verdad en la tabla que no son visitas, así que la lectura de la línea base los descuenta —los de
 * esas rutas en esa jornada, y ninguno más— en cada lectura. **La anota Héctor el día de la
 * pasada**, con su jornada UTC y las rutas que recorrió; ningún agente la anota. `DESPLIEGUE.md` §3
 * la cita y no la copia, y la lectura la lee y no la copia.
 *
 * La baliza de prueba con que se comprueba el receptor no es una pasada: va a una ruta que ninguna
 * página publica, se borra en la misma orden y se descuenta por su ruta.
 */
export interface PasadaEnProduccion {
  /** Qué pasada fue, como la nombra su historia: «25.3», «25.7». */
  readonly pasada: string;
  /** La jornada UTC en que escribió, `AAAA-MM-DD`. */
  readonly jornada: string;
  /** Las rutas que recorrió, como las guarda el receptor (`/cita/<slug>/`). */
  readonly rutas: readonly string[];
}

export const PASADAS_QUE_ESCRIBEN_EN_PRODUCCION: readonly PasadaEnProduccion[] = [];

/**
 * Lecturas de su superficie que cierran una línea base — AD-9, FR-56, Historia 23.10.
 *
 * La línea base de cada métrica empieza la primera jornada UTC completa del tramo vigente de su
 * serie y se cierra la jornada en que reúne este mínimo de lecturas de su superficie —de búsquedas
 * asentadas, la de SM-6 y SM-13—; no es un número de días. Las ventanas con que se juzgan después
 * las tasas reúnen cada una el mismo mínimo.
 *
 * **300, valor de Héctor** (2026-10-24), dado en un diff visible en la 23.11 antes de leer la
 * primera línea base: ninguna fuente se lo da, y ningún agente lo elige ni lo cambia. Sigue
 * admitiendo `undefined`, como `CONGELACION_DE_OBRAS`, que significa «sin mínimo declarado»: el
 * informe lo dice y nunca da una línea base por cerrada. Que una línea base cerrada sea **buena**
 * no lo dice ningún número: lo anota Héctor en `DESPLIEGUE.md` §3.
 */
export const MIN_LECTURAS_DE_LINEA_BASE: number | undefined = 300;

/**
 * Si Facebook entra en la comparación de SM-12 entre destinos — AD-9, SM-12, Historia 23.10.
 *
 * Apagado: no consta todavía que `?via=` sobreviva al clic en la tarjeta que Facebook compone del
 * enlace, y sin eso las lecturas con `via=facebook` serían una cota de cuánto se pierde, no una
 * difusión comparable con la de los demás destinos. La lectura informa Facebook aparte, con el
 * motivo. **Lo enciende Héctor en la 25.7**, en un diff visible, si la matriz dice que la marca
 * sobrevive; ningún agente lo enciende.
 */
export const SM12_CON_FACEBOOK = false;

/**
 * Rutas de Página de Cita con una sola vista en una jornada a partir de las cuales esa jornada es
 * una **ráfaga** — AD-9, FR-56, Historia 23.10.
 *
 * Es la firma mecánica de un rastreador que recorre el sitio cargando cada Cita una vez: cien
 * rutas o más con exactamente una vista de carga el mismo día. La lectura de la línea base da la
 * razón lecturas/vistas de esos pares frente a la del resto; si se parecen, el tiempo mínimo de la
 * lectura no está separando máquinas de personas, y lo ajusta Héctor (23.5). El valor, cien, lo da
 * el plan (FR-56); moverlo lo decide Héctor, en un diff visible.
 */
export const MIN_RUTAS_DE_CITA_EN_RAFAGA = 100;

/**
 * Citas del mismo Autor que ofrece una Página de Cita en «Más de {Autor}» — UX-DR17, UX-DR69.
 *
 * Del Autor, **sin las de su Obra**, que ya tiene su propio bloque (`MAX_CITAS_DE_LA_MISMA_OBRA`),
 * ni la propia ni la que ofrece «Siguiente» (Historia 24.6). Las elige `citasRelacionadas`.
 *
 * Un entero de 2 o más: lo reparte `repartir`, que con menos lanza y para la construcción.
 */
export const MAX_CITAS_RELACIONADAS = 4;

/**
 * Citas de la misma Obra que ofrece una Página de Cita en «De la misma obra» — UX-DR68, AD-9,
 * Historia 24.6.
 *
 * En el orden del libro, sin la propia ni la que ofrece «Siguiente». Una Página de Cita lleva
 * al pie como mucho esta cifra más `MAX_CITAS_RELACIONADAS` Tarjetas (hoy, 3 + 4). Las elige
 * `citasDeLaMismaObra`; moverlo lo decide Héctor, en un diff visible. Un entero de 2 o más: lo
 * reparte `repartir`, que con menos lanza y para la construcción.
 */
export const MAX_CITAS_DE_LA_MISMA_OBRA = 3;

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
 *
 * **QUÉ MIDE, que cambió el 2026-09-05 y el valor no.** Se mide sobre los Autores de
 * **tradición hispánica** —`latinoamericana` + `peninsular`—, no sobre el Corpus entero.
 * Antes el denominador eran todos los Autores, y con ese denominador cada clásico universal
 * que entraba diluía un compromiso que no tenía nada que ver con él: cuarenta Autores de
 * tradición `otra` habrían tirado el indicador del 51,4 % al 24 % **sin que un solo Autor
 * hispánico cambiara de sitio**. El compromiso del brief es «no escorar hacia España», y eso
 * es una afirmación sobre el reparto entre peninsulares y latinoamericanos, nunca sobre
 * cuántos griegos hay.
 *
 * **El 40 no se ha tocado.** Bajarlo habría soltado el diferenciador que el brief llama la
 * ventaja competitiva; cambiar el denominador lo deja intacto y además lo hace más fiel a lo
 * que se prometió. Medido sobre hispánicos, el 2026-09-05 va al 56,2 %.
 */
export const SUELO_TRADICION_LATINOAMERICANA = 40;

/**
 * Autores de tradición `otra` a los que aspira el Corpus — FR-49, v6.
 *
 * **Sin poner, y a propósito.** Desde la v6 los clásicos universales —la antigüedad, la
 * tradición teológica— se cuentan **aparte** del suelo panhispánico, con meta propia; pero
 * cuál es esa meta es un listón, y el listón lo pone Héctor. `undefined` significa
 * exactamente eso: el informe dice cuántos hay y dice que falta el número, en vez de
 * inventárselo. El día que se ponga, es un diff de una línea y visible.
 *
 * `otra` **no** es sinónimo de traducido ni de extranjero: Rizal y Pardo de Tavera son `otra`
 * y escribieron en español. Es la tercera categoría del esquema desde la v1, no un cajón.
 */
export const META_AUTORES_DE_OTRA_TRADICION: number | undefined = undefined;

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
 *
 * Medido en la Historia 23.8, sin moverlo: `/buscar/` lleva **6.441 bytes** en línea con la
 * medición puesta (215 libres; 3.535 antes), porque su isla carga ahora la búsqueda asentada —el
 * estado que se ve, sus tres disparadores (con el `auxclick` del botón central), la página que nunca
 * se vio, la memoria de la carga, la marca del historial y el reintento de verdad tras un índice que
 * falla (`?{n}` y `destroy()`)— y lleva dentro, por su texto, la parte pura que decide qué emitir
 * (`asentamientoDeBusqueda`) con sus constantes del vocabulario. Es la superficie más justa del
 * sitio: la Página de Cita con Imagen sigue en 5.630 (1.026 libres). Lo que la Épica 27 le añada
 * (los filtros, «Mostrar 30 más», el aviso del índice) no cabe en ese hueco: sube el tope en el
 * mismo diff, con la medida, o compacta antes el texto de la parte pura al construir.
 */
export const MAX_BYTES_DE_GUION = 6656;

/*
 * Los topes de la lista cerrada de guiones externos — AD-6, AD-9, Historia 23.1.
 *
 * `MAX_BYTES_DE_GUION` mide lo que va en línea; estos miden lo que se **descarga**, una
 * entrada por cosa que `src/lib/guiones.ts` deja pedir. Cuentan los bytes UTF-8 sin comprimir
 * del fichero, de lo que importa de forma estática y de lo que arranca al ejecutarse (el worker
 * de Pagefind), y los vigila
 * `tests/unit/medicion.test.ts` sobre el `dist/` de un sitio construido con punto final y con
 * Pagefind. Cada uno se fijó con el precedente de `MAX_BYTES_DE_GUION`: lo medido el
 * 2026-10-24 más unos 400 bytes, suficiente para no ir justo y poco para que un crecimiento
 * pase inadvertido. Subir uno es una decisión visible en el diff, como subir aquel.
 */

/**
 * El fichero de medición, `/medicion/{versión}.js` — lo compone `guionDeMedicion`.
 *
 * Medido: 920 bytes con el punto final de producción (el más largo de los que se usan; 886 con
 * el de las pruebas). No importa nada. Lleva el punto final dentro, así que una dirección más
 * larga lo engorda byte a byte.
 *
 * Medido de nuevo en la Historia 23.2: **1.128 bytes** con el punto final de producción (1.096
 * con el de las pruebas). Creció porque ya no manda las cinco claves a todo evento: lleva una
 * tabla por evento, compuesta desde `CAMPOS_DE_EVENTO` de `src/lib/vocabulario.ts`, con el
 * conjunto de cada campo, y los destinos pasaron de cinco a ocho. Cabe en el tope de la 23.1,
 * que no se sube; las Historias 23.5 a 23.9 lo vuelven a medir al añadir sus eventos.
 *
 * Subido de 1.320 a 2.420 en la Historia 23.5: medido, **2.024 bytes** con el punto final de
 * producción (1.979 con el de las pruebas), más unos 400 de margen, como la 23.1; tras su
 * revisión —la lectura que debía la carga sale aunque el temporizador llegue tarde, y de
 * `data-vistas` solo salen vistas—, **2.096** (2.051), y el tope no se mueve. Creció porque
 * el fichero dejó de ser solo un emisor: lleva el reloj de la Lectura —visibilidad acumulada con
 * `visibilitychange`, el temporizador con lo que falta y las cuatro escuchas de interacción—, la
 * memoria de `primera` por métrica, con la correspondencia de cada acción con la suya, y la carga
 * nueva de `pageshow` con `persisted`. Nada de eso cabe en el arranque en línea, que no cambia, ni
 * cuenta en `MAX_BYTES_DE_GUION`: es justo el hueco para el que la 23.1 sacó la medición a un
 * fichero. Las Historias 23.6 a 23.9 lo vuelven a medir al añadir lo suyo.
 *
 * Subido de 2.420 a 2.880 en la Historia 23.6: medido, **2.482 bytes** con el punto final de
 * producción (2.483 con la barra final; 2.450 con el de las pruebas), más unos 400 de margen,
 * como la 23.1 y la 23.5. Sin subirlo no cabía: creció 386 bytes porque el fichero lee también la
 * Marca de difusión (`?via=`) —una fuente más y su conjunto en la tabla de las tres vistas y la
 * lectura— y quita las dos marcas de la dirección con `history.replaceState`, con la función pura
 * que parte la búsqueda (`SIN_MARCAS_DE_LLEGADA`) viajando dentro como texto. Sigue sin contar en
 * `MAX_BYTES_DE_GUION`, que no se mueve. Tras sus dos revisiones —las marcas viajan solo con
 * las vistas que declara la página y con la lectura, la dirección nueva va entera, con
 * `location.origin`, y quitar las marcas no deja un `?&` sin nada—, **2.548** (2.549 con la barra
 * final; 2.516 con el de las pruebas), y el tope no se mueve. Las Historias 23.7 a 23.9 lo
 * vuelven a medir.
 *
 * Subido de 2.880 a 3.730 en la Historia 23.7: medido, **3.330 bytes** con el punto final de
 * producción (3.331 con la barra final; 3.298 con el de las pruebas), más unos 400 de margen, como
 * la 23.1, la 23.5 y la 23.6. Sin subirlo no cabía: creció 782 bytes sobre los 2.548 de la 23.6
 * porque el fichero emite la Salida interna —el evento en su tabla, con el conjunto de las
 * dieciséis zonas del vocabulario (unos 250 bytes él solo), y la escucha de `click` que descarta
 * lo que no es salida, toma la zona del contenedor más cercano, se gasta una vez por carga y emite
 * antes la lectura—. Tras la revisión de la 23.7, que compara `target` con `_self` sin distinguir
 * mayúsculas, mide **3.339** (3.340; 3.307): 791 bytes sobre la 23.6 y 391 de margen, y el tope no
 * se mueve. Sigue sin contar en `MAX_BYTES_DE_GUION`, que no se mueve. Las Historias 23.8 y 23.9
 * lo vuelven a medir.
 *
 * Medido de nuevo en la Historia 23.8: **3.487 bytes** con el punto final de producción (3.488 con
 * la barra final; 3.455 con el de las pruebas), 148 sobre los 3.339 de la 23.7 y 243 de margen, así
 * que el tope no se mueve. Creció porque el fichero emite la `busqueda`: su entrada en la tabla, con
 * el tramo y los filtros que le pasa la isla de `/buscar/` y los dos conjuntos del vocabulario con
 * que los coteja (los cuatro rótulos de `TRAMOS` y las seis combinaciones de `FILTROS`). Lo demás
 * de la búsqueda asentada —qué estado cuenta, cuándo y una vez— vive en la isla, en línea, y cuenta
 * en `MAX_BYTES_DE_GUION` de `/buscar/`, que tampoco se mueve. La Historia 23.9 lo vuelve a medir.
 *
 * Medido de nuevo en la Historia 23.9: **3.647 bytes** con el punto final de producción (3.648 con
 * la barra final; 3.602 con `https://ejemplo.invalid/e`, el de las pruebas unitarias, y 3.600 con
 * `http://localhost:8787/e`, el del receptor local), 160 sobre los 3.487 de la 23.8 y 83 de margen
 * con el de producción, así que el tope no se mueve. Creció porque el fichero emite la vista de
 * Obra: su entrada en la tabla,
 * con la marca `indexable` y el conjunto de las dos marcas de Obra del vocabulario con que la
 * coteja, el evento en la lista de vistas que salen de `data-vistas`, y la lectura de la marca del
 * atributo del `<html>` una vez al activarse, que solo viaja con la vista que declara la página. Con
 * ella el fichero emite ya todo el vocabulario.
 */
export const MAX_BYTES_GUION_DE_MEDICION = 3730;

/**
 * El generador de la Imagen de Cita, `public/islas/imagen.js` — AD-6, AD-7.
 *
 * Medido: 7.153 bytes, sin importaciones. Lo pide la Página de Cita al pulsar y `/kit` y
 * `/lote` al cargar.
 */
export const MAX_BYTES_GUION_DE_IMAGEN = 7550;

/**
 * El cliente de Pagefind, `/pagefind/pagefind.js`, y el worker que arranca — FR-7.
 *
 * Medido: 86.810 bytes con Pagefind 1.5.2 — el cliente, 45.555, y el worker que crea al
 * iniciarse con `new Worker`, `/pagefind/pagefind-worker.js`, 41.255 (lo declara la entrada en
 * `arranca`); ninguno importa nada de forma estática. El índice y el WebAssembly llegan por
 * `fetch` y no cuentan, y lo segundo es una elección, no un descuido: el WebAssembly **es** código
 * que se ejecuta, pero no es guion —no lo ve `<script>`, `import()` ni `new Worker`, que es lo que
 * la lista cierra—, llega solo tras enfocar o buscar, como el resto de Pagefind, y su peso lo fija
 * Pagefind por idioma, no el proyecto. Si un día hubiera que contarlo, sería otra entrada con su
 * tope, no este número. Hasta la revisión de la 23.1 solo contaba el
 * cliente, y el worker se descargaba al enfocar el campo fuera de toda cuenta. No lo escribe el
 * proyecto: lo escribe Pagefind al construir, así que subir de versión puede moverlo, y este
 * tope es lo que hace que eso se vea.
 */
export const MAX_BYTES_GUION_DE_PAGEFIND = 87200;

/**
 * El techo de lo que el alojamiento admite por sitio — Historia 24.2, Entorno operativo.
 *
 * GitHub Pages admite 1 GB por sitio publicado. Se lee en decimal —mil millones de bytes y no
 * 1 GiB—, que es la lectura estricta: de las dos, la que corta antes. No lo decide nadie del
 * proyecto, lo pone el hospedaje; está aquí con nombre para que la relación con el aviso y el
 * tope de abajo se diga con nombres y una prueba la fije, y no como un número suelto en un
 * comentario.
 */
export const TECHO_DE_PESO_DEL_ALOJAMIENTO = 1_000_000_000;

/**
 * Bytes de `dist/` a partir de los cuales el build avisa — Historia 24.2, AD-9.
 *
 * Mide la suma de tamaños de fichero de lo que se despliega —`dist/` tras Pagefind,
 * `dist/pagefind/` incluido— **sin** los ficheros que rotan con la jornada (la portada, el
 * 404, `/kit`, `/lote` y `rss.xml`), para que el veredicto sea función del commit y no del día
 * (AD-12) —salvo unos bytes hasta la 26.2: la Cita del Día de la portada entra en el índice de
 * Pagefind—. Bytes y no bloques de `du`, que dependen del sistema de ficheros de quien construye.
 * Lo mide el paso final de `npm run build` (`integraciones/peso.ts`).
 *
 * **Lo fijó Héctor el 2026-10-24: 750 MiB.** De partida, ese mismo día, con 4.420 Citas, lo
 * juzgado pesaba 466.839.655 bytes (445,2 MiB), y crece unos 95 KB por Cita nueva, dos tercios
 * de ellos de su Tarjeta Social: el aviso salta hacia las 7.800 Citas como mucho, porque cada
 * Autor u Obra nuevos suman además su página y su Tarjeta. La Épica 24 engorda la Página de
 * Cita, así que se vuelve a medir tras la 24.6 y los valores se revisan entonces.
 *
 * **El aviso no decide nada**: la construcción sigue y, en el flujo de publicación, despliega.
 * Dice que queda margen antes de que el tope de abajo pare el despliegue; qué hacer con él
 * —adelgazar `dist/` o mudarse de alojamiento— lo decide Héctor.
 */
export const AVISO_DE_PESO_DE_DIST = 750 * 1024 * 1024;

/**
 * Bytes de `dist/` por encima de los cuales el build se detiene — Historia 24.2, AD-9.
 *
 * Misma medida que `AVISO_DE_PESO_DE_DIST`. Por encima, `npm run build` sale con error; en el
 * flujo de publicación el artefacto no se sube y **sigue servido el sitio anterior**: parar el
 * despliegue de un día es mejor que descubrir el techo del alojamiento al publicar, cuando el
 * fallo llega sin decir cuánto sobra.
 *
 * **Lo fijó Héctor el 2026-10-24: 900 MiB**, un 5,6 % por debajo del techo de 1 GB decimal,
 * hacia las 9.400 Citas como mucho. Igualar el tope avisa y no rompe; pasarlo rompe.
 */
export const TOPE_DE_PESO_DE_DIST = 900 * 1024 * 1024;

/**
 * PNG de `dist/` por encima de los cuales el build avisa — Historia 24.2, AD-16.
 *
 * Es el disparador de la deuda declarada de AD-16: las Tarjetas Sociales se rasterizan en cada
 * build, sin caché, y el día que su número pase de aquí toca pagar esa caché. Es un recuento y
 * no un tiempo porque un veredicto del build es función del commit (AD-12). Pasarlo avisa y
 * nunca rompe.
 *
 * **Sin poner, y a propósito**: el valor lo fija Héctor en un diff visible. `undefined`
 * significa eso: el paso final informa del número de PNG —5.116 el 2026-10-24— y dice que no
 * tiene tope, en vez de inventárselo.
 */
export const TOPE_DE_PNG_DE_DIST: number | undefined = undefined;

/**
 * Filas que D1 deja escribir al día en el plan gratuito — AD-9, AD-13, Historia 23.2.
 *
 * Es la cuota de escritura de «Cuotas del receptor» de la espina, y no la decide nadie del
 * proyecto: la pone Cloudflare. Cada índice cuenta una fila más, así que una inserción en
 * `eventos`, con sus dos índices, gasta tres. La usa `npm run medicion -- desplegar` antes de
 * barajar el `rowid`, que reescribe cada fila y sus dos entradas de índice: si lo escrito en el
 * día más el barajado no cabe, no baraja, lo dice con las cifras y sale con 1 —se repite otro
 * día, nunca troceado—. Si el proyecto pasa al plan de pago, cambia aquí y en ningún otro sitio.
 */
export const CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1 = 100_000;

/**
 * Bytes que D1 admite por base en el plan gratuito — AD-9, Historia 23.10.
 *
 * La otra cuota de «Cuotas del receptor» de la espina, y tampoco la decide el proyecto: 500 MB.
 * Se escribe en bytes decimales, `500 * 1000 * 1000`, que es la lectura más estrecha de «500 MB»:
 * con 500 MiB el aviso llegaría tarde. La lectura de la línea base compara con ella el
 * `database_size` de `d1 info`; pasada, las escrituras fallan y el Worker lo calla. Si el proyecto
 * pasa al plan de pago, cambia aquí y en ningún otro sitio.
 */
export const CUOTA_DE_BYTES_POR_BASE_EN_D1 = 500 * 1000 * 1000;

/**
 * Milisegundos de visibilidad acumulada tras los que una carga cuenta como leída — AD-9, AD-13,
 * FR-56, Historia 23.5.
 *
 * Es la mitad «por tiempo» de la Lectura: el fichero de medición (`guionDeMedicion`) emite una
 * `lectura` cuando la página lleva este tiempo visible —sumando los ratos en que lo está, con
 * `visibilitychange`— o antes, a la primera interacción. El valor, 8 s, lo dan FR-56 y AD-13.
 *
 * **Cuenta desde que el fichero se activa**, no desde que empezó la navegación: el fichero llega
 * con `defer`, y una página prerenderizada no cuenta hasta verse. Peca por defecto: una carga
 * vista algo más de 8 s puede quedarse sin lectura por tiempo, pero ninguna carga visible menos
 * de 8 s la tiene por tiempo (por una interacción, sí).
 *
 * Cambiarlo cambia qué es una Lectura: es una entrada de `CORTES_DE_SERIE_DECLARADOS`, con su
 * constante de despliegue, y repite la línea base, y lo decide Héctor tras la comparación por
 * firma. Viaja dentro del fichero, así que moverlo cambia también su versión.
 */
export const MIN_MS_VISIBLES_PARA_LA_LECTURA = 8_000;

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
 * Caracteres que puede medir la `nota` de una Ficha de Obra — Historia 22.6, UX-DR44.
 *
 * La nota es la única frase escrita a mano que publica la Página de Obra, y la escribe Héctor:
 * ninguna orden la rellena. Se acota en la puerta de admisión por la misma razón que el
 * criterio de una Colección —recortarla en la página sería reescribir lo que el editor
 * guardó (NFR-12)—, y con el mismo número: una frase, no una sinopsis (FR-51). Se mide en
 * puntos de código el texto **tras recortar** los espacios de los extremos, sin recortar el
 * valor.
 */
export const MAX_CARACTERES_NOTA_DE_OBRA = 160;

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

/**
 * Los pesos del orden de revisión — Historia 19.6.
 *
 * `corpus/_revision/` guardaba **21.021 candidatas** el 07/09/2026 y la cola las servía
 * ordenadas por slug, que es por la primera palabra de la frase: respecto a si la Cita
 * vale, azar. Estos pesos la ordenan.
 *
 * ## Por qué un orden admite señales que una puerta no
 *
 * `tools/lib/extraccion.ts` fija el listón de la casa para una **puerta**: sólo entra la
 * señal que no muerde **ninguna** Cita publicada. Es el listón correcto ahí, porque una
 * puerta destruye —lo que muerde no vuelve— y descartar a Góngora en silencio es el
 * peligro que `deferred-work.md` lleva sesiones nombrando.
 *
 * Un orden no destruye: **coloca**. Lo que baja sigue listado, sigue contado y sigue
 * revisable. Por eso el listón aquí no es «no morder ninguna» sino **separar**, y por eso
 * la vocal acentuada suelta —que muerde 89 Citas publicadas y como puerta sería un
 * desastre— sirve perfectamente para colocar.
 *
 * ## De dónde salen los números
 *
 * Medido el 07/09/2026 sobre **1.642 Citas publicadas y 21.021 candidatas**: la proporción
 * de cada conjunto que lleva la señal, y la razón entre ambas. Cuanto más baja la razón,
 * más separa la señal, y más pesa.
 *
 * Y dos que se midieron y **no** están, porque son las que yo habría dado por buenas sin
 * medir. La **longitud**: mediana de 108 caracteres en lo publicado y 122 en lo candidato,
 * con los cuartiles solapados; no discrimina. Y **abrir en minúscula**, que apunta al revés
 * de lo que suponía: 2,1 % de las publicadas contra 0,5 % de las candidatas.
 *
 * **VALORES PROVISIONALES**, como los demás de su clase: salen de una sola medición contra
 * el Corpus de hoy. Cuando el Corpus sea otro habrá que volver a medir, y moverlos será un
 * diff visible.
 */

/** Lleva cifra: **0,0 %** de las publicadas, 3,3 % de las candidatas. Ninguna Cita del Corpus lleva un dígito. */
export const PESO_CIFRA_EN_CANDIDATA = 4;

/**
 * Inicial de nombre abreviada —«lo que escribió S.», «tuvo que sufrir M.»—: **0,0 %** de las
 * publicadas, 0,9 % de las candidatas.
 *
 * Ninguna de las 1.642 Citas del Corpus lleva una letra suelta con punto. En la edición de
 * Antonio Sancha son la firma del aparato: el traductor abrevia al autor que cita. Pesa como
 * la cifra porque separa igual de limpio, aunque atrape menos.
 */
export const PESO_INICIAL_ABREVIADA = 4;

/** Abre en conjunción o deíctico —«y», «pero», «esto»—: 1,8 % contra 8,7 %, razón 0,20. La frase colgaba de la anterior. */
export const PESO_ABRE_ENCADENADA = 3;

/**
 * Comillas de cualquier clase: 0,6 % de las publicadas, **5,3 %** de las candidatas, razón 0,11.
 *
 * `esTrozoDeCitaAjena` ya cierra la puerta a la comilla **sin pareja**, que es un corte mal
 * hecho. Ésta es otra cosa y por eso pesa en vez de cerrar: la comilla emparejada es el Autor
 * —o su traductor— citando a un tercero, y lo que se entrecomilla no es del Autor. A veces la
 * frase vale igual, y de ahí que baje en lugar de desaparecer.
 */
export const PESO_COMILLAS_EN_CANDIDATA = 3;

/** Lleva paréntesis o corchete: 0,6 % contra 1,8 %, razón 0,34. Casi siempre es el aparato del editor. */
export const PESO_PARENTESIS_EN_CANDIDATA = 2;

/** Vocal acentuada suelta —«á», «ó», «é»—: 5,4 % contra 16,0 %, razón 0,34. Ortografía de época, no basura: por eso pesa y no cierra. */
export const PESO_VOCAL_SUELTA = 2;

/** Nombre propio en interior de frase: 10,5 % contra 23,9 %, razón 0,44. Suele ser el traductor nombrando a un tercero. */
export const PESO_NOMBRE_PROPIO_INTERIOR = 1;
