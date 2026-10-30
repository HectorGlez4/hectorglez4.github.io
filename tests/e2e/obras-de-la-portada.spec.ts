import { expect, test } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaEnDist,
} from '../unit/ayuda/construir.js';
import { CONDICIONES, anchoDeLaPagina, cargarEn320 } from './ayuda/reflujo.ts';

/**
 * Historia 28.3 — una Obra de título larguísimo en la portada, a 320 px, en las tres condiciones
 * de la 26.9 (texto por omisión, al 200 % y con el espaciado de 1.4.12): su título parte en varias
 * líneas —también la palabra de más de treinta letras— y la página no se desplaza en horizontal.
 *
 * El Corpus real no trae hoy ningún título así, y el que trajera saldría en la portada solo el día
 * que le tocara: por eso se construye una copia con un fixture de pocos Autores —con menos Autores
 * que `OBRAS_DE_LA_PORTADA`, cada uno da una Obra cada jornada—, uno de ellos con una sola Obra
 * indexable, la del título, que así sale en cualquier jornada. Se sirve con `tests/servidor.mjs` en
 * un puerto propio, en serie y en un solo perfil, como `ingreso-accesible.spec.ts`.
 */

test.describe.configure({ mode: 'serial' });

const PERFIL = 'escritorio';

/** Puerto propio: 4321 es el sitio de la suite, 4399/4400 los del receptor, 4402 el del ingreso y 4403 el del historial. */
const PUERTO = 4404;
const SITIO = `http://localhost:${PUERTO}`;
const JORNADA = '2026-10-30';

const PALABRA_LARGA = 'Desamortizacionesanticonstitucionalisimamente';
const TITULO_LARGO = `Tratado de las ${PALABRA_LARGA} y otros asuntos de la república de las letras`;
const RUTA_DE_LA_OBRA = '/obra/lucas-alaman/tratado-de-las-desamortizacionesanticonstitucionalisimamente-y-otros-asuntos-de-la-republica-de-las-letras/';

const WS = 'https://es.wikisource.org/wiki/';

function corpus(): Record<string, string> {
  const c: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
  };
  let n = 0;
  const sembrar = (autor: string, titulo: string, citas: number) => {
    for (let i = 1; i <= citas; i += 1) {
      n += 1;
      c[`citas/${autor}--c-${n}.md`] = citaValida({
        slug: `${autor}-sentencia-${n}`,
        autor,
        texto: `Sentencia ${n}: lo que se aprende despacio se olvida tarde, y lo que se lee se queda.`,
        procedencia: { obra: titulo, año: 1850 },
        fuente: { id: 'wikisource-es', url: `${WS}${encodeURIComponent(titulo.replaceAll(' ', '_'))}` },
        ...(n === 1 ? { aptaParaPortada: true } : {}),
      });
    }
  };
  const autor = (slug: string, nombre: string, clave: string) => {
    c[`autores/${slug}.yml`] = [
      `nombre: ${nombre}`,
      'añoNacimiento: 1800',
      'añoFallecimiento: 1870',
      `semblanza: Escritor de prueba, ${clave}.`,
      `ordenAlfabetico: ${clave}`,
      '',
    ].join('\n');
  };
  // El del título: una Obra indexable (dos Citas) y otra de una sola, que no se indexa.
  autor('lucas-alaman', 'Lucas Alamán', 'Alamán');
  sembrar('lucas-alaman', TITULO_LARGO, 2);
  sembrar('lucas-alaman', 'Apuntes sueltos', 1);
  // Otros dos Autores con dos Obras indexables cada uno.
  for (const [slug, nombre, clave] of [
    ['mariano-jose-de-larra', 'Mariano José de Larra', 'Larra'],
    ['fernan-caballero', 'Fernán Caballero', 'Caballero'],
  ] as const) {
    autor(slug, nombre, clave);
    sembrar(slug, `Primer libro de ${clave}`, 2);
    sembrar(slug, `Segundo libro de ${clave}`, 2);
  }
  // Séneca con su Obra sola, y las Citas que hacen falta para que «El tiempo» se publique.
  sembrar('seneca', 'Sobre la brevedad de la vida', 15);
  return c;
}

let servidor: ChildProcess | undefined;
let proyecto: string | undefined;

test.beforeAll(async () => {
  if (test.info().project.name !== PERFIL) return;
  test.setTimeout(300_000);

  // El puerto tiene que estar libre: un servidor ajeno serviría otro sitio sin decirlo.
  const ocupado = await fetch(`${SITIO}/`, { signal: AbortSignal.timeout(2000) }).then(
    () => true,
    () => false,
  );
  if (ocupado) {
    throw new Error(`Alguien responde ya en ${PUERTO}. Comprueba quién con \`lsof -nP -iTCP:${PUERTO} -sTCP:LISTEN\`.`);
  }

  const construido = await construirConCorpus(corpus(), { jornada: JORNADA });
  proyecto = construido.proyecto;
  expect(construido.codigo, construido.salida).toBe(0);
  const dist = join(construido.proyecto, 'dist');

  // Antes de abrir el navegador: la Obra está en la portada, o no hay nada que medir.
  const portada = await readFile(paginaEnDist(dist, '/'), 'utf8');
  expect(portada, 'la Obra del título largo no salió en la portada').toContain(`href="${RUTA_DE_LA_OBRA}"`);

  servidor = spawn('node', [join(new URL('..', import.meta.url).pathname, 'servidor.mjs')], {
    env: { ...process.env, DIST: dist, PUERTO: String(PUERTO) },
    stdio: 'ignore',
  });
  let muerto: number | null = null;
  servidor.on('exit', (codigo) => (muerto = codigo ?? 1));
  servidor.on('error', () => (muerto = 1));
  for (let intento = 0; intento < 100 && muerto === null; intento += 1) {
    try {
      // Una ruta que solo este corpus publica: un 200 dice que el servidor es el nuestro.
      const respuesta = await fetch(`${SITIO}${RUTA_DE_LA_OBRA}`, { signal: AbortSignal.timeout(2000) });
      if (respuesta.ok) return;
    } catch {
      // Todavía no ha levantado.
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`El sitio de prueba no llegó a servir ${RUTA_DE_LA_OBRA} en ${PUERTO}${muerto !== null ? ` (el servidor salió con ${muerto})` : ''}.`);
});

test.afterAll(async () => {
  if (servidor && servidor.exitCode === null && servidor.signalCode === null) {
    const cerrado = new Promise<void>((r) => servidor!.once('close', () => r()));
    servidor.kill();
    await Promise.race([cerrado, new Promise((r) => setTimeout(r, 5000))]);
  }
  if (proyecto) await limpiar(proyecto);
});

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== PERFIL, 'el reflujo se mide a 320 px en un solo perfil: el sitio de prueba se construye una vez');
});

test('la Obra de título larguísimo sale en la portada, con su título entero', async ({ page }) => {
  await page.goto(`${SITIO}/`);
  const fila = page.locator(`main li[data-zona="obras-de-portada"] a[href="${RUTA_DE_LA_OBRA}"]`);
  await expect(fila).toHaveCount(1);
  await expect(fila.locator('.titulo-de-obra')).toHaveText(TITULO_LARGO);
});

test('a 320 px, en las tres condiciones, el título parte en varias líneas y la página no se desplaza en horizontal', async ({ page }) => {
  for (const condicion of CONDICIONES) {
    if (!(await cargarEn320(page, `${SITIO}/`, condicion))) continue;
    const m = await anchoDeLaPagina(page);
    expect(m.scroll, `${condicion}: la página desborda (${m.scroll} > ${m.ventana})`).toBeLessThanOrEqual(m.ventana);
    const titulo = await page.locator(`main a[href="${RUTA_DE_LA_OBRA}"] .titulo-de-obra`).evaluate((e) => {
      const estilo = getComputedStyle(e);
      const caja = e.getBoundingClientRect();
      const fila = e.closest('li')!.getBoundingClientRect();
      return {
        lineas: Math.round(caja.height / parseFloat(estilo.lineHeight)),
        dentro: caja.left >= fila.left - 0.5 && caja.right <= fila.right + 0.5,
        recorta: e.scrollWidth > e.clientWidth + 1,
      };
    });
    expect(titulo.lineas, condicion).toBeGreaterThan(1);
    expect(titulo.dentro, `${condicion}: el título se sale de su fila`).toBe(true);
    expect(titulo.recorta, `${condicion}: el título se recorta`).toBe(false);
  }
});
