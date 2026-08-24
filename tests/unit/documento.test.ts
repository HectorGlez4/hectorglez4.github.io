import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import {
  MARCA_DE_LA_OBRA,
  MAX_CARACTERES_SLUG_DE_OBRA,
  MAX_ELEMENTOS_RETIRADOS,
  MAX_LINEAS_DE_ENCABEZADO,
  aTextoPlano,
  analizarDocumento,
  añoDeclarado,
  componerDocumento,
  derivarDeLaDeclaracion,
  derivarDocumento,
  destinoDeEnlaceAbsoluto,
  lineasDeEncabezadoDeWikitexto,
  paginaDeLaObraDeclarada,
  nombreDeDocumento,
  autoresDeclarados,
  esElMismoAutor,
  resolverEntidades,
  tituloDeclarado,
  tokensDeNombreDeAutor,
  ultimoAñoPosible,
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

/**
 * Fix 11.1b — el año de Wikisource sale del encabezado del wikitexto.
 *
 * El lector que buscaba una línea «Año:» en la página renderizada no podía dispararse
 * nunca: Wikisource no la renderiza. El dato vive en los parámetros de la plantilla de
 * encabezado del wikitexto, y de ahí sale ahora, versionado literal en la declaración.
 */
describe('Fix 11.1b — el encabezado del wikitexto declara el año', () => {
  const PAGINA = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Triste - Wikisource</title></head><body>
<h1 id="firstHeading">Triste</h1>
<div id="mw-content-text"><div class="mw-parser-output">
<p>Adi&oacute;s, dijo la voz; y el alma m&iacute;a, temblando de dolor, se estremec&iacute;a.</p>
</div></div></body></html>`;

  const encabezado = (año: string) => `{{encabezado
|título=Triste
|autor=Amado Nervo
|año = ${año}
|notas=Del libro «Los jardines interiores».
}}

Adiós, dijo la voz; y el alma mía,`;

  it('la obra sale con año, y el año es el que declara el wikitexto', () => {
    const derivado = derivarDocumento('wikisource-es', PAGINA, encabezado('1905'));
    expect(derivado.ok && derivado.obra).toBe('Triste');
    expect(derivado.ok && derivado.año).toBe(1905);
  });

  it('las líneas del encabezado se versionan literales, y solo el metadato', () => {
    /*
     * Guardar «año: 1905» ya interpretado convertiría la declaración en una cabecera
     * editable, que es justo la puerta que la 11.1 cerró. Y `|notas=` no entra: puede
     * traer párrafos de prosa —con sus propias etiquetas «Año:» dentro— y esa prosa
     * acabaría en la zona de la que salen la obra y el año.
     */
    const derivado = derivarDocumento('wikisource-es', PAGINA, encabezado('1905'));
    expect(derivado.ok && derivado.declaracion).toContain('|año = 1905');
    expect(derivado.ok && derivado.declaracion).toContain('|autor=Amado Nervo');
    expect(derivado.ok && derivado.declaracion).not.toContain('jardines interiores');
    // La primera línea sigue siendo el título, que es de donde sale la obra.
    expect(derivado.ok && derivado.declaracion.split('\n')[0]).toBe('Triste');
  });

  it('el año que deriva la recuperación es el mismo que deriva la extracción', () => {
    /*
     * Es la puerta de la 11.1: la obra y el año se vuelven a derivar al extraer, de la
     * declaración que el documento conserva, para que componer el documento a mano no sea
     * más rápido que recuperarlo. Los dos derivados tienen que coincidir.
     */
    const derivado = derivarDocumento('wikisource-es', PAGINA, encabezado('1905'));
    expect(derivado.ok).toBe(true);
    if (!derivado.ok) return;

    const versionado = componerDocumento(
      {
        fuente: 'wikisource-es',
        obra: derivado.obra,
        año: derivado.año,
        url: 'https://es.wikisource.org/wiki/Triste_(Nervo)',
        recuperado: '2026-08-20',
      },
      derivado.declaracion,
      derivado.cuerpo,
    );

    const analizado = analizarDocumento(versionado);
    expect(analizado).toBeDefined();
    const reDerivado = derivarDeLaDeclaracion('wikisource-es', analizado!.declaracion);
    expect(reDerivado.obra).toBe(derivado.obra);
    expect(reDerivado.año).toBe(derivado.año);
    expect(reDerivado.año).toBe(1905);
  });

  it('un encabezado que no declara año deja la obra sin año, sin error', () => {
    const sinAño = `{{encabezado\n|título=En paz\n|autor=Amado Nervo\n}}\n\nMuy cerca de mi ocaso,`;
    const derivado = derivarDocumento('wikisource-es', PAGINA, sinAño);
    expect(derivado.ok).toBe(true);
    // La obra sale del `|título` del encabezado, que aquí no es el título de la página.
    expect(derivado.ok && derivado.obra).toBe('En paz');
    expect(derivado.ok && derivado.año).toBeUndefined();
  });

  it('sin wikitexto ninguno la recuperación sigue, con obra y sin año', () => {
    // Un metadato que falta no es un fallo: si la segunda petición no llega, se versiona
    // igual y la candidata queda con procedencia parcial, que es un estado legítimo.
    const derivado = derivarDocumento('wikisource-es', PAGINA);
    expect(derivado.ok).toBe(true);
    expect(derivado.ok && derivado.obra).toBe('Triste');
    expect(derivado.ok && derivado.año).toBeUndefined();
  });

  it.each(['hacia 1905', 'c. 1905', '180?', '1905-1910', 'siglo XX'])(
    'un año aproximado («%s») deja la obra sin año',
    (declarado) => {
      const derivado = derivarDocumento('wikisource-es', PAGINA, encabezado(declarado));
      expect(derivado.ok && derivado.año).toBeUndefined();
    },
  );

  it.each(['3050', '0', 'MCMV', 'sin fecha'])(
    'un año imposible («%s») deja la obra sin año',
    (declarado) => {
      const derivado = derivarDocumento('wikisource-es', PAGINA, encabezado(declarado));
      expect(derivado.ok && derivado.año).toBeUndefined();
    },
  );

  it('la forma de una sola línea también declara el año', () => {
    // `{{Encabezado|título=…|año=1909}}` es tan común como la de un parámetro por línea.
    const inline = `{{Encabezado|título=Motivos de Proteo|autor=José Enrique Rodó|año=1909}}\nTexto.`;
    const derivado = derivarDocumento('wikisource-es', PAGINA, inline);
    expect(derivado.ok && derivado.año).toBe(1909);
    expect(derivado.ok && derivado.declaracion).toContain('|año=1909');
  });

  it('un parámetro de año vacío no toma el número del parámetro de al lado', () => {
    // Un parámetro declara su valor en su propia línea. Mirar la siguiente convertiría
    // «|volumen = 2» en el año de la obra.
    const derivado = derivarDocumento(
      'wikisource-es',
      PAGINA,
      `{{encabezado\n|título=Triste\n|año =\n|edición = 2\n}}`,
    );
    expect(derivado.ok && derivado.año).toBeUndefined();
  });

  it('el encabezado se lee de la cabeza del wikitexto, no de la obra entera', () => {
    /*
     * En una obra larga el wikitexto son megabytes, y un verso que empiece por «|año =»
     * dentro de una tabla a mitad del poema no es la declaración de la Fuente.
     */
    const lejos = `{{encabezado\n|título=Triste\n}}\n${'x'.repeat(30_000)}\n{{tabla\n|año = 1700\n}}`;
    expect(lineasDeEncabezadoDeWikitexto(lejos)).not.toContain('|año = 1700');
  });

  it('acota cuántas líneas del encabezado entran en la declaración', () => {
    const muchos = Array.from({ length: 60 }, (_, i) => `|autor=Autor ${i}`).join('\n');
    const lineas = lineasDeEncabezadoDeWikitexto(`{{encabezado\n${muchos}\n}}`);
    expect(lineas.length).toBeLessThanOrEqual(MAX_LINEAS_DE_ENCABEZADO);
  });

  it('un wikitexto sin plantilla de encabezado no aporta ninguna línea', () => {
    expect(lineasDeEncabezadoDeWikitexto('Adiós, dijo la voz; y el alma mía,')).toEqual([]);
  });
});

describe('Fix 11.1b — un año en el futuro no es un año de publicación', () => {
  it('el año corriente se admite y el siguiente no', () => {
    const corriente = ultimoAñoPosible();
    expect(añoDeclarado(String(corriente))).toBe(corriente);
    expect(añoDeclarado(String(corriente + 1))).toBeUndefined();
  });

  it('el año cero tampoco', () => {
    expect(añoDeclarado('0')).toBeUndefined();
    expect(añoDeclarado('1')).toBe(1);
  });
});

describe('Fix 11.1b — un documento versionado antes del cambio se sigue leyendo', () => {
  /*
   * El documento que la 11.1 dejó en `corpus/fuentes/` declara el año con la etiqueta de
   * la página renderizada. Cambiar el formato de forma que dejara de analizarse
   * invalidaría todo lo ya versionado, y el texto de aquí está congelado a propósito: no
   * se compone con `componerDocumento`, para que un cambio en el compositor no lo siga.
   */
  const ANTIGUO = [
    'fuente: wikisource-es',
    'obra: Sobre la brevedad de la vida',
    'año: 49',
    'url: https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
    'recuperado: 2026-08-19',
    '---',
    'Sobre la brevedad de la vida',
    'Año de publicación: 49',
    '---',
    'No es que tengamos poco tiempo para vivir, sino que perdemos una gran parte de él.',
    '',
  ].join('\n');

  it('se sigue analizando en sus tres zonas', () => {
    const analizado = analizarDocumento(ANTIGUO);
    expect(analizado?.cabecera.obra).toBe('Sobre la brevedad de la vida');
    expect(analizado?.cabecera.año).toBe(49);
    expect(analizado?.declaracion).toBe('Sobre la brevedad de la vida\nAño de publicación: 49');
    expect(analizado?.cuerpo).toContain('No es que tengamos poco tiempo');
  });

  it('y su obra y su año se siguen derivando de la declaración', () => {
    const analizado = analizarDocumento(ANTIGUO);
    const derivado = derivarDeLaDeclaracion('wikisource-es', analizado!.declaracion);
    expect(derivado.obra).toBe('Sobre la brevedad de la vida');
    expect(derivado.año).toBe(49);
  });
});

/**
 * Fix 11.1b — la obra sale de `|título`, no del nombre de la página.
 *
 * Wikisource desambigua las páginas —«Triste (Nervo)», «Amor de madre (Palma)»— y ese
 * paréntesis acababa literal en la atribución que lee el visitante. La obra que contiene
 * al fragmento la declara el encabezado, y es la que un lector esperaría ver citada.
 */
describe('Fix 11.1b — la obra la declara el encabezado, no el nombre de la página', () => {
  const pagina = (titulo: string) => `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>${titulo} - Wikisource</title></head><body>
<h1 id="firstHeading">${titulo}</h1>
<div id="mw-content-text"><div class="mw-parser-output">
<p>Adi&oacute;s, dijo la voz; y el alma m&iacute;a, temblando de dolor, se estremec&iacute;a.</p>
</div></div></body></html>`;

  it.each([
    ['entre corchetes', '[[Los jardines interiores]]', 'Los jardines interiores'],
    ['con texto visible', '[[Tradiciones peruanas|Tradiciones peruanas]]', 'Tradiciones peruanas'],
    ['con texto visible distinto del destino', '[[Ariel (Rodó)|Ariel]]', 'Ariel'],
    ['llano, sin corchetes', 'El sable', 'El sable'],
    ['con cursiva de wikitexto', "''Motivos de Proteo''", 'Motivos de Proteo'],
  ])('un título %s da «%s» → «%s»', (_forma, declarado, esperado) => {
    const derivado = derivarDocumento(
      'wikisource-es',
      pagina('Triste (Nervo)'),
      `{{encabezado\n|título=${declarado}\n|año = 1905\n}}`,
    );
    expect(derivado.ok && derivado.obra).toBe(esperado);
  });

  it('un título relativo se descarta y se cae al encabezado de la página', () => {
    /*
     * «Ariel/Capítulo I» declara `|título = [[../`, que no es el título de nada.
     * Reconstruir el del padre desde la ruta sería derivar la Procedencia de la URL, que
     * es exactamente lo que la Historia 11.1 prohíbe.
     */
    for (const relativo of ['[[../', '[[../]]', '[[/Capítulo I]]', '', '{{PAGENAME}}']) {
      const derivado = derivarDocumento(
        'wikisource-es',
        pagina('Ariel/Capítulo I'),
        `{{encabezado\n|título = ${relativo}\n|año = 1900\n}}`,
      );
      expect(derivado.ok && derivado.obra, relativo).toBe('Ariel/Capítulo I');
    }
  });

  it('un enlace sin cerrar no se lleva por delante el año de la línea siguiente', () => {
    const derivado = derivarDocumento(
      'wikisource-es',
      pagina('Ariel/Capítulo I'),
      `{{encabezado\n|título = [[../\n|autor=José Enrique Rodó\n|año = 1900\n}}`,
    );
    expect(derivado.ok && derivado.año).toBe(1900);
  });

  it('sin `|título` la obra sigue siendo el encabezado de la página', () => {
    const derivado = derivarDocumento(
      'wikisource-es',
      pagina('En paz'),
      `{{encabezado\n|autor=Amado Nervo\n}}`,
    );
    expect(derivado.ok && derivado.obra).toBe('En paz');
  });

  it('la obra que deriva la recuperación es la misma que deriva la extracción', () => {
    const derivado = derivarDocumento(
      'wikisource-es',
      pagina('Triste (Nervo)'),
      `{{encabezado\n|título=[[Los jardines interiores]]\n|autor=Amado Nervo\n|año = 1905\n}}`,
    );
    expect(derivado.ok).toBe(true);
    if (!derivado.ok) return;

    // La declaración guarda el enlace **literal**; la obra se resuelve al derivarla, las
    // dos veces, y por eso las dos veces sale la misma.
    expect(derivado.declaracion).toContain('|título=[[Los jardines interiores]]');
    expect(derivado.obra).toBe('Los jardines interiores');

    const analizado = analizarDocumento(
      componerDocumento(
        {
          fuente: 'wikisource-es',
          obra: derivado.obra,
          año: derivado.año,
          url: 'https://es.wikisource.org/wiki/Triste_(Nervo)',
          recuperado: '2026-08-20',
        },
        derivado.declaracion,
        derivado.cuerpo,
      ),
    );
    const reDerivado = derivarDeLaDeclaracion('wikisource-es', analizado!.declaracion);
    expect(reDerivado.obra).toBe(derivado.obra);
    expect(reDerivado.año).toBe(derivado.año);
  });

  it('el nombre lleva la obra declarada y la página de la que salió el cuerpo', () => {
    const derivado = derivarDocumento(
      'wikisource-es',
      pagina('Amor de madre (Palma)'),
      `{{encabezado\n|título=[[Tradiciones peruanas]]\n|año=1893\n}}`,
    );
    expect(derivado.ok && derivado.obra).toBe('Tradiciones peruanas');
    expect(derivado.ok && derivado.pagina).toBe('Amor de madre (Palma)');
    expect(
      derivado.ok && nombreDeDocumento('wikisource-es', derivado.obra, derivado.pagina),
    ).toBe('wikisource-es--tradiciones-peruanas--amor-de-madre-palma');
  });

  it.each([
    ['[[a|b]]', 'b'],
    ['  Los jardines interiores  ', 'Los jardines interiores'],
    ["'''Ariel'''", 'Ariel'],
    ['[[../]]', undefined],
    ['/Capítulo I', undefined],
    ['{{PAGENAME}}', undefined],
    ['[[sin cerrar', undefined],
    ['   ', undefined],
    ['···', undefined],
  ])('tituloDeclarado(«%s») da %s', (valor, esperado) => {
    expect(tituloDeclarado(valor)).toBe(esperado);
  });
});

/**
 * Fix 11.1b — un documento por página, no por obra.
 *
 * El cuerpo versionado es el texto de una página concreta, y la Historia 11.2 coteja cada
 * Cita contra el documento que la contiene. Atar la identidad del documento a la obra
 * hacía que dos páginas del mismo libro compitieran por el mismo fichero, y la que perdía
 * quedaba sin texto contra el que cotejar.
 */
describe('Fix 11.1b — el nombre del documento distingue las páginas de una obra', () => {
  it('dos páginas de la misma obra dan dos nombres distintos', () => {
    expect(nombreDeDocumento('wikisource-es', 'Los jardines interiores', 'Triste')).toBe(
      'wikisource-es--los-jardines-interiores--triste',
    );
    expect(nombreDeDocumento('wikisource-es', 'Los jardines interiores', 'Tibi Regina')).toBe(
      'wikisource-es--los-jardines-interiores--tibi-regina',
    );
  });

  it('cuando la página es la obra, el nombre es el de siempre', () => {
    // El caso que ya funcionaba no se renombra: «El estado» sigue llamándose igual.
    expect(nombreDeDocumento('wikisource-es', 'El estado', 'El estado')).toBe(
      'wikisource-es--el-estado',
    );
    expect(nombreDeDocumento('wikisource-es', 'El sable', 'El sable')).toBe(
      'wikisource-es--el-sable',
    );
  });

  it('una Fuente que no pagina no pasa de un segmento', () => {
    // El `.txt` de Gutenberg es la obra entera, no una página de ella.
    expect(nombreDeDocumento('gutenberg', 'Del sentimiento trágico de la vida')).toBe(
      'gutenberg--del-sentimiento-tragico-de-la-vida',
    );
  });

  it('una página que no deja ni una letra colapsa al nombre de la obra', () => {
    expect(nombreDeDocumento('wikisource-es', 'Ariel', '···')).toBe('wikisource-es--ariel');
  });

  it('cada segmento se acota por separado, sin partir una palabra', () => {
    const obraLarga = 'Historia general de las cosas de Nueva España escrita por Fray Bernardino';
    const paginaLarga = 'Libro duodécimo de la conquista de la Nueva España por los españoles';
    const nombre = nombreDeDocumento('wikisource-es', obraLarga, paginaLarga);
    expect(nombre).toBeDefined();

    const [deLaObra, deLaPagina] = nombre!.slice('wikisource-es--'.length).split('--');
    expect(deLaObra.length).toBeLessThanOrEqual(MAX_CARACTERES_SLUG_DE_OBRA);
    expect(deLaPagina.length).toBeLessThanOrEqual(MAX_CARACTERES_SLUG_DE_OBRA);
    for (const segmento of [deLaObra, deLaPagina]) expect(segmento).not.toMatch(/^-|-$/);
  });

  it('la página se deriva de la declaración, igual que la obra y el año', () => {
    // El nombre del fichero la lleva dentro, y la puerta de la extracción lo compara
    // contra lo derivado. Si la página saliera de la cabecera, el segmento quedaría suelto.
    const declaracion = ['Triste (Nervo)', '|título=[[Los jardines interiores]]', '|año = 1905'].join('\n');
    const derivado = derivarDeLaDeclaracion('wikisource-es', declaracion);
    expect(derivado.obra).toBe('Los jardines interiores');
    expect(derivado.pagina).toBe('Triste (Nervo)');
    expect(derivado.año).toBe(1905);
  });

  it('Gutenberg no declara página: su documento es la obra entera', () => {
    const derivado = derivarDeLaDeclaracion(
      'gutenberg',
      'Title: Del sentimiento trágico de la vida\nOriginal publication: Madrid: Renacimiento, 1913',
    );
    expect(derivado.obra).toBe('Del sentimiento trágico de la vida');
    expect(derivado.pagina).toBeUndefined();
  });
});

/**
 * Fix 11.1c — cuando la página no declara el año, lo declara su obra.
 *
 * En Wikisource **la obra declara el año y la página declara el texto**, y casi nunca son
 * la misma página: «Capítulos que se le olvidaron a Cervantes» declara `|año = 1895` y su
 * cuerpo es el índice; su «Capítulo XLIII» trae ocho mil caracteres de prosa y ningún año.
 * La subpágina ya declara a qué obra pertenece, con un enlace absoluto en su `|título`;
 * encadenar esas dos declaraciones —«pertenezco a esta obra» y «soy de 1895»— no añade
 * ninguna frase nuestra.
 */
describe('Fix 11.1c — qué página hay que pedirle el año', () => {
  it('el destino del enlace absoluto de `|título` es la obra que hay que pedir', () => {
    const hija = `{{Encabezado\n|título = [[Capítulos que se le olvidaron a Cervantes]]\n|autor = Juan Montalvo\n}}`;
    expect(paginaDeLaObraDeclarada(hija)).toBe('Capítulos que se le olvidaron a Cervantes');
  });

  it('con `[[destino|texto]]` se pide el destino, no el texto visible', () => {
    // `tituloDeclarado` resuelve el texto visible, que es lo que la página enseña; para
    // pedirle el año a la obra hace falta la página a la que el enlace apunta.
    expect(destinoDeEnlaceAbsoluto('[[Ariel|El Ariel de Rodó]]')).toBe('Ariel');
    expect(tituloDeclarado('[[Ariel|El Ariel de Rodó]]')).toBe('El Ariel de Rodó');
  });

  it('un `|título` relativo no encadena: derivarlo de la ruta es lo que está prohibido', () => {
    // «Ariel/Capítulo III» declara `|título = [[../`. Reconstruir «Ariel» de la ruta sería
    // decidir nosotros que existe un padre, que es justo lo que la Historia 11.1 prohíbe.
    expect(paginaDeLaObraDeclarada(`{{Encabezado\n|título = [[../\n|autor = Rodó\n}}`)).toBeUndefined();
    expect(destinoDeEnlaceAbsoluto('[[../]]')).toBeUndefined();
    expect(destinoDeEnlaceAbsoluto('[[../Capítulo I]]')).toBeUndefined();
    expect(destinoDeEnlaceAbsoluto('[[/Capítulo I]]')).toBeUndefined();
  });

  it('nada que salga de esta Fuente o de su espacio principal encadena', () => {
    for (const valor of [
      '[[:en:Something]]',
      '[[en:Something]]',
      '[[:s:fr:Ariel]]',
      '[[Índice:Ariel.djvu]]',
      '[[Wikisource:Portada]]',
      '[[https://example.com/obra]]',
      'https://example.com/obra',
    ]) {
      expect(destinoDeEnlaceAbsoluto(valor), valor).toBeUndefined();
    }
  });

  it('un `|título` que no es un enlace suelto no encadena', () => {
    // Un título llano ya es el de la obra y no hay a quién preguntarle nada; una plantilla
    // sin expandir o un enlace con algo pegado no se adivina.
    for (const valor of ['Triste', '', '{{PD-old}}', '[[Ariel]] (fragmento)', '[[]]', '[[·]]']) {
      expect(destinoDeEnlaceAbsoluto(valor), valor).toBeUndefined();
    }
  });

  it('la marca de sección designa un trozo de la página, no otra página', () => {
    expect(destinoDeEnlaceAbsoluto('[[Rimas#Rima LIII]]')).toBe('Rimas');
  });

  it('los guiones bajos del enlace son espacios, como en la propia Fuente', () => {
    expect(destinoDeEnlaceAbsoluto('[[Libro_de_Buen_Amor]]')).toBe('Libro de Buen Amor');
  });
});

describe('Fix 11.1c — el año sale de la obra que la página declara', () => {
  const PAGINA = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Capítulo XLIII - Wikisource</title></head><body>
<h1 id="firstHeading">Capítulos que se le olvidaron a Cervantes/Capítulo XLIII</h1>
<div id="mw-content-text"><div class="mw-parser-output">
<p>La cordura y la locura se reparten el imperio de la vida humana.</p>
</div></div></body></html>`;

  const HIJA = `{{Encabezado
|título = [[Capítulos que se le olvidaron a Cervantes]]
|autor = Juan Montalvo
}}

La cordura y la locura`;

  const OBRA = `{{Encabezado
|título = Capítulos que se le olvidaron a Cervantes
|autor = Juan Montalvo
|año = 1895
}}

* [[/Capítulo I/]]`;

  it('la subpágina se versiona con obra y con el año que declara su obra', () => {
    const derivado = derivarDocumento('wikisource-es', PAGINA, HIJA, OBRA);
    expect(derivado.ok && derivado.obra).toBe('Capítulos que se le olvidaron a Cervantes');
    expect(derivado.ok && derivado.año).toBe(1895);
  });

  it('las dos declaraciones se guardan literales y distinguibles entre sí', () => {
    /*
     * Guardar «año: 1895» ya interpretado convertiría la puerta de la 11.1 en un campo
     * editable: `extraer` vuelve a derivar de aquí, sin red, y tiene que llegar al mismo
     * año. Y la de la obra va marcada, porque el padre aporta el año y nada más.
     */
    const derivado = derivarDocumento('wikisource-es', PAGINA, HIJA, OBRA);
    expect(derivado.ok).toBe(true);
    if (!derivado.ok) return;

    const lineas = derivado.declaracion.split('\n');
    expect(lineas).toContain('|título = [[Capítulos que se le olvidaron a Cervantes]]');
    expect(lineas).toContain(`${MARCA_DE_LA_OBRA} |año = 1895`);
    // La de la página no lleva marca, y la de la obra no se confunde con la suya.
    expect(lineas.filter((l) => l.startsWith(MARCA_DE_LA_OBRA)).length).toBeGreaterThan(0);
    expect(lineas[0]).toBe('Capítulos que se le olvidaron a Cervantes/Capítulo XLIII');
  });

  it('el año que deriva la recuperación es el que deriva la extracción', () => {
    const derivado = derivarDocumento('wikisource-es', PAGINA, HIJA, OBRA);
    expect(derivado.ok).toBe(true);
    if (!derivado.ok) return;

    const versionado = componerDocumento(
      {
        fuente: 'wikisource-es',
        obra: derivado.obra,
        año: derivado.año,
        url: 'https://es.wikisource.org/wiki/Cap%C3%ADtulo_XLIII',
        recuperado: '2026-08-20',
      },
      derivado.declaracion,
      derivado.cuerpo,
    );

    const analizado = analizarDocumento(versionado);
    expect(analizado).toBeDefined();
    const reDerivado = derivarDeLaDeclaracion('wikisource-es', analizado!.declaracion);
    expect(reDerivado.año).toBe(1895);
    expect(reDerivado.año).toBe(derivado.año);
    expect(reDerivado.obra).toBe(derivado.obra);
    expect(reDerivado.pagina).toBe(derivado.pagina);
  });

  it('la obra la declara la página, nunca el encabezado de su obra', () => {
    /*
     * El padre aporta el año y nada más. Si aportara también el título, una subpágina
     * heredaría el nombre del índice y se perdería la distinción que la 11.1b ganó.
     */
    const otraObra = `{{Encabezado\n|título = [[Siete tratados]]\n|autor = Juan Montalvo\n|año = 1882\n}}`;
    const derivado = derivarDocumento('wikisource-es', PAGINA, HIJA, otraObra);
    expect(derivado.ok && derivado.obra).toBe('Capítulos que se le olvidaron a Cervantes');
    expect(derivado.ok && derivado.obra).not.toBe('Siete tratados');
    // Y aun así el año sale de ahí: es lo único que el padre aporta.
    expect(derivado.ok && derivado.año).toBe(1882);
  });

  it('lo que declara la página manda sobre lo que declara su obra', () => {
    const conAño = HIJA.replace('|autor = Juan Montalvo', '|autor = Juan Montalvo\n|año = 1898');
    const derivado = derivarDocumento('wikisource-es', PAGINA, conAño, OBRA);
    expect(derivado.ok && derivado.año).toBe(1898);
  });

  it('si la obra tampoco declara año, la derivación sigue sin año y sin error', () => {
    const sinAño = `{{Encabezado\n|título = Capítulos que se le olvidaron a Cervantes\n|autor = Juan Montalvo\n}}`;
    const derivado = derivarDocumento('wikisource-es', PAGINA, HIJA, sinAño);
    expect(derivado.ok).toBe(true);
    expect(derivado.ok && derivado.obra).toBe('Capítulos que se le olvidaron a Cervantes');
    expect(derivado.ok && derivado.año).toBeUndefined();
  });

  it('sin encabezado de la obra la subpágina queda con obra y sin año, como hoy', () => {
    const derivado = derivarDocumento('wikisource-es', PAGINA, HIJA);
    expect(derivado.ok && derivado.obra).toBe('Capítulos que se le olvidaron a Cervantes');
    expect(derivado.ok && derivado.año).toBeUndefined();
  });

  it('un año aproximado o imposible en la obra tampoco pasa la puerta', () => {
    for (const declarado of ['hacia 1895', '3050', '189?']) {
      const derivado = derivarDocumento(
        'wikisource-es',
        PAGINA,
        HIJA,
        `{{Encabezado\n|título = Capítulos\n|año = ${declarado}\n}}`,
      );
      expect(derivado.ok && derivado.año, declarado).toBeUndefined();
    }
  });

  it('una etiqueta «Año:» de la obra no le pone año a la página', () => {
    /*
     * De la obra solo se lee el parámetro del encabezado. Su vecindad de líneas es la de
     * otra página, y `añoJuntoAEtiqueta` mira líneas contiguas: mezclarlas dejaría que una
     * línea suelta de la obra se leyera como si fuera de la etiqueta de la página.
     */
    const declaracion = [
      'Capítulos que se le olvidaron a Cervantes/Capítulo XLIII',
      'Año de publicación:',
      `${MARCA_DE_LA_OBRA} 1895`,
    ].join('\n');
    expect(derivarDeLaDeclaracion('wikisource-es', declaracion).año).toBeUndefined();
  });

  it('un documento ya versionado, sin líneas de obra, se sigue derivando igual', () => {
    const declaracion = ['Triste (Nervo)', '|título=[[Los jardines interiores]]', '|año = 1905'].join('\n');
    const derivado = derivarDeLaDeclaracion('wikisource-es', declaracion);
    expect(derivado.obra).toBe('Los jardines interiores');
    expect(derivado.pagina).toBe('Triste (Nervo)');
    expect(derivado.año).toBe(1905);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// El Autor que la Fuente declara, y el cotejo contra el que declara el Corpus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FR-23, Historia 11.1 — el metadato de una candidata sale del documento recuperado.
 *
 * El Autor es el último que faltaba, y sale del hallazgo registrado en
 * `_bmad-output/implementation-artifacts/deferred-work.md`: `--autor juan-montalvo` sobre
 * «El sable» —que declara «Manuel González Prada» en la declaración que el propio
 * documento conserva— produjo 32 candidatas atribuidas al Autor equivocado, y el cotejo
 * literal de la 11.2 las habría dado por buenas, porque el texto **está** en ese
 * documento. El dato ya estaba recuperado y versionado: lo único que faltaba era mirarlo.
 */
describe('FR-23 — el autor sale de la declaración, con las formas reales de las Fuentes', () => {
  /** Un único Autor, legible. Las cuatro formas del Corpus y sus variantes. */
  const UNO: [string, string][] = [
    ['Juan Montalvo', 'Juan Montalvo'],
    ['[[José Martí]]', 'José Martí'],
    ['[[Autor:Antonio Machado|Antonio Machado]]', 'Antonio Machado'],
    ['[[Santa Teresa de Jesús|Santa Teresa de Jesús]]', 'Santa Teresa de Jesús'],
    // Un enlace sin cerrar no lo resuelve el patrón entero: se le retiran los corchetes y
    // el espacio de nombres a mano, que es lo que la Fuente enseñaría.
    ['[[Autor:Antonio Machado', 'Antonio Machado'],
    ['[[Autor:Sor Juana Inés de la Cruz]]', 'Sor Juana Inés de la Cruz'],
    ["'''Miguel de Unamuno'''", 'Miguel de Unamuno'],
    ['  Manuel   González Prada  ', 'Manuel González Prada'],
    // La conjunción que une dos apellidos de una sola persona no la parte en dos.
    ['Santiago Ramón y Cajal', 'Santiago Ramón y Cajal'],
    ['José Ortega y Gasset', 'José Ortega y Gasset'],
  ];

  it.each(UNO)('«%s» declara a %s, y a nadie más', (crudo, esperado) => {
    expect(autoresDeclarados(crudo)?.nombres).toEqual([esperado]);
  });

  it('el destino del enlace manda sobre el texto visible', () => {
    /*
     * El destino es a quién enlaza la Fuente; el texto visible es cómo lo llama en esa
     * frase, y puede no ser un nombre. Quedarse con lo segundo rechazaría un documento
     * legítimo de Montalvo por llamarle «el maestro».
     */
    expect(autoresDeclarados('[[Autor:Juan Montalvo|el maestro]]')?.nombres).toEqual([
      'Juan Montalvo',
    ]);
  });

  it('y se cae al texto visible cuando el destino no sirve de nombre', () => {
    // Otro espacio de nombres, o un enlace relativo: ahí el nombre está en lo visible.
    expect(autoresDeclarados('[[w:es:Antonio Machado|Antonio Machado]]')?.nombres).toEqual([
      'Antonio Machado',
    ]);
    expect(autoresDeclarados('[[../|Antonio Machado]]')?.nombres).toEqual(['Antonio Machado']);
  });

  it('dos Autores en una línea son dos, y no la unión de sus palabras', () => {
    /*
     * Fundirlos daba los tokens {manuel, machado, antonio} —`y` es partícula— y con esa
     * unión cruzaba la puerta cualquiera de los dos **y también un tercero** que se
     * llamara «Manuel Antonio Machado». Los dos Machado están declarados en el Corpus.
     */
    const declarado = autoresDeclarados(
      '[[Autor:Manuel Machado|Manuel Machado]] y [[Autor:Antonio Machado|Antonio Machado]]',
    );
    expect(declarado?.nombres).toEqual(['Manuel Machado', 'Antonio Machado']);
  });

  it.each([
    ['Manuel Machado y Antonio Machado', ['Manuel Machado', 'Antonio Machado']],
    ['Manuel Machado, Antonio Machado', ['Manuel Machado', 'Antonio Machado']],
    ['Manuel Machado; Antonio Machado', ['Manuel Machado', 'Antonio Machado']],
  ])('«%s» declara a dos sin enlaces', (crudo, esperados) => {
    expect(autoresDeclarados(crudo)?.nombres).toEqual(esperados);
  });

  it.each(['', '   ', '1907', '—'])('«%s» no declara a nadie', (crudo) => {
    expect(autoresDeclarados(crudo)).toBeUndefined();
  });

  it.each(['Anónimo', 'anonimo', 'ANÓNIMA', 'Desconocido', 'Varios autores', 'Anonymous'])(
    'una firma sin firma —«%s»— tampoco declara a nadie',
    (crudo) => {
      /*
       * Tratarlo como nombre real hacía que un documento anónimo se rechazara contra
       * cualquier --autor con un «no son el mismo Autor» que era falso: no hay dos partes
       * que comparar, hay una sola.
       */
      expect(autoresDeclarados(crudo)).toBeUndefined();
    },
  );

  it.each([
    '{{PD-old}}',
    'Manuel González Prada<ref>nota</ref>',
    '{{Autor|x}}',
    'Antonio Machado {{sic}}',
    '[[Autor:Antonio Machado|',
  ])(
    '«%s» declara algo que no se sabe leer, y eso no es «no declara»',
    (crudo) => {
      /*
       * El fallo que esta distinción existe para impedir: leerlo como «no declara autor»
       * dejaba la puerta sin actuar **y** hacía que el informe imprimiera que el documento
       * no declaraba autor, que es mentira. Una puerta muda no puede parecer una puerta
       * que aprueba.
       */
      const declarado = autoresDeclarados(crudo);
      expect(declarado, crudo).toBeDefined();
      expect(declarado!.nombres).toEqual([]);
      expect(declarado!.crudo).toBe(crudo);
    },
  );

  it('una firma anónima junto a un nombre deja el nombre', () => {
    expect(autoresDeclarados('Anónimo, José Martí')?.nombres).toEqual(['José Martí']);
  });

  it('wikisource-es lo deriva del parámetro del encabezado de la página', () => {
    const declaracion = ['El sable', '|título=El sable', '|autor=Manuel González Prada', '|año=1904'].join('\n');
    expect(derivarDeLaDeclaracion('wikisource-es', declaracion).autor?.nombres).toEqual([
      'Manuel González Prada',
    ]);
  });

  it('gutenberg lo deriva de la línea «Author:» de su ficha', () => {
    const declaracion = ['Title: Don Quijote', 'Author: Miguel de Cervantes Saavedra'].join('\n');
    expect(derivarDeLaDeclaracion('gutenberg', declaracion).autor?.nombres).toEqual([
      'Miguel de Cervantes Saavedra',
    ]);
  });

  it('un documento que no declara autor no declara autor, y eso no es un fallo', () => {
    // La misma forma opcional que la obra, la página y el año: un metadato ausente deja
    // la puerta sin actuar, no rompe la derivación.
    const declaracion = ['Sobre la brevedad de la vida', 'Año de publicación: 49'].join('\n');
    const derivado = derivarDeLaDeclaracion('wikisource-es', declaracion);
    expect(derivado.autor).toBeUndefined();
    expect(derivado.obra).toBe('Sobre la brevedad de la vida');
    expect(derivado.año).toBe(49);
  });

  it('la obra que la página declara no aporta el Autor, igual que no aporta la obra', () => {
    /*
     * Si el índice pudiera aportarlo, una subpágina de una antología heredaría el Autor de
     * su índice y la puerta cotejaría contra quien no firma el texto.
     */
    const declaracion = [
      'Una página cualquiera',
      `${MARCA_DE_LA_OBRA} |autor=Quien Firma El Índice`,
    ].join('\n');
    expect(derivarDeLaDeclaracion('wikisource-es', declaracion).autor).toBeUndefined();
  });
});

describe('FR-23 — el cotejo compara lo que declara la Fuente con lo que declara el Corpus', () => {
  /** El caso real que abrió esta puerta: cero tokens en común. */
  it('«Manuel González Prada» no es «Juan Montalvo»', () => {
    expect(esElMismoAutor('Manuel González Prada', 'Juan Montalvo')).toBe(false);
  });

  it('lo que la Fuente añade no rompe el cotejo: la dirección es Corpus ⊆ declarado', () => {
    // Medido sobre los documentos versionados: la Fuente añade apellido o tratamiento.
    expect(esElMismoAutor('Miguel de Cervantes Saavedra', 'Miguel de Cervantes')).toBe(true);
    expect(esElMismoAutor('Santa Teresa de Jesús', 'Teresa de Jesús')).toBe(true);
  });

  it('y la dirección contraria sí rechaza: al Corpus no le puede faltar un nombre', () => {
    // Exigir que los tokens del declarado estén en el del Corpus rechazaría los mismos
    // dos, al revés; por eso la dirección importa y no es simétrica.
    expect(esElMismoAutor('Miguel de Cervantes', 'Miguel de Cervantes Saavedra')).toBe(false);
  });

  it('lo que esa dirección deja abierto queda escrito: el homónimo desambiguado pasa', () => {
    /*
     * No es un descuido de la implementación sino el precio de admitir a Cervantes
     * Saavedra, y por eso está en el docblock de `esElMismoAutor` y aquí: un nombre del
     * Corpus con un solo token significativo lo contiene cualquier nombre más largo. Se
     * cierra declarando el nombre completo en corpus/autores/, no endureciendo esto.
     */
    expect(esElMismoAutor('Séneca el Viejo', 'Séneca')).toBe(true);
    // Y en cuanto el Corpus desambigua, deja de pasar.
    expect(esElMismoAutor('Séneca el Viejo', 'Lucio Anneo Séneca')).toBe(false);
  });

  it('acentos y caja no distinguen a nadie', () => {
    expect(esElMismoAutor('JOSE MARTI', 'José Martí')).toBe(true);
    expect(esElMismoAutor('josé martí', 'Jose Marti')).toBe(true);
  });

  it('las partículas y los tratamientos se descartan en los dos sentidos', () => {
    expect(tokensDeNombreDeAutor('Sor Juana Inés de la Cruz')).toEqual(['juana', 'ines', 'cruz']);
    expect(esElMismoAutor('Juana Inés de la Cruz', 'Sor Juana Inés de la Cruz')).toBe(true);
    expect(esElMismoAutor('Sor Juana Inés de la Cruz', 'Juana Inés de la Cruz')).toBe(true);
    expect(esElMismoAutor('Fray Luis de León', 'Luis de León')).toBe(true);
  });

  it('un nombre que se queda entero en partículas no abre la puerta del todo', () => {
    /*
     * Sin esto, un Corpus que llamara «Sor» a alguien exigiría un conjunto vacío de
     * tokens, y un conjunto vacío está contenido en cualquier cosa: pasaría todo.
     */
    expect(esElMismoAutor('Manuel González Prada', 'Sor')).toBe(false);
    expect(esElMismoAutor('Sor', 'Sor')).toBe(true);
  });

  it('un nombre vacío no concuerda con nadie', () => {
    expect(esElMismoAutor('', 'Juan Montalvo')).toBe(false);
    expect(esElMismoAutor('Juan Montalvo', '')).toBe(false);
    expect(esElMismoAutor('', '')).toBe(false);
  });

  it('compartir un apellido no basta: hacen falta todos los tokens del Corpus', () => {
    expect(esElMismoAutor('Antonio Machado', 'Manuel Machado')).toBe(false);
    expect(esElMismoAutor('José Martí', 'José Enrique Rodó')).toBe(false);
  });

  it('cada Autor declarado se compara entero: la unión de dos no es un tercero', () => {
    /*
     * Con la unión de tokens, un documento de los dos Machado admitía a «Manuel Antonio
     * Machado», que no es ninguno de ellos. Comparando uno a uno, los dos Machado pasan
     * —el documento es suyo— y el tercero no.
     */
    const declarados = autoresDeclarados('[[Manuel Machado]] y [[Antonio Machado]]')!.nombres;
    const concuerda = (delCorpus: string) =>
      declarados.some((nombre) => esElMismoAutor(nombre, delCorpus));

    expect(concuerda('Antonio Machado')).toBe(true);
    expect(concuerda('Manuel Machado')).toBe(true);
    expect(concuerda('Manuel Antonio Machado')).toBe(false);
  });
});

/**
 * Y la prueba que no se puede escribir con fixtures: los documentos que el Corpus tiene
 * versionados de verdad, cada uno contra el Autor con el que ya se sembró.
 *
 * Es la red que impide endurecer la regla de más. Cualquier ajuste al cotejo —una
 * partícula que se deje de descartar, una dirección que se invierta— rechaza aquí a
 * Cervantes o a Teresa de Jesús antes de rechazarlos en una sesión de sembrado.
 *
 * Todo lo que lee disco lo hace a prueba de ausencias y **dentro** de una prueba, no al
 * recolectarlas: un directorio que falta o un fichero sin frontmatter tienen que salir en
 * rojo con su nombre, no tumbar el bloque entero antes de que corra nada.
 */
describe('FR-23 — ningún documento versionado se rechaza contra el Autor que lo sembró', () => {
  const raiz = resolve(import.meta.dirname, '../..');
  const fuentes = join(raiz, 'corpus/fuentes');

  /** Los ficheros de un directorio, o ninguno si el directorio no está. */
  function ficherosDe(dir: string, extension: RegExp): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((fichero) => extension.test(fichero))
      .sort();
  }

  const documentos = ficherosDe(fuentes, /\.txt$/);

  /** Cómo llama el Corpus a cada Autor: su `nombre`, que es el lado del Corpus. */
  const nombreDelCorpus = new Map<string, string | undefined>(
    ficherosDe(join(raiz, 'corpus/autores'), /\.ya?ml$/).map((fichero) => {
      const declarado = parsearYaml(
        readFileSync(join(raiz, 'corpus/autores', fichero), 'utf8'),
      ) as { nombre?: string } | null;
      return [fichero.replace(/\.ya?ml$/, ''), declarado?.nombre];
    }),
  );

  /** Cada Cita publicada, con el slug de su Autor y la obra de su Procedencia. */
  const citas = ficherosDe(join(raiz, 'corpus/citas'), /\.md$/).map((fichero) => {
    const contenido = readFileSync(join(raiz, 'corpus/citas', fichero), 'utf8');
    // Un fichero sin frontmatter no tumba el bloque: se queda sin campos y lo dice la
    // prueba que cuenta cuántas Citas se leyeron.
    const frontmatter = (parsearYaml(contenido.split('---')[1] ?? '') ?? {}) as {
      autor?: string;
      procedencia?: { obra?: string };
    };
    return { fichero, ...frontmatter };
  });

  /** El autor que declara un documento, derivado como lo deriva la orden al extraer. */
  function derivadoDe(fichero: string) {
    const analizado = analizarDocumento(readFileSync(join(fuentes, fichero), 'utf8'));
    if (analizado === undefined) return undefined;
    return {
      fuente: analizado.cabecera.fuente,
      ...derivarDeLaDeclaracion(analizado.cabecera.fuente, analizado.declaracion),
    };
  }

  /**
   * Los Autores del Corpus que ya publicaron desde ese documento.
   *
   * La Cita no apunta a un documento concreto: apunta a su **obra**. Así que los dos
   * lados se pasan por el mismo ayudante —la obra que el documento declara y la que la
   * Cita declara— y se comparan los nombres que implican. Comparar el nombre del fichero
   * por prefijo se dejaba fuera «Proverbios y cantares (Nuevas Canciones)», cuyo
   * documento no lleva segmento de página, y ese caso pasaba en vacío sin decirlo.
   */
  function autoresQuePublicaronDesde(fichero: string): string[] {
    const derivado = derivadoDe(fichero);
    if (derivado?.obra === undefined) return [];
    const suyo = nombreDeDocumento(derivado.fuente, derivado.obra);
    if (suyo === undefined) return [];

    const slugs = new Set<string>();
    for (const cita of citas) {
      if (cita.autor === undefined || cita.procedencia?.obra === undefined) continue;
      if (nombreDeDocumento(derivado.fuente, cita.procedencia.obra) === suyo) slugs.add(cita.autor);
    }
    return [...slugs];
  }

  it('hay corpus que cotejar: documentos, Autores y Citas', () => {
    /*
     * Los tres recuentos son lo que impide que las pruebas de abajo pasen por no mirar
     * nada, y van a lo medido con el margen justo: hoy son 59 documentos, 17 Autores y
     * 231 Citas. Los suelos admiten que se retire alguno sin poner en rojo una prueba que
     * no va de eso, pero no que se vacíe el corpus ni que falte el directorio.
     */
    expect(documentos.length).toBeGreaterThanOrEqual(55);
    expect(nombreDelCorpus.size).toBeGreaterThanOrEqual(15);
    expect(citas.filter((c) => c.autor !== undefined).length).toBeGreaterThanOrEqual(220);
  });

  it('todos los documentos se analizan y declaran a quien firma', () => {
    /*
     * No es una regla —un documento sin autor declarado se extrae igual— sino una medida:
     * es lo que dice que los lectores de las dos Fuentes saben leer todas las formas
     * reales, y no solo las del fixture. El día que entre un documento sin autor legible,
     * esta prueba lo nombra y quien lo añada decide si es la Fuente o el lector.
     */
    const sinLeer = documentos.filter((fichero) => {
      const derivado = derivadoDe(fichero);
      return derivado === undefined || derivado.autor === undefined;
    });
    expect(sinLeer).toEqual([]);

    const ilegibles = documentos.filter((f) => derivadoDe(f)!.autor!.nombres.length === 0);
    expect(ilegibles).toEqual([]);
  });

  it('ninguno se rechaza contra el Autor de sus Citas', () => {
    const rechazados: string[] = [];

    for (const fichero of documentos) {
      const derivado = derivadoDe(fichero);
      // Un documento sin autor declarado no rechaza a nadie: la puerta no actúa.
      if (derivado?.autor === undefined) continue;

      for (const slug of autoresQuePublicaronDesde(fichero)) {
        const nombre = nombreDelCorpus.get(slug);
        if (nombre === undefined) {
          rechazados.push(`${fichero}: corpus/autores/${slug}.yml no declara nombre`);
          continue;
        }
        const concuerda = derivado.autor.nombres.some((n) => esElMismoAutor(n, nombre));
        if (!concuerda) {
          rechazados.push(
            `${fichero} declara «${derivado.autor.nombres.join(' y ')}» y el Corpus llama ` +
              `«${nombre}» a ${slug}`,
          );
        }
      }
    }

    expect(rechazados).toEqual([]);
  });

  it('y casi todos se cotejan de verdad contra una Cita publicada, con la lista de los que no', () => {
    /*
     * El recuento es lo que impide que la prueba de arriba pase por no mirar nada, y la
     * lista es lo que impide que un documento que dejó de casar con sus Citas se vuelva
     * mudo. Eran tres los que no casaban —«De la brevedad de la vida», «Del sentimiento
     * trágico de la vida» y la letrilla de Quevedo—: los tres publicaron sus Citas antes de
     * la v3, con otro nombre de obra, y están en el censo de pendientes de cotejo.
     *
     * Son dos desde la sesión del 24/08/2026, y la lista mengua en la buena dirección. El
     * tramo de concentración de la Meta sembró cuarenta Citas nuevas desde «De la brevedad
     * de la vida», y esas sí casan con su documento porque salieron de él por la extracción
     * de la 11.1. Lo que sigue pendiente de cotejo son las cinco viejas, no el documento.
     * Cuando los otros dos reciban el mismo trato, esta lista quedará vacía.
     */
    const sinCita = documentos.filter((f) => autoresQuePublicaronDesde(f).length === 0);

    expect(sinCita).toEqual([
      'wikisource-es--del-sentimiento-tragico-de-la-vida-i.txt',
      'wikisource-es--poderoso-caballero-es-don-dinero-letrilla-satirica.txt',
    ]);
    expect(documentos.length - sinCita.length).toBeGreaterThanOrEqual(54);
  });
});
