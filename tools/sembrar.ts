/**
 * Siembra inicial del corpus.
 *
 *   npx tsx tools/sembrar.ts [--corpus corpus] [--seco]
 *
 * Crea los Autores y Temas de `corpus/semilla/` y después da de alta las Citas **con la
 * herramienta de alta**, no escribiendo ficheros por su cuenta. Es deliberado: si la
 * siembra escribiera directamente, el corpus inicial no demostraría nada sobre las
 * herramientas y podría contener cosas que el alta habría rechazado.
 *
 * Es idempotente: lo que ya existe se salta sin error, así que puede volver a ejecutarse.
 */

import { readFile } from 'node:fs/promises';
import { parse as parsearYaml } from 'yaml';
import { darDeAltaLote, formatearInforme, type EntradaDeLote } from './alta.ts';
import { crearAutor, crearTema } from './lib/gestion.ts';
import { rutasDelCorpus } from './lib/corpus.ts';
import { raizDeCorpusDe } from './lib/cli.ts';

interface AutorSemilla {
  nombre: string;
  nacimiento?: number;
  fallecimiento: number;
  semblanza: string;
}

const argumentos = process.argv.slice(2);
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));
const seco = argumentos.includes('--seco');

const autores = parsearYaml(await readFile('corpus/semilla/autores.yaml', 'utf8')) as AutorSemilla[];
const citas = parsearYaml(await readFile('corpus/semilla/citas.yaml', 'utf8')) as EntradaDeLote[];

// ── Autores ──────────────────────────────────────────────────────────────────
let autoresCreados = 0;
for (const autor of autores) {
  if (seco) continue;
  const resultado = await crearAutor(rutas, {
    nombre: autor.nombre,
    añoNacimiento: autor.nacimiento,
    añoFallecimiento: autor.fallecimiento,
    semblanza: autor.semblanza.trim(),
  });
  if (resultado.ok) autoresCreados += 1;
  else if (!resultado.motivos.some((m) => m.includes('ya existe'))) {
    process.stderr.write(`${autor.nombre}: ${resultado.motivos.join(' ')}\n`);
    process.exit(1);
  }
}

// ── Temas ────────────────────────────────────────────────────────────────────
// El conjunto es cerrado (FR-6): sale de los Temas que usan las Citas de la semilla, no
// de un campo libre.
const nombresDeTema = [...new Set(citas.flatMap((c) => c.temas ?? []))].sort((a, b) =>
  a.localeCompare(b, 'es'),
);
let temasCreados = 0;
for (const nombre of nombresDeTema) {
  if (seco) continue;
  const resultado = await crearTema(rutas, nombre);
  if (resultado.ok) temasCreados += 1;
  else if (!resultado.motivos.some((m) => m.includes('ya existe'))) {
    process.stderr.write(`${nombre}: ${resultado.motivos.join(' ')}\n`);
    process.exit(1);
  }
}

process.stdout.write(
  `Autores creados: ${autoresCreados} de ${autores.length}\n` +
    `Temas creados: ${temasCreados} de ${nombresDeTema.length}\n\n`,
);

// ── Citas, por la puerta de siempre ──────────────────────────────────────────
const informe = await darDeAltaLote(citas, rutas, { seco });
process.stdout.write(`${formatearInforme(informe)}\n`);

if (informe.enRevision.length > 0) {
  process.stdout.write(
    '\nLa siembra deja Citas en revisión. Revise los motivos de arriba antes de publicar.\n',
  );
}
