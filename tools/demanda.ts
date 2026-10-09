/**
 * La demanda medida, por Autor, por Cita y por familia — Historia 20.3, Épica 20, FR-49.
 *
 *   npx tsx tools/demanda.ts [--corpus corpus] [--json]
 *   npx tsx tools/demanda.ts --registrar [--rellenar]
 *
 * Hermana de `tools/trafico.ts`, con la misma separación: sin banderas **consulta** —lee,
 * agrega e informa, y no escribe nada—; con `--registrar` anota además las ventanas leídas en
 * `corpus/serie-de-demanda.yml`, reemplazando la entrada que ya hubiera de cada ventana.
 *
 * Es la cáscara (AD-22): las peticiones de la demanda salen solo de aquí, por el cliente de
 * Search Analytics que ya construye `tools/trafico.ts` —se reutiliza, no se copia— y que
 * llega a `principal` como parámetro para que las pruebas lo sustituyan por respuestas fijas.
 * Qué ventanas se piden y cómo se agrega es de `tools/lib/demanda.ts`, que es puro. Y ningún
 * módulo de `src/` recibe la serie (AD-24).
 *
 * El orden de los pasos de `principal`, que es parte del contrato:
 *
 *   1. la forma de la invocación —banderas desconocidas— (código 2);
 *   2. `--ayuda`;
 *   3. la credencial, antes de leer el corpus y antes de escribir nada (código 2);
 *   4. el corpus —censo por familia y slugs de Autor— y, aparte, la serie ya registrada, de
 *      la que sale si esta es la primera lectura y qué meses faltan para `--rellenar`
 *      (código 1 si no se puede leer cualquiera de los dos);
 *   5. el cliente (una credencial mal formada es código 1);
 *   6. la lectura, ventana a ventana, por página y paginando;
 *   7. si no se leyó ninguna ventana, código 1 y nada escrito;
 *   8. consulta: se informa y se sale con 0; registro: se escribe y se informa.
 */

import { DOMINIO } from '../src/lib/dominio.ts';
import type { ConjuntoPublicable } from '../src/lib/publicado.ts';
import {
  SALIDA_SIN_CREDENCIALES,
  censoPorFamilia,
  credencialDe,
  motivoDeFallo,
  propiedadDeDominio,
  type Credencial,
} from './lib/indexacion.ts';
import { jornadaLocal } from './lib/trafico.ts';
import {
  MOTIVOS_SIN_CREDENCIALES_DE_DEMANDA,
  agregarDemanda,
  claveDeVentana,
  componerLecturaDeDemanda,
  lineasDeDemanda,
  ventanasALeer,
  type LecturaDeDemanda,
  type LecturaDeVentana,
  type VentanaSinLeer,
} from './lib/demanda.ts';
import { leerSerieDeDemanda, registrarLecturaDeDemanda, rutasDelCorpus } from './lib/corpus.ts';
import { motivosDeArgumentosNoReconocidos, raizDeCorpusDe } from './lib/cli.ts';
import { conjuntoDelCorpus } from './indexacion.ts';
import { clienteDeSearchAnalytics, filasPorPagina, type Consultar } from './trafico.ts';

const USO = [
  'La demanda medida por página — Historia 20.3.',
  '',
  '  npx tsx tools/demanda.ts [--corpus corpus] [--json]',
  '      Lee de Search Console las impresiones y los clics por página de la ventana de 28',
  '      días —y, en la primera lectura, de los meses cerrados que conserva la fuente—, y',
  '      los informa por Autor, por Cita y por familia. No escribe nada.',
  '',
  '  npx tsx tools/demanda.ts --registrar',
  '      Anota además las ventanas leídas en corpus/serie-de-demanda.yml, reemplazando la',
  '      entrada que ya hubiera de cada ventana.',
  '',
  '  npx tsx tools/demanda.ts --rellenar [--registrar]',
  '      Pide además los meses cerrados de los 16 que falten en la serie: la vuelta atrás de',
  '      un mes que falló, y la única forma de que la serie mensual crezca tras la primera.',
  '',
  'Opciones: --corpus <ruta>, --json, --registrar, --rellenar, --ayuda',
].join('\n');

/**
 * La lectura entera: ventanas, peticiones y agregación. **No escribe nada.**
 *
 * Una ventana cuya consulta falla, o cuyo reparto no se puede componer, va a `sinLeer` con su
 * motivo y no se escribe —ausencia antes que cero—, y las demás siguen. Una ventana que llega
 * **sin ninguna fila** sí es una lectura: toda ventana que se pide ya salió del retardo de los
 * datos definitivos, así que se escribe con `vacia: true` — «sin demanda», no «sin leer».
 */
export async function leerDemanda(opciones: {
  conjunto: ConjuntoPublicable;
  propiedad: string;
  /** El host canónico: una página de otro host no es de ningún Autor ni de ninguna familia. */
  dominio: string;
  consultar: Consultar;
  /** La serie no tiene ninguna entrada `mes`: se piden también los meses cerrados. */
  primeraLectura: boolean;
  /** `--rellenar`: se piden los meses cerrados que falten en la serie. */
  rellenar?: boolean;
  /** Las claves `desde`–`hasta` ya registradas en la serie. */
  registradas?: ReadonlySet<string>;
  /** El instante de la lectura. Por omisión, ahora. */
  momento?: Date;
}): Promise<LecturaDeDemanda> {
  const momento = opciones.momento ?? new Date();
  const censo = censoPorFamilia(opciones.conjunto);
  const slugsDeAutores = opciones.conjunto.autores.map((a) => a.slug);
  const ventanas: LecturaDeVentana[] = [];
  const sinLeer: VentanaSinLeer[] = [];

  const pedidas = ventanasALeer(momento, opciones.primeraLectura, {
    rellenar: opciones.rellenar,
    registradas: opciones.registradas,
  });
  for (const ventana of pedidas) {
    let filas;
    try {
      filas = await filasPorPagina(opciones.consultar, ventana);
    } catch (error) {
      sinLeer.push({ ...ventana, motivo: motivoDeFallo(error) });
      continue;
    }
    try {
      ventanas.push(
        componerLecturaDeDemanda({
          ventana,
          momento,
          propiedad: opciones.propiedad,
          agregado: agregarDemanda(filas, { slugsDeAutores, censo, dominio: opciones.dominio }),
          vacia: filas.length === 0,
        }),
      );
    } catch (error) {
      sinLeer.push({
        ...ventana,
        motivo: `el reparto no se pudo componer: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return {
    propiedad: opciones.propiedad,
    leidoEl: jornadaLocal(momento),
    primeraLectura: opciones.primeraLectura,
    ...(opciones.rellenar === true ? { rellenar: true } : {}),
    ventanas,
    sinLeer,
  };
}

/**
 * La orden. Devuelve el código de salida en vez de terminar el proceso, para que las
 * pruebas la recorran entera. `hacerConsulta` existe solo para sustituir la red.
 */
export async function principal(
  argumentos: string[],
  hacerConsulta: (credencial: Credencial, propiedad: string) => Promise<Consultar> =
    clienteDeSearchAnalytics,
  entorno: Record<string, string | undefined> = process.env,
  momento: Date = new Date(),
): Promise<number> {
  // 1 — la forma de la invocación. Aquí es código 2: es la forma, no lo que dice.
  const sobrantes = motivosDeArgumentosNoReconocidos(argumentos, {
    solas: ['--json', '--registrar', '--rellenar', '--ayuda'],
    conValor: ['--corpus'],
  });
  if (sobrantes.length > 0) {
    process.stderr.write(`${[...sobrantes, '', USO].join('\n')}\n`);
    return 2;
  }

  // 2 — la ayuda.
  if (argumentos.includes('--ayuda')) {
    process.stdout.write(`${USO}\n`);
    return 0;
  }

  const quiereJson = argumentos.includes('--json');
  const registra = argumentos.includes('--registrar');
  const rellenar = argumentos.includes('--rellenar');
  const propiedad = propiedadDeDominio(DOMINIO);

  // 3 — la credencial, antes de leer el corpus y antes de escribir nada.
  const credencial = credencialDe(entorno);
  if (credencial === undefined) {
    process.stderr.write(`${MOTIVOS_SIN_CREDENCIALES_DE_DEMANDA.join('\n')}\n`);
    return SALIDA_SIN_CREDENCIALES;
  }

  // 4 — el corpus y la serie ya registrada.
  const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));
  let conjunto: ConjuntoPublicable;
  try {
    conjunto = await conjuntoDelCorpus(rutas);
  } catch (fallo) {
    process.stderr.write(
      `No se pudo leer el corpus: ${fallo instanceof Error ? fallo.message : String(fallo)}\n` +
        'No se ha escrito nada.\n',
    );
    return 1;
  }
  let primeraLectura: boolean;
  let registradas: Set<string>;
  try {
    const serie = await leerSerieDeDemanda(rutas);
    primeraLectura = !serie.some((e) => e.clase === 'mes');
    registradas = new Set(serie.map(claveDeVentana));
  } catch (fallo) {
    process.stderr.write(
      `No se pudo leer la serie: ${fallo instanceof Error ? fallo.message : String(fallo)}\n` +
        'No se ha escrito nada.\n',
    );
    return 1;
  }

  // 5 — el cliente.
  let consultar: Consultar;
  try {
    consultar = await hacerConsulta(credencial, propiedad);
  } catch (fallo) {
    process.stderr.write(
      `${fallo instanceof Error ? fallo.message : String(fallo)}\nNo se ha escrito nada.\n`,
    );
    return 1;
  }

  // 6 — la lectura.
  let lectura: LecturaDeDemanda;
  try {
    lectura = await leerDemanda({
      conjunto,
      propiedad,
      dominio: DOMINIO,
      consultar,
      primeraLectura,
      rellenar,
      registradas,
      momento,
    });
  } catch (fallo) {
    process.stderr.write(
      `La lectura no se pudo componer: ${fallo instanceof Error ? fallo.message : String(fallo)}\n` +
        'No se ha escrito nada.\n',
    );
    return 1;
  }

  // 7 — nada legible: nada escrito.
  if (lectura.ventanas.length === 0) {
    process.stderr.write(
      `${[
        ...lineasDeDemanda(lectura),
        '',
        'No se pudo leer ninguna ventana. No se ha escrito nada.',
      ].join('\n')}\n`,
    );
    return 1;
  }

  // 8 — consulta o registro.
  if (!registra) {
    process.stdout.write(
      quiereJson
        ? `${JSON.stringify({ lectura: lectura }, null, 2)}\n`
        : `${[
            ...lineasDeDemanda(lectura),
            '',
            'Consulta: no se ha escrito nada.',
            'Para anotar las ventanas leídas en la serie: npm run demanda:registrar',
          ].join('\n')}\n`,
    );
    return 0;
  }

  let ruta: string;
  try {
    ruta = await registrarLecturaDeDemanda(rutas, lectura);
  } catch (fallo) {
    process.stderr.write(`${fallo instanceof Error ? fallo.message : String(fallo)}\n`);
    return 1;
  }

  process.stdout.write(
    quiereJson
      ? `${JSON.stringify({ lectura: lectura, registro: ruta }, null, 2)}\n`
      : `${[
          ...lineasDeDemanda(lectura),
          '',
          `Registrado en ${ruta}`,
          'Cada ventana leída reemplaza a su entrada anterior; las ventanas sin leer conservan la suya.',
        ].join('\n')}\n`,
  );
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await principal(process.argv.slice(2));
}
