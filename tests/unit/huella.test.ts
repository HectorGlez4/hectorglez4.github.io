import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RUTA_DE_LA_HUELLA, juicioDeLaHuella } from '../../tools/lib/medicion.ts';

const raiz = resolve(import.meta.dirname, '../..');

/**
 * AD-14, Historia 23.2 — la huella del vocabulario desplegado casa con el de `src/lib/`.
 *
 * Es lo que impide desplegar un sitio cuyo vocabulario el receptor en vivo no conoce: un campo
 * que el receptor no coteja llega a nulo sin error, indistinguible de un cero. La huella la
 * escribe solo `npm run medicion -- desplegar`, tras migrar, desplegar el receptor y comprobarlo
 * con balizas; nunca se escribe a mano.
 *
 * **En rojo a propósito entre la 23.2 y la 23.3**: la rama trae el vocabulario de la v8 y el
 * receptor que lo guarda, pero desplegarlo es acto de Héctor (23.3), y hasta entonces no hay
 * huella. Lo mismo cada vez que una historia toque `src/lib/vocabulario.ts`: la prueba falla
 * hasta repetir el despliegue del receptor.
 *
 * El juicio vive en `juicioDeLaHuella` (`tools/lib/medicion.ts`), y sus tres ramas —sin huella,
 * huella mal formada, vocabulario distinto— se prueban con huellas de mentira en
 * `tests/unit/medicion-orden.test.ts`. Aquí solo se mira el fichero del repositorio.
 */
describe('AD-14 — la huella del vocabulario desplegado', () => {
  const ruta = resolve(raiz, RUTA_DE_LA_HUELLA);

  it('está versionada, tiene forma de huella y casa con src/lib/vocabulario.ts', () => {
    const texto = existsSync(ruta) ? readFileSync(ruta, 'utf8') : undefined;
    expect(juicioDeLaHuella(texto)).toEqual([]);
  });
});
