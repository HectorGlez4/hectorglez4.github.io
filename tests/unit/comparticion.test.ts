import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EVENTOS, EVENTOS_VALIDOS, guionDeMedicion } from '../../src/lib/medicion.ts';
import { DESTINOS, DESTINOS_VALIDOS, DESTINO_OPACO } from '../../src/lib/compartir.ts';
import { interpretar } from '../../medicion/receptor.ts';

const raiz = resolve(import.meta.dirname, '../..');
const INSTANTE = new Date('2026-08-12T05:15:00Z');
const baliza = (carga: unknown) => JSON.stringify(carga);

/** Historia 10.4 — medir la compartición. */

describe('Historia 10.4 — los eventos nuevos están en el vocabulario cerrado', () => {
  it('compartir imagen y compartir enlace son eventos con nombre', () => {
    expect(EVENTOS_VALIDOS).toContain(EVENTOS.comparticionDeImagen);
    expect(EVENTOS_VALIDOS).toContain(EVENTOS.comparticionDeEnlace);
  });

  it('imagen y enlace se distinguen entre sí', () => {
    expect(EVENTOS.comparticionDeImagen).not.toBe(EVENTOS.comparticionDeEnlace);
  });

  it('compartir la imagen y descargarla son eventos distintos', () => {
    /*
     * SM-C3 vigila si la compartición creció **a costa** del copiado. Con un solo evento
     * para las dos cosas esa pregunta no se puede ni formular.
     */
    expect(EVENTOS.comparticionDeImagen).not.toBe(EVENTOS.descargaDeImagen);
  });

  it('no hay ningún evento genérico con carga libre', () => {
    // Uno solo llamado «accion» o «evento» con un campo abierto convertiría el
    // vocabulario cerrado en una lista de una entrada que admite cualquier cosa.
    for (const evento of EVENTOS_VALIDOS) {
      expect(evento).not.toMatch(/^(evento|accion|acción|custom|generico|genérico)$/);
    }
    expect(EVENTOS_VALIDOS.length).toBe(new Set(EVENTOS_VALIDOS).size);
  });

  it('ampliarlo exige tocar el módulo, que es lo que AD-13 quiere que cueste', () => {
    const guion = guionDeMedicion('https://ejemplo.invalid/e');
    expect(guion).toContain('permitidos.indexOf(evento) === -1) return');
    for (const evento of EVENTOS_VALIDOS) expect(guion).toContain(evento);
  });
});

describe('Historia 10.4 — el destino', () => {
  it('un destino elegido en el sitio se registra con su nombre', () => {
    for (const destino of DESTINOS) {
      const registro = interpretar(
        baliza({ evento: EVENTOS.comparticionDeEnlace, ruta: '/cita/una', destino: destino.id }),
        INSTANTE,
      );
      expect(registro!.destino, destino.id).toBe(destino.id);
    }
  });

  it('la hoja del sistema se registra como opaco', () => {
    const registro = interpretar(
      baliza({ evento: EVENTOS.comparticionDeImagen, ruta: '/cita/una', destino: DESTINO_OPACO }),
      INSTANTE,
    );
    expect(registro!.destino).toBe('opaco');
  });

  it('no se intenta averiguar cuál fue', () => {
    /*
     * La Web Share API no lo dice, y deducirlo —medir tiempos, mirar qué pierde el foco—
     * sería reconstruir el comportamiento del visitante por la puerta de atrás.
     */
    const isla = readFileSync(resolve(raiz, 'src/islands/ImagenDeCita.astro'), 'utf8');
    for (const truco of ['visibilitychange', 'blur', 'performance.now', 'setTimeout(() => {', 'document.hidden']) {
      expect(isla, `intenta deducir el destino con ${truco}`).not.toContain(truco);
    }
  });

  it('el conjunto de destinos es cerrado, con el opaco dentro', () => {
    expect(DESTINOS_VALIDOS).toEqual([...DESTINOS.map((d) => d.id), 'opaco']);
  });

  it('un destino inventado no se registra, pero la compartición sí se cuenta', () => {
    const registro = interpretar(
      baliza({ evento: EVENTOS.comparticionDeEnlace, ruta: '/cita/una', destino: 'visitante-7f3a' }),
      INSTANTE,
    );
    expect(registro).not.toBeNull();
    expect(registro!.destino).toBeNull();
  });

  it('el destino viaja en su propio campo, no dentro de la carga libre', () => {
    // `datos` es texto libre —lo usa la consulta de búsqueda—: meter ahí el destino
    // habría abierto justo la carga libre que el criterio prohíbe.
    const guion = guionDeMedicion('https://ejemplo.invalid/e');
    expect(guion).toContain('destino: adonde');
    expect(guion).toContain('destinos.indexOf(destino) === -1 ? null : destino');
  });
});

describe('Historia 10.4 — lo que viaja no identifica a nadie', () => {
  it('la fila de una compartición tiene los campos declarados y ninguno más', () => {
    const registro = interpretar(
      baliza({
        evento: EVENTOS.comparticionDeEnlace,
        ruta: '/cita/una',
        destino: 'telegram',
        visitante: 'abc',
        cookie: 'x=1',
      }),
      INSTANTE,
    )!;

    expect(Object.keys(registro).sort()).toEqual([
      'consulta',
      'destino',
      'evento',
      'jornada',
      'origen',
      'ruta',
    ]);
    expect(JSON.stringify(registro)).not.toContain('abc');
  });

  it('el guion de compartición no lee cookies ni almacenamiento', () => {
    const guion = guionDeMedicion('https://ejemplo.invalid/e');
    expect(guion).not.toMatch(/document\.cookie|localStorage|sessionStorage|randomUUID/);
  });
});

describe('Historia 10.4 — SM-5 y SM-7 comparables', () => {
  it('los cuatro eventos del reparto conviven en la misma tabla y jornada', () => {
    const eventos = [
      EVENTOS.copiado,
      EVENTOS.descargaDeImagen,
      EVENTOS.comparticionDeImagen,
      EVENTOS.comparticionDeEnlace,
    ];

    const registros = eventos.map(
      (evento) => interpretar(baliza({ evento, ruta: '/cita/una' }), INSTANTE)!,
    );

    // Misma jornada y misma forma: agrupar por evento y jornada responde SM-C3 sin
    // cruzar dos almacenes ni dos granularidades de tiempo.
    expect(new Set(registros.map((r) => r.jornada))).toEqual(new Set(['2026-08-12']));
    expect(new Set(registros.map((r) => r.evento)).size).toBe(4);
  });

  it('el almacén tiene columna de destino, y la consulta de SM-7 está documentada', () => {
    expect(readFileSync(resolve(raiz, 'medicion/esquema.sql'), 'utf8')).toContain('destino');
    expect(readFileSync(resolve(raiz, 'DESPLIEGUE.md'), 'utf8')).toContain('SM-7');
  });
});
