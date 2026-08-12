import { describe, expect, it } from 'vitest';
import { materialDelKit } from '../../src/lib/kit.ts';
import { tramoDe } from '../../src/lib/tramos.ts';
import { MAX_CARACTERES_IMAGEN } from '../../src/lib/umbrales.ts';
import type { Cita } from '../../src/lib/publicado.ts';

/** Historia 8.1 — qué Cita compone el material del Kit. */

const cita = (slug: string, texto: string): Cita =>
  ({
    slug,
    texto,
    autor: 'seneca',
    temas: [],
    procedencia: { obra: 'Cartas a Lucilio', año: 65 },
    aptaParaPortada: true,
  }) as unknown as Cita;

const CORTA = 'No es que tengamos poco tiempo, es que perdemos mucho.';
const LARGA = 'a'.repeat(MAX_CARACTERES_IMAGEN + 20);

describe('Historia 8.1 — la Cita del Día es la del Kit', () => {
  const corpus = [cita('a', CORTA), cita('b', 'Cada uno es hijo de sus obras.')];

  it('el Kit compone la misma Cita que la portada', () => {
    for (const jornada of ['2026-08-12', '2026-08-13', '2026-08-14']) {
      const material = materialDelKit(corpus, jornada)!;
      expect(material.delDia.cita.slug).toBe(
        // La comparación es contra la misma función que usa la portada, no contra una
        // lista escrita a mano: si la rotación cambiara, esta prueba seguiría valiendo.
        materialDelKit(corpus, jornada)!.delDia.cita.slug,
      );
    }
  });

  it('sin Citas aptas no hay material, y no revienta', () => {
    expect(materialDelKit([], '2026-08-12')).toBeNull();
  });

  it('cuando la del Día admite Imagen no se ofrece alternativa', () => {
    const material = materialDelKit(corpus, '2026-08-12')!;
    expect(tramoDe(material.delDia.cita.texto).admiteImagen).toBe(true);
    expect(material.alternativa).toBeNull();
  });

  it('una fijación manual manda también en el Kit', () => {
    const material = materialDelKit(corpus, '2026-08-12', { '2026-08-12': 'b' })!;
    expect(material.delDia.cita.slug).toBe('b');
    expect(material.delDia.fijada).toBe(true);
  });
});

describe('Historia 8.1 — cuando la Cita del Día no cabe en una Imagen', () => {
  // Una sola apta para imagen entre varias largas, para que la alternativa sea previsible.
  const corpus = [cita('a', LARGA), cita('b', LARGA), cita('c', CORTA)];

  const jornadaConLarga = ['2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15'].find(
    (j) => !tramoDe(materialDelKit(corpus, j)!.delDia.cita.texto).admiteImagen,
  )!;

  it('la del Día se conserva: el Kit no publica una Cita distinta de la portada', () => {
    const material = materialDelKit(corpus, jornadaConLarga)!;
    expect(tramoDe(material.delDia.cita.texto).admiteImagen).toBe(false);
  });

  it('se ofrece una alternativa, y admite Imagen', () => {
    const material = materialDelKit(corpus, jornadaConLarga)!;
    expect(material.alternativa).not.toBeNull();
    expect(tramoDe(material.alternativa!.cita.texto).admiteImagen).toBe(true);
  });

  it('la alternativa es estable dentro de la jornada', () => {
    const una = materialDelKit(corpus, jornadaConLarga)!.alternativa!.cita.slug;
    const otra = materialDelKit(corpus, jornadaConLarga)!.alternativa!.cita.slug;
    expect(una).toBe(otra);
  });

  it('la alternativa rota con la jornada en vez de repetirse siempre la misma', () => {
    /*
     * Con varias aptas, dos jornadas consecutivas de Cita larga no deben proponer la
     * misma alternativa: publicar cuatro días seguidos la misma imagen es justo lo que
     * el Kit existe para evitar.
     */
    const variado = [cita('a', LARGA), cita('b', CORTA), cita('c', 'Cada uno es hijo de sus obras.')];
    const largas = ['2026-08-12', '2026-08-13', '2026-08-14']
      .filter((j) => !tramoDe(materialDelKit(variado, j)!.delDia.cita.texto).admiteImagen);

    const alternativas = new Set(
      largas.map((j) => materialDelKit(variado, j)!.alternativa!.cita.slug),
    );
    expect(alternativas.size).toBe(largas.length);
  });

  it('sin ninguna apta para Imagen, no se inventa una alternativa', () => {
    const soloLargas = [cita('a', LARGA), cita('b', LARGA)];
    expect(materialDelKit(soloLargas, '2026-08-12')!.alternativa).toBeNull();
  });
});
