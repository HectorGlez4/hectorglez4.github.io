/**
 * Historia 35.1b, AD-32 — qué cuenta como atestiguación de una Cita atribuida: el dominio
 * registrable ICANN de su dirección, sin BrainyQuote ni el propio dominio. Sin red.
 */
import { describe, expect, it } from 'vitest';
import {
  DOMINIOS_QUE_NO_ATESTIGUAN,
  dominioDeAtestiguacion,
  dominiosQueAtestiguan,
} from '../../src/lib/atestiguaciones.ts';
import { DOMINIO } from '../../src/lib/dominio.ts';

describe('dominioDeAtestiguacion', () => {
  it('dos subdominios del mismo dominio cuentan uno', () => {
    expect(dominioDeAtestiguacion('https://es.wikiquote.org/wiki/X')).toBe('wikiquote.org');
    expect(dominiosQueAtestiguan(['https://es.wikiquote.org/a', 'https://en.wikiquote.org/b'])).toEqual([
      'wikiquote.org',
    ]);
  });

  it('un sufijo de dos niveles se respeta', () => {
    expect(dominioDeAtestiguacion('https://www.bbc.co.uk/news')).toBe('bbc.co.uk');
  });

  it('un sufijo privado no cuenta como registrable: dos *.github.io son uno', () => {
    expect(dominiosQueAtestiguan(['https://ana.github.io/', 'https://luis.github.io/'])).toEqual(['github.io']);
  });

  it('BrainyQuote y el propio dominio no atestiguan', () => {
    expect(DOMINIOS_QUE_NO_ATESTIGUAN).toContain('brainyquote.com');
    expect(dominioDeAtestiguacion('https://www.brainyquote.com/quotes/x')).toBeUndefined();
    expect(dominioDeAtestiguacion(`https://${DOMINIO}/cita/x/`)).toBeUndefined();
    expect(dominioDeAtestiguacion(`https://www.${DOMINIO}/cita/x/`)).toBeUndefined();
  });

  it('una dirección sin dominio registrable no cuenta', () => {
    for (const url of ['http://localhost:4321/', 'http://192.168.1.1/', 'https://intranet/', 'no es url', 'ftp://ejemplo.org/']) {
      expect(dominioDeAtestiguacion(url), url).toBeUndefined();
    }
  });

  it('dominiosQueAtestiguan da los distintos que cuentan, en orden', () => {
    expect(
      dominiosQueAtestiguan([
        'https://es.wikiquote.org/a',
        'https://www.brainyquote.com/b',
        'https://www.elpais.com/c',
        'https://en.wikiquote.org/d',
      ]),
    ).toEqual(['wikiquote.org', 'elpais.com']);
  });
});
