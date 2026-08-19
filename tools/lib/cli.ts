/** Piezas compartidas por las herramientas de línea de órdenes. */

import type { Resultado } from './gestion.ts';

/** Valor de una opción `--clave valor`. `undefined` si no aparece. */
export function opcion(argumentos: string[], clave: string): string | undefined {
  const indice = argumentos.indexOf(clave);
  if (indice === -1) return undefined;
  const valor = argumentos[indice + 1];
  return valor === undefined || valor.startsWith('--') ? undefined : valor;
}

export function raizDeCorpusDe(argumentos: string[]): string {
  return opcion(argumentos, '--corpus') ?? 'corpus';
}

/**
 * Los argumentos que no son opciones ni valor de una opción.
 *
 * `argumentos.find((a) => !a.startsWith('--'))` parecía suficiente hasta que alguien
 * escribió `--corpus corpus https://…`: el primer no-guion era `corpus`, y la herramienta
 * tomaba por dirección la raíz del corpus. `conValor` nombra las opciones que consumen el
 * argumento siguiente, así que el que queda es el posicional de verdad.
 */
export function posicionales(argumentos: string[], conValor: readonly string[] = []): string[] {
  const salida: string[] = [];
  for (let i = 0; i < argumentos.length; i += 1) {
    const actual = argumentos[i];
    if (conValor.includes(actual)) {
      const siguiente = argumentos[i + 1];
      if (siguiente !== undefined && !siguiente.startsWith('--')) i += 1;
      continue;
    }
    if (actual.startsWith('--')) continue;
    salida.push(actual);
  }
  return salida;
}

/**
 * Escribe el resultado y sale con el código que corresponda.
 *
 * Un rechazo sale con código distinto de cero a propósito: estas herramientas se
 * encadenan en guiones de ingesta, y un rechazo silencioso con código 0 dejaría al
 * guion creyendo que la operación salió bien.
 */
export function terminar(resultado: Resultado): never {
  if (resultado.ok) {
    process.stdout.write(`${resultado.mensaje}\n`);
    process.exit(0);
  }
  process.stderr.write(`${resultado.motivos.join('\n')}\n`);
  process.exit(1);
}
