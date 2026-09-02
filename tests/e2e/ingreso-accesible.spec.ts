import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { MARCA_DE_INGRESO, modeloDe } from '../../src/lib/ingreso.ts';
import { rutaDeCita } from '../../src/lib/superficies.ts';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  fuenteConDonacionesEncendidas,
  limpiar,
  paginaEnDist,
} from '../unit/ayuda/construir.js';

/**
 * Historia 14.2 — la invitación a sostener el sitio, barrida **con el Modelo encendido**.
 *
 * `tests/e2e/accesibilidad.spec.ts` barre el sitio del repositorio, donde las donaciones
 * están apagadas y la invitación no existe: allí la zona de toque, el contraste, el anillo
 * de foco y el aviso de pestaña nueva de `Sostener.astro` se comprueban exactamente en el
 * estado en que no hay nada que comprobar. Un barrido en verde sobre páginas vacías es el
 * modo de fallo que este fichero existe para evitar, y por eso lo primero que hace —antes
 * de abrir el navegador— es exigir que la invitación esté ahí.
 *
 * **El Modelo se enciende parcheando la copia, nunca el árbol real ni por entorno (AD-21).**
 * El estado es configuración versionada: no hay bandera con la que pedirle a un build que
 * encienda un Modelo y no debe haberla. Así que se hace lo mismo que hará el commit del día
 * que LC-4 se cierre —cambiar el booleano, con `fuenteConDonacionesEncendidas`— sobre el
 * proyecto temporal, y se construye eso. En el repositorio `encendido` sigue en `false`.
 *
 * **Por qué esto no puede ser prueba unitaria.** `vitest.config.ts` corre en `environment:
 * 'node'` y la única dependencia de axe del proyecto es `@axe-core/playwright`: la altura
 * rendida, el anillo de foco calculado y el contraste real solo existen dentro de un
 * navegador. Este fichero es el único sitio del repositorio donde coinciden la invitación
 * encendida y un navegador.
 *
 * Lo que **no** se repite aquí: de qué superficies sale la invitación y a dónde lleva. Eso lo
 * afirma `tests/unit/ingreso-construido.test.ts` sobre el mismo parche, y sin pagar navegador.
 */

/*
 * En serie y en un solo perfil: el fichero levanta un servidor en un puerto fijo desde
 * `beforeAll`, y en paralelo ese `beforeAll` corre una vez por trabajador y los puertos
 * chocan entre sí. El perfil único ahorra además un `astro build` entero, que es lo que
 * cuesta cada montaje.
 */
test.describe.configure({ mode: 'serial' });

/*
 * Escritorio, y la zona de toque se mide bajando la ventana gráfica dentro de su prueba.
 * `--zona-de-toque`, `--tinta-apagada` y el anillo de foco son tokens sin consulta de medio
 * —`src/styles/tokens.css` solo varía la respiración y la escala tipográfica—, así que
 * repetir el barrido en móvil duplicaría el build sin añadir ni una señal.
 */
const PERFIL = 'escritorio';

/*
 * Puerto propio: 4321 lo ocupa el `webServer` de Playwright con el sitio del repositorio, y
 * 4400 el sitio con medición de `receptor.spec.ts` —4399 su receptor—. Servir aquí en
 * cualquiera de los tres sería barrer el sitio de otro creyendo barrer este.
 */
const PUERTO_SITIO = 4402;
const SITIO = `http://localhost:${PUERTO_SITIO}`;

/**
 * EXPERIENCE.md:112 — «mínimo 44px con 8px de separación». Son las dos cifras y los dos ejes:
 * 44 es alto **y** ancho, y la separación es respecto a lo enfocable de al lado. Con solo la
 * altura, quitarle a `DEL_BLOQUE` su `margin-top` dejaría el enlace pegado al de arriba y esto
 * seguiría en verde.
 */
const ZONA_DE_TOQUE = 44;
const SEPARACION = 8;

/** UX-DR23 — anillo de 2px separado 2px, el mismo que exige `accesibilidad.spec.ts`. */
const ANILLO = { ancho: '2px', separacion: '2px' };

/** El aviso que `Sostener.astro` mete **dentro** del enlace para que entre en su nombre. */
const AVISO_DE_PESTAÑA = /Apoyar el sitio \(se abre en una pestaña nueva\)/;

/**
 * El slug de la Cita que sirve de sonda de arranque, elegido para **no poder existir** en
 * `corpus/citas/`.
 *
 * La espera no puede preguntar «¿contesta alguien en el puerto?». Un `servidor.mjs` de un
 * árbol de trabajo ya borrado se quedó cinco días escuchando en 4400 (`faec4b6e`), y con él
 * cuatro pruebas en rojo por un motivo que no era el suyo: el `spawn` moría con EADDRINUSE
 * sin decir nada y las pruebas navegaban contra el sitio de otro. Con una ruta que solo este
 * corpus publica, un 200 significa que el servidor es el nuestro y cualquier otra cosa dice
 * que hay alguien más en el puerto.
 *
 * «Solo este corpus» tiene que ser cierto **por construcción y no por comentario**: la sonda
 * anterior era una Cita de Séneca y estaba a un sufijo de colisionar con
 * `corpus/citas/seneca--la-vida-si-sabes-usarla-es-larga.md`. Con esa colisión, un intruso que
 * sirviera el sitio de verdad habría respondido 200 y la detección se habría vuelto muda. Esta
 * no se parece a nada que el Corpus pueda producir, y además se comprueba contra él abajo.
 */
const SONDA_SLUG = 'zzz-sonda-de-arranque-del-barrido-de-ingreso';
const SONDA = rutaDeCita(SONDA_SLUG);

const CORPUS = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'citas/seneca--a.md': citaValida({
    slug: 'seneca-no-es-que-tengamos-poco-tiempo',
    texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
    aptaParaPortada: true,
  }),
  'citas/seneca--sonda.md': citaValida({
    slug: SONDA_SLUG,
    texto: 'La vida, si sabes usarla, es larga; nadie te la puede quitar de las manos.',
    aptaParaPortada: true,
  }),
};

/** La jornada se fija: la Cita del Día rota con el calendario, no con lo que se mide aquí. */
const JORNADA = '2026-08-20';

/**
 * Las tres superficies de no lectura que UX-DR36 admite, con la ruta que se pide al servidor,
 * el fichero que las publica y la página que las declara.
 *
 * `pagina` no es decoración: esta constante es la cuarta lista de superficies del proyecto, y
 * la lección de la Historia 12.1 es que la lista escrita a mano es la que nadie recuerda
 * tocar. La guarda de abajo la cruza con `admitidoEn` del Modelo, así que una cuarta
 * superficie admitida no puede quedarse sin barrer en silencio.
 *
 * La 404 se pide por una ruta que no existe a propósito: es como se llega a ella de verdad, y
 * `tests/servidor.mjs` sirve `dist/404.html` con estado 404 igual que el hospedaje.
 */
const SUPERFICIES = [
  { nombre: 'portada', pagina: 'index.astro', ruta: '/', enDist: '/' },
  { nombre: '/buscar/', pagina: 'buscar.astro', ruta: '/buscar/', enDist: 'buscar' },
  { nombre: '404', pagina: '404.astro', ruta: '/esta-ruta-no-existe-en-el-sitio/', enDist: '404' },
] as const;

let servidor: ChildProcess | undefined;
let proyecto: string | undefined;

/** El enlace de la invitación, buscado por la marca del Modelo y no por su clase. */
function enlace(page: Page) {
  return page.locator(`[${MARCA_DE_INGRESO}="donaciones"] a`);
}

async function irA(page: Page, ruta: string): Promise<void> {
  // URL absoluta: el `baseURL` de la configuración apunta a 4321, que es el otro sitio.
  await page.goto(`${SITIO}${ruta}`);
}

test.beforeAll(async () => {
  // El montaje también se salta fuera del perfil: si no, el trabajador del otro levantaría
  // el mismo puerto en paralelo aunque no llegara a ejecutar ninguna prueba.
  if (test.info().project.name !== PERFIL) return;

  // `astro build` más Pagefind no caben en el tiempo de una prueba corriente, y el gancho
  // hereda ese plazo. Sin esto el montaje muere a mitad del build y el fallo no se parece a
  // su causa.
  test.setTimeout(300_000);

  /*
   * La guarda de la lista escrita a mano — Historia 12.1.
   *
   * `admitidoEn` es el dueño de qué superficies muestran la invitación. Si algún día admite
   * una cuarta, esto rompe aquí en vez de dejar una superficie con invitación sin barrer, que
   * es la forma silenciosa de que este fichero deje de cubrir lo que dice cubrir.
   */
  const admitidas = modeloDe('donaciones')?.admitidoEn ?? [];
  expect(
    [...SUPERFICIES.map((s) => s.pagina)].sort(),
    'las superficies que se barren aquí no son las que el Modelo admite',
  ).toEqual([...admitidas].sort());

  /*
   * Y la guarda de la sonda: que su slug no exista en el Corpus de verdad. Si existiera, un
   * proceso ajeno sirviendo el sitio real respondería 200 y la detección del intruso —lo único
   * que separa «mi servidor arrancó» de «hay otro en el puerto»— pasaría a mentir.
   */
  const citas = await readdir(resolve(RAIZ, 'corpus', 'citas'));
  for (const fichero of citas.filter((f) => f.endsWith('.md'))) {
    const contenido = await readFile(resolve(RAIZ, 'corpus', 'citas', fichero), 'utf8');
    expect(
      contenido.includes(SONDA_SLUG),
      `«${SONDA_SLUG}» existe en el Corpus (${fichero}): deja de servir como sonda`,
    ).toBe(false);
  }

  const fuente = await readFile(resolve(RAIZ, 'src/lib/ingreso.ts'), 'utf8');
  // El diff que promete la épica —un booleano— acotado al bloque de donaciones. El ayudante
  // rompe si la sustitución alcanzara a otro Modelo, y dice qué pasa si ya está encendido.
  const encendida = fuenteConDonacionesEncendidas(fuente);

  const construido = await construirConCorpus(CORPUS, {
    jornada: JORNADA,
    ficheros: { 'src/lib/ingreso.ts': encendida },
    // `/buscar/` es una de las tres superficies y sin índice no es la página que se publica.
    conBusqueda: true,
  });
  proyecto = construido.proyecto;
  expect(construido.codigo, construido.salida).toBe(0);

  /*
   * La guarda previa, y la razón de ser de todo el fichero: si el parche construyó un sitio
   * **sin** invitación, el barrido pasaría en verde sobre tres páginas donde no hay nada que
   * barrer. Se comprueba sobre el HTML construido, antes de abrir el navegador, para que el
   * fallo diga lo que pasa en vez de aparecer como un localizador que no encuentra nada.
   */
  const dist = join(construido.proyecto, 'dist');
  for (const superficie of SUPERFICIES) {
    const html = await readFile(paginaEnDist(dist, superficie.enDist), 'utf8');
    expect(
      html.includes(`${MARCA_DE_INGRESO}="donaciones"`),
      `${superficie.nombre} se construyó sin la invitación: el Modelo no llegó a encenderse y ` +
        'no hay nada que barrer. Un barrido en verde sobre esto no significaría nada.',
    ).toBe(true);
  }

  servidor = spawn('node', [join(new URL('..', import.meta.url).pathname, 'servidor.mjs')], {
    env: { ...process.env, DIST: dist, PUERTO: String(PUERTO_SITIO) },
    stdio: 'ignore',
  });

  /*
   * Las dos formas de morir, y son distintas: un `spawn` que ni llega a arrancar —`node` que
   * no está en el camino, permisos— emite `error` y **no** `exit`, así que vigilando solo
   * `exit` la excepción sube sin capturar y tumba el trabajador entero sin decir qué pasó.
   * Con `stdio: 'ignore'` no hay salida que leer, y estos dos oyentes son todo el diagnóstico
   * que va a haber.
   */
  let muerto: number | null = null;
  let falloAlArrancar: Error | undefined;
  servidor.on('exit', (codigo) => (muerto = codigo ?? 1));
  servidor.on('error', (fallo) => (falloAlArrancar = fallo as Error));

  let ajeno: number | undefined;
  for (let intento = 0; intento < 100; intento += 1) {
    if (muerto !== null || falloAlArrancar !== undefined) break;
    try {
      /*
       * Con plazo: un proceso ajeno que acepta la conexión y no contesta nunca deja este
       * `fetch` colgado, y el montaje se comería los 300 s sin llegar al mensaje de abajo —el
       * que dice justamente que hay alguien más en el puerto—.
       */
      const respuesta = await fetch(`${SITIO}${SONDA}`, { signal: AbortSignal.timeout(2000) });
      if (respuesta.ok) return;
      ajeno = respuesta.status;
    } catch {
      // Todavía no ha levantado, o el que hay no contesta; se reintenta.
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  throw new Error(
    [
      `El sitio con las donaciones encendidas no llegó a servir ${SONDA} en ${PUERTO_SITIO}.`,
      falloAlArrancar !== undefined
        ? `El proceso no llegó a arrancar: ${falloAlArrancar.message}.`
        : muerto !== null
          ? `El servidor murió al arrancar (código ${muerto}); casi siempre es el puerto ocupado.`
          : ajeno !== undefined
            ? `Alguien responde en ${PUERTO_SITIO}, pero con ${ajeno}: no es este sitio.`
            : 'Nadie respondió en el puerto, ni contestando ni cerrando.',
      `Comprueba quién lo ocupa con \`lsof -nP -iTCP:${PUERTO_SITIO} -sTCP:LISTEN\`.`,
    ].join(' '),
  );
});

test.afterAll(async () => {
  /*
   * Se espera al `close` y no basta con `kill()`: la orden solo manda la señal, y si esto
   * vuelve antes de que el proceso suelte el descriptor, la siguiente tirada se encuentra el
   * 4402 ocupado y falla por el motivo que este fichero más trabajo se toma en distinguir.
   * Con tope, porque un servidor que no muere no puede además colgar la suite.
   */
  if (servidor && servidor.exitCode === null && servidor.signalCode === null) {
    const cerrado = new Promise<void>((r) => servidor!.once('close', () => r()));
    servidor.kill();
    await Promise.race([cerrado, new Promise((r) => setTimeout(r, 5000))]);
  }
  // El proyecto temporal se borra pase lo que pase: `git status` tiene que salir limpio y el
  // directorio temporal no debe quedarse con copias huérfanas del sitio.
  if (proyecto) await limpiar(proyecto);
});

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== PERFIL, 'los tokens que se miden no dependen del dispositivo');
});

test.describe('la invitación encendida pasa el barrido de accesibilidad', () => {
  for (const superficie of SUPERFICIES) {
    test(`${superficie.nombre} pasa la auditoría automática`, async ({ page }) => {
      await irA(page, superficie.ruta);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Una línea por nodo y no por regla: el selector es lo que dice si lo que falla es la
      // invitación o algo que ya estaba, y sin él el fallo obliga a reproducirlo a mano.
      const resumen = violations.flatMap((v) =>
        v.nodes.map((n) => `${v.id}: ${v.help} — ${n.target.join(' ')}`),
      );
      expect(resumen, `${superficie.nombre}\n${resumen.join('\n')}`).toEqual([]);
    });
  }

  test('el contraste de la invitación pasa la regla de axe en las tres', async ({ page }) => {
    /*
     * Acotado al bloque marcado y a la regla del contraste. El barrido de arriba ya la
     * incluye —`color-contrast` es `wcag2aa`—, pero mira la página entera: si algún día
     * fallara ahí, el fallo no distinguiría el texto apagado de la invitación
     * (`--tinta-apagada`, 7,4:1 sobre el papel) de cualquier otra cosa de la página. Esta
     * dice el nombre de lo que se rompió.
     */
    for (const superficie of SUPERFICIES) {
      await irA(page, superficie.ruta);
      const { violations } = await new AxeBuilder({ page })
        .include(`[${MARCA_DE_INGRESO}="donaciones"]`)
        .withRules(['color-contrast'])
        .analyze();

      const resumen = violations.flatMap((v) =>
        v.nodes.map((n) => `${v.id} — ${n.target.join(' ')}: ${n.any[0]?.message ?? ''}`),
      );
      expect(resumen, `${superficie.nombre}\n${resumen.join('\n')}`).toEqual([]);
    }
  });
});

test.describe('las cifras del enlace, medidas sobre el enlace rendido', () => {
  test(`la zona de toque son ${ZONA_DE_TOQUE}px por los dos lados`, async ({ page }) => {
    // A 360px, que es donde la zona de toque significa algo y donde la mide el barrido de la
    // Historia 2.8. El texto del enlace es corto: lo que sostiene el alto es `min-height`.
    await page.setViewportSize({ width: 360, height: 640 });

    for (const superficie of SUPERFICIES) {
      await irA(page, superficie.ruta);
      const caja = await enlace(page).boundingBox();
      expect(caja, `${superficie.nombre}: el enlace no se rindió con caja`).not.toBeNull();
      expect(
        caja!.height,
        `${superficie.nombre}: el enlace mide ${caja!.height}px de alto y la zona de toque son ${ZONA_DE_TOQUE}px`,
      ).toBeGreaterThanOrEqual(ZONA_DE_TOQUE);
      expect(
        caja!.width,
        `${superficie.nombre}: el enlace mide ${caja!.width}px de ancho y la zona de toque son ${ZONA_DE_TOQUE}px`,
      ).toBeGreaterThanOrEqual(ZONA_DE_TOQUE);
    }
  });

  test(`y guarda ${SEPARACION}px con lo enfocable de al lado`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });

    for (const superficie of SUPERFICIES) {
      await irA(page, superficie.ruta);

      /*
       * El mismo criterio de solape que `accesibilidad.spec.ts`: dos objetivos están
       * separados si lo están en **alguno** de los dos ejes. Aquí se le pone además la cifra
       * —8px—, que es lo que EXPERIENCE.md pide y lo que el barrido general no comprueba:
       * quitarle a `DEL_BLOQUE` su `margin-top` deja el enlace pegado al de arriba sin que
       * ninguna otra prueba del repositorio se entere.
       */
      const pegados = await page.evaluate(
        ({ marca, minima }) => {
          const objetivo = document.querySelector(`${marca} a`);
          if (objetivo === null) return ['no hay enlace de invitación en la página'];

          const visible = (n: Element) => {
            const r = n.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          };
          const caja = objetivo.getBoundingClientRect();

          return [...document.querySelectorAll('a, button, input, textarea, select, [tabindex]')]
            .filter((n) => n !== objetivo && !n.contains(objetivo) && visible(n))
            .filter((n) => {
              const otra = n.getBoundingClientRect();
              // Hueco por eje: negativo cuando se solapan en ese eje.
              const vertical = Math.max(caja.top - otra.bottom, otra.top - caja.bottom);
              const horizontal = Math.max(caja.left - otra.right, otra.left - caja.right);
              return Math.max(vertical, horizontal) < minima;
            })
            .map((n) => {
              const otra = n.getBoundingClientRect();
              const vertical = Math.max(caja.top - otra.bottom, otra.top - caja.bottom);
              const horizontal = Math.max(caja.left - otra.right, otra.left - caja.right);
              const nombre = `${n.tagName.toLowerCase()}«${(n.textContent ?? '').trim().slice(0, 24)}»`;
              return `${nombre}: ${Math.round(Math.max(vertical, horizontal))}px`;
            });
        },
        { marca: `[${MARCA_DE_INGRESO}="donaciones"]`, minima: SEPARACION },
      );

      expect(
        pegados,
        `${superficie.nombre}: hay enfocables a menos de ${SEPARACION}px del enlace\n${pegados.join('\n')}`,
      ).toEqual([]);
    }
  });

  test('el foco llega por teclado y el anillo se ve', async ({ page }) => {
    await irA(page, '/');

    /*
     * Se tabula de verdad hasta el enlace en vez de llamar a `focus()`: `:focus-visible` es
     * lo que dibuja el anillo, y solo casa cuando el foco llegó por teclado. Con `focus()` la
     * prueba podría pasar sobre un enlace cuyo anillo nadie ve nunca.
     *
     * La invitación va al final de la columna, así que hay muchas paradas antes; el tope es
     * holgado y lo que se afirma es haber llegado, no cuántas hicieron falta.
     */
    const marca = `[${MARCA_DE_INGRESO}="donaciones"] a`;
    let alcanzado = false;
    for (let paso = 0; paso < 80 && !alcanzado; paso += 1) {
      await page.keyboard.press('Tab');
      alcanzado = await page.evaluate(
        (selector) => document.activeElement?.matches(selector) === true,
        marca,
      );
    }
    expect(alcanzado, 'el enlace de la invitación no recibió el foco en 80 tabulaciones').toBe(
      true,
    );

    const anillo = await enlace(page).evaluate((n) => {
      const s = getComputedStyle(n);
      return {
        ancho: s.outlineWidth,
        estilo: s.outlineStyle,
        separacion: s.outlineOffset,
        porTeclado: n.matches(':focus-visible'),
      };
    });

    expect(anillo.porTeclado, 'el foco no cuenta como visible para el navegador').toBe(true);
    expect(anillo.estilo, `el indicador está suprimido: outline-style ${anillo.estilo}`).not.toBe(
      'none',
    );
    expect(anillo.ancho).toBe(ANILLO.ancho);
    expect(anillo.separacion).toBe(ANILLO.separacion);
  });

  test('sale a una pestaña nueva, lo dice y no cede la ventana de origen', async ({ page }) => {
    for (const superficie of SUPERFICIES) {
      await irA(page, superficie.ruta);
      /*
       * Las tres cosas juntas o ninguna. El aviso solo hace falta porque el enlace sale de la
       * pestaña, y sin él quien no ve la pantalla pierde la página en la que estaba; y
       * `target="_blank"` sin `rel="noopener noreferrer"` le entrega al destino un `opener`
       * con el que puede reescribir la pestaña que se deja atrás. La pareja la vigilaba solo
       * el unitario sobre el HTML crudo: aquí se mira lo que el navegador tiene delante.
       */
      await expect(enlace(page), superficie.nombre).toHaveAttribute('target', '_blank');
      await expect(enlace(page), superficie.nombre).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(enlace(page), superficie.nombre).toHaveAccessibleName(AVISO_DE_PESTAÑA);
    }
  });
});

test.describe('encendida sigue sin ser un muro — NFR-10, UX-DR36', () => {
  test('no hay modal, ni nada fijo que tape el contenido', async ({ page }) => {
    /*
     * El barrido de la Historia 2.8 comprueba esto sobre el sitio apagado, donde la invitación
     * no existe: sin repetirlo aquí, un `position: sticky; bottom: 0` en `DEL_BLOQUE` pasaría
     * las cuatro comprobaciones de arriba —zona de toque, foco, nombre y contraste— y
     * convertiría la invitación en la barra pegajosa que UX-DR36 dice que no es.
     *
     * Al bloque marcado se le mira **sin** el umbral de 100px que usa el barrido general: ahí
     * el umbral existe para no cazar cabeceras finas legítimas, y aquí no hay nada legítimo
     * que fijar. La invitación es el final de la columna o no es la invitación.
     */
    for (const superficie of SUPERFICIES) {
      await irA(page, superficie.ruta);

      expect(
        await page.locator('dialog[open], [role="dialog"], [role="alertdialog"]').count(),
        superficie.nombre,
      ).toBe(0);

      const fijos = await page.evaluate((marca) => {
        const pegajoso = (n: Element) => {
          const s = getComputedStyle(n);
          return s.position === 'fixed' || s.position === 'sticky';
        };
        const nombrar = (n: Element) =>
          `${n.tagName.toLowerCase()}.${n.className || '—'}: ${getComputedStyle(n).position}`;

        // Cualquier cosa de la invitación, fijada o pegada, sin mínimo de altura.
        const bloque = document.querySelector(marca);
        const suyos = bloque
          ? [bloque, ...bloque.querySelectorAll('*')].filter(pegajoso).map(nombrar)
          : ['no hay invitación en la página'];

        // Y en el resto de la página, el mismo criterio del barrido de la 2.8.
        const ajenos = [...document.querySelectorAll('body *')]
          .filter(
            (n) =>
              !bloque?.contains(n) &&
              pegajoso(n) &&
              getComputedStyle(n).display !== 'none' &&
              n.getBoundingClientRect().height > 100,
          )
          .map(nombrar);

        return [...suyos, ...ajenos];
      }, `[${MARCA_DE_INGRESO}="donaciones"]`);

      expect(fijos, `${superficie.nombre}\n${fijos.join('\n')}`).toEqual([]);
    }
  });
});
