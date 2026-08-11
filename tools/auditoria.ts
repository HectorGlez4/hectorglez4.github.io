/**
 * Auditoría de salud del Corpus — FR-16.
 *
 *   npx tsx tools/auditoria.ts [--corpus corpus] [--json]
 *
 * Se consulta en cualquier momento y no exporta nada ni abre otra herramienta: lee los
 * ficheros del corpus y escribe el informe en la terminal. AD-10 — git es el único
 * almacén, así que no hay ningún sitio del que «sacar» los datos.
 */

import { auditar, type CitaParaAuditar } from '../src/lib/salud.ts';
import { leerCitas, rutasDelCorpus } from './lib/corpus.ts';
import { raizDeCorpusDe } from './lib/cli.ts';

const argumentos = process.argv.slice(2);
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));

const publicadas = await leerCitas(rutas.citas);
const enRevision = await leerCitas(rutas.revision);

const informe = auditar(publicadas as unknown as CitaParaAuditar[]);

if (argumentos.includes('--json')) {
  process.stdout.write(`${JSON.stringify({ ...informe, enRevision: enRevision.length }, null, 2)}\n`);
} else {
  const { publicadas: total, porAutor } = informe;

  const lineas = [
    'Salud del Corpus',
    '════════════════',
    '',
    `Citas publicadas:            ${total.total}`,
    `Con procedencia completa:    ${total.completa}  (${total.porcentajeCompleta} %)`,
    `Con procedencia parcial:     ${total.parcial}`,
    `Sin procedencia documentada: ${total.ausente}`,
    '',
    // El cero de arriba no es casualidad ni suerte: el esquema no admite publicar una
    // Cita cuya procedencia no documente nada. Merece decirse, porque un cero sin
    // explicación se lee como «todavía no se ha medido».
    total.ausente === 0
      ? 'Ninguna Cita publicada carece de procedencia, y no puede haberla: el esquema'
      : 'ATENCIÓN: hay Citas publicadas sin procedencia. Eso no debería poder ocurrir —',
    total.ausente === 0
      ? 'lo impide. Lo que falta por documentar está en las parciales.'
      : 'revise si alguna se escribió esquivando el build.',
    '',
    `En revisión, sin publicar:   ${enRevision.length}`,
    '',
    'Por Autor — de peor a mejor salud',
    '─────────────────────────────────',
  ];

  const ancho = Math.max(6, ...porAutor.map((a) => a.autor.length));
  for (const autor of porAutor) {
    lineas.push(
      `${autor.autor.padEnd(ancho)}  ${String(autor.completa).padStart(4)}/${String(autor.total).padEnd(4)}` +
        `  ${String(autor.porcentajeCompleta).padStart(5)} %` +
        (autor.parcial > 0 ? `   ${autor.parcial} parcial${autor.parcial === 1 ? '' : 'es'}` : ''),
    );
  }

  process.stdout.write(`${lineas.join('\n')}\n`);
}
