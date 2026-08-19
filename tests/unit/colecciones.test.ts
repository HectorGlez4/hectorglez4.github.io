import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  avisoDeDesajustes,
  coleccionesPublicadas,
  desajustesDeColecciones,
  resolverColeccion,
  type Cita,
  type Coleccion,
  type ColeccionPublicada,
  type ConjuntoPublicable,
} from '../../src/lib/publicado.ts';
import { MAX_CARACTERES_CRITERIO, MIN_CITAS_POR_COLECCION } from '../../src/lib/umbrales.ts';
import { coleccionAdmisible, criterioDeColeccion, nombre } from '../../src/lib/admision.ts';
import {
  leerColecciones,
  rutasDelCorpus,
  slugDeColeccion,
  type Rutas,
} from '../../tools/lib/corpus.ts';
import {
  fallosDeColecciones,
  titularDeFallosDeColecciones,
} from '../../tools/lib/colecciones.ts';

/**
 * Historia 12.2 — la Colección declara sus miembros, y la lista es blanda.
 *
 * La matriz de E/S sobre lo puro. Lo que se comprueba aquí es la **resolución**: la
 * pertenencia se declara en la Colección y se obtiene intersectando esa lista con el
 * conjunto publicable, de modo que retirar una Cita la saca de todas sus Colecciones sin
 * romper nada. Lo que pasa en una construcción de verdad lo mide
 * `tests/unit/colecciones-build.test.ts`.
 */

const RAIZ = resolve(import.meta.dirname, '../..');

/**
 * Todos los módulos donde un umbral podría escribirse a mano — el barrido de AD-9.
 *
 * Estaba dentro del `describe` del umbral de Colección; la Historia 12.3 añadió un segundo
 * umbral con el mismo barrido y copiar el recorrido habría sido tener dos. `integraciones/`
 * entra además de `tools/`: `astro.config.mjs` la carga y ya lee de `tools/lib/`, así que un
 * umbral escrito a mano ahí valdría tanto como uno escrito en `src/`.
 */
const modulos = (function recorrer(dir: string): string[] {
  return readdirSync(dir).flatMap((entrada) => {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) return recorrer(ruta);
    return /\.(ts|astro|mjs)$/.test(entrada) ? [ruta] : [];
  });
})(resolve(RAIZ, 'src')).concat(
  ...['tools', 'integraciones'].map((carpeta) =>
    (function recorrer(dir: string): string[] {
      return readdirSync(dir).flatMap((entrada) => {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) return recorrer(ruta);
        return /\.(ts|mjs)$/.test(entrada) ? [ruta] : [];
      });
    })(resolve(RAIZ, carpeta)),
  ),
);


const cita = (slug: string, autor = 'seneca', temas: string[] = []): Cita => ({
  slug,
  texto: `Texto de ${slug}.`,
  autor,
  temas,
  procedencia: { obra: 'Obra', año: 1600 },
  aptaParaPortada: false,
});

/** n Citas con slugs predecibles: `c0`, `c1`… Sirven de miembros y de corpus. */
const nCitas = (n: number, desde = 0): Cita[] =>
  Array.from({ length: n }, (_, i) => cita(`c${desde + i}`));

const coleccion = (miembros: string[], campos: Partial<Coleccion> = {}): Coleccion => ({
  slug: 'frases-cortas',
  nombre: 'Frases cortas para reflexionar',
  criterio: 'Citas de una sola frase que se sostienen fuera de su obra.',
  miembros,
  ...campos,
});

describe('Historia 12.2 — la pertenencia se resuelve por intersección', () => {
  it('los miembros publicados resuelven, en el orden en que el fichero los declara', () => {
    const citas = [cita('a'), cita('b'), cita('c')];
    // Declarados al revés del orden del corpus: la Colección es una lista curada y el
    // orden del fichero es parte de la curación, a diferencia del listado de un Tema.
    const resuelta = resolverColeccion(coleccion(['c', 'a']), citas);
    expect(resuelta.citas.map((c) => c.slug)).toEqual(['c', 'a']);
  });

  it('la resolución devuelve las Citas enteras, no solo sus slugs', () => {
    // Lo que la Página de Colección de la 12.3 necesita para componer su tarjeta: texto y
    // atribución. Sin esto tendría que volver a buscar cada Cita por su cuenta.
    const resuelta = resolverColeccion(coleccion(['a']), [cita('a')]);
    expect(resuelta.citas[0].texto).toBe('Texto de a.');
    expect(resuelta.citas[0].autor).toBe('seneca');
  });

  it('un miembro que no está entre las Citas publicadas no forma parte', () => {
    const resuelta = resolverColeccion(coleccion(['a', 'retirada']), [cita('a')]);
    expect(resuelta.citas.map((c) => c.slug)).toEqual(['a']);
  });

  it('un miembro que no resuelve no deja hueco en la lista', () => {
    // La forma en que esto se podía romper: `miembros.map(buscar)` sin filtrar deja un
    // `undefined` en medio, y la página construye una tarjeta vacía o revienta.
    const resuelta = resolverColeccion(coleccion(['a', 'fantasma', 'b']), [cita('a'), cita('b')]);
    expect(resuelta.citas).toHaveLength(2);
    expect(resuelta.citas.every((c) => c !== undefined)).toBe(true);
  });

  it('un slug declarado dos veces cuenta una vez', () => {
    // Sin esto, un copiar y pegar empujaría a una Colección por encima de su umbral con
    // la misma Cita repetida, y el visitante vería el listado duplicado.
    const resuelta = resolverColeccion(coleccion(['a', 'a', 'b']), [cita('a'), cita('b')]);
    expect(resuelta.citas.map((c) => c.slug)).toEqual(['a', 'b']);
    expect(resuelta.declarados).toBe(2);
  });

  it('una lista vacía resuelve a cero', () => {
    const resuelta = resolverColeccion(coleccion([]), [cita('a')]);
    expect(resuelta.citas).toEqual([]);
    expect(resuelta.declarados).toBe(0);
    expect(resuelta.sinResolver).toEqual([]);
  });

  it('el nombre y el criterio sobreviven a la resolución', () => {
    const resuelta = resolverColeccion(coleccion([]), []);
    expect(resuelta.slug).toBe('frases-cortas');
    expect(resuelta.nombre).toBe('Frases cortas para reflexionar');
    expect(resuelta.criterio).toMatch(/una sola frase/);
  });

  it('resolver no modifica ni la Colección ni las Citas que recibe', () => {
    const citas = [cita('a')];
    const declarada = coleccion(['a', 'fantasma']);
    const antesCita = structuredClone(citas);
    const antesColeccion = structuredClone(declarada);

    resolverColeccion(declarada, citas);

    expect(citas).toEqual(antesCita);
    expect(declarada).toEqual(antesColeccion);
  });
});

describe('Historia 12.2 — ninguna Cita cambia por pertenecer a una Colección', () => {
  it('una Cita en tres Colecciones conserva sus Temas y su Autor', () => {
    // AD-18 en su forma más literal: crear una agrupación no toca ningún fichero de Cita.
    const laCita = cita('a', 'seneca', ['el-tiempo', 'la-virtud']);
    const citas = [laCita];
    const tres = [
      coleccion(['a'], { slug: 'una' }),
      coleccion(['a'], { slug: 'dos' }),
      coleccion(['a'], { slug: 'tres' }),
    ];

    const resueltas = tres.map((c) => resolverColeccion(c, citas));

    expect(resueltas.every((r) => r.citas[0] === laCita)).toBe(true);
    expect(laCita.temas).toEqual(['el-tiempo', 'la-virtud']);
    expect(laCita.autor).toBe('seneca');
  });

  it('la pertenencia no aparece por ningún lado en la Cita', () => {
    // La dirección es la inversa a la del Tema, y se comprueba mirando la forma: si la
    // Cita tuviera un campo de Colecciones, declarar una obligaría a editar ficheros de
    // Cita, que es justo lo que AD-18 invierte.
    expect(Object.keys(cita('a'))).not.toContain('colecciones');
  });
});

describe('Historia 12.2 — el umbral se aplica al recuento resuelto', () => {
  it('una Colección con el umbral justo se publica', () => {
    const citas = nCitas(MIN_CITAS_POR_COLECCION);
    const publicadas = coleccionesPublicadas(
      [coleccion(citas.map((c) => c.slug))],
      citas,
    );
    expect(publicadas.map((c) => c.slug)).toEqual(['frases-cortas']);
  });

  it('una Colección con una Cita menos no se publica', () => {
    const citas = nCitas(MIN_CITAS_POR_COLECCION - 1);
    const publicadas = coleccionesPublicadas([coleccion(citas.map((c) => c.slug))], citas);
    expect(publicadas).toEqual([]);
  });

  it('manda el resuelto y no el declarado: veinte declarados y dos publicados son dos', () => {
    // El caso central de la matriz. Si el umbral se midiera sobre lo declarado, el sitio
    // anunciaría veinte Citas y enseñaría dos.
    const declarados = Array.from({ length: 20 }, (_, i) => `c${i}`);
    const publicadas = coleccionesPublicadas([coleccion(declarados)], nCitas(2));
    expect(publicadas).toEqual([]);
  });

  it('por encima del umbral, resuelve a los que quedan y no a los declarados', () => {
    // 20 declarados, 18 publicados, umbral por debajo: se publica y muestra 18.
    const publicados = nCitas(MIN_CITAS_POR_COLECCION + 3);
    const declarados = [...publicados.map((c) => c.slug), 'retirada-una', 'retirada-dos'];

    const [resuelta] = coleccionesPublicadas([coleccion(declarados)], publicados);

    expect(resuelta.citas).toHaveLength(publicados.length);
    expect(resuelta.declarados).toBe(publicados.length + 2);
  });

  it('retirar un miembro por debajo del umbral la despublica sin tocar la Colección', () => {
    const citas = nCitas(MIN_CITAS_POR_COLECCION);
    const declarada = coleccion(citas.map((c) => c.slug));

    expect(coleccionesPublicadas([declarada], citas)).toHaveLength(1);
    // Mismo fichero de Colección, byte a byte: lo único que cambia es que una Cita se
    // movió a corpus/_revision/ y ya no está en el conjunto publicable.
    expect(coleccionesPublicadas([declarada], citas.slice(1))).toEqual([]);
  });

  it('una Colección sin miembros no se publica', () => {
    expect(coleccionesPublicadas([coleccion([])], nCitas(50))).toEqual([]);
  });

  it('los miembros repetidos no empujan a una Colección por encima del umbral', () => {
    const declarados = Array.from({ length: MIN_CITAS_POR_COLECCION }, () => 'c0');
    expect(coleccionesPublicadas([coleccion(declarados)], nCitas(1))).toEqual([]);
  });

  it('las publicadas salen ordenadas por nombre con las reglas del español', () => {
    const citas = nCitas(MIN_CITAS_POR_COLECCION);
    const slugs = citas.map((c) => c.slug);
    const publicadas = coleccionesPublicadas(
      [
        coleccion(slugs, { slug: 'c', nombre: 'Ñandú' }),
        coleccion(slugs, { slug: 'a', nombre: 'Álvarez' }),
        coleccion(slugs, { slug: 'b', nombre: 'Bécquer' }),
      ],
      citas,
    );
    expect(publicadas.map((c) => c.nombre)).toEqual(['Álvarez', 'Bécquer', 'Ñandú']);
  });
});

describe('Historia 12.2 — el desajuste entre declarado y resuelto es visible y contado', () => {
  it('una Colección sin desajuste no se cuenta', () => {
    expect(desajustesDeColecciones([coleccion(['a'])], [cita('a')])).toEqual([]);
  });

  it('un miembro que no resuelve se cuenta y se nombra', () => {
    const [desajuste] = desajustesDeColecciones([coleccion(['a', 'erratta'])], [cita('a')]);
    expect(desajuste).toEqual({
      slug: 'frases-cortas',
      declarados: 2,
      resueltos: 1,
      sinResolver: ['erratta'],
    });
  });

  it('también se cuentan las de Colecciones que no llegan al umbral', () => {
    // Una Colección que no se publica porque la mitad de sus slugs tienen errata es justo
    // el caso que hay que ver; contar solo las publicadas lo escondería.
    const desajustes = desajustesDeColecciones([coleccion(['fantasma'])], []);
    expect(desajustes).toHaveLength(1);
  });

  it('sin desajustes no se imprime ningún aviso', () => {
    // Un aviso que sale en todas las construcciones deja de leerse.
    expect(avisoDeDesajustes([])).toBeUndefined();
  });

  it('el aviso dice cuántos, en cuáles y cuáles son', () => {
    const aviso = avisoDeDesajustes(
      desajustesDeColecciones(
        [coleccion(['a', 'erratta'], { slug: 'primera' }), coleccion(['otra-errata'], { slug: 'segunda' })],
        [cita('a')],
      ),
    );
    expect(aviso).toContain('2 miembros declarados sin resolver en 2 Colecciones');
    expect(aviso).toContain('primera');
    expect(aviso).toContain('erratta');
    expect(aviso).toContain('segunda');
    expect(aviso).toContain('otra-errata');
  });

  it('el aviso concuerda en singular', () => {
    const aviso = avisoDeDesajustes(desajustesDeColecciones([coleccion(['erratta'])], []));
    expect(aviso).toContain('1 miembro declarado sin resolver en 1 Colección');
  });
});

describe('Historia 12.2 — el umbral vive en un solo sitio (AD-9)', () => {
  it('solo umbrales.ts define el umbral de Colección', () => {
    const definen = modulos.filter((ruta) =>
      /export const MIN_CITAS_POR_COLECCION/.test(readFileSync(ruta, 'utf8')),
    );
    expect(definen).toEqual([resolve(RAIZ, 'src/lib/umbrales.ts')]);
  });

  it('nadie escribe el número a mano donde se decide qué se publica', () => {
    // Lo que AD-9 impide: que el umbral viva como literal en dos sitios y una revisión
    // futura cambie solo uno. El único módulo que lo aplica es el dueño del conjunto
    // publicable, y lo aplica leyendo la constante.
    const publicado = readFileSync(resolve(RAIZ, 'src/lib/publicado.ts'), 'utf8');
    expect(publicado).toContain('MIN_CITAS_POR_COLECCION');
    expect(publicado).toMatch(/>=\s*MIN_CITAS_POR_COLECCION/);
  });

  it('el valor está declarado como provisional', () => {
    // El PRD §14.4 lo deja abierto a propósito. Un número sin esa marca se toma por
    // decidido y nadie vuelve a él.
    const umbrales = readFileSync(resolve(RAIZ, 'src/lib/umbrales.ts'), 'utf8');
    const bloque = umbrales.slice(0, umbrales.indexOf('export const MIN_CITAS_POR_COLECCION'));
    expect(bloque.slice(-1600)).toMatch(/PROVISIONAL/i);
  });
});

describe('Historia 12.2 — la lectura de Colecciones para las herramientas', () => {
  const temporales: string[] = [];
  afterEach(async () => {
    await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  });

  async function corpusCon(ficheros: Record<string, string>): Promise<Rutas> {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-colecciones-'));
    temporales.push(raiz);
    const rutas = rutasDelCorpus(join(raiz, 'corpus'));
    await mkdir(rutas.colecciones, { recursive: true });
    for (const [nombre, contenido] of Object.entries(ficheros)) {
      await writeFile(join(rutas.colecciones, nombre), contenido, 'utf8');
    }
    return rutas;
  }

  it('un directorio vacío se lee como ninguna Colección', async () => {
    expect(await leerColecciones(await corpusCon({}))).toEqual([]);
  });

  it('un directorio que no existe tampoco rompe', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-colecciones-'));
    temporales.push(raiz);
    expect(await leerColecciones(rutasDelCorpus(join(raiz, 'corpus')))).toEqual([]);
  });

  it('el slug de una Colección es el nombre de su fichero', async () => {
    const rutas = await corpusCon({
      'frases-cortas.yml': 'nombre: "Frases cortas"\ncriterio: "Una razón."\nmiembros:\n  - c0\n',
    });
    const [leida] = await leerColecciones(rutas);
    expect(leida.slug).toBe('frases-cortas');
    expect(leida.nombre).toBe('Frases cortas');
    expect(leida.criterio).toBe('Una razón.');
    expect(leida.miembros).toEqual(['c0']);
  });

  it('lee la declaración y no la pertenencia: un slug retirado sigue estando', async () => {
    // Resolver es intersectar con el conjunto publicable, y de eso se ocupa publicado.ts.
    // Esta capa lee ficheros; si filtrara, habría dos respuestas a la misma pregunta.
    const rutas = await corpusCon({
      'frases-cortas.yml': 'nombre: "F"\ncriterio: "R"\nmiembros:\n  - retirada\n',
    });
    expect((await leerColecciones(rutas))[0].miembros).toEqual(['retirada']);
  });

  it('«miembros:» sin nada debajo se lee como lista vacía, no como null', async () => {
    // Un corpus a medio escribir no debe reventar en la herramienta que existe para
    // arreglarlo: `null.length` la mataría antes de poder decir qué pasa. La puerta que
    // rechaza esa forma es el esquema del build.
    const rutas = await corpusCon({ 'a-medias.yml': 'nombre: "F"\ncriterio: "R"\nmiembros:\n' });
    expect((await leerColecciones(rutas))[0].miembros).toEqual([]);
  });

  it('un YAML que no es un mapa se lee como Colección sin campos, no a trozos', async () => {
    // Esparcir una cadena daba un objeto con índices de caracteres por claves, y una lista
    // daba índices numéricos: la auditoría de la 12.4 habría leído basura como si fuera
    // una Colección. Lo que rechaza estas formas es el esquema del build.
    const rutas = await corpusCon({
      'escalar.yml': 'solo una cadena suelta\n',
      'lista.yml': '- uno\n- dos\n',
      'vacio.yml': '',
    });
    const leidas = await leerColecciones(rutas);
    expect(leidas.map((c) => c.slug)).toEqual(['escalar', 'lista', 'vacio']);
    for (const leida of leidas) {
      expect(leida.nombre).toBeUndefined();
      expect(leida.criterio).toBeUndefined();
      expect(leida.miembros).toEqual([]);
      expect(Object.keys(leida).sort()).toEqual(['miembros', 'ruta', 'slug']);
    }
  });

  it('lo que no se deja analizar se rechaza nombrando el fichero', async () => {
    // Leer a medias daría una auditoría que miente, y el error crudo de la librería no
    // dice en cuál de los ficheros mirar.
    const rutas = await corpusCon({ 'rota.yml': 'nombre: "sin cerrar\ncriterio: [\n' });
    await expect(leerColecciones(rutas)).rejects.toThrow(/rota\.yml no es YAML válido/);
  });

  it('un campo ausente se omite, nunca se escribe vacío', async () => {
    const rutas = await corpusCon({ 'a.yml': 'criterio: "Una razón."\nmiembros: []\n' });
    const [leida] = await leerColecciones(rutas);
    expect('nombre' in leida).toBe(false);
    expect(leida.criterio).toBe('Una razón.');
  });

  it('salen ordenadas por fichero, para que dos lecturas den lo mismo', async () => {
    const rutas = await corpusCon({
      'zeta.yml': 'nombre: "Z"\ncriterio: "R"\nmiembros: []\n',
      'alfa.yml': 'nombre: "A"\ncriterio: "R"\nmiembros: []\n',
    });
    expect((await leerColecciones(rutas)).map((c) => c.slug)).toEqual(['alfa', 'zeta']);
  });
});

describe('Historia 12.2 — los mensajes de `nombre()`, fijados uno a uno', () => {
  /*
   * Parametrizar el artículo dejó los tres mensajes colgando de un valor por omisión y sin
   * ninguna prueba: cambiarlo producía «falta el nombre de la Autor» con la suite en verde.
   * Se fijan aquí los tres, y no solo el de la Colección, porque el riesgo lo introdujo
   * esta historia y es a las otras dos entidades a las que se lo hizo.
   */
  const mensajes = (esquema: ReturnType<typeof nombre>, valor: unknown) => {
    const resultado = esquema.safeParse(valor);
    return resultado.success ? [] : resultado.error.issues.map((i) => i.message);
  };

  it.each([
    ['Autor', undefined, 'Regla incumplida: falta el nombre del Autor.'],
    ['Tema', undefined, 'Regla incumplida: falta el nombre del Tema.'],
  ])('la ausencia del nombre %s se dice en español correcto', (entidad, valor, esperado) => {
    expect(mensajes(nombre(entidad), valor)).toEqual([esperado]);
  });

  it('la Colección concuerda en femenino', () => {
    // El motivo de que el artículo sea parámetro: «falta el nombre del Colección» es un
    // mensaje que quien lo lee deja de tomarse en serio.
    expect(mensajes(nombre('Colección', 'de la'), undefined)).toEqual([
      'Regla incumplida: falta el nombre de la Colección.',
    ]);
  });

  it.each([
    ['Autor', 'del'],
    ['Tema', 'del'],
  ])('un nombre de %s en blanco se rechaza, no solo el vacío', (entidad, articulo) => {
    // `.min(1)` daba por bueno un solo espacio: tiene longitud uno.
    expect(mensajes(nombre(entidad, articulo), '   ')).toEqual([
      `Regla incumplida: el nombre ${articulo} ${entidad} no puede estar vacío ni ser solo espacios.`,
    ]);
    expect(mensajes(nombre(entidad, articulo), '')).toHaveLength(1);
    expect(mensajes(nombre(entidad, articulo), 'Séneca')).toEqual([]);
  });

  it('el valor no se recorta al validarlo', () => {
    // NFR-12: el sistema no altera contenido sin acción explícita del editor. Se mide lo
    // recortado; se guarda lo escrito.
    expect(nombre('Autor').parse('  Séneca  ')).toBe('  Séneca  ');
  });
});

describe('Historia 12.3 — el criterio tiene techo, y el techo está en la puerta', () => {
  /*
   * El criterio se publica **literal** como `<meta name="description">`, y NFR-12 prohíbe
   * que la página lo recorte. Acotarlo donde el editor lo escribe es la única forma de que
   * no se publique entero en la página y cortado en los resultados de búsqueda.
   */
  const mensajes = (valor: unknown) => {
    const resultado = criterioDeColeccion.safeParse(valor);
    return resultado.success ? [] : resultado.error.issues.map((i) => i.message);
  };

  const deLargo = (n: number) => 'a'.repeat(n);

  it('un criterio que cabe pasa, justo en el límite', () => {
    expect(mensajes(deLargo(MAX_CARACTERES_CRITERIO))).toEqual([]);
  });

  it('un carácter más se rechaza, y el mensaje dice el número y por qué', () => {
    const [mensaje, ...resto] = mensajes(deLargo(MAX_CARACTERES_CRITERIO + 1));
    expect(resto).toEqual([]);
    expect(mensaje).toContain('Regla incumplida');
    expect(mensaje).toContain(String(MAX_CARACTERES_CRITERIO));
    expect(mensaje).toContain('descripción');
  });

  it('el criterio de partida cabe con holgura: el techo no aprieta al uso normal', () => {
    const deVerdad = 'Citas de una sola frase que se sostienen fuera de la obra de la que salen.';
    expect(deVerdad.length).toBeLessThan(MAX_CARACTERES_CRITERIO);
    expect(mensajes(deVerdad)).toEqual([]);
  });

  it('el techo no recorta ni altera lo que el editor guardó — NFR-12', () => {
    expect(criterioDeColeccion.parse('  Un criterio con aire.  ')).toBe(
      '  Un criterio con aire.  ',
    );
  });

  it('el límite vive solo en umbrales.ts (AD-9)', () => {
    const definen = modulos.filter((ruta) =>
      /export const MAX_CARACTERES_CRITERIO/.test(readFileSync(ruta, 'utf8')),
    );
    expect(definen).toEqual([resolve(RAIZ, 'src/lib/umbrales.ts')]);
  });
});

describe('Historia 12.2 — «miembros» distingue omitido de vacío y de nulo', () => {
  const analizar = (valor: unknown) => {
    const r = coleccionAdmisible.safeParse({
      nombre: 'Frases cortas',
      criterio: 'Una razón.',
      ...(valor === '<omitido>' ? {} : { miembros: valor }),
    });
    return r.success ? r.data.miembros : r.error.issues.map((i) => i.message);
  };

  it('omitido cae al valor por omisión', () => {
    expect(analizar('<omitido>')).toEqual([]);
  });

  it('una lista vacía escrita se admite tal cual', () => {
    expect(analizar([])).toEqual([]);
  });

  it('nulo se rechaza con la regla, no con un error de tipo en inglés', () => {
    // `miembros:` con nada debajo es `null` en YAML, y `.default()` solo cubre `undefined`.
    const motivos = analizar(null) as string[];
    expect(motivos).toHaveLength(1);
    expect(motivos[0]).toMatch(/^Regla incumplida: «miembros» es una lista de slugs/);
    expect(motivos[0]).toMatch(/omita el campo entero/);
  });

  it('el error de la lista no tapa el de sus elementos', () => {
    expect(analizar(['Con Mayúsculas'])).toEqual([
      expect.stringContaining('un miembro de una Colección es el slug de una Cita'),
    ]);
  });

  it('el criterio en blanco se rechaza', () => {
    const r = coleccionAdmisible.safeParse({ nombre: 'F', criterio: ' ', miembros: [] });
    expect(r.success).toBe(false);
  });
});

describe('Historia 12.2 — dos ficheros no pueden ser la misma Colección', () => {
  const fichero = (ruta: string, slug: string) => ({ ruta, slug });

  it('un conjunto plano y sin repetidos no tiene fallos', () => {
    expect(
      fallosDeColecciones([
        fichero('corpus/colecciones/a.yml', 'a'),
        fichero('corpus/colecciones/b.yml', 'b'),
      ]),
    ).toEqual([]);
  });

  it('«a.yml» y «a.yaml» son la misma Colección, y se nombran los dos', () => {
    const [fallo, ...resto] = fallosDeColecciones([
      fichero('corpus/colecciones/a.yml', 'a'),
      fichero('corpus/colecciones/a.yaml', 'a'),
    ]);
    expect(resto).toEqual([]);
    expect(fallo).toContain('corpus/colecciones/a.yml');
    expect(fallo).toContain('corpus/colecciones/a.yaml');
    expect(fallo).toContain('«a»');
  });

  it('un subdirectorio se rechaza, nombrando el fichero', () => {
    const [fallo] = fallosDeColecciones([fichero('corpus/colecciones/sub/a.yml', 'sub/a')]);
    expect(fallo).toContain('corpus/colecciones/sub/a.yml');
    expect(fallo).toMatch(/sin subdirectorios/);
  });

  it('el titular concuerda en número', () => {
    expect(titularDeFallosDeColecciones(1)).toMatch(/1 incumplimiento de forma/);
    expect(titularDeFallosDeColecciones(3)).toMatch(/3 incumplimientos de forma/);
  });

  it('la puerta juzga ficheros, no pertenencia', () => {
    /*
     * Lo que recibe es `{ ruta, slug }` y nada más: no puede mirar los miembros aunque
     * quisiera. Comprobar aquí que cada miembro existe convertiría retirar una Cita a
     * `corpus/_revision/` en romper el build, que es lo que la historia entera evita, y
     * este es el módulo donde alguien lo añadiría. Un conjunto impecable de ficheros no
     * tiene fallos por muchos miembros rotos que declaren dentro.
     */
    expect(fallosDeColecciones([fichero('corpus/colecciones/a.yml', 'a')])).toEqual([]);
  });
});

describe('Historia 12.2 — el slug de una Colección sale de una sola regla', () => {
  const rutas = rutasDelCorpus('/x/corpus');

  it('en la raíz es el nombre del fichero', () => {
    expect(slugDeColeccion(rutas, '/x/corpus/colecciones/frases-cortas.yml')).toBe('frases-cortas');
  });

  it('«.yaml» da el mismo slug que «.yml», que es por qué la puerta existe', () => {
    expect(slugDeColeccion(rutas, '/x/corpus/colecciones/a.yaml')).toBe('a');
    expect(slugDeColeccion(rutas, '/x/corpus/colecciones/a.yml')).toBe('a');
  });

  it('en un subdirectorio conserva la ruta, igual que el identificador de Astro', () => {
    // Describir lo que hay, aunque esté mal: rechazarlo es cosa de la puerta. Con el
    // basename, la herramienta diría «a» y el sitio «sub/a» sobre el mismo fichero.
    expect(slugDeColeccion(rutas, '/x/corpus/colecciones/sub/a.yml')).toBe('sub/a');
  });
});

describe('Historia 12.2 — el umbral no tiene un segundo camino', () => {
  const citas = nCitas(MIN_CITAS_POR_COLECCION);
  const slugs = citas.map((c) => c.slug);

  it('lo resuelto-sin-filtrar no es del mismo tipo que lo publicable', () => {
    /*
     * Esta es la puerta, y la vigila `npx astro check`.
     *
     * `resolverColeccion` no aplica umbral, así que su salida no puede llegar a ninguna
     * superficie que enumere contenido. Con los dos tipos iguales eso era una convención;
     * con la marca de `ColeccionPublicada` no compila. El `@ts-expect-error` es la
     * comprobación: si alguien quitara la marca, la línea dejaría de tener error y **la
     * comprobación de tipos fallaría por un `@ts-expect-error` sin usar**.
     */
    const resuelta = resolverColeccion(coleccion(slugs.slice(0, 1)), citas);
    // @ts-expect-error — una Colección resuelta no es publicable mientras nadie mire el umbral.
    const publicada: ColeccionPublicada = resuelta;
    expect(publicada.slug).toBe('frases-cortas');
  });

  it('lo que devuelve el filtro sí encaja donde se espera lo publicable', () => {
    // La otra mitad: la marca no estorba al camino correcto ni existe en tiempo de
    // ejecución, así que el objeto es el mismo y no lleva propiedades de más.
    const [publicada]: ColeccionPublicada[] = coleccionesPublicadas([coleccion(slugs)], citas);
    expect(Object.keys(publicada).sort()).toEqual([
      'citas',
      'criterio',
      'declarados',
      'nombre',
      'sinResolver',
      'slug',
    ]);
  });

  it('el conjunto publicable reparte lo filtrado, nunca lo declarado', () => {
    /*
     * El agujero que esto cierra: `ConjuntoPublicable.colecciones` exponía la lista
     * declarada en crudo, y una página podía resolverla por su cuenta y renderizar sin
     * pasar por el umbral. Ahora el campo es del tipo marcado, así que asignarle lo
     * declarado no compila y no hay nada que resolver desde fuera.
     */
    const conjunto: ConjuntoPublicable = {
      citas,
      autores: [],
      temas: [],
      colecciones: coleccionesPublicadas([coleccion(slugs)], citas),
    };
    expect(conjunto.colecciones.map((c) => c.slug)).toEqual(['frases-cortas']);

    // @ts-expect-error — la lista declarada no cabe donde va lo publicable.
    const conDeclaradas: ConjuntoPublicable = { ...conjunto, colecciones: [coleccion(slugs)] };
    expect(conDeclaradas.colecciones).toHaveLength(1);
  });

  it('ninguna superficie del sitio resuelve Colecciones por su cuenta', () => {
    /*
     * El complemento en el plano estructural, hermano del que ya prohíbe `getCollection`
     * suelto en una `.astro`. Una página no puede llamar a `resolverColeccion` porque no
     * tiene de dónde sacar una Colección declarada; que además no lo intente se comprueba
     * aquí, para que el fallo se lea como lo que es y no como un error de tipos.
     */
    const superficies = (function recorrer(dir: string): string[] {
      return readdirSync(dir).flatMap((entrada) => {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) return recorrer(ruta);
        return /\.astro$/.test(entrada) ? [ruta] : [];
      });
    })(resolve(RAIZ, 'src'));

    const culpables = superficies.filter((ruta) =>
      /resolverColeccion\s*\(/.test(readFileSync(ruta, 'utf8')),
    );
    expect(culpables).toEqual([]);
  });
});
