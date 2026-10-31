import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  autorDe,
  citaConLosDosBloques,
  citaDeTramo,
  citasPorTema,
  coleccionPublicada,
  fichasDeObraPorCita,
  textoDe,
} from './ayuda/corpus.ts';
import { buscar } from './ayuda/buscar.ts';
import { segmentosDeObra } from '../../src/lib/obras.ts';
import { rutaDeAutor, rutaDeCita, rutaDeColeccion, rutaDeObra, rutaDeTema } from '../../src/lib/superficies.ts';
import { MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';

/**
 * Historia 26.12 — el peso y el interlineado salen de sus tokens, y nada cambia a la vista.
 *
 * Migrar los literales a `--peso-…` y `--interlineado-…` (src/styles/tokens.css) no puede mover
 * ni un elemento: cada uno conserva el `font-weight` calculado y la razón `line-height / font-size`
 * que tenía. Las instantáneas se grabaron desde el commit base de la historia (45d278a3c7), antes
 * del primer cambio de CSS, en un `git worktree` aparte con esta misma prueba, y se versionan con
 * la historia: «antes y después» queda en el repositorio y no en la memoria de quien migró.
 *
 * La clave de cada elemento es su **ruta de clases** desde `<body>` —etiqueta, clases y el
 * `data-tramo` que elige el cuerpo de la Cita—, nunca su texto, y el valor es cuántos elementos de
 * esa ruta dan cada par «peso | interlineado/cuerpo». Lo que rota con la jornada —el Bloque de
 * Cita dentro de `data-jornada`, en la portada y el 404— no entra: su tramo cambia con el día; es
 * el mismo componente que la Página de Cita, que sí se mide en los tramos `xl`, `lg` y `md`. El
 * tramo `sm` no se mide porque ninguna Cita del Corpus pasa hoy de 240 caracteres; su cuerpo y su
 * interlineado (`--cita-sm`) son los del tramo `md` en móvil, que sí se miden. Las páginas se
 * derivan del Corpus (`tests/e2e/ayuda/corpus.ts`), así que una siembra que cambie lo que listan
 * obliga a regrabar desde una base sin la migración que se quiera comprobar.
 *
 * Las instantáneas **no llevan sufijo de plataforma**: lo que se mide son valores calculados de
 * CSS (un peso y una razón), que no dependen del sistema ni de la fuente que se rasterice. Por eso
 * esta prueba guarda y compara sus JSON por su cuenta, sin `toMatchSnapshot`, cuyo nombre lleva el
 * sistema por la plantilla de la configuración. `--update-snapshots` las regraba igual.
 *
 * El bloque «Ediciones en venta» (`EdicionesEnVenta.astro`) no sale en ninguna página mientras la
 * afiliación esté apagada: lo cubre solo la guardia estática de
 * `tests/unit/tipografia-en-tokens.test.ts`.
 *
 * Solo local, como toda prueba de Playwright: el CI no la corre.
 */

const INSTANTANEAS = join(dirname(new URL(import.meta.url).pathname), 'tipografia-calculada.spec.ts-snapshots');

const CITA = citaConLosDosBloques();
const FICHA = CITA === undefined ? undefined : fichasDeObraPorCita().get(CITA);
/** El Autor de esa Cita: tiene Lista de Obras, porque su Obra tiene cuatro Citas o más. */
const AUTOR = CITA === undefined ? undefined : autorDe(CITA);
const TEMA = [...citasPorTema()].filter(([, n]) => n >= MIN_CITAS_POR_TEMA).map(([slug]) => slug).sort()[0];
const COLECCION = coleccionPublicada();
/** Una palabra larga de la Cita de los dos bloques: la búsqueda da al menos esa Cita. */
const CONSULTA =
  CITA === undefined
    ? undefined
    : textoDe(CITA)
        .split(/[^\p{L}]+/u)
        .filter((p) => p.length >= 6)
        .sort((a, b) => b.length - a.length || (a < b ? -1 : 1))[0];

const conRuta = <T,>(valor: T | undefined, ruta: (v: T) => string) => (valor === undefined ? undefined : ruta(valor));

interface Pagina {
  nombre: string;
  ruta: string | undefined;
  estado?: number;
  /** Lo que hay que hacer en la página antes de medir; por omisión, abrirla y esperar a la red. */
  abrir?: (page: Page, ruta: string) => Promise<void>;
}

const PAGINAS: Pagina[] = [
  { nombre: 'portada', ruta: '/' },
  { nombre: 'cita', ruta: conRuta(CITA, rutaDeCita) },
  ...['xl', 'lg', 'md'].map((tramo) => ({ nombre: `cita-tramo-${tramo}`, ruta: conRuta(citaDeTramo(tramo), rutaDeCita) })),
  {
    nombre: 'obra',
    ruta: conRuta(FICHA, (ficha) => {
      const { autor, obra } = segmentosDeObra(ficha);
      return rutaDeObra(autor, obra);
    }),
  },
  { nombre: 'autor', ruta: conRuta(AUTOR, (slug) => rutaDeAutor(slug)) },
  { nombre: 'tema', ruta: conRuta(TEMA, (slug) => rutaDeTema(slug)) },
  { nombre: 'coleccion', ruta: conRuta(COLECCION, (slug) => rutaDeColeccion(slug)) },
  { nombre: 'autores', ruta: '/autores/' },
  { nombre: 'obras', ruta: '/obras/' },
  { nombre: 'buscar', ruta: '/buscar/' },
  {
    nombre: 'buscar-con-resultados',
    ruta: CONSULTA,
    abrir: async (page, consulta) => {
      await buscar(page, consulta);
      await expect(page.locator('[data-resultados] .resultado').first()).toBeVisible();
      await page.waitForLoadState('networkidle');
    },
  },
  { nombre: '404', ruta: '/esta-pagina-no-existe/', estado: 404 },
];

/** Por ruta de clases, cuántos elementos dan cada par «peso | interlineado/cuerpo». */
async function tipografiaCalculada(page: Page): Promise<Record<string, Record<string, number>>> {
  return page.evaluate(() => {
    const NO_SE_MIDEN = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT']);
    const porRuta = new Map<string, Map<string, number>>();
    const ruta = (el: Element): string => {
      const partes: string[] = [];
      for (let actual: Element | null = el; actual !== null && actual !== document.body; actual = actual.parentElement) {
        const clases = [...actual.classList].sort().map((c) => `.${c}`).join('');
        const tramo = actual.getAttribute('data-tramo');
        partes.unshift(`${actual.tagName.toLowerCase()}${clases}${tramo === null ? '' : `[data-tramo=${tramo}]`}`);
      }
      return partes.join(' > ');
    };
    for (const el of document.body.querySelectorAll('*')) {
      if (NO_SE_MIDEN.has(el.tagName) || el.closest('noscript, template') !== null) continue;
      if (el.closest('[data-jornada] .bloque') !== null) continue;
      const conTexto = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '');
      if (!conTexto) continue;
      const estilo = getComputedStyle(el);
      const cuerpo = parseFloat(estilo.fontSize);
      if (!(cuerpo > 0)) continue;
      const interlineado =
        estilo.lineHeight === 'normal' ? 'normal' : (parseFloat(estilo.lineHeight) / cuerpo).toFixed(3);
      const clave = ruta(el);
      const pares = porRuta.get(clave) ?? new Map<string, number>();
      const par = `${estilo.fontWeight} | ${interlineado}`;
      pares.set(par, (pares.get(par) ?? 0) + 1);
      porRuta.set(clave, pares);
    }
    return Object.fromEntries(
      [...porRuta]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([k, pares]) => [k, Object.fromEntries([...pares].sort(([a], [b]) => (a < b ? -1 : 1)))]),
    );
  });
}

test.describe('Historia 26.12 — el peso y el interlineado calculados no cambian', () => {
  for (const { nombre, ruta, estado = 200, abrir } of PAGINAS) {
    test(`${nombre}: cada elemento con texto conserva su peso y su interlineado`, async ({ page }, info) => {
      expect(ruta, `El Corpus de hoy no tiene la página «${nombre}» que mide esta prueba.`).toBeDefined();
      if (abrir !== undefined) {
        await abrir(page, ruta!);
      } else {
        const respuesta = await page.goto(ruta!, { waitUntil: 'networkidle' });
        expect(respuesta?.status(), ruta).toBe(estado);
      }
      const medida = await tipografiaCalculada(page);
      expect(Object.keys(medida).length).toBeGreaterThan(5);

      const texto = `${JSON.stringify(medida, null, 2)}\n`;
      const fichero = join(INSTANTANEAS, `tipografia-${nombre}-${info.project.name}.json`);
      const regrabar = info.config.updateSnapshots === 'all' || info.config.updateSnapshots === 'changed';
      const grabar = () => {
        mkdirSync(INSTANTANEAS, { recursive: true });
        writeFileSync(fichero, texto, 'utf8');
      };
      if (regrabar) return grabar();
      if (!existsSync(fichero)) {
        // Como `toMatchSnapshot`: la que falta se graba, y la prueba falla para que se mire.
        if (info.config.updateSnapshots !== 'none') grabar();
        expect.soft(false, `No había instantánea: ${info.config.updateSnapshots !== 'none' ? 'se grabó' : 'falta'} ${fichero}`).toBe(true);
        return;
      }
      expect(medida, fichero).toEqual(JSON.parse(readFileSync(fichero, 'utf8')));
    });
  }
});
