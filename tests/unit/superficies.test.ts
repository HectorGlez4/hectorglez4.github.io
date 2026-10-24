import axe from 'axe-core';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CRITERIOS_QUE_AÑADE_WCAG_22,
  ETIQUETAS_DEL_BARRIDO,
  ETIQUETAS_QUE_AXE_NO_CORRE,
  SUPERFICIES,
  axeLaCorre,
  anunciableEnElSitemap,
  caracterDe,
  consecuenciasDe,
  consecuenciasDelCaracter,
  declararRutasIndexables,
  elBarridoLaCorre,
  esServicioPorForma,
  etiquetaDeAxe,
  olvidarRutasIndexables,
  rutaNormalizada,
  superficieDeclaradaDe,
  superficiesDelBarrido,
  type Caracter,
  type ReglaDeAxe,
} from '../../src/lib/superficies.ts';
import { slug } from '../../src/lib/admision.ts';
import { EVENTOS } from '../../src/lib/medicion.ts';

/**
 * Historia 12.1 — una superficie declara en un solo sitio si es publicable.
 *
 * Todo lo de aquí es puro: la declaración no lee disco (AD-5), así que la matriz entera
 * se ejercita sin construir nada. Lo que se comprueba no es que cada ruta lleve la
 * etiqueta que le toca —eso lo mira el build—, sino que las **consecuencias no pueden
 * discrepar**, que es el defecto que la historia cierra. (Eran cuatro; la 23.1 añadió la
 * medición: si la ruta carga el fichero y qué vistas emite.)
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
  '/coleccion/frases-cortas-para-reflexionar',
  '/coleccion/frases-cortas-para-reflexionar/2',
  '/buscar',
  '/404',
  '/kit',
  '/lote',
  // Historia 22.4 — la Obra, indexable y no indexable (la lista se declara abajo) y su 2+.
  '/obra/baltasar-gracian/oraculo-manual-y-arte-de-prudencia',
  '/obra/baltasar-gracian/el-criticon',
  '/obra/baltasar-gracian/oraculo-manual-y-arte-de-prudencia/2',
];

/*
 * La Página de Obra solo sabe si se indexa con la lista que declara el dueño del conjunto
 * publicable (FR-52). Aquí se declara una, con una Obra dentro y otra fuera, para que la matriz
 * de abajo recorra los dos casos. El fallo cerrado sin lista se prueba en
 * `obra-indexable.test.ts`.
 */
beforeEach(() => {
  declararRutasIndexables(['/obra/baltasar-gracian/oraculo-manual-y-arte-de-prudencia/']);
});
afterEach(() => {
  olvidarRutasIndexables();
});

describe('Historia 12.1 — las consecuencias salen de una sola declaración', () => {
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
    'el carácter «%s» deriva todas a la vez',
    (caracter) => {
      const consecuencias = consecuenciasDelCaracter(caracter);
      const publicable = caracter === 'producto';
      expect(consecuencias).toEqual({
        enElSitemap: publicable,
        noIndexar: !publicable,
        enLaBusquedaPropia: publicable,
        enElBarrido: caracter !== 'ajena',
        // Historia 23.1 — toda superficie que se visita carga el fichero de medición.
        cargaLaMedicion: caracter !== 'ajena',
      });
    },
  );

  it('lo que se publica se anuncia, se indexa fuera, se indexa dentro y se barre', () => {
    expect(consecuenciasDe('/cita/seneca-no-es-que-tengamos-poco-tiempo')).toEqual({
      enElSitemap: true,
      noIndexar: false,
      enLaBusquedaPropia: true,
      enElBarrido: true,
      cargaLaMedicion: true,
      vistas: [EVENTOS.vistaDeCita],
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

  it.each(['/kit', '/lote'])('%s queda fuera de todas', (ruta) => {
    // El Kit y el lote son la misma clase de cosa: material de publicación, no contenido.
    // El lote entró en la Historia 13.1 con una sola línea de declaración y sin tocar nada
    // más, que es exactamente lo que la 12.1 prometía.
    expect(consecuenciasDe(ruta)).toEqual({
      enElSitemap: false,
      noIndexar: true,
      enLaBusquedaPropia: false,
      enElBarrido: false,
      // Historia 23.1 — llevan el arranque, como toda página, pero no piden el fichero ni
      // emiten vista: son material de publicación, no lectura.
      cargaLaMedicion: false,
      vistas: [],
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
    // Era `/coleccion/…`, la superficie que la 12.1 imaginaba como la siguiente. La 12.3 la
    // declaró, así que hace falta una que de verdad no exista: si esta prueba se quedara
    // con una ruta declarada, dejaría de comprobar nada sin dar señal.
    expect(() => caracterDe('/antologia/frases-cortas')).toThrow(/no está declarada/);
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
      () => caracterDe('/antologia/frases-cortas'),
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
  it('anuncia la portada, las Citas, los Autores, los Temas y las Colecciones', () => {
    for (const ruta of ['/', '/cita/x', '/autor/x', '/tema/x', '/coleccion/x']) {
      expect(anunciableEnElSitemap(`https://sabiduriadebolsillo.net${ruta}`), ruta).toBe(true);
    }
  });

  it('no anuncia las páginas 2+, ni la búsqueda, ni el Kit, ni el lote, ni la 404', () => {
    for (const ruta of [
      '/autor/x/2',
      '/tema/x/2',
      '/coleccion/x/2',
      '/buscar',
      '/kit',
      '/lote',
      '/404',
    ]) {
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
    '/lote',
    '/cita/zenon-lo-ultimo',
    '/cita/antonio-machado-hoy-es-siempre-todavia',
    '/autor/rosalia-de-castro',
    '/autor/antonio-machado',
    '/autor/antonio-machado/2',
    '/tema/la-vida',
    '/coleccion/frases-cortas',
    '/coleccion/frases-cortas/2',
  ];

  it('barre una superficie de cada familia y ninguna dos veces', () => {
    expect(superficiesDelBarrido(CONSTRUIDAS)).toEqual([
      '/',
      '/cita/antonio-machado-hoy-es-siempre-todavia',
      '/autor/antonio-machado',
      '/tema/la-vida',
      '/coleccion/frases-cortas',
      '/buscar',
      '/404',
    ]);
  });

  it.each(['/kit', '/lote'])('%s no entra: no es una superficie que nadie lea', (ruta) => {
    expect(CONSTRUIDAS, 'la premisa: la ruta está construida').toContain(ruta);
    expect(superficiesDelBarrido(CONSTRUIDAS)).not.toContain(ruta);
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
    expect(superficiesDelBarrido(CONSTRUIDAS)).not.toContain('/coleccion/frases-cortas/2');
  });

  it('la Colección entra en el barrido sin escribirse en ninguna lista — Historia 12.3', () => {
    // El criterio de aceptación de la 12.3, por el lado puro: la familia aparece en cuanto
    // el build genera una de sus rutas, y desaparece cuando no. Lo único que se escribió
    // para que ocurra es su declaración en `src/lib/superficies.ts`.
    const sinColecciones = CONSTRUIDAS.filter((ruta) => !ruta.startsWith('/coleccion/'));
    expect(superficiesDelBarrido(sinColecciones)).not.toContain('/coleccion/frases-cortas');
    expect(superficiesDelBarrido(CONSTRUIDAS)).toContain('/coleccion/frases-cortas');
  });
});

/**
 * Historia 23.4 — el barrido pide WCAG 2.2 AA, y lo pide desde un solo sitio (AD-17).
 *
 * Es la gemela de CI del barrido local, con el patrón de `publicable-y-alcanzable.test.ts`: el
 * CI no ejecuta `npm run test:e2e`, así que lo que el barrido pide a axe, la versión de axe que
 * lo resuelve, que ninguna prueba escriba su propia lista, apague una regla o acote el barrido, y
 * que los motivos de lo que axe no mide sigan siendo ciertos en el código se vigila aquí, sin
 * navegador y sin build. Lo que solo un navegador puede decir —que el sitio pasa, que el barrido
 * corrió entero, y que `target-size` distingue el solape con el mismo destino del solape con
 * otro— lo dice `tests/e2e/accesibilidad.spec.ts`.
 */
describe('Historia 23.4 — el barrido pide WCAG 2.2 AA desde un solo sitio', () => {
  const RAIZ = join(import.meta.dirname, '..', '..');

  /**
   * Lo que no casa entre el reparto declarado y las reglas de axe, una frase por desajuste.
   * Es una función y no tres `expect` sueltos para poder darle reglas inventadas y ver que de
   * verdad avisa: una comprobación que solo se ha visto en verde no se sabe si mira algo.
   *
   * «Regla de axe» es aquí lo mismo que en el navegador: una que axe corre (`axeLaCorre`). Una
   * experimental o retirada no corre en el barrido, así que ni responde de un criterio `axe` ni
   * desmiente un `ux` o un `no-aplica`; si las dos gemelas no contaran lo mismo, esta pediría
   * reclasificar algo que la otra, que no la ve correr, rechazaría después.
   */
  function desajustesConAxe(reglas: readonly ReglaDeAxe[]): string[] {
    const desajustes: string[] = [];
    for (const criterio of CRITERIOS_QUE_AÑADE_WCAG_22) {
      const etiqueta = etiquetaDeAxe(criterio.criterio);
      if (criterio.comprueba === 'axe') {
        const regla = reglas.find((r) => r.ruleId === criterio.regla);
        if (regla === undefined) {
          desajustes.push(`${criterio.criterio}: la regla ${criterio.regla} no existe en esta axe`);
          continue;
        }
        if (!regla.tags.includes(etiqueta)) {
          desajustes.push(`${criterio.criterio}: ${criterio.regla} no lleva la etiqueta ${etiqueta}`);
        }
        if (!axeLaCorre(regla)) {
          desajustes.push(
            `${criterio.criterio}: ${criterio.regla} es experimental o está retirada y el barrido no la corre: ` +
              'o se pide por su nombre, o el criterio deja de ser «axe»',
          );
        } else if (!elBarridoLaCorre(regla)) {
          desajustes.push(
            `${criterio.criterio}: ${criterio.regla} no lleva ninguna etiqueta de ETIQUETAS_DEL_BARRIDO: ` +
              'el barrido no la corre hasta que se pida la suya',
          );
        }
        continue;
      }
      for (const regla of reglas.filter((r) => axeLaCorre(r) && r.tags.includes(etiqueta))) {
        desajustes.push(
          `${criterio.criterio} se declara «${criterio.comprueba}», pero axe ya lo mide con ${regla.ruleId}: ` +
            'hay que reclasificarlo en CRITERIOS_QUE_AÑADE_WCAG_22',
        );
      }
    }
    const reglasDeLosCriterios = new Set(
      CRITERIOS_QUE_AÑADE_WCAG_22.flatMap((c) => (c.comprueba === 'axe' ? [c.regla] : [])),
    );
    for (const regla of reglas.filter(axeLaCorre)) {
      const de22 = regla.tags.includes('wcag22a') || regla.tags.includes('wcag22aa');
      if (de22 && !reglasDeLosCriterios.has(regla.ruleId)) {
        desajustes.push(`${regla.ruleId} es de WCAG 2.2 y ningún criterio «axe» de la declaración la cubre`);
      }
    }
    return desajustes;
  }

  /**
   * Lo que un fichero de `tests/e2e/` hace mal con el barrido, una frase por falta. Mismo motivo
   * para ser función: se le da una fuente inventada y se ve que la encuentra.
   *
   * Lee el código, así que no prueba nada por sí sola —lo que el barrido corrió de verdad lo
   * coteja el navegador con `desviacionDelBarrido`—, pero es lo único que lo vigila en el CI. Mira
   * cada `new AxeBuilder(…)` como una cadena entera hasta su `.analyze()`, sin cruzar un `;`: así
   * ve qué pide cada barrido y no solo que el fichero diga bien alguna llamada. Un `AxeBuilder`
   * guardado en una variable y analizado después no se deja leer así, y por eso es una falta.
   */
  function faltasDelBarrido(fuente: string): string[] {
    const faltas: string[] = [];
    if (/\bAxeBuilder\b/.test(fuente)) {
      const constructores = fuente.match(/new\s+AxeBuilder\s*\(/g)?.length ?? 0;
      if (constructores > 0) {
        const importa =
          /import\s*\{[^}]*\bETIQUETAS_DEL_BARRIDO\b[^}]*\}\s*from\s*['"](?:\.\.\/)+src\/lib\/superficies\.ts['"]/.test(
            fuente,
          );
        if (!importa) faltas.push('usa AxeBuilder sin importar ETIQUETAS_DEL_BARRIDO de src/lib/superficies.ts');
      }
      const cadenas = [...fuente.matchAll(/new\s+AxeBuilder\s*\(([^;]*?)\.analyze\s*\(\s*\)/g)].map((m) => m[1] ?? '');
      if (cadenas.length !== constructores) {
        faltas.push(
          `${constructores - cadenas.length} AxeBuilder fuera de una sola expresión que acabe en .analyze(): ` +
            'así no se ve qué pide',
        );
      }
      for (const cadena of cadenas) {
        const conEtiquetas = /\.withTags\s*\(/.test(cadena);
        const conReglas = /\.withRules\s*\(/.test(cadena);
        const acotada = /\.include\s*\(/.test(cadena);
        if (conEtiquetas && (conReglas || acotada)) {
          faltas.push('acota con .withRules( o .include( un barrido por etiquetas: deja de ser el de página entera');
        } else if (conReglas && !acotada) {
          faltas.push('llama a .withRules( sobre la página entera: sustituye las etiquetas del barrido');
        } else if (!conEtiquetas && !conReglas) {
          faltas.push('un AxeBuilder sin .withTags([...ETIQUETAS_DEL_BARRIDO]) ni .include(…).withRules(…)');
        }
      }
      const llamadas = fuente.match(/\.withTags\s*\(/g)?.length ?? 0;
      const bienDichas = fuente.match(/\.withTags\s*\(\s*\[\s*\.\.\.\s*ETIQUETAS_DEL_BARRIDO\s*\]\s*\)/g)?.length ?? 0;
      if (llamadas !== bienDichas) {
        faltas.push(`${llamadas - bienDichas} llamada(s) a withTags que no pasan [...ETIQUETAS_DEL_BARRIDO]`);
      }
      if (/\baxeSource\b/.test(fuente)) faltas.push('inyecta su propia axe con axeSource');
      for (const prohibida of ['disableRules', 'exclude', 'options']) {
        if (new RegExp(`\\.${prohibida}\\s*\\(`).test(fuente)) faltas.push(`llama a .${prohibida}(`);
      }
      if (/\baxe\s*\.\s*configure\s*\(/.test(fuente)) faltas.push('reconfigura axe con axe.configure(');
    }
    // En todo fichero, use AxeBuilder o no: una lista escrita en una ayuda llega igual a un barrido.
    // Las comillas invertidas cuentan, así que un comentario nombra las etiquetas sin ellas.
    const literales = fuente.match(/[`'"]wcag2[^`'"]*[`'"]/g) ?? [];
    if (literales.length > 0) faltas.push(`escribe etiquetas a mano: ${literales.join(', ')}`);
    return faltas;
  }

  /** Todo guion de `tests/e2e/`, también los de `ayuda/` y sea cual sea su extensión, relativo a la raíz. */
  function ficherosDePlaywright(): string[] {
    const ficheros: string[] = [];
    const recorrer = (dir: string) => {
      for (const entrada of readdirSync(dir)) {
        const completa = join(dir, entrada);
        if (statSync(completa).isDirectory()) recorrer(completa);
        else if (/\.(?:[cm]?[jt]s|[jt]sx)$/.test(entrada)) ficheros.push(relative(RAIZ, completa));
      }
    };
    recorrer(join(RAIZ, 'tests', 'e2e'));
    return ficheros.sort();
  }

  /**
   * Lo que desmentiría en el código el motivo de un criterio que axe no mide. 2.4.11 se da por
   * cumplido porque nada fijo tapa el foco, 2.5.7 porque nada se arrastra y 3.3.8 no aplica
   * porque no hay autenticación: los tres se dejan ver en el marcado, el estilo o los guiones, y
   * el día que aparezcan el título del barrido seguiría diciéndolo sin que nada fallara. De 3.2.6
   * —ningún mecanismo de ayuda— y 3.3.7 —ningún dato pedido dos veces— no hay señal que se pueda
   * buscar en el código, y no se finge una.
   */
  const SEÑALES_QUE_DESMIENTEN: Record<string, { que: string; patron: RegExp }> = {
    '2.4.11': { que: 'algo fijo o pegado al desplazar', patron: /position\s*[:=]\s*['"]?(?:fixed|sticky)\b/ },
    '2.5.7': { que: 'algo que se arrastra', patron: /\bdraggable\b|\b(?:dragstart|pointermove|touchmove)\b/ },
    '3.3.8': {
      que: 'un campo de contraseña o de código de acceso',
      patron: /type\s*=\s*['"]?password\b|\b(?:current-password|new-password|one-time-code)\b/,
    },
  };

  /** Lo que se publica o se ejecuta en el navegador: `src/` y `public/`, solo ficheros de texto. */
  function ficherosDelSitio(): string[] {
    const ficheros: string[] = [];
    const recorrer = (dir: string) => {
      for (const entrada of readdirSync(dir)) {
        const completa = join(dir, entrada);
        if (statSync(completa).isDirectory()) recorrer(completa);
        else if (/\.(?:astro|[cm]?[jt]sx?|css|html)$/.test(entrada)) ficheros.push(relative(RAIZ, completa));
      }
    };
    recorrer(join(RAIZ, 'src'));
    recorrer(join(RAIZ, 'public'));
    return ficheros.sort();
  }

  it('pide las cuatro etiquetas de WCAG 2.1 AA y la de 2.2 AA, y ninguna más', () => {
    expect([...ETIQUETAS_DEL_BARRIDO]).toEqual(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']);
  });

  it('declara los seis criterios A y AA que añade 2.2, y quién responde de cada uno', () => {
    expect(CRITERIOS_QUE_AÑADE_WCAG_22.map((c) => [c.criterio, c.nivel, c.comprueba])).toEqual([
      ['2.4.11', 'AA', 'ux'],
      ['2.5.7', 'AA', 'ux'],
      ['2.5.8', 'AA', 'axe'],
      ['3.2.6', 'A', 'no-aplica'],
      ['3.3.7', 'A', 'no-aplica'],
      ['3.3.8', 'AA', 'no-aplica'],
    ]);
    const tamaño = CRITERIOS_QUE_AÑADE_WCAG_22.find((c) => c.criterio === '2.5.8');
    expect(tamaño?.comprueba === 'axe' ? tamaño.regla : undefined).toBe('target-size');
    for (const criterio of CRITERIOS_QUE_AÑADE_WCAG_22) {
      expect(criterio.nombre.trim(), criterio.criterio).not.toBe('');
      if (criterio.comprueba !== 'axe') expect(criterio.motivo.trim(), criterio.criterio).not.toBe('');
    }
  });

  it('compone la etiqueta de axe de un criterio, y rompe ante lo que no lo es', () => {
    expect(etiquetaDeAxe('2.4.11')).toBe('wcag2411');
    expect(etiquetaDeAxe('2.5.8')).toBe('wcag258');
    expect(etiquetaDeAxe('3.3.8')).toBe('wcag338');
    for (const mal of ['', '2.5', 'wcag258', '2.5.8.1', '5.1.1']) {
      expect(() => etiquetaDeAxe(mal), mal).toThrow(/criterio de WCAG/);
    }
  });

  it('distingue lo que axe corre de lo que el barrido corre', () => {
    expect([...ETIQUETAS_QUE_AXE_NO_CORRE]).toEqual(['experimental', 'deprecated']);
    expect(axeLaCorre({ ruleId: 'a', tags: ['wcag22a', 'wcag326'] })).toBe(true);
    expect(elBarridoLaCorre({ ruleId: 'a', tags: ['wcag22a', 'wcag326'] })).toBe(false);
    expect(elBarridoLaCorre({ ruleId: 'b', tags: ['wcag22aa', 'wcag258'] })).toBe(true);
    expect(axeLaCorre({ ruleId: 'c', tags: ['wcag2a', 'experimental'] })).toBe(false);
    expect(elBarridoLaCorre({ ruleId: 'c', tags: ['wcag2a', 'experimental'] })).toBe(false);
    expect(elBarridoLaCorre({ ruleId: 'd', tags: ['wcag2a', 'deprecated'] })).toBe(false);
  });

  describe('contra las reglas de la axe instalada', () => {
    const reglas: ReglaDeAxe[] = axe.getRules().map((r) => ({ ruleId: r.ruleId, tags: r.tags }));
    const SUBIR_AXE =
      'Subir axe es un acto y no una actualización de rutina: el adaptador fija axe-core ~4.14.0, y la ' +
      '4.14.0 es la que se comprobó que deja de dar target-size en solapes con el mismo destino. Para ' +
      'subirla: las dos a la vez con npm install, el barrido local de tests/e2e/accesibilidad.spec.ts en ' +
      'los dos perfiles —con las dos filas del solape— y, si pasa, la versión nueva aquí.';

    it('es la 4.14.0, la que ya no da target-size en solapes con el mismo destino', () => {
      expect(axe.version, SUBIR_AXE).toBe('4.14.0');
    });

    it('el reparto declarado casa con sus reglas', () => {
      expect(reglas.length, 'axe.getRules() no devolvió nada').toBeGreaterThan(0);
      expect(desajustesConAxe(reglas)).toEqual([]);
    });

    it('la regla de 2.5.8 existe, lleva su etiqueta y una de las del barrido', () => {
      const regla = reglas.find((r) => r.ruleId === 'target-size');
      expect(regla?.tags).toContain('wcag258');
      expect(regla?.tags).toContain('wcag22aa');
    });

    it('si axe trae regla para un criterio que se da por cumplido o no aplica, pide reclasificarlo', () => {
      const conRegla = [...reglas, { ruleId: 'foco-tapado', tags: ['wcag22aa', 'wcag2411'] }];
      expect(desajustesConAxe(conRegla)).toEqual([
        expect.stringMatching(/^2\.4\.11 se declara «ux», pero axe ya lo mide con foco-tapado: .*reclasificarlo/),
        'foco-tapado es de WCAG 2.2 y ningún criterio «axe» de la declaración la cubre',
      ]);
      // También la de un criterio A, aunque el barrido no pida su etiqueta y nunca la ejecute.
      const deNivelA = [...reglas, { ruleId: 'ayuda-movida', tags: ['wcag22a', 'wcag326'] }];
      expect(desajustesConAxe(deNivelA)).toEqual([
        expect.stringMatching(/^3\.2\.6 se declara «no-aplica», pero axe ya lo mide con ayuda-movida: /),
        'ayuda-movida es de WCAG 2.2 y ningún criterio «axe» de la declaración la cubre',
      ]);
      const sinRegla = reglas.filter((r) => r.ruleId !== 'target-size');
      expect(desajustesConAxe(sinRegla)).toEqual(['2.5.8: la regla target-size no existe en esta axe']);
    });

    it('una regla experimental no cuenta: ni desmiente un «ux» ni responde de un «axe»', () => {
      const experimental = [...reglas, { ruleId: 'foco-tapado', tags: ['wcag22aa', 'wcag2411', 'experimental'] }];
      expect(desajustesConAxe(experimental)).toEqual([]);

      const tamañoExperimental = reglas.map((r) =>
        r.ruleId === 'target-size' ? { ...r, tags: [...r.tags, 'experimental'] } : r,
      );
      expect(desajustesConAxe(tamañoExperimental)).toEqual([
        expect.stringMatching(/^2\.5\.8: target-size es experimental o está retirada y el barrido no la corre/),
      ]);

      const tamañoDeNivelA = reglas.map((r) =>
        r.ruleId === 'target-size' ? { ...r, tags: r.tags.map((t) => (t === 'wcag22aa' ? 'wcag22a' : t)) } : r,
      );
      expect(desajustesConAxe(tamañoDeNivelA)).toEqual([
        expect.stringMatching(/^2\.5\.8: target-size no lleva ninguna etiqueta de ETIQUETAS_DEL_BARRIDO/),
      ]);
    });
  });

  it('el lock resuelve una sola axe-core, la 4.14.0, y las dos son dependencias directas de desarrollo', () => {
    const lock = JSON.parse(readFileSync(join(RAIZ, 'package-lock.json'), 'utf8')) as {
      packages: Record<string, { version?: string; devDependencies?: Record<string, string> }>;
    };
    // Subirla es un acto: el porqué y los pasos, en la prueba de `axe.version`.
    expect(lock.packages['node_modules/axe-core']?.version).toBe('4.14.0');
    expect(lock.packages['node_modules/@axe-core/playwright']?.version).toBe('4.14.0');
    expect(lock.packages['node_modules/@axe-core/playwright/node_modules/axe-core']).toBeUndefined();
    expect(Object.keys(lock.packages).filter((clave) => /(^|\/)node_modules\/axe-core$/.test(clave))).toEqual([
      'node_modules/axe-core',
    ]);
    expect(Object.keys(lock.packages['']?.devDependencies ?? {})).toEqual(
      expect.arrayContaining(['axe-core', '@axe-core/playwright']),
    );

    const paquete = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8')) as {
      devDependencies: Record<string, string>;
    };
    expect(paquete.devDependencies['axe-core']).toBe('^4.14.0');
    expect(paquete.devDependencies['@axe-core/playwright']).toBe('^4.14.0');
  });

  it('ningún fichero de tests/e2e/ escribe su lista, apaga una regla o un nodo, ni acota el barrido', () => {
    const ficheros = ficherosDePlaywright();
    expect(ficheros).toContain('tests/e2e/ayuda/barrido.ts');
    const conAxe = ficheros.filter((f) => /new\s+AxeBuilder\s*\(/.test(readFileSync(join(RAIZ, f), 'utf8')));
    // Sin esto, un barrido que dejara de existir dejaría la comprobación en verde por vacía.
    expect(conAxe).toEqual(
      expect.arrayContaining(['tests/e2e/accesibilidad.spec.ts', 'tests/e2e/ingreso-accesible.spec.ts']),
    );

    const faltas = ficheros.flatMap((f) =>
      faltasDelBarrido(readFileSync(join(RAIZ, f), 'utf8')).map((falta) => `${f}: ${falta}`),
    );
    expect(faltas).toEqual([]);
  });

  it('la comprobación de tests/e2e/ encuentra lo que dice buscar', () => {
    const bien = [
      "import { ETIQUETAS_DEL_BARRIDO } from '../../src/lib/superficies.ts';",
      'await new AxeBuilder({ page }).withTags([...ETIQUETAS_DEL_BARRIDO]).analyze();',
      "await new AxeBuilder({ page })\n  .include(`[data-x=\"y\"]`)\n  .withRules(['color-contrast'])\n  .analyze();",
      "test.describe.configure({ mode: 'serial' });",
    ].join('\n');
    expect(faltasDelBarrido(bien)).toEqual([]);

    const mal = [
      "import { rutaDeCita } from '../../src/lib/superficies.ts';",
      "await new AxeBuilder({ page }).withTags(['wcag2a', \"wcag21aa\"]).analyze();",
      "await new AxeBuilder({ page }).disableRules(['region']).exclude('#x').options({}).analyze();",
    ].join('\n');
    expect(faltasDelBarrido(mal)).toEqual([
      'usa AxeBuilder sin importar ETIQUETAS_DEL_BARRIDO de src/lib/superficies.ts',
      'un AxeBuilder sin .withTags([...ETIQUETAS_DEL_BARRIDO]) ni .include(…).withRules(…)',
      '1 llamada(s) a withTags que no pasan [...ETIQUETAS_DEL_BARRIDO]',
      'llama a .disableRules(',
      'llama a .exclude(',
      'llama a .options(',
      "escribe etiquetas a mano: 'wcag2a', \"wcag21aa\"",
    ]);

    // Lo que acota un barrido sin apagar nada, que la versión anterior de esta guardia no veía.
    const acotada = [
      "import { ETIQUETAS_DEL_BARRIDO } from '../../src/lib/superficies.ts';",
      "await new AxeBuilder({ page }).withTags([...ETIQUETAS_DEL_BARRIDO]).withRules(['region']).analyze();",
      "await new AxeBuilder({ page }).include('main').withTags([...ETIQUETAS_DEL_BARRIDO]).analyze();",
      "await new AxeBuilder({ page }).withRules(['region']).analyze();",
      "await new AxeBuilder({ page, axeSource: fuenteVieja }).withTags([...ETIQUETAS_DEL_BARRIDO]).analyze();",
      'const suelto = new AxeBuilder({ page });',
      "await page.evaluate(() => axe.configure({ rules: [{ id: 'region', enabled: false }] }));",
      'const etiqueta = `wcag22aa`;',
    ].join('\n');
    expect(faltasDelBarrido(acotada)).toEqual([
      '1 AxeBuilder fuera de una sola expresión que acabe en .analyze(): así no se ve qué pide',
      'acota con .withRules( o .include( un barrido por etiquetas: deja de ser el de página entera',
      'acota con .withRules( o .include( un barrido por etiquetas: deja de ser el de página entera',
      'llama a .withRules( sobre la página entera: sustituye las etiquetas del barrido',
      'inyecta su propia axe con axeSource',
      'reconfigura axe con axe.configure(',
      'escribe etiquetas a mano: `wcag22aa`',
    ]);

    // Un fichero sin AxeBuilder puede llamar a lo que quiera: `.exclude(` de otra cosa no es un barrido.
    expect(faltasDelBarrido("const fuera = esquema.exclude('x').options({});")).toEqual([]);
  });

  it('las señales que desmentirían un motivo se encuentran donde las haya', () => {
    const muestras: Record<string, string[]> = {
      '2.4.11': ['.cabecera { position: sticky; top: 0 }', 'el.style.position = "fixed";', "'position:fixed'"],
      '2.5.7': ['<li draggable="true">', "addEventListener('pointermove', mover)", "on('touchmove', f)"],
      '3.3.8': ['<input type="password">', '<input autocomplete="one-time-code">', 'autocomplete="new-password"'],
    };
    for (const [criterio, textos] of Object.entries(muestras)) {
      for (const texto of textos) expect(SEÑALES_QUE_DESMIENTEN[criterio]?.patron.test(texto), texto).toBe(true);
    }
    for (const inocente of ['position: absolute;', 'position: relative', "'position: absolute'", 'type="search"']) {
      for (const { patron } of Object.values(SEÑALES_QUE_DESMIENTEN)) expect(patron.test(inocente), inocente).toBe(false);
    }
  });

  it('los motivos de lo que axe no mide siguen siendo ciertos en src/ y public/', () => {
    const vigilados = Object.keys(SEÑALES_QUE_DESMIENTEN);
    // Solo se vigila lo que se declara cumplido o no aplicable: un criterio «axe» ya lo mide axe.
    for (const criterio of vigilados) {
      expect(
        CRITERIOS_QUE_AÑADE_WCAG_22.find((c) => c.criterio === criterio)?.comprueba,
        criterio,
      ).toMatch(/^(ux|no-aplica)$/);
    }

    const ficheros = ficherosDelSitio();
    expect(ficheros.length, 'no se encontró ningún fichero del sitio').toBeGreaterThan(0);
    const desmentidos: string[] = [];
    for (const fichero of ficheros) {
      const fuente = readFileSync(join(RAIZ, fichero), 'utf8');
      for (const criterio of CRITERIOS_QUE_AÑADE_WCAG_22) {
        const señal = SEÑALES_QUE_DESMIENTEN[criterio.criterio];
        if (señal === undefined || criterio.comprueba === 'axe' || !señal.patron.test(fuente)) continue;
        desmentidos.push(
          `${fichero}: ${señal.que} — ${criterio.criterio} se declara «${criterio.comprueba}» porque ` +
            `${criterio.motivo}; revisa el motivo en CRITERIOS_QUE_AÑADE_WCAG_22 antes de seguir`,
        );
      }
    }
    expect(desmentidos).toEqual([]);
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

describe('Historia 17.5 — el servicio por forma, con nombre propio', () => {
  it('esServicioPorForma es verdadero en la página 2+ de un listado', () => {
    for (const ruta of ['/tema/x/2/', '/autor/x/2', '/coleccion/x/17/']) {
      expect(esServicioPorForma(ruta), ruta).toBe(true);
    }
  });

  it('y falso en la página 1, en un slug numérico, en el servicio por declaración y en una ruta no declarada', () => {
    for (const ruta of ['/tema/x/', '/tema/1984/', '/buscar/', '/404', '/', '/no-declarada/', '/tema/x/2/extra']) {
      expect(esServicioPorForma(ruta), ruta).toBe(false);
    }
  });

  it('y caracterDe sigue diciendo servicio de la página 2+ — regresión', () => {
    expect(caracterDe('/tema/x/2/')).toBe('servicio');
    expect(caracterDe('/tema/x/')).toBe('producto');
  });
});

describe('Historia 23.1 — la medición es una consecuencia más de la declaración', () => {
  afterEach(() => {
    olvidarRutasIndexables();
  });

  it('la vista sale de la superficie y solo la emite la ruta de producto', () => {
    declararRutasIndexables(['/obra/seneca/cartas-a-lucilio']);
    const casos: [string, readonly string[]][] = [
      ['/', [EVENTOS.vistaDeSuperficie]],
      ['/cita/una', [EVENTOS.vistaDeCita]],
      ['/autor/seneca', [EVENTOS.vistaDeSuperficie]],
      ['/autor/seneca/2', []],
      ['/tema/el-tiempo', [EVENTOS.vistaDeSuperficie]],
      ['/tema/el-tiempo/2', []],
      ['/coleccion/frases', [EVENTOS.vistaDeSuperficie]],
      ['/coleccion/frases/2', []],
      ['/obra/seneca/cartas-a-lucilio', [EVENTOS.vistaDeSuperficie]],
      ['/obra/seneca/otra', []],
      ['/obra/seneca/cartas-a-lucilio/2', []],
      ['/buscar', []],
      ['/404', []],
      ['/kit', []],
      ['/lote', []],
    ];
    for (const [ruta, vistas] of casos) expect(consecuenciasDe(ruta).vistas, ruta).toEqual(vistas);
  });

  it('carga el fichero toda superficie que se visita; el Kit y el lote, no', () => {
    declararRutasIndexables([]);
    for (const ruta of ['/', '/cita/una', '/autor/a/2', '/obra/a/b', '/buscar', '/404']) {
      expect(consecuenciasDe(ruta).cargaLaMedicion, ruta).toBe(true);
    }
    for (const ruta of ['/kit', '/lote']) expect(consecuenciasDe(ruta).cargaLaMedicion, ruta).toBe(false);
  });

  it('ninguna superficie que no es de producto declara una vista', () => {
    for (const superficie of SUPERFICIES) {
      if (superficie.caracter !== 'producto') expect(superficie.vista, superficie.nombre).toBeUndefined();
    }
  });

  it('toda superficie de producto declara su vista', () => {
    /*
     * Revisión de la 23.1 — la otra mitad. `vista` es opcional en el tipo porque las de servicio
     * y las ajenas no la llevan; sin esta prueba, una página de lectura nueva declarada
     * `producto` sin `vista` construía en verde y salía en silencio de SM-2 y SM-8.
     */
    const deProducto = SUPERFICIES.filter((s) => s.caracter === 'producto');
    expect(deProducto.length).toBeGreaterThan(0);
    for (const superficie of deProducto) expect(superficie.vista, superficie.nombre).toBeDefined();
  });
});
