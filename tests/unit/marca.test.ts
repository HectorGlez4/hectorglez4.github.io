import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { MARCA, tituloDe } from '../../src/lib/marca.ts';

const raiz = resolve(import.meta.dirname, '../..');

/**
 * Historia 6.1 — el nombre correcto antes de que exista una URL indexada.
 *
 * El nombre retirado se busca con una expresión, no con una cadena literal: escrito
 * literal, esta misma prueba sería una aparición más y tendría que excluirse a sí misma.
 */
const NOMBRE_RETIRADO = new RegExp(['Sabidur', '[ií]a[\\s-]?Diaria'].join(''), 'i');

/** Y su forma de identificador, que vive en `package.json` y en el dominio antiguo. */
const IDENTIFICADOR_RETIRADO = /sabiduria[-_]diaria/i;

describe('Historia 6.1 — la marca tiene un dueño único', () => {
  it('la marca es el nombre nuevo', () => {
    expect(MARCA).toBe('Sabiduría de Bolsillo');
  });

  it('el título de una página compone la parte con la marca', () => {
    expect(tituloDe('Buscar')).toBe(`Buscar | ${MARCA}`);
  });

  it('el título sin parte es solo la marca, sin separador colgando', () => {
    expect(tituloDe()).toBe(MARCA);
    expect(tituloDe('')).toBe(MARCA);
  });
});

describe('Historia 6.1 — el nombre retirado no queda en ninguna parte', () => {
  /** Recorre un directorio devolviendo sus ficheros de texto. */
  function ficheros(dir: string): string[] {
    return readdirSync(dir).flatMap((entrada) => {
      const ruta = join(dir, entrada);
      return statSync(ruta).isDirectory() ? ficheros(ruta) : [ruta];
    });
  }

  const revisables = [
    ...ficheros(resolve(raiz, 'src')),
    ...ficheros(resolve(raiz, 'public')),
    ...ficheros(resolve(raiz, 'tools')).filter((f) => !f.endsWith('.gitkeep')),
    ...ficheros(resolve(raiz, 'tests')),
    ...ficheros(resolve(raiz, '.github')),
    resolve(raiz, 'package.json'),
    resolve(raiz, 'package-lock.json'),
    resolve(raiz, 'astro.config.mjs'),
    resolve(raiz, 'AGENTS.md'),
  ].filter((f) => f !== resolve(raiz, 'tests/unit/marca.test.ts'));

  it.each(revisables.map((f) => [f.slice(raiz.length + 1), f]))('%s no lo menciona', (_, ruta) => {
    const contenido = readFileSync(ruta, 'utf8');
    expect(NOMBRE_RETIRADO.test(contenido), 'menciona el nombre retirado').toBe(false);
    expect(IDENTIFICADOR_RETIRADO.test(contenido), 'menciona el identificador retirado').toBe(false);
  });
});

describe('Historia 6.1 — la marca de agua no está escrita a mano', () => {
  const generador = readFileSync(resolve(raiz, 'public/islas/imagen.js'), 'utf8');

  it('el generador no lleva ninguna marca literal', () => {
    // Ni la nueva: si se escribe aquí, el próximo renombrado vuelve a olvidarla.
    expect(generador).not.toContain(MARCA);
    expect(generador).not.toContain(MARCA.toLocaleUpperCase('es'));
  });

  it('la marca llega en los datos, como el tamaño de AD-8', () => {
    expect(generador).toContain('datos.marca');
  });

  it('la isla se la pasa desde el módulo de marca', () => {
    const isla = readFileSync(resolve(raiz, 'src/islands/ImagenDeCita.astro'), 'utf8');
    expect(isla).toContain("from '../lib/marca.ts'");
    expect(isla).toContain('data-marca={MARCA}');
  });
});
