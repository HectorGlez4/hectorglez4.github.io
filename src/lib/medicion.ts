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

import { PARAMETRO_DE_ORIGEN } from './redes.ts';
import { CAMPOS_DE_EVENTO, EVENTOS, claveEnLaBaliza, type Campo, type Evento } from './vocabulario.ts';

/*
 * El vocabulario vive en `src/lib/vocabulario.ts` desde la Historia 23.2 (AD-13): lo importan
 * también el receptor y `tools/`, que no emiten nada. Se reexporta aquí para quien ya lo
 * consumía por este módulo —el armazón, las islas, `superficies.ts`, las pruebas—.
 */
export { EVENTOS, EVENTOS_VALIDOS, esEventoValido, type Evento } from './vocabulario.ts';

/**
 * Los eventos que una página emite por estar vista, y no por un gesto — Historias 20.1 y 23.1.
 * Es lo único que una `Superficie` puede declarar como vista: con `Evento` a secas, una
 * declaración podía poner `copiado` y el fichero lo emitiría en cada carga.
 */
export type EventoDeVista = typeof EVENTOS.vistaDeCita | typeof EVENTOS.vistaDeSuperficie;

/**
 * Los eventos que el fichero sabe emitir hoy — Historia 23.2.
 *
 * El vocabulario declara más: `lectura`, `salida-interna`, `busqueda` y `vista-de-obra` llegan
 * con las Historias 23.5, 23.7, 23.8 y 23.9, que los añaden aquí y los sacan de los pendientes
 * de `tests/unit/vocabulario.test.ts` en el mismo diff. Hasta entonces el fichero descarta
 * cualquiera de los cuatro, igual que un evento inventado: el receptor ya los sabe guardar,
 * pero nadie los envía.
 */
export const EVENTOS_DEL_GUION: readonly Evento[] = [
  EVENTOS.vistaDeCita,
  EVENTOS.vistaDeSuperficie,
  EVENTOS.copiado,
  EVENTOS.descargaDeImagen,
  EVENTOS.busquedaSinResultados,
  EVENTOS.comparticionDeImagen,
  EVENTOS.comparticionDeEnlace,
];

/**
 * De dónde saca el fichero cada campo que sabe producir — Historia 23.2.
 *
 *   · 0 — la Marca de origen, leída de la dirección (`?de=`);
 *   · 1 — el segundo argumento de `__medir`, el texto de la búsqueda sin resultados;
 *   · 2 — el tercero, el destino que nombra la isla.
 *
 * Los demás campos del vocabulario —`via`, `zona`, `tramo`, `filtros`, `indexable` y
 * `primera`— no los produce todavía, y no los envía: llegan con las Historias 23.5 a 23.9.
 */
const FUENTE_EN_EL_GUION: { readonly [C in Campo]?: 0 | 1 | 2 } = {
  origen: 0,
  consulta: 1,
  destino: 2,
};

/** Los campos que el fichero sabe producir hoy. */
export const CAMPOS_DEL_GUION = Object.keys(FUENTE_EN_EL_GUION) as readonly Campo[];

/**
 * Los campos que el fichero envía con un evento: los que el vocabulario le declara y él sabe
 * producir, en el orden de la declaración. Ninguno para un evento que el fichero no emite.
 */
export function camposQueEmite(evento: string): Campo[] {
  if (!(EVENTOS_DEL_GUION as readonly string[]).includes(evento)) return [];
  return (Object.keys(CAMPOS_DE_EVENTO[evento as Evento]) as Campo[]).filter(
    (campo) => FUENTE_EN_EL_GUION[campo] !== undefined,
  );
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
 * Lo que viaja con cada evento son **exactamente** las claves que el vocabulario le declara y
 * que el fichero sabe producir (Historia 23.2, AD-13): el nombre del evento, la ruta de la
 * página y, según el evento, la Marca de origen —solo con las vistas: una acción no la lleva—,
 * el destino —cotejado con el conjunto de su evento— o, solo en la búsqueda sin resultados, el
 * texto de la consulta. Un campo declarado sin valor legítimo viaja como `null`; uno que el
 * evento no declara no viaja. Nada más. No hay identificador de visitante, ni se genera uno, ni
 * se lee ni se escribe ninguna cookie. Lo fija la prueba de correspondencia de
 * `tests/unit/vocabulario.test.ts`, evento por evento y valor por valor.
 *
 * La Marca de origen se coteja **aquí**, contra el conjunto cerrado de cuentas propias, antes
 * de que salga de la página. Llega en la URL, y todo lo que llega en la URL lo escribe
 * cualquiera: sin cotejarla, `?de=` admitiría el texto que le pusieran —incluido algo que
 * identifique a quien pulsó el enlace— y la medición lo registraría sin más. Un evento que el
 * fichero no emite se descarta igual que uno inventado, venga de la cola o de una llamada
 * directa: la tabla es un objeto, y se pregunta por sus claves propias para que `toString` no
 * pase por evento.
 *
 * Se emite compacto —nombres cortos, sin sangrado— y envuelto en una función para no dejar
 * globales sueltas: lo legible es esta función y sus comentarios, que no viajan. No importa
 * nada: es un guion clásico con `defer`, y la lista cerrada de `src/lib/guiones.ts` lo exige.
 * Su tope es `MAX_BYTES_GUION_DE_MEDICION`.
 */
export function guionDeMedicion(url: string): string {
  /*
   * La tabla de cada evento se compone aquí, desde `CAMPOS_DE_EVENTO`: por cada campo que el
   * fichero sabe producir, la clave con la que viaja, de dónde sale y su conjunto (o nada, si
   * es texto). Los conjuntos repetidos van una sola vez, en una variable.
   */
  const conjuntos = new Map<string, string>();
  const nombreDe = (valores: readonly string[]) => {
    const texto = JSON.stringify(valores);
    if (!conjuntos.has(texto)) conjuntos.set(texto, `A${conjuntos.size}`);
    return conjuntos.get(texto)!;
  };
  const tabla = EVENTOS_DEL_GUION.map((evento) => {
    const campos = camposQueEmite(evento).map((campo) => {
      const { valores } = CAMPOS_DE_EVENTO[evento][campo]!;
      const clave = JSON.stringify(claveEnLaBaliza(campo));
      const fuente = FUENTE_EN_EL_GUION[campo];
      return valores === 'texto' ? `[${clave},${fuente}]` : `[${clave},${fuente},${nombreDe(valores)}]`;
    });
    return `${JSON.stringify(evento)}:[${campos.join(',')}]`;
  });
  // Sin ningún campo de conjunto cerrado no hay ninguna variable de conjunto: la lista se compone
  // por piezas para que no quede una coma suelta (`var q=…,,s=…` no es JavaScript).
  const variables = [
    'q=window.__medir&&__medir.q||[]',
    ...[...conjuntos].map(([texto, nombre]) => `${nombre}=${texto}`),
    `s={${tabla.join(',')}}`,
  ].join(',');
  const p = JSON.stringify(PARAMETRO_DE_ORIGEN);

  return (
    `(function(){` +
    `var ${variables};` +
    `function e(v,t,z){` +
    `if(!s.hasOwnProperty(v))return;` +
    `try{` +
    `var c={evento:v,ruta:location.pathname},m=[new URLSearchParams(location.search).get(${p}),t,z];` +
    `s[v].forEach(function(f){var x=m[f[1]];c[f[0]]=f[2]?f[2].indexOf(x)<0?null:x:x||null});` +
    `c=JSON.stringify(c);` +
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
