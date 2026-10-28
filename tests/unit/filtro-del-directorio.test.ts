import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ETIQUETA_DEL_FILTRO,
  filtroDe,
  fraseDelFiltro,
  rutaDeBuscarEnLasCitas,
  textoDeBuscarEnLasCitas,
  type GrupoFiltrable,
} from '../../src/lib/filtroDelDirectorio.ts';
import { ritmoDeTecleo } from '../../src/lib/anuncio.ts';
import { PAUSA_DE_TECLEO_MS } from '../../src/lib/umbrales.ts';
import { recuentoDeAutores, recuentoDeObras } from '../../src/lib/atribucion.ts';
import * as recuentos from '../../src/lib/recuentos.ts';

/**
 * Historia 26.6 — El Directorio filtra al teclear, sin pensar en tildes.
 *
 * La matriz de la historia sobre la decisión pura (`src/lib/filtroDelDirectorio.ts`), sin build y
 * sin navegador: qué filas, bloques y grupos quedan, cuántas, qué frase se anuncia y a dónde lleva
 * el enlace a cero. Y el segundo ritmo (`ritmoDeTecleo`) con temporizadores falsos. Lo que solo se
 * ve con una página delante —el campo insertado, el anclaje, axe— lo mira
 * `tests/e2e/filtro-del-directorio.spec.ts`.
 */

/** `/autores/`: un bloque por grupo, sin cabecera, un nombre por fila. */
const AUTORES: GrupoFiltrable[] = [
  { bloques: [{ filas: ['Josefa Amar y Borbón', 'Leopoldo Alas'] }] },
  { bloques: [{ filas: ['Manuel González Prada', 'Luis de Góngora'] }] },
  { bloques: [{ filas: ['José Martí', 'Marco Aurelio'] }] },
  { bloques: [{ filas: ['Séneca'] }] },
];

/** `/obras/`: un bloque por Autor, con su nombre de cabecera y sus títulos por fila. */
const OBRAS: GrupoFiltrable[] = [
  {
    bloques: [
      { cabecera: 'Rafael Altamira', filas: ['Historia de la decadencia de España', 'Psicología del pueblo español'] },
      { cabecera: 'Leopoldo Alas', filas: ['La Regenta'] },
    ],
  },
  {
    bloques: [
      { cabecera: 'Miguel de Cervantes', filas: ['Don Quijote de la Mancha', 'Novelas ejemplares'] },
    ],
  },
  { bloques: [{ cabecera: 'Séneca', filas: ['Cartas a Lucilio', 'Sobre la brevedad de la vida'] }] },
];

/** Los textos que quedan, por grupo y bloque, para leer las expectativas de un vistazo. */
function quedan(modelo: GrupoFiltrable[], tecleado: string) {
  const resultado = filtroDe(modelo)(tecleado);
  const textos = modelo.flatMap((grupo, g) =>
    grupo.bloques.flatMap((bloque, b) =>
      bloque.filas.filter((_, f) => resultado.grupos[g].bloques[b].filas[f]),
    ),
  );
  return { resultado, textos };
}

describe('Historia 26.6 — cómo casa el filtro', () => {
  it('sin tildes: «gonzalez» encuentra a Manuel González Prada, por subcadena', () => {
    const { resultado, textos } = quedan(AUTORES, 'gonzalez');
    expect(textos).toEqual(['Manuel González Prada']);
    expect(resultado.filas).toBe(1);
    expect(resultado.vacia).toBe(false);
    // El grupo sin ninguna fila sale entero, con su letra.
    expect(resultado.grupos.map((g) => g.visible)).toEqual([false, true, false, false]);
  });

  it('subcadena y no principio de palabra: «mar» deja a Josefa Amar y Borbón, a Martí y a Marco Aurelio', () => {
    const { textos } = quedan(AUTORES, 'mar');
    expect(textos).toEqual(['Josefa Amar y Borbón', 'José Martí', 'Marco Aurelio']);
  });

  it('mayúsculas y tildes no cuentan: «MARTÍ» y «marti» dejan el mismo conjunto, con José Martí', () => {
    const mayusculas = quedan(AUTORES, 'MARTÍ');
    const llana = quedan(AUTORES, 'marti');
    expect(mayusculas.textos).toEqual(['José Martí']);
    expect(llana.textos).toEqual(mayusculas.textos);
    expect(llana.resultado).toEqual(mayusculas.resultado);
  });

  it('la eñe se pliega: «espana» deja «Historia de la decadencia de España» bajo su Autor', () => {
    const { resultado, textos } = quedan(OBRAS, 'espana');
    // «español» no contiene «espana»: subcadena, no parecido.
    expect(textos).toEqual(['Historia de la decadencia de España']);
    expect(resultado.grupos[0].bloques.map((b) => b.visible)).toEqual([true, false]);
    expect(resultado.grupos[0].bloques[0].filas).toEqual([true, false]);
    expect(resultado.grupos.map((g) => g.visible)).toEqual([true, false, false]);
    expect(resultado.filas).toBe(1);
  });

  it('en `/obras/`, si casa el nombre del Autor quedan su cabecera y todas sus Obras', () => {
    const { resultado, textos } = quedan(OBRAS, 'cervantes');
    expect(textos).toEqual(['Don Quijote de la Mancha', 'Novelas ejemplares']);
    expect(resultado.grupos[1].bloques[0]).toEqual({ visible: true, filas: [true, true] });
    expect(resultado.filas).toBe(2);
  });

  it('en `/obras/`, si solo casa una Obra quedan la cabecera de su Autor y esa Obra', () => {
    const { resultado, textos } = quedan(OBRAS, 'quijote');
    expect(textos).toEqual(['Don Quijote de la Mancha']);
    expect(resultado.grupos[1].bloques[0]).toEqual({ visible: true, filas: [true, false] });
    expect(resultado.filas).toBe(1);
  });

  it('a cero: ningún grupo, ningún bloque, ninguna fila', () => {
    const { resultado } = quedan(OBRAS, 'zzz');
    expect(resultado.filas).toBe(0);
    expect(resultado.vacia).toBe(false);
    expect(resultado.grupos.every((g) => !g.visible && g.bloques.every((b) => !b.visible))).toBe(true);
  });

  it('vacío, solo espacios o solo signos son la consulta vacía: todo vuelve', () => {
    const total = AUTORES.flatMap((g) => g.bloques.flatMap((b) => b.filas)).length;
    for (const tecleado of ['', '   ', '  ¿? ', '«»', '...']) {
      const { resultado } = quedan(AUTORES, tecleado);
      expect(resultado.vacia, JSON.stringify(tecleado)).toBe(true);
      expect(resultado.filas, JSON.stringify(tecleado)).toBe(total);
      expect(resultado.grupos.every((g) => g.visible && g.bloques.every((b) => b.filas.every(Boolean)))).toBe(true);
    }
  });

  it('el texto hostil es solo texto: no casa nada y no rompe', () => {
    const { resultado } = quedan(AUTORES, '<img src=x onerror=alert(1)>');
    expect(resultado.filas).toBe(0);
    expect(resultado.vacia).toBe(false);
  });

  it('el mismo filtro sirve para muchas consultas: lo normalizado una vez no se gasta', () => {
    const filtrar = filtroDe(AUTORES);
    expect(filtrar('seneca').filas).toBe(1);
    expect(filtrar('').filas).toBe(7);
    expect(filtrar('séneca').filas).toBe(1);
  });
});

describe('Historia 26.6 — las frases y el enlace a cero', () => {
  it('las etiquetas visibles del campo', () => {
    expect(ETIQUETA_DEL_FILTRO).toEqual({
      autores: 'Escribe parte del nombre.',
      obras: 'Escribe parte del título o del autor.',
    });
  });

  it('el recuento, con su punto final y sus singulares', () => {
    expect(fraseDelFiltro('autores', 14, 'mar')).toBe('14 autores.');
    expect(fraseDelFiltro('autores', 1, 'gonzalez')).toBe('1 autor.');
    expect(fraseDelFiltro('obras', 13, 'de')).toBe('13 obras.');
    expect(fraseDelFiltro('obras', 1, 'quijote')).toBe('1 obra.');
  });

  it('a cero, la frase de cada Directorio con lo tecleado recortado y tal cual', () => {
    expect(fraseDelFiltro('autores', 0, '  Xochitl ')).toBe('Ningún autor tiene «Xochitl» en el nombre.');
    expect(fraseDelFiltro('obras', 0, 'Ñu')).toBe('Ninguna obra tiene «Ñu» en el título ni en su autor.');
  });

  it('el texto hostil se escribe tal cual en la frase y en el enlace, y la dirección va codificada', () => {
    const hostil = '<img src=x onerror=alert(1)>';
    expect(fraseDelFiltro('autores', 0, hostil)).toBe(`Ningún autor tiene «${hostil}» en el nombre.`);
    expect(textoDeBuscarEnLasCitas(hostil)).toBe(`Buscar «${hostil}» en las citas`);
    const ruta = rutaDeBuscarEnLasCitas('/buscar/', hostil);
    expect(ruta).toBe(`/buscar/?q=${encodeURIComponent(hostil)}`);
    expect(ruta).not.toMatch(/[<>\s]/u);
  });

  it('el enlace a cero lleva a la `/buscar/` que le dan, con lo tecleado recortado en `q`', () => {
    expect(textoDeBuscarEnLasCitas(' don juan ')).toBe('Buscar «don juan» en las citas');
    expect(rutaDeBuscarEnLasCitas('/buscar/', ' don juan ')).toBe('/buscar/?q=don%20juan');
    expect(rutaDeBuscarEnLasCitas('/buscar/', 'a&b#c')).toBe('/buscar/?q=a%26b%23c');
    expect(rutaDeBuscarEnLasCitas('/buscar/', 'España')).toBe('/buscar/?q=Espa%C3%B1a');
  });

  it('los recuentos tienen un solo dueño: `atribucion.ts` reexporta los de `recuentos.ts`', () => {
    expect(recuentoDeAutores).toBe(recuentos.recuentoDeAutores);
    expect(recuentoDeObras).toBe(recuentos.recuentoDeObras);
  });
});

describe('Historia 26.6 — el segundo ritmo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('la pausa de tecleo es la de `DESIGN.md`, unos 700 ms', () => {
    expect(PAUSA_DE_TECLEO_MS).toBe(700);
  });

  it('nada antes de la pausa; una sola escritura tras ella, con la última frase', () => {
    const region = { textContent: '' as string | null };
    const ritmo = ritmoDeTecleo(region, PAUSA_DE_TECLEO_MS);
    ritmo.anunciar('20 autores.');
    vi.advanceTimersByTime(300);
    ritmo.anunciar('14 autores.');
    vi.advanceTimersByTime(PAUSA_DE_TECLEO_MS - 1);
    expect(region.textContent).toBe('');
    vi.advanceTimersByTime(1);
    expect(region.textContent).toBe('14 autores.');
  });

  it('la misma frase no se reescribe: «gonz» y «gonza» con la misma cifra no vuelven a anunciarse', () => {
    const escrituras: string[] = [];
    let actual = '';
    const region = {
      get textContent(): string | null {
        return actual;
      },
      set textContent(valor: string | null) {
        actual = valor ?? '';
        escrituras.push(actual);
      },
    };
    const ritmo = ritmoDeTecleo(region, PAUSA_DE_TECLEO_MS);
    ritmo.anunciar('1 autor.');
    vi.advanceTimersByTime(PAUSA_DE_TECLEO_MS);
    ritmo.anunciar('1 autor.');
    vi.advanceTimersByTime(PAUSA_DE_TECLEO_MS);
    expect(escrituras).toEqual(['1 autor.']);
    ritmo.anunciar('2 autores.');
    vi.advanceTimersByTime(PAUSA_DE_TECLEO_MS);
    expect(escrituras).toEqual(['1 autor.', '2 autores.']);
  });

  it('vaciar deja la región vacía al momento y cancela la escritura pendiente', () => {
    const region = { textContent: '14 autores.' as string | null };
    const ritmo = ritmoDeTecleo(region, PAUSA_DE_TECLEO_MS);
    ritmo.anunciar('1 autor.');
    ritmo.vaciar();
    expect(region.textContent).toBe('');
    vi.advanceTimersByTime(PAUSA_DE_TECLEO_MS * 2);
    expect(region.textContent).toBe('');
  });
});
