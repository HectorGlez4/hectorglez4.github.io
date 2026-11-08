import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  anadirVigentes,
  analizarVigentes,
  componerVigentes,
  cotejarAutorDeLaEntidad,
  declaraciones,
  entidadesReferidas,
  entidadServida,
  esDireccionDeWikidata,
  fichaTecnicaDe,
  leerDocumentoDeWikidata,
  obrasQueRemitenA,
  revisionActual,
  revisionDeclarada,
  sustituirVigente,
} from '../../tools/lib/wikidata.ts';
import { leerPosicionesDelCorpus } from '../../tools/lib/posiciones.ts';
import { leerDocumentosDeFuente, rutasDelCorpus } from '../../tools/lib/corpus.ts';
import { escribirCita } from '../../tools/lib/corpus.ts';
import { componerDocumento } from '../../tools/lib/documento.ts';
import { aEntidad, aTiempo, documento, entidad, respuestaDeRevision, sembrarWikidata } from './ayuda/wikidata.ts';

/**
 * Historia 32.1 — lo puro de Wikidata: la extracción de la Ficha técnica, el cotejo del autor,
 * el documento y `vigentes.yml`. Sin red: las revisiones se construyen a mano.
 */

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});
async function carpeta(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), 'sabiduria-wikidata-'));
  temporales.push(d);
  return d;
}

const NOVELA = entidad('Q8261', 50, { es: 'novela', otras: { en: 'novel' } });
const SATIRA = entidad('Q128758', 51, { otras: { en: 'satire' } });
const ESPANOL = entidad('Q1321', 52, { es: 'español' });
const LATIN = entidad('Q397', 53, { es: 'latín' });
const CERVANTES = entidad('Q5682', 54, { es: 'Miguel de Cervantes' });
const VIGENTES: Record<string, Record<string, unknown>> = Object.fromEntries(
  [NOVELA, SATIRA, ESPANOL, LATIN, CERVANTES].map((e) => [String(e.id), e]),
);
const vigente = (q: string) => VIGENTES[q];

describe('Historia 32.1 — esDireccionDeWikidata', () => {
  it.each([
    ['https://www.wikidata.org/w/index.php?title=Q480&oldid=1', true],
    ['http://m.wikidata.org/wiki/Q480', true],
    ['https://WWW.wikidata.org./wiki/Q480', true],
    ['https://wikidata.org.example.com/wiki/Q480', false],
    ['https://www.wikidata.org.example.com/wiki/Q480', false],
    ['https://ejemplo-wikidata.org/wiki/Q480', false],
    ['ftp://www.wikidata.org/wiki/Q480', false],
    ['no es una dirección', false],
  ])('%s → %s', (url, esperado) => {
    expect(esDireccionDeWikidata(url)).toBe(esperado);
  });
});

describe('Historia 32.1 — las reglas de rango y la extracción', () => {
  it('Q480: fuera la lengua deprecated, solo la preferred, el género sin etiqueta es se omite, dos P577 no dan año', () => {
    const q480 = entidad('Q480', 100, {
      es: 'Don Quijote de la Mancha',
      claims: {
        P50: [aEntidad('Q5682')],
        P136: [aEntidad('Q128758', { rango: 'preferred' }), aEntidad('Q8261'), aEntidad('Q8261', { rango: 'preferred' })],
        P407: [aEntidad('Q397', { rango: 'deprecated' }), aEntidad('Q1321')],
        P577: [aTiempo('+1605-01-01T00:00:00Z'), aTiempo('+1615-01-01T00:00:00Z')],
      },
    });
    expect(fichaTecnicaDe(q480, vigente)).toEqual({ generos: ['novela'], lenguas: ['español'] });
  });

  it('sin preferred cuentan todas las normales, en su orden y sin repetir; P364 no se lee', () => {
    const datos = entidad('Q1', 1, {
      claims: {
        P136: [aEntidad('Q8261'), aEntidad('Q128758'), aEntidad('Q8261')],
        P364: [aEntidad('Q397')],
        P407: [aEntidad('Q1321'), aEntidad('Q999')],
      },
    });
    expect(fichaTecnicaDe(datos, vigente)).toEqual({ generos: ['novela'], lenguas: ['español'] });
    expect(entidadesReferidas(datos)).toEqual(['Q8261', 'Q128758', 'Q1321', 'Q999']);
  });

  it('un snak sin valor o desconocido no cuenta', () => {
    const datos = entidad('Q1', 1, {
      claims: { P136: [aEntidad('Q8261', { snak: 'novalue' }), aEntidad('Q128758', { snak: 'somevalue' })] },
    });
    expect(declaraciones(datos, 'P136')).toEqual([]);
  });

  it('una sola P577 con precisión de año da el año; con precisión 8 (década), ninguno', () => {
    expect(fichaTecnicaDe(entidad('Q1', 1, { claims: { P577: [aTiempo('+1605-01-16T00:00:00Z', 11)] } }), vigente)).toEqual({
      generos: [],
      lenguas: [],
      año: 1605,
    });
    expect(fichaTecnicaDe(entidad('Q1', 1, { claims: { P577: [aTiempo('+1600-00-00T00:00:00Z', 8)] } }), vigente).año).toBeUndefined();
  });

  it('dos P577 iguales tampoco dan año (pregunta 13); una deprecated no cuenta', () => {
    const dos = [aTiempo('+1605-01-01T00:00:00Z'), aTiempo('+1605-01-01T00:00:00Z')];
    expect(fichaTecnicaDe(entidad('Q1', 1, { claims: { P577: dos } }), vigente).año).toBeUndefined();
    const conDeprecada = [aTiempo('+1605-01-01T00:00:00Z'), aTiempo('+1606-01-01T00:00:00Z', 9, { rango: 'deprecated' })];
    expect(fichaTecnicaDe(entidad('Q1', 1, { claims: { P577: conDeprecada } }), vigente).año).toBe(1605);
  });

  it('el año lleva su signo: -0049 es -49', () => {
    expect(fichaTecnicaDe(entidad('Q1', 1, { claims: { P577: [aTiempo('-0049-00-00T00:00:00Z')] } }), vigente).año).toBe(-49);
  });

  it('las referidas siguen las reglas de rango: una deprecated no se recupera', () => {
    const datos = entidad('Q1', 1, { claims: { P50: [aEntidad('Q5682')], P407: [aEntidad('Q397', { rango: 'deprecated' })] } });
    expect(entidadesReferidas(datos)).toEqual(['Q5682']);
  });
});

describe('Historia 32.1 — cotejarAutorDeLaEntidad', () => {
  const conVigente = (q: string) =>
    VIGENTES[q] !== undefined ? ({ ok: true, datos: VIGENTES[q] } as const) : ({ ok: false, motivo: `${q} sin vigente` } as const);
  const obra = (autor: string) => entidad('Q480', 100, { claims: { P50: [aEntidad(autor)] } });

  it('concuerda por la etiqueta en español de la vigente', () => {
    expect(cotejarAutorDeLaEntidad(obra('Q5682'), 'Miguel de Cervantes', conVigente)).toEqual({
      ok: true,
      persona: 'Q5682',
      etiqueta: 'Miguel de Cervantes',
    });
  });

  it('un autor ajeno pone delante las dos partes', () => {
    const prada = entidad('Q2', 2, { es: 'Manuel González Prada' });
    const r = cotejarAutorDeLaEntidad(obra('Q2'), 'Juan Montalvo', () => ({ ok: true, datos: prada }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.motivo).toContain('«Manuel González Prada»');
      expect(r.motivo).toContain('«Juan Montalvo»');
    }
  });

  it('sin P50, sin vigente o sin etiqueta en español se niega', () => {
    const sinP50 = cotejarAutorDeLaEntidad(entidad('Q480', 1), 'Miguel de Cervantes', conVigente);
    expect(sinP50.ok || sinP50.motivo).toMatch(/no declara autor/);
    const sinVigente = cotejarAutorDeLaEntidad(obra('Q777'), 'Miguel de Cervantes', conVigente);
    expect(sinVigente.ok || sinVigente.motivo).toMatch(/Q777 sin vigente/);
    const sinEs = cotejarAutorDeLaEntidad(obra('Q128758'), 'Miguel de Cervantes', conVigente);
    expect(sinEs.ok || sinEs.motivo).toMatch(/sin etiqueta|no tiene etiqueta en español/);
  });
});

describe('Historia 32.1 — el documento y lo que la API declara', () => {
  it('un documento coherente se lee; incoherente en nombre, cabecera o datos, no', () => {
    const q480 = entidad('Q480', 100);
    expect(leerDocumentoDeWikidata('Q480--r100.json', documento(q480)).ok).toBe(true);
    expect(leerDocumentoDeWikidata('Q480--r101.json', documento(q480)).ok).toBe(false);
    expect(leerDocumentoDeWikidata('Q481--r100.json', documento(q480)).ok).toBe(false);
    const otrosDatos = JSON.parse(documento(q480));
    otrosDatos.datos.lastrevid = 99;
    expect(leerDocumentoDeWikidata('Q480--r100.json', JSON.stringify(otrosDatos)).ok).toBe(false);
    const otraFuente = { ...JSON.parse(documento(q480)), fuente: 'wikipedia-es' };
    expect(leerDocumentoDeWikidata('Q480--r100.json', JSON.stringify(otraFuente)).ok).toBe(false);
    expect(leerDocumentoDeWikidata('Q480--r100.json', 'no es json').ok).toBe(false);
    expect(leerDocumentoDeWikidata('Q480.json', documento(q480)).ok).toBe(false);
  });

  it('el documento lleva sus campos en orden, CC0 y la entidad entera', () => {
    const texto = documento(entidad('Q480', 100, { es: 'Don Quijote' }));
    expect(Object.keys(JSON.parse(texto))).toEqual([
      'fuente',
      'entidad',
      'revision',
      'fechaDeRevision',
      'licencia',
      'url',
      'recuperado',
      'datos',
    ]);
    expect(JSON.parse(texto).licencia).toBe('CC0 1.0');
    expect(texto.endsWith('}\n')).toBe(true);
  });

  it('la API declara la entidad; otra página u otro espacio no es una entidad', () => {
    expect(revisionDeclarada(respuestaDeRevision('Q480', 100), 100)).toEqual({
      ok: true,
      entidad: 'Q480',
      revision: 100,
      fecha: '2024-05-01',
    });
    expect(revisionDeclarada(respuestaDeRevision('Property:P31', 100, { ns: 120 }), 100).ok).toBe(false);
    expect(revisionDeclarada(respuestaDeRevision('Talk:Q480', 100, { ns: 1 }), 100).ok).toBe(false);
    expect(revisionDeclarada(JSON.stringify({ query: { badrevids: { '100': { revid: 100 } } } }), 100).ok).toBe(false);
    expect(revisionActual(respuestaDeRevision('Q5682', 77), 'Q5682')).toMatchObject({ ok: true, revision: 77 });
    expect(revisionActual(respuestaDeRevision('Q5682', 77), 'Q5683').ok).toBe(false);
  });

  it('EntityData que sirve otra entidad (fusionada) u otra revisión se niega nombrando lo servido', () => {
    const servida = (datos: Record<string, unknown>) => JSON.stringify({ entities: { [String(datos.id)]: datos } });
    expect(entidadServida(servida(entidad('Q480', 100)), 'Q480', 100).ok).toBe(true);
    const fusionada = entidadServida(servida(entidad('Q999', 100)), 'Q480', 100);
    expect(fusionada.ok || fusionada.motivo).toMatch(/Q999/);
    const otraRevision = entidadServida(servida(entidad('Q480', 101)), 'Q480', 100);
    expect(otraRevision.ok || otraRevision.motivo).toMatch(/101/);
  });
});

describe('Historia 32.1 — vigentes.yml', () => {
  it('vacío es la cabecera y {}; con entradas, ordenado por número de entidad', () => {
    const vacio = componerVigentes(new Map());
    expect(vacio).toMatch(/^# /);
    expect(vacio.endsWith('\n{}\n')).toBe(true);
    expect(analizarVigentes(vacio).size).toBe(0);
    const lleno = componerVigentes(new Map([['Q8261', 3], ['Q50', 1], ['Q1321', 2]]));
    expect(lleno.split('\n').filter((l) => !l.startsWith('#') && l !== '')).toEqual(['Q50: 1', 'Q1321: 2', 'Q8261: 3']);
    expect([...analizarVigentes(lleno)]).toEqual([['Q50', 1], ['Q1321', 2], ['Q8261', 3]]);
  });

  it('una entrada sin forma no se deja leer', () => {
    expect(() => analizarVigentes('Q1: cero\n')).toThrow(/Q1/);
    expect(() => analizarVigentes('P31: 1\n')).toThrow(/P31/);
    expect(() => analizarVigentes('- Q1\n')).toThrow();
  });

  it('anadirVigentes solo añade: nunca toca una entidad que ya es vigente', async () => {
    const ruta = join(await carpeta(), 'vigentes.yml');
    await writeFile(ruta, componerVigentes(new Map([['Q8261', 3]])), 'utf8');
    const añadidas = await anadirVigentes(ruta, new Map([['Q8261', 9], ['Q5682', 4]]));
    expect(añadidas).toEqual(['Q5682']);
    expect([...analizarVigentes(await readFile(ruta, 'utf8'))]).toEqual([['Q5682', 4], ['Q8261', 3]]);
  });

  it('sustituirVigente cambia una vigente, y se niega con una que no lo es o con la misma revisión', async () => {
    const ruta = join(await carpeta(), 'vigentes.yml');
    await writeFile(ruta, componerVigentes(new Map([['Q8261', 3]])), 'utf8');
    await expect(sustituirVigente(ruta, 'Q1', 1)).rejects.toThrow(/no es vigente/);
    await expect(sustituirVigente(ruta, 'Q8261', 3)).rejects.toThrow(/ya es vigente/);
    expect(await sustituirVigente(ruta, 'Q8261', 7)).toBe(3);
    expect([...analizarVigentes(await readFile(ruta, 'utf8'))]).toEqual([['Q8261', 7]]);
  });

  it('obrasQueRemitenA cuenta las fichas que remiten por autor, género o lengua', () => {
    const fichas = [
      { nombre: 'b', datos: entidad('Q1', 1, { claims: { P136: [aEntidad('Q8261')] } }) },
      { nombre: 'a', datos: entidad('Q2', 1, { claims: { P407: [aEntidad('Q8261')] } }) },
      { nombre: 'c', datos: entidad('Q3', 1, { claims: { P136: [aEntidad('Q8261', { rango: 'deprecated' })] } }) },
      { nombre: 'd', datos: entidad('Q4', 1, { claims: { P50: [aEntidad('Q5682')] } }) },
    ];
    expect(obrasQueRemitenA('Q8261', fichas)).toEqual(['a', 'b']);
    expect(obrasQueRemitenA('Q5682', fichas)).toEqual(['d']);
  });
});

describe('Historia 32.1 — el cotejo y las posiciones no leen corpus/wikidata/', () => {
  it('un corpus con un documento de Wikidata da los mismos documentos y posiciones que sin él', async () => {
    const raiz = await carpeta();
    const corpus = join(raiz, 'corpus');
    for (const dir of ['citas', 'autores', 'temas', 'fuentes']) await mkdir(join(corpus, dir), { recursive: true });
    await writeFile(
      join(corpus, 'fuentes', 'wikisource-es--cartas.txt'),
      componerDocumento(
        { fuente: 'wikisource-es', obra: 'Cartas', url: 'https://es.wikisource.org/wiki/Cartas', recuperado: '2026-01-01' },
        'Cartas\n|autor=Séneca',
        'Primera frase de la obra entera. Segunda frase que se cita aquí.',
      ),
      'utf8',
    );
    await escribirCita(join(corpus, 'citas'), 'seneca--segunda', {
      texto: 'Segunda frase que se cita aquí.',
      autor: 'seneca',
      slug: 'seneca-segunda',
      procedencia: { obra: 'Cartas' },
      fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Cartas' },
      estadoDerechos: 'dominio-público',
    });
    const rutas = rutasDelCorpus(corpus);
    const antes = { documentos: [...(await leerDocumentosDeFuente(rutas)).keys()], posiciones: await leerPosicionesDelCorpus(corpus) };
    await sembrarWikidata(
      corpus,
      [entidad('Q480', 1, { es: 'Segunda frase que se cita aquí.' })],
      { Q480: 1 },
    );
    const despues = { documentos: [...(await leerDocumentosDeFuente(rutas)).keys()], posiciones: await leerPosicionesDelCorpus(corpus) };
    expect(despues).toEqual(antes);
    expect(despues.documentos).toEqual(['wikisource-es--cartas']);
    expect(despues.posiciones.get('seneca-segunda')).toHaveLength(1);
  });
});
