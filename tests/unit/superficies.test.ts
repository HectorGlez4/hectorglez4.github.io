import { describe, expect, it } from 'vitest';
import {
  SUPERFICIES,
  anunciableEnElSitemap,
  caracterDe,
  consecuenciasDe,
  consecuenciasDelCaracter,
  rutaNormalizada,
  superficieDeclaradaDe,
  superficiesDelBarrido,
  type Caracter,
} from '../../src/lib/superficies.ts';
import { slug } from '../../src/lib/admision.ts';

/**
 * Historia 12.1 — una superficie declara en un solo sitio si es publicable.
 *
 * Todo lo de aquí es puro: la declaración no lee disco (AD-5), así que la matriz entera
 * se ejercita sin construir nada. Lo que se comprueba no es que cada ruta lleve la
 * etiqueta que le toca —eso lo mira el build—, sino que las **cuatro consecuencias no
 * pueden discrepar**, que es el defecto que la historia cierra.
 */

/** Una ruta de cada superficie declarada, para barrer la matriz completa. */
const MUESTRAS = [
  '/',
  '/cita/seneca-no-es-que-tengamos-poco-tiempo',
  '/autor/antonio-machado',
  '/autor/antonio-machado/2',
  '/autor/1984',
  '/tema/la-vida',
  '/tema/la-vida/3',
  '/buscar',
  '/404',
  '/kit',
];

describe('Historia 12.1 — las cuatro consecuencias salen de una sola declaración', () => {
  it.each(MUESTRAS)('%s no puede ser noindex fuera y visible dentro', (ruta) => {
    // El defecto de origen: `/404` y `/buscar` pedían `noindex` al buscador de fuera y
    // seguían en el índice del de dentro. No hay dos valores que ajustar, así que la
    // incoherencia ya no se puede escribir.
    const { noIndexar, enLaBusquedaPropia } = consecuenciasDe(ruta);
    expect(enLaBusquedaPropia, ruta).toBe(!noIndexar);
  });

  it.each(MUESTRAS)('%s no puede anunciarse en el sitemap y declararse noindex', (ruta) => {
    const { enElSitemap, noIndexar } = consecuenciasDe(ruta);
    expect(enElSitemap, ruta).toBe(!noIndexar);
  });

  it.each(['producto', 'servicio', 'ajena'] as Caracter[])(
    'el carácter «%s» deriva las cuatro a la vez',
    (caracter) => {
      const consecuencias = consecuenciasDelCaracter(caracter);
      const publicable = caracter === 'producto';
      expect(consecuencias).toEqual({
        enElSitemap: publicable,
        noIndexar: !publicable,
        enLaBusquedaPropia: publicable,
        enElBarrido: caracter !== 'ajena',
      });
    },
  );

  it('lo que se publica se anuncia, se indexa fuera, se indexa dentro y se barre', () => {
    expect(consecuenciasDe('/cita/seneca-no-es-que-tengamos-poco-tiempo')).toEqual({
      enElSitemap: true,
      noIndexar: false,
      enLaBusquedaPropia: true,
      enElBarrido: true,
    });
  });
});

describe('Historia 12.1 — el defecto que la historia nombra', () => {
  it.each(['/404', '/buscar'])('%s sale del índice de la búsqueda propia', (ruta) => {
    expect(consecuenciasDe(ruta).enLaBusquedaPropia).toBe(false);
  });

  it.each(['/404', '/buscar'])('%s sigue siendo una superficie del sitio y se barre', (ruta) => {
    // Salen del índice, no del producto: el 404 es una puerta de entrada (UX-DR20) y la
    // búsqueda es una herramienta que se visita. Las dos tienen que cumplir WCAG.
    expect(consecuenciasDe(ruta).enElBarrido).toBe(true);
  });

  it('el Kit Diario queda fuera de las cuatro', () => {
    expect(consecuenciasDe('/kit')).toEqual({
      enElSitemap: false,
      noIndexar: true,
      enLaBusquedaPropia: false,
      enElBarrido: false,
    });
  });
});

describe('Historia 12.1 — publicabilidad condicional', () => {
  it('la primera página de un listado es publicable', () => {
    expect(caracterDe('/autor/antonio-machado')).toBe('producto');
    expect(caracterDe('/tema/la-vida')).toBe('producto');
  });

  it('la segunda y siguientes no lo son — FR-5', () => {
    for (const ruta of ['/autor/antonio-machado/2', '/tema/la-vida/17']) {
      expect(caracterDe(ruta), ruta).toBe('servicio');
      expect(consecuenciasDe(ruta), ruta).toMatchObject({
        enElSitemap: false,
        noIndexar: true,
        enLaBusquedaPropia: false,
      });
    }
  });

  it('la condición vive en la misma declaración que la superficie', () => {
    // Si la publicabilidad condicional se declarara aparte volveríamos a tener dos sitios.
    const autor = SUPERFICIES.find((s) => s.pagina === 'autor/[slug]/[...page].astro');
    expect(autor?.noPublicableEn).toBeDefined();
    expect(autor?.noPublicableEn?.test('/autor/x/2')).toBe(true);
    expect(autor?.noPublicableEn?.test('/autor/x')).toBe(false);
  });

  it('la condición se ancla a la ruta entera, no al sufijo de dígitos', () => {
    // Escrita como `/\d+$/`, la condición dice «acaba en dígitos» y eso casa con un slug
    // que sea todo dígitos. Anclada, dice «es la página N de un listado», que es lo que
    // de verdad se quiere degradar.
    for (const pagina of ['autor/[slug]/[...page].astro', 'tema/[slug]/[...page].astro']) {
      const familia = SUPERFICIES.find((s) => s.pagina === pagina);
      expect(familia?.noPublicableEn?.source, pagina).toMatch(/^\^/);
      expect(familia?.noPublicableEn?.source, pagina).toMatch(/\$$/);
    }
  });

  it('un slug que acaba en número no se confunde con una página segunda', () => {
    // `/cita/…-1984` es una Cita, no la página 1984 de nada.
    expect(caracterDe('/cita/george-orwell-1984')).toBe('producto');
  });

  it('el esquema de slugs admite un slug enteramente numérico', () => {
    // La premisa del defecto de abajo, fijada donde se puede ver: si algún día el esquema
    // de admisión dejara de admitirlo, esta prueba avisa antes de que nadie relaje la
    // condición pensando que el caso no existe.
    expect(slug.safeParse('1984').success).toBe(true);
  });

  it('un slug enteramente numérico es producto, no la página 1984 de nada', () => {
    // El defecto: con la condición escrita como sufijo, `/autor/1984` casaba y se
    // degradaba a servicio sin que nadie lo decidiera —fuera del sitemap, con `noindex` y
    // fuera del índice de la búsqueda propia—.
    for (const ruta of ['/autor/1984', '/tema/1984', '/cita/1984']) {
      expect(caracterDe(ruta), ruta).toBe('producto');
      expect(anunciableEnElSitemap(ruta), ruta).toBe(true);
      expect(consecuenciasDe(ruta), ruta).toMatchObject({
        enElSitemap: true,
        noIndexar: false,
        enLaBusquedaPropia: true,
      });
    }
  });

  it('y la página segunda de un listado sigue siendo servicio, incluso bajo un slug numérico', () => {
    // El otro lado: arreglar el falso positivo no puede abrir un falso negativo.
    for (const ruta of ['/autor/antonio-machado/2', '/tema/la-vida/2', '/autor/1984/2']) {
      expect(caracterDe(ruta), ruta).toBe('servicio');
      expect(anunciableEnElSitemap(ruta), ruta).toBe(false);
    }
  });
});

describe('Historia 12.1 — una superficie sin declaración no pasa desapercibida', () => {
  it('rompe, en vez de decidir por su cuenta', () => {
    expect(() => caracterDe('/coleccion/frases-cortas')).toThrow(/no está declarada/);
  });

  it('el mensaje nombra el fichero que hay que tocar', () => {
    expect(() => caracterDe('/nueva')).toThrow(/src\/lib\/superficies\.ts/);
  });

  it('una página que se olvida de pasar `ruta` no revienta con una traza cruda', () => {
    // El fallo real que había: `rutaNormalizada(undefined)` daba «Cannot read properties
    // of undefined (reading 'replace')» a cuatro marcos de profundidad, y quien añadía la
    // superficie tenía que deducir qué le faltaba. Ahora el mensaje lo dice.
    for (const nada of [undefined, null, '', '   ']) {
      expect(() => consecuenciasDe(nada as unknown as string)).toThrow(/sin `ruta`/);
      expect(() => consecuenciasDe(nada as unknown as string)).toThrow(
        /src\/lib\/superficies\.ts/,
      );
    }
  });

  it('una ruta relativa se rechaza diciendo qué le falta, no «no está declarada»', () => {
    expect(() => caracterDe('buscar')).toThrow(/no empieza por «\/»/);
    expect(() => caracterDe('buscar')).toThrow(/src\/lib\/superficies\.ts/);
  });

  it('ninguno de los tres fallos se presenta como un TypeError', () => {
    // Un `TypeError` es una traza; lo que la historia exige es un error propio que nombre
    // la ruta y el fichero donde se declara.
    const fallos = [
      () => consecuenciasDe(undefined as unknown as string),
      () => caracterDe('buscar'),
      () => caracterDe('/coleccion/frases-cortas'),
    ];
    for (const fallar of fallos) {
      expect(fallar).toThrow(Error);
      expect(fallar).not.toThrow(TypeError);
    }
  });

  it('y el sitemap no la anuncia: el silencio nunca publica de más', () => {
    // Aquí no se rompe a propósito: el filtro ve también las páginas sonda que alguna
    // prueba de build añade al proyecto temporal. Quien grita es el armazón.
    expect(anunciableEnElSitemap('/sonda')).toBe(false);
    expect(superficieDeclaradaDe('/sonda')).toBeUndefined();
  });
});

describe('Historia 12.1 — el filtro del sitemap consume la declaración', () => {
  it('anuncia la portada, las Citas, los Autores y los Temas', () => {
    for (const ruta of ['/', '/cita/x', '/autor/x', '/tema/x']) {
      expect(anunciableEnElSitemap(`https://sabiduriadebolsillo.net${ruta}`), ruta).toBe(true);
    }
  });

  it('no anuncia las páginas 2+, ni la búsqueda, ni el Kit, ni la 404', () => {
    for (const ruta of ['/autor/x/2', '/tema/x/2', '/buscar', '/kit', '/404']) {
      expect(anunciableEnElSitemap(`https://sabiduriadebolsillo.net${ruta}`), ruta).toBe(false);
    }
  });

  it('una dirección mal dicha no se anuncia, en vez de tumbar la construcción', () => {
    // `rutaNormalizada` rompe con nombre ante lo que no sabe leer, y donde llama el
    // armazón eso es lo correcto. Aquí no: el filtro no construye nada, así que su
    // docblock promete «lo no declarado no se anuncia, en vez de romper» y lo cumple.
    for (const mala of [undefined, null, '', '   ', 'buscar', 42]) {
      const etiqueta = String(mala);
      expect(() => anunciableEnElSitemap(mala as unknown as string), etiqueta).not.toThrow();
      expect(anunciableEnElSitemap(mala as unknown as string), etiqueta).toBe(false);
    }
  });

  it('la portada llega con y sin barra final, y las dos son la misma superficie', () => {
    // El sitemap emite la raíz como `https://dominio` a secas; `new URL(…).pathname` la
    // devuelve como `/`. Una barra de más no puede cambiar la respuesta.
    expect(anunciableEnElSitemap('https://sabiduriadebolsillo.net')).toBe(true);
    expect(anunciableEnElSitemap('https://sabiduriadebolsillo.net/')).toBe(true);
    expect(rutaNormalizada('/buscar/')).toBe('/buscar');
    expect(rutaNormalizada('https://sabiduriadebolsillo.net/kit')).toBe('/kit');
  });
});

describe('Historia 12.1 — el barrido de accesibilidad se deriva, no se escribe', () => {
  /** Un sitio construido de juguete, con varias rutas por familia. */
  const CONSTRUIDAS = [
    '/',
    '/404',
    '/buscar',
    '/kit',
    '/cita/zenon-lo-ultimo',
    '/cita/antonio-machado-hoy-es-siempre-todavia',
    '/autor/rosalia-de-castro',
    '/autor/antonio-machado',
    '/autor/antonio-machado/2',
    '/tema/la-vida',
  ];

  it('barre una superficie de cada familia y ninguna dos veces', () => {
    expect(superficiesDelBarrido(CONSTRUIDAS)).toEqual([
      '/',
      '/cita/antonio-machado-hoy-es-siempre-todavia',
      '/autor/antonio-machado',
      '/tema/la-vida',
      '/buscar',
      '/404',
    ]);
  });

  it('el Kit no entra: no es una superficie que nadie lea', () => {
    expect(superficiesDelBarrido(CONSTRUIDAS)).not.toContain('/kit');
  });

  it('una superficie pública nueva entra sola, sin añadirse a ninguna lista', () => {
    // El criterio de aceptación, ejercitado por el lado que se puede: la familia de Tema
    // no aparece mientras el build no genere ninguna de sus rutas, y aparece en cuanto lo
    // hace. Nadie escribe la ruta en ningún sitio.
    const sinTemas = CONSTRUIDAS.filter((ruta) => !ruta.startsWith('/tema/'));
    expect(superficiesDelBarrido(sinTemas)).not.toContain('/tema/la-vida');
    expect(superficiesDelBarrido(CONSTRUIDAS)).toContain('/tema/la-vida');
  });

  it('dos ejecuciones con el mismo sitio barren exactamente lo mismo', () => {
    const desordenadas = [...CONSTRUIDAS].reverse();
    expect(superficiesDelBarrido(desordenadas)).toEqual(superficiesDelBarrido(CONSTRUIDAS));
  });

  it('la muestra de un listado es la primera página, no la segunda', () => {
    expect(superficiesDelBarrido(CONSTRUIDAS)).toContain('/autor/antonio-machado');
    expect(superficiesDelBarrido(CONSTRUIDAS)).not.toContain('/autor/antonio-machado/2');
  });
});

describe('Historia 12.1 — la declaración está sana', () => {
  it('ninguna ruta pertenece a dos superficies', () => {
    for (const ruta of MUESTRAS) {
      const casan = SUPERFICIES.filter((s) => s.reconoce.test(ruta));
      expect(casan.map((s) => s.nombre), ruta).toHaveLength(1);
    }
  });

  it('ningún reconocedor lleva la bandera global, que guardaría estado entre llamadas', () => {
    // Con `/g`, `test` avanza `lastIndex` y la segunda llamada con la misma ruta devuelve
    // `false`: la mitad de las páginas se quedaría sin declaración en el mismo build.
    for (const superficie of SUPERFICIES) {
      expect(superficie.reconoce.global, superficie.nombre).toBe(false);
      expect(superficie.noPublicableEn?.global ?? false, superficie.nombre).toBe(false);
    }
  });

  it('cada superficie declara nombre, página y carácter', () => {
    for (const superficie of SUPERFICIES) {
      expect(superficie.nombre.length).toBeGreaterThan(0);
      expect(superficie.pagina).toMatch(/\.astro$/);
      expect(['producto', 'servicio', 'ajena']).toContain(superficie.caracter);
    }
  });

  it('solo lo que es producto puede tener publicabilidad condicional', () => {
    // Degradar a `servicio` algo que ya lo es sería una condición muerta que confunde.
    for (const superficie of SUPERFICIES) {
      if (superficie.noPublicableEn === undefined) continue;
      expect(superficie.caracter, superficie.nombre).toBe('producto');
    }
  });
});
