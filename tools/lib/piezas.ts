/**
 * Componer una Pieza de Canal — Historias 13.2 y 13.3, FR-22.
 *
 * Dos composiciones y una sola plantilla: la que reúne varias Citas elegidas a mano
 * (`componerPieza`) y la que anuncia una Colección entera (`componerPiezaDeColeccion`). Se
 * distinguen en dos cosas —el título del lienzo y el destino del enlace— y en nada más; todo
 * lo demás lo comparten, que es lo que hace que las dos publiquen el mismo producto.
 *
 * Vive en `tools/` y no en el build ni en el cliente porque el plano lo fija quién consume
 * el artefacto (AD-15): el build es para lo que pide un tercero sin JavaScript —la Tarjeta
 * Social—, el cliente para lo que pide alguien con el navegador delante —la Imagen de
 * Cita—, y `tools/` para lo que **nadie pide a demanda**. Una Pieza es lo tercero: la compone
 * el editor cuando decide qué Citas van juntas, y ningún visitante la solicita nunca.
 *
 * **La salida no se versiona.** El PNG cae en `piezas/`, ignorado por git. Lo versionado es
 * la decisión —qué Citas van juntas y a qué red—, nunca el artefacto: guardarlo crearía algo
 * que puede quedarse viejo respecto al corpus del que salió, que es el problema que la 13.1
 * evitó no guardando el material del lote.
 *
 * **Rechazar en vez de descartar en silencio.** El criterio de la épica dice que una Cita
 * larga «queda excluida». Componer la Pieza sin ella y callarlo convierte un error de
 * selección en un artefacto publicado al que le falta una Cita, y eso no se ve hasta después
 * de publicarlo. Aquí se rechaza nombrando el slug y la regla: la exclusión es la misma,
 * pero ocurre delante de quien la puede corregir.
 *
 * **O todo o nada**, como el resto de `tools/lib/`: nada se escribe hasta que todo valida —
 * y eso incluye la ruta de salida, no solo el contenido.
 *
 * AD-22 — aquí no entra la red: esto lee ficheros del corpus, rasteriza y escribe un PNG.
 */

import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { textoParaCopiar } from '../../src/lib/atribucion.ts';
import { seleccionDeColeccion } from '../../src/lib/coleccionEnPieza.ts';
import { SITIO } from '../../src/lib/dominio.ts';
import { lineaDeHueco } from '../../src/lib/formato.ts';
import { huecoDeColeccion } from '../../src/lib/huecos.ts';
import {
  MINIMO_DE_CITAS,
  cabenEnPieza,
  citaEnPieza,
  desbordanALoAncho,
  palabrasDelTituloQueDesbordan,
  svgDePieza,
} from '../../src/lib/pieza.ts';
import { coleccionesPublicadas, type Autor, type Cita } from '../../src/lib/publicado.ts';
import { REDES, enlaceConOrigen, esRedValida, type Red } from '../../src/lib/redes.ts';
import { rutaDeColeccion } from '../../src/lib/superficies.ts';
import { admiteImagen } from '../../src/lib/tramos.ts';
import { MAX_CARACTERES_IMAGEN } from '../../src/lib/umbrales.ts';
import { leerAutores, leerCitas, leerColecciones, type Rutas } from './corpus.ts';
import {
  coleccionesParaHuecos,
  declaracionDeColeccion,
  leerColeccionesRetiradas,
} from './curacion.ts';
import type { Resultado } from './gestion.ts';

/** Donde caen las Piezas cuando no se dice otra cosa. Está en `.gitignore` a propósito. */
export const DIRECTORIO_DE_PIEZAS = 'piezas';

/**
 * Tope del nombre derivado, **en bytes**.
 *
 * En bytes y no en caracteres porque es lo que cuenta el sistema de ficheros: el límite
 * habitual es de 255 bytes por componente, y un slug con acentos gasta dos por letra
 * acentuada. Medir en `.length` daría por bueno un nombre que el sistema rechaza, y el fallo
 * saldría como `ENAMETOOLONG` crudo justo después de rasterizar.
 */
const MAXIMO_DE_BYTES_DEL_NOMBRE = 180;

/**
 * La forma que tiene un slug — la que produce `src/lib/slug.ts`.
 *
 * Se comprueba antes de derivar ninguna ruta. El slug llega de la línea de órdenes **y** del
 * frontmatter, que nadie valida al leerlo, así que uno con `/` o con `..` compondría el
 * nombre del fichero y sacaría el PNG de `piezas/` — donde ya no está ignorado por git, que
 * es justo lo que AD-15 no quiere.
 */
const FORMA_DE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Recorta un texto a un presupuesto de bytes sin partir ningún carácter por la mitad. */
function recortarABytes(texto: string, bytes: number): string {
  let recortado = texto;
  while (Buffer.byteLength(recortado) > bytes && recortado.length > 0) {
    recortado = recortado.slice(0, -1);
  }
  return recortado;
}

/**
 * El nombre del fichero, derivado de la selección.
 *
 * Determinista a propósito: repetir la misma orden sobrescribe la misma Pieza en vez de
 * sembrar `piezas/` de copias numeradas.
 *
 * El repuesto **no es el caso raro**: con el corpus real, los slugs pasan de los cincuenta
 * caracteres y tres Citas ya se salen del tope. Por eso lleva una huella de la lista entera —
 * que es lo que impide que dos selecciones distintas que empiecen por la misma Cita compartan
 * fichero— y por eso el primer slug se recorta al presupuesto que quede: un solo slug
 * desmedido volvería a pasarse del mismo límite que el repuesto existe para esquivar.
 */
export function nombreDePieza(slugs: string[]): string {
  const completo = `pieza-${slugs.join('--')}.png`;
  if (Buffer.byteLength(completo) <= MAXIMO_DE_BYTES_DEL_NOMBRE) return completo;

  const huella = createHash('sha1').update(slugs.join('--')).digest('hex').slice(0, 8);
  const cola = `--y-${slugs.length - 1}-mas--${huella}.png`;
  const presupuesto = MAXIMO_DE_BYTES_DEL_NOMBRE - Buffer.byteLength(`pieza-${cola}`);
  return `pieza-${recortarABytes(slugs[0], Math.max(0, presupuesto))}${cola}`;
}

/**
 * El nombre del fichero de una Pieza de Colección — Historia 13.3.
 *
 * **Propio, y no `nombreDePieza(['coleccion', slug])`.** Aquel deriva de una lista de Citas y
 * al reutilizarlo se rompía por los dos lados. Por arriba, su repuesto para nombres largos
 * conserva el primer elemento y resume el resto: con un slug de Colección largo producía
 * `pieza-coleccion--y-1-mas--<huella>.png`, donde la Colección anunciada **desaparece del
 * nombre** y «y 1 más» no significa nada, porque no hay una Cita más: hay una Colección. Por
 * abajo, `componer` sobre dos Citas de slug `coleccion` y `frases-cortas` producía exactamente
 * el mismo fichero que `coleccion frases-cortas`, y como el nombre es determinista a propósito
 * la segunda composición pisaba a la primera sin decir nada.
 *
 * Las dos familias no pueden chocar: aquí el slug va tras un guion simple y allí los slugs se
 * unen con uno doble, que ningún slug puede contener (`FORMA_DE_SLUG` admite guiones simples).
 * El repuesto conserva el principio del slug **y** una huella del entero, para que dos
 * Colecciones de nombre largo y prefijo común no compartan fichero.
 */
export function nombreDePiezaDeColeccion(slug: string): string {
  const completo = `pieza-coleccion-${slug}.png`;
  if (Buffer.byteLength(completo) <= MAXIMO_DE_BYTES_DEL_NOMBRE) return completo;

  const cola = `--${createHash('sha1').update(slug).digest('hex').slice(0, 8)}.png`;
  const presupuesto = MAXIMO_DE_BYTES_DEL_NOMBRE - Buffer.byteLength(`pieza-coleccion-${cola}`);
  return `pieza-coleccion-${recortarABytes(slug, Math.max(0, presupuesto))}${cola}`;
}

/**
 * El texto que acompaña a la Pieza al publicarla.
 *
 * La atribución de cada Cita sale de `atribucion.ts`, **la misma** que se lleva el visitante
 * al copiar y la misma que compone la Imagen. Redactarla aquí publicaría «Séneca, Cartas a
 * Lucilio» donde el sitio dice «Séneca — Cartas a Lucilio, 65», y nadie lo vería hasta tener
 * las dos delante.
 *
 * Y **un solo enlace**, marcado por red (FR-22). Cuál es ese destino **no lo decide esta
 * función**, y desde la Historia 13.3 tampoco puede: es el parámetro `destino`. Una Pieza de
 * tres Citas sueltas no puede enlazar a una de ellas sin favorecerla, así que enlaza a la
 * portada, la única superficie que las contiene a todas sin elegir; la Pieza de una Colección
 * enlaza a su Página, que es exactamente la diferencia entre las dos historias. Un segundo
 * constructor para cambiar una cadena habría dejado dos redacciones de la atribución.
 */
export function textoDeLaPieza(
  citas: Cita[],
  autores: Map<string, Autor>,
  red: Red,
  destino: string,
): string {
  const atribuidas = citas.map((cita) => textoParaCopiar(cita, autores.get(cita.autor)!));
  return `${atribuidas.join('\n\n')}\n\n${SITIO}${enlaceConOrigen(destino, red)}`;
}

/**
 * El destino de una Pieza que no anuncia ninguna Colección: la portada.
 *
 * Con nombre y no escrito dentro de la llamada porque es una decisión —la de la 13.2— y no un
 * detalle de formato, y porque tenerla al lado de `rutaDeColeccion` deja las dos a la vista.
 */
const DESTINO_SIN_COLECCION = '/';

/** Cómo se enumeran las redes válidas cuando la que llegó no lo es. */
function redesValidas(): string {
  return REDES.map((r) => r.id).join(', ');
}

/**
 * Lo que impide que `--salida` escriba donde no debe.
 *
 * Una orden cuyo lema es «nada se escribe hasta que todo valida» no puede aceptar una ruta
 * sin mirarla: `--salida notas.jpg` escribiría bytes PNG con nombre de JPEG, `--salida
 * src/lib/pieza.ts` machacaría el fuente sin decir nada, y un directorio saldría como
 * `EISDIR` crudo después de haber rasterizado.
 */
async function motivosDeLaSalida(ruta: string): Promise<string[]> {
  const motivos: string[] = [];

  if (!/\.png$/i.test(ruta)) {
    motivos.push(
      `«${ruta}» no termina en «.png», y lo que compone esta orden es un PNG. Un fichero con ` +
        'otra extensión engaña a quien lo abra después.',
    );
  }

  try {
    if ((await stat(ruta)).isDirectory()) {
      motivos.push(`«${ruta}» es un directorio: indique la ruta del fichero PNG.`);
    }
  } catch {
    // No existe todavía, que es el caso normal: se creará al escribirlo.
  }

  return motivos;
}

/**
 * Compone la Pieza: resuelve los slugs, aplica los rechazos, rasteriza y escribe.
 *
 * `salida` es la ruta del PNG. Sin ella, `piezas/` y un nombre derivado de la selección.
 */
export async function componerPieza(
  rutas: Rutas,
  slugs: string[],
  red: string,
  salida?: string,
): Promise<Resultado> {
  const motivos: string[] = [];

  if (!esRedValida(red)) {
    return {
      ok: false,
      motivos: [
        `«${red}» no es una de las cuentas propias. Una Pieza declara un único enlace y lo ` +
          `marca por red (FR-22); las válidas son: ${redesValidas()}.`,
      ],
    };
  }

  if (slugs.length < MINIMO_DE_CITAS) {
    return {
      ok: false,
      motivos: [
        `Una Pieza reúne al menos ${MINIMO_DE_CITAS} Citas, y se han indicado ${slugs.length}. ` +
          'Para una Cita sola ya está la Imagen de Cita, que se compone desde su propia página.',
      ],
    };
  }

  if (salida !== undefined) motivos.push(...(await motivosDeLaSalida(salida)));

  const repetidos = [...new Set(slugs.filter((s, i) => slugs.indexOf(s) !== i))];
  for (const slug of repetidos) {
    motivos.push(
      `La Cita «${slug}» aparece dos veces en la selección. Una Cita no se anuncia dos veces ` +
        'en la misma Pieza.',
    );
  }

  const publicadas = (await leerCitas(rutas.citas)) as unknown as Cita[];
  const enRevision = await leerCitas(rutas.revision);
  const porSlug = new Map(publicadas.map((c) => [c.slug, c]));
  const revisandose = new Set(enRevision.map((c) => c.slug));
  const autores = new Map(
    ((await leerAutores(rutas)) as unknown as Autor[]).map((a) => [a.slug, a]),
  );

  const elegidas: Cita[] = [];
  for (const slug of slugs) {
    if (typeof slug !== 'string' || !FORMA_DE_SLUG.test(slug)) {
      motivos.push(
        `«${slug}» no tiene forma de slug —minúsculas, cifras y guiones simples—, así que no ` +
          'nombra ninguna Cita y no puede nombrar tampoco el fichero de la Pieza.',
      );
      continue;
    }

    const cita = porSlug.get(slug);
    if (cita === undefined) {
      motivos.push(
        revisandose.has(slug)
          ? `La Cita «${slug}» no está publicada: sigue en corpus/_revision/. Una Pieza solo ` +
            'reúne Citas publicadas.'
          : `La Cita «${slug}» no existe en el corpus. Compruebe el slug.`,
      );
      continue;
    }

    if (!admiteImagen(cita.texto)) {
      /*
       * La misma regla que le niega la Imagen de Cita, dicha con su nombre. No es un límite
       * de esta plantilla: por encima de `MAX_CARACTERES_IMAGEN` el texto no cabe sin bajar
       * de un cuerpo legible, y bajarlo o recortarlo está prohibido (FR-10, NFR-12).
       */
      motivos.push(
        `La Cita «${slug}» pasa de ${MAX_CARACTERES_IMAGEN} caracteres —tiene ` +
          `${[...cita.texto].length}—, así que no admite Imagen (FR-10) y tampoco entra en una ` +
          'Pieza: no se recorta para que quepa.',
      );
      continue;
    }

    /*
     * Sin Autor no hay atribución visible, y la atribución es criterio de aceptación de la
     * épica entera. Se comprueba que el Autor esté **y** que traiga nombre: un `.yml` con la
     * clave vacía compondría la Cita con un hueco donde va la firma.
     */
    const autor = autores.get(cita.autor);
    if (autor === undefined) {
      motivos.push(
        `El Autor «${cita.autor}» de la Cita «${slug}» no está en el corpus, así que la Pieza ` +
          'la mostraría sin atribución.',
      );
      continue;
    }
    if (typeof autor.nombre !== 'string' || autor.nombre.trim() === '') {
      motivos.push(
        `El Autor «${cita.autor}» de la Cita «${slug}» no tiene nombre en su ficha, así que la ` +
          'Pieza la mostraría sin atribución. Complételo antes de componer.',
      );
      continue;
    }

    elegidas.push(cita);
  }

  if (motivos.length > 0) {
    motivos.push('No se ha compuesto ninguna Pieza: la selección entra entera o no entra.');
    return { ok: false, motivos };
  }

  const enPieza = elegidas.map((cita) => citaEnPieza(cita, autores.get(cita.autor)!));

  const cabida = cabenEnPieza(enPieza);
  if (!cabida.cabe) {
    return {
      ok: false,
      motivos: [
        `Estas ${enPieza.length} Citas no caben apiladas en la Pieza: de las indicadas caben ` +
          `${cabida.maximo}. No se compone nada, y no se encoge nada: el texto de cada Cita va ` +
          'entero (NFR-12) y su cuerpo lo decide src/lib/tramos.ts, no la plantilla.',
        cabida.maximo < MINIMO_DE_CITAS
          ? `Ninguna combinación de estas Citas por su orden llega a las ${MINIMO_DE_CITAS} que ` +
            'necesita una Pieza: elija Citas más cortas.'
          : 'Quite alguna de la selección, o componga dos Piezas.',
      ],
    };
  }

  /*
   * Y lo que no cabe **a lo ancho**, que es un fallo distinto y peor: el alto se pasa y no
   * hay pieza, pero una palabra indivisible más ancha que el lienzo produce un PNG que sale
   * bien y lleva la palabra cortada. Es la mutilación de NFR-12 sin que nada falle.
   */
  const desbordadas = desbordanALoAncho(enPieza);
  if (desbordadas.length > 0) {
    return {
      ok: false,
      motivos: [
        ...desbordadas.map(
          ({ indice, palabras }) =>
            `En la Cita «${elegidas[indice].slug}» hay texto más ancho que el lienzo y saldría ` +
            `cortado: ${palabras.map((p) => `«${p}»`).join(', ')}. No se parte ni se abrevia ` +
            '(NFR-12), así que esa Cita no entra.',
        ),
        'No se ha compuesto ninguna Pieza: la selección entra entera o no entra.',
      ],
    };
  }

  return escribirPieza({
    salida,
    nombrePorOmision: nombreDePieza(slugs),
    svg: svgDePieza(enPieza),
    encabezado: [`Pieza compuesta con ${enPieza.length} Citas`],
    citas: elegidas,
    autores,
    red,
    destino: DESTINO_SIN_COLECCION,
  });
}

/**
 * Rasteriza, escribe y redacta el parte: lo que las dos composiciones hacen igual.
 *
 * Lo único que las distingue es qué Citas eligieron, qué título lleva el lienzo y a dónde
 * enlaza el texto. Escribir dos veces el rasterizado y el parte dejaría que una dijera «no se
 * versiona» y la otra se olvidara, o que el texto para publicar saliera con otro formato según
 * la orden — dos artefactos de la misma familia que no se parecen.
 */
async function escribirPieza(pieza: {
  /** La ruta que pidió quien llamó, si pidió alguna. Su ausencia **es** el dato. */
  salida?: string;
  /** El nombre derivado que se usa cuando no la pidió, dentro de `piezas/`. */
  nombrePorOmision: string;
  svg: string;
  /**
   * El parte, sin el «en <ruta>» de la primera línea, que lo pone esta función.
   *
   * Tupla no vacía y no `string[]`: con un arreglo vacío la desestructuración de abajo daba
   * `undefined` y la orden anunciaba «undefined en piezas/x.png» con código 0.
   */
  encabezado: [string, ...string[]];
  citas: Cita[];
  autores: Map<string, Autor>;
  red: Red;
  destino: string;
}): Promise<Resultado> {
  const nombreDeLaRed = REDES.find((r) => r.id === pieza.red)!.nombre;
  const [primera, ...resto] = pieza.encabezado;

  /*
   * **El parte se compone antes de escribir nada**, y no es cosmético: `textoDeLaPieza`
   * desreferencia el Autor de cada Cita, así que un llamador que no lo hubiera comprobado
   * moriría **después** de haber dejado el PNG en disco, con código 1 y un fichero huérfano
   * que nadie pidió. «Nada se escribe hasta que todo valida» es el lema del módulo entero, y
   * un ayudante que lo cumple solo porque sus dos llamadores de hoy son cuidadosos no lo
   * cumple: lo cumple el orden de estas líneas.
   */
  /*
   * Lo de «no se versiona» solo es cierto del destino por omisión. Con `--salida` el fichero
   * cae donde diga quien llamó, que puede estar perfectamente dentro del repositorio, y
   * afirmarlo igual convertía el parte en una frase que suena a garantía sin serlo. Cuando el
   * destino lo eligió otro, la responsabilidad es suya y el parte se calla.
   *
   * Se pregunta por **el hecho** —¿hubo `--salida`?— y no por la forma de la ruta ya
   * compuesta. Deducirlo de la cadena obliga a reconocer `piezas/` como prefijo, y esa
   * deducción falla por los dos lados: `join` compone con la barra del sistema, así que en
   * win32 el destino por omisión deja de reconocerse y la línea desaparece justo del caso en
   * el que es verdad; y afinarla para que acierte con rutas relativas, `./` y enlaces
   * simbólicos es trabajo de adivinación para redactar una frase. Quien llamó sabe si eligió
   * el destino; basta con que lo diga.
   */

  const ruta = pieza.salida ?? join(DIRECTORIO_DE_PIEZAS, pieza.nombrePorOmision);

  const mensaje = [
    `${primera} en ${ruta}.`,
    ...resto,
    pieza.salida === undefined
      ? `No se versiona: ${DIRECTORIO_DE_PIEZAS}/ está en .gitignore, y lo versionado es la ` +
        'decisión.'
      : 'Destino indicado con --salida, así que el .gitignore de ' +
        `${DIRECTORIO_DE_PIEZAS}/ puede no cubrirlo: compruébelo. Lo versionado es la ` +
        'decisión, nunca el artefacto (AD-15).',
    '',
    `Texto para publicar en ${nombreDeLaRed}:`,
    '───',
    textoDeLaPieza(pieza.citas, pieza.autores, pieza.red, pieza.destino),
    '───',
  ].join('\n');

  const png = await sharp(Buffer.from(pieza.svg)).png().toBuffer();
  await mkdir(dirname(ruta), { recursive: true });
  await writeFile(ruta, png);

  return { ok: true, ruta, mensaje };
}

/**
 * Compone la Pieza de una Colección — Historia 13.3, FR-22.
 *
 * Hermana de `componerPieza` y con **dos** diferencias, que son el contenido de la historia:
 * la Pieza lleva el nombre de la Colección como título, y su enlace único apunta a la Página
 * de Colección en vez de a la portada. Todo lo demás —lienzo, tramos, atribución visible por
 * Cita, texto íntegro, marca de origen— es lo mismo, reutilizado y no reescrito.
 *
 * Por qué el umbral no se comprueba aquí y por qué esta suborden **sí** excluye en vez de
 * rechazar está escrito una sola vez, en la cabecera de `src/lib/coleccionEnPieza.ts`, que es
 * donde vive el mecanismo. Lo de aquí es el interruptor: leer el corpus, distinguir los cuatro
 * rechazos —no existe, retirada, no cumple el esquema, por debajo del umbral— y contar por
 * salida estándar todo lo que la selección dejó fuera.
 */
export async function componerPiezaDeColeccion(
  rutas: Rutas,
  slug: string,
  red: string,
  salida?: string,
): Promise<Resultado> {
  if (!esRedValida(red)) {
    return {
      ok: false,
      motivos: [
        `«${red}» no es una de las cuentas propias. Una Pieza declara un único enlace y lo ` +
          `marca por red (FR-22); las válidas son: ${redesValidas()}.`,
      ],
    };
  }

  const motivos: string[] = [];

  if (typeof slug !== 'string' || !FORMA_DE_SLUG.test(slug)) {
    // Igual que en la selección de Citas: de este slug sale el nombre del fichero, y uno con
    // `/` o `..` sacaría el PNG de `piezas/`, donde ya no está ignorado por git.
    motivos.push(
      `«${slug}» no tiene forma de slug —minúsculas, cifras y guiones simples—, así que no ` +
        'nombra ninguna Colección y no puede nombrar tampoco el fichero de la Pieza.',
    );
  }
  if (salida !== undefined) motivos.push(...(await motivosDeLaSalida(salida)));
  if (motivos.length > 0) return { ok: false, motivos };

  const declaradas = await leerColecciones(rutas);
  const declarada = declaradas.find((c) => c.slug === slug);
  if (declarada === undefined) {
    /*
     * Una Colección despublicada **se mueve** de directorio (AD-2), así que «retirada» es
     * exactamente no estar en el primero y sí en el segundo. Se distinguen porque la respuesta
     * es distinta: una errata se corrige escribiendo bien, y una retirada se corrige
     * decidiendo volver a publicarla — o no anunciándola, que es lo que aquí se dice.
     */
    const retiradas = await leerColeccionesRetiradas(rutas);
    return {
      ok: false,
      motivos: [
        retiradas.some((c) => c.slug === slug)
          ? `La Colección «${slug}» está retirada, en corpus/_colecciones-retiradas/: lo ` +
            'despublicado no se anuncia.'
          : `La Colección «${slug}» no está en corpus/colecciones/. Compruebe el slug; véalas ` +
            'con «npm run coleccion -- listar».',
      ],
    };
  }

  /*
   * Lo que declara el fichero se lo pregunta al **esquema del build**, y no se compone a mano.
   * `leerColecciones` anuncia `nombre` y `criterio` como opcionales —existe para poder describir
   * un corpus a medio escribir— así que aquí había que decidir qué hacer cuando faltan. Antes
   * se rechazaba el nombre con una redacción propia y se inventaba un criterio vacío en
   * silencio: dos tratos distintos para el mismo defecto, y el segundo escondiéndolo. Ahora la
   * respuesta es una: si el build no admitiría ese fichero, tampoco se anuncia, y el motivo lo
   * redacta quien conoce el esquema.
   */
  const declaracion = await declaracionDeColeccion(declarada);
  if (!declaracion.ok) return { ok: false, motivos: declaracion.motivos };

  const citas = (await leerCitas(rutas.citas)) as unknown as Cita[];
  const autores = new Map(
    ((await leerAutores(rutas)) as unknown as Autor[]).map((a) => [a.slug, a]),
  );

  const [publicada] = coleccionesPublicadas([{ slug, ...declaracion.datos }], citas);

  if (publicada === undefined) {
    /*
     * El recuento y lo que falta se dicen con el mismo renglón que la vista de huecos y la
     * orden de curación, y con el mismo puente ya escrito: quien lee esto acaba de mirar «npm
     * run coleccion -- estado» y tiene que reconocer la línea. Ni el umbral ni el recuento se
     * calculan aquí.
     */
    const [hueco] = coleccionesParaHuecos([declarada], citas).map(huecoDeColeccion);
    return {
      ok: false,
      motivos: [
        `La Colección «${slug}» no está publicada, así que no hay nada que anunciar de ella:`,
        `  ${lineaDeHueco(hueco)}`,
        'No se anuncia lo que no está publicado. Asígnele Citas con «npm run coleccion -- ' +
          'asignar» y vuelva cuando se publique.',
      ],
    };
  }

  const delTitulo = palabrasDelTituloQueDesbordan(publicada.nombre);
  if (delTitulo.length > 0) {
    /*
     * El título no se puede excluir como se excluye una Cita: es lo que la Pieza anuncia. Si no
     * cabe a lo ancho, no hay Pieza — el rasterizado no fallaría, publicaría el nombre cortado.
     */
    return {
      ok: false,
      motivos: [
        `El nombre de la Colección «${slug}» tiene texto más ancho que el lienzo y saldría ` +
          `cortado: ${delTitulo.map((p) => `«${p}»`).join(', ')}. No se parte ni se abrevia ` +
          '(NFR-12), y el nombre no se puede dejar fuera: es lo que la Pieza anuncia.',
      ],
    };
  }

  const seleccion = seleccionDeColeccion(publicada, autores);

  const fuera =
    seleccion.fuera.length === 0
      ? []
      : [
          'Quedan fuera de la Pieza, en el orden declarado en la Colección:',
          ...seleccion.fuera.map((f) => `  · «${f.slug}»: ${f.motivo}.`),
          'Ninguna se recorta ni se encoge para que quepa: el texto va entero o no va (NFR-12).',
        ];

  /*
   * Y los miembros que **ni siquiera resuelven**, que son la exclusión que el curador no
   * provocó: un slug con errata y una Cita retirada a revisión se comportan igual —los dos
   * desaparecen— y desde aquí no se distinguen, exactamente como en el desajuste que
   * `publicado.ts` cuenta en cada construcción. Sin esta lista, una Colección de veinte
   * miembros con cinco en revisión anuncia «N de sus 15» y los cinco no existen para nadie.
   */
  const perdidos =
    seleccion.sinResolver.length === 0
      ? []
      : [
          `La Colección declara ${seleccion.sinResolver.length} miembro(s) que no son ninguna ` +
            'Cita publicada —errata en el slug, o Cita retirada a corpus/_revision/—, así que ' +
            'no cuentan ni para el umbral ni para la Pieza:',
          ...seleccion.sinResolver.map((s) => `  · «${s}»`),
        ];

  if (seleccion.citas.length < MINIMO_DE_CITAS) {
    return {
      ok: false,
      motivos: [
        `Una Pieza reúne al menos ${MINIMO_DE_CITAS} Citas, y de la Colección «` +
          `${publicada.nombre}» solo entran ${seleccion.citas.length} de sus ` +
          `${publicada.citas.length}:`,
        ...fuera,
        ...perdidos,
        /*
         * Y se nombra al culpable cuando lo es. Un nombre de Colección de varias líneas se come
         * el alto útil, y sin esta línea el parte enumeraba quince Citas «que no caben» sin
         * mencionar ni una vez lo único que había que cambiar.
         */
        ...(seleccion.elTituloEstorba
          ? [
              `El nombre «${publicada.nombre}» ocupa tanto alto que no deja sitio para las ` +
                'Citas que cabrían sin él. Acorte el nombre de la Colección: la Pieza no lo ' +
                'recorta ni encoge las Citas para que quepan (NFR-12).',
            ]
          : []),
        'No se compone nada.',
      ],
    };
  }

  return escribirPieza({
    salida,
    nombrePorOmision: nombreDePiezaDeColeccion(slug),
    svg: svgDePieza(seleccion.enPieza, { titulo: seleccion.titulo }),
    encabezado: [
      `Pieza de la Colección «${publicada.nombre}» compuesta con ${seleccion.citas.length} de ` +
        `sus ${publicada.citas.length} Citas`,
      ...fuera,
      ...perdidos,
    ],
    citas: seleccion.citas,
    autores,
    red,
    destino: rutaDeColeccion(slug),
  });
}
