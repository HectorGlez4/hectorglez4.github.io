/**
 * Curación de Colecciones — Historia 12.4, AD-18.
 *
 *   npx tsx tools/coleccion.ts crear "Frases cortas para reflexionar" --criterio "Citas de una sola frase."
 *   npx tsx tools/coleccion.ts asignar frases-cortas-para-reflexionar seneca-no-es-que-tengamos-poco-tiempo
 *   npx tsx tools/coleccion.ts quitar frases-cortas-para-reflexionar seneca-no-es-que-tengamos-poco-tiempo
 *   npx tsx tools/coleccion.ts estado frases-cortas-para-reflexionar
 *   npx tsx tools/coleccion.ts listar
 *   npx tsx tools/coleccion.ts despublicar frases-cortas-para-reflexionar
 *   npx tsx tools/coleccion.ts publicar frases-cortas-para-reflexionar
 *
 * Un interruptor fino sobre `tools/lib/curacion.ts`, con el patrón de `tools/tema.ts`: aquí
 * se leen argumentos y se escribe la salida, y toda la lógica está debajo.
 *
 * **Es comodidad y no puerta.** Editar `corpus/colecciones/{slug}.yml` a mano se salta esta
 * orden y no se salta ninguna regla: el esquema de `src/content.config.ts` rompe el build
 * igual. Lo que esta orden da es no equivocarse: no asigna una Cita que sigue en revisión,
 * no traga un slug con errata, y dice cuántas Citas faltan sin que haya que contarlas.
 *
 * Los rechazos salen con código distinto de cero, como el resto de `tools/`: estas órdenes
 * se encadenan en guiones y un rechazo con código 0 dejaría al guion creyendo que salió
 * bien.
 */

import {
  asignarCitas,
  crearColeccion,
  despublicarColeccion,
  estadoDeColeccion,
  inventarioConSolape,
  inventarioDeRetiradas,
  publicarColeccion,
  quitarCitas,
} from './lib/curacion.ts';
import { rutasDelCorpus } from './lib/corpus.ts';
import {
  motivosDeArgumentosNoReconocidos,
  opcion,
  posicionales,
  raizDeCorpusDe,
  terminar,
} from './lib/cli.ts';
import { lineaDeHueco, lineaDePublicada, porcentajeEnEspañol } from '../src/lib/formato.ts';
import { MIN_CITAS_POR_COLECCION } from '../src/lib/umbrales.ts';

/** Las opciones que consumen el argumento siguiente, para que no se cuelen de posicional. */
const CON_VALOR = ['--corpus', '--criterio'] as const;

const argumentos = process.argv.slice(2);
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));
// Los posicionales se extraen con **todas** las opciones que llevan valor, para que el
// valor de una no se cuele nunca como argumento suelto. Cuál de ellas admite cada orden se
// juzga después.
const sueltos = posicionales(argumentos, CON_VALOR);
const orden = sueltos[0];

const USO = [
  'Uso:',
  '  npx tsx tools/coleccion.ts crear "Nombre" --criterio "Por qué están juntas"',
  '  npx tsx tools/coleccion.ts asignar <slug-coleccion> <slug-cita> [<slug-cita>...]',
  '  npx tsx tools/coleccion.ts quitar <slug-coleccion> <slug-cita> [<slug-cita>...]',
  '  npx tsx tools/coleccion.ts estado <slug-coleccion>',
  '  npx tsx tools/coleccion.ts listar',
  '  npx tsx tools/coleccion.ts despublicar <slug-coleccion>',
  '  npx tsx tools/coleccion.ts publicar <slug-coleccion>',
  '',
  'Toda orden admite --corpus <ruta>. Solo se asignan Citas publicadas.',
  '',
].join('\n');

/*
 * Una bandera con errata no es «lo mismo pero sin ella», y aquí menos que en ninguna otra
 * orden: esta **escribe contenido nuevo**, y un `--corpuss /tmp/x` que se ignorara en
 * silencio dejaría a `raizDeCorpusDe` cayendo a `corpus` y a la orden sembrando una
 * Colección en el corpus de verdad, que es exactamente lo que la historia prohíbe. Los
 * posicionales se declaran como admitidos —ya los reconoció `posicionales`— y lo que sobra
 * es cualquier opción que esta orden no tenga.
 */
const admitidas = {
  solas: sueltos,
  conValor: orden === 'crear' ? CON_VALOR : (['--corpus'] as const),
};
const noReconocidos = motivosDeArgumentosNoReconocidos(argumentos, admitidas);
if (noReconocidos.length > 0) {
  process.stderr.write(`${noReconocidos.join('\n')}\n\n${USO}`);
  process.exit(2);
}

/** El slug de la Colección sobre la que opera la orden, o la salida con el uso. */
function slugDeLaOrden(): string {
  const slug = sueltos[1];
  if (!slug) {
    process.stderr.write(`Indique el slug de la Colección.\n\n${USO}`);
    process.exit(2);
  }
  return slug;
}

/*
 * El envoltorio de nivel superior, y no es decoración defensiva.
 *
 * `leerColecciones` se niega a leer a medias un YAML ilegible y lanza nombrando el fichero
 * —hace bien: una curación sobre un corpus leído a trozos escribiría encima de lo que no
 * entendió—. Lo que no vale es que ese fallo salga como traza de Node, con una orden cuya
 * cabecera promete rechazos redactados y código distinto de cero. Aquí se convierte en lo
 * segundo sin perder el mensaje, que ya nombra el fichero que hay que arreglar.
 */
try {
  switch (orden) {
    case 'crear': {
      const nombre = sueltos[1];
      if (!nombre) {
        process.stderr.write(`Indique el nombre de la Colección.\n\n${USO}`);
        process.exit(2);
      }
      /*
       * El criterio va como opción con nombre y no como segundo posicional a propósito: son
       * dos textos largos en español seguidos, y confundirlos escribiría el criterio en el
       * nombre —que es la URL— sin que nada se quejara, porque los dos son texto libre.
       */
      terminar(await crearColeccion(rutas, { nombre, criterio: opcion(argumentos, '--criterio') }));
      break;
    }

    case 'asignar':
      terminar(await asignarCitas(rutas, slugDeLaOrden(), sueltos.slice(2)));
      break;

    case 'quitar':
      terminar(await quitarCitas(rutas, slugDeLaOrden(), sueltos.slice(2)));
      break;

    case 'estado':
      terminar(await estadoDeColeccion(rutas, slugDeLaOrden()));
      break;

    case 'despublicar':
      terminar(await despublicarColeccion(rutas, slugDeLaOrden()));
      break;

    case 'publicar':
      terminar(await publicarColeccion(rutas, slugDeLaOrden()));
      break;

    case 'listar': {
      // Como en `tools/tema.ts listar`: la pregunta que uno se hace mirando la lista es
      // cuál está a punto de publicarse y cuál se quedó corta, y se contesta con la misma
      // línea que la vista de huecos.
      const colecciones = await inventarioConSolape(rutas);
      const lineas =
        colecciones.length === 0
          ? ['No hay ninguna Colección en corpus/colecciones/. Cree la primera con «crear».']
          : colecciones.flatMap((c) => [
              c.faltan === 0 ? lineaDePublicada(c, MIN_CITAS_POR_COLECCION) : lineaDeHueco(c),
              /*
               * El solape va debajo de cada fila y no en una columna: son dos porcentajes y el
               * nombre de una superficie, y en una tabla de ancho fijo eso obliga a recortar
               * justo lo que hay que leer. Duplicar es que las dos listas sean la misma, así que
               * los dos números tienen que verse enteros.
               */
              ...(c.solape.mayor === undefined
                ? []
                : [
                    `                       ↳ ${porcentajeEnEspañol(c.solape.mayor.porcentaje)} % ` +
                      `de ella se ve también en ${c.solape.mayor.clase === 'autor' ? 'el Autor' : 'el Tema'} ` +
                      `«${c.solape.mayor.slug}», y es el ` +
                      `${porcentajeEnEspañol(c.solape.mayor.porcentajeDeLaSuperficie)} % de esa página.`,
                  ]),
            ]);

      /*
       * Y las retiradas, en su propio bloque. El rechazo de una orden que no encuentra una
       * Colección remite aquí, así que aquí tienen que aparecer: si no, la remisión manda a
       * un sitio donde lo que se busca no está.
       */
      const retiradas = await inventarioDeRetiradas(rutas);
      if (retiradas.length > 0) {
        lineas.push('', 'Despublicadas (en corpus/_colecciones-retiradas/):');
        for (const retirada of retiradas) {
          lineas.push(
            retirada.faltan === 0
              ? lineaDePublicada(retirada, MIN_CITAS_POR_COLECCION)
              : lineaDeHueco(retirada),
          );
        }
      }

      process.stdout.write(`${lineas.join('\n')}\n`);
      break;
    }

    default:
      process.stderr.write(USO);
      process.exit(2);
  }
} catch (fallo) {
  process.stderr.write(`${fallo instanceof Error ? fallo.message : String(fallo)}\n`);
  process.exit(1);
}
