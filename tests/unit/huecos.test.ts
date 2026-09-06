import { describe, expect, it, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  lineasDeClasicos,
  verHuecos,
  type AutorParaHuecos,
  type CitaParaHuecos,
} from '../../src/lib/huecos.ts';
import {
  MIN_CITAS_POR_COLECCION,
  MIN_CITAS_POR_TEMA,
  SUELO_TRADICION_LATINOAMERICANA,
  TECHO_CONCENTRACION_POR_AUTOR,
} from '../../src/lib/umbrales.ts';

const ejecutar = promisify(execFile);
const RAIZ = resolve(import.meta.dirname, '../..');

/** Historia 9.3 — qué le falta al Corpus. */

const TEMAS = [
  { slug: 'la-vida', nombre: 'La vida' },
  { slug: 'la-amistad', nombre: 'La amistad' },
  { slug: 'el-tiempo', nombre: 'El tiempo' },
];

/** `cuantas` Citas del Tema indicado, repartidas entre los Autores dados. */
function citasDe(tema: string, cuantas: number, autor = 'seneca'): CitaParaHuecos[] {
  return Array.from({ length: cuantas }, (_, i) => ({
    slug: `${autor}-${tema}-${i}`,
    autor,
    temas: [tema],
  }));
}

describe('Historia 9.3 — los Temas por debajo del umbral, con lo que les falta', () => {
  const citas = [
    ...citasDe('la-vida', MIN_CITAS_POR_TEMA + 2),
    ...citasDe('la-amistad', 1),
    ...citasDe('el-tiempo', MIN_CITAS_POR_TEMA - 4),
  ];
  const huecos = verHuecos(citas, TEMAS, []);

  it('los que llegan al umbral no son un hueco', () => {
    expect(huecos.temas.map((t) => t.slug)).not.toContain('la-vida');
  });

  it('dice cuántas Citas le faltan a cada uno', () => {
    const amistad = huecos.temas.find((t) => t.slug === 'la-amistad')!;
    expect(amistad.publicadas).toBe(1);
    expect(amistad.faltan).toBe(MIN_CITAS_POR_TEMA - 1);

    const tiempo = huecos.temas.find((t) => t.slug === 'el-tiempo')!;
    expect(tiempo.faltan).toBe(4);
  });

  it('primero lo que menos falta: eso se publica esta sesión', () => {
    // Al revés escondería el trabajo fácil detrás del que es un proyecto entero.
    expect(huecos.temas.map((t) => t.slug)).toEqual(['el-tiempo', 'la-amistad']);
  });

  it('un Tema sin ninguna Cita también es un hueco, no una ausencia', () => {
    const conVacio = verHuecos([], [{ slug: 'la-nada', nombre: 'La nada' }], []);
    expect(conVacio.temas[0].faltan).toBe(MIN_CITAS_POR_TEMA);
  });
});

describe('Historia 9.3 — el equilibrio de tradición frente al suelo', () => {
  const autores = (composicion: AutorParaHuecos['tradicion'][]): AutorParaHuecos[] =>
    composicion.map((tradicion, i) => ({ slug: `a${i}`, nombre: `A${i}`, tradicion }));

  it('cuenta la proporción sobre los Autores de tradición hispánica', () => {
    const { tradicion } = verHuecos([], [], autores(['latinoamericana', 'peninsular', 'peninsular', 'peninsular']));
    expect(tradicion.total).toBe(4);
    expect(tradicion.hispanicos).toBe(4);
    expect(tradicion.latinoamericana).toBe(1);
    expect(tradicion.porcentaje).toBe(25);
  });

  it('dice si alcanza el suelo comprometido, y cuál es', () => {
    const corto = verHuecos([], [], autores(['latinoamericana', 'peninsular', 'peninsular']));
    expect(corto.tradicion.suelo).toBe(SUELO_TRADICION_LATINOAMERICANA);
    expect(corto.tradicion.alcanzaElSuelo).toBe(false);

    const holgado = verHuecos([], [], autores(['latinoamericana', 'latinoamericana', 'peninsular']));
    expect(holgado.tradicion.alcanzaElSuelo).toBe(true);
  });

  it('los que no la declaran se enseñan aparte, y cuentan en el denominador', () => {
    /*
     * Sumarlos a «peninsular» daría un porcentaje más bajo que el real y sumarlos al otro
     * lado, uno más alto: por eso tienen recuento propio y no se imputan a ninguna.
     *
     * Pero **sí cuentan en el denominador del suelo**, que es la lectura conservadora. La v6
     * los sacó un momento y con eso un fallo de captura *mejoraba* el indicador: 1
     * latinoamericano declarado y 2 sin clasificar informaban el 100 % y «por encima del
     * suelo». Un dato que falta no puede declarar cumplido un compromiso.
     */
    const { tradicion } = verHuecos([], [], autores(['latinoamericana', undefined, undefined]));
    expect(tradicion.sinDeclarar).toBe(2);
    expect(tradicion.peninsular).toBe(0);
    expect(tradicion.hispanicos).toBe(3);
    expect(tradicion.porcentaje).toBe(33.3);
    expect(tradicion.alcanzaElSuelo).toBe(false);
  });

  it('«otra» no es un cajón de sastre: se cuenta y se ve', () => {
    // Séneca es hispanorromano; forzarlo a una de las dos tradiciones falsearía las dos.
    const { tradicion } = verHuecos([], [], autores(['otra', 'latinoamericana']));
    expect(tradicion.otra).toBe(1);
    // Y desde la v6 no diluye: el único hispánico es latinoamericano, así que el 100 %.
    expect(tradicion.porcentaje).toBe(100);
  });

  it('un Corpus sin Autores no divide por cero', () => {
    // Ni informa un 0 % que nadie ha medido: sin hispánicos no hay reparto, y se dice así.
    expect(verHuecos([], [], []).tradicion.porcentaje).toBeUndefined();
    expect(verHuecos([], [], []).tradicion.hispanicos).toBe(0);
    expect(verHuecos([], [], []).tradicion.alcanzaElSuelo).toBe(false);
  });
});

/**
 * Historia 19.2 — el suelo se mide sobre hispánicos y los clásicos se cuentan aparte.
 *
 * El compromiso del brief es «no escorar hacia España»: una afirmación sobre el reparto
 * **entre** peninsulares y latinoamericanos, nunca sobre cuántos griegos hay. Medido sobre el
 * Corpus entero, cada clásico que entraba diluía un compromiso que no tenía nada que ver con
 * él. Lo que cambia es el denominador; el 40 % sigue donde estaba.
 */
describe('Historia 19.2 — el suelo panhispánico se mide sobre hispánicos', () => {
  const autores = (composicion: AutorParaHuecos['tradicion'][]): AutorParaHuecos[] =>
    composicion.map((tradicion, i) => ({ slug: `a${i}`, nombre: `A${i}`, tradicion }));

  /** El Corpus medido el 2026-09-05: 18 latinoamericanos, 14 peninsulares, 3 de otra. */
  const CORPUS_DEL_5_DE_SEPTIEMBRE = autores([
    ...Array.from({ length: 18 }, () => 'latinoamericana' as const),
    ...Array.from({ length: 14 }, () => 'peninsular' as const),
    ...Array.from({ length: 3 }, () => 'otra' as const),
  ]);

  it('18 de 32 hispánicos son el 56,2 %, y no el 51,4 % de 35 Autores', () => {
    /*
     * 18/32 es el 56,25 % exacto, y el empate cae hacia abajo: un suelo no se alcanza por
     * redondeo. Es la cifra con la que §6.1 del PRD escribe esta misma medición.
     */
    const { tradicion } = verHuecos([], [], CORPUS_DEL_5_DE_SEPTIEMBRE);
    expect(tradicion.total).toBe(35);
    expect(tradicion.hispanicos).toBe(32);
    expect(tradicion.porcentaje).toBe(56.2);
    expect(tradicion.alcanzaElSuelo).toBe(true);
  });

  it('cuarenta clásicos nuevos no mueven el suelo ni una décima', () => {
    /*
     * Es el cálculo que motivó la historia: con el denominador viejo el indicador habría
     * caído del 51,4 % al 24 % sin que un solo Autor hispánico cambiara de sitio.
     */
    const antes = verHuecos([], [], CORPUS_DEL_5_DE_SEPTIEMBRE).tradicion;
    const despues = verHuecos(
      [],
      [],
      autores([
        ...Array.from({ length: 18 }, () => 'latinoamericana' as const),
        ...Array.from({ length: 14 }, () => 'peninsular' as const),
        ...Array.from({ length: 43 }, () => 'otra' as const),
      ]),
    ).tradicion;

    expect(despues.porcentaje).toBe(antes.porcentaje);
    expect(despues.hispanicos).toBe(antes.hispanicos);
    expect(despues.alcanzaElSuelo).toBe(true);
    // Y el censo entero sí crece: la cuenta de arriba no es la que se congela.
    expect(despues.total).toBe(75);
  });

  it('el valor del suelo no se ha tocado: lo que cambió es sobre qué se mide', () => {
    expect(SUELO_TRADICION_LATINOAMERICANA).toBe(40);
  });

  it('un fallo de captura no puede mejorar el indicador', () => {
    /*
     * El caso que lo destapó: 34 Autores sin clasificar y **un** latinoamericano declarado.
     * Con los sin declarar fuera del denominador eso informaba el 100 % y «por encima del
     * suelo» — o sea que dejar de clasificar mejoraba la cifra. Dentro, informa el 2,9 % y
     * por debajo, que es lo que de verdad se ha medido.
     */
    const { tradicion } = verHuecos(
      [],
      [],
      autores(['latinoamericana', ...Array.from({ length: 34 }, () => undefined)]),
    );

    expect(tradicion.sinDeclarar).toBe(34);
    expect(tradicion.hispanicos).toBe(35);
    expect(tradicion.porcentaje).toBe(2.9);
    expect(tradicion.alcanzaElSuelo).toBe(false);
  });

  it('y los de tradición otra siguen fuera, que es lo que la historia sí cambió', () => {
    // La base del suelo es el censo entero menos los clásicos, sin declarar incluidos.
    const { tradicion } = verHuecos(
      [],
      [],
      autores(['latinoamericana', 'peninsular', undefined, 'otra', 'otra']),
    );

    expect(tradicion.total).toBe(5);
    expect(tradicion.hispanicos).toBe(3);
    expect(tradicion.hispanicos).toBe(tradicion.total - tradicion.otra);
  });

  it('sin Autores hispánicos lo dice y no publica cifra', () => {
    // Tres clásicos y ningún hispánico: el reparto que se promete no existe todavía.
    const { tradicion } = verHuecos([], [], autores(['otra', 'otra', 'otra']));
    expect(tradicion.total).toBe(3);
    expect(tradicion.hispanicos).toBe(0);
    expect(tradicion.porcentaje).toBeUndefined();
    expect(tradicion.alcanzaElSuelo).toBe(false);
  });
});

describe('Historia 19.2 — los clásicos se cuentan aparte, con meta propia', () => {
  const autores = (composicion: AutorParaHuecos['tradicion'][]): AutorParaHuecos[] =>
    composicion.map((tradicion, i) => ({ slug: `a${i}`, nombre: `A${i}`, tradicion }));

  it('cuenta los de tradición otra en su propia cuenta', () => {
    const { clasicos, tradicion } = verHuecos(
      [],
      [],
      autores(['otra', 'otra', 'latinoamericana', 'peninsular']),
    );
    expect(clasicos.autores).toBe(2);
    // Y la misma cifra sigue estando en el equilibrio: es una cuenta aparte, no un traslado.
    expect(tradicion.otra).toBe(2);
  });

  it('sin listón puesto no se inventa uno: la meta queda ausente', () => {
    /*
     * Cuántos clásicos quiere el Corpus es un listón, y el listón lo pone Héctor. Un número
     * por defecto aquí sería la política decidiendo lo que no le toca.
     */
    const { clasicos } = verHuecos([], [], autores(['otra']));
    expect(clasicos.autores).toBe(1);
    expect(clasicos.meta).toBeUndefined();
    expect(clasicos.faltan).toBeUndefined();
  });

  /*
   * Y con el listón puesto. `META_AUTORES_DE_OTRA_TRADICION` es `undefined` a propósito y va a
   * seguir siéndolo hasta que Héctor lo ponga, así que **la rama de la meta no la corría
   * nadie**: ni una prueba ni un usuario. Se inyecta la constante para correrla, que es la
   * única manera de saber que el día que se ponga el número el informe dice lo que debe.
   */
  it('con el listón puesto dice cuántos faltan, y nunca un negativo', async () => {
    vi.resetModules();
    vi.doMock('../../src/lib/umbrales.ts', async () => ({
      ...(await vi.importActual<typeof import('../../src/lib/umbrales.ts')>(
        '../../src/lib/umbrales.ts',
      )),
      META_AUTORES_DE_OTRA_TRADICION: 12,
    }));

    const { verHuecos: conListon } = await import('../../src/lib/huecos.ts');

    const corto = conListon([], [], autores(['otra', 'otra', 'latinoamericana'])).clasicos;
    expect(corto.meta).toBe(12);
    expect(corto.autores).toBe(2);
    expect(corto.faltan).toBe(10);

    // Pasarse del listón no es un hueco de signo contrario.
    const pasado = conListon(
      [],
      [],
      autores(Array.from({ length: 15 }, () => 'otra' as const)),
    ).clasicos;
    expect(pasado.faltan).toBe(0);

    vi.doUnmock('../../src/lib/umbrales.ts');
    vi.resetModules();
  });
});

/**
 * Historia 19.2 — el bloque de clásicos del informe, con las tres ramas corridas.
 *
 * Vive en `src/lib/huecos.ts` y no dentro de la orden justamente para poder correrlas: la de
 * la meta puesta es inalcanzable mientras el listón no lo esté, y ahí es donde se escondía un
 * «Faltan 1» que ninguna prueba había leído.
 */
describe('Historia 19.2 — las líneas de los clásicos, y el plural', () => {
  it('sin listón dice que lo pone Héctor y no inventa cifra', () => {
    const texto = lineasDeClasicos({ autores: 3 }).join('\n');

    expect(texto).toContain('sin poner');
    expect(texto).toContain('el listón lo pone Héctor');
    expect(texto).not.toMatch(/Faltan?\b/u);
  });

  it('con uno faltando dice «Falta 1 Autor», no «Faltan 1»', () => {
    const texto = lineasDeClasicos({ autores: 11, meta: 12, faltan: 1 }).join('\n');

    expect(texto).toContain('Falta 1 Autor para la meta de clásicos.');
    expect(texto).not.toContain('Faltan 1');
  });

  it('con varios faltando concuerda en plural', () => {
    const texto = lineasDeClasicos({ autores: 2, meta: 12, faltan: 10 }).join('\n');

    expect(texto).toContain('Faltan 10 Autores para la meta de clásicos.');
  });

  it('con la meta puesta y cumplida lo dice y no promete trabajo', () => {
    const texto = lineasDeClasicos({ autores: 15, meta: 12, faltan: 0 }).join('\n');

    expect(texto).toContain('Meta de clásicos alcanzada.');
    expect(texto).not.toMatch(/Faltan?\b/u);
  });
});

/**
 * Historia 19.2 — cuántas Citas más caben de cada Autor antes de rozar el techo.
 *
 * El techo de concentración rige sin excepción, y «en profundidad» no significa que uno solo
 * pese más: significa que el total crece en paralelo. Este margen es lo que dice **dónde**
 * cabe la profundidad sin romperlo.
 */
describe('Historia 19.2 — el margen bajo el techo, Autor por Autor', () => {
  const autoresDe = (slugs: string[]): AutorParaHuecos[] =>
    slugs.map((slug) => ({ slug, nombre: slug, tradicion: 'peninsular' as const }));

  it('de un Autor con 181 Citas en un Corpus de 1.639 caben 76 más', () => {
    // El estado medido el 2026-09-05, y la cuenta que el bucle hacía a mano cada sesión.
    const citas = [
      ...citasDe('la-vida', 181, 'el-que-mas'),
      ...citasDe('la-vida', 1639 - 181, 'los-demas'),
    ];
    const { margenPorAutor } = verHuecos(citas, TEMAS, autoresDe(['el-que-mas', 'los-demas']));
    const elQueMas = margenPorAutor.find((m) => m.autor === 'el-que-mas')!;

    expect(elQueMas.citas).toBe(181);
    expect(elQueMas.caben).toBe(76);
    // Y sembrar esas 76 no lo mete por encima del techo, que es la propiedad que importa.
    expect((181 + 76) / (1639 + 76)).toBeLessThanOrEqual(TECHO_CONCENTRACION_POR_AUTOR / 100);
  });

  it('primero el de menos margen: es el que antes tocaría el techo', () => {
    /*
     * Con dos Autores el reparto suma el 100 % y alguno pasa siempre del techo, así que hace
     * falta un tercero que cargue el volumen. El orden que se mide es el de los dos que
     * quedan por debajo: el que más aporta va antes, porque es donde menos sitio queda.
     */
    const citas = [
      ...citasDe('la-vida', 20, 'mucho'),
      ...citasDe('la-vida', 5, 'poco'),
      ...citasDe('la-vida', 175, 'el-grueso'),
    ];
    const { margenPorAutor } = verHuecos(
      citas,
      TEMAS,
      autoresDe(['mucho', 'poco', 'el-grueso']),
    );
    const orden = margenPorAutor.map((m) => m.autor);

    expect(orden.indexOf('mucho')).toBeLessThan(orden.indexOf('poco'));
    expect(margenPorAutor.find((m) => m.autor === 'mucho')!.caben).toBeLessThan(
      margenPorAutor.find((m) => m.autor === 'poco')!.caben,
    );
    // Y el que ya excede va el primero de todos, con margen cero: ahí no cabe ninguna.
    expect(orden[0]).toBe('el-grueso');
    expect(margenPorAutor[0].caben).toBe(0);
  });

  it('un Autor admitido y sin sembrar también trae su margen: ahí es donde más cabe', () => {
    const citas = citasDe('la-vida', 40, 'sembrado');
    const { margenPorAutor } = verHuecos(citas, TEMAS, autoresDe(['sembrado', 'sin-sembrar']));
    const virgen = margenPorAutor.find((m) => m.autor === 'sin-sembrar')!;

    expect(virgen.citas).toBe(0);
    expect(virgen.caben).toBeGreaterThan(margenPorAutor.find((m) => m.autor === 'sembrado')!.caben);
  });

  it('de quien ya excede el techo no cabe ninguna, y no devuelve un negativo', () => {
    /*
     * La primera redacción medía dos Autores de un Corpus de diez —7 y 3 Citas— y afirmaba
     * que el que excede iba **primero**. Los dos excedían el 15 %, los dos daban margen cero,
     * y el orden lo decidía el desempate alfabético: «gracian» antes que «otro». La aserción
     * de orden no comprobaba nada.
     *
     * Aquí el que excede se llama «zulueta» y el que tiene sitio «abarca», a propósito: si el
     * orden saliera del alfabeto, saldría justo al revés de lo que se afirma.
     */
    const citas = [
      ...citasDe('la-vida', 20, 'zulueta'),
      ...citasDe('la-vida', 5, 'abarca'),
      ...citasDe('la-vida', 75, 'el-relleno'),
    ];
    const { margenPorAutor } = verHuecos(
      citas,
      TEMAS,
      autoresDe(['zulueta', 'abarca', 'el-relleno']),
    );
    const orden = margenPorAutor.map((m) => m.autor);
    const zulueta = margenPorAutor.find((m) => m.autor === 'zulueta')!;
    const abarca = margenPorAutor.find((m) => m.autor === 'abarca')!;

    // 20 de 100 es el 20 %: pasa del techo, y no cabe ninguna más ni sale un negativo.
    expect(zulueta.caben).toBe(0);
    expect(abarca.caben).toBeGreaterThan(0);
    expect(orden.indexOf('zulueta')).toBeLessThan(orden.indexOf('abarca'));
  });

  it('en la frontera exacta da el mayor que cabe, no uno menos', () => {
    /*
     * El caso mínimo del error de coma flotante que arrastraba la 15.3: 1 Cita de un Corpus
     * de 18 dejaba sitio para 2 —(1+2)/(18+2) es el 15 % justo— y la función decía 1. Un
     * barrido de todos los pares hasta 5.000 daba 44.441 subestimaciones de exactamente 1,
     * todas cuando la respuesta cae sobre un entero.
     */
    const citas = [
      ...citasDe('la-vida', 1, 'el-uno'),
      ...citasDe('la-vida', 17, 'el-resto'),
    ];
    const { margenPorAutor } = verHuecos(citas, TEMAS, autoresDe(['el-uno', 'el-resto']));

    expect(margenPorAutor.find((m) => m.autor === 'el-uno')!.caben).toBe(2);
  });

  it('sin Autores no hay margen que medir, y no revienta', () => {
    expect(verHuecos([], [], []).margenPorAutor).toEqual([]);
  });
});

/**
 * Historia 12.4 — las Colecciones entran en la misma vista, con la misma lectura.
 *
 * El recuento llega **ya resuelto**: quién resuelve la pertenencia de una Colección es
 * `resolverColeccion`, y esta vista no lo repite. Lo que sí es suyo, y es lo que se fija
 * aquí, es que el umbral y el orden se apliquen igual que a un Tema.
 */
describe('Historia 12.4 — las Colecciones por debajo de su umbral', () => {
  const colecciones = [
    { slug: 'aforismos', nombre: 'Aforismos', resueltas: MIN_CITAS_POR_COLECCION - 9 },
    { slug: 'frases-cortas', nombre: 'Frases cortas', resueltas: MIN_CITAS_POR_COLECCION - 2 },
    { slug: 'ya-publicada', nombre: 'Ya publicada', resueltas: MIN_CITAS_POR_COLECCION },
  ];
  const huecos = verHuecos([], [], [], [], colecciones);

  it('la que llega al umbral no es un hueco', () => {
    expect(huecos.colecciones.map((c) => c.slug)).not.toContain('ya-publicada');
  });

  it('dice cuántas Citas le faltan a cada una, sobre el recuento resuelto', () => {
    const aforismos = huecos.colecciones.find((c) => c.slug === 'aforismos')!;
    expect(aforismos.publicadas).toBe(MIN_CITAS_POR_COLECCION - 9);
    expect(aforismos.faltan).toBe(9);
  });

  it('primero lo que menos falta, igual que con los Temas', () => {
    expect(huecos.colecciones.map((c) => c.slug)).toEqual(['frases-cortas', 'aforismos']);
  });

  it('sin Colecciones no hay huecos de Colección: es el estado de hoy', () => {
    expect(verHuecos([], [], []).colecciones).toEqual([]);
  });
});

describe('Historia 9.3 — LC-6: lo anunciado en portada supera el umbral', () => {
  it('señala un Tema anunciado que se queda corto', () => {
    const huecos = verHuecos(citasDe('la-amistad', 3), TEMAS, [], ['la-amistad']);
    expect(huecos.anunciadosBajoUmbral).toEqual(['la-amistad']);
  });

  it('el corpus real no anuncia ninguno por debajo del umbral', async () => {
    const { stdout } = await ejecutar('npx', ['tsx', 'tools/huecos.ts', '--json'], { cwd: RAIZ });
    const informe = JSON.parse(stdout);
    expect(informe.anunciadosBajoUmbral).toEqual([]);
  });
});

/**
 * Historia 9.3, matizada por la 11.3.
 *
 * El título de antes —«informa, no elige»— dejó de ser verdad del código que esta prueba
 * vigila: el informe cierra proponiendo el objetivo de la sesión. Lo que **sigue** siendo
 * verdad, y es lo que había detrás del criterio, es que no nombra a nadie: dice qué hueco
 * cerrar y caracteriza al Autor que falta por su tradición. Quién entra en el Corpus es
 * la única decisión que este producto no delega.
 *
 * La comprobación tampoco es ya una lista negra de cuatro frases —que cualquier texto
 * nuevo esquiva por casualidad—, sino la regla entera: los únicos nombres propios que el
 * informe escribe van entre «», y todos tienen que ser Temas.
 */
/**
 * Historia 19.2 — el informe enseña las dos cuentas por separado y no las mezcla.
 *
 * Se prueba contra la orden y no contra la vista porque lo que la historia arregla es lo que
 * se lee antes de decidir a quién sembrar: un solo bloque con «de otra tradición» como una
 * fila más era exactamente lo que hacía creer que admitir a un clásico escoraba el Corpus.
 */
describe('Historia 19.2 — el informe: dos cuentas, y el margen bajo el techo', () => {
  it('el suelo va en su bloque y dice sobre qué se mide', async () => {
    const { stdout } = await ejecutar('npx', ['tsx', 'tools/huecos.ts'], { cwd: RAIZ });
    expect(stdout).toContain('Suelo panhispánico (sobre todos los Autores menos los de tradición otra)');
    expect(stdout).toContain('Base del suelo:');
    // Y dice que los sin declarar cuentan en ella: quien lee la cifra tiene que saberlo.
    expect(stdout).toContain('cuentan en la base del suelo');
    expect(stdout).toContain(`${SUELO_TRADICION_LATINOAMERICANA} %`);
  });

  it('los clásicos van en el suyo, con su meta y sin listón puesto', async () => {
    const { stdout } = await ejecutar('npx', ['tsx', 'tools/huecos.ts'], { cwd: RAIZ });
    expect(stdout).toContain('Clásicos y otras tradiciones');
    expect(stdout).toContain('el listón lo pone Héctor');
    expect(stdout).toContain('No entran en el denominador del suelo panhispánico');
  });

  it('y debajo, cuántas Citas más caben antes de rozar el techo', async () => {
    const { stdout } = await ejecutar('npx', ['tsx', 'tools/huecos.ts'], { cwd: RAIZ });
    expect(stdout).toContain('Margen bajo el techo de concentración por Autor');
    expect(stdout).toMatch(/Del más representado caben:\s+\d+ Citas más suyas/u);
  });

  it('el margen se presenta como capacidad y no como prioridad', async () => {
    /*
     * Presentarlo como «con lo que se decide dónde sembrar» es priorizar por
     * **disponibilidad**, que es el eje que FR-49 prohíbe explícitamente: entre dos Autores
     * admisibles entra antes el que más se busca. El informe dice dónde cabe; la prioridad la
     * pone la demanda.
     */
    const { stdout } = await ejecutar('npx', ['tsx', 'tools/huecos.ts'], { cwd: RAIZ });

    expect(stdout).toContain('capacidad, no prioridad');
    expect(stdout).toContain('la prioridad la pone la demanda (FR-49).');
  });

  it('separa a quien está en el límite de quien ya pasó el techo', async () => {
    /*
     * Eran una sola cifra, «Autores que ya rozan el techo», y mezclaba dos estados que se
     * cierran de manera distinta: al del límite no se le siembra más, y al que ya lo pasó se
     * le diluye sembrando **a los demás**. El segundo sale de la Meta, que ya lo cuenta.
     */
    const { stdout } = await ejecutar('npx', ['tsx', 'tools/huecos.ts'], { cwd: RAIZ });

    expect(stdout).toContain('Autores en el límite:');
    expect(stdout).toContain('Autores por encima del techo:');
    expect(stdout).not.toContain('Autores que ya rozan el techo');
  });

  it('los tres recuentos de Autores dicen cuál cuenta cuál', async () => {
    /*
     * Tres censos en el mismo informe —los declarados, los que además tienen margen medido y
     * los de la Meta, que son solo los que firman— coinciden hoy y divergen en silencio en
     * cuanto una Cita apunte a un Autor no declarado. Etiquetados, la divergencia se lee.
     */
    const { stdout } = await ejecutar('npx', ['tsx', 'tools/huecos.ts'], { cwd: RAIZ });

    expect(stdout).toContain('Autores declarados en el Corpus:');
    expect(stdout).toContain('Autores con margen medido:');
    expect(stdout).toContain('Autores con Cita');
    // Y ninguno se llama solo «Autores», que es lo que los hacía indistinguibles.
    expect(stdout).not.toMatch(/^Autores: /mu);
  });

  it('el margen de cada Autor viaja en --json, con su slug', async () => {
    // Dato para el bucle, no una propuesta a una persona: en el texto no sale ningún nombre,
    // y de eso responde la prueba de guillemets de la 9.3.
    const { stdout } = await ejecutar('npx', ['tsx', 'tools/huecos.ts', '--json'], { cwd: RAIZ });
    const informe = JSON.parse(stdout);

    expect(Array.isArray(informe.margenPorAutor)).toBe(true);
    expect(informe.margenPorAutor.length).toBeGreaterThan(0);
    expect(informe.margenPorAutor[0]).toHaveProperty('autor');
    expect(informe.margenPorAutor[0]).toHaveProperty('caben');
    // De menos margen a más: el primero es el que antes tocaría el techo.
    const margenes = informe.margenPorAutor.map((m: { caben: number }) => m.caben);
    expect([...margenes].sort((a: number, b: number) => a - b)).toEqual(margenes);
  });

  it('el corpus real mide el suelo sobre hispánicos y cuenta los clásicos aparte', async () => {
    const { stdout } = await ejecutar('npx', ['tsx', 'tools/huecos.ts', '--json'], { cwd: RAIZ });
    const { tradicion, clasicos } = JSON.parse(stdout);

    /*
     * Las identidades, y **solo** identidades. Dos aserciones de aquí exigían que hubiera al
     * menos un Autor de tradición `otra` en el corpus real —«los hispánicos son menos que el
     * total», «el porcentaje sube al quitarlos»— y se ponían rojas el día que ese recuento
     * bajara a cero: por los datos y no por el código, que es una prueba que no dice la
     * verdad sobre lo que vigila. La relación que sí es del código es que la base del suelo
     * es el censo entero menos los clásicos, y esa se cumple también con cero clásicos.
     */
    expect(tradicion.hispanicos).toBe(
      tradicion.latinoamericana + tradicion.peninsular + tradicion.sinDeclarar,
    );
    expect(tradicion.hispanicos).toBe(tradicion.total - tradicion.otra);
    expect(clasicos.autores).toBe(tradicion.otra);
  });

  it('y los clásicos, los haya o no, quedan fuera del denominador del suelo', async () => {
    /*
     * La propiedad sin depender del recuento de hoy: quitar los clásicos no puede bajar el
     * porcentaje, y con al menos uno lo sube. Se afirma sobre el corpus real medido, y el
     * caso de «ninguno» se afirma como igualdad en vez de saltárselo.
     */
    const { stdout } = await ejecutar('npx', ['tsx', 'tools/huecos.ts', '--json'], { cwd: RAIZ });
    const { tradicion } = JSON.parse(stdout);
    const sobreElCorpusEntero =
      Math.round((tradicion.latinoamericana / tradicion.total) * 1000) / 10;

    if (tradicion.otra > 0) {
      expect(tradicion.porcentaje).toBeGreaterThan(sobreElCorpusEntero);
    } else {
      expect(tradicion.hispanicos).toBe(tradicion.total);
    }
  });
});

describe('Historia 9.3 y 11.3 — informa y propone, pero no nombra a nadie', () => {
  it('el informe cierra con el objetivo de la sesión', async () => {
    const { stdout } = await ejecutar('npx', ['tsx', 'tools/huecos.ts'], { cwd: RAIZ });
    expect(stdout).toContain('Objetivo de la sesión');
    expect(stdout).toContain('Sale del hueco:');
  });

  it('y lo único que entrecomilla son nombres de Tema', async () => {
    const { stdout } = await ejecutar('npx', ['tsx', 'tools/huecos.ts'], { cwd: RAIZ });
    const temas = new Set(
      readdirSync(resolve(RAIZ, 'corpus/temas'))
        .filter((f) => f.endsWith('.yml'))
        .map(
          (f) =>
            /^nombre:\s*"?([^"\n]+?)"?\s*$/m.exec(
              readFileSync(resolve(RAIZ, 'corpus/temas', f), 'utf8'),
            )?.[1],
        ),
    );
    for (const [, termino] of stdout.matchAll(/«([^»]+)»/gu)) {
      expect(temas, termino).toContain(termino);
    }
  });

  it('el módulo no tiene por dónde nombrarlos: el equilibrio de tradición son cifras', () => {
    const huecos = verHuecos([], [], [{ slug: 'seneca', nombre: 'Séneca', tradicion: 'otra' }]);

    // Nombres de Autor no salen de aquí, y no por convención: el bloque de tradición no
    // tiene ni un campo de texto donde pudiera colarse uno.
    expect(JSON.stringify(huecos)).not.toContain('Séneca');
    for (const [clave, valor] of Object.entries(huecos.tradicion)) {
      expect(typeof valor, clave).not.toBe('string');
    }
  });
});
