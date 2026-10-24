import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { Script } from 'node:vm';
import { parseSync } from 'vite';
import {
  ARRANQUE_DE_MEDICION,
  EVENTOS,
  EVENTOS_DEL_GUION,
  EVENTOS_VALIDOS,
  esEventoValido,
  guionDeMedicion,
  puntoFinal,
  rutaDelGuionDeMedicion,
  versionDelGuion,
} from '../../src/lib/medicion.ts';
import { anunciar, guionQueAnuncia } from '../../src/lib/anuncio.ts';
import { GUIONES_EXTERNOS, guionExternoDe } from '../../src/lib/guiones.ts';
import {
  CITAS_POR_PAGINA,
  MAX_BYTES_DE_GUION,
  MAX_BYTES_GUION_DE_MEDICION,
  MAX_CARACTERES_IMAGEN,
} from '../../src/lib/umbrales.ts';
import {
  bytesDeGuionEnLinea,
  descargaDeLaEntrada,
  etiquetasDeGuionExterno,
  guionesEjecutables,
  guionesEnLinea,
  guionesEnLineaConTipo,
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

/** Espacios colapsados: Vitest y el build transforman `anunciar` con el mismo esbuild. */
const colapsado = (texto: string) => texto.replace(/\s+/g, ' ').trim();
/** El texto de `anunciar` tal como viaja dentro del guion de una isla. */
const ANUNCIAR = colapsado(String(anunciar));
/** Lo que queda del guion de una isla sin el texto de `anunciar` que le mete `guionQueAnuncia`. */
const sinAnunciar = (guion: string) => colapsado(guion).split(ANUNCIAR).join('');

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

/**
 * Los atributos de cada `<script` de un fichero fuente, hasta su `>` de cierre: las llaves de
 * una expresión de Astro (`define:vars={{ … }}`, `set:html={…}`) pueden llevar `>` dentro.
 */
function atributosDeScript(fuente: string): string[] {
  const atributos: string[] = [];
  for (const m of fuente.matchAll(/<script\b/g)) {
    let profundidad = 0;
    let i = m.index + m[0].length;
    for (; i < fuente.length; i++) {
      const c = fuente[i];
      if (c === '{') profundidad++;
      else if (c === '}') profundidad--;
      else if (c === '>' && profundidad === 0) break;
    }
    atributos.push(fuente.slice(m.index, i));
  }
  return atributos;
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
     * compartición los añadió la Historia 10.4, y `vista-de-superficie` la 20.1. La 23.2 trae
     * los cuatro de la v8 —`lectura`, `salida-interna`, `busqueda` y `vista-de-obra`— al
     * vocabulario, antes de que nadie los envíe.
     */
    expect([...EVENTOS_VALIDOS].sort()).toEqual(
      [
        'busqueda',
        'busqueda-sin-resultados',
        'comparticion-de-enlace',
        'comparticion-de-imagen',
        'copiado',
        'descarga-de-imagen',
        'lectura',
        'salida-interna',
        'vista-de-cita',
        'vista-de-obra',
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
    // su texto: una prueba sobre la forma del guion se rompe al compactarla y no dice
    // nada sobre lo que hace. Desde la 23.2 el guion emite solo los eventos que ya sabe
    // producir: los cuatro de la v8 esperan a sus historias (23.5 a 23.9) y se descartan igual.
    const { emitir, balizas } = medicionEnUnSandbox();

    for (const evento of EVENTOS_VALIDOS) emitir(evento);
    expect(balizas().map((b) => b.evento)).toEqual([...EVENTOS_DEL_GUION]);
    expect(EVENTOS_DEL_GUION.length).toBeLessThan(EVENTOS_VALIDOS.length);

    for (const impostor of ['pageview', 'clic', 'VISTA-DE-CITA', '', 'toString', 'hasOwnProperty']) emitir(impostor);
    expect(balizas()).toHaveLength(EVENTOS_DEL_GUION.length);
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
    // Desde la 23.2, el copiado no lleva ni la Marca de origen ni campos que no declara: solo
    // el evento y la ruta. Lo que lleva cada evento lo fija `tests/unit/vocabulario.test.ts`.
    const { emitir, balizas } = medicionEnUnSandbox({ ruta: '/cita/una', busqueda: '?de=instagram' });
    emitir(EVENTOS.copiado, 'visitante-7f3a', 'telegram');

    const [baliza] = balizas();
    expect(baliza.evento).toBe(EVENTOS.copiado);
    expect(baliza.ruta).toBe('/cita/una');
    expect(Object.keys(baliza).sort()).toEqual(['evento', 'ruta']);
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

  it.each(fuentes)('%s llama `__medir` a secas y no junta `define:vars` con `set:html`', (ruta) => {
    /*
     * Revisión de la 23.1 (segunda pasada): la prueba sobre `dist/` mira cuatro islas con nombre;
     * esta mira todo `src/`, para que una isla nueva —o una de las que esa prueba no nombra— no
     * vuelva a `window.__medir && …` ni junte en un `<script>` las dos directivas que en Astro 7.2
     * pierden el cuerpo sin aviso (`src/lib/anuncio.ts`).
     */
    const codigo = readFileSync(ruta, 'utf8');
    expect(codigo).not.toMatch(/window\.__medir/);
    for (const atributos of atributosDeScript(codigo)) {
      expect(/\bdefine:vars\b/.test(atributos) && /\bset:html\b/.test(atributos), atributos).toBe(false);
    }
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

  it('la marca de origen viaja con la vista, también tras la cola, y no con el copiado', () => {
    // Historia 23.2 (AD-13): las marcas viajan solo con las vistas y la lectura.
    const { emitir, cargar, balizas } = medicionEnUnSandbox({
      busqueda: '?de=instagram',
      vistas: EVENTOS.vistaDeCita,
      cargado: false,
    });
    emitir(EVENTOS.copiado);
    cargar();
    const [vista, copiado] = balizas();
    expect(vista).toMatchObject({ evento: EVENTOS.vistaDeCita, origen: 'instagram' });
    expect(copiado.evento).toBe(EVENTOS.copiado);
    expect(copiado).not.toHaveProperty('origen');
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
    expect(externos[4]).toMatch(/^\(import\(\) sin literal\)/);
    // Lo ajeno y lo que no se sabe leer no casan con ninguna entrada: la prueba de `dist/` falla.
    expect(externos.filter((e) => guionExternoDe(e) === undefined)).toHaveLength(4);
  });

  it('el detector ve también lo que no es `<script src>` ni `import()`, y no lo que va en un comentario', () => {
    /*
     * Revisión de la 23.1: el detector solo miraba `<script src>` y el `import()` de los guiones
     * en línea, así que un worker, un `modulepreload` o un `<script>` creado a mano descargaban
     * guion fuera de la lista sin que la prueba de `dist/` lo viera. Y `\bsrc=` casaba con
     * `data-src=`.
     */
    const html = [
      '<img data-src="/no-es-guion.js">',
      '<script data-src="/tampoco.js">/* import(\'/comentado.js\') */</script>',
      '<link rel="modulepreload" href="/precargado.js">',
      '<link rel="preload" as="script" href="/adelantado.js">',
      '<link rel="preload" as="font" href="/letra.woff2">',
      "<script>new Worker('/w.js');new SharedWorker(base + 'c.js');importScripts('/i.js');" +
        "navigator.serviceWorker.register('/sw.js');document.createElement('script')</script>",
      "<script type=\"module\">import x from '/modulo.js';</script>",
    ].join('');
    const externos = guionesExternosDe(html);
    expect(externos.slice(0, 2)).toEqual(['/precargado.js', '/adelantado.js']);
    expect(externos).toContain('/w.js');
    expect(externos).toContain('/i.js');
    expect(externos).toContain('/sw.js');
    expect(externos).toContain('/modulo.js');
    expect(externos.some((e) => e.startsWith('(new SharedWorker sin literal)'))).toBe(true);
    expect(externos.some((e) => e.startsWith("(createElement('script') sin literal)"))).toBe(true);
    for (const ausente of ['/no-es-guion.js', '/tampoco.js', '/comentado.js', '/letra.woff2']) {
      expect(externos).not.toContain(ausente);
    }
    expect(externos.filter((e) => guionExternoDe(e) === undefined)).toHaveLength(externos.length);
  });

  it('el detector ve los workers y *worklets* precargados, el constructor por la ventana y el `addModule`', () => {
    // Revisión de la 23.1, segunda pasada: lo que la primera ampliación del detector aún no veía.
    const html = [
      '<link rel="preload" as="worker" href="/precargado-worker.js">',
      '<link rel="prefetch" as="paintworklet" href="/pintor.js">',
      '<link rel="prefetch" href="/sin-como.mjs">',
      '<link rel="prefetch" href="/otra-pagina/">',
      "<script>new window.Worker('/ventana.js');self.importScripts('/propio.js');" +
        "CSS.paintWorklet.addModule('/pincel.js');audioContext.audioWorklet.addModule(ruta)</script>",
    ].join('');
    const externos = guionesExternosDe(html);
    for (const visto of ['/precargado-worker.js', '/pintor.js', '/sin-como.mjs', '/ventana.js', '/propio.js', '/pincel.js']) {
      expect(externos, visto).toContain(visto);
    }
    expect(externos.some((e) => e.startsWith('(worklet.addModule sin literal)'))).toBe(true);
    // Un `prefetch` sin `as` de algo que no es guion —una página— no es una descarga de guion.
    expect(externos).not.toContain('/otra-pagina/');
  });

  it('las importaciones estáticas se leen del árbol, también tras un comentario; las dinámicas no cuentan', () => {
    expect(
      importacionesEstaticasDe(
        "import a from './a.js';\nimport './b.js';export { c } from \"../c.js\";const d = import('./d.js');" +
          "/* x */import e from './e.js';// import f from './f.js'",
      ),
    ).toEqual(['./a.js', './b.js', '../c.js', './e.js']);
  });

  it('lo que una entrada arranca se cuenta y se coteja con lo que declara', () => {
    const ficheros: Record<string, string> = {
      '/dist/p.js': "import './q.js'; const w = new Worker(`${base}w.js`);",
      '/dist/q.js': 'export const q = 1;',
      '/dist/w.js': "importScripts('/otro.js');",
    };
    const leer = (fichero: string) => Buffer.from(ficheros[fichero], 'utf8');
    const declarada = descargaDeLaEntrada('/dist', '/p.js', [{ como: 'new Worker', ruta: '/w.js' }], leer);
    expect(declarada.ficheros.sort()).toEqual(['/p.js', '/q.js', '/w.js']);
    expect(declarada.bytes).toBe(Object.values(ficheros).reduce((n, f) => n + Buffer.byteLength(f), 0));
    // El worker pide otro fichero que nadie declaró: fallo, no cero.
    expect(declarada.sinDeclarar).toEqual(["/w.js: importScripts('/otro.js')"]);
    expect(declarada.sinVer).toEqual([]);

    const sinDeclarar = descargaDeLaEntrada('/dist', '/p.js', [], leer);
    expect(sinDeclarar.sinDeclarar).toEqual(['/p.js: new Worker(`${base}w.js`)']);
    const rancia = descargaDeLaEntrada('/dist', '/q.js', [{ como: 'import()', ruta: '/x.js' }], (f) =>
      f === '/dist/x.js' ? Buffer.from('') : leer(f),
    );
    expect(rancia.sinVer).toEqual([{ como: 'import()', ruta: '/x.js' }]);
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
const TEXTOS_DE_CITA = [
  ...SLUGS.map((_, i) => `Frase número ${i} del catálogo de prueba.`),
  TEXTO_LARGO,
  ...[0, 1].map((i) => `Carta número ${i} del catálogo de prueba.`),
];

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
    // El vocabulario es el único sitio donde se escriben, desde la Historia 23.2.
    const suelta = /["'`]vista-de-(cita|superficie)["'`]/;
    for (const fuente of fuentesDeSrc().filter((f) => !f.endsWith('lib/vocabulario.ts'))) {
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
      // Ninguna etiqueta de guion, de la medición ni de nada: es la mitad «sin él, ninguno» de
      // los criterios de JavaScript de las Historias 2.1 y 4.1, que se juzgaba en el navegador.
      expect(etiquetasDeGuionExterno(html), ruta).toEqual([]);
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
        // Lo que el fichero arranca al ejecutarse —el worker de Pagefind— cuenta en su tope, y
        // un `new Worker`, `import()` o `importScripts` que la entrada no declare es un fallo.
        const { bytes, ficheros, sinDeclarar, sinVer } = descargaDeLaEntrada(
          dist,
          ruta,
          guion.arranca ?? [],
          (f) => readFileSync(f),
        );
        console.log(`${guion.id}: ${ficheros.join(' + ')}, ${bytes} bytes de ${guion.tope}`);
        expect(bytes, `${ruta}: ${bytes} bytes`).toBeLessThanOrEqual(guion.tope);
        expect(sinDeclarar, `${guion.id} arranca lo que no declara en GUIONES_EXTERNOS`).toEqual([]);
        expect(sinVer, `${guion.id} declara un arranque que sus ficheros ya no hacen`).toEqual([]);
        // El fichero de medición es un guion clásico: no importa ni arranca nada.
        if (guion.id === 'medicion') expect(ficheros).toEqual([ruta]);
      }
    }
    // El worker de Pagefind está en `dist/` y se cuenta: es lo que la revisión encontró fuera.
    expect(GUIONES_EXTERNOS.find((g) => g.id === 'pagefind')!.arranca).toEqual([
      { como: 'new Worker', ruta: '/pagefind/pagefind-worker.js' },
    ]);
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

  it('ninguno contiene contenido —slug, texto, Autor, Obra—, salvo `ImagenDelKit` en `/kit` y `/lote`', async () => {
    /*
     * Revisión de la 23.1 (segunda pasada): solo se buscaban slugs, y la identidad byte a byte
     * por familia no ve las familias de una sola página —la portada, `/buscar/`, el 404—, donde
     * el texto de la Cita del Día o el nombre de un Autor metidos en un guion pasaban. Se busca
     * todo el contenido del corpus de la prueba: slugs, textos, el Autor, las Obras, el Tema y la
     * Colección.
     */
    const contenido = [
      ...SLUGS_DE_CITA,
      ...TEXTOS_DE_CITA,
      'Séneca',
      'Sobre la brevedad de la vida',
      'Cartas a Lucilio',
      'El tiempo',
      'Frases cortas para reflexionar',
    ];
    let mirados = 0;
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      for (const guion of guionesEnLinea(html)) {
        // Exención nombrada hasta la Historia 25.4: el Kit lleva el slug por `define:vars`.
        if (AJENAS.includes(ruta) && guion.includes('data-imagen-kit')) continue;
        mirados++;
        for (const dato of contenido) expect(guion, `${ruta} lleva «${dato}»`).not.toContain(dato);
      }
    }
    expect(mirados).toBeGreaterThan(SLUGS_DE_CITA.length);
  }, 240_000);
});

describe('Historia 23.1 — las islas llaman `__medir` a secas y anuncian con `anunciar`', () => {
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
    /*
     * Llevar el texto de `anunciar` no basta: `guionQueAnuncia` lo mete siempre, se llame o no.
     * Revisión de la 23.1 (segunda pasada): con un `estado.textContent = …` a mano en `/buscar/`,
     * el mismo recuento dos veces seguidas dejaba de anunciarse y todo seguía en verde. Así que
     * el cuerpo de cada isla —el guion sin ese texto— llama `anunciar(` sobre su región y nunca
     * le escribe un mensaje a mano (vaciarla, sí: es lo que hace al volver a su reposo).
     */
    const REGION = { copiar: 'anuncio', imagen: 'anuncio', buscar: 'estado' } as const;
    for (const [nombre, region] of Object.entries(REGION) as [keyof typeof REGION, string][]) {
      expect(colapsado(islas[nombre]), nombre).toContain(ANUNCIAR);
      const cuerpo = sinAnunciar(islas[nombre]);
      expect(cuerpo, nombre).toMatch(new RegExp(`\\banunciar\\(\\s*${region}\\s*,`));
      const escrito = [
        ...cuerpo.matchAll(new RegExp(`\\b${region}\\.(?:textContent|innerText|innerHTML)\\s*=(?!=)\\s*([^;}]*)`, 'g')),
      ].map((m) => m[1].trim());
      expect(escrito.filter((valor) => valor !== "''" && valor !== '""'), nombre).toEqual([]);
    }
  }, 240_000);

  it('cada copia de Copiar va justo detrás de su isla, que es lo que encuentra por `currentScript`', async () => {
    /*
     * `CopiarCita` se encuentra por `document.currentScript.previousElementSibling`: si algo se
     * colara entre el `<div class="isla">` y su guion, la isla moriría en el navegador con el
     * build en verde, y solo lo vería el Playwright local, que el CI no corre. Se mira aquí, en
     * cada página que lleve la isla —la Página de Cita y el Kit—.
     */
    let vistas = 0;
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
        if (!m[1].includes("'[data-copiar]'")) continue;
        vistas++;
        const antes = html.slice(0, m.index).trimEnd();
        expect(antes.endsWith('</div>'), `${ruta}: el guion de Copiar no sigue a un </div>`).toBe(true);
        const isla = antes.slice(antes.lastIndexOf('<div'));
        expect(isla, ruta).toMatch(/^<div\b[^>]*\bclass="isla\b/);
        expect(isla, ruta).toContain('data-copiar');
      }
    }
    expect(vistas).toBeGreaterThan(SLUGS.length);
  }, 240_000);

  it('entre los guiones en línea solo el arranque asigna `__medir`, y nadie usa `requestAnimationFrame` fuera de `anunciar`', async () => {
    let vistos = 0;
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      for (const guion of guionesEnLinea(html)) {
        vistos++;
        if (guion === ARRANQUE_DE_MEDICION) continue;
        expect(guion, ruta).not.toMatch(/__medir\s*=(?!=)/);
        expect(sinAnunciar(guion), ruta).not.toContain('requestAnimationFrame');
      }
    }
    expect(vistos).toBeGreaterThan(0);
    expect(ARRANQUE_DE_MEDICION).toMatch(/__medir\s*=(?!=)/);
  }, 240_000);
});

/*
 * Revisión de la 23.1 — lo que la primera pasada no fijaba.
 *
 * Los guiones de las islas se componen ahora como texto dentro de plantillas de TypeScript
 * (`guionQueAnuncia`), que ni `astro check` ni ningún analizador miran: un `\.` que la plantilla
 * se come o un `${` de más salen al visitante y solo los vería el Playwright local, que el CI no
 * corre. Y el arranque promete abrir la cola antes que cualquier guion, cosa que nada medía.
 */
describe('Historia 23.1 — los guiones en línea se dejan analizar, y el arranque va primero', () => {

  it('todo guion en línea de las dos construcciones es JavaScript válido', async () => {
    let analizados = 0;
    for (const proyecto of [await sitioMedido(), await sitioSinMedir()]) {
      for (const [ruta, html] of paginasDe(proyecto)) {
        for (const { cuerpo, modulo } of guionesEnLineaConTipo(html)) {
          analizados++;
          // Un guion clásico se juzga con la gramática de un guion clásico, que es la de `vm`;
          // uno de módulo, con la de módulo.
          if (modulo) expect(parseSync('guion.js', cuerpo, { sourceType: 'module' }).errors, ruta).toEqual([]);
          else expect(() => new Script(cuerpo, { filename: ruta }), `${ruta}: ${cuerpo.slice(0, 80)}`).not.toThrow();
        }
      }
    }
    expect(analizados).toBeGreaterThan(0);
  }, 240_000);

  it('el arranque es el primer guion de toda página, antes que cualquier isla o fichero', async () => {
    for (const proyecto of [await sitioMedido(), await sitioSinMedir()]) {
      for (const [ruta, html] of paginasDe(proyecto)) {
        const [primero] = guionesEjecutables(html);
        expect(primero?.cuerpo, ruta).toBe(ARRANQUE_DE_MEDICION);
        expect(primero?.atributos, ruta).not.toMatch(/\bsrc\s*=/i);
      }
    }
  }, 240_000);
});

describe('Historia 23.1 — toda isla que anuncia lleva `anunciar`', () => {
  it('cada página lleva tantos guiones que llaman `anunciar` como regiones `role="status"`, o más', async () => {
    /*
     * La prueba de las islas nombra tres; esta las descubre: una isla nueva con su región de
     * estado y un anuncio escrito a mano —sin `requestAnimationFrame`, que la otra prueba
     * vigila— dejaría su página con una región de más. Cuenta el guion que **llama** a
     * `anunciar`, no el que solo lleva su texto, que `guionQueAnuncia` mete siempre.
     */
    let regionesVistas = 0;
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      const regiones = (html.match(/\brole\s*=\s*["']?status\b/gi) ?? []).length;
      const anunciantes = guionesEnLinea(html).filter(
        (g) => colapsado(g).includes(ANUNCIAR) && /\banunciar\(/.test(sinAnunciar(g)),
      ).length;
      regionesVistas += regiones;
      expect(anunciantes, `${ruta}: ${regiones} regiones de estado y ${anunciantes} guiones con anunciar`).toBeGreaterThanOrEqual(
        regiones,
      );
    }
    expect(regionesVistas).toBeGreaterThan(0);
  }, 240_000);

  it('el texto de `anunciar` funciona solo, sin nada de su módulo alrededor', () => {
    // Es lo que viaja: si el empaquetado le metiera un ayudante o un nombre de fuera, la isla
    // fallaría en el navegador con el build en verde. Aquí se ejecuta tal cual.
    const fotogramas: (() => void)[] = [];
    const deTexto = new Function('requestAnimationFrame', `return ${String(anunciar)};`)(
      (fotograma: () => void) => fotogramas.push(fotograma),
    ) as typeof anunciar;
    const region = { textContent: 'Copiado.' as string | null };
    deTexto(region, 'Copiado.');
    expect(region.textContent).toBe('');
    for (const fotograma of fotogramas) fotograma();
    expect(region.textContent).toBe('Copiado.');
  });

  it('`guionQueAnuncia` rompe ante lo que cerraría el `<script>` o no sería JavaScript', () => {
    expect(() => guionQueAnuncia({ 'no-vale': 1 }, '')).toThrow(/identificador/);
    expect(() => guionQueAnuncia({ NADA: undefined }, '')).toThrow(/JSON/);
    expect(() => guionQueAnuncia({}, "region.innerHTML = '</script>';")).toThrow(/<\/script/);
    expect(() => guionQueAnuncia({}, 'const a = 1; <!-- b')).toThrow(/<!--/);
    // Un valor con `</script>` sí vale: sale con el `<` escapado, como lo escapa `define:vars`.
    expect(guionQueAnuncia({ VALOR: '</script>' }, 'f(VALOR);')).not.toContain('</script');
  });
});

describe('Historia 23.1 — el tope del fichero se juzga con el punto final de verdad', () => {
  it('el build se para si el fichero, con el punto final de la construcción, pasa de su tope', async () => {
    // La prueba de `dist/` mide con el punto final de las pruebas; el que se despliega es otro y
    // va dentro del fichero. Por eso lo juzga el propio endpoint, con el de cada construcción.
    const { getStaticPaths } = await import('../../src/pages/medicion/[version].js.ts');
    const antes = process.env.MEDICION_ENDPOINT;
    try {
      process.env.MEDICION_ENDPOINT = ENDPOINT;
      expect(getStaticPaths()).toHaveLength(1);
      process.env.MEDICION_ENDPOINT = `https://medicion.ejemplo.workers.dev/${'e'.repeat(MAX_BYTES_GUION_DE_MEDICION)}`;
      expect(() => getStaticPaths()).toThrow(/MAX_BYTES_GUION_DE_MEDICION/);
      delete process.env.MEDICION_ENDPOINT;
      expect(getStaticPaths()).toEqual([]);
    } finally {
      if (antes === undefined) delete process.env.MEDICION_ENDPOINT;
      else process.env.MEDICION_ENDPOINT = antes;
    }
  });
});
