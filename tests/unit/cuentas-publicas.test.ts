/**
 * Las cuentas que el sitio enlaza tienen que existir.
 *
 * Este fichero nace de un fallo concreto: REDES declara cinco cuentas porque el
 * PRD las lista en §4.10, pero `x.com/sabiduriabolsillo` devolvía 404 el 26 de
 * agosto de 2026. Enlazar a un 404 desde el pie de las 53 páginas del sitio es
 * peor que no enlazar, y nada en el tipo lo impedía: `Red` admite 'x' igual que
 * admite 'instagram'.
 *
 * Lo que se comprueba aquí es la coherencia interna, que es lo que un test puede
 * sostener sin salir a la red. Que la cuenta siga viva es cosa de mirarla.
 */
import { describe, expect, it } from 'vitest';
import {
  CUENTAS_PUBLICAS,
  PERFILES,
  REDES,
  REDES_VALIDAS,
  esRedValida,
} from '../../src/lib/redes.ts';

describe('las cuentas que se enlazan desde el pie', () => {
  it('solo contiene redes del conjunto cerrado', () => {
    for (const cuenta of CUENTAS_PUBLICAS) {
      expect(esRedValida(cuenta.id)).toBe(true);
    }
  });

  it('conserva el orden de REDES, que es el que ofrece el Kit', () => {
    const orden = REDES.map((r) => r.id).filter((id) => PERFILES[id]);
    expect(CUENTAS_PUBLICAS.map((c) => c.id)).toEqual(orden);
  });

  it('da un enlace https absoluto a cada cuenta', () => {
    for (const cuenta of CUENTAS_PUBLICAS) {
      expect(cuenta.perfil).toMatch(/^https:\/\/\S+$/);
      expect(cuenta.nombre.length).toBeGreaterThan(0);
    }
  });

  it('no enlaza ninguna red sin perfil declarado', () => {
    const sinPerfil = REDES_VALIDAS.filter((id) => !PERFILES[id]);
    for (const id of sinPerfil) {
      expect(CUENTAS_PUBLICAS.some((c) => c.id === id)).toBe(false);
    }
  });

  it('deja fuera X mientras la cuenta no exista', () => {
    // Se afirma explícitamente para que quitarlo sea una decisión y no un
    // descuido: el día que la cuenta exista, este test falla y obliga a mirar.
    expect(PERFILES.x).toBeUndefined();
  });
});
