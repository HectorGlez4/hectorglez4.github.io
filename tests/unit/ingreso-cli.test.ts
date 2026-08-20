import { afterAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { parse as parsearYaml } from 'yaml';
import { RAIZ } from './ayuda/construir.js';
import { MODELOS, modeloDe, type Modelo, type QueDisparaElUmbral } from '../../src/lib/ingreso.ts';
import { milesEnEspañol } from '../../src/lib/formato.ts';
import {
  CAMPO_DE_LECTURA,
  MILISEGUNDOS_DE_ESPERA,
  MOTIVO_DE_DIRECCION_INVALIDA,
  anotaciones,
  escaparAnotacion,
  estadoDe,
  estadosDe,
  interpretarLectura,
  lineasDelInforme,
  receptorDe,
  receptorQueNoContesta,
  sanearMensajeDeRed,
} from '../../tools/lib/ingresos.ts';
import { SESIONES_PARA_AFILIACION, SESIONES_PARA_PUBLICIDAD } from '../../src/lib/umbrales.ts';

const ejecutar = promisify(execFile);

/**
 * Historia 14.1 — la matriz del mando que informa y no enciende nada.
 *
 * Las tres situaciones del receptor son las tres de la especificación: sin desplegar —que es
 * hoy, con LC-4 abierta—, caído, y contestando una cifra que cruza un Umbral. Las dos
 * primeras se recorren de verdad por la orden; la tercera necesita un receptor que conteste,
 * y se levanta uno en `127.0.0.1` en vez de fingir la respuesta: lo que se quiere comprobar
 * es que la orden **no inventa cifra** y que sabe leer una de verdad cuando la hay.
 *
 * Y lo que atraviesa las tres: la orden sale con **código 0** pase lo que pase. El paso de CI
 * que la llama es el que despliega el sitio en vivo.
 */

const servidores: Server[] = [];
afterAll(async () => {
  await Promise.all(
    servidores.splice(0).map(
      (s) =>
        new Promise<void>((listo) => {
          // `close` espera a que se cierren los sockets, y `fetch` deja los suyos abiertos
          // en keep-alive: sin cortarlos a mano, este `afterAll` se queda esperando a nadie.
          s.closeAllConnections();
          s.close(() => listo());
        }),
    ),
  );
});

/** Un receptor de mentira que contesta lo que se le diga. Devuelve su dirección. */
async function receptorQueContesta(cuerpo: string, tipo = 'application/json'): Promise<string> {
  const servidor = createServer((_, respuesta) => {
    respuesta.writeHead(200, { 'content-type': tipo }).end(cuerpo);
  });
  servidores.push(servidor);
  await new Promise<void>((listo) => servidor.listen(0, '127.0.0.1', listo));
  return direccionDe(servidor);
}

/**
 * Un receptor caído: acepta la conexión y la corta sin contestar.
 *
 * Antes esto abría un puerto y lo cerraba para provocar un rechazo, y era una prueba que
 * pasaba o fallaba según quién ocupara ese puerto entre el cierre y la petición. Cortar el
 * socket es la misma avería para quien pregunta —no hay respuesta— y no depende de nadie.
 */
async function receptorCaido(): Promise<string> {
  const servidor = createServer();
  servidor.on('connection', (socket) => socket.destroy());
  servidores.push(servidor);
  await new Promise<void>((listo) => servidor.listen(0, '127.0.0.1', listo));
  return direccionDe(servidor);
}

/**
 * Un receptor colgado: acepta, y no contesta nunca. Es el caso para el que existe el tiempo
 * de espera acotado, y el único que ningún otro servidor de mentira reproduce.
 */
async function receptorColgado(): Promise<string> {
  const servidor = createServer(() => {
    /* Ni `end()` ni `writeHead()`: la petición se queda abierta hasta que expire la espera. */
  });
  servidores.push(servidor);
  await new Promise<void>((listo) => servidor.listen(0, '127.0.0.1', listo));
  return direccionDe(servidor);
}

function direccionDe(servidor: Server): string {
  const direccion = servidor.address();
  if (direccion === null || typeof direccion === 'string') throw new Error('sin puerto');
  return `http://127.0.0.1:${direccion.port}/medicion`;
}

async function correr(argumentos: string[], entorno: Record<string, string> = {}) {
  try {
    const { stdout, stderr } = await ejecutar('npx', ['tsx', resolve(RAIZ, 'tools/ingreso.ts'), ...argumentos], {
      cwd: RAIZ,
      // Sin heredar `MEDICION_ENDPOINT` de quien corre las pruebas: la orden se mide contra
      // el receptor que cada caso decide, y no contra el de la máquina.
      env: { ...process.env, MEDICION_ENDPOINT: '', ...entorno },
    });
    return { codigo: 0, salida: stdout, error: stderr };
  } catch (e) {
    const fallo = e as { code?: number; stdout?: string; stderr?: string };
    return { codigo: fallo.code ?? 1, salida: fallo.stdout ?? '', error: fallo.stderr ?? '' };
  }
}

const cruzaTodos = { [CAMPO_DE_LECTURA]: SESIONES_PARA_PUBLICIDAD + 1 };
const cruzaSoloAfiliacion = { [CAMPO_DE_LECTURA]: SESIONES_PARA_AFILIACION };

describe('Historia 14.1 — el receptor sin desplegar, que es hoy', () => {
  it('dice que la cifra no es medible todavía y nombra la condición que falta', async () => {
    const { codigo, salida } = await correr([]);
    expect(codigo).toBe(0);
    expect(salida).toContain('LC-4');
    expect(salida).toContain('MEDICION_ENDPOINT');
  });

  it('y enseña los cuatro Modelos apagados con su Umbral', async () => {
    const { salida } = await correr([]);
    for (const modelo of MODELOS) expect(salida, modelo.id).toContain(modelo.nombre);
    expect(salida).not.toContain('ENCENDIDO');
    expect([...salida.matchAll(/Estado:\s+apagado/g)]).toHaveLength(MODELOS.length);
  });

  it('no inventa ninguna cifra', async () => {
    const { salida } = await correr([]);
    expect(salida).not.toMatch(/\d+ sesiones orgánicas\/mes medidas/);
  });

  it('sin endpoint el motivo no es una avería, es LC-4', () => {
    const respuesta = receptorDe({});
    expect(typeof respuesta).not.toBe('string');
    expect((respuesta as { motivo: string }).motivo).toContain('LC-4');
  });
});

describe('Historia 14.1 — el receptor caído', () => {
  it('lo dice, no inventa cifra y sale con código 0', async () => {
    const { codigo, salida } = await correr([], { MEDICION_ENDPOINT: await receptorCaido() });
    expect(codigo).toBe(0);
    expect(salida).toContain('no responde');
    expect(salida).not.toMatch(/\d+ sesiones orgánicas\/mes medidas/);
  });

  it('un receptor que contesta sin publicar lectura tampoco produce cifra', () => {
    // Es el caso de hoy si LC-4 se cerrara sin más: el Worker de `medicion/` contesta 204 a
    // todo lo que no sea una baliza. Escribe y no publica, y el mando lo dice así.
    const medida = interpretarLectura(204, null, '');
    expect(medida.medible).toBe(false);
    expect((medida as { motivo: string }).motivo).toContain('no publica ninguna lectura');
  });

  it('una respuesta sin la cifra esperada no vale como cifra', () => {
    const json = 'application/json';
    expect(interpretarLectura(200, json, JSON.stringify({ otra: 9 })).medible).toBe(false);
    expect(interpretarLectura(200, json, JSON.stringify({ [CAMPO_DE_LECTURA]: 'muchas' })).medible).toBe(false);
    expect(interpretarLectura(200, json, JSON.stringify({ [CAMPO_DE_LECTURA]: -3 })).medible).toBe(false);
    // Ni decimales ni cifras fuera de lo que un número representa con exactitud: con `2500,7`
    // se comparaba el decimal contra el Umbral y se imprimía «2.500», y a partir de 1e21
    // `String()` da notación exponencial y la agrupación de miles la destroza.
    expect(interpretarLectura(200, json, JSON.stringify({ [CAMPO_DE_LECTURA]: 2500.7 })).medible).toBe(false);
    expect(interpretarLectura(200, json, JSON.stringify({ [CAMPO_DE_LECTURA]: 1e21 })).medible).toBe(false);
  });

  it('un error del receptor tampoco', () => {
    const medida = interpretarLectura(500, 'application/json', 'vaya');
    expect(medida.medible).toBe(false);
    expect((medida as { motivo: string }).motivo).toContain('500');
  });

  it('un receptor colgado se corta por la espera acotada, y la orden vuelve', async () => {
    /*
     * El caso que ningún otro servidor de mentira reproduce: acepta y no contesta nunca. Sin
     * `AbortSignal.timeout` la orden no vuelve jamás en la terminal, y en el flujo diario la
     * tapa `timeout-minutes` marcando el paso como fallido-tolerado y sin informe — o sea,
     * dos minutos perdidos y ningún aviso, que es exactamente lo que el aviso existe para
     * que no pase.
     */
    const empezo = Date.now();
    const { codigo, salida } = await correr([], { MEDICION_ENDPOINT: await receptorColgado() });
    expect(codigo).toBe(0);
    expect(salida).toContain('no responde');
    expect(Date.now() - empezo).toBeLessThan(MILISEGUNDOS_DE_ESPERA * 4);
  }, 30_000);

  it('una página de error con 200 no se confunde con un receptor mudo', () => {
    // Un portal cautivo o una red intermedia contestan HTML con 2xx. Diagnosticarlo como
    // «contesta y no publica lectura» manda a arreglar el Worker, que no es lo que está mal.
    const medida = interpretarLectura(200, 'text/html', '<html><body>Vaya</body></html>');
    expect(medida.medible).toBe(false);
    expect((medida as { motivo: string }).motivo).toContain('text/html');
    expect((medida as { motivo: string }).motivo).not.toContain('no publica ninguna lectura');
  });

  it('un MEDICION_ENDPOINT que no es una dirección se diagnostica como tal', async () => {
    // Antes se caía en el `fetch`, salía «el receptor no responde» y mandaba a mirar el
    // Worker: a arreglar lo que no estaba roto.
    expect(receptorDe({ MEDICION_ENDPOINT: 'midominio.example/m' })).toEqual({
      medible: false,
      motivo: MOTIVO_DE_DIRECCION_INVALIDA,
    });
    expect(receptorDe({ MEDICION_ENDPOINT: 'file:///etc/hosts' })).toEqual({
      medible: false,
      motivo: MOTIVO_DE_DIRECCION_INVALIDA,
    });
    // Y una dirección buena sí pasa: sin esto, un validador que rechazara todo daría verde.
    expect(receptorDe({ MEDICION_ENDPOINT: 'https://ejemplo.test/m' })).toBe('https://ejemplo.test/m');
  });

  it('el informe no publica nunca la dirección del receptor', async () => {
    /*
     * Camino de fuga de un secreto: `fetch` mete la dirección en lo que lanza, el informe la
     * escribía dentro del motivo, y de ahí pasa por `tee` al resumen del flujo, que es
     * público. Se comprueba en el módulo y también por la orden entera, que es el camino que
     * de verdad recorre el secreto.
     */
    const url = 'https://receptor-secreto.example/ruta-privada';
    expect(receptorQueNoContesta(new Error(`Failed to parse URL from ${url}`), url).medible).toBe(false);
    expect(JSON.stringify(receptorQueNoContesta(new Error(`fallo en ${url}`), url))).not.toContain('receptor-secreto');
    expect(sanearMensajeDeRed(`no llego a ${url}`)).not.toContain('receptor-secreto');

    const caido = await receptorCaido();
    const { salida, error } = await correr([], { MEDICION_ENDPOINT: caido });
    expect(salida).not.toContain(caido);
    expect(error).not.toContain(caido);
    // Y no por casualidad de que el motivo salga escueto: se dice qué pasa, sin la dirección.
    expect(salida).toContain('no responde');
  });

  it('y una lectura de verdad sí', () => {
    // El control positivo: sin él, un `interpretarLectura` que dijera siempre «no medible»
    // pasaría las tres pruebas de arriba.
    expect(
      interpretarLectura(200, 'application/json; charset=utf-8', JSON.stringify({ [CAMPO_DE_LECTURA]: 7 })),
    ).toEqual({ medible: true, sesiones: 7 });
  });
});

describe('Historia 14.1 — un Umbral cruzado avisa, y no enciende nada', () => {
  it('avisa de los tres numéricos y sigue saliendo con código 0', async () => {
    const endpoint = await receptorQueContesta(JSON.stringify(cruzaTodos));
    const { codigo, salida } = await correr([], { MEDICION_ENDPOINT: endpoint });
    expect(codigo).toBe(0);
    expect([...salida.matchAll(/Umbral cruzado/g)].length).toBeGreaterThanOrEqual(3);
    // Y el estado no se ha movido ni un milímetro: sigue apagado en el mismo informe.
    expect(salida).not.toContain('ENCENDIDO');
    expect(salida).toContain('Esta orden no enciende nada');
  });

  it('en la afiliación el aviso dice SOLICITAR, y no que se pueda encender', async () => {
    /*
     * La fila que obliga a que el modelo de datos sepa distinguir. Solicitar arranca el reloj
     * de 3 ventas en 180 días que ya cerró la cuenta del proyecto una vez, así que confundir
     * los dos verbos aquí no es un matiz de redacción: es empezar una cuenta atrás.
     */
    const estado = estadoDe(modeloDe('afiliacion-de-libros') as Modelo, {
      medible: true,
      sesiones: SESIONES_PARA_AFILIACION,
    });
    expect(estado.cruzado).toBe(true);
    expect(estado.accion).toBe('solicitar');
    expect(estado.aviso).toContain('SOLICITAR');
    expect(estado.aviso).not.toContain('se puede ENCENDER');
  });

  it('y en los demás dice que se puede encender, con el diff como camino', () => {
    const estado = estadoDe(modeloDe('publicidad-acotada') as Modelo, {
      medible: true,
      sesiones: SESIONES_PARA_PUBLICIDAD,
    });
    expect(estado.accion).toBe('encender');
    expect(estado.aviso).toContain('src/lib/ingreso.ts');
  });

  it('la cifra justo por debajo no cruza nada', () => {
    const estado = estadoDe(modeloDe('afiliacion-de-libros') as Modelo, {
      medible: true,
      sesiones: SESIONES_PARA_AFILIACION - 1,
    });
    expect(estado.cruzado).toBe(false);
    expect(estado.accion).toBe('ninguna');
    expect(estado.aviso).toBeUndefined();
  });

  it('el Umbral de donaciones no lo cruza ninguna cifra', () => {
    // Ni siquiera una enorme: sus condiciones no son un número, y `cruzado` es `null` —que
    // no es lo mismo que `false`— porque desde aquí no se sabe.
    const estado = estadoDe(modeloDe('donaciones') as Modelo, { medible: true, sesiones: 10 ** 6 });
    expect(estado.cruzado).toBeNull();
    expect(estado.accion).toBe('ninguna');
    expect(estado.cifra).toContain('LC-4');
  });

  it('un Modelo ya encendido no avisa de nada: su decisión ya está en git', () => {
    const encendido = { ...(modeloDe('publicidad-acotada') as Modelo), encendido: true };
    const estado = estadoDe(encendido, { medible: true, sesiones: SESIONES_PARA_PUBLICIDAD });
    expect(estado.cruzado).toBe(true);
    expect(estado.aviso).toBeUndefined();
  });
});

describe('Historia 14.1 — las anotaciones del flujo, solo cuando se piden', () => {
  it('con `--anotar` sale un ::warning:: por Umbral cruzado, y jamás un ::error::', async () => {
    const endpoint = await receptorQueContesta(JSON.stringify(cruzaSoloAfiliacion));
    const { codigo, error } = await correr(['--anotar'], { MEDICION_ENDPOINT: endpoint });
    expect(codigo).toBe(0);
    expect(error).toContain('::warning');
    expect(error).not.toContain('::error');
    expect(error).toContain('SOLICITAR');
  });

  it('sin la bandera no se anota nada: la salida no cambia según dónde se ejecute', async () => {
    const endpoint = await receptorQueContesta(JSON.stringify(cruzaSoloAfiliacion));
    const { error } = await correr([], { MEDICION_ENDPOINT: endpoint });
    expect(error).not.toContain('::warning');
  });

  it('sin Umbral cruzado no hay anotación que emitir', () => {
    expect(anotaciones(estadosDe({ medible: false, motivo: 'da igual' }))).toEqual([]);
  });
});

describe('Historia 14.1 — el mando informa, y nada más', () => {
  it('no escribe en ninguna parte', () => {
    // «Informa la decisión del editor, no la sustituye» tiene que ser verdad por
    // construcción: sin escritura no hay forma de que el mando encienda nada.
    const fuente = readFileSync(resolve(RAIZ, 'tools/lib/ingresos.ts'), 'utf8');
    const orden = readFileSync(resolve(RAIZ, 'tools/ingreso.ts'), 'utf8');
    for (const prohibido of ['writeFile', 'node:fs', 'rename', 'rm(']) {
      expect(fuente, prohibido).not.toContain(prohibido);
      expect(orden, prohibido).not.toContain(prohibido);
    }
  });

  it('la red vive en la cáscara y no en el módulo — AD-22', () => {
    // La tercera excepción del barrido de `andamiaje.test.ts` es la orden, no el módulo:
    // así lo que hay que probar sin levantar un servidor se prueba sin levantarlo.
    expect(readFileSync(resolve(RAIZ, 'tools/lib/ingresos.ts'), 'utf8')).not.toContain('fetch(');
    expect(readFileSync(resolve(RAIZ, 'tools/ingreso.ts'), 'utf8')).toContain('fetch(');
  });

  it('el informe dice dónde puede aparecer cada Modelo', () => {
    const texto = lineasDelInforme(estadosDe({ medible: false, motivo: 'sin receptor' })).join('\n');
    expect(texto).toContain('index.astro');
    expect(texto).toContain('ninguna todavía');
  });

  it('una invocación mal escrita se rechaza con 2, que no es cosa del receptor', async () => {
    const { codigo, error } = await correr(['--anotarr']);
    expect(codigo).toBe(2);
    expect(error).toContain('--anotarr');
  });

  it('`--ayuda` enseña el uso y sale con 0: pedir ayuda no es equivocarse', async () => {
    const { codigo, salida } = await correr(['--ayuda']);
    expect(codigo).toBe(0);
    expect(salida).toContain('--anotar');
    expect(salida).toContain('--json');
  });

  it('con `--json --anotar` la salida estándar sigue siendo JSON parseable', async () => {
    /*
     * La invariante que el propio diseño nombra como razón de que las anotaciones vayan por
     * la salida de error: quien encadene `--json` no puede encontrarse un `::warning::` en
     * medio. Se prueba con un Umbral cruzado, que es el único caso en que hay anotación.
     */
    const endpoint = await receptorQueContesta(JSON.stringify(cruzaSoloAfiliacion));
    const { codigo, salida, error } = await correr(['--json', '--anotar'], {
      MEDICION_ENDPOINT: endpoint,
    });
    expect(codigo).toBe(0);
    expect(() => JSON.parse(salida)).not.toThrow();
    expect(salida).not.toContain('::warning');
    expect(error).toContain('::warning');
  });

  it('con `--json` sale la misma información como datos', async () => {
    const { codigo, salida } = await correr(['--json']);
    expect(codigo).toBe(0);
    const datos = JSON.parse(salida) as {
      medida: { medible: boolean };
      modelos: { id: string; encendido: boolean; cruzado: boolean | null }[];
    };
    expect(datos.medida.medible).toBe(false);
    expect(datos.modelos).toHaveLength(MODELOS.length);
    expect(datos.modelos.every((m) => !m.encendido)).toBe(true);
  });
});

describe('Historia 14.1 — lo que el informe escribe', () => {
  it('publica la nota de cada Modelo, que es lo que lo explica sin abrir el módulo', () => {
    // Cuatro notas redactadas que no llegaban a ninguna salida valían lo mismo que ninguna.
    const texto = lineasDelInforme(estadosDe({ medible: false, motivo: 'sin receptor' })).join('\n');
    for (const modelo of MODELOS) expect(texto, modelo.id).toContain(modelo.nota);
  });

  it('escribe los números en español, con punto de millar', () => {
    // Sin prueba directa, quitarle el `\B` al formateador hacía que el informe dijera
    // «.2.000» y devolver `String(entero)` que dijera «2000»: nada fallaba.
    expect(milesEnEspañol(2000)).toBe('2.000');
    expect(milesEnEspañol(25000)).toBe('25.000');
    expect(milesEnEspañol(999)).toBe('999');
    expect(milesEnEspañol(1000000)).toBe('1.000.000');
    expect(milesEnEspañol(0)).toBe('0');
    // Y no devuelve vacío ante nada, que es lo que dejaría pasar vacíamente a las dos
    // aserciones de «no inventa ninguna cifra»: su regex exige un dígito delante.
    expect(milesEnEspañol(7)).toBe('7');
  });

  it('y el informe los escribe así, no con punto decimal ni pelados', () => {
    const texto = lineasDelInforme(estadosDe({ medible: true, sesiones: 30000 })).join('\n');
    expect(texto).toContain('2.000 sesiones');
    expect(texto).toContain('30.000 sesiones orgánicas/mes medidas');
  });

  it('una clase de disparo sin frase redactada rompe en vez de autorizar a encender', () => {
    /*
     * La evidencia en ejecución del `switch` exhaustivo. Con el ternario anterior, un tercer
     * valor caía en «se puede ENCENDER»: un Modelo nuevo autorizaría a encenderse sin que lo
     * decidiera nadie. Ahora no compila, y si alguien fuerza el tipo, tampoco corre.
     */
    const inventado = {
      ...(modeloDe('producto-propio') as Modelo),
      dispara: 'pide-permiso' as QueDisparaElUmbral,
    };
    expect(() => estadoDe(inventado, { medible: true, sesiones: 10 ** 6 })).toThrow(/pide-permiso/);
  });

  it('las anotaciones se escapan para que una sola línea no se parta en CI', () => {
    // Una anotación es una línea: un salto la parte y el Umbral cruzado deja de verse. El
    // `%` es el carácter de escape del propio formato.
    expect(escaparAnotacion('sube un 50% y\nsigue')).toBe('sube un 50%25 y%0Asigue');
    expect(escaparAnotacion('sin nada raro')).toBe('sin nada raro');
  });
});

describe('Historia 14.1 — el paso de CI avisa y no puede tumbar el despliegue', () => {
  const flujo = parsearYaml(readFileSync(resolve(RAIZ, '.github/workflows/publicar.yml'), 'utf8')) as {
    on: Record<string, unknown>;
    jobs: Record<
      string,
      {
        steps: {
          name?: string;
          run?: string;
          if?: string;
          shell?: string;
          env?: Record<string, string>;
          'continue-on-error'?: boolean;
          'timeout-minutes'?: number;
        }[];
      }
    >;
  };
  const paso = flujo.jobs.construir.steps.find((p) => (p.run ?? '').includes('ingreso'));

  it('existe, y está en el flujo diario que reconstruye el sitio', () => {
    expect(paso).toBeDefined();
    expect(flujo.on).toHaveProperty('schedule');
    expect(paso?.run).toContain('--anotar');
  });

  it('le pasa el receptor, sin lo cual el aviso no puede avisar de nada', () => {
    /*
     * El agujero que esta aserción tapa: **borrar las dos líneas de `env` dejaba la suite
     * entera en verde** y apagaba el aviso para siempre. Y el síntoma —«todavía no es
     * medible: falta LC-4»— es indistinguible del estado legítimo de hoy, así que nadie lo
     * leería como avería, tampoco el día que LC-4 se cierre. Misma forma que la aserción de
     * `FECHA_JORNADA` en `tests/unit/publicacion.test.ts`.
     */
    expect(paso?.env?.MEDICION_ENDPOINT).toBe('${{ secrets.MEDICION_ENDPOINT }}');
  });

  it('no puede fallar el flujo: continúa ante el error y tiene el tiempo acotado', () => {
    /*
     * El criterio, no la cortesía: este flujo es el que despliega. Sin esto, un receptor
     * caído tumbaría la reconstrucción diaria del sitio publicado por un problema del plano
     * que el sitio nunca lee, que es la dependencia que AD-14 existe para impedir.
     */
    expect(paso?.['continue-on-error']).toBe(true);
    expect(paso?.['timeout-minutes']).toBeGreaterThan(0);
  });

  it('y aun así se entera de que la orden se rompió, en vez de dar un resumen vacío', () => {
    // `shell: bash` trae `-o pipefail`: sin él el código de la tubería es el de `tee` y un
    // `tsx` roto pasaba en verde con el resumen en blanco. El `||` deja escrito que esta
    // reconstrucción fue sin aviso, que no es lo mismo que no tener nada que avisar.
    expect(paso?.shell).toBe('bash');
    expect(paso?.run).toMatch(/\|\|\s*\n?\s*echo/);
    expect(paso?.run).toContain('sin aviso de Umbrales');
  });

  it('solo corre donde el secreto llega de verdad', () => {
    // Desde una bifurcación el secreto llega vacío y el informe diría «falta LC-4»:
    // indistinguible del estado legítimo, o sea un aviso que miente en vez de faltar.
    expect(paso?.if).toContain('schedule');
    expect(paso?.if).toContain('push');
  });

  it('el informe va al resumen envuelto en un bloque de código', () => {
    // `$GITHUB_STEP_SUMMARY` se renderiza como Markdown: crudo, la caja de ═ y el sangrado
    // se colapsan en un párrafo ilegible justo donde se mira si un Umbral se cruzó.
    expect(paso?.run).toContain('GITHUB_STEP_SUMMARY');
    expect([...(paso?.run ?? '').matchAll(/```/g)]).toHaveLength(2);
  });

  it('el paso no escribe ningún Umbral: los lee de la orden', () => {
    // AD-9 sobre el flujo. Un número aquí sería el segundo sitio donde vive un Umbral, y en
    // el sitio donde menos se mira.
    const texto = readFileSync(resolve(RAIZ, '.github/workflows/publicar.yml'), 'utf8');
    for (const cifra of [SESIONES_PARA_AFILIACION, SESIONES_PARA_PUBLICIDAD]) {
      expect(texto, String(cifra)).not.toContain(String(cifra));
    }
  });
});
