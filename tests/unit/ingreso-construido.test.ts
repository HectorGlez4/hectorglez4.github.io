import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  fuenteConDonacionesEncendidas,
  limpiar,
} from './ayuda/construir.js';
import {
  MARCA_DE_INGRESO,
  MODELOS,
  modeloDe,
  modelosEn,
  modelosMarcadosEn,
} from '../../src/lib/ingreso.ts';
import { superficieDeclaradaDe } from '../../src/lib/superficies.ts';

/**
 * Historia 14.1 — lo que se comprueba sobre el sitio construido de verdad.
 *
 * Tres cosas que ninguna prueba pura puede ver, y las tres se pagan con **una sola pareja de
 * construcciones**, porque cada `astro build` cuesta segundos.
 *
 * Dos y no una: la reproducibilidad **es** la comparación de dos construcciones, así que no
 * hay forma de comprarla más barata. No se reutiliza ninguna de las de otros ficheros porque
 * ninguna se construye contra un receptor que cuente peticiones, que es lo que convierte esto
 * en una prueba de AD-14 y no en una lectura de HTML. Las tres comprobaciones comparten el
 * mismo par, que es lo que sí se podía ahorrar:
 *
 *   · **Un Modelo apagado es invisible, no latente** (UX-DR35). No basta con no renderizar:
 *     no puede haber contenedor vacío, ni clase reservada, ni marcador. Hoy los cuatro están
 *     apagados, así que se escribe una vez y protege para siempre el momento en que algo se
 *     encienda: la regla que se afirma no es «no hay marcadores» sino «lo marcado en una
 *     página está encendido y admitido ahí», que sigue siendo cierta con las donaciones ya
 *     encendidas y falsa en cuanto alguien las cuele en la Página de Cita.
 *   · **El armazón compartido no aloja ningún Modelo** (AD-20). Alojarlo ahí es una línea y
 *     aparece en todas partes, incluida la Página de Cita.
 *   · **Dos construcciones del mismo corpus dan el mismo `dist/`** (AD-14), y ninguna
 *     pregunta nada al receptor. Se construye contra un receptor de mentira que cuenta lo que
 *     le llega: si el build leyera el plano de medición, ahí se vería.
 */

const CORPUS = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'citas/seneca--a.md': citaValida({
    slug: 'seneca-a-corta',
    texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
    aptaParaPortada: true,
  }),
  'citas/seneca--b.md': citaValida({
    slug: 'seneca-b-corta',
    texto: 'La vida, si sabes usarla, es larga; nadie te la puede quitar de las manos.',
    aptaParaPortada: true,
  }),
};

/** La jornada se fija: la Cita del Día rota con el calendario y no con el estado del ingreso. */
const JORNADA = '2026-08-20';

/** El contenido de un directorio como mapa de ruta relativa a huella, recursivamente. */
async function huellaDe(directorio: string): Promise<Record<string, string>> {
  const entradas = await readdir(directorio, { recursive: true, withFileTypes: true });
  const huellas: Record<string, string> = {};
  for (const entrada of entradas) {
    if (!entrada.isFile()) continue;
    const completa = join(entrada.parentPath, entrada.name);
    const relativa = completa.slice(directorio.length + 1);
    huellas[relativa] = createHash('sha256').update(await readFile(completa)).digest('hex');
  }
  return huellas;
}

async function paginasDe(directorio: string): Promise<Record<string, string>> {
  const entradas = await readdir(directorio, { recursive: true, withFileTypes: true });
  const paginas: Record<string, string> = {};
  for (const entrada of entradas) {
    if (!entrada.isFile() || !entrada.name.endsWith('.html')) continue;
    const completa = join(entrada.parentPath, entrada.name);
    paginas[completa.slice(directorio.length + 1)] = await readFile(completa, 'utf8');
  }
  return paginas;
}

/**
 * La ruta del sitio que sirve un fichero de `dist/`.
 *
 * `astro.config.mjs` construye con `format: 'directory'` y `trailingSlash: 'always'`, así
 * que `buscar/index.html` se sirve en `/buscar/` y `index.html` en `/`. Lo que se devuelve
 * aquí va sin barra final a propósito: `rutaNormalizada` la quita antes de comparar, y así
 * esta función no tiene que saber cuál de las dos formas se anuncia. Se necesita para
 * preguntarle a
 * `src/lib/superficies.ts` de qué superficie es cada página construida, que es lo que ata lo
 * marcado en el HTML a lo declarado en el módulo del estado.
 */
function rutaDe(relativa: string): string {
  const sinExtension = relativa.replaceAll('\\', '/').replace(/\.html$/, '');
  /*
   * El `index` final se quita **a cualquier profundidad**, y no solo en la raíz.
   *
   * Escrito como `=== 'index'`, un `dist/x/index.html` daba `/x/index`,
   * `superficieDeclaradaDe` no reconocía esa ruta y la aserción generalizada de UX-DR35
   * degradaba en silencio a «aquí no se espera nada» justo para esa página — que es la forma
   * más callada posible de dejar de comprobar algo. Y ya no es hipotético: `build.format`
   * pasó a `'directory'` para que las rutas con barra final dejaran de dar 404, y desde
   * entonces **todas** las páginas son un índice anidado.
   */
  const sinIndice = sinExtension.replace(/(^|\/)index$/, '');
  return sinIndice === '' ? '/' : `/${sinIndice}`;
}

/** Los ficheros de una extensión dentro de `dist/`, por su ruta relativa. */
async function ficherosConExtension(
  directorio: string,
  extension: string,
): Promise<Record<string, string>> {
  const entradas = await readdir(directorio, { recursive: true, withFileTypes: true });
  const ficheros: Record<string, string> = {};
  for (const entrada of entradas) {
    if (!entrada.isFile() || !entrada.name.endsWith(extension)) continue;
    const completa = join(entrada.parentPath, entrada.name);
    ficheros[completa.slice(directorio.length + 1)] = await readFile(completa, 'utf8');
  }
  return ficheros;
}

/**
 * El elemento `<div>` completo que empieza en `desde`, contando anidamiento.
 *
 * Hace falta para afirmar **contención** y no orden: «el marcador aparece después de
 * `data-salida`» se cumple igual con el marcador *dentro* de ese bloque, que es justo el
 * descuido que la regla dice impedir. Con el elemento entero delante, la pregunta se puede
 * hacer bien: ¿está dentro, o no?
 */
function divDesde(html: string, desde: number): string {
  const marcas = /<div\b|<\/div>/g;
  marcas.lastIndex = desde;
  let profundidad = 0;
  let marca: RegExpExecArray | null;
  while ((marca = marcas.exec(html)) !== null) {
    profundidad += marca[0] === '</div>' ? -1 : 1;
    if (profundidad === 0) return html.slice(desde, marca.index + marca[0].length);
  }
  throw new Error('el <div> no se cierra');
}

describe('Historia 14.1 — el sitio con los cuatro Modelos apagados', () => {
  const aLimpiar: string[] = [];
  let receptor: Server;
  let endpoint = '';
  let peticiones = 0;
  let primera: Record<string, string> = {};
  let segunda: Record<string, string> = {};
  let paginas: Record<string, string> = {};
  let hojasCss: Record<string, string> = {};

  beforeAll(async () => {
    /*
     * Un receptor que no contesta nada útil y cuenta lo que le llega. Se le pasa al build como
     * `MEDICION_ENDPOINT` porque **el sitio escribe balizas**: la dirección es configuración
     * del guion que se inserta, y que esté puesta es lo que hace de esta prueba una prueba.
     * Si algún día el build preguntara al receptor «qué Modelo enciendo», este contador lo
     * vería, y las dos construcciones dejarían de coincidir en cuanto la respuesta cambiara.
     */
    receptor = createServer((_, respuesta) => {
      peticiones += 1;
      respuesta.writeHead(204).end();
    });
    await new Promise<void>((listo) => receptor.listen(0, '127.0.0.1', listo));
    const direccion = receptor.address();
    if (direccion === null || typeof direccion === 'string') throw new Error('sin puerto');
    endpoint = `http://127.0.0.1:${direccion.port}/medicion`;
    const entorno = { MEDICION_ENDPOINT: endpoint };

    const uno = await construirConCorpus(CORPUS, { jornada: JORNADA, entorno });
    aLimpiar.push(uno.proyecto);
    expect(uno.codigo, uno.salida).toBe(0);

    const dos = await construirConCorpus(CORPUS, { jornada: JORNADA, entorno });
    aLimpiar.push(dos.proyecto);
    expect(dos.codigo, dos.salida).toBe(0);

    primera = await huellaDe(join(uno.proyecto, 'dist'));
    segunda = await huellaDe(join(dos.proyecto, 'dist'));
    paginas = await paginasDe(join(uno.proyecto, 'dist'));
    hojasCss = await ficherosConExtension(join(uno.proyecto, 'dist'), '.css');
  }, 240_000);

  afterAll(async () => {
    await Promise.all(aLimpiar.splice(0).map(limpiar));
    await new Promise<void>((listo) => receptor.close(() => listo()));
  });

  it('el build no le pregunta nada al receptor — AD-14', () => {
    expect(peticiones).toBe(0);
  });

  it('y ese cero no es el de un contador que no cuenta ni un receptor que nadie mira', async () => {
    /*
     * El control positivo que le da valor al cero de arriba, que sin él pasaría igual si
     * `entorno` dejara de propagarse, si el receptor escuchara en otro puerto o si
     * `MEDICION_ENDPOINT` no llegara nunca al build. Dos mitades:
     *
     *   · la dirección **llegó** al build, y se ve en el sitio construido, porque el guion de
     *     la baliza la lleva escrita dentro (AD-13);
     *   · el contador **sabe** contar, comprobado pidiéndole algo a mano.
     */
    expect(Object.values(paginas).some((html) => html.includes(endpoint))).toBe(true);

    const antes = peticiones;
    await fetch(endpoint);
    expect(peticiones).toBe(antes + 1);
    // Y se deja como estaba, para no falsear la aserción de AD-14 si alguien la reordena.
    peticiones = antes;
  });

  it('dos construcciones del mismo corpus dan el mismo sitio, byte a byte', () => {
    // Primero los nombres, porque un fichero de más o de menos se lee mucho mejor así que
    // como una huella que no cuadra.
    expect(Object.keys(segunda).sort()).toEqual(Object.keys(primera).sort());
    expect(segunda).toEqual(primera);
  });

  it('y el sitio construido no está vacío, que es lo que haría trivial la comparación', () => {
    expect(Object.keys(paginas).length).toBeGreaterThan(3);
    for (const superficie of ['index.html', 'buscar/index.html', '404.html']) {
      expect(paginas, superficie).toHaveProperty(superficie);
    }
  });

  it('lo marcado en cada página está encendido y admitido ahí — UX-DR35', () => {
    /*
     * La regla en su forma duradera, y no «no hay marcadores».
     *
     * Escrita como un vacío fijo, esta prueba se volvía inútil el mismo día que sirviera de
     * algo: con las donaciones encendidas habría que borrarla o excluir tres superficies a
     * mano, y la promesa de que encender es el diff de una línea sería falsa. Escrita así,
     * cada página se juzga contra lo que `modelosEn` dice de **su** superficie, y sigue
     * cazando el caso que de verdad importa —un marcador colado en la Página de Cita, o uno
     * con una errata que no es ningún Modelo—.
     *
     * Hoy los cuatro están apagados, así que lo esperado es vacío en las nueve superficies y
     * la aserción dice además lo mismo por la vía tosca: ni la cadena `data-ingreso` aparece
     * en el HTML, que es lo que descarta el contenedor vacío y el comentario.
     */
    for (const [relativa, html] of Object.entries(paginas)) {
      const superficie = superficieDeclaradaDe(rutaDe(relativa));
      // Una página sin superficie declarada no puede alojar nada: nadie ha decidido que sí.
      const admitidos = superficie === undefined ? [] : modelosEn(superficie.pagina).map((m) => m.id);
      expect([...modelosMarcadosEn(html)].sort(), relativa).toEqual([...admitidos].sort());
      if (admitidos.length === 0) expect(html, relativa).not.toContain(MARCA_DE_INGRESO);
    }
  });

  it('y esa regla sabe reprobar un marcador que no toca, no solo afirmar vacíos', () => {
    /*
     * El control positivo. Hoy la aserción de arriba compara nueve vacíos contra nueve
     * vacíos, y pasaría igual si `rutaDe` devolviera basura, si `superficieDeclaradaDe` no
     * reconociera ninguna ruta o si el detector no viera un marcador. Aquí se le pone
     * delante un HTML con las donaciones marcadas en la Página de Cita —el descuido exacto
     * que la regla existe para impedir— y se comprueba que las dos mitades funcionan.
     */
    const enLaCita = superficieDeclaradaDe(rutaDe('cita/seneca-a-corta.html'));
    expect(enLaCita?.pagina).toBe('cita/[slug].astro');
    expect(modelosMarcadosEn(`<aside ${MARCA_DE_INGRESO}="donaciones"></aside>`)).toEqual([
      'donaciones',
    ]);
    // Y las tres rutas que la 14.2 sí usa se reconocen: si `rutaDe` las perdiera, la prueba
    // de arriba compararía contra `[]` también con las donaciones encendidas.
    expect(superficieDeclaradaDe(rutaDe('index.html'))?.pagina).toBe('index.astro');
    expect(superficieDeclaradaDe(rutaDe('buscar/index.html'))?.pagina).toBe('buscar.astro');
    expect(superficieDeclaradaDe(rutaDe('404.html'))?.pagina).toBe('404.astro');
  });

  it('ni queda un hueco reservado con clase o identificador de Modelo', () => {
    /*
     * Un contenedor vacío con una clase reservada —`class="ingreso"`, `id="donaciones"`— es
     * exactamente lo que UX-DR35 prohíbe: maquetar dejando sitio para lo que vendrá.
     *
     * Se mira **dentro de `class` y de `id`**, y no en el texto de la página. Buscar
     * «donaciones» en todo el HTML era una bomba de relojería: el día que una Cita, un Tema o
     * una Colección contuviera la palabra, la suite se pondría en rojo señalando a un texto
     * del Corpus que no tiene nada que ver con esto.
     */
    const nombresReservados = [...MODELOS.map((m) => m.id), 'ingreso'];
    for (const [ruta, html] of Object.entries(paginas)) {
      const valores = [...html.matchAll(/\s(?:class|id)="([^"]*)"/g)].map((c) => c[1]);
      for (const reservado of nombresReservados) {
        const culpables = valores.filter((valor) => valor.includes(reservado));
        expect(culpables, `${ruta} / ${reservado}`).toEqual([]);
      }
    }
  });

  it('el componente de la invitación no aporta hoja de estilo — UX-DR35', async () => {
    /*
     * El hueco reservado que no se ve, y la única forma de cazarlo que no depende de cómo se
     * llamen las cosas.
     *
     * **Un componente con bloque `<style>` emite sus reglas en toda página que lo importe, se
     * renderice o no.** Astro recoge los estilos por el grafo de importaciones. Con las
     * donaciones apagadas, la portada, `/buscar` y `/404` llevaban en el `<head>` la regla del
     * bloque entera —su filete, su margen y su medida— esperando a que alguien la usara, y
     * `dist/` dejaba de ser idéntico al de la rama base. Eso es maquetar dejando sitio para lo
     * que vendrá, que es exactamente lo que UX-DR35 prohíbe.
     *
     * **Esto se afirma sobre la fuente y no sobre una lista de nombres reservados**, porque la
     * lista no protege la propiedad. Un selector que no nombre a nadie —
     * `aside[data-pagefind-ignore] { border-top: … }`— deja el mismo hueco en las mismas tres
     * páginas y se cuela por cualquier barrido de palabras: se comprobó añadiéndolo, y la
     * suite entera seguía en verde. Lo que hay que poder decir es «este componente no aporta
     * hoja», y eso se lee aquí.
     */
    /*
     * Se juzga el fichero **sin sus comentarios**, por lo mismo que `tests/unit/ingreso.test.ts`
     * despoja `src/lib/ingreso.ts` antes de mirarlo: la cabecera de `Sostener.astro` explica
     * durante veinte líneas por qué no lleva bloque `<style>`, y una prueba que mirase el
     * texto crudo le prohibiría explicarse — que es exactamente el defecto que la guarda de
     * AD-20 lleva escrito unas líneas más abajo.
     */
    const sinComentarios = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '');
    const fuente = await readFile(resolve(RAIZ, 'src/components/Sostener.astro'), 'utf8');
    expect(
      sinComentarios(fuente).match(/<style[\s>]/g) ?? [],
      'Sostener.astro trae un bloque <style>',
    ).toEqual([]);

    /*
     * Los controles positivos, y hacen falta las dos mitades: que el patrón reconozca un
     * bloque —con atributos y sin ellos— y que despojar comentarios **no** se lleve por
     * delante el marcado de verdad. Sin la segunda, un `sinComentarios` demasiado glotón
     * dejaría la aserción de arriba pasando siempre.
     */
    expect(sinComentarios('<style>a{}</style>').match(/<style[\s>]/g)).toHaveLength(1);
    expect(sinComentarios('<style is:global>a{}</style>').match(/<style[\s>]/g)).toHaveLength(1);
    expect(
      sinComentarios('/* aquí se habla de <style> */<style>a{}</style>').match(/<style[\s>]/g),
    ).toHaveLength(1);
  });

  it('y en el sitio construido no hay regla reservada, ni en el `<head>` ni en ninguna hoja', () => {
    /*
     * El barrido por nombres, que ya no carga solo con la propiedad y sigue valiendo: caza al
     * despistado que escribe `.donaciones` o `#ingreso` en cualquier hoja que el navegador
     * acabe aplicando.
     *
     * Se mira **todo lo que el navegador aplica** y no solo los `<style>` del HTML: los
     * ficheros `.css` de `dist/` entran, porque una hoja externa se le escapaba entera al
     * barrido anterior. Y se comprueba además que ningún `<link rel="stylesheet">` apunte
     * fuera de `dist/`, que es la otra forma de que llegue una regla que aquí no se ha visto.
     *
     * Se buscan las tres formas: la clase, el identificador y la marca `data-ingreso` como
     * selector de atributo. Dentro de hojas y no en la página entera: «sostener» es una
     * palabra corriente en español y una Cita podría traerla, pero un selector no.
     */
    const reservados = [...MODELOS.map((m) => m.id), 'ingreso', 'sostener'];
    const bloquesDe = (html: string) =>
      [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((c) => c[1]);

    const hojas: Record<string, string> = { ...hojasCss };
    for (const [ruta, html] of Object.entries(paginas)) {
      bloquesDe(html).forEach((bloque, indice) => {
        hojas[`${ruta} · <style> ${indice}`] = bloque;
      });
    }

    // Ni el barrido mira una lista vacía: las tres superficies de la 14.2 traen hoja propia.
    for (const ruta of ['index.html', 'buscar/index.html', '404.html']) {
      expect(bloquesDe(paginas[ruta]).length, ruta).toBeGreaterThan(0);
    }

    for (const [donde, hoja] of Object.entries(hojas)) {
      for (const reservado of reservados) {
        for (const forma of [`.${reservado}`, `#${reservado}`]) {
          expect(hoja.includes(forma), `${donde} / ${forma}`).toBe(false);
        }
      }
      expect(hoja.includes(MARCA_DE_INGRESO), `${donde} / ${MARCA_DE_INGRESO}`).toBe(false);
    }

    // Y ninguna hoja enlazada se sale de `dist/`, que sería una regla que este barrido no ha
    // llegado a leer.
    for (const [ruta, html] of Object.entries(paginas)) {
      const enlazadas = [...html.matchAll(/<link\b[^>]*>/g)]
        .map((c) => c[0])
        .filter((etiqueta) => /rel=["']?stylesheet/i.test(etiqueta))
        .map((etiqueta) => /href=["']([^"']+)["']/.exec(etiqueta)?.[1] ?? '');
      for (const destino of enlazadas) {
        expect(destino, `${ruta} / hoja enlazada`).toMatch(/^\//);
        expect(hojasCss, `${ruta} / ${destino}`).toHaveProperty(destino.slice(1));
      }
    }

    // El control positivo de las tres formas, sobre una hoja de mentira.
    const conRegla = 'aside[data-ingreso]{color:red}.sostener{border-top:1px}#donaciones{}';
    expect(conRegla.includes('.sostener')).toBe(true);
    expect(conRegla.includes('#donaciones')).toBe(true);
    expect(conRegla.includes(MARCA_DE_INGRESO)).toBe(true);
  });

  it('y el detector de huecos reservados sabe encontrar uno', () => {
    // Sin esto, la aserción de arriba afirma un vacío sobre nueve superficies sin que nada
    // demuestre que el patrón ve lo que dice ver.
    const conHueco = '<div class="franja ingreso-donaciones"></div>';
    const valores = [...conHueco.matchAll(/\s(?:class|id)="([^"]*)"/g)].map((c) => c[1]);
    expect(valores.filter((v) => v.includes('ingreso'))).toHaveLength(1);
  });

  it('el armazón compartido no aloja ningún Modelo — AD-20', async () => {
    /*
     * Por el HTML y por la fuente. Por el HTML: el armazón está en todas las páginas, así que
     * un marcador suyo saldría en todas —incluida la Página de Cita— y las pruebas de arriba
     * ya lo cazan. Por la fuente: que ni el armazón ni **ningún componente** importen el
     * módulo del estado, porque la línea que alojaría ahí un Modelo es lo bastante barata
     * como para escribirse sin pensarlo.
     *
     * Se miran los `import` y no el texto crudo. `not.toContain('ingreso')` sobre el fichero
     * era laxo y frágil a la vez: no seguía a los componentes que el armazón compone —donde
     * cabría el mismo descuido— y se ponía en rojo si alguien escribía la palabra en un
     * comentario, que es justo lo que estos ficheros hacen todo el rato.
     */
    const componentes = await readdir(resolve(RAIZ, 'src/components'), { withFileTypes: true });
    for (const entrada of componentes) {
      if (!entrada.isFile()) continue;
      const fuente = await readFile(join(entrada.parentPath, entrada.name), 'utf8');
      const importados = [...fuente.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((c) => c[1]);
      expect(importados.filter((i) => /ingreso(\.ts)?$/.test(i)), entrada.name).toEqual([]);
    }
  });

  it('y quien consulta el estado son exactamente las tres superficies de la 14.2', async () => {
    /*
     * El censo de consumidores. Con los cuatro Modelos apagados estaba vacío y su comentario
     * anunciaba este momento: en cuanto alguna superficie consulta el estado, lo que hay que
     * mirar es **quién** entró — que es justo cuando un import de más en el armazón o en un
     * componente compartido pasaría inadvertido.
     *
     * Son tres y son las tres que UX-DR36 admite. No es una lista que se actualice al gusto:
     * si aparece una cuarta, o desaparece una de estas, alguien ha movido la invitación de
     * sitio y esta prueba es la que obliga a decirlo en el diff. La guarda de `src/components/`
     * —la prueba de arriba— sigue igual de estricta: `Sostener.astro` no importa este módulo,
     * recibe el destino como primitiva.
     */
    const fuentes = await readdir(resolve(RAIZ, 'src'), { recursive: true, withFileTypes: true });
    const consultan: string[] = [];
    for (const entrada of fuentes) {
      if (!entrada.isFile()) continue;
      const completa = join(entrada.parentPath, entrada.name);
      if (completa.endsWith('lib/ingreso.ts')) continue;
      // Sin la extensión también: `from '../lib/ingreso'` es válido y es justo el import de
      // más que este barrido dice vigilar.
      if (/\/ingreso(\.ts)?['"]/.test(await readFile(completa, 'utf8'))) consultan.push(completa);
    }
    const relativas = consultan.map((c) => c.slice(resolve(RAIZ).length + 1)).sort();
    expect(relativas).toEqual([
      'src/pages/404.astro',
      'src/pages/buscar.astro',
      'src/pages/index.astro',
    ]);
  });
});

/**
 * Historia 14.2 — el sitio **con las donaciones encendidas**, que es lo único que demuestra
 * la promesa central de la épica.
 *
 * El estado es configuración versionada (AD-21): no hay bandera de entorno con la que pedirle
 * a un build que encienda un Modelo, y no debe haberla. Así que la prueba hace lo mismo que
 * hará el commit del día que LC-4 se cierre —cambiar el booleano— pero sobre la **copia**
 * temporal del proyecto, y construye eso. En el repositorio las donaciones siguen apagadas.
 *
 * Lo que se afirma es el criterio de aceptación entero: con un solo cambio de una línea, las
 * tres superficies de UX-DR36 muestran la invitación, ninguna otra la muestra, y no hizo falta
 * tocar ningún otro fichero.
 */
describe('Historia 14.2 — el sitio con las donaciones encendidas', () => {
  const aLimpiar: string[] = [];
  let paginas: Record<string, string> = {};

  /** Las tres superficies de no lectura que UX-DR36 admite, por su fichero en `dist/`. */
  const ADMITIDAS = ['index.html', 'buscar/index.html', '404.html'];

  beforeAll(async () => {
    const fuente = await readFile(resolve(RAIZ, 'src/lib/ingreso.ts'), 'utf8');
    /*
     * El parche es el diff que promete la épica: el `encendido` de las donaciones, y nada más.
     * Lo compone `fuenteConDonacionesEncendidas`, que acota la sustitución al tramo de ese
     * Modelo y rompe si encendiera otro —la versión con regex perezosa que había aquí casaba
     * con el `encendido: false,` del Modelo siguiente en cuanto donaciones dejara de estar
     * apagado, es decir, el día del encendido y en el CI—. Que el parche haya encontrado su
     * sitio lo hereda además cualquiera que use el gancho: `construirConCorpus` rompe si el
     * fichero que se le da es idéntico al que había.
     */
    const encendida = fuenteConDonacionesEncendidas(fuente);

    const build = await construirConCorpus(CORPUS, {
      jornada: JORNADA,
      ficheros: { 'src/lib/ingreso.ts': encendida },
    });
    aLimpiar.push(build.proyecto);
    expect(build.codigo, build.salida).toBe(0);
    paginas = await paginasDe(join(build.proyecto, 'dist'));
  }, 240_000);

  afterAll(async () => {
    await Promise.all(aLimpiar.splice(0).map(limpiar));
  });

  it('la invitación sale en la portada, en /buscar y en la 404', () => {
    for (const superficie of ADMITIDAS) {
      expect(paginas, superficie).toHaveProperty(superficie);
      expect(modelosMarcadosEn(paginas[superficie]), superficie).toEqual(['donaciones']);
    }
  });

  it('y en ninguna otra superficie, incluida la Página de Cita', () => {
    // La otra mitad, y la que de verdad protege el producto: encender no puede filtrar la
    // invitación a una superficie de lectura ni a un listado.
    const otras = Object.keys(paginas).filter((r) => !ADMITIDAS.includes(r));
    expect(otras.length, 'sin otras superficies la aserción sería vacía').toBeGreaterThan(3);
    for (const relativa of otras) {
      expect(modelosMarcadosEn(paginas[relativa]), relativa).toEqual([]);
      expect(paginas[relativa], relativa).not.toContain(MARCA_DE_INGRESO);
    }
  });

  it('lleva al destino que declara el Modelo, y no a uno escrito en la página', () => {
    // El destino es dato del Modelo: las tres superficies emiten el mismo, porque ninguna lo
    // conoce. Si alguna lo escribiera a mano, aquí se vería en cuanto divergiera.
    const destino = modeloDe('donaciones')?.destino;
    expect(destino).toMatch(/^https:\/\//);
    for (const superficie of ADMITIDAS) {
      expect(paginas[superficie], superficie).toContain(`href="${destino}"`);
      expect(paginas[superficie], superficie).toContain('rel="noopener noreferrer"');
    }
  });

  it('es un enlace y no un widget: ni guion nuevo, ni recurso de tercero — AD-20', () => {
    /*
     * La propiedad se garantiza por construcción y no por la casilla de un proveedor. Se
     * comprueba sobre el bloque marcado, que es todo lo que el Modelo aporta a la página:
     * dentro no puede haber ni un `<script>`, ni un `<iframe>`, ni un `<img>` o un `<link>`
     * que se traiga nada de fuera. Lo único que sale al exterior es el `href` del enlace, y
     * eso no es una petición: es una navegación que el visitante decide.
     */
    for (const superficie of ADMITIDAS) {
      const bloque = paginas[superficie].match(
        new RegExp(`<aside[^>]*${MARCA_DE_INGRESO}[\\s\\S]*?</aside>`),
      )?.[0];
      expect(bloque, superficie).toBeDefined();
      /*
       * La lista es larga a propósito: cada entrada es una vía distinta por la que el
       * navegador pediría algo a un tercero sin que el visitante lo decidiera. `srcset=`,
       * `<source>` y `<video>` traen medios; `<object>` y `<embed>` traen lo que sea; `url(`
       * cubre el `background-image` de un `style` en línea, que es la vía que **sí** queda
       * abierta desde que la presentación va en atributos.
       */
      for (const prohibido of [
        '<script',
        '<iframe',
        '<img',
        '<link',
        '<object',
        '<embed',
        '<video',
        '<source',
        'src=',
        'srcset=',
        'url(',
      ]) {
        expect(bloque, `${superficie} / ${prohibido}`).not.toContain(prohibido);
      }
      // Y el detector no está mirando una cadena vacía.
      expect(bloque?.length ?? 0, superficie).toBeGreaterThan(60);
    }
  });

  it('y es lo último de la columna, después de toda sección — UX-DR36', () => {
    /*
     * «Siempre fuera del flujo de lectura», afirmado por **contención** y no por orden de
     * aparición.
     *
     * La versión anterior comparaba posiciones —«el marcador va después de `Autores`»— y no
     * probaba nada: se cumple igual con el marcador dentro de la última sección, y `Autores`
     * era además una coincidencia de texto suelto que cualquier Cita del Corpus podría haber
     * movido. Lo que se afirma ahora es lo que se quiere: el bloque está **dentro** de la
     * columna, después de la última `</section>`, y detrás de él no queda nada más que el
     * cierre de la columna. Eso es ser el último hijo, y no admite lecturas.
     */
    for (const superficie of ADMITIDAS) {
      const html = paginas[superficie];
      const columna = divDesde(html, html.indexOf('<div class="pagina'));
      expect(columna, superficie).toContain(MARCA_DE_INGRESO);
      expect(columna.indexOf(MARCA_DE_INGRESO), superficie).toBeGreaterThan(
        columna.lastIndexOf('</section>'),
      );
      const cola = columna.slice(columna.lastIndexOf('</aside>') + '</aside>'.length);
      expect(cola.trim(), `${superficie} / detrás de la invitación`).toBe('</div>');
    }
  });

  it('y en /buscar queda fuera del bloque de salida, no dentro', () => {
    /*
     * El caso que obliga a mirar contención y no orden. `.salida` nace con `hidden` y solo se
     * muestra cuando una búsqueda no devuelve nada: dentro, la invitación existiría
     * únicamente para quien no encontró lo que buscaba, que es el peor momento posible para
     * ofrecerla. Y estaría **después** de `data-salida` en el HTML igualmente, así que la
     * comparación de posiciones daba verde sobre el descuido que dice impedir.
     */
    const html = paginas['buscar/index.html'];
    const salida = divDesde(html, html.lastIndexOf('<div', html.indexOf('data-salida')));
    expect(salida, 'no se recortó el bloque de salida').toContain('data-salida');
    expect(salida, 'la invitación está dentro del bloque de salida').not.toContain(
      MARCA_DE_INGRESO,
    );
    // Y el recorte no es una cadena cualquiera: contiene lo que `.salida` ofrece y se cierra.
    expect(salida).toContain('Prueba con menos palabras');
    expect(salida.endsWith('</div>')).toBe(true);
  });

  it('y el recortador de bloques sabe contar anidamiento, que es de lo que depende todo esto', () => {
    // Sin control positivo, las dos pruebas de arriba se apoyan en un recortador que podría
    // estar devolviendo el documento entero —y entonces «no contiene» sería falso siempre— o
    // el primer `</div>` que encuentre, y entonces «no contiene» sería cierto vacíamente.
    const html = '<p>antes</p><div class="a"><div class="b">dentro</div>cola</div><div>fuera</div>';
    expect(divDesde(html, html.indexOf('<div class="a"'))).toBe(
      '<div class="a"><div class="b">dentro</div>cola</div>',
    );
    expect(() => divDesde('<div><span>', 0)).toThrow('no se cierra');
  });
});

/**
 * Historia 14.2 — la puerta del destino, sobre el build de verdad.
 *
 * `tests/unit/ingreso.test.ts` afirma que `revisarDeclaracionDeIngreso` rechaza un Modelo
 * encendido sin destino, y eso es la función pura: no demuestra que **el build se detenga**,
 * que es la promesa entera. La revisión corre al cargar el módulo, y el módulo lo carga
 * `astro build` desde que tres páginas lo importan; si mañana ese `throw` desapareciera, o si
 * las tres páginas dejaran de importarlo, la función seguiría devolviendo su fallo, la suite
 * seguiría en verde y el sitio se publicaría con una invitación que no lleva a ninguna parte.
 *
 * Esto es lo único que ata las dos cosas, y cuesta una construcción que **falla**, que es de
 * las baratas.
 */
describe('Historia 14.2 — encender sin destino detiene la construcción', () => {
  const aLimpiar: string[] = [];
  let resultado: { codigo: number; salida: string; proyecto: string };

  beforeAll(async () => {
    const fuente = await readFile(resolve(RAIZ, 'src/lib/ingreso.ts'), 'utf8');
    // El mismo parche de encendido de arriba, y además le quitamos la línea del destino: es
    // el descuido exacto del día que alguien encienda sin haber verificado la dirección.
    const encendida = fuenteConDonacionesEncendidas(fuente).replace(
      /^\s*destino: 'https:\/\/[^']*',\n/m,
      '',
    );
    expect(encendida, 'seguía declarando un destino').not.toMatch(/^\s*destino:/m);

    resultado = await construirConCorpus(CORPUS, {
      jornada: JORNADA,
      ficheros: { 'src/lib/ingreso.ts': encendida },
    });
    aLimpiar.push(resultado.proyecto);
  }, 240_000);

  afterAll(async () => {
    await Promise.all(aLimpiar.splice(0).map(limpiar));
  });

  it('el build falla, y no publica un sitio con la invitación rota', () => {
    expect(resultado.codigo, resultado.salida).not.toBe(0);
  });

  it('y dice qué pasa y qué hacer, con el fichero que hay que tocar', () => {
    // Un build que se cae sin nombrar la causa manda a leer el volcado entero. El mensaje es
    // el que redacta `revisarDeclaracionDeIngreso`, y llega hasta la terminal.
    expect(resultado.salida).toContain('no lleva a ninguna parte');
    expect(resultado.salida).toContain('src/lib/ingreso.ts');
  });
});

/**
 * El gancho con el que se construyen los dos proyectos parcheados de arriba.
 *
 * Sus dos guardas fallan en silencio si nadie las ejercita —una escribiendo sobre el
 * repositorio de verdad, la otra dejando pasar un parche que no encontró su sitio—, así que se
 * ejercitan. No cuestan ninguna construcción: las dos rompen antes de llamar a `astro`.
 */
describe('la ayuda de build — el gancho `ficheros` no escribe donde no debe', () => {
  it('una ruta que se sale del proyecto temporal se rechaza', async () => {
    // Sin esto, una clave con «..» escribiría sobre las fuentes del repositorio: una prueba
    // que ensucia el árbol real es peor que una prueba que no existe.
    for (const fuera of ['../fuera.txt', '../../src/lib/ingreso.ts', resolve(RAIZ, 'AGENTS.md')]) {
      await expect(
        construirConCorpus(CORPUS, { ficheros: { [fuera]: 'lo que sea' } }),
        fuera,
      ).rejects.toThrow('se sale del proyecto temporal');
    }
  });

  it('y un parche idéntico al fichero que ya había también', async () => {
    // La forma silenciosa de que una prueba mienta: la sustitución no encuentra su sitio, el
    // proyecto se construye igual que sin parche, y la prueba afirma en verde lo contrario de
    // lo que cree medir.
    const fuente = await readFile(resolve(RAIZ, 'src/lib/ingreso.ts'), 'utf8');
    await expect(
      construirConCorpus(CORPUS, { ficheros: { 'src/lib/ingreso.ts': fuente } }),
    ).rejects.toThrow('no encontró su sitio');
  });

  it('y un parche legítimo sí se acepta, que es la otra mitad', async () => {
    // El control positivo de las dos de arriba: sin él, un gancho que rechazara siempre las
    // dejaría pasando y rompería en silencio las pruebas que de verdad construyen.
    const fuente = await readFile(resolve(RAIZ, 'src/lib/ingreso.ts'), 'utf8');
    const build = await construirConCorpus(CORPUS, {
      jornada: JORNADA,
      ficheros: { 'src/lib/ingreso.ts': `${fuente}\n// un comentario de más\n` },
    });
    try {
      expect(build.codigo, build.salida).toBe(0);
    } finally {
      await limpiar(build.proyecto);
    }
  }, 240_000);
});

/**
 * El parche del encendido, que es el otro ayudante compartido — y el que tenía fecha.
 *
 * La sustitución vivía copiada en tres ficheros como
 * `/(id: 'donaciones',[\s\S]*?)encendido: false,/`, sin acotar al bloque de donaciones. Con el
 * Modelo apagado casa con su propio booleano y acierta; **encendido, la coincidencia perezosa
 * salta al Modelo siguiente** y la prueba construye un sitio con afiliación encendida creyendo
 * medir donaciones. Este fichero lo corre el CI, así que el fallo habría aparecido en el commit
 * del encendido y hablando de otra cosa.
 *
 * Se ejercita sobre censos de mentira escritos aquí: lo que se comprueba es la sustitución, y
 * atarla al censo real la dejaría verde el día en que el censo cambie. No cuesta ninguna
 * construcción.
 */
describe('la ayuda de build — el parche del encendido no puede encender a otro', () => {
  /** Un censo con la forma que importa: donaciones primero y otro Modelo apagado detrás. */
  function censo(encendidoDeDonaciones: boolean): string {
    return [
      'export const MODELOS = [',
      "  {",
      "    id: 'donaciones',",
      `    encendido: ${encendidoDeDonaciones},`,
      "    destino: 'https://ko-fi.com/x',",
      '  },',
      '  {',
      "    id: 'afiliacion-de-libros',",
      '    encendido: false,',
      '  },',
      '];',
    ].join('\n');
  }

  it('enciende donaciones y deja al Modelo siguiente como estaba', () => {
    const parcheado = fuenteConDonacionesEncendidas(censo(false));
    expect(parcheado).toContain("id: 'donaciones',\n    encendido: true,");
    expect(parcheado).toContain("id: 'afiliacion-de-libros',\n    encendido: false,");
    expect(parcheado.match(/encendido: true,/g) ?? []).toHaveLength(1);
  });

  it('con las donaciones ya encendidas lo dice, en vez de encender a su vecino', () => {
    // El caso con fecha: es exactamente el árbol del día que LC-4 se cierre.
    expect(() => fuenteConDonacionesEncendidas(censo(true))).toThrow(
      'ya están encendidas en el árbol',
    );
  });

  it('y si el bloque no está, no parchea a ciegas', () => {
    expect(() => fuenteConDonacionesEncendidas("export const MODELOS = [{ id: 'otro' }];")).toThrow(
      'No hay ningún',
    );
  });

  it('sobre el censo de verdad, el único encendido de más es donaciones', async () => {
    // El control positivo contra el fichero que se parchea de verdad: si el censo real cambia
    // de forma —otro orden, otro sangrado, un `id` renombrado—, esto se entera aquí y no en
    // una construcción de cuatro minutos.
    const fuente = await readFile(resolve(RAIZ, 'src/lib/ingreso.ts'), 'utf8');
    const parcheado = fuenteConDonacionesEncendidas(fuente);
    expect(modelosEncendidosEn(parcheado)).toEqual(['donaciones']);
  });

  /** Qué Modelos declara encendidos una fuente de `ingreso.ts`, leyendo tramo por tramo. */
  function modelosEncendidosEn(fuente: string): string[] {
    const encendidos: string[] = [];
    const ids = [...fuente.matchAll(/id: '([a-z-]+)',/g)];
    for (const [indice, coincidencia] of ids.entries()) {
      const desde = coincidencia.index!;
      const hasta = ids[indice + 1]?.index ?? fuente.length;
      if (fuente.slice(desde, hasta).includes('encendido: true,')) encendidos.push(coincidencia[1]);
    }
    return encendidos;
  }
});
