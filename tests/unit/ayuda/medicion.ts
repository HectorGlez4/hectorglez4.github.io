import { createContext, runInContext } from 'node:vm';
import { ARRANQUE_DE_MEDICION, guionDeMedicion } from '../../../src/lib/medicion.ts';

/** Un oyente guardado, con sus ajustes. */
interface Oyente {
  tipo: string;
  oyente: (evento: Record<string, unknown>) => void;
  unaVez: boolean;
  /** `capture` y `passive`, tal como se pidieron: el entorno no los aplica, pero los apunta. */
  captura: boolean;
  pasiva: boolean;
}

type Ajustes = boolean | { once?: boolean; capture?: boolean; passive?: boolean };

/**
 * Lo que declara un contenedor de un enlace — Historia 23.7: una Zona de salida interna
 * (`data-zona`) o una exención con su motivo (`data-sin-zona`). Los valores van tal cual: el
 * entorno no los coteja con nada, que es lo que tiene que hacer el fichero.
 */
export type Contenedor = { zona: string } | { sinZona: string };

/** El enlace que se pulsa — Historia 23.7. */
export interface EnlacePulsado {
  /** El `href`, tal como iría escrito: se resuelve contra la dirección de ahora. */
  href: string;
  /** Los contenedores que lo envuelven, del más cercano al más lejano. */
  contenedores?: readonly Contenedor[];
  /** El atributo `target`, si lo lleva. */
  target?: string;
  /** Si lleva el atributo `download`. */
  descarga?: boolean;
}

/**
 * Un clic que no es en un enlace — Historia 23.7: el que el navegador despacha en el botón de
 * enviar de un formulario (`<button type="submit">` dentro de un `<form>`) al enviarlo con Enter o
 * pulsándolo, envuelto en sus contenedores.
 */
export interface EnvioDeFormulario {
  envio: true;
  /** Los contenedores que envuelven el formulario, del más cercano al más lejano. */
  contenedores?: readonly Contenedor[];
}

/** Cómo se pulsa — Historia 23.7: el botón (por omisión, 0, el principal) y lo demás del clic. */
export interface Gesto {
  button?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  /** Si una isla ya se quedó con el clic (`preventDefault`) antes de que llegue a la ventana. */
  defaultPrevented?: boolean;
}

/** Un elemento de mentira: lo justo para `closest`, `getAttribute` y `hasAttribute`. */
interface Nodo {
  etiqueta: string;
  atributos: Map<string, string>;
  padre: Nodo | null;
}

/**
 * Si un nodo casa con una lista de selectores separados por comas, cada uno `etiqueta[atributo]`
 * o `[atributo]`. Es lo único que el fichero pide a `closest`; cualquier otra forma lanza, para
 * que una escucha que empiece a pedir otra cosa no pase en verde contra un entorno que no la sabe
 * leer.
 */
function casa(nodo: Nodo, selectores: string): boolean {
  return selectores.split(',').some((selector) => {
    const forma = /^\s*([a-z]*)\[([a-z-]+)\]\s*$/.exec(selector);
    if (!forma) throw new Error(`el entorno no sabe leer el selector «${selector}»`);
    const [, etiqueta, atributo] = forma;
    return (etiqueta === '' || etiqueta === nodo.etiqueta) && nodo.atributos.has(atributo);
  });
}

/** El objeto que ve el guion por cada nodo: el elemento, con sus tres métodos. */
function comoElemento(nodo: Nodo, vistos = new Map<Nodo, Record<string, unknown>>()): Record<string, unknown> {
  const ya = vistos.get(nodo);
  if (ya) return ya;
  const elemento: Record<string, unknown> = {
    tagName: nodo.etiqueta.toUpperCase(),
    getAttribute: (nombre: string) => nodo.atributos.get(nombre) ?? null,
    hasAttribute: (nombre: string) => nodo.atributos.has(nombre),
    closest: (selectores: string) => {
      for (let actual: Nodo | null = nodo; actual; actual = actual.padre) {
        if (casa(actual, selectores)) return comoElemento(actual, vistos);
      }
      return null;
    },
  };
  vistos.set(nodo, elemento);
  return elemento;
}

/**
 * Ejecuta el arranque y el fichero de medición con un navegador de mentira y recoge lo que
 * envía.
 *
 * Comprueba lo que la medición **hace**, no cómo está escrita. Las afirmaciones sobre su
 * texto literal se rompían al compactarla —un cambio sin ningún efecto observable— y en
 * cambio no habrían visto un fallo de comportamiento.
 *
 * Desde la Historia 23.1 son dos piezas, y el contexto es un global de verdad (`node:vm`) y no
 * una función con parámetros: el arranque y las islas llaman `__medir` a secas, y eso solo
 * resuelve si `window` es el propio global, como en el navegador. Por omisión el fichero se
 * carga en cuanto se crea el entorno; con `cargado: false` las llamadas se encolan hasta
 * `cargar()`, y con `prerendering: true` el fichero espera a `activar()`.
 *
 * Desde la Historia 23.5 el entorno tiene además **tiempo y visibilidad fingidos**: un reloj
 * entero que solo avanza con `avanzar(ms)` —`performance.now`, `setTimeout` y `clearTimeout`
 * lo leen—, la visibilidad del documento (`visible`, por omisión sí) que cambian `ocultar()` y
 * `mostrar()` despachando `visibilitychange`, las escuchas de la ventana, a las que
 * `interactuar(tipo)` despacha un evento, y `restaurar(persisted)`, que despacha `pageshow` como
 * la caché de atrás y adelante.
 *
 * Desde la Historia 23.6 la dirección es entera —origen (`ORIGEN_DEL_SANDBOX`), ruta, búsqueda y
 * fragmento (`fragmento`)— y hay **historial**: `history.state` (el de `estado`, por omisión
 * `null`) y un `replaceState(estado, título, url)` que apunta cada llamada, tal como llega, y
 * aplica la URL a `location` como el navegador: la resuelve contra la dirección de ahora con
 * `URL`, que no recodifica lo ya codificado, y lanza si sale de otro origen —el `SecurityError`
 * del navegador, que es lo que pasaría con una ruta que empieza por `//`—. Con
 * `historialQueLanza`, `replaceState` apunta la llamada y lanza, como un historial que no se deja
 * escribir; con `sinHistorial`, no hay `history` en absoluto. `historial()` da las llamadas y
 * `direccion()`, lo que mostraría la barra: ruta, búsqueda y fragmento.
 *
 * Desde la Historia 23.7 hay **clics en enlaces**: `pulsar(enlace, gesto)` despacha `click`
 * —primero al documento y después a la ventana, como el que sube desde un elemento— con el botón,
 * los modificadores y el `defaultPrevented` del gesto. El objetivo es un `<span>` dentro de un `<a>`
 * de mentira, cuyo `href` se resuelve con `URL` contra la dirección de ahora (`origin`,
 * `pathname`), con su `target` y su `download`, y envuelto en los contenedores del enlace —una
 * zona (`data-zona`) o una exención (`data-sin-zona`)—, del más cercano al más lejano. Con
 * `enlace` nulo el objetivo es un `<p>` que no está dentro de ningún enlace, y con `{ envio: true }`,
 * el botón de enviar de un formulario dentro de sus contenedores. `closest` sabe leer
 * solo listas de `etiqueta[atributo]` y `[atributo]`, que es lo que pide el fichero. No dispara
 * `pointerdown`: un clic de `element.click()` no lo trae, y quien quiera el del ratón lo pide antes
 * con `interactuar`.
 */
export const ORIGEN_DEL_SANDBOX = 'https://ejemplo.invalid';

export function medicionEnUnSandbox(
  opciones: {
    ruta?: string;
    busqueda?: string;
    sendBeacon?: (url: string, carga: string) => void;
    /** El `data-vistas` del `<html>`. Sin él, la página no declara vistas. */
    vistas?: string;
    /** `document.prerendering` al cargar el fichero. */
    prerendering?: boolean;
    /** Si el fichero se carga al crear el entorno. Por omisión, sí. */
    cargado?: boolean;
    /** Si el documento está visible al crear el entorno. Por omisión, sí. */
    visible?: boolean;
    /** `location.hash`, con su `#`. Por omisión, ninguno. */
    fragmento?: string;
    /** `history.state` al cargar. Por omisión, `null`, como una página recién servida. */
    estado?: unknown;
    /** Si `history.replaceState` lanza, como un historial que no se deja escribir. */
    historialQueLanza?: boolean;
    /** Si no hay `history` en el entorno. */
    sinHistorial?: boolean;
  } = {},
) {
  const enviadas: string[] = [];
  const delDocumento: Oyente[] = [];
  const deLaVentana: Oyente[] = [];
  const guardar = (lista: Oyente[]) => (tipo: string, oyente: Oyente['oyente'], ajustes?: Ajustes) => {
    const objeto = typeof ajustes === 'object' ? ajustes : {};
    lista.push({
      tipo,
      oyente,
      unaVez: objeto.once === true,
      captura: ajustes === true || objeto.capture === true,
      pasiva: objeto.passive === true,
    });
  };
  /** Llama a los oyentes de un tipo en el orden en que se registraron; los `once`, una vez. */
  const despachar = (lista: Oyente[], tipo: string, evento: Record<string, unknown> = {}) => {
    for (const registro of [...lista]) {
      if (registro.tipo !== tipo) continue;
      if (registro.unaVez) lista.splice(lista.indexOf(registro), 1);
      registro.oyente({ type: tipo, ...evento });
    }
  };

  /*
   * El reloj fingido: un entero y una lista de temporizadores. Nada avanza solo; `avanzar(ms)`
   * dispara en orden de vencimiento los que vencen dentro del tramo, con el reloj puesto en su
   * instante, y deja el reloj al final del tramo.
   */
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

  const documento = {
    documentElement: {
      dataset: opciones.vistas === undefined ? {} : { vistas: opciones.vistas },
    },
    prerendering: opciones.prerendering ?? false,
    visibilityState: opciones.visible === false ? 'hidden' : 'visible',
    addEventListener: guardar(delDocumento),
  };

  const ubicacion = {
    origin: ORIGEN_DEL_SANDBOX,
    pathname: opciones.ruta ?? '/',
    search: opciones.busqueda ?? '',
    hash: opciones.fragmento ?? '',
  };
  /** Cada llamada a `replaceState`, con sus tres argumentos tal como llegaron. */
  const llamadas: { estado: unknown; titulo: unknown; url: unknown }[] = [];
  const historia: { state: unknown; replaceState: (estado: unknown, titulo: unknown, url?: unknown) => void } = {
    state: opciones.estado === undefined ? null : opciones.estado,
    replaceState(estado: unknown, titulo: unknown, url?: unknown) {
      llamadas.push({ estado, titulo, url });
      if (opciones.historialQueLanza) throw new Error('el historial no se deja escribir');
      historia.state = estado;
      if (url === undefined || url === null) return;
      // Resuelta contra la dirección de ahora, como en el navegador: una URL de otro origen lanza
      // —el `SecurityError`—, y un `?` o un `#` solos son una búsqueda o un fragmento vacíos.
      const actual = `${ubicacion.origin}${ubicacion.pathname}${ubicacion.search}${ubicacion.hash}`;
      const nueva = new URL(String(url), actual);
      if (nueva.origin !== ubicacion.origin) {
        throw new Error(`SecurityError: replaceState a otro origen (${nueva.origin}) desde ${ubicacion.origin}`);
      }
      ubicacion.pathname = nueva.pathname;
      ubicacion.search = nueva.search;
      ubicacion.hash = nueva.hash;
    },
  };

  const ventana: Record<string, unknown> = {
    document: documento,
    location: ubicacion,
    navigator: {
      sendBeacon:
        opciones.sendBeacon ?? ((_url: string, carga: string) => void enviadas.push(carga)),
    },
    URLSearchParams,
    performance: { now: () => ahora },
    setTimeout,
    clearTimeout,
    addEventListener: guardar(deLaVentana),
  };
  if (!opciones.sinHistorial) ventana.history = historia;
  ventana.window = ventana;
  createContext(ventana);

  runInContext(ARRANQUE_DE_MEDICION, ventana);
  const cargar = () => runInContext(guionDeMedicion('https://ejemplo.invalid/e'), ventana);
  if (opciones.cargado !== false) cargar();

  const cambiarVisibilidad = (estado: 'visible' | 'hidden') => {
    documento.visibilityState = estado;
    despachar(delDocumento, 'visibilitychange');
  };

  return {
    /**
     * Lo que haría una isla: `__medir(…)` a secas, antes o después de que llegue el fichero. Lo
     * que vaya detrás del destino se pasa tal cual: es lo que una isla no debería poder colar.
     */
    emitir: (evento: string, datos?: string | null, destino?: string, ...demas: unknown[]) =>
      (ventana.__medir as (e: string, d?: string | null, z?: string, ...r: unknown[]) => void)(
        evento,
        datos,
        destino,
        ...demas,
      ),
    /** Carga el fichero, si se creó el entorno con `cargado: false`. */
    cargar,
    /** La página prerenderizada pasa a verse: dispara `prerenderingchange`. */
    activar: () => {
      documento.prerendering = false;
      despachar(delDocumento, 'prerenderingchange');
    },
    /** Avanza el reloj `ms` milisegundos, disparando en orden los temporizadores que vencen. */
    avanzar: (ms: number) => {
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
    },
    /**
     * Una tarea larga: el reloj avanza `ms` milisegundos sin que ningún temporizador pueda
     * disparar, como cuando el hilo principal está ocupado. Los vencidos esperan al siguiente
     * `avanzar`, salvo que algo los cancele antes.
     */
    bloquear: (ms: number) => {
      ahora += ms;
    },
    /**
     * Una interacción del visitante —`pointerdown`, `keydown`, `wheel`, `touchmove`, `scroll`…—:
     * llega a la ventana, y también al documento, como el evento que sube desde un elemento.
     */
    interactuar: (tipo: string) => {
      despachar(delDocumento, tipo);
      despachar(deLaVentana, tipo);
    },
    /** La pestaña se oculta: `visibilityState` pasa a `hidden` y se despacha `visibilitychange`. */
    ocultar: () => cambiarVisibilidad('hidden'),
    /** La pestaña vuelve a verse: `visibilityState` pasa a `visible` y se despacha `visibilitychange`. */
    mostrar: () => cambiarVisibilidad('visible'),
    /** La caché de atrás y adelante devuelve la página: despacha `pageshow` con `persisted`. */
    restaurar: (persisted = true) => despachar(deLaVentana, 'pageshow', { persisted }),
    /** Cuántos temporizadores siguen pendientes. */
    pendientes: () => temporizadores.length,
    /** Las escuchas puestas en la ventana o en el documento, con sus ajustes. */
    escuchas: (donde: 'ventana' | 'documento') =>
      (donde === 'ventana' ? deLaVentana : delDocumento).map(({ tipo, unaVez, captura, pasiva }) => ({
        tipo,
        unaVez,
        captura,
        pasiva,
      })),
    /**
     * Envuelve el `window.__medir` de ahora, como el espía de `tests/e2e/ayuda/espia.ts`, y
     * devuelve la lista —viva— de los eventos que pasan por él.
     */
    espiar: () => {
      const vistos: string[] = [];
      const real = ventana.__medir as (...argumentos: unknown[]) => unknown;
      ventana.__medir = (...argumentos: unknown[]) => {
        vistos.push(String(argumentos[0]));
        return real(...argumentos);
      };
      return vistos;
    },
    balizas: () => enviadas.map((c) => JSON.parse(c) as Record<string, unknown>),
    /** Las llamadas a `history.replaceState`, en su orden, con sus argumentos tal como llegaron. */
    historial: () => [...llamadas],
    /**
     * Un clic —Historia 23.7—: en un enlace, dentro de sus contenedores; con `{ envio: true }`, en
     * el botón de enviar de un formulario; o, con `enlace` nulo, fuera de cualquier enlace. Llega al
     * documento y después a la ventana.
     */
    pulsar: (enlace: EnlacePulsado | EnvioDeFormulario | null, gesto: Gesto = {}) => {
      let padre: Nodo | null = null;
      // Del más lejano al más cercano, para que cada uno sea el padre del siguiente.
      for (const contenedor of [...(enlace?.contenedores ?? [])].reverse()) {
        const atributos = new Map<string, string>(
          'zona' in contenedor ? [['data-zona', contenedor.zona]] : [['data-sin-zona', contenedor.sinZona]],
        );
        padre = { etiqueta: 'div', atributos, padre };
      }
      let objetivo: Record<string, unknown>;
      if (enlace === null) {
        objetivo = comoElemento({ etiqueta: 'p', atributos: new Map(), padre });
      } else if ('envio' in enlace) {
        const formulario: Nodo = { etiqueta: 'form', atributos: new Map([['action', '/buscar/']]), padre };
        objetivo = comoElemento({ etiqueta: 'button', atributos: new Map([['type', 'submit']]), padre: formulario });
      } else {
        const atributos = new Map<string, string>([['href', enlace.href]]);
        if (enlace.target !== undefined) atributos.set('target', enlace.target);
        if (enlace.descarga) atributos.set('download', '');
        const nodoDelEnlace: Nodo = { etiqueta: 'a', atributos, padre };
        const vistos = new Map<Nodo, Record<string, unknown>>();
        // Resuelto contra la dirección de ahora, como el `HTMLAnchorElement` del navegador.
        const actual = `${ubicacion.origin}${ubicacion.pathname}${ubicacion.search}${ubicacion.hash}`;
        const resuelto = new URL(enlace.href, actual);
        Object.assign(comoElemento(nodoDelEnlace, vistos), {
          href: resuelto.href,
          origin: resuelto.origin,
          pathname: resuelto.pathname,
          target: enlace.target ?? '',
        });
        objetivo = comoElemento({ etiqueta: 'span', atributos: new Map(), padre: nodoDelEnlace }, vistos);
      }
      const evento = {
        target: objetivo,
        button: gesto.button ?? 0,
        metaKey: gesto.metaKey ?? false,
        ctrlKey: gesto.ctrlKey ?? false,
        shiftKey: gesto.shiftKey ?? false,
        altKey: gesto.altKey ?? false,
        defaultPrevented: gesto.defaultPrevented ?? false,
      };
      despachar(delDocumento, 'click', evento);
      despachar(deLaVentana, 'click', evento);
    },
    /** Lo que mostraría la barra: ruta, búsqueda y fragmento. */
    direccion: () => `${ubicacion.pathname}${ubicacion.search}${ubicacion.hash}`,
  };
}
