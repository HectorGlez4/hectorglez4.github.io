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

/** Los `<script>` de una página que no son datos estructurados: atributos y cuerpo. */
function guionesEjecutables(html: string): { atributos: string; cuerpo: string }[] {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter((m) => !/\btype\s*=\s*["']?application\/ld\+json\b/i.test(m[1]))
    .map((m) => ({ atributos: m[1], cuerpo: m[2] }));
}

/** El `src` de un `<script>`, si lo lleva. */
function srcDe(atributos: string): string | undefined {
  return /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(atributos)?.slice(1).find((v) => v !== undefined);
}

/**
 * Los guiones **en línea** de una página, en su orden: el cuerpo de cada `<script>` sin `src`
 * que no es `application/ld+json` — Historia 23.1.
 */
export function guionesEnLinea(html: string): string[] {
  return guionesEjecutables(html)
    .filter((g) => srcDe(g.atributos) === undefined)
    .map((g) => g.cuerpo);
}

/** Las etiquetas `<script src>` de una página, enteras, con su `src`. */
export function etiquetasDeGuionExterno(html: string): { etiqueta: string; src: string }[] {
  return [...html.matchAll(/<script\b([^>]*)>/gi)]
    .map((m) => ({ etiqueta: m[0], src: srcDe(m[1]) }))
    .filter((e): e is { etiqueta: string; src: string } => e.src !== undefined);
}

/**
 * Lo que una página pide como guion externo — Historia 23.1: el `src` de cada `<script src>` y
 * el especificador de cada `import()` de sus guiones en línea.
 *
 * Del `import()` se toma el literal con el que empieza el argumento, sea una cadena, una
 * plantilla —hasta su primer `${`— o el primer término de una concatenación: el reintento de la
 * Imagen pide `'/islas/imagen.js' + '?' + n`, y lo que se juzga es el fichero. Un `import()` cuyo
 * argumento no empieza por un literal no se puede juzgar, y sale tal cual, marcado, para que
 * ninguna entrada de la lista lo reconozca: lo que no se sabe leer no pasa.
 */
export function guionesExternosDe(html: string): string[] {
  const deEtiqueta = etiquetasDeGuionExterno(html).map((e) => e.src);
  const deImportacion = guionesEnLinea(html).flatMap((cuerpo) =>
    [...cuerpo.matchAll(/\bimport\s*\(\s*([^)]*)/g)].map(([, argumento]) => {
      const literal = /^(['"`])([^'"`$\\]*)/.exec(argumento);
      return literal ? literal[2] : `(import sin literal) ${argumento.slice(0, 60)}`;
    }),
  );
  return [...deEtiqueta, ...deImportacion];
}

/**
 * Los especificadores de las importaciones **estáticas** de un módulo: `import … from`,
 * `export … from` y el `import '…'` de efecto. El `import()` dinámico no cuenta: no se
 * descarga con el fichero.
 */
export function importacionesEstaticasDe(fuente: string): string[] {
  const patrones = [
    /(?:^|[;\n}])\s*(?:import|export)\b[^;'"()]*?\bfrom\s*['"]([^'"]+)['"]/g,
    /(?:^|[;\n}])\s*import\s*['"]([^'"]+)['"]/g,
  ];
  return patrones.flatMap((patron) => [...fuente.matchAll(patron)].map(([, especificador]) => especificador));
}

/**
 * Bytes UTF-8 sin comprimir de un fichero de `dist/` **y** de todo lo que importa de forma
 * estática, siguiendo las importaciones sin repetir ninguna — el contador de los topes de
 * `src/lib/guiones.ts`. `ruta` es la ruta pública, del mismo origen (`/islas/imagen.js`).
 */
export function bytesConImportaciones(
  dist: string,
  ruta: string,
  leer: (fichero: string) => Buffer,
): { bytes: number; ficheros: string[] } {
  const vistos = new Set<string>();
  let bytes = 0;
  const pendientes = [ruta.replace(/[?#].*$/, '')];
  while (pendientes.length > 0) {
    const actual = pendientes.pop()!;
    if (vistos.has(actual)) continue;
    vistos.add(actual);
    const contenido = leer(`${dist}${actual}`);
    bytes += contenido.byteLength;
    for (const especificador of importacionesEstaticasDe(contenido.toString('utf8'))) {
      const destino = new URL(especificador, `http://sitio.invalid${actual}`);
      // Una importación de otro origen no es un fichero de `dist/` que se pueda medir: lo
      // que el navegador pediría ahí no está en ninguna lista, y eso es un fallo, no un cero.
      if (destino.origin !== 'http://sitio.invalid') {
        throw new Error(`${actual} importa «${especificador}», que no es del mismo origen.`);
      }
      pendientes.push(destino.pathname);
    }
  }
  return { bytes, ficheros: [...vistos] };
}
