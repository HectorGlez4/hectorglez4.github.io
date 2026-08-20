import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { AUTOR_VALIDO, RAIZ, TEMA_VALIDO, citaValida, construirConCorpus, limpiar } from './ayuda/construir.js';
import { MARCA_DE_INGRESO, MODELOS, modelosMarcadosEn } from '../../src/lib/ingreso.ts';

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

describe('Historia 14.1 — el sitio con los cuatro Modelos apagados', () => {
  const aLimpiar: string[] = [];
  let receptor: Server;
  let endpoint = '';
  let peticiones = 0;
  let primera: Record<string, string> = {};
  let segunda: Record<string, string> = {};
  let paginas: Record<string, string> = {};

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
    for (const superficie of ['index.html', 'buscar.html', '404.html']) {
      expect(paginas, superficie).toHaveProperty(superficie);
    }
  });

  it('ninguna superficie muestra hueco, marcador ni espacio reservado — UX-DR35', () => {
    /*
     * La regla en su forma duradera: lo marcado en una página tiene que estar encendido y
     * admitido ahí. Hoy no hay ningún Modelo encendido, así que la lista admitida está vacía
     * en todas las superficies y cualquier marcador la incumple.
     */
    for (const [ruta, html] of Object.entries(paginas)) {
      expect(modelosMarcadosEn(html), ruta).toEqual([]);
      expect(html, ruta).not.toContain(MARCA_DE_INGRESO);
    }
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

  it('y ninguna superficie del sitio lo consulta todavía, que es lo coherente con apagado', async () => {
    /*
     * Con los cuatro apagados nadie tiene por qué preguntarle nada al módulo del estado. No es
     * una prohibición: es el contador de quién lo consulta. El día que la 14.2 encienda las
     * donaciones esta lista deja de estar vacía, y entonces conviene mirar **quién** entró —
     * que es justo el momento en que un import de más en el armazón pasaría inadvertido.
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
    expect(consultan).toEqual([]);
  });
});
