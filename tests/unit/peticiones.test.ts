import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import { principal, problemasDeLasConstantes, type Constantes } from '../../tools/peticion.ts';
import {
  CABECERA_DE_AUDITORIAS,
  CABECERA_DE_PETICIONES_DE_RETIRADA,
  analizarPeticiones,
  atribuidasAlCierre,
  informeDeAlcanceDeLaRetirada,
  juicioDeSmC6,
  leerAuditorias,
  leerPeticiones,
  mesesDeSmC6,
  muestraDeAuditoria,
  peticionesVencidas,
  tieneContacto,
  type EntradaDePeticiones,
  type MesDeSmC6,
} from '../../tools/lib/peticiones.ts';
import {
  FICHERO_DE_AUDITORIAS,
  FICHERO_DE_PETICIONES_DE_RETIRADA,
  registrarClases,
  rutasDelCorpus,
  type Rutas,
} from '../../tools/lib/corpus.ts';
import { entradaVedada, leerFormasVedadas, registrarFormasVedadas } from '../../tools/lib/formasVedadas.ts';
import { FAMILIAS_DE_FICHERO, familiaDeFichero } from '../../tools/lib/avisar.ts';
import { ATESTIGUADA, citaValida } from './ayuda/construir.js';
import { sembrarTemaPublicado, TEMA_PUBLICADO } from './ayuda/relleno.ts';

/**
 * Historia 35.8 — `npm run peticion`: anotar, resolver y auditar sobre un Corpus temporal, la regla
 * sin contacto, la retirada por petición (que no se niega por NFR-5), la consulta con su plazo, la
 * muestra y el juicio de SM-C6, y los dos registros del árbol. La línea de retirada del sitio la
 * prueban `personaje-donde-el-autor.test.ts`, `pagina-de-personaje.test.ts` y `atribucion.test.ts`.
 */

const ejecutar = promisify(execFile);
const RAIZ = resolve(import.meta.dirname, '..', '..');
const HOY = '2026-11-14';
const AHORA = new Date(`${HOY}T12:00:00`);
const SIN_VALORES: Constantes = { plazo: undefined, muestra: undefined, minimo: undefined, maximo: undefined };

const temporales: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

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

const BUZZ = 'buzz-hasta-el-infinito';
const SENECA = 'seneca-no-es-que-tengamos-poco-tiempo';
const RETIRADA_ANTES = 'buzz-la-que-ya-se-fue';

/** Un Corpus con una atribuida de Buzz publicada, una de siempre de Séneca y una atribuida ya retirada. */
async function corpusDePrueba(): Promise<{ raiz: string; rutas: Rutas }> {
  const base = await mkdtemp(join(tmpdir(), 'sabiduria-peticiones-'));
  temporales.push(base);
  const raiz = join(base, 'corpus');
  const rutas = rutasDelCorpus(raiz);
  for (const dir of [rutas.citas, rutas.autores, rutas.temas, rutas.revision, rutas.personajes]) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(join(rutas.autores, 'seneca.yml'), 'nombre: "Séneca"\nañoFallecimiento: 65\nsemblanza: "Filósofo."\nordenAlfabetico: "Séneca"\n');
  await writeFile(join(rutas.autores, 'relleno.yml'), 'nombre: "Relleno"\nañoFallecimiento: 100\nsemblanza: "Relleno."\nordenAlfabetico: "Relleno"\n');
  await writeFile(join(rutas.personajes, 'buzz.yml'), 'nombre: "Buzz Lightyear"\nuniverso: "Toy Story"\nordenAlfabetico: "Buzz"\n');
  await sembrarTemaPublicado(rutas);
  await writeFile(
    join(rutas.citas, `buzz--hasta-el-infinito.md`),
    citaValida({
      texto: 'Hasta el infinito y más allá de las estrellas.',
      slug: BUZZ,
      autor: undefined,
      personaje: 'buzz',
      clase: 'atribuida',
      estadoDerechos: undefined,
      temas: [TEMA_PUBLICADO],
      procedencia: undefined,
      fuente: undefined,
      ...ATESTIGUADA,
    }),
  );
  await writeFile(join(rutas.citas, 'seneca--no-es-que.md'), citaValida({ temas: [TEMA_PUBLICADO] }));
  await registrarClases(rutas, [
    { slug: BUZZ, clase: 'atribuida', fecha: '2026-10-05' },
    { slug: SENECA, clase: 'siempre', fecha: '2026-10-01' },
    { slug: RETIRADA_ANTES, clase: 'atribuida', fecha: '2026-09-01' },
  ]);
  // La ya retirada lo está desde septiembre: su forma vedada lo fecha (AD-32).
  await registrarFormasVedadas(rutas, [entradaVedada('La que ya se fue de aquí.', 'retirada', '2026-09-20', RETIRADA_ANTES)!]);
  return { raiz, rutas };
}

const orden = (raiz: string, ...args: string[]) => principal([...args, '--corpus', raiz], AHORA, SIN_VALORES);

const BUZZ_DOS = 'buzz-al-rescate-de-los-juguetes';
const FICHA_DE_TOY_STORY = 'personaje: "buzz"\npersonajes:\n  - "buzz"\ntitulo: "Toy Story"\nformas:\n  - "toy story"\n';

/**
 * Le da Obra a la atribuida de Buzz: «Toy Story», que es el título de su Ficha, y otra atribuida
 * de Buzz de la misma Obra con la grafía «TOY STORY». Retirar la primera deja el título sin
 * ninguna Cita publicada que lo declare, y `ajustarTitulosDeObra` lo cambia.
 */
async function conObra(rutas: Rutas): Promise<string> {
  const atribuida = (slug: string, texto: string, obra: string) =>
    citaValida({
      texto,
      slug,
      autor: undefined,
      personaje: 'buzz',
      clase: 'atribuida',
      estadoDerechos: undefined,
      temas: [TEMA_PUBLICADO],
      procedencia: { obra, año: 1995 },
      fuente: undefined,
      ...ATESTIGUADA,
    });
  await writeFile(join(rutas.citas, 'buzz--hasta-el-infinito.md'), atribuida(BUZZ, 'Hasta el infinito y más allá de las estrellas.', 'Toy Story'));
  await writeFile(join(rutas.citas, 'buzz--al-rescate.md'), atribuida(BUZZ_DOS, 'Al rescate de todos los juguetes perdidos.', 'TOY STORY'));
  await registrarClases(rutas, [{ slug: BUZZ_DOS, clase: 'atribuida', fecha: '2026-10-05' }]);
  await mkdir(rutas.obras, { recursive: true });
  const ficha = join(rutas.obras, 'buzz--toy-story.yml');
  await writeFile(ficha, FICHA_DE_TOY_STORY);
  return ficha;
}

describe('35.8 — anotar', () => {
  it('anota una petición de corregir con id 1 y la fecha de hoy, y la siguiente con id 2', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    capturarSalida();
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'corregir', '--motivo', 'la frase es de otro')).toBe(0);
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'persona-afectada', '--peticion', 'retirar', '--fecha', '2026-11-10')).toBe(0);
    expect(await leerPeticiones(rutas)).toEqual([
      { peticion: { id: 1, fecha: HOY, cita: BUZZ, solicitante: 'otro', peticion: 'corregir', motivo: 'la frase es de otro' } },
      { peticion: { id: 2, fecha: '2026-11-10', cita: BUZZ, solicitante: 'persona-afectada', peticion: 'retirar' } },
    ]);
    // La de una persona afectada no retira: la Cita sigue publicada.
    expect(existsSync(join(rutas.citas, 'buzz--hasta-el-infinito.md'))).toBe(true);
    const escrito = await readFile(rutas.peticionesDeRetirada, 'utf8');
    expect(escrito.startsWith(CABECERA_DE_PETICIONES_DE_RETIRADA)).toBe(true);
  });

  it('la de retirar de un titular retira primero: mueve la Cita, veda su forma y deja la resolución para después', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    const salida = capturarSalida();
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'titular-de-derechos', '--peticion', 'retirar')).toBe(0);
    expect(existsSync(join(rutas.citas, 'buzz--hasta-el-infinito.md'))).toBe(false);
    expect(await readdir(rutas.revision)).toEqual(['buzz--hasta-el-infinito.md']);
    expect((await leerFormasVedadas(rutas)).at(-1)).toEqual(
      { forma: 'hasta el infinito y mas alla de las estrellas', slug: BUZZ, motivo: 'retirada', fecha: HOY },
    );
    const entradas = await leerPeticiones(rutas);
    expect(entradas).toHaveLength(1);
    const texto = salida.join('');
    expect(texto).toContain('git add');
    expect(texto).toContain('historial de git');
    expect(texto).toContain('pregunta 25');
    expect(texto).toMatch(/NFR-5/u);
  });

  it('con el registro de formas vedadas ilegible, el titular no retira ni anota nada (1)', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    await writeFile(rutas.formasVedadas, 'formas: [roto\n');
    capturarSalida();
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'titular-de-derechos', '--peticion', 'retirar')).toBe(1);
    expect(existsSync(join(rutas.citas, 'buzz--hasta-el-infinito.md'))).toBe(true);
    expect(existsSync(rutas.peticionesDeRetirada)).toBe(false);
  });

  it.each([
    'escríbeme a ana@ejemplo.org',
    'ANA.PEREZ+citas@correo.es',
    'mi móvil es +34 600 11 22 33',
    'tel. 600112233',
    'llamad al (91) 555-1234',
    '600.11.22.33',
    'búscame en @ana_perez',
    'ana arroba gmail punto com',
    'llámame al 6123 4567',
    'mi número: 6123-4567',
  ])('rechaza un motivo con contacto (1) y no escribe: %s', async (motivo) => {
    const { raiz, rutas } = await corpusDePrueba();
    capturarSalida();
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'corregir', '--motivo', motivo)).toBe(1);
    expect(existsSync(rutas.peticionesDeRetirada)).toBe(false);
  });

  it('un año, un capítulo o un intervalo de años no son un teléfono', () => {
    for (const inocente of [
      'la escribió en 1984',
      'capítulo 12, página 345',
      'entre 1984-1990',
      'la frase dice «uno, dos»',
      'publicada el 2026-11-14',
      'la edición del 14.11.2026',
      'entre 1984 1990',
      'ediciones de 1984, 1990 y 2001',
      'según https://es.wikiquote.org/w/index.php?title=Buzz&oldid=1234567 no es suya',
      'la edición de ISBN 978-84-376-0494-7 la da a otro',
      'en https://www.gutenberg.org/ebooks/2000000 no aparece',
    ]) {
      expect(tieneContacto(inocente), inocente).toBe(false);
    }
  });

  it('una Cita de siempre o desconocida se rechaza con 1; una atribuida ya retirada se anota', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    const salida = capturarSalida();
    expect(await orden(raiz, 'anotar', SENECA, '--solicitante', 'otro', '--peticion', 'corregir')).toBe(1);
    expect(salida.join('')).toContain('no es una Cita atribuida');
    expect(await orden(raiz, 'anotar', 'nadie-dijo-esto', '--solicitante', 'otro', '--peticion', 'corregir')).toBe(1);
    expect(existsSync(rutas.peticionesDeRetirada)).toBe(false);
    expect(await orden(raiz, 'anotar', RETIRADA_ANTES, '--solicitante', 'titular-de-derechos', '--peticion', 'retirar')).toBe(0);
    expect(salida.join('')).toContain('ya no está publicada');
    expect(await leerPeticiones(rutas)).toHaveLength(1);
  });

  it.each([
    [['anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'corregir', '--bandera']],
    [['anotar', BUZZ, '--solicitante', 'otro', '--solicitante', 'otro', '--peticion', 'corregir']],
    [['anotar', '--solicitante', 'otro', '--peticion', 'corregir']],
    [['anotar', BUZZ, 'otra', '--solicitante', 'otro', '--peticion', 'corregir']],
    [['anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'corregir', '--fecha', '2026-13-01']],
    [['anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'corregir', '--motivo', '  ']],
    [['anotar', BUZZ, '--solicitante', 'jefe', '--peticion', 'corregir']],
    [['anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'borrar']],
    [['anotar', BUZZ, '--peticion', 'corregir']],
    [['anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'corregir', '--resultado', 'a=bien']],
    [['quitar', BUZZ]],
  ])('la forma de la invocación sale con 2 y no escribe: %j', async (args) => {
    const { raiz, rutas } = await corpusDePrueba();
    capturarSalida();
    expect(await orden(raiz, ...args)).toBe(2);
    expect(existsSync(rutas.peticionesDeRetirada)).toBe(false);
  });

  it('una petición anterior a la clasificación de la Cita como atribuida sale con 1 y no escribe', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    const salida = capturarSalida();
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'corregir', '--fecha', '2026-10-04')).toBe(1);
    expect(salida.join('')).toContain('es atribuida desde el 2026-10-05');
    expect(existsSync(rutas.peticionesDeRetirada)).toBe(false);
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'corregir', '--fecha', '2026-10-05')).toBe(0);
  });

  it('anotar dos veces lo mismo el mismo día se admite y se avisa', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    const salida = capturarSalida();
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'corregir')).toBe(0);
    expect(salida.join('')).not.toContain('ya había una igual');
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'corregir')).toBe(0);
    expect(salida.join('')).toContain('Aviso: ya había una igual, la petición 1');
    expect(await leerPeticiones(rutas)).toHaveLength(2);
  });

  it('una fecha futura o un registro ilegible salen con 1 y no escriben', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    capturarSalida();
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'corregir', '--fecha', '2026-11-15')).toBe(1);
    expect(existsSync(rutas.peticionesDeRetirada)).toBe(false);
    await writeFile(rutas.peticionesDeRetirada, 'entradas: [roto\n');
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'corregir')).toBe(1);
    expect(await readFile(rutas.peticionesDeRetirada, 'utf8')).toBe('entradas: [roto\n');
  });
});

describe('35.8 — resolver', () => {
  it('«retirada» sobre la petición de otro solicitante retira como la del titular y anota la resolución', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    capturarSalida();
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'retirar')).toBe(0);
    expect(await orden(raiz, 'resolver', '1', 'retirada')).toBe(0);
    expect(await readdir(rutas.revision)).toEqual(['buzz--hasta-el-infinito.md']);
    expect((await leerFormasVedadas(rutas)).map((v) => [v.slug, v.motivo])).toEqual([[RETIRADA_ANTES, 'retirada'], [BUZZ, 'retirada']]);
    expect((await leerPeticiones(rutas)).at(-1)).toEqual({ resolucion: { peticion: 1, fecha: HOY, resolucion: 'retirada' } });
  });

  it('«rechazada» sobre una retirada primero no la devuelve, y lo dice', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    const salida = capturarSalida();
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'titular-de-derechos', '--peticion', 'retirar')).toBe(0);
    expect(await orden(raiz, 'resolver', '1', 'rechazada')).toBe(0);
    expect(await readdir(rutas.revision)).toEqual(['buzz--hasta-el-infinito.md']);
    expect(salida.join('')).toMatch(/rechazar no la devuelve/u);
  });

  it('un id inexistente, uno ya resuelto o una resolución anterior a su petición salen con 1', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    capturarSalida();
    expect(await orden(raiz, 'resolver', '1', 'corregida')).toBe(1);
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'corregir', '--fecha', '2026-11-10')).toBe(0);
    expect(await orden(raiz, 'resolver', '1', 'corregida', '--fecha', '2026-11-09')).toBe(1);
    expect(await orden(raiz, 'resolver', '1', 'corregida')).toBe(0);
    expect(await orden(raiz, 'resolver', '1', 'rechazada')).toBe(1);
    expect(await leerPeticiones(rutas)).toHaveLength(2);
  });

  it('«retirada» sobre una Cita que sigue publicada pero ya no es atribuida no mueve nada, lo dice y SM-C6 no la cuenta', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    const salida = capturarSalida();
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'retirar', '--fecha', '2026-10-10')).toBe(0);
    // Pasa a ser de siempre (la orden de la 35.7 lo haría; aquí basta el fichero).
    await writeFile(
      join(rutas.citas, 'buzz--hasta-el-infinito.md'),
      citaValida({ texto: 'Hasta el infinito y más allá de las estrellas.', slug: BUZZ, temas: [TEMA_PUBLICADO] }),
    );
    expect(await orden(raiz, 'resolver', '1', 'retirada', '--fecha', '2026-10-12')).toBe(0);
    expect(salida.join('')).toContain('sigue publicada, pero ya no es atribuida');
    expect(existsSync(join(rutas.citas, 'buzz--hasta-el-infinito.md'))).toBe(true);
    salida.length = 0;
    expect(await principal(['--json', '--corpus', raiz], AHORA, SIN_VALORES)).toBe(0);
    const { smC6 } = JSON.parse(salida.join('')) as { smC6: { meses: MesDeSmC6[] } };
    expect(smC6.meses.find((m) => m.mes === '2026-10')?.retiradas).toBe(0);
  });

  /** Los meses de SM-C6 de la consulta en `--json`, sobre el Corpus de `raiz`. */
  async function mesesDeLaConsulta(raiz: string, salida: string[]): Promise<MesDeSmC6[]> {
    salida.length = 0;
    expect(await principal(['--json', '--corpus', raiz], AHORA, SIN_VALORES)).toBe(0);
    return (JSON.parse(salida.join('')) as { smC6: { meses: MesDeSmC6[] } }).smC6.meses;
  }

  it('una retirada fechada con «--fecha» —la del titular al anotar y la de una resolución— cuenta en SM-C6 en su mes', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    const salida = capturarSalida();
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'titular-de-derechos', '--peticion', 'retirar', '--fecha', '2026-10-10')).toBe(0);
    expect((await leerFormasVedadas(rutas)).at(-1)?.fecha).toBe('2026-10-10');
    expect((await mesesDeLaConsulta(raiz, salida)).find((m) => m.mes === '2026-10')?.retiradas).toBe(1);
    // Resolverla «retirada» después no mueve nada, y no dice que SM-C6 no la cuente.
    salida.length = 0;
    expect(await orden(raiz, 'resolver', '1', 'retirada', '--fecha', '2026-11-02')).toBe(0);
    expect(salida.join('')).toContain('se retiró al anotar la petición');
    expect(salida.join('')).not.toContain('SM-C6 no la cuenta');
    const meses = await mesesDeLaConsulta(raiz, salida);
    expect(meses.find((m) => m.mes === '2026-10')?.retiradas).toBe(1);
    expect(meses.find((m) => m.mes === '2026-11')?.retiradas).toBe(0);

    const otro = await corpusDePrueba();
    expect(await orden(otro.raiz, 'anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'retirar', '--fecha', '2026-10-10')).toBe(0);
    expect(await orden(otro.raiz, 'resolver', '1', 'retirada', '--fecha', '2026-10-12')).toBe(0);
    expect((await leerFormasVedadas(otro.rutas)).at(-1)?.fecha).toBe('2026-10-12');
    expect((await mesesDeLaConsulta(otro.raiz, salida)).find((m) => m.mes === '2026-10')?.retiradas).toBe(1);
  });

  it('la de retirar de un titular sobre una Cita que ya es de siempre se anota sin retirar nada, y lo dice', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    await writeFile(
      join(rutas.citas, 'buzz--hasta-el-infinito.md'),
      citaValida({ texto: 'Hasta el infinito y más allá de las estrellas.', slug: BUZZ, temas: [TEMA_PUBLICADO] }),
    );
    const salida = capturarSalida();
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'titular-de-derechos', '--peticion', 'retirar')).toBe(0);
    expect(existsSync(join(rutas.citas, 'buzz--hasta-el-infinito.md'))).toBe(true);
    expect(await leerPeticiones(rutas)).toHaveLength(1);
    expect(salida.join('')).toContain('sigue publicada, pero ya no es atribuida');
  });

  it('el denominador de SM-C6 cuenta las atribuidas publicadas hoy, no las que pasaron a ser de siempre', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    // Buzz pasa a ser de siempre el 2026-11-02, con su registro y su forma vedada (35.7).
    await writeFile(
      join(rutas.citas, 'buzz--hasta-el-infinito.md'),
      citaValida({ texto: 'Hasta el infinito y más allá de las estrellas.', slug: BUZZ, temas: [TEMA_PUBLICADO] }),
    );
    await registrarClases(rutas, [{ slug: BUZZ, clase: 'siempre', fecha: '2026-11-02' }]);
    await registrarFormasVedadas(rutas, [entradaVedada('Hasta el infinito y más allá de las estrellas.', 'cambio-de-clase', '2026-11-02', BUZZ)!]);
    // La retirada en septiembre vuelve a mano, atribuida: sigue contando desde entonces.
    await writeFile(
      join(rutas.citas, 'buzz--la-que-ya-se-fue.md'),
      citaValida({
        texto: 'La que ya se fue de aquí.',
        slug: RETIRADA_ANTES,
        autor: undefined,
        personaje: 'buzz',
        clase: 'atribuida',
        estadoDerechos: undefined,
        temas: [TEMA_PUBLICADO],
        procedencia: undefined,
        fuente: undefined,
        ...ATESTIGUADA,
      }),
    );
    const salida = capturarSalida();
    const meses = await mesesDeLaConsulta(raiz, salida);
    expect(meses.find((m) => m.mes === '2026-10')?.atribuidas).toBe(2);
    expect(meses.find((m) => m.mes === '2026-11')?.atribuidas).toBe(1);
    salida.length = 0;
    expect(await principal(['auditar', '2026-10', '--json', '--corpus', raiz], AHORA, { ...SIN_VALORES, muestra: 5 })).toBe(0);
    expect((JSON.parse(salida.join('')) as { muestra: string[] }).muestra.sort()).toEqual([RETIRADA_ANTES, BUZZ].sort());
  });

  it('una retirada por petición con Obra pone al día el título de la Ficha y lo dice', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    const ficha = await conObra(rutas);
    const salida = capturarSalida();
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'titular-de-derechos', '--peticion', 'retirar')).toBe(0);
    expect(await readFile(ficha, 'utf8')).toContain('titulo: "TOY STORY"');
    expect(salida.join('')).toMatch(/pasa de «Toy Story» a «TOY STORY»/u);
  });

  it('si la petición no se puede anotar tras retirar, la Cita vuelve, la Ficha recupera su título y el registro no cambia (1)', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    const ficha = await conObra(rutas);
    // Un registro que se deja leer pero al que no se puede añadir: la lista no es lo último.
    const roto = `${CABECERA_DE_PETICIONES_DE_RETIRADA}otra: 1\n`;
    await writeFile(rutas.peticionesDeRetirada, roto);
    expect(await leerPeticiones(rutas)).toEqual([]);
    const salida = capturarSalida();
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'titular-de-derechos', '--peticion', 'retirar')).toBe(1);
    expect(existsSync(join(rutas.citas, 'buzz--hasta-el-infinito.md'))).toBe(true);
    expect(await readdir(rutas.revision)).toEqual([]);
    expect(await readFile(ficha, 'utf8')).toBe(FICHA_DE_TOY_STORY);
    expect(await readFile(rutas.peticionesDeRetirada, 'utf8')).toBe(roto);
    const texto = salida.join('');
    expect(texto).toContain('La Cita ha vuelto a corpus/citas/.');
    expect(texto).toContain('recupera el título que tenía');
    expect(texto).toContain('formas-vedadas.yml');
  });

  it('la forma de la invocación sale con 2', async () => {
    const { raiz } = await corpusDePrueba();
    capturarSalida();
    expect(await orden(raiz, 'resolver', 'uno', 'corregida')).toBe(2);
    expect(await orden(raiz, 'resolver', '1', 'olvidada')).toBe(2);
    expect(await orden(raiz, 'resolver', '1')).toBe(2);
    expect(await orden(raiz, 'resolver', '1', 'corregida', '--motivo', 'x')).toBe(2);
  });
});

describe('35.8 — NFR-5 se informa y no niega', () => {
  it('nombra cada Cita que quedaría fuera, con su Tema y su recuento, y que se resuelve antes de fusionar', () => {
    const lineas = informeDeAlcanceDeLaRetirada({
      ok: true,
      fuera: [{ slug: 'a', ruta: '/cita/a/', temas: [{ slug: 'el-tiempo', nombre: 'El tiempo', citas: 14 }], declarados: 1 }],
    });
    expect(lineas.join('\n')).toMatch(/\/cita\/a\/ — su Tema «El tiempo» \(el-tiempo\) tiene 14 Citas/u);
    expect(lineas.join('\n')).toMatch(/No se niega.*antes de fusionar/u);
    expect(informeDeAlcanceDeLaRetirada({ ok: true, fuera: [] })).toEqual(['Ninguna otra Cita queda fuera de alcance (NFR-5).']);
    expect(informeDeAlcanceDeLaRetirada({ ok: false, motivos: ['roto', 'No se ha escrito nada.'] }).join('\n')).toMatch(
      /no se ha podido comprobar.*\n  roto$/iu,
    );
  });
});

describe('35.8 — la consulta', () => {
  it('lista por mes y, sin plazo, no juzga y lo dice; no escribe nada', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    const salida = capturarSalida();
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'corregir', '--fecha', '2026-10-06')).toBe(0);
    const antes = await readFile(rutas.peticionesDeRetirada, 'utf8');
    salida.length = 0;
    expect(await orden(raiz)).toBe(0);
    const texto = salida.join('');
    expect(texto).toMatch(/2026-10\n  1  2026-10-06  buzz-hasta-el-infinito  otro  corregir  → sin resolver/u);
    expect(texto).toContain('PLAZO_DE_RESPUESTA_A_RETIRADA_DIAS no tiene valor');
    expect(texto).toContain('SM-C6 no se juzga');
    expect(await readFile(rutas.peticionesDeRetirada, 'utf8')).toBe(antes);
    expect(existsSync(rutas.auditoriasDeAtribuidas)).toBe(false);
  });

  it('dice la resolución de cada petición resuelta y nunca propone el freno', async () => {
    const { raiz } = await corpusDePrueba();
    const salida = capturarSalida();
    expect(await orden(raiz, 'anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'corregir', '--fecha', '2026-10-06')).toBe(0);
    expect(await orden(raiz, 'resolver', '1', 'rechazada', '--fecha', '2026-10-08')).toBe(0);
    salida.length = 0;
    const constantes: Constantes = { plazo: 30, muestra: 5, minimo: 1, maximo: 0.1 };
    expect(await principal(['--corpus', raiz], AHORA, constantes)).toBe(0);
    const texto = salida.join('');
    expect(texto).toContain('  1  2026-10-06  buzz-hasta-el-infinito  otro  corregir  → rechazada el 2026-10-08');
    expect(texto).not.toMatch(/freno|bajar (?:los )?topes|parar la siembra|detener la siembra/iu);
  });

  it('con plazo, nombra las sin resolver que lo pasan', () => {
    const entradas: EntradaDePeticiones[] = [
      { peticion: { id: 1, fecha: '2026-10-01', cita: BUZZ, solicitante: 'otro', peticion: 'corregir' } },
      { peticion: { id: 2, fecha: '2026-11-10', cita: BUZZ, solicitante: 'otro', peticion: 'corregir' } },
      { peticion: { id: 3, fecha: '2026-10-01', cita: BUZZ, solicitante: 'otro', peticion: 'corregir' } },
      { resolucion: { peticion: 3, fecha: '2026-10-05', resolucion: 'rechazada' } },
    ];
    expect(peticionesVencidas(entradas, undefined, HOY)).toBeUndefined();
    expect(peticionesVencidas(entradas, 30, HOY)?.map((p) => p.id)).toEqual([1]);
  });

  it('una resolución sin su petición antes en la lista, o anterior a ella, no se deja leer', () => {
    const fichero = (...lineas: string[]) => `entradas:\n${lineas.map((l) => `  - ${l}\n`).join('')}`;
    const peticion = `peticion: {"id":1,"fecha":"2026-10-05","cita":"${BUZZ}","solicitante":"otro","peticion":"corregir"}`;
    expect(() => analizarPeticiones('r', fichero('resolucion: {"peticion":1,"fecha":"2026-10-06","resolucion":"rechazada"}'))).toThrow(
      /no está anotada antes/u,
    );
    expect(() =>
      analizarPeticiones('r', fichero('resolucion: {"peticion":1,"fecha":"2026-10-06","resolucion":"rechazada"}', peticion)),
    ).toThrow(/no está anotada antes/u);
    expect(() => analizarPeticiones('r', fichero(peticion, 'resolucion: {"peticion":1,"fecha":"2026-10-04","resolucion":"rechazada"}'))).toThrow(
      /antes de su fecha/u,
    );
    expect(analizarPeticiones('r', fichero(peticion, 'resolucion: {"peticion":1,"fecha":"2026-10-05","resolucion":"rechazada"}'))).toHaveLength(2);
  });

  it('una constante con un valor imposible hace salir la orden con 1 sin escribir', async () => {
    expect(problemasDeLasConstantes(SIN_VALORES)).toEqual([]);
    expect(problemasDeLasConstantes({ plazo: 30, muestra: 10, minimo: 50, maximo: 0.1 })).toEqual([]);
    expect(problemasDeLasConstantes({ plazo: -1, muestra: 0, minimo: 2.5, maximo: 1.5 })).toHaveLength(4);
    expect(problemasDeLasConstantes({ ...SIN_VALORES, muestra: Number.NaN })).toHaveLength(1);
    const { raiz, rutas } = await corpusDePrueba();
    capturarSalida();
    const raro: Constantes = { ...SIN_VALORES, muestra: 0 };
    expect(await principal(['anotar', BUZZ, '--solicitante', 'otro', '--peticion', 'corregir', '--corpus', raiz], AHORA, raro)).toBe(1);
    expect(await principal(['auditar', '2026-10', '--corpus', raiz], AHORA, raro)).toBe(1);
    expect(existsSync(rutas.peticionesDeRetirada)).toBe(false);
  });

  it('un registro ilegible hace salir la consulta con 1', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    await writeFile(rutas.auditoriasDeAtribuidas, 'auditorias: [roto\n');
    capturarSalida();
    expect(await orden(raiz)).toBe(1);
  });
});

describe('35.8 — SM-C6', () => {
  const SLUGS = ['buzz-a', 'buzz-b', 'buzz-c', 'buzz-d', 'buzz-e', 'buzz-f'];

  it('la muestra es la misma en dos ejecuciones y cambia con el mes', () => {
    const una = muestraDeAuditoria(SLUGS, '2026-10', 3);
    expect(una).toHaveLength(3);
    expect(muestraDeAuditoria([...SLUGS].reverse(), '2026-10', 3)).toEqual(una);
    const meses = ['2026-11', '2026-12', '2027-01', '2027-02'].map((m) => muestraDeAuditoria(SLUGS, m, 3).join());
    expect(meses.some((m) => m !== una.join())).toBe(true);
    expect(muestraDeAuditoria(SLUGS.slice(0, 2), '2026-10', 5)).toHaveLength(2);
  });

  it('las atribuidas al cierre salen del registro de clases menos las retiradas que no se publican hoy', () => {
    const clases = [
      { slug: 'a', clase: 'atribuida' as const, fecha: '2026-09-10' },
      { slug: 'b', clase: 'atribuida' as const, fecha: '2026-10-10' },
      { slug: 'c', clase: 'atribuida' as const, fecha: '2026-09-10' },
      { slug: 's', clase: 'siempre' as const, fecha: '2026-09-10' },
    ];
    const vedadas = [{ forma: 'c', slug: 'c', motivo: 'retirada' as const, fecha: '2026-10-02' }];
    expect(atribuidasAlCierre('2026-09', clases, vedadas, new Set(['a', 'b']))).toEqual(['a', 'c']);
    expect(atribuidasAlCierre('2026-10', clases, vedadas, new Set(['a', 'b']))).toEqual(['a', 'b']);
  });

  it('una atribuida que pasó a ser de siempre deja de contar desde ese mes, aunque siga publicada', async () => {
    const clases = [
      { slug: 'a', clase: 'atribuida' as const, fecha: '2026-09-10' },
      { slug: 'b', clase: 'atribuida' as const, fecha: '2026-09-10' },
      { slug: 'b', clase: 'siempre' as const, fecha: '2026-10-03' },
    ];
    const vedadas = [{ forma: 'b', slug: 'b', motivo: 'cambio-de-clase' as const, fecha: '2026-10-03' }];
    // `publicadasHoy` son las atribuidas publicadas hoy: «b» se publica, pero ya de siempre.
    expect(atribuidasAlCierre('2026-09', clases, vedadas, new Set(['a']))).toEqual(['a', 'b']);
    expect(atribuidasAlCierre('2026-10', clases, vedadas, new Set(['a']))).toEqual(['a']);
    // La orden pasa solo las atribuidas: la Cita de siempre de Séneca no entra en la muestra.
    const { raiz } = await corpusDePrueba();
    const salida = capturarSalida();
    expect(await principal(['auditar', '2026-10', '--json', '--corpus', raiz], AHORA, { ...SIN_VALORES, muestra: 5 })).toBe(0);
    expect(JSON.parse(salida.join(''))).toEqual({ mes: '2026-10', muestra: [BUZZ], atribuidas: 1 });
  });

  const mes = (m: string, atribuidas: number, peticionesPorCien?: number, proporcion?: number): MesDeSmC6 => ({
    mes: m,
    cerrado: true,
    atribuidas,
    peticiones: 0,
    retiradas: 0,
    ...(peticionesPorCien !== undefined ? { peticionesPorCien, retiradasPorCien: 0 } : {}),
    ...(proporcion !== undefined ? { auditoria: { muestra: 10, malAtribuidas: proporcion * 10, sinFuente: 0, proporcion } } : {}),
  });

  it('sin las dos constantes informa y no juzga; bajo el mínimo no juzga y lo dice', () => {
    const meses = [mes('2026-09', 100, 1), mes('2026-10', 100, 5)];
    expect(juicioDeSmC6(meses, { minimo: undefined, maximo: 0.1 })).toEqual({
      estado: 'sin-valores',
      faltan: ['MIN_ATRIBUIDAS_PARA_JUZGAR_SM_C6'],
    });
    expect(juicioDeSmC6(meses, { minimo: 200, maximo: 0.1 })).toEqual({ estado: 'bajo-minimo', minimo: 200 });
  });

  it('salta si suben las peticiones por cada cien entre dos meses seguidos, o si la proporción pasa del umbral en los dos', () => {
    const sube = juicioDeSmC6([mes('2026-09', 100, 1), mes('2026-10', 100, 2)], { minimo: 50, maximo: 0.5 });
    expect(sube.estado === 'juzgado' && sube.saltos.map((s) => s.mes)).toEqual(['2026-10']);
    const baja = juicioDeSmC6([mes('2026-09', 100, 2), mes('2026-10', 100, 1)], { minimo: 50, maximo: 0.5 });
    expect(baja.estado === 'juzgado' && baja.saltos).toEqual([]);
    const proporcion = juicioDeSmC6([mes('2026-09', 100, 1, 0.3), mes('2026-10', 100, 1, 0.4)], { minimo: 50, maximo: 0.2 });
    expect(proporcion.estado === 'juzgado' && proporcion.saltos[0].motivos[0]).toMatch(/proporción mal atribuida/u);
    const solo = juicioDeSmC6([mes('2026-09', 100, 1, 0.1), mes('2026-10', 100, 1, 0.4)], { minimo: 50, maximo: 0.2 });
    expect(solo.estado === 'juzgado' && solo.saltos).toEqual([]);
    // Dos meses que no son seguidos no forman pareja.
    expect(juicioDeSmC6([mes('2026-08', 100, 1), mes('2026-10', 100, 9)], { minimo: 50, maximo: 0.5 }).estado).toBe('sin-pareja');
    expect(juicioDeSmC6([mes('2026-10', 100, 9)], { minimo: 50, maximo: 0.5 })).toEqual({ estado: 'sin-pareja' });
  });

  it('las tasas: sin atribuidas no hay tasa; la retirada del titular cuenta en el mes de la petición', () => {
    const clases = [
      { slug: 'a', clase: 'atribuida' as const, fecha: '2026-10-01' },
      { slug: 'b', clase: 'atribuida' as const, fecha: '2026-10-01' },
      { slug: 'c', clase: 'atribuida' as const, fecha: '2026-10-01' },
    ];
    const meses = mesesDeSmC6({
      entradas: [
        { peticion: { id: 1, fecha: '2026-10-03', cita: 'a', solicitante: 'titular-de-derechos', peticion: 'retirar' } },
        { peticion: { id: 2, fecha: '2026-10-04', cita: 'b', solicitante: 'otro', peticion: 'retirar' } },
        { resolucion: { peticion: 2, fecha: '2026-11-02', resolucion: 'retirada' } },
        // Un segundo titular sobre «a», ya retirada: no se retiró nada, y no cuenta otra vez.
        { peticion: { id: 3, fecha: '2026-10-20', cita: 'a', solicitante: 'titular-de-derechos', peticion: 'retirar' } },
        // «retirada» sobre «c» cuando ya no se publicaba: sin forma vedada de ese día, no cuenta.
        { peticion: { id: 4, fecha: '2026-10-05', cita: 'c', solicitante: 'otro', peticion: 'retirar' } },
        { resolucion: { peticion: 4, fecha: '2026-11-03', resolucion: 'retirada' } },
      ],
      auditorias: [],
      clases,
      // Las formas vedadas que dejó cada retirada que movió la Cita, con la fecha del gesto.
      vedadas: [
        { forma: 'a', slug: 'a', motivo: 'retirada', fecha: '2026-10-03' },
        { forma: 'b', slug: 'b', motivo: 'retirada', fecha: '2026-11-02' },
        { forma: 'c', slug: 'c', motivo: 'retirada', fecha: '2026-10-04' },
      ],
      publicadasHoy: new Set(),
      hoy: HOY,
    });
    expect(meses.map((m) => [m.mes, m.atribuidas, m.peticiones, m.retiradas, m.peticionesPorCien])).toEqual([
      ['2026-10', 1, 4, 1, 400],
      ['2026-11', 0, 0, 1, undefined],
    ]);
    const vacio = mesesDeSmC6({
      entradas: [{ peticion: { id: 1, fecha: '2026-10-03', cita: 'a', solicitante: 'otro', peticion: 'corregir' } }],
      auditorias: [],
      clases: [],
      vedadas: [],
      publicadasHoy: new Set(),
      hoy: HOY,
    });
    expect(vacio[0].peticionesPorCien).toBeUndefined();
  });

  it('cada mes toma su última auditoría: mal atribuidas, sin fuente y la proporción sobre la muestra', () => {
    const meses = mesesDeSmC6({
      entradas: [],
      auditorias: [
        { mes: '2026-10', muestra: ['a', 'b'], resultados: { a: 'bien', b: 'bien' }, auditadoEl: '2026-11-02' },
        { mes: '2026-10', muestra: ['a', 'b', 'c', 'd'], resultados: { a: 'bien', b: 'mal-atribuida', c: 'sin-fuente', d: 'sin-fuente' }, auditadoEl: '2026-11-05' },
      ],
      clases: [{ slug: 'a', clase: 'atribuida', fecha: '2026-10-01' }],
      vedadas: [],
      publicadasHoy: new Set(['a']),
      hoy: HOY,
    });
    expect(meses.find((m) => m.mes === '2026-10')?.auditoria).toEqual({ muestra: 4, malAtribuidas: 1, sinFuente: 2, proporcion: 0.25 });
    expect(meses.find((m) => m.mes === '2026-11')?.auditoria).toBeUndefined();
  });

  it('la consulta dice la auditoría del mes, con las sin fuente', async () => {
    const { raiz } = await corpusDePrueba();
    const salida = capturarSalida();
    const conMuestra: Constantes = { ...SIN_VALORES, muestra: 5 };
    expect(await principal(['auditar', '2026-10', '--resultado', `${BUZZ}=sin-fuente`, '--corpus', raiz], AHORA, conMuestra)).toBe(0);
    salida.length = 0;
    expect(await principal(['--corpus', raiz], AHORA, conMuestra)).toBe(0);
    expect(salida.join('')).toMatch(/^2026-10 .* 0 de 1 \(0\.00\), 1 sin fuente$/mu);
  });

  it('auditar: imprime la muestra, anota un resultado por slug y rechaza lo ajeno, lo incompleto y el mes abierto', async () => {
    const { raiz, rutas } = await corpusDePrueba();
    const salida = capturarSalida();
    const conMuestra: Constantes = { ...SIN_VALORES, muestra: 5 };
    const auditar = (...args: string[]) => principal(['auditar', ...args, '--corpus', raiz], AHORA, conMuestra);
    // Sin valor de la muestra, lo dice y no elige; con resultados, 1.
    expect(await principal(['auditar', '2026-10', '--corpus', raiz], AHORA, SIN_VALORES)).toBe(0);
    expect(salida.join('')).toContain('MUESTRA_DE_AUDITORIA_SM_C6 no tiene valor');
    salida.length = 0;
    expect(await principal(['auditar', '2026-10', '--json', '--corpus', raiz], AHORA, SIN_VALORES)).toBe(0);
    expect(JSON.parse(salida.join(''))).toEqual({ mes: '2026-10', muestra: null, atribuidas: 1 });
    expect(await principal(['auditar', '2026-10', '--resultado', `${BUZZ}=bien`, '--corpus', raiz], AHORA, SIN_VALORES)).toBe(1);
    salida.length = 0;
    expect(await auditar('2026-10')).toBe(0);
    expect(salida.join('')).toContain(BUZZ);
    expect(salida.join('')).not.toContain(SENECA);
    expect(await auditar('2026-11')).toBe(1);
    expect(await auditar('2026-10', '--resultado', 'otra-cita=bien')).toBe(1);
    expect(await auditar('2026-10', '--resultado', `${BUZZ}=dudosa`)).toBe(2);
    expect(await auditar('2026-10-01')).toBe(2);
    expect(existsSync(rutas.auditoriasDeAtribuidas)).toBe(false);
    expect(await auditar('2026-10', '--resultado', `${BUZZ}=mal-atribuida`)).toBe(0);
    expect(await leerAuditorias(rutas)).toEqual([
      { mes: '2026-10', muestra: [BUZZ], resultados: { [BUZZ]: 'mal-atribuida' }, auditadoEl: HOY },
    ]);
    expect((await readFile(rutas.auditoriasDeAtribuidas, 'utf8')).startsWith(CABECERA_DE_AUDITORIAS)).toBe(true);
  });
});

describe('35.8 — los registros del árbol', () => {
  for (const [fichero, cabecera, clave] of [
    [FICHERO_DE_PETICIONES_DE_RETIRADA, CABECERA_DE_PETICIONES_DE_RETIRADA, 'entradas'],
    [FICHERO_DE_AUDITORIAS, CABECERA_DE_AUDITORIAS, 'auditorias'],
  ] as const) {
    const RUTA = `corpus/${fichero}`;

    it(`${RUTA} es su cabecera y la lista vacía`, () => {
      const contenido = readFileSync(join(RAIZ, RUTA), 'utf8');
      expect(contenido).toBe(cabecera);
      expect(parsearYaml(contenido)).toEqual({ [clave]: null });
    });

    it(`${RUTA} empieza, byte a byte, por el del primer padre`, async () => {
      const actual = readFileSync(join(RAIZ, RUTA), 'utf8');
      let padre: string;
      try {
        padre = (await ejecutar('git', ['rev-parse', '--verify', 'HEAD^1'], { cwd: RAIZ })).stdout.trim();
      } catch {
        if (process.env.CI) throw new Error('Sin HEAD^1: el CI tiene que traer el historial (fetch-depth: 0).');
        console.warn(`Sin HEAD^1: se omite la comprobación de que ${RUTA} solo añade.`);
        return;
      }
      let anterior: string;
      try {
        anterior = (await ejecutar('git', ['show', `${padre}:${RUTA}`], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 })).stdout;
      } catch {
        return; // El padre no lo tiene: es el commit que lo crea.
      }
      expect(actual.startsWith(anterior), `${RUTA} reescribe lo que el commit padre ya tenía`).toBe(true);
    });

    it(`${RUTA} no es familia de ningún fichero: no fecha ni avisa`, () => {
      expect(familiaDeFichero(RUTA)).toBeUndefined();
      expect(FAMILIAS_DE_FICHERO.some(([directorio]) => RUTA.startsWith(`${directorio}/`))).toBe(false);
    });
  }

  it('ningún módulo de src/ nombra los registros ni tools/lib/peticiones (AD-24)', async () => {
    const ficheros = (await readdir(join(RAIZ, 'src'), { recursive: true })).filter((f) => /\.(ts|astro|mjs|js)$/.test(String(f)));
    for (const fichero of ficheros) {
      const contenido = readFileSync(join(RAIZ, 'src', String(fichero)), 'utf8');
      expect(contenido, String(fichero)).not.toContain(FICHERO_DE_PETICIONES_DE_RETIRADA);
      expect(contenido, String(fichero)).not.toContain(FICHERO_DE_AUDITORIAS);
      expect(contenido, String(fichero)).not.toContain('tools/lib/peticiones');
    }
  });

  it('la consulta sobre el árbol sale con 0 y no escribe nada', async () => {
    capturarSalida();
    const antes = readFileSync(join(RAIZ, 'corpus', FICHERO_DE_PETICIONES_DE_RETIRADA), 'utf8');
    expect(await principal(['--corpus', join(RAIZ, 'corpus')], AHORA)).toBe(0);
    expect(readFileSync(join(RAIZ, 'corpus', FICHERO_DE_PETICIONES_DE_RETIRADA), 'utf8')).toBe(antes);
  });
});
