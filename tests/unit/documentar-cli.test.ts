import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  type CorpusDePrueba,
} from './ayuda/construir.js';
import { componerDocumento } from '../../tools/lib/documento.ts';
import { CENSO_DE_PARTIDA, FICHERO_DEL_CENSO } from '../../tools/lib/cotejo.ts';

const ejecutar = promisify(execFile);

/**
 * Historia 11.6 — la orden, y la razón de que documentar y descensar sean un solo gesto.
 *
 * Lo puro está en `documentacion.test.ts`. Aquí se mide lo que solo se ve ejecutando la
 * orden de verdad —que lea el corpus que se le indica, y que los códigos de salida
 * distingan **2 la forma de la invocación de 1 lo que la invocación dice**— y lo que solo
 * se ve construyendo: que lo que la orden deja **construye**, y que el estado intermedio
 * que la orden hace imposible —Cita documentada y todavía censada— rompería la
 * construcción si alguien lo compusiera a mano.
 *
 * Nada de esto toca `corpus/`: todo ocurre en corpus temporales.
 */

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.splice(0).map(limpiar));
});

/*
 * El slug y el texto son los de una de las 38 anteriores a la v3, tal cual.
 *
 * No es decorativo: el censo de partida de `tools/lib/cotejo.ts` ata cada exención a la
 * huella del texto, y el build usa ese conjunto de verdad. Una Cita inventada no se puede
 * censar, así que no serviría para medir lo que estas pruebas miden.
 */
const SLUG = 'seneca-no-es-que-tengamos-poco-tiempo-es';
const TEXTO = 'No es que tengamos poco tiempo, es que perdemos mucho.';
const FICHERO = 'citas/seneca--no-es-que-tengamos-poco-tiempo-es.md';
const OBRA = 'Sobre la brevedad de la vida';
const AÑO = 49;
const DOCUMENTO = 'fuentes/wikisource-es--sobre-la-brevedad-de-la-vida.txt';

/**
 * Otra de las 38, que se queda en el censo: es la que prueba que documentar una borra su
 * línea y **solo** la suya. Va con su texto exacto porque el censo ata cada exención a la
 * huella de su texto, y uno inventado no se eximiría.
 */
const OTRA_CENSADA = 'seneca-la-vida-si-sabes-usarla-es-larga';
const OTRO_TEXTO = 'La vida, si sabes usarla, es larga.';

/** El censo, con su cabecera de comentarios: la orden tiene que dejarla intacta. */
const CENSO = `# Pendientes de cotejo — Historia 11.2
#
# Las Citas de esta lista se publican sin que el build compruebe su texto.
#
# Es un CENSO CERRADO: no admite altas, y solo mengua.

citas:
  - ${SLUG}
  - ${OTRA_CENSADA}
`;

/** Un documento como el que deja `tools/recuperar.ts`. */
const CUERPO = [
  'No todos padecemos la misma escasez.',
  '',
  'No es que tengamos poco tiempo, es que perdemos mucho.',
  '',
  'La paciencia todo lo alcanza, decía otra.',
].join('\n');

/**
 * Cómo declara la Fuente a quien firma. Coincide con el `nombre` de `AUTOR_VALIDO`, que
 * es la ficha de `autores/seneca.yml` de este corpus: es el lado del Corpus en la puerta
 * del Autor, y sin la línea de autor en la declaración no habría nada que cotejar —cosa
 * que ningún documento real de Wikisource hace—.
 */
const AUTOR_DECLARADO = 'Séneca';

function documentoDe(autor: string | null = AUTOR_DECLARADO): string {
  return componerDocumento(
    {
      fuente: 'wikisource-es',
      obra: OBRA,
      año: AÑO,
      url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
      recuperado: '2026-08-21',
    },
    [
      OBRA,
      `Año de publicación: ${AÑO}`,
      ...(autor === null ? [] : [`|autor=${autor}`]),
    ].join('\n'),
    CUERPO,
  );
}

const documento = documentoDe();

/** La Cita tal y como está publicada desde la v1: con Procedencia tecleada y sin Fuente. */
const CITA_CENSADA = citaValida({
  slug: SLUG,
  texto: TEXTO,
  procedencia: { obra: 'De brevitate vitae' },
  fuente: undefined,
});

const CORPUS: CorpusDePrueba = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  [FICHERO]: CITA_CENSADA,
  'citas/seneca--la-vida-si-sabes-usarla-es-larga.md': citaValida({
    slug: OTRA_CENSADA,
    texto: OTRO_TEXTO,
    procedencia: { obra: 'Sobre la brevedad de la vida' },
    fuente: undefined,
  }),
  [DOCUMENTO]: documento,
  [FICHERO_DEL_CENSO]: CENSO,
};

async function enDisco(corpus: CorpusDePrueba): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-documentar-cli-'));
  temporales.push(raiz);
  const directorio = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', '_revision', 'fuentes']) {
    await mkdir(join(directorio, dir), { recursive: true });
  }
  for (const [ruta, contenido] of Object.entries(corpus)) {
    const destino = join(directorio, ruta);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, contenido, 'utf8');
  }
  return directorio;
}

async function correr(corpus: string, argumentos: string[]) {
  try {
    const { stdout, stderr } = await ejecutar(
      'npx',
      ['tsx', join(RAIZ, 'tools/documentar.ts'), ...argumentos, '--corpus', corpus],
      { cwd: RAIZ },
    );
    return { codigo: 0, salida: stdout, error: stderr };
  } catch (e) {
    const fallo = e as { code?: number; stdout?: string; stderr?: string };
    return { codigo: fallo.code ?? 1, salida: fallo.stdout ?? '', error: fallo.stderr ?? '' };
  }
}

/** El corpus de un directorio temporal, tal cual, para dárselo al build. */
async function leerCorpus(directorio: string): Promise<CorpusDePrueba> {
  const entradas = await readdir(directorio, { recursive: true, withFileTypes: true });
  const corpus: CorpusDePrueba = {};
  for (const entrada of entradas) {
    if (!entrada.isFile()) continue;
    const ruta = join(entrada.parentPath, entrada.name);
    corpus[ruta.slice(directorio.length + 1)] = await readFile(ruta, 'utf8');
  }
  return corpus;
}

async function construir(corpus: CorpusDePrueba) {
  const resultado = await construirConCorpus(corpus);
  aLimpiar.push(resultado.proyecto);
  return resultado;
}

const rutaDelDocumento = (corpus: string) => join(corpus, DOCUMENTO);

describe('Historia 11.6 — la orden', () => {
  it('documenta, saca del censo y deja la cabecera del censo intacta', async () => {
    const corpus = await enDisco(CORPUS);

    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(hecho.salida).toContain('queda documentada');
    expect(hecho.salida).toContain('quedan 1 pendientes');

    const cita = await readFile(join(corpus, FICHERO), 'utf8');
    expect(cita).toContain('id: "wikisource-es"');
    expect(cita).toContain(`obra: "${OBRA}"`);
    expect(cita).toContain(`año: ${AÑO}`);

    const censo = await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8');
    expect(censo).not.toContain(SLUG);
    // Se borra una línea, no se vuelca el fichero: los comentarios son la única
    // explicación escrita de por qué existe un censo cerrado.
    expect(censo).toContain('# Pendientes de cotejo — Historia 11.2');
    expect(censo).toContain('# Es un CENSO CERRADO: no admite altas, y solo mengua.');
    expect(censo).toContain(`  - ${OTRA_CENSADA}`);
    // Y el diff que produce es de una sola línea.
    expect(censo).toBe(CENSO.replace(`  - ${SLUG}\n`, ''));
  });

  it('dice el cambio de obra por el error estándar, antes de escribir', async () => {
    const corpus = await enDisco(CORPUS);
    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(hecho.error).toContain('La obra cambia');
    expect(hecho.error).toContain('De brevitate vitae');
  });

  it('rechaza con código 1 lo que la invocación dice', async () => {
    const corpus = await enDisco({
      ...CORPUS,
      [FICHERO]: citaValida({
        slug: SLUG,
        texto: TEXTO,
        procedencia: { obra: 'De brevitate vitae' },
        fuente: undefined,
      }),
      [DOCUMENTO]: componerDocumento(
        {
          fuente: 'wikisource-es',
          obra: OBRA,
          año: AÑO,
          url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
          recuperado: '2026-08-21',
        },
        [OBRA, `Año de publicación: ${AÑO}`].join('\n'),
        'Un cuerpo que no dice nada de lo que la Cita dice.',
      ),
    });

    const noAparece = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);
    expect(noAparece.codigo).toBe(1);
    expect(noAparece.error).toContain('no aparece en');

    const conErrata = await correr(corpus, ['seneca-una-que-no-existe', rutaDelDocumento(corpus)]);
    expect(conErrata.codigo).toBe(1);
    expect(conErrata.error).toContain('seneca-una-que-no-existe');

    // Nada de esto ha tocado el corpus.
    expect(await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8')).toBe(CENSO);
  });

  it('rechaza con código 2 lo que está mal invocado', async () => {
    const corpus = await enDisco(CORPUS);

    // Sin motivo no es una retirada: es una desaparición.
    const sinMotivo = await correr(corpus, ['--retirar', SLUG]);
    expect(sinMotivo.codigo).toBe(2);
    expect(sinMotivo.error).toContain('es una desaparición');

    // Una bandera con errata nunca es «lo mismo pero sin ella».
    const conErrata = await correr(corpus, [SLUG, rutaDelDocumento(corpus), '--txto', 'Otra cosa.']);
    expect(conErrata.codigo).toBe(2);
    expect(conErrata.error).toContain('«--txto» no es una opción de esta orden.');

    // Y una orden sin argumentos escribe el uso.
    const desnuda = await correr(corpus, []);
    expect(desnuda.codigo).toBe(2);
    expect(desnuda.error).toContain('Uso:');

    expect(await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8')).toBe(CENSO);
    expect(await readFile(join(corpus, FICHERO), 'utf8')).toBe(CITA_CENSADA);
  });

  it('retira con su motivo: mueve a revisión y sale del censo', async () => {
    const corpus = await enDisco(CORPUS);

    const retirada = await correr(corpus, [
      '--retirar',
      SLUG,
      'No aparece en la edición: es una paráfrasis que circula por internet.',
    ]);
    expect(retirada.codigo, retirada.error).toBe(0);
    expect(retirada.salida).toContain('paráfrasis que circula por internet');

    expect(await readdir(join(corpus, 'citas'))).toEqual([
      'seneca--la-vida-si-sabes-usarla-es-larga.md',
    ]);
    expect(await readdir(join(corpus, '_revision'))).toEqual([
      'seneca--no-es-que-tengamos-poco-tiempo-es.md',
    ]);
    expect(await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8')).not.toContain(SLUG);
  });
});

describe('Historia 11.6 — documentar y salir del censo van juntos', () => {
  it('lo que la orden deja construye, y reponer la línea del censo rompe el build', async () => {
    const corpus = await enDisco(CORPUS);
    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);
    expect(hecho.codigo, hecho.error).toBe(0);

    // Lo que la orden dejó, tal cual, construye: la Cita se coteja de verdad contra su
    // documento y el censo ya no la ampara.
    const documentado = await leerCorpus(corpus);
    const verde = await construir(documentado);
    expect(verde.codigo, verde.salida).toBe(0);
    expect(verde.salida).toContain('1 Cita cotejada');

    /*
     * Y el estado intermedio que la orden hace imposible —Cita documentada y todavía
     * censada— rompe la construcción. Es lo que fija que las dos mitades del gesto no se
     * puedan separar: una orden que dejara solo la primera dejaría el corpus en un estado
     * que no puede existir, y quien la usara se enteraría en el build siguiente.
     */
    const aMedias = await construir({ ...documentado, [FICHERO_DEL_CENSO]: CENSO });
    expect(aMedias.codigo).not.toBe(0);
    expect(aMedias.salida).toMatch(/Quítela del censo/);
  });

  it('el slug de la prueba es de verdad una de las 38, o esto no mide nada', () => {
    expect(CENSO_DE_PARTIDA[SLUG]).toBeDefined();
  });
});

/**
 * FR-23, Historia 11.6 — por la orden: el documento tiene que ser del Autor de la Cita.
 *
 * Lo puro está en `documentacion.test.ts`. Aquí se mide lo que solo se ve ejecutando: el
 * código de salida —**1**, lo que la invocación dice, no 2, que es su forma— y que el
 * censo del corpus real en disco queda byte a byte como estaba.
 */
describe('FR-23 — documentar no ata una Cita a un documento firmado por otro', () => {
  it('el mismo Autor documenta y el parte dice que se cotejó', async () => {
    const corpus = await enDisco(CORPUS);

    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);

    expect(hecho.codigo, hecho.error).toBe(0);
    expect(hecho.salida).toMatch(/Autor:\s+cotejado/);
    expect(hecho.salida).toContain(AUTOR_DECLARADO);
  });

  it('otro Autor sale con código 1, y el censo queda byte a byte como estaba', async () => {
    const corpus = await enDisco({ ...CORPUS, [DOCUMENTO]: documentoDe('Manuel González Prada') });
    const censoAntes = await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8');
    const citaAntes = await readFile(join(corpus, FICHERO), 'utf8');

    const rechazo = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);

    // 1, no 2: la invocación está bien escrita y lo que dice es lo que no cuadra.
    expect(rechazo.codigo).toBe(1);
    expect(rechazo.error).toContain('Manuel González Prada');
    expect(rechazo.error).toContain('Séneca');

    /*
     * Documentar saca la Cita del censo. Sin la puerta, esta Cita quedaba mal atribuida
     * **y** registrada como cotejada, que borra la única señal de que nadie la verificó.
     */
    expect(await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8')).toBe(censoAntes);
    expect(await readFile(join(corpus, FICHERO), 'utf8')).toBe(citaAntes);
    expect(censoAntes).toContain(SLUG);
  });

  it('un autor ilegible sale con código 1 y tampoco toca el censo', async () => {
    const corpus = await enDisco({
      ...CORPUS,
      [DOCUMENTO]: documentoDe('Séneca<ref>el Joven</ref>'),
    });
    const censoAntes = await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8');

    const rechazo = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);

    expect(rechazo.codigo).toBe(1);
    expect(rechazo.error).toMatch(/no se sabe interpretar/);
    expect(await readFile(join(corpus, FICHERO_DEL_CENSO), 'utf8')).toBe(censoAntes);
  });

  it('un documento sin línea de autor documenta igual, y el parte lo dice', async () => {
    // Un metadato que falta no es un fallo, igual que el año: la puerta no actúa y se ve.
    const corpus = await enDisco({ ...CORPUS, [DOCUMENTO]: documentoDe(null) });

    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);

    expect(hecho.codigo, hecho.error).toBe(0);
    expect(hecho.salida).toMatch(/Autor:\s+sin cotejar/);
  });

  it('con dos Autores declarados basta con que la Cita concuerde con uno', async () => {
    const corpus = await enDisco({
      ...CORPUS,
      [DOCUMENTO]: documentoDe('[[Autor:Séneca|Séneca]] y [[Autor:Lucilio|Lucilio]]'),
    });

    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);

    expect(hecho.codigo, hecho.error).toBe(0);
    expect(hecho.salida).toContain('Lucilio');
  });

  it('y lo que la orden deja tras cotejar el Autor sigue construyendo', async () => {
    // La puerta nueva no puede dejar un corpus que el build rechace: es la comprobación
    // que ata esta historia con la 11.2, igual que la de más arriba.
    const corpus = await enDisco(CORPUS);
    const hecho = await correr(corpus, [SLUG, rutaDelDocumento(corpus)]);
    expect(hecho.codigo, hecho.error).toBe(0);

    const verde = await construir(await leerCorpus(corpus));
    expect(verde.codigo, verde.salida).toBe(0);
    expect(verde.salida).toContain('1 Cita cotejada');
  });
});
