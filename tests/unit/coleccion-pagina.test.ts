import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  RAIZ,
  citaValida,
  coleccionValida,
  construirConCorpus,
  limpiar,
} from './ayuda/construir.js';
import { CITAS_POR_PAGINA, MIN_CITAS_POR_COLECCION } from '../../src/lib/umbrales.ts';
import { ETIQUETAS_DE_RESULTADO } from '../../src/lib/tipoDeResultado.ts';

/**
 * Historia 12.3 — la Página de Colección sobre un proyecto construido de verdad.
 *
 * Lo que solo se demuestra construyendo: que la presentación es **la del componente
 * compartido** y no una copia parecida, que la canónica de una Cita presente en tres
 * Colecciones sigue siendo su propia página, que una Colección bajo su umbral no tiene
 * ruta porque nadie la generó, que retirar un miembro no deja hueco ni enlace roto, y que
 * sin ninguna Colección —el estado de producción de hoy— el sitio construye sin sección
 * vacía en la portada.
 *
 * Todo se apoya en dos construcciones y no en una por caso: cada `astro build` cuesta, y
 * `vitest.config.ts` las serializa a propósito.
 */

/**
 * El **único** mecanismo de limpieza del fichero.
 *
 * Hubo dos —esta lista y un `afterAll` propio dentro del primer `describe`— y dos
 * mecanismos para lo mismo son la forma de que uno se quede sin cubrir la mitad de los
 * casos. Cada construcción se apunta aquí en cuanto devuelve, antes de afirmar nada.
 */
const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.splice(0).map(limpiar));
});

/**
 * Un texto largo a propósito: por encima del recorte de `TarjetaDeCita`.
 *
 * Es lo que permite distinguir «la Colección enseña un fragmento y enlaza» de «la Colección
 * reproduce la Cita». Con un texto corto las dos cosas se verían igual en el HTML.
 */
function textoLargo(i: number): string {
  return (
    `Fragmento número ${i} sobre la brevedad de la vida, que no es corta sino que la ` +
    'hacemos corta, y no nos falta tiempo sino que perdemos mucho del que se nos da a ' +
    `manos llenas para vivirla entera. Marca única del fragmento ${i}.`
  );
}

const SEGUNDO_AUTOR = `nombre: Antonio Machado
añoNacimiento: 1875
añoFallecimiento: 1939
semblanza: Poeta español de la generación del 98, maestro y andariego.
`;

/** Una Cita publicable por índice, repartida entre los dos Autores del corpus. */
function citaNumerada(i: number): [string, string] {
  return [
    `citas/fragmento-${i}.md`,
    citaValida({
      slug: `seneca-fragmento-numero-${i}`,
      texto: textoLargo(i),
      autor: i % 2 === 0 ? 'seneca' : 'antonio-machado',
    }),
  ];
}

const slugDe = (i: number) => `seneca-fragmento-numero-${i}`;

/**
 * El corpus con Colecciones: uno solo del que cuelgan casi todos los casos.
 *
 * · `frases-cortas` declara una Cita más de las que caben en una página **y** una que está
 *   retirada a revisión: pagina y además pierde un miembro sin romperse.
 * · `para-pensar` y `breves` declaran las mismas quince primeras, así que esas Citas están
 *   en tres Colecciones a la vez — el caso de la canónica.
 * · `apenas-tres` se queda por debajo del umbral y no debe existir en ninguna parte.
 */
const PUBLICABLES = CITAS_POR_PAGINA + 1;
const RETIRADA = PUBLICABLES; // La que se mueve a `_revision/`, declarada igualmente.
const COMPARTIDAS = Array.from({ length: MIN_CITAS_POR_COLECCION }, (_, i) => slugDe(i));

const CORPUS_CON_COLECCIONES: Record<string, string> = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'autores/antonio-machado.yml': SEGUNDO_AUTOR,
  'temas/el-tiempo.yml': `nombre: El tiempo\n`,
  ...Object.fromEntries(Array.from({ length: PUBLICABLES }, (_, i) => citaNumerada(i))),
  // Declarada por la Colección y fuera del conjunto publicable: la resolución blanda de la
  // Historia 12.2 la deja fuera, y esta historia comprueba que la página no la enseña.
  [`_revision/fragmento-${RETIRADA}.md`]: citaNumerada(RETIRADA)[1],
  'colecciones/frases-cortas.yml': coleccionValida({
    nombre: 'Frases cortas para reflexionar',
    criterio: 'Citas de una sola frase que se sostienen fuera de la obra de la que salen.',
    miembros: [...Array.from({ length: PUBLICABLES }, (_, i) => slugDe(i)), slugDe(RETIRADA)],
  }),
  'colecciones/para-pensar.yml': coleccionValida({
    nombre: 'Para pensar despacio',
    criterio: 'Citas que piden releerse antes de seguir leyendo.',
    miembros: COMPARTIDAS,
  }),
  'colecciones/breves.yml': coleccionValida({
    nombre: 'Breves',
    criterio: 'Citas que caben en una respiración.',
    miembros: COMPARTIDAS,
  }),
  'colecciones/apenas-tres.yml': coleccionValida({
    nombre: 'Apenas tres',
    criterio: 'Un criterio legítimo con muy pocas Citas todavía.',
    miembros: [slugDe(0), slugDe(1), slugDe(2)],
  }),
};

describe('Historia 12.3 — la Página de Colección, construida', () => {
  let dist: string;

  beforeAll(async () => {
    const resultado = await construirConCorpus(CORPUS_CON_COLECCIONES);
    // Se apunta para limpiar **antes** de afirmar. Al revés, un build fallido —que es el
    // caso que más se repite mientras se escribe la prueba— salía por el `expect` y dejaba
    // el proyecto temporal huérfano en el disco.
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    dist = join(resultado.proyecto, 'dist');
  });

  const leer = (relativa: string) => readFile(join(dist, relativa), 'utf8');

  /**
   * El ámbito de estilos con el que Astro marcó un elemento de la página.
   *
   * Astro emite las reglas de un componente como `h1[data-astro-cid-xxxx]{…}` dentro de un
   * `<style>` de la propia página. Con el ámbito en la mano se puede leer del HTML construido
   * lo que hasta ahora solo miraba el navegador, y eso lleva UX-DR31 al plano que el CI sí
   * ejecuta: las pruebas de Playwright que lo comprobaban se saltan siempre, porque
   * producción no tiene Colecciones.
   */
  function ambitoDe(html: string, etiqueta: string): string {
    const encontrado = new RegExp(`<${etiqueta}[^>]*\\s(data-astro-cid-[a-z0-9]+)`).exec(html);
    if (encontrado === null) throw new Error(`No hay <${etiqueta}> con ámbito en la página.`);
    return encontrado[1];
  }

  /** Las declaraciones que el build emitió para un selector concreto. */
  function declaracionesDe(html: string, selector: string): string {
    const estilos = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('');
    const escapado = selector.replace(/[[\]]/g, (c) => `\\${c}`);
    const regla = new RegExp(`(?:^|[},])${escapado}\\{([^}]*)\\}`).exec(estilos);
    if (regla === null) throw new Error(`El build no emitió ninguna regla para «${selector}».`);
    return regla[1];
  }

  /** Todas las reglas de un ámbito, para barrerlas en busca de literales. */
  function reglasDelAmbito(html: string, ambito: string): string[] {
    const estilos = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('');
    return [...estilos.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((m) => m[1].includes(ambito))
      .map((m) => m[2]);
  }

  /** El `<li>` de una Cita dentro de un listado, tal y como quedó en el HTML. */
  function tarjetaDe(html: string, slug: string): string | undefined {
    const marcas = [...html.matchAll(/<li class="tarjeta[\s\S]*?<\/li>/g)].map((m) => m[0]);
    return marcas.find((marca) => marca.includes(`href="/cita/${slug}"`));
  }

  describe('presenta sus Citas con el componente compartido — AD-19', () => {
    it('la ruta existe y su URL es legible, en español y sin identificadores opacos', async () => {
      expect(existsSync(join(dist, 'coleccion', 'frases-cortas.html'))).toBe(true);
      const html = await leer('coleccion/frases-cortas.html');
      expect(html).toMatch(/<h1[^>]*>Frases cortas para reflexionar<\/h1>/);
    });

    it('la tarjeta es la misma que la de la Página de Tema, hasta el último byte', async () => {
      /*
       * La comprobación que de verdad cierra AD-19. Astro marca cada componente con su
       * propio `data-astro-cid-…`, así que una presentación copiada a mano en la Página de
       * Colección —por parecida que fuera— llevaría otra marca y otro marcado. Comparar el
       * `<li>` entero contra el que emite la Página de Tema para la misma Cita no deja
       * sitio a una copia: o es el mismo componente, o no coincide.
       */
      const enLaColeccion = tarjetaDe(await leer('coleccion/frases-cortas.html'), slugDe(0));
      const enElTema = tarjetaDe(await leer('tema/el-tiempo.html'), slugDe(0));

      expect(enElTema, 'la Página de Tema tiene que traer esa Cita para poder comparar')
        .toBeDefined();
      expect(enLaColeccion).toBe(enElTema);
    });

    it('cada tarjeta lleva el nombre de su Autor, porque la Colección agrupa a varios', async () => {
      const html = await leer('coleccion/frases-cortas.html');
      const nombres = [...html.matchAll(/<span class="autor"[^>]*>([^<]+)<\/span>/g)].map(
        (m) => m[1],
      );
      expect(nombres.length).toBeGreaterThan(0);
      expect(new Set(nombres).size).toBeGreaterThan(1);
    });

    it('el criterio va al pie del listado, después de las Citas y no antes', async () => {
      const html = await leer('coleccion/frases-cortas.html');
      const criterio = 'Citas de una sola frase que se sostienen fuera de la obra de la que salen.';
      // `lastIndexOf` y no `indexOf`: el criterio es también la descripción de la página y
      // aparece antes, en la cabecera. Lo que se fija aquí es dónde va en el cuerpo.
      expect(html).toContain(`<meta name="description" content="${criterio}">`);
      expect(html.lastIndexOf(criterio)).toBeGreaterThan(html.lastIndexOf('<li class="tarjeta'));
    });

    it('todo enlace del listado apunta a una página que el build generó', async () => {
      const html = await leer('coleccion/frases-cortas.html');
      const destinos = [...html.matchAll(/href="(\/cita\/[^"]+)"/g)].map((m) => m[1]);
      expect(destinos.length).toBeGreaterThan(0);
      for (const destino of destinos) {
        expect(existsSync(join(dist, `${destino.slice(1)}.html`)), destino).toBe(true);
      }
    });
  });

  describe('agrega y enlaza, pero no reproduce — NFR-13', () => {
    it('la canónica de una Cita en tres Colecciones sigue siendo su Página de Cita', async () => {
      // La Cita 0 la declaran `frases-cortas`, `para-pensar` y `breves`.
      for (const coleccion of ['frases-cortas', 'para-pensar', 'breves']) {
        expect(await leer(`coleccion/${coleccion}.html`)).toContain(`href="/cita/${slugDe(0)}"`);
      }

      const cita = await leer(`cita/${slugDe(0)}.html`);
      expect(cita).toMatch(
        new RegExp(`<link rel="canonical" href="[^"]*/cita/${slugDe(0)}"`),
      );
    });

    it('ninguna Página de Colección se declara canónica de una Cita', async () => {
      for (const coleccion of ['frases-cortas', 'para-pensar', 'breves']) {
        const html = await leer(`coleccion/${coleccion}.html`);
        expect(html).toMatch(
          new RegExp(`<link rel="canonical" href="[^"]*/coleccion/${coleccion}">`),
        );
        // Y no la de ninguna de sus Citas: la canónica de una Cita es su propia página.
        // Con el dominio escrito a mano esta negativa se volvía vacua el día que cambiase
        // `site`; se dice igual que su hermana de arriba, por la forma de la ruta.
        expect(html).not.toMatch(/rel="canonical" href="[^"]*\/cita\//);
      }
    });

    it('cuando la Cita pasa del largo del fragmento, la tarjeta recorta y su página no', async () => {
      /*
       * **Lo que esta prueba demuestra, y lo que no.** Demuestra que la tarjeta recorta por
       * encima de su largo de fragmento y que la Página de Cita publica el texto entero. No
       * demuestra NFR-13, y sería un error leerla así: los textos de este fixture pasan de
       * 120 caracteres **a propósito**, y ninguna de las 38 Citas del corpus real llega —la
       * más larga mide 101—, así que en producción la tarjeta no recorta nunca y el texto
       * íntegro de una Cita ya aparece hoy en su Página de Tema y en la de Autor.
       *
       * Lo que sostiene NFR-13 es la canónica, y eso se comprueba en las dos pruebas de
       * arriba, sobre un sitio construido.
       */
      const integro = textoLargo(0);
      expect(await leer(`cita/${slugDe(0)}.html`)).toContain(integro);
      for (const coleccion of ['frases-cortas', 'para-pensar', 'breves']) {
        expect(await leer(`coleccion/${coleccion}.html`), coleccion).not.toContain(integro);
      }
    });

    it('la Página de Cita no enlaza de vuelta a sus Colecciones — UX-DR34 recortada', async () => {
      // Se recortó en validación a propósito: FR-28 dice que la Colección enlaza a las
      // Citas y no al revés. Esta comprobación existe para que nadie lo reintroduzca
      // creyendo que faltaba.
      expect(await leer(`cita/${slugDe(0)}.html`)).not.toContain('href="/coleccion/');
    });

    it('la Colección no es un destino terminal: toda tarjeta sale hacia una Cita', async () => {
      const html = await leer('coleccion/breves.html');
      const tarjetas = [...html.matchAll(/<li class="tarjeta[\s\S]*?<\/li>/g)].map((m) => m[0]);
      expect(tarjetas).toHaveLength(MIN_CITAS_POR_COLECCION);
      for (const tarjeta of tarjetas) expect(tarjeta).toMatch(/href="\/cita\//);
    });
  });

  describe('el umbral se aplica en un solo sitio, y la página no lo comprueba', () => {
    it('una Colección bajo su umbral no genera ruta, y su URL da 404', () => {
      // Exactamente como un Tema: nadie escribió una comprobación aquí; `conjuntoPublicable`
      // no la reparte, así que `getStaticPaths` no la ve y el fichero no existe. Un 404 en
      // un sitio estático es la ausencia del fichero.
      expect(existsSync(join(dist, 'coleccion', 'apenas-tres.html'))).toBe(false);
    });

    it('tampoco se anuncia en el sitemap ni se enlaza desde la portada', async () => {
      expect(await leer('sitemap-0.xml')).not.toContain('/coleccion/apenas-tres');
      expect(await leer('index.html')).not.toContain('href="/coleccion/apenas-tres"');
    });

    it('y las que sí llegan al umbral están en el sitemap, sin sus páginas 2+', async () => {
      const sitemap = await leer('sitemap-0.xml');
      for (const coleccion of ['frases-cortas', 'para-pensar', 'breves']) {
        expect(sitemap, coleccion).toContain(`/coleccion/${coleccion}<`);
      }
      expect(sitemap).not.toContain('/coleccion/frases-cortas/2');
    });
  });

  describe('un miembro retirado a revisión desaparece sin dejar hueco', () => {
    it('ni se lista, ni se enlaza, ni deja una tarjeta vacía', async () => {
      const paginas = [
        await leer('coleccion/frases-cortas.html'),
        await leer('coleccion/frases-cortas/2.html'),
      ];
      const listadas = paginas.flatMap((html) =>
        [...html.matchAll(/href="\/cita\/([^"]+)"/g)].map((m) => m[1]),
      );

      expect(listadas).not.toContain(slugDe(RETIRADA));
      expect(listadas).toHaveLength(PUBLICABLES);
      // Sin hueco: ni una tarjeta más que Citas resueltas, en las dos páginas juntas.
      const tarjetas = paginas.reduce(
        (suma, html) => suma + [...html.matchAll(/<li class="tarjeta/g)].length,
        0,
      );
      expect(tarjetas).toBe(PUBLICABLES);
    });

    it('la Colección sigue publicada, porque el resuelto sigue por encima del umbral', () => {
      expect(existsSync(join(dist, 'coleccion', 'frases-cortas.html'))).toBe(true);
    });
  });

  describe('la decisión de paginar, comprobada', () => {
    it('una Colección con más de CITAS_POR_PAGINA miembros pagina, como Autor y Tema', async () => {
      const primera = await leer('coleccion/frases-cortas.html');
      expect([...primera.matchAll(/<li class="tarjeta/g)]).toHaveLength(CITAS_POR_PAGINA);
      expect(existsSync(join(dist, 'coleccion', 'frases-cortas', '2.html'))).toBe(true);
      expect(primera).toContain('href="/coleccion/frases-cortas/2"');
    });

    it('la página 2 es rastreable y no indexable, sin declararlo por su cuenta', async () => {
      // Sale de `noPublicableEn` en la declaración única, igual que en Autor y Tema.
      const segunda = await leer('coleccion/frases-cortas/2.html');
      expect(segunda).toContain('<meta name="robots" content="noindex, follow">');
      expect(await leer('coleccion/frases-cortas.html')).not.toContain('name="robots"');
    });

    it('una Colección que cabe en una página no muestra control de paginación', async () => {
      expect(await leer('coleccion/breves.html')).not.toContain('Paginación del listado');
    });
  });

  describe('descubrimiento desde la portada', () => {
    it('la portada enlaza a cada Colección publicada, a un solo salto', async () => {
      const portada = await leer('index.html');
      expect(portada).toContain('>Colecciones</h2>');
      for (const coleccion of ['frases-cortas', 'para-pensar', 'breves']) {
        expect(portada, coleccion).toContain(`href="/coleccion/${coleccion}"`);
      }
    });

    it('el chip de la portada lleva el nombre de la Colección, no su slug', async () => {
      expect(await leer('index.html')).toContain('Frases cortas para reflexionar');
    });
  });

  describe('UX-DR31 y UX-DR33, en el plano que el CI ejecuta', () => {
    /*
     * Estas garantías vivían solo en `tests/e2e/coleccion.spec.ts`, y allí se saltan
     * **siempre**: producción no tiene Colecciones que visitar. Y el CI no ejecuta la suite
     * de extremo a extremo. Con eso, cambiar `var(--serif)` por `var(--sans)` en el `h1`
     * dejaba las cuatro puertas en verde. Aquí se afirma sobre el CSS que el build emitió,
     * que es el mismo que el navegador aplica.
     */

    it('el h1 de Colección se compone exactamente igual que el de Tema', async () => {
      const enLaColeccion = await leer('coleccion/frases-cortas.html');
      const enElTema = await leer('tema/el-tiempo.html');

      const deColeccion = declaracionesDe(enLaColeccion, `h1[${ambitoDe(enLaColeccion, 'h1')}]`);
      const deTema = declaracionesDe(enElTema, `h1[${ambitoDe(enElTema, 'h1')}]`);

      // El nombre de Colección se une a las tres excepciones de la serif, con la misma
      // composición que el de Tema. Comparar los dos bloques enteros fija también el tamaño
      // y el peso: una divergencia futura en cualquiera de los dos se ve aquí.
      expect(deColeccion).toContain('font-family:var(--serif)');
      expect(deColeccion).toBe(deTema);
    });

    it('el criterio va en Inter, que es lo que la serif deja fuera', async () => {
      const html = await leer('coleccion/frases-cortas.html');
      const ambito = ambitoDe(html, 'h1');
      expect(declaracionesDe(html, `.criterio[${ambito}] p[${ambito}]`)).toContain(
        'font-family:var(--sans)',
      );
    });

    it('la serif no aparece en ninguna otra regla de la página', async () => {
      // La otra mitad de UX-DR31: no basta con que el nombre la lleve; nada más debe llevarla.
      const html = await leer('coleccion/frases-cortas.html');
      const ambito = ambitoDe(html, 'h1');
      const conSerif = reglasDelAmbito(html, ambito).filter((r) =>
        r.includes('font-family:var(--serif)'),
      );
      expect(conSerif).toHaveLength(1);
    });

    it('la página no lleva ni un literal de color ni de tipografía', async () => {
      // UX-DR1 y UX-DR2. Se barre el ámbito propio de la página: los `@font-face` que la
      // Fonts API inyecta llevan nombres y rutas literales y no son de nadie de aquí.
      const html = await leer('coleccion/frases-cortas.html');
      for (const regla of reglasDelAmbito(html, ambitoDe(html, 'h1'))) {
        expect(regla, regla).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
        for (const propiedad of ['font-family', 'font-size', 'color', 'background']) {
          const valor = new RegExp(`(?:^|;)${propiedad}:([^;]+)`).exec(regla)?.[1];
          if (valor !== undefined) expect(valor.trim(), `${propiedad} en «${regla}»`).toMatch(/^var\(--/);
        }
      }
    });

    it('la página se enmarca con el contenedor compartido, que es lo que la hace caber en 360 px', async () => {
      /*
       * UX-DR33 tiene dos mitades. La medible sin navegador es esta: la columna no la fija
       * la página, la fija `.contenedor` de `tokens.css` —el mismo de la cabecera, el pie y
       * las demás superficies—, y la página no declara ancho propio en píxeles. La otra
       * mitad —que a 360 px no hay desplazamiento horizontal y todo se puede tocar— sigue
       * necesitando navegador y vive en `tests/e2e/coleccion.spec.ts`.
       */
      const html = await leer('coleccion/frases-cortas.html');
      expect(html).toMatch(/<div class="pagina contenedor"/);
      for (const regla of reglasDelAmbito(html, ambitoDe(html, 'h1'))) {
        expect(regla, regla).not.toMatch(/(?:^|;)(?:width|min-width):/);
        expect(regla, regla).not.toMatch(/max-width:\s*\d/);
      }
    });
  });

  describe('la búsqueda propia sabe rotular una Colección — no solo emitir el tipo', () => {
    /*
     * El lado consumidor. `tipo:coleccion` en la Página de Colección no sirve de nada si
     * `buscar.astro` no sabe pintarlo: sin rótulo, el `||` de reserva etiquetaba cada
     * Colección como «Cita». Eso no lo veía nada, porque la única prueba que existía miraba
     * el lado productor.
     */
    it('la página de búsqueda embarca la tabla de rótulos, con el de Colección', async () => {
      const buscar = await leer('buscar.html');
      expect(buscar).toContain(`"coleccion":"${ETIQUETAS_DE_RESULTADO.coleccion}"`);
      for (const [tipo, etiqueta] of Object.entries(ETIQUETAS_DE_RESULTADO)) {
        expect(buscar, tipo).toContain(`"${tipo}":"${etiqueta}"`);
      }
    });

    it('la tabla no está escrita a mano en el guion: llega del módulo que la posee', async () => {
      const fuente = await readFile(join(RAIZ, 'src/pages/buscar.astro'), 'utf8');
      expect(fuente).toContain("from '../lib/tipoDeResultado.ts'");
      expect(fuente).not.toMatch(/const ETIQUETA\s*=\s*\{/);
    });

    it('la salida sin resultados también ofrece las Colecciones publicadas', async () => {
      // FR-8 — la salida ofrecía Temas y Autores. Dejar fuera la tercera familia de
      // agregación habría hecho de la Colección la única superficie de producto que la
      // búsqueda sin resultados no sabe ofrecer.
      const buscar = await leer('buscar.html');
      expect(buscar).toContain('href="/coleccion/frases-cortas"');
      expect(buscar).toMatch(/<h2[^>]*>Colecciones<\/h2>/);
    });
  });

  describe('la superficie entra sola en el índice de la búsqueda propia', () => {
    it('se indexa dentro y se marca como Colección, sin tocar ninguna lista', async () => {
      const html = await leer('coleccion/frases-cortas.html');
      expect(html).toContain('data-pagefind-body');
      expect(html).toContain('tipo:coleccion');
    });

    it('y la página 2 queda fuera del índice, como todo listado paginado', async () => {
      const segunda = await leer('coleccion/frases-cortas/2.html');
      expect(segunda).toContain('data-pagefind-ignore');
      expect(segunda).not.toContain('data-pagefind-body');
    });
  });
});

/**
 * Historia 12.3 — el estado de producción de hoy: ninguna Colección.
 *
 * `corpus/colecciones/` está vacío a propósito y seguirá estándolo hasta que Héctor cure la
 * primera con la herramienta de la 12.4. No es un borde raro que haya que tolerar: es lo
 * que el despliegue de la épica va a servir, así que se fija como comportamiento.
 */
describe('Historia 12.3 — sin ninguna Colección publicada', () => {
  let dist: string;

  beforeAll(async () => {
    const resultado = await construirConCorpus({
      'autores/seneca.yml': AUTOR_VALIDO,
      'temas/el-tiempo.yml': `nombre: El tiempo\n`,
      'citas/fragmento-0.md': citaNumerada(0)[1],
    });
    // Apuntar primero, afirmar después: si el build falla, el proyecto se limpia igual.
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    dist = join(resultado.proyecto, 'dist');
  });

  it('el sitio construye igual', () => {
    expect(existsSync(join(dist, 'index.html'))).toBe(true);
  });

  it('la portada no muestra una sección de Colecciones vacía', async () => {
    const portada = await readFile(join(dist, 'index.html'), 'utf8');
    /*
     * Se afirma sobre el `<h2>`, que es lo que se quiere decir. `not.toContain('Colecciones')`
     * buscaba la subcadena en el documento entero: pasaba por el motivo equivocado —bastaba
     * con que la palabra apareciera en cualquier sitio para que fallase, y con que no
     * apareciera en ninguno para que pasase— y habría empezado a fallar el día que la palabra
     * saliera en un texto editorial cualquiera.
     */
    expect(portada).not.toMatch(/<h2[^>]*>Colecciones<\/h2>/);
    // Ni una lista sin elementos, ni un aviso de que todavía no hay ninguna.
    expect(portada).not.toContain('href="/coleccion/');
    expect(portada).not.toMatch(/todav[íi]a no hay/i);
    // Y la portada conserva sus salidas: la ausencia no se ha llevado nada por delante.
    expect(portada).toMatch(/<h2[^>]*>Autores<\/h2>/);
  });

  it('no se construye ninguna ruta de Colección', async () => {
    expect(existsSync(join(dist, 'coleccion'))).toBe(false);
    const raiz = await readdir(dist);
    expect(raiz).not.toContain('coleccion');
  });

  it('el sitemap no anuncia ninguna', async () => {
    expect(await readFile(join(dist, 'sitemap-0.xml'), 'utf8')).not.toContain('/coleccion/');
  });
});
