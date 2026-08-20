/**
 * Fijar jornadas de la Cita del Día — Historia 13.1.
 *
 * **Aquí no hay ningún calendario nuevo, y esa es toda la historia.** `corpus/portada.json`
 * ya tiene fijaciones de jornada y `src/lib/citaDelDia.ts` ya les da prioridad sobre la
 * rotación desde la v1. Componer varias jornadas de una sentada es escribir en ese mismo
 * sitio, y por eso «lo anticipado sustituye a lo de la jornada» no se implementa: se
 * cumple. Un almacén propio del lote habría creado dos orígenes de verdad y con ellos la
 * pregunta «cuál manda el martes», que hoy no existe y que no tiene ninguna respuesta buena.
 *
 * De ahí sale también que **recomponer salga gratis**: lo versionado es la fijación y nunca
 * el material. Cambiar la Cita de una jornada ya compuesta cambia lo que se compone en la
 * construcción siguiente sin que nadie recomponga nada, porque no hay nada guardado que
 * pudiera quedarse viejo.
 *
 * Lo que este módulo añade sobre editar el JSON a mano es lo mismo que la curación de
 * Colecciones añade sobre editar el YAML: las reglas que no son de un fichero sino de la
 * relación entre varios. Que el slug sea una Cita, que esté publicada, y que esté marcada
 * apta para portada — sin lo cual `citaDelDia` ignora la fijación en silencio y sale la
 * rotación, que es el fallo más difícil de ver de los tres.
 *
 * AD-22 — aquí no entra la red: esto lee y escribe ficheros del corpus, y nada más.
 */

import { esJornada, type Jornada } from '../../src/lib/citaDelDia.ts';
import { escribirPortada, leerCitas, leerPortada, type Rutas } from './corpus.ts';
import type { Resultado } from './gestion.ts';

/** Una jornada y la Cita que se le fija. */
export interface Fijacion {
  jornada: Jornada;
  cita: string;
}

/**
 * El comentario del fichero cuando lo escribe esta orden por primera vez.
 *
 * Es literalmente el que lleva `corpus/portada.json` en el repositorio. Se repite aquí
 * porque un corpus recién hecho no tiene el fichero y la primera fijación lo crea: sin
 * esto nacería mudo, y el siguiente que lo abriera no sabría que tiene prioridad sobre la
 * rotación ni por qué no lo carga ninguna colección.
 */
const COMENTARIO =
  'Fijaciones manuales de la Cita del Día: jornada ISO -> slug de la Cita. Tiene prioridad ' +
  'sobre la rotación automática (FR-9). Este fichero no lo carga ninguna colección: vive en ' +
  'la raíz de corpus/, fuera de citas/, autores/ y temas/.';

/**
 * Lo que el fichero de portada declara, o los motivos por los que no se puede escribir en él.
 *
 * Se juzga **el JSON en bruto** y no un objeto reconstruido, que es la lección de la
 * Historia 12.4: un lector que solo sabe nombrar `fijaciones` nunca le enseña al validador
 * el juego de claves real, y reescribir a partir de él borra en silencio lo que no supo
 * leer. Aquí se conserva todo —el `_comentario` incluido— y solo se sustituye `fijaciones`.
 *
 * Un fichero que no se entiende se **rechaza sin tocarlo**. Fijar una jornada sobre un
 * `fijaciones` que resultó ser una lista lo dejaría igual de roto y además reescrito, y
 * quien pidió fijar querría saber que su portada no está como cree.
 */
type Declaracion =
  | { ok: true; base: Record<string, unknown>; fijaciones: Record<string, string> }
  | { ok: false; motivos: string[] };

function esObjetoLlano(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function declaracionDe(ruta: string, bruto: unknown, ausente: boolean): Declaracion {
  if (ausente) return { ok: true, base: { _comentario: COMENTARIO }, fijaciones: {} };

  if (!esObjetoLlano(bruto)) {
    return {
      ok: false,
      motivos: [
        `${ruta} no contiene un objeto JSON, así que no se puede fijar nada en él. ` +
          'Debe ser { "_comentario": …, "fijaciones": { "AAAA-MM-DD": "slug-de-cita" } }.',
      ],
    };
  }

  const declaradas = bruto.fijaciones;
  if (declaradas === undefined) return { ok: true, base: bruto, fijaciones: {} };

  if (!esObjetoLlano(declaradas)) {
    return {
      ok: false,
      motivos: [
        `«fijaciones» de ${ruta} no es un objeto de jornada a slug. No se ha tocado el ` +
          'fichero: arréglelo antes de fijar nada.',
      ],
    };
  }

  const motivos: string[] = [];
  const fijaciones: Record<string, string> = {};
  for (const [jornada, cita] of Object.entries(declaradas)) {
    if (!esJornada(jornada)) {
      motivos.push(`${ruta}: «${jornada}» no es una jornada AAAA-MM-DD.`);
      continue;
    }
    if (typeof cita !== 'string') {
      motivos.push(`${ruta}: la jornada ${jornada} no apunta a un slug de Cita.`);
      continue;
    }
    fijaciones[jornada] = cita;
  }
  if (motivos.length > 0) {
    motivos.push('No se ha tocado el fichero: arréglelo antes de fijar nada.');
    return { ok: false, motivos };
  }

  return { ok: true, base: bruto, fijaciones };
}

/** Lee el fichero de portada y lo valida en un paso, que es como lo usan las tres órdenes. */
async function portadaDe(
  rutas: Rutas,
): Promise<{ ruta: string; declaracion: Declaracion }> {
  const { ruta, bruto, ausente } = await leerPortada(rutas);
  return { ruta, declaracion: declaracionDe(ruta, bruto, ausente) };
}

/**
 * Las fijaciones ordenadas por jornada, que es como se escriben siempre.
 *
 * Un objeto conserva el orden en que se insertaron sus claves, así que sin esto el fichero
 * cuenta el orden en que se compuso el lote en vez del calendario — y lo que se lee en él es
 * un calendario. Lo comparten `fijar` y `soltar`: con el orden en uno solo, la primera vez
 * que se soltara una jornada el fichero dejaría de estar ordenado y la garantía se perdería
 * sin que fallara nada.
 */
function ordenadas(fijaciones: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(fijaciones).sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Las Citas fijadas en más de una jornada. No es un error, y por eso solo se avisa.
 *
 * Repetir una Cita es legítimo —una que funcionó bien puede volver a salir— pero casi
 * siempre es un descuido al pegar una lista, y el día que se descubre ya se publicó dos
 * veces lo mismo. Rechazarlo obligaría a una bandera para forzarlo; decirlo cuesta una línea.
 */
function repetidas(fijaciones: Record<string, string>): { cita: string; jornadas: string[] }[] {
  const porCita = new Map<string, string[]>();
  for (const [jornada, cita] of Object.entries(fijaciones)) {
    porCita.set(cita, [...(porCita.get(cita) ?? []), jornada]);
  }
  return [...porCita]
    .filter(([, jornadas]) => jornadas.length > 1)
    .map(([cita, jornadas]) => ({ cita, jornadas: jornadas.sort((a, b) => a.localeCompare(b)) }))
    .sort((a, b) => a.cita.localeCompare(b.cita, 'es'));
}

/** Cómo se dice que una jornada no tiene la forma que la Cita del Día sabe leer. */
function motivoDeJornadaMalFormada(jornada: string): string {
  return (
    `«${jornada}» no es una jornada: se escriben en ISO 8601, AAAA-MM-DD —2026-08-24—, ` +
    'y tienen que existir en el calendario.'
  );
}

/**
 * Fija jornadas en `corpus/portada.json`, preservando las que ya hubiera.
 *
 * **O todo o nada**, como la asignación de miembros de una Colección: quien compone un lote
 * pega la semana entera de golpe, y una escritura a medias obligaría a averiguar cuáles
 * entraron. Nada se escribe hasta que todos los pares valen.
 *
 * **Preservar lo ya fijado es lo que hace el lote reanudable.** Dejarlo a medias el lunes y
 * retomarlo el jueves continúa donde se dejó, porque fijar añade y nunca vacía; `listar`
 * enseña hasta dónde se llegó. Volver a fijar una jornada que ya estaba **sí** la sustituye,
 * y también tiene que ser así: es como se cambia la Cita de una jornada ya compuesta, y su
 * material se recompone solo en la construcción siguiente porque no hay material guardado.
 *
 * `hoy` se recibe, no se averigua: es la jornada del build (`jornadaDelBuild`), la misma que
 * decide qué Cita sale. Quien la calcula es la orden, no esta función.
 */
export async function fijarJornadas(
  rutas: Rutas,
  pares: Fijacion[],
  hoy: Jornada,
): Promise<Resultado> {
  if (pares.length === 0) {
    return { ok: false, motivos: ['Indique al menos una jornada y la Cita que se le fija.'] };
  }

  const { ruta, declaracion } = await portadaDe(rutas);
  if (!declaracion.ok) return declaracion;

  const publicadas = await leerCitas(rutas.citas);
  const enRevision = await leerCitas(rutas.revision);
  const porSlug = new Map(publicadas.map((c) => [c.slug, c]));
  const revisandose = new Set(enRevision.map((c) => c.slug));

  const motivos: string[] = [];
  /** Lo pedido, con la última palabra para el último par: se juzga ya deduplicado. */
  const pedidas = new Map<string, string>();

  for (const { jornada, cita } of pares) {
    if (!esJornada(jornada)) {
      motivos.push(motivoDeJornadaMalFormada(jornada));
      continue;
    }

    if (jornada < hoy) {
      motivos.push(
        `La jornada ${jornada} ya pasó —hoy es ${hoy}—, y fijar el pasado no publica nada: ` +
          'la Cita del Día de un día vencido no la vuelve a componer ninguna construcción.',
      );
      continue;
    }

    const anterior = pedidas.get(jornada);
    if (anterior !== undefined && anterior !== cita) {
      // Dos Citas para el mismo día en la misma orden. Quedarse con la última sería
      // adivinar cuál de las dos quiso decir quien la escribió.
      motivos.push(
        `La jornada ${jornada} aparece dos veces en esta orden, con «${anterior}» y con ` +
          `«${cita}». Solo se fija una Cita por jornada.`,
      );
      continue;
    }

    if (!porSlug.has(cita)) {
      motivos.push(
        revisandose.has(cita)
          ? `La Cita «${cita}» no está publicada: sigue en corpus/_revision/. Apruébela ` +
            'antes de fijarla; una fijación no adelanta contenido en revisión.'
          : `La Cita «${cita}» no existe en el corpus. Compruebe el slug.`,
      );
      continue;
    }

    if (porSlug.get(cita)!.aptaParaPortada !== true) {
      /*
       * La regla que más falta hace que esté aquí. `citaDelDia` busca la Cita fijada
       * **entre las aptas para portada** (FR-15) y, si no está, ignora la fijación y rota
       * —hace bien: dejar la portada en blanco sería peor—. Así que fijar una Cita sin
       * marcar no falla: publica otra cosa el día que toque, sin decir nada a nadie.
       */
      motivos.push(
        `La Cita «${cita}» no está marcada como apta para portada, y la Cita del Día solo ` +
          'sale de las que lo están (FR-15): la fijación se ignoraría y ese día rotaría otra. ' +
          `Márquela con «npx tsx tools/portada.ts marcar ${cita}».`,
      );
      continue;
    }

    pedidas.set(jornada, cita);
  }

  if (motivos.length > 0) {
    motivos.push('No se ha fijado ninguna: el lote se escribe entero o no se escribe.');
    return { ok: false, motivos };
  }

  const fijaciones = { ...declaracion.fijaciones };
  const nuevas: string[] = [];
  const sustituidas: string[] = [];
  const iguales: string[] = [];
  for (const [jornada, cita] of [...pedidas].sort(([a], [b]) => a.localeCompare(b))) {
    const anterior = fijaciones[jornada];
    if (anterior === cita) iguales.push(`${jornada} → ${cita} (ya estaba así)`);
    else if (anterior === undefined) nuevas.push(`${jornada} → ${cita}`);
    else sustituidas.push(`${jornada} → ${cita} (antes ${anterior})`);
    fijaciones[jornada] = cita;
  }

  const escritas = ordenadas(fijaciones);

  // En la ruta que devolvió el lector, y con el objeto que traía: lo que no es `fijaciones`
  // se conserva tal cual, empezando por el `_comentario`.
  await escribirPortada(ruta, { ...declaracion.base, fijaciones: escritas });

  return {
    ok: true,
    ruta,
    mensaje: [
      `${pedidas.size} ${pedidas.size === 1 ? 'jornada fijada' : 'jornadas fijadas'} en ${ruta}.`,
      ...nuevas.map((l) => `  · ${l}`),
      ...sustituidas.map((l) => `  · ${l}`),
      ...iguales.map((l) => `  · ${l}`),
      ...(sustituidas.length > 0
        ? [
            'Lo sustituido se recompone solo: el material no se guarda en ninguna parte, se ' +
              'deriva de la fijación en cada construcción.',
          ]
        : []),
      ...repetidas(escritas).flatMap(({ cita, jornadas }) => [
        `Aviso: «${cita}» queda fijada en ${jornadas.length} jornadas —${jornadas.join(', ')}—, ` +
          'así que se publicaría la misma Cita varias veces. Suelte una si no era esa la idea.',
      ]),
      `Total fijado: ${Object.keys(escritas).length}. Véalo en /lote al construir.`,
    ].join('\n'),
  };
}

/**
 * Suelta jornadas fijadas: ese día vuelve a la rotación.
 *
 * Una jornada que no estaba fijada se **rechaza** en vez de ignorarse, con la misma
 * asimetría que quitar miembros de una Colección: una errata al soltar dejaría la portada
 * intacta diciendo que la operación salió bien, y quien la escribió creería haber liberado
 * un día que sigue fijado.
 *
 * Soltar una jornada pasada sí se admite, al revés que fijarla: el fichero acumula y
 * limpiarlo no publica ni deja de publicar nada.
 */
export async function soltarJornadas(rutas: Rutas, jornadas: string[]): Promise<Resultado> {
  if (jornadas.length === 0) {
    return { ok: false, motivos: ['Indique al menos la jornada que soltar.'] };
  }

  const { ruta, declaracion } = await portadaDe(rutas);
  if (!declaracion.ok) return declaracion;

  const pedidas = [...new Set(jornadas)];
  const motivos: string[] = [];
  for (const jornada of pedidas) {
    if (!esJornada(jornada)) motivos.push(motivoDeJornadaMalFormada(jornada));
    else if (declaracion.fijaciones[jornada] === undefined) {
      motivos.push(`La jornada ${jornada} no está fijada. Véalas con «listar».`);
    }
  }
  if (motivos.length > 0) {
    motivos.push('No se ha soltado ninguna: el lote se escribe entero o no se escribe.');
    return { ok: false, motivos };
  }

  const fijaciones = ordenadas(
    Object.fromEntries(
      Object.entries(declaracion.fijaciones).filter(([jornada]) => !pedidas.includes(jornada)),
    ),
  );
  await escribirPortada(ruta, { ...declaracion.base, fijaciones });

  return {
    ok: true,
    ruta,
    mensaje: [
      `${pedidas.length} ${pedidas.length === 1 ? 'jornada suelta' : 'jornadas sueltas'}: ` +
        'esos días vuelven a la rotación.',
      ...pedidas.sort((a, b) => a.localeCompare(b)).map((j) => `  · ${j}`),
      `Total fijado: ${Object.keys(fijaciones).length}.`,
    ].join('\n'),
  };
}

/** Una jornada fijada, con lo que hace falta saber de ella para decidir si sigue valiendo. */
export interface JornadaFijada {
  jornada: Jornada;
  cita: string;
  /** Ya pasó: su Cita del Día no la vuelve a componer ninguna construcción. */
  pasada: boolean;
  /** El slug es una Cita publicada del corpus. */
  publicada: boolean;
  /**
   * Y está marcada apta para portada. Sin esto la fijación **se ignora** y ese día rota
   * otra Cita, que es lo que `citaDelDia` hace a propósito para no dejar la portada muda.
   */
  apta: boolean;
}

/**
 * Todo lo fijado, ordenado por jornada — lo que enseña «listar».
 *
 * Enseña también las pasadas. Una fijación vencida no publica nada, pero sigue escrita, y
 * quien mira la lista para saber hasta dónde llegó el lote necesita distinguir lo que queda
 * por delante de lo que ya se gastó.
 *
 * Y comprueba de nuevo lo que se comprobó al fijar, porque entretanto pudo cambiar: una
 * Cita fijada puede haberse retirado a revisión o haber perdido su marca de portada, y en
 * los dos casos la fijación quedó muda sin que nadie se enterara.
 */
export async function inventarioDeJornadas(
  rutas: Rutas,
  hoy: Jornada,
): Promise<{ ok: true; jornadas: JornadaFijada[] } | { ok: false; motivos: string[] }> {
  const { declaracion } = await portadaDe(rutas);
  if (!declaracion.ok) return declaracion;

  const publicadas = await leerCitas(rutas.citas);
  const porSlug = new Map(publicadas.map((c) => [c.slug, c]));

  return {
    ok: true,
    jornadas: Object.entries(declaracion.fijaciones)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([jornada, cita]) => ({
        jornada,
        cita,
        pasada: jornada < hoy,
        publicada: porSlug.has(cita),
        apta: porSlug.get(cita)?.aptaParaPortada === true,
      })),
  };
}
