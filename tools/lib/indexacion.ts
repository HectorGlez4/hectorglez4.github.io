/**
 * Qué inspeccionar y cómo se agrega el estado de indexación — Historia 16.1, Épica 16.
 *
 * Aquí vive **la única lógica interesante** de la historia: repartir un presupuesto de
 * peticiones entre las cuatro familias y decidir qué URL se miran. La red no entra
 * (AD-22): esto recibe el conjunto publicable y un número, y devuelve un plan. Por eso se
 * puede probar entera sin salir a ninguna parte, que es justo lo que hace falta cuando el
 * techo de cuota se cruce —y se va a cruzar pronto—.
 *
 * ── Por qué por familia y no en total ────────────────────────────────────────────────
 *
 * El total engaña. El remedio no es el mismo para las 1.639 páginas de una frase que para
 * las ~75 de agregación, y un porcentaje global no dice cuál de las dos falla. La cifra
 * que se compara con la meta de indexación es la de la familia **Cita**, nunca el agregado
 * del sitio.
 *
 * ── La restricción externa, medida y no supuesta ─────────────────────────────────────
 *
 * La fuente no expone informe de cobertura ni total agregado: solo inspección de **una URL
 * por petición**, con techo de 2.000 al día y 600 por minuto por propiedad. Las ~1.716 URL
 * de hoy son el 86 % de la cuota diaria: cabe una pasada completa y no dos. A partir de
 * ~2.000 deja de caber, y la serie pasa a componerse por **muestreo declarado por
 * familia**, con el tamaño de muestra escrito en la entrada para que una comparación entre
 * jornadas sepa qué compara.
 *
 * ── Ausencia antes que cero ──────────────────────────────────────────────────────────
 *
 * Una familia cuya lectura no se logró **se omite**; jamás se escribe cero. El cero real
 * es casi el estado de hoy —8 URL indexadas de 1.715— y tiene que seguir siendo
 * distinguible de la ausencia. `componerLectura` es la puerta que lo garantiza.
 */

import {
  autoresPublicados,
  temasPublicados,
  type ConjuntoPublicable,
} from '../../src/lib/publicado.ts';
import {
  rutaDeAutor,
  rutaDeCita,
  rutaDeColeccion,
  rutaDeTema,
} from '../../src/lib/superficies.ts';

/**
 * Las cuatro familias del sitio, y no hay una quinta.
 *
 * La portada no es de ninguna, y quedarse fuera es deliberado: es **una** URL, y meterla
 * en cualquiera de las cuatro falsearía el reparto de esa familia sin que nadie lo notara.
 * Lo que esta serie compara entre jornadas es el reparto por familia; una URL suelta que
 * no pertenece a ninguna no tiene con qué compararse.
 */
export type Familia = 'cita' | 'autor' | 'tema' | 'coleccion';

/** El orden en el que se nombran y se reparten. Es el del PRD: Cita, Autor, Tema, Colección. */
export const FAMILIAS: readonly Familia[] = ['cita', 'autor', 'tema', 'coleccion'];

/** El nombre con el que el producto llama a cada familia — PRD §3, y no se traduce. */
export const NOMBRE_DE_FAMILIA: Readonly<Record<Familia, string>> = {
  cita: 'Cita',
  autor: 'Autor',
  tema: 'Tema',
  coleccion: 'Colección',
};

/**
 * El techo diario de inspecciones por propiedad — restricción externa **medida**.
 *
 * No se vuelve a comprobar y no se negocia: es lo que la fuente concede. Se declara aquí
 * para que el presupuesto por omisión de la orden salga de un solo sitio.
 */
export const TECHO_DIARIO_DE_INSPECCIONES = 2000;

/** El techo por minuto de la misma propiedad. De él sale el paso de la orden. */
export const PETICIONES_POR_MINUTO = 600;

/**
 * El suelo de muestra de una familia cuando el presupuesto no da para todas.
 *
 * Por debajo de veinte, una sola URL mueve el porcentaje más de cinco puntos y dos
 * jornadas dejan de ser comparables, que es lo único que esta serie existe para permitir.
 * Una familia con menos URL publicadas que esto se lee entera; el suelo nunca inventa
 * peticiones que no hacen falta.
 */
export const MUESTRA_MINIMA_POR_FAMILIA = 20;

/**
 * El veredicto con el que la fuente dice «esta URL está indexada».
 *
 * La regla vive aquí y no en la cáscara a propósito: es una decisión sobre el dato —qué
 * cuenta como indexada— y decidirla junto al `fetch` la dejaría sin prueba.
 */
export const VEREDICTO_DE_INDEXADA = 'PASS';

export function esIndexada(veredicto: string | null | undefined): boolean {
  return veredicto === VEREDICTO_DE_INDEXADA;
}

/**
 * Lo que se le pide a la fuente por una URL. **Puro, y probado directamente.**
 *
 * Vive aquí y no junto al cliente por lo que se rompería en silencio si viviera allí: si la
 * composición se tuerce —sin barra final, o `siteUrl` con el dominio desnudo en vez de la
 * propiedad `sc-domain:`— la fuente contesta «desconocida para Google» a **todas**, la serie
 * escribe cero en todas las familias, y ese cero es indistinguible del cero real de hoy: 8
 * URL indexadas de 1.715. Sería exactamente el cero fabricado que la cabecera del fichero
 * jura no escribir, y ninguna prueba con un inspector fingido lo vería.
 */
export interface PeticionDeInspeccion {
  inspectionUrl: string;
  siteUrl: string;
}

export function peticionDeInspeccion(dominio: string, ruta: string): PeticionDeInspeccion {
  if (!ruta.startsWith('/') || !ruta.endsWith('/')) {
    /*
     * La ruta canónica del sitio **siempre** lleva barra final: el hospedaje sirve
     * `foo/index.html`, así que `/foo/` responde directa y `/foo` llega con un 301. Preguntar
     * por la forma que redirige devuelve «desconocida para Google» y contaría como no
     * indexada. Se rompe aquí en vez de medir mal.
     */
    throw new Error(
      `«${ruta}» no es una ruta canónica del sitio: se esperaba una que empiece y acabe en ` +
        '«/». Las rutas salen de los constructores de `src/lib/superficies.ts` y no se ' +
        'escriben a mano; la forma sin barra final redirige, y preguntar por ella devolvería ' +
        'que el buscador no la conoce.',
    );
  }
  return {
    inspectionUrl: new URL(ruta, `https://${dominio}`).toString(),
    siteUrl: propiedadDeDominio(dominio),
  };
}

/** Lo que se escribe cuando la fuente no declara estado de cobertura. */
export const ESTADO_SIN_DECLARAR = 'sin declarar';

/** El trozo de la respuesta de la fuente que esta serie mira, y solo ese. */
export interface RespuestaDeInspeccion {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: string | null;
      coverageState?: string | null;
    } | null;
  } | null;
}

/**
 * Qué se guarda de una respuesta. **Se rompe si no trae veredicto**, y es lo correcto.
 *
 * Contar una respuesta sin veredicto como «no indexada» es fabricar un cero: una respuesta
 * que llega vacía —porque el sub-objeto cambió de sitio, porque la petición iba mal
 * compuesta— produciría una entrada entera de ceros con cara de lectura buena. La familia
 * entera se omite, que es lo que esta serie hace con lo que no logró leer.
 */
export function inspeccionDe(ruta: string, respuesta: RespuestaDeInspeccion): Inspeccion {
  const estadoDeIndice = respuesta.inspectionResult?.indexStatusResult;
  const veredicto = estadoDeIndice?.verdict;

  if (typeof veredicto !== 'string' || veredicto === '') {
    throw new Error(
      `La respuesta sobre «${ruta}» no trae veredicto de indexación. No se cuenta como no ` +
        'indexada: un cero fabricado es indistinguible del cero real, que es casi el estado ' +
        'de partida.',
    );
  }

  return {
    ruta,
    veredicto,
    // El estado de cobertura sí se admite ausente: es el diagnóstico, no el recuento. Que
    // falte no falsea ninguna cifra, y decirlo vale más que dejar el hueco sin nombre.
    estado:
      typeof estadoDeIndice?.coverageState === 'string' && estadoDeIndice.coverageState !== ''
        ? estadoDeIndice.coverageState
        : ESTADO_SIN_DECLARAR,
  };
}


/**
 * La propiedad de Search Console del dominio, tal y como la nombra la API.
 *
 * `sc-domain:` y no `https://…` porque la propiedad que se dio de alta es de **dominio**
 * y no de prefijo de URL (DESPLIEGUE.md §2): cubre de una vez el ápice, el `www`, `http` y
 * `https`. Con una de prefijo harían falta cuatro propiedades y las métricas saldrían
 * repartidas entre ellas.
 *
 * Se deriva del dominio y no se escribe: quien es dueño del dominio es `src/lib/dominio.ts`,
 * que lo lee de `public/CNAME`, y un segundo sitio donde escribirlo es un sitio donde
 * quedarse apuntando al dominio anterior.
 */
export function propiedadDeDominio(dominio: string): string {
  return `sc-domain:${dominio}`;
}

/** Las URL publicadas de cada familia, sin la portada. */
export type CensoPorFamilia = Readonly<Record<Familia, readonly string[]>>;

/**
 * Las URL publicadas, repartidas por familia — derivadas, nunca escritas.
 *
 * Sale del dueño único del conjunto publicable (AD-11) y de los constructores de ruta de
 * `src/lib/superficies.ts` (AD-11 extendido). Ni el umbral ni la forma de la URL se
 * repiten aquí: aplicar un segundo criterio sería el segundo cómputo que AD-11 existe para
 * impedir, y componer la ruta a mano la dejaría sin barra final —la forma que redirige— en
 * cuanto alguien se despistara.
 *
 * `tests/unit/indexacion.test.ts` compara la unión de las cuatro familias con
 * `rutasPublicadas`, así que una familia nueva no puede desaparecer de esta serie en
 * silencio.
 */
export function censoPorFamilia(conjunto: ConjuntoPublicable): CensoPorFamilia {
  return {
    cita: conjunto.citas.map((c) => rutaDeCita(c.slug)),
    autor: autoresPublicados(conjunto.autores, conjunto.citas).map((a) => rutaDeAutor(a.slug)),
    tema: temasPublicados(conjunto.temas, conjunto.citas).map((t) => rutaDeTema(t.slug)),
    coleccion: conjunto.colecciones.map((c) => rutaDeColeccion(c.slug)),
  };
}

/** Lo que se va a inspeccionar de una familia, y si eso es toda la familia o una muestra. */
export interface PlanDeFamilia {
  familia: Familia;
  /** Cuántas URL publica hoy la familia. Es el denominador del reparto. */
  publicadas: number;
  /** Las que se van a pedir, en orden estable. */
  rutas: readonly string[];
  /** `true` cuando `rutas` es una parte y no el todo. */
  muestreada: boolean;
}

export interface PlanDeInspeccion {
  presupuesto: number;
  /** El total publicable de las cuatro familias. */
  publicadas: number;
  /** Cuántas peticiones gasta el plan. Nunca pasa del presupuesto. */
  inspecciones: number;
  /** Una entrada por familia con al menos una petición asignada, en el orden de `FAMILIAS`. */
  familias: readonly PlanDeFamilia[];
  /**
   * Familias publicadas a las que el presupuesto no llega a darles ni una petición.
   *
   * No es lo mismo que una familia vacía —esa no aparece en ningún sitio— ni que una
   * familia que falló: es una que **no se intentó**, y la entrada de la serie tiene que
   * decirlo con su motivo en vez de dejarla como si se hubiera leído cero.
   */
  sinPresupuesto: readonly Familia[];
}

/**
 * Qué inspeccionar con el presupuesto que hay.
 *
 * Todo si cabe. Si no cabe, muestra por familia, y el reparto tiene dos pasos por un
 * motivo concreto: primero un **suelo** por familia, para que Colección —16 URL frente a
 * 1.639 de Cita— no se quede con dos peticiones y un porcentaje ilegible; y después lo que
 * sobre, en proporción a lo que a cada familia le falta por cubrir, que es donde el
 * presupuesto rinde. Un reparto solo proporcional deja a las agregaciones sin serie, y son
 * justo la mitad de la comparación que esta épica existe para poder hacer.
 *
 * Es **determinista**: el mismo censo y el mismo presupuesto dan exactamente las mismas
 * URL. Sin eso, dos jornadas seguidas medirían muestras distintas por azar y la diferencia
 * entre ellas no significaría nada.
 */
export function planDeInspeccion(censo: CensoPorFamilia, presupuesto: number): PlanDeInspeccion {
  /*
   * `NaN` sobrevive a `Math.max(0, Math.trunc(NaN))` —sigue siendo `NaN`— y de ahí en
   * adelante toda comparación es falsa: el reparto no asigna nada, el relleno de una en una
   * no ve techo y acaba devolviendo cada familia **entera**. Un presupuesto ilegible gastaría
   * así muchísimo más de lo pedido, que en esta API significa agotar la cuota del día. Se
   * normaliza una sola vez, aquí, y el plan declara el número con el que de verdad trabajó.
   */
  const disponible =
    Number.isFinite(presupuesto) ? Math.max(0, Math.trunc(presupuesto)) : 0;

  const tamaños = new Map<Familia, number>();
  for (const familia of FAMILIAS) {
    const cuantas = censo[familia]?.length ?? 0;
    // Una familia sin nada publicado no entra ni como leída ni como fallida: no hay nada
    // que leer. Escribirla como cero sería exactamente lo que la épica prohíbe.
    if (cuantas > 0) tamaños.set(familia, cuantas);
  }

  const publicadas = [...tamaños.values()].reduce((a, b) => a + b, 0);
  const asignado = repartir(tamaños, disponible);

  const familias: PlanDeFamilia[] = [];
  const sinPresupuesto: Familia[] = [];

  for (const [familia, total] of tamaños) {
    const cuantas = asignado.get(familia) ?? 0;
    if (cuantas === 0) {
      sinPresupuesto.push(familia);
      continue;
    }
    familias.push({
      familia,
      publicadas: total,
      rutas: muestraDe(censo[familia] ?? [], cuantas),
      muestreada: cuantas < total,
    });
  }

  return {
    presupuesto: disponible,
    publicadas,
    inspecciones: familias.reduce((suma, f) => suma + f.rutas.length, 0),
    familias,
    sinPresupuesto,
  };
}

/**
 * El reparto del presupuesto entre familias: suelo primero, proporción después.
 *
 * El suelo se sirve **de la familia más pequeña a la más grande**. Al revés, un
 * presupuesto corto se lo comía Cita y las tres agregaciones se quedaban sin ninguna
 * petición — que es el caso que hace ilegible la comparación por la que existe la serie.
 */
function repartir(tamaños: ReadonlyMap<Familia, number>, presupuesto: number): Map<Familia, number> {
  const asignado = new Map<Familia, number>();
  for (const familia of tamaños.keys()) asignado.set(familia, 0);

  let restante = presupuesto;

  const porTamaño = [...tamaños.entries()].sort((a, b) => {
    if (a[1] !== b[1]) return a[1] - b[1];
    // Empate deshecho por el orden declarado, no por el de inserción de un `Map`: dos
    // familias del mismo tamaño tienen que repartirse igual en cualquier ejecución.
    return FAMILIAS.indexOf(a[0]) - FAMILIAS.indexOf(b[0]);
  });

  for (const [familia, total] of porTamaño) {
    if (restante <= 0) break;
    const suelo = Math.min(total, MUESTRA_MINIMA_POR_FAMILIA, restante);
    asignado.set(familia, suelo);
    restante -= suelo;
  }

  // Lo que sobra, en proporción a lo que a cada familia le queda por cubrir.
  const falta = new Map<Familia, number>();
  for (const [familia, total] of tamaños) falta.set(familia, total - (asignado.get(familia) ?? 0));
  const sumaDeFaltas = [...falta.values()].reduce((a, b) => a + b, 0);

  if (restante > 0 && sumaDeFaltas > 0) {
    for (const familia of FAMILIAS) {
      const pendiente = falta.get(familia);
      if (pendiente === undefined || pendiente === 0) continue;
      const extra = Math.floor((restante * pendiente) / sumaDeFaltas);
      asignado.set(familia, (asignado.get(familia) ?? 0) + extra);
    }
  }

  /*
   * El redondeo hacia abajo deja siempre unas cuantas peticiones sin repartir. Se dan de
   * una en una y en el orden declarado hasta agotarlas o hasta que ninguna familia tenga
   * hueco: un presupuesto que se anuncia y no se gasta mide menos de lo que podía.
   */
  let sobrante = presupuesto - [...asignado.values()].reduce((a, b) => a + b, 0);
  while (sobrante > 0) {
    let repartido = false;
    for (const familia of FAMILIAS) {
      if (sobrante === 0) break;
      const total = tamaños.get(familia);
      if (total === undefined) continue;
      const actual = asignado.get(familia) ?? 0;
      if (actual >= total) continue;
      asignado.set(familia, actual + 1);
      sobrante -= 1;
      repartido = true;
    }
    if (!repartido) break;
  }

  return asignado;
}

/**
 * Una muestra de `cuantas` rutas, repartida por toda la lista y **sin azar**.
 *
 * Se toman posiciones equiespaciadas sobre la lista ordenada, como ya hace
 * `src/lib/publicado.ts` para elegir las Citas relacionadas. Coger las primeras `cuantas`
 * habría sido más corto y habría medido siempre las mismas: el orden de los slugs es
 * alfabético, así que la muestra habría hablado de la letra A y no del sitio.
 */
export function muestraDe(rutas: readonly string[], cuantas: number): string[] {
  const ordenadas = [...rutas].sort((a, b) => a.localeCompare(b, 'es'));
  if (cuantas <= 0) return [];
  if (cuantas >= ordenadas.length) return ordenadas;
  if (cuantas === 1) return [ordenadas[0]];

  const paso = (ordenadas.length - 1) / (cuantas - 1);
  const elegidas = new Set<string>();
  for (let i = 0; i < cuantas; i += 1) elegidas.add(ordenadas[Math.round(i * paso)]);

  /*
   * Con el paso ≥ 1 el redondeo no repite posición, así que este relleno no debería hacer
   * falta nunca. Está para que un cambio en la fórmula no encoja la muestra en silencio:
   * una muestra más pequeña de lo declarado es una entrada de la serie que miente sobre lo
   * que midió.
   */
  for (const ruta of ordenadas) {
    if (elegidas.size >= cuantas) break;
    elegidas.add(ruta);
  }

  return [...elegidas].sort((a, b) => a.localeCompare(b, 'es'));
}

/** Lo que la fuente contestó de una URL, ya reducido a lo que esta serie guarda. */
export interface Inspeccion {
  ruta: string;
  /** El veredicto tal cual lo dio la fuente. Quien decide qué significa es `esIndexada`. */
  veredicto: string | null | undefined;
  /** El estado de cobertura tal cual lo dio la fuente. Es el diagnóstico, no el recuento. */
  estado: string;
}

/** Cuántas URL de la familia comparten un mismo estado de cobertura. */
export interface RepartoDeEstado {
  estado: string;
  urls: number;
}

/** El reparto de una familia leída. Lo que se escribe en la serie. */
export interface LecturaDeFamilia {
  /** Cuántas URL publica la familia. */
  publicadas: number;
  /** Cuántas se inspeccionaron. Igual a `publicadas` cuando no hubo muestreo. */
  muestra: number;
  indexadas: number;
  noIndexadas: number;
  /**
   * El reparto por estado de cobertura — el diagnóstico, no el síntoma.
   *
   * El booleano dice **cuántas** no están indexadas; esto dice **por qué**, que es la
   * pregunta con la que abre la épica. «Detectada, actualmente no indexada» y «Rastreada,
   * actualmente no indexada» son dos diagnósticos distintos —descubierta y nunca visitada
   * frente a visitada y descartada— y llevan a remedios distintos. Viene en la misma
   * respuesta y no cuesta ni una petición más.
   */
  estados: RepartoDeEstado[];
}

/**
 * El reparto de una familia a partir de lo que contestó la fuente.
 *
 * `muestra` se escribe **siempre**, también cuando coincide con `publicadas`. Escribirlo
 * solo al muestrear obligaría a deducir el tamaño por ausencia, y una comparación entre
 * dos jornadas tiene que poder leer de cada una qué midió sin inferir nada.
 *
 * Los estados salen ordenados por volumen y, a igualdad, por su nombre: dos lecturas de la
 * misma muestra tienen que dar el mismo fichero, byte a byte.
 */
export function resumirFamilia(
  publicadas: number,
  inspecciones: readonly Inspeccion[],
): LecturaDeFamilia {
  const indexadas = inspecciones.filter((i) => esIndexada(i.veredicto)).length;

  const cuenta = new Map<string, number>();
  for (const inspeccion of inspecciones) {
    cuenta.set(inspeccion.estado, (cuenta.get(inspeccion.estado) ?? 0) + 1);
  }

  return {
    publicadas,
    muestra: inspecciones.length,
    indexadas,
    noIndexadas: inspecciones.length - indexadas,
    estados: [...cuenta.entries()]
      .map(([estado, urls]) => ({ estado, urls }))
      .sort((a, b) => (b.urls !== a.urls ? b.urls - a.urls : a.estado.localeCompare(b.estado, 'es'))),
  };
}

/** El tope de un motivo escrito en la serie. Esto va a git para siempre. */
export const TOPE_DE_MOTIVO = 200;

/**
 * Por qué falló la lectura de una familia, **normalizado y acotado**.
 *
 * El mensaje crudo de la fuente se versiona para siempre en `corpus/`, así que no entra tal
 * cual: puede traer la URL consultada, un identificador de proyecto o un rastro de la
 * credencial, y puede ocupar párrafos. El proyecto ya tiene el precedente en
 * `sanearMensajeDeRed` de `tools/lib/ingresos.ts`, que limpia direcciones justo porque su
 * salida acaba en un registro.
 *
 * Y se normaliza a tres clases porque la serie se lee comparando jornadas: «cuota agotada»
 * dos días seguidos es una pauta, y dos redacciones distintas del mismo 429 no lo parecen.
 */
export type ClaseDeFallo = 'cuota' | 'permiso' | 'otro';

export function claseDeFallo(error: unknown): ClaseDeFallo {
  const codigo = codigoDe(error);
  if (codigo === 429) return 'cuota';
  if (codigo === 403 || codigo === 401) return 'permiso';
  return 'otro';
}

/** El código HTTP que trae el error, mirado donde el cliente lo pone y en el texto. */
function codigoDe(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null) {
    const suelto = error as { status?: unknown; code?: unknown; response?: { status?: unknown } };
    for (const candidato of [suelto.status, suelto.response?.status, suelto.code]) {
      const numero = typeof candidato === 'string' ? Number(candidato) : candidato;
      if (typeof numero === 'number' && Number.isInteger(numero)) return numero;
    }
  }
  const encontrado = /\b(401|403|429)\b/.exec(textoDe(error));
  return encontrado === null ? undefined : Number(encontrado[1]);
}

function textoDe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function motivoDeFallo(error: unknown): string {
  switch (claseDeFallo(error)) {
    case 'cuota':
      return 'cuota agotada (429)';
    case 'permiso':
      return 'sin acceso a la propiedad (403): la cuenta de servicio no está dada de alta, o no como propietaria';
    default: {
      // Cualquier cosa con pinta de dirección se va: vale más un motivo escueto que uno
      // que arrastre a git lo que se consultó o con qué credencial.
      const limpio = textoDe(error)
        .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, '«dirección»')
        .replace(/\s+/g, ' ')
        .trim();
      const acotado =
        limpio.length > TOPE_DE_MOTIVO ? `${limpio.slice(0, TOPE_DE_MOTIVO - 1)}…` : limpio;
      return acotado === '' ? 'la fuente no respondió' : `la fuente no respondió: ${acotado}`;
    }
  }
}

/** Una familia que no se leyó, con el motivo que lo impidió. */
export interface FamiliaSinLeer {
  familia: Familia;
  motivo: string;
}

/**
 * Una entrada de la serie, antes de escribirse.
 *
 * `familias` lleva **solo** las leídas y `sinLeer` **solo** las que fallaron. Una familia
 * sin URL publicadas no está en ninguna de las dos: no hay nada que leer, y decir que no
 * se pudo leer sería falso.
 */
export interface LecturaDeIndexacion {
  /** Cuándo se leyó. Por omisión, ahora. Se guarda en hora local, no en UTC. */
  momento?: Date;
  /** La propiedad consultada, para que la entrada diga de dónde salió. */
  propiedad: string;
  /** El total publicable de las cuatro familias en el momento de la lectura. */
  publicadas: number;
  /** Cuántas peticiones se gastaron de verdad. */
  inspeccionadas: number;
  familias: Partial<Record<Familia, LecturaDeFamilia>>;
  sinLeer: Partial<Record<Familia, string>>;
}

/**
 * Compone la entrada, y es **la puerta de «ausencia antes que cero»**.
 *
 * Se niega si una familia aparece a la vez como leída y como no leída, y si una familia
 * con URL publicadas no aparece en ninguna de las dos. Ese segundo caso es el peligroso:
 * una familia que se cae del informe sin que nadie lo diga se lee después como si no
 * existiera, y quien compare dos jornadas creerá que el sitio encogió.
 */
export function componerLectura(entrada: {
  momento?: Date;
  propiedad: string;
  censo: CensoPorFamilia;
  lecturas: Partial<Record<Familia, LecturaDeFamilia>>;
  sinLeer: readonly FamiliaSinLeer[];
}): LecturaDeIndexacion {
  const { censo, lecturas } = entrada;

  const sinLeer: Partial<Record<Familia, string>> = {};
  for (const { familia, motivo } of entrada.sinLeer) {
    /*
     * Un motivo en blanco no es un motivo, y aquí además es peligroso: `aYaml` omite las
     * cadenas vacías, así que la familia se caería también de `sinLeer` al escribirse y
     * acabaría en ninguna de las dos listas — exactamente el estado que esta función existe
     * para prohibir, colado por la puerta de atrás del serializador.
     */
    if (motivo.trim() === '') {
      throw new Error(
        `La familia ${NOMBRE_DE_FAMILIA[familia]} llega sin leer y sin motivo. Un motivo en ` +
          'blanco se omite al escribir el fichero, así que la familia desaparecería de la ' +
          'entrada sin que nadie lo dijera.',
      );
    }
    if (lecturas[familia] !== undefined) {
      throw new Error(
        `La familia ${NOMBRE_DE_FAMILIA[familia]} llega a la vez leída y sin leer. Una ` +
          'entrada de la serie no puede afirmar las dos cosas: quien la componga tiene que ' +
          'decidir cuál de las dos es cierta antes de escribirla.',
      );
    }
    sinLeer[familia] = motivo;
  }

  const familias: Partial<Record<Familia, LecturaDeFamilia>> = {};
  let publicadas = 0;
  let inspeccionadas = 0;

  for (const familia of FAMILIAS) {
    const cuantas = censo[familia]?.length ?? 0;
    if (cuantas === 0) continue;
    publicadas += cuantas;

    const leida = lecturas[familia];
    if (leida !== undefined) {
      familias[familia] = leida;
      inspeccionadas += leida.muestra;
      continue;
    }

    if (sinLeer[familia] === undefined) {
      throw new Error(
        `La familia ${NOMBRE_DE_FAMILIA[familia]} tiene ${cuantas} URL publicadas y no llega ` +
          'ni leída ni con un motivo de no haberse leído. Se omitiría de la entrada sin ' +
          'decirlo, y quien compare dos jornadas creería que la familia desapareció del sitio.',
      );
    }
  }

  return {
    ...(entrada.momento === undefined ? {} : { momento: entrada.momento }),
    propiedad: entrada.propiedad,
    publicadas,
    inspeccionadas,
    familias,
    sinLeer,
  };
}

/**
 * El informe en pantalla de una lectura. Lo comparten la consulta y el registro.
 *
 * Una familia sin leer sale nombrada y con su motivo, nunca como un cero: en pantalla vale
 * lo mismo que en el fichero, porque quien mira la pantalla es quien decide si vuelve a
 * intentarlo.
 */
export function lineasDeLectura(lectura: LecturaDeIndexacion): string[] {
  const lineas = [
    'Estado de indexación por familia',
    '════════════════════════════════',
    '',
    `Propiedad:      ${lectura.propiedad}`,
    `Publicadas:     ${lectura.publicadas}`,
    `Inspeccionadas: ${lectura.inspeccionadas}`,
    '',
  ];

  for (const familia of FAMILIAS) {
    const leida = lectura.familias[familia];
    if (leida === undefined) continue;
    const muestreada = leida.muestra < leida.publicadas ? ` (muestra de ${leida.publicadas})` : '';
    lineas.push(
      `${NOMBRE_DE_FAMILIA[familia]}: ${leida.indexadas} indexadas de ${leida.muestra}` +
        `${muestreada}, ${leida.noIndexadas} no.`,
    );
    // El diagnóstico debajo del recuento: es lo que dice si el buscador ni pasó o pasó y
    // descartó, que son dos problemas distintos y con remedios distintos.
    for (const { estado, urls } of leida.estados) lineas.push(`    ${urls} — ${estado}`);
  }

  const sinLeer = FAMILIAS.filter((f) => lectura.sinLeer[f] !== undefined);
  if (sinLeer.length > 0) {
    lineas.push('', 'Familias sin leer —se omiten de la entrada, no se escriben como cero—');
    for (const familia of sinLeer) {
      lineas.push(`  ${NOMBRE_DE_FAMILIA[familia]}: ${lectura.sinLeer[familia]}`);
    }
  }

  return lineas;
}

/**
 * La variable de entorno donde vive la credencial de la cuenta de servicio.
 *
 * Una sola variable, y no dos: la propiedad se **deriva** del dominio
 * (`propiedadDeDominio`), así que aquí solo hace falta con qué autenticarse. Qué contiene
 * y cómo se da de alta está en DESPLIEGUE.md §5.
 */
export const VARIABLE_DE_CREDENCIALES = 'SEARCH_CONSOLE_CREDENCIALES';

/**
 * El código con el que sale la orden cuando no hay credencial — **propio**, no el 1 de
 * cualquier rechazo.
 *
 * Estas órdenes se encadenan en guiones, y «la credencial no está puesta» es una condición
 * de despliegue que se arregla en otro sitio, no una avería de la lectura. Un guion que
 * distinga los dos casos puede seguir adelante en uno y parar en el otro; con el mismo
 * código para ambos no puede.
 */
export const SALIDA_SIN_CREDENCIALES = 2;

/**
 * Cómo llega la credencial: el JSON entero o la ruta de un fichero que lo contiene.
 *
 * Las dos formas existen porque los dos sitios de los que sale son distintos: en CI un
 * secreto es una cadena, y en local lo cómodo es el fichero que descarga la consola de
 * Google. Se distinguen por la primera llave y no por una segunda variable, que sería una
 * variable más que olvidar.
 */
export type Credencial =
  | { clase: 'json'; contenido: string }
  | { clase: 'fichero'; ruta: string };

/**
 * Lo que se dice cuando falta la credencial, **sin repetir su valor**.
 *
 * Igual que con `MEDICION_ENDPOINT`: esta salida puede acabar en el registro de una
 * ejecución, así que se nombra la variable y no su contenido. Y se nombra lo que falta,
 * que es lo único accionable que puede leer quien ejecuta esto.
 */
export const MOTIVOS_SIN_CREDENCIALES: readonly string[] = [
  `Falta ${VARIABLE_DE_CREDENCIALES}: no hay con qué preguntar por el estado de indexación.`,
  '',
  'No se ha escrito nada. Publicar un número cuando la fuente no está disponible sería peor',
  'que no publicarlo: la serie dejaría de significar lo que dice que significa.',
  '',
  'Qué hace falta, y el paso manual que solo puede dar el dueño del dominio, en DESPLIEGUE.md §5:',
  '  · una cuenta de servicio de Google con la API de Search Console habilitada;',
  `  · su clave JSON en ${VARIABLE_DE_CREDENCIALES} —el JSON entero, o la ruta del fichero—;`,
  '  · y la cuenta dada de alta como usuario de la propiedad en Search Console. Sin esa alta,',
  '    la credencial es válida y la propiedad no existe para ella.',
];

/** La credencial declarada en el entorno, o `undefined` si no hay ninguna. */
export function credencialDe(
  entorno: Record<string, string | undefined>,
): Credencial | undefined {
  const valor = entorno[VARIABLE_DE_CREDENCIALES]?.trim();
  // Una variable de repositorio sin definir llega como cadena vacía, y `??` la daría por
  // buena: se comprueba con contenido, como hace `SITE_URL` en `src/lib/dominio.ts`.
  if (!valor) return undefined;
  return valor.startsWith('{') ? { clase: 'json', contenido: valor } : { clase: 'fichero', ruta: valor };
}
