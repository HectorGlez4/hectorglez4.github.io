/**
 * De quién es el slug de una Cita, sin que la Cita tenga que existir — el dueño compartido de
 * la regla del prefijo más largo.
 *
 * Nació privada en `tools/lib/gestion.ts`, para que retirar un Autor supiera de quién son los
 * miembros de Colección y las fijaciones de portada que ya no resuelven. La Historia 20.3 la
 * necesita también para atribuir la demanda medida: una ruta `/cita/<slug>/` de Search
 * Console puede ser de una Cita retirada desde entonces, y de ella solo dice algo el slug. Dos
 * copias de la misma regla divergen a la primera corrección, así que vive aquí y las dos
 * partes la importan.
 *
 * La regla: el slug de una Cita es `{slug-del-dueño}-…`, así que su dueño es el slug de
 * `corpus/autores/` **o** de `corpus/personajes/` que, seguido de guion, sea prefijo del slug…
 * y el **más largo** gana: `seneca-el-viejo-la-fortuna` empieza por `seneca-` y no es de
 * Séneca. Desde la Historia 35.2 (AD-4 v9.1) Autores y Personajes comparten un solo espacio de
 * slugs —el build rompe ante un slug de los dos—, así que el prefijo más largo se busca en la
 * unión, y el dueño dice de qué tipo es.
 */

/** El dueño de un slug de Cita: un Autor o un Personaje, por su slug. */
export interface DueñoPorPrefijo {
  tipo: 'autor' | 'personaje';
  slug: string;
}

/** Los slugs entre los que se busca el dueño. */
export interface SlugsDeDueños {
  autores: readonly string[];
  personajes?: readonly string[];
}

export function dueñoPorPrefijo(
  slugDeCita: string,
  { autores, personajes = [] }: SlugsDeDueños,
): DueñoPorPrefijo | undefined {
  let dueño: DueñoPorPrefijo | undefined;
  const candidatos: [DueñoPorPrefijo['tipo'], readonly string[]][] = [
    ['autor', autores],
    ['personaje', personajes],
  ];
  for (const [tipo, slugs] of candidatos) {
    for (const slug of slugs) {
      // Estricto: un slug de Cita igual al del dueño no es suyo — tiene que seguir algo tras el guion.
      if (slug === '' || !slugDeCita.startsWith(`${slug}-`)) continue;
      // A igual longitud (un slug de los dos, que el build rompe) gana el Personaje: se recorre
      // después y el empate lo sustituye.
      if (dueño === undefined || slug.length > dueño.slug.length || (slug.length === dueño.slug.length && tipo === 'personaje')) {
        dueño = { tipo, slug };
      }
    }
  }
  return dueño;
}
