/**
 * Componer un lote de jornadas — Historia 13.1, FR-9.
 *
 *   npx tsx tools/jornada.ts fijar 2026-08-24 seneca-la-vida-si-sabes-usarla-es-larga
 *   npx tsx tools/jornada.ts fijar 2026-08-24 <slug> 2026-08-25 <slug> 2026-08-26 <slug>
 *   npx tsx tools/jornada.ts soltar 2026-08-25 [2026-08-26 ...]
 *   npx tsx tools/jornada.ts listar
 *
 * Un interruptor fino sobre `tools/lib/jornadas.ts`, con el patrón de `tools/portada.ts` y
 * `tools/coleccion.ts`: aquí se leen argumentos y se escribe la salida, y toda la lógica
 * está debajo.
 *
 * **Fijar es escribir en `corpus/portada.json`**, que es donde la Cita del Día ya busca
 * antes de rotar desde la v1. No hay un calendario del lote: lo que se compone por
 * adelantado y lo que se compone el día salen de la misma fijación, y por eso son
 * indistinguibles sin que nadie tenga que desempatar. El material se mira en `/lote`, que
 * lo deriva en cada construcción y no guarda nada.
 *
 * Los rechazos salen con código distinto de cero, como el resto de `tools/`.
 */

import { fijarJornadas, inventarioDeJornadas, soltarJornadas, type Fijacion } from './lib/jornadas.ts';
import { rutasDelCorpus } from './lib/corpus.ts';
import {
  motivosDeArgumentosNoReconocidos,
  posicionales,
  raizDeCorpusDe,
  terminar,
} from './lib/cli.ts';
import { esJornada, jornadaDelBuild } from '../src/lib/citaDelDia.ts';
import { fechaLocal } from './lib/corpus.ts';

/** Las opciones que consumen el argumento siguiente, para que no se cuelen de posicional. */
const CON_VALOR = ['--corpus'] as const;

const argumentos = process.argv.slice(2);
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));
const sueltos = posicionales(argumentos, CON_VALOR);
const orden = sueltos[0];

/**
 * Qué día es hoy para esta orden, y por qué no es exactamente el del build.
 *
 * El sitio fecha por UTC (`jornadaDelBuild`), y hace bien: el build lo lanza el CI y una
 * jornada que dependiera de la zona de la máquina sería otra fuente de divergencia. Pero
 * esta orden la ejecuta **una persona en su zona**, y escribe la fecha que ve en su
 * calendario. En la península, entre las 00:00 y las 02:00 las dos lecturas discrepan: para
 * UTC todavía es ayer.
 *
 * **La decisión: se rechaza solo lo que ya pasó en las dos lecturas**, es decir se compara
 * contra la más temprana de ambas. La asimetría es deliberada, porque los dos errores no
 * cuestan lo mismo. Rechazar por equivocación un día que la persona tiene por futuro deja la
 * orden inservible justo cuando se usa —a la una de la madrugada, preparando la semana—. Y
 * dejar pasar un día ya vencido no publica nada, no rompe nada, y sale marcado con «·» en
 * «listar», donde se ve y se suelta.
 *
 * `FECHA_JORNADA` gana sobre las dos, porque es una declaración explícita y es como las
 * pruebas fijan la jornada. Y **se avisa cuando viene de ahí**: olvidada en la shell, cambia
 * en silencio qué significa «esta jornada ya pasó», y un rechazo inexplicable es peor que un
 * aviso de más.
 */
const ahora = new Date();
const declarada = process.env.FECHA_JORNADA?.trim();
const desdeElEntorno = declarada !== undefined && esJornada(declarada);
const jornadaDeLaConstruccion = jornadaDelBuild(process.env, ahora);
const jornadaLocal = fechaLocal(ahora);
const HOY = desdeElEntorno
  ? jornadaDeLaConstruccion
  : jornadaLocal < jornadaDeLaConstruccion
    ? jornadaLocal
    : jornadaDeLaConstruccion;

if (desdeElEntorno) {
  process.stderr.write(
    `Aviso: FECHA_JORNADA=${declarada} viene del entorno, así que «hoy» es esa jornada y no ` +
      'la de su calendario.\n',
  );
}

const USO = [
  'Uso:',
  '  npx tsx tools/jornada.ts fijar <AAAA-MM-DD> <slug-de-cita> [<AAAA-MM-DD> <slug-de-cita>...]',
  '  npx tsx tools/jornada.ts soltar <AAAA-MM-DD> [<AAAA-MM-DD>...]',
  '  npx tsx tools/jornada.ts listar',
  '',
  'Toda orden admite --corpus <ruta>. Solo se fijan Citas publicadas y aptas para portada.',
  'Se fija en corpus/portada.json, que es donde la Cita del Día ya mira antes de rotar.',
  '',
].join('\n');

/*
 * Una bandera con errata no es «lo mismo pero sin ella», y aquí menos que en ninguna otra
 * orden: esta **escribe en el corpus**, y un `--corpuss /tmp/x` que se ignorara en silencio
 * dejaría a `raizDeCorpusDe` cayendo a `corpus` y a la orden fijando jornadas en el corpus
 * de verdad. Los posicionales se declaran admitidos —ya los reconoció `posicionales`— y lo
 * que sobra es cualquier opción que esta orden no tenga.
 */
const noReconocidos = motivosDeArgumentosNoReconocidos(argumentos, {
  solas: sueltos,
  conValor: CON_VALOR,
});
if (noReconocidos.length > 0) {
  process.stderr.write(`${noReconocidos.join('\n')}\n\n${USO}`);
  process.exit(2);
}

/**
 * Los pares jornada/Cita de la orden `fijar`.
 *
 * Un número impar de argumentos es una lista mal escrita, y se para aquí: seguir adelante
 * fijaría los pares completos y dejaría el último a medias sin que nadie lo pidiera.
 */
function paresDeLaOrden(): Fijacion[] {
  const resto = sueltos.slice(1);
  if (resto.length === 0 || resto.length % 2 !== 0) {
    process.stderr.write(
      `Se fija por pares: una jornada y el slug de su Cita.\n\n${USO}`,
    );
    process.exit(2);
  }
  const pares: Fijacion[] = [];
  for (let i = 0; i < resto.length; i += 2) pares.push({ jornada: resto[i], cita: resto[i + 1] });
  return pares;
}

/*
 * El envoltorio de nivel superior, por la misma razón que en `tools/coleccion.ts`: el lector
 * se niega a leer a medias un `portada.json` ilegible y lanza nombrando el fichero, y una
 * orden cuya cabecera promete rechazos redactados no puede contestar con una traza de Node.
 */
try {
  switch (orden) {
    case 'fijar':
      terminar(await fijarJornadas(rutas, paresDeLaOrden(), HOY));
      break;

    case 'soltar': {
      const pedidas = sueltos.slice(1);
      // Una orden sin argumentos es un error de uso, y sale con 2 como en `fijar`: el 1 es
      // para lo que la orden entendió y rechazó, no para lo que ni siquiera supo leer.
      if (pedidas.length === 0) {
        process.stderr.write(`Indique al menos la jornada que soltar.\n\n${USO}`);
        process.exit(2);
      }
      terminar(await soltarJornadas(rutas, pedidas));
      break;
    }

    case 'listar': {
      const inventario = await inventarioDeJornadas(rutas, HOY);
      if (!inventario.ok) terminar(inventario);

      const { jornadas } = inventario;
      if (jornadas.length === 0) {
        process.stdout.write(
          [
            `No hay ninguna jornada fijada en ${rutas.portada}.`,
            'La Cita del Día sale de la rotación todos los días. Componga un lote con «fijar».',
            '',
          ].join('\n'),
        );
        break;
      }

      const lineas = jornadas.map((j) => {
        /*
         * Los dos avisos son los dos modos en que una fijación se queda muda sin fallar:
         * la Cita se retiró a revisión, o perdió su marca de portada. En ambos casos
         * `citaDelDia` ignora la fijación y rota, que es lo correcto para la portada y lo
         * peor posible para quien creía tener el día resuelto.
         */
        const aviso = !j.publicada
          ? '  ← ya no es una Cita publicada: ese día rotará otra'
          : !j.apta
            ? '  ← ya no está marcada apta para portada: ese día rotará otra'
            : '';
        return `  ${j.pasada ? '·' : '→'} ${j.jornada}  ${j.cita}${aviso}`;
      });

      const porDelante = jornadas.filter((j) => !j.pasada).length;
      process.stdout.write(
        [
          `Jornadas fijadas: ${jornadas.length}, de las que ${porDelante} están por delante ` +
            `(hoy es ${HOY}).`,
          ...lineas,
          '',
          'El material de las que quedan por delante se ve compuesto en /lote.',
          '',
        ].join('\n'),
      );
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
