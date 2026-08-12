/**
 * Las cuentas propias y la marca de origen de cada una — FR-22, SM-8.
 *
 * Un conjunto cerrado, como el vocabulario de eventos de AD-13 y por la misma razón: la
 * marca de origen llega en la URL, y todo lo que llega en la URL lo escribe cualquiera.
 * Sin conjunto cerrado, la medición registraría el valor que le pusieran y la tabla de
 * SM-8 pasaría de «cuál de las cinco redes trae visitas» a texto libre de procedencia
 * desconocida.
 *
 * El parámetro se llama `de` y no `utm_source`: NFR-4 pide rutas en español y sin
 * identificadores opacos, y `utm_source` además arrastra la convención de un proveedor de
 * analítica que este producto no usa (AD-13).
 */

export const PARAMETRO_DE_ORIGEN = 'de';

/** Las cinco cuentas de §4.10 del PRD. El orden es el que se ofrece en el Kit. */
export const REDES = [
  { id: 'instagram', nombre: 'Instagram' },
  { id: 'tiktok', nombre: 'TikTok' },
  { id: 'x', nombre: 'X' },
  { id: 'threads', nombre: 'Threads' },
  { id: 'facebook', nombre: 'Facebook' },
] as const;

export type Red = (typeof REDES)[number]['id'];

export const REDES_VALIDAS: readonly Red[] = REDES.map((r) => r.id);

export function esRedValida(valor: string): valor is Red {
  return (REDES_VALIDAS as readonly string[]).includes(valor);
}

/** El enlace a una Cita marcado con la cuenta desde la que se publica. */
export function enlaceConOrigen(ruta: string, red: Red): string {
  return `${ruta}?${PARAMETRO_DE_ORIGEN}=${red}`;
}
