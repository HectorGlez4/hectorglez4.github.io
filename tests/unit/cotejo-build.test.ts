import { afterAll, describe, expect, it } from 'vitest';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
} from './ayuda/construir.js';
import { componerDocumento } from '../../tools/lib/documento.ts';
import { CENSO_DE_PARTIDA, FICHERO_DEL_CENSO } from '../../tools/lib/cotejo.ts';

/**
 * Historia 11.2 — la puerta, puesta de verdad.
 *
 * `cotejo.test.ts` prueba el criterio sin construir. Esto construye: invoca `astro build`
 * sobre un corpus de prueba y exige que **rompa**, con el patrón de
 * `puerta-de-admision.test.ts`. Es la única forma de comprobar lo que la historia
 * promete, que es que ningún camino de publicación esquive el cotejo.
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

/*
 * El texto y el slug son los de una de las 38 Citas anteriores a la v3, tal cual.
 *
 * No es decorativo: el censo de partida de `tools/lib/cotejo.ts` es un conjunto cerrado
 * con la huella del texto de cada una, y el build usa ese conjunto de verdad. Una Cita
 * inventada no se puede censar, que es justamente lo que estas pruebas comprueban.
 */
const TEXTO = 'No es que tengamos poco tiempo, es que perdemos mucho.';
const SLUG = 'seneca-no-es-que-tengamos-poco-tiempo-es';
const FICHERO_DE_LA_CITA = 'citas/seneca--no-es-que-tengamos-poco-tiempo-es.md';

/** Otra de las 38, que estas pruebas usan como entrada rancia del censo. */
const OTRA_CENSADA = 'teresa-de-jesus-la-paciencia-todo-lo-alcanza';
const NOMBRE_DEL_DOCUMENTO = 'fuentes/wikisource-es--sobre-la-brevedad-de-la-vida.txt';

const FUENTE = {
  id: 'wikisource-es',
  nombre: 'Wikisource en español',
  licencia: 'CC BY-SA 4.0',
  url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
};

/** Un documento como el que deja `tools/recuperar.ts`: cabecera, declaración y cuerpo. */
function documento(cuerpo: string): string {
  return componerDocumento(
    {
      fuente: 'wikisource-es',
      obra: OBRA,
      año: 49,
      url: FUENTE.url,
      recuperado: '2026-08-19',
    },
    [OBRA, 'Año de publicación: 49'].join('\n'),
    cuerpo,
  );
}

/*
 * El cuerpo reparte los saltos de línea donde le conviene, y a propósito: es lo que hace
 * una edición digital de verdad, y el cotejo tiene que localizar la Cita igual.
 */
const CUERPO_CON_LA_CITA = `De la brevedad de la vida

No es que tengamos poco
tiempo, es que perdemos    mucho.

La vida es larga si sabes usarla.
`;

const CORPUS_BASE = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  // Censo vacío: en estas pruebas nada está exento salvo donde se diga.
  [FICHERO_DEL_CENSO]: 'citas: []\n',
};

/** La Cita sembrada: texto, obra y Fuente, como la deja la aprobación de la 9.2. */
function citaSembrada(campos: Record<string, unknown> = {}): string {
  return citaValida({
    texto: TEXTO,
    slug: SLUG,
    procedencia: { obra: OBRA, año: 49 },
    fuente: FUENTE,
    ...campos,
  });
}

describe('Historia 11.2 — el cotejo corre en el build y rompe la construcción', () => {
  it('una Cita cuyo texto está en el cuerpo de su documento construye', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [FICHERO_DE_LA_CITA]: citaSembrada(),
      [NOMBRE_DEL_DOCUMENTO]: documento(CUERPO_CON_LA_CITA),
    });
    expect(salida).not.toMatch(/Regla incumplida/);
    expect(codigo).toBe(0);
    // Y la deuda se cuenta, aunque sea cero.
    expect(salida).toMatch(/pendientes de cotejo/);
  });

  it('una Cita cuyo texto no está en su documento rompe el build con ruta y regla', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [FICHERO_DE_LA_CITA]: citaSembrada(),
      [NOMBRE_DEL_DOCUMENTO]: documento('La vida es larga si sabes usarla.\n'),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('seneca--no-es-que-tengamos-poco-tiempo-es.md');
    expect(salida).toMatch(/Regla incumplida/);
    expect(salida).toContain('wikisource-es--sobre-la-brevedad-de-la-vida.txt');
  });

  it('una diferencia de un acento rompe el build', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [FICHERO_DE_LA_CITA]: citaSembrada(),
      // «tenemos» por «tengamos» no; un acento sí: la edición dice «que» y la Cita «qué».
      [NOMBRE_DEL_DOCUMENTO]: documento(
        'No es qué tengamos poco tiempo, es que perdemos mucho.\n',
      ),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/no aparece literalmente/);
  });

  it('una coma de más rompe el build', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [FICHERO_DE_LA_CITA]: citaSembrada(),
      [NOMBRE_DEL_DOCUMENTO]: documento(
        'No es que tengamos poco tiempo, es que, perdemos mucho.\n',
      ),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/no aparece literalmente/);
  });

  it('solo difieren espacios y saltos: el build pasa', async () => {
    // Ya lo cubre la primera prueba, pero explícito: el espaciado no puede decidir.
    const { codigo } = await construir({
      ...CORPUS_BASE,
      [FICHERO_DE_LA_CITA]: citaSembrada(),
      [NOMBRE_DEL_DOCUMENTO]: documento(
        'No es\n\tque tengamos   poco tiempo,\nes que perdemos mucho.\n',
      ),
    });
    expect(codigo).toBe(0);
  });

  it('el documento que la Cita nombra no está: rompe el build diciendo cuál falta', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [FICHERO_DE_LA_CITA]: citaSembrada(),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('corpus/fuentes/wikisource-es--sobre-la-brevedad-de-la-vida.txt');
    expect(salida).toMatch(/recuperar\.ts/);
  });

  it('una Cita nueva sin Fuente y fuera del censo rompe el build pidiendo recuperarla', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [FICHERO_DE_LA_CITA]: citaSembrada({ fuente: undefined }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('seneca--no-es-que-tengamos-poco-tiempo-es.md');
    expect(salida).toMatch(/recuperar\.ts/);
    expect(salida).toMatch(/no admite altas/);
  });

  it('una Cita anterior a la v3, en el censo, construye y se cuenta como deuda', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [FICHERO_DEL_CENSO]: `citas:\n  - ${SLUG}\n`,
      [FICHERO_DE_LA_CITA]: citaSembrada({ fuente: undefined }),
    });
    expect(codigo).toBe(0);
    expect(salida).toMatch(/1 pendiente de cotejo/);
  });

  it('un slug del censo que ya no existe entre las Citas rompe el build', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [FICHERO_DEL_CENSO]: `citas:\n  - ${SLUG}\n  - ${OTRA_CENSADA}\n`,
      [FICHERO_DE_LA_CITA]: citaSembrada({ fuente: undefined }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain(OTRA_CENSADA);
    expect(salida).toMatch(/solo mengua/);
    expect(salida).toContain(FICHERO_DEL_CENSO);
    // AGENTS.md prescribe retirar una Cita moviéndola a corpus/_revision/; el mensaje
    // tiene que decir que hay que quitarla también de aquí, o el gesto rompe el build.
    expect(salida).toMatch(/_revision/);
  });

  it('un slug que no es de las 38 anteriores a la v3 no se puede censar', async () => {
    /*
     * El censo se cerraba por recuento: liberada una entrada por la 11.4, quedaba un
     * hueco donde meter una Cita nueva sin que el tope se moviera. Ahora se cierra por
     * identidad contra el conjunto de `CENSO_DE_PARTIDA`.
     */
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [FICHERO_DEL_CENSO]: 'citas:\n  - seneca-frase-nueva-de-hoy\n',
      'citas/seneca--frase-nueva-de-hoy.md': citaSembrada({
        texto: 'Una frase nueva que nadie ha sembrado nunca.',
        slug: 'seneca-frase-nueva-de-hoy',
        fuente: undefined,
      }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/no es una de las Citas anteriores a la v3/);
    expect(CENSO_DE_PARTIDA['seneca-frase-nueva-de-hoy']).toBeUndefined();
  });

  it('reutilizar el slug de una censada con otro texto no hereda la exención', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [FICHERO_DEL_CENSO]: `citas:\n  - ${SLUG}\n`,
      [FICHERO_DE_LA_CITA]: citaSembrada({
        texto: 'Un texto distinto colado bajo el slug de una Cita censada.',
        fuente: undefined,
      }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/con otro texto/);
  });

  it('un censo que no es YAML válido rompe el build nombrando el fichero', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [FICHERO_DEL_CENSO]: 'citas:\n  - [sin cerrar\n',
      [FICHERO_DE_LA_CITA]: citaSembrada(),
      [NOMBRE_DEL_DOCUMENTO]: documento(CUERPO_CON_LA_CITA),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain(`corpus/${FICHERO_DEL_CENSO}`);
    expect(salida).toMatch(/no es YAML válido/);
  });

  it('un censo cuyo «citas» no es una lista rompe el build, no se lee como vacío', async () => {
    /*
     * Leerlo como censo vacío convertía una errata de sangrado en 38 fallos ajenos, y el
     * mensaje hablaba de las Citas en vez de del fichero que está mal escrito.
     */
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [FICHERO_DEL_CENSO]: `citas: ${SLUG}\n`,
      [FICHERO_DE_LA_CITA]: citaSembrada({ fuente: undefined }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain(`corpus/${FICHERO_DEL_CENSO}`);
    expect(salida).toMatch(/tiene que ser una lista/);
  });

  it('una Cita en un subdirectorio de corpus/citas/ pasa por el mismo cotejo', async () => {
    /*
     * La colección globa `**\/*.md`, así que una Cita en `corpus/citas/sub/` **se
     * publica**: su página se genera y su URL sirve. El cotejo la enumeraba con un
     * `readdir` plano y no la veía, así que bastaba una carpeta para esquivar la puerta
     * entera. Es el agujero más grande que tuvo esta historia.
     */
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/sub/seneca--colada-por-la-carpeta.md': citaSembrada({
        texto: 'Colada en una subcarpeta para esquivar el cotejo.',
        slug: 'seneca-colada-por-la-carpeta',
        fuente: undefined,
      }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('seneca--colada-por-la-carpeta.md');
    expect(salida).toMatch(/recuperar\.ts/);
  });

  it('y una Cita en un subdirectorio con su documento sí construye', async () => {
    // La recursión no es una lista negra de carpetas: enumera lo mismo que la colección.
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/sub/seneca--no-es-que-tengamos-poco-tiempo-es.md': citaSembrada(),
      [NOMBRE_DEL_DOCUMENTO]: documento(CUERPO_CON_LA_CITA),
    });
    expect(codigo, salida).toBe(0);
    expect(salida).toMatch(/1 Cita cotejada/);
  });

  it('una Cita que ya declara Fuente y sigue en el censo rompe el build', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [FICHERO_DEL_CENSO]: `citas:\n  - ${SLUG}\n`,
      [FICHERO_DE_LA_CITA]: citaSembrada(),
      [NOMBRE_DEL_DOCUMENTO]: documento(CUERPO_CON_LA_CITA),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/Quítela del censo/);
  });

  it('una Cita escrita a mano pasa por el cotejo igual que una sembrada', async () => {
    /*
     * El fichero se escribe directamente en `corpus/citas/`, sin pasar por
     * `tools/extraer.ts` ni por la aprobación de la 9.2 — que es exactamente lo que
     * `tools/alta.ts` permite hacer. La puerta está en `astro.config.mjs`, por donde
     * pasan todas las construcciones, así que no hay atajo que la esquive.
     */
    const aMano = [
      '---',
      'texto: "Frase inventada que la obra no dice en ninguna parte."',
      'autor: "seneca"',
      'temas: []',
      'slug: "seneca-frase-inventada"',
      'procedencia:',
      `  obra: ${JSON.stringify(OBRA)}`,
      '  año: 49',
      'estadoDerechos: "dominio-público"',
      'fuente:',
      `  id: ${JSON.stringify(FUENTE.id)}`,
      `  url: ${JSON.stringify(FUENTE.url)}`,
      '---',
      '',
    ].join('\n');

    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--frase-inventada.md': aMano,
      [NOMBRE_DEL_DOCUMENTO]: documento(CUERPO_CON_LA_CITA),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('seneca--frase-inventada.md');
    expect(salida).toMatch(/no aparece literalmente/);
  });

  it('el cotejo va contra el cuerpo, no contra la cabecera ni la declaración', async () => {
    // Una Cita cuyo texto coincide con una línea de la ficha no está en la obra.
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--sobre-la-brevedad-de-la-vida.md': citaSembrada({
        texto: 'Sobre la brevedad de la vida',
        slug: 'seneca-sobre-la-brevedad-de-la-vida',
      }),
      [NOMBRE_DEL_DOCUMENTO]: documento('La vida es larga si sabes usarla.\n'),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/no aparece literalmente/);
  });

  it('el campo de Fuente sobrevive al esquema: una Cita con Fuente completa construye', async () => {
    // Sin declararlo en `src/content.config.ts` el dato se perdería al leer la colección.
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [FICHERO_DE_LA_CITA]: citaSembrada(),
      [NOMBRE_DEL_DOCUMENTO]: documento(CUERPO_CON_LA_CITA),
    });
    expect(codigo).toBe(0);
    expect(salida).not.toMatch(/does not match collection schema/);
  });

  it('una Fuente sin dirección no pasa la admisión: el esquema rompe el build', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [FICHERO_DE_LA_CITA]: citaSembrada({ fuente: { id: 'wikisource-es' } }),
      [NOMBRE_DEL_DOCUMENTO]: documento(CUERPO_CON_LA_CITA),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/dirección/);
  });
});
