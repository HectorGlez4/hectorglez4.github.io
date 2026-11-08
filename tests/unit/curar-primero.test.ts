import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { promisify } from 'node:util';
import { RAIZ } from './ayuda/construir.js';
import { escribirCita, registrarLecturaDeDemanda, rutasDelCorpus } from '../../tools/lib/corpus.ts';
import {
  componerCuracion,
  curarPrimero,
  lineasDeCuracion,
  ventanaDeCuracion,
  type InformeDeCuracion,
} from '../../tools/lib/curarPrimero.ts';
import type { ObraResuelta } from '../../src/lib/obras.ts';
import type { Tienda } from '../../src/lib/ingreso.ts';

const ejecutar = promisify(execFile);

/**
 * Historia 33.3 — `npm run obra -- curar-primero`: qué Obras curar primero.
 *
 * Solo lectura (AD-24) y ausencia antes que cero: sin ventana de 28 días legible, cada candidata
 * sale «sin cifra» con su motivo, nunca 0. Las tiendas son inventadas, de dominio `.example`
 * (AD-21): `TIENDAS` del repositorio sigue vacío.
 */

function obra(nombre: string, extra: Partial<ObraResuelta> = {}): ObraResuelta {
  return {
    nombre,
    autor: nombre.split('--')[0],
    titulo: `Título de ${nombre}`,
    fuentes: ['wikisource-es'],
    edicionCotejada: true,
    temas: [],
    recuento: 1,
    ...extra,
  } as ObraResuelta;
}

const OBRAS = [
  obra('seneca--cartas'),
  obra('seneca--brevedad'),
  obra('cervantes--quijote'),
  obra('cervantes--galatea', { edicionCotejada: false, fuentes: [] }),
];
const CITAS = [
  { slug: 'seneca-a', obra: { nombre: 'seneca--cartas' } },
  { slug: 'seneca-b', obra: { nombre: 'seneca--cartas' } },
  { slug: 'seneca-c', obra: { nombre: 'seneca--brevedad' } },
  { slug: 'cervantes-a', obra: { nombre: 'cervantes--quijote' } },
  { slug: 'cervantes-g', obra: { nombre: 'cervantes--galatea' } },
  { slug: 'cervantes-suelta' },
];
const AUTORES = [
  { slug: 'seneca', nombre: 'Séneca' },
  { slug: 'cervantes', nombre: 'Miguel de Cervantes' },
];

const ventana28 = (desde: string, hasta: string, citas?: unknown[], extra: object = {}) => ({
  desde,
  hasta,
  clase: '28-dias',
  leidoEl: hasta,
  ...(citas !== undefined ? { citas } : {}),
  ...extra,
});
const mes = (desde: string, hasta: string) => ({ desde, hasta, clase: 'mes', leidoEl: hasta });
const fila = (cita: string, impresiones: number, clics: number) => ({ cita, impresiones, clics });

function componer(entradas: unknown[], extra: Partial<Parameters<typeof componerCuracion>[0]> = {}) {
  return componerCuracion({
    obras: OBRAS,
    citas: CITAS,
    autores: AUTORES,
    congelacion: undefined,
    entradas,
    tiendas: [],
    ...extra,
  });
}

function abierto(informe: InformeDeCuracion) {
  if (informe.congelada) throw new Error('se esperaba un informe sin congelación');
  return informe;
}

describe('Historia 33.3 — la ventana de la curación', () => {
  it('sin ninguna entrada no hay cifra, y lo dice', () => {
    expect(ventanaDeCuracion([])).toEqual({
      conCifra: false,
      motivo: 'la serie de demanda no tiene ninguna ventana leída',
    });
  });

  it('las mensuales no se usan: sin una de 28 días, «sin cifra»', () => {
    const v = ventanaDeCuracion([mes('2026-09-01', '2026-09-30'), mes('2026-10-01', '2026-10-31')]);
    expect(v.conCifra).toBe(false);
    if (!v.conCifra) expect(v.motivo).toContain('ninguna ventana de 28 días leída');
  });

  it('gana la de «hasta» más reciente, y a igual «hasta» la de «desde» más reciente', () => {
    const v = ventanaDeCuracion([
      ventana28('2026-10-08', '2026-11-04', [fila('seneca-a', 10, 1)]),
      ventana28('2026-09-01', '2026-09-28', [fila('seneca-a', 99, 9)]),
      ventana28('2026-10-07', '2026-11-04', [fila('seneca-a', 50, 5)]),
      mes('2026-10-01', '2026-10-31'),
    ]);
    expect(v).toMatchObject({ conCifra: true, desde: '2026-10-08', hasta: '2026-11-04', de: 3 });
  });

  it.each([
    ['sin «desde»', { clase: '28-dias', hasta: '2026-11-04' }, 'desde'],
    ['una fecha imposible', ventana28('2026-02-30', '2026-03-20'), '2026-02-30'],
    ['una clase desconocida', { desde: '2026-10-08', hasta: '2026-11-04', clase: 'semana' }, 'semana'],
    ['sin clase', { desde: '2026-10-08', hasta: '2026-11-04' }, 'no declara «clase»'],
    ['una Cita repetida', ventana28('2026-10-08', '2026-11-04', [fila('seneca-a', 9, 1), fila('seneca-a', 9, 1)]), 'repite «seneca-a»'],
    ['«vacia: true» con filas', ventana28('2026-10-08', '2026-11-04', [fila('seneca-a', 9, 1)], { vacia: true }), '«vacia: true» y a la vez filas'],
    ['una «cita» que no es texto', ventana28('2026-10-08', '2026-11-04', [{ cita: 3, impresiones: 1, clics: 0 }]), 'cita'],
    ['métricas que no son enteros', ventana28('2026-10-08', '2026-11-04', [fila('seneca-a', 1.5, 0)]), 'enteros'],
    ['métricas negativas', ventana28('2026-10-08', '2026-11-04', [fila('seneca-a', 4, -1)]), 'enteros'],
    ['una entrada que no es objeto', 'texto', 'no es una lectura'],
  ])('una entrada ilegible (%s) deja todo «sin cifra» nombrándola, sin recurrir a otra', (_c, mala, pista) => {
    const v = ventanaDeCuracion([ventana28('2026-09-01', '2026-09-28', [fila('seneca-a', 9, 1)]), mala]);
    expect(v.conCifra).toBe(false);
    if (!v.conCifra) {
      expect(v.motivo).toContain('la entrada 2');
      expect(v.motivo).toContain(pista);
    }
  });

  it('un motivo nunca dice «undefined» ni «[object Object]»', () => {
    for (const mala of [{ clase: '28-dias', hasta: '2026-11-04' }, ventana28('2026-10-08', '2026-11-04', [], { vacia: { x: 1 } })]) {
      const v = ventanaDeCuracion([mala]);
      expect(v.conCifra).toBe(false);
      if (!v.conCifra) expect(v.motivo).not.toMatch(/undefined|\[object Object\]/);
    }
  });

  it('dos entradas de la misma ventana de 28 días dejan todo «sin cifra», nombrando las dos', () => {
    const v = ventanaDeCuracion([
      ventana28('2026-10-08', '2026-11-04', [fila('seneca-a', 10, 1)]),
      mes('2026-10-01', '2026-10-31'),
      ventana28('2026-10-08', '2026-11-04', [fila('seneca-a', 99, 9)]),
    ]);
    expect(v.conCifra).toBe(false);
    if (!v.conCifra) {
      expect(v.motivo).toContain('las entradas 1 y 3');
      expect(v.motivo).toContain('2026-10-08–2026-11-04');
    }
  });

  it('una mensual mal formada no estorba: no es de 28 días', () => {
    const v = ventanaDeCuracion([
      ventana28('2026-10-08', '2026-11-04', []),
      { clase: 'mes', desde: 'nunca' },
    ]);
    expect(v.conCifra).toBe(true);
  });
});

describe('Historia 33.3 — las candidatas y su orden', () => {
  it('hoy, con la serie vacía: todas «sin cifra», por nombre de ficha, y ninguna demanda 0', () => {
    const informe = abierto(componer([]));
    expect(informe.candidatas.map((c) => c.ficha)).toEqual([
      'cervantes--quijote',
      'seneca--brevedad',
      'seneca--cartas',
    ]);
    expect(informe.candidatas.every((c) => c.impresiones === undefined && c.clics === undefined)).toBe(true);
    expect(informe.fuera).toBe(1);
    const parte = lineasDeCuracion(informe).join('\n');
    expect(parte).toContain('Sin cifra: la serie de demanda no tiene ninguna ventana leída.');
    expect(parte).toContain('No hay orden por demanda que dar');
    expect(parte).toContain('no es de prioridad');
    expect(parte).not.toMatch(/\b0 impresiones|\b0 clics/);
    expect(parte).toContain('Fuera por no tener edición cotejada: 1 Obra.');
    expect(parte).not.toContain('cervantes--galatea');
    expect(parte).toContain('Miguel de Cervantes');
  });

  it('con una ventana: suma por Obra, ordena por impresiones, clics y ficha, y la nombra', () => {
    const informe = abierto(
      componer([
        ventana28('2026-10-08', '2026-11-04', [
          fila('seneca-a', 30, 1),
          fila('seneca-b', 10, 2),
          fila('cervantes-a', 40, 1),
          fila('seneca-c', 7, 0),
          fila('retirada-x', 500, 50),
          fila('cervantes-suelta', 80, 8),
        ]),
      ]),
    );
    // Mismas impresiones: desempatan los clics.
    expect(informe.candidatas.map((c) => [c.ficha, c.impresiones, c.clics])).toEqual([
      ['seneca--cartas', 40, 3],
      ['cervantes--quijote', 40, 1],
      ['seneca--brevedad', 7, 0],
    ]);
    expect(informe.noCuentan).toBe(2);
    const parte = lineasDeCuracion(informe).join('\n');
    expect(parte).toContain('Ventana de 28 días: 2026-10-08 – 2026-11-04 (la más reciente de 1).');
    expect(parte).toContain('provisional');
    expect(parte).toContain('cota inferior');
    expect(parte).toContain('Página de Obra');
    expect(parte).toContain('Citas de la ventana que no cuentan (no publicadas o sin Obra): 2.');
    expect(parte).toContain('1. seneca--cartas · Título de seneca--cartas · Séneca — 40 impresiones, 3 clics');
  });

  it('a igual demanda, desempata el nombre de ficha', () => {
    const informe = abierto(
      componer([ventana28('2026-10-08', '2026-11-04', [fila('seneca-a', 5, 1), fila('cervantes-a', 5, 1)])]),
    );
    expect(informe.candidatas.map((c) => c.ficha)).toEqual([
      'cervantes--quijote',
      'seneca--cartas',
      'seneca--brevedad',
    ]);
  });

  it('dos ventanas de 28 días: cuenta solo la más reciente, sin sumar', () => {
    const informe = abierto(
      componer([
        ventana28('2026-09-01', '2026-09-28', [fila('seneca-c', 900, 90)]),
        ventana28('2026-10-08', '2026-11-04', [fila('seneca-a', 12, 1)]),
      ]),
    );
    expect(informe.candidatas[0]).toMatchObject({ ficha: 'seneca--cartas', impresiones: 12, clics: 1 });
    expect(informe.candidatas.find((c) => c.ficha === 'seneca--brevedad')).toMatchObject({ impresiones: 0 });
  });

  it('una Obra sin Citas en la ventana da 0, dicho como lectura', () => {
    const informe = abierto(componer([ventana28('2026-10-08', '2026-11-04', [fila('seneca-a', 12, 1)])]));
    expect(informe.candidatas.find((c) => c.ficha === 'cervantes--quijote')).toMatchObject({
      impresiones: 0,
      clics: 0,
    });
    expect(lineasDeCuracion(informe).join('\n')).toContain('es una lectura (cota inferior), no una ausencia');
  });

  it('una ventana vacía da 0 a todas, y lo dice como lectura', () => {
    const informe = abierto(componer([ventana28('2026-10-08', '2026-11-04', undefined, { vacia: true })]));
    expect(informe.candidatas.every((c) => c.impresiones === 0 && c.clics === 0)).toBe(true);
    expect(lineasDeCuracion(informe).join('\n')).toContain('La ventana se leyó sin ninguna fila');
  });

  it('una entrada ilegible: «sin cifra» con el motivo, por nombre de ficha', () => {
    const informe = abierto(componer([ventana28('2026-10-08', '2026-11-04', [fila('seneca-a', 12, 1)]), { clase: '28-dias' }]));
    expect(informe.candidatas.every((c) => c.impresiones === undefined)).toBe(true);
    expect(lineasDeCuracion(informe).join('\n')).toContain('la entrada 2 de la serie de demanda, de 28 días, no se deja leer');
  });

  it('congelada: lo dice con su jornada y no propone ninguna Obra', () => {
    const informe = componer([ventana28('2026-10-08', '2026-11-04', [fila('seneca-a', 12, 1)])], {
      congelacion: { desde: '2026-10-20', indexables: [] },
    });
    expect(informe).toEqual({ congelada: true, desde: '2026-10-20' });
    const parte = lineasDeCuracion(informe);
    expect(parte.join('\n')).toContain('La familia Obra está congelada por SM-11 desde el 2026-10-20');
    expect(parte.join('\n')).not.toContain('seneca--');
  });

  it('cuenta las ediciones declaradas y cuántas son de una tienda sin marca', () => {
    const tiendas: Tienda[] = [
      { clave: 'con', nombre: 'Con marca', dominio: 'con.example', parametro: 'tag', marca: 'm-21' },
      { clave: 'sin', nombre: 'Sin marca', dominio: 'sin.example', parametro: 'tag' },
    ];
    const obras = [
      obra('seneca--cartas', {
        ediciones: [
          { tienda: 'con', formato: 'impresa', url: 'https://con.example/a' },
          { tienda: 'sin', formato: 'electronica', url: 'https://sin.example/a' },
          { tienda: 'sin', formato: 'impresa', url: 'https://sin.example/b' },
        ],
      }),
      obra('seneca--brevedad'),
    ];
    const informe = abierto(componer([], { obras, tiendas }));
    expect(informe.candidatas.map((c) => [c.ficha, c.ediciones, c.deTiendaSinMarca, c.congelada])).toEqual([
      ['seneca--brevedad', 0, 0, false],
      ['seneca--cartas', 3, 2, false],
    ]);
    expect(lineasDeCuracion(informe).join('\n')).toContain('3 ediciones declaradas (2 de tienda sin marca)');
  });

  it('el Autor sin nombre en su ficha se nombra por su slug', () => {
    const informe = abierto(componer([], { autores: [{ slug: 'seneca' }] }));
    expect(informe.candidatas.find((c) => c.ficha === 'seneca--cartas')?.autor).toBe('seneca');
  });
});

describe('Historia 33.3 — npm run obra -- curar-primero sobre disco', () => {
  const temporales: string[] = [];
  afterEach(async () => {
    await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  });

  async function corpusMinimo(): Promise<string> {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-curar-primero-'));
    temporales.push(raiz);
    const corpus = join(raiz, 'corpus');
    for (const dir of ['citas', 'autores', 'temas', '_revision', 'obras']) {
      await mkdir(join(corpus, dir), { recursive: true });
    }
    await writeFile(
      join(corpus, 'autores', 'seneca.yml'),
      'nombre: Séneca\nañoFallecimiento: 65\nsemblanza: Filósofo.\nordenAlfabetico: Séneca\n',
      'utf8',
    );
    await escribirCita(join(corpus, 'citas'), 'seneca--a', {
      texto: 'Texto.',
      autor: 'seneca',
      slug: 'seneca-a',
      procedencia: { obra: 'Cartas a Lucilio', año: 64 },
      fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Cartas' },
      estadoDerechos: 'dominio-público',
    });
    await escribirCita(join(corpus, 'citas'), 'seneca--b', {
      texto: 'Otro texto.',
      autor: 'seneca',
      slug: 'seneca-b',
      procedencia: { obra: 'De la brevedad de la vida', año: 49 },
      estadoDerechos: 'dominio-público',
    });
    await writeFile(
      join(corpus, 'obras', 'seneca--cartas-a-lucilio.yml'),
      'autor: seneca\ntitulo: Cartas a Lucilio\nformas:\n  - cartas a lucilio\n',
      'utf8',
    );
    await writeFile(
      join(corpus, 'obras', 'seneca--de-la-brevedad-de-la-vida.yml'),
      'autor: seneca\ntitulo: De la brevedad de la vida\nformas:\n  - de la brevedad de la vida\n',
      'utf8',
    );
    return corpus;
  }

  async function correr(corpus: string, argumentos: string[]) {
    try {
      const { stdout, stderr } = await ejecutar(
        'npx',
        ['tsx', join(RAIZ, 'tools/obra.ts'), ...argumentos, '--corpus', corpus],
        { cwd: RAIZ },
      );
      return { codigo: 0, salida: stdout, error: stderr };
    } catch (fallo) {
      const f = fallo as { code?: number; stdout?: string; stderr?: string };
      return { codigo: f.code ?? 1, salida: f.stdout ?? '', error: f.stderr ?? '' };
    }
  }

  async function foto(corpus: string): Promise<Record<string, string>> {
    const entradas = await readdir(corpus, { recursive: true, withFileTypes: true });
    const ficheros = entradas.filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));
    const contenidos: Record<string, string> = {};
    for (const f of ficheros.sort()) contenidos[relative(corpus, f)] = await readFile(f, 'utf8');
    return contenidos;
  }

  it('sale 0 con «sin cifra», no propone la Obra sin edición cotejada y no cambia ningún fichero', async () => {
    const corpus = await corpusMinimo();
    await writeFile(join(corpus, 'serie-de-demanda.yml'), '# cabecera\nlecturas:\n', 'utf8');
    const antes = await foto(corpus);

    const r = await correr(corpus, ['curar-primero']);
    expect(r.codigo, r.error).toBe(0);
    expect(r.salida).toContain('1. seneca--cartas-a-lucilio · Cartas a Lucilio · Séneca — sin cifra');
    expect(r.salida).toContain('la serie de demanda no tiene ninguna ventana leída');
    expect(r.salida).toContain('Fuera por no tener edición cotejada: 1 Obra.');
    expect(r.salida).not.toContain('brevedad');
    expect(await foto(corpus)).toEqual(antes);
  });

  it('sin el fichero de la serie, igual que la serie vacía', async () => {
    const corpus = await corpusMinimo();
    const antes = await foto(corpus);
    const r = await correr(corpus, ['curar-primero']);
    expect(r.codigo, r.error).toBe(0);
    expect(r.salida).toContain('sin cifra');
    expect(await foto(corpus)).toEqual(antes);
  });

  it('una serie que no es YAML sale 1 por stderr, nombrándola, sin escribir', async () => {
    const corpus = await corpusMinimo();
    await writeFile(join(corpus, 'serie-de-demanda.yml'), 'lecturas: [\n', 'utf8');
    const antes = await foto(corpus);
    const r = await correr(corpus, ['curar-primero']);
    expect(r.codigo).toBe(1);
    expect(r.error).toContain('corpus/serie-de-demanda.yml');
    expect(r.salida).toBe('');
    expect(await foto(corpus)).toEqual(antes);
  });

  it.each([
    ['sin la clave «lecturas:»', 'otra: 1\n'],
    ['«lecturas» que no es lista', 'lecturas: 3\n'],
  ])('una serie %s sale 1', async (_c, contenido) => {
    const corpus = await corpusMinimo();
    await writeFile(join(corpus, 'serie-de-demanda.yml'), contenido, 'utf8');
    const r = await correr(corpus, ['curar-primero']);
    expect(r.codigo).toBe(1);
    expect(r.error).toContain('corpus/serie-de-demanda.yml');
  });

  it('una ficha ilegible sale 1 nombrando las fichas de Obra', async () => {
    const corpus = await corpusMinimo();
    await writeFile(join(corpus, 'obras', 'seneca--rota.yml'), 'autor: [\n', 'utf8');
    const r = await correr(corpus, ['curar-primero']);
    expect(r.codigo).toBe(1);
    expect(r.error).toContain('las fichas de Obra');
  });

  it('con una ventana escrita por registrarLecturaDeDemanda, ordena por su demanda sobre el Corpus real', async () => {
    const corpus = await corpusMinimo();
    // Una tercera Obra con edición cotejada, y una Cita retirada a `_revision/` cuyo slug sigue en la ventana.
    await escribirCita(join(corpus, 'citas'), 'seneca--c', {
      texto: 'Tercer texto.',
      autor: 'seneca',
      slug: 'seneca-c',
      procedencia: { obra: 'Sobre la ira', año: 41 },
      fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Ira' },
      estadoDerechos: 'dominio-público',
    });
    await writeFile(
      join(corpus, 'obras', 'seneca--sobre-la-ira.yml'),
      'autor: seneca\ntitulo: Sobre la ira\nformas:\n  - sobre la ira\n',
      'utf8',
    );
    await escribirCita(join(corpus, '_revision'), 'seneca--retirada', {
      texto: 'Texto retirado.',
      autor: 'seneca',
      slug: 'seneca-retirada',
      procedencia: { obra: 'Sobre la ira', año: 41 },
      estadoDerechos: 'dominio-público',
    });
    const citas = [
      { cita: 'seneca-a', clics: 2, impresiones: 40 },
      { cita: 'seneca-retirada', clics: 9, impresiones: 90 },
      { cita: 'seneca-c', clics: 1, impresiones: 12 },
      { cita: 'seneca-b', clics: 0, impresiones: 7 },
    ];
    const sumas = { clics: 12, impresiones: 149 };
    const ventana = (desde: string, hasta: string, clase: '28-dias' | 'mes', filas: typeof citas) => ({
      desde,
      hasta,
      clase,
      leidoEl: '2026-11-07',
      propiedad: 'sc-domain:ejemplo.example',
      autores: [{ autor: 'seneca', ...sumas }],
      citas: filas,
      sinAutor: { rutas: 0, clics: 0, impresiones: 0 },
      resto: { filas: 0, clics: 0, impresiones: 0 },
      familias: { cita: sumas },
      fueraDelCenso: { clics: 0, impresiones: 0 },
      slugsSinAutor: [],
      citasConClic: [],
    });
    await registrarLecturaDeDemanda(rutasDelCorpus(corpus), {
      propiedad: 'sc-domain:ejemplo.example',
      leidoEl: '2026-11-07',
      primeraLectura: true,
      ventanas: [
        ventana('2026-10-08', '2026-11-04', '28-dias', citas),
        // Una más antigua, con otro orden: ni se usa ni se suma.
        ventana('2026-09-01', '2026-09-28', '28-dias', [{ cita: 'seneca-c', clics: 9, impresiones: 999 }]),
        ventana('2026-10-01', '2026-10-31', 'mes', [{ cita: 'seneca-c', clics: 9, impresiones: 999 }]),
      ],
      sinLeer: [],
    });
    const antes = await foto(corpus);

    const r = await correr(corpus, ['curar-primero']);
    expect(r.codigo, r.error).toBe(0);
    expect(r.salida).toContain('Ventana de 28 días: 2026-10-08 – 2026-11-04 (la más reciente de 2).');
    expect(r.salida).toContain(
      '1. seneca--cartas-a-lucilio · Cartas a Lucilio · Séneca — 40 impresiones, 2 clics · 0 ediciones declaradas',
    );
    expect(r.salida).toContain('2. seneca--sobre-la-ira · Sobre la ira · Séneca — 12 impresiones, 1 clic');
    expect(r.salida).not.toContain('brevedad');
    expect(r.salida).not.toContain('sin cifra');
    expect(r.salida).toContain('Citas de la ventana que no cuentan (no publicadas o sin Obra): 1.');
    expect(await foto(corpus)).toEqual(antes);
  });

  it('una bandera desconocida o un argumento de más salen 2', async () => {
    const corpus = await corpusMinimo();
    expect((await correr(corpus, ['curar-primero', '--bandera'])).codigo).toBe(2);
    expect((await correr(corpus, ['curar-primero', 'algo'])).codigo).toBe(2);
  });
});

describe('Historia 33.3 — curarPrimero con los efectos inyectados (AD-22)', () => {
  const RUTAS = rutasDelCorpus('/no/existe/corpus');
  const vacio = {
    leerCitas: async () => [],
    leerAutores: async () => [],
    leerFichasDeObra: async () => [],
    leerEntradas: async () => [],
  };

  it('congelada: lo dice con su jornada, no propone ninguna Obra y termina bien', async () => {
    const r = await curarPrimero(RUTAS, vacio, { congelacion: { desde: '2026-11-01', indexables: [] } });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mensaje).toContain('congelada por SM-11 desde el 2026-11-01');
      expect(r.mensaje).not.toMatch(/^1\. /m);
    }
  });

  it('«congelacion: null» fuerza que no la haya, sin leer la del repositorio', async () => {
    const r = await curarPrimero(RUTAS, vacio, { congelacion: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mensaje).toContain('Qué Obras curar primero: 0 Obras publicadas');
  });

  it.each([
    ['leerCitas', 'las Citas publicadas'],
    ['leerAutores', 'los Autores'],
    ['leerFichasDeObra', 'las fichas de Obra'],
    ['leerEntradas', 'corpus/serie-de-demanda.yml'],
  ] as const)('si %s falla, no sale bien y nombra %s', async (efecto, que) => {
    const r = await curarPrimero(
      RUTAS,
      { ...vacio, [efecto]: async () => Promise.reject(new Error('roto')) },
      { congelacion: null },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.motivos[0]).toBe(`No se pudo leer ${que}: roto`);
      expect(r.motivos).toContain('No se ha escrito nada.');
    }
  });
});
