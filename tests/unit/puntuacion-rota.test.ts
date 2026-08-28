import { describe, expect, it } from 'vitest';

import { tienePuntuacionRota } from '../../tools/lib/extraccion.ts';

/**
 * Historia 11.5 — la puntuación que el escaneo rompió, cuando se puede probar que lo está.
 *
 * `deferred-work.md` lleva sesiones anotando que la puerta de legibilidad deja pasar palabras
 * rotas por OCR —«indivicluo», «porpue», «laspocas»— y explica por qué no se arregló: el
 * arreglo obvio es un léxico del castellano, que marcaría como rotas palabras de 1650 que son
 * correctas, y una heurística sin diccionario «descartaría Citas buenas en silencio».
 *
 * Las dos objeciones son ciertas de una heurística **elegida a ojo**. Aquí no se elige a ojo:
 * cada señal se midió contra las **1632 Citas publicadas**, que son el patrón de lo que no
 * debe morderse, y sólo asciende la que no muerde ninguna. Es el criterio de la 151.ª.
 *
 * Lo medido, y por qué entra o no:
 *
 * | señal | publicadas | candidatas | |
 * |---|---|---|---|
 * | punto intruso (≥4 letras delante) | **0** | 10 | entra |
 * | espacio antes de coma, punto y coma o punto | **0** | 5 | entra |
 * | cuatro consonantes seguidas | **24** | 308 | **fuera** |
 * | mayúscula dentro de palabra | 0 | 0 | fuera: no encuentra nada |
 * | palabra sin vocales | 0 | 4 | fuera: dos de las cuatro no supe explicarlas |
 *
 * Las cuatro consonantes son el aviso del `deferred-work` **medido en vez de temido**:
 * «construido» lleva «nstr», y esa regla se habría llevado por delante 24 Citas publicadas.
 *
 * Y lo que esto NO cierra, que es la mitad del apunte: «indivicluo», «porpue» y «laspocas»
 * siguen pasando. Ésos necesitan el léxico, y el léxico sigue siendo decisión de producto.
 */
describe('11.5 — la puntuación rota delata el escaneo, no al Autor', () => {
  describe('el punto intruso a mitad de frase', () => {
    it('aparta la coma que el escaneo leyó como punto', () => {
      expect(tienePuntuacionRota('A Góngora no hay que leerlo. hay que amarlo.')).toBe(true);
    });

    it('y también cuando la palabra rota va antes de una conjunción', () => {
      expect(
        tienePuntuacionRota('trata con la misma medida todas sus materias. y así como maneja'),
      ).toBe(true);
    });

    it('deja pasar el punto seguido de verdad, que abre en mayúscula', () => {
      expect(tienePuntuacionRota('Es necesario obrar para vivir. Y saber para obrar.')).toBe(false);
    });

    it('deja pasar las abreviaturas, que son cortas', () => {
      // Éstas salieron de la medición: «Av.», «Imp.», «Mad.», «etc.», «a. m.», «q.». Exigir
      // cuatro letras antes del punto las excluye a todas sin perder ninguna palabra entera.
      expect(tienePuntuacionRota('CASA VACCARO, Av. de Mayo 638')).toBe(false);
      expect(tienePuntuacionRota('la vela.» etc. etc.')).toBe(false);
      expect(tienePuntuacionRota('resolvió casar de 10 a 12 a. m. y luego proclamar')).toBe(false);
      expect(tienePuntuacionRota('extranjeros como Campanella, Mad. d’Aulnoy y otros')).toBe(false);
    });

    it('deja pasar el punto final, que no lleva nada detrás', () => {
      expect(tienePuntuacionRota('Todo vive de la misma vida y una es el ánima de toda cosa.')).toBe(
        false,
      );
    });
  });

  describe('el espacio antes del signo', () => {
    it('aparta el espacio antes de la coma', () => {
      expect(tienePuntuacionRota('no viene sólo para él , sino para toda sombra')).toBe(true);
    });

    it('aparta el espacio antes del punto final', () => {
      expect(tienePuntuacionRota('reinaría en las moradas de los hombres .')).toBe(true);
    });

    it('aparta el espacio antes del punto y coma', () => {
      expect(tienePuntuacionRota('tener algún consuelo... ;pero qué cosa más dramática')).toBe(true);
    });

    it('deja pasar los puntos suspensivos con espacio delante, que son del XIX', () => {
      /*
       * Nueve de los once que la señal ancha mordía eran esto —«y aquello ... también»,
       * «siquiera ...»— y son tipografía de la época, no un defecto. Apretarla a la coma, el
       * punto y coma y el punto simple los devuelve todos.
       */
      expect(tienePuntuacionRota('pero esto es absurdo, y aquello ... también')).toBe(false);
      expect(tienePuntuacionRota('á quienes no conozco siquiera ...')).toBe(false);
    });

    it('deja pasar la puntuación normal', () => {
      expect(
        tienePuntuacionRota('Para leer en el destino de los pueblos, es menester abrir el libro.'),
      ).toBe(false);
    });
  });

  it('y no muerde ninguna de las Citas que el Corpus ya publicó', () => {
    // Tres tomadas de las publicadas, con la puntuación variada que el Corpus tiene de verdad.
    for (const publicada of [
      'Gloria por gloria, vale más dejar chispas de luz que regueros de sangre.',
      'El apasionado siempre habla con otro lenguaje diferente de lo que las cosas son; habla en él la pasión, no la razón.',
      '¿De qué sirve discurrir con sutileza, ó con profundidad aparente, si el pensamiento no está conforme con la realidad?',
    ]) {
      expect(tienePuntuacionRota(publicada), publicada).toBe(false);
    }
  });
});
