import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  LADO,
  MARGEN,
  MINIMO_DE_CITAS,
  cabenEnPieza,
  desbordanALoAncho,
  palabrasDelTituloQueDesbordan,
  svgDePieza,
  type CitaEnPieza,
} from '../../src/lib/pieza.ts';
import { SERIF } from '../../src/lib/lienzo.ts';
import { MARCA } from '../../src/lib/marca.ts';
import { tramoDe } from '../../src/lib/tramos.ts';
import { MAX_CARACTERES_IMAGEN } from '../../src/lib/umbrales.ts';

const raiz = resolve(import.meta.dirname, '../..');

/**
 * Historia 13.2 — la Pieza de Canal que reúne varias Citas, sobre lo puro.
 *
 * Lo que se mide aquí es el SVG: que el lienzo sea el que la historia decidió, que **el
 * texto de cada Cita vaya entero**, que cada una lleve su Autor, y que los cuerpos salgan de
 * `tramos.ts` y no de números escritos en la plantilla. Lo que se mide ejecutando la orden
 * está en `pieza-cli.test.ts`.
 */

const BREVE: CitaEnPieza = {
  texto: 'La vida, si sabes usarla, es larga.',
  autor: 'Séneca',
  procedencia: 'Sobre la brevedad de la vida, 49',
};

const MEDIANA: CitaEnPieza = {
  texto:
    'La libertad, Sancho, es uno de los más preciosos dones que a los hombres dieron los ' +
    'cielos; con ella no pueden igualarse los tesoros que encierra la tierra.',
  autor: 'Miguel de Cervantes',
  procedencia: 'Don Quijote de la Mancha, 1615',
};

const SIN_PROCEDENCIA: CitaEnPieza = {
  texto: 'Nada hay más parecido a un hombre que otro hombre.',
  autor: 'Sor Juana Inés de la Cruz',
};

/** Una frase de la longitud pedida, en palabras de verdad para poder buscarlas. */
function frase(caracteres: number): string {
  const base =
    'La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para ' +
    'contarla, y por eso quien escribe su memoria escribe también su olvido. ';
  return base.repeat(Math.ceil(caracteres / base.length)).slice(0, caracteres).trim();
}

/** Todo lo que la Pieza escribe como texto, recompuesto en una sola cadena. */
function textoDelSvg(svg: string): string {
  return [...svg.matchAll(/>([^<]*)<\/text>/g)].map((m) => m[1]).join(' ');
}

describe('Historia 13.2 — el lienzo de la Pieza', () => {
  const svg = svgDePieza([BREVE, MEDIANA]);

  it('es cuadrado de 1080, el mismo de la Imagen de Cita', () => {
    // No es un formato inventado: es la proporción con la que este producto ya publica en
    // una cuenta propia. Elegir un vertical nuevo sería una decisión de producto.
    expect(LADO).toBe(1080);
    expect(MARGEN).toBe(96);
    expect(svg).toContain('width="1080" height="1080"');
    expect(svg).toContain('viewBox="0 0 1080 1080"');
  });

  it('lleva la marca, la misma que la Imagen y la Tarjeta', () => {
    expect(svg).toContain(MARCA.toLocaleUpperCase('es'));
  });
});

describe('Historia 13.2 — el texto de cada Cita va entero', () => {
  const citas = [BREVE, MEDIANA, SIN_PROCEDENCIA];
  const svg = svgDePieza(citas);
  const escrito = textoDelSvg(svg);

  it('no falta ni una palabra de ninguna de las Citas', () => {
    /*
     * Es el criterio que atraviesa la historia. Una Pieza que recorta publica una cita mal
     * atribuida, y NFR-12 prohíbe que el sistema altere lo que el editor guardó. Se
     * recomponen todos los `<text>` y se exige cada palabra: si la plantilla partiera una
     * línea por la mitad, la palabra partida no aparecería.
     */
    for (const cita of citas) {
      for (const palabra of cita.texto.split(/\s+/)) {
        expect(escrito, `falta «${palabra}»`).toContain(palabra);
      }
    }
  });

  it('no abrevia con puntos suspensivos de ninguna de las dos formas', () => {
    expect(svg).not.toContain('…');
    expect(svg).not.toContain('...');
  });

  it('cada Cita lleva su Autor, una sola vez y en versalitas', () => {
    for (const cita of citas) {
      const enVersalitas = cita.autor.toLocaleUpperCase('es');
      const veces = escrito.split(enVersalitas).length - 1;
      expect(veces, `«${cita.autor}» aparece ${veces} veces`).toBe(1);
    }
  });

  it('ninguna Cita aparece sin Autor: hay tantos filetes de atribución como Citas', () => {
    expect([...svg.matchAll(/<rect x="96" y="\d+" width="96"/g)]).toHaveLength(citas.length);
  });

  it('la procedencia se escribe cuando consta y no deja «undefined» cuando no', () => {
    expect(escrito).toContain('Sobre la brevedad de la vida, 49');
    expect(svg).not.toContain('undefined');
  });
});

describe('Historia 13.2 — los cuerpos salen de la tabla de tramos', () => {
  it('cada Cita se compone con el «pixelesEnPieza» de su tramo', () => {
    const svg = svgDePieza([BREVE, MEDIANA]);
    for (const cita of [BREVE, MEDIANA]) {
      expect(svg).toContain(`font-size="${tramoDe(cita.texto).pixelesEnPieza}"`);
    }
  });

  it('dos Citas de tramos distintos se componen con cuerpos distintos', () => {
    expect(tramoDe(BREVE.texto).nombre).not.toBe(tramoDe(MEDIANA.texto).nombre);
    expect(tramoDe(BREVE.texto).pixelesEnPieza).not.toBe(tramoDe(MEDIANA.texto).pixelesEnPieza);
  });

  it('el módulo no lleva ninguna tabla de tamaños propia', () => {
    /*
     * AD-8. Si la llevara, la Pieza podría bajar el cuerpo para que algo quepa, y entonces
     * «no cabe» dejaría de ser una respuesta: NFR-12 se negociaría sola, sin que ningún
     * criterio lo autorizara.
     */
    const fuente = readFileSync(resolve(raiz, 'src/lib/pieza.ts'), 'utf8');
    expect(fuente).toContain("from './tramos.ts'");
    expect(fuente).not.toMatch(/hasta:\s*\d+/);
  });
});

describe('Historia 13.2 — el SVG no se rompe con el texto de una Cita', () => {
  it('escapa lo que rompería el marcado', () => {
    const svg = svgDePieza([
      { texto: 'Más vale <esto> & aquello que "lo otro".', autor: 'Anónimo & Cía.' },
      BREVE,
    ]);
    expect(svg).toContain('&lt;esto&gt;');
    expect(svg).toContain('&amp;');
    expect(svg).toContain('&quot;');
    expect(svg).not.toMatch(/<esto>/);
  });
});

describe('Historia 13.2 — lo que no cabe no se encoge', () => {
  it('dos Citas breves caben de sobra', () => {
    expect(cabenEnPieza([BREVE, SIN_PROCEDENCIA])).toEqual({ cabe: true });
  });

  it('un apilado que se pasa no cabe, y dice cuántas de las pedidas entran', () => {
    const larga = (i: number): CitaEnPieza => ({
      texto: `${i}. ${frase(MAX_CARACTERES_IMAGEN - 4)}`,
      autor: `Autor ${i}`,
    });
    const cabida = cabenEnPieza([1, 2, 3, 4, 5, 6].map(larga));
    expect(cabida.cabe).toBe(false);
    if (cabida.cabe) return;
    expect(cabida.maximo).toBeGreaterThan(0);
    expect(cabida.maximo).toBeLessThan(6);
    // Y lo que dice que cabe, cabe de verdad: no es una cuenta aparte de la del apilado.
    expect(cabenEnPieza([1, 2, 3, 4, 5, 6].slice(0, cabida.maximo).map(larga))).toEqual({
      cabe: true,
    });
  });

  it('componer lo que no cabe lanza en vez de recortar', () => {
    const larga = (i: number): CitaEnPieza => ({
      texto: `${i}. ${frase(MAX_CARACTERES_IMAGEN - 4)}`,
      autor: `Autor ${i}`,
    });
    expect(() => svgDePieza([1, 2, 3, 4, 5, 6].map(larga))).toThrow(/no caben/);
  });

  it('una Cita que no admite Imagen no entra, ni siquiera compuesta a la fuerza', () => {
    const pasada = { texto: frase(MAX_CARACTERES_IMAGEN + 40), autor: 'Séneca' };
    expect(tramoDe(pasada.texto).admiteImagen).toBe(false);
    expect(() => svgDePieza([pasada, BREVE])).toThrow(/FR-10/);
  });
});

describe('Historia 13.2 — la marca del pie tiene su sitio reservado', () => {
  it('no se pisa con la última atribución ni en la Pieza más llena', () => {
    /*
     * El apilado ocupa el alto útil menos la banda de la marca, y sin esa banda el defecto
     * solo aparece en la Pieza **más llena**: la última procedencia queda a diez píxeles de
     * la marca y las dos líneas se solapan. Es exactamente la que nadie compone mientras
     * prueba, así que se comprueba aquí llenándola hasta el tope que la propia función dice.
     */
    const larga = (i: number): CitaEnPieza => ({
      texto: `${i}. ${frase(MAX_CARACTERES_IMAGEN - 8)}`,
      autor: `Autor número ${i}`,
      procedencia: 'Una obra cualquiera, 1912',
    });
    const todas = [1, 2, 3, 4, 5, 6].map(larga);
    const cabida = cabenEnPieza(todas);
    expect(cabida.cabe).toBe(false);
    if (cabida.cabe) return;

    const svg = svgDePieza(todas.slice(0, cabida.maximo));

    /*
     * La marca se identifica por su **contenido**, no por ser la `y` mayor. Deducirla con
     * `Math.max` haría que la prueba se autoengañara justo en el fallo que vigila: si el
     * apilado se desbordara por debajo de la marca, la mayor pasaría a ser la última
     * procedencia y la comparación seguiría saliendo verde.
     */
    const textos = [...svg.matchAll(/<text[^>]*y="(\d+)"[^>]*>([^<]*)<\/text>/g)].map((m) => ({
      y: Number(m[1]),
      contenido: m[2],
    }));
    const marca = textos.find((t) => t.contenido === MARCA.toLocaleUpperCase('es'))!;
    expect(marca).toBeDefined();
    const ultimaAtribucion = Math.max(...textos.filter((t) => t !== marca).map((t) => t.y));
    expect(marca.y - ultimaAtribucion).toBeGreaterThanOrEqual(24);
  });
});

describe('Historia 13.2 — una Cita sola no es una Pieza', () => {
  it('el mínimo lo aplica el módulo puro, no solo la orden', () => {
    /*
     * La guarda vive aquí por lo mismo que la de FR-10: la 13.3 es el consumidor futuro que
     * puede llamar a este módulo sin pasar por `tools/pieza.ts`, y un mínimo que solo aplica
     * el interruptor no es un mínimo.
     */
    expect(MINIMO_DE_CITAS).toBe(2);
    expect(() => svgDePieza([BREVE])).toThrow(/Imagen de Cita/);
    expect(() => cabenEnPieza([BREVE])).toThrow(/Imagen de Cita/);
    expect(() => cabenEnPieza([])).toThrow(/al menos/);
  });
});

describe('Historia 13.2 — lo que se sale por el lado tampoco se compone', () => {
  /*
   * El alto se puede apilar; el ancho no lo miraba nadie. `repartirEnLineas` no parte
   * palabras —su contrato es no perder texto—, así que una palabra indivisible más ancha que
   * el lienzo ocupa su línea y **se sale**: el rasterizado no falla, produce un PNG con la
   * palabra cortada. Es la mutilación de NFR-12 ocurriendo sin que nada avise.
   */
  const INDIVISIBLE = 'a'.repeat(120);

  it('una palabra más ancha que el lienzo se denuncia con su Cita', () => {
    const desbordadas = desbordanALoAncho([{ ...BREVE, texto: `Nada ${INDIVISIBLE}` }, MEDIANA]);
    expect(desbordadas).toHaveLength(1);
    expect(desbordadas[0].indice).toBe(0);
    // Se denuncia la palabra tal y como se compondría, con las comillas angulares que la
    // plantilla añade alrededor de la Cita: es lo que de verdad se saldría del lienzo.
    expect(desbordadas[0].palabras[0]).toContain(INDIVISIBLE);
  });

  it('el Autor y la procedencia también se miran: no van en un solo texto sin medir', () => {
    const conAutorImposible = { texto: BREVE.texto, autor: INDIVISIBLE };
    expect(desbordanALoAncho([conAutorImposible, MEDIANA])[0]?.indice).toBe(0);

    const conProcedenciaImposible = { ...BREVE, procedencia: INDIVISIBLE };
    expect(desbordanALoAncho([conProcedenciaImposible, MEDIANA])[0]?.indice).toBe(0);
  });

  it('un Autor largo de verdad se reparte en líneas en vez de salirse', () => {
    // El caso real no es una palabra imposible sino un nombre o una obra largos, y ésos sí
    // caben: se reparten, como el texto de la Cita.
    const conObraLarga = {
      texto: BREVE.texto,
      autor: 'Bernal Díaz del Castillo',
      procedencia: 'Historia verdadera de la conquista de la Nueva España, 1632',
    };
    expect(desbordanALoAncho([conObraLarga, MEDIANA])).toEqual([]);
    const escrito = textoDelSvg(svgDePieza([conObraLarga, MEDIANA]));
    for (const palabra of conObraLarga.procedencia.split(' ')) {
      expect(escrito, `falta «${palabra}»`).toContain(palabra);
    }
  });

  it('nada que se salga se compone: se lanza en vez de publicar una palabra cortada', () => {
    expect(() => svgDePieza([{ ...BREVE, texto: `Nada ${INDIVISIBLE}` }, MEDIANA])).toThrow(
      /no cabe a lo ancho/,
    );
  });
});

describe('Historia 13.2 — la misma selección compone lo mismo', () => {
  it('dos composiciones seguidas dan la misma cadena', () => {
    expect(svgDePieza([BREVE, MEDIANA, SIN_PROCEDENCIA])).toBe(
      svgDePieza([BREVE, MEDIANA, SIN_PROCEDENCIA]),
    );
  });
});

describe('Historia 13.3 — la Pieza que anuncia una Colección lleva su nombre', () => {
  const TITULO = 'Frases cortas para reflexionar';
  /** Un nombre que **de verdad** se reparte en más de una línea a 30px sobre 888px útiles. */
  const TITULO_LARGO =
    'Frases cortas para reflexionar sobre el paso del tiempo y la brevedad de la vida';

  /**
   * Las `y` de las líneas del título, identificadas por su tratamiento y no por su posición.
   *
   * `font-size="30" font-weight="600"` es solo del título: el cuerpo de una Cita nunca lleva
   * peso, y así la prueba no confunde el título con una Cita del tramo `md`, que también
   * compone a 30px.
   */
  function basesDelTitulo(svg: string): number[] {
    return [
      ...svg.matchAll(/<text[^>]*y="(\d+)"[^>]*font-size="30" font-weight="600"/g),
    ].map((m) => Number(m[1]));
  }

  /** El `<text>` que compone un contenido dado, con sus atributos. */
  function elementoDe(svg: string, contenido: string): string {
    const encontrado = new RegExp(`<text([^>]*)>${contenido}</text>`).exec(svg);
    expect(encontrado, `no hay ningún <text> con «${contenido}»`).not.toBeNull();
    return encontrado![1];
  }

  it('el título se compone con el tratamiento que DESIGN.md le da al Nombre de Colección', () => {
    /*
     * `headline-md` de
     * `_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md`:
     * Source Serif, peso 600, 30px. La presentación no se inventa en la
     * plantilla —el nombre de una Colección ya tiene tratamiento asignado— y va en la serif
     * y no en la sans porque es un nombre, no voz del sistema atribuyendo.
     */
    const svg = svgDePieza([BREVE, SIN_PROCEDENCIA], { titulo: TITULO });
    const atributos = elementoDe(svg, TITULO);
    expect(atributos).toContain(`font-family="${SERIF}"`);
    expect(atributos).toContain('font-size="30"');
    expect(atributos).toContain('font-weight="600"');
  });

  it('el título encabeza el apilado y **no se pisa** con la primera Cita', () => {
    /*
     * Que `y(titulo) < y(cita)` no prueba nada: el cuerpo de una Cita corta (44px) es mayor
     * que el del título (30px), así que la desigualdad se sigue cumpliendo con el nombre
     * impreso **encima** de la primera línea de la Cita. Comentar `cursor += titulo.alto` deja
     * el título en y=331 y la Cita en y=345, y con la aserción antigua las 86 pruebas de la
     * Pieza seguían en verde. Lo que hay que afirmar es la separación real entre la última
     * línea del título y la primera de la Cita, medida como la mide el ojo: entre la base de
     * una y la base de la otra tiene que caber al menos el cuerpo de la Cita.
     */
    const svg = svgDePieza([BREVE, SIN_PROCEDENCIA], { titulo: TITULO });
    const y = (contenido: string) => Number(/y="(\d+)"/.exec(elementoDe(svg, contenido))![1]);

    const separacion = y(`«${BREVE.texto}»`) - y(TITULO);
    expect(separacion).toBeGreaterThan(tramoDe(BREVE.texto).pixelesEnPieza);
    // Y con la separación que el lienzo reserva: no es que «no se toquen por poco».
    expect(separacion).toBeGreaterThanOrEqual(48);
  });

  it('un título de dos líneas tampoco se pisa con la primera Cita', () => {
    // La misma medida sobre la **última** línea del título, que es la que se acerca.
    const svg = svgDePieza([BREVE, SIN_PROCEDENCIA], { titulo: TITULO_LARGO });
    const delTitulo = basesDelTitulo(svg);
    expect(delTitulo.length, 'este título debería repartirse en varias líneas').toBeGreaterThan(1);

    const y = (contenido: string) => Number(/y="(\d+)"/.exec(elementoDe(svg, contenido))![1]);
    expect(y(`«${BREVE.texto}»`) - Math.max(...delTitulo)).toBeGreaterThanOrEqual(48);
  });

  it('un título que se reparte se compone **entero**: no falta ni una palabra', () => {
    /*
     * La mutilación que el módulo se niega a hacerle al texto de una Cita, hecha con el nombre
     * de la Colección. Un revisor cambió el bucle a `titulo.lineas.slice(0, 1)` y las 57
     * pruebas de la historia pasaron, porque todos los títulos de prueba cabían en una línea:
     * el nombre se habría publicado a medias, con el hueco de la línea perdida reservado
     * detrás. `palabrasDelTituloQueDesbordan` no lo ve — ninguna palabra se sale por el lado.
     */
    const svg = svgDePieza([BREVE, SIN_PROCEDENCIA], { titulo: TITULO_LARGO });
    const escrito = textoDelSvg(svg);
    for (const palabra of TITULO_LARGO.split(' ')) {
      expect(escrito, `falta «${palabra}» del nombre de la Colección`).toContain(palabra);
    }
    // Y las líneas del título no se solapan entre sí.
    const delTitulo = basesDelTitulo(svg);
    expect(delTitulo.length).toBeGreaterThan(1);
    for (let i = 1; i < delTitulo.length; i += 1) {
      expect(delTitulo[i] - delTitulo[i - 1]).toBeGreaterThanOrEqual(30);
    }
  });

  it('los espacios sobrantes del YAML no cambian el PNG de la misma Colección', () => {
    // «byte a byte» es una promesa del módulo, y un nombre entrecomillado con un espacio de
    // más la rompía: el sobrante entra en la primera línea y desplaza el reparto entero.
    expect(svgDePieza([BREVE, SIN_PROCEDENCIA], { titulo: `  ${TITULO}  ` })).toBe(
      svgDePieza([BREVE, SIN_PROCEDENCIA], { titulo: TITULO }),
    );
  });

  it('sin título el lienzo no cambia: la Pieza de la 13.2 se compone igual', () => {
    expect(svgDePieza([BREVE, SIN_PROCEDENCIA], {})).toBe(svgDePieza([BREVE, SIN_PROCEDENCIA]));
  });

  it('el título se escapa como el resto: no puede romper el marcado', () => {
    const svg = svgDePieza([BREVE, SIN_PROCEDENCIA], { titulo: 'Ciencia & <arte>' });
    expect(svg).toContain('Ciencia &amp; &lt;arte&gt;');
    expect(svg).not.toMatch(/<arte>/);
  });

  it('un título en blanco no es un título: se lanza en vez de reservarle sitio', () => {
    expect(() => svgDePieza([BREVE, SIN_PROCEDENCIA], { titulo: '   ' })).toThrow(/en blanco/);
    expect(() => cabenEnPieza([BREVE, SIN_PROCEDENCIA], { titulo: '' })).toThrow(/en blanco/);
  });

  it('un título más ancho que el lienzo se denuncia, y la cabida tampoco dice que sí', () => {
    const imposible = `Colección ${'a'.repeat(120)}`;
    expect(palabrasDelTituloQueDesbordan(imposible)).toHaveLength(1);
    expect(palabrasDelTituloQueDesbordan(TITULO_LARGO)).toEqual([]);
    expect(() => svgDePieza([BREVE, SIN_PROCEDENCIA], { titulo: imposible })).toThrow(
      /no cabe a lo ancho/,
    );
    /*
     * Y la mitad que faltaba: mientras la comprobación vivió solo en `svgDePieza`, preguntar
     * la cabida de esta selección respondía `cabe: true`, así que quien se fiaba de la
     * respuesta recibía una excepción al componer en vez de un rechazo redactado.
     */
    expect(() => cabenEnPieza([BREVE, SIN_PROCEDENCIA], { titulo: imposible })).toThrow(
      /no cabe a lo ancho/,
    );
  });
});

describe('Historia 13.3 — el título entra en la cuenta del apilado', () => {
  const media = (i: number): CitaEnPieza => ({
    texto: `${i}. ${frase(198)}`,
    autor: `Autor número ${i}`,
    procedencia: 'Una obra cualquiera, 1912',
  });

  it('lo que cabía sin título puede no caber con él', () => {
    /*
     * El defecto que esto vigila no es teórico: es el mismo que la banda de la marca arregló
     * en la 13.2. Si el alto del título y su separación no se restaran del alto útil, la
     * cabida diría que caben las mismas de siempre y la última Cita saldría empujada contra
     * la marca del pie — y solo en la Pieza más llena, que es la que nadie compone probando.
     */
    const muchas = [1, 2, 3, 4, 5, 6].map(media);
    const sinTitulo = cabenEnPieza(muchas);
    expect(sinTitulo.cabe).toBe(false);
    if (sinTitulo.cabe) return;

    const justas = muchas.slice(0, sinTitulo.maximo);
    expect(cabenEnPieza(justas)).toEqual({ cabe: true });
    expect(cabenEnPieza(justas, { titulo: frase(300) }).cabe).toBe(false);
  });

  it('lo que la cabida dice que cabe con título, cabe con título', () => {
    const muchas = [1, 2, 3, 4, 5, 6].map(media);
    const cabida = cabenEnPieza(muchas, { titulo: frase(300) });
    expect(cabida.cabe).toBe(false);
    if (cabida.cabe) return;
    expect(cabida.maximo).toBeGreaterThanOrEqual(MINIMO_DE_CITAS);
    expect(cabenEnPieza(muchas.slice(0, cabida.maximo), { titulo: frase(300) })).toEqual({
      cabe: true,
    });
  });

  it('con título, la Pieza más llena sigue sin pisar la marca del pie', () => {
    const titulo = 'Frases cortas para reflexionar';
    const muchas = [1, 2, 3, 4, 5, 6].map(media);
    const cabida = cabenEnPieza(muchas, { titulo });
    expect(cabida.cabe).toBe(false);
    if (cabida.cabe) return;

    const svg = svgDePieza(muchas.slice(0, cabida.maximo), { titulo });
    const textos = [...svg.matchAll(/<text[^>]*y="(\d+)"[^>]*>([^<]*)<\/text>/g)].map((m) => ({
      y: Number(m[1]),
      contenido: m[2],
    }));
    const marca = textos.find((t) => t.contenido === MARCA.toLocaleUpperCase('es'))!;
    expect(marca).toBeDefined();
    const ultima = Math.max(...textos.filter((t) => t !== marca).map((t) => t.y));
    expect(marca.y - ultima).toBeGreaterThanOrEqual(24);
    // Y por arriba tampoco se sale: el título es lo primero y está dentro del margen.
    expect(Math.min(...textos.map((t) => t.y))).toBeGreaterThanOrEqual(MARGEN);
  });
});
