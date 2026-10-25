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
import { MIN_MS_VISIBLES_PARA_LA_LECTURA } from './umbrales.ts';
import {
  CAMPOS_DE_EVENTO,
  DESTINOS_DE_DESCARGA,
  EVENTOS,
  METRICA_DE_ACCION,
  PARAMETRO_DE_DIFUSION,
  claveEnLaBaliza,
  type Campo,
  type Evento,
  type Primera,
} from './vocabulario.ts';

/*
 * El vocabulario vive en `src/lib/vocabulario.ts` desde la Historia 23.2 (AD-13): lo importan
 * también el receptor y `tools/`, que no emiten nada. Se reexporta aquí para quien ya lo
 * consumía por este módulo —el armazón, las islas, `superficies.ts`, las pruebas—.
 */
export { EVENTOS, EVENTOS_VALIDOS, esEventoValido, type Evento } from './vocabulario.ts';

/**
 * Los eventos de vista, como lista — Historias 20.1, 23.1 y 23.5.
 *
 * El fichero solo emite de `data-vistas` lo que está aquí, y solo una vista emitida hace de la
 * página una **superficie con lectura**. El tipo `EventoDeVista` sale de esta lista, y no al
 * revés: una vista nueva (la de la Obra, 23.9) que se declarara en el tipo y no aquí saldría al
 * `data-vistas` y el fichero la descartaría en silencio —sin vista ni lectura—. Así hay un solo
 * sitio donde añadirla. En el navegador, donde el tipo no llega, la lista sostiene lo mismo: una
 * acción escrita en `data-vistas` no sale en cada carga ni enciende la lectura.
 */
export const EVENTOS_DE_VISTA = [EVENTOS.vistaDeCita, EVENTOS.vistaDeSuperficie] as const;

/**
 * Los eventos que una página emite por estar vista, y no por un gesto — Historias 20.1 y 23.1.
 * Es lo único que una `Superficie` puede declarar como vista: con `Evento` a secas, una
 * declaración podía poner `copiado` y el fichero lo emitiría en cada carga.
 */
export type EventoDeVista = (typeof EVENTOS_DE_VISTA)[number];

/**
 * Los eventos que el fichero sabe emitir hoy — Historias 23.2 y 23.5.
 *
 * El vocabulario declara más: `salida-interna`, `busqueda` y `vista-de-obra` llegan con las
 * Historias 23.7, 23.8 y 23.9, que los añaden aquí y los sacan de los pendientes de
 * `tests/unit/vocabulario.test.ts` en el mismo diff. Hasta entonces el fichero descarta
 * cualquiera de los tres, igual que un evento inventado: el receptor ya los sabe guardar, pero
 * nadie los envía. La `lectura` entró con la 23.5, y la emite solo el fichero
 * (`EVENTOS_SOLO_DEL_FICHERO`).
 */
export const EVENTOS_DEL_GUION: readonly Evento[] = [
  EVENTOS.vistaDeCita,
  EVENTOS.vistaDeSuperficie,
  EVENTOS.lectura,
  EVENTOS.copiado,
  EVENTOS.descargaDeImagen,
  EVENTOS.busquedaSinResultados,
  EVENTOS.comparticionDeImagen,
  EVENTOS.comparticionDeEnlace,
];

/**
 * Los eventos que el fichero emite por su cuenta y **nunca** a petición — Historia 23.5.
 *
 * `__medir` —la función pública del fichero, a la que llaman las islas— los descarta igual que
 * un evento inventado, venga la llamada directa o de la cola: que una carga se leyó lo decide el
 * fichero con su reloj y sus escuchas, y una isla que lo emitiera contaría como leída una carga
 * que nadie miró, o dos veces la misma. Por eso tampoco pasan por `window.__medir`, y el espía de
 * `tests/e2e/ayuda/espia.ts` no los ve. La Historia 23.7 añade aquí `salida-interna`.
 */
export const EVENTOS_SOLO_DEL_FICHERO: readonly Evento[] = [EVENTOS.lectura];

/**
 * De dónde saca el fichero cada campo que sabe producir — Historias 23.2, 23.5 y 23.6.
 *
 *   · 0 — la Marca de origen, leída de la dirección (`?de=`) una sola vez, al activarse;
 *   · 1 — el segundo argumento de `__medir`, el texto de la búsqueda sin resultados;
 *   · 2 — el tercero, el destino que nombra la isla;
 *   · 3 — `primera`, que **calcula el fichero** al emitir cada acción, con su memoria de la
 *     carga: ninguna isla la pasa ni la sabe (AD-13, SM-5, SM-7);
 *   · 4 — la Marca de difusión, leída de la dirección (`?via=`) a la vez que la de origen y por
 *     el mismo lector. Tampoco la pasa ninguna isla: un argumento de más a `__medir` no la pone.
 *
 * Los demás campos del vocabulario —`zona`, `tramo`, `filtros` e `indexable`— no los produce
 * todavía, y no los envía: llegan con las Historias 23.7 a 23.9.
 */
const FUENTE_EN_EL_GUION: { readonly [C in Campo]?: 0 | 1 | 2 | 3 | 4 } = {
  origen: 0,
  consulta: 1,
  destino: 2,
  primera: 3,
  via: 4,
};

/** Los dos valores de `primera`, nombrados contra su tipo del vocabulario (`PRIMERA`). */
const PRIMERA_SI = 'si' satisfies Primera;
const PRIMERA_NO = 'no' satisfies Primera;

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
 * Las Marcas de llegada, por su parámetro y en este orden — Historia 23.6, FR-22, AD-13: la de
 * origen (`?de=`, de qué cuenta propia llega la visita) y la de difusión (`?via=`, por qué
 * botón la compartió alguien). Se componen desde sus módulos —`redes.ts` y el vocabulario—,
 * nunca se escriben aquí: son lo único de la dirección que el fichero lee, además de la ruta.
 */
export const MARCAS_DE_LLEGADA = [PARAMETRO_DE_ORIGEN, PARAMETRO_DE_DIFUSION] as const;

/**
 * Quitar las Marcas de llegada de una búsqueda — Historia 23.6. Es una función **pura**,
 * (búsqueda, nombres) → búsqueda, y viaja **como texto** dentro del fichero: el fichero es una
 * cadena, y meterla con `String(función)` dejaría su forma en manos del empaquetado —que puede
 * renombrarla o reformatearla—, y entonces el fichero del build y el que calcula Vitest dejarían
 * de ser el mismo, y con él su versión. Las pruebas la evalúan en `node:vm` y la llaman.
 *
 * Parte la búsqueda por `&` y quita cada segmento que el mismo lector del fichero
 * (`URLSearchParams`) lee como uno de los nombres —todas sus apariciones, con valor o sin él,
 * del conjunto o ajeno—. El segmento se le da con un `&` delante para que lo lea igual que en la
 * búsqueda entera: suelto, un `?` inicial se tomaría por el de la búsqueda y `?de` pasaría por
 * `de`, que el lector no lee así. Así lo que se quita es exactamente lo que se leyó —`d%65`
 * también, porque el lector lo descodifica— y ningún nombre parecido (`dev`, `vias`, `DE`,
 * `de%20`, `xde`). El resto se devuelve **literal**, en su orden y sin recodificar —nunca por
 * `URLSearchParams#toString`, que reescribiría lo ajeno—, con `?` delante solo si queda algo más
 * que separadores: si de lo que había no queda más que `&` sueltos (`?de=x&&`), la búsqueda queda
 * vacía, sin un `?&` que no lleva nada. Si no quita nada, la devuelve tal cual, para que el
 * fichero no llame a `replaceState` sin marcas (`?&&` se queda).
 */
export const SIN_MARCAS_DE_LLEGADA =
  'function(s,n){var r=s.slice(1).split("&").filter(function(x){return!n.some(function(k){return new URLSearchParams("&"+x).has(k)})}).join("&");return/[^&]/.test(r)?"?"+r:r==s.slice(1)?s:""}';

/**
 * Lo que cuenta como interacción para la Lectura — AD-13, Historia 23.5.
 *
 * La primera de cualquiera de estas, con la página ya activa, emite la lectura aunque no hayan
 * pasado `MIN_MS_VISIBLES_PARA_LA_LECTURA`. **`scroll` no está, a propósito**: el navegador lo
 * dispara solo al restaurar la posición de una página o al saltar a un ancla, sin que nadie
 * haya tocado nada. Quien desplaza de verdad lo hace con la rueda, el dedo o el teclado, y esos
 * sí están.
 *
 * Las escuchas son pasivas y solo anotan que la carga se leyó: no mueven nada ni manejan ninguna
 * función, así que escuchar el dedo que se desliza no es un movimiento de arrastre (WCAG 2.5.7).
 * Es la revisión que pide la señal de `tests/unit/superficies.test.ts`, anotada allí.
 */
export const INTERACCIONES_DE_LECTURA = ['pointerdown', 'keydown', 'wheel', 'touchmove'] as const;

/**
 * El fichero de medición — AD-6, AD-13, Historias 23.1, 23.5 y 23.6.
 *
 * Es el emisor de siempre, servido como fichero (`/medicion/{versión}.js`, con `defer`) en vez
 * de en línea: en línea se comía unos 630 de los 6.656 bytes de guion de la Página de Cita, y
 * el hueco lo necesitan las épicas que vienen. Lo sirve `src/pages/medicion/[version].js.ts`
 * solo cuando hay punto final; sin él no hay fichero ni etiqueta.
 *
 * Al cargar —o al activarse, si la página se está prerenderizando: una página que nadie ha
 * visto no se cuenta, y antes de activarse no corre nada, ni el reloj ni las escuchas— hace
 * esto, en este orden:
 *
 *   1. lee las dos Marcas de llegada de la dirección, **una vez**, y las quita de ella (abajo);
 *   2. emite las vistas que la página declara en `data-vistas` del `<html>`, que salen de
 *      `src/lib/superficies.ts` y no de la página (ninguna página elige su vista); de ahí solo
 *      salen eventos de `EVENTOS_DE_VISTA`. Si emite alguna, la página es **superficie con
 *      lectura**; si no —páginas 2+, `/buscar/`, 404—, no habrá lectura nunca;
 *   3. empieza la carga: la memoria de `primera` vacía y el reloj de la lectura en marcha;
 *   4. se instala como `__medir`, de modo que lo que llegue después ya no se encola, y pone sus
 *      escuchas;
 *   5. vacía la cola del arranque en su orden, una vez cada llamada.
 *
 * **La Lectura** (Historia 23.5, FR-56): como mucho una por carga, y solo en una superficie con
 * lectura. Sale cuando la página lleva `MIN_MS_VISIBLES_PARA_LA_LECTURA` visible —sumando los
 * ratos en que lo está: el reloj se para con `visibilitychange` al ocultarse y se rearma con lo
 * que falta al volver; ni `setInterval` ni `scroll`— o antes, a la primera de
 * `INTERACCIONES_DE_LECTURA`. Ocultarse o descargarse no emite nada: una pestaña cerrada antes
 * de tiempo sin tocarla no se leyó. Si el temporizador llega tarde —una tarea larga lo retrasa— y
 * la página se oculta con el tiempo ya cumplido, la lectura sale entonces: no la emite ocultarse,
 * la debía la carga. La emite solo el fichero, nunca `__medir`
 * (`EVENTOS_SOLO_DEL_FICHERO`), y lleva la ruta y las Marcas de llegada, como la vista.
 *
 * **Las Marcas de llegada** (Historia 23.6, FR-22): la de origen (`?de=`) y la de difusión
 * (`?via=`), `MARCAS_DE_LLEGADA`. Se leen una sola vez, al activarse y antes de emitir ninguna
 * vista, con `URLSearchParams` —la primera aparición de cada una— y se guardan por separado; cada
 * una se coteja al emitir contra su conjunto, por la tabla del vocabulario, así que un valor ajeno
 * viaja como `null` y el evento sale igual. Viajan con las vistas que la página declara —las
 * que emite el fichero al activarse— y con la lectura, y **se olvidan al emitir la lectura**: la
 * llegada se cuenta una vez. Una vista que pida una isla por `__medir`, directa o de la cola, sale
 * sin ellas: si las llevara, una isla que pidiera otra vista antes de la lectura —o en una página
 * sin vista, donde nada las olvida— volvería a contar la misma llegada. Y se quitan de la dirección
 * con `history.replaceState`, sin recargar, conservando el resto de la búsqueda, el fragmento y el
 * `history.state` que hubiera (`SIN_MARCAS_DE_LLEGADA`), solo si había alguna y dentro de un
 * `try`: sin historial, o si escribir en él falla, la dirección se queda como llegó y los eventos
 * salen igual con sus marcas. La dirección nueva va entera, con `location.origin` delante: una
 * ruta que empezara por `//` se leería, sola, como otro anfitrión. Así recargar, copiar la
 * dirección de la barra o volver a ella no cuentan otra vez la misma llegada. Se quitan también
 * en una página sin vista —páginas 2+, `/buscar/`, 404—, donde ningún evento las lleva. Las lee
 * y las quita **solo el fichero**: ninguna isla las lee, la única que lee la dirección es la de la
 * búsqueda —su consulta, antes que el fichero, que va con `defer`— y la única que escribirá además
 * en el historial es ella, con su propio estado (23.8). Sin punto final no hay fichero, y la
 * dirección se queda como llegó.
 *
 * **`primera`** (SM-5, SM-7): cada acción —un evento de `METRICA_DE_ACCION`— lleva `si` si es la
 * primera de su métrica en la carga y `no` si no lo es, y la decide el fichero al emitir, también
 * al vaciar la cola. Una `descarga-de-imagen` con un destino de su conjunto es la que impuso el
 * navegador tras una compartición que no salió: lleva siempre `no` y no gasta la primera de su
 * métrica; con un destino ajeno viaja con `destino: null` y cuenta como sin destino. (Ese destino
 * lo pasa la isla de la Imagen desde la Historia 25.2; hasta entonces la descarga impuesta llega
 * sin él y cuenta como elegida.) En una
 * superficie con lectura, una acción que llega sin ella —un clic sin `pointerdown`, una acción
 * encolada— **emite antes la lectura**: el orden en el transporte es vista, lectura, acción, y
 * así ninguna acción de SM-5 o SM-7 queda fuera de su denominador.
 *
 * **Volver por la caché de atrás y adelante** (`pageshow` con `persisted`) es una carga nueva:
 * la lectura puede volver a salir, `primera` y el reloj vuelven a cero y las Marcas de llegada se
 * olvidan —esa llegada no vino de la cuenta ni del botón— y no se vuelven a leer, pero no se
 * emite ninguna vista: la página no se volvió a servir.
 *
 * Lo que viaja con cada evento son **exactamente** las claves que el vocabulario le declara y
 * que el fichero sabe producir (Historia 23.2, AD-13): el nombre del evento, la ruta de la
 * página y, según el evento, las Marcas de llegada —solo con las vistas declaradas y la lectura:
 * una acción no las lleva, ni una vista que pida una isla, ni una isla puede ponerlas por
 * argumento—, el destino —cotejado con el conjunto
 * de su evento—, `primera` o, solo en la búsqueda sin resultados, el texto de la consulta. Un
 * campo declarado sin valor legítimo viaja como `null`; uno que el evento no declara no viaja.
 * Nada más. No hay identificador de
 * visitante, ni se genera uno, ni se lee ni se escribe ninguna cookie ni ningún almacenamiento,
 * ni viaja la hora. Lo fija la prueba de correspondencia de `tests/unit/vocabulario.test.ts`,
 * evento por evento y valor por valor.
 *
 * Las Marcas de llegada se cotejan **aquí**, contra su conjunto cerrado —las cuentas propias, los
 * destinos de compartir—, antes de que salgan de la página. Llegan en la URL, y todo lo que llega
 * en la URL lo escribe cualquiera: sin cotejarlas, `?de=` o `?via=` admitirían el texto que les
 * pusieran —incluido algo que identifique a quien pulsó el enlace o a quien lo compartió— y la
 * medición lo registraría sin más. `via` nombra el botón, nunca a quien comparte ni a quien abre
 * (NFR-11). Un evento que el fichero no emite se descarta igual que uno inventado, venga de la
 * cola o de una llamada directa: la tabla es un objeto, y se pregunta por sus claves propias para
 * que `toString` no pase por evento.
 *
 * Se emite compacto —nombres cortos, sin sangrado— y envuelto en una función para no dejar
 * globales sueltas: lo legible es esta función y sus comentarios, que no viajan. No importa
 * nada: es un guion clásico con `defer`, y la lista cerrada de `src/lib/guiones.ts` lo exige.
 * El umbral, la correspondencia de métricas, los conjuntos y los nombres de las marcas se componen
 * desde sus módulos, nunca se escriben aquí. Su tope es `MAX_BYTES_GUION_DE_MEDICION`.
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
  // El conjunto de la descarga que impone el navegador: el mismo que coteja su `destino`.
  const destinosDeDescarga = nombreDe(DESTINOS_DE_DESCARGA);
  // Sin ningún campo de conjunto cerrado no hay ninguna variable de conjunto: la lista se compone
  // por piezas para que no quede una coma suelta (`var q=…,,s=…` no es JavaScript).
  const variables = [
    'q=window.__medir&&__medir.q||[]',
    ...[...conjuntos].map(([texto, nombre]) => `${nombre}=${texto}`),
    `s={${tabla.join(',')}}`,
    `W=${JSON.stringify(EVENTOS_DE_VISTA)}`,
    `M=${JSON.stringify(METRICA_DE_ACCION)}`,
    `F=${JSON.stringify(EVENTOS_SOLO_DEL_FICHERO)}`,
    `N=${JSON.stringify(MARCAS_DE_LLEGADA)}`,
    `R=${SIN_MARCAS_DE_LLEGADA}`,
    'P={}',
    'o,w,D,V,L,C,I,T',
  ].join(',');
  const lectura = JSON.stringify(EVENTOS.lectura);
  const descarga = JSON.stringify(EVENTOS.descargaDeImagen);

  /*
   * Las variables del fichero, por su nombre corto:
   *
   *   · q, la cola del arranque; A0…, los conjuntos; s, la tabla de cada evento; W, los eventos
   *     de vista, los únicos que salen de `data-vistas`;
   *   · M, la métrica de cada acción (`METRICA_DE_ACCION`); F, los eventos que solo emite el
   *     fichero; P, las métricas que ya contaron su primera en esta carga;
   *   · N, los parámetros de las dos Marcas de llegada (`MARCAS_DE_LLEGADA`); R, la función pura
   *     que las quita de una búsqueda (`SIN_MARCAS_DE_LLEGADA`);
   *   · o, la Marca de origen y w, la de difusión, leídas al activarse y olvidadas al emitir la
   *     lectura; D, si lo que se compone ahora lleva las marcas —solo mientras el fichero emite
   *     las vistas declaradas o la lectura—; V, si la página es superficie con lectura; L, si la
   *     lectura de esta carga ya salió;
   *   · C, los milisegundos visibles acumulados; I, el `performance.now()` en que empezó el rato
   *     visible en curso (-1 si no hay ninguno); T, el temporizador de la lectura.
   *
   * Y sus funciones: b compone y envía un evento; e es `__medir`; h para el reloj y suma el rato;
   * g lo rearma con lo que falta, si toca —o emite la lectura, si el rato ya la cumplió y el
   * temporizador llegó tarde—; l emite la lectura, si toca, y olvida las marcas; n empieza una
   * carga; a activa el fichero: lee las marcas, las quita de la dirección y emite las vistas.
   */
  return (
    `(function(){` +
    `var ${variables};` +
    `function b(v,t,z,y){` +
    `try{` +
    `var c={evento:v,ruta:location.pathname},m=[D&&o,t,z,y,D&&w];` +
    `s[v].forEach(function(f){var x=m[f[1]];c[f[0]]=f[2]?f[2].indexOf(x)<0?null:x:x||null});` +
    `c=JSON.stringify(c);` +
    `if(navigator.sendBeacon)navigator.sendBeacon(${JSON.stringify(url)},c)` +
    `}catch(x){}` +
    `}` +
    `function e(v,t,z){` +
    `if(!s.hasOwnProperty(v)||F.indexOf(v)>=0)return;` +
    `var k=M[v],y;` +
    `if(k){l();y=v==${descarga}&&${destinosDeDescarga}.indexOf(z)>=0||P[k]?${JSON.stringify(PRIMERA_NO)}:(P[k]=1,${JSON.stringify(PRIMERA_SI)})}` +
    `b(v,t,z,y);` +
    `return 1` +
    `}` +
    `function h(){I>=0&&(C+=performance.now()-I);I=-1;clearTimeout(T)}` +
    `function g(){h();V&&!L&&(C<${MIN_MS_VISIBLES_PARA_LA_LECTURA}?document.visibilityState!='hidden'&&(I=performance.now(),T=setTimeout(l,${MIN_MS_VISIBLES_PARA_LA_LECTURA}-C)):l())}` +
    `function l(){V&&!L&&(L=1,h(),D=1,b(${lectura}),D=o=w=null)}` +
    `function n(){h();L=C=0;P={};g()}` +
    `function a(){` +
    `var u=new URLSearchParams(location.search),x;` +
    `o=u.get(N[0]);w=u.get(N[1]);` +
    `try{x=R(location.search,N);x!=location.search&&history.replaceState(history.state,'',location.origin+location.pathname+x+location.hash)}catch(y){}` +
    `D=1;` +
    `(document.documentElement.dataset.vistas||'').split(' ').forEach(function(v){W.indexOf(v)>=0&&e(v)&&(V=1)});` +
    `D=0;` +
    `n();` +
    `window.__medir=e;` +
    `${JSON.stringify(INTERACCIONES_DE_LECTURA)}.forEach(function(k){addEventListener(k,l,{capture:true,passive:true})});` +
    `document.addEventListener('visibilitychange',g);` +
    `addEventListener('pageshow',function(x){x.persisted&&(o=w=null,n())});` +
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
