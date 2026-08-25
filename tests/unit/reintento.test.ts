import { describe, expect, it } from 'vitest';

import { conReintentos } from '../../tools/lib/fuentes.ts';

/**
 * AD-22 — un 503 pasajero no deja un documento a medio versionar.
 *
 * Wikisource limita la tasa, y lo hace por rachas: la misma dirección contesta 200, 503 y 200
 * en tres intentos seguidos. Sin reintentar, esa racha se cuela hasta el Corpus por un camino
 * que no parece de red: el documento se versiona **sin el metadato que la Fuente declara**,
 * y entonces la puerta de FR-23 dice «el documento no declara autor» de una página que sí lo
 * declara. La atribución se queda apoyada solo en lo que diga la orden.
 *
 * Reintentar es de las pocas respuestas honestas a un 503: el servidor está diciendo
 * «ahora no», no «esto no existe».
 *
 * La espera se inyecta para que las pruebas no duerman de verdad. No es un adorno de diseño:
 * una prueba que tarda tres segundos en pasar acaba borrada por lenta.
 */
describe('AD-22 — reintento de lo que falla por rachas', () => {
  /** Un intento que falla las `fallos` primeras veces y luego va bien. */
  function falla(fallos: number) {
    let hechos = 0;
    return async () => {
      hechos += 1;
      return { ok: hechos > fallos, intento: hechos };
    };
  }

  const sinDormir = async () => {};

  it('devuelve el primer intento que sale bien', async () => {
    const r = await conReintentos(falla(2), (x) => x.ok, { intentos: 4, esperar: sinDormir });
    expect(r).toEqual({ ok: true, intento: 3 });
  });

  it('no reintenta lo que ya salió bien', async () => {
    const r = await conReintentos(falla(0), (x) => x.ok, { intentos: 4, esperar: sinDormir });
    expect(r.intento).toBe(1);
  });

  it('se rinde tras los intentos acordados y devuelve el último fallo', async () => {
    // Rendirse importa: sin tope, una Fuente caída deja la orden colgada para siempre, y eso
    // es peor que un aviso, porque no se puede leer.
    const r = await conReintentos(falla(99), (x) => x.ok, { intentos: 3, esperar: sinDormir });
    expect(r).toEqual({ ok: false, intento: 3 });
  });

  it('espera más en cada intento, para no empujar a quien ya dijo que no', async () => {
    const esperas: number[] = [];
    await conReintentos(falla(2), (x) => x.ok, {
      intentos: 4,
      esperar: async (ms) => {
        esperas.push(ms);
      },
    });
    expect(esperas.length).toBe(2);
    expect(esperas[1]).toBeGreaterThan(esperas[0]);
  });
});
