import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import {
  FICHEROS_QUE_ROTAN_CON_LA_JORNADA,
  enMiB,
  errorDeLectura,
  medirDist,
  parteDePeso,
  veredictoDePeso,
  veredictoDePng,
  type FicheroDeDist,
  type UmbralesDePeso,
} from '../../tools/lib/peso.ts';
import {
  AVISO_DE_PESO_DE_DIST,
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

/** Umbrales pequeños y legibles para los casos: aviso en 1.000 bytes, tope en 2.000. */
const UMBRALES: UmbralesDePeso = { aviso: 1_000, tope: 2_000, topeDePng: undefined };

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
    expect(parte.veredictos).toEqual({ peso: 'por-debajo', png: 'sin-tope' });
  });

  it('las cifras dicen cuánto queda hasta el umbral siguiente, o cuánto se pasa del tope', () => {
    const juzgado = (bytes: number) => parteDePeso(medirDist(distQueJuzga(bytes)), UMBRALES).cifras[2];
    expect(juzgado(400)).toContain('quedan 600 bytes (0 MiB) hasta el aviso.');
    expect(juzgado(1_000)).toContain('quedan 0 bytes (0 MiB) hasta el aviso.');
    expect(juzgado(1_500)).toContain('quedan 500 bytes (0 MiB) hasta el tope.');
    expect(juzgado(2_000)).toContain('quedan 0 bytes (0 MiB) hasta el tope.');
    expect(juzgado(2_001)).toContain('pasa del tope en 1 byte (0 MiB).');
  });

  it('un dist/ sin ningún fichero no pesa cero: no hay nada que medir, y es un error', () => {
    const parte = parteDePeso(medirDist([]), UMBRALES);
    expect(parte.error).toContain('dist/ no trae ningún fichero');
    expect(parteDePeso(medirDist([]), UMBRALES, { anotar: true }).error).toMatch(/^::error::dist\/ no trae /u);
    // Sin los cinco que rota, la línea no deja un paréntesis vacío.
    expect(parte.cifras[1]).toMatch(/en 0 ficheros\. No están en dist\/: index\.html, /u);
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
    expect(aviso).toContain('1.500 bytes (0 MiB)');
    expect(aviso).toContain('1.000 bytes');
    expect(aviso).toContain('2.000 bytes');
    expect(aviso).toContain('AVISO_DE_PESO_DE_DIST');
    expect(aviso).toContain('TOPE_DE_PESO_DE_DIST');
    expect(aviso).toContain('src/lib/umbrales.ts');
    expect(aviso).toContain('no decide nada');
    expect(aviso).toContain('quedan 500 bytes (0 MiB) hasta el tope');
    expect(aviso).toContain('lo decide Héctor');
  });

  it('sobre el tope: el error nombra el peso, el tope, la constante y el fichero', () => {
    const parte = parteDePeso(medirDist(distQueJuzga(2_001)), UMBRALES);
    expect(parte.avisos).toEqual([]);
    expect(parte.error).toContain('2.001 bytes');
    expect(parte.error).toContain('pasa el tope de 2.000 bytes (0 MiB) en 1 byte (0 MiB)');
    expect(parte.error).toContain('TOPE_DE_PESO_DE_DIST');
    expect(parte.error).toContain('src/lib/umbrales.ts');
    expect(parte.veredictos.peso).toBe('sobre-el-tope');
  });

  it('con los valores de Héctor, el error los escribe en MiB', () => {
    const umbrales = { aviso: AVISO_DE_PESO_DE_DIST, tope: TOPE_DE_PESO_DE_DIST, topeDePng: undefined };
    const parte = parteDePeso(medirDist(distQueJuzga(TOPE_DE_PESO_DE_DIST + 1)), umbrales);
    // A esta distancia el redondeo a MiB iguala las dos cifras: el exceso lo dice en bytes.
    expect(parte.error).toContain('943.718.401 bytes (900 MiB)');
    expect(parte.error).toContain('pasa el tope de 943.718.400 bytes (900 MiB) en 1 byte (0 MiB)');
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

describe('Historia 24.2 — el formato de las cifras', () => {
  it.each([
    [0, '0 MiB'],
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

  it('no es una integración de Astro ni mide en astro:build:done', () => {
    const paso = readFileSync(resolve(RAIZ, 'integraciones/peso.ts'), 'utf8');
    const sinComentarios = paso.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/\/\/.*$/gmu, '');
    expect(sinComentarios).not.toMatch(/astro:build|AstroIntegration/u);
    const configuracion = readFileSync(resolve(RAIZ, 'astro.config.mjs'), 'utf8');
    expect(configuracion).not.toMatch(/integraciones\/peso/u);
  });

  it('las decisiones viven en tools/lib/peso.ts, sin disco ni proceso, tampoco en lo que importa', () => {
    // Se sigue cada importación relativa: un módulo puro que importa uno impuro no es puro.
    const vistos = new Set<string>();
    const pendientes = [resolve(RAIZ, 'tools/lib/peso.ts')];
    while (pendientes.length > 0) {
      const fichero = pendientes.pop() as string;
      if (vistos.has(fichero)) continue;
      vistos.add(fichero);
      const fuente = readFileSync(fichero, 'utf8');
      const nombre = relative(RAIZ, fichero);
      expect(fuente, nombre).not.toMatch(/from ['"]node:|import\(['"]node:/u);
      expect(fuente, nombre).not.toMatch(/\bprocess\./u);
      for (const [, especificador] of fuente.matchAll(/^\s*(?:import|export)\b[^;]*?from\s+['"](\.[^'"]+)['"]/gmu)) {
        pendientes.push(resolve(dirname(fichero), especificador as string));
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

  /** Todos los ficheros de código de `src/`, por su ruta relativa a la raíz. */
  const fuentes = readdirSync(resolve(RAIZ, 'src'), { recursive: true, encoding: 'utf8' })
    .filter((ruta) => /\.(astro|ts|mts|js|mjs)$/u.test(ruta))
    .map((ruta) => `src/${ruta.split('\\').join('/')}`);

  /** Las importaciones relativas de un fichero, ya resueltas a rutas relativas a la raíz. */
  const importaciones = (fichero: string): string[] =>
    [...readFileSync(resolve(RAIZ, fichero), 'utf8').matchAll(/^\s*import\b[^;]*?from\s+['"](\.[^'"]+)['"]/gmu)].map(
      ([, especificador]) => relative(RAIZ, resolve(RAIZ, dirname(fichero), especificador as string)),
    );

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
    const superficies = [...leenLaJornada].filter((fichero) => !fichero.startsWith('src/lib/')).sort();
    expect(superficies).toEqual(Object.keys(PAGINA_DE).sort());
    expect(Object.values(PAGINA_DE).sort()).toEqual([...FICHEROS_QUE_ROTAN_CON_LA_JORNADA].sort());
  });
});
