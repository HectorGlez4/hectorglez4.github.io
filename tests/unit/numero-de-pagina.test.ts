import { describe, expect, it } from 'vitest';

import { esAparatoDeLaFuente } from '../../tools/lib/extraccion.ts';

/**
 * FR-24 — el número de página de la edición, dentro de la frase.
 *
 * Cuarto aparato en cuatro sesiones, y el primero que va **dentro** del texto del Autor en
 * vez de ocupar una línea propia:
 *
 *     …vida que envenenase la vida, -61- adoración que produjese el desprecio…
 *
 * Es el folio de la edición transcrita, que Wikisource intercala donde caía en el papel. Y
 * es la misma trampa de siempre: aprobar esa candidata publicaría una Cita con un número de
 * página en medio, y **el cotejo de la 11.2 la daría por buena**, porque ese texto está
 * literal en el documento — lo escribió la Fuente.
 *
 * Medido: seis candidatas en revisión lo traen, y **ninguna Cita publicada**. Se llega a
 * tiempo.
 *
 * **Se descarta la candidata entera; no se le quita el número.** Quitarlo sería alterar el
 * texto —lo que NFR-12 prohíbe— y además dejaría una Cita que ya no aparece literal en su
 * documento, así que la 11.2 la rechazaría después. Perder la sentencia es el precio, y es
 * el mismo que se paga con el resto del aparato.
 *
 * La forma es estrecha: un número **entre guiones y rodeado de espacios**. Un año, un rango
 * «1914-1918» o un guion de inciso no la cumplen.
 */
describe('FR-24 — el folio de la edición no viaja dentro de la Cita', () => {
  it('una frase con el número de página intercalado es aparato', () => {
    expect(
      esAparatoDeLaFuente(
        'Solamente los hechiceros de la ambición pudieron confeccionar corona que quitase ' +
          'corona, vida que envenenase la vida, -61- adoración que produjese el desprecio.',
      ),
    ).toBe(true);
  });

  it('también cuando el folio lleva cuatro cifras', () => {
    expect(esAparatoDeLaFuente('Y así lo dijo, -1204- y nadie le respondió.')).toBe(true);
  });

  it('un rango de años no es un folio', () => {
    expect(esAparatoDeLaFuente('La guerra duró de 1914-1918 y nadie salió intacto.')).toBe(false);
  });

  it('un guion de inciso tampoco', () => {
    expect(
      esAparatoDeLaFuente('El sabio -decía- hace luego lo que el necio deja para el final.'),
    ).toBe(false);
  });

  it('una resta escrita en prosa tampoco', () => {
    // «5 - 3 - 1» no es un folio: los guiones separan números, no encierran uno.
    expect(esAparatoDeLaFuente('Contaba en voz alta: 5 - 3 - 1, y volvía a empezar.')).toBe(false);
  });

  it('y una frase limpia sigue pasando', () => {
    expect(
      esAparatoDeLaFuente('Perder la libertad es de bestias; dejar que nos la quiten, de cobardes.'),
    ).toBe(false);
  });
});
