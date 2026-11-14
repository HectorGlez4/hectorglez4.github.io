import { describe, expect, it } from 'vitest';
import {
  autoresDestacados,
  lineaDeCifras,
  temasPublicados,
  type Autor,
  type Cita,
  type Tema,
} from '../../src/lib/publicado.ts';
import { citasQueCabenDe, verHuecos } from '../../src/lib/huecos.ts';
import { aptasParaPortada } from '../../src/lib/citaDelDia.ts';
import { fijacionesSinAtribuidas } from '../../src/lib/portada.ts';
import { auditar, sinTraduccionDeclarada } from '../../src/lib/salud.ts';
import { slugsSembrados } from '../../tools/lib/epocas.ts';
import { fallosDeAtribuidas, type CitaParaAtribuidas } from '../../tools/lib/atribuidas.ts';
import { entradaVedada, type FormaVedada } from '../../tools/lib/formasVedadas.ts';
import { MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';

/**
 * Historia 35.7 — lo que cuenta solo la clase de siempre (AD-1, AD-11, FR-16 v9.1): cada cálculo
 * pregunta a `esAtribuida` y deja fuera a la atribuida, y al Autor `vivo`, donde la historia lo
 * dice. Puro: ninguna prueba construye nada.
 */

const autor = (slug: string, extra: Partial<Autor> = {}): Autor => ({
  slug,
  nombre: `Nombre de ${slug}`,
  semblanza: 'Semblanza de prueba.',
  ordenAlfabetico: slug,
  ...(extra.vivo === true ? {} : { añoFallecimiento: 1900 }),
  ...extra,
});

const cita = (slug: string, campos: Partial<Cita> = {}): Cita =>
  ({
    slug,
    texto: `Texto de ${slug}, que dice algo distinto de las demás.`,
    autor: 'seneca',
    temas: [],
    procedencia: { obra: 'Cartas', año: 62 },
    fuente: { id: 'wikisource-es' },
    aptaParaPortada: false,
    ...campos,
  }) as unknown as Cita;

const atribuida = (slug: string, campos: Partial<Cita> = {}): Cita =>
  cita(slug, { clase: 'atribuida', fuente: undefined, procedencia: { año: 2000 }, ...campos });

describe('35.7 — la línea de cifras', () => {
  const autores = [autor('seneca')];

  it('con el censo vacío y sin atribuidas dice «cada una»', () => {
    expect(lineaDeCifras([cita('a'), cita('b')], autores)).toBe(
      '2 citas de 1 autor, cada una cotejada con el texto de su fuente.',
    );
  });

  it('con el censo vacío y una atribuida, aunque traiga Fuente, va en la redacción 1 (UX-DR57)', () => {
    const conFuente = atribuida('x', { fuente: { id: 'wikisource-es' } as Cita['fuente'] });
    expect(lineaDeCifras([cita('a'), cita('b'), conFuente], autores)).toBe(
      '3 citas de 1 autor; 2 cotejadas con el texto de su fuente.',
    );
  });

  it('m no cuenta Personajes: una atribuida de un Personaje sin Autor no suma autores', () => {
    const delPersonaje = atribuida('p', { autor: undefined, personaje: 'batman' });
    expect(lineaDeCifras([cita('a'), delPersonaje], autores)).toBe('2 citas de 1 autor; 1 cotejada con el texto de su fuente.');
  });
});

describe('35.7 — destacados, suelo y huecos', () => {
  it('un Autor vivo no entra en los destacados, y las atribuidas no suman a ninguno', () => {
    const autores = [autor('seneca'), autor('vivo', { vivo: true }), autor('otro')];
    const citas = [
      cita('s1'),
      atribuida('v1', { autor: 'vivo' }),
      atribuida('v2', { autor: 'vivo' }),
      atribuida('o1', { autor: 'otro' }),
    ];
    expect(autoresDestacados(autores, citas).map((a) => a.slug)).toEqual(['seneca']);
  });

  it('verHuecos: el vivo fuera de la tradición y del margen; el hueco y el margen, solo con las de siempre', () => {
    const temas = [{ slug: 'tiempo', nombre: 'El tiempo' }];
    const autores = [
      { slug: 'seneca', nombre: 'Séneca', tradicion: 'otra' as const },
      { slug: 'vivo', nombre: 'Una viva', tradicion: 'latinoamericana' as const, vivo: true },
    ];
    const deSiempre = Array.from({ length: MIN_CITAS_POR_TEMA - 1 }, (_, i) => ({
      slug: `s${i}`,
      autor: 'seneca',
      temas: ['tiempo'],
    }));
    const atribuidas = [{ slug: 'v1', autor: 'vivo', temas: ['tiempo'], clase: 'atribuida' }];
    const huecos = verHuecos([...deSiempre, ...atribuidas], temas, autores, ['tiempo']);
    expect(huecos.tradicion.total).toBe(1);
    expect(huecos.tradicion.latinoamericana).toBe(0);
    expect(huecos.margenPorAutor.map((m) => m.autor)).toEqual(['seneca']);
    expect(huecos.margenPorAutor[0].citas).toBe(MIN_CITAS_POR_TEMA - 1);
    // El hueco de Tema cuenta solo las de siempre: le falta una.
    expect(huecos.temas).toEqual([
      { slug: 'tiempo', nombre: 'El tiempo', publicadas: MIN_CITAS_POR_TEMA - 1, faltan: 1 },
    ]);
    // Y la condición de lanzamiento compara con la regla de publicación, que cuenta las dos.
    expect(huecos.anunciadosBajoUmbral).toEqual([]);
  });

  it('verHuecos: el margen de cada Autor se mide contra el total de la clase de siempre', () => {
    const autores = [
      { slug: 'seneca', nombre: 'Séneca' },
      { slug: 'epicteto', nombre: 'Epicteto' },
      { slug: 'vivo', nombre: 'Una viva', vivo: true },
    ];
    const citas = [
      { slug: 's0', autor: 'seneca' },
      ...Array.from({ length: 19 }, (_, i) => ({ slug: `e${i}`, autor: 'epicteto' })),
      ...Array.from({ length: 10 }, (_, i) => ({ slug: `v${i}`, autor: 'vivo', clase: 'atribuida' })),
    ];
    const seneca = verHuecos(citas, [], autores).margenPorAutor.find((m) => m.autor === 'seneca')!;
    expect(seneca.caben).toBe(citasQueCabenDe(1, 20));
    // Contra todas las publicadas el margen sería otro: la prueba distingue los dos totales.
    expect(citasQueCabenDe(1, 20)).not.toBe(citasQueCabenDe(1, 30));
  });

    it('MIN_CITAS_POR_TEMA sigue contando las dos clases (AD-11)', () => {
    const temas: Tema[] = [{ slug: 'tiempo', nombre: 'El tiempo', descripcion: 'x' } as unknown as Tema];
    const citas = [
      ...Array.from({ length: MIN_CITAS_POR_TEMA - 1 }, (_, i) => cita(`s${i}`, { temas: ['tiempo'] })),
      atribuida('a1', { temas: ['tiempo'] }),
    ];
    expect(temasPublicados(temas, citas).map((t) => t.slug)).toEqual(['tiempo']);
    expect(temasPublicados(temas, citas.slice(0, -1))).toEqual([]);
  });

  it('un Autor vivo no cuenta como sembrado de ninguna época', () => {
    const sembrados = slugsSembrados([
      { slug: 'seneca' },
      { slug: 'una-viva', vivo: true, tituloEnFuente: 'Una Viva' },
    ]);
    expect([...sembrados]).toEqual(['seneca']);
  });
});

describe('35.7 — la portada (pregunta 22)', () => {
  it('una atribuida marcada a mano no es apta, y su fijación se descarta', () => {
    const apta = cita('apta', { aptaParaPortada: true });
    const marcada = atribuida('marcada', { aptaParaPortada: true });
    expect(aptasParaPortada([apta, marcada]).map((c) => c.slug)).toEqual(['apta']);
    expect(
      fijacionesSinAtribuidas({ '2026-12-01': 'marcada', '2026-12-02': 'apta', '2026-12-03': 'otra' }, [apta, marcada]),
    ).toEqual({ '2026-12-02': 'apta', '2026-12-03': 'otra' });
  });
});

describe('35.7 — la salud del Corpus y SM-C1', () => {
  it('la procedencia completa se calcula solo sobre la clase de siempre, y las atribuidas van aparte', () => {
    const informe = auditar([
      { slug: 'a', autor: 'seneca', procedencia: { obra: 'Cartas', año: 62 } },
      { slug: 'b', autor: 'seneca', procedencia: { obra: 'Cartas' } },
      { slug: 'c', autor: 'vivo', procedencia: { año: 2000 }, clase: 'atribuida' },
    ]);
    expect(informe.publicadas.total).toBe(2);
    expect(informe.publicadas.completa).toBe(1);
    expect(informe.publicadas.porcentajeCompleta).toBe(50);
    expect(informe.atribuidas).toBe(1);
    expect(informe.porAutor.map((a) => a.autor)).toEqual(['seneca']);
  });

  it('las traducidas sin traducción no cuentan la atribuida, aunque traiga Fuente', () => {
    const deOtra = new Set(['seneca']);
    const conFuente = { autor: 'seneca', procedencia: { obra: 'Cartas', año: 62 }, fuente: { id: 'wikisource-es' } };
    const sinAtribuida = sinTraduccionDeclarada([{ slug: 'a', ...conFuente }], deOtra);
    expect(sinAtribuida.total).toBe(1);
    const conAtribuida = sinTraduccionDeclarada(
      [{ slug: 'a', ...conFuente }, { slug: 'b', ...conFuente, clase: 'atribuida' }],
      deOtra,
    );
    expect(conAtribuida.total).toBe(1);
  });
});

describe('35.7 — las formas vedadas en la puerta de la atribuida', () => {
  const PUERTA_DE_PRUEBA = { maxCaracteres: 1000, maxPorObra: 1000, maxPorDueño: 1000, minAtestiguaciones: 2, buzon: 'b@ejemplo.org' };
  const TEXTO = 'Lo que no se coteja no se promete, por más que circule.';
  const publicada: CitaParaAtribuidas = {
    slug: 'batman-lo-que-no-se-coteja',
    texto: TEXTO,
    personaje: 'batman',
    clase: 'atribuida',
    procedencia: {},
  };
  const juicio = (vedadas: FormaVedada[], valores = PUERTA_DE_PRUEBA) =>
    fallosDeAtribuidas({ citas: [publicada], autores: [], fichas: [], vedadas, valores });
  const vedada = (motivo: FormaVedada['motivo'], slug?: string) => entradaVedada(`«${TEXTO.toUpperCase()}»`, motivo, '2026-11-14', slug)!;

  it('una atribuida igual a una forma vedada falla, nombrando la entrada', () => {
    const fallos = juicio([vedada('cotejo-fallido', 'seneca-lo-que-no-se-coteja')]);
    expect(fallos).toHaveLength(1);
    expect(fallos[0].motivo).toContain('forma vedada');
    expect(fallos[0].motivo).toContain('cotejo-fallido, 2026-11-14, seneca-lo-que-no-se-coteja');
  });

  it('por su Variante también', () => {
    const conVariante = { ...publicada, texto: 'Otra letra sin nada en común con lo vedado aquí.', variante: TEXTO };
    const fallos = fallosDeAtribuidas({
      citas: [conVariante],
      autores: [],
      fichas: [],
      vedadas: [vedada('retirada')],
      valores: PUERTA_DE_PRUEBA,
    });
    expect(fallos.map((f) => f.motivo).join('\n')).toContain('forma vedada');
  });

  it('una entrada cambio-de-clase no veda, ni la que lleva el slug de la propia Cita', () => {
    expect(juicio([vedada('cambio-de-clase', 'seneca-lo-que-no-se-coteja')])).toEqual([]);
    expect(juicio([vedada('retirada', publicada.slug)])).toEqual([]);
  });

  it('con la puerta cerrada solo se dice la puerta', () => {
    const fallos = fallosDeAtribuidas({ citas: [publicada], autores: [], fichas: [], vedadas: [vedada('retirada')], valores: {} });
    expect(fallos).toHaveLength(1);
    expect(fallos[0].motivo).toContain('la puerta de la atribuida está cerrada');
  });
});
