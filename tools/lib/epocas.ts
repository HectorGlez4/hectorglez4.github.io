/**
 * La época sale de la Fuente — Historia 19.5.
 *
 * Aquí vive todo lo que se puede decir de una época **sin salir a la red**: qué categorías
 * de la Fuente la declaran, cómo se le piden sus miembros, cómo se lee lo que contesta y
 * cómo se cruza esa lista contra el Corpus. Quien pide es `tools/epocas.ts`, la cáscara, y
 * nadie más (AD-22).
 *
 * ── Por qué la lista se deriva y no se escribe ───────────────────────────────────────
 *
 * Wikisource-es clasifica a sus autores por época, y de esa clasificación salen las tres
 * cosas que hacían falta: **la lista** de candidatos, **el criterio de admisión** —la marca
 * `DP-Autores-100`, que es la propia Fuente diciendo que el autor lleva más de cien años
 * muerto— y **la condición de término**, que es una cuenta y no una opinión: una época
 * está terminada cuando todos sus candidatos están sembrados o descartados con motivo.
 *
 * Una lista de noventa autores escrita a mano en el repositorio se queda vieja en cuanto la
 * Fuente crece, y nadie la mantiene: sería la cuarta lista del proyecto, y la Historia 12.1
 * ya enseñó lo que pasa cuando una superficie se declara en más de un sitio. Derivándola,
 * crecer la Fuente crece el plan.
 *
 * ── `DP-Autores-100` es señal, no permiso ────────────────────────────────────────────
 *
 * La marca entra en el informe y **jamás en una puerta automática**. Admitir sigue siendo
 * del editor y la puerta de admisión no se mueve un milímetro: dominio público, año de
 * fallecimiento, Procedencia y cotejo siguen exactamente igual. Lo que la marca hace es
 * separar a quien la Fuente ya clasificó de quien hay que mirar a mano.
 *
 * ── Lo que la categoría trae y conviene saber antes de sembrar ───────────────────────
 *
 * Medido el 2026-09-06: la categoría de la Antigüedad trae matemáticos (Euclides,
 * Diofanto), geógrafos (Estrabón) y mitógrafos (Apolodoro). Su prosa no da sentencia
 * suelta, que es el defecto que la bitácora ya catalogó con Palma y con Fígaro. No se
 * excluyen de la lista —la lista es de la Fuente, no nuestra— y por eso existe el registro
 * de descartes: para que «no da Citas» quede escrito una vez y no se reintente en bucle.
 *
 * AD-5 — Derivación pura: recibe lo recuperado, no lo recupera.
 */

import { slugDeAutor } from '../../src/lib/slug.ts';
import type { EpocaParaHuecos } from '../../src/lib/huecos.ts';
/*
 * Solo el tipo del fichero versionado, y a propósito: quien lee y escribe el disco es
 * `tools/lib/corpus.ts`, y al ser `import type` TypeScript lo borra al compilar, así que
 * este módulo sigue siendo puro y sin dependencia en ejecución.
 */
import type { EpocaRegistrada } from './corpus.ts';

/**
 * La Fuente de la que salen las épocas, por su id en el conjunto cerrado de `fuentes.ts`.
 *
 * No es una Fuente nueva: Wikisource-es ya está admitida y su licencia ya está declarada
 * allí. Se nombra aquí porque **es la única contra la que se admite una dirección de esta
 * orden**: `pedirALaFuente` comprueba que `fuenteDeUrl` devuelva exactamente esta id antes
 * de pedir nada. Comprobar solo que la dirección sea de *alguna* Fuente admitida dejaba
 * pasar una consulta compuesta contra Gutenberg —que no tiene esta API— y la respuesta
 * habría entrado en el lector de categorías como si viniera de aquí.
 */
export const FUENTE_DE_LAS_EPOCAS = 'wikisource-es';

/** El punto de la API de la Fuente por el que se enumeran categorías. */
export const API_DE_LA_FUENTE = 'https://es.wikisource.org/w/api.php';

/** De dónde cuelgan las páginas de autor de la Fuente. */
export const RAIZ_DE_PAGINAS = 'https://es.wikisource.org';

/**
 * El espacio de nombres de los autores en Wikisource-es.
 *
 * Se pide **explícito** en cada consulta. Sin él, cualquier página que alguien categorice
 * por error —una obra, una discusión— entraría en la lista de candidatos como si fuera un
 * autor, y el cruce contra el Corpus la contaría como pendiente para siempre.
 */
export const ESPACIO_DE_AUTORES = 106;

/** El prefijo con el que la Fuente titula las páginas de ese espacio. */
export const PREFIJO_DE_AUTOR = 'Autor:';

/**
 * La categoría con la que la Fuente marca a los muertos hace más de cien años.
 *
 * Es exactamente la comprobación en la que se apoya la regla suave de FR-49, y es **señal y
 * no permiso**: se enseña en el informe, y quien admite es el editor.
 */
export const CATEGORIA_DE_DOMINIO_PUBLICO = 'Categoría:DP-Autores-100';

/**
 * Cuántos miembros se piden por petición.
 *
 * Cincuenta y no quinientos porque la consulta lleva `prop=categories` colgando del
 * generador, y ahí la API sirve de cincuenta en cincuenta para quien no es bot. Pedir más
 * no trae más: trae lo mismo con una continuación, y confiar en que no la haya es lo que
 * corta una época por la mitad sin decirlo.
 */
export const MIEMBROS_POR_PETICION = 50;

/**
 * Tope de peticiones por época. Con 83 miembros en la más grande sobran de largo.
 *
 * Existe porque una continuación mal leída —o una API que la repita— dejaría el bucle
 * pidiendo para siempre, y una orden colgada es peor que un aviso porque no se puede leer.
 */
export const MAXIMO_DE_PAGINAS = 20;

/**
 * Cuántos días vale una lista recuperada antes de que el informe avise de su edad.
 *
 * La lista se versiona para que el bucle siga trabajando con la Fuente caída, y esa misma
 * caché reintroduce por la puerta de atrás el problema que la historia venía a quitar: una
 * lista que se queda vieja. «TERMINADA» se imprime igual si se recuperó hoy que hace ocho
 * meses, y en el segundo caso significa «terminada respecto de lo que la Fuente decía hace
 * ocho meses», que no es lo mismo.
 *
 * Treinta días: es más de lo que dura un sprint y menos de lo que tarda una categoría de
 * Wikisource en crecer de forma que cambie el plan. **No es una puerta**: el informe avisa y
 * sigue contando, porque una lista vieja sigue siendo mejor que ninguna.
 */
export const DIAS_DE_VIGENCIA_DE_LA_LISTA = 30;

/**
 * Cuántos días han pasado desde que se recuperó una lista, o `undefined` si no consta.
 *
 * Recibe el día en vez de leer el reloj: es lo que la deja pura y probable sin congelar el
 * tiempo, igual que `objetivoDeSesion` mantiene la fecha fuera de la derivación.
 *
 * Las dos fechas son jornadas locales en `AAAA-MM-DD` —lo que escribe `fechaLocal`—, y se
 * comparan como jornadas y no como instantes: con horas de por medio, «recuperada hoy» daría
 * cero o uno según la hora a la que se preguntara.
 */
export function diasDesdeLaRecuperacion(
  recuperada: string | undefined,
  hoy: string,
): number | undefined {
  const jornada = (fecha: string | undefined): number | undefined => {
    if (fecha === undefined) return undefined;
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(fecha);
    if (partes === null) return undefined;
    // El mes va de 1 a 12 en la jornada escrita y de 0 a 11 en `Date.UTC`: sin el −1, un
    // salto de diciembre a enero mediría los días del mes equivocado.
    return Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  };

  const desde = jornada(recuperada);
  const hasta = jornada(hoy);
  if (desde === undefined || hasta === undefined) return undefined;
  return Math.max(0, Math.round((hasta - desde) / 86_400_000));
}

/** Si una lista recuperada ese día ya pasó del plazo. Sin fecha escrita, se avisa igual. */
export function listaCaducada(recuperada: string | undefined, hoy: string): boolean {
  const dias = diasDesdeLaRecuperacion(recuperada, hoy);
  return dias === undefined || dias > DIAS_DE_VIGENCIA_DE_LA_LISTA;
}

/**
 * Una época, tal y como la **declara la Fuente**.
 *
 * `categoria` es el título literal de la categoría en Wikisource-es. No se inventa ninguna:
 * añadir una que la Fuente no declare, o categorías que no sean suyas, es decisión del
 * editor y no de esta lista.
 *
 * Las cuatro se solapan a propósito y no se deduplican: la Antigüedad contiene a Grecia y a
 * Roma, y un candidato cuenta en cada época en la que la Fuente lo clasificó. Fundirlas en
 * un conjunto único borraría justo lo que se quiere medir, que es la cobertura **por
 * época**, de forma extensiva y hasta agotarla.
 */
export interface Epoca {
  /** El identificador con el que la época viaja por el Corpus y por el informe. */
  id: string;
  /** Cómo se llama en el informe. Es el nombre de la época, nunca el de un autor. */
  nombre: string;
  /** El título literal de la categoría en la Fuente. */
  categoria: string;
}

/**
 * Las épocas que la Fuente declara, medidas el 2026-09-06 contra su API.
 *
 * Antigüedad 83 autores, Antigua Roma 63, Antigua Grecia 35, católicos 8. Esto **no es un
 * catálogo de autores que haya que mantener**: son cuatro títulos de categoría, y la lista
 * de quién está en cada una la contesta la Fuente cada vez que se le pregunta.
 */
export const EPOCAS: readonly Epoca[] = [
  {
    id: 'antiguedad',
    nombre: 'Antigüedad',
    categoria: 'Categoría:Autores de la Antigüedad',
  },
  {
    id: 'antigua-grecia',
    nombre: 'Antigua Grecia',
    categoria: 'Categoría:Autores de la Antigua Grecia',
  },
  {
    id: 'antigua-roma',
    nombre: 'Antigua Roma',
    categoria: 'Categoría:Autores de la Antigua Roma',
  },
  {
    id: 'catolicos',
    nombre: 'Autores católicos',
    categoria: 'Categoría:Autores católicos',
  },
];

/** La época de un identificador, o `undefined` si no la declara la Fuente. */
export function epocaDe(id: string): Epoca | undefined {
  return EPOCAS.find((epoca) => epoca.id === id);
}

/**
 * La dirección con la que se le piden a la Fuente los miembros de una categoría.
 *
 * Una sola consulta trae las dos cosas que hacen falta: los miembros —por el generador— y
 * cuáles de ellos llevan la marca de dominio público, por `prop=categories` acotado a esa
 * única categoría. Pedirlo en dos pasadas habría multiplicado por dos las peticiones a una
 * Fuente que se comparte con todo el mundo.
 *
 * `continuar` son los parámetros que la propia respuesta devuelve cuando quedan miembros
 * por servir. Se reenvían tal cual: componerlos a mano es la forma clásica de repetir la
 * primera página para siempre.
 */
export function direccionDeCategoria(
  epoca: Epoca,
  continuar: Record<string, string> = {},
): string {
  const parametros = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'categorymembers',
    gcmtitle: epoca.categoria,
    gcmtype: 'page',
    gcmnamespace: String(ESPACIO_DE_AUTORES),
    gcmlimit: String(MIEMBROS_POR_PETICION),
    prop: 'categories',
    clcategories: CATEGORIA_DE_DOMINIO_PUBLICO,
    cllimit: 'max',
  });
  for (const [clave, valor] of Object.entries(continuar)) parametros.set(clave, valor);
  return `${API_DE_LA_FUENTE}?${parametros.toString()}`;
}

/** La dirección de la página de un autor en la Fuente, a partir de su título. */
export function paginaDeAutor(titulo: string): string {
  return new URL(`/wiki/${titulo.replace(/ /gu, '_')}`, RAIZ_DE_PAGINAS).toString();
}

/**
 * Un candidato de una época, tal y como lo declara la Fuente.
 *
 * `slug` es lo único con lo que se cruza contra el Corpus, y sale del **mismo** derivador
 * que nombra el fichero de un Autor (`slugDeAutor`). Con una canonización propia, «Séneca»
 * habría dado un slug aquí y otro en `corpus/autores/`, y el cruce habría contado como
 * pendiente a quien ya está sembrado.
 */
export interface Candidato {
  /** El nombre del autor tal y como lo titula la Fuente, ya sin el prefijo del espacio. */
  nombre: string;
  /** Con lo que se cruza contra el Corpus. */
  slug: string;
  /**
   * El identificador de página de la Fuente, que es **lo único suyo que no se mueve**.
   *
   * El slug se deriva del título del wiki, y un título de wiki se mueve: el día que
   * Wikisource renombre «Autor:Apolodoro de Atenas» a «Autor:Apolodoro», el slug cambia, el
   * descarte escrito deja de casar y el candidato se vuelve a proponer — que es exactamente
   * el bucle que el registro de descartes existe para cortar. El `pageid` sobrevive al
   * renombrado, la consulta ya lo recibe, y desde la revisión de la 19.5 se guarda.
   *
   * Opcional porque una lista versionada antes de este cambio no lo lleva: ahí el cruce se
   * queda con el slug, que es lo que había.
   */
  idDePagina?: number;
  /** Su página en la Fuente, para no tener que volver a componerla. */
  pagina: string;
  /**
   * Si la Fuente lo clasifica en `DP-Autores-100`.
   *
   * Se escribe siempre, también cuando es `false`: la ausencia de la marca es un dato —«hay
   * que mirarlo a mano»— y no una casilla que se olvidó de rellenar.
   */
  dominioPublico: boolean;
}

/** Los candidatos de una época, con el día en que se le preguntaron a la Fuente. */
export interface CandidatosDeEpoca {
  id: string;
  nombre: string;
  categoria: string;
  /** La jornada local en que se recuperó. */
  recuperada: string;
  candidatos: Candidato[];
}

/** Lo que una respuesta de la Fuente trae: candidatos y, si queda cola, por dónde seguir. */
export interface PaginaDeCandidatos {
  candidatos: Candidato[];
  continuar?: Record<string, string>;
  /**
   * Si la respuesta trajo `query`, o sea si la Fuente contestó algo sobre la categoría.
   *
   * **Es la diferencia entre «no hay nadie» y «no ha contestado», y no se puede leer del
   * número de candidatos.** Medido el 2026-09-06 contra la API: una categoría que no existe
   * —porque la renombraron— contesta `200` con `{"batchcomplete":true,"limits":{…}}`, sin
   * `error` y sin `query`, exactamente igual que una categoría vacía. Quien lea las dos como
   * «cero candidatos, recuperación correcta» sustituye la lista buena de una época por una
   * vacía sellada con la fecha de hoy, y sale con código 0 sin decir una palabra.
   */
  respondio: boolean;
}

/**
 * Lee la respuesta de la Fuente. **Es lo único de esta historia que puede equivocarse en
 * silencio**, y por eso está aquí y no en la cáscara: leer el veredicto de otro sub-objeto,
 * o dar por buena una respuesta de error, produciría una lista vacía con cara de época
 * agotada.
 *
 * Una respuesta que declara `error` se rechaza lanzando: la API contesta 200 con el error
 * dentro, así que quien mire solo el código de estado la tomaría por buena.
 *
 * `continue` se lee **antes que nada**, y ese orden es el arreglo de un fallo medido: con la
 * lectura al final, las salidas tempranas por «no vino `query`» descartaban la continuación,
 * quien llama veía `continuar === undefined` y daba la época por servida entera. Reproducido:
 * 50 de 63 devueltos como completos, sin excepción y sin aviso — justo lo que el comentario
 * de `recuperarEpoca` dice evitar.
 */
export function candidatosDeRespuesta(datos: unknown): PaginaDeCandidatos {
  if (datos === null || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new Error('La Fuente no devolvió un objeto de respuesta.');
  }

  const cuerpo = datos as Record<string, unknown>;

  const error = cuerpo.error;
  if (error !== null && error !== undefined && typeof error === 'object') {
    const detalle = (error as Record<string, unknown>).info;
    throw new Error(
      `La Fuente devolvió un error: ${typeof detalle === 'string' ? detalle : JSON.stringify(error)}`,
    );
  }

  // Lo primero, y antes de cualquier salida: una continuación descartada corta la época.
  const continuar = cuerpo.continue;
  const siguiente =
    continuar !== null && typeof continuar === 'object' && !Array.isArray(continuar)
      ? Object.fromEntries(
          Object.entries(continuar as Record<string, unknown>)
            .filter(([, valor]) => typeof valor === 'string' || typeof valor === 'number')
            .map(([clave, valor]) => [clave, String(valor)]),
        )
      : undefined;
  const cola =
    siguiente !== undefined && Object.keys(siguiente).length > 0 ? { continuar: siguiente } : {};

  const consulta = cuerpo.query;
  const paginas =
    consulta !== null && consulta !== undefined && typeof consulta === 'object'
      ? (consulta as Record<string, unknown>).pages
      : undefined;

  /*
   * Sin `query` no se sabe si la categoría está vacía o si ya no existe, así que se dice que
   * no hubo respuesta útil y decide quien llama. Lo que sí es un fallo aquí y ahora es que la
   * Fuente prometa continuación y no traiga lo que continúa: eso no es una lista vacía, es
   * una lista partida por la mitad, y seguir pidiendo desde ahí devolvería una época más
   * corta que la real con cara de estar más cerca de terminarse.
   */
  if (!Array.isArray(paginas)) {
    if ('continuar' in cola) {
      throw new Error(
        'La Fuente prometió continuación y no devolvió «query»: la categoría se estaba ' +
          'sirviendo y esta respuesta no trae su trozo. Una época servida a medias se lee ' +
          'después como una época más cerca de estar terminada de lo que está.',
      );
    }
    return { candidatos: [], respondio: false };
  }

  const candidatos: Candidato[] = [];
  for (const pagina of paginas) {
    if (pagina === null || typeof pagina !== 'object') continue;
    const titulo = (pagina as Record<string, unknown>).title;
    if (typeof titulo !== 'string' || !titulo.startsWith(PREFIJO_DE_AUTOR)) continue;

    const nombre = titulo.slice(PREFIJO_DE_AUTOR.length).trim();
    if (nombre === '') continue;

    const categorias = (pagina as Record<string, unknown>).categories;
    /*
     * La consulta va acotada a una sola categoría con `clcategories`, así que la clave
     * aparece **solo** en las páginas que la llevan. Aun así se comprueba el título: acotar
     * y confiar es lo que convierte un cambio de parámetro en una marca puesta a todos.
     */
    const dominioPublico =
      Array.isArray(categorias) &&
      categorias.some(
        (c) =>
          c !== null &&
          typeof c === 'object' &&
          (c as Record<string, unknown>).title === CATEGORIA_DE_DOMINIO_PUBLICO,
      );

    // El identificador de página, que es lo único del candidato que no se mueve cuando
    // Wikisource renombra su título. La consulta ya lo trae; tirarlo era tirar la clave.
    const idDePagina = (pagina as Record<string, unknown>).pageid;

    candidatos.push({
      nombre,
      slug: slugDeAutor(nombre),
      ...(typeof idDePagina === 'number' && Number.isInteger(idDePagina)
        ? { idDePagina }
        : {}),
      pagina: paginaDeAutor(titulo),
      dominioPublico,
    });
  }

  return { candidatos, respondio: true, ...cola };
}

/**
 * Ordena y deduplica los candidatos de una época.
 *
 * Por slug y en español, como el resto de las vistas del proyecto: la API sirve por
 * identificador de página, que es orden de creación en la Fuente, y con él el fichero
 * versionado cambiaría de orden sin que cambiara nada del Corpus. Un diff que se mueve solo
 * deja de leerse.
 *
 * La deduplicación es por slug y no por título porque el cruce es por slug: dos títulos
 * distintos que canonizan al mismo Autor son un candidato, no dos, y contarlos dos veces
 * haría que una época nunca llegase a estar terminada.
 */
export function ordenarCandidatos(candidatos: readonly Candidato[]): Candidato[] {
  const porSlug = new Map<string, Candidato>();
  for (const candidato of candidatos) {
    const previo = porSlug.get(candidato.slug);
    // Entre dos que canonizan igual gana el que lleva la marca: es el dato, no el orden.
    if (previo === undefined || (!previo.dominioPublico && candidato.dominioPublico)) {
      porSlug.set(candidato.slug, candidato);
    }
  }
  return [...porSlug.values()].sort((a, b) => a.slug.localeCompare(b.slug, 'es'));
}

/** Un descarte ya escrito: por qué ese candidato no da Citas, y desde cuándo. */
export interface Descarte {
  /** El slug del candidato descartado. */
  candidato: string;
  /** Su identificador de página en la Fuente, que sobrevive a un renombrado del título. */
  idDePagina?: number;
  motivo: string;
  fecha?: string;
}

/**
 * Los descartes escritos, indexados por las dos claves con las que se puede reconocer a un
 * candidato.
 *
 * Dos y no una porque **la buena no siempre está**. El `pageid` de la Fuente es la clave
 * estable —Wikisource puede mover «Autor:Apolodoro de Atenas» a «Autor:Apolodoro» y el
 * identificador no cambia—, pero los descartes escritos antes de la revisión de la 19.5 no lo
 * llevan, y ahí lo único que hay es el slug. El slug queda de reserva y no de titular: es lo
 * que se mueve.
 */
export interface DescartesEscritos {
  porSlug: ReadonlyMap<string, string>;
  porIdDePagina: ReadonlyMap<number, string>;
}

/**
 * El último motivo escrito para cada candidato descartado, por sus dos claves.
 *
 * **El último gana.** El registro solo añade, así que una revisión posterior del motivo se
 * escribe debajo y es la que vale; reescribir la de arriba habría borrado desde cuándo se
 * descartó, que es la mitad de lo que el registro guarda.
 */
export function descartesPorCandidato(descartes: readonly Descarte[]): DescartesEscritos {
  const porSlug = new Map<string, string>();
  const porIdDePagina = new Map<number, string>();
  for (const descarte of descartes) {
    porSlug.set(descarte.candidato, descarte.motivo);
    if (descarte.idDePagina !== undefined) porIdDePagina.set(descarte.idDePagina, descarte.motivo);
  }
  return { porSlug, porIdDePagina };
}

/** En qué estado está un candidato respecto del Corpus. */
export type EstadoDeCandidato = 'sembrado' | 'descartado' | 'pendiente';

/**
 * Un candidato ya cruzado contra el Corpus.
 *
 * `motivo` solo cuando está descartado, y es la diferencia entera entre descartar y
 * saltarse: un candidato sin motivo escrito se vuelve a mirar la sesión siguiente, y la
 * siguiente, hasta que alguien se canse. Que es exactamente como una época se da por
 * terminada sin estarlo.
 */
export interface CandidatoCruzado extends Candidato {
  estado: EstadoDeCandidato;
  motivo?: string;
}

/**
 * El cruce de una época contra el Corpus: quién está sembrado, quién descartado y quién no.
 *
 * Es puro y no lee disco: recibe los slugs de los Autores que el Corpus ya declara y los
 * descartes ya escritos. Quien los lee es la cáscara.
 *
 * **El descarte se lleva por slug y no por época.** Un autor cuya prosa no da sentencia
 * suelta no la da en ninguna de las cuatro categorías en las que la Fuente lo haya
 * clasificado, y con el descarte por época habría que escribir el mismo motivo tres veces
 * para que la Antigüedad dejara de proponerlo.
 */
export function cruzarEpoca(
  lista: CandidatosDeEpoca,
  sembrados: ReadonlySet<string>,
  descartes: DescartesEscritos,
): { epoca: EpocaParaHuecos; candidatos: CandidatoCruzado[] } {
  const candidatos: CandidatoCruzado[] = lista.candidatos.map((candidato) => {
    if (sembrados.has(candidato.slug)) return { ...candidato, estado: 'sembrado' as const };
    /*
     * Primero por identificador de página y **luego** por slug: el identificador sobrevive a
     * un renombrado del título en la Fuente y el slug no. Con el slug de titular, mover
     * «Autor:Apolodoro de Atenas» a «Autor:Apolodoro» descasaba el descarte y devolvía el
     * candidato a la lista de pendientes — el bucle que el registro existe para cortar.
     */
    const motivo =
      (candidato.idDePagina === undefined
        ? undefined
        : descartes.porIdDePagina.get(candidato.idDePagina)) ?? descartes.porSlug.get(candidato.slug);
    if (motivo !== undefined) {
      return { ...candidato, estado: 'descartado' as const, motivo };
    }
    return { ...candidato, estado: 'pendiente' as const };
  });

  return {
    epoca: {
      id: lista.id,
      nombre: lista.nombre,
      candidatos: candidatos.length,
      sembrados: candidatos.filter((c) => c.estado === 'sembrado').length,
      descartados: candidatos.filter((c) => c.estado === 'descartado').length,
      ...(lista.recuperada === '' ? {} : { recuperada: lista.recuperada }),
    },
    candidatos,
  };
}

/**
 * Los pendientes de una época que **la Fuente no clasifica** como dominio público.
 *
 * Se cuentan aparte porque piden otra cosa: no se admiten solos, se miran a mano. La marca
 * es señal y no permiso, así que tenerla tampoco admite a nadie — pero no tenerla sí obliga
 * a comprobar el año de fallecimiento antes de nada.
 */
export function pendientesSinMarca(candidatos: readonly CandidatoCruzado[]): CandidatoCruzado[] {
  return candidatos.filter((c) => c.estado === 'pendiente' && !c.dominioPublico);
}

/**
 * Una época ya versionada, devuelta a la forma con la que se cruza — **con un solo dueño**.
 *
 * Estaba escrita dos veces, línea a línea, en `tools/epocas.ts` y en `tools/huecos.ts`. Dos
 * copias de un adaptador son dos sitios donde puede divergir, y el día que una lo hiciera las
 * dos órdenes darían cuentas distintas del **mismo fichero**: `npm run epocas` diría que a la
 * Antigüedad le faltan ochenta y `npm run huecos` diría otra cosa. Es exactamente la
 * duplicación que la Historia 12.1 existe para cerrar.
 *
 * Lo que falta se completa con lo que la Fuente declara (`epocaDe`) y, en último término, con
 * el propio id: una lista versionada por una versión anterior de la orden tiene que poder
 * leerse igual.
 */
export function listaDeEpocaRegistrada(registrada: EpocaRegistrada): CandidatosDeEpoca {
  const declarada = epocaDe(registrada.id);
  return {
    id: registrada.id,
    nombre: registrada.nombre ?? declarada?.nombre ?? registrada.id,
    categoria: registrada.categoria ?? declarada?.categoria ?? '',
    recuperada: registrada.recuperada ?? '',
    candidatos: (registrada.candidatos ?? []).map((candidato) => ({
      nombre: candidato.nombre,
      slug: candidato.slug,
      ...(typeof candidato.idDePagina === 'number' ? { idDePagina: candidato.idDePagina } : {}),
      pagina: candidato.pagina ?? '',
      dominioPublico: candidato.dominioPublico === true,
    })),
  };
}

/**
 * Los slugs con los que un Autor del Corpus puede aparecer en la Fuente.
 *
 * El cruce compara el slug derivado del **título de la Fuente** contra el nombre del fichero
 * del Corpus, y los dos no tienen por qué coincidir. Hoy funciona por suerte del único caso
 * que ha entrado —«Autor:Séneca» → `seneca.yml`—, y está latente para los demás: medido el
 * 2026-09-06, Wikisource titula «Autor:Santa Teresa de Jesús» y el Corpus tiene
 * `teresa-de-jesus.yml`. El día que esa categoría entre, Teresa se contaría como pendiente
 * estando sembrada, y la época no podría terminarse **nunca**: la cuenta que declara una
 * época terminada nunca llegaría a cero.
 *
 * De ahí `tituloEnFuente`, que es un alias **explícito y escrito por el editor** en el fichero
 * del Autor. Explícito y no adivinado a propósito: una heurística que quitara «Santa», «Fray»
 * o «San» fundiría a dos Autores distintos el día que la Fuente tenga los dos, y ese error no
 * avisa — deja una época terminada de más.
 */
export function slugsSembrados(
  autores: readonly { slug: string; tituloEnFuente?: string }[],
): Set<string> {
  const slugs = new Set<string>();
  for (const autor of autores) {
    slugs.add(autor.slug);
    if (autor.tituloEnFuente !== undefined && autor.tituloEnFuente.trim() !== '') {
      slugs.add(slugDeAutor(autor.tituloEnFuente));
    }
  }
  return slugs;
}

/**
 * La cobertura por época que consume `verHuecos`, derivada de lo ya leído — Historia 19.5.
 *
 * **Un solo dueño para las tres órdenes que la enseñan.** `npm run huecos` y `npm run
 * objetivo` derivan las dos su objetivo de sesión del mismo `Huecos`, y desde que la época
 * entra en `objetivoDeSesion` una de las dos leyéndola y la otra no daría dos respuestas a
 * «qué toca ahora» — que es exactamente la divergencia que esta revisión vino a cerrar, con
 * el signo cambiado.
 *
 * Sigue siendo pura y no toca disco (AD-5): recibe lo leído. Quien lee es cada cáscara, con
 * `leerCandidatosPorEpoca`, `leerDescartesDeCandidatos` y `leerAutores`.
 */
export function epocasParaHuecos(
  versionadas: readonly EpocaRegistrada[],
  autores: readonly { slug: string; tituloEnFuente?: string }[],
  descartes: readonly Descarte[],
): EpocaParaHuecos[] {
  const sembrados = slugsSembrados(autores);
  const escritos = descartesPorCandidato(descartes);
  return versionadas.map(
    (versionada) => cruzarEpoca(listaDeEpocaRegistrada(versionada), sembrados, escritos).epoca,
  );
}

/** Una época que no se pudo actualizar, con el motivo que se le dice al editor. */
export interface EpocaSinActualizar {
  id: string;
  motivo: string;
}
