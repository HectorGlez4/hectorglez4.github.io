import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import {
  MIN_PARECIDO_PARA_CORREGIR,
  cifraDeParecido,
  formaParaComparar,
  indiceDeContencion,
  parecidoDeTextos,
  parecidoEntre,
} from '../../tools/lib/parecido.ts';
import { MIN_CARACTERES_PARA_CONTENCION } from '../../src/lib/umbrales.ts';
import { normalizar } from '../../src/lib/normalizar.ts';
import { RAIZ } from './ayuda/construir.js';

/** Historia 29.4 — una sola medida de parecido (AD-3 enmendado v9, FR-14). */

const ESTROFA_XXXIX =
  'Cultivo una rosa blanca\nEn julio como enero,\nPara el amigo sincero\nQue me da su mano franca.';

describe('parecidoEntre — la matriz de la 29.4', () => {
  it('repetidas: la misma forma canónica, con otra puntuación, mayúsculas y tildes', () => {
    expect(parecidoEntre('La vida, si sabes usarla, es larga.', 'LA VIDÁ SI SABES USARLA ES LARGA')).toEqual({
      clase: 'repetidas',
      parecido: 1,
    });
  });

  it('repetidas: el verso con sus saltos frente a la misma de corrido (AD-29)', () => {
    expect(
      parecidoEntre('Cultivo una rosa blanca\nEn julio como enero', 'Cultivo una rosa blanca En julio como enero'),
    ).toEqual({ clase: 'repetidas', parecido: 1 });
  });

  it('casi iguales por una palabra, con la palabra que cambia', () => {
    const a = 'Cultivo una rosa blanca en julio como enero para el amigo sincero que me da su mano franca.';
    const b = 'Cultivo una rosa blanca en junio como enero para el amigo sincero que me da su mano franca.';
    const r = parecidoEntre(a, b);
    expect(r?.clase).toBe('casi-iguales');
    expect(r?.parecido).toBeGreaterThanOrEqual(MIN_PARECIDO_PARA_CORREGIR);
    expect(r?.parecido).toBe(parecidoDeTextos(a, b));
    expect(r?.palabra).toEqual({ a: 'julio', b: 'junio' });
    expect(r?.contenida).toBeUndefined();
  });

  it('casi iguales sin palabra cuando cambian dos', () => {
    const a = 'Cultivo una rosa blanca en julio como enero para el amigo sincero que me da su mano franca.';
    const b = 'Cultivo una rosa blanca en junio como enero para el amigo sincero que me da su mano blanca.';
    const r = parecidoEntre(a, b);
    expect(r?.clase).toBe('casi-iguales');
    expect(r?.palabra).toBeUndefined();
  });

  it('contenida: la corta tiene al menos el mínimo, y se dice cuál está dentro de cuál', () => {
    const corta = 'Cultivo una rosa blanca En julio como enero';
    expect(normalizar(corta).length).toBeGreaterThanOrEqual(MIN_CARACTERES_PARA_CONTENCION);
    const r = parecidoEntre(ESTROFA_XXXIX, corta);
    expect(r?.clase).toBe('contenida');
    expect(r?.contenida).toBe('b');
    expect(parecidoEntre(corta, ESTROFA_XXXIX)?.contenida).toBe('a');
    // Dentro de la otra, la distancia de edición es la diferencia de longitudes.
    expect(r?.parecido).toBeCloseTo(parecidoDeTextos(ESTROFA_XXXIX, corta), 10);
  });

  it('contenida por debajo del mínimo: nada', () => {
    const corta = 'Yo sé quién soy';
    expect(normalizar(corta).length).toBeLessThan(MIN_CARACTERES_PARA_CONTENCION);
    expect(parecidoEntre('Yo sé quién soy y sé que puedo ser no solo los que he dicho.', corta)).toBeUndefined();
  });

  it('nada: dos Citas distintas de la misma página (≈0,60)', () => {
    const a = 'El sabio hace luego lo que el necio al fin';
    const b = 'Haga al principio el cuerdo lo que el necio al fin';
    expect(parecidoDeTextos(a, b)).toBeLessThan(MIN_PARECIDO_PARA_CORREGIR);
    expect(parecidoEntre(a, b)).toBeUndefined();
  });

  it('precedencia: un fragmento al que le falta la palabra final es contenida, no casi igual', () => {
    const larga = 'No es que tengamos poco tiempo, es que perdemos mucho de verdad';
    const corta = 'No es que tengamos poco tiempo, es que perdemos mucho de';
    expect(parecidoDeTextos(larga, corta)).toBeGreaterThanOrEqual(MIN_PARECIDO_PARA_CORREGIR);
    expect(parecidoEntre(larga, corta)?.clase).toBe('contenida');
  });

  it('una forma canónica vacía no coincide con nada, ni con otra vacía', () => {
    expect(parecidoEntre('…', '¡!')).toBeUndefined();
    expect(parecidoEntre('…', 'La vida es larga')).toBeUndefined();
  });

  it('la forma precalculada responde lo mismo que el texto', () => {
    const pares: [string, string][] = [
      ['La vida, si sabes usarla, es larga.', 'la vida si sabes usarla es larga'],
      [ESTROFA_XXXIX, 'Cultivo una rosa blanca En julio como enero'],
      ['El sabio hace luego lo que el necio al fin', 'Haga al principio el cuerdo lo que el necio al fin'],
    ];
    for (const [a, b] of pares) {
      expect(parecidoEntre(formaParaComparar(a), formaParaComparar(b))).toEqual(parecidoEntre(a, b));
    }
  });

  it('los descartes son exactos: en pares al azar, el veredicto coincide con la distancia de edición', () => {
    // Variaciones de una frase: se le quitan, cambian o añaden letras al azar, con semilla fija.
    let semilla = 29_4;
    const azar = () => ((semilla = (semilla * 1_103_515_245 + 12_345) % 2 ** 31) / 2 ** 31);
    const base = 'la diligencia es madre de la buena ventura y la pereza su contraria';
    for (let n = 0; n < 400; n += 1) {
      let otra = base;
      const cambios = Math.floor(azar() * 20);
      for (let k = 0; k < cambios; k += 1) {
        const i = Math.floor(azar() * otra.length);
        const letra = 'abcdefghijklmnopqrstuvwxyz '[Math.floor(azar() * 27)];
        const op = azar();
        otra = op < 0.33 ? otra.slice(0, i) + otra.slice(i + 1) : op < 0.66 ? otra.slice(0, i) + letra + otra.slice(i + 1) : otra.slice(0, i) + letra + otra.slice(i);
      }
      const r = parecidoEntre(base, otra);
      const ca = normalizar(base);
      const cb = normalizar(otra);
      const esperado =
        cb === ''
          ? undefined
          : ca === cb
            ? 'repetidas'
            : Math.min(ca.length, cb.length) >= MIN_CARACTERES_PARA_CONTENCION && (ca.includes(cb) || cb.includes(ca))
              ? 'contenida'
              : parecidoDeTextos(base, otra) >= MIN_PARECIDO_PARA_CORREGIR
                ? 'casi-iguales'
                : undefined;
      expect(r?.clase, otra).toBe(esperado);
    }
  });

  it('el índice de contención no pierde ninguna contenedora', () => {
    const textos = [
      ESTROFA_XXXIX,
      'Cultivo una rosa blanca En julio como enero',
      'xcultivo una rosa blanca en julio como enero para el amigo',
      'Otra cosa muy distinta que no contiene nada de lo anterior, ni por asomo.',
    ];
    const formas = textos.map(formaParaComparar);
    const contenedoras = indiceDeContencion(formas);
    expect(contenedoras(formas[1]).sort()).toEqual([0, 2]);
    expect(contenedoras(formaParaComparar('Yo sé quién soy'))).toEqual([]);
  });

  it('el índice de contención encuentra la contenedora en que la última palabra queda a medias', () => {
    // «enero» solo aparece como «enerote» en la contenedora: la última palabra de la forma
    // contenida puede acabar a mitad de palabra, y el índice no debe elegirla como rara.
    const textos = [
      'Cultivo una rosa blanca en julio como enerote para el amigo sincero',
      'Cultivo una rosa blanca En julio como enero',
      'Yo cultivo una rosa blanca en julio como enero, y en julio otra',
    ];
    const formas = textos.map(formaParaComparar);
    const contenedoras = indiceDeContencion(formas);
    expect(contenedoras(formas[1]).sort()).toEqual([0, 2]);
    expect(parecidoEntre(formas[0], formas[1])?.clase).toBe('contenida');
  });

  it('la cifra de lo que no es igual nunca se escribe 1,00', () => {
    expect(cifraDeParecido(1)).toBe('1,00');
    expect(cifraDeParecido(0.996)).toBe('0,99');
    expect(cifraDeParecido(0.9949)).toBe('0,99');
    expect(cifraDeParecido(0.906)).toBe('0,91');
  });
});

describe('dueños del parecido (Historia 29.4)', () => {
  const ARBOLES = ['tools', 'src', 'integraciones', 'public/islas'];
  function ficheros(dir: string): string[] {
    const salida: string[] = [];
    for (const nombre of readdirSync(dir)) {
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) salida.push(...ficheros(ruta));
      else if (/\.(ts|mts|js|mjs|astro)$/u.test(nombre)) salida.push(ruta);
    }
    return salida;
  }
  const todos = ARBOLES.flatMap((a) => ficheros(join(RAIZ, a))).map((ruta) => ({
    ruta: relative(RAIZ, ruta).split('\\').join('/'),
    contenido: readFileSync(ruta, 'utf8'),
  }));

  it('la medida, la distancia de edición y el umbral se definen solo en tools/lib/parecido.ts', () => {
    const definiciones = [
      /function\s+parecidoEntre\b/u,
      /function\s+parecidoDeTextos\b/u,
      /function\s+distanciaDeEdicion\b/u,
      /\bMIN_PARECIDO_PARA_CORREGIR\s*=/u,
    ];
    for (const patron of definiciones) {
      expect(todos.filter((f) => patron.test(f.contenido)).map((f) => f.ruta)).toEqual(['tools/lib/parecido.ts']);
    }
  });

  it('no queda ningún contenidaEn: la contención es de parecidoEntre', () => {
    expect(todos.filter((f) => /\bcontenidaEn\b/u.test(f.contenido)).map((f) => f.ruta)).toEqual([]);
  });

  it('MIN_CARACTERES_PARA_CONTENCION solo lo importa tools/lib/parecido.ts', () => {
    const importadores = todos
      .filter((f) => f.ruta !== 'src/lib/umbrales.ts' && /\bMIN_CARACTERES_PARA_CONTENCION\b/u.test(f.contenido))
      .map((f) => f.ruta);
    expect(importadores).toEqual(['tools/lib/parecido.ts']);
  });

  it('nadie más importa la medida desde otro módulo que no sea parecido.ts', () => {
    const importaLaMedida = todos.filter((f) =>
      [...f.contenido.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gu)].some(
        (m) =>
          /\b(parecidoEntre|parecidoDeTextos|MIN_PARECIDO_PARA_CORREGIR)\b/u.test(m[1]) &&
          resolve(RAIZ, dirname(f.ruta), m[2]) !== join(RAIZ, 'tools/lib/parecido.ts'),
      ),
    );
    expect(importaLaMedida.map((f) => f.ruta)).toEqual([]);
  });
});
