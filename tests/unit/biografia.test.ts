import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fuenteDe, fuenteDeUrl, revisionExacta } from '../../tools/lib/fuentes.ts';
import {
  analizarDocumento,
  componerBiografia,
  componerDocumento,
  cuerpoDeWikitexto,
  derivarBiografia,
  derivarDocumento,
  LECTORES_DE_BIOGRAFIA,
  nombreDeBiografia,
  type CabeceraAnalizada,
} from '../../tools/lib/documento.ts';
import {
  BIOGRAFIA_MAL_COLOCADA,
  cotejar,
  cotejarBiografias,
  documentosDeCita,
  MIN_PALABRAS_SEMBLANZA,
  titularDeFallos,
} from '../../tools/lib/cotejo.ts';
import {
  leerDocumentosDeBiografia,
  leerDocumentosDeclarados,
  leerDocumentosDeFuente,
  rutasDelCorpus,
} from '../../tools/lib/corpus.ts';
import { autorAdmisible } from '../../src/lib/admision.ts';

/**
 * Historia 17.1 — una Fuente mutable entra por revisión, y su documento no comparte espacio
 * con las obras. Lo decidible sin red y sin construir; la orden de punta a punta está en
 * `recuperar-cli.test.ts` y la puerta puesta de verdad en `biografia-build.test.ts`.
 */

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const WIKIPEDIA = fuenteDe('wikipedia-es')!;

const BIOGRAFIA = componerBiografia(
  {
    fuente: 'wikipedia-es',
    titulo: 'Séneca',
    revision: 123,
    fechaDeRevision: '2024-05-01',
    licencia: 'CC BY-SA 4.0',
    url: 'https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=123',
    recuperado: '2026-10-10',
  },
  'Séneca',
  'Lucio Anneo Séneca fue un filósofo hispanorromano.\n\nNo es que tengamos poco tiempo, es que perdemos mucho.',
);

describe('la Fuente mutable', () => {
  it('Wikipedia en español es mutable, CC BY-SA 4.0 y reutilizable', () => {
    expect(WIKIPEDIA).toMatchObject({
      nombre: 'Wikipedia en español',
      licencia: 'CC BY-SA 4.0',
      anfitriones: ['es.wikipedia.org', 'es.m.wikipedia.org'],
      permiteReutilizacion: true,
      mutable: true,
    });
    expect(fuenteDeUrl('https://es.wikipedia.org/wiki/S%C3%A9neca')?.id).toBe('wikipedia-es');
    // No se confunde con Wikisource, que es fija.
    expect(fuenteDeUrl('https://es.wikisource.org/wiki/X')?.mutable).toBeUndefined();
  });

  it.each([
    ['https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=123', 123],
    ['https://es.wikipedia.org/wiki/S%C3%A9neca?oldid=456', 456],
    ['https://es.wikipedia.org/w/index.php?oldid=789', 789],
    ['https://es.m.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=321', 321],
    ['https://es.wikipedia.org/wiki/Especial:EnlacePermanente/555', 555],
    ['https://es.wikipedia.org/wiki/Special:PermanentLink/556', 556],
    ['https://es.wikipedia.org/wiki/Especial%3AEnlacePermanente/557', 557],
  ])('la revisión de %s es %d', (url, revision) => {
    expect(WIKIPEDIA.revision!.revisionDe(url)).toBe(revision);
  });

  it.each([
    'https://es.wikipedia.org/wiki/S%C3%A9neca',
    'https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=prev',
    'https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=0',
    'https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=12a',
    'https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&diff=124&oldid=123',
    'https://es.wikipedia.org/w/index.php?oldid=1&oldid=2',
    'https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=123&direction=next',
    'https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=123&direction=prev',
    'https://es.wikipedia.org/wiki/Especial:EnlacePermanente/0',
    'https://es.wikipedia.org/wiki/Especial:EnlacePermanente/12a',
    'https://es.wikipedia.org/wiki/Especial:EnlacePermanente/5?oldid=6',
    'no es una url',
  ])('%s no pide ninguna revisión', (url) => {
    expect(WIKIPEDIA.revision!.revisionDe(url)).toBeUndefined();
  });

  it('el título tecleado sale de title= o /wiki/, y no de un enlace permanente por ruta', () => {
    const titulo = WIKIPEDIA.revision!.tituloPedido;
    expect(titulo('https://es.wikipedia.org/w/index.php?title=Miguel_de_Unamuno&oldid=1')).toBe(
      'Miguel de Unamuno',
    );
    expect(titulo('https://es.wikipedia.org/wiki/S%C3%A9neca?oldid=1')).toBe('Séneca');
    expect(titulo('https://es.wikipedia.org/w/index.php?oldid=1')).toBeUndefined();
    expect(titulo('https://es.wikipedia.org/wiki/Especial:EnlacePermanente/1')).toBeUndefined();
  });

  it('la licencia es la de la fecha de la revisión: 3.0 antes del 2023-06-29, 4.0 desde', () => {
    const licencia = WIKIPEDIA.revision!.licenciaEn;
    expect(licencia('2023-06-28')).toBe('CC BY-SA 3.0');
    expect(licencia('2010-01-01')).toBe('CC BY-SA 3.0');
    expect(licencia('2023-06-29')).toBe('CC BY-SA 4.0');
    expect(licencia('2025-01-01')).toBe('CC BY-SA 4.0');
  });

  it('un solo analizador de revisión, compartido', () => {
    expect(revisionExacta('123')).toBe(123);
    expect(revisionExacta(123)).toBe(123);
    for (const malo of ['0', '012', '12a', 'prev', '', '99999999999999999', undefined]) {
      expect(revisionExacta(malo), String(malo)).toBeUndefined();
    }
  });

  it('el origen es el wikitexto de la revisión, y nada más', () => {
    expect(WIKIPEDIA.revision!.declaracion(123)).toBe(
      'https://es.wikipedia.org/w/api.php?action=query&prop=revisions|info&revids=123&rvprop=timestamp|ids&format=json',
    );
    expect(WIKIPEDIA.revision!.origen(123)).toBe(
      'https://es.wikipedia.org/w/index.php?oldid=123&action=raw',
    );
    expect(WIKIPEDIA.revision!.enlacePermanente('Lucio Anneo Séneca', 123)).toBe(
      'https://es.wikipedia.org/w/index.php?title=Lucio_Anneo_S%C3%A9neca&oldid=123',
    );
  });
});

describe('el lector de Wikipedia', () => {
  const lector = LECTORES_DE_BIOGRAFIA['wikipedia-es'];
  const respuesta = (titulo: string, revid: number, timestamp = '2024-05-01T10:00:00Z') =>
    JSON.stringify({
      batchcomplete: '',
      query: { pages: { '42': { pageid: 42, ns: 0, title: titulo, revisions: [{ revid, parentid: 1, timestamp }] } } },
    });

  it('el título y la fecha los declara la Fuente sobre esa revisión', () => {
    expect(lector.revisionDeclarada(respuesta('Lucio Anneo Séneca', 123), 123)).toEqual({
      ok: true,
      titulo: 'Lucio Anneo Séneca',
      fecha: '2024-05-01',
    });
  });

  it('una revisión que la Fuente no reconoce, o una respuesta de otra revisión, se niega', () => {
    const mala = JSON.stringify({ batchcomplete: '', query: { badrevids: { '999': { revid: 999, missing: '' } } } });
    const r1 = lector.revisionDeclarada(mala, 999);
    expect(r1.ok).toBe(false);
    expect(!r1.ok && r1.motivo).toMatch(/no reconoce la revisión 999/);
    expect(lector.revisionDeclarada(respuesta('Séneca', 124), 123).ok).toBe(false);
    expect(lector.revisionDeclarada('<html>no</html>', 123).ok).toBe(false);
    expect(lector.revisionDeclarada('{}', 123).ok).toBe(false);
  });

  it('la declaración guarda la línea del título', () => {
    const derivada = derivarBiografia('wikipedia-es', 'Texto.', 'Séneca');
    expect(derivada.ok && derivada.declaracion).toBe('Séneca');
  });

  it('despoja plantillas anidadas, referencias, enlaces, énfasis, tablas y encabezados', () => {
    const cuerpo = despojado(
      [
        '{{Ficha de persona|nombre=X|nacimiento={{fecha|1|2|3}}}}',
        "'''Miguel de Unamuno''' fue un [[escritor]] y [[Filosofía|filósofo]] ''español''.<ref name=\"a\">{{cita}}</ref><ref name=\"b\" />",
        '<!-- comentario -->',
        '{| class="wikitable"',
        '| celda || {{plantilla}}',
        '|}',
        '== Obra ==',
        '* Escribió [[Niebla (novela)|Niebla]] en 1914.[https://ejemplo.org fuente externa]',
        '[[Archivo:Unamuno.jpg|thumb|Retrato de [[Miguel de Unamuno|Unamuno]]]]',
        '[[Categoría:Escritores de España]]',
        '__NOTOC__ __NO_EDIT_SECTION2__',
        'Uno<br />dos <small>pequeño</small> y a < b > c.',
      ].join('\n'),
    );
    expect(cuerpo).toContain('Uno\ndos pequeño y a < b > c.');
    expect(cuerpo).not.toMatch(/__/);
    expect(cuerpo).toContain('Miguel de Unamuno fue un escritor y filósofo español.');
    expect(cuerpo).toContain('Obra');
    expect(cuerpo).toContain('Escribió Niebla en 1914.fuente externa');
    expect(cuerpo).not.toMatch(/\{\{|\}\}|\{\||\|\}|\[\[|\]\]|<ref|'''|''|==|celda|Retrato|Categoría|comentario/);
  });

  it('si el anidamiento agota las pasadas con marcado dentro, se niega', () => {
    const hondo = `${'{{a|'.repeat(60)}x${'}}'.repeat(60)} texto`;
    const resultado = cuerpoDeWikitexto(hondo);
    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.motivo).toMatch(/«\{\{» sigue anidado/);
    expect(derivarBiografia('wikipedia-es', hondo, 'X').ok).toBe(false);
  });

  it('una revisión sin texto no se versiona', () => {
    const vacia = derivarBiografia(
      'wikipedia-es',
      '{{Ficha}}\n[[Categoría:X]]',
      'X',
    );
    expect(vacia.ok).toBe(false);
  });

  it('Wikipedia no tiene lector de obra: derivar una obra de ella falla', () => {
    expect(derivarDocumento('wikipedia-es', 'Texto.').ok).toBe(false);
  });
});

describe('el documento de biografía', () => {
  it('se nombra {fuente}--{slug-del-titulo}--r{revision}', () => {
    expect(nombreDeBiografia('wikipedia-es', 'Séneca', 123)).toBe('wikipedia-es--seneca--r123');
    expect(nombreDeBiografia('wikipedia-es', 'Séneca', 124)).not.toBe(
      nombreDeBiografia('wikipedia-es', 'Séneca', 123),
    );
    expect(nombreDeBiografia('wikipedia-es', '···', 1)).toBeUndefined();
    expect(nombreDeBiografia('wikipedia-es', 'Séneca', 0)).toBeUndefined();
  });

  it('su cabecera lleva fuente, clase, título, revisión, url y fecha, y se analiza de vuelta', () => {
    expect(BIOGRAFIA.split('---')[0]).toBe(
      [
        'fuente: wikipedia-es',
        'clase: biografia',
        'titulo: Séneca',
        'revision: 123',
        'fechaDeRevision: 2024-05-01',
        'licencia: CC BY-SA 4.0',
        'url: https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=123',
        'recuperado: 2026-10-10',
        '',
      ].join('\n'),
    );
    const analizado = analizarDocumento(BIOGRAFIA);
    expect(analizado?.cabecera).toEqual({
      clase: 'biografia',
      fuente: 'wikipedia-es',
      titulo: 'Séneca',
      revision: 123,
      fechaDeRevision: '2024-05-01',
      licencia: 'CC BY-SA 4.0',
      url: 'https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=123',
      recuperado: '2026-10-10',
    });
    expect(analizado?.cabecera.obra).toBeUndefined();
    expect(analizado?.declaracion).toBe('Séneca');
  });

  it('una clase desconocida, una revisión que no es entero o una biografía con obra no se analizan', () => {
    expect(analizarDocumento(BIOGRAFIA.replace('clase: biografia', 'clase: ensayo'))).toBeUndefined();
    expect(analizarDocumento(BIOGRAFIA.replace('revision: 123', 'revision: 12a'))).toBeUndefined();
    expect(analizarDocumento(BIOGRAFIA.replace('revision: 123\n', ''))).toBeUndefined();
    expect(analizarDocumento(BIOGRAFIA.replace('titulo: Séneca\n', ''))).toBeUndefined();
    expect(analizarDocumento(BIOGRAFIA.replace('licencia: CC BY-SA 4.0\n', ''))).toBeUndefined();
    expect(analizarDocumento(BIOGRAFIA.replace('fechaDeRevision: 2024-05-01', 'fechaDeRevision: ayer'))).toBeUndefined();
    expect(
      analizarDocumento(BIOGRAFIA.replace('titulo: Séneca\n', 'titulo: Séneca\nobra: Séneca\n')),
    ).toBeUndefined();
  });

  it('un documento de obra sin clase se sigue analizando como antes', () => {
    const deObra = componerDocumento(
      {
        fuente: 'wikisource-es',
        obra: 'Sobre la brevedad de la vida',
        año: 49,
        url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
        recuperado: '2026-08-19',
      },
      'Sobre la brevedad de la vida',
      'No es que tengamos poco tiempo.',
    );
    expect(deObra).not.toMatch(/^clase:/m);
    const analizado = analizarDocumento(deObra);
    expect(analizado?.cabecera.clase).toBeUndefined();
    expect(analizado?.cabecera.obra).toBe('Sobre la brevedad de la vida');
    expect(analizado?.cabecera.año).toBe(49);
  });
});

describe('el cotejo de Citas no lee biografías', () => {
  async function corpusConBiografia(enFuentes = false) {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-biografia-'));
    temporales.push(raiz);
    const rutas = rutasDelCorpus(join(raiz, 'corpus'));
    await mkdir(rutas.fuentes, { recursive: true });
    await mkdir(rutas.biografias, { recursive: true });
    await writeFile(
      join(enFuentes ? rutas.fuentes : rutas.biografias, 'wikipedia-es--seneca--r123.txt'),
      BIOGRAFIA,
      'utf8',
    );
    return rutas;
  }

  const CITA = {
    slug: 'seneca-no-es-que-tengamos-poco-tiempo-es',
    ruta: 'corpus/citas/seneca--no-es-que-tengamos-poco-tiempo-es.md',
    texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
    obra: 'Séneca',
    fuente: { id: 'wikipedia-es', url: 'https://es.wikipedia.org/wiki/S%C3%A9neca' },
  };

  it('las rutas del corpus separan biografias/ de fuentes/', () => {
    const rutas = rutasDelCorpus('corpus');
    expect(rutas.biografias).toBe(join('corpus', 'biografias'));
    expect(rutas.biografias).not.toBe(rutas.fuentes);
  });

  it('una Cita de Fuente wikipedia-es con obra «Séneca» no casa con la biografía: su propia regla', async () => {
    const rutas = await corpusConBiografia();
    const documentos = await leerDocumentosDeFuente(rutas);
    expect([...documentos.keys()]).toEqual([]);

    const resultado = cotejar({ citas: [CITA], documentos, censo: [] });
    expect(resultado.ok).toBe(false);
    expect(resultado.cotejadas).toBe(0);
    expect(resultado.fallos).toHaveLength(1);
    expect(resultado.fallos[0].regla).toMatch(/una Fuente mutable no sostiene Citas/);
    expect(resultado.fallos[0].regla).not.toMatch(/falta/);
  });

  it('ni aunque el documento de su nombre estuviera en fuentes/ con cuerpo', () => {
    const documentos = new Map<string, string | null>([['wikipedia-es--seneca', CITA.texto]]);
    const resultado = cotejar({ citas: [CITA], documentos, censo: [] });
    expect(resultado.cotejadas).toBe(0);
    expect(resultado.fallos[0].regla).toMatch(/una Fuente mutable no sostiene Citas/);
  });

  it('documentosDeCita no casa una biografía ni por nombre exacto ni por prefijo', () => {
    const documentos = new Map<string, unknown>([
      ['wikipedia-es--seneca', BIOGRAFIA_MAL_COLOCADA],
      ['wikipedia-es--seneca--r123', BIOGRAFIA_MAL_COLOCADA],
    ]);
    expect(documentosDeCita(CITA.fuente, 'Séneca', documentos)).toEqual([]);
  });

  it('una biografía mal colocada en fuentes/ va marcada y documentosDeCita la excluye', async () => {
    const rutas = await corpusConBiografia(true);
    const documentos = await leerDocumentosDeFuente(rutas);
    expect(documentos.get('wikipedia-es--seneca--r123')).toBe(BIOGRAFIA_MAL_COLOCADA);
    expect(documentosDeCita(CITA.fuente, 'Séneca', documentos)).toEqual([]);

    // Una Cita de una obra fija con ese nombre tampoco la toma por su documento.
    const fija = { ...CITA, fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/S' } };
    const conDocumento = new Map(documentos);
    conDocumento.set('wikisource-es--seneca--r123', BIOGRAFIA_MAL_COLOCADA);
    const resultado = cotejar({ citas: [fija], documentos: conDocumento, censo: [] });
    expect(resultado.cotejadas).toBe(0);
    expect(resultado.fallos[0].regla).toMatch(/falta corpus\/fuentes\/wikisource-es--seneca\.txt/);
    // Y tampoco entra entre los documentos que declaran obra o traducción.
    expect([...(await leerDocumentosDeclarados(rutas)).keys()]).toEqual([]);
  });

  it('una obra que se llama como el Autor no se traga su biografía, y sí su propio documento', () => {
    const obra = { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/S%C3%A9neca' };
    const documentos = new Map<string, unknown>([
      ['wikisource-es--seneca', 'cuerpo de la obra'],
      ['wikisource-es--seneca--r123', BIOGRAFIA_MAL_COLOCADA],
    ]);
    expect(documentosDeCita(obra, 'Séneca', documentos)).toEqual(['wikisource-es--seneca']);
  });
});

describe('el Autor declara su biografía', () => {
  const AUTOR = {
    nombre: 'Séneca',
    añoFallecimiento: 65,
    semblanza: 'Filósofo estoico hispanorromano.',
  };

  it('es opcional, y sin valor se omite', () => {
    const validado = autorAdmisible.safeParse(AUTOR);
    expect(validado.success).toBe(true);
    expect(validado.success && 'biografia' in validado.data).toBe(false);
  });

  it('admite documento y revisión', () => {
    const biografia = { documento: 'wikipedia-es--seneca--r123', revision: 123 };
    const validado = autorAdmisible.safeParse({ ...AUTOR, biografia });
    expect(validado.success && validado.data.biografia).toEqual(biografia);
  });

  it('.strict(): una clave de más se rechaza nombrando esa clave', () => {
    const validado = autorAdmisible.safeParse({
      ...AUTOR,
      biografia: { documento: 'wikipedia-es--seneca--r123', revision: 123, licencia: 'x' },
    });
    expect(validado.success).toBe(false);
    const problema = validado.error!.issues.find((i) => i.code === 'unrecognized_keys') as
      | { keys: string[]; path: PropertyKey[] }
      | undefined;
    expect(problema?.keys).toEqual(['licencia']);
    expect(problema?.path).toEqual(['biografia']);
  });

  it.each([
    [{ documento: 'wikipedia-es--seneca--r123' }, /revisión/],
    [{ revision: 123 }, /documento/],
    [{ documento: 'wikipedia-es--seneca--r123.txt', revision: 123 }, /sin «\.txt»/],
    [{ documento: 'wikipedia-es--seneca--r123', revision: 0 }, /positivo/],
    [{ documento: 'wikipedia-es--seneca--r123', revision: 1.5 }, /entero/],
    [{ documento: 'wikipedia-es--seneca--r124', revision: 123 }, /es la revisión 124 y la biografía declara la 123/],
    [{ documento: 'wikipedia-es--seneca', revision: 123 }, /sin «\.txt»/],
    [{ documento: 'seneca--r123', revision: 123 }, /sin «\.txt»/],
    [{ documento: 'wikipedia-es--seneca--r0123', revision: 123 }, /sin «\.txt»/],
    ['wikipedia-es--seneca--r123', /objeto/],
  ])('rechaza %j', (biografia, mensaje) => {
    const validado = autorAdmisible.safeParse({ ...AUTOR, biografia });
    expect(validado.success).toBe(false);
    expect(validado.error?.issues.map((i) => i.message).join(' ')).toMatch(mensaje);
  });
});

describe('la puerta de la revisión', () => {
  const { cabecera, cuerpo } = analizarDocumento(BIOGRAFIA)!;
  // Historia 17.2 — la puerta lee cabecera **y** cuerpo, contra el que coteja la semblanza.
  const documentos = new Map<string, { cabecera: CabeceraAnalizada; cuerpo: string } | null>([
    ['wikipedia-es--seneca--r123', { cabecera, cuerpo }],
  ]);
  const autor = (documento: string, revision: number) => ({
    ruta: 'corpus/autores/seneca.yml',
    biografia: { documento, revision },
    semblanza: 'No es que tengamos poco tiempo, es que perdemos mucho.',
  });

  it('pasa cuando el documento existe y es la revisión declarada', () => {
    expect(cotejarBiografias([autor('wikipedia-es--seneca--r123', 123)], documentos)).toEqual([]);
  });

  it('un Autor sin biografía no se mira', () => {
    expect(cotejarBiografias([{ ruta: 'corpus/autores/seneca.yml' }], new Map())).toEqual([]);
  });

  it('revisión distinta: rompe nombrando el Autor, el documento y las dos revisiones', () => {
    const [fallo, ...resto] = cotejarBiografias(
      [autor('wikipedia-es--seneca--r123', 124)],
      documentos,
    );
    expect(resto).toEqual([]);
    expect(fallo.ruta).toBe('corpus/autores/seneca.yml');
    expect(fallo.regla).toContain('corpus/biografias/wikipedia-es--seneca--r123.txt');
    expect(fallo.regla).toContain('124');
    expect(fallo.regla).toContain('123');
  });

  it('documento inexistente: rompe', () => {
    const [fallo] = cotejarBiografias([autor('wikipedia-es--seneca--r124', 124)], documentos);
    expect(fallo.ruta).toBe('corpus/autores/seneca.yml');
    expect(fallo.regla).toMatch(/no existe/);
    expect(fallo.regla).toContain('wikipedia-es--seneca--r124.txt');
  });

  it('un documento ilegible, o que no es de una Fuente mutable, rompe', () => {
    const deObra = analizarDocumento(
      componerDocumento(
        {
          fuente: 'wikisource-es',
          obra: 'Séneca',
          url: 'https://es.wikisource.org/wiki/S',
          recuperado: '2026-10-10',
        },
        'Séneca',
        'Texto.',
      ),
    )!.cabecera;
    const deFuenteFija = analizarDocumento(BIOGRAFIA.replace('fuente: wikipedia-es', 'fuente: wikisource-es'))!
      .cabecera;
    const raros = new Map<string, { cabecera: CabeceraAnalizada; cuerpo: string } | null>([
      ['wikipedia-es--a--r1', null],
      ['wikisource-es--seneca--r123', { cabecera: deObra, cuerpo }],
      ['wikisource-es--b--r123', { cabecera: deFuenteFija, cuerpo }],
    ]);
    const fallos = cotejarBiografias(
      [
        autor('wikipedia-es--a--r1', 1),
        autor('wikisource-es--seneca--r123', 123),
        autor('wikisource-es--b--r123', 123),
      ],
      raros,
    );
    expect(fallos).toHaveLength(3);
    expect(fallos[0].regla).toMatch(/no tiene la forma/);
    expect(fallos[1].regla).toMatch(/no es la biografía de una Fuente mutable/);
    expect(fallos[2].regla).toMatch(/no es la biografía de una Fuente mutable/);
  });

  it('el nombre tiene que ser exactamente el que da su cabecera, Fuente incluida', () => {
    const fallos = cotejarBiografias(
      [
        autor('wikipedia-es--lucio-anneo-seneca--r123', 123),
        autor('wikisourcex--seneca--r123', 123),
      ],
      new Map([
        ['wikipedia-es--lucio-anneo-seneca--r123', { cabecera, cuerpo }],
        ['wikisourcex--seneca--r123', { cabecera, cuerpo }],
      ]),
    );
    expect(fallos).toHaveLength(2);
    for (const fallo of fallos) {
      expect(fallo.regla).toContain('corpus/biografias/wikipedia-es--seneca--r123.txt');
      expect(fallo.regla).toMatch(/tienen que decir lo mismo/);
    }
  });

  it('valida la forma del valor antes de usarlo', () => {
    const conCuerpo = (cabecera: unknown) => ({ cabecera, cuerpo });
    const raros = new Map<string, unknown>([
      ['wikipedia-es--a--r1', 'texto'],
      ['wikipedia-es--b--r1', conCuerpo({ clase: 'biografia', fuente: 'wikipedia-es', titulo: 'B', revision: '1' })],
      ['wikipedia-es--c--r1', conCuerpo({ clase: 'biografia', fuente: 'wikipedia-es', titulo: 'C', revision: 2 ** 60 })],
      ['wikipedia-es--d--r1', conCuerpo({ clase: 'biografia', fuente: 'wikipedia-es', revision: 1 })],
      ['wikipedia-es--e--r1', undefined],
    ]);
    const fallos = cotejarBiografias(
      ['a', 'b', 'c', 'd', 'e'].map((x) => autor(`wikipedia-es--${x}--r1`, 1)),
      raros,
    );
    expect(fallos).toHaveLength(5);
    for (const fallo of fallos) expect(fallo.regla).toMatch(/no tiene la forma/);
  });

  it('se lee solo de corpus/biografias/', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-biografia-'));
    temporales.push(raiz);
    const rutas = rutasDelCorpus(join(raiz, 'corpus'));
    await mkdir(rutas.biografias, { recursive: true });
    await mkdir(rutas.fuentes, { recursive: true });
    await writeFile(join(rutas.biografias, 'wikipedia-es--seneca--r123.txt'), BIOGRAFIA, 'utf8');
    await writeFile(join(rutas.fuentes, 'wikipedia-es--otro--r1.txt'), BIOGRAFIA, 'utf8');
    expect([...(await leerDocumentosDeBiografia(rutas)).keys()]).toEqual([
      'wikipedia-es--seneca--r123',
    ]);
  });
});

describe('Historia 17.2 — la semblanza está literal en la revisión que la atribuye', () => {
  const { cabecera, cuerpo } = analizarDocumento(BIOGRAFIA)!;
  const documentos = new Map([['wikipedia-es--seneca--r123', { cabecera, cuerpo }]]);
  const conSemblanza = (semblanza?: string) => ({
    ruta: 'corpus/autores/seneca.yml',
    biografia: { documento: 'wikipedia-es--seneca--r123', revision: 123 },
    ...(semblanza !== undefined ? { semblanza } : {}),
  });

  it('pasa cuando la semblanza aparece literal, con otro espaciado', () => {
    expect(
      cotejarBiografias(
        [conSemblanza('No es que tengamos poco   tiempo,\nes que perdemos mucho.')],
        documentos,
      ),
    ).toEqual([]);
  });

  it.each([
    ['otra puntuación', 'No es que tengamos poco tiempo; es que perdemos mucho.'],
    ['otra palabra', 'Lucio Anneo Séneca fue un filósofo cordobés y estoico.'],
    ['prosa compuesta', 'Filósofo estoico hispanorromano, tutor y consejero de Nerón.'],
  ])('rompe nombrando el fichero de Autor: %s', (_caso, semblanza) => {
    const [fallo, ...resto] = cotejarBiografias([conSemblanza(semblanza)], documentos);
    expect(resto).toEqual([]);
    expect(fallo.ruta).toBe('corpus/autores/seneca.yml');
    expect(fallo.regla).toContain('corpus/biografias/wikipedia-es--seneca--r123.txt');
    expect(fallo.regla).toMatch(/no aparece literal/);
  });

  it('un Autor con biografía y sin semblanza no pasa', () => {
    const fallos = cotejarBiografias([conSemblanza(), conSemblanza('  ')], documentos);
    expect(fallos).toHaveLength(2);
    for (const fallo of fallos) expect(fallo.regla).toMatch(/no tiene semblanza que cotejar/);
  });

  it.each(["[[Córdoba]]", ']]', "'''", "''", '{{', '<ref'])(
    'rechaza una semblanza con marcado de wikitexto: %s',
    (marca) => {
      const conMarcado = analizarDocumento(
        BIOGRAFIA.replace('es que perdemos mucho.', `es que perdemos mucho ${marca} sin duda.`),
      )!;
      const [fallo] = cotejarBiografias(
        [conSemblanza(`No es que tengamos poco tiempo, es que perdemos mucho ${marca} sin duda.`)],
        new Map([['wikipedia-es--seneca--r123', conMarcado]]),
      );
      expect(fallo?.ruta).toBe('corpus/autores/seneca.yml');
      expect(fallo?.regla).toMatch(/marcado de wikitexto/);
    },
  );

  it(`rechaza una semblanza de menos de ${MIN_PALABRAS_SEMBLANZA} palabras, aunque esté literal`, () => {
    expect(MIN_PALABRAS_SEMBLANZA).toBe(8);
    const [fallo] = cotejarBiografias([conSemblanza('es que perdemos mucho.')], documentos);
    expect(fallo?.ruta).toBe('corpus/autores/seneca.yml');
    expect(fallo?.regla).toMatch(/tiene 4 palabras.*al menos 8/s);
  });

  it.each([
    ['http', 'http://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=123'],
    ['otra revisión', 'https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=124'],
    ['la dirección viva', 'https://es.wikipedia.org/wiki/S%C3%A9neca'],
    ['otro anfitrión', 'https://example.org/w/index.php?title=S%C3%A9neca&oldid=123'],
  ])('rechaza un enlace de cabecera que no lleva a esa revisión: %s', (_caso, url) => {
    const [fallo] = cotejarBiografias(
      [conSemblanza('No es que tengamos poco tiempo, es que perdemos mucho.')],
      new Map([['wikipedia-es--seneca--r123', { cabecera: { ...cabecera, url }, cuerpo }]]),
    );
    expect(fallo?.ruta).toBe('corpus/autores/seneca.yml');
    expect(fallo?.regla).toMatch(/no es un enlace permanente https de la revisión 123/);
  });

  it('acepta el enlace permanente por ruta', () => {
    const url = 'https://es.wikipedia.org/wiki/Especial:EnlacePermanente/123';
    expect(
      cotejarBiografias(
        [conSemblanza('No es que tengamos poco tiempo, es que perdemos mucho.')],
        new Map([['wikipedia-es--seneca--r123', { cabecera: { ...cabecera, url }, cuerpo }]]),
      ),
    ).toEqual([]);
  });

  it('rechaza una licencia sin escritura enlazable', () => {
    const [fallo] = cotejarBiografias(
      [conSemblanza('No es que tengamos poco tiempo, es que perdemos mucho.')],
      new Map([
        ['wikipedia-es--seneca--r123', { cabecera: { ...cabecera, licencia: 'GFDL' }, cuerpo }],
      ]),
    );
    expect(fallo?.ruta).toBe('corpus/autores/seneca.yml');
    expect(fallo?.regla).toMatch(/licencia \(«GFDL»\)/);
  });

  it('el cuerpo se lee de corpus/biografias/ junto a la cabecera', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-biografia-'));
    temporales.push(raiz);
    const rutas = rutasDelCorpus(join(raiz, 'corpus'));
    await mkdir(rutas.biografias, { recursive: true });
    await writeFile(join(rutas.biografias, 'wikipedia-es--seneca--r123.txt'), BIOGRAFIA, 'utf8');
    const leidos = await leerDocumentosDeBiografia(rutas);
    expect(leidos.get('wikipedia-es--seneca--r123')?.cuerpo).toContain('perdemos mucho');
    expect(
      cotejarBiografias(
        [conSemblanza('No es que tengamos poco tiempo, es que perdemos mucho.')],
        leidos,
      ),
    ).toEqual([]);
  });
});

describe('el titular cuenta las biografías', () => {
  it('las nombra cuando las hay, y no cambia cuando no', () => {
    expect(titularDeFallos(3)).toMatch(/3 incumplimientos\./);
    expect(titularDeFallos(1, 1)).toMatch(/1 incumplimiento \(es de la biografía de un Autor\)\./);
    expect(titularDeFallos(2, 2)).toMatch(/2 incumplimientos \(todos son de biografías de Autor\)\./);
    expect(titularDeFallos(3, 1)).toMatch(/3 incumplimientos \(1 de la biografía de un Autor\)\./);
  });
});

/** El cuerpo despojado, o el motivo por el que no, como texto para comparar. */
function despojado(wikitexto: string): string {
  const resultado = cuerpoDeWikitexto(wikitexto);
  return resultado.ok ? resultado.cuerpo : `NO: ${resultado.motivo}`;
}
