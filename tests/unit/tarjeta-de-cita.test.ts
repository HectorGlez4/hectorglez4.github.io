import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import ts from 'typescript';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  coleccionValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { listadoDe, obraDeLaTarjeta, tarjetasDelListado } from './ayuda/listado.js';
import { componerDocumento, nombreDeDocumento } from '../../tools/lib/documento.ts';

/**
 * Historia 24.3 — cada Cita de un listado dice de qué obra es (UX-DR70).
 *
 * Tres partes, de la más barata a la más cara:
 *
 *   · **Sin construir**: el contrato de `TarjetaDeCita.astro` —`atribucion` obligatoria, un
 *     conjunto cerrado de tres literales y sin valor por omisión—, que cada uso de `src/` lo
 *     declare con el literal que toca, y la regla `.obra` (tipografía y nada que recorte).
 *   · **Construcciones que fallan**: un uso sin `atribucion`, uno fuera del conjunto y
 *     `autor-y-obra` sin el Autor de la Cita detienen la construcción nombrándola; y `astro
 *     check`, sobre esa copia, rechaza los dos primeros.
 *   · **Una construcción**: lo que cada Tarjeta lleva en los cuatro listados, en todas sus
 *     páginas, leído de `dist/`.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const COMPONENTE = 'src/components/TarjetaDeCita.astro';
const ATRIBUCIONES = ['autor-y-obra', 'obra', 'ninguna'] as const;
type Atribucion = (typeof ATRIBUCIONES)[number];

/**
 * La etiqueta de apertura de un uso de la tarjeta con el nombre que le dé el fichero, entera, se
 * cierre sola o no: un atributo entre comillas o entre llaves (con un nivel de anidamiento) puede
 * llevar `>` o `/>` sin cerrarla. El grupo 1 son sus atributos.
 */
const aperturaDe = (nombre: string) =>
  new RegExp(`<${nombre}\\b((?:"[^"]*"|'[^']*'|\\{(?:[^{}]|\\{[^{}]*\\})*\\}|[^>"'{])*)>`, 'g');

/** La importación por defecto del componente, con el nombre que le dé quien la importa. */
const IMPORTACION = /import\s+([A-Za-z_$][\w$]*)\s+from\s+(['"])[^'"]*\/TarjetaDeCita\.astro\2/g;

/** Un uso: sus atributos, la atribución que declara (si es un literal) y si pasa `autor`. */
interface Uso {
  etiqueta: string;
  atribuciones: (string | undefined)[];
  autor: boolean;
}

/**
 * Los usos de la tarjeta en un fichero, sea cual sea el nombre con que la importe. En un `.astro`
 * se buscan en la plantilla —el frontmatter es TypeScript y no puede pintar la tarjeta, así que lo
 * que diga un comentario suyo no cuenta—; en un `.mdx`, en todo el cuerpo. Sin comentarios de
 * plantilla ni de HTML, que pueden nombrar el componente sin usarlo. Lanza si el fichero importa
 * el componente de un modo que no es una importación por defecto, que la prueba no sabría seguir.
 */
function usosDe(ruta: string, contenido: string): Uso[] {
  const [codigo, plantilla] = ruta.endsWith('.astro')
    ? (() => {
        const [, frontmatter = '', ...resto] = contenido.split(/^---$/m);
        return [frontmatter, resto.join('---')];
      })()
    : [contenido, contenido];
  const nombres = [...codigo.matchAll(IMPORTACION)].map((m) => m[1]);
  const importaciones = [...codigo.matchAll(/(?:\bfrom|\bimport)\s*\(?\s*['"][^'"]*\/TarjetaDeCita\.astro['"]/g)];
  if (importaciones.length !== nombres.length) {
    throw new Error(`${ruta}: importa \`TarjetaDeCita.astro\` de un modo que esta prueba no sabe seguir`);
  }
  const limpia = plantilla.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  return nombres.flatMap((nombre) =>
    [...limpia.matchAll(aperturaDe(nombre))].map(([etiqueta, atributos]) => ({
      etiqueta,
      // Un atributo empieza tras un espacio: `data-autor=` no es `autor=`. Entre llaves no es un
      // literal: `undefined`.
      atribuciones: [...atributos.matchAll(/\satribucion=(?:"([^"]*)"|'([^']*)'|\{)/g)].map((m) => m[1] ?? m[2]),
      autor: /\sautor=/.test(atributos),
    })),
  );
}

/** El frontmatter de un `.astro`, como lo lee `medicion.test.ts` para la `zona` de la 23.7. */
async function frontmatterDe(ruta: string): Promise<{ texto: string; fuente: ts.SourceFile }> {
  const [, texto] = (await readFile(join(RAIZ, ruta), 'utf8')).split(/^---$/m);
  return { texto, fuente: ts.createSourceFile(ruta, texto, ts.ScriptTarget.Latest, true) };
}

/** Los ficheros de `src/` que pueden usar un componente de Astro, con su ruta relativa a la raíz. */
async function astrosDeSrc(): Promise<string[]> {
  const entradas = await readdir(join(RAIZ, 'src'), { recursive: true, withFileTypes: true });
  return entradas
    .filter((e) => e.isFile() && /\.(astro|mdx)$/.test(e.name))
    .map((e) => {
      const padre = (e as { parentPath?: string }).parentPath ?? (e as { path?: string }).path ?? join(RAIZ, 'src');
      return join(padre, e.name).slice(RAIZ.length + 1).split('\\').join('/');
    });
}

describe('Historia 24.3 — el contrato del componente, sin construir', () => {
  it('`Props` trae `atribucion` obligatoria con exactamente los tres literales, y nada más que `cita`, `atribucion`, `autor` y `zona`', async () => {
    const { fuente } = await frontmatterDe(COMPONENTE);
    const props = fuente.statements.find(
      (s): s is ts.InterfaceDeclaration => ts.isInterfaceDeclaration(s) && s.name.text === 'Props',
    );
    expect(props, 'sin `interface Props`').toBeDefined();
    const miembros = props!.members.filter(ts.isPropertySignature);
    expect(miembros).toHaveLength(props!.members.length);
    expect(miembros.map((m) => m.name.getText(fuente)).sort()).toEqual(['atribucion', 'autor', 'cita', 'zona']);

    const atribucion = miembros.find((m) => m.name.getText(fuente) === 'atribucion')!;
    expect(atribucion.questionToken, '`atribucion` es opcional').toBeUndefined();
    const tipo = atribucion.type;
    expect(tipo !== undefined && ts.isUnionTypeNode(tipo), 'el tipo de `atribucion` no es una unión').toBe(true);
    const literales = (tipo as ts.UnionTypeNode).types.map((t) =>
      ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal) ? t.literal.text : `(no literal) ${t.getText(fuente)}`,
    );
    expect(literales.sort()).toEqual([...ATRIBUCIONES].sort());

    // `autor` se queda opcional: solo `autor-y-obra` lo pasa.
    expect(miembros.find((m) => m.name.getText(fuente) === 'autor')!.questionToken).toBeDefined();
  });

  it('la desestructuración de `Astro.props` no le da a `atribucion` valor por omisión', async () => {
    const { fuente } = await frontmatterDe(COMPONENTE);
    const enlaces: ts.BindingElement[] = [];
    const rellenos: string[] = [];
    const RELLENAN = new Set([
      ts.SyntaxKind.QuestionQuestionToken,
      ts.SyntaxKind.BarBarToken,
      ts.SyntaxKind.EqualsToken,
      ts.SyntaxKind.QuestionQuestionEqualsToken,
      ts.SyntaxKind.BarBarEqualsToken,
    ]);
    const visitar = (nodo: ts.Node) => {
      if (
        ts.isVariableDeclaration(nodo) &&
        ts.isObjectBindingPattern(nodo.name) &&
        nodo.initializer?.getText(fuente) === 'Astro.props'
      ) {
        enlaces.push(...nodo.name.elements.filter((e) => e.name.getText(fuente) === 'atribucion'));
      }
      // Ni por otro camino: `atribucion ?? …`, `atribucion || …` o una asignación.
      if (
        ts.isBinaryExpression(nodo) &&
        RELLENAN.has(nodo.operatorToken.kind) &&
        /^(Astro\.props\.)?atribucion$/.test(nodo.left.getText(fuente))
      ) {
        rellenos.push(nodo.getText(fuente));
      }
      ts.forEachChild(nodo, visitar);
    };
    visitar(fuente);
    expect(enlaces, 'nadie desestructura `atribucion` de `Astro.props`').toHaveLength(1);
    expect(enlaces[0].initializer, '`atribucion` lleva un valor por omisión').toBeUndefined();
    expect(rellenos).toEqual([]);
  });

  it('todo `<TarjetaDeCita` de `src/` declara un literal del conjunto, y pasa `autor` solo con `autor-y-obra`', async () => {
    const ESPERADA: Record<string, Atribucion[]> = {
      'src/pages/tema/[slug]/[...page].astro': ['autor-y-obra'],
      'src/pages/coleccion/[slug]/[...page].astro': ['autor-y-obra'],
      'src/pages/autor/[slug]/[...page].astro': ['obra'],
      'src/pages/obra/[autor]/[slug]/[...page].astro': ['ninguna'],
      // Historia 24.6 — «De la misma obra» y «Más de {Autor}», en ese orden.
      'src/components/RutasDeSalida.astro': ['ninguna', 'obra'],
    };
    const vistas = new Map<string, Atribucion[]>();
    for (const ruta of await astrosDeSrc()) {
      for (const uso of usosDe(ruta, await readFile(join(RAIZ, ruta), 'utf8'))) {
        expect(uso.atribuciones, `${ruta}: ${uso.etiqueta}`).toHaveLength(1);
        const [valor] = uso.atribuciones;
        expect(ATRIBUCIONES as readonly (string | undefined)[], `${ruta}: no es un literal del conjunto: ${uso.etiqueta}`).toContain(valor);
        expect(uso.autor, `${ruta}: \`autor\` va con \`autor-y-obra\` y con nada más: ${uso.etiqueta}`).toBe(
          valor === 'autor-y-obra',
        );
        vistas.set(ruta, [...(vistas.get(ruta) ?? []), valor as Atribucion]);
      }
    }
    // Las cuatro páginas y las Rutas de salida declaran las suyas, en el orden de sus usos, y
    // ningún otro fichero usa la tarjeta sin que esta prueba diga qué atribución le toca: desde
    // la 24.6, «De la misma obra» (`ninguna`) y «Más de {Autor}» (`obra`) la usan al pie de la
    // Página de Cita.
    expect([...vistas.keys()].sort()).toEqual(Object.keys(ESPERADA).sort());
    for (const [ruta, atribuciones] of Object.entries(ESPERADA)) {
      expect(vistas.get(ruta), ruta).toEqual(atribuciones);
    }
  });

  it('el escáner de usos ve lo que tiene que ver', () => {
    // El lector de la prueba anterior, sobre usos inventados: un atributo con `>` o `/>`
    // dentro, una etiqueta que no se cierra sola, un `data-autor=` que no es `autor=`, comillas
    // simples, un valor entre llaves, el componente importado con otro nombre, y lo que dicen de
    // él los comentarios —del frontmatter, de plantilla y de HTML—, que no son usos.
    const pagina = [
      '---',
      "import Tarjeta from '../../components/TarjetaDeCita.astro';",
      '// <Tarjeta cita={cita} atribucion="mal" />',
      '/* <Tarjeta cita={cita} atribucion="mal" /> */',
      '---',
      '<Tarjeta cita={cita} atribucion="obra" zona={a > b ? "listado" : "x"} />',
      '<Tarjeta cita={cita} atribucion="ninguna" zona="listado"></Tarjeta>',
      '<Tarjeta cita={{ ...cita }} atribucion="autor-y-obra" autor={autores.get(cita.autor)} zona="listado" />',
      '<Tarjeta cita={cita} atribucion="obra" data-autor="x" zona="listado" />',
      "<Tarjeta cita={cita} atribucion='ninguna' zona=\"listado\" />",
      '<Tarjeta cita={cita} atribucion={valor} zona="listado" />',
      '<Tarjeta cita={cita} zona="listado" />',
      '{/* <Tarjeta cita={cita} atribucion="mal" /> */}',
      '<!-- <Tarjeta cita={cita} atribucion="mal" /> -->',
      '<TarjetaDeCita cita={cita} atribucion="mal" />',
    ].join('\n');
    expect(usosDe('src/pages/x.astro', pagina).map(({ atribuciones, autor }) => ({ atribuciones, autor }))).toEqual([
      { atribuciones: ['obra'], autor: false },
      { atribuciones: ['ninguna'], autor: false },
      { atribuciones: ['autor-y-obra'], autor: true },
      { atribuciones: ['obra'], autor: false },
      { atribuciones: ['ninguna'], autor: false },
      { atribuciones: [undefined], autor: false },
      { atribuciones: [], autor: false },
    ]);
    // Sin la importación, nada que contar; importado de otro modo, la prueba no lo sigue y lo dice.
    expect(usosDe('src/pages/x.astro', '---\n---\n<p>TarjetaDeCita</p>')).toEqual([]);
    expect(() =>
      usosDe('src/pages/x.astro', "---\nconst { default: T } = await import('../components/TarjetaDeCita.astro');\n---\n"),
    ).toThrow(/no sabe seguir/);
  });

  it('la lista de la guarda es la unión de `Props`, con los mismos literales', async () => {
    // `satisfies` impide que la lista tenga un literal que la unión no tenga; esto, que le falte
    // uno: un valor nuevo de la unión que la guarda no conociera pararía el build en un uso bueno.
    const { fuente } = await frontmatterDe(COMPONENTE);
    let lista: ts.Expression | undefined;
    const visitar = (nodo: ts.Node) => {
      if (ts.isVariableDeclaration(nodo) && nodo.name.getText(fuente) === 'ATRIBUCIONES') lista = nodo.initializer;
      ts.forEachChild(nodo, visitar);
    };
    visitar(fuente);
    while (lista !== undefined && (ts.isSatisfiesExpression(lista) || ts.isAsExpression(lista) || ts.isParenthesizedExpression(lista))) {
      lista = lista.expression;
    }
    expect(lista !== undefined && ts.isArrayLiteralExpression(lista), 'sin la lista `ATRIBUCIONES`').toBe(true);
    const literales = (lista as ts.ArrayLiteralExpression).elements.map((e) =>
      ts.isStringLiteral(e) ? e.text : `(no literal) ${e.getText(fuente)}`,
    );
    expect(literales.sort()).toEqual([...ATRIBUCIONES].sort());
  });

  it('la regla `.obra`: Inter pequeña y apagada, sin versalitas, y nada que recorte', async () => {
    const fuente = await readFile(join(RAIZ, COMPONENTE), 'utf8');
    const estilo = fuente.slice(fuente.indexOf('<style>'));
    // Todas las reglas, también las de dentro de un `@media`: el cuerpo de la más interna no
    // lleva llaves.
    const reglas = [...estilo.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
      ([, selector, cuerpo]) => ({
        selector: selector.replace('<style>', '').trim(),
        declaraciones: new Map(
          cuerpo
            .split(';')
            .map((d) => d.trim())
            .filter((d) => d.includes(':'))
            .map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()] as const),
        ),
      }),
    );
    const base = reglas.find((r) => r.selector === '.obra');
    expect(base, 'sin regla `.obra`').toBeDefined();
    const declaraciones = base!.declaraciones;
    // Lo que recorta o pasa a versalitas no entra por ninguna regla que alcance a `.obra`: ni la
    // suya, ni una de `a:hover .obra` o de un `@media`.
    const deObra = reglas.filter((r) => /(^|[\s,>+~])\.obra(?![\w-])/.test(r.selector));
    expect(deObra.map((r) => r.selector)).toContain('.obra');
    expect(declaraciones.get('font-family')).toBe('var(--sans)');
    expect(declaraciones.get('font-size')).toBe('var(--pie)');
    expect(declaraciones.get('font-weight')).toBe('400');
    expect(declaraciones.get('line-height')).toBe('1.5');
    expect(declaraciones.get('color')).toBe('var(--tinta-apagada)');
    for (const prohibida of [
      'text-transform',
      'letter-spacing',
      'white-space',
      'text-overflow',
      'line-clamp',
      '-webkit-line-clamp',
      'overflow',
      'max-height',
    ]) {
      for (const regla of deObra) {
        expect(regla.declaraciones.has(prohibida), `\`${regla.selector}\` declara ${prohibida}`).toBe(false);
      }
    }
    // Parte palabras antes que desbordar: un título largo ocupa más líneas (NFR-12).
    expect(['anywhere', 'break-word']).toContain(declaraciones.get('overflow-wrap'));

    // Ni la tarjeta ni el enlace que la contiene recortan: una regla del `li` o del `a` con
    // `overflow: clip` cortaría el título igual que una suya.
    for (const regla of reglas) {
      for (const recorta of ['overflow', 'overflow-x', 'overflow-y', 'max-height', 'max-block-size', 'contain', 'text-overflow']) {
        expect(regla.declaraciones.has(recorta), `\`${regla.selector}\` declara ${recorta}`).toBe(false);
      }
    }

    // Al pasar el cursor, el fondo a `surface-container-low` y nunca una sombra (UX-DR6, UX-DR70).
    const encima = reglas.find((r) => r.selector === '.tarjeta a:hover');
    expect(encima, 'sin regla `.tarjeta a:hover`').toBeDefined();
    expect(encima!.declaraciones.get('background') ?? encima!.declaraciones.get('background-color')).toBe(
      'var(--contenedor-bajo)',
    );
    expect(estilo).not.toMatch(/box-shadow/);

    // Y en todo el componente, ni color ni tipografía escritos a mano.
    expect(estilo).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(estilo).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/i);
    // `inherit` es el del enlace de bloque, que toma la tinta de la página.
    for (const m of estilo.matchAll(/(color|font-family|font-size)\s*:\s*([^;]+);/g)) {
      expect(m[2].trim(), m[0]).toMatch(/^(var\(--[\w-]+\)|inherit)$/);
    }
    expect(estilo).not.toMatch(/white-space\s*:\s*nowrap|text-overflow|line-clamp|overflow\s*:\s*hidden/);
  });
});

describe('Historia 24.3 — un uso roto detiene la construcción', () => {
  const SLUG = 'seneca-no-es-que-tengamos-poco-tiempo';

  /** Construye el corpus mínimo con una sonda sin armazón que pinta su Cita con `atributos`. */
  async function construirSonda(frontmatter: string, atributos: string) {
    const SONDA = `---
import TarjetaDeCita from '../components/TarjetaDeCita.astro';
import { conjuntoPublicable } from '../lib/publicado.ts';
const conjunto = await conjuntoPublicable();
const cita = conjunto.citas.find((c) => c.slug === '${SLUG}')!;
${frontmatter}
---
<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><title>Sonda</title></head>
<body><ul><TarjetaDeCita cita={cita} ${atributos} zona="listado" /></ul></body></html>
`;
    const resultado = await construirConCorpus(
      {
        'autores/seneca.yml': AUTOR_VALIDO,
        'temas/el-tiempo.yml': TEMA_VALIDO,
        'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
      },
      { paginas: { 'sonda-tarjeta.astro': SONDA } },
    );
    aLimpiar.push(resultado.proyecto);
    return resultado;
  }

  it('`autor-y-obra` sin Autor: código distinto de 0, nombrando la Cita, `autor-y-obra` y su Autor', async () => {
    const resultado = await construirSonda('', 'atribucion="autor-y-obra" autor={undefined}');
    expect(resultado.codigo, resultado.salida).not.toBe(0);
    expect(resultado.salida).toMatch(new RegExp(`«${SLUG}»[^\\n]*autor-y-obra[^\\n]*«seneca»`));
  }, 300_000);

  it('una atribución fuera del conjunto: código distinto de 0, nombrando la Cita y el valor', async () => {
    // `astro build` no comprueba tipos: sin la guarda, el uso se pintaría como `obra`.
    const resultado = await construirSonda("const fuera = 'otra' as unknown as 'obra';", 'atribucion={fuera}');
    expect(resultado.codigo, resultado.salida).not.toBe(0);
    expect(resultado.salida).toMatch(new RegExp(`«${SLUG}»[^\\n]*atribucion="otra", fuera del conjunto`));
  }, 300_000);

  it('un uso sin `atribucion`: código distinto de 0, diciendo que falta y no que está fuera', async () => {
    // El caso para el que existe la guarda: `astro check` lo rechaza, `astro build` no.
    const resultado = await construirSonda('', '');
    expect(resultado.codigo, resultado.salida).not.toBe(0);
    expect(resultado.salida).toMatch(new RegExp(`«${SLUG}»[^\\n]*sin \`atribucion\``));
    expect(resultado.salida).not.toMatch(/fuera del conjunto/);
  }, 300_000);

  it('`astro check` rechaza un uso sin `atribucion` y uno fuera del conjunto, y admite el que la declara', async () => {
    // El criterio dice `astro check`, y aquí se corre `astro check`: sobre la copia de una
    // construcción que sí sale, con una sonda que el build no pinta —no es una página— y que
    // el comprobador lee igual que cualquier componente.
    const { codigo: construida, salida: deLaConstruccion, proyecto } = await construirSonda('', 'atribucion="obra"');
    expect(construida, deLaConstruccion).toBe(0);
    const SONDA = 'src/components/SondaDeTipos.astro';
    await writeFile(
      join(proyecto, SONDA),
      [
        '---',
        "import TarjetaDeCita from './TarjetaDeCita.astro';",
        "import type { Cita } from '../lib/publicado.ts';",
        'const cita = undefined as unknown as Cita;',
        '---',
        '<ul>',
        '  <TarjetaDeCita cita={cita} zona="listado" />',
        '  <TarjetaDeCita cita={cita} atribucion="otra" zona="listado" />',
        '  <TarjetaDeCita cita={cita} atribucion="obra" zona="listado" />',
        '</ul>',
        '',
      ].join('\n'),
      'utf8',
    );
    const { codigo, salida } = await promisify(execFile)(
      process.execPath,
      [join(RAIZ, 'node_modules', 'astro', 'bin', 'astro.mjs'), 'check'],
      { cwd: proyecto, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } },
    ).then(
      ({ stdout, stderr }) => ({ codigo: 0, salida: `${stdout}\n${stderr}` }),
      (fallo: { code?: number; stdout?: string; stderr?: string }) => ({
        codigo: fallo.code ?? 1,
        salida: `${fallo.stdout ?? ''}\n${fallo.stderr ?? ''}`,
      }),
    );
    const limpia = salida.replace(/\u001b\[[0-9;]*m/g, '');
    // El código de salida solo dice que hubo errores: la copia no lleva `medicion/`, y `tools/`
    // da los suyos. Lo que se juzga son los de la sonda.
    expect(codigo, limpia).not.toBe(0);
    // Los errores de la sonda, por su línea: la 7 (sin `atribucion`) y la 8 (`"otra"`), y ninguno
    // en la 9, que la declara.
    // Un diagnóstico ocupa varias líneas («… no es asignable a Props» y, debajo, la propiedad):
    // su mensaje llega hasta el siguiente diagnóstico o el recuento final.
    const errores = [
      ...limpia.matchAll(/SondaDeTipos\.astro:(\d+):\d+\s+-\s+error\s+ts\(\d+\):([\s\S]*?)(?=\n\S+:\d+:\d+\s+-\s+|\nResult\b|$)/g),
    ].map(([, linea, mensaje]) => ({ linea: Number(linea), mensaje }));
    expect(errores.map((e) => e.linea).sort(), limpia).toEqual([7, 8]);
    expect(errores.find((e) => e.linea === 7)!.mensaje).toMatch(/'atribucion'/);
    expect(errores.find((e) => e.linea === 8)!.mensaje).toMatch(/"otra"/);
  }, 300_000);

  it('`autor-y-obra` con el Autor de otro: código distinto de 0, nombrando los dos', async () => {
    // Una tarjeta que atribuyera la Cita a quien no la firma: peor que una sin Autor.
    const resultado = await construirSonda(
      "const otro = { slug: 'otro-autor', nombre: 'Otro Autor', semblanza: 'Otro.', añoFallecimiento: 1900 };",
      'atribucion="autor-y-obra" autor={otro}',
    );
    expect(resultado.codigo, resultado.salida).not.toBe(0);
    expect(resultado.salida).toMatch(new RegExp(`«${SLUG}»[^\\n]*«otro-autor»[^\\n]*«seneca»`));
  }, 300_000);
});

describe('Historia 24.3 — la Tarjeta de cada listado, construida', () => {
  const WS = 'https://es.wikisource.org/wiki/';
  const MACHADO =
    'nombre: Antonio Machado\nañoNacimiento: 1875\nañoFallecimiento: 1939\nsemblanza: Poeta sevillano de la generación del 98.\nordenAlfabetico: Machado\n';
  const NOMBRES: Record<string, string> = { seneca: 'Séneca', 'antonio-machado': 'Antonio Machado' };

  const BREVEDAD = 'Sobre la brevedad de la vida';
  const CARTAS = 'Cartas a Lucilio';
  const IRA = 'De la ira';
  /** Un título de 125 caracteres: más largo que el recorte del fragmento, y sale entero. */
  const LARGO =
    'Soledades, galerías y otros poemas, con las canciones del alto Duero y los proverbios y cantares del que hace camino al andar';
  /**
   * Lo que alarga las Citas de esa Obra por encima del recorte del fragmento: su tarjeta recorta
   * el texto como antes de la 24.3, y el título de la Obra, en la misma tarjeta, no.
   */
  const COLA_LARGA =
    'y así, verso a verso, el poeta deja escrito en la piedra del camino lo que el agua del río no supo decir a la orilla';

  // El censo es cerrado (11.2): solo admite slugs de las Citas anteriores a la v3, como en
  // `lista-de-obras.test.ts`.
  const SIN_OBRA = [
    'seneca-mientras-esperamos-vivir-la-vida-pasa',
    'antonio-machado-caminante-no-hay-camino-se-hace-camino',
  ];
  const COLECCION = 'de-prueba';

  interface Sembrada {
    autor: string;
    texto: string;
    obra?: string;
  }
  const sembradas = new Map<string, Sembrada>();

  const corpus: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'autores/antonio-machado.yml': MACHADO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    // Las Citas sin Fuente van en el censo. Con él en el fixture, el andamio no siembra
    // documentos y se escriben aquí.
    'pendientes-de-cotejo.yml': `citas:\n${SIN_OBRA.map((s) => `  - ${s}\n`).join('')}`,
  };

  /**
   * Siembra `n` Citas cotejadas de una Obra, con su documento. El texto no lleva el título; con
   * `cola`, cada texto la lleva detrás.
   */
  function sembrar(autor: string, clave: string, prefijo: string, titulo: string, n: number, cola = '') {
    const url = `${WS}${titulo.replaceAll(' ', '_')}`;
    const textos: string[] = [];
    for (let i = 0; i < n; i += 1) {
      const slug = `${autor}-${clave}-${i}`;
      const texto = `${prefijo} ${i}: una sentencia distinta para cada número, la ${i}${cola === '' ? '' : `, ${cola}`}.`;
      textos.push(texto);
      sembradas.set(slug, { autor, texto, obra: titulo });
      corpus[`citas/${autor}--${clave}-${i}.md`] = citaValida({
        autor,
        slug,
        texto,
        procedencia: { obra: titulo },
        fuente: { id: 'wikisource-es', url },
      });
    }
    corpus[`fuentes/${nombreDeDocumento('wikisource-es', titulo)}.txt`] = componerDocumento(
      { fuente: 'wikisource-es', obra: titulo, url, recuperado: '2026-10-26' },
      titulo,
      textos.join('\n\n'),
    );
  }

  /** Una Cita sin Obra: declara solo la referencia, sin Fuente, y va en el censo. */
  function sinObra(autor: string, slug: string, texto: string) {
    const fichero = `citas/${autor}--${slug.slice(autor.length + 1)}.md`;
    if (fichero in corpus) throw new Error(`El fixture ya tiene ${fichero}`);
    sembradas.set(slug, { autor, texto });
    corpus[fichero] = citaValida({
      autor,
      slug,
      texto,
      procedencia: { referencia: 'Sin obra declarada' },
      fuente: undefined,
    });
  }

  // Séneca, 54 Citas: Brevedad 50 (el 93 %, no se indexa), Cartas 2 (se indexa), De la ira 1 (no
  // se indexa) y una sin Obra. Machado, 3: la Obra del título largo 2 y una sin Obra. En el Tema,
  // 57: dos páginas, como la de Séneca.
  sembrar('seneca', 'brevedad', 'Brevedad', BREVEDAD, 50);
  sembrar('seneca', 'cartas', 'Carta', CARTAS, 2);
  sembrar('seneca', 'ira', 'Ira', IRA, 1);
  sinObra('seneca', SIN_OBRA[0], 'Mientras esperamos vivir, la vida pasa.');
  sembrar('antonio-machado', 'soledades', 'Soledad', LARGO, 2, COLA_LARGA);
  sinObra('antonio-machado', SIN_OBRA[1], 'Caminante, no hay camino, se hace camino al andar.');

  // La Colección: delante, las dos sin Obra, una de cada Obra pequeña y diez de Brevedad; detrás,
  // las 42 que quedan, al revés de como se sembraron. Son 57 y pasan de `CITAS_POR_PAGINA`, así
  // que la Colección también tiene página 2, y el orden declarado no es el de ningún criterio.
  const PRIMEROS = [
    ...SIN_OBRA,
    'seneca-cartas-0',
    'seneca-ira-0',
    'antonio-machado-soledades-0',
    ...Array.from({ length: 10 }, (_, i) => `seneca-brevedad-${i}`),
  ];
  const MIEMBROS = [...PRIMEROS, ...[...sembradas.keys()].filter((s) => !PRIMEROS.includes(s)).reverse()];
  corpus[`colecciones/${COLECCION}.yml`] = coleccionValida({ miembros: MIEMBROS });

  let proyecto = '';
  /** El recorte del fragmento, leído del componente: la prueba no fija una copia del número. */
  let largoDeFragmento = 0;
  const html = (ruta: string) => readFile(paginaConstruida(proyecto, ruta), 'utf8');

  /** La ruta y sus páginas 2+, mientras existan en `dist/`. */
  function paginasDe(ruta: string): string[] {
    const rutas = [ruta];
    for (let n = 2; existsSync(paginaConstruida(proyecto, `${ruta}${n}/`)); n += 1) rutas.push(`${ruta}${n}/`);
    return rutas;
  }

  const tarjetasDe = async (ruta: string) => tarjetasDelListado(await html(ruta), ruta);

  /** El fragmento que la tarjeta enseña: el texto, recortado como antes de la 24.3 si pasa. */
  const fragmentoDe = (texto: string) =>
    texto.length > largoDeFragmento ? `${texto.slice(0, largoDeFragmento - 1).trimEnd()}…` : texto;

  /** Lo que la Tarjeta de una Cita tiene que llevar en un contexto. */
  function esperado(slug: string, atribucion: Atribucion) {
    const cita = sembradas.get(slug);
    if (cita === undefined) throw new Error(`«${slug}» no es una Cita del fixture`);
    const visibles = [
      { clase: 'fragmento', texto: `«${fragmentoDe(cita.texto)}»` },
      ...(atribucion === 'autor-y-obra' ? [{ clase: 'autor', texto: NOMBRES[cita.autor] }] : []),
      ...(atribucion !== 'ninguna' && cita.obra !== undefined ? [{ clase: 'obra', texto: cita.obra }] : []),
    ];
    return {
      visibles,
      clases: visibles.flatMap((v, i) => (i === 0 ? [v.clase] : ['solo-para-lectores', v.clase])),
      lector: visibles.map((v) => v.texto).join(', '),
    };
  }

  /** Recorre las páginas de un listado y comprueba cada Tarjeta; devuelve sus slugs, en orden. */
  async function comprobarListado(ruta: string, atribucion: Atribucion): Promise<string[]> {
    const slugs: string[] = [];
    for (const pagina of paginasDe(ruta)) {
      const tarjetas = await tarjetasDe(pagina);
      expect(tarjetas.length, pagina).toBeGreaterThan(0);
      for (const tarjeta of tarjetas) {
        const motivo = `${pagina} · ${tarjeta.slug}`;
        const { visibles, clases, lector } = esperado(tarjeta.slug, atribucion);
        expect(tarjeta.enlaces, motivo).toBe(1);
        expect(tarjeta.zona, motivo).toBe('listado');
        expect(tarjeta.resto, motivo).toBe('');
        expect(tarjeta.clases, motivo).toEqual(clases);
        expect(tarjeta.visibles, motivo).toEqual(visibles);
        expect(tarjeta.lector, motivo).toBe(lector);
        slugs.push(tarjeta.slug);
      }
    }
    return slugs;
  }

  const deAutor = (autor: string) => [...sembradas].filter(([, c]) => c.autor === autor).map(([slug]) => slug);

  beforeAll(async () => {
    const { fuente } = await frontmatterDe(COMPONENTE);
    const visitar = (nodo: ts.Node) => {
      if (
        ts.isVariableDeclaration(nodo) &&
        nodo.name.getText(fuente) === 'LARGO_DE_FRAGMENTO' &&
        nodo.initializer !== undefined &&
        ts.isNumericLiteral(nodo.initializer)
      ) {
        largoDeFragmento = Number(nodo.initializer.text);
      }
      ts.forEachChild(nodo, visitar);
    };
    visitar(fuente);
    const resultado = await construirConCorpus(corpus);
    aLimpiar.push(resultado.proyecto);
    proyecto = resultado.proyecto;
    expect(resultado.codigo, resultado.salida).toBe(0);
  }, 300_000);

  it('el fixture: el título largo y los textos de su Obra pasan del recorte del fragmento', () => {
    expect(largoDeFragmento, 'sin `LARGO_DE_FRAGMENTO` en el componente').toBeGreaterThan(0);
    expect(LARGO.length).toBeGreaterThan(largoDeFragmento);
    for (const slug of ['antonio-machado-soledades-0', 'antonio-machado-soledades-1']) {
      expect(sembradas.get(slug)!.texto.length, slug).toBeGreaterThan(largoDeFragmento);
    }
    // Y ninguna otra: el recorte se mira en esas dos, el resto sale entero.
    expect([...sembradas].filter(([, c]) => c.texto.length > largoDeFragmento).map(([slug]) => slug).sort()).toEqual([
      'antonio-machado-soledades-0',
      'antonio-machado-soledades-1',
    ]);
    expect(sembradas.size).toBe(57);
  });

  it('Tema: fragmento, Autor y Obra en todas sus páginas, y cada Cita una vez', async () => {
    expect(paginasDe('/tema/el-tiempo/')).toEqual(['/tema/el-tiempo/', '/tema/el-tiempo/2/']);
    const slugs = await comprobarListado('/tema/el-tiempo/', 'autor-y-obra');
    expect(slugs).toHaveLength(new Set(slugs).size);
    expect([...slugs].sort()).toEqual([...sembradas.keys()].sort());
  });

  it('Colección: fragmento, Autor y Obra, en todas sus páginas y en el orden declarado', async () => {
    expect(MIEMBROS).toHaveLength(57);
    expect(paginasDe(`/coleccion/${COLECCION}/`)).toEqual([`/coleccion/${COLECCION}/`, `/coleccion/${COLECCION}/2/`]);
    expect(await comprobarListado(`/coleccion/${COLECCION}/`, 'autor-y-obra')).toEqual(MIEMBROS);
  });

  it('Autor: fragmento y Obra, sin el Autor, en todas sus páginas, y cada Cita una vez', async () => {
    expect(paginasDe('/autor/seneca/')).toEqual(['/autor/seneca/', '/autor/seneca/2/']);
    for (const autor of ['seneca', 'antonio-machado']) {
      const slugs = await comprobarListado(`/autor/${autor}/`, 'obra');
      expect(slugs, autor).toHaveLength(new Set(slugs).size);
      expect([...slugs].sort(), autor).toEqual(deAutor(autor).sort());
    }
  });

  it('Obra: solo el fragmento, ni Autor ni título, en todas las páginas de todas las Obras', async () => {
    const obras: string[] = [];
    for (const autor of await readdir(join(proyecto, 'dist', 'obra'))) {
      for (const obra of await readdir(join(proyecto, 'dist', 'obra', autor))) obras.push(`/obra/${autor}/${obra}/`);
    }
    expect(obras).toHaveLength(4);
    const slugs: string[] = [];
    for (const ruta of obras) {
      slugs.push(...(await comprobarListado(ruta, 'ninguna')));
      for (const pagina of paginasDe(ruta)) {
        const listado = listadoDe(await html(pagina), pagina);
        expect(listado, pagina).not.toContain('class="autor"');
        expect(listado, pagina).not.toContain('class="obra"');
        for (const titulo of [BREVEDAD, CARTAS, IRA, LARGO]) expect(listado, pagina).not.toContain(titulo);
      }
    }
    expect(slugs).toHaveLength(new Set(slugs).size);
    expect([...slugs].sort()).toEqual([...sembradas.keys()].filter((s) => !SIN_OBRA.includes(s)).sort());
  });

  it('el título de 125 caracteres sale entero, sin «…», en Tema, Colección y Autor', async () => {
    for (const ruta of ['/tema/el-tiempo/', `/coleccion/${COLECCION}/`, '/autor/antonio-machado/']) {
      const tarjeta = (await tarjetasDe(ruta)).find((t) => t.slug === 'antonio-machado-soledades-0');
      expect(tarjeta, ruta).toBeDefined();
      const obra = obraDeLaTarjeta(tarjeta!);
      expect(obra, ruta).toBe(LARGO);
      expect(obra, ruta).not.toContain('…');
    }
  });

  it('el fragmento de una Cita larga se recorta como antes, en la misma tarjeta que el título entero', async () => {
    const slug = 'antonio-machado-soledades-0';
    const texto = sembradas.get(slug)!.texto;
    for (const ruta of ['/tema/el-tiempo/', `/coleccion/${COLECCION}/`, '/autor/antonio-machado/', '/obra/antonio-machado/']) {
      const paginas = ruta.startsWith('/obra/')
        ? (await readdir(join(proyecto, 'dist', 'obra', 'antonio-machado'))).map((o) => `/obra/antonio-machado/${o}/`)
        : [ruta];
      for (const pagina of paginas) {
        const tarjeta = (await tarjetasDe(pagina)).find((t) => t.slug === slug);
        expect(tarjeta, pagina).toBeDefined();
        const fragmento = tarjeta!.visibles[0];
        expect(fragmento.clase, pagina).toBe('fragmento');
        expect(fragmento.texto, pagina).toMatch(/…»$/);
        expect(fragmento.texto.length, pagina).toBeLessThanOrEqual(largoDeFragmento + 2);
        expect(texto.startsWith(fragmento.texto.slice(1, -2)), pagina).toBe(true);
      }
    }
  });

  it('una Obra con `noindex` se nombra igual: «De la ira» en el Tema', async () => {
    const NOINDEX = /<meta name="robots" content="noindex, follow"/;
    expect(await html('/obra/seneca/de-la-ira/')).toMatch(NOINDEX);
    expect(await html('/obra/seneca/sobre-la-brevedad-de-la-vida/')).toMatch(NOINDEX);
    const tarjetas = (await Promise.all(paginasDe('/tema/el-tiempo/').map(tarjetasDe))).flat();
    expect(tarjetas.find((t) => t.slug === 'seneca-ira-0')?.visibles.at(-1)).toEqual({ clase: 'obra', texto: IRA });
    expect(tarjetas.find((t) => t.slug === 'seneca-brevedad-0')?.visibles.at(-1)).toEqual({
      clase: 'obra',
      texto: BREVEDAD,
    });
  });

  it('ningún listado dice «Sin obra documentada»', async () => {
    const rutas = [
      ...paginasDe('/tema/el-tiempo/'),
      ...paginasDe(`/coleccion/${COLECCION}/`),
      ...paginasDe('/autor/seneca/'),
      '/autor/antonio-machado/',
    ];
    for (const ruta of rutas) {
      expect(listadoDe(await html(ruta), ruta), ruta).not.toMatch(/sin obra documentada/i);
    }
  });
});
