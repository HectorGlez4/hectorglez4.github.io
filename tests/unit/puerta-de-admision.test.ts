import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
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
      'autores/seneca.yml': `nombre: Séneca\nsemblanza: Filósofo estoico hispanorromano.\n`,
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

  it('una Cita sin texto rompe el build', async () => {
    const { codigo } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida({ texto: undefined }),
    });
    expect(codigo).not.toBe(0);
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
