import { describe, expect, it } from 'vitest';
import {
  verHuecos,
  type AutorParaHuecos,
  type CitaParaHuecos,
  type ColeccionParaHuecos,
  type TemaParaHuecos,
} from '../../src/lib/huecos.ts';
import { objetivoDeMeta, verMeta } from '../../src/lib/meta.ts';
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
    const conTodo = [
      ...Array.from({ length: META_TEMAS_PUBLICADOS }, (_, t) => citas(MIN_CITAS_POR_TEMA + 10, `tema-${t}`, META_AUTORES)).flat(),
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
