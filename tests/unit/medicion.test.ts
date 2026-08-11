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
import { AUTOR_VALIDO, citaValida, construirConCorpus, limpiar } from './ayuda/construir.js';

const RAIZ = resolve(import.meta.dirname, '../..');
const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

describe('Historia 2.9 — el vocabulario es cerrado', () => {
  it('son exactamente los cuatro eventos con nombre', () => {
    expect([...EVENTOS_VALIDOS].sort()).toEqual(
      ['busqueda-sin-resultados', 'copiado', 'descarga-de-imagen', 'vista-de-cita'].sort(),
    );
  });

  it('un evento fuera del conjunto no es válido', () => {
    expect(esEventoValido(EVENTOS.copiado)).toBe(true);
    expect(esEventoValido('clic-en-cualquier-cosa')).toBe(false);
    expect(esEventoValido('pageview')).toBe(false);
  });

  it('el guion descarta en cliente cualquier evento fuera del conjunto', () => {
    // Añadir uno exige modificar el módulo, no la superficie que lo emite: una isla que
    // invente un nombre no consigue emitirlo.
    const guion = guionDeMedicion('https://ejemplo.invalid/e');
    expect(guion).toContain('permitidos.indexOf(evento) === -1) return');
    for (const evento of EVENTOS_VALIDOS) expect(guion).toContain(evento);
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
    expect(guion).toContain('evento: evento');
    expect(guion).toContain('ruta: location.pathname');
    // Ni referente, ni agente de usuario, ni pantalla, ni zona horaria.
    expect(guion).not.toMatch(/referrer|userAgent|screen\.|timeZone|language/);
  });

  it('una medición que falla no rompe la página', () => {
    expect(guion).toContain('try {');
    expect(guion).toContain('catch');
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
