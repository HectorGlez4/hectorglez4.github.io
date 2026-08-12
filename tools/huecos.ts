/**
 * Qué le falta al Corpus — FR-25, LC-6.
 *
 *   npx tsx tools/huecos.ts [--corpus corpus] [--json]
 *
 * Se mira antes de elegir a quién se dedica una sesión de sembrado. No propone Autores:
 * dice qué está vacío y la elección es de quien lee.
 */

import { verHuecos, type AutorParaHuecos, type CitaParaHuecos } from '../src/lib/huecos.ts';
import { temasPublicados, type Cita, type Tema } from '../src/lib/publicado.ts';
import { MIN_CITAS_POR_TEMA } from '../src/lib/umbrales.ts';
import { leerAutores, leerCitas, leerTemas, rutasDelCorpus } from './lib/corpus.ts';
import { raizDeCorpusDe } from './lib/cli.ts';

const argumentos = process.argv.slice(2);
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));

const citas = (await leerCitas(rutas.citas)) as unknown as CitaParaHuecos[];
const temas = await leerTemas(rutas);
const autores = (await leerAutores(rutas)) as unknown as AutorParaHuecos[];

/*
 * Los Temas anunciados se piden al dueño único del conjunto publicable (AD-11), que es
 * el mismo módulo del que sale la portada. Enumerarlos aquí a mano no comprobaría nada:
 * compararía el umbral consigo mismo. Así, si un día la portada anunciara por otra regla,
 * esto lo vería.
 */
const anunciados = temasPublicados(
  temas as unknown as Tema[],
  citas as unknown as Cita[],
).map((t) => t.slug);
const informe = verHuecos(citas, temas, autores, anunciados);

if (argumentos.includes('--json')) {
  process.stdout.write(`${JSON.stringify(informe, null, 2)}\n`);
} else {
  const { temas: huecos, tradicion } = informe;
  const lineas = [
    'Huecos del Corpus',
    '═════════════════',
    '',
    `Temas por debajo del umbral de publicación (${MIN_CITAS_POR_TEMA} Citas)`,
    '─────────────────────────────────────────────────────',
  ];

  if (huecos.length === 0) {
    lineas.push('Ninguno: todos los Temas del corpus llegan al umbral.');
  } else {
    for (const hueco of huecos) {
      lineas.push(
        `${hueco.nombre.padEnd(20)} ${String(hueco.publicadas).padStart(3)} publicadas` +
          `  ·  faltan ${hueco.faltan}`,
      );
    }
  }

  lineas.push(
    '',
    'Equilibrio de tradición',
    '───────────────────────',
    `Autores en el Corpus:        ${tradicion.total}`,
    `De tradición latinoamericana: ${tradicion.latinoamericana}  (${tradicion.porcentaje} %)`,
    `De tradición peninsular:      ${tradicion.peninsular}`,
    `De otra tradición:            ${tradicion.otra}`,
    `Sin declarar:                 ${tradicion.sinDeclarar}`,
    '',
    tradicion.alcanzaElSuelo
      ? `Por encima del suelo comprometido del ${tradicion.suelo} %.`
      : `POR DEBAJO del suelo comprometido del ${tradicion.suelo} %.`,
  );

  if (informe.anunciadosBajoUmbral.length > 0) {
    lineas.push(
      '',
      'ATENCIÓN: la portada anuncia Temas que no llegan al umbral:',
      ...informe.anunciadosBajoUmbral.map((slug) => `  ${slug}`),
    );
  }

  // Ni una sugerencia de a quién sembrar. La vista informa; elegir es de quien lee.
  process.stdout.write(`${lineas.join('\n')}\n`);
}
