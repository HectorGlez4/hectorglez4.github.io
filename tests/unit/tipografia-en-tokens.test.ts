import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { RAIZ } from './ayuda/construir.js';

/**
 * Historia 26.12 — el peso y el interlineado salen de sus tokens.
 *
 * `src/styles/tokens.css` declara `--peso-regular`, `--peso-fuerte` y un `--interlineado-…` por
 * cada token de tipografía de DESIGN.md, y ningún `<style>` de componente ni hoja `.css` de `src/`
 * fuera de `tokens.css` —tampoco una cadena `style` en el marcado o el frontmatter— escribe un
 * `font-weight` ni un `line-height` literal, ni dentro del atajo `font` (DESIGN.md § Typography,
 * «En CSS»; espina v8.5, «Estilos»). Y el interlineado de una regla es el del token cuyo cuerpo
 * toma. Generaliza la guardia de color y tipografía que la Lista de Obras tenía para sí
 * (Historia 17.3).
 *
 * **Excepciones, todas de DESIGN.md § Typography y nombradas por fichero y selector:** el
 * interlineado 1 de las letras de salto, el único literal; y el de `author` (1,4) en el rótulo de
 * la Fila de bloque y en el título de la Lista de Obras y de la Tarjeta de Obra, que no es el de
 * su cuerpo. Otra no entra aquí sin su fila en DESIGN.md: la decide Héctor con `bmad-ux`.
 *
 * **Qué no vigila, y por qué.** El lienzo rasterizado —`src/lib/tarjeta.ts`, `src/lib/pieza.ts`,
 * `src/lib/lienzo.ts` y `public/islas/imagen.js`— escribe el peso en atributos SVG o en el `font`
 * de un canvas, que no son propiedades de CSS y no pueden leer un `var()`: sus valores salen de
 * DESIGN.md por su cuenta (Historia 26.12, «Never»). Los demás `.ts` y `.js` no componen estilos:
 * la presentación del sitio vive en los `<style>` de los `.astro`, en las hojas `.css` y en las
 * cadenas `style` de los `.astro` (como las de `EdicionesEnVenta.astro`), que es lo que se recorre.
 */

const TOKENS = 'src/styles/tokens.css';
const DESIGN = '_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/DESIGN.md';

/** El único literal admitido: fichero, selector, propiedad y valor, los cuatro exactos. */
const EXCEPCIONES: readonly { fichero: string; selector: string; propiedad: string; valor: string }[] = [
  { fichero: 'src/components/LetrasDeSalto.astro', selector: 'a', propiedad: 'line-height', valor: '1' },
];

/**
 * Los usos cuyo interlineado no es el de su cuerpo (DESIGN.md § Typography, «usos sueltos»): toman
 * el de `author` (1,4) con el cuerpo de `body-md` o `body-lg`.
 */
const EMPAREJAMIENTOS_EXCEPCIONALES: readonly { fichero: string; selector: string; interlineado: string }[] = [
  { fichero: 'src/components/FilaDeBloque.astro', selector: '.fila-de-bloque a', interlineado: 'autor' },
  { fichero: 'src/components/ListaDeObras.astro', selector: '.titulo', interlineado: 'autor' },
  { fichero: 'src/components/TarjetaDeObra.astro', selector: '.titulo', interlineado: 'autor' },
];

/** El nombre CSS de cada token de tipografía del frontmatter de DESIGN.md. */
const TOKEN_CSS: Record<string, string> = {
  'quote-xl': 'cita-xl',
  'quote-lg': 'cita-lg',
  'quote-md': 'cita-md',
  'quote-sm': 'cita-sm',
  'headline-md': 'titular-md',
  'headline-sm': 'titular-sm',
  'title-lg': 'titular-obra',
  'body-lg': 'cuerpo-lg',
  'body-md': 'cuerpo-md',
  author: 'autor',
  caption: 'pie',
};

/** Las propiedades personalizadas que declara una hoja, con su valor. */
function propiedadesDe(css: string): Map<string, string> {
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return new Map([...sinComentarios.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const DECLARADOS = propiedadesDe(readFileSync(join(RAIZ, TOKENS), 'utf8'));

interface Literal {
  fichero: string;
  selector: string;
  declaracion: string;
}

interface Declaracion {
  /** El bloque `{…}` que la contiene, numerado en orden: dos reglas con el mismo selector son dos bloques. */
  bloque: number;
  selector: string;
  propiedad: string;
  valor: string;
}

const PROPIEDADES = /^(font-weight|line-height|font)$/;
const PALABRAS_CLAVE = /^(inherit|initial|unset|revert|revert-layer)$/;

/** El valor sin el `!important` final, que no cambia de qué token sale. */
const sinImportant = (valor: string) => valor.replace(/\s*!\s*important\s*$/iu, '').trim();

/**
 * Si una declaración de peso, interlineado o atajo `font` no sale de su token, por qué; si sale,
 * `undefined`. El token tiene que ser de su clase —un peso no toma un interlineado— y estar
 * declarado en `tokens.css`, y el valor es el `var()` a secas: un respaldo dentro sería otro
 * literal.
 */
function problemaDe(fichero: string, selector: string, propiedad: string, valorEscrito: string): string | undefined {
  const valor = sinImportant(valorEscrito);
  if (EXCEPCIONES.some((e) => e.fichero === fichero && e.selector === selector && e.propiedad === propiedad && e.valor === valor)) {
    return undefined;
  }
  if (propiedad === 'font') {
    return PALABRAS_CLAVE.test(valor) ? undefined : 'el atajo `font` escribe peso e interlineado a mano';
  }
  const clase = propiedad === 'font-weight' ? 'peso' : 'interlineado';
  const token = new RegExp(`^var\\((--${clase}-[a-z0-9-]+)\\)$`).exec(valor)?.[1];
  if (token === undefined) return `no es un \`var(--${clase}-…)\``;
  if (!DECLARADOS.has(token)) return `${token} no está declarado en ${TOKENS}`;
  return undefined;
}

/** Las declaraciones de una hoja, cada una con su selector y su bloque, `@media` incluido. */
function declaracionesDeHoja(css: string): Declaracion[] {
  const texto = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const pila: { selector: string; bloque: number }[] = [];
  const salida: Declaracion[] = [];
  let bloques = 0;
  let tramo = '';
  const cerrarDeclaracion = () => {
    const m = /^\s*([\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(tramo);
    const actual = pila.at(-1);
    if (m !== null && actual !== undefined) {
      salida.push({ bloque: actual.bloque, selector: actual.selector, propiedad: m[1].toLowerCase(), valor: m[2] });
    }
    tramo = '';
  };
  for (const caracter of texto) {
    if (caracter === '{') {
      pila.push({ selector: tramo.trim().replace(/\s+/g, ' '), bloque: bloques++ });
      tramo = '';
    } else if (caracter === '}') {
      cerrarDeclaracion();
      pila.pop();
    } else if (caracter === ';') {
      cerrarDeclaracion();
    } else {
      tramo += caracter;
    }
  }
  return salida;
}

/**
 * Lo que no casa entre cuerpo e interlineado: en un bloque con `font-size: var(--X)` y
 * `line-height: var(--interlineado-Y)`, Y tiene que ser X, salvo los emparejamientos
 * excepcionales. Un bloque sin `font-size` no se empareja: hereda el cuerpo de otra regla.
 */
function desemparejadosEn(fichero: string, declaraciones: readonly Declaracion[]): Literal[] {
  const porBloque = new Map<number, Declaracion[]>();
  for (const d of declaraciones) porBloque.set(d.bloque, [...(porBloque.get(d.bloque) ?? []), d]);
  const literales: Literal[] = [];
  for (const bloque of porBloque.values()) {
    const cuerpo = bloque.find((d) => d.propiedad === 'font-size');
    const interlineado = bloque.find((d) => d.propiedad === 'line-height');
    if (cuerpo === undefined || interlineado === undefined) continue;
    const x = /^var\(--([a-z0-9-]+)\)$/.exec(sinImportant(cuerpo.valor))?.[1];
    const y = /^var\(--interlineado-([a-z0-9-]+)\)$/.exec(sinImportant(interlineado.valor))?.[1];
    if (x === undefined || y === undefined) continue;
    const selector = interlineado.selector;
    const esperado =
      EMPAREJAMIENTOS_EXCEPCIONALES.find((e) => e.fichero === fichero && e.selector === selector)?.interlineado ?? x;
    if (y !== esperado) {
      literales.push({
        fichero,
        selector,
        declaracion: `line-height: ${sinImportant(interlineado.valor)} — el cuerpo es var(--${x}) y le toca var(--interlineado-${esperado})`,
      });
    }
  }
  return literales;
}

/** Los `<style>` de un `.astro`, o la hoja entera si es `.css`. */
const hojasDe = (fichero: string, fuente: string) =>
  fichero.endsWith('.css') ? [fuente] : [...fuente.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);

/**
 * Los literales de un fichero: en sus `<style>` (o en la hoja entera, si es `.css`) y, fuera de
 * ellos, en cualquier declaración con forma CSS —un atributo `style` o las cadenas con que se
 * compone, como las de `EdicionesEnVenta.astro`—. Lo comentado —de bloque, de HTML o de línea—
 * no cuenta.
 */
function literalesEn(fichero: string, fuente: string): Literal[] {
  const literales: Literal[] = [];
  for (const hoja of hojasDe(fichero, fuente)) {
    const declaraciones = declaracionesDeHoja(hoja);
    for (const { selector, propiedad, valor } of declaraciones) {
      if (!PROPIEDADES.test(propiedad)) continue;
      const problema = problemaDe(fichero, selector, propiedad, valor);
      if (problema !== undefined) literales.push({ fichero, selector, declaracion: `${propiedad}: ${valor} — ${problema}` });
    }
    literales.push(...desemparejadosEn(fichero, declaraciones));
  }
  if (!fichero.endsWith('.css')) {
    const resto = fuente
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      // Un comentario de línea del frontmatter o de un guion; `://` de una URL no lo es.
      .replace(/(?<![:\\])\/\/[^\n]*/g, '');
    for (const m of resto.matchAll(/(?<![\w-])(font-weight|line-height|font)\s*:\s*([^;'"`}\n]+)/g)) {
      const valor = m[2].trim();
      const problema = problemaDe(fichero, 'atributo style', m[1], valor);
      if (problema !== undefined) literales.push({ fichero, selector: 'atributo style', declaracion: `${m[1]}: ${valor} — ${problema}` });
    }
  }
  return literales;
}

/** Todo `.astro` y todo `.css` de `src/` salvo `tokens.css`, por su ruta relativa a la raíz. */
function ficherosVigilados(): string[] {
  return readdirSync(join(RAIZ, 'src'), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => relative(RAIZ, join(e.parentPath, e.name)))
    .filter((ruta) => ruta.endsWith('.astro') || ruta.endsWith('.css'))
    .filter((ruta) => ruta !== TOKENS)
    .sort();
}

/** Las declaraciones de los `<style>` de un fichero del árbol. */
const declaracionesDeFichero = (fichero: string) =>
  hojasDe(fichero, readFileSync(join(RAIZ, fichero), 'utf8')).flatMap(declaracionesDeHoja);

describe('Historia 26.12 — tokens.css declara el peso y el interlineado de cada token', () => {
  const frontmatter = () => {
    const diseño = readFileSync(join(RAIZ, DESIGN), 'utf8');
    const bloque = /^---\n([\s\S]*?)\n---/.exec(diseño);
    if (bloque === null) throw new Error(`${DESIGN} no empieza con un frontmatter YAML entre «---»: no hay tokens que cotejar.`);
    const datos = parse(bloque[1]) as { typography?: Record<string, { fontWeight: string; lineHeight: string }> };
    if (datos.typography === undefined) throw new Error(`El frontmatter de ${DESIGN} no declara \`typography\`.`);
    return datos.typography;
  };

  it('los dos pesos: 400 y 600, los únicos que declara el frontmatter de DESIGN.md', () => {
    expect(DECLARADOS.get('--peso-regular')).toBe('400');
    expect(DECLARADOS.get('--peso-fuerte')).toBe('600');
    const pesos = new Set(Object.values(frontmatter()).map((t) => Number(t.fontWeight)));
    expect([...pesos].sort()).toEqual([Number(DECLARADOS.get('--peso-regular')), Number(DECLARADOS.get('--peso-fuerte'))]);
  });

  it('un interlineado por token de tipografía, con el `lineHeight` del frontmatter de DESIGN.md', () => {
    const tipografia = frontmatter();
    expect(Object.keys(tipografia).sort()).toEqual(Object.keys(TOKEN_CSS).sort());
    for (const [clave, { lineHeight }] of Object.entries(tipografia)) {
      const css = TOKEN_CSS[clave];
      expect(DECLARADOS.has(`--${css}`), `--${css}`).toBe(true);
      expect(DECLARADOS.has(`--interlineado-${css}`), `--interlineado-${css}`).toBe(true);
      expect(Number(DECLARADOS.get(`--interlineado-${css}`)), `--interlineado-${css}`).toBe(Number(lineHeight));
    }
    const interlineados = [...DECLARADOS.keys()].filter((k) => k.startsWith('--interlineado-'));
    expect(interlineados.sort()).toEqual(Object.values(TOKEN_CSS).map((t) => `--interlineado-${t}`).sort());
  });

  it('el `body` toma el interlineado de su cuerpo', () => {
    const body = declaracionesDeHoja(readFileSync(join(RAIZ, TOKENS), 'utf8')).filter((d) => d.selector === 'body');
    expect(body.find((d) => d.propiedad === 'font-size')?.valor).toBe('var(--cuerpo-lg)');
    expect(body.find((d) => d.propiedad === 'line-height')?.valor).toBe('var(--interlineado-cuerpo-lg)');
  });
});

describe('Historia 26.12 — ningún componente escribe un peso ni un interlineado literal', () => {
  it('la guardia ve lo que tiene que ver (fuentes sintéticas)', () => {
    const astro = (estilo: string) => `---\n---\n<p class="x">x</p>\n<style>\n${estilo}\n</style>\n`;
    const de = (fichero: string, fuente: string) => literalesEn(fichero, fuente).map((l) => `${l.selector} | ${l.declaracion}`);

    // Literal nuevo, en una regla y dentro de un `@media`, nombrando selector y declaración.
    expect(de('src/components/X.astro', astro('.x { font-weight: 700; }'))).toEqual([
      '.x | font-weight: 700 — no es un `var(--peso-…)`',
    ]);
    expect(de('src/components/X.astro', astro('@media (min-width: 600px) { .x { line-height: 1.3; } }'))).toEqual([
      '.x | line-height: 1.3 — no es un `var(--interlineado-…)`',
    ]);
    // `!important` no esconde un literal ni estorba a un token.
    expect(de('src/components/X.astro', astro('.x { line-height: 1.4 !important; }'))).toHaveLength(1);
    expect(de('src/components/X.astro', astro('.x { font-weight: var(--peso-fuerte) !important; }'))).toEqual([]);
    // El atajo `font` falla igual; una palabra clave global no escribe nada a mano.
    expect(de('src/components/X.astro', astro('.x { font: 600 15px/1.4 var(--sans); }'))).toHaveLength(1);
    expect(de('src/components/X.astro', astro('.x { font: inherit; }'))).toEqual([]);
    // Los tokens se admiten; uno inexistente, uno de otra clase o uno con respaldo, no.
    expect(
      de('src/components/X.astro', astro('.x { font-weight: var(--peso-fuerte); line-height: var(--interlineado-pie); }')),
    ).toEqual([]);
    expect(de('src/components/X.astro', astro('.x { line-height: var(--interlineado-gigante); }'))).toEqual([
      `.x | line-height: var(--interlineado-gigante) — --interlineado-gigante no está declarado en ${TOKENS}`,
    ]);
    expect(de('src/components/X.astro', astro('.x { font-weight: var(--interlineado-autor); }'))).toHaveLength(1);
    expect(de('src/components/X.astro', astro('.x { line-height: var(--interlineado-pie, 1.5); }'))).toHaveLength(1);
    // El interlineado es el del cuerpo de su regla; sin cuerpo en la regla, no se empareja.
    expect(de('src/components/X.astro', astro('.x { font-size: var(--pie); line-height: var(--interlineado-cita-xl); }'))).toEqual([
      '.x | line-height: var(--interlineado-cita-xl) — el cuerpo es var(--pie) y le toca var(--interlineado-pie)',
    ]);
    expect(de('src/components/X.astro', astro('.x { font-size: var(--pie); line-height: var(--interlineado-pie) !important; }'))).toEqual([]);
    expect(de('src/components/X.astro', astro('.x { line-height: var(--interlineado-cita-xl); }'))).toEqual([]);
    expect(
      de('src/components/X.astro', astro('.x { font-size: var(--pie); } .x { line-height: var(--interlineado-cita-xl); }')),
    ).toEqual([]);
    // Los emparejamientos excepcionales, solo en su fichero y su selector.
    const conAutor = astro('.titulo { font-size: var(--cuerpo-lg); line-height: var(--interlineado-autor); }');
    expect(de('src/components/TarjetaDeObra.astro', conAutor)).toEqual([]);
    expect(de('src/components/Otro.astro', conAutor)).toHaveLength(1);
    expect(
      de('src/components/TarjetaDeObra.astro', astro('.titulo { font-size: var(--cuerpo-lg); line-height: var(--interlineado-cuerpo-lg); }')),
    ).toHaveLength(1);
    // La excepción literal: solo en su fichero, su selector y su valor.
    expect(de('src/components/LetrasDeSalto.astro', astro('a { line-height: 1; }'))).toEqual([]);
    expect(de('src/components/LetrasDeSalto.astro', astro('li { line-height: 1; }'))).toHaveLength(1);
    expect(de('src/components/LetrasDeSalto.astro', astro('a { line-height: 1.1; }'))).toHaveLength(1);
    expect(de('src/components/Otro.astro', astro('a { line-height: 1; }'))).toHaveLength(1);
    // Un comentario no es una declaración: ni en una hoja, ni con `//` en el frontmatter o un guion.
    expect(de('src/components/X.astro', astro('/* line-height: 1.3; */ .x { color: var(--tinta); }'))).toEqual([]);
    expect(de('src/components/X.astro', `---\n// antes era 'font-weight: 600'\nconst u = 'https://x.org';\n---\n<script>\n  // line-height: 1.5\n</script>\n`)).toEqual([]);
    // Las cadenas `style` del marcado y del frontmatter también se miran.
    expect(de('src/components/X.astro', `---\nconst E = ['font-weight: 600', 'line-height: var(--interlineado-pie)'].join('; ');\n---\n<p style={E}>x</p>\n`)).toEqual([
      'atributo style | font-weight: 600 — no es un `var(--peso-…)`',
    ]);
    expect(de('src/components/X.astro', '<p style="line-height: 1.5">x</p>\n')).toHaveLength(1);
    // Una hoja `.css` se lee entera, esté donde esté en `src/`.
    expect(de('src/components/otra.css', '.x { font-weight: 400; }')).toHaveLength(1);
  });

  it('el árbol: ningún literal ni interlineado desemparejado fuera de las excepciones nombradas', () => {
    const ficheros = ficherosVigilados();
    expect(ficheros.length).toBeGreaterThan(20);
    const literales = ficheros.flatMap((fichero) => literalesEn(fichero, readFileSync(join(RAIZ, fichero), 'utf8')));
    expect(literales.map((l) => `${l.fichero} (${l.selector}): ${l.declaracion}`)).toEqual([]);
  });

  it('las excepciones siguen existiendo donde se nombran: si desaparece una, se quita de su lista', () => {
    for (const { fichero, selector, propiedad, valor } of EXCEPCIONES) {
      expect(
        declaracionesDeFichero(fichero).some((d) => d.selector === selector && d.propiedad === propiedad && sinImportant(d.valor) === valor),
        `${fichero} (${selector}): ${propiedad}: ${valor}`,
      ).toBe(true);
    }
    for (const { fichero, selector, interlineado } of EMPAREJAMIENTOS_EXCEPCIONALES) {
      expect(
        declaracionesDeFichero(fichero).some(
          (d) => d.selector === selector && d.propiedad === 'line-height' && sinImportant(d.valor) === `var(--interlineado-${interlineado})`,
        ),
        `${fichero} (${selector}): line-height: var(--interlineado-${interlineado})`,
      ).toBe(true);
    }
  });
});
