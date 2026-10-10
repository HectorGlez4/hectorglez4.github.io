/**
 * Las Fichas de Obra, del lado que escribe — Historia 22.1, AD-25.
 *
 * **Una sola función decide qué ficha hace falta**: `resolverFichaDeObra`, en solo lectura,
 * y **una sola la escribe**: `aplicarFichaDeObra`. `asegurarFichaDeObra` es las dos seguidas.
 * Quien publica —la aprobación (`tools/lib/revision.ts`), el alta (`tools/alta.ts`) y
 * documentar (`tools/lib/documentacion.ts`)— resuelve **antes** de publicar la Cita y aplica
 * **después** de que la Cita esté escrita: así ningún fallo deja una ficha huérfana ni una
 * Cita sin ficha. La siembra de `npm run obra -- sembrar` usa `asegurarFichaDeObra`.
 * Escribir una candidata en `corpus/_revision/` no crea ninguna ficha.
 *
 * Nadie escribe ni borra fichas a mano: retirar una es moverla a `corpus/_obras-retiradas/`
 * (AD-2) con `retirarFichaDeObra`.
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import {
  clave,
  colapsar,
  colgarObras,
  esGrafiaLiteral,
  formaDeObra,
  grafiaPorOmision,
  grafiasDeFicha,
  mismaGrafia,
  nombreDeFichaDeObra,
  obrasDeCitas,
  prefijosDeFormas,
  type CitaConObra,
  type CitaParaObra,
  type FichaDeObra,
  type GrafiaDeObra,
  type ObraResuelta,
} from '../../src/lib/obras.ts';
import {
  escribirCita,
  escribirFichaDeObra,
  leerAutores,
  leerCensoDeCotejo,
  leerCitas,
  leerCitasTolerante,
  leerDocumentosDeclarados,
  leerFichasDeObra,
  leerFichasDeObraRetiradas,
  mover,
  reescribirFichaDeObra,
  restaurarFichaDeObra,
  separarFrontmatter,
  type Rutas,
} from './corpus.ts';
import { FICHERO_DEL_CENSO } from './cotejo.ts';
import { derivarDeLaDeclaracion, esElMismoAutor } from './documento.ts';
import type { Resultado } from './gestion.ts';

/** Lo que hay que hacer para que la Obra tenga ficha activa, decidido en solo lectura. */
export type PlanDeFicha =
  /** La forma ya tiene ficha activa, o la obra no deja forma (y no necesita ficha). */
  | { ok: true; accion: 'existente'; ruta?: string; titulo?: string }
  | { ok: true; accion: 'restaurar'; origen: string; titulo: string }
  | { ok: true; accion: 'crear'; nombre: string; titulo: string; autor: string; forma: string }
  | { ok: false; motivos: string[] };

/** Lo que pasó al asegurar la ficha de una Obra. */
export type FichaAsegurada =
  | { ok: true; accion: 'existente'; ruta?: string; titulo?: string }
  | { ok: true; accion: 'restaurada' | 'creada'; ruta: string; titulo: string }
  | { ok: false; motivos: string[] };

/** Las grafías literales de una Obra entre las Citas dadas. */
function grafiasDe(
  autor: string,
  forma: string,
  citas: readonly Pick<CitaConObra, 'autor' | 'procedencia'>[],
): GrafiaDeObra[] {
  const cuenta = new Map<string, number>();
  for (const cita of citas) {
    const obra = cita.procedencia?.obra;
    if (cita.autor !== autor || typeof obra !== 'string' || formaDeObra(obra) !== forma) continue;
    cuenta.set(obra, (cuenta.get(obra) ?? 0) + 1);
  }
  return [...cuenta].map(([literal, citas]) => ({ literal, citas }));
}

const texto = (fallo: unknown) => (fallo instanceof Error ? fallo.message : String(fallo));

/**
 * Decide, **sin escribir nada**, qué hace falta para que (Autor, obra) tenga ficha activa:
 *
 *   1. busca la forma entre las fichas activas y las retiradas;
 *   2. activa → nada que hacer;
 *   3. retirada → restaurarla, salvo que alguna de sus formas la reclame ya una activa;
 *   4. ninguna → crearla con `titulo` = grafía por omisión entre `citasPublicadas` y
 *      `formas: [forma]`;
 *   5. colisión de nombre con otra ficha → se niega y lo dice. Nunca se sobrescribe.
 *
 * Una obra cuya forma canónica es vacía —«…», «—»— no necesita ficha, igual que una Cita
 * sin obra: el build no la exige (`formaDeCita`). No lanza nunca: un lote que la llame no
 * se aborta a medias, recibe `ok: false` con el motivo.
 *
 * `citasPublicadas` es el conjunto publicado **tal como quedará**: quien publica incluye la
 * Cita que está publicando. Si no trae ninguna Cita de la Obra, el título es `obra` tal cual,
 * que es literal por definición.
 */
export async function resolverFichaDeObra(
  rutas: Rutas,
  entrada: {
    autor: string;
    obra: string;
    citasPublicadas: readonly Pick<CitaConObra, 'autor' | 'procedencia'>[];
  },
): Promise<PlanDeFicha> {
  const { autor, obra } = entrada;
  const forma = formaDeObra(obra);
  if (forma === '') return { ok: true, accion: 'existente' };

  let activas: FichaDeObra[];
  let retiradas: FichaDeObra[];
  try {
    activas = await leerFichasDeObra(rutas);
    retiradas = await leerFichasDeObraRetiradas(rutas);
  } catch (fallo) {
    return {
      ok: false,
      motivos: [
        `No se pueden leer las Fichas de Obra para asegurar «${obra}» de ${autor}: ${texto(fallo)}`,
        'No se ha escrito ninguna ficha.',
      ],
    };
  }

  const reclama = (f: FichaDeObra) => f.autor === autor && f.formas.includes(forma);

  const activa = activas.find(reclama);
  if (activa) return { ok: true, accion: 'existente', ruta: activa.ruta, titulo: activa.titulo };

  const retirada = retiradas.find(reclama);
  if (retirada) {
    const enConflicto = activas.filter(
      (f) => f.autor === autor && f.formas.some((otra) => retirada.formas.includes(otra)),
    );
    if (enConflicto.length > 0) {
      return {
        ok: false,
        motivos: [
          `La Obra «${obra}» de ${autor} tiene ficha retirada en ${retirada.ruta}, y alguna de ` +
            `sus formas la reclama ya ${enConflicto.map((f) => f.ruta).join(', ')}.`,
          'Restaurarla dejaría una forma reclamada por dos fichas. Decidir cuál manda es una ' +
            'reunión (Historia 22.2), y no se hace por aquí.',
          'No se ha escrito ninguna ficha.',
        ],
      };
    }
    const destino = join(rutas.obras, basename(retirada.ruta));
    if (existsSync(destino)) {
      return {
        ok: false,
        motivos: [
          `La ficha retirada ${retirada.ruta} no se puede restaurar: ya existe ${destino}.`,
          'No se ha escrito ninguna ficha.',
        ],
      };
    }
    return { ok: true, accion: 'restaurar', origen: retirada.ruta, titulo: retirada.titulo };
  }

  const grafias = grafiasDe(autor, forma, entrada.citasPublicadas);
  const titulo = grafiaPorOmision(grafias.length > 0 ? grafias : [{ literal: obra, citas: 0 }]);
  const nombre = nombreDeFichaDeObra(autor, titulo);
  if (nombre === undefined) {
    return {
      ok: false,
      motivos: [
        `El título «${titulo}» de ${autor} no deja ninguna letra ni cifra latina con la que ` +
          'nombrar la ficha: el nombre es la URL de la Obra y solo admite minúsculas, cifras ' +
          'y guiones.',
        'No se ha escrito ninguna ficha.',
      ],
    };
  }

  const ocupado = [rutas.obras, rutas.obrasRetiradas]
    .flatMap((dir) => [join(dir, `${nombre}.yml`), join(dir, `${nombre}.yaml`)])
    .find((ruta) => existsSync(ruta));
  if (ocupado !== undefined) {
    return {
      ok: false,
      motivos: [
        `La Obra «${titulo}» de ${autor} (forma «${forma}») se nombraría ${nombre}.yml, y ese ` +
          `nombre ya lo ocupa ${ocupado}, que reclama otras formas.`,
        'No se sobrescribe una ficha: su nombre es la URL de otra Obra. Decidir si son la misma ' +
          'Obra es una reunión (Historia 22.2), y no se hace por aquí.',
        'No se ha escrito ninguna ficha.',
      ],
    };
  }

  return { ok: true, accion: 'crear', nombre, titulo, autor, forma };
}

/**
 * Ejecuta un plan de `resolverFichaDeObra`. Es la única escritura de fichas que hay. Tampoco
 * lanza: un fallo de disco vuelve como `ok: false`.
 */
export async function aplicarFichaDeObra(rutas: Rutas, plan: PlanDeFicha): Promise<FichaAsegurada> {
  if (!plan.ok) return plan;
  try {
    switch (plan.accion) {
      case 'existente':
        return plan;
      case 'restaurar': {
        const ruta = await mover(plan.origen, rutas.obras);
        return { ok: true, accion: 'restaurada', ruta, titulo: plan.titulo };
      }
      case 'crear': {
        const ruta = await escribirFichaDeObra(rutas, plan.nombre, {
          autor: plan.autor,
          titulo: plan.titulo,
          formas: [plan.forma],
        });
        return { ok: true, accion: 'creada', ruta, titulo: plan.titulo };
      }
    }
  } catch (fallo) {
    return { ok: false, motivos: [texto(fallo), 'No se ha escrito ninguna ficha.'] };
  }
}

/** Resolver y aplicar seguidos: para quien no tiene nada que publicar entre medias. */
export async function asegurarFichaDeObra(
  rutas: Rutas,
  entrada: Parameters<typeof resolverFichaDeObra>[1],
): Promise<FichaAsegurada> {
  return aplicarFichaDeObra(rutas, await resolverFichaDeObra(rutas, entrada));
}

/** El motivo legible de un plan, para el parte de quien publica. */
export function describirPlan(plan: PlanDeFicha): string | undefined {
  if (!plan.ok) return undefined;
  if (plan.accion === 'crear') return `Ficha de Obra a crear: ${plan.nombre}.yml («${plan.titulo}»).`;
  if (plan.accion === 'restaurar') return `Ficha de Obra a restaurar: ${plan.origen}.`;
  return undefined;
}

/** El informe de una siembra. */
export interface InformeDeSiembra {
  creadas: { ruta: string; titulo: string }[];
  restauradas: { ruta: string; titulo: string }[];
  existentes: number;
  fallos: string[];
  /** Misma forma con grafías literales distintas. */
  grupos: { autor: string; forma: string; grafias: GrafiaDeObra[] }[];
  /** Pares de formas del mismo Autor en que una es prefijo de otra. */
  prefijos: { autor: string; corta: string; larga: string }[];
}

/**
 * Crea, con `asegurarFichaDeObra`, las fichas que falten para todas las Citas publicadas.
 * Idempotente: sobre un corpus ya sembrado no crea nada.
 */
export async function sembrarFichasDeObra(rutas: Rutas): Promise<InformeDeSiembra> {
  const publicadas = await leerCitas(rutas.citas);
  const obras = obrasDeCitas(publicadas);
  const informe: InformeDeSiembra = {
    creadas: [],
    restauradas: [],
    existentes: 0,
    fallos: [],
    grupos: obras
      .filter((o) => o.grafias.length > 1)
      .map(({ autor, forma, grafias }) => ({ autor, forma, grafias })),
    prefijos: prefijosDeFormas(obras),
  };

  for (const obra of obras) {
    const asegurada = await asegurarFichaDeObra(rutas, {
      autor: obra.autor,
      obra: obra.grafias[0].literal,
      citasPublicadas: publicadas,
    });
    if (!asegurada.ok) informe.fallos.push(...asegurada.motivos);
    else if (asegurada.accion === 'creada')
      informe.creadas.push({ ruta: asegurada.ruta, titulo: asegurada.titulo });
    else if (asegurada.accion === 'restaurada')
      informe.restauradas.push({ ruta: asegurada.ruta, titulo: asegurada.titulo });
    else informe.existentes += 1;
  }

  return informe;
}

export function formatearInformeDeSiembra(informe: InformeDeSiembra): string {
  const lineas = [
    `Fichas de Obra creadas: ${informe.creadas.length}`,
    `Fichas restauradas de corpus/_obras-retiradas/: ${informe.restauradas.length}`,
    `Fichas que ya existían: ${informe.existentes}`,
  ];
  for (const { ruta, titulo } of informe.restauradas) lineas.push(`  ↺ ${ruta} — «${titulo}»`);

  lineas.push('', `Grupos de grafías equivalentes (misma forma, grafías distintas): ${informe.grupos.length}`);
  for (const grupo of informe.grupos) {
    lineas.push(
      `  · ${grupo.autor} — «${grupo.forma}»: ` +
        grupo.grafias.map((g) => `«${g.literal}» ×${g.citas}`).join(', '),
    );
  }

  lineas.push('', `Pares en que una forma es prefijo de otra del mismo Autor: ${informe.prefijos.length}`);
  for (const par of informe.prefijos) {
    lineas.push(`  · ${par.autor} — «${par.corta}» ⊂ «${par.larga}»`);
  }

  if (informe.grupos.length > 0 || informe.prefijos.length > 0) {
    lineas.push(
      '',
      'Reunir o separar estas Obras no lo decide esta orden: es la Historia 22.2, y lo decide ' +
        'el dueño del Corpus.',
    );
  }

  if (informe.fallos.length > 0) {
    lineas.push('', 'No se pudieron asegurar estas fichas:', ...informe.fallos.map((f) => `  ${f}`));
  }
  return lineas.join('\n');
}


/**
 * Retira una Ficha de Obra: la **mueve** a `corpus/_obras-retiradas/` (AD-2), sin borrar nada.
 *
 * Se niega, sin mover nada, mientras una Cita publicada o una candidata de `_revision/` la
 * resuelva: el build rompería por la Obra sin ficha, o aprobar la candidata la restauraría.
 * Las candidatas se leen sin abortar por una ilegible, y una ilegible **bloquea**: de un
 * fichero que no se puede leer no se puede afirmar que no la resuelva.
 */
export async function retirarFichaDeObra(
  rutas: Rutas,
  nombre: string,
  motivo: string,
): Promise<Resultado> {
  if (motivo.trim() === '') {
    return {
      ok: false,
      motivos: [
        'Una retirada sin motivo no es una retirada: es una desaparición.',
        `  npm run obra -- retirar ${nombre} --motivo "<motivo>"`,
      ],
    };
  }

  const buscado = nombre.replace(/\.ya?ml$/u, '');
  let ficha: FichaDeObra | undefined;
  try {
    ficha = (await leerFichasDeObra(rutas)).find((f) => f.nombre === buscado);
  } catch (fallo) {
    return { ok: false, motivos: [`No se pueden leer las Fichas de Obra: ${texto(fallo)}`, 'No se ha movido nada.'] };
  }
  if (!ficha) {
    return {
      ok: false,
      motivos: [
        `No hay ninguna Ficha de Obra «${buscado}» en ${rutas.obras}. El nombre es el del ` +
          'fichero sin extensión, como «seneca--cartas-a-lucilio».',
        'No se ha movido nada.',
      ],
    };
  }
  const objetivo = ficha;

  const resuelve = (c: CitaConObra) => {
    const obra = c.procedencia?.obra;
    return (
      c.autor === objetivo.autor &&
      typeof obra === 'string' &&
      objetivo.formas.includes(formaDeObra(obra))
    );
  };
  const publicadas = (await leerCitas(rutas.citas)).filter(resuelve).map((c) => c.slug);
  const enRevision = await leerCitasTolerante(rutas.revision);
  const candidatas = enRevision.citas.filter(resuelve).map((c) => c.slug);

  const motivos: string[] = [];
  const lista = (slugs: string[]) => [
    ...slugs.slice(0, 10).map((s) => `    ${s}`),
    ...(slugs.length > 10 ? [`    … y ${slugs.length - 10} más`] : []),
  ];
  if (publicadas.length > 0) {
    motivos.push(
      `La resuelven ${publicadas.length} ${publicadas.length === 1 ? 'Cita publicada' : 'Citas publicadas'}: ` +
        'sin la ficha el build rompería.',
      ...lista(publicadas),
    );
  }
  if (candidatas.length > 0) {
    motivos.push(
      `La resuelven ${candidatas.length} ${candidatas.length === 1 ? 'candidata' : 'candidatas'} ` +
        `de ${rutas.revision}: aprobarlas la restauraría.`,
      ...lista(candidatas),
    );
  }
  if (enRevision.ilegibles.length > 0) {
    motivos.push(
      `${enRevision.ilegibles.length} ${enRevision.ilegibles.length === 1 ? 'candidata no se deja' : 'candidatas no se dejan'} ` +
        'leer, y no se puede afirmar que no la resuelvan. Corríjalas o recháce' +
        (enRevision.ilegibles.length === 1 ? 'la' : 'las') +
        ' antes:',
      ...enRevision.ilegibles.slice(0, 10).map((i) => `    ${i.ruta}: ${i.motivo}`),
    );
  }
  if (motivos.length > 0) {
    return {
      ok: false,
      motivos: [`No se retira «${objetivo.nombre}»: el Corpus todavía la resuelve.`, ...motivos, 'No se ha movido nada.'],
    };
  }

  let destino: string;
  try {
    destino = await mover(objetivo.ruta, rutas.obrasRetiradas);
  } catch (fallo) {
    return { ok: false, motivos: [texto(fallo), 'No se ha movido nada.'] };
  }

  return {
    ok: true,
    ruta: destino,
    mensaje: [
      `Ficha de Obra «${objetivo.nombre}» retirada a ${rutas.obrasRetiradas}.`,
      `  Motivo: ${motivo.trim()}`,
      'No se ha borrado nada: si una Cita vuelve a resolverla, la siguiente publicación la ' +
        'restaura. El motivo va en el mensaje del commit (AD-10).',
    ].join('\n'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Una obra, un nombre — Historia 22.2
// ─────────────────────────────────────────────────────────────────────────────
/*
 * Las órdenes de esta sección **deciden sobre la ficha y nunca sobre las Citas**: reunir,
 * separar y titular reescriben una ficha y no tocan ninguna Procedencia. La única que toca una
 * Cita es `restituirGrafia`, y solo para igualar la grafía de una Cita del censo a la cabecera
 * literal de un documento versionado de su Obra: restituir el literal de la Fuente es la única
 * excepción a «nunca se reescribe la Procedencia».
 */

/** La orden que reúne dos fichas. */
export const ORDEN_DE_REUNIR = 'npm run obra -- reunir';

/** Una ficha activa por su nombre (sin extensión), o el motivo de no encontrarla. */
async function fichaActiva(
  rutas: Rutas,
  nombre: string,
): Promise<{ ok: true; ficha: FichaDeObra; fichas: FichaDeObra[] } | { ok: false; motivos: string[] }> {
  const buscado = nombre.replace(/\.ya?ml$/u, '');
  let fichas: FichaDeObra[];
  try {
    fichas = await leerFichasDeObra(rutas);
  } catch (fallo) {
    return { ok: false, motivos: [`No se pueden leer las Fichas de Obra: ${texto(fallo)}`] };
  }
  const ficha = fichas.find((f) => f.nombre === buscado);
  if (ficha === undefined) {
    return {
      ok: false,
      motivos: [
        `No hay ninguna Ficha de Obra «${buscado}» en ${rutas.obras}. El nombre es el del ` +
          'fichero sin extensión, como «seneca--cartas-a-lucilio».',
      ],
    };
  }
  return { ok: true, ficha, fichas };
}

/** La ficha tal como se escribe: sin nombre ni ruta, y sin `distintaDe` vacío. */
function datosDeFicha(ficha: FichaDeObra) {
  return {
    autor: ficha.autor,
    titulo: ficha.titulo,
    formas: [...ficha.formas],
    ...(ficha.distintaDe !== undefined && ficha.distintaDe.length > 0
      ? { distintaDe: [...ficha.distintaDe] }
      : {}),
  };
}

/**
 * La forma principal de una ficha: la de su título si la reclama, y si no, la primera. Es la
 * que `separar` escribe en el `distintaDe` de la otra.
 */
export function formaPrincipal(ficha: Pick<FichaDeObra, 'titulo' | 'formas'>): string {
  const delTitulo = formaDeObra(ficha.titulo);
  return ficha.formas.includes(delTitulo) ? delTitulo : ficha.formas[0];
}

const NADA_ESCRITO = 'No se ha escrito nada.';

/**
 * Reúne la ficha `absorbida` en `destino`: las formas de la absorbida pasan a la destino, y la
 * absorbida se **mueve** a `corpus/_obras-retiradas/` (AD-2) con el motivo «reunida en …».
 *
 * No mueve ninguna Cita ni ningún documento: las Citas de la absorbida pasan a resolver la
 * destino porque ahora es ella quien reclama su forma. Se niega si son de Autores distintos o
 * si son la misma ficha. Y avisa siempre de que la URL de la absorbida dará 404 cuando las
 * Obras tengan página (NFR-4, UX-DR50 f): su nombre era su URL y ya no resuelve a nadie.
 *
 * Los `distintaDe` de las dos se unen en la reunida, sin las formas que pasan a ser suyas: si
 * una había declarado distinta a la otra, reunir es la decisión contraria, y la posterior
 * manda. El parte lo dice, y nombra las terceras fichas que se declaraban distintas de una
 * forma de la absorbida, porque desde ahora lo son de la reunida.
 *
 * Si la absorbida no se puede mover, la destino vuelve a su contenido de antes; si ni eso se
 * puede, el parte lo dice. No lanza.
 */
export async function reunirFichas(
  rutas: Rutas,
  nombreDestino: string,
  nombreAbsorbida: string,
): Promise<Resultado> {
  const destino = await fichaActiva(rutas, nombreDestino);
  if (!destino.ok) return { ok: false, motivos: [...destino.motivos, NADA_ESCRITO] };
  const absorbida = await fichaActiva(rutas, nombreAbsorbida);
  if (!absorbida.ok) return { ok: false, motivos: [...absorbida.motivos, NADA_ESCRITO] };
  const a = destino.ficha;
  const b = absorbida.ficha;

  if (a.nombre === b.nombre) {
    return { ok: false, motivos: [`«${a.nombre}» es la misma ficha: no hay nada que reunir.`, NADA_ESCRITO] };
  }
  if (a.autor !== b.autor) {
    return {
      ok: false,
      motivos: [
        `«${a.nombre}» es de ${a.autor} y «${b.nombre}» es de ${b.autor}. Una Obra es de un ` +
          'Autor: reunir fichas de Autores distintos atribuiría Citas a quien no las firmó.',
        NADA_ESCRITO,
      ],
    };
  }

  const formas = [...a.formas, ...b.formas.filter((f) => !a.formas.includes(f))];
  // Los `distintaDe` de las dos, sin las formas que pasan a ser propias de la reunida.
  const declaradas = [...(a.distintaDe ?? []), ...(b.distintaDe ?? [])];
  const distintaDe = [...new Set(declaradas)].filter((f) => !formas.includes(f));
  const dejanDeSerDistintas = [...new Set(declaradas)].filter((f) => formas.includes(f));
  const heredadas = (b.distintaDe ?? []).filter(
    (f) => !formas.includes(f) && !(a.distintaDe ?? []).includes(f),
  );
  const nueva = {
    autor: a.autor,
    titulo: a.titulo,
    formas,
    ...(distintaDe.length > 0 ? { distintaDe } : {}),
  };

  // Terceras fichas que se declaraban distintas de una forma de la absorbida: ahora lo son de
  // la reunida, y eso no lo decidió nadie al reunir. Se nombran para que se revise.
  const terceras = destino.fichas.filter(
    (f) =>
      f.nombre !== a.nombre &&
      f.nombre !== b.nombre &&
      f.autor === a.autor &&
      (f.distintaDe ?? []).some((forma) => b.formas.includes(forma)),
  );

  let original: string;
  try {
    original = await readFile(a.ruta, 'utf8');
  } catch (fallo) {
    return { ok: false, motivos: [`No se pudo leer ${a.ruta}: ${texto(fallo)}`, NADA_ESCRITO] };
  }
  try {
    await reescribirFichaDeObra(a.ruta, nueva);
  } catch (fallo) {
    return { ok: false, motivos: [texto(fallo), NADA_ESCRITO] };
  }

  let movida: string;
  try {
    movida = await mover(b.ruta, rutas.obrasRetiradas);
  } catch (fallo) {
    const vuelta = await restaurar(a.ruta, original);
    return { ok: false, motivos: [texto(fallo), vuelta] };
  }

  return {
    ok: true,
    ruta: a.ruta,
    mensaje: [
      `«${b.nombre}» reunida en «${a.nombre}».`,
      `  Formas de ${a.ruta}: ${formas.map((f) => `«${f}»`).join(', ')}`,
      ...(dejanDeSerDistintas.length > 0
        ? [
            '  Deja de declararse distinta de lo que ahora reclama: ' +
              dejanDeSerDistintas.map((f) => `«${f}»`).join(', '),
          ]
        : []),
      ...(heredadas.length > 0
        ? [`  Hereda de la absorbida su distintaDe: ${heredadas.map((f) => `«${f}»`).join(', ')}`]
        : []),
      ...(distintaDe.length > 0
        ? [`  distintaDe de la reunida: ${distintaDe.map((f) => `«${f}»`).join(', ')}`]
        : []),
      `  ${b.ruta} → ${movida}`,
      `  Motivo: reunida en ${a.nombre}`,
      ...(terceras.length > 0
        ? [
            'Estas fichas se declaraban distintas de una forma de la absorbida, y ahora lo son de ' +
              `«${a.nombre}»; revise si sigue siendo verdad:`,
            ...terceras.map(
              (f) =>
                `  ${f.ruta}: distinta de ${(f.distintaDe ?? [])
                  .filter((forma) => b.formas.includes(forma))
                  .map((forma) => `«${forma}»`)
                  .join(', ')}`,
            ),
          ]
        : []),
      'Ninguna Cita ni ningún documento se ha movido; ninguna Procedencia ha cambiado.',
      `Aviso: la URL de «${b.nombre}» dará 404 cuando las Obras tengan página (NFR-4, ` +
        'UX-DR50 f). Su nombre era su URL, y ya no resuelve a ninguna Obra.',
      'El motivo va en el mensaje del commit (AD-10).',
    ].join('\n'),
  };
}

/**
 * Devuelve una ficha a su contenido de antes, sin lanzar nunca: la vuelta atrás de `reunir` y
 * `separar`. Devuelve la línea del parte que dice si lo consiguió.
 */
async function restaurar(ruta: string, contenido: string): Promise<string> {
  try {
    await restaurarFichaDeObra(ruta, contenido);
    return `${ruta} se ha dejado como estaba. ${NADA_ESCRITO}`;
  } catch (fallo) {
    return (
      `Y no se pudo devolver ${ruta} a como estaba: ${texto(fallo)}. Revíselo con ` +
      '«git diff corpus/obras/» antes de construir.'
    );
  }
}

/**
 * Declara dos fichas del mismo Autor **distintas**: añade a cada una la forma principal de la
 * otra en `distintaDe`. Calla el aviso de prefijo entre las dos. Es idempotente.
 */
export async function separarFichas(
  rutas: Rutas,
  nombreUna: string,
  nombreOtra: string,
): Promise<Resultado> {
  const una = await fichaActiva(rutas, nombreUna);
  if (!una.ok) return { ok: false, motivos: [...una.motivos, NADA_ESCRITO] };
  const otra = await fichaActiva(rutas, nombreOtra);
  if (!otra.ok) return { ok: false, motivos: [...otra.motivos, NADA_ESCRITO] };
  const a = una.ficha;
  const b = otra.ficha;

  if (a.nombre === b.nombre) {
    return { ok: false, motivos: [`«${a.nombre}» es la misma ficha: no se separa de sí misma.`, NADA_ESCRITO] };
  }
  if (a.autor !== b.autor) {
    return {
      ok: false,
      motivos: [
        `«${a.nombre}» es de ${a.autor} y «${b.nombre}» es de ${b.autor}: Obras de Autores ` +
          'distintos ya son distintas, y `distintaDe` solo nombra formas del mismo Autor.',
        NADA_ESCRITO,
      ],
    };
  }

  const conDistinta = (x: FichaDeObra, forma: string) => {
    const lista = x.distintaDe ?? [];
    return lista.includes(forma) ? undefined : { ...datosDeFicha(x), distintaDe: [...lista, forma] };
  };
  const nuevaA = conDistinta(a, formaPrincipal(b));
  const nuevaB = conDistinta(b, formaPrincipal(a));

  let originalA: string;
  try {
    originalA = await readFile(a.ruta, 'utf8');
  } catch (fallo) {
    return { ok: false, motivos: [`No se pudo leer ${a.ruta}: ${texto(fallo)}`, NADA_ESCRITO] };
  }
  let escritaA = false;
  try {
    if (nuevaA !== undefined) {
      await reescribirFichaDeObra(a.ruta, nuevaA);
      escritaA = true;
    }
    if (nuevaB !== undefined) await reescribirFichaDeObra(b.ruta, nuevaB);
  } catch (fallo) {
    const vuelta = escritaA ? await restaurar(a.ruta, originalA) : NADA_ESCRITO;
    return { ok: false, motivos: [texto(fallo), vuelta] };
  }

  return {
    ok: true,
    ruta: a.ruta,
    mensaje: [
      nuevaA === undefined && nuevaB === undefined
        ? `«${a.nombre}» y «${b.nombre}» ya estaban declaradas distintas: nada que cambiar.`
        : `«${a.nombre}» y «${b.nombre}» quedan declaradas Obras distintas.`,
      `  ${a.ruta}: distinta de «${formaPrincipal(b)}»`,
      `  ${b.ruta}: distinta de «${formaPrincipal(a)}»`,
      'Ninguna Cita ha cambiado. El aviso de prefijo entre las dos deja de salir.',
    ].join('\n'),
  };
}

/**
 * Elige el título de una ficha. Solo admite una grafía que declare **alguna Cita publicada**
 * de la Obra, tal cual: una escrita de nuevo se rechaza, porque el título nunca se inventa.
 */
export async function titularFicha(
  rutas: Rutas,
  nombre: string,
  grafia: string,
): Promise<Resultado> {
  const leida = await fichaActiva(rutas, nombre);
  if (!leida.ok) return { ok: false, motivos: [...leida.motivos, NADA_ESCRITO] };
  const { ficha, fichas } = leida;

  let publicadas: Awaited<ReturnType<typeof leerCitas>>;
  try {
    publicadas = await leerCitas(rutas.citas);
  } catch (fallo) {
    return {
      ok: false,
      motivos: [`No se pueden leer las Citas publicadas: ${texto(fallo)}`, NADA_ESCRITO],
    };
  }
  const grafias = grafiasDeFicha(ficha, fichas, publicadas);
  const declarada = grafias.find((g) => mismaGrafia(g.literal, grafia));
  if (declarada === undefined) {
    return {
      ok: false,
      motivos: [
        `«${grafia}» no la declara ninguna Cita publicada de «${ficha.nombre}». El título de ` +
          'una Obra es siempre una grafía de alguna de sus Procedencias, y nunca se escribe de ' +
          'nuevo.',
        grafias.length === 0
          ? 'Ninguna Cita publicada resuelve esta ficha.'
          : `Las que declaran sus Citas: ${grafias
              .sort((x, y) => y.citas - x.citas || x.literal.localeCompare(y.literal, 'es'))
              .map((g) => `«${g.literal}» ×${g.citas}`)
              .join(', ')}.`,
        NADA_ESCRITO,
      ],
    };
  }

  // Se escribe la grafía tal como la declara la Cita, no como se tecleó en la orden.
  const titulo = declarada.literal;
  if (ficha.titulo === titulo) {
    return { ok: true, ruta: ficha.ruta, mensaje: `«${ficha.nombre}» ya se titula «${titulo}».` };
  }

  try {
    await reescribirFichaDeObra(ficha.ruta, { ...datosDeFicha(ficha), titulo });
  } catch (fallo) {
    return { ok: false, motivos: [texto(fallo), NADA_ESCRITO] };
  }
  return {
    ok: true,
    ruta: ficha.ruta,
    mensaje: [
      `«${ficha.nombre}» se titula ahora «${titulo}» (antes «${ficha.titulo}»).`,
      `El nombre del fichero no cambia: es la URL de la Obra (AD-4).`,
    ].join('\n'),
  };
}

/**
 * Pone al día el título de las fichas de un Autor que reclaman alguna de `formas`, si ha
 * dejado de sostenerse: cuando ya no lo declara ninguna Cita publicada de la Obra, pasa a ser
 * el de `grafiaPorOmision`. Lo llaman, en el mismo gesto, quien cambia o retira una
 * Procedencia: `documentar`, `documentar --retirar` y `restituir-grafia`.
 *
 * Lee las Citas **ya escritas**. Una ficha que se queda sin Citas no se toca: eso avisa en el
 * build por sí solo. No lanza: devuelve las líneas del parte, y un fallo es una línea más.
 */
export async function ajustarTitulosDeObra(
  rutas: Rutas,
  autor: string,
  formas: readonly string[],
): Promise<string[]> {
  const lineas: string[] = [];
  try {
    const fichas = await leerFichasDeObra(rutas);
    const citas = await leerCitas(rutas.citas);
    for (const ficha of fichas) {
      if (ficha.autor !== autor || !ficha.formas.some((f) => formas.includes(f))) continue;
      const grafias = grafiasDeFicha(ficha, fichas, citas);
      if (grafias.length === 0 || grafias.some((g) => mismaGrafia(g.literal, ficha.titulo))) {
        continue;
      }
      const titulo = grafiaPorOmision(grafias);
      await reescribirFichaDeObra(ficha.ruta, { ...datosDeFicha(ficha), titulo });
      lineas.push(
        `El título de ${ficha.ruta} ya no lo declaraba ninguna Cita publicada: pasa de ` +
          `«${ficha.titulo}» a «${titulo}», la grafía por omisión.`,
      );
    }
  } catch (fallo) {
    lineas.push(
      `No se pudo poner al día el título de la Ficha de Obra: ${texto(fallo)}. El build ` +
        'avisará; elíjalo con «npm run obra -- titular».',
    );
  }
  return lineas;
}

/**
 * Restituye la grafía de una Cita **del censo** a la de la cabecera de un documento versionado
 * de su Obra — la única reescritura de una Procedencia que hace esta orden.
 *
 * Aplica solo cuando:
 *   · la Cita está publicada y en `pendientes-de-cotejo.yml` (no tiene documento propio);
 *   · hay documentos versionados cuya `obra:` normaliza igual que su grafía y cuya declaración
 *     firma su mismo Autor —con la comparación de `documentar` y `extraer`—;
 *   · todos esos documentos escriben la obra igual, y distinto de como la escribe la Cita.
 *
 * Iguala `procedencia.obra` y nada más: ni el texto, ni el año, ni el censo. Fuera de ese caso
 * se niega, diciendo por qué.
 */
export async function restituirGrafia(rutas: Rutas, slug: string): Promise<Resultado> {
  const publicadas = await leerCitas(rutas.citas);
  const cita = publicadas.find((c) => c.slug === slug);
  if (cita === undefined) {
    const enRevision = (await leerCitasTolerante(rutas.revision)).citas.some((c) => c.slug === slug);
    return {
      ok: false,
      motivos: [
        enRevision
          ? `«${slug}» no está publicada: está en ${rutas.revision}, y su Procedencia sale del ` +
            'documento al aprobarla.'
          : `No hay ninguna Cita publicada con el slug «${slug}» en ${rutas.citas}.`,
        NADA_ESCRITO,
      ],
    };
  }

  const censo = await leerCensoDeCotejo(rutas);
  if (!censo.includes(slug)) {
    return {
      ok: false,
      motivos: [
        `«${slug}» no está en el censo de ${FICHERO_DEL_CENSO}.`,
        cita.fuente !== undefined && cita.fuente !== null
          ? 'Ya tiene documento: su obra la declara el documento, y lo que difiera se corrige ' +
            'retirándola y aprobándola de nuevo desde el documento, no aquí.'
          : 'Restituir la grafía es solo para las Citas anteriores a la v3 que siguen sin ' +
            'documento.',
        NADA_ESCRITO,
      ],
    };
  }

  const obra = cita.procedencia?.obra;
  if (typeof obra !== 'string' || formaDeObra(obra) === '') {
    return {
      ok: false,
      motivos: [`«${slug}» no declara obra: no hay grafía que restituir.`, NADA_ESCRITO],
    };
  }
  const forma = formaDeObra(obra);

  const nombreDelAutor = (await leerAutores(rutas)).find((a) => a.slug === cita.autor)?.nombre?.trim();
  if (nombreDelAutor === undefined || nombreDelAutor === '') {
    return {
      ok: false,
      motivos: [
        `La ficha de «${cita.autor}» no está en ${rutas.autores} o no declara nombre, y sin él ` +
          'no se puede cotejar quién firma el documento.',
        NADA_ESCRITO,
      ],
    };
  }

  const documentos = await leerDocumentosDeclarados(rutas);
  const deLaObra = [...documentos].filter(([, d]) => formaDeObra(d.obra) === forma);
  const suyos: { nombre: string; obra: string }[] = [];
  const ajenos: string[] = [];
  for (const [nombre, d] of deLaObra) {
    const firma = derivarDeLaDeclaracion(d.fuente, d.declaracion).autor;
    if (firma !== undefined && firma.nombres.some((n) => esElMismoAutor(n, nombreDelAutor))) {
      suyos.push({ nombre, obra: d.obra });
    } else {
      ajenos.push(
        `  corpus/fuentes/${nombre}.txt — ` +
          (firma === undefined || firma.nombres.length === 0
            ? 'no declara un autor que se pueda cotejar'
            : `firma «${firma.nombres.join('» y «')}»`),
      );
    }
  }

  if (suyos.length === 0) {
    return {
      ok: false,
      motivos: [
        `No hay ningún documento versionado de «${obra}» firmado por ${nombreDelAutor}.`,
        ...(ajenos.length > 0
          ? ['Los de esa obra que hay no sirven, porque no se puede afirmar que sean suyos:', ...ajenos]
          : []),
        'Recupérelo con «npx tsx tools/recuperar.ts <url>» y documéntela con ' +
          `«npm run documentar -- ${slug} corpus/fuentes/<documento>.txt».`,
        NADA_ESCRITO,
      ],
    };
  }

  const grafias = [...new Set(suyos.map((d) => colapsar(d.obra)))];
  if (grafias.length > 1) {
    return {
      ok: false,
      motivos: [
        `Los documentos de «${obra}» de ${nombreDelAutor} no escriben la obra igual, y no se ` +
          'elige entre ellos:',
        ...suyos.map((d) => `  corpus/fuentes/${d.nombre}.txt — «${d.obra}»`),
        NADA_ESCRITO,
      ],
    };
  }
  const [cabecera] = grafias;
  if (esGrafiaLiteral(obra, [cabecera])) {
    return {
      ok: false,
      motivos: [
        `«${slug}» ya declara «${obra}», que es como lo escribe su documento: nada que restituir.`,
        NADA_ESCRITO,
      ],
    };
  }

  const datos = separarFrontmatter(await readFile(cita.ruta, 'utf8'));
  if (datos === null) {
    return { ok: false, motivos: [`El fichero ${cita.ruta} no tiene frontmatter.`, NADA_ESCRITO] };
  }
  const procedencia = (datos.procedencia ?? {}) as Record<string, unknown>;
  datos.procedencia = { ...procedencia, obra: cabecera };
  try {
    await escribirCita(dirname(cita.ruta), basename(cita.ruta, '.md'), datos);
  } catch (fallo) {
    return { ok: false, motivos: [`No se pudo escribir ${cita.ruta}: ${texto(fallo)}`, NADA_ESCRITO] };
  }

  const titulos = await ajustarTitulosDeObra(rutas, cita.autor, [forma]);

  return {
    ok: true,
    ruta: cita.ruta,
    mensaje: [
      `«${slug}» restituida a la grafía de su documento.`,
      `  antes:   «${obra}»`,
      `  después: «${cabecera}»`,
      `  Documento: ${suyos.map((d) => `corpus/fuentes/${d.nombre}.txt`).join(', ')}`,
      `Sigue en el censo de ${FICHERO_DEL_CENSO}: tener la grafía de un documento no es estar ` +
        'cotejada contra él.',
      ...titulos,
      'Ni el texto, ni el año, ni el slug han cambiado.',
    ].join('\n'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// La obra se llama igual en todas partes — Historia 22.3
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Las Citas leídas por `tools/` con su Obra resuelta colgada, como las lleva el sitio.
 *
 * Lo que sale de `tools/` —la Pieza, su texto para publicar— nombra la obra con el mismo
 * título que la Página de Cita, y para eso necesita la misma resolución: `colgarObras` sobre
 * las fichas de `corpus/obras/`.
 *
 * Una Obra de esas Citas que **ninguna** ficha reclama —un corpus a medio sembrar, que el
 * build no dejaría publicar— se resuelve con la ficha que `npm run obra -- sembrar` crearía
 * para ella: su grafía por omisión. Así la orden no calla una obra que la Cita sí declara.
 * Nada se escribe: la ficha provisional no sale de aquí.
 */
export async function citasConObra<C extends CitaParaObra>(
  rutas: Rutas,
  citas: readonly C[],
): Promise<
  { ok: true; citas: (C & { obra?: ObraResuelta })[] } | { ok: false; motivos: string[] }
> {
  let fichas: FichaDeObra[];
  try {
    fichas = await leerFichasDeObra(rutas);
  } catch (fallo) {
    return {
      ok: false,
      motivos: [
        `No se pueden leer las Fichas de Obra para nombrar las obras: ${texto(fallo)}`,
        'Sin ellas no se sabe con qué título se publica cada Obra, y no se ha compuesto nada.',
      ],
    };
  }
  const reclamadas = new Set(fichas.flatMap((f) => f.formas.map((forma) => clave(f.autor, forma))));
  const provisionales: FichaDeObra[] = obrasDeCitas(citas)
    .filter((o) => !reclamadas.has(clave(o.autor, o.forma)))
    .map((o) => ({
      /*
       * Un nombre que ninguna ficha real puede tener —lleva paréntesis y espacios, que
       * `FORMA_DE_NOMBRE` rechaza— y que no repite otra provisional, porque lleva la identidad
       * entera (Autor, forma). Con el nombre que `sembrar` derivaría, una provisional podía
       * coincidir con una ficha real de otra forma y llevarse su Obra resuelta.
       */
      nombre: `(sin ficha) ${o.autor} ${o.forma}`,
      ruta: '(sin ficha)',
      autor: o.autor,
      titulo: grafiaPorOmision(o.grafias),
      formas: [o.forma],
    }));
  return { ok: true, citas: colgarObras(citas, [...fichas, ...provisionales]) };
}
