import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import { admiteImagen, tramoDe } from '../../src/lib/tramos.ts';
import { svgDeTarjeta } from '../../src/lib/tarjeta.ts';
import { MAX_CARACTERES_IMAGEN } from '../../src/lib/umbrales.ts';

const RAIZ = resolve(import.meta.dirname, '../..');
const deLargo = (n: number) => 'a'.repeat(n);

describe('Historia 2.1 / UX-DR19 — tramos por longitud', () => {
  it.each([
    [1, 'xl'],
    [80, 'xl'],
    [81, 'lg'],
    [160, 'lg'],
    [161, 'md'],
    [240, 'md'],
    [241, 'sm'],
    [300, 'sm'],
    [301, 'sm'],
    [900, 'sm'],
  ])('%i caracteres cae en el tramo %s', (largo, esperado) => {
    expect(tramoDe(deLargo(largo)).nombre).toBe(esperado);
  });

  it('los tamaños de la Imagen son los de la tabla', () => {
    expect(tramoDe(deLargo(80)).pixelesEnImagen).toBe(64);
    expect(tramoDe(deLargo(160)).pixelesEnImagen).toBe(52);
    expect(tramoDe(deLargo(240)).pixelesEnImagen).toBe(42);
    expect(tramoDe(deLargo(300)).pixelesEnImagen).toBe(34);
  });

  it('los tamaños de la Pieza son los de la tabla', () => {
    /*
     * Fijados aquí como literales, no comparados contra la propia tabla. La prueba de
     * `pieza.test.ts` que casa el `font-size` con `tramoDe(...).pixelesEnPieza` compara la
     * tabla consigo misma y pasaría con cualquier columna; esto es lo que hace que cambiar
     * los cuatro números sea una decisión visible en el diff — que es lo que AD-8 pide.
     */
    expect(tramoDe(deLargo(80)).pixelesEnPieza).toBe(44);
    expect(tramoDe(deLargo(160)).pixelesEnPieza).toBe(36);
    expect(tramoDe(deLargo(240)).pixelesEnPieza).toBe(30);
    expect(tramoDe(deLargo(300)).pixelesEnPieza).toBe(26);
  });

  it('ningún tramo que admite imagen se queda con un tamaño de cero', () => {
    /*
     * TypeScript pilla la columna **ausente**; el cero lo deja pasar, y un cero compone la
     * Cita invisible en el lienzo que lo consuma. Es el descuido exacto que deja añadir una
     * columna nueva a la tabla sin rellenarla en las cuatro filas.
     */
    for (const largo of [1, 80, 160, 240, 300]) {
      const tramo = tramoDe(deLargo(largo));
      expect(tramo.admiteImagen).toBe(true);
      expect(tramo.pixelesEnImagen).toBeGreaterThan(0);
      expect(tramo.pixelesEnTarjeta).toBeGreaterThan(0);
      expect(tramo.pixelesEnPieza).toBeGreaterThan(0);
    }
  });

  it('por encima de 300 caracteres no se ofrece imagen', () => {
    expect(admiteImagen(deLargo(MAX_CARACTERES_IMAGEN))).toBe(true);
    expect(admiteImagen(deLargo(MAX_CARACTERES_IMAGEN + 1))).toBe(false);
    // Y sigue componiéndose en el suelo legible: la página no deja de mostrarla.
    expect(tramoDe(deLargo(400)).nombre).toBe('sm');
  });

  it('la longitud se mide en caracteres, no en unidades de código', () => {
    // «ñ» y las vocales acentuadas ocupan en pantalla; si se contaran en bytes o se
    // normalizaran antes de medir, una Cita con muchos acentos saltaría de tramo.
    const conAcentos = 'ñ'.repeat(80);
    expect([...conAcentos].length).toBe(80);
    expect(tramoDe(conAcentos).nombre).toBe('xl');
    expect(tramoDe('ñ'.repeat(81)).nombre).toBe('lg');
  });

  it('el corte de 300 sale del módulo de umbrales, no de un literal', () => {
    const codigo = readFileSync(resolve(RAIZ, 'src/lib/tramos.ts'), 'utf8');
    expect(codigo).toMatch(/MAX_CARACTERES_IMAGEN/);
    expect(codigo).not.toMatch(/hasta:\s*300/);
  });

  it('la derivación es pura (AD-5)', () => {
    const codigo = readFileSync(resolve(RAIZ, 'src/lib/tramos.ts'), 'utf8');
    expect(codigo).not.toMatch(/from 'node:fs/);
    expect(codigo).not.toMatch(/from 'astro/);
  });
});

describe('Historia 35.4 — la firma de un Personaje no cambia el tramo de la Tarjeta Social (AD-8)', () => {
  /** Lo más largo que hoy puede ir en la procedencia: el título de Obra y el nombre de Autor del Corpus. */
  const masLargo = (carpeta: string, campo: string) =>
    readdirSync(resolve(RAIZ, 'corpus', carpeta))
      .filter((f) => /\.ya?ml$/u.test(f))
      .map((f) => (parsearYaml(readFileSync(resolve(RAIZ, 'corpus', carpeta, f), 'utf8')) as Record<string, unknown>)[campo])
      .filter((v): v is string => typeof v === 'string')
      .reduce((a, b) => ([...b].length > [...a].length ? b : a), '');
  const TITULO = masLargo('obras', 'titulo');
  const AUTOR = masLargo('autores', 'nombre');
  /** Prosa de `n` caracteres, en palabras que el reparto puede partir. */
  const prosa = (n: number) => 'palabra '.repeat(Math.ceil(n / 8)).slice(0, n - 1).trimEnd().padEnd(n - 1, 'a') + '.';
  const cuerpo = (svg: string) => /font-family="[^"]*" font-size="(\d+)" fill="[^"]*">«/u.exec(svg)?.[1];

  it('el Corpus da un título y un nombre que medir', () => {
    expect(TITULO.length).toBeGreaterThan(0);
    expect(AUTOR.length).toBeGreaterThan(0);
  });

  it.each([80, 160, 240, MAX_CARACTERES_IMAGEN])('con %i caracteres, la atribución más larga de un Personaje cabe en el mismo cuerpo', (n) => {
    const texto = prosa(n);
    expect([...texto]).toHaveLength(n);
    const sinPersonaje = svgDeTarjeta({ texto, autor: AUTOR, procedencia: `${TITULO}, 2000` });
    const conPersonaje = svgDeTarjeta({ texto, autor: 'Batman', procedencia: `${TITULO}, de ${AUTOR}, 2000` });
    expect(cuerpo(conPersonaje)).toBeDefined();
    expect(cuerpo(conPersonaje)).toBe(cuerpo(sinPersonaje));
    expect(Number(cuerpo(conPersonaje))).toBe(tramoDe(texto).pixelesEnTarjeta);
  });
});
