import { afterAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AUTOR_VALIDO, citaValida, construirConCorpus, limpiar } from './ayuda/construir.js';
import { MAX_CARACTERES_IMAGEN } from '../../src/lib/umbrales.ts';

/**
 * Historia 8.1 — los dos criterios que solo se ven en un sitio construido: el cambio de
 * jornada y la Cita del Día demasiado larga para una Imagen.
 *
 * El corpus real no tiene ninguna Cita por encima del corte y su Cita del Día depende del
 * día en que se ejecuten las pruebas, así que ambos se construyen con corpus fabricado.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

/** Una frase real de longitud controlada, no una repetición de letras. */
function frase(caracteres: number): string {
  const base =
    'La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para ' +
    'contarla, y por eso quien escribe su memoria escribe también su olvido, y en ese ' +
    'olvido cabe todo lo que fuimos sin llegar a saberlo nunca del todo. ';
  return base.repeat(Math.ceil(caracteres / base.length)).slice(0, caracteres).trim();
}

const CORPUS = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'citas/seneca--a.md': citaValida({
    texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
    slug: 'a-corta',
    temas: [],
    aptaParaPortada: true,
  }),
  'citas/seneca--b.md': citaValida({
    texto: frase(MAX_CARACTERES_IMAGEN + 40),
    slug: 'b-larga',
    temas: [],
    aptaParaPortada: true,
  }),
};

/** Dos jornadas consecutivas: con dos Citas aptas, la rotación cambia de una a otra. */
const JORNADAS = ['2026-08-12', '2026-08-13'];

describe('Historia 8.1 — la reconstrucción diaria mueve el Kit sola', () => {
  const kits: Record<string, string> = {};

  it.each(JORNADAS)('construye el sitio de la jornada %s', async (jornada) => {
    const resultado = await construirConCorpus(CORPUS, { jornada });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    kits[jornada] = await readFile(join(resultado.proyecto, 'dist', 'kit.html'), 'utf8');
  });

  it('el Kit de una jornada y el de la siguiente no traen la misma Cita', () => {
    /*
     * No hace falta ningún paso propio del Kit en el flujo de CI: se compone en el mismo
     * build que la portada, así que la reconstrucción diaria de AD-12 lo mueve por el
     * mismo mecanismo. Esto lo comprueba: dos builds, dos jornadas, dos Kits distintos.
     */
    const [una, otra] = JORNADAS.map((j) => kits[j].match(/<a href="([^"]+)"[^>]*data-enlace-cita/)?.[1]);
    expect(una).toBeTruthy();
    expect(otra).toBeTruthy();
    expect(una).not.toBe(otra);
  });

  it('cada Kit lleva su jornada escrita, para no publicar el de ayer sin darse cuenta', () => {
    for (const jornada of JORNADAS) expect(kits[jornada]).toContain(jornada);
  });
});

describe('Historia 8.1 — cuando la Cita del Día no admite Imagen', () => {
  let html = '';

  it('construye la jornada en la que toca la Cita larga', async () => {
    // Se prueban las dos y se conserva la que compuso la larga: qué jornada es depende
    // del orden por slug, y fijarlo aquí a mano sería atarse a un detalle de la rotación.
    for (const jornada of JORNADAS) {
      const resultado = await construirConCorpus(CORPUS, { jornada });
      aLimpiar.push(resultado.proyecto);
      expect(resultado.codigo, resultado.salida).toBe(0);
      const kit = await readFile(join(resultado.proyecto, 'dist', 'kit.html'), 'utf8');
      if (kit.includes('data-sin-imagen')) html = kit;
    }
    expect(html, 'ninguna jornada compuso la Cita larga').not.toBe('');
  });

  it('lo dice explícitamente en vez de dejar el hueco vacío', () => {
    expect(html).toContain('data-sin-imagen');
    expect(html).toMatch(/pasa del límite de longitud/);
  });

  it('ofrece una alternativa con su material completo', () => {
    expect(html).toContain('data-alternativa');
    // Material completo: Imagen, pie copiable y enlace, como la del Día cuando sí cabe.
    const alternativa = html.slice(html.indexOf('data-alternativa'));
    expect(alternativa).toContain('data-lienzo');
    expect(alternativa).toContain('data-copiar');
    expect(alternativa).toContain('data-enlace-cita');
  });

  it('la Cita del Día sigue siendo la del Día: no se sustituye en silencio', () => {
    // El Kit y la portada del mismo build tienen que hablar de la misma Cita.
    expect(html).toContain('b-larga');
  });
});
