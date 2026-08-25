/**
 * Gestión de Autores y Temas, y marcado de Citas — FR-15.
 *
 * Las restricciones del modelo se aplican aquí con las **mismas** definiciones de
 * `src/lib/admision.ts` que aplica el build (AD-1). Lo que estas funciones añaden sobre
 * escribir el fichero a mano son las dos reglas que el esquema no puede ver, porque no
 * son de un fichero sino de la relación entre varios:
 *
 *   · un Tema con Citas publicadas asociadas no se elimina;
 *   · un Autor no se crea sin año de fallecimiento, ni siquiera «para completarlo luego»,
 *     porque ese hueco bloquea después la publicación de todas sus Citas.
 */

import { rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { autorAdmisible, nombre as nombreDeEntidad, tradicion } from '../../src/lib/admision.ts';
import { slugDeAutor, slugDeTema } from '../../src/lib/slug.ts';
import {
  escribirAutor,
  escribirCita,
  escribirTema,
  leerAutores,
  leerCitas,
  leerTemas,
  nombreDeFicheroDeCita,
  separarFrontmatter,
  type Rutas,
} from './corpus.ts';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

export type Resultado =
  | { ok: true; ruta: string; mensaje: string }
  | { ok: false; motivos: string[] };

/**
 * Las tres tradiciones, derivadas del esquema y no reescritas aquí.
 *
 * `admision.ts` es el dueño (AD-1). Copiar la lista habría dejado la orden aceptando
 * etiquetas que el esquema rechaza, o al revés, sin que nada lo notara hasta el build.
 */
export type Tradicion = (typeof tradicion)['options'][number];

/** Las tradiciones válidas, para enumerarlas en el rechazo de la orden. */
export const TRADICIONES: readonly Tradicion[] = tradicion.options;

export interface DatosDeAutor {
  nombre?: string;
  añoFallecimiento?: number;
  añoNacimiento?: number;
  semblanza?: string;
  /**
   * La tradición del Autor — §6.1 del PRD, y el dato del que sale el suelo del 40 %.
   *
   * Sigue siendo opcional en el esquema, por la razón que `admision.ts` explica: obligarla
   * empujaría a rellenarla a ojo y la proporción pasaría a medir suposiciones. Lo que **no**
   * puede ser es intecleable: hasta la Historia 11.4 la orden no la aceptaba, así que un
   * `--tradicion latinoamericana` se tragaba en silencio y el Autor quedaba sin declarar.
   * Con la orden diciendo «creado» y el fichero sin el campo, el suelo del 40 % no se movía
   * y nadie sabía por qué.
   */
  tradicion?: Tradicion;
}

/**
 * Crea un Autor. Rechaza si falta cualquier campo obligatorio, y en particular el año de
 * fallecimiento: es el dato que sostiene que la obra está en dominio público.
 */
export async function crearAutor(rutas: Rutas, datos: DatosDeAutor): Promise<Resultado> {
  const validado = autorAdmisible.safeParse(datos);
  if (!validado.success) {
    return {
      ok: false,
      motivos: validado.error.issues.map((i) =>
        i.path.length > 0 ? `${i.path.join('.')}: ${i.message}` : i.message,
      ),
    };
  }

  const slug = slugDeAutor(validado.data.nombre);
  if (existsSync(join(rutas.autores, `${slug}.yml`))) {
    return { ok: false, motivos: [`El Autor «${slug}» ya existe. Use «editar» para cambiarlo.`] };
  }

  const ruta = await escribirAutor(rutas, slug, {
    nombre: validado.data.nombre,
    // El orden importa para quien lee el fichero: nacimiento antes que fallecimiento.
    añoNacimiento: validado.data.añoNacimiento,
    añoFallecimiento: validado.data.añoFallecimiento,
    semblanza: validado.data.semblanza,
    // `aYaml` omite lo que no tiene valor, así que un Autor sin declarar sale sin la clave.
    tradicion: validado.data.tradicion,
  });
  return { ok: true, ruta, mensaje: `Autor «${slug}» creado.` };
}

/** Edita un Autor existente. Los campos omitidos se conservan; los vacíos, se rechazan. */
export async function editarAutor(
  rutas: Rutas,
  slug: string,
  cambios: DatosDeAutor,
): Promise<Resultado> {
  const autores = await leerAutores(rutas);
  const actual = autores.find((a) => a.slug === slug);
  if (!actual) return { ok: false, motivos: [`El Autor «${slug}» no existe en el corpus.`] };

  const fusion = {
    nombre: cambios.nombre ?? actual.nombre,
    añoNacimiento: cambios.añoNacimiento ?? actual.añoNacimiento,
    añoFallecimiento: cambios.añoFallecimiento ?? actual.añoFallecimiento,
    semblanza: cambios.semblanza ?? actual.semblanza,
    tradicion: cambios.tradicion ?? actual.tradicion,
  };

  const validado = autorAdmisible.safeParse(fusion);
  if (!validado.success) {
    return {
      ok: false,
      motivos: validado.error.issues.map((i) =>
        i.path.length > 0 ? `${i.path.join('.')}: ${i.message}` : i.message,
      ),
    };
  }

  // El slug del fichero no se recalcula aunque cambie el nombre: es la URL pública del
  // Autor y cambiarla rompería los enlaces entrantes, igual que con las Citas (AD-4).
  const ruta = await escribirAutor(rutas, slug, fusion);
  return { ok: true, ruta, mensaje: `Autor «${slug}» actualizado.` };
}

export async function crearTema(rutas: Rutas, nombre: string): Promise<Resultado> {
  /*
   * La regla se pregunta, no se copia. El mensaje estaba escrito a mano aquí y otra vez en
   * `admision.ts`, y desde que el artículo del mensaje es un parámetro las dos copias
   * pueden divergir sin que nada lo note: la herramienta diría «falta el nombre del Tema» y
   * el build otra cosa, sobre la misma regla. Una definición, dos consumidores (AD-1).
   */
  const validado = nombreDeEntidad('Tema').safeParse(nombre);
  if (!validado.success) {
    return { ok: false, motivos: validado.error.issues.map((i) => i.message) };
  }
  const slug = slugDeTema(nombre);
  if (existsSync(join(rutas.temas, `${slug}.yml`))) {
    return { ok: false, motivos: [`El Tema «${slug}» ya existe.`] };
  }
  const ruta = await escribirTema(rutas, slug, { nombre });
  return { ok: true, ruta, mensaje: `Tema «${slug}» creado.` };
}

/**
 * Elimina un Tema. Se rechaza si alguna Cita **publicada** lo usa, y el rechazo dice
 * cuántas: eliminarlo dejaría esas Citas apuntando a un Tema inexistente y sus chips
 * enlazarían a un 404.
 */
export async function eliminarTema(rutas: Rutas, slug: string): Promise<Resultado> {
  const temas = await leerTemas(rutas);
  if (!temas.some((t) => t.slug === slug)) {
    return { ok: false, motivos: [`El Tema «${slug}» no existe en el corpus.`] };
  }

  const publicadas = await leerCitas(rutas.citas);
  const usan = publicadas.filter((c) => (c.temas ?? []).includes(slug));
  if (usan.length > 0) {
    return {
      ok: false,
      motivos: [
        `El Tema «${slug}» lo usan ${usan.length} Cita${usan.length === 1 ? '' : 's'} ` +
          'publicada' + (usan.length === 1 ? '' : 's') + '. Retírelo de esas Citas antes ' +
          'de eliminarlo.',
        ...usan.slice(0, 5).map((c) => `  · ${c.slug}`),
        ...(usan.length > 5 ? [`  · … y ${usan.length - 5} más.`] : []),
      ],
    };
  }

  const ruta = join(rutas.temas, `${slug}.yml`);
  await rm(ruta);
  return { ok: true, ruta, mensaje: `Tema «${slug}» eliminado. Su historia sigue en git.` };
}

/**
 * Marca o desmarca una Cita como apta para portada — FR-15, consumido por FR-9.
 *
 * El marcado queda registrado en el fichero de la Cita. Al desmarcar, el campo se omite
 * en lugar de escribirse como `false`: la convención del proyecto es que un campo sin
 * valor no aparece, y `false` invita a leerlo como una decisión tomada.
 */
export async function marcarAptaParaPortada(
  rutas: Rutas,
  slugCita: string,
  apta: boolean,
): Promise<Resultado> {
  const publicadas = await leerCitas(rutas.citas);
  const cita = publicadas.find((c) => c.slug === slugCita);
  if (!cita) {
    return {
      ok: false,
      motivos: [
        `La Cita «${slugCita}» no está publicada. Solo se marca lo publicado: una Cita ` +
          'en revisión no puede salir en portada.',
      ],
    };
  }

  const bruto = await readFile(cita.ruta, 'utf8');
  const datos = separarFrontmatter(bruto);
  if (!datos) return { ok: false, motivos: [`El fichero ${cita.ruta} no tiene frontmatter.`] };

  if (apta) datos.aptaParaPortada = true;
  else delete datos.aptaParaPortada;

  const ruta = await escribirCita(
    rutas.citas,
    basename(cita.ruta, '.md'),
    datos,
  );
  return {
    ok: true,
    ruta,
    mensaje: apta
      ? `La Cita «${slugCita}» queda marcada como apta para portada.`
      : `La Cita «${slugCita}» deja de estar marcada como apta para portada.`,
  };
}

/** Nombre de fichero canónico de una Cita, reexportado para las herramientas. */
export { nombreDeFicheroDeCita };

/**
 * Marca un Tema en Citas que **ya están publicadas** — Historia 15.5, tramo de anchura de la Meta.
 *
 * Faltaba, y se notó tarde. `crearTema` abre el Tema y `darDeAltaLote` escribe Citas nuevas con
 * los suyos; poner un Tema a Citas que llevan meses publicadas no lo sabía hacer nadie. Un Tema
 * nuevo, sin embargo, casi nunca nace de Citas nuevas: nace de reconocer que diecisiete de las
 * que ya están hablan de lo mismo. Sin esta orden, el tramo de anchura obliga a editar frontmatter
 * a mano quince veces, y la primera vez que se hizo salió un fallo —el script saltaba las Citas
 * cuyo **slug** contiene el slug del Tema, que eran justo las más centradas en él—.
 *
 * Tres decisiones que la prueba fija:
 *
 *   · **Comprueba todo antes de escribir nada.** Un lote con una errata en un slug no deja media
 *     docena de Citas marcadas y el resto no: se rechaza entero y el corpus queda como estaba.
 *   · **No toca el texto** (NFR-12). Se lee el frontmatter, se añade una entrada a `temas` y se
 *     vuelve a escribir; el texto viaja intacto porque nadie lo mira.
 *   · **Es idempotente y lo dice.** Volver a asignar no duplica la entrada, y el mensaje distingue
 *     cuántas se marcaron de cuántas ya lo tenían: quien repite un lote necesita saber si hizo
 *     algo o no.
 *
 * Lo que **no** hace es decidir qué Citas van a qué Tema. Eso es curación y se lee una a una,
 * como las Colecciones: un barrido por palabra clave mete «no quiero ruido con el Santo Oficio»
 * en el Tema del trabajo.
 */
export async function asignarTema(
  rutas: Rutas,
  slugTema: string,
  slugsDeCitas: string[],
): Promise<Resultado> {
  const temas = await leerTemas(rutas);
  if (!temas.some((t) => t.slug === slugTema)) {
    return {
      ok: false,
      motivos: [
        `El Tema «${slugTema}» no existe. Créelo primero con: npx tsx tools/tema.ts crear "<Nombre>"`,
      ],
    };
  }

  if (slugsDeCitas.length === 0) {
    return { ok: false, motivos: ['Indique al menos una Cita a la que asignar el Tema.'] };
  }

  const publicadas = await leerCitas(rutas.citas);
  const porSlug = new Map(publicadas.map((c) => [c.slug, c]));
  const noEstan = slugsDeCitas.filter((s) => !porSlug.has(s));
  if (noEstan.length > 0) {
    return {
      ok: false,
      motivos: [
        `No están publicadas: ${noEstan.join(', ')}. Un Tema se asigna a lo publicado, y el ` +
          'lote se rechaza entero para no dejar unas Citas marcadas y otras no.',
      ],
    };
  }

  let marcadas = 0;
  let yaLoTenian = 0;
  for (const slug of new Set(slugsDeCitas)) {
    const cita = porSlug.get(slug)!;
    const bruto = await readFile(cita.ruta, 'utf8');
    const datos = separarFrontmatter(bruto);
    if (!datos) return { ok: false, motivos: [`El fichero ${cita.ruta} no tiene frontmatter.`] };

    const actuales = Array.isArray(datos.temas) ? (datos.temas as string[]) : [];
    if (actuales.includes(slugTema)) {
      yaLoTenian += 1;
      continue;
    }
    datos.temas = [...actuales, slugTema];
    await escribirCita(rutas.citas, basename(cita.ruta, '.md'), datos);
    marcadas += 1;
  }

  const citas = (n: number) => `${n} ${n === 1 ? 'Cita' : 'Citas'}`;
  return {
    ok: true,
    /*
     * `Resultado` trae una sola `ruta` porque sus hermanas escriben un fichero. Esta escribe
     * tantos como Citas se marquen, así que devuelve el directorio: es lo único cierto que
     * cabe en el campo. Quien quiera el detalle lo tiene en el mensaje, que cuenta cuántas.
     */
    ruta: rutas.citas,
    mensaje:
      `Tema «${slugTema}»: ${citas(marcadas)} marcadas` +
      (yaLoTenian > 0
        ? `, ${citas(yaLoTenian)} ya lo ${yaLoTenian === 1 ? 'tenía' : 'tenían'}.`
        : '.'),
  };
}
