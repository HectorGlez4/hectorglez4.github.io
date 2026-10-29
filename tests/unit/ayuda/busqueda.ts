import { createContext, runInContext } from 'node:vm';
import { TANDA_DE_RESULTADOS } from '../../../src/lib/umbrales.ts';

/**
 * La isla de `/buscar/`, ejecutada — Historias 23.8, 27.2, 27.3, 27.4 y 27.5.
 *
 * Es el «ejecutándola» que pedía la prueba de la 23.6. Desde la 27.2 la isla es el `<script>`
 * empaquetado de `src/components/Busqueda.astro`, un fichero de `/_astro/` que se aplana a guion
 * clásico (`tests/unit/ayuda/aplanar.ts`) para ejecutarlo; escribe en el historial desde la 23.8.
 * Lo que hay que probar es lo que **hace** —qué pide a `__medir` y a Pagefind, cuándo, qué pinta y
 * qué escribe en `history`—, y eso solo se ve ejecutando el guion de verdad, el que sale en `dist/`.
 *
 * El entorno es un global de verdad (`node:vm`), como el de `tests/unit/ayuda/medicion.ts`: la isla
 * llama `__medir`, `history` y `location` a secas. Lleva lo que la isla pide y nada más:
 *
 *   · la raíz `[data-busqueda]` con su `<template>`, cuyo contenido clonado da el formulario, el
 *     campo, los dos selectores (con sus opciones), «Quitar los filtros» y la sombra del recuento;
 *     y la lista, el estado (dentro de su contenedor, para que la sombra se ponga delante) y la
 *     salida (con su `.sugerencia`). Cualquier otro selector **lanza**, para que una isla que
 *     empiece a pedir otra cosa no pase en verde contra un entorno que no la sabe. El campo es de
 *     búsqueda, y como en el navegador quita los saltos de línea de lo que se le escribe; un
 *     selector cambia de opción al escribirle el valor, como uno nativo, y el foco se apunta;
 *   · Historia 27.5 — la raíz, el contenedor del recuento, la lista y la salida van, en ese orden,
 *     en la columna de la página (`isConnected` dice si un elemento cuelga de ella), así que se
 *     puede poner algo detrás de la lista. El clon lleva además el bloque `[data-mas]` con su
 *     botón (`[data-mostrar-mas]`) y su región (`[data-fallo-de-la-tanda]`). Reciben el foco el
 *     campo, el botón y los enlaces que la isla crea; uno que sale del DOM lo pierde, como en el
 *     navegador. `pulsarMas()` enfoca el botón y despacha `click`; `mas()` dice si el bloque está,
 *     si va justo detrás de la lista, su rótulo y lo que dice su región; `escrituras()` cuenta lo
 *     que se escribió en la región del recuento y en su sombra. `falla: 'tanda'` rechaza `data()`
 *     de los resultados desde `TANDA_DE_RESULTADOS`, y con `tandaManual` esos `data()` esperan a
 *     `responderALaTanda()`;
 *   · `document.createElement` con lo que usa para pintar un resultado;
 *   · un reloj fingido —`setTimeout`, `clearTimeout`, `requestAnimationFrame`, `performance.now`—
 *     que solo avanza con `avanzar(ms)`;
 *   · Historia 27.4 — un historial con entradas: `location` refleja la entrada actual y es de
 *     solo lectura —escribir en ella o llamar a `assign`/`replace` se apunta como violación—;
 *     `history` lleva su `state` y su `length`, y `pushState`/`replaceState` con dirección se
 *     admiten y se apuntan (con todos sus argumentos tal como llegaron) siempre que la dirección
 *     sea del mismo origen y de la ruta `/buscar/` —otra es una violación—; `replaceState` sin
 *     dirección es la marca de la 23.8 y `pushState` sin dirección, una violación. Pueden lanzar
 *     siempre o las N primeras veces (`historialQueLanza`), y una llamada que lanza no cambia nada.
 *     `atras()` y `adelante()` cambian de entrada y despachan `popstate` en la ventana con el objeto
 *     de la entrada; `historial()` da todas las llamadas, `marcas()` las de dos argumentos y
 *     `direcciones()` las que escriben dirección;
 *   · Navigation Timing configurable: el tipo de la entrada, ninguna entrada o sin la API;
 *   · la visibilidad del documento —visible al cargar, u oculta, como una pestaña de fondo—,
 *     `pagehide` y `pageshow`;
 *   · `__medir` espía, y `Event` con un `dispatchEvent` de la ventana que no hace nada: el envoltorio
 *     con que el empaquetado rodea el `import()` avisa por ahí de una importación fallida;
 *   · un Pagefind de mentira en lugar del único `import(` del guion —la sustitución se comprueba:
 *     si el guion no lleva exactamente uno, o no empieza pidiendo `/pagefind/pagefind.js` (con
 *     comillas simples, dobles o la plantilla del empaquetado), el entorno lanza; lo que pide de
 *     verdad, con el `?{n}` de su reintento, se apunta—, con el total y lo que da `slice`
 *     configurables por consulta (y por sus `filters`), respuestas que esperan a
 *     `responder(consulta)` si se pide, rechazo en la importación, en `init`, en `search` o en los
 *     datos de un resultado, y un `destroy` que se cuenta. Desde la Historia 26.2 el módulo lleva
 *     también `options`, y `llamadas()` da en orden cada llamada al módulo (`options` con su
 *     argumento, `init`, `search` con su consulta —y, si las lleva, sus opciones: los `filters` y
 *     el `sort` de la 27.2— y `destroy`).
 *   · Historia 27.3 — el `.selector` de Obra: cada selector va en su caja (`parentElement`) dentro
 *     del formulario, y la de Obra se puede quitar (`remove`) y volver a poner tras la de Autor
 *     (`after`); su `<select>` cambia de opciones con `replaceChildren` y `new Option`. El
 *     `fetch` del mapa de rótulos —solo de `/buscar/obras.json`; otra dirección lanza— responde
 *     con el mapa configurado (por omisión, `{}`), puede fallar, dar un JSON que no se lee o
 *     esperar a `responderAlMapa()`; cada petición se apunta. `filters()` de Pagefind da
 *     `{ obra: recuentosDeObra }` (por omisión, `{}`), puede rechazar o esperar a
 *     `responderAFiltros()`, y se apunta en `llamadas()` como `['filters']`.
 *
 * `analizado()` es lo que la isla hizo **al evaluarse**, antes de ninguna escucha ni de ninguna
 * promesa: ahí no puede haber ni medición ni escritura en el historial. `rechazos()` son las
 * promesas que quedaron rechazadas sin manejar mientras el entorno estuvo abierto; `cerrar()` deja
 * de escucharlas.
 */

/** Lo que da `data()` de un resultado: su URL, su metadata y sus filtros, como Pagefind. */
export interface DatoDeResultado {
  url: string;
  meta?: Record<string, unknown>;
  filters?: Record<string, unknown>;
}

/**
 * El total de una consulta y cuántos resultados da su `slice` (por omisión, los mismos). Con
 * `datos`, lo que da `data()` del resultado `i`; sin él, una Cita con su filtro de tipo
 * (Historia 26.2: el tipo llega en `filters`, no en `meta`).
 */
export interface Respuesta {
  total: number;
  pintados?: number;
  datos?: (i: number) => DatoDeResultado;
}

export interface OpcionesDeLaIsla {
  /** `location.search`, con su `?`. Por omisión, ninguna. */
  busqueda?: string;
  /** `history.state` al cargar. Por omisión, `null`, como una página recién servida. */
  estado?: unknown;
  /** El tipo de la entrada de navegación (`navigate`, `reload`, `back_forward`, `prerender`); `null`, ninguna entrada. */
  navegacion?: string | null;
  /** Sin `performance.getEntriesByType`. */
  sinNavigationTiming?: boolean;
  /**
   * Si el historial lanza, como uno que no se deja escribir: `true`, siempre, `pushState` y
   * `replaceState`; con un objeto, las N primeras llamadas de cada uno (o siempre, con `true`).
   */
  historialQueLanza?: boolean | { pushState?: number | boolean; replaceState?: number | boolean };
  /**
   * Dónde falla el índice: la importación, `init`, `search` (que lanza), los datos del primer
   * resultado o (Historia 27.5) los de los resultados de la segunda tanda en adelante.
   */
  falla?: 'importacion' | 'init' | 'search' | 'data' | 'tanda';
  /** Historia 27.5 — si los `data()` desde `TANDA_DE_RESULTADOS` esperan a `responderALaTanda()`. */
  tandaManual?: boolean;
  /**
   * Lo que responde el índice a cada consulta —`null` en la búsqueda sin texto de la 27.2—, con
   * las opciones de `search` si las lleva. Por omisión, nada: total 0.
   */
  respuestas?: (consulta: string | null, opciones?: OpcionesDeSearch) => Respuesta;
  /** Si las respuestas de `search` esperan a `responder(consulta)`. */
  manual?: boolean;
  /** Si la página carga oculta —una pestaña de fondo—, sin haberse visto. */
  oculta?: boolean;
  /** Las opciones de los selectores (sin la primera, «Todos…»). Por omisión, `AUTORES` y `TEMAS`. */
  autores?: OpcionDeSelector[];
  temas?: OpcionDeSelector[];
  /** Historia 27.3 — lo que da el `fetch` del mapa de rótulos, como JSON. Por omisión, `{}`. */
  mapa?: unknown;
  /** Cómo falla el mapa: la red (`fetch` rechaza), un estado que no es 2xx o un JSON que no se lee. */
  fallaElMapa?: 'red' | 'estado' | 'json';
  /** Si el mapa espera a `responderAlMapa()`. */
  mapaManual?: boolean;
  /** Los recuentos de `obra` que da `filters()`. Por omisión, ninguno (`{}`). */
  recuentosDeObra?: Record<string, number>;
  /** Si `filters()` rechaza, o (`'sin-obra'`) si responde sin el filtro `obra`. */
  fallanLosFiltros?: boolean | 'sin-obra';
  /** Si `filters()` espera a `responderAFiltros()`. */
  filtrosManuales?: boolean;
}

/** Lo que `search` recibe como segundo argumento, si lo recibe. */
export interface OpcionesDeSearch {
  filters?: Record<string, string>;
  sort?: Record<string, string>;
}

/** Una opción de un selector: su valor y el nombre que se lee. */
export interface OpcionDeSelector {
  valor: string;
  rotulo: string;
}

/** Las opciones de Autor del entorno, en el orden del build. */
export const AUTORES: OpcionDeSelector[] = [
  { valor: 'jose-marti', rotulo: 'José Martí' },
  { valor: 'seneca', rotulo: 'Séneca' },
];

/** Las opciones de Tema del entorno, en el orden del build. */
export const TEMAS: OpcionDeSelector[] = [
  { valor: 'el-saber', rotulo: 'El saber' },
  { valor: 'la-prudencia', rotulo: 'La prudencia' },
];

/** Lo que la isla pide a `__medir`, cada llamada con sus argumentos. */
export type Emitido = unknown[];

type Oyente = { tipo: string; oyente: (evento: Record<string, unknown>) => void; unaVez: boolean };

/** Un elemento de mentira: lo que la isla lee y escribe al pintar y al escuchar. */
class Elemento {
  readonly tagName: string;
  className = '';
  textContent = '';
  hidden = false;
  value = '';
  href = '';
  dataset: Record<string, string> = {};
  /**
   * Solo el campo, el botón de «Mostrar 30 más» y los enlaces que crea la isla saben recibir el
   * foco; en cualquier otro elemento, llamarlo lanza.
   */
  focus?: () => void;
  /** Historia 27.5 — la columna de la página: lo que cuelga de ella está en el documento. */
  esDocumento = false;
  readonly atributos = new Map<string, string>();
  hijos: Elemento[] = [];
  padre: Elemento | null = null;
  readonly oyentes: Oyente[] = [];
  readonly clases = new Set<string>();
  /** Lo que `querySelector` sabe devolver desde este elemento. */
  readonly dentro = new Map<string, Elemento>();
  readonly classList = {
    add: (...clases: string[]) => clases.forEach((c) => this.clases.add(c)),
    toggle: (clase: string, forzar?: boolean) => {
      const poner = forzar ?? !this.clases.has(clase);
      if (poner) this.clases.add(clase);
      else this.clases.delete(clase);
      return poner;
    },
    contains: (clase: string) => this.clases.has(clase),
  };

  constructor(etiqueta: string) {
    this.tagName = etiqueta.toUpperCase();
  }

  get children() {
    return this.hijos;
  }

  get parentElement() {
    return this.padre;
  }

  /** Si cuelga de la columna de la página, como `isConnected` en el navegador. */
  get isConnected() {
    for (let nodo: Elemento | null = this; nodo; nodo = nodo.padre) if (nodo.esDocumento) return true;
    return false;
  }

  /** Se quita de su padre; sin padre, no hace nada, como en el navegador. */
  remove() {
    if (this.padre === null) return;
    this.padre.hijos.splice(this.padre.hijos.indexOf(this), 1);
    this.padre = null;
  }

  /** Pone `nodo` justo detrás de este elemento, en su padre (quitándolo antes de donde esté). */
  after(nodo: Elemento) {
    if (this.padre === null) throw new Error(`el entorno no sabe poner nada detrás de <${this.tagName}> sin padre`);
    nodo.remove();
    nodo.padre = this.padre;
    this.padre.hijos.splice(this.padre.hijos.indexOf(this) + 1, 0, nodo);
  }

  append(...nodos: Elemento[]) {
    for (const nodo of nodos) {
      nodo.padre = this;
      this.hijos.push(nodo);
    }
  }

  /** Pone `nodo` justo delante de este elemento, en su padre. */
  before(nodo: Elemento) {
    if (this.padre === null) throw new Error(`el entorno no sabe poner nada delante de <${this.tagName}> sin padre`);
    nodo.padre = this.padre;
    this.padre.hijos.splice(this.padre.hijos.indexOf(this), 0, nodo);
  }

  replaceChildren(...nodos: Elemento[]) {
    for (const hijo of this.hijos) hijo.padre = null;
    this.hijos = [];
    this.append(...nodos);
  }

  setAttribute(nombre: string, valor: unknown) {
    this.atributos.set(nombre, String(valor));
  }

  getAttribute(nombre: string) {
    return this.atributos.get(nombre) ?? null;
  }

  addEventListener(tipo: string, oyente: Oyente['oyente'], ajustes?: boolean | { once?: boolean }) {
    this.oyentes.push({ tipo, oyente, unaVez: typeof ajustes === 'object' && ajustes.once === true });
  }

  querySelector(selector: string) {
    const encontrado = this.dentro.get(selector);
    if (encontrado === undefined) throw new Error(`el entorno no sabe buscar «${selector}» dentro de <${this.tagName}>`);
    return encontrado;
  }

  closest(selector: string) {
    if (selector !== 'a') throw new Error(`el entorno no sabe leer «${selector}» en closest`);
    for (let nodo: Elemento | null = this; nodo; nodo = nodo.padre) if (nodo.tagName === 'A') return nodo;
    return null;
  }
}

/** Llama a los oyentes de un tipo, en su orden; los `once`, una vez. */
function despachar(oyentes: Oyente[], tipo: string, evento: Record<string, unknown>) {
  for (const registro of [...oyentes]) {
    if (registro.tipo !== tipo) continue;
    if (registro.unaVez) oyentes.splice(oyentes.indexOf(registro), 1);
    registro.oyente(evento);
  }
}

/**
 * Cómo empieza el único `import(` del guion: el índice, con el `?{n}` del reintento concatenado
 * detrás. Con comillas simples, dobles o la plantilla sin sustituciones con que lo escribe el
 * empaquetado.
 */
const IMPORTACION = /import\(\s*(['"`])\/pagefind\/pagefind\.js\1/u;

/** Un `<select>` de mentira: su valor es el de la opción elegida, y escribirlo elige otra. */
function selector(id: string, primera: string, opciones: OpcionDeSelector[]) {
  const elemento = new Elemento('select');
  elemento.dataset.selector = id;
  const todas = [{ valor: '', rotulo: primera }, ...opciones].map(({ valor, rotulo }) => {
    const opcion = new Elemento('option');
    opcion.value = valor;
    opcion.textContent = rotulo;
    return opcion;
  });
  elemento.append(...todas);
  let elegida = 0;
  Object.defineProperty(elemento, 'options', { get: () => todas });
  Object.defineProperty(elemento, 'selectedIndex', {
    get: () => elegida,
    set: (i: number) => {
      elegida = i;
    },
  });
  Object.defineProperty(elemento, 'value', {
    get: () => todas[elegida]?.value ?? '',
    set: (valor: unknown) => {
      // Como en un `<select>` nativo: un valor que no es de ninguna opción no elige ninguna.
      elegida = todas.findIndex((o) => o.value === String(valor));
    },
  });
  return elemento;
}

/**
 * Historia 27.3 — el `<select>` de Obra: sus opciones son sus hijos, que la isla cambia con
 * `replaceChildren`; su valor es el de la opción elegida, y escribirlo elige otra.
 */
function selectorDinamico(id: string, primera: string) {
  const elemento = new Elemento('select');
  elemento.dataset.selector = id;
  const todas = new Elemento('option');
  todas.value = '';
  todas.textContent = primera;
  elemento.append(todas);
  let elegida = 0;
  Object.defineProperty(elemento, 'options', { get: () => elemento.hijos });
  Object.defineProperty(elemento, 'selectedIndex', {
    get: () => elegida,
    set: (i: number) => {
      elegida = i;
    },
  });
  Object.defineProperty(elemento, 'value', {
    get: () => elemento.hijos[elegida]?.value ?? '',
    set: (valor: unknown) => {
      elegida = elemento.hijos.findIndex((o) => o.value === String(valor));
    },
  });
  const reemplazar = elemento.replaceChildren.bind(elemento);
  elemento.replaceChildren = (...nodos: Elemento[]) => {
    reemplazar(...nodos);
    // Como en el navegador: al cambiar las opciones, la elegida pasa a ser la primera.
    elegida = nodos.length > 0 ? 0 : -1;
  };
  return elemento;
}

export function islaDeBusquedaEnUnSandbox(guion: string, opciones: OpcionesDeLaIsla = {}) {
  /*
   * La sustitución del `import(` se comprueba: un guion con otro especificador, o con más de una
   * importación, dejaría pasar en verde una isla que pide otra cosa.
   */
  const importaciones = guion.split('import(').length - 1;
  if (importaciones !== 1 || !IMPORTACION.test(guion)) {
    throw new Error(`la isla lleva ${importaciones} «import(», y el entorno sabe sustituir exactamente uno: ${IMPORTACION}`);
  }
  const sustituido = guion.replace(IMPORTACION, (_, comilla: string) => `__importar(${comilla}/pagefind/pagefind.js${comilla}`);

  const emitidos: Emitido[] = [];
  const llamadasAlHistorial: unknown[][] = [];
  const violaciones: string[] = [];
  const pedidas: string[] = [];
  const rechazos: unknown[] = [];

  // El reloj fingido, como el de `tests/unit/ayuda/medicion.ts`.
  let ahora = 0;
  let siguiente = 1;
  const temporizadores: { id: number; vence: number; funcion: () => void }[] = [];
  const setTimeout = (funcion: () => void, ms?: number) => {
    const id = siguiente++;
    temporizadores.push({ id, vence: ahora + Math.max(0, Number(ms) || 0), funcion });
    return id;
  };
  const clearTimeout = (id?: number) => {
    const indice = temporizadores.findIndex((t) => t.id === id);
    if (indice >= 0) temporizadores.splice(indice, 1);
  };
  const avanzar = (ms: number) => {
    const hasta = ahora + ms;
    for (;;) {
      const vencidos = temporizadores.filter((t) => t.vence <= hasta).sort((x, y) => x.vence - y.vence || x.id - y.id);
      if (vencidos.length === 0) break;
      const [primero] = vencidos;
      temporizadores.splice(temporizadores.indexOf(primero), 1);
      ahora = primero.vence;
      primero.funcion();
    }
    ahora = hasta;
  };

  // Los elementos de la página.
  const campo = new Elemento('input');
  // `type="search"`: el navegador quita los saltos de línea del valor (su saneado del valor).
  let valorDelCampo = '';
  Object.defineProperty(campo, 'value', {
    get: () => valorDelCampo,
    set: (valor: unknown) => {
      valorDelCampo = String(valor).replace(/[\r\n]/g, '');
    },
  });
  const lista = new Elemento('ul');
  const estado = new Elemento('p');
  const sombra = new Elemento('p');
  // Historia 27.5 — lo que se escribe en la región del recuento y en su sombra, contado.
  const escrituras = { estado: 0, sombra: 0 };
  for (const [elemento, cual] of [
    [estado, 'estado'],
    [sombra, 'sombra'],
  ] as const) {
    let texto = '';
    Object.defineProperty(elemento, 'textContent', {
      get: () => texto,
      set: (valor: unknown) => {
        escrituras[cual]++;
        texto = valor === null || valor === undefined ? '' : String(valor);
      },
    });
  }
  const recuento = new Elemento('div');
  recuento.append(estado);
  const salida = new Elemento('div');
  salida.hidden = true;
  const sugerencia = new Elemento('p');
  sugerencia.textContent = '\n        No encontramos esa frase. Prueba con menos palabras.\n      ';
  salida.dentro.set('.sugerencia', sugerencia);
  const formulario = new Elemento('form');
  // Historia 27.4 — el `action` del formulario es la ruta de la dirección (`rutaDeLaBusqueda()`).
  formulario.setAttribute('action', '/buscar/');
  const autor = selector('autor', 'Todos los autores', opciones.autores ?? AUTORES);
  const obra = selectorDinamico('obra', 'Todas sus obras');
  const tema = selector('tema', 'Todos los temas', opciones.temas ?? TEMAS);
  const quitar = new Elemento('button');
  quitar.hidden = true;
  // Historia 27.3 — cada selector en su caja, como el `.selector` de la plantilla.
  const caja = (dentro: Elemento) => {
    const div = new Elemento('div');
    div.className = 'selector';
    div.append(dentro);
    return div;
  };
  const cajaDeAutor = caja(autor);
  const cajaDeObra = caja(obra);
  const cajaDeTema = caja(tema);
  formulario.append(campo, cajaDeAutor, cajaDeObra, cajaDeTema, quitar);
  // Historia 27.5 — el bloque de «Mostrar 30 más»: el botón, vacío, y su región, vacía.
  const mas = new Elemento('div');
  mas.className = 'mas';
  const boton = new Elemento('button');
  const fallo = new Elemento('p');
  mas.append(boton, fallo);
  // El contenido de la plantilla: lo que la isla saca de su clon, y nada más.
  const clon = new Elemento('#fragmento');
  clon.append(formulario, sombra, mas);
  for (const [selectorDeCss, elemento] of [
    ['form', formulario],
    ['[data-consulta]', campo],
    ['[data-selector-de-autor]', autor],
    ['[data-selector-de-obra]', obra],
    ['[data-selector-de-tema]', tema],
    ['[data-quitar]', quitar],
    ['.sombra', sombra],
    ['[data-mas]', mas],
    ['[data-mostrar-mas]', boton],
    ['[data-fallo-de-la-tanda]', fallo],
  ] as const) {
    clon.dentro.set(selectorDeCss, elemento);
  }
  let clonada = false;
  const plantilla = new Elemento('template');
  Object.defineProperty(plantilla, 'content', {
    get: () => ({
      cloneNode: () => {
        if (clonada) throw new Error('la isla clona la plantilla dos veces');
        clonada = true;
        return clon;
      },
    }),
  });
  const raiz = new Elemento('div');
  raiz.append(plantilla);
  raiz.dentro.set('template', plantilla);
  // Historia 27.5 — la columna de la página, en el orden de `buscar.astro`.
  const columna = new Elemento('div');
  columna.esDocumento = true;
  columna.append(raiz, recuento, lista, salida);
  const porSelector = new Map<string, Elemento>([
    ['[data-busqueda]', raiz],
    ['[data-resultados]', lista],
    ['[data-estado]', estado],
    ['[data-salida]', salida],
  ]);
  let enfocado: Elemento | null = null;
  campo.focus = () => {
    enfocado = campo;
  };
  boton.focus = () => {
    enfocado = boton;
  };

  const delDocumento: Oyente[] = [];
  const deLaVentana: Oyente[] = [];
  const documento = {
    visibilityState: opciones.oculta ? 'hidden' : 'visible',
    /** `document.hidden`, que el navegador deriva de `visibilityState`. */
    get hidden() {
      return this.visibilityState === 'hidden';
    },
    querySelector: (selector: string) => {
      const elemento = porSelector.get(selector);
      if (elemento === undefined) throw new Error(`el entorno no sabe buscar «${selector}» en el documento`);
      return elemento;
    },
    createElement: (etiqueta: string) => {
      const elemento = new Elemento(etiqueta);
      // Historia 27.5 — el enlace de un resultado recibe el foco de una tanda nueva.
      if (elemento.tagName === 'A') {
        elemento.focus = () => {
          enfocado = elemento;
        };
      }
      return elemento;
    },
    addEventListener: (tipo: string, oyente: Oyente['oyente'], ajustes?: boolean | { once?: boolean }) =>
      delDocumento.push({ tipo, oyente, unaVez: typeof ajustes === 'object' && ajustes.once === true }),
  };

  // Historia 27.4 — el historial, con sus entradas; la dirección es la de la entrada actual.
  const ORIGEN = 'https://ejemplo.invalid';
  const entradas: { estado: unknown; direccion: URL }[] = [
    {
      estado: opciones.estado === undefined ? null : opciones.estado,
      direccion: new URL(`/buscar/${opciones.busqueda ?? ''}`, ORIGEN),
    },
  ];
  let actual = 0;
  const entrada = () => entradas[actual];
  const ubicacion: Record<string, unknown> = {};
  for (const parte of ['origin', 'pathname', 'search', 'hash', 'href'] as const) {
    Object.defineProperty(ubicacion, parte, {
      get: () => entrada().direccion[parte],
      set: () => void violaciones.push(`escribe location.${parte}`),
      enumerable: true,
    });
  }
  ubicacion.assign = () => void violaciones.push('location.assign');
  ubicacion.replace = () => void violaciones.push('location.replace');

  const lanza = opciones.historialQueLanza;
  const quedanPorLanzar = {
    pushState: lanza === true ? Infinity : typeof lanza === 'object' ? Number(lanza.pushState === true ? Infinity : (lanza.pushState ?? 0)) : 0,
    replaceState: lanza === true ? Infinity : typeof lanza === 'object' ? Number(lanza.replaceState === true ? Infinity : (lanza.replaceState ?? 0)) : 0,
  };
  /** La dirección que escribe una llamada, resuelta contra la actual; otra ruta u otro origen, violación. */
  const resolver = (metodo: string, argumentos: unknown[]): URL | null => {
    if (argumentos.length < 3 || argumentos[2] === undefined || argumentos[2] === null) return null;
    const nueva = new URL(String(argumentos[2]), entrada().direccion);
    if (nueva.origin !== ORIGEN || nueva.pathname !== '/buscar/') violaciones.push(`${metodo} a otra ruta: ${nueva.href}`);
    return nueva;
  };
  const historia = {
    get state() {
      return entrada().estado;
    },
    get length() {
      return entradas.length;
    },
    replaceState(...argumentos: unknown[]) {
      llamadasAlHistorial.push(['replaceState', ...argumentos]);
      const nueva = resolver('replaceState', argumentos);
      if (quedanPorLanzar.replaceState > 0) {
        quedanPorLanzar.replaceState--;
        throw new Error('el historial no se deja escribir');
      }
      entradas[actual] = { estado: argumentos[0], direccion: nueva ?? entrada().direccion };
    },
    pushState(...argumentos: unknown[]) {
      llamadasAlHistorial.push(['pushState', ...argumentos]);
      const nueva = resolver('pushState', argumentos);
      if (nueva === null) violaciones.push(`pushState sin dirección (${argumentos.length} argumentos)`);
      if (quedanPorLanzar.pushState > 0) {
        quedanPorLanzar.pushState--;
        throw new Error('el historial no se deja escribir');
      }
      entradas.splice(actual + 1);
      entradas.push({ estado: argumentos[0], direccion: nueva ?? entrada().direccion });
      actual = entradas.length - 1;
    },
  };
  /**
   * Cambia de entrada, como «atrás» o «adelante» sin la caché, y despacha `popstate` con su objeto
   * y, si cambia el fragmento, `hashchange` después, como el navegador.
   */
  const irA = (paso: number) => {
    const destino = actual + paso;
    if (destino < 0 || destino >= entradas.length) throw new Error(`no hay entrada ${destino} en el historial`);
    const ancla = entrada().direccion.hash;
    actual = destino;
    despachar(deLaVentana, 'popstate', { type: 'popstate', state: entrada().estado });
    if (entrada().direccion.hash !== ancla) despachar(deLaVentana, 'hashchange', { type: 'hashchange' });
  };

  // `now()` da el reloj fingido: la pausa del recuento de lo tecleado cuenta desde la última tecla.
  const rendimiento: Record<string, unknown> = { now: () => ahora };
  let consultasDeNavegacion = 0;
  if (!opciones.sinNavigationTiming) {
    rendimiento.getEntriesByType = (tipo: string) => {
      consultasDeNavegacion++;
      return tipo !== 'navigation' || opciones.navegacion === null ? [] : [{ type: opciones.navegacion ?? 'navigate' }];
    };
  }

  // El índice de mentira. Dónde falla se puede cambiar a mitad de prueba, con `fallar`.
  let falla = opciones.falla;
  // Historia 27.5 — los `data()` de la segunda tanda en adelante que esperan a `responderALaTanda()`.
  const tandaEsperando: (() => void)[] = [];
  // Historia 27.3 — `filters()` y el mapa de rótulos, configurables a mitad de prueba.
  let fallanLosFiltros: boolean | 'sin-obra' = opciones.fallanLosFiltros ?? false;
  let recuentosDeObra: Record<string, number> = opciones.recuentosDeObra ?? {};
  const filtrosEsperando: (() => void)[] = [];
  let fallaElMapa = opciones.fallaElMapa;
  let mapa: unknown = opciones.mapa ?? {};
  const pedidosDelMapa: string[] = [];
  const mapaEsperando: (() => void)[] = [];
  const pedirElMapa = (direccion: unknown) => {
    if (direccion !== '/buscar/obras.json') throw new Error(`el entorno no sabe pedir «${String(direccion)}» con fetch`);
    pedidosDelMapa.push(direccion);
    const responder = () => {
      if (fallaElMapa === 'red') return Promise.reject(new TypeError('Failed to fetch'));
      const ok = fallaElMapa !== 'estado';
      const copia = JSON.parse(JSON.stringify(mapa)) as unknown;
      return Promise.resolve({
        ok,
        status: ok ? 200 : 404,
        json: () => (fallaElMapa === 'json' ? Promise.reject(new SyntaxError('Unexpected token')) : Promise.resolve(copia)),
      });
    };
    if (!opciones.mapaManual) return responder();
    return new Promise((resolver, rechazar) => mapaEsperando.push(() => responder().then(resolver, rechazar)));
  };
  let destrucciones = 0;
  /** Cada llamada al módulo, en orden: `['options', o]`, `['init']`, `['search', consulta]`, `['destroy']`. */
  const llamadasAlIndice: unknown[][] = [];
  const esperando: { consulta: string | null; resolver: () => void }[] = [];
  const responderA = (consulta: string | null, ajustes?: OpcionesDeSearch) => {
    const { total, pintados = total, datos }: Respuesta = (opciones.respuestas ?? (() => ({ total: 0 })))(consulta, ajustes);
    const todos = Array.from({ length: total }, (_, i) => ({
      data: async () => {
        // Historia 27.5 — los de la tanda siguiente esperan, si se pide, y luego pueden fallar.
        if (opciones.tandaManual && i >= TANDA_DE_RESULTADOS) await new Promise<void>((r) => tandaEsperando.push(r));
        // Un fragmento que no llega: el índice y la búsqueda corrieron, los datos de un resultado no.
        if (falla === 'data' && i === 0) throw new Error('los datos de un resultado no llegan');
        if (falla === 'tanda' && i >= TANDA_DE_RESULTADOS) throw new Error('los datos de la tanda no llegan');
        if (datos) return datos(i);
        return {
          url: `/cita/${encodeURIComponent(String(consulta))}-${i}.html`,
          meta: { title: `${consulta} ${i}` },
          filters: { tipo: ['cita'] },
        };
      },
    }));
    // El total es el largo; lo que se pinta sale de `slice`, que puede dar menos.
    const results = Object.assign([...todos], {
      slice: (desde?: number, hasta?: number) => todos.slice(0, pintados).slice(desde, hasta),
    });
    return { results };
  };
  const modulo = {
    options: async (o: unknown) => {
      llamadasAlIndice.push(['options', o]);
    },
    init: async () => {
      llamadasAlIndice.push(['init']);
      if (falla === 'init') throw new Error('el índice no se deja iniciar');
    },
    search: (consulta: string | null, ajustes?: OpcionesDeSearch) => {
      llamadasAlIndice.push(ajustes === undefined ? ['search', consulta] : ['search', consulta, ajustes]);
      if (falla === 'search') throw new Error('la búsqueda falla');
      if (!opciones.manual) return Promise.resolve(responderA(consulta, ajustes));
      return new Promise((resolver) => esperando.push({ consulta, resolver: () => resolver(responderA(consulta, ajustes)) }));
    },
    destroy: async () => {
      llamadasAlIndice.push(['destroy']);
      destrucciones++;
    },
    filters: () => {
      llamadasAlIndice.push(['filters']);
      const responder = () =>
        fallanLosFiltros === 'sin-obra'
          ? Promise.resolve({ autor: { 'jose-marti': 222 } })
          : fallanLosFiltros
            ? Promise.reject(new Error('los filtros no llegan'))
            : Promise.resolve({ obra: { ...recuentosDeObra } });
      if (!opciones.filtrosManuales) return responder();
      return new Promise((resolver, rechazar) => filtrosEsperando.push(() => responder().then(resolver, rechazar)));
    },
  };
  const importar = (especificador: string) => {
    pedidas.push(especificador);
    return falla === 'importacion' ? Promise.reject(new Error('el índice no carga')) : Promise.resolve(modulo);
  };

  const alRechazar = (motivo: unknown) => void rechazos.push(motivo);
  process.on('unhandledRejection', alRechazar);

  const ventana: Record<string, unknown> = {
    document: documento,
    location: ubicacion,
    history: historia,
    performance: rendimiento,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (funcion: () => void) => setTimeout(funcion, 16),
    addEventListener: (tipo: string, oyente: Oyente['oyente'], ajustes?: boolean | { once?: boolean }) =>
      deLaVentana.push({ tipo, oyente, unaVez: typeof ajustes === 'object' && ajustes.once === true }),
    __medir: (...argumentos: unknown[]) => void emitidos.push(argumentos),
    __importar: importar,
    fetch: pedirElMapa,
    /** `new Option(texto, valor)`, como en el navegador. */
    Option: class extends Elemento {
      constructor(texto = '', valor = '') {
        super('option');
        this.textContent = String(texto);
        this.value = String(valor);
      }
    },
    Event,
    dispatchEvent: () => true,
  };
  ventana.window = ventana;
  createContext(ventana);
  try {
    runInContext(sustituido, ventana);
  } catch (error) {
    // Sin entorno que devolver, nadie llamaría a `cerrar`: se deja de escuchar aquí.
    process.off('unhandledRejection', alRechazar);
    throw error;
  }
  const alAnalizarse = {
    emitidos: emitidos.map((e) => [...e]),
    historial: llamadasAlHistorial.map((l) => [...l]),
    violaciones: [...violaciones],
  };

  /** Deja correr las promesas pendientes —las de la isla y las del índice— hasta que no queda ninguna. */
  const vaciar = async () => {
    for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
  };

  /** Un evento con lo que la isla y el navegador le miran; `preventDefault` y `stopPropagation` se apuntan. */
  const evento = (tipo: string, extra: Record<string, unknown> = {}) => {
    const datos: Record<string, unknown> = {
      type: tipo,
      defaultPrevented: false,
      preventDefault() {
        datos.defaultPrevented = true;
      },
      stopPropagation() {
        violaciones.push(`stopPropagation en ${tipo}`);
      },
      stopImmediatePropagation() {
        violaciones.push(`stopImmediatePropagation en ${tipo}`);
      },
      ...extra,
    };
    return datos;
  };

  const cambiarVisibilidad = (valor: 'visible' | 'hidden') => {
    documento.visibilityState = valor;
    despachar(delDocumento, 'visibilitychange', evento('visibilitychange'));
  };

  return {
    /** Lo que la isla hizo al evaluarse, antes de ninguna escucha ni promesa. */
    analizado: () => alAnalizarse,
    /** Las llamadas a `__medir`, en su orden, con sus argumentos. */
    emitidos: () => emitidos.map((e) => [...e]),
    /**
     * Las llamadas al historial, en su orden: `['pushState' | 'replaceState', ...argumentos]`, con
     * los argumentos tal como llegaron (también las que lanzaron).
     */
    historial: () => llamadasAlHistorial.map((l) => [...l]),
    /** Las marcas de la 23.8: las llamadas a `replaceState` sin dirección, con sus dos argumentos. */
    marcas: () => llamadasAlHistorial.filter((l) => l[0] === 'replaceState' && l.length === 3).map((l) => l.slice(1)),
    /**
     * Historia 27.4 — las escrituras de dirección, en orden: el método, la dirección tal como llegó
     * y el objeto de estado (también las que lanzaron).
     */
    direcciones: () =>
      llamadasAlHistorial
        .filter((l) => l.length > 3)
        .map((l) => ({ metodo: l[0] as string, direccion: l[3] as string, estado: l[1] })),
    /** `history.state` ahora. */
    estadoDelHistorial: () => entrada().estado,
    /** La dirección de la entrada actual: ruta, consulta y fragmento. */
    direccion: () => entrada().direccion.pathname + entrada().direccion.search + entrada().direccion.hash,
    /** Cuántas veces la isla leyó Navigation Timing (`performance.getEntriesByType`). */
    consultasDeNavegacion: () => consultasDeNavegacion,
    /** `history.length`. */
    longitud: () => entradas.length,
    /** Qué entrada es la actual (desde 0). */
    posicion: () => actual,
    /** «Atrás»: la entrada anterior, con `popstate`, y deja correr las promesas. */
    atras: async () => {
      irA(-1);
      await vaciar();
    },
    /** «Adelante»: la entrada siguiente, con `popstate`, y deja correr las promesas. */
    adelante: async () => {
      irA(1);
      await vaciar();
    },
    /**
     * Un salto de ancla —el enlace «Saltar al contenido»—, como lo hace el navegador: una entrada
     * nueva con la misma dirección y otro fragmento, sin objeto, y `popstate` y `hashchange`. Con
     * `soloHashchange`, sin `popstate`, como el navegador que no lo despacha al saltar.
     */
    saltarAlAncla: async (ancla: string, { soloHashchange = false } = {}) => {
      const direccion = new URL(entrada().direccion);
      direccion.hash = ancla;
      entradas.splice(actual + 1);
      entradas.push({ estado: null, direccion });
      actual = entradas.length - 1;
      if (!soloHashchange) despachar(deLaVentana, 'popstate', { type: 'popstate', state: null });
      despachar(deLaVentana, 'hashchange', { type: 'hashchange' });
      await vaciar();
    },
    /** La entrada actual: su objeto y su dirección, por posición (desde 0). */
    entrada: (posicion = actual) => ({
      estado: entradas[posicion]?.estado,
      direccion: entradas[posicion] ? entradas[posicion].direccion.pathname + entradas[posicion].direccion.search + entradas[posicion].direccion.hash : undefined,
    }),
    /** Lo que la isla no debe hacer nunca: abrir entradas, escribir la dirección, parar la propagación. */
    violaciones: () => [...violaciones],
    /** Las promesas rechazadas sin manejar desde que se abrió el entorno. */
    rechazos: () => [...rechazos],
    /** Lo que la isla pidió importar, con el `?{n}` de cada reintento. */
    importaciones: () => [...pedidas],
    /** Cuántas veces la isla destruyó el índice. */
    destrucciones: () => destrucciones,
    /** Las llamadas al módulo de Pagefind, en orden, con sus argumentos (las opciones, copiadas en JSON). */
    llamadas: () => llamadasAlIndice.map((l) => JSON.parse(JSON.stringify(l)) as unknown[]),
    /**
     * Los resultados pintados, uno por fila: el tipo del rótulo (`data-tipo`), el rótulo, el título,
     * las clases del título, la línea de Autor (si la hay) y el `aria-label` del enlace (o `null`).
     */
    resultados: () =>
      lista.hijos.map((li) => {
        const a = li.hijos[0];
        const [clase, titulo, linea] = a.hijos;
        return {
          tipo: clase.dataset.tipo,
          rotulo: clase.textContent,
          titulo: titulo.textContent,
          clases: [titulo.className, ...titulo.clases].join(' ').split(/\s+/).filter(Boolean),
          autor: linea ? linea.textContent : undefined,
          nombre: a.getAttribute('aria-label'),
        };
      }),
    /** Los resultados pintados: su título, en orden. */
    pintados: () => lista.hijos.map((li) => li.hijos[0].hijos.map((span) => span.textContent).join(' · ')),
    /** El valor del campo. */
    valor: () => campo.value,
    /** Lo que dice la región del recuento ahora, y si está apartada de la vista. */
    region: () => ({ texto: estado.textContent, apartada: estado.clases.has('solo-para-lectores') }),
    /** La sombra del recuento: la frase que la región escribirá tras la pausa. */
    sombra: () => sombra.textContent,
    /** Si la salida sin resultados está a la vista. */
    salidaVisible: () => !salida.hidden,
    /** Si «Quitar los filtros» está a la vista. */
    quitarVisible: () => !quitar.hidden,
    /**
     * Qué tiene el foco, de lo que la isla puede enfocar: `campo`, `mas` (el botón), `resultado:{i}`
     * (el enlace de la fila `i`, desde 0) o nada. Lo que salió del documento ya no lo tiene.
     */
    foco: () => {
      if (enfocado === null || !enfocado.isConnected) return null;
      if (enfocado === campo) return 'campo';
      if (enfocado === boton) return 'mas';
      const fila = lista.hijos.findIndex((li) => li.hijos[0] === enfocado);
      return fila >= 0 ? `resultado:${fila}` : null;
    },
    /**
     * Historia 27.5 — el bloque de «Mostrar 30 más»: si está en el documento, si va justo detrás de
     * la lista (su hermano siguiente), el rótulo del botón y lo que dice su región.
     */
    mas: () => ({
      enElDom: mas.isConnected,
      detrasDeLaLista: mas.padre !== null && mas.padre === lista.padre && mas.padre.hijos.indexOf(mas) === mas.padre.hijos.indexOf(lista) + 1,
      rotulo: boton.textContent,
      fallo: fallo.textContent,
    }),
    /** Historia 27.5 — cuántas veces se escribió la región del recuento y su sombra desde que se abrió el entorno. */
    escrituras: () => ({ ...escrituras }),
    /**
     * Historia 27.5 — pulsa «Mostrar 30 más»: el botón recibe el foco y da `click`, sin dejar correr
     * las promesas. Lanza si el bloque no está en el documento.
     */
    pulsarMas: () => {
      if (!mas.isConnected) throw new Error('«Mostrar 30 más» no está en el documento');
      enfocado = boton;
      const clic = evento('click', { target: boton, button: 0 });
      for (let nodo: Elemento | null = boton; nodo; nodo = nodo.padre) despachar(nodo.oyentes, 'click', clic);
      despachar(delDocumento, 'click', clic);
      despachar(deLaVentana, 'click', clic);
    },
    /**
     * Historia 27.5 — suelta los `data()` de la tanda que esperan (con `tandaManual`), deja correr
     * las promesas y devuelve cuántos soltó: un lote de una tanda son `TANDA_DE_RESULTADOS` o menos.
     * Con `cuantos`, solo los `cuantos` primeros en esperar: el lote de la tanda más vieja.
     */
    responderALaTanda: async (cuantos?: number) => {
      await vaciar();
      if (tandaEsperando.length === 0) throw new Error('no hay ninguna tanda esperando');
      const soltados = tandaEsperando.splice(0, cuantos ?? tandaEsperando.length);
      soltados.forEach((r) => r());
      await vaciar();
      return soltados.length;
    },
    /** El valor elegido en cada selector. */
    elegidos: () => ({ autor: autor.value, tema: tema.value }),
    /**
     * Historia 27.3 — el selector de Obra: si está en el formulario, el orden de las cajas del
     * formulario (`campo`, `autor`, `obra`, `tema`, `quitar`), sus opciones (valor y rótulo) y el
     * valor elegido.
     */
    obra: () => ({
      enElDom: cajaDeObra.padre === formulario,
      orden: formulario.hijos.map((h) =>
        h === campo ? 'campo' : h === cajaDeAutor ? 'autor' : h === cajaDeObra ? 'obra' : h === cajaDeTema ? 'tema' : h === quitar ? 'quitar' : h.tagName.toLowerCase(),
      ),
      opciones: obra.hijos.map((o) => ({ valor: o.value, rotulo: o.textContent })),
      valor: obra.value,
    }),
    /** Las peticiones del mapa de rótulos, en orden. */
    pedidosDelMapa: () => [...pedidosDelMapa],
    /** Resuelve la primera petición del mapa que espera (con `mapaManual`) y deja correr las promesas. */
    responderAlMapa: async () => {
      await vaciar();
      const siguiente = mapaEsperando.shift();
      if (!siguiente) throw new Error('no hay ninguna petición del mapa esperando');
      siguiente();
      await vaciar();
    },
    /** Resuelve el primer `filters()` que espera (con `filtrosManuales`) y deja correr las promesas. */
    responderAFiltros: async () => {
      await vaciar();
      const siguiente = filtrosEsperando.shift();
      if (!siguiente) throw new Error('no hay ningún filters() esperando');
      siguiente();
      await vaciar();
    },
    /** Desde ahora el mapa falla así (o deja de fallar, sin argumento), y da este mapa. */
    fallarElMapa: (como?: OpcionesDeLaIsla['fallaElMapa']) => {
      fallaElMapa = como;
    },
    /** Desde ahora `filters()` rechaza —o responde sin `obra`— (o deja de hacerlo). */
    fallarLosFiltros: (si: boolean | 'sin-obra' = true) => {
      fallanLosFiltros = si;
    },
    /** Cambia lo que darán el mapa y `filters()` a partir de ahora: otro despliegue. */
    cambiarDatosDeObra: (nuevo: { mapa?: unknown; recuentosDeObra?: Record<string, number> }) => {
      if (nuevo.mapa !== undefined) mapa = nuevo.mapa;
      if (nuevo.recuentosDeObra !== undefined) recuentosDeObra = nuevo.recuentosDeObra;
    },
    /** Lo que la isla insertó: los hijos de la raíz y del contenedor del recuento, por etiqueta. */
    insertado: () => ({
      raiz: raiz.hijos.map((h) => h.tagName.toLowerCase()),
      recuento: recuento.hijos.map((h) => (h === sombra ? 'sombra' : h === estado ? 'estado' : h.tagName.toLowerCase())),
    }),
    /**
     * Elige en un selector —como el visitante, que da `input` y `change`— sin dejar pasar el tiempo.
     * `''` es «Todos…».
     */
    elegir: (cual: 'autor' | 'obra' | 'tema', valor: string) => {
      if (cual === 'obra' && cajaDeObra.padre !== formulario) throw new Error('el selector de Obra no está en el DOM');
      const elemento = cual === 'autor' ? autor : cual === 'obra' ? obra : tema;
      elemento.value = valor;
      if ((elemento as unknown as { selectedIndex: number }).selectedIndex < 0) {
        throw new Error(`el selector de ${cual} no tiene la opción «${valor}»`);
      }
      despachar(elemento.oyentes, 'input', evento('input'));
      despachar(elemento.oyentes, 'change', evento('change'));
    },
    /** Pulsa «Quitar los filtros». */
    quitarFiltros: () => despachar(quitar.oyentes, 'click', evento('click', { target: quitar })),
    /** Avanza el reloj `ms` milisegundos. */
    avanzar,
    /** Deja correr las promesas pendientes. */
    vaciar,
    /** Escribe en el campo y despacha `input`, sin dejar pasar el tiempo. */
    escribir: (texto: string) => {
      campo.value = texto;
      despachar(campo.oyentes, 'input', evento('input'));
    },
    /** Escribe, deja pasar la pausa del tecleo y las promesas: la búsqueda corre y se pinta. */
    teclear: async (texto: string) => {
      campo.value = texto;
      despachar(campo.oyentes, 'input', evento('input'));
      avanzar(150);
      await vaciar();
    },
    /** El campo recibe el foco. */
    enfocar: () => {
      enfocado = campo;
      despachar(campo.oyentes, 'focus', evento('focus'));
    },
    /** Envía el formulario (Enter en el campo) y deja correr las promesas. Devuelve el evento. */
    enviar: async () => {
      const envio = evento('submit');
      despachar(formulario.oyentes, 'submit', envio);
      await vaciar();
      return envio;
    },
    /**
     * Pulsa el resultado `indice` —en un `<span>` dentro de su `<a>`—, con el gesto que se diga. El
     * clic sube del `<span>` al `<a>`, al `<li>`, a la lista, al documento y a la ventana, como en el
     * navegador. Devuelve el evento y cuántas llamadas a `__medir` había cuando llegó a la ventana,
     * que es donde escucha el fichero de medición. Con `tipo` `auxclick` es el botón central o el
     * secundario, que en el navegador **no** dan `click`. Con `en` `fila` o `lista`, el clic cae en
     * el `<li>` o en la propia lista, fuera de todo enlace.
     */
    pulsarResultado: (
      indice = 0,
      gesto: Record<string, unknown> = {},
      tipo: 'click' | 'auxclick' = 'click',
      en: 'enlace' | 'fila' | 'lista' = 'enlace',
    ) => {
      const li = lista.hijos[indice];
      if (!li) throw new Error(`no hay resultado ${indice} que pulsar`);
      const objetivo = en === 'lista' ? lista : en === 'fila' ? li : li.hijos[0].hijos[0];
      const clic = evento(tipo, { target: objetivo, button: tipo === 'click' ? 0 : 1, ...gesto });
      for (let nodo: Elemento | null = objetivo; nodo; nodo = nodo.padre) despachar(nodo.oyentes, tipo, clic);
      despachar(delDocumento, tipo, clic);
      const alLlegarALaVentana = emitidos.length;
      despachar(deLaVentana, tipo, clic);
      return { clic, alLlegarALaVentana };
    },
    /** La página se oculta: `visibilitychange` a `hidden`. */
    ocultar: () => cambiarVisibilidad('hidden'),
    /** La página vuelve a verse. */
    mostrar: () => cambiarVisibilidad('visible'),
    /** `pagehide`, sin `visibilitychange`. */
    pagehide: (persisted = false) => despachar(deLaVentana, 'pagehide', evento('pagehide', { persisted })),
    /** La caché de atrás y adelante devuelve la página: `pageshow` con `persisted` y visible otra vez. */
    restaurar: () => {
      despachar(deLaVentana, 'pageshow', evento('pageshow', { persisted: true }));
      cambiarVisibilidad('visible');
    },
    /** Deja correr las promesas, resuelve la primera búsqueda pendiente de esa consulta (con `manual`) y las deja correr otra vez. */
    responder: async (consulta: string | null) => {
      // La búsqueda llega al índice después de cargarlo e iniciarlo: unas cuantas promesas más allá.
      await vaciar();
      const indice = esperando.findIndex((e) => e.consulta === consulta);
      if (indice < 0) throw new Error(`no hay ninguna búsqueda de «${consulta}» esperando respuesta`);
      const [pendiente] = esperando.splice(indice, 1);
      pendiente.resolver();
      await vaciar();
    },
    /** Las escuchas puestas, por dónde: la ventana, el documento, el campo, la lista, el formulario, los selectores y el botón. */
    escuchas: () => ({
      ventana: deLaVentana.map((o) => o.tipo),
      documento: delDocumento.map((o) => o.tipo),
      campo: campo.oyentes.map((o) => o.tipo),
      lista: lista.oyentes.map((o) => o.tipo),
      formulario: formulario.oyentes.map((o) => o.tipo),
      autor: autor.oyentes.map((o) => o.tipo),
      obra: obra.oyentes.map((o) => o.tipo),
      tema: tema.oyentes.map((o) => o.tipo),
      quitar: quitar.oyentes.map((o) => o.tipo),
      mas: boton.oyentes.map((o) => o.tipo),
    }),
    /** Desde ahora el índice falla ahí (o deja de fallar, sin argumento). */
    fallar: (donde?: OpcionesDeLaIsla['falla']) => {
      falla = donde;
    },
    /** Deja de escuchar los rechazos sin manejar. */
    cerrar: async () => {
      await vaciar();
      process.off('unhandledRejection', alRechazar);
    },
  };
}
