import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
} from './ayuda/construir.js';
import { FICHERO_DEL_CENSO } from '../../tools/lib/cotejo.ts';
import { componerDocumento } from '../../tools/lib/documento.ts';

/**
 * La Fuente llega a la página — FR-2.
 *
 * El dato existía en `corpus/` desde siempre y `aplanarCita` lo dejaba caer, así que la
 * Página de Cita afirmaba una obra y un año sin ofrecer con qué comprobarlos. Esta prueba
 * construye de verdad y exige que el documento salga enlazado, porque el fallo que
 * defiende es silencioso por naturaleza: quitar un campo de un objeto plano no rompe
 * nada, no falla ningún tipo y no se ve hasta que alguien busca la prueba y no está.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const OBRA = 'Sobre la brevedad de la vida';
const URL_DE_LA_FUENTE = 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida';
const DOCUMENTO = 'fuentes/wikisource-es--sobre-la-brevedad-de-la-vida.txt';
const TEXTO = 'No es que tengamos poco tiempo, es que perdemos mucho.';
const SLUG = 'seneca-no-es-que-tengamos-poco-tiempo';

function documento(cuerpo: string): string {
  return componerDocumento(
    { fuente: 'wikisource-es', obra: OBRA, año: 49, url: URL_DE_LA_FUENTE, recuperado: '2026-08-19' },
    [OBRA, 'Año de publicación: 49'].join('\n'),
    cuerpo,
  );
}

describe('la Página de Cita enseña de dónde salió el texto', () => {
  it('enlaza el documento de la Fuente, con su nombre y su licencia', async () => {
    const resultado = await construirConCorpus({
      'autores/seneca.yml': AUTOR_VALIDO,
      'temas/el-tiempo.yml': TEMA_VALIDO,
      [FICHERO_DEL_CENSO]: 'citas: []\n',
      'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida({
        texto: TEXTO,
        slug: SLUG,
        fuente: {
          id: 'wikisource-es',
          nombre: 'Wikisource en español',
          licencia: 'CC BY-SA 4.0',
          url: URL_DE_LA_FUENTE,
        },
      }),
      [DOCUMENTO]: documento(`${OBRA}\n\n${TEXTO}\n`),
    });
    aLimpiar.push(resultado.proyecto);

    expect(resultado.codigo).toBe(0);

    const html = readFileSync(join(resultado.proyecto, 'dist', 'cita', `${SLUG}.html`), 'utf8');

    // La prueba que el visitante puede seguir: la dirección exacta del documento.
    expect(html).toContain(`href="${URL_DE_LA_FUENTE}"`);
    expect(html).toContain('Texto tomado de');
    expect(html).toContain('Wikisource en español');
    expect(html).toContain('CC BY-SA 4.0');

    /*
     * Y no se promete el cotejo. `corpus/pendientes-de-cotejo.yml` exime a unas cuantas
     * Citas de la puerta de la Historia 11.2, así que una página que afirmara «cotejada»
     * en todas mentiría justo donde más caro sale. Si alguien cambia el rótulo por uno
     * que promete verificación, esto se pone rojo.
     */
    expect(html).not.toMatch(/cotejad[ao]\s+contra/i);

    // El mismo dato, para quien lee el marcado y no la página.
    expect(html).toContain('"isBasedOn"');
  });
});
