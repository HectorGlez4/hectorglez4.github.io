import { afterAll, describe, expect, it } from 'vitest';
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
  cortesQueLlegaron,
  type CorteLlegado,
} from '../../src/lib/umbrales.ts';
import { EVENTOS } from '../../src/lib/vocabulario.ts';
import { CONSULTAS_DE_LA_LECTURA, type ConsultaDeLaLectura, type CuotaLeida, type Filas } from '../../tools/lib/medicion.ts';
import {
  JUICIOS_POR_VENTANAS,
  PAGINAS_2_O_MAS,
  SIN_SUPERFICIE_DECLARADA,
  UNIDAD_DE_LA_PAGINA_DE_CITA,
  UNIDAD_DE_LAS_BUSQUEDAS,
  YA_NO_SE_PUBLICA,
  componerLecturaDeMedicion,
  direccionDe,
  lineasDeLecturaDeMedicion,
  partirSerie,
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

function leer(partes: Partes, opciones: OpcionesDeLaLectura = {}, censo: string[] = CENSO, cuota: CuotaLeida = CUOTA): LecturaDeMedicion {
  return componerLecturaDeMedicion(
    { hoy: HOY, censo, consultas: consultas(partes), cuota },
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
    for (const parte of [
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
    ]) {
      expect(lineas.some((linea) => linea.startsWith(parte)), parte).toBe(true);
    }
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
      expect(ventana.senal).toBe('no se da');
    }
    expect(texto(l)).toContain('continuación sin leer (las salidas internas), sin dirección');
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
    expect(informe).toContain('las escrituras fallan en silencio hasta las 00:00 UTC');
    expect(informe).toContain('Cada lectura recorre la tabla cinco veces, una por consulta.');
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
    // …y juntas en su línea base.
    expect(l.unidades).toEqual([
      { unidad: 'lo de prueba', superficies: ['la prueba uno', 'la prueba dos'], lecturas: 7, continuacion: calculada(4, 7) },
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
    const sinValor = (nombre: string) => `export const ${nombre}: string | undefined = undefined;`;
    expect(fuente).toContain(sinValor('DESPLIEGUE_DE_LA_LECTURA'));
    expect(fuente).toContain(sinValor('DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS'));
    expect(fuente).not.toMatch(/^import /m);
    const copia = fuente
      .replace(sinValor('DESPLIEGUE_DE_LA_LECTURA'), `export const DESPLIEGUE_DE_LA_LECTURA: string | undefined = '${lectura}';`)
      .replace(
        sinValor('DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS'),
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
    const informe = texto(l);
    expect(informe).toContain('Las metas de SM-3 a SM-7 están en suspenso hasta su línea base');
    expect(informe).not.toMatch(/(?<![\d,])(?:65|15|3|2) %|(?<![\d,])1,8(?![\d])/);
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
    expect(texto(l)).toContain('Líneas base (MIN_LECTURAS_DE_LINEA_BASE: sin valor)');
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
    const l = leer({}, { minimo: 300, juicios: JUICIOS_POR_VENTANAS });
    const directorios = l.juicios.find((j) => j.juicio.nombre === 'la continuación de los Directorios')!;
    expect(directorios.sinVentanas).toBe('sin lecturas: los Directorios entran con la 26');
  });

  it('la dirección se compara sin dividir', () => {
    expect(direccionDe(calculada(1, 3), calculada(2, 6))).toBe('igual');
    expect(direccionDe(calculada(2, 5), calculada(1, 3))).toBe('sube');
    expect(direccionDe({ estado: 'sin-denominador', numerador: 1 }, calculada(1, 3))).toBeUndefined();
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
