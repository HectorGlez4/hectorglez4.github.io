/**
 * Alta de Citas, individual o por lote — FR-13.
 *
 * Es comodidad, no puerta: la puerta vive en el esquema (AD-1) y esta herramienta
 * importa **las mismas** reglas desde `src/lib/admision.ts` en lugar de reimplementarlas,
 * para que no pueda aceptar una Cita que el build luego rechaza.
 *
 * Lo que aporta sobre editar ficheros a mano es el reparto: las Citas completas van a
 * `corpus/citas/` con su slug generado, las incompletas a `corpus/_revision/` —donde no
 * las carga ninguna colección (AD-2)— y el informe dice, por cada una que no se publica,
 * qué regla incumplió. Sin eso, incorporar un lote de cincuenta obliga a revisarlas todas.
 *
 * Uso:
 *   npx tsx tools/alta.ts <lote.yaml> [--corpus corpus] [--seco]
 */

import { readFile } from 'node:fs/promises';
import { parse as parsearYaml } from 'yaml';
import { citaAdmisible, gradoDeProcedencia, type CitaAdmisible } from '../src/lib/admision.ts';
import { motivoParaNoPublicar } from './lib/cotejo.ts';
import { normalizar } from '../src/lib/normalizar.ts';
import { MIN_CARACTERES_PARA_CONTENCION } from '../src/lib/umbrales.ts';
import { slugDeAutor, slugDeCita, slugDeTema, slugLibre } from '../src/lib/slug.ts';
import {
  escribirCita,
  leerAutores,
  leerCitas,
  leerTemas,
  nombreDeFicheroDeCita,
  rutasDelCorpus,
  type Rutas,
} from './lib/corpus.ts';

/** Una entrada del lote, tal como la escribe el editor. Sin slug: lo genera el alta. */
export interface EntradaDeLote {
  texto?: string;
  autor?: string;
  temas?: string[];
  procedencia?: { obra?: string; año?: number; referencia?: string };
  /**
   * La Fuente de la que salió, y con ella el documento contra el que el build coteja
   * el texto — Historia 11.2.
   *
   * Es obligatoria para publicar, salvo que la Cita sea una de las anteriores a la v3
   * que el censo ampara: sin ella la Cita se queda en `corpus/_revision/` con la regla
   * escrita. Declararla no relaja nada —el cotejo del build sigue exigiendo que el texto
   * aparezca literalmente en un documento que la recuperación versionó—, solo permite
   * que un alta sobre una obra ya recuperada llegue a construir.
   */
  fuente?: { id?: string; nombre?: string; licencia?: string; url?: string };
  aptaParaPortada?: boolean;
}

export interface CitaPublicada {
  slug: string;
  ruta: string;
  texto: string;
  grado: 'completa' | 'parcial';
}

export interface CitaRechazada {
  texto: string;
  ruta: string | null;
  /** Una línea por regla incumplida. Es lo que el editor lee para saber qué completar. */
  motivos: string[];
}

export interface PosibleDuplicado {
  texto: string;
  /** Slug de la Cita que ya está en el corpus, o `«el propio lote»` si repite dentro. */
  coincideCon: string;
  donde: 'publicadas' | 'en revisión' | 'el propio lote';
}

export interface InformeDeAlta {
  publicadas: CitaPublicada[];
  enRevision: CitaRechazada[];
  /** Autores citados en el lote que no existen en el corpus. No se crean (FR-15). */
  autoresDesconocidos: string[];
  /**
   * Señaladas antes de escribirlas — FR-14. No se descartan: quedan aquí para que el
   * editor decida, y se incorporan tal cual si vuelve a ejecutar con `--con-duplicados`.
   */
  posiblesDuplicados: PosibleDuplicado[];
}

/**
 * Da de alta un lote.
 *
 * `--seco` (opción `seco`) calcula el informe sin escribir nada, para poder ver qué haría
 * antes de tocar el corpus.
 */
export async function darDeAltaLote(
  lote: EntradaDeLote[],
  rutas: Rutas,
  opciones: { seco?: boolean; conDuplicados?: boolean } = {},
): Promise<InformeDeAlta> {
  const autores = await leerAutores(rutas);
  const temas = await leerTemas(rutas);
  const yaPublicadas = await leerCitas(rutas.citas);
  const enRevisionYa = await leerCitas(rutas.revision);

  const slugsDeAutor = new Set(autores.map((a) => a.slug));
  const slugsDeTema = new Set(temas.map((t) => t.slug));
  const slugsOcupados = new Set(yaPublicadas.map((c) => c.slug));

  // FR-14 — el índice de comparación usa la forma canónica de AD-3, la misma que la
  // búsqueda. Ese es justo el punto: si duplicados y búsqueda usaran criterios distintos,
  // el corpus podría acabar con dos Citas que la búsqueda presenta como una sola.
  const yaEnCorpus = new Map<string, { slug: string; donde: PosibleDuplicado['donde'] }>();
  for (const c of enRevisionYa) {
    yaEnCorpus.set(normalizar(c.texto), { slug: c.slug, donde: 'en revisión' });
  }
  // Las publicadas se indexan después para que ganen: si el mismo texto está en los dos
  // sitios, lo que el editor necesita saber es que ya está publicado.
  for (const c of yaPublicadas) {
    yaEnCorpus.set(normalizar(c.texto), { slug: c.slug, donde: 'publicadas' });
  }

  const informe: InformeDeAlta = {
    publicadas: [],
    enRevision: [],
    autoresDesconocidos: [],
    posiblesDuplicados: [],
  };

  for (const entrada of lote) {
    const texto = entrada.texto ?? '';
    const motivos: string[] = [];

    // ── Duplicados: se comprueba antes de escribir nada (FR-14) ──
    const canonico = normalizar(texto);
    const yaEsta = canonico === '' ? undefined : (yaEnCorpus.get(canonico) ?? contenidaEn(canonico, yaEnCorpus));
    if (yaEsta && !opciones.conDuplicados) {
      // No se escribe y no se descarta: se señala y el editor decide. El sistema no
      // tiene criterio para saber si dos textos equivalentes son la misma Cita o dos
      // ediciones legítimas de la misma frase.
      informe.posiblesDuplicados.push({ texto, coincideCon: yaEsta.slug, donde: yaEsta.donde });
      continue;
    }

    // ── El Autor se resuelve antes que nada: sin él no hay slug que generar ──
    const referenciaAutor = entrada.autor ?? '';
    const slugAutor = slugsDeAutor.has(referenciaAutor)
      ? referenciaAutor
      : slugDeAutor(referenciaAutor);

    if (referenciaAutor === '') {
      motivos.push('Regla incumplida: falta el Autor de la Cita.');
    } else if (!slugsDeAutor.has(slugAutor)) {
      // FR-15 — se señala, no se crea. Un Autor creado aquí saldría sin año de
      // fallecimiento, y ese hueco bloquearía después la publicación de todas sus
      // Citas sin que nadie recuerde de dónde salió.
      motivos.push(
        `El Autor «${referenciaAutor}» no existe en el corpus. Créelo antes con ` +
          `«npx tsx tools/autor.ts crear», con su año de fallecimiento. El alta no lo ` +
          'crea por su cuenta para no dejar un Autor incompleto.',
      );
      if (!informe.autoresDesconocidos.includes(referenciaAutor)) {
        informe.autoresDesconocidos.push(referenciaAutor);
      }
    }

    // ── Temas: se avisa de los desconocidos, pero no impiden publicar ──
    const temasResueltos = (entrada.temas ?? []).map((t) =>
      slugsDeTema.has(t) ? t : slugDeTema(t),
    );
    const temasDesconocidos = temasResueltos.filter((t) => !slugsDeTema.has(t));
    if (temasDesconocidos.length > 0) {
      motivos.push(
        `Tema desconocido: ${temasDesconocidos.map((t) => `«${t}»`).join(', ')}. ` +
          'Créelo antes o retírelo de la Cita.',
      );
    }

    // ── Las reglas de admisión, las mismas que aplica el build ──
    const slugBase = slugDeCita(slugAutor, texto);
    const candidata = {
      texto,
      autor: slugAutor,
      temas: temasResueltos,
      slug: slugLibre(slugBase, slugsOcupados),
      procedencia: entrada.procedencia,
      estadoDerechos: 'dominio-público' as const,
      // Se pasa tal cual y la valida la misma puerta que el resto: un `fuente:` a medias
      // manda la Cita a revisión con la regla incumplida escrita, no al corpus.
      ...(entrada.fuente !== undefined ? { fuente: entrada.fuente } : {}),
      // Solo se registra el sí. El esquema ya da `false` por defecto, así que escribir
      // `aptaParaPortada: false` en cada Cita del corpus sería ruido que además invita
      // a leerlo como una decisión tomada, cuando es la ausencia de decisión.
      ...(entrada.aptaParaPortada === true ? { aptaParaPortada: true } : {}),
    };

    const validada = citaAdmisible.safeParse(candidata);
    if (!validada.success) {
      for (const issue of validada.error.issues) {
        const campo = issue.path.join('.');
        motivos.push(campo ? `${campo}: ${issue.message}` : issue.message);
      }
    }

    /*
     * Historia 11.2 — el alta no fabrica builds rotos.
     *
     * Publicar una Cita sin Fuente en `corpus/citas/` mataba la construcción siguiente:
     * la herramienta escribía el fichero, informaba de éxito, y el fallo aparecía después
     * en un sitio distinto y en boca de otra puerta. Aquí se aplica **la misma** regla que
     * aplicará el build —importada, no copiada—, así que la Cita se queda en revisión con
     * lo que le falta escrito al lado.
     */
    const sinDocumento = motivoParaNoPublicar(candidata);
    if (sinDocumento !== undefined) motivos.push(sinDocumento);

    const nombreFichero = nombreDeFicheroDeCita(slugAutor, candidata.slug);

    if (motivos.length > 0 || !validada.success) {
      // A revisión con lo que se sepa. El fichero conserva el trabajo hecho para que
      // completarlo sea rellenar un campo, no volver a teclear la Cita.
      const ruta = opciones.seco
        ? null
        : await escribirCita(rutas.revision, nombreFichero, candidata);
      informe.enRevision.push({ texto, ruta, motivos });
      if (canonico !== '') {
        yaEnCorpus.set(canonico, { slug: candidata.slug, donde: 'el propio lote' });
      }
      continue;
    }

    const ruta = opciones.seco
      ? ''
      : await escribirCita(rutas.citas, nombreFichero, aRegistroDeCita(validada.data));
    slugsOcupados.add(candidata.slug);
    // Lo aceptado entra en el índice: así un lote que repite la misma Cita dos veces se
    // detecta igual que si la segunda llegara mañana en otro lote.
    yaEnCorpus.set(canonico, { slug: candidata.slug, donde: 'el propio lote' });
    informe.publicadas.push({
      slug: candidata.slug,
      ruta,
      texto,
      grado: gradoDeProcedencia(validada.data.procedencia) === 'completa' ? 'completa' : 'parcial',
    });
  }

  return informe;
}

/**
 * El registro que se escribe al fichero.
 *
 * No se escribe la salida de `safeParse` tal cual: al validar, Zod rellena los campos con
 * valor por defecto, de modo que toda Cita saldría con `aptaParaPortada: false` y
 * `temas: []`. Eso contradice la convención —un campo sin valor se omite— y además
 * invita a leer el `false` como una decisión tomada cuando es la ausencia de decisión.
 */
function aRegistroDeCita(datos: CitaAdmisible): Record<string, unknown> {
  return {
    texto: datos.texto,
    autor: datos.autor,
    ...(datos.temas.length > 0 ? { temas: datos.temas } : {}),
    slug: datos.slug,
    procedencia: datos.procedencia,
    estadoDerechos: datos.estadoDerechos,
    ...(datos.fuente !== undefined ? { fuente: datos.fuente } : {}),
    ...(datos.aptaParaPortada ? { aptaParaPortada: true } : {}),
  };
}

/** Informe legible en terminal. Sin colores: se lee igual en un registro de CI. */
export function formatearInforme(informe: InformeDeAlta): string {
  const lineas: string[] = [];

  lineas.push(`Publicadas: ${informe.publicadas.length}`);
  for (const c of informe.publicadas) {
    lineas.push(`  ✓ ${c.slug}  (procedencia ${c.grado})`);
  }

  lineas.push('', `En revisión: ${informe.enRevision.length}`);
  for (const c of informe.enRevision) {
    lineas.push(`  · «${recortar(c.texto)}»`);
    for (const motivo of c.motivos) lineas.push(`      ${motivo}`);
  }

  if (informe.posiblesDuplicados.length > 0) {
    lineas.push('', `Posibles duplicados, no escritos: ${informe.posiblesDuplicados.length}`);
    for (const d of informe.posiblesDuplicados) {
      lineas.push(`  · «${recortar(d.texto)}»`);
      lineas.push(`      Coincide con ${d.coincideCon} (${d.donde}).`);
    }
    lineas.push(
      '  Nada se ha descartado. Para incorporarlos igualmente, repita con --con-duplicados.',
    );
  }

  if (informe.autoresDesconocidos.length > 0) {
    lineas.push('', 'Autores que no existen en el corpus:');
    for (const a of informe.autoresDesconocidos) lineas.push(`  · ${a}`);
  }

  return lineas.join('\n');
}

/**
 * La otra forma de duplicar: una Cita **entera dentro de otra** — Historia 15.2.
 *
 * El índice de la Historia 1.6 compara formas canónicas iguales, y por eso no vio el caso que
 * de verdad ocurrió: «la diligencia es madre de la buena ventura» publicada, y después la misma
 * sentencia con su segunda mitad. No son iguales, así que el informe dijo cero duplicados y
 * `slugLibre` renombró la segunda a `-2` en silencio. El sitio acabó con dos URL que solo se
 * diferenciaban en un dígito y con la misma sentencia en las dos.
 *
 * Se mira en las dos direcciones —la nueva dentro de una vieja y una vieja dentro de la nueva—
 * porque el orden en que llegan los lotes no lo decide nadie. Y se pide un mínimo de longitud a
 * la más corta (AD-9, `MIN_CARACTERES_PARA_CONTENCION`): sin él, «Yo sé quién soy» quedaría
 * atrapada por cualquier Cita larga que contuviese esas palabras, y un aviso que salta de más es
 * un aviso que se aprende a ignorar.
 *
 * Como su hermana, **no descarta: señala**. A veces el recorte es justo la Cita que se quiere.
 */
function contenidaEn(
  canonico: string,
  yaEnCorpus: Map<string, { slug: string; donde: PosibleDuplicado['donde'] }>,
): { slug: string; donde: PosibleDuplicado['donde'] } | undefined {
  for (const [otro, quien] of yaEnCorpus) {
    const corta = canonico.length <= otro.length ? canonico : otro;
    if (corta.length < MIN_CARACTERES_PARA_CONTENCION) continue;
    if (otro.includes(canonico) || canonico.includes(otro)) return quien;
  }
  return undefined;
}

function recortar(texto: string, maximo = 60): string {
  const limpio = texto.trim();
  return limpio.length <= maximo ? limpio : `${limpio.slice(0, maximo - 1)}…`;
}

/** Índice de textos ya presentes en forma canónica. Lo consume la Historia 1.6. */
export async function textosCanonicosDelCorpus(rutas: Rutas): Promise<Map<string, string>> {
  const citas = await leerCitas(rutas.citas);
  return new Map(citas.map((c) => [normalizar(c.texto), c.slug]));
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const argumentos = process.argv.slice(2);
  const fichero = argumentos.find((a) => !a.startsWith('--'));
  const seco = argumentos.includes('--seco');
  const conDuplicados = argumentos.includes('--con-duplicados');
  const indiceCorpus = argumentos.indexOf('--corpus');
  const raizCorpus = indiceCorpus === -1 ? 'corpus' : argumentos[indiceCorpus + 1];

  if (!fichero) {
    process.stderr.write('Uso: npx tsx tools/alta.ts <lote.yaml> [--corpus corpus] [--seco]\n');
    process.exit(2);
  }

  const lote = parsearYaml(await readFile(fichero, 'utf8')) as EntradaDeLote[];
  if (!Array.isArray(lote)) {
    process.stderr.write('El lote debe ser una lista de Citas.\n');
    process.exit(2);
  }

  const informe = await darDeAltaLote(lote, rutasDelCorpus(raizCorpus), { seco, conDuplicados });
  process.stdout.write(`${formatearInforme(informe)}\n`);
  if (seco) process.stdout.write('\n(Ejecución en seco: no se ha escrito nada.)\n');
}
