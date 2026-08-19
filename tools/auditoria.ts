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
import { leerCensoDeCotejo, leerCitas, rutasDelCorpus } from './lib/corpus.ts';
import { resumenDeCotejo } from './lib/cotejo.ts';
import { raizDeCorpusDe } from './lib/cli.ts';

const argumentos = process.argv.slice(2);
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));

const publicadas = await leerCitas(rutas.citas);
const enRevision = await leerCitas(rutas.revision);

const informe = auditar(publicadas as unknown as CitaParaAuditar[]);

/*
 * La deuda de cotejo — Historia 11.2.
 *
 * Se cuenta aquí, junto a SM-C1, porque es la misma pregunta: cuánta de la Procedencia
 * del Corpus está comprobada y cuánta solo declarada. Una Cita del censo tiene
 * Procedencia escrita pero nadie ha comprobado que su texto esté en la obra que cita, y
 * eso no se ve en el porcentaje de procedencia completa.
 *
 * El recuento lo hace `resumenDeCotejo`, en `tools/lib/`, y no unos filtros escritos
 * aquí: esta herramienta no tiene pruebas, y un recuento que miente en silencio en el
 * informe que existe para medir SM-C1 es peor que no tener informe.
 */
const cotejo = resumenDeCotejo(publicadas, await leerCensoDeCotejo(rutas));

if (argumentos.includes('--json')) {
  process.stdout.write(
    `${JSON.stringify(
      {
        ...informe,
        enRevision: enRevision.length,
        cotejo,
      },
      null,
      2,
    )}\n`,
  );
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
    // Historia 11.2 — la deuda que el censo cerrado todavía ampara.
    `Con documento de Fuente:     ${cotejo.conDocumento}  (las coteja el build en cada construcción)`,
    `Pendientes de cotejo:        ${cotejo.pendientes}  (tope ${cotejo.tope}, solo baja)`,
    // Una entrada rancia rompe el build, así que verla aquí antes es la única forma de
    // enterarse sin construir.
    ...(cotejo.rancias > 0
      ? [
          `ATENCIÓN: ${cotejo.rancias} ${cotejo.rancias === 1 ? 'entrada del censo no corresponde' : 'entradas del censo no corresponden'} a ninguna Cita publicada.`,
        ]
      : []),
    cotejo.pendientes === 0
      ? 'Ninguna Cita publicada queda sin cotejar: el censo está vacío.'
      : 'Son las anteriores a la v3, sin documento de Fuente. Las saca del censo la 11.4.',
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
