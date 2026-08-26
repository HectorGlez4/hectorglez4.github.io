/**
 * Las dos cifras con que se cierra una sesión del bucle.
 *
 *   npm run cifras
 *
 * El «antes» llega por la entrada estándar —la lista de ficheros que HEAD tiene versionados— y el
 * «después» se cuenta del árbol. La diferencia la saca `tools/lib/cifras.ts`, que es puro y está
 * probado. Nadie teclea un total, y ese es justamente el asunto: la cifra del BITACORA falló tres
 * sesiones seguidas porque el paso de en medio era memoria.
 *
 * **git no entra aquí, y no es un descuido.** Ninguna orden de `tools/` lanza un proceso hijo, y
 * abrir esa puerta para una cuenta de ficheros sería pagar una capacidad nueva por comodidad —el
 * mismo criterio con que AD-22 deja la red en la cáscara y fuera de la lógica—. `git` se queda en
 * el guion de npm, donde ya vive, y lo que cruza es una lista de líneas.
 */
import { readdirSync } from 'node:fs';

import { lineasDeCifras, soloCitas } from './lib/cifras.ts';

const CITAS = 'corpus/citas';

/** La lista de HEAD, tal y como `git ls-tree` la escupe: una ruta por línea. */
async function versionadasSegunLaEntrada(): Promise<string[]> {
  if (process.stdin.isTTY) {
    console.error('Esta orden espera la lista de HEAD por la entrada: usa `npm run cifras`.');
    process.exit(1);
  }

  process.stdin.setEncoding('utf8');
  let crudo = '';
  for await (const trozo of process.stdin) {
    crudo += trozo;
  }
  return crudo.split('\n');
}

const antes = soloCitas(await versionadasSegunLaEntrada()).length;
const despues = soloCitas(readdirSync(CITAS)).length;

for (const linea of lineasDeCifras(antes, despues)) {
  console.log(linea);
}
