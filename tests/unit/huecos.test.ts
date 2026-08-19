import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { verHuecos, type AutorParaHuecos, type CitaParaHuecos } from '../../src/lib/huecos.ts';
import {
  MIN_CITAS_POR_COLECCION,
  MIN_CITAS_POR_TEMA,
  SUELO_TRADICION_LATINOAMERICANA,
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

  it('cuenta la proporción sobre el total de Autores', () => {
    const { tradicion } = verHuecos([], [], autores(['latinoamericana', 'peninsular', 'peninsular', 'peninsular']));
    expect(tradicion.total).toBe(4);
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

  it('los que no la declaran se cuentan aparte: el dato está incompleto', () => {
    /*
     * Sumarlos a «peninsular» daría un porcentaje más bajo que el real y sumarlos al otro
     * lado, uno más alto. Contarlos aparte es lo único que no miente.
     */
    const { tradicion } = verHuecos([], [], autores(['latinoamericana', undefined, undefined]));
    expect(tradicion.sinDeclarar).toBe(2);
    expect(tradicion.peninsular).toBe(0);
  });

  it('«otra» no es un cajón de sastre: se cuenta y se ve', () => {
    // Séneca es hispanorromano; forzarlo a una de las dos tradiciones falsearía las dos.
    const { tradicion } = verHuecos([], [], autores(['otra', 'latinoamericana']));
    expect(tradicion.otra).toBe(1);
    expect(tradicion.porcentaje).toBe(50);
  });

  it('un Corpus sin Autores no divide por cero', () => {
    expect(verHuecos([], [], []).tradicion.porcentaje).toBe(0);
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
