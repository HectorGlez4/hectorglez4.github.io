/**
 * De qué Autor es el slug de una Cita, sin que la Cita tenga que existir — el dueño
 * compartido de la regla del prefijo más largo.
 *
 * Nació privada en `tools/lib/gestion.ts`, para que retirar un Autor supiera de quién son los
 * miembros de Colección y las fijaciones de portada que ya no resuelven. La Historia 20.3 la
 * necesita también para atribuir la demanda medida: una ruta `/cita/<slug>/` de Search
 * Console puede ser de una Cita retirada desde entonces, y de ella solo dice algo el slug. Dos
 * copias de la misma regla divergen a la primera corrección, así que vive aquí y las dos
 * partes la importan.
 *
 * La regla: el slug de una Cita es `{slug-autor}-…`, así que su Autor es el slug de
 * `corpus/autores/` que, seguido de guion, sea prefijo del slug… y el **más largo** gana:
 * `seneca-el-viejo-la-fortuna` empieza por `seneca-` y no es de Séneca.
 */
export function autorPorPrefijo(
  slugDeCita: string,
  slugsDeAutores: readonly string[],
): string | undefined {
  let dueño: string | undefined;
  for (const slug of slugsDeAutores) {
    // Estricto: un slug de Cita igual al del Autor no es suyo — tiene que seguir algo tras el guion.
    if (slug === '' || !slugDeCita.startsWith(`${slug}-`)) continue;
    if (dueño === undefined || slug.length > dueño.length) dueño = slug;
  }
  return dueño;
}
