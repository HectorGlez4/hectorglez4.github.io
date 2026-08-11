import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { auditar, type CitaParaAuditar } from '../../src/lib/salud.ts';
import { gradoDeProcedencia } from '../../src/lib/admision.ts';

const RAIZ = resolve(import.meta.dirname, '../..');

const completa = (slug: string, autor: string): CitaParaAuditar => ({
  slug,
  autor,
  procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
});

const parcialSoloObra = (slug: string, autor: string): CitaParaAuditar => ({
  slug,
  autor,
  procedencia: { obra: 'Cartas a Lucilio' },
});

const parcialSoloAño = (slug: string, autor: string): CitaParaAuditar => ({
  slug,
  autor,
  procedencia: { año: 62 },
});

const ausente = (slug: string, autor: string): CitaParaAuditar => ({ slug, autor });

describe('Historia 1.8 — grado de procedencia', () => {
  it('completa es obra y año', () => {
    expect(gradoDeProcedencia({ obra: 'Meditaciones', año: 175 })).toBe('completa');
  });

  it('solo obra, solo año o solo referencia es parcial', () => {
    expect(gradoDeProcedencia({ obra: 'Meditaciones' })).toBe('parcial');
    expect(gradoDeProcedencia({ año: 175 })).toBe('parcial');
    expect(gradoDeProcedencia({ referencia: 'Citado por Diógenes Laercio.' })).toBe('parcial');
  });

  it('sin nada declarado es ausente', () => {
    expect(gradoDeProcedencia({})).toBe('ausente');
    expect(gradoDeProcedencia(undefined)).toBe('ausente');
  });
});

describe('Historia 1.8 — auditoría del corpus', () => {
  it('da el porcentaje de Citas publicadas con procedencia completa', () => {
    const informe = auditar([
      completa('a', 'seneca'),
      completa('b', 'seneca'),
      parcialSoloObra('c', 'seneca'),
      parcialSoloAño('d', 'seneca'),
    ]);

    expect(informe.publicadas.total).toBe(4);
    expect(informe.publicadas.completa).toBe(2);
    expect(informe.publicadas.porcentajeCompleta).toBe(50);
  });

  it('una procedencia parcial cuenta como no completa', () => {
    const informe = auditar([completa('a', 'seneca'), parcialSoloObra('b', 'seneca')]);
    expect(informe.publicadas.porcentajeCompleta).toBe(50);
  });

  it('el informe distingue parcial de ausente', () => {
    const informe = auditar([
      completa('a', 'seneca'),
      parcialSoloObra('b', 'seneca'),
      ausente('c', 'seneca'),
    ]);

    expect(informe.publicadas.parcial).toBe(1);
    expect(informe.publicadas.ausente).toBe(1);
    // No se agrupan bajo un mismo «sin verificar»: son dos situaciones distintas y la
    // segunda no debería poder existir entre las publicadas.
    expect(informe.publicadas.parcial + informe.publicadas.ausente).toBe(2);
  });

  it('da el desglose por Autor', () => {
    const informe = auditar([
      completa('a', 'seneca'),
      completa('b', 'seneca'),
      parcialSoloObra('c', 'cervantes'),
      completa('d', 'cervantes'),
    ]);

    const porNombre = new Map(informe.porAutor.map((a) => [a.autor, a]));
    expect(porNombre.get('seneca')?.porcentajeCompleta).toBe(100);
    expect(porNombre.get('cervantes')?.porcentajeCompleta).toBe(50);
    expect(porNombre.get('cervantes')?.parcial).toBe(1);
  });

  it('ordena de peor a mejor salud, que es el orden en que hay que atenderlo', () => {
    const informe = auditar([
      completa('a', 'sano'),
      parcialSoloObra('b', 'regular'),
      completa('c', 'regular'),
      parcialSoloObra('d', 'enfermo'),
      parcialSoloObra('e', 'enfermo'),
    ]);

    expect(informe.porAutor.map((a) => a.autor)).toEqual(['enfermo', 'regular', 'sano']);
  });

  it('a igual porcentaje va primero quien más Citas tiene', () => {
    const informe = auditar([
      parcialSoloObra('a', 'pocas'),
      parcialSoloObra('b', 'muchas'),
      parcialSoloObra('c', 'muchas'),
      parcialSoloObra('d', 'muchas'),
    ]);

    expect(informe.porAutor.map((a) => a.autor)).toEqual(['muchas', 'pocas']);
  });

  it('un corpus vacío está al 100 %, no al 0 %', () => {
    // No hay ninguna Cita sin verificar. Reportar 0 % haría saltar la alarma el día
    // que se arranca el proyecto, cuando no hay nada que arreglar.
    const informe = auditar([]);
    expect(informe.publicadas.porcentajeCompleta).toBe(100);
    expect(informe.publicadas.total).toBe(0);
    expect(informe.porAutor).toEqual([]);
  });

  it('el porcentaje se redondea a una décima', () => {
    const informe = auditar([
      completa('a', 'x'),
      parcialSoloObra('b', 'x'),
      parcialSoloObra('c', 'x'),
    ]);
    expect(informe.publicadas.porcentajeCompleta).toBe(33.3);
  });
});

describe('Historia 1.8 — la derivación es pura (AD-5)', () => {
  it('salud.ts no lee disco ni depende de Astro', () => {
    const codigo = readFileSync(resolve(RAIZ, 'src/lib/salud.ts'), 'utf8');
    expect(codigo).not.toMatch(/from 'node:fs/);
    expect(codigo).not.toMatch(/from 'astro/);
  });

  it('la clasificación viene del módulo de admisión, no de una copia', () => {
    const codigo = readFileSync(resolve(RAIZ, 'src/lib/salud.ts'), 'utf8');
    expect(codigo).toMatch(/gradoDeProcedencia/);
    expect(codigo).toMatch(/from '\.\/admision\.ts'/);
  });
});
