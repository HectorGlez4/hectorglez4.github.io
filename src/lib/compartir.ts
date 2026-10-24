/**
 * Compartir el enlace de una Cita — FR-18.
 *
 * Lo que se comparte no es una dirección desnuda: es la Cita, su Autor y el enlace. Quien
 * lo recibe sabe qué le mandan sin abrirlo, que es la diferencia entre un mensaje que se
 * abre y uno que se ignora.
 *
 * El texto sale de `atribucion.ts`, el mismo que se copia al portapapeles y el mismo que
 * lleva la Imagen. Componerlo aquí aparte habría producido tres atribuciones distintas de
 * la misma Cita, y nadie se enteraría hasta verlas juntas.
 *
 * AD-5 — Derivación pura.
 */

import { textoParaCopiar } from './atribucion.ts';
import type { IdDeDestino } from './destinos.ts';
import type { Cita, Autor } from './publicado.ts';

// Se reexportan para quien ya los consumía por aquí. El conjunto cerrado vive en
// `destinos.ts` y no aquí: ver la nota de ese módulo — el receptor lo importa desde un
// Worker y no debe arrastrar estos constructores de direcciones.
export { DESTINOS_VALIDOS, DESTINO_OPACO, esDestinoValido } from './destinos.ts';

export interface Destino {
  id: IdDeDestino;
  nombre: string;
  /** Compone la dirección del destino con el texto y el enlace ya dentro. */
  enlace: (texto: string, url: string) => string;
}

/**
 * El constructor de cada destino de enlace — FR-18, AD-13, Historia 23.2.
 *
 * Uno por identificador de `DESTINOS_DE_ENLACE`, ni uno de más ni uno de menos: lo exige el
 * tipo, así que un destino de enlace sin constructor no compila. Ninguno para la Historia de
 * Instagram ni para la hoja del sistema, que no reciben una dirección (`destinos.ts`).
 *
 * Están **todos** los que admiten recibir un enlace desde la web, y solo esos. Instagram
 * y TikTok no están, y su ausencia es la decisión: ninguna de las dos acepta un enlace
 * preinsertado desde un navegador. Ofrecerlas obligaría a pedir que se instale la
 * aplicación o a abrir una página que no hace nada con lo que se le manda, y el criterio
 * lo prohíbe explícitamente. Para esas dos, el camino es la Imagen y la hoja del sistema
 * de FR-17.
 *
 * Facebook es la excepción declarada a «el texto y el enlace dentro»: su diálogo de
 * compartir solo admite la dirección, y el texto lo pone quien comparte —o lo compone
 * Facebook con la vista previa de la página—. Threads admite los dos.
 *
 * Ninguno pide registrarse en este sitio: son direcciones públicas que el navegador abre.
 */
export const CONSTRUCTORES: { readonly [Id in IdDeDestino]: Destino } = {
  whatsapp: {
    id: 'whatsapp',
    nombre: 'WhatsApp',
    enlace: (texto, url) => `https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`,
  },
  telegram: {
    id: 'telegram',
    nombre: 'Telegram',
    enlace: (texto, url) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(texto)}`,
  },
  x: {
    id: 'x',
    nombre: 'X',
    enlace: (texto, url) =>
      `https://x.com/intent/post?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`,
  },
  correo: {
    id: 'correo',
    nombre: 'Correo',
    enlace: (texto, url) =>
      `mailto:?subject=${encodeURIComponent('Una cita')}&body=${encodeURIComponent(`${texto}\n\n${url}`)}`,
  },
  facebook: {
    id: 'facebook',
    nombre: 'Facebook',
    enlace: (_texto, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  threads: {
    id: 'threads',
    nombre: 'Threads',
    enlace: (texto, url) =>
      `https://www.threads.com/intent/post?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`,
  },
};

/**
 * Los destinos que se ofrecen cuando no hay hoja del sistema, en el orden en que se pintan.
 *
 * Son los cuatro de siempre: que Facebook y Threads tengan constructor no los pone en la
 * página. Pintarlos —con la rejilla de «Compartir en», la Historia y la Marca de difusión— es
 * de la Historia 25.1, y hasta entonces el bloque de la Página de Cita es idéntico al de la
 * v7.1.
 */
export const DESTINOS_OFRECIDOS: readonly Destino[] = [
  CONSTRUCTORES.whatsapp,
  CONSTRUCTORES.telegram,
  CONSTRUCTORES.x,
  CONSTRUCTORES.correo,
];

/**
 * Historia 22.10 — lo que dice cada destino: «Compartir en {destino}», no el nombre solo, que
 * leído suelto por un lector de pantalla no dice qué hace el enlace.
 */
export function rotuloDeDestino(destino: Destino): string {
  return `Compartir en ${destino.nombre}`;
}

/**
 * El texto que se propone al compartir.
 *
 * Nunca es solo la dirección: lleva la Cita entera y el nombre del Autor. El enlace viaja
 * aparte —en el campo `url` de la hoja del sistema, o al final del texto en los destinos
 * que no distinguen ambos campos— para que las aplicaciones que previsualizan enlaces
 * puedan encontrarlo.
 */
export function textoParaCompartir(cita: Cita, autor: Autor): string {
  return textoParaCopiar(cita, autor);
}
