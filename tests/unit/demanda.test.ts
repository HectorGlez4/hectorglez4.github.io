import { afterEach, describe, expect, it, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { parse as parsearYaml } from 'yaml';
import { DOMINIO } from '../../src/lib/dominio.ts';
import {
  CABECERA_DE_DEMANDA,
  FICHERO_DE_DEMANDA,
  leerSerieDeDemanda,
  registrarLecturaDeDemanda,
  rutasDelCorpus,
} from '../../tools/lib/corpus.ts';
import {
  SALIDA_SIN_CREDENCIALES,
  VARIABLE_DE_CREDENCIALES,
  type CensoPorFamilia,
} from '../../tools/lib/indexacion.ts';
import { FILAS_POR_PAGINA, type FilaDeTrafico, type PeticionDeTrafico } from '../../tools/lib/trafico.ts';
import { autorPorPrefijo } from '../../tools/lib/autoria.ts';
import {
  MIN_IMPRESIONES_POR_FILA,
  agregarDemanda,
  componerLecturaDeDemanda,
  ventanasALeer,
} from '../../tools/lib/demanda.ts';
import { principal } from '../../tools/demanda.ts';
import type { Consultar } from '../../tools/trafico.ts';

const ejecutar = promisify(execFile);
const RAIZ = resolve(import.meta.dirname, '../..');

/**
 * Historia 20.3 — la serie de demanda por página, entera y sin red.
 *
 * Cada fila de la matriz se recorre con respuestas fijas: la red entra por un solo sitio —el
 * `Consultar` que `principal` recibe— y eso es lo que AD-22 manda.
 */

const temporales: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  const { rm } = await import('node:fs/promises');
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

/** El 9 de octubre de 2026, a mediodía local. La ventana de 28 días es 09-09 → 10-06. */
const HOY = new Date(2026, 9, 9, 12, 0);
const MOVIL = { desde: '2026-09-09', hasta: '2026-10-06', clase: '28-dias' };

const CREDENCIAL = { [VARIABLE_DE_CREDENCIALES]: '{"type":"service_account"}' };

const AUTOR = (nombre: string) =>
  `nombre: "${nombre}"\nañoFallecimiento: 65\nsemblanza: "Semblanza de prueba."\ntradicion: "peninsular"\n`;

/** Dos Autores que se pisan el prefijo, y una Cita publicada de cada uno. */
async function corpusDePrueba(): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-demanda-'));
  temporales.push(raiz);
  const corpus = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', 'colecciones']) {
    await mkdir(join(corpus, dir), { recursive: true });
  }
  await writeFile(join(corpus, 'autores', 'seneca.yml'), AUTOR('Séneca'), 'utf8');
  await writeFile(join(corpus, 'autores', 'seneca-el-viejo.yml'), AUTOR('Séneca el Viejo'), 'utf8');
  await writeFile(join(corpus, 'temas', 'la-vida.yml'), 'nombre: "La vida"\n', 'utf8');
  for (const [slug, autor] of [
    ['seneca-no-es-que-tengamos-poco-tiempo', 'seneca'],
    ['seneca-el-viejo-la-fortuna', 'seneca-el-viejo'],
  ]) {
    await writeFile(
      join(corpus, 'citas', `${slug}.md`),
      ['---', `slug: "${slug}"`, `texto: "Texto de ${slug}."`, `autor: "${autor}"`, 'temas:', '  - la-vida', '---', ''].join('\n'),
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

/**
 * Filas por página fijas: las dos Citas publicadas, una retirada de Séneca, una sin Autor,
 * una pequeña, la Página de Autor y la portada.
 */
const FILAS_FIJAS: FilaDeTrafico[] = [
  { keys: [URL('/cita/seneca-no-es-que-tengamos-poco-tiempo/')], clicks: 1, impressions: 90, position: 8 },
  { keys: [URL('/cita/seneca-el-viejo-la-fortuna/')], clicks: 2, impressions: 40, position: 12 },
  { keys: [URL('/cita/seneca-x/')], clicks: 0, impressions: 30, position: 20 },
  { keys: [URL('/cita/desconocido-algo/')], clicks: 0, impressions: 7, position: 40 },
  { keys: [URL('/cita/seneca-pequena/')], clicks: 1, impressions: 3, position: 50 },
  { keys: [URL('/autor/seneca/')], clicks: 4, impressions: 60, position: 6 },
  { keys: [URL('/')], clicks: 5, impressions: 20, position: 2 },
];

/**
 * Una fuente de mentira: contesta por el `startDate`/`endDate` de cada petición, y lanza
 * para las ventanas que se le digan (por su `desde`).
 */
function fuente(fallos: string[] = [], filas: FilaDeTrafico[] = FILAS_FIJAS) {
  const peticiones: PeticionDeTrafico[] = [];
  const consultar: Consultar = async (peticion) => {
    peticiones.push(peticion);
    if (fallos.includes(peticion.startDate)) {
      throw Object.assign(new Error('Internal error'), { code: 500 });
    }
    return filas;
  };
  return { consultar, peticiones };
}

const conCliente = (consultar: Consultar) => async () => consultar;

// ─── Lo puro ─────────────────────────────────────────────────────────────────────────

describe('las ventanas', () => {
  it('la de 28 días termina en el último día con datos definitivos y empieza 27 antes', () => {
    expect(ventanasALeer(HOY, false)).toEqual([MOVIL]);
    // Cruzando un cambio de mes y de año.
    expect(ventanasALeer(new Date(2027, 0, 2, 12, 0), false)).toEqual([
      { desde: '2026-12-03', hasta: '2026-12-30', clase: '28-dias' },
    ]);
  });

  it('la primera lectura añade los meses cerrados de los 16, sin el mes en curso', () => {
    const ventanas = ventanasALeer(HOY, true);
    const meses = ventanas.filter((v) => v.clase === 'mes');
    expect(meses).toHaveLength(15);
    expect(meses[0]).toEqual({ desde: '2025-07-01', hasta: '2025-07-31', clase: 'mes' });
    expect(meses.at(-1)).toEqual({ desde: '2026-09-01', hasta: '2026-09-30', clase: 'mes' });
    expect(ventanas.at(-1)).toEqual(MOVIL);
  });

  it('un mes cuyo último día cae dentro del retardo no está cerrado', () => {
    const meses = ventanasALeer(new Date(2026, 9, 2, 12, 0), true).filter((v) => v.clase === 'mes');
    expect(meses).toHaveLength(14);
    expect(meses.at(-1)?.desde).toBe('2026-08-01');
  });
});

describe('la regla del prefijo, en su dueño compartido', () => {
  it('gana el prefijo más largo, y un prefijo sin guion no cuenta', () => {
    const autores = ['seneca', 'seneca-el-viejo'];
    expect(autorPorPrefijo('seneca-el-viejo-la-fortuna', autores)).toBe('seneca-el-viejo');
    expect(autorPorPrefijo('seneca-no-es-que', autores)).toBe('seneca');
    expect(autorPorPrefijo('senecaz-algo', autores)).toBeUndefined();
    expect(autorPorPrefijo('desconocido-algo', autores)).toBeUndefined();
    // Estricto, como antes en gestion.ts: un slug igual al del Autor no es suyo.
    expect(autorPorPrefijo('seneca', autores)).toBeUndefined();
    expect(autorPorPrefijo('seneca-el-viejo', autores)).toBe('seneca');
  });

  it('tools/lib/gestion.ts lo importa en vez de copiarlo', () => {
    const gestion = readFileSync(resolve(RAIZ, 'tools/lib/gestion.ts'), 'utf8');
    expect(gestion).toMatch(/import \{ autorPorPrefijo \} from '\.\/autoria\.ts'/);
    expect(gestion).not.toMatch(/b\.length - a\.length/);
  });
});

const CENSO: CensoPorFamilia = {
  cita: ['/cita/seneca-no-es-que-tengamos-poco-tiempo/', '/cita/seneca-el-viejo-la-fortuna/'],
  autor: ['/autor/seneca/', '/autor/seneca-el-viejo/'],
  tema: [],
  coleccion: [],
};
const OPCIONES = { slugsDeAutores: ['seneca', 'seneca-el-viejo'], censo: CENSO, dominio: DOMINIO };

describe('el reparto de una ventana', () => {
  const agregado = agregarDemanda(FILAS_FIJAS, OPCIONES);

  it('prefijo más largo: la Cita de Séneca el Viejo no es de Séneca', () => {
    expect(agregado.autores).toEqual([
      // Séneca: 90 + 30 (retirada) + 3 (pequeña). Por impresiones descendentes.
      { autor: 'seneca', clics: 2, impresiones: 123 },
      { autor: 'seneca-el-viejo', clics: 2, impresiones: 40 },
    ]);
  });

  it('sin Autor: va a sinAutor con sus rutas, y se nombra', () => {
    expect(agregado.sinAutor).toEqual({ rutas: 1, clics: 0, impresiones: 7 });
    expect(agregado.slugsSinAutor).toEqual(['desconocido-algo']);
  });

  it('fila pequeña: fuera de citas, sumada en resto, y sí cuenta en su Autor', () => {
    expect(agregado.citas.map((c) => c.cita)).not.toContain('seneca-pequena');
    expect(agregado.resto).toEqual({ filas: 1, clics: 1, impresiones: 3 });
    expect(MIN_IMPRESIONES_POR_FILA).toBe(5);
    // Pero en el informe, si tiene clic, sale.
    expect(agregado.citasConClic.map((c) => c.cita)).toContain('seneca-pequena');
  });

  it('Cita retirada: atribuida a su Autor y, por familia, fuera del censo', () => {
    expect(agregado.citas).toContainEqual({ cita: 'seneca-x', clics: 0, impresiones: 30 });
    // Fuera del censo: la retirada (30), la sin Autor (7), la pequeña (3) y la portada (20).
    expect(agregado.fueraDelCenso).toEqual({ clics: 6, impresiones: 60 });
    expect(agregado.familias.cita).toMatchObject({ clics: 3, impresiones: 130 });
    expect(agregado.familias.autor).toMatchObject({ clics: 4, impresiones: 60 });
  });

  it('las Citas, por impresiones descendentes, y Σ citas + resto = Σ autores', () => {
    expect(agregado.citas.map((c) => c.cita)).toEqual([
      'seneca-no-es-que-tengamos-poco-tiempo',
      'seneca-el-viejo-la-fortuna',
      'seneca-x',
    ]);
    const suma = (xs: { impresiones: number }[]) => xs.reduce((s, x) => s + x.impresiones, 0);
    expect(suma([...agregado.citas, agregado.resto])).toBe(suma(agregado.autores));
  });

  it('las dos formas de una misma ruta se juntan, y otro host no es de ningún Autor', () => {
    const { citas, autores, resto, fueraDelCenso } = agregarDemanda(
      [
        { keys: [URL('/cita/seneca-dos-formas/')], clicks: 0, impressions: 3 },
        { keys: [URL('/cita/seneca-dos-formas')], clicks: 0, impressions: 3 },
        { keys: [`https://www.${DOMINIO}/cita/seneca-otra/`], clicks: 9, impressions: 99 },
      ],
      OPCIONES,
    );
    expect(citas).toEqual([{ cita: 'seneca-dos-formas', clics: 0, impresiones: 6 }]);
    expect(autores).toEqual([{ autor: 'seneca', clics: 0, impresiones: 6 }]);
    expect(resto.filas).toBe(0);
    // La fila www. y las dos formas (que no están en el censo) acaban fuera del censo.
    expect(fueraDelCenso).toEqual({ clics: 9, impresiones: 105 });
  });

  it('resto cuenta Citas, no filas: las dos formas de una ruta pequeña son una', () => {
    const { resto } = agregarDemanda(
      [
        { keys: [URL('/cita/seneca-chica/')], clicks: 0, impressions: 1 },
        { keys: [URL('/cita/seneca-chica')], clicks: 0, impressions: 1 },
      ],
      OPCIONES,
    );
    expect(resto).toEqual({ filas: 1, clics: 0, impresiones: 2 });
  });

  it('la ruta se decodifica y se pasa a minúsculas antes de atribuir', () => {
    const { citas, autores } = agregarDemanda(
      [
        { keys: [URL('/cita/Seneca-El-Viejo-La-Fortuna/')], clicks: 1, impressions: 10 },
        { keys: [URL('/cita/seneca-el-viejo-la-fortuna%2F')], clicks: 0, impressions: 5 },
        { keys: [URL('/cita/seneca-roto%E0%A4%A/')], clicks: 0, impressions: 5 },
      ],
      OPCIONES,
    );
    expect(citas).toContainEqual({ cita: 'seneca-el-viejo-la-fortuna', clics: 1, impresiones: 15 });
    expect(citas).toContainEqual({ cita: 'seneca-roto%e0%a4%a', clics: 0, impresiones: 5 });
    expect(autores[0]).toEqual({ autor: 'seneca-el-viejo', clics: 1, impresiones: 15 });
  });

  it('sin ningún Autor en el corpus, toda ruta de Cita va a sinAutor', () => {
    const agregado = agregarDemanda(FILAS_FIJAS, { ...OPCIONES, slugsDeAutores: [] });
    expect(agregado.autores).toEqual([]);
    expect(agregado.citas).toEqual([]);
    expect(agregado.resto).toEqual({ filas: 0, clics: 0, impresiones: 0 });
    expect(agregado.sinAutor).toEqual({ rutas: 5, clics: 4, impresiones: 170 });
  });

  it('la composición se niega a una ventana al revés o mal formada', () => {
    const base = { momento: HOY, propiedad: 'p', agregado };
    expect(() =>
      componerLecturaDeDemanda({ ...base, ventana: { desde: '2026-10-06', hasta: '2026-09-09', clase: '28-dias' } }),
    ).toThrow(/empieza después/);
    expect(() =>
      componerLecturaDeDemanda({ ...base, ventana: { desde: '2026-9-9', hasta: '2026-10-06', clase: '28-dias' } }),
    ).toThrow(/AAAA-MM-DD/);
    expect(() =>
      componerLecturaDeDemanda({
        ...base,
        agregado: { ...agregado, resto: { filas: 0, clics: 0, impresiones: 0 } },
        ventana: { desde: '2026-09-09', hasta: '2026-10-06', clase: '28-dias' },
      }),
    ).toThrow(/contada en un sitio y no en el otro/);
  });
});

// ─── La orden ────────────────────────────────────────────────────────────────────────

describe('la orden', () => {
  it('sin credencial: nombra la variable y DESPLIEGUE §5, no escribe y sale con 2', async () => {
    const corpus = await corpusDePrueba();
    for (const extra of [[], ['--registrar']]) {
      const salida = capturarSalida();
      const codigo = await principal(['--corpus', corpus, ...extra], conCliente(fuente().consultar), {}, HOY);
      expect(codigo).toBe(SALIDA_SIN_CREDENCIALES);
      expect(codigo).toBe(2);
      expect(salida.join('')).toMatch(new RegExp(VARIABLE_DE_CREDENCIALES));
      expect(salida.join('')).toMatch(/DESPLIEGUE\.md §5/);
      vi.restoreAllMocks();
    }
    expect(existsSync(join(corpus, FICHERO_DE_DEMANDA))).toBe(false);
  });

  it('una bandera mala: uso por stderr, código 2 y nada escrito', async () => {
    const corpus = await corpusDePrueba();
    const salida = capturarSalida();
    expect(
      await principal(['--corpus', corpus, '--registrar', '--meses', '3'], conCliente(fuente().consultar), CREDENCIAL, HOY),
    ).toBe(2);
    expect(salida.join('')).toMatch(/npx tsx tools\/demanda\.ts/);
    expect(existsSync(join(corpus, FICHERO_DE_DEMANDA))).toBe(false);
  });

  it('--json --registrar incluye el registro', async () => {
    const corpus = await corpusDePrueba();
    const salida = capturarSalida();
    expect(
      await principal(['--corpus', corpus, '--json', '--registrar'], conCliente(fuente().consultar), CREDENCIAL, HOY),
    ).toBe(0);
    const { lectura, registro } = JSON.parse(salida.join(''));
    expect(registro).toBe(join(corpus, FICHERO_DE_DEMANDA));
    expect(lectura.ventanas).toHaveLength(16);
  });

  it('--ayuda da 0 y el uso', async () => {
    const salida = capturarSalida();
    expect(await principal(['--ayuda'], conCliente(fuente().consultar), {}, HOY)).toBe(0);
    expect(salida.join('')).toMatch(/npx tsx tools\/demanda\.ts/);
  });

  it('consulta: informa Autores, Citas con clic, familias, sinAutor, resto, y no escribe', async () => {
    const corpus = await corpusDePrueba();
    const salida = capturarSalida();
    const { consultar, peticiones } = fuente();

    const codigo = await principal(['--corpus', corpus], conCliente(consultar), CREDENCIAL, HOY);

    expect(codigo).toBe(0);
    const texto = salida.join('');
    expect(texto).toMatch(/Primera lectura/);
    expect(texto).toMatch(/2026-09-09 — 2026-10-06 \(últimos 28 días/);
    expect(texto).toMatch(/seneca: 123 impresiones, 2 clics\n\s+seneca-el-viejo: 40 impresiones/);
    expect(texto).toMatch(/seneca-el-viejo-la-fortuna: 2 clics, 40 impresiones/);
    expect(texto).toMatch(/seneca-pequena: 1 clics, 3 impresiones —bajo el umbral/);
    expect(texto).toMatch(/Cita: +3 clics, 130 impresiones/);
    expect(texto).toMatch(/Fuera del censo: 6 clics, 60 impresiones/);
    expect(texto).toMatch(/Resto .*: 1 Citas, 1 clics, 3 impresiones/);
    expect(texto).toMatch(/Sin Autor .*: 1 rutas, 0 clics, 7 impresiones\n\s+\/cita\/desconocido-algo\//);
    expect(texto).toMatch(/Consulta: no se ha escrito nada\./);
    expect(existsSync(join(corpus, FICHERO_DE_DEMANDA))).toBe(false);

    // Por página, final, web, byPage — y nunca por consulta.
    for (const p of peticiones) {
      expect(p).toMatchObject({
        dimensions: ['page'],
        dataState: 'final',
        type: 'web',
        aggregationType: 'byPage',
        rowLimit: FILAS_POR_PAGINA,
        startRow: 0,
      });
    }
  });

  it('primera lectura: la ventana de 28 días y los 15 meses cerrados, cada uno una entrada', async () => {
    const corpus = await corpusDePrueba();
    capturarSalida();

    const codigo = await principal(['--corpus', corpus, '--registrar'], conCliente(fuente().consultar), CREDENCIAL, HOY);
    expect(codigo).toBe(0);

    const escrito = await readFile(join(corpus, FICHERO_DE_DEMANDA), 'utf8');
    expect(escrito.startsWith(CABECERA_DE_DEMANDA)).toBe(true);
    const { lecturas } = parsearYaml(escrito);
    expect(lecturas).toHaveLength(16);
    expect(lecturas.filter((e: { clase: string }) => e.clase === 'mes')).toHaveLength(15);
    const movil = lecturas.find((e: { clase: string }) => e.clase === '28-dias');
    expect(movil).toMatchObject({ ...MOVIL, leidoEl: '2026-10-09' });
    expect(movil.propiedad).toMatch(/^sc-domain:/);
    expect(movil.autores[0]).toEqual({ autor: 'seneca', clics: 2, impresiones: 123 });
    expect(movil.citas).toHaveLength(3);
    expect(movil.sinAutor).toEqual({ rutas: 1, clics: 0, impresiones: 7 });
    expect(movil.resto).toEqual({ filas: 1, clics: 1, impresiones: 3 });
    expect(movil.fueraDelCenso).toEqual({ clics: 6, impresiones: 60 });
    expect(Object.keys(movil.familias)).toEqual(['cita', 'autor']);
    // Lo que es solo del informe no se escribe.
    expect(escrito).not.toMatch(/slugsSinAutor|citasConClic/);
  });

  it('lectura siguiente: la serie ya tiene meses, solo se lee la ventana de 28 días', async () => {
    const corpus = await corpusDePrueba();
    capturarSalida();
    await principal(['--corpus', corpus, '--registrar'], conCliente(fuente().consultar), CREDENCIAL, HOY);

    const salida = capturarSalida();
    const { consultar, peticiones } = fuente();
    const otroDia = new Date(2026, 9, 12, 12, 0);
    expect(await principal(['--corpus', corpus, '--registrar'], conCliente(consultar), CREDENCIAL, otroDia)).toBe(0);

    expect(peticiones.map((p) => [p.startDate, p.endDate])).toEqual([['2026-09-12', '2026-10-09']]);
    expect(salida.join('')).toMatch(/solo se lee la ventana de 28 días/);
    const serie = await leerSerieDeDemanda(rutasDelCorpus(corpus));
    expect(serie).toHaveLength(17);
    expect(serie.filter((e) => e.clase === '28-dias').map((e) => e.desde)).toEqual(['2026-09-09', '2026-09-12']);
  });

  it('mismo día dos veces: una sola entrada de 28 días, la nueva', async () => {
    const corpus = await corpusDePrueba();
    capturarSalida();
    await principal(['--corpus', corpus, '--registrar'], conCliente(fuente().consultar), CREDENCIAL, HOY);
    const otra = fuente([], [{ keys: [URL('/cita/seneca-no-es-que-tengamos-poco-tiempo/')], clicks: 7, impressions: 70 }]);
    await principal(['--corpus', corpus, '--registrar'], conCliente(otra.consultar), CREDENCIAL, HOY);

    const serie = await leerSerieDeDemanda(rutasDelCorpus(corpus));
    const moviles = serie.filter((e) => e.clase === '28-dias');
    expect(moviles).toHaveLength(1);
    expect(moviles[0]).toMatchObject(MOVIL);
    expect(moviles[0].autores).toEqual([{ autor: 'seneca', clics: 7, impresiones: 70 }]);
    expect(serie).toHaveLength(16);
  });

  it('una ventana que falla no se escribe, va a sinLeer con su motivo y sale con 0', async () => {
    const corpus = await corpusDePrueba();
    const salida = capturarSalida();

    const codigo = await principal(
      ['--corpus', corpus, '--registrar'],
      conCliente(fuente(['2026-08-01']).consultar),
      CREDENCIAL,
      HOY,
    );

    expect(codigo).toBe(0);
    expect(salida.join('')).toMatch(/Ventanas sin leer/);
    expect(salida.join('')).toMatch(/2026-08-01 — 2026-08-31 \(mes cerrado\): la fuente no respondió: Internal error/);
    const serie = await leerSerieDeDemanda(rutasDelCorpus(corpus));
    expect(serie).toHaveLength(15);
    expect(serie.some((e) => e.desde === '2026-08-01')).toBe(false);
  });

  it('una ventana que falla conserva la entrada anterior de esa ventana', async () => {
    const corpus = await corpusDePrueba();
    capturarSalida();
    await principal(['--corpus', corpus, '--registrar'], conCliente(fuente().consultar), CREDENCIAL, HOY);
    const antes = await readFile(join(corpus, FICHERO_DE_DEMANDA), 'utf8');

    // Mismo día: solo la ventana de 28 días, y falla. Nada legible → 1, fichero intacto.
    const salida = capturarSalida();
    const codigo = await principal(
      ['--corpus', corpus, '--registrar'],
      conCliente(fuente([MOVIL.desde]).consultar),
      CREDENCIAL,
      HOY,
    );
    expect(codigo).toBe(1);
    expect(salida.join('')).toMatch(/No se pudo leer ninguna ventana/);
    expect(await readFile(join(corpus, FICHERO_DE_DEMANDA), 'utf8')).toBe(antes);
  });

  it('una ventana sin ninguna fila es una lectura: se escribe vacía, sin Autores, y no va a sinLeer', async () => {
    const corpus = await corpusDePrueba();
    const salida = capturarSalida();
    const consultar: Consultar = async (p) => (p.startDate === MOVIL.desde ? [] : FILAS_FIJAS);

    expect(await principal(['--corpus', corpus, '--registrar'], conCliente(consultar), CREDENCIAL, HOY)).toBe(0);
    expect(salida.join('')).not.toMatch(/Ventanas sin leer/);
    expect(salida.join('')).toMatch(/Vacía: la fuente contestó sin ninguna fila/);
    const serie = await leerSerieDeDemanda(rutasDelCorpus(corpus));
    expect(serie).toHaveLength(16);
    const movil = serie.find((e) => e.clase === '28-dias');
    expect(movil).toMatchObject({ ...MOVIL, vacia: true });
    expect(movil?.autores).toBeUndefined();
    expect(movil?.citas).toBeUndefined();
    expect(movil?.resto).toEqual({ filas: 0, clics: 0, impresiones: 0 });
    // Los meses con filas no llevan la marca.
    expect(serie.filter((e) => e.vacia === true)).toHaveLength(1);
  });

  it('una primera lectura toda vacía no se repite: la siguiente ya no pide los meses', async () => {
    const corpus = await corpusDePrueba();
    capturarSalida();
    await principal(['--corpus', corpus, '--registrar'], conCliente(fuente([], []).consultar), CREDENCIAL, HOY);
    const { consultar, peticiones } = fuente();
    await principal(['--corpus', corpus], conCliente(consultar), CREDENCIAL, new Date(2026, 9, 12, 12, 0));
    expect(peticiones).toHaveLength(1);
  });

  it('si el reparto de una ventana no se puede componer, va a sinLeer y las demás siguen', async () => {
    const corpus = await corpusDePrueba();
    const salida = capturarSalida();
    // Una respuesta mal formada: impresiones que no son un número descuadran la suma.
    const consultar: Consultar = async (p) =>
      p.startDate === '2026-08-01'
        ? [{ keys: [URL('/cita/seneca-x/')], clicks: 0, impressions: Number.NaN }]
        : FILAS_FIJAS;

    expect(await principal(['--corpus', corpus, '--registrar'], conCliente(consultar), CREDENCIAL, HOY)).toBe(0);
    expect(salida.join('')).toMatch(/2026-08-01 — 2026-08-31 \(mes cerrado\): el reparto no se pudo componer/);
    const serie = await leerSerieDeDemanda(rutasDelCorpus(corpus));
    expect(serie).toHaveLength(15);
    expect(serie.some((e) => e.desde === '2026-08-01')).toBe(false);
  });

  it('--rellenar pide el mes que falló en la primera lectura; un fallo parcial conserva la de 28 días previa', async () => {
    const corpus = await corpusDePrueba();
    capturarSalida();
    await principal(['--corpus', corpus, '--registrar'], conCliente(fuente(['2026-08-01']).consultar), CREDENCIAL, HOY);
    const previa = (await leerSerieDeDemanda(rutasDelCorpus(corpus))).find((e) => e.clase === '28-dias');

    // Sin --rellenar, al día siguiente solo se pide la de 28 días.
    const sinBandera = fuente();
    await principal(['--corpus', corpus], conCliente(sinBandera.consultar), CREDENCIAL, new Date(2026, 9, 10, 12, 0));
    expect(sinBandera.peticiones.map((p) => p.startDate)).toEqual(['2026-09-10']);

    // Con --rellenar, la de 28 días de ese día falla y agosto se lee.
    const salida = capturarSalida();
    const { consultar, peticiones } = fuente(['2026-09-10']);
    const codigo = await principal(
      ['--corpus', corpus, '--registrar', '--rellenar'],
      conCliente(consultar),
      CREDENCIAL,
      new Date(2026, 9, 10, 12, 0),
    );
    expect(codigo).toBe(0);
    expect(peticiones.map((p) => p.startDate)).toEqual(['2026-08-01', '2026-09-10']);
    expect(salida.join('')).toMatch(/Rellenar/);

    const serie = await leerSerieDeDemanda(rutasDelCorpus(corpus));
    expect(serie.filter((e) => e.clase === 'mes')).toHaveLength(15);
    expect(serie.find((e) => e.desde === '2026-08-01')?.leidoEl).toBe('2026-10-10');
    expect(serie.filter((e) => e.clase === '28-dias')).toEqual([previa]);
  });

  it('--rellenar añade el mes que se cerró después de la primera lectura', async () => {
    const corpus = await corpusDePrueba();
    capturarSalida();
    await principal(['--corpus', corpus, '--registrar'], conCliente(fuente().consultar), CREDENCIAL, HOY);

    const { consultar, peticiones } = fuente();
    const noviembre = new Date(2026, 10, 10, 12, 0);
    await principal(['--corpus', corpus, '--registrar', '--rellenar'], conCliente(consultar), CREDENCIAL, noviembre);

    // Octubre es el único mes cerrado de los 16 que falta; julio de 2025 ya no está en la fuente.
    expect(peticiones.map((p) => [p.startDate, p.endDate])).toEqual([
      ['2026-10-01', '2026-10-31'],
      ['2026-10-11', '2026-11-07'],
    ]);
    const serie = await leerSerieDeDemanda(rutasDelCorpus(corpus));
    expect(serie.filter((e) => e.clase === 'mes')).toHaveLength(16);
  });

  it('nada legible: nada escrito y código 1', async () => {
    const corpus = await corpusDePrueba();
    const salida = capturarSalida();
    const consultar: Consultar = async () => {
      throw Object.assign(new Error('Internal error'), { code: 500 });
    };

    expect(await principal(['--corpus', corpus, '--registrar'], conCliente(consultar), CREDENCIAL, HOY)).toBe(1);
    expect(salida.join('')).toMatch(/No se pudo leer ninguna ventana\. No se ha escrito nada\./);
    expect(existsSync(join(corpus, FICHERO_DE_DEMANDA))).toBe(false);
  });

  it('pagina con startRow hasta recibir menos de rowLimit', async () => {
    const corpus = await corpusDePrueba();
    await writeFile(join(corpus, FICHERO_DE_DEMANDA), `${CABECERA_DE_DEMANDA}  - desde: "2025-07-01"\n    hasta: "2025-07-31"\n    clase: "mes"\n    propiedad: "p"\n`, 'utf8');
    const llena: FilaDeTrafico[] = Array.from({ length: FILAS_POR_PAGINA }, () => ({
      keys: [URL('/cita/seneca-no-es-que-tengamos-poco-tiempo/')],
      clicks: 0,
      impressions: 1,
    }));
    const pedidas: number[] = [];
    const consultar: Consultar = async (p) => {
      pedidas.push(p.startRow ?? -1);
      return p.startRow === 0 ? llena : [FILAS_FIJAS[0]];
    };
    const salida = capturarSalida();
    await principal(['--corpus', corpus, '--json'], conCliente(consultar), CREDENCIAL, HOY);

    expect(pedidas).toEqual([0, FILAS_POR_PAGINA]);
    const { lectura } = JSON.parse(salida.join(''));
    expect(lectura.primeraLectura).toBe(false);
    expect(lectura.ventanas[0].autores[0].impresiones).toBe(FILAS_POR_PAGINA + 90);
  });

  it('--registrar sobre una serie corrupta da 1 y deja el fichero byte a byte igual', async () => {
    const corpus = await corpusDePrueba();
    for (const corrupto of [
      '# sin su clave\nentradas:\n  - desde: "2026-09-09"\n',
      'lecturas:\n  - desde: "2026-09-09"\n    hasta: "2026-10-06"\n    clase: "semana"\n',
      'lecturas:\n  - desde: "2026-09-09"\n    clase: "mes"\n',
      'lecturas:\n  - desde: "2026-9-9"\n    hasta: "2026-10-06"\n    clase: "28-dias"\n',
      'lecturas:\n  - desde: "2026-02-30"\n    hasta: "2026-03-06"\n    clase: "28-dias"\n',
      'lecturas:\n  - desde: "2026-10-06"\n    hasta: "2026-09-09"\n    clase: "28-dias"\n',
      'lecturas:\n  - desde: "2026-09-09"\n    hasta: "2026-10-06"\n    clase: "mes"\n  - desde: "2026-09-09"\n    hasta: "2026-10-06"\n    clase: "mes"\n',
    ]) {
      await writeFile(join(corpus, FICHERO_DE_DEMANDA), corrupto, 'utf8');
      capturarSalida();
      expect(
        await principal(['--corpus', corpus, '--registrar'], conCliente(fuente().consultar), CREDENCIAL, HOY),
      ).toBe(1);
      expect(await readFile(join(corpus, FICHERO_DE_DEMANDA), 'utf8')).toBe(corrupto);
      vi.restoreAllMocks();
    }
  });

  it('se niega a registrar una lectura sin ventanas', async () => {
    const corpus = await corpusDePrueba();
    await expect(
      registrarLecturaDeDemanda(rutasDelCorpus(corpus), {
        propiedad: 'p',
        leidoEl: '2026-10-09',
        primeraLectura: false,
        ventanas: [],
        sinLeer: [],
      }),
    ).rejects.toThrow(/ninguna ventana leída/);
    expect(existsSync(join(corpus, FICHERO_DE_DEMANDA))).toBe(false);
  });
});

describe('sin credenciales, en otro proceso', () => {
  it('no escribe nada, nombra la variable y DESPLIEGUE.md §5, y sale con 2', async () => {
    const corpus = await corpusDePrueba();
    const entorno = { ...process.env };
    delete entorno[VARIABLE_DE_CREDENCIALES];

    const fallo = await ejecutar('npx', ['tsx', 'tools/demanda.ts', '--corpus', corpus, '--registrar'], {
      cwd: RAIZ,
      env: entorno,
    }).then(
      () => undefined,
      (error: Error & { code?: number; stderr?: string }) => error,
    );

    expect(fallo?.code).toBe(SALIDA_SIN_CREDENCIALES);
    expect(fallo?.stderr).toMatch(new RegExp(VARIABLE_DE_CREDENCIALES));
    expect(fallo?.stderr).toMatch(/DESPLIEGUE\.md §5/);
    expect(existsSync(join(corpus, FICHERO_DE_DEMANDA))).toBe(false);
  });
});

// ─── El fichero, la documentación y el aislamiento ───────────────────────────────────

describe('la serie en corpus/', () => {
  it('el fichero versionado empieza por la cabecera', () => {
    const versionado = readFileSync(resolve(RAIZ, 'corpus', FICHERO_DE_DEMANDA), 'utf8');
    expect(versionado.startsWith(CABECERA_DE_DEMANDA)).toBe(true);
  });

  it('la cabecera cuenta qué mide, por qué por página, el prefijo, resto, sinAutor, la clave y AD-24', () => {
    expect(CABECERA_DE_DEMANDA).toMatch(/QUÉ MIDE/);
    expect(CABECERA_DE_DEMANDA).toMatch(/POR PÁGINA Y NO POR CONSULTA/);
    expect(CABECERA_DE_DEMANDA).toMatch(/ANONIMIZA/);
    expect(CABECERA_DE_DEMANDA).toMatch(/PREFIJO MÁS LARGO/);
    expect(CABECERA_DE_DEMANDA).toMatch(/`resto`/);
    expect(CABECERA_DE_DEMANDA).toMatch(/`sinAutor`/);
    expect(CABECERA_DE_DEMANDA).toMatch(/CLAVE DE REEMPLAZO es el par `desde`–`hasta`/);
    expect(CABECERA_DE_DEMANDA).toMatch(/PRIMERA LECTURA/);
    expect(CABECERA_DE_DEMANDA).toMatch(/AUSENCIA ANTES QUE CERO/);
    expect(CABECERA_DE_DEMANDA).toMatch(/AD-24/);
  });

  it('es metadato del Corpus, no una colección', () => {
    const configuracion = readFileSync(resolve(RAIZ, 'src/content.config.ts'), 'utf8');
    expect(configuracion).not.toContain(FICHERO_DE_DEMANDA);
    expect(configuracion).not.toMatch(/serie-de-demanda/);
  });

  it('las órdenes están en package.json y en AGENTS.md, tras la de tráfico', () => {
    const paquete = JSON.parse(readFileSync(resolve(RAIZ, 'package.json'), 'utf8'));
    expect(paquete.scripts['demanda']).toBe('tsx tools/demanda.ts');
    expect(paquete.scripts['demanda:registrar']).toBe('tsx tools/demanda.ts --registrar');

    const agentes = readFileSync(resolve(RAIZ, 'AGENTS.md'), 'utf8');
    expect(agentes).toContain('## Leer la demanda por página');
    expect(agentes).toContain('npm run demanda');
    expect(agentes).toContain('demanda:registrar');
    expect(agentes.indexOf('## Leer la demanda por página')).toBeGreaterThan(
      agentes.indexOf('## Leer el tráfico orgánico'),
    );

    const despliegue = readFileSync(resolve(RAIZ, 'DESPLIEGUE.md'), 'utf8');
    const seccion5 = despliegue.slice(despliegue.indexOf('## 5.'), despliegue.indexOf('## 6.'));
    expect(seccion5).toContain('npm run demanda');
  });
});

describe('el aislamiento del sitio (AD-24)', () => {
  it('ningún fichero de src/ nombra la serie ni importa la orden', async () => {
    const { stdout } = await ejecutar(
      'git',
      [
        'grep',
        '-l',
        '--untracked',
        '-E',
        'serie-de-demanda|serieDeDemanda|FICHERO_DE_DEMANDA|tools/demanda|lib/demanda|demanda\\.ts',
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

  it('src/lib/objetivo.ts no menciona la serie: la demanda no entra en el objetivo este ciclo', () => {
    const objetivo = readFileSync(resolve(RAIZ, 'src/lib/objetivo.ts'), 'utf8');
    expect(objetivo).not.toMatch(/serie-de-demanda|serieDeDemanda|tools\/lib\/demanda|demanda\.ts/);
  });
});
