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
 * Puro (AD-5): recibe el HTML y el sitemap ya leídos. Quien lee disco y detiene la
 * construcción es `integraciones/indexables.ts`.
 */

import { rutaNormalizada, superficieDeclaradaDe } from '../../src/lib/superficies.ts';

/** Lo que de una página construida importa para la comprobación. */
export interface PaginaIndexable {
  /** Ruta pública, normalizada: `/cita/x`, `/`, `/404`. */
  ruta: string;
  /** Lleva `<meta name="robots" content="noindex…">`. */
  noindex: boolean;
  /** Su `<main>` lleva `data-pagefind-body`: entra en la búsqueda propia. */
  enPagefind: boolean;
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

/** Las dos marcas que la comprobación lee de una página construida. */
export function marcasDePagina(html: string): Omit<PaginaIndexable, 'ruta'> {
  return {
    noindex: /<meta\s+name="robots"\s+content="noindex/iu.test(html),
    enPagefind: /<main\b[^>]*\sdata-pagefind-body(?=[\s=>])/iu.test(html),
  };
}

/** Las rutas que anuncia un sitemap, normalizadas. */
export function rutasDelSitemap(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((m) => rutaNormalizada(m[1].trim()));
}

/**
 * Lo que no coincide entre el sitemap, las páginas sin `noindex` y las que entran en Pagefind.
 *
 * Solo cuentan las páginas de una superficie **declarada**: las sonda que alguna prueba añade
 * al proyecto temporal no son superficies del sitio, el filtro del sitemap tampoco las anuncia,
 * y quien grita por una superficie sin declarar es el armazón. Devuelve las líneas del
 * informe, vacío si los tres conjuntos son el mismo.
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
  return lineas;
}

/** El titular del corte, cuando la comprobación falla. */
export function titularDeDesajustes(lineas: number): string {
  return (
    `El sitemap, los \`noindex\` y el índice de Pagefind no coinciden (${lineas} ` +
    `${lineas === 1 ? 'desajuste' : 'desajustes'}). Salen de la misma declaración de ` +
    'src/lib/superficies.ts y de la misma lista de rutas indexables: si discrepan, alguna ' +
    'instancia se construyó con otra lista. Ver el detalle arriba.'
  );
}

/** «N Obras publicadas, M indexables»: la línea base de SM-11 en el registro del build. */
export function informeDeObras(publicadas: number, indexables: number): string {
  return `${publicadas} ${publicadas === 1 ? 'Obra publicada' : 'Obras publicadas'}, ${indexables} ${
    indexables === 1 ? 'indexable' : 'indexables'
  }.`;
}
