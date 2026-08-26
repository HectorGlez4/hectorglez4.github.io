/**
 * Sonda: qué documento del Corpus está más cerca del umbral de legibilidad, y por qué señal.
 *
 * La prueba de margen de la 11.5 dice, en su propio comentario, qué hacer cuando salta: «lo
 * que habría que revisar no es esta prueba sino la señal que lo esté rozando». Esto lo dice,
 * usando la medida del proyecto y no una réplica —una réplica escrita a ojo cuenta «y» y «a»
 * como letras sueltas y señala documentos sanos—.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { SEÑALES, medirLegibilidad } from '../src/lib/legibilidad.ts';

const fuentes = join(process.cwd(), 'corpus/fuentes');

const medidas = readdirSync(fuentes)
  .filter((f) => f.endsWith('.txt'))
  .map((fichero) => {
    const bruto = readFileSync(join(fuentes, fichero), 'utf8');
    const cuerpo = bruto.split('---\n').slice(2).join('---\n');
    return { fichero, medida: medirLegibilidad(cuerpo) };
  })
  .sort((a, b) => b.medida.proporcion - a.medida.proporcion);

for (const { fichero, medida } of medidas.slice(0, 6)) {
  const disparadas = SEÑALES.filter((s) => medida.señales[s] > 0)
    .map((s) => `${s}=${medida.señales[s]}`)
    .join(' ');
  process.stdout.write(
    `${(medida.proporcion * 100).toFixed(3)}%  ${medida.palabras} palabras  ` +
      `${fichero}\n        ${disparadas}\n`,
  );
}
