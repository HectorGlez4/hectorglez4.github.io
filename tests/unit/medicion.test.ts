import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  EVENTOS,
  EVENTOS_VALIDOS,
  esEventoValido,
  guionDeMedicion,
  puntoFinal,
} from '../../src/lib/medicion.ts';
import { MAX_BYTES_DE_GUION } from '../../src/lib/umbrales.ts';
import { medicionEnUnSandbox } from './ayuda/medicion.js';
import { AUTOR_VALIDO, citaValida, construirConCorpus, limpiar } from './ayuda/construir.js';

const RAIZ = resolve(import.meta.dirname, '../..');
const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

describe('Historia 2.9 — el vocabulario es cerrado', () => {
  it('son exactamente estos eventos con nombre, y ninguno más', () => {
    /*
     * La lista crece solo cuando una historia lo decide, y que haya que tocar esta prueba
     * para ampliarla es el punto: los cuatro primeros son de la v1 y los dos de
     * compartición los añadió la Historia 10.4.
     */
    expect([...EVENTOS_VALIDOS].sort()).toEqual(
      [
        'busqueda-sin-resultados',
        'comparticion-de-enlace',
        'comparticion-de-imagen',
        'copiado',
        'descarga-de-imagen',
        'vista-de-cita',
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
  const fuentes = (function recorrer(dir: string): string[] {
    return readdirSync(dir).flatMap((entrada) => {
      const ruta = join(dir, entrada);
      if (statSync(ruta).isDirectory()) return recorrer(ruta);
      return /\.(ts|astro)$/.test(entrada) ? [ruta] : [];
    });
  })(resolve(RAIZ, 'src')).filter((f) => !f.endsWith('lib/medicion.ts'));

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
      join(resultado.proyecto, 'dist', 'cita', 'seneca-no-es-que-tengamos-poco-tiempo.html'),
      'utf8',
    );
    /*
     * Lo que no debe existir es el **instalador**: sin él, `window.__medir` no está
     * definido y el guardia de las islas no llama a nada. La referencia `window.__medir &&`
     * de la isla sí aparece siempre, y debe aparecer: es lo que hace que copiar funcione
     * igual con la medición apagada.
     */
    expect(html).not.toContain('__medir = function');
    expect(html).not.toContain('sendBeacon');
  });
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
  it('la Página de Cita con medición configurada cabe en el presupuesto', async () => {
    const resultado = await construirConCorpus(
      {
        'autores/seneca.yml': AUTOR_VALIDO,
        'citas/seneca--una.md': citaValida({ temas: [] }),
      },
      { entorno: { MEDICION_ENDPOINT: 'https://medicion.ejemplo.workers.dev/e' } },
    );
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);

    const html = await readFile(
      join(resultado.proyecto, 'dist', 'cita', 'seneca-no-es-que-tengamos-poco-tiempo.html'),
      'utf8',
    );

    // El instalador tiene que estar: si no, esto no mide nada.
    expect(html).toContain('window.__medir=function');

    const guiones = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
      .filter((m) => !m[1].includes('application/ld+json'))
      .map((m) => m[2]);
    const bytes = guiones.reduce((n, g) => n + g.length, 0);

    expect(bytes, `${bytes} bytes de guion en línea con la medición encendida`).toBeLessThan(
      MAX_BYTES_DE_GUION,
    );
  });
});
