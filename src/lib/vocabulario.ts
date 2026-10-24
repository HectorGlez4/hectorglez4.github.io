/**
 * El vocabulario de la medición — AD-13, AD-14, Historia 23.2.
 *
 * Todo lo que la medición puede registrar, y nada más: los eventos, los campos de cada uno y
 * el conjunto cerrado de valores de cada campo. Vive **aparte** de la emisión, que sigue en
 * `src/lib/medicion.ts`, porque lo importan cuatro sitios que no emiten nada: el receptor
 * (`medicion/receptor.ts`, que corre en un Worker), las pruebas, `tools/` —la orden que
 * despliega el receptor y escribe su huella— y, desde la v8, los guiones empaquetados.
 *
 * **Es puro y solo importa dos hojas sin importaciones**, `destinos.ts` y `redes.ts`, y no
 * copia sus conjuntos: los nombra. Lo vigila `tests/unit/vocabulario.test.ts` con el
 * compilador. Una copia aquí de las redes o de los destinos se quedaría atrás al añadir uno, y
 * el receptor descartaría en silencio lo que el sitio ya envía: un dato que llega a nulo sin
 * error es indistinguible de un cero.
 *
 * **Tocar este fichero mueve la huella** (`medicion/huella-del-vocabulario.json`): `npm test`
 * falla hasta que `npm run medicion -- desplegar` despliegue un receptor que lo sepa guardar
 * (AD-14). Es lo que debe costar.
 *
 * Glosario: una **Lectura** es el acto medido —una carga que se leyó de verdad—, y la página
 * donde ocurre es una «superficie de lectura»; una **Salida interna** es un enlace que sale de
 * la página hacia otra del sitio, desde una **Zona**; la **Marca de origen** (`?de=`) dice de
 * qué cuenta propia llega una visita, y la **Marca de difusión** (`?via=`), por qué destino la
 * compartió alguien.
 */

import { DESTINO_DE_IMAGEN, DESTINO_OPACO, DESTINOS_VALIDOS } from './destinos.ts';
import { PARAMETRO_DE_ORIGEN, REDES_VALIDAS } from './redes.ts';

/** El parámetro de la Marca de origen, `?de=` (FR-22). Vive en `redes.ts` y aquí se nombra. */
export { PARAMETRO_DE_ORIGEN };

/** El parámetro de la Marca de difusión, `?via=` (FR-18, FR-22): por qué destino se compartió. */
export const PARAMETRO_DE_DIFUSION = 'via';

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
   * Tema o Colección, y la página 1 de una Obra indexable) se ha mostrado. Cuenta lo que el
   * Canal trae fuera de la Página de Cita, con la misma marca de origen. Nunca la emite una
   * superficie de servicio —las páginas 2+ de un listado, `/buscar`, `/404`—, ni una interna
   * —`/kit`, `/lote`—, ni la Página de Cita, que ya emite el suyo; el carácter de cada ruta
   * lo declara `src/lib/superficies.ts`. La razón `vista-de-cita / vista-de-superficie` es un
   * agregado por jornada, no una sesión.
   */
  vistaDeSuperficie: 'vista-de-superficie',
  /**
   * FR-51, SM-11 — la página 1 de una Obra se ha mostrado, se indexe o no, con su marca
   * indexable. La emite la Historia 23.9; hasta entonces está en el vocabulario y el receptor
   * ya la sabe guardar.
   */
  vistaDeObra: 'vista-de-obra',
  /**
   * La Lectura — una carga que se leyó de verdad: 8 s de visibilidad acumulada o una
   * interacción antes. Como mucho una por carga. La emite la Historia 23.5.
   */
  lectura: 'lectura',
  /** FR-56 — un enlace interno que sale de la página, con su Zona. La emite la Historia 23.7. */
  salidaInterna: 'salida-interna',
  /**
   * SM-6, SM-13 — una búsqueda asentada, con el tramo de su total y los filtros usados, nunca
   * con el texto. La emite la Historia 23.8.
   */
  busqueda: 'busqueda',
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
 * Las Zonas de salida interna — FR-56, UX-DR111. Las dieciséis de `EXPERIENCE.md § Zonas de
 * salida interna`, en su orden: cada enlace interno registra la más concreta que lo contiene.
 */
export const ZONAS = [
  'cabecera',
  'atribucion',
  'tarjeta-de-obra',
  'siguiente',
  'misma-obra',
  'rutas-de-salida',
  'chip-de-tema',
  'colecciones',
  'listado',
  'paginacion',
  'lista-de-obras',
  'resultado',
  'directorio',
  'cita-del-dia',
  'obras-de-portada',
  'autores-de-portada',
] as const;

export type Zona = (typeof ZONAS)[number];

/**
 * Los tramos del total de una búsqueda asentada — SM-6, SM-13.
 *
 * Son **vocabulario, no umbral** (AD-13): no viven en `umbrales.ts`. Cambiar un corte o un
 * rótulo mueve la huella del vocabulario —`npm test` falla hasta repetir el despliegue del
 * receptor (AD-14)— y exige una entrada en la lista de cortes de serie (Historia 23.10): una
 * serie partida por otros cortes no se compara con la anterior.
 *
 * Cada tramo empieza en `desde` y llega hasta el siguiente, sin incluirlo; el último no tiene
 * techo.
 */
export const TRAMOS = [
  { desde: 0, rotulo: '0' },
  { desde: 1, rotulo: '1-9' },
  { desde: 10, rotulo: '10-29' },
  { desde: 30, rotulo: '30+' },
] as const;

export type RotuloDeTramo = (typeof TRAMOS)[number]['rotulo'];

/** El tramo de un total de resultados. Un total negativo o que no es entero no tiene tramo. */
export function tramoDe(total: number): RotuloDeTramo | null {
  if (!Number.isInteger(total) || total < 0) return null;
  let rotulo: RotuloDeTramo | null = null;
  for (const tramo of TRAMOS) if (total >= tramo.desde) rotulo = tramo.rotulo;
  return rotulo;
}

/**
 * Los filtros usados en una búsqueda — FR-7, Épica 27. Las seis combinaciones válidas: la
 * Obra nunca va sin su Autor. «ninguno» hasta que lleguen los filtros.
 */
export const FILTROS = [
  'ninguno',
  'autor',
  'tema',
  'autor-tema',
  'autor-obra',
  'autor-obra-tema',
] as const;

export type Filtros = (typeof FILTROS)[number];

/** La combinación de filtros de una búsqueda; `null` si trae Obra sin Autor, que no es válida. */
export function filtrosUsados(usados: { autor: boolean; obra: boolean; tema: boolean }): Filtros | null {
  if (usados.obra && !usados.autor) return null;
  const partes = [usados.autor && 'autor', usados.obra && 'obra', usados.tema && 'tema'].filter(
    (parte): parte is string => typeof parte === 'string',
  );
  const combinacion = partes.length === 0 ? 'ninguno' : partes.join('-');
  return (FILTROS as readonly string[]).includes(combinacion) ? (combinacion as Filtros) : null;
}

/** La marca de `vista-de-obra` — FR-52: lo que la página servida declaraba con su `noindex`. */
export const MARCAS_DE_OBRA = ['indexable', 'no-indexable'] as const;

export type MarcaDeObra = (typeof MARCAS_DE_OBRA)[number];

/** `primera` — si la acción es la primera de su métrica en esa carga (SM-5, SM-7). */
export const PRIMERA = ['si', 'no'] as const;

export type Primera = (typeof PRIMERA)[number];

/**
 * Qué métrica cuenta cada acción con `primera` — AD-13, SM-5, SM-7.
 *
 * SM-5 junta el copiado y la descarga; SM-7, las dos comparticiones. El guion de medición
 * lleva en memoria, por carga, qué métricas ya contó; la correspondencia la declara este
 * módulo, y ninguna isla la sabe.
 */
export const METRICA_DE_ACCION = {
  [EVENTOS.copiado]: 'SM-5',
  [EVENTOS.descargaDeImagen]: 'SM-5',
  [EVENTOS.comparticionDeImagen]: 'SM-7',
  [EVENTOS.comparticionDeEnlace]: 'SM-7',
} as const;

/**
 * Lo que puede llevar `destino` en una `descarga-de-imagen` — AD-7, AD-13.
 *
 * Solo la descarga que impone el navegador al rechazar la compartición, con el destino del
 * botón: `opaco` en la Imagen cuadrada, `instagram-historia` en la Historia. La que elige el
 * visitante va sin destino.
 */
export const DESTINOS_DE_DESCARGA = [DESTINO_OPACO, DESTINO_DE_IMAGEN] as const;

/**
 * Los campos, en el orden de sus columnas en `eventos` — AD-14.
 *
 * Cada uno es una columna `TEXT` nula fuera de los eventos que la llevan: nunca una columna
 * genérica, ni JSON, ni hora. Las tres primeras son de la v7.1; las seis siguientes, de la
 * migración `0001`. Antes de ellas van `jornada`, `evento` y `ruta`, que no son campos de
 * ningún evento sino de todos.
 */
export const CAMPOS = [
  'origen',
  'destino',
  'consulta',
  'via',
  'zona',
  'tramo',
  'filtros',
  'indexable',
  'primera',
] as const;

export type Campo = (typeof CAMPOS)[number];

/**
 * Lo que admite un campo: un conjunto cerrado de valores o, solo en la consulta, `'texto'`.
 * `nulo` dice si su ausencia es un valor legítimo —una visita sin marca, una descarga que
 * eligió el visitante—; si no, solo llega a nulo cuando lo que se envió no era de su conjunto.
 */
export interface DeclaracionDeCampo {
  readonly valores: readonly string[] | 'texto';
  readonly nulo: boolean;
}

const MARCA_DE_ORIGEN: DeclaracionDeCampo = { valores: REDES_VALIDAS, nulo: true };
const MARCA_DE_DIFUSION: DeclaracionDeCampo = { valores: DESTINOS_VALIDOS, nulo: true };
const DE_LA_ACCION: DeclaracionDeCampo = { valores: PRIMERA, nulo: false };
const DESTINO_DE_COMPARTICION: DeclaracionDeCampo = { valores: DESTINOS_VALIDOS, nulo: false };

/**
 * Los campos de cada evento — AD-13. Es la declaración de la que salen el receptor, el guion,
 * la huella y las balizas de prueba de `npm run medicion`: ninguno escribe a mano un evento ni
 * un valor.
 *
 * La Marca de origen y la de difusión viajan solo con las vistas y la lectura de la llegada;
 * una acción no las lleva (AD-13). La consulta es el único texto libre del vocabulario, y solo
 * de la búsqueda sin resultados.
 */
export const CAMPOS_DE_EVENTO: {
  readonly [E in Evento]: { readonly [C in Campo]?: DeclaracionDeCampo };
} = {
  [EVENTOS.vistaDeCita]: { origen: MARCA_DE_ORIGEN, via: MARCA_DE_DIFUSION },
  [EVENTOS.vistaDeSuperficie]: { origen: MARCA_DE_ORIGEN, via: MARCA_DE_DIFUSION },
  [EVENTOS.vistaDeObra]: {
    origen: MARCA_DE_ORIGEN,
    via: MARCA_DE_DIFUSION,
    indexable: { valores: MARCAS_DE_OBRA, nulo: false },
  },
  [EVENTOS.lectura]: { origen: MARCA_DE_ORIGEN, via: MARCA_DE_DIFUSION },
  [EVENTOS.salidaInterna]: { zona: { valores: ZONAS, nulo: false } },
  [EVENTOS.busqueda]: {
    tramo: { valores: TRAMOS.map((tramo) => tramo.rotulo), nulo: false },
    filtros: { valores: FILTROS, nulo: false },
  },
  [EVENTOS.busquedaSinResultados]: { consulta: { valores: 'texto', nulo: false } },
  [EVENTOS.copiado]: { primera: DE_LA_ACCION },
  [EVENTOS.descargaDeImagen]: {
    destino: { valores: DESTINOS_DE_DESCARGA, nulo: true },
    primera: DE_LA_ACCION,
  },
  [EVENTOS.comparticionDeImagen]: { destino: DESTINO_DE_COMPARTICION, primera: DE_LA_ACCION },
  [EVENTOS.comparticionDeEnlace]: { destino: DESTINO_DE_COMPARTICION, primera: DE_LA_ACCION },
};

/**
 * La clave con la que un campo viaja en la baliza, cuando no es su nombre. La consulta viaja
 * como `datos` desde la v1, y el receptor la sigue leyendo de ahí.
 */
export const CLAVE_EN_LA_BALIZA: { readonly [C in Campo]?: string } = { consulta: 'datos' };

/** La clave de la baliza que lleva un campo. */
export function claveEnLaBaliza(campo: Campo): string {
  return CLAVE_EN_LA_BALIZA[campo] ?? campo;
}
