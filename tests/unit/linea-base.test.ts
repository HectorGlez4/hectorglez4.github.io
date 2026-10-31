import { afterAll, describe, expect, it, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { SUPERFICIES, type Superficie } from '../../src/lib/superficies.ts';
import {
  CORTES_DE_SERIE,
  CORTES_DE_SERIE_DECLARADOS,
  CORTES_DE_SM8,
  DESPLIEGUE_DE_LA_BUSQUEDA_CON_FILTROS,
  SM12_CON_FACEBOOK,
  cortesQueLlegaron,
  type CorteLlegado,
} from '../../src/lib/umbrales.ts';
import { EVENTOS } from '../../src/lib/vocabulario.ts';
import {
  CONSULTAS_DE_LA_LECTURA,
  recorridosDeLaLectura,
  type ConsultaDeLaLectura,
  type CuotaLeida,
  type Filas,
  type GastoDeLaLectura,
} from '../../tools/lib/medicion.ts';
import {
  JUICIOS_POR_VENTANAS,
  PAGINAS_2_O_MAS,
  SIN_SUPERFICIE_DECLARADA,
  UNIDAD_DE_LA_PAGINA_DE_CITA,
  UNIDAD_DE_LAS_BUSQUEDAS,
  YA_NO_SE_PUBLICA,
  componerLecturaDeMedicion,
  direccionDe,
  esJornadaReal,
  legible,
  lineasDeLecturaDeMedicion,
  lineasDelGasto,
  ningunaConsultaConForma,
  partirSerie,
  problemasDeLaLectura,
  valoresDeLaLectura,
  type JuicioPorVentanas,
  type LecturaDeMedicion,
  type OpcionesDeLaLectura,
  type Tasa,
} from '../../tools/lib/lineaBase.ts';

/**
 * Historia 23.10 — la lectura de la línea base, con respuestas fijas (AD-22).
 *
 * Ninguna prueba toca D1: lo que contestan las cinco consultas se escribe aquí, con la forma de
 * sus filas agrupadas, y la composición se juzga por sus datos y por su texto. Las constantes de
 * `src/lib/umbrales.ts` entran como opciones, para recorrer cada estado sin cambiarlas.
 */

const RAIZ = resolve(import.meta.dirname, '../..');
const aBorrar: string[] = [];
afterAll(() => {
  for (const dir of aBorrar) rmSync(dir, { recursive: true, force: true });
});

/** La llegada de la 23 en estas pruebas: el tramo vigente de la lectura empieza el 2026-11-02. */
const CORTE_23: CorteLlegado = { jornada: '2026-11-01', que: 'la llegada de la 23', series: ['sm8', 'lectura', 'busqueda'] };
/** Hoy no entra: la última jornada cerrada es el 2026-11-11, y el tramo tiene diez. */
const HOY = '2026-11-12';
const DIAS = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11'];
const [D1, D2, D3, D4] = DIAS;

/** El censo de hoy: la portada, dos Citas, un Autor, un Tema y dos Obras. */
const CENSO = ['/', '/cita/una/', '/cita/dos/', '/autor/a/', '/tema/t/', '/obra/a/b/', '/obra/a/c/'];

type Fila = Record<string, unknown>;
const vista = (jornada: string, ruta: string, evento: string, n: number, campos: Fila = {}): Fila => ({
  jornada,
  ruta,
  evento,
  origen: null,
  via: null,
  indexable: null,
  n,
  ...campos,
});
const lectura = (jornada: string, ruta: string, n: number, campos: Fila = {}) => vista(jornada, ruta, EVENTOS.lectura, n, campos);
const salida = (jornada: string, ruta: string, zona: string, n: number): Fila => ({ jornada, ruta, zona, n });
const accion = (jornada: string, ruta: string, evento: string, n: number, campos: Fila = {}): Fila => ({
  jornada,
  ruta,
  evento,
  destino: null,
  primera: 'si',
  n,
  ...campos,
});
const busqueda = (jornada: string, tramo: string, n: number, ruta = '/buscar/'): Fila => ({ jornada, ruta, tramo, filtros: 'ninguno', n });

type Partes = Partial<Record<ConsultaDeLaLectura, Fila[] | string>>;

/** Las cinco consultas: una lista es lo que contestó; un texto, el motivo de que fallara. */
function consultas(partes: Partes): Record<ConsultaDeLaLectura, Filas> {
  return Object.fromEntries(
    CONSULTAS_DE_LA_LECTURA.map((c) => {
      const parte = partes[c] ?? [];
      return [c, typeof parte === 'string' ? { ok: false, motivo: parte } : { ok: true, filas: parte }];
    }),
  ) as Record<ConsultaDeLaLectura, Filas>;
}

const CUOTA: CuotaLeida = { escritas: { ok: true, valor: 2500 }, tamaño: { ok: true, valor: 12_000_000 } };

/** Lo que una lectura gastó de la cuota de lectura: 2.000 filas, seis recorridos, todo medido. */
const GASTO: GastoDeLaLectura = {
  leidas24h: 40_000,
  filas: 2_000,
  recorridos: recorridosDeLaLectura(HOY),
  estimacion: 12_000,
  reserva: 40_000,
  cuota: 5_000_000,
  medida: 12_600,
  enviadas: 6,
  sinMedir: 0,
};

function leer(partes: Partes, opciones: OpcionesDeLaLectura = {}, censo: string[] = CENSO, cuota: CuotaLeida = CUOTA): LecturaDeMedicion {
  return componerLecturaDeMedicion(
    { hoy: HOY, censo, consultas: consultas(partes), cuota, gasto: GASTO },
    { cortes: [CORTE_23], minimo: undefined, pasadas: [], conFacebook: false, juicios: [], ...opciones },
  );
}

const texto = (l: LecturaDeMedicion) => lineasDeLecturaDeMedicion(l).join('\n');
const superficie = (l: LecturaDeMedicion, nombre: string) => l.superficies.find((s) => s.nombre === nombre)!;
const calculada = (numerador: number, denominador: number): Tasa => ({ estado: 'calculada', numerador, denominador });

describe('Historia 23.10 — una lectura sana', () => {
  it('trae cada parte del informe y acaba sin escribir nada', () => {
    const l = leer({
      vistasYLecturas: [vista(D1, '/cita/una/', EVENTOS.vistaDeCita, 4, { origen: 'instagram' }), lectura(D1, '/cita/una/', 3)],
      salidas: [salida(D1, '/cita/una/', 'atribucion', 1)],
      acciones: [accion(D1, '/cita/una/', EVENTOS.copiado, 1)],
      busquedas: [busqueda(D1, '1-9', 2)],
      sinResultados: [{ jornada: D1, ruta: '/buscar/', consulta: 'sene', n: 1 }],
    });
    expect(l.sinLeer).toEqual([]);
    const lineas = lineasDeLecturaDeMedicion(l);
    const partes = [
      'Cuota de D1',
      'Descuentos',
      'Cortes de serie',
      'SM-8',
      'Superficies',
      'Fuera del censo',
      'La Obra, por la marca',
      'La Página de Cita',
      'SM-12',
      'Búsquedas',
      'Líneas base',
      'Ventanas',
    ];
    for (const parte of partes) {
      expect(lineas.some((linea) => linea.startsWith(parte)), parte).toBe(true);
    }
    // En el orden de DESPLIEGUE.md §3, «Lo que informa».
    const posiciones = partes.map((parte) => lineas.findIndex((linea) => linea.startsWith(parte)));
    expect(posiciones).toEqual([...posiciones].sort((a, b) => a - b));
    expect(lineas.at(-1)).toBe('Consulta: no se ha escrito nada.');
    expect(lineas[0]).toContain('jornadas UTC cerradas hasta el 2026-11-11; la de hoy (2026-11-12) no entra');
  });
});

describe('Historia 23.10 — ausencia antes que cero', () => {
  it('una consulta que falla va a sinLeer con su motivo, y lo que depende de ella se omite y se nombra', () => {
    const l = leer({
      vistasYLecturas: [lectura(D1, '/cita/una/', 10), lectura(D1, '/', 4)],
      salidas: 'D1_ERROR: fallo de mentira',
      acciones: [accion(D1, '/cita/una/', EVENTOS.copiado, 2)],
      busquedas: [busqueda(D1, '0', 1), busqueda(D1, '1-9', 3)],
    });
    expect(l.sinLeer).toEqual([{ que: 'las salidas internas', motivo: 'D1_ERROR: fallo de mentira' }]);
    // Lo que depende de las salidas: la continuación, SM-3, SM-13 y la tasa de SM-C5.
    const sinSalidas: Tasa = { estado: 'sin-leer', faltan: ['salidas'] };
    expect(l.cita?.continuacion).toEqual(sinSalidas);
    expect(l.cita?.sinContinuacion).toEqual(sinSalidas);
    expect(l.busquedas.sm13).toEqual(sinSalidas);
    expect(superficie(l, 'la Página de Cita').salidas).toBeUndefined();
    // Lo demás sale.
    expect(l.cita?.conAccion).toEqual(calculada(2, 10));
    expect(l.busquedas.sm6).toEqual(calculada(1, 4));
    const informe = texto(l);
    expect(informe).toContain('las salidas internas: D1_ERROR: fallo de mentira');
    expect(informe).toContain('SM-3, 1 − la continuación: sin leer (las salidas internas)');
    expect(informe).toContain('SM-13, salidas desde un resultado: sin leer (las salidas internas)');
    expect(informe).toMatch(/SM-C5: la continuación sin leer \(las salidas internas\)/);
    expect(informe).toContain('la Página de Cita: vistas 0, lecturas 10, salidas sin leer');
    // Nunca un cero en su lugar.
    expect(informe).not.toMatch(/salidas 0[,;]/);
    expect(informe).not.toMatch(/continuación 0,0 %/);
  });

  it('las ventanas que usan la continuación la dan sin leer, sin dirección', () => {
    const SM_C5 = JUICIOS_POR_VENTANAS.find((j) => j.nombre === 'SM-C5')!;
    const l = leer(
      {
        vistasYLecturas: DIAS.map((dia) => lectura(dia, '/cita/una/', 5)),
        salidas: 'D1_ERROR: fallo de mentira',
        acciones: DIAS.map((dia) => accion(dia, '/cita/una/', EVENTOS.copiado, 1)),
      },
      { minimo: 10, juicios: [{ ...SM_C5, llegada: undefined }] },
    );
    const [juicio] = l.juicios;
    expect(juicio.ventanas.length).toBeGreaterThan(0);
    for (const ventana of juicio.ventanas) {
      expect(ventana.tasas[0]).toEqual({ tasa: 'continuación', valor: { estado: 'sin-leer', faltan: ['salidas'] } });
      // Sin dirección no se puede juzgar la señal: no es «no se da».
      expect(ventana.senal).toBe('sin dirección');
    }
    expect(texto(l)).toContain('continuación sin leer (las salidas internas), sin dirección');
    expect(texto(l)).toContain('la señal no se puede juzgar: a una de sus dos tasas le falta dirección.');
    expect(texto(l)).not.toContain('la señal no se da');
  });

  it('una tasa sin denominador lo dice, nunca 0 %', () => {
    const l = leer({ acciones: [accion(D1, '/cita/una/', EVENTOS.copiado, 2)] });
    expect(l.cita?.conAccion).toEqual({ estado: 'sin-denominador', numerador: 2 });
    expect(texto(l)).toContain('SM-5, lecturas con su primera acción —copiado o descarga sin destino—: sin denominador (2 sobre ninguna)');
  });

  it('una fila sin forma invalida su consulta entera, sin repartir las demás', () => {
    const l = leer({ vistasYLecturas: [lectura(D1, '/cita/una/', 3), { ...lectura(D1, '/cita/dos/', 1), n: 'muchas' }] });
    expect(l.sinLeer.map((s) => s.que)).toEqual(['las vistas y las lecturas']);
    expect(superficie(l, 'la Página de Cita').lecturas).toBeUndefined();
  });

  it('d1 info, por separado: la cifra que falta se nombra y la otra sale', () => {
    const cuota: CuotaLeida = { escritas: { ok: false, motivo: 'd1 info no trae rows_written_24h.' }, tamaño: { ok: true, valor: 250_000_000 } };
    const l = leer({}, {}, CENSO, cuota);
    expect(l.sinLeer).toEqual([{ que: 'las filas escritas en 24 h (d1 info)', motivo: 'd1 info no trae rows_written_24h.' }]);
    const informe = texto(l);
    expect(informe).toContain('Filas escritas en 24 h: sin leer (d1 info no trae rows_written_24h.)');
    expect(informe).toContain('Tamaño de la base: 250.000.000 bytes de 500.000.000 (CUOTA_DE_BYTES_POR_BASE_EN_D1), 50,0 %.');
  });
});

describe('Historia 23.10 — la cuota de D1', () => {
  it('da las filas escritas y el tamaño frente a sus dos cuotas con nombre, y lo que pasa al pasarlas', () => {
    const informe = texto(leer({}));
    expect(informe).toContain(
      'Filas escritas en 24 h, según d1 info: 2500 de 100.000 al día (CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1), 2,5 %. ' +
        'Peca por exceso: cubre lo escrito desde las 00:00 UTC y algo más.',
    );
    expect(informe).toContain('Tamaño de la base: 12.000.000 bytes de 500.000.000 (CUOTA_DE_BYTES_POR_BASE_EN_D1), 2,4 %.');
    // Las dos fallan en silencio, pero solo la de filas escritas se renueva a las 00:00 UTC.
    expect(informe).toContain(
      'Al pasar cualquiera de las dos, las escrituras fallan en silencio —el Worker se traga el error—: pasada la de ' +
        'filas escritas, hasta las 00:00 UTC, cuando se renueva; pasada la de tamaño, hasta que se borren filas o cambie ' +
        'el plan, porque esa no se renueva sola.',
    );
  });
});

describe('Historia 23.13 — la cuota de lectura en el informe', () => {
  it('lo leído en 24 h frente a la cuota, la estimación y, aparte, la medida', () => {
    const informe = texto(leer({}));
    expect(informe).toContain(
      'Filas leídas en 24 h, según d1 info, antes de leer: 40.000 de 5.000.000 al día ' +
        '(CUOTA_DE_FILAS_LEIDAS_POR_DIA_EN_D1, por cuenta), 0,8 %. Se dejaron otras 40.000 de reserva para el resto del día.',
    );
    // Los recorridos salen de la lista declarada, nunca de una cifra escrita.
    expect(informe).toContain(
      'Esta lectura, estimación: 12.000 filas, 2000 filas de la tabla × 6 recorridos (el recuento de filas, ' +
        'las vistas y las lecturas, las salidas internas, las acciones, las búsquedas asentadas, las búsquedas sin ' +
        'resultados). Es una cota inferior: rows_read cuenta también los índices.',
    );
    expect(informe).toContain('Esta lectura, medida: 12.600 filas, la suma de los rows_read de sus 6 sentencias; 0,3 % de la cuota de lectura.');
    expect(informe).toContain('quizá —sin confirmar— también las escrituras del receptor');
    // Va dentro del bloque de la cuota, antes de los descuentos.
    const lineas = lineasDeLecturaDeMedicion(leer({}));
    const cuota = lineas.indexOf('Cuota de D1 (plan gratuito)');
    const medida = lineas.findIndex((l) => l.includes('Esta lectura, medida'));
    expect(cuota).toBeGreaterThanOrEqual(0);
    expect(medida).toBeGreaterThan(cuota);
    expect(medida).toBeLessThan(lineas.indexOf('Descuentos'));
  });

  it('las sentencias sin rows_read se dicen: la medida se queda corta', () => {
    expect(lineasDelGasto({ ...GASTO, sinMedir: 2 }).join('\n')).toContain(
      'la suma de los rows_read de sus 6 sentencias; 2 de ellas no trajeron rows_read, así que la medida se queda corta;',
    );
  });
});

describe('Historia 23.10 — los descuentos', () => {
  it('una pasada en producción descuenta sus rutas en su jornada, y nada más', () => {
    const pasadas = [{ pasada: '25.3', jornada: D2, rutas: ['/cita/una/'] }];
    const l = leer(
      {
        vistasYLecturas: [
          lectura(D2, '/cita/una/', 5), // la pasada: no cuenta
          lectura(D2, '/cita/una', 1), // la misma ruta sin barra final: tampoco
          lectura(D1, '/cita/una/', 3), // la misma ruta, otra jornada: cuenta
          lectura(D2, '/cita/dos/', 2), // otra ruta, la misma jornada: cuenta
          lectura(D2, '/__comprobacion/', 9), // las balizas: nunca
        ],
        salidas: [salida(D2, '/cita/una/', 'atribucion', 4), salida(D2, '/cita/dos/', 'atribucion', 1)],
      },
      { pasadas },
    );
    expect(superficie(l, 'la Página de Cita').lecturas).toBe(5);
    expect(superficie(l, 'la Página de Cita').salidas).toBe(1);
    expect(l.descuentos.pasadas).toEqual([{ ...pasadas[0], registros: 10 }]);
    expect(l.descuentos.comprobacion).toBe(9);
    const informe = texto(l);
    expect(informe).toContain('la 25.3, el 2026-11-03, en /cita/una/: 10 registros descontados.');
    expect(informe).toContain('PASADAS_QUE_ESCRIBEN_EN_PRODUCCION');
  });

  it('sin pasadas anotadas, lo dice', () => {
    expect(texto(leer({}))).toContain('Pasadas que escriben en producción (PASADAS_QUE_ESCRIBEN_EN_PRODUCCION): ninguna anotada.');
  });
});

describe('Historia 23.10 — el censo, nunca el prefijo', () => {
  it('una ruta con prefijo /cita/ fuera del censo no es Página de Cita, y lo que no casa se nombra por clase', () => {
    const l = leer({
      vistasYLecturas: [
        lectura(D1, '/cita/una/', 2),
        vista(D1, '/cita/retirada/', EVENTOS.vistaDeCita, 1),
        lectura(D1, '/cita/retirada/', 1),
      ],
      salidas: [
        salida(D1, '/autor/a/2/', 'paginacion', 3),
        salida(D1, '/buscar/', 'resultado', 4),
        salida(D1, '/x-rota', 'cabecera', 1),
        salida(D1, '/404/', 'cabecera', 2),
      ],
    });
    expect(superficie(l, 'la Página de Cita').lecturas).toBe(2);
    expect(l.cita?.lecturas).toBe(2);
    expect(l.fueraDelCenso).toEqual([
      { clase: PAGINAS_2_O_MAS, porEvento: [{ evento: EVENTOS.salidaInterna, n: 3 }] },
      { clase: YA_NO_SE_PUBLICA, porEvento: [{ evento: EVENTOS.lectura, n: 1 }, { evento: EVENTOS.vistaDeCita, n: 1 }] },
      { clase: 'la búsqueda', porEvento: [{ evento: EVENTOS.salidaInterna, n: 4 }] },
      { clase: 'la página 404', porEvento: [{ evento: EVENTOS.salidaInterna, n: 2 }] },
      { clase: SIN_SUPERFICIE_DECLARADA, porEvento: [{ evento: EVENTOS.salidaInterna, n: 1 }] },
    ]);
    const informe = texto(l);
    expect(informe).toContain('ya no se publica: lectura 1, vista-de-cita 1.');
    expect(informe).toContain('sin superficie declarada: salida-interna 1.');
  });

  it('la unidad es la superficie declarada, y dos que declaran la misma línea base la juntan', () => {
    const deprueba = (nombre: string, ruta: string): Superficie => ({
      nombre,
      pagina: `${ruta}.astro`,
      reconoce: new RegExp(`^/${ruta}$`),
      caracter: 'producto',
      vista: EVENTOS.vistaDeSuperficie,
      lineaBase: 'lo de prueba',
    });
    const superficies = [...SUPERFICIES, deprueba('la prueba uno', 'uno'), deprueba('la prueba dos', 'dos')];
    const l = leer(
      {
        vistasYLecturas: [lectura(D1, '/uno/', 3), lectura(D2, '/dos/', 4)],
        salidas: [salida(D1, '/uno/', 'listado', 1), salida(D2, '/dos/', 'listado', 3)],
      },
      { superficies },
      [...CENSO, '/uno/', '/dos/'],
    );
    // Cada una por separado…
    expect(superficie(l, 'la prueba uno')).toMatchObject({ unidad: 'lo de prueba', lecturas: 3, continuacion: calculada(1, 3) });
    expect(superficie(l, 'la prueba dos')).toMatchObject({ unidad: 'lo de prueba', lecturas: 4, continuacion: calculada(3, 4) });
    // …y juntas en su línea base. La otra unidad compartida es la de los dos Directorios (26.4).
    expect(l.unidades.filter((u) => u.unidad === 'lo de prueba')).toEqual([
      { unidad: 'lo de prueba', superficies: ['la prueba uno', 'la prueba dos'], lecturas: 7, continuacion: calculada(4, 7) },
    ]);
    expect(l.unidades.find((u) => u.unidad === 'los Directorios')?.superficies).toEqual([
      'el Directorio de Autores',
      'el Directorio de Obras',
    ]);
    const base = l.lineasBase.find((b) => b.unidad === 'lo de prueba')!;
    expect(base).toMatchObject({ superficies: ['la prueba uno', 'la prueba dos'], estado: 'sin-minimo', acumulado: 7 });
    expect(texto(l)).toContain('lo de prueba (línea base de la prueba uno y la prueba dos): lecturas 7; continuación 57,1 % (4 de 7).');
  });
});

describe('Historia 23.10 — la familia Obra, por la marca de sus vistas de Obra', () => {
  it('cada (ruta, jornada) toma la marca de sus vistas de Obra para todos sus registros', () => {
    const OBRA = '/obra/a/b/';
    const l = leer({
      vistasYLecturas: [
        // D1: indexable.
        vista(D1, OBRA, EVENTOS.vistaDeObra, 2, { indexable: 'indexable' }),
        lectura(D1, OBRA, 2),
        // D2: no indexable.
        vista(D2, OBRA, EVENTOS.vistaDeObra, 3, { indexable: 'no-indexable' }),
        lectura(D2, OBRA, 3),
        // D3: las dos marcas: «cambió», para todo.
        vista(D3, OBRA, EVENTOS.vistaDeObra, 1, { indexable: 'indexable' }),
        vista(D3, OBRA, EVENTOS.vistaDeObra, 1, { indexable: 'no-indexable' }),
        lectura(D3, OBRA, 2),
        // D4: una vista de Obra sin marca: «nula».
        vista(D4, OBRA, EVENTOS.vistaDeObra, 1),
        lectura(D4, OBRA, 1),
        // Otra Obra con lectura y sin vista de Obra ese día: «sin marca».
        lectura(D1, '/obra/a/c/', 5),
      ],
      salidas: [
        salida(D1, OBRA, 'atribucion', 1),
        salida(D2, OBRA, 'listado', 2),
        salida(D3, OBRA, 'listado', 1),
        salida(D4, OBRA, 'cabecera', 1),
        salida(D1, '/obra/a/c/', 'listado', 2),
      ],
      acciones: [accion(D3, OBRA, EVENTOS.copiado, 1), accion(D1, OBRA, EVENTOS.copiado, 1)],
    });
    expect('faltan' in l.obra).toBe(false);
    const de = (marca: string) => (l.obra as Exclude<LecturaDeMedicion['obra'], { faltan: unknown }>).find((o) => o.marca === marca);
    expect(de('indexable')).toMatchObject({ vistasDeObra: 2, lecturas: 2, salidas: 1, acciones: 1, continuacion: calculada(1, 2) });
    expect(de('no indexable')).toMatchObject({ vistasDeObra: 3, lecturas: 3, salidas: 2, acciones: 0 });
    expect(de('cambió')).toMatchObject({ vistasDeObra: 2, lecturas: 2, salidas: 1, acciones: 1 });
    expect(de('nula')).toMatchObject({ vistasDeObra: 1, lecturas: 1, salidas: 1 });
    expect(de('sin marca')).toMatchObject({ vistasDeObra: 0, lecturas: 5, salidas: 2, continuacion: calculada(2, 5) });
    expect(texto(l)).toContain('cambió: vistas de Obra 2, lecturas 2, salidas 1, acciones 1; continuación 50,0 % (1 de 2).');
  });

  it('sin las vistas no hay marca con que partirla, y se dice', () => {
    const l = leer({ vistasYLecturas: 'D1_ERROR' });
    expect(l.obra).toEqual({ faltan: ['vistasYLecturas'] });
    expect(texto(l)).toContain('sin las vistas de Obra no hay marca con que partirla');
  });
});

describe('Historia 23.10 — los cortes de serie y los tramos', () => {
  const J1 = '2026-11-02';
  const J2 = '2026-11-20';
  const corte = (jornada: string, que: string, series: CorteLlegado['series'] = ['sm8']): CorteLlegado => ({ jornada, que, series });

  it('dos cortes dan tres tramos, y la jornada de llegada no entra en ninguno', () => {
    const partida = partirSerie('sm8', [corte(J1, 'la 23'), corte(J2, 'la 24 con la 26')], '2026-12-01');
    expect(partida.tramos).toEqual([
      { numero: 1, hasta: '2026-11-01' },
      { numero: 2, desde: '2026-11-03', hasta: '2026-11-19' },
      { numero: 3, desde: '2026-11-21', hasta: '2026-11-30' },
    ]);
    expect(partida.cambios).toEqual([
      { jornada: J1, motivos: ['la 23'] },
      { jornada: J2, motivos: ['la 24 con la 26'] },
    ]);
    expect(partida.vigente).toEqual(partida.tramos[2]);
  });

  it('solo parte por los cortes que la nombran, y dos en la misma jornada son un solo «cambió» con los dos motivos', () => {
    const cortes = [corte(J1, 'la 23', ['sm8', 'lectura']), corte(J1, 'un cambio de los 8 s', ['lectura']), corte(J2, 'la 24 con la 26')];
    const lectura = partirSerie('lectura', cortes, '2026-12-01');
    expect(lectura.tramos).toHaveLength(2);
    expect(lectura.cambios).toEqual([{ jornada: J1, motivos: ['la 23', 'un cambio de los 8 s'] }]);
    expect(partirSerie('busqueda', cortes, '2026-12-01').tramos).toEqual([{ numero: 1, hasta: '2026-11-30' }]);
  });

  it('un corte de hoy o de después no abre tramo, y se dice', () => {
    const partida = partirSerie('sm8', [corte(J1, 'la 23'), corte('2026-12-01', 'la de hoy')], '2026-12-01');
    expect(partida.tramos).toHaveLength(2);
    expect(partida.pendientes.map((c) => c.que)).toEqual(['la de hoy']);
    const l = leer({}, { cortes: [CORTE_23, { ...CORTE_23, jornada: HOY, que: 'la de hoy' }] });
    expect(texto(l)).toContain('El corte del 2026-11-12 (la de hoy) es de hoy o posterior: aún no abre tramo.');
  });

  it('una constante sin valor no corta, y la lista va en orden de jornada, estable', () => {
    const declarados = [
      { jornada: undefined, que: 'sin valor', series: ['sm8'] as const },
      { jornada: J2, que: 'después', series: ['sm8'] as const },
      { jornada: J1, que: 'antes', series: ['sm8'] as const },
      { jornada: J1, que: 'antes, la segunda', series: ['lectura'] as const },
    ];
    expect(cortesQueLlegaron(declarados).map((c) => c.que)).toEqual(['antes', 'antes, la segunda', 'después']);
    expect(cortesQueLlegaron([{ jornada: undefined, que: 'x', series: ['sm8'] }])).toEqual([]);
  });

  it('CORTES_DE_SERIE es la lista declarada que llegó, en orden, y CORTES_DE_SM8 su proyección', () => {
    expect(CORTES_DE_SERIE).toEqual(cortesQueLlegaron(CORTES_DE_SERIE_DECLARADOS));
    const jornadas = CORTES_DE_SERIE.map((c) => c.jornada);
    expect(jornadas).toEqual([...jornadas].sort());
    expect(CORTES_DE_SM8).toEqual(CORTES_DE_SERIE.filter((c) => c.series.includes('sm8')));
  });

  /*
   * La lista se compone **dentro** de `umbrales.ts` con sus propias constantes, así que un mock de
   * sus exportaciones no la alcanza: se evalúa una copia del fuente con las dos constantes de
   * despliegue con valor. Es posible porque `umbrales.ts` no importa nada.
   */
  async function umbralesCon(lectura: string, obraYDirectorios: string) {
    const fuente = readFileSync(resolve(RAIZ, 'src/lib/umbrales.ts'), 'utf8');
    // La declaración, con el valor que tenga: sin él hasta la 23.11 y la 26.11, y con el suyo
    // después. Esta prueba no fija ninguno de los dos, que son de Héctor.
    const declaracion = (nombre: string) => new RegExp(`export const ${nombre}: string \\| undefined = [^;\\n]+;`);
    expect(fuente).toMatch(declaracion('DESPLIEGUE_DE_LA_LECTURA'));
    expect(fuente).toMatch(declaracion('DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS'));
    expect(fuente).not.toMatch(/^import /m);
    const copia = fuente
      .replace(declaracion('DESPLIEGUE_DE_LA_LECTURA'), `export const DESPLIEGUE_DE_LA_LECTURA: string | undefined = '${lectura}';`)
      .replace(
        declaracion('DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS'),
        `export const DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS: string | undefined = '${obraYDirectorios}';`,
      );
    const dir = mkdtempSync(join(tmpdir(), 'sabiduria-umbrales-'));
    aBorrar.push(dir);
    const fichero = join(dir, 'umbrales.ts');
    writeFileSync(fichero, copia);
    return (await import(pathToFileURL(fichero).href)) as typeof import('../../src/lib/umbrales.ts');
  }

  it('con las dos constantes con valor, CORTES_DE_SM8 tiene sus dos entradas en orden, y la de la 23 parte también la lectura y la búsqueda', async () => {
    const conValor = await umbralesCon('2026-11-02', '2026-11-20');
    expect(conValor.CORTES_DE_SM8.map((c) => c.jornada)).toEqual(['2026-11-02', '2026-11-20']);
    expect(conValor.CORTES_DE_SM8[0].series).toEqual(['sm8', 'lectura', 'busqueda']);
    expect(conValor.CORTES_DE_SM8[1].series).toEqual(['sm8']);
    // Si llegaran al revés, el orden es el de las jornadas, no el de la declaración.
    const alReves = await umbralesCon('2026-11-20', '2026-11-02');
    expect(alReves.CORTES_DE_SM8.map((c) => c.jornada)).toEqual(['2026-11-02', '2026-11-20']);
    expect(alReves.CORTES_DE_SERIE.map((c) => c.series.includes('lectura'))).toEqual([false, true]);
  });

  it('la lista declarada no lleva ninguna fecha literal: cada jornada es una constante', () => {
    const fuente = readFileSync(resolve(RAIZ, 'src/lib/umbrales.ts'), 'utf8');
    const inicio = fuente.indexOf('export const CORTES_DE_SERIE_DECLARADOS');
    const fin = fuente.indexOf('];', inicio);
    const lista = fuente.slice(inicio, fin);
    expect(inicio).toBeGreaterThan(0);
    expect(lista).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect([...lista.matchAll(/jornada: ([A-Z_]+),/g)].map((m) => m[1])).toEqual([
      'DESPLIEGUE_DE_LA_LECTURA',
      'DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS',
    ]);
  });
});

describe('Historia 23.10 — SM-8', () => {
  it('cuenta las vistas de Cita y de superficie con marca, de toda ruta, por tramo, sin la vista de Obra ni sumar los tramos', () => {
    const J1 = '2026-11-04';
    const l = leer(
      {
        vistasYLecturas: [
          vista(D1, '/cita/una/', EVENTOS.vistaDeCita, 2, { origen: 'instagram' }),
          vista(D1, '/cita/retirada/', EVENTOS.vistaDeCita, 1, { origen: 'instagram' }),
          vista(D1, '/obra/a/b/', EVENTOS.vistaDeSuperficie, 1, { origen: 'instagram' }),
          vista(D1, '/obra/a/b/', EVENTOS.vistaDeObra, 1, { origen: 'instagram', indexable: 'indexable' }),
          vista(D1, '/cita/una/', EVENTOS.vistaDeCita, 5), // sin marca: no es SM-8
          vista(J1, '/cita/una/', EVENTOS.vistaDeCita, 7, { origen: 'threads' }), // la jornada de llegada
          vista('2026-11-05', '/', EVENTOS.vistaDeSuperficie, 3, { origen: 'tiktok' }),
        ],
      },
      { cortes: [CORTE_23, { jornada: J1, que: 'otra llegada', series: ['sm8'] }] },
    );
    expect('faltan' in l.sm8).toBe(false);
    const tramos = (l.sm8 as { tramos: { tramo?: { numero: number }; cambio?: { jornada: string }; porRed: unknown }[] }).tramos;
    // Tramo 1, la llegada de la 23, tramo 2, la otra llegada, tramo 3.
    expect(tramos.map((t) => (t.tramo ? `tramo ${t.tramo.numero}` : `cambió ${t.cambio!.jornada}`))).toEqual([
      'tramo 1',
      'cambió 2026-11-01',
      'tramo 2',
      'cambió 2026-11-04',
      'tramo 3',
    ]);
    expect(tramos[2].porRed).toEqual([
      { red: 'instagram', porEvento: [{ evento: EVENTOS.vistaDeCita, n: 3 }, { evento: EVENTOS.vistaDeSuperficie, n: 1 }] },
    ]);
    expect(tramos[3].porRed).toEqual([{ red: 'threads', porEvento: [{ evento: EVENTOS.vistaDeCita, n: 7 }] }]);
    expect(tramos[4].porRed).toEqual([{ red: 'tiktok', porEvento: [{ evento: EVENTOS.vistaDeSuperficie, n: 3 }] }]);
    const informe = texto(l);
    expect(informe).toContain('Los tramos no se suman como una sola serie.');
    expect(informe).toContain('Threads no se lee como personas mientras no conste quién publica sus enlaces.');
  });

  it('sin ningún corte llegado, lo dice', () => {
    const informe = texto(leer({}, { cortes: [] }));
    expect(informe).toContain('Ningún corte de CORTES_DE_SM8 ha llegado: la serie va entera, sin partir.');
    expect(informe).toContain('SM-8 (CORTES_DE_SM8): ningún corte ha llegado todavía');
  });
});

describe('Historia 23.10 — SM-12', () => {
  const partes: Partes = {
    vistasYLecturas: [
      lectura(D1, '/cita/una/', 3, { via: 'whatsapp' }),
      lectura(D1, '/cita/dos/', 2, { via: 'instagram-historia' }),
      lectura(D1, '/cita/una/', 1, { via: 'opaco' }),
      lectura(D1, '/cita/una/', 1, { via: 'facebook' }),
    ],
    acciones: [
      accion(D1, '/cita/una/', EVENTOS.comparticionDeEnlace, 2, { destino: 'whatsapp' }),
      accion(D1, '/cita/una/', EVENTOS.comparticionDeEnlace, 4, { destino: 'whatsapp', primera: 'no' }),
      accion(D1, '/cita/una/', EVENTOS.comparticionDeImagen, 1, { destino: 'instagram-historia' }),
      accion(D1, '/cita/una/', EVENTOS.descargaDeImagen, 3, { destino: 'instagram-historia', primera: 'no' }),
      accion(D1, '/cita/una/', EVENTOS.comparticionDeEnlace, 2, { destino: 'opaco' }),
      accion(D1, '/cita/una/', EVENTOS.comparticionDeImagen, 5, { destino: 'opaco' }), // la Imagen cuadrada
      accion(D1, '/cita/una/', EVENTOS.descargaDeImagen, 7, { destino: 'opaco', primera: 'no' }), // nunca
      accion(D1, '/cita/una/', EVENTOS.comparticionDeEnlace, 1, { destino: 'facebook' }),
    ],
  };
  const destinos = (l: LecturaDeMedicion) => {
    expect('faltan' in l.sm12).toBe(false);
    return (l.sm12 as { destinos: { destino: string; tasa: Tasa; fuera?: string }[]; imagenCuadrada?: number });
  };

  it('lecturas con via entre las comparticiones de su destino, sin mirar primera; la Historia con sus descargas; la cuadrada aparte', () => {
    const sm12 = destinos(leer(partes));
    const de = (d: string) => sm12.destinos.find((x) => x.destino === d)!;
    expect(de('whatsapp').tasa).toEqual(calculada(3, 6));
    expect(de('instagram-historia').tasa).toEqual(calculada(2, 4));
    expect(de('opaco').tasa).toEqual(calculada(1, 2));
    expect(de('telegram').tasa).toEqual({ estado: 'sin-denominador', numerador: 0 });
    expect(sm12.imagenCuadrada).toBe(5);
    const informe = texto(leer(partes));
    expect(informe).toContain('En Chrome para Android la cifra puede quedar por encima de la real, y puede pasar de uno.');
    expect(informe).toContain('La Imagen cuadrada (comparticion-de-imagen con destino opaco), fuera de todo destino: 5.');
  });

  it('Facebook fuera de la comparación con SM12_CON_FACEBOOK apagada, y dentro encendida', () => {
    const apagada = destinos(leer(partes, { conFacebook: false })).destinos.find((d) => d.destino === 'facebook')!;
    expect(apagada.tasa).toEqual(calculada(1, 1));
    expect(apagada.fuera).toMatch(/fuera de la comparación mientras SM12_CON_FACEBOOK esté apagada/);
    const encendida = destinos(leer(partes, { conFacebook: true })).destinos.find((d) => d.destino === 'facebook')!;
    expect(encendida.fuera).toBeUndefined();
  });
});

describe('Historia 23.10 — la Página de Cita, la portada y la Obra', () => {
  const l = leer({
    vistasYLecturas: [lectura(D1, '/cita/una/', 10), lectura(D1, '/', 4), lectura(D1, '/obra/a/b/', 2)],
    salidas: [salida(D1, '/cita/una/', 'atribucion', 3), salida(D1, '/cita/una/', 'rutas-de-salida', 1), salida(D1, '/', 'cita-del-dia', 2)],
    acciones: [
      accion(D1, '/cita/una/', EVENTOS.copiado, 2),
      accion(D1, '/cita/una/', EVENTOS.copiado, 3, { primera: 'no' }), // no es la primera
      accion(D1, '/cita/una/', EVENTOS.descargaDeImagen, 1), // elegida: cuenta
      accion(D1, '/cita/una/', EVENTOS.descargaDeImagen, 4, { destino: 'opaco', primera: 'no' }), // impuesta: no
      accion(D1, '/cita/una/', EVENTOS.descargaDeImagen, 1, { destino: 'instagram-historia', primera: 'si' }), // con destino: no
      accion(D1, '/cita/una/', EVENTOS.comparticionDeEnlace, 1, { destino: 'whatsapp' }),
      accion(D1, '/cita/una/', EVENTOS.comparticionDeImagen, 1, { destino: 'opaco' }),
      accion(D1, '/cita/una/', EVENTOS.comparticionDeImagen, 2, { destino: 'opaco', primera: 'no' }),
      accion(D1, '/', EVENTOS.copiado, 1),
    ],
  });

  it('SM-5 sin descargas con destino y con primera, SM-7, la continuación y SM-3', () => {
    expect(l.cita).toEqual({
      lecturas: 10,
      conAccion: calculada(3, 10),
      conComparticion: calculada(2, 10),
      continuacion: calculada(4, 10),
      sinContinuacion: calculada(6, 10),
    });
    const informe = texto(l);
    expect(informe).toContain('SM-5, lecturas con su primera acción —copiado o descarga sin destino—: 30,0 % (3 de 10).');
    expect(informe).toContain('SM-7, lecturas con su primera compartición: 20,0 % (2 de 10); cota inferior en Chrome para Android.');
    expect(informe).toContain('SM-3, 1 − la continuación: 60,0 % (6 de 10)');
    expect(informe).toContain('SM-C3: SM-5 30,0 % (3 de 10) junto a SM-7 20,0 % (2 de 10).');
    expect(informe).toContain('SM-C5: la continuación 40,0 % (4 de 10) junto a SM-5 30,0 % (3 de 10).');
  });

  it('la portada y la Obra salen aparte, sin llamarse SM-5 ni SM-7', () => {
    expect(l.portada).toMatchObject({ lecturas: 4, conAccion: calculada(1, 4), continuacion: calculada(2, 4) });
    expect(l.obraTasas).toMatchObject({ lecturas: 2, conAccion: calculada(0, 2) });
    expect(texto(l)).toContain('La portada, aparte y sin llamarse SM-5 ni SM-7: lecturas 4; con acción 25,0 % (1 de 4)');
  });

  it('la continuación por zona, y que es cota inferior', () => {
    expect(superficie(l, 'la Página de Cita').porZona).toEqual([
      { zona: 'atribucion', continuacion: calculada(3, 10) },
      { zona: 'rutas-de-salida', continuacion: calculada(1, 10) },
    ]);
    expect(texto(l)).toContain('La continuación es cota inferior: lo que se abre en pestaña nueva no se mide.');
  });

  it('ninguna cifra se compara con las metas en suspenso de SM-3 a SM-7', () => {
    const lineas = lineasDeLecturaDeMedicion(l);
    // La única línea que nombra las metas es la que dice que están en suspenso.
    expect(lineas.filter((linea) => /meta/i.test(linea))).toEqual([
      '  Las metas de SM-3 a SM-7 están en suspenso hasta su línea base: ninguna cifra de aquí se compara con ellas.',
    ]);
    // Y ninguna de sus cifras —65 %, 1,8, 3 %, 15 % y 2 %— aparece, con o sin el decimal del informe.
    const metas = /(?<![\d,])(?:65|15|3|2)(?:,0)? %|(?<![\d,])1,8(?![\d])/;
    expect(metas.test('SM-3: 65,0 %'), 'la expresión detecta una meta con el decimal').toBe(true);
    expect(texto(l)).not.toMatch(metas);
  });
});

describe('Historia 23.10 — las búsquedas', () => {
  it('asentadas por tramo y filtros, SM-6, SM-13 en las superficies con búsqueda y las consultas sin resultados', () => {
    const l = leer({
      busquedas: [busqueda(D1, '0', 2), busqueda(D1, '1-9', 6), busqueda(D2, '10-29', 2)],
      salidas: [
        salida(D1, '/buscar/', 'resultado', 3),
        salida(D1, '/buscar/', 'cabecera', 1), // otra zona: no
        salida(D1, '/cita/una/', 'resultado', 5), // una superficie sin búsqueda: no
      ],
      sinResultados: [
        { jornada: D1, ruta: '/buscar/', consulta: 'sene', n: 1 },
        { jornada: D2, ruta: '/buscar/', consulta: 'quevedo', n: 3 },
      ],
    });
    expect(l.busquedas).toMatchObject({
      asentadas: 10,
      porTramo: [
        { tramo: '0', n: 2 },
        { tramo: '1-9', n: 6 },
        { tramo: '10-29', n: 2 },
      ],
      porFiltros: [{ filtros: 'ninguno', n: 10 }],
      sm6: calculada(2, 10),
      sm13: calculada(3, 10),
      sinResultados: [
        { consulta: 'quevedo', n: 3 },
        { consulta: 'sene', n: 1 },
      ],
    });
    const informe = texto(l);
    expect(informe).toContain('SM-6 y SM-13 no se comparan por firma: la búsqueda asentada no lleva tiempo mínimo ni marca, y /buscar/ no emite vista.');
    expect(informe).toMatch(/SM-13, salidas desde un resultado: 30,0 % \(3 de 10\); cota inferior/);
    expect(informe).toContain('Consultas sin resultados (FR-8), por recuento: «quevedo» 3, «sene» 1.');
  });
});

describe('Historia 23.10 — las líneas base', () => {
  const lecturasDeCita = (porDia: number, dias = DIAS) => dias.map((dia) => lectura(dia, '/cita/una/', porDia));
  const deCita = (l: LecturaDeMedicion) => l.lineasBase.find((b) => b.unidad === UNIDAD_DE_LA_PAGINA_DE_CITA)!;

  it('sin mínimo declarado no se cierra nunca', () => {
    const l = leer({ vistasYLecturas: lecturasDeCita(120) }, { minimo: undefined });
    expect(deCita(l)).toMatchObject({ estado: 'sin-minimo', desde: D1, acumulado: 1200 });
    expect(texto(l)).toContain('la Página de Cita: sin mínimo declarado: 1200 lecturas desde el 2026-11-02; no se cierra.');
    expect(texto(l)).toContain('Líneas base (MIN_LECTURAS_DE_LINEA_BASE: sin mínimo declarado; ninguna se cierra)');
  });

  it('abierta mientras no reúne el mínimo', () => {
    const l = leer({ vistasYLecturas: lecturasDeCita(10) }, { minimo: 300 });
    expect(deCita(l)).toMatchObject({ estado: 'abierta', acumulado: 100, minimo: 300 });
    expect(texto(l)).toContain('la Página de Cita: abierta desde el 2026-11-02: 100 de 300 lecturas.');
  });

  it('cerrada la jornada en que reúne el mínimo, y nunca «buena»', () => {
    const l = leer({ vistasYLecturas: lecturasDeCita(120) }, { minimo: 300 });
    expect(deCita(l)).toMatchObject({ estado: 'cerrada', cerradaEl: D3, acumulado: 360, jornadas: [D1, D2, D3] });
    const lineas = lineasDeLecturaDeMedicion(l);
    const suya = lineas.find((linea) => linea.startsWith('  la Página de Cita: cerrada'))!;
    expect(suya).toBe('  la Página de Cita: cerrada el 2026-11-04, desde el 2026-11-02, con 360 lecturas.');
    expect(suya).not.toMatch(/buena/);
    expect(lineas).toContain(
      '  «Cerrada» dice que reunió el mínimo, nunca que sea buena: la da por buena Héctor, y lo anota en DESPLIEGUE.md §3.',
    );
  });

  it('la de las búsquedas se cierra con búsquedas asentadas', () => {
    const l = leer({ busquedas: DIAS.map((dia) => busqueda(dia, '1-9', 50)) }, { minimo: 120 });
    expect(l.lineasBase.find((b) => b.unidad === UNIDAD_DE_LAS_BUSQUEDAS)).toMatchObject({
      serie: 'busqueda',
      estado: 'cerrada',
      cerradaEl: D3,
      acumulado: 150,
    });
  });

  it('sin ningún corte de su serie no ha empezado, y nombra DESPLIEGUE_DE_LA_LECTURA', () => {
    const l = leer({ vistasYLecturas: lecturasDeCita(120) }, { cortes: [], minimo: 300 });
    expect(deCita(l).estado).toBe('no-ha-empezado');
    expect(texto(l)).toMatch(/la Página de Cita: no ha empezado: .*DESPLIEGUE_DE_LA_LECTURA/);
  });

  it('salta las jornadas de llegada de los juicios de su unidad', () => {
    const juicio: JuicioPorVentanas = { ...JUICIOS_POR_VENTANAS[0], llegada: D2 };
    const l = leer({ vistasYLecturas: lecturasDeCita(120) }, { minimo: 300, juicios: [juicio] });
    expect(deCita(l)).toMatchObject({ estado: 'cerrada', cerradaEl: D4, saltadas: [D2], jornadas: [D1, D3, D4] });
  });
});

describe('Historia 23.10 — las firmas', () => {
  it('Threads: el par con dos vistas con su marca y una sin ella, frente al resto', () => {
    const l = leer({
      vistasYLecturas: [
        vista(D1, '/cita/una/', EVENTOS.vistaDeCita, 2, { origen: 'threads' }),
        vista(D1, '/cita/una/', EVENTOS.vistaDeCita, 1),
        lectura(D1, '/cita/una/', 1),
        // Con otra marca además: no es la firma.
        vista(D2, '/cita/una/', EVENTOS.vistaDeCita, 2, { origen: 'threads' }),
        vista(D2, '/cita/una/', EVENTOS.vistaDeCita, 1),
        vista(D2, '/cita/una/', EVENTOS.vistaDeCita, 1, { origen: 'x' }),
        lectura(D2, '/cita/una/', 2),
        vista(D1, '/cita/dos/', EVENTOS.vistaDeCita, 4),
        lectura(D1, '/cita/dos/', 3),
      ],
    });
    const [threads] = l.lineasBase.find((b) => b.unidad === UNIDAD_DE_LA_PAGINA_DE_CITA)!.firmas!;
    expect(threads).toMatchObject({ firma: 'Threads', pares: 1, lecturas: 1, vistas: 3, restoPares: 2, restoLecturas: 5, restoVistas: 8 });
    expect(texto(l)).toContain(
      'Firma Threads: lecturas/vistas 0,33 (1 lecturas / 3 vistas, 1 pares) frente al resto 0,63 (5 lecturas / 8 vistas, 2 pares).',
    );
  });

  it('ráfaga: la jornada en que el umbral de rutas de Cita o más tienen una sola vista; en otras unidades no aplica', () => {
    const l = leer(
      {
        vistasYLecturas: [
          vista(D1, '/cita/una/', EVENTOS.vistaDeCita, 1),
          vista(D1, '/cita/dos/', EVENTOS.vistaDeCita, 1),
          // La misma jornada, una ruta de Autor con una vista: no es de la Página de Cita.
          vista(D1, '/autor/a/', EVENTOS.vistaDeSuperficie, 1),
          // Otra jornada, una sola ruta de Cita con una vista: por debajo del umbral.
          vista(D2, '/cita/una/', EVENTOS.vistaDeCita, 1),
          vista(D2, '/cita/dos/', EVENTOS.vistaDeCita, 3),
          lectura(D2, '/cita/dos/', 3),
        ],
      },
      { minRutasEnRafaga: 2 },
    );
    const [, rafaga] = l.lineasBase.find((b) => b.unidad === UNIDAD_DE_LA_PAGINA_DE_CITA)!.firmas!;
    expect(rafaga).toMatchObject({ firma: 'ráfaga', aplica: true, pares: 2, lecturas: 0, vistas: 2, jornadas: [D1], restoPares: 2 });
    const [, deAutor] = l.lineasBase.find((b) => b.unidad === 'la Página de Autor')!.firmas!;
    expect(deAutor).toMatchObject({ firma: 'ráfaga', aplica: false });
    expect(texto(l)).toContain('Firma ráfaga: no aplica.');
  });

  it('sin pares con la firma, se dice', () => {
    const l = leer({ vistasYLecturas: [vista(D1, '/cita/una/', EVENTOS.vistaDeCita, 3), lectura(D1, '/cita/una/', 1)] });
    expect(texto(l)).toContain('Firma Threads: ningún par (ruta, jornada) la tiene.');
  });

  it('las vistas de una carga: la Obra indexable con dos vistas cuenta una carga', () => {
    const l = leer({
      vistasYLecturas: [
        vista(D1, '/obra/a/b/', EVENTOS.vistaDeSuperficie, 2, { origen: 'threads' }),
        vista(D1, '/obra/a/b/', EVENTOS.vistaDeObra, 2, { origen: 'threads', indexable: 'indexable' }),
        vista(D1, '/obra/a/b/', EVENTOS.vistaDeSuperficie, 1),
        vista(D1, '/obra/a/b/', EVENTOS.vistaDeObra, 1, { indexable: 'indexable' }),
        lectura(D1, '/obra/a/b/', 2),
      ],
    });
    expect(superficie(l, 'la Página de Obra').vistas).toBe(3);
    const [threads] = l.lineasBase.find((b) => b.unidad === 'la Página de Obra')!.firmas!;
    expect(threads).toMatchObject({ pares: 1, vistas: 3, lecturas: 2 });
  });
});

describe('Historia 23.10 — las ventanas', () => {
  const SM_C3: JuicioPorVentanas = JUICIOS_POR_VENTANAS.find((j) => j.nombre === 'SM-C3')!;
  /**
   * 120 lecturas de Cita al día. En la línea base —días 1 a 3— el 10 % copia y el 5 % comparte;
   * después, el 5 % copia y el 10 % comparte: SM-7 sube y SM-5 baja.
   */
  function partesDeVentanas(): Partes {
    return {
      vistasYLecturas: DIAS.map((dia) => lectura(dia, '/cita/una/', 120)),
      acciones: DIAS.flatMap((dia, i) => [
        accion(dia, '/cita/una/', EVENTOS.copiado, i < 3 ? 12 : 6),
        accion(dia, '/cita/una/', EVENTOS.comparticionDeEnlace, i < 3 ? 6 : 12, { destino: 'whatsapp' }),
      ]),
    };
  }

  it('bloques de jornadas consecutivas desde el cierre, con el mínimo cada uno; la dirección y «salta» en dos seguidas', () => {
    const l = leer(partesDeVentanas(), { minimo: 300, juicios: [SM_C3] });
    const [juicio] = l.juicios;
    expect(juicio.referencia).toBe('linea-base');
    expect(juicio.referencias).toEqual([
      { tasa: 'SM-7', valor: calculada(18, 360) },
      { tasa: 'SM-5', valor: calculada(36, 360) },
    ]);
    expect(juicio.ventanas.map((v) => [v.desde, v.hasta, v.acumulado])).toEqual([
      ['2026-11-05', '2026-11-07', 360],
      ['2026-11-08', '2026-11-10', 360],
    ]);
    expect(juicio.ventanas[0].tasas).toEqual([
      { tasa: 'SM-7', valor: calculada(36, 360), direccion: 'sube' },
      { tasa: 'SM-5', valor: calculada(18, 360), direccion: 'baja' },
    ]);
    expect(juicio.ventanas.map((v) => v.senal)).toEqual(['se da', 'salta']);
    expect(juicio.enCurso).toEqual({ desde: '2026-11-11', acumulado: 120 });
    const informe = texto(l);
    expect(informe).toContain('2026-11-05 – 2026-11-07 (360): SM-7 10,0 % (36 de 360), sube; SM-5 5,0 % (18 de 360), baja; la señal se da.');
    expect(informe).toContain('la señal salta.');
    expect(informe).toContain('En curso desde el 2026-11-11: 120 de 300.');
    expect(informe).toContain('que una señal salte no apaga nada');
  });

  it('una llegada anterior al cierre: desde la jornada siguiente, sin la de llegada, frente a la serie propia de antes', () => {
    const juicio: JuicioPorVentanas = { ...SM_C3, llegada: D2, deDondeLlega: 'DE_PRUEBA' };
    const l = leer(partesDeVentanas(), { minimo: 300, juicios: [juicio] });
    const [leido] = l.juicios;
    expect(leido.referencia).toBe('serie-de-antes');
    // La referencia es la tasa del tramo antes de la llegada: el día 1.
    expect(leido.referencias).toEqual([
      { tasa: 'SM-7', valor: calculada(6, 120) },
      { tasa: 'SM-5', valor: calculada(12, 120) },
    ]);
    expect(leido.ventanas.map((v) => [v.desde, v.hasta])).toEqual([
      ['2026-11-04', '2026-11-06'],
      ['2026-11-07', '2026-11-09'],
    ]);
    // La jornada de llegada no está en ninguna ventana.
    expect(leido.ventanas.some((v) => v.desde <= D2 && D2 <= v.hasta)).toBe(false);
    expect(texto(l)).toContain('frente a la serie propia de antes');
    // La serie de antes no tiene por qué reunir el mínimo, y si no lo reúne se dice.
    expect(leido.referenciaAcumulada).toBe(120);
    expect(texto(l)).toContain('La serie de antes reúne 120 lecturas, por debajo del mínimo de una ventana (300)');
  });

  it('una llegada después del cierre corta el bloque en curso: ninguna ventana junta días de los dos lados', () => {
    // La línea base se cierra el 2026-11-04; la llegada, el 2026-11-06.
    const llegada = '2026-11-06';
    const l = leer(partesDeVentanas(), { minimo: 300, juicios: [{ ...SM_C3, llegada, deDondeLlega: 'DE_PRUEBA' }] });
    const [leido] = l.juicios;
    expect(leido.referencia).toBe('linea-base');
    expect(leido.cortadas).toEqual([{ desde: '2026-11-05', hasta: '2026-11-05', acumulado: 120, por: llegada }]);
    expect(leido.ventanas.map((v) => [v.desde, v.hasta, v.acumulado])).toEqual([['2026-11-07', '2026-11-09', 360]]);
    expect(leido.ventanas.some((v) => v.desde <= llegada && llegada <= v.hasta)).toBe(false);
    expect(leido.enCurso).toEqual({ desde: '2026-11-10', acumulado: 240 });
    expect(texto(l)).toContain(
      '2026-11-05 – 2026-11-05 (120): cortada por el cambio del 2026-11-06 sin reunir el mínimo; no se juzga',
    );
  });

  it('SM-C5: la continuación sube y SM-5 baja, con las salidas leídas: «se da» y «salta»', () => {
    const SM_C5 = JUICIOS_POR_VENTANAS.find((j) => j.nombre === 'SM-C5')!;
    const l = leer(
      {
        vistasYLecturas: DIAS.map((dia) => lectura(dia, '/cita/una/', 120)),
        // La línea base, días 1 a 3: 10 % de continuación y 10 % de SM-5; después, 30 % y 5 %.
        salidas: DIAS.map((dia, i) => salida(dia, '/cita/una/', 'atribucion', i < 3 ? 12 : 36)),
        acciones: DIAS.map((dia, i) => accion(dia, '/cita/una/', EVENTOS.copiado, i < 3 ? 12 : 6)),
      },
      { minimo: 300, juicios: [{ ...SM_C5, llegada: undefined }] },
    );
    const [juicio] = l.juicios;
    expect(juicio.referencias).toEqual([
      { tasa: 'continuación', valor: calculada(36, 360) },
      { tasa: 'SM-5', valor: calculada(36, 360) },
    ]);
    expect(juicio.ventanas[0].tasas).toEqual([
      { tasa: 'continuación', valor: calculada(108, 360), direccion: 'sube' },
      { tasa: 'SM-5', valor: calculada(18, 360), direccion: 'baja' },
    ]);
    expect(juicio.ventanas.map((v) => v.senal)).toEqual(['se da', 'salta']);
  });

  it('la continuación de la portada por zona: una tasa por zona, cada una con solo sus salidas', () => {
    const PORTADA = JUICIOS_POR_VENTANAS.find((j) => j.nombre === 'la continuación de la portada por zona')!;
    const l = leer(
      {
        vistasYLecturas: DIAS.map((dia) => lectura(dia, '/', 120)),
        salidas: DIAS.flatMap((dia, i) => [
          salida(dia, '/', 'cita-del-dia', i < 3 ? 12 : 24),
          salida(dia, '/', 'autores-de-portada', 6),
          // La misma zona en otra superficie no es de la portada.
          salida(dia, '/cita/una/', 'cita-del-dia', 50),
        ]),
      },
      { minimo: 300, juicios: [{ ...PORTADA, llegada: undefined }] },
    );
    const [juicio] = l.juicios;
    expect(juicio.referencias).toEqual([
      { tasa: 'continuación desde autores-de-portada', valor: calculada(18, 360) },
      { tasa: 'continuación desde cita-del-dia', valor: calculada(36, 360) },
    ]);
    expect(juicio.ventanas[0].tasas).toEqual([
      { tasa: 'continuación desde autores-de-portada', valor: calculada(18, 360), direccion: 'igual' },
      { tasa: 'continuación desde cita-del-dia', valor: calculada(72, 360), direccion: 'sube' },
    ]);
  });

  it('la continuación de la portada por zona, sin las salidas: no hay zonas, y se nombra lo que falta', () => {
    const PORTADA = JUICIOS_POR_VENTANAS.find((j) => j.nombre === 'la continuación de la portada por zona')!;
    const l = leer(
      { vistasYLecturas: DIAS.map((dia) => lectura(dia, '/', 120)), salidas: 'D1_ERROR' },
      { minimo: 300, juicios: [{ ...PORTADA, llegada: undefined }] },
    );
    expect(l.juicios[0].sinVentanas).toBe('sin leer: las salidas internas');
  });

  it('SM-6 y SM-13, sobre las búsquedas asentadas, frente a su línea base', () => {
    const SM_6 = JUICIOS_POR_VENTANAS.find((j) => j.nombre === 'SM-6')!;
    const SM_13 = JUICIOS_POR_VENTANAS.find((j) => j.nombre === 'SM-13')!;
    const l = leer(
      {
        // 50 asentadas al día: el tramo 0, el 20 % en la línea base y el 40 % después.
        busquedas: DIAS.flatMap((dia, i) => [busqueda(dia, '0', i < 3 ? 10 : 20), busqueda(dia, '1-9', i < 3 ? 40 : 30)]),
        // Las salidas desde un resultado de /buscar/: 20 % y después 50 %. Las de otra superficie, no.
        salidas: DIAS.flatMap((dia, i) => [
          salida(dia, '/buscar/', 'resultado', i < 3 ? 10 : 25),
          salida(dia, '/cita/una/', 'resultado', 40),
        ]),
      },
      { minimo: 150, juicios: [{ ...SM_6, llegada: undefined }, { ...SM_13, llegada: undefined }] },
    );
    const [sm6, sm13] = l.juicios;
    expect(sm6.referencias).toEqual([{ tasa: 'SM-6', valor: calculada(30, 150) }]);
    expect(sm6.ventanas[0]).toMatchObject({
      desde: '2026-11-05',
      hasta: '2026-11-07',
      acumulado: 150,
      tasas: [{ tasa: 'SM-6', valor: calculada(60, 150), direccion: 'sube' }],
    });
    expect(sm13.referencias).toEqual([{ tasa: 'SM-13', valor: calculada(30, 150) }]);
    expect(sm13.ventanas[0].tasas).toEqual([{ tasa: 'SM-13', valor: calculada(75, 150), direccion: 'sube' }]);
  });

  describe('Historia 27.9 — SM-6 y SM-13, contadas desde la llegada de la búsqueda con filtros', () => {
    const SM_6 = JUICIOS_POR_VENTANAS.find((j) => j.nombre === 'SM-6')!;
    const SM_13 = JUICIOS_POR_VENTANAS.find((j) => j.nombre === 'SM-13')!;
    /** 50 asentadas al día; el tramo 0 y las salidas desde un resultado suben tras los tres primeros días. */
    const partes = (): Partes => ({
      busquedas: DIAS.flatMap((dia, i) => [busqueda(dia, '0', i < 3 ? 10 : 20), busqueda(dia, '1-9', i < 3 ? 40 : 30)]),
      salidas: DIAS.map((dia, i) => salida(dia, '/buscar/', 'resultado', i < 3 ? 10 : 25)),
    });

    it('la tabla lee la constante de despliegue de la 27, sin copiar su valor', () => {
      for (const juicio of [SM_6, SM_13]) {
        expect(juicio.unidad).toBe(UNIDAD_DE_LAS_BUSQUEDAS);
        expect(juicio.llegada).toBe(DESPLIEGUE_DE_LA_BUSQUEDA_CON_FILTROS);
        expect(juicio.deDondeLlega).toBe('DESPLIEGUE_DE_LA_BUSQUEDA_CON_FILTROS');
      }
      const fuente = readFileSync(resolve(RAIZ, 'tools/lib/lineaBase.ts'), 'utf8');
      expect(fuente.match(/llegada: DESPLIEGUE_DE_LA_BUSQUEDA_CON_FILTROS,/g)).toHaveLength(2);
    });

    it('con valor: la primera ventana empieza la jornada siguiente a la llegada, que no entra en ninguna y se informa como «cambió»', () => {
      const llegada = D2; // 2026-11-03, antes del cierre de la línea base de las búsquedas.
      const l = leer(partes(), { minimo: 150, juicios: [{ ...SM_6, llegada }, { ...SM_13, llegada }] });
      const base = l.lineasBase.find((b) => b.unidad === UNIDAD_DE_LAS_BUSQUEDAS)!;
      expect(base.saltadas).toEqual([llegada]);
      expect(base.jornadas).not.toContain(llegada);
      const [sm6, sm13] = l.juicios;
      for (const juicio of [sm6, sm13]) {
        expect(juicio.referencia).toBe('serie-de-antes');
        expect(juicio.ventanas.map((v) => [v.desde, v.hasta, v.acumulado])).toEqual([
          ['2026-11-04', '2026-11-06', 150],
          ['2026-11-07', '2026-11-09', 150],
        ]);
        expect(juicio.ventanas.some((v) => v.desde <= llegada && llegada <= v.hasta)).toBe(false);
      }
      // La serie de antes es la jornada anterior a la llegada.
      expect(sm6.referencias).toEqual([{ tasa: 'SM-6', valor: calculada(10, 50) }]);
      expect(sm6.ventanas[0].tasas).toEqual([{ tasa: 'SM-6', valor: calculada(50, 150), direccion: 'sube' }]);
      expect(sm13.referencias).toEqual([{ tasa: 'SM-13', valor: calculada(10, 50) }]);
      expect(sm13.ventanas[0].tasas).toEqual([{ tasa: 'SM-13', valor: calculada(60, 150), direccion: 'sube' }]);
      const informe = texto(l);
      expect(informe).toContain(`No cuentan, porque cambiaron: ${llegada}.`);
      expect(informe).toContain('frente a la serie propia de antes');
    });

    it('sin valor no cuenta nada desde ella: ninguna jornada se salta y las ventanas cuentan desde el cierre de la línea base', () => {
      const l = leer(partes(), { minimo: 150, juicios: [{ ...SM_6, llegada: undefined }, { ...SM_13, llegada: undefined }] });
      const base = l.lineasBase.find((b) => b.unidad === UNIDAD_DE_LAS_BUSQUEDAS)!;
      expect(base).toMatchObject({ estado: 'cerrada', cerradaEl: D3, saltadas: [] });
      for (const juicio of l.juicios) {
        expect(juicio.referencia).toBe('linea-base');
        expect(juicio.ventanas[0]).toMatchObject({ desde: '2026-11-05', hasta: '2026-11-07' });
        expect(juicio.ventanas.every((v) => v.antesDeLaLlegada === undefined)).toBe(true);
      }
      expect(texto(l)).not.toContain('No cuentan, porque cambiaron');
    });
  });

  it('los Directorios: la línea base empieza tras la llegada que los hace medibles, y las ventanas se juzgan frente a ella', () => {
    const DIRECTORIOS = JUICIOS_POR_VENTANAS.find((j) => j.nombre === 'la continuación de los Directorios')!;
    // Historias 26.3 y 26.4 — los dos Directorios ya la declaran en `SUPERFICIES`.
    const superficies = SUPERFICIES;
    const censo = [...CENSO, '/autores/', '/obras/'];
    const llegada = D2; // 2026-11-03: los Directorios no existen antes.
    const despues = DIAS.slice(2);
    const partes: Partes = {
      vistasYLecturas: despues.flatMap((dia) => [lectura(dia, '/autores/', 60), lectura(dia, '/obras/', 60)]),
      // 10 % de continuación en la línea base (días 3 a 5) y 30 % después.
      salidas: despues.map((dia, i) => salida(dia, '/autores/', 'directorio', i < 3 ? 12 : 36)),
    };
    const l = leer(partes, { superficies, minimo: 300, juicios: [{ ...DIRECTORIOS, llegada }] }, censo);
    const base = l.lineasBase.find((b) => b.unidad === DIRECTORIOS.unidad)!;
    expect(base).toMatchObject({ estado: 'cerrada', desde: '2026-11-04', cerradaEl: '2026-11-06', acumulado: 360 });
    const [juicio] = l.juicios;
    expect(juicio.referencia).toBe('linea-base');
    expect(juicio.referencias).toEqual([{ tasa: 'continuación', valor: calculada(36, 360) }]);
    expect(juicio.ventanas.map((v) => [v.desde, v.hasta, v.tasas[0].direccion])).toEqual([['2026-11-07', '2026-11-09', 'sube']]);

    // Sin la llegada todavía, la línea base no ha empezado, y dice qué espera.
    const sinLlegada = leer(partes, { superficies, minimo: 300, juicios: [{ ...DIRECTORIOS, llegada: undefined }] }, censo);
    expect(sinLlegada.lineasBase.find((b) => b.unidad === DIRECTORIOS.unidad)).toMatchObject({
      estado: 'no-ha-empezado',
      esperando: 'DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS',
    });
    expect(sinLlegada.juicios[0].sinVentanas).toBe(
      'la línea base no ha empezado: espera DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS, la llegada que la hace medible',
    );
    expect(texto(sinLlegada)).toContain(
      'los Directorios (el Directorio de Autores y el Directorio de Obras): no ha empezado: empieza la primera jornada UTC completa tras ' +
        'DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS, la llegada que la hace medible.',
    );
  });

  it('sin mínimo no hay ventanas, y se dice', () => {
    const l = leer(partesDeVentanas(), { minimo: undefined, juicios: [SM_C3] });
    expect(l.juicios[0].sinVentanas).toMatch(/sin mínimo declarado/);
    expect(l.juicios[0].ventanas).toEqual([]);
  });

  it('sin referencia, no hay dirección', () => {
    // Las acciones no se leyeron: ninguna tasa de SM-C3 tiene numerador.
    const l = leer({ ...partesDeVentanas(), acciones: 'D1_ERROR' }, { minimo: 300, juicios: [SM_C3] });
    expect(l.juicios[0].ventanas[0].tasas.every((t) => t.direccion === undefined)).toBe(true);
    expect(texto(l)).toMatch(/Referencia: SM-7 sin referencia \(sin leer \(las acciones\)\)/);
  });

  it('los Directorios, sin superficie que los declare, dicen que entran con la 26', () => {
    // Desde la 26.3 los declara `/autores/`: el caso se mide sobre un censo que no los tiene.
    const sinDirectorios = SUPERFICIES.filter((s) => s.lineaBase === undefined);
    const l = leer({}, { superficies: sinDirectorios, minimo: 300, juicios: JUICIOS_POR_VENTANAS });
    const directorios = l.juicios.find((j) => j.juicio.nombre === 'la continuación de los Directorios')!;
    expect(directorios.sinVentanas).toBe('sin lecturas: los Directorios entran con la 26');
  });

  it('la dirección se compara sin dividir', () => {
    expect(direccionDe(calculada(1, 3), calculada(2, 6))).toBe('igual');
    expect(direccionDe(calculada(2, 5), calculada(1, 3))).toBe('sube');
    expect(direccionDe({ estado: 'sin-denominador', numerador: 1 }, calculada(1, 3))).toBeUndefined();
  });
});

describe('Historia 23.10 — revisión: lo que la primera pasada dejaba sin decir', () => {
  it('un corte de ayer: el tramo vigente empieza hoy y aún no tiene jornadas, y no se confunde con dos llegadas seguidas', () => {
    const ayer = '2026-11-11';
    const l = leer({}, { cortes: [{ ...CORTE_23, jornada: ayer }], minimo: 300 });
    expect(l.series.lectura.vigente).toEqual({ numero: 2, desde: HOY, hasta: ayer });
    const informe = texto(l);
    expect(informe).toContain('Vigente: tramo 2 (empieza el 2026-11-12: aún no tiene ninguna jornada cerrada)');
    expect(informe).not.toContain('dos llegadas seguidas');
    expect(informe).toContain(
      'la Página de Cita: abierta: empieza el 2026-11-12 y aún no tiene ninguna jornada cerrada (mínimo: 300 lecturas).',
    );
    // Dos llegadas en días seguidos sí dejan un tramo vacío entre ellas.
    const seguidas = leer({}, { cortes: [{ ...CORTE_23, jornada: '2026-11-05' }, { ...CORTE_23, jornada: '2026-11-06', que: 'otra' }] });
    expect(texto(seguidas)).toContain('tramo 2 (vacío: dos llegadas seguidas)');
  });

  it('la consulta que tecleó un visitante sale sin caracteres de control ni de dirección', () => {
    const l = leer({ sinResultados: [{ jornada: D1, ruta: '/buscar/', consulta: 'a\u001b[31mb\nc‮d', n: 2 }] });
    const informe = texto(l);
    expect(informe).toContain('«a�[31mb�c�d» 2');
    expect(informe).not.toMatch(/[\u0000-\u0009\u000b-\u001f\u007f‮]/);
    expect(legible('sin nada raro: «Séneca»')).toBe('sin nada raro: «Séneca»');
  });

  it('cada superficie con lectura se informa, también a cero; las de servicio no tienen continuación', () => {
    const l = leer({});
    expect(l.superficies.map((s) => s.nombre)).not.toContain('la búsqueda');
    expect(l.superficies.map((s) => s.nombre)).not.toContain('la página 404');
    const informe = texto(l);
    expect(informe).toContain(
      'la Página de Autor: vistas 0, lecturas 0, salidas 0, acciones 0; continuación sin denominador (0 sobre ninguna).',
    );
    expect(informe).toContain('sin marca: vistas de Obra 0, lecturas 0, salidas 0, acciones 0;');
    // Sin las salidas, la superficie sigue saliendo, con lo que no se leyó nombrado.
    expect(texto(leer({ salidas: 'D1_ERROR' }))).toContain('la Página de Autor: vistas 0, lecturas 0, salidas sin leer, acciones 0;');
  });

  it('«ya no se publica» dice que junta lo retirado con lo que nunca se publicó', () => {
    const l = leer({ vistasYLecturas: [lectura(D1, '/cita/errata/', 1)] });
    expect(texto(l)).toContain('«ya no se publica» junta lo retirado');
    expect(texto(leer({}))).not.toContain('«ya no se publica» junta');
  });

  it('una pasada en /buscar/ descuenta sus búsquedas y sus consultas sin resultados de esa jornada', () => {
    const l = leer(
      {
        busquedas: [busqueda(D2, '0', 4), busqueda(D1, '0', 1)],
        sinResultados: [
          { jornada: D2, ruta: '/buscar/', consulta: 'prueba de la pasada', n: 3 },
          { jornada: D1, ruta: '/buscar/', consulta: 'sene', n: 1 },
        ],
      },
      { pasadas: [{ pasada: '25.7', jornada: D2, rutas: ['/buscar/'] }] },
    );
    expect(l.busquedas.asentadas).toBe(1);
    expect(l.busquedas.sinResultados).toEqual([{ consulta: 'sene', n: 1 }]);
    expect(l.descuentos.pasadas[0].registros).toBe(7);
  });

  it('lo escrito a mano en umbrales.ts se juzga antes de usarlo, nombrando cada problema', () => {
    expect(esJornadaReal('2026-11-03')).toBe(true);
    for (const mala of ['2026-11-3', '2026-02-30', '2026-13-01', 'mañana', 20261103]) expect(esJornadaReal(mala)).toBe(false);
    const problemas = problemasDeLaLectura({
      cortes: [{ jornada: '2026-11-3', que: 'la 23', series: ['lectura'] }],
      pasadas: [{ pasada: '25.3', jornada: '2026-02-30', rutas: [] }],
      minimo: 0,
      minRutasEnRafaga: 0,
      juicios: [{ ...JUICIOS_POR_VENTANAS[0], llegada: '2026-1-5', deDondeLlega: 'DE_PRUEBA' }],
      superficies: [{ ...SUPERFICIES[0], lineaBase: UNIDAD_DE_LAS_BUSQUEDAS }],
    });
    expect(problemas).toEqual([
      'CORTES_DE_SERIE, «la 23»: «2026-11-3» no es una jornada AAAA-MM-DD que exista.',
      'PASADAS_QUE_ESCRIBEN_EN_PRODUCCION, la 25.3: «2026-02-30» no es una jornada AAAA-MM-DD que exista.',
      'PASADAS_QUE_ESCRIBEN_EN_PRODUCCION, la 25.3: no nombra ninguna ruta, así que no descontaría nada.',
      'MIN_LECTURAS_DE_LINEA_BASE: «0» no es un entero positivo.',
      'MIN_RUTAS_DE_CITA_EN_RAFAGA: «0» no es un entero positivo.',
      'src/lib/superficies.ts no declara ninguna superficie que emita la vista de Cita: la lectura no sabe cuál es la Página de Cita.',
      'DE_PRUEBA (la llegada de SM-C3): «2026-1-5» no es una jornada AAAA-MM-DD que exista.',
      'src/lib/superficies.ts, la portada: su línea base se llama «las búsquedas», la de las búsquedas.',
    ]);
    expect(() => leer({}, { minimo: Number.NaN })).toThrow(/MIN_LECTURAS_DE_LINEA_BASE: «NaN» no es un entero positivo/);
    expect(() => leer({}, { minRutasEnRafaga: 2.5 })).toThrow('MIN_RUTAS_DE_CITA_EN_RAFAGA: «2.5» no es un entero positivo');
    // Una ruta de pasada es un camino que el sitio declara, sin `?…` ni `#…`: otra no casaría con
    // ningún registro, y la pasada contaría como visitas.
    for (const ruta of ['sin-barra', '/cita/una/?via=whatsapp', '/cita/una/#atribucion', '/x-rota']) {
      expect(() => leer({}, { pasadas: [{ pasada: '25.3', jornada: D2, rutas: [ruta] }] }), ruta).toThrow(
        `«${ruta}» no es una ruta del sitio`,
      );
    }
    // Sin la portada declarada, la lectura no sabe su unidad, y lo dice en vez de romper al cargar.
    const sinPortada = SUPERFICIES.filter((superficie) => superficie.reconoce.test('/') === false);
    expect(() => leer({}, { superficies: sinPortada })).toThrow(/no declara la portada \(\/\)/);
  });

  it('los valores que el repositorio declara hoy se sostienen', () => {
    expect(problemasDeLaLectura(valoresDeLaLectura())).toEqual([]);
  });

  it('sin opciones, la lectura lee los valores de src/lib/umbrales.ts: los cortes, las pasadas, el mínimo, la ráfaga y Facebook', async () => {
    vi.resetModules();
    vi.doMock('../../src/lib/umbrales.ts', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../../src/lib/umbrales.ts')>()),
      CORTES_DE_SERIE: [CORTE_23],
      PASADAS_QUE_ESCRIBEN_EN_PRODUCCION: [{ pasada: '25.3', jornada: D2, rutas: ['/cita/una/'] }],
      MIN_LECTURAS_DE_LINEA_BASE: 10,
      MIN_RUTAS_DE_CITA_EN_RAFAGA: 1,
      SM12_CON_FACEBOOK: true,
    }));
    try {
      const conValores = await import('../../tools/lib/lineaBase.ts');
      const l = conValores.componerLecturaDeMedicion({
        hoy: HOY,
        censo: CENSO,
        consultas: consultas({
          vistasYLecturas: [lectura(D1, '/cita/una/', 12), lectura(D2, '/cita/una/', 5), vista(D1, '/cita/dos/', EVENTOS.vistaDeCita, 1)],
          acciones: [accion(D1, '/cita/una/', EVENTOS.comparticionDeEnlace, 1, { destino: 'facebook' })],
        }),
        cuota: CUOTA,
        gasto: GASTO,
      });
      expect(l.series.lectura.vigente.desde).toBe(D1);
      expect(l.descuentos.pasadas).toEqual([{ pasada: '25.3', jornada: D2, rutas: ['/cita/una/'], registros: 5 }]);
      expect(l.minimo).toBe(10);
      const deCita = l.lineasBase.find((b) => b.unidad === UNIDAD_DE_LA_PAGINA_DE_CITA)!;
      expect(deCita).toMatchObject({ estado: 'cerrada', cerradaEl: D1 });
      // Con el umbral de la ráfaga en una ruta, la jornada con una sola ruta de una vista es ráfaga.
      expect(deCita.firmas?.find((f) => f.firma === 'ráfaga')).toMatchObject({ aplica: true, jornadas: [D1] });
      const sm12 = l.sm12 as Exclude<LecturaDeMedicion['sm12'], { faltan: unknown }>;
      expect(sm12.destinos.find((d) => d.destino === 'facebook')?.fuera).toBeUndefined();
    } finally {
      vi.doUnmock('../../src/lib/umbrales.ts');
      vi.resetModules();
    }
  });

  it('sin opciones, la tabla de juicios es JUICIOS_POR_VENTANAS, y Facebook queda fuera o dentro según la constante', () => {
    const l = componerLecturaDeMedicion({ hoy: HOY, censo: CENSO, consultas: consultas({}), cuota: CUOTA, gasto: GASTO });
    expect(l.juicios.map((j) => j.juicio.nombre)).toEqual(JUICIOS_POR_VENTANAS.map((j) => j.nombre));
    expect(texto(l)).toMatch(/^ {2}SM-C3 \(la Página de Cita; llegada: /m);
    // La constante es de Héctor (la enciende en la 25.7): la prueba sigue su valor, no lo fija.
    const sm12 = l.sm12 as Exclude<LecturaDeMedicion['sm12'], { faltan: unknown }>;
    const fuera = sm12.destinos.find((d) => d.destino === 'facebook')?.fuera;
    if (SM12_CON_FACEBOOK) expect(fuera).toBeUndefined();
    else expect(fuera).toMatch(/SM12_CON_FACEBOOK/);
  });
});

describe('Historia 23.10 — segunda revisión: lo que una consulta sin leer deja, y los bordes', () => {
  const SM_C3: JuicioPorVentanas = JUICIOS_POR_VENTANAS.find((j) => j.nombre === 'SM-C3')!;

  it('sin las vistas y las lecturas: SM-8, cada línea base, SM-12 y las ventanas salen sin leer, nunca a cero', () => {
    const l = leer(
      {
        vistasYLecturas: 'D1_ERROR: fallo de mentira',
        salidas: [salida(D1, '/cita/una/', 'atribucion', 2)],
        acciones: [accion(D1, '/cita/una/', EVENTOS.copiado, 1)],
        busquedas: DIAS.map((dia) => busqueda(dia, '1-9', 50)),
      },
      { minimo: 120, juicios: [{ ...SM_C3, llegada: undefined }] },
    );
    expect(l.sm8).toEqual({ faltan: ['vistasYLecturas'] });
    expect(l.sm12).toEqual({ faltan: ['vistasYLecturas'] });
    for (const base of l.lineasBase.filter((b) => b.serie === 'lectura')) {
      expect(base, base.unidad).toMatchObject({ estado: 'sin-leer', faltan: ['vistasYLecturas'] });
      expect(base.acumulado, base.unidad).toBeUndefined();
    }
    // La de las búsquedas no depende de ellas, y se cierra.
    expect(l.lineasBase.find((b) => b.unidad === UNIDAD_DE_LAS_BUSQUEDAS)).toMatchObject({ estado: 'cerrada' });
    expect(l.juicios[0].sinVentanas).toBe('sin leer: las vistas y las lecturas');
    const informe = texto(l);
    expect(informe).toMatch(/^SM-8 .*\n {2}Sin leer \(las vistas y las lecturas\)\.$/m);
    expect(informe).toMatch(/^SM-12 .*\n {2}Sin leer \(las vistas y las lecturas\)\.$/m);
    expect(informe).toContain('  la Página de Cita: sin leer (las vistas y las lecturas).');
    expect(informe).toContain('SM-C3 (la Página de Cita; llegada: sin constante todavía: la da la Épica 25): sin leer: las vistas y las lecturas.');
    expect(informe).not.toContain('ninguna vista con marca');
    expect(informe).not.toMatch(/sin mínimo declarado: 0 lecturas|abierta desde el .*: 0 de/);
  });

  it('sin las búsquedas asentadas: las asentadas, SM-6, SM-13 y su línea base salen sin leer', () => {
    const l = leer(
      {
        busquedas: 'D1_ERROR: fallo de mentira',
        salidas: [salida(D1, '/buscar/', 'resultado', 3)],
        sinResultados: [{ jornada: D1, ruta: '/buscar/', consulta: 'sene', n: 1 }],
      },
      { minimo: 120 },
    );
    expect(l.busquedas.asentadas).toBeUndefined();
    expect(l.busquedas.porTramo).toEqual([]);
    expect(l.busquedas.sm6).toEqual({ estado: 'sin-leer', faltan: ['busquedas'] });
    expect(l.busquedas.sm13).toEqual({ estado: 'sin-leer', faltan: ['busquedas'] });
    expect(l.lineasBase.find((b) => b.unidad === UNIDAD_DE_LAS_BUSQUEDAS)).toMatchObject({ estado: 'sin-leer', faltan: ['busquedas'] });
    const informe = texto(l);
    expect(informe).toContain('  Asentadas: sin leer.');
    expect(informe).toContain('  SM-6, en el tramo 0: sin leer (las búsquedas asentadas).');
    expect(informe).toContain('  las búsquedas: sin leer (las búsquedas asentadas).');
    expect(informe).not.toMatch(/Asentadas: 0|sin denominador \(0 sobre ninguna\)\.\n {2}SM-13/);
  });

  it('sin las búsquedas sin resultados: «sin leer», nunca «ninguna»', () => {
    const l = leer({ sinResultados: 'D1_ERROR: fallo de mentira', busquedas: [busqueda(D1, '0', 1)] });
    expect(l.busquedas.sinResultados).toBeUndefined();
    expect(texto(l)).toContain('  Consultas sin resultados (FR-8): sin leer.');
    expect(texto(l)).not.toContain('Consultas sin resultados (FR-8): ninguna.');
    expect(texto(leer({}))).toContain('Consultas sin resultados (FR-8): ninguna.');
  });

  it('lo de fuera del censo y los descuentos dicen qué no contaron cuando una consulta no se leyó', () => {
    const l = leer(
      {
        vistasYLecturas: [lectura(D2, '/cita/una/', 5), lectura(D1, '/cita/retirada/', 1)],
        salidas: 'D1_ERROR: fallo de mentira',
      },
      { pasadas: [{ pasada: '25.3', jornada: D2, rutas: ['/cita/una/'] }] },
    );
    expect(l.fueraDelCensoSinLeer).toEqual(['salidas']);
    expect(l.descuentos.incompletos).toEqual(['salidas']);
    const informe = texto(l);
    expect(informe).toContain('  Sin contar las salidas internas, que no se leyeron.');
    expect(informe).toContain('la 25.3, el 2026-11-03, en /cita/una/: 5 registros descontados (sin contar las salidas internas, que no se leyeron).');
    expect(informe).toContain('Balizas de prueba (/__comprobacion/): 0 registros (sin contar las salidas internas, que no se leyeron),');
    // Con todo leído, ninguna de las dos notas.
    const entera = texto(leer({ vistasYLecturas: [lectura(D1, '/cita/retirada/', 1)] }));
    expect(entera).not.toContain('Sin contar');
    expect(entera).not.toContain('sin contar');
  });

  it('una pasada descuenta también a los visitantes de esas rutas ese día, y lo compartido por dos va a la primera', () => {
    const l = leer(
      { vistasYLecturas: [lectura(D2, '/cita/una/', 5), lectura(D2, '/cita/dos/', 2)] },
      {
        pasadas: [
          { pasada: '25.3', jornada: D2, rutas: ['/cita/una/'] },
          { pasada: '25.7', jornada: D2, rutas: ['/cita/una/', '/cita/dos/'] },
        ],
      },
    );
    expect(l.descuentos.pasadas.map((p) => p.registros)).toEqual([5, 2]);
    expect(superficie(l, 'la Página de Cita').lecturas).toBe(0);
    expect(texto(l)).toContain(
      'Cada pasada descuenta todos los registros de sus rutas en su jornada, también los de visitantes de verdad: ' +
        'la tabla no los distingue. Si dos comparten ruta y jornada, lo compartido se cuenta en la primera.',
    );
  });

  it('la acción en una ruta fuera del censo no cuenta en SM-5 ni SM-7: se cuenta fuera, por evento; y cada superficie da sus acciones', () => {
    const l = leer({
      vistasYLecturas: [lectura(D1, '/cita/una/', 10)],
      acciones: [
        accion(D1, '/cita/una/', EVENTOS.copiado, 2),
        accion(D1, '/cita/retirada/', EVENTOS.copiado, 3),
        accion(D1, '/cita/retirada/', EVENTOS.comparticionDeEnlace, 1, { destino: 'whatsapp' }),
        accion(D1, '/autor/a/', EVENTOS.copiado, 4),
      ],
    });
    expect(l.cita?.conAccion).toEqual(calculada(2, 10));
    expect(l.cita?.conComparticion).toEqual(calculada(0, 10));
    expect(l.fueraDelCenso).toEqual([
      {
        clase: YA_NO_SE_PUBLICA,
        porEvento: [
          { evento: EVENTOS.comparticionDeEnlace, n: 1 },
          { evento: EVENTOS.copiado, n: 3 },
        ],
      },
    ]);
    expect(superficie(l, 'la Página de Cita').acciones).toBe(2);
    expect(superficie(l, 'la Página de Autor').acciones).toBe(4);
    expect(texto(l)).toContain('  la Página de Autor: vistas 0, lecturas 0, salidas 0, acciones 4;');
  });

  it('con más salidas que lecturas, SM-3 no se calcula: nunca un porcentaje negativo', () => {
    const l = leer({ vistasYLecturas: [lectura(D1, '/cita/una/', 2)], salidas: [salida(D1, '/cita/una/', 'atribucion', 3)] });
    expect(l.cita?.continuacion).toEqual(calculada(3, 2));
    expect(l.cita?.sinContinuacion).toEqual({ estado: 'por-encima', numerador: 3, denominador: 2 });
    const informe = texto(l);
    expect(informe).toContain(
      'SM-3, 1 − la continuación: no se calcula: la tasa de la que es complemento pasa del 100 % (3 de 2), con más salidas ' +
        'que lecturas —balizas perdidas o partidas por la medianoche UTC—',
    );
    expect(informe).not.toMatch(/-\d+,\d %/);
  });

  it('una línea base cerrada antes de la llegada: sus ventanas de antes se juzgan, pero dicen que no juzgan lo que llega', () => {
    const llegada = '2026-11-09';
    const partes: Partes = {
      vistasYLecturas: DIAS.map((dia) => lectura(dia, '/cita/una/', 120)),
      acciones: DIAS.flatMap((dia, i) => [
        accion(dia, '/cita/una/', EVENTOS.copiado, i < 3 ? 12 : 6),
        accion(dia, '/cita/una/', EVENTOS.comparticionDeEnlace, i < 3 ? 6 : 12, { destino: 'whatsapp' }),
      ]),
    };
    const l = leer(partes, { minimo: 300, juicios: [{ ...SM_C3, llegada, deDondeLlega: 'DE_PRUEBA' }] });
    const [leido] = l.juicios;
    expect(leido.referencia).toBe('linea-base');
    expect(leido.ventanas.map((v) => [v.desde, v.hasta, v.antesDeLaLlegada])).toEqual([['2026-11-05', '2026-11-07', llegada]]);
    expect(leido.cortadas).toEqual([{ desde: '2026-11-08', hasta: '2026-11-08', acumulado: 120, por: llegada }]);
    expect(texto(l)).toContain('la señal se da. Antes de la llegada del 2026-11-09: no juzga lo que llega.');
  });

  it('la llegada que hace medibles los Directorios, si es anterior al tramo vigente, no retrasa su línea base', () => {
    const DIRECTORIOS = JUICIOS_POR_VENTANAS.find((j) => j.nombre === 'la continuación de los Directorios')!;
    // Historias 26.3 y 26.4 — los dos Directorios ya la declaran en `SUPERFICIES`.
    const superficies = SUPERFICIES;
    const l = leer(
      { vistasYLecturas: DIAS.map((dia) => lectura(dia, '/autores/', 60)) },
      { superficies, minimo: 300, juicios: [{ ...DIRECTORIOS, llegada: '2026-10-20' }] },
      [...CENSO, '/autores/', '/obras/'],
    );
    expect(l.lineasBase.find((b) => b.unidad === DIRECTORIOS.unidad)).toMatchObject({ desde: D1, estado: 'cerrada', cerradaEl: '2026-11-06' });
  });

  it('una jornada de hoy que no existe se rechaza antes de componer', () => {
    for (const hoy of ['2026-11-31', '2026-1-12', 'hoy']) {
      expect(() => componerLecturaDeMedicion({ hoy, censo: CENSO, consultas: consultas({}), cuota: CUOTA, gasto: GASTO }), hoy).toThrow(
        'no es una jornada AAAA-MM-DD',
      );
    }
  });

  it('ninguna consulta con forma si ninguna trajo recuentos —tampoco con filas sin forma—, dé lo que dé d1 info', () => {
    const sinForma = [{ jornada: 'ayer', ruta: '/', n: 1 }];
    const partes = Object.fromEntries(CONSULTAS_DE_LA_LECTURA.map((c) => [c, sinForma])) as Partes;
    const sinCuota: CuotaLeida = { escritas: { ok: false, motivo: 'no' }, tamaño: { ok: false, motivo: 'no' } };
    expect(ningunaConsultaConForma(leer(partes, {}, CENSO, sinCuota))).toBe(true);
    // Las cifras de d1 info ya no bastan (Historia 23.13): es la precondición de toda lectura.
    expect(ningunaConsultaConForma(leer(partes, {}, CENSO, CUOTA))).toBe(true);
    // Basta una consulta con recuentos.
    expect(ningunaConsultaConForma(leer({ ...partes, salidas: [] }, {}, CENSO, sinCuota))).toBe(false);
  });

  it('el texto de un visitante tampoco trae separadores de línea, marcas de dirección árabes ni caracteres de anchura cero', () => {
    expect(legible('a b c؜d​e﻿f')).toBe('a�b�c�d�e�f');
  });

  it('Facebook, con la constante apagada, sale aparte, detrás de los destinos que se comparan', () => {
    const l = leer(
      {
        vistasYLecturas: [lectura(D1, '/cita/una/', 1, { via: 'facebook' }), lectura(D1, '/cita/una/', 1, { via: 'whatsapp' })],
        acciones: [
          accion(D1, '/cita/una/', EVENTOS.comparticionDeEnlace, 1, { destino: 'facebook' }),
          accion(D1, '/cita/una/', EVENTOS.comparticionDeEnlace, 2, { destino: 'whatsapp' }),
        ],
      },
      { conFacebook: false },
    );
    const lineas = lineasDeLecturaDeMedicion(l);
    const inicio = lineas.findIndex((linea) => linea.startsWith('SM-12'));
    const bloque = lineas.slice(inicio + 1, lineas.indexOf('', inicio + 1));
    const aparte = bloque.findIndex((linea) => linea.startsWith('  Aparte, facebook: 100,0 % (1 de 1); fuera de la comparación'));
    expect(aparte).toBeGreaterThan(bloque.findIndex((linea) => linea.startsWith('  whatsapp: 50,0 % (1 de 2).')));
    expect(bloque.some((linea) => linea.startsWith('  facebook:'))).toBe(false);
    const encendida = lineasDeLecturaDeMedicion(leer({}, { conFacebook: true }));
    expect(encendida.some((linea) => linea.startsWith('  Aparte, facebook'))).toBe(false);
    expect(encendida.some((linea) => linea.startsWith('  facebook:'))).toBe(true);
  });

  it('sin mínimo declarado, el informe lo dice aunque ninguna línea base haya empezado', () => {
    const l = leer({}, { cortes: [], minimo: undefined });
    expect(l.lineasBase.every((b) => b.estado === 'no-ha-empezado')).toBe(true);
    expect(texto(l)).toContain('Líneas base (MIN_LECTURAS_DE_LINEA_BASE: sin mínimo declarado; ninguna se cierra)');
  });

  it('las unidades salen de la declaración que se dé, y ninguna falta hace romper al cargar el módulo', () => {
    const renombrada = SUPERFICIES.map((s) => (s.vista === EVENTOS.vistaDeCita ? { ...s, lineaBase: 'las Citas' } : s));
    const juicios = valoresDeLaLectura({ superficies: renombrada }).juicios;
    expect(juicios.find((j) => j.nombre === 'SM-C3')?.unidad).toBe('las Citas');
    expect(UNIDAD_DE_LA_PAGINA_DE_CITA).toBe('la Página de Cita');
  });
});

describe('Historia 23.10 — el aislamiento del sitio (AD-14)', () => {
  it('ningún módulo de src/, integraciones/ ni astro.config.mjs importa ni nombra la lectura', async () => {
    const { stdout } = await promisify(execFile)(
      'git',
      [
        'grep',
        '-l',
        '--untracked',
        '-E',
        'lineaBase\\.ts|lib/lineaBase|tools/medicion|componerLecturaDeMedicion|lineasDeLecturaDeMedicion',
        '--',
        'src',
        'integraciones',
        'astro.config.mjs',
      ],
      { cwd: RAIZ },
    ).catch((error: Error & { stdout?: string; code?: number }) => {
      if (error.code === 1) return { stdout: '' };
      throw error;
    });
    expect(stdout.trim()).toBe('');
  });
});
