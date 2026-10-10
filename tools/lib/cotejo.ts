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
import { CLASE_BIOGRAFIA, nombreDeBiografia, nombreDeDocumento } from './documento.ts';
import { fuenteDe, fuenteDeUrl, revisionExacta } from './fuentes.ts';
import { ENLACES_DE_LICENCIA } from '../../src/lib/biografia.ts';

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
 * El censo sin la línea de una Cita — Historia 11.6.
 *
 * Recibe y devuelve el **fichero literal**, no la lista de slugs, y esa es toda la
 * decisión: el censo se lee con `parsearYaml` pero no se vuelve a volcar con un
 * serializador, porque el fichero es dos tercios comentario y esos comentarios son la
 * única explicación escrita de por qué existe un censo cerrado. Volcarlo desde la lista
 * los borraría en la primera baja, y la segunda persona que lo abriera vería 37 slugs sin
 * ninguna razón al lado.
 *
 * Se borra una línea. Todo lo demás —cabecera, sangrado, orden y el salto final— sale
 * exactamente como entró, que es lo que hace que el `git diff` de una baja sea legible de
 * un vistazo: una sola línea, y en rojo.
 *
 * `undefined` cuando el slug no está: no es un fallo —una Cita publicada después de la v3
 * nunca estuvo censada— pero tampoco hay nada que escribir, y distinguirlo evita reescribir
 * el fichero para dejarlo igual.
 */
export function censoSinLaCita(contenido: string, slug: string): string | undefined {
  const lineas = contenido.split('\n');
  const quedan = lineas.filter((linea) => !esEntradaDelCenso(linea, slug));
  return quedan.length === lineas.length ? undefined : quedan.join('\n');
}

/**
 * Si una línea del fichero es la entrada de ese slug.
 *
 * Se admiten las comillas aunque el fichero versionado no las use: YAML las acepta, y una
 * entrada entrecomillada que no se reconociera dejaría la Cita documentada **y** censada,
 * que es justo el estado que la historia dice que no puede existir.
 */
function esEntradaDelCenso(linea: string, slug: string): boolean {
  const entrada = /^[ \t]*-[ \t]*(.*?)[ \t]*\r?$/u.exec(linea);
  if (entrada === null) return false;
  return entrada[1].replace(/^["']|["']$/gu, '') === slug;
}

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

/**
 * **Todos** los documentos de una obra, porque una obra tiene tantos como páginas.
 *
 * Desde que se versiona un documento por página —y no uno por obra— *Los jardines
 * interiores* son tantos ficheros como poemas suyos se hayan recuperado. La Cita no apunta
 * de cuál salió, y no hace falta que lo apunte: lo que la regla exige es que su texto
 * aparezca **literal en su obra**, y la obra es el conjunto de esos ficheros. Buscar solo
 * el nombre corto dejaba fuera todo lo paginado y rompía la construcción con un «falta el
 * documento» que era mentira: estaba, con la página en el nombre.
 *
 * El nombre corto va primero para que el fallo, cuando no haya ninguno, siga nombrando la
 * ruta que quien siembra espera ver.
 */
export function documentosDeCita(
  fuente: { id: string } | undefined,
  obra: string | undefined,
  // Se miran los nombres y, de los valores, solo si declaran ser de biografía: vale
  // cualquier mapa de documentos por nombre.
  documentos: ReadonlyMap<string, unknown>,
): string[] {
  const corto = documentoDeCita(fuente, obra);
  if (corto === undefined) return [];
  const conPagina = `${corto}--`;
  return [...documentos.entries()]
    /*
     * Historia 17.1 — un documento que declara `clase: biografia` no es de ninguna Cita,
     * aunque esté mal colocado en `corpus/fuentes/`: así una obra cuyo identificador
     * coincida con el slug de un Autor no se traga su biografía por prefijo.
     */
    .filter(([, valor]) => !esDeBiografia(valor))
    .map(([nombre]) => nombre)
    .filter((nombre) => nombre === corto || nombre.startsWith(conPagina))
    .sort((a, b) => (a === corto ? -1 : b === corto ? 1 : a.localeCompare(b, 'es')));
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
export type DocumentosDeFuente = ReadonlyMap<string, string | null | typeof BIOGRAFIA_MAL_COLOCADA>;

/**
 * Historia 17.1 — lo que ocupa el sitio de un documento de `corpus/fuentes/` que declara
 * `clase: biografia`. No trae cuerpo a propósito: una biografía no se coteja con ninguna Cita.
 */
export const BIOGRAFIA_MAL_COLOCADA: { readonly clase: typeof CLASE_BIOGRAFIA } = Object.freeze({
  clase: CLASE_BIOGRAFIA,
});

/** Si el valor de un mapa de documentos declara ser de biografía. */
function esDeBiografia(valor: unknown): boolean {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    (valor as { clase?: unknown }).clase === CLASE_BIOGRAFIA
  );
}

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

    /*
     * Historia 17.1 — una Fuente mutable no sostiene Citas. Su documento es una biografía en
     * `corpus/biografias/`, que este cotejo no lee, así que sin esta regla la Cita fallaría
     * con «falta el documento» y la salida pediría recuperarlo: justo lo que no se arregla
     * recuperando.
     */
    if (fuenteDe(cita.fuente.id)?.mutable === true) {
      fallos.push({
        ruta: cita.ruta,
        regla:
          `Regla incumplida: una Fuente mutable no sostiene Citas. «${cita.fuente.id}» cambia ` +
          'cada día y su documento es una biografía, que no se coteja con ninguna Cita: ' +
          'documente la Cita con la edición de la obra de la que sale, o retírela a ' +
          'corpus/_revision/.',
      });
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
    const candidatos = documentosDeCita(cita.fuente, cita.obra, documentos);
    if (candidatos.length === 0) {
      fallos.push({
        ruta: cita.ruta,
        regla:
          `Regla incumplida: falta ${rutaDelDocumento}, el documento de «${cita.obra}» en ` +
          `${cita.fuente.id}. ${RECUPERAR}`,
      });
      continue;
    }

    /*
     * Un documento ilegible **no** deja de contar como intento: si el único que hay no se
     * analiza, el fallo es ese y no «no aparece». Con varios, uno roto no puede tapar a los
     * sanos, así que solo se informa cuando ninguno sirvió.
     */
    const legibles = candidatos.filter((n) => typeof documentos.get(n) === 'string');
    if (legibles.length === 0) {
      fallos.push({
        ruta: `corpus/fuentes/${candidatos[0]}.txt`,
        regla:
          'Regla incumplida: el documento no tiene la forma que produce la recuperación ' +
          '(cabecera, «---», declaración, «---» y cuerpo), así que no hay cuerpo contra ' +
          `el que cotejar «${cita.slug}». ${RECUPERAR}`,
      });
      continue;
    }

    const donde = legibles.find((n) => apareceEnDocumento(cita.texto, documentos.get(n) as string));
    if (donde === undefined) {
      const enumerados = legibles.map((n) => `corpus/fuentes/${n}.txt`).join(', ');
      fallos.push({
        ruta: cita.ruta,
        regla:
          'Regla incumplida: el texto de la Cita no aparece literalmente en el cuerpo de ' +
          `${enumerados}. La comparación colapsa espacios y nada más: un acento o un ` +
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
export function titularDeFallos(cuantos: number, deBiografias = 0): string {
  // Historia 17.1 — las biografías cuentan en el mismo recuento, y el titular las nombra.
  const biografias =
    deBiografias === 0
      ? ''
      : ` (${deBiografias === cuantos ? (cuantos === 1 ? 'es' : 'todos son') : `${deBiografias}`} ` +
        `de ${deBiografias === 1 ? 'la biografía de un Autor' : 'biografías de Autor'})`;
  return (
    `El cotejo detiene la construcción: ${cuantos} ` +
    `${cuantos === 1 ? 'incumplimiento' : 'incumplimientos'}${biografias}. El detalle, con la ` +
    'ruta de cada fichero y la regla incumplida, está justo encima.'
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

// ─────────────────────────────────────────────────────────────────────────────
// La biografía que declara un Autor — Historias 17.1 y 17.2
// ─────────────────────────────────────────────────────────────────────────────

/** Un Autor tal y como lo necesita la puerta: dónde está, qué biografía declara y su semblanza. */
export interface AutorParaCotejar {
  /** El fichero del Autor, como se teclea. */
  ruta: string;
  biografia?: { documento: string; revision: number };
  /**
   * La semblanza del fichero — Historia 17.2: si el Autor declara biografía, tiene que estar
   * **literal** en su cuerpo. Opcional en el tipo porque el fichero se lee sin validar; un
   * Autor con biografía y sin semblanza no pasa la puerta.
   */
  semblanza?: string;
}

/**
 * Un documento de biografía tal y como lo lee la puerta: su cabecera y su cuerpo — Historia
 * 17.2, que coteja la semblanza contra el cuerpo con la misma comparación que las Citas.
 */
export interface DocumentoDeBiografiaParaCotejar {
  cabecera: unknown;
  cuerpo: string;
}

/**
 * Cuántas palabras tiene, como poco, una semblanza atribuida — Historia 17.2.
 *
 * Con menos, «fue un filósofo» casa literal en casi cualquier artículo: el cotejo dejaría de
 * decir nada sobre de dónde sale el texto.
 */
export const MIN_PALABRAS_SEMBLANZA = 8;

/** El marcado de wikitexto que una semblanza atribuida no puede arrastrar — Historia 17.2. */
export const MARCADO_DE_WIKITEXTO: readonly string[] = ['[[', ']]', "'''", "''", '{{', '<ref'];

/**
 * Comprueba que la biografía que declara cada Autor es **la revisión versionada**, y que su
 * semblanza sale de ella.
 *
 * Una Fuente mutable cambia, y la revisión es lo único fijo de ella. Sin esta puerta,
 * actualizar la revisión en el Autor seguiría apoyándose en el documento viejo y publicaría
 * una procedencia falsa sin que nada fallara. Rompe cuando el Autor declara `biografia` y:
 *
 *   · el documento no está en `corpus/biografias/`, o está y no se deja analizar;
 *   · el documento no es de una Fuente mutable, o no es una biografía;
 *   · la revisión de su cabecera —o la de su nombre— no es la declarada;
 *   · el enlace de su cabecera no es un `https` de esa revisión, o su licencia no tiene
 *     escritura enlazable (Historia 17.2);
 *   · su semblanza lleva marcado de wikitexto, o tiene menos de `MIN_PALABRAS_SEMBLANZA`;
 *   · su semblanza no aparece **literal** en el cuerpo del documento (Historia 17.2), con la
 *     misma comparación que el cotejo de Citas (`apareceEnDocumento`). Así «una semblanza sin
 *     procedencia declarada no se publica» es una puerta y no una promesa: lo publicado con
 *     la atribución de una revisión está, palabra por palabra, en esa revisión.
 *
 * Cada fallo nombra el fichero del Autor, el documento y las dos revisiones.
 */
export function cotejarBiografias(
  autores: readonly AutorParaCotejar[],
  // `unknown` a propósito: lo que haya en el mapa se valida antes de usarlo. Lo que se espera
  // es un `DocumentoDeBiografiaParaCotejar`, o `null` si el fichero no se deja analizar.
  documentos: ReadonlyMap<string, unknown>,
  carpeta = 'corpus/biografias',
): FalloDeCotejo[] {
  const fallos: FalloDeCotejo[] = [];

  for (const autor of autores) {
    const declarada = autor.biografia;
    if (declarada === undefined) continue;

    const ruta = `${carpeta}/${declarada.documento}.txt`;
    const regla = (detalle: string) => ({ ruta: autor.ruta, regla: `Regla incumplida: ${detalle}` });
    const delante = `el Autor declara la biografía ${ruta} (revisión ${declarada.revision}) y`;

    if (!documentos.has(declarada.documento)) {
      fallos.push(
        regla(
          `${delante} ese documento no existe. Recupere esa revisión con: npx tsx ` +
            'tools/recuperar.ts "<enlace permanente con oldid>", y declárela con: npx tsx ' +
            'tools/autor.ts biografia <slug> <documento>.',
        ),
      );
      continue;
    }

    const documento = documentos.get(declarada.documento);
    const cabecera = formaDeBiografia(
      typeof documento === 'object' && documento !== null
        ? (documento as { cabecera?: unknown }).cabecera
        : undefined,
    );
    if (cabecera === 'ilegible') {
      fallos.push(
        regla(
          `${delante} ese documento no tiene la forma que produce la recuperación, así que no ` +
            'se sabe de qué revisión es.',
        ),
      );
      continue;
    }

    if (cabecera.clase !== CLASE_BIOGRAFIA || fuenteDe(cabecera.fuente)?.mutable !== true) {
      fallos.push(
        regla(
          `${delante} ese documento no es la biografía de una Fuente mutable (fuente ` +
            `«${cabecera.fuente}»${cabecera.clase === CLASE_BIOGRAFIA ? '' : ', sin «clase: biografia»'}).`,
        ),
      );
      continue;
    }

    if (cabecera.revision !== declarada.revision) {
      fallos.push(
        regla(
          `el Autor declara la revisión ${declarada.revision} de su biografía y ${ruta} es ` +
            `la revisión ${cabecera.revision}. Una revisión distinta es otro documento: ` +
            'recupérela, o declare la que está versionada.',
        ),
      );
      continue;
    }

    // El nombre entero, con el segmento de Fuente: es lo que la recuperación escribe.
    const esperado = nombreDeBiografia(cabecera.fuente, cabecera.titulo, cabecera.revision);
    if (esperado !== declarada.documento) {
      fallos.push(
        regla(
          `${delante} su cabecera (fuente «${cabecera.fuente}», «${cabecera.titulo}», revisión ` +
            `${cabecera.revision}) corresponde a ${esperado === undefined ? 'ningún nombre utilizable' : `${carpeta}/${esperado}.txt`}: ` +
            'el nombre y la cabecera del documento tienen que decir lo mismo.',
        ),
      );
      continue;
    }

    /*
     * Historia 17.2 — lo que la página publica con la atribución sale de la cabecera: el
     * enlace tiene que ser `https` y apuntar a **esa** revisión, y la licencia tiene que tener
     * escritura enlazable. Un enlace a otra revisión atribuiría un texto que no es este.
     */
    const revisionDelEnlace =
      typeof cabecera.url === 'string' &&
      /^https:\/\//u.test(cabecera.url) &&
      fuenteDeUrl(cabecera.url)?.id === cabecera.fuente
        ? fuenteDe(cabecera.fuente)?.revision?.revisionDe(cabecera.url)
        : undefined;
    if (revisionDelEnlace !== declarada.revision) {
      fallos.push(
        regla(
          `${delante} el enlace de su cabecera (${String(cabecera.url)}) no es un enlace ` +
            `permanente https de la revisión ${declarada.revision} en su Fuente: la atribución publica ese ` +
            'enlace, y tiene que llevar a esta revisión y no a otra. Recupere el documento de nuevo.',
        ),
      );
      continue;
    }
    if (typeof cabecera.licencia !== 'string' || ENLACES_DE_LICENCIA[cabecera.licencia] === undefined) {
      fallos.push(
        regla(
          `${delante} su licencia («${String(cabecera.licencia)}») no es ninguna de las que la ` +
            `atribución sabe enlazar (${Object.keys(ENLACES_DE_LICENCIA).join(', ')}).`,
        ),
      );
      continue;
    }

    /*
     * Historia 17.2 — la semblanza tiene que estar en el documento que la atribuye. El
     * sistema nunca compone una semblanza: o está literal en la revisión declarada, o no se
     * publica con su atribución, y el build se para.
     */
    const cuerpo = (documento as { cuerpo?: unknown }).cuerpo;
    if (typeof cuerpo !== 'string') {
      fallos.push(
        regla(`${delante} ese documento no tiene la forma que produce la recuperación.`),
      );
      continue;
    }
    if (typeof autor.semblanza !== 'string' || autor.semblanza.trim() === '') {
      fallos.push(
        regla(
          `${delante} no tiene semblanza que cotejar. La semblanza de un Autor con biografía ` +
            'es el texto literal de esa revisión.',
        ),
      );
      continue;
    }
    /*
     * El cuerpo es wikitexto despojado a medias: una semblanza copiada de él puede arrastrar
     * marcado que el despojado no quitó, y casaría literal igual. Publicado, se leería
     * «[[Córdoba]]». Se rechaza aquí y no en la página, que no reescribe texto ajeno.
     */
    const marcado = MARCADO_DE_WIKITEXTO.find((marca) => autor.semblanza!.includes(marca));
    if (marcado !== undefined) {
      fallos.push(
        regla(
          `${delante} su semblanza lleva marcado de wikitexto («${marcado}»). Copie el texto ` +
            'tal y como se lee, sin marcado.',
        ),
      );
      continue;
    }
    const palabras = colapsarEspacios(autor.semblanza).split(' ').length;
    if (palabras < MIN_PALABRAS_SEMBLANZA) {
      fallos.push(
        regla(
          `${delante} su semblanza tiene ${palabras} ${palabras === 1 ? 'palabra' : 'palabras'}, ` +
            `y una semblanza atribuida tiene al menos ${MIN_PALABRAS_SEMBLANZA}: un fragmento ` +
            'tan corto casa en cualquier artículo y no sitúa a nadie.',
        ),
      );
      continue;
    }
    if (!apareceEnDocumento(autor.semblanza, cuerpo)) {
      fallos.push(
        regla(
          `${delante} su semblanza no aparece literal en el cuerpo de ese documento. La ` +
            'semblanza de un Autor con biografía se copia tal cual de la revisión que la ' +
            'atribuye —solo cuenta el espaciado—: corríjala con el texto del documento, o ' +
            'retire la biografía del Autor y conserve la semblanza propia.',
        ),
      );
    }
  }

  return fallos;
}

/**
 * La cabecera de un valor del mapa, validada en su forma: un objeto con `fuente`, y si dice
 * ser biografía, `titulo` y una revisión entera segura. Lo demás es `'ilegible'`.
 */
function formaDeBiografia(
  valor: unknown,
):
  | {
      clase: typeof CLASE_BIOGRAFIA;
      fuente: string;
      titulo: string;
      revision: number;
      // Se validan después, con su propio mensaje: Historia 17.2.
      url: unknown;
      licencia: unknown;
    }
  | { clase: undefined; fuente: string }
  | 'ilegible' {
  if (typeof valor !== 'object' || valor === null) return 'ilegible';
  const { clase, fuente, titulo, revision, url, licencia } = valor as Record<string, unknown>;
  if (typeof fuente !== 'string' || fuente === '') return 'ilegible';
  if (clase === undefined) return { clase: undefined, fuente };
  if (clase !== CLASE_BIOGRAFIA || typeof titulo !== 'string' || titulo === '') return 'ilegible';
  if (typeof revision !== 'number' || revisionExacta(revision) === undefined) return 'ilegible';
  return { clase, fuente, titulo, revision, url, licencia };
}
