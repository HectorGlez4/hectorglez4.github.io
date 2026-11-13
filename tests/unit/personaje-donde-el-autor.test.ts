import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ATESTIGUADA,
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  coleccionValida,
  conLaPuertaAbierta,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { mensajeDeDueñoSinPagina } from '../../src/lib/publicado.ts';

/**
 * Historia 35.4 — el Personaje va donde va el Autor, sobre un sitio construido de verdad.
 *
 * Las cuatro Citas de la matriz del spec y una de siempre, en un mismo Tema que llega a
 * `MIN_CITAS_POR_TEMA` con atribuidas de relleno de la Autora Viva:
 *
 *   · **B1** y **B2** — de Batman sin Autor, de su Obra «El caballero» (ficha de Personaje);
 *   · **B3** — de Batman con Séneca, de la Obra «Obras de Séneca», de Séneca;
 *   · **B4** — de Batman con Séneca, sin Obra;
 *   · **V1** — de la Autora Viva sola (atribuida, con derechos vigentes);
 *   · **S1** — la de siempre de Séneca, cotejada, de «Sobre la brevedad de la vida».
 *
 * La puerta de la atribuida se abre en la copia (`conLaPuertaAbierta`), nunca en el árbol. Ninguna
 * atribuida lleva Fuente: no se cotejan. Lo puro —la firma, lo copiado, el Fragmento, «Siguiente» y
 * las Rutas por dueño, el pasaje— está en `atribucion.test.ts`, `siguiente.test.ts`,
 * `rutas-de-salida.test.ts` y `pasaje.test.ts`.
 */

const AUTOR_VIVO = `nombre: "Autora Viva"
vivo: true
semblanza: "Escritora de hoy."
ordenAlfabetico: "Viva"
`;

const BATMAN = `nombre: "Batman"
universo: "DC Comics"
ordenAlfabetico: "Batman"
`;

const FICHA_DE_BATMAN = `personaje: "batman"
personajes:
  - "batman"
titulo: "El caballero"
formas:
  - "el caballero"
`;

const B1 = 'batman-soy-la-noche';
const B2 = 'batman-la-capa-pesa-menos';
const B3 = 'seneca-con-batman-y-obra';
const B4 = 'seneca-con-batman-sin-obra';
const V1 = 'vivo-la-autora-sola';
const S1 = 'seneca-no-es-que-tengamos-poco-tiempo';

const TEXTOS: Record<string, string> = {
  [B1]: 'Soy la noche que vigila la ciudad dormida.',
  [B2]: 'La capa pesa menos que el recuerdo de aquella calle.',
  [B3]: 'Quien guarda silencio en el tejado conoce cada promesa.',
  [B4]: 'Un murciélago no pide permiso al campanario.',
  [V1]: 'La autora dice que el tiempo cabe en una taza.',
};

const atribuida = (campos: Record<string, unknown>) =>
  citaValida({
    clase: 'atribuida',
    estadoDerechos: undefined,
    fuente: undefined,
    ...ATESTIGUADA,
    ...campos,
  });

/** Seis palabras por un xorshift sembrado con n: ningún relleno casa con otro por `parecidoEntre`. */
const PALABRAS = ['río', 'piedra', 'luz', 'sombra', 'camino', 'viento', 'mar', 'fuego', 'nube', 'árbol', 'pan',
  'sal', 'hierro', 'vidrio', 'lluvia', 'nieve', 'campo', 'puerta', 'casa', 'libro', 'sueño', 'voz', 'mano'];
const textoPropio = (n: number) => {
  let x = (n * 2654435761) >>> 0;
  const palabras: string[] = [];
  for (let k = 0; k < 6; k += 1) {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    palabras.push(PALABRAS[x % PALABRAS.length]);
  }
  return `Relleno ${n}: ${palabras.join(' y ')}.`;
};

const CORPUS: Record<string, string> = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'autores/vivo.yml': AUTOR_VIVO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'personajes/batman.yml': BATMAN,
  'obras/batman--el-caballero.yml': FICHA_DE_BATMAN,
  [`citas/batman--soy-la-noche.md`]: atribuida({
    slug: B1,
    texto: TEXTOS[B1],
    autor: undefined,
    personaje: 'batman',
    procedencia: { obra: 'El caballero', año: 2000 },
  }),
  [`citas/batman--la-capa-pesa-menos.md`]: atribuida({
    slug: B2,
    texto: TEXTOS[B2],
    autor: undefined,
    personaje: 'batman',
    procedencia: { obra: 'El caballero', año: 2000 },
  }),
  [`citas/seneca--con-batman-y-obra.md`]: atribuida({
    slug: B3,
    texto: TEXTOS[B3],
    autor: 'seneca',
    personaje: 'batman',
    procedencia: { obra: 'Obras de Séneca', año: 2000 },
  }),
  [`citas/seneca--con-batman-sin-obra.md`]: atribuida({
    slug: B4,
    texto: TEXTOS[B4],
    autor: 'seneca',
    personaje: 'batman',
    procedencia: { año: 2000 },
  }),
  [`citas/vivo--la-autora-sola.md`]: atribuida({
    slug: V1,
    texto: TEXTOS[V1],
    autor: 'vivo',
    procedencia: { obra: 'Obras de la autora', año: 2010 },
  }),
  [`citas/seneca--no-es-que-tengamos-poco-tiempo.md`]: citaValida(),
};
// Hasta `MIN_CITAS_POR_TEMA` (15), con atribuidas de la Autora Viva de otra Obra.
for (let i = 1; i <= 12; i += 1) {
  const n = String(i).padStart(2, '0');
  CORPUS[`citas/vivo--relleno-${n}.md`] = atribuida({
    slug: `vivo-relleno-${n}`,
    texto: textoPropio(i),
    autor: 'vivo',
    procedencia: { obra: 'Relleno de la autora', año: 2011 },
  });
}

// Una Colección con las atribuidas y la de siempre, hasta `MIN_CITAS_POR_COLECCION` (15) con relleno.
CORPUS['colecciones/con-batman.yml'] = coleccionValida({
  nombre: 'Con Batman',
  miembros: [B1, B2, B3, B4, V1, S1, ...Array.from({ length: 9 }, (_, i) => `vivo-relleno-${String(i + 1).padStart(2, '0')}`)],
});

/** Sonda: lo que la Tarjeta Social de cada Obra lleva escrito, antes de rasterizarlo. */
const SONDA_DE_TARJETAS_DE_OBRA = `---
import { getStaticPaths } from './tarjeta/obra/[autor]/[slug].png.ts';
const rutas = await getStaticPaths();
---
<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><title>Sonda</title></head>
<body><pre id="tarjetas">{JSON.stringify(rutas.map((r) => ({ ...r.params, ...r.props })))}</pre></body></html>
`;

/** Sonda: lo que la Tarjeta Social de cada Cita lleva escrito, antes de rasterizarlo. */
const SONDA_DE_TARJETAS = `---
import { getStaticPaths } from './tarjeta/[slug].png.ts';
const rutas = await getStaticPaths();
---
<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><title>Sonda</title></head>
<body><pre id="tarjetas">{JSON.stringify(rutas.map((r) => ({ slug: r.params.slug, ...r.props })))}</pre></body></html>
`;

let proyecto = '';
let salida = '';
let codigo = -1;

beforeAll(async () => {
  const r = await construirConCorpus(CORPUS, {
    jornada: '2026-11-12',
    ficheros: conLaPuertaAbierta(),
    paginas: { 'sonda-tarjetas.astro': SONDA_DE_TARJETAS, 'sonda-tarjetas-de-obra.astro': SONDA_DE_TARJETAS_DE_OBRA },
  });
  proyecto = r.proyecto;
  salida = r.salida;
  codigo = r.codigo;
}, 600_000);

afterAll(async () => {
  if (proyecto !== '') await limpiar(proyecto);
});

const html = (ruta: string) => readFileSync(paginaConstruida(proyecto, ruta), 'utf8');
const cita = (slug: string) => html(`/cita/${slug}/`);

/** El `<figcaption>` de la Página de Cita: la Atribución entera. */
const atribucion = (slug: string) => /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/u.exec(cita(slug))?.[1] ?? '';
/** La sección de la Tarjeta de Obra, o '' si no la hay. */
const tarjetaDeObra = (slug: string) => /<section class="tarjeta-de-obra"[\s\S]*?<\/section>/u.exec(cita(slug))?.[0] ?? '';
/** El JSON-LD de una página (el primero). */
const jsonLd = (pagina: string): Record<string, unknown> =>
  JSON.parse(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/u.exec(pagina)?.[1] ?? '{}');
const titulo = (pagina: string) => /<title>([^<]*)<\/title>/u.exec(pagina)?.[1] ?? '';
const meta = (pagina: string) => /<meta name="description" content="([^"]*)"/u.exec(pagina)?.[1] ?? '';
/** Lo que se lleva Copiar: la carga de la isla. */
const copiado = (pagina: string) => /data-texto-plano="([^"]*)"/u.exec(pagina)?.[1];
/** El texto de cada `<summary>`, sin el glifo. */
const desplegables = (pagina: string) =>
  [...pagina.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/gu)].map((m) =>
    m[1].replace(/<span class="glifo"[\s\S]*$/u, '').replace(/<[^>]*>/gu, '').trim(),
  );
/** La línea de hechos de la Tarjeta de Obra como se ve: «{dueño} · {año} · {n} citas». */
const hechos = (slug: string) =>
  (/<p class="hechos"[^>]*>([\s\S]*?)<\/p>/u.exec(tarjetaDeObra(slug))?.[1] ?? '')
    .replace(/<span class="solo-para-lectores"[^>]*>[^<]*<\/span>/gu, '')
    .replace(/<[^>]*>/gu, '');
const deEntidades = (texto: string) =>
  texto.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#34;', '"').replaceAll('&amp;', '&');
/** Lo que se lleva «Compartir en»: el texto de la isla. */
const compartido = (pagina: string) => {
  const crudo = /<div[^>]*data-compartir[^>]*data-texto="([^"]*)"/u.exec(pagina)?.[1];
  return crudo === undefined ? undefined : deEntidades(crudo);
};
/** Lo que la Tarjeta Social de una Cita lleva escrito (la sonda de `getStaticPaths`). */
const tarjetaSocial = (slug: string) => {
  const crudo = /<pre id="tarjetas">([\s\S]*?)<\/pre>/u.exec(html('/sonda-tarjetas/'))?.[1] ?? '[]';
  const todas = JSON.parse(deEntidades(crudo)) as { slug: string; autor: string; procedencia: string }[];
  return todas.find((t) => t.slug === slug);
};
const fragmento = (pagina: string) =>
  deEntidades(/<textarea id="fragmento-para-insertar"[^>]*>([\s\S]*?)<\/textarea>/u.exec(pagina)?.[1] ?? '');

describe('Historia 35.4 — construye con el Personaje donde va el Autor', () => {
  it('construye: sin guardas «hasta la 35.4», con NFR-5 en verde', () => {
    expect(codigo, salida).toBe(0);
    for (const slug of [B1, B2, B3, B4, V1, S1]) expect(existsSync(paginaConstruida(proyecto, `/cita/${slug}/`)), slug).toBe(true);
    expect(existsSync(paginaConstruida(proyecto, '/obra/batman/el-caballero/'))).toBe(true);
  });
});

describe('Historia 35.4 — la Página de Cita, fila a fila de la matriz', () => {
  it('Personaje solo, con Obra de Personaje (B1)', () => {
    const pagina = cita(B1);
    const a = atribucion(B1);
    expect(a).toMatch(/<p class="autor"[^>]*data-zona="atribucion"[^>]*><a href="\/personaje\/batman\/" class="enlace-en-tinta"[^>]*>Batman<\/a>/u);
    expect(a).toMatch(/<p class="procedencia"[^>]*data-zona="atribucion"[^>]*><a href="\/obra\/batman\/el-caballero\/" class="enlace-en-tinta"[^>]*>El caballero<\/a>, 2000\.<\/p>/u);
    expect(a).not.toContain('/autor/');
    expect(pagina).toMatch(/<blockquote class="cita"[^>]*cite="\/personaje\/batman\/"/u);
    // Tarjeta de Obra: el Personaje dueño de la Obra.
    expect(hechos(B1)).toBe('Batman · 2000 · 2 citas');
    // «Más de Batman»: B3 y B4 (de otra Obra o sin ella), con su cierre a la Página de Personaje.
    expect(pagina).toMatch(/<h2[^>]*id="mas-del-autor"[^>]*>Más de Batman<\/h2>/u);
    const masDe = /<section class="mas-del-autor"[\s\S]*?<\/section>/u.exec(pagina)?.[0] ?? '';
    expect(masDe).toContain(`/cita/${B3}/`);
    expect(masDe).toContain(`/cita/${B4}/`);
    expect(masDe).not.toContain(`/cita/${B2}/`);
    expect(masDe).toMatch(/href="\/personaje\/batman\/"[^>]*>[\s\S]*?Las 4 citas de Batman/u);
    // Desplegables: solo «Inserta esta cita», con «su personaje».
    expect(desplegables(pagina)).toEqual(['Inserta esta cita']);
    expect(pagina).toContain('lleva la cita, su personaje y el enlace a esta página.');
    // Lo copiado, la Imagen y el Fragmento.
    expect(copiado(pagina)).toBe(`«${TEXTOS[B1]}» — Batman, El caballero, 2000.`);
    expect(pagina).toContain('data-autor="Batman"');
    expect(pagina).toContain('data-procedencia="El caballero, 2000"');
    expect(fragmento(pagina)).toContain('<p>— Batman, <cite>El caballero</cite>. <a href=');
    // Lo compartido es lo copiado, y la Tarjeta Social firma con el Personaje.
    expect(compartido(pagina)).toBe(copiado(pagina) === undefined ? undefined : deEntidades(copiado(pagina)!));
    expect(tarjetaSocial(B1)).toMatchObject({ autor: 'Batman', procedencia: 'El caballero, 2000' });
    // Nada entre la Atribución —sin Fuente: la atribuida no la lleva— y Copiar (UX-DR113).
    expect(pagina).not.toContain('class="fuente"');
    expect(pagina).toMatch(/<\/figure>\s*<div class="fila-de-acciones"/u);
    // JSON-LD: sin `creator`, con `spokenByCharacter`; la Obra de un Personaje es una CreativeWork.
    const datos = jsonLd(pagina);
    expect(datos.creator).toBeUndefined();
    const habla = datos.spokenByCharacter as Record<string, unknown>;
    expect(Object.keys(habla)).toEqual(['@type', 'name', 'url']);
    expect(habla['@type']).toBe('Person');
    expect(habla.name).toBe('Batman');
    expect(String(habla.url)).toMatch(/^https?:\/\/[^/]+\/personaje\/batman\/$/u);
    expect((datos.isPartOf as Record<string, unknown>)['@type']).toBe('CreativeWork');
    // Título y meta: sin Autor, el Personaje.
    expect(titulo(pagina)).toContain(`— Batman`);
    expect(meta(pagina)).toBe(`${TEXTOS[B1]} — Batman.`);
    // Sin Autor, ni filtro ni metadato `autor`.
    expect(pagina).not.toContain('data-pagefind-filter="autor:');
    expect(pagina).not.toContain('data-pagefind-meta="autor"');
  });

  it('Personaje y Autor con Obra (B3)', () => {
    const pagina = cita(B3);
    const a = atribucion(B3);
    expect(a).toMatch(/<p class="autor"[^>]*><a href="\/personaje\/batman\/" class="enlace-en-tinta"[^>]*>Batman<\/a>/u);
    expect(a).toMatch(
      /<p class="procedencia" data-zona="atribucion"[^>]*><a href="\/obra\/seneca\/obras-de-seneca\/" class="enlace-en-tinta"[^>]*>Obras de Séneca<\/a>, de <a href="\/autor\/seneca\/" class="enlace-en-tinta"[^>]*>Séneca<\/a>, 2000\.<\/p>/u,
    );
    expect(copiado(pagina)).toBe(`«${TEXTOS[B3]}» — Batman, Obras de Séneca, de Séneca, 2000.`);
    expect(pagina).toContain('data-procedencia="Obras de Séneca, de Séneca, 2000"');
    // La Imagen firma y el `cite` apunta al nombre de la primera línea: el Personaje, no el Autor.
    expect(pagina).toContain('data-autor="Batman"');
    expect(pagina).not.toContain('data-autor="Séneca"');
    expect(pagina).toMatch(/<blockquote class="cita"[^>]*cite="\/personaje\/batman\/"/u);
    expect(fragmento(pagina)).toContain('<p>— Batman, <cite>Obras de Séneca</cite>, de Séneca. <a href=');
    expect(compartido(pagina)).toBe(`«${TEXTOS[B3]}» — Batman, Obras de Séneca, de Séneca, 2000.`);
    expect(tarjetaSocial(B3)).toMatchObject({ autor: 'Batman', procedencia: 'Obras de Séneca, de Séneca, 2000' });
    // Tarjeta de Obra: la Obra es de Séneca.
    expect(hechos(B3)).toBe('Séneca · 2000 · 1 cita');
    const datos = jsonLd(pagina);
    expect((datos.creator as Record<string, unknown>).name).toBe('Séneca');
    expect((datos.spokenByCharacter as Record<string, unknown>).name).toBe('Batman');
    expect((datos.isPartOf as Record<string, unknown>)['@type']).toBe('Book');
    // Título y meta: con Autor, el Autor.
    expect(meta(pagina)).toBe(`${TEXTOS[B3]} — Séneca.`);
    expect(pagina).toContain('data-pagefind-filter="autor:seneca"');
    expect(desplegables(pagina)).toEqual(['Inserta esta cita']);
  });

  it('«Siguiente por Tema» de una de Batman con Séneca salta las de su dueño, Batman', () => {
    // B4 no tiene Obra y no tiene Tarjeta de Obra; B3 es la única de su Obra y sigue por el Tema:
    // tras ella viene S1, de Séneca, otro dueño que Batman aunque B3 también sea de Séneca.
    const slug = /<li[^>]*data-zona="siguiente"[^>]*>\s*<a href="\/cita\/([^/]+)\//u.exec(tarjetaDeObra(B3))?.[1];
    expect(slug).toBe(S1);
  });

  it('Personaje y Autor sin Obra (B4)', () => {
    const pagina = cita(B4);
    const a = atribucion(B4);
    expect(a).toMatch(/<p class="procedencia" data-zona="atribucion"[^>]*>de <a href="\/autor\/seneca\/" class="enlace-en-tinta"[^>]*>Séneca<\/a>, 2000\.<\/p>/u);
    expect(a).not.toContain('Sin obra documentada');
    expect(copiado(pagina)).toBe(`«${TEXTOS[B4]}» — Batman, de Séneca, 2000.`);
    expect(fragmento(pagina)).toContain('<p>— Batman, de Séneca. <a href=');
    expect(compartido(pagina)).toBe(`«${TEXTOS[B4]}» — Batman, de Séneca, 2000.`);
    expect(tarjetaSocial(B4)).toMatchObject({ autor: 'Batman', procedencia: 'de Séneca, 2000' });
    expect(tarjetaDeObra(B4)).toBe('');
    expect(jsonLd(pagina).isPartOf).toBeUndefined();
  });

  it('Autor vivo solo, atribuida (V1)', () => {
    const pagina = cita(V1);
    const a = atribucion(V1);
    expect(a).toMatch(/<p class="autor"[^>]*><a href="\/autor\/vivo\/" class="enlace-en-tinta"[^>]*>Autora Viva<\/a>/u);
    expect(a).not.toContain(', de ');
    expect(copiado(pagina)).toBe(`«${TEXTOS[V1]}» — Autora Viva, Obras de la autora, 2010.`);
    expect(hechos(V1)).toBe('Autora Viva · 2010 · 1 cita');
    const creador = jsonLd(pagina).creator as Record<string, unknown>;
    expect(creador.name).toBe('Autora Viva');
    expect(creador.deathDate).toBeUndefined();
    expect(jsonLd(pagina).spokenByCharacter).toBeUndefined();
    expect(desplegables(pagina)).toEqual(['Inserta esta cita']);
    expect(pagina).toContain('lleva la cita, su autor y el enlace a esta página.');
  });

  it('la Cita de siempre, en la misma construcción, como siempre (S1)', () => {
    const pagina = cita(S1);
    expect(atribucion(S1)).toMatch(
      /^<p class="autor" data-zona="atribucion"[^>]*><a href="\/autor\/seneca\/" class="enlace-en-tinta"[^>]*>Séneca<\/a><\/p><p class="procedencia" data-zona="atribucion"[^>]*><a href="\/obra\/seneca\/sobre-la-brevedad-de-la-vida\/" class="enlace-en-tinta"[^>]*>Sobre la brevedad de la vida<\/a>, 49\.<\/p>$/u,
    );
    expect(pagina).toMatch(/<blockquote class="cita"[^>]*cite="\/autor\/seneca\/"/u);
    expect(copiado(pagina)).toBe('«No es que tengamos poco tiempo, es que perdemos mucho.» — Séneca, Sobre la brevedad de la vida, 49.');
    expect(pagina).toContain('data-autor="Séneca"');
    expect(pagina).toContain('data-procedencia="Sobre la brevedad de la vida, 49"');
    expect(compartido(pagina)).toBe('«No es que tengamos poco tiempo, es que perdemos mucho.» — Séneca, Sobre la brevedad de la vida, 49.');
    expect(tarjetaSocial(S1)).toMatchObject({ autor: 'Séneca', procedencia: 'Sobre la brevedad de la vida, 49' });
    expect(fragmento(pagina)).toContain('<p>— Séneca, <cite>Sobre la brevedad de la vida</cite>. <a href=');
    expect(desplegables(pagina)).toContain('Cómo citar');
    expect(desplegables(pagina).at(-1)).toBe('Inserta esta cita');
    expect(hechos(S1)).toBe('Séneca · 49 · 1 cita');
    // «Más de Séneca» lleva las de Séneca con Personaje, con el cierre a su Página de Autor.
    const masDe = /<section class="mas-del-autor"[\s\S]*?<\/section>/u.exec(pagina)?.[0] ?? '';
    expect(masDe).toContain('>Más de Séneca<');
    expect(masDe).toContain(`/cita/${B3}/`);
    expect(masDe).toContain(`/cita/${B4}/`);
    expect(masDe).toMatch(/href="\/autor\/seneca\/"[^>]*>[\s\S]*?Las 3 citas de Séneca/u);
    const datos = jsonLd(pagina);
    expect(Object.keys(datos)).toEqual(['@context', '@type', '@id', 'url', 'text', 'inLanguage', 'creator', 'isBasedOn', 'isPartOf']);
    expect(datos.spokenByCharacter).toBeUndefined();
    expect(meta(pagina)).toBe('No es que tengamos poco tiempo, es que perdemos mucho. — Séneca.');
    expect(pagina).toContain('data-pagefind-meta="autor">Séneca</span>');
  });

  it('«Siguiente por Tema» de la de siempre lleva a la siguiente de otro dueño', () => {
    // S1 es la única de su Obra: sigue por el Tema, a la primera de otro dueño que le sigue.
    const tarjeta = tarjetaDeObra(S1);
    expect(tarjeta).toContain('Siguiente cita sobre el tiempo');
    const slug = /<li[^>]*data-zona="siguiente"[^>]*>\s*<a href="\/cita\/([^/]+)\//u.exec(tarjeta)?.[1];
    // La que le sigue en el listado del Tema, por slug, es de la Autora Viva: otro dueño.
    expect(slug).toBe(V1);
  });
});

describe('Historia 35.4 — la Página de Obra de un Personaje', () => {
  it('Cabecera «de {Personaje}» enlazada, con zona `atribucion` y el metadato `autor`', () => {
    const pagina = html('/obra/batman/el-caballero/');
    expect(pagina).toMatch(
      /<p class="de" data-zona="atribucion"[^>]*>\s*de <a href="\/personaje\/batman\/" class="enlace-en-tinta" data-pagefind-meta="autor"[^>]*>Batman<\/a>/u,
    );
    expect(titulo(pagina)).toContain('Frases de Batman en El caballero');
    expect(meta(pagina)).toContain('2 frases de Batman en El caballero (2000)');
    // Sin «Buscar en esta obra» hasta la 35.5.
    expect(pagina).not.toContain('buscar-en-esta-obra');
  });

  it('JSON-LD: una CreativeWork con su `character`, sin `author`', () => {
    const about = jsonLd(html('/obra/batman/el-caballero/')).about as Record<string, unknown>;
    expect(about['@type']).toBe('CreativeWork');
    expect(about.author).toBeUndefined();
    expect((about.character as Record<string, unknown>)['@type']).toBe('Person');
    expect((about.character as Record<string, unknown>).name).toBe('Batman');
    expect(String((about.character as Record<string, unknown>).url)).toMatch(/\/personaje\/batman\/$/u);
  });

  it('su Tarjeta Social firma con el Personaje: «2 citas de Batman, 2000»', () => {
    const crudo = /<pre id="tarjetas">([\s\S]*?)<\/pre>/u.exec(html('/sonda-tarjetas-de-obra/'))?.[1] ?? '[]';
    const todas = JSON.parse(deEntidades(crudo)) as { autor: string; slug: string; hechos: string[] }[];
    const deBatman = todas.find((t) => t.autor === 'batman' && t.slug === 'el-caballero');
    expect(deBatman?.hechos).toEqual(['2 citas de Batman, 2000']);
  });

  it('su Tarjeta Social existe', () => {
    expect(existsSync(join(proyecto, 'dist', 'tarjeta', 'obra', 'batman', 'el-caballero.png'))).toBe(true);
    expect(html('/obra/batman/el-caballero/')).toContain('/tarjeta/obra/batman/el-caballero.png');
  });

  it('la Obra de un Autor, como siempre: «de {Autor}» y «Buscar en esta obra»', () => {
    const pagina = html('/obra/seneca/obras-de-seneca/');
    expect(pagina).toMatch(/de <a href="\/autor\/seneca\/" class="enlace-en-tinta" data-pagefind-meta="autor"[^>]*>Séneca<\/a>/u);
    expect(pagina).toContain('buscar-en-esta-obra');
    expect((jsonLd(pagina).about as Record<string, unknown>)['@type']).toBe('Book');
  });
});

describe('Historia 35.4 — una Cita con Personaje y Autor está en los dos', () => {
  it('en el listado del Autor y en el del Personaje, y su Obra en la Lista de Obras del Autor', () => {
    const delAutor = html('/autor/seneca/');
    const delPersonaje = html('/personaje/batman/');
    for (const slug of [B3, B4]) {
      expect(delAutor).toContain(`/cita/${slug}/`);
      expect(delPersonaje).toContain(`/cita/${slug}/`);
    }
    expect(delAutor).toContain('/obra/seneca/obras-de-seneca/');
  });

  it('en el Tema, la Tarjeta de Cita nombra al Personaje en el sitio del Autor', () => {
    const tema = html('/tema/el-tiempo/');
    const tarjeta = (slug: string) => new RegExp(`<a[^>]*href="/cita/${slug}/"[\\s\\S]*?</a>`, 'u').exec(tema)?.[0] ?? '';
    expect(tarjeta(B1)).toMatch(/class="autor"[^>]*>Batman</u);
    expect(tarjeta(B3)).toMatch(/class="autor"[^>]*>Batman</u);
    expect(tarjeta(B3)).not.toMatch(/class="autor"[^>]*>Séneca</u);
    expect(tarjeta(S1)).toMatch(/class="autor"[^>]*>Séneca</u);
  });

  it('en la Colección, la Tarjeta de Cita nombra al Personaje en el sitio del Autor', () => {
    const coleccion = html('/coleccion/con-batman/');
    const tarjeta = (slug: string) => new RegExp(`<a[^>]*href="/cita/${slug}/"[\\s\\S]*?</a>`, 'u').exec(coleccion)?.[0] ?? '';
    expect(tarjeta(B1)).toMatch(/class="autor"[^>]*>Batman</u);
    expect(tarjeta(B3)).toMatch(/class="autor"[^>]*>Batman</u);
    expect(tarjeta(B3)).not.toMatch(/class="autor"[^>]*>Séneca</u);
    expect(tarjeta(S1)).toMatch(/class="autor"[^>]*>Séneca</u);
  });
});

describe('Historia 35.4 — una Obra cuyo dueño no tiene página', () => {
  it('lo dice con su tipo y, si es un Personaje, por qué y qué hace falta', () => {
    const dePersonaje = mensajeDeDueñoSinPagina({ nombre: 'batman--el-alba', dueño: { tipo: 'personaje', slug: 'batman' } });
    expect(dePersonaje).toMatch(/«batman--el-alba» es del Personaje «batman», y ninguna Cita publicada lo declara/u);
    expect(dePersonaje).toContain('«personajes»');
    expect(mensajeDeDueñoSinPagina({ nombre: 'seneca--x', dueño: { tipo: 'autor', slug: 'seneca' } })).toMatch(
      /del Autor «seneca», que no tiene página publicada/u,
    );
  });
});
