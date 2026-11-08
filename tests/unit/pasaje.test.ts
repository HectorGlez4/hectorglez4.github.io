import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { ofrecePasaje, pasajeDeAparicion } from '../../tools/lib/pasaje.ts';
import { colapsarEspacios, localizar } from '../../tools/lib/cotejo.ts';
import { formaDeLasLineas, type FormaDeLineas } from '../../tools/lib/lineas.ts';
import { analizarDocumento, componerDocumento } from '../../tools/lib/documento.ts';

/**
 * Historia 31.1 — el pasaje de una aparición (AD-30): el trozo literal del documento crudo del
 * que sale la Cita, delimitado según la forma de sus líneas, y la decisión con nombre de si se
 * ofrece. Puro: los documentos se componen con `componerDocumento` y su `lineas:` declarada, que
 * es la que manda en `formaDeLasLineas`.
 */

const RAIZ = resolve(__dirname, '../..');

/** Un documento de prueba con su forma declarada en la cabecera, leído como lo lee el cotejo. */
function documento(lineas: FormaDeLineas, cuerpo: string): { cuerpo: string; forma: FormaDeLineas } {
  const fichero = componerDocumento(
    { fuente: 'ws', obra: 'La obra', url: 'https://ejemplo.org/la-obra', recuperado: '2026-11-07', lineas },
    'La obra',
    cuerpo,
  );
  const analizado = analizarDocumento(fichero);
  if (analizado === undefined) throw new Error('el documento de prueba no se deja analizar');
  const declarada = 'lineas' in analizado.cabecera ? analizado.cabecera.lineas : undefined;
  return { cuerpo: analizado.cuerpo, forma: formaDeLasLineas({ cuerpo: analizado.cuerpo, lineas: declarada }) };
}

/** El pasaje de una Cita en un documento, situada con el localizador del cotejo. */
function pasajeDe(doc: { cuerpo: string; forma: FormaDeLineas }, textoDeCita: string, ...conTope: [number | undefined] | []) {
  // Un tope explícito, también `undefined`; sin él, 1.200.
  const tope = conTope.length === 0 ? 1200 : conTope[0];
  const buscado = colapsarEspacios(textoDeCita);
  const posicion = localizar(buscado, colapsarEspacios(doc.cuerpo));
  expect(posicion, 'la Cita de prueba tiene que aparecer en su documento').not.toBe(-1);
  return pasajeDeAparicion({ crudo: doc.cuerpo, forma: doc.forma, posicion, buscado, textoDeCita, tope });
}

/** El invariante de la matriz: el tramo del pasaje colapsa al texto de la Cita. */
function exigeElTramo(resultado: ReturnType<typeof pasajeDe>, textoDeCita: string) {
  if (!('pasaje' in resultado)) throw new Error(`sin pasaje: ${resultado.motivo}`);
  const { texto, inicio, fin } = resultado.pasaje;
  expect(colapsarEspacios(texto.slice(inicio, fin))).toBe(colapsarEspacios(textoDeCita));
  expect(texto).toBe(texto.trim());
  return resultado.pasaje;
}

const ESTROFAS = [
  'En el principio era el verso,',
  'y el verso era una casa,',
  'y en la casa vivía el viento',
  'que no sabía estarse quieto.',
  '',
  'Después vino la prosa',
  'con sus párrafos largos,',
  'y el viento se fue al campo',
  'a vivir entre los árboles.',
  '',
  'Y aquí acaba la canción.',
  'Ya no hay más que decir de ella.',
  'Se cierra el libro y se apaga',
  'la luz que lo alumbraba.',
].join('\n');

describe('31.1 — pasajeDeAparicion: el trozo por forma', () => {
  const verso = documento('verso', ESTROFAS);

  it('verso, Cita dentro de una estrofa: la estrofa entera, con sus saltos', () => {
    const cita = 'y el verso era una casa, y en la casa vivía el viento';
    const pasaje = exigeElTramo(pasajeDe(verso, cita), cita);
    expect(pasaje.texto).toBe(ESTROFAS.split('\n\n')[0]);
    expect(pasaje.texto).toContain('\n');
    expect(pasaje.texto.slice(pasaje.inicio, pasaje.fin)).toBe('y el verso era una casa,\ny en la casa vivía el viento');
  });

  it('verso, Cita que cruza dos estrofas: las dos y la línea en blanco entre ellas', () => {
    const cita = 'que no sabía estarse quieto. Después vino la prosa';
    const pasaje = exigeElTramo(pasajeDe(verso, cita), cita);
    const [primera, segunda] = ESTROFAS.split('\n\n');
    expect(pasaje.texto).toBe(`${primera}\n\n${segunda}`);
  });

  it('prosa-ajustada, Cita que cruza dos bloques: los dos, saltos interiores tal cual', () => {
    const cuerpo = [
      'Primer párrafo del libro, ajustado a ancho fijo como lo trae',
      'la edición, que parte la línea donde no cabe la palabra siguiente.',
      '',
      'Segundo párrafo, también ajustado, que sigue al anterior y que',
      'acaba aquí sin más ceremonia.',
      '',
      'Tercero, que no toca.',
    ].join('\n');
    const doc = documento('prosa-ajustada', cuerpo);
    const cita = 'donde no cabe la palabra siguiente. Segundo párrafo, también ajustado';
    const pasaje = exigeElTramo(pasajeDe(doc, cita), cita);
    expect(pasaje.texto).toBe(cuerpo.split('\n\n').slice(0, 2).join('\n\n'));
  });

  it('prosa-por-lineas: la línea', () => {
    const cuerpo = [
      'Un párrafo por línea, que la Fuente trae así. Y la Cita está dentro de este.',
      'Otro párrafo distinto, que no entra en el pasaje.',
    ].join('\n');
    const doc = documento('prosa-por-lineas', cuerpo);
    const cita = 'Y la Cita está dentro de este.';
    const pasaje = exigeElTramo(pasajeDe(doc, cita), cita);
    expect(pasaje.texto).toBe(cuerpo.split('\n')[0]);
    expect(pasaje.inicio).toBe(cuerpo.split('\n')[0].indexOf(cita));
  });

  it('prosa-por-lineas con líneas en blanco entre párrafos: la línea, sin la vecina', () => {
    const cuerpo = 'Primera línea con la frase buscada dentro de ella.\n\nSegunda línea.';
    const doc = documento('prosa-por-lineas', cuerpo);
    const pasaje = exigeElTramo(pasajeDe(doc, 'la frase buscada'), 'la frase buscada');
    expect(pasaje.texto).toBe('Primera línea con la frase buscada dentro de ella.');
  });

  it('verso-espaciado e indeterminada: sin pasaje', () => {
    for (const forma of ['verso-espaciado', 'indeterminada'] as const) {
      const doc = documento(forma, ESTROFAS);
      expect(pasajeDe(doc, 'y el verso era una casa,')).toEqual({ motivo: 'forma-sin-parrafo' });
    }
  });

  it('solo el blanco de los extremos se quita: sangrías y espacios del borde fuera, los de dentro tal cual', () => {
    const crudo = 'Antes.\n\n   Una línea con sangría,\n\tY  otra   con espacios dentro.   \n\nDespués.';
    const pasaje = exigeElTramo(
      pasajeDeAparicion({
        crudo,
        forma: formaDeLasLineas({ cuerpo: crudo, lineas: 'verso' }),
        posicion: localizar(colapsarEspacios('Y otra'), colapsarEspacios(crudo)),
        buscado: colapsarEspacios('Y otra'),
        textoDeCita: 'Y otra',
        tope: 1200,
      }),
      'Y otra',
    );
    expect(pasaje.texto).toBe('Una línea con sangría,\n\tY  otra   con espacios dentro.');
  });

  it('una línea de solo espacio separa bloques', () => {
    const crudo = 'Bloque uno, primera.\nBloque uno, segunda.\n   \t \nBloque dos, primera.\nBloque dos, segunda.';
    const cita = 'Bloque dos, primera.';
    const pasaje = exigeElTramo(
      pasajeDeAparicion({
        crudo,
        forma: formaDeLasLineas({ cuerpo: crudo, lineas: 'verso' }),
        posicion: localizar(colapsarEspacios(cita), colapsarEspacios(crudo)),
        buscado: colapsarEspacios(cita),
        textoDeCita: cita,
        tope: 1200,
      }),
      cita,
    );
    expect(pasaje.texto).toBe('Bloque dos, primera.\nBloque dos, segunda.');
  });

  it('prosa-ajustada, Cita dentro de un solo bloque: ese bloque, sin los vecinos', () => {
    const cuerpo = [
      'Primer párrafo, ajustado a ancho fijo como lo trae la edición,',
      'que parte la línea donde no cabe la palabra siguiente.',
      '',
      'Segundo párrafo, también ajustado, con la frase que se busca',
      'partida entre dos líneas y que acaba aquí.',
      '',
      'Tercero, que no toca.',
    ].join('\n');
    const doc = documento('prosa-ajustada', cuerpo);
    const cita = 'con la frase que se busca partida entre dos líneas';
    const pasaje = exigeElTramo(pasajeDe(doc, cita), cita);
    expect(pasaje.texto).toBe(cuerpo.split('\n\n')[1]);
  });

  it('prosa-por-lineas, Cita que cruza dos líneas: las dos, como dos bloques seguidos', () => {
    const cuerpo = [
      'Antes de todo, una línea que no toca.',
      'Una línea que acaba con el principio de la Cita que',
      'sigue en la línea de después, y aquí acaba ella.',
      'Otra línea que no toca.',
    ].join('\n');
    const doc = documento('prosa-por-lineas', cuerpo);
    const cita = 'el principio de la Cita que sigue en la línea de después';
    const pasaje = exigeElTramo(pasajeDe(doc, cita), cita);
    expect(pasaje.texto).toBe(cuerpo.split('\n').slice(1, 3).join('\n'));
  });

  it('en los bordes del documento: primera y última línea, y blancos alrededor', () => {
    const crudo = '\n  \nPrimera estrofa, primer verso,\ny su segundo verso.\n\nÚltima estrofa, primer verso,\ny el verso final del libro.\n\n';
    const forma = formaDeLasLineas({ cuerpo: crudo, lineas: 'verso' });
    const de = (cita: string) =>
      exigeElTramo(
        pasajeDeAparicion({
          crudo,
          forma,
          posicion: localizar(colapsarEspacios(cita), colapsarEspacios(crudo)),
          buscado: colapsarEspacios(cita),
          textoDeCita: cita,
          tope: 1200,
        }),
        cita,
      );
    expect(de('Primera estrofa, primer verso,').texto).toBe('Primera estrofa, primer verso,\ny su segundo verso.');
    const ultima = de('y el verso final del libro.');
    expect(ultima.texto).toBe('Última estrofa, primer verso,\ny el verso final del libro.');
    expect(ultima.fin).toBe(ultima.texto.length);
    // Un documento de un solo bloque: el bloque es todo el cuerpo, sin sus blancos del borde.
    const solo = '  Un solo bloque, primer verso,\ny el segundo verso del bloque.  ';
    const unico = exigeElTramo(
      pasajeDeAparicion({
        crudo: solo,
        forma: formaDeLasLineas({ cuerpo: solo, lineas: 'verso' }),
        posicion: localizar(colapsarEspacios('Un solo bloque'), colapsarEspacios(solo)),
        buscado: colapsarEspacios('Un solo bloque'),
        textoDeCita: 'Un solo bloque',
        tope: 1200,
      }),
      'Un solo bloque',
    );
    expect(unico.texto).toBe(solo.trim());
    expect(unico.inicio).toBe(0);
  });

  it('con finales de línea CRLF: la línea con solo `\\r` separa bloques y el `\\r` del borde se quita', () => {
    const crudo = 'Antes, una estrofa.\r\nQue no toca.\r\n\r\nLa estrofa con la frase buscada,\r\ny su segundo verso.\r\n\r\nDespués.';
    const cita = 'la frase buscada';
    const pasaje = exigeElTramo(
      pasajeDeAparicion({
        crudo,
        forma: formaDeLasLineas({ cuerpo: crudo, lineas: 'verso' }),
        posicion: localizar(colapsarEspacios(cita), colapsarEspacios(crudo)),
        buscado: colapsarEspacios(cita),
        textoDeCita: cita,
        tope: 1200,
      }),
      cita,
    );
    // Literal: el `\r` interior se queda tal cual; el del borde es blanco y se quita.
    expect(pasaje.texto).toBe('La estrofa con la frase buscada,\r\ny su segundo verso.');
  });

  it('dos Citas del mismo párrafo: el mismo texto, cada una con su inicio y su fin', () => {
    const una = exigeElTramo(pasajeDe(verso, 'Después vino la prosa'), 'Después vino la prosa');
    const otra = exigeElTramo(pasajeDe(verso, 'a vivir entre los árboles.'), 'a vivir entre los árboles.');
    expect(una.texto).toBe(otra.texto);
    expect([una.inicio, una.fin]).not.toEqual([otra.inicio, otra.fin]);
  });

  it('invariante con los saltos de verso de la 29.1 en el texto de la Cita', () => {
    const cita = 'y el viento se fue al campo\na vivir entre los árboles.';
    const pasaje = exigeElTramo(pasajeDe(verso, cita), cita);
    expect(pasaje.texto.slice(pasaje.inicio, pasaje.fin)).toBe(cita);
  });

  it('con caracteres fuera del plano básico, inicio y fin son UTF-16 sobre el texto', () => {
    const crudo = 'Antes 𝄞 del 𝄞 tramo, la frase 𝄞 buscada, y después.\nOtra línea.';
    const cita = 'la frase 𝄞 buscada';
    const resultado = pasajeDeAparicion({
      crudo,
      forma: formaDeLasLineas({ cuerpo: crudo, lineas: 'prosa-por-lineas' }),
      posicion: localizar(colapsarEspacios(cita), colapsarEspacios(crudo)),
      buscado: colapsarEspacios(cita),
      textoDeCita: cita,
      tope: 1200,
    });
    const pasaje = exigeElTramo(resultado, cita);
    expect(pasaje.texto.slice(pasaje.inicio, pasaje.fin)).toBe(cita);
  });
});

describe('31.1 — ofrecePasaje: la única decisión', () => {
  const verso = documento('verso', ESTROFAS);

  it('no dice más: el bloque es la Cita y un punto', () => {
    const doc = documento('prosa-por-lineas', 'Una línea que es toda la Cita.\nOtra línea.');
    expect(pasajeDe(doc, 'Una línea que es toda la Cita')).toEqual({ motivo: 'no-dice-mas' });
    expect(ofrecePasaje({ trozo: 'La Cita.', textoDeCita: 'la cita', tope: 1200 })).toEqual({ ofrece: false, motivo: 'no-dice-mas' });
  });

  it('el tope en el borde se ofrece; uno por encima, no — en puntos de código', () => {
    const cita = 'Después vino la prosa';
    const largo = [...ESTROFAS.split('\n\n')[1]].length;
    expect('pasaje' in pasajeDe(verso, cita, largo)).toBe(true);
    expect(pasajeDe(verso, cita, largo - 1)).toEqual({ motivo: 'pasa-del-tope' });
    // Un carácter fuera del plano básico cuenta uno, no dos.
    const trozo = 'ab𝄞';
    expect(trozo.length).toBe(4);
    expect(ofrecePasaje({ trozo, textoDeCita: 'a', tope: 3 })).toEqual({ ofrece: true });
    expect(ofrecePasaje({ trozo, textoDeCita: 'a', tope: 2 })).toEqual({ ofrece: false, motivo: 'pasa-del-tope' });
  });

  it('sin tope, ninguna aparición trae pasaje', () => {
    expect(pasajeDe(verso, 'Después vino la prosa', undefined)).toEqual({ motivo: 'sin-tope' });
    expect(ofrecePasaje({ trozo: 'Un párrafo largo.', textoDeCita: 'largo', tope: undefined })).toEqual({
      ofrece: false,
      motivo: 'sin-tope',
    });
  });

  it('«no dice más» va antes que el tope', () => {
    expect(ofrecePasaje({ trozo: 'Larguísima Cita.', textoDeCita: 'Larguísima Cita', tope: 1 })).toEqual({
      ofrece: false,
      motivo: 'no-dice-mas',
    });
  });
});

describe('31.1 — los dueños del pasaje (AD-30)', () => {
  const ARBOLES = ['tools', 'src', 'integraciones', 'public/islas'];
  function ficheros(dir: string): string[] {
    const salida: string[] = [];
    for (const nombre of readdirSync(dir)) {
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) salida.push(...ficheros(ruta));
      else if (/\.(ts|mts|js|mjs|astro)$/u.test(nombre)) salida.push(ruta);
    }
    return salida;
  }
  const todos = ARBOLES.flatMap((a) => ficheros(join(RAIZ, a))).map((ruta) => ({
    ruta: relative(RAIZ, ruta).split('\\').join('/'),
    contenido: readFileSync(ruta, 'utf8'),
  }));

  it('pasajeDeAparicion y ofrecePasaje se definen solo en tools/lib/pasaje.ts', () => {
    for (const patron of [/function\s+pasajeDeAparicion\b/u, /function\s+ofrecePasaje\b/u]) {
      expect(todos.filter((f) => patron.test(f.contenido)).map((f) => f.ruta)).toEqual(['tools/lib/pasaje.ts']);
    }
  });

  it('tools/lib/pasaje.ts no localiza: ni indexOf ni localizar', () => {
    const codigo = readFileSync(join(RAIZ, 'tools/lib/pasaje.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gmu, '');
    expect(codigo).not.toMatch(/indexOf|lastIndexOf|\blocalizar\b|search\(/u);
    expect(codigo).toMatch(/\btramoEnCrudo\(/u);
  });
});
