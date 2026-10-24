/**
 * AD-13 — La medición es un módulo propio con un vocabulario cerrado.
 *
 * Este es el **único** módulo que sabe cómo se emite un evento. Ninguna página,
 * componente ni isla habla con el proveedor: llaman a `__medir(…)` a secas, que el armazón
 * abre como cola (`ARRANQUE_DE_MEDICION`) y el fichero que compone este módulo
 * (`guionDeMedicion`) vacía y sustituye. Las dos divergencias que eso impide:
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

import { DESTINOS_VALIDOS } from './destinos.ts';
import { PARAMETRO_DE_ORIGEN, REDES_VALIDAS } from './redes.ts';

/**
 * El conjunto cerrado de eventos. Añadir uno exige modificar este módulo, que es
 * exactamente lo que AD-13 quiere que cueste: es la revisión que impide que la medición
 * crezca por acumulación hasta convertirse en un perfil del visitante.
 */
export const EVENTOS = {
  /** SM-2, SM-3 — una Página de Cita se ha mostrado. */
  vistaDeCita: 'vista-de-cita',
  /**
   * SM-8, FR-22 — una superficie de agregación de producto (portada, página 1 de Autor,
   * Tema o Colección) se ha mostrado. Cuenta lo que el Canal trae fuera de la Página de
   * Cita, con la misma marca de origen. Nunca la emite una superficie de servicio —las
   * páginas 2+ de un listado, `/buscar`, `/404`—, ni una interna —`/kit`, `/lote`—, ni la
   * Página de Cita, que ya emite el suyo; el carácter de cada ruta lo declara
   * `src/lib/superficies.ts`. La razón `vista-de-cita / vista-de-superficie` es un
   * agregado por jornada, no una sesión.
   */
  vistaDeSuperficie: 'vista-de-superficie',
  /** SM-5, junto con la descarga — el visitante se ha llevado la Cita. */
  copiado: 'copiado',
  /** SM-5, junto con el copiado — Historia 5.1. */
  descargaDeImagen: 'descarga-de-imagen',
  /** SM-6, FR-8 — alimenta la curación del Corpus con lo que se buscó y no había. */
  busquedaSinResultados: 'busqueda-sin-resultados',
  /**
   * SM-7 — la Imagen salió hacia una aplicación (FR-17).
   *
   * Es distinto de `descarga-de-imagen`, y tiene que serlo: SM-C3 vigila si la
   * compartición creció **a costa** del copiado, y con un solo evento para las dos
   * cosas esa pregunta no se puede formular.
   */
  comparticionDeImagen: 'comparticion-de-imagen',
  /** SM-7 — el enlace salió hacia un destino (FR-18). */
  comparticionDeEnlace: 'comparticion-de-enlace',
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
 * El arranque — AD-6, Historia 23.1. Va **en línea** en toda página del armazón, también en
 * `/kit`, `/lote` y en un sitio construido sin punto final, y antes de cualquier isla.
 *
 * Es solo una cola: guarda cada llamada tal como llega, sin memoria, sin vocabulario y sin
 * transporte. Así una isla llama `__medir(…)` a secas —sin `window.__medir &&` delante— y la
 * llamada no se pierde aunque el fichero de medición todavía no haya llegado, o no vaya a
 * llegar nunca: sin punto final la cola crece y nadie la lee, que es exactamente «el sitio no
 * envía nada».
 *
 * Cuenta en `MAX_BYTES_DE_GUION` de cada página, así que no crece: lo que se quiera añadir a la
 * medición va al fichero, que se descarga aparte y tiene su propio tope
 * (`MAX_BYTES_GUION_DE_MEDICION`). Nadie más asigna `__medir`: lo vigila
 * `tests/unit/medicion.test.ts` sobre lo construido.
 */
export const ARRANQUE_DE_MEDICION = 'window.__medir=function(){__medir.q.push(arguments)};__medir.q=[]';

/**
 * El fichero de medición — AD-6, AD-13, Historia 23.1.
 *
 * Es el emisor de siempre, servido como fichero (`/medicion/{versión}.js`, con `defer`) en vez
 * de en línea: en línea se comía unos 630 de los 6.656 bytes de guion de la Página de Cita, y
 * el hueco lo necesitan las épicas que vienen. Lo sirve `src/pages/medicion/[version].js.ts`
 * solo cuando hay punto final; sin él no hay fichero ni etiqueta.
 *
 * Al cargar —o al activarse, si la página se está prerenderizando: una página que nadie ha
 * visto no se cuenta— hace tres cosas, en este orden:
 *
 *   1. emite las vistas que la página declara en `data-vistas` del `<html>`, que salen de
 *      `src/lib/superficies.ts` y no de la página (ninguna página elige su vista);
 *   2. se instala como `__medir`, de modo que lo que llegue después ya no se encola;
 *   3. vacía la cola del arranque en su orden, una vez cada llamada.
 *
 * Lo que viaja no cambia con el fichero: el nombre del evento, la ruta de la página, la marca
 * de origen cuando la visita llegó por un enlace del Kit, el destino de una compartición
 * cuando lo hay y, solo en la búsqueda sin resultados, el texto de la consulta. Nada más. No
 * hay identificador de visitante, ni se genera uno, ni se lee ni se escribe ninguna cookie.
 *
 * La marca de origen se coteja **aquí**, contra el conjunto cerrado de cuentas propias, antes
 * de que salga de la página. Llega en la URL, y todo lo que llega en la URL lo escribe
 * cualquiera: sin cotejarla, `?de=` admitiría el texto que le pusieran —incluido algo que
 * identifique a quien pulsó el enlace— y la medición lo registraría sin más. Un evento fuera
 * del vocabulario se descarta igual que antes, venga de la cola o de una llamada directa.
 *
 * Se emite compacto —nombres cortos, sin sangrado— y envuelto en una función para no dejar
 * globales sueltas: lo legible es esta función y sus comentarios, que no viajan. No importa
 * nada: es un guion clásico con `defer`, y la lista cerrada de `src/lib/guiones.ts` lo exige.
 * Su tope es `MAX_BYTES_GUION_DE_MEDICION`.
 */
export function guionDeMedicion(url: string): string {
  const e = JSON.stringify(EVENTOS_VALIDOS);
  const r = JSON.stringify(REDES_VALIDAS);
  const d = JSON.stringify(DESTINOS_VALIDOS);
  const p = JSON.stringify(PARAMETRO_DE_ORIGEN);

  return (
    `(function(){` +
    `var q=window.__medir&&__medir.q||[];` +
    `function e(v,t,z){` +
    `if(${e}.indexOf(v)<0)return;` +
    `try{` +
    `var m=new URLSearchParams(location.search).get(${p});` +
    `var o=${r}.indexOf(m)<0?null:m;` +
    `var w=${d}.indexOf(z)<0?null:z;` +
    `var c=JSON.stringify({evento:v,ruta:location.pathname,origen:o,destino:w,datos:t||null});` +
    `if(navigator.sendBeacon)navigator.sendBeacon(${JSON.stringify(url)},c)` +
    `}catch(x){}` +
    `}` +
    `function a(){` +
    `(document.documentElement.dataset.vistas||'').split(' ').forEach(function(v){v&&e(v)});` +
    `window.__medir=e;` +
    `q.splice(0).forEach(function(x){e.apply(null,x)})` +
    `}` +
    `document.prerendering?document.addEventListener('prerenderingchange',a,{once:true}):a()` +
    `})();`
  );
}

/**
 * La versión de un guion, sacada de su contenido — AD-6.
 *
 * Va en la URL del fichero para que cambiar el guion —o el punto final, que va dentro— cambie
 * la dirección: la página nueva pide el fichero nuevo y nunca recibe de la caché uno que no
 * casa con ella. Es FNV-1a de 32 bits sobre las unidades de código: puro, sin `node:crypto`
 * (este módulo lo importan también el receptor y las islas) y suficiente para lo que se le
 * pide, que es distinguir una versión de la anterior, no resistir a nadie.
 */
export function versionDelGuion(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * La ruta del fichero de medición para un punto final: `/medicion/{versión}.js`.
 *
 * La componen aquí las dos partes que tienen que coincidir —la etiqueta que pone
 * `Medicion.astro` y el fichero que escribe `src/pages/medicion/[version].js.ts`—, así que no
 * pueden discrepar. La reconoce la entrada `medicion` de `src/lib/guiones.ts`.
 */
export function rutaDelGuionDeMedicion(url: string): string {
  return `/medicion/${versionDelGuion(guionDeMedicion(url))}.js`;
}
