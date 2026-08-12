/**
 * El receptor de la medición — LC-4, AD-13.
 *
 * Esto es lo que decide qué se registra, y **no sabe dónde corre**. El adaptador de
 * plataforma —`medicion/worker.ts`— solo traduce petición y almacén. Cambiar de
 * alojamiento cuesta ese adaptador; las propiedades que NFR-10 y NFR-11 exigen viven
 * aquí y no se mueven con él.
 *
 * El vocabulario no se copia: se importa de `src/lib/medicion.ts`, el mismo módulo que
 * emite. Copiado, un evento nuevo en el sitio se descartaría en silencio en el receptor,
 * y el fallo aparecería como «esa métrica está a cero» semanas después.
 */
import { esEventoValido, EVENTOS, type Evento } from '../src/lib/medicion.ts';
import { esRedValida, type Red } from '../src/lib/redes.ts';
import { esDestinoValido } from '../src/lib/compartir.ts';

/**
 * Una fila registrada. Es todo lo que se guarda, y está escrito como tipo a propósito:
 * añadir un campo obliga a tocar este fichero, que es donde la prueba mira.
 *
 * No hay identificador de visitante, ni cookie, ni IP, ni agente de usuario, ni referente.
 * Tampoco hay marca de tiempo al segundo: se guarda **la jornada**. Un instante con
 * precisión de milisegundo junto a una ruta poco visitada es, en la práctica, un
 * identificador — y la jornada es además la unidad en la que se leen todas las métricas
 * del PRD, así que no se pierde nada por no tenerlo.
 */
export interface Registro {
  jornada: string;
  evento: Evento;
  ruta: string;
  /**
   * De qué cuenta propia vino la visita, cuando vino de una — FR-22, SM-8.
   *
   * Se coteja aquí otra vez, y no por desconfiar del guion: la baliza es una petición
   * HTTP y cualquiera puede enviarla a mano. Cotejar solo en el cliente dejaría la
   * columna abierta a texto libre, que es lo que el conjunto cerrado existe para impedir.
   */
  origen: Red | null;
  /**
   * Adónde salió una compartición — FR-20.
   *
   * Del conjunto cerrado de destinos, con `opaco` para la hoja del sistema, que no dice
   * a qué aplicación fue. `null` en todo evento que no sea una compartición.
   */
  destino: string | null;
  /** Solo la búsqueda sin resultados lo trae: el texto que se buscó y no había (FR-8). */
  consulta: string | null;
}

/** Lo que se buscó cabe de sobra; más que esto no es una consulta, es una carga. */
export const MAX_CONSULTA = 120;

/** La jornada de un instante, en UTC. La misma convención que la Cita del Día. */
export function jornadaDe(instante: Date): string {
  return instante.toISOString().slice(0, 10);
}

/**
 * Interpreta el cuerpo de una baliza. Devuelve `null` para todo lo que no sea
 * exactamente un evento del vocabulario: cuerpo que no es JSON, evento inventado,
 * ruta ausente o que no es una ruta.
 *
 * Descartar es no registrar; nunca es fallar. Quien envía una baliza no espera respuesta
 * y no puede reaccionar a un error, así que un 400 solo serviría para que alguien creyera
 * que hay algo que reintentar.
 */
export function interpretar(cuerpo: string, instante: Date): Registro | null {
  let carga: unknown;
  try {
    carga = JSON.parse(cuerpo);
  } catch {
    return null;
  }

  if (typeof carga !== 'object' || carga === null) return null;
  const { evento, ruta, datos, origen, destino } = carga as Record<string, unknown>;

  if (typeof evento !== 'string' || !esEventoValido(evento)) return null;
  // La ruta se guarda tal cual llega, pero tiene que ser una ruta: una URL absoluta
  // traería origen —y con él, en un sitio con subdominios, algo que distingue visitantes.
  if (typeof ruta !== 'string' || !ruta.startsWith('/') || ruta.startsWith('//')) return null;

  /*
   * `datos` solo significa algo en la búsqueda sin resultados. En cualquier otro evento
   * es carga libre, y carga libre es exactamente por donde la medición se convertiría en
   * un perfil sin que nadie lo decidiera: se descarta el campo, no el evento.
   */
  const consulta =
    evento === EVENTOS.busquedaSinResultados && typeof datos === 'string' && datos.trim() !== ''
      ? datos.trim().slice(0, MAX_CONSULTA)
      : null;

  // Un origen que no es una de las cuentas propias no se registra. No se descarta el
  // evento por ello: la visita ocurrió, y perderla falsearía el recuento de la jornada.
  const cuenta = typeof origen === 'string' && esRedValida(origen) ? origen : null;

  // Mismo criterio que el origen: fuera del conjunto cerrado no se registra, y el evento
  // se registra igual. Un destino inventado no puede volver la carga libre.
  const adonde = typeof destino === 'string' && esDestinoValido(destino) ? destino : null;

  return { jornada: jornadaDe(instante), evento, ruta, origen: cuenta, destino: adonde, consulta };
}
