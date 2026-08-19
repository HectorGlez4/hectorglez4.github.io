import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { equivalentes, normalizar, palabras } from '../../src/lib/normalizar.js';
import { slugDeAutor, slugDeCita, slugDeObra, slugDeTema, slugLibre } from '../../src/lib/slug.js';

const RAIZ = resolve(import.meta.dirname, '../..');

describe('Historia 1.4 — normalización canónica', () => {
  it('elimina diacríticos', () => {
    expect(normalizar('Corazón')).toBe('corazon');
    expect(normalizar('café')).toBe('cafe');
    expect(normalizar('«Corazón»')).toBe('corazon');
  });

  it('«Corazón» y «corazon» producen el mismo resultado', () => {
    expect(normalizar('Corazón')).toBe(normalizar('corazon'));
    expect(equivalentes('Corazón', 'corazon')).toBe(true);
  });

  it('pasa a minúsculas', () => {
    expect(normalizar('LA VIDA')).toBe('la vida');
  });

  it('colapsa espacios y recorta los extremos', () => {
    expect(normalizar('  la   vida \n es  larga  ')).toBe('la vida es larga');
  });

  it('elimina la puntuación, incluida la que solo usa el español', () => {
    expect(normalizar('¿Qué es la vida?')).toBe('que es la vida');
    expect(normalizar('¡Ay!')).toBe('ay');
    expect(normalizar('«La vida, si sabes usarla, es larga.»')).toBe(
      'la vida si sabes usarla es larga',
    );
  });

  it('la puntuación separa palabras en lugar de pegarlas', () => {
    // Sustituir por vacío en lugar de por espacio convertiría «vida,es» en «vidaes»,
    // y esa palabra inexistente no la encontraría ninguna búsqueda.
    expect(normalizar('vida,es')).toBe('vida es');
    expect(normalizar('tiempo—vida')).toBe('tiempo vida');
  });

  it('la eñe se pliega a ene, para que «espanol» encuentre «español»', () => {
    expect(normalizar('español')).toBe('espanol');
    expect(equivalentes('España', 'espana')).toBe(true);
  });

  it('la misma Cita con distinta puntuación, acentos y mayúsculas es equivalente', () => {
    const a = '«La vida, si sabes usarla, es larga.»';
    const b = 'la vida si sabes usarla es larga';
    const c = 'LA VIDÁ; SI SABES USARLA... ES LARGA';
    expect(equivalentes(a, b)).toBe(true);
    expect(equivalentes(a, c)).toBe(true);
  });

  it('textos distintos no se confunden', () => {
    expect(equivalentes('la vida es larga', 'la vida es corta')).toBe(false);
  });

  it('parte en palabras y no devuelve vacíos', () => {
    expect(palabras('  ¿Qué  es,  la vida? ')).toEqual(['que', 'es', 'la', 'vida']);
    expect(palabras('')).toEqual([]);
    expect(palabras('   ...   ')).toEqual([]);
  });
});

describe('Historia 1.4 — derivación de slug', () => {
  it('el slug del Autor sale de su nombre', () => {
    expect(slugDeAutor('Séneca')).toBe('seneca');
    expect(slugDeAutor('Sor Juana Inés de la Cruz')).toBe('sor-juana-ines-de-la-cruz');
    expect(slugDeAutor('Miguel de Cervantes')).toBe('miguel-de-cervantes');
  });

  it('el slug de la Cita se deriva del slug del Autor más un fragmento del texto', () => {
    const slug = slugDeCita('seneca', 'No es que tengamos poco tiempo, es que perdemos mucho.');
    // Siete palabras del texto: «no es que tengamos poco tiempo es».
    expect(slug).toBe('seneca-no-es-que-tengamos-poco-tiempo-es');
    expect(slug.startsWith('seneca-')).toBe(true);
  });

  it('el slug solo lleva minúsculas, dígitos y guiones', () => {
    const slug = slugDeCita(slugDeAutor('Séneca'), '¡«Qué difícil es la añoranza»!');
    expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it('ningún Tema participa en la derivación', () => {
    // La firma no admite Temas: lo que AD-4 prohíbe no puede ni escribirse. Y el mismo
    // texto del mismo Autor da el mismo slug, se le asignen los Temas que se le asignen.
    const texto = 'La vida, si sabes usarla, es larga.';
    expect(slugDeCita('seneca', texto)).toBe(slugDeCita('seneca', texto));
    expect(slugDeCita.length).toBe(2);
  });

  it('el mismo texto con otra puntuación da el mismo slug', () => {
    expect(slugDeCita('seneca', 'La vida, si sabes usarla, es larga.')).toBe(
      slugDeCita('seneca', '«La vida si sabes usarla es larga»'),
    );
  });

  it('una colisión se resuelve sin tocar el slug ya ocupado', () => {
    const base = 'seneca-la-vida-si-sabes-usarla-es';
    expect(slugLibre(base, [])).toBe(base);
    expect(slugLibre(base, [base])).toBe(`${base}-2`);
    expect(slugLibre(base, [base, `${base}-2`])).toBe(`${base}-3`);
  });

  it('el slug de un Tema sale de su nombre', () => {
    expect(slugDeTema('El tiempo')).toBe('el-tiempo');
    expect(slugDeTema('Amistad y lealtad')).toBe('amistad-y-lealtad');
  });

  it('el slug de una obra nombra su documento de Fuente (Historia 11.1)', () => {
    expect(slugDeObra('Del sentimiento trágico de la vida')).toBe(
      'del-sentimiento-tragico-de-la-vida',
    );
    expect(slugDeObra('Sobre la brevedad de la vida')).toBe('sobre-la-brevedad-de-la-vida');
    expect(slugDeObra('«El Criticón»')).toBe('el-criticon');
  });

  it('Autor, Tema y obra delegan en el mismo ayudante de canonización', () => {
    /*
     * Lo que importa es que la regla tenga un solo dueño, no que las tres salidas sean
     * iguales para siempre: congelar la igualdad ataría el slug de obra al del Autor y
     * convertiría en fallo cualquier divergencia legítima futura. Se afirma la estructura
     * —un cuerpo, tres delegaciones—, que es lo que de verdad impide la divergencia.
     */
    const codigo = readFileSync(resolve(RAIZ, 'src/lib/slug.ts'), 'utf8');
    expect([...codigo.matchAll(/unir\(normalizar\(/gu)]).toHaveLength(1);

    for (const funcion of ['slugDeAutor', 'slugDeTema', 'slugDeObra']) {
      expect(codigo, funcion).toMatch(
        new RegExp(`function ${funcion}\\(nombre: string\\): string \\{\\s*return slugDeNombre\\(nombre\\);`, 'u'),
      );
    }
  });
});

describe('Historia 1.4 — nadie implementa su propia normalización', () => {
  const modulos = (function recorrer(dir: string): string[] {
    return readdirSync(dir).flatMap((entrada) => {
      const ruta = join(dir, entrada);
      if (statSync(ruta).isDirectory()) return recorrer(ruta);
      return /\.(ts|astro|mjs)$/.test(entrada) ? [ruta] : [];
    });
  })(resolve(RAIZ, 'src'));

  it.each(modulos.filter((m) => !m.endsWith('normalizar.ts')))(
    '%s no normaliza por su cuenta',
    (ruta) => {
      const codigo = readFileSync(ruta, 'utf8');
      // Las dos señales inequívocas de una normalización artesanal: descomponer en
      // NFD y borrar marcas combinantes. Cualquiera de las dos fuera del módulo
      // canónico significa que hay un segundo criterio con el que discrepar.
      expect(codigo, `${ruta} descompone en NFD por su cuenta`).not.toMatch(/normalize\(\s*['"]NFD/);
      expect(codigo, `${ruta} borra diacríticos por su cuenta`).not.toMatch(/\\p\{M\}|u0300-\\u036f/);
    },
  );

  it('slug.ts consume la normalización canónica en lugar de reimplementarla', () => {
    const codigo = readFileSync(resolve(RAIZ, 'src/lib/slug.ts'), 'utf8');
    expect(codigo).toMatch(/from '\.\/normalizar\.js'/);
  });

  it('la derivación es pura: no lee disco ni depende de Astro', () => {
    for (const modulo of ['src/lib/normalizar.ts', 'src/lib/slug.ts']) {
      const codigo = readFileSync(resolve(RAIZ, modulo), 'utf8');
      expect(codigo, `${modulo} importa node:fs`).not.toMatch(/from 'node:fs/);
      expect(codigo, `${modulo} importa astro`).not.toMatch(/from 'astro/);
    }
  });
});
