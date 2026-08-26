/**
 * Las dos cifras que cierran una sesión, medidas en vez de recordadas.
 *
 * Toda entrada del BITACORA acaba en una tabla de «antes» y «después». Durante tres sesiones esa
 * tabla llevó **cuatro Citas de más**, y el defecto no estuvo en ninguna herramienta: `huecos`
 * imprimía el número correcto todo el tiempo. Estuvo en el paso de en medio, que era aritmética
 * de memoria. Una sesión comprometió **dos veces** —cuatro Citas y luego ocho—, y al cerrar
 * escribió «llevo doce en la sesión», sumó doce sobre la base del **segundo** commit y contó dos
 * veces las cuatro primeras.
 *
 * Lo que hace ese error difícil de ver es que **mueve las dos columnas a la vez**: la tabla cuadra
 * consigo misma, y la sesión siguiente hereda el «después» equivocado como su «antes» sin notar
 * nada. Se propagó tres entradas.
 *
 * La cura no es acordarse mejor: es que el total de la sesión **no entre en la cuenta**. El
 * «antes» se lee de lo comprometido, el «después» del árbol, y la diferencia la saca la máquina.
 *
 * Aquí vive solo la parte pura —qué se cuenta y cómo se dice—, para que se pueda probar sin git
 * ni disco, igual que `tools/lib/cantera.ts` guarda la cuenta aparte de la descarga.
 */

/**
 * De una lista de rutas, las que son Citas.
 *
 * Existe por una diferencia de uno que costó una comprobación: `git ls-tree` devuelve además el
 * `.gitkeep` que mantiene viva la carpeta, y un `find -name '*.md'` no. Comparar las dos listas
 * en crudo da un desfase sin causa, que es justo lo que uno se pone a explicar en vez de medir.
 */
export function soloCitas(rutas: string[]): string[] {
  return rutas.filter((ruta) => ruta.endsWith('.md'));
}

/** Las líneas que se copian a la tabla del BITACORA. */
export function lineasDeCifras(antes: number, despues: number): string[] {
  const lineas = [`Citas comprometidas: ${antes}`, `Citas en el árbol:   ${despues}`];

  if (despues > antes) {
    lineas.push(`Diferencia:          +${despues - antes}`);
  } else if (despues < antes) {
    // Un número negativo se lee como una errata y se corrige a mano. Dicho con palabras, se mira.
    lineas.push(`Diferencia:          se han retirado ${antes - despues}`);
  } else {
    lineas.push('Diferencia:          sin cambio');
  }

  return lineas;
}
