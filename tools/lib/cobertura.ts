/**
 * La cobertura tipográfica: ninguna página se publica con un carácter que las fuentes
 * declaradas no sepan componer.
 *
 * Puro y sin disco. Aquí vive lo que decide: qué cubre cada familia, qué texto de una
 * página llega a componerse, y qué caracteres se quedan fuera. Quien lee `dist/` y rompe
 * la construcción es `integraciones/cobertura.ts`, cáscara fina encima de esto, y vive
 * fuera de `src/lib/` porque AD-5 exige que la derivación no toque el disco. La
 * separación es la de `cotejo.ts`: el criterio se prueba entero sin construir el sitio.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────────────
 *
 * `astro.config.mjs` declara el subconjunto `latin` y solo el estilo normal, y esa
 * decisión se tomó midiendo: cada cara declarada es un `.woff2` precargado en el camino
 * crítico, y las ocho de antes costaban 460 KiB y 3,2 s de LCP en móvil. Es una decisión
 * correcta **hoy**, sobre el corpus de hoy. Lo que la vuelve segura mañana es esto.
 *
 * Sin puerta, una Cita nueva con una `ő`, una `ș` o una palabra en griego se publicaría
 * sin que nada fallara: el navegador cae al tipo de reserva y compone esa palabra con
 * Georgia en mitad de una línea de Source Serif. Nadie ve un error; se ve una Cita fea,
 * y solo si alguien la mira. Es exactamente el fallo silencioso que el resto del
 * repositorio persigue con puertas y no con avisos.
 *
 * ── Por qué lee el CSS emitido y no una tabla propia ─────────────────────────────────
 *
 * Los rangos no se escriben aquí: se leen de los `@font-face` que el build acaba de
 * emitir. Una copia de los rangos de `latin` sería un segundo sitio donde se declara lo
 * mismo, y el repositorio ya sabe cómo acaba eso —la Historia 12.1 nació de tener la
 * declaración de «publicable» en tres sitios—. Leyéndolos, ampliar `subsets` en la
 * configuración ensancha la puerta sola, y estrecharlos la estrecha: la puerta no puede
 * discrepar de lo que el sitio de verdad descarga.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Lo que cubre cada familia
// ─────────────────────────────────────────────────────────────────────────────

export interface Rango {
  readonly desde: number;
  readonly hasta: number;
}

/**
 * Los rangos que declara cada familia de fuente **real** del CSS.
 *
 * Se ignoran las caras sin `unicode-range`, y con ellas las familias de reserva que la
 * Fonts API sintetiza —«Inter-… fallback: Arial», con `src: local(...)`—. No es un
 * descarte cosmético: una cara sin rango cubre todo Unicode por definición, así que
 * contarla haría que la puerta diera por bueno cualquier carácter. La reserva es
 * justamente lo que esta puerta existe para no usar.
 */
export function rangosPorFamilia(css: string): Map<string, Rango[]> {
  const porFamilia = new Map<string, Rango[]>();

  for (const bloque of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const cuerpo = bloque[1] ?? '';

    const rango = /unicode-range:\s*([^;}]+)/i.exec(cuerpo);
    if (rango === null) continue;

    const familia = /font-family:\s*([^;}]+)/i.exec(cuerpo);
    if (familia === null) continue;

    const nombre = (familia[1] ?? '').trim().replace(/^["']|["']$/g, '');
    const acumulados = porFamilia.get(nombre) ?? [];
    acumulados.push(...interpretarRangos(rango[1] ?? ''));
    porFamilia.set(nombre, acumulados);
  }

  return porFamilia;
}

/**
 * `U+0000-00FF, U+0131, U+2000-206F` → los tres intervalos que nombra.
 *
 * La forma con comodín —`U+04??`— es legal en CSS y no la emite ningún proveedor que
 * usemos; se interpreta igualmente porque interpretarla mal por lo bajo cerraría la
 * puerta sobre caracteres que sí se componen, y una puerta que falla en falso se acaba
 * quitando.
 */
function interpretarRangos(declaracion: string): Rango[] {
  const rangos: Rango[] = [];

  for (const trozo of declaracion.split(',')) {
    const limpio = trozo.trim().replace(/^u\+/i, '');
    if (limpio === '') continue;

    if (limpio.includes('?')) {
      const desde = Number.parseInt(limpio.split('?').join('0'), 16);
      const hasta = Number.parseInt(limpio.split('?').join('F'), 16);
      if (Number.isNaN(desde) || Number.isNaN(hasta)) continue;
      rangos.push({ desde, hasta });
      continue;
    }

    const [inicio, fin] = limpio.split('-');
    const desde = Number.parseInt(inicio ?? '', 16);
    if (Number.isNaN(desde)) continue;
    const hasta = fin === undefined ? desde : Number.parseInt(fin, 16);
    rangos.push({ desde, hasta: Number.isNaN(hasta) ? desde : hasta });
  }

  return rangos;
}

function loCubre(rangos: readonly Rango[], punto: number): boolean {
  return rangos.some(({ desde, hasta }) => punto >= desde && punto <= hasta);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lo que de una página llega a componerse
// ─────────────────────────────────────────────────────────────────────────────

const ENTIDADES: ReadonlyMap<string, string> = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
  ['nbsp', ' '],
  ['laquo', '«'],
  ['raquo', '»'],
  ['hellip', '…'],
  ['mdash', '—'],
  ['ndash', '–'],
  ['aacute', 'á'],
  ['eacute', 'é'],
  ['iacute', 'í'],
  ['oacute', 'ó'],
  ['uacute', 'ú'],
  ['ntilde', 'ñ'],
  ['uuml', 'ü'],
]);

/**
 * El texto que un navegador acaba pintando en la página.
 *
 * Se van `<style>` y `<script>` con su contenido —el primero trae los propios
 * `unicode-range` en hexadecimal y el segundo el `ld+json`, que no se compone—, los
 * comentarios, y después las etiquetas. Lo que queda se desescapa: `&laquo;` es una «
 * en la pantalla aunque en el fichero sean ocho caracteres ASCII.
 *
 * Los valores de atributo no entran, y es una limitación consciente: `alt` y `title` sí
 * se leen en voz alta o se pintan en un rótulo, pero separarlos del resto de atributos
 * —`href`, `data-*`, `content`— pediría analizar el HTML de verdad, y el corpus no
 * escribe atributos visibles a mano. Si algún día los escribe, esta es la línea a mover.
 */
export function textoCompuesto(html: string): string {
  const sinInertes = html
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ');

  return sinInertes.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entera, cuerpo: string) => {
    if (cuerpo.startsWith('#')) {
      const punto = cuerpo.startsWith('#x') || cuerpo.startsWith('#X')
        ? Number.parseInt(cuerpo.slice(2), 16)
        : Number.parseInt(cuerpo.slice(1), 10);
      return Number.isNaN(punto) ? entera : String.fromCodePoint(punto);
    }
    return ENTIDADES.get(cuerpo.toLowerCase()) ?? entera;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// El juicio
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginaConstruida {
  /** Ruta relativa a `dist/`, que es como se nombra en el fallo. */
  readonly ruta: string;
  readonly html: string;
}

export interface CaracterSinCobertura {
  readonly caracter: string;
  /** `U+00F1`, como se escribe en un `unicode-range`. */
  readonly punto: string;
  /** Las familias que no lo cubren, en orden de declaración. */
  readonly familias: readonly string[];
  /** Dónde aparece, para poder abrirlo. Se listan unas pocas, no todas. */
  readonly paginas: readonly string[];
  readonly apariciones: number;
}

export interface ResultadoDeCobertura {
  readonly ok: boolean;
  readonly fallos: readonly CaracterSinCobertura[];
  readonly paginasRevisadas: number;
  readonly familias: readonly string[];
}

/** Cuántas páginas se nombran por carácter: bastantes para buscar, pocas para leer. */
const PAGINAS_POR_FALLO = 3;

/**
 * Un carácter pasa si **todas** las familias declaradas lo cubren, no si lo cubre alguna.
 *
 * Exigir la intersección y no la unión es lo único honesto que se puede hacer sin
 * resolver la cascada: aquí no se sabe si esa `ő` cae en un texto de Cita —serif— o en
 * un rótulo —sans—. Con la unión, una `ő` que solo cubriera la sans daría verde y se
 * compondría en Georgia dentro de la Cita, que es el fallo que la puerta busca.
 *
 * Con las dos familias declarando el mismo subconjunto, unión e intersección coinciden y
 * la distinción no cuesta nada. Empieza a costar el día que alguien las separe, y ese es
 * el día en que hace falta.
 */
export function revisarCobertura(
  paginas: readonly PaginaConstruida[],
  css: string,
): ResultadoDeCobertura {
  const porFamilia = rangosPorFamilia(css);
  const familias = [...porFamilia.keys()];

  // Sin fuentes propias no hay nada que garantizar: todo se compone con la reserva del
  // sistema, y la reserva del sistema no es asunto de esta puerta.
  if (familias.length === 0) {
    return { ok: true, fallos: [], paginasRevisadas: paginas.length, familias };
  }

  const sinCobertura = new Map<
    string,
    { familias: string[]; paginas: Set<string>; apariciones: number }
  >();
  // Un sitio de 283 páginas repite los mismos caracteres millones de veces; sin esto la
  // puerta tarda más que el build que vigila.
  const yaJuzgados = new Map<string, string[] | null>();

  for (const { ruta, html } of paginas) {
    for (const caracter of textoCompuesto(html)) {
      const punto = caracter.codePointAt(0);
      if (punto === undefined) continue;

      let descubiertas = yaJuzgados.get(caracter);
      if (descubiertas === undefined) {
        const faltan = familias.filter(
          (familia) => !loCubre(porFamilia.get(familia) ?? [], punto),
        );
        descubiertas = faltan.length === 0 ? null : faltan;
        yaJuzgados.set(caracter, descubiertas);
      }
      if (descubiertas === null) continue;

      const acumulado = sinCobertura.get(caracter) ?? {
        familias: descubiertas,
        paginas: new Set<string>(),
        apariciones: 0,
      };
      acumulado.apariciones += 1;
      if (acumulado.paginas.size < PAGINAS_POR_FALLO) acumulado.paginas.add(ruta);
      sinCobertura.set(caracter, acumulado);
    }
  }

  const fallos: CaracterSinCobertura[] = [...sinCobertura.entries()]
    .map(([caracter, dato]) => ({
      caracter,
      punto: comoUnicode(caracter),
      familias: dato.familias,
      paginas: [...dato.paginas].sort(),
      apariciones: dato.apariciones,
    }))
    .sort((a, b) => b.apariciones - a.apariciones || a.punto.localeCompare(b.punto));

  return {
    ok: fallos.length === 0,
    fallos,
    paginasRevisadas: paginas.length,
    familias,
  };
}

function comoUnicode(caracter: string): string {
  const punto = caracter.codePointAt(0) ?? 0;
  return `U+${punto.toString(16).toUpperCase().padStart(4, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cómo se cuenta
// ─────────────────────────────────────────────────────────────────────────────

/**
 * El fallo dice el carácter, dónde está y **las dos salidas**, porque las dos son
 * legítimas y quien lo lee a media tarde no tiene por qué recordarlas: o se cambia el
 * texto, o se ensancha `subsets` en `astro.config.mjs` asumiendo el peso.
 */
export function formatearFallos(fallos: readonly CaracterSinCobertura[]): string {
  const lineas = fallos.map(({ caracter, punto, paginas, apariciones }) => {
    const donde = paginas.join(', ');
    const mas = apariciones > paginas.length ? ` (+${apariciones - paginas.length} más)` : '';
    return `  «${caracter}» ${punto} — ${donde}${mas}`;
  });

  return [
    'Caracteres que las fuentes declaradas no saben componer:',
    '',
    ...lineas,
    '',
    'Se compondrían con el tipo de reserva en mitad de la línea. Dos salidas:',
    '  · cambiar el texto en `corpus/` por el carácter que sí se cubre, o',
    '  · ensanchar `subsets` en `astro.config.mjs` — cada subconjunto es un `.woff2`',
    '    precargado más en el camino crítico, así que es una decisión que se mide.',
    '',
  ].join('\n');
}

export function titularDeFallos(cuantos: number): string {
  return cuantos === 1
    ? 'Un carácter publicado se queda sin fuente que lo componga.'
    : `${cuantos} caracteres publicados se quedan sin fuente que los componga.`;
}

export function resumenDelBuild(paginas: number, familias: readonly string[]): string {
  return `Cobertura tipográfica: ${paginas} páginas, ${familias.length} familias, sin caídas al tipo de reserva.`;
}
