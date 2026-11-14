/**
 * La única orden que cambia una Cita atribuida publicada — Historia 35.6, AD-35.
 *
 *   npm run atribuida -- obra <slug> "<obra>"
 *   npm run atribuida -- autor <slug> <slug-de-autor>
 *   npm run atribuida -- personaje <slug> <slug-de-personaje>
 *   npm run atribuida -- variante <slug> "<texto>" --region <región> --origen <origen>
 *   npm run atribuida -- texto <slug> "<texto>"
 *
 * Una atribuida publicada no se edita a mano: el esquema no ve su Ficha de Obra, sus topes ni
 * los duplicados entre clases, y `documentar` se niega ante ella. Esta función es el camino:
 *
 *   · `obra`, `autor` y `personaje` **añaden** —con el campo ya declarado se niega—; la clase
 *     sigue siendo atribuida (`claseQueCorresponde`) y, si la Cita ya tenía Obra, la ficha que
 *     resuelve tiene que ser la misma de antes (`fichaDeCita`): añadir el Autor a la Cita de un
 *     Personaje no puede mudarla a otra Obra;
 *   · `variante` declara o sustituye la Variante; `texto`, el texto principal. Lo nuevo se parece
 *     al texto **o** a la Variante publicados por encima de `MIN_PARECIDO_PARA_CORREGIR`
 *     (`parecidoDeTextos`, AD-3), y un texto canónicamente igual a la Variante (o una Variante
 *     igual al texto) **intercambia** los dos textos y sus dos `origen`, sin tocar la región;
 *   · el slug y el nombre del fichero no cambian nunca (AD-4).
 *
 * Lo nuevo pasa por las mismas puertas que el alta: el esquema (`citaAdmisible`), y los topes, la
 * figura sin Obra y los duplicados entre clases (`fallosDeAtribuidas`) contra lo publicado —con la
 * Cita sustituida— y `corpus/_revision/`. La puerta se carga como en el alta: por parámetro, y por
 * omisión la del árbol; **cerrada, toda invocación sale con 1 sin escribir nada**. Se escribe la
 * Cita y después la ficha; si la ficha falla, la Cita vuelve a su contenido original.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import {
  escribirCita,
  leerAutores,
  leerCitas,
  leerFichasDeObra,
  leerPersonajes,
  separarFrontmatter,
  type CitaEnCorpus,
  type Rutas,
} from './corpus.ts';
import type { Resultado } from './gestion.ts';
import { citaAdmisible, ORIGENES_DE_VARIANTE } from '../../src/lib/admision.ts';
import { claseDe, claseQueCorresponde, esAtribuida } from '../../src/lib/clase.ts';
import { fichaDeCita, indiceDeFichas } from '../../src/lib/obras.ts';
import { normalizar } from '../../src/lib/normalizar.ts';
import { CLAVES_DE_REGION, esRegionDeVariante } from '../../src/lib/variante.ts';
import { MIN_PARECIDO_PARA_CORREGIR, cifraDeParecido, parecidoDeTextos } from './parecido.ts';
import {
  VALORES_DEL_ARBOL,
  fallosDeAtribuidas,
  fichaPlaneada,
  motivoPuertaCerrada,
  motivosDe,
  planDaFichaAlAutor,
  textoDeVariante,
  type CitaParaAtribuidas,
  type ValoresDeLaPuerta,
} from './atribuidas.ts';
import { aplicarFichaDeObra, resolverFichaDeObra, type PlanDeFicha } from './obras.ts';
import { leerFormasVedadas, type FormaVedada } from './formasVedadas.ts';

/** Las cinco subórdenes, en el orden en que se nombran. */
export const SUBORDENES_DE_ATRIBUIDA = ['obra', 'autor', 'personaje', 'variante', 'texto'] as const;

export type CambioDeAtribuida =
  | { tipo: 'obra'; slug: string; obra: string }
  | { tipo: 'autor'; slug: string; autor: string }
  | { tipo: 'personaje'; slug: string; personaje: string }
  | { tipo: 'variante'; slug: string; texto: string; region: string; origen: string }
  | { tipo: 'texto'; slug: string; texto: string };

export interface OpcionesDeCambio {
  /** Los valores de la puerta; por omisión, los del árbol (`VALORES_DEL_ARBOL`). */
  puerta?: ValoresDeLaPuerta;
}

function negar(...motivos: string[]): Resultado {
  return { ok: false, motivos: [...motivos, 'No se ha escrito nada.'] };
}

/** Lo que la puerta de la atribuida necesita de una Cita leída del disco. */
function paraElJuicio(c: {
  slug: string;
  texto: string;
  autor?: string;
  personaje?: string;
  clase?: unknown;
  procedencia?: { obra?: string } | null;
  atestiguaciones?: unknown;
  variante?: unknown;
}): CitaParaAtribuidas {
  const variante = textoDeVariante(c);
  return {
    slug: c.slug,
    texto: typeof c.texto === 'string' ? c.texto : '',
    ...(variante !== undefined ? { variante } : {}),
    ...(c.autor !== undefined ? { autor: c.autor } : {}),
    ...(c.personaje !== undefined ? { personaje: c.personaje } : {}),
    ...(esAtribuida(c) ? { clase: claseDe(c) } : {}),
    ...(c.procedencia !== undefined && c.procedencia !== null ? { procedencia: c.procedencia } : {}),
    ...(c.atestiguaciones !== undefined ? { atestiguaciones: c.atestiguaciones } : {}),
  };
}

/** El mejor parecido de `nuevo` con alguno de `contra`, sobre la forma canónica (AD-3). */
function mejorParecido(nuevo: string, contra: readonly string[]): number {
  return Math.max(0, ...contra.map((t) => parecidoDeTextos(nuevo, t)));
}

/**
 * Compone el frontmatter nuevo de la Cita, o por qué no. Solo lee `datos` —el fichero tal como
 * está— y devuelve una copia: nada se escribe aquí.
 */
function componer(
  cambio: CambioDeAtribuida,
  datos: Record<string, unknown>,
): { ok: true; datos: Record<string, unknown>; nota?: string } | { ok: false; motivos: string[] } {
  const nuevos: Record<string, unknown> = { ...datos };
  const slug = cambio.slug;
  const texto = typeof datos.texto === 'string' ? datos.texto : '';
  const variante =
    datos.variante !== null && typeof datos.variante === 'object'
      ? (datos.variante as { texto?: unknown; region?: unknown; origen?: unknown })
      : undefined;
  const textoDeLaVariante = typeof variante?.texto === 'string' ? variante.texto : undefined;

  switch (cambio.tipo) {
    case 'obra': {
      const procedencia =
        datos.procedencia !== null && typeof datos.procedencia === 'object'
          ? (datos.procedencia as Record<string, unknown>)
          : {};
      if (procedencia.obra !== undefined) {
        return {
          ok: false,
          motivos: [
            `«${slug}» ya declara la Obra «${String(procedencia.obra)}»: esta orden solo añade la Obra a una ` +
              'atribuida que no la tiene, no la cambia.',
          ],
        };
      }
      const obra = cambio.obra.trim();
      if (obra === '') return { ok: false, motivos: ['La Obra no puede ir en blanco.'] };
      nuevos.procedencia = { obra, ...procedencia };
      return { ok: true, datos: nuevos };
    }
    case 'autor': {
      if (datos.autor !== undefined) {
        return {
          ok: false,
          motivos: [`«${slug}» ya declara el Autor «${String(datos.autor)}»: esta orden solo lo añade, no lo cambia.`],
        };
      }
      return { ok: true, datos: conClaveTras(nuevos, 'autor', cambio.autor, 'texto') };
    }
    case 'personaje': {
      if (datos.personaje !== undefined) {
        return {
          ok: false,
          motivos: [
            `«${slug}» ya declara el Personaje «${String(datos.personaje)}»: esta orden solo lo añade, no lo cambia.`,
          ],
        };
      }
      nuevos.personaje = cambio.personaje;
      return { ok: true, datos: nuevos };
    }
    case 'variante': {
      if (!esRegionDeVariante(cambio.region)) {
        return {
          ok: false,
          motivos: [
            `«${cambio.region}» no es una región de Variante: ${CLAVES_DE_REGION.map((r) => `«${r}»`).join(', ')}.`,
          ],
        };
      }
      if (!(ORIGENES_DE_VARIANTE as readonly string[]).includes(cambio.origen)) {
        return {
          ok: false,
          motivos: [
            `«${cambio.origen}» no es un origen de Variante: ${ORIGENES_DE_VARIANTE.map((o) => `«${o}»`).join(', ')}` +
              ' —una Variante es la letra que circula en otra región, nunca una traducción del sitio—.',
          ],
        };
      }
      // Una Variante igual al texto: con Variante declarada, es el intercambio; sin ella, nada.
      if (normalizar(cambio.texto) === normalizar(texto)) {
        if (textoDeLaVariante === undefined) {
          return {
            ok: false,
            motivos: [`La Variante que se declara es el texto de «${slug}»: una Variante es otra letra de la frase.`],
          };
        }
        if (cambio.region !== variante?.region || cambio.origen !== datos.origen) {
          return {
            ok: false,
            motivos: [
              `Una Variante igual al texto intercambia los dos, y la Variante resultante sería ` +
                `{region: ${String(variante?.region)}, origen: ${String(datos.origen)}}: el intercambio no cambia la ` +
                'región, y cada texto conserva su origen. Declárela con esos valores.',
            ],
          };
        }
        // La Variante que resulta es la letra tecleada, no la guardada: puede corregirla.
        return intercambio(nuevos, textoDeLaVariante, variante!.origen, cambio.texto, variante!.region, datos.origen);
      }
      const contra = [texto, ...(textoDeLaVariante !== undefined ? [textoDeLaVariante] : [])];
      const parecido = mejorParecido(cambio.texto, contra);
      if (parecido < MIN_PARECIDO_PARA_CORREGIR) return { ok: false, motivos: [motivoDeParecido('La Variante nueva', parecido)] };
      nuevos.variante = { texto: cambio.texto, region: cambio.region, origen: cambio.origen };
      return { ok: true, datos: nuevos };
    }
    case 'texto': {
      if (textoDeLaVariante !== undefined && normalizar(cambio.texto) === normalizar(textoDeLaVariante)) {
        // El texto que resulta es la letra tecleada, no la guardada: puede corregirla.
        return intercambio(nuevos, cambio.texto, variante!.origen, texto, variante!.region, datos.origen);
      }
      const contra = [texto, ...(textoDeLaVariante !== undefined ? [textoDeLaVariante] : [])];
      const parecido = mejorParecido(cambio.texto, contra);
      if (parecido < MIN_PARECIDO_PARA_CORREGIR) return { ok: false, motivos: [motivoDeParecido('El texto nuevo', parecido)] };
      nuevos.texto = cambio.texto;
      return { ok: true, datos: nuevos };
    }
  }
}

/**
 * El intercambio de principal y Variante: los dos textos y sus dos `origen`; la región, igual.
 * Recibe ya el texto principal y el de la Variante que resultan —el que se tecleó entra con su
 * letra, que puede corregir la guardada en la puntuación o en las mayúsculas—.
 */
function intercambio(
  nuevos: Record<string, unknown>,
  principal: string,
  origenDelPrincipal: unknown,
  deLaVariante: string,
  region: unknown,
  origenDeLaVariante: unknown,
): { ok: true; datos: Record<string, unknown>; nota: string } {
  nuevos.texto = principal;
  nuevos.origen = origenDelPrincipal;
  nuevos.variante = { texto: deLaVariante, region, origen: origenDeLaVariante };
  return { ok: true, datos: nuevos, nota: 'Intercambiados el texto y la Variante, con sus dos origen; la región no cambia.' };
}

function motivoDeParecido(que: string, parecido: number): string {
  return (
    `${que} se parece ${cifraDeParecido(parecido)} al texto o a la Variante publicados, y hace falta ` +
    `${cifraDeParecido(MIN_PARECIDO_PARA_CORREGIR)} (MIN_PARECIDO_PARA_CORREGIR): esta orden corrige la letra de ` +
    'una atribuida, no la cambia por otra frase. Otra frase es otra Cita.'
  );
}

/** Una copia del objeto con la clave nueva justo detrás de `tras` (o al final si no está). */
function conClaveTras(objeto: Record<string, unknown>, clave: string, valor: unknown, tras: string): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  let puesta = false;
  for (const [k, v] of Object.entries(objeto)) {
    salida[k] = v;
    if (k === tras) {
      salida[clave] = valor;
      puesta = true;
    }
  }
  if (!puesta) salida[clave] = valor;
  return salida;
}

/** Cambia una atribuida publicada, o dice por qué no. Nunca cambia su slug ni su fichero. */
export async function cambiarAtribuida(
  rutas: Rutas,
  cambio: CambioDeAtribuida,
  opciones: OpcionesDeCambio = {},
): Promise<Resultado> {
  const puerta = opciones.puerta ?? VALORES_DEL_ARBOL;
  const cerrada = motivoPuertaCerrada(puerta);
  if (cerrada !== undefined) return negar(`No se cambia ninguna atribuida: ${cerrada}`);

  let publicadas: CitaEnCorpus[];
  let enRevision: CitaEnCorpus[];
  try {
    [publicadas, enRevision] = await Promise.all([leerCitas(rutas.citas), leerCitas(rutas.revision)]);
  } catch (fallo) {
    return negar(`El Corpus no se deja leer (${fallo instanceof Error ? fallo.message : String(fallo)}).`);
  }
  const cita = publicadas.find((c) => c.slug === cambio.slug);
  if (cita === undefined) {
    return negar(
      enRevision.some((c) => c.slug === cambio.slug)
        ? `«${cambio.slug}» no está publicada: está en ${rutas.revision}. Esta orden cambia una atribuida publicada; ` +
            'una candidata se aprueba con «npx tsx tools/revisar.ts --aprobar».'
        : `No hay ninguna Cita publicada con el slug «${cambio.slug}» en ${rutas.citas}.`,
    );
  }
  if (!esAtribuida(cita)) {
    return negar(
      `«${cambio.slug}» es de la clase de siempre, y la clase no cambia: esta orden solo cambia una atribuida. ` +
        'Una Cita de siempre se documenta con «npm run documentar».',
    );
  }

  let original: string;
  try {
    original = await readFile(cita.ruta, 'utf8');
  } catch (fallo) {
    return negar(`${cita.ruta} no se deja leer (${fallo instanceof Error ? fallo.message : String(fallo)}).`);
  }
  const datos = separarFrontmatter(original);
  if (datos === null) return negar(`${cita.ruta} no tiene frontmatter.`);

  const compuesto = componer(cambio, datos);
  if (!compuesto.ok) return negar(...compuesto.motivos);
  const nuevos = compuesto.datos;
  // Un cambio que deja la Cita como estaba no reescribe nada ni se da por hecho; el orden de las
  // claves en el fichero no cuenta.
  if (isDeepStrictEqual(nuevos, datos)) {
    return negar(`Nada que cambiar: «${cambio.slug}» ya dice eso.`);
  }

  // ── El Autor o el Personaje que se añade existe ──
  let autores: Awaited<ReturnType<typeof leerAutores>>;
  let personajes: Awaited<ReturnType<typeof leerPersonajes>>;
  let fichasEnDisco: Awaited<ReturnType<typeof leerFichasDeObra>>;
  // Historia 35.7 — las formas vedadas: el texto o la Variante nuevos tampoco pueden coincidir.
  let vedadas: FormaVedada[];
  try {
    [autores, personajes, fichasEnDisco, vedadas] = await Promise.all([
      leerAutores(rutas),
      leerPersonajes(rutas),
      leerFichasDeObra(rutas),
      leerFormasVedadas(rutas),
    ]);
  } catch (fallo) {
    return negar(`El Corpus no se deja leer (${fallo instanceof Error ? fallo.message : String(fallo)}).`);
  }
  if (cambio.tipo === 'autor' && !autores.some((a) => a.slug === cambio.autor)) {
    return negar(`El Autor «${cambio.autor}» no existe en ${rutas.autores}.`);
  }
  if (cambio.tipo === 'personaje' && !personajes.some((p) => p.slug === cambio.personaje)) {
    return negar(`El Personaje «${cambio.personaje}» no existe en ${rutas.personajes}.`);
  }

  // ── El esquema, el mismo del build ──
  const validada = citaAdmisible.safeParse(nuevos);
  if (!validada.success) {
    return negar(
      'Lo que quedaría no cumple el esquema de la Cita:',
      ...validada.error.issues.map((i) => `  ${i.path.length > 0 ? `${i.path.join('.')}: ` : ''}${i.message}`),
    );
  }

  // ── La clase sigue siendo atribuida ──
  const autorNuevo = typeof nuevos.autor === 'string' ? autores.find((a) => a.slug === nuevos.autor) : undefined;
  // Un Autor declarado que no está en el Corpus no deja juzgar la clase: no se adivina.
  if (typeof nuevos.autor === 'string' && autorNuevo === undefined) {
    return negar(`El Autor «${nuevos.autor}» que declara «${cambio.slug}» no existe en ${rutas.autores}.`);
  }
  const clase = claseQueCorresponde(
    typeof nuevos.personaje === 'string' ? { personaje: nuevos.personaje } : {},
    autorNuevo ?? {},
  );
  if (clase !== claseDe(cita)) {
    return negar(
      `Con ese cambio, «${cambio.slug}» sería de la clase ${clase}, y la clase no cambia: cambiar de clase es ` +
        'retirarla y dar de alta otra, con otro slug.',
    );
  }

  // ── La Obra: la misma ficha de antes, o la que la orden asegura ──
  const indice = indiceDeFichas(fichasEnDisco);
  const procedenciaNueva = (nuevos.procedencia ?? {}) as { obra?: string };
  const comoCitaDeObra = (d: Record<string, unknown>) => ({
    slug: cambio.slug,
    ...(typeof d.autor === 'string' ? { autor: d.autor } : {}),
    ...(typeof d.personaje === 'string' ? { personaje: d.personaje } : {}),
    procedencia: (d.procedencia ?? {}) as { obra?: string },
  });
  let plan: PlanDeFicha | undefined;
  const conLaSustituida = [...publicadas.filter((c) => c !== cita), { ...nuevos, slug: cambio.slug }];
  if (cambio.tipo === 'obra') {
    try {
      plan = await resolverFichaDeObra(rutas, {
        ...(typeof nuevos.autor === 'string' ? { autor: nuevos.autor } : {}),
        ...(typeof nuevos.personaje === 'string' ? { personaje: nuevos.personaje } : {}),
        obra: procedenciaNueva.obra ?? cambio.obra.trim(),
        citasPublicadas: conLaSustituida as Parameters<typeof resolverFichaDeObra>[1]['citasPublicadas'],
      });
    } catch (fallo) {
      return negar(`Las Fichas de Obra no se dejan leer (${fallo instanceof Error ? fallo.message : String(fallo)}).`);
    }
    if (!plan.ok) return negar(...plan.motivos);
  } else if (typeof procedenciaNueva.obra === 'string') {
    const antes = fichaDeCita(comoCitaDeObra(datos), indice)?.nombre;
    const despues = fichaDeCita(comoCitaDeObra(nuevos), indice)?.nombre;
    if (antes !== despues) {
      return negar(
        `Con ese cambio, la Obra de «${cambio.slug}» dejaría de ser ${antes === undefined ? 'ninguna ficha' : `«${antes}»`} ` +
          `y pasaría a ${despues === undefined ? 'ninguna ficha' : `«${despues}»`}: el dueño de la Obra decidiría otra ficha. ` +
          'Una atribuida no se muda de Obra con esta orden.',
      );
    }
  }

  // ── Los topes, la figura sin Obra y los duplicados entre clases ──
  const propia = paraElJuicio({ ...(validada.data as unknown as Record<string, unknown>), slug: cambio.slug } as Parameters<
    typeof paraElJuicio
  >[0]);
  const fallos = fallosDeAtribuidas({
    citas: [...publicadas.filter((c) => c !== cita).map(paraElJuicio), propia],
    autores,
    fichas: [...fichasEnDisco, ...[fichaPlaneada(plan, typeof nuevos.autor === 'string' ? nuevos.autor : undefined)].filter((f) => f !== undefined)],
    autoresConFichaNueva: planDaFichaAlAutor(plan) && typeof nuevos.autor === 'string' ? [nuevos.autor] : [],
    comparables: enRevision.filter((c) => typeof c.texto === 'string').map(paraElJuicio),
    juzgar: new Set([cambio.slug]),
    vedadas,
    valores: puerta,
  });
  const motivos = motivosDe(fallos, cambio.slug);
  if (motivos.length > 0) return negar(`«${cambio.slug}» no pasaría la puerta de la atribuida:`, ...motivos.map((m) => `  ${m}`));

  // ── Se escribe la Cita y después la ficha; si la ficha falla, la Cita vuelve a como estaba ──
  try {
    await escribirCita(dirname(cita.ruta), basename(cita.ruta, '.md'), nuevos);
  } catch (fallo) {
    try {
      await writeFile(cita.ruta, original, 'utf8');
    } catch {
      /* lo dice el motivo */
    }
    return negar(`No se pudo escribir ${cita.ruta}: ${fallo instanceof Error ? fallo.message : String(fallo)}.`);
  }
  let deLaFicha: string | undefined;
  if (plan !== undefined) {
    const ficha = await aplicarFichaDeObra(rutas, plan);
    if (!ficha.ok) {
      try {
        await writeFile(cita.ruta, original, 'utf8');
      } catch (fallo) {
        return {
          ok: false,
          motivos: [
            `La Ficha de Obra no se pudo asegurar, y ${cita.ruta} no se pudo devolver a su contenido original ` +
              `(${fallo instanceof Error ? fallo.message : String(fallo)}): quedó escrita sin su ficha. Restitúyala con git.`,
            ...ficha.motivos,
          ],
        };
      }
      return negar(`La Ficha de Obra no se pudo asegurar, y ${cita.ruta} ha vuelto a su contenido original:`, ...ficha.motivos);
    }
    if (ficha.accion !== 'existente') deLaFicha = `Ficha de Obra ${ficha.accion}: ${ficha.ruta}.`;
  }
  return {
    ok: true,
    ruta: cita.ruta,
    mensaje: [
      `Cambiada la atribuida «${cambio.slug}» (${cambio.tipo}): ${cita.ruta}.`,
      ...(compuesto.nota !== undefined ? [compuesto.nota] : []),
      ...(deLaFicha !== undefined ? [deLaFicha] : []),
      'El slug y el fichero no han cambiado. El cambio del corpus va en un commit propio.',
    ].join('\n'),
  };
}
