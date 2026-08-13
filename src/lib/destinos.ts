/**
 * El conjunto cerrado de destinos de compartición — FR-20.
 *
 * Vive **aparte** de `compartir.ts`, que compone las direcciones de cada destino. La
 * separación no es estética: `medicion/receptor.ts` coteja el destino y corre en un
 * Worker, así que importar el conjunto desde el módulo de interfaz metía en el paquete
 * del receptor los constructores de enlaces de WhatsApp, Telegram, X y correo, y con
 * ellos `atribucion.ts`. Un cambio en los destinos obligaba a redesplegar el receptor sin
 * ninguna razón.
 *
 * Aquí no hay ninguna importación, y esa es la propiedad.
 */

/** Los identificadores, en el orden en que se ofrecen. */
export const DESTINOS_CONOCIDOS = ['whatsapp', 'telegram', 'x', 'correo'] as const;

export type IdDeDestino = (typeof DESTINOS_CONOCIDOS)[number];

/**
 * La hoja del sistema — FR-20.
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
export const DESTINOS_VALIDOS: readonly string[] = [...DESTINOS_CONOCIDOS, DESTINO_OPACO];

export function esDestinoValido(valor: string): boolean {
  return DESTINOS_VALIDOS.includes(valor);
}
