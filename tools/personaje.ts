/**
 * Gestión de Personajes — Historia 35.2, AD-1, AD-33.
 *
 *   npx tsx tools/personaje.ts crear "Batman" --universo "DC Comics"
 *   npx tsx tools/personaje.ts listar
 *   npx tsx tools/personaje.ts proponer-claves
 *   npx tsx tools/personaje.ts clave batman ["Batman"]
 *   npx tsx tools/personaje.ts semblanza batman "<texto>" --responde "<quién>"
 *   npx tsx tools/personaje.ts biografia batman <documento de corpus/biografias/> [--semblanza "<texto>"]
 *
 * Un Personaje no es un Autor: no tiene años —el esquema los rechaza con su mensaje (AD-33)—
 * ni tradición, y comparte con los Autores, activos y retirados, **un solo espacio de slugs**:
 * `crear` se niega ante un slug ocupado, y el build rompe si alguno se cuela.
 *
 * Ninguna orden escribe un campo tecleado como tal. La clave de orden la propone la regla fija
 * de `tools/lib/claves.ts`, la misma del Autor, y `clave` es la orden de una persona: la única que
 * escribe `ordenRevisado`. La semblanza es la de una biografía (AD-26, que `biografia` lee de su
 * documento y el build coteja literal) o la propia, con quien responde de ella; nunca las dos.
 * **Sobre el Corpus real, `clave`, `semblanza` y `biografia` son de Héctor, nunca de un agente.**
 *
 * Códigos: 2 es la forma de la invocación, 1 lo que la invocación dice; en ninguno de los dos se
 * escribe nada.
 */

import {
  CLAVES_DE_PERSONAJE,
  fijarClaveDe,
  proponerClavesDe,
} from './lib/gestion.ts';
import {
  crearPersonaje,
  declararBiografiaDePersonaje,
  declararSemblanzaPropia,
  listarPersonajes,
} from './lib/personajes.ts';
import { fechaLocal, rutasDelCorpus } from './lib/corpus.ts';
import { motivosDeArgumentosNoReconocidos, opcion, raizDeCorpusDe, terminar } from './lib/cli.ts';

const USO = [
  'Uso:',
  '  npx tsx tools/personaje.ts crear "<nombre>" --universo "<universo>" [--corpus corpus]',
  '  npx tsx tools/personaje.ts listar',
  '  npx tsx tools/personaje.ts proponer-claves',
  '  npx tsx tools/personaje.ts clave <slug> ["<clave>"]',
  '  npx tsx tools/personaje.ts semblanza <slug> "<texto>" --responde "<quién>"',
  '  npx tsx tools/personaje.ts biografia <slug> <documento de corpus/biografias/> [--semblanza "<texto>"]',
  '',
].join('\n');

/** Por orden: cuántos argumentos sueltos toma tras su nombre (mínimo, máximo) y sus banderas con valor. */
const FORMA: Record<string, { sueltos: [number, number]; conValor: readonly string[] }> = {
  crear: { sueltos: [1, 1], conValor: ['--corpus', '--universo'] },
  listar: { sueltos: [0, 0], conValor: ['--corpus'] },
  'proponer-claves': { sueltos: [0, 0], conValor: ['--corpus'] },
  clave: { sueltos: [1, 2], conValor: ['--corpus'] },
  semblanza: { sueltos: [2, 2], conValor: ['--corpus', '--responde'] },
  biografia: { sueltos: [2, 2], conValor: ['--corpus', '--semblanza'] },
};

const argumentos = process.argv.slice(2);
const orden = argumentos[0];
const forma = orden === undefined ? undefined : FORMA[orden];

function salirPorLaForma(motivos: string[]): never {
  process.stderr.write(`${motivos.join('\n')}\n\n${USO}`);
  process.exit(2);
}

if (forma === undefined) salirPorLaForma([orden === undefined ? 'Falta la orden.' : `«${orden}» no es una orden de tools/personaje.ts.`]);

/*
 * Los sueltos se cuentan por posición, no por valor: el guardián compartido compara por valor y
 * dejaría pasar un tercer suelto igual al segundo. Lo que sigue a una bandera con valor es suyo.
 */
const sueltos: string[] = [];
for (let i = 1; i < argumentos.length; i += 1) {
  const actual = argumentos[i];
  if (forma.conValor.includes(actual)) {
    i += 1;
    continue;
  }
  if (!actual.startsWith('--')) sueltos.push(actual);
}
const noReconocidos = motivosDeArgumentosNoReconocidos(argumentos, {
  solas: [orden, ...sueltos],
  conValor: forma.conValor,
});
const [minimo, maximo] = forma.sueltos;
if (sueltos.length > maximo) noReconocidos.push(`«${sueltos[maximo]}» sobra: ${orden} toma como mucho ${maximo} argumentos sueltos.`);
if (sueltos.length < minimo) noReconocidos.push(`Faltan argumentos: ${orden} toma ${minimo}.`);
for (const bandera of forma.conValor) {
  if (argumentos.filter((a) => a === bandera).length > 1) noReconocidos.push(`«${bandera}» está repetida.`);
}
if (orden === 'crear' && opcion(argumentos, '--universo') === undefined && !noReconocidos.some((m) => m.includes('--universo'))) {
  noReconocidos.push('Falta «--universo "<universo>"»: un Personaje es de un universo, y es obligatorio.');
}
if (orden === 'semblanza' && opcion(argumentos, '--responde') === undefined && !noReconocidos.some((m) => m.includes('--responde'))) {
  noReconocidos.push('Falta «--responde "<quién>"»: una semblanza propia dice quién responde de ella.');
}
if (noReconocidos.length > 0) salirPorLaForma(noReconocidos);

const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));

switch (orden) {
  case 'crear':
    terminar(await crearPersonaje(rutas, { nombre: sueltos[0], universo: opcion(argumentos, '--universo') }));

  case 'listar':
    terminar(await listarPersonajes(rutas));

  case 'proponer-claves':
    terminar(await proponerClavesDe(rutas, CLAVES_DE_PERSONAJE));

  case 'clave':
    terminar(await fijarClaveDe(rutas, CLAVES_DE_PERSONAJE, sueltos[0], sueltos[1], fechaLocal(new Date())));

  case 'semblanza':
    terminar(await declararSemblanzaPropia(rutas, sueltos[0], sueltos[1], opcion(argumentos, '--responde') ?? ''));

  case 'biografia':
    terminar(await declararBiografiaDePersonaje(rutas, sueltos[0], sueltos[1], opcion(argumentos, '--semblanza')));

  default:
    salirPorLaForma([`«${orden}» no es una orden de tools/personaje.ts.`]);
}
