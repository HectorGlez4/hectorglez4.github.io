import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import { esVersionSuficiente, VERSION_MINIMA } from '../../tools/comprobar-node.mjs';
import { MARCA } from '../../src/lib/marca.ts';
import { FICHERO_DEL_CENSO, TOPE_DE_PENDIENTES_DE_COTEJO } from '../../tools/lib/cotejo.ts';

const raiz = resolve(import.meta.dirname, '../..');

describe('Historia 1.1 — comprobación de versión de Node', () => {
  it('acepta la versión mínima exacta y cualquiera superior', () => {
    expect(esVersionSuficiente(VERSION_MINIMA)).toBe(true);
    expect(esVersionSuficiente('22.13.0')).toBe(true);
    expect(esVersionSuficiente('24.3.0')).toBe(true);
  });

  it('rechaza cualquier versión por debajo del mínimo', () => {
    expect(esVersionSuficiente('22.11.9')).toBe(false);
    expect(esVersionSuficiente('20.19.0')).toBe(false);
    expect(esVersionSuficiente('18.0.0')).toBe(false);
  });

  it('la máquina que ejecuta las pruebas cumple el mínimo', () => {
    expect(esVersionSuficiente(process.versions.node)).toBe(true);
  });

  it('el build está encadenado a la comprobación', () => {
    const pkg = JSON.parse(readFileSync(resolve(raiz, 'package.json'), 'utf8'));
    expect(pkg.scripts.prebuild).toContain('comprobar-node');
    expect(pkg.scripts.predev).toContain('comprobar-node');
  });
});

describe('Historia 1.1 — estructura de directorios', () => {
  const exigidos = [
    'corpus/citas',
    'corpus/autores',
    'corpus/temas',
    'corpus/_revision',
    // Historia 11.1 — los documentos de Fuente que versiona `tools/recuperar.ts` (AD-23).
    'corpus/fuentes',
    // Historia 11.2 — las integraciones de build que no caben en `src/lib/` por AD-5.
    'integraciones',
    'src/lib',
    'src/components',
    'src/islands',
    'src/pages',
    'src/styles',
    'tools',
  ];

  it.each(exigidos)('existe %s', (dir) => {
    expect(existsSync(resolve(raiz, dir))).toBe(true);
  });

  it('no queda ningún fichero de ejemplo de la plantilla', () => {
    // La plantilla `minimal` deja README.md y .vscode/, que no pertenecen a este
    // proyecto. AGENTS.md no entra en la lista: el de la raíz es el contexto de
    // proyecto que gestiona BMad, anterior a esta historia, no un resto de plantilla.
    for (const sobrante of ['README.md', '.vscode']) {
      expect(existsSync(resolve(raiz, sobrante)), `sobra ${sobrante}`).toBe(false);
    }
    // Y la única página es la portada propia, no la de ejemplo de Astro.
    const portada = readFileSync(resolve(raiz, 'src/pages/index.astro'), 'utf8');
    expect(portada).not.toContain('Astro');
    // La marca llega del módulo único de la Historia 6.1, no escrita en la página.
    expect(portada).toContain("from '../lib/marca.ts'");
    expect(portada).toContain('{MARCA}');
  });

  it('el corpus está vacío de contenido pero presente en git', () => {
    // `corpus/fuentes` incluido: el andamiaje lo exige, así que sin su `.gitkeep`
    // versionado un clon limpio fallaría esta misma prueba.
    for (const dir of [
      'corpus/citas',
      'corpus/autores',
      'corpus/temas',
      'corpus/_revision',
      'corpus/fuentes',
    ]) {
      expect(readdirSync(resolve(raiz, dir)), dir).toContain('.gitkeep');
    }
  });
});

/**
 * Historia 11.2 — el censo de pendientes de cotejo es deuda que solo mengua.
 *
 * El cotejo del build exige documento a toda Cita que no esté en este censo. Lo que
 * impide que el censo se convierta en un vertedero es que su recuento tenga un tope
 * registrado que solo se puede bajar a mano: añadir una Cita para desbloquear un build
 * obligaría a subir el tope en `tools/lib/cotejo.ts`, y eso es un cambio visible en el
 * diff que hay que justificar.
 */
describe('Historia 11.2 — el censo de pendientes de cotejo', () => {
  const ruta = resolve(raiz, 'corpus', FICHERO_DEL_CENSO);

  it('existe y está versionado', () => {
    expect(existsSync(ruta)).toBe(true);
  });

  it('explica arriba por qué existe y que es cerrado', () => {
    // Un censo sin motivo escrito se lee como una lista de excepciones sin dueño.
    const contenido = readFileSync(ruta, 'utf8');
    expect(contenido).toMatch(/cerrado/i);
    expect(contenido).toMatch(/11\.2/);
  });

  it('su recuento no supera el tope registrado', () => {
    const censo = parsearYaml(readFileSync(ruta, 'utf8')) as { citas?: unknown };
    expect(Array.isArray(censo.citas)).toBe(true);
    const citas = censo.citas as string[];
    expect(citas.length).toBeLessThanOrEqual(TOPE_DE_PENDIENTES_DE_COTEJO);
  });

  it('no repite ningún slug', () => {
    const censo = parsearYaml(readFileSync(ruta, 'utf8')) as { citas: string[] };
    expect(new Set(censo.citas).size).toBe(censo.citas.length);
  });

  it('toda entrada corresponde a una Cita que existe', () => {
    // La misma regla que aplica el build, comprobada también aquí porque una entrada
    // rancia es una exención que sobrevive a la Cita que la justificaba.
    const censo = parsearYaml(readFileSync(ruta, 'utf8')) as { citas: string[] };
    const publicados = new Set(
      readdirSync(resolve(raiz, 'corpus/citas'))
        .filter((f) => f.endsWith('.md'))
        .map((f) => /^slug:\s*"?([^"\n]+?)"?\s*$/m.exec(
          readFileSync(resolve(raiz, 'corpus/citas', f), 'utf8'),
        )?.[1]),
    );
    expect(censo.citas.filter((slug) => !publicados.has(slug))).toEqual([]);
  });
});

/**
 * AD-22 — La red vive **solo** en la cáscara exterior de `tools/`.
 *
 * Tres excepciones, las tres escritas y con nombre. Una excepción escrita se revisa; un
 * punto ciego, no:
 *
 *   · `tools/recuperar.ts` es la cáscara exterior de las herramientas de editor: la única
 *     que pide el documento de una Fuente.
 *   · `tools/ingreso.ts` es la cáscara del mando de ingreso —Historia 14.1—: le pide al
 *     receptor de medición la única cifra contra la que se miden los Umbrales, y **solo
 *     informa**. Lo que hace con la respuesta vive en `tools/lib/ingresos.ts`, que no pide
 *     nada, igual que `tools/lib/documento.ts` respecto de `tools/recuperar.ts`.
 *   · `astro.config.mjs` declara las dos familias de UX-DR3 por la Fonts API de Astro, y
 *     `fontProviders.google()` **sí descarga** en el build: los `.woff2` acaban en
 *     `.astro/fonts/` y `unifont` está en el árbol de dependencias por eso.
 *
 * Lo que sigue siendo cierto —y es lo que AD-22 protege— es que **ningún dato del Corpus
 * se pide durante el build**: el contenido sale de ficheros versionados, así que dos
 * construcciones del mismo commit dan el mismo sitio. Barrer solo `tools/lib/` dejaba
 * nueve órdenes sin cubrir, y no barrer la configuración de la raíz dejaba fuera la única
 * descarga que el build hace de verdad.
 */
describe('AD-22 — la red vive solo en la cáscara exterior de tools/', () => {
  const EXTENSIONES = ['.ts', '.tsx', '.js', '.mjs', '.astro'];

  /** Fichero → por qué se le admite pedir por la red. Ampliarla es una decisión. */
  const EXCEPCIONES = new Map([
    [
      'tools/recuperar.ts',
      'la cáscara exterior de las herramientas de editor: la única orden que recupera el documento de una Fuente',
    ],
    [
      'tools/ingreso.ts',
      'la cáscara del mando de ingreso: le pide al receptor la cifra contra la que se miden los Umbrales, y el build jamás la lee (AD-14)',
    ],
    [
      'astro.config.mjs',
      'el proveedor de tipografías de la Fonts API: el build baja las dos familias de UX-DR3 a .astro/fonts/ y nada más',
    ],
    [
      'tools/avisar.ts',
      'la cáscara del aviso a IndexNow: avisa a los buscadores de lo ya publicado, y corre en el flujo de trabajo con needs: desplegar — el build no la invoca, así que sigue construyendo sin internet',
    ],
  ]);

  /*
   * `navigator.sendBeacon` de `src/lib/medicion.ts` no entra en la lista, y es
   * deliberado: es texto que se compone para que lo ejecute el navegador del visitante,
   * no una petición que haga el build ni una herramienta.
   */
  const LLAMADAS_DE_RED: readonly RegExp[] = [
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bWebSocket\s*\(/,
    /\bEventSource\s*\(/,
    /\bfontProviders\s*\.\s*\w+\s*\(/,
    /from\s+['"](?:node:)?(?:http|https|net|tls|dgram)['"]/,
    /require\(\s*['"](?:node:)?(?:http|https|net|tls|dgram)['"]\s*\)/,
    /from\s+['"](?:axios|undici|node-fetch|got)['"]/,
  ];

  /**
   * El código sin sus comentarios.
   *
   * Este repositorio habla de `fetch` en los comentarios constantemente —empezando por los
   * que explican por qué no lo usa—, así que un barrido sobre el texto crudo daría rojo en
   * los ficheros más cuidados y obligaría a retirarlo. Las direcciones `https://` de las
   * cadenas sobreviven: el `//` que va detrás de dos puntos no abre comentario.
   */
  function sinComentarios(codigo: string): string {
    return codigo
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .split('\n')
      .map((linea) => linea.replace(/(^|[^:"'`\\])\/\/.*$/, '$1'))
      .join('\n');
  }

  function tieneLlamadaDeRed(codigo: string): boolean {
    const sinAdornos = sinComentarios(codigo);
    return LLAMADAS_DE_RED.some((patron) => patron.test(sinAdornos));
  }

  function ficherosDe(dir: string): string[] {
    const encontrados: string[] = [];
    for (const entrada of readdirSync(dir)) {
      const ruta = join(dir, entrada);
      if (statSync(ruta).isDirectory()) encontrados.push(...ficherosDe(ruta));
      else if (EXTENSIONES.some((e) => entrada.endsWith(e))) encontrados.push(ruta);
    }
    return encontrados;
  }

  /** La configuración de la raíz: es donde vive la única descarga del build. */
  const configuracionDeLaRaiz = readdirSync(raiz)
    .filter((entrada) => /\.config\.(?:ts|js|mjs|cjs)$/.test(entrada))
    .map((entrada) => join(raiz, entrada));

  const barridos = [
    ...ficherosDe(resolve(raiz, 'src')),
    ...ficherosDe(resolve(raiz, 'tools')),
    // Historia 11.2 — `integraciones/` corre **dentro** del build. Dejarlo fuera del
    // barrido sería el punto ciego más grande de todos: es el único código nuevo que la
    // construcción ejecuta por su cuenta.
    ...ficherosDe(resolve(raiz, 'integraciones')),
    ...configuracionDeLaRaiz,
  ].map((ruta) => relative(raiz, ruta).split('\\').join('/'));

  it('barre src/, tools/, integraciones/ y la configuración de la raíz', () => {
    // Si el barrido se quedara corto, las pruebas de abajo pasarían sin mirar nada.
    for (const exigido of [
      'tools/recuperar.ts',
      'tools/extraer.ts',
      'tools/lib/documento.ts',
      'tools/lib/cotejo.ts',
      'integraciones/cotejo.ts',
      'src/content.config.ts',
      'astro.config.mjs',
      'vitest.config.ts',
      'playwright.config.ts',
    ]) {
      expect(barridos, exigido).toContain(exigido);
    }
    expect(barridos.filter((r) => r.startsWith('tools/')).length).toBeGreaterThanOrEqual(10);
    expect(barridos.some((r) => r.endsWith('.astro'))).toBe(true);
  });

  it('ningún fichero fuera de las excepciones pide nada por la red', () => {
    const culpables = barridos
      .filter((ruta) => !EXCEPCIONES.has(ruta))
      .filter((ruta) => tieneLlamadaDeRed(readFileSync(resolve(raiz, ruta), 'utf8')));

    expect(culpables).toEqual([]);
  });

  it.each([...EXCEPCIONES])('la excepción %s sigue siendo necesaria — %s', (ruta) => {
    // Una excepción que ya no hace falta es una puerta abierta sin motivo.
    expect(barridos).toContain(ruta);
    expect(tieneLlamadaDeRed(readFileSync(resolve(raiz, ruta), 'utf8'))).toBe(true);
  });

  it('no hay más excepciones que esas cuatro', () => {
    // Añadir una quinta tiene que ser un cambio deliberado de esta prueba.
    expect([...EXCEPCIONES.keys()].sort()).toEqual([
      'astro.config.mjs',
      'tools/avisar.ts',
      'tools/ingreso.ts',
      'tools/recuperar.ts',
    ]);
  });

  it('el guardián detecta una llamada de red inyectada', () => {
    // Sin esta comprobación, un patrón mal escrito daría verde para siempre.
    expect(tieneLlamadaDeRed("const r = await fetch('https://example.com');")).toBe(true);
    expect(tieneLlamadaDeRed("import { get } from 'node:https';")).toBe(true);
    expect(tieneLlamadaDeRed("const c = require('http');")).toBe(true);
    expect(tieneLlamadaDeRed("import axios from 'axios';")).toBe(true);
    expect(tieneLlamadaDeRed('provider: fontProviders.google(),')).toBe(true);
    expect(tieneLlamadaDeRed('export function extraerCandidatas() { return []; }')).toBe(false);
  });

  it('un comentario que habla de fetch no cuenta, y una cadena con https:// tampoco tapa', () => {
    expect(tieneLlamadaDeRed('// aquí no se llama a fetch( nunca')).toBe(false);
    expect(tieneLlamadaDeRed('/* la única fetch( del proyecto vive en la cáscara */')).toBe(false);
    expect(tieneLlamadaDeRed("const u = 'https://ejemplo.test/x';")).toBe(false);
    // Y lo que va detrás de una URL en la misma línea se sigue viendo.
    expect(tieneLlamadaDeRed("await fetch('https://ejemplo.test/x');")).toBe(true);
  });

  it('el build no pide ningún dato del Corpus: lo único que baja son las tipografías', () => {
    /*
     * La afirmación que se puede sostener no es «el build no descarga nada» —lo hace, las
     * dos familias de la Fonts API—, sino que ningún contenido del Corpus se recupera
     * durante la construcción: eso vive en `tools/recuperar.ts`, que el build no invoca.
     */
    const pkg = JSON.parse(readFileSync(resolve(raiz, 'package.json'), 'utf8'));
    for (const guion of ['prebuild', 'build']) {
      expect(pkg.scripts[guion], guion).not.toMatch(/recuperar|curl|wget/);
    }

    /*
     * La lista es cerrada a propósito: añadir una llamada de red al proyecto tiene que ser
     * una decisión, no un descuido que aparece en un `git diff` largo. Quien añada un
     * fichero aquí está diciendo por qué.
     *
     * - `astro.config.mjs` baja las dos familias de la Fonts API durante el build.
     * - `tools/recuperar.ts` trae el documento de una Fuente, y por eso el build no lo
     *   invoca nunca.
     * - `tools/ingreso.ts` consulta el proveedor del Modelo de Ingreso.
     * - `tools/avisar.ts` avisa a IndexNow de lo publicado. **El build no lo llama**: corre
     *   en el flujo de trabajo con `needs: desplegar`, que es lo que mantiene en pie la
     *   garantía que esta prueba defiende —`npm run build` sigue construyendo sin internet—
     *   y además lo único correcto, porque avisar antes de desplegar manda al buscador a la
     *   versión anterior.
     */
    const conRed = barridos.filter((ruta) =>
      tieneLlamadaDeRed(readFileSync(resolve(raiz, ruta), 'utf8')),
    );
    expect(conRed.sort()).toEqual([
      'astro.config.mjs',
      'tools/avisar.ts',
      'tools/ingreso.ts',
      'tools/recuperar.ts',
    ]);
  });
});
