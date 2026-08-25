import { describe, expect, it } from 'vitest';

import { derivarDocumento } from '../../tools/lib/documento.ts';

/**
 * Fix 11.1 — una región sin texto no es la región de contenido.
 *
 * Wikisource presenta los libros escaneados **por transclusión**: la página no contiene la
 * obra, la compone incluyendo otras. Y entonces la primera `mw-parser-output` del HTML es un
 * envoltorio vacío, y la obra está en la siguiente.
 *
 * Medido sobre una página real de ensayo:
 *
 *     mw-parser-output [0]  interior 678 caracteres,  texto plano 0
 *     mw-parser-output [1]  interior 29083,           texto plano 20690
 *
 * El lector se quedaba con la primera que casara y devolvía «el documento no trae texto» de
 * una página que trae veinte mil caracteres. **No es un caso raro**: así se presenta hoy buena
 * parte de Wikisource, de modo que la cantera que esto abre no es una obra, es un género de
 * página entero.
 *
 * La regla que se añade es la que dice el nombre: **se sigue buscando mientras la región
 * elegida no traiga texto**. No se cambia el orden de los marcadores —`mw-parser-output`
 * antes que `mw-content-text`, porque el segundo arrastra más cromo—, solo se deja de parar
 * en la primera coincidencia.
 */
describe('Fix 11.1 — la región vacía no detiene la búsqueda', () => {
  const CUERPO =
    'Pon en tu orden, muy alta tu mira, lo más alta que puedas, más alta aún donde tu vista ' +
    'no alcance. Si te dijesen que ese es tu centro, contéstales: mi centro está en mí.';

  const pagina = (interior: string) => `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Adentro - Wikisource</title></head><body>
<h1 id="firstHeading">¡Adentro!</h1>
<div id="mw-content-text">${interior}</div></body></html>`;

  it('una página compuesta por transclusión se versiona igual', () => {
    // La primera región es el envoltorio vacío que deja la transclusión; la segunda, la obra.
    const derivado = derivarDocumento(
      'wikisource-es',
      pagina(
        `<div class="mw-parser-output"><div class="prp-pages-output"></div></div>` +
          `<div class="mw-parser-output"><p>${CUERPO}</p></div>`,
      ),
    );
    expect(derivado.ok && derivado.cuerpo).toContain('mi centro está en mí');
  });

  it('una página normal sigue usando la primera región', () => {
    const derivado = derivarDocumento(
      'wikisource-es',
      pagina(`<div class="mw-parser-output"><p>${CUERPO}</p></div>`),
    );
    expect(derivado.ok && derivado.cuerpo).toContain('Pon en tu orden');
  });

  it('y si ninguna región trae texto, se sigue diciendo que no lo trae', () => {
    // El fallo no se tapa: una página sin obra tiene que seguir deteniendo la recuperación,
    // o se versionarían documentos vacíos contra los que después nada se puede cotejar.
    const derivado = derivarDocumento(
      'wikisource-es',
      pagina('<div class="mw-parser-output"></div><div class="mw-parser-output">   </div>'),
    );
    expect(derivado.ok).toBe(false);
  });
});
