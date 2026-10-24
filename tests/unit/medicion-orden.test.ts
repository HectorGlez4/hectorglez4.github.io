import { afterAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import * as vocabulario from '../../src/lib/vocabulario.ts';
import { EVENTOS } from '../../src/lib/vocabulario.ts';
import { interpretar } from '../../medicion/receptor.ts';
import { CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1 } from '../../src/lib/umbrales.ts';
import {
  ARGUMENTOS_DE_INFORMACION,
  ARGUMENTOS_DE_SESION,
  ARGUMENTOS_DEL_RECEPTOR_LOCAL,
  FILAS_ESCRITAS_POR_FILA_BARAJADA,
  PUERTO_DEL_RECEPTOR_LOCAL,
  RUTA_DE_COMPROBACION,
  SQL_DE_BARAJADO,
  SQL_DE_BORRADO,
  SQL_DE_COLUMNAS,
  SQL_DE_FILAS,
  SQL_DE_MIGRACIONES_ANOTADAS,
  SQL_DE_RECUENTOS,
  SQL_DE_TABLA_DE_MIGRACIONES,
  SUBCOMANDOS,
  TEXTO_DE_PRUEBA,
  WRANGLER,
  argumentosDeConsulta,
  argumentosDeMedicion,
  argumentosDeMigracion,
  argumentosDeNpx,
  balizasDePrueba,
  cabeElBarajado,
  coberturaDelReceptor,
  columnasDeLaMigracion,
  columnasDelPragma,
  compararRecuentos,
  componerHuella,
  cotejarFilas,
  diferenciasDeHuella,
  estadoDeLaTabla,
  huellaDelVocabulario,
  jornadaUtc,
  leerConsulta,
  leerHuella,
  leerInformacion,
  leerSesion,
  parteDeLoAplicado,
  puntoFinalDeComprobacion,
  recuentos,
  rowidAleatorio,
  sqlDeLasBalizas,
  vocabularioDeLaPrincipal,
  type Huella,
  type Migracion,
  type VocabularioDeHuella,
} from '../../tools/lib/medicion.ts';

const raiz = resolve(import.meta.dirname, '../..');
const aBorrar: string[] = [];
afterAll(() => {
  for (const dir of aBorrar) rmSync(dir, { recursive: true, force: true });
});

/**
 * Historia 23.2 — `npm run medicion`, su parte pura, con respuestas fijas (AD-22).
 *
 * Ninguna prueba toca un D1, ni el remoto ni el local: lo que contesta `wrangler` se escribe
 * aquí, con la forma que tiene de verdad (`d1 execute --json`, `whoami --json`, `d1 info
 * --json`). La cáscara solo se ejecuta en las invocaciones que salen antes de la red, y con un
 * `npx` de mentira delante en el `PATH` para la sesión.
 */

const MIGRACIONES: Migracion[] = readdirSync(resolve(raiz, 'medicion/migrations'))
  .sort()
  .map((nombre) => ({ nombre, sql: readFileSync(resolve(raiz, 'medicion/migrations', nombre), 'utf8') }));
const [PARTIDA, V8] = MIGRACIONES.map((m) => m.nombre);

/** Las filas de `PRAGMA table_info(eventos)` para unas columnas, como las da D1. */
const pragma = (columnas: { nombre: string; tipo: string; noNula: boolean }[]) =>
  columnas.map((c, cid) => ({ cid, name: c.nombre, type: c.tipo, notnull: c.noNula ? 1 : 0, dflt_value: null, pk: 0 }));

const COLUMNAS_DE_PARTIDA = columnasDeLaMigracion(MIGRACIONES[0].sql);
const COLUMNAS_MIGRADAS = MIGRACIONES.flatMap((m) => columnasDeLaMigracion(m.sql));

/** El vocabulario de la v7.1 tal como lo dejan los módulos de la principal de antes de la 23.2. */
const MODULOS_V71 = {
  medicion: {
    EVENTOS: {
      vistaDeCita: 'vista-de-cita',
      vistaDeSuperficie: 'vista-de-superficie',
      copiado: 'copiado',
      descargaDeImagen: 'descarga-de-imagen',
      busquedaSinResultados: 'busqueda-sin-resultados',
      comparticionDeImagen: 'comparticion-de-imagen',
      comparticionDeEnlace: 'comparticion-de-enlace',
    },
    EVENTOS_VALIDOS: [
      'vista-de-cita',
      'vista-de-superficie',
      'copiado',
      'descarga-de-imagen',
      'busqueda-sin-resultados',
      'comparticion-de-imagen',
      'comparticion-de-enlace',
    ],
  },
  destinos: { DESTINOS_VALIDOS: ['whatsapp', 'telegram', 'x', 'correo', 'opaco'] },
  redes: { REDES_VALIDAS: ['instagram', 'tiktok', 'x', 'threads', 'facebook'] },
};

describe('Historia 23.2 — la invocación', () => {
  it.each([
    [[], /Falta el subcomando/],
    [['x'], /«x» no es un subcomando/],
    [['desplegar', '--rapido'], /«--rapido» no es una opción/],
    [['comprobar', 'otra'], /«otra» sobra/],
    [['--rapido'], /«--rapido» no es un subcomando/],
  ])('%j no vale, y dice por qué y cómo se usa', (argumentos, motivo) => {
    const invocacion = argumentosDeMedicion(argumentos);
    expect(invocacion.ok).toBe(false);
    if (!invocacion.ok) {
      expect(invocacion.motivo).toMatch(motivo);
      expect(invocacion.motivo).toContain('desplegar | comprobar | local | ensayo');
    }
  });

  it.each(SUBCOMANDOS.map((s) => [s]))('%s vale, solo', (subcomando) => {
    expect(argumentosDeMedicion([subcomando])).toEqual({ ok: true, subcomando });
  });

  it('el punto final tiene que ser http(s), y el motivo no repite el valor, que es un secreto', () => {
    for (const valor of [undefined, '', '   ', 'midominio.example/m', 'ftp://receptor.example/m', 'file:///etc/hosts']) {
      const punto = puntoFinalDeComprobacion({ MEDICION_ENDPOINT: valor });
      expect(punto.ok, String(valor)).toBe(false);
      if (!punto.ok && valor?.trim()) expect(punto.motivo).not.toContain(valor.trim());
      if (!punto.ok) expect(punto.motivo).toContain('MEDICION_ENDPOINT');
    }
    expect(puntoFinalDeComprobacion({ MEDICION_ENDPOINT: ' https://receptor.example/m ' })).toEqual({
      ok: true,
      url: 'https://receptor.example/m',
    });
    expect(puntoFinalDeComprobacion({ MEDICION_ENDPOINT: 'http://localhost:8787/' }).ok).toBe(true);
  });
});

describe('Historia 23.2 — wrangler, con su versión fijada y la base siempre explícita', () => {
  it('la versión es exacta y va delante de cada orden, con --yes', () => {
    expect(WRANGLER).toBe('wrangler@4.151.1');
    expect(argumentosDeNpx(['whoami', '--json'])).toEqual(['--yes', 'wrangler@4.151.1', 'whoami', '--json']);
  });

  it('todo d1 execute y d1 migrations lleva --remote o --local, nunca ninguno ni los dos', () => {
    const ordenes = [
      argumentosDeConsulta('SELECT 1', 'remota'),
      argumentosDeConsulta('SELECT 1', 'local'),
      argumentosDeMigracion('remota'),
      argumentosDeMigracion('local'),
    ];
    for (const orden of ordenes) {
      expect(orden[0]).toBe('d1');
      const banderas = orden.filter((a) => a === '--remote' || a === '--local');
      expect(banderas, orden.join(' ')).toHaveLength(1);
    }
    expect(argumentosDeConsulta('SELECT 1', 'remota')).toContain('--remote');
    expect(argumentosDeConsulta('SELECT 1', 'local')).toContain('--local');
    expect(argumentosDeConsulta('SELECT 1', 'remota')).toEqual(
      expect.arrayContaining(['execute', 'medicion', '--json', '--command', 'SELECT 1']),
    );
    expect(argumentosDeMigracion('remota')).toEqual(['d1', 'migrations', 'apply', 'medicion', '--remote']);
    // `d1 info` solo existe en remoto, y no admite ninguna de las dos banderas.
    expect(ARGUMENTOS_DE_INFORMACION).toEqual(['d1', 'info', 'medicion', '--json']);
    expect(ARGUMENTOS_DE_SESION).toEqual(['whoami', '--json']);
  });

  it('el receptor local escucha en el puerto fijo, sin enlaces remotos', () => {
    expect(ARGUMENTOS_DEL_RECEPTOR_LOCAL).toEqual(['dev', '--port', String(PUERTO_DEL_RECEPTOR_LOCAL), '--local']);
    expect(readFileSync(resolve(raiz, 'playwright.config.ts'), 'utf8')).toContain(`localhost:${PUERTO_DEL_RECEPTOR_LOCAL}`);
  });

  it('la cáscara no escribe a mano ni la versión ni la base: las pide a tools/lib/medicion.ts', () => {
    const cascara = readFileSync(resolve(raiz, 'tools/medicion.ts'), 'utf8');
    for (const prohibido of ["'--remote'", "'--local'", 'wrangler@', "'d1'", 'SELECT ', 'UPDATE ', 'DELETE ']) {
      expect(cascara, prohibido).not.toContain(prohibido);
    }
  });

  it('wrangler no es dependencia del proyecto, ni los tipos de workers', () => {
    const paquete = JSON.parse(readFileSync(resolve(raiz, 'package.json'), 'utf8'));
    const todas = { ...paquete.dependencies, ...paquete.devDependencies };
    expect(todas).not.toHaveProperty('wrangler');
    expect(todas).not.toHaveProperty('@cloudflare/workers-types');
    expect(paquete.scripts.medicion).toBe('tsx tools/medicion.ts');
  });
});

describe('Historia 23.2 — el SQL de la orden', () => {
  const todos = [
    SQL_DE_COLUMNAS,
    SQL_DE_TABLA_DE_MIGRACIONES,
    SQL_DE_MIGRACIONES_ANOTADAS,
    SQL_DE_RECUENTOS,
    SQL_DE_FILAS,
    SQL_DE_BORRADO,
    SQL_DE_BARAJADO,
    sqlDeLasBalizas(['origen', 'zona']),
  ];

  it('ninguno ordena, y solo la lectura de las balizas y el barajado nombran el rowid', () => {
    for (const sql of todos) expect(sql).not.toMatch(/\bORDER\s+BY\b/i);
    expect(todos.filter((sql) => /\browid\b/i.test(sql))).toEqual([SQL_DE_BARAJADO, sqlDeLasBalizas(['origen', 'zona'])]);
    expect(sqlDeLasBalizas(['origen'])).toContain('CAST(rowid AS TEXT) AS fila');
    expect(SQL_DE_BARAJADO).toBe('UPDATE eventos SET rowid = abs(random())');
  });

  it('los recuentos descuentan las balizas, y el borrado solo las toca a ellas', () => {
    expect(SQL_DE_RECUENTOS).toContain(`ruta <> '${RUTA_DE_COMPROBACION}'`);
    expect(SQL_DE_RECUENTOS).toMatch(/GROUP BY jornada, evento$/);
    expect(SQL_DE_BORRADO).toBe(`DELETE FROM eventos WHERE ruta = '${RUTA_DE_COMPROBACION}'`);
    expect(sqlDeLasBalizas(['origen'])).toMatch(new RegExp(`WHERE ruta = '${RUTA_DE_COMPROBACION}'$`));
  });
});

describe('Historia 23.2 — lo que contesta wrangler', () => {
  it('la sesión', () => {
    expect(leerSesion('{"loggedIn":false}')).toBe('sin-sesion');
    expect(leerSesion('{"loggedIn":true,"authType":"OAuth Token","email":"x@ejemplo.org"}')).toBe('con-sesion');
    expect(leerSesion('')).toBe('ilegible');
    expect(leerSesion('✘ [ERROR] algo')).toBe('ilegible');
    expect(leerSesion('{"cuenta":1}')).toBe('ilegible');
  });

  it('una consulta: sus filas, o lo que dijo D1', () => {
    const bien = JSON.stringify([{ results: [{ n: 3 }], success: true, meta: { duration: 0 } }]);
    expect(leerConsulta(bien)).toEqual({ ok: true, filas: [{ n: 3 }] });
    expect(leerConsulta(JSON.stringify({ error: { text: 'no such column: nada' } }))).toEqual({
      ok: false,
      motivo: 'no such column: nada',
    });
    expect(leerConsulta('no es json').ok).toBe(false);
    expect(leerConsulta(JSON.stringify([{ results: [], success: false }])).ok).toBe(false);
  });

  it('d1 info: las filas escritas en 24 h, o por qué no se baraja', () => {
    const info = JSON.stringify({ name: 'medicion', database_size: 49152, rows_written_24h: 1234 });
    expect(leerInformacion(info)).toEqual({ ok: true, escritas24h: 1234, tamaño: 49152 });
    const sin = leerInformacion(JSON.stringify({ name: 'medicion' }));
    expect(sin.ok).toBe(false);
    if (!sin.ok) expect(sin.motivo).toContain('rows_written_24h');
    expect(leerInformacion('{').ok).toBe(false);
  });
});

describe('Historia 23.2 — el estado de la tabla antes de migrar', () => {
  it('la de partida, sin d1_migrations o con la 0000 anotada, pide la 0001', () => {
    const columnas = columnasDelPragma(pragma(COLUMNAS_DE_PARTIDA));
    expect(estadoDeLaTabla(columnas, [], MIGRACIONES)).toEqual({ estado: 'de-partida', pendientes: [V8] });
    expect(estadoDeLaTabla(columnas, [PARTIDA], MIGRACIONES)).toEqual({ estado: 'de-partida', pendientes: [V8] });
  });

  it('la migrada, con todo anotado, no pide nada', () => {
    const columnas = columnasDelPragma(pragma(COLUMNAS_MIGRADAS));
    expect(estadoDeLaTabla(columnas, [PARTIDA, V8], MIGRACIONES)).toEqual({ estado: 'migrada', pendientes: [] });
  });

  it.each([
    ['las columnas migradas sin la 0001 anotada', COLUMNAS_MIGRADAS, [PARTIDA]],
    ['las de partida con la 0001 anotada', COLUMNAS_DE_PARTIDA, [PARTIDA, V8]],
    ['una columna de más', [...COLUMNAS_DE_PARTIDA, { nombre: 'ip', tipo: 'TEXT', noNula: false }], []],
    ['una columna de menos', COLUMNAS_DE_PARTIDA.slice(0, 5), []],
    ['una columna con otra nulidad', COLUMNAS_DE_PARTIDA.map((c) => ({ ...c, noNula: false })), []],
    ['sin tabla', [], []],
    ['una migración anotada que el repositorio no tiene', COLUMNAS_DE_PARTIDA, ['0007_otra.sql']],
  ])('%s: otra, nombrada, y no se migra', (_caso, columnas, anotadas) => {
    const estado = estadoDeLaTabla(columnasDelPragma(pragma(columnas)), anotadas, MIGRACIONES);
    expect(estado.estado).toBe('otra');
    if (estado.estado === 'otra') expect(estado.motivo.length).toBeGreaterThan(20);
  });

  it('las columnas de cada migración se leen del SQL, sin sus comentarios', () => {
    expect(COLUMNAS_DE_PARTIDA.map((c) => c.nombre)).toEqual(['jornada', 'evento', 'ruta', 'origen', 'destino', 'consulta']);
    expect(COLUMNAS_DE_PARTIDA.slice(0, 3).every((c) => c.noNula)).toBe(true);
    expect(COLUMNAS_MIGRADAS.map((c) => c.nombre)).toEqual(['jornada', 'evento', 'ruta', ...vocabulario.CAMPOS]);
  });
});

describe('Historia 23.2 — la huella', () => {
  const HUELLA: Huella = {
    escritaEl: '2026-10-24',
    commit: 'a'.repeat(40),
    vocabulario: huellaDelVocabulario(),
  };

  it('el mismo vocabulario da el mismo texto, en JSON de dos espacios y con salto final', () => {
    const texto = componerHuella(HUELLA);
    expect(texto.endsWith('}\n')).toBe(true);
    expect(texto).toContain('\n  "escritaEl": "2026-10-24",\n  "commit": ');
    // El orden de las claves no depende de cómo se escribió el objeto.
    const desordenado: VocabularioDeHuella = {
      tramos: HUELLA.vocabulario.tramos,
      claveEnLaBaliza: HUELLA.vocabulario.claveEnLaBaliza,
      eventos: Object.fromEntries(Object.entries(HUELLA.vocabulario.eventos).reverse()),
    };
    expect(componerHuella({ ...HUELLA, vocabulario: desordenado })).toBe(texto);
    expect(componerHuella(HUELLA)).toBe(texto);
  });

  it('se lee lo que se escribe, y casa consigo misma', () => {
    const leida = leerHuella(componerHuella(HUELLA));
    expect(leida.ok).toBe(true);
    if (leida.ok) {
      expect(leida.huella).toEqual(HUELLA);
      expect(diferenciasDeHuella(leida.huella.vocabulario, huellaDelVocabulario())).toEqual([]);
    }
  });

  it('eventos, campos y valores van ordenados', () => {
    const { eventos } = HUELLA.vocabulario;
    expect(Object.keys(eventos)).toEqual([...Object.keys(eventos)].sort());
    for (const campos of Object.values(eventos)) {
      expect(Object.keys(campos)).toEqual([...Object.keys(campos)].sort());
      for (const { valores } of Object.values(campos)) if (valores !== 'texto') expect(valores).toEqual([...valores].sort());
    }
    expect(eventos[EVENTOS.busquedaSinResultados].consulta).toEqual({ valores: 'texto', nulo: false });
    expect(HUELLA.vocabulario.claveEnLaBaliza).toEqual({ consulta: 'datos' });
  });

  it('una huella mal formada se rechaza nombrando cada fallo', () => {
    expect(leerHuella('{').ok).toBe(false);
    const mala = leerHuella(
      JSON.stringify({
        escritaEl: '24/10/2026',
        commit: 'abc',
        vocabulario: { eventos: { copiado: { primera: { valores: [], nulo: 'no' } } }, claveEnLaBaliza: {}, tramos: [{}] },
      }),
    );
    expect(mala.ok).toBe(false);
    if (!mala.ok) {
      expect(mala.motivos.join(' ')).toMatch(/escritaEl/);
      expect(mala.motivos.join(' ')).toMatch(/commit/);
      expect(mala.motivos.join(' ')).toMatch(/copiado\.primera\.valores/);
      expect(mala.motivos.join(' ')).toMatch(/copiado\.primera\.nulo/);
      expect(mala.motivos.join(' ')).toMatch(/tramos/);
    }
  });

  it('cada diferencia se nombra: evento, campo, valores, nulo, clave de la baliza y tramos', () => {
    const base = huellaDelVocabulario();
    const otro: VocabularioDeHuella = structuredClone(base);
    delete otro.eventos[EVENTOS.lectura];
    otro.eventos['inventado'] = {};
    delete otro.eventos[EVENTOS.copiado].primera;
    otro.eventos[EVENTOS.salidaInterna].zona = { valores: ['cabecera'], nulo: false };
    otro.eventos[EVENTOS.vistaDeCita].origen = { ...base.eventos[EVENTOS.vistaDeCita].origen, nulo: false };
    otro.claveEnLaBaliza = {};
    const diferencias = diferenciasDeHuella(otro, base);
    const texto = diferencias.join('\n');
    expect(texto).toContain(`el evento ${EVENTOS.lectura} está en src/lib/vocabulario.ts y no en la huella`);
    expect(texto).toContain('el evento inventado está en la huella y no en src/lib/vocabulario.ts');
    expect(texto).toContain(`${EVENTOS.copiado}.primera está en src/lib/vocabulario.ts y no en la huella`);
    expect(texto).toContain(`${EVENTOS.salidaInterna}.zona: la huella dice [cabecera]`);
    expect(texto).toContain(`${EVENTOS.vistaDeCita}.origen: la huella dice nulo false`);
    expect(texto).toContain('la clave de consulta en la baliza');
    expect(diferencias).toHaveLength(6);
  });

  it('cambiar un corte de los tramos mueve la huella (y abre un corte de serie, 23.10)', () => {
    const otrosCortes = huellaDelVocabulario({
      ...vocabulario,
      TRAMOS: [
        { desde: 0, rotulo: '0' },
        { desde: 1, rotulo: '1-9' },
        { desde: 10, rotulo: '10-49' },
        { desde: 50, rotulo: '50+' },
      ],
    });
    expect(diferenciasDeHuella(otrosCortes, huellaDelVocabulario()).some((d) => d.startsWith('los tramos'))).toBe(true);
  });
});

describe('Historia 23.2 — la referencia sin huella: el vocabulario de origin/main', () => {
  it('con los módulos de la v7.1: la Marca de origen en todo evento, el destino en las comparticiones y la consulta', () => {
    const v71 = vocabularioDeLaPrincipal(MODULOS_V71)!;
    expect(Object.keys(v71.eventos).sort()).toEqual([...MODULOS_V71.medicion.EVENTOS_VALIDOS].sort());
    for (const [evento, campos] of Object.entries(v71.eventos)) {
      expect(campos.origen?.valores, evento).toEqual([...MODULOS_V71.redes.REDES_VALIDAS].sort());
    }
    expect(Object.keys(v71.eventos['comparticion-de-enlace']).sort()).toEqual(['destino', 'origen']);
    expect(Object.keys(v71.eventos['comparticion-de-imagen']).sort()).toEqual(['destino', 'origen']);
    expect(Object.keys(v71.eventos.copiado)).toEqual(['origen']);
    expect(v71.eventos['busqueda-sin-resultados'].consulta?.valores).toBe('texto');
    expect(v71.tramos).toEqual([]);
  });

  it('con vocabulario.ts, su huella; y sin módulos, nada', () => {
    expect(vocabularioDeLaPrincipal({ vocabulario })).toEqual(huellaDelVocabulario());
    expect(vocabularioDeLaPrincipal({})).toBeNull();
    expect(vocabularioDeLaPrincipal({ medicion: MODULOS_V71.medicion })).toBeNull();
  });
});

describe('Historia 23.2 — el receptor de la rama cubre lo que envía el sitio en vivo', () => {
  it('cubre la v7.1 entera y el vocabulario de la v8', () => {
    expect(coberturaDelReceptor(interpretar, vocabularioDeLaPrincipal(MODULOS_V71)!)).toEqual([]);
    expect(coberturaDelReceptor(interpretar, huellaDelVocabulario())).toEqual([]);
  });

  it('lo que no guarda, nombrado: un evento, un valor, un campo', () => {
    const referencia: VocabularioDeHuella = structuredClone(huellaDelVocabulario());
    referencia.eventos['inventado'] = {};
    referencia.eventos[EVENTOS.salidaInterna].zona = { valores: ['cabecera', 'pie'], nulo: false };
    referencia.eventos[EVENTOS.copiado].huella = { valores: ['si'], nulo: true };
    const faltas = coberturaDelReceptor(interpretar, referencia);
    expect(faltas).toEqual(
      expect.arrayContaining([
        'el receptor descarta el evento inventado.',
        `el receptor no guarda ${EVENTOS.salidaInterna}.zona = pie.`,
        `el receptor no guarda ${EVENTOS.copiado}.huella = si.`,
      ]),
    );
    expect(faltas).toHaveLength(3);
  });

  it('un receptor que perdiera la Marca de origen de la v7.1 en las acciones no pasa', () => {
    const sinOrigenEnAcciones: typeof interpretar = (cuerpo, instante) => {
      const registro = interpretar(cuerpo, instante);
      return registro && registro.evento === EVENTOS.copiado ? { ...registro, origen: null } : registro;
    };
    const faltas = coberturaDelReceptor(sinOrigenEnAcciones, vocabularioDeLaPrincipal(MODULOS_V71)!);
    expect(faltas).toHaveLength(MODULOS_V71.redes.REDES_VALIDAS.length);
    expect(faltas[0]).toMatch(/^el receptor no guarda copiado\.origen = /);
  });
});

describe('Historia 23.2 — las balizas de prueba', () => {
  const vocabularioDeLaV8 = huellaDelVocabulario();
  const { balizas, esperadas, campos } = balizasDePrueba(vocabularioDeLaV8);

  it('cubren todo par evento–campo–valor, todas a /__comprobacion/', () => {
    const cubiertos = new Set<string>();
    for (const baliza of balizas) {
      expect(baliza.ruta).toBe(RUTA_DE_COMPROBACION);
      for (const [clave, valor] of Object.entries(baliza)) {
        if (clave === 'evento' || clave === 'ruta') continue;
        const campo = clave === 'datos' ? 'consulta' : clave;
        cubiertos.add(`${baliza.evento} ${campo} ${valor}`);
      }
    }
    const debidos = Object.entries(vocabularioDeLaV8.eventos).flatMap(([evento, declarados]) =>
      Object.entries(declarados).flatMap(([campo, { valores }]) =>
        (valores === 'texto' ? [TEXTO_DE_PRUEBA] : valores).map((valor) => `${evento} ${campo} ${valor}`),
      ),
    );
    expect([...cubiertos].sort()).toEqual([...new Set(debidos)].sort());
    // Y cada evento, al menos una vez.
    expect(new Set(balizas.map((b) => b.evento))).toEqual(new Set(Object.keys(vocabularioDeLaV8.eventos)));
    expect(campos).toEqual([...vocabulario.CAMPOS].sort());
  });

  it('cada una deja la fila esperada, y el receptor de la rama la guarda así', () => {
    expect(esperadas).toHaveLength(balizas.length);
    balizas.forEach((baliza, i) => {
      const registro = interpretar(JSON.stringify(baliza), new Date()) as Record<string, unknown> | null;
      expect(registro, JSON.stringify(baliza)).not.toBeNull();
      for (const [columna, valor] of Object.entries(esperadas[i])) expect(registro![columna], columna).toBe(valor);
    });
  });

  it('el cotejo: casan sin importar el orden ni el rowid; lo que falta y lo que sobra, nombrado', () => {
    const leidas: Record<string, unknown>[] = esperadas.map((fila, i) => ({ fila: String(1000 + i), ...fila })).reverse();
    expect(cotejarFilas(esperadas, leidas, campos)).toEqual([]);

    const sinUna = leidas.slice(1);
    const faltas = cotejarFilas(esperadas, sinUna, campos);
    expect(faltas).toHaveLength(1);
    expect(faltas[0]).toMatch(/^falta: evento=/);

    const conOtra = [...leidas, { ...leidas[0], zona: 'pie' }];
    const sobras = cotejarFilas(esperadas, conOtra, campos);
    expect(sobras).toHaveLength(1);
    expect(sobras[0]).toMatch(/^sobra: .*zona=pie/);

    // Un campo que llega nulo donde se esperaba un valor es una que falta y otra que sobra.
    const conNulo = leidas.map((fila) =>
      fila.evento === EVENTOS.copiado ? { ...fila, primera: null } : fila,
    );
    expect(cotejarFilas(esperadas, conNulo, campos).length).toBeGreaterThan(0);
  });
});

describe('Historia 23.2 — el orden de las filas de prueba', () => {
  it.each([
    ['contiguas de 19 cifras —un receptor viejo numerando sobre los aleatorios—', ['9100000000000000001', '9100000000000000002', '9100000000000000003'], 'contiguo'],
    ['contiguas y pequeñas', ['41', '42', '44'], 'contiguo'],
    ['dispersas', ['3002278359514338644', '9101168035204526467', '344852870550380712'], 'aleatorio'],
    ['justo en 2^32', ['0', '4294967296'], 'aleatorio'],
    ['justo por debajo de 2^32', ['0', '4294967295'], 'contiguo'],
    ['una sola', ['3002278359514338644'], 'insuficiente'],
    ['ninguna', [], 'insuficiente'],
    ['ilegibles', ['abc', ''], 'insuficiente'],
  ])('%s: %s', (_caso, filas, orden) => {
    expect(rowidAleatorio(filas)).toBe(orden);
  });

  it('los enteros de 64 bits no se redondean: se comparan como BigInt', () => {
    // 2^63 − 1 y 2^63 − 2^32 distan 2^32 − 1: contiguas por un pelo. Como números de JavaScript
    // el primero se redondea a 2^63, distan 2^32 y darían «aleatorio».
    const filas = ['9223372036854775807', '9223372032559808512'];
    expect(Number(filas[0]) - Number(filas[1])).toBe(2 ** 32);
    expect(rowidAleatorio(filas)).toBe('contiguo');
  });
});

describe('Historia 23.2 — la cuota y los recuentos', () => {
  it('el barajado cabe justo, y no cabe por una fila', () => {
    const filas = 10_000;
    const coste = filas * FILAS_ESCRITAS_POR_FILA_BARAJADA;
    const justo = cabeElBarajado({ filas, escritas24h: CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1 - coste, cuota: CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1 });
    expect(justo.cabe).toBe(true);
    expect(justo.coste).toBe(30_000);

    const pasada = cabeElBarajado({ filas, escritas24h: CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1 - coste + 1, cuota: CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1 });
    expect(pasada.cabe).toBe(false);
    expect(pasada.mensaje).toContain('30000');
    expect(pasada.mensaje).toContain(String(CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1));
    expect(pasada.mensaje).toMatch(/otro día/);
    expect(pasada.mensaje).toMatch(/ni se trocea/);
    expect(FILAS_ESCRITAS_POR_FILA_BARAJADA).toBe(3);
    expect(CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1).toBe(100_000);
  });

  const antes = recuentos([
    { jornada: '2026-10-22', evento: 'vista-de-cita', n: 10 },
    { jornada: '2026-10-23', evento: 'copiado', n: 3 },
    { jornada: '2026-10-24', evento: 'vista-de-cita', n: 5 },
  ]);

  it('iguales, o con la jornada de hoy crecida: nada que decir', () => {
    expect(compararRecuentos(antes, antes, '2026-10-24')).toEqual([]);
    const crecida = new Map(antes);
    crecida.set('2026-10-24 vista-de-cita', 9);
    crecida.set('2026-10-24 copiado', 1);
    expect(compararRecuentos(antes, crecida, '2026-10-24')).toEqual([]);
  });

  it('una jornada cerrada distinta, o una que aparece, se nombra', () => {
    const cambiada = new Map(antes);
    cambiada.set('2026-10-22 vista-de-cita', 11);
    cambiada.set('2026-10-21 copiado', 1);
    const diferencias = compararRecuentos(antes, cambiada, '2026-10-24');
    expect(diferencias).toHaveLength(2);
    expect(diferencias.join(' ')).toContain('2026-10-22 vista-de-cita tenía 10 filas y ahora tiene 11');
  });

  it('la jornada de hoy que mengua se nombra', () => {
    const menguada = new Map(antes);
    menguada.set('2026-10-24 vista-de-cita', 4);
    expect(compararRecuentos(antes, menguada, '2026-10-24')).toEqual([
      'la jornada 2026-10-24 vista-de-cita, que sigue abierta, tenía 5 filas y ahora tiene 4: solo puede crecer.',
    ]);
  });

  it('la jornada es la UTC', () => {
    expect(jornadaUtc(new Date('2026-10-24T23:59:59Z'))).toBe('2026-10-24');
    expect(jornadaUtc(new Date('2026-10-25T00:00:00Z'))).toBe('2026-10-25');
  });

  it('el parte dice qué quedó aplicado, o que nada', () => {
    expect(parteDeLoAplicado([])).toBe('No se aplicó nada en remoto.');
    expect(parteDeLoAplicado(['las migraciones en remoto', 'el receptor desplegado'])).toBe(
      'Quedó aplicado, en este orden: las migraciones en remoto; el receptor desplegado.',
    );
  });
});

describe('Historia 23.2 — la cáscara sale con 2 antes de tocar la red', () => {
  /** Un `PATH` con un `npx` de mentira delante, que contesta lo que se le dé y sale con su código. */
  function npxDeMentira(salida: string, codigo: number): string {
    const dir = mkdtempSync(join(tmpdir(), 'sabiduria-npx-'));
    aBorrar.push(dir);
    const fichero = join(dir, 'npx');
    writeFileSync(fichero, `#!/bin/sh\nprintf '%s' '${salida}'\nexit ${codigo}\n`);
    chmodSync(fichero, 0o755);
    return dir;
  }

  function correr(argumentos: string[], entorno: Record<string, string | undefined>) {
    return new Promise<{ codigo: number; salida: string }>((listo) => {
      const env = { ...process.env, ...entorno };
      for (const [clave, valor] of Object.entries(entorno)) if (valor === undefined) delete env[clave];
      execFile(
        resolve(raiz, 'node_modules/.bin/tsx'),
        ['tools/medicion.ts', ...argumentos],
        { cwd: raiz, env },
        (error, stdout, stderr) => {
          listo({ codigo: error ? Number((error as { code?: number }).code ?? 1) : 0, salida: `${stdout}${stderr}` });
        },
      );
    });
  }

  it.each([
    [['x'], {}, /no es un subcomando/],
    [['desplegar', '--rapido'], {}, /«--rapido» no es una opción/],
    [[], {}, /Falta el subcomando/],
    [['comprobar'], { MEDICION_ENDPOINT: undefined }, /Falta MEDICION_ENDPOINT/],
    [['desplegar'], { MEDICION_ENDPOINT: undefined }, /Falta MEDICION_ENDPOINT/],
    [['desplegar'], { MEDICION_ENDPOINT: 'ftp://receptor.example/m' }, /no es una dirección http\(s\)/],
  ])('%j sale con 2 y lo dice', async (argumentos, entorno, motivo) => {
    // Con un `npx` que falla delante: si la orden llegara a llamarlo, no saldría con 2.
    const PATH = `${npxDeMentira('', 99)}:${process.env.PATH}`;
    const { codigo, salida } = await correr(argumentos, { ...entorno, PATH });
    expect(codigo, salida).toBe(2);
    expect(salida).toMatch(motivo);
    expect(salida).not.toContain('ftp://receptor.example/m');
  }, 60_000);

  it('sin sesión de wrangler sale con 2; con un wrangler que no contesta lo esperado, con 1', async () => {
    const MEDICION_ENDPOINT = 'https://receptor.example/m';
    const sinSesion = await correr(['comprobar'], {
      MEDICION_ENDPOINT,
      PATH: `${npxDeMentira('{"loggedIn":false}', 1)}:${process.env.PATH}`,
    });
    expect(sinSesion.codigo, sinSesion.salida).toBe(2);
    expect(sinSesion.salida).toContain(`npx --yes ${WRANGLER} login`);

    const roto = await correr(['desplegar'], {
      MEDICION_ENDPOINT,
      PATH: `${npxDeMentira('✘ [ERROR] algo', 1)}:${process.env.PATH}`,
    });
    expect(roto.codigo, roto.salida).toBe(1);
    expect(roto.salida).toContain('whoami --json no contestó lo esperado');
    expect(roto.salida).toContain('No se aplicó nada en remoto.');
  }, 60_000);

  it('con un wrangler que no arranca —no hay npx— sale con 1', async () => {
    // Un `PATH` con solo `node`: `tsx` arranca, y la orden no encuentra `npx`.
    const dir = mkdtempSync(join(tmpdir(), 'sabiduria-sin-npx-'));
    aBorrar.push(dir);
    symlinkSync(process.execPath, join(dir, 'node'));
    const { codigo, salida } = await correr(['comprobar'], {
      MEDICION_ENDPOINT: 'https://receptor.example/m',
      PATH: dir,
    });
    expect(codigo, salida).toBe(1);
    expect(salida).toMatch(/npx no arranca/);
  }, 60_000);
});
