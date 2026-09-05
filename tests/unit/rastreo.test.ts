import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import { rutasPublicadas, type ConjuntoPublicable } from '../../src/lib/publicado.ts';
import { MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';
import { DOMINIO } from '../../src/lib/dominio.ts';
import {
  CABECERA_DE_PETICIONES,
  CABECERA_DE_INDEXACION,
  FICHERO_DE_PETICIONES,
  fechaLocal,
  leerPeticionesDeRastreo,
  registrarPeticionesDeRastreo,
  rutasDelCorpus,
} from '../../tools/lib/corpus.ts';
import { censoPorFamilia } from '../../tools/lib/indexacion.ts';
import {
  PRIMERA_JORNADA_ANOTABLE,
  TOPE_DE_LA_PETICION,
  componerPeticiones,
  destinoDePeticion,
  familiaDeRuta,
  lineasDeRegistro,
  peticionesFueraDelCenso,
  repartoPorFamilia,
} from '../../tools/lib/rastreo.ts';
import { conjuntoDelCorpus } from '../../tools/indexacion.ts';
import { principal } from '../../tools/rastreo.ts';

const RAIZ = resolve(import.meta.dirname, '../..');

/**
 * Historia 18.3 — el registro de lo que se pidió, entero.
 *
 * La matriz de la historia son seis situaciones y las seis se recorren aquí: anotar una
 * petición, la misma URL otro día, una URL que el sitio no publica, un lote de más que una
 * decena, consultar sin anotar, y el cruce con la serie por familia.
 *
 * Lo que atraviesa todas: **el registro solo añade**. Es lo contrario de su vecina, la serie
 * de indexación, que reemplaza por fecha porque mide un estado. Aquí se registran actos, y
 * dos peticiones de la misma URL en días distintos son dos hechos.
 */

const temporales: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  const { rm } = await import('node:fs/promises');
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

// ─── Un corpus de verdad en disco, del que sale el conjunto publicable ───────────────

async function corpusConCitas(cuantas: number): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-rastreo-'));
  temporales.push(raiz);
  const corpus = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', 'colecciones']) {
    await mkdir(join(corpus, dir), { recursive: true });
  }
  await writeFile(
    join(corpus, 'autores', 'autor-0.yml'),
    'nombre: "Autor Cero"\nañoFallecimiento: 65\nsemblanza: "Semblanza de prueba."\ntradicion: "peninsular"\n',
    'utf8',
  );
  await writeFile(join(corpus, 'temas', 'la-vida.yml'), 'nombre: "La vida"\n', 'utf8');
  for (let i = 0; i < cuantas; i += 1) {
    await writeFile(
      join(corpus, 'citas', `cita-${i}.md`),
      [
        '---',
        `slug: "cita-${i}"`,
        `texto: "Texto de prueba número ${i}."`,
        'autor: "autor-0"',
        'temas:',
        '  - la-vida',
        '---',
        '',
      ].join('\n'),
      'utf8',
    );
  }
  return corpus;
}

/** Silencia y recoge lo que la orden imprime, para poder afirmar sobre ello. */
function capturarSalida() {
  const salida: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((texto) => {
    salida.push(String(texto));
    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation((texto) => {
    salida.push(String(texto));
    return true;
  });
  return salida;
}

const HOY = '2026-09-05';
const AYER = '2026-09-04';

/** Un conjunto publicable a mano, para validar sin fabricar un corpus en disco. */
const PUBLICADAS = ['/', '/cita/una-cita/', '/autor/autor-0/', '/tema/la-vida/'];

// ─── Componer: la única puerta que se puede equivocar ────────────────────────────────

describe('componer una petición', () => {
  it('anota la URL y la fecha, y nada más: es todo lo que hace falta para cruzarla', () => {
    const salida = componerPeticiones({
      seleccion: ['/autor/autor-0/'],
      publicadas: PUBLICADAS,
      fecha: AYER,
      hoy: HOY,
    });

    expect(salida.ok).toBe(true);
    if (!salida.ok) return;
    expect(salida.peticiones).toEqual([{ fecha: AYER, ruta: '/autor/autor-0/' }]);
  });

  it('acepta la URL entera pegada del navegador y escribe la ruta canónica del dueño', () => {
    /*
     * Se teclea lo que se pegó en Search Console, que es la dirección completa; lo que se
     * anota es la ruta, porque el dominio tiene un solo dueño y repetirlo en cada línea de
     * un fichero versionado sería un segundo sitio donde quedarse en el dominio anterior.
     */
    const salida = componerPeticiones({
      seleccion: [`https://${DOMINIO}/autor/autor-0`],
      publicadas: PUBLICADAS,
      fecha: HOY,
      hoy: HOY,
    });

    expect(salida.ok).toBe(true);
    if (!salida.ok) return;
    // Con barra final: preguntar por la forma que redirige devuelve «desconocida para Google».
    expect(salida.peticiones[0].ruta).toBe('/autor/autor-0/');
  });

  it('una URL que el sitio no publica se rechaza nombrando el motivo, y no se anota nada', () => {
    const salida = componerPeticiones({
      seleccion: ['/autor/autor-0/', '/autor/no-existe/'],
      publicadas: PUBLICADAS,
      fecha: HOY,
      hoy: HOY,
    });

    expect(salida.ok).toBe(false);
    if (salida.ok) return;
    expect(salida.motivos.join('\n')).toMatch(/no la publica el sitio/);
    // Todo o nada: la buena del lote tampoco entra. Un registro que dice que se pidió una
    // cuando quien lo ejecutó creía haber pedido dos no sirve para afirmar nada después.
    expect(salida.motivos).toHaveLength(1);
  });

  it('lo que ni siquiera tiene forma de URL del sitio se rechaza con su propio motivo', () => {
    const salida = componerPeticiones({
      seleccion: ['autor/autor-0'],
      publicadas: PUBLICADAS,
      fecha: HOY,
      hoy: HOY,
    });

    expect(salida.ok).toBe(false);
    if (salida.ok) return;
    expect(salida.motivos.join('\n')).toMatch(/no es una URL de este sitio/);
  });

  it(`más de ${TOPE_DE_LA_PETICION} de golpe se rechaza: §4.17 lo llama ruido`, () => {
    const publicadas = Array.from({ length: 40 }, (_, i) => `/cita/cita-${i}/`);
    const salida = componerPeticiones({
      seleccion: publicadas.slice(0, TOPE_DE_LA_PETICION + 1),
      publicadas,
      fecha: HOY,
      hoy: HOY,
    });

    expect(salida.ok).toBe(false);
    if (salida.ok) return;
    expect(salida.motivos.join('\n')).toMatch(/es ruido/);
  });

  it('la decena justa sí cabe: el tope es el orden de magnitud, no un número menor', () => {
    const publicadas = Array.from({ length: 40 }, (_, i) => `/cita/cita-${i}/`);
    const salida = componerPeticiones({
      seleccion: publicadas.slice(0, TOPE_DE_LA_PETICION),
      publicadas,
      fecha: HOY,
      hoy: HOY,
    });
    expect(salida.ok).toBe(true);
  });

  it('sin URL no hay petición: la selección la escribe una persona, la orden no elige', () => {
    const salida = componerPeticiones({ seleccion: [], publicadas: PUBLICADAS, fecha: HOY, hoy: HOY });
    expect(salida.ok).toBe(false);
    if (salida.ok) return;
    expect(salida.motivos.join('\n')).toMatch(/no elige/);
  });

  it('la misma URL dos veces en la misma petición es un lote mal escrito, no dos hechos', () => {
    const salida = componerPeticiones({
      seleccion: ['/autor/autor-0/', `https://${DOMINIO}/autor/autor-0/`],
      publicadas: PUBLICADAS,
      fecha: HOY,
      hoy: HOY,
    });
    expect(salida.ok).toBe(false);
    if (salida.ok) return;
    expect(salida.motivos.join('\n')).toMatch(/dos veces en la misma petición/);
  });

  it('una fecha que no es del calendario se rechaza: la fecha es la mitad del registro', () => {
    for (const fecha of ['2026-02-31', 'ayer', '04/09/2026']) {
      const salida = componerPeticiones({
        seleccion: ['/autor/autor-0/'],
        publicadas: PUBLICADAS,
        fecha,
        hoy: HOY,
      });
      expect(salida.ok).toBe(false);
      if (salida.ok) return;
      // Con el motivo fijado y no solo `ok === false`: sin esto, la prueba pasaría igual el
      // día que la fecha se rechazara por cualquier otra cosa, y dejaría de vigilar nada.
      expect(salida.motivos.join('\n')).toMatch(/no es una fecha del calendario/);
    }
  });

  it('una fecha futura se rechaza: esa petición todavía no se ha cursado', () => {
    /*
     * «Inventar que algo se pidió» es lo único que este registro no puede permitirse: una
     * entrada que no corresponde a una petición real le atribuiría a la petición un
     * movimiento de la serie que nadie provocó.
     */
    const salida = componerPeticiones({
      seleccion: ['/autor/autor-0/'],
      publicadas: PUBLICADAS,
      fecha: '2026-12-31',
      hoy: HOY,
    });
    expect(salida.ok).toBe(false);
    if (salida.ok) return;
    expect(salida.motivos.join('\n')).toMatch(/todavía no ha llegado/);
  });

  it('una fecha anterior a la propiedad se rechaza: la errata del año no se guardaba', () => {
    /*
     * El futuro ya estaba cerrado y el pasado no: `2025-09-04` por `2026-09-04` es un
     * carácter, y dejaba anotada una petición un año antes de que hubiera propiedad desde
     * la que cursarla. Es del mismo tipo que la del futuro y se trata igual.
     */
    const salida = componerPeticiones({
      seleccion: ['/autor/autor-0/'],
      publicadas: PUBLICADAS,
      fecha: '2025-09-04',
      hoy: HOY,
    });
    expect(salida.ok).toBe(false);
    if (salida.ok) return;
    expect(salida.motivos.join('\n')).toMatch(
      new RegExp(`es anterior a ${PRIMERA_JORNADA_ANOTABLE}`),
    );
    expect(salida.motivos.join('\n')).toMatch(/errata del año/);
  });

  it('una URL de otro dominio se rechaza nombrándolo: el rastreo se pide por propiedad', () => {
    /*
     * `rutaNormalizada` se queda con el `pathname` de cualquier URL absoluta, así que sin
     * comprobar el host una dirección de otra propiedad —o de una vista previa en otro
     * origen— se anotaba como si fuera de este sitio. Sería un registro que no corresponde
     * a ninguna petición real, que es lo único que este fichero no puede permitirse.
     */
    const salida = componerPeticiones({
      seleccion: ['https://otro-dominio.example/autor/autor-0/'],
      publicadas: PUBLICADAS,
      fecha: HOY,
      hoy: HOY,
    });
    expect(salida.ok).toBe(false);
    if (salida.ok) return;
    // Nombrado: quien pegó la URL tiene que ver de qué host es lo que pegó.
    expect(salida.motivos.join('\n')).toMatch(/otro-dominio\.example/);
    expect(salida.motivos.join('\n')).toMatch(new RegExp(`y no de ${DOMINIO}`));
  });

  it('el www sí es del sitio: la propiedad es de dominio y cubre el ápice y el www', () => {
    const salida = componerPeticiones({
      seleccion: [`https://www.${DOMINIO}/autor/autor-0/`],
      publicadas: PUBLICADAS,
      fecha: HOY,
      hoy: HOY,
    });
    expect(salida.ok).toBe(true);
  });

  it('la misma URL del mismo día ya anotada no entra dos veces por ejecutar la orden dos veces', () => {
    /*
     * Es el duplicado dentro del lote, partido en dos invocaciones. La causa natural es no
     * saber si la primera cuajó —esta orden no pide nada, así que no hay acuse de recibo—, y
     * como el registro solo añade, la segunda contaría dos peticiones donde hubo una.
     */
    const salida = componerPeticiones({
      seleccion: ['/autor/autor-0/'],
      publicadas: PUBLICADAS,
      fecha: AYER,
      hoy: HOY,
      anteriores: [{ fecha: AYER, ruta: '/autor/autor-0/' }],
    });
    expect(salida.ok).toBe(false);
    if (salida.ok) return;
    expect(salida.motivos.join('\n')).toMatch(/ya consta pedida el 2026-09-04/);
  });

  it('la misma URL otra jornada sí entra aunque ya conste: son dos hechos', () => {
    const salida = componerPeticiones({
      seleccion: ['/autor/autor-0/'],
      publicadas: PUBLICADAS,
      fecha: HOY,
      hoy: HOY,
      anteriores: [{ fecha: AYER, ruta: '/autor/autor-0/' }],
    });
    expect(salida.ok).toBe(true);
  });

  it('la portada se publica y se puede pedir, aunque no sea de ninguna familia', () => {
    const salida = componerPeticiones({
      seleccion: ['/'],
      publicadas: PUBLICADAS,
      fecha: HOY,
      hoy: HOY,
    });
    expect(salida.ok).toBe(true);
  });
});

// ─── El cruce por familia, que es la razón de ser del registro ───────────────────────

describe('el cruce con la serie', () => {
  it('dice de cada familia cuántas de sus URL se pidieron', async () => {
    const censo = censoPorFamilia(await conjuntoDelCorpus(rutasDelCorpus(await corpusConCitas(MIN_CITAS_POR_TEMA))));
    const reparto = repartoPorFamilia(
      [
        { fecha: AYER, ruta: '/autor/autor-0/' },
        { fecha: AYER, ruta: '/cita/cita-0/' },
        // La misma otro día: dos peticiones, una sola URL pedida.
        { fecha: HOY, ruta: '/cita/cita-0/' },
      ],
      censo,
    );

    const cita = reparto.find((r) => r.familia === 'cita');
    expect(cita).toMatchObject({ publicadas: MIN_CITAS_POR_TEMA, pedidas: 1, peticiones: 2 });
    expect(reparto.find((r) => r.familia === 'autor')).toMatchObject({ pedidas: 1, peticiones: 1 });
    expect(reparto.find((r) => r.familia === 'tema')).toMatchObject({ pedidas: 0, peticiones: 0 });
  });

  it('la familia sale del censo, que es el mismo reparto que escribe la serie', async () => {
    const conjunto = await conjuntoDelCorpus(rutasDelCorpus(await corpusConCitas(MIN_CITAS_POR_TEMA)));
    const censo = censoPorFamilia(conjunto);
    expect(familiaDeRuta(censo, '/autor/autor-0/')).toBe('autor');
    expect(familiaDeRuta(censo, '/cita/cita-0/')).toBe('cita');
    // La portada no es de ninguna: es una URL suelta y meterla en cualquiera de las cuatro
    // falsearía el reparto de esa familia sin que nadie lo notara.
    expect(familiaDeRuta(censo, '/')).toBeUndefined();
    expect(
      peticionesFueraDelCenso([{ fecha: HOY, ruta: '/' }], censo, rutasPublicadas(conjunto)).sueltas,
    ).toHaveLength(1);
  });

  it('una petición cuya URL se despublicó no es la portada, y se nombra por lo que es', async () => {
    /*
     * El registro es permanente y el censo es de hoy. Retirar unas Citas, un Tema que cae
     * bajo su umbral, una Colección borrada: la URL pedida deja de estar en el censo. Con
     * dos casos caía en el mismo saco que la portada, y el informe afirmaba que lo que
     * sobraba era la portada teniendo la petición escrita en el fichero.
     */
    const conjunto = await conjuntoDelCorpus(rutasDelCorpus(await corpusConCitas(MIN_CITAS_POR_TEMA)));
    const censo = censoPorFamilia(conjunto);
    const publicadas = rutasPublicadas(conjunto);
    const retirada = { fecha: AYER, ruta: '/autor/ya-no-esta/' };

    expect(destinoDePeticion('/', censo, publicadas)).toEqual({ clase: 'suelta' });
    expect(destinoDePeticion(retirada.ruta, censo, publicadas)).toEqual({ clase: 'despublicada' });

    const fuera = peticionesFueraDelCenso([{ fecha: HOY, ruta: '/' }, retirada], censo, publicadas);
    expect(fuera.sueltas).toHaveLength(1);
    expect(fuera.despublicadas).toEqual([retirada]);

    const lineas = lineasDeRegistro([retirada], censo, publicadas).join('\n');
    expect(lineas).toMatch(/\(ya no se publica\)/);
    expect(lineas).toMatch(/Ya no se publica —se pidió, y después el sitio la retiró—: 1/);
    // Y no se cuenta como portada, que es justo lo que hacía antes.
    expect(lineas).not.toMatch(/la portada no es de ninguna/);
  });

  it('el informe pone lo indexado de la serie junto a lo pedido, y omite lo que no se leyó', async () => {
    const conjunto = await conjuntoDelCorpus(rutasDelCorpus(await corpusConCitas(MIN_CITAS_POR_TEMA)));
    const censo = censoPorFamilia(conjunto);
    const lineas = lineasDeRegistro(
      [{ fecha: AYER, ruta: '/autor/autor-0/' }],
      censo,
      rutasPublicadas(conjunto),
      [{ fecha: AYER, familias: { autor: { publicadas: 1, muestra: 1, indexadas: 1 } } }],
    ).join('\n');

    expect(lineas).toMatch(/Autor: 1 pedidas de 1 publicadas; indexadas 1 de 1 el 2026-09-04/);
    /*
     * Cita no se leyó esa jornada, así que no aparece con un cero de indexadas: «ausencia
     * antes que cero» rige también en pantalla, porque quien la mira es quien decide.
     */
    const deCita = lineas.split('\n').find((l) => l.includes('Cita:'));
    expect(deCita).not.toMatch(/indexadas/);
  });

  it('marca la muestra y usa el denominador de la lectura, no el censo de hoy', async () => {
    /*
     * «indexadas 1 de 20» junto a «de 35 publicadas» ponía dos denominadores de fechas
     * distintas en la misma línea sin decirlo: el 35 es el censo de hoy y el 20 era una
     * muestra de lo que había el día de la lectura, que la propia lectura trae y no se
     * usaba. Es lo mismo que `lineasDeLectura` marca en el hermano de la 16.1.
     */
    const conjunto = await conjuntoDelCorpus(rutasDelCorpus(await corpusConCitas(MIN_CITAS_POR_TEMA)));
    const censo = censoPorFamilia(conjunto);
    const lineas = lineasDeRegistro(
      [{ fecha: AYER, ruta: '/autor/autor-0/' }],
      censo,
      rutasPublicadas(conjunto),
      [{ fecha: AYER, familias: { autor: { publicadas: 35, muestra: 20, indexadas: 1 } } }],
    ).join('\n');

    expect(lineas).toMatch(/indexadas 1 de 20 \(muestra de 35 de aquel día\) el 2026-09-04/);
  });

  it('el informe dice que la atribución no se puede calcular, en vez de insinuar que sí', async () => {
    /*
     * La serie guarda recuentos y no QUÉ URL inspeccionó, así que esa «1 indexada» junto a
     * «2 pedidas» puede ser perfectamente un tercer autor. Mientras eso siga así, el cruce
     * reparte lo pedido por familia y nada más: el informe no puede prometer una atribución
     * que no está en disco. El hueco de fondo es de la 16.1 y está en deferred-work.md.
     */
    const conjunto = await conjuntoDelCorpus(rutasDelCorpus(await corpusConCitas(MIN_CITAS_POR_TEMA)));
    const censo = censoPorFamilia(conjunto);
    const publicadas = rutasPublicadas(conjunto);
    const peticiones = [{ fecha: AYER, ruta: '/autor/autor-0/' }];
    const serie = [{ fecha: AYER, familias: { autor: { publicadas: 35, muestra: 20, indexadas: 1 } } }];

    const conCruce = lineasDeRegistro(peticiones, censo, publicadas, serie).join('\n');
    expect(conCruce).toMatch(/NO se cruzan URL a URL/);
    expect(conCruce).toMatch(/no anote las rutas que muestreó/);
    // Y el reparto por familia se queda: eso sí vale, y es lo que se revisa.
    expect(conCruce).toMatch(/Autor: 1 pedidas de/);

    // Sin serie no hay nada que aclarar, y el aviso no aparece por aparecer.
    expect(lineasDeRegistro(peticiones, censo, publicadas).join('\n')).not.toMatch(
      /NO se cruzan URL a URL/,
    );
  });
});

// ─── El escritor: solo añade ─────────────────────────────────────────────────────────

describe('el registro en corpus/', () => {
  it('crea el fichero con su cabecera, y la cabecera dice por qué añade en vez de reemplazar', async () => {
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    await registrarPeticionesDeRastreo(rutas, [{ fecha: AYER, ruta: '/autor/autor-0/' }]);

    const escrito = await readFile(rutas.peticionesDeRastreo, 'utf8');
    expect(escrito).toMatch(/POR QUÉ AÑADE EN VEZ DE REEMPLAZAR/);
    expect(escrito).toMatch(/serie-de-indexacion\.yml/);
    expect(escrito).toMatch(/LA PIDE UNA PERSONA/);
    expect(escrito).toMatch(/LA DECENA, NO EL MILLAR/);
  });

  it('las dos cabeceras dicen cuál es cuál: están una al lado de la otra', () => {
    // La confusión sería silenciosa: quien tomara el registro por idempotente creería que la
    // segunda petición sustituye a la primera, y quien tomara la serie por acumulable creería
    // que perdió entradas.
    expect(CABECERA_DE_PETICIONES).toMatch(/POR QUÉ AÑADE EN VEZ DE REEMPLAZAR/);
    expect(CABECERA_DE_PETICIONES).toMatch(/18\.3/);
    expect(CABECERA_DE_INDEXACION).toMatch(/peticiones-de-rastreo\.yml/);
    expect(CABECERA_DE_INDEXACION).toMatch(/REEMPLAZA EN VEZ DE AÑADIR/);
  });

  it('el fichero versionado del repositorio es exactamente esa cabecera', () => {
    // Si el fichero del repositorio y la constante divergen, quien lee el repositorio y quien
    // crea uno nuevo en un corpus de pruebas aprenden reglas distintas del mismo registro.
    const versionado = readFileSync(resolve(RAIZ, 'corpus', FICHERO_DE_PETICIONES), 'utf8');
    expect(versionado.startsWith(CABECERA_DE_PETICIONES)).toBe(true);
  });

  it('es metadato del Corpus, no una colección', () => {
    const configuracion = readFileSync(resolve(RAIZ, 'src/content.config.ts'), 'utf8');
    expect(configuracion).not.toContain(FICHERO_DE_PETICIONES);
  });

  it('solo añade: ninguna entrada anterior se reescribe', async () => {
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    await registrarPeticionesDeRastreo(rutas, [{ fecha: AYER, ruta: '/autor/autor-0/' }]);
    await registrarPeticionesDeRastreo(rutas, [{ fecha: HOY, ruta: '/autor/autor-0/' }]);

    expect(await leerPeticionesDeRastreo(rutas)).toEqual([
      { fecha: AYER, ruta: '/autor/autor-0/' },
      { fecha: HOY, ruta: '/autor/autor-0/' },
    ]);
  });

  it('conserva un comentario escrito a mano entre las entradas', async () => {
    // Es la ventaja de añadir en vez de volcar el fichero entero, y su vecina no la tiene.
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    await registrarPeticionesDeRastreo(rutas, [{ fecha: AYER, ruta: '/autor/autor-0/' }]);
    const conNota = `${await readFile(rutas.peticionesDeRastreo, 'utf8')}  # se pidió desde el móvil\n`;
    await writeFile(rutas.peticionesDeRastreo, conNota, 'utf8');

    await registrarPeticionesDeRastreo(rutas, [{ fecha: HOY, ruta: '/autor/autor-0/' }]);
    expect(await readFile(rutas.peticionesDeRastreo, 'utf8')).toMatch(/se pidió desde el móvil/);
    expect(await leerPeticionesDeRastreo(rutas)).toHaveLength(2);
  });

  it('se niega si el fichero perdió la clave de la que cuelgan las entradas', async () => {
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    await writeFile(rutas.peticionesDeRastreo, '# solo un comentario\n', 'utf8');
    await expect(
      registrarPeticionesDeRastreo(rutas, [{ fecha: HOY, ruta: '/autor/autor-0/' }]),
      // Fijada la frase, no la palabra: TODOS los mensajes de este registro empiezan por
      // «corpus/peticiones-de-rastreo.yml», así que /peticiones/ casaba con cualquier fallo
      // —un YAML roto, una entrada sin fecha— y la prueba no vigilaba lo que dice vigilar.
    ).rejects.toThrow(/falta la clave «peticiones:» en la raíz del fichero/);
  });

  it('un lote vacío no escribe nada, y eso incluye no crear el fichero', async () => {
    // El `wx` estaba antes del `return` del lote vacío, así que creaba el registro con su
    // cabecera y cero peticiones: lo contrario de lo que promete su propio docstring, y un
    // fichero en `corpus/` que nadie pidió y que un `git status` presenta como trabajo.
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    await registrarPeticionesDeRastreo(rutas, []);
    expect(existsSync(rutas.peticionesDeRastreo)).toBe(false);
  });

  it('un registro que no existe se lee como registro vacío', async () => {
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    expect(await leerPeticionesDeRastreo(rutas)).toEqual([]);
  });

  it('lo escrito es YAML que se relee entero', async () => {
    const rutas = rutasDelCorpus(await corpusConCitas(1));
    await registrarPeticionesDeRastreo(rutas, [{ fecha: AYER, ruta: '/autor/autor-0/' }]);
    const leido = parsearYaml(await readFile(rutas.peticionesDeRastreo, 'utf8'));
    expect(Array.isArray(leido.peticiones)).toBe(true);
    expect(leido.peticiones[0]).toEqual({ fecha: AYER, ruta: '/autor/autor-0/' });
  });
});

// ─── La orden ────────────────────────────────────────────────────────────────────────

describe('la orden', () => {
  it('consulta sin registrar: lista lo pedido y no toca el fichero', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();

    const codigo = await principal(['--corpus', corpus]);

    expect(codigo).toBe(0);
    expect(salida.join('')).toMatch(/Consulta: no se ha escrito nada\./);
    expect(existsSync(join(corpus, FICHERO_DE_PETICIONES))).toBe(false);
  });

  it('con la bandera, anota la URL con la fecha de hoy', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();

    const codigo = await principal(['--corpus', corpus, '--registrar', '/autor/autor-0/']);

    expect(codigo).toBe(0);
    expect(await leerPeticionesDeRastreo(rutasDelCorpus(corpus))).toEqual([
      { fecha: fechaLocal(new Date()), ruta: '/autor/autor-0/' },
    ]);
  });

  it('la misma URL otro día: constan las dos', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();

    await principal(['--corpus', corpus, '--registrar', '/autor/autor-0/', '--fecha', AYER]);
    await principal(['--corpus', corpus, '--registrar', '/autor/autor-0/', '--fecha', HOY], new Date(`${HOY}T12:00:00`));

    const anotadas = await leerPeticionesDeRastreo(rutasDelCorpus(corpus));
    expect(anotadas).toHaveLength(2);
    expect(anotadas.map((p) => p.fecha)).toEqual([AYER, HOY]);
  });

  it('una URL que el sitio no publica: se rechaza con código 1 y no se escribe nada', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();

    const codigo = await principal(['--corpus', corpus, '--registrar', '/autor/no-existe/']);

    expect(codigo).toBe(1);
    expect(salida.join('')).toMatch(/no la publica el sitio/);
    expect(existsSync(join(corpus, FICHERO_DE_PETICIONES))).toBe(false);
  });

  it('un listado paginado tampoco, y el motivo que se le da nombra su declaración', async () => {
    /*
     * La decisión es una sola y la toma el conjunto publicable (AD-11): `/tema/la-vida/2/` y
     * `/tema/no-existe/` se rechazan por lo mismo, por no estar en él. Lo que la declaración
     * de `superficies.ts` aporta es **el motivo** que se le dice a quien teclea, porque «esa
     * ruta no existe» y «esa ruta existe y el sitio no la publica» se arreglan distinto.
     */
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus, '--registrar', '/tema/la-vida/2/'])).toBe(1);
    expect(salida.join('')).toMatch(/la declara no publicable en src\/lib\/superficies\.ts/);
    expect(salida.join('')).toMatch(/la Página de Tema/);
    expect(existsSync(join(corpus, FICHERO_DE_PETICIONES))).toBe(false);
  });

  it('lo que no existe se rechaza por no estar en el conjunto publicable, y lo dice', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();
    expect(await principal(['--corpus', corpus, '--registrar', '/tema/no-existe/'])).toBe(1);
    expect(salida.join('')).toMatch(/único criterio que esta orden aplica/);
  });

  it('la misma URL el mismo día, en dos ejecuciones, se rechaza y solo consta una', async () => {
    // La causa natural es no saber si la primera cuajó: la orden no pide nada y no hay acuse
    // de recibo. Antes se aceptaban las dos sin decir nada y quedaban dos peticiones.
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    expect(
      await principal(['--corpus', corpus, '--registrar', '/autor/autor-0/', '--fecha', AYER]),
    ).toBe(0);

    const salida = capturarSalida();
    expect(
      await principal(['--corpus', corpus, '--registrar', '/autor/autor-0/', '--fecha', AYER]),
    ).toBe(1);
    expect(salida.join('')).toMatch(/ya consta pedida el 2026-09-04/);
    expect(await leerPeticionesDeRastreo(rutasDelCorpus(corpus))).toHaveLength(1);
  });

  it('un lote de más de una decena: se rechaza y no se escribe nada', async () => {
    const corpus = await corpusConCitas(40);
    const salida = capturarSalida();
    const lote = Array.from({ length: TOPE_DE_LA_PETICION + 1 }, (_, i) => `/cita/cita-${i}/`);

    const codigo = await principal(['--corpus', corpus, '--registrar', ...lote]);

    expect(codigo).toBe(1);
    expect(salida.join('')).toMatch(/es ruido/);
    expect(existsSync(join(corpus, FICHERO_DE_PETICIONES))).toBe(false);
  });

  it('una bandera con errata no es «lo mismo pero sin ella»: sale con 2 y no anota', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();

    const codigo = await principal(['--corpus', corpus, '--registar', '/autor/autor-0/']);

    expect(codigo).toBe(2);
    expect(salida.join('')).toMatch(/no es una opción de esta orden/);
    expect(existsSync(join(corpus, FICHERO_DE_PETICIONES))).toBe(false);
  });

  it('una URL sin --registrar es la bandera olvidada, no una consulta acotada', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();

    const codigo = await principal(['--corpus', corpus, '/autor/autor-0/']);

    expect(codigo).toBe(2);
    expect(salida.join('')).toMatch(/sin --registrar esta orden solo lista/);
    expect(existsSync(join(corpus, FICHERO_DE_PETICIONES))).toBe(false);
  });

  it('--fecha sin --registrar sale con 2: la consulta no fecha nada', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    const salida = capturarSalida();

    const codigo = await principal(['--corpus', corpus, '--fecha', AYER]);

    expect(codigo).toBe(2);
    expect(salida.join('')).toMatch(/solo tiene sentido al anotar/);
  });

  it('el --json de la consulta lleva lo pedido y el reparto por familia', async () => {
    const corpus = await corpusConCitas(MIN_CITAS_POR_TEMA);
    capturarSalida();
    await principal(['--corpus', corpus, '--registrar', '/autor/autor-0/', '--fecha', AYER]);

    const salida = capturarSalida();
    await principal(['--corpus', corpus, '--json']);
    const leido = JSON.parse(salida.join(''));

    expect(leido.peticiones).toEqual([{ fecha: AYER, ruta: '/autor/autor-0/' }]);
    expect(leido.porFamilia.find((r: { familia: string }) => r.familia === 'autor')).toMatchObject({
      pedidas: 1,
    });
  });
});

// ─── Lo que el sitio no ve ───────────────────────────────────────────────────────────

describe('el aislamiento del sitio (AD-24)', () => {
  it('ningún módulo de src/ nombra el registro de peticiones', async () => {
    const { readdir } = await import('node:fs/promises');
    const ficheros = (await readdir(resolve(RAIZ, 'src'), { recursive: true })).filter((f) =>
      /\.(ts|astro)$/.test(String(f)),
    );
    for (const fichero of ficheros) {
      const contenido = readFileSync(resolve(RAIZ, 'src', String(fichero)), 'utf8');
      expect(contenido).not.toContain(FICHERO_DE_PETICIONES);
    }
  });

  it('lo que se puede pedir sale del dueño único del conjunto publicable', async () => {
    const conjunto: ConjuntoPublicable = await conjuntoDelCorpus(
      rutasDelCorpus(await corpusConCitas(MIN_CITAS_POR_TEMA)),
    );
    // Si mañana se publica una superficie nueva, se puede pedir sin tocar esta historia; y si
    // deja de publicarse, deja de poder pedirse. Un segundo criterio habría divergido.
    for (const ruta of rutasPublicadas(conjunto)) {
      expect(
        componerPeticiones({ seleccion: [ruta], publicadas: rutasPublicadas(conjunto), fecha: HOY, hoy: HOY }).ok,
      ).toBe(true);
    }
  });
});
