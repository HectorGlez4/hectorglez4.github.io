import { afterEach, describe, expect, it, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { parse as parsearYaml } from 'yaml';
import {
  rutasPublicadas,
  type Cita,
  type ConjuntoPublicable,
} from '../../src/lib/publicado.ts';
import { MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';
import {
  CABECERA_DE_INDEXACION,
  FICHERO_DE_INDEXACION,
  fechaLocal,
  leerSerieDeIndexacion,
  registrarLecturaDeIndexacion,
  rutasDelCorpus,
} from '../../tools/lib/corpus.ts';
import {
  ESTADO_SIN_DECLARAR,
  FAMILIAS,
  MUESTRA_MINIMA_POR_FAMILIA,
  SALIDA_SIN_CREDENCIALES,
  TECHO_DIARIO_DE_INSPECCIONES,
  TOPE_DE_MOTIVO,
  VARIABLE_DE_CREDENCIALES,
  censoPorFamilia,
  claseDeFallo,
  componerLectura,
  credencialDe,
  esIndexada,
  inspeccionDe,
  motivoDeFallo,
  muestraDe,
  peticionDeInspeccion,
  planDeInspeccion,
  propiedadDeDominio,
  resumirFamilia,
  type Familia,
  type Inspeccion,
} from '../../tools/lib/indexacion.ts';
import { DOMINIO } from '../../src/lib/dominio.ts';
import { aYaml } from '../../tools/lib/corpus.ts';
import {
  inspectorDeSearchConsole,
  leerIndexacion,
  principal,
  type Inspeccionar,
} from '../../tools/indexacion.ts';

const ejecutar = promisify(execFile);
const RAIZ = resolve(import.meta.dirname, '../..');

/**
 * Historia 16.1 — el instrumento de la Épica 16, entero y sin red.
 *
 * La matriz de la historia son seis situaciones y las seis se recorren aquí: lectura
 * completa, muestreo por cuota insuficiente, fallo parcial de una familia, segunda lectura
 * de la misma jornada, ausencia de credenciales y consulta que no registra. Ninguna sale a
 * la red: la red entra por un solo sitio —el inspector que `principal` recibe— y eso es
 * exactamente lo que AD-22 manda que ocurra.
 *
 * Lo que atraviesa todas: **una familia que no se leyó se omite y jamás se escribe como
 * cero**. El cero real es casi el estado de partida —8 URL indexadas de 1.715— y los dos
 * tienen que seguir siendo distinguibles.
 */

const temporales: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  const { rm } = await import('node:fs/promises');
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

// ─── Datos de prueba ─────────────────────────────────────────────────────────────────

function citasDe(cuantas: number, tema: string, desde = 0): Cita[] {
  return Array.from({ length: cuantas }, (_, i) => ({
    slug: `${tema}-${desde + i}`,
    texto: `Texto de prueba número ${desde + i}.`,
    autor: `autor-${(desde + i) % 3}`,
    temas: [tema],
    procedencia: {},
    aptaParaPortada: true,
  })) as unknown as Cita[];
}

function conjuntoDe(cuantasCitas: number): ConjuntoPublicable {
  const citas = citasDe(cuantasCitas, 'la-vida');
  return {
    citas,
    autores: Array.from({ length: 3 }, (_, i) => ({
      slug: `autor-${i}`,
      nombre: `Autor ${i}`,
      semblanza: 'Semblanza.',
      añoFallecimiento: 65,
    })),
    temas: [{ slug: 'la-vida', nombre: 'La vida' }],
    colecciones: [],
  };
}

// ─── El censo: derivado del dueño único, no escrito ──────────────────────────────────

describe('el censo por familia', () => {
  it('reparte exactamente lo que el conjunto publicable publica, sin la portada', () => {
    const conjunto = conjuntoDe(MIN_CITAS_POR_TEMA);
    const censo = censoPorFamilia(conjunto);

    const delCenso = FAMILIAS.flatMap((f) => [...censo[f]]).sort();
    /*
     * La comparación con `rutasPublicadas` es la puerta de AD-11: si mañana se añade una
     * quinta familia al dueño del conjunto publicable y nadie la añade al censo, esta
     * afirmación cae en vez de dejar que la familia desaparezca de la serie en silencio.
     */
    const publicadas = rutasPublicadas(conjunto)
      .filter((r) => r !== '/')
      .sort();

    expect(delCenso).toEqual(publicadas);
    // La portada no es de ninguna familia y se queda fuera a propósito: es una URL suelta
    // y lo que esta serie compara es el reparto por familia.
    expect(delCenso).not.toContain('/');
  });

  it('compone las rutas con barra final, que es la forma canónica que el sitio anuncia', () => {
    const censo = censoPorFamilia(conjuntoDe(MIN_CITAS_POR_TEMA));
    for (const familia of FAMILIAS) {
      for (const ruta of censo[familia]) expect(ruta.endsWith('/')).toBe(true);
    }
  });

  it('un Tema por debajo del umbral no entra: el umbral tiene un solo dueño', () => {
    const censo = censoPorFamilia(conjuntoDe(MIN_CITAS_POR_TEMA - 1));
    expect(censo.tema).toEqual([]);
    expect(censo.cita).toHaveLength(MIN_CITAS_POR_TEMA - 1);
  });
});

// ─── El plan: el eje del diseño ──────────────────────────────────────────────────────

/** Un censo hecho a mano, para poder mover los tamaños sin fabricar un corpus. */
function censoDe(tamaños: Partial<Record<Familia, number>>) {
  const censo = { cita: [], autor: [], tema: [], coleccion: [] } as Record<Familia, string[]>;
  for (const familia of FAMILIAS) {
    censo[familia] = Array.from(
      { length: tamaños[familia] ?? 0 },
      (_, i) => `/${familia}/${String(i).padStart(5, '0')}/`,
    );
  }
  return censo;
}

describe('el plan de inspección', () => {
  it('lectura completa: con el corpus por debajo del techo se inspecciona todo', () => {
    // El estado de hoy: ~1.716 URL contra un techo de 2.000. Cabe una pasada y no dos.
    const censo = censoDe({ cita: 1639, autor: 35, tema: 24, coleccion: 16 });
    const plan = planDeInspeccion(censo, TECHO_DIARIO_DE_INSPECCIONES);

    expect(plan.publicadas).toBe(1714);
    expect(plan.inspecciones).toBe(1714);
    expect(plan.sinPresupuesto).toEqual([]);
    for (const familia of plan.familias) {
      expect(familia.muestreada).toBe(false);
      expect(familia.rutas).toHaveLength(familia.publicadas);
    }
  });

  it('cuota insuficiente: muestrea por familia y gasta el presupuesto entero', () => {
    const censo = censoDe({ cita: 12000, autor: 400, tema: 120, coleccion: 40 });
    const plan = planDeInspeccion(censo, TECHO_DIARIO_DE_INSPECCIONES);

    expect(plan.publicadas).toBe(12560);
    expect(plan.inspecciones).toBe(TECHO_DIARIO_DE_INSPECCIONES);
    expect(plan.sinPresupuesto).toEqual([]);
    for (const familia of plan.familias) expect(familia.muestreada).toBe(true);
  });

  it('el suelo protege a las agregaciones: ninguna se queda con una muestra ilegible', () => {
    /*
     * Un reparto solo proporcional dejaría a Colección —40 URL frente a 12.000 de Cita— con
     * seis peticiones, y su porcentaje se movería veinte puntos por una sola URL. Las
     * agregaciones son la mitad de la comparación que esta épica existe para poder hacer.
     */
    const censo = censoDe({ cita: 12000, autor: 400, tema: 120, coleccion: 40 });
    const plan = planDeInspeccion(censo, TECHO_DIARIO_DE_INSPECCIONES);

    for (const familia of plan.familias) {
      expect(familia.rutas.length).toBeGreaterThanOrEqual(
        Math.min(familia.publicadas, MUESTRA_MINIMA_POR_FAMILIA),
      );
    }
    // Y aun así la mayor parte del presupuesto va donde está el volumen.
    const cita = plan.familias.find((f) => f.familia === 'cita');
    expect(cita?.rutas.length).toBeGreaterThan(TECHO_DIARIO_DE_INSPECCIONES / 2);
  });

  it('es determinista: el mismo censo y el mismo presupuesto dan las mismas URL', () => {
    const censo = censoDe({ cita: 900, autor: 40, tema: 30, coleccion: 20 });
    expect(planDeInspeccion(censo, 300)).toEqual(planDeInspeccion(censo, 300));
  });

  it('una familia sin nada publicado no aparece: ni leída ni fallida', () => {
    const plan = planDeInspeccion(censoDe({ cita: 30, autor: 5 }), 100);
    expect(plan.familias.map((f) => f.familia)).toEqual(['cita', 'autor']);
    expect(plan.sinPresupuesto).toEqual([]);
  });

  it('un presupuesto que no llega a una familia la declara sin presupuesto, no en cero', () => {
    const plan = planDeInspeccion(censoDe({ cita: 900, autor: 40, tema: 30, coleccion: 20 }), 25);
    const alcanzadas = plan.familias.map((f) => f.familia);
    expect([...alcanzadas, ...plan.sinPresupuesto].sort()).toEqual(
      ['autor', 'cita', 'coleccion', 'tema'].sort(),
    );
    expect(plan.sinPresupuesto.length).toBeGreaterThan(0);
    expect(plan.inspecciones).toBeLessThanOrEqual(25);
  });

  it('un presupuesto ilegible se trata como cero, no como «todo»', () => {
    /*
     * `NaN` sobrevive a `Math.trunc` y a partir de ahí toda comparación es falsa: el relleno
     * de una en una no veía techo y devolvía cada familia entera. Un presupuesto ilegible
     * habría gastado la cuota del día completa creyendo obedecer.
     */
    for (const roto of [Number.NaN, Number.POSITIVE_INFINITY, -5]) {
      const plan = planDeInspeccion(censoDe({ cita: 900, autor: 40 }), roto);
      expect(plan.inspecciones).toBe(0);
      expect(plan.familias).toEqual([]);
      expect([...plan.sinPresupuesto].sort()).toEqual(['autor', 'cita']);
      // Y el plan declara el número con el que de verdad trabajó, no el que le dieron.
      expect(plan.presupuesto).toBe(0);
    }
  });

  it('nunca pasa del presupuesto', () => {
    for (const presupuesto of [1, 7, 19, 21, 99, 1000]) {
      const plan = planDeInspeccion(censoDe({ cita: 900, autor: 40, tema: 30, coleccion: 20 }), presupuesto);
      expect(plan.inspecciones).toBeLessThanOrEqual(presupuesto);
    }
  });
});

describe('la muestra', () => {
  const rutas = Array.from({ length: 100 }, (_, i) => `/cita/${String(i).padStart(3, '0')}/`);

  it('no repite y tiene el tamaño pedido', () => {
    const muestra = muestraDe(rutas, 17);
    expect(muestra).toHaveLength(17);
    expect(new Set(muestra).size).toBe(17);
  });

  it('se reparte por toda la lista, no se queda en la letra A', () => {
    const muestra = muestraDe(rutas, 10);
    expect(muestra[0]).toBe(rutas[0]);
    expect(muestra.at(-1)).toBe(rutas.at(-1));
  });

  it('pedir más de lo que hay devuelve lo que hay', () => {
    expect(muestraDe(rutas, 500)).toHaveLength(100);
  });
});

// ─── Lo que cuenta como indexada ─────────────────────────────────────────────────────

describe('el veredicto', () => {
  it('solo PASS cuenta como indexada', () => {
    expect(esIndexada('PASS')).toBe(true);
    for (const otro of ['FAIL', 'NEUTRAL', 'PARTIAL', 'VERDICT_UNSPECIFIED', '', null, undefined]) {
      expect(esIndexada(otro)).toBe(false);
    }
  });

  it('el resumen escribe el tamaño de muestra aunque no haya habido muestreo', () => {
    const inspecciones: Inspeccion[] = [
      { ruta: '/cita/a/', veredicto: 'PASS', estado: 'Submitted and indexed' },
      { ruta: '/cita/b/', veredicto: 'FAIL', estado: 'Discovered - currently not indexed' },
    ];
    expect(resumirFamilia(2, inspecciones)).toEqual({
      publicadas: 2,
      muestra: 2,
      indexadas: 1,
      noIndexadas: 1,
      estados: [
        { estado: 'Discovered - currently not indexed', urls: 1 },
        { estado: 'Submitted and indexed', urls: 1 },
      ],
    });
  });

  it('el reparto por estado responde a por qué, no solo a cuántas', () => {
    /*
     * Es la pregunta con la que abre la épica. «Detectada, actualmente no indexada» es
     * descubierta y nunca visitada; «Rastreada, actualmente no indexada» es visitada y
     * descartada. Las dos suman al mismo `noIndexadas` y piden remedios distintos.
     */
    const inspecciones: Inspeccion[] = [
      { ruta: '/cita/a/', veredicto: 'FAIL', estado: 'Discovered - currently not indexed' },
      { ruta: '/cita/b/', veredicto: 'FAIL', estado: 'Discovered - currently not indexed' },
      { ruta: '/cita/c/', veredicto: 'FAIL', estado: 'Crawled - currently not indexed' },
    ];
    const resumen = resumirFamilia(3, inspecciones);
    expect(resumen.noIndexadas).toBe(3);
    // Ordenado por volumen: dos lecturas de la misma muestra dan el mismo fichero.
    expect(resumen.estados).toEqual([
      { estado: 'Discovered - currently not indexed', urls: 2 },
      { estado: 'Crawled - currently not indexed', urls: 1 },
    ]);
  });
});

// ─── La petición y la lectura de la respuesta: el código que nadie fingido ejecuta ───

describe('la petición a la fuente', () => {
  it('pregunta por la forma canónica, con su barra final y sobre el dominio real', () => {
    /*
     * Es lo único que puede equivocarse en silencio y arruinarlo todo: sin barra final la
     * fuente contesta «desconocida para Google» a todas, la serie escribe cero en todas las
     * familias y ese cero es indistinguible del cero real de hoy.
     */
    const peticion = peticionDeInspeccion(DOMINIO, '/cita/la-vida-0/');
    expect(peticion.inspectionUrl).toBe(`https://${DOMINIO}/cita/la-vida-0/`);
    expect(peticion.inspectionUrl.endsWith('/')).toBe(true);
  });

  it('la propiedad es la de dominio, no la dirección del sitio', () => {
    // `siteUrl` con `https://…` sería una propiedad de prefijo de URL, que no es la que se
    // dio de alta: la API contestaría que no existe, para todas.
    expect(peticionDeInspeccion(DOMINIO, '/').siteUrl).toBe(`sc-domain:${DOMINIO}`);
    expect(peticionDeInspeccion(DOMINIO, '/').siteUrl).not.toContain('https://');
  });

  it('toda ruta del censo real compone una petición válida', () => {
    const censo = censoPorFamilia(conjuntoDe(MIN_CITAS_POR_TEMA));
    for (const familia of FAMILIAS) {
      for (const ruta of censo[familia]) {
        const peticion = peticionDeInspeccion(DOMINIO, ruta);
        expect(peticion.inspectionUrl).toBe(`https://${DOMINIO}${ruta}`);
        expect(peticion.siteUrl).toBe(`sc-domain:${DOMINIO}`);
      }
    }
  });

  it('se niega a preguntar por una ruta sin barra final en vez de medir mal', () => {
    expect(() => peticionDeInspeccion(DOMINIO, '/cita/la-vida-0')).toThrow(/barra final/);
    expect(() => peticionDeInspeccion(DOMINIO, 'cita/la-vida-0/')).toThrow(/ruta canónica/);
  });
});

describe('la lectura de la respuesta', () => {
  it('el veredicto sale de indexStatusResult, y el estado de cobertura con él', () => {
    expect(
      inspeccionDe('/cita/a/', {
        inspectionResult: {
          indexStatusResult: { verdict: 'PASS', coverageState: 'Submitted and indexed' },
        },
      }),
    ).toEqual({ ruta: '/cita/a/', veredicto: 'PASS', estado: 'Submitted and indexed' });
  });

  it('una respuesta sin veredicto se rompe: no se cuenta como no indexada', () => {
    /*
     * Contarla como no indexada sería fabricar un cero. Si el sub-objeto cambiara de sitio,
     * o la petición fuera mal compuesta, toda la entrada saldría en ceros con cara de
     * lectura buena — y esos ceros son casi el estado real, así que nadie lo vería.
     */
    for (const respuesta of [
      {},
      { inspectionResult: {} },
      { inspectionResult: { indexStatusResult: {} } },
      { inspectionResult: { indexStatusResult: { verdict: '' } } },
      { inspectionResult: { indexStatusResult: null } },
    ]) {
      expect(() => inspeccionDe('/cita/a/', respuesta)).toThrow(/veredicto/);
    }
  });

  it('un estado de cobertura ausente se nombra, porque no falsea ninguna cifra', () => {
    const inspeccion = inspeccionDe('/cita/a/', {
      inspectionResult: { indexStatusResult: { verdict: 'FAIL' } },
    });
    expect(inspeccion.estado).toBe(ESTADO_SIN_DECLARAR);
  });
});

describe('el motivo de un fallo, que se versiona para siempre', () => {
  it('normaliza a tres clases para que dos jornadas se puedan comparar', () => {
    expect(claseDeFallo(Object.assign(new Error('x'), { status: 429 }))).toBe('cuota');
    expect(claseDeFallo(Object.assign(new Error('x'), { code: 403 }))).toBe('permiso');
    expect(claseDeFallo(Object.assign(new Error('x'), { response: { status: 401 } }))).toBe('permiso');
    expect(claseDeFallo(new Error('Quota exceeded (429) for quota metric'))).toBe('cuota');
    expect(claseDeFallo(new Error('socket hang up'))).toBe('otro');
  });

  it('el mismo 429 se escribe siempre igual, venga como venga', () => {
    const porCodigo = motivoDeFallo(Object.assign(new Error('lo que sea'), { status: 429 }));
    const porTexto = motivoDeFallo(new Error('Quota exceeded (429) for quota metric'));
    expect(porCodigo).toBe(porTexto);
    expect(porCodigo).toMatch(/429/);
  });

  it('no arrastra direcciones a git, y tiene tope', () => {
    // El precedente es `sanearMensajeDeRed`: su salida acaba en un registro, y esta acaba
    // en el repositorio para siempre.
    const conUrl = motivoDeFallo(
      new Error('request to https://searchconsole.googleapis.com/v1/x?key=SECRETO failed'),
    );
    expect(conUrl).not.toContain('SECRETO');
    expect(conUrl).not.toContain('https://');

    const larguisimo = motivoDeFallo(new Error('a'.repeat(5000)));
    expect(larguisimo.length).toBeLessThanOrEqual(TOPE_DE_MOTIVO + 40);
  });
});

// ─── La puerta de «ausencia antes que cero» ──────────────────────────────────────────

describe('componer la entrada', () => {
  const censo = censoDe({ cita: 30, autor: 5, tema: 2, coleccion: 0 });

  it('una familia sin leer se omite de «familias» y sale en «sinLeer» con su motivo', () => {
    const lectura = componerLectura({
      propiedad: 'sc-domain:ejemplo.test',
      censo,
      lecturas: {
        cita: { publicadas: 30, muestra: 30, indexadas: 2, noIndexadas: 28, estados: [] },
        autor: { publicadas: 5, muestra: 5, indexadas: 5, noIndexadas: 0, estados: [] },
      },
      sinLeer: [{ familia: 'tema', motivo: 'cuota agotada' }],
    });

    expect(lectura.familias.tema).toBeUndefined();
    expect(lectura.sinLeer.tema).toBe('cuota agotada');
    // Y lo que importa de verdad: no hay ningún cero fabricado en su sitio.
    expect(Object.keys(lectura.familias).sort()).toEqual(['autor', 'cita']);
    expect(lectura.publicadas).toBe(37);
    expect(lectura.inspeccionadas).toBe(35);
  });

  it('una familia sin URL publicadas no aparece en ninguna de las dos listas', () => {
    const lectura = componerLectura({
      propiedad: 'sc-domain:ejemplo.test',
      censo,
      lecturas: {
        cita: { publicadas: 30, muestra: 30, indexadas: 0, noIndexadas: 30, estados: [] },
        autor: { publicadas: 5, muestra: 5, indexadas: 0, noIndexadas: 5, estados: [] },
        tema: { publicadas: 2, muestra: 2, indexadas: 0, noIndexadas: 2, estados: [] },
      },
      sinLeer: [],
    });
    expect(lectura.familias.coleccion).toBeUndefined();
    expect(lectura.sinLeer.coleccion).toBeUndefined();
  });

  it('se niega si una familia publicada no llega ni leída ni con motivo', () => {
    expect(() =>
      componerLectura({
        propiedad: 'sc-domain:ejemplo.test',
        censo,
        lecturas: { cita: { publicadas: 30, muestra: 30, indexadas: 0, noIndexadas: 30, estados: [] } },
        sinLeer: [],
      }),
    ).toThrow(/ni leída ni con un motivo/);
  });

  it('se niega si el motivo de una familia sin leer viene en blanco', () => {
    /*
     * `aYaml` omite las cadenas vacías, así que un motivo en blanco haría desaparecer a la
     * familia también de `sinLeer`: acabaría en ninguna de las dos listas, que es justo el
     * estado que esta función existe para prohibir, colado por el serializador.
     */
    expect(() =>
      componerLectura({
        propiedad: 'sc-domain:ejemplo.test',
        censo,
        lecturas: {
          cita: { publicadas: 30, muestra: 30, indexadas: 0, noIndexadas: 30, estados: [] },
          autor: { publicadas: 5, muestra: 5, indexadas: 0, noIndexadas: 5, estados: [] },
        },
        sinLeer: [{ familia: 'tema', motivo: '   ' }],
      }),
    ).toThrow(/sin motivo/);
  });

  it('se niega si una familia llega a la vez leída y sin leer', () => {
    expect(() =>
      componerLectura({
        propiedad: 'sc-domain:ejemplo.test',
        censo,
        lecturas: { cita: { publicadas: 30, muestra: 30, indexadas: 0, noIndexadas: 30, estados: [] } },
        sinLeer: [{ familia: 'cita', motivo: 'cuota agotada' }],
      }),
    ).toThrow(/a la vez leída y sin leer/);
  });
});

// ─── La propiedad y la credencial ────────────────────────────────────────────────────

describe('la propiedad y la credencial', () => {
  it('la propiedad se deriva del dominio, como propiedad de dominio y no de prefijo', () => {
    expect(propiedadDeDominio('ejemplo.test')).toBe('sc-domain:ejemplo.test');
  });

  it('el JSON en línea y la ruta de fichero se distinguen por la primera llave', () => {
    expect(credencialDe({ [VARIABLE_DE_CREDENCIALES]: '{"type":"service_account"}' })).toEqual({
      clase: 'json',
      contenido: '{"type":"service_account"}',
    });
    expect(credencialDe({ [VARIABLE_DE_CREDENCIALES]: '/casa/clave.json' })).toEqual({
      clase: 'fichero',
      ruta: '/casa/clave.json',
    });
  });

  it('una variable sin definir y una en blanco son lo mismo: no hay credencial', () => {
    expect(credencialDe({})).toBeUndefined();
    expect(credencialDe({ [VARIABLE_DE_CREDENCIALES]: '   ' })).toBeUndefined();
  });
});

// ─── El escritor de la serie ─────────────────────────────────────────────────────────

async function corpusVacio(): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-indexacion-'));
  temporales.push(raiz);
  const corpus = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', 'colecciones']) {
    await mkdir(join(corpus, dir), { recursive: true });
  }
  return corpus;
}

/** Una lectura cualquiera, para no repetirla en cada caso del escritor. */
function lecturaDe(opciones: {
  momento?: Date;
  indexadas?: number;
  muestra?: number;
  sinLeer?: Partial<Record<Familia, string>>;
}) {
  const muestra = opciones.muestra ?? 30;
  return {
    ...(opciones.momento === undefined ? {} : { momento: opciones.momento }),
    propiedad: 'sc-domain:ejemplo.test',
    publicadas: 37,
    inspeccionadas: muestra,
    familias: {
      cita: {
        publicadas: 30,
        muestra,
        indexadas: opciones.indexadas ?? 2,
        noIndexadas: muestra - (opciones.indexadas ?? 2),
        estados: [
          { estado: 'Discovered - currently not indexed', urls: muestra - (opciones.indexadas ?? 2) },
          { estado: 'Submitted and indexed', urls: opciones.indexadas ?? 2 },
        ],
      },
    },
    sinLeer: opciones.sinLeer ?? { autor: 'cuota agotada', tema: 'espera vencida' },
  };
}

describe('la serie en corpus/', () => {
  it('crea el fichero con su cabecera cuando no existe, y la cabecera dice que reemplaza', async () => {
    const rutas = rutasDelCorpus(await corpusVacio());
    await registrarLecturaDeIndexacion(rutas, lecturaDe({}));

    const escrito = await readFile(rutas.serieDeIndexacion, 'utf8');
    expect(escrito.startsWith(CABECERA_DE_INDEXACION.split('\nlecturas:')[0])).toBe(true);
    expect(escrito).toMatch(/REEMPLAZA EN VEZ DE AÑADIR/);
    expect(escrito).toMatch(/AUSENCIA ANTES QUE CERO/);
  });

  it('el fichero versionado del repositorio es exactamente esa cabecera', () => {
    /*
     * La misma convención que fija `objetivo-cli.test.ts` para el registro de sesiones: si el
     * fichero del repositorio y la constante divergen, quien lee el repositorio y quien crea
     * uno nuevo en un corpus de pruebas aprenden reglas distintas de la misma serie.
     */
    const versionado = readFileSync(resolve(RAIZ, 'corpus', FICHERO_DE_INDEXACION), 'utf8');
    expect(versionado.startsWith(CABECERA_DE_INDEXACION)).toBe(true);
  });

  it('la cabecera declara lo que la distingue de la de sembrado, y sus invariantes', () => {
    // Una cabecera que no dice por qué reemplaza se toma por un registro acumulable, y la
    // primera segunda lectura del día parecerá haber perdido datos.
    expect(CABECERA_DE_INDEXACION).toMatch(/REEMPLAZA EN VEZ DE AÑADIR/);
    expect(CABECERA_DE_INDEXACION).toMatch(/AUSENCIA ANTES QUE CERO/);
    expect(CABECERA_DE_INDEXACION).toMatch(/16\.1/);
    expect(CABECERA_DE_INDEXACION).toMatch(/--registrar/);
    expect(CABECERA_DE_INDEXACION).toMatch(/CITA/);
  });

  it('es metadato del Corpus, no una colección', () => {
    const configuracion = readFileSync(resolve(RAIZ, 'src/content.config.ts'), 'utf8');
    expect(configuracion).not.toContain(FICHERO_DE_INDEXACION);
  });

  it('las dos órdenes están donde se leen, con su código de salida propio', () => {
    // Nadie ejecuta lo que no sabe que existe: la misma comprobación que la 11.3 le hace a
    // `sesion:registrar`.
    const paquete = JSON.parse(readFileSync(resolve(RAIZ, 'package.json'), 'utf8'));
    expect(paquete.scripts['indexacion']).toContain('tools/indexacion.ts');
    expect(paquete.scripts['indexacion:registrar']).toContain('--registrar');

    const agentes = readFileSync(resolve(RAIZ, 'AGENTS.md'), 'utf8');
    expect(agentes).toContain('npm run indexacion');
    expect(agentes).toContain('indexacion:registrar');
    expect(agentes).toContain(VARIABLE_DE_CREDENCIALES);
    expect(agentes).toMatch(new RegExp(`c[oó]digo\\s+\\*{0,2}${SALIDA_SIN_CREDENCIALES}\\b`));

    // Y el paso manual, con la trampa del permiso, en el sitio donde vive lo manual.
    const despliegue = readFileSync(resolve(RAIZ, 'DESPLIEGUE.md'), 'utf8');
    expect(despliegue).toContain(VARIABLE_DE_CREDENCIALES);
    expect(despliegue).toMatch(/Propietario/);
  });

  it('una familia sin leer está ausente al releer la serie, y no aparece como cero', async () => {
    const rutas = rutasDelCorpus(await corpusVacio());
    await registrarLecturaDeIndexacion(rutas, lecturaDe({}));

    const [entrada] = await leerSerieDeIndexacion(rutas);
    expect(Object.keys(entrada.familias ?? {})).toEqual(['cita']);
    expect(entrada.familias?.autor).toBeUndefined();
    expect(entrada.sinLeer?.autor).toBe('cuota agotada');

    // Y en el fichero, literalmente: ni «autor:» dentro de familias, ni un cero suyo.
    const escrito = await readFile(rutas.serieDeIndexacion, 'utf8');
    const familias = escrito.slice(escrito.indexOf('familias:'), escrito.indexOf('sinLeer:'));
    expect(familias).not.toMatch(/autor/);
  });

  it('la segunda lectura del día reemplaza a la primera y respeta las otras jornadas', async () => {
    const rutas = rutasDelCorpus(await corpusVacio());
    const ayer = new Date(2026, 8, 3, 10, 0);
    const hoy = new Date(2026, 8, 4, 9, 0);
    const hoyMasTarde = new Date(2026, 8, 4, 20, 30);

    await registrarLecturaDeIndexacion(rutas, lecturaDe({ momento: ayer, indexadas: 1 }));
    await registrarLecturaDeIndexacion(rutas, lecturaDe({ momento: hoy, indexadas: 2 }));
    await registrarLecturaDeIndexacion(rutas, lecturaDe({ momento: hoyMasTarde, indexadas: 9 }));

    const serie = await leerSerieDeIndexacion(rutas);
    expect(serie).toHaveLength(2);
    expect(serie.map((e) => e.fecha)).toEqual([fechaLocal(ayer), fechaLocal(hoyMasTarde)]);
    // La de hoy es la última, no la primera: mide un estado, no una sesión.
    expect(serie[1].familias?.cita.indexadas).toBe(9);
    expect(serie[1].hora).toBe('20:30');
    // Y lo de ayer sigue intacto: reemplazar la jornada no es reescribir la serie.
    expect(serie[0].familias?.cita.indexadas).toBe(1);
  });

  it('dos jornadas son comparables y cada una lleva su tamaño de muestra', async () => {
    const rutas = rutasDelCorpus(await corpusVacio());
    await registrarLecturaDeIndexacion(
      rutas,
      lecturaDe({ momento: new Date(2026, 8, 3, 10, 0), muestra: 30, indexadas: 1 }),
    );
    await registrarLecturaDeIndexacion(
      rutas,
      lecturaDe({ momento: new Date(2026, 8, 4, 10, 0), muestra: 20, indexadas: 4 }),
    );

    const serie = await leerSerieDeIndexacion(rutas);
    for (const entrada of serie) {
      expect(entrada.familias?.cita.muestra).toBeGreaterThan(0);
      expect(entrada.familias?.cita.publicadas).toBe(30);
    }
    expect(serie[0].familias?.cita.muestra).toBe(30);
    expect(serie[1].familias?.cita.muestra).toBe(20);
  });

  it('conserva la cabecera que el fichero tenga, no la constante', async () => {
    const rutas = rutasDelCorpus(await corpusVacio());
    await writeFile(
      rutas.serieDeIndexacion,
      `# Una nota escrita a mano que no se pierde.\n\nlecturas:\n`,
      'utf8',
    );
    await registrarLecturaDeIndexacion(rutas, lecturaDe({}));

    const escrito = await readFile(rutas.serieDeIndexacion, 'utf8');
    expect(escrito).toMatch(/# Una nota escrita a mano que no se pierde\./);
  });

  it('se niega y no escribe nada si al fichero le falta la clave de la que cuelgan', async () => {
    const rutas = rutasDelCorpus(await corpusVacio());
    await writeFile(rutas.serieDeIndexacion, '# solo una cabecera, sin clave\n', 'utf8');

    await expect(registrarLecturaDeIndexacion(rutas, lecturaDe({}))).rejects.toThrow(/lecturas/);
    expect(await readFile(rutas.serieDeIndexacion, 'utf8')).toBe('# solo una cabecera, sin clave\n');
  });

  it('una serie que no existe se lee como serie vacía', async () => {
    const rutas = rutasDelCorpus(await corpusVacio());
    expect(await leerSerieDeIndexacion(rutas)).toEqual([]);
  });

  it('lo escrito es YAML que se relee entero', async () => {
    const rutas = rutasDelCorpus(await corpusVacio());
    await registrarLecturaDeIndexacion(rutas, lecturaDe({}));
    const leido = parsearYaml(await readFile(rutas.serieDeIndexacion, 'utf8'));
    expect(Array.isArray(leido.lecturas)).toBe(true);
    expect(leido.lecturas[0].propiedad).toBe('sc-domain:ejemplo.test');
  });
});

// ─── La orden, con el inspector puesto a mano ────────────────────────────────────────

/** Un corpus en disco con Citas suficientes para publicar su Tema. */
async function corpusConCitas(cuantas: number): Promise<string> {
  const corpus = await corpusVacio();
  await writeFile(
    join(corpus, 'autores', 'autor-0.yml'),
    'nombre: "Autor Cero"\nañoFallecimiento: 65\nsemblanza: "Semblanza de prueba."\ntradicion: "peninsular"\n',
    'utf8',
  );
  await writeFile(join(corpus, 'temas', 'la-vida.yml'), 'nombre: "La vida"\n', 'utf8');
  for (let i = 0; i < cuantas; i += 1) {
    await writeFile(
      join(corpus, 'citas', `cita-${i}.md`),
      [
        '---',
        `slug: "cita-${i}"`,
        `texto: "Texto de prueba número ${i}."`,
        'autor: "autor-0"',
        'temas:',
        '  - la-vida',
        '---',
        '',
      ].join('\n'),
      'utf8',
    );
  }
  return corpus;
}

/** Silencia y recoge lo que la orden imprime, para poder afirmar sobre ello. */
function capturarSalida() {
  const salida: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((texto) => {
    salida.push(String(texto));
    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation((texto) => {
    salida.push(String(texto));
    return true;
  });
  return salida;
}

const CREDENCIAL = { [VARIABLE_DE_CREDENCIALES]: '{"type":"service_account"}' };

/** Un inspector de mentira: contesta lo que se le diga y no toca la red. */
function inspectorQueContesta(
  veredicto: (ruta: string) => string | undefined,
  estado: (ruta: string) => string = (r) =>
    veredicto(r) === 'PASS' ? 'Submitted and indexed' : 'Discovered - currently not indexed',
): Inspeccionar {
  return async (ruta) => ({ ruta, veredicto: veredicto(ruta), estado: estado(ruta) });
}

describe('la orden', () => {
  it('consulta sin registrar: informa y no toca el fichero', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();

    const codigo = await principal(
      ['--corpus', corpus],
      async () => inspectorQueContesta((r) => (r === '/cita/cita-0/' ? 'PASS' : 'FAIL')),
      CREDENCIAL,
    );

    expect(codigo).toBe(0);
    expect(salida.join('')).toMatch(/Consulta: no se ha escrito nada\./);
    expect(existsSync(join(corpus, FICHERO_DE_INDEXACION))).toBe(false);
  });

  it('con la bandera, registra la entrada de hoy con el reparto por familia', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();

    const codigo = await principal(
      ['--corpus', corpus, '--registrar'],
      async () => inspectorQueContesta((r) => (r === '/cita/cita-0/' ? 'PASS' : 'FAIL')),
      CREDENCIAL,
    );

    expect(codigo).toBe(0);
    const [entrada] = await leerSerieDeIndexacion(rutasDelCorpus(corpus));
    expect(entrada.fecha).toBe(fechaLocal(new Date()));
    expect(entrada.familias?.cita).toEqual({
      publicadas: MIN_CITAS_POR_TEMA,
      muestra: MIN_CITAS_POR_TEMA,
      indexadas: 1,
      noIndexadas: MIN_CITAS_POR_TEMA - 1,
      // El diagnóstico llega hasta el fichero, que es donde hace falta para comparar.
      estados: [
        { estado: 'Discovered - currently not indexed', urls: MIN_CITAS_POR_TEMA - 1 },
        { estado: 'Submitted and indexed', urls: 1 },
      ],
    });
    // Autor y Tema también se leen: son familias publicadas y la entrada las lleva.
    expect(entrada.familias?.autor.publicadas).toBe(1);
    expect(entrada.familias?.tema.publicadas).toBe(1);
    expect(entrada.sinLeer).toBeUndefined();
  });

  it('fallo parcial: la familia que agota la cuota se omite y las demás se escriben', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();

    await principal(
      ['--corpus', corpus, '--registrar'],
      async () =>
        async (ruta) => {
          if (ruta.startsWith('/cita/')) throw Object.assign(new Error('Quota exceeded'), { status: 429 });
          return { ruta, veredicto: 'PASS', estado: 'Submitted and indexed' };
        },
      CREDENCIAL,
    );

    const [entrada] = await leerSerieDeIndexacion(rutasDelCorpus(corpus));
    expect(entrada.familias?.cita).toBeUndefined();
    // Normalizado, no el mensaje crudo: esto se versiona para siempre y se compara entre
    // jornadas, así que dos redacciones del mismo 429 no pueden parecer dos cosas.
    expect(entrada.sinLeer?.cita).toBe('lectura interrumpida tras 0 de 15: cuota agotada (429)');
    // Las otras dos sí: el fallo de una familia no se lleva por delante la entrada entera.
    expect(entrada.familias?.autor.indexadas).toBe(1);
    expect(entrada.familias?.tema.indexadas).toBe(1);
  });

  it('la segunda ejecución de la jornada reemplaza a la primera', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();

    await principal(
      ['--corpus', corpus, '--registrar'],
      async () => inspectorQueContesta(() => 'FAIL'),
      CREDENCIAL,
    );
    await principal(
      ['--corpus', corpus, '--registrar'],
      async () => inspectorQueContesta(() => 'PASS'),
      CREDENCIAL,
    );

    const serie = await leerSerieDeIndexacion(rutasDelCorpus(corpus));
    expect(serie).toHaveLength(1);
    expect(serie[0].familias?.cita.indexadas).toBe(MIN_CITAS_POR_TEMA);
  });

  it('un presupuesto corto muestrea, y el tamaño de muestra queda escrito', async () => {
    const corpus = await corpusConCitas(40);
    capturarSalida();

    await principal(
      ['--corpus', corpus, '--registrar', '--presupuesto', '25'],
      async () => inspectorQueContesta(() => 'FAIL'),
      CREDENCIAL,
    );

    const [entrada] = await leerSerieDeIndexacion(rutasDelCorpus(corpus));
    expect(entrada.inspeccionadas).toBeLessThanOrEqual(25);
    expect(entrada.familias?.cita.publicadas).toBe(40);
    expect(entrada.familias?.cita.muestra).toBeLessThan(40);
  });

  it('un presupuesto que no es un número se rechaza en vez de leerse como ninguno', async () => {
    capturarSalida();
    expect(await principal(['--presupuesto', 'mil'], undefined, CREDENCIAL)).toBe(1);
  });

  it('una bandera que no se reconoce no es «lo mismo pero sin ella»', async () => {
    capturarSalida();
    expect(await principal(['--registar'], undefined, CREDENCIAL)).toBe(1);
  });

  it('el --json lleva la lectura y el plan, y se puede analizar', async () => {
    // Es la comprobación que DESPLIEGUE.md §5 le pone delante al operador: si la forma
    // cambia, lo que se rompe es su procedimiento, no una prueba.
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();

    const codigo = await principal(
      ['--corpus', corpus, '--json'],
      async () => inspectorQueContesta((r) => (r === '/cita/cita-0/' ? 'PASS' : 'FAIL')),
      CREDENCIAL,
    );

    expect(codigo).toBe(0);
    const informe = JSON.parse(salida.join('')) as {
      lectura: {
        momento?: string;
        propiedad: string;
        publicadas: number;
        familias: Record<string, unknown>;
      };
      plan: { presupuesto: number; inspecciones: number };
    };
    // El instante viaja en la lectura, sellado por la orden antes de la primera petición:
    // es lo que impide que una pasada larga se archive en la jornada en que terminó.
    expect(informe.lectura.momento).toBeDefined();
    expect(new Date(informe.lectura.momento ?? '').getTime()).toBeLessThanOrEqual(Date.now());
    expect(informe.lectura.propiedad).toBe(propiedadDeDominio(DOMINIO));
    expect(informe.lectura.publicadas).toBe(MIN_CITAS_POR_TEMA + 2);
    expect(Object.keys(informe.lectura.familias).sort()).toEqual(['autor', 'cita', 'tema']);
    expect(informe.plan.presupuesto).toBe(TECHO_DIARIO_DE_INSPECCIONES);
    expect(informe.plan.inspecciones).toBe(MIN_CITAS_POR_TEMA + 2);
  });

  it('el informe de pantalla nombra lo leído y lo no leído, y no inventa un cero', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();

    await principal(
      ['--corpus', corpus],
      async () =>
        async (ruta) => {
          if (ruta.startsWith('/cita/')) throw Object.assign(new Error('nope'), { status: 403 });
          return { ruta, veredicto: 'PASS', estado: 'Submitted and indexed' };
        },
      CREDENCIAL,
    );

    const texto = salida.join('');
    expect(texto).toContain('Autor: 1 indexadas de 1');
    expect(texto).toContain('1 — Submitted and indexed');
    expect(texto).toMatch(/Familias sin leer/);
    expect(texto).toMatch(/Cita: lectura interrumpida .*sin acceso a la propiedad \(403\)/);
    // Lo que no puede aparecer: la familia que falló, con un cero al lado.
    expect(texto).not.toMatch(/^Cita: \d+ indexadas/m);
  });

  it('un presupuesto por encima del techo diario se rechaza en vez de agotar la cuota', async () => {
    capturarSalida();
    expect(
      await principal(
        ['--presupuesto', String(TECHO_DIARIO_DE_INSPECCIONES + 1)],
        undefined,
        CREDENCIAL,
      ),
    ).toBe(1);
    // Y el techo exacto sí se admite: es lo que la propiedad concede.
    const corpus = await corpusConCitas(1);
    expect(
      await principal(
        ['--corpus', corpus, '--presupuesto', String(TECHO_DIARIO_DE_INSPECCIONES)],
        async () => inspectorQueContesta(() => 'FAIL'),
        CREDENCIAL,
      ),
    ).toBe(0);
  });

  it('una credencial mal formada se rechaza sin repetir su contenido', async () => {
    const corpus = await corpusConCitas(1);
    const salida = capturarSalida();
    const secreto = '{"private_key":"-----BEGIN PRIVATE KEY-----ROTO';

    const codigo = await principal(['--corpus', corpus], inspectorDeSearchConsole, {
      [VARIABLE_DE_CREDENCIALES]: secreto,
    });

    expect(codigo).toBe(1);
    // Lo que se dice es qué variable está mal, nunca lo que lleva dentro: esta salida
    // acaba en la terminal y puede acabar en el registro de una ejecución.
    expect(salida.join('')).toMatch(new RegExp(VARIABLE_DE_CREDENCIALES));
    expect(salida.join('')).not.toMatch(/BEGIN PRIVATE KEY/);
    expect(existsSync(join(corpus, FICHERO_DE_INDEXACION))).toBe(false);
  });
});

describe('sin credenciales', () => {
  it('no escribe nada, nombra lo que falta y sale con su propio código', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);

    /*
     * Este caso se recorre por la orden de verdad, en otro proceso: lo que se afirma es que
     * el proceso sale con un código **propio** —para que un guion distinga «falta la
     * credencial» de «la lectura falló»— y que no ha tocado el corpus. Un `principal` en
     * memoria no probaría lo primero.
     */
    const entorno = { ...process.env };
    delete entorno[VARIABLE_DE_CREDENCIALES];

    const fallo = await ejecutar(
      'npx',
      ['tsx', 'tools/indexacion.ts', '--corpus', corpus, '--registrar'],
      { cwd: RAIZ, env: entorno },
    ).then(
      () => undefined,
      (error: Error & { code?: number; stderr?: string }) => error,
    );

    expect(fallo?.code).toBe(SALIDA_SIN_CREDENCIALES);
    expect(fallo?.stderr).toMatch(new RegExp(VARIABLE_DE_CREDENCIALES));
    expect(fallo?.stderr).toMatch(/DESPLIEGUE\.md §5/);
    expect(existsSync(join(corpus, FICHERO_DE_INDEXACION))).toBe(false);
  });
});

// ─── El instante de la lectura, y lo que va a disco ──────────────────────────────────

describe('la fecha de la entrada', () => {
  it('se sella al empezar, no al escribir', async () => {
    /*
     * Con 100 ms de paso y ~1.716 URL una pasada dura decenas de minutos. Fechándola al
     * escribir, una lectura empezada a las 23:40 se archivaba como del día siguiente y —por
     * ser la serie idempotente por fecha— reemplazaba la entrada de mañana antes de que
     * existiera. Aquí se comprueba que el instante que llega a la entrada es el que se le dio
     * al empezar, y no el de después de las peticiones.
     */
    const anoche = new Date(2026, 8, 3, 23, 55);
    let cuandoSePregunto: Date | undefined;

    const { lectura } = await leerIndexacion({
      conjunto: conjuntoDe(MIN_CITAS_POR_TEMA),
      propiedad: 'sc-domain:ejemplo.test',
      presupuesto: 100,
      momento: anoche,
      pasoMs: 0,
      inspeccionar: async (ruta) => {
        cuandoSePregunto = new Date();
        return { ruta, veredicto: 'FAIL', estado: 'Discovered - currently not indexed' };
      },
    });

    expect(lectura.momento).toBe(anoche);
    expect(cuandoSePregunto).toBeDefined();

    const rutas = rutasDelCorpus(await corpusVacio());
    await registrarLecturaDeIndexacion(rutas, lectura);
    const [entrada] = await leerSerieDeIndexacion(rutas);
    // La jornada es la del comienzo, no la de ahora ni la del final de la pasada.
    expect(entrada.fecha).toBe(fechaLocal(anoche));
    expect(entrada.hora).toBe('23:55');
  });

  it('sin instante dado, se sella igualmente antes de la primera petición', async () => {
    const { lectura } = await leerIndexacion({
      conjunto: conjuntoDe(MIN_CITAS_POR_TEMA),
      propiedad: 'sc-domain:ejemplo.test',
      presupuesto: 100,
      pasoMs: 0,
      inspeccionar: inspectorQueContesta(() => 'FAIL'),
    });
    expect(lectura.momento).toBeInstanceOf(Date);
  });
});

describe('lo que llega al disco', () => {
  it('el serializador sabe escribir una lista de objetos, y se relee igual', () => {
    /*
     * Hasta la 16.1 toda lista del corpus era de cadenas, y un objeto dentro salía como
     * `[object Object]`: un fichero corrupto escrito en silencio. El reparto por estado es la
     * primera lista de objetos del proyecto.
     */
    const yaml = aYaml({
      estados: [
        { estado: 'Discovered - currently not indexed', urls: 1635 },
        { estado: 'Submitted and indexed', urls: 4 },
      ],
    });
    expect(yaml).not.toContain('[object Object]');
    expect(parsearYaml(yaml)).toEqual({
      estados: [
        { estado: 'Discovered - currently not indexed', urls: 1635 },
        { estado: 'Submitted and indexed', urls: 4 },
      ],
    });
  });

  it('un estado con dos puntos dentro sobrevive al viaje de ida y vuelta', () => {
    // Se escribe como escalar entrecomillado y no como clave, que es lo que lo salva: un
    // `estado: valor` con dos puntos dentro habría partido el YAML.
    const yaml = aYaml({ estados: [{ estado: 'Error: server error (5xx)', urls: 3 }] });
    expect(parsearYaml(yaml).estados[0].estado).toBe('Error: server error (5xx)');
  });

  it('no deja ningún temporal detrás, y su nombre lleva el PID', async () => {
    // Un `serie-de-indexacion.yml.nueva` huérfano rompe el criterio de la historia, que es un
    // `git status --short` limpio. El PID evita además que dos ejecuciones se pisen.
    const corpus = await corpusVacio();
    const rutas = rutasDelCorpus(corpus);
    await registrarLecturaDeIndexacion(rutas, lecturaDe({}));
    expect(readdirSync(corpus).filter((f) => f.endsWith('.nueva'))).toEqual([]);
    expect(readFileSync(resolve(RAIZ, '.gitignore'), 'utf8')).toContain('corpus/*.nueva');
  });

  it('se niega si una familia leída no llegaría al fichero', async () => {
    /*
     * La invariante se reafirma sobre lo escrito y no solo sobre lo compuesto: entre
     * `componerLectura` y el disco está `aYaml`, que omite lo que no tiene valor. Una familia
     * cuyo objeto quedara vacío desaparecería de las dos listas y la entrada diría en
     * silencio que esa familia no existe.
     */
    const rutas = rutasDelCorpus(await corpusVacio());
    const lectura = lecturaDe({});
    await expect(
      registrarLecturaDeIndexacion(rutas, {
        ...lectura,
        familias: { ...lectura.familias, autor: undefined as never },
      }),
    ).rejects.toThrow(/no ha llegado al fichero/);
  });
});

// ─── AD-24: el sitio no toca el estado de indexación ─────────────────────────────────

describe('el aislamiento del sitio (AD-24)', () => {
  it('ningún módulo de src/ nombra la serie, el módulo de indexación ni el cliente', async () => {
    const { stdout } = await ejecutar(
      'git',
      [
        'grep',
        '-l',
        '--untracked',
        '-E',
        'indexacion|serie-de-indexacion|googleapis',
        '--',
        'src',
        'integraciones',
        'astro.config.mjs',
      ],
      { cwd: RAIZ },
    ).catch((error: Error & { stdout?: string; code?: number }) => {
      // `git grep` sale con 1 cuando no encuentra nada, que es justo lo que se espera.
      if (error.code === 1) return { stdout: '' };
      throw error;
    });

    expect(stdout.trim()).toBe('');
  });

  it('la lectura no atraviesa ninguna función de src/lib: es la orden quien agrega', async () => {
    /*
     * La comprobación de arriba es estática; ésta es de comportamiento. `leerIndexacion`
     * recibe el conjunto publicable —que sí es de `src/lib/`— y devuelve la lectura: el
     * estado de indexación viaja en una dirección y nunca vuelve. Si algún día alguien
     * pasara la lectura a una función del sitio, el conjunto dejaría de ser suficiente para
     * componerla y esto no compilaría.
     */
    const conjunto = conjuntoDe(MIN_CITAS_POR_TEMA);
    const { lectura } = await leerIndexacion({
      conjunto,
      propiedad: 'sc-domain:ejemplo.test',
      presupuesto: 100,
      inspeccionar: inspectorQueContesta(() => 'PASS'),
      pasoMs: 0,
    });

    expect(lectura.familias.cita?.indexadas).toBe(MIN_CITAS_POR_TEMA);
    expect(rutasPublicadas(conjunto)).toContain('/cita/la-vida-0/');
  });
});
