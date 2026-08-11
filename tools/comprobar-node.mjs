// Comprobación de versión de Node. Astro 7 exige 22.12 o superior; por debajo de ahí
// el fallo aparece más tarde y peor, en mitad de un build. Se detiene aquí.
//
// La comparación es una función pura y exportada para poder verificar el caso que
// importa —la versión insuficiente— sin instalar un Node antiguo.

export const VERSION_MINIMA = '22.12.0';

/** @param {string} version @returns {boolean} */
export function esVersionSuficiente(version) {
  const partes = (v) => v.split('.').map((n) => Number.parseInt(n, 10));
  const actual = partes(version);
  const minima = partes(VERSION_MINIMA);

  for (let i = 0; i < minima.length; i += 1) {
    const a = actual[i] ?? 0;
    if (a > minima[i]) return true;
    if (a < minima[i]) return false;
  }
  return true;
}

export const MENSAJE_INSUFICIENTE = (version) =>
  [
    `Node ${version} no alcanza el mínimo exigido por Astro 7.`,
    `Se requiere Node ${VERSION_MINIMA} o superior.`,
    'Actualice Node antes de continuar: https://nodejs.org/es/download',
    '',
  ].join('\n');

// Solo actúa cuando se ejecuta como programa, no cuando se importa desde una prueba.
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!esVersionSuficiente(process.versions.node)) {
    process.stderr.write(MENSAJE_INSUFICIENTE(process.versions.node));
    process.exit(1);
  }
}
