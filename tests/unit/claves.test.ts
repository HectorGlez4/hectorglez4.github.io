import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { autorAdmisible, ordenAlfabetico, ordenRevisado, REGLA_DE_CLAVE_DE_ORDEN } from '../../src/lib/admision.ts';
import { fallosDeClaves, ORDEN_PROPONER_CLAVES, proponerClave } from '../../tools/lib/claves.ts';
import { fijarCamposDeAutor } from '../../tools/lib/corpus.ts';

/**
 * Historia 26.1 — la clave de orden de un Autor, en lo que se puede probar sin construir: la
 * regla que la propone, la forma que el esquema exige, el núcleo de la puerta del build y el
 * escritor que la añade sin tocar el resto del fichero.
 */

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe('la regla fija: la última palabra del nombre', () => {
  it('propone la última palabra tal cual, y marca los nombres de tres palabras o más', () => {
    expect(proponerClave('Séneca')).toEqual({ clave: 'Séneca', marcada: false });
    expect(proponerClave('José Martí')).toEqual({ clave: 'Martí', marcada: false });
    expect(proponerClave('Miguel de Cervantes')).toEqual({ clave: 'Cervantes', marcada: true });
    expect(proponerClave('Manuel González Prada')).toEqual({ clave: 'Prada', marcada: true });
  });

  it('recorta el nombre y separa por cualquier espacio', () => {
    expect(proponerClave('  José   Martí ')).toEqual({ clave: 'Martí', marcada: false });
  });

  it('sin inicial válida no propone nada, y dice igual si el nombre es largo', () => {
    expect(proponerClave('Pío 2')).toEqual({ marcada: false });
    expect(proponerClave('Juan Pablo II 1')).toEqual({ marcada: true });
    expect(proponerClave('')).toEqual({ marcada: false });
  });
});

describe('AD-1 — la forma de la clave es puerta del esquema', () => {
  const AUTOR = { nombre: 'Séneca', añoFallecimiento: 65, semblanza: 'Filósofo.' };

  it('los dos campos son opcionales', () => {
    expect(autorAdmisible.safeParse(AUTOR).success).toBe(true);
  });

  it('admite una clave con inicial, también con tilde o eñe', () => {
    for (const clave of ['Séneca', 'Ñandú', 'de la Barca', 'Álvarez']) {
      expect(autorAdmisible.safeParse({ ...AUTOR, ordenAlfabetico: clave }).success, clave).toBe(true);
    }
  });

  it('rechaza con la regla la clave en blanco, con espacio delante, con cifra o signo', () => {
    for (const clave of ['', '  ', ' Séneca', '1984', '¿Quién?', '«Rojas»']) {
      const r = autorAdmisible.safeParse({ ...AUTOR, ordenAlfabetico: clave });
      expect(r.success, JSON.stringify(clave)).toBe(false);
      expect(r.error?.issues[0]?.message).toBe(REGLA_DE_CLAVE_DE_ORDEN);
    }
  });

  it('no recorta ni reescribe la clave', () => {
    expect(ordenAlfabetico.parse('Séneca ')).toBe('Séneca ');
  });

  it('ordenRevisado es una jornada que existe', () => {
    expect(ordenRevisado.safeParse('2026-10-28').success).toBe(true);
    expect(ordenRevisado.safeParse('2026-02-31').success).toBe(false);
    expect(ordenRevisado.safeParse('28/10/2026').success).toBe(false);
  });
});

describe('la puerta: forma a todos, presencia a los publicados', () => {
  const autor = (slug: string, extra: Record<string, unknown> = {}) => ({
    slug,
    ruta: `corpus/autores/${slug}.yml`,
    nombre: 'Miguel de Cervantes',
    ...extra,
  });

  it('un Autor publicado sin clave falla nombrando su fichero y la orden que la propone', () => {
    const fallos = fallosDeClaves([autor('cervantes')], new Set(['cervantes']));
    expect(fallos).toHaveLength(1);
    expect(fallos[0]).toContain('corpus/autores/cervantes.yml');
    expect(fallos[0]).toContain(ORDEN_PROPONER_CLAVES);
  });

  it('si la regla no da clave, nombra la orden de una persona y no la del lote', () => {
    const fallos = fallosDeClaves([autor('pio-2', { nombre: 'Pío 2' })], new Set(['pio-2']));
    expect(fallos[0]).toContain('npx tsx tools/autor.ts clave pio-2');
    expect(fallos[0]).not.toContain(ORDEN_PROPONER_CLAVES);
  });

  it('un Autor sin Citas publicadas no necesita clave', () => {
    expect(fallosDeClaves([autor('cervantes')], new Set())).toEqual([]);
  });

  it('la forma se exige a todo Autor, publicado o no', () => {
    const fallos = fallosDeClaves([autor('cervantes', { ordenAlfabetico: '1984' })], new Set());
    expect(fallos).toHaveLength(1);
    expect(fallos[0]).toContain('corpus/autores/cervantes.yml');
    expect(fallos[0]).toContain('ordenAlfabetico');
    expect(fallos[0]).toContain(REGLA_DE_CLAVE_DE_ORDEN);
  });

  it('con clave buena no falla nadie', () => {
    expect(fallosDeClaves([autor('cervantes', { ordenAlfabetico: 'Cervantes' })], new Set(['cervantes']))).toEqual([]);
  });
});

describe('el escritor de campos conserva el fichero byte a byte', () => {
  const CON_COMENTARIOS = [
    'nombre: "Teresa de Jesús"',
    'añoFallecimiento: 1582',
    'semblanza: "Religiosa y escritora abulense."',
    '# Un comentario que aYaml perdería.',
    'tituloEnFuente: "Santa Teresa de Jesús" # y otro al final de la línea',
    '',
  ].join('\n');

  async function fichero(contenido: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'sabiduria-claves-'));
    temporales.push(dir);
    const ruta = join(dir, 'teresa-de-jesus.yml');
    await writeFile(ruta, contenido, 'utf8');
    return ruta;
  }

  it('añadir la clave es añadir una línea al final, y nada más', async () => {
    const ruta = await fichero(CON_COMENTARIOS);
    await fijarCamposDeAutor(ruta, { ordenAlfabetico: 'Jesús' });
    expect(await readFile(ruta, 'utf8')).toBe(`${CON_COMENTARIOS}ordenAlfabetico: "Jesús"\n`);
  });

  it('a un fichero sin salto final le pone el suyo antes de la línea nueva', async () => {
    const ruta = await fichero(CON_COMENTARIOS.trimEnd());
    await fijarCamposDeAutor(ruta, { ordenAlfabetico: 'Jesús' });
    expect(await readFile(ruta, 'utf8')).toBe(`${CON_COMENTARIOS}ordenAlfabetico: "Jesús"\n`);
  });

  it('sustituir una clave ya escrita cambia solo su línea, y la revisión se añade al final', async () => {
    const ruta = await fichero(CON_COMENTARIOS.replace('# Un', 'ordenAlfabetico: "Jesús"\n# Un'));
    await fijarCamposDeAutor(ruta, { ordenAlfabetico: 'Teresa', ordenRevisado: '2026-10-28' });
    expect(await readFile(ruta, 'utf8')).toBe(
      `${CON_COMENTARIOS.replace('# Un', 'ordenAlfabetico: "Teresa"\n# Un')}ordenRevisado: "2026-10-28"\n`,
    );
  });

  it('un fichero que no es un mapa YAML no se toca', async () => {
    const ruta = await fichero('- una lista\n- no un Autor\n');
    await expect(fijarCamposDeAutor(ruta, { ordenAlfabetico: 'X' })).rejects.toThrow();
    expect(await readFile(ruta, 'utf8')).toBe('- una lista\n- no un Autor\n');
  });
});
