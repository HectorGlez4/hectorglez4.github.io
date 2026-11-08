import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Historia 34.3, NFR-9, WCAG 2.2 § 1.4.11 — el contorno del Campo de búsqueda (`--contorno`) se
 * distingue del fondo que lo rodea (`--papel`) con al menos 3:1.
 *
 * Lee los dos tokens del `:root` de `src/styles/tokens.css` —el único sitio donde se declaran— y
 * calcula la razón de contraste de WCAG 2.x con la luminancia relativa sRGB. Si un día baja de 3:1,
 * cambiar el token es de Héctor con `bmad-ux`, no de esta prueba. Sin `astro build`.
 */

const RAIZ = join(import.meta.dirname, '..', '..');
const MINIMO = 3;

/**
 * Los cuerpos de todo bloque `:root…{ … }` de `tokens.css` —también los de dentro de un `@media`
 * o con `:not(…)`/`[data-theme]`—, sin comentarios y cortando por llaves emparejadas: un `}` en un
 * comentario (el de `{typography.code}`) o un bloque anidado no truncan la lectura. El primero es
 * el de los valores de partida.
 */
function bloquesRaiz(css: string): string[] {
  const limpio = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const bloques: string[] = [];
  for (const selector of limpio.matchAll(/:root[^{};]*\{/g)) {
    const abre = selector.index! + selector[0].length;
    let profundidad = 1;
    let i = abre;
    for (; i < limpio.length && profundidad > 0; i++) {
      if (limpio[i] === '{') profundidad++;
      else if (limpio[i] === '}') profundidad--;
    }
    if (profundidad > 0) throw new Error('un `:root` de tokens.css no se deja leer');
    bloques.push(limpio.slice(abre, i - 1));
  }
  if (bloques.length === 0) throw new Error('tokens.css no declara `:root`');
  return bloques;
}

/** El valor de un token del `:root`, que tiene que ser un hex de 6 cifras. */
function token(raiz: string, nombre: string): string {
  const declaracion = new RegExp(`(?:^|[;{\\s])${nombre}\\s*:\\s*([^;]+);`).exec(raiz);
  if (!declaracion) throw new Error(`tokens.css no declara ${nombre} en \`:root\``);
  const valor = declaracion[1].trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(valor)) throw new Error(`${nombre} no es un hex de 6 cifras: «${valor}»`);
  return valor;
}

/** Luminancia relativa de WCAG 2.x, sobre un hex `#rrggbb`. */
function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

describe('Historia 34.3 — el contorno del Campo de búsqueda contra el papel', () => {
  it('la fórmula da lo conocido: negro sobre blanco 21:1, un color sobre sí mismo 1:1', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contraste('#8a7f72', '#8a7f72')).toBeCloseTo(1, 5);
  });

  it('`--contorno` sobre `--papel` da al menos 3:1, en el `:root` de partida y en todo bloque que los redefina', async () => {
    const [partida, ...demas] = bloquesRaiz(await readFile(join(RAIZ, 'src', 'styles', 'tokens.css'), 'utf8'));
    const pares = [{ contorno: token(partida, '--contorno'), papel: token(partida, '--papel') }];
    // Un tema u otra variante que redefina uno de los dos se juzga con el otro de partida.
    const redefine = (raiz: string, nombre: string) => new RegExp(`(?:^|[;{\\s])${nombre}\\s*:`).test(raiz);
    for (const bloque of demas) {
      if (!redefine(bloque, '--contorno') && !redefine(bloque, '--papel')) continue;
      pares.push({
        contorno: redefine(bloque, '--contorno') ? token(bloque, '--contorno') : pares[0].contorno,
        papel: redefine(bloque, '--papel') ? token(bloque, '--papel') : pares[0].papel,
      });
    }
    for (const { contorno, papel } of pares) {
      const razon = contraste(contorno, papel);
      expect(razon, `--contorno ${contorno} sobre --papel ${papel}: ${razon.toFixed(2)}:1`).toBeGreaterThanOrEqual(MINIMO);
    }
  });

  it('la lectura del `:root` no se deja truncar por un `}` en un comentario ni confundir por otro bloque', () => {
    const css = ':root {\n  /* `{typography.code}` */\n  --papel: #faf7f0;\n}\n@media (min-width: 600px) {\n  :root { --unidad: 9px; }\n}\n:root[data-theme="oscuro"] { --contorno: #111111; }';
    const bloques = bloquesRaiz(css);
    expect(bloques).toHaveLength(3);
    expect(token(bloques[0], '--papel')).toBe('#faf7f0');
    expect(token(bloques[2], '--contorno')).toBe('#111111');
  });

  it('un token que falta o no es hex de 6 cifras no se da por bueno', () => {
    expect(() => token('--papel: #faf7f0;', '--contorno')).toThrow(/no declara --contorno/);
    expect(() => token('--contorno: #888;', '--contorno')).toThrow(/hex de 6 cifras/);
    expect(() => token('--contorno: var(--otro);', '--contorno')).toThrow(/hex de 6 cifras/);
  });
});
