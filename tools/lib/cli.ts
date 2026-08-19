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
 * Las opciones que una orden admite: las sueltas y las que consumen el valor siguiente.
 */
export interface OpcionesAdmitidas {
  solas: readonly string[];
  conValor: readonly string[];
}

/**
 * Lo que sobra o está mal escrito en la línea de órdenes. Vacío si todo se reconoce.
 *
 * Sin esto, una bandera con errata se ignoraba en silencio y la orden hacía lo de por
 * omisión saliendo con código 0: `tools/objetivo.ts --registar` imprimía la propuesta, no
 * registraba nada y le decía al guion que la sesión había quedado anotada. Un argumento
 * que no se reconoce nunca es «lo mismo pero sin él».
 */
export function motivosDeArgumentosNoReconocidos(
  argumentos: string[],
  admitidas: OpcionesAdmitidas,
): string[] {
  const motivos: string[] = [];

  for (let i = 0; i < argumentos.length; i += 1) {
    const actual = argumentos[i];

    if (admitidas.conValor.includes(actual)) {
      // Su valor no es un argumento suelto: pertenece a la opción y se salta con ella.
      const siguiente = argumentos[i + 1];
      if (siguiente !== undefined && !siguiente.startsWith('--')) i += 1;
      continue;
    }

    if (admitidas.solas.includes(actual)) continue;

    motivos.push(
      actual.startsWith('--')
        ? `«${actual}» no es una opción de esta orden.`
        : `«${actual}» sobra: esta orden no toma argumentos sueltos.`,
    );
  }

  return motivos;
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
