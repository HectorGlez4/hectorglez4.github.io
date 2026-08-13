import { guionDeMedicion } from '../../../src/lib/medicion.ts';

/**
 * Ejecuta el guion de medición con un navegador de mentira y recoge lo que envía.
 *
 * Comprueba lo que el guion **hace**, no cómo está escrito. Las afirmaciones sobre su
 * texto literal se rompían al compactarlo —un cambio sin ningún efecto observable— y en
 * cambio no habrían visto un fallo de comportamiento.
 */
export function medicionEnUnSandbox(
  opciones: {
    ruta?: string;
    busqueda?: string;
    sendBeacon?: (url: string, carga: string) => void;
  } = {},
) {
  const enviadas: string[] = [];
  const ventana: Record<string, unknown> = {};
  const entorno = {
    window: ventana,
    location: { pathname: opciones.ruta ?? '/', search: opciones.busqueda ?? '' },
    navigator: {
      sendBeacon:
        opciones.sendBeacon ?? ((_url: string, carga: string) => void enviadas.push(carga)),
    },
    URLSearchParams,
    JSON,
  };

  const guion = guionDeMedicion('https://ejemplo.invalid/e');
  new Function(...Object.keys(entorno), guion)(...Object.values(entorno));

  return {
    emitir: (evento: string, datos?: string, destino?: string) =>
      (ventana.__medir as (e: string, d?: string, z?: string) => void)(evento, datos, destino),
    balizas: () => enviadas.map((c) => JSON.parse(c) as Record<string, unknown>),
  };
}
