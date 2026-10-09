import { afterEach, describe, expect, it, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { parse as parsearYaml } from 'yaml';
import { MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';
import { DOMINIO } from '../../src/lib/dominio.ts';
import {
  CABECERA_DE_TRAFICO,
  FICHERO_DE_TRAFICO,
  leerSerieDeTrafico,
  registrarLecturaDeTrafico,
  rutasDelCorpus,
} from '../../tools/lib/corpus.ts';
import {
  SALIDA_SIN_CREDENCIALES,
  VARIABLE_DE_CREDENCIALES,
  censoPorFamilia,
  type CensoPorFamilia,
} from '../../tools/lib/indexacion.ts';
import {
  ESTADO_DE_LOS_DATOS,
  FILAS_POR_PAGINA,
  MOTIVO_SIN_DATOS_DEFINITIVOS,
  agregarPorFamilia,
  componerLecturaDeTrafico,
  mesesALeer,
  metricasDeTotal,
  peticionDeTotal,
  peticionPorPagina,
  type FilaDeTrafico,
  type PeticionDeTrafico,
} from '../../tools/lib/trafico.ts';
import { principal, type Consultar } from '../../tools/trafico.ts';
import { conjuntoDelCorpus } from '../../tools/indexacion.ts';

const ejecutar = promisify(execFile);
const RAIZ = resolve(import.meta.dirname, '../..');

/**
 * Historia 20.2 — la serie de tráfico orgánico, entera y sin red.
 *
 * Cada fila de la matriz de la historia se recorre con respuestas fijas: la red entra por un
 * solo sitio —el `Consultar` que `principal` recibe— y eso es lo que AD-22 manda.
 */

const temporales: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  const { rm } = await import('node:fs/promises');
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

/** El 9 de octubre de 2026, a mediodía local: el mes en curso es 2026-10. */
const HOY = new Date(2026, 9, 9, 12, 0);

const CREDENCIAL = { [VARIABLE_DE_CREDENCIALES]: '{"type":"service_account"}' };

async function corpusConCitas(cuantas: number): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-trafico-'));
  temporales.push(raiz);
  const corpus = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', 'colecciones']) {
    await mkdir(join(corpus, dir), { recursive: true });
  }
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

const URL = (ruta: string) => `https://${DOMINIO}${ruta}`;

/** Filas por página fijas: una Cita, un Autor, un Tema y lo que no casa con el censo. */
const FILAS_POR_PAGINA_FIJAS: FilaDeTrafico[] = [
  { keys: [URL('/cita/cita-0/')], clicks: 3, impressions: 100, ctr: 0.03, position: 10 },
  { keys: [URL('/cita/cita-1/')], clicks: 1, impressions: 300, ctr: 0.0033, position: 20 },
  { keys: [URL('/autor/autor-0/')], clicks: 2, impressions: 50, ctr: 0.04, position: 5 },
  { keys: [URL('/tema/la-vida/')], clicks: 0, impressions: 10, ctr: 0, position: 30 },
  { keys: [URL('/')], clicks: 4, impressions: 40, ctr: 0.1, position: 3 },
  { keys: [URL('/autor/no-existe')], clicks: 1, impressions: 7, ctr: 0.14, position: 9 },
];

const TOTAL_FIJO: FilaDeTrafico[] = [{ clicks: 12, impressions: 600, ctr: 0.02, position: 14.27 }];

/**
 * Una fuente de mentira: contesta por el `startDate` de cada petición, y lanza lo que se le
 * diga. `fallos.total` y `fallos.pagina` son los meses (`AAAA-MM`) cuya consulta falla.
 */
function fuente(fallos: { total?: string[]; pagina?: string[] } = {}): {
  consultar: Consultar;
  peticiones: PeticionDeTrafico[];
} {
  const peticiones: PeticionDeTrafico[] = [];
  const consultar: Consultar = async (peticion) => {
    peticiones.push(peticion);
    const mes = peticion.startDate.slice(0, 7);
    if (peticion.dimensions === undefined) {
      if (fallos.total?.includes(mes)) {
        throw Object.assign(new Error('Internal error'), { code: 500 });
      }
      return TOTAL_FIJO;
    }
    if (fallos.pagina?.includes(mes)) {
      throw Object.assign(new Error('Backend Error'), { code: 503 });
    }
    return FILAS_POR_PAGINA_FIJAS;
  };
  return { consultar, peticiones };
}

const conCliente = (consultar: Consultar) => async () => consultar;

// ─── Lo puro ─────────────────────────────────────────────────────────────────────────

describe('los meses y las peticiones', () => {
  it('lee los 16 meses que conserva la fuente, del más antiguo al actual, que va hasta hoy', () => {
    const meses = mesesALeer(HOY);
    expect(meses).toHaveLength(16);
    expect(meses[0]).toEqual({
      mes: '2025-07',
      desde: '2025-07-01',
      hasta: '2025-07-31',
      enCurso: false,
      parcial: false,
    });
    expect(meses[14]).toEqual({
      mes: '2026-09',
      desde: '2026-09-01',
      hasta: '2026-09-30',
      enCurso: false,
      parcial: false,
    });
    expect(meses[15]).toEqual({
      mes: '2026-10',
      desde: '2026-10-01',
      hasta: '2026-10-09',
      enCurso: true,
      parcial: true,
    });
    expect(mesesALeer(new Date(2026, 2, 3), 2)[0]).toMatchObject({ mes: '2026-02', hasta: '2026-02-28' });
  });

  it('un mes cuyo último día cae dentro del retardo de los datos final también es parcial', () => {
    // El 2 de octubre, el 30 de septiembre está a 2 días: septiembre aún no está cerrado.
    const [septiembre] = mesesALeer(new Date(2026, 9, 2, 12, 0), 2);
    expect(septiembre).toMatchObject({ mes: '2026-09', enCurso: false, parcial: true });
    // El 3, a 3 días: todavía dentro. El 4 ya se cierra.
    expect(mesesALeer(new Date(2026, 9, 3, 12, 0), 2)[0].parcial).toBe(true);
    expect(mesesALeer(new Date(2026, 9, 4, 12, 0), 2)[0].parcial).toBe(false);
  });

  it('se niega a pedir fuera de 1–16 meses', () => {
    expect(() => mesesALeer(HOY, 0)).toThrow(/1 a 16/);
    expect(() => mesesALeer(HOY, 17)).toThrow(/1 a 16/);
  });

  it('el total va sin dimensiones y por página pagina con rowLimit 25000, siempre final y web', () => {
    const [mes] = mesesALeer(HOY, 1);
    expect(peticionDeTotal(mes)).toEqual({
      startDate: '2026-10-01',
      endDate: '2026-10-09',
      dataState: 'final',
      type: 'web',
    });
    expect(peticionPorPagina(mes, 25_000)).toEqual({
      startDate: '2026-10-01',
      endDate: '2026-10-09',
      dataState: 'final',
      type: 'web',
      aggregationType: 'byPage',
      dimensions: ['page'],
      rowLimit: 25_000,
      startRow: 25_000,
    });
    expect(ESTADO_DE_LOS_DATOS).toBe('final');
  });
});

const CENSO: CensoPorFamilia = {
  cita: ['/cita/cita-0/', '/cita/cita-1/'],
  autor: ['/autor/autor-0/'],
  tema: ['/tema/la-vida/'],
  coleccion: ['/coleccion/sin-trafico/'],
};

describe('el reparto por familia', () => {
  it('suma clics e impresiones, CTR = clics/impresiones y posición ponderada por impresiones', () => {
    const { familias } = agregarPorFamilia(FILAS_POR_PAGINA_FIJAS, CENSO, DOMINIO);
    // (10·100 + 20·300) / 400 = 17,5
    expect(familias.cita).toEqual({ clics: 4, impresiones: 400, ctr: 0.01, posicion: 17.5 });
    expect(familias.autor).toEqual({ clics: 2, impresiones: 50, ctr: 0.04, posicion: 5 });
    expect(familias.tema).toEqual({ clics: 0, impresiones: 10, ctr: 0, posicion: 30 });
  });

  it('una familia leída sin filas es un cero real, sin CTR ni posición', () => {
    const { familias } = agregarPorFamilia(FILAS_POR_PAGINA_FIJAS, CENSO, DOMINIO);
    expect(familias.coleccion).toEqual({ clics: 0, impresiones: 0 });
  });

  it('una familia sin URL publicadas se omite: «sin publicar» no es «sin tráfico»', () => {
    const { familias } = agregarPorFamilia(
      FILAS_POR_PAGINA_FIJAS,
      { ...CENSO, coleccion: [] },
      DOMINIO,
    );
    expect(Object.keys(familias)).toEqual(['cita', 'autor', 'tema']);
  });

  it('una fila sin posición no entra en la media ponderada', () => {
    const { familias } = agregarPorFamilia(
      [
        { keys: [URL('/cita/cita-0/')], clicks: 0, impressions: 100, position: 10 },
        { keys: [URL('/cita/cita-1/')], clicks: 0, impressions: 900, position: null },
      ],
      CENSO,
      DOMINIO,
    );
    expect(familias.cita).toEqual({ clics: 0, impresiones: 1000, ctr: 0, posicion: 10 });
  });

  it('una página de otro host de la propiedad va a fueraDelCenso aunque la ruta casa', () => {
    const { familias, fueraDelCenso } = agregarPorFamilia(
      [
        { keys: [`https://www.${DOMINIO}/cita/cita-0/`], clicks: 1, impressions: 2, position: 1 },
        { keys: [`http://${DOMINIO}/cita/cita-0/`], clicks: 1, impressions: 2, position: 1 },
        { keys: [`https://blog.${DOMINIO}/cita/cita-0/`], clicks: 1, impressions: 2, position: 1 },
      ],
      CENSO,
      DOMINIO,
    );
    expect(familias.cita).toEqual({ clics: 0, impresiones: 0 });
    expect(fueraDelCenso).toEqual({ clics: 3, impresiones: 6 });
  });

  it('lo que no casa con el censo va a fueraDelCenso: la portada y un Autor que no existe', () => {
    const { fueraDelCenso } = agregarPorFamilia(FILAS_POR_PAGINA_FIJAS, CENSO, DOMINIO);
    expect(fueraDelCenso).toEqual({ clics: 5, impresiones: 47 });
  });

  it('la familia sale del censo, no del prefijo: una página 2 y una clave rota van fuera', () => {
    const { familias, fueraDelCenso } = agregarPorFamilia(
      [
        { keys: [URL('/autor/autor-0/2/')], clicks: 1, impressions: 5, position: 1 },
        { keys: ['no-es-una-ruta'], clicks: 1, impressions: 5, position: 1 },
        { keys: null, clicks: 1, impressions: 5, position: 1 },
      ],
      CENSO,
      DOMINIO,
    );
    expect(familias.autor).toEqual({ clics: 0, impresiones: 0 });
    expect(fueraDelCenso).toEqual({ clics: 3, impresiones: 15 });
  });

  it('el total sale de la consulta sin dimensiones, con una posición', () => {
    expect(metricasDeTotal(TOTAL_FIJO)).toEqual({
      clics: 12,
      impresiones: 600,
      ctr: 0.02,
      posicion: 14.3,
    });
    // Sin filas no es un cero: la fuente aún no tiene datos definitivos.
    expect(metricasDeTotal([])).toBeUndefined();
  });
});

describe('la puerta de «ausencia antes que cero»', () => {
  const [mes] = mesesALeer(HOY, 1);
  const total = { clics: 1, impresiones: 2 };
  const porPagina = agregarPorFamilia([], CENSO, DOMINIO);

  it('se niega a una familia a la vez leída y sin leer', () => {
    expect(() =>
      componerLecturaDeTrafico({
        mes,
        momento: HOY,
        propiedad: 'p',
        censo: CENSO,
        total,
        porPagina,
        sinLeer: [{ familia: 'cita', motivo: 'cuota agotada (429)' }],
      }),
    ).toThrow(/a la vez leída y sin leer/);
  });

  it('se niega a un motivo vacío', () => {
    expect(() =>
      componerLecturaDeTrafico({
        mes,
        momento: HOY,
        propiedad: 'p',
        censo: CENSO,
        total,
        sinLeer: ['cita', 'autor', 'tema', 'coleccion'].map((familia) => ({
          familia: familia as 'cita',
          motivo: familia === 'tema' ? '  ' : 'x',
        })),
      }),
    ).toThrow(/sin motivo/);
  });

  it('se niega a una familia que no esté en ninguna de las dos', () => {
    expect(() =>
      componerLecturaDeTrafico({ mes, momento: HOY, propiedad: 'p', censo: CENSO, total, sinLeer: [] }),
    ).toThrow(/ni leída ni con un motivo/);
  });

  it('el mes en curso lleva parcial: true', () => {
    const lectura = componerLecturaDeTrafico({
      mes,
      momento: HOY,
      propiedad: 'p',
      censo: CENSO,
      total,
      porPagina,
      sinLeer: [],
    });
    expect(lectura.parcial).toBe(true);
    expect(lectura.leidoEl).toBe('2026-10-09');
  });
});

// ─── La orden ────────────────────────────────────────────────────────────────────────

describe('la orden', () => {
  it('consulta: informa por mes el total, las familias publicadas y fueraDelCenso, y no escribe', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();
    const { consultar } = fuente();

    const codigo = await principal(
      ['--corpus', corpus, '--meses', '2'],
      conCliente(consultar),
      CREDENCIAL,
      HOY,
    );

    const texto = salida.join('');
    expect(codigo).toBe(0);
    expect(texto).toMatch(/2026-09\n/);
    expect(texto).toMatch(/2026-10 \(parcial: mes en curso/);
    expect(texto).toMatch(/Total: +12 clics, 600 impresiones, CTR 2\.00 %, posición 14\.3/);
    for (const familia of ['Cita', 'Autor', 'Tema']) {
      expect(texto).toMatch(new RegExp(`${familia}: +\\d+ clics`));
    }
    // El corpus de prueba no publica ninguna Colección: no sale, ni como cero.
    expect(texto).not.toMatch(/Colección:/);
    expect(texto).toMatch(/Fuera del censo: 5 clics, 47 impresiones/);
    expect(texto).toMatch(/Consulta: no se ha escrito nada\./);
    expect(existsSync(join(corpus, FICHERO_DE_TRAFICO))).toBe(false);
  });

  it('el censo de la orden sale del corpus: la Cita y el Autor de prueba casan', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const censo = censoPorFamilia(await conjuntoDelCorpus(rutasDelCorpus(corpus)));
    expect(censo.cita).toContain('/cita/cita-0/');
    expect(censo.autor).toContain('/autor/autor-0/');
    expect(censo.tema).toContain('/tema/la-vida/');
  });

  it('registrar: cabecera y una entrada por mes, con parcial solo en el mes en curso', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    const { consultar } = fuente();

    const codigo = await principal(
      ['--corpus', corpus, '--meses', '2', '--registrar'],
      conCliente(consultar),
      CREDENCIAL,
      HOY,
    );
    expect(codigo).toBe(0);

    const escrito = await readFile(join(corpus, FICHERO_DE_TRAFICO), 'utf8');
    expect(escrito.startsWith(CABECERA_DE_TRAFICO)).toBe(true);
    expect(escrito).toMatch(/- mes: "2026-09"/);
    expect(escrito).toMatch(/- mes: "2026-10"/);

    const { lecturas } = parsearYaml(escrito);
    expect(lecturas).toHaveLength(2);
    const [septiembre, octubre] = lecturas;
    expect(septiembre.mes).toBe('2026-09');
    expect(septiembre.leidoEl).toBe('2026-10-09');
    expect(septiembre.parcial).toBeUndefined();
    expect(octubre.parcial).toBe(true);
    expect(septiembre.propiedad).toMatch(/^sc-domain:/);
    expect(septiembre.total).toEqual({ clics: 12, impresiones: 600, ctr: 0.02, posicion: 14.3 });
    expect(Object.keys(septiembre.familias)).toEqual(['cita', 'autor', 'tema']);
    expect(septiembre.fueraDelCenso).toEqual({ clics: 5, impresiones: 47 });
    expect(septiembre.sinLeer).toBeUndefined();
  });

  it('el mismo mes dos veces: una sola entrada, la nueva, y las de otros meses intactas', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();

    await principal(
      ['--corpus', corpus, '--meses', '2', '--registrar'],
      conCliente(fuente().consultar),
      CREDENCIAL,
      new Date(2026, 8, 20, 12, 0),
    );
    // Ahora 2026-08 y 2026-09 (parcial). Se relee 2026-09 ya cerrado, un mes después.
    const otra: Consultar = async (p) =>
      p.dimensions === undefined ? [{ clicks: 99, impressions: 1000, position: 7 }] : [];
    await principal(
      ['--corpus', corpus, '--meses', '2', '--registrar'],
      conCliente(otra),
      CREDENCIAL,
      HOY,
    );

    const serie = await leerSerieDeTrafico(rutasDelCorpus(corpus));
    expect(serie.map((e) => e.mes)).toEqual(['2026-08', '2026-09', '2026-10']);
    const septiembre = serie.find((e) => e.mes === '2026-09');
    expect(septiembre?.total.clics).toBe(99);
    expect(septiembre?.parcial).toBeUndefined();
    expect(septiembre?.leidoEl).toBe('2026-10-09');
    expect(serie.find((e) => e.mes === '2026-08')?.total.clics).toBe(12);
  });

  it('un mes que falla no se escribe, conserva su entrada previa y se nombra en sinLeer', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    await principal(
      ['--corpus', corpus, '--meses', '3', '--registrar'],
      conCliente(fuente().consultar),
      CREDENCIAL,
      HOY,
    );
    const antes = (await leerSerieDeTrafico(rutasDelCorpus(corpus))).find((e) => e.mes === '2026-08');

    const salida = capturarSalida();
    const codigo = await principal(
      ['--corpus', corpus, '--meses', '3', '--registrar'],
      conCliente(fuente({ total: ['2026-08'] }).consultar),
      CREDENCIAL,
      new Date(2026, 9, 10, 12, 0),
    );

    expect(codigo).toBe(0);
    const texto = salida.join('');
    expect(texto).toMatch(/Meses sin leer/);
    expect(texto).toMatch(/2026-08: la fuente no respondió/);

    const serie = await leerSerieDeTrafico(rutasDelCorpus(corpus));
    expect(serie.map((e) => e.mes)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(serie.find((e) => e.mes === '2026-08')).toEqual(antes);
    expect(serie.find((e) => e.mes === '2026-09')?.leidoEl).toBe('2026-10-10');
  });

  it('familia sin leer: el total se escribe, familias vacío y las publicadas en sinLeer', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();

    const codigo = await principal(
      ['--corpus', corpus, '--meses', '1', '--registrar'],
      conCliente(fuente({ pagina: ['2026-10'] }).consultar),
      CREDENCIAL,
      HOY,
    );
    expect(codigo).toBe(0);

    const [octubre] = await leerSerieDeTrafico(rutasDelCorpus(corpus));
    expect(octubre.total.clics).toBe(12);
    expect(octubre.familias).toBeUndefined();
    expect(octubre.fueraDelCenso).toBeUndefined();
    expect(Object.keys(octubre.sinLeer ?? {})).toEqual(['cita', 'autor', 'tema']);
    expect(octubre.sinLeer?.cita).toMatch(/la fuente no respondió/);

    const texto = salida.join('');
    for (const familia of ['Cita', 'Autor', 'Tema']) {
      expect(texto).toMatch(
        new RegExp(`${familia} sin leer —no se escribe como cero—: la fuente no respondió: Backend Error`),
      );
    }
  });

  it('el mes en curso con el total sin filas no es un cero: va a sinLeer y no se escribe', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();
    const consultar: Consultar = async (p) => {
      if (p.startDate.startsWith('2026-10')) return [];
      return p.dimensions === undefined ? TOTAL_FIJO : FILAS_POR_PAGINA_FIJAS;
    };

    const codigo = await principal(
      ['--corpus', corpus, '--meses', '2', '--registrar'],
      conCliente(consultar),
      CREDENCIAL,
      HOY,
    );

    expect(codigo).toBe(0);
    expect(salida.join('')).toContain(`2026-10: ${MOTIVO_SIN_DATOS_DEFINITIVOS}`);
    const serie = await leerSerieDeTrafico(rutasDelCorpus(corpus));
    expect(serie.map((e) => e.mes)).toEqual(['2026-09']);
  });

  it('si falla la consulta por página y el mes ya tiene familias, la entrada previa se conserva', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    await principal(
      ['--corpus', corpus, '--meses', '2', '--registrar'],
      conCliente(fuente().consultar),
      CREDENCIAL,
      HOY,
    );
    const antes = await readFile(join(corpus, FICHERO_DE_TRAFICO), 'utf8');

    const salida = capturarSalida();
    const otra: Consultar = async (p) => {
      if (p.dimensions !== undefined) throw Object.assign(new Error('Backend Error'), { code: 503 });
      return [{ clicks: 77, impressions: 700, position: 2 }];
    };
    const codigo = await principal(
      ['--corpus', corpus, '--meses', '2', '--registrar'],
      conCliente(otra),
      CREDENCIAL,
      new Date(2026, 9, 10, 12, 0),
    );

    // Ningún mes se leyó entero: los dos ya tenían familias. Nada se escribe.
    expect(codigo).toBe(1);
    expect(salida.join('')).toMatch(/2026-09: la consulta por página falló .* se conserva la entrada anterior/);
    expect(await readFile(join(corpus, FICHERO_DE_TRAFICO), 'utf8')).toBe(antes);
  });

  it('--registrar sobre una serie corrupta da 1 y deja el fichero byte a byte igual', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const corrupto = '# una serie sin su clave\nentradas:\n  - mes: "2026-09"\n';
    await writeFile(join(corpus, FICHERO_DE_TRAFICO), corrupto, 'utf8');
    const salida = capturarSalida();

    const codigo = await principal(
      ['--corpus', corpus, '--meses', '2', '--registrar'],
      conCliente(fuente().consultar),
      CREDENCIAL,
      HOY,
    );

    expect(codigo).toBe(1);
    expect(salida.join('')).toMatch(/lecturas/);
    expect(await readFile(join(corpus, FICHERO_DE_TRAFICO), 'utf8')).toBe(corrupto);
  });

  it('--ayuda da 0 y el uso', async () => {
    const salida = capturarSalida();
    expect(await principal(['--ayuda'], conCliente(fuente().consultar), {}, HOY)).toBe(0);
    expect(salida.join('')).toMatch(/npx tsx tools\/trafico\.ts/);
  });

  it('nada legible: no se escribe nada y sale con 1', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();

    const codigo = await principal(
      ['--corpus', corpus, '--meses', '2', '--registrar'],
      conCliente(fuente({ total: ['2026-09', '2026-10'], pagina: ['2026-09', '2026-10'] }).consultar),
      CREDENCIAL,
      HOY,
    );

    expect(codigo).toBe(1);
    expect(salida.join('')).toMatch(/No se pudo leer ningún mes/);
    expect(existsSync(join(corpus, FICHERO_DE_TRAFICO))).toBe(false);
  });

  it('pagina con startRow hasta recibir menos de rowLimit', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const llena: FilaDeTrafico[] = Array.from({ length: FILAS_POR_PAGINA }, () => ({
      keys: [URL('/cita/cita-0/')],
      clicks: 0,
      impressions: 1,
      position: 1,
    }));
    const pedidas: number[] = [];
    const consultar: Consultar = async (p) => {
      if (p.dimensions === undefined) return TOTAL_FIJO;
      pedidas.push(p.startRow ?? -1);
      return p.startRow === 0 ? llena : [FILAS_POR_PAGINA_FIJAS[0]];
    };

    const salida = capturarSalida();
    await principal(['--corpus', corpus, '--meses', '1', '--json'], conCliente(consultar), CREDENCIAL, HOY);

    expect(pedidas).toEqual([0, FILAS_POR_PAGINA]);
    const { lectura } = JSON.parse(salida.join(''));
    expect(lectura.meses[0].familias.cita.impresiones).toBe(FILAS_POR_PAGINA + 100);
  });

  it('una bandera mala o un --meses mal formado: uso por stderr y código 2', async () => {
    for (const argumentos of [['--mezes', '3'], ['--meses', '0'], ['--meses', '17'], ['--meses', 'tres']]) {
      const salida = capturarSalida();
      const codigo = await principal(argumentos, conCliente(fuente().consultar), CREDENCIAL, HOY);
      expect(codigo).toBe(2);
      expect(salida.join('')).toMatch(/npx tsx tools\/trafico\.ts/);
      vi.restoreAllMocks();
    }
  });

  it('sin credencial en memoria: código 2 y nada escrito, con o sin --registrar', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    for (const extra of [[], ['--registrar']]) {
      const salida = capturarSalida();
      const codigo = await principal(['--corpus', corpus, ...extra], conCliente(fuente().consultar), {}, HOY);
      expect(codigo).toBe(SALIDA_SIN_CREDENCIALES);
      expect(salida.join('')).toMatch(/DESPLIEGUE\.md §5/);
      vi.restoreAllMocks();
    }
    expect(existsSync(join(corpus, FICHERO_DE_TRAFICO))).toBe(false);
  });
});

describe('sin credenciales, en otro proceso', () => {
  it('no escribe nada, nombra la variable y DESPLIEGUE.md §5, y sale con 2', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const entorno = { ...process.env };
    delete entorno[VARIABLE_DE_CREDENCIALES];

    const fallo = await ejecutar(
      'npx',
      ['tsx', 'tools/trafico.ts', '--corpus', corpus, '--registrar'],
      { cwd: RAIZ, env: entorno },
    ).then(
      () => undefined,
      (error: Error & { code?: number; stderr?: string }) => error,
    );

    expect(fallo?.code).toBe(SALIDA_SIN_CREDENCIALES);
    expect(fallo?.stderr).toMatch(new RegExp(VARIABLE_DE_CREDENCIALES));
    expect(fallo?.stderr).toMatch(/DESPLIEGUE\.md §5/);
    expect(existsSync(join(corpus, FICHERO_DE_TRAFICO))).toBe(false);
  });
});

// ─── El fichero, la documentación y el aislamiento ───────────────────────────────────

describe('la serie en corpus/', () => {
  it('el fichero versionado empieza por la cabecera', () => {
    const versionado = readFileSync(resolve(RAIZ, 'corpus', FICHERO_DE_TRAFICO), 'utf8');
    expect(versionado.startsWith(CABECERA_DE_TRAFICO)).toBe(true);
  });

  it('la cabecera dice qué mide, que no son sesiones, por qué reemplaza y sus invariantes', () => {
    expect(CABECERA_DE_TRAFICO).toMatch(/QUÉ MIDE/);
    expect(CABECERA_DE_TRAFICO).toMatch(/CLICS DE SEARCH CONSOLE, no las sesiones de SM-2/);
    expect(CABECERA_DE_TRAFICO).toMatch(/POR QUÉ REEMPLAZA POR MES/);
    expect(CABECERA_DE_TRAFICO).toMatch(/AUSENCIA ANTES QUE CERO/);
    expect(CABECERA_DE_TRAFICO).toMatch(/fueraDelCenso/);
    expect(CABECERA_DE_TRAFICO).toMatch(/dataState/);
    expect(CABECERA_DE_TRAFICO).toMatch(/AD-24/);
    expect(CABECERA_DE_TRAFICO).toMatch(/SUSTITUTO de SM-2/);
    expect(CABECERA_DE_TRAFICO).toMatch(/REATRIBUYE/);
    expect(CABECERA_DE_TRAFICO).toMatch(/día 4/);
    expect(CABECERA_DE_TRAFICO).toMatch(/puede quedar por encima/);
  });

  it('al releer, un mes mal formado o repetido se rechaza', async () => {
    for (const [cuerpo, error] of [
      ['  - mes: "2026-9"\n    propiedad: "p"\n', /AAAA-MM/],
      ['  - mes: "2026-09"\n    propiedad: "p"\n  - mes: "2026-09"\n    propiedad: "p"\n', /dos veces/],
    ] as const) {
      const corpus = await corpusConCitas(0);
      await writeFile(join(corpus, FICHERO_DE_TRAFICO), `lecturas:\n${cuerpo}`, 'utf8');
      await expect(leerSerieDeTrafico(rutasDelCorpus(corpus))).rejects.toThrow(error);
    }
  });

  it('se niega a registrar una lectura sin meses', async () => {
    const corpus = await corpusConCitas(0);
    await expect(
      registrarLecturaDeTrafico(rutasDelCorpus(corpus), {
        propiedad: 'p',
        leidoEl: '2026-10-09',
        meses: [],
        sinLeer: [],
      }),
    ).rejects.toThrow(/ningún mes leído/);
    expect(existsSync(join(corpus, FICHERO_DE_TRAFICO))).toBe(false);
  });

  it('es metadato del Corpus, no una colección', () => {
    const configuracion = readFileSync(resolve(RAIZ, 'src/content.config.ts'), 'utf8');
    expect(configuracion).not.toContain(FICHERO_DE_TRAFICO);
    expect(configuracion).not.toMatch(/serie-de-trafico/);
  });

  it('las órdenes están en package.json y en AGENTS.md', () => {
    const paquete = JSON.parse(readFileSync(resolve(RAIZ, 'package.json'), 'utf8'));
    expect(paquete.scripts['trafico']).toBe('tsx tools/trafico.ts');
    expect(paquete.scripts['trafico:registrar']).toBe('tsx tools/trafico.ts --registrar');

    const agentes = readFileSync(resolve(RAIZ, 'AGENTS.md'), 'utf8');
    expect(agentes).toContain('## Leer el tráfico orgánico');
    expect(agentes).toContain('npm run trafico');
    expect(agentes).toContain('trafico:registrar');
    expect(agentes).toMatch(/código 2/);
    expect(agentes.indexOf('## Leer el tráfico orgánico')).toBeGreaterThan(
      agentes.indexOf('## Leer el estado de indexación'),
    );
  });
});

describe('el aislamiento del sitio (AD-24)', () => {
  it('ningún módulo de src/ nombra la serie ni la orden', async () => {
    const { stdout } = await ejecutar(
      'git',
      [
        'grep',
        '-l',
        '--untracked',
        '-E',
        'trafico|serie-de-trafico',
        '--',
        'src',
        'integraciones',
        'astro.config.mjs',
      ],
      { cwd: RAIZ },
    ).catch((error: Error & { stdout?: string; code?: number }) => {
      if (error.code === 1) return { stdout: '' };
      throw error;
    });

    expect(stdout.trim()).toBe('');
  });
});
