/**
 * La búsqueda con filtros de `/buscar/` — Historia 27.2, FR-7, UX-DR87, UX-DR88, UX-DR89.
 *
 * La decisión pura de la búsqueda, sin DOM, como `src/lib/filtroDelDirectorio.ts` lo es del filtro
 * de los Directorios: qué frase dice el recuento, qué `filters` se le pasan a Pagefind, qué
 * combinación de filtros (`filtrosUsados`) viaja en la `busqueda` asentada y, desde la Historia
 * 27.3, qué Obras ofrece el selector de Obra del Autor elegido. La pinta el guion
 * empaquetado de `src/components/Busqueda.astro`, que la importa, y `buscar.astro` toma de aquí los
 * textos fijos del campo. Apta para el cliente: solo importa módulos que también lo son, y el grafo
 * entero de lo que arrastra el guion lo fija `tests/unit/busqueda-con-filtros.test.ts`.
 *
 * AD-5 — Derivación pura.
 */

import { recuentoDeCitas, temaEnFrase } from './recuentos.ts';
import { FILTROS_DE_CITA } from './tipoDeResultado.ts';
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
  const frase =
    (total === 1 ? 'Una cita' : `${total} citas`) +
    (autor !== undefined ? ` de ${autor}` : '') +
    // La Obra nunca va sin su Autor, y un título vacío no se nombra: «… en .» no es una frase.
    (obra !== undefined && obra.trim() !== '' && autor !== undefined ? ` en ${obra}` : '') +
    (tema !== undefined ? ` sobre ${temaEnFrase(tema)}` : '') +
    (recortado !== '' ? ` con «${recortado}»` : '');
  // Un título que cierra con «!», «?», «…» o el punto de una abreviatura ya cierra la frase: tras
  // ellos no se escribe otro punto («… en ¡Adentro!», nunca «¡Adentro!.»).
  return /[.?!…]$/u.test(frase) ? frase : frase + '.';
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
