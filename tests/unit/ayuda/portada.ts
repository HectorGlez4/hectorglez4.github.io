import { recorrerElementos, type Elemento } from './enlaces.js';

/** Un elemento de `main` con sus antepasados, del más lejano al más cercano. */
export interface EnMain {
  elemento: Elemento;
  antepasados: readonly Elemento[];
}

/** Lo que la portada construida expone a Pagefind, leído de su HTML — Historias 26.2 y 28.1. */
export interface ExposicionDeLaPortada {
  /** Todo elemento dentro de `main`. */
  enMain: EnMain[];
  /** Cuántos `h1` hay en `main`: desde la 28.1, ninguno. */
  titulosEnMain: number;
  /** Cuántos `h1` hay en la cabecera del armazón (`header.cabecera`): en la portada, uno, la marca. */
  titulosEnLaCabecera: number;
  /** El texto del `h1` de la cabecera, sin etiquetas dentro. */
  textoDelTituloDeLaCabecera: string | undefined;
  /** Cuántos elementos de `main` declaran `data-pagefind-meta="title:…"`: la portada, uno. */
  titulosDeclarados: number;
  /** El valor de `title:` que declara ese elemento, de donde saca Pagefind el título del resultado. */
  valorDelTitulo: string | undefined;
  /** El texto de ese elemento, que es lo único que Pagefind indexa de la portada. */
  textoDelTitulo: string | undefined;
  /** Si ese elemento lleva `hidden`: fuera de la vista y del árbol de accesibilidad. */
  tituloOculto: boolean;
  /** Los elementos de `main` que no son el título declarado y no caen bajo ninguna exclusión. */
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

/** El valor de `title:` de un `data-pagefind-meta`, si lo declara. */
const tituloDeclarado = (e: Elemento) => /^title:(.*)$/s.exec(e.atributos.get('data-pagefind-meta') ?? '')?.[1];

/** El texto de un fragmento de marcado, sin etiquetas y con los espacios colapsados. */
const textoDe = (marcado: string | undefined) => marcado?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/**
 * La portada responde solo por su título (AD-17, AD-19). Desde la 28.1 el `h1` es la marca de la
 * cabecera, fuera de `main`, y el título lo declara el armazón en un elemento de `main` con
 * `data-pagefind-meta="title:…"`: todo elemento de `main` que no sea ese cae bajo una exclusión. Se
 * comparte entre las construcciones que pintan cada rama de la portada —con Cita del Día y sin
 * ninguna Cita apta—, para que las dos se juzguen con la misma regla.
 */
export function exposicionDeLaPortada(html: string): ExposicionDeLaPortada {
  const enMain: EnMain[] = [];
  let titulosEnLaCabecera = 0;
  recorrerElementos(html, (elemento, antepasados) => {
    if (antepasados.some((a) => a.etiqueta === 'main')) enMain.push({ elemento, antepasados });
    const enLaCabecera = antepasados.some(
      (a) => a.etiqueta === 'header' && /(^|\s)cabecera(\s|$)/.test(a.atributos.get('class') ?? ''),
    );
    if (enLaCabecera && elemento.etiqueta === 'h1') titulosEnLaCabecera += 1;
  });
  const titulosEnMain = enMain.filter(({ elemento }) => elemento.etiqueta === 'h1').length;
  const declarados = enMain.filter(({ elemento }) => tituloDeclarado(elemento) !== undefined);
  const titulo = declarados[0];
  const fueraDelIndice = ({ elemento, antepasados }: EnMain) => [elemento, ...antepasados].some(ignora);
  const expuestos = enMain
    .filter(({ elemento }) => elemento !== titulo?.elemento)
    .filter((e) => !fueraDelIndice(e))
    .map(({ elemento }) => `<${elemento.etiqueta} class="${elemento.atributos.get('class') ?? ''}">`);
  const cabecera = /<header class="cabecera[^"]*"[^>]*>([\s\S]*?)<\/header>/.exec(html)?.[1];
  const textoDelTituloDeLaCabecera = textoDe(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(cabecera ?? '')?.[1]);
  // El texto del título declarado, con lo que lleve dentro.
  const crudo = /<main[\s\S]*?<[a-z]+\b[^>]*data-pagefind-meta="title:[^"]*"[^>]*>([\s\S]*?)<\/[a-z]+>/.exec(html)?.[1];
  return {
    enMain,
    titulosEnMain,
    titulosEnLaCabecera,
    textoDelTituloDeLaCabecera,
    titulosDeclarados: declarados.length,
    valorDelTitulo: titulo === undefined ? undefined : tituloDeclarado(titulo.elemento),
    textoDelTitulo: textoDe(crudo),
    tituloOculto: titulo?.elemento.atributos.has('hidden') ?? false,
    expuestos,
    fueraDelIndice,
  };
}

/** Los elementos de `main` con esa etiqueta y esa clase. */
export const conClase = (enMain: readonly EnMain[], etiqueta: string, clase: string) =>
  enMain.filter(
    ({ elemento }) =>
      elemento.etiqueta === etiqueta && new RegExp(`(^|\\s)${clase}(\\s|$)`).test(elemento.atributos.get('class') ?? ''),
  );
