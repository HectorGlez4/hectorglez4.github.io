/**
 * Qué compone cada superficie, **por campos** — Historias 18.4, 22.8 y 24.8 (AD-27).
 *
 * Aquí vive **toda la decisión** de qué fecha declara el sitemap para cada URL y de qué avisa
 * `tools/avisar.ts`: la relación «superficie → (fichero, campos que pinta)» y el único
 * comparador que dice si una transición de un fichero cambió esos campos. No toca ni el disco ni
 * git, a propósito: recibe el corpus ya leído y las transiciones ya analizadas, así que los casos
 * que importan —la agregación, la ausencia, la baja, el campo que no fecha— se prueban sin
 * repositorio.
 *
 * ── Por qué la fecha sale del historial y no del build ───────────────────────────────
 *
 * AD-12 reconstruye el sitio una vez al día. Una fecha de construcción declararía todas las
 * páginas como nuevas cada mañana, y eso no es un dato pobre: es un dato falso, y enseña al
 * buscador a no hacer caso del campo. Lo que sí sabe este repositorio es cuándo cambió de verdad
 * cada fichero de `corpus/`, porque el Corpus **es** el repositorio (AD-10).
 *
 * ── Lo que la página afirma, por campos (Historia 24.8) ──────────────────────────────
 *
 * Hasta la 24.8 la relación iba a **ficheros enteros**, y eso fallaba en los dos sentidos. De
 * más: un commit que solo escribe `aptaParaPortada` fechaba y avisaba las Páginas de Cita que
 * tocaba, y la semblanza de un Autor fechaba todas las Páginas de Cita suyas, que no la pintan.
 * De menos: los listados de Autor, Tema y Colección no contaban la ficha de Obra cuyo título
 * pintan (24.3), la Página de Obra no contaba sus documentos de `corpus/fuentes/` —que ordenan
 * sus Citas (24.1)— y una baja no fechaba lo que componía.
 *
 * El criterio es uno: **lo que la superficie afirma**. Cada componente es un fichero y la lista
 * de campos suyos que esa superficie pinta, sacada de una tabla con nombre (`CAMPOS_QUE_PINTA`),
 * y los campos que el sitio lee pero ninguna superficie afirma están en otra lista con nombre
 * (`CAMPOS_QUE_NO_FECHAN`). Las dos son **listas explícitas**, nunca «todos menos»: un campo
 * nuevo de un esquema tiene que clasificarse a mano, y `tests/unit/fecha-de-cambio.test.ts`
 * falla nombrándolo mientras no lo esté.
 *
 *   · **Página de Cita** — su fichero, su Autor (nombre y años: título, meta, JSON-LD y Tarjeta
 *     de Obra), sus Temas (el nombre de cada chip) y su ficha de Obra (el título de la
 *     Atribución y del `isPartOf`). **Nunca Citas hermanas**: la Tarjeta de Obra (24.4) pinta
 *     el año, el recuento y si hay edición cotejada de la Obra, «Siguiente…» (24.5) depende del
 *     orden del libro y del listado del Tema, y las Rutas de salida del pie (24.6) pintan textos,
 *     Obras y recuentos de otras Citas. Todo eso es navegación y, por excepción declarada de
 *     Héctor (FR-47), no fecha ni avisa.
 *   · **Página de Autor, de Tema y de Colección** — su fichero, sus Citas, los Autores de esas
 *     Citas (el nombre de cada tarjeta) y **las fichas de Obra de esas Citas** (el título de la
 *     línea de Obra de cada tarjeta, 24.3, y de la Lista de Obras del Autor). Son listados: si
 *     entra una Cita nueva en un Tema, la página cambió aunque el fichero del Tema no se toque.
 *   · **Página de Obra** — su ficha, sus Citas, su Autor y **sus documentos**: la unión de
 *     `documentosDeCita` de sus Citas sobre los nombres de `corpus/fuentes/`. Un documento no se
 *     analiza: cualquier cambio suyo puede reordenar la Obra, y solo fecha esa página.
 *
 * ── Un comparador, dos lecturas ──────────────────────────────────────────────────────
 *
 * `cambiaronLosCampos` es la única regla, y la usan las dos lecturas de la relación: la fecha
 * del sitemap, sobre el historial por commit (`integraciones/historial.ts`, `git log --raw`), y
 * el aviso, sobre el par `desde`/`hasta` (`tools/lib/avisar.ts`, `git diff --raw`). Comparación
 * canónica: un campo ausente equivale a `undefined`, los objetos se comparan sin depender del
 * orden de sus claves, un alta o una baja cambian todos los campos y una versión que no se deja
 * analizar cuenta como cambio —antes fechar de más que mentir de menos—.
 *
 * ── Las bajas ────────────────────────────────────────────────────────────────────────
 *
 * Un fichero que ya no está en el Corpus —su última transición es un borrado: mover una Cita a
 * `corpus/_revision/` o una ficha a `corpus/_obras-retiradas/` lo es— entra con su última versión
 * como **baja** y fecha, con el instante del commit que lo sacó, las superficies **vivas** que
 * compondría: una Cita, su Autor, sus Temas, sus Colecciones (por `miembros`) y su Obra
 * (resuelta por Autor y forma contra las fichas de hoy); una ficha, las Páginas de Cita y los
 * listados de las Citas de hoy cuya forma reclamaba; un documento, la Obra cuyas Citas lo
 * casarían. Una baja nunca declara la página de sí misma. Un Autor, un Tema o una Colección que
 * salen no componen nada vivo (`bajasDelHistorial` dice por qué), y una baja cuya última versión
 * no se deja analizar no fecha nada: no se sabe qué componía.
 *
 * ── La portada, que no lleva fecha ───────────────────────────────────────────────────
 *
 * La portada **no entra en este mapa**, y es una decisión, no un olvido. Es la única URL del
 * sitio que cambia a diario: AD-12 rota la Cita del Día sin que nadie commitee nada, así que
 * cualquier fecha que el historial sepa dar es vieja el día que se publica, y lo sería justo en
 * la única URL donde el buscador entra a diario. Declarar «hoy» es una fecha de build con otro
 * nombre, y declarar el último commit del Corpus afirma algo falso. Lo que queda es la regla de
 * esta historia: **cuando no se sabe la fecha, se omite el campo**. Y no, el descargo no es
 * `tools/avisar.ts`: ese canal es IndexNow, y Google no lo consume.
 *
 * ── Ausencia antes que centinela ─────────────────────────────────────────────────────
 *
 * Una superficie de la que no se sepa ninguna fecha **no aparece en el mapa**, y quien lo
 * consume omite el campo. Ni «hoy», ni la época, ni una cadena vacía: un centinela en miles de
 * entradas es indistinguible de un dato.
 */

import {
  rutaDeAutor,
  rutaDeCita,
  rutaDeColeccion,
  rutaDeTema,
  rutaNormalizada,
} from '../../src/lib/superficies.ts';
import { formaDeObra, rutaDeLaObra } from '../../src/lib/obras.ts';
import { documentosDeCita } from './cotejo.ts';
import type { FamiliaDeFichero, FamiliaDeRuta } from './avisar.ts';

/**
 * El instante de un cambio, en ISO 8601 y **siempre en UTC** — lo que `Date#toISOString`
 * devuelve: `2026-09-04T17:59:55.000Z`.
 *
 * En UTC y no en la zona de quien construye: el mismo commit se anunciaría con dos cadenas
 * distintas desde Madrid y desde el CI, y «dos construcciones del mismo commit dan las mismas
 * fechas» dejaría de cumplirse sin que nadie viera por qué. El instante entero y no solo el día:
 * la librería del sitemap expande `AAAA-MM-DD` a la medianoche, y el XML afirmaría una hora que
 * nadie ha medido. Se compara como cadena: la forma es de anchura fija y termina en `Z`, así que
 * ordena igual lexicográfica que cronológicamente.
 */
export type FechaDeCambio = string;

// ─── Versiones, transiciones y el comparador ─────────────────────────────────────────

/**
 * Una versión que no se analizó o no se dejó analizar: un documento de `corpus/fuentes/` —que
 * solo cuenta como «cambió»— o un blob que no es un frontmatter o un YAML de objeto. Cualquier
 * comparación en que aparezca cuenta como cambio de todos los campos.
 */
export const VERSION_OPACA: unique symbol = Symbol('versión opaca');

/** Los campos de una versión de un fichero, tal como los dejó su analizador. */
export type Version = Readonly<Record<string, unknown>> | typeof VERSION_OPACA;

/** El paso de un fichero de una versión a otra. `null` es «no existe»: alta o baja. */
export interface Transicion {
  antes: Version | null;
  despues: Version | null;
}

/** Una transición del historial, con el instante del commit que la hizo. */
export interface TransicionFechada extends Transicion {
  fecha: FechaDeCambio;
}

/** El historial del Corpus: las transiciones de cada fichero, en cualquier orden. */
export type Historial = ReadonlyMap<string, readonly TransicionFechada[]>;

/** Un fichero que cambió entre dos revisiones, con sus dos versiones — lo que lee el aviso. */
export interface CambioDeFichero extends Transicion {
  fichero: string;
}

/** Que cualquier cambio del fichero cuenta: el documento de Fuente en la Página de Obra. */
export const CUALQUIER_CAMBIO: unique symbol = Symbol('cualquier cambio');

/** Los campos que una superficie pinta de un fichero, o que le basta con que cambie. */
export type Campos = typeof CUALQUIER_CAMBIO | readonly string[];

/**
 * Si una transición cambió alguno de los campos dados — **la** regla de AD-27.
 *
 * Un alta o una baja cambian todos; una versión opaca, también; si no, se comparan los campos
 * uno a uno en forma canónica. La usan, sin copia, la fecha del sitemap y el aviso.
 */
export function cambiaronLosCampos(transicion: Transicion, campos: Campos): boolean {
  if (campos === CUALQUIER_CAMBIO) return true;
  const { antes, despues } = transicion;
  if (antes === null || despues === null) return antes !== despues;
  if (antes === VERSION_OPACA || despues === VERSION_OPACA) return true;
  return campos.some((campo) => canonica(antes[campo]) !== canonica(despues[campo]));
}

/**
 * Una forma de comparar que no depende del orden de las claves y en que un campo ausente es
 * `undefined`: una clave con `undefined` dentro de un objeto se descarta, igual que si faltara.
 */
function canonica(valor: unknown): string {
  return valor === undefined ? '∅' : JSON.stringify(ordenado(valor));
}

function ordenado(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenado);
  if (valor !== null && typeof valor === 'object' && !(valor instanceof Date)) {
    return Object.fromEntries(
      Object.keys(valor)
        .filter((clave) => (valor as Record<string, unknown>)[clave] !== undefined)
        .sort()
        .map((clave) => [clave, ordenado((valor as Record<string, unknown>)[clave])]),
    );
  }
  return valor;
}

// ─── La tabla de campos ──────────────────────────────────────────────────────────────

/** Lo que toda superficie que pinta una Cita afirma de ella: su página, los listados y la Obra. */
const CAMPOS_DE_CITA = ['texto', 'autor', 'temas', 'procedencia', 'fuente', 'slug'] as const;

/** Lo que pinta de un Autor toda superficie que no es la suya: el nombre y los años. */
const CAMPOS_DEL_AUTOR_FUERA = ['nombre', 'añoNacimiento', 'añoFallecimiento'] as const;

/**
 * Qué campos de cada familia de fichero pinta cada familia de superficie — AD-27, Historia 24.8.
 *
 * Es la tabla entera: una casilla que falta es «este fichero no compone esa superficie». Se
 * leen por (familia de fichero → familia de ruta), y la relación las aplica sin excepción.
 *
 *   · la **semblanza** y la **biografía** de un Autor solo las pinta su página (1);
 *   · la ficha de Obra pinta su `titulo` en la Página de Cita y en los listados, y en su propia
 *     página además `autor`, `formas` —qué Citas reúne—, `nota` y `ediciones`;
 *   · un documento, cualquier cambio, y solo en la Página de Obra.
 *
 * Las biografías de `corpus/biografias/` **no** son una familia, y tampoco es un olvido: la
 * Página de Autor pinta de ellas la atribución de la semblanza (título, revisión, licencia),
 * pero cada documento es **una revisión** de una Fuente mutable y no se reescribe —otra revisión
 * es otro fichero, que la ficha apunta con `tools/autor.ts biografia`—. Cambiar de biografía es
 * cambiar el campo `biografia` del Autor, que su página ya pinta y fecha.
 */
export const CAMPOS_QUE_PINTA = {
  cita: {
    cita: CAMPOS_DE_CITA,
    autor: CAMPOS_DE_CITA,
    tema: CAMPOS_DE_CITA,
    coleccion: CAMPOS_DE_CITA,
    obra: CAMPOS_DE_CITA,
  },
  autor: {
    cita: CAMPOS_DEL_AUTOR_FUERA,
    autor: [...CAMPOS_DEL_AUTOR_FUERA, 'semblanza', 'biografia'],
    tema: CAMPOS_DEL_AUTOR_FUERA,
    coleccion: CAMPOS_DEL_AUTOR_FUERA,
    obra: CAMPOS_DEL_AUTOR_FUERA,
  },
  tema: {
    cita: ['nombre'],
    tema: ['nombre'],
  },
  coleccion: {
    coleccion: ['nombre', 'criterio', 'miembros'],
  },
  obra: {
    cita: ['titulo'],
    autor: ['titulo'],
    tema: ['titulo'],
    coleccion: ['titulo'],
    obra: ['autor', 'titulo', 'formas', 'nota', 'ediciones'],
  },
  documento: {
    obra: CUALQUIER_CAMBIO,
  },
} as const satisfies Record<FamiliaDeFichero, Partial<Record<FamiliaDeRuta, Campos>>>;

/**
 * Los campos que el sitio lee y **ninguna** superficie afirma: no fechan ni avisan nada.
 *
 *   · `aptaParaPortada` decide la rotación de la Cita del Día, que solo la portada pinta, y la
 *     portada se avisa siempre que cambie algo del Corpus;
 *   · `estadoDerechos` es una puerta de admisión, no un texto publicado;
 *   · `tradicion` es del suelo del 40 % de tradición latinoamericana (§6.1);
 *   · `distintaDe` solo silencia un aviso del build (22.2).
 *   · `ordenAlfabetico` y `ordenRevisado` (26.1) todavía no los pinta ninguna superficie: la
 *     clave pasará a mover `/autores/` y `/obras/` con la 26.3 y la 26.4; la revisión, nunca.
 *
 * Está escrita para que un campo no fechable sea una decisión con nombre y no un olvido: la
 * prueba de clasificación exige que cada clave de los esquemas esté aquí o en la tabla.
 */
export const CAMPOS_QUE_NO_FECHAN = {
  cita: ['aptaParaPortada', 'estadoDerechos'],
  autor: ['tradicion', 'ordenAlfabetico', 'ordenRevisado'],
  obra: ['distintaDe'],
} as const satisfies Partial<Record<FamiliaDeFichero, readonly string[]>>;

// ─── El corpus leído ─────────────────────────────────────────────────────────────────

/** Una Cita del corpus, con lo justo para saber qué superficies compone. */
export interface CitaParaFechar {
  slug: string;
  autor: string;
  temas?: readonly string[];
  /**
   * El nombre de la Ficha de Obra que la resuelve, si alguna la resuelve — Historia 22.4. Lo
   * pone quien lee el corpus, con `colgarObras`: aquí no se resuelve ninguna Obra viva.
   */
  obra?: string;
  /** La `procedencia.obra` tal como la declara: su forma resuelve bajas y casa documentos. */
  obraDeclarada?: string;
  /** El identificador de su Fuente: con la obra, nombra sus documentos (`documentosDeCita`). */
  fuente?: string;
  /** El fichero del que salió, tal como lo nombra quien leyó el corpus. */
  ruta: string;
}

/** Una Ficha de Obra: su nombre compone la ruta, y su fichero —el título— una fecha. */
export interface ObraParaFechar {
  nombre: string;
  autor: string;
  /** Las formas canónicas que reclama: resuelven las bajas de Cita y las de ficha. */
  formas?: readonly string[];
  ruta: string;
}

/** Un Autor o un Tema: su slug compone una ruta, y su fichero una fecha. */
export interface EntidadParaFechar {
  slug: string;
  ruta: string;
}

/** Una Colección declara a mano los slugs de Cita que agrega. */
export interface ColeccionParaFechar extends EntidadParaFechar {
  miembros: readonly string[];
}

/** Lo que ya no está en el Corpus, con su última versión — Historia 24.8. */
export interface BajasParaFechar {
  citas?: readonly CitaParaFechar[];
  obras?: readonly ObraParaFechar[];
  /** Las rutas de los documentos de Fuente que salieron de `corpus/fuentes/`. */
  documentos?: readonly string[];
}

/**
 * El corpus ya leído, con las rutas de sus ficheros.
 *
 * Son las **declaraciones**, no el conjunto publicable: aquí no se aplica ningún umbral y no
 * debe aplicarse. Quien decide qué se anuncia es `src/lib/superficies.ts` a través del filtro
 * del sitemap (AD-11, Historia 12.1). Calcular de más no publica de más: una entrada que sobre
 * en el mapa nunca se consulta.
 */
export interface CorpusParaFechar {
  citas: readonly CitaParaFechar[];
  autores: readonly EntidadParaFechar[];
  temas: readonly EntidadParaFechar[];
  colecciones: readonly ColeccionParaFechar[];
  /** Las Fichas de Obra — Historia 22.4. Opcional: un corpus sin Obras no la trae. */
  obras?: readonly ObraParaFechar[];
  /** Las rutas de los documentos de `corpus/fuentes/` — Historia 24.8. */
  documentos?: readonly string[];
  /** Las bajas, que salen del historial y no del disco — Historia 24.8. */
  bajas?: BajasParaFechar;
}

// ─── La relación ─────────────────────────────────────────────────────────────────────

/** Un fichero que compone una superficie, con los campos suyos que esa superficie pinta. */
export interface Componente {
  fichero: string;
  campos: Campos;
}

/** Una superficie de la relación: su familia de ruta y lo que la compone. */
export interface Superficie {
  familia: FamiliaDeRuta;
  componentes: readonly Componente[];
}

/** La relación «ruta canónica → superficie», tal como la da `relacionDeSuperficies`. */
export type Relacion = ReadonlyMap<string, Superficie>;

/**
 * Qué compone cada superficie, por su ruta **canónica** — AD-27.
 *
 * Es el **único dueño** de la relación. Tiene dos lecturas y ninguna la repite: la fecha del
 * sitemap (`superficiesFechadas`) y el aviso (`rutasAvisadasPor` de `tools/lib/avisar.ts`),
 * las dos con `cambiaronLosCampos`. Que sean inversas lo fija `tests/unit/indexnow.test.ts`.
 * Las rutas salen de los constructores de `src/lib/superficies.ts`, nunca escritas a mano.
 */
export function relacionDeSuperficies(corpus: CorpusParaFechar): Map<string, Superficie> {
  const ficheroDeAutor = new Map(corpus.autores.map((autor) => [autor.slug, autor.ruta]));
  const ficheroDeTema = new Map(corpus.temas.map((tema) => [tema.slug, tema.ruta]));
  const fichas = corpus.obras ?? [];
  const ficheroDeObra = new Map(fichas.map((obra) => [obra.nombre, obra.ruta]));
  const bajas = corpus.bajas ?? {};
  const vivos = new Set(ficherosDelCorpus(corpus));

  /** La ficha viva que reclama (Autor, forma): resuelve la Obra de una Cita que se fue. */
  const fichaViva = new Map<string, ObraParaFechar>();
  for (const ficha of fichas) {
    for (const forma of ficha.formas ?? []) fichaViva.set(clave(ficha.autor, forma), ficha);
  }
  /** Las fichas que se fueron, por (Autor, forma): fechan las Citas de hoy que reclamaban. */
  const fichasDeBaja = new Map<string, string[]>();
  for (const ficha of bajas.obras ?? []) {
    if (vivos.has(ficha.ruta)) continue;
    for (const forma of ficha.formas ?? []) apilar(fichasDeBaja, clave(ficha.autor, forma), ficha.ruta);
  }
  /** Los documentos, de hoy y de baja, por su nombre sin extensión. */
  const documentos = new Map<string, string[]>();
  for (const ruta of [...(corpus.documentos ?? []), ...(bajas.documentos ?? [])]) {
    apilar(documentos, nombreDeDocumento(ruta), ruta);
  }

  /** Las fichas de Obra cuyo título pinta una Cita viva: la suya y las de baja que la reclamaban. */
  const fichasDeLaCita = (cita: CitaParaFechar): string[] => {
    const forma = formaDe(cita);
    return [
      ...(cita.obra === undefined ? [] : [ficheroDeObra.get(cita.obra)].filter(definido)),
      ...(forma === undefined ? [] : (fichasDeBaja.get(clave(cita.autor, forma)) ?? [])),
    ];
  };

  const porSuperficie = new Map<string, { familia: FamiliaDeRuta; campos: Map<string, Campos> }>();
  const declarar = (ruta: string, familia: FamiliaDeRuta) => {
    if (!porSuperficie.has(ruta)) porSuperficie.set(ruta, { familia, campos: new Map() });
  };
  /** Añade un fichero a una superficie ya declarada, con los campos que la tabla le da. */
  const componer = (ruta: string, fichero: string | undefined, deFamilia: FamiliaDeFichero) => {
    const superficie = porSuperficie.get(ruta);
    if (superficie === undefined || fichero === undefined) return;
    const campos = (CAMPOS_QUE_PINTA[deFamilia] as Partial<Record<FamiliaDeRuta, Campos>>)[
      superficie.familia
    ];
    if (campos === undefined) return;
    const previos = superficie.campos.get(fichero);
    superficie.campos.set(fichero, previos === undefined ? campos : unir(previos, campos));
  };
  /** Una Cita viva en un listado: ella, su Autor y las fichas de Obra cuyo título pinta. */
  const conLaCita = (ruta: string, cita: CitaParaFechar) => {
    componer(ruta, cita.ruta, 'cita');
    componer(ruta, ficheroDeAutor.get(cita.autor), 'autor');
    for (const ficha of fichasDeLaCita(cita)) componer(ruta, ficha, 'obra');
  };

  const citasDeObra = new Map<string, CitaParaFechar[]>();
  for (const cita of corpus.citas) {
    if (cita.obra !== undefined) apilar(citasDeObra, cita.obra, cita);
  }

  // La Página de Cita: su fichero, su Autor, sus Temas y su ficha de Obra. Nunca sus hermanas.
  for (const cita of corpus.citas) {
    const ruta = rutaDeCita(cita.slug);
    declarar(ruta, 'cita');
    componer(ruta, cita.ruta, 'cita');
    componer(ruta, ficheroDeAutor.get(cita.autor), 'autor');
    for (const tema of cita.temas ?? []) componer(ruta, ficheroDeTema.get(tema), 'tema');
    for (const ficha of fichasDeLaCita(cita)) componer(ruta, ficha, 'obra');
  }

  // Los listados de Autor, Tema y Colección.
  for (const autor of corpus.autores) declarar(rutaDeAutor(autor.slug), 'autor');
  for (const tema of corpus.temas) declarar(rutaDeTema(tema.slug), 'tema');
  for (const coleccion of corpus.colecciones) declarar(rutaDeColeccion(coleccion.slug), 'coleccion');
  for (const autor of corpus.autores) componer(rutaDeAutor(autor.slug), autor.ruta, 'autor');
  for (const tema of corpus.temas) componer(rutaDeTema(tema.slug), tema.ruta, 'tema');
  for (const cita of corpus.citas) {
    conLaCita(rutaDeAutor(cita.autor), cita);
    for (const tema of cita.temas ?? []) conLaCita(rutaDeTema(tema), cita);
  }
  const deCita = new Map(corpus.citas.map((cita) => [cita.slug, cita]));
  for (const coleccion of corpus.colecciones) {
    const ruta = rutaDeColeccion(coleccion.slug);
    componer(ruta, coleccion.ruta, 'coleccion');
    // Un miembro que no resuelve —Cita retirada a revisión, o errata— no aporta nada aquí: la
    // pertenencia es blanda por diseño (Historia 12.2). Su baja, si la hubo, entra más abajo.
    for (const slug of coleccion.miembros) {
      const cita = deCita.get(slug);
      if (cita !== undefined) conLaCita(ruta, cita);
    }
  }

  // La Página de Obra: su ficha, sus Citas, su Autor y sus documentos. Sin Citas no tiene página.
  for (const obra of fichas) {
    const citas = citasDeObra.get(obra.nombre);
    if (citas === undefined) continue;
    const ruta = rutaDeLaObra(obra);
    declarar(ruta, 'obra');
    componer(ruta, obra.ruta, 'obra');
    for (const cita of citas) componer(ruta, cita.ruta, 'cita');
    componer(ruta, ficheroDeAutor.get(obra.autor), 'autor');
    for (const cita of citas) {
      if (cita.fuente === undefined) continue;
      for (const nombre of documentosDeCita({ id: cita.fuente }, cita.obraDeclarada, documentos)) {
        for (const documento of documentos.get(nombre) ?? []) componer(ruta, documento, 'documento');
      }
    }
  }

  /*
   * Las bajas de Cita fechan lo vivo que compondrían —su Autor, sus Temas, sus Colecciones y su
   * Obra— y nunca declaran su propia página: `componer` no declara nada. La Obra se resuelve
   * contra las fichas de hoy, por (Autor, forma).
   */
  const coleccionesDe = new Map<string, string[]>();
  for (const coleccion of corpus.colecciones) {
    for (const slug of coleccion.miembros) apilar(coleccionesDe, slug, rutaDeColeccion(coleccion.slug));
  }
  for (const baja of bajas.citas ?? []) {
    if (vivos.has(baja.ruta)) continue;
    componer(rutaDeAutor(baja.autor), baja.ruta, 'cita');
    for (const tema of baja.temas ?? []) componer(rutaDeTema(tema), baja.ruta, 'cita');
    for (const ruta of coleccionesDe.get(baja.slug) ?? []) componer(ruta, baja.ruta, 'cita');
    const forma = formaDe(baja);
    const obra = forma === undefined ? undefined : fichaViva.get(clave(baja.autor, forma));
    if (obra !== undefined) componer(rutaDeLaObra(obra), baja.ruta, 'cita');
  }

  /*
   * La portada **no se declara**, y la ausencia es la decisión: rota a diario sin commit
   * (AD-12). El razonamiento largo está en la cabecera del módulo. El aviso, en cambio, la
   * anuncia siempre que cambie algo del Corpus que no sea un documento.
   */

  const relacion = new Map<string, Superficie>();
  for (const [ruta, { familia, campos }] of porSuperficie) {
    relacion.set(ruta, {
      familia,
      componentes: [...campos].map(([fichero, deFichero]) => ({ fichero, campos: deFichero })),
    });
  }
  return relacion;
}

/**
 * Qué compone cada superficie, por su ruta ya normalizada — la forma con que el sitemap
 * pregunta. `rutaNormalizada` decide que la dirección completa y la ruta con barra final son la
 * misma superficie.
 */
export function componentesPorSuperficie(corpus: CorpusParaFechar): Map<string, readonly Componente[]> {
  const porSuperficie = new Map<string, readonly Componente[]>();
  for (const [ruta, { componentes }] of relacionDeSuperficies(corpus)) {
    porSuperficie.set(rutaNormalizada(ruta), componentes);
  }
  return porSuperficie;
}

// ─── La lectura de fechas ────────────────────────────────────────────────────────────

/**
 * La fecha más reciente, **por instante**, entre las transiciones de cada componente que cambian
 * sus campos; o la ausencia si no hay ninguna. Un componente sin historial **no arrastra a los
 * demás**: una Cita recién escrita y sin commit no borra la fecha del Tema que la agrega.
 */
export function fechaDeLosComponentes(
  componentes: readonly Componente[],
  historial: Historial,
  memoria: Map<string, FechaDeCambio | undefined> = new Map(),
): FechaDeCambio | undefined {
  let masReciente: FechaDeCambio | undefined;
  for (const componente of componentes) {
    const fecha = fechaDelComponente(componente, historial, memoria);
    if (fecha !== undefined && (masReciente === undefined || fecha > masReciente)) masReciente = fecha;
  }
  return masReciente;
}

function fechaDelComponente(
  { fichero, campos }: Componente,
  historial: Historial,
  memoria: Map<string, FechaDeCambio | undefined>,
): FechaDeCambio | undefined {
  // Ordenados: `unir` compone los campos en el orden en que llegan, y el mismo conjunto tiene
  // que dar la misma llave.
  const llave = `${fichero}\u0000${campos === CUALQUIER_CAMBIO ? '*' : [...campos].sort().join(',')}`;
  if (memoria.has(llave)) return memoria.get(llave);
  let masReciente: FechaDeCambio | undefined;
  for (const transicion of historial.get(fichero) ?? []) {
    if (masReciente !== undefined && transicion.fecha <= masReciente) continue;
    if (cambiaronLosCampos(transicion, campos)) masReciente = transicion.fecha;
  }
  memoria.set(llave, masReciente);
  return masReciente;
}

/**
 * Cada superficie con fecha, por su ruta **canónica** y con su familia — la lectura de fechas de
 * la relación. Las superficies sin fecha **no entran**: es la fila «Fecha indeterminable», y es
 * lo que hace que un fallo degrade a un sitemap sin fechas, honesto, en vez de a fechas
 * inventadas. La usa el sitemap (por ruta normalizada) y el ensayo de `tools/avisar.ts`.
 */
export function superficiesFechadas(
  corpus: CorpusParaFechar,
  historial: Historial,
): Map<string, { familia: FamiliaDeRuta; fecha: FechaDeCambio }> {
  const memoria = new Map<string, FechaDeCambio | undefined>();
  const resultado = new Map<string, { familia: FamiliaDeRuta; fecha: FechaDeCambio }>();
  for (const [ruta, { familia, componentes }] of relacionDeSuperficies(corpus)) {
    const fecha = fechaDeLosComponentes(componentes, historial, memoria);
    if (fecha !== undefined) resultado.set(ruta, { familia, fecha });
  }
  return resultado;
}

/** La fecha del último cambio de cada superficie, por ruta normalizada — el `lastmod`. */
export function fechasPorSuperficie(
  corpus: CorpusParaFechar,
  historial: Historial,
): Map<string, FechaDeCambio> {
  const resultado = new Map<string, FechaDeCambio>();
  for (const [ruta, { fecha }] of superficiesFechadas(corpus, historial)) {
    resultado.set(rutaNormalizada(ruta), fecha);
  }
  return resultado;
}

/**
 * Las bajas de un historial — Historia 24.8: los ficheros cuya última transición, por instante,
 * es un borrado, con la versión que tenían antes de salir. Lo que hoy está vivo no es baja
 * aunque su historial termine en un borrado (una restitución todavía sin commit). Una versión
 * opaca no dice a qué componía, así que no entra: su propio borrado ya no tiene a quién fechar
 * (el aviso sí lo encuentra, en la relación de `--desde`).
 *
 * Solo hay bajas de Cita, de ficha de Obra y de documento, y no es un olvido: la baja de un
 * Autor, de un Tema o de una Colección no compone ninguna superficie **viva**. Un Autor solo se
 * retira cuando nada del Corpus apunta a él (`tools/autor.ts retirar`), una Cita viva que nombre
 * un Tema que ya no existe rompe el build (`reference('temas')`), y una Colección solo compone su
 * propia página, que sale con ella. Lo que sí cambia —su propia página, que deja de existir— lo
 * avisa el aviso por la relación de `--desde`.
 */
export function bajasDelHistorial(
  historial: Historial,
  familiaDe: (fichero: string) => FamiliaDeFichero | undefined,
  vivos: ReadonlySet<string>,
): BajasParaFechar {
  const citas: CitaParaFechar[] = [];
  const obras: ObraParaFechar[] = [];
  const documentos: string[] = [];
  for (const [fichero, transiciones] of historial) {
    if (vivos.has(fichero) || transiciones.length === 0) continue;
    let ultima = transiciones[0] as TransicionFechada;
    for (const transicion of transiciones) if (transicion.fecha > ultima.fecha) ultima = transicion;
    if (ultima.despues !== null) continue;
    const familia = familiaDe(fichero);
    if (familia === 'documento') {
      documentos.push(fichero);
      continue;
    }
    const version = ultima.antes;
    if (version === null || version === VERSION_OPACA) continue;
    if (familia === 'cita') {
      const { slug, autor, temas, procedencia } = version as Record<string, unknown>;
      if (typeof slug !== 'string' || typeof autor !== 'string') continue;
      const obra = (procedencia as { obra?: unknown } | null | undefined)?.obra;
      citas.push({
        slug,
        autor,
        temas: Array.isArray(temas) ? temas.filter((t): t is string => typeof t === 'string') : [],
        ...(typeof obra === 'string' ? { obraDeclarada: obra } : {}),
        ruta: fichero,
      });
    } else if (familia === 'obra') {
      const { autor, formas } = version as Record<string, unknown>;
      if (typeof autor !== 'string' || !Array.isArray(formas)) continue;
      obras.push({
        nombre: nombreDeFicha(fichero),
        autor,
        formas: formas.filter((f): f is string => typeof f === 'string'),
        ruta: fichero,
      });
    }
  }
  return { citas, obras, documentos };
}

/** El mismo corpus con cada ruta de fichero traducida —a relativa, por ejemplo—. */
export function conRutas(corpus: CorpusParaFechar, traducir: (ruta: string) => string): CorpusParaFechar {
  const cita = (c: CitaParaFechar) => ({ ...c, ruta: traducir(c.ruta) });
  const obra = (o: ObraParaFechar) => ({ ...o, ruta: traducir(o.ruta) });
  return {
    citas: corpus.citas.map(cita),
    autores: corpus.autores.map((a) => ({ ...a, ruta: traducir(a.ruta) })),
    temas: corpus.temas.map((t) => ({ ...t, ruta: traducir(t.ruta) })),
    colecciones: corpus.colecciones.map((c) => ({ ...c, ruta: traducir(c.ruta) })),
    ...(corpus.obras === undefined ? {} : { obras: corpus.obras.map(obra) }),
    ...(corpus.documentos === undefined ? {} : { documentos: corpus.documentos.map(traducir) }),
    ...(corpus.bajas === undefined
      ? {}
      : {
          bajas: {
            citas: (corpus.bajas.citas ?? []).map(cita),
            obras: (corpus.bajas.obras ?? []).map(obra),
            documentos: (corpus.bajas.documentos ?? []).map(traducir),
          },
        }),
  };
}

/** Los ficheros vivos del Corpus que componen alguna superficie, documentos incluidos, sin repetir. */
export function ficherosDelCorpus(corpus: CorpusParaFechar): string[] {
  return [
    ...new Set([
      ...corpus.citas.map((cita) => cita.ruta),
      ...corpus.autores.map((autor) => autor.ruta),
      ...corpus.temas.map((tema) => tema.ruta),
      ...corpus.colecciones.map((coleccion) => coleccion.ruta),
      ...(corpus.obras ?? []).map((obra) => obra.ruta),
      ...(corpus.documentos ?? []),
    ]),
  ];
}

/**
 * Por debajo de esta fracción de ficheros con historial, el cruce está roto y no menguado.
 *
 * La mitad, y no un número pegado al Corpus de hoy: que falten algunas fechas es **normal** —una
 * Cita recién escrita y sin commit no tiene historial—; que falten casi todas significa que las
 * rutas de git y las del corpus no casan, y eso no mengua el resultado, lo anula.
 */
export const SUELO_DE_COBERTURA = 0.5;

/**
 * El aviso cuando el historial no cubrió lo que debía, o la ausencia si cubrió bastante.
 *
 * **Es el guardián del fallo mudo.** `git log -- <ámbito que no casa>` sale con código 0 y salida
 * vacía, el mapa queda vacío y el sitemap sale sin fechas como si cada superficie fuera un caso
 * legítimo de «fecha indeterminable». Se mide sobre los ficheros vivos con alguna transición en
 * el historial. Un Corpus vacío no avisa: no hay nada que fechar.
 */
export function coberturaInsuficiente(
  corpus: CorpusParaFechar,
  historial: ReadonlyMap<string, unknown>,
): string | undefined {
  const ficheros = ficherosDelCorpus(corpus);
  if (ficheros.length === 0) return undefined;

  const conHistorial = ficheros.filter((fichero) => historial.has(fichero)).length;
  if (conHistorial === 0) {
    return `el historial no fechó ni uno solo de los ${ficheros.length} ficheros del Corpus`;
  }
  if (conHistorial / ficheros.length < SUELO_DE_COBERTURA) {
    return `el historial solo fechó ${conHistorial} de los ${ficheros.length} ficheros del Corpus`;
  }
  return undefined;
}

/**
 * La fecha que le toca a una entrada del sitemap, o la ausencia — lo que consume
 * `astro.config.mjs`.
 *
 * Vive aquí porque **la configuración no puede llevar un `try`/`catch`**
 * (`tests/unit/puerta-de-admision.test.ts`), y `@astrojs/sitemap` **descarta el sitemap entero**
 * si su `serialize` lanza: el precio de equivocarse no es una entrada sin fecha, es un sitio sin
 * sitemap.
 */
export function fechaDeLaEntrada(
  fechas: ReadonlyMap<string, FechaDeCambio>,
  direccion: string,
): FechaDeCambio | undefined {
  let ruta: string;
  try {
    ruta = rutaNormalizada(direccion);
  } catch {
    return undefined;
  }
  return fechas.get(ruta);
}

// ─── Ayudantes ───────────────────────────────────────────────────────────────────────

function formaDe(cita: CitaParaFechar): string | undefined {
  if (cita.obraDeclarada === undefined) return undefined;
  const forma = formaDeObra(cita.obraDeclarada);
  return forma === '' ? undefined : forma;
}

function clave(autor: string, forma: string): string {
  return `${autor}\u0000${forma}`;
}

/** El nombre de un fichero sin directorio y, si es un documento, sin su `.txt`. */
function nombreDeDocumento(ruta: string): string {
  return (ruta.split(/[\\/]/u).pop() ?? ruta).replace(/\.txt$/u, '');
}

/** El nombre de una ficha de Obra —`autor--obra`—: su fichero sin directorio ni `.yml`/`.yaml`. */
function nombreDeFicha(ruta: string): string {
  return (ruta.split(/[\\/]/u).pop() ?? ruta).replace(/\.ya?ml$/u, '');
}

function unir(a: Campos, b: Campos): Campos {
  if (a === CUALQUIER_CAMBIO || b === CUALQUIER_CAMBIO) return CUALQUIER_CAMBIO;
  return [...new Set([...a, ...b])];
}

function definido<T>(valor: T | undefined): valor is T {
  return valor !== undefined;
}

function apilar<T>(mapa: Map<string, T[]>, llave: string, valor: T): void {
  const lista = mapa.get(llave);
  if (lista === undefined) mapa.set(llave, [valor]);
  else lista.push(valor);
}
