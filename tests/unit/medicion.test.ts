import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import {
  ARRANQUE_DE_MEDICION,
  EVENTOS,
  EVENTOS_VALIDOS,
  esEventoValido,
  guionDeMedicion,
  puntoFinal,
  rutaDelGuionDeMedicion,
  versionDelGuion,
} from '../../src/lib/medicion.ts';
import { anunciar } from '../../src/lib/anuncio.ts';
import { GUIONES_EXTERNOS, guionExternoDe } from '../../src/lib/guiones.ts';
import {
  CITAS_POR_PAGINA,
  MAX_BYTES_DE_GUION,
  MAX_CARACTERES_IMAGEN,
} from '../../src/lib/umbrales.ts';
import {
  bytesConImportaciones,
  bytesDeGuionEnLinea,
  etiquetasDeGuionExterno,
  guionesEnLinea,
  guionesExternosDe,
  importacionesEstaticasDe,
} from './ayuda/guion.js';
import {
  consecuenciasDe,
  declararRutasIndexables,
  olvidarRutasIndexables,
  superficieDeclaradaDe,
  superficiesDelBarrido,
} from '../../src/lib/superficies.ts';
import { medicionEnUnSandbox } from './ayuda/medicion.js';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  coleccionValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';

const RAIZ = resolve(import.meta.dirname, '../..');
const aLimpiar: string[] = [];

/** Los `.ts` y `.astro` de `src/`, salvo el propio módulo de medición. */
function fuentesDeSrc(): string[] {
  return (function recorrer(dir: string): string[] {
    return readdirSync(dir).flatMap((entrada) => {
      const ruta = join(dir, entrada);
      if (statSync(ruta).isDirectory()) return recorrer(ruta);
      return /\.(ts|astro)$/.test(entrada) ? [ruta] : [];
    });
  })(resolve(RAIZ, 'src')).filter((f) => !f.endsWith('lib/medicion.ts'));
}

/** Todos los ficheros de un directorio, recursivo. */
function ficherosDe(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .map((ruta) => join(dir, ruta))
    .filter((ruta) => statSync(ruta).isFile());
}

afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

describe('Historia 2.9 — el vocabulario es cerrado', () => {
  it('son exactamente estos eventos con nombre, y ninguno más', () => {
    /*
     * La lista crece solo cuando una historia lo decide, y que haya que tocar esta prueba
     * para ampliarla es el punto: los cuatro primeros son de la v1 y los dos de
     * compartición los añadió la Historia 10.4, y `vista-de-superficie` la 20.1.
     */
    expect([...EVENTOS_VALIDOS].sort()).toEqual(
      [
        'busqueda-sin-resultados',
        'comparticion-de-enlace',
        'comparticion-de-imagen',
        'copiado',
        'descarga-de-imagen',
        'vista-de-cita',
        'vista-de-superficie',
      ].sort(),
    );
  });

  it('un evento fuera del conjunto no es válido', () => {
    expect(esEventoValido(EVENTOS.copiado)).toBe(true);
    expect(esEventoValido('clic-en-cualquier-cosa')).toBe(false);
    expect(esEventoValido('pageview')).toBe(false);
  });

  it('el guion descarta en cliente cualquier evento fuera del conjunto', () => {
    // Añadir uno exige modificar el módulo, no la superficie que lo emite: una isla que
    // invente un nombre no consigue emitirlo. Se comprueba **ejecutándolo**, no leyendo
    // su texto: una prueba sobre la forma del guion se rompe al compactarlo y no dice
    // nada sobre lo que hace.
    const { emitir, balizas } = medicionEnUnSandbox();

    for (const evento of EVENTOS_VALIDOS) emitir(evento);
    expect(balizas().map((b) => b.evento)).toEqual([...EVENTOS_VALIDOS]);

    for (const impostor of ['pageview', 'clic', 'VISTA-DE-CITA', '']) emitir(impostor);
    expect(balizas()).toHaveLength(EVENTOS_VALIDOS.length);
  });
});

describe('Historia 2.9 — sin cookies y sin identificar al visitante', () => {
  const guion = guionDeMedicion('https://ejemplo.invalid/e');

  it('ni el arranque ni el fichero tocan las cookies', () => {
    for (const texto of [guion, ARRANQUE_DE_MEDICION]) {
      expect(texto).not.toMatch(/document\.cookie/);
      expect(texto).not.toMatch(/localStorage|sessionStorage|indexedDB/);
    }
  });

  it('no genera ni transporta ningún identificador de visitante', () => {
    for (const texto of [guion, ARRANQUE_DE_MEDICION]) {
      expect(texto).not.toMatch(/randomUUID|Math\.random|fingerprint|visitor|userId|uuid/i);
    }
  });

  it('lo que viaja es el evento, la ruta y nada más', () => {
    const { emitir, balizas } = medicionEnUnSandbox({ ruta: '/cita/una' });
    emitir(EVENTOS.copiado);

    const [baliza] = balizas();
    expect(baliza.evento).toBe(EVENTOS.copiado);
    expect(baliza.ruta).toBe('/cita/una');
    expect(Object.keys(baliza).sort()).toEqual(['datos', 'destino', 'evento', 'origen', 'ruta']);
    // Ni referente, ni agente de usuario, ni pantalla, ni zona horaria.
    expect(guion).not.toMatch(/referrer|userAgent|screen\.|timeZone|language/);
  });

  it('una medición que falla no rompe la página', () => {
    // El transporte revienta a propósito; emitir no debe propagar nada.
    const { emitir } = medicionEnUnSandbox({
      sendBeacon: () => {
        throw new Error('el transporte falló');
      },
    });
    expect(() => emitir(EVENTOS.copiado)).not.toThrow();
  });
});

describe('Historia 2.9 — el módulo es el único emisor', () => {
  const fuentes = fuentesDeSrc();

  it.each(fuentes)('%s no habla con el proveedor', (ruta) => {
    const codigo = readFileSync(ruta, 'utf8');
    // Nadie envía nada por su cuenta: ni baliza, ni fetch de telemetría, ni guion ajeno.
    expect(codigo).not.toMatch(/sendBeacon/);
    expect(codigo).not.toMatch(/MEDICION_ENDPOINT/);
    expect(codigo).not.toMatch(/plausible|fathom|umami|gtag|analytics/i);
  });

  it('las superficies que emiten lo hacen por el vocabulario, no por una cadena suelta', () => {
    const isla = readFileSync(resolve(RAIZ, 'src/islands/CopiarCita.astro'), 'utf8');
    expect(isla).toMatch(/EVENTOS\.copiado/);

    // El nombre del evento no se escribe a mano en el guion. Se mira solo hasta el
    // bloque de estilos: ahí abajo «copiado» vuelve a aparecer como valor del atributo
    // de estado del botón, que no tiene nada que ver con la medición.
    const guion = isla.slice(0, isla.indexOf('<style>'));
    expect(guion).not.toMatch(/__medir\(\s*['"]/);
  });

  it('`public/` no lleva medición: ni un nombre de evento ni una baliza — Historia 23.1', () => {
    /*
     * El fichero de medición se compone desde `src/lib/medicion.ts` y nunca se copia en
     * `public/`: ahí sería una segunda copia del vocabulario que se quedaría atrás al añadir
     * un evento, y el receptor descartaría en silencio lo que el sitio ya emite.
     */
    const publicos = ficherosDe(resolve(RAIZ, 'public'));
    expect(publicos.length).toBeGreaterThan(0);
    for (const fichero of publicos) {
      const contenido = readFileSync(fichero, 'utf8');
      expect(contenido, fichero).not.toMatch(/sendBeacon/);
      for (const evento of EVENTOS_VALIDOS) expect(contenido, `${fichero}: ${evento}`).not.toContain(evento);
    }
  });
});

describe('Historia 23.1 — el arranque y el fichero, ejecutados', () => {
  it('el arranque es solo una cola: sin vocabulario, sin transporte y sin punto final', () => {
    expect(ARRANQUE_DE_MEDICION).not.toMatch(/sendBeacon|https?:|location|JSON/);
    for (const evento of EVENTOS_VALIDOS) expect(ARRANQUE_DE_MEDICION).not.toContain(evento);

    // Sin fichero, las llamadas se guardan y no sale nada: es como corre un sitio sin punto final.
    const { emitir, balizas } = medicionEnUnSandbox({ vistas: EVENTOS.vistaDeCita, cargado: false });
    emitir(EVENTOS.copiado);
    emitir(EVENTOS.descargaDeImagen);
    expect(balizas()).toEqual([]);
  });

  it('cola: al cargar, primero las vistas y después lo encolado, en su orden y una vez cada uno', () => {
    const { emitir, cargar, balizas } = medicionEnUnSandbox({
      ruta: '/cita/una/',
      vistas: EVENTOS.vistaDeCita,
      cargado: false,
    });
    emitir(EVENTOS.copiado);
    emitir(EVENTOS.comparticionDeEnlace, null, 'telegram');
    emitir(EVENTOS.descargaDeImagen);
    cargar();

    expect(balizas().map((b) => b.evento)).toEqual([
      EVENTOS.vistaDeCita,
      EVENTOS.copiado,
      EVENTOS.comparticionDeEnlace,
      EVENTOS.descargaDeImagen,
    ]);
    expect(balizas()[2].destino).toBe('telegram');

    // Ya cargado, el fichero es `__medir`: lo que llega sale directo y no repite la cola.
    emitir(EVENTOS.copiado);
    expect(balizas().map((b) => b.evento)).toEqual([
      EVENTOS.vistaDeCita,
      EVENTOS.copiado,
      EVENTOS.comparticionDeEnlace,
      EVENTOS.descargaDeImagen,
      EVENTOS.copiado,
    ]);
  });

  it('un evento fuera del vocabulario se descarta también desde la cola', () => {
    const { emitir, cargar, balizas } = medicionEnUnSandbox({ cargado: false });
    emitir('pageview');
    emitir(EVENTOS.copiado);
    emitir('VISTA-DE-CITA');
    cargar();
    expect(balizas().map((b) => b.evento)).toEqual([EVENTOS.copiado]);
  });

  it('sin `data-vistas` no sale ninguna vista, y la cola se vacía igual', () => {
    const { emitir, cargar, balizas } = medicionEnUnSandbox({ cargado: false });
    emitir(EVENTOS.busquedaSinResultados, 'zzz');
    cargar();
    expect(balizas().map((b) => [b.evento, b.datos])).toEqual([
      [EVENTOS.busquedaSinResultados, 'zzz'],
    ]);
  });

  it('una vista declarada que no es del vocabulario no sale', () => {
    const { balizas } = medicionEnUnSandbox({ vistas: `vista-inventada ${EVENTOS.vistaDeSuperficie}` });
    expect(balizas().map((b) => b.evento)).toEqual([EVENTOS.vistaDeSuperficie]);
  });

  it('prerender: nada hasta activarse; entonces las vistas, una sola vez, y la cola', () => {
    const { emitir, activar, balizas } = medicionEnUnSandbox({
      vistas: EVENTOS.vistaDeSuperficie,
      prerendering: true,
    });
    emitir(EVENTOS.copiado);
    expect(balizas()).toEqual([]);

    activar();
    activar();
    expect(balizas().map((b) => b.evento)).toEqual([EVENTOS.vistaDeSuperficie, EVENTOS.copiado]);
  });

  it('la marca de origen viaja con la vista y con lo encolado', () => {
    const { emitir, cargar, balizas } = medicionEnUnSandbox({
      busqueda: '?de=instagram',
      vistas: EVENTOS.vistaDeCita,
      cargado: false,
    });
    emitir(EVENTOS.copiado);
    cargar();
    expect(balizas().map((b) => b.origen)).toEqual(['instagram', 'instagram']);
  });
});

describe('Historia 23.1 — la versión del fichero sale de su contenido', () => {
  it('el mismo punto final da la misma ruta; otro punto final, otra', () => {
    const una = rutaDelGuionDeMedicion('https://a.invalid/e');
    expect(rutaDelGuionDeMedicion('https://a.invalid/e')).toBe(una);
    expect(rutaDelGuionDeMedicion('https://b.invalid/e')).not.toBe(una);
    expect(guionExternoDe(una)?.id).toBe('medicion');
  });

  it('otro guion, otra versión', () => {
    const guion = guionDeMedicion('https://a.invalid/e');
    expect(versionDelGuion(guion)).toBe(versionDelGuion(guion));
    expect(versionDelGuion(`${guion} `)).not.toBe(versionDelGuion(guion));
    expect(versionDelGuion(guion.replace('sendBeacon', 'sendBeacom'))).not.toBe(versionDelGuion(guion));
    expect(versionDelGuion('')).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('Historia 23.1 — la lista cerrada de guiones externos', () => {
  it('cada entrada tiene un tope entero positivo y un nombre propio', () => {
    expect(GUIONES_EXTERNOS.map((g) => g.id).sort()).toEqual(['imagen', 'medicion', 'pagefind']);
    for (const guion of GUIONES_EXTERNOS) {
      expect(Number.isInteger(guion.tope) && guion.tope > 0, `${guion.id}: ${guion.tope}`).toBe(true);
      expect(guion.reconoce.global, guion.id).toBe(false);
    }
  });

  it('reconoce lo que la lista nombra, del mismo origen, y nada más', () => {
    expect(guionExternoDe('/medicion/0a1b2c3d.js')?.id).toBe('medicion');
    expect(guionExternoDe('/islas/imagen.js')?.id).toBe('imagen');
    expect(guionExternoDe('/islas/imagen.js?2')?.id).toBe('imagen');
    expect(guionExternoDe('/pagefind/pagefind.js')?.id).toBe('pagefind');
    for (const ajeno of [
      'https://sabiduriadebolsillo.net/islas/imagen.js',
      '//cdn.ejemplo.org/islas/imagen.js',
      'islas/imagen.js',
      '/islas/otra.js',
      '/medicion/version.js',
      '/pagefind/pagefind-ui.js',
      '(import sin literal) ruta',
    ]) {
      expect(guionExternoDe(ajeno), ajeno).toBeUndefined();
    }
  });

  it('el detector ve el `src`, el `import()` con cadena, con plantilla y concatenado, y el que no sabe leer', () => {
    const html = [
      '<script type="application/ld+json">{"x":"import(\'/no.js\')"}</script>',
      '<script src="https://otro.ejemplo.org/x.js"></script>',
      "<script>import('/a.js');import(`/islas/imagen.js${n}`);import('/b.js' + n);import(ruta)</script>",
    ].join('');
    const externos = guionesExternosDe(html);
    expect(externos.slice(0, 4)).toEqual([
      'https://otro.ejemplo.org/x.js',
      '/a.js',
      '/islas/imagen.js',
      '/b.js',
    ]);
    expect(externos[4]).toMatch(/^\(import sin literal\)/);
    // Lo ajeno y lo que no se sabe leer no casan con ninguna entrada: la prueba de `dist/` falla.
    expect(externos.filter((e) => guionExternoDe(e) === undefined)).toHaveLength(4);
  });

  it('las importaciones estáticas se leen; las dinámicas no cuentan', () => {
    expect(
      importacionesEstaticasDe(
        "import a from './a.js';\nimport './b.js';export { c } from \"../c.js\";const d = import('./d.js');",
      ),
    ).toEqual(['./a.js', '../c.js', './b.js']);
  });
});

/*
 * Un sitio construido **con** la medición configurada y con Pagefind, que comparten la matriz de
 * la Historia 20.1, el listón de la Página de Cita y la lista cerrada de guiones externos. Lleva
 * una Cita más de las que caben en una página, todas del mismo Autor, del mismo Tema y de la
 * misma Colección, para que los tres listados tengan página 2: la que es `servicio` y no debe
 * emitir la vista. Y una Cita de más de `MAX_CARACTERES_IMAGEN` caracteres, que no ofrece
 * Imagen: es la Página de Cita con menos guion. El mismo corpus se construye además **sin**
 * punto final, para ver que entonces no se pide nada.
 */
const ENDPOINT = 'https://medicion.ejemplo.workers.dev/e';
const SLUGS = Array.from(
  { length: CITAS_POR_PAGINA + 1 },
  (_, i) => `seneca-frase-${String(i).padStart(3, '0')}`,
);
const TEXTO_LARGO =
  'Frase larga del catálogo de prueba, escrita para pasar del tope de la Imagen de Cita: ' +
  'mientras se aplaza la vida, la vida pasa; todo lo demás es ajeno, solo el tiempo es ' +
  'nuestro, y esa sola posesión, fugaz y resbaladiza, nos la arrebata cualquiera que ' +
  'quiere, sin que nos demos cuenta de lo que hemos perdido hasta que ya no queda nada.';
const SLUG_LARGO = 'seneca-frase-larga';
const CORPUS_MEDIDO: Record<string, string> = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'colecciones/frases-cortas.yml': coleccionValida({ miembros: SLUGS }),
  ...Object.fromEntries(
    SLUGS.map((slug, i) => [
      `citas/${slug}.md`,
      citaValida({ texto: `Frase número ${i} del catálogo de prueba.`, slug }),
    ]),
  ),
  // Historia 23.1 — fuera del Tema y de la Colección, para no tocar sus listados.
  [`citas/${SLUG_LARGO}.md`]: citaValida({ texto: TEXTO_LARGO, slug: SLUG_LARGO, temas: [] }),
  /*
   * Historia 22.4 — dos Citas de otra obra, para que haya una Obra indexable («Cartas a
   * Lucilio», 2 de 54) junto a una que no lo es («Sobre la brevedad de la vida», 52 de 54, y
   * paginada). Fuera de la Colección y del Tema, para no tocar sus listados.
   */
  ...Object.fromEntries(
    [0, 1].map((i) => [
      `citas/seneca-carta-${i}.md`,
      citaValida({
        texto: `Carta número ${i} del catálogo de prueba.`,
        slug: `seneca-carta-${i}`,
        temas: [],
        procedencia: { obra: 'Cartas a Lucilio', año: 64 },
        fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Cartas_a_Lucilio' },
      }),
    ]),
  ),
};
const SLUGS_DE_CITA = [...SLUGS, SLUG_LARGO, 'seneca-carta-0', 'seneca-carta-1'];

/** Construye una vez por entorno y apunta el proyecto para limpiarlo, falle o no. */
function construccionUnica(
  entorno: Record<string, string>,
  conBusqueda = false,
): () => Promise<string> {
  let construccion: Promise<string> | undefined;
  return () => {
    construccion ??= construirConCorpus(CORPUS_MEDIDO, { entorno, conBusqueda }).then(
      (resultado) => {
        // Se apunta **antes** de afirmar: un build fallido también deja su proyecto temporal.
        aLimpiar.push(resultado.proyecto);
        expect(resultado.codigo, resultado.salida).toBe(0);
        return resultado.proyecto;
      },
    );
    return construccion;
  };
}
const sitioMedido = construccionUnica({ MEDICION_ENDPOINT: ENDPOINT }, true);
const sitioSinMedir = construccionUnica({});

const leerMedida = async (ruta: string) =>
  readFile(paginaConstruida(await sitioMedido(), ruta), 'utf8');
const leerSinMedir = async (ruta: string) =>
  readFile(paginaConstruida(await sitioSinMedir(), ruta), 'utf8');

/** Cada página HTML de un `dist/`, por su ruta pública. */
function paginasDe(proyecto: string): Map<string, string> {
  const dist = join(proyecto, 'dist');
  const paginas = new Map<string, string>();
  for (const fichero of ficherosDe(dist)) {
    if (!fichero.endsWith('.html')) continue;
    const relativa = relative(dist, fichero).split('\\').join('/');
    const ruta =
      relativa === '404.html'
        ? '/404'
        : `/${relativa.replace(/index\.html$/, '')}`;
    paginas.set(ruta, readFileSync(fichero, 'utf8'));
  }
  return paginas;
}

/** El `data-vistas` del `<html>`, o `undefined` si la página no lo lleva. */
const vistasDe = (html: string): string | undefined =>
  /<html\b[^>]*\bdata-vistas="([^"]*)"/.exec(html)?.[1];

/** El `<head>` de una página. */
const cabezaDe = (html: string): string => html.slice(0, html.indexOf('</head>'));

const RUTA_DEL_FICHERO = rutaDelGuionDeMedicion(ENDPOINT);
const CITA = `/cita/${SLUGS[0]}/`;
const CITA_SIN_IMAGEN = `/cita/${SLUG_LARGO}/`;
const PAGINAS_1 = ['/', '/autor/seneca/', '/tema/el-tiempo/', '/coleccion/frases-cortas/'];
const PAGINAS_2 = ['/autor/seneca/2/', '/tema/el-tiempo/2/', '/coleccion/frases-cortas/2/'];
const SIN_VISTA = ['/buscar/', '/404', '/kit/', '/lote/'];
const AJENAS = ['/kit/', '/lote/'];
/** Historia 22.4 — la Obra indexable emite; la que repite su Autor y su página 2, no. */
const OBRA_INDEXABLE = '/obra/seneca/cartas-a-lucilio/';
const OBRAS = [
  OBRA_INDEXABLE,
  '/obra/seneca/sobre-la-brevedad-de-la-vida/',
  '/obra/seneca/sobre-la-brevedad-de-la-vida/2/',
];

describe('Historia 20.1 y 23.1 — las vistas salen de la declaración, al `data-vistas`', () => {
  // La lista de rutas indexables que FR-52 da para este corpus; sin ella `consecuenciasDe` no
  // sabe qué es una Obra. Que el build decidió lo mismo lo dice la propia comparación.
  beforeEach(() => {
    declararRutasIndexables([OBRA_INDEXABLE]);
  });
  afterEach(() => {
    olvidarRutasIndexables();
  });

  it.each(PAGINAS_1)('%s declara una sola vista de superficie y ninguna de Cita', async (ruta) => {
    expect(vistasDe(await leerMedida(ruta))).toBe(EVENTOS.vistaDeSuperficie);
  }, 240_000);

  it('la Página de Cita, con Imagen o sin ella, declara su vista y ninguna de superficie', async () => {
    expect(vistasDe(await leerMedida(CITA))).toBe(EVENTOS.vistaDeCita);
    expect(vistasDe(await leerMedida(CITA_SIN_IMAGEN))).toBe(EVENTOS.vistaDeCita);
  }, 240_000);

  it('la Obra indexable declara la vista de superficie; la que no se indexa y su página 2, ninguna', async () => {
    expect(vistasDe(await leerMedida(OBRAS[0]))).toBe(EVENTOS.vistaDeSuperficie);
    expect(vistasDe(await leerMedida(OBRAS[1]))).toBeUndefined();
    expect(vistasDe(await leerMedida(OBRAS[2]))).toBeUndefined();
  }, 240_000);

  it.each([...PAGINAS_2, ...SIN_VISTA])('%s no declara ninguna vista', async (ruta) => {
    expect(vistasDe(await leerMedida(ruta))).toBeUndefined();
  }, 240_000);

  it.each([
    ['con punto final', sitioMedido],
    ['sin punto final', sitioSinMedir],
  ] as const)(
    '%s, el `data-vistas` de cada ruta construida es exactamente el de `superficies.ts`',
    async (_, sitio) => {
      const paginas = paginasDe(await sitio());
      expect(paginas.size).toBeGreaterThan(SLUGS_DE_CITA.length);
      for (const [ruta, html] of paginas) {
        const declaradas = consecuenciasDe(ruta).vistas;
        expect(vistasDe(html), ruta).toBe(declaradas.length > 0 ? declaradas.join(' ') : undefined);
      }
    },
    240_000,
  );

  it('ninguna superficie escribe el nombre de una vista como cadena suelta', () => {
    const suelta = /["'`]vista-de-(cita|superficie)["'`]/;
    for (const fuente of fuentesDeSrc()) {
      expect(readFileSync(fuente, 'utf8'), fuente).not.toMatch(suelta);
    }
  });
});

describe('Historia 23.1 — con punto final, la medición es un fichero', () => {
  beforeEach(() => {
    declararRutasIndexables([OBRA_INDEXABLE]);
  });
  afterEach(() => {
    olvidarRutasIndexables();
  });

  it('el build escribe el fichero, versionado, con el emisor compuesto desde `medicion.ts`', async () => {
    const fichero = join(await sitioMedido(), 'dist', RUTA_DEL_FICHERO);
    expect(existsSync(fichero), fichero).toBe(true);
    expect(readFileSync(fichero, 'utf8')).toBe(guionDeMedicion(ENDPOINT));
    expect(readdirSync(join(await sitioMedido(), 'dist', 'medicion'))).toHaveLength(1);
  }, 240_000);

  it('toda página `producto` o `servicio` lo pide una sola vez, con `defer`, en el `<head>`; `/kit` y `/lote`, no', async () => {
    const paginas = paginasDe(await sitioMedido());
    for (const [ruta, html] of paginas) {
      const etiquetas = etiquetasDeGuionExterno(html).filter((e) => guionExternoDe(e.src)?.id === 'medicion');
      if (!consecuenciasDe(ruta).cargaLaMedicion) {
        expect(AJENAS, ruta).toContain(ruta);
        expect(etiquetas, ruta).toEqual([]);
        continue;
      }
      expect(etiquetas.map((e) => e.src), ruta).toEqual([RUTA_DEL_FICHERO]);
      expect(etiquetas[0].etiqueta, ruta).toMatch(/\sdefer[\s>]/);
      expect(etiquetasDeGuionExterno(cabezaDe(html)).map((e) => e.src), ruta).toContain(RUTA_DEL_FICHERO);
    }
    for (const ruta of AJENAS) expect(paginas.has(ruta), ruta).toBe(true);
  }, 240_000);

  it('el arranque va en línea en toda página, y ninguna lleva el emisor ni el punto final', async () => {
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      expect(guionesEnLinea(html), ruta).toContain(ARRANQUE_DE_MEDICION);
      expect(html, ruta).not.toContain('sendBeacon');
      expect(html, ruta).not.toContain(ENDPOINT);
    }
  }, 240_000);
});

describe('Historia 2.9 y 23.1 — sin punto final, el sitio no pide ni envía nada', () => {
  it('no hay punto final por defecto', () => {
    expect(puntoFinal({})).toBeNull();
    expect(puntoFinal({ MEDICION_ENDPOINT: '   ' })).toBeNull();
    expect(puntoFinal({ MEDICION_ENDPOINT: 'https://x.invalid/e' })).toBe('https://x.invalid/e');
  });

  it('ni fichero ni etiqueta; quedan el arranque y el `data-vistas`', async () => {
    const proyecto = await sitioSinMedir();
    expect(existsSync(join(proyecto, 'dist', 'medicion'))).toBe(false);
    for (const [ruta, html] of paginasDe(proyecto)) {
      expect(guionesExternosDe(html).filter((e) => guionExternoDe(e)?.id === 'medicion'), ruta).toEqual([]);
      expect(html, ruta).not.toContain('sendBeacon');
      expect(guionesEnLinea(html), ruta).toContain(ARRANQUE_DE_MEDICION);
    }
    expect(vistasDe(await leerSinMedir(CITA))).toBe(EVENTOS.vistaDeCita);
    expect(vistasDe(await leerSinMedir('/'))).toBe(EVENTOS.vistaDeSuperficie);
  }, 240_000);
});

describe('Historia 23.1 — lo que se descarga está en la lista y cabe en su tope', () => {
  it('cada `<script src>` y cada `import()` de `dist/` casa con una entrada, del mismo origen y bajo su tope', async () => {
    const proyecto = await sitioMedido();
    const dist = join(proyecto, 'dist');
    const vistos = new Map<string, Set<string>>();

    for (const [ruta, html] of paginasDe(proyecto)) {
      for (const especificador of guionesExternosDe(html)) {
        const entrada = guionExternoDe(especificador);
        expect(entrada, `${ruta} pide «${especificador}», que no está en GUIONES_EXTERNOS`).toBeDefined();
        const ficheros = vistos.get(entrada!.id) ?? new Set<string>();
        ficheros.add(especificador.replace(/[?#].*$/, ''));
        vistos.set(entrada!.id, ficheros);
      }
    }

    // Las tres entradas se piden en este sitio: si una no se viera, su tope no se mediría.
    expect([...vistos.keys()].sort()).toEqual(GUIONES_EXTERNOS.map((g) => g.id).sort());

    for (const guion of GUIONES_EXTERNOS) {
      for (const ruta of vistos.get(guion.id)!) {
        const { bytes, ficheros } = bytesConImportaciones(dist, ruta, (f) => readFileSync(f));
        console.log(`${guion.id}: ${ruta} y lo que importa, ${bytes} bytes de ${guion.tope}`);
        expect(bytes, `${ruta}: ${bytes} bytes`).toBeLessThanOrEqual(guion.tope);
        // El fichero de medición es un guion clásico: no importa nada.
        if (guion.id === 'medicion') expect(ficheros).toEqual([ruta]);
      }
    }
  }, 240_000);
});

describe('Historia 23.1 — la Página de Cita no pierde su listón', () => {
  /*
   * Retro de la épica 7: el tope de la Historia 2.1 se medía solo en construcciones sin punto
   * final, y el guion de medición creció dos veces sin que nadie lo viera. Aquí se mide lo que
   * se sirve **con** la medición: el arranque en línea, que ya no se puede apagar, y una
   * muestra de cada superficie pública más la Página de Cita sin Imagen, que es la de menos
   * guion. El fichero se descarga aparte y cuenta 0 aquí: su tope es otro.
   */
  it('cada superficie pública y la Cita sin Imagen caben en MAX_BYTES_DE_GUION', async () => {
    const proyecto = await sitioMedido();
    const paginas = paginasDe(proyecto);
    const barrido = superficiesDelBarrido([...paginas.keys()]);
    // Portada, Cita, Autor, Tema, Colección, Obra, búsqueda y 404: una por familia pública.
    expect(barrido).toHaveLength(8);
    const muestra = [...barrido, CITA_SIN_IMAGEN];

    const huecos: string[] = [];
    for (const ruta of muestra) {
      const html = await leerMedida(ruta);
      expect(guionesEnLinea(html), ruta).toContain(ARRANQUE_DE_MEDICION);
      const bytes = bytesDeGuionEnLinea(html);
      huecos.push(`${ruta}: ${bytes} bytes en línea, ${MAX_BYTES_DE_GUION - bytes} libres`);
      expect(bytes, `${ruta}: ${bytes} bytes de guion en línea`).toBeLessThan(MAX_BYTES_DE_GUION);
    }

    const conImagen = bytesDeGuionEnLinea(await leerMedida(CITA));
    const sinImagen = bytesDeGuionEnLinea(await leerMedida(CITA_SIN_IMAGEN));
    // El parte: el hueco que deja la 23.1 en la Página de Cita, con Imagen y sin ella.
    console.log(
      [
        ...huecos,
        `Página de Cita con Imagen: ${MAX_BYTES_DE_GUION - conImagen} bytes libres de ${MAX_BYTES_DE_GUION}`,
        `Página de Cita sin Imagen: ${MAX_BYTES_DE_GUION - sinImagen} bytes libres de ${MAX_BYTES_DE_GUION}`,
      ].join('\n'),
    );
    expect(sinImagen).toBeLessThan(conImagen);
  }, 240_000);
});


describe('Historia 23.1 — ningún guion en línea lleva contenido', () => {
  /** La familia de una ruta: el fichero de `src/pages/` que la genera. */
  const familiaDe = (ruta: string) => superficieDeclaradaDe(ruta)!.pagina;
  /** El guion de la Imagen de Cita, que solo va donde la Cita la admite. */
  const esDeImagen = (guion: string) => guion.includes("'[data-imagen]'");

  it('los guiones en línea de una familia son idénticos byte a byte, salvo la Imagen donde no se admite', async () => {
    const porFamilia = new Map<string, { ruta: string; guiones: string[] }[]>();
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      const familia = familiaDe(ruta);
      porFamilia.set(familia, [...(porFamilia.get(familia) ?? []), { ruta, guiones: guionesEnLinea(html) }]);
    }

    let comparadas = 0;
    for (const [familia, paginas] of porFamilia) {
      const [referencia, ...resto] = paginas;
      for (const pagina of resto) {
        comparadas++;
        expect(pagina.guiones.filter((g) => !esDeImagen(g)), `${familia}: ${pagina.ruta} frente a ${referencia.ruta}`).toEqual(
          referencia.guiones.filter((g) => !esDeImagen(g)),
        );
      }
      const deImagen = new Set(paginas.flatMap((p) => p.guiones.filter(esDeImagen)));
      expect(deImagen.size, `${familia}: guiones de Imagen distintos`).toBeLessThanOrEqual(1);
    }
    expect(comparadas).toBeGreaterThan(SLUGS.length);

    // Y la Imagen falta justo donde la Cita no la admite.
    const conImagen = guionesEnLinea(await leerMedida(CITA)).filter(esDeImagen);
    const sinImagen = guionesEnLinea(await leerMedida(CITA_SIN_IMAGEN)).filter(esDeImagen);
    expect(TEXTO_LARGO.length).toBeGreaterThan(MAX_CARACTERES_IMAGEN);
    expect(conImagen).toHaveLength(1);
    expect(sinImagen).toEqual([]);
  }, 240_000);

  it('ninguno contiene el slug de una Cita, salvo `ImagenDelKit` en `/kit` y `/lote`', async () => {
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      for (const guion of guionesEnLinea(html)) {
        // Exención nombrada hasta la Historia 25.4: el Kit lleva el slug por `define:vars`.
        if (AJENAS.includes(ruta) && guion.includes('data-imagen-kit')) continue;
        for (const slug of SLUGS_DE_CITA) expect(guion, `${ruta} lleva «${slug}»`).not.toContain(slug);
      }
    }
  }, 240_000);
});

describe('Historia 23.1 — las islas llaman `__medir` a secas y anuncian con `anunciar`', () => {
  /** Espacios colapsados: Vitest y el build transforman la función con el mismo esbuild. */
  const colapsado = (texto: string) => texto.replace(/\s+/g, ' ').trim();
  const ANUNCIAR = colapsado(String(anunciar));

  /** Los guiones en línea de una página, por la isla que los lleva. */
  const isla = (guiones: string[], marca: string) => {
    const encontrados = guiones.filter((g) => g.includes(marca));
    expect(encontrados, marca).toHaveLength(1);
    return encontrados[0];
  };

  it('Copiar, Imagen, Compartir y `/buscar/` llaman `__medir(` sin guarda, y anuncian con `anunciar`', async () => {
    const cita = guionesEnLinea(await leerMedida(CITA));
    const buscar = guionesEnLinea(await leerMedida('/buscar/'));
    const islas = {
      copiar: isla(cita, "'[data-copiar]'"),
      imagen: isla(cita, "'[data-imagen]'"),
      compartir: isla(cita, "'[data-compartir]'"),
      buscar: isla(buscar, "'[data-consulta]'"),
    };

    for (const [nombre, guion] of Object.entries(islas)) {
      expect(guion, nombre).toMatch(/(^|[^.\w$])__medir\(/);
      expect(guion, nombre).not.toMatch(/window\.__medir/);
    }
    for (const nombre of ['copiar', 'imagen', 'buscar'] as const) {
      expect(colapsado(islas[nombre]), nombre).toContain(ANUNCIAR);
    }
  }, 240_000);

  it('entre los guiones en línea solo el arranque asigna `__medir`, y nadie usa `requestAnimationFrame` fuera de `anunciar`', async () => {
    let vistos = 0;
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      for (const guion of guionesEnLinea(html)) {
        vistos++;
        if (guion === ARRANQUE_DE_MEDICION) continue;
        expect(guion, ruta).not.toMatch(/__medir\s*=(?!=)/);
        expect(colapsado(guion).split(ANUNCIAR).join(''), ruta).not.toContain('requestAnimationFrame');
      }
    }
    expect(vistos).toBeGreaterThan(0);
    expect(ARRANQUE_DE_MEDICION).toMatch(/__medir\s*=(?!=)/);
  }, 240_000);
});
