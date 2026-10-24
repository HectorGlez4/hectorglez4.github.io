/**
 * El receptor de la medición — LC-4, AD-13.
 *
 * Esto es lo que decide qué se registra, y **no sabe dónde corre**. El adaptador de
 * plataforma —`medicion/worker.ts`— solo traduce petición y almacén. Cambiar de
 * alojamiento cuesta ese adaptador; las propiedades que NFR-10 y NFR-11 exigen viven
 * aquí y no se mueven con él.
 *
 * El vocabulario no se copia: se importa de `src/lib/vocabulario.ts`, el mismo módulo del que
 * compone su guion el sitio (AD-13, Historia 23.2). Copiado, un evento o un campo nuevo en el
 * sitio se descartaría en silencio aquí, y el fallo aparecería como «esa métrica está a cero»
 * semanas después. Aquí no se escribe a mano ni un evento, ni un campo, ni un valor: se recorre
 * `CAMPOS_DE_EVENTO`.
 */
import {
  CAMPOS,
  CAMPOS_DE_EVENTO,
  claveEnLaBaliza,
  esEventoValido,
  type Campo,
  type Evento,
  type Filtros,
  type MarcaDeObra,
  type Primera,
  type RotuloDeTramo,
  type Zona,
} from '../src/lib/vocabulario.ts';
import { esRedValida, type Red } from '../src/lib/redes.ts';

/**
 * Una fila registrada. Es todo lo que se guarda, y está escrito como tipo a propósito:
 * añadir un campo obliga a tocar este fichero, que es donde la prueba mira. Las columnas son
 * las de `medicion/esquema.sql`, en su orden: `jornada`, `evento` y `ruta` en toda fila, y cada
 * campo del vocabulario nulo fuera de los eventos que lo llevan.
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
   * La Marca de origen: de qué cuenta propia vino la visita, cuando vino de una — FR-22, SM-8.
   *
   * Se coteja aquí otra vez, y no por desconfiar del guion: la baliza es una petición
   * HTTP y cualquiera puede enviarla a mano. Cotejar solo en el cliente dejaría la
   * columna abierta a texto libre, que es lo que el conjunto cerrado existe para impedir.
   */
  origen: Red | null;
  /**
   * Adónde salió una compartición — FR-20 —, o el destino del botón de una descarga que impuso
   * el navegador (AD-7). Del conjunto de su evento, con `opaco` para la hoja del sistema, que
   * no dice a qué aplicación fue. `null` en todo evento que no lo declara.
   */
  destino: string | null;
  /** Solo la búsqueda sin resultados lo trae: el texto que se buscó y no había (FR-8). */
  consulta: string | null;
  /** La Marca de difusión, `?via=`: por qué destino se compartió la visita. Vistas y lectura. */
  via: string | null;
  /** La Zona de una salida interna (FR-56). */
  zona: Zona | null;
  /** El tramo del total de una búsqueda asentada, nunca el texto. */
  tramo: RotuloDeTramo | null;
  /** Los filtros usados en una búsqueda asentada. */
  filtros: Filtros | null;
  /** La marca de una vista de Obra: lo que la página servida declaraba (FR-52). */
  indexable: MarcaDeObra | null;
  /** Si la acción es la primera de su métrica en su carga (SM-5, SM-7). */
  primera: Primera | null;
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
  const baliza = carga as Record<string, unknown>;
  const { evento, ruta } = baliza;

  if (typeof evento !== 'string' || !esEventoValido(evento)) return null;
  // La ruta se guarda tal cual llega, pero tiene que ser una ruta: una URL absoluta
  // traería origen —y con él, en un sitio con subdominios, algo que distingue visitantes.
  if (typeof ruta !== 'string' || !ruta.startsWith('/') || ruta.startsWith('//')) return null;

  /*
   * Cada campo se guarda solo en los eventos que lo declaran, y solo si su valor es de su
   * conjunto. Fuera de su evento, o fuera de su conjunto, se descarta **el campo, no el
   * evento**: la visita o la acción ocurrieron, y perderlas falsearía el recuento de la
   * jornada. Dejar pasar un campo fuera de su evento permitía que una `vista-de-cita` llegara
   * con destino y que una consulta que agrupara solo por destino contara comparticiones que
   * nunca ocurrieron; un valor fuera de su conjunto convertiría la columna en carga libre, que
   * es exactamente por donde la medición se volvería un perfil sin que nadie lo decidiera.
   *
   * La consulta es el único texto libre, y solo de la búsqueda sin resultados: se recorta.
   */
  const declarados = CAMPOS_DE_EVENTO[evento];
  const campos = {} as Record<Campo, string | null>;
  for (const campo of CAMPOS) {
    const declaracion = declarados[campo];
    const valor = baliza[claveEnLaBaliza(campo)];
    if (declaracion === undefined || typeof valor !== 'string') {
      campos[campo] = null;
    } else if (declaracion.valores === 'texto') {
      campos[campo] = valor.trim() === '' ? null : valor.trim().slice(0, MAX_CONSULTA);
    } else {
      campos[campo] = declaracion.valores.includes(valor) ? valor : null;
    }
  }

  /*
   * Compatibilidad con la v7.1: su guion manda la Marca de origen con **todo** evento, también
   * con el copiado y las comparticiones, y el sitio en vivo la seguirá mandando hasta que se
   * despliegue el de la v8. Se guarda como hasta hoy, en todo evento, si es una de las cuentas
   * propias: así el receptor nuevo no pierde nada de lo que envía el sitio viejo. El vocabulario
   * ya no la declara en las acciones (AD-13), y el guion de la v8 no la envía con ellas.
   */
  const { origen } = baliza;
  campos.origen = typeof origen === 'string' && esRedValida(origen) ? origen : null;

  return {
    jornada: jornadaDe(instante),
    evento,
    ruta,
    ...(campos as Omit<Registro, 'jornada' | 'evento' | 'ruta'>),
  };
}
