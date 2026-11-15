import { describe, expect, it, vi } from 'vitest';

/**
 * Historia 33.3 — `npm run obra -- curar-primero` con la familia Obra **congelada de verdad**:
 * `CONGELACION_DE_OBRAS` de `src/lib/umbrales.ts` con valor, y `curarPrimero` llamado sin
 * `opciones`, como lo llama `tools/obra.ts`. Las demás pruebas inyectan la congelación, y el
 * repositorio la tiene en `undefined`: sin esta, la orden podría dejar de leer la declarada y
 * proponer Obras con la familia congelada sin que nada se pusiera en rojo.
 *
 * Fichero aparte porque sustituye el módulo de umbrales para todo el fichero, como
 * `congelacion-de-obras.test.ts`.
 */

vi.mock('../../src/lib/umbrales.ts', async (original) => ({
  ...(await original<typeof import('../../src/lib/umbrales.ts')>()),
  CONGELACION_DE_OBRAS: { desde: '2026-12-06', indexables: [] },
}));

const { curarPrimero } = await import('../../tools/lib/curarPrimero.ts');
const { rutasDelCorpus } = await import('../../tools/lib/corpus.ts');

describe('Historia 33.3 — curar-primero lee la congelación declarada', () => {
  it('sin opciones, dice la jornada de CONGELACION_DE_OBRAS y no propone ninguna Obra', async () => {
    const r = await curarPrimero(rutasDelCorpus('/no/existe/corpus'), {
      leerCitas: async () => [],
      leerAutores: async () => [],
      leerFichasDeObra: async () => [],
      leerEntradas: async () => [],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mensaje).toContain('congelada por SM-11 desde el 2026-12-06');
      expect(r.mensaje).not.toMatch(/^1\. /m);
      expect(r.mensaje).not.toContain('Qué Obras curar primero');
    }
  });
});
