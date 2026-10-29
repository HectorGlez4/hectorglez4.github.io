import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { Script, runInNewContext } from 'node:vm';
import ts from 'typescript';
import { parseSync } from 'vite';
import {
  ARRANQUE_DE_MEDICION,
  ASENTAMIENTO_DE_BUSQUEDA,
  ATRIBUTO_DE_INDEXABLE,
  ATRIBUTO_DE_ZONA,
  ATRIBUTO_SIN_ZONA,
  EVENTOS,
  EVENTOS_DEL_GUION,
  EVENTOS_DE_VISTA,
  EVENTOS_SOLO_DEL_FICHERO,
  EVENTOS_VALIDOS,
  EXENCIONES_DE_ZONA,
  INTERACCIONES_DE_LECTURA,
  MARCAS_DE_LLEGADA,
  MARCA_DE_BUSQUEDA_ASENTADA,
  SIN_MARCAS_DE_LLEGADA,
  asentamientoDeBusqueda,
  esEventoValido,
  guionDeMedicion,
  puntoFinal,
  rutaDelGuionDeMedicion,
  versionDelGuion,
  type ExencionDeZona,
} from '../../src/lib/medicion.ts';
import { anunciar, guionQueAnuncia } from '../../src/lib/anuncio.ts';
import { GUIONES_EXTERNOS, entradaDeLoDescargado, guionExternoDe } from '../../src/lib/guiones.ts';
import {
  CITAS_POR_PAGINA,
  MAX_BYTES_DE_GUION,
  MAX_BYTES_GUION_DE_MEDICION,
  MAX_CARACTERES_IMAGEN,
  MIN_MS_VISIBLES_PARA_LA_LECTURA,
  PAUSA_DE_LOS_SELECTORES_MS,
  PAUSA_DE_TECLEO_MS,
} from '../../src/lib/umbrales.ts';
import {
  DESTINOS_DE_DESCARGA,
  FILTROS,
  MARCAS_DE_OBRA,
  METRICA_DE_ACCION,
  PARAMETRO_DE_DIFUSION,
  TRAMOS,
  ZONAS,
  filtrosUsados,
  tramoDe,
  type Zona,
} from '../../src/lib/vocabulario.ts';
import { SITIO } from '../../src/lib/dominio.ts';
import { PARAMETRO_DE_ORIGEN } from '../../src/lib/redes.ts';
import {
  bytesDeGuionEnLinea,
  descargaDeLaEntrada,
  etiquetasDeGuionExterno,
  guionesEjecutables,
  guionesEnLinea,
  guionesEnLineaConTipo,
  guionesExternosDe,
  importacionesEstaticasDe,
} from './ayuda/guion.js';
import {
  consecuenciasDe,
  declararRutasIndexables,
  olvidarRutasIndexables,
  rutaDelDirectorioDeAutores,
  rutaDelDirectorioDeObras,
  superficieDeclaradaDe,
  superficiesDelBarrido,
} from '../../src/lib/superficies.ts';
import { marcasDePagina } from '../../tools/lib/indexables.ts';
import { ORIGEN_DEL_SANDBOX, medicionEnUnSandbox } from './ayuda/medicion.js';
import {
  islaDeBusquedaEnUnSandbox,
  type OpcionesDeLaIsla,
  type OpcionesDeSearch,
  type Respuesta,
} from './ayuda/busqueda.js';
import { aplanar } from './ayuda/aplanar.js';
import { CLAVE_DEL_ESTADO_EN_LA_ENTRADA } from '../../src/lib/busqueda.ts';
import {
  ETIQUETAS_DE_RESULTADO,
  FILTRO_DE_TIPO,
  FILTROS_DE_CITA,
  OPCIONES_DE_PAGEFIND,
  ORDEN_DE_CITA,
  TIPOS_CON_LINEA_DE_AUTOR,
  TIPOS_CON_TITULO_EN_SANS,
} from '../../src/lib/tipoDeResultado.ts';
import { MARCA as MARCA_DEL_SITIO } from '../../src/lib/marca.ts';
import { enlacesDe, recorrerElementos, type Declaracion, type Elemento } from './ayuda/enlaces.js';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  coleccionValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';

const RAIZ = resolve(import.meta.dirname, '../..');
const aLimpiar: string[] = [];

/**
 * Historia 26.6 — el fichero que Astro emite para el `<script>` de `FiltroDelDirectorio.astro`,
 * sin su resumen, y las dos páginas que lo piden.
 */
const FICHERO_DEL_FILTRO = 'FiltroDelDirectorio.astro_astro_type_script_index_0_lang';
const RUTAS_DEL_FILTRO = [rutaDelDirectorioDeAutores(), rutaDelDirectorioDeObras()];
/** Historia 27.2 — el fichero del `<script>` de `Busqueda.astro`, sin su resumen, y la página que lo pide. */
const FICHERO_DE_LA_BUSQUEDA = 'Busqueda.astro_astro_type_script_index_0_lang';
const RUTA_DE_LA_BUSQUEDA = '/buscar/';
/** Las páginas que piden un guion empaquetado, con o sin punto final de medición. */
const RUTAS_EMPAQUETADAS = [...RUTAS_DEL_FILTRO, RUTA_DE_LA_BUSQUEDA];

/** Espacios colapsados: Vitest y el build transforman `anunciar` con el mismo esbuild. */
const colapsado = (texto: string) => texto.replace(/\s+/g, ' ').trim();
/** El texto de `anunciar` tal como viaja dentro del guion de una isla. */
const ANUNCIAR = colapsado(String(anunciar));
/** Lo que queda del guion de una isla sin el texto de `anunciar` que le mete `guionQueAnuncia`. */
const sinAnunciar = (guion: string) => colapsado(guion).split(ANUNCIAR).join('');

/** Los `.ts` y `.astro` de `src/`, salvo el propio módulo de medición. */
function fuentesDeSrc(): string[] {
  return (function recorrer(dir: string): string[] {
    return readdirSync(dir).flatMap((entrada) => {
      const ruta = join(dir, entrada);
      if (statSync(ruta).isDirectory()) return recorrer(ruta);
      return /\.(ts|astro)$/.test(entrada) ? [ruta] : [];
    });
  })(resolve(RAIZ, 'src')).filter((f) => !f.endsWith('lib/medicion.ts'));
}

/**
 * Los atributos de cada `<script` de un fichero fuente, hasta su `>` de cierre: las llaves de
 * una expresión de Astro (`define:vars={{ … }}`, `set:html={…}`) pueden llevar `>` dentro.
 */
function atributosDeScript(fuente: string): string[] {
  const atributos: string[] = [];
  for (const m of fuente.matchAll(/<script\b/g)) {
    let profundidad = 0;
    let i = m.index + m[0].length;
    for (; i < fuente.length; i++) {
      const c = fuente[i];
      if (c === '{') profundidad++;
      else if (c === '}') profundidad--;
      else if (c === '>' && profundidad === 0) break;
    }
    atributos.push(fuente.slice(m.index, i));
  }
  return atributos;
}

/** Todos los ficheros de un directorio, recursivo. */
function ficherosDe(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .map((ruta) => join(dir, ruta))
    .filter((ruta) => statSync(ruta).isFile());
}

afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

describe('Historia 2.9 — el vocabulario es cerrado', () => {
  it('son exactamente estos eventos con nombre, y ninguno más', () => {
    /*
     * La lista crece solo cuando una historia lo decide, y que haya que tocar esta prueba
     * para ampliarla es el punto: los cuatro primeros son de la v1 y los dos de
     * compartición los añadió la Historia 10.4, y `vista-de-superficie` la 20.1. La 23.2 trae
     * los cuatro de la v8 —`lectura`, `salida-interna`, `busqueda` y `vista-de-obra`— al
     * vocabulario, antes de que nadie los envíe.
     */
    expect([...EVENTOS_VALIDOS].sort()).toEqual(
      [
        'busqueda',
        'busqueda-sin-resultados',
        'comparticion-de-enlace',
        'comparticion-de-imagen',
        'copiado',
        'descarga-de-imagen',
        'lectura',
        'salida-interna',
        'vista-de-cita',
        'vista-de-obra',
        'vista-de-superficie',
      ].sort(),
    );
  });

  it('un evento fuera del conjunto no es válido', () => {
    expect(esEventoValido(EVENTOS.copiado)).toBe(true);
    expect(esEventoValido('clic-en-cualquier-cosa')).toBe(false);
    expect(esEventoValido('pageview')).toBe(false);
  });

  it('el guion descarta en cliente cualquier evento fuera del conjunto', () => {
    // Añadir uno exige modificar el módulo, no la superficie que lo emite: una isla que
    // invente un nombre no consigue emitirlo. Se comprueba **ejecutándolo**, no leyendo
    // su texto: una prueba sobre la forma del guion se rompe al compactarla y no dice
    // nada sobre lo que hace. Desde la 23.2 el guion emite solo los eventos que ya sabe
    // producir: los de la v8 esperaron a sus historias (23.5 a 23.9), y desde la 23.9 los sabe
    // todos. Desde la 23.5, `__medir` descarta además los que solo emite el fichero: la lectura y,
    // desde la 23.7, la salida interna.
    const { emitir, balizas } = medicionEnUnSandbox();
    const aPeticion = EVENTOS_DEL_GUION.filter((evento) => !EVENTOS_SOLO_DEL_FICHERO.includes(evento));

    for (const evento of EVENTOS_VALIDOS) emitir(evento);
    expect(balizas().map((b) => b.evento)).toEqual(aPeticion);
    // Solo eventos del vocabulario. Que los emita todos —menos los pendientes de una historia— lo
    // exige la correspondencia de `tests/unit/vocabulario.test.ts`, que conoce `PENDIENTES`.
    for (const evento of EVENTOS_DEL_GUION) expect(EVENTOS_VALIDOS, evento).toContain(evento);
    expect(aPeticion).not.toContain(EVENTOS.lectura);

    for (const impostor of ['pageview', 'clic', 'VISTA-DE-CITA', '', 'toString', 'hasOwnProperty']) emitir(impostor);
    expect(balizas()).toHaveLength(aPeticion.length);
  });
});

describe('Historia 2.9 — sin cookies y sin identificar al visitante', () => {
  const guion = guionDeMedicion('https://ejemplo.invalid/e');

  it('ni el arranque ni el fichero tocan las cookies', () => {
    for (const texto of [guion, ARRANQUE_DE_MEDICION]) {
      expect(texto).not.toMatch(/document\.cookie/);
      expect(texto).not.toMatch(/localStorage|sessionStorage|indexedDB/);
    }
  });

  it('no genera ni transporta ningún identificador de visitante', () => {
    for (const texto of [guion, ARRANQUE_DE_MEDICION]) {
      expect(texto).not.toMatch(/randomUUID|Math\.random|fingerprint|visitor|userId|uuid/i);
    }
  });

  it('lo que viaja es el evento, la ruta, `primera` y nada más', () => {
    // Desde la 23.2, el copiado no lleva ni la Marca de origen ni campos que no declara: el
    // evento y la ruta, y desde la 23.5 `primera`, que calcula el fichero —lo que pase la isla
    // no entra—. Lo que lleva cada evento lo fija `tests/unit/vocabulario.test.ts`.
    const { emitir, balizas } = medicionEnUnSandbox({ ruta: '/cita/una', busqueda: '?de=instagram' });
    emitir(EVENTOS.copiado, 'visitante-7f3a', 'telegram');

    const [baliza] = balizas();
    expect(baliza.evento).toBe(EVENTOS.copiado);
    expect(baliza.ruta).toBe('/cita/una');
    expect(baliza.primera).toBe('si');
    expect(Object.keys(baliza).sort()).toEqual(['evento', 'primera', 'ruta']);
    // Ni referente, ni agente de usuario, ni pantalla, ni zona horaria.
    expect(guion).not.toMatch(/referrer|userAgent|screen\.|timeZone|language/);
  });

  it('una medición que falla no rompe la página', () => {
    // El transporte revienta a propósito; emitir no debe propagar nada.
    const { emitir } = medicionEnUnSandbox({
      sendBeacon: () => {
        throw new Error('el transporte falló');
      },
    });
    expect(() => emitir(EVENTOS.copiado)).not.toThrow();
  });
});

describe('Historia 2.9 — el módulo es el único emisor', () => {
  const fuentes = fuentesDeSrc();

  it.each(fuentes)('%s no habla con el proveedor', (ruta) => {
    const codigo = readFileSync(ruta, 'utf8');
    // Nadie envía nada por su cuenta: ni baliza, ni fetch de telemetría, ni guion ajeno.
    expect(codigo).not.toMatch(/sendBeacon/);
    expect(codigo).not.toMatch(/MEDICION_ENDPOINT/);
    expect(codigo).not.toMatch(/plausible|fathom|umami|gtag|analytics/i);
  });

  it.each(fuentes)('%s llama `__medir` a secas y no junta `define:vars` con `set:html`', (ruta) => {
    /*
     * Revisión de la 23.1 (segunda pasada): la prueba sobre `dist/` mira cuatro islas con nombre;
     * esta mira todo `src/`, para que una isla nueva —o una de las que esa prueba no nombra— no
     * vuelva a `window.__medir && …` ni junte en un `<script>` las dos directivas que en Astro 7.2
     * pierden el cuerpo sin aviso (`src/lib/anuncio.ts`).
     */
    const codigo = readFileSync(ruta, 'utf8');
    expect(codigo).not.toMatch(/window\.__medir/);
    for (const atributos of atributosDeScript(codigo)) {
      expect(/\bdefine:vars\b/.test(atributos) && /\bset:html\b/.test(atributos), atributos).toBe(false);
    }
  });

  it('las superficies que emiten lo hacen por el vocabulario, no por una cadena suelta', () => {
    const isla = readFileSync(resolve(RAIZ, 'src/islands/CopiarCita.astro'), 'utf8');
    expect(isla).toMatch(/EVENTOS\.copiado/);

    // El nombre del evento no se escribe a mano en el guion. Se mira solo hasta el
    // bloque de estilos: ahí abajo «copiado» vuelve a aparecer como valor del atributo
    // de estado del botón, que no tiene nada que ver con la medición.
    const guion = isla.slice(0, isla.indexOf('<style>'));
    expect(guion).not.toMatch(/__medir\(\s*['"]/);
  });

  it('`public/` no lleva medición: ni un nombre de evento ni una baliza — Historia 23.1', () => {
    /*
     * El fichero de medición se compone desde `src/lib/medicion.ts` y nunca se copia en
     * `public/`: ahí sería una segunda copia del vocabulario que se quedaría atrás al añadir
     * un evento, y el receptor descartaría en silencio lo que el sitio ya emite.
     */
    const publicos = ficherosDe(resolve(RAIZ, 'public'));
    expect(publicos.length).toBeGreaterThan(0);
    for (const fichero of publicos) {
      const contenido = readFileSync(fichero, 'utf8');
      expect(contenido, fichero).not.toMatch(/sendBeacon/);
      for (const evento of EVENTOS_VALIDOS) expect(contenido, `${fichero}: ${evento}`).not.toContain(evento);
    }
  });
});

describe('Historia 23.1 — el arranque y el fichero, ejecutados', () => {
  it('el arranque es solo una cola: sin vocabulario, sin transporte y sin punto final', () => {
    expect(ARRANQUE_DE_MEDICION).not.toMatch(/sendBeacon|https?:|location|JSON/);
    for (const evento of EVENTOS_VALIDOS) expect(ARRANQUE_DE_MEDICION).not.toContain(evento);

    // Sin fichero, las llamadas se guardan y no sale nada: es como corre un sitio sin punto final.
    const { emitir, balizas } = medicionEnUnSandbox({ vistas: EVENTOS.vistaDeCita, cargado: false });
    emitir(EVENTOS.copiado);
    emitir(EVENTOS.descargaDeImagen);
    expect(balizas()).toEqual([]);
  });

  it('cola: al cargar, primero las vistas y después lo encolado, en su orden y una vez cada uno', () => {
    // Desde la 23.5, en una superficie con lectura la primera acción encolada emite antes la
    // lectura, y cada acción lleva su `primera` calculada al vaciar la cola, en su orden.
    const { emitir, cargar, balizas } = medicionEnUnSandbox({
      ruta: '/cita/una/',
      vistas: EVENTOS.vistaDeCita,
      cargado: false,
    });
    emitir(EVENTOS.copiado);
    emitir(EVENTOS.comparticionDeEnlace, null, 'telegram');
    emitir(EVENTOS.descargaDeImagen);
    cargar();

    expect(balizas().map((b) => [b.evento, b.primera])).toEqual([
      [EVENTOS.vistaDeCita, undefined],
      [EVENTOS.lectura, undefined],
      [EVENTOS.copiado, 'si'],
      [EVENTOS.comparticionDeEnlace, 'si'],
      [EVENTOS.descargaDeImagen, 'no'],
    ]);
    expect(balizas()[3].destino).toBe('telegram');

    // Ya cargado, el fichero es `__medir`: lo que llega sale directo y no repite la cola ni la
    // lectura.
    emitir(EVENTOS.copiado);
    expect(balizas().map((b) => [b.evento, b.primera])).toEqual([
      [EVENTOS.vistaDeCita, undefined],
      [EVENTOS.lectura, undefined],
      [EVENTOS.copiado, 'si'],
      [EVENTOS.comparticionDeEnlace, 'si'],
      [EVENTOS.descargaDeImagen, 'no'],
      [EVENTOS.copiado, 'no'],
    ]);
  });

  it('un evento fuera del vocabulario se descarta también desde la cola', () => {
    const { emitir, cargar, balizas } = medicionEnUnSandbox({ cargado: false });
    emitir('pageview');
    emitir(EVENTOS.copiado);
    emitir('VISTA-DE-CITA');
    cargar();
    expect(balizas().map((b) => b.evento)).toEqual([EVENTOS.copiado]);
  });

  it('sin `data-vistas` no sale ninguna vista, y la cola se vacía igual', () => {
    const { emitir, cargar, balizas } = medicionEnUnSandbox({ cargado: false });
    emitir(EVENTOS.busquedaSinResultados, 'zzz');
    cargar();
    expect(balizas().map((b) => [b.evento, b.datos])).toEqual([
      [EVENTOS.busquedaSinResultados, 'zzz'],
    ]);
  });

  it('una vista declarada que no es del vocabulario no sale', () => {
    const { balizas } = medicionEnUnSandbox({ vistas: `vista-inventada ${EVENTOS.vistaDeSuperficie}` });
    expect(balizas().map((b) => b.evento)).toEqual([EVENTOS.vistaDeSuperficie]);
  });

  it('prerender: nada hasta activarse; entonces las vistas, una sola vez, la lectura y la cola', () => {
    const { emitir, activar, balizas } = medicionEnUnSandbox({
      vistas: EVENTOS.vistaDeSuperficie,
      prerendering: true,
    });
    emitir(EVENTOS.copiado);
    expect(balizas()).toEqual([]);

    activar();
    activar();
    expect(balizas().map((b) => b.evento)).toEqual([
      EVENTOS.vistaDeSuperficie,
      EVENTOS.lectura,
      EVENTOS.copiado,
    ]);
  });

  it('las dos marcas viajan con la vista y la lectura, también tras la cola, y no con el copiado', () => {
    // Historias 23.2 (AD-13) y 23.6: las marcas viajan solo con las vistas y la lectura.
    const { emitir, cargar, balizas } = medicionEnUnSandbox({
      busqueda: '?de=instagram&via=whatsapp',
      vistas: EVENTOS.vistaDeCita,
      cargado: false,
    });
    emitir(EVENTOS.copiado);
    cargar();
    expect(balizas()).toHaveLength(3);
    const [vista, lectura, copiado] = balizas();
    expect(vista).toMatchObject({ evento: EVENTOS.vistaDeCita, origen: 'instagram', via: 'whatsapp' });
    expect(lectura).toMatchObject({ evento: EVENTOS.lectura, origen: 'instagram', via: 'whatsapp' });
    expect(copiado.evento).toBe(EVENTOS.copiado);
    expect(copiado).not.toHaveProperty('origen');
    expect(copiado).not.toHaveProperty('via');
  });
});

describe('Historia 23.5 — una carga que se lee deja una lectura', () => {
  /*
   * Una fila de la matriz de la historia por prueba, en el entorno simulado: el reloj solo avanza
   * con `avanzar`, la visibilidad la cambian `ocultar` y `mostrar`, y las interacciones llegan por
   * `interactuar`. Lo que se afirma es lo que sale por `sendBeacon`, en su orden.
   */
  const UMBRAL = MIN_MS_VISIBLES_PARA_LA_LECTURA;
  const lecturas = (balizas: Record<string, unknown>[]) => balizas.filter((b) => b.evento === EVENTOS.lectura);
  const enCita = (opciones: Parameters<typeof medicionEnUnSandbox>[0] = {}) =>
    medicionEnUnSandbox({ ruta: '/cita/una/', vistas: EVENTOS.vistaDeCita, ...opciones });

  it('el umbral es el de FR-56: 8 s', () => {
    expect(MIN_MS_VISIBLES_PARA_LA_LECTURA).toBe(8_000);
  });

  it('8 s visibles: nada a 7.999 ms; a 8.000, una lectura con su ruta y su marca, y ninguna más', () => {
    const { avanzar, balizas, pendientes } = enCita();
    expect(balizas().map((b) => b.evento)).toEqual([EVENTOS.vistaDeCita]);

    avanzar(UMBRAL - 1);
    expect(lecturas(balizas())).toEqual([]);
    avanzar(1);
    expect(lecturas(balizas())).toEqual([{ evento: EVENTOS.lectura, ruta: '/cita/una/', origen: null, via: null }]);
    // Exactamente `evento`, `ruta` y las dos Marcas de llegada (`via`, desde la 23.6), y ni hora
    // ni nada más.
    expect(Object.keys(lecturas(balizas())[0]).sort()).toEqual(['evento', 'origen', 'ruta', 'via']);

    avanzar(10 * 60_000);
    expect(lecturas(balizas())).toHaveLength(1);
    expect(balizas()).toHaveLength(2);
    expect(pendientes()).toBe(0);
  });

  it('oculta a ratos: solo cuenta lo visible, y sale al completar los 8 s', () => {
    const { avanzar, ocultar, mostrar, balizas } = enCita();
    avanzar(5_000);
    ocultar();
    avanzar(60_000);
    expect(lecturas(balizas())).toEqual([]);

    mostrar();
    avanzar(2_900);
    expect(lecturas(balizas())).toEqual([]);
    avanzar(99);
    expect(lecturas(balizas())).toEqual([]);
    avanzar(1);
    expect(lecturas(balizas())).toHaveLength(1);
    avanzar(60_000);
    expect(lecturas(balizas())).toHaveLength(1);
  });

  it('nunca visible: ninguna lectura, por mucho tiempo que pase', () => {
    const { avanzar, balizas, pendientes } = enCita({ visible: false });
    avanzar(10 * 60_000);
    expect(lecturas(balizas())).toEqual([]);
    expect(pendientes()).toBe(0);
  });

  it('cerrada antes: 5 s y se oculta o se descarga; ocultarse no emite nada', () => {
    const { avanzar, ocultar, interactuar, balizas, pendientes } = enCita();
    avanzar(5_000);
    ocultar();
    interactuar('pagehide');
    interactuar('beforeunload');
    avanzar(10 * 60_000);
    expect(balizas().map((b) => b.evento)).toEqual([EVENTOS.vistaDeCita]);
    expect(pendientes()).toBe(0);
  });

  it('temporizador tardío: con los 8 s visibles ya cumplidos, la lectura sale al ocultarse, y una sola', () => {
    // Una tarea larga retiene el temporizador más allá de los 8 s, y la página se oculta antes
    // de que dispare: la carga ya se leyó, y ocultarse no puede llevarse su lectura.
    const { bloquear, avanzar, ocultar, mostrar, balizas, pendientes } = enCita();
    bloquear(UMBRAL + 500);
    expect(lecturas(balizas())).toEqual([]);
    ocultar();
    expect(lecturas(balizas())).toEqual([{ evento: EVENTOS.lectura, ruta: '/cita/una/', origen: null, via: null }]);
    expect(pendientes()).toBe(0);
    mostrar();
    avanzar(10 * 60_000);
    expect(lecturas(balizas())).toHaveLength(1);
  });

  it('temporizador tardío sin los 8 s cumplidos: ocultarse sigue sin emitir nada', () => {
    const { bloquear, avanzar, ocultar, balizas, pendientes } = enCita();
    bloquear(UMBRAL - 1);
    ocultar();
    avanzar(10 * 60_000);
    expect(lecturas(balizas())).toEqual([]);
    expect(pendientes()).toBe(0);
  });

  it.each(INTERACCIONES_DE_LECTURA)('interacción: `%s` a 1 s emite la lectura en ese momento, y nada emite otra', (tipo) => {
    const { avanzar, interactuar, balizas } = enCita({ busqueda: '?de=tiktok' });
    avanzar(1_000);
    expect(lecturas(balizas())).toEqual([]);
    interactuar(tipo);
    expect(lecturas(balizas())).toEqual([{ evento: EVENTOS.lectura, ruta: '/cita/una/', origen: 'tiktok', via: null }]);

    for (const otra of INTERACCIONES_DE_LECTURA) interactuar(otra);
    avanzar(10 * 60_000);
    expect(lecturas(balizas())).toHaveLength(1);
  });

  it('las interacciones son exactamente estas cuatro, y `scroll` no está', () => {
    expect([...INTERACCIONES_DE_LECTURA]).toEqual(['pointerdown', 'keydown', 'wheel', 'touchmove']);
    const guion = guionDeMedicion('https://ejemplo.invalid/e');
    // Ninguna escucha de `scroll`, y el tiempo se cuenta con `visibilitychange`, no a golpe de
    // `setInterval`.
    expect(guion).not.toMatch(/scroll|setInterval/);
    expect(guion).toContain('visibilitychange');
  });

  it('las cuatro escuchas de interacción van en la ventana, en captura y pasivas', () => {
    // Pasivas: solo anotan la lectura, nunca frenan el desplazamiento ni mueven nada (WCAG 2.5.7,
    // la revisión de `tests/unit/superficies.test.ts`). En captura: ningún `stopPropagation` de
    // una isla las deja sin ver.
    const { escuchas } = enCita();
    const deInteraccion = escuchas('ventana').filter((e) =>
      (INTERACCIONES_DE_LECTURA as readonly string[]).includes(e.tipo),
    );
    expect(deInteraccion).toEqual(
      INTERACCIONES_DE_LECTURA.map((tipo) => ({ tipo, unaVez: false, captura: true, pasiva: true })),
    );
    expect(escuchas('documento').map((e) => e.tipo)).toEqual(['visibilitychange']);
  });

  it('solo `scroll`: ni la restauración de la posición ni un ancla cuentan como interacción', () => {
    const { avanzar, interactuar, balizas } = enCita();
    for (let i = 0; i < 20; i++) {
      interactuar('scroll');
      avanzar(395);
    }
    expect(lecturas(balizas())).toEqual([]);
    interactuar('scrollend');
    interactuar('click');
    interactuar('focus');
    expect(lecturas(balizas())).toEqual([]);
  });

  it('prerender: nada antes de activarse, ni el reloj ni las escuchas; al activar, las vistas y, 8 s después, la lectura', () => {
    const { avanzar, activar, interactuar, balizas, pendientes } = enCita({ prerendering: true });
    avanzar(30_000);
    interactuar('pointerdown');
    expect(balizas()).toEqual([]);
    expect(pendientes()).toBe(0);

    activar();
    expect(balizas().map((b) => b.evento)).toEqual([EVENTOS.vistaDeCita]);
    avanzar(UMBRAL - 1);
    expect(lecturas(balizas())).toEqual([]);
    avanzar(1);
    expect(balizas().map((b) => b.evento)).toEqual([EVENTOS.vistaDeCita, EVENTOS.lectura]);
  });

  it.each([
    ['sin `data-vistas`', undefined],
    ['con solo vistas ajenas a la tabla', 'vista-inventada lectura copiado-no'],
  ])('sin vista (%s): ninguna lectura, y la acción sale sola, con su `primera`', (_, vistas) => {
    const { avanzar, interactuar, emitir, balizas, pendientes } = medicionEnUnSandbox({ ruta: '/buscar/', vistas });
    for (const tipo of INTERACCIONES_DE_LECTURA) interactuar(tipo);
    avanzar(30_000);
    emitir(EVENTOS.copiado);
    expect(balizas()).toEqual([{ evento: EVENTOS.copiado, ruta: '/buscar/', primera: 'si' }]);
    expect(pendientes()).toBe(0);
  });

  it('de `data-vistas` solo salen vistas: una acción escrita ahí no sale ni hace de la página superficie con lectura', () => {
    // Desde la 23.9, con la de Obra.
    expect([...EVENTOS_DE_VISTA]).toEqual([EVENTOS.vistaDeCita, EVENTOS.vistaDeSuperficie, EVENTOS.vistaDeObra]);
    const { avanzar, interactuar, emitir, balizas, pendientes } = medicionEnUnSandbox({
      ruta: '/cita/una/',
      vistas: `${EVENTOS.copiado} ${EVENTOS.busquedaSinResultados} ${EVENTOS.comparticionDeEnlace}`,
    });
    expect(balizas()).toEqual([]);
    interactuar('pointerdown');
    avanzar(30_000);
    emitir(EVENTOS.copiado);
    // Ni lectura, ni el copiado gastado al cargar: el primero de verdad es «sí».
    expect(balizas()).toEqual([{ evento: EVENTOS.copiado, ruta: '/cita/una/', primera: 'si' }]);
    expect(pendientes()).toBe(0);
  });

  it.each([
    ['instagram', 'instagram'],
    ['ajena', null],
    ['visitante-7f3a', null],
  ] as const)('marca de origen `?de=%s`: la lectura lleva `origen` %s', (marca, origen) => {
    const { avanzar, balizas } = enCita({ busqueda: `?de=${marca}` });
    avanzar(UMBRAL);
    expect(lecturas(balizas())).toEqual([{ evento: EVENTOS.lectura, ruta: '/cita/una/', origen, via: null }]);
  });

  it('`__medir("lectura")`, directo: no sale nada y no gasta la lectura de la carga', () => {
    const { avanzar, emitir, balizas } = enCita();
    emitir(EVENTOS.lectura);
    emitir(EVENTOS.lectura, 'datos', 'opaco');
    expect(lecturas(balizas())).toEqual([]);
    avanzar(UMBRAL);
    expect(lecturas(balizas())).toHaveLength(1);
  });

  it('`__medir("lectura")`, encolado antes de cargar: tampoco sale ni gasta la lectura', () => {
    const { avanzar, emitir, cargar, balizas } = enCita({ cargado: false });
    emitir(EVENTOS.lectura);
    cargar();
    expect(balizas().map((b) => b.evento)).toEqual([EVENTOS.vistaDeCita]);
    avanzar(UMBRAL);
    expect(balizas().map((b) => b.evento)).toEqual([EVENTOS.vistaDeCita, EVENTOS.lectura]);
  });

  it('la lectura es un evento que solo emite el fichero', () => {
    // Desde la 23.7, junto con la salida interna.
    expect(EVENTOS_SOLO_DEL_FICHERO).toEqual([EVENTOS.lectura, EVENTOS.salidaInterna]);
    expect(EVENTOS_DEL_GUION).toContain(EVENTOS.lectura);
  });

  it('la lectura no pasa por `window.__medir`: el espía de las pruebas de punta a punta no la ve', () => {
    const { espiar, emitir, avanzar, restaurar, balizas } = enCita();
    const vistos = espiar();
    avanzar(1_000);
    emitir(EVENTOS.copiado); // la lectura sale delante, por dentro
    restaurar();
    avanzar(UMBRAL); // y la de la carga nueva, por tiempo
    expect(lecturas(balizas())).toHaveLength(2);
    expect(vistos).toEqual([EVENTOS.copiado]);
  });

  it('ninguna isla emite la lectura ni conoce la correspondencia de métricas: solo el fichero', () => {
    // Las islas llaman `__medir(evento, datos, destino)`, y `primera` no es ninguno de los tres:
    // basta con que ninguna nombre lo que solo sabe el fichero. `vocabulario.ts` declara la
    // correspondencia y `medicion.ts` la compone en el fichero —`fuentesDeSrc` ya lo deja fuera—;
    // nadie más la nombra, tampoco en un comentario.
    const DUEÑOS = ['lib/vocabulario.ts'];
    // Desde la 23.7, tampoco la salida interna: ninguna isla la emite ni lee zonas.
    const PROHIBIDO =
      /METRICA_DE_ACCION|EVENTOS_SOLO_DEL_FICHERO|EVENTOS\.(lectura|salidaInterna)\b|__medir\(\s*['"`](lectura|salida-interna)['"`]/;
    const fuentes = [
      ...fuentesDeSrc().filter((f) => !DUEÑOS.some((d) => f.endsWith(d))),
      ...ficherosDe(resolve(RAIZ, 'public', 'islas')).filter((f) => /\.m?js$/.test(f)),
    ];
    expect(fuentes.length).toBeGreaterThan(10);
    const infractores = fuentes.filter((f) => PROHIBIDO.test(readFileSync(f, 'utf8')));
    expect(infractores.map((f) => relative(RAIZ, f))).toEqual([]);
  });

  it('una isla no puede poner `primera`: lo que llegue de más a `__medir` no viaja, directo ni encolado', () => {
    // `primera` la calcula el fichero; un cuarto argumento —o un quinto— no la sustituye ni sale.
    for (const cargado of [true, false]) {
      const { emitir, cargar, balizas } = medicionEnUnSandbox({ cargado });
      emitir(EVENTOS.copiado, null, undefined, 'no', 'si');
      emitir(EVENTOS.copiado, null, undefined, 'si');
      emitir(EVENTOS.comparticionDeEnlace, null, 'telegram', 'no');
      if (!cargado) cargar();
      expect(balizas(), cargado ? 'directo' : 'encolado').toEqual([
        { evento: EVENTOS.copiado, ruta: '/', primera: 'si' },
        { evento: EVENTOS.copiado, ruta: '/', primera: 'no' },
        { evento: EVENTOS.comparticionDeEnlace, ruta: '/', destino: 'telegram', primera: 'si' },
      ]);
    }
  });

  it.each([
    ['dos vistas distintas', `${EVENTOS.vistaDeCita} ${EVENTOS.vistaDeSuperficie}`],
    ['la misma vista dos veces', `${EVENTOS.vistaDeCita} ${EVENTOS.vistaDeCita}`],
  ])('con %s en `data-vistas`, sigue habiendo como mucho una lectura por carga', (_, vistas) => {
    const { avanzar, interactuar, emitir, balizas } = medicionEnUnSandbox({ ruta: '/cita/una/', vistas });
    avanzar(1_000);
    for (const tipo of INTERACCIONES_DE_LECTURA) interactuar(tipo);
    emitir(EVENTOS.copiado);
    avanzar(10 * 60_000);
    expect(lecturas(balizas())).toHaveLength(1);
    // La lectura va detrás de las vistas y delante de la acción.
    expect(balizas().map((b) => b.evento).slice(-2)).toEqual([EVENTOS.lectura, EVENTOS.copiado]);
  });

  it('`primera`: copiado, copiado, descarga sin destino, compartición de enlace y de imagen dan sí, no, no, sí, no', () => {
    const { emitir, balizas } = medicionEnUnSandbox();
    emitir(EVENTOS.copiado);
    emitir(EVENTOS.copiado);
    emitir(EVENTOS.descargaDeImagen);
    emitir(EVENTOS.comparticionDeEnlace, null, 'telegram');
    emitir(EVENTOS.comparticionDeImagen, null, 'opaco');
    expect(balizas().map((b) => [b.evento, b.primera])).toEqual([
      [EVENTOS.copiado, 'si'],
      [EVENTOS.copiado, 'no'],
      [EVENTOS.descargaDeImagen, 'no'],
      [EVENTOS.comparticionDeEnlace, 'si'],
      [EVENTOS.comparticionDeImagen, 'no'],
    ]);
  });

  it('`primera` sigue `METRICA_DE_ACCION`: la segunda acción es «no» si y solo si comparte métrica con la primera', () => {
    const acciones = Object.keys(METRICA_DE_ACCION) as (keyof typeof METRICA_DE_ACCION)[];
    expect(acciones.length).toBeGreaterThan(0);
    for (const una of acciones) {
      for (const otra of acciones) {
        const { emitir, balizas } = medicionEnUnSandbox();
        emitir(una, null, 'telegram');
        emitir(otra, null, 'telegram');
        const misma = METRICA_DE_ACCION[una] === METRICA_DE_ACCION[otra];
        expect(balizas().map((b) => b.primera), `${una} → ${otra}`).toEqual(['si', misma ? 'no' : 'si']);
      }
    }
  });

  it.each(DESTINOS_DE_DESCARGA)(
    'descarga con destino `%s`: siempre «no», y no gasta la primera de su métrica',
    (destino) => {
      const { emitir, balizas } = medicionEnUnSandbox();
      emitir(EVENTOS.descargaDeImagen, null, destino);
      emitir(EVENTOS.descargaDeImagen, null, destino);
      emitir(EVENTOS.copiado);
      expect(balizas().map((b) => [b.evento, b.destino ?? null, b.primera])).toEqual([
        [EVENTOS.descargaDeImagen, destino, 'no'],
        [EVENTOS.descargaDeImagen, destino, 'no'],
        [EVENTOS.copiado, null, 'si'],
      ]);
    },
  );

  it.each(DESTINOS_DE_DESCARGA)(
    'descarga con destino `%s` y después una sin destino: la elegida sale con «sí» aunque venga detrás',
    (destino) => {
      const { emitir, balizas } = medicionEnUnSandbox();
      emitir(EVENTOS.descargaDeImagen, null, destino);
      emitir(EVENTOS.descargaDeImagen);
      emitir(EVENTOS.descargaDeImagen);
      expect(balizas().map((b) => [b.destino ?? null, b.primera])).toEqual([
        [destino, 'no'],
        [null, 'si'],
        [null, 'no'],
      ]);
    },
  );

  it('descarga con un destino ajeno: viaja con `destino: null` y cuenta como sin destino', () => {
    const { emitir, balizas } = medicionEnUnSandbox();
    emitir(EVENTOS.descargaDeImagen, null, 'whatsapp');
    emitir(EVENTOS.copiado);
    expect(balizas().map((b) => [b.evento, b.destino ?? null, b.primera])).toEqual([
      [EVENTOS.descargaDeImagen, null, 'si'],
      [EVENTOS.copiado, null, 'no'],
    ]);
  });

  it('acción sin lectura, directa: vista, lectura y copiado («sí»), en ese orden; otra acción no repite la lectura', () => {
    const { emitir, avanzar, balizas } = enCita({ busqueda: '?de=x' });
    avanzar(1_000);
    emitir(EVENTOS.copiado);
    emitir(EVENTOS.comparticionDeEnlace, null, 'correo');
    avanzar(10 * 60_000);
    expect(balizas()).toEqual([
      { evento: EVENTOS.vistaDeCita, ruta: '/cita/una/', origen: 'x', via: null },
      { evento: EVENTOS.lectura, ruta: '/cita/una/', origen: 'x', via: null },
      { evento: EVENTOS.copiado, ruta: '/cita/una/', primera: 'si' },
      { evento: EVENTOS.comparticionDeEnlace, ruta: '/cita/una/', destino: 'correo', primera: 'si' },
    ]);
  });

  it('acción sin lectura, en la cola antes de cargar: vista, lectura y copiado («sí»), en ese orden', () => {
    const { emitir, cargar, avanzar, balizas } = enCita({ cargado: false });
    emitir(EVENTOS.copiado);
    emitir(EVENTOS.copiado);
    cargar();
    avanzar(10 * 60_000);
    expect(balizas().map((b) => [b.evento, b.primera])).toEqual([
      [EVENTOS.vistaDeCita, undefined],
      [EVENTOS.lectura, undefined],
      [EVENTOS.copiado, 'si'],
      [EVENTOS.copiado, 'no'],
    ]);
  });

  it('caché de atrás y adelante: ninguna vista, una lectura nueva posible sin marca, y `primera` otra vez «sí»', () => {
    const { emitir, avanzar, ocultar, mostrar, restaurar, interactuar, balizas } = enCita({ busqueda: '?de=instagram' });
    interactuar('pointerdown');
    emitir(EVENTOS.copiado);
    expect(balizas().map((b) => b.evento)).toEqual([EVENTOS.vistaDeCita, EVENTOS.lectura, EVENTOS.copiado]);

    // Se va a otra página —la pestaña se oculta— y vuelve por la caché.
    ocultar();
    avanzar(30_000);
    restaurar();
    mostrar();
    expect(balizas()).toHaveLength(3);

    avanzar(UMBRAL);
    emitir(EVENTOS.copiado);
    expect(balizas().slice(3)).toEqual([
      { evento: EVENTOS.lectura, ruta: '/cita/una/', origen: null, via: null },
      { evento: EVENTOS.copiado, ruta: '/cita/una/', primera: 'si' },
    ]);
    expect(balizas().filter((b) => b.evento === EVENTOS.vistaDeCita)).toHaveLength(1);
  });

  it('caché de atrás y adelante: el tiempo acumulado vuelve a cero, y da igual el orden de `pageshow` y `visibilitychange`', () => {
    for (const orden of ['pageshow primero', 'visibilitychange primero'] as const) {
      const { avanzar, ocultar, mostrar, restaurar, balizas } = enCita();
      avanzar(5_000);
      ocultar();
      avanzar(60_000);
      if (orden === 'pageshow primero') {
        restaurar();
        mostrar();
      } else {
        mostrar();
        restaurar();
      }
      // Con los 5 s de antes, 3 s bastarían; tras la carga nueva hacen falta los 8.
      avanzar(3_000);
      expect(lecturas(balizas()), orden).toEqual([]);
      avanzar(UMBRAL - 3_000);
      expect(lecturas(balizas()), orden).toEqual([
        { evento: EVENTOS.lectura, ruta: '/cita/una/', origen: null, via: null },
      ]);
    }
  });

  it('`pageshow` sin `persisted` no es una carga nueva: no pasa nada', () => {
    const { emitir, avanzar, restaurar, balizas } = enCita();
    avanzar(UMBRAL);
    emitir(EVENTOS.copiado);
    restaurar(false);
    avanzar(UMBRAL);
    emitir(EVENTOS.copiado);
    expect(balizas().map((b) => [b.evento, b.primera])).toEqual([
      [EVENTOS.vistaDeCita, undefined],
      [EVENTOS.lectura, undefined],
      [EVENTOS.copiado, 'si'],
      [EVENTOS.copiado, 'no'],
    ]);
  });

  it('transporte roto en la lectura: ninguna excepción sale del temporizador ni de las escuchas', () => {
    const intentos: string[] = [];
    const roto = (_url: string, carga: string) => {
      intentos.push(JSON.parse(carga).evento);
      throw new Error('el transporte falló');
    };
    const porTiempo = enCita({ sendBeacon: roto });
    expect(() => porTiempo.avanzar(UMBRAL)).not.toThrow();

    const porInteraccion = enCita({ sendBeacon: roto });
    expect(() => porInteraccion.interactuar('keydown')).not.toThrow();
    expect(() => porInteraccion.ocultar()).not.toThrow();
    expect(() => porInteraccion.restaurar()).not.toThrow();
    expect(() => porInteraccion.mostrar()).not.toThrow();
    expect(() => porInteraccion.avanzar(UMBRAL)).not.toThrow();
    expect(() => porInteraccion.emitir(EVENTOS.copiado)).not.toThrow();
    // Lo intentó: la lectura salió hacia el transporte, que falló.
    expect(intentos.filter((e) => e === EVENTOS.lectura).length).toBeGreaterThanOrEqual(2);
  });

  it('el fichero no lleva hora, identificador ni almacenamiento, y compone el umbral, las métricas y las marcas desde sus módulos', () => {
    const guion = guionDeMedicion('https://ejemplo.invalid/e');
    expect(guion).not.toMatch(/Date|toISOString|getTime|localStorage|sessionStorage|indexedDB|document\.cookie/);
    expect(guion).toContain(`${MIN_MS_VISIBLES_PARA_LA_LECTURA}-`);
    expect(guion).toContain(JSON.stringify(METRICA_DE_ACCION));
    // Historia 23.6: los nombres de las dos Marcas de llegada, de `redes.ts` y del vocabulario.
    expect([...MARCAS_DE_LLEGADA]).toEqual([PARAMETRO_DE_ORIGEN, PARAMETRO_DE_DIFUSION]);
    expect(guion).toContain(JSON.stringify([PARAMETRO_DE_ORIGEN, PARAMETRO_DE_DIFUSION]));
    expect(guion).toContain(SIN_MARCAS_DE_LLEGADA);
  });

  it('`src/lib/medicion.ts` no escribe el nombre de ninguna marca: los compone de sus módulos', () => {
    /*
     * Historia 23.6. Se leen los literales del código con el compilador —los comentarios pueden
     * nombrar `?de=`, el código no—: ni una cadena que sea el nombre, ni una que lo lleve entre
     * comillas o detrás de `?`/`&` con su `=`.
     */
    const ruta = resolve(RAIZ, 'src/lib/medicion.ts');
    const fuente = ts.createSourceFile(ruta, readFileSync(ruta, 'utf8'), ts.ScriptTarget.Latest, true);
    const literales: string[] = [];
    const recorrer = (nodo: ts.Node): void => {
      if (
        ts.isStringLiteral(nodo) ||
        ts.isNoSubstitutionTemplateLiteral(nodo) ||
        ts.isTemplateHead(nodo) ||
        ts.isTemplateMiddle(nodo) ||
        ts.isTemplateTail(nodo)
      ) {
        literales.push(nodo.text);
      }
      ts.forEachChild(nodo, recorrer);
    };
    recorrer(fuente);
    expect(literales.length).toBeGreaterThan(20);
    for (const nombre of MARCAS_DE_LLEGADA) {
      const escrito = new RegExp(`^${nombre}$|(['"\`])${nombre}\\1|[?&]${nombre}=`);
      expect(literales.filter((l) => escrito.test(l)), nombre).toEqual([]);
    }
  });
});

describe('Historia 23.6 — las marcas de llegada cuentan una vez y salen de la dirección', () => {
  /*
   * Una prueba por fila de guion de la matriz de la historia, en el entorno simulado, que desde
   * la 23.6 tiene dirección entera e historial: `direccion()` es lo que mostraría la barra e
   * `historial()` las llamadas a `replaceState`, con sus argumentos tal como llegaron.
   */
  const RUTA = '/cita/una/';
  const enCita = (opciones: Parameters<typeof medicionEnUnSandbox>[0] = {}) =>
    medicionEnUnSandbox({ ruta: RUTA, vistas: EVENTOS.vistaDeCita, ...opciones });
  const deVista = (balizas: Record<string, unknown>[]) => balizas.filter((b) => b.evento === EVENTOS.vistaDeCita);
  const lecturas = (balizas: Record<string, unknown>[]) => balizas.filter((b) => b.evento === EVENTOS.lectura);
  /** Las dos marcas de una baliza, en el orden de `MARCAS_DE_LLEGADA`. */
  const marcas = (baliza: Record<string, unknown> | undefined) => [baliza?.origen, baliza?.via];

  /** La función pura, evaluada como texto —igual que viaja— y llamada con los nombres compuestos. */
  const sinMarcas = runInNewContext(`(${SIN_MARCAS_DE_LLEGADA})`, { URLSearchParams }) as (
    busqueda: string,
    nombres: string[],
  ) => string;
  const quitar = (busqueda: string) => sinMarcas(busqueda, [...MARCAS_DE_LLEGADA]);

  it('la función pura: quita exactamente los segmentos que el lector lee como una marca, y deja el resto literal', () => {
    const casos: [string, string][] = [
      ['', ''],
      ['?de=instagram', ''],
      ['?de=instagram&via=whatsapp', ''],
      ['?de=x&', ''],
      ['?a=1&&de=x', '?a=1&'],
      // Si de lo que había no quedan más que separadores, no queda un `?&` sin nada (revisión de
      // la 23.6); sin marcas, ni eso se toca.
      ['?de=x&&', ''],
      ['?&de=x&', ''],
      ['?&&via=whatsapp', ''],
      ['?&&', '?&&'],
      ['?de', ''],
      ['?de=', ''],
      ['?via', ''],
      ['?via=&de', ''],
      ['?a=1&de=instagram&b=%20&via=x', '?a=1&b=%20'],
      ['?a=%20&b=1+2&de=x&c&d=%E2%9C%93', '?a=%20&b=1+2&c&d=%E2%9C%93'],
      ['?z=9&de=x&a=1&via=y&m', '?z=9&a=1&m'],
      ['?de=x&de=y&via=a&via=b&q=1', '?q=1'],
      ['?dev=1&vias=2&DE=3&de%20=4&xde=5', '?dev=1&vias=2&DE=3&de%20=4&xde=5'],
      ['?de+=1&via%20=2', '?de+=1&via%20=2'],
      ['?d%65=tiktok', ''],
      ['?a=1&vi%61=whatsapp', '?a=1'],
      // El lector toma el primer `?` por el de la búsqueda; un `?de` dentro no es `de` para él.
      ['?a=1&?de=x', '?a=1&?de=x'],
      ['??de=x', '??de=x'],
      ['?a=1&&b=2', '?a=1&&b=2'],
    ];
    for (const [busqueda, esperada] of casos) {
      expect(quitar(busqueda), busqueda).toBe(esperada);
      // Lo que queda no lo lee el lector como marca, y lo que había y no era marca, sigue.
      const leido = new URLSearchParams(esperada);
      for (const nombre of MARCAS_DE_LLEGADA) expect(leido.has(nombre), `${busqueda}: ${nombre}`).toBe(false);
      const antes = [...new URLSearchParams(busqueda).keys()].filter((k) => !(MARCAS_DE_LLEGADA as readonly string[]).includes(k));
      expect([...leido.keys()], busqueda).toEqual(antes);
    }
    // Pura: no lee la dirección ni nada de fuera de sus argumentos.
    expect(SIN_MARCAS_DE_LLEGADA).not.toMatch(/location|history|document|window/);
  });

  it('dos marcas: la vista las lleva, la dirección las pierde una vez y con el mismo estado, la lectura las lleva y nada después', () => {
    const estado = { anterior: 'de otra isla' };
    const entorno = enCita({ busqueda: '?de=instagram&via=whatsapp', estado });
    expect(deVista(entorno.balizas()).map(marcas)).toEqual([['instagram', 'whatsapp']]);
    expect(entorno.historial()).toEqual([{ estado, titulo: '', url: `${ORIGEN_DEL_SANDBOX}${RUTA}` }]);
    // El mismo objeto que había, no una copia ni `null`.
    expect(entorno.historial()[0].estado).toBe(estado);
    expect(entorno.direccion()).toBe(RUTA);

    entorno.interactuar('keydown');
    expect(lecturas(entorno.balizas())).toEqual([
      { evento: EVENTOS.lectura, ruta: RUTA, origen: 'instagram', via: 'whatsapp' },
    ]);

    // Tras la lectura, nada las lleva: ni una vista que pida una isla, ni la acción, ni otra carga.
    entorno.emitir(EVENTOS.vistaDeCita);
    entorno.emitir(EVENTOS.copiado);
    entorno.restaurar();
    entorno.avanzar(MIN_MS_VISIBLES_PARA_LA_LECTURA);
    const despues = entorno.balizas().slice(2);
    expect(despues.map((b) => b.evento)).toEqual([EVENTOS.vistaDeCita, EVENTOS.copiado, EVENTOS.lectura]);
    for (const baliza of despues) {
      expect(baliza.origen ?? null, String(baliza.evento)).toBeNull();
      expect(baliza.via ?? null, String(baliza.evento)).toBeNull();
    }
    expect(entorno.historial()).toHaveLength(1);
  });

  it('solo difusión: `origen` nulo y `via` en la vista y la lectura', () => {
    const { balizas, avanzar, direccion } = enCita({ busqueda: '?via=telegram' });
    avanzar(MIN_MS_VISIBLES_PARA_LA_LECTURA);
    expect(balizas().map(marcas)).toEqual([
      [null, 'telegram'],
      [null, 'telegram'],
    ]);
    expect(direccion()).toBe(RUTA);
  });

  it('ajenas: las dos viajan nulas, la vista y la lectura salen, y las dos se quitan', () => {
    const { balizas, interactuar, direccion, historial } = enCita({ busqueda: '?de=visitante-7f3a&via=lo-que-sea' });
    interactuar('pointerdown');
    expect(balizas().map((b) => [b.evento, ...marcas(b)])).toEqual([
      [EVENTOS.vistaDeCita, null, null],
      [EVENTOS.lectura, null, null],
    ]);
    expect(direccion()).toBe(RUTA);
    expect(historial()).toHaveLength(1);
  });

  it.each([
    // La primera aparición manda: una ajena delante deja `via` nula aunque detrás venga una buena.
    ['?via=lo-que-sea&via=whatsapp', null],
    ['?via=whatsapp&via=lo-que-sea', 'whatsapp'],
    // `x` es un destino del conjunto —el de X, `DESTINOS_DE_ENLACE`—, así que delante es la primera.
    ['?via=x&via=whatsapp', 'x'],
    ['?via=whatsapp&via=x', 'whatsapp'],
  ] as const)('repetidas `%s`: `via` es la primera (%s), y se quitan todas', (busqueda, via) => {
    const { balizas, interactuar, direccion } = enCita({ busqueda });
    interactuar('keydown');
    expect(balizas().map((b) => b.via)).toEqual([via, via]);
    expect(direccion()).toBe(RUTA);
  });

  it('resto y fragmento: la dirección conserva lo demás, literal y en su orden, y el fragmento', () => {
    const { direccion, historial, balizas } = enCita({
      busqueda: '?a=1&de=instagram&b=%20&via=x',
      fragmento: '#frag',
    });
    expect(direccion()).toBe(`${RUTA}?a=1&b=%20#frag`);
    expect(historial()).toEqual([{ estado: null, titulo: '', url: `${ORIGEN_DEL_SANDBOX}${RUTA}?a=1&b=%20#frag` }]);
    expect(marcas(balizas()[0])).toEqual(['instagram', 'x']);
  });

  it('nombres parecidos: ninguna marca, y no se escribe en el historial', () => {
    const busqueda = '?dev=1&vias=2&DE=3&de%20=4&xde=5';
    const { balizas, direccion, historial } = enCita({ busqueda });
    expect(marcas(balizas()[0])).toEqual([null, null]);
    expect(historial()).toEqual([]);
    expect(direccion()).toBe(`${RUTA}${busqueda}`);
  });

  it('codificado: `?d%65=tiktok` es la marca de origen, y se quita', () => {
    const { balizas, direccion } = enCita({ busqueda: '?d%65=tiktok' });
    expect(marcas(balizas()[0])).toEqual(['tiktok', null]);
    expect(direccion()).toBe(RUTA);
  });

  it.each(['', '?a=1&&b=2', '?&&'])('sin marcas (`%s`): ni `replaceState` ni cambio de dirección', (busqueda) => {
    const { direccion, historial } = enCita({ busqueda, fragmento: '#x' });
    expect(historial()).toEqual([]);
    expect(direccion()).toBe(`${RUTA}${busqueda}#x`);
  });

  it('sin vista: se quitan igual, y ningún evento lleva `origen` ni `via`', () => {
    const { balizas, interactuar, emitir, avanzar, direccion, historial } = medicionEnUnSandbox({
      ruta: '/buscar/',
      busqueda: '?q=tiempo&de=x&via=whatsapp',
    });
    expect(direccion()).toBe('/buscar/?q=tiempo');
    expect(historial()).toHaveLength(1);
    for (const tipo of INTERACCIONES_DE_LECTURA) interactuar(tipo);
    avanzar(30_000);
    emitir(EVENTOS.copiado);
    emitir(EVENTOS.busquedaSinResultados, 'zzz');
    expect(balizas()).toEqual([
      { evento: EVENTOS.copiado, ruta: '/buscar/', primera: 'si' },
      { evento: EVENTOS.busquedaSinResultados, ruta: '/buscar/', datos: 'zzz' },
    ]);
  });

  it('prerender: nada se lee ni se quita antes de activarse; al activar, como con dos marcas', () => {
    const estado = { previo: 1 };
    const { balizas, activar, interactuar, direccion, historial } = enCita({
      busqueda: '?de=instagram&via=whatsapp',
      estado,
      prerendering: true,
    });
    interactuar('keydown');
    expect(balizas()).toEqual([]);
    expect(historial()).toEqual([]);
    expect(direccion()).toBe(`${RUTA}?de=instagram&via=whatsapp`);

    activar();
    expect(historial()).toEqual([{ estado, titulo: '', url: `${ORIGEN_DEL_SANDBOX}${RUTA}` }]);
    interactuar('keydown');
    expect(balizas().map((b) => [b.evento, ...marcas(b)])).toEqual([
      [EVENTOS.vistaDeCita, 'instagram', 'whatsapp'],
      [EVENTOS.lectura, 'instagram', 'whatsapp'],
    ]);
  });

  it('caché de atrás y adelante: tras la lectura, la de la carga nueva sale con las dos marcas nulas, sin volver a leer la dirección', () => {
    const { balizas, interactuar, restaurar, avanzar, historial } = enCita({ busqueda: '?de=tiktok&via=correo' });
    interactuar('pointerdown');
    restaurar();
    avanzar(MIN_MS_VISIBLES_PARA_LA_LECTURA);
    expect(lecturas(balizas()).map(marcas)).toEqual([
      ['tiktok', 'correo'],
      [null, null],
    ]);
    expect(historial()).toHaveLength(1);
  });

  it('caché de atrás y adelante antes de la lectura: la vuelta tampoco lleva las marcas', () => {
    const { balizas, ocultar, mostrar, restaurar, avanzar } = enCita({ busqueda: '?de=tiktok&via=correo' });
    avanzar(1_000);
    ocultar();
    restaurar();
    mostrar();
    avanzar(MIN_MS_VISIBLES_PARA_LA_LECTURA);
    expect(lecturas(balizas()).map(marcas)).toEqual([[null, null]]);
  });

  it('recarga: con la dirección que dejó `replaceState`, la vista y la lectura salen sin marcas', () => {
    const primera = enCita({ busqueda: '?x=1&de=instagram&via=whatsapp', fragmento: '#cita' });
    const dejada = new URL(primera.direccion(), 'https://ejemplo.invalid');
    expect(dejada.search).toBe('?x=1');

    const recargada = medicionEnUnSandbox({
      ruta: dejada.pathname,
      busqueda: dejada.search,
      fragmento: dejada.hash,
      vistas: EVENTOS.vistaDeCita,
    });
    recargada.interactuar('keydown');
    expect(recargada.balizas().map((b) => [b.evento, ...marcas(b)])).toEqual([
      [EVENTOS.vistaDeCita, null, null],
      [EVENTOS.lectura, null, null],
    ]);
    expect(recargada.historial()).toEqual([]);
    expect(recargada.direccion()).toBe(primera.direccion());
  });

  it.each([
    ['un historial que lanza', { historialQueLanza: true }],
    ['ningún `history`', { sinHistorial: true }],
  ] as const)('historial roto (%s): la vista y la lectura salen con sus marcas y ninguna excepción sale', (_, roto) => {
    let entorno: ReturnType<typeof enCita> | undefined;
    expect(() => {
      entorno = enCita({ busqueda: '?de=instagram&via=whatsapp', ...roto });
    }).not.toThrow();
    expect(() => entorno!.interactuar('keydown')).not.toThrow();
    expect(entorno!.balizas().map((b) => [b.evento, ...marcas(b)])).toEqual([
      [EVENTOS.vistaDeCita, 'instagram', 'whatsapp'],
      [EVENTOS.lectura, 'instagram', 'whatsapp'],
    ]);
    expect(entorno!.direccion()).toBe(`${RUTA}?de=instagram&via=whatsapp`);
  });

  it('una isla no cuela `via`: lo que llega de más a `__medir` no la pone, directo ni encolado', () => {
    for (const cargado of [true, false]) {
      const { emitir, cargar, balizas } = medicionEnUnSandbox({ ruta: RUTA, cargado });
      emitir(EVENTOS.vistaDeCita, null, undefined, 'si', 'whatsapp');
      emitir(EVENTOS.vistaDeSuperficie, 'whatsapp', 'whatsapp', 'whatsapp', 'whatsapp');
      if (!cargado) cargar();
      expect(balizas(), cargado ? 'directo' : 'encolado').toEqual([
        { evento: EVENTOS.vistaDeCita, ruta: RUTA, origen: null, via: null },
        { evento: EVENTOS.vistaDeSuperficie, ruta: RUTA, origen: null, via: null },
      ]);
    }
  });

  it('una vista que pide una isla, antes de la lectura, directa o de la cola, sale sin marcas: solo las llevan las declaradas y la lectura', () => {
    /*
     * Revisión de la 23.6. Si una vista pedida por `__medir` llevara las marcas, una isla que la
     * pidiera antes de la lectura volvería a contar la llegada en SM-8, que cuenta vistas. Hoy
     * ninguna isla pide una vista —la declara la superficie—, y esto lo cierra en el fichero.
     */
    for (const cargado of [true, false]) {
      const { emitir, cargar, interactuar, balizas } = enCita({ busqueda: '?de=instagram&via=whatsapp', cargado });
      emitir(EVENTOS.vistaDeCita);
      emitir(EVENTOS.vistaDeSuperficie);
      if (!cargado) cargar();
      interactuar('keydown');
      // La declarada sale primero también con la cola: el fichero emite las vistas antes de vaciarla.
      expect(balizas().map((b) => [b.evento, ...marcas(b)]), cargado ? 'directa' : 'de la cola').toEqual([
        [EVENTOS.vistaDeCita, 'instagram', 'whatsapp'],
        [EVENTOS.vistaDeCita, null, null],
        [EVENTOS.vistaDeSuperficie, null, null],
        [EVENTOS.lectura, 'instagram', 'whatsapp'],
      ]);
    }
  });

  it('sin vista: una vista que pida una isla tampoco lleva las marcas, aunque nada las olvide', () => {
    const { emitir, avanzar, balizas, direccion } = medicionEnUnSandbox({
      ruta: '/autor/seneca/2/',
      busqueda: '?de=instagram&via=whatsapp',
    });
    emitir(EVENTOS.vistaDeSuperficie);
    avanzar(30_000);
    emitir(EVENTOS.vistaDeCita);
    expect(balizas().map((b) => [b.evento, ...marcas(b)])).toEqual([
      [EVENTOS.vistaDeSuperficie, null, null],
      [EVENTOS.vistaDeCita, null, null],
    ]);
    expect(direccion()).toBe('/autor/seneca/2/');
  });

  it('una ruta que empieza por `//`: la dirección nueva va entera y del mismo origen, y conserva la ruta', () => {
    /*
     * Revisión de la 23.6. Sin el origen delante, `//cita/una/` se resolvería como el anfitrión
     * `cita`: el navegador lanzaría y las marcas se quedarían en la barra, o, con
     * `//<este anfitrión>/…`, la dirección pasaría a otra ruta.
     */
    const { balizas, direccion, historial } = medicionEnUnSandbox({
      ruta: `/${RUTA}`,
      busqueda: '?de=instagram&a=1',
      vistas: EVENTOS.vistaDeCita,
    });
    expect(historial()).toEqual([{ estado: null, titulo: '', url: `${ORIGEN_DEL_SANDBOX}/${RUTA}?a=1` }]);
    expect(direccion()).toBe(`/${RUTA}?a=1`);
    expect(marcas(balizas()[0])).toEqual(['instagram', null]);
  });

  it('se lee una sola vez: con la dirección todavía marcada —el historial no la dejó quitar—, la carga nueva no vuelve a leerla', () => {
    const { balizas, interactuar, restaurar, avanzar, direccion } = enCita({
      busqueda: '?de=tiktok&via=correo',
      historialQueLanza: true,
    });
    interactuar('pointerdown');
    restaurar();
    avanzar(MIN_MS_VISIBLES_PARA_LA_LECTURA);
    expect(direccion()).toBe(`${RUTA}?de=tiktok&via=correo`);
    expect(lecturas(balizas()).map(marcas)).toEqual([
      ['tiktok', 'correo'],
      [null, null],
    ]);
  });
});

describe('Historia 23.7 — cada salida interna dice desde qué zona', () => {
  /*
   * Una prueba por fila de la matriz de la historia, en el entorno simulado: `pulsar(enlace,
   * gesto)` despacha el `click` que sube desde un `<span>` dentro de un `<a>` de mentira,
   * envuelto en sus contenedores. Lo que se afirma es lo que sale por `sendBeacon`, en su orden.
   */
  const RUTA = '/cita/una/';
  const OTRA = '/cita/otra/';
  const enCita = (opciones: Parameters<typeof medicionEnUnSandbox>[0] = {}) =>
    medicionEnUnSandbox({ ruta: RUTA, vistas: EVENTOS.vistaDeCita, ...opciones });
  const eventos = (balizas: Record<string, unknown>[]) => balizas.map((b) => b.evento);
  const salidas = (balizas: Record<string, unknown>[]) => balizas.filter((b) => b.evento === EVENTOS.salidaInterna);
  /** Un enlace a otra ruta del sitio, dentro de una zona. */
  const enZona = (zona: string, href = OTRA) => ({ href, contenedores: [{ zona }] });

  it('la salida la emite solo el fichero, y su zona sale de la escucha, no de `__medir`', () => {
    expect(EVENTOS_DEL_GUION).toContain(EVENTOS.salidaInterna);
    expect(EVENTOS_SOLO_DEL_FICHERO).toContain(EVENTOS.salidaInterna);
    // Los atributos y las exenciones, con su nombre: el fichero los compone, nunca los escribe.
    expect(ATRIBUTO_DE_ZONA).toBe('data-zona');
    expect(ATRIBUTO_SIN_ZONA).toBe('data-sin-zona');
    expect([...EXENCIONES_DE_ZONA]).toEqual(['chips-del-404', 'salidas-sin-resultados']);
    // Ninguna exención se llama como una zona: la prueba de `dist/` las distingue por su atributo,
    // pero un motivo con nombre de zona confundiría a quien lee el marcado.
    for (const exencion of EXENCIONES_DE_ZONA) expect(ZONAS as readonly string[]).not.toContain(exencion);
  });

  it('ninguna isla escucha `click` en la ventana ni para la propagación: la escucha del fichero lo vería tarde o no lo vería', () => {
    /*
     * La escucha del fichero está en la ventana desde la activación, y en la ventana corren por orden
     * de alta: una isla que se quedara con el clic de un enlace desde otra escucha de ventana, puesta
     * después, lo cancelaría con la salida ya emitida. En el enlace, el documento o un antepasado
     * corre antes. Y una que parara la propagación lo escondería de la escucha. `fuentesDeSrc` deja
     * fuera `src/lib/medicion.ts`, el dueño de la escucha.
     *
     * Se mira el texto de las fuentes, así que se ven las formas directas —`addEventListener` a
     * secas o sobre `window`, `self`, `globalThis` o `document.defaultView`, con `.` o `?.`, y la
     * asignación de `onclick` a esos mismos—, no un nombre de evento que llegue en una variable.
     */
    const RECEPTOR = String.raw`\b(?:window|self|globalThis|document\s*\.\s*defaultView)\s*\??\.\s*`;
    const ESCUCHA_DE_VENTANA = new RegExp(
      String.raw`(?:${RECEPTOR}|(?<![.\w$]))addEventListener\s*\(\s*['"\`]click['"\`]|${RECEPTOR}onclick\s*=(?!=)`,
    );
    const PARA_LA_PROPAGACION = /\bstop(?:Immediate)?Propagation\s*\(/;
    const fuentes = [
      ...fuentesDeSrc(),
      ...ficherosDe(resolve(RAIZ, 'public', 'islas')).filter((f) => /\.m?js$/.test(f)),
    ];
    expect(fuentes.length).toBeGreaterThan(10);
    expect(fuentes.filter((f) => ESCUCHA_DE_VENTANA.test(readFileSync(f, 'utf8'))).map((f) => relative(RAIZ, f))).toEqual([]);
    expect(fuentes.filter((f) => PARA_LA_PROPAGACION.test(readFileSync(f, 'utf8'))).map((f) => relative(RAIZ, f))).toEqual([]);
    // Y los detectores ven cada forma directa, y no confunden la escucha de un elemento.
    for (const escrita of [
      "addEventListener('click', f)",
      'window.addEventListener("click", f)',
      'window?.addEventListener(`click`, f)',
      "self.addEventListener ( 'click', f)",
      "globalThis.addEventListener('click', f)",
      "document.defaultView.addEventListener('click', f)",
      'window.onclick = f',
      'globalThis.onclick=f',
    ]) {
      expect(ESCUCHA_DE_VENTANA.test(escrita), escrita).toBe(true);
    }
    for (const ajena of [
      "boton.addEventListener('click', f)",
      "document.addEventListener('click', f)",
      "addEventListener('keydown', f)",
      'if (window.onclick == f) {}',
      '<button onclick="f()">',
    ]) {
      expect(ESCUCHA_DE_VENTANA.test(ajena), ajena).toBe(false);
    }
    expect(PARA_LA_PROPAGACION.test('evento.stopPropagation()')).toBe(true);
    expect(PARA_LA_PROPAGACION.test('evento.stopImmediatePropagation ()')).toBe(true);
    expect(PARA_LA_PROPAGACION.test('// no se para la propagación')).toBe(false);
  });

  it('una sola escucha de `click`, en la ventana y en burbuja, y ninguna en el documento', () => {
    // En burbuja, no en captura: así ve el `defaultPrevented` que haya puesto una isla.
    const { escuchas } = enCita();
    expect(escuchas('ventana').filter((e) => e.tipo === 'click')).toEqual([
      { tipo: 'click', unaVez: false, captura: false, pasiva: false },
    ]);
    expect(escuchas('documento').map((e) => e.tipo)).not.toContain('click');
  });

  it('salida tras la lectura: vista, lectura y la salida con su ruta y su zona, exactamente esas claves', () => {
    const { interactuar, pulsar, balizas } = enCita();
    interactuar('pointerdown');
    pulsar(enZona('listado'));
    expect(balizas()).toEqual([
      { evento: EVENTOS.vistaDeCita, ruta: RUTA, origen: null, via: null },
      { evento: EVENTOS.lectura, ruta: RUTA, origen: null, via: null },
      { evento: EVENTOS.salidaInterna, ruta: RUTA, zona: 'listado' },
    ]);
    expect(Object.keys(salidas(balizas())[0]).sort()).toEqual(['evento', 'ruta', 'zona']);
  });

  it('sin `pointerdown` ni `keydown` —un `element.click()`—: la lectura sale antes que la salida', () => {
    const { pulsar, balizas } = enCita();
    pulsar(enZona('atribucion'));
    expect(eventos(balizas())).toEqual([EVENTOS.vistaDeCita, EVENTOS.lectura, EVENTOS.salidaInterna]);
    expect(salidas(balizas())).toEqual([{ evento: EVENTOS.salidaInterna, ruta: RUTA, zona: 'atribucion' }]);
  });

  it('una por carga: un segundo clic válido, en otra zona y a otra ruta, no emite nada', () => {
    const { interactuar, pulsar, avanzar, balizas } = enCita();
    interactuar('pointerdown');
    pulsar(enZona('listado'));
    pulsar(enZona('cabecera', '/buscar/'));
    pulsar(enZona('paginacion', '/tema/el-tiempo/2/'));
    avanzar(30_000);
    expect(eventos(balizas())).toEqual([EVENTOS.vistaDeCita, EVENTOS.lectura, EVENTOS.salidaInterna]);
    expect(salidas(balizas())[0].zona).toBe('listado');
  });

  it.each([
    ['con Meta', enZona('listado'), { metaKey: true }],
    ['con Control', enZona('listado'), { ctrlKey: true }],
    ['con Mayúsculas', enZona('listado'), { shiftKey: true }],
    ['con Alt', enZona('listado'), { altKey: true }],
    ['con el botón central', enZona('listado'), { button: 1 }],
    ['con el botón secundario', enZona('listado'), { button: 2 }],
    ['con `defaultPrevented`', enZona('listado'), { defaultPrevented: true }],
    ['a pestaña nueva (`target="_blank"`)', { ...enZona('listado'), target: '_blank' }, {}],
    ['a pestaña nueva, en mayúsculas (`target="_BLANK"`)', { ...enZona('listado'), target: '_BLANK' }, {}],
    ['a otro marco con nombre (`target="otro"`)', { ...enZona('listado'), target: 'otro' }, {}],
    ['con `download`', { ...enZona('listado'), descarga: true }, {}],
    ['a un ancla de la propia página', enZona('listado', '#contenido'), {}],
    ['a la propia ruta con otra búsqueda', enZona('listado', `${RUTA}?q=otra`), {}],
    ['a la propia ruta, entera', enZona('listado', `${ORIGEN_DEL_SANDBOX}${RUTA}#arriba`), {}],
    ['a otro origen', enZona('listado', 'https://otro.invalid/cita/otra/'), {}],
    ['a `mailto:`', enZona('listado', 'mailto:alguien@ejemplo.invalid'), {}],
    ['fuera de cualquier enlace', null, {}],
    // Enter en el campo despacha un `click` en el botón de enviar: dentro de una zona, tampoco sale.
    ['al enviar un formulario (el clic en su botón, dentro de una zona)', { envio: true, contenedores: [{ zona: 'listado' }] }, {}],
  ] as const)('no es salida %s: nada sale, y un clic válido después sí', (_, enlace, gesto) => {
    const { pulsar, balizas } = enCita();
    pulsar(enlace, gesto);
    // Ni salida ni lectura forzada: solo la vista de la carga.
    expect(eventos(balizas())).toEqual([EVENTOS.vistaDeCita]);
    pulsar(enZona('listado'));
    expect(eventos(balizas())).toEqual([EVENTOS.vistaDeCita, EVENTOS.lectura, EVENTOS.salidaInterna]);
  });

  // El navegador lee la palabra clave sin distinguir mayúsculas: `_SELF` también es la misma pestaña.
  it.each(['_self', '_SELF', '_Self'])('`target="%s"` sí es salida: se abre en la misma pestaña', (target) => {
    const { pulsar, balizas } = enCita();
    pulsar({ ...enZona('cabecera', '/'), target });
    expect(salidas(balizas())).toEqual([{ evento: EVENTOS.salidaInterna, ruta: RUTA, zona: 'cabecera' }]);
  });

  it.each([
    ['sin ningún contenedor', { href: OTRA }],
    ['con una exención', { href: OTRA, contenedores: [{ sinZona: 'chips-del-404' }] }],
    ['con una exención dentro de una zona', { href: OTRA, contenedores: [{ sinZona: 'salidas-sin-resultados' }, { zona: 'listado' }] }],
    // Con las dos en el mismo elemento manda la exención: sin esa regla, saldría con `listado`.
    ['con una exención y una zona en el mismo elemento', { href: OTRA, contenedores: [{ zona: 'listado', sinZona: 'chips-del-404' }] }],
    ['con una zona ajena al vocabulario', { href: OTRA, contenedores: [{ zona: 'inventada' }] }],
    ['con una zona ajena dentro de una buena', { href: OTRA, contenedores: [{ zona: 'inventada' }, { zona: 'listado' }] }],
    ['con una zona vacía', { href: OTRA, contenedores: [{ zona: '' }] }],
  ] as const)('sin zona válida (%s): nada sale, ni se gasta la salida ni se fuerza la lectura', (_, enlace) => {
    const { pulsar, balizas } = enCita();
    pulsar(enlace);
    expect(eventos(balizas())).toEqual([EVENTOS.vistaDeCita]);
    // No gastó la salida de la carga: la siguiente, con zona, sale con su lectura delante.
    pulsar(enZona('rutas-de-salida'));
    expect(eventos(balizas())).toEqual([EVENTOS.vistaDeCita, EVENTOS.lectura, EVENTOS.salidaInterna]);
    expect(salidas(balizas())[0].zona).toBe('rutas-de-salida');
  });

  it('la zona más concreta manda: un Chip de Tema dentro de las Rutas de salida es `chip-de-tema`', () => {
    const { pulsar, balizas } = enCita();
    pulsar({ href: '/tema/el-tiempo/', contenedores: [{ zona: 'chip-de-tema' }, { zona: 'rutas-de-salida' }] });
    expect(salidas(balizas())).toEqual([{ evento: EVENTOS.salidaInterna, ruta: RUTA, zona: 'chip-de-tema' }]);
  });

  it.each([
    ['una página 2+', '/tema/el-tiempo/2/', 'paginacion'],
    ['`/buscar/`', '/buscar/', 'resultado'],
    // El 404 se sirve en la ruta pedida, nunca en `/404`: aquí, la de una Cita retirada.
    ['el 404, en la ruta que se pidió', '/cita/una-retirada/', 'cita-del-dia'],
  ] as const)('sin lectura (%s, sin `data-vistas`): solo la salida, y nunca una lectura', (_, ruta, zona) => {
    const { interactuar, pulsar, avanzar, balizas } = medicionEnUnSandbox({ ruta });
    interactuar('pointerdown');
    pulsar(enZona(zona));
    avanzar(30_000);
    expect(balizas()).toEqual([{ evento: EVENTOS.salidaInterna, ruta, zona }]);
  });

  it('caché de atrás y adelante: la carga nueva permite otra salida, detrás de su lectura nueva', () => {
    const { interactuar, pulsar, ocultar, mostrar, restaurar, balizas } = enCita();
    interactuar('pointerdown');
    pulsar(enZona('listado'));
    ocultar();
    restaurar();
    mostrar();
    // Sin restaurar todavía no habría salido otra; tras `pageshow` con `persisted`, sí.
    pulsar(enZona('atribucion', '/autor/seneca/'));
    expect(eventos(balizas())).toEqual([
      EVENTOS.vistaDeCita,
      EVENTOS.lectura,
      EVENTOS.salidaInterna,
      EVENTOS.lectura,
      EVENTOS.salidaInterna,
    ]);
    expect(salidas(balizas()).map((b) => b.zona)).toEqual(['listado', 'atribucion']);
  });

  it('caché de atrás y adelante en una página sin lectura: otra salida, sin lectura', () => {
    const { pulsar, restaurar, balizas } = medicionEnUnSandbox({ ruta: '/buscar/' });
    pulsar(enZona('resultado'));
    pulsar(enZona('resultado', '/cita/tercera/'));
    restaurar(false);
    pulsar(enZona('resultado', '/cita/tercera/'));
    expect(eventos(balizas())).toEqual([EVENTOS.salidaInterna]);
    restaurar();
    pulsar(enZona('resultado', '/cita/tercera/'));
    expect(eventos(balizas())).toEqual([EVENTOS.salidaInterna, EVENTOS.salidaInterna]);
  });

  it('prerender: un clic antes de activarse no emite nada; tras activarse, como siempre', () => {
    const { pulsar, activar, balizas, escuchas } = enCita({ prerendering: true });
    pulsar(enZona('listado'));
    expect(balizas()).toEqual([]);
    expect(escuchas('ventana').map((e) => e.tipo)).not.toContain('click');
    activar();
    pulsar(enZona('listado'));
    expect(eventos(balizas())).toEqual([EVENTOS.vistaDeCita, EVENTOS.lectura, EVENTOS.salidaInterna]);
  });

  it('una isla que la pide por `__medir`, directa o de la cola, no la emite ni gasta la de la carga', () => {
    for (const cargado of [true, false]) {
      const { emitir, cargar, pulsar, balizas } = enCita({ cargado });
      emitir(EVENTOS.salidaInterna, null, undefined, 'listado');
      emitir(EVENTOS.salidaInterna, 'listado', 'listado');
      if (!cargado) cargar();
      expect(eventos(balizas()), cargado ? 'directo' : 'encolado').toEqual([EVENTOS.vistaDeCita]);
      pulsar(enZona('cabecera', '/'));
      expect(salidas(balizas()), cargado ? 'directo' : 'encolado').toEqual([
        { evento: EVENTOS.salidaInterna, ruta: RUTA, zona: 'cabecera' },
      ]);
    }
  });

  it('con las dos Marcas de llegada: la salida no lleva `origen` ni `via`', () => {
    const { pulsar, balizas } = enCita({ busqueda: '?de=instagram&via=whatsapp' });
    pulsar(enZona('listado'));
    expect(balizas()).toEqual([
      { evento: EVENTOS.vistaDeCita, ruta: RUTA, origen: 'instagram', via: 'whatsapp' },
      { evento: EVENTOS.lectura, ruta: RUTA, origen: 'instagram', via: 'whatsapp' },
      { evento: EVENTOS.salidaInterna, ruta: RUTA, zona: 'listado' },
    ]);
  });

  it('transporte roto: ninguna excepción sale de la escucha', () => {
    const intentos: string[] = [];
    const { pulsar, restaurar } = enCita({
      sendBeacon: (_url, carga) => {
        intentos.push(JSON.parse(carga).evento);
        throw new Error('el transporte falló');
      },
    });
    expect(() => pulsar(enZona('listado'))).not.toThrow();
    expect(() => restaurar()).not.toThrow();
    expect(() => pulsar(enZona('listado'))).not.toThrow();
    // Lo intentó: la salida salió dos veces hacia el transporte, que falló.
    expect(intentos.filter((e) => e === EVENTOS.salidaInterna)).toHaveLength(2);
  });

  it('el fichero compone el conjunto de las zonas y los atributos desde sus módulos, y no lee la dirección entera', () => {
    const guion = guionDeMedicion('https://ejemplo.invalid/e');
    expect(guion).toContain(JSON.stringify(ZONAS));
    expect(guion).toContain(JSON.stringify(`[${ATRIBUTO_DE_ZONA}],[${ATRIBUTO_SIN_ZONA}]`));
    // Ni el destino del enlace ni su texto viajan: el fichero no los lee.
    expect(guion).not.toMatch(/\.href\b|textContent|innerText|referrer/);
    // Ningún valor de zona escrito en el código de `src/lib/medicion.ts`: salen de `ZONAS`. Se leen
    // los literales con el compilador, como en la prueba de las marcas: un comentario puede
    // nombrar una zona, el código no.
    const ruta = resolve(RAIZ, 'src/lib/medicion.ts');
    const fuente = ts.createSourceFile(ruta, readFileSync(ruta, 'utf8'), ts.ScriptTarget.Latest, true);
    const literales: string[] = [];
    let trozosDePlantilla = 0;
    const recorrer = (nodo: ts.Node): void => {
      // También los trozos de las plantillas con sustituciones: de ellos se compone casi todo el fichero.
      const trozo = ts.isTemplateHead(nodo) || ts.isTemplateMiddle(nodo) || ts.isTemplateTail(nodo);
      if (ts.isStringLiteral(nodo) || ts.isNoSubstitutionTemplateLiteral(nodo) || trozo) literales.push(nodo.text);
      if (trozo) trozosDePlantilla++;
      ts.forEachChild(nodo, recorrer);
    };
    recorrer(fuente);
    expect(literales.length).toBeGreaterThan(20);
    expect(trozosDePlantilla).toBeGreaterThan(20);
    /*
     * Como en la prueba de las marcas: un literal que **es** la zona, que la lleva entre comillas o
     * que la da como valor de un atributo (`=listado`). Y uno que enumera **dos o más** zonas, con el
     * separador que sea —espacios, comas, barras—, que es como se escribiría el conjunto a mano. Una
     * sola zona suelta en un texto no cuenta: varias son palabras corrientes —`siguiente`,
     * `listado`, `resultado`, `cabecera`—, y un mensaje que las use no es una zona escrita;
     * `salidas-sin-resultados`, una exención, tampoco escribe `resultado`.
     */
    const escribe = (literal: string, zona: string) =>
      new RegExp(`^${zona}$|(['"\`])${zona}\\1|=${zona}(?![a-z-])`).test(literal);
    const enumera = (literal: string) =>
      literal.split(/[^a-z0-9-]+/).filter((palabra) => (ZONAS as readonly string[]).includes(palabra)).length >= 2;
    expect(literales.filter((l) => ZONAS.some((zona) => escribe(l, zona)) || enumera(l))).toEqual([]);
    // Y el detector ve una zona escrita, sola, entre comillas, como valor o en una lista, y deja el texto corriente.
    expect(escribe('cabecera', 'cabecera')).toBe(true);
    expect(escribe('[data-zona="listado"]', 'listado')).toBe(true);
    expect(escribe("[data-zona='chip-de-tema']", 'chip-de-tema')).toBe(true);
    expect(escribe('[data-zona=listado]', 'listado')).toBe(true);
    expect(enumera('cabecera listado resultado')).toBe(true);
    expect(enumera('cabecera,listado')).toBe(true);
    expect(enumera('(cabecera|chip-de-tema)')).toBe(true);
    expect(escribe('la página siguiente no carga', 'siguiente') || enumera('la página siguiente no carga')).toBe(false);
    expect(escribe('salidas-sin-resultados', 'resultado') || enumera('salidas-sin-resultados')).toBe(false);
  });
});

describe('Historia 23.9 — toda Obra cuenta sus vistas, se indexe o no', () => {
  /*
   * Una prueba por fila de guion de la matriz de la historia, en el entorno simulado, que desde la
   * 23.9 da también la marca de la Obra del `<html>` (`indexable`). Lo que se afirma es lo que sale
   * por `sendBeacon`, en su orden.
   */
  const [INDEXABLE, NO_INDEXABLE] = MARCAS_DE_OBRA;
  const UMBRAL = MIN_MS_VISIBLES_PARA_LA_LECTURA;
  const OBRA = '/obra/seneca/cartas-a-lucilio/';
  const OTRA_OBRA = '/obra/seneca/sobre-la-brevedad-de-la-vida/';
  /** Lo que declara la página 1 de la Obra indexable: las dos vistas, en este orden. */
  const DOS_VISTAS = `${EVENTOS.vistaDeSuperficie} ${EVENTOS.vistaDeObra}`;
  const indexable = (opciones: Parameters<typeof medicionEnUnSandbox>[0] = {}) =>
    medicionEnUnSandbox({ ruta: OBRA, vistas: DOS_VISTAS, indexable: INDEXABLE, ...opciones });
  const noIndexable = (opciones: Parameters<typeof medicionEnUnSandbox>[0] = {}) =>
    medicionEnUnSandbox({ ruta: OTRA_OBRA, vistas: EVENTOS.vistaDeObra, indexable: NO_INDEXABLE, ...opciones });
  const eventos = (balizas: Record<string, unknown>[]) => balizas.map((b) => b.evento);
  /** El Autor de la Cabecera de Obra: un enlace a otra ruta, en la zona de la Atribución. */
  const AL_AUTOR = { href: '/autor/seneca/', contenedores: [{ zona: 'atribucion' }] };

  it('la vista de Obra es una vista más: sale de `data-vistas`, no la emite solo el fichero ni es una acción', () => {
    expect([...EVENTOS_DE_VISTA]).toContain(EVENTOS.vistaDeObra);
    expect(EVENTOS_DEL_GUION).toContain(EVENTOS.vistaDeObra);
    expect(EVENTOS_SOLO_DEL_FICHERO).not.toContain(EVENTOS.vistaDeObra);
    expect(Object.keys(METRICA_DE_ACCION)).not.toContain(EVENTOS.vistaDeObra);
    // El atributo y el conjunto, compuestos en el fichero desde sus módulos.
    expect(ATRIBUTO_DE_INDEXABLE).toBe('data-indexable');
    const guion = guionDeMedicion('https://ejemplo.invalid/e');
    expect(guion).toContain(JSON.stringify(ATRIBUTO_DE_INDEXABLE));
    expect(guion).toContain(JSON.stringify(MARCAS_DE_OBRA));
  });

  it('Obra indexable: la vista de superficie y la de Obra con su marca, en ese orden; después, una sola lectura', () => {
    const { avanzar, interactuar, balizas, pendientes } = indexable();
    expect(balizas()).toEqual([
      { evento: EVENTOS.vistaDeSuperficie, ruta: OBRA, origen: null, via: null },
      { evento: EVENTOS.vistaDeObra, ruta: OBRA, origen: null, via: null, indexable: INDEXABLE },
    ]);
    avanzar(UMBRAL);
    interactuar('pointerdown');
    avanzar(10 * 60_000);
    expect(eventos(balizas())).toEqual([EVENTOS.vistaDeSuperficie, EVENTOS.vistaDeObra, EVENTOS.lectura]);
    // La lectura no lleva la marca de la Obra: solo la lleva el evento que la declara.
    expect(balizas()[2]).toEqual({ evento: EVENTOS.lectura, ruta: OBRA, origen: null, via: null });
    expect(pendientes()).toBe(0);
  });

  it('Obra no indexable: solo la vista de Obra, y gana su lectura a los 8 s', () => {
    const { avanzar, balizas } = noIndexable();
    expect(balizas()).toEqual([
      { evento: EVENTOS.vistaDeObra, ruta: OTRA_OBRA, origen: null, via: null, indexable: NO_INDEXABLE },
    ]);
    avanzar(UMBRAL - 1);
    expect(eventos(balizas())).toEqual([EVENTOS.vistaDeObra]);
    avanzar(1);
    expect(eventos(balizas())).toEqual([EVENTOS.vistaDeObra, EVENTOS.lectura]);
    expect(balizas()[1]).toEqual({ evento: EVENTOS.lectura, ruta: OTRA_OBRA, origen: null, via: null });
  });

  it('Obra no indexable: con una interacción antes, la lectura sale entonces; y su salida, detrás de ella', () => {
    const { interactuar, pulsar, avanzar, balizas } = noIndexable();
    avanzar(1_000);
    interactuar('keydown');
    expect(eventos(balizas())).toEqual([EVENTOS.vistaDeObra, EVENTOS.lectura]);
    pulsar(AL_AUTOR);
    expect(eventos(balizas())).toEqual([EVENTOS.vistaDeObra, EVENTOS.lectura, EVENTOS.salidaInterna]);
    expect(balizas()[2]).toEqual({ evento: EVENTOS.salidaInterna, ruta: OTRA_OBRA, zona: 'atribucion' });
  });

  it('Obra no indexable: un clic sin `pointerdown` emite antes la lectura que debía, y la salida sale detrás', () => {
    const { pulsar, avanzar, balizas } = noIndexable();
    pulsar(AL_AUTOR);
    expect(eventos(balizas())).toEqual([EVENTOS.vistaDeObra, EVENTOS.lectura, EVENTOS.salidaInterna]);
    avanzar(10 * 60_000);
    expect(balizas()).toHaveLength(3);
  });

  it('página 2+ de una Obra: ni vista, ni marca, ni lectura; la salida sale sola, como hoy', () => {
    const ruta = `${OTRA_OBRA}2/`;
    const { interactuar, avanzar, pulsar, balizas } = medicionEnUnSandbox({ ruta });
    interactuar('pointerdown');
    avanzar(10 * 60_000);
    expect(balizas()).toEqual([]);
    pulsar({ href: OTRA_OBRA, contenedores: [{ zona: 'paginacion' }] });
    expect(balizas()).toEqual([{ evento: EVENTOS.salidaInterna, ruta, zona: 'paginacion' }]);
  });

  it('llegada `?de=instagram&via=whatsapp` a la indexable: las dos vistas y la lectura llevan las dos marcas, y la dirección las pierde', () => {
    const { interactuar, balizas, direccion } = indexable({ busqueda: '?de=instagram&via=whatsapp' });
    expect(direccion()).toBe(OBRA);
    interactuar('pointerdown');
    expect(balizas().map((b) => [b.evento, b.origen, b.via, b.indexable])).toEqual([
      [EVENTOS.vistaDeSuperficie, 'instagram', 'whatsapp', undefined],
      [EVENTOS.vistaDeObra, 'instagram', 'whatsapp', INDEXABLE],
      [EVENTOS.lectura, 'instagram', 'whatsapp', undefined],
    ]);
    // SM-8 como hoy: una sola vista de superficie con origen.
    expect(balizas().filter((b) => b.evento === EVENTOS.vistaDeSuperficie && b.origen !== null)).toHaveLength(1);
  });

  it.each([
    ['de otro conjunto', 'si'],
    ['inventada', 'lo-que-me-invente'],
    ['vacía', ''],
    ['ausente', undefined],
  ])('marca %s en el `<html>`: la vista de Obra sale igual, con `indexable` nulo', (_, marca) => {
    const { balizas } = noIndexable({ indexable: marca });
    expect(balizas()).toEqual([
      { evento: EVENTOS.vistaDeObra, ruta: OTRA_OBRA, origen: null, via: null, indexable: null },
    ]);
  });

  it('marca puesta y una vista que no la declara: la vista de superficie sale sin `indexable`, y ni la lectura ni las acciones la llevan', () => {
    const { emitir, pulsar, balizas } = medicionEnUnSandbox({
      ruta: '/autor/seneca/',
      vistas: EVENTOS.vistaDeSuperficie,
      indexable: INDEXABLE,
    });
    emitir(EVENTOS.copiado);
    emitir(EVENTOS.comparticionDeEnlace, null, 'whatsapp');
    pulsar({ href: '/cita/una/', contenedores: [{ zona: 'listado' }] });
    expect(eventos(balizas())).toEqual([
      EVENTOS.vistaDeSuperficie,
      EVENTOS.lectura,
      EVENTOS.copiado,
      EVENTOS.comparticionDeEnlace,
      EVENTOS.salidaInterna,
    ]);
    for (const baliza of balizas()) expect(baliza, String(baliza.evento)).not.toHaveProperty('indexable');
  });

  it('una vista de Obra que pidiera una isla sale sin la marca del `<html>`, como sin las de llegada: la marca solo viaja con la vista declarada', () => {
    // Revisión de la 23.9: ninguna isla la pide (lo vigila la guarda de abajo), y si alguna lo
    // hiciera, su baliza no se confundiría con la de la página: `indexable` nula.
    const { emitir, balizas } = indexable({ busqueda: '?de=instagram' });
    emitir(EVENTOS.vistaDeObra);
    expect(balizas().slice(2)).toEqual([
      { evento: EVENTOS.vistaDeObra, ruta: OBRA, origen: null, via: null, indexable: null },
    ]);
    // Las dos declaradas, con las suyas.
    expect(balizas()[1]).toEqual({ evento: EVENTOS.vistaDeObra, ruta: OBRA, origen: 'instagram', via: null, indexable: INDEXABLE });
  });

  it('caché de atrás y adelante: ninguna vista nueva; otra lectura, sin marcas de llegada ni de Obra', () => {
    const { interactuar, restaurar, avanzar, balizas } = indexable({ busqueda: '?de=instagram' });
    interactuar('pointerdown');
    restaurar();
    avanzar(UMBRAL);
    expect(eventos(balizas())).toEqual([
      EVENTOS.vistaDeSuperficie,
      EVENTOS.vistaDeObra,
      EVENTOS.lectura,
      EVENTOS.lectura,
    ]);
    expect(balizas()[3]).toEqual({ evento: EVENTOS.lectura, ruta: OBRA, origen: null, via: null });
  });

  it('prerender: nada hasta activarse; al activarse, las dos vistas, una vez, con su marca', () => {
    const { avanzar, interactuar, activar, balizas, pendientes } = indexable({ prerendering: true });
    avanzar(30_000);
    interactuar('pointerdown');
    expect(balizas()).toEqual([]);
    expect(pendientes()).toBe(0);
    activar();
    expect(balizas()).toEqual([
      { evento: EVENTOS.vistaDeSuperficie, ruta: OBRA, origen: null, via: null },
      { evento: EVENTOS.vistaDeObra, ruta: OBRA, origen: null, via: null, indexable: INDEXABLE },
    ]);
    activar();
    expect(eventos(balizas())).toEqual([EVENTOS.vistaDeSuperficie, EVENTOS.vistaDeObra]);
  });

  it('ninguna isla pide la vista de Obra ni lee su marca: la escribe el armazón y la lee solo el fichero', () => {
    // Los dueños: el vocabulario la declara, `superficies.ts` la declara por superficie y nombra las
    // marcas y `Armazon.astro` escribe el atributo. `medicion.ts` ya queda fuera de `fuentesDeSrc`.
    // `umbrales.ts` anota lo que pesa en el fichero sin nombrar ninguno de estos identificadores, así
    // que no está exento: un uso de verdad allí saldría aquí.
    const DUEÑOS = ['lib/vocabulario.ts', 'lib/superficies.ts', 'components/Armazon.astro'];
    const PROHIBIDO = /EVENTOS\.vistaDeObra|ATRIBUTO_DE_INDEXABLE|MARCAS_DE_OBRA|data-indexable|vista-de-obra/;
    const fuentes = [
      ...fuentesDeSrc().filter((f) => !DUEÑOS.some((d) => f.endsWith(d))),
      ...ficherosDe(resolve(RAIZ, 'public', 'islas')).filter((f) => /\.m?js$/.test(f)),
    ];
    expect(fuentes.length).toBeGreaterThan(10);
    const infractores = fuentes.filter((f) => PROHIBIDO.test(readFileSync(f, 'utf8')));
    expect(infractores.map((f) => relative(RAIZ, f))).toEqual([]);
  });
});

describe('Historia 23.1 — la versión del fichero sale de su contenido', () => {
  it('el mismo punto final da la misma ruta; otro punto final, otra', () => {
    const una = rutaDelGuionDeMedicion('https://a.invalid/e');
    expect(rutaDelGuionDeMedicion('https://a.invalid/e')).toBe(una);
    expect(rutaDelGuionDeMedicion('https://b.invalid/e')).not.toBe(una);
    expect(guionExternoDe(una)?.id).toBe('medicion');
  });

  it('otro guion, otra versión', () => {
    const guion = guionDeMedicion('https://a.invalid/e');
    expect(versionDelGuion(guion)).toBe(versionDelGuion(guion));
    expect(versionDelGuion(`${guion} `)).not.toBe(versionDelGuion(guion));
    expect(versionDelGuion(guion.replace('sendBeacon', 'sendBeacom'))).not.toBe(versionDelGuion(guion));
    expect(versionDelGuion('')).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('Historia 23.1 — la lista cerrada de guiones externos', () => {
  it('cada entrada tiene un tope entero positivo y un nombre propio', () => {
    expect(GUIONES_EXTERNOS.map((g) => g.id).sort()).toEqual(['busqueda', 'filtro', 'imagen', 'medicion', 'pagefind']);
    for (const guion of GUIONES_EXTERNOS) {
      expect(Number.isInteger(guion.tope) && guion.tope > 0, `${guion.id}: ${guion.tope}`).toBe(true);
      expect(guion.reconoce.global, guion.id).toBe(false);
      expect(guion.trozos?.global ?? false, guion.id).toBe(false);
    }
  });

  it('reconoce lo que la lista nombra, del mismo origen, y nada más', () => {
    expect(guionExternoDe('/medicion/0a1b2c3d.js')?.id).toBe('medicion');
    expect(guionExternoDe('/islas/imagen.js')?.id).toBe('imagen');
    expect(guionExternoDe('/islas/imagen.js?2')?.id).toBe('imagen');
    expect(guionExternoDe('/pagefind/pagefind.js')?.id).toBe('pagefind');
    // Historia 26.6 — el filtro de los Directorios, con el resumen que Astro le ponga.
    expect(guionExternoDe(`/_astro/${FICHERO_DEL_FILTRO}.C2e0gZJx.js`)?.id).toBe('filtro');
    expect(guionExternoDe(`/_astro/${FICHERO_DEL_FILTRO}.Ab-_9.js?v=1`)?.id).toBe('filtro');
    // Historia 27.2 — la búsqueda, igual. Un trozo compartido no lo pide ninguna página: solo se
    // reconoce como descargado, porque lo importa el fichero de una entrada.
    expect(guionExternoDe(`/_astro/${FICHERO_DE_LA_BUSQUEDA}.uFiLpMg3.js`)?.id).toBe('busqueda');
    expect(guionExternoDe('/_astro/recuentos.BGxwaxf_.js')).toBeUndefined();
    expect(['filtro', 'busqueda']).toContain(entradaDeLoDescargado('/_astro/recuentos.BGxwaxf_.js')?.id);
    for (const ajeno of ['/_astro/recuentos.js', '/_astro/a/b.X.js', '/_astro/_slug_.Cwmuv9Wk.js', '/islas/recuentos.X.js']) {
      expect(entradaDeLoDescargado(ajeno), ajeno).toBeUndefined();
    }
    for (const ajeno of [
      `/_astro/${FICHERO_DE_LA_BUSQUEDA}.js`,
      `/_astro/Busqueda.astro_astro_type_script_index_1_lang.uFiLpMg3.js`,
      '/_astro/OtroComponente.astro_astro_type_script_index_0_lang.C2e0gZJx.js',
      `/_astro/${FICHERO_DEL_FILTRO}.js`,
      `/_astro/${FICHERO_DEL_FILTRO}.a/b.js`,
      `https://sabiduriadebolsillo.net/_astro/${FICHERO_DEL_FILTRO}.C2e0gZJx.js`,
      'https://sabiduriadebolsillo.net/islas/imagen.js',
      '//cdn.ejemplo.org/islas/imagen.js',
      'islas/imagen.js',
      '/islas/otra.js',
      '/medicion/version.js',
      '/pagefind/pagefind-ui.js',
      '(import sin literal) ruta',
    ]) {
      expect(guionExternoDe(ajeno), ajeno).toBeUndefined();
    }
  });

  it('el detector ve el `src`, el `import()` con cadena, con plantilla y concatenado, y el que no sabe leer', () => {
    const html = [
      '<script type="application/ld+json">{"x":"import(\'/no.js\')"}</script>',
      '<script src="https://otro.ejemplo.org/x.js"></script>',
      "<script>import('/a.js');import(`/islas/imagen.js${n}`);import('/b.js' + n);import(ruta)</script>",
    ].join('');
    const externos = guionesExternosDe(html);
    expect(externos.slice(0, 4)).toEqual([
      'https://otro.ejemplo.org/x.js',
      '/a.js',
      '/islas/imagen.js',
      '/b.js',
    ]);
    expect(externos[4]).toMatch(/^\(import\(\) sin literal\)/);
    // Lo ajeno y lo que no se sabe leer no casan con ninguna entrada: la prueba de `dist/` falla.
    expect(externos.filter((e) => guionExternoDe(e) === undefined)).toHaveLength(4);
  });

  it('el detector ve también lo que no es `<script src>` ni `import()`, y no lo que va en un comentario', () => {
    /*
     * Revisión de la 23.1: el detector solo miraba `<script src>` y el `import()` de los guiones
     * en línea, así que un worker, un `modulepreload` o un `<script>` creado a mano descargaban
     * guion fuera de la lista sin que la prueba de `dist/` lo viera. Y `\bsrc=` casaba con
     * `data-src=`.
     */
    const html = [
      '<img data-src="/no-es-guion.js">',
      '<script data-src="/tampoco.js">/* import(\'/comentado.js\') */</script>',
      '<link rel="modulepreload" href="/precargado.js">',
      '<link rel="preload" as="script" href="/adelantado.js">',
      '<link rel="preload" as="font" href="/letra.woff2">',
      "<script>new Worker('/w.js');new SharedWorker(base + 'c.js');importScripts('/i.js');" +
        "navigator.serviceWorker.register('/sw.js');document.createElement('script')</script>",
      "<script type=\"module\">import x from '/modulo.js';</script>",
    ].join('');
    const externos = guionesExternosDe(html);
    expect(externos.slice(0, 2)).toEqual(['/precargado.js', '/adelantado.js']);
    expect(externos).toContain('/w.js');
    expect(externos).toContain('/i.js');
    expect(externos).toContain('/sw.js');
    expect(externos).toContain('/modulo.js');
    expect(externos.some((e) => e.startsWith('(new SharedWorker sin literal)'))).toBe(true);
    expect(externos.some((e) => e.startsWith("(createElement('script') sin literal)"))).toBe(true);
    for (const ausente of ['/no-es-guion.js', '/tampoco.js', '/comentado.js', '/letra.woff2']) {
      expect(externos).not.toContain(ausente);
    }
    expect(externos.filter((e) => guionExternoDe(e) === undefined)).toHaveLength(externos.length);
  });

  it('el detector ve los workers y *worklets* precargados, el constructor por la ventana y el `addModule`', () => {
    // Revisión de la 23.1, segunda pasada: lo que la primera ampliación del detector aún no veía.
    const html = [
      '<link rel="preload" as="worker" href="/precargado-worker.js">',
      '<link rel="prefetch" as="paintworklet" href="/pintor.js">',
      '<link rel="prefetch" href="/sin-como.mjs">',
      '<link rel="prefetch" href="/otra-pagina/">',
      "<script>new window.Worker('/ventana.js');self.importScripts('/propio.js');" +
        "CSS.paintWorklet.addModule('/pincel.js');audioContext.audioWorklet.addModule(ruta)</script>",
    ].join('');
    const externos = guionesExternosDe(html);
    for (const visto of ['/precargado-worker.js', '/pintor.js', '/sin-como.mjs', '/ventana.js', '/propio.js', '/pincel.js']) {
      expect(externos, visto).toContain(visto);
    }
    expect(externos.some((e) => e.startsWith('(worklet.addModule sin literal)'))).toBe(true);
    // Un `prefetch` sin `as` de algo que no es guion —una página— no es una descarga de guion.
    expect(externos).not.toContain('/otra-pagina/');
  });

  it('las importaciones estáticas se leen del árbol, también tras un comentario; las dinámicas no cuentan', () => {
    expect(
      importacionesEstaticasDe(
        "import a from './a.js';\nimport './b.js';export { c } from \"../c.js\";const d = import('./d.js');" +
          "/* x */import e from './e.js';// import f from './f.js'",
      ),
    ).toEqual(['./a.js', './b.js', '../c.js', './e.js']);
  });

  it('lo que una entrada arranca se cuenta y se coteja con lo que declara', () => {
    const ficheros: Record<string, string> = {
      '/dist/p.js': "import './q.js'; const w = new Worker(`${base}w.js`);",
      '/dist/q.js': 'export const q = 1;',
      '/dist/w.js': "importScripts('/otro.js');",
    };
    const leer = (fichero: string) => Buffer.from(ficheros[fichero], 'utf8');
    const declarada = descargaDeLaEntrada('/dist', '/p.js', [{ como: 'new Worker', ruta: '/w.js' }], leer);
    expect(declarada.ficheros.sort()).toEqual(['/p.js', '/q.js', '/w.js']);
    expect(declarada.bytes).toBe(Object.values(ficheros).reduce((n, f) => n + Buffer.byteLength(f), 0));
    // El worker pide otro fichero que nadie declaró: fallo, no cero.
    expect(declarada.sinDeclarar).toEqual(["/w.js: importScripts('/otro.js')"]);
    expect(declarada.sinVer).toEqual([]);

    const sinDeclarar = descargaDeLaEntrada('/dist', '/p.js', [], leer);
    expect(sinDeclarar.sinDeclarar).toEqual(['/p.js: new Worker(`${base}w.js`)']);
    const rancia = descargaDeLaEntrada('/dist', '/q.js', [{ como: 'import()', ruta: '/x.js' }], (f) =>
      f === '/dist/x.js' ? Buffer.from('') : leer(f),
    );
    expect(rancia.sinVer).toEqual([{ como: 'import()', ruta: '/x.js' }]);
  });

  it('lo que una entrada pide de otra entrada de la lista no cuenta en su tope y se devuelve para medirlo allí — Historia 27.2', () => {
    const ficheros: Record<string, string> = {
      '/dist/b.js': "import './c.js'; const i = () => import(`/pagefind/pagefind.js` + (n ? '?' + n : ''));",
      '/dist/c.js': 'export const c = 1;',
    };
    const leer = (fichero: string) => Buffer.from(ficheros[fichero], 'utf8');
    const conPide = descargaDeLaEntrada('/dist', '/b.js', [], leer, ['pagefind']);
    expect(conPide.ficheros.sort()).toEqual(['/b.js', '/c.js']);
    expect(conPide.bytes).toBe(Object.values(ficheros).reduce((n, f) => n + Buffer.byteLength(f), 0));
    expect(conPide.sinDeclarar).toEqual([]);
    expect(conPide.pedidas).toEqual(['/pagefind/pagefind.js']);
    expect(conPide.pideSinVer).toEqual([]);
    // Sin declararla en `pide`, es un `import()` sin declarar: fallo.
    const sinPide = descargaDeLaEntrada('/dist', '/b.js', [], leer);
    expect(sinPide.sinDeclarar).toHaveLength(1);
    expect(sinPide.pedidas).toEqual([]);
    // Declarada y nunca pedida: rancia.
    expect(descargaDeLaEntrada('/dist', '/c.js', [], leer, ['pagefind']).pideSinVer).toEqual(['pagefind']);
    // Y la búsqueda es la única entrada que pide otra, y lo que pide es Pagefind.
    expect(GUIONES_EXTERNOS.filter((g) => g.pide !== undefined).map((g) => [g.id, g.pide])).toEqual([['busqueda', ['pagefind']]]);
  });
});

/*
 * Un sitio construido **con** la medición configurada y con Pagefind, que comparten la matriz de
 * la Historia 20.1, el listón de la Página de Cita y la lista cerrada de guiones externos. Lleva
 * una Cita más de las que caben en una página, todas del mismo Autor, del mismo Tema y de la
 * misma Colección, para que los tres listados tengan página 2: la que es `servicio` y no debe
 * emitir la vista. Y una Cita de más de `MAX_CARACTERES_IMAGEN` caracteres, que no ofrece
 * Imagen: es la Página de Cita con menos guion. El mismo corpus se construye además **sin**
 * punto final, para ver que entonces no se pide nada.
 */
const ENDPOINT = 'https://medicion.ejemplo.workers.dev/e';
const SLUGS = Array.from(
  { length: CITAS_POR_PAGINA + 1 },
  (_, i) => `seneca-frase-${String(i).padStart(3, '0')}`,
);
const TEXTO_LARGO =
  'Frase larga del catálogo de prueba, escrita para pasar del tope de la Imagen de Cita: ' +
  'mientras se aplaza la vida, la vida pasa; todo lo demás es ajeno, solo el tiempo es ' +
  'nuestro, y esa sola posesión, fugaz y resbaladiza, nos la arrebata cualquiera que ' +
  'quiere, sin que nos demos cuenta de lo que hemos perdido hasta que ya no queda nada.';
const SLUG_LARGO = 'seneca-frase-larga';
const CORPUS_MEDIDO: Record<string, string> = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'colecciones/frases-cortas.yml': coleccionValida({ miembros: SLUGS }),
  ...Object.fromEntries(
    SLUGS.map((slug, i) => [
      `citas/${slug}.md`,
      citaValida({
        texto: `Frase número ${i} del catálogo de prueba.`,
        slug,
        /*
         * Historia 23.7 — la primera, apta para portada: así la portada y el 404 tienen Cita del
         * Día, y sus zonas (`cita-del-dia`, y `atribucion` en el Bloque de Cita) salen en `dist/`.
         * Es la única apta, así que la Cita del Día es esa en cualquier jornada.
         */
        ...(i === 0 ? { aptaParaPortada: true } : {}),
      }),
    ]),
  ),
  // Historia 23.1 — fuera del Tema y de la Colección, para no tocar sus listados.
  [`citas/${SLUG_LARGO}.md`]: citaValida({ texto: TEXTO_LARGO, slug: SLUG_LARGO, temas: [] }),
  /*
   * Historia 22.4 — dos Citas de otra obra, para que haya una Obra indexable («Cartas a
   * Lucilio», 2 de 54) junto a una que no lo es («Sobre la brevedad de la vida», 52 de 54, y
   * paginada). Fuera de la Colección y del Tema, para no tocar sus listados.
   */
  ...Object.fromEntries(
    [0, 1].map((i) => [
      `citas/seneca-carta-${i}.md`,
      citaValida({
        texto: `Carta número ${i} del catálogo de prueba.`,
        slug: `seneca-carta-${i}`,
        temas: [],
        procedencia: { obra: 'Cartas a Lucilio', año: 64 },
        fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Cartas_a_Lucilio' },
      }),
    ]),
  ),
};
const SLUGS_DE_CITA = [...SLUGS, SLUG_LARGO, 'seneca-carta-0', 'seneca-carta-1'];
const TEXTOS_DE_CITA = [
  ...SLUGS.map((_, i) => `Frase número ${i} del catálogo de prueba.`),
  TEXTO_LARGO,
  ...[0, 1].map((i) => `Carta número ${i} del catálogo de prueba.`),
];

/** Construye una vez por entorno y apunta el proyecto para limpiarlo, falle o no. */
function construccionUnica(
  entorno: Record<string, string>,
  conBusqueda = false,
): () => Promise<string> {
  let construccion: Promise<string> | undefined;
  return () => {
    construccion ??= construirConCorpus(CORPUS_MEDIDO, { entorno, conBusqueda }).then(
      (resultado) => {
        // Se apunta **antes** de afirmar: un build fallido también deja su proyecto temporal.
        aLimpiar.push(resultado.proyecto);
        expect(resultado.codigo, resultado.salida).toBe(0);
        return resultado.proyecto;
      },
    );
    return construccion;
  };
}
const sitioMedido = construccionUnica({ MEDICION_ENDPOINT: ENDPOINT }, true);
const sitioSinMedir = construccionUnica({});

const leerMedida = async (ruta: string) =>
  readFile(paginaConstruida(await sitioMedido(), ruta), 'utf8');
const leerSinMedir = async (ruta: string) =>
  readFile(paginaConstruida(await sitioSinMedir(), ruta), 'utf8');

/** Cada página HTML de un `dist/`, por su ruta pública. */
function paginasDe(proyecto: string): Map<string, string> {
  const dist = join(proyecto, 'dist');
  const paginas = new Map<string, string>();
  for (const fichero of ficherosDe(dist)) {
    if (!fichero.endsWith('.html')) continue;
    const relativa = relative(dist, fichero).split('\\').join('/');
    const ruta =
      relativa === '404.html'
        ? '/404'
        : `/${relativa.replace(/index\.html$/, '')}`;
    paginas.set(ruta, readFileSync(fichero, 'utf8'));
  }
  return paginas;
}

/** El `data-vistas` del `<html>`, o `undefined` si la página no lo lleva. */
const vistasDe = (html: string): string | undefined =>
  /<html\b[^>]*\bdata-vistas="([^"]*)"/.exec(html)?.[1];

/** El `<head>` de una página. */
const cabezaDe = (html: string): string => html.slice(0, html.indexOf('</head>'));

const RUTA_DEL_FICHERO = rutaDelGuionDeMedicion(ENDPOINT);
const CITA = `/cita/${SLUGS[0]}/`;
const CITA_SIN_IMAGEN = `/cita/${SLUG_LARGO}/`;
const PAGINAS_1 = ['/', '/autor/seneca/', '/tema/el-tiempo/', '/coleccion/frases-cortas/'];
const PAGINAS_2 = ['/autor/seneca/2/', '/tema/el-tiempo/2/', '/coleccion/frases-cortas/2/'];
const SIN_VISTA = ['/buscar/', '/404', '/kit/', '/lote/'];
const AJENAS = ['/kit/', '/lote/'];
/** Historia 22.4 — la Obra indexable emite; la que repite su Autor y su página 2, no. */
const OBRA_INDEXABLE = '/obra/seneca/cartas-a-lucilio/';
const OBRAS = [
  OBRA_INDEXABLE,
  '/obra/seneca/sobre-la-brevedad-de-la-vida/',
  '/obra/seneca/sobre-la-brevedad-de-la-vida/2/',
];

describe('Historia 20.1 y 23.1 — las vistas salen de la declaración, al `data-vistas`', () => {
  // La lista de rutas indexables que FR-52 da para este corpus; sin ella `consecuenciasDe` no
  // sabe qué es una Obra. Que el build decidió lo mismo lo dice la propia comparación.
  beforeEach(() => {
    declararRutasIndexables([OBRA_INDEXABLE]);
  });
  afterEach(() => {
    olvidarRutasIndexables();
  });

  it.each(PAGINAS_1)('%s declara una sola vista de superficie y ninguna de Cita', async (ruta) => {
    expect(vistasDe(await leerMedida(ruta))).toBe(EVENTOS.vistaDeSuperficie);
  }, 240_000);

  it('la Página de Cita, con Imagen o sin ella, declara su vista y ninguna de superficie', async () => {
    expect(vistasDe(await leerMedida(CITA))).toBe(EVENTOS.vistaDeCita);
    expect(vistasDe(await leerMedida(CITA_SIN_IMAGEN))).toBe(EVENTOS.vistaDeCita);
  }, 240_000);

  it('la Obra indexable declara la vista de superficie y la de Obra; la que no se indexa, la de Obra; su página 2, ninguna', async () => {
    // Historia 23.9 — la vista de Obra la declara la página 1 de toda Obra, se indexe o no.
    expect(vistasDe(await leerMedida(OBRAS[0]))).toBe(`${EVENTOS.vistaDeSuperficie} ${EVENTOS.vistaDeObra}`);
    expect(vistasDe(await leerMedida(OBRAS[1]))).toBe(EVENTOS.vistaDeObra);
    expect(vistasDe(await leerMedida(OBRAS[2]))).toBeUndefined();
  }, 240_000);

  it.each([...PAGINAS_2, ...SIN_VISTA])('%s no declara ninguna vista', async (ruta) => {
    expect(vistasDe(await leerMedida(ruta))).toBeUndefined();
  }, 240_000);

  it.each([
    ['con punto final', sitioMedido],
    ['sin punto final', sitioSinMedir],
  ] as const)(
    '%s, el `data-vistas` de cada ruta construida es exactamente el de `superficies.ts`',
    async (_, sitio) => {
      const paginas = paginasDe(await sitio());
      expect(paginas.size).toBeGreaterThan(SLUGS_DE_CITA.length);
      for (const [ruta, html] of paginas) {
        const declaradas = consecuenciasDe(ruta).vistas;
        expect(vistasDe(html), ruta).toBe(declaradas.length > 0 ? declaradas.join(' ') : undefined);
      }
    },
    240_000,
  );

  it('ninguna superficie escribe el nombre de una vista como cadena suelta', () => {
    // El vocabulario es el único sitio donde se escriben, desde la Historia 23.2; la de Obra, desde
    // la 23.9, igual. Ve también lo citado entre comillas invertidas en los comentarios.
    const suelta = /["'`]vista-de-(cita|superficie|obra)["'`]/;
    for (const fuente of fuentesDeSrc().filter((f) => !f.endsWith('lib/vocabulario.ts'))) {
      expect(readFileSync(fuente, 'utf8'), fuente).not.toMatch(suelta);
    }
  });
});

/**
 * El valor de la marca de Obra del `<html>`, o `undefined` si la página no la lleva, y su `noindex`:
 * los lee el mismo `marcasDePagina` que la comprobación de `astro:build:done`, no una copia de sus
 * expresiones.
 */
const marcaDeObraDe = (html: string): string | undefined => marcasDePagina(html).marcaDeObra;
const llevaNoindex = (html: string): boolean => marcasDePagina(html).noindex;

describe('Historia 23.9 — la marca de Obra, en `dist/`', () => {
  beforeEach(() => {
    declararRutasIndexables([OBRA_INDEXABLE]);
  });
  afterEach(() => {
    olvidarRutasIndexables();
  });

  it.each([
    ['con punto final', sitioMedido],
    ['sin punto final', sitioSinMedir],
  ] as const)(
    '%s, la marca de cada ruta construida es exactamente la de `superficies.ts`',
    async (_, sitio) => {
      const paginas = paginasDe(await sitio());
      expect(paginas.size).toBeGreaterThan(SLUGS_DE_CITA.length);
      const [, noIndexable] = MARCAS_DE_OBRA;
      for (const [ruta, html] of paginas) {
        const marca = marcaDeObraDe(html);
        expect(marca, ruta).toBe(consecuenciasDe(ruta).marcaDeObra);
        // Y, en cada página que la lleva, dice lo mismo que su `noindex` (AD-17).
        if (marca !== undefined) expect(llevaNoindex(html), ruta).toBe(marca === noIndexable);
      }
    },
    240_000,
  );

  it.each([
    ['con punto final', sitioMedido],
    ['sin punto final', sitioSinMedir],
  ] as const)('%s, toda página 1 de Obra lleva su marca, y casa con su `noindex`', async (_, sitio) => {
    const proyecto = await sitio();
    const leer = (ruta: string) => readFile(paginaConstruida(proyecto, ruta), 'utf8');
    const [indexable, noIndexable] = MARCAS_DE_OBRA;
    const primera = await leer(OBRAS[0]);
    expect(marcaDeObraDe(primera)).toBe(indexable);
    expect(llevaNoindex(primera)).toBe(false);
    const segunda = await leer(OBRAS[1]);
    expect(marcaDeObraDe(segunda)).toBe(noIndexable);
    expect(llevaNoindex(segunda)).toBe(true);
    expect(vistasDe(segunda)).toBe(EVENTOS.vistaDeObra);
    // La página 2 de la Obra: ni marca ni vista.
    const paginaDos = await leer(OBRAS[2]);
    expect(marcaDeObraDe(paginaDos)).toBeUndefined();
    expect(vistasDe(paginaDos)).toBeUndefined();
  }, 240_000);

  it('la página 1 de la Obra que no se indexa ya es superficie con lectura: pide el fichero y declara vista', async () => {
    // El suelo `sinLectura` de la 23.7 no la nombraba, a propósito: con su vista sale de él.
    const html = await leerMedida(OBRAS[1]);
    expect(etiquetasDeGuionExterno(html).map((e) => e.src)).toContain(RUTA_DEL_FICHERO);
    expect(vistasDe(html)).toBeDefined();
  }, 240_000);

  it('SM-8: las consultas de `DESPLIEGUE.md` cuentan la vista de Cita y la de superficie, y no la de Obra', () => {
    const despliegue = readFileSync(resolve(RAIZ, 'DESPLIEGUE.md'), 'utf8');
    const inicio = despliegue.indexOf('### Consultar el canal propio — SM-8');
    expect(inicio).toBeGreaterThan(-1);
    // Hasta el siguiente encabezado de nivel 2 o 3, sea cual sea: los comentarios de las órdenes
    // (`# …`) no lo son.
    const fin = despliegue.slice(inicio + 1).search(/\n#{2,3} /u);
    const seccion = despliegue.slice(inicio, fin === -1 ? undefined : inicio + 1 + fin);
    // Los filtros que cuentan vistas: uno de acciones u otros eventos no es de esta regla.
    const filtros = [...seccion.matchAll(/evento IN \(([^)]*)\)/g)].map((m) => m[1]).filter((f) => f.includes("'vista-"));
    expect(filtros.length).toBeGreaterThanOrEqual(2);
    for (const filtro of filtros) {
      expect(filtro).toContain(`'${EVENTOS.vistaDeCita}'`);
      expect(filtro).toContain(`'${EVENTOS.vistaDeSuperficie}'`);
      expect(filtro).not.toContain(EVENTOS.vistaDeObra);
    }
    // Y la razón de profundidad tampoco la suma: solo nombra la de Obra para decir que no entra.
    for (const consulta of seccion.match(/npx --yes wrangler[\s\S]*?"\n/g) ?? []) {
      expect(consulta).not.toContain(EVENTOS.vistaDeObra);
    }
  });
});

describe('Historia 23.1 — con punto final, la medición es un fichero', () => {
  beforeEach(() => {
    declararRutasIndexables([OBRA_INDEXABLE]);
  });
  afterEach(() => {
    olvidarRutasIndexables();
  });

  it('el build escribe el fichero, versionado, con el emisor compuesto desde `medicion.ts`', async () => {
    const fichero = join(await sitioMedido(), 'dist', RUTA_DEL_FICHERO);
    expect(existsSync(fichero), fichero).toBe(true);
    expect(readFileSync(fichero, 'utf8')).toBe(guionDeMedicion(ENDPOINT));
    expect(readdirSync(join(await sitioMedido(), 'dist', 'medicion'))).toHaveLength(1);
  }, 240_000);

  it('toda página `producto` o `servicio` lo pide una sola vez, con `defer`, en el `<head>`; `/kit` y `/lote`, no', async () => {
    const paginas = paginasDe(await sitioMedido());
    for (const [ruta, html] of paginas) {
      const etiquetas = etiquetasDeGuionExterno(html).filter((e) => guionExternoDe(e.src)?.id === 'medicion');
      if (!consecuenciasDe(ruta).cargaLaMedicion) {
        expect(AJENAS, ruta).toContain(ruta);
        expect(etiquetas, ruta).toEqual([]);
        continue;
      }
      expect(etiquetas.map((e) => e.src), ruta).toEqual([RUTA_DEL_FICHERO]);
      expect(etiquetas[0].etiqueta, ruta).toMatch(/\sdefer[\s>]/);
      expect(etiquetasDeGuionExterno(cabezaDe(html)).map((e) => e.src), ruta).toContain(RUTA_DEL_FICHERO);
    }
    for (const ruta of AJENAS) expect(paginas.has(ruta), ruta).toBe(true);
  }, 240_000);

  it('el arranque va en línea en toda página, y ninguna lleva el emisor ni el punto final', async () => {
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      expect(guionesEnLinea(html), ruta).toContain(ARRANQUE_DE_MEDICION);
      expect(html, ruta).not.toContain('sendBeacon');
      expect(html, ruta).not.toContain(ENDPOINT);
    }
  }, 240_000);
});

describe('Historia 2.9 y 23.1 — sin punto final, el sitio no pide ni envía nada', () => {
  it('no hay punto final por defecto', () => {
    expect(puntoFinal({})).toBeNull();
    expect(puntoFinal({ MEDICION_ENDPOINT: '   ' })).toBeNull();
    expect(puntoFinal({ MEDICION_ENDPOINT: 'https://x.invalid/e' })).toBe('https://x.invalid/e');
  });

  it('ni fichero ni etiqueta; quedan el arranque, el `data-vistas` y la marca de Obra', async () => {
    const proyecto = await sitioSinMedir();
    expect(existsSync(join(proyecto, 'dist', 'medicion'))).toBe(false);
    for (const [ruta, html] of paginasDe(proyecto)) {
      expect(guionesExternosDe(html).filter((e) => guionExternoDe(e)?.id === 'medicion'), ruta).toEqual([]);
      // Ninguna etiqueta de guion, de la medición ni de nada: es la mitad «sin él, ninguno» de
      // los criterios de JavaScript de las Historias 2.1 y 4.1, que se juzgaba en el navegador.
      // Salvo los guiones empaquetados —el filtro de los Directorios (26.6) y la búsqueda
      // (27.2)—, que no son medición y van con o sin punto final, y solo en sus páginas.
      const ajenasALosEmpaquetados = etiquetasDeGuionExterno(html).filter(
        (e) => !['filtro', 'busqueda'].includes(guionExternoDe(e.src)?.id ?? ''),
      );
      expect(ajenasALosEmpaquetados, ruta).toEqual([]);
      if (!RUTAS_EMPAQUETADAS.includes(ruta)) expect(etiquetasDeGuionExterno(html), ruta).toEqual([]);
      expect(html, ruta).not.toContain('sendBeacon');
      expect(guionesEnLinea(html), ruta).toContain(ARRANQUE_DE_MEDICION);
    }
    expect(vistasDe(await leerSinMedir(CITA))).toBe(EVENTOS.vistaDeCita);
    expect(vistasDe(await leerSinMedir('/'))).toBe(EVENTOS.vistaDeSuperficie);
    // Historia 23.9 — y la marca de Obra del `<html>`, junto a `data-vistas`.
    expect(marcaDeObraDe(await leerSinMedir(OBRAS[0]))).toBe(MARCAS_DE_OBRA[0]);
    expect(marcaDeObraDe(await leerSinMedir(OBRAS[1]))).toBe(MARCAS_DE_OBRA[1]);
  }, 240_000);
});

describe('Historia 23.1 — lo que se descarga está en la lista y cabe en su tope', () => {
  it('cada `<script src>` y cada `import()` de `dist/` casa con una entrada, del mismo origen y bajo su tope', async () => {
    const proyecto = await sitioMedido();
    const dist = join(proyecto, 'dist');
    const vistos = new Map<string, Set<string>>();

    const apuntar = (especificador: string, quien: string) => {
      const entrada = guionExternoDe(especificador);
      expect(entrada, `${quien} pide «${especificador}», que no está en GUIONES_EXTERNOS`).toBeDefined();
      const ficheros = vistos.get(entrada!.id) ?? new Set<string>();
      ficheros.add(especificador.replace(/[?#].*$/, ''));
      vistos.set(entrada!.id, ficheros);
    };
    for (const [ruta, html] of paginasDe(proyecto)) {
      for (const especificador of guionesExternosDe(html)) apuntar(especificador, ruta);
    }

    // Lo que un fichero de la lista pide de otra entrada (`pide`: la búsqueda pide Pagefind, 27.2)
    // se sigue hasta allí: Pagefind ya no lo pide ninguna página, sino el guion de la búsqueda.
    const medidos = new Set<string>();
    for (let cambio = true; cambio; ) {
      cambio = false;
      for (const guion of GUIONES_EXTERNOS) {
        for (const ruta of vistos.get(guion.id) ?? []) {
          if (medidos.has(ruta)) continue;
          medidos.add(ruta);
          cambio = true;
          // Lo que el fichero arranca al ejecutarse —el worker de Pagefind— cuenta en su tope, y
          // un `new Worker`, `import()` o `importScripts` que la entrada no declare es un fallo.
          const { bytes, ficheros, sinDeclarar, sinVer, pedidas, pideSinVer } = descargaDeLaEntrada(
            dist,
            ruta,
            guion.arranca ?? [],
            (f) => readFileSync(f),
            guion.pide ?? [],
            guion.trozos,
          );
          console.log(`${guion.id}: ${ficheros.join(' + ')}, ${bytes} bytes de ${guion.tope}`);
          expect(bytes, `${ruta}: ${bytes} bytes`).toBeLessThanOrEqual(guion.tope);
          expect(sinDeclarar, `${guion.id} arranca lo que no declara en GUIONES_EXTERNOS`).toEqual([]);
          expect(sinVer, `${guion.id} declara un arranque que sus ficheros ya no hacen`).toEqual([]);
          expect(pideSinVer, `${guion.id} declara que pide una entrada que sus ficheros ya no piden`).toEqual([]);
          for (const pedida of pedidas) apuntar(pedida, ruta);
          // El fichero de medición es un guion clásico: no importa ni arranca nada.
          if (guion.id === 'medicion') expect(ficheros).toEqual([ruta]);
          // Historia 27.2 — lo que importa un guion empaquetado son sus trozos, y ninguna página
          // los pide por su cuenta (lo juzga `guionExternoDe`, que no los reconoce).
          for (const fichero of ficheros.filter((f) => f !== ruta)) {
            if (guion.trozos !== undefined) expect(guion.trozos.test(fichero), fichero).toBe(true);
            expect(guionExternoDe(fichero), fichero).toBeUndefined();
          }
        }
      }
    }

    // Las cinco entradas se piden en este sitio —el filtro, en `/autores/` y `/obras/` (26.6); la
    // búsqueda en `/buscar/` y Pagefind desde ella (27.2)—: si una no se viera, su tope no se mediría.
    expect([...vistos.keys()].sort()).toEqual(GUIONES_EXTERNOS.map((g) => g.id).sort());
    // El worker de Pagefind está en `dist/` y se cuenta: es lo que la revisión encontró fuera.
    expect(GUIONES_EXTERNOS.find((g) => g.id === 'pagefind')!.arranca).toEqual([
      { como: 'new Worker', ruta: '/pagefind/pagefind-worker.js' },
    ]);
  }, 240_000);
});

/*
 * Historia 26.6 — el primer guion empaquetado de la v8 (AD-6).
 *
 * El filtro de los Directorios es un `<script>` procesado por Astro, y Astro lo metería en línea
 * —un `<script type="module">` con cuerpo— si cupiera en `assetsInlineLimit`. `astro.config.mjs`
 * lo impide para todo `.js`, y esto es lo que lo vigila sobre lo construido: si una versión nueva
 * de Astro dejara de consultar esa opción, el guion volvería en línea y esto saldría en rojo.
 */
describe('Historia 26.6 — el filtro de los Directorios es un fichero, y solo en sus dos páginas', () => {
  it('ningún `<script type="module">` de las dos construcciones lleva cuerpo', async () => {
    let paginas = 0;
    for (const proyecto of [await sitioMedido(), await sitioSinMedir()]) {
      for (const [ruta, html] of paginasDe(proyecto)) {
        paginas++;
        const enLinea = guionesEnLineaConTipo(html).filter((g) => g.modulo);
        expect(enLinea.map((g) => g.cuerpo.slice(0, 80)), ruta).toEqual([]);
      }
    }
    expect(paginas).toBeGreaterThan(SLUGS.length);
  }, 240_000);

  it('`/autores/` y `/obras/`, y ninguna otra página, piden el filtro una vez con `<script type="module" src>`', async () => {
    for (const proyecto of [await sitioMedido(), await sitioSinMedir()]) {
      const paginas = paginasDe(proyecto);
      for (const ruta of RUTAS_DEL_FILTRO) expect(paginas.has(ruta), ruta).toBe(true);
      for (const [ruta, html] of paginas) {
        const delFiltro = etiquetasDeGuionExterno(html).filter((e) => guionExternoDe(e.src)?.id === 'filtro');
        if (!RUTAS_DEL_FILTRO.includes(ruta)) {
          expect(delFiltro, ruta).toEqual([]);
          continue;
        }
        expect(delFiltro, ruta).toHaveLength(1);
        expect(delFiltro[0].etiqueta, ruta).toMatch(/\btype="module"/);
        expect(delFiltro[0].src, ruta).toMatch(new RegExp(`^/_astro/${FICHERO_DEL_FILTRO}\\.`));
        expect(existsSync(join(proyecto, 'dist', delFiltro[0].src)), delFiltro[0].src).toBe(true);
      }
    }
  }, 240_000);

  it('el fichero del filtro no lleva contenido, ni toca la dirección, el historial o la ventana', async () => {
    /*
     * Historia 27.2 — se mira el fichero de entrada del filtro, el suyo: desde que la búsqueda
     * importa también los ritmos de `anuncio.ts`, el empaquetado los saca a un trozo compartido que
     * lleva `anunciar` (y su `requestAnimationFrame`), que el filtro importa sin usarla. El trozo
     * cuenta en su tope; lo que el filtro hace lo dice su fichero, y lo ejecuta
     * `tests/unit/ayuda/filtroEjecutado.ts`.
     */
    const { codigo: fuente } = await ficheroDeEntrada('filtro');
    const todos = [...((await ficherosDescargados()).get('filtro') ?? new Map<string, string>()).values()].join('\n');
    // El Corpus de la prueba entero —slugs, textos, el Autor, las Obras, el Tema, la Colección—:
    // el modelo lo lee de la página, nunca lo lleva dentro.
    for (const dato of [
      ...SLUGS_DE_CITA,
      ...TEXTOS_DE_CITA,
      'Séneca',
      'Sobre la brevedad de la vida',
      'Cartas a Lucilio',
      'El tiempo',
      'Frases cortas para reflexionar',
    ]) {
      expect(todos, `el filtro lleva «${dato}»`).not.toContain(dato);
    }
    // Lo que el filtro no toca no lo toca ninguno de sus ficheros, trozos compartidos incluidos: lo
    // que se mude a un trozo no escapa de aquí. Solo `requestAnimationFrame` se mira en el suyo,
    // porque el trozo lleva `anunciar` para la búsqueda.
    expect(todos).not.toMatch(/\blocation\b/);
    expect(todos).not.toMatch(/\bhistory\b/);
    expect(fuente).not.toContain('requestAnimationFrame');
    // Ni la ventana por ningún nombre, ni ninguna escucha de `click`: escucha `input` en su campo.
    expect(todos).not.toMatch(/\b(?:window|self|globalThis)\b/);
    expect(todos).not.toMatch(/(["'`])click\1/);
    expect(todos).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
    // Y la pausa de tecleo, el valor de `PAUSA_DE_TECLEO_MS` que el empaquetado copia en el
    // fichero. Esto no distingue la constante de un `700` escrito a mano —después de empaquetar
    // son lo mismo—: que el guion la importe lo dice su fuente, y el valor lo fija la prueba de
    // `filtro-del-directorio.test.ts`; esto solo vigila que el número que viaja sea ese.
    expect(fuente).toMatch(new RegExp(`\\b${PAUSA_DE_TECLEO_MS}\\b`));
  }, 240_000);
});

describe('Historia 23.1 — la Página de Cita no pierde su listón', () => {
  /*
   * Retro de la épica 7: el tope de la Historia 2.1 se medía solo en construcciones sin punto
   * final, y el guion de medición creció dos veces sin que nadie lo viera. Aquí se mide lo que
   * se sirve **con** la medición: el arranque en línea, que ya no se puede apagar, y una
   * muestra de cada superficie pública más la Página de Cita sin Imagen, que es la de menos
   * guion. El fichero se descarga aparte y cuenta 0 aquí: su tope es otro.
   */
  it('cada superficie pública y la Cita sin Imagen caben en MAX_BYTES_DE_GUION', async () => {
    const proyecto = await sitioMedido();
    const paginas = paginasDe(proyecto);
    const barrido = superficiesDelBarrido([...paginas.keys()]);
    // Portada, Cita, Autor, Tema, Colección, Obra, los dos Directorios (26.3, 26.4), búsqueda y
    // 404: una por familia pública.
    expect(barrido).toHaveLength(10);
    expect(barrido).toContain('/autores');
    expect(barrido).toContain('/obras');
    const muestra = [...barrido, CITA_SIN_IMAGEN];

    const huecos: string[] = [];
    for (const ruta of muestra) {
      const html = await leerMedida(ruta);
      expect(guionesEnLinea(html), ruta).toContain(ARRANQUE_DE_MEDICION);
      const bytes = bytesDeGuionEnLinea(html);
      huecos.push(`${ruta}: ${bytes} bytes en línea, ${MAX_BYTES_DE_GUION - bytes} libres`);
      expect(bytes, `${ruta}: ${bytes} bytes de guion en línea`).toBeLessThan(MAX_BYTES_DE_GUION);
    }

    const conImagen = bytesDeGuionEnLinea(await leerMedida(CITA));
    const sinImagen = bytesDeGuionEnLinea(await leerMedida(CITA_SIN_IMAGEN));
    // El parte: el hueco que deja la 23.1 en la Página de Cita, con Imagen y sin ella.
    console.log(
      [
        ...huecos,
        `Página de Cita con Imagen: ${MAX_BYTES_DE_GUION - conImagen} bytes libres de ${MAX_BYTES_DE_GUION}`,
        `Página de Cita sin Imagen: ${MAX_BYTES_DE_GUION - sinImagen} bytes libres de ${MAX_BYTES_DE_GUION}`,
      ].join('\n'),
    );
    expect(sinImagen).toBeLessThan(conImagen);
  }, 240_000);
});


describe('Historia 23.1 — ningún guion en línea lleva contenido', () => {
  /** La familia de una ruta: el fichero de `src/pages/` que la genera. */
  const familiaDe = (ruta: string) => superficieDeclaradaDe(ruta)!.pagina;
  /** El guion de la Imagen de Cita, que solo va donde la Cita la admite. */
  const esDeImagen = (guion: string) => guion.includes("'[data-imagen]'");

  it('los guiones en línea de una familia son idénticos byte a byte, salvo la Imagen donde no se admite', async () => {
    const porFamilia = new Map<string, { ruta: string; guiones: string[] }[]>();
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      const familia = familiaDe(ruta);
      porFamilia.set(familia, [...(porFamilia.get(familia) ?? []), { ruta, guiones: guionesEnLinea(html) }]);
    }

    let comparadas = 0;
    for (const [familia, paginas] of porFamilia) {
      const [referencia, ...resto] = paginas;
      for (const pagina of resto) {
        comparadas++;
        expect(pagina.guiones.filter((g) => !esDeImagen(g)), `${familia}: ${pagina.ruta} frente a ${referencia.ruta}`).toEqual(
          referencia.guiones.filter((g) => !esDeImagen(g)),
        );
      }
      const deImagen = new Set(paginas.flatMap((p) => p.guiones.filter(esDeImagen)));
      expect(deImagen.size, `${familia}: guiones de Imagen distintos`).toBeLessThanOrEqual(1);
    }
    expect(comparadas).toBeGreaterThan(SLUGS.length);

    // Y la Imagen falta justo donde la Cita no la admite.
    const conImagen = guionesEnLinea(await leerMedida(CITA)).filter(esDeImagen);
    const sinImagen = guionesEnLinea(await leerMedida(CITA_SIN_IMAGEN)).filter(esDeImagen);
    expect(TEXTO_LARGO.length).toBeGreaterThan(MAX_CARACTERES_IMAGEN);
    expect(conImagen).toHaveLength(1);
    expect(sinImagen).toEqual([]);
  }, 240_000);

  it('ninguno contiene contenido —slug, texto, Autor, Obra—, salvo `ImagenDelKit` en `/kit` y `/lote`', async () => {
    /*
     * Revisión de la 23.1 (segunda pasada): solo se buscaban slugs, y la identidad byte a byte
     * por familia no ve las familias de una sola página —la portada, `/buscar/`, el 404—, donde
     * el texto de la Cita del Día o el nombre de un Autor metidos en un guion pasaban. Se busca
     * todo el contenido del corpus de la prueba: slugs, textos, el Autor, las Obras, el Tema y la
     * Colección.
     */
    const contenido = [
      ...SLUGS_DE_CITA,
      ...TEXTOS_DE_CITA,
      'Séneca',
      'Sobre la brevedad de la vida',
      'Cartas a Lucilio',
      'El tiempo',
      'Frases cortas para reflexionar',
    ];
    let mirados = 0;
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      for (const guion of guionesEnLinea(html)) {
        // Exención nombrada hasta la Historia 25.4: el Kit lleva el slug por `define:vars`.
        if (AJENAS.includes(ruta) && guion.includes('data-imagen-kit')) continue;
        mirados++;
        for (const dato of contenido) expect(guion, `${ruta} lleva «${dato}»`).not.toContain(dato);
      }
    }
    expect(mirados).toBeGreaterThan(SLUGS_DE_CITA.length);
  }, 240_000);
});

describe('Historia 23.1 — las islas llaman `__medir` a secas y anuncian con `anunciar`', () => {
  /** Los guiones en línea de una página, por la isla que los lleva. */
  const isla = (guiones: string[], marca: string) => {
    const encontrados = guiones.filter((g) => g.includes(marca));
    expect(encontrados, marca).toHaveLength(1);
    return encontrados[0];
  };

  it('Copiar, Imagen, Compartir y la búsqueda llaman `__medir(` sin guarda, y anuncian con `anunciar`', async () => {
    const cita = guionesEnLinea(await leerMedida(CITA));
    const islas = {
      copiar: isla(cita, "'[data-copiar]'"),
      imagen: isla(cita, "'[data-imagen]'"),
      compartir: isla(cita, "'[data-compartir]'"),
    };
    /*
     * Historia 27.2 — la búsqueda ya no va en línea: es el fichero empaquetado de `Busqueda.astro`.
     * Se mira igual, sobre lo que se descarga: llama `__medir(` a secas, sin guarda, y anuncia la
     * búsqueda sin resultados con `anunciar` —con su `requestAnimationFrame`, que el empaquetado
     * deja en el trozo compartido con el filtro—; el recuento con el segundo ritmo. Qué escribe en
     * su región, y cuándo, lo prueba el entorno simulado ejecutándola (Historia 23.8, abajo).
     */
    const { codigo: busqueda } = await ficheroDeEntrada('busqueda');
    const todaLaBusqueda = [...((await ficherosDescargados()).get('busqueda') ?? new Map<string, string>()).values()].join('\n');
    expect(guionesEnLinea(await leerMedida('/buscar/')).filter((g) => g.includes('[data-consulta]'))).toEqual([]);

    for (const [nombre, guion] of Object.entries({ ...islas, busqueda })) {
      expect(guion, nombre).toMatch(/(^|[^.\w$])__medir\(/);
      expect(guion, nombre).not.toMatch(/window\.__medir/);
    }
    expect(todaLaBusqueda).toContain('requestAnimationFrame');
    expect(todaLaBusqueda).not.toMatch(/__medir\s*=(?!=)/);
    /*
     * Llevar el texto de `anunciar` no basta: `guionQueAnuncia` lo mete siempre, se llame o no.
     * Revisión de la 23.1 (segunda pasada): con un `estado.textContent = …` a mano en `/buscar/`,
     * el mismo recuento dos veces seguidas dejaba de anunciarse y todo seguía en verde. Así que
     * el cuerpo de cada isla —el guion sin ese texto— llama `anunciar(` sobre su región y nunca
     * le escribe un mensaje a mano (vaciarla, sí: es lo que hace al volver a su reposo).
     */
    const REGION = { copiar: 'anuncio', imagen: 'anuncio' } as const;
    for (const [nombre, region] of Object.entries(REGION) as [keyof typeof REGION, string][]) {
      expect(colapsado(islas[nombre]), nombre).toContain(ANUNCIAR);
      const cuerpo = sinAnunciar(islas[nombre]);
      expect(cuerpo, nombre).toMatch(new RegExp(`\\banunciar\\(\\s*${region}\\s*,`));
      const escrito = [
        ...cuerpo.matchAll(new RegExp(`\\b${region}\\.(?:textContent|innerText|innerHTML)\\s*=(?!=)\\s*([^;}]*)`, 'g')),
      ].map((m) => m[1].trim());
      expect(escrito.filter((valor) => valor !== "''" && valor !== '""'), nombre).toEqual([]);
    }
  }, 240_000);

  it('cada copia de Copiar va justo detrás de su isla, que es lo que encuentra por `currentScript`', async () => {
    /*
     * `CopiarCita` se encuentra por `document.currentScript.previousElementSibling`: si algo se
     * colara entre el `<div class="isla">` y su guion, la isla moriría en el navegador con el
     * build en verde, y solo lo vería el Playwright local, que el CI no corre. Se mira aquí, en
     * cada página que lleve la isla —la Página de Cita y el Kit—.
     */
    let vistas = 0;
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
        if (!m[1].includes("'[data-copiar]'")) continue;
        vistas++;
        const antes = html.slice(0, m.index).trimEnd();
        expect(antes.endsWith('</div>'), `${ruta}: el guion de Copiar no sigue a un </div>`).toBe(true);
        const isla = antes.slice(antes.lastIndexOf('<div'));
        expect(isla, ruta).toMatch(/^<div\b[^>]*\bclass="isla\b/);
        expect(isla, ruta).toContain('data-copiar');
      }
    }
    expect(vistas).toBeGreaterThan(SLUGS.length);
  }, 240_000);

  it('entre los guiones en línea solo el arranque asigna `__medir`, y nadie usa `requestAnimationFrame` fuera de `anunciar`', async () => {
    let vistos = 0;
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      for (const guion of guionesEnLinea(html)) {
        vistos++;
        if (guion === ARRANQUE_DE_MEDICION) continue;
        expect(guion, ruta).not.toMatch(/__medir\s*=(?!=)/);
        expect(sinAnunciar(guion), ruta).not.toContain('requestAnimationFrame');
      }
    }
    expect(vistos).toBeGreaterThan(0);
    expect(ARRANQUE_DE_MEDICION).toMatch(/__medir\s*=(?!=)/);
  }, 240_000);
});

/*
 * Revisión de la 23.1 — lo que la primera pasada no fijaba.
 *
 * Los guiones de las islas se componen ahora como texto dentro de plantillas de TypeScript
 * (`guionQueAnuncia`), que ni `astro check` ni ningún analizador miran: un `\.` que la plantilla
 * se come o un `${` de más salen al visitante y solo los vería el Playwright local, que el CI no
 * corre. Y el arranque promete abrir la cola antes que cualquier guion, cosa que nada medía.
 */
describe('Historia 23.1 — los guiones en línea se dejan analizar, y el arranque va primero', () => {

  it('todo guion en línea de las dos construcciones es JavaScript válido', async () => {
    let analizados = 0;
    for (const proyecto of [await sitioMedido(), await sitioSinMedir()]) {
      for (const [ruta, html] of paginasDe(proyecto)) {
        for (const { cuerpo, modulo } of guionesEnLineaConTipo(html)) {
          analizados++;
          // Un guion clásico se juzga con la gramática de un guion clásico, que es la de `vm`;
          // uno de módulo, con la de módulo.
          if (modulo) expect(parseSync('guion.js', cuerpo, { sourceType: 'module' }).errors, ruta).toEqual([]);
          else expect(() => new Script(cuerpo, { filename: ruta }), `${ruta}: ${cuerpo.slice(0, 80)}`).not.toThrow();
        }
      }
    }
    expect(analizados).toBeGreaterThan(0);
  }, 240_000);

  it('el arranque es el primer guion de toda página, antes que cualquier isla o fichero', async () => {
    for (const proyecto of [await sitioMedido(), await sitioSinMedir()]) {
      for (const [ruta, html] of paginasDe(proyecto)) {
        const [primero] = guionesEjecutables(html);
        expect(primero?.cuerpo, ruta).toBe(ARRANQUE_DE_MEDICION);
        expect(primero?.atributos, ruta).not.toMatch(/\bsrc\s*=/i);
      }
    }
  }, 240_000);
});

/*
 * Historia 23.6 — las Marcas de llegada las lee y las quita **solo el fichero**, y eso se mira en
 * lo construido: en `dist/` están todos los guiones que el visitante ejecuta —los en línea, el
 * fichero, la Imagen de `islas/` y Pagefind con su worker—, y no hay forma de ver desde `src/` lo
 * que el empaquetado o una dependencia añadan. Los detectores componen los nombres de las marcas
 * desde sus módulos y se comprueban contra el fichero, que sí lee y sí escribe: si dejaran de verlo
 * ahí, todo lo demás pasaría en vacío.
 */
/**
 * Los ficheros que descarga cada entrada de la lista cerrada, con lo que arrancan, por entrada — los
 * leen las pruebas de las Historias 23.6 y 23.8 sobre el sitio medido.
 */
async function ficherosDescargados(): Promise<Map<string, Map<string, string>>> {
  const proyecto = await sitioMedido();
  const dist = join(proyecto, 'dist');
  const porEntrada = new Map<string, Map<string, string>>();
  const pendientes = [...paginasDe(proyecto).values()].flatMap((html) => guionesExternosDe(html));
  const vistos = new Set<string>();
  while (pendientes.length > 0) {
    const especificador = pendientes.pop()!.replace(/[?#].*$/, '');
    if (vistos.has(especificador)) continue;
    vistos.add(especificador);
    const entrada = guionExternoDe(especificador);
    if (entrada === undefined) continue; // lo ajeno ya lo juzga la prueba de la lista cerrada
    const { ficheros, pedidas } = descargaDeLaEntrada(dist, especificador, entrada.arranca ?? [], (f) => readFileSync(f), entrada.pide ?? []);
    const deLaEntrada = porEntrada.get(entrada.id) ?? new Map<string, string>();
    for (const fichero of ficheros) deLaEntrada.set(fichero, readFileSync(join(dist, fichero), 'utf8'));
    porEntrada.set(entrada.id, deLaEntrada);
    // Historia 27.2 — Pagefind lo pide el guion de la búsqueda, no una página: se sigue.
    pendientes.push(...pedidas);
  }
  return porEntrada;
}

/**
 * Historia 27.2 — el fichero **de entrada** de un guion empaquetado, sin los trozos que comparte con
 * otro: lo que es suyo. Las pruebas de contenido miran este (los trozos compartidos cuentan en el
 * tope de las dos entradas, pero no dicen nada de ninguna de las dos).
 */
async function ficheroDeEntrada(id: 'filtro' | 'busqueda'): Promise<{ ruta: string; codigo: string }> {
  const prefijo = `/_astro/${id === 'filtro' ? FICHERO_DEL_FILTRO : FICHERO_DE_LA_BUSQUEDA}.`;
  const ficheros = [...((await ficherosDescargados()).get(id) ?? new Map<string, string>()).entries()].filter(([ruta]) =>
    ruta.startsWith(prefijo),
  );
  expect(ficheros, `nadie pide la entrada ${id}`).toHaveLength(1);
  return { ruta: ficheros[0][0], codigo: ficheros[0][1] };
}

describe('Historia 23.6 — solo el fichero lee y quita las marcas, en `dist/`', () => {
  const NOMBRES = [PARAMETRO_DE_ORIGEN, PARAMETRO_DE_DIFUSION];
  /**
   * Nombra una marca: su nombre como cadena entre comillas, o detrás de `?`/`&` con su `=`. Es
   * textual a propósito, y se equivoca hacia el lado seguro: una cadena `"de"` que no lea ninguna
   * marca —una preposición, un código de idioma— lo enciende y pone la prueba en rojo, y quien
   * llegue ahí mira el guion y estrecha el detector; nunca deja pasar en verde un guion que lea.
   * Lo que sí se le escapa es un nombre compuesto por piezas.
   */
  const LEE_MARCAS = new RegExp(NOMBRES.flatMap((nombre) => [`['"\`]${nombre}['"\`]`, `[?&]${nombre}=`]).join('|'));
  /**
   * Escribe en el historial o en la dirección: `history.pushState`/`replaceState` —también por
   * corchetes—, asignar a `location` o a una de sus partes —también con `+=`—, `assign`/`replace`
   * y `navigation.navigate`.
   */
  const ESCRIBE_DIRECCION =
    /\bhistory\s*(?:\.\s*|\[\s*['"`])(?:pushState|replaceState)\b|(?<![\w$.])(?:(?:window|document|self|globalThis)\s*\.\s*)?location\s*(?:\.\s*(?:href|search|hash|pathname))?\s*\+?=(?!=)|(?<![\w$.])(?:(?:window|document|self|globalThis)\s*\.\s*)?location\s*\.\s*(?:assign|replace)\s*\(|\bnavigation\s*\.\s*navigate\s*\(/;
  /** Lee la dirección: `location` como variable global, o la URL del documento. */
  const LEE_DIRECCION =
    /(?<![\w$.])(?:(?:window|document|self|globalThis)\s*\.\s*)?location\b|\bdocument\s*\.\s*(?:URL|documentURI)\b/;
  /**
   * Lo único que la búsqueda puede escribir: `history.replaceState` con la marca de su búsqueda
   * asentada en el objeto de estado (Historia 23.8) y, desde la Historia 27.4, `history.pushState` y
   * `history.replaceState` con la dirección compuesta desde su estado. Qué escribe, cuándo, con qué
   * dirección —siempre `/buscar/`— y que nunca lo haga al evaluarse lo prueba el entorno simulado de
   * la isla, ejecutándola (abajo, «Historia 23.8» y «Historia 27.4»); aquí se quitan esas dos formas,
   * y solo esas, para que todo lo demás —escribir `location`, `assign`, el historial por corchetes—
   * siga en rojo. Desde la Historia 27.2 la búsqueda no va en línea: es el fichero empaquetado de
   * `Busqueda.astro`, y la exención es suya.
   */
  const ESCRIBE_EL_ESTADO = /\bhistory\s*\.\s*(?:pushState|replaceState)\s*\(/g;
  const sinEscribirElEstado = (guion: string) => guion.replace(ESCRIBE_EL_ESTADO, '');

  it('los detectores ven el fichero, que lee las marcas y la dirección y escribe en el historial', () => {
    const fichero = guionDeMedicion(ENDPOINT);
    expect(LEE_MARCAS.test(fichero)).toBe(true);
    expect(ESCRIBE_DIRECCION.test(fichero)).toBe(true);
    expect(LEE_DIRECCION.test(fichero)).toBe(true);
    // Y no se encienden con lo que no es: una propiedad que se llama igual, un nombre parecido.
    for (const inocente of ['palabra.location=1', 'x={dev:1,"vias":2}', "o.get('dev')", 'a.history_state=1']) {
      expect(LEE_MARCAS.test(inocente) || ESCRIBE_DIRECCION.test(inocente), inocente).toBe(false);
    }
    for (const culpable of [
      "new URLSearchParams(location.search).get('de')",
      'u.get("via")',
      "'?via=x'",
      'window.location.href=u',
      'location.assign(u)',
      'history.pushState(null,"",u)',
      "history['replaceState'](null,'',u)",
      "location.search+='&x=1'",
      'location.href += u',
    ]) {
      expect(LEE_MARCAS.test(culpable) || ESCRIBE_DIRECCION.test(culpable), culpable).toBe(true);
    }
  });

  it('el fichero corre antes que todo guion que escriba en la dirección: va con `defer` y ningún guion en línea de su página escribe', async () => {
    /*
     * «Antes» es de ejecución, no de documento. El fichero va con `defer` en el `<head>`, y un
     * `defer` corre al acabar de analizar el documento: detrás de todo guion clásico, esté donde
     * esté. Así que no basta con mirar los guiones que lo preceden en el documento: ningún guion en
     * línea de la página, en ningún sitio, escribe en el historial ni en la dirección. Los
     * descargados los mira la prueba de los ficheros, abajo.
     *
     * Historia 27.2 — la búsqueda, que escribe `history.replaceState` (23.8), es desde entonces un
     * `<script type="module" src>`, que también se difiere y corre en el orden del documento entre
     * los diferidos: va detrás del fichero, así que el fichero corre antes que ella.
     */
    let vistas = 0;
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      const guiones = guionesEjecutables(html);
      const delFichero = guiones.findIndex((g) => g.atributos.includes(RUTA_DEL_FICHERO));
      if (delFichero < 0) continue;
      vistas++;
      expect(cabezaDe(html), ruta).toContain(RUTA_DEL_FICHERO);
      const { atributos } = guiones[delFichero];
      expect(atributos, ruta).toMatch(/(?:^|\s)defer(?=[\s=>]|$)/i);
      expect(atributos, ruta).not.toMatch(/(?:^|\s)async(?=[\s=>]|$)|\btype\s*=\s*["']?module/i);
      guiones.forEach((guion, i) => {
        if (i === delFichero) return;
        expect(ESCRIBE_DIRECCION.test(guion.cuerpo), `${ruta}: el guion ${i + 1} escribe en la dirección`).toBe(false);
      });
      const deLaBusqueda = guiones.findIndex((g) => g.atributos.includes(FICHERO_DE_LA_BUSQUEDA));
      if (ruta === RUTA_DE_LA_BUSQUEDA) {
        expect(deLaBusqueda, 'la búsqueda no está en /buscar/').toBeGreaterThan(delFichero);
        expect(guiones[deLaBusqueda].atributos, ruta).toMatch(/\btype="module"/);
        expect(guiones[deLaBusqueda].atributos, ruta).not.toMatch(/(?:^|\s)async(?=[\s=>]|$)/i);
      } else {
        expect(deLaBusqueda, ruta).toBe(-1);
      }
    }
    expect(vistas).toBeGreaterThan(SLUGS.length);
  }, 240_000);

  it('ningún guion en línea escribe en el historial o la dirección, ni lee una marca', async () => {
    /*
     * Hasta la 27.2 la búsqueda iba en línea y tenía aquí su exención —`history.replaceState`, y solo
     * esa—. Ahora es un fichero y la exención se mira donde está, en la prueba de lo descargado.
     */
    let mirados = 0;
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      for (const guion of guionesEnLinea(html)) {
        mirados++;
        expect(LEE_MARCAS.test(guion), `${ruta}: un guion en línea lee una marca`).toBe(false);
        expect(ESCRIBE_DIRECCION.test(guion), `${ruta}: un guion en línea escribe en la dirección`).toBe(false);
      }
    }
    expect(mirados).toBeGreaterThan(SLUGS.length);
  }, 240_000);

  it('entre los guiones propios —en línea, `islas/` y empaquetados— solo la búsqueda lee la dirección', async () => {
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      for (const guion of guionesEnLinea(html)) {
        expect(LEE_DIRECCION.test(guion), `${ruta}: un guion en línea lee la dirección`).toBe(false);
      }
    }
    const descargados = await ficherosDescargados();
    const islas = descargados.get('imagen');
    expect(islas?.size, 'la Imagen de `islas/` se descarga en este sitio').toBeGreaterThan(0);
    for (const [fichero, codigo] of islas!) expect(LEE_DIRECCION.test(codigo), fichero).toBe(false);
    for (const [fichero, codigo] of descargados.get('filtro')!) expect(LEE_DIRECCION.test(codigo), fichero).toBe(false);
    // El detector ve la búsqueda: lee su consulta de la dirección, en su fichero de entrada.
    const { ruta, codigo } = await ficheroDeEntrada('busqueda');
    expect(LEE_DIRECCION.test(codigo), ruta).toBe(true);
  }, 240_000);

  it('de lo que se descarga, solo el fichero lee una marca o escribe en la dirección —la búsqueda, solo `history.pushState` y `history.replaceState`—: ni la Imagen ni Pagefind', async () => {
    const descargados = await ficherosDescargados();
    expect([...descargados.keys()].sort()).toEqual(GUIONES_EXTERNOS.map((g) => g.id).sort());
    const { ruta: entradaDeLaBusqueda } = await ficheroDeEntrada('busqueda');
    for (const [id, ficheros] of descargados) {
      for (const [fichero, codigo] of ficheros) {
        const esElFichero = id === 'medicion';
        expect(LEE_MARCAS.test(codigo), `${fichero} lee una marca`).toBe(esElFichero);
        if (fichero === entradaDeLaBusqueda) {
          // Las formas admitidas están —las dos— y el detector las ve: sin la exención, estaría en rojo.
          const admitidas = codigo.match(ESCRIBE_EL_ESTADO) ?? [];
          expect(admitidas.some((f) => f.includes('pushState')), fichero).toBe(true);
          expect(admitidas.some((f) => f.includes('replaceState')), fichero).toBe(true);
          expect(ESCRIBE_DIRECCION.test(codigo), fichero).toBe(true);
          expect(ESCRIBE_DIRECCION.test(sinEscribirElEstado(codigo)), `${fichero} escribe en la dirección`).toBe(false);
          continue;
        }
        expect(ESCRIBE_DIRECCION.test(codigo), `${fichero} escribe en la dirección`).toBe(esElFichero);
      }
    }
    expect(descargados.get('pagefind')?.size, 'Pagefind y su worker').toBeGreaterThanOrEqual(2);
  }, 240_000);
});

describe('Historia 23.7 — toda salida interna de `dist/` dice su zona', () => {
  /**
   * Las once Zonas de salida interna que coloca la Épica 23 (UX-DR111). Las demás del vocabulario
   * —`tarjeta-de-obra`, `siguiente`, `misma-obra`, `directorio` y `obras-de-portada`— las colocan
   * las Épicas 24, 26 y 28, y esta prueba las admite **sin tocarla**: exige que estén las once, no
   * que sean las únicas, y la tabla de colocación no compara las declaraciones de esas zonas. Sus
   * criterios lo piden así (24.3, 24.4, 26.3 y 28.3: la prueba de la 23.7 «sigue pasando» o las
   * cubre «sin tocarla»).
   */
  const ZONAS_DE_HOY = [
    'cabecera',
    'atribucion',
    'chip-de-tema',
    'colecciones',
    'listado',
    'paginacion',
    'lista-de-obras',
    'resultado',
    'cita-del-dia',
    'rutas-de-salida',
    'autores-de-portada',
  ] as const satisfies readonly Zona[];
  /** Si una declaración es una zona del vocabulario que la Épica 23 no coloca (24, 26 y 28). */
  const esDeOtraEpica = (declaracion: Declaracion | null) =>
    declaracion !== null &&
    'zona' in declaracion &&
    (ZONAS as readonly string[]).includes(declaracion.zona) &&
    !(ZONAS_DE_HOY as readonly string[]).includes(declaracion.zona);
  /** Dónde va cada exención: la página, la etiqueta y lo que la distingue. */
  const SITIO_DE_LA_EXENCION: Record<ExencionDeZona, { ruta: string; etiqueta: string; marca: (e: Elemento) => boolean }> = {
    'chips-del-404': { ruta: '/404', etiqueta: 'ul', marca: (e) => (e.atributos.get('class') ?? '').split(/\s+/).includes('chips') },
    'salidas-sin-resultados': { ruta: '/buscar/', etiqueta: 'div', marca: (e) => e.atributos.has('data-salida') },
  };
  /**
   * La única exención que nombra esta prueba, y no el marcado: un ancla de la propia página
   * (`href="#…"`) no saca de ella, y la escucha del fichero no la cuenta.
   */
  const esAnclaDeLaPropiaPagina = (href: string) => href.startsWith('#');
  const BASE = new URL(SITIO);

  /** Las declaraciones de zona de cada página construida, con su elemento. */
  async function declaracionesDelSitio() {
    const todas: { ruta: string; elemento: Elemento; declaracion: Declaracion }[] = [];
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      recorrerElementos(html, (elemento) => {
        if (elemento.atributos.has(ATRIBUTO_DE_ZONA)) {
          todas.push({ ruta, elemento, declaracion: { zona: elemento.atributos.get(ATRIBUTO_DE_ZONA)! } });
        }
        if (elemento.atributos.has(ATRIBUTO_SIN_ZONA)) {
          todas.push({ ruta, elemento, declaracion: { sinZona: elemento.atributos.get(ATRIBUTO_SIN_ZONA)! } });
        }
      });
    }
    return todas;
  }

  it('el tokenizador ve enlaces, `main` y la declaración más cercana, y salta guiones, estilos y comentarios', () => {
    const html = [
      '<!doctype html><html><head><title>Un <a href="/no/"> en el título</title>',
      '<script>var s = \'<a href="/tampoco/">\';</script><style>a[data-zona="x"]{}</style></head>',
      '<body><a class="saltar" href="#contenido">Saltar</a>',
      '<header class="cabecera" data-zona="cabecera"><a href="/">Marca</a></header>',
      '<main id="contenido"><!-- <a href="/comentado/"> -->',
      '<ul data-zona="listado" title="uno > dos"><li><a href="/cita/a/?x=1&amp;y=2&#99999999;"><span>A</span></a><br><img src=x alt="">',
      '</li></ul>',
      '<nav data-zona="rutas-de-salida"><ul class="hermanas"><li><a href=/cita/b/>B</a></li></ul>',
      '<ul class="chips" data-zona="chip-de-tema"><li><a class="chip" href="/tema/t/">T</a></li></ul>',
      '<div data-sin-zona="salidas-sin-resultados"><a href="/tema/u/">U</a></div></nav>',
      '<div data-zona="listado"><p data-sin-zona="chips-del-404" data-zona="cabecera"><a href="/c/">C</a></p></div>',
      '<a href="/sin/">Sin</a><a name="sin-href">N</a><input value="<a href=/no/>"></main>',
      '<footer><a href="/rss.xml">RSS</a></footer></body></html>',
    ].join('');
    expect(enlacesDe(html)).toEqual([
      { href: '#contenido', enMain: false, declaracion: null },
      { href: '/', enMain: false, declaracion: { zona: 'cabecera' } },
      // Una entidad fuera de Unicode se queda como está, en vez de tumbar la prueba.
      { href: '/cita/a/?x=1&y=2&#99999999;', enMain: true, declaracion: { zona: 'listado' } },
      { href: '/cita/b/', enMain: true, declaracion: { zona: 'rutas-de-salida' } },
      { href: '/tema/t/', enMain: true, declaracion: { zona: 'chip-de-tema' } },
      { href: '/tema/u/', enMain: true, declaracion: { sinZona: 'salidas-sin-resultados' } },
      // Con las dos en el mismo elemento, manda la exención, como en la escucha del fichero.
      { href: '/c/', enMain: true, declaracion: { sinZona: 'chips-del-404' } },
      { href: '/sin/', enMain: true, declaracion: null },
      { href: undefined, enMain: true, declaracion: null },
      { href: '/rss.xml', enMain: false, declaracion: null },
    ]);
  });

  it('el tokenizador rechaza el marcado que el navegador reordenaría, y deja pasar el que no', () => {
    // Cada uno, dentro de `main`: el DOM le daría al enlace otra zona, o un duplicado sin ninguna.
    const reordenados: [caso: string, html: string, motivo: RegExp][] = [
      ['un bloque dentro de un párrafo', '<p data-zona="atribucion">Texto<ul><li><a href="/d/">D</a></li></ul></p>', /<ul> que cerraría el <p>/],
      ['un enlace dentro de otro', '<div data-zona="listado"><a href="/e/"><span>x<a href="/f/">F</a></span></a></div>', /<a> dentro de otro <a>/],
      ['un enlace dentro de un botón dentro de otro enlace', '<a href="/e/"><button><a href="/f/">F</a></button></a>', /<a> dentro de otro <a>/],
      ['un `<li>` sin cerrar', '<ul><li data-zona="listado"><a href="/g/">G</a><li><a href="/h/">H</a></li></ul>', /<li> que cerraría/],
      ['un `<dd>` sin cerrar', '<dl><dt>T<dd><a href="/g/">G</a></dd></dl>', /<dd> que cerraría/],
      ['un botón dentro de otro', '<button><button>x</button></button>', /<button> dentro de otro/],
      ['un encabezado dentro de otro', '<h2><h3>x</h3></h2>', /<h3> dentro de un <h2>/],
      ['un enlace suelto en una tabla', '<table data-zona="listado"><a href="/t/">T</a></table>', /<a> suelto dentro de <table>/],
      ['un cierre que deja un enlace abierto', '<div data-zona="listado"><a href="/x/">X</div><p>más</p>', /<\/div> con <a> aún abierto/],
    ];
    for (const [caso, html, motivo] of reordenados) {
      expect(() => enlacesDe(`<main>${html}</main>`), caso).toThrow(motivo);
    }
    // Lo que el navegador construye tal cual: la zona sale de la pila.
    const html = [
      '<main>',
      // Un botón es límite de ámbito: el bloque de dentro no cierra el `<p>` de fuera.
      '<p data-zona="atribucion"><button><div><a href="/h/">H</a></div></button></p>',
      // Una marca de formato (`object`, `td`…) separa dos enlaces: el de dentro no cierra el de fuera.
      '<div data-zona="listado"><a href="/m/">M<object><a href="/n/">N</a></object></a></div>',
      '<table><tbody><tr><td data-zona="listado"><a href="/t/">T</a></td></tr></tbody></table>',
      '<ul data-zona="listado"><li><a href="/i/">I</a><ul><li><a href="/j/">J</a></li></ul></li></ul>',
      '</main>',
    ].join('');
    expect(enlacesDe(html).map((e) => [e.href, e.declaracion])).toEqual([
      ['/h/', { zona: 'atribucion' }],
      ['/m/', { zona: 'listado' }],
      ['/n/', { zona: 'listado' }],
      ['/t/', { zona: 'listado' }],
      ['/i/', { zona: 'listado' }],
      ['/j/', { zona: 'listado' }],
    ]);
  });

  /** Si la página construida pide el fichero de medición: entonces su escucha de `click` corre en ella. */
  const cargaElFichero = (html: string) =>
    etiquetasDeGuionExterno(html).some((etiqueta) => guionExternoDe(etiqueta.src)?.id === 'medicion');

  /**
   * Juzga los enlaces internos de `main` de toda página que carga el fichero: cada uno, con una zona
   * del vocabulario o una exención de `EXENCIONES_DE_ZONA`, en él o en un antepasado (las anclas de
   * la propia página, la exención que nombra esta prueba). Y ninguno con un `target` que abra en la
   * misma pestaña sin ser vacío o `_self` —`_top` y `_parent`—, ni la página con un `<base>`: la
   * escucha no mide esos enlaces, y la regla del fichero (vacío o `_self`) solo se sostiene mientras
   * el sitio no los tenga.
   */
  function juzgarEnlacesDeMain(paginasConstruidas: Map<string, string>) {
    let paginas = 0;
    const sinLectura = new Set<string>();
    let enlaces = 0;
    const sinDeclarar: string[] = [];
    const sinMedirEnLaMismaPestaña: string[] = [];
    for (const [ruta, html] of paginasConstruidas) {
      if (!cargaElFichero(html)) {
        expect(vistasDe(html), `${ruta}: declara vista y no carga el fichero`).toBeUndefined();
        continue;
      }
      paginas++;
      if (vistasDe(html) === undefined) sinLectura.add(ruta);
      recorrerElementos(html, (elemento) => {
        if (elemento.etiqueta === 'base') sinMedirEnLaMismaPestaña.push(`${ruta}: <base>`);
      });
      for (const { href, target, enMain, declaracion } of enlacesDe(html)) {
        if (!enMain || href === undefined || esAnclaDeLaPropiaPagina(href)) continue;
        if (new URL(href, new URL(ruta, BASE)).origin !== BASE.origin) continue;
        enlaces++;
        const valida =
          declaracion !== null &&
          ('zona' in declaracion
            ? (ZONAS as readonly string[]).includes(declaracion.zona)
            : (EXENCIONES_DE_ZONA as readonly string[]).includes(declaracion.sinZona));
        if (!valida) sinDeclarar.push(`${ruta}: ${href} (${JSON.stringify(declaracion)})`);
        if (target !== undefined && /^_(top|parent)$/i.test(target)) sinMedirEnLaMismaPestaña.push(`${ruta}: ${href} (${target})`);
      }
    }
    return { paginas, sinLectura, enlaces, sinDeclarar, sinMedirEnLaMismaPestaña };
  }

  /*
   * Toda página que carga el fichero, no solo las superficies con lectura: las páginas 2+,
   * `/buscar/` y el 404 también emiten su salida (sin lectura), y un enlace sin zona en ellas se
   * quedaría sin medir igual de callado. Lo que no carga el fichero —`/kit` y `/lote`— no mide
   * nada y no entra.
   */
  it('en toda página que carga el fichero —con lectura o sin ella—, todo enlace interno de `main` tiene zona o exención', async () => {
    const { paginas, sinLectura, enlaces, sinDeclarar, sinMedirEnLaMismaPestaña } = juzgarEnlacesDeMain(
      paginasDe(await sitioMedido()),
    );
    expect(sinDeclarar).toEqual([]);
    expect(sinMedirEnLaMismaPestaña).toEqual([]);
    // Portada, las Citas, el Autor, el Tema, la Colección y la Obra indexable: ninguna en vacío.
    expect(paginas).toBeGreaterThan(SLUGS_DE_CITA.length + 4);
    expect(enlaces).toBeGreaterThan(paginas * 3);
    /*
     * Y entre las juzgadas están las que no tendrán lectura nunca: las páginas 2+ —también la de la
     * Obra—, `/buscar/` y el 404. La página 1 de toda Obra, en cambio, no está entre ellas: desde la
     * 23.9 la que no se indexa tiene vista y lectura, y sus enlaces se juzgan como superficie con
     * lectura, igual que los de la indexable.
     */
    for (const ruta of [...PAGINAS_2, OBRAS[2], '/buscar/', '/404']) expect([...sinLectura], ruta).toContain(ruta);
    for (const ruta of [OBRAS[0], OBRAS[1]]) expect([...sinLectura], ruta).not.toContain(ruta);
  }, 240_000);

  /**
   * Qué zona lleva cada sitio, no solo que lleve una del conjunto: una zona válida en el sitio
   * equivocado —los Chips de Tema de la Cita con la de sus Rutas de salida, la Paginación con la del
   * listado, los chips de la portada intercambiados— pasa las demás pruebas y mide mal SM-4.
   *
   * Cada fila es una página, un enlace —su `href` exacto, o una expresión para todos los que casen—
   * y las declaraciones distintas que llevan los enlaces de `main` que casan, en el orden en que
   * aparecen por primera vez; al menos uno tiene que casar. La Paginación va por expresión: la misma
   * página sale como número y como «Siguiente», y la barra final la pone Astro.
   *
   * No se comparan las declaraciones de una zona que coloca otra épica: la Tarjeta de Obra de la
   * 24.4 enlaza en la Cita a la misma Obra que su Atribución, con `tarjeta-de-obra`, y la fila de la
   * Atribución tiene que seguir pasando sin tocarla. Lo que sí rompe es que falte la de hoy o que
   * aparezca otra de las once, una exención o ninguna.
   */
  const COLOCACION: readonly (readonly [ruta: string, enlace: string | RegExp, esperadas: readonly Declaracion[]])[] = [
    ['/', CITA, [{ zona: 'cita-del-dia' }]],
    ['/', '/autor/seneca/', [{ zona: 'atribucion' }, { zona: 'autores-de-portada' }]],
    ['/', '/obra/seneca/sobre-la-brevedad-de-la-vida/', [{ zona: 'atribucion' }]],
    ['/', '/tema/el-tiempo/', [{ zona: 'chip-de-tema' }]],
    ['/', '/coleccion/frases-cortas/', [{ zona: 'colecciones' }]],
    ['/404', CITA, [{ zona: 'cita-del-dia' }]],
    ['/404', '/autor/seneca/', [{ zona: 'atribucion' }]],
    ['/404', '/obra/seneca/sobre-la-brevedad-de-la-vida/', [{ zona: 'atribucion' }]],
    ['/404', '/tema/el-tiempo/', [{ sinZona: 'chips-del-404' }]],
    // Historia 24.6 — el Autor sale además por el cierre de «Más de Séneca», con la zona de las Rutas de salida.
    // «De la misma obra» enlaza aquí también a la Obra y a otras Citas, con `misma-obra`, que es de otra
    // épica y `esDeOtraEpica` aparta de estas filas: la mira (c) de `tests/unit/rutas-de-salida.test.ts`.
    [CITA, '/autor/seneca/', [{ zona: 'atribucion' }, { zona: 'rutas-de-salida' }]],
    [CITA, '/obra/seneca/sobre-la-brevedad-de-la-vida/', [{ zona: 'atribucion' }]],
    [CITA, /^\/cita\//, [{ zona: 'rutas-de-salida' }]],
    [CITA, '/tema/el-tiempo/', [{ zona: 'chip-de-tema' }]],
    ['/autor/seneca/', /^\/obra\//, [{ zona: 'lista-de-obras' }]],
    ['/autor/seneca/', /^\/cita\//, [{ zona: 'listado' }]],
    ['/autor/seneca/', /^\/autor\/seneca\/2\/?$/, [{ zona: 'paginacion' }]],
    ['/autor/seneca/2/', /^\/cita\//, [{ zona: 'listado' }]],
    ['/autor/seneca/2/', /^\/autor\/seneca\/?$/, [{ zona: 'paginacion' }]],
    ['/tema/el-tiempo/', /^\/cita\//, [{ zona: 'listado' }]],
    ['/tema/el-tiempo/', /^\/tema\/el-tiempo\/2\/?$/, [{ zona: 'paginacion' }]],
    ['/tema/el-tiempo/2/', /^\/cita\//, [{ zona: 'listado' }]],
    ['/tema/el-tiempo/2/', /^\/tema\/el-tiempo\/?$/, [{ zona: 'paginacion' }]],
    ['/coleccion/frases-cortas/', /^\/cita\//, [{ zona: 'listado' }]],
    ['/coleccion/frases-cortas/', /^\/coleccion\/frases-cortas\/2\/?$/, [{ zona: 'paginacion' }]],
    ['/coleccion/frases-cortas/2/', /^\/cita\//, [{ zona: 'listado' }]],
    ['/coleccion/frases-cortas/2/', /^\/coleccion\/frases-cortas\/?$/, [{ zona: 'paginacion' }]],
    [OBRA_INDEXABLE, '/autor/seneca/', [{ zona: 'atribucion' }]],
    [OBRA_INDEXABLE, /^\/cita\//, [{ zona: 'listado' }]],
    [OBRAS[1], '/autor/seneca/', [{ zona: 'atribucion' }]],
    [OBRAS[1], /^\/obra\/seneca\/sobre-la-brevedad-de-la-vida\/2\/?$/, [{ zona: 'paginacion' }]],
    [OBRAS[1], '/tema/el-tiempo/', [{ zona: 'chip-de-tema' }]],
    [OBRAS[2], /^\/cita\//, [{ zona: 'listado' }]],
    [OBRAS[2], /^\/obra\/seneca\/sobre-la-brevedad-de-la-vida\/?$/, [{ zona: 'paginacion' }]],
    ['/buscar/', '/tema/el-tiempo/', [{ sinZona: 'salidas-sin-resultados' }]],
    ['/buscar/', '/coleccion/frases-cortas/', [{ sinZona: 'salidas-sin-resultados' }]],
    ['/buscar/', '/autor/seneca/', [{ sinZona: 'salidas-sin-resultados' }]],
  ];

  it.each(COLOCACION.map(([ruta, enlace, esperadas]) => [ruta, String(enlace), enlace, esperadas] as const))(
    'en %s, %s sale por su zona',
    async (ruta, _, enlace, esperadas) => {
      const html = paginasDe(await sitioMedido()).get(ruta);
      expect(html, `${ruta} no está en dist/`).toBeDefined();
      const casa = (href: string) => (typeof enlace === 'string' ? href === enlace : enlace.test(href));
      const casan = enlacesDe(html!).filter(
        (e) => e.enMain && e.href !== undefined && casa(e.href) && !esDeOtraEpica(e.declaracion),
      );
      expect(casan.length, `ningún enlace de \`main\` de ${ruta} casa con ${String(enlace)}`).toBeGreaterThan(0);
      const distintas = [...new Set(casan.map((e) => JSON.stringify(e.declaracion)))].map((d) => JSON.parse(d));
      expect(distintas).toEqual(esperadas);
    },
    240_000,
  );

  /*
   * Historia 24.6 — las Rutas de salida ya no tienen respaldo: «Explorar por tema» y «Sobre {Autor}»
   * se retiraron. Una Cita sola de su Autor, de una Obra de una Cita y sin Temas, en un sitio sin
   * ningún Tema publicado, no pinta Rutas de salida: ni `nav`, ni rótulo. Y sus demás enlaces —la
   * cabecera, la Atribución…— se juzgan como en el sitio medido.
   */
  const CITA_SOLA = 'seneca-sola';
  let respaldo: Promise<string> | undefined;
  const sitioDeRespaldo = () =>
    (respaldo ??= construirConCorpus(
      { 'autores/seneca.yml': AUTOR_VALIDO, [`citas/${CITA_SOLA}.md`]: citaValida({ slug: CITA_SOLA, temas: [] }) },
      { entorno: { MEDICION_ENDPOINT: ENDPOINT } },
    ).then((resultado) => {
      aLimpiar.push(resultado.proyecto);
      expect(resultado.codigo, resultado.salida).toBe(0);
      return resultado.proyecto;
    }));

  it('una Cita sola de su Autor, de una Obra de una Cita y sin Temas no pinta Rutas de salida', async () => {
    const paginas = paginasDe(await sitioDeRespaldo());
    const juicio = juzgarEnlacesDeMain(paginas);
    expect(juicio.sinDeclarar).toEqual([]);
    expect(juicio.sinMedirEnLaMismaPestaña).toEqual([]);
    expect([...paginas.keys()].filter((ruta) => cargaElFichero(paginas.get(ruta)!))).toContain(`/cita/${CITA_SOLA}/`);
    const cita = paginas.get(`/cita/${CITA_SOLA}/`);
    expect(cita, 'la Cita sola no está en dist/').toBeDefined();
    expect(cita).not.toContain('class="salidas"');
    expect(cita).not.toContain('Sobre Séneca');
    expect(cita).not.toContain('Explorar por tema');
    const deLaCita = enlacesDe(cita!).filter((e) => e.enMain);
    // El Autor sale solo por la Atribución.
    expect(deLaCita.filter((e) => e.href === '/autor/seneca/').map((e) => e.declaracion)).toEqual([{ zona: 'atribucion' }]);
    expect(deLaCita.filter((e) => e.href?.startsWith('/tema/'))).toEqual([]);
  }, 240_000);

  it('en todo `dist/` las zonas son del vocabulario, están las once de hoy y van en un contenedor, nunca en el enlace', async () => {
    const declaraciones = await declaracionesDelSitio();
    const zonas = declaraciones.flatMap(({ declaracion }) => ('zona' in declaracion ? [declaracion.zona] : []));
    for (const zona of ZONAS_DE_HOY) expect(ZONAS as readonly string[]).toContain(zona);
    for (const zona of zonas) expect(ZONAS as readonly string[], zona).toContain(zona);
    // Están todas las de hoy; las que coloquen la 24, la 26 y la 28 se suman sin tocar esto.
    for (const zona of ZONAS_DE_HOY) expect(zonas, zona).toContain(zona);
    const enEnlaces = declaraciones.filter(({ elemento }) => elemento.etiqueta === 'a');
    expect(enEnlaces.map(({ ruta }) => ruta)).toEqual([]);
  }, 240_000);

  it('en todo `dist/` las exenciones son de su conjunto, están las dos y cada una en su sitio', async () => {
    const exenciones = (await declaracionesDelSitio()).flatMap(({ ruta, elemento, declaracion }) =>
      'sinZona' in declaracion ? [{ ruta, elemento, motivo: declaracion.sinZona }] : [],
    );
    for (const { motivo } of exenciones) expect(EXENCIONES_DE_ZONA as readonly string[], motivo).toContain(motivo);
    expect([...new Set(exenciones.map(({ motivo }) => motivo))].sort()).toEqual([...EXENCIONES_DE_ZONA].sort());
    for (const { ruta, elemento, motivo } of exenciones) {
      const sitio = SITIO_DE_LA_EXENCION[motivo as ExencionDeZona];
      expect(ruta, motivo).toBe(sitio.ruta);
      expect(elemento.etiqueta, motivo).toBe(sitio.etiqueta);
      expect(sitio.marca(elemento), motivo).toBe(true);
    }
    // Una vez cada una: el 404 tiene una lista de Temas y `/buscar/`, un bloque de salidas.
    expect(exenciones).toHaveLength(EXENCIONES_DE_ZONA.length);
  }, 240_000);

  it('la cabecera de cada página lleva `cabecera`, y la lista de resultados de `/buscar/`, `resultado`', async () => {
    const paginas = paginasDe(await sitioMedido());
    for (const [ruta, html] of paginas) {
      const cabeceras: Elemento[] = [];
      recorrerElementos(html, (elemento, antepasados) => {
        if (elemento.etiqueta === 'header' && !antepasados.some((e) => e.etiqueta === 'main')) cabeceras.push(elemento);
      });
      expect(cabeceras.map((c) => c.atributos.get(ATRIBUTO_DE_ZONA)), ruta).toEqual(['cabecera']);
    }
    const resultados: Elemento[] = [];
    recorrerElementos(paginas.get('/buscar/')!, (elemento) => {
      if (elemento.atributos.has('data-resultados')) resultados.push(elemento);
    });
    expect(resultados.map((r) => [r.etiqueta, r.atributos.get(ATRIBUTO_DE_ZONA)])).toEqual([['ul', 'resultado']]);
  }, 240_000);

  it('la portada y el 404, con Cita del Día, la enlazan desde `cita-del-dia` y su Autor desde `atribucion`', async () => {
    for (const ruta of ['/', '/404']) {
      const enlaces = enlacesDe(await leerMedida(ruta)).filter((e) => e.enMain);
      const declaracionesDe = (href: string) => enlaces.filter((e) => e.href === href).map((e) => e.declaracion);
      expect(declaracionesDe(CITA), ruta).toEqual([{ zona: 'cita-del-dia' }]);
      // En la portada, el Autor también sale de la lista de Autores.
      expect(declaracionesDe('/autor/seneca/'), ruta).toContainEqual({ zona: 'atribucion' });
    }
  }, 240_000);

  it('los seis componentes de enlace declaran `zona: Zona`, obligatoria, en sus Props', () => {
    for (const componente of ['TarjetaDeCita', 'Chips', 'Paginacion', 'ListaDeObras', 'RutasDeSalida', 'Atribucion']) {
      const ruta = resolve(RAIZ, `src/components/${componente}.astro`);
      const [, frontmatter] = readFileSync(ruta, 'utf8').split(/^---$/m);
      const fuente = ts.createSourceFile(ruta, frontmatter, ts.ScriptTarget.Latest, true);
      const props = fuente.statements.find(
        (s): s is ts.InterfaceDeclaration => ts.isInterfaceDeclaration(s) && s.name.text === 'Props',
      );
      expect(props, componente).toBeDefined();
      const zona = props!.members.find(
        (m): m is ts.PropertySignature => ts.isPropertySignature(m) && m.name.getText(fuente) === 'zona',
      );
      expect(zona, `${componente}: sin \`zona\` en sus Props`).toBeDefined();
      expect(zona!.questionToken, `${componente}: \`zona\` es opcional`).toBeUndefined();
      expect(zona!.type?.getText(fuente), componente).toBe('Zona');
      // Y `Zona` es la del vocabulario, no una propia.
      expect(frontmatter, componente).toMatch(/import type \{ Zona \} from '\.\.\/lib\/vocabulario\.ts';/);
    }
  });
});

describe('Historia 23.1 — toda isla que anuncia lleva `anunciar`', () => {
  it('cada página lleva tantos guiones que llaman `anunciar` como regiones `role="status"`, o más', async () => {
    /*
     * La prueba de las islas nombra tres; esta las descubre: una isla nueva con su región de
     * estado y un anuncio escrito a mano —sin `requestAnimationFrame`, que la otra prueba
     * vigila— dejaría su página con una región de más. Cuenta el guion que **llama** a
     * `anunciar`, no el que solo lleva su texto, que `guionQueAnuncia` mete siempre.
     */
    let regionesVistas = 0;
    /*
     * Historia 26.6 — el filtro de los Directorios anuncia su recuento con el segundo ritmo
     * (`ritmoDeTecleo`), desde un fichero y no en línea: la página que lo pide cuenta su guion
     * como anunciante de la región que lleva en el HTML inicial, **si el fichero anuncia**: busca
     * la región `role="status"`, programa la frase y escribe su `textContent`. Lo que hace con
     * ella lo juzga ejecutándolo `tests/unit/ayuda/filtroEjecutado.ts`; aquí basta con que una
     * etiqueta sola no cuente como anunciante.
     */
    const fuenteDelFiltro = [...((await ficherosDescargados()).get('filtro')?.values() ?? [])].join('\n');
    const filtroAnuncia =
      fuenteDelFiltro.includes('[role="status"]') && /\bsetTimeout\(/.test(fuenteDelFiltro) && /\.textContent\s*=(?!=)/.test(fuenteDelFiltro);
    expect(filtroAnuncia, 'el fichero del filtro no anuncia por su región').toBe(true);
    /*
     * Historia 27.2 — la búsqueda, igual que el filtro: un fichero empaquetado que anuncia por la
     * región de `/buscar/` —la encuentra por `[data-estado]`, programa el recuento y escribe su
     * `textContent`, y la búsqueda sin resultados con `anunciar` (`requestAnimationFrame`)—.
     */
    const fuenteDeLaBusqueda = [...((await ficherosDescargados()).get('busqueda')?.values() ?? [])].join('\n');
    const busquedaAnuncia =
      fuenteDeLaBusqueda.includes('[data-estado]') &&
      /\bsetTimeout\(/.test(fuenteDeLaBusqueda) &&
      /\.textContent\s*=(?!=)/.test(fuenteDeLaBusqueda) &&
      fuenteDeLaBusqueda.includes('requestAnimationFrame');
    expect(busquedaAnuncia, 'el fichero de la búsqueda no anuncia por su región').toBe(true);
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      const regiones = (html.match(/\brole\s*=\s*["']?status\b/gi) ?? []).length;
      const delFiltro = filtroAnuncia
        ? etiquetasDeGuionExterno(html).filter((e) => guionExternoDe(e.src)?.id === 'filtro').length
        : 0;
      const deLaBusqueda = busquedaAnuncia
        ? etiquetasDeGuionExterno(html).filter((e) => guionExternoDe(e.src)?.id === 'busqueda').length
        : 0;
      const anunciantes =
        delFiltro +
        deLaBusqueda +
        guionesEnLinea(html).filter((g) => colapsado(g).includes(ANUNCIAR) && /\banunciar\(/.test(sinAnunciar(g)))
          .length;
      regionesVistas += regiones;
      expect(anunciantes, `${ruta}: ${regiones} regiones de estado y ${anunciantes} guiones con anunciar`).toBeGreaterThanOrEqual(
        regiones,
      );
    }
    expect(regionesVistas).toBeGreaterThan(0);
  }, 240_000);

  it('el texto de `anunciar` funciona solo, sin nada de su módulo alrededor', () => {
    // Es lo que viaja: si el empaquetado le metiera un ayudante o un nombre de fuera, la isla
    // fallaría en el navegador con el build en verde. Aquí se ejecuta tal cual.
    const fotogramas: (() => void)[] = [];
    const deTexto = new Function('requestAnimationFrame', `return ${String(anunciar)};`)(
      (fotograma: () => void) => fotogramas.push(fotograma),
    ) as typeof anunciar;
    const region = { textContent: 'Copiado.' as string | null };
    deTexto(region, 'Copiado.');
    expect(region.textContent).toBe('');
    for (const fotograma of fotogramas) fotograma();
    expect(region.textContent).toBe('Copiado.');
  });

  it('`guionQueAnuncia` rompe ante lo que cerraría el `<script>` o no sería JavaScript', () => {
    expect(() => guionQueAnuncia({ 'no-vale': 1 }, '')).toThrow(/identificador/);
    expect(() => guionQueAnuncia({ NADA: undefined }, '')).toThrow(/JSON/);
    expect(() => guionQueAnuncia({}, "region.innerHTML = '</script>';")).toThrow(/<\/script/);
    expect(() => guionQueAnuncia({}, 'const a = 1; <!-- b')).toThrow(/<!--/);
    // Un valor con `</script>` sí vale: sale con el `<` escapado, como lo escapa `define:vars`.
    expect(guionQueAnuncia({ VALOR: '</script>' }, 'f(VALOR);')).not.toContain('</script');
  });
});

describe('Historia 23.1 — el tope del fichero se juzga con el punto final de verdad', () => {
  it('el build se para si el fichero, con el punto final de la construcción, pasa de su tope', async () => {
    // La prueba de `dist/` mide con el punto final de las pruebas; el que se despliega es otro y
    // va dentro del fichero. Por eso lo juzga el propio endpoint, con el de cada construcción.
    const { getStaticPaths } = await import('../../src/pages/medicion/[version].js.ts');
    const antes = process.env.MEDICION_ENDPOINT;
    try {
      process.env.MEDICION_ENDPOINT = ENDPOINT;
      expect(getStaticPaths()).toHaveLength(1);
      process.env.MEDICION_ENDPOINT = `https://medicion.ejemplo.workers.dev/${'e'.repeat(MAX_BYTES_GUION_DE_MEDICION)}`;
      expect(() => getStaticPaths()).toThrow(/MAX_BYTES_GUION_DE_MEDICION/);
      delete process.env.MEDICION_ENDPOINT;
      expect(getStaticPaths()).toEqual([]);
    } finally {
      if (antes === undefined) delete process.env.MEDICION_ENDPOINT;
      else process.env.MEDICION_ENDPOINT = antes;
    }
  });
});

/*
 * Historia 23.8 — una búsqueda cuenta una vez, cuando se asienta.
 *
 * Dos mitades, como la historia. La **parte pura** (`asentamientoDeBusqueda`) se llama directa y
 * evaluada por su texto en un contexto vacío —que es como viaja a la isla—, y las dos dan lo mismo
 * en cada fila de la matriz que le toca. La **isla** de `/buscar/` se ejecuta tal como sale en
 * `dist/` —desde la 27.2, el fichero empaquetado de `Busqueda.astro`, aplanado a guion clásico—, en
 * el entorno simulado de `tests/unit/ayuda/busqueda.ts`, con un Pagefind de mentira: una
 * prueba por fila de la matriz. Lo que se afirma es lo que pide a `__medir` y lo que escribe en el
 * historial, en su orden; y, al cerrar cada entorno, que no quedó ninguna promesa rechazada sin
 * manejar y que la isla no abrió entradas, ni escribió la dirección, ni paró la propagación de nada.
 */
describe('Historia 23.8 — una búsqueda cuenta una vez, cuando se asienta', () => {
  const NINGUNO = filtrosUsados({ autor: false, obra: false, tema: false })!;
  const BUSQUEDA = EVENTOS.busqueda;
  const SIN_RESULTADOS = EVENTOS.busquedaSinResultados;
  const MARCA = MARCA_DE_BUSQUEDA_ASENTADA;
  type Parte = ReturnType<typeof asentamientoDeBusqueda>;

  /** Lo que devuelve una función de otro contexto, comparable con `toEqual`. */
  const plano = (valor: unknown) => (valor === undefined ? undefined : JSON.parse(JSON.stringify(valor)));
  /** La parte pura evaluada como texto, sin nada de su módulo alrededor: ni siquiera `URLSearchParams`. */
  const porSuTexto = runInNewContext(`(${String(asentamientoDeBusqueda)})`, {}) as typeof asentamientoDeBusqueda;
  const PARTES: [string, Parte][] = [
    ['directa', asentamientoDeBusqueda(ASENTAMIENTO_DE_BUSQUEDA)],
    ['por su texto', porSuTexto(JSON.parse(JSON.stringify(ASENTAMIENTO_DE_BUSQUEDA)))],
  ];
  const estadoDe = (texto: string, total: number, filtros: string = NINGUNO) => ({ texto, filtros, total });

  describe('la parte pura', () => {
    it('sus constantes salen del vocabulario, y la marca es una clave con nombre', () => {
      expect(NINGUNO).toBe(FILTROS[0]);
      expect(ASENTAMIENTO_DE_BUSQUEDA).toEqual({
        busqueda: EVENTOS.busqueda,
        sinResultados: EVENTOS.busquedaSinResultados,
        tramos: TRAMOS,
        sinFiltros: NINGUNO,
        marca: MARCA,
      });
      expect(ASENTAMIENTO_DE_BUSQUEDA.tramos).toBe(TRAMOS);
      expect(MARCA).toBe('asentada');
    });

    it('su texto es autocontenido: ni comentarios, ni ayudas del empaquetado, ni nombres de su módulo', () => {
      const texto = String(asentamientoDeBusqueda);
      expect(texto).not.toMatch(/\/\/|\/\*|__name|__publicField/);
      for (const nombre of ['ASENTAMIENTO_DE_BUSQUEDA', 'MARCA_DE_BUSQUEDA_ASENTADA', 'TRAMOS', 'EVENTOS', 'tramoDe', 'filtrosUsados']) {
        expect(texto, nombre).not.toContain(nombre);
      }
    });

    it.each(PARTES)('%s: el tramo es el del total, el mismo de `tramoDe`, y viajan los filtros del estado', (_, parte) => {
      for (const total of [0, 1, 9, 10, 29, 30, 45]) {
        const texto = total === 0 ? 'zzz' : 'viento';
        const resultado = plano(parte.emisiones(estadoDe(texto, total), []));
        expect(resultado.eventos[0], String(total)).toEqual([BUSQUEDA, tramoDe(total), NINGUNO]);
      }
      expect(plano(parte.emisiones(estadoDe('viento', 3, 'autor-tema'), []))?.eventos).toEqual([[BUSQUEDA, '1-9', 'autor-tema']]);
    });

    it.each(PARTES)('%s: el tramo coincide con `tramoDe` en todo total, y `TRAMOS` está en orden y empieza en 0', (_, parte) => {
      // La parte pura recorre los cortes en su orden y se queda con el último que alcanza: eso
      // supone que `TRAMOS` sube y que el primero es 0. Si el vocabulario dejara de cumplirlo, aquí.
      expect(TRAMOS[0].desde).toBe(0);
      for (let i = 1; i < TRAMOS.length; i++) expect(TRAMOS[i].desde).toBeGreaterThan(TRAMOS[i - 1].desde);
      const totales = [...Array.from({ length: 201 }, (_, i) => i), 999, 10_000, Number.MAX_SAFE_INTEGER];
      for (const total of totales) {
        expect(plano(parte.emisiones(estadoDe('viento', total), []))?.eventos[0][1], String(total)).toBe(tramoDe(total));
      }
    });

    it.each(PARTES)('%s: sin estado, sin búsqueda que corriera o sin texto ni filtros, nada', (_, parte) => {
      expect(parte.emisiones(null, [])).toBeNull();
      expect(parte.emisiones(undefined, [])).toBeNull();
      for (const total of [Number.NaN, 1.5, -1, Number.POSITIVE_INFINITY, undefined, '3', null]) {
        expect(parte.emisiones({ texto: 'viento', filtros: NINGUNO, total: total as number }, []), String(total)).toBeNull();
      }
      expect(parte.emisiones(estadoDe('', 3), [])).toBeNull();
      expect(parte.emisiones(estadoDe('   ', 0), [])).toBeNull();
    });

    it.each(PARTES)('%s: con texto y total 0, la búsqueda en el tramo 0 y después la búsqueda sin resultados con el texto tal como se buscó', (_, parte) => {
      expect(plano(parte.emisiones(estadoDe('zzz', 0), []))).toEqual({
        clave: parte.clave('zzz', NINGUNO),
        eventos: [
          [BUSQUEDA, '0', NINGUNO],
          [SIN_RESULTADOS, 'zzz'],
        ],
      });
      expect(plano(parte.emisiones(estadoDe(' Zzz ', 0), []))?.eventos[1]).toEqual([SIN_RESULTADOS, ' Zzz ']);
      // Con resultados, solo la búsqueda.
      expect(plano(parte.emisiones(estadoDe('viento', 1), []))?.eventos).toEqual([[BUSQUEDA, '1-9', NINGUNO]]);
    });

    it.each(PARTES)('%s: un filtrado sin texto y sin resultados da solo la búsqueda en el tramo 0', (_, parte) => {
      expect(plano(parte.emisiones(estadoDe('', 0, 'autor'), []))?.eventos).toEqual([[BUSQUEDA, '0', 'autor']]);
      expect(plano(parte.emisiones(estadoDe('  ', 4, 'autor-obra-tema'), []))?.eventos).toEqual([
        [BUSQUEDA, '1-9', 'autor-obra-tema'],
      ]);
    });

    it.each(PARTES)('%s: la clave recorta los extremos y respeta mayúsculas y filtros; una registrada no se repite', (_, parte) => {
      expect(parte.clave(' viento ', NINGUNO)).toBe(parte.clave('viento', NINGUNO));
      expect(parte.clave('Viento', NINGUNO)).not.toBe(parte.clave('viento', NINGUNO));
      expect(parte.clave('viento', 'autor')).not.toBe(parte.clave('viento', NINGUNO));
      expect(parte.clave('viento del sur', NINGUNO)).not.toBe(parte.clave('viento  del sur', NINGUNO));
      const registradas = [parte.clave('viento', NINGUNO)];
      expect(parte.emisiones(estadoDe('viento', 3), registradas)).toBeNull();
      expect(parte.emisiones(estadoDe('viento ', 3), registradas)).toBeNull();
      expect(parte.emisiones(estadoDe('Viento', 3), registradas)).not.toBeNull();
      expect(parte.emisiones(estadoDe('viento', 3, 'autor'), registradas)).not.toBeNull();
      // La clave que devuelve es la del estado, para que la isla la registre.
      expect(parte.emisiones(estadoDe(' lluvia', 2), registradas)?.clave).toBe(parte.clave('lluvia', NINGUNO));
    });

    it.each(PARTES)('%s: Historia 27.2 — la clave lleva los valores de los filtros; sin ellos, es la de la 23.8', (_, parte) => {
      expect(parte.clave('viento', NINGUNO)).toBe(JSON.stringify(['viento', NINGUNO]));
      expect(parte.clave('viento', NINGUNO, undefined)).toBe(parte.clave('viento', NINGUNO));
      expect(parte.clave('', 'autor', 'jose-marti|')).not.toBe(parte.clave('', 'autor', 'seneca|'));
      expect(parte.clave(' viento ', 'autor', 'seneca|')).toBe(parte.clave('viento', 'autor', 'seneca|'));
      const conValores = (valores: string) => ({ texto: '', filtros: 'autor', total: 3, valores });
      const primera = parte.emisiones(conValores('jose-marti|'), []);
      expect(plano(primera)?.eventos).toEqual([[BUSQUEDA, '1-9', 'autor']]);
      // El mismo Autor otra vez, nada; otro, otra `busqueda` con la misma combinación.
      expect(parte.emisiones(conValores('jose-marti|'), [primera!.clave])).toBeNull();
      expect(plano(parte.emisiones(conValores('seneca|'), [primera!.clave]))?.eventos).toEqual([[BUSQUEDA, '1-9', 'autor']]);
      // Los valores no viajan en ningún evento.
      expect(JSON.stringify(plano(primera)?.eventos)).not.toContain('jose-marti');
    });

    it.each(PARTES)('%s: una llegada está registrada si su entrada lleva la marca o, sin objeto de estado, si es una vuelta atrás o una recarga', (_, parte) => {
      for (const tipo of ['navigate', 'reload', 'back_forward', 'prerender', undefined, null]) {
        expect(parte.yaRegistrada({ [MARCA]: true }, tipo), `marcada, ${tipo}`).toBe(true);
        expect(parte.yaRegistrada({ [MARCA]: true, otra: 1 }, tipo), `marcada con más, ${tipo}`).toBe(true);
        // Con objeto de estado manda el objeto: sin la marca —o con otra cosa que `true`—, no.
        expect(parte.yaRegistrada({}, tipo), `objeto sin marca, ${tipo}`).toBe(false);
        expect(parte.yaRegistrada({ [MARCA]: 'true' }, tipo), `marca que no es booleano, ${tipo}`).toBe(false);
        expect(parte.yaRegistrada({ [MARCA]: 1 }, tipo), `marca 1, ${tipo}`).toBe(false);
      }
      // Sin objeto de estado responde el tipo de la carga.
      for (const sinObjeto of [null, undefined, 'asentada', 1]) {
        expect(parte.yaRegistrada(sinObjeto, 'back_forward'), String(sinObjeto)).toBe(true);
        expect(parte.yaRegistrada(sinObjeto, 'reload'), String(sinObjeto)).toBe(true);
        for (const tipo of ['navigate', 'prerender', undefined, null, '']) {
          expect(parte.yaRegistrada(sinObjeto, tipo), `${String(sinObjeto)}, ${tipo}`).toBe(false);
        }
      }
    });

    it.each(PARTES)('%s: la entrada marcada es una copia con la marca a `true`, sin tocar el objeto ni perder sus claves', (_, parte) => {
      const original = { otra: 1, anidada: { x: 2 } };
      const marcada = parte.marcada(original);
      expect(plano(marcada)).toEqual({ otra: 1, anidada: { x: 2 }, [MARCA]: true });
      expect(marcada).not.toBe(original);
      expect(original).toEqual({ otra: 1, anidada: { x: 2 } });
      expect(plano(parte.marcada({ [MARCA]: false }))).toEqual({ [MARCA]: true });
      for (const sinObjeto of [null, undefined, 'x', 3]) {
        expect(plano(parte.marcada(sinObjeto)), String(sinObjeto)).toEqual({ [MARCA]: true });
      }
    });
  });

  describe('la isla de `/buscar/`, ejecutada', () => {
    /**
     * El guion de la isla, el de `dist/`: el fichero de la entrada `busqueda` que pide `/buscar/`,
     * con los trozos que importa, aplanado a guion clásico (Historia 27.2).
     */
    let guionDeLaIsla: string | undefined;
    const islaConstruida = async () => {
      if (guionDeLaIsla === undefined) {
        const html = await leerMedida('/buscar/');
        const deLaBusqueda = etiquetasDeGuionExterno(html).filter((e) => guionExternoDe(e.src)?.id === 'busqueda');
        expect(deLaBusqueda).toHaveLength(1);
        guionDeLaIsla = aplanar(join(await sitioMedido(), 'dist'), deLaBusqueda[0].src);
      }
      return guionDeLaIsla;
    };
    /**
     * Lo que responde el índice de mentira: «zzz…» no encuentra nada, «muchas» da 12 y pinta 3, lo
     * demás da 3. Con filtros (27.2), lo que diga `CON_FILTROS` por la combinación.
     */
    const RESPUESTAS = (consulta: string | null, opciones?: OpcionesDeSearch): Respuesta => {
      if (opciones?.filters !== undefined) return CON_FILTROS(consulta, opciones.filters);
      const recortada = (consulta ?? '').trim();
      if (recortada.startsWith('zzz')) return { total: 0 };
      if (recortada === 'muchas') return { total: 12, pintados: 3 };
      return { total: 3 };
    };
    /**
     * Historia 27.2 — con filtros: José Martí da 222 (y pinta 30), José Martí sobre la prudencia
     * 8, sobre el saber con «escuela» 6, Séneca sobre la prudencia ninguna, ninguna con «zzz…» y
     * una sola con «única».
     * Todas Citas, con su Autor.
     */
    const CON_FILTROS = (consulta: string | null, filtros: Record<string, string>): Respuesta => {
      const texto = (consulta ?? '').trim();
      const autor = filtros[FILTROS_DE_CITA.autor];
      const tema = filtros[FILTROS_DE_CITA.tema];
      const datos = (i: number) => ({
        url: `/cita/${autor ?? 'alguien'}-${tema ?? 'todo'}-${i}/`,
        meta: { title: `Cita ${i}`, autor: autor === 'seneca' ? 'Séneca' : 'José Martí' },
        filters: { tipo: ['cita'] },
      });
      if (texto === 'única') return { total: 1, datos };
      if (texto.startsWith('zzz')) return { total: 0 };
      // Historia 27.3 — con Obra: «Maestros ambulantes» da 23, y sobre la prudencia, una.
      const obra = filtros[FILTROS_DE_CITA.obra];
      if (obra === 'jose-marti--maestros-ambulantes' && tema === 'la-prudencia') return { total: 1, datos };
      if (obra === 'jose-marti--maestros-ambulantes') return { total: 23, datos };
      if (obra !== undefined) return { total: 2, datos };
      if (autor === 'seneca' && tema === 'la-prudencia') return { total: 0 };
      if (tema === 'el-saber' && texto === 'escuela') return { total: 6, datos };
      if (autor === 'jose-marti' && tema === 'la-prudencia') return { total: 8, datos };
      if (autor === 'jose-marti') return { total: 222, pintados: 30, datos };
      return { total: 4, datos };
    };
    const abiertas: ReturnType<typeof islaDeBusquedaEnUnSandbox>[] = [];
    afterEach(async () => {
      // Se cierran todos antes de afirmar nada: un `expect` que falla no deja entornos escuchando.
      const cerrar = abiertas.splice(0);
      for (const entorno of cerrar) await entorno.cerrar();
      for (const entorno of cerrar) {
        expect(entorno.rechazos(), 'quedó una promesa rechazada sin manejar').toEqual([]);
        expect(entorno.violaciones(), 'la isla hizo lo que no debe').toEqual([]);
      }
    });
    /** Un entorno nuevo con la isla de `dist/`, ya analizada y con sus promesas corridas. */
    async function isla(opciones: OpcionesDeLaIsla = {}) {
      const entorno = islaDeBusquedaEnUnSandbox(await islaConstruida(), { respuestas: RESPUESTAS, ...opciones });
      abiertas.push(entorno);
      await entorno.vaciar();
      return entorno;
    }
    const VIENTO = [BUSQUEDA, '1-9', NINGUNO];

    it('la isla importa la parte pura y sus constantes de `medicion.ts`; ni `buscar.astro` ni `Busqueda.astro` escriben rótulos, combinaciones ni eventos', async () => {
      const guion = await islaConstruida();
      // Los cortes y los rótulos de `TRAMOS` viajan en el fichero, por importación.
      for (const { desde, rotulo } of TRAMOS) expect(guion, rotulo).toMatch(new RegExp(`desde:\\s*${desde},\\s*rotulo:\\s*[\`'"]${rotulo.replace('+', '\\+')}[\`'"]`));
      expect(guion).not.toContain('__name');
      // Un solo `import(`: el del índice. Lo sustituye el entorno simulado, y lo comprueba.
      expect(guion.split('import(')).toHaveLength(2);

      // El código del componente y de la página, sin sus comentarios: los docblocks sí nombran los
      // eventos, entre tildes.
      const sinComentarios = (ruta: string) =>
        readFileSync(resolve(RAIZ, ruta), 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '')
          .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
      const pagina = sinComentarios('src/pages/buscar.astro');
      const componente = sinComentarios('src/components/Busqueda.astro');
      expect(pagina).not.toContain('guionQueAnuncia');
      expect(pagina).not.toMatch(/<script\b/);
      expect(componente).toMatch(/import \{ ASENTAMIENTO_DE_BUSQUEDA, asentamientoDeBusqueda, type EstadoDeBusqueda \} from '\.\.\/lib\/medicion\.ts';/);
      expect(componente).not.toContain('guionQueAnuncia');
      expect(componente).not.toContain('define:vars');
      expect(componente).not.toContain('is:inline');
      const entreComillas = (valor: string) =>
        new RegExp(`['"\`]${valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`);
      for (const fuente of [pagina, componente]) {
        for (const { rotulo } of TRAMOS) expect(fuente, rotulo).not.toMatch(entreComillas(rotulo));
        for (const combinacion of FILTROS) expect(fuente, combinacion).not.toMatch(entreComillas(combinacion));
        expect(fuente).not.toContain(NINGUNO);
        for (const evento of [BUSQUEDA, SIN_RESULTADOS]) expect(fuente, evento).not.toMatch(entreComillas(evento));
        expect(fuente).not.toContain(MARCA);
      }
      // Y el detector ve lo que tiene que ver.
      expect(entreComillas('30+').test("x = '30+'")).toBe(true);
      expect(entreComillas('0').test('const n = "0";')).toBe(true);
    }, 240_000);

    it('solo la isla de `/buscar/` lleva los nombres de la `busqueda` y de la `busqueda-sin-resultados`: ni un guion en línea ni otro de lo que se descarga', async () => {
      // El fichero envía cada `busqueda` que recibe, venga de la ruta que venga: la regla de una por
      // estado y carga solo se sostiene si nadie más la pide. Aquí, en todo el sitio construido.
      const nombres = [BUSQUEDA, SIN_RESULTADOS].flatMap((nombre) => [`"${nombre}"`, `'${nombre}'`, `\`${nombre}\``]);
      const llevan: string[] = [];
      for (const [ruta, html] of paginasDe(await sitioMedido())) {
        for (const guion of guionesEnLinea(html)) {
          if (nombres.some((nombre) => guion.includes(nombre))) llevan.push(ruta);
        }
      }
      // Historia 27.2 — ninguno en línea: la isla de la búsqueda es un fichero.
      expect(llevan).toEqual([]);
      // De lo que se descarga, solo el fichero de entrada de la búsqueda. Ni la Imagen, ni Pagefind,
      // ni el filtro, ni el trozo que la búsqueda comparte con él. El fichero de medición sí los
      // nombra —su tabla de eventos—, y es el que los envía, no el que los pide.
      const descargados = await ficherosDescargados();
      expect(descargados.get('imagen')?.size, 'la Imagen de `islas/` se descarga en este sitio').toBeGreaterThan(0);
      expect(descargados.get('pagefind')?.size, 'Pagefind y su worker').toBeGreaterThanOrEqual(2);
      const { ruta: entradaDeLaBusqueda } = await ficheroDeEntrada('busqueda');
      const descargadosQueLosNombran: string[] = [];
      for (const [id, ficheros] of descargados) {
        if (id === 'medicion') continue;
        for (const [fichero, codigo] of ficheros) {
          if (nombres.some((nombre) => codigo.includes(nombre))) descargadosQueLosNombran.push(fichero);
        }
      }
      expect(descargadosQueLosNombran).toEqual([entradaDeLaBusqueda]);
      // El detector ve el fichero de medición, que sí los nombra.
      const [delFichero] = [...(descargados.get('medicion')?.values() ?? [])];
      expect(nombres.some((nombre) => delFichero.includes(nombre))).toBe(true);
    }, 240_000);

    it('al analizarse: ni `__medir` ni escritura del historial, tampoco al llegar con la consulta', async () => {
      for (const opciones of [
        {},
        { busqueda: '?q=viento' },
        { busqueda: '?q=zzz', navegacion: 'reload' },
        { busqueda: '?q=viento', estado: { [MARCA]: true } },
      ] satisfies OpcionesDeLaIsla[]) {
        const entorno = await isla(opciones);
        expect(entorno.analizado(), JSON.stringify(opciones)).toEqual({ emitidos: [], historial: [], violaciones: [] });
        expect(entorno.emitidos(), JSON.stringify(opciones)).toEqual([]);
        expect(entorno.marcas(), JSON.stringify(opciones)).toEqual([]);
      }
    }, 240_000);

    it('tecleo: ni por tecla, ni por la pausa, ni por el repintado, ni al enfocar o borrar', async () => {
      const entorno = await isla();
      entorno.enfocar();
      for (const texto of ['v', 'vi', 'vie', 'viento']) await entorno.teclear(texto);
      expect(entorno.pintados()).toHaveLength(3);
      await entorno.teclear('zzz');
      expect(entorno.pintados()).toEqual([]);
      await entorno.teclear('');
      entorno.escribir('vien');
      entorno.avanzar(1_000);
      await entorno.vaciar();
      expect(entorno.emitidos()).toEqual([]);
      expect(entorno.marcas()).toEqual([]);
    }, 240_000);

    it('enviar con resultados: una `busqueda` con su tramo y «ninguno», la entrada marcada sin dirección, y el fichero la envía con sus claves exactas', async () => {
      const entorno = await isla();
      await entorno.teclear('viento');
      const envio = await entorno.enviar();
      expect(envio.defaultPrevented).toBe(true);
      expect(entorno.emitidos()).toEqual([VIENTO]);
      // Historia 27.4 — enviar escribe antes lo enviado en la dirección (una entrada nueva, con su
      // estado), y la marca va después sobre esa entrada, sin dirección.
      expect(plano(entorno.direcciones())).toEqual([
        { metodo: 'pushState', direccion: '/buscar/?q=viento', estado: { [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: { q: 'viento' } } },
      ]);
      expect(plano(entorno.marcas())).toEqual([[{ [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: { q: 'viento' }, [MARCA]: true }, '']]);
      expect(entorno.marcas()[0], 'replaceState sin argumento de dirección').toHaveLength(2);
      expect(plano(entorno.estadoDelHistorial())).toEqual({ [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: { q: 'viento' }, [MARCA]: true });

      // Lo que pidió la isla, por el fichero de verdad: la baliza lleva exactamente sus claves.
      const fichero = medicionEnUnSandbox({ ruta: '/buscar/' });
      for (const llamada of entorno.emitidos()) fichero.emitir(...(llamada as [string, string, string]));
      expect(fichero.balizas()).toEqual([{ evento: BUSQUEDA, ruta: '/buscar/', tramo: '1-9', filtros: NINGUNO }]);
    }, 240_000);

    it('enviar antes de la pausa del tecleo: espera a que se pinte lo enviado y lo asienta', async () => {
      const entorno = await isla({ manual: true });
      entorno.escribir('viento');
      const envio = entorno.enviar();
      expect(entorno.emitidos()).toEqual([]);
      await entorno.responder('viento');
      await envio;
      expect(entorno.emitidos()).toEqual([VIENTO]);
      // La pausa del tecleo no vuelve a buscar ni a asentar: quedó cancelada.
      entorno.avanzar(1_000);
      await entorno.vaciar();
      expect(entorno.emitidos()).toEqual([VIENTO]);
    }, 240_000);

    it('enviar un texto que no llega a verse —otro lo superó— no asienta nada', async () => {
      const entorno = await isla({ manual: true });
      entorno.escribir('viento');
      const envio = entorno.enviar();
      // Antes de que responda, el visitante sigue escribiendo y esa búsqueda se pinta.
      entorno.escribir('lluvia');
      entorno.avanzar(150);
      await entorno.responder('lluvia');
      await entorno.responder('viento');
      await envio;
      expect(entorno.pintados()[0]).toContain('lluvia');
      expect(entorno.emitidos()).toEqual([]);
    }, 240_000);

    it('si el historial no se deja escribir, la `busqueda` sale igual y nada sale de la escucha', async () => {
      const entorno = await isla({ historialQueLanza: true });
      await entorno.teclear('viento');
      await entorno.enviar();
      expect(entorno.emitidos()).toEqual([VIENTO]);
      expect(entorno.marcas()).toHaveLength(1);
      expect(entorno.direccion(), 'la dirección se queda como estaba').toBe('/buscar/');
      await entorno.teclear('zzz');
      expect(() => entorno.ocultar()).not.toThrow();
      expect(entorno.emitidos()).toEqual([VIENTO, [BUSQUEDA, '0', NINGUNO], [SIN_RESULTADOS, 'zzz']]);
    }, 240_000);

    it('sin resultados: la `busqueda` en el tramo 0 y después la `busqueda-sin-resultados` con el texto, una vez', async () => {
      const entorno = await isla();
      await entorno.teclear('zzz');
      await entorno.enviar();
      await entorno.enviar();
      entorno.ocultar();
      expect(entorno.emitidos()).toEqual([
        [BUSQUEDA, '0', NINGUNO],
        [SIN_RESULTADOS, 'zzz'],
      ]);
      const fichero = medicionEnUnSandbox({ ruta: '/buscar/' });
      for (const llamada of entorno.emitidos()) fichero.emitir(...(llamada as [string, string, string]));
      expect(fichero.balizas()).toEqual([
        { evento: BUSQUEDA, ruta: '/buscar/', tramo: '0', filtros: NINGUNO },
        { evento: SIN_RESULTADOS, ruta: '/buscar/', datos: 'zzz' },
      ]);
    }, 240_000);

    it('repetir: Enter otra vez, A, B, A y «viento » no emiten más que una vez por estado', async () => {
      const entorno = await isla();
      await entorno.teclear('viento');
      await entorno.enviar();
      await entorno.enviar();
      await entorno.teclear('lluvia');
      await entorno.enviar();
      await entorno.teclear('viento');
      await entorno.enviar();
      await entorno.teclear('viento ');
      await entorno.enviar();
      entorno.pulsarResultado(0);
      entorno.ocultar();
      entorno.pagehide();
      expect(entorno.emitidos()).toEqual([VIENTO, VIENTO]);
      expect(entorno.marcas()).toHaveLength(2);
      // Otro estado, con otras mayúsculas, sí es otro.
      await entorno.teclear('Viento');
      await entorno.enviar();
      expect(entorno.emitidos()).toHaveLength(3);
    }, 240_000);

    it('sin texto: Enter con el campo vacío o con espacios no emite nada', async () => {
      const entorno = await isla();
      await entorno.enviar();
      await entorno.teclear('   ');
      await entorno.enviar();
      entorno.ocultar();
      entorno.pagehide();
      // Y borrar lo buscado limpia el estado que se ve: ocultarse después no asienta lo de antes.
      await entorno.teclear('viento');
      await entorno.teclear('');
      entorno.ocultar();
      expect(entorno.emitidos()).toEqual([]);
      expect(entorno.marcas()).toEqual([]);
    }, 240_000);

    it('pulsar un resultado —también con modificador o por teclado— asienta lo que se ve, antes de que el clic llegue a la ventana, y no se queda con el clic', async () => {
      for (const gesto of [{}, { metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { detail: 0 }]) {
        const entorno = await isla();
        await entorno.teclear('viento');
        const { clic, alLlegarALaVentana } = entorno.pulsarResultado(1, gesto);
        expect(entorno.emitidos(), JSON.stringify(gesto)).toEqual([VIENTO]);
        // La escucha del fichero, en la ventana, lo ve después: la `busqueda` va delante de la salida.
        expect(alLlegarALaVentana, JSON.stringify(gesto)).toBe(1);
        expect(clic.defaultPrevented, JSON.stringify(gesto)).toBe(false);
        // Otro resultado del mismo estado no repite.
        entorno.pulsarResultado(0, gesto);
        expect(entorno.emitidos(), JSON.stringify(gesto)).toEqual([VIENTO]);
      }
      // El botón central —abrir en otra pestaña— no da `click` en el navegador, sino `auxclick`:
      // también asienta, y el fichero no ve ninguna salida (no escucha `auxclick`).
      {
        const entorno = await isla();
        await entorno.teclear('viento');
        const { clic, alLlegarALaVentana } = entorno.pulsarResultado(0, { button: 1 }, 'auxclick');
        expect(entorno.emitidos(), 'auxclick central').toEqual([VIENTO]);
        expect(alLlegarALaVentana, 'auxclick central').toBe(1);
        expect(clic.defaultPrevented, 'auxclick central').toBe(false);
        entorno.pulsarResultado(1, {});
        expect(entorno.emitidos(), 'auxclick central, y luego clic').toEqual([VIENTO]);
      }
      // El secundario abre el menú contextual —copiar el enlace, inspeccionar—, que no es pulsar el
      // resultado: su `auxclick` no asienta, y lo que se ve se asienta después, una vez.
      {
        const entorno = await isla();
        await entorno.teclear('viento');
        const { clic } = entorno.pulsarResultado(0, { button: 2 }, 'auxclick');
        expect(entorno.emitidos(), 'auxclick secundario').toEqual([]);
        expect(clic.defaultPrevented, 'auxclick secundario').toBe(false);
        entorno.pulsarResultado(0, {});
        expect(entorno.emitidos(), 'auxclick secundario, y luego clic').toEqual([VIENTO]);
      }
      // Escucha en la lista, nunca en la ventana ni en el documento.
      const entorno = await isla();
      expect(entorno.escuchas().lista).toEqual(['click', 'auxclick']);
      expect(entorno.escuchas().ventana).not.toContain('auxclick');
      expect(entorno.escuchas().documento).not.toContain('auxclick');
      expect(entorno.escuchas().ventana).not.toContain('click');
      expect(entorno.escuchas().documento).not.toContain('click');
    }, 240_000);

    it('un clic en la lista fuera de todo enlace —en la fila o en la propia lista— no asienta', async () => {
      for (const en of ['fila', 'lista'] as const) {
        for (const tipo of ['click', 'auxclick'] as const) {
          const entorno = await isla();
          await entorno.teclear('viento');
          entorno.pulsarResultado(0, tipo === 'auxclick' ? { button: 1 } : {}, tipo, en);
          expect(entorno.emitidos(), `${tipo} en la ${en}`).toEqual([]);
          expect(entorno.marcas(), `${tipo} en la ${en}`).toEqual([]);
          entorno.ocultar();
          expect(entorno.emitidos(), `${tipo} en la ${en}, y luego ocultarse`).toEqual([VIENTO]);
        }
      }
    }, 240_000);

    it('volver a verse no asienta: lo pintado con la página oculta se asienta al ocultarse otra vez', async () => {
      const entorno = await isla({ manual: true });
      entorno.escribir('viento');
      entorno.avanzar(150);
      await entorno.vaciar();
      // Se va antes de que se pinte: no hay nada que asentar.
      entorno.ocultar();
      expect(entorno.emitidos()).toEqual([]);
      // La respuesta llega con la página oculta, y vuelve a verse sin ningún gesto: nada.
      await entorno.responder('viento');
      expect(entorno.pintados()).toHaveLength(3);
      entorno.mostrar();
      expect(entorno.emitidos()).toEqual([]);
      expect(entorno.marcas()).toEqual([]);
      entorno.ocultar();
      expect(entorno.emitidos()).toEqual([VIENTO]);
    }, 240_000);

    it('una página que nunca se vio —abierta de fondo con `?q=` y cerrada sin mirarla— no asienta; vista una vez, sí', async () => {
      const cerrada = await isla({ busqueda: '?q=viento', oculta: true });
      expect(cerrada.pintados()).toHaveLength(3);
      cerrada.pagehide();
      expect(cerrada.emitidos()).toEqual([]);
      expect(cerrada.marcas()).toEqual([]);

      const mirada = await isla({ busqueda: '?q=zzz', oculta: true });
      mirada.pagehide();
      expect(mirada.emitidos()).toEqual([]);
      mirada.mostrar();
      expect(mirada.emitidos()).toEqual([]);
      mirada.ocultar();
      expect(mirada.emitidos()).toEqual([[BUSQUEDA, '0', NINGUNO], [SIN_RESULTADOS, 'zzz']]);
    }, 240_000);

    it('ocultarse asienta el estado que se ve —no el texto cuya búsqueda aún no se pintó—, con `pagehide` de respaldo; sin estado, nada', async () => {
      const entorno = await isla({ manual: true });
      entorno.escribir('viento');
      entorno.avanzar(150);
      await entorno.responder('viento');
      entorno.escribir('zzz');
      entorno.avanzar(150);
      await entorno.vaciar();
      entorno.ocultar();
      expect(entorno.emitidos()).toEqual([VIENTO]);
      // Se pinta lo pendiente, y un `pagehide` sin `visibilitychange` lo asienta.
      await entorno.responder('zzz');
      entorno.pagehide();
      expect(entorno.emitidos()).toEqual([VIENTO, [BUSQUEDA, '0', NINGUNO], [SIN_RESULTADOS, 'zzz']]);

      // Sin nada pintado —ni siquiera con un texto escrito cuya búsqueda no respondió—, nada.
      const vacia = await isla({ manual: true });
      vacia.ocultar();
      vacia.pagehide();
      vacia.escribir('viento');
      vacia.avanzar(150);
      await vacia.vaciar();
      vacia.mostrar();
      vacia.ocultar();
      vacia.pagehide();
      expect(vacia.emitidos()).toEqual([]);
      expect(vacia.marcas()).toEqual([]);
    }, 240_000);

    it('el total, no los pintados: 12 resultados de los que se pintan 3 van al tramo 10-29', async () => {
      const entorno = await isla();
      await entorno.teclear('muchas');
      expect(entorno.pintados()).toHaveLength(3);
      await entorno.enviar();
      expect(entorno.emitidos()).toEqual([[BUSQUEDA, '10-29', NINGUNO]]);
    }, 240_000);

    it('los datos de un resultado que no llegan: ni se pinta ni se asienta, al enviar ni al ocultarse, y ningún rechazo sin manejar', async () => {
      // Sin resultados no hay datos que pedir: «zzz» sí corre, y es una búsqueda sin resultados de verdad.
      const entorno = await isla({ falla: 'data' });
      await entorno.teclear('viento');
      await entorno.enviar();
      entorno.ocultar();
      entorno.pagehide();
      await entorno.vaciar();
      expect(entorno.pintados()).toEqual([]);
      expect(entorno.emitidos()).toEqual([]);
      expect(entorno.marcas()).toEqual([]);
      entorno.mostrar();
      await entorno.teclear('zzz');
      await entorno.enviar();
      expect(entorno.emitidos()).toEqual([[BUSQUEDA, '0', NINGUNO], [SIN_RESULTADOS, 'zzz']]);
    }, 240_000);

    it.each(['importacion', 'init', 'search'] as const)(
      'índice que falla en %s: ni `busqueda` ni `busqueda-sin-resultados`, al enviar ni al ocultarse, y ningún rechazo sin manejar',
      async (falla) => {
        const entorno = await isla({ falla });
        entorno.enfocar();
        await entorno.teclear('viento');
        await entorno.enviar();
        await entorno.teclear('zzz');
        await entorno.enviar();
        entorno.ocultar();
        entorno.pagehide();
        await entorno.vaciar();
        expect(entorno.importaciones().length).toBeGreaterThan(0);
        expect(entorno.pintados()).toEqual([]);
        expect(entorno.emitidos()).toEqual([]);
        expect(entorno.marcas()).toEqual([]);
      },
      240_000,
    );

    it.each(['importacion', 'init'] as const)(
      'índice que falla en %s y se recupera: la búsqueda siguiente vuelve a pedirlo, pinta y asienta',
      async (falla) => {
        const entorno = await isla({ falla });
        entorno.enfocar();
        await entorno.teclear('viento');
        await entorno.enviar();
        const pedidasAlFallar = entorno.importaciones().length;
        expect(pedidasAlFallar).toBeGreaterThan(0);
        expect(entorno.pintados()).toEqual([]);
        // El fallo era pasajero: otro texto vuelve a pedir el índice, pinta y asienta.
        entorno.fallar();
        await entorno.teclear('lluvia');
        expect(entorno.importaciones().length).toBeGreaterThan(pedidasAlFallar);
        expect(entorno.pintados()).toHaveLength(3);
        await entorno.enviar();
        expect(entorno.emitidos()).toEqual([VIENTO]);
        // Cada reintento pide otra dirección: el navegador recuerda el fallo de un módulo por la suya,
        // y pedir la misma le devolvería el mismo rechazo sin volver a pedirlo.
        const pedidas = entorno.importaciones();
        expect(pedidas[0]).toBe('/pagefind/pagefind.js');
        expect(new Set(pedidas).size, pedidas.join(', ')).toBe(pedidas.length);
        for (const pedida of pedidas) expect(pedida).toMatch(/^\/pagefind\/pagefind\.js(\?[1-9][0-9]*)?$/);
        expect(entorno.destrucciones()).toBe(0);
      },
      240_000,
    );

    it.each(['search', 'data'] as const)(
      'índice que falla en %s: la isla destruye la instancia de Pagefind, y la búsqueda siguiente pinta y asienta',
      async (falla) => {
        const entorno = await isla();
        await entorno.teclear('viento');
        expect(entorno.destrucciones()).toBe(0);
        entorno.fallar(falla);
        await entorno.teclear('lluvia');
        // Pagefind guarda el error de su índice en su instancia: sin destruirla, lo repetiría.
        expect(entorno.destrucciones()).toBe(1);
        entorno.fallar();
        await entorno.teclear('lluvia');
        expect(entorno.pintados()).toHaveLength(3);
        await entorno.enviar();
        expect(entorno.emitidos()).toEqual([[BUSQUEDA, '1-9', NINGUNO]]);
        expect(entorno.destrucciones()).toBe(1);
        expect(entorno.importaciones()).toEqual(['/pagefind/pagefind.js']);
      },
      240_000,
    );

    it.each(['importacion', 'init', 'search', 'data'] as const)(
      'tras un fallo en %s, Enter con el mismo texto vuelve a buscar, y asienta si ya corre',
      async (falla) => {
        const entorno = await isla({ falla });
        await entorno.teclear('viento');
        await entorno.enviar();
        expect(entorno.pintados()).toEqual([]);
        expect(entorno.emitidos()).toEqual([]);
        entorno.fallar();
        await entorno.enviar();
        expect(entorno.pintados()).toHaveLength(3);
        expect(entorno.emitidos()).toEqual([VIENTO]);
      },
      240_000,
    );

    it('una búsqueda que falla no cambia el estado que se ve: se sigue asentando el anterior', async () => {
      const entorno = await isla();
      await entorno.teclear('viento');
      entorno.fallar('search');
      await entorno.teclear('zzz');
      expect(entorno.pintados()).toHaveLength(3);
      await entorno.enviar();
      expect(entorno.emitidos()).toEqual([]);
      entorno.ocultar();
      expect(entorno.emitidos()).toEqual([VIENTO]);
    }, 240_000);

    it('llegada con `?q=` sin registrar: busca al cargar y no emite hasta asentarse', async () => {
      const entorno = await isla({ busqueda: '?q=viento' });
      expect(entorno.valor()).toBe('viento');
      expect(entorno.pintados()).toHaveLength(3);
      expect(entorno.emitidos()).toEqual([]);
      expect(entorno.marcas()).toEqual([]);
      await entorno.enviar();
      expect(entorno.emitidos()).toEqual([VIENTO]);
    }, 240_000);

    it.each([
      ['marcada, al navegar', { estado: { [MARCA]: true }, navegacion: 'navigate' }],
      ['marcada con más claves, sin entrada de navegación', { estado: { [MARCA]: true, otra: 1 }, navegacion: null }],
      ['marcada, sin Navigation Timing', { estado: { [MARCA]: true }, sinNavigationTiming: true }],
      ['sin objeto de estado, al volver atrás', { estado: null, navegacion: 'back_forward' }],
      ['sin objeto de estado, al recargar', { estado: null, navegacion: 'reload' }],
    ] satisfies [string, OpcionesDeLaIsla][])('llegada registrada (%s): asentar ese estado no emite; otro, sí', async (_, opciones) => {
      const entorno = await isla({ busqueda: '?q=viento', ...opciones });
      expect(entorno.pintados()).toHaveLength(3);
      await entorno.enviar();
      entorno.pulsarResultado(0);
      entorno.ocultar();
      expect(entorno.emitidos()).toEqual([]);
      expect(entorno.marcas()).toEqual([]);
      entorno.mostrar();
      await entorno.teclear('zzz');
      await entorno.enviar();
      expect(entorno.emitidos()).toEqual([[BUSQUEDA, '0', NINGUNO], [SIN_RESULTADOS, 'zzz']]);
    }, 240_000);

    it.each([
      ['marcada', { estado: { [MARCA]: true }, navegacion: 'navigate' }],
      ['sin objeto de estado, al volver atrás', { estado: null, navegacion: 'back_forward' }],
      ['sin objeto de estado, al recargar', { estado: null, navegacion: 'reload' }],
    ] satisfies [string, OpcionesDeLaIsla][])(
      'llegada registrada sin resultados (%s): ni otra `busqueda` en el tramo 0 ni otra `busqueda-sin-resultados`',
      async (_, opciones) => {
        const entorno = await isla({ busqueda: '?q=zzz', ...opciones });
        expect(entorno.pintados()).toEqual([]);
        await entorno.enviar();
        entorno.ocultar();
        entorno.pagehide();
        expect(entorno.emitidos()).toEqual([]);
        expect(entorno.marcas()).toEqual([]);
      },
      240_000,
    );

    it('llegada con un salto de línea en `?q=`: la clave es la del texto que queda en el campo, y no cuenta dos veces', async () => {
      // Un campo de búsqueda quita los saltos de línea: Enter busca «viento», no «vien\nto».
      const registrada = await isla({ busqueda: '?q=vien%0Ato', navegacion: 'reload' });
      expect(registrada.valor()).toBe('viento');
      await registrada.enviar();
      registrada.ocultar();
      expect(registrada.emitidos()).toEqual([]);

      const nueva = await isla({ busqueda: '?q=vien%0Ato' });
      await nueva.enviar();
      nueva.ocultar();
      expect(nueva.emitidos()).toEqual([VIENTO]);
    }, 240_000);

    it.each([
      ['sin objeto de estado, al navegar', { estado: null, navegacion: 'navigate' }, {}],
      ['sin objeto de estado, prerenderizada', { estado: null, navegacion: 'prerender' }, {}],
      ['sin objeto de estado ni entrada de navegación', { estado: null, navegacion: null }, {}],
      ['sin objeto de estado ni Navigation Timing', { estado: null, sinNavigationTiming: true }, {}],
      ['con un objeto sin la marca, al recargar', { estado: { otra: 1 }, navegacion: 'reload' }, { otra: 1 }],
      ['con la marca en otra cosa que `true`, al volver atrás', { estado: { [MARCA]: 'true' }, navegacion: 'back_forward' }, {}],
    ] satisfies [string, OpcionesDeLaIsla, Record<string, unknown>][])(
      'llegada sin registrar (%s): asentar emite y marca la entrada',
      async (_, opciones, conserva) => {
        const entorno = await isla({ busqueda: '?q=viento', ...opciones });
        await entorno.enviar();
        expect(entorno.emitidos()).toEqual([VIENTO]);
        expect(plano(entorno.estadoDelHistorial())).toEqual({ ...conserva, [MARCA]: true });
      },
      240_000,
    );

    it('caché de atrás y adelante: volver, ocultarse o pulsar otro resultado no repite nada', async () => {
      const entorno = await isla();
      await entorno.teclear('viento');
      entorno.pulsarResultado(0);
      entorno.pagehide(true);
      entorno.ocultar();
      entorno.restaurar();
      entorno.ocultar();
      entorno.restaurar();
      entorno.pulsarResultado(1);
      entorno.pagehide(true);
      await entorno.enviar();
      expect(entorno.emitidos()).toEqual([VIENTO]);
      expect(entorno.marcas()).toHaveLength(1);
      // Historia 27.4 — el clic llegó dentro de la pausa: lo que se veía entró antes en el historial.
      expect(entorno.direcciones().map((d) => [d.metodo, d.direccion])).toEqual([['pushState', '/buscar/?q=viento']]);
    }, 240_000);

    it('respuesta vieja: la de A llega después de la de B, y A ni se pinta ni se asienta', async () => {
      const entorno = await isla({ manual: true });
      entorno.escribir('zzz');
      entorno.avanzar(150);
      entorno.escribir('viento');
      entorno.avanzar(150);
      await entorno.responder('viento');
      await entorno.responder('zzz');
      expect(entorno.pintados()).toHaveLength(3);
      expect(entorno.pintados().every((titulo) => titulo.includes('viento'))).toBe(true);
      entorno.ocultar();
      expect(entorno.emitidos()).toEqual([VIENTO]);

      // A, B, A: la primera A, que responde la última, tampoco cuenta; la segunda, sí.
      const otra = await isla({ manual: true });
      for (const texto of ['zzz', 'viento', 'zzz']) {
        otra.escribir(texto);
        otra.avanzar(150);
      }
      await otra.responder('viento');
      expect(otra.pintados()).toEqual([]);
      await otra.responder('zzz');
      await otra.responder('zzz');
      otra.ocultar();
      expect(otra.emitidos()).toEqual([[BUSQUEDA, '0', NINGUNO], [SIN_RESULTADOS, 'zzz']]);
    }, 240_000);

    describe('Historia 26.2 — el tipo llega por el filtro y Pagefind se configura antes de cada búsqueda', () => {
      /** Una sola fila, con los datos que se digan, para la consulta «uno». */
      const conUnDato = (dato: { url: string; meta?: Record<string, unknown>; filters?: Record<string, unknown> }) =>
        isla({ respuestas: () => ({ total: 1, datos: () => dato }) });
      const SERIF = { clases: ['titulo'], autor: undefined, nombre: null };

      it.each([
        [
          'Directorio',
          { url: '/autores/', meta: { title: 'Autores' }, filters: { tipo: ['directorio'] } },
          { tipo: 'directorio', rotulo: 'Directorio', titulo: 'Autores', clases: ['titulo', 'en-sans'], autor: undefined, nombre: 'Directorio: Autores' },
        ],
        [
          'Portada',
          { url: '/', meta: { title: MARCA_DEL_SITIO }, filters: { tipo: ['portada'] } },
          { tipo: 'portada', rotulo: 'Portada', titulo: MARCA_DEL_SITIO, clases: ['titulo', 'en-sans'], autor: undefined, nombre: `Portada: ${MARCA_DEL_SITIO}` },
        ],
        [
          'Obra con Autor',
          { url: '/obra/seneca/cartas/', meta: { title: 'Cartas', autor: ' Séneca ' }, filters: { tipo: ['obra'] } },
          // Historia 27.2 — sin «de», como la Cita.
          { tipo: 'obra', rotulo: 'Obra', titulo: 'Cartas', clases: ['titulo', 'en-sans'], autor: 'Séneca', nombre: 'Obra: Cartas, Séneca' },
        ],
        [
          'Obra sin Autor',
          { url: '/obra/seneca/cartas/', meta: { title: 'Cartas' }, filters: { tipo: ['obra'] } },
          { tipo: 'obra', rotulo: 'Obra', titulo: 'Cartas', clases: ['titulo', 'en-sans'], autor: undefined, nombre: 'Obra: Cartas' },
        ],
        // Historia 27.1 — la Cita lleva su Autor debajo, con el mismo código que la Obra.
        [
          'Cita',
          { url: '/cita/una/', meta: { title: 'Una', autor: ' Nadie ' }, filters: { tipo: ['cita'] } },
          { tipo: 'cita', rotulo: 'Cita', titulo: 'Una', clases: ['titulo'], autor: 'Nadie', nombre: 'Cita: Una, Nadie' },
        ],
        [
          'Cita sin Autor',
          { url: '/cita/una/', meta: { title: 'Una' }, filters: { tipo: ['cita'] } },
          { tipo: 'cita', rotulo: 'Cita', titulo: 'Una', ...SERIF },
        ],
        [
          'Autor, aunque traiga el metadato',
          { url: '/autor/seneca/', meta: { title: 'Séneca', autor: 'Séneca' }, filters: { tipo: ['autor'] } },
          { tipo: 'autor', rotulo: 'Autor', titulo: 'Séneca', ...SERIF },
        ],
        [
          'Tema',
          { url: '/tema/la-vida/', meta: { title: 'La vida' }, filters: { tipo: ['tema'] } },
          { tipo: 'tema', rotulo: 'Tema', titulo: 'La vida', ...SERIF },
        ],
        [
          'Colección',
          { url: '/coleccion/x/', meta: { title: 'X' }, filters: { tipo: ['coleccion'] } },
          { tipo: 'coleccion', rotulo: 'Colección', titulo: 'X', ...SERIF },
        ],
        [
          'tipo desconocido',
          { url: '/x/', meta: { title: 'X' }, filters: { tipo: ['foo'] } },
          { tipo: 'foo', rotulo: 'Cita', titulo: 'X', ...SERIF },
        ],
        [
          'sin filtros',
          { url: '/x/', meta: { title: 'X' } },
          { tipo: 'cita', rotulo: 'Cita', titulo: 'X', ...SERIF },
        ],
        [
          'filtro de tipo vacío',
          { url: '/x/', meta: { title: 'X' }, filters: { tipo: [] } },
          { tipo: 'cita', rotulo: 'Cita', titulo: 'X', ...SERIF },
        ],
        [
          'el tipo en la metadata —el medio viejo— no cuenta',
          { url: '/obra/a/b/', meta: { title: 'B', tipo: 'obra' } },
          { tipo: 'cita', rotulo: 'Cita', titulo: 'B', ...SERIF },
        ],
        [
          'Directorio sin título',
          { url: '/autores/', filters: { tipo: ['directorio'] } },
          { tipo: 'directorio', rotulo: 'Directorio', titulo: '/autores/', clases: ['titulo', 'en-sans'], autor: undefined, nombre: null },
        ],
        [
          'Portada sin título',
          { url: '/', meta: {}, filters: { tipo: ['portada'] } },
          { tipo: 'portada', rotulo: 'Portada', titulo: '/', clases: ['titulo', 'en-sans'], autor: undefined, nombre: null },
        ],
      ])('se pinta: %s', async (_, dato, esperado) => {
        const entorno = await conUnDato(dato);
        await entorno.teclear('uno');
        expect(entorno.resultados()).toEqual([esperado]);
      }, 240_000);

      it('los rótulos, el filtro, los tipos en sans y las opciones del guion salen de `tipoDeResultado.ts`', async () => {
        // Historia 27.2 — por importación: el `<script>` del componente las pide a su módulo, y el
        // empaquetado las lleva al fichero con sus valores.
        const componente = readFileSync(resolve(RAIZ, 'src/components/Busqueda.astro'), 'utf8');
        const guion = componente.slice(componente.lastIndexOf('<script>'));
        for (const nombre of [
          'ETIQUETAS_DE_RESULTADO',
          'FILTRO_DE_TIPO',
          'OPCIONES_DE_PAGEFIND',
          'ORDEN_DE_CITA',
          'TIPO_POR_OMISION',
          'TIPOS_CON_LINEA_DE_AUTOR',
          'TIPOS_CON_TITULO_EN_SANS',
        ]) {
          expect(guion, nombre).toMatch(new RegExp(`import \\{[^}]*\\b${nombre}\\b[^}]*\\} from '\\.\\./lib/tipoDeResultado\\.ts';`));
        }
        // Del fichero tal como se sirve, no del aplanado, que escapa lo que no es ASCII.
        const { codigo: construido } = await ficheroDeEntrada('busqueda');
        for (const rotulo of Object.values(ETIQUETAS_DE_RESULTADO)) expect(construido, rotulo).toContain(rotulo);
        expect(construido).toMatch(/metaWeights:\s*\{\s*autor:\s*0\s*\}/);
        expect(OPCIONES_DE_PAGEFIND).toEqual({ ranking: { metaWeights: { autor: 0 } } });
        expect(FILTRO_DE_TIPO).toBe('tipo');
        expect([...TIPOS_CON_TITULO_EN_SANS, ...TIPOS_CON_LINEA_DE_AUTOR].every((t) => construido.includes(t))).toBe(true);
      }, 240_000);

      it('toda búsqueda va precedida de `options` con las opciones de Pagefind', async () => {
        const entorno = await isla();
        await entorno.teclear('viento');
        await entorno.teclear('lluvia');
        await entorno.teclear('zzz');
        const llamadas = entorno.llamadas();
        const busquedas = llamadas.flatMap((l, i) => (l[0] === 'search' ? [i] : []));
        expect(busquedas).toHaveLength(3);
        for (const i of busquedas) expect(llamadas[i - 1]).toEqual(['options', OPCIONES_DE_PAGEFIND]);
        expect(llamadas.filter((l) => l[0] === 'init')).toHaveLength(1);
      }, 240_000);

      it.each(['search', 'data'] as const)(
        'tras un fallo en %s y su `destroy()`, la búsqueda siguiente vuelve a aplicar las opciones antes de buscar',
        async (falla) => {
          const entorno = await isla();
          entorno.fallar(falla);
          await entorno.teclear('viento');
          expect(entorno.destrucciones()).toBe(1);
          entorno.fallar();
          await entorno.teclear('lluvia');
          expect(entorno.pintados()).toHaveLength(3);
          const llamadas = entorno.llamadas();
          const destruida = llamadas.findIndex((l) => l[0] === 'destroy');
          expect(destruida).toBeGreaterThan(0);
          const despues = llamadas.slice(destruida + 1);
          expect(despues).toEqual([
            ['options', OPCIONES_DE_PAGEFIND],
            ['search', 'lluvia'],
          ]);
          expect(entorno.importaciones()).toEqual(['/pagefind/pagefind.js']);
        },
        240_000,
      );
    });

    /*
     * Historia 27.2 — la búsqueda se acota por Autor y por Tema: la matriz de la historia, una fila
     * por prueba, sobre el fichero de `dist/`. Las respuestas con filtros son las de `CON_FILTROS`.
     */
    describe('Historia 27.2 — la búsqueda se acota por Autor y por Tema', () => {
      const AUTOR = FILTROS_DE_CITA.autor;
      const TEMA = FILTROS_DE_CITA.tema;
      const ORDEN = { [ORDEN_DE_CITA]: 'asc' };
      type Entorno = Awaited<ReturnType<typeof isla>>;
      const busquedas = (entorno: Entorno) => entorno.llamadas().filter((l) => l[0] === 'search');
      const ultimaBusqueda = (entorno: Entorno) => busquedas(entorno).at(-1);
      /** Elige, deja pasar la pausa de los selectores y las promesas: la búsqueda corre y se pinta. */
      const elegirYEsperar = async (entorno: Entorno, cual: 'autor' | 'tema', valor: string) => {
        entorno.elegir(cual, valor);
        entorno.avanzar(PAUSA_DE_LOS_SELECTORES_MS);
        await entorno.vaciar();
      };
      const SUGERENCIA = 'No encontramos esa frase. Prueba con menos palabras.';

      it('al cargar: el formulario en su raíz y la sombra delante de la región; ni búsqueda ni Pagefind', async () => {
        const entorno = await isla();
        expect(entorno.insertado()).toEqual({ raiz: ['template', 'form'], recuento: ['sombra', 'estado'] });
        expect(entorno.importaciones()).toEqual([]);
        expect(entorno.llamadas()).toEqual([]);
        expect(entorno.quitarVisible()).toBe(false);
        expect(entorno.escuchas()).toMatchObject({
          campo: ['focus', 'input'],
          autor: ['change', 'input'],
          tema: ['change', 'input'],
          quitar: ['click'],
          formulario: ['submit'],
        });
      }, 240_000);

      it('solo Autor, sin texto: `search(null)` con el filtro y la clave de orden, y «222 citas de José Martí.» al llegar, sin otra espera', async () => {
        const entorno = await isla();
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        expect(busquedas(entorno)).toEqual([['search', null, { filters: { [AUTOR]: 'jose-marti' }, sort: ORDEN }]]);
        expect(entorno.region()).toEqual({ texto: '222 citas de José Martí.', apartada: false });
        expect(entorno.sombra()).toBe('222 citas de José Martí.');
        // La tanda sigue en 30, y solo Citas, con su Autor.
        expect(entorno.pintados()).toHaveLength(30);
        expect(entorno.resultados().every((r) => r.tipo === 'cita' && r.autor === 'José Martí')).toBe(true);
        expect(entorno.quitarVisible()).toBe(true);
      }, 240_000);

      it('Autor y Tema: su cruce, «8 citas de José Martí sobre la prudencia.»', async () => {
        const entorno = await isla();
        entorno.elegir('autor', 'jose-marti');
        await elegirYEsperar(entorno, 'tema', 'la-prudencia');
        expect(busquedas(entorno)).toEqual([
          ['search', null, { filters: { [AUTOR]: 'jose-marti', [TEMA]: 'la-prudencia' }, sort: ORDEN }],
        ]);
        expect(entorno.region().texto).toBe('8 citas de José Martí sobre la prudencia.');
      }, 240_000);

      it('Tema y texto: `search(texto)` con el filtro y sin orden, «6 citas sobre el saber con «escuela».»', async () => {
        const entorno = await isla();
        await entorno.teclear('escuela');
        expect(ultimaBusqueda(entorno)).toEqual(['search', 'escuela']);
        await elegirYEsperar(entorno, 'tema', 'el-saber');
        expect(ultimaBusqueda(entorno)).toEqual(['search', 'escuela', { filters: { [TEMA]: 'el-saber' } }]);
        expect(entorno.region().texto).toBe('6 citas sobre el saber con «escuela».');
        expect(entorno.pintados()).toHaveLength(6);
      }, 240_000);

      it('singular: «Una cita de José Martí con «única».», y sin filtros «Un resultado.»', async () => {
        const conFiltro = await isla();
        await elegirYEsperar(conFiltro, 'autor', 'jose-marti');
        await conFiltro.teclear(' única ');
        conFiltro.avanzar(PAUSA_DE_TECLEO_MS);
        expect(conFiltro.region().texto).toBe('Una cita de José Martí con «única».');

        const sinFiltro = await isla({ respuestas: () => ({ total: 1 }) });
        await sinFiltro.teclear('uno');
        sinFiltro.avanzar(PAUSA_DE_TECLEO_MS);
        expect(sinFiltro.region().texto).toBe('Un resultado.');
      }, 240_000);

      it('el recuento de lo tecleado, con el segundo ritmo: la sombra al momento, la región tras la pausa y solo si cambió', async () => {
        const entorno = await isla();
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        await entorno.teclear('vida');
        // La sombra ya dice la frase nueva; la región, todavía la de antes.
        expect(entorno.sombra()).toBe('222 citas de José Martí con «vida».');
        expect(entorno.region().texto).toBe('222 citas de José Martí.');
        // La pausa cuenta desde la última tecla: la búsqueda llegó 150 ms después y espera lo que falta.
        entorno.avanzar(PAUSA_DE_TECLEO_MS - 150 - 1);
        expect(entorno.region().texto).toBe('222 citas de José Martí.');
        entorno.avanzar(1);
        expect(entorno.region().texto).toBe('222 citas de José Martí con «vida».');
        // Una búsqueda que llega cuando la pausa ya se cumplió se escribe al llegar, sin otra espera.
        const lenta = await isla({ manual: true });
        lenta.escribir('vida');
        lenta.avanzar(150);
        lenta.avanzar(PAUSA_DE_TECLEO_MS);
        await lenta.responder('vida');
        expect(lenta.sombra()).toBe('3 resultados.');
        lenta.avanzar(0);
        expect(lenta.region().texto).toBe('3 resultados.');
        // Sin filtros, la de siempre, con el total y no los pintados.
        const sinFiltros = await isla();
        await sinFiltros.teclear('muchas');
        sinFiltros.avanzar(PAUSA_DE_TECLEO_MS);
        expect(sinFiltros.region().texto).toBe('12 resultados.');
      }, 240_000);

      it('solo espacios y sin filtros: ni búsqueda, ni recuento, ni salida, ni `__medir`; con un filtro, los espacios son sin texto', async () => {
        const entorno = await isla();
        await entorno.teclear('   ');
        await entorno.enviar();
        entorno.avanzar(1_000);
        entorno.ocultar();
        expect(busquedas(entorno)).toEqual([]);
        expect(entorno.region()).toEqual({ texto: '', apartada: false });
        expect(entorno.sombra()).toBe('');
        expect(entorno.salidaVisible()).toBe(false);
        expect(entorno.pintados()).toEqual([]);
        expect(entorno.emitidos()).toEqual([]);

        entorno.mostrar();
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        expect(ultimaBusqueda(entorno)).toEqual(['search', null, { filters: { [AUTOR]: 'jose-marti' }, sort: ORDEN }]);
      }, 240_000);

      it('las flechas sobre el selector: cinco cambios en menos de la pausa dan una sola búsqueda, la pausa después del último', async () => {
        const entorno = await isla();
        for (const [i, valor] of ['jose-marti', 'seneca', 'jose-marti', 'seneca', 'jose-marti'].entries()) {
          if (i > 0) entorno.avanzar(PAUSA_DE_LOS_SELECTORES_MS / 5);
          entorno.elegir('autor', valor);
        }
        await entorno.vaciar();
        entorno.avanzar(PAUSA_DE_LOS_SELECTORES_MS - 1);
        await entorno.vaciar();
        expect(busquedas(entorno)).toEqual([]);
        entorno.avanzar(1);
        await entorno.vaciar();
        expect(busquedas(entorno)).toEqual([['search', null, { filters: { [AUTOR]: 'jose-marti' }, sort: ORDEN }]]);
        expect(PAUSA_DE_LOS_SELECTORES_MS).toBe(400);
      }, 240_000);

      it('una pausa cancela la otra: la búsqueda la lanza el último gesto, una sola vez y con su ritmo', async () => {
        // Teclear y elegir antes de que se cumpla la pausa del tecleo: busca la elección, al llegar.
        const eligiendo = await isla();
        await elegirYEsperar(eligiendo, 'autor', 'jose-marti');
        eligiendo.escribir('vida');
        eligiendo.avanzar(100);
        eligiendo.elegir('autor', 'seneca');
        eligiendo.avanzar(PAUSA_DE_LOS_SELECTORES_MS);
        await eligiendo.vaciar();
        expect(busquedas(eligiendo)).toEqual([
          ['search', null, { filters: { [AUTOR]: 'jose-marti' }, sort: ORDEN }],
          ['search', 'vida', { filters: { [AUTOR]: 'seneca' } }],
        ]);
        expect(eligiendo.region().texto).toBe('4 citas de Séneca con «vida».');
        // Elegir y teclear antes de que se cumpla la de los selectores: busca lo tecleado, con su pausa.
        const tecleando = await isla();
        tecleando.elegir('autor', 'jose-marti');
        tecleando.avanzar(100);
        await tecleando.teclear('vida');
        tecleando.avanzar(PAUSA_DE_LOS_SELECTORES_MS);
        await tecleando.vaciar();
        expect(busquedas(tecleando)).toEqual([['search', 'vida', { filters: { [AUTOR]: 'jose-marti' } }]]);
        expect(tecleando.sombra()).toBe('222 citas de José Martí con «vida».');
        expect(tecleando.region().texto).toBe('');
        tecleando.avanzar(PAUSA_DE_TECLEO_MS);
        expect(tecleando.region().texto).toBe('222 citas de José Martí con «vida».');
      }, 240_000);

      it('Pagefind se pide al elegir un filtro, sin enfocar el campo ni esperar la pausa', async () => {
        const entorno = await isla();
        entorno.elegir('tema', 'el-saber');
        await entorno.vaciar();
        expect(entorno.importaciones()).toEqual(['/pagefind/pagefind.js']);
        expect(entorno.llamadas()).toEqual([['init']]);
      }, 240_000);

      it('Enter cancela las dos pausas y busca el estado de ese momento, y lo asienta', async () => {
        const entorno = await isla();
        entorno.escribir('vida');
        entorno.elegir('autor', 'jose-marti');
        await entorno.enviar();
        expect(busquedas(entorno)).toEqual([['search', 'vida', { filters: { [AUTOR]: 'jose-marti' } }]]);
        expect(entorno.emitidos()).toEqual([[BUSQUEDA, '30+', 'autor']]);
        entorno.avanzar(1_000);
        await entorno.vaciar();
        expect(busquedas(entorno)).toHaveLength(1);
      }, 240_000);

      it('«Quitar los filtros»: los dos a «Todos…», el botón fuera, el foco al campo y la búsqueda del texto sin filtros', async () => {
        const entorno = await isla();
        await entorno.teclear('vida');
        entorno.elegir('autor', 'jose-marti');
        await elegirYEsperar(entorno, 'tema', 'la-prudencia');
        expect(entorno.quitarVisible()).toBe(true);
        entorno.quitarFiltros();
        await entorno.vaciar();
        expect(entorno.elegidos()).toEqual({ autor: '', tema: '' });
        expect(entorno.quitarVisible()).toBe(false);
        expect(entorno.foco()).toBe('campo');
        expect(entorno.valor()).toBe('vida');
        expect(ultimaBusqueda(entorno)).toEqual(['search', 'vida']);
        expect(entorno.region().texto).toBe('3 resultados.');
        // Sin texto, la página queda sin búsqueda.
        const sinTexto = await isla();
        await elegirYEsperar(sinTexto, 'autor', 'jose-marti');
        sinTexto.quitarFiltros();
        await sinTexto.vaciar();
        expect(busquedas(sinTexto)).toHaveLength(1);
        expect(sinTexto.pintados()).toEqual([]);
        expect(sinTexto.region().texto).toBe('');
        expect(sinTexto.foco()).toBe('campo');
        // Y el botón vuelve a ocultarse también al poner los selectores a «Todos…» a mano.
        const aMano = await isla();
        aMano.elegir('tema', 'el-saber');
        expect(aMano.quitarVisible()).toBe(true);
        aMano.elegir('tema', '');
        expect(aMano.quitarVisible()).toBe(false);
      }, 240_000);

      it('asentar con filtros: una `busqueda` con la combinación por estado de texto y valores; el mismo estado otra vez, nada; otro Autor, otra', async () => {
        const entorno = await isla();
        entorno.elegir('autor', 'jose-marti');
        await elegirYEsperar(entorno, 'tema', 'la-prudencia');
        await entorno.enviar();
        await entorno.enviar();
        entorno.ocultar();
        entorno.mostrar();
        expect(entorno.emitidos()).toEqual([[BUSQUEDA, '1-9', 'autor-tema']]);
        // Otro Autor con la misma combinación es otro estado; a cero y sin texto, sin `busqueda-sin-resultados`.
        await elegirYEsperar(entorno, 'autor', 'seneca');
        await entorno.enviar();
        expect(entorno.emitidos()).toEqual([
          [BUSQUEDA, '1-9', 'autor-tema'],
          [BUSQUEDA, '0', 'autor-tema'],
        ]);
        expect(entorno.marcas()).toHaveLength(2);
        // Solo Tema y solo Autor, cada uno con su combinación.
        await elegirYEsperar(entorno, 'autor', '');
        await entorno.enviar();
        await elegirYEsperar(entorno, 'tema', '');
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        entorno.pulsarResultado(0);
        expect(entorno.emitidos().slice(2)).toEqual([
          [BUSQUEDA, '1-9', 'tema'],
          [BUSQUEDA, '30+', 'autor'],
        ]);
        // El fichero de medición la envía con sus claves exactas.
        const fichero = medicionEnUnSandbox({ ruta: '/buscar/' });
        for (const llamada of entorno.emitidos()) fichero.emitir(...(llamada as [string, string, string]));
        expect(fichero.balizas()[0]).toEqual({ evento: BUSQUEDA, ruta: '/buscar/', tramo: '1-9', filtros: 'autor-tema' });
      }, 240_000);

      it('filtro a cero: la salida construida, anunciada con `anunciar`; y la salida se aparta al volver a haber resultados', async () => {
        const entorno = await isla();
        entorno.elegir('autor', 'seneca');
        await elegirYEsperar(entorno, 'tema', 'la-prudencia');
        expect(entorno.salidaVisible()).toBe(true);
        expect(entorno.pintados()).toEqual([]);
        // Primer ritmo: vacía, y escribe en el fotograma siguiente.
        expect(entorno.region()).toEqual({ texto: '', apartada: true });
        expect(entorno.sombra()).toBe('');
        entorno.avanzar(16);
        expect(entorno.region()).toEqual({ texto: SUGERENCIA, apartada: true });
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        expect(entorno.salidaVisible()).toBe(false);
        expect(entorno.region()).toEqual({ texto: '8 citas de José Martí sobre la prudencia.', apartada: false });
      }, 240_000);

      it('la sugerencia a cero no pisa un recuento pintado antes de su fotograma', async () => {
        const entorno = await isla();
        await entorno.teclear('vida');
        entorno.elegir('autor', 'seneca');
        await elegirYEsperar(entorno, 'tema', 'la-prudencia');
        expect(entorno.region()).toEqual({ texto: '', apartada: true });
        // Antes del fotograma siguiente, otra búsqueda con resultados se pinta y escribe su recuento.
        entorno.quitarFiltros();
        await entorno.vaciar();
        expect(entorno.region()).toEqual({ texto: '3 resultados.', apartada: false });
        entorno.avanzar(16);
        expect(entorno.region()).toEqual({ texto: '3 resultados.', apartada: false });
        // Y quitar los filtros sin texto, que deja la página sin búsqueda, tampoco la deja llegar después.
        const sinTexto = await isla();
        sinTexto.elegir('autor', 'seneca');
        await elegirYEsperar(sinTexto, 'tema', 'la-prudencia');
        sinTexto.quitarFiltros();
        await sinTexto.vaciar();
        sinTexto.avanzar(16);
        expect(sinTexto.region().texto).toBe('');
        expect(sinTexto.salidaVisible()).toBe(false);
      }, 240_000);

      it('con texto y filtro a cero: la `busqueda` con su combinación y la `busqueda-sin-resultados` solo con el texto', async () => {
        const entorno = await isla();
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        await entorno.teclear('zzz nada');
        expect(entorno.salidaVisible()).toBe(true);
        await entorno.enviar();
        expect(entorno.emitidos()).toEqual([
          [BUSQUEDA, '0', 'autor'],
          [SIN_RESULTADOS, 'zzz nada'],
        ]);
      }, 240_000);

      it('al salir de cero tecleando, la región no dice la sugerencia durante la pausa', async () => {
        const entorno = await isla();
        await entorno.teclear('zzz');
        entorno.avanzar(16);
        expect(entorno.region().texto).toBe(SUGERENCIA);
        await entorno.teclear('viento');
        expect(entorno.region()).toEqual({ texto: '', apartada: false });
        entorno.avanzar(PAUSA_DE_TECLEO_MS);
        expect(entorno.region().texto).toBe('3 resultados.');
      }, 240_000);

      it('el índice que falla al elegir: no pinta ni asienta ni deja rechazos, y la siguiente lo pide de verdad', async () => {
        const entorno = await isla({ falla: 'importacion' });
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        await entorno.enviar();
        expect(entorno.pintados()).toEqual([]);
        expect(entorno.emitidos()).toEqual([]);
        entorno.fallar();
        await entorno.enviar();
        expect(entorno.pintados()).toHaveLength(30);
        expect(entorno.emitidos()).toEqual([[BUSQUEDA, '30+', 'autor']]);
        const pedidas = entorno.importaciones();
        expect(new Set(pedidas).size).toBe(pedidas.length);
      }, 240_000);

      it('la llegada con `?q=` busca sin filtros, como antes', async () => {
        const entorno = await isla({ busqueda: '?q=viento' });
        expect(busquedas(entorno)).toEqual([['search', 'viento']]);
        expect(entorno.elegidos()).toEqual({ autor: '', tema: '' });
      }, 240_000);

      it('llegar con `?q=` ya registrada y elegir un filtro: la llegada no vuelve a contar, el estado con filtro sí', async () => {
        const entorno = await isla({ busqueda: '?q=viento', estado: { [MARCA]: true } });
        await entorno.enviar();
        expect(entorno.emitidos()).toEqual([]);
        await elegirYEsperar(entorno, 'autor', 'seneca');
        expect(ultimaBusqueda(entorno)).toEqual(['search', 'viento', { filters: { [AUTOR]: 'seneca' } }]);
        await entorno.enviar();
        // Quitarlo vuelve al estado de la llegada, que ya contaba.
        entorno.quitarFiltros();
        await entorno.enviar();
        expect(entorno.emitidos()).toEqual([[BUSQUEDA, '1-9', 'autor']]);
      }, 240_000);

      it('Enter tras teclear: el recuento que esperaba la pausa del tecleo se escribe ya, también si la búsqueda iba en vuelo', async () => {
        const pintada = await isla();
        await pintada.teclear('vida');
        expect(pintada.sombra()).toBe('3 resultados.');
        expect(pintada.region().texto).toBe('');
        await pintada.enviar();
        expect(pintada.region().texto).toBe('3 resultados.');
        expect(busquedas(pintada)).toHaveLength(1);
        expect(pintada.emitidos()).toEqual([[BUSQUEDA, '1-9', NINGUNO]]);
        // Enter mientras la búsqueda tecleada del mismo estado no ha llegado: al llegar, sin pausa.
        const enVuelo = await isla({ manual: true });
        enVuelo.escribir('vida');
        enVuelo.avanzar(150);
        await enVuelo.enviar();
        expect(enVuelo.region().texto).toBe('');
        await enVuelo.responder('vida');
        expect(enVuelo.region().texto).toBe('3 resultados.');
        expect(busquedas(enVuelo)).toHaveLength(1);
      }, 240_000);

      it('enviar unos filtros que no llegan a verse no asienta los que se ven', async () => {
        const entorno = await isla();
        await elegirYEsperar(entorno, 'autor', 'seneca');
        expect(entorno.pintados()).toHaveLength(4);
        // Otro Autor, cuya búsqueda falla: lo que se ve sigue siendo Séneca, con el mismo texto.
        entorno.fallar('search');
        entorno.elegir('autor', 'jose-marti');
        await entorno.enviar();
        expect(entorno.emitidos()).toEqual([]);
        // Séneca no gastó su asentamiento: cuenta cuando se envía de verdad.
        entorno.fallar();
        entorno.elegir('autor', 'seneca');
        await entorno.enviar();
        expect(entorno.emitidos()).toEqual([[BUSQUEDA, '1-9', 'autor']]);
      }, 240_000);

      it('el recuento nombra lo elegido al lanzar la búsqueda, no lo que dice el selector cuando llega', async () => {
        const entorno = await isla({ manual: true });
        entorno.elegir('autor', 'jose-marti');
        entorno.avanzar(PAUSA_DE_LOS_SELECTORES_MS);
        // Otro Autor dentro de su pausa: la búsqueda de José Martí sigue siendo la última lanzada.
        entorno.elegir('autor', 'seneca');
        await entorno.responder(null);
        expect(entorno.region().texto).toBe('222 citas de José Martí.');
        expect(entorno.sombra()).toBe('222 citas de José Martí.');
      }, 240_000);
    });

    /*
     * Historia 27.3 — la búsqueda se acota también por una Obra del Autor elegido: la matriz de la
     * historia, sobre el fichero de `dist/`. El mapa de rótulos y los recuentos de `filters()` son
     * los del entorno: «Ismaelillo» tiene más Citas que «Maestros ambulantes», pero el mapa la pone
     * detrás —el orden es el del mapa, no el de los recuentos—; las dos «Cartas» son homónimas.
     */
    describe('Historia 27.3 — la búsqueda se acota también por una Obra del Autor elegido', () => {
      const AUTOR = FILTROS_DE_CITA.autor;
      const OBRA = FILTROS_DE_CITA.obra;
      const TEMA = FILTROS_DE_CITA.tema;
      const ORDEN = { [ORDEN_DE_CITA]: 'asc' };
      const MAPA = {
        'jose-marti': [
          ['jose-marti--maestros-ambulantes', 'Maestros ambulantes'],
          ['jose-marti--cartas', 'Cartas'],
          ['jose-marti--ismaelillo', 'Ismaelillo'],
        ],
        seneca: [['seneca--cartas', 'Cartas']],
      };
      const RECUENTOS = {
        'jose-marti--maestros-ambulantes': 23,
        'jose-marti--cartas': 1,
        'jose-marti--ismaelillo': 40,
        'seneca--cartas': 9,
      };
      const CON_OBRAS: OpcionesDeLaIsla = {
        mapa: MAPA,
        recuentosDeObra: RECUENTOS,
        autores: [
          { valor: 'amado-nervo', rotulo: 'Amado Nervo' },
          { valor: 'jose-marti', rotulo: 'José Martí' },
          { valor: 'seneca', rotulo: 'Séneca' },
        ],
      };
      const DE_MARTI = [
        { valor: '', rotulo: 'Todas sus obras' },
        { valor: 'jose-marti--maestros-ambulantes', rotulo: 'Maestros ambulantes (23 citas)' },
        { valor: 'jose-marti--cartas', rotulo: 'Cartas (1 cita)' },
        { valor: 'jose-marti--ismaelillo', rotulo: 'Ismaelillo (40 citas)' },
      ];
      const DE_SENECA = [
        { valor: '', rotulo: 'Todas sus obras' },
        { valor: 'seneca--cartas', rotulo: 'Cartas (9 citas)' },
      ];
      type Entorno = Awaited<ReturnType<typeof isla>>;
      const busquedas = (entorno: Entorno) => entorno.llamadas().filter((l) => l[0] === 'search');
      const ultimaBusqueda = (entorno: Entorno) => busquedas(entorno).at(-1);
      const filtrosPedidos = (entorno: Entorno) => entorno.llamadas().filter((l) => l[0] === 'filters').length;
      const conObras = (mas: OpcionesDeLaIsla = {}) => isla({ ...CON_OBRAS, ...mas });
      const elegirYEsperar = async (entorno: Entorno, cual: 'autor' | 'obra' | 'tema', valor: string) => {
        entorno.elegir(cual, valor);
        entorno.avanzar(PAUSA_DE_LOS_SELECTORES_MS);
        await entorno.vaciar();
      };
      const FUERA = { enElDom: false, orden: ['campo', 'autor', 'tema', 'quitar'] };

      it('sin Autor: ni selector de Obra en el DOM, ni mapa, ni `filters()` — al cargar, al enfocar ni con un Tema (con `?q=`, desde la 27.4, sí se piden)', async () => {
        const entorno = await conObras();
        expect(entorno.obra()).toMatchObject(FUERA);
        entorno.enfocar();
        await entorno.teclear('vida');
        await elegirYEsperar(entorno, 'tema', 'el-saber');
        expect(entorno.obra()).toMatchObject(FUERA);
        expect(entorno.pedidosDelMapa()).toEqual([]);
        expect(filtrosPedidos(entorno)).toBe(0);
        // Historia 27.4 — con estado en la dirección, también solo `?q=`, la carga pide el índice,
        // el mapa y `filters()`; sin Autor, el selector de Obra sigue fuera.
        const conConsulta = await conObras({ busqueda: '?q=viento' });
        expect(conConsulta.obra()).toMatchObject(FUERA);
        expect(conConsulta.pedidosDelMapa()).toEqual(['/buscar/obras.json']);
        expect(filtrosPedidos(conConsulta)).toBe(1);
        expect(entorno.escuchas()).toMatchObject({ autor: ['change', 'input'], obra: ['change', 'input'] });
      }, 240_000);

      it('un Autor con Obras: tras la pausa y los datos, «Obra» entre Autor y Tema, en el orden del mapa, con su recuento, sin mover el foco', async () => {
        const entorno = await conObras();
        entorno.elegir('autor', 'jose-marti');
        await entorno.vaciar();
        // Los datos ya están, la pausa no: todavía no.
        expect(entorno.pedidosDelMapa()).toEqual(['/buscar/obras.json']);
        expect(filtrosPedidos(entorno)).toBe(1);
        expect(entorno.obra().enElDom).toBe(false);
        entorno.avanzar(PAUSA_DE_LOS_SELECTORES_MS);
        await entorno.vaciar();
        expect(entorno.obra()).toEqual({
          enElDom: true,
          orden: ['campo', 'autor', 'obra', 'tema', 'quitar'],
          opciones: DE_MARTI,
          valor: '',
        });
        expect(entorno.foco()).toBe(null);
        // La búsqueda del Autor, como en la 27.2, sin Obra.
        expect(busquedas(entorno)).toEqual([['search', null, { filters: { [AUTOR]: 'jose-marti' }, sort: ORDEN }]]);
      }, 240_000);

      it('los datos que llegan tras la pausa pintan al llegar; los de un Autor ya cambiado, no', async () => {
        const tarde = await conObras({ mapaManual: true });
        await elegirYEsperar(tarde, 'autor', 'jose-marti');
        expect(tarde.obra().enElDom).toBe(false);
        await tarde.responderAlMapa();
        expect(tarde.obra()).toMatchObject({ enElDom: true, opciones: DE_MARTI });
        // Otro Autor mientras los datos van en vuelo: llegan con el Autor nuevo dentro de su pausa.
        const cambiado = await conObras({ filtrosManuales: true });
        await elegirYEsperar(cambiado, 'autor', 'jose-marti');
        cambiado.elegir('autor', 'seneca');
        await cambiado.responderAFiltros();
        expect(cambiado.obra().enElDom).toBe(false);
        cambiado.avanzar(PAUSA_DE_LOS_SELECTORES_MS);
        await cambiado.vaciar();
        expect(cambiado.obra()).toMatchObject({ enElDom: true, opciones: DE_SENECA });
      }, 240_000);

      it('un Autor sin Obras que ofrecer no tiene selector de Obra', async () => {
        const entorno = await conObras();
        await elegirYEsperar(entorno, 'autor', 'amado-nervo');
        expect(entorno.obra()).toMatchObject(FUERA);
        // Ni uno cuyas Obras cuenten cero en el índice.
        const aCero = await conObras({ recuentosDeObra: { 'seneca--cartas': 0 } });
        await elegirYEsperar(aCero, 'autor', 'seneca');
        expect(aCero.obra()).toMatchObject(FUERA);
      }, 240_000);

      it('homónimas: cada Autor ofrece solo su «Cartas»', async () => {
        const entorno = await conObras();
        await elegirYEsperar(entorno, 'autor', 'seneca');
        expect(entorno.obra().opciones).toEqual(DE_SENECA);
      }, 240_000);

      it('desfase de despliegues: la Obra que el mapa no nombra, o que `filters()` no cuenta, se omite', async () => {
        const entorno = await conObras({
          recuentosDeObra: { 'jose-marti--maestros-ambulantes': 23, 'jose-marti--ismaelillo': 40, 'jose-marti--versos-libres': 5 },
        });
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        expect(entorno.obra().opciones.map((o) => o.valor)).toEqual(['', 'jose-marti--maestros-ambulantes', 'jose-marti--ismaelillo']);
      }, 240_000);

      it('Obra elegida, sin texto: `search(null)` con Autor y Obra y la clave de orden, el título en el recuento y `autor-obra` al asentar', async () => {
        const entorno = await conObras();
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        await elegirYEsperar(entorno, 'obra', 'jose-marti--maestros-ambulantes');
        expect(ultimaBusqueda(entorno)).toEqual([
          'search',
          null,
          { filters: { [AUTOR]: 'jose-marti', [OBRA]: 'jose-marti--maestros-ambulantes' }, sort: ORDEN },
        ]);
        // El título del mapa, nunca el rótulo con su recuento; al llegar, sin otra espera.
        expect(entorno.region()).toEqual({ texto: '23 citas de José Martí en Maestros ambulantes.', apartada: false });
        expect(entorno.quitarVisible()).toBe(true);
        await entorno.enviar();
        expect(entorno.emitidos()).toEqual([[BUSQUEDA, '10-29', 'autor-obra']]);
        // Otra Obra del mismo Autor es otro estado: otra `busqueda`.
        await elegirYEsperar(entorno, 'obra', 'jose-marti--cartas');
        await entorno.enviar();
        expect(entorno.emitidos()).toEqual([
          [BUSQUEDA, '10-29', 'autor-obra'],
          [BUSQUEDA, '1-9', 'autor-obra'],
        ]);
        // Elegir Obra no recompuso el selector: sigue con sus opciones y la elegida.
        expect(entorno.obra()).toMatchObject({ enElDom: true, opciones: DE_MARTI, valor: 'jose-marti--cartas' });
      }, 240_000);

      it('Obra, Tema y texto: `search(texto)` con los tres filtros, «Una cita de José Martí en Maestros ambulantes sobre la prudencia con «…».» y `autor-obra-tema`', async () => {
        const entorno = await conObras();
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        entorno.elegir('obra', 'jose-marti--maestros-ambulantes');
        await elegirYEsperar(entorno, 'tema', 'la-prudencia');
        expect(entorno.region().texto).toBe('Una cita de José Martí en Maestros ambulantes sobre la prudencia.');
        // Elegir Tema no recompone el de Obra.
        expect(entorno.obra()).toMatchObject({ enElDom: true, opciones: DE_MARTI, valor: 'jose-marti--maestros-ambulantes' });
        await entorno.teclear('patria');
        // El recuento de cada Obra es su total en el índice: el texto no lo cambia.
        expect(entorno.obra()).toMatchObject({ enElDom: true, opciones: DE_MARTI, valor: 'jose-marti--maestros-ambulantes' });
        expect(ultimaBusqueda(entorno)).toEqual([
          'search',
          'patria',
          { filters: { [AUTOR]: 'jose-marti', [OBRA]: 'jose-marti--maestros-ambulantes', [TEMA]: 'la-prudencia' } },
        ]);
        entorno.avanzar(PAUSA_DE_TECLEO_MS);
        expect(entorno.region().texto).toBe('Una cita de José Martí en Maestros ambulantes sobre la prudencia con «patria».');
        await entorno.enviar();
        expect(entorno.emitidos()).toEqual([[BUSQUEDA, '1-9', 'autor-obra-tema']]);
        const fichero = medicionEnUnSandbox({ ruta: '/buscar/' });
        for (const llamada of entorno.emitidos()) fichero.emitir(...(llamada as [string, string, string]));
        expect(fichero.balizas()[0]).toEqual({ evento: BUSQUEDA, ruta: '/buscar/', tramo: '1-9', filtros: 'autor-obra-tema' });
      }, 240_000);

      it('cambiar el Autor quita la Obra al momento y rehace el selector con las del nuevo tras la pausa', async () => {
        const entorno = await conObras();
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        await elegirYEsperar(entorno, 'obra', 'jose-marti--maestros-ambulantes');
        entorno.elegir('autor', 'seneca');
        expect(entorno.obra()).toMatchObject({ ...FUERA, valor: '' });
        entorno.avanzar(PAUSA_DE_LOS_SELECTORES_MS);
        await entorno.vaciar();
        expect(entorno.obra()).toMatchObject({ enElDom: true, orden: ['campo', 'autor', 'obra', 'tema', 'quitar'], opciones: DE_SENECA, valor: '' });
        // La búsqueda va sin la Obra del Autor anterior; los datos no se volvieron a pedir.
        expect(ultimaBusqueda(entorno)).toEqual(['search', null, { filters: { [AUTOR]: 'seneca' }, sort: ORDEN }]);
        expect(entorno.region().texto).toBe('4 citas de Séneca.');
        expect(entorno.pedidosDelMapa()).toHaveLength(1);
        expect(filtrosPedidos(entorno)).toBe(1);
      }, 240_000);

      it('quitar el Autor —o «Quitar los filtros»— quita el selector de Obra, y la búsqueda sigue como en la 27.2', async () => {
        const entorno = await conObras();
        await entorno.teclear('vida');
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        await elegirYEsperar(entorno, 'obra', 'jose-marti--cartas');
        await elegirYEsperar(entorno, 'autor', '');
        expect(entorno.obra()).toMatchObject({ ...FUERA, valor: '' });
        expect(ultimaBusqueda(entorno)).toEqual(['search', 'vida']);
        expect(entorno.quitarVisible()).toBe(false);

        const quitando = await conObras();
        await elegirYEsperar(quitando, 'autor', 'jose-marti');
        quitando.elegir('obra', 'jose-marti--cartas');
        await elegirYEsperar(quitando, 'tema', 'el-saber');
        quitando.quitarFiltros();
        await quitando.vaciar();
        expect(quitando.obra()).toMatchObject({ ...FUERA, valor: '' });
        expect(quitando.elegidos()).toEqual({ autor: '', tema: '' });
        expect(quitando.foco()).toBe('campo');
        // Volver a elegir el Autor lo rehace, sin pedir otra vez los datos.
        await elegirYEsperar(quitando, 'autor', 'jose-marti');
        expect(quitando.obra()).toMatchObject({ enElDom: true, opciones: DE_MARTI, valor: '' });
        expect(quitando.pedidosDelMapa()).toHaveLength(1);
      }, 240_000);

      it.each([
        ['la red del mapa', { fallaElMapa: 'red' as const }],
        ['un estado que no es 2xx', { fallaElMapa: 'estado' as const }],
        ['un JSON que no se lee', { fallaElMapa: 'json' as const }],
        ['un mapa que no es un objeto', { mapa: ['no'] }],
        ['`filters()` que rechaza', { fallanLosFiltros: true }],
        ['`filters()` sin el filtro `obra`', { fallanLosFiltros: 'sin-obra' as const }],
        ['el índice que no carga', { falla: 'importacion' as const }],
      ])('fallo de %s: sin selector de Obra ni rechazos, la búsqueda por Autor sigue y el siguiente Autor lo reintenta', async (_, fallo) => {
        const entorno = await conObras(fallo);
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        expect(entorno.obra()).toMatchObject(FUERA);
        if (!('falla' in fallo)) {
          expect(entorno.pintados()).toHaveLength(30);
          expect(entorno.region().texto).toBe('222 citas de José Martí.');
        }
        // Se arregla, y el siguiente Autor elegido vuelve a pedirlo.
        entorno.fallarElMapa();
        entorno.fallarLosFiltros(false);
        entorno.fallar();
        entorno.cambiarDatosDeObra({ mapa: MAPA });
        await elegirYEsperar(entorno, 'autor', 'seneca');
        expect(entorno.obra()).toMatchObject({ enElDom: true, opciones: DE_SENECA });
        expect(entorno.region().texto).toBe('4 citas de Séneca.');
        // La mitad que llegó se guardó: el reintento pide solo la que falló.
        const fallaElMapa = 'fallaElMapa' in fallo || 'mapa' in fallo;
        const fallanLosFiltros = 'fallanLosFiltros' in fallo;
        expect(entorno.pedidosDelMapa()).toHaveLength(fallaElMapa ? 2 : 1);
        expect(filtrosPedidos(entorno)).toBe(fallanLosFiltros ? 2 : 1);
      }, 240_000);

      it('un Autor elegido con la petición en vuelo se suma a ella; si falla y sigue elegido, la repite', async () => {
        const entorno = await conObras({ mapaManual: true, fallaElMapa: 'red' });
        entorno.elegir('autor', 'jose-marti');
        await entorno.vaciar();
        entorno.elegir('autor', 'seneca');
        await entorno.vaciar();
        expect(entorno.pedidosDelMapa()).toHaveLength(1);
        // Falla la petición compartida: Séneca, que sigue elegido, la vuelve a pedir, una vez.
        await entorno.responderAlMapa();
        expect(entorno.pedidosDelMapa()).toHaveLength(2);
        entorno.fallarElMapa();
        await entorno.responderAlMapa();
        entorno.avanzar(PAUSA_DE_LOS_SELECTORES_MS);
        await entorno.vaciar();
        expect(entorno.obra()).toMatchObject({ enElDom: true, opciones: DE_SENECA });
        expect(entorno.pedidosDelMapa()).toHaveLength(2);
        // El que la empezó no la repite: un Autor solo, con un fallo, espera al siguiente.
        const solo = await conObras({ mapaManual: true, fallaElMapa: 'red' });
        solo.elegir('autor', 'jose-marti');
        await solo.responderAlMapa();
        solo.avanzar(PAUSA_DE_LOS_SELECTORES_MS);
        await solo.vaciar();
        expect(solo.pedidosDelMapa()).toHaveLength(1);
        expect(solo.obra()).toMatchObject(FUERA);
      }, 240_000);

      it('un éxito se guarda para la carga: el segundo Autor no vuelve a pedir el mapa ni `filters()`', async () => {
        const entorno = await conObras();
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        await elegirYEsperar(entorno, 'autor', 'seneca');
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        expect(entorno.pedidosDelMapa()).toHaveLength(1);
        expect(filtrosPedidos(entorno)).toBe(1);
        expect(entorno.obra().opciones).toEqual(DE_MARTI);
      }, 240_000);

      it('el recuento nombra la Obra elegida al lanzar la búsqueda', async () => {
        const entorno = await conObras({ manual: true });
        entorno.elegir('autor', 'jose-marti');
        entorno.avanzar(PAUSA_DE_LOS_SELECTORES_MS);
        await entorno.responder(null);
        entorno.elegir('obra', 'jose-marti--maestros-ambulantes');
        entorno.avanzar(PAUSA_DE_LOS_SELECTORES_MS);
        entorno.elegir('obra', 'jose-marti--cartas');
        await entorno.responder(null);
        expect(entorno.region().texto).toBe('23 citas de José Martí en Maestros ambulantes.');
      }, 240_000);
    });

    /*
     * Historia 27.4 — la búsqueda vive en la dirección, y «atrás» la devuelve: la matriz de la
     * historia, sobre el fichero de `dist/`, con el historial con entradas del entorno simulado.
     * Las respuestas son las de `RESPUESTAS` y `CON_FILTROS`.
     */
    describe('Historia 27.4 — la búsqueda vive en la dirección, y «atrás» la devuelve', () => {
      const MAPA = {
        'jose-marti': [
          ['jose-marti--maestros-ambulantes', 'Maestros ambulantes'],
          ['jose-marti--cartas', 'Cartas'],
        ],
        seneca: [['seneca--cartas', 'Cartas']],
      };
      const RECUENTOS = { 'jose-marti--maestros-ambulantes': 23, 'jose-marti--cartas': 1, 'seneca--cartas': 9 };
      const MAESTROS = 'jose-marti--maestros-ambulantes';
      const CON_OBRAS: OpcionesDeLaIsla = { mapa: MAPA, recuentosDeObra: RECUENTOS };
      const UNO = 'Uno de los filtros de esta dirección no se puede usar, y la búsqueda va sin él.';
      const DOS = 'Dos de los filtros de esta dirección no se pueden usar, y la búsqueda va sin ellos.';
      const TRES = 'Tres de los filtros de esta dirección no se pueden usar, y la búsqueda va sin ellos.';
      type Entorno = Awaited<ReturnType<typeof isla>>;
      const escritas = (entorno: Entorno) => entorno.direcciones().map((d) => [d.metodo, d.direccion]);
      const busquedas = (entorno: Entorno) => entorno.llamadas().filter((l) => l[0] === 'search');
      const elegirYEsperar = async (entorno: Entorno, cual: 'autor' | 'obra' | 'tema', valor: string) => {
        entorno.elegir(cual, valor);
        entorno.avanzar(PAUSA_DE_LOS_SELECTORES_MS);
        await entorno.vaciar();
      };
      /** Teclea, deja pasar la pausa de la dirección (contada desde la tecla) y las promesas. */
      const teclearYEsperar = async (entorno: Entorno, texto: string) => {
        entorno.escribir(texto);
        entorno.avanzar(150);
        await entorno.vaciar();
        entorno.avanzar(PAUSA_DE_TECLEO_MS - 150);
        await entorno.vaciar();
      };

      it('teclear: nada hasta la pausa tras la última tecla; entonces `pushState` con `?q=`, y seguir tecleando reemplaza', async () => {
        const entorno = await isla();
        for (const texto of ['v', 'vi', 'vie']) {
          entorno.escribir(texto);
          entorno.avanzar(100);
          await entorno.vaciar();
        }
        entorno.avanzar(PAUSA_DE_TECLEO_MS - 100 - 1);
        await entorno.vaciar();
        expect(entorno.historial()).toEqual([]);
        entorno.avanzar(1);
        expect(escritas(entorno)).toEqual([['pushState', '/buscar/?q=vie']]);
        expect(plano(entorno.estadoDelHistorial())).toEqual({ [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: { q: 'vie' } });
        await teclearYEsperar(entorno, 'viento');
        expect(escritas(entorno)).toEqual([
          ['pushState', '/buscar/?q=vie'],
          ['replaceState', '/buscar/?q=viento'],
        ]);
        expect(entorno.longitud()).toBe(2);
        expect(entorno.direccion()).toBe('/buscar/?q=viento');
        // Lo tecleado se recorta; solo espacios es sin `q`.
        await teclearYEsperar(entorno, '  viento  ');
        expect(entorno.direcciones()).toHaveLength(2);
        await teclearYEsperar(entorno, '   ');
        expect(escritas(entorno).at(-1)).toEqual(['replaceState', '/buscar/']);
        expect(entorno.emitidos()).toEqual([]);
        expect(entorno.marcas()).toEqual([]);
      }, 240_000);

      it('selectores: cada uno escribe al cumplirse su pausa; otro control abre entrada, el mismo la reemplaza', async () => {
        const entorno = await isla();
        // Las flechas sobre Autor: una sola escritura, al cumplirse la pausa del último cambio.
        entorno.elegir('autor', 'jose-marti');
        entorno.avanzar(100);
        entorno.elegir('autor', 'seneca');
        entorno.avanzar(100);
        entorno.elegir('autor', 'jose-marti');
        entorno.avanzar(PAUSA_DE_LOS_SELECTORES_MS - 1);
        await entorno.vaciar();
        expect(entorno.historial()).toEqual([]);
        entorno.avanzar(1);
        await entorno.vaciar();
        expect(escritas(entorno)).toEqual([['pushState', '/buscar/?autor=jose-marti']]);
        await elegirYEsperar(entorno, 'autor', 'seneca');
        expect(escritas(entorno).at(-1)).toEqual(['replaceState', '/buscar/?autor=seneca']);
        await elegirYEsperar(entorno, 'tema', 'la-prudencia');
        expect(escritas(entorno).at(-1)).toEqual(['pushState', '/buscar/?autor=seneca&tema=la-prudencia']);
        // Un estado igual al de la dirección no se escribe.
        entorno.elegir('tema', 'el-saber');
        entorno.elegir('tema', 'la-prudencia');
        entorno.avanzar(PAUSA_DE_LOS_SELECTORES_MS);
        await entorno.vaciar();
        expect(entorno.direcciones()).toHaveLength(3);
        expect(entorno.longitud()).toBe(3);
        // «Quitar los filtros» es control propio, y escribe al momento.
        await teclearYEsperar(entorno, 'vida');
        expect(escritas(entorno).at(-1)).toEqual(['pushState', '/buscar/?q=vida&autor=seneca&tema=la-prudencia']);
        entorno.quitarFiltros();
        expect(escritas(entorno).at(-1)).toEqual(['pushState', '/buscar/?q=vida']);
        expect(entorno.longitud()).toBe(5);
      }, 240_000);

      it('una pausa cancela la escritura pendiente de la otra: teclear y elegir antes de la pausa escriben una vez', async () => {
        const entorno = await isla();
        entorno.escribir('vida');
        entorno.avanzar(300);
        entorno.elegir('autor', 'jose-marti');
        entorno.avanzar(PAUSA_DE_TECLEO_MS);
        await entorno.vaciar();
        expect(escritas(entorno)).toEqual([['pushState', '/buscar/?q=vida&autor=jose-marti']]);
        entorno.elegir('tema', 'el-saber');
        entorno.avanzar(100);
        entorno.escribir('vidas');
        entorno.avanzar(PAUSA_DE_TECLEO_MS);
        await entorno.vaciar();
        expect(escritas(entorno)).toEqual([
          ['pushState', '/buscar/?q=vida&autor=jose-marti'],
          ['pushState', '/buscar/?q=vidas&autor=jose-marti&tema=el-saber'],
        ]);
      }, 240_000);

      it('Enter tras teclear: reemplaza la entrada del campo (o nada, si es igual) y la marca; seguir tecleando abre otra, y «atrás» vuelve a lo enviado', async () => {
        const entorno = await isla();
        await teclearYEsperar(entorno, 'vie');
        entorno.escribir('viento');
        await entorno.enviar();
        expect(escritas(entorno)).toEqual([
          ['pushState', '/buscar/?q=vie'],
          ['replaceState', '/buscar/?q=viento'],
        ]);
        expect(plano(entorno.marcas())).toEqual([[{ [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: { q: 'viento' }, [MARCA]: true }, '']]);
        expect(entorno.emitidos()).toEqual([VIENTO]);
        // Enter otra vez: igual a la dirección, nada.
        await entorno.enviar();
        expect(entorno.historial()).toHaveLength(3);
        // Un estado asentado no se reescribe: lo siguiente abre entrada.
        await teclearYEsperar(entorno, 'viento fav');
        expect(escritas(entorno).at(-1)).toEqual(['pushState', '/buscar/?q=viento+fav']);
        expect(entorno.longitud()).toBe(3);
        await entorno.atras();
        expect(entorno.direccion()).toBe('/buscar/?q=viento');
        expect(entorno.valor()).toBe('viento');
        expect(entorno.pintados()[0]).toContain('viento');
        expect(entorno.region().texto).toBe('3 resultados.');
        // `popstate` no escribe, y lo ya emitido no se emite otra vez.
        expect(entorno.historial()).toHaveLength(4);
        await entorno.enviar();
        entorno.ocultar();
        expect(entorno.emitidos()).toEqual([VIENTO]);
        // Y teclear tras «atrás» abre entrada: la de `popstate` no tiene control.
        entorno.mostrar();
        await teclearYEsperar(entorno, 'vientos');
        expect(escritas(entorno).at(-1)).toEqual(['pushState', '/buscar/?q=vientos']);
        expect(entorno.longitud()).toBe(3);
      }, 240_000);

      it('clic en un resultado dentro de la pausa: primero se escribe lo que se ve, después la marca, y la escritura pendiente no vuelve', async () => {
        const entorno = await isla();
        await entorno.teclear('viento');
        expect(entorno.historial()).toEqual([]);
        entorno.pulsarResultado(0);
        expect(entorno.historial().map((l) => l[0])).toEqual(['pushState', 'replaceState']);
        expect(escritas(entorno)).toEqual([['pushState', '/buscar/?q=viento']]);
        expect(plano(entorno.estadoDelHistorial())).toEqual({ [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: { q: 'viento' }, [MARCA]: true });
        entorno.avanzar(PAUSA_DE_TECLEO_MS * 2);
        await entorno.vaciar();
        expect(entorno.historial()).toHaveLength(2);
        expect(entorno.emitidos()).toEqual([VIENTO]);
      }, 240_000);

      it('ocultarse con una búsqueda nueva aún sin pintar: se escribe y marca lo que se ve, y lo tecleado después abre su entrada', async () => {
        const entorno = await isla({ manual: true });
        entorno.escribir('viento');
        entorno.avanzar(150);
        await entorno.responder('viento');
        entorno.escribir('vientos');
        entorno.avanzar(150);
        await entorno.vaciar();
        entorno.ocultar();
        expect(escritas(entorno)).toEqual([['pushState', '/buscar/?q=viento']]);
        expect(entorno.marcas()).toHaveLength(1);
        await entorno.responder('vientos');
        entorno.avanzar(PAUSA_DE_TECLEO_MS);
        expect(escritas(entorno)).toEqual([
          ['pushState', '/buscar/?q=viento'],
          ['pushState', '/buscar/?q=vientos'],
        ]);
      }, 240_000);

      it('el historial que lanza: la búsqueda y la emisión siguen, la dirección se queda, y la escritura siguiente lo reintenta', async () => {
        const entorno = await isla({ historialQueLanza: { pushState: 1, replaceState: 1 } });
        await teclearYEsperar(entorno, 'viento');
        expect(entorno.pintados()).toHaveLength(3);
        expect(entorno.direccion()).toBe('/buscar/');
        expect(entorno.longitud()).toBe(1);
        // El `pushState` fallido no abrió entrada: Enter la abre ahora; la marca lanza una vez.
        await entorno.enviar();
        expect(entorno.emitidos()).toEqual([VIENTO]);
        expect(escritas(entorno)).toEqual([
          ['pushState', '/buscar/?q=viento'],
          ['pushState', '/buscar/?q=viento'],
        ]);
        expect(entorno.direccion()).toBe('/buscar/?q=viento');
        expect(entorno.longitud()).toBe(2);
        // Siempre que lanza.
        const siempre = await isla({ historialQueLanza: true });
        await teclearYEsperar(siempre, 'viento');
        await elegirYEsperar(siempre, 'autor', 'jose-marti');
        siempre.pulsarResultado(0);
        expect(siempre.emitidos()).toEqual([[BUSQUEDA, '30+', 'autor']]);
        expect(siempre.direccion()).toBe('/buscar/');
        expect(siempre.longitud()).toBe(1);
      }, 240_000);

      it('`popstate`: atrás repinta campo, selectores, «Quitar», recuento y resultados sin escribir; no emite lo emitido; adelante, igual', async () => {
        const entorno = await isla();
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        await entorno.enviar();
        await elegirYEsperar(entorno, 'tema', 'la-prudencia');
        expect(entorno.region().texto).toBe('8 citas de José Martí sobre la prudencia.');
        const escrituras = entorno.historial().length;
        await entorno.atras();
        expect(entorno.direccion()).toBe('/buscar/?autor=jose-marti');
        expect(entorno.elegidos()).toEqual({ autor: 'jose-marti', tema: '' });
        expect(entorno.quitarVisible()).toBe(true);
        expect(entorno.region().texto).toBe('222 citas de José Martí.');
        expect(entorno.pintados()).toHaveLength(30);
        expect(entorno.historial()).toHaveLength(escrituras);
        await entorno.enviar();
        expect(entorno.emitidos()).toEqual([[BUSQUEDA, '30+', 'autor']]);
        await entorno.adelante();
        expect(entorno.elegidos()).toEqual({ autor: 'jose-marti', tema: 'la-prudencia' });
        expect(entorno.region().texto).toBe('8 citas de José Martí sobre la prudencia.');
        await entorno.enviar();
        expect(entorno.emitidos()).toEqual([
          [BUSQUEDA, '30+', 'autor'],
          [BUSQUEDA, '1-9', 'autor-tema'],
        ]);
        // A la llegada, `/buscar/` a secas y sin objeto: vacía campo, selectores, recuento y lista.
        await entorno.atras();
        await entorno.atras();
        expect(entorno.direccion()).toBe('/buscar/');
        expect(entorno.elegidos()).toEqual({ autor: '', tema: '' });
        expect(entorno.valor()).toBe('');
        expect(entorno.pintados()).toEqual([]);
        expect(entorno.region().texto).toBe('');
        expect(entorno.quitarVisible()).toBe(false);
        expect(entorno.historial()).toHaveLength(escrituras + 1);
      }, 240_000);

      it('`popstate` juzga lo registrado solo por la marca de la entrada: Navigation Timing describe la carga', async () => {
        const entorno = await isla({ busqueda: '?q=viento', navegacion: 'back_forward' });
        expect(entorno.consultasDeNavegacion()).toBe(1);
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        await entorno.atras();
        await elegirYEsperar(entorno, 'tema', 'el-saber');
        await entorno.atras();
        expect(entorno.consultasDeNavegacion()).toBe(1);
        // La entrada de la llegada se registró por Navigation Timing al cargar: tampoco ahora emite.
        await entorno.enviar();
        expect(entorno.emitidos()).toEqual([]);
      }, 240_000);

      it('`popstate` a una entrada marcada de otra carga: no emite; sin la marca, sí', async () => {
        const marcada = await isla({
          busqueda: '?q=lluvia',
          estado: { [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: { q: 'lluvia' } },
        });
        await teclearYEsperar(marcada, 'viento');
        await marcada.atras();
        expect(marcada.valor()).toBe('lluvia');
        await marcada.enviar();
        expect(marcada.emitidos()).toEqual([VIENTO]);
        // El objeto de la entrada manda sobre la dirección.
        const conObjeto = await isla({ estado: { [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: { q: 'viento' }, [MARCA]: true } });
        await teclearYEsperar(conObjeto, 'lluvia');
        await conObjeto.atras();
        expect(conObjeto.valor()).toBe('viento');
        await conObjeto.enviar();
        expect(conObjeto.emitidos()).toEqual([]);
      }, 240_000);

      it('llegada con `?q=&autor=`: pide el índice, `filters()` y el mapa, elige el Autor, enseña «Quitar» y dice lo filtrado, sin escribir', async () => {
        const entorno = await isla({ ...CON_OBRAS, busqueda: '?q=vida&autor=jose-marti' });
        expect(entorno.importaciones()).toEqual(['/pagefind/pagefind.js']);
        expect(entorno.pedidosDelMapa()).toEqual(['/buscar/obras.json']);
        expect(entorno.llamadas().filter((l) => l[0] === 'filters')).toHaveLength(1);
        expect(entorno.valor()).toBe('vida');
        expect(entorno.elegidos()).toEqual({ autor: 'jose-marti', tema: '' });
        expect(entorno.quitarVisible()).toBe(true);
        expect(entorno.region().texto).toBe('222 citas de José Martí con «vida».');
        // Sin Obra la búsqueda no espera a los datos, y el selector de Obra aparece al llegar.
        expect(entorno.obra().enElDom).toBe(true);
        expect(entorno.historial()).toEqual([]);
        expect(entorno.emitidos()).toEqual([]);
      }, 240_000);

      it('`/buscar/` sin nada: ni índice, ni `filters()`, ni mapa, ni escritura', async () => {
        for (const busqueda of ['', '?q=', '?q=%20%20', '?de=instagram&via=x', '?otra=1']) {
          const entorno = await isla({ ...CON_OBRAS, busqueda });
          expect(entorno.importaciones(), busqueda).toEqual([]);
          expect(entorno.pedidosDelMapa(), busqueda).toEqual([]);
          expect(entorno.llamadas(), busqueda).toEqual([]);
          expect(entorno.historial(), busqueda).toEqual([]);
        }
      }, 240_000);

      it('`obra` sin `autor`: tras el mapa, Autor y Obra elegidos, y la dirección reemplazada con los dos', async () => {
        const entorno = await isla({ ...CON_OBRAS, busqueda: `?obra=${MAESTROS}` });
        expect(entorno.analizado().historial).toEqual([]);
        expect(entorno.elegidos()).toEqual({ autor: 'jose-marti', tema: '' });
        expect(entorno.obra().valor).toBe(MAESTROS);
        expect(escritas(entorno)).toEqual([['replaceState', `/buscar/?autor=jose-marti&obra=${MAESTROS}`]]);
        expect(entorno.longitud()).toBe(1);
        expect(entorno.region().texto).toBe('23 citas de José Martí en Maestros ambulantes.');
        expect(busquedas(entorno).at(-1)).toEqual([
          'search',
          null,
          { filters: { [FILTROS_DE_CITA.autor]: 'jose-marti', [FILTROS_DE_CITA.obra]: MAESTROS }, sort: { [ORDEN_DE_CITA]: 'asc' } },
        ]);
      }, 240_000);

      it('`obra` de otro Autor: busca con el Autor, dice «Uno…» delante del recuento y quita la Obra de la dirección', async () => {
        const entorno = await isla({ ...CON_OBRAS, busqueda: `?autor=seneca&obra=${MAESTROS}` });
        expect(entorno.elegidos()).toEqual({ autor: 'seneca', tema: '' });
        expect(entorno.obra().valor).toBe('');
        expect(entorno.region().texto).toBe(`${UNO} 4 citas de Séneca.`);
        expect(entorno.sombra()).toBe(`${UNO} 4 citas de Séneca.`);
        expect(escritas(entorno)).toEqual([['replaceState', '/buscar/?autor=seneca']]);
        // La búsqueda siguiente ya no lleva aviso.
        await teclearYEsperar(entorno, 'vida');
        expect(entorno.region().texto).toBe('4 citas de Séneca con «vida».');
      }, 240_000);

      it('Autor que no existe y Obra que sí: la Obra con su Autor, y «Uno…»', async () => {
        const entorno = await isla({ ...CON_OBRAS, busqueda: `?autor=nadie&obra=${MAESTROS}` });
        expect(entorno.elegidos()).toEqual({ autor: 'jose-marti', tema: '' });
        expect(entorno.obra().valor).toBe(MAESTROS);
        expect(entorno.region().texto).toBe(`${UNO} 23 citas de José Martí en Maestros ambulantes.`);
        expect(escritas(entorno)).toEqual([['replaceState', `/buscar/?autor=jose-marti&obra=${MAESTROS}`]]);
      }, 240_000);

      it('dos o tres filtros que no existen, con texto: «Dos…» y «Tres…» delante del recuento, y solo `?q=` en la dirección', async () => {
        const dos = await isla({ ...CON_OBRAS, busqueda: '?q=vida&autor=x&tema=y' });
        expect(dos.region().texto).toBe(`${DOS} 3 resultados.`);
        expect(escritas(dos)).toEqual([['replaceState', '/buscar/?q=vida']]);
        const tres = await isla({ ...CON_OBRAS, busqueda: '?q=vida&autor=x&obra=nada--nada&tema=y' });
        expect(tres.region().texto).toBe(`${TRES} 3 resultados.`);
        expect(escritas(tres)).toEqual([['replaceState', '/buscar/?q=vida']]);
        // Un aviso a cero va delante de la sugerencia, y la región no se aparta: el aviso no lo dice nadie más.
        const aCero = await isla({ ...CON_OBRAS, busqueda: '?q=zzz&tema=y' });
        aCero.avanzar(16);
        expect(aCero.region()).toEqual({ texto: `${UNO} No encontramos esa frase. Prueba con menos palabras.`, apartada: false });
        expect(aCero.salidaVisible()).toBe(true);
      }, 240_000);

      it('nada con que buscar: «El filtro… ya no existe.» o «Los filtros… ya no existen.», sin recuento, salida ni búsqueda', async () => {
        for (const [busqueda, frase] of [
          ['?autor=x', 'El filtro de esta dirección ya no existe.'],
          ['?autor=x&tema=y', 'Los filtros de esta dirección ya no existen.'],
          ['?obra=nada--nada', 'El filtro de esta dirección ya no existe.'],
        ] as const) {
          const entorno = await isla({ ...CON_OBRAS, busqueda });
          // Al evaluarse no hay escritura: el reemplazo llega tras la microtarea.
          expect(entorno.analizado(), busqueda).toEqual({ emitidos: [], historial: [], violaciones: [] });
          expect(entorno.region(), busqueda).toEqual({ texto: frase, apartada: false });
          expect(entorno.sombra(), busqueda).toBe(frase);
          expect(entorno.salidaVisible(), busqueda).toBe(false);
          expect(entorno.pintados(), busqueda).toEqual([]);
          expect(busquedas(entorno), busqueda).toEqual([]);
          expect(escritas(entorno), busqueda).toEqual([['replaceState', '/buscar/']]);
          expect(entorno.longitud(), busqueda).toBe(1);
          entorno.ocultar();
          expect(entorno.emitidos(), busqueda).toEqual([]);
        }
      }, 240_000);

      it.each([
        ['el mapa', { fallaElMapa: 'estado' }],
        ['`filters()`', { fallanLosFiltros: true }],
      ] satisfies [string, OpcionesDeLaIsla][])(
        'con Obra en la dirección y %s sin llegar: ni búsqueda, ni frase, ni escritura, ni nada asentable; el gesto siguiente busca',
        async (_, falla) => {
          const entorno = await isla({ ...CON_OBRAS, ...falla, busqueda: `?q=vida&autor=jose-marti&obra=${MAESTROS}&tema=y` });
          expect(busquedas(entorno)).toEqual([]);
          expect(entorno.region().texto).toBe('');
          expect(entorno.historial()).toEqual([]);
          expect(entorno.valor()).toBe('vida');
          expect(entorno.elegidos()).toEqual({ autor: 'jose-marti', tema: '' });
          expect(entorno.obra().enElDom).toBe(false);
          entorno.ocultar();
          expect(entorno.emitidos()).toEqual([]);
          entorno.mostrar();
          await entorno.enviar();
          expect(entorno.region().texto).toBe('222 citas de José Martí con «vida».');
          expect(entorno.emitidos()).toEqual([[BUSQUEDA, '30+', 'autor']]);
        },
        240_000,
      );

      it.each([
        ['marcada', { estado: { [MARCA]: true } }],
        ['sin objeto, al recargar', { navegacion: 'reload' }],
        ['sin objeto, al volver atrás', { navegacion: 'back_forward' }],
      ] satisfies [string, OpcionesDeLaIsla][])('llegada registrada con filtros (%s): repinta y no asienta otra `busqueda`', async (_, opciones) => {
        const entorno = await isla({ ...CON_OBRAS, ...opciones, busqueda: '?q=viento&autor=jose-marti' });
        expect(entorno.elegidos()).toEqual({ autor: 'jose-marti', tema: '' });
        await entorno.enviar();
        entorno.pulsarResultado(0);
        entorno.ocultar();
        expect(entorno.emitidos()).toEqual([]);
        // Un reemplazo de la resolución conserva la marca: recargar esa entrada sigue contando como registrada.
        const resuelta = await isla({ ...CON_OBRAS, ...opciones, busqueda: '?q=viento&tema=y' });
        await resuelta.enviar();
        resuelta.ocultar();
        expect(resuelta.emitidos()).toEqual([]);
        if ('estado' in opciones) expect(plano(resuelta.estadoDelHistorial())).toEqual({ [MARCA]: true, [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: { q: 'viento' } });
      }, 240_000);

      it('caché de atrás y adelante con filtros: restaurar no reemite, otro resultado tampoco', async () => {
        const entorno = await isla();
        await elegirYEsperar(entorno, 'autor', 'jose-marti');
        entorno.pulsarResultado(0);
        entorno.pagehide(true);
        entorno.ocultar();
        entorno.restaurar();
        entorno.pulsarResultado(1);
        expect(entorno.emitidos()).toEqual([[BUSQUEDA, '30+', 'autor']]);
        expect(escritas(entorno)).toEqual([['pushState', '/buscar/?autor=jose-marti']]);
        expect(entorno.elegidos()).toEqual({ autor: 'jose-marti', tema: '' });
      }, 240_000);

      it('lo hostil de la dirección vuelve como texto: campo y recuento', async () => {
        const hostil = '<img src=x onerror=alert(1)>';
        const entorno = await isla({ busqueda: `?q=${encodeURIComponent(hostil)}&autor=jose-marti` });
        expect(entorno.valor()).toBe(hostil);
        expect(entorno.region().texto).toBe(`222 citas de José Martí con «${hostil}».`);
      }, 240_000);

      it('retitulada: el mismo `?obra=` con otro título en el mapa nombra el nuevo en la opción y en el recuento', async () => {
        const entorno = await isla({
          ...CON_OBRAS,
          mapa: { ...MAPA, 'jose-marti': [[MAESTROS, 'Los maestros ambulantes'], ...MAPA['jose-marti'].slice(1)] },
          busqueda: `?autor=jose-marti&obra=${MAESTROS}`,
        });
        expect(entorno.obra().opciones[1]).toEqual({ valor: MAESTROS, rotulo: 'Los maestros ambulantes (23 citas)' });
        expect(entorno.region().texto).toBe('23 citas de José Martí en Los maestros ambulantes.');
        expect(entorno.historial()).toEqual([]);
      }, 240_000);

      it('lo que la dirección trae de más no vuelve: la escritura se compone desde el estado', async () => {
        const entorno = await isla({ busqueda: '?q=vida&otra=1&de=instagram#ancla' });
        await elegirYEsperar(entorno, 'tema', 'el-saber');
        expect(escritas(entorno)).toEqual([['pushState', '/buscar/?q=vida&tema=el-saber']]);
      }, 240_000);
    });
  });
});
