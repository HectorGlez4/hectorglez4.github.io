/**
 * Revisión de candidatas por lote — FR-24.
 *
 *   npx tsx tools/revisar.ts [--corpus corpus]                     lista lo pendiente
 *   npx tsx tools/revisar.ts --aprobar <slug> [<slug>...] [--temas <tema> [<tema>...]]
 *   npx tsx tools/revisar.ts --rechazar <slug> [<slug>...]
 *
 * `--temas` declara los Temas de todo lo que se apruebe en esa pasada, y es aquí porque es
 * cuando el revisor tiene la Cita delante y acaba de leerla. Sin ella, la tubería de
 * extracción publicaba Citas **sin ningún Tema**, así que no cerraban ningún hueco de Tema
 * — que es el primer criterio de la Historia 11.4 — y la única salida era editar el
 * frontmatter a mano.
 *
 * Sin argumentos lista lo que queda por decidir, con el aviso de duplicado y lo que le
 * falta a cada candidata para poder publicarse. Volver otro día es volver a ejecutarlo:
 * lo pendiente es lo que sigue en `corpus/_revision/`, así que no hay progreso que
 * guardar ni que pueda desincronizarse.
 */

import { rutasDelCorpus } from './lib/corpus.ts';
import { aprobar, formatearLote, loteEnRevision, rechazar } from './lib/revision.ts';
import { raizDeCorpusDe } from './lib/cli.ts';

const argumentos = process.argv.slice(2);
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));

/** Los slugs que siguen a una orden, hasta la siguiente opción. */
function slugsTras(orden: string): string[] {
  const desde = argumentos.indexOf(orden);
  if (desde === -1) return [];
  const slugs: string[] = [];
  for (const argumento of argumentos.slice(desde + 1)) {
    if (argumento.startsWith('--')) break;
    slugs.push(argumento);
  }
  return slugs;
}

const aAprobar = slugsTras('--aprobar');
const aRechazar = slugsTras('--rechazar');
const temas = slugsTras('--temas');

if (temas.length > 0 && aAprobar.length === 0) {
  process.stderr.write('«--temas» solo acompaña a «--aprobar»: rechazar no declara Temas.\n');
  process.exit(2);
}

if (aAprobar.length === 0 && aRechazar.length === 0) {
  process.stdout.write(formatearLote(await loteEnRevision(rutas)));
  process.exit(0);
}

const lineas: string[] = [];
let fallo = false;

if (aAprobar.length > 0) {
  const resultado = await aprobar(rutas, aAprobar, temas);

  if (resultado.temasDesconocidos !== undefined) {
    // Nada se ha publicado: el lote entero se detiene ante un Tema que no existe.
    process.stderr.write(
      `Tema desconocido: ${resultado.temasDesconocidos.map((t) => `«${t}»`).join(', ')}.\n` +
        'No se ha publicado ninguna candidata. Los Temas se crean con: npx tsx tools/tema.ts crear "…"\n',
    );
    process.exit(1);
  }

  const conTemas = temas.length > 0 ? `, en ${temas.map((t) => `«${t}»`).join(', ')}` : '';
  lineas.push(`Publicadas: ${resultado.publicadas.length}${conTemas}`);
  for (const slug of resultado.publicadas) lineas.push(`  ✓ ${slug}`);

  for (const cambio of resultado.renombradas) {
    // El slug es la URL. Que cambie está bien —el ocupado no se pisa— pero enterarse
    // después, no: quien aprueba tiene que poder anotarlo antes de compartir el enlace.
    lineas.push(`  → ${cambio.de} se publicó como ${cambio.a}: el slug estaba ocupado.`);
  }

  for (const rechazada of resultado.rechazadasPorAdmision) {
    // Aprobada por el editor y rechazada por la puerta: la puerta manda (AD-1).
    fallo = true;
    lineas.push(`  ✕ ${rechazada.slug} — sigue en revisión:`);
    for (const motivo of rechazada.motivos) lineas.push(`      ${motivo}`);
  }
  for (const slug of resultado.noEncontradas) {
    fallo = true;
    lineas.push(`  ? ${slug} — no está entre las candidatas pendientes.`);
  }
}

if (aRechazar.length > 0) {
  const resultado = await rechazar(rutas, aRechazar);
  lineas.push(`Rechazadas: ${resultado.rechazadas.length}`);
  for (const slug of resultado.rechazadas) lineas.push(`  – ${slug}`);
  for (const slug of resultado.noEncontradas) {
    fallo = true;
    lineas.push(`  ? ${slug} — no está entre las candidatas pendientes.`);
  }
}

process.stdout.write(`${lineas.join('\n')}\n`);
process.exit(fallo ? 1 : 0);
