/**
 * El cotejo: ninguna Cita se publica sin aparecer en su documento — Historia 11.2.
 *
 * Puro y sin disco. Aquí vive lo que decide: cómo se comparan dos textos, qué documento
 * le toca a cada Cita, y qué Citas están exentas por el censo. Quien lee `corpus/` y
 * rompe la construcción es `integraciones/cotejo.ts`, que es una cáscara fina encima de
 * esto y vive fuera de `src/lib/` porque AD-5 exige que la derivación no toque el disco.
 *
 * La separación es la misma que la de `documento.ts`: lo que decide qué se publica —y
 * sobre todo qué no— se prueba entero sin construir el sitio, y las pruebas de build
 * comprueban que la puerta está de verdad puesta, no cómo razona.
 */

import { createHash } from 'node:crypto';
import { nombreDeDocumento } from './documento.ts';

// ─────────────────────────────────────────────────────────────────────────────
// La comparación
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Caracteres que no se ven y que una edición web reparte a mansalva.
 *
 * El guion blando (U+00AD) lo mete cualquier maquetador para partir palabras; los de
 * ancho cero (U+200B a U+200D, U+2060) los meten las plantillas para controlar dónde
 * corta la línea; U+FEFF aparece al principio de un fichero y a veces en medio.
 *
 * Ninguno es `\s`, así que colapsar espacios no los toca: sin retirarlos, un texto
 * **idéntico** al de la edición falla el cotejo sin que se vea ninguna diferencia, y el
 * build se queda bloqueado sin que nadie pueda saber por qué. Retirarlos no relaja nada:
 * no son texto, no se leen y no distinguen dos Citas.
 */
const INVISIBLES = /[\u00ad\u200b\u200c\u200d\u2060\ufeff]/gu;
//                   ^guion   ^ancho cero            ^junta  ^marca de orden
//                    blando                          palabras   de bytes

/**
 * Colapsa los espacios, retira lo invisible, y nada más.
 *
 * Una edición digital reparte los saltos de línea donde le conviene —y la retirada de
 * marcado los reparte otra vez—, así que el espaciado no puede decidir si una Cita
 * aparece en su documento. Todo lo demás sí: un acento cambiado es otra palabra y una
 * coma de más es otra puntuación, y cazar justamente eso es para lo que existe el
 * cotejo. Por eso no pasa por `src/lib/normalizar.ts`, que está para los slugs y quita
 * ahí precisamente lo que aquí tiene que decidir.
 *
 * `\s` cubre también el espacio duro y los espacios finos, que es lo que produce una
 * página web y lo que `aTextoPlano` ya traduce a espacio normal al versionar.
 */
export function colapsarEspacios(texto: string): string {
  return texto.replace(INVISIBLES, '').replace(/\s+/gu, ' ').trim();
}

/**
 * Si el texto de una Cita aparece **literalmente** en el cuerpo de su documento.
 *
 * Un texto que se queda en nada al colapsar espacios no aparece en ninguna parte: sin
 * este guardián, `''.includes('')` daría por cotejada una Cita vacía.
 */
export function apareceEnDocumento(texto: string, cuerpo: string): boolean {
  const buscado = colapsarEspacios(texto);
  if (buscado === '') return false;
  return colapsarEspacios(cuerpo).includes(buscado);
}

/**
 * La huella de un texto: lo que ata una exención del censo a **esa** Cita y no a su slug.
 *
 * Sin ella el censo se cerraba por recuento y no por identidad: bastaba retirar una de
 * las 38 y escribir otra Cita distinta con su mismo slug para heredar la exención, sin
 * que el recuento se moviera. Se guarda la huella y no el texto porque el texto de una
 * Cita tiene un solo dueño —su fichero— y copiarlo aquí sería un segundo origen de
 * verdad de lo que NFR-12 protege.
 */
export function huellaDeTexto(texto: string): string {
  return createHash('sha256').update(colapsarEspacios(texto), 'utf8').digest('hex').slice(0, 12);
}

// ─────────────────────────────────────────────────────────────────────────────
// El censo cerrado
// ─────────────────────────────────────────────────────────────────────────────

/** El censo, para que su ruta y su nombre tengan un solo dueño. */
export const FICHERO_DEL_CENSO = 'pendientes-de-cotejo.yml';

/**
 * Cuántas Citas puede amparar el censo de pendientes de cotejo.
 *
 * Es el punto de partida medido de la Épica 11: las 38 Citas anteriores a la v3, que no
 * tienen documento porque se dieron de alta antes de que existiera la recuperación.
 * Quien se lo da es la Historia 11.4.
 *
 * El número está aquí y no en `src/lib/umbrales.ts` a propósito: no es una regla del
 * producto —no decide nada de lo que el visitante ve— sino un trinquete sobre deuda
 * técnica, y `src/lib/` es justo donde el cotejo no puede aparecer. Lo aplica `cotejar`,
 * no solo una prueba: un tope que solo vigila la suite no detiene una construcción.
 */
export const TOPE_DE_PENDIENTES_DE_COTEJO = 38;

/**
 * El censo de partida: las 38 Citas anteriores a la v3, cada una con la huella de su
 * texto en el momento de abrir la épica.
 *
 * Esta constante es lo que hace que el censo **solo mengue**. Con un tope a secas, el
 * día que la 11.4 libere una entrada quedaría un hueco, y meter ahí una Cita nueva
 * pasaría el recuento sin que nada se quejara. Con el conjunto escrito, una entrada que
 * no esté aquí rompe la construcción, y una Cita cuyo texto no case con la huella
 * registrada tampoco cuela: reutilizar el slug de una Cita retirada no hereda su
 * exención.
 *
 * Nadie añade líneas a esta tabla. Quitar una es lo que hace la 11.4 al darle documento
 * a una Cita, y va acompañado de quitarla de `corpus/pendientes-de-cotejo.yml`.
 */
export const CENSO_DE_PARTIDA: Readonly<Record<string, string>> = {
  'antonio-machado-caminante-no-hay-camino-se-hace-camino': 'ad62e6611bf9',
  'antonio-machado-despacito-y-buena-letra-el-hacer-las': '8fb731038b81',
  'antonio-machado-en-mi-soledad-he-visto-cosas-muy': '6afc565d060a',
  'antonio-machado-es-de-necios-confundir-el-ruido-con': 'c5ce02cd2418',
  'antonio-machado-hoy-es-siempre-todavia': 'ddc526e4271c',
  'antonio-machado-todo-necio-confunde-valor-y-precio': '6a06b76df9c4',
  'baltasar-gracian-el-sabio-hace-luego-lo-que-el': '389a337ebb60',
  'baltasar-gracian-lo-bueno-si-breve-dos-veces-bueno': 'ff81319cde49',
  'baltasar-gracian-saber-y-saberlo-mostrar-es-saber-dos': '6d58c71e4bb6',
  'concepcion-arenal-abrid-escuelas-y-se-cerraran-carceles': '55d1b7512030',
  'concepcion-arenal-odia-el-delito-y-compadece-al-delincuente': '4d8a0852178b',
  'francisco-de-quevedo-poderoso-caballero-es-don-dinero': '7b2a1f997452',
  'jose-marti-con-los-pobres-de-la-tierra-quiero': '1176cecf2dfc',
  'jose-marti-cultivo-una-rosa-blanca-en-junio-como': 'ac796837415c',
  'jose-marti-hacer-es-la-mejor-manera-de-decir': 'aa36e7ce982c',
  'jose-marti-yo-soy-un-hombre-sincero-de-donde': '51c32b3f57b7',
  'miguel-de-cervantes-bien-predica-quien-bien-vive': 'a16b7ce40ad0',
  'miguel-de-cervantes-cada-uno-es-hijo-de-sus-obras': '1c3ff56c70b9',
  'miguel-de-cervantes-donde-una-puerta-se-cierra-otra-se': '907f0a6136ca',
  'miguel-de-cervantes-el-que-lee-mucho-y-anda-mucho': '31660777e2c2',
  'miguel-de-cervantes-la-libertad-sancho-es-uno-de-los': 'e9094c1b66bc',
  'miguel-de-cervantes-la-pluma-es-la-lengua-del-alma': '6bc101547bb0',
  'miguel-de-unamuno-la-fe-que-no-duda-es-fe': 'cc66c74af2c1',
  'miguel-de-unamuno-solo-el-que-sabe-es-libre-y': '4fc211e96033',
  'rosalia-de-castro-yo-no-se-lo-que-busco-eternamente': 'dd7a336e9eb8',
  'santiago-ramon-y-cajal-las-ideas-no-duran-mucho-hay-que': '72d23abb91e1',
  'santiago-ramon-y-cajal-todo-hombre-puede-ser-si-se-lo': 'd8033c50b684',
  'seneca-la-vida-si-sabes-usarla-es-larga': 'a0696c286198',
  'seneca-mientras-esperamos-vivir-la-vida-pasa': 'b33d312371c7',
  'seneca-ninguna-cosa-se-parece-tanto-a-la': '150711129832',
  'seneca-no-es-que-tengamos-poco-tiempo-es': '70f6bd7a431d',
  'seneca-no-hay-viento-favorable-para-el-que': 'e6062c30af59',
  'sor-juana-ines-de-la-cruz-en-perseguirme-mundo-que-interesas': '56523f6d697f',
  'sor-juana-ines-de-la-cruz-hombres-necios-que-acusais-a-la-mujer': '2a6074842ef0',
  'sor-juana-ines-de-la-cruz-yo-no-estudio-para-saber-mas-sino': '05c89277fcb4',
  'teresa-de-jesus-la-paciencia-todo-lo-alcanza': '112a5c414273',
  'teresa-de-jesus-nada-te-turbe-nada-te-espante-todo': '9ab57c632ead',
  'teresa-de-jesus-quien-a-dios-tiene-nada-le-falta': 'bfc0eb46246d',
};

/**
 * El documento que le toca a una Cita: `{id-de-fuente}--{slug-de-obra}`, sin extensión.
 *
 * Sale del mismo ayudante que nombra el fichero al recuperarlo, y no de un campo
 * apuntado en la Cita, para que no puedan divergir. `undefined` cuando la Cita no da con
 * qué componerlo: sin obra no hay documento contra el que cotejar.
 */
export function documentoDeCita(
  fuente: { id: string } | undefined,
  obra: string | undefined,
): string | undefined {
  if (fuente === undefined || obra === undefined || obra.trim() === '') return undefined;
  return nombreDeDocumento(fuente.id, obra);
}

const RECUPERAR =
  'Recupere su Fuente con: npx tsx tools/recuperar.ts <url> — y siembre desde el ' +
  'documento con tools/extraer.ts.';

const CENSO_CERRADO =
  `El censo de ${FICHERO_DEL_CENSO} es un censo cerrado de lo anterior a la v3: solo ` +
  'mengua, no admite altas.';

/** Lo que se le dice a una Cita nueva que llega sin documento, se llegue por donde se llegue. */
const SIN_FUENTE =
  'Regla incumplida: la Cita no declara de qué Fuente salió, así que no hay documento ' +
  `contra el que cotejar su texto. ${RECUPERAR} ${CENSO_CERRADO}`;

/**
 * Si una Cita puede vivir en `corpus/citas/` sin documento, y si no, por qué no.
 *
 * Lo consumen las tres puertas que escriben ahí —el alta por lote, la aprobación de
 * candidatas y el propio cotejo del build— para que digan lo mismo. Sin esto, el alta y
 * la aprobación publicaban felizmente una Cita sin Fuente y la construcción siguiente se
 * caía: un build roto fabricado por la herramienta que debía impedirlo.
 *
 * `undefined` es «puede publicarse». Devuelve motivo cuando no.
 */
export function motivoParaNoPublicar(
  cita: { slug: string; texto: string; fuente?: unknown },
  censoDePartida: Readonly<Record<string, string>> = CENSO_DE_PARTIDA,
): string | undefined {
  if (cita.fuente !== undefined && cita.fuente !== null) return undefined;

  const huellaCensada = censoDePartida[cita.slug];
  if (huellaCensada === undefined) return SIN_FUENTE;

  if (huellaCensada !== huellaDeTexto(cita.texto)) {
    return (
      `Regla incumplida: «${cita.slug}» está en el censo de partida, pero con otro texto. ` +
      'La exención es de aquella Cita, no de su slug, y no se hereda reutilizándolo. ' +
      RECUPERAR
    );
  }

  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// El cotejo del corpus entero
// ─────────────────────────────────────────────────────────────────────────────

export interface CitaParaCotejar {
  slug: string;
  /** Ruta legible del fichero. El fallo tiene que nombrarla (criterio de la historia). */
  ruta: string;
  texto: string;
  /** La obra de su Procedencia, que es la mitad del nombre del documento. */
  obra?: string;
  fuente?: { id: string; url?: string };
}

/**
 * Los documentos de `corpus/fuentes/`, por nombre sin extensión.
 *
 * `null` es un fichero que ocupa el nombre pero no se deja analizar: no es lo mismo que
 * no estar, y el mensaje que merece es otro.
 */
export type DocumentosDeFuente = ReadonlyMap<string, string | null>;

export interface EntradaDeCotejo {
  citas: readonly CitaParaCotejar[];
  documentos: DocumentosDeFuente;
  /** Los slugs del censo, tal y como están escritos en el fichero. */
  censo: readonly string[];
  /** Ruta legible del censo, para nombrarla en sus propios fallos. */
  rutaDelCenso?: string;
  /** El conjunto cerrado que el censo no puede desbordar. Solo las pruebas lo cambian. */
  censoDePartida?: Readonly<Record<string, string>>;
  /** Cuántas exenciones se admiten como mucho. */
  tope?: number;
}

export interface FalloDeCotejo {
  /** El fichero que incumple. */
  ruta: string;
  /** La regla incumplida, y qué hacer. */
  regla: string;
}

export interface ResultadoDeCotejo {
  ok: boolean;
  fallos: FalloDeCotejo[];
  /** Slugs exentos por el censo: la deuda que queda. */
  pendientes: string[];
  /** Citas cuyo texto se ha localizado en su documento. */
  cotejadas: number;
}

/**
 * Coteja el corpus entero contra sus documentos.
 *
 * Se recogen **todos** los fallos y no solo el primero: quien construye después de una
 * sesión de sembrado quiere la lista, no ir descubriéndolos de uno en uno.
 */
export function cotejar(entrada: EntradaDeCotejo): ResultadoDeCotejo {
  const { citas, documentos, censo } = entrada;
  const rutaDelCenso = entrada.rutaDelCenso ?? `corpus/${FICHERO_DEL_CENSO}`;
  const censoDePartida = entrada.censoDePartida ?? CENSO_DE_PARTIDA;
  const tope = entrada.tope ?? TOPE_DE_PENDIENTES_DE_COTEJO;

  const fallos: FalloDeCotejo[] = [];
  const pendientes: string[] = [];
  let cotejadas = 0;

  const publicadas = new Map(citas.map((c) => [c.slug, c]));
  const enCenso = new Set(censo);

  // El trinquete se aplica **aquí**, donde corre el cotejo, y no solo en una prueba: un
  // tope que solo vigila la suite no detiene ninguna construcción, y el build imprime el
  // número como si lo aplicara.
  if (enCenso.size > tope) {
    fallos.push({
      ruta: rutaDelCenso,
      regla:
        `Regla incumplida: el censo ampara ${enCenso.size} Citas y el tope es ${tope}. ` +
        'El tope solo baja, y bajarlo es un cambio a mano en tools/lib/cotejo.ts.',
    });
  }

  for (const slug of enCenso) {
    // Primero la identidad: una entrada que no es de las 38 de partida no es deuda
    // heredada, es un alta encubierta, y el recuento no la distingue.
    if (censoDePartida[slug] === undefined) {
      fallos.push({
        ruta: rutaDelCenso,
        regla:
          `Regla incumplida: «${slug}» no es una de las Citas anteriores a la v3. ` +
          `${CENSO_CERRADO} Una Cita nueva sin documento no se exime: ${RECUPERAR}`,
      });
      continue;
    }

    const cita = publicadas.get(slug);
    if (cita === undefined) {
      // El censo solo mengua: una exención que sobrevive a la Cita que la justificaba
      // ampara mañana a otra que reutilice el slug.
      fallos.push({
        ruta: rutaDelCenso,
        regla:
          `Regla incumplida: «${slug}» ya no está entre las Citas publicadas y sigue en ` +
          'el censo. El censo solo mengua: quite la entrada. Si la ha retirado a ' +
          'corpus/_revision/, retírela también de aquí, en el mismo cambio.',
      });
    }
  }

  for (const cita of citas) {
    if (enCenso.has(cita.slug)) {
      if (cita.fuente !== undefined) {
        // Tiene documento y sigue exenta: la exención ya no se sostiene, y dejarla
        // dejaría el cotejo sin correr sobre una Cita que sí se puede cotejar.
        fallos.push({
          ruta: cita.ruta,
          regla:
            `Regla incumplida: «${cita.slug}» ya declara Fuente y sigue en ` +
            `${rutaDelCenso}. Quítela del censo para que se coteje.`,
        });
        continue;
      }

      const motivo = motivoParaNoPublicar(cita, censoDePartida);
      if (motivo !== undefined) {
        fallos.push({ ruta: cita.ruta, regla: motivo });
        continue;
      }

      pendientes.push(cita.slug);
      continue;
    }

    if (cita.fuente === undefined) {
      // Su slug puede estar en el censo de partida y aun así no valer: la exención la da
      // estar **escrita** en el censo del corpus, no ser de las 38.
      fallos.push({ ruta: cita.ruta, regla: SIN_FUENTE });
      continue;
    }

    if (cita.obra === undefined || cita.obra.trim() === '') {
      fallos.push({
        ruta: cita.ruta,
        regla:
          'Regla incumplida: la Cita declara Fuente pero su Procedencia no declara obra, ' +
          'y el documento se nombra por Fuente y obra. Sin obra no hay contra qué cotejar.',
      });
      continue;
    }

    const nombre = documentoDeCita(cita.fuente, cita.obra);
    if (nombre === undefined) {
      fallos.push({
        ruta: cita.ruta,
        regla:
          `Regla incumplida: de la Fuente «${cita.fuente.id}» y la obra «${cita.obra}» no ` +
          'sale ningún nombre de documento utilizable.',
      });
      continue;
    }

    const rutaDelDocumento = `corpus/fuentes/${nombre}.txt`;
    if (!documentos.has(nombre)) {
      fallos.push({
        ruta: cita.ruta,
        regla:
          `Regla incumplida: falta ${rutaDelDocumento}, el documento de «${cita.obra}» en ` +
          `${cita.fuente.id}. ${RECUPERAR}`,
      });
      continue;
    }

    const cuerpo = documentos.get(nombre);
    if (cuerpo === null || cuerpo === undefined) {
      fallos.push({
        ruta: rutaDelDocumento,
        regla:
          'Regla incumplida: el documento no tiene la forma que produce la recuperación ' +
          '(cabecera, «---», declaración, «---» y cuerpo), así que no hay cuerpo contra ' +
          `el que cotejar «${cita.slug}». ${RECUPERAR}`,
      });
      continue;
    }

    if (!apareceEnDocumento(cita.texto, cuerpo)) {
      fallos.push({
        ruta: cita.ruta,
        regla:
          'Regla incumplida: el texto de la Cita no aparece literalmente en el cuerpo de ' +
          `${rutaDelDocumento}. La comparación colapsa espacios y nada más: un acento o un ` +
          'signo que difieran de la edición hacen fallar. No se toca el texto de la Cita ' +
          'para que cuadre (NFR-12): corrija la Cita contra su edición o retírela a ' +
          'corpus/_revision/.',
      });
      continue;
    }

    cotejadas += 1;
  }

  return { ok: fallos.length === 0, fallos, pendientes, cotejadas };
}

/**
 * El titular del fallo, con el plural que toca.
 *
 * Va **solo** en la excepción que detiene la construcción; el detalle va por el registro.
 * Decirlo en los dos sitios lo imprimía dos veces y hacía leer la lista dos veces para
 * comprobar que era la misma.
 */
export function titularDeFallos(cuantos: number): string {
  return (
    `El cotejo detiene la construcción: ${cuantos} ` +
    `${cuantos === 1 ? 'incumplimiento' : 'incumplimientos'}. El detalle, con la ruta de ` +
    'cada fichero y la regla incumplida, está justo encima.'
  );
}

/** El detalle que se escribe cuando el cotejo rompe la construcción: una entrada por fallo. */
export function formatearFallos(fallos: readonly FalloDeCotejo[]): string {
  const lineas: string[] = [];
  for (const fallo of fallos) {
    lineas.push(`  ${fallo.ruta}`);
    lineas.push(`      ${fallo.regla}`);
    lineas.push('');
  }
  return lineas.join('\n');
}

/** La línea que el build escribe cuando el cotejo pasa, con los plurales que tocan. */
export function resumenDelBuild(cotejadas: number, pendientes: number, tope: number): string {
  return (
    `${cotejadas} ${cotejadas === 1 ? 'Cita cotejada' : 'Citas cotejadas'} contra su ` +
    `documento; ${pendientes} ${pendientes === 1 ? 'pendiente' : 'pendientes'} de cotejo ` +
    `de un tope de ${tope}.`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// La deuda, contada para la auditoría
// ─────────────────────────────────────────────────────────────────────────────

export interface ResumenDeCotejo {
  /** Citas publicadas que declaran Fuente, y que por tanto el build coteja. */
  conDocumento: number;
  /** Citas publicadas amparadas por el censo. */
  pendientes: number;
  /** Entradas del censo que no corresponden a ninguna Cita publicada. */
  rancias: number;
  tope: number;
}

/**
 * La deuda de cotejo del Corpus, para el informe de salud — puro, para poder probarlo.
 *
 * Vivía suelto dentro de `tools/auditoria.ts`, que no tiene pruebas: un recuento que
 * miente en silencio en el informe que existe para medir SM-C1 es peor que no tenerlo.
 */
export function resumenDeCotejo(
  citas: readonly { slug: string; fuente?: unknown }[],
  censo: readonly string[],
  tope: number = TOPE_DE_PENDIENTES_DE_COTEJO,
): ResumenDeCotejo {
  const enCenso = new Set(censo);
  const publicados = new Set(citas.map((c) => c.slug));

  return {
    conDocumento: citas.filter((c) => c.fuente !== undefined && c.fuente !== null).length,
    pendientes: citas.filter((c) => enCenso.has(c.slug)).length,
    rancias: [...enCenso].filter((slug) => !publicados.has(slug)).length,
    tope,
  };
}
