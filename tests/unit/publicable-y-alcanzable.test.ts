import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  coleccionValida,
  construirConCorpus,
  limpiar,
} from './ayuda/construir.js';
import { superficiesInalcanzables } from '../../src/lib/publicado.ts';
import {
  SUPERFICIES,
  anunciableEnElSitemap,
  caracterDe,
  consecuenciasDelCaracter,
  rutaNormalizada,
  superficiesDelBarrido,
} from '../../src/lib/superficies.ts';
import { CITAS_POR_PAGINA, MAX_SALTOS_DESDE_LA_PORTADA } from '../../src/lib/umbrales.ts';

/**
 * Historia 12.1 — publicable y alcanzable son el mismo conjunto.
 *
 * AD-11 extendido. Una superficie anunciada a la que no llega ningún enlace interno solo
 * existe para el buscador, y el sitio no tiene ninguna forma de que el visitante llegue a
 * ella. Se comprueba en los dos planos: sobre el grafo puro, para poder enseñar el caso
 * que falla, y sobre un sitio construido de verdad, que es donde el defecto aparecería.
 */

describe('Historia 12.1 — el conjunto alcanzable, sobre el grafo puro', () => {
  it('una superficie publicada a la que llega un enlace no es huérfana', () => {
    const enlaces = new Map([
      ['/', ['/autor/seneca']],
      ['/autor/seneca', ['/cita/seneca-el-tiempo']],
    ]);
    expect(
      superficiesInalcanzables(['/', '/autor/seneca', '/cita/seneca-el-tiempo'], enlaces),
    ).toEqual([]);
  });

  it('una superficie publicable y huérfana se detecta', () => {
    const enlaces = new Map([['/', ['/autor/seneca']]]);
    expect(
      superficiesInalcanzables(['/', '/autor/seneca', '/cita/nadie-me-enlaza'], enlaces),
    ).toEqual(['/cita/nadie-me-enlaza']);
  });

  it('un enlace que solo sale de la propia huérfana no la salva', () => {
    // El caso tramposo: la página existe y enlaza al resto del sitio, pero nadie entra en
    // ella. Alcanzable es «se llega», no «se sale».
    const enlaces = new Map([
      ['/', ['/autor/seneca']],
      ['/cita/nadie-me-enlaza', ['/', '/autor/seneca']],
    ]);
    expect(superficiesInalcanzables(['/cita/nadie-me-enlaza'], enlaces)).toEqual([
      '/cita/nadie-me-enlaza',
    ]);
  });

  it('lo que está más hondo que el tope de saltos cuenta como inalcanzable', () => {
    // El límite es parte del criterio: «alcanzable en un número acotado de saltos». Una
    // cadena que crece indefinidamente no es descubrimiento, es un laberinto.
    const cadena = new Map([
      ['/', ['/a']],
      ['/a', ['/b']],
      ['/b', ['/c']],
      ['/c', ['/d']],
    ]);
    // `/d` cuelga a cuatro saltos de la portada: con tres se queda fuera.
    expect(superficiesInalcanzables(['/d'], cadena, { maximoDeSaltos: 3 })).toEqual(['/d']);
    expect(superficiesInalcanzables(['/c'], cadena, { maximoDeSaltos: 3 })).toEqual([]);
    expect(superficiesInalcanzables(['/d'], cadena, { maximoDeSaltos: 4 })).toEqual([]);
  });

  it('el tope por defecto es el que tiene nombre, y no un literal suelto', () => {
    const cadena = new Map(
      Array.from({ length: MAX_SALTOS_DESDE_LA_PORTADA + 1 }, (_, i) => [
        i === 0 ? '/' : `/n${i}`,
        [`/n${i + 1}`],
      ]) as [string, string[]][],
    );
    expect(superficiesInalcanzables([`/n${MAX_SALTOS_DESDE_LA_PORTADA}`], cadena)).toEqual([]);
    expect(superficiesInalcanzables([`/n${MAX_SALTOS_DESDE_LA_PORTADA + 1}`], cadena)).toEqual([
      `/n${MAX_SALTOS_DESDE_LA_PORTADA + 1}`,
    ]);
  });

  it('un ciclo entre superficies no cuelga el recorrido', () => {
    const enlaces = new Map([
      ['/', ['/a']],
      ['/a', ['/b', '/']],
      ['/b', ['/a']],
    ]);
    expect(superficiesInalcanzables(['/a', '/b'], enlaces)).toEqual([]);
  });
});

describe('Historia 12.1 — toda página de src/pages tiene declaración', () => {
  /**
   * Las páginas de `src/pages/`, relativas a esa carpeta.
   *
   * Solo las `.astro`: las rutas `.ts` de la carpeta son puntos finales que emiten otra
   * cosa —`robots.txt.ts` y `tarjeta/[slug].png.ts` llevan su tipo en el nombre— y no son
   * superficies que se indexen ni se barran. Una `.ts` **sin** tipo en el nombre sí
   * emitiría HTML, y por eso también se exige.
   */
  async function paginasDeSuperficie(dir: string, prefijo = ''): Promise<string[]> {
    const encontradas: string[] = [];
    for (const entrada of await readdir(dir, { withFileTypes: true })) {
      const relativa = prefijo === '' ? entrada.name : `${prefijo}/${entrada.name}`;
      if (entrada.isDirectory()) {
        encontradas.push(...(await paginasDeSuperficie(join(dir, entrada.name), relativa)));
        continue;
      }
      if (entrada.name.endsWith('.astro')) encontradas.push(relativa);
      // `robots.txt.ts`, `[slug].png.ts`: el tipo va en el nombre y no emiten HTML.
      else if (/\.ts$/.test(entrada.name) && !/\.\w+\.ts$/.test(entrada.name)) {
        encontradas.push(relativa);
      }
    }
    return encontradas.sort();
  }

  /** Las páginas que nadie ha declarado. Es la comprobación, aislada para poder probarla. */
  function sinDeclaracion(paginas: readonly string[], declaradas: readonly string[]): string[] {
    const censo = new Set(declaradas);
    return paginas.filter((pagina) => !censo.has(pagina));
  }

  let paginas: string[];
  beforeAll(async () => {
    paginas = await paginasDeSuperficie(resolve(RAIZ, 'src/pages'));
  });

  it('añadir una página sin declararla no pasa desapercibido', () => {
    expect(
      sinDeclaracion(paginas, SUPERFICIES.map((s) => s.pagina)),
      'páginas sin declaración en src/lib/superficies.ts: si es publicable, dilo allí',
    ).toEqual([]);
  });

  it('la comprobación caza de verdad una página sin declarar', () => {
    // Esta es la que sostiene la garantía en el repositorio —el filtro del sitemap calla a
    // propósito—, así que tiene que demostrarse que no da verde por vacía.
    // Una página que no existe y que nadie va a declarar. Era `coleccion/[slug].astro`,
    // y la Historia 12.3 construyó una Página de Colección: si algún día alguien la
    // declarase con esa forma, esta comprobación se volvería verde sin comprobar nada.
    const declaradas = SUPERFICIES.map((s) => s.pagina);
    expect(sinDeclaracion([...paginas, 'antologia/[slug].astro'], declaradas)).toEqual([
      'antologia/[slug].astro',
    ]);
  });

  it('ninguna declaración sobra: cada una apunta a una página que existe', () => {
    // Una declaración rancia es una regla sin dueño: describe una superficie que ya no
    // está y nadie se entera de que dejó de aplicarse.
    const inexistentes = SUPERFICIES.map((s) => s.pagina).filter(
      (pagina) => !existsSync(resolve(RAIZ, 'src/pages', pagina)),
    );
    expect(inexistentes).toEqual([]);
  });

  it('el barrido de esta comprobación ve las páginas que ya hay', () => {
    // Si el recorrido se quedara corto, la comprobación de arriba daría verde sin mirar.
    for (const exigida of ['index.astro', 'kit.astro', 'autor/[slug]/[...page].astro']) {
      expect(paginas, exigida).toContain(exigida);
    }
  });
});

/**
 * Un corpus que construye un sitio con **todas** las familias de superficie.
 *
 * No basta con dos Citas sueltas. Un Tema no se publica por debajo de `MIN_CITAS_POR_TEMA`
 * y un listado no pagina por debajo de `CITAS_POR_PAGINA`, así que un corpus mínimo
 * construye un sitio sin Temas y sin páginas 2+: las comprobaciones de abajo pasarían por
 * no tener nada que mirar. Con una Cita más de las que caben en una página hay Tema
 * publicado y hay página segunda, que son justamente los dos casos que se quieren fijar.
 */
const SLUGS_DE_CITA = Array.from(
  { length: CITAS_POR_PAGINA + 1 },
  (_, i) => `seneca-fragmento-${i + 1}`,
);

const CORPUS_COMPLETO: Record<string, string> = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  /*
   * Historia 12.3 — la familia de Colección entra en los dos lazos de esta prueba.
   *
   * Sin una Colección publicada, la comprobación de que el barrido recibe **una muestra de
   * cada familia declarada** empezaría a fallar en cuanto se declarase la familia, y la del
   * sitemap pasaría sin mirar ninguna. Declara las mismas Citas que el corpus, que son una
   * más de las que caben en una página: así la Colección también pagina y aparece la ruta
   * `/coleccion/{slug}/2`, que es la que tiene que quedarse fuera del sitemap y del barrido.
   */
  'colecciones/frases-cortas.yml': coleccionValida({ miembros: SLUGS_DE_CITA }),
  ...Object.fromEntries(
    SLUGS_DE_CITA.map((slug, i) => [
      `citas/seneca--fragmento-${i + 1}.md`,
      citaValida({
        slug,
        texto: `Fragmento ${i + 1} sobre la brevedad de la vida, que es larga si sabes usarla.`,
      }),
    ]),
  ),
};

describe('Historia 12.1 — sobre un sitio construido de verdad', () => {
  let proyecto: string;

  beforeAll(async () => {
    const resultado = await construirConCorpus(CORPUS_COMPLETO);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  });

  afterAll(async () => {
    if (proyecto) await limpiar(proyecto);
  });

  /** Las páginas construidas, con su ruta pública y los enlaces internos que salen de ellas. */
  async function sitioConstruido(): Promise<Map<string, string[]>> {
    const dist = join(proyecto, 'dist');
    const enlaces = new Map<string, string[]>();

    async function recorrer(dir: string, prefijo: string) {
      for (const entrada of await readdir(dir, { withFileTypes: true })) {
        const completa = join(dir, entrada.name);
        if (entrada.isDirectory()) {
          await recorrer(completa, `${prefijo}/${entrada.name}`);
          continue;
        }
        if (!entrada.name.endsWith('.html')) continue;

        const sinExtension = entrada.name.replace(/\.html$/, '');
        const ruta =
          sinExtension === 'index' ? rutaNormalizada(`${prefijo}/`) : `${prefijo}/${sinExtension}`;

        const html = await readFile(completa, 'utf8');
        const salientes = [...html.matchAll(/href="(\/[^"#?]*)/g)].map((m) =>
          rutaNormalizada(m[1]),
        );
        enlaces.set(rutaNormalizada(ruta), [...new Set(salientes)]);
      }
    }

    await recorrer(dist, '');
    return enlaces;
  }

  /** Las rutas que el sitio construyó, que es lo que consumen el barrido y el sitemap. */
  async function rutasConstruidas(): Promise<string[]> {
    return [...(await sitioConstruido()).keys()];
  }

  describe('nada publicado queda huérfano', () => {
    it('las superficies publicables del sitio se alcanzan desde la portada', async () => {
      const enlaces = await sitioConstruido();
      const publicables = [...enlaces.keys()].filter((ruta) => caracterDe(ruta) === 'producto');

      // Sin esto la comprobación pasaría sobre un sitio vacío sin decir nada.
      expect(publicables.length).toBeGreaterThan(2);
      expect(superficiesInalcanzables(publicables, enlaces)).toEqual([]);
    });

    it('toda ruta construida tiene declaración: el build no genera nada anónimo', async () => {
      const enlaces = await sitioConstruido();
      for (const ruta of enlaces.keys()) {
        expect(() => caracterDe(ruta), ruta).not.toThrow();
      }
    });

    it('el sitio de prueba trae de verdad las familias que las comprobaciones miran', async () => {
      // Si el corpus dejara de producir Temas o páginas 2+, lo de abajo seguiría en verde
      // sin comprobar nada. Que la premisa falle tiene que verse aquí y no allí.
      const rutas = await rutasConstruidas();
      for (const exigida of [
        '/',
        '/buscar',
        '/404',
        '/kit',
        '/tema/el-tiempo',
        '/coleccion/frases-cortas',
      ]) {
        expect(rutas, exigida).toContain(exigida);
      }
      expect(rutas.some((r) => r.startsWith('/cita/'))).toBe(true);
      expect(
        rutas.filter((r) => /^\/(autor|tema|coleccion)\/[^/]+\/\d+$/.test(r)).length,
      ).toBeGreaterThan(0);
    });
  });

  /**
   * Historia 12.1 — el barrido de accesibilidad no puede quedarse sin superficies.
   *
   * La garantía existe también en `tests/e2e/accesibilidad.spec.ts`, que es donde el
   * barrido corre. Pero AGENTS.md es explícito: el CI ejecuta `npm run build`,
   * `npx astro check` y `npm test`, y **nunca** `npm run test:e2e`. Una derivación que
   * devolviera lista vacía —porque cambie la forma de las rutas construidas y ningún
   * `reconoce` case, por ejemplo— borraría el barrido entero y dejaría las dos suites en
   * verde: la unitaria porque no lo mira, la de extremo a extremo porque no se ejecuta.
   * Esta es la mitad de la guarda que sí corre en el CI.
   */
  describe('el barrido de accesibilidad se deriva y no se queda vacío', () => {
    /** Las familias declaradas que tienen que entrar en el barrido. */
    const DEL_BARRIDO = SUPERFICIES.filter((s) => consecuenciasDelCaracter(s.caracter).enElBarrido);

    it('recibe una muestra de cada familia que debe barrerse, y no pierde ninguna', async () => {
      const barrido = superficiesDelBarrido(await rutasConstruidas());

      const sinMuestra = DEL_BARRIDO.filter((s) => !barrido.some((ruta) => s.reconoce.test(ruta)));
      expect(
        sinMuestra.map((s) => s.nombre),
        'familias declaradas que el barrido no llegaría a visitar',
      ).toEqual([]);

      // Y ni una de más: una por familia, que es lo que la derivación promete.
      expect(barrido).toHaveLength(DEL_BARRIDO.length);
      expect(new Set(barrido).size).toBe(barrido.length);
    });

    it('la lista no puede quedarse vacía sin que esta comprobación lo diga', async () => {
      // Lo que el defecto haría: la derivación deja de reconocer nada y el barrido
      // desaparece. Aquí se ve; en la suite de extremo a extremo también, pero esa no la
      // ejecuta el CI.
      expect(DEL_BARRIDO.length).toBeGreaterThan(0);
      expect(superficiesDelBarrido(await rutasConstruidas()).length).toBe(DEL_BARRIDO.length);
      expect(superficiesDelBarrido([])).toEqual([]);
    });

    it('el Kit no se barre, y no por no estar construido', async () => {
      const rutas = await rutasConstruidas();
      expect(rutas).toContain('/kit');
      expect(superficiesDelBarrido(rutas)).not.toContain('/kit');
    });

    it('la muestra de un listado paginado es la primera página, no la segunda', async () => {
      const barrido = superficiesDelBarrido(await rutasConstruidas());
      expect(
        barrido.filter((ruta) => /^\/(autor|tema|coleccion)\/[^/]+\/\d+$/.test(ruta)),
      ).toEqual([]);
    });

    it('la Colección entra en el barrido sin que se la añada a ninguna lista', async () => {
      // El criterio de aceptación de la 12.3, por el camino que el CI recorre. Lo único
      // que se escribió para que esto ocurra es la declaración de `src/lib/superficies.ts`:
      // ni esta prueba ni `tests/e2e/accesibilidad.spec.ts` nombran la ruta en una lista.
      expect(superficiesDelBarrido(await rutasConstruidas())).toContain('/coleccion/frases-cortas');
    });
  });

  /**
   * Historia 12.1 — el sitemap anuncia lo que la declaración dice que es anunciable.
   *
   * El lazo hermano del de arriba. Nada en el camino del CI miraba **qué contiene** el
   * sitemap: borrar la línea `filter: anunciableEnElSitemap` de `astro.config.mjs` dejaba
   * el build, `astro check` y `npm test` en verde mientras el sitio anunciaba `/buscar`,
   * `/kit`, la 404 y todas las páginas 2+.
   */
  describe('el sitemap anuncia exactamente lo declarado', () => {
    /** Las rutas que el sitemap construido anuncia de verdad. */
    async function anunciadas(): Promise<string[]> {
      const xml = await readFile(join(proyecto, 'dist', 'sitemap-0.xml'), 'utf8');
      return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map((m) => rutaNormalizada(m[1]))
        .sort((a, b) => a.localeCompare(b, 'es'));
    }

    it('lo anunciado y lo anunciable son el mismo conjunto', async () => {
      const esperadas = (await rutasConstruidas())
        .filter((ruta) => anunciableEnElSitemap(ruta))
        .sort((a, b) => a.localeCompare(b, 'es'));

      // Sin esto, un sitemap vacío frente a un sitio vacío daría verde.
      expect(esperadas.length).toBeGreaterThan(3);
      expect(await anunciadas()).toEqual(esperadas);
    });

    it('no anuncia la búsqueda, ni el Kit, ni la 404, ni las páginas 2+', async () => {
      const rutas = await anunciadas();
      for (const fuera of ['/buscar', '/kit', '/404']) {
        expect(rutas, fuera).not.toContain(fuera);
      }
      expect(rutas.filter((r) => /^\/(autor|tema|coleccion)\/[^/]+\/\d+$/.test(r))).toEqual([]);
    });

    it('sí anuncia la portada, las Citas, los Autores, los Temas y las Colecciones', async () => {
      const rutas = await anunciadas();
      expect(rutas).toContain('/');
      expect(rutas).toContain('/autor/seneca');
      expect(rutas).toContain('/tema/el-tiempo');
      // Historia 12.3 — sale de la misma declaración que el `noindex` y el barrido.
      expect(rutas).toContain('/coleccion/frases-cortas');
      expect(rutas.filter((r) => r.startsWith('/cita/')).length).toBe(CITAS_POR_PAGINA + 1);
    });

    it('nada de lo que anuncia se declara `noindex`: las consecuencias no discrepan', async () => {
      for (const ruta of await anunciadas()) {
        expect(caracterDe(ruta), ruta).toBe('producto');
      }
    });
  });
});

/**
 * Historia 12.1 — el fallo por superficie sin declarar tiene que ser legible.
 *
 * Que el build rompa no basta. Todo el sentido de la historia es que añadir una superficie
 * no dependa de acordarse de nada, y un `TypeError` a cuatro marcos de profundidad
 * traslada la carga de «acuérdate de tres sitios» a «adivina por qué revienta». El
 * criterio es el mismo que aplica el cotejo de la Historia 11.2: cada rechazo nombra el
 * fichero y la regla incumplida.
 */
describe('Historia 12.1 — una superficie sin declarar rompe el build diciendo por qué', () => {
  const aLimpiar: string[] = [];
  afterAll(async () => {
    await Promise.all(aLimpiar.map(limpiar));
  });

  const CORPUS_MINIMO = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'citas/seneca--poco-tiempo.md': citaValida({
      slug: 'seneca-no-es-que-tengamos-poco-tiempo',
      texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
      temas: [],
    }),
  };

  /** Una página que usa el armazón como cualquier otra, pero que nadie ha declarado. */
  const SIN_DECLARAR = `---
import Armazon from '../components/Armazon.astro';
---

<Armazon titulo="Sonda" descripcion="Sonda." ruta="/superficie-sin-declarar">
  <h1>Sonda</h1>
</Armazon>
`;

  /** La misma, olvidándose además de pasar `ruta`. */
  const SIN_RUTA = SIN_DECLARAR.replace(' ruta="/superficie-sin-declarar"', '');

  async function construirCon(pagina: string) {
    const resultado = await construirConCorpus(CORPUS_MINIMO, {
      paginas: { 'superficie-sin-declarar.astro': pagina },
    });
    aLimpiar.push(resultado.proyecto);
    return resultado;
  }

  it('el build se para, y el mensaje nombra la ruta y el fichero donde se declara', async () => {
    const { codigo, salida } = await construirCon(SIN_DECLARAR);

    expect(codigo).not.toBe(0);
    expect(salida).toContain('/superficie-sin-declarar');
    expect(salida).toContain('src/lib/superficies.ts');
    expect(salida).toMatch(/no está declarada/);
  });

  it('y no se presenta como una traza cruda', async () => {
    // El fallo que había: «TypeError: Cannot read properties of undefined (reading
    // 'replace')». Fijar solo el código de salida lo habría dejado pasar.
    const { salida } = await construirCon(SIN_DECLARAR);
    expect(salida).not.toContain('Cannot read properties of undefined');
  });

  it('una página que se olvida de pasar `ruta` también lo dice con todas las letras', async () => {
    const { codigo, salida } = await construirCon(SIN_RUTA);

    expect(codigo).not.toBe(0);
    expect(salida).toContain('src/lib/superficies.ts');
    expect(salida).toMatch(/sin `ruta`/);
    expect(salida).not.toContain('Cannot read properties of undefined');
  });
});
