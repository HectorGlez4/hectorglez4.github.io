import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ALTO, ANCHO, svgDeTarjeta, svgDeTarjetaDeListado } from '../../src/lib/tarjeta.ts';
import { MARCA } from '../../src/lib/marca.ts';
import { tramoDe } from '../../src/lib/tramos.ts';
import { MAX_CARACTERES_IMAGEN } from '../../src/lib/umbrales.ts';

const raiz = resolve(import.meta.dirname, '../..');

/** Historia 10.1 — la Tarjeta Social. */

const CORTA = {
  texto: 'La libertad, Sancho, es uno de los más preciosos dones que a los hombres dieron los cielos.',
  autor: 'Miguel de Cervantes',
  procedencia: 'Don Quijote de la Mancha, 1615',
};

const LARGA = {
  texto: 'a'.repeat(MAX_CARACTERES_IMAGEN + 50),
  autor: 'Miguel de Cervantes',
  procedencia: 'Don Quijote de la Mancha, 1615',
};

describe('Historia 10.1 — una Cita que admite Imagen', () => {
  const svg = svgDeTarjeta(CORTA);

  it('la tarjeta tiene la proporción que piden las redes', () => {
    expect(ANCHO).toBe(1200);
    expect(ALTO).toBe(630);
    expect(svg).toContain(`width="1200" height="630"`);
  });

  it('presenta el texto de la Cita y el nombre del Autor', () => {
    expect(svg).toContain('La libertad, Sancho');
    expect(svg).toContain(CORTA.autor.toLocaleUpperCase('es'));
  });

  it('lleva la marca, la misma que la Imagen de Cita', () => {
    expect(svg).toContain(MARCA.toLocaleUpperCase('es'));
  });

  it('el texto va entero: la tarjeta no recorta', () => {
    const enLaTarjeta = [...svg.matchAll(/>([^<]+)<\/text>/g)].map((m) => m[1]).join(' ');
    for (const palabra of CORTA.texto.split(' ')) {
      expect(enLaTarjeta, `falta «${palabra}»`).toContain(palabra);
    }
  });
});

describe('Historia 10.1 — una Cita por encima del corte de FR-10', () => {
  const svg = svgDeTarjeta(LARGA);

  it('la Cita no admite Imagen, y aun así tiene Tarjeta', () => {
    expect(tramoDe(LARGA.texto).admiteImagen).toBe(false);
    expect(svg).toContain('<svg');
    expect(svg).toContain(LARGA.autor);
  });

  it('presenta el Autor y la marca', () => {
    expect(svg).toContain(LARGA.autor);
    expect(svg).toContain(MARCA.toLocaleUpperCase('es'));
  });

  it('no muestra ni un fragmento del texto', () => {
    /*
     * Es la decisión que más importa de la historia. Una frase cortada por la mitad en la
     * previsualización de WhatsApp es una cita mal atribuida circulando, y NFR-12 prohíbe
     * que el sistema altere una Cita publicada.
     */
    expect(svg).not.toContain('aaaa');
    expect(svg).not.toContain('…');
    expect(svg).not.toContain('...');
  });
});

describe('Historia 10.1 — la composición sale del módulo de tramos', () => {
  it('el cuerpo del texto es el que declara el tramo de esa Cita', () => {
    const tramo = tramoDe(CORTA.texto);
    expect(svgDeTarjeta(CORTA)).toContain(`font-size="${tramo.pixelesEnTarjeta}"`);
  });

  it('dos Citas de tramos distintos se componen con cuerpos distintos', () => {
    const breve = { ...CORTA, texto: 'Cada uno es hijo de sus obras.' };
    const larga = { ...CORTA, texto: 'a '.repeat(100).trim() };
    expect(tramoDe(breve.texto).nombre).not.toBe(tramoDe(larga.texto).nombre);
    expect(tramoDe(breve.texto).pixelesEnTarjeta).not.toBe(tramoDe(larga.texto).pixelesEnTarjeta);
  });

  it('el módulo no lleva ninguna tabla de tamaños propia', () => {
    // Si la llevara, la Tarjeta y la Imagen de la misma Cita podrían discrepar sobre si
    // cabe, que es lo que AD-8 existe para impedir.
    const fuente = readFileSync(resolve(raiz, 'src/lib/tarjeta.ts'), 'utf8');
    expect(fuente).toContain("from './tramos.ts'");
    expect(fuente).not.toMatch(/hasta:\s*\d+/);
  });

  it('tampoco lleva paleta propia: los colores salen del lienzo compartido', () => {
    // Misma razón que los tamaños. Retocar el filete aquí y no en la Pieza produce dos
    // imágenes de la misma marca que solo se ven distintas puestas una al lado de la otra.
    const fuente = readFileSync(resolve(raiz, 'src/lib/tarjeta.ts'), 'utf8');
    expect(fuente).toContain("from './lienzo.ts'");
    expect(fuente).not.toMatch(/#[0-9a-f]{6}/i);
  });
});

describe('Historia 10.1 — el SVG no se rompe con el texto de una Cita', () => {
  it('escapa lo que rompería el marcado', () => {
    const svg = svgDeTarjeta({
      texto: 'Más vale <esto> & aquello que "lo otro".',
      autor: 'Anónimo & Cía.',
    });
    expect(svg).toContain('&lt;esto&gt;');
    expect(svg).toContain('&amp;');
    expect(svg).not.toMatch(/<esto>/);
  });

  it('una Cita sin procedencia no deja un hueco con coma suelta', () => {
    const svg = svgDeTarjeta({ texto: CORTA.texto, autor: CORTA.autor });
    expect(svg).not.toContain('undefined');
    expect(svg).not.toMatch(/>,\s*</);
  });
});

/*
 * El reparto en líneas y el escapado se probaban aquí mientras eran de la Tarjeta. Desde la
 * Historia 13.2 son de `src/lib/lienzo.ts`, compartidos con la Pieza, y su contrato se prueba
 * en `tests/unit/lienzo.test.ts`: probarlos por un solo consumidor dejaría que un cambio
 * pensado para la Tarjeta rompiera la Pieza sin que nada aquí lo notara.
 */

describe('Historia 10.1 — sharp está declarada, no heredada', () => {
  it('la generación de la Tarjeta depende de sharp explícitamente', () => {
    /*
     * Llegaba como dependencia transitiva de Astro, y ahí funcionaba por casualidad: el
     * día que Astro cambie de rasterizador, el build fallaría con «cannot find module»
     * en una ruta de imagen y no en nada que se hubiera tocado.
     */
    const pkg = JSON.parse(readFileSync(resolve(raiz, 'package.json'), 'utf8'));
    expect(pkg.dependencies.sharp).toBeTruthy();

    const endpoint = readFileSync(resolve(raiz, 'src/pages/tarjeta/[slug].png.ts'), 'utf8');
    expect(endpoint).toContain("from 'sharp'");
  });
});

/**
 * FR-19 — la Tarjeta Social de las páginas de listado.
 *
 * Hasta aquí solo la Página de Cita declaraba `og:image`: la portada, el buscador, los Temas,
 * las Colecciones y las Páginas de Autor se compartían **sin previsualización**. Se anotó como
 * bloqueado «porque no hay recurso de marca en `public/`», y esa premisa era falsa: la Tarjeta
 * de Cita no sale de ningún recurso, se **dibuja** con la paleta y la marca del propio sitio y
 * se rasteriza en el build. Lo que faltaba no era un activo: era esta variante.
 *
 * Es otra tarjeta y no la misma con otro texto. La de Cita enseña una Cita —texto, Autor,
 * procedencia—; la de un listado enseña **el nombre de la página y por qué existe**. Compartir
 * un Tema y que la previsualización muestre una de sus Citas prometería la Cita, no el Tema.
 */
describe('FR-19 — la Tarjeta de una página de listado', () => {
  const svg = svgDeTarjetaDeListado({
    titulo: 'La prudencia',
    bajada: 'Lo que conviene mirar antes de obrar, y lo que se gana esperando.',
  });

  it('tiene la misma proporción que la de Cita: las redes piden una sola', () => {
    expect(svg).toContain(`width="${ANCHO}"`);
    expect(svg).toContain(`height="${ALTO}"`);
  });

  it('enseña el nombre de la página y su bajada', () => {
    expect(svg).toContain('La prudencia');
    expect(svg).toContain('Lo que conviene mirar antes de obrar');
  });

  it('lleva la marca del sitio, como su hermana', () => {
    expect(svg).toContain(MARCA.toLocaleUpperCase('es'));
  });

  it('escapa lo que podría romper el SVG', () => {
    /*
     * El criterio de una Colección y la semblanza de un Autor son texto de editor: pueden
     * traer comillas y ampersands. Sin escapar, un `&` deja el SVG mal formado y el
     * rasterizador devuelve una imagen rota — que las redes reportan como inaccesible.
     */
    const conSignos = svgDeTarjetaDeListado({
      titulo: 'Ley & orden',
      bajada: 'Lo que <dicen> las "leyes" y lo que hacen.',
    });

    expect(conSignos).toContain('Ley &amp; orden');
    expect(conSignos).not.toMatch(/<dicen>/);
    expect(conSignos).toContain('&quot;leyes&quot;');
  });

  it('una bajada larga se reparte en líneas y no se sale del lienzo', () => {
    const larga = svgDeTarjetaDeListado({
      titulo: 'Un Tema',
      bajada: 'palabra '.repeat(60).trim(),
    });

    // Varias líneas de texto, y ninguna empieza fuera del margen.
    const lineas = [...larga.matchAll(/<text[^>]*\sx="(\d+)"/g)].map((m) => Number(m[1]));
    expect(lineas.length).toBeGreaterThan(2);
    for (const x of lineas) expect(x).toBeLessThan(ANCHO);
  });

  it('sin bajada sigue siendo una tarjeta válida', () => {
    // Una Página de Autor sin semblanza es admisible; su tarjeta no puede romperse por eso.
    const sinBajada = svgDeTarjetaDeListado({ titulo: 'Solo el nombre' });
    expect(sinBajada).toContain('Solo el nombre');
    expect(sinBajada).toContain(`width="${ANCHO}"`);
  });
});
