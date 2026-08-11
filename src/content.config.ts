import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ─────────────────────────────────────────────────────────────────────────────
// AD-1 — La puerta de admisión vive aquí, no en `tools/`.
//
// Si el criterio de admisión viviera en el script de ingesta, editar un fichero
// con el editor de texto lo esquivaría. Vive en el esquema: un fichero que lo
// incumpla rompe el build (FR-13). No se degrada a aviso.
//
// AD-2 — Lo no publicado vive fuera del árbol construido.
//
// Las tres colecciones apuntan a `corpus/{citas,autores,temas}`. `corpus/_revision/`
// no es la base de ninguna, así que ninguna colección puede cargarlo. No existe un
// campo `publicada` que filtrar en tiempo de ejecución: publicar es mover el fichero.
// ─────────────────────────────────────────────────────────────────────────────

/** Un año como entero. Ni fechas completas ni cadenas: el modelo dice entero. */
const año = z
  .number({ message: 'El año debe ser un número entero.' })
  .int('El año debe ser un número entero, no un decimal.')
  .min(-800, 'El año queda fuera del rango que admite el corpus.')
  .max(new Date().getFullYear(), 'El año no puede ser futuro.');

/**
 * Procedencia — origen documentado de una Cita.
 *
 * El campo es obligatorio y debe documentar algo. El PRD lo cierra sin ambigüedad:
 * «Una Cita sin Procedencia no puede pasar a publicada; queda en en-revisión». Por
 * eso "ausente" no es un estado que el esquema admita en `corpus/citas/` — una Cita
 * cuya procedencia se desconoce vive en `corpus/_revision/` hasta que se documente.
 *
 * Dentro, `obra` y `año` son opcionales por separado: esa es la distinción entre
 * procedencia completa y parcial que audita la Historia 1.8. Un campo sin valor se
 * omite del fichero — nunca cadena vacía ni `null`.
 */
const procedenciaDeclarada = z
  .object({
    obra: z.string().min(1, 'La obra, si se declara, no puede estar vacía.').optional(),
    año: año.optional(),
    referencia: z
      .string()
      .min(1, 'La referencia, si se declara, no puede estar vacía.')
      .optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.obra !== undefined || p.año !== undefined || p.referencia !== undefined) return;
    // El issue se cuelga de `obra` y no de la raíz del objeto a propósito: Astro
    // formatea los errores de raíz como «Expected type "object", received "object"»
    // y se come el mensaje. Colgado de un campo, el editor lee la regla incumplida.
    ctx.addIssue({
      code: 'custom',
      path: ['obra'],
      message:
        'Regla incumplida: la Procedencia no documenta nada. Declare al menos obra, año o ' +
        'referencia. Una Cita cuya procedencia se desconoce no se publica: va a corpus/_revision/.',
    });
  });

/**
 * `procedencia:` sin nada debajo es la forma natural en que un editor escribe «esto no
 * lo tengo», y YAML lo interpreta como `null`. Sin este preproceso el build falla —
 * bien— pero con un mensaje inservible: Astro compone «Expected type `object`, received
 * `object`», porque `typeof null` es `"object"`. Convertir el nulo en objeto vacío deja
 * que el refinamiento de arriba responda con la regla incumplida, que es lo que el
 * criterio de aceptación exige leer.
 */
const procedencia = z.preprocess((valor) => (valor === null ? {} : valor), procedenciaDeclarada);

const citas = defineCollection({
  // `base` acota la colección a corpus/citas. corpus/_revision/ queda fuera de su
  // alcance por construcción, no por filtro (AD-2).
  loader: glob({ pattern: '**/*.md', base: './corpus/citas' }),
  schema: z.object({
    // El texto vive en el frontmatter, no en el cuerpo del markdown, y es deliberado:
    // el procesador de markdown aplica SmartyPants y reescribiría comillas y guiones
    // del texto de la Cita. NFR-12 prohíbe que el sistema altere una Cita publicada
    // sin acción explícita del editor. El frontmatter pasa intacto.
    texto: z
      .string({ message: 'Regla incumplida: falta el texto de la Cita.' })
      .min(1, 'Regla incumplida: el texto de la Cita no puede estar vacío.'),

    autor: reference('autores'),

    temas: z.array(reference('temas')).default([]),

    // AD-4 — el slug se escribe al crear el fichero y no se recalcula nunca. Vive en
    // el fichero, no se deriva en tiempo de build: así reasignar Temas no puede
    // cambiar la URL, que es exactamente lo que FR-1 prohíbe.
    slug: z
      .string({ message: 'Regla incumplida: falta el slug, que es inmutable y obligatorio.' })
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Regla incumplida: el slug solo admite minúsculas, dígitos y guiones, sin diacríticos.',
      ),

    procedencia: procedencia.describe('Obligatoria — AD-1'),

    // AD-1 — el único estado de derechos admisible. Cualquier otro rompe el build.
    estadoDerechos: z.literal('dominio-público', {
      message:
        'Regla incumplida: estadoDerechos solo admite «dominio-público». Una Cita con ' +
        'cualquier otro estado no puede publicarse.',
    }),

    // FR-15 — marcado de Cita apta para portada, que consume la Cita del Día (FR-9).
    aptaParaPortada: z.boolean().default(false),
  }),
});

const autores = defineCollection({
  loader: glob({ pattern: '**/*.{yml,yaml}', base: './corpus/autores' }),
  schema: z.object({
    nombre: z
      .string({ message: 'Regla incumplida: falta el nombre del Autor.' })
      .min(1, 'Regla incumplida: el nombre del Autor no puede estar vacío.'),

    // AD-1 — sin año de fallecimiento no hay forma de sostener que la obra está en
    // dominio público. Es obligatorio y su ausencia rompe el build (FR-13, FR-15).
    añoFallecimiento: año.describe('Obligatorio — AD-1'),

    añoNacimiento: año.optional(),

    // La semblanza breve que muestra la Página de Autor (FR-4).
    semblanza: z
      .string({ message: 'Regla incumplida: falta la semblanza del Autor.' })
      .min(1, 'Regla incumplida: la semblanza del Autor no puede estar vacía.'),
  }),
});

const temas = defineCollection({
  loader: glob({ pattern: '**/*.{yml,yaml}', base: './corpus/temas' }),
  schema: z.object({
    nombre: z
      .string({ message: 'Regla incumplida: falta el nombre del Tema.' })
      .min(1, 'Regla incumplida: el nombre del Tema no puede estar vacío.'),
  }),
});

export const collections = { citas, autores, temas };
