import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EVENTOS, EVENTOS_VALIDOS } from '../../src/lib/medicion.ts';
import {
  CAMPOS,
  CAMPOS_DE_EVENTO,
  DESTINOS_DE_DESCARGA,
  FILTROS,
  MARCAS_DE_OBRA,
  PRIMERA,
  TRAMOS,
  ZONAS,
} from '../../src/lib/vocabulario.ts';
import { DESTINOS_VALIDOS } from '../../src/lib/destinos.ts';
import { MAX_CONSULTA, interpretar, jornadaDe } from '../../medicion/receptor.ts';

const raiz = resolve(import.meta.dirname, '../..');
const INSTANTE = new Date('2026-08-12T05:15:00Z');

/** Las seis columnas de la migración 0001, nulas: lo que deja una baliza que no trae ninguna. */
const NUEVAS_NULAS = { via: null, zona: null, tramo: null, filtros: null, indexable: null, primera: null };

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
      ...NUEVAS_NULAS,
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

  it('el vocabulario no se copia: sale de src/lib/vocabulario.ts (Historia 23.2)', () => {
    const fuente = readFileSync(resolve(raiz, 'medicion/receptor.ts'), 'utf8');
    expect(fuente).toContain("from '../src/lib/vocabulario.ts'");
    // Ni un solo evento, zona, tramo, filtro, marca ni valor de `primera` escrito a mano aquí.
    const escritos = [
      ...EVENTOS_VALIDOS,
      ...ZONAS,
      ...TRAMOS.map((t) => t.rotulo),
      ...FILTROS,
      ...MARCAS_DE_OBRA,
      ...PRIMERA,
      ...DESTINOS_VALIDOS,
    ];
    for (const valor of escritos) {
      expect(fuente, valor).not.toContain(`'${valor}'`);
      expect(fuente, valor).not.toContain(`"${valor}"`);
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
    // Y la Historia 23.2, las seis de la migración 0001: las columnas de `esquema.sql`, en su orden.
    const registro = interpretar(baliza({ evento: EVENTOS.copiado, ruta: '/cita/una' }), INSTANTE)!;
    expect(Object.keys(registro)).toEqual(['jornada', 'evento', 'ruta', ...CAMPOS]);
    expect(Object.keys(registro).sort()).toEqual(
      [
        'consulta',
        'destino',
        'evento',
        'filtros',
        'indexable',
        'jornada',
        'origen',
        'primera',
        'ruta',
        'tramo',
        'via',
        'zona',
      ].sort(),
    );
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

describe('Historia 20.1 — la vista de una superficie deja fila con su origen', () => {
  it('registra jornada, ruta y origen, y descarta destino, datos y lo que sobre', () => {
    const registro = interpretar(
      baliza({
        evento: EVENTOS.vistaDeSuperficie,
        ruta: '/',
        origen: 'facebook',
        destino: 'whatsapp',
        datos: 'x',
        extra: 1,
      }),
      INSTANTE,
    );
    expect(registro).toEqual({
      jornada: '2026-08-12',
      evento: 'vista-de-superficie',
      ruta: '/',
      origen: 'facebook',
      destino: null,
      consulta: null,
      ...NUEVAS_NULAS,
    });
  });
});

/**
 * Historia 23.2 — el receptor sabe guardar lo que la v8 va a medir antes de que nadie lo envíe, y
 * no pierde nada de lo que envía el sitio viejo. Una prueba por fila del receptor en la matriz de
 * la spec: campo nuevo válido, valor ajeno, campo fuera de su evento, descarga con destino y sin
 * él, y las balizas de la v7.1.
 */
describe('Historia 23.2 — los campos nuevos, cada uno en su evento y de su conjunto', () => {
  it('un campo nuevo válido se guarda en su columna, y las demás nuevas quedan nulas', () => {
    expect(interpretar(baliza({ evento: EVENTOS.salidaInterna, ruta: '/', zona: 'listado' }), INSTANTE)).toEqual({
      jornada: '2026-08-12',
      evento: 'salida-interna',
      ruta: '/',
      origen: null,
      destino: null,
      consulta: null,
      ...NUEVAS_NULAS,
      zona: 'listado',
    });
  });

  it.each([
    ['salida-interna', 'zona', ZONAS],
    ['busqueda', 'tramo', TRAMOS.map((t) => t.rotulo)],
    ['busqueda', 'filtros', FILTROS],
    ['vista-de-obra', 'indexable', MARCAS_DE_OBRA],
    ['vista-de-obra', 'via', DESTINOS_VALIDOS],
    ['lectura', 'via', DESTINOS_VALIDOS],
    ['vista-de-cita', 'via', DESTINOS_VALIDOS],
    ['copiado', 'primera', PRIMERA],
    ['comparticion-de-enlace', 'primera', PRIMERA],
    ['descarga-de-imagen', 'primera', PRIMERA],
  ] as const)('%s guarda cada valor de %s', (evento, campo, valores) => {
    expect(CAMPOS_DE_EVENTO[evento][campo]).toBeDefined();
    for (const valor of valores) {
      const registro = interpretar(baliza({ evento, ruta: '/cita/una/', [campo]: valor }), INSTANTE)!;
      expect(registro[campo], `${evento}.${campo} = ${valor}`).toBe(valor);
    }
  });

  it('un valor ajeno se descarta y el evento se registra', () => {
    const casos: [string, string, unknown][] = [
      [EVENTOS.salidaInterna, 'zona', 'pie'],
      [EVENTOS.busqueda, 'tramo', '5'],
      [EVENTOS.busqueda, 'filtros', 'obra'],
      [EVENTOS.vistaDeObra, 'indexable', 'si'],
      [EVENTOS.copiado, 'primera', 'sí'],
      [EVENTOS.vistaDeCita, 'via', 'instagram'],
      [EVENTOS.salidaInterna, 'zona', 7],
      [EVENTOS.descargaDeImagen, 'destino', 'whatsapp'],
    ];
    for (const [evento, campo, valor] of casos) {
      const registro = interpretar(baliza({ evento, ruta: '/cita/una/', [campo]: valor }), INSTANTE);
      expect(registro, `${evento}.${campo} = ${String(valor)}`).not.toBeNull();
      expect((registro as unknown as Record<string, unknown>)[campo], `${evento}.${campo}`).toBeNull();
    }
  });

  it('un campo fuera de su evento se descarta y el evento se registra', () => {
    const casos: [string, string, string][] = [
      [EVENTOS.vistaDeCita, 'zona', 'listado'],
      [EVENTOS.vistaDeSuperficie, 'primera', 'si'],
      [EVENTOS.vistaDeCita, 'primera', 'no'],
      [EVENTOS.copiado, 'via', 'whatsapp'],
      [EVENTOS.busquedaSinResultados, 'tramo', '0'],
      [EVENTOS.salidaInterna, 'indexable', 'indexable'],
      [EVENTOS.copiado, 'filtros', 'ninguno'],
      [EVENTOS.lectura, 'destino', 'opaco'],
    ];
    for (const [evento, campo, valor] of casos) {
      expect(CAMPOS_DE_EVENTO[evento as keyof typeof CAMPOS_DE_EVENTO][campo as 'zona'], `${evento}.${campo}`).toBeUndefined();
      const registro = interpretar(baliza({ evento, ruta: '/cita/una/', [campo]: valor }), INSTANTE);
      expect(registro, `${evento}.${campo}`).not.toBeNull();
      expect((registro as unknown as Record<string, unknown>)[campo], `${evento}.${campo}`).toBeNull();
    }
  });

  it('la consulta sigue siendo solo de la búsqueda sin resultados', () => {
    for (const evento of EVENTOS_VALIDOS.filter((e) => e !== EVENTOS.busquedaSinResultados)) {
      const registro = interpretar(baliza({ evento, ruta: '/buscar/', datos: 'cortázar' }), INSTANTE)!;
      expect(registro.consulta, evento).toBeNull();
    }
  });

  it('la descarga se guarda con destino del suyo —opaco o la Historia— y sin él', () => {
    for (const destino of DESTINOS_DE_DESCARGA) {
      const registro = interpretar(baliza({ evento: EVENTOS.descargaDeImagen, ruta: '/cita/una/', destino }), INSTANTE)!;
      expect(registro.destino).toBe(destino);
    }
    expect(
      interpretar(baliza({ evento: EVENTOS.descargaDeImagen, ruta: '/cita/una/', destino: 'instagram-historia' }), INSTANTE)!
        .destino,
    ).toBe('instagram-historia');
    const sinDestino = interpretar(baliza({ evento: EVENTOS.descargaDeImagen, ruta: '/cita/una/' }), INSTANTE)!;
    expect(sinDestino).not.toBeNull();
    expect(sinDestino.destino).toBeNull();
  });
});

describe('Historia 23.2 — el receptor nuevo no pierde nada de lo que envía el sitio viejo', () => {
  /**
   * Las siete balizas de la v7.1 tal como las envía su guion: las cinco claves en todo evento,
   * con la Marca de origen en todos —también en las acciones—, el destino de la isla o `null`, y
   * `datos` con el texto o `null`.
   */
  const v71 = (evento: string, extra: { destino?: string; datos?: string } = {}) => ({
    evento,
    ruta: '/cita/una/',
    origen: 'tiktok',
    destino: extra.destino ?? null,
    datos: extra.datos ?? null,
  });

  it.each([
    [v71(EVENTOS.vistaDeCita), { destino: null, consulta: null }],
    [v71(EVENTOS.vistaDeSuperficie), { destino: null, consulta: null }],
    [v71(EVENTOS.copiado), { destino: null, consulta: null }],
    [v71(EVENTOS.descargaDeImagen), { destino: null, consulta: null }],
    [v71(EVENTOS.busquedaSinResultados, { datos: '  séneca  ' }), { destino: null, consulta: 'séneca' }],
    [v71(EVENTOS.comparticionDeImagen, { destino: 'opaco' }), { destino: 'opaco', consulta: null }],
    [v71(EVENTOS.comparticionDeEnlace, { destino: 'telegram' }), { destino: 'telegram', consulta: null }],
  ])('%j se registra igual que antes, con las columnas nuevas nulas', (carga, esperado) => {
    expect(interpretar(baliza(carga), INSTANTE)).toEqual({
      jornada: '2026-08-12',
      evento: carga.evento,
      ruta: '/cita/una/',
      // La Marca de origen se guarda en todo evento, como hoy: compatibilidad con la v7.1.
      origen: 'tiktok',
      ...esperado,
      ...NUEVAS_NULAS,
    });
  });
});
