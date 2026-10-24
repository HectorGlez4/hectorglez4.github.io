/**
 * El paso final de `npm run build`: cuánto pesa lo que se despliega — Historia 24.2, AD-9, AD-16.
 *
 * Vive en `integraciones/` sin ser una integración de Astro. No puede serlo: corre **después
 * de Pagefind**, que es cuando `dist/` es exactamente lo que sube el despliegue —su índice
 * incluido—, y `astro:build:done` llega antes. `package.json` lo encadena tras Pagefind.
 *
 * Es la cáscara: recorre `dist/`, pasa rutas y tamaños a `tools/lib/peso.ts`, que reparte y
 * decide, y escribe lo que este le devuelve. Las cifras salen por stdout cuando hay algo que
 * juzgar, y nunca por otro canal; lo que cruza un umbral, por stderr, y en GitHub Actions con
 * su anotación. Sale con 1 sobre el tope, o si no hay `dist/` que medir ni nada que juzgar en
 * él —y entonces sin cifras: ausencia antes que cero—; con 0 en lo demás, avise o no. No
 * escribe nada y no usa la red: solo importa de `node:fs/promises` lo que lee, y una prueba de
 * `tests/unit/peso.test.ts` lo fija.
 */

import { readdir, readlink, realpath, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import {
  errorDeLectura,
  medirDist,
  parteDePeso,
  type FicheroDeDist,
} from '../tools/lib/peso.ts';
import {
  AVISO_DE_PESO_DE_DIST,
  TOPE_DE_PESO_DE_DIST,
  TOPE_DE_PNG_DE_DIST,
} from '../src/lib/umbrales.ts';

/**
 * Los ficheros de `dist/`, con su ruta relativa y `/`, y su tamaño en bytes.
 *
 * Mide lo que sube el despliegue, y `upload-pages-artifact` empaqueta con
 * `tar --dereference`: **sigue los enlaces simbólicos**. Así que aquí también: un enlace a un
 * fichero cuenta con el tamaño de su destino, y uno a un directorio se recorre. Un enlace que
 * vuelve a un directorio que ya se está recorriendo se salta, como hace `tar` con un bucle, y
 * uno roto hace fallar la lectura —también rompería el empaquetado— diciendo que es un enlace
 * roto y adónde apunta: el fichero sigue saliendo en `ls`, y un «no such file» a secas
 * despistaría. Hoy ni Astro ni Pagefind escriben enlaces; esto es para que el día que alguno
 * llegue no se quede sin contar.
 *
 * Lo que no es fichero ni directorio —una tubería, un socket, un dispositivo— también hace
 * fallar la lectura: saltarlo en silencio dejaría la cuenta distinta de lo que se empaqueta, y
 * en un sitio estático no tiene nada que hacer.
 *
 * El empaquetado excluye además algunas entradas por su nombre (`.git` y `.github`, según la
 * versión de la acción). Aquí no se excluye nada: si alguna llegara a `dist/`, el paso la
 * contaría de más y nunca de menos, y un veredicto de más es el que no deja pasar el techo.
 * Hoy `dist/` no trae ninguna entrada que empiece por punto.
 */
async function ficherosDeDist(dist: string): Promise<FicheroDeDist[]> {
  const ficheros: FicheroDeDist[] = [];

  async function recorrer(directorio: string, antepasados: ReadonlySet<string>): Promise<void> {
    const real = await realpath(directorio);
    if (antepasados.has(real)) return;
    const conEste = new Set(antepasados).add(real);
    const entradas = await readdir(directorio, { withFileTypes: true });
    await Promise.all(
      entradas.map(async (entrada) => {
        const ruta = join(directorio, entrada.name);
        const nombre = relative(dist, ruta).split(sep).join('/');
        // Un solo `stat`, que sigue el enlace si lo es: de él salen el tipo y el tamaño.
        const info = await stat(ruta).catch(async (fallo: unknown) => {
          if (!entrada.isSymbolicLink()) throw fallo;
          const codigo = (fallo as { code?: string }).code ?? 'sin código';
          throw new Error(
            `${nombre} es un enlace simbólico roto: apunta a «${await readlink(ruta)}», que no ` +
              `lleva a ningún fichero ni directorio (${codigo})`,
          );
        });
        if (info.isDirectory()) {
          await recorrer(ruta, conEste);
        } else if (info.isFile()) {
          ficheros.push({ ruta: nombre, bytes: info.size });
        } else {
          throw new Error(`${nombre} no es un fichero ni un directorio`);
        }
      }),
    );
  }

  await recorrer(dist, new Set());
  return ficheros;
}

const dist = resolve(process.cwd(), 'dist');
const anotar = process.env.GITHUB_ACTIONS === 'true';

let listado: FicheroDeDist[] | undefined;
try {
  listado = await ficherosDeDist(dist);
} catch (fallo) {
  // Sin traza: lo que importa es qué faltó y dónde, no la pila de `readdir`.
  const motivo = fallo instanceof Error ? fallo.message : String(fallo);
  process.stderr.write(`${errorDeLectura(dist, motivo, { anotar })}\n`);
  process.exitCode = 1;
}

if (listado !== undefined) {
  const parte = parteDePeso(
    medirDist(listado),
    { aviso: AVISO_DE_PESO_DE_DIST, tope: TOPE_DE_PESO_DE_DIST, topeDePng: TOPE_DE_PNG_DE_DIST },
    { anotar },
  );
  if (parte.cifras.length > 0) process.stdout.write(`${parte.cifras.join('\n')}\n`);
  for (const aviso of parte.avisos) process.stderr.write(`${aviso}\n`);
  if (parte.error !== undefined) {
    process.stderr.write(`${parte.error}\n`);
    process.exitCode = 1;
  }
}
