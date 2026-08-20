/**
 * El estado de los Modelos de Ingreso, y si algún Umbral se cruzó — Historia 14.1, AD-21.
 *
 *   npx tsx tools/ingreso.ts [--json] [--anotar] [--ayuda]
 *
 * Se consulta en cualquier momento, como la auditoría de salud del Corpus: lee el estado
 * versionado de `src/lib/ingreso.ts`, le pide al receptor la única cifra que necesita y
 * escribe el informe en la terminal. **No exporta datos y no enciende nada.** Encender un
 * Modelo es un diff en `src/lib/ingreso.ts` que `git revert` apaga; esta orden informa la
 * decisión del editor, no la sustituye —y no podría: no escribe en ninguna parte.
 *
 * `--anotar` emite además las anotaciones de GitHub Actions que hacen visible un Umbral
 * cruzado en el flujo diario. Lo usa el paso de CI, que avisa y no puede fallar.
 *
 * **Sale con 0 pase lo que pase con el receptor**, esté sin desplegar, caído o contestando
 * cualquier cosa. El flujo que llama a esta orden es el mismo que despliega el sitio en
 * vivo, y un aviso capaz de tumbarlo ataría la reconstrucción diaria a que conteste un plano
 * que el sitio nunca lee (AD-14). Lo único que sale distinto de cero es una invocación mal
 * escrita, que no es un problema del receptor sino de quien teclea.
 */

import { MODELOS } from '../src/lib/ingreso.ts';
import {
  MILISEGUNDOS_DE_ESPERA,
  anotaciones,
  estadosDe,
  interpretarLectura,
  lineasDelInforme,
  receptorDe,
  receptorQueNoContesta,
  type Medida,
} from './lib/ingresos.ts';
import { motivosDeArgumentosNoReconocidos } from './lib/cli.ts';

const USO = [
  'Uso: npx tsx tools/ingreso.ts [--json] [--anotar] [--ayuda]',
  '',
  '  --json     el informe como datos, para encadenarlo.',
  '  --anotar   además, anotaciones ::warning:: de GitHub Actions por Umbral cruzado.',
  '  --ayuda    esto.',
  '',
].join('\n');

const argumentos = process.argv.slice(2);

/*
 * Una tubería que se cierra antes de tiempo —`npm run ingreso | head`— manda EPIPE, y sin
 * esto el mando muere con código distinto de cero por haber sido leído a medias. Quien lo
 * llama en el flujo diario es un paso que no puede fallar, y quien lo llama en la terminal
 * suele mirar solo las primeras líneas.
 */
for (const salida of [process.stdout, process.stderr]) {
  salida.on('error', (fallo: NodeJS.ErrnoException) => {
    if (fallo.code !== 'EPIPE') throw fallo;
  });
}

// Antes de juzgar los argumentos: pedir ayuda no es equivocarse. Sin esto, el único modo de
// ver el uso era escribir algo mal, y salía con código 2.
if (argumentos.includes('--ayuda')) {
  process.stdout.write(USO);
  process.exit(0);
}

const noReconocidos = motivosDeArgumentosNoReconocidos(argumentos, {
  solas: ['--json', '--anotar', '--ayuda'],
  conValor: [],
});
if (noReconocidos.length > 0) {
  process.stderr.write(`${noReconocidos.join('\n')}\n\n${USO}`);
  process.exit(2);
}

/**
 * La única petición de red de esta orden, y vive en la cáscara exterior — AD-22.
 *
 * Aquí y no en `tools/lib/ingresos.ts` por lo mismo que `tools/recuperar.ts` y no
 * `tools/lib/documento.ts`: la red se queda en la orden, y lo que hay que poder probar sin
 * levantar un servidor —cómo degrada cada respuesta posible— se queda en el módulo. Es la
 * tercera excepción del barrido de `tests/unit/andamiaje.test.ts`, escrita y con nombre.
 *
 * No hay reintento: si el receptor no contesta a la primera, la respuesta correcta es decirlo
 * y seguir. Quien llama es el flujo que despliega el sitio en vivo.
 */
async function pedirLectura(url: string): Promise<Medida> {
  try {
    const respuesta = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(MILISEGUNDOS_DE_ESPERA),
    });
    return interpretarLectura(
      respuesta.status,
      respuesta.headers.get('content-type'),
      await respuesta.text(),
    );
  } catch (fallo) {
    return receptorQueNoContesta(fallo, url);
  }
}

const receptor = receptorDe(process.env);
const medida: Medida = typeof receptor === 'string' ? await pedirLectura(receptor) : receptor;

const estados = estadosDe(medida, MODELOS);

if (argumentos.includes('--json')) {
  process.stdout.write(
    `${JSON.stringify(
      {
        medida,
        modelos: estados.map((estado) => ({
          id: estado.modelo.id,
          nombre: estado.modelo.nombre,
          encendido: estado.modelo.encendido,
          dispara: estado.modelo.dispara,
          umbral: estado.modelo.umbral,
          admitidoEn: estado.modelo.admitidoEn,
          cifra: estado.cifra,
          cruzado: estado.cruzado,
          accion: estado.accion,
          ...(estado.aviso === undefined ? {} : { aviso: estado.aviso }),
        })),
      },
      null,
      2,
    )}\n`,
  );
} else {
  process.stdout.write(`${lineasDelInforme(estados).join('\n')}\n`);
}

if (argumentos.includes('--anotar')) {
  // Por la salida de error: las anotaciones son para el registro del flujo, y mezclarlas
  // con el informe rompería el `--json` de quien encadene esta orden.
  for (const anotacion of anotaciones(estados)) process.stderr.write(`${anotacion}\n`);
}

/*
 * Se termina dejando el código, y no con `process.exit(0)`.
 *
 * Con la salida por una tubería —que es como la llama el paso de CI, y como la llaman sus
 * pruebas— `process.stdout.write` es asíncrono, y `process.exit` corta el proceso con lo que
 * quede por vaciar todavía dentro. El informe cabe hoy de sobra en el búfer de la tubería,
 * pero «hoy cabe» no es una garantía que merezca la pena tener en el sitio donde se lee si un
 * Umbral se cruzó.
 *
 * Los dos `process.exit` de arriba corren el mismo riesgo y se quedan, con el matiz escrito
 * aquí: son la convención de la casa para el rechazo —lo hacen las nueve órdenes de `tools/`—
 * y escriben una línea de uso por la salida de error, no un informe. Lo que se protege con
 * cuidado es la salida que alguien lee para decidir si enciende algo.
 */
process.exitCode = 0;
