import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MARCA } from '../../src/lib/marca.ts';
import { FAMILIAS } from '../../src/lib/superficies.ts';
import {
  ETIQUETAS_DE_RESULTADO,
  FILTRO_DE_TIPO,
  OPCIONES_DE_PAGEFIND,
  FILTROS_DE_CITA,
  ORDEN_DE_CITA,
  TIPO_POR_OMISION,
  TIPOS_CON_LINEA_DE_AUTOR,
  TIPOS_CON_TITULO_EN_SANS,
} from '../../src/lib/tipoDeResultado.ts';

/**
 * Historia 26.2 — el tipo de un resultado no casa como texto, y la portada tiene el suyo.
 *
 * Sin construir: la tabla, el medio por el que viaja el tipo y las opciones con que la búsqueda
 * configura Pagefind tienen un solo dueño, `src/lib/tipoDeResultado.ts`. Lo que sale en `dist/`
 * lo miran `publicable-y-alcanzable.test.ts` y `medicion.test.ts`; lo que devuelve el índice de
 * verdad, `tests/e2e/busqueda.spec.ts`.
 */

const RAIZ = resolve(import.meta.dirname, '../..');

/** Todo `.ts`, `.astro`, `.js` y `.mjs` de un directorio del repositorio, con su ruta relativa. */
async function ficheros(directorio: string): Promise<string[]> {
  const entradas = await readdir(join(RAIZ, directorio), { recursive: true, withFileTypes: true });
  return entradas
    .filter((e) => e.isFile() && /\.(ts|astro|js|mjs)$/u.test(e.name))
    .map((e) => {
      const padre =
        (e as { parentPath?: string }).parentPath ?? (e as { path?: string }).path ?? join(RAIZ, directorio);
      return join(padre, e.name).slice(RAIZ.length + 1).split('\\').join('/');
    });
}

/** El código de un fichero sin sus comentarios: los docblocks nombran el medio viejo, entre tildes. */
const sinComentarios = (fuente: string) =>
  fuente
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/** Un `data-pagefind-meta` cuyo valor —literal o expresión— nombra el tipo. */
const META_CON_TIPO = /data-pagefind-meta\s*=\s*(?:"[^"]*\btipo\b[^"]*"|'[^']*\btipo\b[^']*'|\{[^}]*\btipo\b[^}]*\})/u;

describe('Historia 26.2 — la tabla de tipos de resultado', () => {
  it('son las seis familias más la portada, con sus rótulos', () => {
    expect(ETIQUETAS_DE_RESULTADO).toEqual({
      cita: 'Cita',
      autor: 'Autor',
      tema: 'Tema',
      coleccion: 'Colección',
      obra: 'Obra',
      directorio: 'Directorio',
      portada: 'Portada',
    });
    expect(TIPO_POR_OMISION).toBe('cita');
    // Historia 26.7 — los tipos son las familias con resultado (`FAMILIAS`, su único dueño) más
    // `portada`. Como conjunto: el orden de `FAMILIAS` es el de los informes de las series y no
    // decide el de la tabla de `/buscar/`.
    expect(Object.keys(ETIQUETAS_DE_RESULTADO).sort()).toEqual([...FAMILIAS, 'portada'].sort());
  });

  it('el rótulo de la portada no repite la marca: su título sale del `h1`', () => {
    expect(ETIQUETAS_DE_RESULTADO.portada).not.toContain(MARCA);
    expect(MARCA).not.toContain(ETIQUETAS_DE_RESULTADO.portada);
  });

  it('Obra, Directorio y Portada llevan el título en la sans, y nadie más', () => {
    expect([...TIPOS_CON_TITULO_EN_SANS].sort()).toEqual(['directorio', 'obra', 'portada']);
    for (const tipo of TIPOS_CON_TITULO_EN_SANS) expect(Object.keys(ETIQUETAS_DE_RESULTADO)).toContain(tipo);
  });

  it('las opciones de Pagefind: `autor` pesa 0; ni el tipo ni `title` se nombran', () => {
    expect(OPCIONES_DE_PAGEFIND).toEqual({ ranking: { metaWeights: { autor: 0 } } });
    const pesos = OPCIONES_DE_PAGEFIND.ranking.metaWeights as Record<string, number>;
    expect(pesos).not.toHaveProperty(FILTRO_DE_TIPO);
    expect(pesos).not.toHaveProperty('tipo');
    expect(pesos).not.toHaveProperty('title');
  });

  it('el tipo viaja por el filtro `tipo`', () => {
    expect(FILTRO_DE_TIPO).toBe('tipo');
  });
});

describe('Historia 26.2 — un solo emisor y un solo lector del tipo', () => {
  it('en `src/`, `FILTRO_DE_TIPO` solo lo usan `Armazon.astro` (escribe) y `buscar.astro` (lee)', async () => {
    const usan: string[] = [];
    for (const fichero of await ficheros('src')) {
      if (fichero === 'src/lib/tipoDeResultado.ts') continue;
      const codigo = sinComentarios(await readFile(join(RAIZ, fichero), 'utf8'));
      if (/\bFILTRO_DE_TIPO\b/u.test(codigo)) usan.push(fichero);
    }
    expect(usan.sort()).toEqual(['src/components/Armazon.astro', 'src/pages/buscar.astro']);

    const armazon = sinComentarios(await readFile(join(RAIZ, 'src/components/Armazon.astro'), 'utf8'));
    expect(armazon).toMatch(/data-pagefind-filter=\{[^}]*\$\{FILTRO_DE_TIPO\}:\$\{tipo\}/u);
    const buscar = sinComentarios(await readFile(join(RAIZ, 'src/pages/buscar.astro'), 'utf8'));
    expect(buscar).toContain('FILTRO: FILTRO_DE_TIPO');
    expect(buscar).toContain('dato.filters?.[FILTRO]?.[0]');
  });

  it('ningún fichero de `src/` ni de `public/` escribe el tipo en un `data-pagefind-meta`', async () => {
    const conTipo: string[] = [];
    for (const fichero of [...(await ficheros('src')), ...(await ficheros('public'))]) {
      const codigo = sinComentarios(await readFile(join(RAIZ, fichero), 'utf8'));
      if (META_CON_TIPO.test(codigo)) conTipo.push(fichero);
    }
    expect(conTipo).toEqual([]);
  });

  it('`data-pagefind-filter` solo lo escriben `Armazon.astro` y `FiltrosDeLaCita.astro`, y solo `buscar.astro` configura Pagefind', async () => {
    // Un filtro escrito a mano en otra página, o en una isla, sería un segundo emisor del tipo
    // —o de los filtros de la Cita (27.1)— que las pruebas de `dist/` no atribuyen a nadie; y
    // unas opciones de Pagefind fuera de `OPCIONES_DE_PAGEFIND` serían un segundo sitio donde la
    // búsqueda pesa la metadata. La clave de orden la escribe solo `FiltrosDeLaCita.astro`.
    const filtran: string[] = [];
    const ordenan: string[] = [];
    const pesan: string[] = [];
    const configuran: string[] = [];
    for (const fichero of [...(await ficheros('src')), ...(await ficheros('public'))]) {
      const codigo = sinComentarios(await readFile(join(RAIZ, fichero), 'utf8'));
      if (/data-pagefind-filter/u.test(codigo)) filtran.push(fichero);
      if (/data-pagefind-sort/u.test(codigo)) ordenan.push(fichero);
      if (/\bmetaWeights\b/u.test(codigo)) pesan.push(fichero);
      if (/\.options\(/u.test(codigo)) configuran.push(fichero);
    }
    expect(filtran).toEqual(['src/components/Armazon.astro', 'src/components/FiltrosDeLaCita.astro']);
    expect(ordenan).toEqual(['src/components/FiltrosDeLaCita.astro']);
    expect(pesan).toEqual(['src/lib/tipoDeResultado.ts']);
    expect(configuran).toEqual(['src/pages/buscar.astro']);
    const buscar = sinComentarios(await readFile(join(RAIZ, 'src/pages/buscar.astro'), 'utf8'));
    expect(buscar.match(/\.options\(/gu)).toEqual(['.options(']);
    expect(buscar).toContain('pf.options(PAGEFIND)');
    expect(buscar).toContain('PAGEFIND: OPCIONES_DE_PAGEFIND');
  });

  it('el detector ve lo que tiene que ver', () => {
    expect(META_CON_TIPO.test('<main data-pagefind-meta="tipo:obra">')).toBe(true);
    expect(META_CON_TIPO.test('<main data-pagefind-meta={tipo ? `tipo:${tipo}` : undefined}>')).toBe(true);
    expect(META_CON_TIPO.test('<a data-pagefind-meta="autor">')).toBe(false);
    expect(sinComentarios('/** `data-pagefind-meta="tipo:…"` */ const x = 1;')).not.toMatch(META_CON_TIPO);
  });
});

/*
 * Historia 27.1, AD-11 — los filtros, el metadato y la clave de orden de la Cita los escribe un
 * solo componente, y solo en su Página de Cita: un segundo usuario los pondría en una página que
 * no es de Cita y los recuentos de `filters()` dejarían de ser los de `filtrosDeLaBusqueda`.
 */
describe('Historia 27.1 — `FiltrosDeLaCita` solo lo usa la Página de Cita', () => {
  it('lo importa solo `src/pages/cita/[slug].astro`', async () => {
    const importan: string[] = [];
    for (const fichero of [...(await ficheros('src')), ...(await ficheros('public'))]) {
      const codigo = sinComentarios(await readFile(join(RAIZ, fichero), 'utf8'));
      if (/\bFiltrosDeLaCita\.astro\b/u.test(codigo)) importan.push(fichero);
    }
    expect(importan).toEqual(['src/pages/cita/[slug].astro']);
  });

  it('los nombres de los filtros y de la clave, y los tipos con línea de Autor, tienen un solo dueño', async () => {
    expect(FILTROS_DE_CITA).toEqual({ autor: 'autor', obra: 'obra', tema: 'tema' });
    expect(ORDEN_DE_CITA).toBe('orden');
    expect([...TIPOS_CON_LINEA_DE_AUTOR].sort()).toEqual(['cita', 'obra']);
    // El metadato que pinta la línea pesa 0: lo declara `OPCIONES_DE_PAGEFIND`, no otra entrada.
    expect(OPCIONES_DE_PAGEFIND.ranking.metaWeights).toEqual({ autor: 0 });
    const componente = sinComentarios(await readFile(join(RAIZ, 'src/components/FiltrosDeLaCita.astro'), 'utf8'));
    expect(componente).toContain('FILTROS_DE_CITA.autor');
    expect(componente).toContain('ORDEN_DE_CITA');
    const buscar = sinComentarios(await readFile(join(RAIZ, 'src/pages/buscar.astro'), 'utf8'));
    expect(buscar).toContain('CON_AUTOR: TIPOS_CON_LINEA_DE_AUTOR');
  });
});
