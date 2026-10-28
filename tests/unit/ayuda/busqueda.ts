import { createContext, runInContext } from 'node:vm';

/**
 * La isla de `/buscar/`, ejecutada — Historia 23.8.
 *
 * Es el «ejecutándola» que pedía la prueba de la 23.6: la isla es un guion clásico en línea, corre
 * antes que el fichero de medición diferido, y desde la 23.8 escribe en el historial. Lo que hay
 * que probar es lo que **hace** —qué pide a `__medir`, cuándo y qué escribe en `history`—, y eso
 * solo se ve ejecutando el guion de verdad, el que sale en `dist/`, no leyendo su texto.
 *
 * El entorno es un global de verdad (`node:vm`), como el de `tests/unit/ayuda/medicion.ts`: la isla
 * llama `__medir`, `history` y `location` a secas. Lleva lo que la isla pide y nada más:
 *
 *   · los cinco elementos que busca —campo, lista, estado, salida (con su `.sugerencia`) y
 *     formulario—; cualquier otro selector **lanza**, para que una isla que empiece a pedir otra
 *     cosa no pase en verde contra un entorno que no la sabe. El campo es de búsqueda, y como en
 *     el navegador quita los saltos de línea de lo que se le escribe;
 *   · `document.createElement` con lo que usa para pintar un resultado;
 *   · un reloj fingido —`setTimeout`, `clearTimeout`, `requestAnimationFrame`— que solo avanza con
 *     `avanzar(ms)`;
 *   · `location` de solo lectura —escribir en ella o llamar a `assign`/`replace` se apunta como
 *     violación—, `history` con su `state` inicial, un `replaceState` que apunta cada llamada con
 *     sus argumentos tal como llegaron (y puede lanzar) —con argumento de dirección, además, es una
 *     violación: la marca no toca la dirección— y un `pushState` que es una violación;
 *   · Navigation Timing configurable: el tipo de la entrada, ninguna entrada o sin la API;
 *   · la visibilidad del documento —visible al cargar, u oculta, como una pestaña de fondo—,
 *     `pagehide` y `pageshow`;
 *   · `__medir` espía;
 *   · un Pagefind de mentira en lugar del único `import(` del guion —la sustitución se comprueba:
 *     si el guion no lleva exactamente uno, o no empieza pidiendo `/pagefind/pagefind.js`, el
 *     entorno lanza; lo que pide de verdad, con el `?{n}` de su reintento, se apunta—, con el total
 *     y lo que da `slice` configurables por consulta, respuestas que esperan a
 *     `responder(consulta)` si se pide, rechazo en la importación, en `init`, en `search` o en los
 *     datos de un resultado, y un `destroy` que se cuenta. Desde la Historia 26.2 el módulo lleva
 *     también `options`, y `llamadas()` da en orden cada llamada al módulo (`options` con su
 *     argumento, `init`, `search` con su consulta y `destroy`).
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
  /** Si `history.replaceState` lanza, como un historial que no se deja escribir. */
  historialQueLanza?: boolean;
  /** Dónde falla el índice: la importación, `init`, `search` (que lanza) o los datos del primer resultado. */
  falla?: 'importacion' | 'init' | 'search' | 'data';
  /** Lo que responde el índice a cada consulta. Por omisión, nada: total 0. */
  respuestas?: (consulta: string) => Respuesta;
  /** Si las respuestas de `search` esperan a `responder(consulta)`. */
  manual?: boolean;
  /** Si la página carga oculta —una pestaña de fondo—, sin haberse visto. */
  oculta?: boolean;
}

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

  append(...nodos: Elemento[]) {
    for (const nodo of nodos) {
      nodo.padre = this;
      this.hijos.push(nodo);
    }
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

/** Cómo empieza el único `import(` del guion: el índice, con el `?{n}` del reintento concatenado detrás. */
const IMPORTACION = "import('/pagefind/pagefind.js'";

export function islaDeBusquedaEnUnSandbox(guion: string, opciones: OpcionesDeLaIsla = {}) {
  /*
   * La sustitución del `import(` se comprueba: un guion con otro especificador, o con más de una
   * importación, dejaría pasar en verde una isla que pide otra cosa.
   */
  const importaciones = guion.split('import(').length - 1;
  if (importaciones !== 1 || !guion.includes(IMPORTACION)) {
    throw new Error(`la isla lleva ${importaciones} «import(», y el entorno sabe sustituir exactamente uno: ${IMPORTACION}`);
  }
  const sustituido = guion.replace(IMPORTACION, "__importar('/pagefind/pagefind.js'");

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
  const salida = new Elemento('div');
  salida.hidden = true;
  const sugerencia = new Elemento('p');
  sugerencia.textContent = '\n        No encontramos esa frase. Prueba con menos palabras.\n      ';
  salida.dentro.set('.sugerencia', sugerencia);
  const formulario = new Elemento('form');
  const porSelector = new Map<string, Elemento>([
    ['[data-consulta]', campo],
    ['[data-resultados]', lista],
    ['[data-estado]', estado],
    ['[data-salida]', salida],
    ['.formulario', formulario],
  ]);

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
    createElement: (etiqueta: string) => new Elemento(etiqueta),
    addEventListener: (tipo: string, oyente: Oyente['oyente'], ajustes?: boolean | { once?: boolean }) =>
      delDocumento.push({ tipo, oyente, unaVez: typeof ajustes === 'object' && ajustes.once === true }),
  };

  // La dirección, de solo lectura: escribir en ella es una violación.
  const busqueda = opciones.busqueda ?? '';
  const ubicacion: Record<string, unknown> = {};
  for (const [parte, valor] of Object.entries({
    origin: 'https://ejemplo.invalid',
    pathname: '/buscar/',
    search: busqueda,
    hash: '',
    href: `https://ejemplo.invalid/buscar/${busqueda}`,
  })) {
    Object.defineProperty(ubicacion, parte, {
      get: () => valor,
      set: () => void violaciones.push(`escribe location.${parte}`),
      enumerable: true,
    });
  }
  ubicacion.assign = () => void violaciones.push('location.assign');
  ubicacion.replace = () => void violaciones.push('location.replace');

  let estadoDelHistorial: unknown = opciones.estado === undefined ? null : opciones.estado;
  const historia = {
    get state() {
      return estadoDelHistorial;
    },
    replaceState(...argumentos: unknown[]) {
      llamadasAlHistorial.push(argumentos);
      if (argumentos.length > 2) violaciones.push(`replaceState con dirección: ${String(argumentos[2])}`);
      if (opciones.historialQueLanza) throw new Error('el historial no se deja escribir');
      estadoDelHistorial = argumentos[0];
    },
    pushState(...argumentos: unknown[]) {
      violaciones.push(`pushState(${argumentos.length} argumentos)`);
      throw new Error('la isla no abre entradas en el historial');
    },
  };

  const rendimiento: Record<string, unknown> = {};
  if (!opciones.sinNavigationTiming) {
    rendimiento.getEntriesByType = (tipo: string) =>
      tipo !== 'navigation' || opciones.navegacion === null ? [] : [{ type: opciones.navegacion ?? 'navigate' }];
  }

  // El índice de mentira. Dónde falla se puede cambiar a mitad de prueba, con `fallar`.
  let falla = opciones.falla;
  let destrucciones = 0;
  /** Cada llamada al módulo, en orden: `['options', o]`, `['init']`, `['search', consulta]`, `['destroy']`. */
  const llamadasAlIndice: unknown[][] = [];
  const esperando: { consulta: string; resolver: () => void }[] = [];
  const responderA = (consulta: string) => {
    const { total, pintados = total, datos }: Respuesta = (opciones.respuestas ?? (() => ({ total: 0 })))(consulta);
    const todos = Array.from({ length: total }, (_, i) => ({
      data: async () => {
        // Un fragmento que no llega: el índice y la búsqueda corrieron, los datos de un resultado no.
        if (falla === 'data' && i === 0) throw new Error('los datos de un resultado no llegan');
        if (datos) return datos(i);
        return {
          url: `/cita/${encodeURIComponent(consulta)}-${i}.html`,
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
    search: (consulta: string) => {
      llamadasAlIndice.push(['search', consulta]);
      if (falla === 'search') throw new Error('la búsqueda falla');
      if (!opciones.manual) return Promise.resolve(responderA(consulta));
      return new Promise((resolver) => esperando.push({ consulta, resolver: () => resolver(responderA(consulta)) }));
    },
    destroy: async () => {
      llamadasAlIndice.push(['destroy']);
      destrucciones++;
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
    /** Las llamadas a `history.replaceState`, en su orden, con sus argumentos tal como llegaron. */
    historial: () => llamadasAlHistorial.map((l) => [...l]),
    /** `history.state` ahora. */
    estadoDelHistorial: () => estadoDelHistorial,
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
    enfocar: () => despachar(campo.oyentes, 'focus', evento('focus')),
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
    responder: async (consulta: string) => {
      // La búsqueda llega al índice después de cargarlo e iniciarlo: unas cuantas promesas más allá.
      await vaciar();
      const indice = esperando.findIndex((e) => e.consulta === consulta);
      if (indice < 0) throw new Error(`no hay ninguna búsqueda de «${consulta}» esperando respuesta`);
      const [pendiente] = esperando.splice(indice, 1);
      pendiente.resolver();
      await vaciar();
    },
    /** Las escuchas puestas, por dónde: la ventana, el documento, el campo, la lista y el formulario. */
    escuchas: () => ({
      ventana: deLaVentana.map((o) => o.tipo),
      documento: delDocumento.map((o) => o.tipo),
      campo: campo.oyentes.map((o) => o.tipo),
      lista: lista.oyentes.map((o) => o.tipo),
      formulario: formulario.oyentes.map((o) => o.tipo),
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
