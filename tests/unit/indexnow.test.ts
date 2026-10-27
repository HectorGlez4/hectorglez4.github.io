import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import {
  CLAVE_DE_INDEXNOW,
  PUNTO_DE_INDEXNOW,
  RUTA_DE_LA_CLAVE,
  TOPE_POR_AVISO,
  avisoDeIndexNow,
} from '../../src/lib/buscadores.ts';
import {
  FAMILIAS_DE_FICHERO,
  FAMILIAS_DE_RUTA,
  componerAviso,
  familiaDeFichero,
  rutasAvisadasPor,
} from '../../tools/lib/avisar.ts';
import {
  bajasDelHistorial,
  componentesPorSuperficie,
  fechasPorSuperficie,
  ficherosDelCorpus,
  relacionDeSuperficies,
  type CambioDeFichero,
  type CitaParaFechar,
  type CorpusParaFechar,
  type Relacion,
  type TransicionFechada,
  type Version,
} from '../../tools/lib/cambios.ts';
import { rutaNormalizada } from '../../src/lib/superficies.ts';
import { esObraIndexable } from '../../src/lib/obras.ts';

/**
 * IndexNow — lo decidible sin salir a la red.
 *
 * Aquí se prueba qué se compone, que es lo decidible sin red. Lo que no se prueba aquí
 * conviene saber quién lo sostiene: que la clave se sirva en la raíz lo sostiene
 * `src/pages/[clave].txt.ts`, que deriva su nombre de la constante y por eso no puede
 * quedarse desincronizada; y que el aviso salga **después** de desplegar lo sostiene el
 * `needs: desplegar` del flujo de trabajo, no una prueba.
 */

const SITIO = 'https://sabiduriadebolsillo.net';

describe('la clave', () => {
  it('es hexadecimal y de la longitud que el protocolo admite', () => {
    // Entre 8 y 128 caracteres de [a-f0-9]. Una clave con un guion se rechaza al enviar,
    // y el rechazo llega días después en forma de nada.
    expect(CLAVE_DE_INDEXNOW).toMatch(/^[a-f0-9]{8,128}$/);
  });

  it('nombra el fichero que la sirve, para que no haya dos verdades', () => {
    expect(RUTA_DE_LA_CLAVE).toBe(`/${CLAVE_DE_INDEXNOW}.txt`);
  });

  it('avisa al punto común y no solo a Bing', () => {
    // `bing.com/indexnow` funcionaría y dejaría fuera a Yandex, Naver y Seznam.
    expect(PUNTO_DE_INDEXNOW).toContain('api.indexnow.org');
  });
});

describe('el slug de una Cita no es el nombre de su fichero', () => {
  /*
   * Esta es la prueba de un fallo que se cometió y se corrigió: `tools/avisar.ts` derivaba
   * el slug del nombre del fichero, y componía `/cita/…prada--los-que…` con dos guiones
   * donde la URL publicada lleva uno. El aviso salía verde anunciando 404.
   *
   * Se comprueba contra el corpus de verdad, no contra un ejemplo inventado: lo que hay
   * que impedir es que alguien vuelva a dar por hecho que coinciden.
   */
  const CITAS = resolve(import.meta.dirname, '../../corpus/citas');

  it('difieren en el corpus publicado, así que no se pueden confundir', () => {
    const ficheros = readdirSync(CITAS).filter((f) => f.endsWith('.md'));
    expect(ficheros.length).toBeGreaterThan(0);

    const iguales: string[] = [];
    for (const fichero of ficheros) {
      const slug = /^slug:\s*"?([^"\n]+)"?/m.exec(readFileSync(join(CITAS, fichero), 'utf8'));
      if (slug === null) continue;
      if (slug[1]?.trim() === basename(fichero, '.md')) iguales.push(fichero);
    }

    expect(iguales).toEqual([]);
  });
});

describe('el cuerpo del aviso', () => {
  it('compone host, clave y dónde encontrarla', () => {
    const aviso = avisoDeIndexNow(SITIO, ['/']);

    expect(aviso).toMatchObject({
      host: 'sabiduriadebolsillo.net',
      key: CLAVE_DE_INDEXNOW,
      keyLocation: `${SITIO}${RUTA_DE_LA_CLAVE}`,
    });
    expect(aviso.urlList).toEqual([`${SITIO}/`]);
  });

  it('convierte rutas relativas en absolutas del origen', () => {
    const aviso = avisoDeIndexNow(SITIO, ['/cita/seneca-la-vida', '/autor/seneca']);

    expect(aviso.urlList).toEqual([
      `${SITIO}/cita/seneca-la-vida`,
      `${SITIO}/autor/seneca`,
    ]);
  });

  it('acepta una URL absoluta ya compuesta sin duplicarla', () => {
    const aviso = avisoDeIndexNow(SITIO, ['/autor/seneca', `${SITIO}/autor/seneca`]);
    expect(aviso.urlList).toEqual([`${SITIO}/autor/seneca`]);
  });

  it('descarta lo que sea de otro dominio', () => {
    /*
     * El protocolo rechaza el aviso **entero** si una sola URL no es del host declarado,
     * así que colar una de fuera perdería también las buenas. Se descarta y las demás
     * salen.
     */
    const aviso = avisoDeIndexNow(SITIO, ['/', 'https://sabiduriadebolsillo.com/lander']);
    expect(aviso.urlList).toEqual([`${SITIO}/`]);
  });

  it('descarta lo que no se puede interpretar como URL', () => {
    const aviso = avisoDeIndexNow(SITIO, ['/', 'http://[esto no va']);
    expect(aviso.urlList).toEqual([`${SITIO}/`]);
  });

  it('no pasa del tope que el protocolo admite', () => {
    const muchas = Array.from({ length: TOPE_POR_AVISO + 500 }, (_, i) => `/cita/n-${i}`);
    expect(avisoDeIndexNow(SITIO, muchas).urlList).toHaveLength(TOPE_POR_AVISO);
  });

  it('respeta un origen de previsualización, no solo el dominio de producción', () => {
    // `SITE_URL` manda cuando trae algo (LC-1); el aviso tiene que ir a ese mismo origen.
    const aviso = avisoDeIndexNow('https://ensayo.example/', ['/']);
    expect(aviso.host).toBe('ensayo.example');
    expect(aviso.keyLocation).toBe(`https://ensayo.example${RUTA_DE_LA_CLAVE}`);
  });
});

describe('las familias del Corpus', () => {
  it('comparte una sola declaración de familias de fichero entre el filtro de git y el reconocimiento', () => {
    // Historia 24.8 — los documentos de Fuente entran como familia de fichero: ordenan la Obra.
    expect(FAMILIAS_DE_FICHERO).toEqual([
      ['corpus/citas', 'cita'],
      ['corpus/autores', 'autor'],
      ['corpus/temas', 'tema'],
      ['corpus/colecciones', 'coleccion'],
      ['corpus/obras', 'obra'],
      ['corpus/fuentes', 'documento'],
    ]);
    for (const [directorio, familia] of FAMILIAS_DE_FICHERO) {
      expect(familiaDeFichero(`${directorio}/ejemplo.md`)).toBe(familia);
    }
    expect(familiaDeFichero('corpus/indexacion.yml')).toBeUndefined();
    expect(familiaDeFichero('corpus/sesiones-de-sembrado.yml')).toBeUndefined();
    expect(familiaDeFichero('corpus/_revision/x.md')).toBeUndefined();
  });

  it('las familias de ruta son las cinco superficies que la relación declara, y la pone la relación', () => {
    expect(FAMILIAS_DE_RUTA).toEqual(['cita', 'autor', 'tema', 'coleccion', 'obra']);
    const familias = new Set([...relacionDeSuperficies(corpusDeEjemplo()).values()].map((s) => s.familia));
    expect([...familias].sort()).toEqual([...FAMILIAS_DE_RUTA].sort());
  });
});

// ─── Historia 22.8 — una relación, dos lecturas (AD-27) ──────────────────────────────

/** Un corpus de ejemplo: Séneca con tres Obras, Unamuno con una y una Colección. */
function corpusDeEjemplo(opciones: { cartas?: number; brevedad?: number; ira?: boolean } = {}): CorpusParaFechar {
  const citas: CitaParaFechar[] = [];
  const cita = (slug: string, autor: string, temas: string[], obra?: string) =>
    citas.push({ slug, autor, temas, ruta: `corpus/citas/${slug}.md`, ...(obra === undefined ? {} : { obra }) });
  for (let i = 0; i < (opciones.cartas ?? 3); i += 1) cita(`seneca-cartas-${i}`, 'seneca', ['el-tiempo'], 'seneca--cartas');
  for (let i = 0; i < (opciones.brevedad ?? 27); i += 1) cita(`seneca-brevedad-${i}`, 'seneca', [], 'seneca--brevedad');
  if (opciones.ira ?? true) cita('seneca-ira-0', 'seneca', ['la-ira'], 'seneca--ira');
  cita('seneca-suelta', 'seneca', ['el-tiempo', 'la-vida']);
  cita('unamuno-niebla-0', 'unamuno', ['la-vida'], 'unamuno--niebla');
  cita('unamuno-niebla-1', 'unamuno', [], 'unamuno--niebla');
  cita('unamuno-suelta', 'unamuno', ['la-vida']);
  return {
    citas,
    autores: [
      { slug: 'seneca', ruta: 'corpus/autores/seneca.yml' },
      { slug: 'unamuno', ruta: 'corpus/autores/unamuno.yml' },
    ],
    temas: ['el-tiempo', 'la-vida', 'la-ira'].map((slug) => ({ slug, ruta: `corpus/temas/${slug}.yml` })),
    colecciones: [
      {
        slug: 'breves',
        miembros: ['seneca-ira-0', 'unamuno-niebla-0', 'no-existe'],
        ruta: 'corpus/colecciones/breves.yml',
      },
    ],
    obras: ['seneca--cartas', 'seneca--brevedad', 'seneca--ira', 'unamuno--niebla'].map((nombre) => ({
      nombre,
      autor: nombre.split('--')[0],
      ruta: `corpus/obras/${nombre}.yml`,
    })),
  };
}

const CARTAS = '/obra/seneca/cartas/';
const BREVEDAD = '/obra/seneca/brevedad/';
const IRA = '/obra/seneca/ira/';
const NIEBLA = '/obra/unamuno/niebla/';

/** Una versión cualquiera, distinta en todos los campos que alguna superficie pinta. */
const versionDe = (marca: string): Version =>
  Object.fromEntries(
    ['texto', 'autor', 'temas', 'slug', 'procedencia', 'fuente', 'nombre', 'añoNacimiento', 'añoFallecimiento',
      'semblanza', 'biografia', 'criterio', 'miembros', 'titulo', 'formas', 'nota', 'ediciones'].map((c) => [c, marca]),
  );
const alta = (fichero: string): CambioDeFichero => ({ fichero, antes: null, despues: versionDe('b') });
const baja = (fichero: string): CambioDeFichero => ({ fichero, antes: versionDe('a'), despues: null });
const editado = (fichero: string): CambioDeFichero => ({ fichero, antes: versionDe('a'), despues: versionDe('b') });

/** Los ficheros que componen una superficie de la relación. */
const ficherosDe = (relacion: Relacion, ruta: string): string[] =>
  (relacion.get(ruta)?.componentes ?? []).map((c) => c.fichero);

describe('AD-27 — el aviso es la lectura inversa de la relación que fecha el sitemap', () => {
  it('para todo fichero F y ruta R: F ∈ ficheros(R) ⇔ R se avisa por un cambio de F', () => {
    const corpus = corpusDeEjemplo();
    const relacion = relacionDeSuperficies(corpus);
    const obras = [...relacion.keys()].filter((r) => r.startsWith('/obra/'));
    /*
     * Las excepciones, nombradas: la portada se avisa siempre que algo cambie; y una Obra solo
     * si es indexable después —aquí lo son todas, en las dos listas, para que la inversa se vea
     * entera—.
     */
    const todas = { rutas: obras };
    for (const fichero of ficherosDelCorpus(corpus)) {
      const { rutas } = componerAviso({
        cambios: [alta(fichero)],
        relacionDespues: relacion,
        relacionAntes: relacion,
        indexablesAntes: todas,
        indexablesDespues: todas,
      });
      expect(rutas).toContain('/');
      for (const [ruta, { componentes }] of relacion) {
        expect(rutas.includes(ruta), `${fichero} → ${ruta}`).toBe(componentes.some((c) => c.fichero === fichero));
      }
      // Y nada que la relación no declare, salvo la portada.
      for (const ruta of rutas) expect(ruta === '/' || relacion.has(ruta), ruta).toBe(true);
    }
  });

  it('la lectura de fechas es la misma relación, por ruta normalizada', () => {
    const corpus = corpusDeEjemplo();
    const relacion = relacionDeSuperficies(corpus);
    const fechas = componentesPorSuperficie(corpus);
    expect(fechas.size).toBe(relacion.size);
    for (const [ruta, { componentes }] of relacion) {
      expect(fechas.get(ruta.replace(/\/$/u, '') || '/')).toEqual(componentes);
    }
  });

  it('la Página de Obra es su ficha, sus Citas y el fichero de su Autor', () => {
    const relacion = relacionDeSuperficies(corpusDeEjemplo());
    expect(ficherosDe(relacion, NIEBLA).sort()).toEqual(
      [
        'corpus/obras/unamuno--niebla.yml',
        'corpus/citas/unamuno-niebla-0.md',
        'corpus/citas/unamuno-niebla-1.md',
        'corpus/autores/unamuno.yml',
      ].sort(),
    );
  });

  it('la rutasAvisadasPor sola es la inversa, sin la portada ni la indexabilidad', () => {
    const relacion = relacionDeSuperficies(corpusDeEjemplo());
    expect([...rutasAvisadasPor([editado('corpus/temas/la-ira.yml')], relacion)].sort()).toEqual(
      ['/cita/seneca-ira-0/', '/tema/la-ira/'].sort(),
    );
  });

  it('no avisa nada cuando el empujón no toca el Corpus publicable', () => {
    const relacion = relacionDeSuperficies(corpusDeEjemplo());
    expect(
      componerAviso({
        cambios: [],
        relacionDespues: relacion,
        indexablesAntes: { rutas: [] },
        indexablesDespues: { rutas: [] },
      }),
    ).toEqual({ rutas: [], avisos: [] });
  });
});

describe('FR-38 — el aviso de las Obras (la matriz de la 22.8)', () => {
  // Con 3 de Cartas, 27 de Brevedad, 1 de Ira y 1 suelta: Brevedad es el 84 %, indexable.
  const indexablesDe = (corpus: CorpusParaFechar) => {
    const porAutor = new Map<string, number>();
    const porObra = new Map<string, number>();
    for (const c of corpus.citas) {
      porAutor.set(c.autor, (porAutor.get(c.autor) ?? 0) + 1);
      if (c.obra !== undefined) porObra.set(c.obra, (porObra.get(c.obra) ?? 0) + 1);
    }
    return {
      rutas: [...porObra]
        .filter(([nombre, n]) => esObraIndexable(n, porAutor.get(nombre.split('--')[0]) ?? 0))
        .map(([nombre]) => `/obra/${nombre.replace('--', '/')}/`),
    };
  };

  it('Cita nueva en Obra indexable: la Cita, su Autor, sus Temas y la Obra; ninguna hermana', () => {
    const antes = corpusDeEjemplo({ cartas: 2 });
    const despues = corpusDeEjemplo({ cartas: 3 });
    const { rutas } = componerAviso({
      cambios: [alta('corpus/citas/seneca-cartas-2.md')],
      relacionAntes: relacionDeSuperficies(antes),
      relacionDespues: relacionDeSuperficies(despues),
      indexablesAntes: indexablesDe(antes),
      indexablesDespues: indexablesDe(despues),
    });
    expect(indexablesDe(antes).rutas).toContain(CARTAS);
    expect(rutas.sort()).toEqual(['/', '/cita/seneca-cartas-2/', '/autor/seneca/', '/tema/el-tiempo/', CARTAS].sort());
  });

  it('una hermana que cambia de estado se avisa: las Citas nuevas bajan Brevedad del 90 %', () => {
    // 28 de 31 Citas de Séneca es el 90,3 % —no se indexa—; con dos más en Cartas, 28 de 33
    // es el 84,8 %, y Brevedad pasa a indexarse sin que se toque ninguno de sus ficheros.
    const antes = corpusDeEjemplo({ cartas: 1, brevedad: 28 });
    const despues = corpusDeEjemplo({ cartas: 3, brevedad: 28 });
    const a = indexablesDe(antes).rutas;
    const d = indexablesDe(despues).rutas;
    expect(a).not.toContain(BREVEDAD);
    expect(d).toContain(BREVEDAD);
    const { rutas } = componerAviso({
      cambios: [alta('corpus/citas/seneca-cartas-1.md'), alta('corpus/citas/seneca-cartas-2.md')],
      relacionAntes: relacionDeSuperficies(antes),
      relacionDespues: relacionDeSuperficies(despues),
      indexablesAntes: { rutas: a },
      indexablesDespues: { rutas: d },
    });
    expect(rutas).toContain(BREVEDAD);
    expect(rutas).toContain(CARTAS);
    // La que no cambia de estado ni se toca, no.
    expect(rutas).not.toContain(NIEBLA);
    expect(rutas).not.toContain(IRA);
  });

  it('una Obra indexable que desaparece se avisa: sus Citas se retiran', () => {
    const antes = corpusDeEjemplo();
    const despues = corpusDeEjemplo({ cartas: 0 });
    const { rutas } = componerAviso({
      cambios: ['corpus/citas/seneca-cartas-0.md', 'corpus/citas/seneca-cartas-1.md', 'corpus/citas/seneca-cartas-2.md'].map(baja),
      relacionAntes: relacionDeSuperficies(antes),
      relacionDespues: relacionDeSuperficies(despues),
      indexablesAntes: indexablesDe(antes),
      indexablesDespues: indexablesDe(despues),
    });
    expect(indexablesDe(antes).rutas).toContain(CARTAS);
    expect(rutas).toContain(CARTAS);
    expect(rutas).toContain('/cita/seneca-cartas-0/');
  });

  it('una Obra que desaparece se avisa: su única Cita se retira', () => {
    const antes = corpusDeEjemplo();
    const despues = corpusDeEjemplo({ ira: false });
    const { rutas, avisos } = componerAviso({
      cambios: [baja('corpus/citas/seneca-ira-0.md')],
      relacionAntes: relacionDeSuperficies(antes),
      relacionDespues: relacionDeSuperficies(despues),
      indexablesAntes: indexablesDe(antes),
      indexablesDespues: indexablesDe(despues),
    });
    expect(rutas).toContain(IRA);
    expect(rutas).toContain('/cita/seneca-ira-0/');
    expect(rutas).toContain('/coleccion/breves/');
    expect(avisos).toEqual([]);
  });

  it('una Obra nueva —de ausente a `noindex`— también cambió de estado, y se avisa', () => {
    const antes = corpusDeEjemplo({ ira: false });
    const despues = corpusDeEjemplo();
    const { rutas } = componerAviso({
      cambios: [alta('corpus/citas/seneca-ira-0.md'), alta('corpus/obras/seneca--ira.yml')],
      relacionAntes: relacionDeSuperficies(antes),
      relacionDespues: relacionDeSuperficies(despues),
      indexablesAntes: indexablesDe(antes),
      indexablesDespues: indexablesDe(despues),
    });
    expect(rutas).toContain(IRA);
  });

  it('una Obra tocada `noindex` sin saber si lo era antes no se calla: se nombra', () => {
    const corpus = corpusDeEjemplo();
    const { rutas, avisos } = componerAviso({
      cambios: [editado('corpus/citas/seneca-ira-0.md')],
      relacionDespues: relacionDeSuperficies(corpus),
      indexablesAntes: { motivo: 'Corpus de abc ilegible' },
      indexablesDespues: indexablesDe(corpus),
    });
    expect(rutas).not.toContain(IRA);
    expect(avisos.join('\n')).toMatch(new RegExp(`Obra\\(s\\) tocada\\(s\\) sin avisar.*${IRA}`, 'su'));
  });

  it('un cambio de la regla sin tocar el Corpus compara las listas y no avisa la portada', () => {
    const corpus = corpusDeEjemplo();
    const relacion = relacionDeSuperficies(corpus);
    const { rutas } = componerAviso({
      cambios: [],
      reglaCambiada: true,
      relacionAntes: relacion,
      relacionDespues: relacion,
      indexablesAntes: { rutas: [CARTAS, BREVEDAD] },
      indexablesDespues: { rutas: [CARTAS] },
    });
    expect(rutas).toEqual([BREVEDAD]);
  });

  it('la Página de Cita incluye la ficha de su Obra: retitular la Obra avisa sus Citas', () => {
    const relacion = relacionDeSuperficies(corpusDeEjemplo());
    expect(ficherosDe(relacion, '/cita/unamuno-niebla-0/')).toContain('corpus/obras/unamuno--niebla.yml');
    expect(ficherosDe(relacion, '/cita/unamuno-suelta/')).not.toContain('corpus/obras/unamuno--niebla.yml');
  });

  it('una Obra `noindex` antes y después no se avisa aunque se toque', () => {
    const corpus = corpusDeEjemplo();
    const relacion = relacionDeSuperficies(corpus);
    const { rutas } = componerAviso({
      cambios: [editado('corpus/citas/seneca-ira-0.md')],
      relacionAntes: relacion,
      relacionDespues: relacion,
      indexablesAntes: indexablesDe(corpus),
      indexablesDespues: indexablesDe(corpus),
    });
    expect(rutas).not.toContain(IRA);
    expect(rutas).toContain('/cita/seneca-ira-0/');
  });

  it('una Obra que pasa a `noindex` se avisa', () => {
    const antes = corpusDeEjemplo({ cartas: 2 });
    const relacion = relacionDeSuperficies(antes);
    const { rutas } = componerAviso({
      cambios: [editado('corpus/obras/seneca--cartas.yml')],
      relacionAntes: relacion,
      relacionDespues: relacion,
      indexablesAntes: { rutas: [CARTAS] },
      indexablesDespues: { rutas: [] },
    });
    expect(rutas).toContain(CARTAS);
  });

  it('sin sitemap legible: ninguna hermana, lo demás sí, y el motivo dicho', () => {
    const antes = corpusDeEjemplo({ cartas: 1, brevedad: 28 });
    const despues = corpusDeEjemplo({ cartas: 3, brevedad: 28 });
    const { rutas, avisos } = componerAviso({
      cambios: [alta('corpus/citas/seneca-cartas-1.md'), alta('corpus/citas/seneca-cartas-2.md')],
      relacionAntes: relacionDeSuperficies(antes),
      relacionDespues: relacionDeSuperficies(despues),
      indexablesAntes: indexablesDe(antes),
      indexablesDespues: { motivo: 'sitemap ilegible: fetch failed' },
    });
    expect(rutas).not.toContain(BREVEDAD);
    expect(rutas).toContain('/cita/seneca-cartas-2/');
    expect(rutas).toContain('/autor/seneca/');
    expect(avisos.join('\n')).toMatch(/ninguna Obra hermana.*sitemap ilegible: fetch failed/su);
  });

  it('sin el Corpus de antes: tampoco hermanas, y se dice', () => {
    const despues = corpusDeEjemplo();
    const { avisos } = componerAviso({
      cambios: [editado('corpus/citas/seneca-cartas-0.md')],
      relacionDespues: relacionDeSuperficies(despues),
      indexablesAntes: { motivo: 'Corpus de abc ilegible' },
      indexablesDespues: indexablesDe(despues),
    });
    expect(avisos.join('\n')).toMatch(/ninguna Obra hermana.*antes: Corpus de abc ilegible/su);
  });
});

// ─── Historia 24.8 — el aviso por campos ─────────────────────────────────────────────

describe('Historia 24.8 — el aviso lee la relación por campos', () => {
  const indexables = (corpus: CorpusParaFechar) => ({
    rutas: [...relacionDeSuperficies(corpus).keys()].filter((r) => r.startsWith('/obra/')),
  });
  const conMiembro = (corpus: CorpusParaFechar, slug: string): CorpusParaFechar => ({
    ...corpus,
    colecciones: corpus.colecciones.map((c) => ({ ...c, miembros: [...c.miembros, slug] })),
  });

  it('un rango que solo añade una Cita avisa solo su Cita, su Autor, sus Temas, sus Colecciones y su Obra', () => {
    const antes = conMiembro(corpusDeEjemplo({ cartas: 2 }), 'seneca-cartas-2');
    const despues = conMiembro(corpusDeEjemplo({ cartas: 3 }), 'seneca-cartas-2');
    const { rutas, avisos } = componerAviso({
      cambios: [alta('corpus/citas/seneca-cartas-2.md')],
      relacionAntes: relacionDeSuperficies(antes),
      relacionDespues: relacionDeSuperficies(despues),
      indexablesAntes: indexables(antes),
      indexablesDespues: indexables(despues),
    });
    expect(rutas.sort()).toEqual(
      ['/', '/cita/seneca-cartas-2/', '/autor/seneca/', '/tema/el-tiempo/', '/coleccion/breves/', CARTAS].sort(),
    );
    expect(avisos).toEqual([]);
  });

  it('un cambio que solo toca `aptaParaPortada` avisa la portada y nada más', () => {
    const corpus = corpusDeEjemplo();
    const relacion = relacionDeSuperficies(corpus);
    const v = { slug: 'seneca-cartas-0', autor: 'seneca', texto: 'T', aptaParaPortada: false };
    const { rutas } = componerAviso({
      cambios: [{ fichero: 'corpus/citas/seneca-cartas-0.md', antes: v, despues: { ...v, aptaParaPortada: true } }],
      relacionAntes: relacion,
      relacionDespues: relacion,
      indexablesAntes: indexables(corpus),
      indexablesDespues: indexables(corpus),
    });
    expect(rutas).toEqual(['/']);
  });

  it('un documento nuevo avisa su Obra y no la portada', () => {
    const corpus: CorpusParaFechar = {
      ...corpusDeEjemplo(),
      citas: corpusDeEjemplo().citas.map((c) =>
        c.obra === 'unamuno--niebla' ? { ...c, fuente: 'gutenberg', obraDeclarada: 'Niebla' } : c,
      ),
      documentos: ['corpus/fuentes/gutenberg--niebla.txt'],
    };
    const relacion = relacionDeSuperficies(corpus);
    expect(ficherosDe(relacion, NIEBLA)).toContain('corpus/fuentes/gutenberg--niebla.txt');
    const { rutas } = componerAviso({
      cambios: [{ fichero: 'corpus/fuentes/gutenberg--niebla.txt', antes: null, despues: versionDe('x') }],
      relacionAntes: relacion,
      relacionDespues: relacion,
      indexablesAntes: indexables(corpus),
      indexablesDespues: indexables(corpus),
    });
    expect(rutas).toEqual([NIEBLA]);
  });

  it('inversas: lo avisado de después, más lo de antes que sigue vivo, es exactamente lo que el commit refecha', () => {
    /*
     * Un solo commit con un alta, una baja y tres cambios de campos —uno que solo fecha el Autor,
     * uno que no fecha nada y un retitulado—. La fecha sale del historial con las bajas; el aviso,
     * de las dos relaciones. Si las dos lecturas divergieran en una sola ruta, esto lo diría.
     */
    const T0 = '2026-01-01T00:00:00.000Z';
    const T1 = '2026-02-01T00:00:00.000Z';
    const antes = corpusDeEjemplo();
    const despues = corpusDeEjemplo({ ira: false, cartas: 4 });

    const citas = new Map([...antes.citas, ...despues.citas].map((c) => [c.ruta, c]));
    const version = (fichero: string): Record<string, unknown> => {
      const cita = citas.get(fichero);
      return cita === undefined
        ? (versionDe(fichero) as Record<string, unknown>)
        : { slug: cita.slug, autor: cita.autor, temas: cita.temas, texto: fichero, aptaParaPortada: false };
    };
    const enT1: CambioDeFichero[] = [
      { fichero: 'corpus/citas/seneca-cartas-3.md', antes: null, despues: version('corpus/citas/seneca-cartas-3.md') },
      { fichero: 'corpus/citas/seneca-ira-0.md', antes: version('corpus/citas/seneca-ira-0.md'), despues: null },
      {
        fichero: 'corpus/autores/unamuno.yml',
        antes: version('corpus/autores/unamuno.yml'),
        despues: { ...version('corpus/autores/unamuno.yml'), semblanza: 'otra' },
      },
      {
        fichero: 'corpus/citas/seneca-suelta.md',
        antes: version('corpus/citas/seneca-suelta.md'),
        despues: { ...version('corpus/citas/seneca-suelta.md'), aptaParaPortada: true },
      },
      {
        fichero: 'corpus/obras/unamuno--niebla.yml',
        antes: version('corpus/obras/unamuno--niebla.yml'),
        despues: { ...version('corpus/obras/unamuno--niebla.yml'), titulo: 'otro' },
      },
    ];

    const historial = new Map<string, TransicionFechada[]>();
    for (const fichero of new Set([...ficherosDelCorpus(antes), ...ficherosDelCorpus(despues)])) {
      if (fichero === 'corpus/citas/seneca-cartas-3.md') continue;
      historial.set(fichero, [{ fecha: T0, antes: null, despues: version(fichero) }]);
    }
    for (const cambio of enT1) {
      historial.set(cambio.fichero, [{ fecha: T1, antes: cambio.antes, despues: cambio.despues }, ...(historial.get(cambio.fichero) ?? [])]);
    }

    const conBajas: CorpusParaFechar = {
      ...despues,
      bajas: bajasDelHistorial(historial, familiaDeFichero, new Set(ficherosDelCorpus(despues))),
    };
    const refechadas = [...fechasPorSuperficie(conBajas, historial)]
      .filter(([, fecha]) => fecha === T1)
      .map(([ruta]) => ruta)
      .sort();

    const relacionDespues = relacionDeSuperficies(despues);
    const rutasDespues = new Set(relacionDespues.keys());
    const avisadas = new Set([
      ...rutasAvisadasPor(enT1, relacionDespues),
      ...[...rutasAvisadasPor(enT1, relacionDeSuperficies(antes))].filter((r) => rutasDespues.has(r)),
    ]);
    expect([...avisadas].map(rutaNormalizada).sort()).toEqual(refechadas);
    // Y no es el conjunto vacío ni el sitio entero: la prueba mide algo.
    expect(refechadas).toContain('/autor/unamuno');
    expect(refechadas).toContain('/coleccion/breves');
    expect(refechadas).toContain('/cita/unamuno-niebla-1');
    expect(refechadas).not.toContain('/cita/seneca-suelta');
    expect(refechadas).not.toContain('/cita/seneca-cartas-0');
  });
});
