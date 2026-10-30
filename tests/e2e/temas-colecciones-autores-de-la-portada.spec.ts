import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MARCA } from '../../src/lib/marca.ts';
import { ETIQUETAS_DEL_BARRIDO, rutaDeAutor, rutaDeColeccion } from '../../src/lib/superficies.ts';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  coleccionValida,
  construirConCorpus,
  limpiar,
  paginaEnDist,
} from '../unit/ayuda/construir.js';
import { CONDICIONES, anchoDeLaPagina, cargarEn320 } from './ayuda/reflujo.ts';
import { todasLasDirecciones } from './ayuda/pagefind.ts';

/**
 * Historia 28.4 — «Colecciones» y «Autores» de la portada con textos del Corpus que no caben: una
 * Colección cuyo criterio lleva una palabra de más de treinta letras y un Autor destacado de nombre
 * larguísimo. A 320 px, en las tres condiciones de la 26.9, la página no se desplaza en horizontal y
 * el criterio largo parte en varios renglones; el chip se nombra por la Colección y se describe por
 * su criterio; axe no encuentra nada en la portada; y buscar el criterio o el nombre da su página,
 * no la portada (AD-17, Historia 28.1).
 *
 * El Corpus real no trae Colecciones (curar es de Héctor), así que se construye una copia, con su
 * índice de Pagefind, y se sirve con `tests/servidor.mjs` en un puerto propio, en serie y en un
 * solo perfil, como `obras-de-la-portada.spec.ts`.
 */

test.describe.configure({ mode: 'serial' });

const PERFIL = 'escritorio';

/**
 * Puerto propio: 4321 es el sitio de la suite, 4399/4400 los del receptor, 4402 el del ingreso,
 * 4403 el del historial y 4404 el de las Obras de la portada.
 */
const PUERTO = 4405;
const SITIO = `http://localhost:${PUERTO}`;
const JORNADA = '2026-10-30';

const PALABRA_DEL_CRITERIO = 'Desmemoriadisimamenteinconfesables';
const CRITERIO_LARGO = `Citas para leer despacio, con las ${PALABRA_DEL_CRITERIO} prisas de cada día fuera de la página.`;
const CRITERIO_CORTO = 'Citas de una sola frase que se sostienen fuera de su obra.';

const SLUG_DEL_LARGO = 'bartolome-de-argensola';
const NOMBRE_LARGO = 'Bartolomé Leonardo de Argensola Hispanoamericanisimamenteinclasificable';

const WS = 'https://es.wikisource.org/wiki/';

function corpus(): Record<string, string> {
  const c: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    [`autores/${SLUG_DEL_LARGO}.yml`]: [
      `nombre: ${NOMBRE_LARGO}`,
      'añoNacimiento: 1562',
      'añoFallecimiento: 1631',
      'semblanza: Poeta de prueba, de nombre larguísimo.',
      'ordenAlfabetico: Argensola',
      '',
    ].join('\n'),
  };
  const deSeneca: string[] = [];
  for (let i = 1; i <= 15; i += 1) {
    const slug = `seneca-sentencia-${i}`;
    deSeneca.push(slug);
    c[`citas/seneca--s-${i}.md`] = citaValida({
      slug,
      texto: `Sentencia ${i}: no es que tengamos poco tiempo, es que perdemos mucho del que tenemos.`,
      ...(i === 1 ? { aptaParaPortada: true } : {}),
    });
  }
  for (let i = 1; i <= 2; i += 1) {
    const titulo = 'Rimas de prueba';
    c[`citas/${SLUG_DEL_LARGO}--r-${i}.md`] = citaValida({
      slug: `${SLUG_DEL_LARGO}-rima-${i}`,
      autor: SLUG_DEL_LARGO,
      texto: `Rima ${i}: este cielo azul que todos vemos no es cielo ni es azul, y lástima grande.`,
      procedencia: { obra: titulo, año: 1634 },
      fuente: { id: 'wikisource-es', url: `${WS}${encodeURIComponent(titulo.replaceAll(' ', '_'))}` },
    });
  }
  c['colecciones/breves.yml'] = coleccionValida({ nombre: 'Breves', criterio: CRITERIO_CORTO, miembros: deSeneca });
  c['colecciones/despacio.yml'] = coleccionValida({
    nombre: 'Para leer despacio',
    criterio: CRITERIO_LARGO,
    miembros: [...deSeneca].reverse(),
  });
  return c;
}

let servidor: ChildProcess | undefined;
let proyecto: string | undefined;

test.beforeAll(async () => {
  if (test.info().project.name !== PERFIL) return;
  test.setTimeout(420_000);

  // El puerto tiene que estar libre: un servidor ajeno serviría otro sitio sin decirlo.
  const ocupado = await fetch(`${SITIO}/`, { signal: AbortSignal.timeout(2000) }).then(
    () => true,
    () => false,
  );
  if (ocupado) {
    throw new Error(`Alguien responde ya en ${PUERTO}. Comprueba quién con \`lsof -nP -iTCP:${PUERTO} -sTCP:LISTEN\`.`);
  }

  const construido = await construirConCorpus(corpus(), { jornada: JORNADA, conBusqueda: true });
  proyecto = construido.proyecto;
  expect(construido.codigo, construido.salida).toBe(0);
  const dist = join(construido.proyecto, 'dist');

  // Antes de abrir el navegador: lo que se mide está en la portada, o no hay nada que medir.
  const portada = await readFile(paginaEnDist(dist, '/'), 'utf8');
  expect(portada, 'el criterio largo no salió en la portada').toContain(PALABRA_DEL_CRITERIO);
  expect(portada, 'el Autor de nombre largo no salió en la portada').toContain(`href="${rutaDeAutor(SLUG_DEL_LARGO)}"`);

  servidor = spawn('node', [join(new URL('..', import.meta.url).pathname, 'servidor.mjs')], {
    env: { ...process.env, DIST: dist, PUERTO: String(PUERTO) },
    stdio: 'ignore',
  });
  let muerto: number | null = null;
  servidor.on('exit', (codigo) => (muerto = codigo ?? 1));
  servidor.on('error', () => (muerto = 1));
  const sonda = rutaDeColeccion('despacio');
  for (let intento = 0; intento < 100 && muerto === null; intento += 1) {
    try {
      // Una ruta que solo este corpus publica: un 200 dice que el servidor es el nuestro.
      const respuesta = await fetch(`${SITIO}${sonda}`, { signal: AbortSignal.timeout(2000) });
      if (respuesta.ok) return;
    } catch {
      // Todavía no ha levantado.
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`El sitio de prueba no llegó a servir ${sonda} en ${PUERTO}${muerto !== null ? ` (el servidor salió con ${muerto})` : ''}.`);
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
  test.skip(info.project.name !== PERFIL, 'se mide en un solo perfil: el sitio de prueba se construye una vez');
});

test('el chip de una Colección se nombra por la Colección y se describe por su criterio entero', async ({ page }) => {
  await page.goto(`${SITIO}/`);
  for (const [slug, nombre, criterio] of [
    ['breves', 'Breves', CRITERIO_CORTO],
    ['despacio', 'Para leer despacio', CRITERIO_LARGO],
  ] as const) {
    const chip = page.locator(`main ul[data-zona="colecciones"] a.chip[href="${rutaDeColeccion(slug)}"]`);
    await expect(chip).toHaveCount(1);
    await expect(chip).toHaveAccessibleName(nombre);
    await expect(chip).toHaveAccessibleDescription(criterio);
    await expect(page.locator(`main #criterio-de-${slug}`)).toHaveText(criterio);
  }
  // El destacado de nombre largo, entero y sin glifo.
  const fila = page.locator(`main li[data-zona="autores-de-portada"] a[href="${rutaDeAutor(SLUG_DEL_LARGO)}"]`);
  await expect(fila).toHaveAccessibleName(NOMBRE_LARGO);
});

test('cada Colección: el chip como el de Tema y sin estirarse, el criterio en el pie, sans y tinta apagada a `--unidad`; 2 × entre ellas y del rótulo', async ({ page }) => {
  // UX-DR62, variante 3A: lo que solo dice el CSS de `index.astro`, medido con el estilo calculado.
  await page.goto(`${SITIO}/`);
  await page.evaluate(() => document.fonts.ready);
  const m = await page.evaluate(() => {
    const raiz = getComputedStyle(document.documentElement);
    const resuelto = (propiedad: string, variable: string) => {
      const sonda = document.createElement('span');
      sonda.style.setProperty(propiedad, raiz.getPropertyValue(variable).trim());
      document.body.append(sonda);
      const r = getComputedStyle(sonda).getPropertyValue(propiedad);
      sonda.remove();
      return r;
    };
    const unidad = (() => {
      const sonda = document.createElement('div');
      sonda.style.cssText = 'height: var(--unidad)';
      document.body.append(sonda);
      const alto = sonda.getBoundingClientRect().height;
      sonda.remove();
      return alto;
    })();
    const aspecto = (a: Element) => {
      const e = getComputedStyle(a);
      return {
        familia: e.fontFamily,
        cuerpo: e.fontSize,
        color: e.color,
        fondo: e.backgroundColor,
        radio: e.borderRadius,
        altoMinimo: e.minHeight,
        relleno: e.paddingInline,
        subrayado: e.textDecorationLine,
      };
    };
    const caja = (e: Element) => e.getBoundingClientRect();
    const seccion = document.querySelector('main section[aria-labelledby="colecciones"]')!;
    const lista = seccion.querySelector('ul.colecciones')!;
    const filas = [...lista.querySelectorAll(':scope > li')];
    return {
      unidad,
      esperado: {
        sans: resuelto('font-family', '--sans'),
        pie: resuelto('font-size', '--pie'),
        apagada: resuelto('color', '--tinta-apagada'),
      },
      deTema: aspecto(document.querySelector('main ul[data-zona="chip-de-tema"] a.chip')!),
      bajoElRotulo: caja(lista).top - caja(seccion.querySelector('h2')!).bottom,
      entreColecciones: filas.slice(1).map((li, i) => caja(li).top - caja(filas[i]).bottom),
      filas: filas.map((li) => {
        const chip = li.querySelector('a.chip')!;
        const criterio = li.querySelector('p.criterio')!;
        const e = getComputedStyle(criterio);
        return {
          chip: aspecto(chip),
          chipMasEstrecho: caja(chip).width < caja(li).width - 1,
          chipALaIzquierda: Math.abs(caja(chip).left - caja(li).left) <= 0.5,
          chipACriterio: caja(criterio).top - caja(chip).bottom,
          criterio: { familia: e.fontFamily, cuerpo: e.fontSize, color: e.color },
        };
      }),
    };
  });
  expect(m.filas).toHaveLength(2);
  expect(m.esperado.sans).toMatch(/Inter/);
  for (const [i, fila] of m.filas.entries()) {
    expect(fila.chip, `Colección ${i + 1}: el chip no es el de Tema`).toEqual(m.deTema);
    expect(fila.chipMasEstrecho, `Colección ${i + 1}: el chip se estira a toda la fila`).toBe(true);
    expect(fila.chipALaIzquierda).toBe(true);
    expect(Math.abs(fila.chipACriterio - m.unidad), `chip → criterio: ${fila.chipACriterio}`).toBeLessThanOrEqual(0.5);
    expect(fila.criterio).toEqual({ familia: m.esperado.sans, cuerpo: m.esperado.pie, color: m.esperado.apagada });
  }
  expect(m.entreColecciones).toHaveLength(1);
  for (const hueco of m.entreColecciones) {
    expect(Math.abs(hueco - 2 * m.unidad), `Colección → Colección: ${hueco}`).toBeLessThanOrEqual(0.5);
  }
  expect(Math.abs(m.bajoElRotulo - 2 * m.unidad), `rótulo → lista: ${m.bajoElRotulo}`).toBeLessThanOrEqual(0.5);
});

test('a 320 px, en las tres condiciones, el criterio largo parte en varios renglones y la página no se desplaza', async ({ page }) => {
  for (const condicion of CONDICIONES) {
    if (!(await cargarEn320(page, `${SITIO}/`, condicion))) continue;
    const m = await anchoDeLaPagina(page);
    expect(m.scroll, `${condicion}: la página desborda (${m.scroll} > ${m.ventana})`).toBeLessThanOrEqual(m.ventana);
    for (const selector of ['main #criterio-de-despacio', `main a[href="${rutaDeAutor(SLUG_DEL_LARGO)}"] .nombre`]) {
      const caja = await page.locator(selector).evaluate((e) => {
        const estilo = getComputedStyle(e);
        const r = e.getBoundingClientRect();
        const contenedor = e.closest('li')!.getBoundingClientRect();
        return {
          lineas: Math.round(r.height / parseFloat(estilo.lineHeight)),
          dentro: r.left >= contenedor.left - 0.5 && r.right <= contenedor.right + 0.5,
          recorta: e.scrollWidth > e.clientWidth + 1,
        };
      });
      expect(caja.lineas, `${condicion}: ${selector}`).toBeGreaterThan(1);
      expect(caja.dentro, `${condicion}: ${selector} se sale de su fila`).toBe(true);
      expect(caja.recorta, `${condicion}: ${selector} se recorta`).toBe(false);
    }
  }
});

test('axe no encuentra nada en la portada con Colecciones y Autores destacados', async ({ page }) => {
  await page.goto(`${SITIO}/`);
  const resultado = await new AxeBuilder({ page }).withTags([...ETIQUETAS_DEL_BARRIDO]).analyze();
  const resumen = resultado.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${v.help} — ${n.target.join(' ')}`));
  expect(resumen, resumen.join('\n')).toEqual([]);
});

test('buscar el criterio da la Página de Colección, y el nombre del destacado su Página de Autor; ninguno la portada', async ({ page }) => {
  await page.goto(`${SITIO}/`);
  // El control positivo: el índice responde y la portada está en él.
  expect(await todasLasDirecciones(page, MARCA), MARCA).toContain('/');

  const delCriterio = await todasLasDirecciones(page, PALABRA_DEL_CRITERIO);
  expect(delCriterio, PALABRA_DEL_CRITERIO).toContain(rutaDeColeccion('despacio'));
  expect(delCriterio, PALABRA_DEL_CRITERIO).not.toContain('/');

  const delNombre = await todasLasDirecciones(page, NOMBRE_LARGO);
  expect(delNombre, NOMBRE_LARGO).toContain(rutaDeAutor(SLUG_DEL_LARGO));
  expect(delNombre, NOMBRE_LARGO).not.toContain('/');
});
