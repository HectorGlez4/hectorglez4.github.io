import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { dueñoPorPrefijo } from '../../tools/lib/autoria.ts';

/**
 * Historia 35.2, AD-4 v9.1 — de quién es el slug de una Cita: el prefijo más largo de la unión
 * de Autores y Personajes, que comparten un solo espacio de slugs.
 */

const RAIZ = resolve(import.meta.dirname, '../..');

describe('dueñoPorPrefijo', () => {
  it('prefijos solapados en un sentido: el Personaje más largo gana al Autor corto', () => {
    const dueños = { autores: ['bruce'], personajes: ['bruce-wayne'] };
    expect(dueñoPorPrefijo('bruce-wayne-la-noche', dueños)).toEqual({ tipo: 'personaje', slug: 'bruce-wayne' });
    expect(dueñoPorPrefijo('bruce-la-noche', dueños)).toEqual({ tipo: 'autor', slug: 'bruce' });
  });

  it('y en el otro: el Autor más largo gana al Personaje corto', () => {
    const dueños = { autores: ['robin-hood-de-sherwood'], personajes: ['robin'] };
    expect(dueñoPorPrefijo('robin-hood-de-sherwood-el-bosque', dueños)).toEqual({
      tipo: 'autor',
      slug: 'robin-hood-de-sherwood',
    });
    expect(dueñoPorPrefijo('robin-el-bosque', dueños)).toEqual({ tipo: 'personaje', slug: 'robin' });
  });

  it('seneca-el-viejo no es de seneca, también con Personajes en la lista', () => {
    const dueños = { autores: ['seneca', 'seneca-el-viejo'], personajes: ['batman'] };
    expect(dueñoPorPrefijo('seneca-el-viejo-la-fortuna', dueños)).toEqual({ tipo: 'autor', slug: 'seneca-el-viejo' });
    expect(dueñoPorPrefijo('seneca-no-es-que', dueños)).toEqual({ tipo: 'autor', slug: 'seneca' });
  });

  it('estricto: el slug del dueño solo, o sin guion detrás, no es suyo', () => {
    const dueños = { autores: ['seneca'], personajes: ['batman'] };
    expect(dueñoPorPrefijo('batman', dueños)).toBeUndefined();
    expect(dueñoPorPrefijo('batmanes-algo', dueños)).toBeUndefined();
    expect(dueñoPorPrefijo('seneca', dueños)).toBeUndefined();
    expect(dueñoPorPrefijo('nadie-algo', dueños)).toBeUndefined();
    expect(dueñoPorPrefijo('batman-algo', { autores: [] })).toBeUndefined();
  });

  it('un slug de los dos (que el build rompe): gana el Personaje', () => {
    expect(dueñoPorPrefijo('joker-algo', { autores: ['joker'], personajes: ['joker'] })).toEqual({
      tipo: 'personaje',
      slug: 'joker',
    });
  });

  it('la regla vieja, la del prefijo solo de Autores, no queda en el árbol', () => {
    // Compuesto para que este fichero no la nombre.
    const viejo = ['autor', 'PorPrefijo'].join('');
    const nombran: string[] = [];
    const recorrer = (dir: string) => {
      for (const entrada of readdirSync(dir)) {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) recorrer(ruta);
        else if (/\.(ts|mjs|astro|js)$/u.test(entrada) && readFileSync(ruta, 'utf8').includes(viejo)) nombran.push(ruta);
      }
    };
    for (const dir of ['src', 'tools', 'integraciones', 'tests']) recorrer(join(RAIZ, dir));
    expect(nombran).toEqual([]);
  });
});
