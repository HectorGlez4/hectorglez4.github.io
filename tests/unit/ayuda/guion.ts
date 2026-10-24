import { parseSync } from 'vite';
import type { Arranque, FormaDeArrancar } from '../../../src/lib/guiones.ts';

/**
 * Los bytes de guion **ejecutable** en línea de una página — el contador del tope de
 * `MAX_BYTES_DE_GUION`, uno solo para todas las pruebas que lo miden.
 *
 * Vivía copiado en `tests/unit/medicion.test.ts` y en `tests/unit/ingreso-construido.test.ts`;
 * dos copias empiezan idénticas y divergen a la primera corrección, y entonces una página cabe
 * en el tope según una prueba y no según la otra. La frontera es esta y es la misma en las dos:
 *
 *   · cuenta **bytes UTF-8**, no unidades de UTF-16: el tope es de bytes servidos, y una
 *     cadena con «é» pesa más de lo que dice `length`;
 *   · cuenta todo `<script>` —con la etiqueta en mayúsculas o minúsculas— salvo el
 *     `application/ld+json` de los datos estructurados, que no es JavaScript ejecutable y el
 *     navegador no interpreta; se reconoce con comillas dobles, simples o sin comillas;
 *   · un `<script src=…>` sin cuerpo cuenta 0: no va en línea, se descarga aparte.
 */
export function bytesDeGuionEnLinea(html: string): number {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter((m) => !/\btype\s*=\s*["']?application\/ld\+json\b/i.test(m[1]))
    .reduce((n, m) => n + Buffer.byteLength(m[2], 'utf8'), 0);
}

/** Los `<script>` de una página que no son datos estructurados, en su orden: atributos y cuerpo. */
export function guionesEjecutables(html: string): { atributos: string; cuerpo: string }[] {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter((m) => !/\btype\s*=\s*["']?application\/ld\+json\b/i.test(m[1]))
    .map((m) => ({ atributos: m[1], cuerpo: m[2] }));
}

/** El valor de un atributo, con comillas dobles, simples o sin ellas. */
function atributo(atributos: string, nombre: string): string | undefined {
  // Precedido de espacio o del principio, para que `src` no case con `data-src`.
  const patron = new RegExp(`(?:^|\\s)${nombre}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  return patron.exec(atributos)?.slice(1).find((v) => v !== undefined);
}

/** El `src` de un `<script>`, si lo lleva. */
function srcDe(atributos: string): string | undefined {
  return atributo(atributos, 'src');
}

/**
 * Los guiones **en línea** de una página, en su orden: el cuerpo de cada `<script>` sin `src`
 * que no es `application/ld+json` — Historia 23.1.
 */
export function guionesEnLinea(html: string): string[] {
  return guionesEnLineaConTipo(html).map((g) => g.cuerpo);
}

/** Los guiones en línea con su tipo: `modulo` si el `<script>` es `type="module"`. */
export function guionesEnLineaConTipo(html: string): { cuerpo: string; modulo: boolean }[] {
  return guionesEjecutables(html)
    .filter((g) => srcDe(g.atributos) === undefined)
    .map((g) => ({ cuerpo: g.cuerpo, modulo: atributo(g.atributos, 'type')?.toLowerCase() === 'module' }));
}

/** Las etiquetas `<script src>` de una página, enteras, con su `src`. */
export function etiquetasDeGuionExterno(html: string): { etiqueta: string; src: string }[] {
  return [...html.matchAll(/<script\b([^>]*)>/gi)]
    .map((m) => ({ etiqueta: m[0], src: srcDe(m[1]) }))
    .filter((e): e is { etiqueta: string; src: string } => e.src !== undefined);
}

/** Los destinos de `as` con que un `<link rel="preload|prefetch">` descarga un guion. */
const COMO_DE_GUION = new Set(['script', 'worker', 'sharedworker', 'serviceworker', 'audioworklet', 'paintworklet']);

/**
 * Los `<link>` que hacen descargar un guion: `rel="modulepreload"`, o `preload`/`prefetch` con un
 * `as` de guion —`script` o un worker o *worklet*— o sin `as` y con un `href` que acaba en
 * `.js`/`.mjs` (un `prefetch` sin `as` descarga lo que sea). Su `href`, o una marca que ninguna
 * entrada reconoce si no lo lleva.
 */
function enlacesDeGuion(html: string): string[] {
  return [...html.matchAll(/<link\b([^>]*)>/gi)].flatMap(([, atributos]) => {
    const rel = (atributo(atributos, 'rel') ?? '').toLowerCase().split(/\s+/);
    const como = (atributo(atributos, 'as') ?? '').toLowerCase();
    const href = atributo(atributos, 'href');
    const adelanta = rel.includes('preload') || rel.includes('prefetch');
    const deGuion = COMO_DE_GUION.has(como) || (como === '' && /\.m?js(?:[?#]|$)/i.test(href ?? ''));
    const descarga = rel.includes('modulepreload') || (adelanta && deGuion);
    return descarga ? [href ?? '(link sin href)'] : [];
  });
}

/** Cómo pide un guion otro fichero: estática (`import … from`) o al ejecutarse. */
export type FormaDePedir =
  | 'import'
  | FormaDeArrancar
  | 'serviceWorker.register'
  | "createElement('script')"
  | 'worklet.addModule';

/** Una petición de guion que hace un fichero, leída de su árbol sintáctico. */
export interface PeticionDeGuion {
  como: FormaDePedir;
  /**
   * El especificador, si el argumento empieza por un literal —una cadena, una plantilla hasta su
   * primer `${` o el primer término de una concatenación—; `undefined` si no se sabe leer.
   */
  literal?: string;
  /** El argumento tal cual está escrito, para los mensajes. */
  argumento: string;
}

type Nodo = { type: string; start: number; end: number; [clave: string]: unknown };

/** Visita cada nodo del árbol, en profundidad. */
function recorrer(valor: unknown, visitar: (nodo: Nodo) => void): void {
  if (Array.isArray(valor)) {
    for (const hijo of valor) recorrer(hijo, visitar);
    return;
  }
  if (valor === null || typeof valor !== 'object') return;
  const nodo = valor as Nodo;
  if (typeof nodo.type === 'string') visitar(nodo);
  for (const hijo of Object.values(nodo)) if (hijo !== null && typeof hijo === 'object') recorrer(hijo, visitar);
}

/** El literal con que empieza una expresión: cadena, plantilla hasta su `${` o concatenación. */
function literalInicial(nodo: Nodo): string | undefined {
  if (nodo.type === 'Literal' && typeof nodo.value === 'string') return nodo.value;
  if (nodo.type === 'TemplateLiteral') {
    const [primero] = nodo.quasis as { value: { cooked: string | null } }[];
    return primero.value.cooked || undefined;
  }
  if (nodo.type === 'BinaryExpression' && nodo.operator === '+') return literalInicial(nodo.left as Nodo);
  if (nodo.type === 'ParenthesizedExpression') return literalInicial(nodo.expression as Nodo);
  return undefined;
}

/** El nombre de una propiedad de un `MemberExpression` no calculado, o `undefined`. */
const propiedad = (nodo: Nodo): string | undefined =>
  nodo.type === 'MemberExpression' && !nodo.computed ? ((nodo.property as { name?: string }).name ?? undefined) : undefined;

/** El nombre de lo que se llama o construye: `Worker` en `Worker`, `window.Worker` o `self.Worker`. */
const nombreLlamado = (nodo: Nodo): string | undefined =>
  nodo.type === 'Identifier' ? (nodo as { name?: string }).name : propiedad(nodo);

/**
 * Todo lo que un guion pide como guion, leído de su árbol sintáctico y no de su texto —así un
 * `import()` escrito en un comentario no cuenta y uno partido entre líneas sí— — Historia 23.1:
 * las importaciones estáticas (`import … from`, `export … from`, `import '…'`) y lo que pide al
 * ejecutarse: `import()`, `new Worker`, `new SharedWorker` —también como `new window.Worker`—,
 * `importScripts` —también `self.importScripts`—, `serviceWorker.register`, el `addModule` de un
 * *worklet* (`CSS.paintWorklet`, `audioWorklet`) y `createElement('script')`. Se analiza como
 * módulo, que es la gramática más estricta; un guion clásico que solo fuera válido sin ella hace
 * fallar la prueba. Lo que no ve —un constructor guardado en otra variable, el `src` reasignado
 * de un `<script>` que ya existe— no se puede leer sin ejecutar el guion.
 */
export function peticionesDe(fuente: string): PeticionDeGuion[] {
  const peticiones: PeticionDeGuion[] = [];
  const apuntar = (como: FormaDePedir, argumento: Nodo | undefined) =>
    peticiones.push({
      como,
      literal: argumento === undefined ? undefined : literalInicial(argumento),
      argumento: argumento === undefined ? '' : fuente.slice(argumento.start, argumento.end),
    });

  const { program, errors } = parseSync('guion.js', fuente, { sourceType: 'module' });
  if (errors.length > 0) {
    throw new Error(`No se deja analizar: ${errors.map((e) => e.message).join('; ')}\n${fuente.slice(0, 200)}`);
  }
  recorrer(program, (nodo) => {
    switch (nodo.type) {
      case 'ImportDeclaration':
      case 'ExportAllDeclaration':
      case 'ExportNamedDeclaration':
        if (nodo.source) apuntar('import', nodo.source as Nodo);
        return;
      case 'ImportExpression':
        apuntar('import()', nodo.source as Nodo);
        return;
      case 'NewExpression': {
        // `new Worker(…)` o `new window.Worker(…)`, `new self.SharedWorker(…)`…
        const nombre = nombreLlamado(nodo.callee as Nodo);
        if (nombre === 'Worker' || nombre === 'SharedWorker') {
          apuntar(nombre === 'Worker' ? 'new Worker' : 'new SharedWorker', (nodo.arguments as Nodo[])[0]);
        }
        return;
      }
      case 'CallExpression': {
        const callee = nodo.callee as Nodo & { name?: string };
        const argumentos = nodo.arguments as Nodo[];
        if (nombreLlamado(callee) === 'importScripts') {
          for (const argumento of argumentos) apuntar('importScripts', argumento);
        } else if (propiedad(callee) === 'addModule') {
          apuntar('worklet.addModule', argumentos[0]);
        } else if (propiedad(callee) === 'register' && propiedad(callee.object as Nodo) === 'serviceWorker') {
          apuntar('serviceWorker.register', argumentos[0]);
        } else if (
          propiedad(callee) === 'createElement' &&
          argumentos[0] !== undefined &&
          literalInicial(argumentos[0])?.toLowerCase() === 'script'
        ) {
          apuntar("createElement('script')", argumentos[0]);
        }
        return;
      }
    }
  });
  return peticiones;
}

/**
 * Lo que una página pide como guion externo — Historia 23.1: el `src` de cada `<script src>`,
 * el `href` de cada `<link>` que descarga un guion y lo que piden sus guiones en línea (ver
 * `peticionesDe`).
 *
 * De lo que piden los guiones en línea se toma el literal con el que empieza el argumento: el
 * reintento de la Imagen pide `'/islas/imagen.js' + '?' + n`, y lo que se juzga es el fichero.
 * Lo que no empieza por un literal no se puede juzgar, y sale marcado para que ninguna entrada de
 * la lista lo reconozca —lo que no se sabe leer no pasa—, igual que un `createElement('script')`,
 * que no dice qué va a pedir.
 */
export function guionesExternosDe(html: string): string[] {
  const deEtiqueta = etiquetasDeGuionExterno(html).map((e) => e.src);
  const deEnlace = enlacesDeGuion(html);
  const deGuion = guionesEnLinea(html).flatMap((cuerpo) =>
    peticionesDe(cuerpo).map((p) =>
      p.literal !== undefined && p.como !== "createElement('script')"
        ? p.literal
        : `(${p.como} sin literal) ${p.argumento.slice(0, 60)}`,
    ),
  );
  return [...deEtiqueta, ...deEnlace, ...deGuion];
}

/**
 * Los especificadores de las importaciones **estáticas** de un módulo: `import … from`,
 * `export … from` y el `import '…'` de efecto. El `import()` dinámico no cuenta aquí: no se
 * descarga con el fichero, y lo juzga `descargaDeLaEntrada` como lo que arranca.
 */
export function importacionesEstaticasDe(fuente: string): string[] {
  return peticionesDe(fuente)
    .filter((p) => p.como === 'import')
    .map((p) => p.literal!);
}

/**
 * Lo que descarga una entrada de `src/lib/guiones.ts` y cuánto pesa — el contador de sus topes.
 *
 * Bytes UTF-8 sin comprimir del fichero `ruta`, de todo lo que importa de forma estática y de lo
 * que la entrada declara que **arranca** (`arranca`: el worker de Pagefind), siguiendo a su vez
 * las importaciones de cada uno sin repetir ninguno. Cada `import()`, `new Worker`,
 * `importScripts`… que aparezca en esos ficheros tiene que casar con un arranque declarado de la
 * misma forma —y con su ruta, si el argumento es un literal—: lo que no casa sale en
 * `sinDeclarar`, y el arranque declarado que no aparece, en `sinVer`. `ruta` es la ruta pública,
 * del mismo origen (`/islas/imagen.js`).
 */
export function descargaDeLaEntrada(
  dist: string,
  ruta: string,
  arranca: readonly Arranque[],
  leer: (fichero: string) => Buffer,
): { bytes: number; ficheros: string[]; sinDeclarar: string[]; sinVer: Arranque[] } {
  const ORIGEN = 'http://sitio.invalid';
  const vistos = new Set<string>();
  const sinVer = [...arranca];
  const sinDeclarar: string[] = [];
  let bytes = 0;
  const pendientes = [ruta.replace(/[?#].*$/, ''), ...arranca.map((a) => a.ruta)];
  while (pendientes.length > 0) {
    const actual = pendientes.pop()!;
    if (vistos.has(actual)) continue;
    vistos.add(actual);
    const contenido = leer(`${dist}${actual}`);
    bytes += contenido.byteLength;
    for (const peticion of peticionesDe(contenido.toString('utf8'))) {
      const destino = peticion.literal === undefined ? undefined : new URL(peticion.literal, `${ORIGEN}${actual}`);
      if (peticion.como === 'import') {
        // Una importación de otro origen no es un fichero de `dist/` que se pueda medir: lo
        // que el navegador pediría ahí no está en ninguna lista, y eso es un fallo, no un cero.
        if (destino!.origin !== ORIGEN) {
          throw new Error(`${actual} importa «${peticion.literal}», que no es del mismo origen.`);
        }
        pendientes.push(destino!.pathname);
        continue;
      }
      const resuelta = destino === undefined ? undefined : destino.origin === ORIGEN ? destino.pathname : destino.href;
      const declarado = sinVer.findIndex(
        (a) => a.como === peticion.como && (resuelta === undefined || a.ruta === resuelta),
      );
      if (declarado < 0) sinDeclarar.push(`${actual}: ${peticion.como}(${peticion.argumento.slice(0, 60)})`);
      else sinVer.splice(declarado, 1);
    }
  }
  return { bytes, ficheros: [...vistos], sinDeclarar, sinVer };
}
