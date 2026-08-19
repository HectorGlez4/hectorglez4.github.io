import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  año,
  añoFallecimiento,
  estadoDerechos,
  fuenteDeCita,
  nombre,
  procedencia,
  semblanza,
  slug,
  texto,
  tradicion,
} from './lib/admision.js';

// ─────────────────────────────────────────────────────────────────────────────
// AD-1 — La puerta de admisión vive aquí, no en `tools/`.
//
// Las reglas se definen en `src/lib/admision.ts`; este fichero las cablea a las
// colecciones, que es donde se convierten en puerta: un fichero que las incumpla rompe
// el build lo haya escrito quien lo haya escrito. Si la comprobación viviera en el
// script de ingesta, editar un fichero con el editor de texto la esquivaría (FR-13).
// No se degrada a aviso.
//
// AD-2 — Lo no publicado vive fuera del árbol construido.
//
// Las tres colecciones apuntan a `corpus/{citas,autores,temas}`. `corpus/_revision/` no
// es la base de ninguna, así que ninguna colección puede cargarlo. No existe un campo
// `publicada` que filtrar en tiempo de ejecución: publicar es mover el fichero.
//
// `corpus/fuentes/` tampoco es la base de ninguna, y por el mismo motivo: son los
// documentos de Fuente que versiona `tools/recuperar.ts` (AD-23), texto de terceros que
// no puede filtrarse al sitio construido.
//
// Que no sea colección no quiere decir que el build lo ignore: desde la Historia 11.2 lo
// lee `integraciones/cotejo.ts`, que comprueba que el texto de cada Cita aparezca
// literalmente en el cuerpo de su documento y rompe la construcción si no. Lo lee para
// **cotejar**, nunca para publicar.
// ─────────────────────────────────────────────────────────────────────────────

const citas = defineCollection({
  // `base` acota la colección a corpus/citas. corpus/_revision/ queda fuera de su
  // alcance por construcción, no por filtro (AD-2).
  loader: glob({ pattern: '**/*.md', base: './corpus/citas' }),
  schema: z.object({
    // El texto vive en el frontmatter, no en el cuerpo del markdown, y es deliberado:
    // el procesador de markdown aplica SmartyPants y reescribiría comillas y guiones
    // del texto de la Cita. NFR-12 prohíbe que el sistema altere una Cita publicada sin
    // acción explícita del editor. El frontmatter pasa intacto.
    texto,
    autor: reference('autores'),
    temas: z.array(reference('temas')).default([]),
    slug,
    procedencia,
    estadoDerechos,
    /*
     * Historia 11.2 — la Fuente de la que salió la Cita, y con ella su documento.
     *
     * Declararlo aquí es lo que hace que el dato sobreviva a la publicación: el esquema
     * descarta lo que no reconoce, así que sin esta línea el `fuente:` que escribe
     * `tools/extraer.ts` se perdía al leer la colección y el cotejo no tendría de dónde
     * agarrarse. Es opcional en el esquema y **no** en la puerta: el cotejo del build
     * (`integraciones/cotejo.ts`) exige documento a toda Cita que no esté en el censo
     * cerrado de `corpus/pendientes-de-cotejo.yml`, y rompe la construcción si falta.
     */
    fuente: fuenteDeCita.optional(),
    // FR-15 — marcado de Cita apta para portada, que consume la Cita del Día (FR-9).
    aptaParaPortada: z.boolean().default(false),
  }),
});

const autores = defineCollection({
  loader: glob({ pattern: '**/*.{yml,yaml}', base: './corpus/autores' }),
  schema: z.object({
    nombre: nombre('Autor'),
    añoFallecimiento,
    añoNacimiento: año.optional(),
    semblanza,
    // §6.1 — el suelo del 40 % de tradición latinoamericana necesita saber de quién
    // hablamos. Opcional: ver la nota en `admision.ts`.
    tradicion: tradicion.optional(),
  }),
});

const temas = defineCollection({
  loader: glob({ pattern: '**/*.{yml,yaml}', base: './corpus/temas' }),
  schema: z.object({
    nombre: nombre('Tema'),
  }),
});

export const collections = { citas, autores, temas };
