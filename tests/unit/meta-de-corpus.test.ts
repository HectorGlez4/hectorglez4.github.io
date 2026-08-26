import { describe, expect, it } from 'vitest';
import {
  verHuecos,
  type AutorParaHuecos,
  type CitaParaHuecos,
  type ColeccionParaHuecos,
  type TemaParaHuecos,
} from '../../src/lib/huecos.ts';
import { citasQueCabenDe, objetivoDeMeta, verMeta } from '../../src/lib/meta.ts';
import {
  META_AUTORES,
  META_CITAS_PUBLICADAS,
  META_COLECCIONES_PUBLICADAS,
  META_TEMAS_PUBLICADOS,
  MIN_CITAS_POR_COLECCION,
  MIN_CITAS_POR_TEMA,
  TECHO_CONCENTRACION_POR_AUTOR,
} from '../../src/lib/umbrales.ts';

/**
 * Meta de Corpus — el listón agresivo de la v4.
 *
 * `objetivo.ts` responde «qué falta para poder publicar»; esto responde «cuánto falta para
 * la meta». Son dos preguntas distintas y por eso son dos módulos: el suelo de publicación
 * es una regla del producto y la meta es una ambición con fecha, y mezclarlas dejaría el
 * suelo moviéndose cada vez que la ambición cambia.
 *
 * Todo lo de aquí es derivación pura: se le da un estado y se mira qué tramo declara.
 */

function autores(cuantos: number, tradicion: AutorParaHuecos['tradicion'] = 'latinoamericana') {
  return Array.from({ length: cuantos }, (_, i) => ({
    slug: `autor-${i}`,
    nombre: `Autor ${i}`,
    tradicion,
  }));
}

/** Una composición que alcanza el suelo de tradición, para que no tape lo que se mide. */
function autoresEquilibrados(cuantos: number): AutorParaHuecos[] {
  return Array.from({ length: cuantos }, (_, i) => ({
    slug: `autor-${i}`,
    nombre: `Autor ${i}`,
    tradicion: i % 2 === 0 ? 'latinoamericana' : 'peninsular',
  }));
}

function temas(cuantos: number): TemaParaHuecos[] {
  return Array.from({ length: cuantos }, (_, i) => ({ slug: `tema-${i}`, nombre: `Tema ${i}` }));
}

/** `cuantas` Citas repartidas entre `autores` y colocadas en `tema`. */
function citas(cuantas: number, tema: string, autoresDisponibles: number): CitaParaHuecos[] {
  return Array.from({ length: cuantas }, (_, i) => ({
    slug: `${tema}-${i}`,
    autor: `autor-${i % autoresDisponibles}`,
    temas: [tema],
  }));
}

function colecciones(cuantas: number, resueltas = MIN_CITAS_POR_COLECCION): ColeccionParaHuecos[] {
  return Array.from({ length: cuantas }, (_, i) => ({
    slug: `coleccion-${i}`,
    nombre: `Colección ${i}`,
    resueltas,
  }));
}

/** El estado completo, tal como lo montan las órdenes: huecos primero, meta después. */
function meta(
  todasLasCitas: CitaParaHuecos[],
  todosLosTemas: TemaParaHuecos[],
  todosLosAutores: AutorParaHuecos[],
  todasLasColecciones: ColeccionParaHuecos[] = [],
) {
  const huecos = verHuecos(todasLasCitas, todosLosTemas, todosLosAutores, [], todasLasColecciones);
  return verMeta(todasLasCitas, todosLosTemas, todasLasColecciones, huecos);
}

describe('Meta de Corpus — los cuatro tramos se cuentan sobre lo publicado', () => {
  it('un Tema por debajo del umbral no cuenta como Tema publicado', () => {
    const estado = meta(
      [...citas(MIN_CITAS_POR_TEMA, 'tema-0', 4), ...citas(MIN_CITAS_POR_TEMA - 1, 'tema-1', 4)],
      temas(2),
      autoresEquilibrados(4),
    );
    expect(estado.temas.alcanzado).toBe(1);
    expect(estado.temas.meta).toBe(META_TEMAS_PUBLICADOS);
    expect(estado.temas.faltan).toBe(META_TEMAS_PUBLICADOS - 1);
  });

  it('una Colección por debajo de su umbral tampoco cuenta', () => {
    const estado = meta(
      citas(MIN_CITAS_POR_TEMA, 'tema-0', 4),
      temas(1),
      autoresEquilibrados(4),
      [...colecciones(2), ...colecciones(1, MIN_CITAS_POR_COLECCION - 1)],
    );
    expect(estado.colecciones.alcanzado).toBe(2);
    expect(estado.colecciones.faltan).toBe(META_COLECCIONES_PUBLICADAS - 2);
  });

  it('las Citas y los Autores se cuentan enteros, que es lo que son', () => {
    const estado = meta(citas(30, 'tema-0', 5), temas(1), autoresEquilibrados(5));
    expect(estado.citas.alcanzado).toBe(30);
    expect(estado.citas.meta).toBe(META_CITAS_PUBLICADAS);
    expect(estado.autores.alcanzado).toBe(5);
    expect(estado.autores.meta).toBe(META_AUTORES);
  });

  it('un tramo cumplido no devuelve un faltan negativo', () => {
    const estado = meta(citas(META_CITAS_PUBLICADAS + 40, 'tema-0', 4), temas(1), autoresEquilibrados(4));
    expect(estado.citas.faltan).toBe(0);
  });
});

describe('Meta de Corpus — el techo de concentración por Autor', () => {
  /** 60 Citas, 40 de ellas del mismo Autor: el 66,7 %, muy por encima del techo. */
  const concentrado: CitaParaHuecos[] = [
    ...Array.from({ length: 40 }, (_, i) => ({ slug: `a-${i}`, autor: 'autor-0', temas: ['tema-0'] })),
    ...Array.from({ length: 20 }, (_, i) => ({ slug: `b-${i}`, autor: 'autor-1', temas: ['tema-0'] })),
  ];

  it('nombra al Autor más representado y su porcentaje', () => {
    const estado = meta(concentrado, temas(1), autoresEquilibrados(2));
    expect(estado.concentracion?.autor).toBe('autor-0');
    expect(estado.concentracion?.citas).toBe(40);
    expect(estado.concentracion?.porcentaje).toBe(66.7);
    expect(estado.concentracion?.excede).toBe(true);
  });

  it('dice cuántas Citas de otros Autores hacen falta para bajarlo al techo', () => {
    const estado = meta(concentrado, temas(1), autoresEquilibrados(2));
    /*
     * El techo no se cierra quitando Citas —una Cita publicada no se despublica— sino
     * diluyendo: el menor k con 40 / (60 + k) ≤ techo/100.
     */
    const esperadas = Math.ceil((100 * 40) / TECHO_CONCENTRACION_POR_AUTOR) - 60;
    expect(estado.concentracion?.citasDeOtrosQueFaltan).toBe(esperadas);
  });

  it('un reparto por debajo del techo no exige nada', () => {
    const estado = meta(citas(100, 'tema-0', 20), temas(1), autoresEquilibrados(20));
    expect(estado.concentracion?.excede).toBe(false);
    expect(estado.concentracion?.citasDeOtrosQueFaltan).toBe(0);
  });

  it('un Corpus sin Citas no tiene concentración que medir', () => {
    const estado = meta([], temas(1), autoresEquilibrados(3));
    expect(estado.concentracion).toBeUndefined();
  });
});

describe('Meta de Corpus — el escalonado decide el titular', () => {
  /** Un Corpus grande y bien repartido, para que solo falte lo que cada caso deja corto. */
  function corpusSano(cuantasCitas: number, cuantosAutores: number) {
    return citas(cuantasCitas, 'tema-0', cuantosAutores);
  }

  it('1.º las Colecciones: se cierran con lo ya publicado, sin sembrar nada', () => {
    const objetivo = objetivoDeMeta(
      meta(corpusSano(400, 40), temas(1), autoresEquilibrados(40), colecciones(3)),
    );
    expect(objetivo.clase).toBe('coleccion');
    expect(objetivo.objetivo).toContain('Colecciones');
    expect(objetivo.objetivo).toContain('sin sembrar');
  });

  it('2.º la concentración: con las Colecciones puestas, diluir al Autor que se pasa', () => {
    const desequilibrado = [
      ...Array.from({ length: 200 }, (_, i) => ({ slug: `x-${i}`, autor: 'autor-0', temas: ['tema-0'] })),
      ...Array.from({ length: 200 }, (_, i) => ({ slug: `y-${i}`, autor: `autor-${(i % 39) + 1}`, temas: ['tema-0'] })),
    ];
    const objetivo = objetivoDeMeta(
      meta(desequilibrado, temas(1), autoresEquilibrados(40), colecciones(META_COLECCIONES_PUBLICADAS)),
    );
    expect(objetivo.clase).toBe('concentracion');
    expect(objetivo.objetivo).toContain('otros Autores');
  });

  it('3.º los Autores: cuando el reparto ya está sano pero falta censo', () => {
    const objetivo = objetivoDeMeta(
      meta(corpusSano(400, 20), temas(1), autoresEquilibrados(20), colecciones(META_COLECCIONES_PUBLICADAS)),
    );
    expect(objetivo.clase).toBe('autores');
    expect(objetivo.objetivo).toContain(String(META_AUTORES - 20));
  });

  it('4.º los Temas: la anchura va después del fondo', () => {
    const objetivo = objetivoDeMeta(
      meta(corpusSano(600, META_AUTORES), temas(1), autoresEquilibrados(META_AUTORES), colecciones(META_COLECCIONES_PUBLICADAS)),
    );
    expect(objetivo.clase).toBe('temas');
    expect(objetivo.objetivo).toContain('Temas');
  });

  it('5.º el volumen: con todo lo demás puesto, seguir sembrando hasta la meta', () => {
    /*
     * Cada Tema reparte sus Citas entre los Autores con `i % META_AUTORES`, así que hacen falta
     * **al menos tantas Citas por Tema como Autores** para que todos publiquen alguna. Con menos,
     * el censo de Autores —que desde la 35.ª sesión cuenta a los que publican y no a los
     * declarados— se queda corto y el tramo que manda pasa a ser el de Autores, no el de volumen.
     */
    const conTodo = [
      ...Array.from({ length: META_TEMAS_PUBLICADOS }, (_, t) => citas(META_AUTORES + 5, `tema-${t}`, META_AUTORES)).flat(),
    ];
    const objetivo = objetivoDeMeta(
      meta(conTodo, temas(META_TEMAS_PUBLICADOS), autoresEquilibrados(META_AUTORES), colecciones(META_COLECCIONES_PUBLICADAS)),
    );
    expect(objetivo.clase).toBe('volumen');
    expect(objetivo.objetivo).toContain('Citas');
  });

  it('y cuando los cuatro tramos están, la meta está alcanzada', () => {
    const deSobra = Array.from({ length: META_TEMAS_PUBLICADOS }, (_, t) =>
      citas(Math.ceil(META_CITAS_PUBLICADAS / META_TEMAS_PUBLICADOS) + MIN_CITAS_POR_TEMA, `tema-${t}`, META_AUTORES),
    ).flat();
    const estado = meta(
      deSobra,
      temas(META_TEMAS_PUBLICADOS),
      autoresEquilibrados(META_AUTORES),
      colecciones(META_COLECCIONES_PUBLICADAS),
    );
    expect(estado.alcanzada).toBe(true);
    expect(objetivoDeMeta(estado).clase).toBe('alcanzada');
  });
});

describe('Meta de Corpus — cada objetivo declara de qué tramo sale', () => {
  it('el hueco lleva la cifra alcanzada y la meta, nunca solo la orden', () => {
    const objetivo = objetivoDeMeta(meta(citas(300, 'tema-0', 30), temas(1), autoresEquilibrados(30)));
    expect(objetivo.hueco).toContain(String(META_COLECCIONES_PUBLICADAS));
    expect(objetivo.hueco.length).toBeGreaterThan(20);
  });

  it('el mismo estado da el mismo texto, palabra por palabra', () => {
    const estado = () => meta(citas(300, 'tema-0', 30), temas(1), autoresEquilibrados(30));
    expect(objetivoDeMeta(estado())).toEqual(objetivoDeMeta(estado()));
  });
});

describe('Meta de Corpus — el techo vigila a todos los Autores, no solo al primero', () => {
  /*
   * El defecto que esta prueba cierra apareció sembrando. Cuatro sesiones diluyendo al Autor
   * más representado habían llevado al **segundo** a seis Citas del techo, y la política no lo
   * habría dicho, porque solo miraba al primero. Un tramo que se cierra creando una
   * concentración nueva no ha cerrado nada.
   */
  const dosPorEncima: CitaParaHuecos[] = [
    ...Array.from({ length: 40 }, (_, i) => ({ slug: `a-${i}`, autor: 'autor-0', temas: ['tema-0'] })),
    ...Array.from({ length: 30 }, (_, i) => ({ slug: `b-${i}`, autor: 'autor-1', temas: ['tema-0'] })),
    ...Array.from({ length: 30 }, (_, i) => ({ slug: `c-${i}`, autor: `autor-${(i % 8) + 2}`, temas: ['tema-0'] })),
  ];

  it('cuenta cuántos Autores pasan del techo, no solo si alguno pasa', () => {
    // 40 y 30 sobre 100: el 40 % y el 30 %, los dos por encima del 15 %.
    const estado = meta(dosPorEncima, temas(1), autoresEquilibrados(10));
    expect(estado.concentracion?.porEncimaDelTecho).toBe(2);
  });

  it('y las Citas que faltan salen del Autor que más dilución exige', () => {
    const estado = meta(dosPorEncima, temas(1), autoresEquilibrados(10));
    // Manda el de 40, no el de 30: diluir hasta el segundo dejaría al primero fuera.
    const esperadas = Math.ceil((100 * 40) / TECHO_CONCENTRACION_POR_AUTOR) - 100;
    expect(estado.concentracion?.citasDeOtrosQueFaltan).toBe(esperadas);
  });

  it('un reparto con uno solo por encima sigue contando uno', () => {
    const soloUno: CitaParaHuecos[] = [
      ...Array.from({ length: 40 }, (_, i) => ({ slug: `a-${i}`, autor: 'autor-0', temas: ['tema-0'] })),
      ...Array.from({ length: 60 }, (_, i) => ({ slug: `d-${i}`, autor: `autor-${(i % 9) + 1}`, temas: ['tema-0'] })),
    ];
    expect(meta(soloUno, temas(1), autoresEquilibrados(10)).concentracion?.porEncimaDelTecho).toBe(1);
  });

  it('y el objetivo dice cuántos son cuando es más de uno', () => {
    const objetivo = objetivoDeMeta(
      meta(dosPorEncima, temas(1), autoresEquilibrados(10), colecciones(META_COLECCIONES_PUBLICADAS)),
    );
    expect(objetivo.clase).toBe('concentracion');
    expect(objetivo.hueco).toContain('2 Autores');
  });
});

describe('Meta de Corpus — el censo de Autores cuenta los que publican, no los declarados', () => {
  /*
   * La incoherencia la destapó un número que no cuadraba: el sitemap traía 16 Páginas de Autor y
   * el Corpus declaraba 17. No era un fallo del sitemap —un Autor sin Citas no tiene página— pero
   * sí de esta política, que contaba los ficheros de `corpus/autores/`.
   *
   * `META_TEMAS_PUBLICADOS` ya lo hacía bien, y su propio comentario dice por qué: «Un Tema con
   * cuatro Citas no es una página que exista para nadie, y contarlo aquí dejaría la meta
   * alcanzable abriendo ficheros vacíos». El argumento vale igual para los Autores y no se había
   * aplicado: con el censo de declarados, la meta de 35 se alcanza creando dieciocho ficheros
   * y sin publicar una sola Cita.
   */
  it('un Autor sin Citas publicadas no cuenta para la meta', () => {
    const conFantasma = [
      ...autoresEquilibrados(4),
      { slug: 'autor-fantasma', nombre: 'Fantasma', tradicion: 'peninsular' as const },
    ];
    // Las Citas solo son de los cuatro primeros: el quinto es un fichero sin nada detrás.
    const estado = meta(citas(20, 'tema-0', 4), temas(1), conFantasma);

    expect(estado.autores.alcanzado).toBe(4);
  });

  it('y el equilibrio de tradición sigue contándolos a todos, que es otra pregunta', () => {
    /*
     * El suelo del 40 % mide **a quién se ha admitido**, no a quién se ha sembrado: un Autor
     * admitido y todavía sin Citas ya cuenta como compromiso editorial tomado. Son dos censos
     * distintos a propósito, y por eso este caso está escrito: para que quien toque uno vea que
     * el otro no le sigue.
     */
    const conFantasma = [
      ...autoresEquilibrados(4),
      { slug: 'autor-fantasma', nombre: 'Fantasma', tradicion: 'peninsular' as const },
    ];
    const huecos = verHuecos(citas(20, 'tema-0', 4), temas(1), conFantasma);

    expect(huecos.tradicion.total).toBe(5);
  });

  it('un Corpus sin Citas no declara ningún Autor alcanzado, aunque haya ficheros', () => {
    expect(meta([], temas(1), autoresEquilibrados(6)).autores.alcanzado).toBe(0);
  });
});


/**
 * Cuántas Citas más cabe sembrar de un Autor sin romper el techo — Historia 15.3.
 *
 * `verMeta` ya sabe la aritmética contraria: cuántas Citas **de otros** faltan para diluir a
 * quien excede. Falta la que decide dónde invertir una sesión de sembrado: **cuántas propias
 * caben todavía**. La he calculado a mano en un guion de usar y tirar tres sesiones seguidas, y
 * el protocolo apoya en ella una regla —«el margen está donde el Autor tiene pocas Citas, no
 * donde tiene mucha obra»—, así que merece estar aquí, probada y al lado de su hermana. Dos
 * aritméticas del mismo techo en sitios distintos acaban divergiendo.
 *
 * Sale de despejar `(citas + n) / (total + n) ≤ techo`, que da
 * `n ≤ (techo·total − citas) / (1 − techo)`. Lo que importa de la fórmula es que **el corpus
 * crece con lo que se siembra**: sembrar de un Autor sube su numerador y también el denominador
 * de todos, y por eso caben más de las que una regla de tres ingenua diría.
 */
describe('Meta de Corpus — cuántas Citas propias caben bajo el techo', () => {
  it('de un Autor sin ninguna Cita caben casi tantas como Citas tiene el Corpus', () => {
    // Con el techo en el 15 %, un Autor a cero puede llegar a ser el 15 % de un Corpus mayor.
    const caben = citasQueCabenDe(0, 1000);

    expect(caben).toBeGreaterThan(150);
    expect((0 + caben) / (1000 + caben)).toBeLessThanOrEqual(TECHO_CONCENTRACION_POR_AUTOR / 100);
  });

  it('de uno que ya está justo en el techo no cabe ninguna', () => {
    const total = 1000;
    const enElTecho = Math.floor((TECHO_CONCENTRACION_POR_AUTOR / 100) * total);

    expect(citasQueCabenDe(enElTecho, total)).toBe(0);
  });

  it('de uno que lo excede tampoco, y no devuelve un número negativo', () => {
    // Un margen negativo se sumaría mal en cualquier cuenta que lo use: aquí el suelo es cero.
    expect(citasQueCabenDe(500, 1000)).toBe(0);
  });

  it('nunca propone una siembra que rompa el techo, para cualquier reparto', () => {
    /*
     * La propiedad es «sembrar no mete a nadie por encima del techo», y **no** «después de
     * sembrar todos están por debajo»: hay repartos que ya lo exceden antes de tocar nada —siete
     * Citas en un Corpus de diez son el 70 %—, y ahí lo correcto es no sembrar ninguna, no
     * arreglar por arte un exceso que ya venía. La primera redacción de esta prueba pedía lo
     * segundo y se puso roja con razón.
     */
    const techo = TECHO_CONCENTRACION_POR_AUTOR / 100;

    for (const total of [10, 137, 1184, 5000]) {
      for (const citas of [0, 1, 7, 50, 163]) {
        const caben = citasQueCabenDe(citas, total);

        if (citas / total > techo) {
          expect(caben, `${citas} de ${total} ya excede`).toBe(0);
          continue;
        }

        const despues = (citas + caben) / (total + caben);
        expect(despues, `${citas} de ${total} + ${caben}`).toBeLessThanOrEqual(techo);
      }
    }
  });

  it('y una más rompería el techo: el margen es el mayor que cabe, no uno prudente', () => {
    // Sin esto, la función podría devolver siempre 0 y pasar todas las pruebas de arriba.
    const techo = TECHO_CONCENTRACION_POR_AUTOR / 100;

    for (const [citas, total] of [[0, 1000], [7, 1141], [50, 1184]]) {
      const unaMas = citasQueCabenDe(citas, total) + 1;

      expect((citas + unaMas) / (total + unaMas), `${citas} de ${total}`).toBeGreaterThan(techo);
    }
  });
});
