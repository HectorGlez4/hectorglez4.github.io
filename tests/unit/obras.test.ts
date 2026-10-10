import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { esquemaDeObra, obraAdmisible } from '../../src/lib/admision.ts';
import { TIENDA_DE_PRUEBA } from './ayuda/construir.js';
import { procedenciaCompuesta, textoParaCopiar } from '../../src/lib/atribucion.ts';
import type { Autor, Cita } from '../../src/lib/publicado.ts';
import {
  avisosDeAñosDeObras,
  avisosDeDistintaRancia,
  colgarObras,
  obraDeCita,
  resolverObras,
  avisosDeObras,
  avisosDePrefijo,
  clave,
  esGrafiaLiteral,
  fallosDeObras,
  tituloEfectivo,
  fichaDeCita,
  formaDeObra,
  grafiaPorOmision,
  nombreDeFichaDeObra,
  prefijosDeFormas,
  obrasDeCitas,
  dondeLeer,
  entradaComun,
  ROTULO_DE_FUENTE_SIN_NOMBRE,
  type CitaParaDondeLeer,
  type FichaDeObra,
} from '../../src/lib/obras.ts';
import {
  escribirCita,
  leerCitas,
  leerFichasDeObra,
  mover,
  rutasDelCorpus,
  type Rutas,
} from '../../tools/lib/corpus.ts';
import {
  asegurarFichaDeObra,
  citasConObra,
  restituirGrafia,
  retirarFichaDeObra,
  reunirFichas,
  sembrarFichasDeObra,
  separarFichas,
  titularFicha,
  ajustarTitulosDeObra,
} from '../../tools/lib/obras.ts';
import { componerDocumento } from '../../tools/lib/documento.ts';
import { aprobar } from '../../tools/lib/revision.ts';
import { darDeAltaLote } from '../../tools/alta.ts';
import { retirarAutor } from '../../tools/lib/gestion.ts';

/** Historia 22.1 — cada Obra tiene ficha antes de tener URL. */

const RAIZ_DEL_REPO = join(import.meta.dirname, '..', '..');

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

  it('admite una nota de 1 a 160 caracteres, medidos tras recortar, y no la recorta — 22.6', () => {
    // 160 puntos de código, aunque fuera del plano básico sean 320 unidades UTF-16.
    for (const nota of ['n', 'n'.repeat(160), `  ${'n'.repeat(160)}  `, '𝔫'.repeat(160)]) {
      const leida = obraAdmisible.safeParse({ autor: 'seneca', titulo: 'X', formas: ['x'], nota });
      expect(leida.success, nota).toBe(true);
      expect(leida.data?.nota).toBe(nota);
    }
  });

  it('admite distintaDe con formas canónicas de otras Obras', () => {
    expect(
      obraAdmisible.safeParse({ autor: 'seneca', titulo: 'X', formas: ['x'], distintaDe: ['x i'] })
        .success,
    ).toBe(true);
  });

  it.each([
    ['sin formas', { autor: 'seneca', titulo: 'X' }],
    ['formas vacías', { autor: 'seneca', titulo: 'X', formas: [] }],
    ['forma no canónica', { autor: 'seneca', titulo: 'X', formas: ['Sobre la vida'] }],
    ['forma repetida', { autor: 'seneca', titulo: 'X', formas: ['x', 'x'] }],
    ['título en blanco', { autor: 'seneca', titulo: '  ', formas: ['x'] }],
    ['autor que no es slug', { autor: 'Séneca', titulo: 'X', formas: ['x'] }],
    ['ediciones vacías', { autor: 'seneca', titulo: 'X', formas: ['x'], ediciones: [] }],
    ['nota vacía', { autor: 'seneca', titulo: 'X', formas: ['x'], nota: '' }],
    ['nota en blanco', { autor: 'seneca', titulo: 'X', formas: ['x'], nota: '   ' }],
    ['nota de 161 caracteres', { autor: 'seneca', titulo: 'X', formas: ['x'], nota: 'n'.repeat(161) }],
    ['nota que no es cadena', { autor: 'seneca', titulo: 'X', formas: ['x'], nota: 3 }],
    ['nota de 161 puntos de código', { autor: 'seneca', titulo: 'X', formas: ['x'], nota: '𝔫'.repeat(161) }],
    ['nota con salto de línea', { autor: 'seneca', titulo: 'X', formas: ['x'], nota: 'Una línea.\nY otra.' }],
    ['nota con un carácter de control', { autor: 'seneca', titulo: 'X', formas: ['x'], nota: 'Una\tnota.' }],
    ['distintaDe vacío', { autor: 'seneca', titulo: 'X', formas: ['x'], distintaDe: [] }],
    ['distintaDe no canónico', { autor: 'seneca', titulo: 'X', formas: ['x'], distintaDe: ['Y'] }],
    ['distintaDe de su propia forma', { autor: 'seneca', titulo: 'X', formas: ['x'], distintaDe: ['x'] }],
  ])('rechaza %s', (_caso, datos) => {
    expect(obraAdmisible.safeParse(datos).success).toBe(false);
  });

  it('una clave desconocida la rechaza `.strict()`, y el mensaje nombra los campos', () => {
    const r = obraAdmisible.safeParse({ autor: 'seneca', titulo: 'X', formas: ['x'], sinopsis: 'Y' });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.message).join()).toContain(
      'no reconoce «sinopsis». Sus campos son autor, titulo, formas, distintaDe, nota y ediciones.',
    );
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

// ─── Historia 22.2 — una obra, un nombre ─────────────────────────────────────

function citaEn(slug: string, autor: string, obra: string) {
  return { slug, autor, procedencia: { obra }, ruta: `corpus/citas/${slug}.md` };
}

describe('22.2 — la regla de literalidad', () => {
  it('literal es igual a una cabecera colapsando espacios, y nada más', () => {
    expect(esGrafiaLiteral('Respuesta a  Sor Filotea', ['Respuesta a Sor Filotea'])).toBe(true);
    expect(esGrafiaLiteral('Respuesta a sor Filotea', ['Respuesta a Sor Filotea'])).toBe(false);
    expect(esGrafiaLiteral('Respuesta a Sor Filotea', ['Otra página', 'Respuesta a Sor Filotea'])).toBe(true);
    expect(esGrafiaLiteral('Respuesta a Sor Filotea', [])).toBe(false);
  });
});

describe('22.2 — la puerta ortográfica, pura', () => {
  const autores = ['sor-juana'];
  const fichas = [ficha('sor-juana--respuesta', 'sor-juana', 'Respuesta a Sor Filotea', ['respuesta a sor filotea'])];

  it('un grupo con una grafía sin documento rompe, nombra fichero, grafías y forma, y da restituir-grafia', () => {
    const citas = [
      citaEn('sor-juana-a', 'sor-juana', 'Respuesta a Sor Filotea'),
      citaEn('sor-juana-b', 'sor-juana', 'Respuesta a sor Filotea'),
    ];
    const fallos = fallosDeObras(fichas, citas, autores, {
      cabecerasDeCita: new Map([['sor-juana-a', ['Respuesta a Sor Filotea']]]),
      formasConDocumento: new Set([clave('sor-juana', 'respuesta a sor filotea')]),
      censo: new Set(['sor-juana-b']),
    });
    expect(fallos).toHaveLength(1);
    expect(fallos[0]).toContain('corpus/citas/sor-juana-b.md');
    expect(fallos[0]).not.toContain('corpus/citas/sor-juana-a.md');
    expect(fallos[0]).toContain('«Respuesta a Sor Filotea» ×1');
    expect(fallos[0]).toContain('«Respuesta a sor Filotea» ×1');
    expect(fallos[0]).toContain('respuesta a sor filotea');
    expect(fallos[0]).toContain('npm run obra -- restituir-grafia sor-juana-b');
  });

  it.each([
    ['la Cita no está en el censo', clave('sor-juana', 'respuesta a sor filotea'), new Set<string>()],
    ['el documento es de otro Autor', clave('otro-autor', 'respuesta a sor filotea'), new Set(['sor-juana-b'])],
  ])('da documentar, y no restituir-grafia, cuando %s', (_caso, documentado, censo) => {
    const citas = [
      citaEn('sor-juana-a', 'sor-juana', 'Respuesta a Sor Filotea'),
      citaEn('sor-juana-b', 'sor-juana', 'Respuesta a sor Filotea'),
    ];
    const fallos = fallosDeObras(fichas, citas, autores, {
      cabecerasDeCita: new Map([['sor-juana-a', ['Respuesta a Sor Filotea']]]),
      formasConDocumento: new Set([documentado]),
      censo,
    });
    expect(fallos).toHaveLength(1);
    expect(fallos[0]).toContain('npm run documentar -- sor-juana-b');
    expect(fallos[0]).not.toContain('restituir-grafia');
  });

  it('sin documento de la Obra, da documentar', () => {
    const citas = [
      citaEn('sor-juana-a', 'sor-juana', 'Respuesta a Sor Filotea'),
      citaEn('sor-juana-b', 'sor-juana', 'Respuesta a sor Filotea'),
    ];
    const fallos = fallosDeObras(fichas, citas, autores);
    expect(fallos).toHaveLength(1);
    expect(fallos[0]).toContain('npm run documentar -- sor-juana-a');
    expect(fallos[0]).toContain('npm run documentar -- sor-juana-b');
    expect(fallos[0]).not.toContain('restituir-grafia');
  });

  it('un grupo con todas las grafías literales no rompe', () => {
    const citas = [
      citaEn('sor-juana-a', 'sor-juana', 'Respuesta a Sor Filotea'),
      citaEn('sor-juana-b', 'sor-juana', 'Respuesta a sor Filotea'),
    ];
    expect(
      fallosDeObras(fichas, citas, autores, {
        cabecerasDeCita: new Map([
          ['sor-juana-a', ['Respuesta a Sor Filotea']],
          ['sor-juana-b', ['Respuesta a sor Filotea']],
        ]),
        formasConDocumento: new Set([clave('sor-juana', 'respuesta a sor filotea')]),
        censo: new Set(),
      }),
    ).toEqual([]);
  });

  it('una sola grafía sin documento no rompe', () => {
    expect(
      fallosDeObras(fichas, [citaEn('sor-juana-b', 'sor-juana', 'Respuesta a Sor Filotea')], autores),
    ).toEqual([]);
  });
});

describe('22.2 — los avisos de prefijo y de título', () => {
  const corta = ficha('antonio-machado--proverbios-y-cantares', 'antonio-machado', 'Proverbios y cantares', [
    'proverbios y cantares',
  ]);
  const larga = ficha(
    'antonio-machado--proverbios-y-cantares-nuevas-canciones',
    'antonio-machado',
    'Proverbios y cantares (Nuevas canciones)',
    ['proverbios y cantares nuevas canciones'],
  );

  it('dos formas en fichas distintas, una prefijo de palabra de la otra, avisan', () => {
    const avisos = avisosDePrefijo([corta, larga]);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('antonio-machado');
    expect(avisos[0]).toContain('npm run obra -- separar');
  });

  it('un prefijo que no es de palabra entera no avisa, ni uno de otro Autor', () => {
    const otra = ficha('antonio-machado--proverbiosa', 'antonio-machado', 'P', ['proverbios y cantaresx']);
    const ajena = ficha('miguel-de-unamuno--p', 'miguel-de-unamuno', 'P', ['proverbios y cantares i']);
    expect(avisosDePrefijo([corta, otra, ajena])).toEqual([]);
  });

  it('distintaDe en cualquiera de las dos lo calla', () => {
    expect(avisosDePrefijo([{ ...corta, distintaDe: ['proverbios y cantares nuevas canciones'] }, larga])).toEqual([]);
    expect(avisosDePrefijo([corta, { ...larga, distintaDe: ['proverbios y cantares'] }])).toEqual([]);
  });

  it('el aviso de prefijo da las dos órdenes exactas', () => {
    const [aviso] = avisosDePrefijo([corta, larga]);
    expect(aviso).toContain(`npm run obra -- reunir ${corta.nombre} ${larga.nombre}`);
    expect(aviso).toContain(`npm run obra -- separar ${corta.nombre} ${larga.nombre}`);
  });

  it('un distintaDe que no reclama ninguna ficha activa del Autor avisa de rancio', () => {
    const rancia = { ...corta, distintaDe: ['proverbios y cantares retirados'] };
    const avisos = avisosDeDistintaRancia([rancia, larga]);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('rancia');
    expect(avisos[0]).toContain('proverbios y cantares retirados');
    expect(avisosDeObras([rancia, larga], [])).toEqual(expect.arrayContaining([avisos[0]]));
    expect(avisosDeDistintaRancia([{ ...corta, distintaDe: ['proverbios y cantares nuevas canciones'] }, larga])).toEqual([]);
  });

  it('el título se compara colapsando espacios', () => {
    const f = ficha('seneca--x', 'seneca', 'Sobre  la vida', ['sobre la vida']);
    const citas = [citaEn('a', 'seneca', 'Sobre la vida')];
    expect(avisosDeObras([f], citas)).toEqual([]);
    expect(tituloEfectivo(f, [f], citas)).toBe('Sobre  la vida');
  });

  it('reunidas en una sola ficha, no avisa', () => {
    expect(avisosDePrefijo([{ ...corta, formas: [...corta.formas, ...larga.formas] }])).toEqual([]);
  });

  it('un título que ya no declara ninguna Cita avisa y cae a la grafía por omisión', () => {
    const f = ficha('seneca--x', 'seneca', 'Sobre la vida', ['sobre la vida']);
    const citas = [citaEn('a', 'seneca', 'sobre la vida'), citaEn('b', 'seneca', 'sobre la vida')];
    const avisos = avisosDeObras([f], citas);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('«Sobre la vida»');
    expect(avisos[0]).toContain('la grafía efectiva es «sobre la vida»');
    expect(tituloEfectivo(f, [f], citas)).toBe('sobre la vida');
    expect(tituloEfectivo(f, [f], [...citas, citaEn('c', 'seneca', 'Sobre la vida')])).toBe('Sobre la vida');
  });
});

describe('22.2 — restituir la grafía', () => {
  const SLUG = 'sor-juana-ines-de-la-cruz-yo-no-estudio-para-saber-mas-sino';
  const FICHERO = 'sor-juana-ines-de-la-cruz--yo-no-estudio-para-saber-mas-sino';
  const CABECERA = 'Respuesta a Sor Filotea de la Cruz';

  function documento(obra: string, autor: string | null = 'Sor Juana Inés de la Cruz') {
    return componerDocumento(
      {
        fuente: 'wikisource-es',
        obra,
        url: 'https://es.wikisource.org/wiki/Respuesta_a_sor_Filotea_de_la_Cruz',
        recuperado: '2026-08-21',
      },
      [obra, ...(autor === null ? [] : [`|autor=${autor}`])].join('\n'),
      'Cuerpo de la carta.',
    );
  }

  async function corpusDeSorJuana(opciones: { censada?: boolean; doc?: string | null; conFuente?: boolean } = {}) {
    const rutas = await corpusTemporal();
    await mkdir(rutas.fuentes, { recursive: true });
    await writeFile(
      join(rutas.autores, 'sor-juana-ines-de-la-cruz.yml'),
      'nombre: Sor Juana Inés de la Cruz\nañoFallecimiento: 1695\nsemblanza: Poeta novohispana.\n',
      'utf8',
    );
    await escribirCita(rutas.citas, FICHERO, {
      texto: 'Yo no estudio para saber más, sino para ignorar menos.',
      autor: 'sor-juana-ines-de-la-cruz',
      slug: SLUG,
      procedencia: { obra: 'Respuesta a sor Filotea de la Cruz', año: 1691 },
      estadoDerechos: 'dominio-público',
      ...(opciones.conFuente
        ? { fuente: { ...FUENTE, url: 'https://es.wikisource.org/wiki/Respuesta_a_sor_Filotea_de_la_Cruz' } }
        : {}),
    });
    await writeFile(
      rutas.pendientesDeCotejo,
      `# Censo\ncitas:\n${opciones.censada === false ? '' : `  - ${SLUG}\n`}`,
      'utf8',
    );
    const doc = opciones.doc === undefined ? documento(CABECERA) : opciones.doc;
    if (doc !== null) {
      await writeFile(join(rutas.fuentes, 'wikisource-es--respuesta-a-sor-filotea-de-la-cruz.txt'), doc, 'utf8');
    }
    return rutas;
  }

  const rutaDeLaCita = (rutas: Rutas) => join(rutas.citas, `${FICHERO}.md`);

  it('iguala la obra a la cabecera, la deja en el censo y no toca nada más', async () => {
    const rutas = await corpusDeSorJuana();
    const antes = await readFile(rutaDeLaCita(rutas), 'utf8');
    const censoAntes = await readFile(rutas.pendientesDeCotejo, 'utf8');

    const hecho = await restituirGrafia(rutas, SLUG);
    expect(hecho.ok, hecho.ok ? '' : hecho.motivos.join('\n')).toBe(true);

    const despues = await readFile(rutaDeLaCita(rutas), 'utf8');
    expect(despues).toBe(antes.replace('"Respuesta a sor Filotea de la Cruz"', `"${CABECERA}"`));
    expect(despues).not.toBe(antes);
    expect(await readFile(rutas.pendientesDeCotejo, 'utf8')).toBe(censoAntes);
  });

  it('pone al día el título que solo sostenía la grafía vieja, y lo dice', async () => {
    const rutas = await corpusDeSorJuana();
    await writeFile(
      join(rutas.obras, 'sor-juana-ines-de-la-cruz--respuesta-a-sor-filotea-de-la-cruz.yml'),
      'autor: "sor-juana-ines-de-la-cruz"\ntitulo: "Respuesta a sor Filotea de la Cruz"\n' +
        'formas:\n  - "respuesta a sor filotea de la cruz"\n',
      'utf8',
    );
    const hecho = await restituirGrafia(rutas, SLUG);
    expect(hecho.ok, hecho.ok ? '' : hecho.motivos.join('\n')).toBe(true);
    if (hecho.ok) expect(hecho.mensaje).toContain(`a «${CABECERA}», la grafía por omisión`);
    const [leida] = await leerFichasDeObra(rutas);
    expect(leida.titulo).toBe(CABECERA);
  });

  it.each([
    ['ya tiene documento y no está en el censo', { censada: false, conFuente: true }, 'no está en el censo'],
    ['no hay documento equivalente', { doc: null }, 'No hay ningún documento'],
    ['el documento es de otro Autor', { doc: documento(CABECERA, 'Manuel González Prada') }, 'González Prada'],
    ['el documento ya escribe igual', { doc: documento('Respuesta a sor Filotea de la Cruz') }, 'nada que restituir'],
  ])('se niega cuando %s, sin escribir nada', async (_caso, opciones, dicho) => {
    const rutas = await corpusDeSorJuana(opciones);
    const antes = await readFile(rutaDeLaCita(rutas), 'utf8');
    const hecho = await restituirGrafia(rutas, SLUG);
    expect(hecho.ok).toBe(false);
    if (!hecho.ok) expect(hecho.motivos.join('\n')).toContain(dicho);
    expect(await readFile(rutaDeLaCita(rutas), 'utf8')).toBe(antes);
  });
});

describe('22.2 — reunir, separar y titular', () => {
  async function dosFichasDeSeneca() {
    const rutas = await corpusTemporal();
    await publicar(rutas, citaCompleta('seneca-a', 'De la brevedad de la vida'));
    await publicar(rutas, citaCompleta('seneca-b', 'De la brevedad de la vida'));
    await publicar(rutas, citaCompleta('seneca-c', 'Sobre la brevedad de la vida'));
    await sembrarFichasDeObra(rutas);
    return rutas;
  }

  it('reunir une las formas, retira la absorbida, no toca las Citas y avisa del 404', async () => {
    const rutas = await dosFichasDeSeneca();
    const citasAntes = await Promise.all((await readdir(rutas.citas)).map((f) => readFile(join(rutas.citas, f), 'utf8')));

    const hecho = await reunirFichas(rutas, 'seneca--de-la-brevedad-de-la-vida', 'seneca--sobre-la-brevedad-de-la-vida');
    expect(hecho.ok, hecho.ok ? '' : hecho.motivos.join('\n')).toBe(true);
    if (hecho.ok) {
      expect(hecho.mensaje).toContain('404');
      expect(hecho.mensaje).toContain('reunida en seneca--de-la-brevedad-de-la-vida');
    }

    const fichas = await leerFichasDeObra(rutas);
    expect(fichas).toHaveLength(1);
    expect(fichas[0]).toMatchObject({
      titulo: 'De la brevedad de la vida',
      formas: ['de la brevedad de la vida', 'sobre la brevedad de la vida'],
    });
    expect(await readdir(rutas.obrasRetiradas)).toEqual(['seneca--sobre-la-brevedad-de-la-vida.yml']);
    const citasDespues = await Promise.all((await readdir(rutas.citas)).map((f) => readFile(join(rutas.citas, f), 'utf8')));
    expect(citasDespues).toEqual(citasAntes);
    expect(fallosDeObras(fichas, await leerCitas(rutas.citas), ['seneca'])).toEqual([]);
  });

  it('reunir fichas de Autores distintos se niega sin escribir nada', async () => {
    const rutas = await dosFichasDeSeneca();
    await writeFile(
      join(rutas.autores, 'horacio.yml'),
      'nombre: Horacio\nañoFallecimiento: -8\nsemblanza: Poeta latino.\n',
      'utf8',
    );
    await publicar(rutas, citaCompleta('horacio-a', 'Odas', 'horacio'));
    await sembrarFichasDeObra(rutas);
    const antes = await readFile(join(rutas.obras, 'seneca--de-la-brevedad-de-la-vida.yml'), 'utf8');

    const hecho = await reunirFichas(rutas, 'seneca--de-la-brevedad-de-la-vida', 'horacio--odas');
    expect(hecho.ok).toBe(false);
    expect(await readFile(join(rutas.obras, 'seneca--de-la-brevedad-de-la-vida.yml'), 'utf8')).toBe(antes);
    expect(existsSync(join(rutas.obras, 'horacio--odas.yml'))).toBe(true);
  });

  it('separar declara a cada una distinta de la otra y es idempotente', async () => {
    const rutas = await dosFichasDeSeneca();
    const hecho = await separarFichas(rutas, 'seneca--de-la-brevedad-de-la-vida', 'seneca--sobre-la-brevedad-de-la-vida');
    expect(hecho.ok, hecho.ok ? '' : hecho.motivos.join('\n')).toBe(true);
    const otra = await separarFichas(rutas, 'seneca--sobre-la-brevedad-de-la-vida', 'seneca--de-la-brevedad-de-la-vida');
    expect(otra.ok).toBe(true);

    const porNombre = new Map((await leerFichasDeObra(rutas)).map((f) => [f.nombre, f]));
    expect(porNombre.get('seneca--de-la-brevedad-de-la-vida')?.distintaDe).toEqual(['sobre la brevedad de la vida']);
    expect(porNombre.get('seneca--sobre-la-brevedad-de-la-vida')?.distintaDe).toEqual(['de la brevedad de la vida']);
  });

  it('reunir con colisión en _obras-retiradas se niega y deja las dos fichas como estaban', async () => {
    const rutas = await dosFichasDeSeneca();
    await mkdir(rutas.obrasRetiradas, { recursive: true });
    await writeFile(
      join(rutas.obrasRetiradas, 'seneca--sobre-la-brevedad-de-la-vida.yml'),
      'autor: "seneca"\ntitulo: "Otra"\nformas:\n  - "otra"\n',
      'utf8',
    );
    const destino = join(rutas.obras, 'seneca--de-la-brevedad-de-la-vida.yml');
    const antes = await readFile(destino, 'utf8');

    const hecho = await reunirFichas(rutas, 'seneca--de-la-brevedad-de-la-vida', 'seneca--sobre-la-brevedad-de-la-vida');
    expect(hecho.ok).toBe(false);
    if (!hecho.ok) expect(hecho.motivos.join('\n')).toContain('se ha dejado como estaba');
    expect(await readFile(destino, 'utf8')).toBe(antes);
    expect(existsSync(join(rutas.obras, 'seneca--sobre-la-brevedad-de-la-vida.yml'))).toBe(true);
    expect(await readdir(rutas.obras)).toHaveLength(2);
  });

  it('reunir y separar una ficha consigo misma, o separar entre Autores, se niegan', async () => {
    const rutas = await dosFichasDeSeneca();
    await writeFile(
      join(rutas.autores, 'horacio.yml'),
      'nombre: Horacio\nañoFallecimiento: -8\nsemblanza: Poeta latino.\n',
      'utf8',
    );
    await publicar(rutas, citaCompleta('horacio-a', 'Odas', 'horacio'));
    await sembrarFichasDeObra(rutas);
    const antes = await Promise.all((await readdir(rutas.obras)).map((f) => readFile(join(rutas.obras, f), 'utf8')));

    const misma = 'seneca--de-la-brevedad-de-la-vida';
    expect((await reunirFichas(rutas, misma, misma)).ok).toBe(false);
    expect((await separarFichas(rutas, misma, misma)).ok).toBe(false);
    expect((await separarFichas(rutas, misma, 'horacio--odas')).ok).toBe(false);
    const despues = await Promise.all((await readdir(rutas.obras)).map((f) => readFile(join(rutas.obras, f), 'utf8')));
    expect(despues).toEqual(antes);
  });

  it('reunir cuando la destino declaraba distinta a la absorbida: la declaración sale y se dice', async () => {
    const rutas = await dosFichasDeSeneca();
    await writeFile(
      join(rutas.obras, 'seneca--de-la-ira.yml'),
      'autor: "seneca"\ntitulo: "De la ira"\nformas:\n  - "de la ira"\n' +
        'distintaDe:\n  - "sobre la brevedad de la vida"\n',
      'utf8',
    );
    await separarFichas(rutas, 'seneca--de-la-brevedad-de-la-vida', 'seneca--sobre-la-brevedad-de-la-vida');
    // La absorbida trae además su propia declaración, que la reunida hereda.
    const absorbida = join(rutas.obras, 'seneca--sobre-la-brevedad-de-la-vida.yml');
    await writeFile(
      absorbida,
      (await readFile(absorbida, 'utf8')) + '  - "de la ira"\n',
      'utf8',
    );

    const hecho = await reunirFichas(rutas, 'seneca--de-la-brevedad-de-la-vida', 'seneca--sobre-la-brevedad-de-la-vida');
    expect(hecho.ok, hecho.ok ? '' : hecho.motivos.join('\n')).toBe(true);
    if (hecho.ok) {
      expect(hecho.mensaje).toContain('Deja de declararse distinta');
      expect(hecho.mensaje).toContain('Hereda de la absorbida su distintaDe: «de la ira»');
      // La tercera ficha que se declaraba distinta de la absorbida se nombra.
      expect(hecho.mensaje).toContain('seneca--de-la-ira.yml');
    }
    const reunida = (await leerFichasDeObra(rutas)).find((f) => f.nombre === 'seneca--de-la-brevedad-de-la-vida');
    expect(reunida?.formas).toEqual(['de la brevedad de la vida', 'sobre la brevedad de la vida']);
    expect(reunida?.distintaDe).toEqual(['de la ira']);
  });

  it('titular admite una grafía que declara una Cita publicada', async () => {
    const rutas = await corpusTemporal();
    await publicar(rutas, citaCompleta('seneca-a', 'De la brevedad de la vida'));
    await publicar(rutas, citaCompleta('seneca-b', 'De la brevedad de la vida'));
    await publicar(rutas, citaCompleta('seneca-c', 'De la Brevedad de la Vida'));
    await sembrarFichasDeObra(rutas);

    const hecho = await titularFicha(rutas, 'seneca--de-la-brevedad-de-la-vida', 'De la Brevedad de la Vida');
    expect(hecho.ok, hecho.ok ? '' : hecho.motivos.join('\n')).toBe(true);
    const [leida] = await leerFichasDeObra(rutas);
    expect(leida.titulo).toBe('De la Brevedad de la Vida');
    expect(leida.nombre).toBe('seneca--de-la-brevedad-de-la-vida');
  });

  it('titular rechaza una grafía inventada', async () => {
    const rutas = await dosFichasDeSeneca();
    const antes = await readFile(join(rutas.obras, 'seneca--de-la-brevedad-de-la-vida.yml'), 'utf8');
    const hecho = await titularFicha(rutas, 'seneca--de-la-brevedad-de-la-vida', 'Obras de Séneca');
    expect(hecho.ok).toBe(false);
    expect(await readFile(join(rutas.obras, 'seneca--de-la-brevedad-de-la-vida.yml'), 'utf8')).toBe(antes);
  });
});

describe('22.3 — la Obra resuelta, pura', () => {
  const DOS = ficha('larra--articulos', 'larra', 'Artículos', ['articulos', 'articulos de costumbres']);

  function citaConAño(
    slug: string,
    obra: string,
    extra: { año?: number; traduccion?: { traductor: string; año?: number }; fuente?: string; temas?: string[] } = {},
  ) {
    return {
      slug,
      autor: 'larra',
      temas: extra.temas ?? [],
      procedencia: {
        obra,
        ...(extra.año !== undefined ? { año: extra.año } : {}),
        ...(extra.traduccion !== undefined ? { traduccion: extra.traduccion } : {}),
      },
      ...(extra.fuente !== undefined ? { fuente: { id: extra.fuente } } : {}),
    };
  }

  it('reunida: las dos grafías resuelven la misma Obra, con el título de la ficha', () => {
    const citas = [citaConAño('a', 'Artículos'), citaConAño('b', 'Artículos de costumbres')];
    const obras = resolverObras(citas, [DOS]);
    expect(obraDeCita(citas[0], [DOS], obras)?.titulo).toBe('Artículos');
    expect(obraDeCita(citas[1], [DOS], obras)?.titulo).toBe('Artículos');
    expect(obras.get('larra--articulos')?.recuento).toBe(2);
  });

  it('el título sigue la regla de tituloEfectivo', () => {
    const otra = { ...DOS, titulo: 'Artículos varios' };
    const citas = [citaConAño('a', 'Artículos de costumbres'), citaConAño('b', 'Artículos de costumbres'), citaConAño('c', 'Artículos')];
    expect(resolverObras(citas, [otra]).get(otra.nombre)?.titulo).toBe(
      tituloEfectivo(otra, [otra], citas),
    );
    expect(resolverObras(citas, [otra]).get(otra.nombre)?.titulo).toBe('Artículos de costumbres');
  });

  it('año común: dos Citas con 1898 dan 1898', () => {
    const citas = [citaConAño('a', 'Artículos', { año: 1898 }), citaConAño('b', 'Artículos', { año: 1898 }), citaConAño('c', 'Artículos')];
    expect(resolverObras(citas, [DOS]).get(DOS.nombre)?.año).toBe(1898);
    expect(avisosDeAñosDeObras([DOS], citas)).toEqual([]);
  });

  it('años distintos: se omite el año y se avisa nombrando ficha y años', () => {
    const citas = [citaConAño('a', 'Artículos', { año: 1902 }), citaConAño('b', 'Artículos', { año: 1898 })];
    const obra = resolverObras(citas, [DOS]).get(DOS.nombre)!;
    expect(obra).not.toHaveProperty('año');
    const avisos = avisosDeAñosDeObras([DOS], citas);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('Obra con años discrepantes');
    expect(avisos[0]).toContain(DOS.ruta);
    expect(avisos[0]).toContain('1898, 1902');
  });

  it('traducción: el año de la traducción no aporta año a la Obra', () => {
    const citas = [citaConAño('a', 'Artículos', { traduccion: { traductor: 'Fulano', año: 1909 } })];
    expect(resolverObras(citas, [DOS]).get(DOS.nombre)).not.toHaveProperty('año');
    const mezcla = [...citas, citaConAño('b', 'Artículos', { año: 1835 })];
    expect(resolverObras(mezcla, [DOS]).get(DOS.nombre)?.año).toBe(1835);
    expect(avisosDeAñosDeObras([DOS], mezcla)).toEqual([]);
  });

  it('fuentes distintas, edición cotejada, temas unidos y recuento', () => {
    const citas = [
      citaConAño('a', 'Artículos', { fuente: 'wikisource', temas: ['el-tiempo', 'la-patria'] }),
      citaConAño('b', 'Artículos', { fuente: 'wikisource', temas: ['la-patria'] }),
      citaConAño('c', 'Artículos de costumbres', { fuente: 'cervantes', temas: ['el-amor'] }),
    ];
    const obra = resolverObras(citas, [DOS]).get(DOS.nombre)!;
    expect(obra.fuentes).toEqual(['cervantes', 'wikisource']);
    expect(obra.edicionCotejada).toBe(true);
    expect(obra.temas).toEqual(['el-amor', 'el-tiempo', 'la-patria']);
    expect(obra.recuento).toBe(3);

    const sin = resolverObras([citaConAño('d', 'Artículos')], [DOS]).get(DOS.nombre)!;
    expect(sin.edicionCotejada).toBe(false);
    expect(sin.fuentes).toEqual([]);
  });

  it('una ficha sin Citas resuelve con recuento 0 y su título', () => {
    const obra = resolverObras([], [DOS]).get(DOS.nombre)!;
    expect(obra).toMatchObject({ titulo: 'Artículos', recuento: 0, fuentes: [], temas: [] });
  });

  it('sin obra: la Cita no lleva el campo', () => {
    const [colgada] = colgarObras([{ slug: 'x', autor: 'larra', procedencia: { año: 1835 } }], [DOS]);
    expect(colgada).not.toHaveProperty('obra');
  });

  it('lo copiado lleva el año de esa Cita, no el de la Obra; sin año, sin año', () => {
    const AUTOR: Autor = { slug: 'larra', nombre: 'Mariano José de Larra', semblanza: 's', añoFallecimiento: 1837 };
    const base = (slug: string, obra: string, año?: number): Cita => ({
      slug,
      texto: 'Texto.',
      autor: 'larra',
      temas: [],
      procedencia: { obra, ...(año !== undefined ? { año } : {}) },
      aptaParaPortada: false,
    });
    const [conAño, otraConAño, sinAño] = colgarObras(
      [base('a', 'Artículos', 1835), base('b', 'Artículos de costumbres', 1835), base('c', 'Artículos de costumbres')],
      [DOS],
    );
    expect(conAño.obra?.año).toBe(1835);
    expect(textoParaCopiar(otraConAño, AUTOR)).toBe('«Texto.» — Mariano José de Larra, Artículos, 1835.');
    expect(textoParaCopiar(sinAño, AUTOR)).toBe('«Texto.» — Mariano José de Larra, Artículos.');
    expect(procedenciaCompuesta(sinAño)).toBe('Artículos');
  });
});

describe('22.3 — fuera de obras.ts y la admisión, nadie lee procedencia.obra', () => {
  const PERMITIDOS = new Set(['src/lib/obras.ts', 'src/lib/admision.ts']);
  const LEE = [
    // `cita.procedencia.obra`, `procedencia?.obra`, `procedencia['obra']`
    /procedencia\??\.obra\b/u,
    /procedencia\??\.?\[\s*['"`]obra['"`]\s*\]/u,
    // `const { obra, año } = cita.procedencia` y variantes con alias o valores por omisión
    // (también repartida en varias líneas: se mira el fichero entero)
    /\{[^{}]*\bobra\b[^{}]*\}\s*=\s*[^;{}]*procedencia/u,
    // `const { procedencia: { obra } } = cita` y `({ procedencia: { obra } }) => …`
    /procedencia\s*:\s*\{[^{}]*\bobra\b/u,
    // `cita.procedencia!.obra`
    /procedencia\s*!\s*\.\s*obra\b/u,
  ];

  async function ficheros(directorio: string): Promise<string[]> {
    const entradas = await readdir(join(RAIZ_DEL_REPO, directorio), { recursive: true, withFileTypes: true });
    return entradas
      .filter((e) => e.isFile() && /\.(ts|astro|js|mjs)$/u.test(e.name))
      .map((e) => {
        // `parentPath` desde Node 20.12/21.4; `path`, su nombre anterior, como respaldo.
        const padre =
          (e as { parentPath?: string }).parentPath ??
          (e as { path?: string }).path ??
          join(RAIZ_DEL_REPO, directorio);
        return join(padre, e.name).slice(RAIZ_DEL_REPO.length + 1).split('\\').join('/');
      });
  }

  it('la prueba detecta las tres formas', () => {
    expect(LEE.some((r) => r.test('const t = cita.procedencia.obra;'))).toBe(true);
    expect(LEE.some((r) => r.test("const t = cita.procedencia?.['obra'];"))).toBe(true);
    expect(LEE.some((r) => r.test('const { obra, año } = cita.procedencia;'))).toBe(true);
    expect(LEE.some((r) => r.test('const {\n  obra,\n  año,\n} = cita.procedencia;'))).toBe(true);
    expect(LEE.some((r) => r.test('const { procedencia: { obra } } = cita;'))).toBe(true);
    expect(LEE.some((r) => r.test('const f = ({ procedencia: { año, obra } }) => obra;'))).toBe(true);
    expect(LEE.some((r) => r.test('const t = cita.procedencia!.obra;'))).toBe(true);
    expect(LEE.some((r) => r.test('const titulo = cita.obra?.titulo;'))).toBe(false);
    expect(LEE.some((r) => r.test('const { año } = cita.procedencia;'))).toBe(false);
  });

  it('ningún fichero de src/ ni public/islas/ fuera de los permitidos', async () => {
    const todos = [...(await ficheros('src')), ...(await ficheros('public/islas'))];
    expect(todos).toContain('src/lib/obras.ts');
    const infractores: string[] = [];
    for (const ruta of todos) {
      if (PERMITIDOS.has(ruta)) continue;
      const contenido = await readFile(join(RAIZ_DEL_REPO, ruta), 'utf8');
      for (const regla of LEE) {
        const hallado = regla.exec(contenido);
        if (hallado === null) continue;
        const linea = contenido.slice(0, hallado.index).split('\n').length;
        infractores.push(`${ruta}:${linea}: ${hallado[0].replace(/\s+/gu, ' ')}`);
      }
    }
    expect(infractores).toEqual([]);
  });
});

describe('22.3 — citasConObra, del lado de tools/', () => {
  async function escribirFicha(rutas: Rutas, nombre: string, titulo: string, formas: string[]) {
    await writeFile(
      join(rutas.obras, `${nombre}.yml`),
      `autor: seneca\ntitulo: ${titulo}\nformas:\n${formas.map((f) => `  - ${f}`).join('\n')}\n`,
      'utf8',
    );
  }

  it('con ficha real reunida, cada Cita lleva el título de la ficha', async () => {
    const rutas = await corpusTemporal();
    await escribirFicha(rutas, 'seneca--de-la-brevedad-de-la-vida', 'De la brevedad de la vida', [
      'de la brevedad de la vida',
      'sobre la brevedad de la vida',
    ]);
    const hecho = await citasConObra(rutas, [
      citaCompleta('a', 'De la brevedad de la vida'),
      citaCompleta('b', 'Sobre la brevedad de la vida'),
    ]);
    expect(hecho.ok).toBe(true);
    if (!hecho.ok) return;
    expect(hecho.citas.map((c) => c.obra?.titulo)).toEqual([
      'De la brevedad de la vida',
      'De la brevedad de la vida',
    ]);
    expect(hecho.citas[0].obra?.nombre).toBe('seneca--de-la-brevedad-de-la-vida');
  });

  it('sin ficha, una provisional con la grafía por omisión, y sin escribir nada', async () => {
    const rutas = await corpusTemporal();
    const hecho = await citasConObra(rutas, [
      citaCompleta('a', 'Cartas a Lucilio'),
      citaCompleta('b', 'Cartas a Lucilio'),
      citaCompleta('c', 'cartas a Lucilio'),
    ]);
    expect(hecho.ok).toBe(true);
    if (!hecho.ok) return;
    expect(new Set(hecho.citas.map((c) => c.obra?.titulo))).toEqual(new Set(['Cartas a Lucilio']));
    expect(await readdir(rutas.obras)).toEqual([]);
  });

  it('una provisional nunca comparte nombre con una ficha real ni con otra provisional', async () => {
    const rutas = await corpusTemporal();
    // La ficha real se llama como `sembrar` llamaría a «De la ira», pero reclama otra forma.
    await escribirFicha(rutas, 'seneca--de-la-ira', 'De la ira I', ['de la ira i']);
    const hecho = await citasConObra(rutas, [
      citaCompleta('a', 'De la ira I'),
      citaCompleta('b', 'De la ira'),
      citaCompleta('c', 'De la clemencia'),
    ]);
    expect(hecho.ok).toBe(true);
    if (!hecho.ok) return;
    const [real, sinFicha, otra] = hecho.citas.map((c) => c.obra!);
    expect(real).toMatchObject({ nombre: 'seneca--de-la-ira', titulo: 'De la ira I', recuento: 1 });
    expect(sinFicha.titulo).toBe('De la ira');
    expect(otra.titulo).toBe('De la clemencia');
    expect(new Set([real.nombre, sinFicha.nombre, otra.nombre]).size).toBe(3);
  });

  it('con una ficha ilegible no lanza: devuelve el motivo', async () => {
    const rutas = await corpusTemporal();
    await writeFile(join(rutas.obras, 'seneca--rota.yml'), 'autor: [\n', 'utf8');
    const hecho = await citasConObra(rutas, [citaCompleta('a', 'De la ira')]);
    expect(hecho.ok).toBe(false);
    if (hecho.ok) return;
    expect(hecho.motivos.join('\n')).toContain('seneca--rota.yml');
  });
});

describe('22.3 — colgarObras no arrastra una Obra vieja', () => {
  it('quita el obra previo cuando ninguna ficha resuelve ya la Cita', () => {
    const DOS = ficha('larra--articulos', 'larra', 'Artículos', ['articulos']);
    const [colgada] = colgarObras([{ slug: 'a', autor: 'larra', procedencia: { obra: 'Artículos' } }], [DOS]);
    expect(colgada.obra?.titulo).toBe('Artículos');
    const [otraVez] = colgarObras([colgada], []);
    expect(otraVez).not.toHaveProperty('obra');
    expect(otraVez).toEqual({ slug: 'a', autor: 'larra', procedencia: { obra: 'Artículos' } });
  });
});

/*
 * Historia 22.6 — «Dónde leer esta obra», puro. Las filas de datos de la matriz; lo que se ve
 * construido está en `obra-pagina.test.ts`.
 */
describe('22.6 — dondeLeer, puro', () => {
  const WS = { id: 'wikisource-es', nombre: 'Wikisource en español', licencia: 'CC BY-SA 4.0' };
  const GB = { id: 'gutenberg', nombre: 'Project Gutenberg', licencia: 'dominio público' };
  const ws = (pagina: string, extra: Partial<CitaParaDondeLeer> = {}): CitaParaDondeLeer => ({
    fuente: { ...WS, url: `https://es.wikisource.org/wiki/${pagina}` },
    ...extra,
  });
  const traducida = (traductor: string, año?: number) => ({
    procedencia: { traduccion: { traductor, ...(año !== undefined ? { año } : {}) } },
  });

  it('un documento: una línea con el nombre, la licencia y el enlace a esa URL', () => {
    const r = dondeLeer([ws('Cartas'), ws('Cartas'), ws('Cartas')]);
    expect(r).toEqual({
      lineas: [
        {
          nombre: 'Wikisource en español',
          licencia: 'CC BY-SA 4.0',
          paginas: 1,
          enlace: 'https://es.wikisource.org/wiki/Cartas',
          citas: 3,
        },
      ],
      citasSinDocumento: 0,
      total: 3,
    });
  });

  it('repartida: cuenta las páginas y enlaza a la entrada de la obra', () => {
    const citas = Array.from({ length: 12 }, (_, i) => ws(`Or%C3%A1culo_manual_y_arte_de_prudencia/${i + 1}`));
    const [linea] = dondeLeer(citas).lineas;
    expect(linea.paginas).toBe(12);
    expect(linea.enlace).toBe('https://es.wikisource.org/wiki/Or%C3%A1culo_manual_y_arte_de_prudencia');
  });

  it('la misma página escrita con y sin codificar cuenta una vez', () => {
    const [linea] = dondeLeer([ws('Ariel/Capítulo_II'), ws('Ariel/Cap%C3%ADtulo_II')]).lineas;
    expect(linea.paginas).toBe(1);
    expect(linea.enlace).toBe('https://es.wikisource.org/wiki/Ariel/Cap%C3%ADtulo_II');
  });

  it('sin entrada que la Fuente garantice, la línea va sin enlace', () => {
    // Dos anfitriones.
    const dosAnfitriones = dondeLeer([
      { fuente: { ...WS, url: 'https://es.wikisource.org/wiki/Odas/1' } },
      { fuente: { ...WS, url: 'https://en.wikisource.org/wiki/Odas/2' } },
    ]).lineas[0];
    expect(dosAnfitriones.paginas).toBe(2);
    expect(dosAnfitriones).not.toHaveProperty('enlace');
    // Dos páginas de primer nivel: no hay `Padre` común.
    expect(dondeLeer([ws('Odas'), ws('Epodos')]).lineas[0]).not.toHaveProperty('enlace');
    // Gutenberg: un prefijo de dos tramos que no es ninguna página.
    expect(
      entradaComun([
        'https://www.gutenberg.org/cache/epub/66373/pg66373.txt',
        'https://www.gutenberg.org/cache/epub/2000/pg2000.txt',
      ]),
    ).toBeUndefined();
    expect(entradaComun(['https://a.org/libros/obra/1', 'https://a.org/libros/obra/2'])).toBeUndefined();
    expect(entradaComun(['https://es.wikisource.org/wiki/X?p=1', 'https://es.wikisource.org/wiki/X/2'])).toBeUndefined();
    // Las subpáginas de Wikisource, sí; también con la página padre entre ellas.
    expect(entradaComun(['https://es.wikisource.org/wiki/Obra', 'https://es.wikisource.org/wiki/Obra/2'])).toBe(
      'https://es.wikisource.org/wiki/Obra',
    );
  });

  it('la normalización: sin fragmento ni barra final, escapes en mayúsculas y la versión móvil', () => {
    const [linea] = dondeLeer([
      ws('Odas_%28Horacio%2c_Salinas_tr.%29/I'),
      ws('Odas_(Horacio,_Salinas_tr.)/I/'),
      ws('Odas_%28Horacio%2C_Salinas_tr.%29/I#Oda_3'),
      { fuente: { ...WS, url: 'https://es.m.wikisource.org/wiki/Odas_(Horacio,_Salinas_tr.)/II' } },
    ]).lineas;
    expect(linea.paginas).toBe(2);
    expect(linea.enlace).toBe('https://es.wikisource.org/wiki/Odas_(Horacio%2C_Salinas_tr.)');
  });

  it('nada se cae del recuento: sin nombre ni dirección legible, la línea va sin enlace y cuenta', () => {
    const r = dondeLeer([{ fuente: { id: 'gutenberg', url: 'no es una dirección' } }, {}]);
    expect(r.lineas).toEqual([{ nombre: 'gutenberg', paginas: 1, citas: 1 }]);
    expect(r.citasSinDocumento).toBe(1);
    const sinNada = dondeLeer([{ fuente: { id: '', url: 'tampoco' } }]);
    expect(sinNada.lineas.map((l) => l.nombre)).toEqual([ROTULO_DE_FUENTE_SIN_NOMBRE]);
    expect(sinNada.citasSinDocumento).toBe(0);
  });

  it('con nombres que discrepan no gana el primero: el rótulo sale sin nombre (el anfitrión)', () => {
    const [linea] = dondeLeer([
      ws('A'),
      { fuente: { ...WS, nombre: 'Wikisource', url: 'https://es.wikisource.org/wiki/A' } },
    ]).lineas;
    expect(linea.nombre).toBe('es.wikisource.org');
  });

  it('licencia y año de traducción: solo si todas las Citas los declaran y coinciden', () => {
    const sinLicencia = { fuente: { id: WS.id, nombre: WS.nombre, url: 'https://es.wikisource.org/wiki/A' } };
    expect(dondeLeer([ws('A'), sinLicencia]).lineas[0]).not.toHaveProperty('licencia');
    const años = dondeLeer([
      ws('Odas', traducida('Germán Salinas', 1909)),
      ws('Odas', traducida('Germán Salinas')),
    ]).lineas[0];
    expect(años.traduccion).toEqual({ traductor: 'Germán Salinas' });
  });

  it('dos Fuentes: la de más Citas primero y, a igualdad, por nombre', () => {
    const gb = (n: number): CitaParaDondeLeer => ({ fuente: { ...GB, url: `https://www.gutenberg.org/ebooks/${n}` } });
    const r = dondeLeer([gb(1), gb(1), ws('A'), ws('A'), ws('A'), ws('A'), ws('A')]);
    expect(r.lineas.map((l) => l.nombre)).toEqual(['Wikisource en español', 'Project Gutenberg']);
    const empate = dondeLeer([ws('A'), gb(1)]);
    expect(empate.lineas.map((l) => l.nombre)).toEqual(['Project Gutenberg', 'Wikisource en español']);
  });

  it('sin nombre de Fuente: el anfitrión, como la Línea de la Fuente; sin licencia, no la inventa', () => {
    const [linea] = dondeLeer([{ fuente: { id: 'gutenberg', url: 'https://www.gutenberg.org/ebooks/1' } }]).lineas;
    expect(linea.nombre).toBe('gutenberg.org');
    expect(linea).not.toHaveProperty('licencia');
  });

  it('traducción: el traductor y el año, si constan; dos traductores son dos líneas', () => {
    const una = dondeLeer([ws('Odas', traducida('Germán Salinas', 1909))]).lineas[0];
    expect(una.traduccion).toEqual({ traductor: 'Germán Salinas', año: 1909 });
    const sinAño = dondeLeer([ws('Odas', traducida('Germán Salinas'))]).lineas[0];
    expect(sinAño.traduccion).toEqual({ traductor: 'Germán Salinas' });
    const dos = dondeLeer([
      ws('Odas', traducida('Germán Salinas', 1909)),
      ws('Odas', traducida('Germán Salinas', 1909)),
      ws('Odas_Burgos', traducida('Javier de Burgos', 1844)),
    ]);
    expect(dos.lineas.map((l) => l.traduccion?.traductor)).toEqual(['Germán Salinas', 'Javier de Burgos']);
    expect(dos.lineas.map((l) => l.citas)).toEqual([2, 1]);
  });

  it('sin cotejo (c): ninguna línea, y todas sin documento', () => {
    expect(dondeLeer([{}, { fuente: null }, {}])).toEqual({ lineas: [], citasSinDocumento: 3, total: 3 });
  });

  it('parcial (d): las líneas y cuántas no tienen documento', () => {
    const r = dondeLeer([...Array.from({ length: 26 }, () => ws('Proverbios')), {}]);
    expect(r.lineas).toHaveLength(1);
    expect(r.citasSinDocumento).toBe(1);
    expect(r.total).toBe(27);
  });
});

describe('22.6 — la nota de la ficha: ninguna orden la escribe, y las que reescriben la conservan', () => {
  const NOTA = 'Trescientos aforismos comentados, publicados en Huesca en 1647.';

  it('aprobar con la ficha ya existente (aplicarFichaDeObra) la deja con su nota', async () => {
    const rutas = await corpusTemporal();
    await asegurarFichaDeObra(rutas, { autor: 'seneca', obra: 'X', citasPublicadas: [] });
    await conNota(rutas, 'seneca--x');
    const antes = await readFile(join(rutas.obras, 'seneca--x.yml'), 'utf8');
    await escribirCita(rutas.revision, 'seneca-a', citaCompleta('seneca-a', 'X'));

    expect((await aprobar(rutas, ['seneca-a'])).publicadas).toEqual(['seneca-a']);
    expect(await readFile(join(rutas.obras, 'seneca--x.yml'), 'utf8')).toBe(antes);
    expect((await leerFichasDeObra(rutas))[0]?.nota).toBe(NOTA);
  });

  it('retirar mueve la ficha con su nota, y aprobar la restaura con ella', async () => {
    const rutas = await corpusTemporal();
    await asegurarFichaDeObra(rutas, { autor: 'seneca', obra: 'X', citasPublicadas: [] });
    await conNota(rutas, 'seneca--x');
    expect((await retirarFichaDeObra(rutas, 'seneca--x', 'prueba')).ok).toBe(true);
    expect(await readFile(join(rutas.obrasRetiradas, 'seneca--x.yml'), 'utf8')).toContain(NOTA);

    await escribirCita(rutas.revision, 'seneca-a', citaCompleta('seneca-a', 'X'));
    expect((await aprobar(rutas, ['seneca-a'])).publicadas).toEqual(['seneca-a']);
    expect((await leerFichasDeObra(rutas))[0]?.nota).toBe(NOTA);
  });

  async function conNota(rutas: Rutas, nombre: string) {
    const ruta = join(rutas.obras, `${nombre}.yml`);
    await writeFile(ruta, `${await readFile(ruta, 'utf8')}nota: "${NOTA}"\n`, 'utf8');
  }

  it('sembrar no escribe nota', async () => {
    const rutas = await corpusTemporal();
    await publicar(rutas, citaCompleta('seneca-a', 'Cartas a Lucilio'));
    await sembrarFichasDeObra(rutas);
    const [ficha] = await leerFichasDeObra(rutas);
    expect(ficha).not.toHaveProperty('nota');
    expect(await readFile(ficha.ruta, 'utf8')).not.toContain('nota');
  });

  it('titular, separar y reunir conservan la nota de la ficha que queda', async () => {
    const rutas = await corpusTemporal();
    await publicar(rutas, citaCompleta('seneca-a', 'De la brevedad de la vida'));
    await publicar(rutas, citaCompleta('seneca-b', 'De la Brevedad de la Vida'));
    await publicar(rutas, citaCompleta('seneca-c', 'Sobre la brevedad de la vida'));
    await sembrarFichasDeObra(rutas);
    const destino = 'seneca--de-la-brevedad-de-la-vida';
    const absorbida = 'seneca--sobre-la-brevedad-de-la-vida';
    await conNota(rutas, destino);
    await conNota(rutas, absorbida);
    const notaDe = async (nombre: string) => (await leerFichasDeObra(rutas)).find((f) => f.nombre === nombre)?.nota;

    expect((await titularFicha(rutas, destino, 'De la Brevedad de la Vida')).ok).toBe(true);
    expect(await notaDe(destino)).toBe(NOTA);

    expect((await separarFichas(rutas, destino, absorbida)).ok).toBe(true);
    expect(await notaDe(destino)).toBe(NOTA);
    expect(await notaDe(absorbida)).toBe(NOTA);

    const hecho = await reunirFichas(rutas, destino, absorbida);
    expect(hecho.ok, hecho.ok ? '' : hecho.motivos.join('\n')).toBe(true);
    expect(await notaDe(destino)).toBe(NOTA);
    // La de la absorbida no se hereda: se queda en la retirada, y el parte lo dice.
    if (hecho.ok) expect(hecho.mensaje).toContain(`La nota de «${absorbida}» no pasa a la reunida`);
    expect(await readFile(join(rutas.obrasRetiradas, `${absorbida}.yml`), 'utf8')).toContain(NOTA);
  });

  /*
   * Historia 22.9 — lo mismo con las ediciones en venta. El esquema del sitio no admite ninguna
   * (TIENDAS vacío), así que las órdenes reciben el de una tienda inventada, como `edicion`.
   */
  const ESQUEMA = esquemaDeObra([{ ...TIENDA_DE_PRUEBA }]);
  const EDICIONES = [
    'ediciones:',
    `  - tienda: "${TIENDA_DE_PRUEBA.clave}"`,
    '    formato: "impresa"',
    `    url: "https://www.${TIENDA_DE_PRUEBA.dominio}/dp/X"`,
    '    descripcion: "Cátedra, 2015."',
    `  - tienda: "${TIENDA_DE_PRUEBA.clave}"`,
    '    formato: "electronica"',
    `    url: "https://${TIENDA_DE_PRUEBA.dominio}/e/Y?th=1"`,
    '',
  ].join('\n');
  const bloqueDeEdiciones = (yaml: string) => yaml.slice(yaml.indexOf('ediciones:'));

  async function conNotaYEdiciones(rutas: Rutas, nombre: string) {
    const ruta = join(rutas.obras, `${nombre}.yml`);
    await writeFile(ruta, `${await readFile(ruta, 'utf8')}nota: "${NOTA}"\n${EDICIONES}`, 'utf8');
  }

  it('titular, separar, reunir y el ajuste del título conservan nota y ediciones — 22.9', async () => {
    const rutas = await corpusTemporal();
    await publicar(rutas, citaCompleta('seneca-a', 'De la brevedad de la vida'));
    await publicar(rutas, citaCompleta('seneca-b', 'De la Brevedad de la Vida'));
    await publicar(rutas, citaCompleta('seneca-c', 'Sobre la brevedad de la vida'));
    await sembrarFichasDeObra(rutas);
    const destino = 'seneca--de-la-brevedad-de-la-vida';
    const absorbida = 'seneca--sobre-la-brevedad-de-la-vida';
    await conNotaYEdiciones(rutas, destino);
    await conNotaYEdiciones(rutas, absorbida);
    const yamlDe = (nombre: string) => readFile(join(rutas.obras, `${nombre}.yml`), 'utf8');
    const comprobar = async (nombre: string) => {
      const yaml = await yamlDe(nombre);
      expect(yaml).toContain(`nota: "${NOTA}"`);
      expect(bloqueDeEdiciones(yaml)).toBe(EDICIONES);
    };

    expect((await titularFicha(rutas, destino, 'De la Brevedad de la Vida', ESQUEMA)).ok).toBe(true);
    await comprobar(destino);

    expect((await separarFichas(rutas, destino, absorbida, ESQUEMA)).ok).toBe(true);
    await comprobar(destino);
    await comprobar(absorbida);

    // El ajuste del título (documentar, restituir-grafia): un título que ya no declara ninguna
    // Cita pasa a la grafía por omisión, y la ficha conserva lo demás.
    const ruta = join(rutas.obras, `${destino}.yml`);
    await writeFile(ruta, (await readFile(ruta, 'utf8')).replace(/^titulo: .*$/m, 'titulo: "Título viejo"'), 'utf8');
    const lineas = await ajustarTitulosDeObra(rutas, 'seneca', ['de la brevedad de la vida'], ESQUEMA);
    expect(lineas.join('\n')).toContain('Título viejo');
    expect(await yamlDe(destino)).not.toContain('Título viejo');
    await comprobar(destino);

    const hecho = await reunirFichas(rutas, destino, absorbida, ESQUEMA);
    expect(hecho.ok, hecho.ok ? '' : hecho.motivos.join('\n')).toBe(true);
    await comprobar(destino);
    if (hecho.ok) {
      expect(hecho.mensaje).toContain(`Las 2 ediciones en venta de «${absorbida}» no pasan a la reunida`);
    }
    expect(bloqueDeEdiciones(await readFile(join(rutas.obrasRetiradas, `${absorbida}.yml`), 'utf8'))).toBe(
      EDICIONES,
    );
  });
});
