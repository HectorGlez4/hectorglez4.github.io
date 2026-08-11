/**
 * Gestión de Autores — FR-15.
 *
 *   npx tsx tools/autor.ts crear  --nombre "Séneca" --fallecimiento 65 \
 *                                 --semblanza "Filósofo estoico." [--nacimiento -4]
 *   npx tsx tools/autor.ts editar seneca --semblanza "…"
 *   npx tsx tools/autor.ts listar
 */

import { crearAutor, editarAutor, type DatosDeAutor } from './lib/gestion.ts';
import { leerAutores, rutasDelCorpus } from './lib/corpus.ts';
import { opcion, raizDeCorpusDe, terminar } from './lib/cli.ts';

const argumentos = process.argv.slice(2);
const orden = argumentos[0];
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));

function datosDe(args: string[]): DatosDeAutor {
  const entero = (v: string | undefined) => (v === undefined ? undefined : Number.parseInt(v, 10));
  return {
    nombre: opcion(args, '--nombre'),
    añoFallecimiento: entero(opcion(args, '--fallecimiento')),
    añoNacimiento: entero(opcion(args, '--nacimiento')),
    semblanza: opcion(args, '--semblanza'),
  };
}

switch (orden) {
  case 'crear':
    terminar(await crearAutor(rutas, datosDe(argumentos)));
    break;

  case 'editar': {
    const slug = argumentos[1];
    if (!slug || slug.startsWith('--')) {
      process.stderr.write('Indique el slug del Autor a editar.\n');
      process.exit(2);
    }
    terminar(await editarAutor(rutas, slug, datosDe(argumentos)));
    break;
  }

  case 'listar': {
    const autores = await leerAutores(rutas);
    for (const a of autores.sort((x, y) => x.slug.localeCompare(y.slug, 'es'))) {
      process.stdout.write(`${a.slug}\t${a.nombre}\t†${a.añoFallecimiento}\n`);
    }
    break;
  }

  default:
    process.stderr.write(
      [
        'Uso:',
        '  npx tsx tools/autor.ts crear  --nombre "…" --fallecimiento AAAA --semblanza "…"',
        '                               [--nacimiento AAAA] [--corpus corpus]',
        '  npx tsx tools/autor.ts editar <slug> [--nombre "…"] [--semblanza "…"]',
        '  npx tsx tools/autor.ts listar',
        '',
      ].join('\n'),
    );
    process.exit(2);
}
