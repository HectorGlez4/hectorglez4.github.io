import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  caracterDe,
  rutaDeAutor,
  rutaDeCita,
  rutaDeColeccion,
  rutaDePagina,
  rutaDeTema,
  superficieDeclaradaDe,
} from '../../src/lib/superficies.ts';

/**
 * La barra final es parte de la ruta, y la ruta la construye un solo sitio.
 *
 * El hospedaje sirve `foo/index.html`, así que `/foo/` responde y `/foo` llega con un 301.
 * Mientras la canónica, el sitemap y los enlaces internos se escribieran sin barra, el
 * sitio se anunciaba en la forma que **no** sirve directa: cada enlace interno pagaba un
 * salto y la canónica apuntaba a una URL que redirige. Que la forma sea una sola no puede
 * depender de que nadie escriba la otra a mano, y de ahí las dos puertas de este fichero:
 * los constructores la ponen, y ninguna plantilla compone rutas sin pasar por ellos.
 */

const raiz = resolve(import.meta.dirname, '../..');

describe('la ruta canónica lleva barra final', () => {
  it('el constructor de cada superficie la pone', () => {
    expect(rutaDeCita('seneca-el-tiempo')).toBe('/cita/seneca-el-tiempo/');
    expect(rutaDeAutor('seneca')).toBe('/autor/seneca/');
    expect(rutaDeTema('la-vida')).toBe('/tema/la-vida/');
    expect(rutaDeColeccion('refranes-de-sancho')).toBe('/coleccion/refranes-de-sancho/');
  });

  it('la primera página de un listado no lleva número', () => {
    // El número es lo que distingue la continuación, y la primera no es una continuación:
    // `/tema/la-vida/1/` sería una segunda URL para lo que ya publica `/tema/la-vida/`.
    expect(rutaDeTema('la-vida', 1)).toBe('/tema/la-vida/');
    expect(rutaDeAutor('seneca', 1)).toBe('/autor/seneca/');
    expect(rutaDeColeccion('cuatro-mujeres', 1)).toBe('/coleccion/cuatro-mujeres/');
  });

  it('la continuación lleva el número y conserva la barra', () => {
    expect(rutaDeTema('la-vida', 2)).toBe('/tema/la-vida/2/');
    expect(rutaDeAutor('seneca', 3)).toBe('/autor/seneca/3/');
    expect(rutaDeColeccion('cuatro-mujeres', 2)).toBe('/coleccion/cuatro-mujeres/2/');
  });

  it('la paginación numera sobre una base que ya acaba en barra', () => {
    /*
     * `Paginacion.astro` no sabe de qué familia es el listado: solo tiene la base que le
     * da Astro. Componía `${base}/${n}`, que con la base acabada en barra da
     * `/tema/la-vida//2` — una ruta que nadie declara y que el hospedaje no sirve.
     */
    expect(rutaDePagina('/tema/la-vida/', 1)).toBe('/tema/la-vida/');
    expect(rutaDePagina('/tema/la-vida/', 3)).toBe('/tema/la-vida/3/');
    expect(rutaDePagina('/tema/la-vida/', 3)).not.toContain('//');
  });

  it('lo que construye cada constructor lo reconoce la superficie que lo declara', () => {
    // La puerta que impide que constructor y `reconoce` se separen: renombrar una carpeta
    // de `src/pages/` sin tocar su declaración deja el build en verde y el enlace en 404.
    for (const ruta of [
      rutaDeCita('seneca-el-tiempo'),
      rutaDeAutor('seneca'),
      rutaDeAutor('seneca', 2),
      rutaDeTema('la-vida'),
      rutaDeTema('la-vida', 2),
      rutaDeColeccion('cuatro-mujeres'),
      rutaDeColeccion('cuatro-mujeres', 2),
    ]) {
      expect(superficieDeclaradaDe(ruta), ruta).toBeDefined();
    }
  });

  it('la continuación sigue degradándose a servicio con la barra puesta', () => {
    // `noPublicableEn` se escribió contra rutas sin barra. Si la normalización dejara de
    // quitarla, las páginas 2+ volverían al sitemap sin que nadie lo decidiera.
    expect(caracterDe(rutaDeTema('la-vida', 2))).toBe('servicio');
    expect(caracterDe(rutaDeTema('la-vida'))).toBe('producto');
  });
});

/**
 * Todo lo que escribe rutas: las plantillas y el núcleo.
 *
 * `src/lib/` entra porque de ahí salen tres cosas que también son URLs publicadas —el
 * RSS, los `@id` de los datos estructurados y la enumeración con la que se comprueba el
 * alcance—, y una barra de menos ahí no se ve en ninguna página.
 *
 * `tools/` entra por lo mismo, y no es hipotético: `tools/avisar.ts` componía a mano las
 * rutas que entrega a IndexNow tras cada despliegue, se quedó sin barra en la migración y
 * esta puerta no lo vio porque solo miraba `src/`. Una puerta que no alcanza a quien puede
 * romper el invariante no es una puerta.
 *
 * `superficies.ts` se excluye por ser donde viven los constructores: es el único sitio
 * donde componer la ruta a mano es exactamente lo correcto.
 */
const FUENTES = ['src', 'tools', 'integraciones'].map((d) => join(raiz, d));

function fuentesQueEnlazan(directorio: string): string[] {
  return readdirSync(directorio).flatMap((entrada) => {
    const camino = join(directorio, entrada);
    if (statSync(camino).isDirectory()) return fuentesQueEnlazan(camino);
    if (camino.endsWith('superficies.ts')) return [];
    return camino.endsWith('.astro') || camino.endsWith('.ts') ? [camino] : [];
  });
}

describe('nada compone una ruta interna a mano', () => {
  it('las cuatro familias de ruta salen siempre de su constructor', () => {
    /*
     * Se busca el literal —`/cita/${…}`— y no el resultado, porque el defecto que esto
     * cierra es de escritura: `href={`/cita/${cita.slug}`}` construye la forma sin barra,
     * responde con un 301 y nadie falla. Eran quince plantillas y tres módulos del núcleo.
     */
    const aMano = /[`'"]\/(cita|autor|tema|coleccion)\/\$\{/;
    const culpables = FUENTES.flatMap(fuentesQueEnlazan)
      .filter((camino) => aMano.test(readFileSync(camino, 'utf8')))
      .map((camino) => camino.slice(raiz.length + 1));

    expect(culpables).toEqual([]);
  });
});

describe('las superficies de ruta fija también la llevan', () => {
  it('ningún enlace ni `ruta=` literal se queda sin barra', () => {
    /*
     * Las cuatro familias salen de un constructor, pero `/buscar`, `/kit` y `/lote` son
     * rutas fijas escritas a mano y ningún constructor las cubre. Se quedaron sin barra al
     * migrar: la cabecera enlazaba a `/buscar` —un 301 en cada página del sitio— y el Lote
     * se declaraba canónico en `/lote`, que es la forma que redirige.
     *
     * Se excluye lo que no es una superficie del sitio: los enlaces externos, los
     * fragmentos y todo lo que trae extensión —`/favicon.svg`, `/rss.xml`—, que son
     * ficheros y se sirven tal cual. Y `/404`, que es la única página que el hospedaje
     * busca por su nombre de fichero en la raíz y por eso no vive en una carpeta.
     */
    /*
     * `action` entra junto a `href` y `ruta`: los dos formularios de búsqueda enviaban a
     * `action="/buscar"` y la puerta no los veía, así que la búsqueda sin JavaScript —la
     * que sale del `<form>`— entraba por la única forma que el sitio ya no anuncia.
     */
    const literales = /(?:href|ruta|action)=(?:"|\{')(\/[^"'#]*)(?:"|')/g;
    const sinBarra: string[] = [];

    for (const camino of FUENTES.flatMap(fuentesQueEnlazan)) {
      for (const [, ruta] of readFileSync(camino, 'utf8').matchAll(literales)) {
        if (ruta === '/' || ruta === '/404') continue;
        if (/\.[a-z0-9]+$/i.test(ruta)) continue;
        if (ruta.endsWith('/')) continue;
        sinBarra.push(`${camino.slice(raiz.length + 1)}: ${ruta}`);
      }
    }

    expect(sinBarra).toEqual([]);
  });
});
