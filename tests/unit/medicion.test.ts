import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  EVENTOS,
  EVENTOS_VALIDOS,
  emitir,
  esEventoValido,
  guionDeMedicion,
  puntoFinal,
} from '../../src/lib/medicion.ts';
import { CITAS_POR_PAGINA, MAX_BYTES_DE_GUION } from '../../src/lib/umbrales.ts';
import { bytesDeGuionEnLinea } from './ayuda/guion.js';
import { caracterDe, superficieDeclaradaDe } from '../../src/lib/superficies.ts';
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

  it('el guion no toca las cookies', () => {
    expect(guion).not.toMatch(/document\.cookie/);
    expect(guion).not.toMatch(/localStorage|sessionStorage|indexedDB/);
  });

  it('no genera ni transporta ningún identificador de visitante', () => {
    expect(guion).not.toMatch(/randomUUID|Math\.random|fingerprint|visitor|userId|uuid/i);
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
});

describe('Historia 2.9 — sin configurar, el sitio no envía nada', () => {
  it('no hay punto final por defecto', () => {
    expect(puntoFinal({})).toBeNull();
    expect(puntoFinal({ MEDICION_ENDPOINT: '   ' })).toBeNull();
    expect(puntoFinal({ MEDICION_ENDPOINT: 'https://x.invalid/e' })).toBe('https://x.invalid/e');
  });

  it('el build sin medición no inserta ningún guion de medición', async () => {
    const resultado = await construirConCorpus({
      'autores/seneca.yml': AUTOR_VALIDO,
      'citas/seneca--una.md': citaValida({ temas: [] }),
    });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);

    const html = await readFile(
      paginaConstruida(resultado.proyecto, '/cita/seneca-no-es-que-tengamos-poco-tiempo/'),
      'utf8',
    );
    /*
     * Lo que no debe existir es el **instalador**: sin él, `window.__medir` no está
     * definido y el guardia de las islas no llama a nada. La referencia `window.__medir &&`
     * de la isla sí aparece siempre, y debe aparecer: es lo que hace que copiar funcione
     * igual con la medición apagada.
     */
    expect(html).not.toContain('window.__medir=function');
    expect(html).not.toContain('sendBeacon');
  });
});

/*
 * Un sitio construido **con** la medición configurada, que comparten la matriz de la
 * Historia 20.1 y el presupuesto de la retro de la épica 7. Lleva una Cita más de las que
 * caben en una página, todas del mismo Autor, del mismo Tema y de la misma Colección, para
 * que los tres listados tengan página 2: la que es `servicio` y no debe emitir la vista.
 * El mismo corpus se construye además **sin** punto final, para ver que entonces no sale
 * nada en ninguna de las superficies que con él emiten.
 */
const ENDPOINT = 'https://medicion.ejemplo.workers.dev/e';
const SLUGS = Array.from(
  { length: CITAS_POR_PAGINA + 1 },
  (_, i) => `seneca-frase-${String(i).padStart(3, '0')}`,
);
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
};

/** Construye una vez por entorno y apunta el proyecto para limpiarlo, falle o no. */
function construccionUnica(entorno: Record<string, string>): () => Promise<string> {
  let construccion: Promise<string> | undefined;
  return () => {
    construccion ??= construirConCorpus(CORPUS_MEDIDO, { entorno }).then((resultado) => {
      // Se apunta **antes** de afirmar: un build fallido también deja su proyecto temporal.
      aLimpiar.push(resultado.proyecto);
      expect(resultado.codigo, resultado.salida).toBe(0);
      return resultado.proyecto;
    });
    return construccion;
  };
}
const sitioMedido = construccionUnica({ MEDICION_ENDPOINT: ENDPOINT });
const sitioSinMedir = construccionUnica({});

const leerMedida = async (ruta: string) =>
  readFile(paginaConstruida(await sitioMedido(), ruta), 'utf8');
const leerSinMedir = async (ruta: string) =>
  readFile(paginaConstruida(await sitioSinMedir(), ruta), 'utf8');

/** Cuántas veces emite la página el evento, contado sobre el texto que produce `emitir`. */
const vistas = (html: string, evento: (typeof EVENTOS)[keyof typeof EVENTOS]) =>
  html.split(emitir(evento)).length - 1;

const CITA = `/cita/${SLUGS[0]}/`;
const PAGINAS_1 = ['/', '/autor/seneca/', '/tema/el-tiempo/', '/coleccion/frases-cortas/'];
const PAGINAS_2 = ['/autor/seneca/2/', '/tema/el-tiempo/2/', '/coleccion/frases-cortas/2/'];
const SIN_VISTA = ['/buscar/', '/404', '/kit/', '/lote/'];

describe('Historia 20.1 — la vista de una superficie de agregación deja fila', () => {
  it.each(PAGINAS_1)(
    '%s lleva el instalador y una sola vista de superficie, ninguna de Cita',
    async (ruta) => {
      const html = await leerMedida(ruta);
      expect(html).toContain('window.__medir=function');
      expect(vistas(html, EVENTOS.vistaDeSuperficie)).toBe(1);
      expect(vistas(html, EVENTOS.vistaDeCita)).toBe(0);
    },
    240_000,
  );

  it.each(PAGINAS_2)(
    '%s, página de servicio, lleva el instalador sin llamada de vista',
    async (ruta) => {
      const html = await leerMedida(ruta);
      expect(html).toContain('window.__medir=function');
      expect(vistas(html, EVENTOS.vistaDeSuperficie)).toBe(0);
      expect(vistas(html, EVENTOS.vistaDeCita)).toBe(0);
    },
    240_000,
  );

  it('la Página de Cita emite su vista y ninguna de superficie', async () => {
    const html = await leerMedida(CITA);
    expect(html).toContain('window.__medir=function');
    expect(vistas(html, EVENTOS.vistaDeCita)).toBe(1);
    expect(vistas(html, EVENTOS.vistaDeSuperficie)).toBe(0);
  }, 240_000);

  it.each(SIN_VISTA)(
    '%s lleva el instalador y no emite ninguna vista',
    async (ruta) => {
      const html = await leerMedida(ruta);
      expect(html).toContain('window.__medir=function');
      expect(vistas(html, EVENTOS.vistaDeSuperficie)).toBe(0);
      expect(vistas(html, EVENTOS.vistaDeCita)).toBe(0);
    },
    240_000,
  );

  /*
   * Las páginas deciden la vista con `currentPage === 1`; esto ata esa decisión a la
   * declaración única de `src/lib/superficies.ts`: emite `vista-de-superficie` si y solo
   * si la ruta es de producto y no es una Página de Cita, que emite la suya.
   */
  it.each([...PAGINAS_1, ...PAGINAS_2, CITA, ...SIN_VISTA])(
    '%s emite vista de superficie si y solo si es de producto y no es Cita',
    async (ruta) => {
      const html = await leerMedida(ruta);
      const esCita = superficieDeclaradaDe(ruta)?.pagina.startsWith('cita/') ?? false;
      const debe = caracterDe(ruta) === 'producto' && !esCita;
      expect(vistas(html, EVENTOS.vistaDeSuperficie)).toBe(debe ? 1 : 0);
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

describe('Historia 20.1 — sin punto final, ninguna superficie mide', () => {
  it.each([...PAGINAS_1, CITA])(
    '%s no lleva instalador ni llamada de vista',
    async (ruta) => {
      const html = await leerSinMedir(ruta);
      expect(html).not.toContain('window.__medir=function');
      expect(vistas(html, EVENTOS.vistaDeSuperficie)).toBe(0);
      expect(vistas(html, EVENTOS.vistaDeCita)).toBe(0);
    },
    240_000,
  );
});

describe('Retro épica 7 — el presupuesto de guion también con la medición encendida', () => {
  /*
   * La prueba de la Historia 2.1 exige menos de MAX_BYTES_DE_GUION bytes de guion en
   * línea en la Página de Cita, y **todas** las construcciones de prueba corren sin
   * `MEDICION_ENDPOINT`, así que el guion de medición no se contaba nunca. Creció en la
   * Historia 8.2 (array de redes) y en la 10.4 (array de destinos), y en producción la
   * página llegó a llevar 6630 bytes frente a un tope de 6144 sin que nada lo viera.
   *
   * Se construye aquí un sitio **con** la medición configurada y se mide lo que de
   * verdad se sirve.
   */
  it.each([CITA, ...PAGINAS_1])(
    '%s con medición configurada cabe en el presupuesto',
    async (ruta) => {
      const html = await leerMedida(ruta);

      // El instalador tiene que estar: si no, esto no mide nada.
      expect(html).toContain('window.__medir=function');

      // El contador compartido con la medida de la Historia 17.5: bytes UTF-8, una sola frontera.
      const bytes = bytesDeGuionEnLinea(html);

      expect(bytes, `${bytes} bytes de guion en línea con la medición encendida`).toBeLessThan(
        MAX_BYTES_DE_GUION,
      );
    },
    240_000,
  );
});
