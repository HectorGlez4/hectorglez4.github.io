import { describe, expect, it } from 'vitest';

import { derivarDocumento } from '../../tools/lib/documento.ts';

/**
 * FR-23 — una página de desambiguación no es una obra, y lo dice ella misma.
 *
 * En la 82.ª sesión se versionó una «obra» de 20 KB que resultó ser una lista de enlaces a
 * otras páginas. La puerta de FR-23 la paró después —«el documento no declara autor», y era
 * verdad: una lista no la firma nadie— pero para entonces el documento ya estaba escrito y
 * hubo que retirarlo a mano.
 *
 * De ahí salió una costumbre: mirar el wikitexto antes de gastar la recuperación. **Una
 * costumbre vive en la cabeza de quien la tiene y caduca con ella**, así que se pasa a la
 * herramienta, que es donde las cosas duran.
 *
 * La señal es estructurada, no una heurística: MediaWiki marca estas páginas con
 * `{{desambiguación}}`, que es exactamente lo que significa «esto no es un texto, es una
 * lista de textos». No se adivina por el tamaño, ni por cuántos enlaces trae, ni por el
 * título.
 *
 * **Y solo cuando el wikitexto ha llegado.** Si no llegó —la Fuente limita la tasa y a veces
 * contesta 503—, no se sabe, y no saber no es motivo para rechazar: se versiona como antes y
 * las puertas de después siguen ahí.
 */
describe('FR-23 — una página de desambiguación no se versiona', () => {
  const CUERPO = 'Al que has de castigar con obras no trates mal con palabras.';

  const PAGINA = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Muerte - Wikisource</title></head><body>
<h1 id="firstHeading">Muerte</h1>
<div id="mw-content-text"><div class="mw-parser-output"><p>${CUERPO}</p></div></div>
</body></html>`;

  it('se rechaza, y el motivo dice qué es', () => {
    const derivado = derivarDocumento(
      'wikisource-es',
      PAGINA,
      `== Cuentos y novelas ==\n* [[Uno]]\n* [[Otro]]\n\n{{desambiguación}}\n`,
    );
    expect(derivado.ok).toBe(false);
    expect(!derivado.ok && derivado.motivo).toMatch(/desambiguaci[óo]n/i);
  });

  it('también sin tilde, que es como la escriben muchas páginas', () => {
    const derivado = derivarDocumento('wikisource-es', PAGINA, '{{desambiguacion}}\n');
    expect(derivado.ok).toBe(false);
  });

  it('una obra normal se versiona igual', () => {
    const derivado = derivarDocumento(
      'wikisource-es',
      PAGINA,
      '{{Encabezado|título=El Quijote|autor=Miguel de Cervantes}}\n\nEn un lugar de la Mancha…',
    );
    expect(derivado.ok).toBe(true);
  });

  it('y sin wikitexto no se sabe, así que no se rechaza', () => {
    // La Fuente limita la tasa y a veces el wikitexto no llega. No saber no es motivo para
    // rechazar: las puertas de después —el Autor, la legibilidad, el cotejo— siguen ahí.
    const derivado = derivarDocumento('wikisource-es', PAGINA);
    expect(derivado.ok).toBe(true);
  });

  it('nombrar la palabra dentro de la obra no la convierte en lista', () => {
    // «desambiguación» entre el texto es una palabra; la plantilla es una declaración.
    const derivado = derivarDocumento(
      'wikisource-es',
      PAGINA,
      '{{Encabezado|título=Ensayo|autor=Miguel de Unamuno}}\n\nHablemos de la desambiguación del lenguaje.',
    );
    expect(derivado.ok).toBe(true);
  });
});
