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
import { basename, join } from 'node:path';
import {
  formaDeObra,
  grafiaPorOmision,
  nombreDeFichaDeObra,
  obrasDeCitas,
  prefijosDeFormas,
  type CitaConObra,
  type FichaDeObra,
  type GrafiaDeObra,
} from '../../src/lib/obras.ts';
import {
  escribirFichaDeObra,
  leerCitas,
  leerCitasTolerante,
  leerFichasDeObra,
  leerFichasDeObraRetiradas,
  mover,
  type Rutas,
} from './corpus.ts';
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
