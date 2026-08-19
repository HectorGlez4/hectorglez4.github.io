import { describe, expect, it } from 'vitest';
import {
  apareceEnDocumento,
  CENSO_DE_PARTIDA,
  colapsarEspacios,
  cotejar,
  documentoDeCita,
  formatearFallos,
  huellaDeTexto,
  motivoParaNoPublicar,
  resumenDeCotejo,
  resumenDelBuild,
  titularDeFallos,
  TOPE_DE_PENDIENTES_DE_COTEJO,
  type CitaParaCotejar,
} from '../../tools/lib/cotejo.ts';
import { fuenteDeCita } from '../../src/lib/admision.ts';
import { normalizar } from '../../src/lib/normalizar.ts';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Historia 11.2 — lo decidible sin construir.
 *
 * Aquí se prueba el criterio: cómo se comparan dos textos, qué documento le toca a cada
 * Cita y qué ampara el censo. Que la puerta esté de verdad puesta en el build lo prueba
 * `cotejo-build.test.ts`, que construye de verdad.
 */

const FUENTE = { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Ejemplo' };
const OBRA = 'Campos de Castilla';
const DOCUMENTO = 'wikisource-es--campos-de-castilla';

const CUERPO = `Cantares

Caminante, son tus huellas
el camino y nada más;
caminante, no hay camino,
se hace camino al andar.
`;

function cita(campos: Partial<CitaParaCotejar> = {}): CitaParaCotejar {
  return {
    slug: 'antonio-machado-caminante-no-hay-camino',
    ruta: 'corpus/citas/antonio-machado--caminante-no-hay-camino.md',
    texto: 'caminante, no hay camino, se hace camino al andar.',
    obra: OBRA,
    fuente: FUENTE,
    ...campos,
  };
}

function conDocumento(cuerpo: string | null = CUERPO) {
  return new Map<string, string | null>([[DOCUMENTO, cuerpo]]);
}

const SLUG = 'antonio-machado-caminante-no-hay-camino';
const TEXTO = 'caminante, no hay camino, se hace camino al andar.';

/**
 * Un censo de partida de mentira, con una sola Cita.
 *
 * Las pruebas puras no se apoyan en el censo real de 38: si lo hicieran, el día que la
 * 11.4 vacíe el censo estas pruebas empezarían a fallar por algo que no miden. Que el
 * build use el de verdad lo prueba `cotejo-build.test.ts`, que construye.
 */
const PARTIDA: Readonly<Record<string, string>> = { [SLUG]: huellaDeTexto(TEXTO) };

describe('la comparación colapsa espacios y nada más', () => {
  it('colapsa saltos de línea, tabuladores y espacios repetidos', () => {
    expect(colapsarEspacios('  hay\n\tdos   palabras \n')).toBe('hay dos palabras');
  });

  it('colapsa también el espacio duro y los espacios finos de una página web', () => {
    // Es lo que produce el marcado, y lo que `aTextoPlano` ya traduce a espacio normal
    // al versionar; si el cotejo no hiciera lo mismo, la Cita copiada de la página web
    // no aparecería en su propio documento.
    expect(colapsarEspacios('dos\u00a0palabras\u2009más')).toBe('dos palabras más');
    expect(apareceEnDocumento('caminante,\u00a0no hay camino,', CUERPO)).toBe(true);
  });

  it('retira los invisibles que una edición web reparte a mansalva', () => {
    /*
     * Ni el guion blando ni los de ancho cero son `\s`, así que colapsar espacios no los
     * tocaba. Sin retirarlos, un texto **idéntico** al de la edición fallaba el cotejo
     * sin ninguna diferencia visible, y el build se quedaba bloqueado sin que nadie
     * pudiera saber por qué mirando los dos textos.
     */
    expect(colapsarEspacios('ca\u00admino\u200b al\ufeff andar')).toBe('camino al andar');
    expect(apareceEnDocumento('se hace ca\u00admi\u200bno al andar.', CUERPO)).toBe(true);
    expect(apareceEnDocumento('caminante,\u2060 no hay camino,', CUERPO)).toBe(true);
  });

  it('retirar lo invisible no iguala dos textos que sí difieren', () => {
    expect(apareceEnDocumento('se hace ca\u00admi\u200bnó al andar.', CUERPO)).toBe(false);
  });

  it('el mismo texto con el espaciado repartido de otro modo aparece', () => {
    // Es el caso de siempre: una edición digital reparte los saltos donde le conviene, y
    // la retirada de marcado los vuelve a repartir. El espaciado no puede decidir.
    expect(
      apareceEnDocumento('caminante, no hay camino,\n  se hace camino al andar.', CUERPO),
    ).toBe(true);
  });

  it('un acento de diferencia hace fallar', () => {
    expect(apareceEnDocumento('caminante, no hay camino, se hace caminó al andar.', CUERPO))
      .toBe(false);
  });

  it('un signo de puntuación de más hace fallar', () => {
    expect(apareceEnDocumento('caminante, no hay camino, se hace camino, al andar.', CUERPO))
      .toBe(false);
  });

  it('una mayúscula de diferencia hace fallar', () => {
    expect(apareceEnDocumento('Caminante, no hay camino, se hace camino al andar.', CUERPO))
      .toBe(false);
  });

  it('un texto que no está en el cuerpo no aparece', () => {
    expect(apareceEnDocumento('Esta frase no está en la obra.', CUERPO)).toBe(false);
  });

  it('un texto vacío o solo con espacios no aparece en ninguna parte', () => {
    // Sin este guardián `''.includes('')` daría por cotejada una Cita sin texto.
    expect(apareceEnDocumento('', CUERPO)).toBe(false);
    expect(apareceEnDocumento('   \n  ', CUERPO)).toBe(false);
  });

  it('no pasa por normalizar.ts: lo que normalizar iguala, el cotejo separa', () => {
    /*
     * `normalizar` está para los slugs y quita justo lo que aquí tiene que decidir. La
     * prueba lo demuestra en vez de afirmarlo: los dos textos son iguales para
     * `normalizar` y distintos para el cotejo.
     */
    const conAcento = 'caminante, no hay camino, se hace caminó al andar.';
    expect(normalizar(conAcento)).toBe(normalizar('caminante, no hay camino, se hace camino al andar.'));
    expect(apareceEnDocumento(conAcento, CUERPO)).toBe(false);
  });
});

describe('qué documento le toca a cada Cita', () => {
  it('sale de la Fuente y de la obra, como el nombre que escribe la recuperación', () => {
    expect(documentoDeCita({ id: 'wikisource-es' }, OBRA)).toBe(DOCUMENTO);
    expect(documentoDeCita({ id: 'gutenberg' }, 'Del sentimiento trágico de la vida')).toBe(
      'gutenberg--del-sentimiento-tragico-de-la-vida',
    );
  });

  it('sin Fuente o sin obra no hay documento que elegir', () => {
    expect(documentoDeCita(undefined, OBRA)).toBeUndefined();
    expect(documentoDeCita({ id: 'wikisource-es' }, undefined)).toBeUndefined();
    expect(documentoDeCita({ id: 'wikisource-es' }, '   ')).toBeUndefined();
  });

  it('una obra que no deja ni una letra no da nombre utilizable', () => {
    expect(documentoDeCita({ id: 'wikisource-es' }, '···')).toBeUndefined();
  });
});

describe('el cotejo del corpus entero', () => {
  it('una Cita cuyo texto está en el cuerpo de su documento pasa', () => {
    const resultado = cotejar({ citas: [cita()], documentos: conDocumento(), censo: [] });
    expect(resultado.ok).toBe(true);
    expect(resultado.cotejadas).toBe(1);
    expect(resultado.pendientes).toEqual([]);
  });

  it('una Cita cuyo texto no está falla nombrando su ruta y la regla', () => {
    const resultado = cotejar({
      citas: [cita({ texto: 'Frase que la obra no dice en ninguna parte.' })],
      documentos: conDocumento(),
      censo: [],
    });
    expect(resultado.ok).toBe(false);
    expect(resultado.fallos).toHaveLength(1);
    expect(resultado.fallos[0].ruta).toBe(
      'corpus/citas/antonio-machado--caminante-no-hay-camino.md',
    );
    expect(resultado.fallos[0].regla).toMatch(/Regla incumplida/);
    expect(resultado.fallos[0].regla).toContain(`corpus/fuentes/${DOCUMENTO}.txt`);
  });

  it('el fallo no propone tocar el texto de la Cita para que cuadre', () => {
    // NFR-12 lo prohíbe, y el mensaje es lo único que lee quien va a arreglarlo.
    const resultado = cotejar({
      citas: [cita({ texto: 'Frase que la obra no dice.' })],
      documentos: conDocumento(),
      censo: [],
    });
    expect(resultado.fallos[0].regla).toMatch(/NFR-12|no se toca el texto/i);
  });

  it('una Cita sin Fuente y fuera del censo falla pidiendo recuperar la Fuente', () => {
    const resultado = cotejar({
      citas: [cita({ fuente: undefined })],
      documentos: new Map(),
      censo: [],
    });
    expect(resultado.ok).toBe(false);
    expect(resultado.fallos[0].regla).toMatch(/recuperar\.ts/);
    expect(resultado.fallos[0].regla).toMatch(/no admite altas/);
  });

  it('una Cita del censo pasa sin documento y se cuenta como deuda', () => {
    const resultado = cotejar({
      citas: [cita({ fuente: undefined })],
      documentos: new Map(),
      censo: [SLUG],
      censoDePartida: PARTIDA,
    });
    expect(resultado.ok).toBe(true);
    expect(resultado.pendientes).toEqual(['antonio-machado-caminante-no-hay-camino']);
    expect(resultado.cotejadas).toBe(0);
  });

  it('un slug del censo que ya no existe entre las Citas falla: el censo solo mengua', () => {
    const resultado = cotejar({
      citas: [cita()],
      documentos: conDocumento(),
      censo: ['una-cita-que-ya-no-existe'],
      censoDePartida: { ...PARTIDA, 'una-cita-que-ya-no-existe': huellaDeTexto('otra') },
      rutaDelCenso: 'corpus/pendientes-de-cotejo.yml',
    });
    expect(resultado.ok).toBe(false);
    expect(resultado.fallos[0].ruta).toBe('corpus/pendientes-de-cotejo.yml');
    expect(resultado.fallos[0].regla).toContain('una-cita-que-ya-no-existe');
    expect(resultado.fallos[0].regla).toMatch(/solo mengua/);
  });

  it('una Cita que ya declara Fuente y sigue en el censo falla', () => {
    // El censo mengua cuando la 11.4 le da documento a una Cita; si la entrada se
    // quedara, esa Cita nunca se cotejaría aunque ya se pudiera.
    const resultado = cotejar({
      citas: [cita()],
      documentos: conDocumento(),
      censo: [SLUG],
      censoDePartida: PARTIDA,
    });
    expect(resultado.ok).toBe(false);
    expect(resultado.fallos[0].regla).toMatch(/Quítela del censo/);
    expect(resultado.pendientes).toEqual([]);
  });

  it('un documento ausente falla nombrando el fichero que falta', () => {
    const resultado = cotejar({ citas: [cita()], documentos: new Map(), censo: [] });
    expect(resultado.ok).toBe(false);
    expect(resultado.fallos[0].regla).toContain(`corpus/fuentes/${DOCUMENTO}.txt`);
    expect(resultado.fallos[0].regla).toMatch(/falta/i);
  });

  it('un documento que ocupa el nombre pero no se deja analizar tiene su propio fallo', () => {
    const resultado = cotejar({ citas: [cita()], documentos: conDocumento(null), censo: [] });
    expect(resultado.ok).toBe(false);
    expect(resultado.fallos[0].ruta).toBe(`corpus/fuentes/${DOCUMENTO}.txt`);
    expect(resultado.fallos[0].regla).toMatch(/forma que produce la recuperación/);
  });

  it('una Cita con Fuente pero sin obra falla: el documento se nombra por Fuente y obra', () => {
    const resultado = cotejar({
      citas: [cita({ obra: undefined })],
      documentos: conDocumento(),
      censo: [],
    });
    expect(resultado.ok).toBe(false);
    expect(resultado.fallos[0].regla).toMatch(/no declara obra/);
  });

  it('recoge todos los fallos, no solo el primero', () => {
    const resultado = cotejar({
      citas: [
        cita({ slug: 'a', ruta: 'corpus/citas/a.md', texto: 'No está.' }),
        cita({ slug: 'b', ruta: 'corpus/citas/b.md', fuente: undefined }),
      ],
      documentos: conDocumento(),
      censo: [],
    });
    expect(resultado.fallos.map((f) => f.ruta)).toEqual(['corpus/citas/a.md', 'corpus/citas/b.md']);
  });

  it('el informe de fallos nombra cada ruta y cada regla, y no repite el titular', () => {
    const texto = formatearFallos([
      { ruta: 'corpus/citas/a.md', regla: 'Regla incumplida: lo que sea.' },
    ]);
    expect(texto).toContain('corpus/citas/a.md');
    expect(texto).toContain('Regla incumplida: lo que sea.');
    // El titular lo dice la excepción, y una sola vez.
    expect(texto).not.toMatch(/detiene la construcción/);
  });

  it('el titular y el resumen concuerdan en número', () => {
    expect(titularDeFallos(1)).toMatch(/1 incumplimiento\./);
    expect(titularDeFallos(3)).toMatch(/3 incumplimientos\./);
    expect(resumenDelBuild(1, 1, 38)).toBe(
      '1 Cita cotejada contra su documento; 1 pendiente de cotejo de un tope de 38.',
    );
    expect(resumenDelBuild(0, 38, 38)).toBe(
      '0 Citas cotejadas contra su documento; 38 pendientes de cotejo de un tope de 38.',
    );
  });
});

describe('el censo es un trinquete', () => {
  it('el tope no pasa del punto de partida medido de la épica', () => {
    // Bajarlo es lo que hace la 11.4 al cerrar deuda; subirlo es abrir el agujero que la
    // historia cierra, y tiene que ser un cambio deliberado de esta línea.
    expect(TOPE_DE_PENDIENTES_DE_COTEJO).toBeLessThanOrEqual(38);
  });

  it('el censo de partida no tiene más entradas que el tope', () => {
    expect(Object.keys(CENSO_DE_PARTIDA).length).toBeLessThanOrEqual(
      TOPE_DE_PENDIENTES_DE_COTEJO,
    );
  });

  it('un censo más largo que el tope rompe, y lo dice el cotejo, no una prueba', () => {
    // El tope vivía solo en la suite mientras el build imprimía el número como si lo
    // aplicara. Un trinquete que no detiene ninguna construcción no es un trinquete.
    const partida = { a: huellaDeTexto('A'), b: huellaDeTexto('B') };
    const resultado = cotejar({
      citas: [
        { slug: 'a', ruta: 'corpus/citas/a.md', texto: 'A' },
        { slug: 'b', ruta: 'corpus/citas/b.md', texto: 'B' },
      ],
      documentos: new Map(),
      censo: ['a', 'b'],
      censoDePartida: partida,
      tope: 1,
    });
    expect(resultado.ok).toBe(false);
    expect(resultado.fallos[0].regla).toMatch(/el tope es 1/);
  });

  it('una entrada que no es de las 38 de partida rompe el build', () => {
    // Sin esto el censo se cerraba por recuento: liberada una entrada por la 11.4,
    // quedaba un hueco donde meter una Cita nueva sin que nada se quejara.
    const resultado = cotejar({
      citas: [cita({ slug: 'cita-nueva-de-hoy', fuente: undefined })],
      documentos: new Map(),
      censo: ['cita-nueva-de-hoy'],
      censoDePartida: PARTIDA,
    });
    expect(resultado.ok).toBe(false);
    expect(resultado.fallos.some((f) => /no es una de las Citas anteriores a la v3/.test(f.regla)))
      .toBe(true);
  });

  it('reutilizar el slug de una Cita censada no hereda su exención', () => {
    // Borrar la Cita censada y escribir otra con su slug pasaba el recuento y la
    // identidad por slug. La huella del texto es lo que lo cierra.
    const resultado = cotejar({
      citas: [cita({ texto: 'Otra frase completamente distinta.', fuente: undefined })],
      documentos: new Map(),
      censo: [SLUG],
      censoDePartida: PARTIDA,
    });
    expect(resultado.ok).toBe(false);
    expect(resultado.fallos[0].regla).toMatch(/con otro texto/);
    expect(resultado.pendientes).toEqual([]);
  });

  it('la huella no distingue por espaciado ni por caracteres invisibles', () => {
    expect(huellaDeTexto(TEXTO)).toBe(huellaDeTexto(`  caminante,\n no hay\tcamino, se hace camino al andar. `));
    expect(huellaDeTexto(TEXTO)).not.toBe(huellaDeTexto('caminante, no hay caminó al andar.'));
  });
});

/**
 * La misma regla, aplicada por las tres puertas que escriben en `corpus/citas/`.
 *
 * El alta por lote y la aprobación de candidatas publicaban una Cita sin Fuente y la
 * construcción siguiente moría: la herramienta fabricaba el build roto que el cotejo
 * existe para impedir. Comparten esta función para no poder discrepar.
 */
describe('motivoParaNoPublicar', () => {
  it('una Cita con Fuente puede publicarse', () => {
    expect(motivoParaNoPublicar({ slug: 'x', texto: 'A', fuente: { id: 'g' } }, PARTIDA))
      .toBeUndefined();
  });

  it('una Cita del censo de partida, con su texto, puede publicarse sin Fuente', () => {
    expect(motivoParaNoPublicar({ slug: SLUG, texto: TEXTO }, PARTIDA)).toBeUndefined();
  });

  it('una Cita nueva sin Fuente no puede, y se le dice qué hacer', () => {
    const motivo = motivoParaNoPublicar({ slug: 'nueva', texto: 'A' }, PARTIDA);
    expect(motivo).toMatch(/recuperar\.ts/);
    expect(motivo).toMatch(/no admite altas/);
  });

  it('el slug de una censada con otro texto no puede', () => {
    expect(motivoParaNoPublicar({ slug: SLUG, texto: 'Otra cosa.' }, PARTIDA))
      .toMatch(/con otro texto/);
  });

  it('por omisión usa el censo de partida de verdad, no uno vacío', () => {
    const [slug, huella] = Object.entries(CENSO_DE_PARTIDA)[0];
    expect(huella).toMatch(/^[0-9a-f]{12}$/);
    expect(motivoParaNoPublicar({ slug, texto: 'un texto que no es el suyo' }))
      .toMatch(/con otro texto/);
  });
});

describe('la deuda contada para la auditoría', () => {
  const citas = [
    { slug: 'a', fuente: { id: 'g' } },
    { slug: 'b' },
    { slug: 'c' },
  ];

  it('cuenta las que tienen documento, las exentas y las entradas rancias', () => {
    const resumen = resumenDeCotejo(citas, ['b', 'ya-no-existe'], 38);
    expect(resumen).toEqual({ conDocumento: 1, pendientes: 1, rancias: 1, tope: 38 });
  });

  it('un corpus sin censo no tiene deuda', () => {
    expect(resumenDeCotejo(citas, [])).toMatchObject({ pendientes: 0, rancias: 0 });
  });

  it('una Cita cuya Fuente es null cuenta como sin documento', () => {
    // El corpus nunca debería escribir `fuente: null` —la convención es omitir—, pero
    // quien cuenta la deuda no puede fiarse de eso: contarla como documentada inflaría
    // justo el número que existe para medir SM-C1.
    expect(resumenDeCotejo([{ slug: 'a', fuente: null }], [])).toMatchObject({
      conDocumento: 0,
    });
  });

  it('la auditoría no reimplementa el recuento, lo importa', () => {
    /*
     * `tools/auditoria.ts` no tiene pruebas y no las puede tener sin montar un corpus:
     * es un guion suelto que escribe en la terminal. Lo que sí se puede exigir es que el
     * cálculo no viva ahí, sino en la función pura de arriba, que sí está probada.
     */
    const codigo = readFileSync(resolve(import.meta.dirname, '../../tools/auditoria.ts'), 'utf8');
    expect(codigo).toMatch(/resumenDeCotejo\(/);
    expect(codigo).not.toMatch(/\.filter\([^)]*fuente/);
  });
});

/**
 * El campo `fuente` de una Cita — la forma, que es lo que decide el esquema.
 *
 * Vive en `src/lib/admision.ts` y no aquí porque es una regla de admisión, pero se
 * prueba junto al cotejo porque es de esta historia y porque es lo único que ata una
 * Cita a su documento: si el esquema lo descarta, el cotejo no tiene de qué agarrarse.
 */
describe('la forma de la Fuente de una Cita', () => {
  it('admite la Fuente mínima: identificador y dirección', () => {
    expect(fuenteDeCita.safeParse(FUENTE).success).toBe(true);
  });

  it('una clave sobrante dice cuál sobra, no el mensaje genérico del objeto', () => {
    // Con `.strict()` y un solo mensaje para todo el objeto, un `licencia_` mal tecleado
    // contestaba «es un objeto con identificador y dirección» y dejaba al editor
    // releyendo una Fuente que ya tenía las dos cosas.
    const fallo = fuenteDeCita.safeParse({ ...FUENTE, licencia_: 'CC BY-SA 4.0' });
    expect(fallo.success).toBe(false);
    expect(fallo.error?.issues[0]?.message).toContain('licencia_');
    expect(fallo.error?.issues[0]?.message).not.toContain('es un objeto con');
  });

  it('sin dirección no pasa: es lo que permite volver a la Fuente y comprobarlo', () => {
    const fallo = fuenteDeCita.safeParse({ id: 'wikisource-es' });
    expect(fallo.error?.issues[0]?.message).toMatch(/dirección/);
  });

  it('lo que no es un objeto sigue diciendo qué se esperaba', () => {
    const fallo = fuenteDeCita.safeParse('https://es.wikisource.org/wiki/Ejemplo');
    expect(fallo.error?.issues[0]?.message).toMatch(/es un objeto con/);
  });
});

/**
 * AD-5 — la derivación de `src/lib/` es pura y no lee disco, y el cotejo lee el corpus
 * entero. Por eso vive en `tools/lib/` y lo aplica una integración de build.
 *
 * La prueba lo comprueba sobre el árbol en vez de darlo por sabido: la tentación de
 * acercar el cotejo al esquema —que está en `src/`— es real, y el día que alguien lo
 * mueva, `src/lib/` dejaría de ser puro sin que nada más se quejara.
 */
describe('el cotejo no vive en src/lib/', () => {
  const raiz = resolve(import.meta.dirname, '../..');

  function ficherosDe(dir: string): string[] {
    const encontrados: string[] = [];
    for (const entrada of readdirSync(dir)) {
      const ruta = join(dir, entrada);
      if (statSync(ruta).isDirectory()) encontrados.push(...ficherosDe(ruta));
      else if (/\.(ts|tsx|js|mjs)$/.test(entrada)) encontrados.push(ruta);
    }
    return encontrados;
  }

  const deSrcLib = ficherosDe(resolve(raiz, 'src/lib'));

  it('ningún fichero de src/lib/ lo nombra siquiera', () => {
    const culpables = deSrcLib.filter((ruta) => /\bcotejo\b/.test(readFileSync(ruta, 'utf8')));
    expect(culpables).toEqual([]);
  });

  it('la única lectura de disco de src/lib/ sigue siendo el dominio', () => {
    /*
     * `src/lib/dominio.ts` lee `public/CNAME`, que es configuración de despliegue y no
     * contenido, y es anterior a esta historia. Es la excepción escrita: si apareciera
     * una segunda, esta prueba lo dice en vez de dejarla pasar.
     */
    const conDisco = deSrcLib
      .filter((ruta) => /from\s+['"]node:fs(?:\/promises)?['"]/.test(readFileSync(ruta, 'utf8')))
      .map((ruta) => ruta.slice(raiz.length + 1).split('\\').join('/'));
    expect(conDisco).toEqual(['src/lib/dominio.ts']);
  });

  it('quien lo aplica es una integración enganchada en astro.config.mjs', () => {
    // Es el único sitio por el que pasan todas las construcciones: ahí es donde una Cita
    // escrita a mano cruza la misma puerta que una sembrada.
    const config = readFileSync(resolve(raiz, 'astro.config.mjs'), 'utf8');
    expect(config).toContain("from './integraciones/cotejo.ts'");
    expect(config).toMatch(/integrations:\s*\[[\s\S]*cotejoDeCitas\(\)/);
  });

  it('la integración se engancha al build y no se degrada a aviso', () => {
    const integracion = readFileSync(resolve(raiz, 'integraciones/cotejo.ts'), 'utf8');
    expect(integracion).toContain("'astro:build:start'");

    /*
     * La aserción se acota al gancho de build, no al módulo entero: prohibir `catch` en
     * todo el fichero impediría dar un error propio a un censo mal escrito, que es otra
     * cosa. Lo que no puede haber es un `catch` **alrededor del cotejo**, porque eso lo
     * convertiría en sugerencia.
     */
    const desde = integracion.indexOf("'astro:build:start'");
    const hasta = integracion.indexOf("'astro:server:setup'");
    const ganchoDeBuild = integracion.slice(desde, hasta === -1 ? undefined : hasta);
    expect(ganchoDeBuild).toMatch(/throw new Error/);
    expect(ganchoDeBuild).not.toMatch(/catch\s*[({]/);
  });

  it('en el servidor de desarrollo avisa, y está escrito por qué no rompe', () => {
    // `astro dev` no publica: es donde se arregla la Cita que no cuadra. La puerta está
    // en el build, y `astro preview` sirve un dist que ya pasó por ella.
    const integracion = readFileSync(resolve(raiz, 'integraciones/cotejo.ts'), 'utf8');
    expect(integracion).toContain("'astro:server:setup'");
    const desde = integracion.indexOf("'astro:server:setup'");
    const gancho = integracion.slice(desde);
    expect(gancho).toMatch(/logger\.warn/);
    expect(gancho).not.toMatch(/throw /);
    expect(integracion).toMatch(/no publica nada/);
  });
});
