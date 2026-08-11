import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { darDeAltaLote } from '../../tools/alta.ts';
import {
  crearAutor,
  crearTema,
  editarAutor,
  eliminarTema,
  marcarAptaParaPortada,
} from '../../tools/lib/gestion.ts';
import { rutasDelCorpus, type Rutas } from '../../tools/lib/corpus.ts';

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function corpusVacio(): Promise<Rutas> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-gestion-'));
  temporales.push(raiz);
  const rutas = rutasDelCorpus(join(raiz, 'corpus'));
  for (const dir of [rutas.citas, rutas.autores, rutas.temas, rutas.revision]) {
    await mkdir(dir, { recursive: true });
  }
  return rutas;
}

const SENECA = {
  nombre: 'Séneca',
  añoNacimiento: -4,
  añoFallecimiento: 65,
  semblanza: 'Filósofo estoico hispanorromano.',
};

describe('Historia 1.7 — Autores', () => {
  it('crear un Autor sin año de fallecimiento se rechaza diciendo que es obligatorio', async () => {
    const rutas = await corpusVacio();
    const resultado = await crearAutor(rutas, { ...SENECA, añoFallecimiento: undefined });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.join(' ')).toMatch(/añoFallecimiento/);
    // Y no queda un Autor a medias en el corpus.
    expect(await readdir(rutas.autores)).toHaveLength(0);
  });

  it('crear un Autor completo lo escribe con su slug', async () => {
    const rutas = await corpusVacio();
    const resultado = await crearAutor(rutas, SENECA);

    expect(resultado.ok).toBe(true);
    expect(await readdir(rutas.autores)).toEqual(['seneca.yml']);

    const contenido = await readFile(join(rutas.autores, 'seneca.yml'), 'utf8');
    expect(contenido).toContain('nombre: "Séneca"');
    expect(contenido).toContain('añoFallecimiento: 65');
  });

  it('un campo opcional sin valor se omite, nunca vacío ni null', async () => {
    const rutas = await corpusVacio();
    await crearAutor(rutas, { ...SENECA, añoNacimiento: undefined });

    const contenido = await readFile(join(rutas.autores, 'seneca.yml'), 'utf8');
    expect(contenido).not.toContain('añoNacimiento');
    expect(contenido).not.toMatch(/null|:\s*""/);
  });

  it('no se crea dos veces el mismo Autor', async () => {
    const rutas = await corpusVacio();
    await crearAutor(rutas, SENECA);
    const segundo = await crearAutor(rutas, SENECA);

    expect(segundo.ok).toBe(false);
    if (!segundo.ok) expect(segundo.motivos.join(' ')).toMatch(/ya existe/);
  });

  it('editar conserva los campos que no se tocan', async () => {
    const rutas = await corpusVacio();
    await crearAutor(rutas, SENECA);
    const resultado = await editarAutor(rutas, 'seneca', { semblanza: 'Tutor de Nerón.' });

    expect(resultado.ok).toBe(true);
    const contenido = await readFile(join(rutas.autores, 'seneca.yml'), 'utf8');
    expect(contenido).toContain('Tutor de Nerón.');
    expect(contenido).toContain('añoFallecimiento: 65');
  });

  it('editar no cambia el fichero aunque cambie el nombre: el slug es la URL', async () => {
    const rutas = await corpusVacio();
    await crearAutor(rutas, SENECA);
    await editarAutor(rutas, 'seneca', { nombre: 'Lucio Anneo Séneca' });

    expect(await readdir(rutas.autores)).toEqual(['seneca.yml']);
    const contenido = await readFile(join(rutas.autores, 'seneca.yml'), 'utf8');
    expect(contenido).toContain('Lucio Anneo Séneca');
  });
});

describe('Historia 1.7 — Temas', () => {
  it('crear un Tema lo escribe con su slug', async () => {
    const rutas = await corpusVacio();
    const resultado = await crearTema(rutas, 'El tiempo');

    expect(resultado.ok).toBe(true);
    expect(await readdir(rutas.temas)).toEqual(['el-tiempo.yml']);
  });

  it('un Tema sin Citas publicadas se elimina', async () => {
    const rutas = await corpusVacio();
    await crearTema(rutas, 'El tiempo');
    const resultado = await eliminarTema(rutas, 'el-tiempo');

    expect(resultado.ok).toBe(true);
    expect(await readdir(rutas.temas)).toHaveLength(0);
  });

  it('un Tema con Citas publicadas no se elimina, y dice cuántas lo usan', async () => {
    const rutas = await corpusVacio();
    await crearAutor(rutas, SENECA);
    await crearTema(rutas, 'El tiempo');
    await darDeAltaLote(
      [
        {
          texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
          autor: 'Séneca',
          temas: ['El tiempo'],
          procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
        },
        {
          texto: 'La vida, si sabes usarla, es larga.',
          autor: 'Séneca',
          temas: ['El tiempo'],
          procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
        },
      ],
      rutas,
    );

    const resultado = await eliminarTema(rutas, 'el-tiempo');
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos[0]).toMatch(/2 Citas publicadas/);
    // El Tema sigue ahí.
    expect(await readdir(rutas.temas)).toEqual(['el-tiempo.yml']);
  });

  it('eliminar un Tema que no existe se rechaza', async () => {
    const rutas = await corpusVacio();
    const resultado = await eliminarTema(rutas, 'inexistente');
    expect(resultado.ok).toBe(false);
  });
});

describe('Historia 1.7 — marcado de Cita apta para portada', () => {
  async function corpusConUnaCita(): Promise<{ rutas: Rutas; slug: string }> {
    const rutas = await corpusVacio();
    await crearAutor(rutas, SENECA);
    const informe = await darDeAltaLote(
      [
        {
          texto: 'La vida, si sabes usarla, es larga.',
          autor: 'Séneca',
          procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
        },
      ],
      rutas,
    );
    return { rutas, slug: informe.publicadas[0].slug };
  }

  it('el marcado queda registrado en el fichero de la Cita', async () => {
    const { rutas, slug } = await corpusConUnaCita();
    const resultado = await marcarAptaParaPortada(rutas, slug, true);

    expect(resultado.ok).toBe(true);
    const [fichero] = await readdir(rutas.citas);
    const contenido = await readFile(join(rutas.citas, fichero), 'utf8');
    expect(contenido).toContain('aptaParaPortada: true');
  });

  it('al desmarcar el campo se omite, no se escribe como false', async () => {
    const { rutas, slug } = await corpusConUnaCita();
    await marcarAptaParaPortada(rutas, slug, true);
    await marcarAptaParaPortada(rutas, slug, false);

    const [fichero] = await readdir(rutas.citas);
    const contenido = await readFile(join(rutas.citas, fichero), 'utf8');
    expect(contenido).not.toContain('aptaParaPortada');
  });

  it('marcar no altera el texto ni el resto del fichero', async () => {
    const { rutas, slug } = await corpusConUnaCita();
    const [fichero] = await readdir(rutas.citas);
    const antes = await readFile(join(rutas.citas, fichero), 'utf8');

    await marcarAptaParaPortada(rutas, slug, true);
    const despues = await readFile(join(rutas.citas, fichero), 'utf8');

    // NFR-12: el sistema no altera el texto de una Cita publicada. Lo único que cambia
    // es la línea añadida.
    expect(despues).toContain('texto: "La vida, si sabes usarla, es larga."');
    expect(despues.replace(/aptaParaPortada: true\n/, '')).toBe(antes);
  });

  it('no se marca una Cita que no está publicada', async () => {
    const rutas = await corpusVacio();
    const resultado = await marcarAptaParaPortada(rutas, 'inexistente', true);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivos.join(' ')).toMatch(/no está publicada/);
  });
});

describe('Historia 1.7 — los umbrales tienen nombre (AD-9)', () => {
  it('ningún módulo repite los números de regla de negocio', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const raiz = new URL('../../', import.meta.url).pathname;

    const ficheros = (function recorrer(dir: string): string[] {
      return readdirSync(dir).flatMap((entrada) => {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) return recorrer(ruta);
        return /\.(ts|astro)$/.test(entrada) ? [ruta] : [];
      });
    })(join(raiz, 'src'));

    for (const ruta of ficheros) {
      if (ruta.endsWith('umbrales.ts')) continue;
      const codigo = readFileSync(ruta, 'utf8');
      expect(codigo, `${ruta} repite el umbral de Citas por Tema`).not.toMatch(/=\s*15\b/);
      expect(codigo, `${ruta} repite el umbral de caracteres`).not.toMatch(/=\s*300\b/);
      expect(codigo, `${ruta} repite el umbral de paginación`).not.toMatch(/=\s*50\b/);
    }
  });
});
