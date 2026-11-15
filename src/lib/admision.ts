/**
 * AD-1 — Las reglas de admisión, en un solo sitio.
 *
 * `src/content.config.ts` las cablea a las colecciones: ahí es donde se convierten en
 * puerta, porque un fichero que las incumpla rompe el build lo haya escrito quien lo
 * haya escrito. Las herramientas de `tools/` importan **estas mismas** definiciones.
 *
 * El motivo de que vivan aquí y no dentro de `content.config.ts` es concreto: si la
 * herramienta de alta implementase su propia copia de las reglas, podría aceptar una
 * Cita que el build rechaza más tarde, y el editor descubriría el desacuerdo al
 * construir en lugar de al dar de alta. Una definición, dos consumidores.
 *
 * AD-5 — Puro: sin lecturas de disco, sin Astro.
 */

import { z } from 'astro/zod';
import {
  MAX_CARACTERES_CRITERIO,
  MAX_CARACTERES_NOTA_DE_OBRA,
  MIN_ATESTIGUACIONES_DE_ATRIBUIDA,
} from './umbrales.ts';
import { dominiosQueAtestiguan } from './atestiguaciones.ts';
import { inicialDeClave, normalizar } from './normalizar.ts';
import { esJornada } from './jornada.ts';
import { esAtribuida, ORIGEN_TRADUCCION_PROPIA } from './clase.ts';
import { CLAVES_DE_REGION, esRegionDeVariante } from './variante.ts';
import { FORMATOS_DE_EDICION, TIENDAS, esDelDominio, tiendaDe, type Tienda } from './ingreso.ts';

/**
 * Un año como entero. Ni fechas completas ni cadenas: el modelo dice entero.
 *
 * El mensaje es parámetro porque el que sirve cuando el valor es de otro tipo no sirve
 * cuando el campo falta. «El año debe ser un número entero» ante un campo ausente deja al
 * editor buscando un año mal escrito que no existe, en lugar de decirle que lo añada.
 */
export const añoEntero = (mensaje = 'El año debe ser un número entero.') =>
  z
    .number({ message: mensaje })
    .int('El año debe ser un número entero, no un decimal.')
    .min(-800, 'El año queda fuera del rango que admite el corpus.')
    .max(new Date().getFullYear(), 'El año no puede ser futuro.');

export const año = añoEntero();

export const MENSAJE_PROCEDENCIA_VACIA =
  'Regla incumplida: la Procedencia no documenta nada. Declare al menos obra, año o ' +
  'referencia. Una Cita cuya procedencia se desconoce no se publica: va a corpus/_revision/.';

/**
 * La traducción de la que sale una Cita — Historia 19.1.
 *
 * Lo que la Fuente declara de su edición —quién tradujo y cuándo— es dato de la
 * **edición**, no de la Obra: las Odas no son de 1909, la traducción de Germán Salinas sí.
 * Por eso vive aparte de `procedencia.año`, que es solo el año de la Obra y se omite si la
 * Fuente no lo da (nunca se infiere).
 *
 * `traductor` es obligatorio cuando el campo se declara: una traducción de la que solo
 * consta un año no dice nada que se pueda publicar como «Traducción de…». `año` es el de
 * la traducción y es opcional; sin valor se omite. No es una puerta de publicación: una
 * Cita de obra traducida sin este campo se publica igual (la salud la cuenta).
 */
export const traduccionDeclarada = z
  .object({
    traductor: z
      .string({ message: 'Regla incumplida: la traducción declara su traductor, que es obligatorio.' })
      .trim()
      .min(1, 'Regla incumplida: el traductor no puede estar vacío ni ser solo espacios.'),
    año: añoEntero('El año de la traducción debe ser un número entero.').optional(),
  })
  .strict();

export type Traduccion = z.infer<typeof traduccionDeclarada>;

/**
 * Procedencia — origen documentado de una Cita.
 *
 * El campo es obligatorio y debe documentar algo. El PRD lo cierra sin ambigüedad:
 * «Una Cita sin Procedencia no puede pasar a publicada; queda en en-revisión». Por eso
 * "ausente" no es un estado que el esquema admita en `corpus/citas/` — una Cita cuya
 * procedencia se desconoce vive en `corpus/_revision/` hasta que se documente.
 *
 * Dentro, `obra` y `año` son opcionales por separado: esa es la distinción entre
 * procedencia completa y parcial que audita la Historia 1.8. Un campo sin valor se omite
 * del fichero — nunca cadena vacía ni `null`.
 */
export const procedenciaDeclarada = z
  .object(
    {
      obra: z.string().min(1, 'La obra, si se declara, no puede estar vacía.').optional(),
      año: año.optional(),
      referencia: z
        .string()
        .min(1, 'La referencia, si se declara, no puede estar vacía.')
        .optional(),
      traduccion: traduccionDeclarada.optional(),
    },
    {
      // Sin esto, omitir el campo entero da «expected object, received undefined» —
      // correcto y en inglés, pero no dice qué hacer. El criterio de aceptación exige
      // que el mensaje indique la regla incumplida, y quien lo lee es el editor.
      error:
        'Regla incumplida: falta la Procedencia, que es obligatoria. Declare al menos ' +
        'obra, año o referencia.',
    },
  )
  .strict()
  .superRefine((p, ctx) => {
    if (p.obra !== undefined || p.año !== undefined || p.referencia !== undefined) return;
    // El issue se cuelga de `obra` y no de la raíz del objeto a propósito: Astro
    // formatea los errores de raíz como «Expected type "object", received "object"»
    // y se come el mensaje. Colgado de un campo, el editor lee la regla incumplida.
    ctx.addIssue({ code: 'custom', path: ['obra'], message: MENSAJE_PROCEDENCIA_VACIA });
  });

/**
 * `procedencia:` sin nada debajo es la forma natural en que un editor escribe «esto no lo
 * tengo», y YAML lo interpreta como `null`. Sin este preproceso el build falla —bien—
 * pero con un mensaje inservible: Astro compone «Expected type `object`, received
 * `object`», porque `typeof null` es `"object"`.
 */
export const procedencia = z.preprocess(
  (valor) => (valor === null ? {} : valor),
  procedenciaDeclarada,
);

export type Procedencia = z.infer<typeof procedenciaDeclarada>;

/** AD-4 — el slug es inmutable, se escribe al crear el fichero y no se recalcula. */
export const slug = z
  .string({ message: 'Regla incumplida: falta el slug, que es inmutable y obligatorio.' })
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Regla incumplida: el slug solo admite minúsculas, dígitos y guiones, sin diacríticos.',
  );

/**
 * AD-29 (Historia 29.1) — el salto de verso se guarda como un único U+000A dentro del `texto`,
 * y solo así. Cada forma que no es esa se rechaza con su regla: un retorno de carro, dos saltos
 * seguidos (la estrofa no se guarda), un salto al principio o al final, cualquier otro
 * separador de línea (U+2028, U+2029, U+0085, `\v`, `\f`), un espacio de cualquier clase pegado a
 * un salto, y las dos maneras de fingir un verso en una línea —`<br` y « / »—. Quién
 * escribe el salto, y de qué documento sale, lo decide `textoConSaltos` de `tools/lib/lineas.ts`;
 * aquí solo vive la forma.
 */
/**
 * Los invisibles que `colapsarEspacios` retira al comparar con el documento. Las reglas que miran
 * lo que rodea a un salto se juzgan sin ellos: un U+FEFF entre dos saltos no separa la estrofa
 * («verso\n\ufeff\notro» son dos saltos seguidos), ni uno entre el salto y el borde lo aparta
 * del borde. No es una segunda lectura del espacio, solo lo que este esquema no debe dejar pasar.
 */
const INVISIBLES_JUNTO_AL_SALTO = /[\u00ad\u200b\u200c\u200d\u2060\ufeff]/gu;

const FORMAS_DEL_SALTO_RECHAZADAS: readonly { prueba: RegExp; regla: string; sinInvisibles?: true }[] = [
  { prueba: /\r/u, regla: 'el texto no admite retornos de carro (U+000D): el salto de verso es un único U+000A.' },
  {
    prueba: /\n\n/u,
    regla: 'el texto no admite dos saltos seguidos: entre estrofas va un solo U+000A.',
    sinInvisibles: true,
  },
  { prueba: /^\n|\n$/u, regla: 'el texto no admite un salto al principio ni al final.', sinInvisibles: true },
  {
    prueba: /[\u2028\u2029\u0085\v\f]/u,
    regla:
      'el texto no admite otro separador de línea (U+2028, U+2029, U+0085, tabulador vertical ni salto de página): el salto de verso es un único U+000A.',
  },
  // U+FEFF casa con `\s`, pero es un invisible que el escritor conserva junto al salto.
  {
    prueba: /[^\S\n\ufeff]\n|\n[^\S\n\ufeff]/u,
    regla: 'el texto no admite un espacio (tampoco duro ni fino) ni un tabulador pegados a un salto.',
  },
  { prueba: /<br/iu, regla: 'el texto no admite «<br»: el salto de verso es un U+000A.' },
  { prueba: / \/ /u, regla: 'el texto no admite « / » como salto de verso: el salto es un U+000A.' },
];

export const texto = z
  .string({ message: 'Regla incumplida: falta el texto de la Cita.' })
  .min(1, 'Regla incumplida: el texto de la Cita no puede estar vacío.')
  .superRefine((valor, ctx) => {
    const sinInvisibles = valor.replace(INVISIBLES_JUNTO_AL_SALTO, '');
    for (const { prueba, regla, sinInvisibles: juzgarSinInvisibles } of FORMAS_DEL_SALTO_RECHAZADAS) {
      if (prueba.test(juzgarSinInvisibles ? sinInvisibles : valor)) ctx.addIssue({ code: 'custom', message: `Regla incumplida: ${regla}` });
    }
  });

/** AD-1 — el único estado de derechos admisible. Cualquier otro rompe el build. */
export const estadoDerechos = z.literal('dominio-público', {
  message:
    'Regla incumplida: estadoDerechos solo admite «dominio-público». Una Cita con ' +
    'cualquier otro estado no puede publicarse.',
});

/**
 * La clase de una Cita — Historia 35.1, AD-32.
 *
 * Solo la atribuida la escribe: `clase: atribuida`. La de siempre **no lleva** el campo, y
 * escribir `clase: siempre` es un error con mensaje propio, para que la ausencia sea la única
 * forma de decirla y nadie tenga que adivinar si un fichero sin el campo es de siempre o un
 * olvido. Lo lee solo `esAtribuida` de `src/lib/clase.ts`. No se teclea: el alta y la
 * aprobación la derivan (`claseQueCorresponde`).
 */
export const MENSAJE_CLASE_SIEMPRE_ESCRITA =
  'Regla incumplida: la clase de siempre no se escribe. Una Cita de dominio público, cotejada, ' +
  'no lleva el campo «clase»; solo la atribuida lleva «clase: atribuida».';

export const clase = z.literal('atribuida', {
  error: (problema) =>
    problema.input === 'siempre'
      ? MENSAJE_CLASE_SIEMPRE_ESCRITA
      : 'Regla incumplida: «clase» solo admite «atribuida»; la Cita de siempre no lleva el campo.',
});

/**
 * El Personaje que dice una Cita atribuida — Historias 35.1 y 35.2.
 *
 * Aquí solo se juzga su **forma**, la de un slug. Que el Personaje exista en
 * `corpus/personajes/` es relación entre ficheros, y la comprueba la puerta del build
 * (`integraciones/personajes.ts`). Solo lo admite la atribuida (`reglasDeClase`).
 */
export const personaje = z
  .string({ message: 'Regla incumplida: el Personaje de la Cita es un slug.' })
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Regla incumplida: el Personaje de la Cita es un slug: minúsculas, dígitos y guiones, sin diacríticos.',
  );

/**
 * Una atestiguación de una Cita atribuida — Historia 35.1b, AD-32: la dirección `http(s)` de un
 * sitio que la atribuye y la jornada en que se consultó. No se descarga ni se coteja: cuenta su
 * dominio registrable (`dominioDeAtestiguacion` de `src/lib/atestiguaciones.ts`).
 */
export const atestiguacion = z
  .object(
    {
      url: z
        .string({ message: 'Regla incumplida: una atestiguación declara su «url».' })
        .refine((valor) => {
          try {
            const leida = new URL(valor);
            return (
              (leida.protocol === 'http:' || leida.protocol === 'https:') &&
              leida.username === '' &&
              leida.password === ''
            );
          } catch {
            return false;
          }
        }, 'Regla incumplida: la «url» de una atestiguación es una dirección http:// o https://, sin usuario ni contraseña.'),
      consultadaEl: z
        .string({ message: 'Regla incumplida: una atestiguación declara «consultadaEl», la jornada AAAA-MM-DD.' })
        .refine(esJornada, 'Regla incumplida: «consultadaEl» es una jornada AAAA-MM-DD que existe.'),
    },
    { message: 'Regla incumplida: una atestiguación es un objeto con «url» y «consultadaEl».' },
  )
  .strict();

export const atestiguaciones = z
  .array(atestiguacion, { message: 'Regla incumplida: «atestiguaciones» es una lista de {url, consultadaEl}.' })
  .min(1, 'Regla incumplida: una atribuida declara al menos una atestiguación.');

/**
 * De dónde sale la letra de una atribuida — Historia 35.1b, AD-32. `traduccion-propia` (decisión de
 * Héctor del 2026-11-14, FR-68 v9.2; Historia 35.11): el último recurso, cuando no circula ninguna
 * versión en español; el texto es la traducción del sitio, lleva su `partida` y la aprueban dos
 * agentes distintos, cuyo registro lee solo el build. **Ninguna superficie pinta el origen** —ni
 * línea, ni sello, ni hueco (UX v9.3)—: se guarda para auditar y no fecha (`CAMPOS_QUE_NO_FECHAN`).
 * Solo la atribuida: la de siempre no declara origen y nunca se traduce (§4.11).
 */
export const ORIGENES = ['original', 'doblaje', 'traduccion-publicada', ORIGEN_TRADUCCION_PROPIA] as const;

export const origen = z.enum(ORIGENES, {
  message: `Regla incumplida: «origen» es uno de ${ORIGENES.map((o) => `«${o}»`).join(', ')}.`,
});

/**
 * Los de la Variante: los mismos salvo la traducción propia. Una Variante es la letra que circula
 * en otra región —hoy, el doblaje de España—; una traducción del sitio no es de ninguna región, y
 * donde circula una versión en español no hace falta traducir.
 */
export const ORIGENES_DE_VARIANTE = ORIGENES.filter(
  (o): o is Exclude<(typeof ORIGENES)[number], typeof ORIGEN_TRADUCCION_PROPIA> => o !== ORIGEN_TRADUCCION_PROPIA,
);

const origenDeVariante = z.enum(ORIGENES_DE_VARIANTE, {
  message:
    `Regla incumplida: el «origen» de la Variante es uno de ${ORIGENES_DE_VARIANTE.map((o) => `«${o}»`).join(', ')}` +
    ' —una Variante es la letra que circula en otra región, nunca una traducción del sitio—.',
});

/**
 * La Variante de una Cita atribuida — Historia 35.6, AD-34: la misma frase en otra región
 * —hoy, el doblaje de España—, con su `origen`. Una como mucho, y solo en la atribuida
 * (`reglasDeClase`). No crea slug ni URL: el slug sale solo del texto principal (AD-4).
 * Que no repita otra Cita lo juzga `fallosDeAtribuidas` (`tools/lib/atribuidas.ts`); que vaya en
 * una línea, `reglasDeLaAtribuida`.
 */
export const variante = z.strictObject(
  {
    texto: z
      .string({ message: 'Regla incumplida: la Variante declara su «texto».' })
      .min(1, 'Regla incumplida: el texto de la Variante no puede estar vacío.')
      .refine((t) => t.trim() !== '', 'Regla incumplida: el texto de la Variante no puede estar en blanco.'),
    region: z
      .string({ message: 'Regla incumplida: la Variante declara su «region».' })
      .refine(
        esRegionDeVariante,
        `Regla incumplida: la «region» de la Variante es una de ${CLAVES_DE_REGION.map((r) => `«${r}»`).join(', ')}.`,
      ),
    origen: origenDeVariante,
  },
  {
    error: (problema) =>
      problema.code === 'unrecognized_keys'
        ? 'Regla incumplida: la Variante solo declara «texto», «region» y «origen».'
        : 'Regla incumplida: «variante» es un objeto con «texto», «region» y «origen»; una como mucho.',
  },
);

/**
 * Las lenguas de las que sale una traducción propia — Historia 35.11, AD-32 v9.2: un conjunto
 * cerrado de códigos ISO 639-1 de trabajo. Ampliarlo o renombrarlo es un diff de Héctor.
 */
export const LENGUAS_DE_PARTIDA = ['en', 'fr', 'it', 'de', 'pt', 'ja'] as const;

/**
 * La frase de partida de la traducción propia — Historia 35.11, AD-32 v9.2: lo que dijo su dueño en
 * su lengua, tal cual lo traen sus atestiguaciones, con la lengua de `LENGUAS_DE_PARTIDA`, para que
 * la fidelidad de la traducción se pueda auditar (SM-C6, segunda muestra). Obligatoria con
 * `origen: traduccion-propia` y prohibida con cualquier otro y en la de siempre (`reglasDeClase`).
 * El texto, en una línea. No se pinta en ninguna superficie, y por eso no fecha.
 */
export const partida = z.strictObject(
  {
    texto: z
      .string({ message: 'Regla incumplida: la «partida» declara su «texto», la frase en su lengua.' })
      .refine((t) => t.trim() !== '', 'Regla incumplida: el texto de la «partida» no puede estar en blanco.')
      .refine(
        (t) => !/[\n\r\u2028\u2029\u0085\v\f]/u.test(t),
        'Regla incumplida: el texto de la «partida» va en una sola línea.',
      ),
    lengua: z.enum(LENGUAS_DE_PARTIDA, {
      message: `Regla incumplida: la «lengua» de la «partida» es una de ${LENGUAS_DE_PARTIDA.map((l) => `«${l}»`).join(', ')}.`,
    }),
  },
  {
    error: (problema) =>
      problema.code === 'unrecognized_keys'
        ? 'Regla incumplida: la «partida» solo declara «texto» y «lengua».'
        : 'Regla incumplida: «partida» es un objeto con «texto» y «lengua».',
  },
);

/** Sin Autor ni Personaje, una Cita no tiene dueño: ni prefijo, ni fichero, ni página. */
export const MENSAJE_CITA_SIN_DUEÑO =
  'Regla incumplida: falta el Autor o el Personaje de la Cita. Toda Cita lleva uno de los dos, al menos: ' +
  'es su dueño, y de él salen el prefijo de su slug y su fichero.';

/**
 * Las reglas que una Cita cumple según su clase — Historia 35.1. Las comparten `citaAdmisible`
 * y la colección `citas` de `src/content.config.ts`, para que el alta y el build digan lo mismo:
 *
 *   · toda Cita lleva Autor o Personaje, al menos uno (Historia 35.2): es su dueño;
 *   · la de siempre lleva `estadoDerechos: dominio-público` y no lleva `personaje`;
 *   · la atribuida no lleva `estadoDerechos`: su derecho no es el dominio público.
 *
 * Corre aunque falle otra regla del objeto (`when`), así que no supone nada de la forma del valor.
 */
export function reglasDeClase(valor: unknown, contexto: z.RefinementCtx): void {
  if (valor === null || typeof valor !== 'object') return;
  const cita = valor as Record<string, unknown>;
  const atribuida = esAtribuida(cita);
  if (cita.autor === undefined && cita.personaje === undefined) {
    contexto.addIssue({ code: 'custom', path: ['autor'], message: MENSAJE_CITA_SIN_DUEÑO });
  }
  // Una clase sin valor admisible ya la rechaza el literal: no se juzga lo demás por ella.
  if (cita.clase !== undefined && !atribuida) return;
  if (atribuida) {
    reglasDeLaAtribuida(cita, contexto);
    if (cita.estadoDerechos !== undefined) {
      contexto.addIssue({
        code: 'custom',
        path: ['estadoDerechos'],
        message:
          'Regla incumplida: una Cita atribuida no lleva estadoDerechos. Su derecho no es el ' +
          'dominio público, y declararlo sería afirmar lo contrario de lo que es.',
      });
    }
    return;
  }
  for (const campo of ['atestiguaciones', 'origen', 'partida'] as const) {
    if (cita[campo] === undefined) continue;
    contexto.addIssue({
      code: 'custom',
      path: [campo],
      message:
        `Regla incumplida: solo una Cita atribuida declara «${campo}». La de siempre se coteja ` +
        'contra su documento: no se atestigua ni declara origen.',
    });
  }
  if (cita.variante !== undefined) {
    contexto.addIssue({
      code: 'custom',
      path: ['variante'],
      message:
        'Regla incumplida: solo una Cita atribuida declara «variante». La de siempre se publica ' +
        'con la letra de su documento, y otra letra sería otra Cita.',
    });
  }
  if (cita.estadoDerechos === undefined) {
    contexto.addIssue({
      code: 'custom',
      path: ['estadoDerechos'],
      message:
        'Regla incumplida: falta estadoDerechos. Una Cita de siempre declara «dominio-público», ' +
        'que es lo que permite publicarla.',
    });
  }
  if (cita.personaje !== undefined) {
    contexto.addIssue({
      code: 'custom',
      path: ['personaje'],
      message:
        'Regla incumplida: solo una Cita atribuida declara Personaje. La de siempre es de un ' +
        'Autor de dominio público y no lleva el campo.',
    });
  }
}

/**
 * Por qué no bastan las atestiguaciones de una atribuida, o `undefined` si bastan — Historia 35.1b.
 * Cuentan los dominios registrables distintos de `dominiosQueAtestiguan`; sin mínimo (`undefined`,
 * la puerta cerrada), no se juzga: la puerta ya no deja publicar nada.
 */
export function motivoDeAtestiguacionesEscasas(urls: readonly string[], minimo: number | undefined): string | undefined {
  if (minimo === undefined) return undefined;
  const dominios = dominiosQueAtestiguan(urls);
  if (dominios.length >= minimo) return undefined;
  return (
    `Regla incumplida: la atestigua${dominios.length === 1 ? '' : 'n'} ${dominios.length} ` +
    `${dominios.length === 1 ? 'dominio registrable' : 'dominios registrables distintos'}` +
    `${dominios.length > 0 ? ` (${dominios.join(', ')})` : ''} y hacen falta ${minimo} ` +
    '(MIN_ATESTIGUACIONES_DE_ATRIBUIDA). Los subdominios de un mismo dominio cuentan uno, y BrainyQuote y el ' +
    'propio sitio no cuentan.'
  );
}

/**
 * Lo que la atribuida cumple sola, sin mirar otros ficheros — Historia 35.1b, AD-32: declara sus
 * atestiguaciones y su origen, va en una línea aunque traiga Fuente, no es apta para portada y,
 * con `MIN_ATESTIGUACIONES_DE_ATRIBUIDA` con valor, la atestiguan al menos tantos dominios
 * registrables distintos. Lo que relaciona ficheros —topes, Obra, duplicados— lo juzga
 * `tools/lib/atribuidas.ts`.
 */
function reglasDeLaAtribuida(cita: Record<string, unknown>, contexto: z.RefinementCtx): void {
  if (cita.atestiguaciones === undefined) {
    contexto.addIssue({
      code: 'custom',
      path: ['atestiguaciones'],
      message:
        'Regla incumplida: una Cita atribuida declara sus «atestiguaciones» ({url, consultadaEl}): ' +
        'no se coteja, se publica porque otros sitios la atestiguan.',
    });
  } else if (Array.isArray(cita.atestiguaciones)) {
    const urls = cita.atestiguaciones
      .map((a) => (a !== null && typeof a === 'object' ? (a as { url?: unknown }).url : undefined))
      .filter((u): u is string => typeof u === 'string');
    const motivo = motivoDeAtestiguacionesEscasas(urls, MIN_ATESTIGUACIONES_DE_ATRIBUIDA);
    if (motivo !== undefined) contexto.addIssue({ code: 'custom', path: ['atestiguaciones'], message: motivo });
  }
  if (cita.origen === undefined) {
    contexto.addIssue({
      code: 'custom',
      path: ['origen'],
      message: `Regla incumplida: una Cita atribuida declara su «origen»: ${ORIGENES.join(', ')}.`,
    });
  }
  // Historias 35.10 y 35.11 — la traducción del sitio no convive con una letra que circula, y guarda su partida.
  const traduccionPropia = cita.origen === ORIGEN_TRADUCCION_PROPIA;
  if (traduccionPropia && cita.variante !== undefined) {
    contexto.addIssue({
      code: 'custom',
      path: ['variante'],
      message:
        'Regla incumplida: una atribuida con «origen: traduccion-propia» no declara Variante. La traducción ' +
        'del sitio es para la frase de la que no circula ninguna versión en español, y una Variante es una ' +
        'que circula: con ella, el texto es esa versión y su origen, el de ella.',
    });
  }
  if (traduccionPropia && cita.partida === undefined) {
    contexto.addIssue({
      code: 'custom',
      path: ['partida'],
      message:
        'Regla incumplida: una atribuida con «origen: traduccion-propia» declara su «partida» —{texto, lengua}—, ' +
        'la frase que dijo su dueño en su lengua, tal cual la traen sus atestiguaciones: sin ella, la traducción ' +
        'no se puede auditar.',
    });
  }
  if (!traduccionPropia && cita.partida !== undefined) {
    contexto.addIssue({
      code: 'custom',
      path: ['partida'],
      message:
        'Regla incumplida: solo una atribuida con «origen: traduccion-propia» declara «partida»: el ' +
        'texto de las demás es la versión en español que circula, y no se tradujo de nada.',
    });
  }
  if (typeof cita.texto === 'string' && cita.texto.includes('\n')) {
    contexto.addIssue({
      code: 'custom',
      path: ['texto'],
      message:
        'Regla incumplida: una Cita atribuida va en una sola línea, aunque traiga Fuente: el salto ' +
        'de verso es de la Cita cotejada contra su documento.',
    });
  }
  const deLaVariante =
    cita.variante !== null && typeof cita.variante === 'object' ? (cita.variante as { texto?: unknown }).texto : undefined;
  if (typeof deLaVariante === 'string' && /[\n\r\u2028\u2029\u0085\v\f]/u.test(deLaVariante)) {
    contexto.addIssue({
      code: 'custom',
      path: ['variante', 'texto'],
      message: 'Regla incumplida: la Variante de una Cita atribuida va en una sola línea, como su texto.',
    });
  }
  // Una Variante es otra letra de la frase: igual al texto (forma canónica, AD-3) no dice nada.
  if (
    typeof deLaVariante === 'string' &&
    typeof cita.texto === 'string' &&
    normalizar(deLaVariante) === normalizar(cita.texto)
  ) {
    contexto.addIssue({
      code: 'custom',
      path: ['variante', 'texto'],
      message: 'Regla incumplida: la Variante repite el texto de la Cita; una Variante es otra letra de la frase.',
    });
  }
  if (cita.aptaParaPortada === true) {
    contexto.addIssue({
      code: 'custom',
      path: ['aptaParaPortada'],
      message: 'Regla incumplida: una Cita atribuida no es apta para portada (pregunta 22).',
    });
  }
}

/** Las opciones con que se engancha `reglasDeClase`: corre también si otra regla falló. */
export const CUANDO_SIEMPRE = { when: () => true } as const;

/**
 * La Fuente de la que salió una Cita — Historia 11.2.
 *
 * Es lo que ata una Cita a su documento versionado en `corpus/fuentes/`: con el
 * identificador de la Fuente y la obra de su Procedencia se compone el nombre del
 * documento, y el build comprueba que el texto de la Cita aparezca literalmente en su
 * cuerpo. Sin este campo declarado aquí, el dato que escribe la extracción se pierde al
 * publicar —el esquema descarta lo que no reconoce— y esa comprobación no tendría de
 * dónde agarrarse.
 *
 * Aquí solo vive la **forma**. La comprobación lee ficheros, y por AD-5 este módulo es
 * puro y no toca el disco: vive fuera, en `tools/lib/` y en la integración de build que
 * `astro.config.mjs` engancha.
 *
 * `id` y `url` son obligatorios cuando el campo se declara: el identificador es lo que
 * elige el documento, y la dirección es lo que permite volver a la Fuente y comprobarlo
 * a mano. `nombre` y `licencia` son comodidad de lectura —los escribe la extracción
 * desde el conjunto cerrado de `tools/lib/fuentes.ts`, que es su dueño— y por eso no se
 * exigen a quien escriba una Cita a mano.
 */
export const fuenteDeCita = z
  .object(
    {
      id: z
        .string({ message: 'Regla incumplida: la Fuente de la Cita no declara identificador.' })
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          'Regla incumplida: el identificador de la Fuente solo admite minúsculas, ' +
            'dígitos y guiones. Los admitidos están en tools/lib/fuentes.ts.',
        ),
      nombre: z.string().min(1, 'El nombre de la Fuente, si se declara, no puede estar vacío.').optional(),
      licencia: z
        .string()
        .min(1, 'La licencia de la Fuente, si se declara, no puede estar vacía.')
        .optional(),
      url: z
        .string({ message: 'Regla incumplida: la Fuente de la Cita no declara dirección.' })
        .regex(
          /^https?:\/\/\S+$/,
          'Regla incumplida: la dirección de la Fuente debe ser una URL http(s).',
        ),
    },
    {
      /*
       * El mensaje del objeto cubre **todos** sus fallos propios, y con `.strict()` uno
       * de ellos es la clave sobrante. Contestar «es un objeto con identificador y
       * dirección» a un `licencia_` mal tecleado deja al editor releyendo un objeto que
       * ya tiene las dos cosas, sin decirle cuál sobra. Cada caso lleva el suyo.
       */
      error: (problema) =>
        problema.code === 'unrecognized_keys'
          ? 'Regla incumplida: la Fuente de la Cita no reconoce ' +
            `«${problema.keys.join('», «')}». Sus campos son id y url —obligatorios—, y ` +
            'nombre y licencia. Un dato que no sea de esos no se guarda en la Fuente.'
          : 'Regla incumplida: la Fuente de la Cita, si se declara, es un objeto con ' +
            'identificador y dirección.',
    },
  )
  .strict();

export type FuenteDeCita = z.infer<typeof fuenteDeCita>;

/**
 * El artículo contraído va como parámetro porque las entidades del corpus no tienen todas
 * el mismo género: «falta el nombre del Colección» es un mensaje que quien lo lee deja de
 * tomarse en serio, y estos mensajes son la única documentación que ve el editor cuando
 * el build se le rompe. Los tres que salen de aquí —Autor, Tema y Colección— están fijados
 * en `tests/unit/colecciones.test.ts`: sin eso, cambiar el valor por omisión del parámetro
 * produciría «falta el nombre de la Autor» con la suite en verde.
 *
 * `/\S/` y no `.min(1)`: un nombre de un solo espacio tiene longitud uno y pasaría la
 * comprobación de longitud, dejando publicar una entidad con el nombre en blanco. Se mide
 * lo que queda al recortar, pero **no se recorta el valor**: un `.trim()` de zod
 * reescribiría lo que el editor guardó, y NFR-12 prohíbe que el sistema altere contenido
 * publicado sin acción explícita suya. Lo que hay mal escrito se rechaza; no se arregla a
 * sus espaldas.
 */
export const nombre = (entidad: string, articulo = 'del') =>
  z
    .string({ message: `Regla incumplida: falta el nombre ${articulo} ${entidad}.` })
    .regex(
      /\S/,
      `Regla incumplida: el nombre ${articulo} ${entidad} no puede estar vacío ni ser solo espacios.`,
    );

/** AD-1 — sin año de fallecimiento no hay forma de sostener que la obra es de dominio
 * público. Desde la Historia 35.1 el Autor lleva o su año de fallecimiento o `vivo: true`, uno
 * de los dos y nunca los dos (`reglasDeAutor`); sin ninguno, el mensaje es este. */
export const MENSAJE_SIN_FALLECIMIENTO =
  'Regla incumplida: falta el año de fallecimiento del Autor. Es obligatorio porque es ' +
  'lo que sostiene que su obra está en dominio público.';

export const añoFallecimiento = añoEntero(MENSAJE_SIN_FALLECIMIENTO);

/**
 * El Autor vivo — Historia 35.1. Solo admite `true`: un Autor que no está vivo lo dice con su
 * año de fallecimiento, no con `vivo: false`. Sus Citas son atribuidas (`derechosVigentes`).
 */
export const vivo = z.literal(true, {
  message: 'Regla incumplida: «vivo» solo admite true; un Autor fallecido declara su año de fallecimiento.',
});

/**
 * Exactamente uno de `añoFallecimiento` y `vivo: true` — Historia 35.1. Lo comparten
 * `autorAdmisible` y la colección `autores`.
 */
export function reglasDeAutor(valor: unknown, contexto: z.RefinementCtx): void {
  if (valor === null || typeof valor !== 'object') return;
  const autor = valor as Record<string, unknown>;
  const conAño = autor.añoFallecimiento !== undefined;
  // Solo `vivo: true` es vivo: otro valor lo rechaza el literal de `vivo`, sin un segundo error.
  const esVivo = autor.vivo === true;
  if (conAño && esVivo) {
    contexto.addIssue({
      code: 'custom',
      path: ['vivo'],
      message:
        'Regla incumplida: el Autor declara a la vez «vivo: true» y su año de fallecimiento. ' +
        'Lleva uno de los dos: el año si murió, «vivo: true» si vive.',
    });
  } else if (!conAño && !esVivo) {
    contexto.addIssue({ code: 'custom', path: ['añoFallecimiento'], message: MENSAJE_SIN_FALLECIMIENTO });
  }
}

export const semblanza = z
  .string({ message: 'Regla incumplida: falta la semblanza del Autor.' })
  .min(1, 'Regla incumplida: la semblanza del Autor no puede estar vacía.');

/**
 * Esquema de Autor completo, sin piezas de Astro. Lo consumen tanto las colecciones
 * como la herramienta de alta y la de gestión de Autores.
 */
/**
 * Tradición a la que pertenece un Autor — §6.1 del PRD.
 *
 * Es opcional a propósito, y el informe de huecos cuenta aparte los que no la declaran.
 * Obligarla habría tenido dos efectos malos: bloquear el alta de un Autor mientras se
 * decide una etiqueta, y —peor— empujar a rellenarla a ojo para desbloquear, con lo que
 * la proporción que vigila el suelo del 40 % pasaría a medir suposiciones.
 *
 * `otra` no es un cajón de sastre: cubre a quien es anterior a las tradiciones
 * nacionales, como Séneca, y forzarlo a una de las dos falsearía las dos.
 */
export const tradicion = z.enum(['latinoamericana', 'peninsular', 'otra'], {
  message: 'La tradición, si se declara, es latinoamericana, peninsular u otra.',
});

/**
 * La biografía que sostiene a un Autor — Historia 17.1: el documento de `corpus/biografias/`
 * y la revisión de su Fuente mutable.
 *
 * Estricto: una clave de más es casi siempre una errata de una de las dos, y una errata
 * aquí desataría la biografía de su revisión sin que nada lo dijera. Opcional, y sin valor
 * se omite. Que el documento exista y sea **esa** revisión no lo puede ver un esquema, que
 * juzga un fichero a la vez: lo comprueba la puerta del build, enganchada en `astro.config.mjs`.
 * Qué se publica con ella lo decide la Historia 17.2; hoy no cambia ninguna página.
 */
export const biografia = z
  .object(
    {
      documento: z
        .string({ message: 'Regla incumplida: la biografía del Autor no declara su documento.' })
        .regex(
          /^[a-z0-9-]+--[a-z0-9-]+--r[1-9]\d*$/,
          'Regla incumplida: el documento de la biografía es su nombre en corpus/biografias/, ' +
            'sin «.txt»: «{fuente}--{titulo}--r{revision}».',
        ),
      revision: z
        .number({ message: 'Regla incumplida: la biografía del Autor no declara su revisión.' })
        .int('Regla incumplida: la revisión de la biografía es un entero.')
        .positive('Regla incumplida: la revisión de la biografía es un entero positivo.'),
    },
    {
      message:
        'Regla incumplida: la biografía del Autor es un objeto con «documento» y «revision».',
    },
  )
  .strict()
  /*
   * El nombre lleva la revisión dentro, y el campo la vuelve a decir: si no dicen la misma,
   * una de las dos se tecleó mal. Se rechaza aquí, en el fichero, antes de que la puerta del
   * build lo tenga que adivinar contra el documento.
   */
  .superRefine((valor, contexto) => {
    const delNombre = /--r([1-9]\d*)$/.exec(valor.documento)?.[1];
    if (delNombre !== undefined && Number(delNombre) !== valor.revision) {
      contexto.addIssue({
        code: 'custom',
        path: ['revision'],
        message:
          `Regla incumplida: el documento «${valor.documento}» es la revisión ${delNombre} y ` +
          `la biografía declara la ${valor.revision}: tienen que ser la misma.`,
      });
    }
  });

/**
 * La clave de orden del Autor — Historia 26.1, FR-15, AD-1.
 *
 * Es la palabra por la que el Directorio de Autores pone a Cervantes en la C. **Su forma** es
 * puerta del esquema: tiene que dar, con `inicialDeClave` (la hermana de `normalizar`, AD-3),
 * una inicial de la A a la Z o la Ñ, porque el Directorio no reparte letras imposibles. En
 * blanco, con un espacio delante o empezando por cifra o signo, no tiene forma. No se recorta
 * ni se reescribe: lo mal escrito se rechaza, no se arregla a espaldas de nadie (NFR-12).
 *
 * Es opcional aquí porque **su presencia** no es de un fichero sino de la relación con las
 * Citas: solo se exige al Autor publicado, y eso lo comprueba la puerta del build
 * (`integraciones/claves.ts`). La propone `tools/autor.ts` y no se teclea.
 *
 * Lo usan, este mismo y no una copia, `autorAdmisible`, la colección `autores`, la puerta del
 * build y la orden `clave`.
 */
export const REGLA_DE_CLAVE_DE_ORDEN =
  'Regla incumplida: la clave de orden (ordenAlfabetico) tiene que empezar por una letra de ' +
  'la A a la Z o la Ñ; no puede estar en blanco ni empezar por un espacio, una cifra o un signo.';

export const ordenAlfabetico = z
  .string({ message: REGLA_DE_CLAVE_DE_ORDEN })
  .refine((clave) => inicialDeClave(clave) !== undefined, REGLA_DE_CLAVE_DE_ORDEN);

/**
 * La jornada en que una persona confirmó o corrigió la clave de orden — Historia 26.1.
 *
 * Presente solo cuando alguien la revisó, y solo la escribe `npx tsx tools/autor.ts clave`.
 * «Sin revisar» es su ausencia: el build no la lee y nadie consulta git para decirlo. La
 * forma de jornada es la de `esJornada`, la única dueña de qué es una jornada.
 */
export const ordenRevisado = z
  .string({ message: 'Regla incumplida: ordenRevisado es una jornada AAAA-MM-DD.' })
  .refine(esJornada, 'Regla incumplida: ordenRevisado es una jornada AAAA-MM-DD que existe.');

export const autorAdmisible = z.object({
  nombre: nombre('Autor'),
  añoFallecimiento: añoFallecimiento.optional(),
  vivo: vivo.optional(),
  añoNacimiento: año.optional(),
  semblanza,
  tradicion: tradicion.optional(),
  biografia: biografia.optional(),
  ordenAlfabetico: ordenAlfabetico.optional(),
  ordenRevisado: ordenRevisado.optional(),
}).superRefine(reglasDeAutor, CUANDO_SIEMPRE);

export type AutorAdmisible = z.infer<typeof autorAdmisible>;

// ─────────────────────────────────────────────────────────────────────────────
// El Personaje — Historia 35.2, AD-1, AD-33
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lo que dice el esquema ante un año en la ficha de un Personaje — AD-33.
 *
 * Un Personaje no nace ni muere: sus derechos están siempre vigentes (`derechosVigentes`), y
 * un año en su ficha haría creer que hay un plazo que vence. El mensaje lo dice en vez de
 * contestar con la clave sobrante genérica.
 */
export const MENSAJE_AÑOS_DE_PERSONAJE =
  'Regla incumplida: un Personaje no lleva años ni «vivo» (añoNacimiento, añoFallecimiento, ' +
  'vivo): no nace ni muere, y sus derechos están siempre vigentes (AD-33). Quítelos de la ficha.';

const CLAVES_DE_AÑOS = ['añoNacimiento', 'añoFallecimiento', 'vivo'];

/** El universo de un Personaje: una cadena con algo escrito, sin recortarla (NFR-12). */
export const universo = z
  .string({ message: 'Regla incumplida: falta el universo del Personaje, que es obligatorio.' })
  .regex(/\S/, 'Regla incumplida: el universo del Personaje no puede estar vacío ni ser solo espacios.');

/**
 * La semblanza propia de un Personaje — Historia 35.2: un texto escrito para el sitio y quién
 * responde de él, cuando no hay revisión de una Fuente mutable que la sostenga (AD-26). La
 * escribe `npx tsx tools/personaje.ts semblanza`, y sobre el Corpus real solo Héctor.
 */
export const semblanzaPropia = z
  .object(
    {
      texto: z
        .string({ message: 'Regla incumplida: la semblanza propia del Personaje no declara su texto.' })
        .regex(/\S/, 'Regla incumplida: el texto de la semblanza propia no puede estar vacío.'),
      responde: z
        .string({ message: 'Regla incumplida: la semblanza propia del Personaje no dice quién responde de ella.' })
        .regex(/\S/, 'Regla incumplida: quién responde de la semblanza propia no puede estar vacío.'),
    },
    { message: 'Regla incumplida: la semblanza propia es un objeto con «texto» y «responde».' },
  )
  .strict();

/**
 * La semblanza de un Personaje sale por una de dos vías, nunca por las dos: la de AD-26 —
 * `semblanza` cotejada literal contra su `biografia`, las dos juntas— o `semblanzaPropia`. Sin
 * ninguna, la ficha no lleva semblanza.
 */
export function reglasDePersonaje(valor: unknown, contexto: z.RefinementCtx): void {
  if (valor === null || typeof valor !== 'object') return;
  const p = valor as Record<string, unknown>;
  const conSemblanza = p.semblanza !== undefined;
  const conBiografia = p.biografia !== undefined;
  if (conSemblanza !== conBiografia) {
    contexto.addIssue({
      code: 'custom',
      path: [conSemblanza ? 'biografia' : 'semblanza'],
      message:
        'Regla incumplida: la semblanza de un Personaje por AD-26 va con su biografía, las dos ' +
        'juntas: la semblanza se coteja literal contra esa revisión. Sin biografía, use la ' +
        'semblanza propia (npx tsx tools/personaje.ts semblanza).',
    });
  }
  if (p.semblanzaPropia !== undefined && (conSemblanza || conBiografia)) {
    contexto.addIssue({
      code: 'custom',
      path: ['semblanzaPropia'],
      message:
        'Regla incumplida: un Personaje lleva la semblanza de su biografía o la semblanza propia, ' +
        'nunca las dos.',
    });
  }
}

export const personajeAdmisible = z
  .object(
    {
      nombre: nombre('Personaje'),
      universo,
      semblanza: z
        .string({ message: 'Regla incumplida: la semblanza del Personaje es una cadena.' })
        .min(1, 'Regla incumplida: la semblanza del Personaje no puede estar vacía.')
        .optional(),
      biografia: biografia.optional(),
      semblanzaPropia: semblanzaPropia.optional(),
      ordenAlfabetico: ordenAlfabetico.optional(),
      ordenRevisado: ordenRevisado.optional(),
    },
    {
      error: (problema) =>
        problema.code === 'unrecognized_keys'
          ? problema.keys.some((k) => CLAVES_DE_AÑOS.includes(k))
            ? MENSAJE_AÑOS_DE_PERSONAJE
            : 'Regla incumplida: el Personaje no reconoce ' +
              `«${problema.keys.join('», «')}». Sus campos son nombre, universo, semblanza, ` +
              'biografia, semblanzaPropia, ordenAlfabetico y ordenRevisado.'
          : 'Regla incumplida: un Personaje es un objeto con nombre y universo.',
    },
  )
  .strict()
  .superRefine(reglasDePersonaje, CUANDO_SIEMPRE);

export type PersonajeAdmisible = z.infer<typeof personajeAdmisible>;

/**
 * Esquema de Cita **sin las referencias**, que son cosa de Astro. La herramienta valida
 * autor y temas contra el corpus por su cuenta; el build lo hace con `reference()`.
 */
export const citaAdmisible = z.object({
  texto,
  // Historia 35.2 — opcional: el dueño es el Autor o, sin él, el Personaje (`reglasDeClase`).
  autor: z.string({ message: 'Regla incumplida: el Autor de la Cita es un slug.' }).min(1).optional(),
  temas: z.array(z.string()).default([]),
  slug,
  procedencia,
  // Historia 35.1 — obligatorio en la de siempre y prohibido en la atribuida (`reglasDeClase`).
  estadoDerechos: estadoDerechos.optional(),
  clase: clase.optional(),
  personaje: personaje.optional(),
  // Historia 35.1b — solo de la atribuida, y en ella obligatorios (`reglasDeClase`).
  atestiguaciones: atestiguaciones.optional(),
  origen: origen.optional(),
  // Historia 35.6 — solo de la atribuida, una como mucho (`reglasDeClase`).
  variante: variante.optional(),
  // Historia 35.11 — solo con `origen: traduccion-propia`, y en ella obligatoria (`reglasDeClase`).
  partida: partida.optional(),
  aptaParaPortada: z.boolean().default(false),
  /*
   * Opcional, y lo será mientras quede censo. Las 38 Citas anteriores a la v3 no tienen
   * documento —se lo da la Historia 11.4— y viven en un censo cerrado, versionado en
   * `corpus/`, que solo mengua. Para cualquier Cita que no esté en él, la puerta del
   * build exige este campo y rompe la construcción si falta: la opcionalidad es del
   * esquema, no de la puerta.
   */
  fuente: fuenteDeCita.optional(),
}).superRefine(reglasDeClase, CUANDO_SIEMPRE);

export type CitaAdmisible = z.infer<typeof citaAdmisible>;

/**
 * Grado de documentación de una Procedencia. La Historia 1.8 audita el porcentaje de
 * Citas publicadas con procedencia **completa**, y su informe distingue parcial de
 * ausente, así que la clasificación necesita nombre propio y un solo dueño.
 *
 * Completa es obra **y** año: saber de qué obra sale una Cita sin saber de cuándo deja
 * la atribución a medio verificar.
 */
export type GradoDeProcedencia = 'completa' | 'parcial' | 'ausente';

export function gradoDeProcedencia(p: Procedencia | null | undefined): GradoDeProcedencia {
  if (!p) return 'ausente';
  if (p.obra !== undefined && p.año !== undefined) return 'completa';
  if (p.obra !== undefined || p.año !== undefined || p.referencia !== undefined) return 'parcial';
  return 'ausente';
}

// ─────────────────────────────────────────────────────────────────────────────
// La Colección — Historia 12.2
// ─────────────────────────────────────────────────────────────────────────────

/**
 * El criterio editorial por el que una Colección está reunida — AD-18.
 *
 * Es obligatorio y no puede estar vacío, y no es un adorno: una Colección **es** su
 * criterio. Sin él queda una lista de Citas sin razón de estar juntas, que es justamente
 * la vía barata de fabricar páginas indexables que la contra-métrica de densidad vigila.
 * Que el esquema lo exija hace que escribir la razón sea parte de crear la Colección y no
 * un paso posterior que nadie da.
 */
export const criterioDeColeccion = z
  .string({ message: 'Regla incumplida: falta el criterio de la Colección, que es obligatorio.' })
  // Se mide lo que queda al recortar, y por el mismo motivo que en `nombre`: con `.min(1)`
  // un criterio de un solo espacio pasaba, y una Colección sin razón escrita es justo lo
  // que este campo existe para impedir.
  .regex(
    /\S/,
    'Regla incumplida: el criterio de la Colección no puede estar vacío ni ser solo espacios.',
  )
  /*
   * Y un techo, que es lo que faltaba — Historia 12.3.
   *
   * La Página de Colección emite el criterio **literal** como su descripción, y NFR-12
   * prohíbe que el sistema lo recorte por su cuenta. Sin límite, un criterio largo se
   * publicaba entero en la página y cortado en los resultados de búsqueda, sin que nadie
   * lo dijera. El límite va aquí, en la puerta, donde el editor lo está escribiendo y
   * puede arreglarlo; ponerlo en la página sería reescribir lo que guardó.
   *
   * Se mide sobre el original y no sobre el recortado: lo que va a la descripción es el
   * valor tal cual, espacios incluidos.
   */
  .max(
    MAX_CARACTERES_CRITERIO,
    `Regla incumplida: el criterio de la Colección no puede pasar de ${MAX_CARACTERES_CRITERIO} ` +
      'caracteres, porque se publica literal como descripción de la página. Resúmalo.',
  );

/**
 * Un miembro declarado: el slug de una Cita, y **nada más fuerte que eso**.
 *
 * El mensaje es propio y no el de `slug` a secas porque quien lo lee no está escribiendo
 * el slug de la Colección sino una entrada de su lista, y «falta el slug, que es inmutable
 * y obligatorio» le manda a mirar el campo equivocado.
 */
export const miembroDeColeccion = z
  .string({ message: 'Regla incumplida: cada miembro de una Colección es el slug de una Cita.' })
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Regla incumplida: un miembro de una Colección es el slug de una Cita: minúsculas, ' +
      'dígitos y guiones, sin diacríticos.',
  );

/**
 * La lista de miembros declarada.
 *
 * **Por omisión, lista vacía.** Una Colección recién creada todavía no tiene miembros, y
 * exigirlos obligaría a inventarse tres slugs para poder guardar el criterio. Vacía
 * resuelve a cero y no se publica, que es exactamente lo que debe pasar. Ese camino se
 * recorre en las pruebas de build con un fichero que **omite** la clave, y no solo con
 * fixtures que la escriben: si no, quitar el `.default([])` no rompería nada.
 *
 * El mensaje propio existe porque `.default()` **solo** actúa sobre `undefined`, y
 * `miembros:` con nada debajo es `null` en YAML —la forma natural en que un editor escribe
 * «esto todavía no lo tengo»—. Sin él, quien escribiera eso recibía «Invalid input:
 * expected array, received null»: un error de tipo en inglés en lugar de la regla
 * incumplida, que es el mismo defecto que `procedencia` ya tiene cerrado con su
 * preproceso. Aquí no se preprocesa a lista vacía a propósito: la convención del corpus es
 * que un campo sin valor **se omite del fichero**, nunca se escribe vacío ni como `null`,
 * y tragarse el `null` enseñaría a escribirlo.
 *
 * El error del array no tapa el de sus elementos: un slug mal escrito sigue contestando
 * con su propia regla.
 */
export const miembrosDeColeccion = z
  .array(miembroDeColeccion, {
    error:
      'Regla incumplida: «miembros» es una lista de slugs de Cita. Si la Colección ' +
      'todavía no tiene ninguno, omita el campo entero: un campo sin valor no se escribe ' +
      'vacío ni como null.',
  })
  .default([]);

/**
 * La forma del fichero de Colección — AD-18, Historia 12.2.
 *
 * **La pertenencia se declara aquí y no en la Cita**, invirtiendo a propósito la dirección
 * del Tema. Un Tema es una propiedad de la Cita —de qué habla— y por eso vive en ella. Una
 * Colección es una decisión editorial *sobre un conjunto*, y puede cambiar sin que ninguna
 * Cita cambie: declararla en la Cita obligaría a editar decenas de ficheros para crear una
 * agrupación y a editarlos otra vez para deshacerla.
 *
 * **`miembros` es una lista de slugs y jamás una referencia de esquema.** Es la decisión
 * central de la historia y conviene que cueste deshacerla: si aquí pusiera
 * `reference('citas')`, Astro exigiría que cada slug existiera y mover una Cita a
 * `corpus/_revision/` **rompería el build**. Despublicar seguiría siendo mover un fichero,
 * pero mover un fichero dejaría de ser seguro, y una agrupación que se rompe cuando una
 * Cita se retira a revisión es una agrupación que nadie se atreve a curar. La pertenencia
 * se resuelve intersectando esta lista con el conjunto publicable, en
 * `src/lib/publicado.ts`, que es quien sabe qué está publicado.
 *
 * Lo que la blandura **no** debe tapar es una errata: un slug mal escrito desaparecería en
 * silencio igual que un miembro retirado. Por eso el desajuste entre declarado y resuelto
 * se cuenta y se anuncia (ver `desajustesDeColecciones`), y la herramienta de curación de
 * la Historia 12.4 es la que caza la errata en el momento de escribirla. Romper el build
 * no vale: sería reintroducir la referencia dura por la puerta de atrás.
 *
 * AD-5 — aquí solo vive la **forma**. Resolver la pertenencia necesita saber qué Citas
 * están publicadas, y de eso se ocupa el dueño del conjunto publicable.
 */
export const coleccionAdmisible = z
  .object(
    {
      nombre: nombre('Colección', 'de la'),
      criterio: criterioDeColeccion,
      miembros: miembrosDeColeccion,
    },
    {
      error: (problema) =>
        problema.code === 'unrecognized_keys'
          ? 'Regla incumplida: la Colección no reconoce ' +
            `«${problema.keys.join('», «')}». Sus campos son nombre, criterio y miembros.`
          : 'Regla incumplida: una Colección es un objeto con nombre, criterio y miembros.',
    },
  )
  /*
   * `.strict()`, a diferencia de los esquemas de Tema y de Autor, y por un motivo que solo
   * aparece aquí: `miembros` tiene valor por omisión, así que un `miembos:` mal tecleado
   * no faltaría —se descartaría— y la Colección quedaría con cero miembros declarados. Sin
   * esto sería el único fallo del corpus que no rompe nada ni se cuenta en ningún sitio: el
   * recuento de desajustes tampoco lo vería, porque declarado y resuelto valdrían cero los
   * dos. La lista de miembros es blanda a propósito; el nombre del campo que la contiene,
   * no.
   */
  .strict();

export type ColeccionAdmisible = z.infer<typeof coleccionAdmisible>;

// ─────────────────────────────────────────────────────────────────────────────
// La Ficha de Obra — Historia 22.1, AD-25
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Una forma canónica de obra: la cadena tal como la deja `normalizar` (AD-3).
 *
 * Se exige que **ya** sea canónica en vez de canonizarla al leer: la identidad de una Obra
 * es el par (Autor, forma), y una forma escrita con tildes o mayúsculas sería una forma
 * que ninguna Cita resuelve, aunque lo parezca a la vista.
 */
export const formaDeObraAdmisible = z
  .string({ message: 'Regla incumplida: cada forma de una Ficha de Obra es una cadena.' })
  .refine((forma) => forma !== '' && normalizar(forma) === forma, {
    message:
      'Regla incumplida: una forma de Ficha de Obra se escribe en forma canónica —minúsculas, ' +
      'sin diacríticos ni puntuación y con los espacios colapsados—, que es como la compara ' +
      'el build con la obra de cada Procedencia (AD-3).',
  });

/**
 * La forma del fichero de una Ficha de Obra — Historia 22.1, AD-25.
 *
 * La ficha ancla la identidad y la URL futura de una Obra: `autor` y `formas` son la
 * identidad, `titulo` es presentación. **Estricto y sin valores por omisión**: una ficha que
 * reclama formas por omisión reclamaría Citas que nadie decidió reunir, y un campo mal
 * tecleado se descartaría en silencio.
 *
 * `distintaDe` (Historia 22.2) es opcional: la lista de formas canónicas de **otras** Obras del
 * mismo Autor de las que esta se declara distinta, y silencia el aviso de prefijo. Sin valor
 * se omite; nunca lista vacía. Lo escribe `npm run obra -- separar`, nunca una persona.
 *
 * `nota` (Historia 22.6) es opcional: una frase de 1 a `MAX_CARACTERES_NOTA_DE_OBRA`
 * caracteres, medidos tras recortar, que la Página de Obra pinta al pie (UX-DR44). La escribe
 * Héctor a mano y es el único campo de la ficha que se edita a mano: ninguna orden la rellena,
 * y las que reescriben una ficha la conservan tal cual. Sin valor se omite.
 *
 * `ediciones` (Historia 22.9) es opcional: la lista de ediciones en venta que Héctor declara
 * con `npm run obra -- edicion`, en el orden en que la Página de Obra las pinta. Cada una es de
 * una tienda del conjunto cerrado `TIENDAS` de `src/lib/ingreso.ts`, con una dirección
 * `https://` de su dominio y **sin** la marca de afiliado, que la pone el build. Rige con la
 * afiliación encendida o apagada: con el conjunto vacío —el estado del repositorio— ninguna
 * ficha puede declarar ediciones.
 *
 * La comparten la colección de `src/content.config.ts` y todo lector de `tools/`, que la
 * aplica en vez de leer YAML crudo (AD-17: una sola entrada). `esquemaDeObra` existe para las
 * pruebas y para la orden que valida contra un conjunto de tiendas dado; el sitio usa
 * `obraAdmisible`, que es el esquema con las tiendas declaradas.
 */
export function esquemaDeObra(tiendas: readonly Tienda[] = TIENDAS) {
  return z
    .object(
      {
        /*
         * Historia 35.2 — la ficha tiene un solo dueño: su Personaje si lo declara y, si no, su
         * Autor (`dueñoDeFicha`). En la de un Personaje, `autor` es informativo —el Autor de la
         * Obra, si se sabe— y no cambia el dueño ni el nombre. `reglasDeDueñoDeObra` lo juzga.
         */
        autor: slugDeFicha('el Autor', 'Autor').optional(),
        personaje: slugDeFicha('el Personaje', 'Personaje').optional(),
        personajes: z
          .array(slugDeFicha('cada Personaje', 'Personaje'), {
            error: 'Regla incumplida: «personajes» es la lista de slugs de los Personajes de la Obra.',
          })
          .min(1, 'Regla incumplida: «personajes» lleva al menos el Personaje dueño de la ficha.')
          .refine((lista) => new Set(lista).size === lista.length, {
            message: 'Regla incumplida: «personajes» no repite ningún Personaje.',
          })
          .optional(),
        titulo: z
          .string({ message: 'Regla incumplida: falta el título de la Ficha de Obra.' })
          .regex(
            /\S/,
            'Regla incumplida: el título de una Ficha de Obra no puede estar vacío ni ser solo ' +
              'espacios.',
          ),
        formas: z
          .array(formaDeObraAdmisible, {
            error: 'Regla incumplida: «formas» es la lista de formas canónicas que reclama la ficha.',
          })
          .min(1, 'Regla incumplida: una Ficha de Obra reclama al menos una forma.')
          .refine((formas) => new Set(formas).size === formas.length, {
            message: 'Regla incumplida: una Ficha de Obra no repite ninguna forma.',
          }),
        distintaDe: z
          .array(formaDeObraAdmisible, {
            error:
              'Regla incumplida: «distintaDe» es la lista de formas canónicas de las Obras de ' +
              'las que esta se declara distinta.',
          })
          .min(
            1,
            'Regla incumplida: «distintaDe» sin ninguna forma se omite; no se escribe vacío.',
          )
          .refine((formas) => new Set(formas).size === formas.length, {
            message: 'Regla incumplida: «distintaDe» no repite ninguna forma.',
          })
          .optional(),
        /*
         * Se mide lo que queda al recortar, en puntos de código —no en unidades UTF-16, que
         * contarían doble un carácter fuera del plano básico—, pero **no se recorta el valor**:
         * NFR-12 prohíbe que el sistema altere lo que el editor guardó. Lo que hay mal escrito se
         * rechaza.
         */
        nota: z
          .string({ message: 'Regla incumplida: la nota de una Ficha de Obra es una cadena.' })
          .refine((nota) => !/[\p{Cc}\p{Zl}\p{Zp}]/u.test(nota), {
            message:
              'Regla incumplida: la nota de una Ficha de Obra es una sola línea: sin saltos de ' +
              'línea, tabuladores ni caracteres de control.',
          })
          .refine((nota) => nota.trim().length >= 1, {
            message:
              'Regla incumplida: la nota de una Ficha de Obra no puede estar vacía ni ser solo ' +
              'espacios. Sin nota, el campo se omite.',
          })
          .refine((nota) => [...nota.trim()].length <= MAX_CARACTERES_NOTA_DE_OBRA, {
            message:
              'Regla incumplida: la nota de una Ficha de Obra no puede pasar de ' +
              `${MAX_CARACTERES_NOTA_DE_OBRA} caracteres. Es una frase, no una sinopsis.`,
          })
          .optional(),
        ediciones: z
          .array(edicionAdmisible(tiendas), {
            error: 'Regla incumplida: «ediciones» es la lista de ediciones en venta de la Obra.',
          })
          .min(1, 'Regla incumplida: «ediciones» sin ninguna edición se omite; no se escribe vacía.')
          .optional(),
        /*
         * Historia 32.1 (AD-31): la entidad de Wikidata y la revisión fija de la que salen el
         * género, la lengua y el año de la Ficha técnica. Solo la escribe `npm run obra --
         * wikidata`, que coteja el Autor; el build lo repite desde el cargador de
         * `src/content.config.ts`. Aquí solo se juzga la forma.
         */
        wikidata: z
          .object(
            {
              entidad: z
                .string({ message: 'Regla incumplida: la entidad de Wikidata es una cadena «Q…».' })
                .regex(
                  /^Q[1-9]\d*$/u,
                  'Regla incumplida: la entidad de Wikidata de una Ficha de Obra es «Q» seguida ' +
                    'de su número, sin ceros a la izquierda.',
                ),
              revision: z
                .number({ message: 'Regla incumplida: la revisión de Wikidata es un número.' })
                .int('Regla incumplida: la revisión de Wikidata es un entero.')
                .positive('Regla incumplida: la revisión de Wikidata es un entero positivo.'),
            },
            {
              error: (problema) =>
                problema.code === 'unrecognized_keys'
                  ? 'Regla incumplida: «wikidata» no reconoce ' +
                    `«${problema.keys.join('», «')}». Sus campos son entidad y revision.`
                  : 'Regla incumplida: «wikidata» es un objeto con entidad y revision.',
            },
          )
          .strict()
          .optional(),
        /*
         * Historia 32.3 (AD-30): el incipit, el comienzo de la Obra que declara una persona —un
         * documento de `corpus/fuentes/` y el texto desde el que empieza—. Solo lo escribe
         * `npm run obra -- incipit`, que comprueba el casado, la forma y que `desde` se localice;
         * el build repite la forma y la localización desde el cargador `incipits`. Aquí solo se
         * juzga la forma del campo.
         */
        incipit: z
          .object(
            {
              documento: z
                .string({ message: 'Regla incumplida: el documento del incipit es una cadena.' })
                // El nombre de un documento de `corpus/fuentes/` tiene forma de slug: sin carpeta, sin
                // extensión, sin espacios ni `..` ni barras de ningún tipo.
                .refine((documento) => /^[a-z0-9][a-z0-9-]*$/u.test(documento), {
                  message:
                    'Regla incumplida: el documento del incipit es el nombre de un documento de ' +
                    'corpus/fuentes/ sin carpeta ni extensión (minúsculas, cifras y guiones).',
                }),
              desde: z
                .string({ message: 'Regla incumplida: el «desde» del incipit es una cadena.' })
                .refine((desde) => !/[\p{Cc}\p{Zl}\p{Zp}]/u.test(desde), {
                  message:
                    'Regla incumplida: el «desde» del incipit es una sola línea: sin saltos de ' +
                    'línea, tabuladores ni caracteres de control.',
                })
                .refine((desde) => /\S/u.test(desde), {
                  message: 'Regla incumplida: el «desde» del incipit no puede estar vacío ni ser solo espacios.',
                }),
            },
            {
              error: (problema) =>
                problema.code === 'unrecognized_keys'
                  ? 'Regla incumplida: «incipit» no reconoce ' +
                    `«${problema.keys.join('», «')}». Sus campos son documento y desde.`
                  : 'Regla incumplida: «incipit» es un objeto con documento y desde.',
            },
          )
          .strict()
          .optional(),
      },
      {
        error: (problema) =>
          problema.code === 'unrecognized_keys'
            ? 'Regla incumplida: la Ficha de Obra no reconoce ' +
            `«${problema.keys.join('», «')}». Sus campos son autor, personaje, personajes, ` +
              'titulo, formas, distintaDe, nota, ediciones, wikidata e incipit.'
            : 'Regla incumplida: una Ficha de Obra es un objeto con su dueño (autor, o personaje y ' +
              'personajes), titulo y formas, y opcionalmente distintaDe, nota, ediciones, wikidata e ' +
              'incipit.',
      },
    )
    .strict()
    .refine(
      (ficha) => !(ficha.distintaDe ?? []).some((forma) => ficha.formas.includes(forma)),
      {
        message:
          'Regla incumplida: una Ficha de Obra no se declara distinta de una forma que ella ' +
          'misma reclama.',
        path: ['distintaDe'],
      },
    )
    .superRefine(reglasDeDueñoDeObra, CUANDO_SIEMPRE);
}

/** El slug de un Autor o de un Personaje dentro de una Ficha de Obra, con su mensaje. */
function slugDeFicha(quien: string, entidad: string) {
  return z
    .string({ message: `Regla incumplida: ${quien} de una Ficha de Obra es un slug.` })
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      `Regla incumplida: ${quien} de una Ficha de Obra es el slug de un ${entidad}: ` +
        'minúsculas, dígitos y guiones, sin diacríticos.',
    );
}

/**
 * El dueño de una Ficha de Obra — Historia 35.2, AD-25 v9.1.
 *
 *   · la de un Autor declara `autor` y no lleva `personaje` ni `personajes`;
 *   · la de un Personaje declara `personaje` y `personajes`, una lista que **incluye** al dueño,
 *     y `autor` solo si se sabe (informativo).
 *
 * Corre aunque falle otra regla (`when`), así que no supone la forma de los valores.
 */
export function reglasDeDueñoDeObra(valor: unknown, contexto: z.RefinementCtx): void {
  if (valor === null || typeof valor !== 'object') return;
  const ficha = valor as Record<string, unknown>;
  if (ficha.personaje === undefined) {
    if (ficha.autor === undefined) {
      contexto.addIssue({
        code: 'custom',
        path: ['autor'],
        message:
          'Regla incumplida: falta el Autor de la Ficha de Obra. Una ficha declara su dueño: su ' +
          'Autor o, si es la Obra de un Personaje, «personaje» y «personajes».',
      });
    }
    if (ficha.personajes !== undefined) {
      contexto.addIssue({
        code: 'custom',
        path: ['personajes'],
        message:
          'Regla incumplida: la ficha de un Autor no lleva «personajes»: solo la de un Personaje, ' +
          'que declara además «personaje», su dueño.',
      });
    }
    return;
  }
  if (!Array.isArray(ficha.personajes)) {
    if (ficha.personajes === undefined) {
      contexto.addIssue({
        code: 'custom',
        path: ['personajes'],
        message:
          'Regla incumplida: la ficha de un Personaje declara «personajes», la lista de los ' +
          'Personajes de la Obra, que incluye al dueño.',
      });
    }
    return;
  }
  if (!ficha.personajes.includes(ficha.personaje)) {
    contexto.addIssue({
      code: 'custom',
      path: ['personajes'],
      message:
        `Regla incumplida: «personajes» no incluye a «${String(ficha.personaje)}», el Personaje ` +
        'dueño de la ficha.',
    });
  }
}

/**
 * Una edición en venta de una Ficha de Obra — Historia 22.9, AD-1, AD-20.
 *
 * Lo que impide cada regla:
 *
 *   · `tienda` del conjunto: una tienda inventada no tendría marca ni nombre que pintar;
 *   · dirección `https://` del dominio de **esa** tienda (o un subdominio): una edición de
 *     Amazon México que apunta a otro sitio llevaría la marca de una cuenta a una tienda que
 *     no la paga, y una dirección en claro no se publica;
 *   · sin el parámetro de marca: la marca la pone el build desde `TIENDAS`, y una dirección que
 *     ya la trae colaría la de otro —o duplicaría la propia—;
 *   · descripción de una línea, como la nota: va en la misma línea que el enlace.
 */
function edicionAdmisible(tiendas: readonly Tienda[]) {
  const claves = tiendas.map((t) => `«${t.clave}»`).join(', ');
  return z
    .object(
      {
        tienda: z
          .string({ message: 'Regla incumplida: falta la tienda de la edición en venta.' })
          .refine((clave) => tiendaDe(clave, tiendas) !== undefined, {
            message:
              'Regla incumplida: la tienda de una edición en venta es una de las que declara ' +
              'TIENDAS en src/lib/ingreso.ts' +
              (tiendas.length === 0 ? ', y hoy no declara ninguna.' : `: ${claves}.`),
          }),
        formato: z.enum(FORMATOS_DE_EDICION, {
          error: 'Regla incumplida: el formato de una edición en venta es «impresa» o «electronica».',
        }),
        url: z.string({ message: 'Regla incumplida: falta la dirección de la edición en venta.' }),
        descripcion: unaLinea('la descripción de una edición en venta').optional(),
      },
      {
        error: (problema) =>
          problema.code === 'unrecognized_keys'
            ? 'Regla incumplida: una edición en venta no reconoce ' +
              `«${problema.keys.join('», «')}». Sus campos son tienda, formato, url y descripcion.`
            : 'Regla incumplida: una edición en venta es un objeto con tienda, formato y url, y ' +
              'opcionalmente descripcion.',
      },
    )
    .strict()
    .superRefine((edicion, ctx) => {
      let url: URL;
      try {
        url = new URL(edicion.url);
      } catch {
        ctx.addIssue({
          code: 'custom',
          path: ['url'],
          message: `Regla incumplida: «${edicion.url}» no es una dirección completa.`,
        });
        return;
      }
      if (url.protocol !== 'https:' || /\s/.test(edicion.url) || url.username !== '' || url.password !== '') {
        ctx.addIssue({
          code: 'custom',
          path: ['url'],
          message:
            `Regla incumplida: «${edicion.url}» no es una dirección «https://» sin espacios ni ` +
            'credenciales. Un enlace de compra no se publica en claro.',
        });
        return;
      }
      const tienda = tiendaDe(edicion.tienda, tiendas);
      // Sin tienda ya hay un incumplimiento que lo dice; el dominio no se puede juzgar.
      if (tienda === undefined) return;
      if (!esDelDominio(url.hostname, tienda.dominio)) {
        ctx.addIssue({
          code: 'custom',
          path: ['url'],
          message:
            `Regla incumplida: «${edicion.url}» no es de ${tienda.dominio}, el dominio de ` +
            `«${tienda.clave}». Una edición en venta solo apunta a la tienda que declara.`,
        });
      }
      // Mirado en lo tecleado: `URL` borra el `:443` por omisión y lo daría por bueno.
      if (url.port !== '' || /^[a-z]+:\/\/[^/?#]*:/iu.test(edicion.url)) {
        ctx.addIssue({
          code: 'custom',
          path: ['url'],
          message:
            `Regla incumplida: «${edicion.url}» lleva un puerto explícito. Una edición en venta ` +
            'apunta a la tienda tal cual se publica, sin puerto.',
        });
      }
      // El nombre del parámetro sin distinguir mayúsculas: `?TAG=` también es la marca de otro.
      const parametro = tienda.parametro.toLowerCase();
      if ([...url.searchParams.keys()].some((clave) => clave.toLowerCase() === parametro)) {
        ctx.addIssue({
          code: 'custom',
          path: ['url'],
          message:
            `Regla incumplida: «${edicion.url}» ya trae el parámetro «${tienda.parametro}» de la ` +
            'marca de afiliado. La ficha declara la dirección sin marca: la pone el build desde ' +
            'TIENDAS de src/lib/ingreso.ts.',
        });
      }
    });
}

/**
 * Una cadena de una sola línea, de 1 a `MAX_CARACTERES_NOTA_DE_OBRA` puntos de código tras
 * recortar: la nota de la ficha y la descripción de una edición. Se mide lo recortado pero
 * **no se recorta el valor** (NFR-12).
 */
function unaLinea(que: string) {
  const Que = que.charAt(0).toUpperCase() + que.slice(1);
  return z
    .string({ message: `Regla incumplida: ${que} es una cadena.` })
    .refine((texto) => !/[\p{Cc}\p{Zl}\p{Zp}]/u.test(texto), {
      message:
        `Regla incumplida: ${que} es una sola línea: sin saltos de línea, tabuladores ni ` +
        'caracteres de control.',
    })
    .refine((texto) => texto.trim().length >= 1, {
      message: `Regla incumplida: ${que} no puede estar vacía ni ser solo espacios. Sin ella, el campo se omite.`,
    })
    .refine((texto) => [...texto.trim()].length <= MAX_CARACTERES_NOTA_DE_OBRA, {
      message: `Regla incumplida: ${Que} no puede pasar de ${MAX_CARACTERES_NOTA_DE_OBRA} caracteres.`,
    });
}

/** El esquema de la Ficha de Obra con las tiendas declaradas: el que usa el sitio. */
export const obraAdmisible = esquemaDeObra();

export type ObraAdmisible = z.infer<typeof obraAdmisible>;
/** Una edición en venta ya admitida. */
export type EdicionAdmisible = NonNullable<ObraAdmisible['ediciones']>[number];
