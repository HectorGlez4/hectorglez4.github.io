import { describe, expect, it } from 'vitest';

import { esAparatoDeLaFuente } from '../../tools/lib/extraccion.ts';

/**
 * FR-24 — el aviso de que la transcripción está a medias.
 *
 * Sexta forma de aparato de la Fuente, y la primera que llega **por el arreglo de otra cosa**:
 * apareció al abrirse las páginas compuestas por transclusión, en la 80.ª, porque son
 * justamente las que llevan ese aviso mientras se corrigen.
 *
 *     Es posible que, a causa de ello, haya lagunas de contenido o deficiencias de formato.
 *
 * Eso lo escribió quien mantiene la Fuente, no el Autor. Y es la trampa de siempre, que ya no
 * sorprende y por eso conviene volver a nombrarla: el cotejo de la 11.2 la daría por buena,
 * porque el texto **está** en el documento.
 *
 * Medido: una candidata en revisión, ninguna Cita publicada. La sexta vez que se llega a
 * tiempo, y las seis por leer las candidatas una por una.
 *
 * **Y hay algo que esta sexta enseña sobre las cinco anteriores**: cada vez que se abre una
 * puerta nueva —un lector que entiende una forma más de página— entra con ella una forma nueva
 * de aparato. No es que la lista estuviera incompleta: es que crece con el alcance.
 */
describe('FR-24 — el aviso de transcripción a medias es aparato', () => {
  it('la frase de las lagunas de contenido', () => {
    expect(
      esAparatoDeLaFuente(
        'Es posible que, a causa de ello, haya lagunas de contenido o deficiencias de formato.',
      ),
    ).toBe(true);
  });

  it('y la de la obra en desarrollo', () => {
    expect(
      esAparatoDeLaFuente('Esta obra se encuentra en desarrollo y su texto puede cambiar.'),
    ).toBe(true);
  });

  it('hablar de lagunas en la propia obra no es aparato', () => {
    // «Laguna» es una palabra, y un Autor puede escribirla: la puerta va por la fórmula del
    // aviso, no por el sustantivo.
    expect(
      esAparatoDeLaFuente('Hay lagunas en la memoria que la voluntad no acierta a llenar.'),
    ).toBe(false);
  });

  it('ni contar que algo está en desarrollo', () => {
    expect(
      esAparatoDeLaFuente('El pueblo en desarrollo aprende antes a pedir que a producir.'),
    ).toBe(false);
  });

  it('y una sentencia limpia sigue pasando', () => {
    expect(
      esAparatoDeLaFuente('Conocimiento es lo que pienso yo; opinión es lo que piensa usted.'),
    ).toBe(false);
  });
});
