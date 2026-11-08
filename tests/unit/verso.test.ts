import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { enUnaLinea, versosDe } from '../../src/lib/verso.ts';

/**
 * Historia 29.3 — los dos dueños del verso en las salidas (`src/lib/verso.ts`).
 */

const raiz = resolve(import.meta.dirname, '../..');

const MARTI =
  'Yo vengo de todas partes,\nY hacia todas partes voy:\nArte soy entre las artes,\nEn los montes, monte soy.';

describe('versosDe', () => {
  it('un texto sin saltos es un solo verso, el mismo texto', () => {
    expect(versosDe('Todo necio confunde valor y precio.')).toEqual(['Todo necio confunde valor y precio.']);
  });

  it('parte por cada salto, en orden', () => {
    expect(versosDe('Verde que te quiero verde.\nVerde viento.')).toEqual([
      'Verde que te quiero verde.',
      'Verde viento.',
    ]);
    expect(versosDe(MARTI)).toEqual([
      'Yo vengo de todas partes,',
      'Y hacia todas partes voy:',
      'Arte soy entre las artes,',
      'En los montes, monte soy.',
    ]);
  });
});

describe('enUnaLinea', () => {
  it('sin saltos, el mismo texto', () => {
    expect(enUnaLinea('Todo necio confunde valor y precio.')).toBe('Todo necio confunde valor y precio.');
  });

  it('une los versos con « / » y no deja ningún salto', () => {
    expect(enUnaLinea('Verde que te quiero verde.\nVerde viento.')).toBe('Verde que te quiero verde. / Verde viento.');
    expect(enUnaLinea(MARTI)).toBe(
      'Yo vengo de todas partes, / Y hacia todas partes voy: / Arte soy entre las artes, / En los montes, monte soy.',
    );
    expect(enUnaLinea(MARTI)).not.toContain('\n');
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

const CODIGO = [...ficheros(join(raiz, 'src')), ...ficheros(join(raiz, 'public/islas'))].map((ruta) => ({
  ruta: relative(raiz, ruta),
  contenido: readFileSync(ruta, 'utf8'),
}));

describe('el verso tiene dos dueños y nadie más lo interpreta', () => {
  /**
   * Partir, sustituir o quitar el salto: `split`, `replace` o `replaceAll` con una cadena o una
   * expresión regular que lo nombre, o el salto por su código.
   */
  const LEE_EL_SALTO = /\.(?:split|replace|replaceAll)\(\s*(?:'\\n'|"\\n"|`\\n`|\/(?:[^/\n\\]|\\.)*\\n(?:[^/\n\\]|\\.)*\/[a-z]*)|fromCharCode\(\s*10\s*\)/gu;
  /** « / » como separador escrito en el código. */
  const SEPARADOR = /(['"]) \/ \1|join\(\s*` \/ `/;

  it('solo `src/lib/verso.ts` y `public/islas/imagen.js` parten por el salto; las exenciones, nombradas una a una', () => {
    const usos = CODIGO.flatMap(({ ruta, contenido }) => [...contenido.matchAll(LEE_EL_SALTO)].map((m) => `${ruta}: ${m[0]}`));
    expect(usos.sort()).toEqual(
      [
        "public/islas/imagen.js: .split('\\n'",
        "src/lib/verso.ts: .split('\\n'",
        // Parte un documento de biografía, no el texto de una Cita.
        'src/lib/biografia.ts: .replace(/\\r\\n?/gu',
        "src/lib/biografia.ts: .split('\\n'",
      ].sort(),
    );
  });

  it('solo `src/lib/verso.ts` escribe « / » como separador', () => {
    const fuera = CODIGO.filter(({ contenido }) => SEPARADOR.test(contenido)).map(({ ruta }) => ruta);
    expect(fuera).toEqual(['src/lib/verso.ts']);
  });

  it('`TextoDeCita.astro` solo lo importan el Bloque de Cita, la Tarjeta de Cita y el material del Kit', () => {
    const usos = CODIGO.filter(({ contenido }) => /import\s+TextoDeCita\b/.test(contenido)).map(({ ruta }) => ruta);
    expect(usos.sort()).toEqual([
      'src/components/BloqueDeCita.astro',
      'src/components/MaterialParaPublicar.astro',
      'src/components/TarjetaDeCita.astro',
    ]);
  });
});
