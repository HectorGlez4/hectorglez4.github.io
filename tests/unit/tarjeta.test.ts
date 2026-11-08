import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import {
  ALTO,
  ANCHO,
  bajadaDeTarjetaDeObra,
  datosDeTarjetaDeObra,
  svgDeTarjeta,
  svgDeTarjetaDeListado,
} from '../../src/lib/tarjeta.ts';
import { SANS, SERIF } from '../../src/lib/lienzo.ts';
import { MARCA } from '../../src/lib/marca.ts';
import { cuerpoEnTarjeta, tramoDe } from '../../src/lib/tramos.ts';
import { repartirEnLineas } from '../../src/lib/lienzo.ts';
import { leerCitas, leerDocumentosDeclarados, rutasDelCorpus } from '../../tools/lib/corpus.ts';
import { documentosDeCita } from '../../tools/lib/cotejo.ts';
import { documentoParaLosSaltos, textoConSaltos } from '../../tools/lib/lineas.ts';
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
     * El criterio de una Colección y el nombre de una página son texto de editor: pueden
     * traer comillas y ampersands. (La semblanza de un Autor ya no llega aquí: desde la
     * Historia 17.2 su Tarjeta lleva solo hechos, ver `semblanza.test.ts`.) Sin escapar, un
     * `&` deja el SVG mal formado y el rasterizador devuelve una imagen rota — que las redes
     * reportan como inaccesible.
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
    // Una página de listado sin bajada —la portada o un Autor de quien no consta nada que
    // contar— es admisible; su tarjeta no puede romperse por eso.
    const sinBajada = svgDeTarjetaDeListado({ titulo: 'Solo el nombre' });
    expect(sinBajada).toContain('Solo el nombre');
    expect(sinBajada).toContain(`width="${ANCHO}"`);
  });
});

/**
 * FR-19 — la Tarjeta de la portada, y la marca que no se repite.
 *
 * La portada es la que más duele de las que no tenían imagen: es lo que se comparte cuando se
 * recomienda el sitio entero. Su tarjeta sale de lo que la propia página declara —el nombre del
 * sitio y su descripción— igual que las de Tema, Colección y Autor.
 *
 * Con una diferencia que hay que declarar y no adivinar: en las demás, el título es el nombre de
 * la página y la marca de abajo dice de qué sitio es. En la portada **el título es la marca**, y
 * dibujarla otra vez abajo la enseña dos veces. Por eso `conMarca` es una opción explícita: una
 * regla implícita del tipo «si el título coincide con la marca, quítala» funcionaría hasta el día
 * que una Colección se llamara como el sitio, y entonces fallaría sin que nadie supiera por qué.
 *
 * `/404` y `/buscar` **no llevan tarjeta a propósito**: las dos se declaran `noindex` en
 * `superficies.ts`, y una previsualización para una página que nadie comparte ni indexa es un
 * fichero que no mira nadie.
 */
describe('FR-19 — la Tarjeta de la portada', () => {
  it('sin marca abajo, porque el título ya es la marca', () => {
    const svg = svgDeTarjetaDeListado({
      titulo: MARCA,
      bajada: 'Citas célebres en español, cada una con su autor y la obra de la que procede.',
      conMarca: false,
    });

    expect(svg).toContain(MARCA);
    // Una sola vez: la del título. La versalita de abajo no está.
    expect(svg).not.toContain(MARCA.toLocaleUpperCase('es'));
  });

  it('y las demás la siguen llevando: la opción no cambia el caso normal', () => {
    const svg = svgDeTarjetaDeListado({ titulo: 'La prudencia', bajada: 'Una bajada.' });
    expect(svg).toContain(MARCA.toLocaleUpperCase('es'));
  });
});

/**
 * Historia 22.7 — la Tarjeta Social de una Obra: la de listado, con el título en la sans y una
 * sola línea de hechos, «{n} citas de {Autor}, {año}». Solo hechos del Corpus (AD-28).
 */
describe('Historia 22.7 — la Tarjeta de Obra', () => {
  const SENECA = { nombre: 'Séneca' };
  const CARTAS = { titulo: 'Cartas a Lucilio', recuento: 3, año: 64 };

  it('la bajada: plural con el año de la Obra', () => {
    expect(bajadaDeTarjetaDeObra(CARTAS, SENECA)).toBe('3 citas de Séneca, 64');
  });

  it('la bajada: «1 cita de…» en singular', () => {
    expect(bajadaDeTarjetaDeObra({ recuento: 1, año: 41 }, SENECA)).toBe('1 cita de Séneca, 41');
  });

  it('la bajada: un año antes de Cristo se lee «a. C.», sin signo', () => {
    expect(bajadaDeTarjetaDeObra({ recuento: 2, año: -350 }, { nombre: 'Aristóteles' })).toBe(
      '2 citas de Aristóteles, 350 a. C.',
    );
  });

  it('la bajada: sin año de Obra, sin coma ni año', () => {
    expect(bajadaDeTarjetaDeObra({ recuento: 9 }, { nombre: 'Epicteto' })).toBe('9 citas de Epicteto');
  });

  it('es la de listado: el título y la bajada como único hecho, en la sans', () => {
    const datos = datosDeTarjetaDeObra(CARTAS, SENECA);
    expect(datos).toEqual({
      titulo: 'Cartas a Lucilio',
      hechos: ['3 citas de Séneca, 64'],
      familiaDelTitulo: 'sans',
    });
    const svg = svgDeTarjetaDeListado(datos);
    expect(svg).toContain(`font-family="${SANS}" font-size="68" fill`);
    expect(svg).not.toContain(`font-family="${SERIF}"`);
    expect(svg).toContain('>Cartas a Lucilio</text>');
    expect(svg).toContain('>3 citas de Séneca, 64</text>');
  });

  it('las demás de listado siguen con el título en serif', () => {
    const svg = svgDeTarjetaDeListado({ titulo: 'La prudencia', bajada: 'Una bajada.' });
    expect(svg).toContain(`font-family="${SERIF}" font-size="68"`);
  });

  it('ni la nota ni el traductor, aunque la Obra los traiga', () => {
    const obra = {
      ...CARTAS,
      nota: 'Una nota escrita a mano sobre esta edición.',
      traductor: 'Pablo de Prado',
      licencia: 'CC BY-SA 4.0',
    };
    const svg = svgDeTarjetaDeListado(datosDeTarjetaDeObra(obra, SENECA));
    expect(svg).not.toContain('nota escrita');
    expect(svg).not.toContain('Pablo de Prado');
    expect(svg).not.toContain('CC BY-SA');
  });

  it('el nombre del Autor entra en su entrada: otro nombre, otro SVG', () => {
    const a = svgDeTarjetaDeListado(datosDeTarjetaDeObra(CARTAS, SENECA));
    const b = svgDeTarjetaDeListado(datosDeTarjetaDeObra(CARTAS, { nombre: 'Lucio Anneo Séneca' }));
    expect(a).not.toBe(b);
  });

  it('función del contenido: los mismos datos dan los mismos bytes de PNG', async () => {
    const rasterizar = () =>
      sharp(Buffer.from(svgDeTarjetaDeListado(datosDeTarjetaDeObra(CARTAS, SENECA)))).png().toBuffer();
    const [uno, dos] = await Promise.all([rasterizar(), rasterizar()]);
    expect(uno.equals(dos)).toBe(true);
  });
});

/**
 * Historia 29.3 — la regla de la Tarjeta del verso, decisión de Héctor del 2026-11-08: una Cita
 * en verso que no cabe en su tramo baja al siguiente, hasta `sm`; la prosa conserva el suyo.
 */
describe('Historia 29.3 — cuerpoEnTarjeta', () => {
  const VERSO = 'Corto y breve.\nOtro verso.';

  it('con saltos y cabe: el cuerpo de su tramo', () => {
    expect(cuerpoEnTarjeta(VERSO, () => true)).toBe(tramoDe(VERSO).pixelesEnTarjeta);
    expect(cuerpoEnTarjeta(VERSO, () => true)).toBe(56);
  });

  it('con saltos y no cabe: baja una fila, y otra, hasta que quepa', () => {
    expect(cuerpoEnTarjeta(VERSO, (c) => c <= 46)).toBe(46);
    expect(cuerpoEnTarjeta(VERSO, (c) => c <= 32)).toBe(32);
  });

  it('con saltos y no cabe ni en `sm`: undefined', () => {
    expect(cuerpoEnTarjeta(VERSO, () => false)).toBeUndefined();
  });

  it('sin Imagen: undefined, sin preguntar', () => {
    const largo = `${'palabra '.repeat(Math.ceil(MAX_CARACTERES_IMAGEN / 8) + 2)}\nfin`;
    expect(cuerpoEnTarjeta(largo, () => true)).toBeUndefined();
  });

  it('sin saltos: el cuerpo de su tramo aunque `cabe` diga que no (la decisión es para el verso)', () => {
    let preguntas = 0;
    const cabe = () => {
      preguntas += 1;
      return false;
    };
    expect(cuerpoEnTarjeta('Una sola línea de prosa.', cabe)).toBe(56);
    expect(preguntas).toBe(0);
  });
});

/** El cuerpo del texto y el `y` del último `<text>` de la Cita (antes del filete), leídos del SVG. */
function geometria(svg: string): { cuerpo: number; lineas: string[]; ultimaY: number; fileteY: number } {
  const textos = [...svg.matchAll(/<text x="80" y="(\d+(?:\.\d+)?)" font-family="[^"]*" font-size="(\d+)" fill="#[0-9a-f]+">([^<]*)<\/text>/g)];
  const deCita = textos.filter((m) => m[0].includes(SERIF));
  const filete = Number(svg.match(/<rect x="80" y="(\d+(?:\.\d+)?)" width="96"/)![1]);
  return {
    cuerpo: Number(deCita[0][2]),
    lineas: deCita.map((m) => m[3]),
    ultimaY: Number(deCita.at(-1)![1]),
    fileteY: filete,
  };
}

/** El alto que ocupa el bloque con ese cuerpo y esas líneas: márgenes, texto, aire y atribución. */
const altoDelBloque = (cuerpo: number, lineas: number, conProcedencia: boolean) =>
  80 * 2 + lineas * Math.round(cuerpo * 1.3) + 40 + 24 + 34 + (conProcedencia ? 30 : 0);

describe('Historia 29.3 — la Tarjeta de una Cita en verso', () => {
  // Literales, con los saltos que les compone `textoConSaltos` sobre su documento de Wikisource.
  const CALDERON = [
    'Contra vosotros, naciendo;\nAunque si nací, ya entiendo\nQué delito he cometido:\nBastante causa ha tenido\nVuestra justicia y rigor;\nPues el delito mayor\nDel hombre es haber nacido.',
    'Entre las flores se quiebra,\nCuando, músico, celebra\nDe las flores la piedad,\nQue le da la majestad\nDel campo abierto á su huida:\n¿Y, teniendo yo mas vida,\nTengo menos libertad?',
    'Ni qué pueda preguntarte:\nSolo diré que á esta parte\nHoy el cielo me ha guiado\nPara haberme consolado,\nSi consuelo puede ser\nDel que es desdichado, ver\nOtro que es más desdichado.',
  ];

  it.each(CALDERON)('Calderón, 7 versos de `md`: se compone a 32 px y el bloque cabe en 630 (%#)', (texto) => {
    expect(tramoDe(texto).nombre).toBe('md');
    const svg = svgDeTarjeta({ texto, autor: 'Pedro Calderón de la Barca', procedencia: 'La vida es sueño' });
    const g = geometria(svg);
    expect(g.cuerpo).toBe(32);
    expect(g.lineas).toHaveLength(7);
    expect(g.lineas[0].startsWith('«')).toBe(true);
    expect(altoDelBloque(g.cuerpo, g.lineas.length, true)).toBe(582);
    expect(altoDelBloque(g.cuerpo, g.lineas.length, true)).toBeLessThanOrEqual(ALTO);
    // Con su tramo pediría 631: es el caso que decidió Héctor.
    expect(altoDelBloque(38, 7, true)).toBe(631);
    // El texto queda dentro del lienzo y por encima del filete.
    expect(g.ultimaY).toBeLessThan(g.fileteY);
  });

  it('Martí, 4 versos de `lg`: su tramo, 46 px, un verso por línea', () => {
    const texto =
      'Yo vengo de todas partes,\nY hacia todas partes voy:\nArte soy entre las artes,\nEn los montes, monte soy.';
    const g = geometria(svgDeTarjeta({ texto, autor: 'José Martí', procedencia: 'Versos sencillos' }));
    expect(g.cuerpo).toBe(46);
    expect(g.lineas).toEqual([
      '«Yo vengo de todas partes,',
      'Y hacia todas partes voy:',
      'Arte soy entre las artes,',
      'En los montes, monte soy.»',
    ]);
  });

  it('sin saltos, cada tramo con su cuerpo y el reparto de siempre', () => {
    for (const largo of [60, 150, 230, 290]) {
      const texto = 'palabra '.repeat(Math.ceil(largo / 8)).slice(0, largo).trim();
      const tramo = tramoDe(texto);
      const g = geometria(svgDeTarjeta({ texto, autor: 'Séneca', procedencia: 'Cartas a Lucilio' }));
      expect(g.cuerpo).toBe(tramo.pixelesEnTarjeta);
      expect(g.lineas).toEqual(repartirEnLineas(`«${texto}»`, tramo.pixelesEnTarjeta, ANCHO - 160));
    }
  });

  it('un texto en verso que no cabe ni en `sm` detiene la composición', () => {
    const texto = Array.from({ length: 20 }, (_, i) => `verso${i}`).join('\n');
    expect(() => svgDeTarjeta({ texto, autor: 'Nadie', procedencia: 'Ninguna' })).toThrow(/no cabe en 630 px/);
  });

  it('el PNG de la ruta nombra el slug cuando la Tarjeta no cabe', () => {
    const ruta = readFileSync(resolve(raiz, 'src/pages/tarjeta/[slug].png.ts'), 'utf8');
    expect(ruta).toMatch(/Tarjeta Social de «\$\{slug\}»/);
  });

  it('barrido del Corpus real: toda Cita publicada que admite Imagen, con sus saltos, tiene cuerpo y cabe', async () => {
    const rutas = rutasDelCorpus(resolve(raiz, 'corpus'));
    const [citas, documentos] = await Promise.all([leerCitas(rutas.citas), leerDocumentosDeclarados(rutas)]);
    const noCaben: string[] = [];
    let conImagen = 0;
    let enVerso = 0;
    for (const cita of citas) {
      if (typeof cita.texto !== 'string') continue;
      let texto = cita.texto;
      if (cita.fuente !== undefined) {
        const candidatos = documentosDeCita(cita.fuente, cita.procedencia?.obra, documentos).map((nombre) => {
          const d = documentos.get(nombre)!;
          return { nombre, cuerpo: d.cuerpo, ...(d.lineas !== undefined ? { lineas: d.lineas } : {}) };
        });
        const documento = documentoParaLosSaltos(cita.texto, candidatos);
        if (documento !== undefined) texto = textoConSaltos(cita.texto, documento).texto;
      }
      if (!tramoDe(texto).admiteImagen) continue;
      conImagen += 1;
      if (texto.includes('\n')) enVerso += 1;
      const conProcedencia = cita.procedencia?.obra !== undefined || cita.procedencia?.año !== undefined;
      try {
        svgDeTarjeta({ texto, autor: 'Autor', ...(conProcedencia ? { procedencia: 'Procedencia' } : {}) });
      } catch {
        noCaben.push(cita.slug);
      }
    }
    expect(conImagen).toBeGreaterThan(0);
    expect(enVerso).toBeGreaterThan(0);
    expect(noCaben, `no caben en la Tarjeta ni en \`sm\` (lo decide Héctor): ${noCaben.join(', ')}`).toEqual([]);
  }, 120_000);
});
