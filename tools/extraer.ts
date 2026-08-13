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
import { aYaml, leerCitas, nombreDeFicheroDeCita, rutasDelCorpus } from './lib/corpus.ts';
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

/*
 * Los slugs ocupados son los del corpus entero, no solo los de esta ejecución.
 *
 * Con el conjunto vacío, repetir la extracción de una obra —el gesto natural tras
 * ajustar la ventana de longitud— sobrescribía las candidatas de la vez anterior,
 * incluidas las ya revisadas a medias. Y una candidata cuyo slug coincidiera con el de
 * una Cita publicada llegaba a la aprobación arrastrando una colisión que allí ya no
 * puede pisar nada, pero que obliga a renombrar.
 */
const ocupados = new Set([
  ...(await leerCitas(rutas.citas)).map((c) => c.slug),
  ...(await leerCitas(rutas.revision)).map((c) => c.slug),
]);

for (const candidata of resultado.candidatas) {
  const slug = slugLibre(slugDeCita(autor, normalizar(candidata.texto)), ocupados);
  ocupados.add(slug);
  // El nombre lo fija la espina: `{slug-autor}--{fragmento}.md`. Se compone con el mismo
  // ayudante que el alta y se deriva del slug ya calculado, no del texto, para que
  // fichero y URL no puedan divergir.
  const fichero = join(rutas.revision, `${nombreDeFicheroDeCita(autor, slug)}.md`);
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
