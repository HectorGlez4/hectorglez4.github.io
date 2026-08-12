import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EVENTOS, EVENTOS_VALIDOS } from '../../src/lib/medicion.ts';
import { MAX_CONSULTA, interpretar, jornadaDe } from '../../medicion/receptor.ts';

const raiz = resolve(import.meta.dirname, '../..');
const INSTANTE = new Date('2026-08-12T05:15:00Z');

/** El código sin sus comentarios: lo que de verdad se ejecuta. */
const sinComentarios = (fuente: string) =>
  fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const baliza = (carga: unknown) => JSON.stringify(carga);

/** Historia 7.3 — lo que el receptor acepta, lo que descarta y lo que nunca guarda. */

describe('Historia 7.3 — registra el evento con su nombre y su ruta', () => {
  it.each(EVENTOS_VALIDOS)('acepta %s', (evento) => {
    const registro = interpretar(baliza({ evento, ruta: '/cita/una' }), INSTANTE);
    expect(registro).toEqual({
      jornada: '2026-08-12',
      evento,
      ruta: '/cita/una',
      origen: null,
      destino: null,
      consulta: null,
    });
  });

  it('la jornada es la del instante, en UTC', () => {
    expect(jornadaDe(new Date('2026-08-12T23:59:59Z'))).toBe('2026-08-12');
    expect(jornadaDe(new Date('2026-08-13T00:00:01Z'))).toBe('2026-08-13');
  });
});

describe('Historia 7.3 — fuera del vocabulario cerrado se descarta', () => {
  it.each(['pageview', 'clic', 'vista-de-cita-2', 'VISTA-DE-CITA', ''])('descarta %s', (evento) => {
    expect(interpretar(baliza({ evento, ruta: '/' }), INSTANTE)).toBeNull();
  });

  it('descarta lo que no es un cuerpo interpretable', () => {
    for (const cuerpo of ['', 'no soy json', '[]', 'null', '"vista-de-cita"', '42']) {
      expect(interpretar(cuerpo, INSTANTE), cuerpo).toBeNull();
    }
  });

  it('descarta lo que no trae una ruta, o trae algo que no es una ruta', () => {
    for (const ruta of [undefined, '', 'cita/una', 'https://otro.invalid/cita', '//otro.invalid', 7]) {
      expect(interpretar(baliza({ evento: EVENTOS.copiado, ruta }), INSTANTE), String(ruta)).toBeNull();
    }
  });

  it('el vocabulario no se copia: sale del módulo que emite', () => {
    const fuente = readFileSync(resolve(raiz, 'medicion/receptor.ts'), 'utf8');
    expect(fuente).toContain("from '../src/lib/medicion.ts'");
    // Ni un solo nombre de evento escrito a mano aquí.
    for (const evento of EVENTOS_VALIDOS) {
      expect(fuente).not.toContain(`'${evento}'`);
    }
  });
});

describe('Historia 7.3 — la consulta solo donde significa algo', () => {
  it('la búsqueda sin resultados registra lo que se buscó', () => {
    const registro = interpretar(
      baliza({ evento: EVENTOS.busquedaSinResultados, ruta: '/buscar', datos: '  cortázar  ' }),
      INSTANTE,
    );
    expect(registro!.consulta).toBe('cortázar');
  });

  it('una consulta desmedida se recorta en vez de guardarse entera', () => {
    const larga = 'a'.repeat(MAX_CONSULTA + 500);
    const registro = interpretar(
      baliza({ evento: EVENTOS.busquedaSinResultados, ruta: '/buscar', datos: larga }),
      INSTANTE,
    );
    expect(registro!.consulta).toHaveLength(MAX_CONSULTA);
  });

  it('en cualquier otro evento el campo se descarta, pero el evento se registra', () => {
    /*
     * Es la puerta por la que la medición se convertiría en un perfil sin que nadie lo
     * decidiera: un `datos` libre en un evento cualquiera admite lo que se quiera meter.
     * Se tira el campo y no el evento, para que perderlo no se note como métrica caída.
     */
    const registro = interpretar(
      baliza({ evento: EVENTOS.vistaDeCita, ruta: '/cita/una', datos: 'visitante-7f3a' }),
      INSTANTE,
    );
    expect(registro).not.toBeNull();
    expect(registro!.consulta).toBeNull();
  });
});

describe('Historia 7.3 — no se guarda nada que pueda identificar a nadie', () => {
  it('la fila tiene exactamente los campos declarados y ninguno más', () => {
    // Crece solo cuando una historia lo decide: el origen lo añadió la 8.2. Que esta
    // prueba haya que tocarla para ampliarla es el punto.
    const registro = interpretar(baliza({ evento: EVENTOS.copiado, ruta: '/cita/una' }), INSTANTE)!;
    expect(Object.keys(registro).sort()).toEqual([
      'consulta',
      'destino',
      'evento',
      'jornada',
      'origen',
      'ruta',
    ]);
  });

  it('un campo colado en la baliza no llega a la fila', () => {
    const registro = interpretar(
      baliza({ evento: EVENTOS.copiado, ruta: '/cita/una', visitante: 'abc', ip: '10.0.0.1' }),
      INSTANTE,
    )!;
    expect(registro).not.toHaveProperty('visitante');
    expect(registro).not.toHaveProperty('ip');
  });

  it('el adaptador no lee ninguna cabecera ni nada que la plataforma regale', () => {
    // Se miran las instrucciones, no los comentarios: este fichero explica por escrito
    // justo lo que no lee, y esa explicación no es una lectura.
    const worker = sinComentarios(readFileSync(resolve(raiz, 'medicion/worker.ts'), 'utf8'));
    for (const prohibido of [
      'CF-Connecting-IP',
      'User-Agent',
      'Referer',
      'peticion.headers',
      'request.cf',
      'peticion.cf',
      'cookie',
    ]) {
      expect(worker.toLowerCase(), `lee ${prohibido}`).not.toContain(prohibido.toLowerCase());
    }
  });

  it('el almacén no tiene ninguna columna de visitante ni de instante fino', () => {
    const esquema = readFileSync(resolve(raiz, 'medicion/esquema.sql'), 'utf8').toLowerCase();
    for (const columna of ['ip', 'visitante', 'usuario', 'sesion', 'cookie', 'agente', 'timestamp']) {
      expect(esquema.includes(`\n  ${columna}`), `tiene columna ${columna}`).toBe(false);
    }
  });

  it('la plataforma no registra las peticiones por su cuenta', () => {
    // El registro de acceso de un proveedor guarda IP y agente de usuario: apagarlo es
    // parte de la propiedad, no una opción de rendimiento.
    const config = readFileSync(resolve(raiz, 'medicion/wrangler.toml'), 'utf8');
    expect(config).toMatch(/\[observability\]\s*\nenabled\s*=\s*false/);
  });
});

describe('Historia 7.3 — el receptor caído no rompe nada', () => {
  it('el adaptador responde siempre sin cuerpo y sin error', () => {
    const worker = sinComentarios(readFileSync(resolve(raiz, 'medicion/worker.ts'), 'utf8'));
    expect(worker).toContain('status: 204');
    expect(worker).not.toMatch(/status:\s*(4|5)\d\d/);
    // Y el fallo del almacén se traga aquí, no sube.
    expect(worker).toMatch(/catch\s*{/);
  });
});
