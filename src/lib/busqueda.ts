/**
 * La búsqueda con filtros de `/buscar/` — Historias 27.2, 27.3, 27.4 y 27.5, FR-7, NFR-4,
 * UX-DR87, UX-DR88, UX-DR89, UX-DR90, UX-DR93.
 *
 * La decisión pura de la búsqueda, sin DOM, como `src/lib/filtroDelDirectorio.ts` lo es del filtro
 * de los Directorios: qué frase dice el recuento, qué `filters` se le pasan a Pagefind, qué
 * combinación de filtros (`filtrosUsados`) viaja en la `busqueda` asentada, desde la Historia
 * 27.3, qué Obras ofrece el selector de Obra del Autor elegido y, desde la 27.4, cómo vive el
 * estado en la dirección y en el historial: leerlo, componerlo, compararlo, resolverlo contra lo
 * que se puede elegir, decir lo que no se puede usar y decidir cada escritura; desde la 27.5, el
 * rótulo del botón que trae la tanda siguiente y la frase de su fallo. La pinta el guion
 * empaquetado de `src/components/Busqueda.astro`, que la importa, y `buscar.astro` toma de aquí los
 * textos fijos del campo. Apta para el cliente: solo importa módulos que también lo son, y el grafo
 * entero de lo que arrastra el guion lo fija `tests/unit/busqueda-con-filtros.test.ts`.
 *
 * AD-5 — Derivación pura.
 */

import { recuentoDeCitas, temaEnFrase } from './recuentos.ts';
import { FILTROS_DE_CITA } from './tipoDeResultado.ts';
import { TANDA_DE_RESULTADOS } from './umbrales.ts';
import { filtrosUsados, type Filtros } from './vocabulario.ts';

/**
 * El ejemplo del campo de `/buscar/`: un fragmento que da resultados con el Corpus de verdad —lo
 * comprueba `tests/unit/busqueda-con-filtros.test.ts` sobre `corpus/`—. Un ejemplo que no
 * encontrara nada enseñaría a buscar algo que la búsqueda no sabe responder.
 */
export const EJEMPLO_DE_LA_BUSQUEDA = 'no hay camino';

/** El texto de ejemplo del campo (`placeholder`): «Por ejemplo: no hay camino». */
export const TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA = `Por ejemplo: ${EJEMPLO_DE_LA_BUSQUEDA}`;

/** La etiqueta visible del campo de `/buscar/`. */
export const ETIQUETA_DE_LA_BUSQUEDA = 'Escribe un fragmento, un autor o un tema.';

/**
 * Lo que está elegido en los selectores: el **valor** de cada filtro (el slug del Autor, el nombre
 * de la ficha de la Obra, el slug del Tema), vacío si está en «Todos…». `obra` se omite —o va
 * vacía— sin Obra elegida (Historia 27.3).
 */
export interface FiltrosElegidos {
  autor: string;
  obra?: string;
  tema: string;
}

/**
 * La Obra elegida, o `''`. **La Obra nunca va sin su Autor** (FR-7, `filtrosUsados`): sin Autor
 * elegido no cuenta, ni para buscar, ni para la combinación, ni para la clave del asentamiento.
 */
function obraElegida(elegidos: FiltrosElegidos): string {
  return elegidos.autor !== '' && elegidos.obra !== undefined ? elegidos.obra : '';
}

/** Si hay algún filtro elegido. */
export function hayFiltros(elegidos: FiltrosElegidos): boolean {
  return elegidos.autor !== '' || elegidos.tema !== '';
}

/**
 * Los `filters` que se le pasan a Pagefind: `autor`, `obra` y `tema` con los valores que escribe la
 * 27.1 en cada Página de Cita (`FILTROS_DE_CITA`), solo los elegidos. Sin ninguno, un objeto vacío.
 */
export function filtrosDePagefind(elegidos: FiltrosElegidos): Record<string, string> {
  const filtros: Record<string, string> = {};
  const obra = obraElegida(elegidos);
  if (elegidos.autor !== '') filtros[FILTROS_DE_CITA.autor] = elegidos.autor;
  if (obra !== '') filtros[FILTROS_DE_CITA.obra] = obra;
  if (elegidos.tema !== '') filtros[FILTROS_DE_CITA.tema] = elegidos.tema;
  return filtros;
}

/**
 * La combinación de filtros que viaja en la `busqueda` asentada (Historia 23.8), del vocabulario
 * cerrado: «ninguno», «autor», «tema», «autor-tema» y, desde la 27.3, «autor-obra» y
 * «autor-obra-tema».
 */
export function combinacionDeFiltros(elegidos: FiltrosElegidos): Filtros {
  // La Obra solo cuenta con Autor (`obraElegida`): `filtrosUsados` no devuelve `null`.
  return filtrosUsados({
    autor: elegidos.autor !== '',
    obra: obraElegida(elegidos) !== '',
    tema: elegidos.tema !== '',
  })!;
}

/**
 * Los valores de los filtros en una cadena, para la clave del asentamiento
 * (`asentamientoDeBusqueda`): otro Autor —u otra Obra— con la misma combinación es otro estado.
 * Sin filtros, `undefined`, y la clave queda como la de la 23.8. Sin Obra, `autor|tema`, como en
 * la 27.2; con Obra, `autor|tema|obra` —`a||a--o` sin Tema—. El orden **no** es el del nombre de
 * la combinación (`autor-obra-tema`, de `src/lib/vocabulario.ts`) a propósito: la Obra va al final
 * para que la clave de un estado sin Obra siga siendo la misma que escribía la 27.2. La clave solo
 * distingue estados, y nadie la parte.
 */
export function valoresDeFiltros(elegidos: FiltrosElegidos): string | undefined {
  if (!hayFiltros(elegidos)) return undefined;
  const obra = obraElegida(elegidos);
  return `${elegidos.autor}|${elegidos.tema}` + (obra !== '' ? `|${obra}` : '');
}

/** Lo que el recuento necesita: el total, el texto tal como se buscó y los **nombres** elegidos. */
export interface DatosDelRecuento {
  total: number;
  texto: string;
  /** El nombre del Autor elegido, tal como se lee; sin filtro de Autor, se omite. */
  autor?: string;
  /**
   * Historia 27.3 — el **título** de la Obra elegida, del mapa de rótulos («Maestros
   * ambulantes»), nunca el rótulo de su opción con el recuento; sin filtro de Obra, se omite.
   */
  obra?: string;
  /** El nombre del Tema elegido, tal como se lee («La prudencia»); sin filtro de Tema, se omite. */
  tema?: string;
}

/**
 * La frase del recuento de `/buscar/` — Historia 27.2, UX-DR89, `EXPERIENCE.md § Búsqueda`.
 *
 * Sin filtros, la de siempre: «28 resultados.», «Un resultado.». Con filtros nombra lo filtrado,
 * en este orden: «222 citas de José Martí.», «8 citas de José Martí sobre la prudencia.», «6 citas
 * sobre el saber con «escuela».», «Una cita de Séneca.» y, con Obra (27.3), «23 citas de José
 * Martí en Maestros ambulantes.», «Una cita de José Martí en Maestros ambulantes sobre la
 * prudencia.». El Tema va en minúscula con la regla de
 * la 24.5 (`temaEnFrase`), y el texto, recortado en sus extremos, entre comillas angulares. El
 * total es el de la respuesta de Pagefind, no los pintados.
 *
 * Lo tecleado entra en la frase y la frase en la página **solo por `textContent`**: aquí no se
 * escapa nada porque nada de esto se pinta como HTML.
 */
export function fraseDelRecuento({ total, texto, autor, obra, tema }: DatosDelRecuento): string {
  if (autor === undefined && tema === undefined) {
    return total === 1 ? 'Un resultado.' : `${total} resultados.`;
  }
  const recortado = texto.trim();
  return cerrarFrase(
    (total === 1 ? 'Una cita' : `${total} citas`) +
      loFiltrado({ autor, obra, tema }) +
      (recortado !== '' ? ` con «${recortado}»` : ''),
  );
}

/**
 * Lo filtrado, tal como lo nombran el recuento y la frase a cero — Historias 27.2, 27.3 y 27.6:
 * « de {Autor}», « en {Obra}» y « sobre {tema}», en ese orden y cada uno solo si está. Un solo
 * sitio para las dos frases: si una nombrara la Obra y la otra no, el visitante leería dos
 * búsquedas distintas.
 */
function loFiltrado({ autor, obra, tema }: Omit<DatosDelRecuento, 'total' | 'texto'>): string {
  return (
    (autor !== undefined ? ` de ${autor}` : '') +
    // La Obra nunca va sin su Autor, y un título vacío no se nombra: «… en .» no es una frase.
    (obra !== undefined && obra.trim() !== '' && autor !== undefined ? ` en ${obra}` : '') +
    (tema !== undefined ? ` sobre ${temaEnFrase(tema)}` : '')
  );
}

/**
 * Cierra una frase con su punto. Un título que cierra con «!», «?», «…» o el punto de una
 * abreviatura ya la cierra: tras ellos no se escribe otro punto («… en ¡Adentro!», nunca
 * «¡Adentro!.»).
 */
function cerrarFrase(frase: string): string {
  return /[.?!…]$/u.test(frase) ? frase : frase + '.';
}

/**
 * La frase de la búsqueda sin resultados sin filtros — FR-8, UX-DR62. Es también la que pinta el
 * build en la salida de `/buscar/`, antes de que la isla la componga: una sola cadena para las dos.
 */
export const SUGERENCIA_SIN_FILTROS = 'No encontramos esa frase. Prueba con menos palabras.';

/**
 * La frase de la búsqueda que se asienta a cero — Historia 27.6, FR-8, UX-DR93, UX-DR99,
 * `EXPERIENCE.md § Búsqueda`.
 *
 * Sin filtros, la de siempre, `SUGERENCIA_SIN_FILTROS`: quien solo escribió texto puede probar con
 * menos palabras. Con filtros, nombra lo filtrado con la misma composición que el recuento
 * (`loFiltrado`) y no le pide a nadie que quite palabras que no escribió:
 *
 *   · con texto —recortado en sus extremos, entre comillas angulares—: «No encontramos «escuela»
 *     entre las citas de José Martí en Maestros ambulantes.»;
 *   · sin texto: «No hay citas de José Martí sobre la prudencia.».
 *
 * Las dos cierran con punto salvo que ya cierren (`cerrarFrase`). Lo tecleado entra tal cual: la
 * frase se pinta **solo por `textContent`**, así que aquí no se escapa nada.
 */
export function sugerenciaSinResultados({ texto, autor, obra, tema }: Omit<DatosDelRecuento, 'total'>): string {
  if (autor === undefined && tema === undefined) return SUGERENCIA_SIN_FILTROS;
  const recortado = texto.trim();
  const filtrado = loFiltrado({ autor, obra, tema });
  return cerrarFrase(
    recortado !== '' ? `No encontramos «${recortado}» entre las citas${filtrado}` : `No hay citas${filtrado}`,
  );
}

// ─── El selector de Obra (Historia 27.3) ─────────────────────────────────────

/**
 * Dónde escribe el build el mapa de rótulos de las Obras (`src/pages/buscar/obras.json.ts`) y de
 * dónde lo pide la isla de `/buscar/`. Una sola constante para los dos: una prueba sobre `dist/`
 * fija que el fichero está ahí.
 */
export const RUTA_DEL_MAPA_DE_OBRAS = '/buscar/obras.json';

/**
 * El mapa de rótulos tal como llega al cliente: por slug de Autor, sus Obras como pares
 * `[nombre de ficha, título]`, ya en el orden de su Lista de Obras (`filtrosDeLaBusqueda`, AD-25).
 * El Autor de una Obra sale de aquí —de en qué lista está—, nunca de partir su nombre (27.4).
 */
export type MapaDeObras = Readonly<Record<string, readonly (readonly [string, string])[]>>;

/** Una opción del selector de Obra: el nombre de la ficha, el título y sus Citas en el índice. */
export interface OpcionDelSelectorDeObra {
  valor: string;
  titulo: string;
  recuento: number;
}

/**
 * Las Obras que ofrece el selector de Obra del Autor elegido — Historia 27.3, FR-7, UX-DR87.
 *
 * Las del Autor **en el orden del mapa** —el de su Lista de Obras, hecho en el build: el cliente
 * no ordena—, y de ellas solo las que `filters().obra` de Pagefind cuenta con al menos una Cita.
 * Una Obra que falta en uno de los dos —un mapa y un índice de despliegues distintos— se omite en
 * silencio, y las demás se ofrecen. El recuento es el de `filters()`, el total del índice: no
 * cambia con el texto ni con los otros filtros. Sin ninguna, la lista vacía: no hay selector.
 *
 * El mapa llega de la red, así que una forma inesperada —un Autor sin lista, un par que no es de
 * dos cadenas, un nombre o un título vacíos— no rompe: no ofrece nada de lo que no entiende.
 */
export function opcionesDeObra(
  mapa: MapaDeObras,
  recuentos: Readonly<Record<string, number>> | undefined,
  autor: string,
): OpcionDelSelectorDeObra[] {
  if (autor === '' || !Object.prototype.hasOwnProperty.call(mapa, autor)) return [];
  const lista: unknown = mapa[autor];
  if (!Array.isArray(lista) || recuentos === undefined) return [];
  const opciones: OpcionDelSelectorDeObra[] = [];
  for (const par of lista as unknown[]) {
    if (!Array.isArray(par) || typeof par[0] !== 'string' || typeof par[1] !== 'string') continue;
    // Un nombre o un título vacíos no se ofrecen: «Todas sus obras» ya tiene el valor vacío, y un
    // rótulo « (n citas)» no nombra nada.
    if (par[0] === '' || par[1].trim() === '') continue;
    const [valor, titulo] = par as [string, string];
    if (!Object.prototype.hasOwnProperty.call(recuentos, valor)) continue;
    const recuento = recuentos[valor];
    if (typeof recuento !== 'number' || !(recuento >= 1)) continue;
    opciones.push({ valor, titulo, recuento });
  }
  return opciones;
}

/**
 * El rótulo de una opción del selector de Obra: «Maestros ambulantes (23 citas)», «Cartas
 * (1 cita)», con la concordancia de `recuentoDeCitas` —la de la Lista de Obras—.
 */
export function rotuloDeObra(opcion: Pick<OpcionDelSelectorDeObra, 'titulo' | 'recuento'>): string {
  return `${opcion.titulo} (${recuentoDeCitas(opcion.recuento)})`;
}

// ─── La búsqueda en la dirección (Historia 27.4) ─────────────────────────────

/**
 * El estado de la búsqueda tal como vive en la dirección y en el objeto de estado de cada entrada
 * del historial — Historia 27.4, FR-7, NFR-4, UX-DR93, AD-13. Lleva **identificadores**, nunca
 * rótulos: `autor` es el slug del Autor, `obra` el nombre de la ficha de la Obra (el que escribe
 * la 27.1, que retitular no cambia) y `tema` el slug del Tema. Vacío es ausente: `''` en
 * cualquiera de los cuatro quiere decir que ese parámetro no está.
 */
export interface EstadoDeLaBusqueda {
  /** Lo tecleado, tal como llegó; al componer la dirección se recorta (solo espacios = sin `q`). */
  texto: string;
  autor: string;
  /** El nombre de la ficha de la Obra; **solo cuenta con `autor`** al componer la dirección. */
  obra: string;
  tema: string;
}

/**
 * Los cuatro parámetros de la dirección de `/buscar/`, **en el orden en que se componen**:
 * `?q=&autor=&obra=&tema=`. La clave es el campo de `EstadoDeLaBusqueda`; el valor, el nombre del
 * parámetro. `q` es el `name` del campo desde la v1: el formulario sin guion envía lo mismo.
 */
export const PARAMETROS_DE_LA_BUSQUEDA = {
  texto: 'q',
  autor: 'autor',
  obra: 'obra',
  tema: 'tema',
} as const satisfies Record<keyof EstadoDeLaBusqueda, string>;

const CAMPOS_DEL_ESTADO = Object.keys(PARAMETROS_DE_LA_BUSQUEDA) as (keyof EstadoDeLaBusqueda)[];

/** El estado sin nada: la búsqueda de `/buscar/` a secas. */
export const ESTADO_VACIO: Readonly<EstadoDeLaBusqueda> = Object.freeze({ texto: '', autor: '', obra: '', tema: '' });

/**
 * El estado que dice una dirección — su `location.search`, con o sin `?`. De cada parámetro, la
 * **primera aparición** (como `URLSearchParams.get`); uno vacío o ausente, `''`. Lo que la
 * dirección traiga de más —otro parámetro, las marcas de llegada `de` y `via`— no se lee: la
 * búsqueda no las conoce, y las quita el fichero de medición.
 */
export function estadoDeLaDireccion(search: string): EstadoDeLaBusqueda {
  const parametros = new URLSearchParams(search);
  const estado = { ...ESTADO_VACIO };
  for (const campo of CAMPOS_DEL_ESTADO) estado[campo] = parametros.get(PARAMETROS_DE_LA_BUSQUEDA[campo]) ?? '';
  return estado;
}

/**
 * Los parámetros que un estado pone en la dirección, en su orden y solo los no vacíos: el texto
 * recortado (solo espacios = sin `q`) y la Obra **solo con Autor** (FR-7: la Obra nunca va sin su
 * Autor). Es lo que lleva también el objeto de estado de la entrada.
 */
function parametrosDe(estado: EstadoDeLaBusqueda): [string, string][] {
  const valores: Record<keyof EstadoDeLaBusqueda, string> = {
    texto: estado.texto.trim(),
    autor: estado.autor,
    obra: estado.autor !== '' ? estado.obra : '',
    tema: estado.tema,
  };
  return CAMPOS_DEL_ESTADO.filter((campo) => valores[campo] !== '').map((campo) => [
    PARAMETROS_DE_LA_BUSQUEDA[campo],
    valores[campo],
  ]);
}

/**
 * Si un estado no busca nada: sin texto (vacío o solo espacios) y sin ningún filtro. Una `obra`
 * sin `autor` **sí** cuenta aquí —la dirección la puede traer, y la resolución le busca su Autor—.
 */
export function estadoSinNada(estado: EstadoDeLaBusqueda): boolean {
  return estado.texto.trim() === '' && estado.autor === '' && estado.obra === '' && estado.tema === '';
}

/**
 * La dirección de un estado: `ruta` (la de `rutaDeLaBusqueda()`, que la isla recibe del `action`
 * de su formulario, para no arrastrar `superficies.ts` al cliente) y, si queda algún parámetro,
 * `?q=&autor=&obra=&tema=` en ese orden, codificados por `URLSearchParams`. Sin estado, la ruta a
 * secas. Se compone **siempre desde el estado**, nunca editando `location.search`: lo que la
 * dirección traía de más no vuelve.
 */
export function direccionDeLaBusqueda(estado: EstadoDeLaBusqueda, ruta: string): string {
  const consulta = new URLSearchParams(parametrosDe(estado)).toString();
  return consulta === '' ? ruta : `${ruta}?${consulta}`;
}

/**
 * Si dos estados son el mismo: el mismo texto recortado y los mismos tres filtros, **tal cual**.
 * Dos estados iguales dan la misma dirección; la inversa no vale para una `obra` sin `autor`, que
 * no se compone pero sí es distinta: una dirección que la trae no dice lo mismo que una que no, y
 * la isla la reemplaza.
 */
export function mismoEstado(a: EstadoDeLaBusqueda, b: EstadoDeLaBusqueda): boolean {
  return a.texto.trim() === b.texto.trim() && a.autor === b.autor && a.obra === b.obra && a.tema === b.tema;
}

/**
 * La clave del objeto de estado de una entrada del historial bajo la que la isla guarda el estado
 * de la búsqueda de esa entrada, con los **nombres de los parámetros** (`{ q, autor, obra, tema }`,
 * solo los no vacíos). Convive con la marca de búsqueda asentada de la 23.8
 * (`MARCA_DE_BUSQUEDA_ASENTADA`), que es otra clave del mismo objeto.
 */
export const CLAVE_DEL_ESTADO_EN_LA_ENTRADA = 'busqueda';

/**
 * El estado que guarda el objeto de una entrada, o `null` si no guarda ninguno: sin objeto, sin la
 * clave, o con algo bajo ella que no tiene la forma —un objeto cuyos valores, si están, son cadenas
 * con nombre de parámetro—. El historial lo puede haber escrito otra versión del sitio: lo que no
 * se entiende no se lee, y la isla cae a la dirección.
 */
export function estadoDeLaEntrada(estadoDelHistorial: unknown): EstadoDeLaBusqueda | null {
  if (typeof estadoDelHistorial !== 'object' || estadoDelHistorial === null) return null;
  if (!Object.prototype.hasOwnProperty.call(estadoDelHistorial, CLAVE_DEL_ESTADO_EN_LA_ENTRADA)) return null;
  const guardado: unknown = (estadoDelHistorial as Record<string, unknown>)[CLAVE_DEL_ESTADO_EN_LA_ENTRADA];
  if (typeof guardado !== 'object' || guardado === null || Array.isArray(guardado)) return null;
  const nombres: readonly string[] = Object.values(PARAMETROS_DE_LA_BUSQUEDA);
  const estado = { ...ESTADO_VACIO };
  for (const [nombre, valor] of Object.entries(guardado)) {
    if (!nombres.includes(nombre) || typeof valor !== 'string') return null;
  }
  for (const campo of CAMPOS_DEL_ESTADO) {
    const valor = (guardado as Record<string, string | undefined>)[PARAMETROS_DE_LA_BUSQUEDA[campo]];
    if (valor !== undefined) estado[campo] = valor;
  }
  return estado;
}

/**
 * El objeto de estado que la isla escribe en una entrada: una **copia** del que se le pasa —con sus
 * demás claves, también la marca de la 23.8— y, bajo `CLAVE_DEL_ESTADO_EN_LA_ENTRADA`, los
 * parámetros del estado. No muta el que recibe. Sin objeto (o con algo que no lo es), uno nuevo.
 */
export function entradaConEstado(estadoDelHistorial: unknown, estado: EstadoDeLaBusqueda): Record<string, unknown> {
  return Object.assign(
    {},
    typeof estadoDelHistorial === 'object' && estadoDelHistorial !== null ? estadoDelHistorial : {},
    { [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: Object.fromEntries(parametrosDe(estado)) },
  );
}

/**
 * El Autor de una Obra, por su nombre de ficha: el Autor **en cuya lista del mapa** está y cuyo
 * selector de Obra la ofrecería (`opcionesDeObra`, con los recuentos de `filters()`), o `null`.
 * **Nunca partiendo el nombre**: el prefijo del nombre de la ficha no se lee en el cliente (AD-25),
 * y una Obra que ya no tiene Citas —o que se absorbió al reunir— no tiene Autor aquí.
 */
export function autorDeLaObra(
  mapa: MapaDeObras,
  recuentos: Readonly<Record<string, number>> | undefined,
  nombre: string,
): string | null {
  if (nombre === '') return null;
  for (const autor of Object.keys(mapa)) {
    if (opcionesDeObra(mapa, recuentos, autor).some((o) => o.valor === nombre)) return autor;
  }
  return null;
}

/** Lo que la resolución necesita saber del sitio: qué se puede elegir y de quién es cada Obra. */
export interface LoQueSePuedeElegir {
  /** Los valores de las opciones del selector de Autor (sin «Todos los autores»). */
  autores: readonly string[];
  /** Los valores de las opciones del selector de Tema (sin «Todos los temas»). */
  temas: readonly string[];
  /** El Autor de una Obra ofrecible, o `null` (`autorDeLaObra`). Solo se pregunta con `obra`. */
  autorDeLaObra: (nombre: string) => string | null;
}

/**
 * La resolución de un estado leído de la dirección o de una entrada — Historia 27.4, en un **orden
 * fijo**:
 *
 *   1. se descarta, contando uno por cada uno, el `autor` que no es opción del selector de Autor,
 *      el `tema` que no es opción del de Tema y la `obra` que no es ofrecible: sin Autor en
 *      `autorDeLaObra`, o con un Autor del mapa que no es opción del selector de Autor (un mapa y
 *      un selector de construcciones distintas);
 *   2. una `obra` sin `autor` toma el Autor de la Obra;
 *   3. un `autor` y una `obra` que no casan: se descarta la `obra` (uno más).
 *
 * Nunca se cambia el Autor por el de la Obra, ni se traduce una Obra absorbida a la que la
 * absorbió: lo que no existe se dice (`avisoDeLaDireccion`) y la búsqueda va sin ello. El texto
 * no se toca.
 */
export function resolverEstado(
  leido: EstadoDeLaBusqueda,
  sitio: LoQueSePuedeElegir,
): { estado: EstadoDeLaBusqueda; noSeUsan: number } {
  const estado = { ...leido };
  let noSeUsan = 0;
  if (estado.autor !== '' && !sitio.autores.includes(estado.autor)) {
    estado.autor = '';
    noSeUsan++;
  }
  if (estado.tema !== '' && !sitio.temas.includes(estado.tema)) {
    estado.tema = '';
    noSeUsan++;
  }
  const deLaObra = estado.obra !== '' ? sitio.autorDeLaObra(estado.obra) : null;
  // Una Obra cuyo Autor no es opción del selector de Autor (datos de otra construcción) tampoco se ofrece.
  if (estado.obra !== '' && (deLaObra === null || !sitio.autores.includes(deLaObra))) {
    estado.obra = '';
    noSeUsan++;
  }
  if (estado.obra !== '' && estado.autor === '') estado.autor = deLaObra!;
  if (estado.obra !== '' && estado.autor !== deLaObra) {
    estado.obra = '';
    noSeUsan++;
  }
  return { estado, noSeUsan };
}

const CUANTOS = ['Uno', 'Dos', 'Tres'] as const;

/**
 * La frase fija que dice que la dirección traía filtros que no se pueden usar — Historia 27.4,
 * UX-DR93. Va en la región del recuento, delante del recuento (o de la sugerencia a cero), con un
 * espacio. Con algo con que buscar (`quedaAlgo`: texto o algún filtro que sí se usa): «Uno de los
 * filtros de esta dirección no se puede usar, y la búsqueda va sin él.», «Dos…»/«Tres… no se
 * pueden usar, y la búsqueda va sin ellos.». Sin nada: «El filtro de esta dirección ya no
 * existe.» o «Los filtros de esta dirección ya no existen.», y no hay búsqueda. Sin descartes, `''`.
 */
export function avisoDeLaDireccion(noSeUsan: number, quedaAlgo: boolean): string {
  if (!(noSeUsan >= 1)) return '';
  if (!quedaAlgo) {
    return noSeUsan === 1 ? 'El filtro de esta dirección ya no existe.' : 'Los filtros de esta dirección ya no existen.';
  }
  const cuantos = CUANTOS[Math.min(noSeUsan, CUANTOS.length) - 1];
  return noSeUsan === 1
    ? `${cuantos} de los filtros de esta dirección no se puede usar, y la búsqueda va sin él.`
    : `${cuantos} de los filtros de esta dirección no se pueden usar, y la búsqueda va sin ellos.`;
}

/**
 * El control que escribe un estado en la dirección: el campo (teclear y Enter), cada selector, y
 * «Quitar los filtros», que es control propio. Los selectores se nombran `selector-de-…`, no por el
 * filtro: `autor` o `tema` a secas son combinaciones del vocabulario de la medición, y el guion de
 * la búsqueda no escribe ninguna.
 */
export type ControlDeLaBusqueda = 'campo' | 'selector-de-autor' | 'selector-de-obra' | 'selector-de-tema' | 'quitar';

/**
 * Cómo se escribe un estado en el historial — Historia 27.4, AD-13:
 *
 *   · `'ninguna'` si es el mismo estado que dice la dirección actual (`igual`);
 *   · `'replaceState'` si la entrada actual la abrió **el mismo control** y no está asentada
 *     —una entrada asentada, la de una llegada o la de un `popstate` no tienen control
 *     (`controlDeLaEntrada` `null`)—: seguir tecleando, o las flechas sobre el mismo selector, no
 *     apilan una entrada por estado;
 *   · `'pushState'` en cualquier otro caso: otro control, o una entrada sin control.
 */
export function escrituraDelHistorial({
  igual,
  control,
  controlDeLaEntrada,
}: {
  igual: boolean;
  control: ControlDeLaBusqueda;
  controlDeLaEntrada: ControlDeLaBusqueda | null;
}): 'ninguna' | 'pushState' | 'replaceState' {
  if (igual) return 'ninguna';
  return controlDeLaEntrada === control ? 'replaceState' : 'pushState';
}

/**
 * El rótulo del botón que trae la tanda siguiente de `/buscar/` — Historia 27.5, FR-7, UX-DR90,
 * UX-DR112.
 *
 * `quedan` son los resultados del mismo `results` que aún no se pintaron. Con una tanda entera o
 * más por delante —también con exactamente `TANDA_DE_RESULTADOS`—, «Mostrar 30 más»; con menos, la
 * última se nombra: «Mostrar las 12 que faltan» y, con una, «Mostrar la que falta». Sin ninguna,
 * `null`: no hay botón. La isla no escribe ninguna de las frases; pone en el botón lo que da esto.
 */
export function rotuloDeMostrarMas(quedan: number): string | null {
  if (!(quedan > 0)) return null;
  if (quedan >= TANDA_DE_RESULTADOS) return `Mostrar ${TANDA_DE_RESULTADOS} más`;
  return quedan === 1 ? 'Mostrar la que falta' : `Mostrar las ${quedan} que faltan`;
}

/**
 * Lo que dice la región de estado del botón cuando la tanda no llega — Historia 27.5, UX-DR99,
 * UX-DR101. Se escribe con el primer ritmo (`anunciar`), en la región propia del botón y no en la
 * del recuento, que no cambia: lo pintado sigue siendo cierto.
 */
export const FALLO_DE_LA_TANDA = 'No se han podido cargar más resultados.';

/**
 * Los avisos de `/buscar/` cuando la búsqueda no puede correr — Historia 27.7, FR-7, NFR-2,
 * UX-DR92, `DESIGN.md § /buscar/ sin JavaScript`.
 *
 * Son tres casos y una sola composición (`src/components/AvisoDeLaBusqueda.astro`): dos párrafos
 * —`lema`, lo que pasa, y `sigue`, por dónde seguir— y, debajo, los dos Directorios como
 * resultados de tipo «Directorio». El componente pinta estas cadenas y la isla anuncia la del
 * fallo (`ANUNCIO_DEL_FALLO_DE_LA_BUSQUEDA`): ninguna se escribe dos veces.
 *
 *   · `AVISO_SIN_GUION` — el del `<noscript>`: el navegador no ejecuta JavaScript;
 *   · `AVISO_PREVIO` — el del HTML inicial, oculto sin guion, hasta que arranca la isla. Es
 *     **condicional** porque se pinta en cada carga: una frase de fallo sería falsa en cada carga
 *     normal, y esta es cierta mientras carga y también si el paquete no llega a ejecutar;
 *   · `AVISO_DEL_FALLO` — el del índice que no carga al buscar (`pagefind.js`, su `init`, `search`,
 *     los datos, o el mapa y `filters()` que pide una `obra` de la dirección).
 *
 * La frase de volver atrás, `VOLVER_ATRAS_A_LAS_CITAS`, es la misma en los tres.
 */
export const VOLVER_ATRAS_A_LAS_CITAS =
  'Si llegaste desde la página de un autor, de una obra o de un tema, vuelve atrás: allí están sus citas.';

/** Los dos párrafos de un aviso de `/buscar/`: lo que pasa y por dónde seguir. */
export interface AvisoDeLaBusqueda {
  readonly lema: string;
  readonly sigue: string;
}

/** El aviso sin guion, en `<noscript>` — Historia 27.7. */
export const AVISO_SIN_GUION: AvisoDeLaBusqueda = {
  lema: 'Buscar y filtrar necesitan JavaScript, y este navegador no lo está ejecutando.',
  sigue: `Sin él, todos los autores y todas las obras se leen en sus directorios. ${VOLVER_ATRAS_A_LAS_CITAS}`,
};

/** El aviso previo, en el HTML inicial hasta que arranca la isla — Historia 27.7. */
export const AVISO_PREVIO: AvisoDeLaBusqueda = {
  lema: 'Si la búsqueda no aparece, todos los autores y todas las obras se leen en sus directorios.',
  sigue: VOLVER_ATRAS_A_LAS_CITAS,
};

/** El aviso del índice que no carga, que la isla inserta en lugar de los resultados — Historia 27.7. */
export const AVISO_DEL_FALLO: AvisoDeLaBusqueda = {
  lema: 'No se ha podido cargar la búsqueda.',
  sigue: `Todos los autores y todas las obras se leen en sus directorios. ${VOLVER_ATRAS_A_LAS_CITAS}`,
};

/**
 * Lo que la región del recuento anuncia al pintar el aviso del fallo — Historia 27.7: los dos
 * párrafos, con un espacio. Se escribe con el primer ritmo (`anunciar`) y la región se aparta de
 * la vista, como a cero: se ve una vez, en el aviso, y se lee una.
 */
export const ANUNCIO_DEL_FALLO_DE_LA_BUSQUEDA = `${AVISO_DEL_FALLO.lema} ${AVISO_DEL_FALLO.sigue}`;
