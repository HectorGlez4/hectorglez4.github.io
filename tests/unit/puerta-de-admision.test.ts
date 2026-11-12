import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { citaAdmisible } from '../../src/lib/admision.ts';
import { separarFrontmatter } from '../../tools/lib/corpus.ts';
import {
  ATESTIGUADA,
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  conLaPuertaAbierta,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

async function construir(corpus: Record<string, string>) {
  const resultado = await construirConCorpus(corpus);
  aLimpiar.push(resultado.proyecto);
  return resultado;
}

const CORPUS_BASE = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
};

describe('Historia 1.2 — el criterio de admisión rompe el build', () => {
  it('una Cita completa y válida construye sin errores', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida(),
    });
    expect(salida).not.toMatch(/does not match collection schema/);
    expect(codigo).toBe(0);
  });

  it('una Cita sin procedencia rompe el build, con ruta del fichero y regla', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida({ procedencia: undefined }),
    });
    expect(codigo).not.toBe(0);
    // La ruta del fichero incumplidor tiene que aparecer: sin ella el editor no sabe
    // cuál de las mil Citas del corpus rompió el build.
    expect(salida).toContain('seneca--el-tiempo');
    expect(salida).toMatch(/procedencia/i);
  });

  it('una Procedencia presente pero que no documenta nada rompe el build', async () => {
    // El caso que un `z.object()` sin refinamiento dejaría pasar: el campo existe y
    // está vacío. El PRD lo cierra — sin Procedencia no se publica, va a _revision.
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida({ procedencia: {} }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/no documenta nada/);
  });

  it('«procedencia:» sin nada debajo falla diciendo la regla, no el tipo', async () => {
    // Es la forma natural de escribir «esto no lo tengo», y YAML la lee como null.
    // Sin preproceso el build falla con «Expected type object, received object», que
    // no dice nada al editor. El criterio exige que el mensaje indique la regla.
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': `---\ntexto: "Prueba."\nautor: "seneca"\nslug: "seneca-prueba"\nprocedencia:\nestadoDerechos: "dominio-público"\n---\n`,
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/no documenta nada/);
    expect(salida).not.toMatch(/Expected type `object`, received `object`/);
  });

  it('un Autor sin año de fallecimiento rompe el build, indicando el Autor', async () => {
    const { codigo, salida } = await construir({
      // Con clave de orden: el fallo tiene que venir del año, no de la puerta de la 26.1.
      'autores/seneca.yml': `nombre: Séneca\nsemblanza: Filósofo estoico hispanorromano.\nordenAlfabetico: "Séneca"\n`,
      'temas/el-tiempo.yml': TEMA_VALIDO,
      'citas/seneca--el-tiempo.md': citaValida(),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('seneca');
    expect(salida).toMatch(/añoFallecimiento/);
  });

  it('un estado de derechos distinto de dominio-público rompe el build', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida({ estadoDerechos: 'con-derechos' }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/estadoDerechos|dominio-público/);
  });

  it('Historia 19.1 — una traducción sin traductor rompe el build', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida({
        procedencia: { obra: 'Sobre la brevedad de la vida', traduccion: { año: 1909 } },
      }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/traductor/);
  });

  it('una Cita sin texto rompe el build', async () => {
    const { codigo } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida({ texto: undefined }),
    });
    expect(codigo).not.toBe(0);
  });

});

describe('Historia 29.1 — el salto de verso es un único U+000A (AD-29)', () => {
  const VERSOS = 'Yo vengo de todas partes,\nY hacia todas partes voy:';
  const DOCUMENTO_DE_VERSO = readFileSync(
    join(import.meta.dirname, 'ayuda/lineas/wikisource-es--versos-sencillos--versos-sencillos-i.txt'),
    'utf8',
  );
  const deVerso = (texto: string) =>
    citaValida({
      texto,
      slug: 'seneca-yo-vengo-de-todas-partes',
      procedencia: { obra: 'Versos sencillos' },
      fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Versos_sencillos/I' },
    });

  it('dos versos se escriben «…partes,\\nY hacia…», construyen y se leen con el mismo U+000A', async () => {
    const fichero = deVerso(VERSOS);
    expect(fichero).toContain('texto: "Yo vengo de todas partes,\\nY hacia todas partes voy:"');
    expect(separarFrontmatter(fichero)?.texto).toBe(VERSOS);
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'fuentes/wikisource-es--versos-sencillos--versos-sencillos-i.txt': DOCUMENTO_DE_VERSO,
      'citas/seneca--yo-vengo.md': fichero,
    });
    expect(salida).not.toMatch(/Regla incumplida/);
    expect(codigo).toBe(0);
  });

  const datos = (texto: string) => ({ ...(separarFrontmatter(citaValida()) as Record<string, unknown>), texto });
  const rechazos: [string, RegExp][] = [
    ['Yo vengo\r\nY hacia', /retornos de carro/],
    ['Yo vengo\n\nY hacia', /dos saltos seguidos/],
    ['\nYo vengo', /al principio ni al final/],
    ['Yo vengo\n', /al principio ni al final/],
    ['Yo vengo \nY hacia', /espacio .*ni un tabulador/],
    ['Yo vengo\t\nY hacia', /espacio .*ni un tabulador/],
    ['Yo vengo\n Y hacia', /espacio .*ni un tabulador/],
    ['Yo vengo\u00a0\nY hacia', /espacio .*ni un tabulador/],
    ['Yo vengo\n\u2009Y hacia', /espacio .*ni un tabulador/],
    ['Yo vengo\u2028Y hacia', /otro separador de línea/],
    ['Yo vengo\u2029Y hacia', /otro separador de línea/],
    ['Yo vengo\u0085Y hacia', /otro separador de línea/],
    ['Yo vengo\vY hacia', /otro separador de línea/],
    ['Yo vengo\fY hacia', /otro separador de línea/],
    // Un invisible entre dos saltos, o entre el salto y el borde, no los separa (revisión 2).
    ['Yo vengo\n\ufeff\nY hacia', /dos saltos seguidos/],
    ['Yo vengo\n\u200b\u00ad\nY hacia', /dos saltos seguidos/],
    ['\ufeff\nYo vengo', /al principio ni al final/],
    ['Yo vengo\n\u2060', /al principio ni al final/],
    ['Yo vengo\ufeff \nY hacia', /espacio .*ni un tabulador/],
    ['Yo vengo<br>Y hacia', /«<br»/],
    ['Yo vengo / Y hacia', /« \/ »/],
  ];
  for (const [texto, regla] of rechazos) {
    it(`rechaza ${JSON.stringify(texto)} con su regla`, () => {
      const resultado = citaAdmisible.safeParse(datos(texto));
      expect(resultado.success).toBe(false);
      const mensajes = resultado.success ? [] : resultado.error.issues.map((i) => i.message);
      expect(mensajes.some((m) => /^Regla incumplida: /u.test(m) && regla.test(m))).toBe(true);
    });
  }

  it('un solo salto entre versos se admite', () => {
    expect(citaAdmisible.safeParse(datos(VERSOS)).success).toBe(true);
    // U+FEFF casa con \s, pero es un invisible que el escritor conserva junto al salto.
    expect(citaAdmisible.safeParse(datos('Yo vengo de todas partes,\ufeff\nY hacia')).success).toBe(true);
  });

  it('dos saltos seguidos rompen el build, nombrando el fichero', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'fuentes/wikisource-es--versos-sencillos--versos-sencillos-i.txt': DOCUMENTO_DE_VERSO,
      'citas/seneca--yo-vengo.md': deVerso('Yo vengo de todas partes,\n\nY hacia todas partes voy:'),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('seneca--yo-vengo');
    expect(salida).toMatch(/dos saltos seguidos/);
  });
});

describe('Historia 1.2 — la puerta no vive en tools/', () => {
  it('las tres reglas se declaran en src/lib/admision.ts', () => {
    const reglas = readFileSync(resolve(RAIZ, 'src/lib/admision.ts'), 'utf8');
    expect(reglas).toMatch(/procedencia/);
    expect(reglas).toMatch(/añoFallecimiento/);
    expect(reglas).toMatch(/dominio-público/);
  });

  it('el esquema de contenido las cablea a las colecciones', () => {
    // Declararlas no basta: la puerta existe porque las colecciones las aplican.
    const esquema = readFileSync(resolve(RAIZ, 'src/content.config.ts'), 'utf8');
    expect(esquema).toMatch(/from '\.\/lib\/admision\.js'/);
    for (const regla of ['procedencia', 'añoFallecimiento', 'estadoDerechos']) {
      expect(esquema, `el esquema no aplica ${regla}`).toMatch(new RegExp(regla));
    }
  });

  it('ninguna herramienta redefine las reglas por su cuenta', () => {
    // Una copia de las reglas en `tools/` podría aceptar una Cita que el build luego
    // rechaza, y el editor descubriría el desacuerdo al construir en vez de al dar
    // de alta. Las herramientas importan; no redeclaran.
    for (const herramienta of readdirSync(resolve(RAIZ, 'tools'))) {
      if (!/\.(ts|mjs)$/.test(herramienta)) continue;
      const codigo = readFileSync(resolve(RAIZ, 'tools', herramienta), 'utf8');
      expect(codigo, `${herramienta} redeclara el estado de derechos`).not.toMatch(
        /z\.literal\(\s*['"]dominio-público/,
      );
    }
  });

  it('el fallo de validación es un fallo de build y no se degrada a aviso', () => {
    // Una integración que capturase el error de esquema para avisar y seguir
    // convertiría la puerta en una sugerencia. No debe existir.
    const config = readFileSync(resolve(RAIZ, 'astro.config.mjs'), 'utf8');
    expect(config).not.toMatch(/try\s*\{|catch\s*\(/);
  });
});

/*
 * Historia 35.1b, AD-32 — la puerta de la atribuida, sobre proyectos construidos de verdad. Las
 * cinco constantes se abren en la copia (`conLaPuertaAbierta`, que sustituye el valor que tengan);
 * lo puro está en `atribuidas.test.ts` y `atestiguaciones.test.ts`.
 */
describe('Historia 35.1b — la puerta de la atribuida en el build', () => {
  const VIVA = 'nombre: "Ana Ejemplo"\nvivo: true\nsemblanza: "Escritora."\nordenAlfabetico: "Ejemplo"\n';
  const VIVO = 'nombre: "Luis Prueba"\nvivo: true\nsemblanza: "Escritor."\nordenAlfabetico: "Prueba"\n';
  const atribuida = (autor: string, slug: string, texto: string, extra: Record<string, unknown> = {}) =>
    citaValida({
      texto,
      autor,
      slug,
      clase: 'atribuida',
      estadoDerechos: undefined,
      ...ATESTIGUADA,
      procedencia: { obra: 'Obras de Ana', año: 2020 },
      fuente: undefined,
      ...extra,
    });
  const BASE = {
    ...CORPUS_BASE,
    'autores/ana-ejemplo.yml': VIVA,
    'citas/seneca--el-tiempo.md': citaValida(),
  };
  const construirCon = async (corpus: Record<string, string>, ficheros?: Record<string, string>) => {
    const resultado = await construirConCorpus(corpus, ficheros === undefined ? {} : { ficheros });
    aLimpiar.push(resultado.proyecto);
    return resultado;
  };
  const html = (proyecto: string, ruta: string) => readFileSync(paginaConstruida(proyecto, ruta), 'utf8');

  it('con los cinco valores publica la feliz: sin Fuente no pinta la Línea de la Fuente; con ella, sí', async () => {
    const r = await construirCon(
      {
        ...BASE,
        'citas/ana-ejemplo--la-feliz.md': atribuida('ana-ejemplo', 'ana-ejemplo-la-feliz', 'Una frase que nadie más ha dicho nunca.'),
        'citas/ana-ejemplo--con-fuente.md': atribuida('ana-ejemplo', 'ana-ejemplo-con-fuente', 'Otra que sí trae su Fuente declarada.', {
          fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Obras_de_Ana' },
        }),
      },
      conLaPuertaAbierta(),
    );
    expect(r.codigo, r.salida).toBe(0);
    expect(html(r.proyecto, '/cita/ana-ejemplo-la-feliz/')).not.toMatch(/<p class="fuente"/u);
    expect(html(r.proyecto, '/cita/ana-ejemplo-con-fuente/')).toMatch(/<p class="fuente"/u);
    // Las atestiguaciones y el origen no viajan a `dist/`.
    expect(html(r.proyecto, '/cita/ana-ejemplo-la-feliz/')).not.toMatch(/elpais\.com|wikiquote/u);
  });

  it('con la puerta abierta rompe por cada tope, la figura sin Obra y el duplicado, nombrando recuento y tope', async () => {
    const r = await construirCon(
      {
        ...BASE,
        'autores/luis-prueba.yml': VIVO,
        'citas/ana-ejemplo--larga.md': atribuida('ana-ejemplo', 'ana-ejemplo-larga', `Larga ${'muy '.repeat(20)}larga.`, {
          procedencia: { obra: 'Otra obra de Ana', año: 2020 },
        }),
        'citas/ana-ejemplo--uno.md': atribuida('ana-ejemplo', 'ana-ejemplo-uno', 'La primera de su obra.'),
        'citas/ana-ejemplo--dos.md': atribuida('ana-ejemplo', 'ana-ejemplo-dos', 'Y la segunda, que no cabe.'),
        'citas/ana-ejemplo--copia.md': atribuida('ana-ejemplo', 'ana-ejemplo-copia', 'No es que tengamos poco tiempo, es que perdemos mucho.', {
          procedencia: { obra: 'Tercera obra de Ana', año: 2020 },
        }),
        'citas/luis-prueba--sin-obra.md': atribuida('luis-prueba', 'luis-prueba-sin-obra', 'Sin obra no hay atribuida.', {
          procedencia: { año: 2020 },
        }),
      },
      conLaPuertaAbierta({ MAX_CARACTERES_DE_ATRIBUIDA: 40, MAX_ATRIBUIDAS_POR_OBRA: 1, MAX_ATRIBUIDAS_POR_DUEÑO: 3 }),
    );
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toMatch(/corpus\/citas\/ana-ejemplo--larga\.md: la atribuida «ana-ejemplo-larga» tiene \d+ caracteres y el tope es 40 \(MAX_CARACTERES_DE_ATRIBUIDA\)/u);
    expect(r.salida).toMatch(/la Obra «ana-ejemplo--obras-de-ana» tendría 2 atribuidas y el tope es 1 \(MAX_ATRIBUIDAS_POR_OBRA\)/u);
    expect(r.salida).toMatch(/el Autor «ana-ejemplo» tendría 4 atribuidas y el tope es 3 \(MAX_ATRIBUIDAS_POR_DUEÑO\)/u);
    expect(r.salida).toMatch(/luis-prueba--sin-obra\.md: .*«luis-prueba», sin Personaje.*pregunta 23/u);
    expect(r.salida).toMatch(/ana-ejemplo--copia\.md: la atribuida «ana-ejemplo-copia» coincide con «seneca-no-es-que-tengamos-poco-tiempo», de la clase siempre/u);
  });

  it('el esquema: dominio de menos, BrainyQuote, salto de línea, apta para portada, y la de siempre con lo de la atribuida', async () => {
    const r = await construirCon(
      {
        ...BASE,
        'citas/ana-ejemplo--un-dominio.md': atribuida('ana-ejemplo', 'ana-ejemplo-un-dominio', 'Dos subdominios y un dominio.', {
          atestiguaciones: [
            { url: 'https://es.wikiquote.org/wiki/A', consultadaEl: '2026-11-01' },
            { url: 'https://www.brainyquote.com/a', consultadaEl: '2026-11-01' },
            { url: 'https://en.wikiquote.org/wiki/A', consultadaEl: '2026-11-01' },
          ],
        }),
      },
      conLaPuertaAbierta(),
    );
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('ana-ejemplo--un-dominio');
    expect(r.salida).toMatch(/la atestigua 1 dominio registrable \(wikiquote\.org\) y hacen falta 2/u);

    for (const [fichero, cita, regla] of [
      ['ana-ejemplo--salto.md', atribuida('ana-ejemplo', 'ana-ejemplo-salto', 'Un verso\nY otro verso'), /una sola línea/u],
      ['ana-ejemplo--apta.md', atribuida('ana-ejemplo', 'ana-ejemplo-apta', 'Apta para portada.', { aptaParaPortada: true }), /pregunta 22/u],
      ['seneca--con-origen.md', citaValida({ slug: 'seneca-con-origen', texto: 'Otra de siempre.', ...ATESTIGUADA }), /solo una Cita atribuida declara «atestiguaciones»/u],
      ['seneca--con-personaje.md', citaValida({ slug: 'seneca-con-personaje', texto: 'Otra más.', personaje: 'batman' }), /solo una Cita atribuida declara Personaje/u],
    ] as const) {
      const otro = await construirCon({ ...BASE, [`citas/${fichero}`]: cita }, conLaPuertaAbierta());
      expect(otro.codigo, fichero).not.toBe(0);
      expect(otro.salida, fichero).toContain(fichero.replace(/\.md$/u, ''));
      expect(otro.salida, fichero).toMatch(regla);
    }
  }, 900_000);

  it('con la puerta cerrada —el árbol, o una sola constante sin valor— rompe nombrando el fichero y las que faltan', async () => {
    const corpus = {
      ...BASE,
      'citas/ana-ejemplo--la-feliz.md': atribuida('ana-ejemplo', 'ana-ejemplo-la-feliz', 'Una frase que nadie más ha dicho nunca.'),
    };
    const arbol = await construirCon(corpus);
    expect(arbol.codigo).not.toBe(0);
    expect(arbol.salida).toMatch(
      /corpus\/citas\/ana-ejemplo--la-feliz\.md: la puerta de la atribuida está cerrada: no tienen valor MAX_CARACTERES_DE_ATRIBUIDA, MAX_ATRIBUIDAS_POR_OBRA, MAX_ATRIBUIDAS_POR_DUEÑO, MIN_ATESTIGUACIONES_DE_ATRIBUIDA, BUZON_DE_PETICIONES/u,
    );
    const sinBuzon = await construirCon(corpus, conLaPuertaAbierta({ BUZON_DE_PETICIONES: undefined }));
    expect(sinBuzon.codigo).not.toBe(0);
    expect(sinBuzon.salida).toMatch(/ana-ejemplo--la-feliz\.md: la puerta de la atribuida está cerrada: no tiene valor BUZON_DE_PETICIONES \(/u);
  });
});
