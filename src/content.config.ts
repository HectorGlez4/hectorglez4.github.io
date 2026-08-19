import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  año,
  añoFallecimiento,
  estadoDerechos,
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
// el build **no lee** y que no puede filtrarse al sitio construido.
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
