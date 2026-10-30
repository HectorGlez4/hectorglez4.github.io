import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { aplanarAutor, autoresDestacados, type Autor } from '../../src/lib/publicado.ts';
import { compararPorClave } from '../../src/lib/normalizar.ts';
import { AUTORES_DESTACADOS, SUELO_TRADICION_LATINOAMERICANA } from '../../src/lib/umbrales.ts';

/**
 * Historia 27.6 — los ocho Autores destacados (FR-8, AD-11, AD-3, UX-DR62): la matriz de la
 * historia sobre `autoresDestacados`, pura y sin construir nada. Cada Autor se describe por su
 * clave de orden, su tradición y sus Citas; las Citas se generan aparte, así que un Autor sin
 * Citas no está publicado.
 */

const RAIZ = resolve(import.meta.dirname, '../..');

type Tradicion = Autor['tradicion'];
interface Descrito {
  slug: string;
  clave: string;
  tradicion?: Tradicion;
  citas: number;
}

const lat = (slug: string, clave: string, citas: number): Descrito => ({ slug, clave, tradicion: 'latinoamericana', citas });
const pen = (slug: string, clave: string, citas: number): Descrito => ({ slug, clave, tradicion: 'peninsular', citas });
const otra = (slug: string, clave: string, citas: number): Descrito => ({ slug, clave, tradicion: 'otra', citas });
const sinDeclarar = (slug: string, clave: string, citas: number): Descrito => ({ slug, clave, citas });

function autorDe({ slug, clave, tradicion }: Descrito): Autor {
  return {
    slug,
    nombre: `Nombre de ${slug}`,
    semblanza: 'Semblanza de prueba.',
    añoFallecimiento: 1900,
    ordenAlfabetico: clave,
    ...(tradicion !== undefined ? { tradicion } : {}),
  };
}

function entradas(descritos: readonly Descrito[]): { autores: Autor[]; citas: { autor: string }[] } {
  return {
    autores: descritos.map(autorDe),
    citas: descritos.flatMap(({ slug, citas }) => Array.from({ length: citas }, () => ({ autor: slug }))),
  };
}

const destacados = (descritos: readonly Descrito[]) => {
  const { autores, citas } = entradas(descritos);
  return autoresDestacados(autores, citas).map((a) => a.slug);
};

/** Los slugs en el orden del Directorio: por clave y, si empatan, por slug. */
const enDirectorio = (descritos: readonly Descrito[], slugs: readonly string[]) =>
  descritos
    .filter((d) => slugs.includes(d.slug))
    .sort((a, b) => compararPorClave({ clave: a.clave, slug: a.slug }, { clave: b.clave, slug: b.slug }))
    .map((d) => d.slug);

/**
 * Una permutación determinista: baraja con una semilla, sin `Math.random`. El congruencial va en
 * enteros de 32 bits (`Math.imul` y `>>> 0`): en coma flotante, `s · 1103515245` pasa de 2^53 y
 * pierde los bits bajos, y las permutaciones saldrían sesgadas.
 */
function barajar<T>(lista: readonly T[], semilla: number): T[] {
  const copia = [...lista];
  let s = semilla >>> 0;
  for (let i = copia.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = (s >>> 16) % (i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

describe('Historia 27.6 — los ocho Autores destacados', () => {
  it('los umbrales de la regla: ocho, y el suelo del 40 %', () => {
    expect(AUTORES_DESTACADOS).toBe(8);
    expect(SUELO_TRADICION_LATINOAMERICANA).toBe(40);
  });

  it('suelo cumplido (3 de 7 que cuentan): sin cesiones, los ocho en el orden del Directorio y nunca por recuento', () => {
    const corpus = [
      pen('unamuno', 'Unamuno', 100),
      lat('ingenieros', 'Ingenieros', 90),
      pen('quevedo', 'Quevedo', 80),
      otra('seneca', 'Séneca', 70),
      pen('gracian', 'Gracián', 60),
      pen('arenal', 'Arenal', 50),
      lat('marti', 'Martí', 40),
      lat('gonzalez-prada', 'González Prada', 30),
      lat('fuera', 'Fuera', 20),
      pen('lejos', 'Lejos', 10),
    ];
    const elegidos = destacados(corpus);
    expect(elegidos).toEqual(['arenal', 'gonzalez-prada', 'gracian', 'ingenieros', 'marti', 'quevedo', 'seneca', 'unamuno']);
    expect(elegidos).toEqual(enDirectorio(corpus, elegidos));
  });

  it('cede (2 de 7): el peninsular con menos Citas sale y entra el latinoamericano de fuera con más; 3 de 7 cumple y para', () => {
    const corpus = [
      pen('p1', 'P1', 100),
      pen('p2', 'P2', 95),
      lat('l1', 'L1', 90),
      pen('p3', 'P3', 85),
      otra('o1', 'O1', 80),
      pen('p4', 'P4', 75),
      lat('l2', 'L2', 70),
      pen('p5', 'P5', 65),
      lat('l3', 'L3', 50),
      lat('l4', 'L4', 40),
      pen('p6', 'P6', 30),
    ];
    // Cede `p5` (65, la última que puede ceder) y entra `l3` (50); `l4` se queda fuera.
    expect(destacados(corpus)).toEqual(['l1', 'l2', 'l3', 'o1', 'p1', 'p2', 'p3', 'p4']);
  });

  it('2 de 5 es el 40 % exacto: cumple, sin cesiones aunque haya latinoamericanos fuera', () => {
    const corpus = [
      otra('o1', 'O1', 100),
      otra('o2', 'O2', 99),
      otra('o3', 'O3', 98),
      pen('p1', 'P1', 97),
      pen('p2', 'P2', 96),
      pen('p3', 'P3', 95),
      lat('l1', 'L1', 94),
      lat('l2', 'L2', 93),
      lat('l3', 'L3', 10),
    ];
    expect(destacados(corpus)).toEqual(['l1', 'l2', 'o1', 'o2', 'o3', 'p1', 'p2', 'p3']);
  });

  it('varias cesiones: de uno en uno, los últimos que pueden ceder, hasta 4 de 8', () => {
    const elegidos = Array.from({ length: 8 }, (_, i) => pen(`p${i}`, `P${i}`, 100 - i));
    const fuera = Array.from({ length: 5 }, (_, i) => lat(`l${i}`, `L${i}`, 50 - i));
    // 0/8 → 1/8 → 2/8 → 3/8 (300 < 320) → 4/8 (400 ≥ 320): cuatro cesiones, `l4` se queda fuera.
    expect(destacados([...elegidos, ...fuera])).toEqual(['l0', 'l1', 'l2', 'l3', 'p0', 'p1', 'p2', 'p3']);
  });

  it('varias cesiones, hasta agotar los de fuera: con dos latinoamericanos, se queda en 2 de 8', () => {
    const elegidos = Array.from({ length: 8 }, (_, i) => pen(`p${i}`, `P${i}`, 100 - i));
    const fuera = [lat('l0', 'L0', 50), pen('px', 'PX', 45), lat('l1', 'L1', 40)];
    expect(destacados([...elegidos, ...fuera])).toEqual(['l0', 'l1', 'p0', 'p1', 'p2', 'p3', 'p4', 'p5']);
  });

  it('se detiene bajo el suelo si no hay latinoamericano fuera: sin cambios', () => {
    const corpus = [
      ...Array.from({ length: 7 }, (_, i) => pen(`p${i}`, `P${i}`, 100 - i)),
      lat('l0', 'L0', 50),
      pen('fuera', 'Fuera', 40),
      otra('o-fuera', 'OFuera', 30),
    ];
    expect(destacados(corpus)).toEqual(['l0', 'p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  });

  it('nunca cede un Autor de tradición `otra`: si los que no son latinoamericanos son todos `otra`, nada cambia', () => {
    const corpus = [
      ...Array.from({ length: 7 }, (_, i) => otra(`o${i}`, `O${i}`, 100 - i)),
      lat('l0', 'L0', 50),
      lat('l1', 'L1', 40),
      lat('l2', 'L2', 30),
    ];
    expect(destacados(corpus)).toEqual(['l0', 'o0', 'o1', 'o2', 'o3', 'o4', 'o5', 'o6']);
    // Y con un peninsular entre ellos, cede él y nunca un `otra`, aunque tenga menos Citas.
    const conPeninsular = [
      pen('p0', 'P0', 200),
      otra('o0', 'O0', 100),
      otra('o1', 'O1', 99),
      otra('o2', 'O2', 98),
      otra('o3', 'O3', 97),
      otra('o4', 'O4', 96),
      otra('o5', 'O5', 95),
      otra('o6', 'O6', 94),
      lat('l0', 'L0', 10),
    ];
    // 0 de 1 que cuenta: cede `p0` (el único que puede) y entra `l0`.
    expect(destacados(conPeninsular)).toEqual(['l0', 'o0', 'o1', 'o2', 'o3', 'o4', 'o5', 'o6']);
  });

  it('empates: decide el orden del Directorio en el corte, al ceder y al entrar', () => {
    // Nueve peninsulares empatados: el corte deja fuera al último por clave («Z»), no al último de la lista.
    const empatados = [
      pen('z', 'Z', 10),
      pen('a', 'A', 10),
      pen('b', 'B', 10),
      pen('c', 'C', 10),
      pen('d', 'D', 10),
      pen('e', 'E', 10),
      pen('f', 'F', 10),
      pen('g', 'G', 10),
      pen('h', 'H', 10),
    ];
    const corpus = [
      ...empatados,
      lat('lz', 'LZ', 5),
      lat('la', 'LA', 5),
      lat('lm', 'LM', 5),
      lat('lb', 'LB', 5),
      lat('lc', 'LC', 5),
    ];
    // Ceden, de uno en uno, los que van detrás en el Directorio (h, g, f, e) y entran los que van
    // delante (la, lb, lc, lm); `lz` se queda fuera.
    expect(destacados(corpus)).toEqual(['a', 'b', 'c', 'd', 'la', 'lb', 'lc', 'lm']);
    // A igual clave, el slug.
    const mismaClave = [pen('seneca-el-viejo', 'Séneca', 3), pen('seneca', 'Séneca', 3)];
    expect(destacados(mismaClave)).toEqual(['seneca', 'seneca-el-viejo']);
  });

  it('un Autor sin tradición declarada cuenta para el suelo y puede ceder', () => {
    const corpus = [
      ...Array.from({ length: 7 }, (_, i) => otra(`o${i}`, `O${i}`, 100 - i)),
      sinDeclarar('s0', 'S0', 60),
      lat('l0', 'L0', 50),
    ];
    // 0 de 1 que cuenta (el sin declarar): cede él y entra el latinoamericano.
    expect(destacados(corpus)).toEqual(['l0', 'o0', 'o1', 'o2', 'o3', 'o4', 'o5', 'o6']);
  });

  it('pocos: con menos de ocho publicados, todos; un Autor sin Citas, nunca', () => {
    const corpus = [pen('p0', 'P0', 3), lat('l0', 'L0', 1), otra('o0', 'O0', 2), pen('sin-citas', 'Sin', 0)];
    expect(destacados(corpus)).toEqual(['l0', 'o0', 'p0']);
    expect(destacados([])).toEqual([]);
  });

  it('un Autor publicado sin clave de orden lanza nombrando su slug y la orden; uno sin Citas no', () => {
    const { autores, citas } = entradas([pen('p0', 'P0', 2)]);
    const sinClave: Autor = { slug: 'sin-clave', nombre: 'Sin Clave', semblanza: 'S.', añoFallecimiento: 1900 };
    expect(() => autoresDestacados([...autores, sinClave], [...citas, { autor: 'sin-clave' }])).toThrow(
      /«sin-clave».*ordenAlfabetico.*npx tsx tools\/autor\.ts proponer-claves/su,
    );
    expect(autoresDestacados([...autores, sinClave], citas).map((a) => a.slug)).toEqual(['p0']);
  });

  it('determinista: los mismos ocho en el mismo orden, permuten como permuten Autores y Citas; y no muta la entrada', () => {
    const corpus = [
      pen('p1', 'P1', 100),
      pen('p2', 'P2', 95),
      lat('l1', 'L1', 90),
      pen('p3', 'P3', 85),
      otra('o1', 'O1', 80),
      pen('p4', 'P4', 75),
      sinDeclarar('s1', 'S1', 70),
      pen('p5', 'P5', 65),
      lat('l3', 'L3', 50),
      lat('l4', 'L4', 50),
      pen('p6', 'P6', 50),
      lat('l5', 'L5', 40),
    ];
    const { autores, citas } = entradas(corpus);
    const esperado = autoresDestacados(autores, citas).map((a) => a.slug);
    const copiaDeAutores = structuredClone(autores);
    const copiaDeCitas = structuredClone(citas);
    for (let semilla = 1; semilla <= 25; semilla++) {
      const resultado = autoresDestacados(barajar(autores, semilla), barajar(citas, semilla * 7 + 3)).map((a) => a.slug);
      expect(resultado, `semilla ${semilla}`).toEqual(esperado);
    }
    expect(autores).toEqual(copiaDeAutores);
    expect(citas).toEqual(copiaDeCitas);
    // 1 de 7 que cuentan: ceden `p5` y `s1` (los últimos que pueden) y entran `l3` y `l4` (empatados
    // a 50, por clave): 3 de 7 cumple.
    expect(esperado).toEqual(['l1', 'l3', 'l4', 'o1', 'p1', 'p2', 'p3', 'p4']);
  });

  it('las permutaciones de prueba son de verdad distintas', () => {
    const lista = Array.from({ length: 12 }, (_, i) => i);
    const distintas = new Set(Array.from({ length: 25 }, (_, k) => barajar(lista, k + 1).join(',')));
    expect(distintas.size).toBe(25);
  });

  it('devuelve los Autores tal cual, con su tradición', () => {
    const { autores, citas } = entradas([lat('l0', 'L0', 1), sinDeclarar('s0', 'S0', 1)]);
    const resultado = autoresDestacados(autores, citas);
    expect(resultado[0]).toBe(autores[0]);
    expect(resultado[1]).not.toHaveProperty('tradicion');
  });
});

describe('Historia 27.6 — el predicado «cuenta para el suelo» tiene un solo dueño', () => {
  it('`publicado.ts` importa `cuentaParaElSuelo` de `./huecos.ts`', () => {
    const fuente = readFileSync(join(RAIZ, 'src/lib/publicado.ts'), 'utf8');
    expect(fuente).toMatch(/import \{[^}]*\bcuentaParaElSuelo\b[^}]*\} from '\.\/huecos\.ts';/u);
  });

  it('ningún módulo de `src/`, `tools/` ni `integraciones/` salvo `huecos.ts` compara una tradición con `otra`', () => {
    /*
     * El dueño es `huecos.ts`; `admision.ts` declara el enum. `tools/auditoria.ts` filtra los
     * Autores de tradición `otra` para otra cosa —las Citas traducidas sin traductor (19.1)—, no
     * el denominador del suelo: se exime con su motivo y no por su forma.
     */
    const EXENTOS = new Set(['src/lib/huecos.ts', 'src/lib/admision.ts', 'tools/auditoria.ts']);
    // Cualquier comparación con el valor: `===`, `==`, `!==`, `!=`, `case`, `.includes(`, `.has(`, con
    // comilla simple o doble. Solo cuenta en un fichero que habla de `tradicion`.
    const comparaConOtra = /(?:[!=]==?|\bcase|\.includes\(|\.has\()\s*['"]otra['"]|['"]otra['"]\s*[!=]==?/u;
    const ficheros = (dir: string): string[] =>
      readdirSync(join(RAIZ, dir), { withFileTypes: true }).flatMap((e) => {
        const ruta = `${dir}/${e.name}`;
        if (e.isDirectory()) return e.name === 'node_modules' ? [] : ficheros(ruta);
        return /\.(?:ts|mts|mjs|js|astro)$/u.test(e.name) ? [ruta] : [];
      });
    const infractores = ['src', 'tools', 'integraciones']
      .flatMap(ficheros)
      .filter((f) => !EXENTOS.has(f))
      .filter((f) => {
        const fuente = readFileSync(join(RAIZ, f), 'utf8');
        return /tradicion/u.test(fuente) && comparaConOtra.test(fuente);
      });
    expect(infractores).toEqual([]);
    expect(readFileSync(join(RAIZ, 'src/lib/huecos.ts'), 'utf8')).toMatch(/tradicion !== 'otra'/u);
    // La exención no tapa una definición nueva: la de la auditoría sigue siendo la que era.
    expect(readFileSync(join(RAIZ, 'tools/auditoria.ts'), 'utf8').match(/['"]otra['"]/gu)).toHaveLength(1);
  });
});

describe('Historia 27.6 — la tradición llega al build por `aplanarAutor`', () => {
  /*
   * `autoresDestacados` lee `autor.tradicion`; en el build, el Autor le llega por `aplanarAutor`
   * (`conjuntoPublicable`). Si el aplanado la perdiera, todos contarían como sin declarar, ninguno
   * como latinoamericano y el suelo dejaría de actuar en `/buscar/` sin que el Corpus de hoy —que
   * cumple el suelo sin cesiones— lo dejara ver.
   */
  const entrada = (data: Record<string, unknown>) =>
    ({ id: 'jose-marti', collection: 'autores', data }) as unknown as Parameters<typeof aplanarAutor>[0];
  const base = { nombre: 'José Martí', añoNacimiento: 1853, añoFallecimiento: 1895, ordenAlfabetico: 'Martí' };

  it('copia la tradición declarada', () => {
    expect(aplanarAutor(entrada({ ...base, tradicion: 'latinoamericana' })).tradicion).toBe('latinoamericana');
    expect(aplanarAutor(entrada({ ...base, tradicion: 'otra' })).tradicion).toBe('otra');
  });

  it('sin tradición declarada, la omite (convención de ausencia)', () => {
    expect(aplanarAutor(entrada(base))).not.toHaveProperty('tradicion');
  });

  it('un Autor aplanado entra por el suelo como en la prueba pura', () => {
    // Ocho peninsulares con más Citas y un latinoamericano fuera: con la tradición aplanada, entra.
    const autores = [
      ...Array.from({ length: 8 }, (_, i) =>
        aplanarAutor({
          id: `p${i}`,
          collection: 'autores',
          data: { nombre: `P${i}`, añoFallecimiento: 1900, ordenAlfabetico: `P${i}`, tradicion: 'peninsular' },
        } as unknown as Parameters<typeof aplanarAutor>[0]),
      ),
      aplanarAutor(entrada({ ...base, tradicion: 'latinoamericana' })),
    ];
    const citas = autores.flatMap((a, i) => Array.from({ length: 20 - i }, () => ({ autor: a.slug })));
    expect(autoresDestacados(autores, citas).map((a) => a.slug)).toContain('jose-marti');
  });
});
