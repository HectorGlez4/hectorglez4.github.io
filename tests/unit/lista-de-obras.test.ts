import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { componerDocumento } from '../../tools/lib/documento.ts';
import { obrasDelAutor } from '../../src/lib/publicado.ts';
import type { ObraResuelta } from '../../src/lib/obras.ts';

/**
 * Historia 17.3 — la Página de Autor enumera su obra (UX-DR46).
 *
 * La regla pura —qué Obras, en qué orden, cuántas Citas sin obra— sobre `obrasDelAutor`, y lo
 * construido en `dist/`: la sección, sus entradas, el año, el pie, la página 2 y lo que no debe
 * aparecer (Citas dentro de la lista, `data-ingreso`, literales de color o tipografía).
 */

function obra(nombre: string, titulo: string, recuento: number, año?: number): ObraResuelta {
  return {
    nombre,
    autor: nombre.split('--')[0],
    titulo,
    ...(año === undefined ? {} : { año }),
    fuentes: [],
    edicionCotejada: false,
    temas: [],
    recuento,
  };
}

describe('Historia 17.3 — obrasDelAutor', () => {
  const BREVEDAD = obra('seneca--sobre-la-brevedad-de-la-vida', 'Sobre la brevedad de la vida', 5, 49);
  const IRA = obra('seneca--de-la-ira', 'De la ira', 3);
  const CARTAS = obra('seneca--cartas-a-lucilio', 'Cartas a Lucilio', 3, 64);
  const ENQUIRIDION = obra('epicteto--enquiridion', 'Enquiridión', 2);

  const citas = [
    ...Array.from({ length: 3 }, () => ({ autor: 'seneca', obra: IRA })),
    ...Array.from({ length: 5 }, () => ({ autor: 'seneca', obra: BREVEDAD })),
    ...Array.from({ length: 3 }, () => ({ autor: 'seneca', obra: CARTAS })),
    { autor: 'seneca' },
    { autor: 'seneca' },
    { autor: 'epicteto', obra: ENQUIRIDION },
    { autor: 'epicteto', obra: ENQUIRIDION },
    { autor: 'antonio-machado' },
  ];

  it('de más a menos Citas y, a igualdad, por título', () => {
    expect(obrasDelAutor(citas, 'seneca').obras.map((o) => o.titulo)).toEqual([
      'Sobre la brevedad de la vida',
      'Cartas a Lucilio',
      'De la ira',
    ]);
  });

  it('a igualdad de recuento y título, por nombre de ficha, sea cual sea el orden de entrada', () => {
    const a = obra('seneca--dialogos', 'Diálogos', 2);
    const b = obra('seneca--dialogos-2', 'Diálogos', 2);
    const de = (orden: ObraResuelta[]) =>
      obrasDelAutor(
        orden.flatMap((o) => [{ autor: 'seneca', obra: o }]),
        'seneca',
      ).obras.map((o) => o.nombre);
    expect(de([b, a])).toEqual(['seneca--dialogos', 'seneca--dialogos-2']);
    expect(de([a, b])).toEqual(['seneca--dialogos', 'seneca--dialogos-2']);
  });

  it('una entrada por Obra, solo del Autor pedido', () => {
    expect(obrasDelAutor(citas, 'epicteto').obras).toEqual([ENQUIRIDION]);
  });

  it('cuenta las Citas sin Obra resuelta', () => {
    expect(obrasDelAutor(citas, 'seneca').sinObra).toBe(2);
    expect(obrasDelAutor(citas, 'epicteto').sinObra).toBe(0);
    expect(obrasDelAutor(citas, 'antonio-machado')).toEqual({ obras: [], sinObra: 1 });
  });

  it('un Autor sin Citas: nada', () => {
    expect(obrasDelAutor(citas, 'nadie')).toEqual({ obras: [], sinObra: 0 });
  });
});

describe('Historia 17.3 — el componente no lleva literales', () => {
  it('ni color ni tipografía escritos a mano', async () => {
    const fuente = await readFile(join(RAIZ, 'src/components/ListaDeObras.astro'), 'utf8');
    const estilo = fuente.slice(fuente.indexOf('<style>'));
    expect(estilo).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(estilo).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/i);
    for (const m of estilo.matchAll(/(color|font-family|font-size)\s*:\s*([^;]+);/g)) {
      expect(m[2].trim(), m[0]).toMatch(/^var\(--[\w-]+\)$/);
    }
  });
});

describe('Historia 17.3 — la regla del enlace de bloque (el CI no corre e2e)', () => {
  it('`.lista-de-obras a`: fila flexible, zona de toque y sin subrayado', async () => {
    const fuente = await readFile(join(RAIZ, 'src/components/ListaDeObras.astro'), 'utf8');
    const cuerpo = /\.lista-de-obras a\s*\{([^}]*)\}/.exec(fuente)?.[1] ?? '';
    const declaraciones = new Map(
      cuerpo
        .split(';')
        .map((d) => d.replace(/\/\*[\s\S]*?\*\//g, '').trim())
        .filter((d) => d.includes(':'))
        .map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()] as const),
    );
    expect(declaraciones.get('display')).toBe('flex');
    expect(declaraciones.get('min-height')).toBe('var(--zona-de-toque)');
    expect(declaraciones.get('text-decoration')).toBe('none');
  });
});

describe('Historia 17.3 — la Lista de Obras, construida', () => {
  const WS = 'https://es.wikisource.org/wiki/';
  const documento = (titulo: string, textos: string[]) =>
    componerDocumento(
      { fuente: 'wikisource-es', obra: titulo, url: `${WS}${titulo.replaceAll(' ', '_')}`, recuperado: '2026-10-10' },
      titulo,
      textos.join('\n\n'),
    );

  const EPICTETO = 'nombre: Epicteto\nañoNacimiento: 50\nañoFallecimiento: 135\nsemblanza: Filósofo estoico griego.\n';
  const MACHADO =
    'nombre: Antonio Machado\nañoNacimiento: 1875\nañoFallecimiento: 1939\nsemblanza: Poeta sevillano de la generación del 98.\n';

  // El censo es cerrado (11.2): las Citas sin obra —sin Fuente— tienen que ser slugs suyos.
  const SIN_OBRA_SENECA = ['seneca-mientras-esperamos-vivir-la-vida-pasa', 'seneca-ninguna-cosa-se-parece-tanto-a-la'];
  const SIN_OBRA_MACHADO = 'antonio-machado-caminante-no-hay-camino-se-hace-camino';

  const corpus: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'autores/epicteto.yml': EPICTETO,
    'autores/antonio-machado.yml': MACHADO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'pendientes-de-cotejo.yml': `citas:\n${[...SIN_OBRA_SENECA, SIN_OBRA_MACHADO].map((s) => `  - ${s}\n`).join('')}`,
  };

  /** Siembra `n` Citas cotejadas de una Obra, con su documento. */
  function sembrar(autor: string, clave: string, titulo: string, n: number, año?: (i: number) => number) {
    const textos: string[] = [];
    for (let i = 0; i < n; i += 1) {
      const texto = `${titulo} ${i}: una sentencia distinta para cada número, la ${i}.`;
      textos.push(texto);
      const a = año?.(i);
      corpus[`citas/${autor}--${clave}-${i}.md`] = citaValida({
        autor,
        slug: `${autor}-${clave}-${i}`,
        texto,
        procedencia: a === undefined ? { obra: titulo } : { obra: titulo, año: a },
        fuente: { id: 'wikisource-es', url: `${WS}${titulo.replaceAll(' ', '_')}` },
      });
    }
    corpus[`fuentes/wikisource-es--${clave}.txt`] = documento(titulo, textos);
  }

  // Séneca, 55 Citas: Brevedad 45 (el 82 %), Cartas 3 (año 64), De la ira 3 (sin año), De la
  // providencia 2 (años 62 y 63: discrepan, va sin año) y 2 sin obra.
  sembrar('seneca', 'sobre-la-brevedad-de-la-vida', 'Sobre la brevedad de la vida', 45, () => 49);
  sembrar('seneca', 'cartas-a-lucilio', 'Cartas a Lucilio', 3, () => 64);
  sembrar('seneca', 'de-la-ira', 'De la ira', 3);
  sembrar('seneca', 'de-la-providencia', 'De la providencia', 2, (i) => 62 + i);
  // Sin obra no es sin Procedencia: declaran solo la referencia. El texto es el del censo.
  const TEXTOS_SIN_OBRA = [
    'Mientras esperamos vivir, la vida pasa.',
    'Ninguna cosa se parece tanto a la injusticia como la justicia tardía.',
  ];
  SIN_OBRA_SENECA.forEach((slug, i) => {
    corpus[`citas/seneca--sin-obra-${i}.md`] = citaValida({
      slug,
      texto: TEXTOS_SIN_OBRA[i],
      procedencia: { referencia: `Carta ${i + 1}` },
      fuente: undefined,
    });
  });
  // Epicteto: una sola Obra con una sola Cita (no se indexa), ninguna sin obra. El año es
  // ficticio y antes de Cristo, para el «a. C.» de `añoLegible`.
  sembrar('epicteto', 'enquiridion', 'Enquiridión', 1, () => -50);
  // Machado: ninguna Obra, una Cita sin obra.
  corpus['citas/antonio-machado--sin-obra.md'] = citaValida({
    autor: 'antonio-machado',
    slug: SIN_OBRA_MACHADO,
    texto: 'Caminante, no hay camino, se hace camino al andar.',
    procedencia: { año: 1912 },
    fuente: undefined,
  });

  let proyecto = '';
  const html = (ruta: string) => readFile(paginaConstruida(proyecto, ruta), 'utf8');
  const seccion = (pagina: string) => {
    const inicio = pagina.indexOf('<section class="obras-del-autor');
    return inicio === -1 ? '' : pagina.slice(inicio, pagina.indexOf('</section>', inicio) + '</section>'.length);
  };
  const entradas = (s: string) =>
    [...s.matchAll(/<li[^>]*>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({
      href: m[1],
      // Lo que se ve: título (y año) y recuento, separados aquí por un espacio que en la página
      // pone la fila flexible.
      texto: m[2]
        .replace(/<span class="recuento/, ' $&')
        .replace(/<span class="oculto"[^>]*>[\s\S]*?<\/span>/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
      lector: m[2].replace(/<span aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    }));

  beforeAll(async () => {
    const resultado = await construirConCorpus(corpus);
    proyecto = resultado.proyecto;
    expect(resultado.codigo, resultado.salida).toBe(0);
  }, 300_000);

  afterAll(async () => {
    if (proyecto !== '') await limpiar(proyecto);
  });

  it('Séneca: el rótulo, sus cuatro Obras en orden y enlazadas a su página', async () => {
    const s = seccion(await html('/autor/seneca/'));
    expect(s).toContain('Su obra en este Corpus');
    expect(s).toContain('data-pagefind-ignore');
    expect(entradas(s)).toEqual([
      {
        href: '/obra/seneca/sobre-la-brevedad-de-la-vida/',
        texto: 'Sobre la brevedad de la vida · 49 45',
        lector: 'Sobre la brevedad de la vida, 49, 45 citas',
      },
      { href: '/obra/seneca/cartas-a-lucilio/', texto: 'Cartas a Lucilio · 64 3', lector: 'Cartas a Lucilio, 64, 3 citas' },
      { href: '/obra/seneca/de-la-ira/', texto: 'De la ira 3', lector: 'De la ira, 3 citas' },
      // Años discrepantes: sin año, nunca uno elegido.
      { href: '/obra/seneca/de-la-providencia/', texto: 'De la providencia 2', lector: 'De la providencia, 2 citas' },
    ]);
  });

  it('un año antes de Cristo se escribe «50 a. C.», también para el lector', async () => {
    expect(entradas(seccion(await html('/autor/epicteto/')))).toEqual([
      {
        href: '/obra/epicteto/enquiridion/',
        texto: 'Enquiridión · 50 a. C. 1',
        lector: 'Enquiridión, 50 a. C., una cita',
      },
    ]);
  });

  it('cada entrada lleva a una Página de Obra que existe, también la que no se indexa', async () => {
    for (const { href } of entradas(seccion(await html('/autor/seneca/')))) {
      await expect(html(href)).resolves.toContain('<h1');
    }
    // Brevedad (82 %, por debajo del 90 %) y De la ira (3 Citas) se indexan; Enquiridión (una
    // sola Cita, y el 100 % de su Autor) no, y su entrada enlaza igual.
    const NOINDEX = /<meta name="robots" content="noindex, follow"/;
    expect(await html('/obra/seneca/sobre-la-brevedad-de-la-vida/')).not.toMatch(NOINDEX);
    expect(await html('/obra/seneca/de-la-ira/')).not.toMatch(NOINDEX);
    const enquiridion = entradas(seccion(await html('/autor/epicteto/')));
    expect(enquiridion.map((e) => e.href)).toEqual(['/obra/epicteto/enquiridion/']);
    expect(await html('/obra/epicteto/enquiridion/')).toMatch(NOINDEX);
  });

  it('el pie: «Y 2 citas…», «Y una cita…», y ninguna línea con cero', async () => {
    expect(seccion(await html('/autor/seneca/'))).toContain('Y 2 citas sin obra documentada.');
    const epicteto = seccion(await html('/autor/epicteto/'));
    expect(epicteto).not.toContain('sin obra documentada');
    expect(epicteto).not.toContain('class="sin-obra"');
  });

  it('un Autor sin Obras: el rótulo y la línea, sin lista y sin «Y»', async () => {
    const s = seccion(await html('/autor/antonio-machado/'));
    expect(s).toContain('Su obra en este Corpus');
    expect(s).toMatch(/>Una cita sin obra documentada\.</);
    expect(s).not.toContain('Y una cita');
    expect(s).not.toContain('<ul');
  });

  it('la página 2 no lleva la lista', async () => {
    const segunda = await html('/autor/seneca/2/');
    expect(segunda).not.toContain('Su obra en este Corpus');
    expect(seccion(segunda)).toBe('');
  });

  it('va entre la ficha y «Citas documentadas»', async () => {
    const pagina = await html('/autor/seneca/');
    const ficha = pagina.indexOf('</header>', pagina.indexOf('class="ficha'));
    const lista = pagina.indexOf('<section class="obras-del-autor');
    const citas = pagina.indexOf('Citas documentadas</h2>');
    expect(ficha).toBeGreaterThan(-1);
    expect(ficha).toBeLessThan(lista);
    expect(lista).toBeLessThan(citas);
  });

  /*
   * Historia 17.4 — la ficha abre la página, y solo la primera. Séneca tiene semblanza propia:
   * antes de la 17.4 la página 2 la repetía con los años.
   */
  it('17.4 — página 1: h1, años, semblanza, Lista de Obras y luego «Citas documentadas»', async () => {
    const pagina = await html('/autor/seneca/');
    const posiciones = [
      pagina.indexOf('<h1'),
      pagina.indexOf('class="años'),
      pagina.indexOf('class="semblanza'),
      pagina.indexOf('<section class="obras-del-autor'),
      pagina.indexOf('Citas documentadas</h2>'),
      pagina.indexOf('<ul class="listado'),
    ];
    for (const p of posiciones) expect(p).toBeGreaterThan(-1);
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
    expect(pagina).toContain('4 a. C.–65 d. C.</p>');
    expect(pagina.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it('17.4 — página 2: solo el h1 y el listado, con noindex', async () => {
    const segunda = await html('/autor/seneca/2/');
    const ficha = /<header class="ficha"[^>]*>([\s\S]*?)<\/header>/.exec(segunda)?.[1] ?? '';
    expect(ficha.replace(/<[^>]+>/g, '').trim()).toBe('Séneca');
    expect(segunda.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(segunda).not.toContain('<p class="años');
    expect(segunda).not.toContain('<p class="semblanza');
    expect(segunda).not.toContain('Semblanza tomada de');
    expect(segunda).not.toContain('<section class="obras-del-autor');
    expect(segunda).toContain('Citas documentadas</h2>');
    expect(segunda).toContain('<ul class="listado');
    expect(segunda).toMatch(/<meta name="robots" content="noindex/);
  });

  it('enumera Obras, no Citas: ninguna Cita dentro y ninguna repetida en la página', async () => {
    const pagina = await html('/autor/seneca/');
    expect(seccion(pagina)).not.toMatch(/\/cita\//);
    const hrefs = [...pagina.matchAll(/href="(\/cita\/[^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('sin ningún Modelo de Ingreso', async () => {
    for (const ruta of ['/autor/seneca/', '/autor/epicteto/', '/autor/antonio-machado/']) {
      expect(await html(ruta), ruta).not.toContain('data-ingreso');
    }
  });
});
