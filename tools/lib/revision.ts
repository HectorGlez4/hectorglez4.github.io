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

import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { citaAdmisible } from '../../src/lib/admision.ts';
import { normalizar } from '../../src/lib/normalizar.ts';
import { leerCitas, mover, type Rutas } from './corpus.ts';

export interface CandidataEnRevision {
  slug: string;
  texto: string;
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

    const duplicadaPublicada = yaPublicadas.get(canonico);
    const duplicadaEnRevision = vistasEnRevision.get(canonico);

    lote.push({
      slug: candidata.slug,
      texto: candidata.texto,
      ruta: candidata.ruta,
      // La publicada gana: lo que el editor necesita saber es que ya está publicada.
      ...(duplicadaPublicada !== undefined
        ? { duplicaA: { slug: duplicadaPublicada, donde: 'publicadas' as const } }
        : duplicadaEnRevision !== undefined
          ? { duplicaA: { slug: duplicadaEnRevision, donde: 'en revisión' as const } }
          : {}),
      admisible: comprobacion.success,
      motivos: comprobacion.success
        ? []
        : comprobacion.error.issues.map((i) => i.message),
    });

    if (canonico !== '') vistasEnRevision.set(canonico, candidata.slug);
  }

  return lote;
}

export interface ResultadoDeDecision {
  publicadas: string[];
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
export async function aprobar(rutas: Rutas, slugs: string[]): Promise<ResultadoDeDecision> {
  const lote = await loteEnRevision(rutas);
  const resultado: ResultadoDeDecision = {
    publicadas: [],
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

    if (!candidata.admisible) {
      resultado.rechazadasPorAdmision.push({ slug, motivos: candidata.motivos });
      continue;
    }

    await mover(candidata.ruta, rutas.citas);
    resultado.publicadas.push(slug);
  }

  return resultado;
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
