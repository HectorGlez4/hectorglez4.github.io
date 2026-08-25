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
import { join } from 'node:path';
import { citaAdmisible } from '../../src/lib/admision.ts';
import { motivoParaNoPublicar } from './cotejo.ts';
import { normalizar } from '../../src/lib/normalizar.ts';
import { slugLibre } from '../../src/lib/slug.ts';
import { leerCitas, leerTemas, mover, nombreDeFicheroDeCita, type Rutas } from './corpus.ts';

export interface CandidataEnRevision {
  slug: string;
  texto: string;
  /** Slug del Autor: compone el nombre del fichero al publicar. */
  autor: string;
  ruta: string;
  /**
   * La Cita ya presente con la que coincide, si coincide con alguna — FR-14.
   *
   * Se señala, no se decide: el sistema no tiene criterio para saber si dos textos
   * equivalentes son la misma Cita o dos ediciones legítimas de la misma frase.
   */
  duplicaA?: { slug: string; donde: 'publicadas' | 'en revisión' };
  /** Si pasaría la puerta de admisión ahora mismo, y qué le falta si no. */
  admisible: boolean;
  motivos: string[];
}

/** Todo lo que está pendiente de decisión, en el orden en que se revisa. */
export async function loteEnRevision(rutas: Rutas): Promise<CandidataEnRevision[]> {
  const pendientes = await leerCitas(rutas.revision);
  const publicadas = await leerCitas(rutas.citas);

  // El índice de comparación usa la forma canónica de AD-3, la misma que la búsqueda:
  // si duplicados y búsqueda usaran criterios distintos, el corpus podría acabar con dos
  // Citas que la búsqueda presenta como una sola.
  const yaPublicadas = new Map(publicadas.map((c) => [normalizar(c.texto), c.slug]));

  const vistasEnRevision = new Map<string, string>();
  const lote: CandidataEnRevision[] = [];

  for (const candidata of [...pendientes].sort((a, b) => a.slug.localeCompare(b.slug, 'es'))) {
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
    });

    const duplicadaPublicada = yaPublicadas.get(canonico);
    const duplicadaEnRevision = vistasEnRevision.get(canonico);

    lote.push({
      slug: candidata.slug,
      texto: candidata.texto,
      autor: candidata.autor,
      ruta: candidata.ruta,
      // La publicada gana: lo que el editor necesita saber es que ya está publicada.
      ...(duplicadaPublicada !== undefined
        ? { duplicaA: { slug: duplicadaPublicada, donde: 'publicadas' as const } }
        : duplicadaEnRevision !== undefined
          ? { duplicaA: { slug: duplicadaEnRevision, donde: 'en revisión' as const } }
          : {}),
      admisible: comprobacion.success && sinDocumento === undefined,
      motivos: [
        ...(comprobacion.success ? [] : comprobacion.error.issues.map((i) => i.message)),
        ...(sinDocumento !== undefined ? [sinDocumento] : []),
      ],
    });

    if (canonico !== '') vistasEnRevision.set(canonico, candidata.slug);
  }

  return lote;
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
  rechazadas: string[];
  noEncontradas: string[];
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
): Promise<ResultadoDeDecision> {
  const lote = await loteEnRevision(rutas);
  const resultado: ResultadoDeDecision = {
    publicadas: [],
    renombradas: [],
    rechazadasPorAdmision: [],
    rechazadas: [],
    noEncontradas: [],
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
  if (temas.length > 0) {
    const conocidos = new Set((await leerTemas(rutas)).map((t) => t.slug));
    const desconocidos = [...new Set(temas)].filter((t) => !conocidos.has(t));
    if (desconocidos.length > 0) return { ...resultado, temasDesconocidos: desconocidos };
  }

  // Los slugs que no se pueden pisar: los publicados, más los que esta misma ejecución
  // vaya publicando. Sin lo segundo, dos candidatas que colisionan entre sí se pisarían.
  const ocupados = new Set((await leerCitas(rutas.citas)).map((c) => c.slug));

  for (const slug of slugs) {
    const candidata = lote.find((c) => c.slug === slug);
    if (candidata === undefined) {
      resultado.noEncontradas.push(slug);
      continue;
    }

    if (!candidata.admisible) {
      resultado.rechazadasPorAdmision.push({ slug, motivos: candidata.motivos });
      continue;
    }

    const definitivo = slugLibre(candidata.slug, ocupados);
    ocupados.add(definitivo);

    if (definitivo === candidata.slug && temas.length === 0) {
      await mover(candidata.ruta, rutas.citas);
    } else {
      await reescribirConSlug(candidata, definitivo, rutas, temas);
      if (definitivo !== candidata.slug) {
        resultado.renombradas.push({ de: candidata.slug, a: definitivo });
      }
    }

    resultado.publicadas.push(slug);
  }

  return resultado;
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
): Promise<void> {
  const bruto = await readFile(candidata.ruta, 'utf8');
  const conNuevoSlug = bruto.replace(
    /^slug:.*$/m,
    `slug: ${JSON.stringify(definitivo)}`,
  );
  const conTemas = conTemasDeclarados(conNuevoSlug, temas);

  const destino = join(
    rutas.citas,
    `${nombreDeFicheroDeCita(candidata.autor, definitivo)}.md`,
  );

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
  return sinLosSuyos.replace(/^(autor:.*)$/m, `$1\n${bloque}`);
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
    rechazadas: [],
    noEncontradas: [],
  };

  for (const slug of slugs) {
    const candidata = lote.find((c) => c.slug === slug);
    if (candidata === undefined) {
      resultado.noEncontradas.push(slug);
      continue;
    }
    await rm(candidata.ruta, { force: true });
    resultado.rechazadas.push(slug);
  }

  return resultado;
}

/** El informe que lee quien revisa. */
export function formatearLote(lote: CandidataEnRevision[]): string {
  if (lote.length === 0) return 'No queda ninguna candidata por revisar.\n';

  const lineas = [`Pendientes de decisión: ${lote.length}`, ''];

  for (const candidata of lote) {
    lineas.push(`${candidata.slug}`);
    lineas.push(`  «${candidata.texto}»`);
    if (candidata.duplicaA) {
      lineas.push(
        `  ⚠ Duplica a ${candidata.duplicaA.slug} (${candidata.duplicaA.donde}). Decide tú.`,
      );
    }
    if (!candidata.admisible) {
      lineas.push('  ✕ No pasaría la admisión aunque se apruebe:');
      for (const motivo of candidata.motivos) lineas.push(`      ${motivo}`);
    }
    lineas.push('');
  }

  lineas.push('Aprobar:  npx tsx tools/revisar.ts --aprobar <slug> [<slug>...]');
  lineas.push('Rechazar: npx tsx tools/revisar.ts --rechazar <slug> [<slug>...]');
  return `${lineas.join('\n')}\n`;
}
