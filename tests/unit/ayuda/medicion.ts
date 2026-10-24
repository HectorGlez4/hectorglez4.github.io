import { createContext, runInContext } from 'node:vm';
import { ARRANQUE_DE_MEDICION, guionDeMedicion } from '../../../src/lib/medicion.ts';

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
  } = {},
) {
  const enviadas: string[] = [];
  const oyentes: { tipo: string; oyente: () => void; unaVez: boolean }[] = [];
  const documento = {
    documentElement: {
      dataset: opciones.vistas === undefined ? {} : { vistas: opciones.vistas },
    },
    prerendering: opciones.prerendering ?? false,
    addEventListener: (tipo: string, oyente: () => void, ajustes?: { once?: boolean }) => {
      oyentes.push({ tipo, oyente, unaVez: ajustes?.once === true });
    },
  };

  const ventana: Record<string, unknown> = {
    document: documento,
    location: { pathname: opciones.ruta ?? '/', search: opciones.busqueda ?? '' },
    navigator: {
      sendBeacon:
        opciones.sendBeacon ?? ((_url: string, carga: string) => void enviadas.push(carga)),
    },
    URLSearchParams,
  };
  ventana.window = ventana;
  createContext(ventana);

  runInContext(ARRANQUE_DE_MEDICION, ventana);
  const cargar = () => runInContext(guionDeMedicion('https://ejemplo.invalid/e'), ventana);
  if (opciones.cargado !== false) cargar();

  return {
    /** Lo que haría una isla: `__medir(…)` a secas, antes o después de que llegue el fichero. */
    emitir: (evento: string, datos?: string | null, destino?: string) =>
      (ventana.__medir as (e: string, d?: string | null, z?: string) => void)(
        evento,
        datos,
        destino,
      ),
    /** Carga el fichero, si se creó el entorno con `cargado: false`. */
    cargar,
    /** La página prerenderizada pasa a verse: dispara `prerenderingchange`. */
    activar: () => {
      documento.prerendering = false;
      for (const registro of [...oyentes]) {
        if (registro.tipo !== 'prerenderingchange') continue;
        if (registro.unaVez) oyentes.splice(oyentes.indexOf(registro), 1);
        registro.oyente();
      }
    },
    balizas: () => enviadas.map((c) => JSON.parse(c) as Record<string, unknown>),
  };
}
