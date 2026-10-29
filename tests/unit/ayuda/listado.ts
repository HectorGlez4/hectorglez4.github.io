/**
 * Las Tarjetas de Cita de un listado construido, leídas del HTML de `dist/` — Historia 24.3.
 *
 * Un solo lector para todas las pruebas que miran la tarjeta: tres que la leían cada una a su
 * manera acabaron decodificando entidades solo en una, y un título con «&» o comillas habría
 * llegado como `&amp;` a las otras dos y fallado sin que la tarjeta estuviera mal.
 */

/** Lo que el HTML de Astro escapa en un texto. */
export function decodificar(s: string): string {
  return s
    .replaceAll('&quot;', '"')
    .replaceAll('&#34;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

export interface TarjetaLeida {
  slug: string;
  zona: string | undefined;
  /** Cuántos `<a` hay en el `<li>`: tiene que ser uno. */
  enlaces: number;
  /** Las clases de los `span` del enlace, en orden, pausas incluidas. */
  clases: string[];
  /** Las partes visibles: los `span` que no son `.solo-para-lectores`, con el texto decodificado. */
  visibles: { clase: string; texto: string }[];
  /** Lo que oye el lector: el texto entero del enlace, con las pausas, espacios colapsados. */
  lector: string;
  /** Lo que queda del enlace al quitar los `span` sin anidar: tiene que ser nada. */
  resto: string;
}

/** El contenido del `ul.listado` de una página; lanza si la página no lo tiene. */
export function listadoDe(pagina: string, ruta: string): string {
  const listado = /<ul class="listado"[^>]*>([\s\S]*?)<\/ul>/.exec(pagina)?.[1];
  if (listado === undefined) throw new Error(`${ruta}: sin \`ul.listado\``);
  return listado;
}

/**
 * Las Tarjetas del `ul.listado` de una página, en su orden. Lanza si la página no tiene listado
 * o si una tarjeta no es un solo enlace a una Página de Cita.
 */
export function tarjetasDelListado(pagina: string, ruta: string): TarjetaLeida[] {
  return tarjetasDe(listadoDe(pagina, ruta), ruta);
}

/**
 * Las Tarjetas de Cita de un trozo de HTML —el contenido de un `ul`—, en su orden. Lanza si una
 * tarjeta no es un solo enlace a una Página de Cita. La comparten el listado y las Rutas de salida
 * de la Página de Cita (Historia 24.6), que pintan la misma tarjeta.
 */
export function tarjetasDe(listado: string, ruta: string): TarjetaLeida[] {
  return [...listado.matchAll(/<li class="tarjeta"([^>]*)>([\s\S]*?)<\/li>/g)].map(([, atributos, dentro]) => {
    const enlace = /^\s*<a href="\/cita\/([^/"]+)\/"[^>]*>([\s\S]*?)<\/a>\s*$/.exec(dentro);
    if (enlace === null) throw new Error(`${ruta}: la tarjeta no es un solo enlace a una Cita: ${dentro}`);
    const SPAN = /<span class="([^"]+)"[^>]*>([^<]*)<\/span>/g;
    const spans = [...enlace[2].matchAll(SPAN)].map(([, clase, texto]) => ({ clase, texto: decodificar(texto) }));
    return {
      slug: decodificar(enlace[1]),
      zona: /data-zona="([^"]+)"/.exec(atributos)?.[1],
      enlaces: (dentro.match(/<a\b/g) ?? []).length,
      clases: spans.map((s) => s.clase),
      visibles: spans.filter((s) => s.clase !== 'solo-para-lectores'),
      lector: spans
        .map((s) => s.texto)
        .join('')
        .replace(/\s+/g, ' ')
        .trim(),
      resto: enlace[2].replace(SPAN, ''),
    };
  });
}

/** El título que pinta la línea de Obra de una tarjeta, o `undefined` si no la lleva. */
export function obraDeLaTarjeta(tarjeta: TarjetaLeida): string | undefined {
  return tarjeta.visibles.find((v) => v.clase === 'obra')?.texto;
}
