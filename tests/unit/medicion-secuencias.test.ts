import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { interpretar, type Registro } from '../../medicion/receptor.ts';
import { CAMPOS, EVENTOS } from '../../src/lib/vocabulario.ts';
import {
  ARGUMENTOS_DE_DESPLIEGUE,
  ARGUMENTOS_DE_INFORMACION,
  ARGUMENTOS_DE_SESION,
  PUNTO_FINAL_LOCAL,
  Parada,
  RUTA_DE_COMPROBACION,
  RUTA_DE_LA_HUELLA,
  SQL_DE_BARAJADO,
  SQL_DE_BORRADO,
  SQL_DE_COLUMNAS,
  SQL_DE_FILAS,
  SQL_DE_MIGRACIONES_ANOTADAS,
  SQL_DE_RECUENTOS,
  SQL_DE_TABLA_DE_MIGRACIONES,
  argumentosDeMigracion,
  columnasDeLaMigracion,
  componerHuella,
  comprobar,
  desplegar,
  ensayo,
  huellaDelVocabulario,
  leerHuella,
  vocabularioDeLaPrincipal,
  type Columna,
  type Efectos,
  type Migracion,
  type VocabularioDeHuella,
} from '../../tools/lib/medicion.ts';

/**
 * Historia 23.2 — las secuencias de `npm run medicion`, con efectos de mentira (AD-22).
 *
 * `desplegar` aplica en producción, en este orden, una migración, un despliegue, unas balizas,
 * un `UPDATE` de cada fila y la huella. Ese orden y cada parada que lo corta se fijan aquí, con
 * un D1 en memoria que contesta lo que contestaría `wrangler` y un receptor que guarda como el
 * Worker —con el `interpretar` de la rama, o con el de la v7.1—, antes de la primera vez que se
 * corre de verdad. Ninguna prueba toca un D1, ni el remoto ni el local.
 */

const raiz = resolve(import.meta.dirname, '../..');
const MIGRACIONES: Migracion[] = readdirSync(resolve(raiz, 'medicion/migrations'))
  .sort()
  .map((nombre) => ({ nombre, sql: readFileSync(resolve(raiz, 'medicion/migrations', nombre), 'utf8') }));
const DE_PARTIDA: Columna[] = columnasDeLaMigracion(MIGRACIONES[0].sql);
const MIGRADAS: Columna[] = MIGRACIONES.flatMap((m) => columnasDeLaMigracion(m.sql));

/** El vocabulario que envía el sitio en vivo de la v7.1, como lo deja `origin/main` antes de la merge. */
const V71: VocabularioDeHuella = vocabularioDeLaPrincipal({
  medicion: {
    EVENTOS: {
      comparticionDeImagen: 'comparticion-de-imagen',
      comparticionDeEnlace: 'comparticion-de-enlace',
      busquedaSinResultados: 'busqueda-sin-resultados',
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
})!;

const COMMIT = 'c'.repeat(40);
const URL_EN_VIVO = 'https://receptor.example/m';

/** Un `rowid` como el de `abs(random())`: entre 0 y 2^63. */
function rowidAleatorio(): bigint {
  const [alto, bajo] = crypto.getRandomValues(new Uint32Array(2));
  return ((BigInt(alto) << 32n) | BigInt(bajo)) & ((1n << 63n) - 1n);
}

type Fila = Record<string, unknown> & { rowid: bigint; jornada: string; evento: string; ruta: string };

/** El receptor de la v7.1: sus siete eventos y sus seis columnas, y nada de la v8. */
function receptorDeLaV71(cuerpo: string, instante: Date): Partial<Registro> | null {
  const registro = interpretar(cuerpo, instante);
  if (registro === null || V71.eventos[registro.evento] === undefined) return null;
  const { jornada, evento, ruta, origen, consulta } = registro;
  const destino = V71.eventos[evento].destino ? registro.destino : null;
  return { jornada, evento, ruta, origen, destino, consulta };
}

interface Opciones {
  sesion?: boolean;
  cambios?: string;
  huella?: string;
  principal?: VocabularioDeHuella;
  receptorDeLaRama?: Efectos['receptor'];
  columnas?: Columna[];
  /** `null`: la base no tiene `d1_migrations`, como la de producción antes de la 23.2. */
  anotadas?: string[] | null;
  codigoDeMigracion?: number;
  /** La migración sale bien y no cambia nada: el `INSERT` de la rama fallará. */
  migracionSinEfecto?: boolean;
  codigoDeDespliegue?: number;
  /** El receptor que contesta en vivo antes de desplegar. */
  enVivo?: 'rama' | 'v71';
  numeracion?: 'aleatoria' | 'contigua';
  escritas24h?: number;
  /** El barajado pierde una fila de una jornada cerrada. */
  barajadoPierde?: boolean;
  /** Las sentencias que fallan, y desde qué vez (1 = la primera). */
  fallos?: { sql: (sql: string) => boolean; desde?: number }[];
  sondeo?: boolean;
}

/** Un mundo de mentira: el D1, el receptor en vivo, git y el disco, con cada llamada apuntada. */
function mundo(opciones: Opciones = {}) {
  const estado = {
    columnas: opciones.columnas ?? DE_PARTIDA,
    anotadas: opciones.anotadas === undefined ? null : opciones.anotadas,
    enVivo: opciones.enVivo ?? 'v71',
    filas: [] as Fila[],
    huellaEscrita: undefined as string | undefined,
  };
  const llamadas: string[] = [];
  const dichos: string[] = [];
  const vecesDe = new Map<number, number>();
  let reloj = Date.parse('2026-10-25T10:00:00.000Z');

  // Lo que ya había, escrito por la v7.1 en orden de llegada.
  let siguiente = 1n;
  for (const [jornada, evento] of [
    ['2026-10-22', 'vista-de-cita'],
    ['2026-10-22', 'copiado'],
    ['2026-10-23', 'vista-de-cita'],
    ['2026-10-24', 'vista-de-superficie'],
    ['2026-10-25', 'vista-de-cita'],
  ]) {
    estado.filas.push({ rowid: siguiente++, jornada, evento, ruta: '/cita/una/', origen: null, destino: null, consulta: null });
  }

  const nombres = () => estado.columnas.map((c) => c.nombre);
  const responder = (filas: unknown[]) => ({ codigo: 0, stdout: JSON.stringify([{ results: filas, success: true }]), stderr: '' });
  const fallar = (texto: string) => ({ codigo: 1, stdout: JSON.stringify({ error: { text: texto } }), stderr: `✘ [ERROR] ${texto}` });

  function ejecutar(sql: string) {
    for (const [i, fallo] of (opciones.fallos ?? []).entries()) {
      if (!fallo.sql(sql)) continue;
      const vez = (vecesDe.get(i) ?? 0) + 1;
      vecesDe.set(i, vez);
      if (vez >= (fallo.desde ?? 1)) return fallar('D1_ERROR: fallo de mentira');
    }
    if (sql === SQL_DE_RECUENTOS) {
      const cuenta = new Map<string, { jornada: string; evento: string; n: number }>();
      for (const fila of estado.filas) {
        if (fila.ruta === RUTA_DE_COMPROBACION) continue;
        const clave = `${fila.jornada} ${fila.evento}`;
        const actual = cuenta.get(clave) ?? { jornada: fila.jornada, evento: fila.evento, n: 0 };
        cuenta.set(clave, { ...actual, n: actual.n + 1 });
      }
      return responder([...cuenta.values()]);
    }
    if (sql === SQL_DE_COLUMNAS) {
      return responder(estado.columnas.map((c, cid) => ({ cid, name: c.nombre, type: c.tipo, notnull: c.noNula ? 1 : 0 })));
    }
    if (sql === SQL_DE_TABLA_DE_MIGRACIONES) return responder(estado.anotadas === null ? [] : [{ name: 'd1_migrations' }]);
    if (sql === SQL_DE_MIGRACIONES_ANOTADAS) return responder((estado.anotadas ?? []).map((name) => ({ name })));
    if (sql === SQL_DE_FILAS) return responder([{ n: estado.filas.length }]);
    if (sql === SQL_DE_BORRADO) {
      estado.filas = estado.filas.filter((f) => f.ruta !== RUTA_DE_COMPROBACION);
      return responder([]);
    }
    if (sql === SQL_DE_BARAJADO) {
      for (const fila of estado.filas) fila.rowid = rowidAleatorio();
      if (opciones.barajadoPierde) estado.filas.splice(0, 1);
      return responder([]);
    }
    if (sql.startsWith('SELECT CAST(rowid AS TEXT) AS fila,')) {
      return responder(
        estado.filas
          .filter((f) => f.ruta === RUTA_DE_COMPROBACION)
          .map(({ rowid, ...resto }) => ({ fila: String(rowid), ...resto })),
      );
    }
    return fallar(`no sé contestar ${sql}`);
  }

  const efectos: Efectos = {
    async wrangler(argumentos) {
      if (argumentos.join(' ') === ARGUMENTOS_DE_SESION.join(' ')) {
        llamadas.push('sesion');
        return { codigo: opciones.sesion === false ? 1 : 0, stdout: JSON.stringify({ loggedIn: opciones.sesion !== false }), stderr: '' };
      }
      if (argumentos.join(' ') === ARGUMENTOS_DE_INFORMACION.join(' ')) {
        llamadas.push('informacion');
        return { codigo: 0, stdout: JSON.stringify({ rows_written_24h: opciones.escritas24h ?? 1_000 }), stderr: '' };
      }
      if (argumentos[0] === 'd1' && argumentos[1] === 'execute') {
        const sql = argumentos[argumentos.length - 1];
        llamadas.push(`consulta ${argumentos[3]} ${sql}`);
        return ejecutar(sql);
      }
      throw new Error(`wrangler de mentira: no sé ${argumentos.join(' ')}`);
    },
    async wranglerALaVista(argumentos) {
      if (argumentos.join(' ') === argumentosDeMigracion('remota').join(' ')) {
        llamadas.push('migrar');
        if ((opciones.codigoDeMigracion ?? 0) === 0 && !opciones.migracionSinEfecto) {
          estado.columnas = MIGRADAS;
          estado.anotadas = MIGRACIONES.map((m) => m.nombre);
        }
        return opciones.codigoDeMigracion ?? 0;
      }
      if (argumentos.join(' ') === ARGUMENTOS_DE_DESPLIEGUE.join(' ')) {
        llamadas.push('desplegar');
        if ((opciones.codigoDeDespliegue ?? 0) === 0) estado.enVivo = 'rama';
        return opciones.codigoDeDespliegue ?? 0;
      }
      throw new Error(`wrangler de mentira: no sé ${argumentos.join(' ')}`);
    },
    async git(argumentos) {
      llamadas.push(`git ${argumentos[0]}`);
      if (argumentos[0] === 'status') return opciones.cambios ?? '';
      if (argumentos.join(' ') === 'rev-parse HEAD') return `${COMMIT}\n`;
      throw new Parada(1, `git de mentira: no sé ${argumentos.join(' ')}`);
    },
    async enviar(_url, cuerpo) {
      llamadas.push('enviar');
      // Como el Worker: el registro que decide su receptor, en un INSERT de sus columnas; si la
      // tabla no las tiene, el INSERT falla y el `catch` lo calla. Contesta 204 siempre.
      const ahora = new Date(reloj);
      const registro = estado.enVivo === 'rama' ? interpretar(cuerpo, ahora) : receptorDeLaV71(cuerpo, ahora);
      if (registro === null) return 204;
      if (Object.keys(registro).some((columna) => !nombres().includes(columna))) return 204;
      const rowid =
        opciones.numeracion === 'contigua'
          ? estado.filas.reduce((max, f) => (f.rowid > max ? f.rowid : max), 0n) + 1n
          : rowidAleatorio();
      estado.filas.push({ ...(registro as Fila), rowid });
      return 204;
    },
    async sondear() {
      llamadas.push('sondear');
      return opciones.sondeo ?? true;
    },
    async leerHuella() {
      return opciones.huella;
    },
    async escribirHuella(texto) {
      llamadas.push('escribir la huella');
      estado.huellaEscrita = texto;
    },
    async migraciones() {
      return MIGRACIONES;
    },
    async vocabularioDeOrigin() {
      llamadas.push('origin/main');
      return { vocabulario: opciones.principal ?? V71, commit: 'b'.repeat(40), fecha: '2026-10-20T10:00:00+02:00' };
    },
    receptor: opciones.receptorDeLaRama ?? interpretar,
    async esperar() {
      llamadas.push('esperar');
    },
    decir(texto) {
      dichos.push(texto);
    },
    ahora() {
      reloj += 1_000;
      return new Date(reloj);
    },
  };

  return { efectos, estado, llamadas, dichos };
}

/** La parada con la que termina una secuencia, o `undefined` si no se para. */
async function paradaDe(promesa: Promise<void>): Promise<Parada | undefined> {
  try {
    await promesa;
    return undefined;
  } catch (error) {
    if (error instanceof Parada) return error;
    throw error;
  }
}

const huellaDeLaRama = () => componerHuella({ escritaEl: '2026-10-24', commit: 'a'.repeat(40), vocabulario: huellaDelVocabulario() });
const balizasQueQuedan = (filas: readonly Fila[]) => filas.filter((f) => f.ruta === RUTA_DE_COMPROBACION);
const remotas = (llamadas: readonly string[]) => llamadas.filter((l) => l.startsWith('consulta '));

describe('Historia 23.2 — desplegar, en su orden', () => {
  it('sesión, árbol, cobertura, recuentos, migrar, desplegar, balizas, cuota, barajar, recuentos y, al final, la huella', async () => {
    const { efectos, estado, llamadas, dichos } = mundo();
    expect(await paradaDe(desplegar(efectos, URL_EN_VIVO))).toBeUndefined();

    const primera = (paso: string) => llamadas.findIndex((l) => l === paso || l.startsWith(paso));
    const orden = [
      'sesion',
      'git status',
      'git rev-parse',
      'origin/main',
      `consulta --remote ${SQL_DE_RECUENTOS}`,
      `consulta --remote ${SQL_DE_COLUMNAS}`,
      'migrar',
      'desplegar',
      'enviar',
      'informacion',
      `consulta --remote ${SQL_DE_BARAJADO}`,
      'escribir la huella',
    ].map(primera);
    expect(orden.every((i) => i >= 0), JSON.stringify(orden)).toBe(true);
    expect(orden).toEqual([...orden].sort((a, b) => a - b));
    // La huella, lo último; y el segundo recuento, entre el barajado y ella.
    expect(llamadas.at(-1)).toBe('escribir la huella');
    expect(llamadas.lastIndexOf(`consulta --remote ${SQL_DE_RECUENTOS}`)).toBeGreaterThan(primera(`consulta --remote ${SQL_DE_BARAJADO}`));
    // Toda consulta va con --remote, explícito.
    expect(remotas(llamadas).every((l) => l.startsWith('consulta --remote '))).toBe(true);

    const leida = leerHuella(estado.huellaEscrita!);
    expect(leida.ok).toBe(true);
    if (leida.ok) {
      expect(leida.huella.commit).toBe(COMMIT);
      expect(leida.huella.vocabulario).toEqual(huellaDelVocabulario());
    }
    // Las balizas, borradas; las filas de antes, todas, y barajadas.
    expect(balizasQueQuedan(estado.filas)).toEqual([]);
    expect(estado.filas).toHaveLength(5);
    expect(estado.filas.every((f) => f.rowid > 2n ** 32n)).toBe(true);
    // Los recuentos de antes y de después, dichos para anotarlos en la 23.3.
    expect(dichos.join('\n')).toContain('Recuentos por (jornada, evento), antes → después');
    expect(dichos.join('\n')).toContain('2026-10-22: copiado 1 → 1, vista-de-cita 1 → 1');
    expect(dichos.join('\n')).toContain(`origin/main: ${'b'.repeat(40)}`);
  });

  it('sin sesión de wrangler: 2, sin nada más', async () => {
    const { efectos, llamadas } = mundo({ sesion: false });
    const parada = await paradaDe(desplegar(efectos, URL_EN_VIVO));
    expect(parada?.codigo).toBe(2);
    expect(llamadas).toEqual(['sesion']);
  });

  it('con cambios sin commitear: 1, sin tocar nada remoto', async () => {
    const { efectos, llamadas } = mundo({ cambios: ' M src/lib/vocabulario.ts\n' });
    const parada = await paradaDe(desplegar(efectos, URL_EN_VIVO));
    expect(parada?.codigo).toBe(1);
    expect(parada?.message).toContain('Hay cambios sin commitear');
    expect(parada?.message).toContain('No se aplicó nada en remoto.');
    expect(remotas(llamadas)).toEqual([]);
  });

  it('con la huella de un desplegar anterior sin commitear, lo dice así', async () => {
    const { efectos } = mundo({ cambios: `?? ${RUTA_DE_LA_HUELLA}\n` });
    const parada = await paradaDe(desplegar(efectos, URL_EN_VIVO));
    expect(parada?.message).toMatch(/La huella que escribió un desplegar anterior está sin commitear/);
  });

  it('un receptor que no cubre lo que envía origin/main no se despliega: 1, sin tocar nada remoto', async () => {
    const sinOrigenEnAcciones: Efectos['receptor'] = (cuerpo, instante) => {
      const registro = interpretar(cuerpo, instante);
      return registro && registro.evento === EVENTOS.copiado ? { ...registro, origen: null } : registro;
    };
    // Aunque la huella versionada —ya de la v8— no pida la Marca de origen en el copiado: el
    // sitio en vivo sigue siendo la v7.1 hasta la merge.
    const { efectos, llamadas } = mundo({ receptorDeLaRama: sinOrigenEnAcciones, huella: huellaDeLaRama() });
    const parada = await paradaDe(desplegar(efectos, URL_EN_VIVO));
    expect(parada?.codigo).toBe(1);
    expect(parada?.message).toContain('origin/main: el receptor no guarda copiado.origen');
    expect(remotas(llamadas)).toEqual([]);
    expect(llamadas).not.toContain('migrar');
  });

  it('una tabla que no es la de partida ni la migrada: 1, sin migrar', async () => {
    const { efectos, llamadas } = mundo({ columnas: [...DE_PARTIDA, { nombre: 'ip', tipo: 'TEXT', noNula: false }] });
    const parada = await paradaDe(desplegar(efectos, URL_EN_VIVO));
    expect(parada?.message).toMatch(/^No se migra: /);
    expect(llamadas).not.toContain('migrar');
    expect(parada?.message).toContain('No se aplicó nada en remoto.');
  });

  it('la migración que falla: 1, sin desplegar, con el instante anterior a migrar', async () => {
    const { efectos, llamadas } = mundo({ codigoDeMigracion: 1 });
    const parada = await paradaDe(desplegar(efectos, URL_EN_VIVO));
    expect(parada?.message).toContain('La migración en remoto falló');
    expect(parada?.message).toContain('quizá parte de las migraciones');
    expect(parada?.message).toContain('Instante anterior a la migración');
    expect(llamadas).not.toContain('desplegar');
  });

  it('las balizas que no llegan —la migración no hizo nada—: 1 tras tres intentos, con la pista, sin barajar ni huella', async () => {
    const { efectos, estado, llamadas } = mundo({ migracionSinEfecto: true });
    const parada = await paradaDe(desplegar(efectos, URL_EN_VIVO));
    expect(parada?.codigo).toBe(1);
    expect(parada?.message).toContain('Las balizas no se vieron como se esperaba tras 3 intentos');
    expect(parada?.message).toContain('No llegó ninguna baliza a la tabla');
    expect(llamadas.filter((l) => l === 'esperar')).toHaveLength(2);
    expect(llamadas).not.toContain(`consulta --remote ${SQL_DE_BARAJADO}`);
    expect(estado.huellaEscrita).toBeUndefined();
    expect(parada?.message).toContain('Quedó aplicado, en este orden: las migraciones en remoto; el receptor desplegado.');
  });

  it('un rowid contiguo: 1, sin barajar ni huella, y las balizas borradas', async () => {
    const { efectos, estado, llamadas } = mundo({ numeracion: 'contigua' });
    const parada = await paradaDe(desplegar(efectos, URL_EN_VIVO));
    expect(parada?.message).toContain('en orden de llegada');
    expect(llamadas).not.toContain(`consulta --remote ${SQL_DE_BARAJADO}`);
    expect(estado.huellaEscrita).toBeUndefined();
    expect(balizasQueQuedan(estado.filas)).toEqual([]);
  });

  it('sin cuota para barajar: 1, sin barajar ni huella', async () => {
    const { efectos, estado, llamadas } = mundo({ escritas24h: 50_000 });
    const parada = await paradaDe(desplegar(efectos, URL_EN_VIVO));
    expect(parada?.message).toContain('El barajado no cabe hoy');
    expect(llamadas).not.toContain(`consulta --remote ${SQL_DE_BARAJADO}`);
    expect(estado.huellaEscrita).toBeUndefined();
  });

  it('unos recuentos que no casan: 1, sin huella, con el instante anterior al barajado', async () => {
    const { efectos, estado, dichos } = mundo({ barajadoPierde: true });
    const parada = await paradaDe(desplegar(efectos, URL_EN_VIVO));
    expect(parada?.message).toContain('Los recuentos de antes y de después no casan');
    expect(parada?.message).toContain('la jornada cerrada 2026-10-22');
    expect(parada?.message).toContain('Instante anterior al barajado');
    expect(parada?.message).toContain('d1 time-travel restore medicion --timestamp=');
    expect(estado.huellaEscrita).toBeUndefined();
    // Los recuentos se dicen también cuando no casan.
    expect(dichos.join('\n')).toContain('Recuentos por (jornada, evento), antes → después');
  });

  it('una lectura que falla a mitad de la comprobación: 1, y las balizas borradas igual', async () => {
    const { efectos, estado } = mundo({ fallos: [{ sql: (sql) => sql.startsWith('SELECT CAST(rowid') }] });
    const parada = await paradaDe(desplegar(efectos, URL_EN_VIVO));
    expect(parada?.message).toContain('No se pudo leer las balizas de prueba');
    expect(parada?.message).toContain('D1_ERROR: fallo de mentira');
    expect(balizasQueQuedan(estado.filas)).toEqual([]);
    expect(estado.huellaEscrita).toBeUndefined();
  });

  it('balizas que casan y no se dejan borrar: 1, con la orden que las borra, sin barajar', async () => {
    // El borrado del principio del intento sale; el del final, no.
    const { efectos, estado, llamadas } = mundo({ fallos: [{ sql: (sql) => sql === SQL_DE_BORRADO, desde: 2 }] });
    const parada = await paradaDe(desplegar(efectos, URL_EN_VIVO));
    expect(parada?.message).toContain('Las balizas casaron, pero no se borraron');
    expect(parada?.message).toContain(`--remote --command "${SQL_DE_BORRADO}"`);
    expect(balizasQueQuedan(estado.filas).length).toBeGreaterThan(0);
    expect(llamadas).not.toContain(`consulta --remote ${SQL_DE_BARAJADO}`);
  });
});

describe('Historia 23.2 — comprobar', () => {
  /** El receptor de la rama ya en vivo, sobre la tabla migrada. */
  const desplegado = (opciones: Opciones = {}) =>
    mundo({ columnas: MIGRADAS, anotadas: MIGRACIONES.map((m) => m.nombre), enVivo: 'rama', huella: huellaDeLaRama(), ...opciones });

  it('casa con la huella: sale, sin migrar, desplegar, barajar ni escribir la huella', async () => {
    const { efectos, estado, llamadas } = desplegado();
    expect(await paradaDe(comprobar(efectos, URL_EN_VIVO))).toBeUndefined();
    for (const prohibida of ['migrar', 'desplegar', 'escribir la huella', `consulta --remote ${SQL_DE_BARAJADO}`]) {
      expect(llamadas).not.toContain(prohibida);
    }
    expect(balizasQueQuedan(estado.filas)).toEqual([]);
  });

  it('sin huella: 1, diciendo que la escribe desplegar', async () => {
    const { efectos } = desplegado({ huella: undefined });
    const parada = await paradaDe(comprobar(efectos, URL_EN_VIVO));
    expect(parada?.codigo).toBe(1);
    expect(parada?.message).toContain('la escribe npm run medicion -- desplegar (Historia 23.3)');
  });

  it('el receptor de la v7.1 en vivo: 1, nombrando lo que falta y que la cierra repetir la 23.3', async () => {
    const { efectos, estado } = desplegado({ enVivo: 'v71' });
    const parada = await paradaDe(comprobar(efectos, URL_EN_VIVO));
    expect(parada?.message).toMatch(/falta: evento=lectura/);
    expect(parada?.message).toContain('La cierra repetir la 23.3');
    expect(balizasQueQuedan(estado.filas)).toEqual([]);
  });

  it('un receptor que numera en orden de llegada: 1, con el cierre una sola vez', async () => {
    const { efectos } = desplegado({ numeracion: 'contigua' });
    const parada = await paradaDe(comprobar(efectos, URL_EN_VIVO));
    expect(parada?.message).toContain('en orden de llegada');
    expect(parada?.message.split('La cierra repetir la 23.3')).toHaveLength(2);
  });

  it('sin sesión: 2', async () => {
    const { efectos } = desplegado({ sesion: false });
    expect((await paradaDe(comprobar(efectos, URL_EN_VIVO)))?.codigo).toBe(2);
  });
});

describe('Historia 23.2 — ensayo, contra el receptor local', () => {
  it('con el receptor de la rama: sale, y toda consulta va con --local', async () => {
    const { efectos, estado, llamadas, dichos } = mundo({ columnas: MIGRADAS, enVivo: 'rama' });
    expect(await paradaDe(ensayo(efectos))).toBeUndefined();
    expect(remotas(llamadas).length).toBeGreaterThan(0);
    expect(remotas(llamadas).every((l) => l.startsWith('consulta --local '))).toBe(true);
    expect(balizasQueQuedan(estado.filas)).toEqual([]);
    expect(dichos.at(-1)).toMatch(/lo ajeno se descartó/);
  });

  it('sin receptor local: 1, diciendo cómo arrancarlo', async () => {
    const { efectos, llamadas } = mundo({ sondeo: false });
    const parada = await paradaDe(ensayo(efectos));
    expect(parada?.message).toContain(`no responde en ${PUNTO_FINAL_LOCAL}`);
    expect(remotas(llamadas)).toEqual([]);
  });

  it('un receptor que guardara lo ajeno no pasa', async () => {
    // Guarda la consulta en todo evento: el texto libre fuera de su evento.
    const { efectos } = mundo({ columnas: MIGRADAS, enVivo: 'rama' });
    const original = efectos.enviar;
    efectos.enviar = async (url, cuerpo) => {
      const carga = JSON.parse(cuerpo) as Record<string, unknown>;
      if (typeof carga.datos === 'string') carga.evento = EVENTOS.busquedaSinResultados;
      return original(url, JSON.stringify(carga));
    };
    const parada = await paradaDe(ensayo(efectos));
    expect(parada?.message).toMatch(/sobra: /);
  });
});

it('las columnas de la mentira son las del esquema: jornada, evento, ruta y cada campo', () => {
  expect(MIGRADAS.map((c) => c.nombre)).toEqual(['jornada', 'evento', 'ruta', ...CAMPOS]);
});
