/**
 * La única orden que cambia una Cita atribuida publicada — Historia 35.6, AD-35.
 *
 *   npm run atribuida -- obra <slug> "<obra>"
 *   npm run atribuida -- autor <slug> <slug-de-autor>
 *   npm run atribuida -- personaje <slug> <slug-de-personaje>
 *   npm run atribuida -- variante <slug> "<texto>" --region <región> --origen <origen>
 *   npm run atribuida -- texto <slug> "<texto>"
 *
 * Una atribuida publicada **no se edita a mano**: lo que el esquema no ve —su Ficha de Obra, sus
 * topes, los duplicados entre clases, su clase— lo guarda esta orden (`tools/lib/cambioDeAtribuida.ts`).
 * Con la puerta de la atribuida cerrada (las constantes de Héctor sin valor) toda invocación
 * válida sale con 1 sin escribir.
 *
 * Códigos: 2 es la forma de la invocación (suborden desconocida, argumentos de menos o de más,
 * bandera desconocida, repetida, vacía o sin valor, `variante` sin `--region` o `--origen`), 1 lo que la
 * invocación dice; en ninguno de los dos se escribe nada.
 */

import { cambiarAtribuida, type CambioDeAtribuida } from './lib/cambioDeAtribuida.ts';
import { rutasDelCorpus } from './lib/corpus.ts';
import { motivosDeArgumentosNoReconocidos, opcion, raizDeCorpusDe, terminar } from './lib/cli.ts';

const USO = [
  'Uso:',
  '  npm run atribuida -- obra <slug> "<obra>" [--corpus corpus]',
  '  npm run atribuida -- autor <slug> <slug-de-autor>',
  '  npm run atribuida -- personaje <slug> <slug-de-personaje>',
  '  npm run atribuida -- variante <slug> "<texto>" --region <región> --origen <origen>',
  '  npm run atribuida -- texto <slug> "<texto>"',
  '',
].join('\n');

/** Por suborden: cuántos argumentos sueltos toma tras su nombre y sus banderas con valor. */
const FORMA: Record<string, { sueltos: number; conValor: readonly string[] }> = {
  obra: { sueltos: 2, conValor: ['--corpus'] },
  autor: { sueltos: 2, conValor: ['--corpus'] },
  personaje: { sueltos: 2, conValor: ['--corpus'] },
  variante: { sueltos: 2, conValor: ['--corpus', '--region', '--origen'] },
  texto: { sueltos: 2, conValor: ['--corpus'] },
};

const argumentos = process.argv.slice(2);
const orden = argumentos[0];
const forma = orden === undefined || !Object.hasOwn(FORMA, orden) ? undefined : FORMA[orden];

function salirPorLaForma(motivos: string[]): never {
  process.stderr.write(`${motivos.join('\n')}\n\n${USO}`);
  process.exit(2);
}

if (forma === undefined) {
  salirPorLaForma([orden === undefined ? 'Falta la suborden.' : `«${orden}» no es una suborden de npm run atribuida.`]);
}

// Los sueltos se cuentan por posición: lo que sigue a una bandera con valor es suyo.
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
if (sueltos.length > forma.sueltos) {
  noReconocidos.push(`«${sueltos[forma.sueltos]}» sobra: ${orden} toma ${forma.sueltos} argumentos sueltos.`);
}
if (sueltos.length < forma.sueltos) noReconocidos.push(`Faltan argumentos: ${orden} toma ${forma.sueltos}.`);
for (const bandera of forma.conValor) {
  if (argumentos.filter((a) => a === bandera).length > 1) noReconocidos.push(`«${bandera}» está repetida.`);
}
if (orden === 'variante') {
  for (const bandera of ['--region', '--origen']) {
    if (!argumentos.includes(bandera)) noReconocidos.push(`Falta «${bandera}»: la Variante declara su región y su origen.`);
  }
}
for (const bandera of forma.conValor) {
  if (opcion(argumentos, bandera) === '') noReconocidos.push(`«${bandera}» va vacía.`);
  // Dada sin valor —la última, o seguida de otra bandera—: es la forma, no lo que dice.
  else if (argumentos.includes(bandera) && opcion(argumentos, bandera) === undefined) {
    noReconocidos.push(`«${bandera}» va sin valor.`);
  }
}
for (const [i, suelto] of sueltos.entries()) {
  if (suelto.trim() === '') noReconocidos.push(`El argumento ${i + 1} va vacío.`);
}
if (noReconocidos.length > 0) salirPorLaForma(noReconocidos);

const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));
const [slug, valor] = sueltos;

const cambio: CambioDeAtribuida =
  orden === 'obra'
    ? { tipo: 'obra', slug, obra: valor }
    : orden === 'autor'
      ? { tipo: 'autor', slug, autor: valor }
      : orden === 'personaje'
        ? { tipo: 'personaje', slug, personaje: valor }
        : orden === 'variante'
          ? {
              tipo: 'variante',
              slug,
              texto: valor,
              region: opcion(argumentos, '--region') ?? '',
              origen: opcion(argumentos, '--origen') ?? '',
            }
          : { tipo: 'texto', slug, texto: valor };

terminar(await cambiarAtribuida(rutas, cambio));
