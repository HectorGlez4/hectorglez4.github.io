import { describe, expect, it } from 'vitest';
import { edicionesPorFormato, type EdicionEnVenta } from '../../src/lib/ediciones.ts';

/**
 * Historia 33.2 — `edicionesPorFormato`, la única regla del reparto de las ediciones en venta:
 * «Electrónica» antes que «Impresa», dentro por el orden de las tiendas y, a igual tienda, por el
 * de la ficha; sin grupos vacíos. Pura: las tiendas son claves inventadas, nunca `TIENDAS`.
 */

const ed = (formato: EdicionEnVenta['formato'], claveDeTienda: string, href: string): EdicionEnVenta => ({
  href: `https://${claveDeTienda}.example/${href}`,
  formato,
  tienda: `Tienda ${claveDeTienda.toUpperCase()}`,
  claveDeTienda,
});

const resumen = (grupos: ReturnType<typeof edicionesPorFormato>) =>
  grupos.map((g) => [g.rotulo, g.ediciones.map((e) => `${e.formato}-${e.claveDeTienda}-${e.href.split('/').pop()}`)]);

describe('Historia 33.2 — edicionesPorFormato', () => {
  it('dos formatos y dos tiendas: «Electrónica» primero, y dentro por el orden de las tiendas', () => {
    const grupos = edicionesPorFormato(
      [ed('impresa', 'b', '1'), ed('electronica', 'a', '2'), ed('impresa', 'a', '3'), ed('electronica', 'b', '4')],
      ['a', 'b'],
    );
    expect(resumen(grupos)).toEqual([
      ['Electrónica', ['electronica-a-2', 'electronica-b-4']],
      ['Impresa', ['impresa-a-3', 'impresa-b-1']],
    ]);
    expect(grupos.map((g) => g.formato)).toEqual(['electronica', 'impresa']);
  });

  it('el orden de las tiendas manda sobre el de la ficha, aunque la ficha empiece por otra', () => {
    const grupos = edicionesPorFormato([ed('impresa', 'a', '1'), ed('impresa', 'b', '2')], ['b', 'a']);
    expect(resumen(grupos)).toEqual([['Impresa', ['impresa-b-2', 'impresa-a-1']]]);
  });

  it('dos ediciones de una tienda conservan el orden de la ficha', () => {
    const grupos = edicionesPorFormato(
      [ed('impresa', 'a', 'A1'), ed('impresa', 'b', 'B'), ed('impresa', 'a', 'A2')],
      ['a', 'b'],
    );
    expect(resumen(grupos)).toEqual([['Impresa', ['impresa-a-A1', 'impresa-a-A2', 'impresa-b-B']]]);
  });

  it('un formato vacío no da grupo', () => {
    expect(resumen(edicionesPorFormato([ed('impresa', 'a', '1')], ['a']))).toEqual([['Impresa', ['impresa-a-1']]]);
    expect(resumen(edicionesPorFormato([ed('electronica', 'a', '1')], ['a']))).toEqual([
      ['Electrónica', ['electronica-a-1']],
    ]);
  });

  it('sin ediciones, ningún grupo', () => {
    expect(edicionesPorFormato([], ['a'])).toEqual([]);
    expect(edicionesPorFormato([], [])).toEqual([]);
  });

  it('una tienda que no está en el orden lanza nombrando su clave', () => {
    expect(() => edicionesPorFormato([ed('impresa', 'a', '1'), ed('impresa', 'z', '2')], ['a'])).toThrow('«z»');
  });

  it('un formato sin grupo lanza nombrándolo, en vez de dejar sus ediciones fuera en silencio', () => {
    const ajena = { ...ed('impresa', 'a', '1'), formato: 'audiolibro' } as unknown as EdicionEnVenta;
    expect(() => edicionesPorFormato([ed('impresa', 'a', '2'), ajena], ['a'])).toThrow('«audiolibro»');
  });

  it('no muta la lista que recibe', () => {
    const lista = [ed('impresa', 'b', '1'), ed('impresa', 'a', '2')];
    const copia = [...lista];
    edicionesPorFormato(lista, ['a', 'b']);
    expect(lista).toEqual(copia);
  });
});
