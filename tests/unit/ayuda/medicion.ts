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
 * Desde la Historia 23.6 la dirección es entera —ruta, búsqueda y fragmento (`fragmento`)— y hay
 * **historial**: `history.state` (el de `estado`, por omisión `null`) y un `replaceState(estado,
 * título, url)` que apunta cada llamada, tal como llega, y aplica la URL a `location` partiéndola a
 * mano, sin recodificar nada, como haría el navegador con una dirección ya codificada. Con
 * `historialQueLanza`, `replaceState` apunta la llamada y lanza, como un historial que no se deja
 * escribir; con `sinHistorial`, no hay `history` en absoluto. `historial()` da las llamadas y
 * `direccion()`, lo que mostraría la barra: ruta, búsqueda y fragmento.
 */
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
      // Una ruta del mismo origen, partida a mano: el fragmento desde el primer `#`, la búsqueda
      // desde el primer `?` anterior a él. Un `?` o un `#` solos son una búsqueda o un fragmento
      // vacíos, como en el navegador.
      const texto = String(url);
      if (!texto.startsWith('/')) throw new Error(`replaceState con una URL que no es una ruta: ${texto}`);
      const almohadilla = texto.indexOf('#');
      const sinFragmento = almohadilla < 0 ? texto : texto.slice(0, almohadilla);
      const interrogacion = sinFragmento.indexOf('?');
      const fragmento = almohadilla < 0 ? '' : texto.slice(almohadilla);
      const busqueda = interrogacion < 0 ? '' : sinFragmento.slice(interrogacion);
      ubicacion.pathname = interrogacion < 0 ? sinFragmento : sinFragmento.slice(0, interrogacion);
      ubicacion.search = busqueda === '?' ? '' : busqueda;
      ubicacion.hash = fragmento === '#' ? '' : fragmento;
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
    /** Lo que mostraría la barra: ruta, búsqueda y fragmento. */
    direccion: () => `${ubicacion.pathname}${ubicacion.search}${ubicacion.hash}`,
  };
}
