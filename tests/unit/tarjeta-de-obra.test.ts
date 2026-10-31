import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import ts from 'typescript';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { enlacesDe, recorrerElementos } from './ayuda/enlaces.js';
import { navDeSalidas } from './ayuda/rutas-de-salida.js';
import {
  cuantasTarjetasDeObra,
  leerTarjetaDeObra,
  tarjetaDeObraDe,
  textosDelEnlace,
} from './ayuda/tarjeta-de-obra.js';
import {
  FILA_VER_LA_OBRA,
  FILA_VER_LA_OBRA_Y_DONDE_LEERLA,
  contenidoDeTarjetaDeObra,
} from '../../src/lib/atribucion.ts';
import { formaDeObra, resolverObras, type FichaDeObra } from '../../src/lib/obras.ts';
import { componerDocumento, nombreDeDocumento } from '../../tools/lib/documento.ts';

/**
 * Historia 24.4 — bajo la Cita, la obra de la que sale (FR-12, UX-DR104).
 *
 * Tres partes, de la más barata a la más cara:
 *
 *   · **Sin construir**: lo que dice la tarjeta —`contenidoDeTarjetaDeObra`, sobre Obras
 *     resueltas con `resolverObras`, en cada fila de la matriz del spec—, el contrato de
 *     `TarjetaDeObra.astro` y de `FilaDeBloque.astro`, quién usa la tarjeta y la hoja de los dos.
 *   · **Una construcción que falla**: la tarjeta pintada con el Autor de otro.
 *   · **Una construcción**: la tarjeta en cada Página de Cita, leída de `dist/`.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const TARJETA = 'src/components/TarjetaDeObra.astro';
const FILA = 'src/components/FilaDeBloque.astro';

/** El glifo de avance de la v8.3 y la flecha descartada, por su punto de código. */
const AVANCE = '\u203A';
const FLECHA = '\u2192';

// ─── Lo que dice la tarjeta, sin construir ───────────────────────────────────

describe('Historia 24.4 — lo que dice la tarjeta, sin construir', () => {
  const ficha = (nombre: string, autor: string, titulo: string, extra: Partial<FichaDeObra> = {}): FichaDeObra => ({
    nombre,
    ruta: `corpus/obras/${nombre}.yml`,
    autor,
    titulo,
    formas: [formaDeObra(titulo)],
    ...extra,
  });

  interface CitaDePrueba {
    slug: string;
    autor: string;
    procedencia: { obra: string; año?: number; traduccion?: { traductor: string; año?: number } };
    fuente?: { id: string };
  }
  const cita = (
    slug: string,
    autor: string,
    obra: string,
    extra: { año?: number; traduccion?: { traductor: string; año?: number }; cotejada?: boolean } = {},
  ): CitaDePrueba => ({
    slug,
    autor,
    procedencia: {
      obra,
      ...(extra.año !== undefined ? { año: extra.año } : {}),
      ...(extra.traduccion !== undefined ? { traduccion: extra.traduccion } : {}),
    },
    ...(extra.cotejada === false ? {} : { fuente: { id: 'wikisource-es' } }),
  });

  /** Lo que la tarjeta dice de la Obra que resuelven `citas`, resuelta como en el build. */
  function contenidoDe(nombreDelAutor: string, f: FichaDeObra, citas: CitaDePrueba[]) {
    const obra = resolverObras(citas, [f]).get(f.nombre);
    expect(obra, f.nombre).toBeDefined();
    return contenidoDeTarjetaDeObra({ nombre: nombreDelAutor }, obra!);
  }

  it('los dos rótulos de la fila, sin el glifo de avance', () => {
    expect(FILA_VER_LA_OBRA_Y_DONDE_LEERLA).toBe('Ver la obra y dónde leerla');
    expect(FILA_VER_LA_OBRA).toBe('Ver la obra');
    for (const rotulo of [FILA_VER_LA_OBRA_Y_DONDE_LEERLA, FILA_VER_LA_OBRA]) {
      expect(rotulo).not.toContain(AVANCE);
      expect(rotulo).not.toContain(FLECHA);
    }
  });

  it('Obra de varias Citas, cotejada: «Séneca · 49 · 3 citas» y «Ver la obra y dónde leerla»', () => {
    const f = ficha('seneca--sobre-la-brevedad-de-la-vida', 'seneca', 'Sobre la brevedad de la vida');
    const citas = [0, 1, 2].map((i) => cita(`seneca-b-${i}`, 'seneca', 'Sobre la brevedad de la vida', { año: 49 }));
    expect(contenidoDe('Séneca', f, citas)).toEqual({
      hechos: ['Séneca', '49', '3 citas'],
      fila: FILA_VER_LA_OBRA_Y_DONDE_LEERLA,
    });
  });

  it('Obra de una Cita: «1 cita», en singular', () => {
    const f = ficha('seneca--de-la-ira', 'seneca', 'De la ira');
    expect(contenidoDe('Séneca', f, [cita('seneca-i', 'seneca', 'De la ira', { año: 41 })]).hechos).toEqual([
      'Séneca',
      '41',
      '1 cita',
    ]);
  });

  it('años discrepantes: sin año y sin hueco —dos partes, no tres—', () => {
    const f = ficha('seneca--cartas-a-lucilio', 'seneca', 'Cartas a Lucilio');
    const citas = [
      cita('seneca-c-0', 'seneca', 'Cartas a Lucilio', { año: 62 }),
      cita('seneca-c-1', 'seneca', 'Cartas a Lucilio', { año: 64 }),
    ];
    expect(contenidoDe('Séneca', f, citas).hechos).toEqual(['Séneca', '2 citas']);
  });

  it('solo año de traducción: «Epicteto · 2 citas», nunca 1888', () => {
    const f = ficha('epicteto--enquiridion', 'epicteto', 'Enquiridión');
    const traduccion = { traductor: 'Pablo de Prado', año: 1888 };
    const citas = [0, 1].map((i) => cita(`epicteto-e-${i}`, 'epicteto', 'Enquiridión', { traduccion }));
    const { hechos } = contenidoDe('Epicteto', f, citas);
    expect(hechos).toEqual(['Epicteto', '2 citas']);
    expect(hechos.join(' ')).not.toContain('1888');
  });

  it('antes de Cristo: «Aristóteles · 350 a. C. · 1 cita»', () => {
    const f = ficha('aristoteles--poetica', 'aristoteles', 'Poética');
    expect(contenidoDe('Aristóteles', f, [cita('aristoteles-p', 'aristoteles', 'Poética', { año: -350 })]).hechos).toEqual([
      'Aristóteles',
      '350 a. C.',
      '1 cita',
    ]);
  });

  it('Obra sin cotejar: «Ver la obra», aunque su ficha declare ediciones en venta', () => {
    const f = ficha('seneca--de-la-ira', 'seneca', 'De la ira', {
      ediciones: [{ tienda: 'tienda', formato: 'impresa', url: 'https://tienda.example/dp/1' }],
    });
    const citas = [0, 1].map((i) => cita(`seneca-s-${i}`, 'seneca', 'De la ira', { año: 41, cotejada: false }));
    expect(contenidoDe('Séneca', f, citas)).toEqual({ hechos: ['Séneca', '41', '2 citas'], fila: FILA_VER_LA_OBRA });
    // Basta una cotejada para prometer «dónde leerla».
    const una = [cita('seneca-s-0', 'seneca', 'De la ira', { año: 41 }), citas[1]];
    expect(contenidoDe('Séneca', f, una).fila).toBe(FILA_VER_LA_OBRA_Y_DONDE_LEERLA);
  });
});

// ─── El contrato de los componentes, sin construir ───────────────────────────

/** El frontmatter de un `.astro`, analizado. */
async function frontmatterDe(ruta: string): Promise<{ texto: string; fuente: ts.SourceFile }> {
  const [, texto] = (await readFile(join(RAIZ, ruta), 'utf8')).split(/^---$/m);
  return { texto, fuente: ts.createSourceFile(ruta, texto, ts.ScriptTarget.Latest, true) };
}

/** Los miembros de `interface Props`, por nombre: su tipo como texto y si son opcionales. */
async function propsDe(ruta: string): Promise<Map<string, { tipo: string; opcional: boolean; nodo: ts.TypeNode | undefined }>> {
  const { fuente } = await frontmatterDe(ruta);
  const props = fuente.statements.find(
    (s): s is ts.InterfaceDeclaration => ts.isInterfaceDeclaration(s) && s.name.text === 'Props',
  );
  expect(props, `${ruta}: sin \`interface Props\``).toBeDefined();
  const miembros = props!.members.filter(ts.isPropertySignature);
  expect(miembros, `${ruta}: \`Props\` con miembros que no son propiedades`).toHaveLength(props!.members.length);
  return new Map(
    miembros.map((m) => [
      m.name.getText(fuente),
      { tipo: m.type?.getText(fuente) ?? '', opcional: m.questionToken !== undefined, nodo: m.type },
    ]),
  );
}

/** Los ficheros de `src/` que pueden usar un componente de Astro, relativos a la raíz. */
async function astrosDeSrc(): Promise<string[]> {
  const entradas = await readdir(join(RAIZ, 'src'), { recursive: true, withFileTypes: true });
  return entradas
    .filter((e) => e.isFile() && /\.(astro|mdx)$/.test(e.name))
    .map((e) => {
      const padre = (e as { parentPath?: string }).parentPath ?? (e as { path?: string }).path ?? join(RAIZ, 'src');
      return join(padre, e.name).slice(RAIZ.length + 1).split('\\').join('/');
    });
}

/**
 * Las reglas de la hoja de un componente, sin comentarios. Aplana: una regla de dentro de un
 * `@media` sale como cualquier otra, sin su condición, y el `@media` mismo no sale.
 */
async function reglasDe(ruta: string): Promise<{ selector: string; declaraciones: Map<string, string> }[]> {
  const fuente = await readFile(join(RAIZ, ruta), 'utf8');
  const estilo = fuente.slice(fuente.indexOf('<style>')).replace(/\/\*[\s\S]*?\*\//g, '');
  return [...estilo.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, cuerpo]) => ({
    selector: selector.replace('<style>', '').trim(),
    declaraciones: new Map(
      cuerpo
        .split(';')
        .map((d) => d.trim())
        .filter((d) => d.includes(':'))
        .map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()] as const),
    ),
  }));
}

/** Un fichero sin sus comentarios: de bloque, de línea, de plantilla y de HTML. */
const sinComentarios = (texto: string) =>
  texto
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('Historia 24.4 — el contrato de los componentes, sin construir', () => {
  it('`TarjetaDeObra`: `cita`, `autor`, `nivel: 2 | 3` y `siguiente`, los cuatro obligatorios', async () => {
    const props = await propsDe(TARJETA);
    expect([...props.keys()].sort()).toEqual(['autor', 'cita', 'nivel', 'siguiente']);
    // Historia 24.5 — obligatorio y sin `?`: cada uso declara si hay «Siguiente…».
    expect(props.get('siguiente')).toMatchObject({ tipo: 'SiguienteCita | undefined', opcional: false });
    expect(props.get('cita')).toMatchObject({ tipo: 'Cita', opcional: false });
    expect(props.get('autor')).toMatchObject({ tipo: 'Autor', opcional: false });
    const nivel = props.get('nivel')!;
    expect(nivel.opcional, '`nivel` es opcional').toBe(false);
    expect(nivel.nodo !== undefined && ts.isUnionTypeNode(nivel.nodo), '`nivel` no es una unión').toBe(true);
    const literales = (nivel.nodo as ts.UnionTypeNode).types.map((t) => t.getText());
    expect(literales.sort()).toEqual(['2', '3']);
  });

  it('`TarjetaDeObra` no le da a `nivel` valor por omisión', async () => {
    const { fuente } = await frontmatterDe(TARJETA);
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
      if (ts.isVariableDeclaration(nodo) && ts.isObjectBindingPattern(nodo.name) && nodo.initializer?.getText(fuente) === 'Astro.props') {
        enlaces.push(...nodo.name.elements.filter((e) => e.name.getText(fuente) === 'nivel'));
      }
      if (ts.isBinaryExpression(nodo) && RELLENAN.has(nodo.operatorToken.kind) && /^(Astro\.props\.)?nivel$/.test(nodo.left.getText(fuente))) {
        rellenos.push(nodo.getText(fuente));
      }
      ts.forEachChild(nodo, visitar);
    };
    visitar(fuente);
    expect(enlaces, 'nadie desestructura `nivel` de `Astro.props`').toHaveLength(1);
    expect(enlaces[0].initializer, '`nivel` lleva un valor por omisión').toBeUndefined();
    expect(rellenos).toEqual([]);
  });

  it('`FilaDeBloque`: `href: string`, `zona: Zona` obligatoria del vocabulario y `avance?: boolean`', async () => {
    const props = await propsDe(FILA);
    expect([...props.keys()].sort()).toEqual(['avance', 'href', 'zona']);
    expect(props.get('href')).toMatchObject({ tipo: 'string', opcional: false });
    expect(props.get('zona')).toMatchObject({ tipo: 'Zona', opcional: false });
    expect(props.get('avance')).toMatchObject({ tipo: 'boolean', opcional: true });
    const { texto } = await frontmatterDe(FILA);
    expect(texto).toContain("import type { Zona } from '../lib/vocabulario.ts';");
  });

  it('`FilaDeBloque` pinta el glifo «›» (U+203A) en un `span` oculto, sin `target`, y nunca la flecha', async () => {
    const fuente = await readFile(join(RAIZ, FILA), 'utf8');
    const plantilla = sinComentarios(fuente.split(/^---$/m).slice(2).join('---'));
    expect(plantilla).toContain(`<span aria-hidden="true">&nbsp;${AVANCE}</span>`);
    expect(plantilla).toMatch(/<li class="fila-de-bloque" data-zona=\{zona\}><a href=\{href\}>/);
    expect(plantilla).not.toMatch(/\btarget=/);
    // La flecha descartada solo puede nombrarla un comentario, nunca el marcado ni la hoja.
    expect(sinComentarios(fuente)).not.toContain(FLECHA);
    expect(fuente).not.toMatch(/content\s*:/);
    expect(fuente).not.toMatch(/<svg\b/);
  });

  it('`TarjetaDeObra` no escribe enlaces, guiones ni marcas de Modelo, y la fila lleva su zona y su avance', async () => {
    const fuente = await readFile(join(RAIZ, TARJETA), 'utf8');
    // `<a` seguido de espacio o cierre: ni `<aside`, ni `<abbr`, ni `<article`.
    expect(sinComentarios(fuente)).not.toMatch(/<a[\s>]/);
    expect(fuente).not.toContain('<script');
    expect(fuente).not.toContain('data-ingreso');
    expect(sinComentarios(fuente)).not.toContain(FLECHA);
    expect(fuente).toContain('<section class="tarjeta-de-obra" aria-labelledby="de-la-obra" data-pagefind-ignore="all">');
    expect(fuente).toMatch(/<Rotulo id="de-la-obra" nivel=\{nivel\}>De la obra<\/Rotulo>/);
    expect(fuente).toMatch(/<FilaDeBloque href=\{rutaDeLaObra\(obra\)\} zona="tarjeta-de-obra" avance>/);
    // Historia 24.5 — «Siguiente…» delante, con su zona, solo si lo hay.
    expect(fuente).toContain(
      '<ul class="filas">{siguiente !== undefined && (<FilaDeBloque href={rutaDeCita(siguiente.cita.slug)} zona="siguiente" avance>{textoDeSiguiente(siguiente)}</FilaDeBloque>)}<FilaDeBloque href={rutaDeLaObra(obra)}',
    );
  });

  it('solo la Página de Cita usa la tarjeta: ni `BloqueDeCita`, ni la portada, ni el 404', async () => {
    const usan: string[] = [];
    for (const ruta of await astrosDeSrc()) {
      if (ruta === TARJETA) continue;
      if (/TarjetaDeObra\.astro['"]/.test(await readFile(join(RAIZ, ruta), 'utf8'))) usan.push(ruta);
    }
    expect(usan).toEqual(['src/pages/cita/[slug].astro']);
    const pagina = await readFile(join(RAIZ, 'src/pages/cita/[slug].astro'), 'utf8');
    const usos = [...sinComentarios(pagina).matchAll(/<TarjetaDeObra\b[^>]*\/>/g)].map((m) => m[0]);
    expect(usos).toEqual(['<TarjetaDeObra cita={cita} autor={autor} nivel={2} siguiente={siguiente} />']);
    // Entre la Fuente y Copiar.
    const plantilla = sinComentarios(pagina);
    const posicion = (marca: string) => plantilla.indexOf(marca);
    expect(posicion('<Fuente cita={cita} />')).toBeGreaterThan(-1);
    expect(posicion('<Fuente cita={cita} />')).toBeLessThan(posicion('<TarjetaDeObra'));
    expect(posicion('<TarjetaDeObra')).toBeLessThan(posicion('<CopiarCita'));
  });

  it('`Rotulo` admite `nivel?: 2 | 3`, por omisión 2', async () => {
    const props = await propsDe('src/components/Rotulo.astro');
    expect(props.get('nivel')).toMatchObject({ opcional: true });
    expect((props.get('nivel')!.nodo as ts.UnionTypeNode).types.map((t) => t.getText()).sort()).toEqual(['2', '3']);
    const { texto } = await frontmatterDe('src/components/Rotulo.astro');
    expect(texto).toMatch(/nivel\s*=\s*2\s*\}\s*=\s*Astro\.props/);
  });

  it('`Rotulo`: las dos ramas pintan el mismo marcado, salvo la etiqueta', async () => {
    // Dos ramas y no una etiqueta dinámica (el comentario de `Rotulo.astro` dice por qué): un
    // atributo que entre en una y no en la otra haría distinto el rótulo según su nivel.
    const fuente = await readFile(join(RAIZ, 'src/components/Rotulo.astro'), 'utf8');
    const ramas = [...fuente.matchAll(/<(h[23])\b([^>]*)>([\s\S]*?)<\/\1>/g)];
    expect(ramas.map((r) => r[1]).sort()).toEqual(['h2', 'h3']);
    const [h2, h3] = ['h2', 'h3'].map((etiqueta) => ramas.find((r) => r[1] === etiqueta)!);
    expect(h3[2]).toBe(h2[2]);
    expect(h3[3]).toBe(h2[3]);
  });

  it('la hoja de la tarjeta: plana, en tinta, con los tokens del spec y nada que recorte', async () => {
    const reglas = await reglasDe(TARJETA);
    const de = (selector: string) => {
      const regla = reglas.find((r) => r.selector === selector);
      expect(regla, `sin regla \`${selector}\``).toBeDefined();
      return regla!.declaraciones;
    };
    const seccion = de('.tarjeta-de-obra');
    expect(seccion.get('margin-top')).toBe('calc(var(--unidad) * 4)');
    expect(seccion.get('border-top')).toBe('var(--grosor-filete) solid var(--filete)');
    expect(seccion.get('padding-top')).toBe('calc(var(--unidad) * 3)');
    expect(seccion.get('max-width')).toBe('var(--medida-prosa)');

    const titulo = de('.titulo');
    expect(titulo.get('margin')).toBe('var(--unidad) 0 0');
    expect(titulo.get('font-family')).toBe('var(--sans)');
    expect(titulo.get('font-size')).toBe('var(--cuerpo-lg)');
    expect(titulo.get('font-weight')).toBe('var(--peso-fuerte)');
    // DESIGN.md § Typography: el título toma el interlineado de `author`, no el de su cuerpo.
    expect(titulo.get('line-height')).toBe('var(--interlineado-autor)');
    expect(titulo.get('color')).toBe('var(--tinta)');
    expect(titulo.get('text-wrap')).toBe('balance');
    expect(titulo.get('overflow-wrap')).toBe('break-word');
    expect(titulo.get('hyphens')).toBe('auto');

    const hechos = de('.hechos');
    expect(hechos.get('margin')).toBe('var(--unidad) 0 0');
    expect(hechos.get('font-family')).toBe('var(--sans)');
    expect(hechos.get('font-size')).toBe('var(--pie)');
    expect(hechos.get('font-weight')).toBe('var(--peso-regular)');
    expect(hechos.get('line-height')).toBe('var(--interlineado-pie)');
    expect(hechos.get('color')).toBe('var(--tinta-apagada)');

    const filas = de('.filas');
    expect(filas.get('list-style')).toBe('none');
    expect(filas.get('margin')).toBe('calc(var(--unidad) * 2) 0 0');
    expect(filas.get('padding')).toBe('0');
    expect(filas.get('border-top')).toBe('var(--grosor-filete) solid var(--filete)');

    // Ni fondo, ni radio, ni sombra, ni siena; y nada que recorte, en ninguna regla.
    for (const regla of reglas) {
      for (const prohibida of [
        'background',
        'background-color',
        'border-radius',
        'box-shadow',
        'white-space',
        'text-overflow',
        'line-clamp',
        '-webkit-line-clamp',
        'overflow',
        'overflow-x',
        'overflow-y',
        'max-height',
      ]) {
        expect(regla.declaraciones.has(prohibida), `\`${regla.selector}\` declara ${prohibida}`).toBe(false);
      }
    }
    const fuente = await readFile(join(RAIZ, TARJETA), 'utf8');
    expect(fuente).not.toMatch(/--siena|#[0-9a-f]{3,8}\b|\b(rgb|rgba|hsl|hsla)\(/i);
  });

  it('la hoja de la Fila de bloque: el trato de la Lista de Obras', async () => {
    const reglas = await reglasDe(FILA);
    const li = reglas.find((r) => r.selector === '.fila-de-bloque')?.declaraciones;
    const a = reglas.find((r) => r.selector === '.fila-de-bloque a')?.declaraciones;
    expect(li, 'sin regla `.fila-de-bloque`').toBeDefined();
    expect(a, 'sin regla `.fila-de-bloque a`').toBeDefined();
    expect(li!.get('border-bottom')).toBe('var(--grosor-filete) solid var(--filete)');
    expect(a!.get('display')).toBe('flex');
    expect(a!.get('align-items')).toBe('center');
    expect(a!.get('min-height')).toBe('var(--zona-de-toque)');
    expect(a!.get('padding-block')).toBe('calc(var(--unidad) * 1.25)');
    expect(a!.get('font-family')).toBe('var(--sans)');
    expect(a!.get('font-size')).toBe('var(--cuerpo-md)');
    expect(a!.get('line-height')).toBe('var(--interlineado-autor)');
    expect(a!.get('color')).toBe('var(--tinta)');
    expect(a!.get('text-decoration')).toBe('none');
    expect(['anywhere', 'break-word']).toContain(a!.get('overflow-wrap'));
    // El trato es el de la Lista de Obras, no una copia que pueda divergir: lo mismo que declaran
    // su enlace (`.lista-de-obras a`) y su título (`.titulo`).
    const lista = await reglasDe('src/components/ListaDeObras.astro');
    const enlaceDeLista = lista.find((r) => r.selector === '.lista-de-obras a')?.declaraciones;
    const tituloDeLista = lista.find((r) => r.selector === '.titulo')?.declaraciones;
    expect(enlaceDeLista, 'sin regla `.lista-de-obras a`').toBeDefined();
    expect(tituloDeLista, 'sin regla `.titulo` en la Lista de Obras').toBeDefined();
    for (const propiedad of ['box-sizing', 'min-height', 'padding-block', 'color', 'text-decoration']) {
      expect(a!.get(propiedad), propiedad).toBe(enlaceDeLista!.get(propiedad));
    }
    for (const propiedad of ['font-family', 'font-size', 'line-height']) {
      expect(a!.get(propiedad), propiedad).toBe(tituloDeLista!.get(propiedad));
    }
    for (const regla of reglas) {
      for (const prohibida of ['white-space', 'text-overflow', 'line-clamp', '-webkit-line-clamp', 'overflow', 'max-height']) {
        expect(regla.declaraciones.has(prohibida), `\`${regla.selector}\` declara ${prohibida}`).toBe(false);
      }
    }
  });
});

// ─── El fixture de las construcciones ────────────────────────────────────────

const WS = 'https://es.wikisource.org/wiki/';
const MACHADO =
  'nombre: Antonio Machado\nañoNacimiento: 1875\nañoFallecimiento: 1939\nsemblanza: Poeta sevillano de la generación del 98.\nordenAlfabetico: Machado\n';

const BREVEDAD = 'Sobre la brevedad de la vida';
const IRA = 'De la ira';
const CARTAS = 'Cartas a Lucilio';
/** El título de 163 caracteres de la matriz: sale entero, sin «…». */
const LARGO =
  'Soledades, galerías y otros poemas, con las canciones del alto Duero, los proverbios y los cantares del que hace camino al andar y las coplas de la tierra de Soria';

/** Las Citas sin Fuente van en el censo, que es cerrado (11.2): slugs suyos. */
const CARTAS_SIN = ['seneca-la-vida-si-sabes-usarla-es-larga', 'seneca-no-hay-viento-favorable-para-el-que'];
const SIN_OBRA = 'seneca-mientras-esperamos-vivir-la-vida-pasa';

interface Esperada {
  titulo: string;
  hechos: string[];
  fila: string;
  /** La ruta de su Obra, o el prefijo de Autor cuando el slug de la Obra sale del andamio. */
  obra: string | RegExp;
  noindex: boolean;
}

function corpusDeLaTarjeta(): { corpus: Record<string, string>; esperadas: Map<string, Esperada | undefined> } {
  const esperadas = new Map<string, Esperada | undefined>();
  const corpus: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'autores/antonio-machado.yml': MACHADO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    // Con el censo en el fixture el andamio no siembra documentos: se escriben aquí.
    'pendientes-de-cotejo.yml': `citas:\n${[...CARTAS_SIN, SIN_OBRA].map((s) => `  - ${s}\n`).join('')}`,
  };

  /** `n` Citas cotejadas de una Obra, con su documento. */
  function sembrar(autor: string, clave: string, titulo: string, n: number, año: number, esperada: Omit<Esperada, 'titulo'>) {
    const url = `${WS}${titulo.replaceAll(' ', '_')}`;
    const textos: string[] = [];
    for (let i = 0; i < n; i += 1) {
      const slug = `${autor}-${clave}-${i}`;
      const texto = `${clave} ${i}: una sentencia distinta para cada número, la ${i}.`;
      textos.push(texto);
      corpus[`citas/${autor}--${clave}-${i}.md`] = citaValida({
        autor,
        slug,
        texto,
        procedencia: { obra: titulo, año },
        fuente: { id: 'wikisource-es', url },
      });
      esperadas.set(slug, { titulo, ...esperada });
    }
    corpus[`fuentes/${nombreDeDocumento('wikisource-es', titulo)}.txt`] = componerDocumento(
      { fuente: 'wikisource-es', obra: titulo, url, recuperado: '2026-10-27' },
      titulo,
      textos.join('\n\n'),
    );
  }

  // Séneca, 7 Citas: Brevedad 3 cotejadas de 49 (se indexa), De la ira 1 de 41 (no se indexa),
  // Cartas 2 sin Fuente de 62 y 64 (sin año, sin cotejar) y una sin Obra.
  sembrar('seneca', 'brevedad', BREVEDAD, 3, 49, {
    hechos: ['Séneca', '49', '3 citas'],
    fila: FILA_VER_LA_OBRA_Y_DONDE_LEERLA,
    obra: '/obra/seneca/sobre-la-brevedad-de-la-vida/',
    noindex: false,
  });
  sembrar('seneca', 'ira', IRA, 1, 41, {
    hechos: ['Séneca', '41', '1 cita'],
    fila: FILA_VER_LA_OBRA_Y_DONDE_LEERLA,
    obra: '/obra/seneca/de-la-ira/',
    noindex: true,
  });
  const TEXTOS_CARTAS = ['La vida, si sabes usarla, es larga.', 'No hay viento favorable para el que no sabe adónde va.'];
  CARTAS_SIN.forEach((slug, i) => {
    corpus[`citas/seneca--cartas-sin-${i}.md`] = citaValida({
      slug,
      texto: TEXTOS_CARTAS[i],
      procedencia: { obra: CARTAS, año: 62 + 2 * i },
      fuente: undefined,
    });
    esperadas.set(slug, {
      titulo: CARTAS,
      hechos: ['Séneca', '2 citas'],
      fila: FILA_VER_LA_OBRA,
      obra: '/obra/seneca/cartas-a-lucilio/',
      noindex: false,
    });
  });
  corpus['citas/seneca--sin-obra.md'] = citaValida({
    slug: SIN_OBRA,
    texto: 'Mientras esperamos vivir, la vida pasa.',
    procedencia: { referencia: 'Carta 1' },
    fuente: undefined,
  });
  esperadas.set(SIN_OBRA, undefined);
  // Machado: la Obra del título de 163 caracteres, 2 cotejadas; es toda su obra, no se indexa.
  sembrar('antonio-machado', 'soledades', LARGO, 2, 1907, {
    hechos: ['Antonio Machado', '1907', '2 citas'],
    fila: FILA_VER_LA_OBRA_Y_DONDE_LEERLA,
    obra: /^\/obra\/antonio-machado\/soledades-[a-z0-9-]+\/$/,
    noindex: true,
  });
  return { corpus, esperadas };
}

// ─── Una construcción que falla ──────────────────────────────────────────────

describe('Historia 24.4 — la tarjeta con el Autor de otro detiene la construcción', () => {
  it('código distinto de 0, nombrando la Cita, la ruta y los dos Autores', async () => {
    const PRIMERA = 'seneca-brevedad-0';
    const SONDA = `---
import TarjetaDeObra from '../components/TarjetaDeObra.astro';
import { conjuntoPublicable } from '../lib/publicado.ts';
const conjunto = await conjuntoPublicable();
const cita = conjunto.citas.find((c) => c.slug === '${PRIMERA}')!;
const otro = conjunto.autores.find((a) => a.slug === 'antonio-machado')!;
---
<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><title>Sonda</title></head>
<body><TarjetaDeObra cita={cita} autor={otro} nivel={2} siguiente={undefined} /></body></html>
`;
    const resultado = await construirConCorpus(corpusDeLaTarjeta().corpus, {
      paginas: { 'sonda-tarjeta-de-obra.astro': SONDA },
    });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).not.toBe(0);
    expect(resultado.salida).toMatch(
      new RegExp(`«${PRIMERA}»[^\\n]*/sonda-tarjeta-de-obra/?[^\\n]*«antonio-machado»[^\\n]*«seneca»`),
    );
  }, 300_000);

  /*
   * Historia 24.5 — la misma guarda para «Siguiente…»: un uso que no venga de `siguienteCita`
   * (la portada dirá el suyo, 28.2) y lleve a la propia Cita o, «de esta obra», a otro libro.
   */
  const sondaDeSiguiente = (destino: string) => `---
import TarjetaDeObra from '../components/TarjetaDeObra.astro';
import { conjuntoPublicable } from '../lib/publicado.ts';
const conjunto = await conjuntoPublicable();
const cita = conjunto.citas.find((c) => c.slug === 'seneca-brevedad-0')!;
const autor = conjunto.autores.find((a) => a.slug === 'seneca')!;
const destino = conjunto.citas.find((c) => c.slug === '${destino}')!;
---
<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><title>Sonda</title></head>
<body><TarjetaDeObra cita={cita} autor={autor} nivel={2} siguiente={{ por: 'obra', cita: destino }} /></body></html>
`;

  it('24.5 — «Siguiente…» a la propia Cita detiene la construcción, nombrándola', async () => {
    const resultado = await construirConCorpus(corpusDeLaTarjeta().corpus, {
      paginas: { 'sonda-siguiente.astro': sondaDeSiguiente('seneca-brevedad-0') },
    });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).not.toBe(0);
    expect(resultado.salida).toMatch(/«Siguiente…» de la Cita «seneca-brevedad-0»[^\n]*lleva a la propia Cita/);
  }, 300_000);

  it('24.5 — «Siguiente cita de esta obra» a una Cita de otra Obra detiene la construcción', async () => {
    const resultado = await construirConCorpus(corpusDeLaTarjeta().corpus, {
      paginas: { 'sonda-siguiente.astro': sondaDeSiguiente('seneca-ira-0') },
    });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).not.toBe(0);
    expect(resultado.salida).toMatch(
      /«Siguiente…» de la Cita «seneca-brevedad-0»[^\n]*lleva a «seneca-ira-0», de otra Obra/,
    );
  }, 300_000);
});

// ─── Una construcción ────────────────────────────────────────────────────────

/**
 * La sonda del nivel 3: la tarjeta como la pintará la portada (28.2), bajo otro `h2`, y el
 * `Rotulo` con y sin `nivel`. Sin armazón: no es una superficie del sitio.
 */
/** Una página sin sus `<style>` en línea: lo que se mira es el marcado. */
const sinHojas = (pagina: string) => pagina.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '');

const SONDA_NIVEL_3 = `---
import TarjetaDeObra from '../components/TarjetaDeObra.astro';
import Rotulo from '../components/Rotulo.astro';
import { conjuntoPublicable } from '../lib/publicado.ts';
const conjunto = await conjuntoPublicable();
const cita = conjunto.citas.find((c) => c.slug === 'seneca-brevedad-0')!;
const autor = conjunto.autores.find((a) => a.slug === cita.autor)!;
---
<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><title>Sonda</title></head>
<body><h2>La cita de hoy</h2><TarjetaDeObra cita={cita} autor={autor} nivel={3} siguiente={undefined} />
<Rotulo id="sin-nivel">Sin nivel</Rotulo><Rotulo id="nivel-2" nivel={2}>Nivel 2</Rotulo><Rotulo id="nivel-3" nivel={3}>Nivel 3</Rotulo>
<Rotulo id="destino-2" destino>Destino 2</Rotulo><Rotulo id="destino-3" nivel={3} destino>Destino 3</Rotulo></body></html>
`;

/** El enlace de la fila «Ver la obra» de una tarjeta: el único con la zona `tarjeta-de-obra`. */
function filaDeLaObra(tarjeta: string) {
  const filas = enlacesDe(tarjeta).filter(
    (e) => e.declaracion !== null && 'zona' in e.declaracion && e.declaracion.zona === 'tarjeta-de-obra',
  );
  expect(filas).toHaveLength(1);
  return filas[0];
}

describe('Historia 24.4 — la tarjeta en cada Página de Cita, construida', () => {
  const { corpus, esperadas } = corpusDeLaTarjeta();
  let proyecto = '';
  const html = (ruta: string) => readFile(paginaConstruida(proyecto, ruta), 'utf8');

  beforeAll(async () => {
    const resultado = await construirConCorpus(corpus, { paginas: { 'sonda-nivel-3.astro': SONDA_NIVEL_3 } });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  }, 300_000);

  it('el fixture es el de la matriz', () => {
    expect(LARGO).toHaveLength(163);
    expect([...esperadas.values()].filter((e) => e === undefined)).toHaveLength(1);
  });

  it('toda Página de Cita con Obra tiene una sola tarjeta, y la sin Obra ninguna ni su rótulo', async () => {
    const construidas = (await readdir(join(proyecto, 'dist', 'cita'))).sort();
    expect(construidas).toEqual([...esperadas.keys()].sort());
    for (const [slug, esperada] of esperadas) {
      const pagina = await html(`/cita/${slug}/`);
      if (esperada === undefined) {
        // El marcado, sin las hojas en línea: la sonda del nivel 3 comparte la hoja de la
        // tarjeta con la Página de Cita, y Astro puede ponerla en línea en todas. Y sin las
        // Rutas de salida —solo ese `nav`, lo de después sigue mirándose—: desde la 24.6 sus
        // cierres son Filas de bloque, que no son de la tarjeta.
        const sinEstilo = sinHojas(pagina);
        const pie = navDeSalidas(sinEstilo);
        const marcado = pie === undefined ? sinEstilo : sinEstilo.replace(pie, '');
        expect(cuantasTarjetasDeObra(pagina), slug).toBe(0);
        expect(marcado, slug).not.toContain('tarjeta-de-obra');
        expect(marcado, slug).not.toContain('De la obra');
        expect(marcado, slug).not.toContain('fila-de-bloque');
        // Copiar sigue a la Atribución, sin nada entre medias.
        const article = pagina.slice(pagina.indexOf('<article'));
        expect(article.indexOf('</figure>'), slug).toBeLessThan(article.indexOf('<div class="isla"'));
      } else {
        expect(cuantasTarjetasDeObra(pagina), slug).toBe(1);
      }
    }
  });

  it('después de la Cita y su Fuente, antes de Copiar, dentro de `article`, fuera de Pagefind y sin Modelo', async () => {
    for (const [slug, esperada] of esperadas) {
      if (esperada === undefined) continue;
      const pagina = await html(`/cita/${slug}/`);
      const tarjeta = tarjetaDeObraDe(pagina)!;
      const donde = pagina.indexOf(tarjeta);
      const inicioDeArticle = pagina.indexOf('<article');
      expect(inicioDeArticle, slug).toBeGreaterThan(-1);
      expect(donde, slug).toBeGreaterThan(inicioDeArticle);
      expect(donde, slug).toBeLessThan(pagina.indexOf('</article>'));
      expect(donde, slug).toBeGreaterThan(pagina.indexOf('</figure>', inicioDeArticle));
      const fuente = pagina.indexOf('<p class="fuente"', inicioDeArticle);
      if (fuente !== -1) expect(donde, slug).toBeGreaterThan(fuente);
      // Las cotejadas tienen Línea de la Fuente; las de Cartas, no.
      expect(fuente !== -1, slug).toBe(esperada.fila === FILA_VER_LA_OBRA_Y_DONDE_LEERLA);
      expect(donde + tarjeta.length, slug).toBeLessThanOrEqual(pagina.indexOf('<div class="isla"', inicioDeArticle));

      // Un antepasado —o ella misma— fuera de Pagefind con `all`, y ningún Modelo dentro.
      let ignorada = false;
      recorrerElementos(pagina, (elemento, antepasados) => {
        if (elemento.etiqueta !== 'section' || elemento.atributos.get('class') !== 'tarjeta-de-obra') return;
        ignorada = [elemento, ...antepasados].some((e) => e.atributos.get('data-pagefind-ignore') === 'all');
        expect(antepasados.some((e) => e.etiqueta === 'article'), slug).toBe(true);
      });
      expect(ignorada, slug).toBe(true);
      expect(tarjeta, slug).not.toContain('data-ingreso');
      expect(tarjeta, slug).not.toContain('<script');
    }
  });

  it('el rótulo, el título entero sin enlace y los hechos con sus pausas', async () => {
    for (const [slug, esperada] of esperadas) {
      if (esperada === undefined) continue;
      const leida = leerTarjetaDeObra(tarjetaDeObraDe(await html(`/cita/${slug}/`))!);
      expect(leida.apertura, slug).toContain('aria-labelledby="de-la-obra"');
      expect(leida.rotulo, slug).toEqual({ etiqueta: 'h2', id: 'de-la-obra', texto: 'De la obra' });
      expect(leida.titulo, slug).toEqual({ texto: esperada.titulo, conEnlace: false });
      expect(leida.titulo!.texto, slug).not.toContain('…');
      expect(leida.hechos!.vista, slug).toBe(esperada.hechos.join(' · '));
      expect(leida.hechos!.lector, slug).toBe(esperada.hechos.join(', '));
      // Ningún separador al principio ni al final.
      expect(leida.hechos!.marcado, slug).toMatch(/^[^<]/);
      expect(leida.hechos!.marcado, slug).toMatch(/[^>]$/);
    }
  });

  it('años discrepantes: la Atribución dice el año de su Cita, y la tarjeta, que es de la Obra, ninguno', async () => {
    // A propósito (22.3): el año de la línea de la Procedencia es el de esa Cita; el de la tarjeta,
    // el de la Obra resuelta, que no lo tiene cuando sus Citas discrepan.
    for (const [i, slug] of CARTAS_SIN.entries()) {
      const pagina = await html(`/cita/${slug}/`);
      expect(pagina, slug).toMatch(new RegExp(`<p class="procedencia"[^>]*><a [^>]*>${CARTAS}</a>, ${62 + 2 * i}\\.`));
      const hechos = leerTarjetaDeObra(tarjetaDeObraDe(pagina)!).hechos!;
      expect(hechos.vista, slug).toBe('Séneca · 2 citas');
      expect(hechos.vista, slug).not.toMatch(/\b6[24]\b/);
    }
  });

  it('la fila de la Obra es el último enlace y el único con `tarjeta-de-obra`: su texto y «›», a su página 1, con su zona', async () => {
    const conSiguiente: string[] = [];
    for (const [slug, esperada] of esperadas) {
      if (esperada === undefined) continue;
      const tarjeta = tarjetaDeObraDe(await html(`/cita/${slug}/`))!;
      expect(tarjeta, slug).not.toContain(FLECHA);
      const enlaces = enlacesDe(tarjeta);
      // Historia 24.5 — delante, como mucho, «Siguiente…» con su propia zona.
      const zonas = enlaces.map((e) => (e.declaracion !== null && 'zona' in e.declaracion ? e.declaracion.zona : null));
      expect(zonas.filter((z) => z === 'tarjeta-de-obra'), slug).toHaveLength(1);
      expect(zonas.at(-1), slug).toBe('tarjeta-de-obra');
      expect(zonas.slice(0, -1).every((z) => z === 'siguiente'), slug).toBe(true);
      if (zonas.length === 2) conSiguiente.push(slug);
      expect(zonas.length, slug).toBeLessThanOrEqual(2);
      const enlace = enlaces.at(-1)!;
      expect(enlace.target, slug).toBeUndefined();
      expect(enlace.declaracion, slug).toEqual({ zona: 'tarjeta-de-obra' });
      if (typeof esperada.obra === 'string') expect(enlace.href, slug).toBe(esperada.obra);
      else expect(enlace.href, slug).toMatch(esperada.obra);
      expect(existsSync(paginaConstruida(proyecto, enlace.href!)), `${slug} → ${enlace.href}`).toBe(true);

      const interior = /<li class="fila-de-bloque" data-zona="tarjeta-de-obra"[^>]*><a\b[^>]*>([\s\S]*?)<\/a>/.exec(tarjeta)![1];
      expect(textosDelEnlace(interior).lector, slug).toBe(esperada.fila);
      // Texto y glifo en un solo `span`, el único hijo del enlace flexible: si fueran dos
      // hijos, al partir el texto el glifo quedaría en su propia columna y no tras la última
      // palabra.
      expect(interior, slug).toMatch(/^<span\b(?![^>]*aria-hidden)[^>]*>[^<]+<span aria-hidden="true"[^>]*>&nbsp;›<\/span><\/span>$/);
      const ocultos = [...interior.matchAll(/<span\b[^>]*aria-hidden="true"[^>]*>([\s\S]*?)<\/span>/g)].map((m) =>
        m[1].replace(/&nbsp;/g, '\u00A0'),
      );
      expect(ocultos, slug).toEqual([`\u00A0${AVANCE}`]);
      // El glifo va detrás del texto, pegado.
      expect(interior.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '\u00A0'), slug).toBe(`${esperada.fila}\u00A0${AVANCE}`);
    }
    // «Siguiente…» solo en las Obras de dos Citas o más: Brevedad, Cartas y Machado; De la ira,
    // de una Cita y sin Tema publicado, no lo lleva.
    expect(conSiguiente.sort()).toEqual(
      [...esperadas]
        .filter(([, e]) => e !== undefined && e.hechos.at(-1) !== '1 cita')
        .map(([slug]) => slug)
        .sort(),
    );
    expect(conSiguiente).not.toContain('seneca-ira-0');
    expect(conSiguiente).toHaveLength(7);
  });

  it('la Obra `noindex` enlaza igual, a su página 1', async () => {
    const vistas: string[] = [];
    for (const [slug, esperada] of esperadas) {
      if (esperada === undefined) continue;
      const href = filaDeLaObra(tarjetaDeObraDe(await html(`/cita/${slug}/`))!).href!;
      const obra = await html(href);
      expect(/<meta name="robots" content="noindex, follow"/.test(obra), `${slug} → ${href}`).toBe(esperada.noindex);
      if (esperada.noindex) vistas.push(slug);
    }
    expect(vistas.sort()).toEqual(['antonio-machado-soledades-0', 'antonio-machado-soledades-1', 'seneca-ira-0']);
  });

  it('la página a la que lleva cumple lo que promete la fila: «y dónde leerla» solo con edición cotejada', async () => {
    for (const [slug, esperada] of esperadas) {
      if (esperada === undefined) continue;
      const href = filaDeLaObra(tarjetaDeObraDe(await html(`/cita/${slug}/`))!).href!;
      const obra = await html(href);
      expect(obra, `${slug} → ${href}`).toContain('Dónde leer esta obra');
      const cotejada = obra.includes('id="edicion-cotejada"');
      expect(cotejada, `${slug} → ${href}`).toBe(esperada.fila === FILA_VER_LA_OBRA_Y_DONDE_LEERLA);
      if (!cotejada) expect(obra, `${slug} → ${href}`).toContain('Ninguna de sus citas tiene todavía documento cotejado.');
    }
  });

  it('ni la portada ni el 404 llevan la tarjeta', async () => {
    for (const ruta of ['index.html', '404.html']) {
      const fichero = join(proyecto, 'dist', ruta);
      expect(existsSync(fichero), ruta).toBe(true);
      const marcado = sinHojas(await readFile(fichero, 'utf8'));
      expect(marcado, ruta).not.toContain('tarjeta-de-obra');
      expect(marcado, ruta).not.toContain('fila-de-bloque');
    }
  });

  it('con `nivel={3}` el rótulo es un `h3`, y `Rotulo` sin `nivel` sigue siendo un `h2`', async () => {
    const sonda = await html('/sonda-nivel-3/');
    const leida = leerTarjetaDeObra(tarjetaDeObraDe(sonda)!);
    expect(leida.rotulo).toEqual({ etiqueta: 'h3', id: 'de-la-obra', texto: 'De la obra' });
    expect(leida.titulo).toEqual({ texto: BREVEDAD, conEnlace: false });
    const rotulos = [...sonda.matchAll(/<(h[1-6])\b([^>]*)>/g)]
      .filter((m) => /\bclass="rotulo"/.test(m[2]))
      .map((m) => [/\bid="([^"]+)"/.exec(m[2])?.[1], m[1]]);
    expect(Object.fromEntries(rotulos)).toEqual({
      'de-la-obra': 'h3',
      'sin-nivel': 'h2',
      'nivel-2': 'h2',
      'nivel-3': 'h3',
      'destino-2': 'h2',
      'destino-3': 'h3',
    });
    // Con `destino`, las dos ramas lo hacen enfocable igual: solo cambia la etiqueta.
    const apertura = (id: string) => new RegExp(`<h[23]\\b([^>]*\\bid="${id}"[^>]*)>`).exec(sonda)?.[1];
    expect(apertura('destino-3')).toContain('tabindex="-1"');
    expect(apertura('destino-3')?.replace('destino-3', 'X')).toBe(apertura('destino-2')?.replace('destino-2', 'X'));
  });
});
