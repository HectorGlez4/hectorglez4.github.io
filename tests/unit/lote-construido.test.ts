import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { MAX_CARACTERES_IMAGEN } from '../../src/lib/umbrales.ts';

/**
 * Historia 13.1 — el lote sobre un sitio construido de verdad.
 *
 * Aquí vive **solo lo que necesita jornadas fijadas**. Que el lote sea `noindex`, que no
 * entre en el sitemap ni en el índice interno y que no le enlace ninguna superficie del
 * producto se comprueba en `publicable-y-alcanzable.test.ts`, sobre la construcción que ese
 * fichero ya hace: la suite serializa a propósito porque cada `astro build` cuesta segundos,
 * y repetirlos para afirmar lo mismo sale caro sin comprar nada.
 *
 * Quedan tres construcciones, y cada una compra algo que ninguna otra puede:
 *
 *   · una **hoy** con fijaciones, donde se ven las ramas de la página —el aviso de fijación
 *     muda, la alternativa, la Cita larga— y qué jornadas entran;
 *   · una **mañana** con las mismas fijaciones, que es la única forma de comprobar de verdad
 *     que lo compuesto por adelantado y lo que compone el Kit ese día son lo mismo;
 *   · una **sin fijaciones**, que es el estado del repositorio hoy.
 */

const JORNADA = '2026-08-19';
const MANANA = '2026-08-20';
const CON_LARGA = '2026-08-21';
const MUDA = '2026-08-22';
const PASADA = '2026-01-01';

const APTA = 'seneca-a-corta';
const OTRA_APTA = 'seneca-b-corta';
const LARGA = 'seneca-c-larga';
const RETIRADA = 'seneca-retirada-hace-un-mes';

/** Una frase real de longitud controlada, no una repetición de letras. */
function frase(caracteres: number): string {
  const base =
    'La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para ' +
    'contarla, y por eso quien escribe su memoria escribe también su olvido, y en ese ' +
    'olvido cabe todo lo que fuimos sin llegar a saberlo nunca del todo. ';
  return base.repeat(Math.ceil(caracteres / base.length)).slice(0, caracteres).trim();
}

const CORPUS_BASE = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'citas/seneca--a.md': citaValida({
    slug: APTA,
    texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
    temas: [],
    aptaParaPortada: true,
  }),
  'citas/seneca--b.md': citaValida({
    slug: OTRA_APTA,
    texto: 'La vida, si sabes usarla, es larga; nadie te la puede quitar de las manos.',
    temas: [],
    aptaParaPortada: true,
  }),
  'citas/seneca--c.md': citaValida({
    slug: LARGA,
    texto: frase(MAX_CARACTERES_IMAGEN + 40),
    temas: [],
    aptaParaPortada: true,
  }),
};

/**
 * Las cuatro jornadas que la página tiene que saber distinguir, en un solo fichero.
 *
 * `MUDA` apunta a un slug que **no es ninguna Cita apta**: es el modo silencioso que la
 * página existe para hacer visible. `PASADA` está vencida y no debe aparecer.
 */
const CON_FIJACIONES = {
  ...CORPUS_BASE,
  'portada.json': `${JSON.stringify(
    {
      _comentario: 'Fijaciones manuales de la Cita del Día.',
      fijaciones: {
        [PASADA]: APTA,
        [MANANA]: OTRA_APTA,
        [CON_LARGA]: LARGA,
        [MUDA]: RETIRADA,
        /*
         * Una clave escrita a mano que no es una jornada, dentro del fixture que ya se
         * construye. No cuesta una construcción más y comprueba el cableado que la prueba
         * pura no ve: que la página **use** de verdad el lector que descarta lo que no
         * entiende. Sin él, `'manana' >= '2026-08-19'` es cierto, la entrada llega a la
         * rotación con `Date.parse` a `NaN` y muere el build entero, no solo `/lote`.
         */
        manana: APTA,
      },
    },
    null,
    2,
  )}\n`,
};

/** La sección de una jornada dentro del lote, desde su marca hasta la de la siguiente. */
function seccionDe(html: string, jornada: string): string {
  const desde = html.indexOf(`data-jornada="${jornada}"`);
  if (desde === -1) return '';
  const siguiente = html.indexOf('data-jornada="', desde + 1);
  return siguiente === -1 ? html.slice(desde) : html.slice(desde, siguiente);
}

/**
 * La huella del material publicable de un trozo de HTML.
 *
 * Compara **todo lo que Héctor se lleva**, no solo el enlace: el texto y su tramo, los datos
 * con los que se dibuja la Imagen, la atribución exacta que va al portapapeles y los enlaces
 * marcados por cuenta. Con un solo `data-enlace-cita` la comparación pasaba con dos vistas
 * que compusieran atribuciones distintas, que es justo el defecto que se quiere impedir.
 */
function huella(html: string) {
  const todos = (patron: RegExp) => [...html.matchAll(patron)].map((m) => m[1]).sort();
  return {
    citas: todos(/<a href="\/cita\/([^"/]+)\/"[^>]*data-enlace-cita/g),
    tramos: todos(/data-tramo="([^"]*)"/g),
    textos: todos(/data-texto="([^"]*)"/g),
    autores: todos(/data-autor="([^"]*)"/g),
    procedencias: todos(/data-procedencia="([^"]*)"/g),
    tamanos: todos(/data-tamano="([^"]*)"/g),
    marcas: todos(/data-marca="([^"]*)"/g),
    atribuciones: todos(/data-carga="([^"]*)"/g),
    redes: todos(/<a href="([^"]+)" data-red=/g),
    sinImagen: /data-sin-imagen/.test(html),
    conAlternativa: /data-alternativa/.test(html),
  };
}

describe('Historia 13.1 — lo compuesto por adelantado es lo que sale el día que llega', () => {
  const aLimpiar: string[] = [];
  let lote = '';
  let kitDeManana = '';

  beforeAll(async () => {
    const hoy = await construirConCorpus(CON_FIJACIONES, { jornada: JORNADA });
    aLimpiar.push(hoy.proyecto);
    expect(hoy.codigo, hoy.salida).toBe(0);

    const manana = await construirConCorpus(CON_FIJACIONES, { jornada: MANANA });
    aLimpiar.push(manana.proyecto);
    expect(manana.codigo, manana.salida).toBe(0);

    lote = await readFile(paginaConstruida(hoy.proyecto, '/lote/'), 'utf8');
    kitDeManana = await readFile(paginaConstruida(manana.proyecto, '/kit/'), 'utf8');
  });

  afterAll(async () => {
    await Promise.all(aLimpiar.splice(0).map(limpiar));
  });

  it('el material de mañana en el lote de hoy y el Kit de mañana son el mismo, entero', () => {
    /*
     * El criterio de aceptación por el camino más largo que existe: dos construcciones, dos
     * jornadas, dos superficies. Coinciden porque las dos derivan de la misma fijación de
     * `corpus/portada.json` y componen con el mismo `materialDelKit` y el mismo componente.
     * Si el lote tuviera un calendario propio, o una vista propia, aquí es donde se vería.
     */
    const delLote = huella(seccionDe(lote, MANANA));
    const delKit = huella(kitDeManana);

    expect(delLote.citas).toEqual([OTRA_APTA]);
    expect(delLote).toEqual(delKit);
  });

  it('y la comparación mira de verdad la atribución y la Imagen, no solo el enlace', () => {
    // Sin esto, la aserción de arriba podría estar comparando dos conjuntos vacíos.
    const delKit = huella(kitDeManana);
    expect(delKit.atribuciones).toHaveLength(1);
    expect(delKit.atribuciones[0]).toContain('Séneca');
    expect(delKit.textos).toHaveLength(1);
    expect(delKit.tamanos).toHaveLength(1);
    expect(delKit.redes.length).toBeGreaterThan(3);
  });

  it('una clave que no es una jornada no tumba el build ni compone nada', () => {
    // Que la construcción de `beforeAll` haya salido con 0 teniendo `manana:` dentro **es**
    // la mitad de esta prueba; la otra es que esa clave no produjo ninguna sección.
    expect(lote).not.toContain('data-jornada="manana"');
    expect(lote).toContain(`data-jornada="${MANANA}"`);
  });

  it('compone una sección por jornada fijada por delante, y ninguna de las pasadas', () => {
    for (const jornada of [MANANA, CON_LARGA, MUDA]) {
      expect(lote, jornada).toContain(`data-jornada="${jornada}"`);
    }
    expect(lote).not.toContain(`data-jornada="${PASADA}"`);
  });

  it('la jornada de una Cita larga trae el aviso y la alternativa, como en el Kit', () => {
    const seccion = seccionDe(lote, CON_LARGA);
    expect(seccion).toContain('data-sin-imagen');
    expect(seccion).toMatch(/pasa del límite de longitud/);
    expect(seccion).toContain('data-alternativa');
    // Y la del Día sigue siendo la del Día: la alternativa se ofrece **además**.
    expect(huella(seccion).citas).toContain(LARGA);
  });

  it('la jornada cuya Cita ya no es apta lo dice, y nombra el slug fijado', () => {
    /*
     * La funcionalidad que separa esta página de un listado: `citaDelDia` ignora una
     * fijación cuya Cita no está entre las aptas y rota, para no dejar la portada muda. Es
     * lo correcto y lo más silencioso que hay, y aquí se ve mientras aún se puede arreglar.
     */
    const seccion = seccionDe(lote, MUDA);
    expect(seccion).toContain('data-fijacion-ignorada');
    expect(seccion).toContain(RETIRADA);
    expect(seccion).toMatch(/no saldrá como está fijada/);
  });

  it('y enseña debajo lo que saldría de verdad, en vez de dejar el hueco vacío', () => {
    const seccion = seccionDe(lote, MUDA);
    const citas = huella(seccion).citas;
    // Material completo, y de una Cita real: la de la rotación, que nunca puede ser la
    // fijada —por eso la fijación estaba muda—. Si la del Día que rota no cabe en una
    // Imagen, la sección trae además su alternativa, igual que en el Kit.
    expect(citas.length).toBeGreaterThan(0);
    expect(citas).not.toContain(RETIRADA);
    expect(huella(seccion).atribuciones.length).toBe(citas.length);
  });

  it('las jornadas que sí se honran **no** llevan el aviso', () => {
    /*
     * La otra mitad, y la que hace que la prueba valga: invertir el guardián de la página
     * —avisar cuando la fijación sí se honra— tiene que poner algo en rojo. Con solo la
     * comprobación de arriba, una página que avisara siempre pasaría igual.
     */
    for (const jornada of [MANANA, CON_LARGA]) {
      expect(seccionDe(lote, jornada), jornada).not.toContain('data-fijacion-ignorada');
    }
    // Y que el aviso aparezca exactamente una vez en toda la página: ni cero, ni en todas.
    expect([...lote.matchAll(/data-fijacion-ignorada/g)]).toHaveLength(1);
  });

  it('y las jornadas que sí caben en una Imagen no traen ni aviso ni alternativa', () => {
    // El otro lado de la rama: sin esto, una página que siempre pintara las dos cosas
    // pasaría la comprobación de arriba.
    const seccion = seccionDe(lote, MANANA);
    expect(seccion).not.toContain('data-sin-imagen');
    expect(seccion).not.toContain('data-alternativa');
  });
});

describe('Historia 13.1 — sin ninguna jornada fijada, que es el estado de hoy', () => {
  let proyecto = '';

  beforeAll(async () => {
    /*
     * Y sin la clave `fijaciones` siquiera, que es una forma que la propia orden acepta al
     * escribir sobre un fichero que no la traía. `Object.entries(undefined)` habría tumbado
     * el build por una clave ausente, y esta es la única página que enumera el fichero. El
     * estado que se enseña es el mismo que con `fijaciones: {}`, que es lo que hay hoy en
     * `corpus/portada.json`: para el sitio, ausente y vacío son lo mismo.
     */
    const resultado = await construirConCorpus(
      { ...CORPUS_BASE, 'portada.json': `${JSON.stringify({ _comentario: 'sin la clave' }, null, 2)}\n` },
      { jornada: JORNADA },
    );
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  });

  afterAll(async () => {
    if (proyecto) await limpiar(proyecto);
  });

  it('el sitio construye igual y la superficie existe', () => {
    expect(existsSync(paginaConstruida(proyecto, '/lote/'))).toBe(true);
  });

  it('lo dice, y dice antes qué significa que no haya nada preparado', async () => {
    const html = await readFile(paginaConstruida(proyecto, '/lote/'), 'utf8');
    expect(html).toMatch(/No hay ninguna jornada preparada/);
    // Lo primero es que el sitio sigue publicando: quien abre esto en el móvil necesita
    // saber eso antes que ninguna orden de terminal.
    expect(html).toMatch(/sale la Cita del Día que le toca por rotación/);
    expect(html).not.toContain('data-jornada=');
  });

  it('y remite al Kit, que es donde sí hay algo que publicar hoy', async () => {
    // La superficie existe para no exigir terminal ni repositorio: un estado vacío cuya
    // única salida fuera una orden de consola contradiría eso justo cuando más se nota.
    const html = await readFile(paginaConstruida(proyecto, '/lote/'), 'utf8');
    expect(html).toContain('data-enlace-kit');
    expect(html).toContain('href="/kit/"');
  });
});
