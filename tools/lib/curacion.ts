/**
 * Curar una Colección — Historia 12.4.
 *
 * Es la historia que enciende la Épica 12: la 12.2 dejó el modelo y la 12.3 la página,
 * pero crear una Colección seguía exigiendo escribir YAML a mano y contar de cabeza
 * cuántas Citas faltaban para que se publicara.
 *
 * **Comodidad, y no puerta.** La distinción es la misma que la Historia 11.1 hizo con el
 * sembrado: esto evita el error honesto —una errata en el slug de un miembro, una Cita que
 * todavía está en revisión, una Colección repetida— y la puerta sigue siendo el esquema de
 * `src/lib/admision.ts` cableado en `src/content.config.ts`, más la puerta de forma del
 * conjunto de `tools/lib/colecciones.ts`. Quien edite el fichero con su editor de texto se
 * topa con las mismas reglas y el build se le rompe igual.
 *
 * De ahí la regla que gobierna este módulo: **ninguna regla se escribe aquí dos veces**.
 * El criterio y el nombre los juzga `coleccionAdmisible`; el umbral vive en
 * `src/lib/umbrales.ts` y quien lo aplica es `resolverColeccion` más `huecoDeColeccion`; el
 * slug sale del ayudante compartido. Lo que este módulo añade sobre escribir el fichero a
 * mano es lo único que ningún esquema puede ver, porque no es de un fichero sino de la
 * relación entre varios: si el slug que se asigna es una Cita, y si esa Cita está
 * **publicada**.
 *
 * AD-22 — aquí no entra la red: esto lee y escribe ficheros del corpus, y nada más.
 */

import { join } from 'node:path';
import { coleccionAdmisible } from '../../src/lib/admision.ts';
import { lineaDeHueco, porcentajeEnEspañol } from '../../src/lib/formato.ts';
import {
  huecoDeColeccion,
  type ColeccionParaHuecos,
  type HuecoDeColeccion,
} from '../../src/lib/huecos.ts';
import { resolverColeccion, type Cita } from '../../src/lib/publicado.ts';
import { slugDeNombreDeColeccion } from '../../src/lib/slug.ts';
import { MIN_CITAS_POR_COLECCION } from '../../src/lib/umbrales.ts';
import {
  escribirColeccion,
  leerCitas,
  leerColeccionBruta,
  leerColecciones,
  mover,
  type ColeccionEnCorpus,
  type Rutas,
} from './corpus.ts';
import type { Resultado } from './gestion.ts';

export interface DatosDeColeccion {
  nombre?: string;
  criterio?: string;
}

/**
 * Lo que la Colección declara, con la forma que exige el build, o los motivos por los que
 * no se puede trabajar con ella.
 *
 * Se pregunta al esquema en vez de comprobar `nombre !== undefined` a mano, y por el mismo
 * motivo que `crearTema` pregunta por el nombre en vez de copiar el mensaje: dos copias de
 * una regla divergen, y entonces la herramienta y el build dicen cosas distintas sobre el
 * mismo fichero.
 *
 * Que una Colección a medio escribir se rechace **antes** de tocarla es deliberado. El
 * fichero se vuelca entero al escribirlo, así que asignarle un miembro a una Colección sin
 * criterio lo dejaría igual de roto y además reescrito; y quien pidió asignar querría
 * saber que su corpus no construye.
 *
 * **Se juzga el fichero, no lo que el lector supo nombrar de él.** Lo que se le pasa al
 * esquema es el YAML en bruto, y por una razón concreta: `leerColecciones` descarta las
 * claves que no reconoce y los miembros que no son cadenas, así que un objeto reconstruido
 * a partir de él nunca le enseña al `.strict()` el juego de claves real. Con la versión
 * anterior, curar un fichero con un `miembos:` mal tecleado —que el build **sí** habría
 * rechazado— pasaba la comprobación y lo reescribía perdiendo esa clave en silencio. La
 * pérdida de comentarios está documentada y asumida; la de datos, no.
 *
 * Se exporta desde la Historia 13.3: la orden que compone la Pieza de una Colección necesita
 * su `nombre` —es el título del lienzo— y no puede inventárselo ni redactar por su cuenta el
 * rechazo de un fichero a medio escribir. Preguntar aquí es preguntarle al esquema del build,
 * que es el único que decide si ese fichero vale.
 */
export type Declaracion =
  | { ok: true; datos: { nombre: string; criterio: string; miembros: string[] } }
  | { ok: false; motivos: string[] };

export async function declaracionDeColeccion(coleccion: ColeccionEnCorpus): Promise<Declaracion> {
  const validado = coleccionAdmisible.safeParse(await leerColeccionBruta(coleccion.ruta));
  if (validado.success) return { ok: true, datos: validado.data };
  return {
    ok: false,
    motivos: [
      `La Colección «${coleccion.slug}» no cumple el esquema, así que el build tampoco la ` +
        'admitiría. Arregle el fichero antes de curarla:',
      ...validado.error.issues.map((i) =>
        i.path.length > 0 ? `  ${i.path.join('.')}: ${i.message}` : `  ${i.message}`,
      ),
    ],
  };
}

/** La Colección que se pide, o el rechazo que la nombra. Ninguna orden opera a ciegas. */
async function buscar(
  rutas: Rutas,
  slug: string,
): Promise<{ ok: true; coleccion: ColeccionEnCorpus } | { ok: false; motivos: string[] }> {
  const colecciones = await leerColecciones(rutas);
  const coleccion = colecciones.find((c) => c.slug === slug);
  if (!coleccion) {
    return {
      ok: false,
      motivos: [
        `La Colección «${slug}» no está en corpus/colecciones/. ` +
          'Véalas con «listar»; una despublicada está en corpus/_colecciones-retiradas/.',
      ],
    };
  }
  return { ok: true, coleccion };
}

/**
 * Las Colecciones despublicadas, leídas con el mismo lector que las publicadas.
 *
 * Se exporta desde la Historia 13.3: la orden que compone la Pieza de una Colección necesita
 * distinguir «no existe» de «está retirada», y con su propia llamada habría un segundo sitio
 * decidiendo qué directorio son las retiradas.
 *
 * Se le pasa el directorio de las retiradas como si fuera el de las Colecciones: el lector
 * deriva el slug de la ruta relativa a ese directorio, así que enumerarlas así da
 * exactamente los mismos slugs que tenían cuando se publicaban. Un segundo lector para lo
 * mismo acabaría discrepando en cuál es el slug de un fichero.
 */
export async function leerColeccionesRetiradas(rutas: Rutas): Promise<ColeccionEnCorpus[]> {
  return leerColecciones({ ...rutas, colecciones: rutas.coleccionesRetiradas });
}

/**
 * Mueve un fichero de Colección devolviendo `Resultado` en vez de lanzar.
 *
 * `mover` se niega a pisar el destino, y hace bien —es la salvaguarda que impide perder un
 * fichero del corpus en silencio—, pero lanza. Una orden que promete rechazos redactados no
 * puede contestar con una traza de Node, así que el fallo se atrapa aquí y se cuenta.
 */
async function moverColeccion(
  origen: string,
  destinoDir: string,
): Promise<{ ok: true; destino: string } | { ok: false; motivos: string[] }> {
  try {
    return { ok: true, destino: await mover(origen, destinoDir) };
  } catch (fallo) {
    return { ok: false, motivos: [fallo instanceof Error ? fallo.message : String(fallo)] };
  }
}

/**
 * Cuántas Citas cuenta hoy una Colección, y cuántas le faltan.
 *
 * **No reimplementa nada.** Resolver es intersectar la lista declarada con el conjunto
 * publicable, y de eso tiene un solo dueño (`resolverColeccion`); aplicar el umbral a ese
 * recuento es lo que hace `huecoDeColeccion`, con la misma cuenta que la vista de huecos
 * hace para un Tema. Aquí solo se juntan los dos.
 */
function estadoDe(coleccion: ColeccionEnCorpus, citasPublicadas: Cita[]): HuecoDeColeccion {
  return huecoDeColeccion(paraHuecos(coleccion, citasPublicadas));
}

function paraHuecos(coleccion: ColeccionEnCorpus, citasPublicadas: Cita[]): ColeccionParaHuecos {
  const resuelta = resolverColeccion(
    {
      slug: coleccion.slug,
      // Una Colección a medio escribir se describe igual: la vista de huecos existe para
      // decir qué falta, y quedarse sin nombre no puede dejarla fuera del informe.
      nombre: coleccion.nombre ?? coleccion.slug,
      criterio: coleccion.criterio ?? '',
      miembros: coleccion.miembros,
    },
    citasPublicadas,
  );
  return { slug: resuelta.slug, nombre: resuelta.nombre, resueltas: resuelta.citas.length };
}

/**
 * Las Colecciones del corpus con su recuento ya resuelto, para la vista de huecos.
 *
 * Puro: recibe lo leído. Lo consumen `tools/huecos.ts` —que las presenta junto a los Temas,
 * porque es la misma pregunta— y el inventario de la propia orden de curación.
 */
export function coleccionesParaHuecos(
  colecciones: ColeccionEnCorpus[],
  citasPublicadas: Cita[],
): ColeccionParaHuecos[] {
  return colecciones.map((c) => paraHuecos(c, citasPublicadas));
}

/** Todas las Colecciones con su estado, ordenadas por slug. Lo que enseña «listar». */
export async function inventarioDeColecciones(rutas: Rutas): Promise<HuecoDeColeccion[]> {
  const colecciones = await leerColecciones(rutas);
  const citas = await citasPublicadas(rutas);
  return coleccionesParaHuecos(colecciones, citas)
    .map(huecoDeColeccion)
    .sort((a, b) => a.slug.localeCompare(b.slug, 'es'));
}

/** Una Colección del inventario con su solape mayor al lado. */
export interface ColeccionConSolape extends HuecoDeColeccion {
  solape: SolapeDeColeccion;
}

/**
 * El inventario, y para cada Colección cuánto de su lista se ve ya en otra parte — Historia 15.2.
 *
 * La primera auditoría de las dieciséis Colecciones se hizo con un guion de usar y tirar, y esa
 * es exactamente la forma de que no se repita: la próxima vez habría que volver a escribirlo. Si
 * la medida vale para curar una, vale para mirarlas todas, y su sitio es la orden que ya las
 * enumera.
 *
 * Las Colecciones sin miembros siguen en la lista, con el solape ausente: lo que se pregunta
 * mirando el inventario es cuáles están cerca de publicarse, y una vacía es la que más lejos
 * está — esconderla sería esconder el trabajo pendiente.
 */
export async function inventarioConSolape(rutas: Rutas): Promise<ColeccionConSolape[]> {
  const colecciones = await leerColecciones(rutas);
  const citas = await citasPublicadas(rutas);
  const porSlug = new Map(
    coleccionesParaHuecos(colecciones, citas).map((c) => [c.slug, c] as const),
  );
  const publicadas = citas as unknown as { slug: string; autor: string; temas?: string[] }[];

  return [...porSlug.values()]
    .map((c) => {
      const declarados = colecciones.find((x) => x.slug === c.slug)?.miembros ?? [];
      const resueltos = declarados.filter((s) => publicadas.some((p) => p.slug === s));
      return { ...huecoDeColeccion(c), solape: solapeDeColeccion(resueltos, publicadas) };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug, 'es'));
}

/**
 * Las Citas publicadas, que son las de `corpus/citas/` y ninguna más (AD-2).
 *
 * Se anuncian como `Cita[]` porque es lo que `resolverColeccion` pide, y de una Cita solo
 * se le mira el slug. La conversión está aquí, en un sitio, en vez de repartida por cada
 * llamada.
 */
async function citasPublicadas(rutas: Rutas): Promise<Cita[]> {
  return (await leerCitas(rutas.citas)) as unknown as Cita[];
}

/**
 * Crea una Colección con su nombre y su criterio, sin miembros todavía.
 *
 * Nace vacía y por tanto sin publicarse, que es lo que debe pasar: asignarle Citas es la
 * orden siguiente. El mensaje cierra diciendo cuántas le faltan, con la misma línea que la
 * vista de huecos, para que crear y saber qué falta sean un solo paso.
 */
export async function crearColeccion(rutas: Rutas, datos: DatosDeColeccion): Promise<Resultado> {
  const validado = coleccionAdmisible.safeParse({
    nombre: datos.nombre,
    criterio: datos.criterio,
  });
  if (!validado.success) {
    return {
      ok: false,
      motivos: validado.error.issues.map((i) =>
        i.path.length > 0 ? `${i.path.join('.')}: ${i.message}` : i.message,
      ),
    };
  }

  const slug = slugDeNombreDeColeccion(validado.data.nombre);
  if (slug === '') {
    /*
     * El esquema admite un nombre que no es ni una letra ni un dígito —«¿?»— porque solo
     * exige que no esté en blanco, y de ahí sale un slug vacío: un fichero «.yml», una
     * Colección cuyo identificador es la cadena vacía y una URL «/coleccion/». No es la
     * puerta la que está mal: el nombre es válido como texto y lo que no vale es la URL
     * que produce, y eso solo se sabe aquí, donde el slug se deriva.
     */
    return {
      ok: false,
      motivos: [
        `El nombre «${validado.data.nombre}» no produce ningún slug, y el slug de una ` +
          'Colección es su URL. Use un nombre con letras o dígitos.',
      ],
    };
  }

  const existentes = await leerColecciones(rutas);
  if (existentes.some((c) => c.slug === slug)) {
    // Ni se toca la que ya está: es contenido curado, y sobrescribirla borraría su lista
    // de miembros sin que nadie lo pidiera.
    return {
      ok: false,
      motivos: [`La Colección «${slug}» ya existe. No se ha tocado; use «asignar» o «estado».`],
    };
  }

  /*
   * Y tampoco puede chocar con una retirada. Sin esta comprobación se podía crear una
   * Colección con el slug de otra despublicada, y entonces la nueva **no se podía
   * despublicar**: `mover` se niega a pisar el destino —y hace bien—, pero el fallo salía
   * como traza de Node en lugar del rechazo redactado que esta orden promete. El choque se
   * dice aquí, que es donde todavía se puede elegir otro nombre.
   */
  const retirada = (await leerColeccionesRetiradas(rutas)).find((r) => r.slug === slug);
  if (retirada) {
    return {
      ok: false,
      motivos: [
        `«${slug}» es el slug de una Colección despublicada, que sigue en ${retirada.ruta}. ` +
          'Vuelva a publicarla con «publicar», o elija otro nombre para la nueva.',
      ],
    };
  }

  const ruta = await escribirColeccion(join(rutas.colecciones, `${slug}.yml`), {
    nombre: validado.data.nombre,
    criterio: validado.data.criterio,
    miembros: [],
  });

  return {
    ok: true,
    ruta,
    mensaje: [
      `Colección «${slug}» creada en ${ruta}.`,
      lineaDeHueco(
        huecoDeColeccion({ slug, nombre: validado.data.nombre, resueltas: 0 }),
      ),
    ].join('\n'),
  };
}

/**
 * Asigna Citas **publicadas** a una Colección, sin tocar ninguna Cita.
 *
 * Las dos reglas que ningún esquema puede aplicar, y que son la razón de ser de esta orden:
 *
 *   · **Solo Citas publicadas.** Una Cita de `corpus/_revision/` no se puede asignar, y el
 *     rechazo lo dice con esas palabras. No es una vía para adelantar contenido en
 *     revisión: si lo fuera, una Colección publicaría por la puerta de atrás lo que la
 *     revisión no ha aprobado. El esquema no puede verlo porque `miembros` es una lista de
 *     slugs y jamás una referencia dura (ver `coleccionAdmisible`), y esa blandura es lo
 *     que hace que retirar una Cita no rompa el build.
 *   · **La errata se caza al escribirla.** Un slug que no es ninguna Cita del corpus se
 *     rechaza nombrándolo. Al build ese slug le daría igual —desaparecería en silencio y
 *     se contaría como desajuste—, y contarlo después no es lo mismo que impedirlo ahora.
 *
 * **O todo o nada.** Un lote con un slug malo no asigna los buenos: quien cura pega una
 * lista de golpe, y una asignación a medias obligaría a averiguar cuáles entraron. Nada se
 * escribe hasta que todos los slugs valen.
 */
export async function asignarCitas(
  rutas: Rutas,
  slug: string,
  slugsDeCitas: string[],
): Promise<Resultado> {
  if (slugsDeCitas.length === 0) {
    return { ok: false, motivos: ['Indique al menos el slug de una Cita que asignar.'] };
  }

  const encontrada = await buscar(rutas, slug);
  if (!encontrada.ok) return encontrada;

  const declaracion = await declaracionDeColeccion(encontrada.coleccion);
  if (!declaracion.ok) return declaracion;

  const publicadas = await citasPublicadas(rutas);
  const enRevision = await leerCitas(rutas.revision);
  const publicada = new Set(publicadas.map((c) => c.slug));
  const revisandose = new Set(enRevision.map((c) => c.slug));

  const motivos: string[] = [];
  for (const slugDeCita of [...new Set(slugsDeCitas)]) {
    if (publicada.has(slugDeCita)) continue;
    motivos.push(
      revisandose.has(slugDeCita)
        ? `La Cita «${slugDeCita}» no está publicada: sigue en corpus/_revision/. ` +
            'Apruébela antes de asignarla; una Colección no adelanta contenido en revisión.'
        : `La Cita «${slugDeCita}» no existe en el corpus. Compruebe el slug.`,
    );
  }
  if (motivos.length > 0) {
    motivos.push('No se ha asignado ninguna: el lote se escribe entero o no se escribe.');
    return { ok: false, motivos };
  }

  // Deduplicado, porque la enumeración de abajo también lo está: sin esto, asignar dos
  // veces la misma Cita en la misma orden decía «2 ya estaban» y enseñaba una.
  const yaEstaban = [...new Set(slugsDeCitas)].filter((s) =>
    declaracion.datos.miembros.includes(s),
  );
  // Asignar dos veces la misma no la duplica. Un miembro repetido cuenta una sola vez al
  // resolver, así que el fichero anunciaría más Citas de las que la página enseña.
  const nuevos = [...new Set(slugsDeCitas)].filter(
    (s) => !declaracion.datos.miembros.includes(s),
  );
  const miembros = [...declaracion.datos.miembros, ...nuevos];

  // En la ruta que devolvió el lector, nunca en una compuesta: ver `escribirColeccion`.
  const ruta = await escribirColeccion(encontrada.coleccion.ruta, {
    ...declaracion.datos,
    miembros,
  });

  const estado = estadoDe({ ...encontrada.coleccion, miembros }, publicadas);
  return {
    ok: true,
    ruta,
    mensaje: [
      `Colección «${slug}»: ${nuevos.length} ${nuevos.length === 1 ? 'Cita asignada' : 'Citas asignadas'}` +
        `${yaEstaban.length > 0 ? `; ${yaEstaban.length} ya estaba${yaEstaban.length === 1 ? '' : 'n'} en la lista` : ''}.`,
      ...yaEstaban.map((s) => `  · ${s} ya estaba.`),
      lineaDeEstado(estado),
    ].join('\n'),
  };
}

/**
 * Quita miembros de una Colección. Tampoco toca ninguna Cita: quitar es editar la lista.
 *
 * Un slug que no está en la lista se **rechaza** en vez de ignorarse. Es la asimetría con
 * asignar dos veces —que no es un error porque el estado final es el que se pidió— y tiene
 * el mismo motivo que ella: una errata al quitar dejaría la Colección intacta diciendo que
 * la operación salió bien, y quien la escribió creería haber retirado una Cita que sigue
 * ahí.
 */
export async function quitarCitas(
  rutas: Rutas,
  slug: string,
  slugsDeCitas: string[],
): Promise<Resultado> {
  if (slugsDeCitas.length === 0) {
    return { ok: false, motivos: ['Indique al menos el slug de una Cita que quitar.'] };
  }

  const encontrada = await buscar(rutas, slug);
  if (!encontrada.ok) return encontrada;

  const declaracion = await declaracionDeColeccion(encontrada.coleccion);
  if (!declaracion.ok) return declaracion;

  const aQuitar = [...new Set(slugsDeCitas)];
  const ausentes = aQuitar.filter((s) => !declaracion.datos.miembros.includes(s));
  if (ausentes.length > 0) {
    return {
      ok: false,
      motivos: [
        ...ausentes.map((s) => `La Cita «${s}» no es miembro de «${slug}».`),
        'No se ha quitado ninguna: el lote se escribe entero o no se escribe.',
      ],
    };
  }

  const miembros = declaracion.datos.miembros.filter((s) => !aQuitar.includes(s));
  const ruta = await escribirColeccion(encontrada.coleccion.ruta, {
    ...declaracion.datos,
    miembros,
  });

  const estado = estadoDe({ ...encontrada.coleccion, miembros }, await citasPublicadas(rutas));
  return {
    ok: true,
    ruta,
    mensaje: [
      `Colección «${slug}»: ${aQuitar.length} ${aQuitar.length === 1 ? 'Cita quitada' : 'Citas quitadas'}. ` +
        'Ninguna Cita se ha modificado: quitar es editar la lista de la Colección.',
      lineaDeEstado(estado),
    ].join('\n'),
  };
}

/**
 * Qué le falta a una Colección para publicarse, dicho como lo dice la vista de huecos.
 *
 * La lectura es la misma a propósito: quien cura una Colección y quien mira qué le falta al
 * Corpus son la misma persona en el mismo momento, y si «le faltan cuatro» se dijera de dos
 * formas distintas en dos sitios, una de las dos acabaría mintiendo. La línea sale del mismo
 * formateador que `tools/huecos.ts`.
 *
 * Se informa además del desajuste entre lo declarado y lo resuelto, que es lo que la 12.2
 * dejó anunciado en cada construcción: aquí se ve Colección a Colección y con los slugs
 * delante, que es donde se arregla.
 */
export async function estadoDeColeccion(rutas: Rutas, slug: string): Promise<Resultado> {
  const encontrada = await buscar(rutas, slug);
  if (!encontrada.ok) return encontrada;

  const declaracion = await declaracionDeColeccion(encontrada.coleccion);
  if (!declaracion.ok) return declaracion;

  const publicadas = await citasPublicadas(rutas);
  const resuelta = resolverColeccion({ slug, ...declaracion.datos }, publicadas);
  /*
   * El solape se calcula aquí y se enseña siempre, tenga el valor que tenga: el número solo sirve
   * si está delante cuando se cura, no cuando alguien va a buscarlo.
   */
  const solape = solapeDeColeccion(
    resuelta.citas.map((c) => c.slug),
    publicadas as readonly { slug: string; autor: string; temas?: string[] }[],
  );
  const estado = huecoDeColeccion({
    slug,
    nombre: resuelta.nombre,
    resueltas: resuelta.citas.length,
  });

  return {
    ok: true,
    ruta: encontrada.coleccion.ruta,
    mensaje: [
      `${declaracion.datos.nombre} («${slug}»)`,
      declaracion.datos.criterio,
      '',
      `Miembros declarados: ${resuelta.declarados}`,
      `Miembros resueltos:  ${resuelta.citas.length}`,
      ...(solape.mayor === undefined
        ? []
        : [
            `Solape mayor:        ${solape.mayor.miembros} de ${resuelta.citas.length} ` +
              `(${porcentajeEnEspañol(solape.mayor.porcentaje)} %) se ven también en ` +
              `${solape.mayor.clase === 'autor' ? 'la Página de Autor' : 'el Tema'} ` +
              `«${solape.mayor.slug}», y son el ` +
              `${porcentajeEnEspañol(solape.mayor.porcentajeDeLaSuperficie)} % de las ` +
              `${solape.mayor.tamañoDeLaSuperficie} que esa página enseña.`,
            'Duplicar es que las dos listas sean la misma: hacen falta los dos porcentajes altos.',
          ]),
      ...(resuelta.sinResolver.length > 0
        ? [
            '',
            `Declarados que no resuelven (${resuelta.sinResolver.length}): ni son Citas ` +
              'publicadas ni existen. Una Cita retirada a revisión y un slug con errata se',
            'ven igual desde el fichero; «asignar» impide la errata nueva, esta lista enseña',
            'la vieja.',
            ...resuelta.sinResolver.map((s) => `  · ${s}`),
          ]
        : []),
      '',
      lineaDeEstado(estado),
    ].join('\n'),
  };
}

/**
 * Despublica una Colección **moviendo su fichero**, nunca borrándolo — AD-2.
 *
 * Dos razones, y ninguna es de estilo:
 *
 *   · `AGENTS.md` prohíbe borrar ficheros de `corpus/` para «limpiar»: git es el único
 *     almacén del contenido y no hay copia en otro sitio. Una Colección es contenido
 *     editorial —un criterio escrito y una curación hecha a mano— tanto como una Cita.
 *   · AD-2 marca el precedente y esta orden lo sigue al pie de la letra: publicar una Cita
 *     es mover el fichero a `corpus/citas/` y retirarla es el mismo movimiento al revés, a
 *     `corpus/_revision/`. No hay ningún campo `publicada` que cambiar, ni aquí ni allí.
 *     La Colección se retira a `corpus/_colecciones-retiradas/`, que no es la base de
 *     ninguna colección de Astro, así que deja de existir para el sitio —página, sitemap,
 *     chips y descubrimiento— entera y a la vez. Volver a publicarla es mover el fichero
 *     de vuelta, con su criterio y sus miembros intactos.
 *
 * **Y no se toca ninguna Cita.** Ni se borra, ni cambia de estado, ni pierde un Tema: la
 * pertenencia se declara en la Colección (AD-18), así que retirar la Colección es retirar
 * un fichero y nada más. Es la garantía que la matriz de la historia exige, y sale de la
 * dirección en que la Épica 12 decidió declarar la pertenencia.
 */
export async function despublicarColeccion(rutas: Rutas, slug: string): Promise<Resultado> {
  const encontrada = await buscar(rutas, slug);
  if (!encontrada.ok) return encontrada;

  const publicadas = await citasPublicadas(rutas);
  const estado = estadoDe(encontrada.coleccion, publicadas);

  const movida = await moverColeccion(encontrada.coleccion.ruta, rutas.coleccionesRetiradas);
  if (!movida.ok) return movida;
  const destino = movida.destino;

  return {
    ok: true,
    ruta: destino,
    mensaje: [
      estado.faltan === 0
        ? `Colección «${slug}» despublicada: su fichero está en ${destino}.`
        : `Colección «${slug}» retirada: su fichero está en ${destino}. No llegaba al ` +
          'umbral, así que tampoco se publicaba.',
      'No se ha borrado nada y ninguna Cita se ha tocado: ni se borra, ni cambia de estado.',
      'Para volver a publicarla, mueva el fichero de vuelta a corpus/colecciones/.',
    ].join('\n'),
  };
}

/**
 * Vuelve a poner en `corpus/colecciones/` una Colección retirada — el espejo de despublicar.
 *
 * Existe para que volver atrás sea la misma clase de acto que ir: publicar una Cita es
 * mover su fichero y retirarla es el movimiento inverso (AD-2), y aquí pasa igual. Sin esta
 * orden, el camino de vuelta era un `mv` a mano dentro de `corpus/`, que es justo la
 * manipulación que esta herramienta existe para no tener que hacer.
 *
 * **Poner el fichero de vuelta no es lo mismo que publicarla.** Quien publica sigue siendo
 * el umbral aplicado sobre el recuento resuelto, y por eso el mensaje dice en cuál de los
 * dos estados queda: una Colección que perdió miembros mientras estaba retirada vuelve sin
 * publicarse, y decir «publicada» ahí sería mentir.
 */
export async function publicarColeccion(rutas: Rutas, slug: string): Promise<Resultado> {
  const retirada = (await leerColeccionesRetiradas(rutas)).find((c) => c.slug === slug);
  if (!retirada) {
    return {
      ok: false,
      motivos: [
        `No hay ninguna Colección retirada con el slug «${slug}» en ` +
          `${rutas.coleccionesRetiradas}. Véalas con «listar».`,
      ],
    };
  }

  const movida = await moverColeccion(retirada.ruta, rutas.colecciones);
  if (!movida.ok) return movida;

  const vuelta = { ...retirada, ruta: movida.destino };
  const estado = estadoDe(vuelta, await citasPublicadas(rutas));
  return {
    ok: true,
    ruta: movida.destino,
    mensaje: [
      `Colección «${slug}» de vuelta en ${movida.destino}.`,
      lineaDeEstado(estado),
    ].join('\n'),
  };
}

/**
 * Todas las Colecciones retiradas, con su estado, ordenadas por slug — lo que enseña
 * «listar» en su segundo bloque.
 *
 * Enumerarlas no es un adorno: el rechazo de una orden que no encuentra una Colección
 * remite a «listar», y hasta que este bloque existió esa remisión mandaba a un sitio donde
 * lo retirado no aparecía.
 */
export async function inventarioDeRetiradas(rutas: Rutas): Promise<HuecoDeColeccion[]> {
  const citas = await citasPublicadas(rutas);
  return coleccionesParaHuecos(await leerColeccionesRetiradas(rutas), citas)
    .map(huecoDeColeccion)
    .sort((a, b) => a.slug.localeCompare(b.slug, 'es'));
}

/** Cómo se dice si una Colección se publica o cuánto le falta. Una sola redacción. */
function lineaDeEstado(estado: HuecoDeColeccion): string {
  return estado.faltan === 0
    ? `Se publica: ${estado.publicadas} Citas resueltas, y el umbral está en ${MIN_CITAS_POR_COLECCION}.`
    : `Todavía no se publica.\n${lineaDeHueco(estado)}`;
}

/** Una superficie que ya enseña parte de la lista de una Colección: un Tema o una Página de Autor. */
export interface SolapeConSuperficie {
  clase: 'tema' | 'autor';
  slug: string;
  /** Miembros de la Colección que esa superficie también enseña. */
  miembros: number;
  /** Qué parte de la Colección es eso, a una décima. */
  porcentaje: number;
  /** Cuántas Citas enseña la superficie en total. */
  tamañoDeLaSuperficie: number;
  /**
   * Qué parte de **la superficie** cubre la Colección, a una décima.
   *
   * Es la mitad que faltaba, y sin ella el número engaña. «Refranes de Sancho» tiene el 100 %
   * de sus veinte miembros en una Página de Autor —son todos del mismo Autor— y aun así no
   * duplica nada: ese Autor tiene sesenta y siete Citas y la Colección enseña veinte. Duplicar
   * es que las **dos listas sean la misma**, y eso solo se ve mirando en las dos direcciones.
   */
  porcentajeDeLaSuperficie: number;
}

export interface SolapeDeColeccion {
  /** La superficie que más repite. Ausente si la Colección no tiene miembros. */
  mayor?: SolapeConSuperficie;
}

/**
 * Cuánto de una Colección se puede ver ya en otra parte — Historia 15.2.
 *
 * La regla que esto mide tardó dieciséis Colecciones en formularse: **una Colección tiene que
 * traer una lista que no se pueda ver ya en otro sitio**. Si sus miembros son los mismos que los
 * de un Tema o los de una Página de Autor, la página no añade superficie: la repite, que es la
 * versión cara de la «vía barata de multiplicar páginas indexables» que `umbrales.ts` nombra a
 * propósito del umbral de Colección.
 *
 * Descartó «la fortuna» —14 de 26 candidatas salían del Tema «la adversidad»— y destapó que «El
 * uniforme y la sotana» reunía las dieciséis Citas de un Autor que tiene dieciséis. Pero vivía en
 * la bitácora, y **una regla que solo vive en prosa no protege a nadie**: la primera vez que hizo
 * falta llevaba dieciséis Colecciones sin aplicarse, y la única que la incumplía se encontró de
 * casualidad.
 *
 * **No lleva umbral y no bloquea nada, y es deliberado.** El sistema no tiene criterio para decir
 * cuánto solape es demasiado —reunir lo que un Tema dispersa es a veces justo el trabajo
 * editorial que la Colección hace— pero sí puede poner el número delante de quien cura. Es la
 * misma línea que la Historia 1.6 con los duplicados: se señala, decide el editor.
 *
 * AD-5 — puro: recibe los slugs y las Citas ya leídas, no toca disco.
 */
export function solapeDeColeccion(
  miembros: string[],
  citas: readonly { slug: string; autor: string; temas?: string[] }[],
): SolapeDeColeccion {
  if (miembros.length === 0) return {};

  const enLaColeccion = new Set(miembros);
  const cuenta = new Map<
    string,
    { clase: 'tema' | 'autor'; slug: string; miembros: number; tamaño: number }
  >();
  const sumar = (clase: 'tema' | 'autor', slug: string, esMiembro: boolean) => {
    const clave = `${clase}:${slug}`;
    const previo = cuenta.get(clave) ?? { clase, slug, miembros: 0, tamaño: 0 };
    previo.tamaño += 1;
    if (esMiembro) previo.miembros += 1;
    cuenta.set(clave, previo);
  };

  // Se recorre el corpus entero, no solo los miembros: el tamaño de cada superficie hace falta
  // para saber si la Colección la cubre o solo se apoya en ella.
  for (const cita of citas) {
    const esMiembro = enLaColeccion.has(cita.slug);
    sumar('autor', cita.autor, esMiembro);
    for (const tema of cita.temas ?? []) sumar('tema', tema, esMiembro);
  }
  for (const clave of [...cuenta.keys()]) {
    if (cuenta.get(clave)!.miembros === 0) cuenta.delete(clave);
  }

  /*
   * En empate gana el **Autor**, y no por casualidad del orden alfabético de las clases: la
   * Página de Autor siempre existe y enseña **todas** sus Citas, mientras que un Tema es una
   * lista ya curada que puede no incluirlas. De las dos duplicaciones posibles, la del Autor es
   * la segura, y es la que hay que enseñar primero a quien cura.
   *
   * El segundo desempate es por slug en español y no por el orden en que se leyeron los ficheros:
   * el mismo estado tiene que dar el mismo informe, se pregunte cuando se pregunte.
   */
  const decima = (n: number) => Math.round(n * 1000) / 10;
  /*
   * Ordena por la **duplicación real**, que es el mínimo de las dos coberturas: una superficie
   * solo repite la lista de la Colección si la Colección está dentro de ella **y** la llena. Con
   * la cobertura de la Colección a secas, «Refranes de Sancho» —veinte Citas de un Autor que
   * tiene sesenta y siete— salía al 100 % y parecía un duplicado sin serlo.
   */
  const duplicacion = (c: { miembros: number; tamaño: number }) =>
    Math.min(c.miembros / miembros.length, c.miembros / c.tamaño);

  const mayor = [...cuenta.values()].sort(
    (a, b) =>
      duplicacion(b) - duplicacion(a) ||
      b.miembros - a.miembros ||
      a.clase.localeCompare(b.clase) ||
      a.slug.localeCompare(b.slug, 'es'),
  )[0];
  if (mayor === undefined) return {};

  return {
    mayor: {
      clase: mayor.clase,
      slug: mayor.slug,
      miembros: mayor.miembros,
      porcentaje: decima(mayor.miembros / miembros.length),
      tamañoDeLaSuperficie: mayor.tamaño,
      porcentajeDeLaSuperficie: decima(mayor.miembros / mayor.tamaño),
    },
  };
}
