import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
} from './ayuda/construir.js';
import { MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';
import { MARCA_DE_JORNADA } from '../../tools/lib/alcance.ts';

/**
 * Historia 26.8 — la puerta de NFR-5 del build, sobre sitios construidos de verdad.
 *
 * Tres construcciones: la sana, que informa con una línea fija —y avisa de la Cita que solo la
 * lista de Autores de la portada alcanza—; una con la portada parcheada
 * sin su lista de Autores —lo que la Épica 28 hará—, que deja una Cita de la página 2 de su
 * Autor a cuatro saltos y rompe nombrándola con su Tema bajo umbral; y una con la Paginación
 * sin los números y la Fila de Autor sin enlace, que rompe nombrando las aristas del modelo que
 * faltan.
 */

const pad = (n: number) => String(n).padStart(3, '0');

/**
 * `n` Citas de Séneca, todas de «Sobre la brevedad de la vida» y en el orden del documento igual
 * que el de slug, así que la página 2 del Autor es también la 2 de la Obra. Ninguna tiene Tema
 * publicado: las tres últimas son de «La ira», que no llega. La primera es apta para portada:
 * hay Cita del Día.
 *
 * El Tema publicado, «El tiempo», es de `MIN_CITAS_POR_TEMA` Citas de **Epicteto**, de otra
 * Obra: así las Citas a dos saltos de la portada no llevan, por sus Rutas de salida, a ninguna
 * de Séneca, y lo único que acerca la página 2 de Séneca es la lista de Autores de la portada.
 */
function corpusDeSeneca(n: number): Record<string, string> {
  const corpus: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'autores/epicteto.yml': [
      'nombre: Epicteto',
      'añoNacimiento: 50',
      'añoFallecimiento: 135',
      'semblanza: Filósofo estoico griego, esclavo liberto y maestro en Nicópolis.',
      'ordenAlfabetico: Epicteto',
      '',
    ].join('\n'),
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'temas/la-ira.yml': 'nombre: La ira\n',
  };
  for (let i = 1; i <= n; i += 1) {
    corpus[`citas/seneca--fragmento-${pad(i)}.md`] = citaValida({
      slug: `seneca-fragmento-${pad(i)}`,
      texto: `Fragmento ${pad(i)} sobre la brevedad de la vida, que es larga si sabes usarla.`,
      temas: i > n - 3 ? ['la-ira'] : [],
      aptaParaPortada: i === 1 ? true : undefined,
    });
  }
  for (let i = 1; i <= MIN_CITAS_POR_TEMA; i += 1) {
    corpus[`citas/epicteto--maxima-${pad(i)}.md`] = citaValida({
      slug: `epicteto-maxima-${pad(i)}`,
      autor: 'epicteto',
      texto: `Máxima ${pad(i)}: no te turban las cosas, sino las opiniones que tienes de ellas.`,
      temas: ['el-tiempo'],
      procedencia: { obra: 'Enquiridión', año: 125 },
      fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Enquiridi%C3%B3n' },
    });
  }
  return corpus;
}

/** Las páginas HTML de un `dist/`, por su ruta relativa, con su contenido. */
async function htmlDe(dist: string): Promise<Map<string, string>> {
  const ficheros = (await readdir(dist, { recursive: true, withFileTypes: true })).filter(
    (e) => e.isFile() && e.name.endsWith('.html'),
  );
  return new Map(
    await Promise.all(
      ficheros.map(async (e) => {
        const completa = join(e.parentPath, e.name);
        return [relative(dist, completa), await readFile(completa, 'utf8')] as const;
      }),
    ),
  );
}

describe('Historia 26.8 — el build sano', () => {
  let proyecto: string;
  let salida: string;

  beforeAll(async () => {
    const resultado = await construirConCorpus(corpusDeSeneca(51), { jornada: '2026-10-28' });
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
    salida = resultado.salida;
  });

  afterAll(async () => {
    if (proyecto) await limpiar(proyecto);
  });

  it('informa con una línea fija: superficies medidas y aristas del modelo contenidas', () => {
    // 66 Citas, dos Autores, los dos Directorios, «El tiempo», dos Obras y la portada.
    expect(salida).toMatch(
      /NFR-5: 74 superficies publicadas, todas a 3 saltos o menos de la portada; las \d+ aristas del modelo están en dist\//,
    );
  });

  it('avisa, sin romper, de la Cita que solo alcanza la lista de Autores de la portada', () => {
    // La 051 está en la página 2 de Séneca y de su Obra, y «La ira» no llega: en el modelo
    // —sin esa lista, como la dejará la Épica 28— queda a cuatro saltos.
    expect(salida).toMatch(/NFR-5 en el modelo: 1 Cita queda a más de 3 saltos de la portada/);
    expect(salida).toContain(
      `/cita/seneca-fragmento-051 — su Tema «La ira» (la-ira) tiene 3 Citas, por debajo de ` +
        `MIN_CITAS_POR_TEMA (${MIN_CITAS_POR_TEMA})`,
    );
  });

  it('data-jornada va solo en la portada y el 404, una vez, con «Ver esta cita» dentro', async () => {
    const paginas = await htmlDe(join(proyecto, 'dist'));
    const conMarca = [...paginas].filter(([, html]) => html.includes('data-jornada'));
    expect(conMarca.map(([ruta]) => ruta).sort()).toEqual(['404.html', 'index.html']);
    for (const [ruta, html] of conMarca) {
      expect(html.split('data-jornada').length - 1, ruta).toBe(1);
      const marca = html.indexOf('data-jornada');
      const seccion = html.slice(html.lastIndexOf('<section', marca), html.indexOf('</section>', marca));
      expect(seccion, ruta).toMatch(/^<section class="del-dia" data-jornada /);
      expect(seccion, ruta).toContain('data-zona="cita-del-dia"');
      expect(seccion, ruta).toContain('Ver esta cita');
    }
    // El lote marca sus jornadas con otro atributo: la marca queda libre para lo que rota.
    expect(paginas.get('lote/index.html')).not.toContain('data-jornada');
  });

  it('entre las fuentes de src/ y public/, solo CitaDelDia.astro nombra la marca que el grafo salta', async () => {
    // La marca es la de `MARCA_DE_JORNADA`: si el componente y el grafo la llamaran distinto, el
    // grafo dejaría de saltar la Cita del Día y esto lo diría.
    const entradas = [
      ...(await readdir(join(RAIZ, 'src'), { recursive: true, withFileTypes: true })),
      ...(await readdir(join(RAIZ, 'public'), { recursive: true, withFileTypes: true })),
    ];
    const fuentes = entradas
      .filter((e) => e.isFile() && !/\.(?:png|jpe?g|webp|gif|ico|woff2?|ttf|otf|pdf)$/iu.test(e.name))
      .map((e) => join(e.parentPath, e.name))
      .filter((ruta) => readFileSync(ruta, 'utf8').includes(MARCA_DE_JORNADA));
    expect(fuentes.map((ruta) => relative(RAIZ, ruta))).toEqual(['src/components/CitaDelDia.astro']);
    expect(readFileSync(join(RAIZ, 'src/components/CitaDelDia.astro'), 'utf8')).toMatch(
      new RegExp(`<section class="del-dia" ${MARCA_DE_JORNADA} `),
    );
  });
});

describe('Historia 26.8 — la portada sin su lista de Autores', () => {
  let proyecto: string | undefined;

  afterAll(async () => {
    if (proyecto) await limpiar(proyecto);
  });

  it('rompe nombrando la Cita de la página 2 y su Tema con su recuento', async () => {
    const portada = readFileSync(join(RAIZ, 'src/pages/index.astro'), 'utf8');
    const sinAutores = portada.replace(
      /\n {4}<section data-pagefind-ignore="all">\n {6}<h2>Autores<\/h2>[\s\S]*?<\/section>\n/u,
      '\n',
    );
    const resultado = await construirConCorpus(corpusDeSeneca(51), {
      jornada: '2026-10-28',
      ficheros: { 'src/pages/index.astro': sinAutores },
    });
    proyecto = resultado.proyecto;

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.salida).toMatch(
      /NFR-5: 1 superficie publicada a más de 3 saltos de la portada y 0 aristas del modelo/,
    );
    expect(resultado.salida).toContain(
      `/cita/seneca-fragmento-051 — su Tema «La ira» (la-ira) tiene 3 Citas, por debajo de ` +
        `MIN_CITAS_POR_TEMA (${MIN_CITAS_POR_TEMA})`,
    );
  });
});

describe('Historia 26.8 — la Paginación sin los números y el Directorio de Autores sin enlaces', () => {
  let proyecto: string | undefined;

  afterAll(async () => {
    if (proyecto) await limpiar(proyecto);
  });

  it('rompe nombrando cada arista origen → destino que el modelo pide y dist/ no tiene', async () => {
    const paginacion = readFileSync(join(RAIZ, 'src/components/Paginacion.astro'), 'utf8');
    const sinNumeros = paginacion.replace(/<ol class="numeros">[\s\S]*?<\/ol>/u, '');
    // Y la Fila de Autor sin su enlace: la fila de `/autores/` sigue, pero ya no lleva a ninguna parte.
    const fila = readFileSync(join(RAIZ, 'src/components/FilaDeAutor.astro'), 'utf8');
    const filaSinEnlace = fila.replace('<FilaDeBloque href={ruta} ', '<FilaDeBloque href={undefined} ');
    expect(filaSinEnlace).not.toBe(fila);
    const resultado = await construirConCorpus(corpusDeSeneca(101), {
      jornada: '2026-10-28',
      ficheros: {
        'src/components/Paginacion.astro': sinNumeros,
        'src/components/FilaDeAutor.astro': filaSinEnlace,
      },
    });
    proyecto = resultado.proyecto;

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.salida).toMatch(/NFR-5: .* y \d+ aristas del modelo que faltan en dist\//);
    // Anterior y Siguiente siguen: lo que falta es saltar de la 1 a la 3 y de la 3 a la 1.
    for (const arista of [
      '/autor/seneca → /autor/seneca/3',
      '/autor/seneca/3 → /autor/seneca',
      '/obra/seneca/sobre-la-brevedad-de-la-vida → /obra/seneca/sobre-la-brevedad-de-la-vida/3',
      // La fila del Directorio: la portada sigue llevando a Séneca, pero el modelo pide esta.
      '/autores → /autor/seneca',
      '/autores → /autor/epicteto',
    ]) {
      expect(resultado.salida).toContain(`  · ${arista}`);
    }
    expect(resultado.salida).not.toContain('  · /autor/seneca → /autor/seneca/2');
  });
});
