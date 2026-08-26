/**
 * Qué obra de un Autor ya admitido queda sin recuperar — Historia 11.1.
 *
 * El bucle invierte sesiones enteras en recuperar y sembrar, y esta cuenta es la que decide **en
 * qué obra**. Ha salido mal tres veces, cada una con otro disfraz:
 *
 *   · en la 62.ª se cruzaba **por el nombre de la obra**: inventaba obras ya recuperadas y se
 *     perdía las que la Fuente titula de otro modo. Costó doce sesiones de «la cantera está
 *     agotada» que no lo estaba;
 *   · en la 96.ª contaba una obra como intacta porque su **página raíz de 1 KB** no estaba
 *     versionada, aunque ya se hubieran sembrado ocho de sus catorce capítulos: decía cantera
 *     entera donde quedaba menos de la mitad;
 *   · y las tres veces la cuenta vivía en un guion de usar y tirar, sin una sola prueba, así que
 *     cada arreglo empezaba de cero y traía su propio defecto.
 *
 * **La red no vive aquí, y no es un descuido.** AD-22 la deja solo en la cáscara exterior de
 * `tools/`, con tres excepciones escritas, y su propia prueba dice que ampliarla es una decisión.
 * No hace falta tomarla para arreglar esto: lo que ha fallado siempre es la cuenta, nunca la
 * descarga. Así que aquí está la cuenta —pura, probada y sin pedir nada—, y quien tenga las
 * páginas se las pasa. Es la misma división que `tools/lib/documento.ts` guarda respecto de
 * `tools/recuperar.ts`.
 */

/**
 * Por debajo de esto, una página de obra es su **índice** y no su texto.
 *
 * Tiene nombre porque es un juicio, no una constante de la naturaleza: en Wikisource la página
 * raíz de una obra con capítulos trae una tabla de enlaces y poco más, y ronda el kilobyte,
 * mientras que la página que trae texto de verdad pesa decenas. Dos kilobytes deja sitio de sobra
 * a un índice largo sin llegar a confundirse con un capítulo corto.
 */
export const ES_INDICE_POR_DEBAJO_DE = 2048;

/** Una página tal y como la Fuente la lista: su título y lo que pesa. */
export interface PaginaDeLaFuente {
  titulo: string;
  bytes: number;
}

/** Una página con texto que todavía no se ha versionado. */
export interface PaginaSuelta {
  clase: 'suelta';
  titulo: string;
  bytes: number;
}

/** Una obra con capítulos, contada por sus capítulos y no por su índice. */
export interface ObraConCapitulos {
  clase: 'índice';
  titulo: string;
  capitulos: number;
  versionados: number;
  agotada: boolean;
}

export type TrozoDeCantera = PaginaSuelta | ObraConCapitulos;

/**
 * La dirección de una página, escrita como la escribe la Fuente.
 *
 * Es el único sitio donde se convierte título en dirección, y por eso el cruce no puede volver a
 * hacerse por el nombre: quien quiera comparar, compara direcciones.
 */
export function urlDeLaPagina(titulo: string): string {
  return `https://es.wikisource.org/wiki/${titulo.replaceAll(' ', '_')}`;
}

/**
 * Qué queda por recuperar, ordenado por lo que conviene mirar antes.
 *
 * `versionadas` son las direcciones que el Corpus ya tiene; `capitulosDe` dice, para las obras que
 * los tengan, cuáles son sus capítulos. De una obra sin entrada en ese mapa no se sabe si tiene
 * capítulos, y entonces se dice lo único que se sabe —que su página no está versionada— en vez de
 * callar: callar sería ni decir que falta ni decir cuánto falta.
 */
export function estadoDeLaCantera(
  paginas: PaginaDeLaFuente[],
  versionadas: ReadonlySet<string>,
  capitulosDe: ReadonlyMap<string, string[]>,
): TrozoDeCantera[] {
  const queda: TrozoDeCantera[] = [];

  for (const pagina of [...paginas].sort((a, b) => b.bytes - a.bytes)) {
    if (versionadas.has(urlDeLaPagina(pagina.titulo))) continue;

    /*
     * Solo cuenta como capítulo lo que **cuelga de la obra**, y la guarda está aquí y no en quien
     * llena el mapa por una razón medida: la cáscara pedía los capítulos con la búsqueda por
     * prefijo de la Fuente, que es difusa e ignora la barra, así que preguntando por «Ariel/»
     * devolvía «Abel Sánchez», «Abril» y «Árboles». La sonda anunció **50 capítulos** de una obra
     * que tiene seis partes.
     *
     * Contar de más es peor que contar de menos: manda a recuperar obra que no existe.
     */
    const capitulos = (capitulosDe.get(pagina.titulo) ?? []).filter((c) =>
      c.startsWith(`${pagina.titulo}/`),
    );
    if (pagina.bytes < ES_INDICE_POR_DEBAJO_DE && capitulos.length > 0) {
      const versionados = capitulos.filter((c) => versionadas.has(urlDeLaPagina(c))).length;
      queda.push({
        clase: 'índice',
        titulo: pagina.titulo,
        capitulos: capitulos.length,
        versionados,
        agotada: versionados === capitulos.length,
      });
      continue;
    }

    queda.push({ clase: 'suelta', titulo: pagina.titulo, bytes: pagina.bytes });
  }

  return queda;
}
