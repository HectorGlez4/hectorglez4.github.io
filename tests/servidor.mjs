/**
 * Servidor estático de `dist/` para las pruebas funcionales.
 *
 * No se usa `astro preview` porque en Astro 7 se demoniza: la orden vuelve enseguida y
 * deja el servidor de fondo. Playwright espera que su `webServer` siga en primer plano
 * durante toda la sesión, así que con `astro preview` acababa hablando con un demonio
 * huérfano de una ejecución anterior —que servía un `dist/` viejo— en lugar de con el
 * recién construido. Los fallos que produce eso no se parecen en nada a su causa.
 *
 * Sirve además exactamente como un alojamiento estático: `/cita/x` resuelve a
 * `dist/cita/x.html`, y lo que no existe devuelve `dist/404.html` con estado 404, que es
 * lo que la Historia 2.1 necesita poder comprobar.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const RAIZ = new URL('../dist/', import.meta.url).pathname;
const puerto = Number(process.env.PUERTO ?? 4321);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

async function primeroQueExista(candidatos) {
  for (const candidato of candidatos) {
    try {
      const info = await stat(candidato);
      if (info.isFile()) return candidato;
    } catch {
      // Se prueba el siguiente.
    }
  }
  return null;
}

createServer(async (peticion, respuesta) => {
  const ruta = normalize(decodeURIComponent(new URL(peticion.url, 'http://localhost').pathname));
  // Sin escapes hacia arriba: `normalize` deja `..` si sobran, y aquí se corta.
  if (ruta.includes('..')) {
    respuesta.writeHead(400).end('Petición inválida.');
    return;
  }

  const base = join(RAIZ, ruta);
  const fichero = await primeroQueExista([
    ruta.endsWith('/') ? join(base, 'index.html') : base,
    `${base}.html`,
    join(base, 'index.html'),
  ]);

  if (!fichero) {
    const pagina404 = await primeroQueExista([join(RAIZ, '404.html')]);
    respuesta.writeHead(404, { 'content-type': TIPOS['.html'] });
    respuesta.end(pagina404 ? await readFile(pagina404) : 'No encontrado.');
    return;
  }

  respuesta.writeHead(200, {
    'content-type': TIPOS[extname(fichero)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  respuesta.end(await readFile(fichero));
}).listen(puerto, () => {
  process.stdout.write(`Sirviendo dist/ en http://localhost:${puerto}\n`);
});
