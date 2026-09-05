/**
 * Qué ficheros del Corpus componen cada superficie — Historia 18.4.
 *
 * Aquí vive **toda la decisión** de la historia: de qué depende la fecha que el sitemap
 * declara para cada URL. Y no toca ni el disco ni git, a propósito: recibe el corpus ya
 * leído y un mapa de «fichero → fecha de su último cambio», y devuelve «superficie →
 * fecha». Así los casos que importan —la agregación, la ausencia, el empate— se prueban
 * sin repositorio, que es la única forma de probarlos deprisa y sin fixture de git.
 *
 * ── Por qué la fecha sale del historial y no del build ───────────────────────────────
 *
 * AD-12 reconstruye el sitio una vez al día. Una fecha de construcción declararía las
 * 1.715 páginas como nuevas cada mañana, y eso no es un dato pobre: es un dato falso, y
 * enseña al buscador a no hacer caso del campo. Peor que no declararlo. Lo que sí sabe
 * este repositorio es cuándo cambió de verdad cada fichero de `corpus/`, porque el Corpus
 * **es** el repositorio (AD-10).
 *
 * ── Qué compone cada superficie ──────────────────────────────────────────────────────
 *
 * El criterio es uno solo y se aplica sin excepciones: **lo que la página renderiza**. No
 * lo que su plantilla recibe por nombre, ni lo que uno diría que «es» la página. Si un
 * fichero acaba dentro del HTML publicado, un cambio suyo cambia esa página, y declarar
 * una fecha anterior es la misma quema de señal que declarar una fecha de build, solo que
 * en la dirección rancia: el buscador vuelve, ve el HTML cambiado, y aprende que el campo
 * miente.
 *
 *   · **Página de Cita** — su fichero **y el de su Autor**. La plantilla
 *     —`src/pages/cita/[slug].astro`— recibe `autor` de su `getStaticPaths` y compone con
 *     `autor.nombre` el título de pestaña, la `<meta description>` y el
 *     `application/ld+json`. Corregir la semblanza de Séneca reconstruye 181 páginas con
 *     HTML distinto: si solo dependieran de su propio fichero, las 181 declararían una
 *     fecha de hace meses. La inflación al revés —retocar un Autor mueve la fecha de sus
 *     Citas— está acotada y es la verdad: solo dispara cuando ese fichero cambia de veras,
 *     y cuando dispara es porque el HTML cambió.
 *   · **Página de Autor, de Tema y de Colección** — su fichero, los de las Citas que
 *     agregan **y los de los Autores de esas Citas**. Son listados: si entra una Cita
 *     nueva en un Tema, la página cambió aunque el fichero del Tema no se haya tocado; y
 *     sus tarjetas llevan el nombre del Autor —`TarjetaDeCita`, con `autores.get(...)`—,
 *     así que un Autor renombrado también las cambia. Es la fila «Página derivada de
 *     varias fuentes» de la matriz, leída hasta el final.
 *
 * ── La portada, que es el caso incómodo y por eso no lleva fecha ─────────────────────
 *
 * La portada **no entra en este mapa**, y es una decisión, no un olvido. Es la única URL
 * del sitio que cambia a diario: AD-12 rota la Cita del Día sin que nadie commitee nada,
 * así que su HTML es distinto cada mañana. Cualquier fecha que el historial sepa dar es
 * por definición vieja, y sería vieja justo en la única URL donde el buscador sí entra a
 * diario — enseñarle que ahí no ha cambiado nada es peor que no decirle nada.
 *
 * Las dos salidas están cerradas. Declarar «hoy» es una fecha de build con otro nombre, y
 * la historia entera existe para no cometerla. Declarar la fecha del último commit del
 * Corpus es afirmar por escrito que la portada no cambió desde entonces, que es falso. Lo
 * que queda es la regla de esta misma historia: **cuando no se sabe la fecha, se omite el
 * campo**. Ausencia antes que centinela, y también antes que dato rancio.
 *
 * Y no, el descargo no es `tools/avisar.ts`: ese canal es IndexNow —Bing, Yandex, Naver,
 * Seznam—, y el buscador cuyo rastreo se está intentando ganar aquí es Google, que no lo
 * consume. Que la portada se avise por otro canal no autoriza a mentir en éste.
 *
 * ── Ausencia antes que centinela ─────────────────────────────────────────────────────
 *
 * Una superficie de la que no se sepa ninguna fecha **no aparece en el mapa**, y quien lo
 * consume omite el campo. Ni «hoy», ni la época, ni una cadena vacía. Es la convención de
 * todo campo opcional del proyecto, y aquí importa el doble: un centinela en 1.715
 * entradas es indistinguible de un dato, y el buscador no tiene forma de saber cuál mira.
 */

import {
  rutaDeAutor,
  rutaDeCita,
  rutaDeColeccion,
  rutaDeTema,
  rutaNormalizada,
} from '../../src/lib/superficies.ts';

/**
 * El instante de un cambio, en ISO 8601 y **siempre en UTC** — lo que `Date#toISOString`
 * devuelve: `2026-09-04T17:59:55.000Z`.
 *
 * En UTC y no en la zona de quien construye: `git log` da el instante con el desfase de
 * quien commiteó, y quedarse con esa forma ataría el sitemap a la zona horaria de la
 * máquina. El mismo commit se anunciaría con dos cadenas distintas —una desde Madrid, otra
 * desde el CI— y el criterio «dos construcciones del mismo commit dan las mismas fechas»
 * dejaría de cumplirse por un motivo que nadie vería. Convertir es cosa de quien lee git;
 * aquí ya llega hecho.
 *
 * **El instante entero y no solo el día**, porque recortarlo no ahorra nada y miente: la
 * librería del sitemap expande `AAAA-MM-DD` a la medianoche de ese día, así que el XML
 * acabaría afirmando una hora exacta que nadie ha medido. Publicando el instante real, lo
 * que se declara es lo que el repositorio sabe.
 *
 * Se compara como cadena a propósito: esta forma es de anchura fija y termina en `Z`, así
 * que ordena igual lexicográficamente que cronológicamente y «la más reciente» no necesita
 * construir ninguna `Date`.
 */
export type FechaDeCambio = string;

/** Una Cita del corpus, con lo justo para saber qué superficies compone. */
export interface CitaParaFechar {
  slug: string;
  autor: string;
  temas?: readonly string[];
  /** El fichero del que salió, tal como lo nombra quien leyó el corpus. */
  ruta: string;
}

/** Un Autor o un Tema: su slug compone una ruta, y su fichero una fecha. */
export interface EntidadParaFechar {
  slug: string;
  ruta: string;
}

/** Una Colección declara a mano los slugs de Cita que agrega. */
export interface ColeccionParaFechar extends EntidadParaFechar {
  miembros: readonly string[];
}

/**
 * El corpus ya leído, con las rutas de sus ficheros.
 *
 * Son las **declaraciones**, no el conjunto publicable: aquí no se aplica ningún umbral y
 * no debe aplicarse. Quien decide qué se anuncia es `src/lib/superficies.ts` a través del
 * filtro del sitemap (AD-11, Historia 12.1), y este mapa se limita a poner fecha a lo que
 * aquél haya dejado pasar. Calcular de más no publica de más: una entrada que sobre en el
 * mapa nunca se consulta.
 */
export interface CorpusParaFechar {
  citas: readonly CitaParaFechar[];
  autores: readonly EntidadParaFechar[];
  temas: readonly EntidadParaFechar[];
  colecciones: readonly ColeccionParaFechar[];
}

/**
 * Qué ficheros del Corpus compone cada superficie, por su ruta ya normalizada.
 *
 * Las rutas salen de los constructores de `src/lib/superficies.ts` y **no se escriben a
 * mano**: es la misma exigencia que cumple `tools/avisar.ts`, y por el mismo motivo —lo
 * que aquí se nombre mal no falla, simplemente no casa con ninguna entrada del sitemap y
 * la fecha desaparece en silencio—. Se normalizan porque el sitemap entrega direcciones
 * completas y con barra final, y `rutaNormalizada` es quien decide que las dos formas son
 * la misma superficie.
 */
export function ficherosPorSuperficie(corpus: CorpusParaFechar): Map<string, string[]> {
  /** El fichero de cada Autor, que es lo que aporta el nombre que las páginas renderizan. */
  const ficheroDeAutor = new Map(corpus.autores.map((autor) => [autor.slug, autor.ruta]));
  const citasDeAutor = new Map<string, string[]>();
  const deTema = new Map<string, string[]>();
  const deCita = new Map<string, CitaParaFechar>();

  for (const cita of corpus.citas) {
    deCita.set(cita.slug, cita);
    apilar(citasDeAutor, cita.autor, cita.ruta);
    for (const tema of cita.temas ?? []) {
      apilar(deTema, tema, cita.ruta);
      // El listado renderiza el nombre del Autor en cada tarjeta, así que su fichero es
      // parte de lo que la página afirma. Una Cita cuyo Autor no resuelve no aporta nada.
      const autor = ficheroDeAutor.get(cita.autor);
      if (autor !== undefined) apilar(deTema, tema, autor);
    }
  }

  const porSuperficie = new Map<string, string[]>();
  const declarar = (ruta: string, ficheros: readonly (string | undefined)[]) => {
    porSuperficie.set(
      rutaNormalizada(ruta),
      [...new Set(ficheros.filter((f): f is string => f !== undefined))],
    );
  };

  for (const cita of corpus.citas) {
    // El fichero del Autor entra aquí porque la plantilla compone con `autor.nombre` el
    // título, la meta descripción y los datos estructurados: cambiarlo cambia el HTML.
    declarar(rutaDeCita(cita.slug), [cita.ruta, ficheroDeAutor.get(cita.autor)]);
  }

  for (const autor of corpus.autores) {
    declarar(rutaDeAutor(autor.slug), [autor.ruta, ...(citasDeAutor.get(autor.slug) ?? [])]);
  }

  for (const tema of corpus.temas) {
    declarar(rutaDeTema(tema.slug), [tema.ruta, ...(deTema.get(tema.slug) ?? [])]);
  }

  for (const coleccion of corpus.colecciones) {
    declarar(rutaDeColeccion(coleccion.slug), [
      coleccion.ruta,
      // Un miembro que no resuelve —Cita retirada a revisión, o errata— no aporta fecha y
      // tampoco es un fallo aquí: la pertenencia es blanda por diseño (Historia 12.2).
      ...coleccion.miembros.flatMap((slug) => {
        const cita = deCita.get(slug);
        return cita === undefined ? [] : [cita.ruta, ficheroDeAutor.get(cita.autor)];
      }),
    ]);
  }

  /*
   * La portada **no se declara**, y la ausencia es la decisión. Rota a diario sin commit
   * (AD-12), así que cualquier fecha que el historial sepa dar es vieja el día que se
   * publica, y lo sería en la única URL que el buscador visita a diario. La regla de la
   * historia se le aplica igual que a cualquier otra superficie: cuando no se sabe la
   * fecha, se omite el campo. El razonamiento largo está en la cabecera del módulo.
   */

  return porSuperficie;
}

function apilar(mapa: Map<string, string[]>, clave: string, valor: string): void {
  const lista = mapa.get(clave);
  if (lista === undefined) mapa.set(clave, [valor]);
  else lista.push(valor);
}

/**
 * La más reciente de las fechas de unos ficheros, o `undefined` si no se sabe ninguna.
 *
 * Un fichero sin fecha conocida **no arrastra a los demás**: una Cita recién escrita y
 * todavía sin commit no borra la fecha del Tema que la agrega, solo no la adelanta. Y si
 * no se sabe ninguna, no hay nada que declarar: se devuelve la ausencia, que es lo que
 * hace que el campo se omita en vez de rellenarse.
 */
export function fechaMasReciente(
  ficheros: readonly string[],
  fechas: ReadonlyMap<string, FechaDeCambio>,
): FechaDeCambio | undefined {
  let masReciente: FechaDeCambio | undefined;
  for (const fichero of ficheros) {
    const fecha = fechas.get(fichero);
    if (fecha !== undefined && (masReciente === undefined || fecha > masReciente)) {
      masReciente = fecha;
    }
  }
  return masReciente;
}

/**
 * La fecha del último cambio de cada superficie — lo que el sitemap declara como `lastmod`.
 *
 * Las superficies sin fecha **no entran en el mapa**. No es un detalle de implementación:
 * es la fila «Fecha indeterminable» de la matriz, y es lo que hace que un fallo de esta
 * historia degrade al sitemap de hoy —sin fechas, honesto— en vez de a 1.715 fechas
 * inventadas.
 */
export function fechasPorSuperficie(
  corpus: CorpusParaFechar,
  fechas: ReadonlyMap<string, FechaDeCambio>,
): Map<string, FechaDeCambio> {
  const resultado = new Map<string, FechaDeCambio>();
  for (const [ruta, ficheros] of ficherosPorSuperficie(corpus)) {
    const fecha = fechaMasReciente(ficheros, fechas);
    if (fecha !== undefined) resultado.set(ruta, fecha);
  }
  return resultado;
}

/** Los ficheros del Corpus que componen alguna superficie, sin repetir. */
export function ficherosDelCorpus(corpus: CorpusParaFechar): string[] {
  return [
    ...new Set([
      ...corpus.citas.map((cita) => cita.ruta),
      ...corpus.autores.map((autor) => autor.ruta),
      ...corpus.temas.map((tema) => tema.ruta),
      ...corpus.colecciones.map((coleccion) => coleccion.ruta),
    ]),
  ];
}

/**
 * Por debajo de esta fracción de ficheros fechados, el cruce está roto y no menguado.
 *
 * La mitad, y no un número pegado al Corpus de hoy: lo que se está distinguiendo son dos
 * cosas de tamaños muy distintos. Que falten algunas fechas es **normal** —una Cita recién
 * escrita y todavía sin commit no tiene historial, y la matriz ya dice que eso se omite y
 * ya está—. Que falten casi todas no es una variante de lo anterior: significa que las
 * rutas de git y las del corpus no están casando, y eso no mengua el resultado, lo anula.
 */
export const SUELO_DE_COBERTURA = 0.5;

/**
 * El aviso cuando el historial no fechó lo que debía, o la ausencia si fechó bastante.
 *
 * **Es el guardián del fallo mudo de esta historia.** El caso que hay que temer no es que
 * git reviente —eso se ve— sino que conteste que sí y no diga nada: `git log -- <ámbito
 * que no casa>` sale con **código 0 y salida vacía**, y con eso el mapa queda vacío, las
 * mil setecientas fechas se omiten una por una como si cada superficie fuera un caso
 * legítimo de «fecha indeterminable», y el sitemap sale exactamente como el de hoy. La
 * historia entera se habría quedado en nada con todas las pruebas en verde y sin una sola
 * línea en el registro. Un cwd que no es la raíz del repositorio, un directorio del Corpus
 * renombrado o un ámbito mal compuesto bastan para llegar ahí.
 *
 * Por eso el aviso pesa lo mismo que el del checkout superficial: los dos dicen «este
 * sitemap va a salir sin fechas y no debería», que es lo único que quien mira el registro
 * necesita saber. Un Corpus vacío no avisa, porque entonces no hay nada que fechar y el
 * silencio sí es la respuesta correcta.
 */
export function coberturaInsuficiente(
  corpus: CorpusParaFechar,
  fechas: ReadonlyMap<string, FechaDeCambio>,
): string | undefined {
  const ficheros = ficherosDelCorpus(corpus);
  if (ficheros.length === 0) return undefined;

  const conFecha = ficheros.filter((fichero) => fechas.has(fichero)).length;
  if (conFecha === 0) {
    return `el historial no fechó ni uno solo de los ${ficheros.length} ficheros del Corpus`;
  }
  if (conFecha / ficheros.length < SUELO_DE_COBERTURA) {
    return `el historial solo fechó ${conFecha} de los ${ficheros.length} ficheros del Corpus`;
  }
  return undefined;
}

/**
 * La fecha que le toca a una entrada del sitemap, o la ausencia — lo que consume
 * `astro.config.mjs`.
 *
 * Vive aquí y no en la configuración por dos motivos que van juntos. El primero es que
 * traducir una dirección completa a la superficie que nombra es una decisión, y las
 * decisiones se prueban. El segundo es que **la configuración no puede llevar un
 * `try`/`catch`**: `tests/unit/puerta-de-admision.test.ts` lo prohíbe en todo el fichero,
 * porque una captura allí convertiría la puerta de admisión del build en una sugerencia.
 * La dirección que no se deja leer se trata aquí, donde capturarla no tapa ninguna puerta.
 *
 * Que ese caso no ocurra hoy no lo hace superfluo: `@astrojs/sitemap` **descarta el sitemap
 * entero** si su `serialize` lanza, así que el precio de equivocarse no es una entrada sin
 * fecha, es un sitio sin sitemap.
 */
export function fechaDeLaEntrada(
  fechas: ReadonlyMap<string, FechaDeCambio>,
  direccion: string,
): FechaDeCambio | undefined {
  let ruta: string;
  try {
    ruta = rutaNormalizada(direccion);
  } catch {
    return undefined;
  }
  return fechas.get(ruta);
}
