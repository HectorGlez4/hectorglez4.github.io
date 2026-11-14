import { afterEach, describe, expect, it } from 'vitest';
import { chmod, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { darDeAltaLote, type EntradaDeLote } from '../../tools/alta.ts';
import { escribirCita, rutasDelCorpus, FICHERO_DE_FORMAS_VEDADAS, type Rutas } from '../../tools/lib/corpus.ts';
import { aprobar, rechazar } from '../../tools/lib/revision.ts';
import {
  CABECERA_DE_FORMAS_VEDADAS,
  entradaVedada,
  leerFormasVedadas,
  registrarFormasVedadas,
} from '../../tools/lib/formasVedadas.ts';
import { FAMILIAS_DE_FICHERO, familiaDeFichero } from '../../tools/lib/avisar.ts';
import { NOMBRE_DEL_TEMA_PUBLICADO, sembrarTemaPublicado } from './ayuda/relleno.ts';

/**
 * Historia 35.7 — `corpus/formas-vedadas.yml` (AD-32): el registro que solo añade, quién lo
 * escribe —el rechazo, la aprobación que deja una de siempre en revisión por el cotejo o por la
 * Procedencia— y que la puerta de la atribuida lo lee en el alta y en la aprobación. La retirada
 * la prueba `documentacion.test.ts`; el build, `clase-de-siempre-build.test.ts`.
 */

const ejecutar = promisify(execFile);
const RAIZ_DEL_REPO = join(import.meta.dirname, '..', '..');

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function corpusDePrueba(): Promise<Rutas> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-vedadas-'));
  temporales.push(raiz);
  const rutas = rutasDelCorpus(join(raiz, 'corpus'));
  for (const dir of [rutas.citas, rutas.autores, rutas.temas, rutas.revision, rutas.personajes]) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(
    join(rutas.autores, 'seneca.yml'),
    'nombre: "Séneca"\nañoFallecimiento: 65\nsemblanza: "Filósofo estoico."\nordenAlfabetico: "Séneca"\n',
    'utf8',
  );
  await writeFile(join(rutas.personajes, 'buzz.yml'), 'nombre: "Buzz Lightyear"\nuniverso: "Toy Story"\n', 'utf8');
  await sembrarTemaPublicado(rutas);
  return rutas;
}

const PUERTA = { maxCaracteres: 1000, maxPorObra: 1000, maxPorDueño: 1000, minAtestiguaciones: 2, buzon: 'b@ejemplo.org' };
const ATESTIGUACIONES = [
  { url: 'https://es.wikiquote.org/wiki/Prueba', consultadaEl: '2026-11-01' },
  { url: 'https://www.elpais.com/cultura/prueba.html', consultadaEl: '2026-11-02' },
];
const TEXTO = 'La paciencia es amarga, pero su fruto es dulce como ninguno.';

/** Una candidata de siempre en revisión, sin Fuente (no la deja publicar el cotejo). */
async function candidataSinFuente(rutas: Rutas, slug: string, texto: string, procedencia?: Record<string, unknown>) {
  await escribirCita(rutas.revision, `seneca--${slug}`, {
    texto,
    autor: 'seneca',
    temas: ['con-pagina'],
    slug: `seneca-${slug}`,
    ...(procedencia !== undefined ? { procedencia } : {}),
    estadoDerechos: 'dominio-público',
  });
}

const deBuzz = (texto: string): EntradaDeLote => ({
  texto,
  personaje: 'buzz',
  temas: [NOMBRE_DEL_TEMA_PUBLICADO],
  procedencia: { año: 1995 },
  atestiguaciones: ATESTIGUACIONES,
  origen: 'original',
});

describe('35.7 — el registro solo añade', () => {
  it('sin fichero se lee vacío; registrar crea la cabecera y añade una línea por entrada, sin repetir', async () => {
    const rutas = await corpusDePrueba();
    expect(await leerFormasVedadas(rutas)).toEqual([]);
    const una = entradaVedada(TEXTO, 'retirada', '2026-11-14', 'seneca-la-paciencia')!;
    const otra = entradaVedada('Otra frase cualquiera.', 'cotejo-fallido', '2026-11-14')!;
    expect(await registrarFormasVedadas(rutas, [una])).toEqual([una]);
    const tras = await readFile(rutas.formasVedadas, 'utf8');
    expect(tras.startsWith(CABECERA_DE_FORMAS_VEDADAS)).toBe(true);
    expect(await registrarFormasVedadas(rutas, [una, otra])).toEqual([otra]);
    const despues = await readFile(rutas.formasVedadas, 'utf8');
    expect(despues.startsWith(tras)).toBe(true);
    expect(await leerFormasVedadas(rutas)).toEqual([una, otra]);
    expect(una).toEqual({
      forma: 'la paciencia es amarga pero su fruto es dulce como ninguno',
      slug: 'seneca-la-paciencia',
      motivo: 'retirada',
      fecha: '2026-11-14',
    });
  });

  it('una entrada sin forma o con un motivo ajeno no escribe nada; un registro ilegible lanza', async () => {
    const rutas = await corpusDePrueba();
    await expect(
      registrarFormasVedadas(rutas, [{ forma: 'x', motivo: 'capricho' as never, fecha: '2026-11-14' }]),
    ).rejects.toThrow(/motivo/u);
    await expect(registrarFormasVedadas(rutas, [{ forma: 'No Canónica', motivo: 'retirada', fecha: '2026-11-14' }])).rejects.toThrow(
      /forma canónica/u,
    );
    await expect(readFile(rutas.formasVedadas, 'utf8')).rejects.toThrow();
    await writeFile(rutas.formasVedadas, `${CABECERA_DE_FORMAS_VEDADAS}  - { forma: "x", motivo: capricho, fecha: "2026-11-14" }\n`, 'utf8');
    await expect(leerFormasVedadas(rutas)).rejects.toThrow(/motivo/u);
    expect(entradaVedada('«…»', 'retirada', '2026-11-14')).toBeUndefined();
  });
});

describe('35.7 — quién lo escribe', () => {
  it('rechazar anota cada candidata de siempre —sin Procedencia, o con ella— antes de borrarla', async () => {
    const rutas = await corpusDePrueba();
    await candidataSinFuente(rutas, 'sin-procedencia', 'Una frase sin procedencia ninguna que rechazar.');
    await candidataSinFuente(rutas, 'con-procedencia', TEXTO, { obra: 'Cartas', año: 62 });
    const resultado = await rechazar(rutas, ['seneca-sin-procedencia', 'seneca-con-procedencia']);
    expect(resultado.rechazadas).toEqual(['seneca-sin-procedencia', 'seneca-con-procedencia']);
    expect((await leerFormasVedadas(rutas)).map((e) => [e.slug, e.motivo])).toEqual([
      ['seneca-sin-procedencia', 'sin-procedencia'],
      ['seneca-con-procedencia', 'cotejo-fallido'],
    ]);
    expect(await readdir(rutas.revision)).toEqual([]);
  });

  it('con el registro ilegible, rechazar no borra nada', async () => {
    const rutas = await corpusDePrueba();
    await candidataSinFuente(rutas, 'con-procedencia', TEXTO, { obra: 'Cartas', año: 62 });
    await writeFile(rutas.formasVedadas, 'formas: [roto\n', 'utf8');
    await expect(rechazar(rutas, ['seneca-con-procedencia'])).rejects.toThrow(/formas-vedadas/u);
    expect(await readdir(rutas.revision)).toEqual(['seneca--con-procedencia.md']);
  });

  it('la aprobación que deja una de siempre en revisión por el cotejo la anota, una sola vez', async () => {
    const rutas = await corpusDePrueba();
    await candidataSinFuente(rutas, 'con-procedencia', TEXTO, { obra: 'Cartas', año: 62 });
    for (let i = 0; i < 2; i += 1) {
      const resultado = await aprobar(rutas, ['seneca-con-procedencia']);
      expect(resultado.publicadas).toEqual([]);
      expect(resultado.rechazadasPorAdmision.map((r) => r.slug)).toEqual(['seneca-con-procedencia']);
    }
    expect((await leerFormasVedadas(rutas)).map((e) => [e.slug, e.motivo])).toEqual([['seneca-con-procedencia', 'cotejo-fallido']]);
    expect(await readdir(rutas.revision)).toEqual(['seneca--con-procedencia.md']);
  });
});

describe('35.7 — quién lo escribe, desde la terminal', () => {
  const dirDelCorpus = (rutas: Rutas) => join(rutas.citas, '..');
  const revisar = async (rutas: Rutas, args: string[]) => {
    try {
      const { stdout, stderr } = await ejecutar(
        'npx',
        ['tsx', join(RAIZ_DEL_REPO, 'tools/revisar.ts'), '--corpus', dirDelCorpus(rutas), ...args],
        { cwd: RAIZ_DEL_REPO },
      );
      return { codigo: 0, salida: `${stdout}${stderr}` };
    } catch (fallo) {
      const f = fallo as { code?: number; stdout?: string; stderr?: string };
      return { codigo: f.code ?? -1, salida: `${f.stdout ?? ''}${f.stderr ?? ''}` };
    }
  };

  it('la aprobación que deja una de siempre sin Procedencia en revisión la anota como sin-procedencia', async () => {
    const rutas = await corpusDePrueba();
    await candidataSinFuente(rutas, 'sin-procedencia', 'Una frase sin procedencia ninguna que aprobar.');
    const resultado = await aprobar(rutas, ['seneca-sin-procedencia']);
    expect(resultado.publicadas).toEqual([]);
    expect((await leerFormasVedadas(rutas)).map((e) => [e.slug, e.motivo])).toEqual([['seneca-sin-procedencia', 'sin-procedencia']]);
  });

  it('revisar --rechazar dice la forma vedada y sale con 0; con el registro ilegible sale con 1 y no borra nada', async () => {
    const rutas = await corpusDePrueba();
    await candidataSinFuente(rutas, 'una', TEXTO, { obra: 'Cartas', año: 62 });
    await candidataSinFuente(rutas, 'otra', 'Otra frase de Séneca que también se rechaza.', { obra: 'Cartas', año: 62 });
    const bien = await revisar(rutas, ['--rechazar', 'seneca-una']);
    expect(bien.codigo, bien.salida).toBe(0);
    expect(bien.salida).toContain('⊘ seneca-una: su forma queda vedada a la atribuida (cotejo-fallido)');

    await writeFile(rutas.formasVedadas, 'formas: [roto\n', 'utf8');
    const mal = await revisar(rutas, ['--rechazar', 'seneca-otra']);
    expect(mal.codigo, mal.salida).toBe(1);
    expect(mal.salida).toContain('No se ha rechazado ninguna candidata.');
    expect(await readdir(rutas.revision)).toEqual(['seneca--otra.md']);
  });

  it('revisar --aprobar sale con 1 y lo dice si no puede anotar las formas que deja vedadas', async () => {
    const rutas = await corpusDePrueba();
    await candidataSinFuente(rutas, 'una', TEXTO, { obra: 'Cartas', año: 62 });
    // Un registro legible en el que no se puede escribir: se lee, y el añadido falla.
    await writeFile(rutas.formasVedadas, CABECERA_DE_FORMAS_VEDADAS, 'utf8');
    await chmod(rutas.formasVedadas, 0o444);
    try {
      const salida = await revisar(rutas, ['--aprobar', 'seneca-una']);
      expect(salida.codigo, salida.salida).toBe(1);
      expect(salida.salida).toContain('Las formas vedadas no se anotaron en corpus/formas-vedadas.yml');
      expect(await readFile(rutas.formasVedadas, 'utf8')).toBe(CABECERA_DE_FORMAS_VEDADAS);
    } finally {
      await chmod(rutas.formasVedadas, 0o644);
    }
  });
});

describe('35.7 — la puerta de la atribuida lo lee', () => {
  async function conVedada(): Promise<Rutas> {
    const rutas = await corpusDePrueba();
    await registrarFormasVedadas(rutas, [entradaVedada(TEXTO, 'cotejo-fallido', '2026-11-14', 'seneca-la-paciencia')!]);
    return rutas;
  }

  it('el alta de una atribuida igual a una forma vedada va a revisión nombrando la entrada', async () => {
    const rutas = await conVedada();
    const informe = await darDeAltaLote([deBuzz(`«${TEXTO}»`)], rutas, { puerta: PUERTA });
    expect(informe.publicadas).toEqual([]);
    expect(informe.enRevision.map((e) => e.motivos.join('\n'))).toEqual([
      expect.stringContaining('forma vedada «la paciencia es amarga pero su fruto es dulce como ninguno» (cotejo-fallido, 2026-11-14, seneca-la-paciencia)'),
    ]);
  });

  it('la aprobación de una atribuida igual a una forma vedada la deja en revisión', async () => {
    const rutas = await conVedada();
    await escribirCita(rutas.revision, 'buzz--la-paciencia', {
      texto: TEXTO,
      personaje: 'buzz',
      temas: ['con-pagina'],
      slug: 'buzz-la-paciencia',
      procedencia: { año: 1995 },
      clase: 'atribuida',
      atestiguaciones: ATESTIGUACIONES,
      origen: 'original',
    });
    const resultado = await aprobar(rutas, ['buzz-la-paciencia'], [], { puerta: PUERTA });
    expect(resultado.publicadas).toEqual([]);
    expect(resultado.rechazadasPorAdmision.map((r) => r.motivos.join(' '))).toEqual([expect.stringContaining('forma vedada')]);
    // Una atribuida que se queda en revisión no se veda a sí misma.
    expect(await leerFormasVedadas(rutas)).toHaveLength(1);
  });

  it('una entrada cambio-de-clase no veda la nueva alta que la acompaña', async () => {
    const rutas = await corpusDePrueba();
    await registrarFormasVedadas(rutas, [entradaVedada(TEXTO, 'cambio-de-clase', '2026-11-14', 'seneca-la-paciencia')!]);
    const informe = await darDeAltaLote([deBuzz(TEXTO)], rutas, { puerta: PUERTA });
    expect(informe.enRevision).toEqual([]);
    expect(informe.publicadas).toHaveLength(1);
  });
});

describe('35.7 — el fichero del árbol', () => {
  const RUTA = `corpus/${FICHERO_DE_FORMAS_VEDADAS}`;

  it('tiene su cabecera y la lista vacía', async () => {
    const contenido = readFileSync(join(RAIZ_DEL_REPO, RUTA), 'utf8');
    expect(contenido.startsWith(CABECERA_DE_FORMAS_VEDADAS)).toBe(true);
    expect(await leerFormasVedadas({ formasVedadas: join(RAIZ_DEL_REPO, RUTA) })).toEqual([]);
  });

  it('empieza, byte a byte, por el del primer padre', async () => {
    const actual = readFileSync(join(RAIZ_DEL_REPO, RUTA), 'utf8');
    let padre: string;
    try {
      padre = (await ejecutar('git', ['rev-parse', '--verify', 'HEAD^1'], { cwd: RAIZ_DEL_REPO })).stdout.trim();
    } catch {
      if (process.env.CI) throw new Error('Sin HEAD^1: el CI tiene que traer el historial (fetch-depth: 0).');
      console.warn(`Sin HEAD^1: se omite la comprobación de que ${RUTA} solo añade.`);
      return;
    }
    let anterior: string;
    try {
      anterior = (await ejecutar('git', ['show', `${padre}:${RUTA}`], { cwd: RAIZ_DEL_REPO, maxBuffer: 64 * 1024 * 1024 })).stdout;
    } catch {
      // El padre no tiene el fichero: es el commit que lo crea, y todo es añadido.
      return;
    }
    expect(actual.startsWith(anterior), `${RUTA} reescribe lo que el commit padre ya tenía`).toBe(true);
  });

  it('no es familia de ningún fichero: no fecha ni avisa', () => {
    expect(familiaDeFichero(RUTA)).toBeUndefined();
    expect(FAMILIAS_DE_FICHERO.some(([directorio]) => RUTA.startsWith(`${directorio}/`))).toBe(false);
  });
});
