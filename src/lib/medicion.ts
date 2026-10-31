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
  TRAMOS,
  ZONAS,
  claveEnLaBaliza,
  filtrosUsados,
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
 * Los eventos de vista, como lista — Historias 20.1, 23.1, 23.5 y 23.9.
 *
 * El fichero solo emite de `data-vistas` lo que está aquí, y solo una vista emitida hace de la
 * página una **superficie con lectura**. El tipo `EventoDeVista` sale de esta lista, y no al
 * revés: una vista nueva que se declarara en el tipo y no aquí saldría al `data-vistas` y el
 * fichero la descartaría en silencio —sin vista ni lectura—. Así hay un solo sitio donde añadirla,
 * y así entró la de la Obra con la Historia 23.9: `vista-de-obra`, que emite la página 1 de toda
 * Obra, se indexe o no, con su marca `indexable` (`ATRIBUTO_DE_INDEXABLE`). En el navegador, donde
 * el tipo no llega, la lista sostiene lo mismo: una acción escrita en `data-vistas` no sale en cada
 * carga ni enciende la lectura.
 */
export const EVENTOS_DE_VISTA = [EVENTOS.vistaDeCita, EVENTOS.vistaDeSuperficie, EVENTOS.vistaDeObra] as const;

/**
 * Los eventos que una página emite por estar vista, y no por un gesto — Historias 20.1, 23.1 y
 * 23.9. Es lo único que una `Superficie` puede declarar como vista: con `Evento` a secas, una
 * declaración podía poner `copiado` y el fichero lo emitiría en cada carga.
 */
export type EventoDeVista = (typeof EVENTOS_DE_VISTA)[number];

/**
 * Los eventos que el fichero sabe emitir — Historias 23.2, 23.5, 23.7, 23.8 y 23.9.
 *
 * Desde la Historia 23.9 son **todos** los del vocabulario: `vista-de-obra` fue el último, y entró
 * aquí en el mismo diff que lo sacó de los pendientes de `tests/unit/vocabulario.test.ts`. Sale de
 * `data-vistas` como las otras dos vistas —la página 1 de toda Obra la declara, se indexe o no—,
 * con la marca que el build escribe en el `<html>` (`ATRIBUTO_DE_INDEXABLE`); no es de
 * `EVENTOS_SOLO_DEL_FICHERO` y ninguna isla la pide. La `lectura` entró con la 23.5 y la
 * `salida-interna` con la 23.7, y las dos las emite solo el fichero (`EVENTOS_SOLO_DEL_FICHERO`).
 * La `busqueda` entró con la 23.8, y al revés: la pide la isla de `/buscar/` al asentarse un
 * estado, y el fichero envía **cada una** que recibe —qué estado cuenta y cuándo lo decide la isla
 * con `asentamientoDeBusqueda`, nunca el fichero—.
 */
export const EVENTOS_DEL_GUION: readonly Evento[] = [
  EVENTOS.vistaDeCita,
  EVENTOS.vistaDeSuperficie,
  EVENTOS.vistaDeObra,
  EVENTOS.lectura,
  EVENTOS.salidaInterna,
  EVENTOS.busqueda,
  EVENTOS.copiado,
  EVENTOS.descargaDeImagen,
  EVENTOS.busquedaSinResultados,
  EVENTOS.comparticionDeImagen,
  EVENTOS.comparticionDeEnlace,
];

/**
 * Los eventos que el fichero emite por su cuenta y **nunca** a petición — Historias 23.5 y 23.7.
 *
 * `__medir` —la función pública del fichero, a la que llaman las islas— los descarta igual que
 * un evento inventado, venga la llamada directa o de la cola, y sin gastar nada: que una carga se
 * leyó lo decide el fichero con su reloj y sus escuchas, y por qué enlace se fue quien leía lo
 * decide su escucha de `click` con la zona que pintó el build. Una isla que emitiera la lectura
 * contaría como leída una carga que nadie miró, o dos veces la misma; una que emitiera la salida
 * pondría la zona que quisiera, o gastaría la de la carga sin que nadie saliera. Por eso tampoco
 * pasan por `window.__medir`, y el espía de `tests/e2e/ayuda/espia.ts` no los ve.
 */
export const EVENTOS_SOLO_DEL_FICHERO: readonly Evento[] = [EVENTOS.lectura, EVENTOS.salidaInterna];

/**
 * De dónde saca el fichero cada campo que sabe producir — Historias 23.2 y 23.5 a 23.9.
 *
 *   · 0 — la Marca de origen, leída de la dirección (`?de=`) una sola vez, al activarse;
 *   · 1 — el segundo argumento de `__medir`: el texto de la búsqueda sin resultados o, en la
 *     `busqueda`, el rótulo del tramo de su total;
 *   · 2 — el tercero: el destino que nombra la isla o, en la `busqueda`, la combinación de filtros;
 *   · 3 — `primera`, que **calcula el fichero** al emitir cada acción, con su memoria de la
 *     carga: ninguna isla la pasa ni la sabe (AD-13, SM-5, SM-7);
 *   · 4 — la Marca de difusión, leída de la dirección (`?via=`) a la vez que la de origen y por
 *     el mismo lector. Tampoco la pasa ninguna isla: un argumento de más a `__medir` no la pone;
 *   · 5 — la Zona de salida interna, que lee **la escucha de `click`** del contenedor más cercano
 *     que la declara (`ATRIBUTO_DE_ZONA`) y que nunca pasa por `__medir`;
 *   · 6 — la marca de la Obra (`indexable`, Historia 23.9): el valor del atributo
 *     `ATRIBUTO_DE_INDEXABLE` del `<html>`, que el fichero lee **una vez al activarse**, junto con
 *     `data-vistas`. Lo escribe el build desde la misma lista de rutas indexables que pinta el
 *     `noindex`; el fichero no calcula la indexabilidad ni la deduce de la dirección. Tampoco la
 *     pasa ninguna isla.
 *
 * El tramo y los filtros los pasa la isla tal como se los da `asentamientoDeBusqueda`, y el
 * fichero los coteja con su conjunto del vocabulario como todo campo: un valor ajeno viaja como
 * `null`. Nunca viaja el número de resultados ni el texto buscado (NFR-11). La marca de la Obra se
 * coteja igual, contra `MARCAS_DE_OBRA` por la tabla: ajena o ausente, viaja como `null` y la vista
 * sale igual. Desde la 23.9 el fichero produce todos los campos del vocabulario.
 */
const FUENTE_EN_EL_GUION: { readonly [C in Campo]?: 0 | 1 | 2 | 3 | 4 | 5 | 6 } = {
  origen: 0,
  consulta: 1,
  destino: 2,
  primera: 3,
  via: 4,
  zona: 5,
  tramo: 1,
  filtros: 2,
  indexable: 6,
};

/** Los dos valores de `primera`, nombrados contra su tipo del vocabulario (`PRIMERA`). */
const PRIMERA_SI = 'si' satisfies Primera;
const PRIMERA_NO = 'no' satisfies Primera;

/** Los campos que el fichero sabe producir: desde la 23.9, todos los del vocabulario. */
// `@__PURE__` desde la Historia 27.2: el guion empaquetado de la búsqueda importa este módulo y no la usa.
export const CAMPOS_DEL_GUION = /* @__PURE__ */ Object.keys(FUENTE_EN_EL_GUION) as readonly Campo[];

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
 *
 * Con valor, tiene que ser `http(s)://` —la misma regla que `npm run medicion` aplica con
 * `puntoFinalDeComprobacion`, por `problemaDelPuntoFinal`—, y si no lo es **la construcción se
 * para**: un secreto mal escrito construía en verde y `sendBeacon` mandaba cada evento a una
 * ruta relativa del propio sitio, donde se perdía sin que nada protestara. La máquina propia sí
 * vale aquí, a diferencia de en la orden: las pruebas de punta a punta construyen contra el
 * receptor local.
 */
export function puntoFinal(entorno: Record<string, string | undefined>): string | null {
  const url = entorno.MEDICION_ENDPOINT?.trim();
  if (!url) return null;
  const problema = problemaDelPuntoFinal(url);
  if (problema !== undefined) {
    throw new Error(
      `${problema} Sin una dirección absoluta, cada evento iría a una ruta del propio sitio y se ` +
        'perdería: corrija el secreto (DESPLIEGUE.md §3) o quítelo para construir sin medición.',
    );
  }
  return url;
}

/**
 * Por qué una dirección no vale como punto final de la medición, o `undefined` si vale: tiene
 * que ser una URL absoluta `http:` o `https:`. Es la regla única de `MEDICION_ENDPOINT`, que
 * comparten el build (`puntoFinal`) y `npm run medicion` (`puntoFinalDeComprobacion`), y el
 * motivo **no repite el valor**: es un secreto del repositorio.
 */
export function problemaDelPuntoFinal(url: string): string | undefined {
  let direccion: URL;
  try {
    direccion = new URL(url);
  } catch {
    return 'MEDICION_ENDPOINT no es una dirección http(s).';
  }
  if (direccion.protocol !== 'http:' && direccion.protocol !== 'https:') {
    return 'MEDICION_ENDPOINT no es una dirección http(s).';
  }
  return undefined;
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
 * Dónde se declara la Zona de salida interna — FR-56, UX-DR111, Historia 23.7.
 *
 * La lleva el **contenedor** que pinta el build, nunca el enlace: así lo que inserte el cliente
 * dentro —los resultados de `/buscar/`— la hereda sin que ninguna isla sepa de zonas. La escucha
 * del fichero toma la declaración más cercana al enlace pulsado (`closest`), así que una zona
 * anidada —los Chips de Tema dentro de las Rutas de salida— manda sobre la de fuera. El valor es
 * de `ZONAS` del vocabulario; uno ajeno no se envía.
 *
 * En los seis componentes de enlace compartidos (`TarjetaDeCita`, `Chips`, `Paginacion`,
 * `ListaDeObras`, `RutasDeSalida`, `Atribucion`) la zona es una prop `zona: Zona` obligatoria, de
 * modo que un uso nuevo que la olvide no pasa `astro check`; en los contenedores propios de una
 * página va escrita como atributo. Una prueba de `tests/unit/medicion.test.ts` sobre `dist/` exige
 * zona o exención en todo enlace interno de `main` de toda página que carga este fichero —con
 * lectura o sin ella—, y otra fija qué zona lleva cada sitio.
 */
export const ATRIBUTO_DE_ZONA = 'data-zona';

/**
 * Dónde escribe el build la marca de la Obra — FR-51, FR-52, AD-6, Historia 23.9.
 *
 * Un atributo del `<html>`, junto a `data-vistas`, y solo en la página 1 de una Obra: su valor es
 * de `MARCAS_DE_OBRA` del vocabulario —`indexable` o `no-indexable`— y es **lo mismo que dice su
 * `noindex`**, porque las dos cosas salen de `consecuenciasDe` de `src/lib/superficies.ts`, que
 * las deriva de la lista de rutas indexables declarada (FR-52 y `CONGELACION_DE_OBRAS` ya
 * aplicados). `Armazon.astro` la escribe con este nombre, el fichero de medición la lee con este
 * nombre —una vez, al activarse— y la comprobación de `astro:build:done`
 * (`tools/lib/indexables.ts`) la coteja con el `noindex` de cada página construida, por si alguna
 * vez dejan de salir del mismo sitio. Se queda en `dist/` también sin punto final, como
 * `data-vistas`.
 */
export const ATRIBUTO_DE_INDEXABLE = 'data-indexable';

/**
 * La exención escrita: un contenedor cuyos enlaces internos **no** son salida medida, con su
 * motivo de `EXENCIONES_DE_ZONA` como valor. Si es la declaración más cercana al enlace pulsado,
 * no sale nada, ni se gasta la salida de la carga, aunque haya una zona más arriba.
 */
export const ATRIBUTO_SIN_ZONA = 'data-sin-zona';

/**
 * Los motivos de exención de hoy — UX-DR111, Historia 23.7. Son enlaces que la tabla de zonas de
 * `EXPERIENCE.md` no nombra, exentos por escrito (la Historia 23.7, y para las salidas de la
 * búsqueda sin resultados la decisión de Héctor del 2026-10-19 en `EXPERIENCE.md § Zonas de
 * salida interna`), porque una zona nueva cambiaría el vocabulario —y con él la huella de AD-14 y
 * otro despliegue del receptor—; se revisan en la pasada de métricas. Es un conjunto cerrado: una
 * exención nueva la decide Héctor, igual que una zona nueva.
 *
 *   · `chips-del-404` — los Chips de Tema del 404;
 *   · `salidas-sin-resultados` — las salidas que `/buscar/` enseña cuando una búsqueda no
 *     encuentra nada (`[data-salida]`: Temas, Colecciones y Autores), fuera del contenedor de
 *     resultados;
 *   · `directorios-del-aviso` — Historia 27.7, decisión de Héctor del 2026-10-22 (epics § 27.7 y
 *     § Épica 23): los dos Directorios de los avisos de `/buscar/` —sin guion, antes de que
 *     arranque la isla y el del índice que no carga—, fuera del contenedor `resultado`. Esa
 *     búsqueda no corrió y no se asienta: en `resultado`, SM-13 sumaría salidas sin denominador.
 *
 * Los formularios —«Buscar en…», el campo de la portada y el del 404— no necesitan exención: la
 * escucha solo mira enlaces, y enviarlos no es salida. Tampoco las anclas de la propia página ni
 * los enlaces a otro origen, que la escucha descarta por sí misma.
 */
export const EXENCIONES_DE_ZONA = ['chips-del-404', 'salidas-sin-resultados', 'directorios-del-aviso'] as const;

/** Un motivo de exención de zona (`EXENCIONES_DE_ZONA`). */
export type ExencionDeZona = (typeof EXENCIONES_DE_ZONA)[number];

/**
 * La marca de una búsqueda asentada en su entrada del historial — Historia 23.8, AD-13.
 *
 * Es la **clave** que la isla de `/buscar/` pone a `true` en el objeto de estado de su entrada
 * (`history.state`) al asentar un estado, con `history.replaceState(…, '')`: sin argumento de
 * dirección, así que la dirección no cambia y no se abre ninguna entrada. Lleva el booleano y nada
 * más —ni el texto, ni la hora, ni nada que identifique a nadie (NFR-11)— y no sale del navegador:
 * solo sirve para que volver a esa entrada o recargarla no cuente otra vez la misma búsqueda.
 */
export const MARCA_DE_BUSQUEDA_ASENTADA = 'asentada';

/** Lo que la isla de `/buscar/` ve en un momento dado: el texto tal como se buscó, sus filtros y el total. */
export interface EstadoDeBusqueda {
  readonly texto: string;
  readonly filtros: string;
  /**
   * Los **valores** de los filtros elegidos —qué Autor, qué Tema—, compuestos por la isla en una
   * cadena (Historia 27.2). Entran en la clave, para que otro Autor sea otro estado aunque la
   * combinación sea la misma; no viajan en ningún evento. Sin filtros, se omite.
   */
  readonly valores?: string;
  /** `respuesta.results.length`: el total, nunca los resultados pintados. */
  readonly total: number;
}

/** Las constantes que la parte pura del asentamiento recibe, compuestas desde el vocabulario. */
export interface ConstantesDelAsentamiento {
  readonly busqueda: string;
  readonly sinResultados: string;
  readonly tramos: readonly { readonly desde: number; readonly rotulo: string }[];
  readonly sinFiltros: string;
  readonly marca: string;
}

/** La combinación de filtros de una búsqueda sin filtros: «ninguno», hasta la Épica 27. */
const SIN_FILTROS = filtrosUsados({ autor: false, obra: false, tema: false });
if (SIN_FILTROS === null) throw new Error('medicion.ts: el vocabulario no declara la combinación sin filtros.');

/**
 * Las constantes del asentamiento — Historia 23.8: los dos eventos, los tramos del vocabulario (con
 * sus cortes y sus rótulos), la combinación sin filtros y la clave de la marca. Se componen aquí,
 * desde sus módulos, y el guion de la búsqueda (`src/components/Busqueda.astro`) las importa desde
 * la Historia 27.2: ni el guion ni `buscar.astro` escriben un rótulo de tramo, un corte ni un
 * nombre de evento. Cambiar un corte en el vocabulario cambia lo que la isla emite sin tocarla.
 */
export const ASENTAMIENTO_DE_BUSQUEDA: ConstantesDelAsentamiento = {
  busqueda: EVENTOS.busqueda,
  sinResultados: EVENTOS.busquedaSinResultados,
  tramos: TRAMOS,
  sinFiltros: SIN_FILTROS,
  marca: MARCA_DE_BUSQUEDA_ASENTADA,
};

/**
 * La parte pura de la búsqueda asentada — Historia 23.8, FR-56, FR-8, AD-13, SM-6, SM-13.
 *
 * Una búsqueda **cuenta una vez, cuando se asienta**: no por tecla ni por repintado, sino cuando
 * quien busca se decide —envía el formulario, pulsa un resultado o se va (la página se oculta)—, y
 * como mucho una vez por estado distinto en la carga. Qué disparador asienta y cuál es el estado
 * que se ve lo sabe la isla de `/buscar/`; qué se emite ante ese estado, si una llegada ya estaba
 * registrada y cómo se marca la entrada lo decide **esta función**, y nada más. Recibe las
 * constantes (`ASENTAMIENTO_DE_BUSQUEDA`) y devuelve cuatro funciones puras:
 *
 *   · `clave(texto, filtros, valores?)` — la identidad de un estado: el texto recortado en los
 *     extremos (sin tocar mayúsculas: «Viento» y «viento» son dos búsquedas), la combinación de
 *     filtros y, si los hay, sus valores (Historia 27.2: «autor» con José Martí y «autor» con
 *     Séneca son dos estados). «viento » y «viento» son el mismo estado; sin valores, la clave es
 *     la de la 23.8;
 *   · `emisiones(estado, registradas)` — `null` si no hay estado, si su total no es un entero ≥ 0
 *     (la búsqueda no corrió: el índice no cargó o falló), si no tiene texto ni filtros —no es una
 *     búsqueda— o si su clave ya está entre las registradas de la carga. Si no, la clave y los
 *     eventos, en orden: `[busqueda, tramo del total, filtros]` y, solo con texto y total 0,
 *     `[busqueda-sin-resultados, el texto tal como se buscó]` (FR-8, el único texto libre). Un
 *     filtrado sin texto y sin resultados da solo la `busqueda` en el tramo 0: sin texto no hay
 *     consulta que registrar. El tramo es el de `TRAMOS` del vocabulario, el mismo de `tramoDe`;
 *   · `yaRegistrada(estadoDeLaEntrada, tipo)` — si una llegada a un estado cuenta como ya
 *     asentada: con objeto de estado en la entrada, si lleva la marca a `true`; sin él, si la carga
 *     es `back_forward` o `reload` (Navigation Timing, el respaldo de la entrada que no lleva
 *     objeto). Cualquier otro tipo, o ninguno, no;
 *   · `marcada(estadoDeLaEntrada)` — el objeto que la isla escribe en su entrada: una copia del que
 *     hubiera, con sus demás claves y la marca a `true`, sin mutarlo; o uno nuevo con solo la marca.
 *
 * **Se importa**, desde la Historia 27.2: el guion de la búsqueda es el `<script>` empaquetado de
 * `src/components/Busqueda.astro`, que la importa con sus constantes (AD-6). Hasta entonces viajaba
 * por su texto dentro de un guion en línea, y de ahí le quedan tres hábitos que se conservan porque
 * no cuestan nada y la prueba que la evalúa por su texto sigue en pie: es autocontenida —no lee
 * nada de este módulo ni importa nada, y su texto, evaluado en un contexto vacío, funciona igual—,
 * no lleva comentarios dentro ni funciones con nombre (un empaquetado con `keepNames` las
 * envolvería en `__name`), solo métodos. Lo vigila `tests/unit/medicion.test.ts`, que la llama
 * directa y por su texto, y ejecuta el fichero de `dist/` que la lleva.
 */
export function asentamientoDeBusqueda(c: ConstantesDelAsentamiento) {
  const a = {
    clave(texto: string, filtros: string, valores?: string): string {
      return JSON.stringify(valores ? [texto.trim(), filtros, valores] : [texto.trim(), filtros]);
    },
    emisiones(
      estado: EstadoDeBusqueda | null | undefined,
      registradas: readonly string[],
    ): { clave: string; eventos: string[][] } | null {
      if (!estado || !Number.isInteger(estado.total) || estado.total < 0) return null;
      const texto = estado.texto.trim();
      const k = a.clave(estado.texto, estado.filtros, estado.valores);
      if ((texto === '' && estado.filtros === c.sinFiltros) || registradas.indexOf(k) >= 0) return null;
      let tramo = '';
      for (const t of c.tramos) if (estado.total >= t.desde) tramo = t.rotulo;
      const eventos = [[c.busqueda, tramo, estado.filtros]];
      if (texto !== '' && estado.total === 0) eventos.push([c.sinResultados, estado.texto]);
      return { clave: k, eventos };
    },
    yaRegistrada(estadoDeLaEntrada: unknown, tipo?: string | null): boolean {
      return estadoDeLaEntrada !== null && typeof estadoDeLaEntrada === 'object'
        ? (estadoDeLaEntrada as Record<string, unknown>)[c.marca] === true
        : tipo === 'back_forward' || tipo === 'reload';
    },
    marcada(estadoDeLaEntrada: unknown): Record<string, unknown> {
      return Object.assign(
        {},
        estadoDeLaEntrada !== null && typeof estadoDeLaEntrada === 'object' ? estadoDeLaEntrada : {},
        { [c.marca]: true },
      );
    },
  };
  return a;
}

/**
 * El fichero de medición — AD-6, AD-13, Historias 23.1 y 23.5 a 23.9.
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
 *   2. lee la marca de la Obra del `<html>` (`ATRIBUTO_DE_INDEXABLE`), **una vez**, y emite las
 *      vistas que la página declara en `data-vistas` del `<html>`, que salen de
 *      `src/lib/superficies.ts` y no de la página (ninguna página elige su vista); de ahí solo
 *      salen eventos de `EVENTOS_DE_VISTA`. Si emite alguna, la página es **superficie con
 *      lectura**; si no —páginas 2+, `/buscar/`, 404—, no habrá lectura nunca;
 *   3. empieza la carga: la memoria de `primera` vacía y el reloj de la lectura en marcha;
 *   4. se instala como `__medir`, de modo que lo que llegue después ya no se encola, y pone sus
 *      escuchas —las de la lectura y la de la salida interna—;
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
 * búsqueda —su estado, `?q=&autor=&obra=&tema=`, cuando este fichero ya las quitó: lo garantiza el
 * orden del documento, no la microtarea tras la que lee, porque este fichero (`defer`) va antes que
 * el guion de la búsqueda (`type="module"`) y los dos corren en ese orden; lo fija una prueba de
 * `tests/unit/medicion.test.ts`— y la única que escribe además en el historial es
 * ella: `history.replaceState` con la marca de su búsqueda asentada
 * (`MARCA_DE_BUSQUEDA_ASENTADA`) en el objeto de estado, sin dirección (Historia 23.8), y, desde la
 * Historia 27.4, `history.pushState` y `history.replaceState` con la dirección **compuesta desde su
 * estado** —nunca copiando `location.search`, así que las marcas no vuelven— y el estado en el
 * objeto de la entrada. Todo, solo desde sus escuchas o tras esa microtarea —nunca al analizarse—.
 * Este fichero conserva al quitar las marcas el `history.state` que hubiera. El fichero no lee ese
 * estado: no descarta ninguna `busqueda`. Sin punto final no hay fichero, y la
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
 * **La Salida interna** (Historia 23.7, FR-56): por qué enlace siguió quien leía. Una sola escucha
 * de `click`, en la ventana y en burbuja —no en captura: así ve el `defaultPrevented` de una isla
 * que se queda con el clic—, puesta al activarse. Es salida un clic en un enlace (`a[href]`, el más
 * cercano al objetivo) con el botón principal, sin modificador, sin `defaultPrevented`, sin
 * `download`, sin un `target` que no sea vacío o `_self` —en mayúsculas o minúsculas, como lo lee
 * el navegador; lo que se abre en pestaña nueva no se mide, así que toda continuación es cota
 * inferior—, del mismo origen y a **otra ruta**: un ancla
 * o la propia ruta con otra búsqueda no sacan de la página. Enviar un formulario tampoco: la
 * escucha solo mira enlaces. La zona es la de la declaración más cercana al enlace
 * (`ATRIBUTO_DE_ZONA` o `ATRIBUTO_SIN_ZONA`): si es una exención, si no hay ninguna o si su valor
 * no es de `ZONAS`, no sale nada, ni se gasta la salida ni se fuerza la lectura —«un enlace que no
 * figura en la tabla no pertenece a ninguna zona y no se registra» (EXPERIENCE.md)—. Si es salida,
 * sale **como mucho una por carga** y **detrás de la lectura**: en una superficie con lectura que
 * todavía no la emitió (un clic de `element.click()`, sin `pointerdown`), la emite antes. Lleva la
 * ruta de la página y la zona; nada más: ni el destino, ni el texto pulsado, ni las marcas, ni
 * nada que encadene esta carga con la siguiente (NFR-11). La emite solo el fichero
 * (`EVENTOS_SOLO_DEL_FICHERO`). Una isla que parara la propagación del clic en un enlace
 * (`stopPropagation`) sin `preventDefault` lo escondería de la escucha y la salida no se mediría:
 * ninguna lo hace, y una que lo necesite tiene que decirlo aquí. Y una isla que se quede con el
 * clic de un enlace llama a `preventDefault` desde el enlace, el documento o un antepasado, nunca
 * desde una escucha de `click` en la ventana: esta está en la ventana desde la activación, y la de
 * una isla puesta después correría detrás, con la salida ya emitida y gastada. Ninguna isla hace
 * ninguna de las dos cosas, y una prueba de `tests/unit/medicion.test.ts` lo vigila sobre el texto
 * de las fuentes: ve las formas directas (`addEventListener('click', …)` a secas o sobre la ventana,
 * `onclick =` en la ventana, `stopPropagation(`), no un nombre de evento que llegue en una variable.
 *
 * **La vista de Obra** (Historia 23.9, FR-51): la página 1 de **toda** Obra declara
 * `vista-de-obra` en su `data-vistas`, se indexe o no, y el fichero la emite como una vista más
 * —con las Marcas de llegada, antes de la lectura—, así que la Obra que no se indexa es también
 * superficie con lectura y sus salidas salen detrás de ella. Lleva además la marca `indexable`
 * que el build escribió en el `<html>`, cotejada con `MARCAS_DE_OBRA` por la tabla: una ajena o
 * ninguna viaja como `null` y la vista sale igual. La Obra indexable declara dos vistas, en este
 * orden: `vista-de-superficie` —la de SM-8, como toda agregación de producto— y `vista-de-obra`;
 * la lectura sale una vez, detrás de las dos. La marca solo viaja con el evento que la declara:
 * ni la `vista-de-superficie`, ni la lectura, ni las acciones la llevan.
 *
 * **Volver por la caché de atrás y adelante** (`pageshow` con `persisted`) es una carga nueva:
 * la lectura y la salida pueden volver a salir, `primera` y el reloj vuelven a cero y las Marcas
 * de llegada se olvidan —esa llegada no vino de la cuenta ni del botón— y no se vuelven a leer,
 * pero no se emite ninguna vista: la página no se volvió a servir.
 *
 * Lo que viaja con cada evento son **exactamente** las claves que el vocabulario le declara y
 * que el fichero sabe producir (Historia 23.2, AD-13): el nombre del evento, la ruta de la
 * página y, según el evento, las Marcas de llegada —solo con las vistas declaradas y la lectura:
 * una acción no las lleva, ni una vista que pida una isla, ni una isla puede ponerlas por
 * argumento—, la marca de la Obra —solo con la vista de Obra que declara la página: una que pida una
 * isla sale con ella nula—, el destino —cotejado con el conjunto
 * de su evento—, `primera`, la zona de la salida, el tramo y los filtros de la `busqueda` —los
 * rótulos que le pasa la isla, cotejados con sus conjuntos; nunca el número de resultados ni el
 * texto— o, solo en la búsqueda sin resultados, el texto de la consulta. Un
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
 * El umbral, la correspondencia de métricas, los conjuntos —también el de las zonas y el de las
 * marcas de Obra— y los nombres de las marcas y de los atributos de zona y de la marca de Obra se
 * componen desde sus módulos, nunca se escriben aquí.
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
  // El conjunto de la descarga que impone el navegador: el mismo que coteja su `destino`.
  const destinosDeDescarga = nombreDe(DESTINOS_DE_DESCARGA);
  // El de las zonas: el mismo que coteja la `zona` de la salida interna en la tabla.
  const zonas = nombreDe(ZONAS);
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
    'o,w,D,V,L,C,I,T,S,H',
  ].join(',');
  const lectura = JSON.stringify(EVENTOS.lectura);
  const descarga = JSON.stringify(EVENTOS.descargaDeImagen);
  const salida = JSON.stringify(EVENTOS.salidaInterna);
  const deZona = JSON.stringify(ATRIBUTO_DE_ZONA);
  const sinZona = JSON.stringify(ATRIBUTO_SIN_ZONA);
  const declaracionDeZona = JSON.stringify(`[${ATRIBUTO_DE_ZONA}],[${ATRIBUTO_SIN_ZONA}]`);
  const deIndexable = JSON.stringify(ATRIBUTO_DE_INDEXABLE);

  /*
   * Las variables del fichero, por su nombre corto:
   *
   *   · q, la cola del arranque; A0…, los conjuntos —entre ellos el de las zonas—; s, la tabla
   *     de cada evento; W, los eventos de vista, los únicos que salen de `data-vistas`;
   *   · M, la métrica de cada acción (`METRICA_DE_ACCION`); F, los eventos que solo emite el
   *     fichero; P, las métricas que ya contaron su primera en esta carga;
   *   · N, los parámetros de las dos Marcas de llegada (`MARCAS_DE_LLEGADA`); R, la función pura
   *     que las quita de una búsqueda (`SIN_MARCAS_DE_LLEGADA`);
   *   · o, la Marca de origen y w, la de difusión, leídas al activarse y olvidadas al emitir la
   *     lectura; D, si lo que se compone ahora lleva las marcas —solo mientras el fichero emite
   *     las vistas declaradas o la lectura—; V, si la página es superficie con lectura; L, si la
   *     lectura de esta carga ya salió;
   *   · C, los milisegundos visibles acumulados; I, el `performance.now()` en que empezó el rato
   *     visible en curso (-1 si no hay ninguno); T, el temporizador de la lectura;
   *   · S, si la salida interna de esta carga ya salió; H, la marca de la Obra, leída del `<html>`
   *     al activarse (Historia 23.9), que se coteja al emitir como las demás fuentes y solo usa el
   *     evento que declara `indexable`; como las Marcas de llegada, solo viaja con D —la vista de
   *     Obra que declara la página—, así que una que pidiera una isla saldría con ella nula.
   *
   * Y sus funciones: b compone y envía un evento —su quinto argumento es la zona—; e es `__medir`;
   * h para el reloj y suma el rato; g lo rearma con lo que falta, si toca —o emite la lectura, si
   * el rato ya la cumplió y el temporizador llegó tarde—; l emite la lectura, si toca, y olvida las
   * marcas; k es la escucha de `click` que emite la salida interna; n empieza una carga —también
   * rearma la salida—; a activa el fichero: lee las marcas, las quita de la dirección, emite las
   * vistas y pone las escuchas. Ningún nombre local tapa el de una función que se usa en el mismo
   * cuerpo: dentro de k el enlace es r, y la interacción que recorre a es v; en a, d es el `<html>`.
   */
  return (
    `(function(){` +
    `var ${variables};` +
    `function b(v,t,z,y,j){` +
    `try{` +
    `var c={evento:v,ruta:location.pathname},m=[D&&o,t,z,y,D&&w,j,D&&H];` +
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
    `function k(x){` +
    `var r=x.target&&x.target.closest&&x.target.closest("a[href]"),c,z;` +
    `if(S||!r||x.button||x.defaultPrevented||x.metaKey||x.ctrlKey||x.shiftKey||x.altKey||r.hasAttribute("download")||r.target&&!/^_self$/i.test(r.target)||r.origin!=location.origin||r.pathname==location.pathname)return;` +
    `c=r.closest(${declaracionDeZona});` +
    `z=c&&!c.hasAttribute(${sinZona})&&c.getAttribute(${deZona});` +
    `if(${zonas}.indexOf(z)<0)return;` +
    `S=1;l();b(${salida},0,0,0,z)` +
    `}` +
    `function n(){h();L=C=S=0;P={};g()}` +
    `function a(){` +
    `var u=new URLSearchParams(location.search),d=document.documentElement,x;` +
    `o=u.get(N[0]);w=u.get(N[1]);` +
    `try{x=R(location.search,N);x!=location.search&&history.replaceState(history.state,'',location.origin+location.pathname+x+location.hash)}catch(y){}` +
    `H=d.getAttribute(${deIndexable});` +
    `D=1;` +
    `(d.dataset.vistas||'').split(' ').forEach(function(v){W.indexOf(v)>=0&&e(v)&&(V=1)});` +
    `D=0;` +
    `n();` +
    `window.__medir=e;` +
    `${JSON.stringify(INTERACCIONES_DE_LECTURA)}.forEach(function(v){addEventListener(v,l,{capture:true,passive:true})});` +
    `document.addEventListener('visibilitychange',g);` +
    `addEventListener('click',k);` +
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
