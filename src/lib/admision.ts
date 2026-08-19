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

export const texto = z
  .string({ message: 'Regla incumplida: falta el texto de la Cita.' })
  .min(1, 'Regla incumplida: el texto de la Cita no puede estar vacío.');

/** AD-1 — el único estado de derechos admisible. Cualquier otro rompe el build. */
export const estadoDerechos = z.literal('dominio-público', {
  message:
    'Regla incumplida: estadoDerechos solo admite «dominio-público». Una Cita con ' +
    'cualquier otro estado no puede publicarse.',
});

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
 * público. Es obligatorio y su ausencia rompe el build (FR-13, FR-15). */
export const añoFallecimiento = añoEntero(
  'Regla incumplida: falta el año de fallecimiento del Autor. Es obligatorio porque es ' +
    'lo que sostiene que su obra está en dominio público.',
);

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

export const autorAdmisible = z.object({
  nombre: nombre('Autor'),
  añoFallecimiento,
  añoNacimiento: año.optional(),
  semblanza,
  tradicion: tradicion.optional(),
});

export type AutorAdmisible = z.infer<typeof autorAdmisible>;

/**
 * Esquema de Cita **sin las referencias**, que son cosa de Astro. La herramienta valida
 * autor y temas contra el corpus por su cuenta; el build lo hace con `reference()`.
 */
export const citaAdmisible = z.object({
  texto,
  autor: z.string({ message: 'Regla incumplida: falta el Autor de la Cita.' }).min(1),
  temas: z.array(z.string()).default([]),
  slug,
  procedencia,
  estadoDerechos,
  aptaParaPortada: z.boolean().default(false),
  /*
   * Opcional, y lo será mientras quede censo. Las 38 Citas anteriores a la v3 no tienen
   * documento —se lo da la Historia 11.4— y viven en un censo cerrado, versionado en
   * `corpus/`, que solo mengua. Para cualquier Cita que no esté en él, la puerta del
   * build exige este campo y rompe la construcción si falta: la opcionalidad es del
   * esquema, no de la puerta.
   */
  fuente: fuenteDeCita.optional(),
});

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
