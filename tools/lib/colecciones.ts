/**
 * La puerta de forma del **conjunto** de ficheros de Colección — Historia 12.2.
 *
 * El esquema de `src/content.config.ts` juzga un fichero de Colección a la vez: nombre,
 * criterio y miembros. Lo que ningún esquema puede ver es la relación **entre** ficheros,
 * y ahí hay un fallo que no avisa: dos ficheros que derivan el mismo identificador. El
 * cargador de Astro se queda con uno de los dos y el otro desaparece sin una sola línea
 * en la construcción, así que el editor cura una Colección que el sitio no publica.
 *
 * Pasa con más facilidad de la que parece: `a.yml` y `a.yaml` son el mismo identificador,
 * y `a.yml` y `sub/a.yml` lo son para cualquiera que dé por hecho que el slug es el nombre
 * del fichero. Este módulo fija **una sola regla** —el slug es la ruta dentro de
 * `corpus/colecciones/` sin extensión, que es literalmente el identificador de Astro— y
 * exige que sea plana y única.
 *
 * Puro y sin disco, como `tools/lib/cotejo.ts`: recibe las rutas ya leídas. Quien las lee
 * y quien detiene la construcción es `integraciones/colecciones.ts`.
 *
 * **No figura en la matriz de E/S de la especificación, y conviene decirlo.** La matriz
 * solo contempla que el build se aborte por un fichero de Colección incompleto —«sin
 * criterio o sin nombre»—, y esta puerta añade una forma nueva: un corpus en el que
 * **todos** los ficheros son válidos por separado puede quedar en rojo, porque el defecto
 * está en la relación entre dos. Lo mismo pasa con el aborto por YAML ilegible de
 * `leerColecciones`, que además ocurre **antes** de que el esquema llegue a dar su «Regla
 * incumplida»: quien escriba una llave sin cerrar recibe el fallo de esta capa y no el del
 * esquema. Las dos son deliberadas y las dos amplían el contrato; quedan escritas aquí para
 * que no se descubran leyendo un build en rojo.
 */

/** Una Colección vista como fichero: su ruta legible y el slug que deriva de ella. */
export interface FicheroDeColeccion {
  /** Ruta relativa a la raíz del repositorio, que es como se teclea. */
  ruta: string;
  /** El slug derivado, tal y como lo calcula `slugDeColeccion`. */
  slug: string;
}

/**
 * Los incumplimientos del conjunto, ya redactados. Lista vacía es «todo en orden».
 *
 * Se devuelven en vez de lanzarse para que la regla se pueda probar sin construir y para
 * que quien la aplique decida si corta o solo avisa — el build corta; el servidor de
 * desarrollo, no.
 */
export function fallosDeColecciones(ficheros: readonly FicheroDeColeccion[]): string[] {
  const fallos: string[] = [];

  const enSubdirectorio = ficheros.filter((f) => f.slug.includes('/'));
  for (const fichero of enSubdirectorio) {
    fallos.push(
      `  · ${fichero.ruta} → una Colección vive directamente en corpus/colecciones/, sin ` +
        `subdirectorios. Su identificador sería «${fichero.slug}», y la barra partiría la ` +
        'ruta /coleccion/{slug}. Muévala a la raíz del directorio.',
    );
  }

  const porSlug = new Map<string, FicheroDeColeccion[]>();
  for (const fichero of ficheros) {
    porSlug.set(fichero.slug, [...(porSlug.get(fichero.slug) ?? []), fichero]);
  }

  for (const [slug, repetidos] of [...porSlug].sort((a, b) => a[0].localeCompare(b[0], 'es'))) {
    if (repetidos.length < 2) continue;
    fallos.push(
      `  · «${slug}» lo declaran ${repetidos.length} ficheros: ` +
        `${repetidos.map((f) => f.ruta).join(', ')}. Dos ficheros con el mismo ` +
        'identificador son una sola Colección para el sitio, y el resto se pierde sin ' +
        'aviso. Deje uno y renombre los demás.',
    );
  }

  return fallos;
}

/** El texto que detiene la construcción. El detalle va aparte, por el registro. */
export function titularDeFallosDeColecciones(cuantos: number): string {
  return cuantos === 1
    ? 'Colecciones: 1 incumplimiento de forma en corpus/colecciones/.'
    : `Colecciones: ${cuantos} incumplimientos de forma en corpus/colecciones/.`;
}

export function formatearFallosDeColecciones(fallos: readonly string[]): string {
  return [
    'Hay ficheros de Colección que el sitio no publicaría como usted espera:',
    ...fallos,
    '',
  ].join('\n');
}
