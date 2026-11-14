/**
 * Revisión de un lote de candidatas — FR-24.
 *
 * Aquí no hay estado de sesión, y es la decisión de diseño de la historia. «Continúo
 * donde lo dejé sin repetir lo ya decidido» sale gratis porque **lo pendiente es lo que
 * queda en `corpus/_revision/`**: aprobar mueve el fichero a `corpus/citas/` y rechazar
 * lo borra, así que el directorio *es* la lista de lo que falta por decidir. Un fichero
 * de progreso aparte podría desincronizarse del corpus, y entonces la revisión repetiría
 * decisiones o se saltaría candidatas.
 *
 * Aprobar **no** es publicar: es pedir que se publique. Lo que publica es la puerta de
 * admisión de AD-1, la misma que aplica el build y la misma que aplica el alta manual.
 * Una candidata que la incumpla se queda donde está por muy aprobada que esté.
 */

import { readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { citaAdmisible, gradoDeProcedencia } from '../../src/lib/admision.ts';
import {
  entradaVedada,
  leerFormasVedadas,
  registrarFormasVedadas,
  type FormaVedada,
  type MotivoDeFormaVedada,
} from './formasVedadas.ts';
import { cargaDeCandidata, type SeñalDeOrden } from '../../src/lib/ordenDeRevision.ts';
import { esAparatoDeLaFuente, esTrozoDeCitaAjena, tienePuntuacionRota } from './extraccion.ts';
import {
  candidatosDeLosSaltos,
  documentosDeCita,
  documentosLegibles,
  motivoParaNoPublicar,
} from './cotejo.ts';
import { saltosDeLaCita } from './lineas.ts';
import { normalizar } from '../../src/lib/normalizar.ts';
import { fichaDeCita, indiceDeFichas } from '../../src/lib/obras.ts';
import {
  CLASES_DE_COINCIDENCIA,
  cifraDeParecido,
  formaParaComparar,
  indiceDeContencion,
  parecidoEntre,
  type FormaParaComparar,
} from './parecido.ts';
import { slugLibre } from '../../src/lib/slug.ts';
import {
  conLaLineaDeTexto,
  fechaLocal,
  leerAutores,
  leerCitas,
  leerDocumentosParaElCotejo,
  leerFichasDeObra,
  leerPersonajes,
  leerRegistroDeClases,
  leerTemas,
  mover,
  nombreDeFicheroDeCita,
  registrarClases,
  type Rutas,
} from './corpus.ts';
import { claseDe, claseQueCorresponde, esAtribuida, type Clase } from '../../src/lib/clase.ts';
import { anotarTrasInterrupcion, motivoClaseDistinta, slugsConOtraClase } from './clases.ts';
import {
  fallosDeAtribuidas,
  fichaPlaneada,
  motivoPuertaCerrada,
  motivosDe,
  planDaFichaAlAutor,
  textoDeVariante,
  type CitaParaAtribuidas,
  type ValoresDeLaPuerta,
} from './atribuidas.ts';
import type { FichaDeObra } from '../../src/lib/obras.ts';
import { aplicarFichaDeObra, resolverFichaDeObra } from './obras.ts';
import { motivoSinTemaPublicado, temaPublicadoConLaPasada } from './alcance.ts';
import type { TemaBajoUmbral } from '../../src/lib/publicado.ts';
import { dueñoDeCita } from '../../src/lib/obras.ts';

export interface CandidataEnRevision {
  slug: string;
  texto: string;
  /**
   * Slug del Autor. Con él, o sin él con el Personaje (Historia 35.2), su dueño compone el
   * nombre del fichero al publicar (`dueñoDeCita`).
   */
  autor?: string;
  /** La clase que dice su fichero (`claseDe`) — Historia 35.1. */
  clase: Clase;
  /** El Personaje que declara, si declara alguno — Historia 35.1. */
  personaje?: string;
  /**
   * Los Temas que ya declara, si declara alguno — Historia 26.8: aprobarla exige que, con los
   * de la orden, alguno quede publicado.
   */
  temas?: string[];
  ruta: string;
  /**
   * La obra que declara su Procedencia, si declara alguna — Historia 22.1. Aprobarla
   * asegura la Ficha de Obra de (Autor, obra) en el mismo gesto en que publica.
   */
  obra?: string;
  /** Su Fuente, si declara una: de ella salen los documentos de los que toma sus saltos (29.2). */
  fuente?: { id: string };
  /**
   * Sus atestiguaciones tal como las declara su fichero, si declara alguna — Historia 35.1b: la
   * puerta de la atribuida cuenta sus dominios con el mínimo de la puerta.
   */
  atestiguaciones?: unknown;
  /**
   * El texto de su Variante, si declara una — Historia 35.6: la puerta de la atribuida la juzga
   * con el tope y la compara como duplicado, y el aviso FR-14 la mira también.
   */
  variante?: string;
  /**
   * La Cita ya presente con la que coincide, si coincide con alguna — FR-14.
   *
   * Se señala, no se decide: el sistema no tiene criterio para saber si dos textos
   * equivalentes son la misma Cita o dos ediciones legítimas de la misma frase.
   */
  duplicaA?: { slug: string; donde: 'publicadas' | 'en revisión' };
  /**
   * Historia 29.4 — las Citas con las que casi coincide sin ser la misma forma (`parecidoEntre`):
   * la **contenida** frente a lo publicado y a lo de revisión, en los dos sentidos, y la **casi
   * igual** frente a las publicadas de su misma Obra resuelta. Publicadas primero, luego por slug.
   * Se omite si no hay ninguna. Como `duplicaA`, señala y no bloquea nada.
   */
  parecidas?: Parecida[];
  /**
   * Historia 35.7 — una de siempre a la que el cotejo no deja publicarse (no declara Fuente:
   * `motivoParaNoPublicar`): dejarla en revisión anota su forma en `corpus/formas-vedadas.yml`.
   */
  faltaCotejo?: true;
  /** Historia 35.7 — una de siempre cuya Procedencia es ausente: lo mismo, con `sin-procedencia`. */
  faltaProcedencia?: true;
  /** Si pasaría la puerta de admisión ahora mismo, y qué le falta si no. */
  admisible: boolean;
  motivos: string[];
  /**
   * Lo que pesa en contra de esta candidata, y qué señales pesaron — Historia 19.6.
   *
   * Coloca, no decide. Una candidata con toda la carga sigue en la lista y sigue
   * aprobable; sólo está más abajo.
   */
  carga: number;
  señalesDeOrden: SeñalDeOrden[];
}

/** Una coincidencia de la 29.4 que no es la misma forma. */
export interface Parecida {
  slug: string;
  donde: 'publicadas' | 'en revisión';
  clase: 'contenida' | 'casi-iguales';
  parecido: number;
  /** En la contenida: si la candidata está dentro de la otra o la otra dentro de ella. */
  sentido?: 'contenida-en' | 'contiene-a';
  /** En la casi igual: la palabra que cambia, la de la candidata y la de la otra. */
  palabra?: { a: string; b: string };
}

/**
 * Las parecidas de cada candidata (Historia 29.4), por slug de candidata.
 *
 * La contenida se mira frente a **todo** —publicadas y revisión, en los dos sentidos—, con el
 * índice de `indiceDeContencion` para no comparar cada candidata con las 290.000 restantes; la casi
 * igual, solo frente a las publicadas de la misma Obra resuelta por ficha. Una candidata sin ficha
 * no tiene publicadas en su Obra: toda publicada tiene ficha. Un par entre dos publicadas no es de
 * ninguna candidata y no se mira.
 */
function parecidasDeLasCandidatas(
  pendientes: readonly { slug: string; autor?: string; personaje?: string; texto?: string; procedencia?: { obra?: string } | null }[],
  publicadas: readonly { slug: string; autor?: string; personaje?: string; texto: string; procedencia?: { obra?: string } | null }[],
  fichas: Parameters<typeof fichaDeCita>[1],
): Map<string, Parecida[]> {
  const todas: { slug: string; donde: 'publicadas' | 'en revisión'; forma: FormaParaComparar }[] = [
    ...publicadas.map((c) => ({ slug: c.slug, donde: 'publicadas' as const, forma: formaParaComparar(c.texto) })),
    ...pendientes.map((c) => ({ slug: c.slug, donde: 'en revisión' as const, forma: formaParaComparar(c.texto ?? '') })),
  ];
  const parecidas = new Map<string, Parecida[]>();
  const anotar = (slug: string, p: Parecida) => {
    const lista = parecidas.get(slug);
    if (lista === undefined) parecidas.set(slug, [p]);
    else lista.push(p);
  };

  const contenedoras = indiceDeContencion(todas.map((t) => t.forma));
  for (const dentro of todas) {
    for (const indice of contenedoras(dentro.forma)) {
      const fuera = todas[indice];
      if (dentro.donde === 'publicadas' && fuera.donde === 'publicadas') continue;
      const coincidencia = parecidoEntre(dentro.forma, fuera.forma, 'contenida');
      if (coincidencia?.clase !== 'contenida') continue;
      const comun = { clase: 'contenida' as const, parecido: coincidencia.parecido };
      if (dentro.donde === 'en revisión') {
        anotar(dentro.slug, { slug: fuera.slug, donde: fuera.donde, ...comun, sentido: 'contenida-en' });
      }
      if (fuera.donde === 'en revisión') {
        anotar(fuera.slug, { slug: dentro.slug, donde: dentro.donde, ...comun, sentido: 'contiene-a' });
      }
    }
  }

  const porObra = new Map<string, { slug: string; forma: FormaParaComparar }[]>();
  publicadas.forEach((c, i) => {
    const ficha = fichaDeCita(c, fichas);
    if (ficha === undefined) return;
    const lista = porObra.get(ficha.nombre) ?? [];
    lista.push({ slug: c.slug, forma: todas[i].forma });
    porObra.set(ficha.nombre, lista);
  });
  pendientes.forEach((c, i) => {
    const ficha = fichaDeCita(c, fichas);
    if (ficha === undefined) return;
    const suya = todas[publicadas.length + i].forma;
    for (const otra of porObra.get(ficha.nombre) ?? []) {
      const coincidencia = parecidoEntre(suya, otra.forma);
      if (coincidencia?.clase !== 'casi-iguales') continue;
      anotar(c.slug, {
        slug: otra.slug,
        donde: 'publicadas',
        clase: 'casi-iguales',
        parecido: coincidencia.parecido,
        ...(coincidencia.palabra !== undefined ? { palabra: coincidencia.palabra } : {}),
      });
    }
  });

  for (const lista of parecidas.values()) {
    lista.sort(
      (x, y) =>
        Number(x.donde !== 'publicadas') - Number(y.donde !== 'publicadas') ||
        x.slug.localeCompare(y.slug, 'es') ||
        CLASES_DE_COINCIDENCIA.indexOf(x.clase) - CLASES_DE_COINCIDENCIA.indexOf(y.clase),
    );
  }
  return parecidas;
}

/**
 * Todo lo que está pendiente de decisión, en el orden en que se revisa.
 *
 * El recorrido es por slug y la salida **no** — Historia 19.6. Se separan a propósito: el
 * aviso de duplicado señala a la primera de dos candidatas equivalentes, y si el recorrido
 * dependiese de la carga, cambiar un peso cambiaría cuál de las dos queda señalada. El
 * orden en que se lee es una preferencia; cuál duplica a cuál, un hecho.
 */
export async function loteEnRevision(rutas: Rutas): Promise<CandidataEnRevision[]> {
  const pendientes = await leerCitas(rutas.revision);
  const publicadas = await leerCitas(rutas.citas);
  const fichas = indiceDeFichas(await leerFichasDeObra(rutas));
  const parecidas = parecidasDeLasCandidatas(pendientes, publicadas, fichas);

  // El índice de comparación usa la forma canónica de AD-3, la misma que la búsqueda:
  // si duplicados y búsqueda usaran criterios distintos, el corpus podría acabar con dos
  // Citas que la búsqueda presenta como una sola.
  const yaPublicadas = new Map<string, string>();
  // Historia 35.6 — también la Variante de cada publicada, con su slug: repetirla es repetir la
  // Cita. El texto se indexa después y gana si los dos coinciden con otra.
  for (const c of publicadas) {
    const v = textoDeVariante(c);
    const k = v !== undefined ? normalizar(v) : '';
    if (k !== '') yaPublicadas.set(k, c.slug);
  }
  for (const c of publicadas) yaPublicadas.set(normalizar(c.texto), c.slug);

  const vistasEnRevision = new Map<string, string>();
  const lote: CandidataEnRevision[] = [];

  const porSlug = (a: { slug: string }, b: { slug: string }) => a.slug.localeCompare(b.slug, 'es');

  for (const candidata of [...pendientes].sort(porSlug)) {
    const canonico = normalizar(candidata.texto ?? '');
    const comprobacion = citaAdmisible.safeParse(candidata);

    /*
     * Historia 11.2 — aprobar tampoco fabrica builds rotos.
     *
     * La misma regla que aplica el build, importada de `tools/lib/cotejo.ts`: una
     * candidata sin Fuente publicada aquí mataba la construcción siguiente. Se suma a los
     * motivos de admisión porque para quien revisa es lo mismo —algo que le falta para
     * poder publicarse— y así se lee en la misma lista.
     */
    const sinDocumento = motivoParaNoPublicar({
      slug: candidata.slug,
      texto: candidata.texto ?? '',
      ...(candidata.fuente !== undefined ? { fuente: candidata.fuente } : {}),
      // Historia 35.1b — a la atribuida no se le exige Fuente: no se coteja.
      ...(esAtribuida(candidata) ? { clase: claseDe(candidata) } : {}),
    });

    /*
     * La puerta de aparato de la Fuente, otra vez y aquí.
     *
     * Las trece formas se aplicaban **solo al extraer**, y se fueron añadiendo a lo largo de
     * treinta sesiones. Pero `corpus/_revision/` guarda más de siete mil candidatas extraídas
     * antes de que existiera la mayoría de ellas, y una candidata vieja no vuelve a pasar por
     * la puerta: se aprueba y se publica.
     *
     * La 128.ª tuvo delante, en una siembra normal, una ficha bibliográfica con su precio en
     * pesetas que la 123.ª ya había cerrado. La cazó la lectura, y ese es el problema: el bucle
     * está construido sobre que **leer falla y la puerta es el respaldo**. Un respaldo que solo
     * cubre lo que entra a partir de hoy no cubre lo que ya está dentro.
     */
    const aparato = esAparatoDeLaFuente(candidata.texto ?? '');

    /*
     * Y lo mismo con la comilla sin pareja, por el mismo motivo y con una cifra que lo hace
     * urgente: cuando esta puerta se escribió había **351 candidatas versionadas** con las
     * comillas descompensadas, todas extraídas antes de que existiera. Ninguna se publica
     * ya sin que la orden lo diga.
     */
    const citaAjena = esTrozoDeCitaAjena(candidata.texto ?? '');

    /*
     * Y la puntuación rota, por lo mismo: cuando esta puerta se escribió había **quince
     * candidatas versionadas** que la llevan, todas extraídas antes de que existiera. La 152.ª
     * ya apartó una a mano —«para él , sino»— y estuvo a punto de publicarla.
     */
    const puntuacion = tienePuntuacionRota(candidata.texto ?? '');

    // Historia 35.6 — la candidata se mira también por su Variante, si la declara.
    const varianteDeLaCandidata = textoDeVariante(candidata);
    const canonicoDeLaVariante = varianteDeLaCandidata !== undefined ? normalizar(varianteDeLaCandidata) : '';
    const enYa = (indice: Map<string, string>) =>
      indice.get(canonico) ?? (canonicoDeLaVariante !== '' ? indice.get(canonicoDeLaVariante) : undefined);
    const duplicadaPublicada = enYa(yaPublicadas);
    const duplicadaEnRevision = enYa(vistasEnRevision);

    lote.push({
      slug: candidata.slug,
      texto: candidata.texto,
      ...(candidata.autor !== undefined ? { autor: candidata.autor } : {}),
      clase: claseDe(candidata),
      ...(typeof candidata.personaje === 'string' ? { personaje: candidata.personaje } : {}),
      ...(Array.isArray(candidata.temas) && candidata.temas.length > 0 ? { temas: candidata.temas } : {}),
      ruta: candidata.ruta,
      ...(typeof candidata.procedencia?.obra === 'string' ? { obra: candidata.procedencia.obra } : {}),
      ...(typeof candidata.fuente?.id === 'string' ? { fuente: { id: candidata.fuente.id } } : {}),
      ...(candidata.atestiguaciones !== undefined ? { atestiguaciones: candidata.atestiguaciones } : {}),
      ...(varianteDeLaCandidata !== undefined ? { variante: varianteDeLaCandidata } : {}),
      // La publicada gana: lo que el editor necesita saber es que ya está publicada.
      ...(duplicadaPublicada !== undefined
        ? { duplicaA: { slug: duplicadaPublicada, donde: 'publicadas' as const } }
        : duplicadaEnRevision !== undefined
          ? { duplicaA: { slug: duplicadaEnRevision, donde: 'en revisión' as const } }
          : {}),
      ...(parecidas.has(candidata.slug) ? { parecidas: parecidas.get(candidata.slug)! } : {}),
      ...cargaYSeñales(candidata.texto ?? ''),
      // Historia 35.7 — solo de la clase de siempre: la atribuida no se coteja ni se veda.
      ...(!esAtribuida(candidata) && sinDocumento !== undefined ? { faltaCotejo: true as const } : {}),
      ...(!esAtribuida(candidata) && gradoDeProcedencia(candidata.procedencia ?? undefined) === 'ausente'
        ? { faltaProcedencia: true as const }
        : {}),
      admisible:
        comprobacion.success &&
        sinDocumento === undefined &&
        !aparato &&
        !citaAjena &&
        !puntuacion,
      motivos: [
        ...(comprobacion.success ? [] : comprobacion.error.issues.map((i) => i.message)),
        ...(sinDocumento !== undefined ? [sinDocumento] : []),
        // Se nombra el aparato para que no se confunda con «le falta un campo»: son dos
        // arreglos distintos —uno se completa, el otro se descarta—.
        ...(aparato ? ['es aparato de la Fuente, no texto del Autor'] : []),
        // Y esto se nombra aparte del aparato porque la diferencia importa: aquello es de la
        // Fuente, esto es de un tercero a quien el Autor cita. Los dos se descartan, pero
        // quien lee el motivo tiene que saber cuál de los dos peligros acaba de esquivar.
        ...(citaAjena ? ['lleva una comilla sin pareja: es trozo de una cita ajena'] : []),
        // Y éste se nombra aparte de los dos anteriores porque el arreglo es otro: aquello no
        // lo escribió el Autor y se descarta; esto sí lo escribió, y lo que está roto es la
        // edición de la que salió. Quien lo lea sabrá si buscar otra edición o dejarlo estar.
        ...(puntuacion ? ['la edición trae la puntuación rota: punto intruso o espacio antes del signo'] : []),
      ],
    });

    if (canonico !== '') vistasEnRevision.set(canonico, candidata.slug);
    if (canonicoDeLaVariante !== '' && !vistasEnRevision.has(canonicoDeLaVariante)) {
      vistasEnRevision.set(canonicoDeLaVariante, candidata.slug);
    }
  }

  /*
   * Y aquí se coloca — Historia 19.6.
   *
   * Tres criterios, en este orden. Lo inadmisible al fondo porque aprobarlo no publica
   * nada: la puerta de AD-1 lo devolvería igual, así que leerlo primero es tiempo tirado.
   * Después la carga, que es la medida. Y el slug al final para que dos ejecuciones
   * seguidas den la misma lista: sin desempate estable, revisar «las trescientas primeras»
   * dos días seguidos no significaría lo mismo.
   */
  return lote.sort(
    (a, b) => Number(b.admisible) - Number(a.admisible) || a.carga - b.carga || porSlug(a, b),
  );
}

/** La carga de la 19.6, con el nombre que lleva dentro de la candidata. */
function cargaYSeñales(texto: string): { carga: number; señalesDeOrden: SeñalDeOrden[] } {
  const { carga, señales } = cargaDeCandidata(texto);
  return { carga, señalesDeOrden: señales };
}

export interface ResultadoDeDecision {
  publicadas: string[];
  /** Temas que no existen en el corpus: nada se publica si aparece alguno. */
  temasDesconocidos?: string[];
  /**
   * Candidatas cuyo slug estaba ocupado y se publicaron con otro — nunca pisando.
   *
   * El sufijo se lo lleva la nueva y no la que ya estaba publicada: cambiarle el slug a
   * la publicada rompería sus enlaces entrantes. Es la convención que fijó la Historia
   * 1.5 para el alta por lote, y esta puerta no la heredaba.
   */
  renombradas: { de: string; a: string }[];
  /** Aprobadas que la puerta de admisión no deja pasar, con lo que les falta. */
  rechazadasPorAdmision: { slug: string; motivos: string[] }[];
  /**
   * Aprobadas que cumplen la admisión pero cuya Ficha de Obra no se puede asegurar sin
   * decidir —una colisión de nombre, una restauración en conflicto—. Siguen en revisión:
   * publicadas sin ficha romperían la construcción siguiente (Historia 22.1).
   */
  rechazadasPorFicha: { slug: string; motivos: string[] }[];
  /**
   * Aprobadas que cumplen la admisión pero no tendrían **ningún Tema publicado** —contando las
   * publicadas y las que esta misma pasada publica— — Historia 26.8, NFR-5. Siguen en revisión,
   * intactas: sin Tema, una Cita queda fuera de alcance en cuanto deja la página 1 de su Autor.
   * `temas` son los que declara (los suyos y los de la orden), con su recuento.
   */
  rechazadasPorTema: { slug: string; temas: TemaBajoUmbral[]; motivos: string[] }[];
  /**
   * Publicadas cuya ficha, resuelta antes de publicar, no se pudo escribir después —un
   * fallo de disco entre medias—. La Cita está publicada; `npm run obra -- sembrar` la
   * completa.
   */
  fichasSinAsegurar: { slug: string; motivos: string[] }[];
  /**
   * Publicadas que, tras escribir la pasada, se quedaron sin ningún Tema publicado porque otra de
   * la que dependía no llegó a publicarse —su Ficha de Obra chocó al escribir con otra nueva de la
   * misma pasada—. Ya están en `corpus/citas/`: o se les da un Tema con página, o se retiran,
   * antes de construir. Vacío casi siempre — Historia 26.8.
   */
  publicadasSinTema: { slug: string; temas: TemaBajoUmbral[]; motivos: string[] }[];
  /**
   * Si las publicadas no se pudieron anotar en `corpus/clases-de-cita.yml` después de moverlas
   * —un fallo de disco—: el motivo. Ya están publicadas; `npx tsx tools/clases.ts sembrar` las
   * anota, y la orden sale con 1 — Historia 35.1.
   */
  registroSinAnotar?: string;
  rechazadas: string[];
  /**
   * Publicadas que llegaban sin los saltos de verso de su documento —una candidata extraída antes de
   * la 29.1, o de un documento en prosa de una obra que también tiene uno de verso— y se publicaron
   * con ellos, con el documento del que salen — Historia 29.2. Sin esto, la regla 4 del cotejo
   * rompería el build siguiente.
   */
  conSaltos: { slug: string; documento: string }[];
  /**
   * Historia 29.4 — lo que se señalaba de cada publicada al aprobarla: su repetida (`duplicaA`) y
   * sus parecidas. Publicarla no lo cambia: es aviso para quien aprueba, que lo lee en el parte.
   */
  avisos: { slug: string; duplicaA?: CandidataEnRevision['duplicaA']; parecidas: Parecida[] }[];
  noEncontradas: string[];
  /**
   * Historia 35.7 — las formas que la orden anotó en `corpus/formas-vedadas.yml`: las de siempre
   * que rechaza, o que la aprobación deja en revisión por el cotejo o por la Procedencia.
   */
  vedadas: FormaVedada[];
  /**
   * Si la aprobación no pudo anotarlas —un fallo de disco—: el motivo. Lo aprobado sigue
   * aprobado, y la orden sale con 1.
   */
  vedadasSinAnotar?: string;
}

/**
 * El motivo con que se veda la forma de una candidata de siempre — Historia 35.7: sin Procedencia,
 * `sin-procedencia`; en lo demás, `cotejo-fallido`.
 */
export function motivoDeLaCandidata(candidata: Pick<CandidataEnRevision, 'faltaProcedencia'>): MotivoDeFormaVedada {
  return candidata.faltaProcedencia === true ? 'sin-procedencia' : 'cotejo-fallido';
}

/**
 * Aprueba las candidatas indicadas.
 *
 * Cada una vuelve a pasar por la puerta de admisión **en el momento de aprobar** y no en
 * el de listar: entre una cosa y otra el fichero ha podido editarse a mano, y aprobar por
 * un resultado de hace diez minutos publicaría algo que ya no cumple.
 */
export async function aprobar(
  rutas: Rutas,
  slugs: string[],
  temas: string[] = [],
  /**
   * Historia 35.1b — los valores de la puerta de la atribuida. Por omisión, los del árbol; las
   * pruebas la abren por aquí sin parchear nada.
   */
  opciones: { puerta?: ValoresDeLaPuerta } = {},
): Promise<ResultadoDeDecision> {
  const lote = await loteEnRevision(rutas);
  let leidos:
    | Promise<{
        documentos: Awaited<ReturnType<typeof leerDocumentosParaElCotejo>>['documentos'];
        candidatos: ReturnType<typeof candidatosDeLosSaltos>['candidatos'];
      }>
    | undefined;
  const resultado: ResultadoDeDecision = {
    publicadas: [],
    renombradas: [],
    rechazadasPorAdmision: [],
    rechazadasPorFicha: [],
    rechazadasPorTema: [],
    fichasSinAsegurar: [],
    publicadasSinTema: [],
    rechazadas: [],
    noEncontradas: [],
    conSaltos: [],
    avisos: [],
    vedadas: [],
  };

  /*
   * Los Temas se comprueban **antes de publicar nada**, y el lote entero se detiene si
   * alguno no existe. Es la regla de oro de `tools/lib/`: o todo o nada. Publicar la mitad
   * del lote y luego negarse dejaría al revisor sin saber cuáles entraron.
   *
   * Y se comprueban aquí y no solo en el esquema porque el esquema no los ve: `temas` es
   * una lista de cadenas, y quien decide si «la-libertadd» existe es el corpus. El build
   * lo caza después con `reference()`, pero para entonces la Cita ya está publicada y lo
   * que se rompe es la construcción del sitio.
   */
  const temasDelCorpus = await leerTemas(rutas);
  if (temas.length > 0) {
    const conocidos = new Set(temasDelCorpus.map((t) => t.slug));
    const desconocidos = [...new Set(temas)].filter((t) => !conocidos.has(t));
    if (desconocidos.length > 0) return { ...resultado, temasDesconocidos: desconocidos };
  }

  /*
   * Historia 35.1 — el registro de clases se lee antes de escribir nada (ilegible, nada se
   * aprueba), y la clase de cada candidata se deriva de su Autor: no se teclea.
   */
  const registro = await leerRegistroDeClases(rutas);
  // Historia 35.7 — las formas vedadas, antes de escribir nada: ilegibles, nada se aprueba.
  const vedadas = await leerFormasVedadas(rutas);
  // Las de siempre que esta pasada deja en revisión por el cotejo o por la Procedencia.
  const porVedar: FormaVedada[] = [];
  const hoyDeLaPasada = fechaLocal(new Date());
  const autorPorSlug = new Map((await leerAutores(rutas)).map((a) => [a.slug, a]));
  // Historia 35.2 — el Personaje de una candidata existe en corpus/personajes/, o el build rompería.
  const personajesDelCorpus = new Set((await leerPersonajes(rutas)).map((p) => p.slug));
  const claseQueLeToca = (candidata: CandidataEnRevision): Clase => {
    // La de un Personaje sin Autor: la clase la dice el Personaje (Historia 35.2).
    if (candidata.autor === undefined) {
      return candidata.personaje !== undefined ? claseQueCorresponde({ personaje: candidata.personaje }, {}) : candidata.clase;
    }
    const autor = autorPorSlug.get(candidata.autor);
    if (autor === undefined) return candidata.clase;
    return claseQueCorresponde(candidata.personaje !== undefined ? { personaje: candidata.personaje } : {}, autor);
  };

  // Los slugs que no se pueden pisar: los publicados, más los que esta misma ejecución
  // vaya publicando. Sin lo segundo, dos candidatas que colisionan entre sí se pisarían.
  const yaPublicadas = await leerCitas(rutas.citas);
  const ocupados = new Set(yaPublicadas.map((c) => c.slug));
  // Historia 35.1b — las fichas del disco (se leen una vez: las de la pasada se escriben después de
  // planear) y las que la pasada crea, con los Autores a los que da una.
  let fichasEnDisco: FichaDeObra[] | undefined;
  const fichasPlaneadas: FichaDeObra[] = [];
  const autoresConFichaPlaneada: string[] = [];
  // Historia 35.1b — lo publicado, como lo juzga la puerta de la atribuida; se compone una vez.
  let paraAtribuidas: CitaParaAtribuidas[] | undefined;
  const publicadasParaAtribuidas = (): CitaParaAtribuidas[] =>
    (paraAtribuidas ??= yaPublicadas.map((c) => ({
      slug: c.slug,
      texto: c.texto,
      ...(textoDeVariante(c) !== undefined ? { variante: textoDeVariante(c) } : {}),
      ...(c.autor !== undefined ? { autor: c.autor } : {}),
      ...(c.personaje !== undefined ? { personaje: c.personaje } : {}),
      ...(esAtribuida(c) ? { clase: claseDe(c) } : {}),
      ...(c.procedencia !== undefined && c.procedencia !== null ? { procedencia: c.procedencia } : {}),
    })));
  // El conjunto publicado tal como va quedando, para la grafía por omisión de una ficha nueva.
  const publicadasParaObra: { autor?: string; personaje?: string; procedencia?: { obra?: string } }[] = [
    ...yaPublicadas,
  ];

  /*
   * Historia 26.8 — primero se **planifica** la pasada entera, sin escribir nada: qué se
   * encuentra, qué admite la puerta, qué Ficha de Obra se puede asegurar contra el disco de hoy y,
   * de lo que queda, qué tendría algún Tema publicado contando lo ya publicado **y** lo que esta
   * pasada publicaría (`temaPublicadoConLaPasada`). Solo entonces se escribe, en el orden pedido.
   * La que no tendría Tema sigue en revisión, intacta, con sus Temas y sus recuentos en el parte.
   *
   * Un slug repetido en la orden es una sola candidata: contarla dos veces le daría al Tema una
   * Cita que no se publica.
   */
  const planeadas: {
    indice: number;
    slug: string;
    candidata: CandidataEnRevision;
    temas: string[];
    comoPublicada: { autor?: string; personaje?: string; procedencia?: { obra?: string } };
    /** El `texto` con sus saltos de verso, si llega sin ellos (Historia 29.2). */
    conSaltos?: { texto: string; documento: string };
  }[] = [];
  const planeadasParaObra = [...publicadasParaObra];
  for (const [indice, slug] of [...new Set(slugs)].entries()) {
    const candidata = lote.find((c) => c.slug === slug);
    if (candidata === undefined) {
      resultado.noEncontradas.push(slug);
      continue;
    }
    if (!candidata.admisible) {
      resultado.rechazadasPorAdmision.push({ slug, motivos: candidata.motivos });
      /*
       * Historia 35.7 — la de siempre que el cotejo o la Procedencia dejan en revisión no vuelve
       * como atribuida: su forma se anota en `corpus/formas-vedadas.yml` (AD-32).
       */
      if (candidata.faltaCotejo === true || candidata.faltaProcedencia === true) {
        const entrada = entradaVedada(candidata.texto ?? '', motivoDeLaCandidata(candidata), hoyDeLaPasada, slug);
        if (entrada !== undefined) porVedar.push(entrada);
      }
      continue;
    }
    if (candidata.personaje !== undefined && !personajesDelCorpus.has(candidata.personaje)) {
      resultado.rechazadasPorAdmision.push({
        slug,
        motivos: [
          `su Personaje «${candidata.personaje}» no existe en corpus/personajes/: publicada, rompería ` +
            'la construcción. Dele de alta con «npx tsx tools/personaje.ts crear» o corrija la candidata.',
        ],
      });
      continue;
    }
    /*
     * Historia 35.1 — una candidata cuya clase escrita no es la que le corresponde no se aprueba,
     * y la atribuida tampoco: su puerta llega con la 35.1b. Las dos siguen en revisión, intactas.
     */
    const corresponde = claseQueLeToca(candidata);
    if (corresponde !== candidata.clase) {
      resultado.rechazadasPorAdmision.push({ slug, motivos: [motivoClaseDistinta(candidata.clase, corresponde)] });
      continue;
    }
    // Historia 35.1b — con la puerta cerrada, la atribuida sigue en revisión, intacta, y se dice por qué.
    const cerrada = esAtribuida(candidata) ? motivoPuertaCerrada(opciones.puerta) : undefined;
    if (cerrada !== undefined) {
      resultado.rechazadasPorAdmision.push({ slug, motivos: [cerrada] });
      continue;
    }
    /*
     * Historia 29.2 — los saltos de verso, con la misma decisión que la regla 4 del cotejo
     * (`saltosDeLaCita` sobre `candidatosDeLosSaltos`). Una candidata extraída antes de la 29.1 —el
     * `_revision/` de la principal no se versiona y no lo restituye nadie— llega en una línea, y
     * publicarla así rompería el build siguiente. Se publica con sus saltos; un conflicto entre dos
     * documentos de verso se publica como está, igual que la regla 4 solo avisa.
     */
    // Historia 35.1b — la atribuida va en una línea: no se le restituyen saltos.
    const saltos = esAtribuida(candidata) ? undefined : await saltosQueLeFaltan(candidata);
    if (saltos !== undefined && !saltos.ok) {
      resultado.rechazadasPorAdmision.push({ slug, motivos: [saltos.motivo] });
      continue;
    }
    const conSaltos = saltos?.ok ? { texto: saltos.texto, documento: saltos.documento } : undefined;
    const obra = candidata.obra;
    const comoPublicada = {
      ...(candidata.autor !== undefined ? { autor: candidata.autor } : {}),
      ...(candidata.personaje !== undefined ? { personaje: candidata.personaje } : {}),
      ...(obra !== undefined ? { procedencia: { obra } } : {}),
    };
    /*
     * La Ficha se resuelve ya aquí, en solo lectura: la que choca con una ficha del disco no
     * cuenta para los Temas de las demás, y así ninguna se publica apoyada en una que no saldrá.
     * Al escribir se vuelve a resolver, porque el disco cambia con cada ficha escrita.
     */
    let plan: Awaited<ReturnType<typeof resolverFichaDeObra>> | undefined;
    if (obra !== undefined) {
      plan = await resolverFichaDeObra(rutas, {
        ...dueñosDe(candidata),
        obra,
        citasPublicadas: [...planeadasParaObra, comoPublicada],
      });
      if (!plan.ok) {
        resultado.rechazadasPorFicha.push({ slug, motivos: plan.motivos });
        continue;
      }
    }
    /*
     * Historia 35.1b — con la puerta abierta, la atribuida se juzga con lo publicado más lo que esta
     * pasada publica: topes, figura sin Obra (la ficha que se resuelve aquí cuenta) y duplicados
     * entre clases contra lo publicado y las demás candidatas de corpus/_revision/.
     */
    if (esAtribuida(candidata)) {
      const propia = candidataParaAtribuidas(candidata);
      const fallos = fallosDeAtribuidas({
        citas: [...publicadasParaAtribuidas(), ...planeadas.map((p) => candidataParaAtribuidas(p.candidata)), propia],
        autores: [...autorPorSlug.values()],
        // Las fichas del disco más las que esta pasada crea: las fichas se escriben después de
        // planear, y sin las planeadas dos atribuidas de una Obra nueva no contarían juntas.
        fichas: [
          ...(fichasEnDisco ??= await leerFichasDeObra(rutas)),
          ...fichasPlaneadas,
          ...[fichaPlaneada(plan, candidata.autor)].filter((f) => f !== undefined),
        ],
        autoresConFichaNueva: [
          ...autoresConFichaPlaneada,
          ...(planDaFichaAlAutor(plan) && candidata.autor !== undefined ? [candidata.autor] : []),
        ],
        comparables: lote.filter((c) => c !== candidata).map(candidataParaAtribuidas),
        juzgar: new Set([propia.slug]),
        vedadas,
        ...(opciones.puerta !== undefined ? { valores: opciones.puerta } : {}),
      });
      const suyos = motivosDe(fallos, propia.slug);
      if (suyos.length > 0) {
        resultado.rechazadasPorAdmision.push({ slug, motivos: suyos });
        continue;
      }
    }
    planeadasParaObra.push(comoPublicada);
    const fichaNueva = fichaPlaneada(plan, candidata.autor);
    if (fichaNueva !== undefined) fichasPlaneadas.push(fichaNueva);
    if (planDaFichaAlAutor(plan) && candidata.autor !== undefined) autoresConFichaPlaneada.push(candidata.autor);
    planeadas.push({
      indice,
      slug,
      candidata,
      temas: [...new Set([...(candidata.temas ?? []), ...temas])],
      comoPublicada,
      ...(conSaltos !== undefined ? { conSaltos } : {}),
    });
  }

  // Historia 29.4 — con qué slug salió cada candidata publicada en esta pasada, para los avisos.
  const publicadaComo = new Map<string, string>();
  // Lo que esta pasada ya publicó: cuenta para los Temas de las que quedan.
  const escritas: { slug: string; temas: string[]; clase: Clase }[] = [];
  let pendientes = planeadas;
  /*
   * La regla de Tema sobre lo que queda por escribir. Se repite si una Ficha de Obra falla al
   * escribir —solo una colisión entre dos fichas nuevas de la misma pasada, que la planificación
   * no ve—, porque esa ya no cuenta para los Temas de las demás.
   */
  const replanificar = () => {
    const { admitidas, rechazadas } = temaPublicadoConLaPasada(
      [...yaPublicadas, ...escritas],
      pendientes.map((p) => ({ clave: p.indice, temas: p.temas })),
      temasDelCorpus,
    );
    for (const rechazada of rechazadas) {
      const planeada = pendientes.find((p) => p.indice === rechazada.clave)!;
      resultado.rechazadasPorTema.push({
        slug: planeada.slug,
        temas: rechazada.temas,
        motivos: [motivoSinTemaPublicado(rechazada.temas)],
      });
    }
    pendientes = pendientes.filter((p) => admitidas.has(p.indice));
  };
  replanificar();

  /*
   * Historia 35.1 — un fallo a media pasada (al mover, reescribir o escribir la ficha) no deja sin
   * anotar lo ya publicado: se anota, y el error que sube lo cuenta (`PublicacionInterrumpida`).
   */
  const hoy = fechaLocal(new Date());
  try {
    while (pendientes.length > 0) {
      const { slug, candidata, temas: suyos, comoPublicada, conSaltos } = pendientes.shift()!;

      /*
       * Historia 22.1 — la Ficha de Obra, en el mismo gesto en que se publica (AD-25).
       *
       * Primero se **resuelve**, en solo lectura: si no se puede asegurar sin decidir —una
       * colisión de nombre—, la Cita no se publica. La ficha se escribe justo **después** de
       * mover la Cita, así que ningún fallo deja una ficha sin Citas.
       */
      const obra = candidata.obra;
      const plan =
        obra === undefined
          ? undefined
          : await resolverFichaDeObra(rutas, {
              ...dueñosDe(candidata),
              obra,
              citasPublicadas: [...publicadasParaObra, comoPublicada],
            });
      if (plan !== undefined && !plan.ok) {
        resultado.rechazadasPorFicha.push({ slug, motivos: plan.motivos });
        replanificar();
        continue;
      }

      // Un slug registrado con la otra clase cuenta como ocupado: una Cita no cambia de clase.
      const definitivo = slugLibre(candidata.slug, [...ocupados, ...slugsConOtraClase(registro, candidata.clase)]);
      ocupados.add(definitivo);

      if (definitivo === candidata.slug && temas.length === 0 && conSaltos === undefined) {
        await mover(candidata.ruta, rutas.citas);
      } else {
        await reescribirConSlug(candidata, definitivo, rutas, temas, conSaltos?.texto);
        if (definitivo !== candidata.slug) {
          resultado.renombradas.push({ de: candidata.slug, a: definitivo });
        }
      }
      publicadasParaObra.push(comoPublicada);
      escritas.push({ slug: definitivo, temas: suyos, clase: candidata.clase });

      if (plan !== undefined) {
        const ficha = await aplicarFichaDeObra(rutas, plan);
        if (!ficha.ok) resultado.fichasSinAsegurar.push({ slug, motivos: ficha.motivos });
      }

      resultado.publicadas.push(slug);
      publicadaComo.set(candidata.slug, definitivo);
      if (candidata.duplicaA !== undefined || (candidata.parecidas ?? []).length > 0) {
        resultado.avisos.push({
          slug: definitivo,
          ...(candidata.duplicaA !== undefined ? { duplicaA: candidata.duplicaA } : {}),
          parecidas: candidata.parecidas ?? [],
        });
      }
      if (conSaltos !== undefined) resultado.conSaltos.push({ slug: definitivo, documento: conSaltos.documento });
    }
  } catch (fallo) {
    throw await anotarTrasInterrupcion(
      rutas,
      escritas.map((e) => ({ slug: e.slug, clase: e.clase, fecha: hoy })),
      fallo,
    );
  }

  /*
   * Historia 35.1 — lo publicado se anota en el registro de clases, en un solo añadido al final.
   * Si falla, las Citas ya están publicadas: el parte da la orden que las anota y sale con 1.
   */
  try {
    await registrarClases(
      rutas,
      escritas.map((e) => ({ slug: e.slug, clase: e.clase, fecha: hoy })),
    );
  } catch (fallo) {
    resultado.registroSinAnotar = fallo instanceof Error ? fallo.message : String(fallo);
  }

  // Historia 35.7 — las formas que esta pasada deja vedadas, en un solo añadido (sin repetir).
  try {
    resultado.vedadas = await registrarFormasVedadas(rutas, porVedar);
  } catch (fallo) {
    resultado.vedadasSinAnotar = fallo instanceof Error ? fallo.message : String(fallo);
  }

  /*
   * Historia 29.4 — los avisos se calcularon al listar, antes de publicar: una otra Cita que esta
   * misma pasada publicó ya no está «en revisión», y su slug es el definitivo.
   */
  const aDondeVa = <T extends { slug: string; donde: 'publicadas' | 'en revisión' }>(x: T): T => {
    const definitivo = x.donde === 'en revisión' ? publicadaComo.get(x.slug) : undefined;
    return definitivo === undefined ? x : { ...x, slug: definitivo, donde: 'publicadas' };
  };
  resultado.avisos = resultado.avisos.map((aviso) => ({
    ...aviso,
    ...(aviso.duplicaA !== undefined ? { duplicaA: aDondeVa(aviso.duplicaA) } : {}),
    parecidas: aviso.parecidas.map(aDondeVa),
  }));

  /*
   * Lo escrito no se deshace. Si una Ficha que falló al escribir era la que le daba el Tema a una
   * ya publicada, esa Cita queda sin Tema publicado: se dice aquí, y la orden sale con 1, en vez de
   * que lo descubra el próximo build.
   */
  for (const { clave: suelta, temas: suyos } of temaPublicadoConLaPasada(
    yaPublicadas,
    escritas.map((e) => ({ clave: e.slug, temas: e.temas })),
    temasDelCorpus,
  ).rechazadas) {
    resultado.publicadasSinTema.push({ slug: suelta, temas: suyos, motivos: [motivoSinTemaPublicado(suyos)] });
  }

  return resultado;

  /**
   * Los saltos de verso que le faltan a una candidata: `undefined` si no le falta ninguno —sin
   * documento, en prosa, sin saltos en su tramo, en conflicto o ya con ellos—; `ok: false` si le
   * faltan y su fichero no tiene la línea `texto:` que se sabe reescribir. Los documentos se leen
   * una vez por pasada, como los lee el build.
   */
  async function saltosQueLeFaltan(
    candidata: CandidataEnRevision,
  ): Promise<{ ok: true; texto: string; documento: string } | { ok: false; motivo: string } | undefined> {
    if (candidata.fuente === undefined) return undefined;
    leidos ??= leerDocumentosParaElCotejo(rutas).then(({ documentos, lineasDeclaradas }) => ({
      documentos,
      candidatos: candidatosDeLosSaltos(documentos, lineasDeclaradas).candidatos,
    }));
    const { documentos, candidatos } = await leidos;
    const legibles = documentosLegibles(documentosDeCita(candidata.fuente, candidata.obra, documentos), documentos);
    const decision = saltosDeLaCita(candidata.texto, candidatos(legibles));
    if (decision.tipo !== 'saltos' || decision.texto === candidata.texto) return undefined;
    if (conLaLineaDeTexto(await readFile(candidata.ruta, 'utf8'), candidata.texto, decision.texto) === undefined) {
      return {
        ok: false,
        motivo:
          `le faltan los saltos de verso de corpus/fuentes/${decision.documento}.txt y su línea «texto:» no ` +
          'es la que se sabe reescribir: publicada así rompería el build (regla 4 del cotejo). Corra ' +
          `«npm run documentar -- --restituir-saltos ${candidata.slug}» y apruébela después.`,
      };
    }
    return { ok: true, texto: decision.texto, documento: decision.documento };
  }
}

/** Lo que la puerta de la atribuida necesita de una candidata ya leída (Historia 35.1b). */
function candidataParaAtribuidas(c: CandidataEnRevision): CitaParaAtribuidas {
  return {
    slug: c.slug,
    texto: typeof c.texto === 'string' ? c.texto : '',
    ...(c.autor !== undefined ? { autor: c.autor } : {}),
    ...(c.personaje !== undefined ? { personaje: c.personaje } : {}),
    ...(esAtribuida(c) ? { clase: claseDe(c) } : {}),
    ...(c.obra !== undefined ? { procedencia: { obra: c.obra } } : {}),
    ...(c.atestiguaciones !== undefined ? { atestiguaciones: c.atestiguaciones } : {}),
    ...(c.variante !== undefined ? { variante: c.variante } : {}),
  };
}

/**
 * Publica la candidata con otro slug, dejando fichero y frontmatter de acuerdo.
 *
 * Se reescribe el fichero en vez de renombrarlo a secas porque el slug vive en los dos
 * sitios: en el nombre y dentro. Divergir haría que la URL y el contenido dejaran de
 * corresponderse sin que nada fallara.
 */
async function reescribirConSlug(
  candidata: CandidataEnRevision,
  definitivo: string,
  rutas: Rutas,
  temas: string[] = [],
  conSaltos?: string,
): Promise<void> {
  const leido = await readFile(candidata.ruta, 'utf8');
  // Historia 29.2 — solo cambia la línea `texto:`, como en la restitución.
  const bruto = conSaltos === undefined ? leido : conLaLineaDeTexto(leido, candidata.texto, conSaltos);
  if (bruto === undefined) {
    throw new Error(`${candidata.ruta} cambió mientras se aprobaba: su línea «texto:» ya no es la que se decidió.`);
  }
  const conNuevoSlug = bruto.replace(
    /^slug:.*$/m,
    `slug: ${JSON.stringify(definitivo)}`,
  );
  const conTemas = conTemasDeclarados(conNuevoSlug, temas);

  /*
   * Historia 35.2 — el prefijo del fichero es el de su dueño **al darla de alta**, que es el del
   * slug: saber después el Autor de la Cita de un Personaje no cambia ni el slug ni el nombre.
   * Se toma del fichero de la candidata mientras el slug definitivo lo conserve; si no, el dueño.
   */
  const partes = basename(candidata.ruta, '.md').split('--');
  const delFichero = partes.length > 1 ? partes[0] : undefined;
  const prefijo =
    delFichero !== undefined && definitivo.startsWith(`${delFichero}-`) ? delFichero : dueñoDeCita(candidata).slug;
  const destino = join(rutas.citas, `${nombreDeFicheroDeCita(prefijo, definitivo)}.md`);

  // Se escribe el destino antes de borrar el origen: si algo falla en medio, la
  // candidata sigue en revisión en lugar de haberse evaporado.
  await writeFile(destino, conTemas, 'utf8');
  await rm(candidata.ruta, { force: true });
}

/**
 * Declara los Temas en el frontmatter de una candidata, justo tras el Autor.
 *
 * Va ahí y no al final por lo mismo que el año de nacimiento va antes que el de
 * fallecimiento: el orden del fichero es para quien lo lee, y las Citas ya publicadas lo
 * tienen así. Un fichero nuevo con las claves en otro orden no rompe nada y se nota.
 *
 * Sin Temas devuelve el texto intacto — la convención del corpus es que un campo sin
 * valor **se omite**, nunca `temas: []`.
 */
/** El bloque `temas:` ya escrito, en cualquiera de las dos formas de YAML. */
const TEMAS_YA_ESCRITOS = /^temas:[ \t]*(?:(\[[^\]]*\])[ \t]*\n|\n((?:[ \t]+-.*\n)*))/gmu;

function conTemasDeclarados(bruto: string, temas: string[]): string {
  if (temas.length === 0) return bruto;

  /*
   * Los Temas que la candidata **ya trae**, que no siempre son ninguno: AD-2 retira moviendo a
   * revisión, no borrando, así que una Cita retirada vuelve allí con los suyos puestos. Añadir
   * un segundo bloque `temas:` no dejaba una Cita mal etiquetada: dejaba un fichero con dos
   * claves iguales, que **no es YAML válido**, y con él caía la lectura entera del Corpus y el
   * build detrás. Se descubrió con una orden que reventó leyendo el Corpus.
   *
   * Se funden, no se sustituyen: la orden dice a qué Tema más pertenece la Cita, no cuáles deja
   * de tener, y quedarse solo con los de la orden borraría trabajo editorial que nadie pidió
   * borrar.
   */
  const suyos = [...bruto.matchAll(TEMAS_YA_ESCRITOS)].flatMap((casa) =>
    // Las dos formas que admite YAML y que el Corpus usa: en línea —`temas: ["x"]`— y
    // desplegada en guiones. Se cubren las dos porque una sola dejaría la otra duplicándose.
    [...(casa[1] ?? casa[2] ?? '').matchAll(/(?:^[ \t]+-\s*|[[,]\s*)([^,\]\n]+)/gmu)].map((t) =>
      t[1].trim().replace(/^"|"$/gu, ''),
    ),
  );
  const sinLosSuyos = bruto.replace(TEMAS_YA_ESCRITOS, '');

  const unicos = [...new Set([...suyos, ...temas])];
  const bloque = ['temas:', ...unicos.map((t) => `  - ${JSON.stringify(t)}`)].join('\n');
  // Tras el Autor; sin él, tras el Personaje, su dueño (Historia 35.2).
  const ancla = /^autor:/m.test(sinLosSuyos) ? /^(autor:.*)$/m : /^(personaje:.*)$/m;
  return sinLosSuyos.replace(ancla, `$1\n${bloque}`);
}

/** El Autor y el Personaje de una candidata, los que declare, para resolver su Ficha de Obra. */
function dueñosDe(candidata: Pick<CandidataEnRevision, 'autor' | 'personaje'>): { autor?: string; personaje?: string } {
  return {
    ...(candidata.autor !== undefined ? { autor: candidata.autor } : {}),
    ...(candidata.personaje !== undefined ? { personaje: candidata.personaje } : {}),
  };
}

/**
 * Rechaza las candidatas indicadas: el fichero deja de existir.
 *
 * Borrar aquí no contradice la regla de no borrar del corpus. Esa regla protege a las
 * Citas **publicadas**, que se retiran moviéndolas a `corpus/_revision/`; una candidata
 * rechazada ya está ahí, y dejarla sería volver a proponerla en cada revisión. El
 * criterio es explícito: después de rechazarla no queda en ninguna parte.
 */
export async function rechazar(rutas: Rutas, slugs: string[]): Promise<ResultadoDeDecision> {
  const lote = await loteEnRevision(rutas);
  const resultado: ResultadoDeDecision = {
    publicadas: [],
    renombradas: [],
    rechazadasPorAdmision: [],
    rechazadasPorFicha: [],
    rechazadasPorTema: [],
    fichasSinAsegurar: [],
    publicadasSinTema: [],
    rechazadas: [],
    noEncontradas: [],
    conSaltos: [],
    avisos: [],
    vedadas: [],
  };

  /*
   * Historia 35.7 — una candidata de siempre rechazada no vuelve como atribuida: su forma se anota
   * en `corpus/formas-vedadas.yml` **antes** de borrar nada, en un solo añadido. Si el registro no
   * se deja leer o escribir, no se rechaza ninguna: lanza, y nada se ha borrado.
   */
  const encontradas: CandidataEnRevision[] = [];
  for (const slug of [...new Set(slugs)]) {
    const candidata = lote.find((c) => c.slug === slug);
    if (candidata === undefined) {
      resultado.noEncontradas.push(slug);
      continue;
    }
    encontradas.push(candidata);
  }
  const hoy = fechaLocal(new Date());
  resultado.vedadas = await registrarFormasVedadas(
    rutas,
    encontradas
      .filter((c) => !esAtribuida(c))
      .map((c) => entradaVedada(c.texto ?? '', motivoDeLaCandidata(c), hoy, c.slug))
      .filter((e): e is FormaVedada => e !== undefined),
  );
  for (const candidata of encontradas) {
    await rm(candidata.ruta, { force: true });
    resultado.rechazadas.push(candidata.slug);
  }

  return resultado;
}

/**
 * El informe que lee quien revisa.
 *
 * `total` es cuántas hay pendientes; `lote`, cuántas se enseñan. Que sean dos números y no
 * uno es la garantía de la Historia 19.6: **un corte que no dice lo que deja fuera es una
 * puerta en secreto**, y una puerta silenciosa que rechaza Citas buenas es justo lo que el
 * proyecto lleva sesiones evitando. Aquí el corte se declara y lo de abajo se cuenta.
 */
export function formatearLote(lote: CandidataEnRevision[], total: number = lote.length): string {
  if (total === 0) return 'No queda ninguna candidata por revisar.\n';

  const lineas = [`Pendientes de decisión: ${total}`, ''];

  for (const candidata of lote) {
    lineas.push(`${candidata.slug}`);
    lineas.push(`  «${candidata.texto}»`);
    if (candidata.duplicaA) lineas.push(`  ⚠ ${textoDeRepetida(candidata.duplicaA)}. Decide tú.`);
    for (const parecida of candidata.parecidas ?? []) lineas.push(`  ⚠ ${textoDeParecida(parecida)}. Decide tú.`);
    if (!candidata.admisible) {
      lineas.push('  ✕ No pasaría la admisión aunque se apruebe:');
      for (const motivo of candidata.motivos) lineas.push(`      ${motivo}`);
    }
    lineas.push('');
  }

  const debajo = total - lote.length;
  if (debajo > 0) {
    lineas.push(
      `Quedan ${debajo} por debajo del corte, ordenadas de más a menos prometedora. ` +
        'Se ven subiendo --primeras.',
    );
    lineas.push('');
  }

  lineas.push('Aprobar:  npx tsx tools/revisar.ts --aprobar <slug> [<slug>...]');
  lineas.push('Rechazar: npx tsx tools/revisar.ts --rechazar <slug> [<slug>...]');
  return `${lineas.join('\n')}\n`;
}

/**
 * El aviso de una repetida (Historia 29.4), sin signo ni cierre: con quién, dónde y la clase. Lo
 * usan el listado («… Decide tú.») y el parte de `--aprobar`, que ya publicó.
 */
export function textoDeRepetida(d: NonNullable<CandidataEnRevision['duplicaA']>): string {
  return `Duplica a ${d.slug} (${d.donde}; repetidas)`;
}

/**
 * El aviso de una parecida (Historia 29.4), sin signo ni cierre: con quién, dónde, la clase y el
 * parecido. Lo usan el listado y el parte de `--aprobar`.
 */
export function textoDeParecida(p: Parecida): string {
  const cifra = cifraDeParecido(p.parecido);
  if (p.clase === 'contenida') {
    const verbo = p.sentido === 'contiene-a' ? 'Contiene a' : 'Contenida en';
    return `${verbo} ${p.slug} (${p.donde}; contenida, ${cifra})`;
  }
  const palabra = p.palabra !== undefined ? `; ${p.palabra.a}/${p.palabra.b}` : '';
  return `Casi igual a ${p.slug} (${p.donde}; casi iguales, ${cifra}${palabra})`;
}
