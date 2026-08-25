/**
 * Las Fuentes admitidas para extraer candidatas — FR-23.
 *
 * Una Fuente es de dónde sale el **texto transcrito**, y no es lo mismo que la
 * Procedencia: la Procedencia es la obra y el año en que la Cita se publicó; la Fuente es
 * la edición digital de la que se copió. Confundirlas produciría Citas cuya procedencia
 * es «Wikisource», que no documenta nada.
 *
 * El conjunto es cerrado y cada entrada dice si su licencia permite reutilizar. La
 * Épica 9 es explícita sobre lo que **no** se hace: rastrear sitios de citas. Sus
 * compilaciones están protegidas y —lo decisivo— publican texto y nombre sin obra ni año,
 * así que cada Cita extraída de ahí moriría en `corpus/_revision/`.
 *
 * Este módulo es puro y no toca la red (AD-22). Aquí solo se decide **a qué Fuente
 * pertenece** una dirección; quien la pide es `tools/recuperar.ts` y nadie más.
 */

export interface Fuente {
  id: string;
  nombre: string;
  /** La licencia tal y como la declara la Fuente. Se copia en cada candidata. */
  licencia: string;
  permiteReutilizacion: boolean;
  /** Por qué no, cuando no. Es lo que se le dice al editor al detener el proceso. */
  razon?: string;
  /**
   * Anfitriones por los que se reconoce una dirección de esta Fuente.
   *
   * Se incluyen las variantes móviles: una URL copiada del móvil (`es.m.wikisource.org`)
   * es la misma Fuente y la misma obra, y rechazarla obligaría a reescribirla a mano —
   * que es exactamente el gesto que esta historia quiere quitar de en medio.
   */
  anfitriones: readonly string[];
}

export const FUENTES: readonly Fuente[] = [
  {
    id: 'wikisource-es',
    nombre: 'Wikisource en español',
    licencia: 'CC BY-SA 4.0',
    permiteReutilizacion: true,
    anfitriones: ['es.wikisource.org', 'es.m.wikisource.org'],
  },
  {
    id: 'gutenberg',
    nombre: 'Project Gutenberg',
    licencia: 'dominio público',
    permiteReutilizacion: true,
    anfitriones: ['gutenberg.org', 'www.gutenberg.org', 'm.gutenberg.org'],
  },
  {
    id: 'cervantes-virtual',
    nombre: 'Biblioteca Virtual Miguel de Cervantes',
    licencia: 'CC BY-NC-SA 4.0',
    permiteReutilizacion: false,
    razon:
      'su licencia excluye el uso comercial, y el Corpus se publica sin esa restricción: ' +
      'una Cita con esa procedencia contaminaría las condiciones de todo el conjunto.',
    anfitriones: ['cervantesvirtual.com', 'www.cervantesvirtual.com'],
  },
];

export function fuenteDe(id: string): Fuente | undefined {
  return FUENTES.find((f) => f.id === id);
}

/**
 * La Fuente a la que pertenece una dirección, o `undefined` si no pertenece a ninguna.
 *
 * La coincidencia es **exacta de anfitrión o de subdominio real**, nunca de subcadena:
 * `gutenberg.org.example.com` termina en `example.com` y no es Project Gutenberg, pero
 * un `endsWith('gutenberg.org')` lo daría por bueno y traería texto de cualquiera con la
 * licencia de una Fuente admitida escrita al lado.
 *
 * Solo `http` y `https`. `file:`, `data:` y `javascript:` no son Fuentes: son formas de
 * que la recuperación lea algo que nadie publicó.
 */
export function fuenteDeUrl(url: string): Fuente | undefined {
  let analizada: URL;
  try {
    analizada = new URL(url);
  } catch {
    return undefined;
  }

  if (analizada.protocol !== 'http:' && analizada.protocol !== 'https:') return undefined;

  // El punto final del FQDN («es.wikisource.org.») designa el mismo anfitrión.
  const anfitrion = analizada.hostname.toLowerCase().replace(/\.$/u, '');
  if (anfitrion === '') return undefined;

  return FUENTES.find((fuente) =>
    fuente.anfitriones.some((a) => anfitrion === a || anfitrion.endsWith(`.${a}`)),
  );
}

/** Cuánto se espera antes del reintento número `n`, en milisegundos. */
const ESPERA_BASE_MS = 1500;

/**
 * Repite lo que falla por rachas, y se rinde a tiempo.
 *
 * Wikisource limita la tasa **por rachas**: la misma dirección contesta 200, 503 y 200 en tres
 * intentos seguidos. Un 503 dice «ahora no», no «esto no existe», y reintentar es de las pocas
 * respuestas honestas que admite.
 *
 * Hace falta porque el fallo no se queda en el fallo. Cuando el wikitexto no llega, `recuperar`
 * versiona el documento igual —con un aviso— y lo deja sin el metadato que la Fuente declara,
 * **el Autor incluido**; dos pasos más allá, la puerta de FR-23 informa de que «el documento no
 * declara autor» de una página que sí lo declara.
 *
 * Se espera **más en cada intento**, para no empujar a quien acaba de decir que no. Y hay tope:
 * sin él, una Fuente caída dejaría la orden colgada para siempre, que es peor que un aviso
 * porque no se puede leer.
 *
 * La espera se inyecta para que las pruebas no duerman de verdad.
 */
export async function conReintentos<T>(
  intentar: () => Promise<T>,
  logrado: (resultado: T) => boolean,
  opciones: { intentos?: number; esperar?: (ms: number) => Promise<void> } = {},
): Promise<T> {
  const intentos = opciones.intentos ?? 3;
  const esperar =
    opciones.esperar ?? ((ms: number) => new Promise<void>((listo) => setTimeout(listo, ms)));

  let ultimo = await intentar();
  for (let n = 1; n < intentos && !logrado(ultimo); n += 1) {
    await esperar(ESPERA_BASE_MS * n);
    ultimo = await intentar();
  }
  return ultimo;
}
