import { afterAll, describe, expect, it } from 'vitest';
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
 * La cobertura tipográfica — la puerta, puesta de verdad.
 *
 * `cobertura.test.ts` prueba el criterio sin construir. Esto construye: invoca
 * `astro build` sobre un corpus de prueba y exige que **rompa**, con el patrón de
 * `cotejo-build.test.ts`. Es la única forma de comprobar lo que la puerta promete, que
 * es que ningún camino de publicación esquive la comprobación.
 *
 * Lo que se defiende es la decisión de `astro.config.mjs` de bajar `subsets` a `latin` y
 * `styles` a `normal`: ocho `.woff2` precargados y 460 KiB se quedaron en dos y ~99 KiB,
 * y el LCP en móvil bajó de 3,2 s. Esa decisión solo es segura mientras el corpus quepa
 * en `latin`, y quien lo garantiza mañana es esta puerta, no la memoria de nadie.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

async function construir(corpus: Record<string, string>) {
  const resultado = await construirConCorpus(corpus);
  aLimpiar.push(resultado.proyecto);
  return resultado;
}

const OBRA = 'Sobre la brevedad de la vida';
const URL_DE_LA_FUENTE = 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida';
const DOCUMENTO = 'fuentes/wikisource-es--sobre-la-brevedad-de-la-vida.txt';

/**
 * El documento del que sale la Cita, como el que deja `tools/recuperar.ts`.
 *
 * Hace falta porque el cotejo es la puerta de **antes** —`astro:build:start`— y no deja
 * llegar a esta ninguna Cita que no aparezca literalmente en su documento. Sembrarlo con
 * el mismo texto es lo que hace que la construcción llegue hasta la cobertura, que es lo
 * que estas pruebas quieren mirar.
 */
function documento(cuerpo: string): string {
  return componerDocumento(
    {
      fuente: 'wikisource-es',
      obra: OBRA,
      año: 49,
      url: URL_DE_LA_FUENTE,
      recuperado: '2026-08-19',
    },
    [OBRA, 'Año de publicación: 49'].join('\n'),
    cuerpo,
  );
}

const BASE = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  // Censo vacío: aquí nada está exento del cotejo, para que lo que rompa sea esta puerta.
  [FICHERO_DEL_CENSO]: 'citas: []\n',
};

describe('la cobertura tipográfica como puerta del build', () => {
  it('deja pasar lo español, que cabe entero en `latin`', async () => {
    /*
     * La Cita trae eñe, las cinco acentuadas, diéresis, angulares y los signos de
     * apertura: exactamente lo que el comentario retirado de `astro.config.mjs` afirmaba
     * que se caía al tipo de reserva sin `latin-ext`. Si esta prueba se pusiera roja, la
     * que estaría equivocada es la configuración, no la prueba.
     */
    const texto = '¿Qué año? ¡Señor! La cigüeña más añeja perdió su título.';

    const { codigo, salida } = await construir({
      ...BASE,
      'citas/seneca--que-ano.md': citaValida({
        texto,
        slug: 'seneca-que-ano-senor-la-ciguena',
      }),
      [DOCUMENTO]: documento(`${OBRA}\n\n${texto}\n`),
    });

    expect(codigo).toBe(0);
    expect(salida).toContain('sin caídas al tipo de reserva');
  });

  it('rompe si una Cita publicada trae un carácter que ninguna cara cubre', async () => {
    const texto = 'No es que tengamos poco tiempo, dijo Petőfi, es que perdemos mucho.';

    const { codigo, salida } = await construir({
      ...BASE,
      'citas/seneca--petofi.md': citaValida({
        texto,
        slug: 'seneca-no-es-que-tengamos-poco-tiempo-petofi',
      }),
      [DOCUMENTO]: documento(`${OBRA}\n\n${texto}\n`),
    });

    expect(codigo).not.toBe(0);
    expect(salida).toContain('U+0151');
    // El fallo nombra las dos salidas: cambiar el texto o ensanchar el subconjunto.
    expect(salida).toContain('subsets');
  });
});
