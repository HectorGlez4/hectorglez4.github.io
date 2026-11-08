/**
 * El parte de casi duplicados dentro de cada Obra publicada — Historia 29.4, FR-14.
 *
 * El Corpus publica en una misma Obra Citas que se repiten, que son fragmento de otra o que casi
 * coinciden: en *Versos sencillos*, «Cultivo una rosa blanca / En julio como enero» suelta junto a
 * su estrofa XXXIX entera. Esto los **señala**, con la única medida del proyecto (`parecidoEntre`,
 * `tools/lib/parecido.ts`), y no decide nada: retirar una, conservar las dos o restituir el literal
 * lo decide una persona. No escribe en `corpus/` ni guarda estado: se vuelve a correr y vuelve a
 * salir lo que siga ahí.
 *
 * Solo dentro de cada Obra, resuelta como la pinta su página (`colgarObras`, por ficha): entre
 * Obras distintas una frase repetida es casi siempre otra Cita que se le parece, y el cruce entre
 * Obras ya lo ven el alta y la revisión al entrar.
 */

import { existsSync } from 'node:fs';
import { colgarObras } from '../../src/lib/obras.ts';
import { enUnaLinea } from '../../src/lib/verso.ts';
import { leerCitas, leerFichasDeObra, type Rutas } from './corpus.ts';
import {
  CLASES_DE_COINCIDENCIA,
  cifraDeParecido,
  formaParaComparar,
  parecidoEntre,
  type ClaseDeCoincidencia,
} from './parecido.ts';

export interface ParDeCasiDuplicados {
  /** Los dos slugs, en orden alfabético. */
  slugs: [string, string];
  /** Sus textos, literales, en el mismo orden. */
  textos: [string, string];
  clase: ClaseDeCoincidencia;
  parecido: number;
  /** En la contenida, el slug de la que está dentro de la otra. */
  contenida?: string;
  /** Si cambia una sola palabra en la misma posición: la de cada una, en el orden de `slugs`. */
  palabra?: [string, string];
}

export interface ObraConCasiDuplicados {
  /** Nombre de la ficha. */
  obra: string;
  titulo: string;
  pares: ParDeCasiDuplicados[];
}

export interface ParteDeCasiDuplicados {
  obras: ObraConCasiDuplicados[];
  /** Fichas nombradas que no tienen ninguna Cita publicada, y por eso no se recorrieron. */
  sinCitas?: string[];
  resumen: {
    /** Obras recorridas, con al menos una Cita publicada. */
    recorridas: number;
    conPares: number;
    pares: Record<ClaseDeCoincidencia, number>;
  };
}

export type ResultadoDeCasiDuplicados =
  | { ok: true; parte: ParteDeCasiDuplicados }
  | { ok: false; motivos: string[] };

/**
 * Recorre cada par no ordenado de Citas publicadas de cada Obra —o solo de las fichas nombradas—
 * y devuelve los que `parecidoEntre` clasifica. Una ficha nombrada que no está en `corpus/obras/`,
 * un Corpus que no existe o un fichero que no se deja leer dan `ok: false` y ningún parte: de lo
 * que no se puede leer no se informa a medias.
 */
export async function casiDuplicados(rutas: Rutas, fichas: readonly string[] = []): Promise<ResultadoDeCasiDuplicados> {
  // Sin `obras/` no hay fichas, y sin fichas ninguna Obra que recorrer: es un parte vacío, no un
  // Corpus ilegible. Sin `citas/` no hay Corpus.
  if (!existsSync(rutas.citas)) {
    return { ok: false, motivos: [`No hay Corpus que leer en ${rutas.raiz}: falta citas/.`] };
  }
  let citas: Awaited<ReturnType<typeof leerCitas>>;
  let activas: Awaited<ReturnType<typeof leerFichasDeObra>>;
  try {
    citas = await leerCitas(rutas.citas);
    activas = await leerFichasDeObra(rutas);
  } catch (fallo) {
    return {
      ok: false,
      motivos: [
        `No se pudo leer el Corpus: ${fallo instanceof Error ? fallo.message : String(fallo)}`,
        'Sin leerlo entero no se puede decir qué pares hay.',
      ],
    };
  }

  const nombres = new Set(activas.map((f) => f.nombre));
  const ajenas = [...new Set(fichas)].filter((f) => !nombres.has(f));
  if (ajenas.length > 0) {
    return {
      ok: false,
      motivos: ajenas.map((f) => `«${f}» no es ninguna Ficha de Obra activa de corpus/obras/.`),
    };
  }
  const pedidas = new Set(fichas);

  const porObra = new Map<string, { titulo: string; citas: { slug: string; texto: string }[] }>();
  for (const cita of colgarObras(citas, activas)) {
    if (cita.obra === undefined) continue;
    if (pedidas.size > 0 && !pedidas.has(cita.obra.nombre)) continue;
    const grupo = porObra.get(cita.obra.nombre) ?? { titulo: cita.obra.titulo, citas: [] };
    grupo.citas.push({ slug: cita.slug, texto: cita.texto });
    porObra.set(cita.obra.nombre, grupo);
  }

  const pares: Record<ClaseDeCoincidencia, number> = { repetidas: 0, contenida: 0, 'casi-iguales': 0 };
  const obras: ObraConCasiDuplicados[] = [];
  for (const [obra, grupo] of porObra) {
    const suyas = [...grupo.citas]
      .sort((a, b) => a.slug.localeCompare(b.slug, 'es'))
      .map((c) => ({ ...c, forma: formaParaComparar(c.texto) }));
    const suyos: ParDeCasiDuplicados[] = [];
    for (let i = 0; i < suyas.length; i += 1) {
      for (let j = i + 1; j < suyas.length; j += 1) {
        const una = suyas[i];
        const otra = suyas[j];
        const coincidencia = parecidoEntre(una.forma, otra.forma);
        if (coincidencia === undefined) continue;
        suyos.push({
          slugs: [una.slug, otra.slug],
          textos: [una.texto, otra.texto],
          clase: coincidencia.clase,
          parecido: coincidencia.parecido,
          ...(coincidencia.contenida !== undefined
            ? { contenida: coincidencia.contenida === 'a' ? una.slug : otra.slug }
            : {}),
          ...(coincidencia.palabra !== undefined
            ? { palabra: [coincidencia.palabra.a, coincidencia.palabra.b] as [string, string] }
            : {}),
        });
        pares[coincidencia.clase] += 1;
      }
    }
    if (suyos.length === 0) continue;
    suyos.sort(
      (a, b) =>
        CLASES_DE_COINCIDENCIA.indexOf(a.clase) - CLASES_DE_COINCIDENCIA.indexOf(b.clase) ||
        a.slugs[0].localeCompare(b.slugs[0], 'es') ||
        a.slugs[1].localeCompare(b.slugs[1], 'es'),
    );
    obras.push({ obra, titulo: grupo.titulo, pares: suyos });
  }
  obras.sort((a, b) => b.pares.length - a.pares.length || a.obra.localeCompare(b.obra, 'es'));
  // Una ficha nombrada sin Citas publicadas no se recorre: se dice, para que «ningún par» no pase
  // por un recorrido que no hubo.
  const sinCitas = [...pedidas].filter((f) => !porObra.has(f)).sort((a, b) => a.localeCompare(b, 'es'));

  return {
    ok: true,
    parte: {
      obras,
      ...(sinCitas.length > 0 ? { sinCitas } : {}),
      resumen: { recorridas: porObra.size, conPares: obras.length, pares },
    },
  };
}

const NOMBRE_DE_CLASE: Record<ClaseDeCoincidencia, string> = {
  repetidas: 'repetidas',
  contenida: 'contenida',
  'casi-iguales': 'casi iguales',
};

/** El parte legible. Cierra con las tres decisiones, que son de una persona. */
export function formatearCasiDuplicados(parte: ParteDeCasiDuplicados): string {
  const { resumen } = parte;
  const lineas: string[] = [
    `Casi duplicados dentro de cada Obra publicada: ${resumen.recorridas} Obras recorridas.`,
  ];
  for (const ficha of parte.sinCitas ?? []) {
    lineas.push(`${ficha}: sin Citas publicadas; no se recorre.`);
  }
  if (parte.obras.length === 0) {
    lineas.push('', 'Ningún par: ninguna Obra tiene Citas repetidas, contenidas ni casi iguales.');
    return lineas.join('\n');
  }

  for (const obra of parte.obras) {
    lineas.push('', `${obra.obra} («${obra.titulo}»): ${obra.pares.length} ${obra.pares.length === 1 ? 'par' : 'pares'}`);
    for (const par of obra.pares) {
      const [a, b] = par.slugs;
      let cabeza: string;
      if (par.clase === 'contenida') {
        const fuera = par.contenida === a ? b : a;
        cabeza = `contenida (${cifraDeParecido(par.parecido)}): ${par.contenida} dentro de ${fuera}`;
      } else {
        const palabra = par.palabra !== undefined ? `; ${par.palabra[0]}/${par.palabra[1]}` : '';
        cabeza = `${NOMBRE_DE_CLASE[par.clase]} (${cifraDeParecido(par.parecido)}${palabra}): ${a} y ${b}`;
      }
      lineas.push(`  · ${cabeza}`);
      lineas.push(`      ${a}: «${enUnaLinea(par.textos[0])}»`);
      lineas.push(`      ${b}: «${enUnaLinea(par.textos[1])}»`);
    }
  }

  lineas.push(
    '',
    `Obras con pares: ${resumen.conPares}. Pares: ${resumen.pares.repetidas} repetidas, ` +
      `${resumen.pares.contenida} contenidas, ${resumen.pares['casi-iguales']} casi iguales.`,
    '',
    'Nada se ha cambiado. Para cada par, una persona decide, en este orden:',
    '  1. retirar una:          npm run documentar -- --retirar <slug> "<motivo>"',
    '  2. conservar las dos:    no hace falta ninguna orden.',
    '  3. restituir el literal: npm run documentar -- <slug> <documento> --texto "…"',
  );
  return lineas.join('\n');
}

