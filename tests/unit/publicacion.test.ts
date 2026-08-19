import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import { AUTOR_VALIDO, citaValida, construirConCorpus, limpiar } from './ayuda/construir.js';
import { citaDelDia } from '../../src/lib/citaDelDia.ts';
import type { Cita } from '../../src/lib/publicado.ts';

/**
 * Historia 4.2 — reconstrucción diaria programada.
 *
 * Lo que se puede verificar aquí es la **configuración** y la **lógica** que la sostiene.
 * Que el disparador programado dispare de verdad solo lo demuestra una ejecución real en
 * GitHub, y este repositorio todavía no tiene remoto. Queda anotado como pendiente de
 * comprobar el día del despliegue.
 */

const RAIZ = resolve(import.meta.dirname, '../..');
const flujo = parsearYaml(
  readFileSync(resolve(RAIZ, '.github/workflows/publicar.yml'), 'utf8'),
) as {
  on: Record<string, unknown>;
  jobs: Record<string, { needs?: string; steps: { run?: string; uses?: string; env?: Record<string, string> }[] }>;
};

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

describe('Historia 4.2 — los dos disparadores', () => {
  it('existe el de cada push a la rama principal', () => {
    expect(flujo.on).toHaveProperty('push');
    expect((flujo.on.push as { branches: string[] }).branches).toContain('main');
  });

  it('existe el programado, a hora fija', () => {
    const programado = flujo.on.schedule as { cron: string }[];
    expect(programado).toHaveLength(1);

    const [minuto, hora, ...resto] = programado[0].cron.split(' ');
    // Diario: todos los días del mes, todos los meses, todos los días de la semana.
    expect(resto).toEqual(['*', '*', '*']);
    // Y a hora fija, no en un rango ni cada N horas.
    expect(hora).toMatch(/^\d+$/);
    expect(minuto).toMatch(/^\d+$/);
  });

  it('el cron no cae en hora en punto', () => {
    // A las horas en punto la cola de GitHub Actions se llena y el retraso puede pasar
    // de una hora, que en una tarea diaria significa saltarse la jornada.
    const [minuto] = (flujo.on.schedule as { cron: string }[])[0].cron.split(' ');
    expect(Number(minuto)).not.toBe(0);
  });
});

describe('Historia 4.2 — un fallo del corpus no llega a producción', () => {
  it('el despliegue depende de que la construcción termine bien', () => {
    expect(flujo.jobs.desplegar.needs).toBe('construir');
  });

  it('la construcción valida el corpus porque el esquema es la puerta', () => {
    const pasos = flujo.jobs.construir.steps.map((p) => p.run ?? p.uses ?? '');
    expect(pasos.some((p) => p.includes('npm run build'))).toBe(true);
    expect(pasos.some((p) => p.includes('npm test'))).toBe(true);
    expect(pasos.some((p) => p.includes('astro check'))).toBe(true);
  });

  it('una Cita inválida hace fallar el build, así que el despliegue no ocurre', async () => {
    // La otra mitad del criterio: no basta con que el flujo encadene los trabajos, hace
    // falta que el build falle de verdad ante un corpus roto.
    const resultado = await construirConCorpus({
      'autores/seneca.yml': AUTOR_VALIDO,
      'citas/seneca--rota.md': citaValida({ procedencia: undefined, slug: 'seneca-rota' }),
    });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo).not.toBe(0);
  });
});

describe('Historia 4.2 — la jornada en curso no cambia con un push', () => {
  const aptas: Cita[] = ['a', 'b', 'c'].map((slug) => ({
    slug,
    texto: `Texto ${slug}.`,
    autor: 'x',
    temas: [],
    procedencia: { obra: 'O', año: 1600 },
    aptaParaPortada: true,
  }));

  it('dos construcciones de la misma jornada componen la misma Cita', () => {
    // Es la propiedad que hace que un despliegue a media tarde conserve la Cita del día.
    expect(citaDelDia(aptas, '2026-08-11')!.cita.slug).toBe(
      citaDelDia(aptas, '2026-08-11')!.cita.slug,
    );
  });

  it('el flujo no fija la jornada en los disparadores automáticos', () => {
    // Si el push pasara su propia fecha-hora, dos builds del mismo día podrían diferir.
    // `FECHA_JORNADA` solo se rellena en la ejecución manual.
    const construir = flujo.jobs.construir.steps.find((p) => p.run?.includes('npm run build'));
    expect(construir?.env?.FECHA_JORNADA).toBe('${{ inputs.jornada }}');
  });

  it('la reconstrucción del día siguiente sí cambia la Cita', async () => {
    const corpus = {
      'autores/seneca.yml': AUTOR_VALIDO,
      'citas/seneca--una.md': citaValida({ slug: 'seneca-una', texto: 'Primera.', temas: [], aptaParaPortada: true }),
      'citas/seneca--otra.md': citaValida({ slug: 'seneca-otra', texto: 'Segunda.', temas: [], aptaParaPortada: true }),
    };

    const hoy = await construirConCorpus(corpus, { jornada: '2026-08-11' });
    const mañana = await construirConCorpus(corpus, { jornada: '2026-08-12' });
    aLimpiar.push(hoy.proyecto, mañana.proyecto);

    expect(hoy.codigo, hoy.salida).toBe(0);
    expect(mañana.codigo, mañana.salida).toBe(0);

    const destacada = async (proyecto: string) => {
      const html = await readFile(join(proyecto, 'dist', 'index.html'), 'utf8');
      return /href="\/cita\/([^"]+)"[^>]*>Ver esta cita/.exec(html)?.[1];
    };

    const deHoy = await destacada(hoy.proyecto);
    const deMañana = await destacada(mañana.proyecto);

    expect(deHoy).toBeDefined();
    expect(deMañana).toBeDefined();
    expect(deMañana).not.toBe(deHoy);
  });
});

/**
 * Historia 12.1 — lo que se publica no puede decir dos cosas distintas.
 *
 * Esta es la aserción que habría cazado el defecto de origen: `dist/404.html` y
 * `dist/buscar.html` salían a producción con `<meta name="robots" content="noindex,
 * follow">` **y** `data-pagefind-body`, o sea pidiéndole al buscador de fuera que no las
 * indexara mientras el de dentro las servía entre los resultados. Se mira sobre el sitio
 * construido y no sobre el componente porque es en el HTML final donde las dos etiquetas
 * conviven, y donde nadie las estaba comparando.
 */
describe('Historia 12.1 — ninguna página noindex entra en el índice interno', () => {
  let proyecto: string;

  beforeAll(async () => {
    const resultado = await construirConCorpus({
      'autores/seneca.yml': AUTOR_VALIDO,
      'citas/seneca--poco-tiempo.md': citaValida({
        slug: 'seneca-no-es-que-tengamos-poco-tiempo',
        texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
        temas: [],
      }),
    });
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  });

  afterAll(async () => {
    if (proyecto) await limpiar(proyecto);
  });

  /** Cada página construida con sus dos declaraciones: la de fuera y la de dentro. */
  async function paginasConstruidas(): Promise<
    { ruta: string; noIndexable: boolean; enElIndiceInterno: boolean }[]
  > {
    const dist = join(proyecto, 'dist');
    const paginas: { ruta: string; noIndexable: boolean; enElIndiceInterno: boolean }[] = [];

    async function recorrer(dir: string, prefijo: string) {
      for (const entrada of await readdir(dir, { withFileTypes: true })) {
        const completa = join(dir, entrada.name);
        if (entrada.isDirectory()) {
          await recorrer(completa, `${prefijo}/${entrada.name}`);
          continue;
        }
        if (!entrada.name.endsWith('.html')) continue;

        const html = await readFile(completa, 'utf8');
        const sinExtension = entrada.name.replace(/\.html$/, '');
        paginas.push({
          ruta: sinExtension === 'index' ? `${prefijo}/` : `${prefijo}/${sinExtension}`,
          noIndexable: /<meta name="robots" content="noindex/.test(html),
          enElIndiceInterno: html.includes('data-pagefind-body'),
        });
      }
    }

    await recorrer(dist, '');
    return paginas;
  }

  it('ninguna página con noindex lleva data-pagefind-body', async () => {
    const incoherentes = (await paginasConstruidas())
      .filter((p) => p.noIndexable && p.enElIndiceInterno)
      .map((p) => p.ruta);

    expect(incoherentes, 'noindex para el buscador de fuera y visibles para el de dentro').toEqual(
      [],
    );
  });

  it('y ninguna indexable se queda fuera del índice interno', async () => {
    // La otra mitad: si la coherencia se lograra sacándolo todo del índice, la búsqueda
    // propia se quedaría sin nada que buscar y esta prueba seguiría en verde.
    const olvidadas = (await paginasConstruidas())
      .filter((p) => !p.noIndexable && !p.enElIndiceInterno)
      .map((p) => p.ruta);

    expect(olvidadas, 'indexables fuera del índice de la búsqueda propia').toEqual([]);
  });

  it('el barrido ve las dos clases de página, así que compara algo', async () => {
    const paginas = await paginasConstruidas();
    expect(paginas.filter((p) => p.noIndexable).length).toBeGreaterThan(0);
    expect(paginas.filter((p) => !p.noIndexable).length).toBeGreaterThan(0);
  });
});
