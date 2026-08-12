/**
 * AD-13 — La medición es un módulo propio con un vocabulario cerrado.
 *
 * Este es el **único** módulo que sabe cómo se emite un evento. Ninguna página,
 * componente ni isla habla con el proveedor: llaman a `window.__medir`, que instala este
 * módulo. Las dos divergencias que eso impide:
 *
 *   · que cambiar de proveedor —o cumplir NFR-11— obligue a tocar toda la base de código;
 *   · y, peor, que se adopte un proveedor que exija banner de consentimiento y se
 *     incumpla NFR-10 sin que nadie lo decida conscientemente.
 *
 * Por eso el transporte es una baliza propia y no el guion de un proveedor: `sendBeacon`
 * contra un punto final configurable, sin cookies, sin identificador y sin nada que
 * pueda convertirse en uno. La propiedad «no requiere consentimiento» queda garantizada
 * por construcción y no por la casilla de configuración de un tercero.
 *
 * AD-5 — Derivación pura: aquí no se emite nada, solo se decide qué y cómo.
 */

import { PARAMETRO_DE_ORIGEN, REDES_VALIDAS } from './redes.ts';

/**
 * El conjunto cerrado de eventos. Añadir uno exige modificar este módulo, que es
 * exactamente lo que AD-13 quiere que cueste: es la revisión que impide que la medición
 * crezca por acumulación hasta convertirse en un perfil del visitante.
 */
export const EVENTOS = {
  /** SM-2, SM-3 — una Página de Cita se ha mostrado. */
  vistaDeCita: 'vista-de-cita',
  /** SM-5, junto con la descarga — el visitante se ha llevado la Cita. */
  copiado: 'copiado',
  /** SM-5, junto con el copiado — Historia 5.1. */
  descargaDeImagen: 'descarga-de-imagen',
  /** SM-6, FR-8 — alimenta la curación del Corpus con lo que se buscó y no había. */
  busquedaSinResultados: 'busqueda-sin-resultados',
} as const;

export type Evento = (typeof EVENTOS)[keyof typeof EVENTOS];

export const EVENTOS_VALIDOS: readonly Evento[] = Object.values(EVENTOS);

export function esEventoValido(nombre: string): nombre is Evento {
  return (EVENTOS_VALIDOS as readonly string[]).includes(nombre);
}

/**
 * El punto final al que se envían los eventos. Sin él, la medición no se instala y el
 * sitio no envía absolutamente nada — que es como corre en desarrollo y en las pruebas.
 *
 * Qué producto se contrata se decide al desplegar; lo que no se decide al desplegar son
 * las propiedades, que son estas y están cerradas aquí.
 */
export function puntoFinal(entorno: Record<string, string | undefined>): string | null {
  const url = entorno.MEDICION_ENDPOINT?.trim();
  return url ? url : null;
}

/**
 * El guion que se inserta en línea cuando hay medición configurada.
 *
 * Es deliberadamente diminuto y sin dependencias: la alternativa —el guion de un
 * proveedor— es un fichero descargado de un tercero, y con él vuelven las cookies y el
 * consentimiento por la puerta de atrás.
 *
 * Lo que viaja: el nombre del evento, la ruta de la página, la marca de origen cuando la
 * visita llegó por un enlace del Kit y, solo en la búsqueda sin resultados, el texto de la
 * consulta. Nada más. No hay identificador de visitante, ni se genera uno, ni se lee ni se
 * escribe ninguna cookie.
 *
 * La marca de origen se coteja **aquí**, contra el conjunto cerrado de cuentas propias,
 * antes de que salga de la página. Llega en la URL, y todo lo que llega en la URL lo
 * escribe cualquiera: sin cotejarla, `?de=` admitiría el texto que le pusieran —incluido
 * algo que identifique a quien pulsó el enlace— y la medición lo registraría sin más.
 */
export function guionDeMedicion(url: string): string {
  return `
window.__medir = function (evento, datos) {
  var permitidos = ${JSON.stringify(EVENTOS_VALIDOS)};
  if (permitidos.indexOf(evento) === -1) return;
  try {
    var redes = ${JSON.stringify(REDES_VALIDAS)};
    var marca = new URLSearchParams(location.search).get(${JSON.stringify(PARAMETRO_DE_ORIGEN)});
    var origen = redes.indexOf(marca) === -1 ? null : marca;
    var carga = JSON.stringify({
      evento: evento,
      ruta: location.pathname,
      origen: origen,
      datos: datos || null
    });
    if (navigator.sendBeacon) navigator.sendBeacon(${JSON.stringify(url)}, carga);
  } catch (e) {
    // La medición nunca puede romper la página: si falla, se pierde el evento y ya.
  }
};`.trim();
}

/** Llamada de emisión para las islas. Nunca hablan con el proveedor; hablan con esto. */
export function emitir(evento: Evento, datos?: string): string {
  return datos === undefined
    ? `window.__medir && window.__medir(${JSON.stringify(evento)});`
    : `window.__medir && window.__medir(${JSON.stringify(evento)}, ${datos});`;
}
