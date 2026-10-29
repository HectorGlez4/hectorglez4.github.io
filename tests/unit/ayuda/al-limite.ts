import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CITAS_POR_PAGINA, MIN_CITAS_POR_COLECCION, MIN_CITAS_POR_TEMA } from '../../../src/lib/umbrales.ts';
import type { Rutas } from '../../../tools/lib/corpus.ts';

/**
 * Historia 26.8 — un Corpus «al límite» para las órdenes que retiran: todo se alcanza desde la
 * portada, pero dos Citas solo por un camino, y ese camino está justo en su umbral.
 *
 *   · Séneca tiene `CITAS_POR_PAGINA + 2` Citas sin Obra: las dos últimas por slug caen en la
 *     página 2 de su Autor, a cuatro saltos en el modelo (portada → Autores → Séneca → página 2
 *     → Cita), porque el modelo no lleva la lista de Autores de la portada.
 *   · `EN_LA_IRA` es la primera de esas dos, y su único camino es el Tema «La ira», que tiene
 *     exactamente `MIN_CITAS_POR_TEMA` Citas: ella y las de Epicteto.
 *   · `EN_LA_COLECCION` es la segunda, y su único camino es la Colección «Breves», que tiene
 *     exactamente `MIN_CITAS_POR_COLECCION` miembros: ella y las de Epicteto.
 *   · Las de Epicteto están en la página 1 de su Autor, así que nunca quedan fuera; una de ellas,
 *     `SIN_EFECTO`, lleva además «El tiempo», un Tema que no se publica: quitárselo o retirarla
 *     no deja a nadie fuera.
 *
 * Las Citas llevan lo justo para las órdenes (`leerCitas` no las valida): no se construye.
 */

const pad = (n: number) => String(n).padStart(3, '0');

export const EN_LA_IRA = `seneca-a-${pad(CITAS_POR_PAGINA + 1)}`;
export const EN_LA_COLECCION = `seneca-a-${pad(CITAS_POR_PAGINA + 2)}`;
/** Las Citas de Epicteto: todas de «La ira», todas miembros de «Breves». */
export const DE_EPICTETO = Array.from(
  { length: Math.max(MIN_CITAS_POR_TEMA, MIN_CITAS_POR_COLECCION) - 1 },
  (_, i) => `epicteto-b-${pad(i + 1)}`,
);
export const SIN_EFECTO = DE_EPICTETO[0]!;
export const COLECCION = 'breves';

function cita(slug: string, autor: string, temas: string[]): string {
  return [
    '---',
    `texto: "Texto de ${slug}, que no se parece a ningún otro del Corpus de prueba."`,
    `autor: "${autor}"`,
    ...(temas.length > 0 ? ['temas:', ...temas.map((t) => `  - "${t}"`)] : []),
    `slug: "${slug}"`,
    'estadoDerechos: "dominio-público"',
    '---',
    '',
  ].join('\n');
}

/** Siembra el Corpus al límite en `rutas`. */
export async function sembrarCorpusAlLimite(rutas: Rutas): Promise<void> {
  for (const dir of [rutas.citas, rutas.autores, rutas.temas, rutas.revision, rutas.colecciones]) {
    await mkdir(dir, { recursive: true });
  }
  for (const [slug, nombre] of [
    ['seneca', 'Séneca'],
    ['epicteto', 'Epicteto'],
  ]) {
    await writeFile(
      join(rutas.autores, `${slug}.yml`),
      `nombre: "${nombre}"\nañoFallecimiento: 65\nsemblanza: "Filósofo estoico."\nordenAlfabetico: "${nombre}"\n`,
      'utf8',
    );
  }
  await writeFile(join(rutas.temas, 'la-ira.yml'), 'nombre: "La ira"\n', 'utf8');
  await writeFile(join(rutas.temas, 'el-tiempo.yml'), 'nombre: "El tiempo"\n', 'utf8');

  for (let i = 1; i <= CITAS_POR_PAGINA + 2; i += 1) {
    const slug = `seneca-a-${pad(i)}`;
    await writeFile(
      join(rutas.citas, `seneca--a-${pad(i)}.md`),
      cita(slug, 'seneca', slug === EN_LA_IRA ? ['la-ira'] : []),
      'utf8',
    );
  }
  for (const slug of DE_EPICTETO) {
    await writeFile(
      join(rutas.citas, `${slug.replace('epicteto-', 'epicteto--')}.md`),
      cita(slug, 'epicteto', slug === SIN_EFECTO ? ['la-ira', 'el-tiempo'] : ['la-ira']),
      'utf8',
    );
  }
  await writeFile(
    join(rutas.colecciones, `${COLECCION}.yml`),
    [
      'nombre: "Breves"',
      'criterio: "Citas cortas."',
      'miembros:',
      ...[EN_LA_COLECCION, ...DE_EPICTETO].map((s) => `  - "${s}"`),
      '',
    ].join('\n'),
    'utf8',
  );
}

/** El contenido literal de un directorio, para comparar antes y después. */
export async function instantaneaDe(directorio: string): Promise<Record<string, string>> {
  const contenido: Record<string, string> = {};
  for (const entrada of await readdir(directorio, { recursive: true, withFileTypes: true })) {
    if (!entrada.isFile()) continue;
    const ruta = join(entrada.parentPath, entrada.name);
    contenido[ruta.slice(directorio.length + 1)] = await readFile(ruta, 'utf8');
  }
  return contenido;
}
