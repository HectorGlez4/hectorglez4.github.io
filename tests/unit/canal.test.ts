import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import { rutasPublicadas } from '../../src/lib/publicado.ts';
import { MIN_CITAS_POR_COLECCION, MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';
import { DOMINIO } from '../../src/lib/dominio.ts';
import { rutaDeColeccion } from '../../src/lib/superficies.ts';
import {
  CABECERA_DE_PUBLICACIONES,
  CABECERA_DE_SENALES,
  FICHERO_DE_PUBLICACIONES,
  FICHERO_DE_SENALES,
  leerPublicacionesDeCanal,
  leerSenalesExternas,
  registrarPublicacionDeCanal,
  registrarSenalExterna,
  rutasDelCorpus,
} from '../../tools/lib/corpus.ts';
import { censoPorFamilia } from '../../tools/lib/indexacion.ts';
import {
  FORMATOS,
  cierreDe18_2,
  componerPublicacion,
  componerSenal,
  desplazarSemana,
  destinoDePublicacion,
  lineasDeCanal,
  lineasDeSenales,
  rachasPorRed,
  resumenDeSenales,
  resumenPorSemana,
  semanaIso,
  type PublicacionDeCanal,
  type SenalExterna,
  type TipoDeSenal,
  CODIGOS_DE_SENAL,
} from '../../tools/lib/canal.ts';
import { conjuntoDelCorpus } from '../../tools/indexacion.ts';
import { principal } from '../../tools/canal.ts';

const RAIZ = resolve(import.meta.dirname, '../..');

/**
 * Historia 21.3 — el registro de lo que se publica en el canal, entero.
 *
 * Recorre la matriz de la historia: las altas (con enlace, sin enlace, con la URL marcada,
 * con fecha), los rechazos con código 1, los de forma con código 2, la consulta por semana
 * ISO y red con el cierre de la 18.2, y que lo anterior no se reescribe nunca.
 */

const temporales: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const SLUG_DE_COLECCION = 'coleccion-de-prueba';

async function corpusConCitas(cuantas: number, { conColeccion = false } = {}): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-canal-'));
  temporales.push(raiz);
  const corpus = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', 'colecciones']) {
    await mkdir(join(corpus, dir), { recursive: true });
  }
  await writeFile(
    join(corpus, 'autores', 'autor-0.yml'),
    'nombre: "Autor Cero"\nañoFallecimiento: 65\nsemblanza: "Semblanza de prueba."\ntradicion: "peninsular"\n',
    'utf8',
  );
  await writeFile(join(corpus, 'temas', 'la-vida.yml'), 'nombre: "La vida"\n', 'utf8');
  for (let i = 0; i < cuantas; i += 1) {
    await writeFile(
      join(corpus, 'citas', `cita-${i}.md`),
      [
        '---',
        `slug: "cita-${i}"`,
        `texto: "Texto de prueba número ${i}."`,
        'autor: "autor-0"',
        'temas:',
        '  - la-vida',
        '---',
        '',
      ].join('\n'),
      'utf8',
    );
  }
  if (conColeccion) {
    await writeFile(
      join(corpus, 'colecciones', `${SLUG_DE_COLECCION}.yml`),
      [
        'nombre: "Colección de prueba"',
        'criterio: "Citas de prueba que alcanzan el umbral."',
        'miembros:',
        ...Array.from({ length: MIN_CITAS_POR_COLECCION }, (_, i) => `  - "cita-${i}"`),
        '',
      ].join('\n'),
      'utf8',
    );
  }
  return corpus;
}

function capturarSalida() {
  const salida: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((texto) => {
    salida.push(String(texto));
    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation((texto) => {
    salida.push(String(texto));
    return true;
  });
  return salida;
}

const HOY = '2026-10-10';
const AHORA = new Date(`${HOY}T12:00:00`);
const PUBLICADAS = ['/', '/cita/una-cita/', '/autor/autor-0/', '/tema/la-vida/'];

function componer(ruta: string, red = 'facebook', extra: { fecha?: string; formato?: string } = {}) {
  return componerPublicacion(
    { red, formato: extra.formato ?? 'foto', ruta, fecha: extra.fecha ?? HOY },
    { publicadas: PUBLICADAS, hoy: HOY },
  );
}

function motivosDe(salida: ReturnType<typeof componer>): string {
  expect(salida.ok).toBe(false);
  return salida.ok ? '' : salida.motivos.join('\n');
}

// ─── Componer ────────────────────────────────────────────────────────────────────────

describe('componer una publicación', () => {
  it('anota fecha, red, formato, ruta y si el enlace iba marcado', () => {
    expect(componer('/cita/una-cita/')).toEqual({
      ok: true,
      publicacion: { fecha: HOY, red: 'facebook', formato: 'foto', ruta: '/cita/una-cita/', marcado: false },
    });
  });

  it('la URL entera con la marca de la misma red: ruta del censo y marcado', () => {
    const salida = componer(`https://${DOMINIO}/cita/una-cita/?de=instagram#arriba`, 'instagram');
    expect(salida.ok && salida.publicacion).toMatchObject({ ruta: '/cita/una-cita/', marcado: true });
  });

  it('http:// y www. del dominio propio también son del sitio', () => {
    for (const url of [`http://${DOMINIO}/autor/autor-0/?de=x`, `https://www.${DOMINIO}/autor/autor-0?de=x`]) {
      const salida = componer(url, 'x');
      expect(salida.ok && salida.publicacion, url).toMatchObject({ ruta: '/autor/autor-0/', marcado: true });
    }
  });

  it('un enlace marcado para otra red se rechaza nombrándola', () => {
    expect(motivosDe(componer('/cita/una-cita/?de=tiktok', 'facebook'))).toMatch(
      /El enlace está marcado para «tiktok» y la publicación es de facebook/,
    );
  });

  it('«-» es una publicación sin enlace, y no lleva el campo marcado', () => {
    const salida = componer('-', 'tiktok', { formato: 'reel' });
    expect(salida.ok && salida.publicacion).toEqual({ fecha: HOY, red: 'tiktok', formato: 'reel', ruta: '-' });
  });

  it('la nota se guarda tal cual', () => {
    const salida = componerPublicacion(
      { red: 'x', formato: 'pieza', ruta: '-', fecha: HOY, nota: '  hilo de tres  ' },
      { publicadas: PUBLICADAS, hoy: HOY },
    );
    expect(salida.ok && salida.publicacion.nota).toBe('  hilo de tres  ');
  });

  it('una red fuera del conjunto se rechaza nombrando las válidas', () => {
    expect(motivosDe(componer('-', 'myspace'))).toMatch(/«myspace» no es una de las cuentas propias/);
  });

  it(`un formato fuera de ${FORMATOS.join(', ')} se rechaza`, () => {
    expect(motivosDe(componer('-', 'facebook', { formato: 'video' }))).toMatch(
      /«video» no es un formato del canal/,
    );
  });

  it('una ruta que el sitio no publica se rechaza, cada una con su motivo', () => {
    expect(motivosDe(componer('/cita/inexistente/'))).toMatch(/no la publica el sitio/);
    expect(motivosDe(componer('/buscar/'))).toMatch(/declara no publicable en src\/lib\/superficies\.ts/);
    expect(motivosDe(componer('/tema/la-vida/2/'))).toMatch(
      /la Página de Tema y el sitio la declara no publicable/,
    );
  });

  it('una URL de otro dominio se rechaza nombrándolo', () => {
    expect(motivosDe(componer('https://otro.example/cita/una-cita/'))).toMatch(/otro\.example/);
  });

  it('una fecha futura se rechaza: se anota lo publicado, no lo programado', () => {
    expect(motivosDe(componer('-', 'facebook', { fecha: '2026-10-11' }))).toMatch(/todavía no ha llegado/);
  });

  it('una fecha anterior a la primera jornada anotable se rechaza como errata del año', () => {
    expect(motivosDe(componer('-', 'facebook', { fecha: '2025-10-08' }))).toMatch(/errata del año/);
  });
});

// ─── Semana ISO, resumen y rachas ────────────────────────────────────────────────────

describe('la semana ISO', () => {
  it('da AAAA-Www con el año de la semana, no el del calendario', () => {
    expect(semanaIso('2026-10-05')).toBe('2026-W41'); // lunes
    expect(semanaIso('2026-10-11')).toBe('2026-W41'); // domingo
    expect(semanaIso('2026-10-12')).toBe('2026-W42');
    expect(semanaIso('2026-01-01')).toBe('2026-W01');
    // 2026 empieza en jueves y tiene 53 semanas: el 1 de enero de 2027 cae en la última.
    expect(semanaIso('2027-01-01')).toBe('2026-W53');
    expect(semanaIso('2024-12-30')).toBe('2025-W01');
  });

  it('se desplaza cruzando el cambio de año', () => {
    expect(desplazarSemana('2026-W53', 1)).toBe('2027-W01');
    expect(desplazarSemana('2027-W01', -1)).toBe('2026-W53');
    expect(desplazarSemana('2026-W41', -3)).toBe('2026-W38');
  });
});

/** Una foto marcada cada día de `dias` días seguidos desde `desde`. */
function fotosDiarias(desde: string, dias: number, red: 'facebook' | 'instagram' = 'facebook'): PublicacionDeCanal[] {
  return Array.from({ length: dias }, (_, i) => {
    const fecha = new Date(`${desde}T00:00:00Z`);
    fecha.setUTCDate(fecha.getUTCDate() + i);
    return { fecha: fecha.toISOString().slice(0, 10), red, formato: 'foto', ruta: '/', marcado: true };
  });
}

describe('el resumen por semana y red', () => {
  it('cuenta por semana ISO y red, con el desglose de a dónde enlaza', async () => {
    const conjunto = await conjuntoDelCorpus(rutasDelCorpus(await corpusConCitas(MIN_CITAS_POR_TEMA)));
    const censo = censoPorFamilia(conjunto);
    const publicaciones: PublicacionDeCanal[] = [
      { fecha: '2026-10-05', red: 'facebook', formato: 'foto', ruta: '/cita/cita-0/', marcado: true },
      { fecha: '2026-10-06', red: 'facebook', formato: 'foto', ruta: '/', marcado: false },
      { fecha: '2026-10-12', red: 'tiktok', formato: 'reel', ruta: '-' },
    ];

    const resumen = resumenPorSemana(publicaciones, censo, rutasPublicadas(conjunto));
    expect(resumen).toHaveLength(2);
    expect(resumen[0]).toMatchObject({
      semana: '2026-W41',
      red: 'facebook',
      publicaciones: 2,
      destinos: { cita: 1, portada: 1, autor: 0, coleccion: 0, otra: 0, yaNoSePublica: 0, sinEnlace: 0 },
      diasConFoto: 2,
      conEnlace: 2,
      marcadas: 1,
      todasMarcadas: false,
      cuentaPara18_2: false,
    });
    expect(resumen[1]).toMatchObject({ semana: '2026-W42', red: 'tiktok', destinos: { sinEnlace: 1 } });

    const lineas = lineasDeCanal(resumen, rachasPorRed(resumen, HOY)).join('\n');
    expect(lineas).toMatch(/2026-W41\n {2}facebook: 2 {2}\(Cita 1 · portada 1\) {2}foto 2\/7 días · marcadas 1\/2/);
    expect(lineas).toMatch(/2026-W42\n {2}tiktok: 1 {2}\(sin enlace 1\)/);
  });

  it('dentro de una semana, las redes van en el orden de src/lib/redes.ts y no en el de anotación', async () => {
    const censo = censoPorFamilia(await conjuntoDelCorpus(rutasDelCorpus(await corpusConCitas(1))));
    const resumen = resumenPorSemana(
      [
        { fecha: '2026-10-05', red: 'facebook', formato: 'foto', ruta: '-' },
        { fecha: '2026-10-06', red: 'instagram', formato: 'foto', ruta: '-' },
      ],
      censo,
      ['/'],
    );
    expect(resumen.map((f) => f.red)).toEqual(['instagram', 'facebook']);
  });

  it('los destinos: familia del censo, portada declarada, «otra» y «ya no se publica»', async () => {
    const conjunto = await conjuntoDelCorpus(
      rutasDelCorpus(await corpusConCitas(MIN_CITAS_POR_COLECCION, { conColeccion: true })),
    );
    const censo = censoPorFamilia(conjunto);
    const publicadas = rutasPublicadas(conjunto);
    expect(destinoDePublicacion('/cita/cita-0/', censo, publicadas)).toBe('cita');
    expect(destinoDePublicacion('/autor/autor-0/', censo, publicadas)).toBe('autor');
    expect(destinoDePublicacion(rutaDeColeccion(SLUG_DE_COLECCION), censo, publicadas)).toBe('coleccion');
    expect(destinoDePublicacion('/', censo, publicadas)).toBe('portada');
    expect(destinoDePublicacion('/tema/la-vida/', censo, publicadas)).toBe('otra');
    // Anotada cuando se publicaba; hoy el sitio ya no la publica.
    expect(destinoDePublicacion('/cita/retirada/', censo, publicadas)).toBe('yaNoSePublica');
    expect(destinoDePublicacion('-', censo, publicadas)).toBe('sinEnlace');
  });
});

describe('el cierre de la 18.2', () => {
  it('cuatro semanas ISO consecutivas con foto los 7 días y todo marcado la cierran', () => {
    // De 2026-W38 (lunes 14/09) a 2026-W41 (domingo 11/10).
    const publicaciones = fotosDiarias('2026-09-14', 28);
    const resumen = resumenPorSemana(publicaciones, { cita: [], autor: [], tema: [], coleccion: [] }, ['/']);
    expect(resumen.every((f) => f.diasConFoto === 7 && f.cuentaPara18_2)).toBe(true);

    // El lunes de la W42 todavía no rompe la racha: la semana en curso no puede tener 7 días.
    const rachas = rachasPorRed(resumen, '2026-10-12');
    expect(rachas).toEqual([{ red: 'facebook', actual: 4, maxima: 4 }]);
    expect(cierreDe18_2(rachas)).toEqual({ semanasNecesarias: 4, lleva: 4, red: 'facebook', cerrada: true });
    expect(lineasDeCanal(resumen, rachas).join('\n')).toMatch(/La 18\.2 se cierra con 4: lleva 4 \(facebook\)\./);

    // Pero si la W42 se queda sin cumplir y llega la W43, la racha actual es cero.
    expect(rachasPorRed(resumen, '2026-10-19')).toEqual([{ red: 'facebook', actual: 0, maxima: 4 }]);
  });

  it('un día sin foto o un enlace sin marcar corta la racha; la máxima la recuerda', () => {
    const publicaciones = [
      ...fotosDiarias('2026-09-14', 14), // W38 y W39, buenas
      ...fotosDiarias('2026-09-28', 6), // W40, le falta el domingo
      ...fotosDiarias('2026-10-05', 7), // W41, buena…
    ];
    // …salvo que en la W41 una publicación con enlace va sin marcar.
    publicaciones.push({ fecha: '2026-10-07', red: 'facebook', formato: 'reel', ruta: '/', marcado: false });
    const resumen = resumenPorSemana(publicaciones, { cita: [], autor: [], tema: [], coleccion: [] }, ['/']);
    expect(resumen.map((f) => f.cuentaPara18_2)).toEqual([true, true, false, false]);
    expect(rachasPorRed(resumen, '2026-10-12')).toEqual([{ red: 'facebook', actual: 0, maxima: 2 }]);
  });

  it('una semana con foto diaria pero sin ningún enlace no cuenta: no hay enlace que marcar', () => {
    const publicaciones = fotosDiarias('2026-10-05', 7).map((p) => {
      const { marcado: _, ...sinMarca } = p;
      return { ...sinMarca, ruta: '-' };
    });
    const [fila] = resumenPorSemana(publicaciones, { cita: [], autor: [], tema: [], coleccion: [] }, ['/']);
    expect(fila).toMatchObject({ diasConFoto: 7, conEnlace: 0, todasMarcadas: true, cuentaPara18_2: false });
  });
});

// ─── El registro en corpus/ ──────────────────────────────────────────────────────────

describe('el registro en corpus/', () => {
  it('la cabecera dice qué registra, por qué solo añade, de quién se distingue y qué cierra', () => {
    expect(CABECERA_DE_PUBLICACIONES).toMatch(/QUÉ REGISTRA\. Actos de publicación/);
    expect(CABECERA_DE_PUBLICACIONES).toMatch(/POR QUÉ SOLO AÑADE/);
    expect(CABECERA_DE_PUBLICACIONES).toMatch(/serie-de-indexacion\.yml/);
    expect(CABECERA_DE_PUBLICACIONES).toMatch(/peticiones-de-rastreo\.yml/);
    expect(CABECERA_DE_PUBLICACIONES).toMatch(/CUATRO\n# SEMANAS ISO SEGUIDAS/);
    expect(CABECERA_DE_PUBLICACIONES).toMatch(/AD-24/);
    expect(CABECERA_DE_PUBLICACIONES).toMatch(/npm run canal -- anotar/);
    expect(CABECERA_DE_PUBLICACIONES).toMatch(/instagram, tiktok, x, threads o facebook/);
    expect(CABECERA_DE_PUBLICACIONES).toMatch(/foto, reel, pieza o historia/);
    expect(CABECERA_DE_PUBLICACIONES).toMatch(/--fecha/);
    expect(CABECERA_DE_PUBLICACIONES).toMatch(/--nota/);
    expect(CABECERA_DE_PUBLICACIONES).toMatch(/EL CAMPO `marcado`/);
    expect(CABECERA_DE_PUBLICACIONES).toMatch(/CÓDIGOS DE SALIDA/);
  });

  it('el fichero versionado es la cabecera y la lista vacía', () => {
    const versionado = readFileSync(resolve(RAIZ, 'corpus', FICHERO_DE_PUBLICACIONES), 'utf8');
    expect(versionado).toBe(CABECERA_DE_PUBLICACIONES);
    expect(parsearYaml(versionado)).toEqual({ publicaciones: null });
  });

  it('es metadato del Corpus, no una colección', () => {
    const configuracion = readFileSync(resolve(RAIZ, 'src/content.config.ts'), 'utf8');
    expect(configuracion).not.toContain(FICHERO_DE_PUBLICACIONES);
  });

  it('crea el fichero con su cabecera si no existe', async () => {
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    await registrarPublicacionDeCanal(rutas, { fecha: HOY, red: 'x', formato: 'foto', ruta: '-' });
    const escrito = await readFile(rutas.publicacionesDeCanal, 'utf8');
    expect(escrito.startsWith(CABECERA_DE_PUBLICACIONES)).toBe(true);
    expect(escrito).toMatch(/ruta: "-"/);
    expect(escrito.slice(CABECERA_DE_PUBLICACIONES.length)).not.toMatch(/marcado/);
  });

  it('marcado: false y la nota se escriben, y se releen igual', async () => {
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    const publicacion: PublicacionDeCanal = {
      fecha: HOY,
      red: 'facebook',
      formato: 'foto',
      ruta: '/',
      marcado: false,
      nota: 'con «comillas» y: dos puntos',
    };
    await registrarPublicacionDeCanal(rutas, publicacion);
    expect(await readFile(rutas.publicacionesDeCanal, 'utf8')).toMatch(/marcado: false/);
    expect(await leerPublicacionesDeCanal(rutas)).toEqual([publicacion]);
  });

  it('no reescribe: con dos entradas y un alta, lo anterior queda byte a byte igual', async () => {
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    await registrarPublicacionDeCanal(rutas, { fecha: '2026-10-08', red: 'facebook', formato: 'foto', ruta: '/', marcado: true });
    await registrarPublicacionDeCanal(rutas, { fecha: '2026-10-09', red: 'tiktok', formato: 'reel', ruta: '-' });
    // Con un comentario a mano, que ningún serializador conservaría.
    const antes = `${await readFile(rutas.publicacionesDeCanal, 'utf8')}  # nota a mano\n`;
    await writeFile(rutas.publicacionesDeCanal, antes, 'utf8');

    await registrarPublicacionDeCanal(rutas, { fecha: HOY, red: 'instagram', formato: 'historia', ruta: '/', marcado: true });

    const despues = await readFile(rutas.publicacionesDeCanal, 'utf8');
    expect(despues.startsWith(antes)).toBe(true);
    expect((await leerPublicacionesDeCanal(rutas)).map((p) => p.fecha)).toEqual(['2026-10-08', '2026-10-09', HOY]);
    // Sin temporales a su paso.
    expect((await readdir(rutas.raiz)).filter((f) => f.endsWith('.nueva'))).toEqual([]);
  });

  it('un fichero sin salto de línea final recibe el suyo y sigue siendo una lista', async () => {
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    await registrarPublicacionDeCanal(rutas, { fecha: '2026-10-08', red: 'x', formato: 'foto', ruta: '-' });
    const sinSalto = (await readFile(rutas.publicacionesDeCanal, 'utf8')).replace(/\n+$/, '');
    await writeFile(rutas.publicacionesDeCanal, sinSalto, 'utf8');

    await registrarPublicacionDeCanal(rutas, { fecha: HOY, red: 'x', formato: 'foto', ruta: '-' });
    expect((await readFile(rutas.publicacionesDeCanal, 'utf8')).startsWith(`${sinSalto}\n`)).toBe(true);
    expect(await leerPublicacionesDeCanal(rutas)).toHaveLength(2);
  });

  it('un fichero ilegible, o con la lista seguida de otra clave, se niega sin tocarlo', async () => {
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    for (const roto of [
      '# sin la clave\n',
      'publicaciones: [\n',
      'publicaciones:\notra: 1\n',
      'publicaciones:\n  - fecha: "2026-10-08"\n    red: "x"\n    formato: "foto"\n    ruta: "-"\notra: 1\n',
    ]) {
      await writeFile(rutas.publicacionesDeCanal, roto, 'utf8');
      await expect(
        registrarPublicacionDeCanal(rutas, { fecha: HOY, red: 'x', formato: 'foto', ruta: '-' }),
        roto,
      ).rejects.toThrow(/publicaciones-de-canal\.yml/);
      expect(await readFile(rutas.publicacionesDeCanal, 'utf8')).toBe(roto);
    }
  });

  it('una entrada escrita a mano con un valor imposible se nombra al leer', async () => {
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    const casos: [string, RegExp][] = [
      ['fecha: "2026-02-31"\n    red: "x"\n    formato: "foto"\n    ruta: "-"', /entrada 1 .*«fecha: 2026-02-31»/],
      ['fecha: "2026-10-08"\n    red: "myspace"\n    formato: "foto"\n    ruta: "-"', /entrada 1 .*«red: myspace»/],
      ['fecha: "2026-10-08"\n    red: "x"\n    formato: "video"\n    ruta: "-"', /entrada 1 .*«formato: video»/],
      ['fecha: "2026-10-08"\n    red: "x"\n    formato: "foto"\n    ruta: "cita/x/"', /entrada 1 .*«ruta: cita\/x\/»/],
      ['fecha: "2026-10-08"\n    red: "x"\n    formato: "foto"\n    ruta: "/"\n    marcado: "sí"', /entrada 1 .*«marcado: sí»/],
    ];
    for (const [entrada, motivo] of casos) {
      await writeFile(rutas.publicacionesDeCanal, `publicaciones:\n  - ${entrada}\n`, 'utf8');
      await expect(leerPublicacionesDeCanal(rutas)).rejects.toThrow(motivo);
    }
  });
});

// ─── La orden ────────────────────────────────────────────────────────────────────────

describe('la orden', () => {
  it('anota con la fecha de hoy y sale con 0', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    expect(await principal(['--corpus', corpus, 'anotar', 'facebook', 'foto', '/cita/cita-0/'], AHORA)).toBe(0);
    expect(await leerPublicacionesDeCanal(rutasDelCorpus(corpus))).toEqual([
      { fecha: HOY, red: 'facebook', formato: 'foto', ruta: '/cita/cita-0/', marcado: false },
    ]);
  });

  it('anota sin enlace, con la URL marcada, con --fecha y con --nota', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    expect(await principal(['--corpus', corpus, 'anotar', 'tiktok', 'reel', '-'], AHORA)).toBe(0);
    expect(
      await principal(
        ['--corpus', corpus, 'anotar', 'instagram', 'foto', `https://${DOMINIO}/cita/cita-1/?de=instagram`],
        AHORA,
      ),
    ).toBe(0);
    expect(
      await principal(
        ['--corpus', corpus, 'anotar', 'x', 'pieza', '/', '--fecha', '2026-10-08', '--nota', 'hilo'],
        AHORA,
      ),
    ).toBe(0);

    expect(await leerPublicacionesDeCanal(rutasDelCorpus(corpus))).toEqual([
      { fecha: HOY, red: 'tiktok', formato: 'reel', ruta: '-' },
      { fecha: HOY, red: 'instagram', formato: 'foto', ruta: '/cita/cita-1/', marcado: true },
      { fecha: '2026-10-08', red: 'x', formato: 'pieza', ruta: '/', marcado: false, nota: 'hilo' },
    ]);
  });

  it('tras anotar enseña solo la semana en curso, no el historial', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    expect(
      await principal(['--corpus', corpus, 'anotar', 'tiktok', 'reel', '-', '--fecha', '2026-09-21'], AHORA),
    ).toBe(0);

    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus, 'anotar', 'facebook', 'foto', '/'], AHORA)).toBe(0);
    const texto = salida.join('');
    expect(texto).toMatch(/2026-W41\n {2}facebook: 1/);
    expect(texto).not.toMatch(/2026-W39/);
    expect(texto).toMatch(/La 18\.2 se cierra con 4: lleva 0\./);
  });

  it('el --json de anotar lleva la anotada, el registro, la semana y el cierre', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();
    expect(
      await principal(['--corpus', corpus, 'anotar', 'facebook', 'foto', '/?de=facebook', '--json'], AHORA),
    ).toBe(0);
    const leido = JSON.parse(salida.join(''));
    expect(leido.anotada).toEqual({ fecha: HOY, red: 'facebook', formato: 'foto', ruta: '/', marcado: true });
    expect(leido.registro).toBe(join(corpus, FICHERO_DE_PUBLICACIONES));
    expect(leido.porSemana).toHaveLength(1);
    expect(leido.porSemana[0]).toMatchObject({ semana: '2026-W41', red: 'facebook', diasConFoto: 1 });
    expect(leido.cierreDe18_2).toEqual({ semanasNecesarias: 4, lleva: 0, cerrada: false });
  });

  it.each([
    ['red ajena', ['anotar', 'myspace', 'foto', '-'], /no es una de las cuentas propias/],
    ['formato malo', ['anotar', 'facebook', 'video', '-'], /no es un formato del canal/],
    ['cita inexistente', ['anotar', 'facebook', 'foto', '/cita/inexistente/'], /no la publica el sitio/],
    ['búsqueda', ['anotar', 'facebook', 'foto', '/buscar/'], /no publicable/],
    ['listado paginado', ['anotar', 'facebook', 'foto', '/tema/la-vida/2/'], /la Página de Tema y el sitio la declara no publicable/],
    ['enlace marcado para otra red', ['anotar', 'facebook', 'foto', '/?de=instagram'], /marcado para «instagram»/],
    ['fecha futura', ['anotar', 'facebook', 'foto', '-', '--fecha', '2026-10-11'], /todavía no ha llegado/],
  ])('%s: código 1 y no escribe', async (_, argumentos, motivo) => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus, ...argumentos], AHORA)).toBe(1);
    expect(salida.join('')).toMatch(motivo);
    expect(existsSync(join(corpus, FICHERO_DE_PUBLICACIONES))).toBe(false);
  });

  it.each([
    ['bandera con errata', ['anotar', 'facebook', 'foto', '-', '--fecah', HOY], /no es una opción/],
    ['faltan argumentos', ['anotar', 'facebook', 'foto'], /necesita tres argumentos/],
    ['sobran argumentos', ['anotar', 'facebook', 'foto', '-', '/'], /toma tres argumentos/],
    ['--fecha sin forma de jornada', ['anotar', 'facebook', 'foto', '-', '--fecha', '08/10/2026'], /no es una fecha del calendario/],
    ['--fecha sin valor', ['anotar', 'facebook', 'foto', '-', '--fecha'], /necesita un valor/],
    ['--fecha repetida', ['anotar', 'facebook', 'foto', '-', '--fecha', '2026-10-08', '--fecha', HOY], /«--fecha» aparece más de una vez/],
    ['--nota vacía', ['anotar', 'facebook', 'foto', '-', '--nota', '  '], /«--nota» vacía/],
    ['suborden desconocida', ['publicar', 'facebook', 'foto', '-'], /no es una suborden/],
    ['--fecha en la consulta', ['--fecha', HOY], /«--fecha» y «--nota» son de «anotar» y de «senal».*la consulta no escribe nada/],
  ])('%s: código 2, uso, y no escribe', async (_, argumentos, motivo) => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus, ...argumentos], AHORA)).toBe(2);
    expect(salida.join('')).toMatch(motivo);
    expect(salida.join('')).toMatch(/npm run canal -- anotar/);
    expect(existsSync(join(corpus, FICHERO_DE_PUBLICACIONES))).toBe(false);
  });

  it('un Corpus que no se deja leer sale con 1 y un mensaje claro', async () => {
    const corpus = await corpusConCitas(1);
    await writeFile(join(corpus, 'citas', 'rota.md'), '---\nslug: [\n---\n', 'utf8');
    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus, 'anotar', 'x', 'foto', '-'], AHORA)).toBe(1);
    expect(salida.join('')).toMatch(/No se ha podido leer el Corpus/);
    expect(existsSync(join(corpus, FICHERO_DE_PUBLICACIONES))).toBe(false);
  });

  it('consulta: 3 entradas en 2 semanas, por semana y red, sin escribir', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    expect(
      await principal(['--corpus', corpus, 'anotar', 'facebook', 'foto', '/cita/cita-0/?de=facebook', '--fecha', '2026-10-05'], AHORA),
    ).toBe(0);
    expect(
      await principal(['--corpus', corpus, 'anotar', 'facebook', 'foto', '/autor/autor-0/', '--fecha', '2026-10-06'], AHORA),
    ).toBe(0);
    expect(
      await principal(['--corpus', corpus, 'anotar', 'tiktok', 'reel', '-', '--fecha', '2026-09-30'], AHORA),
    ).toBe(0);
    const fichero = join(corpus, FICHERO_DE_PUBLICACIONES);
    const antes = await readFile(fichero, 'utf8');

    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus], AHORA)).toBe(0);
    const texto = salida.join('');
    expect(texto).toMatch(/2026-W40\n {2}tiktok: 1 {2}\(sin enlace 1\) {2}foto 0\/7 días · marcadas 0\/0/);
    expect(texto).toMatch(/2026-W41\n {2}facebook: 2 {2}\(Cita 1 · Autor 1\) {2}foto 2\/7 días · marcadas 1\/2/);
    expect(texto).toMatch(/facebook: actual 0, máxima 0/);
    expect(texto).toMatch(/La 18\.2 se cierra con 4: lleva 0\./);
    expect(texto).toMatch(/Consulta: no se ha escrito nada\./);

    const json = capturarSalida();
    expect(await principal(['--corpus', corpus, '--json'], AHORA)).toBe(0);
    const leido = JSON.parse(json.join(''));
    expect(leido.publicaciones).toHaveLength(3);
    expect(leido.porSemana.map((f: { semana: string; red: string }) => `${f.semana} ${f.red}`)).toEqual([
      '2026-W40 tiktok',
      '2026-W41 facebook',
    ]);
    expect(leido.rachas).toEqual([
      { red: 'tiktok', actual: 0, maxima: 0 },
      { red: 'facebook', actual: 0, maxima: 0 },
    ]);
    expect(leido.cierreDe18_2).toMatchObject({ semanasNecesarias: 4, lleva: 0 });

    expect(await readFile(fichero, 'utf8')).toBe(antes);
  });

  it('la consulta sin registro no crea el fichero', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus], AHORA)).toBe(0);
    expect(salida.join('')).toMatch(/No hay ninguna publicación anotada/);
    expect(existsSync(join(corpus, FICHERO_DE_PUBLICACIONES))).toBe(false);
  });
});

// ─── Lo que el sitio no ve ───────────────────────────────────────────────────────────

describe('el aislamiento del sitio (AD-24)', () => {
  it('ningún módulo de src/ nombra el registro del canal', async () => {
    const ficheros = (await readdir(resolve(RAIZ, 'src'), { recursive: true })).filter((f) =>
      /\.(ts|astro|mjs|js)$/.test(String(f)),
    );
    for (const fichero of ficheros) {
      const contenido = readFileSync(resolve(RAIZ, 'src', String(fichero)), 'utf8');
      expect(contenido, String(fichero)).not.toContain(FICHERO_DE_PUBLICACIONES);
      expect(contenido, String(fichero)).not.toContain(FICHERO_DE_SENALES);
      expect(contenido, String(fichero)).not.toContain('tools/lib/canal');
    }
  });

  it('lo que se puede anotar sale del dueño único del conjunto publicable', async () => {
    const conjunto = await conjuntoDelCorpus(
      rutasDelCorpus(await corpusConCitas(MIN_CITAS_POR_COLECCION, { conColeccion: true })),
    );
    const publicadas = rutasPublicadas(conjunto);
    expect(publicadas).toContain(rutaDeColeccion(SLUG_DE_COLECCION));
    for (const ruta of publicadas) {
      expect(
        componerPublicacion({ red: 'facebook', formato: 'foto', ruta, fecha: HOY }, { publicadas, hoy: HOY }).ok,
        ruta,
      ).toBe(true);
    }
  });
});

// ─── Señales externas — Historia 21.4 ────────────────────────────────────────────────

function senal(
  origen: string,
  destino: string,
  extra: { tipo?: TipoDeSenal; fecha?: string; nota?: string; retira?: string; anteriores?: SenalExterna[] } = {},
) {
  return componerSenal(
    {
      origen,
      destino,
      tipo: extra.tipo ?? 'propia',
      fecha: extra.fecha ?? HOY,
      ...(extra.nota !== undefined ? { nota: extra.nota } : {}),
      ...(extra.retira !== undefined ? { retira: extra.retira } : {}),
    },
    { publicadas: PUBLICADAS, hoy: HOY, anteriores: extra.anteriores ?? [] },
  );
}

function motivosDeSenal(salida: ReturnType<typeof senal>): string {
  expect(salida.ok).toBe(false);
  return salida.ok ? '' : salida.motivos.join('\n');
}

describe('componer una señal externa', () => {
  it('propia: fecha, tipo, origen tal cual (sin espacios en los extremos) y destino del censo', () => {
    expect(senal('  https://www.tiktok.com/@x  ', '/')).toEqual({
      ok: true,
      senal: { fecha: HOY, tipo: 'propia', origen: 'https://www.tiktok.com/@x', destino: '/' },
    });
  });

  it('ajena con nota; la URL entera del destino se guarda como ruta, sin marca si no la llevaba', () => {
    const salida = senal('https://blog.ejemplo/post', `https://${DOMINIO}/cita/una-cita#arriba`, {
      tipo: 'ajena',
      nota: 'reseña',
    });
    expect(salida.ok && salida.senal).toEqual({
      fecha: HOY,
      tipo: 'ajena',
      origen: 'https://blog.ejemplo/post',
      destino: '/cita/una-cita/',
      nota: 'reseña',
    });
  });

  it('el destino con ?de=<red> lleva marcado: true; con una red que no existe se rechaza', () => {
    const salida = senal('https://linktr.ee/x', '/?de=tiktok');
    expect(salida.ok && salida.senal).toMatchObject({ destino: '/', marcado: true });
    expect(motivosDeSenal(senal('https://linktr.ee/x', '/?de=myspace'))).toMatch(/marcado para «myspace»/);
    expect(motivosDeSenal(senal('https://linktr.ee/x', '/?de=x&de=tiktok'))).toMatch(/más de una marca/);
  });

  it('un origen del dominio propio, de su www o de un subdominio no es externo', () => {
    for (const origen of [
      `https://${DOMINIO}/x`,
      `https://www.${DOMINIO}/`,
      `http://blog.${DOMINIO}/post`,
      `https://${DOMINIO.toUpperCase()}/`,
    ]) {
      expect(motivosDeSenal(senal(origen, '/')), origen).toMatch(/señal interna/);
    }
    // Un dominio que solo termina igual no es un subdominio.
    expect(senal(`https://otro${DOMINIO}/`, '/').ok).toBe(true);
  });

  it('un origen sin esquema, o con otro que no es http(s), se rechaza', () => {
    for (const origen of ['tiktok.com/@x', 'ftp://ejemplo.org/x', 'https://', '/cita/una-cita/']) {
      expect(motivosDeSenal(senal(origen, '/')), origen).toMatch(/no es una URL absoluta http\(s\)/);
    }
  });

  it('un destino que el sitio no publica, de otro dominio o «-» se rechaza', () => {
    expect(motivosDeSenal(senal('https://a.example/', '/buscar/'))).toMatch(/declara no publicable/);
    expect(motivosDeSenal(senal('https://a.example/', '/cita/inexistente/'))).toMatch(/no la publica el sitio/);
    expect(motivosDeSenal(senal('https://a.example/', 'https://otro.example/'))).toMatch(/otro\.example/);
    expect(motivosDeSenal(senal('https://a.example/', '-'))).toMatch(/no es un destino/);
  });

  it('una fecha futura se rechaza; una anterior al canal no, porque una bio puede ser de antes', () => {
    expect(motivosDeSenal(senal('https://a.example/', '/', { fecha: '2026-10-11' }))).toMatch(/todavía no ha llegado/);
    expect(senal('https://a.example/', '/', { fecha: '2023-07-16' }).ok).toBe(true);
    // El suelo de las publicaciones se mantiene.
    expect(motivosDe(componer('-', 'facebook', { fecha: '2025-10-08' }))).toMatch(/errata del año/);
  });

  it('el origen rechaza localhost, una IP, un host sin punto y una URL con credenciales', () => {
    for (const origen of [
      'http://localhost:4321/x',
      'https://app.localhost/',
      'http://127.0.0.1/',
      'http://[::1]/',
      'https://intranet/',
    ]) {
      expect(motivosDeSenal(senal(origen, '/')), origen).toMatch(/no es una página pública/);
    }
    for (const origen of ['https://yo:secreto@blog.ejemplo.org/', 'https://yo@blog.ejemplo.org/']) {
      expect(motivosDeSenal(senal(origen, '/')), origen).toMatch(/usuario o contraseña/);
    }
  });

  it('el dominio propio con punto final sigue siendo propio', () => {
    expect(motivosDeSenal(senal(`https://${DOMINIO}./x`, '/'))).toMatch(/señal interna/);
    expect(motivosDeSenal(senal(`https://www.${DOMINIO}./`, '/'))).toMatch(/señal interna/);
  });

  it('el destino se recorta, y ?de= solo cuenta en la consulta, nunca en el fragmento', () => {
    const recortado = senal('https://a.example/', '  /cita/una-cita/  ');
    expect(recortado.ok && recortado.senal.destino).toBe('/cita/una-cita/');
    const enFragmento = senal('https://a.example/', '/cita/una-cita/#x?de=tiktok');
    expect(enFragmento.ok && enFragmento.senal).not.toHaveProperty('marcado');
    const enConsulta = senal('https://a.example/', ' /cita/una-cita/?de=tiktok#x ');
    expect(enConsulta.ok && enConsulta.senal).toMatchObject({ destino: '/cita/una-cita/', marcado: true });
  });

  it('--retira: corrige una señal viva con la misma terna, y nada más', () => {
    const anterior: SenalExterna = { fecha: '2026-10-09', tipo: 'ajena', origen: 'https://a.example/', destino: '/' };
    const correccion = senal('https://a.example/', '/', { tipo: 'ajena', retira: '2026-10-09', anteriores: [anterior] });
    expect(correccion.ok && correccion.senal).toEqual({ ...anterior, fecha: HOY, retira: '2026-10-09' });

    expect(
      motivosDeSenal(senal('https://a.example/', '/', { tipo: 'propia', retira: '2026-10-09', anteriores: [anterior] })),
    ).toMatch(/No hay ninguna señal propia del 2026-10-09/);
    expect(
      motivosDeSenal(senal('https://a.example/', '/', { tipo: 'ajena', retira: '2026-10-08', anteriores: [anterior] })),
    ).toMatch(/No hay ninguna señal ajena del 2026-10-08/);
    const yaRetirada = correccion.ok ? correccion.senal : anterior;
    expect(
      motivosDeSenal(
        senal('https://a.example/', '/', { tipo: 'ajena', retira: '2026-10-09', anteriores: [anterior, yaRetirada] }),
      ),
    ).toMatch(/ya está retirada/);
  });

});

describe('el resumen de señales', () => {
  it('sin señales lo dice, y dice que todavía no hay ajena', () => {
    const resumen = resumenDeSenales([], { cita: [], autor: [], tema: [], coleccion: [] }, ['/'], HOY);
    expect(resumen).toEqual({
      propias: [],
      ajenas: [],
      hayAjena: false,
      retiradas: 0,
      comprobacionDeSearchConsole: { estado: 'sinPropias' },
    });
    const texto = lineasDeSenales(resumen).join('\n');
    expect(texto).toMatch(/No hay ninguna señal externa anotada\./);
    expect(texto).toMatch(/La 18\.1 se cierra con la primera ajena: todavía ninguna\./);
  });

  it('separa propias de ajenas, con la familia del destino del censo', async () => {
    const conjunto = await conjuntoDelCorpus(rutasDelCorpus(await corpusConCitas(MIN_CITAS_POR_TEMA)));
    const senales: SenalExterna[] = [
      { fecha: '2026-10-08', tipo: 'propia', origen: 'https://www.tiktok.com/@x', destino: '/' },
      { fecha: '2026-10-09', tipo: 'ajena', origen: 'https://blog.ejemplo/post', destino: '/cita/cita-0/', marcado: true, nota: 'reseña' },
      { fecha: '2026-10-10', tipo: 'propia', origen: 'https://linktr.ee/x', destino: '/autor/autor-0/' },
    ];
    const resumen = resumenDeSenales(senales, censoPorFamilia(conjunto), rutasPublicadas(conjunto), HOY);
    expect(resumen.propias.map((s) => s.familia)).toEqual(['portada', 'autor']);
    expect(resumen.ajenas.map((s) => s.familia)).toEqual(['cita']);
    expect(resumen.hayAjena).toBe(true);

    const texto = lineasDeSenales(resumen).join('\n');
    expect(texto).toMatch(/Propias \(2\)\n {4}2026-10-08 {2}https:\/\/www\.tiktok\.com\/@x {2}→ {2}\/ {2}\(portada\)/);
    expect(texto).toMatch(
      /Ajenas \(1\)\n {4}2026-10-09 {2}https:\/\/blog\.ejemplo\/post {2}→ {2}\/cita\/cita-0\/ {2}\(Cita, marcada\) {2}— reseña {2}⚠ copia un enlace del Kit/,
    );
    expect(texto).toMatch(
      /La 18\.1 se cierra con la primera ajena: hay 1\. La primera, del 2026-10-09: https:\/\/blog\.ejemplo\/post → \/cita\/cita-0\/\./,
    );
    // Una propia marcada no lleva el aviso del Kit: es lo esperable.
    expect(texto.match(/copia un enlace del Kit/g)).toHaveLength(1);
  });

  it('ordena por fecha y, a igual fecha, por orden del fichero; la primera ajena es la más temprana', () => {
    const censo = { cita: [], autor: [], tema: [], coleccion: [] };
    const senales: SenalExterna[] = [
      { fecha: '2026-10-09', tipo: 'ajena', origen: 'https://b.example/', destino: '/' },
      { fecha: '2026-10-08', tipo: 'ajena', origen: 'https://c.example/', destino: '/' },
      { fecha: '2026-10-08', tipo: 'ajena', origen: 'https://a.example/', destino: '/' },
    ];
    const resumen = resumenDeSenales(senales, censo, ['/'], HOY);
    expect(resumen.ajenas.map((s) => s.origen)).toEqual(['https://c.example/', 'https://a.example/', 'https://b.example/']);
    expect(resumen.primeraAjena).toMatchObject({ fecha: '2026-10-08', origen: 'https://c.example/', destino: '/' });
  });

  it('cuenta enlaces distintos, no entradas, y no cuenta lo retirado ni la corrección', () => {
    const censo = { cita: [], autor: [], tema: [], coleccion: [] };
    const a: SenalExterna = { fecha: '2026-10-05', tipo: 'propia', origen: 'https://www.tiktok.com/@x', destino: '/' };
    const ajena: SenalExterna = { fecha: '2026-10-06', tipo: 'ajena', origen: 'https://a.example/', destino: '/' };
    const resumen = resumenDeSenales(
      [a, { ...a, fecha: '2026-10-07' }, ajena, { ...ajena, fecha: HOY, retira: '2026-10-06' }],
      censo,
      ['/'],
      HOY,
    );
    expect(resumen.propias).toHaveLength(1);
    expect(resumen.propias[0]).toMatchObject({ fecha: '2026-10-05', anotaciones: 2 });
    expect(resumen.ajenas).toEqual([]);
    expect(resumen.hayAjena).toBe(false);
    expect(resumen.retiradas).toBe(1);
    const texto = lineasDeSenales(resumen).join('\n');
    expect(texto).toMatch(/Propias \(1\)\n.*anotada 2 veces/);
    expect(texto).toMatch(/1 retirada por corrección/);
    expect(texto).toMatch(/todavía ninguna/);
  });

  it('la comprobación de Search Console toca a los 14 días de la primera propia', () => {
    const censo = { cita: [], autor: [], tema: [], coleccion: [] };
    const propia: SenalExterna = { fecha: '2026-09-26', tipo: 'propia', origen: 'https://linktr.ee/x', destino: '/' };
    expect(resumenDeSenales([propia], censo, ['/'], '2026-10-09').comprobacionDeSearchConsole).toEqual({
      estado: 'aunNoToca',
      desde: '2026-10-10',
    });
    const pendiente = resumenDeSenales([propia], censo, ['/'], '2026-10-10');
    expect(pendiente.comprobacionDeSearchConsole).toEqual({ estado: 'pendiente', desde: '2026-10-10' });
    expect(lineasDeSenales(pendiente).join('\n')).toMatch(/Search Console .*: pendiente desde 2026-10-10\./);
    expect(lineasDeSenales(resumenDeSenales([propia], censo, ['/'], '2026-09-30')).join('\n')).toMatch(
      /aún no toca; toca el 2026-10-10\./,
    );
  });
});

describe('el registro de señales en corpus/', () => {
  it('la cabecera dice qué registra, por qué solo añade, qué cierra la 18.1, el ciclo y Search Console', () => {
    expect(CABECERA_DE_SENALES).toMatch(/QUÉ REGISTRA\. Enlaces hacia el sitio desde fuera/);
    expect(CABECERA_DE_SENALES).toMatch(/PROPIA/);
    expect(CABECERA_DE_SENALES).toMatch(/AJENA/);
    expect(CABECERA_DE_SENALES).toMatch(/POR QUÉ SOLO AÑADE/);
    expect(CABECERA_DE_SENALES).toMatch(/LA 18\.1 NO SE CIERRA CON SEÑALES PROPIAS/);
    expect(CABECERA_DE_SENALES).toMatch(/PRIMERA AJENA/);
    expect(CABECERA_DE_SENALES).toMatch(/LAS PROPIAS DE LA SEMANA DEL CICLO se anotan el día que se ponen/);
    expect(CABECERA_DE_SENALES).toMatch(/A LAS DOS SEMANAS DE LA PRIMERA PROPIA/);
    expect(CABECERA_DE_SENALES).toMatch(/dominio de referencia/);
    expect(CABECERA_DE_SENALES).toMatch(/Search Console/);
    expect(CABECERA_DE_SENALES).toMatch(/AD-24/);
    expect(CABECERA_DE_SENALES).toMatch(/npm run canal -- senal/);
  });

  it('el fichero versionado es la cabecera y la lista vacía', () => {
    const versionado = readFileSync(resolve(RAIZ, 'corpus', FICHERO_DE_SENALES), 'utf8');
    expect(versionado).toBe(CABECERA_DE_SENALES);
    expect(parsearYaml(versionado)).toEqual({ senales: null });
  });

  it('es metadato del Corpus, no una colección', () => {
    const configuracion = readFileSync(resolve(RAIZ, 'src/content.config.ts'), 'utf8');
    expect(configuracion).not.toContain(FICHERO_DE_SENALES);
  });

  it('crea el fichero con su cabecera, y la señal se relee igual', async () => {
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    const una: SenalExterna = {
      fecha: HOY,
      tipo: 'ajena',
      origen: 'https://blog.ejemplo/post?a=1&b=2',
      destino: '/',
      marcado: true,
      nota: 'con «comillas» y: dos puntos',
    };
    await registrarSenalExterna(rutas, una);
    const escrito = await readFile(rutas.senalesExternas, 'utf8');
    expect(escrito.startsWith(CABECERA_DE_SENALES)).toBe(true);
    expect(await leerSenalesExternas(rutas)).toEqual([una]);
  });

  it('no reescribe: con dos señales y un alta, lo anterior queda byte a byte igual', async () => {
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    await registrarSenalExterna(rutas, { fecha: '2026-10-08', tipo: 'propia', origen: 'https://www.tiktok.com/@x', destino: '/' });
    await registrarSenalExterna(rutas, { fecha: '2026-10-09', tipo: 'propia', origen: 'https://linktr.ee/x', destino: '/' });
    const antes = `${await readFile(rutas.senalesExternas, 'utf8')}# 2026-10-09 — tiktok.com: no figura\n`;
    await writeFile(rutas.senalesExternas, antes, 'utf8');

    await registrarSenalExterna(rutas, { fecha: HOY, tipo: 'ajena', origen: 'https://blog.ejemplo/', destino: '/' });

    expect((await readFile(rutas.senalesExternas, 'utf8')).startsWith(antes)).toBe(true);
    expect((await leerSenalesExternas(rutas)).map((s) => s.fecha)).toEqual(['2026-10-08', '2026-10-09', HOY]);
  });

  it('un fichero ilegible, o con la lista seguida de otra clave, se niega sin tocarlo', async () => {
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    for (const roto of ['# sin la clave\n', 'senales: [\n', 'senales:\notra: 1\n']) {
      await writeFile(rutas.senalesExternas, roto, 'utf8');
      await expect(
        registrarSenalExterna(rutas, { fecha: HOY, tipo: 'propia', origen: 'https://a.example/', destino: '/' }),
        roto,
      ).rejects.toThrow(/senales-externas\.yml/);
      expect(await readFile(rutas.senalesExternas, 'utf8')).toBe(roto);
    }
  });

  it('una entrada escrita a mano con un valor imposible se nombra al leer', async () => {
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    const base = 'fecha: "2026-10-08"\n    tipo: "propia"\n    origen: "https://a.example/"\n    destino: "/"';
    const casos: [string, RegExp][] = [
      [base.replace('2026-10-08', '2026-02-31'), /entrada 1 .*«fecha: 2026-02-31»/],
      [base.replace('propia', 'mia'), /entrada 1 .*«tipo: mia»/],
      [base.replace('https://a.example/', 'a.example'), /entrada 1 .*«origen: a\.example»/],
      [base.replace('destino: "/"', 'destino: "cita/x/"'), /entrada 1 .*«destino: cita\/x\/»/],
      [base.replace('destino: "/"', 'destino: "/?de=x"'), /entrada 1 .*«destino: \/\?de=x».*sin «\?» ni «#»/],
      [base.replace('destino: "/"', 'destino: "/#a"'), /entrada 1 .*«destino: \/#a»/],
      [base.replace('https://a.example/', `https://${DOMINIO}/x`), /entrada 1 .*«origen: https:\/\/.*señal interna/],
      [base.replace('https://a.example/', 'http://localhost/'), /entrada 1 .*no es una página pública/],
      [`${base}\n    marcado: "sí"`, /entrada 1 .*«marcado: sí»/],
      [`${base}\n    retira: "ayer"`, /entrada 1 .*«retira: ayer»/],
      [`${base}\n    nota: 3`, /entrada 1 .*«nota» que no es texto/],
    ];
    for (const [entrada, motivo] of casos) {
      await writeFile(rutas.senalesExternas, `senales:\n  - ${entrada}\n`, 'utf8');
      await expect(leerSenalesExternas(rutas)).rejects.toThrow(motivo);
    }
  });
});

describe('la orden «senal»', () => {
  it('propia: línea al final con la fecha de hoy, y sale con 0', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();
    expect(
      await principal(['--corpus', corpus, 'senal', 'https://www.tiktok.com/@x', '/', '--tipo', 'propia'], AHORA),
    ).toBe(0);
    expect(await leerSenalesExternas(rutasDelCorpus(corpus))).toEqual([
      { fecha: HOY, tipo: 'propia', origen: 'https://www.tiktok.com/@x', destino: '/' },
    ]);
    expect(salida.join('')).toMatch(/todavía ninguna/);
    // Una señal no toca el registro de publicaciones.
    expect(existsSync(join(corpus, FICHERO_DE_PUBLICACIONES))).toBe(false);
  });

  it('ajena con nota y --fecha, y su --json', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();
    expect(
      await principal(
        ['--corpus', corpus, 'senal', 'https://blog.ejemplo/post', '/cita/cita-0/', '--tipo', 'ajena',
          '--nota', 'reseña', '--fecha', '2026-10-09', '--json'],
        AHORA,
      ),
    ).toBe(0);
    const leido = JSON.parse(salida.join(''));
    expect(leido.anotada).toEqual({
      fecha: '2026-10-09',
      tipo: 'ajena',
      origen: 'https://blog.ejemplo/post',
      destino: '/cita/cita-0/',
      nota: 'reseña',
    });
    expect(leido.registro).toBe(join(corpus, FICHERO_DE_SENALES));
    expect(leido.senales.hayAjena).toBe(true);
    expect(leido.senales.ajenas[0].familia).toBe('cita');
  });

  it.each([
    ['sin tipo', ['senal', 'https://a.example/', '/'], /necesita «--tipo propia» o «--tipo ajena»/],
    ['tipo malo', ['senal', 'https://a.example/', '/', '--tipo', 'otra'], /«--tipo otra» no es una clase de señal/],
    ['--tipo sin valor', ['senal', 'https://a.example/', '/', '--tipo'], /necesita un valor/],
    ['--tipo repetido', ['senal', 'https://a.example/', '/', '--tipo', 'propia', '--tipo', 'ajena'], /«--tipo» aparece más de una vez/],
    ['faltan argumentos', ['senal', 'https://a.example/', '--tipo', 'propia'], /necesita dos argumentos/],
    ['sobran argumentos', ['senal', 'https://a.example/', '/', '/autor/autor-0/', '--tipo', 'propia'], /toma dos argumentos/],
    ['--fecha sin forma de jornada', ['senal', 'https://a.example/', '/', '--tipo', 'propia', '--fecha', '9/10'], /no es una fecha del calendario/],
    ['--tipo al anotar una publicación', ['anotar', 'x', 'foto', '-', '--tipo', 'propia'], /una publicación no tiene clase/],
    ['--tipo en la consulta', ['--tipo', 'propia'], /«--fecha» y «--nota» son de «anotar» y de «senal».*la consulta no escribe nada/],
  ])('%s: código 2, uso, y no escribe', async (_, argumentos, motivo) => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus, ...argumentos], AHORA)).toBe(2);
    expect(salida.join('')).toMatch(motivo);
    expect(salida.join('')).toMatch(/npm run canal -- senal/);
    expect(existsSync(join(corpus, FICHERO_DE_SENALES))).toBe(false);
    expect(existsSync(join(corpus, FICHERO_DE_PUBLICACIONES))).toBe(false);
  });

  it.each([
    ['origen propio', ['senal', `https://${DOMINIO}/x`, '/'], /señal interna/],
    ['origen www propio', ['senal', `https://www.${DOMINIO}/`, '/'], /señal interna/],
    ['origen sin esquema', ['senal', 'tiktok.com/@x', '/'], /no es una URL absoluta/],
    ['destino no publicado', ['senal', 'https://a.example/', '/buscar/'], /no publicable/],
    ['fecha futura', ['senal', 'https://a.example/', '/', '--fecha', '2026-10-11'], /todavía no ha llegado/],
  ])('%s: código 1 y no escribe', async (_, argumentos, motivo) => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus, ...argumentos, '--tipo', 'propia'], AHORA)).toBe(1);
    expect(salida.join('')).toMatch(motivo);
    expect(existsSync(join(corpus, FICHERO_DE_SENALES))).toBe(false);
  });

  it('un registro de señales ilegible hace fallar también la consulta, con 1', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    await writeFile(join(corpus, FICHERO_DE_SENALES), 'senales: [\n', 'utf8');
    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus], AHORA)).toBe(1);
    expect(salida.join('')).toMatch(/senales-externas\.yml no es YAML válido/);
  });

  it('consulta con 1 propia: el bloque dice «todavía ninguna» ajena', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    await principal(['--corpus', corpus, 'senal', 'https://www.tiktok.com/@x', '/', '--tipo', 'propia'], AHORA);
    const fichero = join(corpus, FICHERO_DE_SENALES);
    const antes = await readFile(fichero, 'utf8');

    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus], AHORA)).toBe(0);
    const texto = salida.join('');
    expect(texto).toMatch(/Señales externas/);
    expect(texto).toMatch(/Propias \(1\)\n {4}2026-10-10 {2}https:\/\/www\.tiktok\.com\/@x {2}→ {2}\/ {2}\(portada\)/);
    expect(texto).toMatch(/Ajenas \(0\)\n {4}ninguna/);
    expect(texto).toMatch(/La 18\.1 se cierra con la primera ajena: todavía ninguna\./);
    expect(await readFile(fichero, 'utf8')).toBe(antes);
  });

  it('consulta con 1 propia y 1 ajena: separadas, «hay 1», también en --json', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    await principal(['--corpus', corpus, 'senal', 'https://www.tiktok.com/@x', '/', '--tipo', 'propia'], AHORA);
    await principal(
      ['--corpus', corpus, 'senal', 'https://blog.ejemplo/post', '/autor/autor-0/', '--tipo', 'ajena'],
      AHORA,
    );

    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus], AHORA)).toBe(0);
    const texto = salida.join('');
    expect(texto).toMatch(/Propias \(1\)\n.*tiktok/);
    expect(texto).toMatch(/Ajenas \(1\)\n.*blog\.ejemplo\/post {2}→ {2}\/autor\/autor-0\/ {2}\(Autor\)/);
    expect(texto).toMatch(/La 18\.1 se cierra con la primera ajena: hay 1\./);

    const json = capturarSalida();
    expect(await principal(['--corpus', corpus, '--json'], AHORA)).toBe(0);
    const leido = JSON.parse(json.join(''));
    expect(leido.senales.propias).toHaveLength(1);
    expect(leido.senales.ajenas).toHaveLength(1);
    expect(leido.senales.hayAjena).toBe(true);
  });

  it('la consulta sin señales lo dice y no crea el fichero', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus], AHORA)).toBe(0);
    expect(salida.join('')).toMatch(/No hay ninguna señal externa anotada\./);
    expect(existsSync(join(corpus, FICHERO_DE_SENALES))).toBe(false);
  });
});

describe('la orden «senal», tras la revisión', () => {
  it('la línea «Anotada señal …» lleva tipo, fecha, origen, destino, familia y «, marcada»', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();
    expect(
      await principal(
        ['--corpus', corpus, 'senal', 'https://linktr.ee/sabiduriadebolsillo', '/cita/cita-0/?de=instagram', '--tipo', 'propia'],
        AHORA,
      ),
    ).toBe(0);
    expect(salida.join('')).toMatch(
      /Anotada señal propia {2}2026-10-10 {2}https:\/\/linktr\.ee\/sabiduriadebolsillo {2}→ {2}\/cita\/cita-0\/ {2}\(Cita, marcada\)/,
    );
  });

  it('--tipo antes de la suborden vale igual', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    expect(await principal(['--corpus', corpus, '--tipo', 'ajena', 'senal', 'https://a.example/', '/'], AHORA)).toBe(0);
    expect(await leerSenalesExternas(rutasDelCorpus(corpus))).toEqual([
      { fecha: HOY, tipo: 'ajena', origen: 'https://a.example/', destino: '/' },
    ]);
  });

  it.each([
    ['--nota vacía', ['senal', 'https://a.example/', '/', '--tipo', 'propia', '--nota', '  '], /«--nota» vacía/],
    ['--retira sin forma de jornada', ['senal', 'https://a.example/', '/', '--tipo', 'propia', '--retira', 'ayer'], /«--retira ayer» no es una fecha/],
    ['--retira al anotar', ['anotar', 'x', 'foto', '-', '--retira', HOY], /se corrige con otra publicación/],
    ['--retira en la consulta', ['--retira', HOY], /la consulta no escribe nada/],
  ])('%s: código 2 y no escribe', async (_, argumentos, motivo) => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus, ...argumentos], AHORA)).toBe(2);
    expect(salida.join('')).toMatch(motivo);
    expect(existsSync(join(corpus, FICHERO_DE_SENALES))).toBe(false);
    expect(existsSync(join(corpus, FICHERO_DE_PUBLICACIONES))).toBe(false);
  });

  it.each([
    ['marca de una red que no existe', ['senal', 'https://a.example/', '/?de=myspace'], /marcado para «myspace»/],
    ['marca vacía', ['senal', 'https://a.example/', '/?de='], /ninguna red/],
    ['origen localhost', ['senal', 'http://localhost:4321/', '/'], /no es una página pública/],
    ['origen con credenciales', ['senal', 'https://yo:x@a.example/', '/'], /usuario o contraseña/],
    ['dominio propio con punto final', ['senal', `https://${DOMINIO}./`, '/'], /señal interna/],
    ['--retira sin señal igual', ['senal', 'https://a.example/', '/', '--retira', '2026-10-09'], /No hay ninguna señal propia/],
  ])('%s: código 1 y no escribe', async (_, argumentos, motivo) => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus, ...argumentos, '--tipo', 'propia'], AHORA)).toBe(1);
    expect(salida.join('')).toMatch(motivo);
    expect(existsSync(join(corpus, FICHERO_DE_SENALES))).toBe(false);
  });

  it('una señal igual se anota, avisa con la fecha de la primera, y la consulta cuenta un enlace', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    const args = ['--corpus', corpus, 'senal', 'https://www.tiktok.com/@sabiduriabolsillo', '/', '--tipo', 'propia'];
    expect(await principal([...args, '--fecha', '2026-10-08'], AHORA)).toBe(0);

    const salida = capturarSalida();
    expect(await principal(args, AHORA)).toBe(0);
    expect(salida.join('')).toMatch(/ya hay una igual del 2026-10-08/);
    expect(await leerSenalesExternas(rutasDelCorpus(corpus))).toHaveLength(2);

    const consulta = capturarSalida();
    expect(await principal(['--corpus', corpus], AHORA)).toBe(0);
    expect(consulta.join('')).toMatch(/Propias \(1\)\n {4}2026-10-08 .*anotada 2 veces/);
  });

  it('--retira deshace una ajena anotada por error sin reescribir nada', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    const ajena = ['--corpus', corpus, 'senal', 'https://a.example/post', '/', '--tipo', 'ajena'];
    expect(await principal([...ajena, '--fecha', '2026-10-09'], AHORA)).toBe(0);
    const fichero = join(corpus, FICHERO_DE_SENALES);
    const antes = await readFile(fichero, 'utf8');

    const salida = capturarSalida();
    expect(await principal([...ajena, '--retira', '2026-10-09', '--nota', 'era propia'], AHORA)).toBe(0);
    expect(salida.join('')).toMatch(/Anotada corrección: retira la señal ajena del 2026-10-09/);
    expect((await readFile(fichero, 'utf8')).startsWith(antes)).toBe(true);
    expect((await leerSenalesExternas(rutasDelCorpus(corpus))).at(-1)).toEqual({
      fecha: HOY,
      tipo: 'ajena',
      origen: 'https://a.example/post',
      destino: '/',
      retira: '2026-10-09',
      nota: 'era propia',
    });

    const consulta = capturarSalida();
    expect(await principal(['--corpus', corpus], AHORA)).toBe(0);
    expect(consulta.join('')).toMatch(/todavía ninguna/);
    expect(consulta.join('')).toMatch(/1 retirada por corrección/);

    // Retirar dos veces la misma no se admite.
    const otra = capturarSalida();
    expect(await principal([...ajena, '--retira', '2026-10-09'], AHORA)).toBe(1);
    expect(otra.join('')).toMatch(/ya está retirada/);
  });

  it('la consulta --json nombra la primera ajena y la comprobación de Search Console', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    await principal(['--corpus', corpus, 'senal', 'https://linktr.ee/x', '/', '--tipo', 'propia', '--fecha', '2026-09-20'], AHORA);
    await principal(['--corpus', corpus, 'senal', 'https://b.example/', '/', '--tipo', 'ajena', '--fecha', '2026-10-09'], AHORA);
    await principal(['--corpus', corpus, 'senal', 'https://a.example/', '/', '--tipo', 'ajena', '--fecha', '2026-10-01'], AHORA);

    const json = capturarSalida();
    expect(await principal(['--corpus', corpus, '--json'], AHORA)).toBe(0);
    const leido = JSON.parse(json.join(''));
    expect(leido.senales.primeraAjena).toMatchObject({ fecha: '2026-10-01', origen: 'https://a.example/', destino: '/' });
    expect(leido.senales.ajenas.map((s: SenalExterna) => s.fecha)).toEqual(['2026-10-01', '2026-10-09']);
    expect(leido.senales.comprobacionDeSearchConsole).toEqual({ estado: 'pendiente', desde: '2026-10-04' });
  });
});

describe('cada suborden lee solo su registro', () => {
  it('un senales-externas.yml roto no bloquea «anotar»', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    await writeFile(join(corpus, FICHERO_DE_SENALES), 'senales: [\n', 'utf8');
    capturarSalida();
    expect(await principal(['--corpus', corpus, 'anotar', 'x', 'foto', '-'], AHORA)).toBe(0);
    expect(await leerPublicacionesDeCanal(rutasDelCorpus(corpus))).toHaveLength(1);
  });

  it('un publicaciones-de-canal.yml roto no bloquea «senal»', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    await writeFile(join(corpus, FICHERO_DE_PUBLICACIONES), 'publicaciones: [\n', 'utf8');
    capturarSalida();
    expect(await principal(['--corpus', corpus, 'senal', 'https://a.example/', '/', '--tipo', 'ajena'], AHORA)).toBe(0);
    expect(await leerSenalesExternas(rutasDelCorpus(corpus))).toHaveLength(1);
  });

  it('el registro propio roto sí bloquea su suborden, con 1 y sin escribir', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    await writeFile(join(corpus, FICHERO_DE_SENALES), 'senales: [\n', 'utf8');
    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus, 'senal', 'https://a.example/', '/', '--tipo', 'ajena'], AHORA)).toBe(1);
    expect(salida.join('')).toMatch(/senales-externas\.yml no es YAML válido/);
    expect(await readFile(join(corpus, FICHERO_DE_SENALES), 'utf8')).toBe('senales: [\n');
  });

  it('la consulta enseña las publicaciones si las señales no se leen, y las nombra, con 1', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    await principal(['--corpus', corpus, 'anotar', 'x', 'foto', '-'], AHORA);
    await writeFile(join(corpus, FICHERO_DE_SENALES), 'senales: [\n', 'utf8');

    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus], AHORA)).toBe(1);
    const texto = salida.join('');
    expect(texto).toMatch(/2026-W41\n {2}x: 1/);
    expect(texto).toMatch(/No se ha podido leer corpus\/senales-externas\.yml; no se cuenta nada de él\./);

    const json = capturarSalida();
    expect(await principal(['--corpus', corpus, '--json'], AHORA)).toBe(1);
    const leido = JSON.parse(json.join('').split('\n}\n')[0] + '\n}');
    expect(leido.publicaciones).toHaveLength(1);
    expect(leido.senales).toBeUndefined();
    expect(leido.sinLeer.map((s: { registro: string }) => s.registro)).toEqual([`corpus/${FICHERO_DE_SENALES}`]);
  });

  it('la consulta enseña las señales si las publicaciones no se leen, y las nombra, con 1', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    await principal(['--corpus', corpus, 'senal', 'https://a.example/', '/', '--tipo', 'ajena'], AHORA);
    await writeFile(join(corpus, FICHERO_DE_PUBLICACIONES), 'publicaciones: [\n', 'utf8');

    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus], AHORA)).toBe(1);
    const texto = salida.join('');
    expect(texto).toMatch(/No se ha podido leer corpus\/publicaciones-de-canal\.yml; no se cuenta nada de él\./);
    expect(texto).toMatch(/La 18\.1 se cierra con la primera ajena: hay 1\./);
  });
});

describe('los códigos de «senal» tienen una sola redacción', () => {
  const normalizar = (texto: string) => texto.replace(/\s+/g, ' ').trim();
  const codigos = normalizar(CODIGOS_DE_SENAL);

  it('la cabecera del registro la repite literal', () => {
    expect(normalizar(CABECERA_DE_SENALES.replace(/^#/gm, ''))).toContain(codigos);
  });

  it('AGENTS.md la repite literal', () => {
    expect(normalizar(readFileSync(resolve(RAIZ, 'AGENTS.md'), 'utf8'))).toContain(codigos);
  });

  it('el docblock de tools/canal.ts la repite literal', () => {
    const fuente = readFileSync(resolve(RAIZ, 'tools/canal.ts'), 'utf8');
    const docblock = fuente.slice(0, fuente.indexOf('*/')).replace(/^ \* ?/gm, '');
    expect(normalizar(docblock)).toContain(codigos);
  });
});
