import { describe, expect, it } from 'vitest';
import {
  MAX_CARACTERES_SLUG_DE_OBRA,
  MAX_ELEMENTOS_RETIRADOS,
  aTextoPlano,
  analizarDocumento,
  añoDeclarado,
  componerDocumento,
  derivarDeLaDeclaracion,
  derivarDocumento,
  nombreDeDocumento,
  resolverEntidades,
} from '../../tools/lib/documento.ts';

/**
 * Historia 11.1 — lo decidible sin red.
 *
 * Todo lo que decide qué se versiona vive en `tools/lib/documento.ts` y se prueba con la
 * página guardada aquí mismo. La única `fetch` del proyecto está en `tools/recuperar.ts`
 * y no interviene en ninguna de estas pruebas.
 */

const WIKISOURCE = `<!DOCTYPE html>
<html class="client-nojs" lang="es" dir="ltr">
<head>
<meta charset="UTF-8"/>
<title>Sobre la brevedad de la vida - Wikisource</title>
<script>document.documentElement.className="client-js";</script>
<style>.mw-body{margin:0}</style>
</head>
<body>
<div id="mw-navigation"><nav><a href="/wiki/Portada">Portada</a> <a href="/wiki/Especial:Aleatoria">P&aacute;gina aleatoria</a></nav></div>
<h1 id="firstHeading" class="firstHeading">Sobre la brevedad de la vida</h1>
<div id="mw-content-text" class="mw-body-content">
<div class="mw-content-ltr mw-parser-output" lang="es" dir="ltr">
<table class="header"><tr><td>Autor: <a href="/wiki/S%C3%A9neca">S&eacute;neca</a></td></tr></table>
<p>A&ntilde;o de publicaci&oacute;n: 49</p>
<p>No es que tengamos poco tiempo para vivir, sino que perdemos una gran parte de &eacute;l.<sup class="reference"><a href="#nota-1">[1]</a></sup></p>
<div class="noprint">Esta obra se encuentra en dominio p&uacute;blico en su pa&iacute;s de origen.</div>
<p>La vida es larga si sabes usarla y aprovecharla como es debido cada jornada.</p>
</div>
<div class="printfooter">Obtenido de &laquo;https://es.wikisource.org/w/index.php?title=X&amp;oldid=123&raquo;</div>
</div>
<div id="catlinks" class="catlinks"><ul><li><a href="/wiki/Categor%C3%ADa:S%C3%A9neca">Categor&iacute;a: S&eacute;neca</a></li><li>1615</li></ul></div>
<footer id="footer"><ul><li>Esta p&aacute;gina se edit&oacute; por &uacute;ltima vez el 12 ene 2020.</li></ul></footer>
</body></html>`;

const GUTENBERG = `The Project Gutenberg eBook of Del sentimiento trágico de la vida

This ebook is for the use of anyone anywhere in the United States and most
other parts of the world at no cost and with almost no restrictions whatsoever.

Title: Del sentimiento trágico de la vida
Author: Miguel de Unamuno
Release date: January 1, 2005 [eBook #7500]
                Most recently updated: October 2, 2014
Original publication: Madrid: Renacimiento, 1913
Language: Spanish

*** START OF THE PROJECT GUTENBERG EBOOK DEL SENTIMIENTO TRÁGICO DE LA VIDA ***

El hombre de carne y hueso, el que nace, sufre y muere, es el sujeto y el
supremo objeto a la vez de toda filosofía que se precie de serlo.

Nada hay menos verdadero que la verdad que se demuestra sin sentirla dentro.

*** END OF THE PROJECT GUTENBERG EBOOK DEL SENTIMIENTO TRÁGICO DE LA VIDA ***

Updated editions will replace the previous one—the old editions will be renamed.
Creating the works from print editions not protected by U.S. copyright law
means that no one owns a United States copyright in these works.`;

describe('Historia 11.1 — la retirada de marcado deja la obra y no el cromo', () => {
  const derivado = derivarDocumento('wikisource-es', WIKISOURCE);
  if (!derivado.ok) throw new Error(derivado.motivo);

  it('conserva el texto de la obra', () => {
    expect(derivado.cuerpo).toContain('No es que tengamos poco tiempo para vivir');
    expect(derivado.cuerpo).toContain('La vida es larga si sabes usarla');
  });

  it('no se lleva la barra lateral, el pie, las categorías ni la nota de licencia', () => {
    // Sin acotar a la región de contenido, cada uno de estos trozos se versionaría como
    // si fuera la obra, y de ahí saldrían candidatas.
    for (const cromo of [
      'Página aleatoria',
      'Obtenido de',
      'Categoría',
      'Esta página se editó',
      'dominio público en su país',
      'Autor: Séneca',
    ]) {
      expect(derivado.cuerpo, cromo).not.toContain(cromo);
    }
  });

  it('no deja rastro de etiquetas, guiones de script ni hojas de estilo', () => {
    expect(derivado.cuerpo).not.toMatch(/<[a-z/!]/i);
    expect(derivado.cuerpo).not.toContain('client-js');
    expect(derivado.cuerpo).not.toContain('margin:0');
    expect(derivado.cuerpo).not.toContain('[1]');
  });

  it('la obra sale del encabezado de la página', () => {
    expect(derivado.obra).toBe('Sobre la brevedad de la vida');
  });

  it('el año sale de la etiqueta que lo declara', () => {
    expect(derivado.año).toBe(49);
  });
});

describe('Historia 11.1 — sin título no se versiona', () => {
  it('una página que no declara título se detiene y lo explica', () => {
    const sinTitulo = WIKISOURCE.replace(/<h1[\s\S]*?<\/h1>/, '').replace(/<title>[\s\S]*?<\/title>/, '');
    const derivado = derivarDocumento('wikisource-es', sinTitulo);
    expect(derivado.ok).toBe(false);
    expect(!derivado.ok && derivado.motivo).toMatch(/no declara título/);
  });

  it('el título del navegador sirve de respaldo, sin el nombre de la Fuente pegado', () => {
    const sinEncabezado = WIKISOURCE.replace(/<h1[\s\S]*?<\/h1>/, '');
    const derivado = derivarDocumento('wikisource-es', sinEncabezado);
    expect(derivado.ok && derivado.obra).toBe('Sobre la brevedad de la vida');
  });

  it('una Fuente sin lector de obra no se deriva a ciegas', () => {
    const derivado = derivarDocumento('cervantes-virtual', WIKISOURCE);
    expect(derivado.ok).toBe(false);
    expect(!derivado.ok && derivado.motivo).toMatch(/No hay lector de obra/);
  });
});

describe('Historia 11.1 — Project Gutenberg se recorta por sus marcas', () => {
  const derivado = derivarDocumento('gutenberg', GUTENBERG);
  if (!derivado.ok) throw new Error(derivado.motivo);

  it('el cuerpo es lo que va entre START y END', () => {
    expect(derivado.cuerpo).toContain('El hombre de carne y hueso');
    expect(derivado.cuerpo).toContain('Nada hay menos verdadero');
  });

  it('el preámbulo y la licencia de Gutenberg quedan fuera del cuerpo', () => {
    for (const legal of [
      'This ebook is for the use of anyone',
      'Updated editions will replace',
      'United States copyright',
      'Release date',
      'Language: Spanish',
    ]) {
      expect(derivado.cuerpo, legal).not.toContain(legal);
    }
  });

  it('la declaración conserva la ficha literal, y solo la ficha', () => {
    // Es de donde vuelven a salir la obra y el año al extraer, así que se versiona
    // literal; el texto legal en inglés no entra, y así no puede llegar a candidata.
    expect(derivado.declaracion).toContain('Title: Del sentimiento trágico de la vida');
    expect(derivado.declaracion).toContain('Original publication: Madrid: Renacimiento, 1913');
    expect(derivado.declaracion).not.toContain('This ebook is for the use of anyone');
    expect(derivado.declaracion).not.toContain('El hombre de carne y hueso');
  });

  it('la obra sale de la cabecera de Gutenberg, sin el «Project Gutenberg eBook of»', () => {
    expect(derivado.obra).toBe('Del sentimiento trágico de la vida');
  });

  it('el año sale de «Original publication», no de «Release date»', () => {
    expect(derivado.año).toBe(1913);
  });

  it('sin «Original publication», la «Release date» NO se convierte en año de la obra', () => {
    /*
     * «Release date» es cuándo Gutenberg publicó el fichero, no cuándo se escribió la
     * obra. Escribirla ahí es la Procedencia inferida que FR-2 prohíbe, y además con una
     * fecha del siglo XXI en una obra de 1913. Sin año exacto, la candidata queda con
     * obra y sin año: procedencia parcial es un estado legítimo.
     */
    const sinOriginal = GUTENBERG.replace(/^Original publication:.*$/m, '');
    const derivado = derivarDocumento('gutenberg', sinOriginal);
    expect(derivado.ok && derivado.año).toBeUndefined();
    expect(derivado.ok && derivado.obra).toBe('Del sentimiento trágico de la vida');
  });
});

describe('Historia 11.1 — sin las marcas de Gutenberg no se versiona nada', () => {
  /*
   * `www.gutenberg.org/ebooks/N` es la dirección que una persona copia del navegador, y
   * está admitida. Es la ficha del catálogo, no la obra: caer al documento entero
   * versionaba el cromo del sitio y el preámbulo legal como si fueran el texto, y de ahí
   * salían candidatas.
   */
  const FICHA = `<!DOCTYPE html><html lang="en"><head>
<title>Del sentimiento trágico de la vida by Miguel de Unamuno | Project Gutenberg</title>
</head><body>
<nav><a href="/">Home</a> <a href="/ebooks/">Book Search</a> <a href="/donate/">Donate</a></nav>
<h1>Del sentimiento trágico de la vida</h1>
<table class="bibrec"><tr><th>Author</th><td>Unamuno, Miguel de</td></tr>
<tr><th>Release Date</th><td>Jan 1, 2005</td></tr></table>
<div id="download">Read this book online: HTML5, EPUB3, Plain Text UTF-8</div>
<footer>Project Gutenberg is a registered trademark.</footer>
</body></html>`;

  it('la ficha del catálogo se rechaza y explica qué vista hace falta', () => {
    const derivado = derivarDocumento('gutenberg', FICHA);
    expect(derivado.ok).toBe(false);
    expect(!derivado.ok && derivado.motivo).toMatch(/ficha del catálogo/);
    expect(!derivado.ok && derivado.motivo).toMatch(/texto plano/);
  });

  it('un documento que abre con START y no cierra con END tampoco se versiona a medias', () => {
    const sinCierre = GUTENBERG.replace(/\*\*\* END OF[\s\S]*$/, '');
    const derivado = derivarDocumento('gutenberg', sinCierre);
    expect(derivado.ok).toBe(false);
    expect(!derivado.ok && derivado.motivo).toMatch(/no cierra/);
  });

  it('una página de Wikisource sin región de contenido tampoco', () => {
    const sinRegion = WIKISOURCE.replace(/mw-parser-output/g, 'x').replace(/mw-content-text/g, 'y');
    const derivado = derivarDocumento('wikisource-es', sinRegion);
    expect(derivado.ok).toBe(false);
    expect(!derivado.ok && derivado.motivo).toMatch(/región de contenido/);
  });
});

describe('Historia 11.1 — retirar el cromo no se rinde en silencio', () => {
  it('agotar el tope de elementos es un error, no medio documento', () => {
    // Devolver el marcado a medio limpiar versionaría media barra lateral como obra, y
    // nadie mira un documento de 300 KB para ver dónde dejó de limpiarse.
    const notas = '<sup class="reference"><a href="#n">[1]</a></sup>'.repeat(
      MAX_ELEMENTOS_RETIRADOS + 1,
    );
    const derivado = derivarDocumento(
      'wikisource-es',
      `<html><body><h1 id="firstHeading">Obra</h1>
<div class="mw-parser-output"><p>Texto de la obra.${notas}</p></div></body></html>`,
    );

    expect(derivado.ok).toBe(false);
    expect(!derivado.ok && derivado.motivo).toMatch(/sin terminar/);
  });

  it('una página con muchas notas al pie, pero por debajo del tope, sí se limpia', () => {
    const notas = '<sup class="reference"><a href="#n">[1]</a></sup>'.repeat(300);
    const derivado = derivarDocumento(
      'wikisource-es',
      `<html><body><h1 id="firstHeading">Obra</h1>
<div class="mw-parser-output"><p>No es que tengamos poco tiempo para vivir, sino que perdemos parte.${notas}</p></div></body></html>`,
    );

    expect(derivado.ok).toBe(true);
    expect(derivado.ok && derivado.cuerpo).not.toContain('[1]');
  });
});

describe('Historia 11.1 — el año se deriva de la región limpia, no de la página entera', () => {
  it('una etiqueta de año del cromo no le gana a la de la obra', () => {
    /*
     * El navbox y la cabecera del sitio quedan fuera de la región de contenido. Cuando el
     * año se leía de la página entera, la etiqueta del cromo aparecía antes y ganaba.
     */
    const derivado = derivarDocumento(
      'wikisource-es',
      `<html><head><title>Obra - Wikisource</title></head><body>
<div id="mw-navigation"><p>Año de publicación: 1999</p></div>
<h1 id="firstHeading">Sobre la brevedad de la vida</h1>
<div class="mw-parser-output">
<div class="navbox"><p>Año de publicación: 1888</p></div>
<p>Año de publicación: 49</p>
<p>No es que tengamos poco tiempo para vivir, sino que perdemos una gran parte de él.</p>
</div></body></html>`,
    );

    expect(derivado.ok && derivado.año).toBe(49);
  });
});

describe('Historia 11.1 — la etiqueta de año solo mira su vecindad', () => {
  const conEtiquetaSuelta = (lineas: string[]) => `<!DOCTYPE html>
<html><head><title>Obra - Wikisource</title></head><body>
<h1 id="firstHeading">Obra de prueba</h1>
<div class="mw-parser-output">
${lineas.map((l) => `<p>${l}</p>`).join('\n')}
<p>No es que tengamos poco tiempo para vivir, sino que perdemos una gran parte de él.</p>
</div></body></html>`;

  it('una etiqueta suelta toma el año de la línea adyacente', () => {
    const derivado = derivarDocumento('wikisource-es', conEtiquetaSuelta(['Año de publicación:', '49']));
    expect(derivado.ok && derivado.año).toBe(49);
  });

  it('un número a varias líneas de la etiqueta no es un año declarado', () => {
    /*
     * «La siguiente línea no vacía» a cualquier distancia convertía en año de la obra el
     * primer número del cromo de la página. Aquí 1943 es el año de una traducción que
     * está tres líneas más abajo, y no es el año de la obra.
     */
    const derivado = derivarDocumento(
      'wikisource-es',
      conEtiquetaSuelta(['Año de publicación:', 'Séneca', 'Traducción de Lorenzo Riber', '1943']),
    );
    expect(derivado.ok && derivado.año).toBeUndefined();
  });

  it('un año aproximado junto a la etiqueta tampoco se escribe', () => {
    for (const declarado of ['c. 1615', '1615?', '1615-1620', 'hacia 1615', 'siglo XVII', '49 a. C.']) {
      const derivado = derivarDocumento('wikisource-es', conEtiquetaSuelta([`Año de publicación: ${declarado}`]));
      expect(derivado.ok && derivado.año, declarado).toBeUndefined();
    }
  });
});

describe('Historia 11.1 — el año declarado de un fragmento', () => {
  it.each([
    ['Madrid: Renacimiento, 1913', 1913],
    ['1913', 1913],
    ['49', 49],
    ['c. 1615', undefined],
    ['1615-1620', undefined],
    ['January 1, 2005 [eBook #7500]', undefined],
    ['', undefined],
    ['sin fecha', undefined],
  ])('«%s» da %s', (fragmento, esperado) => {
    expect(añoDeclarado(fragmento)).toBe(esperado);
  });
});

describe('Historia 11.1 — las entidades se resuelven enteras o no se tocan', () => {
  it('resuelve las nombradas y las numéricas', () => {
    expect(aTextoPlano('<p>Se&ntilde;or &#233;xito &#x41;lfa</p>')).toBe('Señor éxito Alfa');
  });

  it('una entidad desconocida se deja entera, nunca a medias', () => {
    // A medias («&Aacut» + «e;») el texto ya no es ni el de la Fuente ni uno legible, y
    // se versionaría así para siempre.
    expect(aTextoPlano('<p>&noexiste; y &amp;</p>')).toBe('&noexiste; y &');
  });

  it('lo que la Fuente escapó como texto sigue siendo texto', () => {
    // `&lt;p&gt;` es el texto «<p>», no una etiqueta: resolverlo antes de retirar el
    // marcado lo habría convertido en una etiqueta que el retirado se come.
    expect(aTextoPlano('<p>&lt;p&gt;hola&lt;/p&gt;</p>')).toBe('<p>hola</p>');
    expect(aTextoPlano('<p>&amp;lt;</p>')).toBe('&lt;');
  });

  it('la primera pasada conserva las entidades que falsearían el marcado', () => {
    expect(resolverEntidades('&lt;b&gt; &ntilde;', true)).toBe('&lt;b&gt; ñ');
    expect(resolverEntidades('&lt;b&gt; &ntilde;', false)).toBe('<b> ñ');
  });
});

describe('Historia 11.1 — el nombre del documento', () => {
  it('es {id-de-fuente}--{slug-de-obra}', () => {
    expect(nombreDeDocumento('gutenberg', 'Del sentimiento trágico de la vida')).toBe(
      'gutenberg--del-sentimiento-tragico-de-la-vida',
    );
    expect(nombreDeDocumento('wikisource-es', 'Sobre la brevedad de la vida')).toBe(
      'wikisource-es--sobre-la-brevedad-de-la-vida',
    );
  });

  it('un título que no deja ni una letra no da nombre', () => {
    // `normalizar` no retira `·` ni los símbolos sueltos, así que «···» produce un slug
    // no vacío y sin nombre. El fichero resultante no lo volvería a encontrar nadie.
    for (const titulo of ['«···»', '···', '   ', '¿?', '—']) {
      expect(nombreDeDocumento('gutenberg', titulo), titulo).toBeUndefined();
    }
  });

  it('acota la longitud sin partir una palabra por la mitad', () => {
    const largo = 'Historia general de las cosas de Nueva España escrita por Fray Bernardino de Sahagún';
    const nombre = nombreDeDocumento('wikisource-es', largo);
    expect(nombre).toBeDefined();
    const slug = nombre!.slice('wikisource-es--'.length);
    expect(slug.length).toBeLessThanOrEqual(MAX_CARACTERES_SLUG_DE_OBRA);
    expect(slug).not.toMatch(/^-|-$/);
    expect(largo.toLowerCase()).toContain(slug.split('-').pop()!);
  });

  it('un identificador de Fuente que no es un identificador no da nombre', () => {
    expect(nombreDeDocumento('../../etc/passwd', 'Obra')).toBeUndefined();
    expect(nombreDeDocumento('con espacio', 'Obra')).toBeUndefined();
  });
});

describe('Historia 11.1 — el documento versionado tiene tres zonas', () => {
  const cabecera = {
    fuente: 'gutenberg',
    obra: 'Del sentimiento trágico de la vida',
    año: 1913,
    url: 'https://www.gutenberg.org/ebooks/7500',
    recuperado: '2026-08-19',
  };

  const DECLARACION = [
    'Title: Del sentimiento trágico de la vida',
    'Original publication: Madrid: Renacimiento, 1913',
  ].join('\n');

  it('compone cabecera, declaración y cuerpo, y se vuelve a leer igual', () => {
    const documento = componerDocumento(cabecera, DECLARACION, 'El hombre de carne y hueso.');
    expect(documento.split('\n').filter((l) => l === '---')).toHaveLength(2);

    const analizado = analizarDocumento(documento);
    expect(analizado?.cabecera).toEqual(cabecera);
    expect(analizado?.declaracion).toBe(DECLARACION);
    expect(analizado?.cuerpo.trim()).toBe('El hombre de carne y hueso.');
  });

  it('la obra y el año salen de la declaración, no de la cabecera', () => {
    /*
     * El nombre del fichero ata la Fuente y la obra, y dejaba el año suelto: un documento
     * realmente recuperado al que se le editaba `año: 1492` producía candidatas con 1492.
     * La cabecera es registro de auditoría; lo que llega a una candidata sale de aquí.
     */
    const derivado = derivarDeLaDeclaracion('gutenberg', DECLARACION);
    expect(derivado.obra).toBe('Del sentimiento trágico de la vida');
    expect(derivado.año).toBe(1913);

    // Y manipular la cabecera no cambia lo derivado: no participa.
    const documento = componerDocumento({ ...cabecera, año: 1492 }, DECLARACION, 'Cuerpo.');
    const analizado = analizarDocumento(documento);
    expect(analizado?.cabecera.año).toBe(1492);
    expect(derivarDeLaDeclaracion('gutenberg', analizado!.declaracion).año).toBe(1913);
  });

  it('sin año exacto la línea se omite: nunca se escribe vacía', () => {
    const { año: _, ...sinAño } = cabecera;
    const documento = componerDocumento(sinAño, 'Title: X', 'Cuerpo.');
    expect(documento).not.toMatch(/^a[ñn]o:/m);

    const analizado = analizarDocumento(documento);
    expect(analizado?.cabecera).not.toHaveProperty('año');
  });

  it('la dirección pedida se guarda aparte cuando no es la final', () => {
    // Sin ella, una Fuente que redirige rompía la reutilización: la siguiente ejecución
    // traía la dirección original y no encontraba el documento ya versionado.
    const conRedireccion = { ...cabecera, pedido: 'https://gutenberg.org/ebooks/7500' };
    const analizado = analizarDocumento(componerDocumento(conRedireccion, 'Title: X', 'Cuerpo.'));
    expect(analizado?.cabecera.pedido).toBe('https://gutenberg.org/ebooks/7500');

    const sinRedireccion = analizarDocumento(componerDocumento(cabecera, 'Title: X', 'Cuerpo.'));
    expect(sinRedireccion?.cabecera).not.toHaveProperty('pedido');
  });

  it('un fichero sin las dos separaciones no es un documento de Fuente', () => {
    expect(analizarDocumento('fuente: gutenberg\nobra: X\n')).toBeUndefined();
    expect(analizarDocumento('cualquier cosa')).toBeUndefined();
    // Solo una separación: es el formato de dos zonas, que ya no se lee.
    expect(analizarDocumento('fuente: g\nobra: X\nurl: u\nrecuperado: r\n---\ncuerpo')).toBeUndefined();
  });

  it('falta un campo de la cabecera y no se lee', () => {
    expect(analizarDocumento('fuente: gutenberg\nobra: X\n---\nTitle: X\n---\ncuerpo')).toBeUndefined();
  });

  it('una línea de año que no es un año exacto invalida el documento', () => {
    const documento = componerDocumento(cabecera, DECLARACION, 'Cuerpo.').replace(
      'año: 1913',
      'año: c. 1913',
    );
    expect(analizarDocumento(documento)).toBeUndefined();
  });

  it('un salto de línea en la obra no puede partir la cabecera', () => {
    const documento = componerDocumento(
      { ...cabecera, obra: 'Obra\n---\nurl: https://malo.example' },
      DECLARACION,
      'Cuerpo.',
    );
    const analizado = analizarDocumento(documento);
    expect(analizado?.cabecera.url).toBe(cabecera.url);
    expect(analizado?.cabecera.obra).toBe('Obra --- url: https://malo.example');
  });

  it('una separación dentro de la declaración no puede mover el corte', () => {
    const analizado = analizarDocumento(
      componerDocumento(cabecera, `Title: X\n---\nOriginal publication: 1913`, 'Cuerpo.'),
    );
    expect(analizado?.cuerpo.trim()).toBe('Cuerpo.');
  });

  it('una separación dentro del cuerpo se queda en el cuerpo', () => {
    const analizado = analizarDocumento(
      componerDocumento(cabecera, DECLARACION, 'Primera parte.\n---\nSegunda parte.'),
    );
    expect(analizado?.cuerpo).toContain('Primera parte.');
    expect(analizado?.cuerpo).toContain('Segunda parte.');
  });
});
