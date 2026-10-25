/**
 * Lo indexable, comprobado sobre lo construido — Historia 22.4, FR-52.
 *
 * Una sola regla y muchos lectores: la página (`noindex`), el sitemap y la búsqueda propia
 * (`data-pagefind-body`) salen de la misma declaración de `src/lib/superficies.ts`, pero desde
 * la 22.4 esa declaración depende de una lista que se declara **dos veces**, una en cada
 * instancia del módulo —la de la configuración, que lee el filtro del sitemap, y la de las
 * páginas, que lee el armazón—. Que las dos digan lo mismo no se le confía a nadie: se mira en
 * el `dist/` de verdad, y si discrepan el build rompe nombrando las rutas.
 *
 * Desde la Historia 23.9 hay un cuarto lector: la marca de la vista de Obra, el atributo
 * `ATRIBUTO_DE_INDEXABLE` del `<html>` que el fichero de medición envía con `vista-de-obra`. Sale
 * de la misma `consecuenciasDe` que el `noindex` de esa página, y se coteja aquí con él, en la misma
 * lista de desajustes y con el mismo corte: toda página 1 de Obra la lleva, con un valor de
 * `MARCAS_DE_OBRA`; la indexable no lleva `noindex` y la otra sí; ninguna otra página la lleva; y
 * va siempre con la `vista-de-obra` en `data-vistas`, que es lo único que la envía.
 *
 * Puro (AD-5): recibe el HTML y el sitemap ya leídos. Quien lee disco y detiene la
 * construcción es `integraciones/indexables.ts`.
 */

import {
  esRutaDeObra,
  esServicioPorForma,
  rutaNormalizada,
  superficieDeclaradaDe,
} from '../../src/lib/superficies.ts';
import { ATRIBUTO_DE_INDEXABLE, EVENTOS } from '../../src/lib/medicion.ts';
import { MARCAS_DE_OBRA } from '../../src/lib/vocabulario.ts';

/** Las dos marcas de Obra, nombradas contra el vocabulario: la de la indexable y la de la que no. */
const [OBRA_INDEXABLE, OBRA_NO_INDEXABLE] = MARCAS_DE_OBRA;

/** Lo que de una página construida importa para la comprobación. */
export interface PaginaIndexable {
  /** Ruta pública, normalizada: `/cita/x`, `/`, `/404`. */
  ruta: string;
  /** Lleva `<meta name="robots" content="noindex…">`. */
  noindex: boolean;
  /** Su `<main>` lleva `data-pagefind-body`: entra en la búsqueda propia. */
  enPagefind: boolean;
  /**
   * El valor del atributo `ATRIBUTO_DE_INDEXABLE` de su `<html>`, tal cual —Historia 23.9—, o
   * ausente si no lo lleva. Se lee sin cotejar: decir si es una de `MARCAS_DE_OBRA` es de la
   * comprobación.
   */
  marcaDeObra?: string;
  /**
   * Las vistas del `data-vistas` de su `<html>` (Historia 23.1), o ausente si no lo lleva. Desde la
   * 23.9 la comprobación mira que la marca de Obra vaya con la `vista-de-obra`: la marca sola no se
   * envía con nada, y la vista sola sale con la marca nula.
   */
  vistas?: readonly string[];
}

/**
 * La ruta pública de un HTML de `dist/`, dado relativo a `dist/` y con `/`:
 * `cita/x/index.html` → `/cita/x`, `index.html` → `/`, `404.html` → `/404`.
 */
export function rutaDeFicheroHtml(relativa: string): string {
  const sinExtension = relativa.replace(/\.html$/u, '');
  const sinIndice = sinExtension === 'index' ? '' : sinExtension.replace(/\/index$/u, '');
  return rutaNormalizada(`/${sinIndice}`);
}

/**
 * Un atributo de la etiqueta `<html>`, con su valor entre comillas dobles, simples o sin ellas
 * —el build escribe las dobles, pero un desajuste no se nombra mal por cómo vinieran escritas—,
 * y vacío si va sin valor. El nombre se escapa: sale de una constante, no se escribe aquí.
 */
function atributoDelHtml(nombre: string): RegExp {
  const escapado = nombre.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`<html\\b[^>]*?\\s${escapado}(?:\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+)))?(?=[\\s/>])`, 'iu');
}

/** Lee el valor de un atributo del `<html>` con `atributoDelHtml`, o `undefined` si no lo lleva. */
function valorDelHtml(expresion: RegExp, html: string): string | undefined {
  const encontrado = expresion.exec(html);
  if (encontrado === null) return undefined;
  return encontrado[1] ?? encontrado[2] ?? encontrado[3] ?? '';
}

/** La marca de Obra en la etiqueta `<html>`. */
const MARCA_EN_EL_HTML = atributoDelHtml(ATRIBUTO_DE_INDEXABLE);
/** Las vistas que declara la etiqueta `<html>` (Historia 23.1). */
const VISTAS_EN_EL_HTML = atributoDelHtml('data-vistas');

/**
 * Las marcas que la comprobación lee de una página construida: su `noindex`, su entrada en
 * Pagefind y, desde la 23.9, la marca de Obra de su `<html>` y las vistas de su `data-vistas`,
 * que se omiten si no las lleva.
 */
export function marcasDePagina(html: string): Omit<PaginaIndexable, 'ruta'> {
  const marcaDeObra = valorDelHtml(MARCA_EN_EL_HTML, html);
  const vistas = valorDelHtml(VISTAS_EN_EL_HTML, html)?.split(/\s+/u).filter((v) => v !== '');
  return {
    noindex: /<meta\s+name="robots"\s+content="noindex/iu.test(html),
    enPagefind: /<main\b[^>]*\sdata-pagefind-body(?=[\s=>])/iu.test(html),
    ...(marcaDeObra === undefined ? {} : { marcaDeObra }),
    ...(vistas === undefined ? {} : { vistas }),
  };
}

/** Las rutas que anuncia un sitemap, normalizadas. */
export function rutasDelSitemap(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((m) => rutaNormalizada(m[1].trim()));
}

/**
 * Lo que no coincide entre el sitemap, las páginas sin `noindex`, las que entran en Pagefind y
 * —desde la Historia 23.9— la marca de Obra de cada página.
 *
 * Solo cuentan las páginas de una superficie **declarada**: las sonda que alguna prueba añade
 * al proyecto temporal no son superficies del sitio, el filtro del sitemap tampoco las anuncia,
 * y quien grita por una superficie sin declarar es el armazón. Devuelve las líneas del
 * informe, vacío si los tres conjuntos son el mismo y cada marca casa con su página.
 *
 * La marca de Obra se juzga en cinco clases: una página 1 de Obra (`esRutaDeObra` y no
 * `esServicioPorForma`) sin marca o con una que no es de `MARCAS_DE_OBRA`; una marca indexable con
 * `noindex`; una no indexable sin `noindex`; una marca en una página que no es la 1 de una Obra; y
 * una marca sin la `vista-de-obra` en `data-vistas`, o la vista sin la marca —salen de la misma
 * llamada a `consecuenciasDe`, y se cotejan por si alguna vez dejan de salir del mismo sitio: la
 * marca sola no la envía nada, y la vista sola sale con la marca nula—.
 */
export function desajustesDeIndexables(
  sitemap: readonly string[],
  paginas: readonly PaginaIndexable[],
): string[] {
  const declaradas = paginas.filter((p) => superficieDeclaradaDe(p.ruta) !== undefined);
  const enElSitemap = new Set(sitemap.map(rutaNormalizada));
  const sinNoindex = new Set(declaradas.filter((p) => !p.noindex).map((p) => p.ruta));
  const enPagefind = new Set(declaradas.filter((p) => p.enPagefind).map((p) => p.ruta));
  const construidas = new Set(declaradas.map((p) => p.ruta));

  const menos = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
    [...a].filter((r) => !b.has(r)).sort((x, y) => x.localeCompare(y, 'es'));

  const lineas: string[] = [];
  const nombrar = (titulo: string, rutas: readonly string[]) => {
    if (rutas.length > 0) lineas.push(`  · ${titulo}: ${rutas.join(', ')}`);
  };

  nombrar('en el sitemap y sin página construida', menos(enElSitemap, construidas));
  nombrar(
    'en el sitemap y con `noindex`',
    menos(enElSitemap, sinNoindex).filter((r) => construidas.has(r)),
  );
  nombrar('sin `noindex` y fuera del sitemap', menos(sinNoindex, enElSitemap));
  nombrar('en el sitemap y fuera de Pagefind', menos(enElSitemap, enPagefind).filter((r) => construidas.has(r)));
  nombrar('en Pagefind y fuera del sitemap', menos(enPagefind, enElSitemap));
  nombrar('sin `noindex` y fuera de Pagefind', menos(sinNoindex, enPagefind));
  nombrar('en Pagefind y con `noindex`', menos(enPagefind, sinNoindex));

  // Historia 23.9 — la marca de la vista de Obra, contra el `noindex` de su misma página.
  const ordenadas = (lista: readonly PaginaIndexable[]) =>
    lista.map((p) => p.ruta).sort((x, y) => x.localeCompare(y, 'es'));
  const esPrimeraDeObra = (p: PaginaIndexable) => esRutaDeObra(p.ruta) && !esServicioPorForma(p.ruta);
  const marcaValida = (marca: string | undefined) =>
    marca !== undefined && (MARCAS_DE_OBRA as readonly string[]).includes(marca);
  // Con lo que se encontró al lado de cada ruta: no es lo mismo un armazón que dejó de escribir el
  // atributo que uno que escribe un valor ajeno.
  nombrar(
    `página 1 de Obra sin marca \`${ATRIBUTO_DE_INDEXABLE}\` válida`,
    declaradas
      .filter((p) => esPrimeraDeObra(p) && !marcaValida(p.marcaDeObra))
      .sort((x, y) => x.ruta.localeCompare(y.ruta, 'es'))
      .map((p) => `${p.ruta} (${p.marcaDeObra === undefined ? 'sin el atributo' : `«${p.marcaDeObra}»`})`),
  );
  nombrar(
    `marca \`${OBRA_INDEXABLE}\` con \`noindex\``,
    ordenadas(declaradas.filter((p) => p.marcaDeObra === OBRA_INDEXABLE && p.noindex)),
  );
  nombrar(
    `marca \`${OBRA_NO_INDEXABLE}\` sin \`noindex\``,
    ordenadas(declaradas.filter((p) => p.marcaDeObra === OBRA_NO_INDEXABLE && !p.noindex)),
  );
  nombrar(
    'marca de Obra en una página que no es la 1 de una Obra',
    ordenadas(declaradas.filter((p) => p.marcaDeObra !== undefined && !esPrimeraDeObra(p))),
  );
  const conVistaDeObra = (p: PaginaIndexable) => p.vistas?.includes(EVENTOS.vistaDeObra) ?? false;
  nombrar(
    `marca de Obra y \`${EVENTOS.vistaDeObra}\` de \`data-vistas\` por separado`,
    declaradas
      .filter((p) => (p.marcaDeObra !== undefined) !== conVistaDeObra(p))
      .sort((x, y) => x.ruta.localeCompare(y.ruta, 'es'))
      .map((p) => `${p.ruta} (${p.marcaDeObra === undefined ? 'la vista sin la marca' : 'la marca sin la vista'})`),
  );
  return lineas;
}

/** El titular del corte, cuando la comprobación falla. */
export function titularDeDesajustes(lineas: number): string {
  return (
    `El sitemap, los \`noindex\`, el índice de Pagefind y la marca de Obra no coinciden (${lineas} ` +
    `${lineas === 1 ? 'desajuste' : 'desajustes'}). Salen de la misma declaración de ` +
    'src/lib/superficies.ts y de la misma lista de rutas indexables: si discrepan, alguna ' +
    'instancia se construyó con otra lista, o la marca de Obra no salió de `consecuenciasDe`. ' +
    'Ver el detalle arriba.'
  );
}

/** La línea del registro cuando la comprobación pasa: los cuatro lectores coinciden. */
export function informeDeCoincidencia(indexables: number): string {
  return `El sitemap, los \`noindex\`, Pagefind y la marca de Obra coinciden (${indexables} ${
    indexables === 1 ? 'ruta indexable' : 'rutas indexables'
  }).`;
}

/** «N Obras publicadas, M indexables»: la línea base de SM-11 en el registro del build. */
export function informeDeObras(publicadas: number, indexables: number): string {
  return `${publicadas} ${publicadas === 1 ? 'Obra publicada' : 'Obras publicadas'}, ${indexables} ${
    indexables === 1 ? 'indexable' : 'indexables'
  }.`;
}

/**
 * Los nombres de la congelación de Obras que no resuelven a ninguna ficha activa — Historia
 * 22.8. El build los nombra en un aviso y no rompe: una Obra absorbida o retirada después de
 * congelar simplemente no se indexa.
 */
export function nombresCongeladosSinFicha(
  congelacion: { indexables: readonly string[] },
  fichasActivas: readonly string[],
): string[] {
  const activas = new Set(fichasActivas);
  return congelacion.indexables.filter((nombre) => !activas.has(nombre));
}
