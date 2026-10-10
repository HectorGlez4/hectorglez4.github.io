import { afterAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { citaValida, construirConCorpus, limpiar, paginaConstruida } from './ayuda/construir.js';

/**
 * Historia 19.1 — una Cita con traducción, construida.
 *
 * La Atribución y lo copiado nombran la traducción (UX-DR51); la Imagen, la Tarjeta, la
 * Pieza y el JSON-LD no, y tampoco ponen el año de la traducción como año de la Obra.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const FICHA_DE_HORACIO = [
  'nombre: Horacio',
  'añoNacimiento: -65',
  'añoFallecimiento: -8',
  'semblanza: Poeta lírico latino del siglo de Augusto.',
  'tradicion: otra',
  '',
].join('\n');

const TEXTO = 'Feliz quien lejos de negocios vive.';
const SLUG = 'horacio-feliz-quien-lejos-de-negocios-vive';

/** Sonda: lo que la Tarjeta Social de cada Cita lleva escrito, antes de rasterizarlo. */
const SONDA = `---
import { getStaticPaths } from './tarjeta/[slug].png.ts';
const rutas = await getStaticPaths();
---
<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><title>Sonda</title></head>
<body><pre id="tarjetas">{JSON.stringify(rutas.map((r) => r.props))}</pre></body></html>
`;

describe('Historia 19.1 — la traducción en el sitio construido', () => {
  let proyecto = '';

  it('construye con una Cita con traducción', async () => {
    const resultado = await construirConCorpus(
      {
        'autores/horacio.yml': FICHA_DE_HORACIO,
        'citas/horacio--feliz-quien-lejos-de-negocios-vive.md': citaValida({
          autor: 'horacio',
          temas: [],
          slug: SLUG,
          texto: TEXTO,
          procedencia: {
            obra: 'Odas',
            traduccion: { traductor: 'Germán Salinas', año: 1909 },
          },
          fuente: {
            id: 'wikisource-es',
            url: 'https://es.wikisource.org/wiki/Odas_%28Horacio%2C_Salinas_tr.%29/I',
          },
        }),
      },
      { paginas: { 'sonda.astro': SONDA } },
    );
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  });

  it('la Atribución dice «Odas. Traducción de Germán Salinas, 1909.»', async () => {
    const html = await readFile(paginaConstruida(proyecto, `/cita/${SLUG}/`), 'utf8');
    // Historia 22.4 — el título enlaza a su Página de Obra: se lee el texto de la línea.
    const linea = /<p class="procedencia"[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? '';
    expect(linea.replace(/<[^>]+>/g, '')).toBe('Odas. Traducción de Germán Salinas, 1909.');
    // Y la traducción queda fuera del enlace: solo el título lo es.
    expect(linea).toMatch(/>Odas<\/a>\. Traducción de Germán Salinas, 1909\.$/);
    expect(html).not.toContain('Sin año documentado');
    expect(html).not.toContain('Odas, 1909');
  });

  it('lo copiado nombra la traducción', async () => {
    const html = await readFile(paginaConstruida(proyecto, `/cita/${SLUG}/`), 'utf8');
    expect(html).toContain('Horacio, Odas, trad. de Germán Salinas, 1909.');
  });

  it('la Imagen de Cita solo lleva la obra', async () => {
    const html = await readFile(paginaConstruida(proyecto, `/cita/${SLUG}/`), 'utf8');
    expect(html).toMatch(/data-procedencia="Odas"/);
  });

  it('el JSON-LD no nombra al traductor ni pone 1909 como año de la Obra', async () => {
    const html = await readFile(paginaConstruida(proyecto, `/cita/${SLUG}/`), 'utf8');
    const bloques = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    expect(bloques.length).toBeGreaterThan(0);
    // La dirección de la Fuente lleva «Salinas tr.» en su ruta, y es la de la Fuente: no
    // cuenta. Lo que se mira es lo que el marcado afirma de la Obra.
    const datos = bloques
      .map((m) => {
        const { isBasedOn: _fuente, ...resto } = JSON.parse(m[1]) as Record<string, unknown>;
        return JSON.stringify(resto);
      })
      .join('\n');
    expect(datos).not.toContain('Salinas');
    expect(datos).not.toContain('1909');
  });

  it('la Tarjeta Social no nombra a Salinas', async () => {
    const html = await readFile(paginaConstruida(proyecto, '/sonda/'), 'utf8');
    const tarjetas = JSON.parse(
      (/<pre id="tarjetas">([\s\S]*?)<\/pre>/.exec(html)?.[1] ?? '[]').replace(/&quot;/g, '"'),
    ) as { procedencia?: string }[];
    expect(tarjetas).toHaveLength(1);
    expect(tarjetas[0].procedencia).toBe('Odas');
  });
});
