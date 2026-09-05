/**
 * Qué se pidió rastrear y cuándo — Historia 18.3, Épica 18, FR-46.
 *
 * Aquí vive lo único que se puede equivocar de esta historia: **validar una selección
 * escrita por una persona** contra lo que el sitio publica de verdad y contra el tope de
 * la decena, y componer las entradas que se van a anotar. No hay red y no hay elección:
 * quien decide qué URL se piden es el editor, y esto solo se niega a anotar lo que no se
 * sostiene.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────────────
 *
 * El 2026-09-04 se pidió rastreo a mano de dos URL —Unamuno y Gracián, las dos únicas del
 * sitio con impresiones— y no quedó registrado en ninguna parte. Cuando la serie de
 * indexación de la Historia 16.1 muestre movimiento, sin este registro no habría forma de
 * saber si esas dos entraron **porque se pidieron** o porque les tocaba. Y eso es justo lo
 * que decide si pedir rastreo sirve de algo o es teatro.
 *
 * ── Por qué anota y no pide ──────────────────────────────────────────────────────────
 *
 * La petición la cursa una persona en Search Console. **No hay vía legítima de
 * automatizarla**: la API de inspección de URL informa y no solicita, y la Indexing API
 * solo admite ofertas de empleo y retransmisiones en directo. Si algún día la hubiera,
 * sería una decisión de producto y no de implementación.
 *
 * ── Por qué solo añade, al revés que su hermana ──────────────────────────────────────
 *
 * `corpus/serie-de-indexacion.yml` mide un **estado** y por eso es idempotente por fecha:
 * dos lecturas del mismo día son la misma pregunta hecha dos veces. Esto registra
 * **actos**: pedir rastreo de la misma URL dos días son dos peticiones, y reemplazar la
 * primera perdería justo el dato de si repetir sirve.
 */

import { esJornada } from '../../src/lib/citaDelDia.ts';
/*
 * El dominio tiene **un solo dueño**, que lo lee de `public/CNAME`. Se importa aquí en vez
 * de recibirlo por parámetro por lo mismo que `propiedadDeDominio` lo deriva en vez de
 * escribirlo: un segundo sitio donde ponerlo es un segundo sitio donde quedarse apuntando
 * al dominio anterior, y aquí eso admitiría URL de otra propiedad como si fueran del sitio.
 */
import { DOMINIO } from '../../src/lib/dominio.ts';
import { caracterDe, rutaNormalizada, superficieDeclaradaDe } from '../../src/lib/superficies.ts';
import { FAMILIAS, NOMBRE_DE_FAMILIA, type CensoPorFamilia, type Familia } from './indexacion.ts';

/**
 * Cuántas URL caben en una petición. **La decena, no el millar** — §4.17, FR-46.
 *
 * «Pedir rastreo de 1.715 URL no es una petición, es ruido» está escrito en el PRD y es lo
 * que este número impone. El tope es por petición y no acumulado: la selección es una
 * decisión editorial sobre qué páginas representan al sitio, del mismo carácter que elegir
 * la Cita del Día, y una decisión sobre más de diez páginas a la vez no es una decisión.
 */
export const TOPE_DE_LA_PETICION = 10;

/**
 * La jornada más antigua que se puede anotar — el suelo de `--fecha`.
 *
 * El futuro ya está cerrado, pero el pasado no lo estaba, y la errata que se cuela sin
 * ruido es la del año: `2025-09-04` por `2026-09-04` es un carácter, y deja una petición
 * fechada un año antes de que hubiera desde dónde cursarla. Este es el día en que la
 * propiedad quedó validada en Search Console (DESPLIEGUE.md §2): antes de él no había
 * propiedad, así que ninguna petición de rastreo de este sitio pudo ocurrir.
 */
export const PRIMERA_JORNADA_ANOTABLE = '2026-08-19';

/** Una petición anotada: la URL y la fecha, y nada más hace falta para cruzarla. */
export interface PeticionDeRastreo {
  fecha: string;
  /**
   * La ruta canónica de la superficie, con barra final.
   *
   * **Se anota la ruta y no la URL entera, y el motivo no es de gusto:** el dominio tiene
   * un solo dueño —`src/lib/dominio.ts`, que lo lee de `public/CNAME`— y repetirlo en cada
   * línea de un fichero versionado sería un segundo sitio donde quedarse apuntando al
   * dominio anterior. Es la misma razón por la que `propiedadDeDominio` deriva la propiedad
   * de Search Console en vez de escribirla. La orden acepta las dos formas al teclearlas
   * —se pega del navegador la URL entera— y compone la ruta con el dueño de las rutas.
   */
  ruta: string;
}

/**
 * El host de una URL absoluta que **no** es de este sitio, o `undefined` si es de él.
 *
 * `rutaNormalizada` se queda con el `pathname` de cualquier URL absoluta, así que sin esto
 * `https://otro-dominio.com/autor/x/` se anotaría como si fuera de aquí. Y no es una
 * hipótesis de laboratorio: el rastreo se pide **por propiedad** en Search Console, y lo
 * que se pega viene del navegador —de una vista previa en otro origen, o de la propiedad
 * equivocada si hay más de una abierta—. Un registro así no corresponde a ninguna petición
 * real de este sitio, que es lo único que este fichero no puede permitirse.
 *
 * El `www` se acepta porque la propiedad es de **dominio** (`sc-domain:`) y cubre el ápice
 * y el `www` a la vez: son el mismo sitio y la misma petición. Cualquier otro host no.
 */
function hostAjeno(dada: string): string | undefined {
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(dada)) return undefined;
  let url: URL;
  try {
    url = new URL(dada);
  } catch {
    // No es una URL: que lo diga el dueño de las rutas, con su motivo y no con el de aquí.
    return undefined;
  }
  const propio = DOMINIO.toLowerCase();
  const host = url.hostname.toLowerCase();
  return host === propio || host === `www.${propio}` ? undefined : url.host;
}

/** Lo que sale de validar una selección: o las entradas, o por qué no se anota ninguna. */
export type Seleccion =
  | { ok: true; peticiones: PeticionDeRastreo[] }
  | { ok: false; motivos: string[] };

/**
 * Las peticiones a anotar, o los motivos por los que no se anota **ninguna**.
 *
 * Es todo o nada a propósito. Anotar las buenas de un lote y descartar las malas dejaría un
 * registro que dice que se pidieron tres URL cuando quien lo ejecutó creía haber pedido
 * cinco, y este fichero existe justamente para poder afirmar después qué se pidió.
 *
 * `publicadas` llega del dueño único del conjunto publicable (AD-11): `rutasPublicadas` de
 * `src/lib/publicado.ts`. Aquí **no se reimplanta ningún umbral** —cuántas Citas hacen
 * publicable un Tema, cuándo una Colección se publica— ni se compone ninguna ruta a mano.
 */
export function componerPeticiones(entrada: {
  seleccion: readonly string[];
  publicadas: readonly string[];
  fecha: string;
  /** La jornada de hoy, para negarse a anotar una petición que aún no se ha cursado. */
  hoy: string;
  /**
   * Lo que el registro ya tiene anotado. Por omisión ninguna: un registro que aún no existe.
   *
   * Entra aquí y no se comprueba en la cáscara porque es la misma regla que el duplicado
   * dentro del lote, y una regla partida en dos sitios se aplica en uno solo el día que
   * alguien añada una tercera vía de anotar.
   */
  anteriores?: readonly PeticionDeRastreo[];
}): Seleccion {
  const motivos: string[] = [];
  const anteriores = entrada.anteriores ?? [];

  if (!esJornada(entrada.fecha)) {
    motivos.push(
      `«${entrada.fecha}» no es una fecha del calendario: se espera AAAA-MM-DD. La fecha es ` +
        'la mitad de lo que este registro guarda, y sin ella no se cruza con la serie de ' +
        'indexación.',
    );
  } else if (entrada.fecha > entrada.hoy) {
    /*
     * Una petición del futuro no se ha cursado todavía. El registro solo vale si cada
     * entrada corresponde a una petición real: uno que no corresponda es peor que no
     * tenerlo, porque la serie de indexación le atribuiría un movimiento a una petición que
     * nadie hizo.
     */
    motivos.push(
      `${entrada.fecha} todavía no ha llegado —hoy es ${entrada.hoy}—, así que esa petición ` +
        'no se ha cursado. Este registro anota lo que ya se pidió, nunca lo que se piensa pedir.',
    );
  } else if (entrada.fecha < PRIMERA_JORNADA_ANOTABLE) {
    /*
     * El otro extremo, que hasta aquí no tenía suelo: una errata del año se guardaba tal
     * cual. Y una petición fechada antes de que existiera la propiedad no puede haberse
     * cursado, que es exactamente lo mismo que una del futuro.
     */
    motivos.push(
      `${entrada.fecha} es anterior a ${PRIMERA_JORNADA_ANOTABLE}, la jornada en que se ` +
        'validó la propiedad en Search Console: antes de ella no había desde dónde pedir ' +
        'rastreo de este sitio. Si la petición es reciente, lo más probable es que sea una ' +
        'errata del año.',
    );
  }

  if (entrada.seleccion.length === 0) {
    motivos.push(
      'No se ha dado ninguna URL. La selección la escribe una persona: esta orden anota lo ' +
        'que se le dice, no elige.',
    );
  }

  if (entrada.seleccion.length > TOPE_DE_LA_PETICION) {
    motivos.push(
      `${entrada.seleccion.length} URL de golpe pasan del tope de ${TOPE_DE_LA_PETICION}. ` +
        'Pedir rastreo de un lote grande no es una petición, es ruido: §4.17 lo declara así ' +
        'y por eso la selección es del orden de la decena y no del millar.',
    );
  }

  /*
   * El conjunto publicable, indexado por su forma normalizada. Comparar por la forma
   * normalizada y **escribir la canónica del dueño** es lo que hace que `…/autor/x` y
   * `https://dominio/autor/x/` acaben siendo la misma entrada, con la barra final que la
   * fuente exige: preguntar por la forma que redirige devuelve «desconocida para Google».
   */
  const canonica = new Map<string, string>();
  for (const ruta of entrada.publicadas) canonica.set(rutaNormalizada(ruta), ruta);

  const peticiones: PeticionDeRastreo[] = [];
  const vistas = new Set<string>();

  for (const dada of entrada.seleccion) {
    const ajeno = hostAjeno(dada);
    if (ajeno !== undefined) {
      motivos.push(
        `«${dada}» es de «${ajeno}» y no de ${DOMINIO}. El rastreo se pide por propiedad en ` +
          'Search Console, así que una URL de una vista previa o de otra propiedad no ' +
          'corresponde a ninguna petición de este sitio: anotarla sería inventar que se pidió. ' +
          'Pegue la dirección de la propiedad, o la ruta empezando por «/».',
      );
      continue;
    }

    let normalizada: string;
    try {
      normalizada = rutaNormalizada(dada);
    } catch {
      // El mensaje del dueño de las rutas habla de declarar superficies en `superficies.ts`,
      // que no es lo que hace quien teclea aquí: lo que le falta es una URL del sitio.
      motivos.push(
        `«${dada}» no es una URL de este sitio: se espera la dirección completa de una página ` +
          'publicada, o su ruta empezando por «/».',
      );
      continue;
    }

    const publicada = canonica.get(normalizada);
    if (publicada === undefined) {
      /*
       * La decisión es una sola y la toma el dueño del conjunto publicable (AD-11): estar o
       * no en `publicadas`. Lo que se consulta aquí es **solo el motivo** que se le dice a
       * quien teclea, porque «esa ruta no existe» y «esa ruta existe y el sitio la declara
       * no publicable» se arreglan de maneras distintas. Consultar la declaración para
       * decidir sería un segundo criterio de publicabilidad, y eso no ocurre.
       */
      const declarada = superficieDeclaradaDe(normalizada);
      const noPublicable = declarada !== undefined && caracterDe(normalizada) !== 'producto';
      motivos.push(
        noPublicable
          ? `«${dada}» es ${declarada.nombre} y el sitio la declara no publicable en ` +
              'src/lib/superficies.ts: queda fuera del sitemap y se sirve con «noindex». ' +
              'Pedir su rastreo gasta la petición en algo que el buscador no va a indexar.'
          : `«${dada}» no la publica el sitio: no está en el conjunto publicable, que es el ` +
              'único criterio que esta orden aplica. O la ruta no existe, o su superficie no ' +
              'llega al umbral que la publica. Anotarla ensuciaría el registro con algo que ' +
              'la serie de indexación nunca podrá cruzar.',
      );
      continue;
    }

    if (vistas.has(publicada)) {
      /*
       * Repetir una URL **dentro de la misma petición** no son dos hechos: es un lote mal
       * escrito. Lo que sí son dos hechos, y por eso el registro solo añade, es pedirla otra
       * jornada. Anotar el duplicado contaría dos peticiones donde hubo una y falsearía justo
       * la cuenta por la que existe este fichero.
       */
      motivos.push(
        `«${publicada}» aparece dos veces en la misma petición. Pedirla otro día sí es otro ` +
          'hecho y se anota aparte; dos veces de golpe es una sola petición escrita dos veces.',
      );
      continue;
    }
    vistas.add(publicada);

    /*
     * Y repetirla **el mismo día en otra ejecución** tampoco son dos hechos. Es el mismo
     * lote mal escrito de arriba, solo que partido en dos invocaciones, y la causa natural
     * es no estar seguro de que la primera cuajó: esta orden no pide nada, así que no hay
     * acuse de recibo que mirar. Como el registro solo añade, la segunda quedaría como una
     * petición más y falsearía justo la cuenta por la que existe este fichero.
     */
    if (anteriores.some((p) => p.fecha === entrada.fecha && p.ruta === publicada)) {
      motivos.push(
        `«${publicada}» ya consta pedida el ${entrada.fecha}: ya está anotada, no hace falta ` +
          'repetirla. Anotarla otra vez contaría dos peticiones donde hubo una. Pedirla otra ' +
          'jornada sí es otro hecho, y esa se anota aparte sin quitar ésta.',
      );
      continue;
    }

    peticiones.push({ fecha: entrada.fecha, ruta: publicada });
  }

  if (motivos.length > 0) return { ok: false, motivos };
  return { ok: true, peticiones };
}

/** La familia de una ruta, según el censo que reparte lo publicado. `undefined` si de ninguna. */
export function familiaDeRuta(censo: CensoPorFamilia, ruta: string): Familia | undefined {
  return FAMILIAS.find((familia) => censo[familia]?.includes(ruta));
}

/** Lo pedido de una familia, frente a lo que esa familia publica. */
export interface RepartoDeFamilia {
  familia: Familia;
  /** Cuántas URL publica hoy la familia. Es el denominador de la comparación. */
  publicadas: number;
  /** Cuántas URL distintas suyas se han pedido alguna vez. */
  pedidas: number;
  /** Cuántas peticiones se anotaron. Mayor que `pedidas` si alguna se repitió otro día. */
  peticiones: number;
}

/**
 * El cruce con la serie: de cada familia, cuántas de sus URL se pidieron — AC 3.
 *
 * Es lo que convierte este fichero en algo más que un cuaderno. La serie de la Historia
 * 16.1 dice cuántas URL de cada familia están indexadas; esto dice cuántas de esa misma
 * familia se pidieron. Sin las dos cifras juntas, un movimiento de la serie no se puede
 * atribuir ni a la petición ni al rastreo espontáneo, que es la única pregunta que la
 * Épica 18 tiene que poder contestar.
 *
 * La familia sale del **censo**, que es el mismo reparto que escribe la serie. Deducirla
 * del prefijo de la ruta habría sido un segundo criterio de familia, y el día que una
 * superficie cambie de forma las dos respuestas divergirían en silencio.
 */
export function repartoPorFamilia(
  peticiones: readonly PeticionDeRastreo[],
  censo: CensoPorFamilia,
): RepartoDeFamilia[] {
  return FAMILIAS.map((familia) => {
    const suyas = peticiones.filter((p) => familiaDeRuta(censo, p.ruta) === familia);
    return {
      familia,
      publicadas: censo[familia]?.length ?? 0,
      pedidas: new Set(suyas.map((p) => p.ruta)).size,
      peticiones: suyas.length,
    };
  });
}

/** La forma normalizada de una ruta, o la ruta tal cual si no se deja normalizar. */
function normalizadaOTalCual(ruta: string): string {
  try {
    return rutaNormalizada(ruta);
  } catch {
    return ruta;
  }
}

/**
 * Dónde cae una petición ya anotada. **Son tres casos y no dos**, y el tercero es del tiempo.
 *
 * El registro es permanente y el censo es de hoy, así que las dos cosas se separan sin
 * avisar: una URL que se pidió y después se **despublicó** —retirar unas Citas, un Tema que
 * cae bajo su umbral, una Colección borrada— deja de estar en el censo, y con dos casos
 * caía en el mismo saco que la portada. El informe decía entonces «0 pedidas» en su familia
 * y afirmaba que lo que sobraba era la portada, con la petición escrita en el fichero.
 *
 *   · `familia`      — el censo la reparte, y es el caso normal.
 *   · `suelta`       — el sitio la publica y el censo la deja fuera. Hoy, solo la portada.
 *   · `despublicada` — el sitio ya no la publica. Ocurrió, y por eso sigue anotada.
 */
export type DestinoDePeticion =
  | { clase: 'familia'; familia: Familia }
  | { clase: 'suelta' }
  | { clase: 'despublicada' };

/** El destino de una ruta: su familia, lo publicado sin familia, o fuera de lo publicado. */
export function destinoDePeticion(
  ruta: string,
  censo: CensoPorFamilia,
  publicadas: readonly string[],
): DestinoDePeticion {
  const familia = familiaDeRuta(censo, ruta);
  if (familia !== undefined) return { clase: 'familia', familia };

  const normalizada = normalizadaOTalCual(ruta);
  const sigueEnPie = publicadas.some((p) => normalizadaOTalCual(p) === normalizada);
  return sigueEnPie ? { clase: 'suelta' } : { clase: 'despublicada' };
}

/** Cómo se nombra cada destino en pantalla. El tercero se nombra por lo que es. */
export function nombreDelDestino(destino: DestinoDePeticion): string {
  if (destino.clase === 'familia') return NOMBRE_DE_FAMILIA[destino.familia];
  return destino.clase === 'suelta' ? 'sin familia' : 'ya no se publica';
}

/**
 * Las peticiones que el censo no reparte, separadas en sus dos casos.
 *
 * La portada se publica y se puede pedir, pero el censo la deja fuera a propósito: es una
 * URL suelta y lo que la serie compara es el reparto por familia. Se cuenta aparte en vez
 * de repartirla en cualquiera de las cuatro, que falsearía esa familia sin que se notara. Y
 * aparte de ella van las que el sitio dejó de publicar, que no son la portada ni son nada
 * que se pueda cruzar con la serie: son una petición que ocurrió sobre una URL que ya no
 * existe, y solo diciéndolo se entiende por qué su familia cuenta una menos.
 */
export function peticionesFueraDelCenso(
  peticiones: readonly PeticionDeRastreo[],
  censo: CensoPorFamilia,
  publicadas: readonly string[],
): { sueltas: PeticionDeRastreo[]; despublicadas: PeticionDeRastreo[] } {
  const sueltas: PeticionDeRastreo[] = [];
  const despublicadas: PeticionDeRastreo[] = [];
  for (const peticion of peticiones) {
    const destino = destinoDePeticion(peticion.ruta, censo, publicadas);
    if (destino.clase === 'suelta') sueltas.push(peticion);
    else if (destino.clase === 'despublicada') despublicadas.push(peticion);
  }
  return { sueltas, despublicadas };
}

/**
 * Lo que la serie de indexación aporta al cruce, y solo eso.
 *
 * `publicadas` es **el denominador de aquel día**, y por eso viaja: la muestra es una
 * fracción de lo que había cuando se leyó, no de lo que hay hoy. Escribir «1 de 20» junto a
 * un «de 35 publicadas» del censo de hoy pondría dos denominadores de fechas distintas en
 * la misma línea, como si fueran el mismo.
 */
export interface LecturaParaCruce {
  fecha: string;
  familias?: Record<string, { publicadas: number; muestra: number; indexadas: number }>;
}

/**
 * Lo que el cruce **no** puede decir, dicho en el propio informe.
 *
 * La serie guarda recuentos por familia y no **qué URL** inspeccionó. Con muestreo —que
 * desde la 16.1 es el modo normal— la muestra puede no contener ninguna de las pedidas, y
 * nada en disco lo dice: esa «1 indexada» junto a «2 pedidas» puede ser un tercer autor. A
 * eso se suma que el registro guarda la jornada y no la hora, así que ni siquiera se sabe
 * si la lectura precedió a la petición.
 *
 * El reparto por familia **sí** vale y por eso se queda: dice cuánto se pidió de cada una,
 * que es una decisión editorial que se revisa. Lo que no se puede hacer es atribuir un
 * movimiento a una petición, y el informe lo dice en vez de insinuar lo contrario. El hueco
 * de fondo —que la serie anote las rutas muestreadas— está anotado en `deferred-work.md` y
 * es de la Historia 16.1, no de ésta.
 */
const NO_SE_PUEDE_ATRIBUIR = [
  'Lo pedido y lo indexado NO se cruzan URL a URL. La serie guarda recuentos y no qué URL',
  'inspeccionó, así que de las indexadas de una muestra no se puede decir si alguna es de',
  'las pedidas; y el registro guarda la jornada y no la hora, así que tampoco si la lectura',
  'fue antes o después de la petición. El reparto de arriba dice cuánto se pidió de cada',
  'familia, y eso es todo lo que dice: atribuir un movimiento a una petición no es',
  'computable mientras la serie no anote las rutas que muestreó.',
];

/**
 * El informe en pantalla. Lo comparten la consulta y el registro.
 *
 * La última lectura de la serie entra si la hay, porque el cruce es la razón de ser del
 * registro y obligar a abrir dos ficheros para hacerlo a ojo lo dejaría sin hacer. Si no
 * hay serie, se informa igual: el registro vale por sí solo y nada de esto la necesita
 * para escribirse.
 */
export function lineasDeRegistro(
  peticiones: readonly PeticionDeRastreo[],
  censo: CensoPorFamilia,
  /** Lo que el sitio publica **hoy**, para distinguir la portada de lo que se despublicó. */
  publicadas: readonly string[],
  serie: readonly LecturaParaCruce[] = [],
): string[] {
  const lineas = ['Peticiones de rastreo', '═════════════════════', ''];
  let seCruzoConLaSerie = false;

  if (peticiones.length === 0) {
    lineas.push('No hay ninguna petición anotada.');
  } else {
    const jornadas = [...new Set(peticiones.map((p) => p.fecha))].sort();
    for (const fecha of jornadas) {
      lineas.push(`${fecha}`);
      for (const peticion of peticiones.filter((p) => p.fecha === fecha)) {
        const destino = destinoDePeticion(peticion.ruta, censo, publicadas);
        lineas.push(`  ${peticion.ruta}  (${nombreDelDestino(destino)})`);
      }
    }
  }

  // La última por fecha, no la última escrita: la serie se reescribe entera en cada lectura
  // y el orden del fichero no es contrato de nada.
  const ultima = [...serie].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1);

  lineas.push('', 'Por familia — lo pedido frente a lo publicado');
  for (const reparto of repartoPorFamilia(peticiones, censo)) {
    if (reparto.publicadas === 0 && reparto.peticiones === 0) continue;
    const repeticiones =
      reparto.peticiones > reparto.pedidas ? ` en ${reparto.peticiones} peticiones` : '';
    /*
     * Lo indexado de la serie va en la misma línea que lo pedido, y solo si esa familia se
     * leyó: una familia sin leer se omite de la entrada y jamás se escribe como cero, así que
     * aquí tampoco puede aparecer como un cero que nadie midió.
     */
    const leida = ultima?.familias?.[reparto.familia];
    let indexadas = '';
    if (leida !== undefined) {
      seCruzoConLaSerie = true;
      /*
       * Marcada como muestra cuando lo es, igual que hace `lineasDeLectura` en el hermano:
       * «1 de 20» sin decir de dónde sale ese 20 se lee como el total de la familia. Y el
       * denominador es el de **la lectura**, no el censo de hoy, porque son de fechas
       * distintas y aquí van uno al lado del otro.
       */
      const muestreada =
        leida.muestra < leida.publicadas ? ` (muestra de ${leida.publicadas} de aquel día)` : '';
      indexadas =
        `; indexadas ${leida.indexadas} de ${leida.muestra}${muestreada} el ${ultima?.fecha}`;
    }
    lineas.push(
      `  ${NOMBRE_DE_FAMILIA[reparto.familia]}: ${reparto.pedidas} pedidas de ` +
        `${reparto.publicadas} publicadas${repeticiones}${indexadas}`,
    );
  }

  const fuera = peticionesFueraDelCenso(peticiones, censo, publicadas);
  if (fuera.sueltas.length > 0) {
    lineas.push(
      `  Sin familia —la portada no es de ninguna—: ${new Set(fuera.sueltas.map((p) => p.ruta)).size}`,
    );
  }
  if (fuera.despublicadas.length > 0) {
    // Nombrada por lo que es, y con sus rutas: la petición ocurrió y por eso sigue anotada,
    // pero su familia ya no la cuenta y sin esta línea esa resta no se explicaría.
    const rutas = [...new Set(fuera.despublicadas.map((p) => p.ruta))];
    lineas.push(
      `  Ya no se publica —se pidió, y después el sitio la retiró—: ${rutas.length}`,
      ...rutas.map((ruta) => `    ${ruta}`),
    );
  }

  // Y lo que la línea de arriba no puede decir, dicho aquí en vez de insinuado.
  if (seCruzoConLaSerie && peticiones.length > 0) lineas.push('', ...NO_SE_PUEDE_ATRIBUIR);

  if (ultima === undefined) {
    lineas.push('', 'No hay serie de indexación todavía: npx tsx tools/indexacion.ts --registrar');
  }

  return lineas;
}
