/**
 * El registro de clases de Cita — Historia 35.1.
 *
 *   npx tsx tools/clases.ts sembrar [--corpus <dir>]
 *
 * Anota en `corpus/clases-de-cita.yml`, como de siempre y con la jornada local de hoy, cada Cita
 * publicada que no esté ya, y nada más. Es idempotente: una segunda pasada añade 0. Se corre tras
 * cada puesta al día de una rama con la principal, porque las Citas sembradas entretanto llegan
 * sin anotar y el build no las deja pasar.
 *
 * Códigos: 2 si la invocación no vale (subcomando o bandera desconocidos, o `--corpus` repetida); 1 si el registro o el
 * Corpus no se dejan leer, o si una Cita que falta es atribuida —esa la anota su alta—, y en esos
 * casos no escribe nada; 0 en lo demás.
 */

import { fechaLocal, rutasDelCorpus } from './lib/corpus.ts';
import { sembrarRegistro } from './lib/clases.ts';

const USO = 'Uso: npx tsx tools/clases.ts sembrar [--corpus <dir>]\n';

export function analizarArgumentos(argumentos: readonly string[]): { corpus: string } | { error: string } {
  const [subcomando, ...resto] = argumentos;
  if (subcomando !== 'sembrar') {
    return { error: subcomando === undefined ? 'Falta el subcomando.' : `Subcomando desconocido: «${subcomando}».` };
  }
  let corpus: string | undefined;
  for (let i = 0; i < resto.length; i += 1) {
    if (resto[i] === '--corpus' && corpus !== undefined) return { error: 'Bandera repetida: «--corpus».' };
    if (resto[i] === '--corpus') {
      if (resto[i + 1] === undefined || resto[i + 1].startsWith('--')) return { error: 'Falta el valor de «--corpus».' };
      corpus = resto[i + 1];
      i += 1;
      continue;
    }
    return { error: `Argumento desconocido: «${resto[i]}».` };
  }
  return { corpus: corpus ?? 'corpus' };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const analizados = analizarArgumentos(process.argv.slice(2));
  if ('error' in analizados) {
    process.stderr.write(`${analizados.error}\n${USO}`);
    process.exit(2);
  }
  try {
    const { añadidas, ruta } = await sembrarRegistro(rutasDelCorpus(analizados.corpus), fechaLocal(new Date()));
    process.stdout.write(
      añadidas === 0
        ? 'Registro de clases al día: 0 añadidas.\n'
        : `Registro de clases: ${añadidas} ${añadidas === 1 ? 'Cita añadida' : 'Citas añadidas'} como de siempre en ${ruta}.\n`,
    );
  } catch (fallo) {
    process.stderr.write(`${fallo instanceof Error ? fallo.message : String(fallo)}\n`);
    process.exit(1);
  }
}
