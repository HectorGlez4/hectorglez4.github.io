import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { obraAdmisible } from '../../src/lib/admision.ts';
import {
  avisosDeObras,
  fallosDeObras,
  fichaDeCita,
  formaDeObra,
  grafiaPorOmision,
  nombreDeFichaDeObra,
  prefijosDeFormas,
  obrasDeCitas,
  type FichaDeObra,
} from '../../src/lib/obras.ts';
import {
  escribirCita,
  leerFichasDeObra,
  mover,
  rutasDelCorpus,
  type Rutas,
} from '../../tools/lib/corpus.ts';
import {
  asegurarFichaDeObra,
  retirarFichaDeObra,
  sembrarFichasDeObra,
} from '../../tools/lib/obras.ts';
import { aprobar } from '../../tools/lib/revision.ts';
import { darDeAltaLote } from '../../tools/alta.ts';
import { retirarAutor } from '../../tools/lib/gestion.ts';

/** Historia 22.1 — cada Obra tiene ficha antes de tener URL. */

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

function ficha(nombre: string, autor: string, titulo: string, formas: string[]): FichaDeObra {
  return { nombre, ruta: `corpus/obras/${nombre}.yml`, autor, titulo, formas };
}

function cita(slug: string, autor: string, obra?: string) {
  return { slug, autor, ...(obra !== undefined ? { procedencia: { obra } } : {}) };
}

describe('el esquema de la Ficha de Obra', () => {
  it('admite autor, título y formas canónicas', () => {
    expect(
      obraAdmisible.safeParse({
        autor: 'seneca',
        titulo: 'Sobre la brevedad de la vida',
        formas: ['sobre la brevedad de la vida'],
      }).success,
    ).toBe(true);
  });

  it.each([
    ['sin formas', { autor: 'seneca', titulo: 'X' }],
    ['formas vacías', { autor: 'seneca', titulo: 'X', formas: [] }],
    ['forma no canónica', { autor: 'seneca', titulo: 'X', formas: ['Sobre la vida'] }],
    ['forma repetida', { autor: 'seneca', titulo: 'X', formas: ['x', 'x'] }],
    ['título en blanco', { autor: 'seneca', titulo: '  ', formas: ['x'] }],
    ['autor que no es slug', { autor: 'Séneca', titulo: 'X', formas: ['x'] }],
    ['campo de una épica siguiente', { autor: 'seneca', titulo: 'X', formas: ['x'], nota: 'n' }],
  ])('rechaza %s', (_caso, datos) => {
    expect(obraAdmisible.safeParse(datos).success).toBe(false);
  });
});

describe('la identidad, el nombre y la grafía por omisión', () => {
  it('la forma es la de normalizar', () => {
    expect(formaDeObra('Respuesta a Sor Filotea…')).toBe('respuesta a sor filotea');
  });

  it('gana la grafía de más Citas y, en empate, la primera alfabética', () => {
    expect(
      grafiaPorOmision([
        { literal: 'Respuesta a sor Filotea de la Cruz', citas: 1 },
        { literal: 'Respuesta a Sor Filotea de la Cruz', citas: 20 },
      ]),
    ).toBe('Respuesta a Sor Filotea de la Cruz');
    expect(
      grafiaPorOmision([
        { literal: 'Sobre la vida', citas: 2 },
        { literal: 'sobre la vida', citas: 2 },
      ]),
    ).toBe('sobre la vida');
  });

  it('el nombre no se trunca', () => {
    const titulo = 'Ideas para presidir a la confección del curso de filosofía contemporánea';
    expect(nombreDeFichaDeObra('juan-bautista-alberdi', titulo)).toBe(
      'juan-bautista-alberdi--ideas-para-presidir-a-la-confeccion-del-curso-de-filosofia-contemporanea',
    );
  });

  it('una Cita resuelve la ficha de su Autor cuyas formas contienen su obra', () => {
    const fichas = [
      ficha('seneca--x', 'seneca', 'X', ['x']),
      ficha('horacio--x', 'horacio', 'X', ['x']),
    ];
    expect(fichaDeCita(cita('a', 'horacio', 'X.'), fichas)?.nombre).toBe('horacio--x');
    expect(fichaDeCita(cita('b', 'seneca'), fichas)).toBeUndefined();
  });

  it('informa grupos y prefijos', () => {
    const obras = obrasDeCitas([
      cita('a', 'unamuno', 'Del sentimiento trágico de la vida'),
      cita('b', 'unamuno', 'Del sentimiento trágico de la vida/I'),
      cita('c', 'sor', 'Respuesta a Sor Filotea'),
      cita('d', 'sor', 'Respuesta a sor Filotea'),
    ]);
    expect(obras.filter((o) => o.grafias.length > 1)).toHaveLength(1);
    expect(prefijosDeFormas(obras)).toEqual([
      {
        autor: 'unamuno',
        corta: 'del sentimiento tragico de la vida',
        larga: 'del sentimiento tragico de la vida i',
      },
    ]);
  });
});

describe('las puertas del build, puras', () => {
  const autores = ['seneca', 'horacio'];

  it('una Obra sin ficha rompe nombrando Obra, Autor y orden', () => {
    const fallos = fallosDeObras([], [cita('a', 'seneca', 'Sobre la brevedad de la vida')], autores);
    expect(fallos).toHaveLength(1);
    expect(fallos[0]).toContain('Sobre la brevedad de la vida');
    expect(fallos[0]).toContain('seneca');
    expect(fallos[0]).toContain('npm run obra -- sembrar');
  });

  it('una Cita sin obra no necesita ficha', () => {
    expect(fallosDeObras([], [cita('a', 'seneca')], autores)).toEqual([]);
  });

  it('una forma reclamada por dos fichas rompe nombrando las dos', () => {
    const fallos = fallosDeObras(
      [ficha('seneca--a', 'seneca', 'A', ['x']), ficha('seneca--b', 'seneca', 'B', ['x'])],
      [],
      autores,
    );
    expect(fallos).toHaveLength(1);
    expect(fallos[0]).toContain('corpus/obras/seneca--a.yml');
    expect(fallos[0]).toContain('corpus/obras/seneca--b.yml');
  });

  it('un prefijo que no es el Autor rompe', () => {
    const fallos = fallosDeObras([ficha('seneca--x', 'horacio', 'X', ['x'])], [], autores);
    expect(fallos.some((f) => f.includes('seneca--x') && f.includes('horacio'))).toBe(true);
  });

  it('un Autor que no existe rompe', () => {
    const fallos = fallosDeObras([ficha('ovidio--x', 'ovidio', 'X', ['x'])], [], autores);
    expect(fallos.some((f) => f.includes('ovidio') && f.includes('no existe'))).toBe(true);
  });

  it('una ficha sin Citas avisa y no rompe', () => {
    const fichas = [ficha('seneca--x', 'seneca', 'X', ['x'])];
    expect(fallosDeObras(fichas, [], autores)).toEqual([]);
    expect(avisosDeObras(fichas, [])).toHaveLength(1);
    expect(avisosDeObras(fichas, [cita('a', 'seneca', 'X')])).toEqual([]);
  });
});

// ─── Las órdenes, sobre un corpus temporal ───────────────────────────────────

const FUENTE = {
  id: 'wikisource-es',
  nombre: 'Wikisource en español',
  licencia: 'CC BY-SA 4.0',
  url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
};

function citaCompleta(slug: string, obra: string, autor = 'seneca') {
  return {
    texto: `Texto de la Cita ${slug}.`,
    autor,
    slug,
    procedencia: { obra, año: 49 },
    estadoDerechos: 'dominio-público',
    fuente: FUENTE,
  };
}

async function corpusTemporal(): Promise<Rutas> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-obras-'));
  temporales.push(raiz);
  const rutas = rutasDelCorpus(join(raiz, 'corpus'));
  for (const dir of [rutas.citas, rutas.autores, rutas.temas, rutas.revision, rutas.obras]) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(
    join(rutas.autores, 'seneca.yml'),
    'nombre: Séneca\nañoFallecimiento: 65\nsemblanza: Filósofo.\n',
    'utf8',
  );
  return rutas;
}

async function publicar(rutas: Rutas, datos: Record<string, unknown>) {
  await escribirCita(rutas.citas, String(datos.slug), datos);
}

describe('asegurarFichaDeObra', () => {
  it('crea la ficha con la grafía por omisión y una sola forma', async () => {
    const rutas = await corpusTemporal();
    const hecho = await asegurarFichaDeObra(rutas, {
      autor: 'seneca',
      obra: 'Sobre la brevedad de la vida',
      citasPublicadas: [
        { autor: 'seneca', procedencia: { obra: 'Sobre la brevedad de la vida' } },
        { autor: 'seneca', procedencia: { obra: 'Sobre la brevedad de la vida' } },
        { autor: 'seneca', procedencia: { obra: 'sobre la brevedad de la vida' } },
      ],
    });
    expect(hecho).toMatchObject({ ok: true, accion: 'creada' });
    const [leida] = await leerFichasDeObra(rutas);
    expect(leida).toMatchObject({
      nombre: 'seneca--sobre-la-brevedad-de-la-vida',
      autor: 'seneca',
      titulo: 'Sobre la brevedad de la vida',
      formas: ['sobre la brevedad de la vida'],
    });
  });

  it('no hace nada si la forma ya tiene ficha activa', async () => {
    const rutas = await corpusTemporal();
    const entrada = { autor: 'seneca', obra: 'X', citasPublicadas: [] };
    await asegurarFichaDeObra(rutas, entrada);
    const otra = await asegurarFichaDeObra(rutas, { ...entrada, obra: 'x.' });
    expect(otra).toMatchObject({ ok: true, accion: 'existente' });
    expect(await readdir(rutas.obras)).toHaveLength(1);
  });

  it('restaura la retirada en vez de crear otra', async () => {
    const rutas = await corpusTemporal();
    const entrada = { autor: 'seneca', obra: 'X', citasPublicadas: [] };
    const creada = await asegurarFichaDeObra(rutas, entrada);
    if (!creada.ok || creada.accion !== 'creada') throw new Error('no creó');
    await mover(creada.ruta, rutas.obrasRetiradas);

    const otra = await asegurarFichaDeObra(rutas, { ...entrada, obra: 'x' });
    expect(otra).toMatchObject({ ok: true, accion: 'restaurada' });
    expect(await readdir(rutas.obras)).toEqual(['seneca--x.yml']);
    expect(await readdir(rutas.obrasRetiradas)).toEqual([]);
  });

  it('una obra sin forma canónica no necesita ficha y no crea nada', async () => {
    const rutas = await corpusTemporal();
    for (const obra of ['…', '—']) {
      const hecho = await asegurarFichaDeObra(rutas, { autor: 'seneca', obra, citasPublicadas: [] });
      expect(hecho).toMatchObject({ ok: true, accion: 'existente' });
    }
    expect(await readdir(rutas.obras)).toEqual([]);
  });

  it('un título sin letras latinas se niega con un motivo claro', async () => {
    const rutas = await corpusTemporal();
    const hecho = await asegurarFichaDeObra(rutas, { autor: 'seneca', obra: 'Ἰλιάς', citasPublicadas: [] });
    expect(hecho.ok).toBe(false);
    if (!hecho.ok) expect(hecho.motivos.join('\n')).toContain('no deja ninguna letra');
    expect(await readdir(rutas.obras)).toEqual([]);
  });

  it('restaurar se niega si una de sus formas ya la reclama una ficha activa', async () => {
    const rutas = await corpusTemporal();
    await mkdir(rutas.obrasRetiradas, { recursive: true });
    await writeFile(
      join(rutas.obrasRetiradas, 'seneca--x.yml'),
      'autor: "seneca"\ntitulo: "X"\nformas:\n  - "x"\n  - "y"\n',
      'utf8',
    );
    await writeFile(
      join(rutas.obras, 'seneca--y.yml'),
      'autor: "seneca"\ntitulo: "Y"\nformas:\n  - "y"\n',
      'utf8',
    );

    const hecho = await asegurarFichaDeObra(rutas, { autor: 'seneca', obra: 'X', citasPublicadas: [] });
    expect(hecho.ok).toBe(false);
    if (!hecho.ok) expect(hecho.motivos.join('\n')).toContain('seneca--y.yml');
    expect(await readdir(rutas.obrasRetiradas)).toEqual(['seneca--x.yml']);
  });

  it('una ficha ilegible no lanza: devuelve el motivo', async () => {
    const rutas = await corpusTemporal();
    await writeFile(join(rutas.obras, 'seneca--rota.yml'), 'autor: [\n', 'utf8');
    const hecho = await asegurarFichaDeObra(rutas, { autor: 'seneca', obra: 'X', citasPublicadas: [] });
    expect(hecho.ok).toBe(false);
  });

  it('ante una colisión de nombre se niega y no sobrescribe', async () => {
    const rutas = await corpusTemporal();
    const ajena = 'autor: "seneca"\ntitulo: "X"\nformas:\n  - "otra forma"\n';
    await writeFile(join(rutas.obras, 'seneca--x.yml'), ajena, 'utf8');

    const hecho = await asegurarFichaDeObra(rutas, { autor: 'seneca', obra: 'X', citasPublicadas: [] });
    expect(hecho.ok).toBe(false);
    expect(await readFile(join(rutas.obras, 'seneca--x.yml'), 'utf8')).toBe(ajena);
  });
});

describe('sembrar', () => {
  it('crea las que faltan y es idempotente', async () => {
    const rutas = await corpusTemporal();
    await publicar(rutas, citaCompleta('seneca-a', 'Cartas a Lucilio'));
    await publicar(rutas, citaCompleta('seneca-b', 'Cartas a Lucilio'));
    await publicar(rutas, citaCompleta('seneca-c', 'De la ira'));

    const primera = await sembrarFichasDeObra(rutas);
    expect(primera.creadas).toHaveLength(2);
    expect(primera.fallos).toEqual([]);

    const segunda = await sembrarFichasDeObra(rutas);
    expect(segunda.creadas).toHaveLength(0);
    expect(segunda.existentes).toBe(2);
  });
});

describe('retirar una ficha', () => {
  it('se niega mientras una Cita publicada la resuelva, sin mover nada', async () => {
    const rutas = await corpusTemporal();
    await publicar(rutas, citaCompleta('seneca-a', 'X'));
    await sembrarFichasDeObra(rutas);

    const hecho = await retirarFichaDeObra(rutas, 'seneca--x', 'ya no');
    expect(hecho.ok).toBe(false);
    expect(existsSync(join(rutas.obras, 'seneca--x.yml'))).toBe(true);
  });

  it('se niega mientras una candidata la resuelva', async () => {
    const rutas = await corpusTemporal();
    await asegurarFichaDeObra(rutas, { autor: 'seneca', obra: 'X', citasPublicadas: [] });
    await escribirCita(rutas.revision, 'seneca-a', citaCompleta('seneca-a', 'X'));

    expect((await retirarFichaDeObra(rutas, 'seneca--x', 'ya no')).ok).toBe(false);
  });

  it('sin Citas que la resuelvan, la mueve a _obras-retiradas', async () => {
    const rutas = await corpusTemporal();
    await asegurarFichaDeObra(rutas, { autor: 'seneca', obra: 'X', citasPublicadas: [] });

    const hecho = await retirarFichaDeObra(rutas, 'seneca--x.yml', 'ya no');
    expect(hecho.ok).toBe(true);
    expect(await readdir(rutas.obrasRetiradas)).toEqual(['seneca--x.yml']);
  });

  it('una candidata ilegible bloquea, con su motivo', async () => {
    const rutas = await corpusTemporal();
    await asegurarFichaDeObra(rutas, { autor: 'seneca', obra: 'X', citasPublicadas: [] });
    await writeFile(join(rutas.revision, 'rota.md'), '---\ntexto: [\n---\n', 'utf8');

    const hecho = await retirarFichaDeObra(rutas, 'seneca--x', 'ya no');
    expect(hecho.ok).toBe(false);
    if (!hecho.ok) expect(hecho.motivos.join('\n')).toContain('rota.md');
    expect(existsSync(join(rutas.obras, 'seneca--x.yml'))).toBe(true);
  });

  it('una ficha que no existe se dice con claridad', async () => {
    const rutas = await corpusTemporal();
    const hecho = await retirarFichaDeObra(rutas, 'seneca--nada', 'ya no');
    expect(hecho.ok).toBe(false);
    if (!hecho.ok) expect(hecho.motivos[0]).toContain('No hay ninguna Ficha de Obra «seneca--nada»');
  });

  it('sin motivo no retira', async () => {
    const rutas = await corpusTemporal();
    await asegurarFichaDeObra(rutas, { autor: 'seneca', obra: 'X', citasPublicadas: [] });
    expect((await retirarFichaDeObra(rutas, 'seneca--x', '  ')).ok).toBe(false);
  });
});

describe('los enganches que publican', () => {
  it('aprobar crea la ficha con el título literal', async () => {
    const rutas = await corpusTemporal();
    await escribirCita(rutas.revision, 'seneca-a', citaCompleta('seneca-a', 'Sobre la brevedad de la vida'));

    const resultado = await aprobar(rutas, ['seneca-a']);
    expect(resultado.publicadas).toEqual(['seneca-a']);
    const [leida] = await leerFichasDeObra(rutas);
    expect(leida?.titulo).toBe('Sobre la brevedad de la vida');
  });

  it('aprobar no publica si la ficha choca con otra', async () => {
    const rutas = await corpusTemporal();
    await writeFile(
      join(rutas.obras, 'seneca--x.yml'),
      'autor: "seneca"\ntitulo: "X"\nformas:\n  - "otra"\n',
      'utf8',
    );
    await escribirCita(rutas.revision, 'seneca-a', citaCompleta('seneca-a', 'X'));

    const resultado = await aprobar(rutas, ['seneca-a']);
    expect(resultado.publicadas).toEqual([]);
    expect(resultado.rechazadasPorAdmision).toEqual([]);
    expect(resultado.rechazadasPorFicha.map((r) => r.slug)).toEqual(['seneca-a']);
    expect(await readdir(rutas.citas)).toEqual([]);
  });

  it('escribir una candidata en _revision no crea ficha, ni el alta en seco', async () => {
    const rutas = await corpusTemporal();
    // Sin Fuente: el alta la manda a revisión.
    await darDeAltaLote(
      [{ texto: 'Una Cita sin Fuente.', autor: 'seneca', procedencia: { obra: 'X', año: 49 } }],
      rutas,
    );
    await darDeAltaLote(
      [{ texto: 'Otra Cita.', autor: 'seneca', procedencia: { obra: 'Y', año: 49 }, fuente: FUENTE }],
      rutas,
      { seco: true },
    );
    expect(await readdir(rutas.obras)).toEqual([]);
  });

  it('el alta con colisión de ficha manda la Cita a revisión y no publica nada', async () => {
    const rutas = await corpusTemporal();
    await writeFile(
      join(rutas.obras, 'seneca--de-la-ira.yml'),
      'autor: "seneca"\ntitulo: "De la ira"\nformas:\n  - "otra"\n',
      'utf8',
    );
    const entrada = [
      { texto: 'Otra Cita.', autor: 'seneca', procedencia: { obra: 'De la ira', año: 49 }, fuente: FUENTE },
    ];

    // En seco ya avisa, igual que en real.
    const seco = await darDeAltaLote(entrada, rutas, { seco: true });
    expect(seco.publicadas).toHaveLength(0);
    expect(seco.enRevision[0]?.motivos.join('\n')).toContain('seneca--de-la-ira');

    const real = await darDeAltaLote(entrada, rutas);
    expect(real.publicadas).toHaveLength(0);
    expect(real.enRevision).toHaveLength(1);
    expect(await readdir(rutas.citas)).toEqual([]);
    expect(await readdir(rutas.obras)).toEqual(['seneca--de-la-ira.yml']);
  });

  it('el alta que publica crea la ficha', async () => {
    const rutas = await corpusTemporal();
    const informe = await darDeAltaLote(
      [{ texto: 'Otra Cita.', autor: 'seneca', procedencia: { obra: 'De la ira', año: 49 }, fuente: FUENTE }],
      rutas,
    );
    expect(informe.publicadas).toHaveLength(1);
    expect(await readdir(rutas.obras)).toEqual(['seneca--de-la-ira.yml']);
  });

  it('retirar un Autor cuenta también sus fichas retiradas', async () => {
    const rutas = await corpusTemporal();
    await asegurarFichaDeObra(rutas, { autor: 'seneca', obra: 'X', citasPublicadas: [] });
    await retirarFichaDeObra(rutas, 'seneca--x', 'prueba');

    const hecho = await retirarAutor(rutas, 'seneca', 'prueba');
    expect(hecho.ok).toBe(false);
    if (!hecho.ok) expect(hecho.motivos.join('\n')).toContain('seneca--x (retirada)');
  });

  it('retirar un Autor con fichas las cuenta entre los bloqueos', async () => {
    const rutas = await corpusTemporal();
    await asegurarFichaDeObra(rutas, { autor: 'seneca', obra: 'X', citasPublicadas: [] });

    const hecho = await retirarAutor(rutas, 'seneca', 'prueba');
    expect(hecho.ok).toBe(false);
    if (!hecho.ok) expect(hecho.motivos.join('\n')).toContain('seneca--x');
    expect(existsSync(join(rutas.autores, 'seneca.yml'))).toBe(true);
  });
});
