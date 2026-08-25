import { describe, expect, it } from 'vitest';
import { FUENTES, fuenteDe, fuenteDeUrl } from '../../tools/lib/fuentes.ts';
import { LECTORES_POR_FUENTE } from '../../tools/lib/documento.ts';
import {
  MAX_CARACTERES_CANDIDATA,
  MIN_CARACTERES_CANDIDATA,
  añoExacto,
  estaEnEspañol,
  extraerCandidatas,
  type DocumentoDeFuente,
} from '../../tools/lib/extraccion.ts';

/** Historia 9.1 — extracción de candidatas desde una Fuente. */

const OBRA_EN_ESPAÑOL = [
  'No es que tengamos poco tiempo para vivir, sino que perdemos una gran parte de él.',
  'La vida es larga si sabes usarla y aprovecharla como es debido cada jornada.',
  'Corta.',
  'Ninguna cosa hay que sea más nuestra que el tiempo que pasa por delante.',
].join(' ');

const documento = (campos: Partial<DocumentoDeFuente> = {}): DocumentoDeFuente => ({
  fuente: 'wikisource-es',
  obra: 'Sobre la brevedad de la vida',
  año: 49,
  url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
  texto: OBRA_EN_ESPAÑOL,
  ...campos,
});

describe('Historia 9.1 — la obra y el año vienen de la Fuente', () => {
  const resultado = extraerCandidatas(documento(), 'seneca');

  it('propone candidatas', () => {
    expect(resultado.ok).toBe(true);
    expect(resultado.ok && resultado.candidatas.length).toBeGreaterThan(0);
  });

  it('cada candidata trae la obra y el año que declaró la Fuente', () => {
    if (!resultado.ok) throw new Error('no hubo candidatas');
    for (const candidata of resultado.candidatas) {
      expect(candidata.procedencia.obra).toBe('Sobre la brevedad de la vida');
      expect(candidata.procedencia.año).toBe(49);
    }
  });

  it('sin obra declarada no se extrae nada: habría que inferirla', () => {
    const sinObra = extraerCandidatas(documento({ obra: '  ' }), 'seneca');
    expect(sinObra.ok).toBe(false);
    expect(!sinObra.ok && sinObra.motivo).toMatch(/no declara obra/);
  });
});

describe('Historia 9.1 — ninguna Procedencia aproximada', () => {
  it.each([
    ['c. 1615', undefined],
    ['ca. 1615', undefined],
    ['hacia 1615', undefined],
    ['1615?', undefined],
    ['1615-1620', undefined],
    ['siglo XVII', undefined],
    ['1615', 1615],
    [1615, 1615],
    [-4, -4],
    [1615.5, undefined],
  ])('«%s» da %s', (declarado, esperado) => {
    expect(añoExacto(declarado as string | number)).toBe(esperado);
  });

  it('un año aproximado deja la candidata con obra y sin año, no con un año inventado', () => {
    const resultado = extraerCandidatas(documento({ año: 'c. 49' }), 'seneca');
    if (!resultado.ok) throw new Error('no hubo candidatas');

    for (const candidata of resultado.candidatas) {
      expect(candidata.procedencia.obra).toBeTruthy();
      // Procedencia parcial es un estado legítimo. Un año inventado, no.
      expect(candidata.procedencia).not.toHaveProperty('año');
    }
  });
});

describe('Historia 9.1 — consta de dónde salió y bajo qué licencia', () => {
  it('cada candidata lleva su Fuente y su licencia', () => {
    const resultado = extraerCandidatas(documento(), 'seneca');
    if (!resultado.ok) throw new Error('no hubo candidatas');

    for (const candidata of resultado.candidatas) {
      expect(candidata.fuente.id).toBe('wikisource-es');
      expect(candidata.fuente.nombre).toBe('Wikisource en español');
      expect(candidata.fuente.licencia).toBe('CC BY-SA 4.0');
      expect(candidata.fuente.url).toContain('wikisource.org');
    }
  });

  it('la licencia sale del conjunto cerrado, no del documento', () => {
    // Si la trajera el documento, bastaría con escribir «dominio público» en el fichero
    // de entrada para saltarse la comprobación de licencia entera.
    const resultado = extraerCandidatas(
      { ...documento(), licencia: 'lo que yo diga' } as DocumentoDeFuente,
      'seneca',
    );
    if (!resultado.ok) throw new Error('no hubo candidatas');
    expect(resultado.candidatas[0].fuente.licencia).toBe('CC BY-SA 4.0');
  });
});

describe('Historia 9.1 — una licencia que no permite reutilizar detiene el proceso', () => {
  const noReutilizable = FUENTES.find((f) => !f.permiteReutilizacion)!;
  const resultado = extraerCandidatas(documento({ fuente: noReutilizable.id }), 'seneca');

  it('no devuelve ninguna candidata', () => {
    expect(resultado.ok).toBe(false);
    expect(resultado).not.toHaveProperty('candidatas');
  });

  it('explica por qué, con la licencia concreta', () => {
    expect(!resultado.ok && resultado.motivo).toContain(noReutilizable.nombre);
    expect(!resultado.ok && resultado.motivo).toContain(noReutilizable.licencia);
    expect(!resultado.ok && resultado.motivo).toMatch(/no se ha escrito ninguna/i);
  });

  it('una Fuente que ni siquiera está admitida se detiene igual', () => {
    const inventada = extraerCandidatas(documento({ fuente: 'sitio-de-citas.example' }), 'seneca');
    expect(inventada.ok).toBe(false);
    expect(!inventada.ok && inventada.motivo).toMatch(/no es una Fuente admitida/);
  });

  it('el conjunto de Fuentes está cerrado y cada una declara su licencia', () => {
    for (const fuente of FUENTES) {
      expect(fuente.licencia).toBeTruthy();
      if (!fuente.permiteReutilizacion) expect(fuente.razon).toBeTruthy();
    }
    expect(fuenteDe('no-existe')).toBeUndefined();
  });
});

describe('Historia 11.1 — FUENTES y las tablas por Fuente no se desincronizan', () => {
  /*
   * Sin esto se podía añadir una Fuente con su licencia y sin anfitriones ni lector de
   * obra: la recuperación descargaría y fallaría después con «no declara título», o ni
   * siquiera reconocería su propia dirección, y la suite seguiría en verde.
   */
  it.each(FUENTES.filter((f) => f.permiteReutilizacion).map((f) => [f.id, f] as const))(
    '«%s» declara anfitriones y tiene lector de obra',
    (id, fuente) => {
      expect(fuente.anfitriones.length).toBeGreaterThan(0);
      for (const anfitrion of fuente.anfitriones) {
        expect(anfitrion).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/);
        expect(fuenteDeUrl(`https://${anfitrion}/loquesea`)?.id).toBe(id);
      }
      expect(LECTORES_POR_FUENTE[id], `falta el lector de ${id}`).toBeDefined();
    },
  );

  it('toda Fuente del conjunto reconoce sus propias direcciones', () => {
    for (const fuente of FUENTES) {
      expect(fuente.anfitriones.length, fuente.id).toBeGreaterThan(0);
      expect(fuenteDeUrl(`https://${fuente.anfitriones[0]}/x`)?.id).toBe(fuente.id);
    }
  });

  it('ningún lector sobra: cada uno corresponde a una Fuente que permite reutilizar', () => {
    for (const id of Object.keys(LECTORES_POR_FUENTE)) {
      expect(fuenteDe(id)?.permiteReutilizacion, id).toBe(true);
    }
  });
});

describe('Historia 11.1 — la dirección decide la Fuente, con coincidencia exacta', () => {
  it.each([
    ['https://es.wikisource.org/wiki/X', 'wikisource-es'],
    // Una URL copiada del móvil es la misma Fuente y la misma obra.
    ['https://es.m.wikisource.org/wiki/X', 'wikisource-es'],
    ['https://www.gutenberg.org/ebooks/7500', 'gutenberg'],
    ['http://gutenberg.org/ebooks/7500', 'gutenberg'],
    ['https://www.cervantesvirtual.com/obra/x/', 'cervantes-virtual'],
  ])('«%s» es de %s', (url, id) => {
    expect(fuenteDeUrl(url)?.id).toBe(id);
  });

  it.each([
    // El que más cuela: termina en «example.com», no en «gutenberg.org».
    'https://gutenberg.org.example.com/ebooks/7500',
    'https://notgutenberg.org/x',
    'https://es.wikisource.org.evil.example/wiki/X',
    'https://frases-celebres.example.com/seneca',
    // Ni protocolos que no son http(s): son formas de leer algo que nadie publicó.
    'file:///etc/passwd',
    'data:text/html,<h1>Obra</h1>',
    'javascript:alert(1)',
    'no es una url',
    '',
  ])('«%s» no es de ninguna Fuente', (url) => {
    expect(fuenteDeUrl(url)).toBeUndefined();
  });
});

describe('Historia 9.1 — lo que no está en español no se propone', () => {
  it('reconoce el español y descarta el latín', () => {
    expect(estaEnEspañol('No es que tengamos poco tiempo, sino que perdemos gran parte de él.')).toBe(true);
    expect(estaEnEspañol('Non est quod credas quemquam fieri aliena infelicitate felicem.')).toBe(false);
    expect(estaEnEspañol('The life we receive is not short, but we make it so by waste.')).toBe(false);
  });

  it('un pasaje en otra lengua dentro de la obra no llega a candidata', () => {
    const conLatin = documento({
      texto:
        OBRA_EN_ESPAÑOL +
        ' Non est quod credas quemquam fieri aliena infelicitate felicem atque beatum.',
    });
    const resultado = extraerCandidatas(conLatin, 'seneca');
    if (!resultado.ok) throw new Error('no hubo candidatas');

    expect(resultado.candidatas.every((c) => !c.texto.startsWith('Non est'))).toBe(true);
    expect(resultado.descartadas.some((d) => d.motivo === 'no-esta-en-español')).toBe(true);
  });
});

describe('Historia 9.1 — la ventana de longitud y las repeticiones', () => {
  const resultado = extraerCandidatas(documento(), 'seneca');

  it('lo demasiado corto no es una Cita, es un trozo de frase', () => {
    if (!resultado.ok) throw new Error('no hubo candidatas');
    expect(resultado.candidatas.every((c) => [...c.texto].length >= MIN_CARACTERES_CANDIDATA)).toBe(true);
    expect(resultado.descartadas.some((d) => d.texto === 'Corta.')).toBe(true);
  });

  it('nada pasa del máximo', () => {
    if (!resultado.ok) throw new Error('no hubo candidatas');
    expect(resultado.candidatas.every((c) => [...c.texto].length <= MAX_CARACTERES_CANDIDATA)).toBe(true);
  });

  it('una frase repetida en la obra se propone una sola vez', () => {
    const repetida = 'La vida es larga si sabes usarla y aprovecharla como es debido cada jornada.';
    const resultado = extraerCandidatas(documento({ texto: `${repetida} ${repetida}` }), 'seneca');
    if (!resultado.ok) throw new Error('no hubo candidatas');
    expect(resultado.candidatas).toHaveLength(1);
    expect(resultado.descartadas.some((d) => d.motivo === 'repetida')).toBe(true);
  });
});

/**
 * El pie de licencia de la Fuente no es texto del Autor — FR-24.
 *
 * Se vio sembrando “El mundo por dentro”: entre las 167 candidatas que la extracción propuso
 * atribuir a su Autor venían **dos frases de Wikisource**, no suyas:
 *
 *   «Esta obra se encuentra en dominio público.»
 *   «Esto es aplicable en todo el mundo debido a que su autor falleció hace más de 100 años.»
 *
 * Ninguna llegó a publicarse porque esta sesión leyó las 167 una por una, y ninguna Cita del
 * Corpus las tiene. Pero **atribuir a un Autor una frase que no escribió es el único error que
 * este producto no se puede permitir**: el sitio entero se sostiene sobre que cada Cita está
 * cotejada contra el documento de su Fuente. Y aquí el cotejo no protege, porque la frase **sí**
 * aparece literal en el documento: la sirvió la Fuente, en su pie.
 *
 * Es la misma familia que la trampa de los índices de obra que `deferred-work.md` ya tiene
 * anotada: el documento trae, además de la obra, el aparato con que la Fuente la envuelve.
 *
 * Se cierra por frase completa de plantilla y no por palabras sueltas, y es deliberado: un Autor
 * puede escribir «dominio» o «público» —y en este Corpus hay quien escribe de leyes— pero nadie
 * escribe «se encuentra en dominio público» dentro de su obra. La puerta laxa que descarta de
 * más sería peor que la que descarta de menos: perdería Citas buenas en silencio.
 */
describe('FR-24 — el aparato de la Fuente no se atribuye al Autor', () => {
  const PIE_DE_WIKISOURCE =
    'Esta obra se encuentra en dominio público. Esto es aplicable en todo el mundo debido a ' +
    'que su autor falleció hace más de 100 años. La traducción de la obra puede no estar en ' +
    'dominio público.';

  it('el pie de licencia no llega a candidata, aunque esté literal en el documento', () => {
    const conPie = documento({ texto: `${OBRA_EN_ESPAÑOL} ${PIE_DE_WIKISOURCE}` });
    const resultado = extraerCandidatas(conPie, 'seneca');
    if (!resultado.ok) throw new Error('no hubo candidatas');

    expect(resultado.candidatas.every((c) => !/dominio público/i.test(c.texto))).toBe(true);
    expect(resultado.descartadas.some((d) => d.motivo === 'aparato-de-la-fuente')).toBe(true);
  });

  it('no se lleva por delante la obra que venía con él', () => {
    const conPie = documento({ texto: `${OBRA_EN_ESPAÑOL} ${PIE_DE_WIKISOURCE}` });
    const soloObra = extraerCandidatas(documento(), 'seneca');
    const resultado = extraerCandidatas(conPie, 'seneca');
    if (!resultado.ok || !soloObra.ok) throw new Error('no hubo candidatas');

    expect(resultado.candidatas).toHaveLength(soloObra.candidatas.length);
  });

  it('una frase del Autor que hable de lo público no se descarta por parecerse', () => {
    // La puerta va por frase de plantilla, no por palabras sueltas.
    const suya = 'Lo que es de todos y es público suele cuidarse menos que lo que es de uno.';
    const resultado = extraerCandidatas(documento({ texto: suya }), 'seneca');
    if (!resultado.ok) throw new Error('no hubo candidatas');

    expect(resultado.candidatas.map((c) => c.texto)).toContain(suya);
  });
});

/**
 * El aviso de mantenimiento tampoco es texto del Autor — FR-24.
 *
 * La puerta `aparato-de-la-fuente` se escribió mirando **un** aparato: el pie de licencia.
 * Sembrando un ensayo apareció otro, y la puerta lo dejó pasar entero — tres frases que
 * Wikisource escribe sobre las páginas cuya procedencia aún no ha comprobado:
 *
 *   «A menos que se añada información de derechos de autor y/o la fuente de este texto en la
 *    página de discusión, puede ser borrado un mes después del día en el cual esta plantilla
 *    fue agregada.»
 *   «Este aviso fue puesto el 23 de octubre de 2018.»
 *   «La fuente de este texto no se ha especificado.»
 *
 * La ironía vale la pena anotarla: es el aviso de que **la Fuente no consta**, y sin esta
 * puerta se publicaría firmado por el Autor y cotejado contra su documento. El cotejo lo daría
 * por bueno, porque la frase está literal en el documento — la escribió la Fuente.
 *
 * Con esto son dos aparatos distintos en dos Fuentes de la misma familia, así que la lección
 * no es «añadir esta plantilla» sino que **el aparato no se acaba**: cada vez que aparezca uno
 * nuevo, su sitio es esta lista y su prueba es esta.
 */
describe('FR-24 — el aviso de mantenimiento tampoco se atribuye al Autor', () => {
  const AVISO_DE_WIKISOURCE = [
    'La fuente de este texto no se ha especificado.',
    'A menos que se añada información de derechos de autor y/o la fuente de este texto en la',
    'página de discusión, puede ser borrado un mes después del día en el cual esta plantilla',
    'fue agregada.',
    'Este aviso fue puesto el 23 de octubre de 2018.',
  ].join(' ');

  it('ninguna de sus tres frases llega a candidata', () => {
    const conAviso = documento({ texto: `${OBRA_EN_ESPAÑOL} ${AVISO_DE_WIKISOURCE}` });
    const resultado = extraerCandidatas(conAviso, 'seneca');
    if (!resultado.ok) throw new Error('no hubo candidatas');

    expect(resultado.candidatas.every((c) => !/fuente de este texto/i.test(c.texto))).toBe(true);
    expect(resultado.candidatas.every((c) => !/este aviso fue puesto/i.test(c.texto))).toBe(true);
    expect(resultado.candidatas.every((c) => !/derechos de autor/i.test(c.texto))).toBe(true);
  });

  it('se descarta como aparato, no como otra cosa', () => {
    // El motivo importa: contado como «longitud» o «repetida» el informe mentiría sobre por
    // qué se fue, y la próxima vez nadie sabría que hay una puerta vigilando esto.
    const conAviso = documento({ texto: `${OBRA_EN_ESPAÑOL} ${AVISO_DE_WIKISOURCE}` });
    const resultado = extraerCandidatas(conAviso, 'seneca');
    if (!resultado.ok) throw new Error('no hubo candidatas');

    expect(resultado.descartadas.some((d) => d.motivo === 'aparato-de-la-fuente')).toBe(true);
  });

  it('y la obra que venía con él sale intacta', () => {
    const conAviso = documento({ texto: `${OBRA_EN_ESPAÑOL} ${AVISO_DE_WIKISOURCE}` });
    const soloObra = extraerCandidatas(documento(), 'seneca');
    const resultado = extraerCandidatas(conAviso, 'seneca');
    if (!resultado.ok || !soloObra.ok) throw new Error('no hubo candidatas');

    expect(resultado.candidatas).toHaveLength(soloObra.candidatas.length);
  });
});

/**
 * La línea de firma tampoco es texto del Autor — FR-24.
 *
 * Tercer aparato en tres sesiones, y el más irónico de los tres: la línea con que el
 * encabezado de Wikisource **firma** la página.
 *
 *     << Autor: Manuel González Prada Publicado en Los Parias, periódico de Lima, 1907.
 *
 * Es exactamente la línea que la 43.ª sesión enseñó al lector de documentos a interpretar para
 * saber quién firma —y gracias a la cual dos documentos dejaron de quedarse sin Autor—. Leída
 * por el lector es un metadato; leída por la extracción, una candidata a Cita del Autor cuya
 * firma contiene. Publicarla habría atribuido a un Autor el nombre de su propio periódico.
 *
 * Se descarta por la etiqueta al **principio** de la línea, no por el nombre: el nombre cambia
 * con cada Autor y la etiqueta no. Y una frase de un Autor jamás empieza por «Autor:».
 */
describe('FR-24 — la línea de firma de la Fuente no es una Cita', () => {
  const CON_FIRMA = [
    '<< Autor: Manuel González Prada Publicado en Los Parias, periódico de Lima, 1907.',
    'Autor: Alguien Que Firma, y detrás una frase larga que rellena la ventana de longitud.',
  ].join(' ');

  it('la línea del encabezado no llega a candidata', () => {
    const conFirma = documento({ texto: `${OBRA_EN_ESPAÑOL} ${CON_FIRMA}` });
    const resultado = extraerCandidatas(conFirma, 'seneca');
    if (!resultado.ok) throw new Error('no hubo candidatas');

    expect(resultado.candidatas.every((c) => !/^\s*(?:<<)?\s*Autor\s*:/i.test(c.texto))).toBe(true);
    expect(resultado.descartadas.some((d) => d.motivo === 'aparato-de-la-fuente')).toBe(true);
  });

  it('una frase que solo NOMBRA a un autor sí se propone', () => {
    /*
     * La puerta va por la etiqueta al principio, no por el nombre: si fuera por el nombre se
     * perdería toda Cita que hable de otro escritor, y este Corpus está lleno de ellas.
     */
    const suya = 'Manuel González Prada escribió que la justicia nace de la sabiduría del pueblo.';
    const resultado = extraerCandidatas(documento({ texto: suya }), 'seneca');
    if (!resultado.ok) throw new Error('no hubo candidatas');

    expect(resultado.candidatas.map((c) => c.texto)).toContain(suya);
  });
});
