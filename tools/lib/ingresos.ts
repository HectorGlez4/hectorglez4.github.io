/**
 * Lo que el mando de ingreso sabe hacer — Historia 14.1, AD-21, AD-22.
 *
 * **Ojo al nombre: `tools/lib/ingresos.ts` (esto) y `src/lib/ingreso.ts` se parecen en un
 * carácter.** Allí vive el estado —lo único que decide algo—; aquí, el informe, que no decide
 * nada. El estado de los Modelos no está aquí: está en `src/lib/ingreso.ts`, que es su dueño
 * único y al que este módulo solo lee. Aquí vive lo otro, que es lo que una configuración
 * versionada no puede tener: qué hacer con lo que conteste el receptor, y cómo se redacta el
 * informe.
 *
 * **La petición no está aquí** (AD-22). La hace la cáscara exterior, `tools/ingreso.ts`, y
 * este módulo recibe lo que haya llegado. Es el reparto que ya existía entre
 * `tools/recuperar.ts` y `tools/lib/documento.ts`, y compra lo mismo: cada forma de degradar
 * —receptor caído, receptor que contesta sin publicar lectura, respuesta sin cifra— se prueba
 * sin levantar ningún servidor.
 *
 * **Esto informa y no enciende nada.** Ni siquiera puede: encender es cambiar un `false`
 * por un `true` en un fichero versionado, y este módulo no escribe. Es la misma lectura que
 * la auditoría de salud del Corpus —se mira cuando se quiera, no cambia nada y no exporta
 * datos—: del receptor viaja una sola cifra agregada, sesiones orgánicas al mes, y nunca un
 * volcado de eventos.
 *
 * Y nada de lo que pase con el receptor puede acabar en un código de salida distinto de cero:
 * el paso de CI que llama a este mando es el mismo flujo que despliega el sitio en vivo, y el
 * build jamás pregunta nada (AD-14), así que dos construcciones del mismo commit dan el mismo
 * sitio también con el receptor apagado o caído.
 */

import { milesEnEspañol } from '../../src/lib/formato.ts';
import {
  MODELOS,
  type Modelo,
  type QueDisparaElUmbral,
} from '../../src/lib/ingreso.ts';

/**
 * La cifra contra la que se mide un Umbral, o el motivo de que no sea medible.
 *
 * Que «no medible» sea un valor del tipo y no un `null` es deliberado: obliga a que quien
 * informe diga **por qué** no lo es, en vez de enseñar un hueco o —peor— un cero que se lee
 * como una medición de verdad.
 */
export type Medida =
  | { medible: true; sesiones: number }
  | {
      medible: false;
      /** Una línea, la que va junto a cada Modelo. */
      motivo: string;
      /**
       * Lo accionable, que se escribe **una vez** al pie del informe y no cuatro.
       *
       * La explicación de por qué no hay cifra es la misma para los cuatro Modelos —el
       * receptor es uno—, y repetirla en cada uno sepultaba lo que sí cambia de fila a fila:
       * el estado, el Umbral y dónde puede aparecer.
       */
      detalle?: string;
    };

/** El campo que el mando espera del receptor cuando publica una lectura. */
export const CAMPO_DE_LECTURA = 'sesionesOrganicasMensuales';

/**
 * Cuánto se espera al receptor antes de darlo por caído.
 *
 * Acotado a propósito y no generoso: lo que se pide es una cifra agregada, y quien espera al
 * otro lado es el paso de CI del flujo que despliega el sitio en vivo. Un receptor que tarda
 * más que esto es, a efectos de este mando, un receptor caído — y decirlo cuesta menos que
 * dejar el flujo colgado.
 */
export const MILISEGUNDOS_DE_ESPERA = 3000;

/**
 * Lo que se dice de un `MEDICION_ENDPOINT` mal escrito, **sin repetirlo**.
 *
 * El valor es un secreto del repositorio y esta salida acaba en el resumen del flujo por el
 * `tee` del paso de CI. Un mensaje que lo cite lo publica en el registro de una ejecución
 * pública, así que el informe nombra la variable y no su contenido: quien pueda arreglarla ya
 * puede verla donde está guardada.
 */
export const MOTIVO_DE_DIRECCION_INVALIDA =
  'no medible: MEDICION_ENDPOINT no es una dirección http(s). No es una avería del receptor: ' +
  'es el valor de la variable, y se corrige donde esté guardada.';

/**
 * La dirección del receptor, o el motivo de que no haya cifra que pedir.
 *
 * Sin `MEDICION_ENDPOINT` no es que falle la consulta: es que **LC-4 sigue abierta**, que es
 * una condición de lanzamiento y no una avería. Se nombra, porque es lo único accionable que
 * puede leer quien ejecuta esto.
 */
export function receptorDe(entorno: Record<string, string | undefined>): string | Medida {
  const url = entorno.MEDICION_ENDPOINT?.trim();
  if (!url) {
    return {
      medible: false,
      motivo: 'todavía no es medible: falta LC-4 (MEDICION_ENDPOINT sin definir).',
      detalle: [
        'LC-4 es el receptor de medición sin desplegar, y la desbloquea el dueño con',
        'DESPLIEGUE.md §3. Aun cerrada, faltará un paso más para que haya cifra:',
        'MEDICION_ENDPOINT es la dirección de ingesta de balizas y el receptor contesta 204 a',
        'todo lo que no sea un POST —escribe y no publica—, así que tiene que publicar una',
        'lectura agregada, o leerse con npx wrangler d1 execute.',
      ].join(' '),
    };
  }

  /*
   * Que sea una dirección http(s) se comprueba aquí, y no se deja caer en el `fetch`.
   *
   * Una errata —`midominio.com/m` sin esquema, una variable a medio expandir— hacía que
   * `fetch` lanzara y el mando dijera «el receptor no responde», que manda a mirar el Worker:
   * a arreglar lo que no está roto. Y el mensaje de ese fallo lleva dentro el valor de la
   * variable, que es un secreto del repositorio.
   */
  let direccion: URL;
  try {
    direccion = new URL(url);
  } catch {
    return { medible: false, motivo: MOTIVO_DE_DIRECCION_INVALIDA };
  }
  if (direccion.protocol !== 'http:' && direccion.protocol !== 'https:') {
    return { medible: false, motivo: MOTIVO_DE_DIRECCION_INVALIDA };
  }

  return url;
}


/**
 * Qué hacer con lo que el receptor haya contestado, sea lo que sea.
 *
 * **Aquí no se pide nada por la red.** La petición vive en la cáscara exterior
 * `tools/ingreso.ts` y no en este módulo (AD-22), que es lo mismo que hace `tools/extraer.ts`
 * con `tools/recuperar.ts`. Lo que queda aquí es la parte que hay que poder probar sin
 * levantar un servidor: cómo degrada cada respuesta posible.
 *
 * Degrada **sin inventar cifra**, y con motivos distintos porque son problemas distintos y
 * mandan a sitios distintos: un receptor caído se arregla mirando el Worker; uno que contesta
 * HTML —una página de error de la red intermedia, un portal cautivo— se arregla mirando qué
 * hay entre medias; y uno que contesta JSON sin lectura se arregla enseñándole a publicarla.
 * Hoy es lo último: el Worker de `medicion/` contesta 204 a todo lo que no sea un `POST` de
 * baliza —escribe y no publica—, y la cifra se saca con `npx wrangler d1 execute` desde la
 * terminal.
 */
export function interpretarLectura(
  estado: number,
  tipoDeContenido: string | null,
  cuerpo: string,
): Medida {
  if (estado < 200 || estado >= 300) {
    return { medible: false, motivo: `no medible: el receptor contestó ${estado}.` };
  }

  const tipo = (tipoDeContenido ?? '').split(';')[0].trim().toLowerCase();
  if (tipo !== '' && !tipo.endsWith('/json') && !tipo.endsWith('+json')) {
    return {
      medible: false,
      motivo:
        `no medible: la respuesta del receptor es «${tipo}» y no una lectura. Si eso es una ` +
        'página, quien contesta no es el receptor: mire qué hay entre esta máquina y él.',
    };
  }

  let datos: unknown;
  try {
    datos = JSON.parse(cuerpo);
  } catch {
    return {
      medible: false,
      motivo:
        'no medible: el receptor contesta, pero no publica ninguna lectura. Escribe y no ' +
        'se lee desde el sitio (AD-14); la cifra se saca con npx wrangler d1 execute.',
    };
  }

  const valor = (datos as Record<string, unknown> | null)?.[CAMPO_DE_LECTURA];
  /*
   * Entero, y dentro de lo que un número de JavaScript representa con exactitud. Los dos
   * filtros arreglan un informe que mentía sin fallar: con `2500,7` se comparaba contra el
   * Umbral el decimal y se imprimía «2.500», y a partir de 1e21 `String()` da notación
   * exponencial y la agrupación de miles la destroza. Sesiones no son cantidades continuas:
   * una lectura con decimales no es una lectura, es otra cosa.
   */
  if (
    typeof valor !== 'number' ||
    !Number.isInteger(valor) ||
    valor < 0 ||
    valor > Number.MAX_SAFE_INTEGER
  ) {
    return {
      medible: false,
      motivo: `no medible: la respuesta del receptor no trae un «${CAMPO_DE_LECTURA}» que valga.`,
    };
  }

  return { medible: true, sesiones: valor };
}

/**
 * El receptor que no contesta. Se dice, y no se inventa cifra.
 *
 * El mensaje del fallo se sanea antes de entrar en el informe: `fetch` mete la dirección
 * dentro de lo que lanza —«Failed to parse URL from …»— y esta salida acaba en el resumen del
 * flujo por el `tee` del paso de CI, así que citarlo publicaría un secreto del repositorio en
 * el registro de una ejecución. La dirección se sustituye por el nombre de la variable, que es
 * lo accionable, y lo demás del mensaje se conserva.
 */
export function receptorQueNoContesta(fallo: unknown, url?: string): Medida {
  const crudo = fallo instanceof Error ? fallo.message : String(fallo);
  const sinDireccion = sanearMensajeDeRed(crudo, url);
  return { medible: false, motivo: `no medible: el receptor no responde (${sinDireccion}).` };
}

/** Quita del texto la dirección del receptor y cualquier otra que se le parezca. */
export function sanearMensajeDeRed(mensaje: string, url?: string): string {
  const conVariable = url === undefined ? mensaje : mensaje.split(url).join('MEDICION_ENDPOINT');
  // Y por si el mensaje trae la dirección de otra forma —normalizada, sin barra final—, se
  // barre cualquier cosa con pinta de URL. Vale más un mensaje escueto que uno con un secreto.
  return conVariable.replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, 'MEDICION_ENDPOINT');
}

/** Lo que toca hacer con un Modelo, si es que toca algo. */
export type Accion = 'ninguna' | 'encender' | 'solicitar';

export interface EstadoDeModelo {
  modelo: Modelo;
  /** Contra qué se mide, en texto. El número sale del Modelo, nunca escrito aquí (AD-9). */
  umbral: string;
  /** La cifra medida, o el motivo de que no lo sea. */
  cifra: string;
  /**
   * Si el Umbral está cruzado. `null` es «no se sabe desde aquí», y no es lo mismo que
   * `false`: sin cifra no hay nada que comparar, y el de donaciones no se juzga con una.
   */
  cruzado: boolean | null;
  accion: Accion;
  /** Qué decir cuando hay algo que decir. Nunca enciende nada: lo dice. */
  aviso?: string;
  /** Lo accionable sobre la medición, común a los cuatro y escrito una sola vez. */
  detalle?: string;
}

function textoDelUmbral(modelo: Modelo): string {
  if (modelo.umbral.clase === 'sesiones-organicas-mensuales') {
    return `${milesEnEspañol(modelo.umbral.sesiones)} sesiones orgánicas/mes`;
  }
  // «LC-1…LC-4» y no la lista entera: es como se nombra el tramo en el PRD y en la épica,
  // y enumerarlas aquí una a una haría creer que el orden importa.
  const { condiciones } = modelo.umbral;
  const tramo =
    condiciones.length > 2
      ? `${condiciones[0]}…${condiciones[condiciones.length - 1]}`
      : condiciones.join(' y ');
  return `${tramo} verificadas`;
}

function avisoDeUmbralCruzado(nombre: string, dispara: QueDisparaElUmbral): string {
  /*
   * Un `switch` exhaustivo y no un ternario, y la diferencia no es de estilo.
   *
   * Con `dispara === 'solicita' ? … : …`, **cualquier valor futuro cae en «se puede
   * encender»**: un Modelo nuevo cuyo Umbral dispare un tercer acto —pedir un permiso,
   * esperar una respuesta— autorizaría a encender sin que lo hubiera decidido nadie, y en
   * silencio. El `never` de abajo convierte eso en un error de compilación el día que se
   * añada el tercer valor, que es cuando hay que redactar su frase.
   */
  switch (dispara) {
    case 'solicita':
      return (
        `Umbral cruzado: toca SOLICITAR la cuenta de «${nombre}». La solicitud arranca el ` +
        'reloj de 3 ventas en 180 días, y ese reloj ya cerró la cuenta del proyecto una vez.'
      );
    case 'enciende':
      return (
        `Umbral cruzado: se puede ENCENDER «${nombre}». No se enciende solo — es un diff en ` +
        'src/lib/ingreso.ts, y git revert lo apaga.'
      );
    default: {
      const noContemplado: never = dispara;
      throw new Error(
        `«${String(noContemplado)}» es una clase de disparo sin aviso redactado. Escríbalo ` +
          'antes de usarla: lo que dice el aviso es lo que alguien va a hacer.',
      );
    }
  }
}

/** Qué acción autoriza un Umbral cruzado. Misma exhaustividad, por el mismo motivo. */
function accionDe(dispara: QueDisparaElUmbral): Accion {
  switch (dispara) {
    case 'solicita':
      return 'solicitar';
    case 'enciende':
      return 'encender';
    default: {
      const noContemplado: never = dispara;
      throw new Error(`«${String(noContemplado)}» es una clase de disparo sin acción asignada.`);
    }
  }
}

/** El estado de un Modelo dada la cifra que haya, o no haya. */
export function estadoDe(modelo: Modelo, medida: Medida): EstadoDeModelo {
  const umbral = textoDelUmbral(modelo);

  if (modelo.umbral.clase === 'condiciones-de-lanzamiento') {
    /*
     * El Umbral de las donaciones no lo cruza ninguna cifra, y por eso `cruzado` es `null`
     * y la acción, `ninguna`. LC-1…LC-3 no se ven desde aquí y LC-4 solo se intuye —que el
     * receptor conteste dice que está desplegado, no que el dueño la haya dado por
     * verificada—. Decirlo así es la diferencia entre informar y decidir por el editor.
     */
    return {
      modelo,
      umbral,
      cifra: medida.medible
        ? 'el receptor publica lectura, que es señal de que LC-4 avanzó; darla por verificada ' +
          '—y LC-1…LC-3 con ella— es del dueño, con DESPLIEGUE.md delante.'
        : medida.motivo,
      cruzado: null,
      accion: 'ninguna',
      ...(medida.medible || medida.detalle === undefined ? {} : { detalle: medida.detalle }),
    };
  }

  if (!medida.medible) {
    return {
      modelo,
      umbral,
      cifra: medida.motivo,
      cruzado: null,
      accion: 'ninguna',
      ...(medida.detalle === undefined ? {} : { detalle: medida.detalle }),
    };
  }

  const cruzado = medida.sesiones >= modelo.umbral.sesiones;
  const cifra = `${milesEnEspañol(medida.sesiones)} sesiones orgánicas/mes medidas en el receptor`;

  // Un Modelo ya encendido no tiene nada que avisar: lo suyo ya se decidió y se ve en git.
  if (!cruzado || modelo.encendido) {
    return { modelo, umbral, cifra, cruzado, accion: 'ninguna' };
  }

  return {
    modelo,
    umbral,
    cifra,
    cruzado,
    accion: accionDe(modelo.dispara),
    aviso: avisoDeUmbralCruzado(modelo.nombre, modelo.dispara),
  };
}

export function estadosDe(medida: Medida, modelos: readonly Modelo[] = MODELOS): EstadoDeModelo[] {
  return modelos.map((modelo) => estadoDe(modelo, medida));
}

/**
 * El informe en texto, con la misma lectura que la auditoría de salud del Corpus.
 *
 * Por Modelo: si está encendido, contra qué se mide, la cifra —o por qué no la hay— y dónde
 * puede aparecer. Lo último no es adorno: un Modelo encendido que no admite ninguna
 * superficie no se ve en ninguna parte, y esa es la avería que cuesta más tiempo entender.
 */
export function lineasDelInforme(estados: readonly EstadoDeModelo[]): string[] {
  const lineas = ['Modelos de Ingreso', '══════════════════', ''];

  for (const estado of estados) {
    const { modelo } = estado;
    lineas.push(
      `${modelo.nombre}`,
      `  Estado:      ${modelo.encendido ? 'ENCENDIDO' : 'apagado'}`,
      `  Umbral:      ${estado.umbral}` +
        (modelo.dispara === 'solicita' ? '  → dispara la SOLICITUD, no el encendido' : ''),
      `  Medición:    ${estado.cifra}`,
      `  Superficies: ${modelo.admitidoEn.length === 0 ? 'ninguna todavía' : modelo.admitidoEn.join(', ')}`,
      // La nota es lo que hace que el informe se entienda sin abrir el módulo: por qué la
      // donación es un enlace y no un widget, o qué reloj arranca solicitar la afiliación.
      // Escrita y no publicada valdría lo mismo que no escrita.
      `  Nota:        ${modelo.nota}`,
    );
    if (estado.aviso !== undefined) lineas.push(`  ATENCIÓN:    ${estado.aviso}`);
    lineas.push('');
  }

  const avisos = estados.filter((estado) => estado.aviso !== undefined);
  const detalle = detalleDeLaMedida(estados);
  if (detalle !== undefined) lineas.push(`Sobre la medición: ${detalle}`, '');

  lineas.push(
    avisos.length === 0
      ? 'Ningún Umbral cruzado que exija decidir nada hoy.'
      : `${avisos.length} ${avisos.length === 1 ? 'Umbral cruzado' : 'Umbrales cruzados'}. Esta orden no enciende nada: lo decide una persona, y queda en git.`,
    '',
    'Encender o apagar un Modelo es un diff en src/lib/ingreso.ts. Nada más hay que tocar.',
  );

  return lineas;
}

/**
 * Lo accionable sobre la medición, si lo hay y es el mismo para todos.
 *
 * Sale de los estados y no de la medida suelta para que el informe se pueda componer con lo
 * único que recibe. Es una sola línea al pie, no cuatro repetidas.
 */
function detalleDeLaMedida(estados: readonly EstadoDeModelo[]): string | undefined {
  for (const estado of estados) {
    if (estado.detalle !== undefined) return estado.detalle;
  }
  return undefined;
}

/**
 * Los avisos como anotaciones de GitHub Actions — solo con `--anotar`.
 *
 * Explícito y no automático por detectar el entorno: la salida de una orden no debería
 * cambiar según dónde se ejecute, y quien lea el registro de CI tiene que poder reproducir
 * exactamente lo que vio. `::warning::` y jamás `::error::`: este paso avisa y no puede
 * tumbar el flujo que despliega el sitio en vivo.
 */
export function anotaciones(estados: readonly EstadoDeModelo[]): string[] {
  return estados
    .filter((estado) => estado.aviso !== undefined)
    .map((estado) => `::warning title=Umbral de Activación cruzado::${escaparAnotacion(estado.aviso as string)}`);
}

/**
 * El escapado que exigen las órdenes de flujo de GitHub Actions.
 *
 * Una anotación es **una línea**: un salto de línea la parte y lo que va detrás se pierde o se
 * imprime como texto suelto, así que el Umbral cruzado deja de verse justo donde se mira. Y el
 * `%` es el carácter de escape del propio formato, de modo que un aviso que lo lleve sale
 * corrompido si no se escapa primero.
 *
 * Un `::` dentro del texto **no** se toca, y es deliberado: el mensaje de una orden de flujo es
 * todo lo que sigue al primer `::`, así que los siguientes son literales. Escaparlos
 * reescribiría el aviso —que es lo que alguien va a leer para decidir— a cambio de nada.
 */
export function escaparAnotacion(texto: string): string {
  return texto
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
}
