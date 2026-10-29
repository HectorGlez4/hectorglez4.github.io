import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { enlacesDe } from './ayuda/enlaces.js';
import { tarjetasDelListado } from './ayuda/listado.js';
import { leerTarjetaDeObra, tarjetaDeObraDe, textosDelEnlace } from './ayuda/tarjeta-de-obra.js';
import {
  citasDeTema,
  citasPorObra,
  siguienteCita,
  type Cita,
  type SiguienteCita,
  type Tema,
} from '../../src/lib/publicado.ts';
import { FILA_SIGUIENTE_DE_ESTA_OBRA, temaEnFrase, textoDeSiguiente } from '../../src/lib/atribucion.ts';
import type { ObraResuelta, PosicionesDeCitas } from '../../src/lib/obras.ts';

/**
 * Historia 24.5 — de una Cita a la siguiente del libro (FR-12, UX-DR65).
 *
 *   · **Sin construir**: cada fila de la matriz del spec contra `siguienteCita`, y los textos
 *     de `textoDeSiguiente` y `temaEnFrase`.
 *   · **Una construcción**: «Siguiente…» seguida de verdad en `dist/`, contra el orden del
 *     Listado de Obra y el listado de la Página de Tema que pintan sus páginas.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

/** El glifo de avance de la v8.3 y la flecha descartada, por su punto de código. */
const AVANCE = '›';
const FLECHA = '→';

// ─── La decisión, sin construir ──────────────────────────────────────────────

describe('Historia 24.5 — `siguienteCita`, sin construir', () => {
  const obra = (nombre: string, recuento: number): ObraResuelta => ({
    nombre,
    autor: nombre.split('--')[0],
    titulo: nombre,
    fuentes: ['wikisource-es'],
    edicionCotejada: true,
    temas: [],
    recuento,
  });
  const cita = (slug: string, autor: string, temas: string[], suObra?: ObraResuelta): Cita => ({
    slug,
    texto: `Texto de ${slug}.`,
    autor,
    temas,
    procedencia: {} as Cita['procedencia'],
    fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/X' } as Cita['fuente'],
    ...(suObra === undefined ? {} : { obra: suObra }),
    aptaParaPortada: false,
  });

  const LA_VIDA: Tema = { slug: 'la-vida', nombre: 'La vida' };
  const EL_DEBER: Tema = { slug: 'el-deber', nombre: 'El deber' };
  const PUBLICADOS: readonly Tema[] = [EL_DEBER, LA_VIDA];
  const sinListados = new Map<string, readonly Cita[]>();

  it('Obra de tres: sigue el orden del libro —no el de los slugs— y de la última a la primera', () => {
    const o = obra('seneca--brevedad', 3);
    const [zeta, alfa, mu] = ['seneca-zeta', 'seneca-alfa', 'seneca-mu'].map((s) => cita(s, 'seneca', ['la-vida'], o));
    const porObra = new Map([[o.nombre, [zeta, alfa, mu]]]);
    const destino = (c: Cita) => siguienteCita(c, porObra, PUBLICADOS, sinListados);
    expect(destino(zeta)).toEqual({ por: 'obra', cita: alfa });
    expect(destino(alfa)).toEqual({ por: 'obra', cita: mu });
    expect(destino(mu)).toEqual({ por: 'obra', cita: zeta });
    expect(textoDeSiguiente(destino(zeta)!)).toBe('Siguiente cita de esta obra');
  });

  it('Obra de dos: A → B y B → A', () => {
    const o = obra('seneca--cartas', 2);
    const [a, b] = ['seneca-b', 'seneca-a'].map((s) => cita(s, 'seneca', [], o));
    const porObra = new Map([[o.nombre, [a, b]]]);
    expect(siguienteCita(a, porObra, PUBLICADOS, sinListados)).toEqual({ por: 'obra', cita: b });
    expect(siguienteCita(b, porObra, PUBLICADOS, sinListados)).toEqual({ por: 'obra', cita: a });
  });

  /** Una Obra de una Cita, con su grupo de una. */
  function sola(slug: string, autor: string, temas: string[]) {
    const o = obra(`${autor}--${slug}`, 1);
    const c = cita(slug, autor, temas, o);
    return { cita: c, porObra: new Map([[o.nombre, [c]]]) };
  }

  it('Obra de una: la primera de otro Autor que le sigue en el listado de su Tema, saltando las suyas', () => {
    const x = sola('seneca-x', 'seneca', ['la-vida']);
    const w = cita('epicteto-w', 'epicteto', ['la-vida']);
    const y = cita('seneca-y', 'seneca', ['la-vida']);
    const z = cita('machado-z', 'machado', ['la-vida']);
    const listados = new Map([['la-vida', [w, x.cita, y, z]]]);
    const siguiente = siguienteCita(x.cita, x.porObra, PUBLICADOS, listados);
    expect(siguiente).toEqual({ por: 'tema', cita: z, tema: LA_VIDA });
    expect(textoDeSiguiente(siguiente!)).toBe('Siguiente cita sobre la vida');
  });

  it('Obra de una con solo Citas suyas detrás: da la vuelta al principio', () => {
    const x = sola('seneca-x', 'seneca', ['la-vida']);
    const w = cita('epicteto-w', 'epicteto', ['la-vida']);
    const y = cita('seneca-y', 'seneca', ['la-vida']);
    const listados = new Map([['la-vida', [w, x.cita, y]]]);
    expect(siguienteCita(x.cita, x.porObra, PUBLICADOS, listados)).toEqual({ por: 'tema', cita: w, tema: LA_VIDA });
  });

  it('el primer Tema declarado sin publicar no cuenta: usa el siguiente publicado', () => {
    const x = sola('seneca-x', 'seneca', ['la-amistad', 'la-vida']);
    const w = cita('epicteto-w', 'epicteto', ['la-amistad', 'la-vida']);
    const listados = new Map([['la-vida', [x.cita, w]]]);
    expect(siguienteCita(x.cita, x.porObra, PUBLICADOS, listados)).toEqual({ por: 'tema', cita: w, tema: LA_VIDA });
  });

  it('el primer Tema publicado sin otro Autor: no hay fila, y no se mira el segundo', () => {
    const x = sola('machado-x', 'machado', ['el-deber', 'la-vida']);
    const suyas = ['machado-a', 'machado-b'].map((s) => cita(s, 'machado', ['el-deber']));
    const otro = cita('epicteto-w', 'epicteto', ['la-vida']);
    const listados = new Map([
      ['el-deber', [suyas[0], x.cita, suyas[1]]],
      ['la-vida', [x.cita, otro]],
    ]);
    expect(siguienteCita(x.cita, x.porObra, PUBLICADOS, listados)).toBeUndefined();
  });

  it('Obra de una sin ningún Tema publicado, o con un Tema publicado de una sola Cita: no hay fila', () => {
    const x = sola('seneca-x', 'seneca', ['la-amistad']);
    expect(siguienteCita(x.cita, x.porObra, PUBLICADOS, new Map([['la-amistad', [x.cita]]]))).toBeUndefined();
    const sinTemas = sola('seneca-y', 'seneca', []);
    expect(siguienteCita(sinTemas.cita, sinTemas.porObra, PUBLICADOS, sinListados)).toBeUndefined();
    const solaEnSuTema = sola('seneca-z', 'seneca', ['la-vida']);
    expect(
      siguienteCita(solaEnSuTema.cita, solaEnSuTema.porObra, PUBLICADOS, new Map([['la-vida', [solaEnSuTema.cita]]])),
    ).toBeUndefined();
  });

  it('Cita sin Obra: `undefined`, aunque tenga Tema y vecinas', () => {
    const x = cita('seneca-x', 'seneca', ['la-vida']);
    const w = cita('epicteto-w', 'epicteto', ['la-vida']);
    expect(siguienteCita(x, new Map(), PUBLICADOS, new Map([['la-vida', [x, w]]]))).toBeUndefined();
  });

  it('nunca devuelve la propia Cita ni una del mismo Autor por la rama del Tema', () => {
    const x = sola('seneca-x', 'seneca', ['la-vida']);
    const suyas = ['seneca-a', 'seneca-b', 'seneca-c'].map((s) => cita(s, 'seneca', ['la-vida']));
    expect(siguienteCita(x.cita, x.porObra, PUBLICADOS, new Map([['la-vida', [...suyas, x.cita]]]))).toBeUndefined();
  });

  it('grupo roto: la Cita no está en el grupo de su Obra, o el grupo falta, y lanza nombrando Cita y ficha', () => {
    const o = obra('seneca--brevedad', 2);
    const x = cita('seneca-x', 'seneca', ['la-vida'], o);
    const otras = ['seneca-a', 'seneca-b'].map((s) => cita(s, 'seneca', ['la-vida'], o));
    const fuera = () => siguienteCita(x, new Map([[o.nombre, otras]]), PUBLICADOS, sinListados);
    expect(fuera).toThrow(/«seneca-x»[\s\S]*«seneca--brevedad»/);
    const sinGrupo = () => siguienteCita(x, new Map(), PUBLICADOS, sinListados);
    expect(sinGrupo).toThrow(/«seneca-x»[\s\S]*«seneca--brevedad»/);
  });

  it('listado roto: el Tema falta en `listados`, o la Cita no está en el suyo, y lanza nombrando Cita y Tema', () => {
    const x = sola('seneca-x', 'seneca', ['la-vida']);
    const w = cita('epicteto-w', 'epicteto', ['la-vida']);
    const sinElTema = () => siguienteCita(x.cita, x.porObra, PUBLICADOS, sinListados);
    expect(sinElTema).toThrow(/«seneca-x»[\s\S]*«la-vida»/);
    const sinLaCita = () => siguienteCita(x.cita, x.porObra, PUBLICADOS, new Map([['la-vida', [w]]]));
    expect(sinLaCita).toThrow(/«seneca-x»[\s\S]*«la-vida»/);
  });

  it('no depende del orden de `conjunto.citas`: los dos mapas salen de sus dueños, que ordenan', () => {
    const o = obra('seneca--brevedad', 3);
    const libro = ['seneca-c', 'seneca-a', 'seneca-b'];
    const deLaObra = libro.map((s) => cita(s, 'seneca', ['la-vida'], o));
    const suelta = sola('seneca-ira', 'seneca', ['la-vida']);
    const ajenas = ['epicteto-1', 'machado-2', 'aristoteles-3'].map((s) => cita(s, s.split('-')[0], ['la-vida']));
    const todas = [...deLaObra, suelta.cita, ...ajenas];
    const posiciones: PosicionesDeCitas = new Map(
      libro.map((slug, posicion) => [slug, [{ documento: 'wikisource-es--brevedad', posicion: posicion * 10 }]]),
    );
    const destinos = (citas: Cita[]) => {
      const porObra = citasPorObra(citas, posiciones);
      const listados = new Map([['la-vida', citasDeTema(citas, 'la-vida')]]);
      return Object.fromEntries(
        citas
          .map((c): [string, SiguienteCita | undefined] => [c.slug, siguienteCita(c, porObra, PUBLICADOS, listados)])
          .map(([slug, s]) => [slug, s === undefined ? null : `${s.por}:${s.cita.slug}`]),
      );
    };
    const directo = destinos(todas);
    expect(destinos([...todas].reverse())).toEqual(directo);
    expect(destinos([todas[3], todas[6], todas[0], todas[5], todas[2], todas[4], todas[1]])).toEqual(directo);
    expect(directo).toMatchObject({
      'seneca-c': 'obra:seneca-a',
      'seneca-a': 'obra:seneca-b',
      'seneca-b': 'obra:seneca-c',
      // En `citasDeTema`, por slug: …, seneca-a, seneca-b, seneca-c, seneca-ira; la vuelta lleva
      // a la primera ajena, aristoteles-3.
      'seneca-ira': 'tema:aristoteles-3',
    });
  });
});

describe('Historia 24.5 — los textos de «Siguiente…», sin construir', () => {
  it('`temaEnFrase` baja solo la primera letra', () => {
    expect(temaEnFrase('La vida')).toBe('la vida');
    expect(temaEnFrase('El tiempo')).toBe('el tiempo');
    expect(temaEnFrase('El arte de Roma')).toBe('el arte de Roma');
    expect(temaEnFrase('Ñ')).toBe('ñ');
    expect(temaEnFrase('Á')).toBe('á');
    expect(temaEnFrase('')).toBe('');
  });

  it('`textoDeSiguiente`, por la Obra o por el Tema, sin glifo', () => {
    const cita = { slug: 'x' } as Cita;
    expect(FILA_SIGUIENTE_DE_ESTA_OBRA).toBe('Siguiente cita de esta obra');
    expect(textoDeSiguiente({ por: 'obra', cita })).toBe(FILA_SIGUIENTE_DE_ESTA_OBRA);
    expect(textoDeSiguiente({ por: 'tema', cita, tema: { slug: 'el-deber', nombre: 'El deber' } })).toBe(
      'Siguiente cita sobre el deber',
    );
    for (const texto of [FILA_SIGUIENTE_DE_ESTA_OBRA, textoDeSiguiente({ por: 'tema', cita, tema: { slug: 'v', nombre: 'La vida' } })]) {
      expect(texto).not.toContain(AVANCE);
      expect(texto).not.toContain(FLECHA);
    }
  });
});

// ─── Una construcción ────────────────────────────────────────────────────────

const WS = 'https://es.wikisource.org/wiki/';
const AUTOR_MACHADO =
  'nombre: Antonio Machado\nañoNacimiento: 1875\nañoFallecimiento: 1939\nsemblanza: Poeta sevillano de la generación del 98.\nordenAlfabetico: Machado\n';
const AUTOR_EPICTETO = 'nombre: Epicteto\nañoNacimiento: 50\nañoFallecimiento: 135\nsemblanza: Filósofo estoico griego.\nordenAlfabetico: Epicteto\n';

/** Los números de los textos, con dos cifras: «la 1» no puede estar dentro de «la 11». */
const dos = (i: number) => String(i).padStart(2, '0');

/**
 * El fixture de las Design Notes del spec. El andamio siembra un documento por (Fuente, obra)
 * con los textos en el orden en que se insertan aquí, y ese es el orden del libro.
 */
function corpusDeSiguiente(): Record<string, string> {
  const corpus: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'autores/antonio-machado.yml': AUTOR_MACHADO,
    'autores/epicteto.yml': AUTOR_EPICTETO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'temas/la-vida.yml': 'nombre: La vida\n',
    'temas/el-deber.yml': 'nombre: El deber\n',
    'temas/la-amistad.yml': 'nombre: La amistad\n',
  };
  function sembrar(autor: string, clave: string, titulo: string, indices: number[], temas: string[]) {
    for (const i of indices) {
      corpus[`citas/${autor}--${clave}-${i}.md`] = citaValida({
        autor,
        slug: `${autor}-${clave}-${i}`,
        texto: `${titulo}, sentencia ${dos(i)}: cada una dice una cosa distinta, la ${dos(i)}.`,
        temas,
        procedencia: { obra: titulo, año: 60 },
        fuente: { id: 'wikisource-es', url: `${WS}${titulo.replaceAll(' ', '_')}` },
      });
    }
  }
  sembrar('seneca', 'brevedad', 'Sobre la brevedad de la vida', [3, 2, 1, 0], ['el-tiempo']);
  sembrar('seneca', 'cartas', 'Cartas a Lucilio', [0, 1], ['el-tiempo']);
  sembrar('seneca', 'vida-feliz', 'Sobre la vida feliz', [0, 1], ['la-vida']);
  sembrar('seneca', 'ira', 'De la ira', [0], ['la-amistad', 'la-vida']);
  sembrar('seneca', 'providencia', 'De la providencia', [0], ['la-amistad']);
  sembrar('epicteto', 'manual', 'Manual', [...Array(12).keys()], ['la-vida']);
  sembrar('epicteto', 'disertaciones', 'Disertaciones', [0], ['la-vida']);
  sembrar('antonio-machado', 'campos', 'Campos de Castilla', [...Array(15).keys()], ['el-deber']);
  sembrar('antonio-machado', 'soledades', 'Soledades', [0], ['el-deber', 'la-vida']);
  return corpus;
}

/** Una página sin sus `<style>` en línea: lo que se mira es el marcado. */
const sinHojas = (pagina: string) => pagina.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '');

describe('Historia 24.5 — «Siguiente…» en cada Página de Cita, construida', () => {
  let proyecto = '';
  const html = (ruta: string) => readFile(paginaConstruida(proyecto, ruta), 'utf8');

  /** Los slugs de un listado paginado, en orden y de todas sus páginas. */
  async function listadoEntero(ruta: string): Promise<string[]> {
    const slugs: string[] = [];
    for (let n = 1; ; n += 1) {
      const pagina = n === 1 ? ruta : `${ruta}${n}/`;
      if (!existsSync(paginaConstruida(proyecto, pagina))) break;
      slugs.push(...tarjetasDelListado(await html(pagina), pagina).map((t) => t.slug));
    }
    return slugs;
  }

  /** Lo que la tarjeta de una Página de Cita dice de «Siguiente…», si lo dice. */
  async function filaSiguiente(slug: string) {
    const tarjeta = tarjetaDeObraDe(await html(`/cita/${slug}/`));
    if (tarjeta === undefined) return { tarjeta, enlace: undefined };
    const enlace = enlacesDe(tarjeta).find((e) => e.declaracion !== null && 'zona' in e.declaracion && e.declaracion.zona === 'siguiente');
    return { tarjeta, enlace };
  }

  /** La ruta de la Obra de una Cita, por su fila «Ver la obra». */
  async function obraDe(slug: string): Promise<string> {
    const tarjeta = tarjetaDeObraDe(await html(`/cita/${slug}/`))!;
    const enlace = enlacesDe(tarjeta).find((e) => e.declaracion !== null && 'zona' in e.declaracion && e.declaracion.zona === 'tarjeta-de-obra');
    return enlace!.href!;
  }

  const slugDe = (href: string) => /^\/cita\/([^/]+)\/$/.exec(href)?.[1];

  beforeAll(async () => {
    const resultado = await construirConCorpus(corpusDeSiguiente());
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  }, 300_000);

  it('(a) en cada Obra de dos Citas o más, «Siguiente» recorre el Listado de Obra en orden y vuelve en n saltos', async () => {
    const citas = (await readdir(join(proyecto, 'dist', 'cita'))).sort();
    const obras = new Map<string, string[]>();
    for (const slug of citas) {
      const ruta = await obraDe(slug);
      obras.set(ruta, [...(obras.get(ruta) ?? []), slug]);
    }
    const recorridas: Record<string, string[]> = {};
    for (const [ruta, suyas] of obras) {
      if (suyas.length < 2) continue;
      const orden = await listadoEntero(ruta);
      expect(orden.slice().sort(), ruta).toEqual(suyas);
      let actual = orden[0];
      const recorrido = [actual];
      for (let salto = 0; salto < orden.length; salto += 1) {
        const { tarjeta, enlace } = await filaSiguiente(actual);
        expect(enlace, `${actual}: sin «Siguiente»`).toBeDefined();
        const destino = slugDe(enlace!.href!);
        expect(existsSync(paginaConstruida(proyecto, enlace!.href!)), `${actual} → ${enlace!.href}`).toBe(true);
        // El texto de la fila con zona `siguiente`, no del primer enlace a una Cita que aparezca.
        const interior = /<li class="fila-de-bloque" data-zona="siguiente"[^>]*><a\b[^>]*>([\s\S]*?)<\/a>/.exec(tarjeta!)![1];
        expect(textosDelEnlace(interior).lector, actual).toBe(FILA_SIGUIENTE_DE_ESTA_OBRA);
        actual = destino!;
        recorrido.push(actual);
      }
      // n saltos: las n en el orden del listado, y de vuelta a la de partida.
      expect(recorrido, ruta).toEqual([...orden, orden[0]]);
      recorridas[ruta] = orden;
    }
    // Y lo derivado de `dist/` es lo que dicen las Design Notes.
    expect(recorridas['/obra/seneca/sobre-la-brevedad-de-la-vida/']).toEqual([
      'seneca-brevedad-3',
      'seneca-brevedad-2',
      'seneca-brevedad-1',
      'seneca-brevedad-0',
    ]);
    expect(Object.keys(recorridas).sort()).toEqual([
      '/obra/antonio-machado/campos-de-castilla/',
      '/obra/epicteto/manual/',
      '/obra/seneca/cartas-a-lucilio/',
      '/obra/seneca/sobre-la-brevedad-de-la-vida/',
      '/obra/seneca/sobre-la-vida-feliz/',
    ]);
  });

  it('(b) en una Obra de una Cita, la primera de otro Autor que le sigue en el listado de su primer Tema publicado', async () => {
    const esperadas: Record<string, { tema: string; nombre: string; destino: string }> = {
      'epicteto-disertaciones-0': { tema: 'la-vida', nombre: 'la vida', destino: 'seneca-ira-0' },
      'seneca-ira-0': { tema: 'la-vida', nombre: 'la vida', destino: 'antonio-machado-soledades-0' },
    };
    const autorDe = (slug: string) => ['antonio-machado', 'epicteto', 'seneca'].find((a) => slug.startsWith(`${a}-`))!;
    for (const [slug, esperada] of Object.entries(esperadas)) {
      const { tarjeta, enlace } = await filaSiguiente(slug);
      expect(enlace, slug).toBeDefined();
      const destino = slugDe(enlace!.href!)!;
      expect(existsSync(paginaConstruida(proyecto, enlace!.href!)), `${slug} → ${enlace!.href}`).toBe(true);
      // Derivado del listado de `dist/`: la primera de otro Autor tras ella, con vuelta.
      const listado = await listadoEntero(`/tema/${esperada.tema}/`);
      const aqui = listado.indexOf(slug);
      expect(aqui, slug).toBeGreaterThan(-1);
      const tras = [...listado.slice(aqui + 1), ...listado.slice(0, aqui)];
      expect(destino, slug).toBe(tras.find((s) => autorDe(s) !== autorDe(slug)));
      expect(destino, slug).toBe(esperada.destino);
      const interior = /<li class="fila-de-bloque" data-zona="siguiente"[^>]*><a\b[^>]*>([\s\S]*?)<\/a>/.exec(tarjeta!)![1];
      expect(textosDelEnlace(interior).lector, slug).toBe(`Siguiente cita sobre ${esperada.nombre}`);
    }
    // El listado de `la-vida` es el de las Design Notes: 17 Citas, por slug.
    expect(await listadoEntero('/tema/la-vida/')).toHaveLength(17);
  });

  it('(b′) la fila sigue también en una Obra `noindex`: Disertaciones, De la ira y Campos de Castilla', async () => {
    for (const slug of ['epicteto-disertaciones-0', 'seneca-ira-0', 'antonio-machado-campos-0']) {
      const obra = await html(await obraDe(slug));
      expect(obra, slug).toContain('<meta name="robots" content="noindex, follow"');
      expect((await filaSiguiente(slug)).enlace, slug).toBeDefined();
    }
  });

  it('(c) sin a dónde ir no hay fila, y la tarjeta tiene una sola', async () => {
    for (const slug of ['seneca-providencia-0', 'antonio-machado-soledades-0']) {
      const { tarjeta, enlace } = await filaSiguiente(slug);
      expect(tarjeta, slug).toBeDefined();
      expect(enlace, slug).toBeUndefined();
      expect(tarjeta, slug).not.toContain('data-zona="siguiente"');
      const filas = leerTarjetaDeObra(tarjeta!).filas!;
      expect(filas.match(/<li\b/g), slug).toHaveLength(1);
      expect(filas, slug).toContain('data-zona="tarjeta-de-obra"');
    }
  });

  it('(d) la fila es el primer `li` de `ul.filas`, con su zona, sin `target`, con «›» oculto y nunca «→»', async () => {
    let conFila = 0;
    for (const slug of (await readdir(join(proyecto, 'dist', 'cita'))).sort()) {
      const { tarjeta, enlace } = await filaSiguiente(slug);
      expect(tarjeta, slug).not.toContain(FLECHA);
      if (enlace === undefined) continue;
      conFila += 1;
      const filas = leerTarjetaDeObra(tarjeta!).filas!;
      const items = [...filas.matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/g)];
      expect(items, slug).toHaveLength(2);
      // Astro añade su `data-astro-cid-…` detrás: lo que se mira es la clase y la zona.
      expect(items[0][1], slug).toMatch(/^ class="fila-de-bloque" data-zona="siguiente"(?: data-astro-cid-[a-z0-9]+)?$/);
      expect(items[1][1], slug).toMatch(/^ class="fila-de-bloque" data-zona="tarjeta-de-obra"(?: data-astro-cid-[a-z0-9]+)?$/);
      expect(enlace.declaracion, slug).toEqual({ zona: 'siguiente' });
      expect(enlace.target, slug).toBeUndefined();
      // El primer enlace de la tarjeta es «Siguiente»: va antes que «Ver la obra» al tabular.
      expect(enlacesDe(tarjeta!)[0].href, slug).toBe(enlace.href);
      const interior = /<a\b[^>]*>([\s\S]*?)<\/a>/.exec(items[0][2])![1];
      expect(interior, slug).toMatch(/^<span\b(?![^>]*aria-hidden)[^>]*>[^<]+<span aria-hidden="true"[^>]*>&nbsp;›<\/span><\/span>$/);
      const ocultos = [...interior.matchAll(/<span\b[^>]*aria-hidden="true"[^>]*>([\s\S]*?)<\/span>/g)].map((m) =>
        m[1].replace(/&nbsp;/g, ' '),
      );
      expect(ocultos, slug).toEqual([` ${AVANCE}`]);
      const lector = textosDelEnlace(interior).lector;
      expect(interior.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' '), slug).toBe(`${lector} ${AVANCE}`);
    }
    // 4 + 2 + 2 + 12 + 15 por la Obra, y Disertaciones y De la ira por el Tema.
    expect(conFila).toBe(37);
  });

  it('(e) ni la portada ni el 404 llevan «Siguiente»', async () => {
    for (const ruta of ['index.html', '404.html']) {
      const fichero = join(proyecto, 'dist', ruta);
      expect(existsSync(fichero), ruta).toBe(true);
      const marcado = sinHojas(await readFile(fichero, 'utf8'));
      expect(marcado, ruta).not.toContain('data-zona="siguiente"');
      expect(marcado, ruta).not.toContain('Siguiente cita');
    }
  });
});
