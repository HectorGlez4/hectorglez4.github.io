/**
 * Servidor estático de `dist/` para las pruebas funcionales.
 *
 * No se usa `astro preview` porque en Astro 7 se demoniza: la orden vuelve enseguida y
 * deja el servidor de fondo. Playwright espera que su `webServer` siga en primer plano
 * durante toda la sesión, así que con `astro preview` acababa hablando con un demonio
 * huérfano de una ejecución anterior —que servía un `dist/` viejo— en lugar de con el
 * recién construido. Los fallos que produce eso no se parecen en nada a su causa.
 *
 * Sirve además exactamente como el alojamiento: `/cita/x/` resuelve a
 * `dist/cita/x/index.html`, `/cita/x` **redirige** con un 301 a la forma con barra, y lo
 * que no existe devuelve `dist/404.html` con estado 404, que es lo que la Historia 2.1
 * necesita poder comprobar.
 *
 * El 301 no es un adorno: GitHub Pages lo hace, y sin él este servidor devolvía 200 donde
 * el sitio publicado redirige. Eso es peor que una diferencia cualquiera, porque es la que
 * esconde precisamente el defecto que se quiere vigilar — que el sitio se anuncie en la
 * forma que no sirve directa. Con el 301 aquí, `seo.spec.ts` puede pedir cada ruta del
 * sitemap con `maxRedirects: 0` y exigir un 200.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';

// `DIST` permite servir otro `dist/` que el del repositorio: una prueba que construye un
// sitio aparte —con la medición configurada, por ejemplo— necesita servir el suyo.
const RAIZ = process.env.DIST ?? new URL('../dist/', import.meta.url).pathname;
const puerto = Number(process.env.PUERTO ?? 4321);

/*
 * `SERVIDOR_CACHE_CONTROL` permite servir con otra cabecera de caché que `no-store` —Historia
 * 23.5—. Por omisión todo se sirve `no-store`, como siempre, y eso deja la página fuera de la
 * caché de atrás y adelante del navegador. El alojamiento sirve `max-age=600` (DESPLIEGUE.md §1),
 * así que la prueba que necesita volver atrás por esa caché lo pide aquí, solo para su sitio. El
 * nombre lleva el prefijo del servidor para que una variable genérica que quede en el entorno de
 * quien prueba no cambie a escondidas la caché de toda la suite.
 */
const CACHE_CONTROL = process.env.SERVIDOR_CACHE_CONTROL || 'no-store';

/*
 * `SERVIDOR_GZIP=1` comprime como el alojamiento —NFR-7, puerta de la Épica 27—. GitHub Pages
 * sirve el texto con `content-encoding: gzip` a quien lo acepta, y sin comprimir aquí cada byte
 * de HTML pesaba en Lighthouse unas cinco veces lo que pesa en el sitio en vivo: `/buscar/` con
 * los selectores pasaba de 27 a 42 KB, una ida y vuelta más en el 4G simulado, cuando en vivo
 * son 7 KB frente a 9. Por omisión no comprime, y las pruebas funcionales no cambian.
 */
const GZIP = process.env.SERVIDOR_GZIP === '1';
const COMPRIMIBLES = new Set(['.html', '.css', '.js', '.json', '.xml', '.svg', '.txt']);

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
  const entrante = new URL(peticion.url, 'http://localhost');
  const ruta = normalize(decodeURIComponent(entrante.pathname));
  // Sin escapes hacia arriba: `normalize` deja `..` si sobran, y aquí se corta.
  if (ruta.includes('..')) {
    respuesta.writeHead(400).end('Petición inválida.');
    return;
  }

  const base = join(RAIZ, ruta);

  /*
   * La forma sin barra de algo que se publica como carpeta redirige, no se sirve. Se mira
   * antes que nada porque `primeroQueExista` la resolvería calladamente al `index.html`.
   */
  if (!ruta.endsWith('/') && extname(ruta) === '') {
    const comoCarpeta = await primeroQueExista([join(base, 'index.html')]);
    if (comoCarpeta) {
      // La consulta viaja con la redirección, que es lo que hace el hospedaje. Perdiéndola,
      // un enlace antiguo con `?de=` llegaba a la Cita sin su cuenta de origen (SM-8).
      respuesta.writeHead(301, { location: `${ruta}/${entrante.search}` }).end();
      return;
    }
  }

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

  const cuerpo = await readFile(fichero);
  const comprimir = GZIP && COMPRIMIBLES.has(extname(fichero)) && /\bgzip\b/u.test(peticion.headers['accept-encoding'] ?? '');
  respuesta.writeHead(200, {
    'content-type': TIPOS[extname(fichero)] ?? 'application/octet-stream',
    'cache-control': CACHE_CONTROL,
    ...(comprimir ? { 'content-encoding': 'gzip', vary: 'Accept-Encoding' } : {}),
  });
  respuesta.end(comprimir ? gzipSync(cuerpo) : cuerpo);
}).listen(puerto, () => {
  process.stdout.write(`Sirviendo dist/ en http://localhost:${puerto}\n`);
});
