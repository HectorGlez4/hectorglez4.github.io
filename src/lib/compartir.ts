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
import type { Cita, Autor } from './publicado.ts';

export interface Destino {
  id: string;
  nombre: string;
  /** Compone la dirección del destino con el texto y el enlace ya dentro. */
  enlace: (texto: string, url: string) => string;
}

/**
 * Los destinos que se ofrecen cuando no hay hoja del sistema.
 *
 * Están **todos** los que admiten recibir un enlace desde la web, y solo esos. Instagram
 * y TikTok no están, y su ausencia es la decisión: ninguna de las dos acepta un enlace
 * preinsertado desde un navegador. Ofrecerlas obligaría a pedir que se instale la
 * aplicación o a abrir una página que no hace nada con lo que se le manda, y el criterio
 * lo prohíbe explícitamente. Para esas dos, el camino es la Imagen y la hoja del sistema
 * de FR-17.
 *
 * Ninguno pide registrarse en este sitio: son direcciones públicas que el navegador abre.
 */
export const DESTINOS: readonly Destino[] = [
  {
    id: 'whatsapp',
    nombre: 'WhatsApp',
    enlace: (texto, url) => `https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`,
  },
  {
    id: 'telegram',
    nombre: 'Telegram',
    enlace: (texto, url) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(texto)}`,
  },
  {
    id: 'x',
    nombre: 'X',
    enlace: (texto, url) =>
      `https://x.com/intent/post?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: 'correo',
    nombre: 'Correo',
    enlace: (texto, url) =>
      `mailto:?subject=${encodeURIComponent('Una cita')}&body=${encodeURIComponent(`${texto}\n\n${url}`)}`,
  },
];

/**
 * El destino de una compartición por la hoja del sistema — FR-20.
 *
 * La Web Share API **no dice** a qué aplicación fue, y no se intenta averiguar: cualquier
 * forma de deducirlo —medir tiempos, mirar qué pierde el foco— es reconstruir el
 * comportamiento del visitante por la puerta de atrás, que es lo que NFR-11 impide.
 * «Opaco» es un dato honesto: se compartió, y no se sabe adónde.
 */
export const DESTINO_OPACO = 'opaco';

/**
 * Todo lo que puede registrarse como destino, y nada más.
 *
 * Cerrado por lo mismo que el vocabulario de eventos de AD-13: si el destino fuese texto
 * libre, la medición de la compartición sería ampliable sin tocar ningún módulo, que es
 * exactamente la puerta por la que se cuela un perfil del visitante.
 */
export const DESTINOS_VALIDOS: readonly string[] = [...DESTINOS.map((d) => d.id), DESTINO_OPACO];

export function esDestinoValido(valor: string): boolean {
  return DESTINOS_VALIDOS.includes(valor);
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
