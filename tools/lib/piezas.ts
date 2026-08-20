/**
 * Componer una Pieza de Canal de varias Citas — Historia 13.2, FR-22.
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
import { procedenciaCompuesta, textoParaCopiar } from '../../src/lib/atribucion.ts';
import { SITIO } from '../../src/lib/dominio.ts';
import {
  MINIMO_DE_CITAS,
  cabenEnPieza,
  desbordanALoAncho,
  svgDePieza,
  type CitaEnPieza,
} from '../../src/lib/pieza.ts';
import type { Autor, Cita } from '../../src/lib/publicado.ts';
import { REDES, enlaceConOrigen, esRedValida, type Red } from '../../src/lib/redes.ts';
import { admiteImagen } from '../../src/lib/tramos.ts';
import { MAX_CARACTERES_IMAGEN } from '../../src/lib/umbrales.ts';
import { leerAutores, leerCitas, type Rutas } from './corpus.ts';
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
 * El texto que acompaña a la Pieza al publicarla.
 *
 * La atribución de cada Cita sale de `atribucion.ts`, **la misma** que se lleva el visitante
 * al copiar y la misma que compone la Imagen. Redactarla aquí publicaría «Séneca, Cartas a
 * Lucilio» donde el sitio dice «Séneca — Cartas a Lucilio, 65», y nadie lo vería hasta tener
 * las dos delante.
 *
 * Y **un solo enlace**, marcado por red (FR-22). Una Pieza de tres Citas no puede enlazar a
 * una de ellas sin favorecerla; la portada es la única superficie que las contiene a todas
 * sin elegir. La 13.3 sustituye ese destino por la Página de Colección, y esa es exactamente
 * la diferencia entre las dos historias.
 */
export function textoDeLaPieza(citas: Cita[], autores: Map<string, Autor>, red: Red): string {
  const atribuidas = citas.map((cita) => textoParaCopiar(cita, autores.get(cita.autor)!));
  return `${atribuidas.join('\n\n')}\n\n${SITIO}${enlaceConOrigen('/', red)}`;
}

/**
 * Una Cita del corpus, tal y como entra en el lienzo.
 *
 * La procedencia la compone `atribucion.ts` —el mismo dueño que la del texto que se publica—
 * para que la obra escrita **dentro** de la imagen y la del pie digan lo mismo hasta la coma.
 */
export function citaEnPieza(cita: Cita, autor: Autor): CitaEnPieza {
  return { texto: cita.texto, autor: autor.nombre, procedencia: procedenciaCompuesta(cita) };
}

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

  const ruta = salida ?? join(DIRECTORIO_DE_PIEZAS, nombreDePieza(slugs));
  const png = await sharp(Buffer.from(svgDePieza(enPieza))).png().toBuffer();
  await mkdir(dirname(ruta), { recursive: true });
  await writeFile(ruta, png);

  const nombreDeLaRed = REDES.find((r) => r.id === red)!.nombre;

  return {
    ok: true,
    ruta,
    mensaje: [
      `Pieza compuesta con ${enPieza.length} Citas en ${ruta}.`,
      'No se versiona: piezas/ está en .gitignore, y lo versionado es la decisión.',
      '',
      `Texto para publicar en ${nombreDeLaRed}:`,
      '───',
      textoDeLaPieza(elegidas, autores, red),
      '───',
    ].join('\n'),
  };
}
