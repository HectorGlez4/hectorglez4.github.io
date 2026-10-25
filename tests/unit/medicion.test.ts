import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { Script, runInNewContext } from 'node:vm';
import ts from 'typescript';
import { parseSync } from 'vite';
import {
  ARRANQUE_DE_MEDICION,
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
  SIN_MARCAS_DE_LLEGADA,
  esEventoValido,
  guionDeMedicion,
  puntoFinal,
  rutaDelGuionDeMedicion,
  versionDelGuion,
  type ExencionDeZona,
} from '../../src/lib/medicion.ts';
import { anunciar, guionQueAnuncia } from '../../src/lib/anuncio.ts';
import { GUIONES_EXTERNOS, guionExternoDe } from '../../src/lib/guiones.ts';
import {
  CITAS_POR_PAGINA,
  MAX_BYTES_DE_GUION,
  MAX_BYTES_GUION_DE_MEDICION,
  MAX_CARACTERES_IMAGEN,
  MIN_MS_VISIBLES_PARA_LA_LECTURA,
} from '../../src/lib/umbrales.ts';
import {
  DESTINOS_DE_DESCARGA,
  METRICA_DE_ACCION,
  PARAMETRO_DE_DIFUSION,
  ZONAS,
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
  superficieDeclaradaDe,
  superficiesDelBarrido,
} from '../../src/lib/superficies.ts';
import { ORIGEN_DEL_SANDBOX, medicionEnUnSandbox } from './ayuda/medicion.js';
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
    // producir: los de la v8 esperan a sus historias (23.6 a 23.9) y se descartan igual. Desde
    // la 23.5, `__medir` descarta además los que solo emite el fichero: la lectura.
    const { emitir, balizas } = medicionEnUnSandbox();
    const aPeticion = EVENTOS_DEL_GUION.filter((evento) => !EVENTOS_SOLO_DEL_FICHERO.includes(evento));

    for (const evento of EVENTOS_VALIDOS) emitir(evento);
    expect(balizas().map((b) => b.evento)).toEqual(aPeticion);
    expect(EVENTOS_DEL_GUION.length).toBeLessThan(EVENTOS_VALIDOS.length);
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
    expect([...EVENTOS_DE_VISTA]).toEqual([EVENTOS.vistaDeCita, EVENTOS.vistaDeSuperficie]);
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

  it('`target="_self"` sí es salida: se abre en la misma pestaña', () => {
    const { pulsar, balizas } = enCita();
    pulsar({ ...enZona('cabecera', '/'), target: '_self' });
    expect(salidas(balizas())).toEqual([{ evento: EVENTOS.salidaInterna, ruta: RUTA, zona: 'cabecera' }]);
  });

  it.each([
    ['sin ningún contenedor', { href: OTRA }],
    ['con una exención', { href: OTRA, contenedores: [{ sinZona: 'chips-del-404' }] }],
    ['con una exención dentro de una zona', { href: OTRA, contenedores: [{ sinZona: 'salidas-sin-resultados' }, { zona: 'listado' }] }],
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
    const recorrer = (nodo: ts.Node): void => {
      if (ts.isStringLiteral(nodo) || ts.isNoSubstitutionTemplateLiteral(nodo)) literales.push(nodo.text);
      ts.forEachChild(nodo, recorrer);
    };
    recorrer(fuente);
    expect(literales.length).toBeGreaterThan(20);
    // Como palabra entera: `salidas-sin-resultados`, una exención, no escribe la zona `resultado`.
    const escribe = (literal: string, zona: string) => new RegExp(`(^|[^a-z-])${zona}([^a-z-]|$)`).test(literal);
    expect(literales.filter((l) => ZONAS.some((zona) => escribe(l, zona)))).toEqual([]);
    // Y el detector ve una zona escrita, entre comillas o dentro de otro texto.
    expect(escribe('cabecera', 'cabecera')).toBe(true);
    expect(escribe('[data-zona="listado"]', 'listado')).toBe(true);
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
    expect(GUIONES_EXTERNOS.map((g) => g.id).sort()).toEqual(['imagen', 'medicion', 'pagefind']);
    for (const guion of GUIONES_EXTERNOS) {
      expect(Number.isInteger(guion.tope) && guion.tope > 0, `${guion.id}: ${guion.tope}`).toBe(true);
      expect(guion.reconoce.global, guion.id).toBe(false);
    }
  });

  it('reconoce lo que la lista nombra, del mismo origen, y nada más', () => {
    expect(guionExternoDe('/medicion/0a1b2c3d.js')?.id).toBe('medicion');
    expect(guionExternoDe('/islas/imagen.js')?.id).toBe('imagen');
    expect(guionExternoDe('/islas/imagen.js?2')?.id).toBe('imagen');
    expect(guionExternoDe('/pagefind/pagefind.js')?.id).toBe('pagefind');
    for (const ajeno of [
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

  it('la Obra indexable declara la vista de superficie; la que no se indexa y su página 2, ninguna', async () => {
    expect(vistasDe(await leerMedida(OBRAS[0]))).toBe(EVENTOS.vistaDeSuperficie);
    expect(vistasDe(await leerMedida(OBRAS[1]))).toBeUndefined();
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
    // El vocabulario es el único sitio donde se escriben, desde la Historia 23.2.
    const suelta = /["'`]vista-de-(cita|superficie)["'`]/;
    for (const fuente of fuentesDeSrc().filter((f) => !f.endsWith('lib/vocabulario.ts'))) {
      expect(readFileSync(fuente, 'utf8'), fuente).not.toMatch(suelta);
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

  it('ni fichero ni etiqueta; quedan el arranque y el `data-vistas`', async () => {
    const proyecto = await sitioSinMedir();
    expect(existsSync(join(proyecto, 'dist', 'medicion'))).toBe(false);
    for (const [ruta, html] of paginasDe(proyecto)) {
      expect(guionesExternosDe(html).filter((e) => guionExternoDe(e)?.id === 'medicion'), ruta).toEqual([]);
      // Ninguna etiqueta de guion, de la medición ni de nada: es la mitad «sin él, ninguno» de
      // los criterios de JavaScript de las Historias 2.1 y 4.1, que se juzgaba en el navegador.
      expect(etiquetasDeGuionExterno(html), ruta).toEqual([]);
      expect(html, ruta).not.toContain('sendBeacon');
      expect(guionesEnLinea(html), ruta).toContain(ARRANQUE_DE_MEDICION);
    }
    expect(vistasDe(await leerSinMedir(CITA))).toBe(EVENTOS.vistaDeCita);
    expect(vistasDe(await leerSinMedir('/'))).toBe(EVENTOS.vistaDeSuperficie);
  }, 240_000);
});

describe('Historia 23.1 — lo que se descarga está en la lista y cabe en su tope', () => {
  it('cada `<script src>` y cada `import()` de `dist/` casa con una entrada, del mismo origen y bajo su tope', async () => {
    const proyecto = await sitioMedido();
    const dist = join(proyecto, 'dist');
    const vistos = new Map<string, Set<string>>();

    for (const [ruta, html] of paginasDe(proyecto)) {
      for (const especificador of guionesExternosDe(html)) {
        const entrada = guionExternoDe(especificador);
        expect(entrada, `${ruta} pide «${especificador}», que no está en GUIONES_EXTERNOS`).toBeDefined();
        const ficheros = vistos.get(entrada!.id) ?? new Set<string>();
        ficheros.add(especificador.replace(/[?#].*$/, ''));
        vistos.set(entrada!.id, ficheros);
      }
    }

    // Las tres entradas se piden en este sitio: si una no se viera, su tope no se mediría.
    expect([...vistos.keys()].sort()).toEqual(GUIONES_EXTERNOS.map((g) => g.id).sort());

    for (const guion of GUIONES_EXTERNOS) {
      for (const ruta of vistos.get(guion.id)!) {
        // Lo que el fichero arranca al ejecutarse —el worker de Pagefind— cuenta en su tope, y
        // un `new Worker`, `import()` o `importScripts` que la entrada no declare es un fallo.
        const { bytes, ficheros, sinDeclarar, sinVer } = descargaDeLaEntrada(
          dist,
          ruta,
          guion.arranca ?? [],
          (f) => readFileSync(f),
        );
        console.log(`${guion.id}: ${ficheros.join(' + ')}, ${bytes} bytes de ${guion.tope}`);
        expect(bytes, `${ruta}: ${bytes} bytes`).toBeLessThanOrEqual(guion.tope);
        expect(sinDeclarar, `${guion.id} arranca lo que no declara en GUIONES_EXTERNOS`).toEqual([]);
        expect(sinVer, `${guion.id} declara un arranque que sus ficheros ya no hacen`).toEqual([]);
        // El fichero de medición es un guion clásico: no importa ni arranca nada.
        if (guion.id === 'medicion') expect(ficheros).toEqual([ruta]);
      }
    }
    // El worker de Pagefind está en `dist/` y se cuenta: es lo que la revisión encontró fuera.
    expect(GUIONES_EXTERNOS.find((g) => g.id === 'pagefind')!.arranca).toEqual([
      { como: 'new Worker', ruta: '/pagefind/pagefind-worker.js' },
    ]);
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
    // Portada, Cita, Autor, Tema, Colección, Obra, búsqueda y 404: una por familia pública.
    expect(barrido).toHaveLength(8);
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

  it('Copiar, Imagen, Compartir y `/buscar/` llaman `__medir(` sin guarda, y anuncian con `anunciar`', async () => {
    const cita = guionesEnLinea(await leerMedida(CITA));
    const buscar = guionesEnLinea(await leerMedida('/buscar/'));
    const islas = {
      copiar: isla(cita, "'[data-copiar]'"),
      imagen: isla(cita, "'[data-imagen]'"),
      compartir: isla(cita, "'[data-compartir]'"),
      buscar: isla(buscar, "'[data-consulta]'"),
    };

    for (const [nombre, guion] of Object.entries(islas)) {
      expect(guion, nombre).toMatch(/(^|[^.\w$])__medir\(/);
      expect(guion, nombre).not.toMatch(/window\.__medir/);
    }
    /*
     * Llevar el texto de `anunciar` no basta: `guionQueAnuncia` lo mete siempre, se llame o no.
     * Revisión de la 23.1 (segunda pasada): con un `estado.textContent = …` a mano en `/buscar/`,
     * el mismo recuento dos veces seguidas dejaba de anunciarse y todo seguía en verde. Así que
     * el cuerpo de cada isla —el guion sin ese texto— llama `anunciar(` sobre su región y nunca
     * le escribe un mensaje a mano (vaciarla, sí: es lo que hace al volver a su reposo).
     */
    const REGION = { copiar: 'anuncio', imagen: 'anuncio', buscar: 'estado' } as const;
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
  /** El guion en línea de la búsqueda, el único que lee la dirección; desde la 23.8 escribirá además en el historial. */
  const esDeLaBusqueda = (ruta: string, guion: string) => ruta === '/buscar/' && guion.includes("'[data-consulta]'");

  /** Los ficheros que descarga cada entrada de la lista cerrada, con lo que arrancan, por entrada. */
  async function ficherosDescargados(): Promise<Map<string, Map<string, string>>> {
    const proyecto = await sitioMedido();
    const dist = join(proyecto, 'dist');
    const porEntrada = new Map<string, Map<string, string>>();
    for (const html of paginasDe(proyecto).values()) {
      for (const especificador of guionesExternosDe(html)) {
        const entrada = guionExternoDe(especificador);
        if (entrada === undefined) continue; // lo ajeno ya lo juzga la prueba de la lista cerrada
        const { ficheros } = descargaDeLaEntrada(dist, especificador.replace(/[?#].*$/, ''), entrada.arranca ?? [], (f) =>
          readFileSync(f),
        );
        const deLaEntrada = porEntrada.get(entrada.id) ?? new Map<string, string>();
        for (const fichero of ficheros) deLaEntrada.set(fichero, readFileSync(join(dist, fichero), 'utf8'));
        porEntrada.set(entrada.id, deLaEntrada);
      }
    }
    return porEntrada;
  }

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

  it('el fichero corre antes que todo guion que escriba en la dirección: va con `defer` y ningún otro guion de su página escribe', async () => {
    /*
     * «Antes» es de ejecución, no de documento. El fichero va con `defer` en el `<head>`, y un
     * `defer` corre al acabar de analizar el documento: detrás de todo guion clásico, esté donde
     * esté —la isla de `/buscar/`, al final del `<body>`, corre antes que él—. Así que no basta con
     * mirar los guiones que lo preceden en el documento: ningún otro guion de la página, en ningún
     * sitio, escribe en el historial ni en la dirección. Los descargados los mira la prueba de los
     * ficheros, abajo.
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
    }
    expect(vistas).toBeGreaterThan(SLUGS.length);
  }, 240_000);

  it('ningún guion en línea escribe en el historial o la dirección —tampoco la búsqueda, todavía—, ni lee una marca', async () => {
    /*
     * La búsqueda no tiene exención aquí. Cuando la 23.8 la haga escribir en el historial, esta
     * prueba y la anterior se pondrán en rojo a propósito: la isla es un guion clásico y corre
     * antes que el fichero diferido, así que tendrá que probar —ejecutándola— que escribe solo
     * desde sus escuchas, nunca al analizarse, y con la dirección que haya, ya sin marcas.
     */
    let busqueda = 0;
    let mirados = 0;
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      for (const guion of guionesEnLinea(html)) {
        mirados++;
        if (esDeLaBusqueda(ruta, guion)) busqueda++;
        expect(LEE_MARCAS.test(guion), `${ruta}: un guion en línea lee una marca`).toBe(false);
        expect(ESCRIBE_DIRECCION.test(guion), `${ruta}: un guion en línea escribe en la dirección`).toBe(false);
      }
    }
    expect(busqueda).toBe(1);
    expect(mirados).toBeGreaterThan(SLUGS.length);
  }, 240_000);

  it('entre los guiones propios —en línea e `islas/`— solo la búsqueda lee la dirección', async () => {
    let busqueda = 0;
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      for (const guion of guionesEnLinea(html)) {
        if (!esDeLaBusqueda(ruta, guion)) {
          expect(LEE_DIRECCION.test(guion), `${ruta}: un guion en línea lee la dirección`).toBe(false);
          continue;
        }
        busqueda++;
        // El detector la ve: lee su consulta de la dirección.
        expect(LEE_DIRECCION.test(guion), ruta).toBe(true);
      }
    }
    expect(busqueda).toBe(1);
    const islas = (await ficherosDescargados()).get('imagen');
    expect(islas?.size, 'la Imagen de `islas/` se descarga en este sitio').toBeGreaterThan(0);
    for (const [fichero, codigo] of islas!) expect(LEE_DIRECCION.test(codigo), fichero).toBe(false);
  }, 240_000);

  it('de lo que se descarga, solo el fichero lee una marca o escribe en la dirección: ni la Imagen ni Pagefind', async () => {
    const descargados = await ficherosDescargados();
    expect([...descargados.keys()].sort()).toEqual(GUIONES_EXTERNOS.map((g) => g.id).sort());
    for (const [id, ficheros] of descargados) {
      for (const [fichero, codigo] of ficheros) {
        const esElFichero = id === 'medicion';
        expect(LEE_MARCAS.test(codigo), `${fichero} lee una marca`).toBe(esElFichero);
        expect(ESCRIBE_DIRECCION.test(codigo), `${fichero} escribe en la dirección`).toBe(esElFichero);
      }
    }
    expect(descargados.get('pagefind')?.size, 'Pagefind y su worker').toBeGreaterThanOrEqual(2);
  }, 240_000);
});

describe('Historia 23.7 — toda salida interna de `dist/` dice su zona', () => {
  /**
   * Las once Zonas de salida interna que coloca la Épica 23 (UX-DR111). Las otras cinco del
   * vocabulario —`tarjeta-de-obra`, `siguiente`, `misma-obra`, `directorio` y `obras-de-portada`—
   * las colocan las Épicas 24, 26 y 28, que las añaden aquí en el mismo diff.
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

  /** Si la página construida pide el fichero de medición: entonces su escucha de `click` corre en ella. */
  const cargaElFichero = (html: string) =>
    etiquetasDeGuionExterno(html).some((etiqueta) => guionExternoDe(etiqueta.src)?.id === 'medicion');

  /*
   * Toda página que carga el fichero, no solo las superficies con lectura: las páginas 2+,
   * `/buscar/` y el 404 también emiten su salida (sin lectura), y un enlace sin zona en ellas se
   * quedaría sin medir igual de callado. Lo que no carga el fichero —`/kit` y `/lote`— no mide
   * nada y no entra.
   */
  it('en toda página que carga el fichero —con lectura o sin ella—, todo enlace interno de `main` tiene zona o exención', async () => {
    let paginas = 0;
    let sinLectura = 0;
    let enlaces = 0;
    const sinDeclarar: string[] = [];
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      if (!cargaElFichero(html)) {
        expect(vistasDe(html), `${ruta}: declara vista y no carga el fichero`).toBeUndefined();
        continue;
      }
      paginas++;
      if (vistasDe(html) === undefined) sinLectura++;
      for (const { href, enMain, declaracion } of enlacesDe(html)) {
        if (!enMain || href === undefined || esAnclaDeLaPropiaPagina(href)) continue;
        if (new URL(href, new URL(ruta, BASE)).origin !== BASE.origin) continue;
        enlaces++;
        const valida =
          declaracion !== null &&
          ('zona' in declaracion
            ? (ZONAS as readonly string[]).includes(declaracion.zona)
            : (EXENCIONES_DE_ZONA as readonly string[]).includes(declaracion.sinZona));
        if (!valida) sinDeclarar.push(`${ruta}: ${href} (${JSON.stringify(declaracion)})`);
      }
    }
    expect(sinDeclarar).toEqual([]);
    // Portada, las Citas, el Autor, el Tema, la Colección y la Obra indexable: ninguna en vacío.
    expect(paginas).toBeGreaterThan(SLUGS_DE_CITA.length + 4);
    expect(enlaces).toBeGreaterThan(paginas * 3);
    // Y las que salen sin lectura: las páginas 2+, la Obra que no se indexa, `/buscar/` y el 404.
    expect(sinLectura).toBeGreaterThanOrEqual(PAGINAS_2.length + OBRAS.length - 1 + 2);
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
   */
  const COLOCACION: readonly (readonly [ruta: string, enlace: string | RegExp, esperadas: readonly Declaracion[]])[] = [
    ['/', CITA, [{ zona: 'cita-del-dia' }]],
    ['/', '/autor/seneca/', [{ zona: 'atribucion' }, { zona: 'autores-de-portada' }]],
    ['/', '/obra/seneca/sobre-la-brevedad-de-la-vida/', [{ zona: 'atribucion' }]],
    ['/', '/tema/el-tiempo/', [{ zona: 'chip-de-tema' }]],
    ['/', '/coleccion/frases-cortas/', [{ zona: 'colecciones' }]],
    ['/404', CITA, [{ zona: 'cita-del-dia' }]],
    ['/404', '/autor/seneca/', [{ zona: 'atribucion' }]],
    ['/404', '/tema/el-tiempo/', [{ sinZona: 'chips-del-404' }]],
    [CITA, '/autor/seneca/', [{ zona: 'atribucion' }]],
    [CITA, '/obra/seneca/sobre-la-brevedad-de-la-vida/', [{ zona: 'atribucion' }]],
    [CITA, /^\/cita\//, [{ zona: 'rutas-de-salida' }]],
    [CITA, '/tema/el-tiempo/', [{ zona: 'chip-de-tema' }]],
    ['/autor/seneca/', /^\/obra\//, [{ zona: 'lista-de-obras' }]],
    ['/autor/seneca/', /^\/cita\//, [{ zona: 'listado' }]],
    ['/autor/seneca/', /^\/autor\/seneca\/2\/?$/, [{ zona: 'paginacion' }]],
    ['/autor/seneca/2/', /^\/cita\//, [{ zona: 'listado' }]],
    ['/tema/el-tiempo/', /^\/cita\//, [{ zona: 'listado' }]],
    ['/tema/el-tiempo/', /^\/tema\/el-tiempo\/2\/?$/, [{ zona: 'paginacion' }]],
    ['/tema/el-tiempo/2/', /^\/tema\/el-tiempo\/?$/, [{ zona: 'paginacion' }]],
    ['/coleccion/frases-cortas/', /^\/cita\//, [{ zona: 'listado' }]],
    ['/coleccion/frases-cortas/', /^\/coleccion\/frases-cortas\/2\/?$/, [{ zona: 'paginacion' }]],
    [OBRA_INDEXABLE, '/autor/seneca/', [{ zona: 'atribucion' }]],
    [OBRA_INDEXABLE, /^\/cita\//, [{ zona: 'listado' }]],
    [OBRAS[1], '/autor/seneca/', [{ zona: 'atribucion' }]],
    [OBRAS[1], /^\/obra\/seneca\/sobre-la-brevedad-de-la-vida\/2\/?$/, [{ zona: 'paginacion' }]],
    [OBRAS[1], '/tema/el-tiempo/', [{ zona: 'chip-de-tema' }]],
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
      const casan = enlacesDe(html!).filter((e) => e.enMain && e.href !== undefined && casa(e.href));
      expect(casan.length, `ningún enlace de \`main\` de ${ruta} casa con ${String(enlace)}`).toBeGreaterThan(0);
      const distintas = [...new Set(casan.map((e) => JSON.stringify(e.declaracion)))].map((d) => JSON.parse(d));
      expect(distintas).toEqual(esperadas);
    },
    240_000,
  );

  it('en todo `dist/` las zonas son del vocabulario, son exactamente las once de hoy y van en un contenedor, nunca en el enlace', async () => {
    const declaraciones = await declaracionesDelSitio();
    const zonas = declaraciones.flatMap(({ declaracion }) => ('zona' in declaracion ? [declaracion.zona] : []));
    for (const zona of ZONAS_DE_HOY) expect(ZONAS as readonly string[]).toContain(zona);
    for (const zona of zonas) expect(ZONAS as readonly string[], zona).toContain(zona);
    expect([...new Set(zonas)].sort()).toEqual([...ZONAS_DE_HOY].sort());
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
    for (const [ruta, html] of paginasDe(await sitioMedido())) {
      const regiones = (html.match(/\brole\s*=\s*["']?status\b/gi) ?? []).length;
      const anunciantes = guionesEnLinea(html).filter(
        (g) => colapsado(g).includes(ANUNCIAR) && /\banunciar\(/.test(sinAnunciar(g)),
      ).length;
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
