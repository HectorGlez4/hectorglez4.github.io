/**
 * Extracción de candidatas desde una Fuente — FR-23.
 *
 *   npx tsx tools/extraer.ts <documento.yaml> --autor <slug> [--corpus corpus] [--seco]
 *
 * El documento es un fichero que trae el texto de la obra y **su metadato tal y como lo
 * declara la Fuente**: `fuente`, `obra`, `año` y `url`. Se pasa como fichero y no como
 * argumentos sueltos por una razón de criterio: escribir el año a mano en la orden sería
 * exactamente la Procedencia inferida que FR-2 prohíbe. Lo que se escribe en la candidata
 * es lo que la Fuente dice, y el fichero deja constancia de qué dijo.
 *
 * Todas las candidatas van a `corpus/_revision/`, ninguna a `corpus/citas/`, aunque
 * traigan obra y año. Publicarlas es la decisión de la Historia 9.2, y es una decisión
 * de una persona.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import { normalizar } from '../src/lib/normalizar.ts';
import { slugDeCita, slugLibre } from '../src/lib/slug.ts';
import { aYaml, rutasDelCorpus } from './lib/corpus.ts';
import { extraerCandidatas, type DocumentoDeFuente } from './lib/extraccion.ts';
import { opcion, raizDeCorpusDe } from './lib/cli.ts';
import { mkdir, writeFile } from 'node:fs/promises';

const argumentos = process.argv.slice(2);
const rutaDelDocumento = argumentos.find((a) => !a.startsWith('--'));
const autor = opcion(argumentos, '--autor');
const seco = argumentos.includes('--seco');
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));

if (rutaDelDocumento === undefined || autor === undefined) {
  process.stderr.write(
    'Uso: npx tsx tools/extraer.ts <documento.yaml> --autor <slug> [--corpus corpus] [--seco]\n',
  );
  process.exit(2);
}

const documento = parsearYaml(await readFile(rutaDelDocumento, 'utf8')) as DocumentoDeFuente;
const resultado = extraerCandidatas(documento, autor);

if (!resultado.ok) {
  // Se detiene y explica por qué. El código distinto de cero importa: estas herramientas
  // se encadenan en guiones y un rechazo silencioso pasaría por éxito.
  process.stderr.write(`${resultado.motivo}\n`);
  process.exit(1);
}

await mkdir(rutas.revision, { recursive: true });

let escritas = 0;
// Los slugs ya usados se acumulan durante la propia ejecución: dos sentencias que
// empiecen igual producen la misma base, y sin esto la segunda pisaría a la primera.
const ocupados = new Set<string>();

for (const candidata of resultado.candidatas) {
  const slug = slugLibre(slugDeCita(autor, normalizar(candidata.texto)), ocupados);
  ocupados.add(slug);
  const fichero = join(rutas.revision, `${autor}--${slug}.md`);
  if (seco) {
    escritas += 1;
    continue;
  }
  await writeFile(
    fichero,
    `---\n${aYaml({
      texto: candidata.texto,
      autor: candidata.autor,
      temas: [],
      slug,
      procedencia: candidata.procedencia,
      estadoDerechos: 'dominio-público',
      fuente: candidata.fuente,
    })}---\n`,
    'utf8',
  );
  escritas += 1;
}

const porMotivo = (motivo: string) =>
  resultado.descartadas.filter((d) => d.motivo === motivo).length;

process.stdout.write(
  `Candidatas en revisión: ${escritas}${seco ? ' (en seco, no se ha escrito nada)' : ''}\n` +
    `Descartadas por longitud: ${porMotivo('longitud')}\n` +
    `Descartadas por no estar en español: ${porMotivo('no-esta-en-español')}\n` +
    `Descartadas por repetidas: ${porMotivo('repetida')}\n`,
);
