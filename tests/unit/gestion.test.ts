import { afterEach, describe, expect, it } from 'vitest';
import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import { RAIZ } from './ayuda/construir.js';
import { darDeAltaLote } from '../../tools/alta.ts';
import { existsSync } from 'node:fs';
import {
  asignarTema,
  quitarTema,
  crearAutor,
  crearTema,
  editarAutor,
  eliminarTema,
  marcarAptaParaPortada,
  retirarAutor,
} from '../../tools/lib/gestion.ts';
import {
  leerAutores,
  leerCitas,
  registrarCandidatosPorEpoca,
  registrarDescarteDeCandidato,
  rutasDelCorpus,
  type Rutas,
} from '../../tools/lib/corpus.ts';
import { slugsSembrados } from '../../tools/lib/epocas.ts';
import { temasPublicados, type Cita, type Tema } from '../../src/lib/publicado.ts';

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function corpusVacio(): Promise<Rutas> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-gestion-'));
  temporales.push(raiz);
  const rutas = rutasDelCorpus(join(raiz, 'corpus'));
  for (const dir of [rutas.citas, rutas.autores, rutas.temas, rutas.revision]) {
    await mkdir(dir, { recursive: true });
  }
  return rutas;
}

const SENECA = {
  nombre: 'Séneca',
  añoNacimiento: -4,
  añoFallecimiento: 65,
  semblanza: 'Filósofo estoico hispanorromano.',
};

describe('Historia 1.7 — Autores', () => {
  it('crear un Autor sin año de fallecimiento se rechaza diciendo que es obligatorio', async () => {
    const rutas = await corpusVacio();
    const resultado = await crearAutor(rutas, { ...SENECA, añoFallecimiento: undefined });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.join(' ')).toMatch(/añoFallecimiento/);
    // Y no queda un Autor a medias en el corpus.
    expect(await readdir(rutas.autores)).toHaveLength(0);
  });

  it('crear un Autor completo lo escribe con su slug', async () => {
    const rutas = await corpusVacio();
    const resultado = await crearAutor(rutas, SENECA);

    expect(resultado.ok).toBe(true);
    expect(await readdir(rutas.autores)).toEqual(['seneca.yml']);

    const contenido = await readFile(join(rutas.autores, 'seneca.yml'), 'utf8');
    expect(contenido).toContain('nombre: "Séneca"');
    expect(contenido).toContain('añoFallecimiento: 65');
  });

  it('un campo opcional sin valor se omite, nunca vacío ni null', async () => {
    const rutas = await corpusVacio();
    await crearAutor(rutas, { ...SENECA, añoNacimiento: undefined });

    const contenido = await readFile(join(rutas.autores, 'seneca.yml'), 'utf8');
    expect(contenido).not.toContain('añoNacimiento');
    expect(contenido).not.toMatch(/null|:\s*""/);
  });

  it('no se crea dos veces el mismo Autor', async () => {
    const rutas = await corpusVacio();
    await crearAutor(rutas, SENECA);
    const segundo = await crearAutor(rutas, SENECA);

    expect(segundo.ok).toBe(false);
    if (!segundo.ok) expect(segundo.motivos.join(' ')).toMatch(/ya existe/);
  });

  it('editar conserva los campos que no se tocan', async () => {
    const rutas = await corpusVacio();
    await crearAutor(rutas, SENECA);
    const resultado = await editarAutor(rutas, 'seneca', { semblanza: 'Tutor de Nerón.' });

    expect(resultado.ok).toBe(true);
    const contenido = await readFile(join(rutas.autores, 'seneca.yml'), 'utf8');
    expect(contenido).toContain('Tutor de Nerón.');
    expect(contenido).toContain('añoFallecimiento: 65');
  });

  it('editar no cambia el fichero aunque cambie el nombre: el slug es la URL', async () => {
    const rutas = await corpusVacio();
    await crearAutor(rutas, SENECA);
    await editarAutor(rutas, 'seneca', { nombre: 'Lucio Anneo Séneca' });

    expect(await readdir(rutas.autores)).toEqual(['seneca.yml']);
    const contenido = await readFile(join(rutas.autores, 'seneca.yml'), 'utf8');
    expect(contenido).toContain('Lucio Anneo Séneca');
  });
});

describe('Historia 1.7 — Temas', () => {
  it('crear un Tema lo escribe con su slug', async () => {
    const rutas = await corpusVacio();
    const resultado = await crearTema(rutas, 'El tiempo');

    expect(resultado.ok).toBe(true);
    expect(await readdir(rutas.temas)).toEqual(['el-tiempo.yml']);
  });

  it('un Tema sin Citas publicadas se elimina', async () => {
    const rutas = await corpusVacio();
    await crearTema(rutas, 'El tiempo');
    const resultado = await eliminarTema(rutas, 'el-tiempo');

    expect(resultado.ok).toBe(true);
    expect(await readdir(rutas.temas)).toHaveLength(0);
  });

  it('un Tema con Citas publicadas no se elimina, y dice cuántas lo usan', async () => {
    const rutas = await corpusVacio();
    await crearAutor(rutas, SENECA);
    await crearTema(rutas, 'El tiempo');
    await darDeAltaLote(
      [
        {
          texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
          autor: 'Séneca',
          temas: ['El tiempo'],
          procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
        },
        {
          texto: 'La vida, si sabes usarla, es larga.',
          autor: 'Séneca',
          temas: ['El tiempo'],
          procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
        },
      ],
      rutas,
    );

    const resultado = await eliminarTema(rutas, 'el-tiempo');
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos[0]).toMatch(/2 Citas publicadas/);
    // El Tema sigue ahí.
    expect(await readdir(rutas.temas)).toEqual(['el-tiempo.yml']);
  });

  it('eliminar un Tema que no existe se rechaza', async () => {
    const rutas = await corpusVacio();
    const resultado = await eliminarTema(rutas, 'inexistente');
    expect(resultado.ok).toBe(false);
  });
});

describe('Historia 1.7 — marcado de Cita apta para portada', () => {
  async function corpusConUnaCita(): Promise<{ rutas: Rutas; slug: string }> {
    const rutas = await corpusVacio();
    await crearAutor(rutas, SENECA);
    const informe = await darDeAltaLote(
      [
        {
          texto: 'La vida, si sabes usarla, es larga.',
          autor: 'Séneca',
          procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
        },
      ],
      rutas,
    );
    return { rutas, slug: informe.publicadas[0].slug };
  }

  it('el marcado queda registrado en el fichero de la Cita', async () => {
    const { rutas, slug } = await corpusConUnaCita();
    const resultado = await marcarAptaParaPortada(rutas, slug, true);

    expect(resultado.ok).toBe(true);
    const [fichero] = await readdir(rutas.citas);
    const contenido = await readFile(join(rutas.citas, fichero), 'utf8');
    expect(contenido).toContain('aptaParaPortada: true');
  });

  it('al desmarcar el campo se omite, no se escribe como false', async () => {
    const { rutas, slug } = await corpusConUnaCita();
    await marcarAptaParaPortada(rutas, slug, true);
    await marcarAptaParaPortada(rutas, slug, false);

    const [fichero] = await readdir(rutas.citas);
    const contenido = await readFile(join(rutas.citas, fichero), 'utf8');
    expect(contenido).not.toContain('aptaParaPortada');
  });

  it('marcar no altera el texto ni el resto del fichero', async () => {
    const { rutas, slug } = await corpusConUnaCita();
    const [fichero] = await readdir(rutas.citas);
    const antes = await readFile(join(rutas.citas, fichero), 'utf8');

    await marcarAptaParaPortada(rutas, slug, true);
    const despues = await readFile(join(rutas.citas, fichero), 'utf8');

    // NFR-12: el sistema no altera el texto de una Cita publicada. Lo único que cambia
    // es la línea añadida.
    expect(despues).toContain('texto: "La vida, si sabes usarla, es larga."');
    expect(despues.replace(/aptaParaPortada: true\n/, '')).toBe(antes);
  });

  it('no se marca una Cita que no está publicada', async () => {
    const rutas = await corpusVacio();
    const resultado = await marcarAptaParaPortada(rutas, 'inexistente', true);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivos.join(' ')).toMatch(/no está publicada/);
  });
});

describe('Historia 1.7 — los umbrales tienen nombre (AD-9)', () => {
  it('ningún módulo repite los números de regla de negocio', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const raiz = new URL('../../', import.meta.url).pathname;

    const ficheros = (function recorrer(dir: string): string[] {
      return readdirSync(dir).flatMap((entrada) => {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) return recorrer(ruta);
        return /\.(ts|astro)$/.test(entrada) ? [ruta] : [];
      });
    })(join(raiz, 'src'));

    for (const ruta of ficheros) {
      if (ruta.endsWith('umbrales.ts')) continue;
      const codigo = readFileSync(ruta, 'utf8');
      expect(codigo, `${ruta} repite el umbral de Citas por Tema`).not.toMatch(/=\s*15\b/);
      expect(codigo, `${ruta} repite el umbral de caracteres`).not.toMatch(/=\s*300\b/);
      expect(codigo, `${ruta} repite el umbral de paginación`).not.toMatch(/=\s*50\b/);
    }
  });
});

/*
 * La tradición de un Autor — Historia 11.4.
 *
 * De este campo sale el suelo del 40 % de tradición latinoamericana que el PRD compromete,
 * y hasta la 11.4 la herramienta no sabía escribirlo: `DatosDeAutor` no lo tenía, así que
 * el dato se perdía entre la orden y el fichero **sin un solo error**. El Autor se creaba,
 * la orden decía «creado», la proporción no se movía, y el único camino que quedaba era
 * editar el `.yml` a mano — lo que la herramienta existe para evitar.
 */
describe('Historia 11.4 — la tradición del Autor se escribe con la herramienta', () => {
  it('crear con tradición la deja en el fichero', async () => {
    const rutas = await corpusVacio();
    const resultado = await crearAutor(rutas, {
      nombre: 'José Enrique Rodó',
      añoNacimiento: 1871,
      añoFallecimiento: 1917,
      semblanza: 'Ensayista uruguayo.',
      tradicion: 'latinoamericana',
    });

    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);
    const escrito = await readFile(join(rutas.autores, 'jose-enrique-rodo.yml'), 'utf8');
    expect(escrito).toContain('tradicion: "latinoamericana"');
  });

  it('crear sin tradición no escribe la clave, en vez de inventarse una', async () => {
    const rutas = await corpusVacio();
    await crearAutor(rutas, SENECA);

    const escrito = await readFile(join(rutas.autores, 'seneca.yml'), 'utf8');
    expect(escrito).not.toContain('tradicion');
    // Y la convención del corpus: lo que no consta se omite, nunca cadena vacía ni null.
    expect(escrito).not.toMatch(/tradicion:\s*(""|null)/);
  });

  it('editar otro campo conserva la tradición ya declarada', async () => {
    const rutas = await corpusVacio();
    await crearAutor(rutas, { ...SENECA, tradicion: 'otra' });

    const resultado = await editarAutor(rutas, 'seneca', { semblanza: 'Otra semblanza.' });

    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);
    const escrito = await readFile(join(rutas.autores, 'seneca.yml'), 'utf8');
    expect(escrito).toContain('tradicion: "otra"');
    expect(escrito).toContain('Otra semblanza.');
  });

  it('editar puede declarar la tradición de un Autor que no la tenía', async () => {
    const rutas = await corpusVacio();
    await crearAutor(rutas, SENECA);

    await editarAutor(rutas, 'seneca', { tradicion: 'otra' });

    const escrito = await readFile(join(rutas.autores, 'seneca.yml'), 'utf8');
    expect(escrito).toContain('tradicion: "otra"');
  });

  it('una tradición que no está en el esquema se rechaza', async () => {
    const rutas = await corpusVacio();
    // El tipo lo impide en TypeScript; el esquema tiene que impedirlo también en ejecución,
    // porque `crearAutor` recibe lo que teclee quien use la orden.
    const resultado = await crearAutor(rutas, {
      ...SENECA,
      tradicion: 'latina' as never,
    });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.join(' ')).toMatch(/latinoamericana/);
    expect((await readdir(rutas.autores)).length).toBe(0);
  });
});

/**
 * Editar un Autor no se lleva por delante lo que el fichero ya tenía.
 *
 * Medido el 2026-09-13 (d06bc181): editar la semblanza de `siddhartha-gautama.yml` reescribió
 * el fichero con los cinco campos que `editarAutor` sabía nombrar y borró
 * `tituloEnFuente: "Buda Gautama"`, el alias con el que el cruce por época reconoce a
 * «Autor:Buda Gautama». La Antigüedad dejó de estar terminada y la puerta de pruebas siguió en
 * verde, porque ninguna prueba editaba un fichero con un campo que el esquema no nombra.
 */
describe('editar un Autor conserva los campos que el esquema no nombra', () => {
  it('editar la semblanza conserva tituloEnFuente y cualquier otro campo del fichero', async () => {
    const rutas = await corpusVacio();
    await writeFile(
      join(rutas.autores, 'siddhartha-gautama.yml'),
      [
        'nombre: "Siddhartha Gautama"',
        'añoNacimiento: -563',
        'añoFallecimiento: -483',
        'semblanza: "El Buda."',
        'tradicion: "otra"',
        'tituloEnFuente: "Buda Gautama"',
        'campoQueNadieNombra: "sigue aquí"',
        '',
      ].join('\n'),
      'utf8',
    );

    const resultado = await editarAutor(rutas, 'siddhartha-gautama', {
      semblanza: 'El Buda, fundador del budismo.',
    });

    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);
    const escrito = parsearYaml(
      await readFile(join(rutas.autores, 'siddhartha-gautama.yml'), 'utf8'),
    ) as Record<string, unknown>;
    expect(escrito).toEqual({
      nombre: 'Siddhartha Gautama',
      añoNacimiento: -563,
      añoFallecimiento: -483,
      semblanza: 'El Buda, fundador del budismo.',
      tradicion: 'otra',
      tituloEnFuente: 'Buda Gautama',
      campoQueNadieNombra: 'sigue aquí',
    });
  });

  it('editar sin cambios no altera los datos de ningún Autor del Corpus real', async () => {
    /*
     * La misma regla medida contra los ficheros de verdad, sobre una copia: lo que la prueba
     * de arriba fija con un campo inventado, esta lo fija con los campos que el Corpus ya usa
     * —hoy `tituloEnFuente` en Teresa— y con los que se añadan mañana sin avisar aquí.
     */
    const rutas = await corpusVacio();
    await cp(resolve(RAIZ, 'corpus/autores'), rutas.autores, { recursive: true });

    // `.gitkeep` también está en el directorio y no es una ficha de Autor.
    const fichas = (await readdir(rutas.autores)).filter((f) => /\.ya?ml$/u.test(f));
    expect(fichas.length).toBeGreaterThan(0);
    for (const fichero of fichas) {
      const ruta = join(rutas.autores, fichero);
      const antes = parsearYaml(await readFile(ruta, 'utf8'));
      const resultado = await editarAutor(rutas, fichero.replace(/\.ya?ml$/u, ''), {});
      expect(resultado.ok, `${fichero}: ${resultado.ok ? '' : resultado.motivos.join(' ')}`).toBe(
        true,
      );
      expect(parsearYaml(await readFile(ruta, 'utf8')), fichero).toEqual(antes);
    }
  });
});

/**
 * Historia 15.5 — asignar un Tema a Citas ya publicadas.
 *
 * La orden faltaba. `tema` sabía crear y eliminar, y `alta` sabe escribir Citas nuevas con sus
 * Temas; marcar un Tema en Citas que **ya están publicadas** no lo sabía hacer nadie, y el
 * tramo de anchura de la Meta lo pide quince veces seguidas. La primera vez se hizo con un
 * script a mano y salió un fallo —saltaba las Citas cuyo **slug** contiene el slug del Tema—,
 * que es exactamente la clase de error que una orden con pruebas no comete dos veces.
 */
describe('Historia 15.5 — asignar un Tema a Citas ya publicadas', () => {
  const PRIMERA = 'No hay viento favorable para el que no sabe adónde va.';
  const SEGUNDA = 'La verdad padece, pero no perece, y siempre acaba por asomar donde menos se la espera.';
  const FUENTE = {
    id: 'wikisource-es',
    nombre: 'Wikisource en español',
    licencia: 'CC BY-SA 4.0',
    url: 'https://es.wikisource.org/wiki/De_la_brevedad_de_la_vida',
  };

  /*
   * El corpus de prueba versiona un documento **de verdad** y declara la Fuente en las dos
   * Citas, en vez de apoyarse en que su texto esté en el censo de pendientes de cotejo. Sin
   * esto la segunda caía a `_revision` —una Cita sin Fuente no publica desde la 11.2— y las
   * comprobaciones de abajo pasaban recorriendo una lista de una sola Cita.
   */
  async function corpusConDosCitas(): Promise<{ rutas: Rutas; slugs: string[] }> {
    const rutas = await corpusVacio();
    await mkdir(rutas.fuentes, { recursive: true });
    await writeFile(
      join(rutas.fuentes, 'wikisource-es--de-la-brevedad-de-la-vida.txt'),
      `fuente: wikisource-es\nobra: De la brevedad de la vida\nurl: ${FUENTE.url}\nrecuperado: 2026-08-25\n---\n${PRIMERA}\n${SEGUNDA}\n`,
      'utf8',
    );
    await crearAutor(rutas, SENECA);
    await crearTema(rutas, 'El tiempo');
    await crearTema(rutas, 'La verdad');
    const informe = await darDeAltaLote(
      [
        { texto: PRIMERA, autor: 'Séneca', temas: ['El tiempo'], procedencia: { obra: 'De la brevedad de la vida' }, fuente: FUENTE },
        { texto: SEGUNDA, autor: 'Séneca', temas: ['El tiempo'], procedencia: { obra: 'De la brevedad de la vida' }, fuente: FUENTE },
      ],
      rutas,
    );
    // Si el lote no publicase, las comprobaciones de abajo pasarían recorriendo cero Citas.
    expect(informe.publicadas.map((c) => c.slug), JSON.stringify(informe.enRevision)).toHaveLength(2);
    return { rutas, slugs: informe.publicadas.map((c) => c.slug) };
  }

  it('añade el Tema y conserva los que la Cita ya tenía', async () => {
    const { rutas, slugs } = await corpusConDosCitas();
    const resultado = await asignarTema(rutas, 'la-verdad', slugs);

    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);
    const citas = await leerCitas(rutas.citas);
    for (const cita of citas) {
      expect(cita.temas).toContain('la-verdad');
      expect(cita.temas).toContain('el-tiempo');
    }
  });

  it('no toca el texto de la Cita, que es lo que NFR-12 protege', async () => {
    const { rutas, slugs } = await corpusConDosCitas();
    const antes = (await leerCitas(rutas.citas)).map((c) => c.texto).sort();

    await asignarTema(rutas, 'la-verdad', slugs);

    expect((await leerCitas(rutas.citas)).map((c) => c.texto).sort()).toEqual(antes);
  });

  it('marca la Cita cuyo slug contiene el slug del Tema, que es donde falló el script a mano', async () => {
    const { rutas, slugs } = await corpusConDosCitas();
    // «La verdad padece…» genera el slug «seneca-la-verdad-padece-pero-no-perece»: contiene
    // «la-verdad» como cadena sin tener el Tema. Buscar en el fichero entero la saltaba.
    const conTrampa = slugs.find((s) => s.includes('la-verdad'));
    expect(conTrampa, 'el corpus de prueba debe tener esa Cita').toBeDefined();

    await asignarTema(rutas, 'la-verdad', [conTrampa!]);

    const cita = (await leerCitas(rutas.citas)).find((c) => c.slug === conTrampa);
    expect(cita?.temas).toContain('la-verdad');
  });

  it('asignar dos veces no duplica el Tema y lo dice', async () => {
    const { rutas, slugs } = await corpusConDosCitas();
    await asignarTema(rutas, 'la-verdad', slugs);
    const segunda = await asignarTema(rutas, 'la-verdad', slugs);

    expect(segunda.ok).toBe(true);
    if (!segunda.ok) return;
    expect(segunda.mensaje).toMatch(/ya lo ten|0 Citas/i);
    const cita = (await leerCitas(rutas.citas))[0]!;
    expect(cita.temas!.filter((t) => t === 'la-verdad')).toHaveLength(1);
  });

  it('un Tema que no existe se rechaza y no escribe nada', async () => {
    const { rutas, slugs } = await corpusConDosCitas();
    const resultado = await asignarTema(rutas, 'la-muerte', slugs);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.join(' ')).toMatch(/la-muerte/);
    expect((await leerCitas(rutas.citas))[0]!.temas).not.toContain('la-muerte');
  });

  it('una Cita que no existe se rechaza nombrándola, y ninguna otra se modifica', async () => {
    const { rutas, slugs } = await corpusConDosCitas();
    const resultado = await asignarTema(rutas, 'la-verdad', [...slugs, 'seneca-no-existe']);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.join(' ')).toContain('seneca-no-existe');
    // Se comprueba antes de escribir: un lote con una errata no deja el corpus a medias.
    for (const cita of await leerCitas(rutas.citas)) {
      expect(cita.temas).not.toContain('la-verdad');
    }
  });

  describe('FR-14 — quitar un Tema de una Cita, que es lo que faltaba', () => {
    /*
     * `coleccion` tiene `asignar` y `quitar`; `tema` solo tenía `asignar`. La asimetría no era
     * cosmética: un Tema mal puesto solo se podía deshacer **editando el frontmatter de la Cita
     * a mano**, que es exactamente lo que estas órdenes existen para evitar. Y `tema eliminar`
     * no sirve —borra el Tema entero, no la marca de una Cita—.
     *
     * Se escribe con las mismas guardas que su hermana, y por los mismos motivos:
     *
     * · El lote se rechaza entero si alguna Cita no está publicada, para no dejar unas
     *   desmarcadas y otras no.
     * · Es idempotente: quitar lo que no está no es un fallo, se cuenta y se dice.
     * · No toca el texto (NFR-12), y por eso hay una prueba que solo mira el texto.
     *
     * Lo que **no** hace, a propósito: no borra el Tema aunque se quede sin Citas. Que un Tema
     * baje del umbral y deje de publicarse es cosa de `publicado.ts` (AD-11), no de esta orden.
     */
    async function corpusConDosCitasEnDosTemas() {
      const { rutas, slugs } = await corpusConDosCitas();
      await asignarTema(rutas, 'la-verdad', slugs);
      return { rutas, slugs };
    }

    it('quita el Tema y conserva los demás que la Cita tenía', async () => {
      const { rutas, slugs } = await corpusConDosCitasEnDosTemas();
      const resultado = await quitarTema(rutas, 'la-verdad', slugs);

      expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);
      for (const cita of await leerCitas(rutas.citas)) {
        expect(cita.temas).not.toContain('la-verdad');
        expect(cita.temas).toContain('el-tiempo');
      }
    });

    it('no toca el texto de la Cita, que es lo que NFR-12 protege', async () => {
      const { rutas, slugs } = await corpusConDosCitasEnDosTemas();
      const antes = (await leerCitas(rutas.citas)).map((c) => c.texto).sort();

      await quitarTema(rutas, 'la-verdad', slugs);

      expect((await leerCitas(rutas.citas)).map((c) => c.texto).sort()).toEqual(antes);
    });

    it('quitar dos veces no es un fallo: la segunda dice que ya no lo tenían', async () => {
      const { rutas, slugs } = await corpusConDosCitasEnDosTemas();
      await quitarTema(rutas, 'la-verdad', slugs);
      const segunda = await quitarTema(rutas, 'la-verdad', slugs);

      expect(segunda.ok, segunda.ok ? '' : segunda.motivos.join(' ')).toBe(true);
      expect(segunda.ok && segunda.mensaje).toMatch(/no lo ten/i);
    });

    it('un Tema que no existe se rechaza antes de tocar nada', async () => {
      const { rutas, slugs } = await corpusConDosCitasEnDosTemas();
      const resultado = await quitarTema(rutas, 'la-muerte', slugs);

      expect(resultado.ok).toBe(false);
      // Y las Citas siguen con los suyos: el rechazo es antes de escribir.
      for (const cita of await leerCitas(rutas.citas)) expect(cita.temas).toContain('la-verdad');
    });

    it('si una Cita del lote no está publicada, no se desmarca ninguna', async () => {
      const { rutas, slugs } = await corpusConDosCitasEnDosTemas();
      const resultado = await quitarTema(rutas, 'la-verdad', [...slugs, 'seneca-no-existe']);

      expect(resultado.ok).toBe(false);
      for (const cita of await leerCitas(rutas.citas)) expect(cita.temas).toContain('la-verdad');
    });

    /*
     * Quitar el **último** Tema deja la Cita sin el campo: `aYaml` omite la lista vacía, que es
     * la convención de la casa. El esquema lo admite —`temas` tiene `.default([])`—, pero las
     * herramientas leían el frontmatter en bruto y `temasPublicados` recorría un `undefined`:
     * `npm run huecos` y `npm run objetivo` se cayeron con «cita.temas is not iterable» el
     * 2026-09-13. Quien lee Citas en `tools/` tiene que ver lo mismo que ve el build.
     */
    it('quitar el último Tema deja `temas` vacío al leer, como el esquema, y nadie se cae', async () => {
      const { rutas, slugs } = await corpusConDosCitas();
      const resultado = await quitarTema(rutas, 'el-tiempo', [slugs[0]!]);
      expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);

      const citas = await leerCitas(rutas.citas);
      expect(citas.find((c) => c.slug === slugs[0])?.temas).toEqual([]);
      expect(() =>
        temasPublicados(
          [{ slug: 'el-tiempo', nombre: 'El tiempo' }] as unknown as Tema[],
          citas as unknown as Cita[],
        ),
      ).not.toThrow();
    });
  });

});

/**
 * AD-2 — retirar un Autor es una orden, no un `git mv` a mano.
 *
 * El 2026-09-14 Fray Luis de León y Tito Lucrecio Caro se descartaron de sus épocas con
 * `epocas.ts --descartar`, y el descarte no surtió efecto: el cruce cuenta como sembrado a
 * todo fichero de `corpus/autores/` —«sembrado gana a descartado»—, así que las dos épocas
 * seguían contándolos hasta que sus fichas se movieron a mano a `corpus/_autores-retirados/`.
 *
 * Como `retirarFuente` y `despublicarColeccion`: **mueve y no borra**, y se niega mientras
 * algo del Corpus apunte al Autor — una Cita publicada, una candidata en revisión, un miembro
 * de Colección o una fijación de portada. Y sin motivo, no retira.
 */
describe('AD-2 — retirar un Autor mueve su ficha, y solo cuando nada apunta a él', () => {
  const MOTIVO = 'Sembrado sin ninguna Cita que se sostenga.';

  function ficha(nombre: string, extra: string[] = []): string {
    return [
      `nombre: "${nombre}"`,
      'añoFallecimiento: 65',
      'semblanza: "Una semblanza cualquiera."',
      ...extra,
      '',
    ].join('\n');
  }

  function cita(slug: string, autor: string): string {
    return [
      '---',
      `texto: "Una frase cualquiera con la longitud que hace falta, ${slug}."`,
      `autor: "${autor}"`,
      `slug: "${slug}"`,
      'procedencia:',
      '  obra: "Una obra"',
      'estadoDerechos: "dominio-público"',
      '---',
      '',
    ].join('\n');
  }

  /*
   * Dos Autores cuyo slug empieza igual, a propósito: `seneca-` es prefijo de
   * `seneca-el-viejo-…`, y una comprobación por prefijo que no lo sepa se negaría a retirar a
   * Séneca por las Citas de su padre.
   */
  async function corpusConSeneca(): Promise<Rutas> {
    const rutas = await corpusVacio();
    await writeFile(
      join(rutas.autores, 'seneca.yml'),
      ficha('Séneca', ['tituloEnFuente: "Lucio Anneo Séneca"']),
      'utf8',
    );
    await writeFile(join(rutas.autores, 'seneca-el-viejo.yml'), ficha('Séneca el Viejo'), 'utf8');
    return rutas;
  }

  async function coleccion(directorio: string, slug: string, miembros: string[]) {
    await mkdir(directorio, { recursive: true });
    await writeFile(
      join(directorio, `${slug}.yml`),
      ['nombre: "Estoicos"', 'criterio: "Citas estoicas."', 'miembros:', ...miembros.map((m) => `  - "${m}"`), ''].join('\n'),
      'utf8',
    );
  }

  it('mueve la ficha a corpus/_autores-retirados/ tal cual, y el mensaje lleva el motivo', async () => {
    const rutas = await corpusConSeneca();
    const antes = await readFile(join(rutas.autores, 'seneca.yml'), 'utf8');

    const resultado = await retirarAutor(rutas, 'seneca', MOTIVO);

    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);
    expect(existsSync(join(rutas.autores, 'seneca.yml'))).toBe(false);
    expect(await readFile(join(rutas.autoresRetirados, 'seneca.yml'), 'utf8')).toBe(antes);
    expect(resultado.ok && resultado.mensaje).toContain(MOTIVO);
    // Retirar uno no toca al otro.
    expect(existsSync(join(rutas.autores, 'seneca-el-viejo.yml'))).toBe(true);
  });

  it('sin motivo se niega y no mueve nada', async () => {
    const rutas = await corpusConSeneca();

    for (const motivo of ['', '   ']) {
      const resultado = await retirarAutor(rutas, 'seneca', motivo);
      expect(resultado.ok).toBe(false);
      expect(!resultado.ok && resultado.motivos.join(' ')).toMatch(/motivo/);
    }
    expect(existsSync(join(rutas.autores, 'seneca.yml'))).toBe(true);
    expect(existsSync(rutas.autoresRetirados)).toBe(false);
  });

  it('un Autor que no existe se rechaza nombrándolo', async () => {
    const rutas = await corpusConSeneca();
    const resultado = await retirarAutor(rutas, 'lucano', MOTIVO);

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.motivos.join(' ')).toContain('lucano');
  });

  it('se niega si alguna Cita publicada lo tiene por autor, y dice cuántas', async () => {
    const rutas = await corpusConSeneca();
    await writeFile(
      join(rutas.citas, 'seneca--la-vida-es-larga.md'),
      cita('seneca-la-vida-es-larga', 'seneca'),
      'utf8',
    );

    const resultado = await retirarAutor(rutas, 'seneca', MOTIVO);

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.motivos.join('\n')).toMatch(/1 Cita publicada/);
    expect(!resultado.ok && resultado.motivos.join('\n')).toContain('seneca-la-vida-es-larga');
    expect(existsSync(join(rutas.autores, 'seneca.yml'))).toBe(true);
  });

  it('se niega si alguna candidata de corpus/_revision/ lo tiene por autor', async () => {
    const rutas = await corpusConSeneca();
    await writeFile(
      join(rutas.revision, 'seneca--no-hay-viento.md'),
      cita('seneca-no-hay-viento', 'seneca'),
      'utf8',
    );

    const resultado = await retirarAutor(rutas, 'seneca', MOTIVO);

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.motivos.join('\n')).toMatch(/1 candidata/);
    expect(existsSync(join(rutas.autores, 'seneca.yml'))).toBe(true);
  });

  it('se niega si un miembro de una Colección apunta a una Cita suya', async () => {
    const rutas = await corpusConSeneca();
    await coleccion(rutas.colecciones, 'estoicos', ['seneca-la-vida-es-larga']);

    const resultado = await retirarAutor(rutas, 'seneca', MOTIVO);

    expect(resultado.ok).toBe(false);
    const motivos = !resultado.ok ? resultado.motivos.join('\n') : '';
    expect(motivos).toContain('estoicos');
    expect(motivos).toContain('seneca-la-vida-es-larga');
    expect(existsSync(join(rutas.autores, 'seneca.yml'))).toBe(true);
  });

  it('también si la Colección está despublicada: publicarla la traería de vuelta', async () => {
    const rutas = await corpusConSeneca();
    await coleccion(rutas.coleccionesRetiradas, 'estoicos', ['seneca-la-vida-es-larga']);

    const resultado = await retirarAutor(rutas, 'seneca', MOTIVO);

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.motivos.join('\n')).toContain('estoicos');
    expect(existsSync(join(rutas.autores, 'seneca.yml'))).toBe(true);
  });

  it('se niega si una fijación de corpus/portada.json apunta a una Cita suya', async () => {
    const rutas = await corpusConSeneca();
    await writeFile(
      rutas.portada,
      JSON.stringify({ _comentario: 'x', fijaciones: { '2026-10-01': 'seneca-la-vida-es-larga' } }),
      'utf8',
    );

    const resultado = await retirarAutor(rutas, 'seneca', MOTIVO);

    expect(resultado.ok).toBe(false);
    const motivos = !resultado.ok ? resultado.motivos.join('\n') : '';
    expect(motivos).toContain('2026-10-01');
    expect(motivos).toContain('seneca-la-vida-es-larga');
    expect(existsSync(join(rutas.autores, 'seneca.yml'))).toBe(true);
  });

  it('no confunde a un Autor con otro cuyo slug empieza igual', async () => {
    const rutas = await corpusConSeneca();
    await writeFile(
      join(rutas.citas, 'seneca-el-viejo--la-fortuna.md'),
      cita('seneca-el-viejo-la-fortuna', 'seneca-el-viejo'),
      'utf8',
    );
    await writeFile(
      join(rutas.revision, 'seneca-el-viejo--otra.md'),
      cita('seneca-el-viejo-otra', 'seneca-el-viejo'),
      'utf8',
    );
    // Un miembro que no resuelve a ninguna Cita, pero es del padre por su prefijo más largo.
    await coleccion(rutas.colecciones, 'retoricos', ['seneca-el-viejo-no-publicada']);
    await writeFile(
      rutas.portada,
      JSON.stringify({ fijaciones: { '2026-10-01': 'seneca-el-viejo-la-fortuna' } }),
      'utf8',
    );

    const resultado = await retirarAutor(rutas, 'seneca', MOTIVO);

    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);
  });

  it('nunca sobrescribe una ficha ya retirada con el mismo nombre', async () => {
    const rutas = await corpusConSeneca();
    await mkdir(rutas.autoresRetirados, { recursive: true });
    await writeFile(join(rutas.autoresRetirados, 'seneca.yml'), ficha('Otro Séneca'), 'utf8');

    const resultado = await retirarAutor(rutas, 'seneca', MOTIVO);

    expect(resultado.ok).toBe(false);
    expect(existsSync(join(rutas.autores, 'seneca.yml'))).toBe(true);
    expect(await readFile(join(rutas.autoresRetirados, 'seneca.yml'), 'utf8')).toContain('Otro Séneca');
  });

  it('después de retirarlo, slugsSembrados deja de contarlo, alias incluido', async () => {
    const rutas = await corpusConSeneca();
    const antes = slugsSembrados(await leerAutores(rutas));
    // Sin esto la prueba pasaría con un corpus que nunca lo contó.
    expect(antes.has('seneca')).toBe(true);
    expect(antes.has('lucio-anneo-seneca')).toBe(true);

    const resultado = await retirarAutor(rutas, 'seneca', MOTIVO);
    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);

    const despues = slugsSembrados(await leerAutores(rutas));
    expect(despues.has('seneca')).toBe(false);
    expect(despues.has('lucio-anneo-seneca')).toBe(false);
    expect(despues.has('seneca-el-viejo')).toBe(true);
  });

  describe('y dice qué queda por hacer en la lista por época', () => {
    const ROMA = {
      id: 'antigua-roma',
      nombre: 'Antigua Roma',
      recuperada: '2026-09-01',
      candidatos: [
        { nombre: 'Lucio Anneo Séneca', slug: 'lucio-anneo-seneca', idDePagina: 7, dominioPublico: true },
      ],
    };

    it('si es candidato sin descartar, da la orden de descarte con su slug de candidato', async () => {
      const rutas = await corpusConSeneca();
      await registrarCandidatosPorEpoca(rutas, [ROMA]);

      const resultado = await retirarAutor(rutas, 'seneca', MOTIVO);

      expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);
      expect(resultado.ok && resultado.mensaje).toContain(
        'npx tsx tools/epocas.ts --descartar lucio-anneo-seneca --motivo',
      );
    });

    it('si ya consta descartado, lo dice y no pide otro descarte', async () => {
      const rutas = await corpusConSeneca();
      await registrarCandidatosPorEpoca(rutas, [ROMA]);
      await registrarDescarteDeCandidato(rutas, {
        epoca: 'antigua-roma',
        candidato: 'lucio-anneo-seneca',
        idDePagina: 7,
        motivo: 'No da sentencia suelta.',
      });

      const resultado = await retirarAutor(rutas, 'seneca', MOTIVO);

      expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);
      const mensaje = resultado.ok ? resultado.mensaje : '';
      expect(mensaje).toMatch(/ya consta descartado/i);
      expect(mensaje).not.toContain('--descartar lucio-anneo-seneca');
    });

    it('sin lista versionada, recuerda igualmente que el descarte va con epocas.ts y su motivo', async () => {
      const rutas = await corpusConSeneca();

      const resultado = await retirarAutor(rutas, 'seneca', MOTIVO);

      expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);
      expect(resultado.ok && resultado.mensaje).toMatch(/epocas\.ts --descartar \S+ --motivo/);
    });
  });
});
