/**
 * El paso final de `npm run build`: cuánto pesa lo que se despliega — Historia 24.2, AD-9, AD-16.
 *
 * Vive en `integraciones/` sin ser una integración de Astro. No puede serlo: corre **después
 * de Pagefind**, que es cuando `dist/` es exactamente lo que sube el despliegue —su índice
 * incluido—, y `astro:build:done` llega antes. `package.json` lo encadena tras Pagefind.
 *
 * Es la cáscara: recorre `dist/`, pasa rutas y tamaños a `tools/lib/peso.ts`, que reparte y
 * decide, y escribe lo que este le devuelve. Las cifras salen por stdout, siempre; lo que cruza
 * un umbral, por stderr, y en GitHub Actions con su anotación. Sale con 1 sobre el tope, o si
 * no hay `dist/` que medir; con 0 en lo demás, avise o no. No escribe nada y no usa la red.
 */

import { lstat, readdir } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { medirDist, parteDePeso, type FicheroDeDist } from '../tools/lib/peso.ts';
import {
  AVISO_DE_PESO_DE_DIST,
  TOPE_DE_PESO_DE_DIST,
  TOPE_DE_PNG_DE_DIST,
} from '../src/lib/umbrales.ts';

/** Los ficheros regulares de `dist/`, con su ruta relativa y `/`, y su tamaño en bytes. */
async function ficherosDeDist(dist: string): Promise<FicheroDeDist[]> {
  const entradas = await readdir(dist, { withFileTypes: true, recursive: true });
  const regulares = entradas.filter((entrada) => entrada.isFile());
  return Promise.all(
    regulares.map(async (entrada) => {
      const fichero = join(entrada.parentPath, entrada.name);
      return {
        ruta: relative(dist, fichero).split(sep).join('/'),
        bytes: (await lstat(fichero)).size,
      };
    }),
  );
}

const dist = resolve(process.cwd(), 'dist');

let listado: FicheroDeDist[] | undefined;
try {
  listado = await ficherosDeDist(dist);
} catch (fallo) {
  // Sin traza: lo que importa es qué faltó y dónde, no la pila de `readdir`.
  const motivo = fallo instanceof Error ? fallo.message : String(fallo);
  process.stderr.write(
    `No se pudo medir el peso de dist/ en ${dist}: ${motivo}. Este paso corre al final de ` +
      '`npm run build`, después de Astro y de Pagefind, sobre lo que se va a desplegar.\n',
  );
  process.exitCode = 1;
}

if (listado !== undefined) {
  const parte = parteDePeso(
    medirDist(listado),
    { aviso: AVISO_DE_PESO_DE_DIST, tope: TOPE_DE_PESO_DE_DIST, topeDePng: TOPE_DE_PNG_DE_DIST },
    { anotar: process.env.GITHUB_ACTIONS === 'true' },
  );
  process.stdout.write(`${parte.cifras.join('\n')}\n`);
  for (const aviso of parte.avisos) process.stderr.write(`${aviso}\n`);
  if (parte.error !== undefined) {
    process.stderr.write(`${parte.error}\n`);
    process.exitCode = 1;
  }
}
