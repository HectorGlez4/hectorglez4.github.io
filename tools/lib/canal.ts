/**
 * Qué se publicó en el canal propio, dónde y con qué enlace — Historia 21.3, Épica 21, FR-45.
 *
 * Aquí vive lo único que se puede equivocar de esta historia: **validar una publicación
 * tecleada por una persona** —la red, el formato, la ruta, su marca de origen y la fecha— y
 * repartir lo anotado por semana ISO y red, con lo que hace falta para juzgar el cierre de la
 * 18.2. Es puro: no toca el disco ni la red. La cáscara es `tools/canal.ts` y la escritura,
 * `tools/lib/corpus.ts`.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────────────
 *
 * Se publica a diario en varias cuentas y no quedaba registro de qué, dónde ni con qué
 * enlace. A los 90 días no habría forma de distinguir «la página no trae visitas» de «se
 * publicó la mitad de las semanas». Y la 18.2 se cierra precisamente con este registro:
 * cuatro semanas ISO seguidas con la foto diaria y el enlace marcado.
 *
 * ── Por qué solo añade ───────────────────────────────────────────────────────────────
 *
 * Igual que `corpus/peticiones-de-rastreo.yml` y al revés que las series: esto registra
 * **actos**. Dos fotos el mismo día en la misma cuenta son dos publicaciones, y por eso aquí
 * no hay duplicado que rechazar.
 */

import { esJornada } from '../../src/lib/citaDelDia.ts';
import { DOMINIO } from '../../src/lib/dominio.ts';
import { PARAMETRO_DE_ORIGEN, REDES_VALIDAS, esRedValida, type Red } from '../../src/lib/redes.ts';
import { caracterDe, rutaNormalizada, superficieDeclaradaDe } from '../../src/lib/superficies.ts';
import type { CensoPorFamilia } from './indexacion.ts';
import { PRIMERA_JORNADA_ANOTABLE, familiaDeRuta, hostAjeno } from './rastreo.ts';

/**
 * Los formatos que se publican. Un conjunto cerrado por lo mismo que las redes: con texto
 * libre, «foto», «Foto» e «imagen» serían tres formatos en la consulta semanal.
 */
export const FORMATOS = ['foto', 'reel', 'pieza', 'historia'] as const;

export type Formato = (typeof FORMATOS)[number];

export function esFormato(valor: string): valor is Formato {
  return (FORMATOS as readonly string[]).includes(valor);
}

/** La ruta de una publicación que no enlaza al sitio. */
export const SIN_ENLACE = '-';

/**
 * El suelo de `--fecha`, el mismo que el del registro de rastreo y por la misma razón: la
 * errata del año —`2025` por `2026`— es un carácter y se cuela sin ruido. Antes de esa
 * jornada no había registro que llevar; lo anterior no se reconstruye de memoria.
 */
export const PRIMERA_JORNADA_DEL_CANAL = PRIMERA_JORNADA_ANOTABLE;

/** Cuántas semanas ISO seguidas, con la foto diaria y el enlace marcado, cierran la 18.2. */
export const SEMANAS_PARA_CERRAR_LA_18_2 = 4;

/** Una publicación anotada. */
export interface PublicacionDeCanal {
  fecha: string;
  red: Red;
  formato: Formato;
  /**
   * La ruta canónica de lo enlazado, con barra final, o `-` si no enlaza. Se guarda la ruta y
   * no la URL entera: el dominio tiene un solo dueño, `src/lib/dominio.ts`.
   */
  ruta: string;
  /**
   * Si el enlace tecleado llevaba `?de=<red>` con la misma red de la publicación. Es la mitad
   * del criterio de cierre de la 18.2 —«el enlace marcado»—, y por eso se guarda en vez de
   * tirarse al normalizar la ruta: sin la marca, la visita que trae esa publicación llega al
   * receptor sin origen y SM-8 no la cuenta. Una publicación sin enlace no lleva el campo.
   */
  marcado?: boolean;
  /** Texto libre, tal como se tecleó (D-6). Se omite si no se dio. */
  nota?: string;
}

/** Lo que sale de validar: la publicación, o por qué no se anota. */
export type ComposicionDePublicacion =
  | { ok: true; publicacion: PublicacionDeCanal }
  | { ok: false; motivos: string[] };

/** Los valores de `?de=` que trae lo tecleado, en el orden en que aparecen. */
function marcasDeOrigen(dada: string): string[] {
  const inicio = dada.indexOf('?');
  if (inicio === -1) return [];
  const consulta = dada.slice(inicio + 1).split('#')[0];
  return new URLSearchParams(consulta).getAll(PARAMETRO_DE_ORIGEN);
}

/**
 * La ruta tal como la escribe el censo, o el motivo por el que no se anota.
 *
 * La decisión es una sola y la toma el dueño del conjunto publicable (AD-11): estar o no en
 * `publicadas`. `superficies.ts` se consulta **solo para redactar el motivo**, porque «esa
 * ruta no existe» y «esa ruta existe y no se publica» se arreglan distinto.
 */
function rutaPublicadaDe(
  dada: string,
  publicadas: readonly string[],
): { ok: true; ruta: string } | { ok: false; motivo: string } {
  const ajeno = hostAjeno(dada);
  if (ajeno !== undefined) {
    return {
      ok: false,
      motivo:
        `«${dada}» es de «${ajeno}» y no de ${DOMINIO}. Este registro anota lo que enlaza al ` +
        `sitio; una publicación que lleva a otro sitio se anota con «${SIN_ENLACE}».`,
    };
  }

  // La consulta (la marca de origen se lee aparte) y el fragmento no son parte de la ruta.
  const sinConsulta = dada.replace(/[?#][\s\S]*$/, '');

  let normalizada: string;
  try {
    normalizada = rutaNormalizada(sinConsulta);
  } catch {
    return {
      ok: false,
      motivo:
        `«${dada}» no es una URL de este sitio: se espera la dirección completa de una página ` +
        `publicada, su ruta empezando por «/», o «${SIN_ENLACE}» si la publicación no enlaza.`,
    };
  }

  const canonica = new Map<string, string>();
  for (const ruta of publicadas) canonica.set(rutaNormalizada(ruta), ruta);
  const publicada = canonica.get(normalizada);
  if (publicada !== undefined) return { ok: true, ruta: publicada };

  const declarada = superficieDeclaradaDe(normalizada);
  const noPublicable = declarada !== undefined && caracterDe(normalizada) !== 'producto';
  return {
    ok: false,
    motivo: noPublicable
      ? `«${dada}» es ${declarada.nombre} y el sitio la declara no publicable en ` +
        'src/lib/superficies.ts. Enlazar ahí desde el canal no lleva a nada que se cuente: ' +
        'enlace a una página publicada.'
      : `«${dada}» no la publica el sitio: no está en el conjunto publicable. O la ruta no ` +
        'existe, o su superficie no llega al umbral que la publica. Una publicación que ' +
        'enlaza a un 404 no se anota como si enlazara al sitio.',
  };
}

/**
 * La publicación a anotar, o los motivos por los que no se anota.
 *
 * `publicadas` llega de `rutasPublicadas` (AD-11); `hoy` es la jornada local de quien
 * ejecuta la orden, para negarse a anotar lo que todavía no se ha publicado.
 */
export function componerPublicacion(
  entrada: { red: string; formato: string; ruta: string; fecha: string; nota?: string },
  contexto: { publicadas: readonly string[]; hoy: string },
): ComposicionDePublicacion {
  const motivos: string[] = [];

  const redValida = esRedValida(entrada.red);
  if (!redValida) {
    motivos.push(
      `«${entrada.red}» no es una de las cuentas propias. Las redes son un conjunto cerrado ` +
        `—${REDES_VALIDAS.join(', ')}— para que la consulta no cuente la misma cuenta con dos nombres.`,
    );
  }

  if (!esFormato(entrada.formato)) {
    motivos.push(
      `«${entrada.formato}» no es un formato del canal. Se admiten ${FORMATOS.join(', ')}.`,
    );
  }

  if (!esJornada(entrada.fecha)) {
    motivos.push(`«${entrada.fecha}» no es una fecha del calendario: se espera AAAA-MM-DD.`);
  } else if (entrada.fecha > contexto.hoy) {
    motivos.push(
      `${entrada.fecha} todavía no ha llegado —hoy es ${contexto.hoy}—. Este registro anota ` +
        'lo que ya se publicó, nunca lo que está programado.',
    );
  } else if (entrada.fecha < PRIMERA_JORNADA_DEL_CANAL) {
    motivos.push(
      `${entrada.fecha} es anterior a ${PRIMERA_JORNADA_DEL_CANAL}, la primera jornada ` +
        'anotable. Si la publicación es reciente, lo más probable es que sea una errata del año.',
    );
  }

  let ruta = SIN_ENLACE;
  let marcado: boolean | undefined;
  if (entrada.ruta !== SIN_ENLACE) {
    const resuelta = rutaPublicadaDe(entrada.ruta, contexto.publicadas);
    if (resuelta.ok) ruta = resuelta.ruta;
    else motivos.push(resuelta.motivo);

    const marcas = marcasDeOrigen(entrada.ruta);
    const ajena = marcas.find((marca) => marca !== entrada.red);
    if (redValida && ajena !== undefined) {
      /*
       * Un enlace marcado para otra cuenta no es «sin marcar»: es una visita que el receptor
       * atribuirá a la red equivocada. Anotarlo como marcado mentiría en el cierre de la 18.2,
       * y anotarlo como no marcado escondería el error de pegado que lo produjo.
       */
      motivos.push(
        `El enlace está marcado para ${ajena === '' ? 'ninguna red («de=» vacío)' : `«${ajena}»`} ` +
          `y la publicación es de ${entrada.red}: las visitas que traiga se atribuirían a otra ` +
          `cuenta. Pegue el enlace del Kit para ${entrada.red}, o la ruta sin marca.`,
      );
    }
    marcado = marcas.length > 0;
  }

  if (motivos.length > 0) return { ok: false, motivos };
  const publicacion: PublicacionDeCanal = {
    fecha: entrada.fecha,
    red: entrada.red as Red,
    formato: entrada.formato as Formato,
    ruta,
  };
  if (marcado !== undefined) publicacion.marcado = marcado;
  if (entrada.nota !== undefined) publicacion.nota = entrada.nota;
  return { ok: true, publicacion };
}

/**
 * La semana ISO 8601 de una jornada, como `AAAA-Www`.
 *
 * El año es el **de la semana**, no el del calendario: el 2026-01-01 cae en la semana 1 de
 * 2026, pero el 2027-01-01 cae en la 53 de 2026. Con el año del calendario, la última semana
 * de diciembre se partiría en dos y la cuenta de «semanas seguidas» se rompería ahí.
 */
export function semanaIso(fecha: string): string {
  const [año, mes, dia] = fecha.split('-').map(Number);
  const momento = new Date(Date.UTC(año, mes - 1, dia));
  // El jueves de la misma semana decide el año: la semana 1 es la que contiene el primer jueves.
  const diaIso = momento.getUTCDay() === 0 ? 7 : momento.getUTCDay();
  momento.setUTCDate(momento.getUTCDate() + 4 - diaIso);
  const añoIso = momento.getUTCFullYear();
  const primeroDeEnero = Date.UTC(añoIso, 0, 1);
  const semana = Math.ceil(((momento.getTime() - primeroDeEnero) / 86_400_000 + 1) / 7);
  return `${añoIso}-W${String(semana).padStart(2, '0')}`;
}

/** La semana ISO que está `n` semanas después (o antes, si es negativo) de la dada. */
export function desplazarSemana(semana: string, n: number): string {
  const [año, numero] = semana.split('-W').map(Number);
  // El 4 de enero cae siempre en la semana 1; su lunes es el lunes de la semana 1.
  const cuatroDeEnero = new Date(Date.UTC(año, 0, 4));
  const diaIso = cuatroDeEnero.getUTCDay() === 0 ? 7 : cuatroDeEnero.getUTCDay();
  const lunes = new Date(cuatroDeEnero);
  lunes.setUTCDate(cuatroDeEnero.getUTCDate() - (diaIso - 1) + (numero - 1 + n) * 7);
  return semanaIso(lunes.toISOString().slice(0, 10));
}

/**
 * A dónde lleva una publicación.
 *
 *   · Cita, Autor y Colección salen del **censo**, no del prefijo de la ruta: un segundo
 *     criterio de familia divergiría del de la serie de indexación.
 *   · La portada es la superficie que `src/lib/superficies.ts` declara como tal, y solo si
 *     el sitio la publica hoy.
 *   · «otra» es lo publicable que no es ninguna de esas cuatro —hoy, la Página de Tema—.
 *   · «ya no se publica» es una ruta que se anotó publicada y que hoy el sitio no publica.
 *     El registro es permanente y el censo es de hoy; sin esta clase, una Cita retirada
 *     contaría como «otra» y parecería que se enlazó algo que no era una Cita.
 *   · «sin enlace», lo anotado con `-`.
 */
export type Destino =
  | 'cita'
  | 'autor'
  | 'coleccion'
  | 'portada'
  | 'otra'
  | 'yaNoSePublica'
  | 'sinEnlace';

export const DESTINOS: readonly Destino[] = [
  'cita',
  'autor',
  'coleccion',
  'portada',
  'otra',
  'yaNoSePublica',
  'sinEnlace',
];

export const NOMBRE_DEL_DESTINO: Readonly<Record<Destino, string>> = {
  cita: 'Cita',
  autor: 'Autor',
  coleccion: 'Colección',
  portada: 'portada',
  otra: 'otra',
  yaNoSePublica: 'ya no se publica',
  sinEnlace: 'sin enlace',
};

/** La forma normalizada de una ruta, o `undefined` si no se deja normalizar. */
function normalizadaOVacia(ruta: string): string | undefined {
  try {
    return rutaNormalizada(ruta);
  } catch {
    return undefined;
  }
}

export function destinoDePublicacion(
  ruta: string,
  censo: CensoPorFamilia,
  /** Lo que el sitio publica **hoy**: separa «otra» de «ya no se publica». */
  publicadas: readonly string[],
): Destino {
  if (ruta === SIN_ENLACE) return 'sinEnlace';
  const familia = familiaDeRuta(censo, ruta);
  if (familia === 'cita' || familia === 'autor' || familia === 'coleccion') return familia;

  const normalizada = normalizadaOVacia(ruta);
  if (normalizada === undefined || !publicadas.some((p) => normalizadaOVacia(p) === normalizada)) {
    return 'yaNoSePublica';
  }
  return superficieDeclaradaDe(normalizada)?.pagina === 'index.astro' ? 'portada' : 'otra';
}

/** Lo publicado en una red durante una semana ISO. */
export interface SemanaDeRed {
  semana: string;
  red: Red;
  publicaciones: number;
  destinos: Record<Destino, number>;
  /** Cuántos días distintos de la semana tienen al menos una `foto`. */
  diasConFoto: number;
  /** Cuántas publicaciones de la semana llevan enlace, y cuántas de ellas iban marcadas. */
  conEnlace: number;
  marcadas: number;
  /** Si todas las publicaciones con enlace iban marcadas. Cierto también si no hubo ninguna. */
  todasMarcadas: boolean;
  /**
   * Si la semana cuenta para cerrar la 18.2: foto los siete días, al menos una publicación
   * con enlace —«el enlace marcado» presupone que hubo enlace— y todas las que lo llevan,
   * marcadas.
   */
  cuentaPara18_2: boolean;
}

/**
 * Por semana ISO y red: cuántas publicaciones, a dónde enlazan, y lo que el cierre de la
 * 18.2 mira. Ordenado por semana y, dentro de ella, en el orden de `src/lib/redes.ts`.
 */
export function resumenPorSemana(
  publicaciones: readonly PublicacionDeCanal[],
  censo: CensoPorFamilia,
  publicadas: readonly string[],
): SemanaDeRed[] {
  const porClave = new Map<string, { fila: SemanaDeRed; dias: Set<string> }>();
  for (const publicacion of publicaciones) {
    const semana = semanaIso(publicacion.fecha);
    const clave = `${semana} ${publicacion.red}`;
    let grupo = porClave.get(clave);
    if (grupo === undefined) {
      grupo = {
        fila: {
          semana,
          red: publicacion.red,
          publicaciones: 0,
          destinos: Object.fromEntries(DESTINOS.map((d) => [d, 0])) as Record<Destino, number>,
          diasConFoto: 0,
          conEnlace: 0,
          marcadas: 0,
          todasMarcadas: true,
          cuentaPara18_2: false,
        },
        dias: new Set(),
      };
      porClave.set(clave, grupo);
    }
    const { fila, dias } = grupo;
    fila.publicaciones += 1;
    fila.destinos[destinoDePublicacion(publicacion.ruta, censo, publicadas)] += 1;
    if (publicacion.formato === 'foto') dias.add(publicacion.fecha);
    if (publicacion.ruta !== SIN_ENLACE) {
      fila.conEnlace += 1;
      if (publicacion.marcado === true) fila.marcadas += 1;
    }
  }

  const filas = [...porClave.values()].map(({ fila, dias }) => {
    fila.diasConFoto = dias.size;
    fila.todasMarcadas = fila.marcadas === fila.conEnlace;
    fila.cuentaPara18_2 = fila.diasConFoto === 7 && fila.conEnlace > 0 && fila.todasMarcadas;
    return fila;
  });

  const ordenDeRed = (red: Red) => REDES_VALIDAS.indexOf(red);
  return filas.sort(
    (a, b) => a.semana.localeCompare(b.semana) || ordenDeRed(a.red) - ordenDeRed(b.red),
  );
}

/** Las rachas de una red: semanas ISO **consecutivas** que cuentan para la 18.2. */
export interface RachaDeRed {
  red: Red;
  /**
   * La que llega hasta la semana en curso. La semana en curso todavía no puede tener sus
   * siete días, así que si aún no cuenta la racha se mide hasta la anterior: un lunes no
   * rompe una racha que el domingo seguía viva.
   */
  actual: number;
  maxima: number;
}

/** Las rachas de cada red con alguna publicación, en el orden de `src/lib/redes.ts`. */
export function rachasPorRed(resumen: readonly SemanaDeRed[], hoy: string): RachaDeRed[] {
  const enCurso = semanaIso(hoy);
  return REDES_VALIDAS.filter((red) => resumen.some((f) => f.red === red)).map((red) => {
    const cuentan = new Set(resumen.filter((f) => f.red === red && f.cuentaPara18_2).map((f) => f.semana));

    let maxima = 0;
    for (const semana of cuentan) {
      // Solo se cuenta desde el principio de cada racha, para no recorrerla una vez por semana.
      if (cuentan.has(desplazarSemana(semana, -1))) continue;
      let largo = 0;
      for (let s = semana; cuentan.has(s); s = desplazarSemana(s, 1)) largo += 1;
      maxima = Math.max(maxima, largo);
    }

    let actual = 0;
    let s = cuentan.has(enCurso) ? enCurso : desplazarSemana(enCurso, -1);
    while (cuentan.has(s)) {
      actual += 1;
      s = desplazarSemana(s, -1);
    }
    return { red, actual, maxima };
  });
}

/** El estado del cierre de la 18.2: la mejor racha actual entre las redes. */
export interface CierreDe18_2 {
  semanasNecesarias: number;
  lleva: number;
  /** La red que lleva esa racha, si alguna lleva alguna. */
  red?: Red;
  cerrada: boolean;
}

export function cierreDe18_2(rachas: readonly RachaDeRed[]): CierreDe18_2 {
  const mejor = [...rachas].sort((a, b) => b.actual - a.actual)[0];
  const lleva = mejor?.actual ?? 0;
  return {
    semanasNecesarias: SEMANAS_PARA_CERRAR_LA_18_2,
    lleva,
    ...(lleva > 0 && mejor !== undefined ? { red: mejor.red } : {}),
    cerrada: lleva >= SEMANAS_PARA_CERRAR_LA_18_2,
  };
}

/** El informe en pantalla. La consulta lo da entero; el alta, solo con la semana en curso. */
export function lineasDeCanal(
  resumen: readonly SemanaDeRed[],
  rachas: readonly RachaDeRed[],
): string[] {
  const lineas = ['Publicaciones del canal', '═══════════════════════', ''];
  if (resumen.length === 0) {
    lineas.push('No hay ninguna publicación anotada.');
  } else {
    let semanaAnterior: string | undefined;
    for (const fila of resumen) {
      if (fila.semana !== semanaAnterior) {
        if (semanaAnterior !== undefined) lineas.push('');
        lineas.push(fila.semana);
        semanaAnterior = fila.semana;
      }
      const desglose = DESTINOS.filter((d) => fila.destinos[d] > 0)
        .map((d) => `${NOMBRE_DEL_DESTINO[d]} ${fila.destinos[d]}`)
        .join(' · ');
      const marca = fila.cuentaPara18_2 ? '  ✓ cuenta para la 18.2' : '';
      lineas.push(
        `  ${fila.red}: ${fila.publicaciones}  (${desglose})  ` +
          `foto ${fila.diasConFoto}/7 días · marcadas ${fila.marcadas}/${fila.conEnlace}${marca}`,
      );
    }
  }

  lineas.push('', 'Rachas de semanas con foto los 7 días y todo enlace marcado');
  if (rachas.length === 0) lineas.push('  Ninguna red tiene publicaciones anotadas.');
  for (const racha of rachas) {
    lineas.push(`  ${racha.red}: actual ${racha.actual}, máxima ${racha.maxima}`);
  }
  const cierre = cierreDe18_2(rachas);
  lineas.push(
    `La 18.2 se cierra con ${cierre.semanasNecesarias}: lleva ${cierre.lleva}` +
      `${cierre.red !== undefined ? ` (${cierre.red})` : ''}.`,
  );
  return lineas;
}
