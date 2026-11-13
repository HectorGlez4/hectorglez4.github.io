/**
 * Gestión de Temas — FR-15.
 *
 *   npx tsx tools/tema.ts crear "El tiempo"
 *   npx tsx tools/tema.ts asignar el-tiempo <slug-cita> [<slug-cita>...]
 *   npx tsx tools/tema.ts quitar  el-tiempo <slug-cita> [<slug-cita>...]
 *   npx tsx tools/tema.ts eliminar el-tiempo
 *   npx tsx tools/tema.ts listar
 *
 * El conjunto de Temas es cerrado y se gestiona internamente (FR-6); por eso hay una
 * herramienta y no un campo libre en el alta.
 */

import { asignarTema, crearTema, eliminarTema, quitarTema } from './lib/gestion.ts';
import { leerCitas, leerTemas, rutasDelCorpus } from './lib/corpus.ts';
import { posicionales, raizDeCorpusDe, terminar } from './lib/cli.ts';
import { MIN_CITAS_POR_TEMA } from '../src/lib/umbrales.ts';

const argumentos = process.argv.slice(2);
/*
 * Los posicionales, sin las opciones ni su valor: con `filter((a) => !a.startsWith('--'))`
 * el valor de `--corpus` pasaba por un slug —`quitar --corpus <dir> el-tiempo <cita>` tomaba
 * la ruta por el Tema— (A7 de la retrospectiva de la Épica 26).
 */
const [orden, ...resto] = posicionales(argumentos, ['--corpus']);
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));

switch (orden) {
  case 'crear': {
    const nombre = resto[0];
    if (!nombre) {
      process.stderr.write('Indique el nombre del Tema.\n');
      process.exit(2);
    }
    terminar(await crearTema(rutas, nombre));
  }

  case 'asignar': {
    /*
     * Un Tema nuevo casi nunca nace de Citas nuevas: nace de reconocer que un puñado de las
     * que ya están publicadas hablan de lo mismo. Sin esta orden eso se hacía editando
     * frontmatter a mano, y la primera vez salió un fallo.
     */
    const [slugTema, ...slugsDeCitas] = resto;
    if (!slugTema) {
      process.stderr.write('Indique el slug del Tema y las Citas a las que asignarlo.\n');
      process.exit(2);
    }
    terminar(await asignarTema(rutas, slugTema, slugsDeCitas));
  }

  case 'quitar': {
    /*
     * La simétrica de `asignar`, y hacía falta por lo mismo: sin ella, un Tema mal puesto solo
     * se deshacía editando el frontmatter a mano. `eliminar` no vale — borra el Tema entero.
     */
    const [slugTema, ...slugsDeCitas] = resto;
    if (!slugTema) {
      process.stderr.write('Indique el slug del Tema y las Citas a las que quitárselo.\n');
      process.exit(2);
    }
    terminar(await quitarTema(rutas, slugTema, slugsDeCitas));
  }

  case 'eliminar': {
    const slug = resto[0];
    if (!slug) {
      process.stderr.write('Indique el slug del Tema a eliminar.\n');
      process.exit(2);
    }
    terminar(await eliminarTema(rutas, slug));
  }

  case 'listar': {
    // Se muestra cuántas Citas publicadas tiene cada Tema y si cruza el umbral, porque
    // es la pregunta que se hace el editor al mirar la lista: cuál está a punto de
    // publicarse y cuál se quedó corto.
    const temas = await leerTemas(rutas);
    const citas = await leerCitas(rutas.citas);
    const cuenta = new Map<string, number>();
    for (const cita of citas) {
      for (const tema of cita.temas ?? []) cuenta.set(tema, (cuenta.get(tema) ?? 0) + 1);
    }
    for (const tema of temas.sort((a, b) => a.slug.localeCompare(b.slug, 'es'))) {
      const n = cuenta.get(tema.slug) ?? 0;
      const estado = n >= MIN_CITAS_POR_TEMA ? 'publicado' : `faltan ${MIN_CITAS_POR_TEMA - n}`;
      process.stdout.write(`${tema.slug}\t${tema.nombre}\t${n}\t${estado}\n`);
    }
    break;
  }

  default:
    process.stderr.write(
      [
        'Uso:',
        '  npx tsx tools/tema.ts crear "Nombre del Tema" [--corpus corpus]',
        '  npx tsx tools/tema.ts asignar <slug-tema> <slug-cita> [<slug-cita>...]',
        '  npx tsx tools/tema.ts quitar  <slug-tema> <slug-cita> [<slug-cita>...]',
        '  npx tsx tools/tema.ts eliminar <slug>',
        '  npx tsx tools/tema.ts listar',
        '',
      ].join('\n'),
    );
    process.exit(2);
}
