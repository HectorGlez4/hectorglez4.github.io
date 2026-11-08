import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { recortarPorPalabra } from '../../src/lib/recorte.ts';
import { MAX_CARACTERES_DE_TARJETA_DE_CITA, MAX_CARACTERES_DE_TITULO_Y_META } from '../../src/lib/umbrales.ts';
import { enUnaLinea } from '../../src/lib/verso.ts';

/**
 * Historia 34.1 — un solo dueño del recorte por palabra (`src/lib/recorte.ts`, UX-DR131,
 * UX-DR132). Sin construir: la función, con la matriz de la historia, y la regla de que nadie más
 * recorta texto de Cita en `src/components/` ni en `src/pages/`.
 */

const raiz = resolve(import.meta.dirname, '../..');

/** Lo que cuenta el recorte: puntos de código, sin los saltos de verso. */
const cuenta = (texto: string) => [...texto].filter((c) => c !== '\n').length;

/** Una cadena de `n` puntos de código sin blancos. */
const palabra = (n: number, letra = 'a') => letra.repeat(n);

/** El de `tests/unit/verso-construido.test.ts`. */
const LARGA =
  'De aquélla que lo ha matado.\nRápida como un reflejo,\nDos veces vi el alma, dos:\nCuando murió el pobre viejo,\nCuando ella me dijo adiós.';

/** `corpus/citas/jose-marti--yo-se-que-el-necio-se-entierra.md`. */
const NECIO =
  'Yo sé que el necio se entierra\nCon gran lujo y con gran llanto, -\nY que no hay fruta en la tierra\nComo la del camposanto.';

describe('recortarPorPalabra', () => {
  it('cabe justa: cuenta igual al tope, el texto idéntico y sin «…»', () => {
    const texto = `${palabra(10)} ${palabra(9)}`;
    expect(cuenta(texto)).toBe(20);
    expect(recortarPorPalabra(texto, 20)).toBe(texto);
    expect(recortarPorPalabra('Breve.', 120)).toBe('Breve.');
  });

  it('pasa por uno: prefijo en palabra entera más «…», y cuenta dentro del tope', () => {
    const texto = `${palabra(10)} ${palabra(10)}`;
    expect(cuenta(texto)).toBe(21);
    const recorte = recortarPorPalabra(texto, 20);
    expect(recorte).toBe(`${palabra(10)}…`);
    expect(cuenta(recorte)).toBeLessThanOrEqual(20);
  });

  it('«camposanto» en el borde: corta antes de la palabra, nunca «camposant…»', () => {
    const texto = 'Como la del camposanto, y nada más.';
    for (let tope = 12; tope <= 22; tope++) {
      const recorte = recortarPorPalabra(texto, tope);
      expect(recorte, String(tope)).toBe('Como la del…');
      expect(recorte).not.toContain('camposant…');
    }
    expect(recortarPorPalabra(texto, 23)).toBe('Como la del camposanto…');
  });

  it('puntuación delante: quita los blancos y `,` `;` `:` que cuelgan', () => {
    expect(recortarPorPalabra('Dos veces vi el alma, dos: Cuando murió', 27)).toBe('Dos veces vi el alma, dos…');
    expect(recortarPorPalabra('Cuando murió el pobre viejo, cuando ella', 29)).toBe('Cuando murió el pobre viejo…');
    expect(recortarPorPalabra('Uno ; dos tres cuatro', 8)).toBe('Uno…');
    expect(recortarPorPalabra('Uno,;: dos tres cuatro', 8)).toBe('Uno…');
  });

  it('verso, corte tras un salto: los saltos no cuentan y se conservan dentro', () => {
    expect(cuenta(LARGA)).toBe(131);
    const recorte = recortarPorPalabra(LARGA, 120);
    expect(recorte).toBe(
      'De aquélla que lo ha matado.\nRápida como un reflejo,\nDos veces vi el alma, dos:\nCuando murió el pobre viejo,\nCuando ella me…',
    );
    expect(cuenta(recorte)).toBeLessThanOrEqual(120);
  });

  it('verso, título: recortar y después `enUnaLinea`, sin salto ni « / » delante de «…»', () => {
    const titulo = enUnaLinea(recortarPorPalabra(LARGA, MAX_CARACTERES_DE_TITULO_Y_META));
    expect(titulo).toBe(
      'De aquélla que lo ha matado. / Rápida como un reflejo, / Dos veces vi el alma, dos: / Cuando murió el pobre viejo…',
    );
    expect(titulo).not.toMatch(/(\/|\s)…$/u);
  });

  it('verso que ya cabe: Martí, 121 unidades UTF-16 con sus 3 saltos y 118 sin ellos, entero', () => {
    expect(NECIO.length).toBe(121);
    expect(cuenta(NECIO)).toBe(118);
    expect(recortarPorPalabra(NECIO, MAX_CARACTERES_DE_TARJETA_DE_CITA)).toBe(NECIO);
  });

  it('tildes, aperturas y astrales: cuenta por punto de código; «¿» y «¡» van con su palabra', () => {
    // «😀» son dos unidades UTF-16 y un punto de código.
    const astral = `${'😀'.repeat(10)} y`;
    expect(astral.length).toBe(22);
    expect(recortarPorPalabra(astral, 12)).toBe(astral);
    expect(recortarPorPalabra(`${'😀'.repeat(10)} y más`, 12)).toBe(`${'😀'.repeat(10)}…`);
    expect(recortarPorPalabra('áéíóú áéíóú', 11)).toBe('áéíóú áéíóú');
    expect(recortarPorPalabra('áéíóú áéíóú', 10)).toBe('áéíóú…');
    expect(recortarPorPalabra('Hola. ¿Qué haces aquí?', 10)).toBe('Hola.…');
    expect(recortarPorPalabra('Hola. ¡Ay de mí!', 9)).toBe('Hola.…');
    expect(recortarPorPalabra('¿Qué haces aquí, amigo?', 12)).toBe('¿Qué haces…');
  });

  it('primera palabra larga con más texto: esa palabra entera más «…», aunque pase del tope', () => {
    expect(recortarPorPalabra('Supercalifragilístico y más', 5)).toBe('Supercalifragilístico…');
    expect(recortarPorPalabra('Supercalifragilístico, y más', 5)).toBe('Supercalifragilístico…');
  });

  it('una sola palabra más larga que el tope: el texto tal cual', () => {
    expect(recortarPorPalabra('Supercalifragilístico', 5)).toBe('Supercalifragilístico');
  });

  it('primera palabra larga tras blancos o `,` `;` `:` iniciales: esa palabra más «…», nunca el texto entero', () => {
    expect(recortarPorPalabra(' Supercalifragilístico y más', 5)).toBe(' Supercalifragilístico…');
    expect(recortarPorPalabra('\nSupercalifragilístico y más', 5)).toBe('\nSupercalifragilístico…');
    expect(recortarPorPalabra(', Supercalifragilístico, y más', 5)).toBe(', Supercalifragilístico…');
  });

  it('un tope sin sentido rompe en vez de recortar mal', () => {
    for (const tope of [Number.NaN, 0, 1, -5, 12.5, Number.POSITIVE_INFINITY]) {
      expect(() => recortarPorPalabra('Uno dos tres', tope), String(tope)).toThrow(/tope inválido/);
    }
  });
});

/** Todos los ficheros de código de un directorio, recursivamente. */
function ficheros(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.(ts|js|mjs|astro)$/.test(nombre) ? [ruta] : [];
  });
}

/** Una expresión que nombra el texto: `texto`, `cita.texto`, `cita?.texto`, `miTexto`, `cita['texto']`; nunca `contexto`. */
const TEXTO = String.raw`(?<![\w$])(?:[\w$]+\??\.)*(?:texto\b|[\w$]*[a-z0-9_$]Texto\b|[\w$]+\s*\[\s*['"\x60]texto['"\x60]\s*\])`;
/** Lo que corta: `.slice(`, `.substring(` o `.substr(`. */
const CORTA = String.raw`\s*\??\.\s*(?:slice|substring|substr)\s*\(`;
/** Llamadas encadenadas entre el texto y el corte: `.trim()`, `.split(' ')`. */
const CADENA = String.raw`(?:\s*\??\.\s*[\w$]+\s*\([^()]*\))*`;

/**
 * `slice`, `substring` o `substr` sobre el texto —directo, tras llamadas encadenadas o sobre sus
 * puntos de código (`[...texto]`, `Array.from(texto)`)—: el recorte a ciegas que la 34.1 retira.
 * No ve un alias desestructurado ni una expresión regular que trunque: eso lo mira quien revisa.
 */
const RECORTA_TEXTO = new RegExp(
  String.raw`${TEXTO}${CADENA}${CORTA}|\[\s*\.\.\.\s*${TEXTO}[^\]]*\]${CORTA}|Array\.from\(\s*${TEXTO}[^)]*\)${CORTA}`,
  'gu',
);

describe('nadie más recorta texto de Cita', () => {
  it('el patrón ve las formas del recorte y no marca lo que no lo es', () => {
    const marcadas = [
      'cita.texto.slice(0, 119)',
      'texto.slice(0, LARGO)',
      'cita.texto.substring(0, 109)',
      'cita?.texto.slice(0, 1)',
      'Astro.props.cita.texto .slice (0, 2)',
      'const x = miTexto.slice(0, 3);',
      '[...cita.texto].slice(0, 119)',
      'Array.from(cita.texto).slice(0, 1)',
      'cita.texto.substr(0, 1)',
      'cita.texto.trim().slice(0, 2)',
      'cita["texto"].slice(0, 1)',
      "cita['texto'].slice(0, 1)",
      "texto.split(' ').slice(0, 3)",
    ];
    for (const forma of marcadas) expect(forma.match(RECORTA_TEXTO), forma).not.toBeNull();
    const limpias = [
      'respuesta.results.slice(0, TANDA_DE_RESULTADOS)',
      'nuevos.slice(desde, desde + TANDA_DE_RESULTADOS)',
      'textos.slice(0, 2)',
      'recortarPorPalabra(cita.texto, 120)',
      'contexto.slice(0, 2)',
      'pretexto.slice(0, 1)',
      'palabras(texto).slice(0, 4)',
    ];
    for (const forma of limpias) expect(forma.match(RECORTA_TEXTO), forma).toBeNull();
    const busqueda = readFileSync(join(raiz, 'src/components/Busqueda.astro'), 'utf8');
    expect(busqueda).toMatch(/\.slice\(/);
    expect(busqueda.match(RECORTA_TEXTO)).toBeNull();
  });

  it('ningún fichero de `src/` ni de `public/islas/` recorta texto de Cita', () => {
    // Todo `src/` —componentes, páginas, islas y `src/lib/`— y los guiones de `public/islas/`;
    // `src/lib/recorte.ts` recorta sus puntos de código (`caracteres`), no el texto.
    const usos = [...ficheros(join(raiz, 'src')), ...ficheros(join(raiz, 'public/islas'))].flatMap((ruta) =>
      [...readFileSync(ruta, 'utf8').matchAll(RECORTA_TEXTO)].map((m) => `${relative(raiz, ruta)}: ${m[0]}`),
    );
    expect(usos).toEqual([]);
  });
});
