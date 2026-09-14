import { describe, expect, it } from 'vitest';
import {
  MARCA_DE_LA_OBRA,
  MARCA_DEL_INDICE,
  autorDelIndice,
  derivarDeLaDeclaracion,
  derivarDocumento,
  indiceDeclarado,
  lineasDeEtiquetaDeEscaneo,
  lineasDelIndiceDeclarado,
} from '../../tools/lib/documento.ts';

/**
 * Historia 19.9 — el Autor se lee del Índice del escaneo.
 *
 * La ficha es de la forma literal de Wikisource-es (`Índice:Rosario de sonetos líricos.djvu`,
 * consultado el 14/09/2026): una plantilla con un campo por renglón y los vacíos a docenas.
 * Lo que aquí se prueba es lo decidible sin red; el salto de red está en
 * `recuperar-cli.test.ts`.
 */
const ficha = (campos: Record<string, string>) =>
  [
    '{{:MediaWiki:Proofreadpage_index_template',
    `|Titulo=${campos.Titulo ?? '[[Rosario de sonetos líricos]]'}`,
    '|Subtitulo=',
    '|Volumen=',
    `|Autor=${campos.Autor ?? ''}`,
    `|Editor=${campos.Editor ?? ''}`,
    `|Traductor=${campos.Traductor ?? ''}`,
    `|Prologuista=${campos.Prologuista ?? ''}`,
    '|Imprenta=',
    `|Ano=${campos.Ano ?? ''}`,
    '|Lugar=',
    '|Fuente={{IA|rosariodesonetos00unam}}',
    '|Paginas=<pagelist',
    '1=—',
    '/>',
    '|Notas={{índice auxiliar|título=Índice| [[Rosario de sonetos líricos/Introducción|Introducción]]}}',
    '}}',
  ].join('\n');

const UNAMUNO = '[[Autor:Miguel de Unamuno|Miguel de Unamuno]]';

describe('Historia 19.9 — el índice lo nombra la propia página', () => {
  it('sale del atributo index= de la etiqueta de escaneo', () => {
    expect(indiceDeclarado('<pages index="Rosario de sonetos líricos.djvu" include=7-12 header=1 />')).toBe(
      'Rosario de sonetos líricos.djvu',
    );
  });

  it('una página sin index= no nombra índice que pedir', () => {
    expect(indiceDeclarado('{{Encabezado|título=Ariel|autor=José Enrique Rodó}}\n\nTexto.')).toBeUndefined();
    expect(indiceDeclarado('<pages include=7-12 header=1 />')).toBeUndefined();
  });

  it('la misma etiqueta dos veces es el mismo índice; dos índices distintos no son ninguno', () => {
    const dos = (a: string, b: string) => `<pages index="${a}" include=1 />\n<pages index="${b}" include=2 />`;
    expect(indiceDeclarado(dos('X.djvu', 'X.djvu'))).toBe('X.djvu');
    // Una página que transcluye de dos escaneos no declara cuál habla por ella.
    expect(indiceDeclarado(dos('X.djvu', 'Y.djvu'))).toBeUndefined();
  });

  it('un nombre que no cabe en un fichero no compone ninguna dirección', () => {
    expect(indiceDeclarado('<pages index="../Otra página" />')).toBeUndefined();
    expect(indiceDeclarado('<pages index="Autor:Fulano" />')).toBeUndefined();
    expect(indiceDeclarado('<pages index="X.djvu#s" />')).toBeUndefined();
  });

  it('el index sigue sin entrar en la declaración: el «Never» de la 19.7 rige', () => {
    const etiqueta = '<pages index="Obras (1888).pdf" include=1 />';
    expect(indiceDeclarado(etiqueta)).toBe('Obras (1888).pdf');
    expect(lineasDeEtiquetaDeEscaneo(etiqueta)).toEqual([]);
  });
});

describe('Historia 19.9 — la ficha del índice se lee por campos, sin saltar de campo', () => {
  it('el Autor del índice sale literal y marcado como del índice', () => {
    expect(lineasDelIndiceDeclarado(ficha({ Autor: UNAMUNO }))).toEqual([
      `${MARCA_DEL_INDICE} |Autor=${UNAMUNO}`,
    ]);
  });

  it('un |Autor= vacío no se queda con el renglón de debajo', () => {
    // `|Editor=` va justo debajo y trae un nombre de persona: es el caso que la lectura por
    // renglones existe para no cometer.
    const lineas = lineasDelIndiceDeclarado(ficha({ Editor: '[[Autor:Fulano de Tal|Fulano de Tal]]' }));
    expect(lineas).toEqual([]);
  });

  it('traductor y año se conservan, como en la 19.7', () => {
    expect(
      lineasDelIndiceDeclarado(ficha({ Autor: UNAMUNO, Traductor: 'Jacinto Díaz de Miranda', Ano: '1911' })),
    ).toEqual([
      `${MARCA_DEL_INDICE} |Autor=${UNAMUNO}`,
      `${MARCA_DEL_INDICE} |Traductor=Jacinto Díaz de Miranda`,
      `${MARCA_DEL_INDICE} |Ano=1911`,
    ]);
  });

  it('del índice no se toma nada más: ni título, ni editor, ni prologuista', () => {
    const lineas = lineasDelIndiceDeclarado(
      ficha({ Autor: UNAMUNO, Editor: 'Renacimiento', Prologuista: 'Alguien Distinto' }),
    ).join('\n');
    expect(lineas).not.toMatch(/Titulo|Editor|Prologuista|Notas/);
  });

  it('una página que no trae la ficha no se adivina', () => {
    expect(lineasDelIndiceDeclarado(`{{Encabezado\n|autor=${UNAMUNO}\n}}`)).toEqual([]);
    expect(lineasDelIndiceDeclarado('')).toEqual([]);
  });
});

describe('Historia 19.9 — el Autor del índice es el último recurso', () => {
  const conIndice = (...lineas: string[]) => ['Rosario de sonetos líricos/Introducción', ...lineas].join('\n');

  it('página muda, índice con Autor: el documento lo declara', () => {
    const declaracion = conIndice(...lineasDelIndiceDeclarado(ficha({ Autor: UNAMUNO })));
    expect(derivarDeLaDeclaracion('wikisource-es', declaracion).autor?.nombres).toEqual(['Miguel de Unamuno']);
  });

  it('lo que declara la página gana siempre al índice', () => {
    const declaracion = conIndice(
      ...lineasDeEtiquetaDeEscaneo('<pages index="X.djvu" autor="Marco Aurelio" />'),
      ...lineasDelIndiceDeclarado(ficha({ Autor: UNAMUNO })),
    );
    expect(derivarDeLaDeclaracion('wikisource-es', declaracion).autor?.nombres).toEqual(['Marco Aurelio']);
  });

  it('un índice con |Autor= vacío deja la página sin Autor, y no se inventa ninguno', () => {
    // La vida y fábulas del Esopo, y La República de 1805: esta historia no los arregla.
    const declaracion = conIndice(...lineasDelIndiceDeclarado(ficha({})));
    expect(derivarDeLaDeclaracion('wikisource-es', declaracion).autor).toBeUndefined();
  });

  it('un índice con dos Autores no declara ninguno: no se reparte entre varios', () => {
    const declaracion = conIndice(
      ...lineasDelIndiceDeclarado(ficha({ Autor: '[[Autor:Manuel Machado|Manuel Machado]] y [[Autor:Antonio Machado|Antonio Machado]]' })),
    );
    expect(derivarDeLaDeclaracion('wikisource-es', declaracion).autor).toBeUndefined();
    // Y lo que dijo queda a la vista, para que el informe pueda contarlo.
    expect(autorDelIndice(declaracion)?.nombres).toEqual(['Manuel Machado', 'Antonio Machado']);
  });

  it('dos Autores que no caben en una línea no se recortan hasta dejar uno', () => {
    // Un recorte por dentro del segundo enlace dejaría legible solo al primero, y el índice
    // declararía un Autor único donde declara dos.
    const largo = (nombre: string) => `[[Autor:${nombre}|${nombre}]]`;
    const primero = `Manuel Machado ${'Ruiz '.repeat(30)}`.trim();
    const valor = `${largo(primero)} y ${largo('Antonio Machado')}`;
    expect(`${MARCA_DEL_INDICE} |Autor=${valor}`.length).toBeGreaterThan(300);

    const lineas = lineasDelIndiceDeclarado(ficha({ Autor: valor }));
    expect(lineas.join('\n')).not.toMatch(/Autor=/);
    expect(derivarDeLaDeclaracion('wikisource-es', conIndice(...lineas)).autor).toBeUndefined();
  });

  it('un índice «Anónimo» no declara a nadie', () => {
    const declaracion = conIndice(...lineasDelIndiceDeclarado(ficha({ Autor: 'Anónimo' })));
    expect(derivarDeLaDeclaracion('wikisource-es', declaracion).autor).toBeUndefined();
  });

  it('las líneas marcadas como de la obra siguen sin aportar Autor', () => {
    // La marca del índice es otra marca: la de la obra no gana nada por esta historia.
    const declaracion = conIndice(`${MARCA_DE_LA_OBRA} |autor=Quien Firma La Obra`);
    expect(derivarDeLaDeclaracion('wikisource-es', declaracion).autor).toBeUndefined();
  });

  it('del índice sale el Autor, no la obra ni el año', () => {
    const declaracion = conIndice(
      ...lineasDelIndiceDeclarado(ficha({ Autor: UNAMUNO, Titulo: '[[Otra obra]]', Ano: '1911' })),
    );
    const derivado = derivarDeLaDeclaracion('wikisource-es', declaracion);
    expect(derivado.obra).toBe('Rosario de sonetos líricos/Introducción');
    expect(derivado.pagina).toBe('Rosario de sonetos líricos/Introducción');
    // El año se conserva en la declaración, pero no se deriva: tomarlo como año de la obra
    // sería otra decisión, y la historia solo pide el Autor.
    expect(derivado.año).toBeUndefined();
  });
});

describe('Historia 19.9 — y la derivación del documento lo hereda', () => {
  const PAGINA = `<!DOCTYPE html><html><head><title>Rosario de sonetos líricos/Introducción - Wikisource</title></head><body>
<h1 id="firstHeading">Rosario de sonetos líricos/Introducción</h1>
<div id="mw-content-text"><div class="mw-parser-output"><p>Este es un libro de sonetos.</p></div></div>
</body></html>`;
  const WIKITEXTO = '<pages index="Rosario de sonetos líricos.djvu" include=7-12 header=1 />';

  it('sin el índice, muda; con el índice, declara, y la línea queda marcada', () => {
    const sin = derivarDocumento('wikisource-es', PAGINA, WIKITEXTO);
    const con = derivarDocumento('wikisource-es', PAGINA, WIKITEXTO, undefined, ficha({ Autor: UNAMUNO }));
    expect(sin.ok && con.ok).toBe(true);
    if (!sin.ok || !con.ok) return;

    expect(derivarDeLaDeclaracion('wikisource-es', sin.declaracion).autor).toBeUndefined();
    expect(derivarDeLaDeclaracion('wikisource-es', con.declaracion).autor?.nombres).toEqual([
      'Miguel de Unamuno',
    ]);
    expect(con.declaracion.split('\n')).toContain(`${MARCA_DEL_INDICE} |Autor=${UNAMUNO}`);
    // Y nada más cambia: misma obra, misma página, mismo cuerpo.
    expect(con.obra).toBe(sin.obra);
    expect(con.pagina).toBe(sin.pagina);
    expect(con.cuerpo).toBe(sin.cuerpo);
  });
});
