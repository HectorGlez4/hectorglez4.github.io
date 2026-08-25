import { describe, expect, it } from 'vitest';

import { derivarDeLaDeclaracion, derivarDocumento } from '../../tools/lib/documento.ts';

/**
 * FR-23 — la firma en negrita de las páginas sin plantilla.
 *
 * «Marco Bruto» —222 KB de Quevedo, y dieciséis obras suyas más en la misma forma— no
 * lleva `{{Encabezado}}`: es una página anterior a la plantilla, y declara a su Autor
 * como Wikisource lo hacía entonces, en su primera línea y en negrita:
 *
 *     '''[[Francisco de Quevedo]]'''
 *
 * El lector solo sabía leer `|autor=` y la línea etiquetada «Autor:», así que el informe
 * decía «el documento no declara autor» de un documento que lo declara en su renglón
 * primero. La puerta de la 23 no actuaba, y la atribución se apoyaba entera en la orden.
 *
 * Se versiona **el literal**, no un `|autor=` traducido: la declaración guarda lo que la
 * Fuente escribió y el lector interpreta, y ese reparto es lo que impide que la
 * declaración se convierta en un campo editable a mano.
 *
 * La forma se reconoce **estrecha a propósito** —negrita, un enlace, y nada más en la
 * línea—, y donde no se reconozca la puerta se queda muda, que es como estaba.
 */
describe('FR-23 — la firma en negrita declara al Autor en las páginas sin plantilla', () => {
  const CUERPO = 'Marco Bruto fue por sus virtudes el único blasón de la república romana.';

  const PAGINA = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Marco Bruto - Wikisource</title></head><body>
<h1 id="firstHeading">Marco Bruto</h1>
<div id="mw-content-text"><div class="mw-parser-output">
<p>${CUERPO}</p>
</div></div></body></html>`;

  /** La declaración versionada, que es lo único que `extraer` vuelve a leer. */
  function declaracionDe(wikitexto: string, encabezadoDeLaObra?: string): string {
    const derivado = derivarDocumento('wikisource-es', PAGINA, wikitexto, encabezadoDeLaObra);
    if (!derivado.ok) throw new Error(derivado.motivo);
    return derivado.declaracion;
  }

  /**
   * El Autor por el camino de la extracción: de la declaración versionada, no del HTML.
   * Contra `derivarDocumento` las negativas pasaban en vano —no devuelve Autor—, y una
   * prueba que no puede fallar no vigila nada.
   */
  function autorDe(wikitexto: string, encabezadoDeLaObra?: string): string[] | undefined {
    return derivarDeLaDeclaracion('wikisource-es', declaracionDe(wikitexto, encabezadoDeLaObra))
      .autor?.nombres;
  }

  it('la firma de la primera línea declara al Autor', () => {
    expect(
      autorDe(`'''[[Francisco de Quevedo]]'''\n\n''VIDA DE MARCO BRUTO''\n\n${CUERPO}`),
    ).toEqual(['Francisco de Quevedo']);
  });

  it('la firma se versiona literal, no traducida a un parámetro', () => {
    const declaracion = declaracionDe(`'''[[Francisco de Quevedo]]'''\n\n${CUERPO}`);
    expect(declaracion).toContain("'''[[Francisco de Quevedo]]'''");
    expect(declaracion).not.toContain('|autor');
  });

  it('la primera línea de la declaración sigue siendo el título', () => {
    const declaracion = declaracionDe(`'''[[Francisco de Quevedo]]'''\n\n${CUERPO}`);
    expect(declaracion.split('\n')[0]).toBe('Marco Bruto');
  });

  it('una negrita que no es enlace no declara a nadie', () => {
    // «'''VIDA DE MARCO BRUTO'''» es el título de la obra en negrita, no una firma.
    expect(autorDe(`'''VIDA DE MARCO BRUTO'''\n\n${CUERPO}`)).toBeUndefined();
  });

  it('una línea con la firma y algo más no declara a nadie', () => {
    // En cuanto la línea lleva prosa alrededor deja de ser una firma y pasa a ser texto,
    // y de ahí a tomar por Autor a cualquiera que la obra nombre hay un paso.
    expect(
      autorDe(`Traducido por '''[[Francisco de Quevedo]]''' del texto de Plutarco.\n\n${CUERPO}`),
    ).toBeUndefined();
  });

  it('el parámetro gana a la firma cuando la página trae los dos', () => {
    // El parámetro es donde el dato vive de verdad, y donde dos Autores se declaran por
    // separado. La firma es el respaldo de las páginas que no tienen plantilla.
    expect(
      autorDe(
        `'''[[Plutarco]]'''\n{{Encabezado\n|título=Marco Bruto\n|autor=Francisco de Quevedo\n}}\n\n${CUERPO}`,
      ),
    ).toEqual(['Francisco de Quevedo']);
  });

  it('la firma de la obra padre no aporta el Autor de la página', () => {
    // Misma dirección que la obra y por el mismo motivo: si el índice pudiera aportarlo,
    // toda subpágina de una antología heredaría el Autor de su índice.
    expect(
      autorDe(
        `{{Encabezado\n|título = [[Obras festivas]]\n}}\n\n${CUERPO}`,
        `'''[[Francisco de Quevedo]]'''\n\nÍndice.`,
      ),
    ).toBeUndefined();
  });
});
