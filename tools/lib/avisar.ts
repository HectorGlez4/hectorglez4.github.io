/**
 * Qué superficies cambian cuando cambia un fichero del Corpus — FR-38, AD-27, Historia 24.8.
 *
 * Este módulo **no decide** qué fichero compone qué página ni qué campos pinta: eso tiene un solo
 * dueño, `relacionDeSuperficies` de `tools/lib/cambios.ts`, que también fecha el sitemap, y la
 * regla de si una transición cambió esos campos es `cambiaronLosCampos`, la misma que usa la
 * fecha. Aquí se lee esa relación al revés —«cambio → rutas»— y se le añade lo único que es del
 * aviso: la portada y la indexabilidad de las Obras, que no sale de ningún fichero. Que las dos
 * lecturas sean inversas lo fija `tests/unit/indexnow.test.ts`.
 *
 * `tools/avisar.ts` averigua qué ficheros cambió git y con qué versiones, lee el Corpus de antes
 * y de después y las dos listas de Obras indexables, y entrega aquí datos ya leídos; este módulo
 * no toca disco ni red.
 */
import { SITIO } from '../../src/lib/dominio.ts';
import { esRutaDeObra, rutaNormalizada } from '../../src/lib/superficies.ts';
import {
  cambiaronLosCampos,
  type CambioDeFichero,
  type Relacion as RelacionDeCambios,
} from './cambios.ts';

/**
 * Las familias de **fichero** del Corpus: los únicos directorios cuyo contenido llega al HTML
 * público, y la familia de cada uno — Historia 24.8.
 *
 * Una sola tabla alimenta el filtro de `git diff`, el del historial y el reconocimiento
 * posterior: si se añade otra familia publicable, no puede quedar visible para una mitad del
 * aviso e invisible para la otra. Las Fichas de Obra entran desde la 22.8; los documentos de
 * Fuente, desde la 24.8, porque ordenan las Citas de la Página de Obra (24.1) y solo la fechan a
 * ella.
 */
export const FAMILIAS_DE_FICHERO = [
  ['corpus/citas', 'cita'],
  ['corpus/autores', 'autor'],
  ['corpus/temas', 'tema'],
  ['corpus/colecciones', 'coleccion'],
  ['corpus/obras', 'obra'],
  ['corpus/fuentes', 'documento'],
] as const;

export type FamiliaDeFichero = (typeof FAMILIAS_DE_FICHERO)[number][1];

/**
 * Las familias de **ruta**: las superficies que la relación declara. La portada no es ninguna:
 * no lleva fecha y se avisa aparte. La familia de una ruta la pone su entrada en la relación,
 * nunca el prefijo de la ruta.
 */
export const FAMILIAS_DE_RUTA = ['cita', 'autor', 'tema', 'coleccion', 'obra'] as const;

export type FamiliaDeRuta = (typeof FAMILIAS_DE_RUTA)[number];

/** Reconoce solo las familias publicables; el metadato vecino no emite aviso. */
export function familiaDeFichero(fichero: string): FamiliaDeFichero | undefined {
  const relativa = fichero.split('\\').join('/');
  return FAMILIAS_DE_FICHERO.find(([directorio]) => relativa.startsWith(`${directorio}/`))?.[1];
}

/** La relación «ruta canónica → superficie», tal como la da `cambios.ts`. */
export type Relacion = RelacionDeCambios;

/**
 * La lectura inversa de la relación: las rutas con algún componente cuyo fichero cambió **en
 * los campos que esa ruta pinta**.
 *
 * Es la definición entera de «a quién afecta un cambio»: R se avisa por el cambio de F si y solo
 * si F compone R y `cambiaronLosCampos` dice que la transición de F cambió sus campos en R — la
 * misma regla con que se fecha R. Las rutas salen tal como las declara la relación —canónicas,
 * con su barra final—, que es lo que el buscador tiene que recibir.
 */
export function rutasAvisadasPor(cambios: readonly CambioDeFichero[], relacion: Relacion): Set<string> {
  const porFichero = new Map(cambios.map((cambio) => [normalizar(cambio.fichero), cambio]));
  const rutas = new Set<string>();
  for (const [ruta, { componentes }] of relacion) {
    const tocada = componentes.some((componente) => {
      const cambio = porFichero.get(normalizar(componente.fichero));
      return cambio !== undefined && cambiaronLosCampos(cambio, componente.campos);
    });
    if (tocada) rutas.add(ruta);
  }
  return rutas;
}

function normalizar(fichero: string): string {
  return fichero.split('\\').join('/');
}

/** Una lista de rutas de Obra indexables, o por qué no se pudo leer. */
export type ListaDeObras = { rutas: readonly string[] } | { motivo: string };

export interface EntradaDelAviso {
  /**
   * Los ficheros del Corpus que cambiaron, relativos a la raíz del repositorio, con su versión
   * de antes y la de después (`null` si no existe en ese lado).
   */
  cambios: readonly CambioDeFichero[];
  /**
   * Si el rango cambió la regla de indexabilidad sin tocar el Corpus —`src/lib/umbrales.ts`:
   * una congelación, o un umbral de FR-52—. Entonces no hay fichero que avisar, pero las
   * listas de antes y de después se comparan igual.
   */
  reglaCambiada?: boolean;
  /** La relación sobre el Corpus de después —el que se acaba de desplegar—. */
  relacionDespues: Relacion;
  /**
   * La relación sobre el Corpus de antes. Es la que sabe a qué páginas pertenecía un fichero
   * que este rango borró: una Cita retirada sigue apareciendo aquí.
   */
  relacionAntes?: Relacion;
  /** Las Obras indexables antes: el Corpus y la congelación de `--desde`. */
  indexablesAntes: ListaDeObras;
  /** Las Obras indexables después, leídas del sitemap construido y desplegado. */
  indexablesDespues: ListaDeObras;
}

export interface AvisoCompuesto {
  rutas: string[];
  /** Lo que no se pudo decidir y por qué. Nunca rompe: el sitio ya está en línea. */
  avisos: string[];
}

/**
 * Compone las rutas que hay que avisar por un rango de cambios.
 *
 * La portada va siempre que cambie algo del Corpus que no sea un documento —también un campo que
 * no fecha nada, como `aptaParaPortada`, que es justo lo que decide su rotación—: enumera
 * Autores, Temas y Colecciones y cambia con la jornada. Lo demás es la lectura inversa de la
 * relación, por campos, sobre el Corpus de antes y el de después, con una sola excepción, que es
 * de la Obra (FR-38, 22.8).
 * Una Obra tiene tres estados —indexable, `noindex` o ausente—, y:
 *
 *   · una Obra cuya ficha, Citas, Autor o documentos cambiaron —en lo que ella pinta— se avisa si su estado cambió en cualquier
 *     sentido —desaparece, pasa a `noindex`, nace— y, si no cambió, solo si es indexable. Una
 *     `noindex` antes y después no se avisa. Si falta el dato de un lado y el otro no lo
 *     decide, se nombra en vez de callarlo.
 *   · una Obra hermana —que no toca ningún fichero cambiado— se avisa **solo si cambia su
 *     indexabilidad**, comparando la lista de antes con la de después. Nunca mapeando una Cita
 *     a todas las Obras de su Autor.
 *
 * Si una de las dos listas no se pudo leer, no se avisa ninguna hermana y se dice por qué; el
 * resto del aviso sigue.
 */
export function componerAviso(entrada: EntradaDelAviso): AvisoCompuesto {
  const avisos: string[] = [];
  if (entrada.cambios.length === 0 && entrada.reglaCambiada !== true) return { rutas: [], avisos };

  const despues = new Map<string, string>();
  for (const ruta of entrada.relacionDespues.keys()) despues.set(rutaNormalizada(ruta), ruta);
  const antes = new Map<string, string>();
  for (const ruta of entrada.relacionAntes?.keys() ?? []) antes.set(rutaNormalizada(ruta), ruta);

  const listaAntes = 'rutas' in entrada.indexablesAntes
    ? new Map(entrada.indexablesAntes.rutas.map((r) => [rutaNormalizada(r), r]))
    : undefined;
  const listaDespues = 'rutas' in entrada.indexablesDespues
    ? new Map(entrada.indexablesDespues.rutas.map((r) => [rutaNormalizada(r), r]))
    : undefined;

  /** Ausente después se sabe por la relación, haya sitemap o no. */
  const estadoDespues = (normalizada: string): EstadoAnunciable | undefined => {
    if (!despues.has(normalizada)) return 'ausente';
    if (listaDespues === undefined) return undefined;
    return listaDespues.has(normalizada) ? 'indexable' : 'noindex';
  };
  const estadoAntes = (normalizada: string): EstadoAnunciable | undefined => {
    if (entrada.relacionAntes !== undefined && !antes.has(normalizada)) return 'ausente';
    if (listaAntes === undefined) return undefined;
    if (listaAntes.has(normalizada)) return 'indexable';
    return entrada.relacionAntes === undefined ? undefined : 'noindex';
  };

  // La portada, con cualquier cambio del Corpus que no sea un documento: un documento solo
  // compone la Página de Obra, y la portada no pinta ninguno.
  const portada = entrada.cambios.some((cambio) => familiaDeFichero(cambio.fichero) !== 'documento');
  const rutas = new Set<string>(portada ? ['/'] : []);
  const tocadas = new Set<string>([
    ...rutasAvisadasPor(entrada.cambios, entrada.relacionDespues),
    ...(entrada.relacionAntes === undefined
      ? []
      : rutasAvisadasPor(entrada.cambios, entrada.relacionAntes)),
  ]);

  const obrasSinDecidir: string[] = [];
  for (const ruta of tocadas) {
    if (!esRutaDeObra(ruta)) {
      rutas.add(ruta);
      continue;
    }
    const normalizada = rutaNormalizada(ruta);
    const ahora = estadoDespues(normalizada);
    const entonces = estadoAntes(normalizada);
    if (ahora === 'indexable') rutas.add(ruta);
    else if (ahora !== undefined && entonces !== undefined) {
      // Cambió en cualquier sentido —desaparece, pasa a `noindex`, nace—: se anuncia.
      if (ahora !== entonces) rutas.add(ruta);
    } else if (entonces === 'indexable') {
      // Era indexable y hoy no se sabe: o sigue siéndolo o cambió; en los dos casos se anuncia.
      rutas.add(ruta);
    } else {
      obrasSinDecidir.push(ruta);
    }
  }
  if (obrasSinDecidir.length > 0) {
    const faltan = [
      ...(listaAntes === undefined ? [`antes: ${motivoDe(entrada.indexablesAntes)}`] : []),
      ...(listaDespues === undefined ? [`después: ${motivoDe(entrada.indexablesDespues)}`] : []),
    ];
    avisos.push(
      `${obrasSinDecidir.length} Obra(s) tocada(s) sin avisar: no se sabe si se indexan ni si ` +
        `se indexaban (${faltan.join('; ')}): ${obrasSinDecidir.join(', ')}.`,
    );
  }

  if (listaAntes === undefined || listaDespues === undefined) {
    const motivos = [
      ...(listaAntes === undefined ? [`antes: ${motivoDe(entrada.indexablesAntes)}`] : []),
      ...(listaDespues === undefined ? [`después: ${motivoDe(entrada.indexablesDespues)}`] : []),
    ];
    avisos.push(
      `No se avisa ninguna Obra hermana por cambio de indexabilidad: falta una de las dos ` +
        `listas (${motivos.join('; ')}).`,
    );
  } else {
    // Toda ruta de Obra que entra o sale del conjunto indexable, en cualquier sentido.
    for (const [normalizada, ruta] of listaAntes) {
      if (!listaDespues.has(normalizada)) rutas.add(despues.get(normalizada) ?? antes.get(normalizada) ?? ruta);
    }
    for (const [normalizada, ruta] of listaDespues) {
      if (!listaAntes.has(normalizada)) rutas.add(despues.get(normalizada) ?? ruta);
    }
  }

  return { rutas: [...rutas], avisos };
}

/** El estado de una ruta de Obra que el aviso compara: tres valores, no dos. */
type EstadoAnunciable = 'indexable' | 'noindex' | 'ausente';

function motivoDe(lista: ListaDeObras): string {
  return 'motivo' in lista ? lista.motivo : 'leída';
}

/**
 * Las rutas de Obra de un sitemap, canónicas y con su barra final. Solo las del origen del
 * sitio: una `<loc>` de otro host —`www.` incluido— no es una página de esta propiedad.
 */
export function rutasDeObraDelSitemap(xml: string, sitio: string = SITIO): string[] {
  const origen = new URL(sitio).origin;
  const rutas: string[] = [];
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    let url: URL;
    try {
      url = new URL((m[1] ?? '').trim());
    } catch {
      continue;
    }
    if (url.origin !== origen) continue;
    if (esRutaDeObra(url.pathname)) rutas.push(url.pathname);
  }
  return rutas;
}
