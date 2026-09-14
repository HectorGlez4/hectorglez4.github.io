/**
 * Gestión de Autores — FR-15.
 *
 *   npx tsx tools/autor.ts crear  --nombre "Séneca" --fallecimiento 65 \
 *                                 --semblanza "Filósofo estoico." [--nacimiento -4]
 *                                 [--tradicion latinoamericana|peninsular|otra]
 *   npx tsx tools/autor.ts editar seneca --semblanza "…"
 *   npx tsx tools/autor.ts listar
 *   npx tsx tools/autor.ts retirar seneca --motivo "por qué sale del Corpus"
 *
 * **Retirar mueve la ficha a `corpus/_autores-retirados/` y no borra nada** (AD-2), y se
 * niega mientras algo del Corpus apunte al Autor. Existe porque el 2026-09-14 descartar a
 * Fray Luis y a Lucrecio de sus épocas no surtió efecto hasta mover sus fichas a mano: el
 * cruce por época cuenta como sembrado a todo lo que esté en `corpus/autores/`.
 *
 * **La tradición se teclea aquí o no se teclea en ninguna parte** (Historia 11.4). El
 * esquema la admite desde la v1 y de ella sale el suelo del 40 % de tradición
 * latinoamericana que el PRD compromete, pero la orden no la aceptaba: `--tradicion` se
 * tragaba en silencio, el Autor se creaba sin el campo y la orden decía «creado». La
 * proporción no se movía y no había nada que mirar para saber por qué. El único camino que
 * quedaba era editar el `.yml` a mano, que es justo lo que la herramienta existe para
 * evitar.
 *
 * Sigue siendo opcional, por la razón que `admision.ts` explica: obligarla empujaría a
 * rellenarla a ojo para desbloquear el alta, y entonces la proporción mediría suposiciones.
 */

import {
  TRADICIONES,
  crearAutor,
  editarAutor,
  retirarAutor,
  type DatosDeAutor,
  type Tradicion,
} from './lib/gestion.ts';
import { leerAutores, rutasDelCorpus } from './lib/corpus.ts';
import { motivosDeArgumentosNoReconocidos, opcion, raizDeCorpusDe, terminar } from './lib/cli.ts';

/** Las opciones que consumen el argumento siguiente, para que no se cuelen de posicional. */
const CON_VALOR = [
  '--corpus',
  '--nombre',
  '--fallecimiento',
  '--nacimiento',
  '--semblanza',
  '--tradicion',
] as const;

const argumentos = process.argv.slice(2);
const orden = argumentos[0];
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));

const USO = [
  'Uso:',
  '  npx tsx tools/autor.ts crear  --nombre "…" --fallecimiento AAAA --semblanza "…"',
  `                               [--nacimiento AAAA] [--tradicion ${TRADICIONES.join('|')}]`,
  '                               [--corpus corpus]',
  '  npx tsx tools/autor.ts editar <slug> [--nombre "…"] [--semblanza "…"]',
  '                               [--tradicion …]',
  '  npx tsx tools/autor.ts listar',
  '  npx tsx tools/autor.ts retirar <slug> --motivo "…"',
  '',
].join('\n');

/** Las opciones de `retirar`: ninguna de las de crear o editar tiene sentido al retirar. */
const CON_VALOR_AL_RETIRAR = ['--corpus', '--motivo'] as const;

/** Las órdenes que toman el slug del Autor como primer argumento suelto. */
const CON_SLUG = ['editar', 'retirar'];

/**
 * La tradición, comprobada contra el conjunto del esquema antes de llegar a él.
 *
 * Se valida aquí y no solo en el esquema para que el rechazo enumere las tres: el mensaje
 * de Zod dice cuáles son, pero llega después de que la orden haya aceptado la bandera, y
 * quien se equivoca escribiendo «latina» merece ver la lista en el mismo sitio donde la
 * tecleó.
 */
function tradicionDe(args: string[]): Tradicion | undefined {
  const valor = opcion(args, '--tradicion');
  if (valor === undefined) return undefined;
  if (!TRADICIONES.includes(valor as Tradicion)) {
    process.stderr.write(
      `«${valor}» no es una tradición. Son: ${TRADICIONES.join(', ')}.\n` +
        'Se omite si todavía no está decidida; el informe de huecos cuenta aparte a quien ' +
        'no la declara.\n',
    );
    process.exit(1);
  }
  return valor as Tradicion;
}

function datosDe(args: string[]): DatosDeAutor {
  const entero = (v: string | undefined) => (v === undefined ? undefined : Number.parseInt(v, 10));
  return {
    nombre: opcion(args, '--nombre'),
    añoFallecimiento: entero(opcion(args, '--fallecimiento')),
    añoNacimiento: entero(opcion(args, '--nacimiento')),
    semblanza: opcion(args, '--semblanza'),
    tradicion: tradicionDe(args),
  };
}

/*
 * El guardián de banderas, con el mismo criterio que `tools/jornada.ts` y `tools/pieza.ts`:
 * 2 es la forma de la invocación, 1 es lo que la invocación dice. Sin él, la orden aceptaba
 * cualquier `--loquesea` sin rechistar, que es exactamente cómo `--tradicion` pasó de largo
 * durante toda la v2 sin que nadie se enterara.
 */
const slugPosicional =
  orden !== undefined && CON_SLUG.includes(orden) && argumentos[1] && !argumentos[1].startsWith('--')
    ? [argumentos[1]]
    : [];
const noReconocidos = motivosDeArgumentosNoReconocidos(argumentos, {
  solas: [orden ?? '', ...slugPosicional],
  // Cada orden admite las suyas: un `--motivo` en `crear` o un `--nombre` en `retirar` se
  // rechazan igual que una bandera inventada, en vez de ignorarse.
  conValor: orden === 'retirar' ? CON_VALOR_AL_RETIRAR : CON_VALOR,
});
if (noReconocidos.length > 0) {
  process.stderr.write(`${noReconocidos.join('\n')}\n\n${USO}`);
  process.exit(2);
}

switch (orden) {
  case 'crear':
    terminar(await crearAutor(rutas, datosDe(argumentos)));

  case 'editar': {
    const slug = argumentos[1];
    if (!slug || slug.startsWith('--')) {
      process.stderr.write('Indique el slug del Autor a editar.\n');
      process.exit(2);
    }
    terminar(await editarAutor(rutas, slug, datosDe(argumentos)));
  }

  case 'listar': {
    const autores = await leerAutores(rutas);
    for (const a of autores.sort((x, y) => x.slug.localeCompare(y.slug, 'es'))) {
      /*
       * La tradición sale en el listado porque es el dato que hay que poder repasar de un
       * vistazo: el suelo del 40 % se mide sobre ella, y «sin declarar» no es lo mismo que
       * «otra». Sin verla aquí, comprobarla exigía abrir doce ficheros.
       */
      const tradicion = a.tradicion ?? 'sin declarar';
      process.stdout.write(`${a.slug}\t${a.nombre}\t†${a.añoFallecimiento}\t${tradicion}\n`);
    }
    break;
  }

  case 'retirar': {
    const slug = argumentos[1];
    if (!slug || slug.startsWith('--')) {
      process.stderr.write(`Indique el slug del Autor a retirar.\n\n${USO}`);
      process.exit(2);
    }
    const motivo = opcion(argumentos, '--motivo');
    /*
     * El motivo que falta es la forma de la invocación —código 2—, como en `documentar.ts
     * --retirar`: la orden está incompleta. Un motivo en blanco sí llega a la función, que lo
     * rechaza con 1 por lo que dice.
     */
    if (motivo === undefined) {
      process.stderr.write(
        `Indique el motivo por el que retira «${slug}» con --motivo "…".\n` +
          'Una retirada sin motivo no es una retirada: es una desaparición.\n\n' +
          USO,
      );
      process.exit(2);
    }
    terminar(await retirarAutor(rutas, slug, motivo));
  }

  default:
    process.stderr.write(USO);
    process.exit(2);
}
