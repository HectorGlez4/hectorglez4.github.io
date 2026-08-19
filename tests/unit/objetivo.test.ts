import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { porcentajeEnEspañol } from '../../src/lib/formato.ts';
import { verHuecos, type AutorParaHuecos, type CitaParaHuecos, type Huecos } from '../../src/lib/huecos.ts';
import { lineasDeObjetivo, objetivoDeSesion, type ObjetivoDeSesion } from '../../src/lib/objetivo.ts';
import { MIN_CITAS_POR_TEMA, SUELO_TRADICION_LATINOAMERICANA } from '../../src/lib/umbrales.ts';

const RAIZ = resolve(import.meta.dirname, '../..');

/**
 * Historia 11.3 — el objetivo de cada sesión sale del hueco, no del criterio.
 *
 * Todo lo de aquí es sobre la derivación pura: la política recibe lo que `verHuecos` ya
 * calculó y no toca disco, así que la matriz entera se prueba sin corpus. Lo que se mide
 * es la **determinación**: qué gana a qué, y que la frase sea siempre la misma.
 */

const TEMAS = [
  { slug: 'el-saber', nombre: 'El saber' },
  { slug: 'el-tiempo', nombre: 'El tiempo' },
  { slug: 'la-amistad', nombre: 'La amistad' },
];

/** `cuantas` Citas del Tema indicado, para llevarlo hasta donde haga falta. */
function citasDe(tema: string, cuantas: number, autor = 'seneca'): CitaParaHuecos[] {
  return Array.from({ length: cuantas }, (_, i) => ({
    slug: `${autor}-${tema}-${i}`,
    autor,
    temas: [tema],
  }));
}

function autores(composicion: AutorParaHuecos['tradicion'][]): AutorParaHuecos[] {
  return composicion.map((tradicion, i) => ({ slug: `a${i}`, nombre: `A${i}`, tradicion }));
}

/** Una composición que alcanza el suelo, para poder mirar los Temas sin que la tapen. */
const CON_EL_SUELO_ALCANZADO = autores(['latinoamericana', 'latinoamericana', 'peninsular']);

/** Una composición por debajo del suelo: 1 de 4 es el 25 %, y el suelo es el 40 %. */
const POR_DEBAJO_DEL_SUELO = autores([
  'latinoamericana',
  'peninsular',
  'peninsular',
  'peninsular',
]);

describe('Historia 11.3 — la tradición por debajo del suelo tiene prioridad', () => {
  const objetivo = objetivoDeSesion(
    verHuecos(citasDe('el-tiempo', MIN_CITAS_POR_TEMA - 1), TEMAS, POR_DEBAJO_DEL_SUELO),
  );

  it('el titular es cerrar el hueco de tradición', () => {
    expect(objetivo.clase).toBe('tradicion');
    expect(objetivo.tradicion?.nombre).toBe('latinoamericana');
  });

  it('gana al Tema al que solo le falta una Cita', () => {
    /*
     * Es el corazón de la historia. Un Tema corto se cierra sembrando cualquier Autor de
     * los que ya están; el hueco de tradición solo se cierra admitiendo Autores nuevos,
     * que es más lento y más fácil de posponer. Si el Tema fácil ganase, el hueco caro no
     * se cerraría nunca — que es justamente el sesgo que hay que corregir.
     */
    const huecos = verHuecos(
      citasDe('el-tiempo', MIN_CITAS_POR_TEMA - 1),
      TEMAS,
      POR_DEBAJO_DEL_SUELO,
    );
    expect(huecos.temas[0].faltan).toBe(1);
    expect(objetivoDeSesion(huecos).clase).toBe('tradicion');
  });

  it('declara de qué hueco sale, con la proporción y el suelo', () => {
    expect(objetivo.hueco).toContain('1');
    expect(objetivo.hueco).toContain('25 %');
    expect(objetivo.hueco).toContain(`${SUELO_TRADICION_LATINOAMERICANA} %`);
  });

  it('dice cuántos Autores de esa tradición faltan para alcanzar el suelo', () => {
    // Cada alta sube numerador y denominador: 1 de 4 no llega al 40 % sumando uno solo,
    // pero 2 de 5 sí. La diferencia contra el suelo a secas daría otra cifra y sería falsa.
    expect(objetivo.tradicion?.autoresQueFaltan).toBe(1);
    expect(objetivo.objetivo).toContain('falta 1');
  });

  it('con el hueco más ancho, la cifra crece y el plural también', () => {
    // 2 de 12 es el punto de partida medido de la Épica 11: el 16,7 % frente al 40 %.
    const objetivoReal = objetivoDeSesion(
      verHuecos(
        [],
        [],
        autores([
          'latinoamericana',
          'latinoamericana',
          'otra',
          ...Array.from({ length: 9 }, () => 'peninsular' as const),
        ]),
      ),
    );
    expect(objetivoReal.tradicion?.porcentaje).toBe(16.7);
    expect(objetivoReal.tradicion?.autoresQueFaltan).toBe(5);
    expect(objetivoReal.objetivo).toContain('faltan 5');
  });

  it('un suelo que no se alcanza admitiendo Autores no promete ninguna cifra', () => {
    /*
     * Con un suelo del 100 % no hay número de altas que baste mientras quede un Autor de
     * otra tradición. Prometer una cifra ahí sería prometer que basta con sembrar.
     */
    const base = verHuecos([], [], POR_DEBAJO_DEL_SUELO);
    const imposible: Huecos = {
      ...base,
      tradicion: { ...base.tradicion, suelo: 100, alcanzaElSuelo: false },
    };
    const objetivoImposible = objetivoDeSesion(imposible);
    expect(objetivoImposible.clase).toBe('tradicion');
    expect(objetivoImposible.tradicion?.autoresQueFaltan).toBeUndefined();
    expect(objetivoImposible.objetivo).toContain('100 %');
    expect(objetivoImposible.objetivo).not.toMatch(/falta[n]? \d/);
  });
});

/**
 * Los dos ejes. La rama de tradición es la rama en la que el Corpus está hoy y en la que
 * estará durante toda la Historia 11.4: si solo dijera qué clase de Autor admitir, la
 * sesión tendría que volver a elegir por su cuenta dónde colocar sus Citas —con seis
 * Temas por debajo del umbral—, que es exactamente lo que esta política existe para
 * evitar. La prioridad decide cuál es el titular, no cuál se dice.
 */
describe('Historia 11.3 — el objetivo lleva los dos ejes: a qué Tema y de qué tradición', () => {
  const conAmbos = objetivoDeSesion(
    verHuecos(
      [...citasDe('el-tiempo', MIN_CITAS_POR_TEMA - 3), ...citasDe('la-amistad', 1)],
      TEMAS,
      POR_DEBAJO_DEL_SUELO,
    ),
  );

  it('el titular sigue siendo la tradición', () => {
    expect(conAmbos.clase).toBe('tradicion');
  });

  it('y además dice a qué Tema van las Citas de la sesión', () => {
    expect(conAmbos.tema?.slug).toBe('el-tiempo');
    expect(conAmbos.tema?.faltan).toBe(3);
    expect(conAmbos.objetivo).toContain('El tiempo');
    expect(conAmbos.objetivo).toContain('3 Citas');
  });

  it('el hueco declarado cubre los dos ejes', () => {
    expect(conAmbos.hueco).toContain('tradición latinoamericana');
    expect(conAmbos.hueco).toContain('El tiempo');
  });

  it('el eje de Tema es el mismo que elegiría la política si la tradición no mandara', () => {
    // Un segundo criterio para el mismo Tema sería un segundo desempate con el que
    // discrepar. El eje es el mismo con y sin déficit de tradición.
    const soloTema = objetivoDeSesion(
      verHuecos(
        [...citasDe('el-tiempo', MIN_CITAS_POR_TEMA - 3), ...citasDe('la-amistad', 1)],
        TEMAS,
        CON_EL_SUELO_ALCANZADO,
      ),
    );
    expect(soloTema.tema).toEqual(conAmbos.tema);
  });

  it('sin ningún Tema corto, la rama de tradición va sola y no se inventa uno', () => {
    const sinTemas = objetivoDeSesion(
      verHuecos(citasDe('el-tiempo', MIN_CITAS_POR_TEMA), [TEMAS[1]], POR_DEBAJO_DEL_SUELO),
    );
    expect(sinTemas.clase).toBe('tradicion');
    expect(sinTemas.tema).toBeUndefined();
    expect(sinTemas.objetivo).not.toContain('Tema');
  });
});

describe('Historia 11.3 — con el suelo alcanzado, el Tema al que menos le falta', () => {
  const huecos = verHuecos(
    [
      ...citasDe('el-tiempo', MIN_CITAS_POR_TEMA - 3),
      ...citasDe('la-amistad', 1),
      ...citasDe('el-saber', MIN_CITAS_POR_TEMA + 2),
    ],
    TEMAS,
    CON_EL_SUELO_ALCANZADO,
  );
  const objetivo = objetivoDeSesion(huecos);

  it('elige el Tema al que menos le falta, no el más vacío', () => {
    expect(objetivo.clase).toBe('tema');
    expect(objetivo.tema?.slug).toBe('el-tiempo');
    expect(objetivo.tradicion).toBeUndefined();
  });

  it('dice cuántas Citas le faltan', () => {
    expect(objetivo.tema?.faltan).toBe(3);
    expect(objetivo.tema?.publicadas).toBe(MIN_CITAS_POR_TEMA - 3);
    expect(objetivo.objetivo).toContain('3 Citas');
  });

  it('declara de qué hueco sale, con lo publicado y el umbral', () => {
    expect(objetivo.hueco).toContain('El tiempo');
    expect(objetivo.hueco).toContain(String(MIN_CITAS_POR_TEMA - 3));
    expect(objetivo.hueco).toContain(String(MIN_CITAS_POR_TEMA));
  });

  it('el Tema que ya llega al umbral no es candidato', () => {
    expect(JSON.stringify(objetivo)).not.toContain('El saber');
  });

  it('cuando falta una sola Cita lo dice en singular', () => {
    const unaSola = objetivoDeSesion(
      verHuecos(citasDe('la-amistad', MIN_CITAS_POR_TEMA - 1), TEMAS, CON_EL_SUELO_ALCANZADO),
    );
    expect(unaSola.objetivo).toContain('1 Cita del Tema');
    expect(unaSola.objetivo).not.toContain('1 Citas');
  });
});

describe('Historia 11.3 — el empate lo gana siempre el mismo', () => {
  /** Dos Temas a los que les falta exactamente lo mismo. */
  const empatados = [
    ...citasDe('el-tiempo', MIN_CITAS_POR_TEMA - 2),
    ...citasDe('el-saber', MIN_CITAS_POR_TEMA - 2),
    ...citasDe('la-amistad', MIN_CITAS_POR_TEMA),
  ];

  it('desempata por slug, alfabéticamente en español', () => {
    const objetivo = objetivoDeSesion(verHuecos(empatados, TEMAS, CON_EL_SUELO_ALCANZADO));
    expect(objetivo.tema?.slug).toBe('el-saber');
  });

  it('el orden en que llegan los Temas no cambia quién gana', () => {
    // Sin desempate, el ganador dependería del orden del directorio, que cambia de una
    // máquina a otra: el objetivo dejaría de ser el mismo para el mismo Corpus.
    const alReves = objetivoDeSesion(
      verHuecos(empatados, [...TEMAS].reverse(), CON_EL_SUELO_ALCANZADO),
    );
    expect(alReves.tema?.slug).toBe('el-saber');
  });

  it('y tampoco cuando el titular es la tradición', () => {
    const conDeficit = objetivoDeSesion(verHuecos(empatados, TEMAS, POR_DEBAJO_DEL_SUELO));
    expect(conDeficit.tema?.slug).toBe('el-saber');
  });
});

describe('Historia 11.3 — el mismo estado da el mismo objetivo, palabra por palabra', () => {
  it('dos llamadas sobre el mismo Corpus dan la misma frase', () => {
    const citas = [...citasDe('el-tiempo', 4), ...citasDe('la-amistad', 9)];
    const primera = objetivoDeSesion(verHuecos(citas, TEMAS, CON_EL_SUELO_ALCANZADO));
    const segunda = objetivoDeSesion(verHuecos(citas, TEMAS, CON_EL_SUELO_ALCANZADO));
    expect(segunda).toEqual(primera);
    expect(segunda.objetivo).toBe(primera.objetivo);
    expect(segunda.hueco).toBe(primera.hueco);
  });

  it('la política no mira el reloj ni tira un dado', () => {
    /*
     * Determinismo significa sin fecha: dos llamadas el mismo día y en días distintos,
     * con el mismo Corpus, tienen que dar lo mismo. La fecha entra solo en el registro de
     * la sesión, que es otra cosa y vive en `tools/objetivo.ts`.
     */
    const fuente = readFileSync(resolve(RAIZ, 'src/lib/objetivo.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:"'`\\])\/\/.*$/gm, '$1');
    expect(fuente).not.toMatch(/\bnew Date\b|\bDate\.now\b|\bMath\.random\b/);
  });
});

describe('Historia 11.3 — cuando no hay hueco, y cuando no hay estado', () => {
  it('sin Temas cortos y con el suelo alcanzado, lo dice', () => {
    const objetivo = objetivoDeSesion(
      verHuecos(citasDe('el-tiempo', MIN_CITAS_POR_TEMA), [TEMAS[1]], CON_EL_SUELO_ALCANZADO),
    );
    expect(objetivo.clase).toBe('ninguno');
    expect(objetivo.objetivo).toContain('No hay hueco que cerrar');
    expect(objetivo.tema).toBeUndefined();
    expect(objetivo.tradicion).toBeUndefined();
  });

  it('un Corpus vacío no revienta: declara que no hay estado del que derivar', () => {
    const objetivo = objetivoDeSesion(verHuecos([], [], []));
    expect(objetivo.clase).toBe('sin-estado');
    expect(objetivo.objetivo).toContain('no tiene Autores');
    expect(objetivo.hueco).not.toBe('');
  });

  it('sin Autores no se inventa un déficit de tradición con el 0 % de dividir por cero', () => {
    // El 0 % que devuelve `verHuecos` sin Autores es el artefacto de no dividir por cero,
    // no una medición. Y sin Autores tampoco hay a quién atribuir una Cita.
    const objetivo = objetivoDeSesion(verHuecos([], TEMAS, []));
    expect(objetivo.clase).toBe('sin-estado');
    expect(objetivo.tradicion).toBeUndefined();
    expect(objetivo.tema).toBeUndefined();
  });
});

describe('Historia 11.3 — los Autores sin tradición declarada no se imputan a ninguna', () => {
  it('no cuentan como latinoamericanos ni como lo contrario', () => {
    // 2 de 4 declarados latinoamericanos es el 50 %: los otros dos no bajan la cifra a un
    // lado ni la suben al otro. Sumarlos a cualquiera de las dos mentiría.
    const huecos = verHuecos([], [], autores(['latinoamericana', 'latinoamericana', undefined, undefined]));
    expect(huecos.tradicion.sinDeclarar).toBe(2);
    expect(objetivoDeSesion(huecos).clase).not.toBe('tradicion');
  });

  it('cuando el déficit es real, la cifra que falta se cuenta sobre el total', () => {
    const huecos = verHuecos([], [], autores(['latinoamericana', undefined, undefined, undefined]));
    const objetivo = objetivoDeSesion(huecos);
    expect(objetivo.clase).toBe('tradicion');
    // El total son 4 Autores, aunque tres no declaren tradición: 1 de 4 es el 25 %.
    expect(objetivo.tradicion?.porcentaje).toBe(25);
    expect(objetivo.tradicion?.autoresQueFaltan).toBe(1);
  });
});

/**
 * Los únicos nombres propios que la política escribe son los de los Temas, y van entre
 * comillas angulares. Buscar nombres de Autor uno a uno no serviría: el peligro no es que
 * repita a alguien del Corpus, sino que proponga a alguien que **no** está en él, y una
 * lista de los que sí están no puede cazar eso. Lo que se comprueba es la regla entera:
 * todo lo entrecomillado tiene que ser un Tema conocido, y no hay otra vía por la que un
 * nombre pueda salir.
 */
describe('Historia 11.3 — la política dice qué hueco cerrar, nunca a quién admitir', () => {
  /** Lo que la salida escribe entre «», que es donde caben los nombres propios. */
  function entrecomillado(objetivo: ObjetivoDeSesion): string[] {
    return [...`${objetivo.objetivo} ${objetivo.hueco}`.matchAll(/«([^»]+)»/gu)].map((m) => m[1]);
  }

  const conNombres: AutorParaHuecos[] = [
    { slug: 'seneca', nombre: 'Séneca', tradicion: 'otra' },
    { slug: 'jose-marti', nombre: 'José Martí', tradicion: 'latinoamericana' },
    { slug: 'antonio-machado', nombre: 'Antonio Machado', tradicion: 'peninsular' },
  ];

  const ramas: [string, Huecos][] = [
    ['tradicion sin Temas', verHuecos([], [], conNombres)],
    ['tradicion con Tema', verHuecos(citasDe('el-tiempo', 2), TEMAS, conNombres)],
    [
      'tema',
      verHuecos(citasDe('el-tiempo', 2), TEMAS, [...conNombres, ...CON_EL_SUELO_ALCANZADO]),
    ],
    ['ninguno', verHuecos([], [], CON_EL_SUELO_ALCANZADO)],
    ['sin-estado', verHuecos([], TEMAS, [])],
  ];

  it.each(ramas)('en la rama «%s» solo se entrecomillan nombres de Tema', (_, huecos) => {
    const nombresDeTema = new Set(TEMAS.map((t) => t.nombre));
    for (const termino of entrecomillado(objetivoDeSesion(huecos))) {
      expect(nombresDeTema, termino).toContain(termino);
    }
  });

  it('ningún nombre de Autor sobrevive a ninguna rama', () => {
    /*
     * Quién entra en el Corpus es la única decisión que este producto no delega. Una
     * política que nombrase Autores la delegaría por la puerta de atrás: el agente que
     * siembra sin supervisión daría de alta el nombre que le dictaran.
     */
    for (const [rama, huecos] of ramas) {
      const escrito = JSON.stringify(objetivoDeSesion(huecos));
      for (const autor of conNombres) {
        expect(escrito, `${rama}: ${autor.nombre}`).not.toContain(autor.nombre);
      }
    }
  });

  it('el Autor que falta se caracteriza por su tradición', () => {
    const objetivo = objetivoDeSesion(verHuecos([], [], POR_DEBAJO_DEL_SUELO));
    expect(objetivo.objetivo).toContain('tradición latinoamericana');
  });

  it('el módulo no tiene por dónde nombrarlos: su entrada no trae nombres de Autor', () => {
    // `verHuecos` devuelve recuentos por tradición, no Autores, así que la política no
    // recibe ni un nombre que pudiera repetir.
    const huecos = verHuecos([], [], [{ slug: 'seneca', nombre: 'Séneca', tradicion: 'otra' }]);
    expect(JSON.stringify(huecos.tradicion)).not.toContain('Séneca');
  });
});

describe('Historia 11.3 — los porcentajes se escriben en español', () => {
  it('la coma decimal, que es para lo único que existe el formateador', () => {
    // Sin esta prueba, quitarle el `.replace` al formateador dejaba la suite en verde.
    expect(porcentajeEnEspañol(16.7)).toBe('16,7');
    expect(porcentajeEnEspañol(33.3)).toBe('33,3');
  });

  it('y sin decimal cuando el número es entero', () => {
    expect(porcentajeEnEspañol(40)).toBe('40');
    expect(porcentajeEnEspañol(0)).toBe('0');
  });

  it('el objetivo los escribe así, no con punto', () => {
    const conDecimal = objetivoDeSesion(
      verHuecos([], [], autores(['latinoamericana', 'peninsular', 'peninsular'])),
    );
    expect(conDecimal.hueco).toContain('33,3 %');
    expect(conDecimal.hueco).not.toContain('33.3');
  });
});

describe('Historia 11.3 — el objetivo escrito para la terminal', () => {
  it('lleva el objetivo y, debajo, el hueco del que sale', () => {
    const objetivo = objetivoDeSesion(verHuecos([], [], POR_DEBAJO_DEL_SUELO));
    const lineas = lineasDeObjetivo(objetivo);
    expect(lineas).toContain(objetivo.objetivo);
    expect(lineas.some((l) => l.includes('Sale del hueco:') && l.includes(objetivo.hueco))).toBe(true);
  });
});
