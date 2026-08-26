/**
 * Retira un documento de Fuente que no da ninguna Cita.
 *
 *     npx tsx tools/retirar.ts <fichero-del-documento> [--corpus corpus]
 *
 * Existe porque el gesto se repetía a mano: cinco veces en ocho sesiones se versionó un
 * documento que no daba nada —un entremés, una crónica, dos índices, un ensayo con un término
 * propio— y las cinco hubo que apartar el fichero y rechazar sus candidatas con un guion de
 * usar y tirar. **Dos de esas cinco las candidatas quedaron huérfanas**, y una candidata sin
 * documento produce una Cita que el cotejo de la 11.2 no puede comprobar.
 *
 * La orden se niega si alguna Cita publicada sale de ese documento, mueve en vez de borrar
 * —AD-2— y arrastra las candidatas, que es el paso que se olvidaba.
 */
import { resolve } from 'node:path';

import { rutasDelCorpus } from './lib/corpus.ts';
import { retirarFuente } from './lib/gestion.ts';

const argumentos = process.argv.slice(2);
const conCorpus = argumentos.indexOf('--corpus');
const corpus = conCorpus === -1 ? 'corpus' : (argumentos[conCorpus + 1] ?? 'corpus');
const sueltos = argumentos.filter(
  (a, i) => !a.startsWith('--') && i !== conCorpus + 1,
);

if (sueltos.length !== 1) {
  process.stderr.write(
    'Uso: npx tsx tools/retirar.ts <fichero-del-documento> [--corpus corpus]\n' +
      'El fichero es el nombre dentro de corpus/fuentes/, no la ruta entera.\n',
  );
  process.exit(1);
}

const resultado = await retirarFuente(rutasDelCorpus(resolve(corpus)), sueltos[0]);

if (!resultado.ok) {
  process.stderr.write(`${resultado.motivos.join('\n')}\n`);
  process.exit(1);
}

process.stdout.write(`${resultado.mensaje}\n`);
