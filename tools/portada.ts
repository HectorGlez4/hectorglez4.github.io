/**
 * Marcado de Citas aptas para portada — FR-15, consumido por la Cita del Día (FR-9).
 *
 *   npx tsx tools/portada.ts marcar seneca-la-vida-si-sabes-usarla-es-larga
 *   npx tsx tools/portada.ts desmarcar <slug>
 *   npx tsx tools/portada.ts listar
 */

import { marcarAptaParaPortada } from './lib/gestion.ts';
import { leerCitas, rutasDelCorpus } from './lib/corpus.ts';
import { raizDeCorpusDe, terminar } from './lib/cli.ts';

const argumentos = process.argv.slice(2);
const orden = argumentos[0];
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));

switch (orden) {
  case 'marcar':
  case 'desmarcar': {
    const slug = argumentos[1];
    if (!slug || slug.startsWith('--')) {
      process.stderr.write('Indique el slug de la Cita.\n');
      process.exit(2);
    }
    terminar(await marcarAptaParaPortada(rutas, slug, orden === 'marcar'));
    break;
  }

  case 'listar': {
    const citas = await leerCitas(rutas.citas);
    const aptas = citas.filter((c) => c.aptaParaPortada === true);
    process.stdout.write(`Aptas para portada: ${aptas.length} de ${citas.length}\n`);
    for (const c of aptas.sort((a, b) => a.slug.localeCompare(b.slug, 'es'))) {
      process.stdout.write(`  ${c.slug}\n`);
    }
    break;
  }

  default:
    process.stderr.write(
      [
        'Uso:',
        '  npx tsx tools/portada.ts marcar <slug-de-cita> [--corpus corpus]',
        '  npx tsx tools/portada.ts desmarcar <slug-de-cita>',
        '  npx tsx tools/portada.ts listar',
        '',
      ].join('\n'),
    );
    process.exit(2);
}
