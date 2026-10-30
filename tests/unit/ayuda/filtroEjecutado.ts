import { join } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { expect } from 'vitest';
import { aplanar } from './aplanar.ts';
import { normalizar } from '../../../src/lib/normalizar.ts';
import {
  fraseDelFiltro,
  rutaDeBuscarEnLasCitas,
  textoDeBuscarEnLasCitas,
  type DirectorioFiltrable,
} from '../../../src/lib/filtroDelDirectorio.ts';
import { PAUSA_DE_TECLEO_MS } from '../../../src/lib/umbrales.ts';

/**
 * El guion del filtro de los Directorios, ejecutado — Historia 26.6.
 *
 * Las pruebas de `filtro-del-directorio.test.ts` juzgan la decisión pura y las de
 * `tests/e2e/filtro-del-directorio.spec.ts` el navegador, pero esas no las corre el CI. Esto es lo
 * que queda en medio y sí corre con `npm test`: el guion **construido** —el fichero de `/_astro/`
 * que pide la página— ejecutado en `node:vm` contra un DOM de mentira con la forma del `dist/` de
 * la prueba, como `tests/unit/ayuda/busqueda.ts` ejecuta la isla de `/buscar/`. Así una regresión
 * del pegamento —el modelo leído del DOM, el `hidden` puesto por posición, las letras y los
 * «Volver», la sombra que guarda el alto del recuento, el enlace a cero, la región que no se
 * escribe— sale en rojo sin un navegador.
 *
 * El DOM sale del HTML construido, y leerlo **es** la otra mitad: el contrato de marcado del que
 * vive el guion. En `/autores/`, cada `li.fila-de-bloque` con su `span.nombre`; en `/obras/`, cada
 * `section.autor` con un `h3` que solo lleva el enlace del Autor y cada `.lista-de-obras > li` con
 * el título como primer nodo de texto de `span.titulo`. Si el marcado deja de tener esa forma, la
 * lectura falla aquí nombrando qué falta, en vez de dejar un filtro que no casa con nada.
 *
 * El entorno lleva lo que el guion usa y nada más: un selector que no sabe interpretar **lanza**,
 * para que un guion que empiece a pedir otra cosa no pase en verde contra un entorno que no la
 * sabe; los globales son `document`, `setTimeout`/`clearTimeout` con un reloj que solo avanza a mano
 * y los de JavaScript. Lo esperado se calcula con `normalizar` sobre lo leído, sin `filtroDe`.
 */

/** Un nodo de texto. */
class Texto {
  parentElement: Elemento | null = null;
  constructor(public nodeValue: string) {}
  get textContent(): string {
    return this.nodeValue;
  }
  cloneNode(): Texto {
    return new Texto(this.nodeValue);
  }
}

type Nodo = Elemento | Texto;

/** Una parte de un selector compuesto: etiqueta, clases, id y atributos. */
interface Compuesto {
  etiqueta?: string;
  clases: string[];
  id?: string;
  atributos: [string, string | undefined][];
}

function compuesto(texto: string): Compuesto {
  const forma = /^([a-z][a-z0-9]*)?((?:[.#][\w-]+|\[[\w-]+(?:="[^"]*")?\])*)$/u.exec(texto);
  if (forma === null || texto === '') throw new Error(`el entorno no sabe el selector «${texto}»`);
  const c: Compuesto = { etiqueta: forma[1], clases: [], atributos: [] };
  for (const [parte] of forma[2].matchAll(/[.#][\w-]+|\[[^\]]+\]/gu)) {
    if (parte.startsWith('.')) c.clases.push(parte.slice(1));
    else if (parte.startsWith('#')) c.id = parte.slice(1);
    else {
      const [, nombre, valor] = /^\[([\w-]+)(?:="([^"]*)")?\]$/u.exec(parte)!;
      c.atributos.push([nombre, valor]);
    }
  }
  return c;
}

/** `a b` y `a > b`, sin más combinadores. */
function selector(texto: string): { partes: Compuesto[]; hijo: boolean[] } {
  if (/[,~+*:]/u.test(texto)) throw new Error(`el entorno no sabe el selector «${texto}»`);
  const tokens = texto.trim().replace(/\s*>\s*/gu, ' > ').split(/\s+/u);
  const partes: Compuesto[] = [];
  const hijo: boolean[] = [];
  let siguienteEsHijo = false;
  for (const token of tokens) {
    if (token === '>') {
      siguienteEsHijo = true;
      continue;
    }
    if (partes.length > 0) hijo.push(siguienteEsHijo);
    partes.push(compuesto(token));
    siguienteEsHijo = false;
  }
  return { partes, hijo };
}

class Elemento {
  readonly hijos: Nodo[] = [];
  parentElement: Elemento | null = null;
  value = '';
  /** Cuántas veces se le ha escrito `textContent`. */
  escrituras = 0;
  readonly content: Elemento | undefined;
  private readonly atributos = new Map<string, string>();
  private readonly escuchas = new Map<string, ((evento: { isComposing: boolean }) => void)[]>();

  constructor(
    readonly tagName: string,
    atributos: Record<string, string> = {},
    hijos: (Nodo | string)[] = [],
    contenido?: (Nodo | string)[],
  ) {
    for (const [nombre, valor] of Object.entries(atributos)) this.atributos.set(nombre, valor);
    this.append(...hijos);
    if (contenido !== undefined) this.content = new Elemento('#fragmento', {}, contenido);
  }

  getAttribute(nombre: string): string | null {
    return this.atributos.get(nombre) ?? null;
  }
  setAttribute(nombre: string, valor: string): void {
    this.atributos.set(nombre, String(valor));
  }
  hasAttribute(nombre: string): boolean {
    return this.atributos.has(nombre);
  }
  removeAttribute(nombre: string): void {
    this.atributos.delete(nombre);
  }
  toggleAttribute(nombre: string, poner?: boolean): boolean {
    const si = poner ?? !this.hasAttribute(nombre);
    if (si) this.setAttribute(nombre, '');
    else this.removeAttribute(nombre);
    return si;
  }
  get hidden(): boolean {
    return this.hasAttribute('hidden');
  }
  set hidden(valor: boolean) {
    this.toggleAttribute('hidden', Boolean(valor));
  }
  get href(): string {
    return this.getAttribute('href') ?? '';
  }
  set href(valor: string) {
    this.setAttribute('href', valor);
  }
  get dataset(): Record<string, string> {
    const datos: Record<string, string> = {};
    for (const [nombre, valor] of this.atributos) {
      if (nombre.startsWith('data-')) datos[nombre.slice(5).replace(/-([a-z])/gu, (_, l: string) => l.toUpperCase())] = valor;
    }
    return datos;
  }
  get firstChild(): Nodo | null {
    return this.hijos[0] ?? null;
  }
  get textContent(): string {
    return this.hijos.map((h) => h.textContent).join('');
  }
  set textContent(valor: string) {
    this.escrituras++;
    for (const h of this.hijos.splice(0)) h.parentElement = null;
    if (valor !== '') this.append(String(valor));
  }

  append(...nodos: (Nodo | string)[]): void {
    for (const nodo of nodos) this.insertBefore(typeof nodo === 'string' ? new Texto(nodo) : nodo, null);
  }
  insertBefore(nodo: Nodo, referencia: Nodo | null): void {
    if (nodo.parentElement !== null) {
      const hermanos = nodo.parentElement.hijos;
      hermanos.splice(hermanos.indexOf(nodo), 1);
    }
    const i = referencia === null ? this.hijos.length : this.hijos.indexOf(referencia);
    if (i < 0) throw new Error('insertBefore: la referencia no es hija');
    this.hijos.splice(i, 0, nodo);
    nodo.parentElement = this;
  }
  after(nodo: Nodo): void {
    const padre = this.parentElement!;
    padre.insertBefore(nodo, padre.hijos[padre.hijos.indexOf(this) + 1] ?? null);
  }
  cloneNode(profundo = false): Elemento {
    const copia = new Elemento(this.tagName, Object.fromEntries(this.atributos));
    if (profundo) copia.append(...this.hijos.map((h) => h.cloneNode(true)));
    return copia;
  }

  addEventListener(tipo: string, escucha: (evento: { isComposing: boolean }) => void): void {
    this.escuchas.set(tipo, [...(this.escuchas.get(tipo) ?? []), escucha]);
  }
  /** Dispara un evento, como un `input` del navegador: compuesto o no. */
  disparar(tipo: string, isComposing = false): void {
    for (const escucha of this.escuchas.get(tipo) ?? []) escucha({ isComposing });
  }
  /** Los tipos con alguna escucha. */
  escuchados(): string[] {
    return [...this.escuchas.keys()];
  }

  private descendientes(): Elemento[] {
    return this.hijos.flatMap((h) => (h instanceof Elemento ? [h, ...h.descendientes()] : []));
  }
  private casa(c: Compuesto): boolean {
    if (c.etiqueta !== undefined && c.etiqueta !== this.tagName) return false;
    if (c.id !== undefined && this.getAttribute('id') !== c.id) return false;
    const clases = (this.getAttribute('class') ?? '').split(/\s+/u);
    if (!c.clases.every((k) => clases.includes(k))) return false;
    return c.atributos.every(([n, v]) => (v === undefined ? this.hasAttribute(n) : this.getAttribute(n) === v));
  }
  private casaCon(partes: Compuesto[], hijo: boolean[], i: number): boolean {
    if (!this.casa(partes[i])) return false;
    if (i === 0) return true;
    if (hijo[i - 1]) return this.parentElement?.casaCon(partes, hijo, i - 1) ?? false;
    for (let a = this.parentElement; a !== null; a = a.parentElement) if (a.casaCon(partes, hijo, i - 1)) return true;
    return false;
  }
  querySelectorAll(texto: string): Elemento[] {
    const { partes, hijo } = selector(texto);
    return this.descendientes().filter((d) => d.casaCon(partes, hijo, partes.length - 1));
  }
  querySelector(texto: string): Elemento | null {
    return this.querySelectorAll(texto)[0] ?? null;
  }
}

const el = (etiqueta: string, atributos: Record<string, string> = {}, hijos: (Nodo | string)[] = []) =>
  new Elemento(etiqueta, atributos, hijos);

function decodificar(texto: string): string {
  return texto
    .replace(/&#x([0-9a-f]+);/giu, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/gu, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/gu, '"')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&amp;/gu, '&');
}

/** Lo leído del HTML: por grupo, sus bloques; por bloque, la cabecera y las filas. */
interface Leido {
  grupos: { cabecera?: string; filas: string[] }[][];
}

/** Trozos de `html` que empiezan en cada aparición de `inicio`. */
function trozos(html: string, inicio: string): string[] {
  const partes = html.split(inicio).slice(1);
  return partes.map((p) => inicio + p);
}

/** Construye el DOM de mentira con la forma del Directorio construido, y dice qué leyó. */
function construir(html: string, directorio: DirectorioFiltrable): { documento: Elemento; leido: Leido } {
  const filtro = /<div class="filtro" data-filtro="([a-z]+)" data-buscar="([^"]*)"/u.exec(html);
  expect(filtro, 'sin contenedor del filtro').not.toBeNull();
  expect(filtro![1]).toBe(directorio);
  const plantilla = /<template\b[^>]*>([\s\S]*?)<\/template>/u.exec(html)![1];
  expect(plantilla, 'la plantilla no trae el campo').toMatch(/<div class="campo"[^>]*>[\s\S]*<input\b/u);
  expect(plantilla, 'la plantilla no trae la sombra del recuento').toMatch(/<p class="sombra" aria-hidden="true"[^>]*><\/p>/u);
  expect(plantilla, 'la plantilla no trae el enlace a cero').toMatch(/<p class="a-cero" data-zona="directorio" hidden[^>]*><a\b/u);

  const inicioDelListado = html.indexOf('<div class="listado"');
  const listadoHtml = html.slice(inicioDelListado, html.indexOf('</main>', inicioDelListado));
  const leido: Leido = { grupos: [] };
  const grupos: Elemento[] = [];
  for (const grupoHtml of trozos(listadoHtml, '<section class="grupo"')) {
    const bloques: { cabecera?: string; filas: string[] }[] = [];
    const hijos: Elemento[] = [el('h2', {}, ['?'])];
    if (directorio === 'autores') {
      const filas = trozos(grupoHtml, '<li').map((li) => {
        expect(li, 'una fila de /autores/ no es `li.fila-de-bloque`').toMatch(/^<li class="fila-de-bloque"/u);
        const nombre = /<span class="nombre"[^>]*>([^<]*)<\/span>/u.exec(li.slice(0, li.indexOf('</li>')));
        expect(nombre, `una fila de /autores/ sin \`span.nombre\`: ${li.slice(0, 160)}`).not.toBeNull();
        expect(nombre![1].trim(), 'un `span.nombre` vacío').not.toBe('');
        return decodificar(nombre![1]);
      });
      bloques.push({ filas });
      hijos.push(
        el(
          'ul',
          {},
          filas.map((nombre) =>
            el('li', { class: 'fila-de-bloque', 'data-zona': 'directorio' }, [
              el('a', { href: '/autor/x/' }, [
                el('span', {}, [
                  el('span', { class: 'nombre' }, [nombre]),
                  el('span', { class: 'solo-para-lectores' }, [', ']),
                  el('span', { class: 'hechos' }, ['1900–1950 · 3 citas']),
                ]),
              ]),
            ]),
          ),
        ),
      );
    } else {
      for (const autorHtml of trozos(grupoHtml, '<section class="autor"')) {
        const cabecera = /^<section class="autor"[^>]*><h3\b[^>]*><a\b[^>]*>([^<]*)<\/a><\/h3>/u.exec(autorHtml);
        expect(cabecera, `un Autor de /obras/ cuyo h3 no es solo su enlace: ${autorHtml.slice(0, 200)}`).not.toBeNull();
        const lista = /<ul class="lista-de-obras"[^>]*>([\s\S]*?)<\/ul>/u.exec(autorHtml);
        expect(lista, 'un Autor de /obras/ sin `.lista-de-obras`').not.toBeNull();
        const filas = trozos(lista![1], '<li').map((li) => {
          const titulo = /<span class="titulo"[^>]*>([^<]*)/u.exec(li);
          expect(titulo, `una Obra sin \`span.titulo\`: ${li.slice(0, 160)}`).not.toBeNull();
          expect(titulo![1].trim(), `el título no es el primer nodo de texto de \`.titulo\`: ${li.slice(0, 200)}`).not.toBe('');
          return decodificar(titulo![1]);
        });
        const nombre = decodificar(cabecera![1]);
        bloques.push({ cabecera: nombre, filas });
        hijos.push(
          el('section', { class: 'autor' }, [
            el('h3', { 'data-zona': 'directorio' }, [el('a', { href: '/autor/x/' }, [nombre])]),
            el(
              'ul',
              { class: 'lista-de-obras', 'data-zona': 'directorio' },
              filas.map((titulo) =>
                el('li', {}, [
                  el('a', { href: '/obra/x/y/' }, [
                    el('span', { class: 'titulo' }, [
                      titulo,
                      el('span', { 'aria-hidden': 'true' }, [' · ']),
                      el('span', { class: 'oculto' }, [', ']),
                      '1902',
                    ]),
                    el('span', { class: 'recuento' }, [el('span', { class: 'oculto' }, [', ']), '3 citas']),
                  ]),
                ]),
              ),
            ),
          ]),
        );
      }
    }
    expect(grupoHtml, 'un grupo sin «Volver a las letras»').toMatch(/<p class="volver"/u);
    hijos.push(el('p', { class: 'volver' }, [el('a', { href: '#letras' }, ['Volver a las letras'])]));
    leido.grupos.push(bloques);
    grupos.push(el('section', { class: 'grupo' }, hijos));
  }
  expect(grupos.length, 'el listado no tiene grupos').toBeGreaterThan(0);
  expect(listadoHtml, 'el listado no tiene letras').toMatch(/<nav id="letras"/u);

  const contenido = [
    el('div', { class: 'campo' }, [
      el('div', { class: 'campo-de-busqueda' }, [el('label', { for: 'f' }, ['…']), el('input', { id: 'f', type: 'search' })]),
    ]),
    el('p', { class: 'sombra', 'aria-hidden': 'true' }),
    el('p', { class: 'a-cero', 'data-zona': 'directorio', hidden: '' }, [el('a')]),
  ];
  const raiz = el('div', { class: 'filtro', 'data-filtro': filtro![1], 'data-buscar': decodificar(filtro![2]), 'data-pagefind-ignore': 'all' }, [
    new Elemento('template', {}, [], contenido),
    el('p', { class: 'recuento', role: 'status' }),
  ]);
  const documento = el('#documento', {}, [
    el('main', {}, [
      el('div', { class: 'prosa' }, [
        el('h1', {}, ['Directorio']),
        raiz,
        el('div', { class: 'listado', 'data-pagefind-ignore': 'all' }, [el('nav', { id: 'letras', class: 'letras' }), ...grupos]),
      ]),
    ]),
  ]);
  return { documento, leido };
}

/**
 * El guion del filtro que pide la página, del `dist/` de `proyecto`: su fichero con los trozos que
 * importa, aplanado a guion clásico (`tests/unit/ayuda/aplanar.ts`). Desde la Historia 27.2 el
 * filtro comparte con la búsqueda un trozo —los ritmos de `anuncio.ts` y los recuentos— que el
 * empaquetado saca aparte.
 */
export function guionDelFiltro(proyecto: string, html: string): string {
  const src = /<script type="module" src="(\/_astro\/FiltroDelDirectorio[^"]+\.js)"/u.exec(html);
  expect(src, 'la página no pide el filtro').not.toBeNull();
  return aplanar(join(proyecto, 'dist'), src![1]);
}

/**
 * Ejecuta el guion construido contra el DOM del Directorio construido y juzga lo que hace con
 * cada consulta: qué oculta, las letras y los «Volver», la marca del renglón de la región, el
 * sombra del recuento, el enlace a cero y la frase, que llega tras la pausa y no antes y no se
 * reescribe igual.
 */
export function comprobarFiltroEjecutado(html: string, guion: string, directorio: DirectorioFiltrable): void {
  // Aplanado, sin importaciones: se ejecuta como guion clásico.
  expect(guion, 'el guion del filtro importa o exporta: el entorno no lo sabe ejecutar').not.toMatch(/^\s*(?:import|export)\b|\bimport\s*\(/mu);
  const { documento, leido } = construir(html, directorio);

  let ahora = 0;
  let siguiente = 1;
  const temporizadores = new Map<number, { cuando: number; hacer: () => void }>();
  const avanzar = (ms: number) => {
    const hasta = ahora + ms;
    for (;;) {
      const vencido = [...temporizadores.entries()].filter(([, t]) => t.cuando <= hasta).sort((a, b) => a[1].cuando - b[1].cuando)[0];
      if (vencido === undefined) break;
      temporizadores.delete(vencido[0]);
      ahora = vencido[1].cuando;
      vencido[1].hacer();
    }
    ahora = hasta;
  };
  const contexto = createContext({
    document: { querySelector: (s: string) => documento.querySelector(s), querySelectorAll: (s: string) => documento.querySelectorAll(s) },
    setTimeout: (hacer: () => void, ms = 0) => {
      const id = siguiente++;
      temporizadores.set(id, { cuando: ahora + ms, hacer });
      return id;
    },
    clearTimeout: (id?: number) => {
      if (id !== undefined) temporizadores.delete(id);
    },
  });
  runInContext(guion, contexto);

  const raiz = documento.querySelector('[data-filtro]')!;
  const region = raiz.querySelector('[role="status"]')!;
  const entrada = raiz.querySelector('input');
  expect(entrada, 'el guion no insertó el campo').not.toBeNull();
  const hijosDeRaiz = raiz.hijos.filter((h): h is Elemento => h instanceof Elemento).map((h) => h.getAttribute('class') ?? h.tagName);
  expect(hijosDeRaiz, 'el campo y la sombra antes de la región, y el enlace a cero después').toEqual([
    'template',
    'campo',
    'sombra',
    'recuento',
    'a-cero',
  ]);
  const sombra = raiz.querySelector('.sombra')!;
  expect(entrada!.escuchados()).toEqual(['input', 'compositionend']);
  expect(region.textContent).toBe('');

  const listado = documento.querySelector('.listado')!;
  const letras = listado.querySelector('#letras')!;
  const volveres = listado.querySelectorAll('p.volver');
  const grupos = listado.querySelectorAll('section.grupo');
  const aCero = raiz.querySelector('.a-cero')!;
  const enlace = aCero.querySelector('a')!;
  const filasDe = (grupo: Elemento) =>
    directorio === 'autores'
      ? [grupo.querySelectorAll('li.fila-de-bloque')]
      : grupo.querySelectorAll('section.autor').map((a) => a.querySelectorAll('.lista-de-obras > li'));
  const total = leido.grupos.flat().reduce((n, b) => n + b.filas.length, 0);

  const teclear = (texto: string) => {
    entrada!.value = texto;
    entrada!.disparar('input');
  };

  /** Lo que se espera con `texto`, calculado con `normalizar` sobre lo leído, sin `filtroDe`. */
  const juzgar = (texto: string) => {
    const n = normalizar(texto);
    const vacia = n === '';
    let quedan = 0;
    leido.grupos.forEach((bloques, g) => {
      const filasDelGrupo = filasDe(grupos[g]);
      let grupoVisible = false;
      bloques.forEach((bloque, b) => {
        const porCabecera = vacia || (bloque.cabecera !== undefined && normalizar(bloque.cabecera).includes(n));
        const visibles = bloque.filas.map((f) => porCabecera || normalizar(f).includes(n));
        visibles.forEach((v, f) => expect(filasDelGrupo[b][f].hidden, `«${texto}»: ${bloque.filas[f]}`).toBe(!v));
        const bloqueVisible = visibles.some(Boolean);
        if (directorio === 'obras') {
          expect(grupos[g].querySelectorAll('section.autor')[b].hidden, `«${texto}»: ${bloque.cabecera}`).toBe(!bloqueVisible);
        }
        grupoVisible ||= bloqueVisible;
        quedan += visibles.filter(Boolean).length;
      });
      expect(grupos[g].hidden, `«${texto}»: el grupo ${g}`).toBe(!grupoVisible);
    });
    expect(letras.hidden, `«${texto}»: las letras`).toBe(!vacia);
    for (const volver of volveres) expect(volver.hidden, `«${texto}»: un «Volver»`).toBe(!vacia);
    // La sombra lleva ya la frase que la región escribirá tras la pausa: guarda su alto.
    expect(sombra.textContent, `«${texto}»: la sombra del recuento`).toBe(vacia ? '' : fraseDelFiltro(directorio, quedan, texto));
    const aCeroVisible = !vacia && quedan === 0;
    expect(aCero.hidden, `«${texto}»: el enlace a cero`).toBe(!aCeroVisible);
    if (aCeroVisible) {
      expect(enlace.textContent).toBe(textoDeBuscarEnLasCitas(texto));
      expect(enlace.getAttribute('href')).toBe(rutaDeBuscarEnLasCitas(raiz.dataset.buscar, texto));
    } else {
      expect(enlace.hasAttribute('href'), `«${texto}»: el enlace a cero conserva su href`).toBe(false);
    }
    return { vacia, quedan };
  };

  // Consultas sacadas de lo leído: una fila entera en mayúsculas y sin tildes, un trozo de dentro
  // de una palabra, una cabecera en `/obras/`, una que no casa con nada y lo hostil.
  const filas = leido.grupos.flat().flatMap((b) => b.filas);
  const larga = filas.find((f) => normalizar(f).length >= 6) ?? filas[0];
  const consultas = [
    normalizar(larga).toUpperCase(),
    normalizar(larga).slice(1, 4),
    ...(directorio === 'obras' ? [leido.grupos.flat()[0].cabecera!] : []),
    'qqqqzzzz',
    '<img src=x onerror="__hostil=1">',
  ];
  let alguna = false;
  for (const consulta of consultas) {
    const escriturasAntes = region.escrituras;
    teclear(consulta);
    const { quedan } = juzgar(consulta);
    alguna ||= quedan > 0 && quedan < total;
    // La frase, tras la pausa y no antes.
    avanzar(PAUSA_DE_TECLEO_MS - 1);
    expect(region.escrituras, `«${consulta}»: la región se escribió antes de la pausa`).toBe(escriturasAntes);
    avanzar(1);
    const frase = fraseDelFiltro(directorio, quedan, consulta);
    expect(region.textContent, `«${consulta}»`).toBe(frase);
    // La misma consulta otra vez: la misma frase no se reescribe.
    const escrituras = region.escrituras;
    teclear(consulta);
    avanzar(PAUSA_DE_TECLEO_MS * 2);
    expect(region.escrituras, `«${consulta}»: la región se reescribió con la misma frase`).toBe(escrituras);
    expect(region.textContent).toBe(frase);
  }
  expect(alguna, 'ninguna consulta dejó una parte del listado').toBe(true);
  expect((contexto as unknown as { __hostil?: number }).__hostil).toBeUndefined();

  // Teclear y vaciar antes de la pausa: la región, vacía al momento, y la pausa pendiente, cancelada.
  teclear(consultas[0]);
  teclear('');
  expect(region.textContent).toBe('');
  avanzar(PAUSA_DE_TECLEO_MS * 2);
  expect(region.textContent).toBe('');
  juzgar('');
  // Solo signos es el campo vacío.
  teclear('  ¿? ');
  avanzar(PAUSA_DE_TECLEO_MS * 2);
  expect(region.textContent).toBe('');
  juzgar('  ¿? ');

  // Una letra a medio componer —la tecla muerta de la tilde— no filtra: el signo suelto no casa
  // con nada, y la lista no se vacía ni asoma el enlace a cero mientras llega la letra. La letra
  // compuesta filtra con `compositionend`.
  const trozo = consultas[1];
  teclear(trozo);
  entrada!.value = `${trozo}´`;
  entrada!.disparar('input', true);
  juzgar(trozo);
  entrada!.value = trozo.toUpperCase();
  entrada!.disparar('compositionend');
  juzgar(trozo.toUpperCase());
}
