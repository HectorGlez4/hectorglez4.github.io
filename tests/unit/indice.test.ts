import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  analizarIndice,
  componerIndice,
  documentosEnElOrdenDelIndice,
  nombreDeIndice,
  obraDeIndice,
  obraDelDocumento,
  paginasDelIndice,
  tituloCanonico,
  tituloDeDireccion,
  type IndiceDeObra,
} from '../../tools/lib/indice.ts';
import {
  leerDocumentosDeFuente,
  leerDocumentosDeclarados,
  leerOrdenDeLosIndices,
  rutasDelCorpus,
} from '../../tools/lib/corpus.ts';
import {
  ENTRADA_DEL_ORDEN_DE_LOS_INDICES,
  guardarOrdenDeLosIndices,
  leerPosicionesDelCorpus,
} from '../../tools/lib/posiciones.ts';

/**
 * Historia 24.9 — el índice de subpáginas que declara la Fuente: cómo se lee de la página
 * pintada, cómo se versiona y se vuelve a leer, cómo casa con los documentos, y que ningún
 * lector de documentos lo toma por uno.
 */

const RAIZ = resolve(import.meta.dirname, '../..');
const ejecutar = promisify(execFile);

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const INDICE = 'https://es.wikisource.org/wiki/Vidas_paralelas';

describe('paginasDelIndice — los títulos que la página pinta, en su orden', () => {
  it('toma los enlaces del espacio principal, en orden y sin repetir', () => {
    const html = `
      <div class="mw-parser-output">
        <a href="/wiki/Autor:Plutarco">Plutarco</a>
        <a href="/wiki/Vidas_paralelas/Teseo" title="Vidas paralelas/Teseo">Teseo</a>
        <a href="https://es.wikisource.org/wiki/Vidas_paralelas/R%C3%B3mulo">Rómulo</a>
        <a href="/wiki/Vidas_paralelas">esta misma</a>
        <a href="/wiki/Vidas_paralelas/Teseo#c1">Teseo otra vez</a>
        <a href="/w/index.php?title=Vidas_paralelas/Numa&amp;action=edit&amp;redlink=1">Numa</a>
        <a href="https://es.wikipedia.org/wiki/Plutarco">en Wikipedia</a>
        <a href="#Índice">ancla</a>
        <a class="x" href='/wiki/vidas_paralelas/Licurgo'>Licurgo</a>
        <a href="/wiki/Categor%C3%ADa:Biograf%C3%ADas">categoría</a>
        <a href="/wiki/P%C3%A1gina:Vidas.pdf/3">página del escaneo</a>
        <a href="/wiki/Don_Quijote:_parte_I">título con dos puntos</a>
      </div>`;
    expect(paginasDelIndice(html, INDICE)).toEqual([
      'Vidas paralelas/Teseo',
      'Vidas paralelas/Rómulo',
      'Vidas paralelas/Licurgo',
      'Don Quijote: parte I',
    ]);
  });

  it('una página sin enlaces al libro no da ninguna', () => {
    expect(paginasDelIndice('<p>Sin enlaces</p><a href="/wiki/Autor:X">X</a>', INDICE)).toEqual([]);
  });

  it('los títulos se canonizan como la Fuente: espacios, guiones bajos, ancla y primera letra', () => {
    expect(tituloCanonico('vidas_paralelas/Pericles#x')).toBe('Vidas paralelas/Pericles');
    expect(tituloDeDireccion('https://es.wikisource.org/wiki/La_gitanilla_%281825%29')).toBe('La gitanilla (1825)');
    expect(tituloDeDireccion('https://es.wikisource.org/w/index.php?title=X')).toBeUndefined();
    expect(tituloDeDireccion('no es una dirección')).toBeUndefined();
  });
});

describe('el fichero del índice', () => {
  const indice: IndiceDeObra = {
    fuente: 'wikisource-es',
    url: INDICE,
    recuperado: '2026-10-31',
    paginas: ['Vidas paralelas/Teseo', 'Vidas paralelas/Rómulo'],
  };

  it('se escribe y se vuelve a leer igual, y no es un documento', () => {
    const texto = componerIndice(indice);
    expect(analizarIndice(texto)).toEqual(indice);
    expect(texto).toContain('no se edita a mano');
    expect(texto.split('\n')).not.toContain('---');
  });

  it('un fichero que no tiene la forma no se lee', () => {
    expect(analizarIndice('fuente: wikisource-es\n')).toBeUndefined();
    expect(analizarIndice(componerIndice({ ...indice, paginas: [] }))).toBeUndefined();
    expect(analizarIndice(componerIndice({ ...indice, recuperado: 'ayer' }))).toBeUndefined();
    expect(analizarIndice(': : :')).toBeUndefined();
  });

  it('se nombra por la Obra de sus documentos, con su extensión propia', () => {
    expect(obraDelDocumento('wikisource-es--vidas-paralelas--vidas-paralelas-pericles')).toBe('wikisource-es--vidas-paralelas');
    expect(obraDelDocumento('wikisource-es--novelas-ejemplares')).toBe('wikisource-es--novelas-ejemplares');
    expect(nombreDeIndice('wikisource-es--vidas-paralelas')).toBe('wikisource-es--vidas-paralelas.indice.yml');
    expect(obraDeIndice('corpus/fuentes/wikisource-es--vidas-paralelas.indice.yml')).toBe('wikisource-es--vidas-paralelas');
    expect(obraDeIndice('corpus/fuentes/wikisource-es--vidas-paralelas.txt')).toBeUndefined();
    expect(obraDeIndice('.indice.yml')).toBeUndefined();
  });
});

describe('documentosEnElOrdenDelIndice — el casado por la dirección de la cabecera', () => {
  const obra = 'wikisource-es--libro';
  const url = (titulo: string) => `https://es.wikisource.org/wiki/${encodeURIComponent(titulo.replace(/ /gu, '_'))}`;
  const indice: IndiceDeObra = {
    fuente: 'wikisource-es',
    url: url('Libro'),
    recuperado: '2026-10-31',
    paginas: ['Libro/Segunda', 'Libro/Primera', 'Libro/Sin documento', 'Libro/Redirigida'],
  };

  it('el índice manda, la portada del libro va primero y lo no enlazado no entra', () => {
    const orden = documentosEnElOrdenDelIndice(obra, indice, [
      { nombre: `${obra}--libro-primera`, url: url('Libro/Primera') },
      { nombre: `${obra}--libro-segunda`, url: url('Libro/Segunda') },
      { nombre: `${obra}--libro-suelta`, url: url('Libro/Suelta') },
      { nombre: obra, url: url('Libro') },
      { nombre: `${obra}--libro-redirigida`, url: url('Otra cosa'), pedido: url('Libro/Redirigida') },
      { nombre: 'wikisource-es--otro--libro-primera', url: url('Libro/Primera') },
    ]);
    expect(orden).toEqual([obra, `${obra}--libro-segunda`, `${obra}--libro-primera`, `${obra}--libro-redirigida`]);
  });

  it('no depende del orden de los documentos', () => {
    const documentos = [
      { nombre: `${obra}--b`, url: url('Libro/Primera') },
      { nombre: `${obra}--a`, url: url('Libro/Segunda') },
    ];
    expect(documentosEnElOrdenDelIndice(obra, indice, documentos)).toEqual(
      documentosEnElOrdenDelIndice(obra, indice, [...documentos].reverse()),
    );
  });
});

describe('el lector del Corpus', () => {
  async function corpusDePrueba(indice?: string) {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-indice-'));
    temporales.push(raiz);
    const corpus = join(raiz, 'corpus');
    for (const dir of ['citas', 'autores', 'temas', 'fuentes']) await mkdir(join(corpus, dir), { recursive: true });
    const documento = (pagina: string, cuerpo: string) =>
      [
        'fuente: wikisource-es',
        'obra: Libro',
        `url: https://es.wikisource.org/wiki/Libro/${pagina}`,
        'recuperado: 2026-10-31',
        '---',
        'Libro',
        '---',
        cuerpo,
      ].join('\n');
    await writeFile(join(corpus, 'fuentes', 'wikisource-es--libro--a.txt'), documento('A', 'Primera frase del libro entero.'));
    await writeFile(join(corpus, 'fuentes', 'wikisource-es--libro--b.txt'), documento('B', 'Segunda frase del libro entero.'));
    if (indice !== undefined) await writeFile(join(corpus, 'fuentes', 'wikisource-es--libro.indice.yml'), indice);
    await writeFile(
      join(corpus, 'citas', 'autora--frase.md'),
      [
        '---',
        'slug: autora-frase',
        'texto: "Libro/B"',
        'autor: autora',
        'procedencia:',
        '  obra: Libro',
        'fuente:',
        '  id: wikisource-es',
        '  url: https://es.wikisource.org/wiki/Libro/B',
        '---',
        '',
      ].join('\n'),
    );
    return corpus;
  }

  const indice = componerIndice({
    fuente: 'wikisource-es',
    url: 'https://es.wikisource.org/wiki/Libro',
    recuperado: '2026-10-31',
    paginas: ['Libro/B', 'Libro/A'],
  });

  it('da, por Obra, sus documentos en el orden del índice', async () => {
    const corpus = await corpusDePrueba(indice);
    expect(await leerOrdenDeLosIndices(rutasDelCorpus(corpus))).toEqual(
      new Map([['wikisource-es--libro', ['wikisource-es--libro--b', 'wikisource-es--libro--a']]]),
    );
  });

  it('sin índice no da nada', async () => {
    const corpus = await corpusDePrueba();
    expect(await leerOrdenDeLosIndices(rutasDelCorpus(corpus))).toEqual(new Map());
  });

  it('un índice ilegible o de otra Fuente lanza, nombrando el fichero', async () => {
    const roto = await corpusDePrueba('paginas: [');
    await expect(leerOrdenDeLosIndices(rutasDelCorpus(roto))).rejects.toThrow(/wikisource-es--libro\.indice\.yml/u);
    const ajeno = await corpusDePrueba(indice.replace('fuente: wikisource-es', 'fuente: gutenberg'));
    await expect(leerOrdenDeLosIndices(rutasDelCorpus(ajeno))).rejects.toThrow(/Fuente de su nombre/u);
  });

  it('ningún lector de documentos lo toma por uno: ni el cotejo ni las posiciones', async () => {
    // El texto de la Cita, «Libro/B», está en el índice y en ningún documento.
    const corpus = await corpusDePrueba(indice);
    const rutas = rutasDelCorpus(corpus);
    const documentos = await leerDocumentosDeFuente(rutas);
    expect([...documentos.keys()].sort()).toEqual(['wikisource-es--libro--a', 'wikisource-es--libro--b']);
    expect([...(await leerDocumentosDeclarados(rutas)).keys()].sort()).toEqual([
      'wikisource-es--libro--a',
      'wikisource-es--libro--b',
    ]);
    expect(await leerPosicionesDelCorpus(corpus)).toEqual(new Map([['autora-frase', []]]));
  });

  it('extraer se niega a leer un índice, y no escribe ninguna candidata', async () => {
    const corpus = await corpusDePrueba(indice);
    await mkdir(join(corpus, '_revision'), { recursive: true });
    await writeFile(join(corpus, 'autores', 'autora.yml'), 'nombre: Autora\n');
    const resultado = await ejecutar(
      'npx',
      ['tsx', join(RAIZ, 'tools/extraer.ts'), join(corpus, 'fuentes', 'wikisource-es--libro.indice.yml'), '--autor', 'autora', '--corpus', corpus],
      { cwd: RAIZ },
    ).then(
      () => ({ codigo: 0, error: '' }),
      (e: { code?: number; stderr?: string }) => ({ codigo: e.code ?? 1, error: e.stderr ?? '' }),
    );
    expect(resultado.codigo).toBe(1);
    expect(resultado.error).toMatch(/no tiene la forma de un documento de Fuente/u);
    expect(await readdir(join(corpus, '_revision'))).toEqual([]);
  });
});

describe('guardarOrdenDeLosIndices — la colección `indices`, de un golpe y nunca vacía', () => {
  const almacenDePrueba = () => {
    const entradas = new Map<string, Record<string, unknown>>();
    return {
      entradas,
      almacen: {
        clear: () => entradas.clear(),
        set: (e: { id: string; data: Record<string, unknown> }) => entradas.set(e.id, e.data),
      },
    };
  };
  const analizar = async (e: { data: Record<string, unknown> }) => e.data;

  it('una sola entrada con el orden por Obra; sin índices, la misma entrada vacía', async () => {
    const { entradas, almacen } = almacenDePrueba();
    await guardarOrdenDeLosIndices({ leer: async () => new Map([['ws--libro', ['ws--libro--b', 'ws--libro--a']]]), analizar, almacen });
    expect([...entradas]).toEqual([[ENTRADA_DEL_ORDEN_DE_LOS_INDICES, { porObra: { 'ws--libro': ['ws--libro--b', 'ws--libro--a'] } }]]);
    await guardarOrdenDeLosIndices({ leer: async () => new Map(), analizar, almacen });
    expect([...entradas]).toEqual([[ENTRADA_DEL_ORDEN_DE_LOS_INDICES, { porObra: {} }]]);
  });

  it('si la lectura o el análisis fallan, el almacén se queda como estaba', async () => {
    const { entradas, almacen } = almacenDePrueba();
    await guardarOrdenDeLosIndices({ leer: async () => new Map([['ws--libro', ['ws--libro--a']]]), analizar, almacen });
    const antes = [...entradas];
    await expect(guardarOrdenDeLosIndices({ leer: async () => { throw new Error('roto'); }, analizar, almacen })).rejects.toThrow('roto');
    await expect(
      guardarOrdenDeLosIndices({ leer: async () => new Map(), analizar: async () => { throw new Error('esquema'); }, almacen }),
    ).rejects.toThrow('esquema');
    expect([...entradas]).toEqual(antes);
  });
});
