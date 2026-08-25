import { describe, expect, it } from 'vitest';

import { esAparatoDeLaFuente } from '../../tools/lib/extraccion.ts';

/**
 * FR-23 — la aprobación y la licencia del libro impreso.
 *
 * Quinta forma de aparato en cinco sesiones, y **la peor de las cinco**. Las otras cuatro
 * ensuciaban la Cita —un pie de licencia, un título, un epígrafe, un folio—; ésta se la
 * atribuye **a quien no la escribió**:
 *
 *     Ofrécelo su Autor ilustrado con erudición curiosa… sin haber en él algo que pueda
 *     deslucir el renombre de católico, ni ofender a las buenas costumbres.
 *
 * Eso no lo escribió el Autor: lo escribió el censor que aprobó el libro en el siglo XVII, y
 * Wikisource transcribe la obra entera, preliminares incluidos. Publicarlo pondría las
 * palabras del censor firmadas por el Autor.
 *
 * **Y no lo caza nada de lo que hay.** El cotejo de la 11.2 pasa —el texto está literal en el
 * documento—; la puerta de FR-23 pasa —el documento declara a ese Autor, y es verdad: es su
 * libro—. La atribución es falsa dentro de un documento auténtico, que es un caso que ninguna
 * de las dos puertas mira.
 *
 * Medido: cuatro candidatas en revisión, **ninguna Cita publicada**. Otra vez se llega a
 * tiempo, y otra vez por haber leído las candidatas una por una en vez de aprobar en bloque.
 *
 * Las fórmulas son **las del trámite**, no las del asunto: «la licencia que pide», «ofrécelo
 * su Autor», «ofenda las buenas costumbres», «contrario a nuestra santa fe». Un moralista
 * puede escribir sobre las buenas costumbres y sobre la fe —y estos Autores lo hacen a
 * menudo—; lo que no escribe es la petición de licencia de su propio libro.
 */
describe('FR-23 — la aprobación del impreso no es texto del Autor', () => {
  it('la fórmula de la licencia es aparato', () => {
    expect(
      esAparatoDeLaFuente(
        'No hay en esto voz que ofenda las buenas costumbres, ni discurso contrario a ' +
          'nuestra santa fe católica romana, y así, me parece digno de la licencia que pide.',
      ),
    ).toBe(true);
  });

  it('la fórmula del ofrecimiento también', () => {
    expect(
      esAparatoDeLaFuente(
        'Ofrécelo su Autor ilustrado con erudición curiosa, enseñanza advertida y política ' +
          'prudente, sin haber en él algo que pueda deslucir el renombre de católico.',
      ),
    ).toBe(true);
  });

  it('y la del privilegio, que suplica en vez de pedir', () => {
    expect(
      esAparatoDeLaFuente(
        'Merece El Político que Vuestra Excelencia le haga la honra de darle la licencia que ' +
          'suplica, por no hallarse en este libro cosa que ofenda las buenas costumbres.',
      ),
    ).toBe(true);
  });

  it('escribir SOBRE las buenas costumbres no es pedir licencia', () => {
    // Un moralista habla de las costumbres a todas horas: la puerta va por la fórmula del
    // trámite, no por el asunto, o se llevaría por delante media obra de estos Autores.
    expect(
      esAparatoDeLaFuente('Las buenas costumbres se heredan menos de lo que se imitan.'),
    ).toBe(false);
  });

  it('ni nombrar la fe es someterse a censura', () => {
    expect(
      esAparatoDeLaFuente('Nuestra santa fe no manda creer lo que la razón desmiente.'),
    ).toBe(false);
  });

  it('ni hablar de un autor cualquiera', () => {
    expect(
      esAparatoDeLaFuente('Su autor lo dijo mejor que yo, y no por eso deja de ser verdad.'),
    ).toBe(false);
  });

  it('y una sentencia limpia sigue pasando', () => {
    expect(
      esAparatoDeLaFuente('Con el valor se consiguen las coronas, y con la prudencia se establecen.'),
    ).toBe(false);
  });
});
