import { afterAll, describe, expect, it } from 'vitest';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
} from './ayuda/construir.js';

/**
 * Historia 22.1 — la puerta de las Fichas de Obra sobre un proyecto construido de verdad.
 *
 * Lo puro está en `obras.test.ts`; aquí se comprueba que la regla **es puerta**: que una
 * Obra sin ficha, una forma reclamada dos veces o un prefijo que no casa rompen `astro
 * build`, y que una ficha sin Citas solo avisa.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const BASE = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'autores/horacio.yml':
    'nombre: Horacio\nañoFallecimiento: -8\nsemblanza: Poeta latino.\n',
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
};

const FICHA_BUENA =
  'autor: "seneca"\ntitulo: "Sobre la brevedad de la vida"\nformas:\n  - "sobre la brevedad de la vida"\n';

describe('Historia 22.1 — toda Obra publicada tiene ficha', () => {
  it('una Obra sin ficha rompe el build nombrando Obra, Autor y orden', async () => {
    const r = await construirConCorpus(BASE, { sembrarObras: false });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('Sobre la brevedad de la vida');
    expect(r.salida).toContain('seneca');
    expect(r.salida).toContain('npm run obra -- sembrar');
  });

  it('con la ficha sembrada, construye', async () => {
    const r = await construirConCorpus(BASE);
    aLimpiar.push(r.proyecto);
    expect(r.codigo, r.salida).toBe(0);
  });

  it('una forma reclamada por dos fichas rompe nombrando las dos', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'obras/seneca--sobre-la-brevedad-de-la-vida.yml': FICHA_BUENA,
      'obras/seneca--de-la-brevedad-de-la-vida.yml': FICHA_BUENA.replace(
        'titulo: "Sobre',
        'titulo: "De',
      ),
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('seneca--sobre-la-brevedad-de-la-vida.yml');
    expect(r.salida).toContain('seneca--de-la-brevedad-de-la-vida.yml');
  });

  it('un nombre cuyo prefijo no es su Autor rompe', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'obras/seneca--x.yml': 'autor: "horacio"\ntitulo: "X"\nformas:\n  - "x"\n',
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('seneca--x.yml');
  });

  it('una ficha cuyo Autor no existe rompe', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'obras/ovidio--metamorfosis.yml':
        'autor: "ovidio"\ntitulo: "Metamorfosis"\nformas:\n  - "metamorfosis"\n',
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('ovidio--metamorfosis.yml');
    expect(r.salida).toContain('no existe');
  });

  it('un nombre sin forma de slug rompe', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'obras/seneca--De_la_ira.yml': 'autor: "seneca"\ntitulo: "De la ira"\nformas:\n  - "de la ira"\n',
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('seneca--De_la_ira');
  });

  it('dos fichas con el mismo nombre (.yml y .yaml) rompen', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'obras/seneca--de-la-ira.yml': 'autor: "seneca"\ntitulo: "De la ira"\nformas:\n  - "de la ira"\n',
      'obras/seneca--de-la-ira.yaml': 'autor: "seneca"\ntitulo: "De la ira"\nformas:\n  - "sobre la ira"\n',
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('seneca--de-la-ira.yaml');
  });

  it('una ficha sin Citas avisa y el build pasa', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'obras/seneca--de-la-ira.yml': 'autor: "seneca"\ntitulo: "De la ira"\nformas:\n  - "de la ira"\n',
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo, r.salida).toBe(0);
    expect(r.salida).toContain('seneca--de-la-ira.yml');
    expect(r.salida).toContain('ninguna Cita publicada');
  });
});
