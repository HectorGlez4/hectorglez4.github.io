/**
 * El dominio definitivo — LC-1.
 *
 * Se lee de `public/CNAME`, que no es un fichero cualquiera: es el que GitHub Pages
 * exige encontrar en lo desplegado para seguir sirviendo el dominio propio. Derivarlo de
 * ahí en vez de escribirlo otra vez aquí quita el único fallo de esta historia que no
 * avisa — un CNAME y una canónica que dejan de coincidir producen un sitio que responde
 * en un dominio y se declara en otro, y eso el despliegue no lo detecta.
 *
 * Vive en `public/` por la misma razón por la que sobrevive a la reconstrucción diaria:
 * Astro copia ese directorio a `dist/` en cada build, sin que nadie tenga que acordarse.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `public/CNAME`, junto a este módulo o, si no está ahí, en la raíz desde la que se construye.
 *
 * Lo segundo existe desde la Historia 35.1b: el esquema de la atribuida (`src/lib/admision.ts`,
 * por `src/lib/atestiguaciones.ts`) necesita el dominio propio y viaja con `src/lib/publicado.ts`
 * al empaquetado de las páginas, donde la dirección relativa al módulo ya no apunta a `public/`.
 * Sin la segunda lectura, toda construcción se caía al generar las páginas.
 */
function leerCname(): string {
  const junto = new URL('../../public/CNAME', import.meta.url);
  try {
    return readFileSync(junto, 'utf8');
  } catch {
    const enLaRaiz = join(process.cwd(), 'public', 'CNAME');
    try {
      return readFileSync(enLaRaiz, 'utf8');
    } catch {
      // Se nombran las dos: un ENOENT a secas no dice que la construcción se lanzó fuera de la raíz.
      throw new Error(
        `No se encuentra public/CNAME: ni junto al módulo (${junto.pathname}) ni en la raíz desde la que se ` +
          `construye (${enLaRaiz}). Construye desde la raíz del proyecto.`,
      );
    }
  }
}

/** El dominio desnudo, tal y como lo exige el hospedaje: sin esquema y sin barra. */
export const DOMINIO = leerCname().trim();

/**
 * El origen con el que se construyen canónicas y sitemap.
 *
 * `SITE_URL` manda cuando trae algo: es lo que permite construir una previsualización en
 * otro origen sin tocar el repositorio. Se comprueba **con contenido**, no con `??`: una
 * variable de repositorio sin definir llega a la orden como cadena vacía, y `?? ` la
 * daría por buena. El sitio se publicaría con `site: ''` y todas las canónicas saldrían
 * relativas, sin que nada fallara.
 */
export const SITIO = process.env.SITE_URL?.trim() || `https://${DOMINIO}`;

/**
 * La dirección a la que se pide que una Cita se corrija o se retire — Historia 35.1b, AD-32.
 *
 * **La fija Héctor; ningún agente le da valor.** Es la quinta constante de la puerta de la
 * atribuida (las otras cuatro, en `src/lib/umbrales.ts`): sin ella no se publica ninguna,
 * porque una atribuida no se publica sin a dónde pedir su retirada. La pinta la línea de
 * retirada (`src/components/LineaDeRetirada.astro`, Historia 35.8), que para la construcción sin
 * ella: un alias dedicado y desechable, nunca una dirección personal.
 */
export const BUZON_DE_PETICIONES: string | undefined = undefined;
