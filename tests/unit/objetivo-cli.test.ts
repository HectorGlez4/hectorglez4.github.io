import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { parse as parsearYaml } from 'yaml';
import {
  CABECERA_DE_SESIONES,
  FICHERO_DE_SESIONES,
  fechaLocal,
  horaLocal,
} from '../../tools/lib/corpus.ts';
import { MIN_CITAS_POR_TEMA, SUELO_TRADICION_LATINOAMERICANA } from '../../src/lib/umbrales.ts';

const ejecutar = promisify(execFile);
const RAIZ = resolve(import.meta.dirname, '../..');

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

/**
 * Historia 11.3 — la orden, sobre disco y de punta a punta.
 *
 * Lo puro está en `objetivo.test.ts`. Aquí se mide lo que solo se ve sobre ficheros: que
 * la orden lea el corpus que se le indica, que registrar quede **escrito** y consultar no
 * escriba nada, que el resultado medido salga del Corpus y no de un argumento, y que el
 * registro no reescriba nunca lo que ya estaba.
 */

interface Opciones {
  tradiciones?: string[];
  citasPorTema?: Record<string, number>;
  /** Cuántas de las Citas escritas llevan Procedencia completa (obra y año). */
  conProcedencia?: number;
}

async function corpusDePrueba({
  tradiciones = ['latinoamericana', 'peninsular', 'peninsular', 'peninsular'],
  citasPorTema = {},
  conProcedencia = 0,
}: Opciones = {}) {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-objetivo-'));
  temporales.push(raiz);
  const corpus = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', '_revision', 'fuentes']) {
    await mkdir(join(corpus, dir), { recursive: true });
  }

  await Promise.all(
    tradiciones.map((tradicion, i) =>
      writeFile(
        join(corpus, 'autores', `autor-${i}.yml`),
        `nombre: "Autor ${i}"\nañoFallecimiento: 65\nsemblanza: "Semblanza de prueba."\n` +
          `tradicion: "${tradicion}"\n`,
        'utf8',
      ),
    ),
  );

  let escritas = 0;
  for (const [tema, cuantas] of Object.entries(citasPorTema)) {
    await writeFile(join(corpus, 'temas', `${tema}.yml`), `nombre: "Tema ${tema}"\n`, 'utf8');
    for (let i = 0; i < cuantas; i += 1) {
      const completa = escritas < conProcedencia;
      escritas += 1;
      await writeFile(
        join(corpus, 'citas', `${tema}-${i}.md`),
        [
          '---',
          `slug: "${tema}-${i}"`,
          `texto: "Texto de prueba número ${i} del Tema ${tema}."`,
          'autor: "autor-0"',
          'temas:',
          `  - ${tema}`,
          ...(completa
            ? ['procedencia:', '  obra: "Obra de prueba"', '  año: 100']
            : ['procedencia:', '  referencia: "Atribuida"']),
          '---',
          '',
        ].join('\n'),
        'utf8',
      );
    }
  }

  return corpus;
}

async function correr(argumentos: string[]) {
  try {
    const { stdout, stderr } = await ejecutar(
      'npx',
      ['tsx', join(RAIZ, 'tools/objetivo.ts'), ...argumentos],
      { cwd: RAIZ },
    );
    return { codigo: 0, salida: stdout, error: stderr };
  } catch (e) {
    const fallo = e as { code?: number; stdout?: string; stderr?: string };
    return { codigo: fallo.code ?? 1, salida: fallo.stdout ?? '', error: fallo.stderr ?? '' };
  }
}

async function sesionesRegistradas(corpus: string): Promise<Record<string, never>[]> {
  const contenido = await readFile(join(corpus, FICHERO_DE_SESIONES), 'utf8');
  const leido = parsearYaml(contenido) as { sesiones?: Record<string, never>[] | null };
  return leido.sesiones ?? [];
}

describe('Historia 11.3 — la orden propone los dos ejes y declara el hueco', () => {
  it('con la tradición por debajo del suelo, propone cerrar ese hueco y dónde van las Citas', async () => {
    const corpus = await corpusDePrueba({ citasPorTema: { 'el-tiempo': 3 } });
    const { codigo, salida, error } = await correr(['--corpus', corpus]);

    expect(codigo, error).toBe(0);
    expect(salida).toContain('Objetivo de la sesión');
    expect(salida).toContain('tradición latinoamericana');
    expect(salida).toContain('Tema «Tema el-tiempo»');
    expect(salida).toContain('Sale del hueco:');
  });

  it('con el suelo alcanzado, propone el Tema al que menos le falta', async () => {
    const corpus = await corpusDePrueba({
      tradiciones: ['latinoamericana', 'latinoamericana', 'peninsular'],
      citasPorTema: { 'el-tiempo': MIN_CITAS_POR_TEMA - 2, 'la-amistad': 1 },
    });
    const { codigo, salida, error } = await correr(['--corpus', corpus, '--json']);

    expect(codigo, error).toBe(0);
    const { objetivo } = JSON.parse(salida);
    expect(objetivo.clase).toBe('tema');
    expect(objetivo.tema.slug).toBe('el-tiempo');
    expect(objetivo.tema.faltan).toBe(2);
  });

  it('sobre el corpus de verdad, dos llamadas seguidas dan exactamente lo mismo', async () => {
    // Es la comprobación de determinismo que pide la historia, y la que un agente que
    // siembra sin supervisión necesita: mismo Corpus, mismo objetivo, palabra por palabra.
    const primera = await correr(['--json']);
    const segunda = await correr(['--json']);
    expect(primera.codigo, primera.error).toBe(0);
    expect(segunda.salida).toBe(primera.salida);
  });

  it('sobre el corpus de verdad, lo único entrecomillado son Temas', async () => {
    /*
     * Reemplaza a una prueba que buscaba uno a uno los nombres de los Autores del Corpus:
     * eso ni cazaba el peligro real —proponer a alguien que **no** está en el Corpus— ni
     * aguantaba un nombre que fuera subcadena de otro texto. Los nombres propios que la
     * política escribe van entre «», así que la regla comprobable es que todos sean Temas.
     */
    const { salida } = await correr([]);
    const temas = new Set(
      (await readdir(resolve(RAIZ, 'corpus/temas')))
        .filter((f) => f.endsWith('.yml'))
        .map(
          (f) =>
            /^nombre:\s*"?([^"\n]+?)"?\s*$/m.exec(
              readFileSync(resolve(RAIZ, 'corpus/temas', f), 'utf8'),
            )?.[1],
        ),
    );

    const entrecomillados = [...salida.matchAll(/«([^»]+)»/gu)].map((m) => m[1]);

    /*
     * Sin huecos, la política no nombra ningún Tema, y eso es lo correcto: desde la segunda
     * sesión de sembrado de la 11.4 el Corpus llegó a tener **todos** los Temas por encima
     * del umbral, y la orden pasó a responder «No hay hueco que cerrar». Exigir aquí un
     * entrecomillado convertía en fallo el estado que la épica persigue.
     *
     * Lo que sí se conserva es el control positivo, que era la razón de aquella exigencia:
     * o hay algo entrecomillado —y entonces son todos Temas—, o la orden declara que no hay
     * hueco. Lo que no puede es callar las dos cosas.
     */
    if (entrecomillados.length === 0) {
      expect(salida).toContain('No hay hueco que cerrar');
    }
    for (const termino of entrecomillados) expect(temas, termino).toContain(termino);
  });

  it('consultar no registra nada: consultar no es sembrar', async () => {
    /*
     * Es la distinción que sostiene la cadencia de la Historia 11.4. Un registro que
     * anotara cada consulta contaría preguntas y no sesiones, y la cadencia que saliera de
     * él sería la de mirar la herramienta, no la de sembrar.
     */
    const corpus = await corpusDePrueba();

    await correr(['--corpus', corpus]);
    await correr(['--corpus', corpus, '--json']);

    expect(existsSync(join(corpus, FICHERO_DE_SESIONES))).toBe(false);
  });
});

describe('Historia 11.3 — la sesión aceptada también queda registrada', () => {
  it('--registrar anota la sesión con lo propuesto y su hueco', async () => {
    const corpus = await corpusDePrueba();
    const propuesta = await correr(['--corpus', corpus, '--json']);
    const { objetivo } = JSON.parse(propuesta.salida);

    const { codigo, salida, error } = await correr(['--corpus', corpus, '--registrar']);

    expect(codigo, error).toBe(0);
    expect(salida).toContain('Registrado en');

    const sesiones = await sesionesRegistradas(corpus);
    expect(sesiones).toHaveLength(1);
    expect(sesiones[0].fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(sesiones[0].hora).toMatch(/^\d{2}:\d{2}$/);
    expect(sesiones[0].clase).toBe(objetivo.clase);
    expect(sesiones[0].propuesto).toBe(objetivo.objetivo);
    expect(sesiones[0].hueco).toBe(objetivo.hueco);
  });

  it('guarda los ejes estructurados, no solo la frase', async () => {
    // Sin esto, la Historia 11.4 tendría que analizar prosa en español para saber a qué
    // Tema se dedicó una sesión.
    const corpus = await corpusDePrueba({ citasPorTema: { 'el-tiempo': 3 } });
    await correr(['--corpus', corpus, '--registrar']);

    const [sesion] = await sesionesRegistradas(corpus);
    expect(sesion.tema).toMatchObject({ slug: 'el-tiempo', publicadas: 3, faltan: MIN_CITAS_POR_TEMA - 3 });
    expect(sesion.tradicion).toMatchObject({
      nombre: 'latinoamericana',
      porcentaje: 25,
      suelo: SUELO_TRADICION_LATINOAMERICANA,
      autoresQueFaltan: 1,
    });
  });

  it('sin anulación no escribe ni elegido ni motivo', async () => {
    // Una entrada sin `motivo` es lo que distingue una sesión aceptada de una anulada.
    // Escribirlos vacíos haría creer que hubo una desviación que no hubo.
    const corpus = await corpusDePrueba();
    await correr(['--corpus', corpus, '--registrar']);

    const [sesion] = await sesionesRegistradas(corpus);
    expect('motivo' in sesion).toBe(false);
    expect('elegido' in sesion).toBe(false);
  });

  it('el --json de una sesión registrada dice si se aceptó y dónde quedó', async () => {
    const corpus = await corpusDePrueba();
    const { salida } = await correr(['--corpus', corpus, '--registrar', '--json']);
    const leido = JSON.parse(salida);
    expect(leido.sesion.aceptado).toBe(true);
    expect(leido.registro).toContain(FICHERO_DE_SESIONES);
  });
});

describe('Historia 11.3 — el resultado medido lo deriva la orden del Corpus', () => {
  it('cuenta las Citas, SM-C1 y la proporción de tradición', async () => {
    const corpus = await corpusDePrueba({
      tradiciones: ['latinoamericana', 'peninsular', 'peninsular', 'peninsular'],
      citasPorTema: { 'el-tiempo': 4 },
      conProcedencia: 1,
    });
    await correr(['--corpus', corpus, '--registrar']);

    const [sesion] = await sesionesRegistradas(corpus);
    expect(sesion.resultado).toEqual({
      citasPublicadas: 4,
      procedenciaCompleta: 25,
      tradicionLatinoamericana: 25,
    });
  });

  it('no se puede teclear: cambia con el Corpus, no con lo que se le pase', async () => {
    /*
     * El criterio de cierre de la épica compara estas cifras entre entradas —una sesión
     * en la que SM-C1 baja mientras sube el número de Citas es fallida—, y esa comparación
     * no vale nada si el número lo escribe quien informa de la sesión.
     */
    const corpus = await corpusDePrueba({ citasPorTema: { 'el-tiempo': 2 }, conProcedencia: 2 });
    await correr(['--corpus', corpus, '--registrar']);

    // Se siembra una Cita más, sin procedencia completa: SM-C1 baja mientras las Citas suben.
    await writeFile(
      join(corpus, 'citas', 'el-tiempo-9.md'),
      ['---', 'slug: "el-tiempo-9"', 'texto: "Otra más."', 'autor: "autor-0"',
        'temas:', '  - el-tiempo', 'procedencia:', '  referencia: "Atribuida"', '---', ''].join('\n'),
      'utf8',
    );
    await correr(['--corpus', corpus, '--registrar']);

    const [antes, despues] = await sesionesRegistradas(corpus);
    expect(antes.resultado).toMatchObject({ citasPublicadas: 2, procedenciaCompleta: 100 });
    expect(despues.resultado).toMatchObject({ citasPublicadas: 3, procedenciaCompleta: 66.7 });
  });

  it('y la orden lo enseña al registrar, con la coma decimal en su sitio', async () => {
    const corpus = await corpusDePrueba({ citasPorTema: { 'el-tiempo': 3 }, conProcedencia: 1 });
    const { salida } = await correr(['--corpus', corpus, '--registrar']);
    expect(salida).toContain('Resultado medido del Corpus');
    expect(salida).toContain('33,3 %');
    expect(salida).not.toContain('33.3');
  });
});

describe('Historia 11.3 — la anulación del editor queda registrada', () => {
  it('escribe lo propuesto, lo elegido y el motivo', async () => {
    const corpus = await corpusDePrueba();
    const propuesta = await correr(['--corpus', corpus, '--json']);
    const { objetivo } = JSON.parse(propuesta.salida);

    const { codigo, salida, error } = await correr([
      '--corpus', corpus,
      '--anular', 'Hay una edición recién digitalizada que caduca esta semana.',
      '--elegido', 'Sembrar el Tema de la amistad.',
    ]);

    expect(codigo, error).toBe(0);
    expect(salida).toContain('Registrado en');

    const sesiones = await sesionesRegistradas(corpus);
    expect(sesiones).toHaveLength(1);
    expect(sesiones[0].propuesto).toBe(objetivo.objetivo);
    expect(sesiones[0].hueco).toBe(objetivo.hueco);
    expect(sesiones[0].clase).toBe(objetivo.clase);
    expect(sesiones[0].elegido).toBe('Sembrar el Tema de la amistad.');
    expect(sesiones[0].motivo).toBe('Hay una edición recién digitalizada que caduca esta semana.');
    expect(sesiones[0].resultado).toBeDefined();
  });

  it('su --json dice que no se aceptó', async () => {
    const corpus = await corpusDePrueba();
    const { salida } = await correr(['--corpus', corpus, '--anular', 'Otro plan.', '--json']);
    const leido = JSON.parse(salida);
    expect(leido.sesion.aceptado).toBe(false);
    expect(leido.sesion.motivo).toBe('Otro plan.');
  });

  it('crea el registro con su cabecera cuando el corpus todavía no lo tiene', async () => {
    const corpus = await corpusDePrueba();
    expect(existsSync(join(corpus, FICHERO_DE_SESIONES))).toBe(false);

    await correr(['--corpus', corpus, '--anular', 'Motivo escrito.']);

    const contenido = await readFile(join(corpus, FICHERO_DE_SESIONES), 'utf8');
    expect(contenido.startsWith(CABECERA_DE_SESIONES)).toBe(true);
  });

  it('un elegido en blanco es un elegido que no se ha dado, en los tres sitios', async () => {
    /*
     * `--elegido "   "` llegó a dar tres respuestas distintas a la misma entrada: omitido
     * en el YAML, cadena vacía en el `--json` y una línea en blanco en la terminal.
     */
    const corpus = await corpusDePrueba();
    const { salida } = await correr([
      '--corpus', corpus, '--anular', 'Motivo sin alternativa declarada.', '--elegido', '   ',
    ]);

    expect(salida).toContain('otro objetivo, sin declarar');
    const [sesion] = await sesionesRegistradas(corpus);
    expect('elegido' in sesion).toBe(false);

    const { salida: json } = await correr([
      '--corpus', corpus, '--anular', 'Otro motivo distinto.', '--elegido', '   ', '--json',
    ]);
    expect('elegido' in JSON.parse(json).sesion).toBe(false);
  });

  it('el registro solo añade: la sesión anterior sigue intacta', async () => {
    const corpus = await corpusDePrueba();
    await correr(['--corpus', corpus, '--anular', 'Primera anulación.']);
    const primero = await readFile(join(corpus, FICHERO_DE_SESIONES), 'utf8');

    await correr(['--corpus', corpus, '--registrar']);
    const segundo = await readFile(join(corpus, FICHERO_DE_SESIONES), 'utf8');

    await correr(['--corpus', corpus, '--anular', 'Segunda anulación.', '--elegido', 'Otra cosa.']);
    const tercero = await readFile(join(corpus, FICHERO_DE_SESIONES), 'utf8');

    // Byte a byte: lo que había antes es un prefijo literal de lo que hay ahora, y lo es
    // en los dos caminos que escriben. Una serie que se puede reescribir no mide nada.
    expect(segundo.startsWith(primero)).toBe(true);
    expect(tercero.startsWith(segundo)).toBe(true);

    const sesiones = await sesionesRegistradas(corpus);
    expect(sesiones.map((s) => s.motivo)).toEqual([
      'Primera anulación.',
      undefined,
      'Segunda anulación.',
    ]);
  });
});

describe('Historia 11.3 — lo que la orden no registra', () => {
  it('una anulación sin motivo sale con código distinto de cero y no escribe nada', async () => {
    const corpus = await corpusDePrueba();
    const { codigo, error } = await correr(['--corpus', corpus, '--anular']);

    expect(codigo).not.toBe(0);
    expect(error).toContain('motivo');
    expect(existsSync(join(corpus, FICHERO_DE_SESIONES))).toBe(false);
  });

  it('tampoco cuela un motivo en blanco', async () => {
    const corpus = await corpusDePrueba();
    const { codigo } = await correr(['--corpus', corpus, '--anular', '   ']);
    expect(codigo).not.toBe(0);
    expect(existsSync(join(corpus, FICHERO_DE_SESIONES))).toBe(false);
  });

  it('ni escribir --anular delante de otra opción', async () => {
    // `--anular --json` no da motivo: el valor de una opción nunca es otra opción.
    const corpus = await corpusDePrueba();
    const { codigo } = await correr(['--corpus', corpus, '--anular', '--json']);
    expect(codigo).not.toBe(0);
  });

  it('declarar otro objetivo sin motivo: --elegido a secas se rechaza', async () => {
    // Sería la puerta de atrás que `--anular` cierra: una desviación registrada sin
    // motivo. Declarar otro objetivo **es** anular la propuesta.
    const corpus = await corpusDePrueba();
    const { codigo, error } = await correr([
      '--corpus', corpus, '--registrar', '--elegido', 'Otra cosa.',
    ]);
    expect(codigo).not.toBe(0);
    expect(error).toContain('--anular');
    expect(existsSync(join(corpus, FICHERO_DE_SESIONES))).toBe(false);
  });

  it('un reintento no es una sesión más', async () => {
    // Dos entradas idénticas de la misma jornada inflarían la cadencia justo en el
    // sentido que la haría parecer mejor de lo que fue.
    const corpus = await corpusDePrueba();
    expect((await correr(['--corpus', corpus, '--registrar'])).codigo).toBe(0);

    const repetido = await correr(['--corpus', corpus, '--registrar']);
    expect(repetido.codigo).not.toBe(0);
    expect(repetido.error).toContain('reintento');
    expect(await sesionesRegistradas(corpus)).toHaveLength(1);
  });

  it('pero dos sesiones distintas del mismo día sí caben', async () => {
    const corpus = await corpusDePrueba();
    await correr(['--corpus', corpus, '--registrar']);
    expect((await correr(['--corpus', corpus, '--anular', 'Cambié de plan.'])).codigo).toBe(0);
    expect(await sesionesRegistradas(corpus)).toHaveLength(2);
  });

  it('no se acepta un objetivo que no existe', async () => {
    /*
     * Sin hueco que cerrar no hay nada que sembrar, y registrarlo metería en la serie de
     * la cadencia una sesión que no lo fue.
     */
    const sinHuecos = await corpusDePrueba({
      tradiciones: ['latinoamericana', 'latinoamericana', 'peninsular'],
      citasPorTema: { 'el-tiempo': MIN_CITAS_POR_TEMA },
    });
    const rechazo = await correr(['--corpus', sinHuecos, '--registrar']);
    expect(rechazo.codigo).not.toBe(0);
    expect(rechazo.error).toContain('No hay objetivo que aceptar');
    expect(existsSync(join(sinHuecos, FICHERO_DE_SESIONES))).toBe(false);

    const sinAutores = await corpusDePrueba({ tradiciones: [] });
    expect((await correr(['--corpus', sinAutores, '--registrar'])).codigo).not.toBe(0);
  });

  it('pero el editor sí puede anular ahí: eso sí es una sesión corrida', async () => {
    const corpus = await corpusDePrueba({
      tradiciones: ['latinoamericana', 'latinoamericana', 'peninsular'],
      citasPorTema: { 'el-tiempo': MIN_CITAS_POR_TEMA },
    });
    const { codigo, error } = await correr([
      '--corpus', corpus, '--anular', 'Sembré por gusto, sin hueco que cerrar.',
    ]);
    expect(codigo, error).toBe(0);
    expect(await sesionesRegistradas(corpus)).toHaveLength(1);
  });
});

describe('Historia 11.3 — una bandera que no se reconoce no es «lo mismo pero sin ella»', () => {
  it('la errata se rechaza en vez de consultar en silencio con código 0', async () => {
    // `--registar` imprimía la propuesta, no registraba nada y salía con éxito: el guion
    // de la sesión se quedaba creyendo que la había anotado.
    const corpus = await corpusDePrueba();
    const { codigo, error } = await correr(['--corpus', corpus, '--registar']);

    expect(codigo).not.toBe(0);
    expect(error).toContain('--registar');
    expect(existsSync(join(corpus, FICHERO_DE_SESIONES))).toBe(false);
  });

  it('un argumento suelto tampoco pasa', async () => {
    const corpus = await corpusDePrueba();
    const { codigo } = await correr(['--corpus', corpus, 'registrar']);
    expect(codigo).not.toBe(0);
  });

  it('--ayuda explica los tres modos y sale bien', async () => {
    const { codigo, salida } = await correr(['--ayuda']);
    expect(codigo).toBe(0);
    for (const modo of ['--registrar', '--anular', '--json']) expect(salida).toContain(modo);
  });
});

describe('Historia 11.3 — el registro se comprueba antes de escribir en él', () => {
  it.each([
    ['vacío', ''],
    ['sin la clave sesiones', '# solo un comentario\notra_cosa: 1\n'],
    ['con sesiones que no es lista', 'sesiones: 3\n'],
  ])('un registro %s se rechaza nombrando el fichero, y no se escribe nada', async (_, contenido) => {
    /*
     * `appendFile` sobre un fichero sin la clave `sesiones:` deja una lista huérfana al
     * final: el YAML sigue siendo válido, todo lector ve cero sesiones, y la serie de la
     * que sale la cadencia desaparece sin que nada se queje.
     */
    const corpus = await corpusDePrueba();
    await writeFile(join(corpus, FICHERO_DE_SESIONES), contenido, 'utf8');

    const { codigo, error } = await correr(['--corpus', corpus, '--registrar']);

    expect(codigo).not.toBe(0);
    expect(error).toContain(FICHERO_DE_SESIONES);
    expect(await readFile(join(corpus, FICHERO_DE_SESIONES), 'utf8')).toBe(contenido);
  });
});

describe('Historia 11.3 — la fecha de una sesión es la local, no la de Greenwich', () => {
  it('fecha y hora salen de la hora local del reloj', () => {
    /*
     * `toISOString().slice(0, 10)` fechaba al día siguiente cualquier sesión posterior a
     * las 22:00 peninsulares. Sobre lo único que este fichero existe para medir eso no es
     * un redondeo: es un sesgo que reparte sesiones a jornadas en las que nadie sembró.
     */
    const casiMedianoche = new Date(2026, 7, 19, 23, 30);
    expect(fechaLocal(casiMedianoche)).toBe('2026-08-19');
    expect(horaLocal(casiMedianoche)).toBe('23:30');
  });

  it('rellena con ceros para que el orden alfabético sea el cronológico', () => {
    expect(fechaLocal(new Date(2026, 0, 5, 9, 5))).toBe('2026-01-05');
    expect(horaLocal(new Date(2026, 0, 5, 9, 5))).toBe('09:05');
  });
});

describe('Historia 11.3 — el registro del corpus está versionado', () => {
  const ruta = resolve(RAIZ, 'corpus', FICHERO_DE_SESIONES);

  it('existe y arranca con la cabecera de la que hay un solo dueño', () => {
    /*
     * La cabecera estuvo escrita dos veces —en `tools/lib/corpus.ts` y en el fichero— y
     * las dos copias divergieron en el primer cambio: quien leía el fichero del
     * repositorio y quien creaba uno nuevo en un corpus de pruebas aprendían reglas
     * distintas del mismo registro.
     */
    expect(existsSync(ruta)).toBe(true);
    expect(readFileSync(ruta, 'utf8').startsWith(CABECERA_DE_SESIONES)).toBe(true);
  });

  it('declara arriba que de aquí sale la cadencia de la Historia 11.4', () => {
    // Sin decirlo, se toma por un registro accesorio y se deja de rellenar — y la
    // cadencia que §14.3 del PRD dejó abierta se cerraría con una estimación.
    expect(CABECERA_DE_SESIONES).toMatch(/cadencia/i);
    expect(CABECERA_DE_SESIONES).toMatch(/11\.4/);
    expect(CABECERA_DE_SESIONES).toMatch(/--registrar/);
    expect(CABECERA_DE_SESIONES).toMatch(/RESULTADO MEDIDO/);
  });

  it('es metadato del Corpus, no una colección', () => {
    // Vive en la raíz de `corpus/`, junto a `portada.json`: ninguna base de
    // `src/content.config.ts` apunta ahí, así que nada de esto llega al sitio construido.
    const configuracion = readFileSync(resolve(RAIZ, 'src/content.config.ts'), 'utf8');
    expect(configuracion).not.toContain(FICHERO_DE_SESIONES);
  });

  it('una sesión de sembrado termina registrándose, y eso está escrito donde se lee', () => {
    // Sin guion ni mención, el registro del que depende la cadencia se queda vacío por
    // omisión: nadie ejecuta lo que no sabe que existe.
    const paquete = JSON.parse(readFileSync(resolve(RAIZ, 'package.json'), 'utf8'));
    expect(paquete.scripts['sesion:registrar']).toContain('--registrar');
    expect(readFileSync(resolve(RAIZ, 'AGENTS.md'), 'utf8')).toContain('sesion:registrar');
  });
});

describe('Historia 11.3 — la vista de huecos cierra con el objetivo', () => {
  it('quien mira los huecos no tiene que ejecutar dos órdenes', async () => {
    const { stdout } = await ejecutar('npx', ['tsx', 'tools/huecos.ts'], { cwd: RAIZ });
    expect(stdout).toContain('Objetivo de la sesión');
    expect(stdout).toContain('Sale del hueco:');
    // Y va al final: leer la propuesta antes que su fundamento sería leer una orden.
    expect(stdout.indexOf('Objetivo de la sesión')).toBeGreaterThan(
      stdout.indexOf('Equilibrio de tradición'),
    );
  });

  it('el --json de los huecos lo lleva junto al informe', async () => {
    const { stdout } = await ejecutar('npx', ['tsx', 'tools/huecos.ts', '--json'], { cwd: RAIZ });
    const informe = JSON.parse(stdout);
    // Sin fijar cuál: la clase que salga depende del estado del Corpus, y la Historia
    // 11.4 lo va a mover. Lo que no puede faltar es el objetivo con su hueco declarado.
    expect(['tradicion', 'tema', 'ninguno', 'sin-estado']).toContain(informe.objetivo.clase);
    expect(informe.objetivo.hueco.length).toBeGreaterThan(0);
    expect(informe.tradicion.suelo).toBe(SUELO_TRADICION_LATINOAMERICANA);
  });

  it('las dos órdenes hermanas escriben los porcentajes igual', async () => {
    // `tools/auditoria.ts` imprimía «33.3 %» mientras `tools/huecos.ts` imprimía «16,7 %»:
    // dos informes del mismo Corpus con dos convenciones.
    for (const orden of ['tools/huecos.ts', 'tools/auditoria.ts']) {
      const { stdout } = await ejecutar('npx', ['tsx', orden], { cwd: RAIZ });
      expect(stdout, orden).toMatch(/\d,\d %/);
      expect(stdout, orden).not.toMatch(/\d\.\d %/);
    }
  });
});
