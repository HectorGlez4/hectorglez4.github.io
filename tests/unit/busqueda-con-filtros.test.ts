import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { indiceDe, type IndiceDePagefind } from './ayuda/pagefind.ts';
import { etiquetasDeGuionExterno, guionesEjecutables, guionesEnLinea } from './ayuda/guion.js';
import { recorrerElementos } from '../../tools/lib/html.ts';
import { conjuntoDelCorpus } from '../../tools/lib/alcance.ts';
import { rutasDelCorpus } from '../../tools/lib/corpus.ts';
import {
  EJEMPLO_DE_LA_BUSQUEDA,
  ETIQUETA_DE_LA_BUSQUEDA,
  TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA,
  combinacionDeFiltros,
  filtrosDePagefind,
  fraseDelRecuento,
  hayFiltros,
  valoresDeFiltros,
} from '../../src/lib/busqueda.ts';
import { guionExternoDe } from '../../src/lib/guiones.ts';
import { ARRANQUE_DE_MEDICION, rutaDelGuionDeMedicion } from '../../src/lib/medicion.ts';
import {
  claveDeComparacion,
  normalizar,
  ordenDeAutoresPorNombre,
  ordenDeTemasPorNombre,
} from '../../src/lib/normalizar.ts';
import { temaEnFrase } from '../../src/lib/recuentos.ts';
import { temaEnFrase as temaEnFraseDeAtribucion } from '../../src/lib/atribucion.ts';
import { FILTROS_DE_CITA, FILTRO_DE_TIPO, ORDEN_DE_CITA } from '../../src/lib/tipoDeResultado.ts';
import { MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';
import { decodificar } from './ayuda/listado.ts';

/**
 * Historia 27.2 — la búsqueda se acota por Autor y por Tema.
 *
 * Tres partes, como la historia:
 *
 *   · lo **puro** de `src/lib/busqueda.ts` —la frase del recuento, los `filters` de Pagefind, la
 *     combinación que viaja en la `busqueda` y los valores de su clave— y las dos órdenes nuevas de
 *     `src/lib/normalizar.ts` para los selectores;
 *   · el **Corpus en disco**: el ejemplo del campo («no hay camino») tiene que dar resultados;
 *   · lo **construido**: `/buscar/` sin guion propio en línea, con el fichero de la búsqueda detrás
 *     del de medición y la plantilla con sus dos selectores; y el índice que Pagefind generó, que
 *     con `filters` (y `search(null)` ordenado por la clave) da justo las Citas de lo filtrado.
 *
 * Lo que la isla **hace** —cuándo busca, qué pinta, qué anuncia y qué asienta— lo prueba el entorno
 * simulado en `tests/unit/medicion.test.ts`, ejecutando este mismo fichero de `dist/`.
 */

describe('Historia 27.2 — lo puro: la frase del recuento', () => {
  it('sin filtros, la de siempre, con el total', () => {
    expect(fraseDelRecuento({ total: 28, texto: 'vida' })).toBe('28 resultados.');
    expect(fraseDelRecuento({ total: 1, texto: 'vida' })).toBe('Un resultado.');
  });

  it('con filtros nombra lo filtrado: Autor, Tema en minúscula y el texto recortado entre comillas', () => {
    expect(fraseDelRecuento({ total: 222, texto: '', autor: 'José Martí' })).toBe('222 citas de José Martí.');
    expect(fraseDelRecuento({ total: 8, texto: '   ', autor: 'José Martí', tema: 'La prudencia' })).toBe(
      '8 citas de José Martí sobre la prudencia.',
    );
    expect(fraseDelRecuento({ total: 6, texto: ' escuela ', tema: 'El saber' })).toBe('6 citas sobre el saber con «escuela».');
    expect(fraseDelRecuento({ total: 3, texto: 'vida', autor: 'Séneca', tema: 'El tiempo' })).toBe(
      '3 citas de Séneca sobre el tiempo con «vida».',
    );
  });

  it('en singular, «Una cita»', () => {
    expect(fraseDelRecuento({ total: 1, texto: '', autor: 'Séneca' })).toBe('Una cita de Séneca.');
    expect(fraseDelRecuento({ total: 1, texto: 'x', tema: 'La vida' })).toBe('Una cita sobre la vida con «x».');
  });

  it('el Tema pasa por `temaEnFrase`, que vive en `recuentos.ts` y `atribucion.ts` reexporta: una sola regla', () => {
    expect(temaEnFraseDeAtribucion).toBe(temaEnFrase);
    expect(fraseDelRecuento({ total: 2, texto: '', tema: 'Ñandú' })).toBe(`2 citas sobre ${temaEnFrase('Ñandú')}.`);
    const fuente = readFileSync(join(RAIZ, 'src/lib/recuentos.ts'), 'utf8');
    expect(fuente).not.toMatch(/^import\b/mu);
  });

  it('lo tecleado va tal cual: la frase no escapa nada porque se pinta por `textContent`', () => {
    expect(fraseDelRecuento({ total: 2, texto: '<b>vida</b>', autor: 'Séneca' })).toBe('2 citas de Séneca con «<b>vida</b>».');
  });
});

describe('Historia 27.2 — lo puro: los filtros', () => {
  const NADA = { autor: '', tema: '' };

  it('`filters` de Pagefind: solo lo elegido, con los nombres de la 27.1', () => {
    expect(filtrosDePagefind(NADA)).toEqual({});
    expect(filtrosDePagefind({ autor: 'jose-marti', tema: '' })).toEqual({ [FILTROS_DE_CITA.autor]: 'jose-marti' });
    expect(filtrosDePagefind({ autor: '', tema: 'la-prudencia' })).toEqual({ [FILTROS_DE_CITA.tema]: 'la-prudencia' });
    expect(filtrosDePagefind({ autor: 'jose-marti', tema: 'la-prudencia' })).toEqual({
      [FILTROS_DE_CITA.autor]: 'jose-marti',
      [FILTROS_DE_CITA.tema]: 'la-prudencia',
    });
  });

  it('la combinación del vocabulario y los valores de la clave', () => {
    expect(hayFiltros(NADA)).toBe(false);
    expect(combinacionDeFiltros(NADA)).toBe('ninguno');
    expect(combinacionDeFiltros({ autor: 'a', tema: '' })).toBe('autor');
    expect(combinacionDeFiltros({ autor: '', tema: 't' })).toBe('tema');
    expect(combinacionDeFiltros({ autor: 'a', tema: 't' })).toBe('autor-tema');
    expect(valoresDeFiltros(NADA)).toBeUndefined();
    expect(valoresDeFiltros({ autor: 'a', tema: '' })).not.toBe(valoresDeFiltros({ autor: '', tema: 'a' }));
    expect(valoresDeFiltros({ autor: 'jose-marti', tema: '' })).not.toBe(valoresDeFiltros({ autor: 'seneca', tema: '' }));
  });

  it('los textos fijos del campo', () => {
    expect(ETIQUETA_DE_LA_BUSQUEDA).toBe('Escribe un fragmento, un autor o un tema.');
    expect(TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA).toBe('Por ejemplo: no hay camino');
    expect(EJEMPLO_DE_LA_BUSQUEDA).toBe('no hay camino');
  });
});

describe('Historia 27.2 — los órdenes de los selectores', () => {
  const op = (valor: string, rotulo: string) => ({ valor, rotulo });

  it('Autor por el nombre tal como se lee, no por la clave del Directorio: «José Martí» con la J', () => {
    const autores = [op('seneca', 'Séneca'), op('jose-marti', 'José Martí'), op('amado-nervo', 'Amado Nervo')];
    expect(ordenDeAutoresPorNombre(autores).map((a) => a.valor)).toEqual(['amado-nervo', 'jose-marti', 'seneca']);
    // Con la clave del Directorio («Martí», «Nervo») Martí iría antes que Nervo: no es este orden.
    expect(claveDeComparacion('Martí') < claveDeComparacion('Nervo')).toBe(true);
  });

  it('sin tildes, la eñe en su sitio, por unidades de código y desempate por el valor', () => {
    const autores = [op('b', 'Ñuño'), op('c', 'Nuria'), op('a', 'Ángel'), op('z', 'Óscar'), op('d', 'Oscar')];
    expect(ordenDeAutoresPorNombre(autores).map((a) => a.rotulo)).toEqual(['Ángel', 'Nuria', 'Ñuño', 'Oscar', 'Óscar']);
  });

  it('Tema por el nombre con su artículo', () => {
    const temas = [op('la-vida', 'La vida'), op('el-tiempo', 'El tiempo'), op('la-amistad', 'La amistad')];
    expect(ordenDeTemasPorNombre(temas).map((t) => t.valor)).toEqual(['el-tiempo', 'la-amistad', 'la-vida']);
  });

  it('puros y deterministas: el mismo orden ante cualquier permutación, y sin tocar la entrada', () => {
    const autores = [op('b', 'Séneca'), op('a', 'Séneca'), op('c', 'Ángel'), op('d', 'José Martí'), op('e', 'Amado Nervo')];
    const esperado = ordenDeAutoresPorNombre(autores).map((a) => a.valor);
    expect(esperado).toEqual(['e', 'c', 'd', 'a', 'b']);
    const copia = [...autores];
    // Las 120 permutaciones, todas: reproducible, y sin dejar ninguna al azar.
    const permutaciones = <T,>(lista: readonly T[]): T[][] =>
      lista.length <= 1 ? [[...lista]] : lista.flatMap((x, i) => permutaciones([...lista.slice(0, i), ...lista.slice(i + 1)]).map((resto) => [x, ...resto]));
    const todas = permutaciones(autores);
    expect(todas).toHaveLength(120);
    for (const permutada of todas) {
      expect(ordenDeAutoresPorNombre(permutada).map((a) => a.valor)).toEqual(esperado);
      expect(ordenDeTemasPorNombre(permutada).map((a) => a.valor)).toEqual(esperado);
    }
    expect(autores).toEqual(copia);
  });
});

describe('Historia 27.2 — el ejemplo del campo da resultados con el Corpus de verdad', () => {
  it('alguna Cita publicada contiene «no hay camino»', async () => {
    const conjunto = await conjuntoDelCorpus(rutasDelCorpus(join(RAIZ, 'corpus')));
    const buscado = normalizar(EJEMPLO_DE_LA_BUSQUEDA);
    const con = conjunto.citas.filter((cita) => normalizar(cita.texto).includes(buscado));
    expect(con.length, 'ninguna Cita publicada dice el ejemplo del campo').toBeGreaterThan(0);
  }, 120_000);
});

/*
 * Lo construido. Un Corpus con tres Autores cuyo orden por nombre no es el del Directorio (Amado
 * Nervo, «Nervo», va antes que José Martí, «Martí», al leerse), un Autor sin Citas, dos Temas
 * publicados y uno bajo su umbral, construido con la medición y con Pagefind.
 */
const ENDPOINT = 'https://medicion.ejemplo.workers.dev/e';
const AUTORES: Record<string, { nombre: string; orden: string; obra: string; citas: number }> = {
  seneca: { nombre: 'Séneca', orden: 'Séneca', obra: 'Sobre la brevedad de la vida', citas: 9 },
  'jose-marti': { nombre: 'José Martí', orden: 'Martí', obra: 'Versos sencillos', citas: 7 },
  'amado-nervo': { nombre: 'Amado Nervo', orden: 'Nervo', obra: 'La amada inmóvil', citas: 4 },
};
const yamlDeAutor = (nombre: string, orden: string) =>
  `nombre: ${nombre}\nañoNacimiento: 1850\nañoFallecimiento: 1900\nsemblanza: Escritor del catálogo de prueba.\nordenAlfabetico: ${orden}\n`;

interface CitaDelFixture {
  slug: string;
  autor: string;
  temas: string[];
}
const CITAS: CitaDelFixture[] = Object.entries(AUTORES).flatMap(([autor, { citas }], a) =>
  Array.from({ length: citas }, (_, i) => ({
    slug: `${autor}-frase-${String(i).padStart(2, '0')}`,
    autor,
    // Todas en «El tiempo»; «La vida» en todas salvo la primera de cada Autor; «La ira», en una.
    temas: ['el-tiempo', ...(i >= 1 ? ['la-vida'] : []), ...(a === 0 && i === 0 ? ['la-ira'] : [])],
  })),
);
const textoDe = (cita: CitaDelFixture) => `Frase ${cita.slug.slice(-2)} de ${AUTORES[cita.autor].nombre}: escuela del catálogo.`;

const CORPUS: Record<string, string> = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'autores/jose-marti.yml': yamlDeAutor('José Martí', 'Martí'),
  'autores/amado-nervo.yml': yamlDeAutor('Amado Nervo', 'Nervo'),
  // Un Autor sin Citas publicadas: no es opción.
  'autores/fray-luis-de-leon.yml': yamlDeAutor('Fray Luis de León', 'León'),
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'temas/la-vida.yml': 'nombre: La vida\n',
  'temas/la-ira.yml': 'nombre: La ira\n',
  ...Object.fromEntries(
    CITAS.map((cita) => [
      `citas/${cita.slug}.md`,
      citaValida({
        slug: cita.slug,
        autor: cita.autor,
        texto: textoDe(cita),
        temas: cita.temas,
        procedencia: { obra: AUTORES[cita.autor].obra, año: 1890 },
        fuente: { id: 'wikisource-es', url: `https://es.wikisource.org/wiki/${encodeURIComponent(AUTORES[cita.autor].obra)}` },
      }),
    ]),
  ),
};

/** Las rutas de Cita que enlaza el listado de un Autor, todas sus páginas. */
function citasDelListado(dist: string, autor: string): Set<string> {
  const raiz = join(dist, 'autor', autor);
  const paginas = [join(raiz, 'index.html')];
  for (const entrada of readdirSync(raiz)) {
    if (/^\d+$/u.test(entrada) && statSync(join(raiz, entrada)).isDirectory()) paginas.push(join(raiz, entrada, 'index.html'));
  }
  const rutas = new Set<string>();
  for (const pagina of paginas) {
    for (const [, href] of readFileSync(pagina, 'utf8').matchAll(/href="(\/cita\/[^"#?]+)"/gu)) rutas.add(decodificar(href));
  }
  return rutas;
}

/** La ruta de Cita de una URL de resultado, con su barra final. */
const rutaDe = (url: string) => url.replace(/(?:index)?\.html$/u, '').replace(/\/?$/u, '/');

describe('Historia 27.2 — lo construido', () => {
  let proyecto = '';
  let html = '';
  let indice: (IndiceDePagefind & { soltar(): void }) | undefined;

  beforeAll(async () => {
    const resultado = await construirConCorpus(CORPUS, { conBusqueda: true, entorno: { MEDICION_ENDPOINT: ENDPOINT } });
    proyecto = resultado.proyecto;
    expect(resultado.codigo, resultado.salida).toBe(0);
    html = readFileSync(paginaConstruida(proyecto, '/buscar/'), 'utf8');
    indice = await indiceDe(proyecto);
  }, 300_000);

  afterAll(async () => {
    indice?.soltar();
    if (proyecto) await limpiar(proyecto);
  });

  it('`/buscar/` no lleva guion propio en línea: solo el arranque de la medición', () => {
    expect(guionesEnLinea(html)).toEqual([ARRANQUE_DE_MEDICION]);
    expect(html).not.toContain('define:vars');
    expect(html).not.toMatch(/<script\b[^>]*type="module"[^>]*>[^<]/u);
  });

  it('pide el fichero de la búsqueda con `<script type="module" src>`, detrás del de medición, y el fichero existe', () => {
    const guiones = guionesEjecutables(html);
    const deMedicion = guiones.findIndex((g) => g.atributos.includes(rutaDelGuionDeMedicion(ENDPOINT)));
    const deLaBusqueda = guiones.findIndex((g) => /\bsrc="\/_astro\/Busqueda\.astro_astro_type_script_index_0_lang\.[^"]+\.js"/u.test(g.atributos));
    expect(deMedicion).toBeGreaterThanOrEqual(0);
    expect(deLaBusqueda).toBeGreaterThan(deMedicion);
    expect(guiones[deLaBusqueda].atributos).toMatch(/\btype="module"/u);
    const etiqueta = etiquetasDeGuionExterno(html).find((e) => guionExternoDe(e.src)?.id === 'busqueda');
    expect(etiqueta).toBeDefined();
    expect(statSync(join(proyecto, 'dist', etiqueta!.src)).isFile()).toBe(true);
  });

  it('la plantilla lleva el campo, los dos selectores con sus opciones del build y «Quitar los filtros» oculto', () => {
    const plantilla = /<template\b[^>]*>([\s\S]*?)<\/template>/u.exec(html)?.[1];
    expect(plantilla, 'no hay plantilla').toBeDefined();
    const selectores = new Map<string, { valor: string; rotulo: string }[]>();
    const campos: ReadonlyMap<string, string>[] = [];
    const botones: ReadonlyMap<string, string>[] = [];
    recorrerElementos(`<div>${plantilla}</div>`, (elemento) => {
      if (elemento.etiqueta === 'input') campos.push(elemento.atributos);
      if (elemento.etiqueta === 'button') botones.push(elemento.atributos);
    });
    for (const [, id, cuerpo] of plantilla!.matchAll(/<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gu)) {
      selectores.set(
        id,
        [...cuerpo.matchAll(/<option\b[^>]*\bvalue="([^"]*)"[^>]*>([^<]*)<\/option>/gu)].map((m) => ({
          valor: decodificar(m[1]),
          rotulo: decodificar(m[2]),
        })),
      );
    }
    const leyenda = /<legend\b[^>]*class="solo-para-lectores"[^>]*>([^<]*)<\/legend>/u.exec(plantilla!)?.[1] ?? '';

    expect([...selectores.keys()].sort()).toEqual(['filtro-de-autor', 'filtro-de-tema']);
    // Solo los Autores con Citas publicadas, por el nombre como se lee; primero «Todos los autores».
    expect(selectores.get('filtro-de-autor')).toEqual([
      { valor: '', rotulo: 'Todos los autores' },
      { valor: 'amado-nervo', rotulo: 'Amado Nervo' },
      { valor: 'jose-marti', rotulo: 'José Martí' },
      { valor: 'seneca', rotulo: 'Séneca' },
    ]);
    // Solo los Temas publicados —«La ira», con una Cita, no—, con su artículo; primero «Todos los temas».
    expect(MIN_CITAS_POR_TEMA).toBeGreaterThan(1);
    expect(selectores.get('filtro-de-tema')).toEqual([
      { valor: '', rotulo: 'Todos los temas' },
      { valor: 'el-tiempo', rotulo: 'El tiempo' },
      { valor: 'la-vida', rotulo: 'La vida' },
    ]);
    expect(leyenda).toBe('Filtrar las citas');
    expect(plantilla).toMatch(/<label\b[^>]*for="filtro-de-autor"[^>]*>Autor<\/label>/u);
    expect(plantilla).toMatch(/<label\b[^>]*for="filtro-de-tema"[^>]*>Tema<\/label>/u);
    expect(plantilla).toContain(`>${ETIQUETA_DE_LA_BUSQUEDA}</label>`);

    expect(campos).toHaveLength(1);
    expect(campos[0].get('name')).toBe('q');
    expect(campos[0].get('placeholder')).toBe(TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA);
    expect(campos[0].has('data-consulta')).toBe(true);
    expect(botones).toHaveLength(1);
    expect(botones[0].get('type')).toBe('button');
    expect(botones[0].has('hidden')).toBe(true);
    expect(plantilla).toMatch(/<button\b[^>]*>Quitar los filtros<\/button>/u);
    // La lista de resultados es una lista, con su zona; la región está desde la carga, vacía.
    expect(html).toMatch(/<ul class="resultados" role="list" data-resultados data-zona="resultado"/u);
    expect(html).toMatch(/<p class="estado" role="status" data-estado[^>]*><\/p>/u);
  });

  it('cada elemento que busca el fichero de la búsqueda está en lo construido, donde lo busca', () => {
    /*
     * Revisión de la 27.2 — el guion encuentra lo que usa por selectores y, si falta uno, no
     * arranca: `/buscar/` se queda en el `h1`. El entorno simulado de `medicion.test.ts` sirve sus
     * propios elementos, así que aquí se cruzan los selectores que lleva el fichero construido con
     * el HTML construido. Un selector nuevo en el guion pone esto en rojo hasta decir dónde va.
     */
    const etiqueta = etiquetasDeGuionExterno(html).find((e) => guionExternoDe(e.src)?.id === 'busqueda');
    expect(etiqueta).toBeDefined();
    const guion = readFileSync(join(proyecto, 'dist', etiqueta!.src), 'utf8');
    const buscados = new Set([...guion.matchAll(/\.querySelector(?:All)?\(\s*(["'`])([^"'`]+)\1\s*\)/gu)].map((m) => m[2]));
    // La del `nonce` la busca el envoltorio que el empaquetado pone a todo `import()`, no la isla.
    buscados.delete('meta[property=csp-nonce]');
    // Lo que busca en lo que clona de la plantilla, y lo que busca en la página.
    const EN_LA_PLANTILLA = ['form', '[data-consulta]', '[data-selector-de-autor]', '[data-selector-de-tema]', '[data-quitar]', '.sombra'];
    const EN_LA_PAGINA = ['[data-busqueda]', 'template', '[data-resultados]', '[data-estado]', '[data-salida]', '.sugerencia'];
    expect([...buscados].sort()).toEqual([...EN_LA_PLANTILLA, ...EN_LA_PAGINA].sort());

    const tieneClase = (elemento: { atributos: ReadonlyMap<string, string> }, clase: string) =>
      (elemento.atributos.get('class') ?? '').split(/\s+/u).includes(clase);
    const casa = (selector: string, elemento: { etiqueta: string; atributos: ReadonlyMap<string, string> }) =>
      selector.startsWith('[')
        ? elemento.atributos.has(selector.slice(1, -1))
        : selector.startsWith('.')
          ? tieneClase(elemento, selector.slice(1))
          : elemento.etiqueta === selector;
    type Visto = { plantilla: boolean; raiz: boolean; recuento: boolean; salida: boolean };
    const vistos = new Map<string, Visto[]>();
    recorrerElementos(html, (elemento, antepasados) => {
      for (const selector of buscados) {
        if (!casa(selector, elemento)) continue;
        vistos.set(selector, [
          ...(vistos.get(selector) ?? []),
          {
            plantilla: antepasados.some((a) => a.etiqueta === 'template'),
            raiz: antepasados.some((a) => a.atributos.has('data-busqueda')),
            recuento: antepasados.some((a) => tieneClase(a, 'recuento')),
            salida: antepasados.some((a) => a.atributos.has('data-salida')),
          },
        ]);
      }
    });
    // Cada uno de la plantilla, una vez dentro de ella, y ella dentro de la raíz.
    for (const selector of EN_LA_PLANTILLA) {
      expect(vistos.get(selector)?.filter((v) => v.plantilla), selector).toEqual([
        { plantilla: true, raiz: true, recuento: false, salida: false },
      ]);
    }
    expect(vistos.get('template')?.[0]).toEqual({ plantilla: false, raiz: true, recuento: false, salida: false });
    // Lo de la página, el primero que encuentra `document.querySelector`, fuera de la plantilla; la
    // región dentro de `.recuento`, la rejilla donde la sombra le reserva el alto.
    expect(vistos.get('[data-busqueda]')?.[0]).toEqual({ plantilla: false, raiz: false, recuento: false, salida: false });
    expect(vistos.get('[data-resultados]')?.[0]).toEqual({ plantilla: false, raiz: false, recuento: false, salida: false });
    expect(vistos.get('[data-estado]')?.[0]).toEqual({ plantilla: false, raiz: false, recuento: true, salida: false });
    expect(vistos.get('[data-salida]')?.[0]).toEqual({ plantilla: false, raiz: false, recuento: false, salida: false });
    // La sugerencia que se anuncia a cero, dentro de la salida.
    expect(vistos.get('.sugerencia')?.[0]).toEqual({ plantilla: false, raiz: false, recuento: false, salida: true });
  });

  describe('en el índice generado por Pagefind', () => {
    const datos = async (respuesta: Awaited<ReturnType<IndiceDePagefind['search']>>) =>
      Promise.all(respuesta.results.map((r) => r.data()));
    const ordenDe = (slug: string) => {
      const pagina = readFileSync(paginaConstruida(proyecto, `/cita/${slug}/`), 'utf8');
      return new RegExp(`data-pagefind-sort="${ORDEN_DE_CITA}:(\\d+)"`, 'u').exec(pagina)![1];
    };

    it('sin texto, con un Autor: todas sus Citas, en el orden de la clave, y cada una en el listado de su Autor (NFR-2)', async () => {
      for (const autor of Object.keys(AUTORES)) {
        const encontradas = await datos(
          await indice!.search(null, { filters: { [FILTROS_DE_CITA.autor]: autor }, sort: { [ORDEN_DE_CITA]: 'asc' } }),
        );
        const esperadas = CITAS.filter((c) => c.autor === autor)
          .map((c) => c.slug)
          .sort((a, b) => ordenDe(a).localeCompare(ordenDe(b)));
        expect(encontradas.map((d) => rutaDe(d.url)), autor).toEqual(esperadas.map((slug) => `/cita/${slug}/`));
        expect(encontradas.every((d) => d.filters[FILTRO_DE_TIPO]?.[0] === 'cita'), autor).toBe(true);
        const listado = citasDelListado(join(proyecto, 'dist'), autor);
        for (const d of encontradas) expect(listado, `${autor}: ${d.url}`).toContain(rutaDe(d.url));
      }
    });

    it('Autor y Tema: su cruce', async () => {
      const encontradas = await datos(
        await indice!.search(null, {
          filters: { [FILTROS_DE_CITA.autor]: 'jose-marti', [FILTROS_DE_CITA.tema]: 'la-vida' },
          sort: { [ORDEN_DE_CITA]: 'asc' },
        }),
      );
      const esperadas = CITAS.filter((c) => c.autor === 'jose-marti' && c.temas.includes('la-vida')).map((c) => `/cita/${c.slug}/`);
      expect(encontradas.map((d) => rutaDe(d.url)).sort()).toEqual(esperadas.sort());
      expect(encontradas).toHaveLength(AUTORES['jose-marti'].citas - 1);
    });

    it('con texto y un filtro, solo Citas de lo filtrado —ni la del Autor ni la del Tema, que no declaran filtros—', async () => {
      // «escuela» está en el texto de toda Cita; «José Martí», además, en la Página de Autor.
      const sinFiltro = await datos(await indice!.search('José Martí'));
      expect(sinFiltro.some((d) => d.filters[FILTRO_DE_TIPO]?.[0] === 'autor'), 'sin filtro sale también el Autor').toBe(true);
      const conFiltro = await datos(await indice!.search('José Martí', { filters: { [FILTROS_DE_CITA.tema]: 'el-tiempo' } }));
      expect(conFiltro.length).toBeGreaterThan(0);
      expect(conFiltro.every((d) => d.filters[FILTRO_DE_TIPO]?.[0] === 'cita')).toBe(true);
      const conTema = await datos(await indice!.search('escuela', { filters: { [FILTROS_DE_CITA.tema]: 'la-vida' } }));
      expect(conTema.map((d) => rutaDe(d.url)).sort()).toEqual(
        CITAS.filter((c) => c.temas.includes('la-vida'))
          .map((c) => `/cita/${c.slug}/`)
          .sort(),
      );
    });

    it('un Tema bajo su umbral no filtra nada: no es filtro', async () => {
      const filtros = await indice!.filters();
      expect(Object.keys(filtros[FILTROS_DE_CITA.tema] ?? {}).sort()).toEqual(['el-tiempo', 'la-vida']);
      expect(Object.keys(filtros[FILTROS_DE_CITA.autor] ?? {}).sort()).toEqual(Object.keys(AUTORES).sort());
    });
  });
});
