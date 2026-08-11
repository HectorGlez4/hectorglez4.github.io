import { afterAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
} from './ayuda/construir.js';

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

/** Sonda: enumera las tres colecciones en el HTML para poder leer qué cargó el build. */
const SONDA = `---
import { getCollection } from 'astro:content';
const citas = await getCollection('citas');
---
<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><title>Sonda</title></head>
<body><ul>{citas.map((c) => <li data-cita={c.id}>{c.data.slug}</li>)}</ul></body></html>
`;

const CORPUS_BASE = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
};

const CITA_PUBLICADA = citaValida({
  slug: 'seneca-no-es-que-tengamos-poco-tiempo',
  texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
});

const CITA_EN_REVISION = citaValida({
  slug: 'seneca-la-vida-si-sabes-usarla-es-larga',
  texto: 'La vida, si sabes usarla, es larga.',
});

async function construir(corpus: Record<string, string>) {
  const resultado = await construirConCorpus(corpus, { paginas: { 'sonda.astro': SONDA } });
  aLimpiar.push(resultado.proyecto);
  return resultado;
}

describe('Historia 1.3 — lo no publicado no existe para el build', () => {
  it('ninguna colección carga una Cita de corpus/_revision/', async () => {
    const { codigo, proyecto } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--poco-tiempo.md': CITA_PUBLICADA,
      '_revision/seneca--la-vida.md': CITA_EN_REVISION,
    });
    expect(codigo).toBe(0);

    const sonda = await readFile(join(proyecto, 'dist', 'sonda.html'), 'utf8');
    expect(sonda).toContain('seneca-no-es-que-tengamos-poco-tiempo');
    expect(sonda).not.toContain('seneca-la-vida-si-sabes-usarla-es-larga');
  });

  it('una Cita inválida en _revision/ no rompe el build', async () => {
    // La prueba más fuerte del aislamiento: por la Historia 1.2 una Cita sin
    // procedencia rompe el build. Si el esquema no se aplica a este fichero es
    // porque ninguna colección lo carga — no porque haya un filtro que lo salte.
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--poco-tiempo.md': CITA_PUBLICADA,
      '_revision/incompleta.md': citaValida({ procedencia: undefined, slug: 'incompleta' }),
    });
    expect(codigo).toBe(0);
    expect(salida).not.toMatch(/does not match collection schema/);
  });

  it('la Cita en revisión no aparece en el sitemap', async () => {
    const { proyecto } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--poco-tiempo.md': CITA_PUBLICADA,
      '_revision/seneca--la-vida.md': CITA_EN_REVISION,
    });
    const sitemap = await readFile(join(proyecto, 'dist', 'sitemap-0.xml'), 'utf8');
    expect(sitemap).not.toContain('la-vida-si-sabes-usarla-es-larga');
  });

  it('mover el fichero a corpus/citas/ la publica sin ningún otro cambio', async () => {
    // Mismo contenido byte a byte; lo único que cambia es el directorio.
    const enRevision = await construir({
      ...CORPUS_BASE,
      '_revision/seneca--la-vida.md': CITA_EN_REVISION,
    });
    const publicada = await construir({
      ...CORPUS_BASE,
      'citas/seneca--la-vida.md': CITA_EN_REVISION,
    });

    const antes = await readFile(join(enRevision.proyecto, 'dist', 'sonda.html'), 'utf8');
    const despues = await readFile(join(publicada.proyecto, 'dist', 'sonda.html'), 'utf8');

    expect(antes).not.toContain('seneca-la-vida-si-sabes-usarla-es-larga');
    expect(despues).toContain('seneca-la-vida-si-sabes-usarla-es-larga');
  });
});

describe('Historia 1.3 — la ausencia es estructural, no condicional', () => {
  it('no existe ningún campo booleano de publicación que haya que filtrar', () => {
    const esquema = readFileSync(resolve(RAIZ, 'src/content.config.ts'), 'utf8');
    // Si existiera `publicada`, `borrador`, `publicado` o `visible`, cada superficie
    // nueva que enumerase contenido tendría que acordarse de filtrarlo. Ese olvido es
    // exactamente lo que AD-2 elimina moviendo la decisión al sistema de ficheros.
    expect(esquema).not.toMatch(/\b(publicada|publicado|borrador|visible|draft)\b\s*:/);
  });

  it('ninguna colección tiene por base corpus/_revision/', () => {
    const esquema = readFileSync(resolve(RAIZ, 'src/content.config.ts'), 'utf8');
    expect(esquema).not.toMatch(/base:\s*['"]\.\/corpus\/_revision/);
    // Y las tres bases declaradas son las tres carpetas publicables.
    const bases = [...esquema.matchAll(/base:\s*'\.\/corpus\/([a-z]+)'/g)].map((m) => m[1]);
    expect(bases.sort()).toEqual(['autores', 'citas', 'temas']);
  });
});
