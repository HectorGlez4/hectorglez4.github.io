/**
 * Los huecos del Corpus — FR-25, LC-6.
 *
 * Se consulta **antes** de una sesión de sembrado, para que la sesión llene lo que está
 * vacío en vez de engordar lo que ya está lleno. El sesgo que corrige es el de la
 * curación no vigilada: se siembra a los Autores que uno tiene más a mano, que son los
 * que ya tienen Citas, y los Temas que faltan siguen faltando indefinidamente.
 *
 * Lo que esta vista **no** hace, y es criterio explícito: no nombra Autores. Informa la
 * decisión y no la toma.
 *
 * La Historia 11.3 matiza ese criterio sin soltar lo que protege. `objetivo.ts` deriva de
 * esta vista el objetivo de cada sesión de sembrado, porque un agente que siembra sin
 * supervisión no tiene criterio y sin objetivo deriva hacia lo que es más fácil de
 * encontrar — el mismo sesgo que esta vista existe para corregir. Lo que ese objetivo
 * dice es **qué hueco cerrar**, y al Autor que falta lo caracteriza por su tradición,
 * jamás por su nombre: ni la vista ni la política eligen a quién entra en el Corpus, que
 * sigue siendo la única decisión que este producto no delega. Una lista de nombres la
 * delegaría por la puerta de atrás.
 *
 * AD-5 — Derivación pura: recibe lo leído, no lee disco.
 */

import {
  MIN_CITAS_POR_COLECCION,
  MIN_CITAS_POR_TEMA,
  SUELO_TRADICION_LATINOAMERICANA,
} from './umbrales.ts';

export interface TemaParaHuecos {
  slug: string;
  nombre: string;
}

export interface AutorParaHuecos {
  slug: string;
  nombre: string;
  tradicion?: 'latinoamericana' | 'peninsular' | 'otra';
}

export interface CitaParaHuecos {
  slug: string;
  autor: string;
  temas?: string[];
}

export interface HuecoDeTema {
  slug: string;
  nombre: string;
  publicadas: number;
  /** Cuántas Citas le faltan para alcanzar el umbral de publicación. */
  faltan: number;
}

/**
 * Una Colección de la que ya se sabe cuántos miembros **resuelve** — Historia 12.4.
 *
 * `resueltas` no se calcula aquí a propósito. Resolver la pertenencia de una Colección es
 * intersectar su lista declarada con el conjunto publicable, y de eso tiene un solo dueño:
 * `resolverColeccion`, en `publicado.ts`. Esta vista recibe el número ya resuelto —como
 * recibe las Citas ya leídas— y no vuelve a derivarlo. Reimplementarlo aquí sería tener
 * dos respuestas a «cuántas Citas tiene esta Colección».
 */
export interface ColeccionParaHuecos {
  slug: string;
  nombre: string;
  /** Miembros que existen y están publicados. Sale de `resolverColeccion`. */
  resueltas: number;
}

/**
 * Lo que le falta a una Colección para publicarse — Historia 12.4.
 *
 * Tiene **los mismos campos que `HuecoDeTema` y con los mismos nombres**, y es el punto:
 * quien cura una Colección y quien mira qué le falta al Corpus son la misma persona en el
 * mismo momento, así que las dos cosas se leen igual y se escriben con el mismo formateador
 * (`lineaDeHueco`). `publicadas` es aquí el recuento resuelto, que es lo que el visitante
 * vería en la página: el declarado no publica nada.
 */
export interface HuecoDeColeccion {
  slug: string;
  nombre: string;
  publicadas: number;
  /** Cuántas Citas le faltan para alcanzar su umbral. */
  faltan: number;
}

/**
 * Qué le falta a **una** Colección, sin filtrar: `faltan` vale cero si ya se publica.
 *
 * Se expone aparte de `huecosDeColecciones` porque la herramienta de curación pregunta por
 * una sola y necesita la respuesta también cuando es «ninguna»; la vista de huecos enumera
 * las que faltan y descarta el resto.
 */
export function huecoDeColeccion(coleccion: ColeccionParaHuecos): HuecoDeColeccion {
  return {
    slug: coleccion.slug,
    nombre: coleccion.nombre,
    publicadas: coleccion.resueltas,
    faltan: Math.max(0, MIN_CITAS_POR_COLECCION - coleccion.resueltas),
  };
}

/** Las Colecciones por debajo de su umbral, de menos a más les falta, como los Temas. */
export function huecosDeColecciones(colecciones: ColeccionParaHuecos[]): HuecoDeColeccion[] {
  return colecciones
    .map(huecoDeColeccion)
    .filter((hueco) => hueco.faltan > 0)
    .sort((a, b) => a.faltan - b.faltan || a.slug.localeCompare(b.slug, 'es'));
}

export interface EquilibrioDeTradicion {
  total: number;
  latinoamericana: number;
  peninsular: number;
  otra: number;
  /** Autores sin tradición declarada. Se cuentan aparte: el dato está incompleto. */
  sinDeclarar: number;
  /** Porcentaje de tradición latinoamericana sobre el total, a una décima. */
  porcentaje: number;
  suelo: number;
  alcanzaElSuelo: boolean;
}

export interface Huecos {
  /** Temas por debajo del umbral, de menos a más les falta: por dónde empezar. */
  temas: HuecoDeTema[];
  /**
   * Colecciones por debajo de su umbral, en el mismo orden y con la misma lectura.
   *
   * Están en el informe y **no** en la política de objetivo de sesión, y la distinción es
   * deliberada: el hueco de un Tema se cierra sembrando Citas nuevas, que es lo que una
   * sesión de sembrado hace, y el de una Colección se cierra asignándole Citas que ya
   * existen, que es curación y no sembrado. Mezclarlos mandaría a una sesión a buscar
   * Autores para llenar una decisión editorial que nadie ha tomado todavía.
   */
  colecciones: HuecoDeColeccion[];
  tradicion: EquilibrioDeTradicion;
  /**
   * Temas que la portada anuncia y no llegan al umbral — LC-6.
   *
   * Debe estar siempre vacío: la portada anuncia lo que `publicado.ts` da por publicado,
   * y ese dueño único aplica el mismo umbral. Se comprueba igualmente porque es la
   * condición de lanzamiento, y una condición que se da por supuesta no es una condición.
   */
  anunciadosBajoUmbral: string[];
}

export function verHuecos(
  citas: CitaParaHuecos[],
  temas: TemaParaHuecos[],
  autores: AutorParaHuecos[],
  temasAnunciadosEnPortada: string[] = [],
  colecciones: ColeccionParaHuecos[] = [],
): Huecos {
  const porTema = new Map<string, number>();
  for (const tema of temas) porTema.set(tema.slug, 0);
  for (const cita of citas) {
    for (const tema of cita.temas ?? []) {
      porTema.set(tema, (porTema.get(tema) ?? 0) + 1);
    }
  }

  const huecosDeTema = temas
    .map((tema) => {
      const publicadas = porTema.get(tema.slug) ?? 0;
      return {
        slug: tema.slug,
        nombre: tema.nombre,
        publicadas,
        faltan: Math.max(0, MIN_CITAS_POR_TEMA - publicadas),
      };
    })
    .filter((hueco) => hueco.faltan > 0)
    // De menos a más: el Tema al que le faltan dos se publica esta sesión, el que
    // necesita catorce es un proyecto. Ordenar al revés escondería el trabajo fácil.
    .sort((a, b) => a.faltan - b.faltan || a.slug.localeCompare(b.slug, 'es'));

  const cuenta = (t: AutorParaHuecos['tradicion']) =>
    autores.filter((a) => a.tradicion === t).length;

  const total = autores.length;
  const latinoamericana = cuenta('latinoamericana');
  const porcentaje = total === 0 ? 0 : Math.round((latinoamericana / total) * 1000) / 10;

  return {
    temas: huecosDeTema,
    colecciones: huecosDeColecciones(colecciones),
    tradicion: {
      total,
      latinoamericana,
      peninsular: cuenta('peninsular'),
      otra: cuenta('otra'),
      sinDeclarar: autores.filter((a) => a.tradicion === undefined).length,
      porcentaje,
      suelo: SUELO_TRADICION_LATINOAMERICANA,
      alcanzaElSuelo: porcentaje >= SUELO_TRADICION_LATINOAMERICANA,
    },
    anunciadosBajoUmbral: temasAnunciadosEnPortada.filter(
      (slug) => (porTema.get(slug) ?? 0) < MIN_CITAS_POR_TEMA,
    ),
  };
}
