import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { esVersionSuficiente, VERSION_MINIMA } from '../../tools/comprobar-node.mjs';

const raiz = resolve(import.meta.dirname, '../..');

describe('Historia 1.1 — comprobación de versión de Node', () => {
  it('acepta la versión mínima exacta y cualquiera superior', () => {
    expect(esVersionSuficiente(VERSION_MINIMA)).toBe(true);
    expect(esVersionSuficiente('22.13.0')).toBe(true);
    expect(esVersionSuficiente('24.3.0')).toBe(true);
  });

  it('rechaza cualquier versión por debajo del mínimo', () => {
    expect(esVersionSuficiente('22.11.9')).toBe(false);
    expect(esVersionSuficiente('20.19.0')).toBe(false);
    expect(esVersionSuficiente('18.0.0')).toBe(false);
  });

  it('la máquina que ejecuta las pruebas cumple el mínimo', () => {
    expect(esVersionSuficiente(process.versions.node)).toBe(true);
  });

  it('el build está encadenado a la comprobación', () => {
    const pkg = JSON.parse(readFileSync(resolve(raiz, 'package.json'), 'utf8'));
    expect(pkg.scripts.prebuild).toContain('comprobar-node');
    expect(pkg.scripts.predev).toContain('comprobar-node');
  });
});

describe('Historia 1.1 — estructura de directorios', () => {
  const exigidos = [
    'corpus/citas',
    'corpus/autores',
    'corpus/temas',
    'corpus/_revision',
    'src/lib',
    'src/components',
    'src/islands',
    'src/pages',
    'src/styles',
    'tools',
  ];

  it.each(exigidos)('existe %s', (dir) => {
    expect(existsSync(resolve(raiz, dir))).toBe(true);
  });

  it('no queda ningún fichero de ejemplo de la plantilla', () => {
    // La plantilla `minimal` deja README.md y .vscode/, que no pertenecen a este
    // proyecto. AGENTS.md no entra en la lista: el de la raíz es el contexto de
    // proyecto que gestiona BMad, anterior a esta historia, no un resto de plantilla.
    for (const sobrante of ['README.md', '.vscode']) {
      expect(existsSync(resolve(raiz, sobrante)), `sobra ${sobrante}`).toBe(false);
    }
    // Y la única página es la portada propia, no la de ejemplo de Astro.
    const portada = readFileSync(resolve(raiz, 'src/pages/index.astro'), 'utf8');
    expect(portada).not.toContain('Astro');
    expect(portada).toContain('Sabiduría Diaria');
  });

  it('el corpus está vacío de contenido pero presente en git', () => {
    for (const dir of ['corpus/citas', 'corpus/autores', 'corpus/temas', 'corpus/_revision']) {
      expect(readdirSync(resolve(raiz, dir))).toContain('.gitkeep');
    }
  });
});
