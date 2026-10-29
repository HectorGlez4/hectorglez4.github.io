import { recorrerElementos, type Elemento } from './enlaces.js';

/** Un elemento de `main` con sus antepasados, del más lejano al más cercano. */
export interface EnMain {
  elemento: Elemento;
  antepasados: readonly Elemento[];
}

/** Lo que la portada construida expone a Pagefind, leído de su HTML — Historia 26.2. */
export interface ExposicionDeLaPortada {
  /** Todo elemento dentro de `main`. */
  enMain: EnMain[];
  /** Cuántos `h1` hay en `main`: la portada responde por uno solo. */
  titulos: number;
  /** El texto del `h1`, sin etiquetas dentro: de él saca Pagefind el título del resultado. */
  textoDelTitulo: string | undefined;
  /** Los elementos de `main` que no son el `h1` ni un antepasado suyo y no caen bajo ninguna exclusión. */
  expuestos: string[];
  /** Si el elemento, o un antepasado suyo, lo deja fuera del índice. */
  fueraDelIndice: (e: EnMain) => boolean;
}

/**
 * Lo que excluye del índice: `data-pagefind-ignore="all"`, o un Modelo de Ingreso (`data-ingreso`)
 * con su propio `data-pagefind-ignore` (la invitación de `Sostener.astro`).
 */
const ignora = (e: Elemento) =>
  e.atributos.get('data-pagefind-ignore') === 'all' ||
  (e.atributos.has('data-ingreso') && e.atributos.has('data-pagefind-ignore'));

/**
 * La portada responde solo por su `h1` (AD-17, AD-19): todo elemento de `main` que no sea el `h1`
 * ni un antepasado suyo cae bajo una exclusión. Se comparte entre las construcciones que pintan
 * cada rama de la portada —con Cita del Día y sin ninguna Cita apta—, para que las dos se juzguen
 * con la misma regla.
 */
export function exposicionDeLaPortada(html: string): ExposicionDeLaPortada {
  const enMain: EnMain[] = [];
  recorrerElementos(html, (elemento, antepasados) => {
    if (antepasados.some((a) => a.etiqueta === 'main')) enMain.push({ elemento, antepasados });
  });
  const titulos = enMain.filter(({ elemento }) => elemento.etiqueta === 'h1');
  const titulo = titulos[0];
  const deLaRuta = new Set<Elemento>(titulo?.antepasados ?? []);
  const fueraDelIndice = ({ elemento, antepasados }: EnMain) => [elemento, ...antepasados].some(ignora);
  const expuestos = enMain
    .filter(({ elemento }) => elemento !== titulo?.elemento && !deLaRuta.has(elemento))
    .filter((e) => !fueraDelIndice(e))
    .map(({ elemento }) => `<${elemento.etiqueta} class="${elemento.atributos.get('class') ?? ''}">`);
  // El texto, con lo que lleve dentro: un `<span>` en la marca no lo deja sin leer.
  const crudo = /<main[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1];
  const textoDelTitulo = crudo?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return { enMain, titulos: titulos.length, textoDelTitulo, expuestos, fueraDelIndice };
}

/** Los elementos de `main` con esa etiqueta y esa clase. */
export const conClase = (enMain: readonly EnMain[], etiqueta: string, clase: string) =>
  enMain.filter(
    ({ elemento }) =>
      elemento.etiqueta === etiqueta && new RegExp(`(^|\\s)${clase}(\\s|$)`).test(elemento.atributos.get('class') ?? ''),
  );
