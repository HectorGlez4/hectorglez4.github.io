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

/**
 * Los destinos de enlace — AD-13, FR-18, Historia 23.2.
 *
 * Los que reciben el enlace de una Cita compuesto en una dirección: cada uno tiene su
 * constructor en `compartir.ts`. Están todos los que el vocabulario de la medición conoce,
 * no solo los que hoy se ofrecen: Facebook y Threads tienen constructor y se registran, pero
 * no se pintan hasta la Historia 25.1. Qué se ofrece, y en qué orden, lo dice
 * `DESTINOS_OFRECIDOS` de `compartir.ts`.
 */
export const DESTINOS_DE_ENLACE = ['whatsapp', 'telegram', 'x', 'correo', 'facebook', 'threads'] as const;

export type IdDeDestino = (typeof DESTINOS_DE_ENLACE)[number];

/**
 * El destino de imagen — AD-13, Historia 23.2.
 *
 * No recibe un enlace: nombra el botón pulsado, la Historia de Instagram, que se lleva la
 * Imagen de Cita en 9:16. Por eso no tiene constructor en `compartir.ts`. Entra en el
 * vocabulario antes de que ningún botón lo emita (Historia 25.1): así el receptor ya lo sabe
 * guardar el día que llegue.
 */
export const DESTINO_DE_IMAGEN = 'instagram-historia';

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
 *
 * Desde la Historia 23.2 es también el conjunto de la marca de difusión, `?via=`, que dice por
 * qué destino llegó una visita compartida: lo nombra `src/lib/vocabulario.ts` sin copiarlo.
 */
export const DESTINOS_VALIDOS: readonly string[] = [...DESTINOS_DE_ENLACE, DESTINO_DE_IMAGEN, DESTINO_OPACO];

export function esDestinoValido(valor: string): boolean {
  return DESTINOS_VALIDOS.includes(valor);
}
