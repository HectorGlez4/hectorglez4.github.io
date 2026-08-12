import { describe, expect, it } from 'vitest';
import { PARAMETRO_DE_ORIGEN, REDES, REDES_VALIDAS, enlaceConOrigen, esRedValida } from '../../src/lib/redes.ts';
import { guionDeMedicion } from '../../src/lib/medicion.ts';
import { interpretar } from '../../medicion/receptor.ts';

const INSTANTE = new Date('2026-08-12T05:15:00Z');
const baliza = (carga: unknown) => JSON.stringify(carga);

/** Historia 8.2 — de qué cuenta vino cada visita. */

describe('Historia 8.2 — las cinco cuentas, en conjunto cerrado', () => {
  it('son las cinco del PRD', () => {
    expect(REDES_VALIDAS).toEqual(['instagram', 'tiktok', 'x', 'threads', 'facebook']);
    expect(REDES).toHaveLength(5);
  });

  it('cada una tiene su marca de origen distinta', () => {
    const marcas = REDES.map((r) => enlaceConOrigen('/cita/x', r.id));
    expect(new Set(marcas).size).toBe(REDES.length);
    expect(marcas[0]).toBe(`/cita/x?${PARAMETRO_DE_ORIGEN}=instagram`);
  });

  it('cualquier otra cosa no es una red', () => {
    for (const impostor of ['', 'INSTAGRAM', 'linkedin', 'visitante-7f3a', '../../etc']) {
      expect(esRedValida(impostor), impostor).toBe(false);
    }
  });

  it('la marca no es la convención de ningún proveedor de analítica', () => {
    // `utm_source` arrastraría la convención de un producto que AD-13 no usa, y NFR-4
    // pide que lo que se ve en la URL esté en español y no sea opaco.
    expect(PARAMETRO_DE_ORIGEN).toBe('de');
  });
});

describe('Historia 8.2 — el origen se coteja en los dos extremos', () => {
  const guion = guionDeMedicion('https://ejemplo.invalid/e');

  it('el guion solo deja salir una de las cinco', () => {
    expect(guion).toContain('redes.indexOf(marca) === -1 ? null : marca');
    for (const red of REDES_VALIDAS) expect(guion).toContain(red);
  });

  it('el guion lee la marca de la URL y nada más de ella', () => {
    expect(guion).toContain('URLSearchParams(location.search)');
    // Ni el referente ni la URL entera: solo el parámetro, y cotejado.
    expect(guion).not.toMatch(/document\.referrer|location\.href/);
  });

  it('el receptor registra la cuenta cuando es una de las cinco', () => {
    for (const red of REDES_VALIDAS) {
      const registro = interpretar(
        baliza({ evento: 'vista-de-cita', ruta: '/cita/una', origen: red }),
        INSTANTE,
      );
      expect(registro!.origen).toBe(red);
    }
  });

  it('un origen inventado no se registra, pero la visita sí', () => {
    /*
     * Las dos mitades importan. Registrar el texto libre convertiría la columna de SM-8
     * en procedencia desconocida; descartar el evento entero falsearía el recuento de
     * visitas de la jornada por algo que el visitante no controla.
     */
    const registro = interpretar(
      baliza({ evento: 'vista-de-cita', ruta: '/cita/una', origen: 'visitante-7f3a' }),
      INSTANTE,
    );
    expect(registro).not.toBeNull();
    expect(registro!.origen).toBeNull();
  });

  it('una visita sin marca se registra sin origen', () => {
    const registro = interpretar(baliza({ evento: 'copiado', ruta: '/cita/una' }), INSTANTE);
    expect(registro!.origen).toBeNull();
  });

  it('lo agrupable es la red y la jornada, que es lo que pregunta SM-8', () => {
    const registro = interpretar(
      baliza({ evento: 'vista-de-cita', ruta: '/cita/una', origen: 'tiktok' }),
      INSTANTE,
    )!;
    expect(registro.jornada).toBe('2026-08-12');
    expect(registro.origen).toBe('tiktok');
    // Y sigue sin haber nada por lo que agrupar personas.
    expect(Object.keys(registro).sort()).toEqual([
      'consulta',
      'destino',
      'evento',
      'jornada',
      'origen',
      'ruta',
    ]);
  });
});
