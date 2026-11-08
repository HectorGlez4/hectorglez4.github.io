import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { colapsarEspacios, localizar } from '../../tools/lib/cotejo.ts';
import { componerDocumento } from '../../tools/lib/documento.ts';
import type { FormaDeLineas } from '../../tools/lib/lineas.ts';
import { incipitDe, ofreceIncipit } from '../../tools/lib/pasaje.ts';
import { fuenteDelIncipit, incipitDelDocumento, leerIncipitsDelCorpus } from '../../tools/lib/posiciones.ts';
import { lineaDeLaFuenteDelIncipit } from '../../src/lib/atribucion.ts';

/**
 * Historia 32.3 — el corte del incipit (`incipitDe`) y el único punto que decide si se ofrece
 * (`ofreceIncipit`), puros; y el cargador (`leerIncipitsDelCorpus`) sobre un Corpus en disco, que
 * repite lo que comprobó la orden y rompe nombrando la ficha. Los topes se pasan por parámetro:
 * ninguna prueba fija `MAX_CARACTERES_DEL_INCIPIT`.
 */

/** El incipit de `cuerpo` desde `desde`, con la forma dada y el tope. */
function cortar(cuerpo: string, forma: FormaDeLineas, desde: string, tope: number | undefined) {
  const buscado = colapsarEspacios(desde);
  const posicion = localizar(buscado, colapsarEspacios(cuerpo));
  expect(posicion, `«${desde}» no está en el cuerpo`).not.toBe(-1);
  return incipitDe({ crudo: cuerpo, forma, posicion, desde: buscado, tope });
}

const PRIMERA = 'En un lugar de la Mancha.';
const SEGUNDA = 'De cuyo nombre no quiero acordarme.';
const MANCHA = `${PRIMERA} ${SEGUNDA} Vivía un hidalgo de los de lanza en astillero.`;

describe('32.3 — ofreceIncipit, el único punto que decide', () => {
  it('sin tope, no: sin-tope', () => {
    expect(ofreceIncipit({ tope: undefined, primera: 'Corta.' })).toEqual({ ofrece: false, motivo: 'sin-tope' });
  });

  it('el borde: una primera unidad de exactamente el tope, sí', () => {
    expect(ofreceIncipit({ tope: [...PRIMERA].length, primera: PRIMERA })).toEqual({ ofrece: true });
  });

  it('uno más: una primera unidad de tope + 1, no (primera-no-cabe)', () => {
    expect(ofreceIncipit({ tope: [...PRIMERA].length - 1, primera: PRIMERA })).toEqual({
      ofrece: false,
      motivo: 'primera-no-cabe',
    });
  });

  it('un tope que no es un entero positivo para la construcción, en vez de no cortar', () => {
    for (const tope of [Number.NaN, Number.POSITIVE_INFINITY, 0, -3, 2.5]) {
      expect(() => ofreceIncipit({ tope, primera: 'Corta.' }), String(tope)).toThrow(RangeError);
    }
  });

  it('cuenta puntos de código, no unidades UTF-16', () => {
    const conAstral = 'Mira 𝔄.';
    expect(conAstral.length).toBe(8);
    expect(ofreceIncipit({ tope: 7, primera: conAstral })).toEqual({ ofrece: true });
  });
});

describe('32.3 — incipitDe, el corte en frase o verso', () => {
  it('prosa: las dos primeras frases si caben (tope 61)', () => {
    expect([...`${PRIMERA} ${SEGUNDA}`].length).toBe(61);
    expect(cortar(MANCHA, 'prosa-por-lineas', 'En un lugar', 61)).toEqual({ incipit: `${PRIMERA} ${SEGUNDA}` });
  });

  it('prosa: con tope 60 la segunda no cabe y sale solo la primera', () => {
    expect(cortar(MANCHA, 'prosa-por-lineas', 'En un lugar', 60)).toEqual({ incipit: PRIMERA });
  });

  it('borde: una primera frase de exactamente el tope se ofrece', () => {
    expect(cortar(MANCHA, 'prosa-por-lineas', 'En un lugar', [...PRIMERA].length)).toEqual({ incipit: PRIMERA });
  });

  it('uno más: una primera frase de tope + 1 no se ofrece', () => {
    expect(cortar(MANCHA, 'prosa-por-lineas', 'En un lugar', [...PRIMERA].length - 1)).toEqual({
      motivo: 'primera-no-cabe',
    });
  });

  it('sin tope, no hay incipit, aunque el documento se sostenga', () => {
    expect(cortar(MANCHA, 'prosa-por-lineas', 'En un lugar', undefined)).toEqual({ motivo: 'sin-tope' });
  });

  it('forma indeterminada: ninguno', () => {
    expect(cortar(MANCHA, 'indeterminada', 'En un lugar', 400)).toEqual({ motivo: 'forma-indeterminada' });
  });

  it('empieza en el «desde», aunque caiga a media línea', () => {
    expect(cortar(MANCHA, 'prosa-por-lineas', 'De cuyo nombre', 40)).toEqual({ incipit: SEGUNDA });
  });

  it('verso: versos de 30 con tope 70 dan dos, unidos por un salto', () => {
    const versos = ['Primer verso de treinta letras', 'Segundo verso de treinta letra', 'Tercer verso de treinta letras'];
    for (const verso of versos) expect([...verso].length).toBe(30);
    expect(cortar(versos.join('\n'), 'verso', 'Primer verso', 70)).toEqual({ incipit: `${versos[0]}\n${versos[1]}` });
  });

  it('verso: también entre estrofas un solo salto, y el blanco de cada verso no cuenta', () => {
    const cuerpo = '  Uno,\n  dos,\n\n  tres,\n  cuatro.\n';
    expect(cortar(cuerpo, 'verso', 'Uno', 400)).toEqual({ incipit: 'Uno,\ndos,\ntres,\ncuatro.' });
  });

  it('verso espaciado: cada línea no en blanco es un verso', () => {
    const cuerpo = 'Volverán las oscuras golondrinas\n\nen tu balcón sus nidos a colgar,\n\ny otra vez con el ala a sus cristales\n';
    expect(cortar(cuerpo, 'verso-espaciado', 'Volverán', 70)).toEqual({
      incipit: 'Volverán las oscuras golondrinas\nen tu balcón sus nidos a colgar,',
    });
  });

  it('prosa ajustada: los saltos interiores del párrafo son espacio, y el párrafo acaba en la línea en blanco', () => {
    const cuerpo = [
      'En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho',
      'tiempo que vivía un hidalgo de los de lanza en astillero.',
      '',
      'Tenía en su casa una ama.',
    ].join('\n');
    expect(cortar(cuerpo, 'prosa-ajustada', 'En un lugar', 400)).toEqual({
      incipit:
        'En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un ' +
        'hidalgo de los de lanza en astillero.\nTenía en su casa una ama.',
    });
  });

  it('prosa por líneas: el fin de línea cierra la frase y el párrafo, y el espacio interior se colapsa', () => {
    const cuerpo = 'Sin punto al final de esta línea\nOtra   línea   con   espacios.\n';
    expect(cortar(cuerpo, 'prosa-por-lineas', 'Sin punto', 400)).toEqual({
      incipit: 'Sin punto al final de esta línea\nOtra línea con espacios.',
    });
  });

  it('cierres: «…acordarme.» Vivía — la frase acaba tras el cierre', () => {
    const cuerpo = 'Dijo: «De cuyo nombre no quiero acordarme.» Vivía un hidalgo.';
    expect(cortar(cuerpo, 'prosa-por-lineas', 'Dijo:', 44)).toEqual({ incipit: 'Dijo: «De cuyo nombre no quiero acordarme.»' });
  });

  it('cierres: ?, ! y … también cierran, y de tres puntos solo el último, ante el espacio', () => {
    const cuerpo = '¿Quién es? ¡Nadie! Espera… Luego... sigue.';
    const enUnidades = (tope: number) => cortar(cuerpo, 'prosa-por-lineas', '¿Quién', tope);
    expect(enUnidades(10)).toEqual({ incipit: '¿Quién es?' });
    expect(enUnidades(18)).toEqual({ incipit: '¿Quién es? ¡Nadie!' });
    expect(enUnidades(26)).toEqual({ incipit: '¿Quién es? ¡Nadie! Espera…' });
    expect(enUnidades(34)).toEqual({ incipit: '¿Quién es? ¡Nadie! Espera…' });
    expect(enUnidades(35)).toEqual({ incipit: '¿Quién es? ¡Nadie! Espera… Luego...' });
    expect(enUnidades(42)).toEqual({ incipit: '¿Quién es? ¡Nadie! Espera… Luego... sigue.' });
  });

  it('se para antes del pie de licencia de Wikisource', () => {
    const cuerpo = 'Corto.\n\nEsta obra se encuentra en dominio público en todo el mundo.\n';
    expect(cortar(cuerpo, 'prosa-ajustada', 'Corto', 400)).toEqual({ incipit: 'Corto.' });
    const enVerso = 'Un verso,\notro verso.\nPublic domain\n';
    expect(cortar(enVerso, 'verso', 'Un verso', 400)).toEqual({ incipit: 'Un verso,\notro verso.' });
  });

  it('un «desde» que cae en el pie de licencia no da ninguna unidad: sin-texto', () => {
    const cuerpo = 'Corto.\n\nEsta obra se encuentra en dominio público en todo el mundo.\n';
    expect(cortar(cuerpo, 'prosa-ajustada', 'dominio público', 400)).toEqual({ motivo: 'sin-texto' });
    expect(cortar('Un verso.\nPublic domain\n', 'verso', 'Public domain', 400)).toEqual({ motivo: 'sin-texto' });
  });

  it('se para al fin del documento', () => {
    expect(cortar(MANCHA, 'prosa-por-lineas', 'En un lugar', 1000)).toEqual({ incipit: MANCHA });
  });

  it('nunca a media palabra: lo que no cabe entero no entra', () => {
    const { incipit } = cortar(MANCHA, 'prosa-por-lineas', 'En un lugar', 75) as { incipit: string };
    expect(MANCHA.startsWith(incipit)).toBe(true);
    expect(incipit.endsWith('.')).toBe(true);
  });
});

describe('32.3 — incipitDelDocumento, lo que comprueban la orden y el build', () => {
  it('la forma la manda la cabecera: indeterminada no se sostiene', () => {
    expect(incipitDelDocumento({ cuerpo: MANCHA, lineas: 'indeterminada', desde: 'En un lugar', tope: 400 })).toEqual({
      ok: false,
      fallo: 'forma-indeterminada',
    });
  });

  it('un «desde» que no está no se sostiene', () => {
    expect(incipitDelDocumento({ cuerpo: MANCHA, lineas: 'prosa-por-lineas', desde: 'Érase una vez', tope: 400 })).toEqual({
      ok: false,
      fallo: 'no-se-localiza',
    });
  });

  it('el «desde» se compara con los espacios colapsados', () => {
    expect(
      incipitDelDocumento({ cuerpo: MANCHA, lineas: 'prosa-por-lineas', desde: '  En   un\tlugar ', tope: 400 }),
    ).toMatchObject({ ok: true, forma: 'prosa-por-lineas', repetido: false });
  });

  it('dice si el «desde» aparece más de una vez (se ancla en la primera)', () => {
    const cuerpo = `Capítulo I\n${MANCHA}\nCapítulo II\nOtra frase.`;
    expect(incipitDelDocumento({ cuerpo, lineas: 'prosa-por-lineas', desde: 'Capítulo', tope: 12 })).toMatchObject({
      ok: true,
      repetido: true,
      corte: { incipit: 'Capítulo I' },
    });
  });
});

describe('32.3 — fuenteDelIncipit, la Fuente que firma el incipit', () => {
  const URL_WS = 'https://es.wikisource.org/wiki/X';
  it('una Fuente conocida y reutilizable, con url http(s), firma con su nombre y su licencia', () => {
    expect(fuenteDelIncipit({ fuente: 'wikisource-es', url: URL_WS })).toEqual({
      ok: true,
      fuente: { nombre: 'Wikisource en español', licencia: 'CC BY-SA 4.0', url: URL_WS },
    });
    expect(fuenteDelIncipit({ fuente: 'gutenberg', url: 'https://www.gutenberg.org/ebooks/1' })).toMatchObject({
      ok: true,
      fuente: { nombre: 'Project Gutenberg', licencia: 'dominio público' },
    });
  });

  it.each([
    ['una Fuente que no es de FUENTES', { fuente: 'wikisource-xx', url: URL_WS }, 'fuente-desconocida'],
    ['una Fuente sin reutilización', { fuente: 'cervantes-virtual', url: 'https://www.cervantesvirtual.com/x' }, 'fuente-sin-reutilizacion'],
    ['una Fuente mutable', { fuente: 'wikipedia-es', url: 'https://es.wikipedia.org/w/index.php?oldid=1' }, 'fuente-mutable'],
    ['un url javascript:', { fuente: 'wikisource-es', url: 'javascript:alert(1)' }, 'url-no-web'],
    ['un url data:', { fuente: 'wikisource-es', url: 'data:text/html,hola' }, 'url-no-web'],
    ['un url que no es una dirección', { fuente: 'wikisource-es', url: 'no es una dirección' }, 'url-no-web'],
  ])('no firma con %s', (_caso, cabecera, fallo) => {
    expect(fuenteDelIncipit(cabecera)).toEqual({ ok: false, fallo });
  });
});

describe('32.3 — lineaDeLaFuenteDelIncipit', () => {
  it('con licencia, «. Licencia {licencia}.»; sin ella, «.»', () => {
    expect(lineaDeLaFuenteDelIncipit({ licencia: 'CC BY-SA 4.0' })).toBe('. Licencia CC BY-SA 4.0.');
    expect(lineaDeLaFuenteDelIncipit({})).toBe('.');
  });
});

describe('32.3 — el cargador del incipit, sobre un Corpus en disco', () => {
  const temporales: string[] = [];
  afterEach(async () => {
    await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  });

  const NOMBRE = 'wikisource-es--sobre-la-brevedad-de-la-vida';
  const URL = 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida';
  const FICHA = (incipit?: string) =>
    'autor: "seneca"\ntitulo: "Sobre la brevedad de la vida"\nformas:\n  - "sobre la brevedad de la vida"\n' +
    (incipit ?? '');

  async function corpus(ficheros: Record<string, string>): Promise<string> {
    const raiz = join(await mkdtemp(join(tmpdir(), 'sabiduria-incipit-')), 'corpus');
    temporales.push(join(raiz, '..'));
    for (const [ruta, contenido] of Object.entries(ficheros)) {
      await mkdir(join(raiz, ruta, '..'), { recursive: true });
      await writeFile(join(raiz, ruta), contenido, 'utf8');
    }
    await mkdir(join(raiz, 'fuentes'), { recursive: true });
    return raiz;
  }

  const DOCUMENTO = componerDocumento(
    { fuente: 'wikisource-es', obra: 'Sobre la brevedad de la vida', año: 49, url: URL, recuperado: '2026-11-08', lineas: 'prosa-por-lineas' },
    'Sobre la brevedad de la vida',
    MANCHA,
  );

  it('sin ninguna ficha con incipit, el mapa está vacío y no hace falta ningún documento', async () => {
    const raiz = await corpus({ 'obras/seneca--sobre-la-brevedad-de-la-vida.yml': FICHA() });
    expect(await leerIncipitsDelCorpus(raiz, { tope: 400 })).toEqual(new Map());
  });

  it('con incipit y tope, entrega el texto cortado y la Fuente del documento', async () => {
    const raiz = await corpus({
      'obras/seneca--sobre-la-brevedad-de-la-vida.yml': FICHA(`incipit:\n  documento: "${NOMBRE}"\n  desde: "En un lugar"\n`),
      [`fuentes/${NOMBRE}.txt`]: DOCUMENTO,
    });
    expect(await leerIncipitsDelCorpus(raiz, { tope: 61 })).toEqual(
      new Map([
        [
          'seneca--sobre-la-brevedad-de-la-vida',
          {
            documento: NOMBRE,
            texto: `${PRIMERA} ${SEGUNDA}`,
            fuente: { nombre: 'Wikisource en español', licencia: 'CC BY-SA 4.0', url: URL },
          },
        ],
      ]),
    );
  });

  it('sin tope, el incipit válido no entra, y no rompe', async () => {
    const raiz = await corpus({
      'obras/seneca--sobre-la-brevedad-de-la-vida.yml': FICHA(`incipit:\n  documento: "${NOMBRE}"\n  desde: "En un lugar"\n`),
      [`fuentes/${NOMBRE}.txt`]: DOCUMENTO,
    });
    expect(await leerIncipitsDelCorpus(raiz, { tope: undefined })).toEqual(new Map());
  });

  it.each([
    ['el «desde» ya no está en el documento', 'Érase una vez', DOCUMENTO, /ya no se localiza/u],
    ['el documento falta', 'En un lugar', undefined, /no está en corpus\/fuentes/u],
    ['el documento no se deja analizar', 'En un lugar', 'sin cabecera ninguna', /no se deja analizar/u],
    [
      'la forma es indeterminada',
      'En un lugar',
      DOCUMENTO.replace('lineas: prosa-por-lineas', 'lineas: indeterminada'),
      /indeterminada/u,
    ],
    [
      'la Fuente de la cabecera no es de FUENTES',
      'En un lugar',
      DOCUMENTO.replace('fuente: wikisource-es', 'fuente: wikisource-xx'),
      /no es ninguna de FUENTES/u,
    ],
    [
      'el url de la cabecera no es http(s)',
      'En un lugar',
      DOCUMENTO.replace(`url: ${URL}`, 'url: javascript:alert(1)'),
      /no es una dirección http\(s\)/u,
    ],
  ])('rompe nombrando la ficha cuando %s', async (_caso, desde, documento, motivo) => {
    const raiz = await corpus({
      'obras/seneca--sobre-la-brevedad-de-la-vida.yml': FICHA(`incipit:\n  documento: "${NOMBRE}"\n  desde: "${desde}"\n`),
      ...(documento !== undefined ? { [`fuentes/${NOMBRE}.txt`]: documento } : {}),
    });
    // Rompe con o sin tope: la regla no depende de que la página lo enseñe.
    for (const tope of [400, undefined]) {
      const promesa = leerIncipitsDelCorpus(raiz, { tope });
      await expect(promesa).rejects.toThrow(/^Regla incumplida: /u);
      await expect(promesa).rejects.toThrow(/seneca--sobre-la-brevedad-de-la-vida\.yml/u);
      await expect(promesa).rejects.toThrow(motivo);
    }
  });
});
