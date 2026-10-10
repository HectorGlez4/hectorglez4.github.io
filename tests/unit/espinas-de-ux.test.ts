import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  RAIZ,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { AVISO_DE_PESTAÑA_NUEVA } from '../../src/lib/accesibilidad.ts';
import { DESTINOS, rotuloDeDestino } from '../../src/lib/compartir.ts';

/**
 * Historia 22.10 — lo construido cumple las espinas de UX.
 *
 * Lo que basta con el marcado se mira aquí, sobre un `dist/` construido con un corpus
 * fabricado; lo que necesita un navegador —el foco por teclado, las medidas a 360 px, el
 * generador que no carga, los anuncios— lo miran las pruebas de `tests/e2e/`, que el CI no
 * corre. Por eso esta existe: es la mitad que sí ve el CI.
 */

/** Los ficheros que pueden llevar estilos o tocarlos desde un guion. */
async function ficherosConEstilos(dir: string, extensiones: RegExp): Promise<string[]> {
  const fuera: string[] = [];
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) fuera.push(...(await ficherosConEstilos(ruta, extensiones)));
    else if (extensiones.test(entrada.name)) fuera.push(ruta);
  }
  return fuera;
}

/**
 * Las formas de anular el anillo: en CSS, quitarlo, dejarlo a cero de ancho o volverlo
 * transparente; en un guion, tocar `style.outline*` o fijarlo por `setProperty`. Se buscan
 * sobre el texto entero y no por líneas, para que una declaración partida no se escape.
 */
const ANULAN_EL_ANILLO = [
  /outline\s*:\s*(none|0(px)?|transparent)(?![\w.-])/gi,
  /outline-style\s*:\s*none\b/gi,
  /outline-width\s*:\s*0(px)?(?![\w.])/gi,
  /outline-color\s*:\s*transparent\b/gi,
  /\.style\.outline(Style|Width|Color)?\s*=/g,
  /setProperty\(\s*['"`]outline/g,
];

describe('Historia 22.10 — nada suprime el anillo de foco', () => {
  it('el detector reconoce cada forma de anularlo, también partida en líneas', () => {
    const casos = [
      'a { outline: none; }',
      'a { outline:\n  0; }',
      'a { outline: 0px }',
      'a { outline: transparent; }',
      'a { outline-style: none }',
      'a { outline-width: 0 }',
      'a { outline-width: 0px }',
      'a { outline-color: transparent }',
      'n.style.outline = "none";',
      'n.style.outlineWidth = 0;',
      "n.style.setProperty('outline', 'none');",
    ];
    for (const caso of casos) {
      expect(ANULAN_EL_ANILLO.some((p) => new RegExp(p.source, p.flags).test(caso)), caso).toBe(true);
    }
    // Y no confunde el anillo de verdad con su anulación.
    for (const sano of ['outline: 2px solid var(--siena);', 'outline-offset: 0;', 'outline-width: 2px']) {
      expect(ANULAN_EL_ANILLO.some((p) => new RegExp(p.source, p.flags).test(sano)), sano).toBe(false);
    }
  });

  it('ninguna regla ni guion de src/ o public/islas/ anula el `outline`', async () => {
    /*
     * El anillo global de `tokens.css` es la única declaración de foco. El campo de búsqueda
     * lo anulaba con `outline: none` en `/buscar/` y en el 404 y lo sustituía por el filete:
     * el filete puede sumarse, nunca reemplazarlo.
     */
    const ficheros = [
      ...(await ficherosConEstilos(join(RAIZ, 'src'), /\.(astro|css|ts|js|mjs)$/)),
      ...(await ficherosConEstilos(join(RAIZ, 'public', 'islas'), /\.(js|mjs)$/)),
    ];
    expect(ficheros.some((f) => f.endsWith('imagen.js')), 'el barrido no llega a public/islas/').toBe(true);
    const anulan: string[] = [];
    for (const fichero of ficheros) {
      const texto = await readFile(fichero, 'utf8');
      for (const patron of ANULAN_EL_ANILLO) {
        for (const m of texto.matchAll(new RegExp(patron.source, patron.flags))) {
          const linea = texto.slice(0, m.index).split('\n').length;
          anulan.push(`${fichero.slice(RAIZ.length + 1)}:${linea}: ${m[0]}`);
        }
      }
    }
    expect(anulan).toEqual([]);
  });
});

describe('Historia 22.10 — el aviso de pestaña nueva tiene un solo dueño', () => {
  it('los tres enlaces que abren pestaña nueva lo toman de `src/lib/accesibilidad.ts`', async () => {
    for (const componente of [
      'src/islands/CompartirEnlace.astro',
      'src/components/Sostener.astro',
      'src/components/EdicionesEnVenta.astro',
    ]) {
      const fuente = await readFile(join(RAIZ, componente), 'utf8');
      expect(fuente, componente).toMatch(
        /import \{ AVISO_DE_PESTAÑA_NUEVA \} from '\.\.\/lib\/accesibilidad\.ts';/,
      );
      expect(fuente, componente).toContain('{AVISO_DE_PESTAÑA_NUEVA}</span>');
      // Ninguna copia escrita a mano de la frase fuera de los comentarios.
      const sinComentarios = fuente.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(sinComentarios, componente).not.toContain('se abre en una pestaña nueva');
    }
    expect(AVISO_DE_PESTAÑA_NUEVA).toBe(' (se abre en una pestaña nueva)');
  });
});

const SLUG = 'seneca-no-es-que-tengamos-poco-tiempo';

describe('Historia 22.10 — el marcado construido', () => {
  let proyecto = '';
  const paginas: Record<string, string> = {};

  beforeAll(async () => {
    const resultado = await construirConCorpus({
      'autores/seneca.yml': AUTOR_VALIDO,
      'citas/seneca--a.md': citaValida({ temas: [] }),
    });
    proyecto = resultado.proyecto;
    expect(resultado.codigo, resultado.salida).toBe(0);
    for (const ruta of [`/cita/${SLUG}/`, '/buscar/', '/404', '/']) {
      paginas[ruta] = await readFile(paginaConstruida(proyecto, ruta), 'utf8');
    }
  }, 240_000);

  afterAll(async () => {
    if (proyecto !== '') await limpiar(proyecto);
  });

  /** Las etiquetas de apertura de las regiones `role="status"` de una página. */
  const regiones = (html: string) => [...html.matchAll(/<[a-z]+\b[^>]*\brole="status"[^>]*>/g)].map((m) => m[0]);

  it('la Página de Cita lleva la región de Copiar, vacía y sin `hidden`, desde la carga', () => {
    const html = paginas[`/cita/${SLUG}/`];
    const copiar = /<button[^>]*data-copiar=[^>]*>[\s\S]*?<\/button>\s*<p([^>]*\brole="status"[^>]*)>(.*?)<\/p>/.exec(html);
    expect(copiar, 'sin región de estado junto a Copiar').not.toBeNull();
    expect(copiar![1]).not.toMatch(/\bhidden\b|aria-hidden/);
    expect(copiar![2]).toBe('');
    for (const region of regiones(html)) expect(region).not.toMatch(/\bhidden\b|aria-hidden/);
  });

  it('el Diálogo de Imagen toma su nombre del rótulo de su acción y trae la frase de fallo', () => {
    const html = paginas[`/cita/${SLUG}/`];
    const boton = /<button[^>]*\bid="([^"]+)"[^>]*data-abrir[^>]*>\s*([^<]*?)\s*<\/button>/.exec(html);
    expect(boton, 'el botón de la Acción Imagen no tiene id').not.toBeNull();
    expect(boton![2]).toBe('Descargar como imagen');
    // Derivado del slug, como el respaldo de Copiar: dos islas no comparten `id`.
    expect(boton![1]).toBe(`abrir-imagen-${SLUG}`);
    const dialogo = /<dialog[^>]*>/.exec(html);
    expect(dialogo, 'falta el <dialog>').not.toBeNull();
    expect(dialogo![0]).toContain(`aria-labelledby="${boton![1]}"`);
    // Un nombre fijo no seguiría al rótulo cuando el guion lo cambia a «Compartir…».
    expect(dialogo![0]).not.toContain('aria-label=');

    const fallo = /<div[^>]*data-fallo[^>]*>([\s\S]*?)<\/div>/.exec(html);
    expect(fallo, 'sin bloque de fallo del generador').not.toBeNull();
    expect(fallo![0]).toMatch(/\bhidden\b/);
    expect(fallo![1]).toContain('No se ha podido preparar la imagen.');
    expect(fallo![1]).toContain('Copiar el texto');
    // Y su región de estado vive dentro del diálogo: lo de fuera es inerte con el modal abierto.
    expect(/<dialog[\s\S]*?role="status"[\s\S]*?<\/dialog>/.test(html)).toBe(true);
  });

  it('cada destino de compartir dice «Compartir en {destino}» y avisa de la pestaña nueva', () => {
    const html = paginas[`/cita/${SLUG}/`];
    for (const destino of DESTINOS) {
      const enlace = new RegExp(`<a[^>]*data-destino="${destino.id}"[^>]*>([\\s\\S]*?)</a>`).exec(html);
      expect(enlace, destino.id).not.toBeNull();
      expect(enlace![0], destino.id).toContain('target="_blank"');
      // Lo visible es el rótulo; el aviso va dentro, en un `span` fuera de la vista.
      expect(enlace![1].replace(/<[^>]+>/g, ''), destino.id).toBe(
        `${rotuloDeDestino(destino)}${AVISO_DE_PESTAÑA_NUEVA}`,
      );
      expect(enlace![1], destino.id).toMatch(
        new RegExp(`^${rotuloDeDestino(destino)}<span class="solo-para-lectores"[^>]*>`),
      );
    }
  });

  it('`/buscar/` anuncia por una región que está desde la carga, vacía y sin `hidden`', () => {
    const [region, ...otras] = regiones(paginas['/buscar/']);
    expect(region).toBeDefined();
    expect(otras).toEqual([]);
    expect(region).not.toMatch(/\bhidden\b|aria-hidden/);
    expect(paginas['/buscar/']).toMatch(/role="status"[^>]*><\/p>/);
  });

  it('el 404 no carga guiones ni necesita región de estado', () => {
    expect(paginas['/404']).not.toMatch(/<script(?![^>]*application\/ld\+json)/);
    expect(regiones(paginas['/404'])).toEqual([]);
  });

  it('las cuentas del pie abren en la misma pestaña y conservan `rel="me"`', () => {
    for (const [ruta, html] of Object.entries(paginas)) {
      const pie = /<footer[\s\S]*?<\/footer>/.exec(html);
      expect(pie, `${ruta}: falta el <footer>`).not.toBeNull();
      const cuentas = [...pie![0].matchAll(/<a\b[^>]*\brel="me"[^>]*>/g)].map((m) => m[0]);
      expect(cuentas.length, ruta).toBeGreaterThan(0);
      for (const cuenta of cuentas) expect(cuenta, ruta).not.toContain('target=');
    }
  });
});
