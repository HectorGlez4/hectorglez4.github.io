/**
 * Qué Citas de una Colección entran en su Pieza, y qué queda fuera — Historia 13.3, FR-22.
 *
 * **El umbral no se comprueba aquí, y no se puede.** La firma exige una `ColeccionPublicada`,
 * y la única forma de obtener una en todo el proyecto es `coleccionesPublicadas`, que es donde
 * se aplica `MIN_CITAS_POR_COLECCION` (AD-11). La marca de esa interfaz no existe en tiempo de
 * ejecución, así que pedirla no cuesta nada y cierra el criterio en el compilador: «una
 * Colección por debajo de su umbral no produce Pieza» deja de ser una regla que hay que
 * recordar y pasa a ser algo que no compila. Un `if` aquí sería el segundo sitio con el
 * umbral, y dos sitios divergen.
 *
 * **Aquí sí se excluye… pero se dice.** Es la diferencia con la 13.2, y no es un capricho: en
 * la Pieza de varias Citas, Héctor nombró cada slug, y descartar uno en silencio convertiría
 * su error en un artefacto publicado incompleto. Aquí no nombró ninguno —las Citas vienen de
 * la pertenencia de la Colección, que puede tener veinte— así que excluir es lo correcto,
 * porque si no la Pieza no se podría componer nunca. Lo que hace que excluir no sea perder es
 * que cada exclusión sale con su motivo: `fuera` es la mitad auditable de la respuesta.
 *
 * **El orden es el declarado.** `resolverColeccion` lo preserva a propósito porque es curación
 * de Héctor y no ordenación del sistema, y de ahí que las que entran cuando no caben todas
 * sean **las primeras**: la Pieza anuncia lo que él puso primero.
 *
 * AD-5 — puro: recibe lo ya resuelto y devuelve una selección; no lee disco ni rasteriza.
 */

import {
  MINIMO_DE_CITAS,
  cabenEnPieza,
  citaEnPieza,
  desbordanALoAncho,
  type CitaEnPieza,
} from './pieza.ts';
import type { Autor, Cita, ColeccionPublicada } from './publicado.ts';
import { admiteImagen } from './tramos.ts';
import { MAX_CARACTERES_IMAGEN } from './umbrales.ts';

/** Una Cita de la Colección que no entra en su Pieza, con el motivo ya redactado. */
export interface MiembroFuera {
  slug: string;
  motivo: string;
}

/** Lo que la Pieza de una Colección anuncia, y lo que deja fuera. */
export interface SeleccionDeColeccion {
  /** El nombre de la Colección: el título del lienzo. */
  titulo: string;
  /** Las Citas que entran, en el orden declarado. */
  citas: Cita[];
  /** Las mismas, ya compuestas para el lienzo. Mismo orden y misma longitud que `citas`. */
  enPieza: CitaEnPieza[];
  /** Las que no entran, en el orden declarado, cada una con su motivo. */
  fuera: MiembroFuera[];
  /**
   * Los miembros **declarados que no resuelven**: erratas, o Citas retiradas a revisión.
   *
   * Se pasa tal cual desde `resolverColeccion`, que ya los cuenta, y se pasa porque si no
   * desaparecen del todo. Son la única exclusión que el curador **no** provocó: no las eligió
   * la selección, no salen en `fuera` y ni siquiera entran en el recuento resuelto, así que
   * una Colección que declara veinte miembros con cinco en revisión anunciaría «N de sus 15»
   * sin que los cinco existieran para nadie. La historia entera se sostiene sobre que lo que
   * no se anuncia se dice; callar justamente esto sería callar lo que el curador no sabe.
   */
  sinResolver: string[];
  /**
   * Verdadero cuando **el título es lo que impide** que quepan las Citas que cabrían sin él.
   *
   * Sin este dato, un nombre de Colección largo produce una Pieza de cero Citas y un parte que
   * culpa a las Citas de no caber, una por una, sin nombrar ni una vez al culpable. Se calcula
   * comparando las dos cabidas, que es la única forma honesta de saberlo.
   */
  elTituloEstorba: boolean;
}

/**
 * La selección: qué se anuncia de esta Colección y qué no.
 *
 * Las tres razones por las que un miembro se queda fuera van en este orden porque es el de
 * lo barato a lo caro y porque cada una explica la siguiente: una Cita que no admite Imagen
 * (FR-10) no se mide a lo ancho, y una que se sale del lienzo no ocupa sitio en el apilado.
 * La cuarta —«ya no cabe»— solo puede juzgarse con las supervivientes de las tres primeras.
 */
export function seleccionDeColeccion(
  coleccion: ColeccionPublicada,
  autores: ReadonlyMap<string, Autor>,
): SeleccionDeColeccion {
  const fuera: MiembroFuera[] = [];
  const aptas: { cita: Cita; enPieza: CitaEnPieza }[] = [];

  for (const cita of coleccion.citas) {
    if (!admiteImagen(cita.texto)) {
      /*
       * La misma regla que le niega la Imagen de Cita, dicha con su nombre: por encima de
       * `MAX_CARACTERES_IMAGEN` el texto no cabe sin bajar de un cuerpo legible, y bajarlo o
       * recortarlo está prohibido (FR-10, NFR-12).
       */
      fuera.push({
        slug: cita.slug,
        motivo:
          `pasa de ${MAX_CARACTERES_IMAGEN} caracteres —tiene ${[...cita.texto].length}—, así ` +
          'que no admite Imagen (FR-10) y tampoco entra en una Pieza: no se recorta para que quepa',
      });
      continue;
    }

    /*
     * Sin Autor no hay atribución visible, y la atribución es criterio de aceptación de la
     * épica entera. Se mira que el Autor esté **y** que traiga nombre: un `.yml` con la clave
     * vacía compondría la Cita con un hueco donde va la firma.
     */
    const autor = autores.get(cita.autor);
    if (autor === undefined) {
      fuera.push({
        slug: cita.slug,
        motivo: `su Autor «${cita.autor}» no está en el corpus, así que aparecería sin atribución`,
      });
      continue;
    }
    if (typeof autor.nombre !== 'string' || autor.nombre.trim() === '') {
      fuera.push({
        slug: cita.slug,
        motivo:
          `su Autor «${cita.autor}» no tiene nombre en su ficha, así que aparecería sin ` +
          'atribución',
      });
      continue;
    }

    aptas.push({ cita, enPieza: citaEnPieza(cita, autor) });
  }

  /*
   * Y lo que se sale **a lo ancho**, que es el fallo silencioso: el reparto en líneas no parte
   * palabras nunca, así que una indivisible ocupa su línea y se sale por el lado. El
   * rasterizado no falla; produce un PNG con la palabra cortada.
   */
  const desbordadas = new Map(
    desbordanALoAncho(aptas.map((a) => a.enPieza)).map((d) => [d.indice, d.palabras]),
  );
  const caben = aptas.filter((apta, indice) => {
    const palabras = desbordadas.get(indice);
    if (palabras === undefined) return true;
    fuera.push({
      slug: apta.cita.slug,
      motivo:
        `tiene texto más ancho que el lienzo y saldría cortado (${palabras
          .map((p) => `«${p}»`)
          .join(', ')}), y no se parte ni se abrevia (NFR-12)`,
    });
    return false;
  });

  /*
   * Y por último el alto. `cabenEnPieza` exige el mínimo de una Pieza, así que preguntar por
   * menos de dos no significa nada: con menos, la selección ya está decidida y quien compone
   * la rechaza. El título entra en la cuenta —lo lleva la Pieza— y por eso se le pasa.
   */
  const cuantasCaben = (titulo?: string): number => {
    if (caben.length < MINIMO_DE_CITAS) return caben.length;
    const cabida = cabenEnPieza(
      caben.map((c) => c.enPieza),
      { titulo },
    );
    return cabida.cabe ? caben.length : cabida.maximo;
  };

  const entran = caben.slice(0, cuantasCaben(coleccion.nombre));

  /*
   * Y quién tiene la culpa cuando no entran. La misma pregunta sin el título: si sin él
   * cabrían las dos que hacen una Pieza y con él no cabe ninguna, el problema es el nombre y
   * no las Citas. Se pregunta **solo** cuando la selección se ha quedado corta, porque en el
   * caso normal la respuesta no interesa y la cuenta no es gratis.
   */
  const elTituloEstorba =
    entran.length < MINIMO_DE_CITAS && cuantasCaben(undefined) >= MINIMO_DE_CITAS;

  for (const sobrante of caben.slice(entran.length)) {
    fuera.push({
      slug: sobrante.cita.slug,
      /*
       * Corto a propósito, y es el único motivo que lo es: con una Colección de veinte se
       * repetiría quince veces, y una explicación repetida quince veces deja de leerse — con
       * ella se pierden de vista los motivos que sí son de esa Cita concreta. El porqué se dice
       * una vez, al pie del parte.
       *
       * Y sin «junto a las anteriores» cuando no hay ninguna anterior: con un título que se
       * come el lienzo no entra ni la primera, y decirle a la primera que no cabe junto a las
       * que la preceden es, además de falso, mandar a corregir la selección cuando lo que hay
       * que corregir es el nombre.
       */
      motivo:
        entran.length === 0
          ? 'no cabe en el lienzo, y tampoco cabría ninguna otra'
          : 'no cabe en el lienzo junto a las anteriores',
    });
  }

  /*
   * `fuera` sale en el orden declarado y no en el de los tres motivos: quien lee la salida
   * está mirando su fichero de Colección, y una lista que salta de la tercera a la décima y
   * vuelve a la quinta le obliga a reordenarla de cabeza. Los slugs de una Colección resuelta
   * no se repiten (`resolverColeccion` deduplica), así que la posición es única.
   */
  const posicion = new Map(coleccion.citas.map((c, i) => [c.slug, i]));
  fuera.sort((a, b) => (posicion.get(a.slug) ?? 0) - (posicion.get(b.slug) ?? 0));

  return {
    titulo: coleccion.nombre,
    citas: entran.map((e) => e.cita),
    enPieza: entran.map((e) => e.enPieza),
    fuera,
    sinResolver: coleccion.sinResolver,
    elTituloEstorba,
  };
}
