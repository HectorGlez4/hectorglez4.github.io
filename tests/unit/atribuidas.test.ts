/**
 * Historia 35.1b, AD-32 — la puerta de la atribuida, pura: la puerta cerrada, cada tope, la
 * figura pública sin Obra, el Personaje sin esa exigencia y los duplicados entre clases; y lo
 * que el esquema juzga de una atribuida sola. Los valores entran por parámetro: nada se parchea.
 * Las construcciones de verdad están en `puerta-de-admision.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import {
  constantesSinValor,
  fallosDeAtribuidas,
  fichaPlaneada,
  lineaDelBuild,
  planDaFichaAlAutor,
  motivoPuertaCerrada,
  motivosDe,
  VALORES_DEL_ARBOL,
  type CitaParaAtribuidas,
  type ValoresDeLaPuerta,
} from '../../tools/lib/atribuidas.ts';
import { CLASE_ATRIBUIDA } from '../../src/lib/clase.ts';
import { citaAdmisible, motivoDeAtestiguacionesEscasas, ORIGENES } from '../../src/lib/admision.ts';
import type { FichaDeObra } from '../../src/lib/obras.ts';

const ABIERTA: ValoresDeLaPuerta = {
  maxCaracteres: 60,
  maxPorObra: 2,
  maxPorDueño: 3,
  minAtestiguaciones: 2,
  buzon: 'peticiones@ejemplo.org',
};

const NOMBRES = [
  'MAX_CARACTERES_DE_ATRIBUIDA',
  'MAX_ATRIBUIDAS_POR_OBRA',
  'MAX_ATRIBUIDAS_POR_DUEÑO',
  'MIN_ATESTIGUACIONES_DE_ATRIBUIDA',
  'BUZON_DE_PETICIONES',
];

const VIVA = { slug: 'ana', vivo: true as const };
const MUERTO = { slug: 'seneca', añoFallecimiento: 65 };

const ficha = (nombre: string, autor: string, forma: string): FichaDeObra => ({
  nombre,
  ruta: `corpus/obras/${nombre}.yml`,
  autor,
  titulo: forma,
  formas: [forma],
});

const atribuida = (slug: string, texto: string, extra: Partial<CitaParaAtribuidas> = {}): CitaParaAtribuidas => ({
  slug,
  ruta: `corpus/citas/${slug}.md`,
  texto,
  autor: 'ana',
  clase: CLASE_ATRIBUIDA,
  procedencia: { obra: 'Obras de Ana' },
  ...extra,
});
const deSiempre = (slug: string, texto: string): CitaParaAtribuidas => ({ slug, texto, autor: 'seneca' });

const FICHAS = [ficha('ana--obras-de-ana', 'ana', 'obras de ana')];
const juicio = (citas: CitaParaAtribuidas[], extra: Partial<Parameters<typeof fallosDeAtribuidas>[0]> = {}) =>
  fallosDeAtribuidas({ citas, autores: [VIVA, MUERTO], fichas: FICHAS, valores: ABIERTA, ...extra });

describe('la puerta cerrada', () => {
  it('sin ninguna de las cinco con valor está cerrada y las nombra todas; el árbol, por las que no tenga', () => {
    expect(constantesSinValor({})).toEqual(NOMBRES);
    expect(motivoPuertaCerrada({})).toContain(NOMBRES.join(', '));
    // Sigue el valor que tenga el árbol, sin fijarlo: darles valor (Héctor) no pone esto en rojo.
    const faltan = constantesSinValor(VALORES_DEL_ARBOL);
    if (faltan.length === 0) expect(motivoPuertaCerrada()).toBeUndefined();
    else expect(motivoPuertaCerrada()).toContain(faltan.join(', '));
  });

  it.each(NOMBRES.map((n, i) => [n, i] as const))('con %s sin valor sigue cerrada y la nombra a ella sola', (nombre, i) => {
    const claves = Object.keys(ABIERTA) as (keyof ValoresDeLaPuerta)[];
    const valores = { ...ABIERTA, [claves[i]]: undefined };
    expect(constantesSinValor(valores)).toEqual([nombre]);
    const fallos = juicio([atribuida('ana-x', 'Una frase de Ana.')], { valores });
    expect(fallos).toHaveLength(1);
    expect(fallos[0].motivo).toContain(nombre);
    expect(fallos[0].motivo).toContain('cerrada');
    for (const otra of NOMBRES.filter((n) => n !== nombre)) expect(fallos[0].motivo).not.toContain(otra);
    expect(lineaDelBuild(fallos[0])).toMatch(/^corpus\/citas\/ana-x\.md: la puerta de la atribuida está cerrada/u);
  });

  it.each([
    ['un tope en 0', { maxPorObra: 0 }, 'MAX_ATRIBUIDAS_POR_OBRA'],
    ['un tope negativo', { maxPorDueño: -1 }, 'MAX_ATRIBUIDAS_POR_DUEÑO'],
    ['un tope decimal', { maxCaracteres: 12.5 }, 'MAX_CARACTERES_DE_ATRIBUIDA'],
    ['un mínimo NaN', { minAtestiguaciones: Number.NaN }, 'MIN_ATESTIGUACIONES_DE_ATRIBUIDA'],
    ['un buzón en blanco', { buzon: '  ' }, 'BUZON_DE_PETICIONES'],
  ] as const)('con %s no se abre: cuenta como sin valor', (_, cambio, nombre) => {
    expect(constantesSinValor({ ...ABIERTA, ...cambio })).toEqual([nombre]);
  });

  it('con las cinco, abierta: la feliz no tiene fallos, y la de siempre no se juzga nunca', () => {
    expect(motivoPuertaCerrada(ABIERTA)).toBeUndefined();
    expect(juicio([atribuida('ana-x', 'Una frase de Ana.'), deSiempre('seneca-y', 'Otra cosa que nada tiene que ver.')])).toEqual([]);
    expect(juicio([deSiempre('seneca-y', 'Otra cosa.')], { valores: {} })).toEqual([]);
  });
});

describe('los topes, con la puerta abierta', () => {
  it('el texto: más de MAX_CARACTERES_DE_ATRIBUIDA puntos de código', () => {
    const justo = 'a'.repeat(59) + '😀';
    expect(juicio([atribuida('ana-justo', justo)])).toEqual([]);
    const largo = `${justo}b`;
    const fallos = juicio([atribuida('ana-largo', largo)]);
    expect(motivosDe(fallos, 'ana-largo')).toEqual([
      'la atribuida «ana-largo» tiene 61 caracteres y el tope es 60 (MAX_CARACTERES_DE_ATRIBUIDA).',
    ]);
  });

  it('la Obra: más de MAX_ATRIBUIDAS_POR_OBRA en una Obra con derechos, con recuento y tope', () => {
    const tres = [
      atribuida('ana-uno', 'Primera frase de la obra.'),
      atribuida('ana-dos', 'Segunda cosa, distinta del todo.'),
      atribuida('ana-tres', 'Tercera, que ya no cabe aquí.'),
    ];
    const fallos = juicio(tres);
    expect(fallos.map((f) => f.motivo)).toContain(
      'la Obra «ana--obras-de-ana» tendría 3 atribuidas y el tope es 2 (MAX_ATRIBUIDAS_POR_OBRA): ana-uno, ana-dos, ana-tres.',
    );
    // Solo se juzga lo pedido: con dos publicadas, la tercera es la que no cabe.
    expect(motivosDe(juicio(tres, { juzgar: new Set(['ana-tres']) }), 'ana-tres')).toHaveLength(1);
    expect(juicio(tres.slice(0, 2))).toEqual([]);
  });

  it('el dueño: más de MAX_ATRIBUIDAS_POR_DUEÑO, aunque cada Obra quepa', () => {
    const fichas = [...FICHAS, ficha('ana--otra', 'ana', 'otra')];
    const cuatro = [
      atribuida('ana-a', 'Una sobre el mar y la arena.'),
      atribuida('ana-b', 'Otra sobre la noche cerrada.'),
      atribuida('ana-c', 'La de la tercera es del viento.', { procedencia: { obra: 'Otra' } }),
      atribuida('ana-d', 'Cuarta: los trenes no esperan.', { procedencia: { obra: 'Otra' } }),
    ];
    const fallos = juicio(cuatro, { fichas });
    expect(fallos.map((f) => f.motivo)).toEqual([
      'el Autor «ana» tendría 4 atribuidas y el tope es 3 (MAX_ATRIBUIDAS_POR_DUEÑO): ana-a, ana-b, ana-c, ana-d.',
    ]);
  });

  it('el dueño sin Autor es el Personaje, que siempre tiene derechos', () => {
    const del = (slug: string, texto: string) =>
      atribuida(slug, texto, { autor: undefined, personaje: 'batman', procedencia: undefined });
    const fallos = juicio([del('batman-a', 'Soy la noche.'), del('batman-b', 'La ciudad me llama.'), del('batman-c', 'Sin miedo no hay valor.'), del('batman-d', 'Nunca llego tarde.')]);
    expect(fallos.map((f) => f.motivo)).toEqual([
      'el Personaje «batman» tendría 4 atribuidas y el tope es 3 (MAX_ATRIBUIDAS_POR_DUEÑO): batman-a, batman-b, batman-c, batman-d.',
    ]);
  });
});

describe('el mínimo de dominios, con el valor de la puerta', () => {
  it('una atribuida atestiguada por un solo dominio registrable no pasa con MIN 2, aunque el árbol no tenga valor', () => {
    const una = atribuida('ana-una', 'Una frase de Ana.', {
      atestiguaciones: [
        { url: 'https://es.wikiquote.org/wiki/Ana', consultadaEl: '2026-11-01' },
        { url: 'https://en.wikiquote.org/wiki/Ana', consultadaEl: '2026-11-01' },
      ],
    });
    const motivos = motivosDe(juicio([una]), 'ana-una');
    expect(motivos).toHaveLength(1);
    expect(motivos[0]).toContain('la atribuida «ana-una»');
    expect(motivos[0]).toContain(motivoDeAtestiguacionesEscasas(['https://es.wikiquote.org/'], 2)!);
    const dos = { ...una, atestiguaciones: [...(una.atestiguaciones as object[]), { url: 'https://www.bbc.co.uk/x', consultadaEl: '2026-11-01' }] };
    expect(juicio([dos])).toEqual([]);
  });
});

describe('las fichas que crea la pasada', () => {
  const crear = {
    ok: true as const,
    accion: 'crear' as const,
    nombre: 'ana--nueva',
    titulo: 'Nueva',
    dueño: { tipo: 'autor' as const, slug: 'ana' },
    forma: 'nueva',
  };

  it('una ficha planeada cuenta para el tope por Obra antes de estar en el disco', () => {
    const nueva = fichaPlaneada(crear)!;
    expect(nueva).toEqual({ nombre: 'ana--nueva', ruta: 'ana--nueva', titulo: 'Nueva', formas: ['nueva'], autor: 'ana' });
    const tres = ['Primera de la nueva.', 'Segunda, distinta del todo.', 'Tercera, que no cabe.'].map((t, i) =>
      atribuida(`ana-n${i}`, t, { procedencia: { obra: 'Nueva' } }),
    );
    expect(juicio(tres, { fichas: [...FICHAS, nueva] }).map((f) => f.motivo)).toContain(
      'la Obra «ana--nueva» tendría 3 atribuidas y el tope es 2 (MAX_ATRIBUIDAS_POR_OBRA): ana-n0, ana-n1, ana-n2.',
    );
    expect(lineaDelBuild(juicio(tres, { fichas: [...FICHAS, nueva] })[0])).toMatch(/^ana--nueva: la Obra/u);
  });

  it('solo crear o restaurar dan Ficha al Autor; «existente» no (ya está en el disco, o la obra no deja forma)', () => {
    expect(planDaFichaAlAutor(crear)).toBe(true);
    expect(planDaFichaAlAutor({ ...crear, dueño: { tipo: 'personaje', slug: 'batman' } })).toBe(false);
    expect(planDaFichaAlAutor({ ok: true, accion: 'restaurar', origen: 'x', titulo: 'X' })).toBe(true);
    expect(planDaFichaAlAutor({ ok: true, accion: 'existente' })).toBe(false);
    expect(planDaFichaAlAutor({ ok: false, motivos: ['choca'] })).toBe(false);
    expect(planDaFichaAlAutor(undefined)).toBe(false);
    expect(fichaPlaneada({ ok: true, accion: 'existente' })).toBeUndefined();
  });

  it('el dueño de una ficha de Personaje es el Personaje, aunque declare un Autor informativo', () => {
    // Un Autor muerto como `autor` informativo no quita el tope: el dueño es el Personaje.
    const dePersonaje: FichaDeObra = { ...ficha('batman--noche', 'seneca', 'noche'), personaje: 'batman', personajes: ['batman'] };
    const tres = ['Soy la noche.', 'La ciudad me llama.', 'Nunca llego tarde.'].map((t, i) =>
      atribuida(`batman-${i}`, t, { autor: 'seneca', personaje: 'batman', procedencia: { obra: 'Noche' } }),
    );
    expect(juicio(tres, { fichas: [dePersonaje] }).map((f) => f.motivo)).toContain(
      'la Obra «batman--noche» tendría 3 atribuidas y el tope es 2 (MAX_ATRIBUIDAS_POR_OBRA): batman-0, batman-1, batman-2.',
    );
  });
});

describe('la figura pública sin Obra (pregunta 23)', () => {
  it('Autor sin Personaje y sin ninguna Ficha de Obra suya: rechazo que nombra el Autor', () => {
    const fallos = juicio([atribuida('ana-x', 'Una frase de Ana.', { procedencia: undefined })], { fichas: [] });
    expect(fallos.map((f) => f.motivo)).toEqual([
      'la atribuida «ana-x» es del Autor «ana», sin Personaje, y ese Autor no es autor de ninguna Ficha de Obra: ' +
        'una figura pública sin Obra no tiene atribuidas (pregunta 23).',
    ]);
  });

  it('la ficha que la misma pasada crea cuenta, y con Personaje no aplica', () => {
    expect(juicio([atribuida('ana-x', 'Una frase de Ana.')], { fichas: [], autoresConFichaNueva: ['ana'] })).toEqual([]);
    expect(juicio([atribuida('ana-x', 'Una frase de Ana.', { personaje: 'batman' })], { fichas: [] })).toEqual([]);
  });

  it('el `autor` informativo de la ficha de un Personaje no le da Obra al Autor: no es su dueño', () => {
    const deBatman: FichaDeObra = { ...ficha('batman--el-caballero', 'ana', 'el caballero'), personaje: 'batman', personajes: ['batman'] };
    const fallos = juicio([atribuida('ana-x', 'Una frase de Ana.', { procedencia: undefined })], { fichas: [deBatman] });
    expect(fallos.map((f) => f.motivo)).toEqual([expect.stringMatching(/Autor «ana», sin Personaje.*\(pregunta 23\)\.$/u)]);
  });
});

describe('los duplicados entre clases', () => {
  const casos: [string, string, string][] = [
    ['repetidas', 'La vida es corta y el arte es largo.', 'La vida es corta, y el arte es largo.'],
    [
      'contenida',
      'La vida es corta y el arte es largo, dijo el médico.',
      'Lo sé bien: la vida es corta y el arte es largo, dijo el médico, y lo repito siempre.',
    ],
    ['casi iguales', 'La vida es corta y el arte es largo.', 'La vida es corta y el arte es larga.'],
  ];
  it.each(casos)('%s con una de siempre publicada: rechazo nombrando el slug y la clase', (_, suya, otra) => {
    const fallos = juicio([atribuida('ana-x', suya), deSiempre('seneca-y', otra)]);
    expect(motivosDe(fallos, 'ana-x')).toEqual([
      expect.stringMatching(/^la atribuida «ana-x» coincide con «seneca-y», de la clase siempre .*«--con-duplicados»\.$/u),
    ]);
  });

  it('con otra atribuida, y con una candidata de revisión o del lote (comparables)', () => {
    const otra = atribuida('ana-y', 'La vida es corta y el arte es largo.', { procedencia: undefined, personaje: 'p' });
    expect(motivosDe(juicio([atribuida('ana-x', 'La vida es corta y el arte es largo.'), otra]), 'ana-x')[0]).toMatch(
      /coincide con «ana-y», de la clase atribuida/u,
    );
    const fallos = juicio([atribuida('ana-x', 'La vida es corta y el arte es largo.')], {
      comparables: [{ slug: 'candidata-z', texto: 'La vida es corta y el arte es largo' }],
    });
    expect(motivosDe(fallos, 'ana-x')[0]).toMatch(/coincide con «candidata-z», de la clase siempre/u);
  });

  it('con una publicada del mismo slug —el mismo texto del mismo dueño—: se compara por identidad, no por slug', () => {
    const publicada = atribuida('ana-la-vida-es-corta', 'La vida es corta y el arte es largo.');
    const candidata = atribuida('ana-la-vida-es-corta', 'La vida es corta y el arte es largo.', { ruta: 'corpus/_revision/x.md' });
    const fallos = juicio([publicada, candidata], { juzgar: new Set([candidata.slug]) });
    expect(fallos.map((f) => f.motivo)).toContainEqual(
      expect.stringMatching(/^la atribuida «ana-la-vida-es-corta» coincide con «ana-la-vida-es-corta», de la clase atribuida/u),
    );
  });
});

describe('el esquema de la atribuida sola', () => {
  const base = {
    texto: 'Una frase de Ana.',
    autor: 'ana',
    slug: 'ana-una-frase',
    procedencia: { obra: 'Obras de Ana' },
    clase: CLASE_ATRIBUIDA,
    atestiguaciones: [
      { url: 'https://es.wikiquote.org/wiki/Ana', consultadaEl: '2026-11-01' },
      { url: 'https://www.elpais.com/ana', consultadaEl: '2026-11-02' },
    ],
    origen: 'original',
  };
  const mensajes = (valor: unknown) =>
    (citaAdmisible.safeParse(valor).error?.issues ?? []).map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');

  it('la feliz pasa; los tres orígenes del conjunto', () => {
    expect(citaAdmisible.safeParse(base).success).toBe(true);
    expect(ORIGENES).toEqual(['original', 'doblaje', 'traduccion-publicada']);
    for (const origen of ORIGENES) expect(citaAdmisible.safeParse({ ...base, origen }).success).toBe(true);
  });

  it('sin atestiguaciones, vacías, mal formadas, o sin origen u otro origen: rechazo', () => {
    const { atestiguaciones: _a, origen: _o, ...sin } = base;
    expect(mensajes(sin)).toMatch(/^atestiguaciones: .*declara sus «atestiguaciones»/mu);
    expect(mensajes(sin)).toMatch(/^origen: .*declara su «origen»/mu);
    expect(mensajes({ ...base, atestiguaciones: [] })).toMatch(/al menos una atestiguación/u);
    expect(mensajes({ ...base, atestiguaciones: [{ url: 'ftp://x.org/', consultadaEl: '2026-11-01' }] })).toMatch(/http:\/\/ o https:\/\//u);
    expect(mensajes({ ...base, atestiguaciones: [{ url: 'https://x.org/', consultadaEl: '2026-02-30' }] })).toMatch(/consultadaEl/u);
    expect(mensajes({ ...base, origen: 'inventado' })).toMatch(/^origen: /mu);
  });

  it('con un salto de línea, o apta para portada: rechazo (pregunta 22)', () => {
    expect(mensajes({ ...base, texto: 'Un verso\notro verso' })).toMatch(/^texto: .*una sola línea/mu);
    expect(mensajes({ ...base, aptaParaPortada: true })).toMatch(/^aptaParaPortada: .*pregunta 22/mu);
  });

  it('la de siempre con atestiguaciones u origen: rechazo que nombra el campo', () => {
    const siempre = { ...base, clase: undefined, estadoDerechos: 'dominio-público' };
    expect(mensajes(siempre)).toMatch(/^atestiguaciones: .*solo una Cita atribuida declara «atestiguaciones»/mu);
    expect(mensajes(siempre)).toMatch(/^origen: .*solo una Cita atribuida declara «origen»/mu);
  });

  it('el recuento de dominios: subdominios, BrainyQuote y el propio dominio no suman; sin mínimo no se juzga', () => {
    expect(motivoDeAtestiguacionesEscasas(['https://es.wikiquote.org/a', 'https://en.wikiquote.org/b'], 2)).toMatch(
      /la atestigua 1 dominio registrable \(wikiquote\.org\) y hacen falta 2/u,
    );
    expect(motivoDeAtestiguacionesEscasas(['https://www.brainyquote.com/a', 'https://es.wikiquote.org/b'], 2)).toMatch(/1 dominio/u);
    expect(motivoDeAtestiguacionesEscasas(['https://www.bbc.co.uk/a', 'https://es.wikiquote.org/b'], 2)).toBeUndefined();
    expect(motivoDeAtestiguacionesEscasas(['https://www.brainyquote.com/a'], undefined)).toBeUndefined();
  });
});
