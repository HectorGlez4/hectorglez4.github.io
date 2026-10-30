import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import {
  DIRECTORIO_DE_LOS_FILTROS,
  FICHEROS_QUE_ROTAN_CON_LA_JORNADA,
  MAPA_DE_OBRAS_EN_DIST,
  enMiB,
  errorDeLectura,
  medirDist,
  parteDePeso,
  veredictoDePeso,
  veredictoDePng,
  veredictoDeFiltrosYMapa,
  type FicheroDeDist,
  type UmbralesDePeso,
} from '../../tools/lib/peso.ts';
import { RUTA_DEL_MAPA_DE_OBRAS } from '../../src/lib/busqueda.ts';
import {
  AVISO_DE_BYTES_DE_FILTROS_Y_MAPA,
  AVISO_DE_PESO_DE_DIST,
  MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS,
  TECHO_DE_PESO_DEL_ALOJAMIENTO,
  TOPE_DE_PESO_DE_DIST,
  TOPE_DE_PNG_DE_DIST,
} from '../../src/lib/umbrales.ts';

/**
 * Historia 24.2 — el build avisa antes de que `dist/` llegue al techo del alojamiento.
 *
 * Las decisiones son puras (AD-5) y se prueban aquí sin disco ni construcción: el reparto de
 * `medirDist`, los dos veredictos con sus bordes y el parte. Que el paso de verdad las aplique
 * al `dist/` de una construcción, y que `npm run build` se detenga sobre el tope, lo mide
 * `tests/unit/peso-construido.test.ts` en una copia.
 */

const RAIZ = resolve(import.meta.dirname, '../..');

/** Un fichero de código sin sus comentarios, para que un comentario no cuente como código. */
const sinComentarios = (fuente: string): string =>
  fuente.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/(^|[^:])\/\/.*$/gmu, '$1');

/**
 * Los especificadores de un fichero: `import … from`, `export … from`, el `import '…'` de
 * efecto y el `import('…')` dinámico, con el `require('…')` de propina.
 */
function especificadoresDe(fuente: string): string[] {
  const patrones = [
    /^\s*(?:import|export)\b[^;'"]*?\bfrom\s+['"]([^'"]+)['"]/gmu,
    /^\s*import\s+['"]([^'"]+)['"]/gmu,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
  ];
  return patrones.flatMap((patron) => [...fuente.matchAll(patron)].map(([, especificador]) => especificador as string));
}

/**
 * Un especificador relativo, resuelto como lo resuelve Vite: tal cual si existe; un `.js`,
 * `.mjs` o `.jsx` que nombra un `.ts`, `.mts` o `.tsx`; sin extensión, con la que exista, o su
 * `index`. Devuelve la ruta absoluta, o la literal si nada existe.
 */
function resolverRelativo(desde: string, especificador: string, existe: (ruta: string) => boolean): string {
  const base = resolve(dirname(desde), especificador.replace(/[?#].*$/u, ''));
  const candidatos = [
    base,
    base.replace(/\.js$/u, '.ts'),
    base.replace(/\.mjs$/u, '.mts'),
    base.replace(/\.jsx$/u, '.tsx'),
    ...['.ts', '.mts', '.tsx', '.astro', '.js', '.mjs'].flatMap((ext) => [`${base}${ext}`, `${base}/index${ext}`]),
  ];
  return candidatos.find(existe) ?? base;
}

const esFichero = (ruta: string): boolean => existsSync(ruta) && statSync(ruta).isFile();

/**
 * Umbrales pequeños y legibles para los casos: aviso en 1.000 bytes, tope en 2.000; y el de los
 * filtros con el mapa (27.3), en 100.
 */
const UMBRALES: UmbralesDePeso = { aviso: 1_000, tope: 2_000, topeDePng: undefined, avisoDeFiltrosYMapa: 100 };

/** Un `dist/` cuyo único fichero juzgado pesa `bytes`, con lo que rota al lado. */
function distQueJuzga(bytes: number, rota = 10): FicheroDeDist[] {
  return [
    { ruta: 'cita/una/index.html', bytes },
    ...FICHEROS_QUE_ROTAN_CON_LA_JORNADA.map((ruta) => ({ ruta, bytes: rota })),
  ];
}

const juzgadoDe = (bytes: number, rota?: number) => medirDist(distQueJuzga(bytes, rota)).juzgado;

describe('Historia 24.2 — los umbrales del peso tienen nombre y se sostienen entre sí', () => {
  it('0 < aviso < tope < techo del alojamiento, en bytes enteros', () => {
    for (const valor of [AVISO_DE_PESO_DE_DIST, TOPE_DE_PESO_DE_DIST, TECHO_DE_PESO_DEL_ALOJAMIENTO]) {
      expect(Number.isInteger(valor), String(valor)).toBe(true);
    }
    expect(AVISO_DE_PESO_DE_DIST).toBeGreaterThan(0);
    expect(TOPE_DE_PESO_DE_DIST).toBeGreaterThan(AVISO_DE_PESO_DE_DIST);
    expect(TECHO_DE_PESO_DEL_ALOJAMIENTO).toBeGreaterThan(TOPE_DE_PESO_DE_DIST);
  });

  it('el techo es el 1 GB de GitHub Pages leído en decimal: no se sube para hacer sitio al tope', () => {
    expect(TECHO_DE_PESO_DEL_ALOJAMIENTO).toBe(1_000_000_000);
  });

  it('el tope de PNG está sin valor o es un entero positivo', () => {
    if (TOPE_DE_PNG_DE_DIST !== undefined) {
      expect(Number.isInteger(TOPE_DE_PNG_DE_DIST)).toBe(true);
      expect(TOPE_DE_PNG_DE_DIST).toBeGreaterThan(0);
    }
  });

  it('aviso y tope son números siempre, sin `undefined` ni valor por omisión', () => {
    const umbrales = readFileSync(resolve(RAIZ, 'src/lib/umbrales.ts'), 'utf8');
    expect(umbrales).toMatch(/^export const AVISO_DE_PESO_DE_DIST = [\d_* ]+;$/mu);
    expect(umbrales).toMatch(/^export const TOPE_DE_PESO_DE_DIST = [\d_* ]+;$/mu);
  });
});

describe('Historia 24.2 — medirDist reparte lo desplegado', () => {
  const listado: FicheroDeDist[] = [
    { ruta: 'index.html', bytes: 100 },
    { ruta: '404.html', bytes: 50 },
    { ruta: 'kit/index.html', bytes: 70 },
    { ruta: 'lote/index.html', bytes: 80 },
    { ruta: 'rss.xml', bytes: 30 },
    { ruta: 'cita/una/index.html', bytes: 1_000 },
    { ruta: 'tarjeta/una.png', bytes: 4_000 },
    { ruta: 'tarjeta/obra/seneca/cartas.png', bytes: 3_000 },
    { ruta: 'icono.PNG', bytes: 7 },
    { ruta: 'pagefind/pagefind.js', bytes: 500 },
    // Lo que cuelga del Kit o vive junto a la portada no rota: solo las rutas exactas.
    { ruta: 'kit/otra/index.html', bytes: 9 },
    { ruta: 'cita/index.html', bytes: 11 },
  ];
  const medida = medirDist(listado);

  it('lo desplegado es todo dist/, pagefind/ incluido', () => {
    expect(medida.desplegado).toEqual({ bytes: 8_857, ficheros: 12 });
  });

  it('lo que rota son exactamente los cinco ficheros de la jornada, aparte', () => {
    expect([...FICHEROS_QUE_ROTAN_CON_LA_JORNADA].sort()).toEqual(
      ['404.html', 'index.html', 'kit/index.html', 'lote/index.html', 'rss.xml'].sort(),
    );
    expect(medida.rotan).toEqual({ bytes: 330, ficheros: 5 });
  });

  it('lo juzgado es lo desplegado sin lo que rota, y cuenta los PNG dentro', () => {
    expect(medida.juzgado.bytes).toBe(8_857 - 330);
    expect(medida.juzgado.ficheros).toBe(7);
    expect(medida.juzgado.png).toBe(3);
  });

  it('las Tarjetas Sociales son la parte de tarjeta/ dentro de lo juzgado', () => {
    expect(medida.tarjetas).toEqual({ bytes: 7_000, ficheros: 2 });
  });

  it('el índice de búsqueda es la parte de pagefind/ dentro de lo juzgado', () => {
    expect(medida.pagefind).toEqual({ bytes: 500, ficheros: 1 });
  });

  it('con los cinco presentes, no falta ninguno', () => {
    expect(medida.rotanQueFaltan).toEqual([]);
  });

  it('el que rota y no está se nombra, y su página con otra ruta se juzga con el resto', () => {
    // El Kit construido como `kit.html` en vez de `kit/index.html`.
    const otra = medirDist([
      ...listado.filter(({ ruta }) => ruta !== 'kit/index.html'),
      { ruta: 'kit.html', bytes: 70 },
    ]);
    expect(otra.rotanQueFaltan).toEqual(['kit/index.html']);
    expect(otra.rotan).toEqual({ bytes: 260, ficheros: 4 });
    expect(otra.juzgado.bytes).toBe(medida.juzgado.bytes + 70);
    const rotan = parteDePeso(otra, UMBRALES).cifras[1];
    expect(rotan).toContain('en 4 ficheros (index.html, 404.html, lote/index.html, rss.xml).');
    expect(rotan).toContain('No están en dist/: kit/index.html');
    expect(rotan).toContain('FICHEROS_QUE_ROTAN_CON_LA_JORNADA');
    expect(parteDePeso(medida, UMBRALES).cifras[1]).not.toContain('No están');
  });

  it('un dist/ vacío mide cero en todo, y le faltan los cinco que rotan', () => {
    const vacia = medirDist([]);
    expect(vacia.desplegado).toEqual({ bytes: 0, ficheros: 0 });
    expect(vacia.juzgado.bytes).toBe(0);
    expect(vacia.juzgado.png).toBe(0);
    expect(vacia.pagefind).toEqual({ bytes: 0, ficheros: 0 });
    expect(vacia.rotanQueFaltan).toEqual(FICHEROS_QUE_ROTAN_CON_LA_JORNADA);
  });

  it('un veredicto no admite lo desplegado entero: solo lo juzgado que produce medirDist', () => {
    // @ts-expect-error — lo desplegado no es lo juzgado: el compilador lo rechaza.
    veredictoDePeso(medida.desplegado, UMBRALES);
    // @ts-expect-error — tampoco un número suelto.
    veredictoDePng(5, 1);
    expect(veredictoDePeso(medida.juzgado, { aviso: 10_000, tope: 20_000 })).toBe('por-debajo');
  });
});

describe('Historia 24.2 — el veredicto del peso, con sus bordes', () => {
  it.each([
    ['por debajo del aviso', 999, 'por-debajo'],
    ['igual al aviso: no avisa', 1_000, 'por-debajo'],
    ['un byte sobre el aviso: avisa', 1_001, 'aviso'],
    ['igual al tope: avisa y no rompe', 2_000, 'aviso'],
    ['un byte sobre el tope: rompe', 2_001, 'sobre-el-tope'],
  ] as const)('%s', (_caso, bytes, esperado) => {
    expect(veredictoDePeso(juzgadoDe(bytes), UMBRALES)).toBe(esperado);
  });

  it('dos jornadas que solo difieren en lo que rota dan la misma medida y el mismo veredicto', () => {
    // La otra jornada trae una portada que por sí sola pasa el tope: no cuenta.
    const hoy = medirDist(distQueJuzga(1_500, 10));
    const mañana = medirDist(distQueJuzga(1_500, UMBRALES.tope * 3));
    expect(mañana.juzgado).toEqual(hoy.juzgado);
    expect(mañana.desplegado.bytes).toBeGreaterThan(UMBRALES.tope);
    expect(veredictoDePeso(mañana.juzgado, UMBRALES)).toBe(veredictoDePeso(hoy.juzgado, UMBRALES));
    expect(parteDePeso(mañana, UMBRALES).avisos).toEqual(parteDePeso(hoy, UMBRALES).avisos);
    expect(parteDePeso(mañana, UMBRALES).error).toBeUndefined();
  });
});

describe('Historia 24.2 — el veredicto del número de PNG', () => {
  const conPng = (n: number) =>
    medirDist(Array.from({ length: n }, (_, i) => ({ ruta: `tarjeta/t${i}.png`, bytes: 1 }))).juzgado;

  it('sin tope no avisa: solo informa', () => {
    expect(veredictoDePng(conPng(5_000), undefined)).toBe('sin-tope');
  });

  it.each([
    ['por debajo', 3, 'dentro'],
    ['igual al tope: no avisa', 4, 'dentro'],
    ['por encima: avisa', 5, 'sobre-el-tope'],
  ] as const)('con tope 4, %s', (_caso, n, esperado) => {
    expect(veredictoDePng(conPng(n), 4)).toBe(esperado);
  });

  it('cuenta los PNG de lo juzgado, no los de lo que rota', () => {
    const medida = medirDist([
      { ruta: 'tarjeta/a.png', bytes: 1 },
      { ruta: 'index.html', bytes: 1 },
    ]);
    expect(medida.juzgado.png).toBe(1);
  });
});

describe('Historia 24.2 — el parte', () => {
  it('por debajo: las cifras y ningún aviso ni error', () => {
    const parte = parteDePeso(medirDist(distQueJuzga(500)), UMBRALES);
    expect(parte.avisos).toEqual([]);
    expect(parte.error).toBeUndefined();
    expect(parte.veredictos).toEqual({ peso: 'por-debajo', png: 'sin-tope', filtrosYMapa: 'sin-medir' });
  });

  it('las cifras dicen cuánto queda hasta el umbral siguiente, o cuánto se pasa del tope', () => {
    const juzgado = (bytes: number) => parteDePeso(medirDist(distQueJuzga(bytes)), UMBRALES).cifras[2];
    expect(juzgado(400)).toContain('quedan 600 bytes (<0,1 MiB) hasta el aviso.');
    expect(juzgado(1_000)).toContain('quedan 0 bytes (0 MiB) hasta el aviso.');
    expect(juzgado(1_500)).toContain('quedan 500 bytes (<0,1 MiB) hasta el tope.');
    expect(juzgado(2_000)).toContain('quedan 0 bytes (0 MiB) hasta el tope.');
    expect(juzgado(2_001)).toContain('pasa del tope en 1 byte (<0,1 MiB).');
  });

  it('un dist/ sin ningún fichero no pesa cero: no hay nada que medir, es un error y no da cifras', () => {
    const parte = parteDePeso(medirDist([]), UMBRALES);
    expect(parte.error).toContain('dist/ no trae ningún fichero');
    expect(parteDePeso(medirDist([]), UMBRALES, { anotar: true }).error).toMatch(/^::error::dist\/ no trae /u);
    // Ausencia antes que cero: ni «0 bytes» ni «quedan 1.000 bytes hasta el aviso», ni un
    // «por debajo» sobre nada.
    expect(parte.cifras).toEqual([]);
    expect(parte.avisos).toEqual([]);
    expect(parte.veredictos).toBeUndefined();
  });

  it('un dist/ que solo trae lo que rota tampoco pesa cero: no hay nada que juzgar', () => {
    const soloRotan = medirDist([
      { ruta: 'index.html', bytes: 5_000 },
      { ruta: 'rss.xml', bytes: 10 },
    ]);
    const parte = parteDePeso(soloRotan, UMBRALES);
    expect(parte.error).toContain('dist/ solo trae ficheros que rotan con la jornada (index.html, rss.xml)');
    expect(parte.error).toContain('no hay nada que juzgar');
    expect(parte.cifras).toEqual([]);
    expect(parte.avisos).toEqual([]);
    expect(parte.veredictos).toBeUndefined();
    // Con un solo fichero juzgado ya hay medida: cifras, veredicto y ningún error.
    const conUno = parteDePeso(medirDist(distQueJuzga(1)), UMBRALES);
    expect(conUno.error).toBeUndefined();
    // Historia 27.3 — la sexta, la de los filtros con el mapa.
    expect(conUno.cifras).toHaveLength(6);
    expect(conUno.veredictos).toEqual({ peso: 'por-debajo', png: 'sin-tope', filtrosYMapa: 'sin-medir' });
  });

  it('la primera línea dice si pagefind/ está, y no lo da por incluido cuando falta', () => {
    const sin = parteDePeso(medirDist(distQueJuzga(300)), UMBRALES).cifras[0];
    expect(sin).toContain('sin pagefind/');
    expect(sin).not.toContain('pagefind/ incluido');
    const con = parteDePeso(
      medirDist([...distQueJuzga(300), { ruta: 'pagefind/pagefind.js', bytes: 1 }]),
      UMBRALES,
    ).cifras[0];
    expect(con).toMatch(/, pagefind\/ incluido\.$/u);
  });

  it('las cifras dicen lo desplegado, lo que rota, lo juzgado, las Tarjetas y los PNG', () => {
    const medida = medirDist([
      ...distQueJuzga(300),
      { ruta: 'tarjeta/una.png', bytes: 200 },
      { ruta: 'pagefind/pagefind.js', bytes: 100 },
    ]);
    const cifras = parteDePeso(medida, UMBRALES).cifras.join('\n');
    expect(cifras).toContain('Peso de dist/: 650 bytes');
    expect(cifras).toContain('en 8 ficheros, pagefind/ incluido');
    expect(cifras).toContain('Rotan con la jornada, aparte: 50 bytes');
    expect(cifras).toContain('en 5 ficheros');
    for (const ruta of FICHEROS_QUE_ROTAN_CON_LA_JORNADA) expect(cifras).toContain(ruta);
    expect(cifras).toContain('Juzgado sin lo que rota: 600 bytes');
    expect(cifras).toContain('en 3 ficheros');
    expect(cifras).toContain('Tarjetas Sociales (tarjeta/): 200 bytes');
    expect(cifras).toContain('33,3 % de lo juzgado');
    expect(cifras).toMatch(/PNG: 1, sin tope \(TOPE_DE_PNG_DE_DIST no tiene valor\)/u);
  });

  it('las cifras no son un aviso: nunca llevan forma de aviso ni anotación', () => {
    const medida = medirDist(distQueJuzga(5_000));
    for (const anotar of [false, true]) {
      const { cifras } = parteDePeso(medida, { ...UMBRALES, topeDePng: 0 }, { anotar });
      for (const linea of cifras) {
        expect(linea).not.toMatch(/^(::|Aviso)/u);
      }
      expect(cifras).toEqual(parteDePeso(medida, { ...UMBRALES, topeDePng: 0 }).cifras);
    }
  });

  it('entre aviso y tope: avisa con peso, aviso y tope en bytes y MiB, y que no decide nada', () => {
    const parte = parteDePeso(medirDist(distQueJuzga(1_500)), UMBRALES);
    expect(parte.error).toBeUndefined();
    expect(parte.avisos).toHaveLength(1);
    const [aviso] = parte.avisos;
    expect(aviso).toContain('1.500 bytes (<0,1 MiB)');
    expect(aviso).toContain('1.000 bytes');
    expect(aviso).toContain('2.000 bytes');
    expect(aviso).toContain('AVISO_DE_PESO_DE_DIST');
    expect(aviso).toContain('TOPE_DE_PESO_DE_DIST');
    expect(aviso).toContain('src/lib/umbrales.ts');
    expect(aviso).toContain('no decide nada');
    expect(aviso).toContain('quedan 500 bytes (<0,1 MiB) hasta el tope');
    expect(aviso).toContain('lo decide Héctor');
    // La misma orden corre en local y en Playwright, donde no se despliega nada.
    expect(aviso).toContain('la construcción sigue y, en el flujo de publicación, se despliega');
  });

  it('sobre el tope: el error nombra el peso, el tope, la constante y el fichero', () => {
    const parte = parteDePeso(medirDist(distQueJuzga(2_001)), UMBRALES);
    expect(parte.avisos).toEqual([]);
    expect(parte.error).toContain('2.001 bytes');
    expect(parte.error).toContain('pasa el tope de 2.000 bytes (<0,1 MiB) en 1 byte (<0,1 MiB)');
    expect(parte.error).toContain('TOPE_DE_PESO_DE_DIST');
    expect(parte.error).toContain('src/lib/umbrales.ts');
    expect(parte.error).toContain('en el flujo de publicación el artefacto no se sube y sigue servido');
    // Como el aviso: dice qué hay sobre la mesa y quién decide, sin prescribir el remedio.
    expect(parte.error).toContain('lo decide Héctor');
    expect(parte.error).not.toMatch(/Se adelgaza|se cambia de alojamiento/u);
    expect(parte.veredictos?.peso).toBe('sobre-el-tope');
  });

  it('con los valores de Héctor, el error los escribe en MiB', () => {
    const umbrales = {
      aviso: AVISO_DE_PESO_DE_DIST,
      tope: TOPE_DE_PESO_DE_DIST,
      topeDePng: undefined,
      avisoDeFiltrosYMapa: AVISO_DE_BYTES_DE_FILTROS_Y_MAPA,
    };
    const parte = parteDePeso(medirDist(distQueJuzga(TOPE_DE_PESO_DE_DIST + 1)), umbrales);
    // A esta distancia el redondeo a MiB iguala las dos cifras: el exceso lo dice en bytes.
    expect(parte.error).toContain('943.718.401 bytes (900 MiB)');
    expect(parte.error).toContain('pasa el tope de 943.718.400 bytes (900 MiB) en 1 byte (<0,1 MiB)');
    const aviso = parteDePeso(medirDist(distQueJuzga(AVISO_DE_PESO_DE_DIST + 1)), umbrales).avisos[0];
    expect(aviso).toContain('786.432.000 bytes (750 MiB)');
  });

  it('el PNG sobre su tope avisa nombrando la constante, y no rompe', () => {
    const medida = medirDist([
      { ruta: 'tarjeta/a.png', bytes: 1 },
      { ruta: 'tarjeta/b.png', bytes: 1 },
    ]);
    const parte = parteDePeso(medida, { ...UMBRALES, topeDePng: 1 });
    expect(parte.error).toBeUndefined();
    expect(parte.avisos).toHaveLength(1);
    expect(parte.avisos[0]).toContain('TOPE_DE_PNG_DE_DIST');
    expect(parte.avisos[0]).toContain('2 PNG');
    expect(parte.cifras.join('\n')).toContain('PNG: 2, tope en 1.');
    expect(parteDePeso(medida, { ...UMBRALES, topeDePng: 2 }).avisos).toEqual([]);
  });

  it('en GitHub Actions el aviso y el error llevan su anotación delante', () => {
    const aviso = parteDePeso(medirDist(distQueJuzga(1_500)), UMBRALES, { anotar: true });
    expect(aviso.avisos[0]).toMatch(/^::warning::Aviso de peso: /u);
    const error = parteDePeso(medirDist(distQueJuzga(2_001)), UMBRALES, { anotar: true });
    expect(error.error).toMatch(/^::error::dist\/ pesa /u);
    // Una anotación es una línea: nada de saltos dentro.
    expect(`${aviso.avisos[0]}${error.error}`).not.toMatch(/[\r\n]/u);
  });

  it('fuera de GitHub Actions, sin anotación', () => {
    const parte = parteDePeso(medirDist(distQueJuzga(1_500)), UMBRALES, { anotar: false });
    expect(parte.avisos[0]).toMatch(/^Aviso de peso: /u);
  });

  it('no poder leer dist/ es un error, anotado en GitHub Actions como el del tope', () => {
    const motivo = "ENOENT: no such file or directory, scandir '/x/dist'";
    const llano = errorDeLectura('/x/dist', motivo, { anotar: false });
    expect(llano).toMatch(/^No se pudo medir el peso de dist\/ en \/x\/dist: ENOENT/u);
    const anotado = errorDeLectura('/x/dist', `${motivo}\nsegunda línea`, { anotar: true });
    expect(anotado).toMatch(/^::error::No se pudo medir el peso de dist\/ /u);
    expect(anotado).not.toMatch(/[\r\n]/u);
  });
});

describe('Historia 27.3 — los filtros de Pagefind con el mapa de rótulos, en el paso final', () => {
  /** Un `dist/` con los filtros (dos trozos) y el mapa de los tamaños que se digan. */
  const conFiltrosYMapa = (filtros: number, mapa: number | undefined): FicheroDeDist[] => [
    ...distQueJuzga(300),
    { ruta: 'pagefind/pagefind.js', bytes: 7 },
    { ruta: `${DIRECTORIO_DE_LOS_FILTROS}es_1.pf_filter`, bytes: filtros - Math.floor(filtros / 2) },
    { ruta: `${DIRECTORIO_DE_LOS_FILTROS}es_2.pf_filter`, bytes: Math.floor(filtros / 2) },
    ...(mapa === undefined ? [] : [{ ruta: MAPA_DE_OBRAS_EN_DIST, bytes: mapa }]),
  ];

  it('el aviso tiene nombre en `umbrales.ts`, es entero y múltiplo de 10 KiB, como el de `/obras/`', () => {
    expect(Number.isInteger(AVISO_DE_BYTES_DE_FILTROS_Y_MAPA)).toBe(true);
    expect(AVISO_DE_BYTES_DE_FILTROS_Y_MAPA % (10 * 1024)).toBe(0);
    expect(MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS % (10 * 1024)).toBe(0);
    expect(AVISO_DE_BYTES_DE_FILTROS_Y_MAPA).toBeGreaterThan(0);
    // El mapa del paso es la dirección que pide la isla, sin la barra.
    expect(`/${MAPA_DE_OBRAS_EN_DIST}`).toBe(RUTA_DEL_MAPA_DE_OBRAS);
  });

  it('`medirDist` cuenta los filtros —dentro de pagefind/— y el mapa, aparte', () => {
    const medida = medirDist(conFiltrosYMapa(60, 30));
    expect(medida.filtros).toEqual({ bytes: 60, ficheros: 2 });
    expect(medida.mapa).toEqual({ bytes: 30, ficheros: 1 });
    expect(medida.pagefind).toEqual({ bytes: 67, ficheros: 3 });
    expect(medirDist(distQueJuzga(300)).filtros).toEqual({ bytes: 0, ficheros: 0 });
  });

  it('una cifra con las dos partes, su suma y el aviso; por debajo o igualándolo, sin aviso', () => {
    const parte = parteDePeso(medirDist(conFiltrosYMapa(60, 40)), UMBRALES);
    const linea = parte.cifras.at(-1)!;
    expect(linea).toBe(
      'Filtros de Pagefind y mapa de Obras de /buscar/: filtros (pagefind/filter/) 60 bytes (0,1 KiB) en 2 ficheros; ' +
        'mapa (buscar/obras.json) 40 bytes (<0,1 KiB); suman 100 bytes (0,1 KiB); aviso en 100 bytes (0,1 KiB) ' +
        '(AVISO_DE_BYTES_DE_FILTROS_Y_MAPA).',
    );
    expect(parte.avisos).toEqual([]);
    expect(parte.veredictos?.filtrosYMapa).toBe('por-debajo');
  });

  it('por encima del aviso: avisa con las dos partes, la suma, la constante y quién decide, y no rompe', () => {
    for (const anotar of [false, true]) {
      const parte = parteDePeso(medirDist(conFiltrosYMapa(60, 41)), UMBRALES, { anotar });
      expect(parte.error).toBeUndefined();
      expect(parte.veredictos).toEqual({ peso: 'por-debajo', png: 'sin-tope', filtrosYMapa: 'aviso' });
      expect(parte.avisos).toHaveLength(1);
      const [aviso] = parte.avisos;
      expect(aviso).toMatch(anotar ? /^::warning::Aviso de filtros y mapa: /u : /^Aviso de filtros y mapa: /u);
      expect(aviso).not.toMatch(/[\r\n]/u);
      expect(aviso).toContain('(60 bytes');
      expect(aviso).toContain('(41 bytes');
      expect(aviso).toContain('suman 101 bytes');
      expect(aviso).toContain('AVISO_DE_BYTES_DE_FILTROS_Y_MAPA en src/lib/umbrales.ts');
      expect(aviso).toContain('No detiene la construcción');
      expect(aviso).toContain('lo decide Héctor');
      // La cifra no es un aviso.
      expect(parte.cifras.at(-1)).not.toMatch(/^(::|Aviso)/u);
    }
  });

  it('con los valores medidos del 2026-10-29 no avisa, y con un aviso por debajo de lo medido, sí', () => {
    const medido = medirDist(conFiltrosYMapa(52_625, 44_393));
    const umbrales = { ...UMBRALES, avisoDeFiltrosYMapa: AVISO_DE_BYTES_DE_FILTROS_Y_MAPA };
    expect(parteDePeso(medido, umbrales).avisos).toEqual([]);
    expect(parteDePeso(medido, { ...umbrales, avisoDeFiltrosYMapa: 97_017 }).avisos).toHaveLength(1);
    expect(veredictoDeFiltrosYMapa(medido, 97_018)).toBe('por-debajo');
    expect(veredictoDeFiltrosYMapa(medido, 97_017)).toBe('aviso');
  });

  it('si falta una de las dos partes, la cifra lo dice, no suma ni escribe cero, y no avisa', () => {
    const sinMapa = parteDePeso(medirDist(conFiltrosYMapa(500, undefined)), UMBRALES);
    expect(sinMapa.cifras.at(-1)).toContain('sin buscar/obras.json: no hay mapa de Obras que medir');
    expect(sinMapa.cifras.at(-1)).toContain('sin suma ni veredicto');
    expect(sinMapa.cifras.at(-1)).not.toMatch(/suman|(?<![\d.])0 bytes/u);
    expect(sinMapa.avisos).toEqual([]);
    expect(sinMapa.veredictos?.filtrosYMapa).toBe('sin-medir');
    const sinFiltros = parteDePeso(medirDist([...distQueJuzga(300), { ruta: MAPA_DE_OBRAS_EN_DIST, bytes: 500 }]), UMBRALES);
    expect(sinFiltros.cifras.at(-1)).toContain('sin pagefind/filter/: no hay filtros de Pagefind que medir');
    expect(sinFiltros.cifras.at(-1)).toContain('mapa (buscar/obras.json) 500 bytes');
    expect(sinFiltros.avisos).toEqual([]);
  });

  it('el aviso de los filtros no toca el veredicto del peso: sobre el tope sigue siendo error, y los dos se dicen', () => {
    const parte = parteDePeso(
      medirDist([...conFiltrosYMapa(600, 600), { ruta: 'cita/otra/index.html', bytes: 2_000 }]),
      UMBRALES,
    );
    expect(parte.veredictos).toEqual({ peso: 'sobre-el-tope', png: 'sin-tope', filtrosYMapa: 'aviso' });
    expect(parte.error).toBeDefined();
    expect(parte.avisos.some((a) => a.startsWith('Aviso de filtros y mapa'))).toBe(true);
  });
});

describe('Historia 24.2 — el formato de las cifras', () => {
  it.each([
    [0, '0 MiB'],
    // Lo que no llega a una décima sin ser cero no se escribe «0 MiB».
    [1, '<0,1 MiB'],
    [52_428, '<0,1 MiB'],
    [52_429, '0,1 MiB'],
    [466_839_655, '445,2 MiB'],
    [312_472_917, '298 MiB'],
    [AVISO_DE_PESO_DE_DIST, '750 MiB'],
    [TOPE_DE_PESO_DE_DIST, '900 MiB'],
    [1_024 * 1_024 * 1_500.5, '1.500,5 MiB'],
  ])('%d bytes son %s', (bytes, texto) => {
    expect(enMiB(bytes)).toBe(texto);
  });
});

describe('Historia 24.2 — el paso va al final de npm run build', () => {
  it('después de Astro y de Pagefind, en la orden que corren el CI y Playwright', () => {
    const paquete = JSON.parse(readFileSync(resolve(RAIZ, 'package.json'), 'utf8'));
    expect(paquete.scripts.build).toMatch(
      /^astro build && pagefind --site dist [^&]*&& tsx integraciones\/peso\.ts$/u,
    );
  });

  it('el flujo de publicación construye con npm run build antes de subir dist/, y sin saltárselo', () => {
    // La guarda solo protege si el despliegue construye con esa orden: un paso que llamara a
    // `astro build` y a Pagefind a pelo subiría `dist/` sin medirlo.
    const flujo = parsearYaml(readFileSync(resolve(RAIZ, '.github/workflows/publicar.yml'), 'utf8')) as {
      jobs: Record<string, { steps?: { run?: string; uses?: string; with?: { path?: string }; 'continue-on-error'?: unknown }[] }>;
    };
    const pasos = flujo.jobs.construir?.steps ?? [];
    const subida = pasos.findIndex((paso) => paso.uses?.startsWith('actions/upload-pages-artifact@'));
    const construir = pasos.findIndex((paso) => paso.run?.trim() === 'npm run build');
    expect(subida).toBeGreaterThan(-1);
    expect(pasos[subida]?.with?.path).toBe('dist');
    expect(construir).toBeGreaterThan(-1);
    expect(construir).toBeLessThan(subida);
    expect(pasos[construir]?.['continue-on-error']).toBeUndefined();
    for (const paso of pasos.slice(0, subida)) {
      expect(paso.run ?? '', 'un paso construye sin npm run build').not.toMatch(/\bastro build\b|\bpagefind\b/u);
    }
    // Entre la medida y la subida, nada que añada bytes a `dist/` sin medirlos: ningún paso
    // que nombre `dist` ni ninguna acción de terceros. Lo que haga por dentro `npm test` no se
    // ve desde aquí: sus pruebas construyen en copias temporales, nunca en el árbol.
    for (const paso of pasos.slice(construir + 1, subida)) {
      expect(paso.uses, `una acción entre la medida y la subida: ${paso.uses}`).toBeUndefined();
      expect(paso.run ?? '', 'un paso entre la medida y la subida toca dist/').not.toMatch(/\bdist\b/u);
    }
  });

  it('no es una integración de Astro ni mide en astro:build:done', () => {
    const paso = sinComentarios(readFileSync(resolve(RAIZ, 'integraciones/peso.ts'), 'utf8'));
    expect(paso).not.toMatch(/astro:build|AstroIntegration/u);
    const configuracion = readFileSync(resolve(RAIZ, 'astro.config.mjs'), 'utf8');
    expect(configuracion).not.toMatch(/integraciones\/peso/u);
  });

  it('el paso no escribe nada: de Node solo trae la lectura de disco y las rutas', () => {
    // El contrato: el paso no escribe y no usa la red, en `dist/` ni en ninguna otra parte. Lo
    // que importa de Node se ciñe a leer y a componer rutas, y lo demás que importa es lo puro
    // —la prueba de abajo— y los umbrales, que no importan nada.
    const codigo = sinComentarios(readFileSync(resolve(RAIZ, 'integraciones/peso.ts'), 'utf8'));
    const especificadores = especificadoresDe(codigo);
    expect(especificadores.filter((e) => !/^\.{1,2}\//u.test(e)).sort()).toEqual(['node:fs/promises', 'node:path']);
    expect(especificadores.filter((e) => /^\.{1,2}\//u.test(e)).sort()).toEqual([
      '../src/lib/umbrales.ts',
      '../tools/lib/peso.ts',
    ]);
    const deDisco = /^\s*import\s*\{([^}]*)\}\s*from\s*['"]node:fs\/promises['"]/mu.exec(codigo);
    expect(deDisco, 'node:fs/promises se importa por nombre, no entero').not.toBeNull();
    const nombres = (deDisco?.[1] ?? '').split(',').map((nombre) => nombre.trim()).filter((nombre) => nombre !== '');
    expect(nombres.length).toBeGreaterThan(0);
    for (const nombre of nombres) expect(['lstat', 'readdir', 'readlink', 'realpath', 'stat'], nombre).toContain(nombre);
    expect(codigo).not.toMatch(/\brequire\s*\(|\bimport\s*\(|\bfetch\s*\(/u);
    expect(especificadoresDe(sinComentarios(readFileSync(resolve(RAIZ, 'src/lib/umbrales.ts'), 'utf8')))).toEqual([]);
  });

  it('las decisiones viven en tools/lib/peso.ts, sin disco ni proceso, tampoco en lo que importa', () => {
    // Se sigue cada importación: un módulo puro que importa uno impuro no es puro. Solo se
    // admiten importaciones relativas —un paquete o un módulo de Node, con `node:` o sin él,
    // no se inspecciona y puede traer disco o red—, y en el código no hay proceso ni red.
    const vistos = new Set<string>();
    const pendientes = [resolve(RAIZ, 'tools/lib/peso.ts')];
    while (pendientes.length > 0) {
      const fichero = pendientes.pop() as string;
      if (vistos.has(fichero)) continue;
      vistos.add(fichero);
      const codigo = sinComentarios(readFileSync(fichero, 'utf8'));
      const nombre = relative(RAIZ, fichero);
      expect(codigo, nombre).not.toMatch(/\bprocess\b|\bglobalThis\b|\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/u);
      for (const especificador of especificadoresDe(codigo)) {
        expect(especificador, `${nombre} importa algo que no es relativo`).toMatch(/^\.{1,2}\//u);
        pendientes.push(resolverRelativo(fichero, especificador, esFichero));
      }
    }
    // Lo que trae hoy: el formato de cifras y el escapado de anotaciones, y nada del ingreso.
    expect([...vistos].map((fichero) => relative(RAIZ, fichero)).sort()).toEqual(
      ['src/lib/formato.ts', 'tools/lib/anotacion.ts', 'tools/lib/peso.ts'].sort(),
    );
  });
});

describe('Historia 24.2 — lo que rota con la jornada es lo que lee la jornada', () => {
  /** La página de `src/pages/` que pinta cada uno de los cinco ficheros que rotan. */
  const PAGINA_DE: Record<string, string> = {
    'src/pages/index.astro': 'index.html',
    'src/pages/404.astro': '404.html',
    'src/pages/kit.astro': 'kit/index.html',
    'src/pages/lote.astro': 'lote/index.html',
    'src/pages/rss.xml.ts': 'rss.xml',
  };

  /**
   * Los ficheros de código que pueden escribir en `dist/`: los de `src/` y los de
   * `integraciones/`, con la configuración de Astro, por su ruta relativa a la raíz.
   */
  const fuentes = [
    ...['src', 'integraciones'].flatMap((dir) =>
      readdirSync(resolve(RAIZ, dir), { recursive: true, encoding: 'utf8' })
        .filter((ruta) => /\.(astro|ts|mts|tsx|js|mjs)$/u.test(ruta))
        .map((ruta) => `${dir}/${ruta.split('\\').join('/')}`),
    ),
    'astro.config.mjs',
  ];

  /** Un paquete instalado en `node_modules/`: `astro/config` es de `astro`, `@astrojs/x/y` de `@astrojs/x`. */
  const esPaquete = (especificador: string): boolean => {
    const partes = especificador.split('/');
    const nombre = (especificador.startsWith('@') ? partes.slice(0, 2) : partes.slice(0, 1)).join('/');
    return (
      /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/u.test(nombre) &&
      existsSync(resolve(RAIZ, 'node_modules', nombre, 'package.json'))
    );
  };

  type Clase = { clase: 'proyecto'; ruta: string } | { clase: 'fuera' | 'desconocido' };

  /**
   * Qué es un especificador para la guarda. **Del proyecto**, y se sigue: uno relativo, o uno
   * absoluto desde la raíz (`/src/…`) que nombra un fichero, que Vite también resuelve. **De
   * fuera**, y no se sigue: un módulo de Node, uno virtual de Astro, un paquete de
   * `node_modules/` o una URL que el navegador pide al ejecutarse (`/islas/…`, `/pagefind/…`).
   * **Desconocido** todo lo demás —un alias como `~/lib/…`, `@/lib/…` o `#lib/…`, o un
   * `/src/…` que no existe—: la guarda no sabe adónde lleva, y lo dice en vez de perderlo.
   */
  function claseDe(desde: string, especificador: string): Clase {
    if (/^\.{1,2}\//u.test(especificador)) {
      return { clase: 'proyecto', ruta: relative(RAIZ, resolverRelativo(desde, especificador, esFichero)) };
    }
    if (especificador.startsWith('/')) {
      const ruta = resolverRelativo(resolve(RAIZ, 'raiz'), `.${especificador}`, esFichero);
      if (esFichero(ruta)) return { clase: 'proyecto', ruta: relative(RAIZ, ruta) };
      return /^\/(?:src|integraciones)\//u.test(especificador) ? { clase: 'desconocido' } : { clase: 'fuera' };
    }
    if (/^(?:node|astro|virtual):/u.test(especificador) || esPaquete(especificador)) return { clase: 'fuera' };
    return { clase: 'desconocido' };
  }

  /**
   * Las importaciones del proyecto de un fichero, resueltas como Vite, relativas a la raíz. Sin
   * quitar comentarios: un patrón de ficheros en una cadena —dos asteriscos, barra y
   * asterisco— parece abrir uno y se comería lo que sigue, y una importación
   * comentada que se cuente de más solo hace la guarda más estricta.
   */
  const importaciones = (fichero: string): string[] =>
    especificadoresDe(readFileSync(resolve(RAIZ, fichero), 'utf8')).flatMap((especificador) => {
      const clase = claseDe(resolve(RAIZ, fichero), especificador);
      return clase.clase === 'proyecto' ? [clase.ruta] : [];
    });

  it('las importaciones se resuelven como Vite: con .js por .ts, sin extensión, reexportadas y dinámicas', () => {
    const existentes = new Set(['/p/src/lib/citaDelDia.ts', '/p/src/lib/x/index.ts', '/p/src/lib/y.astro']);
    const existe = (ruta: string) => existentes.has(ruta);
    const fuente = [
      "import { citaDelDia } from '../lib/citaDelDia.js';",
      "export { citaDelDia as otra } from '../lib/citaDelDia.ts';",
      "import '../lib/x';",
      "const y = await import('../lib/y');",
      "import { z } from 'astro:content';",
    ].join('\n');
    expect(especificadoresDe(fuente).map((esp) => (esp.startsWith('.') ? resolverRelativo('/p/src/pages/hoy.astro', esp, existe) : esp)).sort()).toEqual(
      ['/p/src/lib/citaDelDia.ts', '/p/src/lib/citaDelDia.ts', '/p/src/lib/x/index.ts', '/p/src/lib/y.astro', 'astro:content'].sort(),
    );
  });

  it('las únicas superficies que dependen de la jornada son las cinco páginas de la lista', () => {
    // Lee la jornada quien lee FECHA_JORNADA o la portada, y quien importa —directa o
    // indirectamente— a uno de esos módulos.
    const leenLaJornada = new Set(
      fuentes.filter((fichero) =>
        /FECHA_JORNADA|corpus\/portada\.json/u.test(readFileSync(resolve(RAIZ, fichero), 'utf8')),
      ),
    );
    for (let creció = true; creció; ) {
      creció = false;
      for (const fichero of fuentes) {
        if (leenLaJornada.has(fichero)) continue;
        if (importaciones(fichero).some((importado) => leenLaJornada.has(importado))) {
          leenLaJornada.add(fichero);
          creció = true;
        }
      }
    }
    // Un módulo de `src/lib/`, un componente o una plantilla no escriben en `dist/` por sí
    // mismos: lo hace la página que los importa, que entra aquí por esa importación. Se
    // comparan solo los que escriben —páginas, integraciones y configuración—, para que llevar
    // la Cita del Día a un componente no pida meter el componente en una lista de `dist/`.
    const escribeEnDist = (fichero: string): boolean =>
      fichero.startsWith('src/pages/') || fichero.startsWith('integraciones/') || fichero === 'astro.config.mjs';
    const superficies = [...leenLaJornada].filter(escribeEnDist).sort();
    expect(superficies).toEqual(Object.keys(PAGINA_DE).sort());
    expect(Object.values(PAGINA_DE).sort()).toEqual([...FICHEROS_QUE_ROTAN_CON_LA_JORNADA].sort());
  });

  it('distingue lo que sigue, lo que es de fuera y lo que no sabe seguir', () => {
    const desde = resolve(RAIZ, 'src/pages/index.astro');
    expect(claseDe(desde, '../lib/citaDelDia.ts')).toEqual({ clase: 'proyecto', ruta: 'src/lib/citaDelDia.ts' });
    expect(claseDe(desde, '/src/lib/citaDelDia.ts')).toEqual({ clase: 'proyecto', ruta: 'src/lib/citaDelDia.ts' });
    for (const deFuera of ['node:fs', 'astro:content', 'astro/config', '@astrojs/sitemap', '/islas/imagen.js']) {
      expect(claseDe(desde, deFuera), deFuera).toEqual({ clase: 'fuera' });
    }
    for (const alias of ['~/lib/citaDelDia', '@/lib/citaDelDia', '#lib/citaDelDia', 'lib/citaDelDia', '/src/lib/no-existe.ts']) {
      expect(claseDe(desde, alias), alias).toEqual({ clase: 'desconocido' });
    }
  });

  it('ninguna importación se le escapa: ni un alias ni un import.meta.glob', () => {
    // Lo que la guarda no sabe seguir podría llevar a la jornada sin que lo viera. Si hace
    // falta usarlo, primero se le enseña a seguirlo.
    const sinSeguir = fuentes.flatMap((fichero) => {
      const fuente = readFileSync(resolve(RAIZ, fichero), 'utf8');
      return [
        ...(/\bimport\.meta\.glob/u.test(fuente) ? [`${fichero}: import.meta.glob`] : []),
        ...especificadoresDe(fuente)
          .filter((especificador) => claseDe(resolve(RAIZ, fichero), especificador).clase === 'desconocido')
          .map((especificador) => `${fichero}: ${especificador}`),
      ];
    });
    expect(sinSeguir).toEqual([]);
  });
});
