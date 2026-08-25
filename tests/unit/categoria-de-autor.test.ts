import { describe, expect, it } from 'vitest';

import { derivarDeLaDeclaracion, derivarDocumento } from '../../tools/lib/documento.ts';

/**
 * FR-23 — la categoría con que Wikisource clasifica una obra bajo su Autor.
 *
 * Queda de la 64.ª sesión, escrito allí para que se hiciera con sus propias pruebas. Hay
 * páginas —siete de un Autor con cuarenta y siete huecos libres bajo el techo— que declaran
 * a quien firma **dentro de una frase en prosa**:
 *
 *     Discurso de [[Manuel González Prada]] leído el 1 de mayo de 1905 en la ''Federación…''
 *
 * Y eso la puerta lo rechaza a propósito, con razón: un enlace con prosa alrededor es texto,
 * y admitirlo atribuiría la obra a cualquiera que ella nombre de pasada. Pero esas mismas
 * páginas traen, al final del wikitexto:
 *
 *     [[Categoría:Discursos de Manuel González Prada]]
 *
 * Eso ya no es prosa: es un campo estructurado, y la Fuente lo escribe para decir de quién
 * son esos discursos. Es la misma clase de declaración que `|autor=`, en otro sitio.
 *
 * **Lo que hace falta es no leer como Autor lo que no lo es**, y las categorías reales están
 * llenas de trampas: «Obras de teatro» no es un Autor llamado teatro, y «Obras sobre X» dice
 * justamente lo contrario de lo que buscamos. De ahí las dos exigencias:
 *
 *   · la preposición es **`de`**, nunca `sobre`;
 *   · y el nombre tiene que parecer un nombre de persona — **dos palabras o más, con al menos
 *     dos en mayúscula** —, que es lo que deja fuera «teatro», «amor», «Navidad» y «la Edad
 *     Media» sin necesidad de listarlas.
 *
 * Va la **última** de las cuatro formas: el parámetro, la etiqueta y la firma dicen «esto es
 * el autor»; la categoría lo dice de la obra, y por eso cede ante cualquiera de las otras.
 */
describe('FR-23 — la categoría de Wikisource declara al Autor de la obra', () => {
  const CUERPO = 'No sonrían si comenzamos por traducir los versos de un poeta antiguo.';

  const PAGINA = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>El intelectual y el obrero - Wikisource</title></head><body>
<h1 id="firstHeading">El intelectual y el obrero</h1>
<div id="mw-content-text"><div class="mw-parser-output">
<p>${CUERPO}</p>
</div></div></body></html>`;

  function declaracionDe(wikitexto: string, encabezadoDeLaObra?: string): string {
    const derivado = derivarDocumento('wikisource-es', PAGINA, wikitexto, encabezadoDeLaObra);
    if (!derivado.ok) throw new Error(derivado.motivo);
    return derivado.declaracion;
  }

  function autorDe(wikitexto: string, encabezadoDeLaObra?: string): string[] | undefined {
    return derivarDeLaDeclaracion('wikisource-es', declaracionDe(wikitexto, encabezadoDeLaObra))
      .autor?.nombres;
  }

  /** Una página como las de verdad: prosa larga y las categorías al final del todo. */
  const pagina = (categorias: string) =>
    `Discurso de [[Manuel González Prada]] leído el 1 de mayo de 1905.\n\n` +
    `${CUERPO}\n\n${'Relleno de la obra, que es larga. '.repeat(40)}\n\n${categorias}`;

  it('la categoría declara al Autor', () => {
    expect(autorDe(pagina('[[Categoría:Discursos de Manuel González Prada]]'))).toEqual([
      'Manuel González Prada',
    ]);
  });

  it('la encuentra aunque esté al final de un wikitexto largo', () => {
    // Las categorías no viven en el encabezado: van detrás de la obra entera. Un lector que
    // solo mire los primeros caracteres no las ve nunca.
    const larga = `${'Prosa de la obra. '.repeat(400)}\n\n[[Categoría:Ensayos de Juan Montalvo]]`;
    expect(autorDe(larga)).toEqual(['Juan Montalvo']);
  });

  it('se versiona literal, no traducida a un parámetro', () => {
    const declaracion = declaracionDe(pagina('[[Categoría:Discursos de Manuel González Prada]]'));
    expect(declaracion).toContain('[[Categoría:Discursos de Manuel González Prada]]');
    expect(declaracion).not.toContain('|autor');
  });

  it('«Obras de teatro» no es un Autor llamado teatro', () => {
    expect(autorDe(pagina('[[Categoría:Obras de teatro]]'))).toBeUndefined();
  });

  it('«Cuentos de Navidad» tampoco: un nombre de persona no es una palabra suelta', () => {
    expect(autorDe(pagina('[[Categoría:Cuentos de Navidad]]'))).toBeUndefined();
  });

  it('«Obras de la Edad Media» tampoco', () => {
    expect(autorDe(pagina('[[Categoría:Obras de la Edad Media]]'))).toBeUndefined();
  });

  it('«Obras SOBRE alguien» dice lo contrario, y no declara Autor', () => {
    expect(autorDe(pagina('[[Categoría:Obras sobre Manuel González Prada]]'))).toBeUndefined();
  });

  it('las categorías de servicio no declaran a nadie', () => {
    expect(autorDe(pagina('[[Categoría:ES-E]]\n[[Categoría:Textos en español]]'))).toBeUndefined();
  });

  it('el parámetro gana a la categoría', () => {
    const conAmbos =
      `{{Encabezado\n|título=El intelectual y el obrero\n|autor=Manuel González Prada\n}}\n\n` +
      `${CUERPO}\n\n[[Categoría:Discursos de Juan Montalvo]]`;
    expect(autorDe(conAmbos)).toEqual(['Manuel González Prada']);
  });

  it('la firma en negrita también gana a la categoría', () => {
    const conAmbos =
      `'''[[Manuel González Prada]]'''\n\n${CUERPO}\n\n[[Categoría:Discursos de Juan Montalvo]]`;
    expect(autorDe(conAmbos)).toEqual(['Manuel González Prada']);
  });

  it('la categoría de la obra padre no aporta el Autor de la página', () => {
    // Misma dirección que la obra, la firma y el parámetro: si el índice pudiera aportarlo,
    // toda subpágina de una antología heredaría el Autor de su índice.
    expect(
      autorDe(
        `{{Encabezado\n|título = [[Páginas libres]]\n}}\n\n${CUERPO}`,
        `[[Categoría:Ensayos de Manuel González Prada]]`,
      ),
    ).toBeUndefined();
  });
});
