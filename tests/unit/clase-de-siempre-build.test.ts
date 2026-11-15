import { afterAll, describe, expect, it } from 'vitest';
import {
  ATESTIGUADA,
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  conLaPuertaAbierta,
  construirConCorpus,
  limpiar,
} from './ayuda/construir.js';
import { CABECERA_DE_FORMAS_VEDADAS } from '../../tools/lib/formasVedadas.ts';

/**
 * Historia 35.7 — `corpus/formas-vedadas.yml` es puerta del build (AD-32): con la puerta de la
 * atribuida abierta en la copia, una atribuida publicada cuyo texto coincide con una forma vedada
 * rompe la construcción nombrando su fichero y la entrada, y un registro con un motivo ajeno la
 * rompe nombrándolo. El build lo lee solo para romper. Lo puro, en `clase-de-siempre.test.ts`.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const VIVA = `nombre: Ana Ejemplo
vivo: true
añoNacimiento: 1950
semblanza: Escritora de prueba.
ordenAlfabetico: Ejemplo
`;

const TEXTO = 'La vida es corta, y el oficio de vivirla, largo.';

const BASE = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'autores/ana-ejemplo.yml': VIVA,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
  'citas/ana-ejemplo--la-vida-es-corta.md': citaValida({
    texto: TEXTO,
    autor: 'ana-ejemplo',
    slug: 'ana-ejemplo-la-vida-es-corta',
    procedencia: { obra: 'Obras de ana-ejemplo', año: 2000 },
    fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Obras_de_ana-ejemplo' },
    clase: 'atribuida',
    estadoDerechos: undefined,
    ...ATESTIGUADA,
  }),
};

describe('Historia 35.7 — las formas vedadas en el build', () => {
  it('una atribuida publicada igual a una forma vedada rompe, nombrando su fichero y la entrada', async () => {
    const r = await construirConCorpus(
      {
        ...BASE,
        'formas-vedadas.yml':
          `${CABECERA_DE_FORMAS_VEDADAS}  - { forma: "la vida es corta y el oficio de vivirla largo", slug: "seneca-la-vida-es-corta", motivo: cotejo-fallido, fecha: "2026-11-14" }\n`,
      },
      { ficheros: conLaPuertaAbierta() },
    );
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('corpus/citas/ana-ejemplo--la-vida-es-corta.md: la atribuida «ana-ejemplo-la-vida-es-corta» coincide con la forma vedada');
    expect(r.salida).toContain('(cotejo-fallido, 2026-11-14, seneca-la-vida-es-corta)');
  });

  it('un registro con un motivo ajeno rompe nombrándolo', async () => {
    const r = await construirConCorpus(
      {
        ...BASE,
        'formas-vedadas.yml': `${CABECERA_DE_FORMAS_VEDADAS}  - { forma: "otra cosa", motivo: capricho, fecha: "2026-11-14" }\n`,
      },
      { ficheros: conLaPuertaAbierta() },
    );
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toMatch(/corpus\/formas-vedadas\.yml: la entrada 1 de «formas» declara el motivo "capricho"/u);
  });
});
